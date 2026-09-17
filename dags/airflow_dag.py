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
for candidate in [
    Path(__file__).resolve().parent.parent,
    Path(__file__).resolve().parent,
    Path(__file__).resolve().parents[2] if len(Path(__file__).resolve().parents) > 2 else Path(__file__).resolve().parent,
    Path("/opt/airflow"),
    Path("/app"),
]:
    if (candidate / "src").exists():
        PROJECT_ROOT = candidate
        break
else:
    PROJECT_ROOT = Path("/opt/airflow")

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

    t1 >> t2 >> t3 >> t4

    AIRFLOW_AVAILABLE = True
except ImportError:
    AIRFLOW_AVAILABLE = False
