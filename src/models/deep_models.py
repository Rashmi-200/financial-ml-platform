"""
deep_models.py -- Stage 4 Part 2: PyTorch Deep Learning Architectures
Provides 3 PyTorch sequence neural network architectures for financial time-series forecasting:
  1. StockLSTM: Multi-layer LSTM with Dropout and FC output head.
  2. StockGRU: Multi-layer GRU with Layer Normalization.
  3. StockTransformer: Positional Encoding + Multi-Head Self-Attention (Transformer Encoder).
"""

from __future__ import annotations

import math
import torch
import torch.nn as nn


# ==========================================================================
#  1. Positional Encoding for Transformer
# ==========================================================================

class PositionalEncoding(nn.Module):
    """Sinusoidal Positional Encoding for time-series sequences."""

    def __init__(self, d_model: int, max_len: int = 500, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # Shape: (1, max_len, d_model)

        self.register_buffer("pe", pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (B, seq_len, d_model)
        x = x + self.pe[:, : x.size(1)]
        return self.dropout(x)


# ==========================================================================
#  2. StockLSTM Architecture
# ==========================================================================

class StockLSTM(nn.Module):
    """Multi-layer LSTM with Dropout and FC output head."""

    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (B, seq_len, input_dim)
        lstm_out, (h_n, _) = self.lstm(x)
        # Use last hidden state: (B, hidden_dim)
        last_hidden = lstm_out[:, -1, :]
        out = self.fc(last_hidden)
        return out.squeeze(-1)


# ==========================================================================
#  3. StockGRU Architecture
# ==========================================================================

class StockGRU(nn.Module):
    """Multi-layer GRU with Layer Normalization."""

    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.gru = nn.GRU(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.layer_norm = nn.LayerNorm(hidden_dim)
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (B, seq_len, input_dim)
        gru_out, _ = self.gru(x)
        # Take last time step and normalize
        last_out = self.layer_norm(gru_out[:, -1, :])
        out = self.fc(last_out)
        return out.squeeze(-1)


# ==========================================================================
#  4. Temporal Transformer Architecture
# ==========================================================================

class StockTransformer(nn.Module):
    """Temporal Transformer Model with Positional Encoding & Multi-Head Self-Attention."""

    def __init__(
        self,
        input_dim: int,
        d_model: int = 64,
        nhead: int = 4,
        num_layers: int = 2,
        dim_feedforward: int = 128,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.input_projection = nn.Linear(input_dim, d_model)
        self.pos_encoder = PositionalEncoding(d_model=d_model, dropout=dropout)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.fc = nn.Sequential(
            nn.Linear(d_model, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (B, seq_len, input_dim)
        x = self.input_projection(x)
        x = self.pos_encoder(x)
        out_seq = self.transformer_encoder(x)
        # Average pooling across time dimension
        pooled = out_seq.mean(dim=1)
        out = self.fc(pooled)
        return out.squeeze(-1)
