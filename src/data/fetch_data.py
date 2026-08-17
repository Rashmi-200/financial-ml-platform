"""
fetch_data.py — Stage 1: Bronze Layer Ingestion
Downloads daily OHLCV data (2015-01-01 → present) for a universe of
10 large-cap US equities via yfinance and persists each ticker as a
Parquet file in data/bronze/{TICKER}_raw.parquet using Polars.
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import polars as pl
import yfinance as yf

# ── Configuration ────────────────────────────────────────────────────
TICKERS: list[str] = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
    "META", "TSLA", "JPM", "V", "WMT",
]

START_DATE: str = "2015-01-01"
END_DATE: str = datetime.today().strftime("%Y-%m-%d")

# Resolve paths relative to the project root (two levels up from this file)
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
BRONZE_DIR: Path = PROJECT_ROOT / "data" / "bronze"


def fetch_ticker(ticker: str) -> pl.DataFrame | None:
    """Download daily OHLCV history for *ticker* and return a Polars DataFrame."""
    print(f"  -> Downloading {ticker} ...", end=" ", flush=True)
    try:
        pdf = yf.download(
            ticker,
            start=START_DATE,
            end=END_DATE,
            interval="1d",
            auto_adjust=True,
            progress=False,
        )
        if pdf.empty:
            print("[WARN] no data returned")
            return None

        # yfinance may return MultiIndex columns when downloading a single ticker
        if isinstance(pdf.columns, __import__("pandas").MultiIndex):
            pdf.columns = pdf.columns.droplevel("Ticker")

        # Reset the DatetimeIndex → regular column
        pdf = pdf.reset_index()

        # Convert from pandas → Polars
        df = pl.from_pandas(pdf)

        # Standardise column names to lowercase
        df = df.rename({c: c.lower() for c in df.columns})

        # Add a ticker column for downstream convenience
        df = df.with_columns(pl.lit(ticker).alias("ticker"))

        rows = df.shape[0]
        date_min = df["date"].min()
        date_max = df["date"].max()
        print(f"[OK]  {rows:,} rows  ({date_min} -> {date_max})")
        return df

    except Exception as exc:
        print(f"[FAIL]  error: {exc}")
        return None


def main() -> None:
    """Fetch all tickers and write Parquet files to the bronze layer."""
    BRONZE_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Financial ML Platform — Bronze Layer Ingestion")
    print(f"Universe : {len(TICKERS)} tickers")
    print(f"Period   : {START_DATE} -> {END_DATE}")
    print(f"Output   : {BRONZE_DIR}")
    print("=" * 60)

    success_count = 0

    for ticker in TICKERS:
        df = fetch_ticker(ticker)
        if df is not None:
            out_path = BRONZE_DIR / f"{ticker}_raw.parquet"
            df.write_parquet(out_path)
            success_count += 1

    # ── Summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"Done.  {success_count}/{len(TICKERS)} files saved to {BRONZE_DIR}")
    print("=" * 60)

    # List generated files
    parquet_files = sorted(BRONZE_DIR.glob("*_raw.parquet"))
    for f in parquet_files:
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name:30s}  {size_kb:>8.1f} KB")

    if success_count != len(TICKERS):
        print(f"\n[WARN]  {len(TICKERS) - success_count} ticker(s) failed.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
