"""
db_engine.py -- Stage 2: DuckDB SQL Analytics Engine
Sets up a DuckDB database with a gold_stocks view over all gold-layer Parquet
files and provides utility functions for standard analytics queries.
"""

from __future__ import annotations

import sys
from pathlib import Path
from textwrap import indent

import duckdb

# -- Configuration --------------------------------------------------------
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
GOLD_DIR: Path = PROJECT_ROOT / "data" / "gold"
DB_PATH: str = str(PROJECT_ROOT / "data" / "financial_ml.duckdb")

# Use a file-based database so it persists across sessions
# Set to ":memory:" for purely ephemeral analytics
USE_FILE_DB: bool = True


# ==========================================================================
#  Database setup
# ==========================================================================

def get_connection(read_only: bool = False) -> duckdb.DuckDBPyConnection:
    """Return a DuckDB connection with the gold_stocks view registered."""
    db_target = DB_PATH if USE_FILE_DB else ":memory:"
    con = duckdb.connect(db_target, read_only=read_only)
    _register_gold_view(con)
    return con


def _register_gold_view(con: duckdb.DuckDBPyConnection) -> None:
    """Create (or replace) the gold_stocks view over all gold Parquet files."""
    parquet_glob = str(GOLD_DIR / "*_gold.parquet").replace("\\", "/")
    con.execute(f"""
        CREATE OR REPLACE VIEW gold_stocks AS
        SELECT *
        FROM read_parquet('{parquet_glob}')
    """)


# ==========================================================================
#  Analytics queries
# ==========================================================================

def get_top_performing_assets(
    con: duckdb.DuckDBPyConnection,
    days: int = 30,
) -> duckdb.DuckDBPyRelation:
    """
    Cumulative return per ticker over the most recent *days* trading days.
    Returns tickers ranked by cumulative return (descending).
    """
    return con.sql(f"""
        WITH recent AS (
            SELECT ticker,
                   date,
                   close,
                   ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) AS rn
            FROM gold_stocks
        ),
        endpoints AS (
            SELECT ticker,
                   MAX(CASE WHEN rn = 1    THEN close END) AS last_close,
                   MAX(CASE WHEN rn = {days} THEN close END) AS start_close
            FROM recent
            WHERE rn <= {days}
            GROUP BY ticker
        )
        SELECT ticker,
               ROUND(start_close, 2)                                     AS price_{days}d_ago,
               ROUND(last_close, 2)                                      AS price_latest,
               ROUND((last_close / start_close - 1) * 100, 2)           AS cumulative_return_pct
        FROM endpoints
        WHERE start_close IS NOT NULL
        ORDER BY cumulative_return_pct DESC
    """)


def get_highest_risk_assets(
    con: duckdb.DuckDBPyConnection,
) -> duckdb.DuckDBPyRelation:
    """
    Assets ranked by worst (most negative) 30-day max drawdown and VaR 95%.
    Uses the most recent available values for each ticker.
    """
    return con.sql("""
        WITH latest AS (
            SELECT ticker,
                   date,
                   max_drawdown_30d,
                   var_95,
                   sharpe_30d,
                   ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) AS rn
            FROM gold_stocks
        )
        SELECT ticker,
               ROUND(max_drawdown_30d * 100, 2)   AS max_drawdown_30d_pct,
               ROUND(var_95 * 100, 2)              AS var_95_pct,
               ROUND(sharpe_30d, 2)                AS sharpe_30d
        FROM latest
        WHERE rn = 1
        ORDER BY max_drawdown_30d ASC
    """)


def get_correlation_matrix(
    con: duckdb.DuckDBPyConnection,
) -> duckdb.DuckDBPyRelation:
    """
    Pairwise daily-return correlation matrix across all tickers.
    Uses DuckDB's PIVOT to produce a wide table.
    """
    return con.sql("""
        WITH returns AS (
            SELECT date, ticker, daily_return
            FROM gold_stocks
        ),
        pairs AS (
            SELECT a.ticker  AS ticker_a,
                   b.ticker  AS ticker_b,
                   ROUND(CORR(a.daily_return, b.daily_return), 4) AS correlation
            FROM returns a
            JOIN returns b
              ON a.date = b.date
            GROUP BY a.ticker, b.ticker
        )
        PIVOT pairs
        ON ticker_b
        USING MAX(correlation)
        ORDER BY ticker_a
    """)


def get_summary_stats(
    con: duckdb.DuckDBPyConnection,
) -> duckdb.DuckDBPyRelation:
    """Quick overview: row counts, date range, and feature count per ticker."""
    return con.sql("""
        SELECT ticker,
               COUNT(*)                       AS rows,
               MIN(date)                       AS date_from,
               MAX(date)                       AS date_to,
               ROUND(AVG(close), 2)            AS avg_close,
               ROUND(STDDEV(daily_return), 5)  AS return_vol,
               ROUND(AVG(rsi_14), 2)           AS avg_rsi,
               ROUND(AVG(sharpe_30d), 2)       AS avg_sharpe
        FROM gold_stocks
        GROUP BY ticker
        ORDER BY ticker
    """)


# ==========================================================================
#  Pretty-printing helpers
# ==========================================================================

def print_section(title: str, result: duckdb.DuckDBPyRelation) -> None:
    """Print a titled section with the query result."""
    print(f"\n{'=' * 100}")
    print(f"  {title}")
    print("=" * 100)
    df = result.fetchdf()
    print(df.to_string(index=False))


# ==========================================================================
#  Main -- demo all queries
# ==========================================================================

def main() -> None:
    # Check that gold files exist
    gold_files = sorted(GOLD_DIR.glob("*_gold.parquet"))
    if not gold_files:
        print(f"[ERROR] No gold parquet files found in {GOLD_DIR}")
        sys.exit(1)

    con = get_connection()

    # Verify the view
    row_count = con.sql("SELECT COUNT(*) AS total_rows FROM gold_stocks").fetchone()[0]
    ticker_count = con.sql("SELECT COUNT(DISTINCT ticker) FROM gold_stocks").fetchone()[0]
    col_count = con.sql("SELECT * FROM gold_stocks LIMIT 0").description
    n_cols = len(col_count)

    print("=" * 100)
    print("Financial ML Platform -- Stage 2: DuckDB SQL Analytics Engine")
    print(f"Database    : {'file (' + DB_PATH + ')' if USE_FILE_DB else 'in-memory'}")
    print(f"Gold view   : gold_stocks  ({ticker_count} tickers, {row_count:,} rows, {n_cols} columns)")
    print("=" * 100)

    # 1. Summary statistics
    print_section("1. Summary Statistics per Ticker", get_summary_stats(con))

    # 2. Top performing assets (last 30 days)
    print_section("2. Top Performing Assets (Last 30 Trading Days)", get_top_performing_assets(con, days=30))

    # 3. Highest risk assets
    print_section("3. Highest Risk Assets (Latest 30-Day Metrics)", get_highest_risk_assets(con))

    # 4. Correlation matrix
    print_section("4. Daily Return Correlation Matrix", get_correlation_matrix(con))

    # Bonus: ad-hoc SQL demo
    print(f"\n{'=' * 100}")
    print("  5. Ad-Hoc SQL Demo: NVDA vs AAPL -- Last 5 Days")
    print("=" * 100)
    adhoc_result = con.sql("""
        SELECT ticker,
               date,
               ROUND(close, 2)          AS close,
               ROUND(daily_return * 100, 2) AS daily_ret_pct,
               ROUND(rsi_14, 1)         AS rsi,
               ROUND(sharpe_30d, 2)     AS sharpe
        FROM gold_stocks
        WHERE ticker IN ('NVDA', 'AAPL')
        ORDER BY date DESC
        LIMIT 10
    """).fetchdf()
    print(adhoc_result.to_string(index=False))

    con.close()
    print("\n[OK] All queries executed successfully.")


if __name__ == "__main__":
    main()
