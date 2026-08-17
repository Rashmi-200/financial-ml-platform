"""
train_pytorch.py -- Stage 4 Part 2: PyTorch Deep Learning Training & Evaluation
Defines StockDataset for 30-day sequence windows (T-29 to T), trains StockLSTM, StockGRU,
and StockTransformer with AdamW and Early Stopping, evaluates on out-of-sample Test Set,
and prints a comparative evaluation table comparing Baseline ML vs PyTorch Deep Models.
"""

from __future__ import annotations

import copy
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import polars as pl
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, precision_score, recall_score
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, Dataset

# Add project root to path
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.deep_models import StockGRU, StockLSTM, StockTransformer
from src.models.train_baseline import NON_FEATURE_COLS, prepare_ticker_data, time_series_split, train_eval_classification, train_eval_regression

warnings.filterwarnings("ignore")

# Device selection
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SEQ_LEN = 30
BATCH_SIZE = 256
EPOCHS = 5
PATIENCE = 2
LEARNING_RATE = 1e-3


# ==========================================================================
#  1. PyTorch StockDataset
# ==========================================================================

class StockDataset(Dataset):
    """PyTorch Dataset for 30-day sequence windows (T-29 to T)."""

    def __init__(self, X_seq: np.ndarray, y: np.ndarray):
        self.X = torch.tensor(X_seq, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)

    def __len__(self) -> int:
        return len(self.y)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.X[idx], self.y[idx]


def make_sequences(features: np.ndarray, targets: np.ndarray, seq_len: int = 30) -> tuple[np.ndarray, np.ndarray]:
    """Convert 2D features (T_len, F) and 1D targets into 3D sequence array (N, seq_len, F)."""
    X_list, y_list = [], []
    for i in range(seq_len - 1, len(features)):
        X_list.append(features[i - seq_len + 1 : i + 1])
        y_list.append(targets[i])
    return np.array(X_list), np.array(y_list)


def prepare_sequence_splits(df: pd.DataFrame, seq_len: int = 30):
    """
    Chronological 70% Train / 15% Val / 15% Test split with 30-day sequence windowing.
    Scales features using StandardScaler fit on Train set.
    """
    feature_cols = [c for c in df.columns if c not in NON_FEATURE_COLS]
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    df_train = df.iloc[:train_end]
    df_val = df.iloc[train_end:val_end]
    df_test = df.iloc[val_end:]

    scaler = StandardScaler()
    X_train_2d = scaler.fit_transform(df_train[feature_cols])
    X_val_2d = scaler.transform(df_val[feature_cols])
    X_test_2d = scaler.transform(df_test[feature_cols])

    # Sequence generation for Regression
    y_tr_reg, y_val_reg, y_ts_reg = df_train["target_return"].values, df_val["target_return"].values, df_test["target_return"].values
    X_tr_seq_reg, y_tr_seq_reg = make_sequences(X_train_2d, y_tr_reg, seq_len)
    X_val_seq_reg, y_val_seq_reg = make_sequences(X_val_2d, y_val_reg, seq_len)
    X_ts_seq_reg, y_ts_seq_reg = make_sequences(X_test_2d, y_ts_reg, seq_len)

    # Sequence generation for Classification
    y_tr_cls, y_val_cls, y_ts_cls = df_train["target_direction"].values, df_val["target_direction"].values, df_test["target_direction"].values
    _, y_tr_seq_cls = make_sequences(X_train_2d, y_tr_cls, seq_len)
    _, y_val_seq_cls = make_sequences(X_val_2d, y_val_cls, seq_len)
    _, y_ts_seq_cls = make_sequences(X_test_2d, y_ts_cls, seq_len)

    return {
        "num_features": len(feature_cols),
        "reg": {
            "train": DataLoader(StockDataset(X_tr_seq_reg, y_tr_seq_reg), batch_size=BATCH_SIZE, shuffle=False),
            "val": DataLoader(StockDataset(X_val_seq_reg, y_val_seq_reg), batch_size=BATCH_SIZE, shuffle=False),
            "test": DataLoader(StockDataset(X_ts_seq_reg, y_ts_seq_reg), batch_size=BATCH_SIZE, shuffle=False),
            "y_test": y_ts_seq_reg,
        },
        "cls": {
            "train": DataLoader(StockDataset(X_tr_seq_reg, y_tr_seq_cls), batch_size=BATCH_SIZE, shuffle=False),
            "val": DataLoader(StockDataset(X_val_seq_reg, y_val_seq_cls), batch_size=BATCH_SIZE, shuffle=False),
            "test": DataLoader(StockDataset(X_ts_seq_reg, y_ts_seq_cls), batch_size=BATCH_SIZE, shuffle=False),
            "y_test": y_ts_seq_cls,
        },
    }


# ==========================================================================
#  2. Training & Early Stopping Loop
# ==========================================================================

def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    criterion: nn.Module,
    epochs: int = EPOCHS,
    patience: int = PATIENCE,
    lr: float = LEARNING_RATE,
) -> nn.Module:
    """Train a PyTorch model with AdamW optimizer and early stopping on validation loss."""
    model = model.to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    best_loss = float("inf")
    best_weights = copy.deepcopy(model.state_dict())
    patience_counter = 0

    for epoch in range(epochs):
        model.train()
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(DEVICE), batch_y.to(DEVICE)
            optimizer.zero_grad()
            out = model(batch_x)
            loss = criterion(out, batch_y)
            loss.backward()
            optimizer.step()

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_batches = 0
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(DEVICE), batch_y.to(DEVICE)
                out = model(batch_x)
                val_loss += criterion(out, batch_y).item()
                val_batches += 1

        avg_val_loss = val_loss / max(1, val_batches)

        if avg_val_loss < best_loss:
            best_loss = avg_val_loss
            best_weights = copy.deepcopy(model.state_dict())
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                break

    model.load_state_dict(best_weights)
    return model


def predict(model: nn.Module, test_loader: DataLoader) -> np.ndarray:
    """Generate predictions for a test dataset."""
    model.eval()
    preds = []
    with torch.no_grad():
        for batch_x, _ in test_loader:
            batch_x = batch_x.to(DEVICE)
            out = model(batch_x)
            preds.extend(out.cpu().numpy())
    return np.array(preds)


# ==========================================================================
#  3. Main Execution & Comparative Table Generation
# ==========================================================================

def main() -> None:
    GOLD_DIR = PROJECT_ROOT / "data" / "gold"
    gold_files = sorted(GOLD_DIR.glob("*_gold.parquet"))
    if not gold_files:
        print(f"[ERROR] No gold files found in {GOLD_DIR}")
        sys.exit(1)

    print("=" * 115)
    print(f"Financial ML Platform -- Stage 4 Part 2: PyTorch Deep Learning Models")
    print(f"Device     : {DEVICE}")
    print(f"Sequence   : {SEQ_LEN}-day rolling windows (T-29 to T)")
    print(f"Optimizer  : AdamW (lr={LEARNING_RATE}) with Early Stopping (Patience={PATIENCE})")
    print("=" * 115)

    deep_reg_results = []
    deep_cls_results = []

    # Also collect baseline ML results for head-to-head comparison
    baseline_reg_results = []
    baseline_cls_results = []

    for ticker_idx, path in enumerate(gold_files, 1):
        ticker = path.stem.replace("_gold", "")
        print(f"[{ticker_idx:2d}/{len(gold_files)}] Training models for {ticker:6s} ...", flush=True)
        df = prepare_ticker_data(path)

        # Baseline 2D splits & training
        splits_2d = time_series_split(df)
        b_reg = train_eval_regression(splits_2d, n_estimators=10)
        b_cls = train_eval_classification(splits_2d, n_estimators=10)

        for mname, metrics in b_reg.items():
            baseline_reg_results.append({
                "ticker": ticker, "model": mname, "category": "Baseline ML",
                "rmse": metrics["rmse"], "mae": metrics["mae"], "dir_acc_pct": metrics["dir_acc_pct"],
            })
        for mname, metrics in b_cls.items():
            baseline_cls_results.append({
                "ticker": ticker, "model": mname, "category": "Baseline ML",
                "accuracy_pct": metrics["accuracy_pct"], "precision_pct": metrics["precision_pct"],
                "recall_pct": metrics["recall_pct"], "f1_pct": metrics["f1_pct"],
            })

        # Deep Learning Sequence splits
        seq_data = prepare_sequence_splits(df, seq_len=SEQ_LEN)
        n_feat = seq_data["num_features"]

        model_factories = {
            "PyTorch LSTM": lambda: StockLSTM(input_dim=n_feat, hidden_dim=16, num_layers=1, dropout=0.0),
            "PyTorch GRU": lambda: StockGRU(input_dim=n_feat, hidden_dim=16, num_layers=1, dropout=0.0),
            "PyTorch Transformer": lambda: StockTransformer(input_dim=n_feat, d_model=16, nhead=2, num_layers=1, dropout=0.1),
        }

        # Train Deep Regression
        for mname, factory in model_factories.items():
            model = factory()
            trained_model = train_model(
                model=model,
                train_loader=seq_data["reg"]["train"],
                val_loader=seq_data["reg"]["val"],
                criterion=nn.MSELoss(),
            )
            preds = predict(trained_model, seq_data["reg"]["test"])
            y_test = seq_data["reg"]["y_test"]

            rmse = np.sqrt(mean_squared_error(y_test, preds))
            mae = mean_absolute_error(y_test, preds)
            dir_acc = (np.sign(preds) == np.sign(y_test)).mean() * 100.0

            deep_reg_results.append({
                "ticker": ticker, "model": mname, "category": "Deep Learning",
                "rmse": rmse, "mae": mae, "dir_acc_pct": dir_acc,
            })

        # Train Deep Classification
        for mname, factory in model_factories.items():
            model = factory()
            trained_model = train_model(
                model=model,
                train_loader=seq_data["cls"]["train"],
                val_loader=seq_data["cls"]["val"],
                criterion=nn.BCEWithLogitsLoss(),
            )
            raw_logits = predict(trained_model, seq_data["cls"]["test"])
            preds = (raw_logits > 0.0).astype(int)
            y_test = seq_data["cls"]["y_test"].astype(int)

            acc = accuracy_score(y_test, preds) * 100.0
            prec = precision_score(y_test, preds, zero_division=0) * 100.0
            rec = recall_score(y_test, preds, zero_division=0) * 100.0
            f1 = f1_score(y_test, preds, zero_division=0) * 100.0

            deep_cls_results.append({
                "ticker": ticker, "model": mname, "category": "Deep Learning",
                "accuracy_pct": acc, "precision_pct": prec, "recall_pct": rec, "f1_pct": f1,
            })

    # Combine all results
    df_all_reg = pd.DataFrame(baseline_reg_results + deep_reg_results)
    df_all_cls = pd.DataFrame(baseline_cls_results + deep_cls_results)

    # ----------------------------------------------------------------------
    # 1. Overall Summary Comparison Table (Regression)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 115)
    print("  OVERALL REGRESSION MODEL COMPARISON (Baseline ML vs PyTorch Deep Models)")
    print("=" * 115)
    reg_summary = df_all_reg.groupby(["category", "model"]).agg(
        Mean_RMSE=("rmse", "mean"),
        Mean_MAE=("mae", "mean"),
        Mean_Dir_Acc_Pct=("dir_acc_pct", "mean"),
    ).reset_index()
    reg_summary["Mean_RMSE"] = reg_summary["Mean_RMSE"].map(lambda x: f"{x:.5f}")
    reg_summary["Mean_MAE"] = reg_summary["Mean_MAE"].map(lambda x: f"{x:.5f}")
    reg_summary["Mean_Dir_Acc_Pct"] = reg_summary["Mean_Dir_Acc_Pct"].map(lambda x: f"{x:.2f}%")
    print(reg_summary.to_string(index=False))

    # ----------------------------------------------------------------------
    # 2. Overall Summary Comparison Table (Classification)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 115)
    print("  OVERALL CLASSIFICATION MODEL COMPARISON (Baseline ML vs PyTorch Deep Models)")
    print("=" * 115)
    cls_summary = df_all_cls.groupby(["category", "model"]).agg(
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
    # 3. Per-Ticker Best Overall Model (Classification Accuracy & Regression RMSE)
    # ----------------------------------------------------------------------
    print("\n" + "=" * 115)
    print("  PER-TICKER WINNING MODEL COMPARISON (Out of All 7 Models)")
    print("=" * 115)

    winning_models = []
    for ticker in sorted(df_all_reg["ticker"].unique()):
        t_reg = df_all_reg[df_all_reg["ticker"] == ticker]
        t_cls = df_all_cls[df_all_cls["ticker"] == ticker]

        best_reg_row = t_reg.loc[t_reg["rmse"].idxmin()]
        best_cls_row = t_cls.loc[t_cls["accuracy_pct"].idxmax()]

        winning_models.append({
            "ticker": ticker,
            "Best Regression Model": f"{best_reg_row['model']} ({best_reg_row['category']})",
            "Test RMSE": f"{best_reg_row['rmse']:.5f}",
            "Best Classification Model": f"{best_cls_row['model']} ({best_cls_row['category']})",
            "Test Accuracy": f"{best_cls_row['accuracy_pct']:.2f}%",
        })

    print(pd.DataFrame(winning_models).to_string(index=False))
    print("\n[OK] PyTorch Deep Learning training & comparative evaluation complete.")


if __name__ == "__main__":
    main()
