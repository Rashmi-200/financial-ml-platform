"""
airflow_dag.py -- Airflow / APScheduler DAG Configuration
Schedules the Financial ML Platform ETL pipeline to run every weekday at 5:00 PM EST (Market Close).

Compatible with:
  - Apache Airflow (via standard DAG definition)
  - APScheduler (standalone scheduler daemon / standalone script execution)
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.pipeline.dag_runner import (
    clean_bronze_to_silver,
    engineer_gold_features,
    fetch_and_save_bronze_data,
    refresh_duckdb_views,
    run_pipeline,
)

# --------------------------------------------------------------------------
# 1. Apache Airflow DAG Definition (Imported by Airflow scheduler if present)
# --------------------------------------------------------------------------
try:
    from airflow import DAG
    from airflow.operators.python import PythonOperator

    default_args = {
        "owner": "financial_ml",
        "depends_on_past": False,
        "start_date": datetime(2025, 1, 1),
        "email_on_failure": False,
        "email_on_retry": False,
        "retries": 1,
        "retry_delay": timedelta(minutes=5),
    }

    # Scheduled for 17:00 (5:00 PM) EST Mon-Fri
    # Airflow cron expression: 0 17 * * 1-5 (UTC offset should be set in airflow.cfg / UI)
    dag = DAG(
        "financial_ml_pipeline",
        default_args=default_args,
        description="Daily Financial ML Platform Ingestion & Analytics Pipeline",
        schedule_interval="0 17 * * 1-5",
        catchup=False,
    )

    t1 = PythonOperator(
        task_id="fetch_bronze_data",
        python_callable=fetch_and_save_bronze_data,
        dag=dag,
    )

    t2 = PythonOperator(
        task_id="clean_silver_data",
        python_callable=clean_bronze_to_silver,
        dag=dag,
    )

    t3 = PythonOperator(
        task_id="engineer_gold_features",
        python_callable=engineer_gold_features,
        dag=dag,
    )

    t4 = PythonOperator(
        task_id="refresh_duckdb_views",
        python_callable=refresh_duckdb_views,
        dag=dag,
    )

    # Task dependencies: t1 -> t2 -> t3 -> t4
    t1 >> t2 >> t3 >> t4

    AIRFLOW_AVAILABLE = True
except ImportError:
    AIRFLOW_AVAILABLE = False


# --------------------------------------------------------------------------
# 2. APScheduler Standalone Runner (for running without full Airflow setup)
# --------------------------------------------------------------------------
def start_apscheduler(run_immediately: bool = False) -> None:
    """Start APScheduler daemon to trigger pipeline every weekday at 5:00 PM EST."""
    try:
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        print("[ERROR] APScheduler is not installed. Install via `pip install apscheduler`.")
        sys.exit(1)

    scheduler = BlockingScheduler()

    # Schedule: Weekdays (Mon-Fri) at 17:00 US/Eastern
    trigger = CronTrigger(
        day_of_week="mon-fri",
        hour=17,
        minute=0,
        timezone="America/New_York",
    )

    scheduler.add_job(
        run_pipeline,
        trigger=trigger,
        id="financial_ml_etl_job",
        name="Financial ML Platform ETL Pipeline",
        replace_existing=True,
    )

    print("=" * 80)
    print("APScheduler Service Initialized")
    print("Schedule    : Every Weekday (Mon-Fri) at 17:00 EST (5:00 PM Market Close)")
    print("Timezone    : America/New_York")
    print("Airflow DAG : " + ("Registered & Active" if AIRFLOW_AVAILABLE else "Airflow not detected (standalone mode)"))
    print("=" * 80)

    if run_immediately:
        print("\n[INFO] Executing immediate dry-run trigger...")
        run_pipeline()

    print("\n[INFO] Scheduler active. Waiting for scheduled triggers (Press Ctrl+C to stop)...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("\n[INFO] Scheduler stopped.")


if __name__ == "__main__":
    # If run from command line, start scheduler (or dry-run if --now passed)
    run_now = "--now" in sys.argv or "--dry-run" in sys.argv
    start_apscheduler(run_immediately=run_now)
