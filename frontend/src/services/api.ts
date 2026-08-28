import {
  HealthResponse,
  WatchlistItem,
  StockAnalysisResponse,
  StockHistoryResponse,
  MarketOverviewResponse,
  RiskAnalysisResponse,
  NewsItem,
  ModelMonitorResponse,
  BacktestRequest,
  BacktestResponse,
} from '../types';

const API_BASE = 'http://127.0.0.1:8000';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`Fetch error for ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  getHealth: () => fetchJSON<HealthResponse>('/api/v1/health'),
  getWatchlist: () => fetchJSON<WatchlistItem[]>('/api/v1/watchlist'),
  getStockAnalysis: (symbol: string) => fetchJSON<StockAnalysisResponse>(`/api/v1/stocks/${symbol}/analysis`),
  getStockHistory: (symbol: string, limit = 180) => fetchJSON<StockHistoryResponse>(`/api/v1/stocks/${symbol}/history?limit=${limit}`),
  getMarketOverview: () => fetchJSON<MarketOverviewResponse>('/api/v1/market/overview'),
  getRiskAnalysis: (lookback_days = 120, confidence_level = 0.95) =>
    fetchJSON<RiskAnalysisResponse>(`/api/v1/risk/portfolio?lookback_days=${lookback_days}&confidence_level=${confidence_level}`),
  getNews: () => fetchJSON<NewsItem[]>('/api/v1/news'),
  getModelMonitor: (psi_threshold = 0.10) =>
    fetchJSON<ModelMonitorResponse>(`/api/v1/model/monitor?psi_threshold=${psi_threshold}`),
  triggerRetrain: (force = true) =>
    fetchJSON<{ status: string; message: string; state?: any }>(`/api/v1/model/retrain?force=${force}`, {
      method: 'POST',
    }),
  runBacktest: (payload: BacktestRequest) =>
    fetchJSON<BacktestResponse>('/api/v1/backtest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export function createLiveStreamSocket(onTick: (tick: any) => void): WebSocket {
  const wsUrl = 'ws://127.0.0.1:8000/api/v1/ws/live-stream';
  const socket = new WebSocket(wsUrl);
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && data.type === 'TICK') {
        onTick(data);
      }
    } catch (err) {
      console.error('WS parse error:', err);
    }
  };
  return socket;
}
