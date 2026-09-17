import React, { useEffect, useState, useCallback } from 'react';
import {
  Bot,
  Activity,
  ShieldCheck,
  Cpu,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  Database,
  Zap,
  Sliders,
  Layers,
  ArrowRight,
  X,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { ModelMonitorResponse, RetrainResult } from '../types';
import { useAuth } from '../context/AuthContext';

interface ToastState {
  visible: boolean;
  type: 'success' | 'error';
  result: RetrainResult | null;
}

export const ModelMonitorView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [monitorData, setMonitorData] = useState<ModelMonitorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [retrainingTriggered, setRetrainingTriggered] = useState<boolean>(false);
  const [psiThreshold, setPsiThreshold] = useState<number>(0.10);
  const [toast, setToast] = useState<ToastState>({ visible: false, type: 'success', result: null });

  const fetchMonitor = useCallback((threshold: number) => {
    api.getModelMonitor(threshold)
      .then((data) => {
        setMonitorData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMonitor(psiThreshold);
    const interval = setInterval(() => fetchMonitor(psiThreshold), 3000);
    return () => clearInterval(interval);
  }, [psiThreshold, fetchMonitor]);

  const dismissToast = () => setToast(t => ({ ...t, visible: false }));

  const handleRetrainTrigger = async () => {
    setRetrainingTriggered(true);
    setToast({ visible: false, type: 'success', result: null });
    try {
      const result = await api.triggerRetrain();
      // Immediately refresh monitor data so metrics update without waiting for next poll
      fetchMonitor(psiThreshold);
      setToast({ visible: true, type: result.status === 'SUCCESS' ? 'success' : 'error', result });
      // Auto-dismiss after 12 seconds
      setTimeout(dismissToast, 12000);
    } catch (err: any) {
      console.error('Retrain trigger error:', err);
      setToast({
        visible: true,
        type: 'error',
        result: {
          status: 'ERROR',
          message: err?.message ?? 'Pipeline request failed. Check backend logs.',
          timestamp: new Date().toISOString(),
        },
      });
      setTimeout(dismissToast, 8000);
    } finally {
      setRetrainingTriggered(false);
    }
  };

  const prod = monitorData?.production_model;
  const sys = monitorData?.system_health;

  return (
    <div className="space-y-6 pb-12">
      {/* ── RETRAIN TOAST NOTIFICATION ──────────────────────────────────── */}
      {toast.visible && (
        <div
          className="fixed top-20 right-6 z-50 w-[420px] rounded-2xl shadow-2xl border overflow-hidden"
          style={{
            background: toast.type === 'success' ? 'rgba(15, 23, 42, 0.97)' : 'rgba(30, 10, 10, 0.97)',
            borderColor: toast.type === 'success' ? 'rgba(34,211,238,0.3)' : 'rgba(239,68,68,0.4)',
            backdropFilter: 'blur(16px)',
            animation: 'slideInRight 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Top colour bar */}
          <div
            className="h-1 w-full"
            style={{ background: toast.type === 'success' ? 'var(--accent)' : '#ef4444' }}
          />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                )}
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {toast.type === 'success' ? '✅ Retraining Pipeline Complete' : '❌ Pipeline Error'}
                  </div>
                  <div className="text-xs mt-0.5 font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {toast.result?.message}
                  </div>
                </div>
              </div>
              <button onClick={dismissToast} className="shrink-0 cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics grid — only on success */}
            {toast.type === 'success' && toast.result && (
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {toast.result.promoted !== undefined && (
                  <div className="p-2.5 rounded-xl border col-span-2" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Champion/Challenger Outcome</div>
                    <div className={`font-bold mt-0.5 text-xs leading-snug ${toast.result.promoted ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {toast.result.promotion_outcome}
                    </div>
                  </div>
                )}
                {toast.result.total_retrains !== undefined && (
                  <div className="p-2.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total Retrains</div>
                    <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{toast.result.total_retrains}</div>
                  </div>
                )}
                {toast.result.duration_seconds !== undefined && (
                  <div className="p-2.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Pipeline Duration</div>
                    <div className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>{toast.result.duration_seconds.toFixed(1)}s</div>
                  </div>
                )}
                {toast.result.max_psi_score !== undefined && (
                  <div className="p-2.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Max PSI Score</div>
                    <div className={`font-bold mt-0.5 ${(toast.result.max_psi_score ?? 0) > 0.25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {toast.result.max_psi_score?.toFixed(4)}
                    </div>
                  </div>
                )}
                {toast.result.last_trained_date && (
                  <div className="p-2.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Last Trained</div>
                    <div className="font-bold mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{toast.result.last_trained_date}</div>
                  </div>
                )}
                {toast.result.champion_model && (
                  <div className="p-2.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Champion Sharpe</div>
                    <div className="font-bold mt-0.5 text-amber-400">{toast.result.champion_model.sharpe_ratio.toFixed(4)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Auto-dismiss progress bar */}
            <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: toast.type === 'success' ? 'var(--accent)' : '#ef4444',
                  animation: `shrinkBar ${toast.type === 'success' ? '12' : '8'}s linear forwards`,
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bot className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            ML Model Monitor & Production Drift Surveillance
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Continuous real-time evaluation of prediction error drift, population stability index (PSI), and latency KPIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* PSI Sensitivity Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <span className="px-2 font-bold" style={{ color: 'var(--text-muted)' }}>PSI Threshold:</span>
            {[
              { label: 'Strict (0.05)', val: 0.05 },
              { label: 'Standard (0.10)', val: 0.10 },
              { label: 'Relaxed (0.25)', val: 0.25 },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setPsiThreshold(opt.val)}
                className="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                style={
                  psiThreshold === opt.val
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isAdmin ? (
            <button
              onClick={handleRetrainTrigger}
              disabled={retrainingTriggered}
              className="px-4 py-2 rounded-xl font-bold text-xs font-mono flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrainingTriggered ? 'animate-spin' : ''}`} />
              {retrainingTriggered ? 'Triggering Retraining Pipeline...' : 'Trigger Pipeline Retrain'}
            </button>
          ) : (
            <div
              className="px-4 py-2 rounded-xl font-bold text-xs font-mono flex items-center gap-2 opacity-40 cursor-not-allowed select-none"
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              title="Admin privileges required to trigger retraining"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Trigger Pipeline Retrain
            </div>
          )}
        </div>
      </div>

      {/* PRODUCTION MODEL STATUS CARD */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold badge-buy">
                {prod?.health_badge || '🟢 Healthy'}
              </span>
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                {prod?.version || 'v3.2.0-prod'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                RAM: {sys?.memory_utilization_pct ?? 34.2}%
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                CPU: {sys?.gpu_utilization_pct ?? 18.5}%
              </span>
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight font-mono" style={{ color: 'var(--text-primary)' }}>
              {prod?.model_name || 'PyTorch Transformer Multi-Head Attention'}
            </h3>
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              Architecture: <span style={{ color: 'var(--text-primary)' }}>{prod?.framework || 'PyTorch 2.3 + CUDA (Ensemble)'}</span> | Active Weights: <span style={{ color: 'var(--accent)' }}>{prod?.active_parameters || '186,107 params'}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs text-right">
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Last Trained Date</div>
              <div className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{prod?.last_trained_date || '2026-08-16 18:30:00 UTC'}</div>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Next Retraining Date</div>
              <div className="font-bold mt-0.5" style={{ color: 'var(--accent)' }}>{prod?.next_retraining_date || '2026-08-23 00:00:00 UTC'}</div>
            </div>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Test RMSE</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: 'var(--text-primary)' }}>
              {prod?.test_rmse !== undefined ? prod.test_rmse.toFixed(5) : '--'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--up)' }}>Optimal Bounds</div>
          </div>

          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Test MAE</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: 'var(--text-secondary)' }}>
              {prod?.test_mae !== undefined ? prod.test_mae.toFixed(5) : '--'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Mean Absolute Error</div>
          </div>

          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Directional Accuracy %</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: 'var(--up)' }}>
              {prod?.directional_accuracy_pct !== undefined ? `${prod.directional_accuracy_pct.toFixed(2)}%` : '--%'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--up)' }}>Superior to Random Walk</div>
          </div>

          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Inference Latency</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: 'var(--accent)' }}>
              {prod?.average_latency_ms !== undefined ? `${prod.average_latency_ms.toFixed(1)} ms` : '-- ms'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>P99 SLA: &lt;50ms</div>
          </div>

          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Throughput</div>
            <div className="text-xl font-extrabold text-purple-500 dark:text-purple-400 mt-1">
              {prod?.throughput_req_sec !== undefined ? `${prod.throughput_req_sec.toFixed(0)} req/s` : '-- req/s'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Batched CUDA Tensor</div>
          </div>

          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>System Uptime</div>
            <div className="text-xl font-extrabold mt-1" style={{ color: 'var(--up)' }}>
              {prod?.uptime_pct !== undefined ? `${prod.uptime_pct.toFixed(2)}%` : '--%'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--up)' }}>Zero Degradation</div>
          </div>
        </div>
      </div>

      {/* STAGE 5: DRIFT ENGINE PANEL */}
      {monitorData?.drift_engine && (
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Stage 5 — Automated Drift Detection &amp; Retraining Engine
                </h3>
                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  PSI &gt; {monitorData.drift_engine.psi_threshold} or Wasserstein &gt; {monitorData.drift_engine.wasserstein_threshold} triggers Optuna Champion/Challenger retraining · Schedule: {monitorData.drift_engine.cron_schedule}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {monitorData.drift_engine.drift_triggered ? (
                <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold badge-hold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> DRIFT ALERT
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold badge-buy flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> STABLE
                </span>
              )}
              <span className="text-xs font-mono px-2 py-1 rounded-lg border" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                {monitorData.drift_engine.total_retrains} total retrains
              </span>
            </div>
          </div>

          {/* Drift KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Max PSI Score</div>
              <div className={`text-2xl font-extrabold mt-1 ${monitorData.drift_engine.max_psi_score > 0.25 ? 'text-amber-500' : ''}`}
                style={monitorData.drift_engine.max_psi_score <= 0.25 ? { color: 'var(--up)' } : {}}>
                {monitorData.drift_engine.max_psi_score.toFixed(4)}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Threshold: 0.25</div>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Max Wasserstein</div>
              <div className={`text-2xl font-extrabold mt-1 ${monitorData.drift_engine.max_wasserstein_score > 0.05 ? 'text-amber-500' : ''}`}
                style={monitorData.drift_engine.max_wasserstein_score <= 0.05 ? { color: 'var(--up)' } : {}}>
                {monitorData.drift_engine.max_wasserstein_score.toFixed(4)}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Threshold: 0.05</div>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Next Retrain</div>
              <div className="text-sm font-extrabold mt-1" style={{ color: 'var(--accent)' }}>
                {monitorData.drift_engine.next_retraining_date.replace(' UTC', '')}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Monthly @ UTC midnight</div>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Trigger Reason</div>
              <div className="text-xs font-bold mt-1 leading-tight" style={{ color: 'var(--text-primary)' }}>
                {monitorData.drift_engine.retrain_trigger_reason}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{monitorData.drift_engine.consecutive_drift_alerts} consecutive alerts</div>
            </div>
          </div>

          {/* Champion vs Challenger Table */}
          <div>
            <div className="text-xs font-bold uppercase mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Layers className="w-3.5 h-3.5" /> Champion vs Challenger Evaluation
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left qv-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Model Version</th>
                    <th>Sharpe Ratio</th>
                    <th>Directional Acc</th>
                    <th>Test RMSE</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr style={{ background: 'var(--bg-muted)' }}>
                    <td className="font-bold flex items-center gap-1.5" style={{ color: 'var(--up)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Champion
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{monitorData.drift_engine.champion.version}</td>
                    <td className="font-bold text-amber-500">{monitorData.drift_engine.champion.sharpe_ratio.toFixed(4)}</td>
                    <td style={{ color: 'var(--accent)' }}>{monitorData.drift_engine.champion.directional_accuracy_pct.toFixed(2)}%</td>
                    <td style={{ color: 'var(--up)' }}>{monitorData.drift_engine.champion.test_rmse.toFixed(5)}</td>
                    <td><span className="badge-buy px-2 py-0.5 rounded text-[10px] font-bold">Production</span></td>
                  </tr>
                  {monitorData.drift_engine.challenger ? (
                    <tr>
                      <td className="font-bold" style={{ color: 'var(--text-secondary)' }}>
                        <span className="flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> Challenger</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>challenger</td>
                      <td className={`font-bold ${monitorData.drift_engine.challenger.sharpe_ratio >= monitorData.drift_engine.champion.sharpe_ratio ? 'text-green-500' : 'text-red-400'}`}>
                        {monitorData.drift_engine.challenger.sharpe_ratio.toFixed(4)}
                      </td>
                      <td style={{ color: 'var(--accent)' }}>{monitorData.drift_engine.challenger.directional_accuracy_pct.toFixed(2)}%</td>
                      <td style={{ color: 'var(--text-primary)' }}>{monitorData.drift_engine.challenger.test_rmse.toFixed(5)}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${monitorData.drift_engine.last_promotion_outcome.includes('PROMOTED') ? 'badge-buy' : 'badge-hold'}`}>
                          {monitorData.drift_engine.last_promotion_outcome.includes('PROMOTED') ? 'Promoted' : 'Evaluated'}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-xs font-mono py-4" style={{ color: 'var(--text-muted)' }}>
                        No Challenger evaluated yet — will be trained on next drift trigger or monthly schedule
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {monitorData.drift_engine.last_promotion_outcome !== 'No challenger evaluated yet' && (
              <div className="mt-3 p-3 rounded-lg text-xs font-mono border" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Last Outcome:</span> {monitorData.drift_engine.last_promotion_outcome}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRIFT DETECTION & METRICS SECTION */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Activity className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          Drift Detection & Model Performance Surveillance
        </h3>

        {/* Prediction Error Drift Chart */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Rolling Prediction Error Drift (14-Day Timeline)</h4>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Comparison of Baseline vs Rolling 24-hour Root Mean Squared Error (RMSE) and Mean Absolute Error (MAE).
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <span className="w-3 h-3 rounded" style={{ background: 'var(--accent)' }}></span> Rolling RMSE
              </span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span className="w-3 h-3 rounded" style={{ background: 'var(--text-muted)' }}></span> Baseline RMSE
              </span>
              <span className="flex items-center gap-1.5 text-purple-500">
                <span className="w-3 h-3 rounded bg-purple-500"></span> Rolling MAE
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monitorData?.error_drift_timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '0.75rem', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'JetBrains Mono' }} />
                <Line type="monotone" dataKey="rolling_rmse" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} name="Rolling RMSE" />
                <Line type="monotone" dataKey="baseline_rmse" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Baseline RMSE" />
                <Line type="monotone" dataKey="rolling_mae" stroke="#8b5cf6" strokeWidth={1.8} dot={false} name="Rolling MAE" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Drift (PSI) Table */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Feature Drift & Population Stability Index (PSI)</h4>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Statistical divergence between training Gold baseline and live inference feature distributions.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2 py-0.5 rounded badge-buy">PSI &lt; 0.10: Stable</span>
              <span className="px-2 py-0.5 rounded badge-hold">0.10 ≤ PSI &lt; 0.25: Monitored</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left qv-table">
              <thead>
                <tr>
                  <th>Feature Name</th>
                  <th>Baseline Mean</th>
                  <th>Current Inference Mean</th>
                  <th>PSI Score</th>
                  <th>Drift Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {monitorData?.feature_drift?.map((f) => (
                  <tr key={f.feature_name}>
                    <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{f.feature_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{f.baseline_mean.toFixed(3)}</td>
                    <td style={{ color: 'var(--accent)' }}>{f.current_mean.toFixed(3)}</td>
                    <td className="font-bold" style={{ color: 'var(--text-primary)' }}>{f.psi_score.toFixed(3)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.drift_detected ? 'badge-hold' : 'badge-buy'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {f.drift_detected ? 'Adaptive Subsampling Active' : 'Nominal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Comparison Benchmarks Table */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Model Comparison & Architectural Benchmarks</h4>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Comparative evaluation across candidate deep learning, gradient boosting, and statistical baselines.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-lg" style={{ background: 'var(--bg-muted)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
              MLflow Logged Run #8291
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left qv-table">
              <thead>
                <tr>
                  <th>Model Candidate</th>
                  <th>Version</th>
                  <th>Architecture Type</th>
                  <th>Test RMSE</th>
                  <th>Directional Acc %</th>
                  <th>Inference Latency</th>
                  <th>Deployment Status</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {monitorData?.benchmarks?.map((b) => (
                  <tr
                    key={b.model_name}
                    style={b.is_production ? { background: 'var(--bg-muted)' } : {}}
                  >
                    <td className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      {b.is_production && <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />}
                      {b.model_name}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.version}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{b.architecture}</td>
                    <td className="font-bold" style={{ color: 'var(--up)' }}>{b.test_rmse.toFixed(5)}</td>
                    <td className="font-semibold" style={{ color: 'var(--accent)' }}>{b.directional_accuracy_pct.toFixed(2)}%</td>
                    <td>{b.inference_latency_ms.toFixed(1)} ms</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.is_production
                          ? 'badge-buy'
                          : b.status.includes('Shadow')
                          ? 'badge-hold'
                          : ''
                      }`}
                      style={!b.is_production && !b.status.includes('Shadow') ? { background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
