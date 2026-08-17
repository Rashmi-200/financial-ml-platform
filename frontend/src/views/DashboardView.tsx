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
      {/* Top Banner / Headline */}
      <div className="glass-panel-cyan rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {isLive ? `LIVE STREAMING (${tickCount} Ticks)` : 'QUANT ENGINE READY'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Regime: <strong className="text-emerald-400">{marketOverview?.market_breadth?.market_regime || 'Expansionary Momentum'}</strong>
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Real-Time Quantitative <span className="gradient-text-cyan">Intelligence Hub</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Multi-model ensemble executing continuous feature extraction across deep temporal transformers, gradient boosted trees, and statistical tail-risk constraints.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToTab('portfolio_simulator')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Launch Backtest Engine
            </button>
            <button
              onClick={() => onNavigateToTab('model_monitor')}
              className="px-4 py-2.5 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-200 border border-slate-700 text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-purple-400" />
              Model Health
            </button>
          </div>
        </div>
      </div>

      {/* Top Indices Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {marketOverview?.indices?.map((idx) => {
          const isUp = idx.change_pct >= 0;
          return (
            <div key={idx.symbol} className="glass-panel p-4 rounded-xl glass-panel-hover">
              <div className="flex justify-between items-start text-xs text-slate-400 font-mono mb-1">
                <span>{idx.name}</span>
                <span className="font-semibold text-slate-200">{idx.symbol}</span>
              </div>
              <div className="text-xl font-bold font-mono text-white">${idx.value.toFixed(2)}</div>
              <div className={`text-xs font-mono font-medium flex items-center gap-1 mt-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
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
              <h3 className="text-lg font-bold text-white tracking-tight">Active Watchlist & Model Signals</h3>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-dark-800 text-slate-300 border border-slate-700">
                {watchlist.length} Tickers Tracked
              </span>
            </div>
            <button
              onClick={() => onNavigateToTab('market_overview')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              View Sector Heatmaps <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden border border-slate-800/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-dark-950/70 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Asset</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">24h Change</th>
                    <th className="py-3 px-4">AI Signal</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">95% VaR</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {watchlist.map((item) => {
                    const isUp = item.daily_change_pct >= 0;
                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => onNavigateToSymbol(item.symbol)}
                        className="hover:bg-dark-850/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                            {item.symbol}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans truncate max-w-[120px]">
                            {item.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-100">
                          ${item.current_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                            isUp ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/20' : 'text-rose-400 bg-rose-950/60 border border-rose-500/20'
                          }`}>
                            {isUp ? `+${item.daily_change_pct}%` : `${item.daily_change_pct}%`}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                            item.signal === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : item.signal === 'SELL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          }`}>
                            {item.signal}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-dark-950 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-cyan-400 h-full rounded-full"
                                style={{ width: `${item.confidence_score * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{(item.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {item.var_95_pct.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToSymbol(item.symbol);
                            }}
                            className="p-1.5 rounded-lg bg-dark-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 transition-colors"
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
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center justify-between">
              <span>Model Signal Distribution</span>
              <span className="text-xs text-slate-400 font-mono">10 Assets</span>
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                <div className="text-2xl font-extrabold text-emerald-400">{buySignals.length}</div>
                <div className="text-[10px] text-slate-300 uppercase mt-1">BUY</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30">
                <div className="text-2xl font-extrabold text-amber-400">{holdSignals.length}</div>
                <div className="text-[10px] text-slate-300 uppercase mt-1">HOLD</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30">
                <div className="text-2xl font-extrabold text-rose-400">{sellSignals.length}</div>
                <div className="text-[10px] text-slate-300 uppercase mt-1">SELL</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-dark-950/60 border border-slate-800 text-xs text-slate-300 space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Ensemble Strategy:</span>
                <span className="text-cyan-400 font-bold">50% Transformer / 50% LGBM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Filter:</span>
                <span className="text-emerald-400">VaR ≤ 3.5% Cutoff Enforced</span>
              </div>
            </div>
          </div>

          {/* Real-time News Snapshot */}
          <div className="glass-panel p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight">Market News & Sentiment</h3>
              <button
                onClick={() => onNavigateToTab('news')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                All News <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {news.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToTab('news')}
                  className="p-3 rounded-lg bg-dark-950/50 hover:bg-dark-850/80 border border-slate-800/80 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-400">{item.source}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      item.sentiment === 'BULLISH'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : item.sentiment === 'BEARISH'
                        ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-slate-200 line-clamp-2 hover:text-cyan-300">
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
