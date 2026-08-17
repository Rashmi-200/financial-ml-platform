"""
clean_data.py -- Stage 1 Part 2: Silver Layer Data Cleaning & Validation
Reads raw Parquet files from data/bronze/, cleans and validates each dataset,
computes return columns, and writes to data/silver/{TICKER}_clean.parquet.
"""

from __future__ import annotations

import sys
from pathlib import Path

import polars as pl

# -- Configuration --------------------------------------------------------
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
BRONZE_DIR: Path = PROJECT_ROOT / "data" / "bronze"
SILVER_DIR: Path = PROJECT_ROOT / "data" / "silver"

# Expected OHLCV price columns (lowercase, matching bronze output)
PRICE_COLS: list[str] = ["open", "high", "low", "close"]
VOLUME_COL: str = "volume"


# -- Cleaning pipeline ----------------------------------------------------

def load_bronze(path: Path) -> pl.DataFrame:
    """Read a bronze-layer Parquet file."""
    return pl.read_parquet(path)


def sort_and_deduplicate(df: pl.DataFrame) -> pl.DataFrame:
    """Sort by date ascending and drop duplicate timestamps."""
    return df.sort("date").unique(subset=["date"], keep="first", maintain_order=True)


def cast_types(df: pl.DataFrame) -> pl.DataFrame:
    """Ensure prices are Float64 and volume is Int64."""
    return df.cast(
        {col: pl.Float64 for col in PRICE_COLS}
        | {VOLUME_COL: pl.Int64}
    )


def forward_fill_missing(df: pl.DataFrame) -> pl.DataFrame:
    """
    Handle missing values with forward-fill to avoid temporal lookahead bias.
    Only forward-fill numeric columns; leave ticker/date untouched.
    """
    fill_cols = PRICE_COLS + [VOLUME_COL]
    return df.with_columns(
        [pl.col(c).forward_fill().alias(c) for c in fill_cols]
    )


def add_return_columns(df: pl.DataFrame) -> pl.DataFrame:
    """
    Compute daily_return (simple percentage) and log_return.
    The first row will be null -- we drop it after computation.
    """
    df = df.with_columns([
        (pl.col("close") / pl.col("close").shift(1) - 1.0).alias("daily_return"),
        (pl.col("close") / pl.col("close").shift(1)).log().alias("log_return"),
    ])
    # Drop the first row where returns are null (no lookahead bias)
    df = df.filter(pl.col("daily_return").is_not_null())
    return df


def validate(df: pl.DataFrame, ticker: str) -> bool:
    """
    Run data-quality assertions. Returns True if all checks pass.
    - No NaN / null values in price or volume columns
    - No negative prices
    - No negative volumes
    """
    check_cols = PRICE_COLS + [VOLUME_COL, "daily_return", "log_return"]
    issues: list[str] = []

    # Check for nulls
    null_counts = df.select([pl.col(c).null_count().alias(c) for c in check_cols]).row(0)
    for col_name, n_nulls in zip(check_cols, null_counts):
        if n_nulls > 0:
            issues.append(f"  {col_name}: {n_nulls} null(s)")

    # Check for NaN in float columns
    float_cols = PRICE_COLS + ["daily_return", "log_return"]
    nan_counts = df.select([pl.col(c).is_nan().sum().alias(c) for c in float_cols]).row(0)
    for col_name, n_nans in zip(float_cols, nan_counts):
        if n_nans > 0:
            issues.append(f"  {col_name}: {n_nans} NaN(s)")

    # Check for negative prices
    for col_name in PRICE_COLS:
        neg = df.filter(pl.col(col_name) < 0).height
        if neg > 0:
            issues.append(f"  {col_name}: {neg} negative value(s)")

    # Check for negative volume
    neg_vol = df.filter(pl.col(VOLUME_COL) < 0).height
    if neg_vol > 0:
        issues.append(f"  volume: {neg_vol} negative value(s)")

    if issues:
        print(f"  [FAIL] {ticker} validation failed:")
        for issue in issues:
            print(issue)
        return False

    return True


def print_summary(df: pl.DataFrame, ticker: str) -> None:
    """Print summary statistics for a cleaned ticker."""
    rows = df.height
    date_min = df["date"].min()
    date_max = df["date"].max()

    close_mean = df["close"].mean()
    close_std = df["close"].std()
    vol_mean = df["volume"].mean()
    daily_ret_mean = df["daily_return"].mean()
    daily_ret_std = df["daily_return"].std()

    print(f"  {ticker:6s} | {rows:>5,} rows | {date_min} -> {date_max} "
          f"| close: {close_mean:>9.2f} +/- {close_std:>8.2f} "
          f"| vol_avg: {vol_mean:>14,.0f} "
          f"| ret: {daily_ret_mean:>+8.5f} +/- {daily_ret_std:>7.5f}")


# -- Main ----------------------------------------------------------------

def main() -> None:
    SILVER_DIR.mkdir(parents=True, exist_ok=True)

    bronze_files = sorted(BRONZE_DIR.glob("*_raw.parquet"))
    if not bronze_files:
        print(f"[ERROR] No bronze parquet files found in {BRONZE_DIR}")
        sys.exit(1)

    print("=" * 120)
    print("Financial ML Platform -- Silver Layer Cleaning & Validation")
    print(f"Input  : {BRONZE_DIR}  ({len(bronze_files)} files)")
    print(f"Output : {SILVER_DIR}")
    print("=" * 120)

    success = 0
    failed_tickers: list[str] = []

    for path in bronze_files:
        ticker = path.stem.replace("_raw", "")
        print(f"\n--- {ticker} ---")

        # Pipeline
        df = load_bronze(path)
        rows_before = df.height
        print(f"  Loaded {rows_before:,} rows")

        df = sort_and_deduplicate(df)
        dupes_removed = rows_before - df.height
        if dupes_removed > 0:
            print(f"  Removed {dupes_removed} duplicate timestamp(s)")

        df = cast_types(df)
        df = forward_fill_missing(df)

        ffill_note = df.select([pl.col(c).null_count().alias(c) for c in PRICE_COLS]).row(0)
        remaining_nulls = sum(ffill_note)
        if remaining_nulls > 0:
            # Drop leading rows that couldn't be forward-filled
            df = df.drop_nulls(subset=PRICE_COLS)
            print(f"  Dropped {remaining_nulls} leading null row(s) (no prior value to fill)")

        df = add_return_columns(df)

        # Validate
        if validate(df, ticker):
            out_path = SILVER_DIR / f"{ticker}_clean.parquet"
            df.write_parquet(out_path)
            success += 1
            print_summary(df, ticker)
        else:
            failed_tickers.append(ticker)

    # Final summary
    print("\n" + "=" * 120)
    print(f"Done.  {success}/{len(bronze_files)} files cleaned and saved to {SILVER_DIR}")
    if failed_tickers:
        print(f"[WARN] Failed tickers: {', '.join(failed_tickers)}")
    print("=" * 120)

    # List output files
    silver_files = sorted(SILVER_DIR.glob("*_clean.parquet"))
    for f in silver_files:
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name:30s}  {size_kb:>8.1f} KB")

    if failed_tickers:
        sys.exit(1)


if __name__ == "__main__":
    main()
