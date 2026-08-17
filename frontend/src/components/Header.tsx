import React, { useEffect, useState } from 'react';
import { Activity, Cpu, ShieldCheck, Zap, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';
import { HealthResponse } from '../types';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch((err) => console.warn('Health check warning:', err));
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-dark-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Platform Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-dark-950 rounded-[11px] flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-400 animate-pulse-slow" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-white font-mono">
              AURA<span className="text-cyan-400">.ML</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              PROD v1.1
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Quantitative Deep Learning & Trading Intelligence Platform
          </p>
        </div>
      </div>

      {/* Center Live Tickers / Status Pill */}
      <div className="hidden lg:flex items-center gap-4 bg-dark-950/60 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-emerald-400 text-xs font-semibold">ENGINE: ACTIVE</span>
        </div>
        <div className="h-3 w-[1px] bg-slate-800"></div>
        <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>PyTorch Transformer (v3.2) + LightGBM</span>
        </div>
        <div className="h-3 w-[1px] bg-slate-800"></div>
        <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>DuckDB In-Memory</span>
        </div>
      </div>

      {/* Right Controls & Clock */}
      <div className="flex items-center gap-4">
        <div className="text-right font-mono hidden md:block">
          <div className="text-xs text-slate-200 font-medium">{timeStr}</div>
          <div className="text-[10px] text-cyan-400/80 flex items-center justify-end gap-1">
            <Activity className="w-3 h-3" />
            Latency: 14.8ms
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/30 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Real-time Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>FASTAPI 8000</span>
        </div>
      </div>
    </header>
  );
};
