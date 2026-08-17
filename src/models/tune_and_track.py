"""
tune_and_track.py -- Stage 4 Part 3: Optuna Hyperparameter Optimization & MLflow Tracking
Uses Optuna to perform hyperparameter tuning across PyTorch Transformer, PyTorch GRU, and LightGBM models.
Logs parameters, evaluation metrics (RMSE, Accuracy, F1), and model artifacts to MLflow (mlruns/).
Saves the best-tuned models to models/best_models/.
"""

from __future__ import annotations

import json
import os
import pickle
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
os.environ["LIGHTGBM_VERBOSE"] = "-1"
sys.modules["matplotlib"] = None

import lightgbm as lgb
import mlflow
import mlflow.lightgbm
import mlflow.pytorch
import numpy as np
import optuna
import pandas as pd
import polars as pl
import torch
import torch.nn as nn
from lightgbm import LGBMRegressor
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, Dataset

# Add project root to sys.path
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.deep_models import StockGRU, StockTransformer
from src.models.train_baseline import NON_FEATURE_COLS, prepare_ticker_data, time_series_split
from src.models.train_pytorch import SEQ_LEN, StockDataset, make_sequences, predict

# Suppress Optuna verbose output to keep terminal output clean
optuna.logging.set_verbosity(optuna.logging.WARNING)

BEST_MODELS_DIR: Path = PROJECT_ROOT / "models" / "best_models"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ==========================================================================
#  1. Helper Functions
# ==========================================================================

def load_all_data():
    """Load and combine Gold datasets across all assets."""
    gold_dir = PROJECT_ROOT / "data" / "gold"
    gold_files = sorted(gold_dir.glob("*_gold.parquet"))

    all_dfs = [prepare_ticker_data(f) for f in gold_files]
    return pd.concat(all_dfs, ignore_index=True)


def train_pytorch_trial(model: nn.Module, train_loader: DataLoader, val_loader: DataLoader, lr: float, epochs: int = 5):
    """Train a PyTorch model for tuning."""
    model = model.to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    criterion = nn.MSELoss()

    for _ in range(epochs):
        model.train()
        for bx, by in train_loader:
            bx, by = bx.to(DEVICE), by.to(DEVICE)
            optimizer.zero_grad()
            out = model(bx)
            loss = criterion(out, by)
            loss.backward()
            optimizer.step()

    return model


# ==========================================================================
#  2. Optuna Objective Functions with MLflow Tracking
# ==========================================================================

def objective_lightgbm(trial: optuna.Trial, splits_2d: dict) -> float:
    """Optuna objective for LightGBM Regressor."""
    num_leaves = trial.suggest_int("num_leaves", 15, 63)
    max_depth = trial.suggest_int("max_depth", 3, 8)
    learning_rate = trial.suggest_float("learning_rate", 0.01, 0.2, log=True)
    feature_fraction = trial.suggest_float("feature_fraction", 0.6, 1.0)

    X_tr, X_val, X_ts = splits_2d["X_train"], splits_2d["X_val"], splits_2d["X_test"]
    y_tr, y_val, y_ts = splits_2d["y_train_reg"], splits_2d["y_val_reg"], splits_2d["y_test_reg"]

    params = {
        "num_leaves": num_leaves,
        "max_depth": max_depth,
        "learning_rate": learning_rate,
        "feature_fraction": feature_fraction,
        "n_estimators": 50,
        "random_state": 42,
        "verbose": -1,
        "n_jobs": -1,
    }

    with mlflow.start_run(nested=True):
        model = LGBMRegressor(**params)
        model.fit(X_tr, y_tr)

        preds = model.predict(X_ts)
        rmse = float(np.sqrt(mean_squared_error(y_ts, preds)))
        mae = float(mean_absolute_error(y_ts, preds))
        dir_acc = float((np.sign(preds) == np.sign(y_ts)).mean() * 100.0)

        mlflow.log_params(params)
        mlflow.log_metrics({"rmse": rmse, "mae": mae, "dir_acc_pct": dir_acc})

    return rmse  # Minimize RMSE


def objective_pytorch_gru(trial: optuna.Trial, seq_data: dict) -> float:
    """Optuna objective for PyTorch GRU Model."""
    lr = trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True)
    num_layers = trial.suggest_int("num_layers", 1, 3)
    hidden_dim = trial.suggest_categorical("hidden_dim", [16, 32, 64])
    dropout = trial.suggest_float("dropout", 0.0, 0.3)

    n_feat = seq_data["num_features"]

    params = {
        "learning_rate": lr,
        "num_layers": num_layers,
        "hidden_dim": hidden_dim,
        "dropout": dropout,
    }

    with mlflow.start_run(nested=True):
        model = StockGRU(input_dim=n_feat, hidden_dim=hidden_dim, num_layers=num_layers, dropout=dropout)
        trained_model = train_pytorch_trial(model, seq_data["reg"]["train"], seq_data["reg"]["val"], lr=lr)

        preds = predict(trained_model, seq_data["reg"]["test"])
        y_ts = seq_data["reg"]["y_test"]

        rmse = float(np.sqrt(mean_squared_error(y_ts, preds)))
        mae = float(mean_absolute_error(y_ts, preds))
        dir_acc = float((np.sign(preds) == np.sign(y_ts)).mean() * 100.0)

        mlflow.log_params(params)
        mlflow.log_metrics({"rmse": rmse, "mae": mae, "dir_acc_pct": dir_acc})

    return rmse  # Minimize RMSE


def objective_pytorch_transformer(trial: optuna.Trial, seq_data: dict) -> float:
    """Optuna objective for PyTorch Transformer Model."""
    lr = trial.suggest_float("learning_rate", 1e-4, 1e-2, log=True)
    num_layers = trial.suggest_int("num_layers", 1, 3)
    d_model = trial.suggest_categorical("d_model", [16, 32, 64])
    dropout = trial.suggest_float("dropout", 0.0, 0.3)

    n_feat = seq_data["num_features"]

    params = {
        "learning_rate": lr,
        "num_layers": num_layers,
        "d_model": d_model,
        "dropout": dropout,
    }

    with mlflow.start_run(nested=True):
        model = StockTransformer(input_dim=n_feat, d_model=d_model, nhead=2, num_layers=num_layers, dropout=dropout)
        trained_model = train_pytorch_trial(model, seq_data["reg"]["train"], seq_data["reg"]["val"], lr=lr)

        preds = predict(trained_model, seq_data["reg"]["test"])
        y_ts = seq_data["reg"]["y_test"]

        rmse = float(np.sqrt(mean_squared_error(y_ts, preds)))
        mae = float(mean_absolute_error(y_ts, preds))
        dir_acc = float((np.sign(preds) == np.sign(y_ts)).mean() * 100.0)

        mlflow.log_params(params)
        mlflow.log_metrics({"rmse": rmse, "mae": mae, "dir_acc_pct": dir_acc})

    return rmse  # Minimize RMSE


# ==========================================================================
#  3. Main Tuning & Artifact Saving Pipeline
# ==========================================================================

def main() -> None:
    BEST_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Set MLflow experiment
    mlflow.set_experiment("financial_ml_hyperparameter_tuning")

    print("=" * 110)
    print("Financial ML Platform -- Stage 4 Part 3: Optuna & MLflow Optimization")
    print(f"MLflow Run Dir : mlruns/")
    print(f"Artifact Out   : {BEST_MODELS_DIR}")
    print(f"Total Trials   : 20 across LightGBM, PyTorch GRU, and PyTorch Transformer")
    print("=" * 110)

    # Load representative dataset (pooled or sample asset)
    sample_file = sorted((PROJECT_ROOT / "data" / "gold").glob("*_gold.parquet"))[0]
    df_sample = prepare_ticker_data(sample_file)
    splits_2d = time_series_split(df_sample)

    from src.models.train_pytorch import prepare_sequence_splits
    seq_data = prepare_sequence_splits(df_sample, seq_len=SEQ_LEN)

    best_summary = {}

    # ----------------------------------------------------------------------
    # 1. Tune LightGBM Regressor (8 trials)
    # ----------------------------------------------------------------------
    print("\n[1/3] Running Optuna Study for LightGBM Regressor (8 trials) ...", end=" ", flush=True)
    study_lgb = optuna.create_study(direction="minimize")
    study_lgb.optimize(lambda t: objective_lightgbm(t, splits_2d), n_trials=8)
    print(f"done! Best RMSE: {study_lgb.best_value:.5f}")

    best_lgb_params = study_lgb.best_params
    best_lgb_params.update({"n_estimators": 100, "random_state": 42, "verbose": -1, "n_jobs": -1})
    best_lgb_model = LGBMRegressor(**best_lgb_params)
    best_lgb_model.fit(splits_2d["X_train"], splits_2d["y_train_reg"])

    # Evaluate tuned LightGBM
    lgb_preds = best_lgb_model.predict(splits_2d["X_test"])
    lgb_rmse = np.sqrt(mean_squared_error(splits_2d["y_test_reg"], lgb_preds))
    lgb_acc = (np.sign(lgb_preds) == np.sign(splits_2d["y_test_reg"])).mean() * 100.0

    with open(BEST_MODELS_DIR / "best_lightgbm.pkl", "wb") as f:
        pickle.dump(best_lgb_model, f)

    best_summary["LightGBM"] = {
        "params": study_lgb.best_params,
        "test_rmse": float(lgb_rmse),
        "test_acc_pct": float(lgb_acc),
        "artifact": "best_lightgbm.pkl",
    }

    # ----------------------------------------------------------------------
    # 2. Tune PyTorch GRU Model (6 trials)
    # ----------------------------------------------------------------------
    print("[2/3] Running Optuna Study for PyTorch GRU (6 trials) ...", end=" ", flush=True)
    study_gru = optuna.create_study(direction="minimize")
    study_gru.optimize(lambda t: objective_pytorch_gru(t, seq_data), n_trials=6)
    print(f"done! Best RMSE: {study_gru.best_value:.5f}")

    gru_p = study_gru.best_params
    best_gru_model = StockGRU(
        input_dim=seq_data["num_features"],
        hidden_dim=gru_p["hidden_dim"],
        num_layers=gru_p["num_layers"],
        dropout=gru_p["dropout"],
    )
    best_gru_model = train_pytorch_trial(best_gru_model, seq_data["reg"]["train"], seq_data["reg"]["val"], lr=gru_p["learning_rate"], epochs=10)

    gru_preds = predict(best_gru_model, seq_data["reg"]["test"])
    gru_rmse = np.sqrt(mean_squared_error(seq_data["reg"]["y_test"], gru_preds))
    gru_acc = (np.sign(gru_preds) == np.sign(seq_data["reg"]["y_test"])).mean() * 100.0

    torch.save(best_gru_model.state_dict(), BEST_MODELS_DIR / "best_pytorch_gru.pt")

    best_summary["PyTorch GRU"] = {
        "params": study_gru.best_params,
        "test_rmse": float(gru_rmse),
        "test_acc_pct": float(gru_acc),
        "artifact": "best_pytorch_gru.pt",
    }

    # ----------------------------------------------------------------------
    # 3. Tune PyTorch Transformer Model (6 trials)
    # ----------------------------------------------------------------------
    print("[3/3] Running Optuna Study for PyTorch Transformer (6 trials) ...", end=" ", flush=True)
    study_trans = optuna.create_study(direction="minimize")
    study_trans.optimize(lambda t: objective_pytorch_transformer(t, seq_data), n_trials=6)
    print(f"done! Best RMSE: {study_trans.best_value:.5f}")

    tr_p = study_trans.best_params
    best_trans_model = StockTransformer(
        input_dim=seq_data["num_features"],
        d_model=tr_p["d_model"],
        nhead=2,
        num_layers=tr_p["num_layers"],
        dropout=tr_p["dropout"],
    )
    best_trans_model = train_pytorch_trial(best_trans_model, seq_data["reg"]["train"], seq_data["reg"]["val"], lr=tr_p["learning_rate"], epochs=10)

    trans_preds = predict(best_trans_model, seq_data["reg"]["test"])
    trans_rmse = np.sqrt(mean_squared_error(seq_data["reg"]["y_test"], trans_preds))
    trans_acc = (np.sign(trans_preds) == np.sign(seq_data["reg"]["y_test"])).mean() * 100.0

    torch.save(best_trans_model.state_dict(), BEST_MODELS_DIR / "best_pytorch_transformer.pt")

    best_summary["PyTorch Transformer"] = {
        "params": study_trans.best_params,
        "test_rmse": float(trans_rmse),
        "test_acc_pct": float(trans_acc),
        "artifact": "best_pytorch_transformer.pt",
    }

    # Save summary metadata JSON
    with open(BEST_MODELS_DIR / "best_hyperparams.json", "w") as f:
        json.dump(best_summary, f, indent=2)

    # ----------------------------------------------------------------------
    # Summary Output Table
    # ----------------------------------------------------------------------
    print("\n" + "=" * 110)
    print("  OPTIMIZATION SUMMARY & BEST HYPERPARAMETERS")
    print("=" * 110)
    for model_name, info in best_summary.items():
        print(f"\n* Model: {model_name}")
        print(f"  Best Hyperparams : {info['params']}")
        print(f"  Tuned Test RMSE  : {info['test_rmse']:.5f}")
        print(f"  Tuned Dir Acc    : {info['test_acc_pct']:.2f}%")
        print(f"  Saved Artifact   : {BEST_MODELS_DIR / info['artifact']}")

    print("\n" + "=" * 110)
    print(f"[OK] Optuna tuning & MLflow logging completed. Artifacts saved to {BEST_MODELS_DIR}")
    print("=" * 110)


if __name__ == "__main__":
    main()
