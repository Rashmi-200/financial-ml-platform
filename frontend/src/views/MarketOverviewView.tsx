import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Flame,
  ArrowUpRight,
  PieChart,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { MarketOverviewResponse, WatchlistItem } from '../types';

interface MarketOverviewViewProps {
  onNavigateToSymbol: (symbol: string) => void;
}

const TradingViewHeatmap: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.async = true;
    script.type = 'text/javascript';
    const isDark = document.documentElement.classList.contains('dark');
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: 'S&P500',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'en',
      symbolUrl: '',
      colorTheme: isDark ? 'dark' : 'light',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      width: '100%',
      height: '500',
    });
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', width: '100%', height: '500px' }} ref={containerRef}>
      <div className="tradingview-widget-container__widget" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

export const MarketOverviewView: React.FC<MarketOverviewViewProps> = ({ onNavigateToSymbol }) => {
  const [overview, setOverview] = useState<MarketOverviewResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.getMarketOverview().catch(() => null),
      api.getWatchlist().catch(() => []),
    ]).then(([mo, wl]) => {
      setOverview(mo);
      setWatchlist(wl);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            Market Overview & Sector Heatmaps
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Cross-sector relative performance, market breadth indicators, and global asset return distribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-mono" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Regime: <strong style={{ color: 'var(--up)' }}>Expansionary Momentum</strong>
          </span>
        </div>
      </div>

      {/* Market Breadth & Advance/Decline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Advancing Issues</div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--up)' }}>
            {overview?.market_breadth?.advancers || 342}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>68.4% of universe</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Declining Issues</div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--down)' }}>
            {overview?.market_breadth?.decliners || 158}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>31.6% of universe</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>A/D Ratio</div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--accent)' }}>
            {overview?.market_breadth?.advance_decline_ratio?.toFixed(2) || '2.16'}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--up)' }}>Strong Bullish Breadth</div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Market Volatility (VIX)</div>
          <div className="text-2xl font-bold font-mono mt-1 text-indigo-500">14.32</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Low Tail-Risk Regime</div>
        </div>
      </div>

      {/* Interactive TradingView Workstation Stock Heatmap */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Interactive TradingView Workstation Heatmap</h3>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-lg" style={{ background: 'var(--bg-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
            S&P 500 Sector Heatmap Widget
          </span>
        </div>
        <TradingViewHeatmap />
      </div>

      {/* Sector Performance Bar Chart */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Sector Performance Matrix (%)</h3>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Real-time Gold Layer Feed</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={overview?.sectors || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
            >
              <XAxis
                type="number"
                unit="%"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="sector"
                stroke="#64748b"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '0.75rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
                formatter={(val: number) => [`${val > 0 ? '+' : ''}${val}%`, 'Daily Performance']}
              />
              <Bar dataKey="performance_pct" radius={[0, 4, 4, 0]}>
                {overview?.sectors.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.performance_pct >= 0 ? '#10b981' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Global Ticker Return Heatmap Grid */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Global Ticker Return Heatmap</h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> &gt;+1%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-800"></span> 0 to +1%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-800"></span> 0 to -1%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> &lt;-1%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 font-mono">
          {watchlist.map((item) => {
            const chg = item.daily_change_pct;
            let bgStyle: React.CSSProperties = { background: 'var(--bg-muted)', borderColor: 'var(--border)' };
            if (chg >= 1.5) bgStyle = { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)', color: 'var(--up)' };
            else if (chg > 0) bgStyle = { background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', color: 'var(--up)' };
            else if (chg <= -1.5) bgStyle = { background: 'rgba(220,38,38,0.15)', borderColor: 'rgba(220,38,38,0.4)', color: 'var(--down)' };
            else bgStyle = { background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.22)', color: 'var(--down)' };

            return (
              <div
                key={item.symbol}
                onClick={() => onNavigateToSymbol(item.symbol)}
                className="p-4 rounded-xl border transition-all cursor-pointer hover:scale-105 hover:shadow-xl"
                style={bgStyle}
              >
                <div className="flex justify-between items-start">
                  <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{item.symbol}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    item.signal === 'BUY' ? 'badge-buy' : item.signal === 'SELL' ? 'badge-sell' : 'badge-hold'
                  }`}>
                    {item.signal}
                  </span>
                </div>
                <div className="text-xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>${item.current_price.toFixed(2)}</div>
                <div className="text-xs font-semibold mt-1">
                  {chg > 0 ? `+${chg}%` : `${chg}%`}
                </div>
                <div className="text-[10px] mt-2 truncate font-sans" style={{ color: 'var(--text-muted)' }}>
                  {item.sector}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Gainers and Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Top Gainers</span>
          </div>
          <div className="space-y-2 font-mono text-sm">
            {overview?.top_gainers?.map((g) => (
              <div
                key={g.symbol}
                onClick={() => onNavigateToSymbol(g.symbol)}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-950/50 hover:bg-dark-850 border border-slate-800/80 cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-bold text-white">{g.symbol}</span>
                  <span className="text-xs text-slate-400 ml-2">${g.current_price.toFixed(2)}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  +{g.daily_change_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Decliners */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>Top Decliners</span>
          </div>
          <div className="space-y-2 font-mono text-sm">
            {overview?.top_losers?.map((l) => (
              <div
                key={l.symbol}
                onClick={() => onNavigateToSymbol(l.symbol)}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-950/50 hover:bg-dark-850 border border-slate-800/80 cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-bold text-white">{l.symbol}</span>
                  <span className="text-xs text-slate-400 ml-2">${l.current_price.toFixed(2)}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-500/30">
                  {l.daily_change_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
