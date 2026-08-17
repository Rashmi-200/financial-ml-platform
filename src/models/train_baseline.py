"""
train_baseline.py -- Stage 4 Part 1: Time-Series Splitting & Baseline Models
Loads Gold datasets from data/gold/*.parquet, constructs target variables (T+1 return & direction),
performs chronological 70/15/15 time-series splits, trains baseline regression and classification models
(Linear/Logistic, Random Forest, XGBoost, LightGBM), evaluates test-set performance, and prints summary tables.
"""

from __future__ import annotations

import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
os.environ["LIGHTGBM_VERBOSE"] = "-1"
sys.modules["matplotlib"] = None  # Prevent lightgbm optional plot import error with numpy 2.x

import numpy as np
import pandas as pd
import polars as pl
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, precision_score, recall_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

warnings.filterwarnings("ignore")

# -- Configuration --------------------------------------------------------
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
GOLD_DIR: Path = PROJECT_ROOT / "data" / "gold"

NON_FEATURE_COLS: list[str] = ["date", "ticker", "target_return", "target_direction"]


# ==========================================================================
#  Data loading & preparation
# ==========================================================================

def prepare_ticker_data(filepath: Path) -> pd.DataFrame:
    """
    Load a gold parquet file, define target_return (T+1 shift of daily_return)
    and target_direction (1 if T+1 return > 0 else 0), and drop the final row (NaN target).
    Returns a pandas DataFrame sorted by date.
    """
    df = pl.read_parquet(filepath).sort("date")

    # Define targets: T+1 return & binary direction flag
    df = df.with_columns([
        pl.col("daily_return").shift(-1).alias("target_return"),
    ]).with_columns([
        (pl.col("target_return") > 0).cast(pl.Int64).alias("target_direction")
    ])

    # Drop last row where target is null due to shift(-1)
    df = df.filter(pl.col("target_return").is_not_null())

    return df.to_pandas()


def time_series_split(df: pd.DataFrame, train_pct: float = 0.70, val_pct: float = 0.15):
    """
    Chronological 70% Train / 15% Validation / 15% Test split (no random shuffling).
    Fits StandardScaler on Train features and scales Val & Test.
    """
    feature_cols = [c for c in df.columns if c not in NON_FEATURE_COLS]

    n = len(df)
    train_end = int(n * train_pct)
    val_end = int(n * (train_pct + val_pct))

    df_train = df.iloc[:train_end]
    df_val = df.iloc[train_end:val_end]
    df_test = df.iloc[val_end:]

    scaler = StandardScaler()
    X_train = scaler.fit_transform(df_train[feature_cols])
    X_val = scaler.transform(df_val[feature_cols])
    X_test = scaler.transform(df_test[feature_cols])

    y_train_reg = df_train["target_return"].values
    y_val_reg = df_val["target_return"].values
    y_test_reg = df_test["target_return"].values

    y_train_cls = df_train["target_direction"].values
    y_val_cls = df_val["target_direction"].values
    y_test_cls = df_test["target_direction"].values

    return {
        "feature_cols": feature_cols,
        "X_train": X_train, "X_val": X_val, "X_test": X_test,
        "y_train_reg": y_train_reg, "y_val_reg": y_val_reg, "y_test_reg": y_test_reg,
        "y_train_cls": y_train_cls, "y_val_cls": y_val_cls, "y_test_cls": y_test_cls,
        "n_train": len(df_train), "n_val": len(df_val), "n_test": len(df_test),
        "test_dates": (df_test["date"].min(), df_test["date"].max()),
    }


# ==========================================================================
#  Model training & evaluation
# ==========================================================================

def train_eval_regression(splits: dict, n_estimators: int = 30) -> dict[str, dict[str, float]]:
    """Train regression models and evaluate on out-of-sample Test Set."""
    X_train, X_test = splits["X_train"], splits["X_test"]
    y_train, y_test = splits["y_train_reg"], splits["y_test_reg"]

    regressors = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=n_estimators, max_depth=5, random_state=42, n_jobs=-1),
        "XGBoost": XGBRegressor(n_estimators=n_estimators, max_depth=4, learning_rate=0.05, random_state=42, n_jobs=-1, verbosity=0),
        "LightGBM": LGBMRegressor(n_estimators=n_estimators, max_depth=4, learning_rate=0.05, random_state=42, n_jobs=-1, verbose=-1),
    }

    results = {}
    for name, model in regressors.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mae = mean_absolute_error(y_test, preds)

        # Directional accuracy: sign(pred) == sign(actual)
        correct_dir = (np.sign(preds) == np.sign(y_test)).mean() * 100.0

        results[name] = {
            "rmse": rmse,
            "mae": mae,
            "dir_acc_pct": correct_dir,
        }

    return results


def train_eval_classification(splits: dict, n_estimators: int = 30) -> dict[str, dict[str, float]]:
    """Train classification models and evaluate on out-of-sample Test Set."""
    X_train, X_test = splits["X_train"], splits["X_test"]
    y_train, y_test = splits["y_train_cls"], splits["y_test_cls"]

    classifiers = {
        "Logistic Regression": LogisticRegression(max_iter=500, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=n_estimators, max_depth=5, random_state=42, n_jobs=-1),
        "XGBoost": XGBClassifier(n_estimators=n_estimators, max_depth=4, learning_rate=0.05, random_state=42, n_jobs=-1, verbosity=0),
        "LightGBM": LGBMClassifier(n_estimators=n_estimators, max_depth=4, learning_rate=0.05, random_state=42, n_jobs=-1, verbose=-1),
    }

    results = {}
    for name, model in classifiers.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        acc = accuracy_score(y_test, preds) * 100.0
        prec = precision_score(y_test, preds, zero_division=0) * 100.0
        rec = recall_score(y_test, preds, zero_division=0) * 100.0
        f1 = f1_score(y_test, preds, zero_division=0) * 100.0

        results[name] = {
            "accuracy_pct": acc,
            "precision_pct": prec,
            "recall_pct": rec,
            "f1_pct": f1,
        }

    return results


# ==========================================================================
#  Main execution & summary formatting
# ==========================================================================

def main() -> None:
    gold_files = sorted(GOLD_DIR.glob("*_gold.parquet"))
    if not gold_files:
        print(f"[ERROR] No gold parquet files found in {GOLD_DIR}")
        sys.exit(1)

    print("=" * 110)
    print("Financial ML Platform -- Stage 4 Part 1: Baseline Models Evaluation")
    print(f"Data Dir   : {GOLD_DIR}  ({len(gold_files)} assets)")
    print(f"Split      : 70% Train / 15% Validation / 15% Test (Chronological)")
    print("=" * 110)

    all_reg_results = []
    all_cls_results = []

    for path in gold_files:
        ticker = path.stem.replace("_gold", "")
        df = prepare_ticker_data(path)
        splits = time_series_split(df)

        reg_metrics = train_eval_regression(splits)
        cls_metrics = train_eval_classification(splits)

        for model_name, metrics in reg_metrics.items():
            all_reg_results.append({
                "ticker": ticker,
                "model": model_name,
                "rmse": metrics["rmse"],
                "mae": metrics["mae"],
                "dir_acc_pct": metrics["dir_acc_pct"],
            })

        for model_name, metrics in cls_metrics.items():
            all_cls_results.append({
                "ticker": ticker,
                "model": model_name,
                "accuracy_pct": metrics["accuracy_pct"],
                "precision_pct": metrics["precision_pct"],
                "recall_pct": metrics["recall_pct"],
                "f1_pct": metrics["f1_pct"],
            })

    df_reg = pd.DataFrame(all_reg_results)
    df_cls = pd.DataFrame(all_cls_results)

    # ----------------------------------------------------------------------
    # 1. Regression Summary Across All Models (Average Test Metrics)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 110)
    print("  REGRESSION BASELINE RESULTS (Average Across 10 Assets on Test Set)")
    print("=" * 110)
    reg_summary = df_reg.groupby("model").agg(
        Mean_RMSE=("rmse", "mean"),
        Mean_MAE=("mae", "mean"),
        Mean_Dir_Acc_Pct=("dir_acc_pct", "mean"),
    ).reset_index()

    # Format numbers
    reg_summary["Mean_RMSE"] = reg_summary["Mean_RMSE"].map(lambda x: f"{x:.5f}")
    reg_summary["Mean_MAE"] = reg_summary["Mean_MAE"].map(lambda x: f"{x:.5f}")
    reg_summary["Mean_Dir_Acc_Pct"] = reg_summary["Mean_Dir_Acc_Pct"].map(lambda x: f"{x:.2f}%")
    print(reg_summary.to_string(index=False))

    # ----------------------------------------------------------------------
    # 2. Classification Summary Across All Models (Average Test Metrics)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 110)
    print("  CLASSIFICATION BASELINE RESULTS (Average Across 10 Assets on Test Set)")
    print("=" * 110)
    cls_summary = df_cls.groupby("model").agg(
        Mean_Accuracy_Pct=("accuracy_pct", "mean"),
        Mean_Precision_Pct=("precision_pct", "mean"),
        Mean_Recall_Pct=("recall_pct", "mean"),
        Mean_F1_Pct=("f1_pct", "mean"),
    ).reset_index()

    cls_summary["Mean_Accuracy_Pct"] = cls_summary["Mean_Accuracy_Pct"].map(lambda x: f"{x:.2f}%")
    cls_summary["Mean_Precision_Pct"] = cls_summary["Mean_Precision_Pct"].map(lambda x: f"{x:.2f}%")
    cls_summary["Mean_Recall_Pct"] = cls_summary["Mean_Recall_Pct"].map(lambda x: f"{x:.2f}%")
    cls_summary["Mean_F1_Pct"] = cls_summary["Mean_F1_Pct"].map(lambda x: f"{x:.2f}%")
    print(cls_summary.to_string(index=False))

    # ----------------------------------------------------------------------
    # 3. Per-Ticker Detailed Model Comparison Matrix (Classification Accuracy)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 110)
    print("  PER-TICKER CLASSIFICATION ACCURACY (%) COMPARISON")
    print("=" * 110)
    pivot_cls = df_cls.pivot(index="ticker", columns="model", values="accuracy_pct")
    pivot_cls["BEST MODEL"] = pivot_cls.idxmax(axis=1)
    pivot_cls_str = pivot_cls.copy()
    for col in ["Logistic Regression", "Random Forest", "XGBoost", "LightGBM"]:
        pivot_cls_str[col] = pivot_cls_str[col].map(lambda x: f"{x:.2f}%")
    print(pivot_cls_str.to_string())

    # ----------------------------------------------------------------------
    # 4. Per-Ticker Detailed Model Comparison Matrix (Regression RMSE)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 110)
    print("  PER-TICKER REGRESSION RMSE COMPARISON (Lower is Better)")
    print("=" * 110)
    pivot_reg = df_reg.pivot(index="ticker", columns="model", values="rmse")
    pivot_reg["BEST MODEL"] = pivot_reg.idxmin(axis=1)
    pivot_reg_str = pivot_reg.copy()
    for col in ["Linear Regression", "Random Forest", "XGBoost", "LightGBM"]:
        pivot_reg_str[col] = pivot_reg_str[col].map(lambda x: f"{x:.5f}")
    print(pivot_reg_str.to_string())

    print("\n[OK] Baseline training & out-of-sample evaluation complete.")


if __name__ == "__main__":
    main()
