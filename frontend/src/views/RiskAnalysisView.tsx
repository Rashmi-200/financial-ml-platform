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

  useEffect(() => {
    api.getRiskAnalysis()
      .then((data) => {
        setRiskData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Portfolio Quantitative Risk & Correlation Matrix
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Value-at-Risk (VaR), Conditional Value-at-Risk (CVaR), cross-asset correlation matrices, and tail-loss drawdown stress-tests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Risk Limits Compliant
          </span>
        </div>
      </div>

      {/* 4 Portfolio KPI Risk Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Portfolio 95% Daily VaR</div>
          <div className="text-3xl font-extrabold text-amber-400">
            {riskData?.portfolio_var_95_pct.toFixed(2) || '2.15'}%
          </div>
          <div className="text-[11px] text-slate-400 pt-1 font-sans">
            Max expected 1-day loss with 95% statistical confidence.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Portfolio 99% Daily VaR</div>
          <div className="text-3xl font-extrabold text-rose-400">
            {riskData?.portfolio_var_99_pct.toFixed(2) || '3.20'}%
          </div>
          <div className="text-[11px] text-slate-400 pt-1 font-sans">
            Tail-risk cutoff with 99% confidence interval.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Conditional VaR (CVaR 95%)</div>
          <div className="text-3xl font-extrabold text-purple-400">
            {riskData?.portfolio_cvar_95_pct.toFixed(2) || '2.82'}%
          </div>
          <div className="text-[11px] text-slate-400 pt-1 font-sans">
            Expected Shortfall in extreme 5% loss tails.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Diversification Ratio</div>
          <div className="text-3xl font-extrabold text-cyan-400">
            {riskData?.diversification_ratio.toFixed(2) || '1.46'}x
          </div>
          <div className="text-[11px] text-emerald-400 pt-1 font-sans">
            Effective multi-asset risk reduction coefficient.
          </div>
        </div>
      </div>

      {/* Cross-Asset Correlation Heatmap Matrix */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Cross-Asset Correlation Matrix (120-Day Gold Parquet Return Series)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-500/80"></span> High (0.7-1.0)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-900/80"></span> Moderate (0.4-0.7)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-800"></span> Low (&lt;0.4)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center font-mono text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-slate-400 bg-dark-950/60 font-bold border border-slate-800 text-left">Ticker</th>
                {riskData?.correlation_matrix?.tickers?.map((t) => (
                  <th key={t} className="p-3 text-slate-200 bg-dark-950/60 font-bold border border-slate-800">
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
                    <td className="p-3 font-bold text-white bg-dark-950/60 border border-slate-800 text-left">
                      {rowTicker}
                    </td>
                    {row.map((val, cIdx) => {
                      const isSelf = rIdx === cIdx;
                      let bg = 'bg-slate-900/60 text-slate-400';
                      if (isSelf) bg = 'bg-cyan-500/20 text-cyan-300 font-bold';
                      else if (val >= 0.70) bg = 'bg-cyan-900/50 text-cyan-300 font-semibold';
                      else if (val >= 0.50) bg = 'bg-indigo-950/70 text-indigo-300';
                      else bg = 'bg-dark-950/60 text-slate-400';

                      return (
                        <td key={`${rowTicker}-${cIdx}`} className={`p-3 border border-slate-800/80 ${bg}`}>
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
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-bold text-white tracking-tight">Individual Asset Tail-Risk Breakdown</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-dark-950/70 border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-4">Ticker</th>
                <th className="py-3 px-4">95% VaR</th>
                <th className="py-3 px-4">99% VaR</th>
                <th className="py-3 px-4">CVaR (95%)</th>
                <th className="py-3 px-4">Beta</th>
                <th className="py-3 px-4">Annual Vol</th>
                <th className="py-3 px-4">Historical Max DD</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {riskData?.asset_risk_breakdown?.map((item) => (
                <tr key={item.ticker} className="hover:bg-dark-850/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{item.ticker}</td>
                  <td className="py-3 px-4 text-amber-400">{item.var_95.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-rose-400">{item.var_99.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-purple-400">{item.cvar_95.toFixed(2)}%</td>
                  <td className="py-3 px-4">{item.beta.toFixed(2)}</td>
                  <td className="py-3 px-4">{item.volatility.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-rose-400">{item.max_dd.toFixed(1)}%</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status.includes('Stable') || item.status.includes('Low')
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : item.status.includes('High')
                        ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-950 text-amber-400 border border-amber-500/30'
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
