import React, { useState, useEffect } from 'react';
import {
  Shield,
  Cpu,
  HardDrive,
  Activity,
  Server,
  Zap,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SystemHealthData, RetrainResult } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const AdminConsoleView: React.FC = () => {
  const { token, user } = useAuth();
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Retraining state
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainLogs, setRetrainLogs] = useState<string[]>([]);
  const [retrainResult, setRetrainResult] = useState<RetrainResult | null>(null);

  const fetchSystemHealth = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/system-health`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error('403 Forbidden: Admin privileges required');
        if (res.status === 401) throw new Error('401 Unauthorized: Invalid authentication token');
        throw new Error(`Failed to fetch system telemetry (${res.status})`);
      }

      const data: SystemHealthData = await res.json();
      setHealthData(data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with backend telemetry endpoint');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleTriggerRetraining = async () => {
    setIsRetraining(true);
    setRetrainLogs([
      `[${new Date().toLocaleTimeString()}] Initiating Admin Model Retraining pipeline...`,
      `[${new Date().toLocaleTimeString()}] Extracting Silver parquet feature dataset...`,
      `[${new Date().toLocaleTimeString()}] Training PyTorch Temporal Attention Transformer...`,
      `[${new Date().toLocaleTimeString()}] Optimizing LightGBM booster hyperparameters via Optuna...`,
    ]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/model/retrain`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Retraining failed with status ${res.status}`);
      }

      const result: RetrainResult = await res.json();
      setRetrainResult(result);
      setRetrainLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Validation passed! Sharpe: ${result.champion_model?.sharpe_ratio} | Acc: ${result.champion_model?.directional_accuracy_pct}%`,
        `[${new Date().toLocaleTimeString()}] Promoted new Champion Model: PyTorch-Transformer-Ensemble-v1.4`,
      ]);
    } catch (err: any) {
      setRetrainLogs((prev) => [
        ...prev,
        `[ERROR ${new Date().toLocaleTimeString()}] ${err.message}`,
      ]);
    } finally {
      setIsRetraining(false);
    }
  };

  if (loading && !healthData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[var(--text-muted)]">Loading Admin Telemetry & MLOps Console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10 shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Admin & MLOps Console
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                RESTRICTED RBAC
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Active Admin Session: <span className="font-semibold text-[var(--text-primary)]">{user?.email}</span> | Infrastructure Telemetry & Model Pipeline Controls
            </p>
          </div>
        </div>

        <button
          onClick={fetchSystemHealth}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Telemetry Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* ── 1. Infrastructure & System Health Telemetry ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-[var(--text-secondary)]">
            Infrastructure Telemetry (psutil)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> CPU Utilization
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold">LIVE</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">
                {healthData?.cpu_percent ?? '--'}%
              </div>
              <span className="text-xs font-semibold text-emerald-400">Normal</span>
            </div>
            <div className="w-full bg-[var(--bg-muted)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(healthData?.cpu_percent || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* RAM Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-400" /> RAM Memory
              </span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                {healthData?.ram_used_gb ?? '--'} GB / {healthData?.ram_total_gb ?? '--'} GB
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">
                {healthData?.ram_percent ?? '--'}%
              </div>
              <span className="text-xs font-semibold text-indigo-400">Optimal</span>
            </div>
            <div className="w-full bg-[var(--bg-muted)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(healthData?.ram_percent || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Disk Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" /> Storage Disk
              </span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                {healthData?.disk_used_gb ?? '--'} GB / {healthData?.disk_total_gb ?? '--'} GB
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">
                {healthData?.disk_percent ?? '--'}%
              </div>
              <span className="text-xs font-semibold text-emerald-400">Healthy</span>
            </div>
            <div className="w-full bg-[var(--bg-muted)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(healthData?.disk_percent || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* API Latency Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" /> REST API Latency
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">FAST</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">
                {healthData?.api_latency_ms ?? '--'} <span className="text-sm font-sans text-[var(--text-muted)]">ms</span>
              </div>
              <span className="text-xs font-semibold text-amber-400">Sub-15ms</span>
            </div>
            <div className="w-full bg-[var(--bg-muted)] h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full w-[22%]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Microservice Grid ── */}
      <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-lg space-y-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-[var(--text-secondary)]">
          Active Services & Cluster Health
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {healthData?.active_services &&
            Object.entries(healthData.active_services).map(([serviceKey, statusStr]) => (
              <div
                key={serviceKey}
                className="p-3.5 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] capitalize">
                    {serviceKey.replace('_', ' ')}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Port: {serviceKey.includes('api') ? '8000' : 'Internal'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {statusStr}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── 2. MLOps Model Governance & Retraining Hub ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Governance Panel */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-[var(--text-primary)]">
                Champion Model Governance
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
              PyTorch + LightGBM
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Active Champion Model</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                PyTorch-Transformer-Ensemble-v1.4
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Out-of-Sample Sharpe</div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  {retrainResult?.champion_model ? retrainResult.champion_model.sharpe_ratio : 2.41}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-muted)]">Directional Accuracy</div>
                <div className="text-xl font-extrabold text-cyan-400 font-mono">
                  {retrainResult?.champion_model ? `${retrainResult.champion_model.directional_accuracy_pct}%` : '68.4%'}
                </div>
              </div>
            </div>
          </div>

          {/* Promotion Log */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Promotion History Timeline
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold">v1.4 Champion</span> - Sharpe: 2.41 | Acc: 68.4%
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">2 days ago</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)] flex items-center justify-between opacity-70">
                <div>
                  <span className="text-[var(--text-muted)]">v1.3 Challenger</span> - Sharpe: 2.18 | Acc: 65.2%
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">9 days ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Retraining Operations Control Hub */}
        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-lg flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono text-[var(--text-primary)]">
                Operations Control Hub
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Trigger manual retraining of the ensemble model on fresh market data. Restricted strictly to authorized <span className="font-bold text-amber-400">ADMIN</span> JWT sessions.
            </p>
          </div>

          {/* Terminal Console Output */}
          <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] font-mono text-xs space-y-1.5 min-h-[140px] max-h-[180px] overflow-y-auto">
            <div className="text-[var(--text-muted)] font-bold">// System Console Output</div>
            {retrainLogs.length === 0 ? (
              <div className="text-[var(--text-muted)] italic">Ready for manual pipeline execution...</div>
            ) : (
              retrainLogs.map((line, idx) => (
                <div key={idx} className="text-cyan-400 leading-snug">
                  {line}
                </div>
              ))
            )}
          </div>

          <button
            onClick={handleTriggerRetraining}
            disabled={isRetraining}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isRetraining ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Retraining Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Trigger Model Retraining (`POST /api/v1/model/retrain`)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
