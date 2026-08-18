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
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Briefcase className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            Portfolio Simulator & Quantitative Backtesting Engine
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Simulate ML-driven allocation strategies on historical Gold dataset with granular risk and return attribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg text-xs font-mono" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Engine Mode: <strong style={{ color: 'var(--up)' }}>Deterministic Backtester</strong>
          </span>
        </div>
      </div>

      {/* Form Inputs Container */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="text-base font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          Simulation Configuration Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 font-mono text-xs">
          {/* Initial Capital */}
          <div className="space-y-2">
            <label className="font-semibold block" style={{ color: 'var(--text-secondary)' }}>Initial Capital ($ USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold" style={{ color: 'var(--text-muted)' }}>$</span>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={1000}
                step={5000}
                className="w-full pl-8 pr-3 py-2 rounded-xl border font-bold focus:outline-none"
                style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Risk Tolerance */}
          <div className="space-y-2">
            <label className="font-semibold block" style={{ color: 'var(--text-secondary)' }}>Risk Tolerance Tier</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskTolerance(r)}
                  className="py-2 rounded-lg font-bold transition-all cursor-pointer"
                  style={
                    riskTolerance === r
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Start */}
          <div className="space-y-2">
            <label className="font-semibold block" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border focus:outline-none"
              style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Date Range End */}
          <div className="space-y-2">
            <label className="font-semibold block" style={{ color: 'var(--text-secondary)' }}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border focus:outline-none"
              style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Strategy Selection Dropdown */}
        <div className="space-y-2 font-mono text-xs">
          <label className="font-semibold block" style={{ color: 'var(--text-secondary)' }}>Quantitative Trading Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border font-medium focus:outline-none text-sm"
            style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
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
            <label className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Universe Asset Selection ({selectedTickers.length} selected)</label>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Click to toggle included tickers</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TICKERS.map((sym) => {
              const isSelected = selectedTickers.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleTicker(sym)}
                  className="px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  style={
                    isSelected
                      ? { background: 'rgba(34,211,238,0.15)', color: 'var(--accent)', border: '1px solid rgba(34,211,238,0.4)' }
                      : { background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }
                >
                  {isSelected && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
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
            className="px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Quant Simulation...' : 'Execute Backtest Simulation'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl text-xs font-mono" style={{ background: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.3)', color: 'var(--down)' }}>
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
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Initial Capital</div>
              <div className="text-base font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                ${backtestResult.initial_capital.toLocaleString()}
              </div>
            </div>

            {/* 2. Final Capital */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Final Capital</div>
              <div className="text-base font-bold mt-1" style={{ color: 'var(--accent)' }}>
                ${backtestResult.final_value.toLocaleString()}
              </div>
            </div>

            {/* 3. Total Return % */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total Return</div>
              <div className="text-base font-bold mt-1" style={{ color: backtestResult.total_return_pct >= 0 ? 'var(--up)' : 'var(--down)' }}>
                {backtestResult.total_return_pct >= 0 ? `+${backtestResult.total_return_pct}%` : `${backtestResult.total_return_pct}%`}
              </div>
            </div>

            {/* 4. Annualized Return % */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Annualized Return</div>
              <div className="text-base font-bold mt-1" style={{ color: 'var(--up)' }}>
                +{backtestResult.annualized_return_pct}%
              </div>
            </div>

            {/* 5. Sharpe Ratio */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Sharpe Ratio</div>
              <div className="text-base font-bold text-indigo-500 font-bold mt-1">
                {backtestResult.sharpe_ratio.toFixed(2)}
              </div>
            </div>

            {/* 6. Sortino Ratio */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Sortino Ratio</div>
              <div className="text-base font-bold text-purple-500 font-bold mt-1">
                {backtestResult.sortino_ratio.toFixed(2)}
              </div>
            </div>

            {/* 7. Max Drawdown % */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Max Drawdown</div>
              <div className="text-base font-bold mt-1" style={{ color: 'var(--down)' }}>
                {backtestResult.max_drawdown_pct.toFixed(2)}%
              </div>
            </div>

            {/* 8. Win Rate % */}
            <div className="glass-panel p-3.5 rounded-xl">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Win Rate</div>
              <div className="text-base font-bold mt-1" style={{ color: 'var(--accent)' }}>
                {backtestResult.win_rate_pct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Interactive Equity Curve Chart (Strategy vs Benchmark) */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Portfolio Equity Curve: Strategy Performance vs Benchmark
                </h3>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Strategy Alpha: <strong style={{ color: 'var(--up)' }}>+{backtestResult.alpha_pct}%</strong> | Beta: <strong style={{ color: 'var(--text-primary)' }}>{backtestResult.beta}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                  <span className="w-3 h-3 rounded" style={{ background: 'var(--accent)' }}></span> Strategy Equity ($)
                </span>
                <span className="flex items-center gap-1.5 text-purple-500">
                  <span className="w-3 h-3 rounded bg-purple-500"></span> Equal-Weight Benchmark ($)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={backtestResult.equity_curve}>
                  <defs>
                    <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#64748b"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.75rem',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="portfolio_value"
                    stroke="var(--accent)"
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
            <div className="h-28 w-full pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Underwater Drawdown Timeline (%)</div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={backtestResult.equity_curve}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[-30, 0]} stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '11px' }}
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
            <div className="glass-panel p-5 rounded-xl space-y-3 font-mono">
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <PieIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Asset Target Allocation
              </h4>
              <div className="space-y-2 text-xs">
                {Object.entries(backtestResult.allocation).map(([sym, wt]) => (
                  <div key={sym} className="flex justify-between items-center p-2 rounded border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{sym}</span>
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>{wt}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Executed Trades Log */}
            <div className="md:col-span-2 glass-panel p-5 rounded-xl space-y-3 font-mono">
              <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Activity className="w-4 h-4" style={{ color: 'var(--up)' }} />
                Executed AI Signal Transactions Log
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left qv-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ticker</th>
                      <th>Action</th>
                      <th>Price</th>
                      <th>Shares</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {backtestResult.trades.map((t, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)' }}>{t.date}</td>
                        <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{t.symbol}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.action === 'BUY' ? 'badge-buy' : 'badge-hold'
                          }`}>
                            {t.action}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-primary)' }}>${t.price.toFixed(2)}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{t.shares}</td>
                        <td style={{ color: 'var(--accent)' }}>{(t.signal_confidence * 100).toFixed(0)}%</td>
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
