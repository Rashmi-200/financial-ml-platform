import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Percent,
  Grid,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { RiskAnalysisResponse } from '../types';

export const RiskAnalysisView: React.FC = () => {
  const [riskData, setRiskData] = useState<RiskAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lookbackDays, setLookbackDays] = useState<number>(128);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);

  const fetchRiskData = (lookback: number, confidence: number) => {
    setLoading(true);
    api.getRiskAnalysis(lookback, confidence)
      .then((data) => {
        setRiskData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRiskData(lookbackDays, confidenceLevel);
  }, [lookbackDays, confidenceLevel]);

  const var95 = riskData?.portfolio_var_95_pct !== undefined ? `${riskData.portfolio_var_95_pct.toFixed(2)}%` : '--%';
  const var99 = riskData?.portfolio_var_99_pct !== undefined ? `${riskData.portfolio_var_99_pct.toFixed(2)}%` : '--%';
  const cvar95 = riskData?.portfolio_cvar_95_pct !== undefined ? `${riskData.portfolio_cvar_95_pct.toFixed(2)}%` : '--%';
  const divRatio = riskData?.diversification_ratio !== undefined ? `${riskData.diversification_ratio.toFixed(2)}x` : '--';

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Portfolio Quantitative Risk & Correlation Matrix
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Value-at-Risk (VaR), Conditional Value-at-Risk (CVaR), cross-asset correlation matrices, and tail-loss drawdown stress-tests.
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Lookback Window Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <span className="px-2 font-bold" style={{ color: 'var(--text-muted)' }}>Lookback:</span>
            {[
              { label: '30D', val: 30 },
              { label: '60D', val: 60 },
              { label: '128D', val: 128 },
              { label: '1Y', val: 252 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setLookbackDays(opt.val)}
                className="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                style={
                  lookbackDays === opt.val
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Confidence Level Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <span className="px-2 font-bold" style={{ color: 'var(--text-muted)' }}>Conf:</span>
            {[
              { label: '90%', val: 0.90 },
              { label: '95%', val: 0.95 },
              { label: '99%', val: 0.99 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setConfidenceLevel(opt.val)}
                className="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                style={
                  confidenceLevel === opt.val
                    ? { background: '#f59e0b', color: '#fff' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Portfolio KPI Risk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="glass-panel p-5 rounded-xl space-y-1">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Portfolio 95% Daily VaR</div>
          <div className="text-3xl font-extrabold text-amber-500">
            {var95}
          </div>
          <div className="text-[11px] pt-1 font-sans" style={{ color: 'var(--text-muted)' }}>
            Max expected 1-day loss with 95% statistical confidence.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-1">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Portfolio 99% Daily VaR</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--down)' }}>
            {var99}
          </div>
          <div className="text-[11px] pt-1 font-sans" style={{ color: 'var(--text-muted)' }}>
            Tail-risk cutoff with 99% confidence interval.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-1">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Conditional VaR (CVaR 95%)</div>
          <div className="text-3xl font-extrabold text-purple-500 dark:text-purple-400">
            {cvar95}
          </div>
          <div className="text-[11px] pt-1 font-sans" style={{ color: 'var(--text-muted)' }}>
            Expected Shortfall in extreme 5% loss tails.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl space-y-1">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Diversification Ratio</div>
          <div className="text-3xl font-extrabold" style={{ color: 'var(--accent)' }}>
            {divRatio}
          </div>
          <div className="text-[11px] pt-1 font-sans" style={{ color: 'var(--up)' }}>
            Effective multi-asset risk reduction coefficient.
          </div>
        </div>
      </div>

      {/* Cross-Asset Correlation Heatmap Matrix */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Cross-Asset Correlation Matrix ({lookbackDays === 252 ? '1Y' : `${lookbackDays}D`} · DuckDB Gold Parquet Return Series)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-500/80"></span> High (0.7-1.0)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-600/80"></span> Moderate (0.4-0.7)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: 'var(--bg-muted)' }}></span> Low (&lt;0.4)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center font-mono text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-3 font-bold text-left" style={{ color: 'var(--text-secondary)', background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>Ticker</th>
                {riskData?.correlation_matrix?.tickers?.map((t) => (
                  <th key={t} className="p-3 font-bold border" style={{ color: 'var(--text-primary)', background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskData?.correlation_matrix?.matrix?.map((row, rIdx) => {
                const rowTicker = riskData.correlation_matrix.tickers[rIdx];
                return (
                  <tr key={rowTicker}>
                    <td className="p-3 font-bold text-left border" style={{ color: 'var(--text-primary)', background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                      {rowTicker}
                    </td>
                    {row.map((val, cIdx) => {
                      const isSelf = rIdx === cIdx;
                      let bgStyle: React.CSSProperties = { background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
                      if (isSelf) bgStyle = { background: 'rgba(34,211,238,0.2)', color: 'var(--accent)', fontWeight: 'bold', border: '1px solid var(--border)' };
                      else if (val >= 0.70) bgStyle = { background: 'rgba(34,211,238,0.15)', color: 'var(--accent)', fontWeight: '600', border: '1px solid var(--border)' };
                      else if (val >= 0.50) bgStyle = { background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid var(--border)' };

                      return (
                        <td key={`${rowTicker}-${cIdx}`} className="p-3 border" style={bgStyle}>
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset-Level Risk Breakdown Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Individual Asset Tail-Risk Breakdown</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left qv-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>95% VaR</th>
                <th>99% VaR</th>
                <th>CVaR (95%)</th>
                <th>Beta</th>
                <th>Annual Vol</th>
                <th>Historical Max DD</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {riskData?.asset_risk_breakdown?.map((item) => (
                <tr key={item.ticker}>
                  <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.ticker}</td>
                  <td className="text-amber-500 font-bold">{item.var_95.toFixed(2)}%</td>
                  <td className="font-bold" style={{ color: 'var(--down)' }}>{item.var_99.toFixed(2)}%</td>
                  <td className="text-purple-500 font-bold">{item.cvar_95.toFixed(2)}%</td>
                  <td style={{ color: 'var(--text-primary)' }}>{item.beta.toFixed(2)}</td>
                  <td style={{ color: 'var(--text-primary)' }}>{item.volatility.toFixed(1)}%</td>
                  <td className="font-bold" style={{ color: 'var(--down)' }}>{item.max_dd.toFixed(1)}%</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status.includes('Stable') || item.status.includes('Low')
                        ? 'badge-buy'
                        : item.status.includes('High')
                        ? 'badge-sell'
                        : 'badge-hold'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
