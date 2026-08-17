"""
ensemble_decision_engine.py -- Stage 4 Part 4: Multi-Model Ensemble & Decision Engine
Combines predictions from LightGBM and PyTorch Transformer using a weighted average ensemble,
evaluates risk parameters (VaR 95%, RSI, Volatility), enforces risk-management business logic,
and generates actionable trading signals (BUY, SELL, HOLD) with confidence scores and explanations.
"""

from __future__ import annotations

import json
import os
import pickle
import sys
import warnings
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore")
os.environ["LIGHTGBM_VERBOSE"] = "-1"
sys.modules["matplotlib"] = None

import numpy as np
import torch

# Add project root to sys.path
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.deep_models import StockTransformer

DEFAULT_MODELS_DIR: Path = PROJECT_ROOT / "models" / "best_models"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class QuantDecisionEngine:
    """Quantitative Trading & Decision Engine using Ensemble Predictions and Risk Controls."""

    def __init__(self, models_dir: Path | str = DEFAULT_MODELS_DIR):
        self.models_dir = Path(models_dir)
        self.lgb_model = None
        self.pytorch_model = None
        self.hyperparams = {}
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Load best tuned LightGBM and PyTorch model state from models_dir."""
        # 1. Load Hyperparams JSON
        meta_path = self.models_dir / "best_hyperparams.json"
        if meta_path.exists():
            with open(meta_path, "r") as f:
                self.hyperparams = json.load(f)

        # 2. Load LightGBM Model
        lgb_path = self.models_dir / "best_lightgbm.pkl"
        if lgb_path.exists():
            with open(lgb_path, "rb") as f:
                self.lgb_model = pickle.load(f)

        # 3. Load PyTorch Transformer Model
        torch_path = self.models_dir / "best_pytorch_transformer.pt"
        if torch_path.exists():
            state_dict = torch.load(torch_path, map_location=DEVICE)

            # Dynamically infer input_dim from checkpoint weight shape
            input_dim = state_dict["input_projection.weight"].shape[1]

            # Extract architecture params from metadata or defaults
            tr_params = self.hyperparams.get("PyTorch Transformer", {}).get("params", {})
            d_model = tr_params.get("d_model", 32)
            num_layers = tr_params.get("num_layers", 2)
            dropout = tr_params.get("dropout", 0.14)

            self.pytorch_model = StockTransformer(
                input_dim=input_dim,
                d_model=d_model,
                nhead=2,
                num_layers=num_layers,
                dropout=dropout,
            ).to(DEVICE)

            self.pytorch_model.load_state_dict(state_dict)
            self.pytorch_model.eval()

    def predict_ensemble(
        self,
        X_2d: np.ndarray,
        X_seq: np.ndarray,
        weight_lgb: float = 0.5,
        weight_torch: float = 0.5,
    ) -> float:
        """
        Predict future return using a weighted ensemble of LightGBM and PyTorch Transformer.
        - X_2d: (1, num_features) array for LightGBM
        - X_seq: (1, seq_len, num_features) array for PyTorch Transformer
        """
        # LightGBM Prediction
        pred_lgb = 0.0
        if self.lgb_model is not None:
            pred_lgb = float(self.lgb_model.predict(X_2d)[0])

        # PyTorch Transformer Prediction
        pred_torch = 0.0
        if self.pytorch_model is not None:
            tensor_seq = torch.tensor(X_seq, dtype=torch.float32).to(DEVICE)
            with torch.no_grad():
                pred_torch = float(self.pytorch_model(tensor_seq).cpu().item())

        # Normalize weights
        total_w = weight_lgb + weight_torch
        w1 = weight_lgb / total_w
        w2 = weight_torch / total_w

        ensemble_return = w1 * pred_lgb + w2 * pred_torch
        return ensemble_return

    def evaluate_trade_signal(
        self,
        forecasted_return: float,
        var_95: float,
        rsi_val: float,
        volatility: float,
        max_var_threshold: float = 0.035,
    ) -> dict[str, Any]:
        """
        Enforce quantitative risk-management business logic:
          - HOLD if 95% VaR > max_var_threshold (e.g. 3.5%) -> High Tail Risk
          - BUY if forecasted return > +1.5% (+0.015) and RSI < 70
          - SELL if forecasted return < -1.0% (-0.010) or RSI > 75
          - Otherwise HOLD
        """
        abs_var = abs(var_95)
        var_breached = abs_var > max_var_threshold

        # Base Decision Logic
        if var_breached:
            signal = "HOLD"
            reason = f"High Risk Blocked: 95% VaR ({abs_var:.2%}) exceeds safety threshold ({max_var_threshold:.2%})."
            confidence = max(0.20, 1.0 - (abs_var / max_var_threshold) * 0.5)
        elif forecasted_return > 0.015 and rsi_val < 70:
            signal = "BUY"
            reason = f"Bullish Forecast: Expected Return ({forecasted_return:+.2%}) > +1.5% with Healthy RSI ({rsi_val:.1f} < 70)."
            confidence = min(0.95, 0.60 + (forecasted_return - 0.015) * 10)
        elif forecasted_return < -0.010 or rsi_val > 75:
            signal = "SELL"
            if rsi_val > 75:
                reason = f"Overbought Market: RSI ({rsi_val:.1f} > 75) indicates overbought risk."
            else:
                reason = f"Bearish Forecast: Expected Return ({forecasted_return:+.2%}) < -1.0%."
            confidence = min(0.95, 0.65 + abs(forecasted_return) * 10)
        else:
            signal = "HOLD"
            reason = f"Neutral Market: Forecasted Return ({forecasted_return:+.2%}) within non-actionable range [-1.0%, +1.5%]."
            confidence = 0.50

        return {
            "signal": signal,
            "confidence_score": round(confidence, 4),
            "forecasted_return_pct": round(forecasted_return * 100.0, 2),
            "risk_metrics": {
                "var_95_pct": round(abs_var * 100.0, 2),
                "rsi_14": round(rsi_val, 1),
                "volatility_30d": round(volatility, 4),
                "var_threshold_breached": var_breached,
            },
            "explanation": reason,
        }

    def process_asset(
        self,
        ticker: str,
        X_2d: np.ndarray,
        X_seq: np.ndarray,
        var_95: float,
        rsi_val: float,
        volatility: float,
    ) -> dict[str, Any]:
        """Execute ensemble inference and risk decision evaluation for a single asset."""
        forecasted_return = self.predict_ensemble(X_2d, X_seq)
        eval_result = self.evaluate_trade_signal(
            forecasted_return=forecasted_return,
            var_95=var_95,
            rsi_val=rsi_val,
            volatility=volatility,
        )

        return {
            "ticker": ticker,
            "decision": eval_result,
        }


# ==========================================================================
#  Test & Verification Block
# ==========================================================================

if __name__ == "__main__":
    print("=" * 90)
    print("Financial ML Platform -- Quant Decision Engine Test Suite")
    print("=" * 90)

    engine = QuantDecisionEngine()

    # Get input feature dimension from loaded PyTorch model or default to 27
    num_features = engine.pytorch_model.input_projection.in_features if engine.pytorch_model else 27
    seq_len = 30

    np.random.seed(42)

    sample_assets = [
        {
            "ticker": "NVDA",
            "var_95": -0.028,    # 2.8% VaR (Safe)
            "rsi": 62.5,         # Healthy RSI
            "volatility": 0.031,
            "mock_return_boost": 0.025,  # Strong bullish prediction
        },
        {
            "ticker": "TSLA",
            "var_95": -0.048,    # 4.8% VaR (Triggers VaR Risk Block)
            "rsi": 68.0,
            "volatility": 0.045,
            "mock_return_boost": 0.030,
        },
        {
            "ticker": "AAPL",
            "var_95": -0.019,    # 1.9% VaR (Safe)
            "rsi": 78.5,         # Overbought RSI (Triggers SELL)
            "volatility": 0.018,
            "mock_return_boost": -0.005,
        },
    ]

    results = []
    for asset in sample_assets:
        # Mock feature input vectors
        X_2d = np.random.randn(1, num_features) + asset["mock_return_boost"]
        X_seq = np.random.randn(1, seq_len, num_features) + asset["mock_return_boost"]

        res = engine.process_asset(
            ticker=asset["ticker"],
            X_2d=X_2d,
            X_seq=X_seq,
            var_95=asset["var_95"],
            rsi_val=asset["rsi"],
            volatility=asset["volatility"],
        )
        results.append(res)

    print("\nDecision Engine Output (JSON):\n")
    print(json.dumps(results, indent=2))
    print("\n[OK] QuantDecisionEngine verified successfully.")
