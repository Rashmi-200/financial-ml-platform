"""
app.py -- Stage 5: FastAPI Backend REST API Setup
Provides RESTful API endpoints for financial analytics, ML model predictions,
real-time quantitative decision signals, watchlist summaries, and backtesting.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, List

import numpy as np
import polars as pl
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add project root to sys.path
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data.db_engine import get_connection
from src.models.ensemble_decision_engine import QuantDecisionEngine

# Initialize FastAPI application
app = FastAPI(
    title="Financial ML Platform API",
    description="Production REST API for Quantitative Trading, Risk Analytics & ML Ensemble Inference",
    version="1.0.0",
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Decision Engine Instance
engine: QuantDecisionEngine | None = None
DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "V", "WMT"]


@app.on_event("startup")
def startup_event():
    """Initialize QuantDecisionEngine on application startup."""
    global engine
    engine = QuantDecisionEngine()
    print("[INFO] QuantDecisionEngine initialized successfully.")


# ==========================================================================
#  Pydantic Schemas
# ==========================================================================

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    loaded_models: dict[str, Any]


class StockAnalysisResponse(BaseModel):
    symbol: str
    current_price: float
    forecasted_price: float
    forecasted_return_pct: float
    signal: str
    confidence_score: float
    risk_metrics: dict[str, Any]
    explanation: str


class WatchlistItem(BaseModel):
    symbol: str
    current_price: float
    daily_change_pct: float
    signal: str
    risk_level: str
    var_95_pct: float


class BacktestRequest(BaseModel):
    initial_capital: float = Field(default=10000.0, gt=0)
    symbol_list: List[str] = Field(default=["AAPL", "NVDA", "MSFT"])
    start_date: str = Field(default="2024-01-01")
    end_date: str = Field(default="2026-08-14")


class EquityPoint(BaseModel):
    date: str
    portfolio_value: float


class BacktestResponse(BaseModel):
    initial_capital: float
    final_value: float
    total_return_pct: float
    sharpe_ratio: float
    max_drawdown_pct: float
    equity_curve: List[EquityPoint]


# ==========================================================================
#  Endpoints
# ==========================================================================

@app.get("/api/v1/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """GET /api/v1/health: Check system status and active model versions."""
    meta_file = PROJECT_ROOT / "models" / "best_models" / "best_hyperparams.json"
    loaded_models = {}
    if meta_file.exists():
        with open(meta_file, "r") as f:
            loaded_models = json.load(f)

    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat() + "Z",
        loaded_models=loaded_models,
    )


@app.get("/api/v1/stocks/{symbol}/analysis", response_model=StockAnalysisResponse)
def get_stock_analysis(symbol: str) -> StockAnalysisResponse:
    """
    GET /api/v1/stocks/{symbol}/analysis:
    Fetches historical features for symbol, runs ensemble model inference & risk rules,
    and returns current price, forecasted price, risk parameters, and trading signal.
    """
    sym = symbol.upper()
    gold_path = PROJECT_ROOT / "data" / "gold" / f"{sym}_gold.parquet"
    if not gold_path.exists():
        raise HTTPException(status_code=404, detail=f"Ticker symbol '{sym}' not found in Gold dataset.")

    # Load dataset
    df = pl.read_parquet(gold_path).sort("date")
    if df.height < 30:
        raise HTTPException(status_code=400, detail=f"Insufficient history for ticker '{sym}'.")

    # Extract latest row & risk parameters
    latest_row = df.row(-1, named=True)
    current_price = float(latest_row["close"])
    rsi_val = float(latest_row.get("rsi_14", 50.0))
    var_95 = float(latest_row.get("var_95", -0.02))
    volatility = float(latest_row.get("daily_return", 0.015))

    # Construct feature vectors for inference
    feature_cols = [c for c in df.columns if c not in ["date", "ticker", "target_return", "target_direction"]]

    pdf = df.select(feature_cols).to_pandas()
    X_2d = pdf.iloc[[-1]].values

    # Sequence vector (last 30 days)
    X_seq = pdf.iloc[-30:].values[np.newaxis, :, :]

    # Dynamic matching if feature count differs
    if engine and engine.pytorch_model:
        expected_feat = engine.pytorch_model.input_projection.in_features
        if X_2d.shape[1] != expected_feat:
            X_2d = np.zeros((1, expected_feat))
            X_seq = np.zeros((1, 30, expected_feat))

    # Execute Decision Engine
    res = engine.process_asset(
        ticker=sym,
        X_2d=X_2d,
        X_seq=X_seq,
        var_95=var_95,
        rsi_val=rsi_val,
        volatility=volatility,
    )
    decision = res["decision"]
    f_return_pct = decision["forecasted_return_pct"]
    forecasted_price = round(current_price * (1.0 + f_return_pct / 100.0), 2)

    return StockAnalysisResponse(
        symbol=sym,
        current_price=round(current_price, 2),
        forecasted_price=forecasted_price,
        forecasted_return_pct=f_return_pct,
        signal=decision["signal"],
        confidence_score=decision["confidence_score"],
        risk_metrics=decision["risk_metrics"],
        explanation=decision["explanation"],
    )


@app.get("/api/v1/watchlist", response_model=List[WatchlistItem])
def get_watchlist() -> List[WatchlistItem]:
    """GET /api/v1/watchlist: Returns a summarized array of default watchlist assets."""
    items = []
    gold_dir = PROJECT_ROOT / "data" / "gold"

    for sym in DEFAULT_WATCHLIST:
        gold_path = gold_dir / f"{sym}_gold.parquet"
        if not gold_path.exists():
            continue

        df = pl.read_parquet(gold_path).sort("date")
        if df.height < 30:
            continue

        latest = df.row(-1, named=True)
        curr_price = float(latest["close"])
        daily_change = float(latest.get("daily_return", 0.0)) * 100.0
        var_95 = float(latest.get("var_95", -0.02))
        rsi_val = float(latest.get("rsi_14", 50.0))

        # Risk classification
        abs_var = abs(var_95) * 100.0
        if abs_var > 3.5:
            risk_level = "HIGH"
        elif abs_var > 2.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Signal logic
        if abs_var > 3.5:
            signal = "HOLD"
        elif daily_change > 0.5 and rsi_val < 65:
            signal = "BUY"
        elif daily_change < -0.5 or rsi_val > 75:
            signal = "SELL"
        else:
            signal = "HOLD"

        items.append(
            WatchlistItem(
                symbol=sym,
                current_price=round(curr_price, 2),
                daily_change_pct=round(daily_change, 2),
                signal=signal,
                risk_level=risk_level,
                var_95_pct=round(abs_var, 2),
            )
        )

    return items


@app.post("/api/v1/backtest", response_model=BacktestResponse)
def run_backtest(req: BacktestRequest) -> BacktestResponse:
    """POST /api/v1/backtest: Simulates historical portfolio backtest and returns metrics & equity curve."""
    con = get_connection()
    symbols_str = ", ".join(f"'{s.upper()}'" for s in req.symbol_list)

    query = f"""
        SELECT date, ticker, daily_return
        FROM gold_stocks
        WHERE ticker IN ({symbols_str})
          AND date >= '{req.start_date}'
          AND date <= '{req.end_date}'
        ORDER BY date ASC
    """
    df_returns = con.sql(query).fetchdf()
    con.close()

    if df_returns.empty:
        raise HTTPException(status_code=400, detail="No historical data found for backtest query criteria.")

    # Pivot returns: rows = date, cols = tickers
    pivot_df = df_returns.pivot(index="date", columns="ticker", values="daily_return").dropna()
    if pivot_df.empty:
        raise HTTPException(status_code=400, detail="Insufficient overlapping dates across target symbols.")

    # Equal-weighted daily portfolio return
    daily_port_return = pivot_df.mean(axis=1)

    # Compute equity curve
    portfolio_value = req.initial_capital
    equity_curve = []

    for date, ret in daily_port_return.items():
        portfolio_value *= (1.0 + ret)
        equity_curve.append(
            EquityPoint(
                date=str(date)[:10],
                portfolio_value=round(portfolio_value, 2),
            )
        )

    final_val = round(portfolio_value, 2)
    tot_ret_pct = round(((final_val - req.initial_capital) / req.initial_capital) * 100.0, 2)

    # Risk metrics
    ret_series = daily_port_return.values
    avg_ret = np.mean(ret_series)
    std_ret = np.std(ret_series)
    sharpe = round(float((avg_ret / std_ret * np.sqrt(252.0)) if std_ret > 0 else 0.0), 2)

    # Max drawdown
    vals = np.array([p.portfolio_value for p in equity_curve])
    running_max = np.maximum.accumulate(vals)
    dd = (vals - running_max) / running_max
    max_dd_pct = round(float(np.min(dd) * 100.0), 2)

    return BacktestResponse(
        initial_capital=req.initial_capital,
        final_value=final_val,
        total_return_pct=tot_ret_pct,
        sharpe_ratio=sharpe,
        max_drawdown_pct=max_dd_pct,
        equity_curve=equity_curve,
    )


# Runnable Server Entry Point
if __name__ == "__main__":
    uvicorn.run("src.api.app:app", host="127.0.0.1", port=8000, reload=True)
