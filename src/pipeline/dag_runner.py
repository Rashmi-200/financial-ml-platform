"""
dag_runner.py -- Stage 3: Pipeline Automation (End-to-End Task Orchestration)
Sequences and executes Stage 1 & Stage 2 operations:
  Step 1: fetch_and_save_bronze_data()
  Step 2: clean_bronze_to_silver()
  Step 3: engineer_gold_features()
  Step 4: refresh_duckdb_views()
"""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

# Add project root to sys.path if running as standalone script
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data import clean_data, db_engine, engineer_features, fetch_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("PipelineRunner")


def fetch_and_save_bronze_data() -> None:
    """Step 1: Download latest daily OHLCV via yfinance into Bronze Parquet."""
    logger.info("==================================================")
    logger.info("STEP 1: Fetching & Saving Bronze Data (yfinance)")
    logger.info("==================================================")
    fetch_data.main()


def clean_bronze_to_silver() -> None:
    """Step 2: Clean, deduplicate, and forward-fill data into Silver Parquet."""
    logger.info("==================================================")
    logger.info("STEP 2: Cleaning Bronze to Silver Layer")
    logger.info("==================================================")
    clean_data.main()


def engineer_gold_features() -> None:
    """Step 3: Compute technical, Fourier, Wavelet, and risk features into Gold Parquet."""
    logger.info("==================================================")
    logger.info("STEP 3: Engineering Gold Layer Features & Risk Metrics")
    logger.info("==================================================")
    engineer_features.main()


def refresh_duckdb_views() -> None:
    """Step 4: Refresh DuckDB views and run analytical sanity queries."""
    logger.info("==================================================")
    logger.info("STEP 4: Refreshing DuckDB Analytics Engine Views")
    logger.info("==================================================")
    db_engine.main()


def run_pipeline() -> bool:
    """Execute all pipeline steps in sequence."""
    pipeline_start = time.time()
    logger.info(">>> Starting Financial ML Platform Pipeline Execution <<<")

    steps = [
        ("Task 1: Fetch Bronze Data", fetch_and_save_bronze_data),
        ("Task 2: Clean Silver Data", clean_bronze_to_silver),
        ("Task 3: Engineer Gold Features", engineer_gold_features),
        ("Task 4: Refresh DuckDB Views", refresh_duckdb_views),
    ]

    for name, func in steps:
        step_start = time.time()
        logger.info(f"Starting {name}...")
        try:
            func()
            elapsed = time.time() - step_start
            logger.info(f"[SUCCESS] {name} completed in {elapsed:.2f}s")
        except Exception as exc:
            logger.error(f"[FAILURE] {name} failed with error: {exc}", exc_info=True)
            return False

    total_time = time.time() - pipeline_start
    logger.info("==================================================")
    logger.info(f"Pipeline Completed Successfully in {total_time:.2f}s!")
    logger.info("==================================================")
    return True


if __name__ == "__main__":
    success = run_pipeline()
    if not success:
        sys.exit(1)
