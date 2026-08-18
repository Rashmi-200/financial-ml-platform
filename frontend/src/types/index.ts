export type TabType = 
  | 'dashboard'
  | 'market_overview'
  | 'market_analysis'
  | 'risk_analysis'
  | 'portfolio_simulator'
  | 'news'
  | 'model_monitor';

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  loaded_models: Record<string, any>;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  daily_change_pct: number;
  signal: 'BUY' | 'HOLD' | 'SELL';
  confidence_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  var_95_pct: number;
  rsi_14: number;
  volume: number;
}

export interface StockAnalysisResponse {
  symbol: string;
  current_price: number;
  forecasted_price: number;
  forecasted_return_pct: number;
  signal: 'BUY' | 'HOLD' | 'SELL';
  confidence_score: number;
  risk_metrics: {
    var_95_pct: number;
    rsi_14: number;
    volatility_30d: number;
    var_threshold_breached?: boolean;
  };
  explanation: string;
  model_breakdown?: {
    pytorch_transformer_pred_pct: number;
    lightgbm_pred_pct: number;
    transformer_weight: number;
    lightgbm_weight: number;
    inference_latency_ms: number;
  };
}

export interface PriceHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_hist?: number;
  bb_upper?: number;
  bb_lower?: number;
  daily_return?: number;
  var_95?: number;
}

export interface StockHistoryResponse {
  symbol: string;
  sector: string;
  summary_stats: {
    current_price: number;
    high_52w: number;
    low_52w: number;
    market_cap: string;
    pe_ratio: number;
    beta: number;
    avg_volume_30d: string;
    volatility_annualized: string;
  };
  history: PriceHistoryPoint[];
}

export interface SectorPerformance {
  sector: string;
  performance_pct: number;
  market_weight_pct: number;
  leading_ticker: string;
  sentiment: string;
}

export interface MarketIndexItem {
  symbol: string;
  name: string;
  value: number;
  change_pct: number;
}

export interface MarketOverviewResponse {
  timestamp: string;
  market_sentiment: string;
  indices: MarketIndexItem[];
  sectors: SectorPerformance[];
  top_gainers: WatchlistItem[];
  top_losers: WatchlistItem[];
  market_breadth: {
    advancers: number;
    decliners: number;
    unchanged: number;
    advance_decline_ratio: number;
    market_regime: string;
  };
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][];
}

export interface RiskAnalysisResponse {
  portfolio_var_95_pct: number;
  portfolio_var_99_pct: number;
  portfolio_cvar_95_pct: number;
  portfolio_cvar_99_pct: number;
  diversification_ratio: number;
  max_drawdown_pct: number;
  correlation_matrix: CorrelationMatrix;
  asset_risk_breakdown: {
    ticker: string;
    var_95: number;
    var_99: number;
    cvar_95: number;
    beta: number;
    max_dd: number;
    volatility: number;
    status: string;
  }[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  tickers: string[];
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentiment_score: number;
  impact_level: 'LOW' | 'MEDIUM' | 'HIGH';
  url?: string;
}

export interface FeatureDriftItem {
  feature_name: string;
  baseline_mean: number;
  current_mean: number;
  psi_score: number;
  drift_detected: boolean;
  status: string;
}

export interface PredictionErrorDriftItem {
  timestamp: string;
  baseline_rmse: number;
  rolling_rmse: number;
  baseline_mae: number;
  rolling_mae: number;
}

export interface ModelBenchmarkItem {
  model_name: string;
  version: string;
  architecture: string;
  test_rmse: number;
  test_mae: number;
  directional_accuracy_pct: number;
  inference_latency_ms: number;
  status: string;
  is_production: boolean;
}

export interface ModelMonitorResponse {
  production_model: {
    model_name: string;
    version: string;
    framework: string;
    last_trained_date: string;
    next_retraining_date: string;
    test_rmse: number;
    test_mae: number;
    directional_accuracy_pct: number;
    health_status: string;
    health_badge: string;
    uptime_pct: number;
    average_latency_ms: number;
    throughput_req_sec: number;
    active_parameters: string;
  };
  system_health: {
    memory_utilization_pct: number;
    gpu_utilization_pct: number;
    inference_pipeline_status: string;
    db_connection_status: string;
    drift_alert_level: string;
  };
  feature_drift: FeatureDriftItem[];
  error_drift_timeline: PredictionErrorDriftItem[];
  benchmarks: ModelBenchmarkItem[];
}

export interface BacktestRequest {
  initial_capital: number;
  symbol_list: string[];
  start_date: string;
  end_date: string;
  strategy: string;
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface EquityPoint {
  date: string;
  portfolio_value: number;
  benchmark_value: number;
  drawdown_pct: number;
}

export interface TradeRecord {
  date: string;
  symbol: string;
  action: string;
  price: number;
  shares: number;
  signal_confidence: number;
}

export interface BacktestResponse {
  initial_capital: number;
  final_value: number;
  total_return_pct: number;
  annualized_return_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  strategy: string;
  risk_tolerance: string;
  benchmark_total_return_pct: number;
  alpha_pct: number;
  beta: number;
  equity_curve: EquityPoint[];
  trades: TradeRecord[];
  allocation: Record<string, number>;
}
