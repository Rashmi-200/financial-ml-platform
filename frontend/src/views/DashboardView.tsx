import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { api, createLiveStreamSocket } from '../services/api';
import { WatchlistItem, MarketOverviewResponse, NewsItem, TabType } from '../types';

interface DashboardViewProps {
  onNavigateToSymbol: (symbol: string) => void;
  onNavigateToTab: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToSymbol,
  onNavigateToTab,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [marketOverview, setMarketOverview] = useState<MarketOverviewResponse | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [tickCount, setTickCount] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      api.getWatchlist().catch(() => []),
      api.getMarketOverview().catch(() => null),
      api.getNews().catch(() => []),
    ]).then(([wl, mo, n]) => {
      setWatchlist(wl);
      setMarketOverview(mo);
      setNews(n);
      setLoading(false);
    });

    // WebSocket Live Stream Subscription
    const socket = createLiveStreamSocket((tick) => {
      setIsLive(true);
      setTickCount((c) => c + 1);
      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === tick.symbol
            ? {
                ...item,
                current_price: tick.price,
                daily_change_pct: tick.daily_change_pct,
                rsi_14: tick.rsi_14,
                signal: tick.signal,
                confidence_score: tick.confidence_score,
              }
            : item
        )
      );
    });

    return () => {
      socket.close();
    };
  }, []);

  const buySignals = watchlist.filter((w) => w.signal === 'BUY');
  const holdSignals = watchlist.filter((w) => w.signal === 'HOLD');
  const sellSignals = watchlist.filter((w) => w.signal === 'SELL');

  return (
    <div className="space-y-6 pb-12">
      {/* Compact Status & Quick Launch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#0a0e17] border border-slate-200 dark:border-slate-800 font-mono text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-2.5 py-1 rounded-full font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
            {isLive ? `LIVE STREAMING (${tickCount} Ticks)` : 'QUANT ENGINE READY'}
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Regime: <strong className="text-emerald-600 dark:text-emerald-400">{marketOverview?.market_breadth?.market_regime || 'Expansionary Momentum'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('portfolio_simulator')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-dark-950 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Backtest Engine
          </button>
          <button
            onClick={() => onNavigateToTab('model_monitor')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            Model Monitor
          </button>
        </div>
      </div>

      {/* Top Indices Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {marketOverview?.indices?.map((idx) => {
          const isUp = idx.change_pct >= 0;
          return (
            <div key={idx.symbol} className="glass-panel p-4 rounded-xl glass-panel-hover">
              <div className="flex justify-between items-start text-xs text-slate-500 dark:text-slate-400 font-mono mb-1">
                <span>{idx.name}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{idx.symbol}</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">${idx.value.toFixed(2)}</div>
              <div className={`text-xs font-mono font-medium flex items-center gap-1 mt-1 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isUp ? `+${idx.change_pct}%` : `${idx.change_pct}%`}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: AI Live Signals & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Real-Time Watchlist & AI Inference Signals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Active Watchlist & Model Signals</h3>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {watchlist.length} Tickers
              </span>
            </div>
            <button
              onClick={() => onNavigateToTab('market_overview')}
              className="text-xs font-mono flex items-center gap-1 cursor-pointer hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Sector Heatmaps <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left qv-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Price</th>
                    <th>24h Change</th>
                    <th>AI Signal</th>
                    <th>Confidence</th>
                    <th>95% VaR</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {watchlist.map((item) => {
                    const isUp = item.daily_change_pct >= 0;
                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => onNavigateToSymbol(item.symbol)}
                        className="cursor-pointer group"
                      >
                        <td>
                          <div className="font-bold group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {item.symbol}
                          </div>
                          <div className="text-[11px] font-sans truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
                            {item.name}
                          </div>
                        </td>
                        <td className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          ${item.current_price.toFixed(2)}
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${isUp ? 'change-up' : 'change-down'}`}>
                            {isUp ? `+${item.daily_change_pct}%` : `${item.daily_change_pct}%`}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                            item.signal === 'BUY' ? 'badge-buy' : item.signal === 'SELL' ? 'badge-sell' : 'badge-hold'
                          }`}>
                            {item.signal}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${item.confidence_score * 100}%`, background: 'var(--accent)' }}
                              />
                            </div>
                            <span className="text-xs tabular-nums">{(item.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {item.var_95_pct.toFixed(2)}%
                        </td>
                        <td className="text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigateToSymbol(item.symbol); }}
                            className="p-1.5 rounded-lg transition-colors hover:scale-110"
                            style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                            title="Analyze Ticker"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Summary & Live News Stream */}
        <div className="space-y-6">
          {/* Signal Distribution Card */}
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold tracking-tight flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
              <span>Model Signal Distribution</span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>10 Assets</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.09)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <div className="text-2xl font-extrabold" style={{ color: 'var(--up)' }}>{buySignals.length}</div>
                <div className="text-[10px] uppercase mt-1" style={{ color: 'var(--text-muted)' }}>BUY</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <div className="text-2xl font-extrabold" style={{ color: '#D97706' }}>{holdSignals.length}</div>
                <div className="text-[10px] uppercase mt-1" style={{ color: 'var(--text-muted)' }}>HOLD</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.09)', border: '1px solid rgba(220,38,38,0.22)' }}>
                <div className="text-2xl font-extrabold" style={{ color: 'var(--down)' }}>{sellSignals.length}</div>
                <div className="text-[10px] uppercase mt-1" style={{ color: 'var(--text-muted)' }}>SELL</div>
              </div>
            </div>

            <div className="p-3 rounded-lg text-xs space-y-1 font-mono" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Ensemble Strategy:</span>
                <span className="font-bold" style={{ color: 'var(--accent)' }}>50% Transformer / 50% LGBM</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Risk Filter:</span>
                <span className="font-medium" style={{ color: 'var(--up)' }}>VaR ≤ 3.5% Cutoff Enforced</span>
              </div>
            </div>
          </div>

          {/* Real-time News Snapshot */}
          <div className="glass-panel p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Market News & Sentiment</h3>
              <button
                onClick={() => onNavigateToTab('news')}
                className="text-xs font-mono flex items-center gap-1 cursor-pointer hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                All News <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {news.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToTab('news')}
                  className="p-3 rounded-lg transition-all cursor-pointer space-y-1.5"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>{item.source}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                      item.sentiment === 'BULLISH' ? 'badge-buy' : item.sentiment === 'BEARISH' ? 'badge-sell' : ''
                    }`}
                    style={item.sentiment === 'NEUTRAL' ? { background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium line-clamp-2 hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    {item.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
