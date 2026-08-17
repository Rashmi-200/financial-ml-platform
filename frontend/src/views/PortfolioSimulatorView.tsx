import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Play,
  RotateCcw,
  TrendingUp,
  Percent,
  Award,
  Shield,
  Activity,
  Calendar,
  DollarSign,
  PieChart as PieIcon,
  Check,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { BacktestRequest, BacktestResponse } from '../types';

const AVAILABLE_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'V', 'WMT'];

const STRATEGIES = [
  { id: 'AI Ensemble Momentum', name: 'AI Ensemble Momentum (PyTorch + LightGBM)' },
  { id: 'Risk-Adjusted Trend Following', name: 'Risk-Adjusted Trend Following (VaR Filtered)' },
  { id: 'Mean Reversion', name: 'Mean Reversion (Bollinger + RSI Extreme)' },
  { id: 'Equal Weight', name: 'Equal-Weighted Benchmark Portfolio' },
  { id: 'Buy & Hold', name: 'Standard Buy & Hold Portfolio' },
];

export const PortfolioSimulatorView: React.FC = () => {
  // Form State
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [riskTolerance, setRiskTolerance] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL']);
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>('2026-08-14');
  const [strategy, setStrategy] = useState<string>('AI Ensemble Momentum');

  // Execution State
  const [loading, setLoading] = useState<boolean>(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleTicker = (sym: string) => {
    if (selectedTickers.includes(sym)) {
      if (selectedTickers.length > 1) {
        setSelectedTickers(selectedTickers.filter((t) => t !== sym));
      }
    } else {
      setSelectedTickers([...selectedTickers, sym]);
    }
  };

  const handleRunSimulation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload: BacktestRequest = {
        initial_capital: Number(initialCapital),
        symbol_list: selectedTickers,
        start_date: startDate,
        end_date: endDate,
        strategy: strategy,
        risk_tolerance: riskTolerance,
      };
      const res = await api.runBacktest(payload);
      setBacktestResult(res);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Backtest execution failed. Please verify dates or ticker inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial backtest on load
  useEffect(() => {
    handleRunSimulation();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            Portfolio Simulator & Quantitative Backtesting Engine
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Simulate ML-driven allocation strategies on historical Gold dataset with granular risk and return attribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-dark-850 border border-slate-800 text-xs font-mono text-cyan-300">
            Engine Mode: <strong className="text-emerald-400">Deterministic Backtester</strong>
          </span>
        </div>
      </div>

      {/* Form Inputs Container */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Simulation Configuration Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 font-mono text-xs">
          {/* Initial Capital */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Initial Capital ($ USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">$</span>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={1000}
                step={5000}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-dark-950 border border-slate-700 text-white font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Risk Tolerance */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Risk Tolerance Tier</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskTolerance(r)}
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    riskTolerance === r
                      ? 'bg-cyan-500 text-dark-950 shadow-md shadow-cyan-500/20'
                      : 'bg-dark-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Start */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Date Range End */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-slate-700 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Strategy Selection Dropdown */}
        <div className="space-y-2 font-mono text-xs">
          <label className="text-slate-300 font-semibold block">Quantitative Trading Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-dark-950 border border-slate-700 text-white font-medium focus:border-cyan-400 focus:outline-none text-sm"
          >
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ticker Multi-Selection Pills */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-semibold">Universe Asset Selection ({selectedTickers.length} selected)</label>
            <span className="text-[11px] text-slate-400">Click to toggle included tickers</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TICKERS.map((sym) => {
              const isSelected = selectedTickers.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleTicker(sym)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                      : 'bg-dark-950 text-slate-500 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{sym}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
          >
            <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Quant Simulation...' : 'Execute Backtest Simulation'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}
      </div>

      {/* RESULTS SECTION */}
      {backtestResult && (
        <div className="space-y-6">
          {/* 8 KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
            {/* 1. Initial Capital */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Initial Capital</div>
              <div className="text-base font-bold text-slate-200 mt-1">
                ${backtestResult.initial_capital.toLocaleString()}
              </div>
            </div>

            {/* 2. Final Capital */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Final Capital</div>
              <div className="text-base font-bold text-cyan-400 mt-1">
                ${backtestResult.final_value.toLocaleString()}
              </div>
            </div>

            {/* 3. Total Return % */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Total Return</div>
              <div className={`text-base font-bold mt-1 ${backtestResult.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {backtestResult.total_return_pct >= 0 ? `+${backtestResult.total_return_pct}%` : `${backtestResult.total_return_pct}%`}
              </div>
            </div>

            {/* 4. Annualized Return % */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Annualized Return</div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                +{backtestResult.annualized_return_pct}%
              </div>
            </div>

            {/* 5. Sharpe Ratio */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Sharpe Ratio</div>
              <div className="text-base font-bold text-indigo-400 mt-1">
                {backtestResult.sharpe_ratio.toFixed(2)}
              </div>
            </div>

            {/* 6. Sortino Ratio */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Sortino Ratio</div>
              <div className="text-base font-bold text-purple-400 mt-1">
                {backtestResult.sortino_ratio.toFixed(2)}
              </div>
            </div>

            {/* 7. Max Drawdown % */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Max Drawdown</div>
              <div className="text-base font-bold text-rose-400 mt-1">
                {backtestResult.max_drawdown_pct.toFixed(2)}%
              </div>
            </div>

            {/* 8. Win Rate % */}
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
              <div className="text-base font-bold text-cyan-300 mt-1">
                {backtestResult.win_rate_pct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Interactive Equity Curve Chart (Strategy vs Benchmark) */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Portfolio Equity Curve: Strategy Performance vs Benchmark
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Strategy Alpha: <strong className="text-emerald-400">+{backtestResult.alpha_pct}%</strong> | Beta: <strong className="text-slate-200">{backtestResult.beta}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-3 h-3 rounded bg-cyan-400"></span> Strategy Equity ($)
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-3 h-3 rounded bg-purple-400"></span> Equal-Weight Benchmark ($)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={backtestResult.equity_curve}>
                  <defs>
                    <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1222',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="portfolio_value"
                    stroke="#00f2fe"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#stratGrad)"
                    name="Strategy Equity"
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark_value"
                    stroke="#8b5cf6"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Benchmark"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Underwater Drawdown Subchart */}
            <div className="h-28 w-full pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono mb-1">Underwater Drawdown Timeline (%)</div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={backtestResult.equity_curve}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[-30, 0]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c1222', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                    formatter={(val: number) => [`${val}%`, 'Drawdown']}
                  />
                  <Area type="monotone" dataKey="drawdown_pct" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Allocation & Sample Trades */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Allocation weights */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3 font-mono">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" />
                Asset Target Allocation
              </h4>
              <div className="space-y-2 text-xs">
                {Object.entries(backtestResult.allocation).map(([sym, wt]) => (
                  <div key={sym} className="flex justify-between items-center p-2 rounded bg-dark-950/60 border border-slate-800">
                    <span className="font-bold text-white">{sym}</span>
                    <span className="text-cyan-400 font-semibold">{wt}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Executed Trades Log */}
            <div className="md:col-span-2 glass-panel p-5 rounded-xl border border-slate-800 space-y-3 font-mono">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Executed AI Signal Transactions Log
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-dark-950/70 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Ticker</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Shares</th>
                      <th className="p-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {backtestResult.trades.map((t, idx) => (
                      <tr key={idx} className="hover:bg-dark-850/50">
                        <td className="p-2 text-slate-400">{t.date}</td>
                        <td className="p-2 font-bold text-white">{t.symbol}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.action === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          }`}>
                            {t.action}
                          </span>
                        </td>
                        <td className="p-2">${t.price.toFixed(2)}</td>
                        <td className="p-2">{t.shares}</td>
                        <td className="p-2 text-cyan-400">{(t.signal_confidence * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
