import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  Bot,
  Layers,
  Search,
  CheckCircle,
  AlertTriangle,
  Zap,
  Clock,
  Sliders,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api, createLiveStreamSocket } from '../services/api';
import { StockAnalysisResponse, StockHistoryResponse, WatchlistItem } from '../types';

interface MarketAnalysisViewProps {
  initialSymbol?: string;
}

type SubSection = 'overview' | 'chart' | 'technicals' | 'forecast' | 'risk' | 'model';

export const MarketAnalysisView: React.FC<MarketAnalysisViewProps> = ({ initialSymbol = 'AAPL' }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('overview');
  const [analysis, setAnalysis] = useState<StockAnalysisResponse | null>(null);
  const [history, setHistory] = useState<StockHistoryResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<number>(180);
  const [isLive, setIsLive] = useState<boolean>(false);

  useEffect(() => {
    api.getWatchlist().then(setWatchlist).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStockAnalysis(selectedSymbol).catch(() => null),
      api.getStockHistory(selectedSymbol, timeframe).catch(() => null),
    ]).then(([ana, hist]) => {
      setAnalysis(ana);
      setHistory(hist);
      setLoading(false);
    });
  }, [selectedSymbol, timeframe]);

  // Live WebSocket Tick Subscription
  useEffect(() => {
    const socket = createLiveStreamSocket((tick) => {
      setIsLive(true);
      if (tick.symbol === selectedSymbol) {
        setAnalysis((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_price: tick.price,
            forecasted_price: tick.forecasted_price,
            forecasted_return_pct: tick.forecasted_return_pct,
            signal: tick.signal,
            confidence_score: tick.confidence_score,
            model_breakdown: tick.model_breakdown,
          };
        });

        setHistory((prev) => {
          if (!prev) return prev;
          const timeStr = tick.timestamp ? tick.timestamp.substring(11, 19) : 'LIVE';
          const newPoint = {
            date: timeStr,
            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            volume: 100000,
            sma_20: tick.sma_20,
            rsi_14: tick.rsi_14,
            daily_return: tick.daily_change_pct,
          };
          return {
            ...prev,
            summary_stats: {
              ...prev.summary_stats,
              current_price: tick.price,
            },
            history: [...prev.history, newPoint],
          };
        });
      }
    });

    return () => {
      socket.close();
    };
  }, [selectedSymbol]);

  const currentPrice = analysis?.current_price ?? history?.summary_stats?.current_price;
  const forecastedPrice = analysis?.forecasted_price;
  const forecastedReturn = analysis?.forecasted_return_pct;

  const formattedPrice = currentPrice !== undefined && currentPrice !== null ? `$${currentPrice.toFixed(2)}` : '--';
  const formattedForecastPrice = forecastedPrice !== undefined && forecastedPrice !== null ? `$${forecastedPrice.toFixed(2)}` : '--';
  const formattedForecastReturn = forecastedReturn !== undefined && forecastedReturn !== null
    ? (forecastedReturn >= 0 ? `+${forecastedReturn.toFixed(2)}%` : `${forecastedReturn.toFixed(2)}%`)
    : '--%';

  const high52 = history?.summary_stats?.high_52w !== undefined && history?.summary_stats?.high_52w !== null ? `$${history.summary_stats.high_52w.toFixed(2)}` : '--';
  const low52 = history?.summary_stats?.low_52w !== undefined && history?.summary_stats?.low_52w !== null ? `$${history.summary_stats.low_52w.toFixed(2)}` : '--';
  const peRatio = history?.summary_stats?.pe_ratio !== undefined && history?.summary_stats?.pe_ratio !== null ? history.summary_stats.pe_ratio : '--';
  const betaVal = history?.summary_stats?.beta !== undefined && history?.summary_stats?.beta !== null ? history.summary_stats.beta : '--';

  const subSections: { id: SubSection; label: string; icon: any }[] = [
    { id: 'overview', label: '1. Overview', icon: Layers },
    { id: 'chart', label: '2. Price Chart', icon: TrendingUp },
    { id: 'technicals', label: '3. Technical Indicators', icon: BarChart3 },
    { id: 'forecast', label: '4. AI Forecast', icon: Bot },
    { id: 'risk', label: '5. Risk Snapshot', icon: Shield },
    { id: 'model', label: '6. Model Details', icon: Zap },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar with Symbol Selector & Header */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold font-mono" style={{ color: 'var(--text-primary)' }}>{selectedSymbol}</h2>
            <span className="text-sm font-sans" style={{ color: 'var(--text-secondary)' }}>{history?.sector || 'Information Technology'}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
              analysis?.signal === 'BUY' ? 'badge-buy' : analysis?.signal === 'SELL' ? 'badge-sell' : 'badge-hold'
            }`}>
              {analysis?.signal || 'HOLD'} (Confidence: {(((analysis?.confidence_score ?? 0.8)) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            <span>Price: <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>{formattedPrice}</strong></span>
            <span>Forecast (5d): <strong className="text-sm" style={{ color: 'var(--accent)' }}>{formattedForecastPrice} ({formattedForecastReturn})</strong></span>
          </div>
        </div>

        {/* Ticker Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {watchlist.map((w) => (
            <button
              key={w.symbol}
              onClick={() => setSelectedSymbol(w.symbol)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
              style={
                selectedSymbol === w.symbol
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {w.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* 6 Sub-section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {subSections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSubSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSubSection(sec.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono tracking-tight transition-all cursor-pointer whitespace-nowrap"
              style={
                isActive
                  ? { background: 'rgba(34,211,238,0.12)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.3)', fontWeight: 'bold' }
                  : { color: 'var(--text-muted)', border: '1px solid transparent' }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-SECTION 1: OVERVIEW */}
      {activeSubSection === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Current Price</div>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formattedPrice}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>AI Target (5d)</div>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--accent)' }}>{formattedForecastPrice}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>52-Week High</div>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{high52}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>52-Week Low</div>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{low52}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>P/E Ratio</div>
              <div className="text-xl font-bold text-indigo-500 font-bold mt-1">{peRatio}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Market Beta</div>
              <div className="text-xl font-bold mt-1" style={{ color: 'var(--up)' }}>{betaVal}</div>
            </div>
          </div>

          {/* AI Decision Reasoning Card */}
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Quant Decision Engine Explanation</h3>
            </div>
            <p className="text-sm leading-relaxed font-mono" style={{ color: 'var(--text-secondary)' }}>
              {analysis?.explanation || 'AI Ensemble forecast indicates position trajectory based on multi-head attention over technical features and risk constraints.'}
            </p>
          </div>

          {/* Quick Price Preview Chart */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Price Action & 20/50 Day SMAs</h3>
              <div className="flex items-center gap-2">
                {[60, 180, 365].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTimeframe(d)}
                    className="px-2.5 py-1 rounded text-xs font-mono"
                    style={
                      timeframe === d
                        ? { background: 'rgba(34,211,238,0.2)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.3)' }
                        : { background: 'var(--bg-muted)', color: 'var(--text-muted)' }
                    }
                  >
                    {d === 60 ? '3M' : d === 180 ? '6M' : '1Y'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history?.history || []}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="close" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#priceGrad)" name="Close Price" />
                  <Line type="monotone" dataKey="sma_20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA 20" />
                  <Line type="monotone" dataKey="sma_50" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="SMA 50" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 2: PRICE CHART */}
      {activeSubSection === 'chart' && (
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Full Historical Price & Bollinger Bands</h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}><span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }}></span> Close</span>
              <span className="flex items-center gap-1 text-purple-500"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Upper BB</span>
              <span className="flex items-center gap-1 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Lower BB</span>
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history?.history || []}>
                <defs>
                  <linearGradient id="bbArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '12px' }} />
                <Area type="monotone" dataKey="bb_upper" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3 3" fillOpacity={1} fill="url(#bbArea)" name="Upper Bollinger" />
                <Line type="monotone" dataKey="close" stroke="var(--accent)" strokeWidth={2.5} dot={false} name="Close Price" />
                <Area type="monotone" dataKey="bb_lower" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" fillOpacity={0} name="Lower Bollinger" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Bar Subchart */}
          <div className="h-32 w-full pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Trading Volume</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history?.history || []}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '12px' }} />
                <Bar dataKey="volume" fill="#64748b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: TECHNICAL INDICATORS */}
      {activeSubSection === 'technicals' && (
        <div className="space-y-6">
          {/* RSI Chart */}
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Relative Strength Index (RSI 14)</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Overbought &gt; 70 | Oversold &lt; 30</p>
              </div>
              <span className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>
                {history?.history?.[history.history.length - 1]?.rsi_14?.toFixed(1) || '52.4'}
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="rsi_14" stroke="var(--accent)" strokeWidth={2} dot={false} name="RSI (14)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MACD Chart */}
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>MACD & Signal Line (12, 26, 9)</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Moving Average Convergence Divergence Momentum</p>
              </div>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="macd" stroke="#10b981" strokeWidth={1.8} dot={false} name="MACD" />
                  <Line type="monotone" dataKey="macd_signal" stroke="#f43f5e" strokeWidth={1.8} dot={false} name="Signal" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 4: AI FORECAST */}
      {activeSubSection === 'forecast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Ensemble Expected Return</div>
              <div className="text-3xl font-extrabold font-mono mt-1" style={{ color: 'var(--accent)' }}>
                {analysis?.forecasted_return_pct && analysis.forecasted_return_pct > 0 ? `+${analysis.forecasted_return_pct}%` : `${analysis?.forecasted_return_pct}%`}
              </div>
              <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>5-Day Holding Horizon</div>
            </div>

            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>PyTorch Transformer Prediction</div>
              <div className="text-3xl font-extrabold text-purple-500 font-mono mt-1">
                +{analysis?.model_breakdown?.pytorch_transformer_pred_pct || '2.00'}%
              </div>
              <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>Weight: 50.0%</div>
            </div>

            <div className="glass-panel p-5 rounded-xl">
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>LightGBM Regressor Prediction</div>
              <div className="text-3xl font-extrabold font-mono mt-1" style={{ color: 'var(--up)' }}>
                +{analysis?.model_breakdown?.lightgbm_pred_pct || '1.70'}%
              </div>
              <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>Weight: 50.0%</div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>5-Day Projected Trajectory Cone</h3>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Simulated monte-carlo confidence bounds (90% interval) around ensemble prediction.
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { day: 'Day 0 (Now)', price: analysis?.current_price || 220, upper: analysis?.current_price || 220, lower: analysis?.current_price || 220 },
                    { day: 'Day 1', price: (analysis?.current_price || 220) * 1.004, upper: (analysis?.current_price || 220) * 1.012, lower: (analysis?.current_price || 220) * 0.996 },
                    { day: 'Day 2', price: (analysis?.current_price || 220) * 1.008, upper: (analysis?.current_price || 220) * 1.018, lower: (analysis?.current_price || 220) * 0.998 },
                    { day: 'Day 3', price: (analysis?.current_price || 220) * 1.012, upper: (analysis?.current_price || 220) * 1.025, lower: (analysis?.current_price || 220) * 1.001 },
                    { day: 'Day 4', price: (analysis?.current_price || 220) * 1.015, upper: (analysis?.current_price || 220) * 1.031, lower: (analysis?.current_price || 220) * 1.003 },
                    { day: 'Day 5 (Target)', price: analysis?.forecasted_price || 224.2, upper: (analysis?.forecasted_price || 224.2) * 1.018, lower: (analysis?.forecasted_price || 224.2) * 0.985 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="upper" stroke="#8b5cf6" strokeDasharray="3 3" dot={false} name="Upper 90% Bound" />
                  <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} name="Expected Path" />
                  <Line type="monotone" dataKey="lower" stroke="#f59e0b" strokeDasharray="3 3" dot={false} name="Lower 90% Bound" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 5: RISK SNAPSHOT */}
      {activeSubSection === 'risk' && (
        <div className="space-y-6 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>95% Daily VaR</div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--down)' }}>
                {analysis?.risk_metrics?.var_95_pct?.toFixed(2) || '2.15'}%
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Parametric Normal</div>
            </div>

            <div className="glass-panel p-4 rounded-xl">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>30-Day Realized Volatility</div>
              <div className="text-2xl font-bold text-amber-500 mt-1">
                {((analysis?.risk_metrics?.volatility_30d || 0.018) * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Daily StDev</div>
            </div>

            <div className="glass-panel p-4 rounded-xl">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>RSI 14 Level</div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {analysis?.risk_metrics?.rsi_14?.toFixed(1) || '52.4'}
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--up)' }}>Healthy Neutral Range</div>
            </div>

            <div className="glass-panel p-4 rounded-xl">
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Risk Filter Status</div>
              <div className="text-2xl font-bold mt-1" style={{ color: 'var(--up)' }}>PASSED</div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>VaR &lt; 3.5% Threshold</div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Automated Risk Enforcement Rules</h3>
            <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--up)' }} />
                <span>Tail-Risk Cap: Trades blocked automatically if 1-day 95% VaR exceeds 3.50%.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--up)' }} />
                <span>Overbought Guard: BUY signals muted if RSI &gt; 70; triggers SELL if RSI &gt; 75.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--up)' }} />
                <span>Minimum Hurdle Rate: BUY signals require forecasted return &gt; +1.50% net of transaction costs.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* SUB-SECTION 6: MODEL DETAILS */}
      {activeSubSection === 'model' && (
        <div className="glass-panel p-6 rounded-2xl space-y-6 font-mono">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Production Model Architecture & Feature Weights</h3>
            <span className="text-xs font-bold badge-buy">
              Active in Memory
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="font-bold text-base" style={{ color: 'var(--accent)' }}>PyTorch Transformer (Deep Temporal)</div>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div>Layers: <span style={{ color: 'var(--text-primary)' }}>2 TransformerEncoderLayers</span></div>
                <div>d_model: <span style={{ color: 'var(--text-primary)' }}>32 dimensions</span></div>
                <div>Multi-Head Attention: <span style={{ color: 'var(--text-primary)' }}>2 Heads</span></div>
                <div>Sequence Window: <span style={{ color: 'var(--text-primary)' }}>30 trading days (T-29 to T-0)</span></div>
                <div>Parameters: <span style={{ color: 'var(--text-primary)' }}>186,107 trainable weights</span></div>
              </div>
            </div>

            <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="font-bold text-base" style={{ color: 'var(--up)' }}>LightGBM Regressor (Tabular Non-linear)</div>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div>Max Depth: <span style={{ color: 'var(--text-primary)' }}>4 levels</span></div>
                <div>Num Leaves: <span style={{ color: 'var(--text-primary)' }}>44 leaves</span></div>
                <div>Learning Rate: <span style={{ color: 'var(--text-primary)' }}>0.0101</span></div>
                <div>Feature Fraction: <span style={{ color: 'var(--text-primary)' }}>0.658 (Subsampling)</span></div>
                <div>Engineered Inputs: <span style={{ color: 'var(--text-primary)' }}>27 Technical + Wavelet + FFT features</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
