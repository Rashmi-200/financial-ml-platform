"""
engineer_features.py -- Stage 1 Part 3: Gold Layer Feature Engineering & Risk Metrics
Reads clean Parquet files from data/silver/, engineers technical indicators,
Fourier/wavelet signals, and risk metrics, then writes ML-ready datasets
to data/gold/{TICKER}_gold.parquet.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import polars as pl
import pywt
from scipy.stats import entropy as scipy_entropy

# -- Configuration --------------------------------------------------------
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
SILVER_DIR: Path = PROJECT_ROOT / "data" / "silver"
GOLD_DIR: Path = PROJECT_ROOT / "data" / "gold"

TRADING_DAYS_PER_YEAR: float = 252.0


# ==========================================================================
#  1. Technical Indicators
# ==========================================================================

def add_sma(df: pl.DataFrame) -> pl.DataFrame:
    """SMA_20, SMA_50, SMA_200."""
    return df.with_columns([
        pl.col("close").rolling_mean(window_size=20).alias("sma_20"),
        pl.col("close").rolling_mean(window_size=50).alias("sma_50"),
        pl.col("close").rolling_mean(window_size=200).alias("sma_200"),
    ])


def add_rsi(df: pl.DataFrame, period: int = 14) -> pl.DataFrame:
    """RSI_14 via exponential moving average of gains/losses."""
    delta = df["close"].diff()
    gain = delta.clip(lower_bound=0.0)
    loss = (-delta.clip(upper_bound=0.0))

    avg_gain = gain.ewm_mean(span=period, adjust=False)
    avg_loss = loss.ewm_mean(span=period, adjust=False)

    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))

    return df.with_columns(rsi.alias("rsi_14"))


def add_macd(df: pl.DataFrame) -> pl.DataFrame:
    """MACD line, signal line, and histogram."""
    ema_12 = df["close"].ewm_mean(span=12, adjust=False)
    ema_26 = df["close"].ewm_mean(span=26, adjust=False)
    macd_line = ema_12 - ema_26
    signal_line = macd_line.ewm_mean(span=9, adjust=False)
    histogram = macd_line - signal_line

    return df.with_columns([
        macd_line.alias("macd"),
        signal_line.alias("macd_signal"),
        histogram.alias("macd_hist"),
    ])


def add_bollinger_bands(df: pl.DataFrame, period: int = 20, num_std: float = 2.0) -> pl.DataFrame:
    """Bollinger Bands: upper, lower, width."""
    sma = pl.col("close").rolling_mean(window_size=period)
    std = pl.col("close").rolling_std(window_size=period)

    return df.with_columns([
        (sma + num_std * std).alias("bb_upper"),
        (sma - num_std * std).alias("bb_lower"),
        ((sma + num_std * std) - (sma - num_std * std)).alias("bb_width"),
    ])


def add_atr(df: pl.DataFrame, period: int = 14) -> pl.DataFrame:
    """Average True Range (ATR_14)."""
    high = df["high"]
    low = df["low"]
    prev_close = df["close"].shift(1)

    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()

    # Element-wise max of three Series
    tr = pl.max_horizontal(tr1, tr2, tr3)
    atr = tr.ewm_mean(span=period, adjust=False)

    return df.with_columns(atr.alias("atr_14"))


def add_obv(df: pl.DataFrame) -> pl.DataFrame:
    """On-Balance Volume."""
    close = df["close"]
    volume = df["volume"].cast(pl.Float64)

    direction = close.diff().sign().fill_null(0)
    obv = (direction * volume).cum_sum()

    return df.with_columns(obv.alias("obv"))


def add_technical_indicators(df: pl.DataFrame) -> pl.DataFrame:
    """Apply all technical indicator functions."""
    df = add_sma(df)
    df = add_rsi(df)
    df = add_macd(df)
    df = add_bollinger_bands(df)
    df = add_atr(df)
    df = add_obv(df)
    return df


# ==========================================================================
#  2. Fourier Signal Features (rolling 64-day window)
# ==========================================================================

def _fourier_features(prices: np.ndarray) -> tuple[float, float, float]:
    """
    From a 1-D price array, compute:
      - dominant_freq: frequency with the highest spectral power
      - spectral_power: magnitude of that dominant frequency
      - spectral_entropy: Shannon entropy of the normalised power spectrum
    """
    n = len(prices)
    # Detrend by differencing
    diffs = np.diff(prices)
    fft_vals = np.fft.rfft(diffs)
    power = np.abs(fft_vals) ** 2

    freqs = np.fft.rfftfreq(n - 1)

    # Exclude DC component
    power_no_dc = power[1:]
    freqs_no_dc = freqs[1:]

    if power_no_dc.sum() == 0:
        return 0.0, 0.0, 0.0

    idx_max = np.argmax(power_no_dc)
    dominant_freq = float(freqs_no_dc[idx_max])
    spectral_power = float(power_no_dc[idx_max])

    # Normalise for entropy
    p_norm = power_no_dc / power_no_dc.sum()
    # Replace zeros to avoid log(0)
    p_norm = p_norm[p_norm > 0]
    spec_entropy = float(scipy_entropy(p_norm))

    return dominant_freq, spectral_power, spec_entropy


def add_fourier_features(df: pl.DataFrame, window: int = 64) -> pl.DataFrame:
    """Rolling 64-day FFT features."""
    close = df["close"].to_numpy()
    n = len(close)

    dom_freq = np.full(n, np.nan)
    spec_power = np.full(n, np.nan)
    spec_entropy = np.full(n, np.nan)

    for i in range(window, n + 1):
        segment = close[i - window: i]
        f, p, e = _fourier_features(segment)
        dom_freq[i - 1] = f
        spec_power[i - 1] = p
        spec_entropy[i - 1] = e

    return df.with_columns([
        pl.Series("fft_dominant_freq", dom_freq),
        pl.Series("fft_spectral_power", spec_power),
        pl.Series("fft_spectral_entropy", spec_entropy),
    ])


# ==========================================================================
#  3. Wavelet Signal Features (rolling window, db4)
# ==========================================================================

def _wavelet_energy(prices: np.ndarray, wavelet: str = "db4") -> tuple[float, float]:
    """
    Decompose *prices* with a single-level DWT and return:
      - approx_energy:  sum of squared approximation coefficients
      - detail_energy:  sum of squared detail coefficients
    """
    if len(prices) < pywt.Wavelet(wavelet).dec_len:
        return 0.0, 0.0

    coeffs = pywt.dwt(prices, wavelet)
    cA, cD = coeffs
    approx_energy = float(np.sum(cA ** 2))
    detail_energy = float(np.sum(cD ** 2))
    return approx_energy, detail_energy


def add_wavelet_features(df: pl.DataFrame, window: int = 64) -> pl.DataFrame:
    """Rolling wavelet (db4) approximation & detail energy."""
    close = np.array(df["close"].to_numpy(), dtype=np.float64, copy=True)
    n = len(close)

    approx_e = np.full(n, np.nan)
    detail_e = np.full(n, np.nan)

    for i in range(window, n + 1):
        segment = close[i - window: i]
        ae, de = _wavelet_energy(segment)
        approx_e[i - 1] = ae
        detail_e[i - 1] = de

    return df.with_columns([
        pl.Series("wavelet_approx_energy", approx_e),
        pl.Series("wavelet_detail_energy", detail_e),
    ])


# ==========================================================================
#  4. Risk Metrics (rolling 30-day)
# ==========================================================================

def add_rolling_sharpe(df: pl.DataFrame, window: int = 30) -> pl.DataFrame:
    """30-day rolling annualised Sharpe ratio (risk-free rate = 0)."""
    ann_factor = np.sqrt(TRADING_DAYS_PER_YEAR)
    return df.with_columns(
        (
            pl.col("daily_return").rolling_mean(window_size=window)
            / pl.col("daily_return").rolling_std(window_size=window)
            * ann_factor
        ).alias("sharpe_30d")
    )


def add_rolling_max_drawdown(df: pl.DataFrame, window: int = 30) -> pl.DataFrame:
    """30-day rolling maximum drawdown."""
    close = df["close"].to_numpy()
    n = len(close)
    mdd = np.full(n, np.nan)

    for i in range(window, n + 1):
        segment = close[i - window: i]
        running_max = np.maximum.accumulate(segment)
        drawdowns = (segment - running_max) / running_max
        mdd[i - 1] = float(np.min(drawdowns))

    return df.with_columns(pl.Series("max_drawdown_30d", mdd))


def add_var_95(df: pl.DataFrame, window: int = 30) -> pl.DataFrame:
    """Historical 95% Value at Risk (rolling 30-day)."""
    returns = df["daily_return"].to_numpy()
    n = len(returns)
    var95 = np.full(n, np.nan)

    for i in range(window, n + 1):
        segment = returns[i - window: i]
        var95[i - 1] = float(np.percentile(segment, 5))  # 5th percentile = 95% VaR

    return df.with_columns(pl.Series("var_95", var95))


def add_risk_metrics(df: pl.DataFrame) -> pl.DataFrame:
    """Apply all risk metric functions."""
    df = add_rolling_sharpe(df)
    df = add_rolling_max_drawdown(df)
    df = add_var_95(df)
    return df


# ==========================================================================
#  Main pipeline
# ==========================================================================

def print_summary(df: pl.DataFrame, ticker: str) -> None:
    """Print a compact summary line for this ticker."""
    rows = df.height
    cols = df.width
    date_min = df["date"].min()
    date_max = df["date"].max()
    print(f"  {ticker:6s} | {rows:>5,} rows x {cols:>3} cols | {date_min} -> {date_max}")


def main() -> None:
    GOLD_DIR.mkdir(parents=True, exist_ok=True)

    silver_files = sorted(SILVER_DIR.glob("*_clean.parquet"))
    if not silver_files:
        print(f"[ERROR] No silver parquet files found in {SILVER_DIR}")
        sys.exit(1)

    print("=" * 100)
    print("Financial ML Platform -- Gold Layer Feature Engineering & Risk Metrics")
    print(f"Input  : {SILVER_DIR}  ({len(silver_files)} files)")
    print(f"Output : {GOLD_DIR}")
    print("=" * 100)

    success = 0

    for path in silver_files:
        ticker = path.stem.replace("_clean", "")
        print(f"\n--- {ticker} ---")

        df = pl.read_parquet(path)
        print(f"  Loaded {df.height:,} rows, {df.width} columns")

        # 1. Technical Indicators
        print("  [1/4] Technical indicators ...", end=" ", flush=True)
        df = add_technical_indicators(df)
        print("done")

        # 2. Fourier features
        print("  [2/4] Fourier FFT features ...", end=" ", flush=True)
        df = add_fourier_features(df)
        print("done")

        # 3. Wavelet features
        print("  [3/4] Wavelet features ...", end=" ", flush=True)
        df = add_wavelet_features(df)
        print("done")

        # 4. Risk metrics
        print("  [4/4] Risk metrics ...", end=" ", flush=True)
        df = add_risk_metrics(df)
        print("done")

        # Drop initial NaN rows created by the longest rolling window (SMA_200)
        rows_before = df.height
        df = df.filter(pl.col("sma_200").is_not_null())
        rows_dropped = rows_before - df.height
        print(f"  Dropped {rows_dropped} leading NaN rows (rolling warm-up)")

        # Save
        out_path = GOLD_DIR / f"{ticker}_gold.parquet"
        df.write_parquet(out_path)
        success += 1
        print_summary(df, ticker)

    # -- Final summary ---------------------------------------------------
    print("\n" + "=" * 100)
    print(f"Done.  {success}/{len(silver_files)} gold files saved to {GOLD_DIR}")
    print("=" * 100)

    gold_files = sorted(GOLD_DIR.glob("*_gold.parquet"))
    print(f"\n{'File':^35s}  {'Size':>10s}  {'Rows':>7s}  {'Cols':>5s}")
    print("-" * 65)
    for f in gold_files:
        size_kb = f.stat().st_size / 1024
        gdf = pl.read_parquet(f)
        print(f"  {f.name:30s}  {size_kb:>8.1f} KB  {gdf.height:>6,}  {gdf.width:>5}")

    # Print all feature column names from the last file
    if gold_files:
        sample = pl.read_parquet(gold_files[0])
        print(f"\nFeature columns ({sample.width} total):")
        for i, col in enumerate(sample.columns, 1):
            print(f"  {i:>3}. {col}")


if __name__ == "__main__":
    main()
