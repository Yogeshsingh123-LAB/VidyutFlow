/**
 * Live Workflow KPIs — wired to GET /api/requests/kpis/summary (FastAPI backend).
 * Renders only when a backend session exists; auto-polls every 45s ("live on refresh").
 * The simulated executive tiles around it stay clearly labelled as simulated.
 */
import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { fetchLiveKpis, useLivePoll, type LiveKpiSummary } from '../../utils/liveData';

const pct = (v: number) => `${Math.round(v * 100)}%`;

const Tile: React.FC<{ label: string; value: string; tone?: string; sub?: string; icon: React.ReactNode }> = ({
  label,
  value,
  tone = 'text-slate-900 dark:text-white',
  sub,
  icon
}) => (
  <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs min-w-0">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 truncate">
      {label}
    </span>
    <div className="flex items-baseline gap-2">
      <span className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</span>
      <span className="text-slate-400 shrink-0">{icon}</span>
    </div>
    {sub && <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed break-words">{sub}</span>}
  </div>
);

export const LiveWorkflowKpis: React.FC = () => {
  const { data, error, lastUpdated, refresh, loading } = useLivePoll<LiveKpiSummary>(fetchLiveKpis);

  if (!data && !error) return null; // no backend session / first load — stay invisible

  const live = Boolean(data) && !error;

  return (
    <section
      aria-label="Live workflow KPIs from VidyutFlow API"
      className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="break-words">Live Workflow KPIs — VidyutFlow API</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {live ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
              <Wifi className="w-3 h-3" /> Live API
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">
              <WifiOff className="w-3 h-3" /> API offline
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Tile label="Total Requests" value={String(data.total_requests)} icon={<Activity className="w-4 h-4" />} />
            <Tile
              label="Pending"
              value={String(data.pending)}
              tone="text-amber-600"
              icon={<Clock className="w-4 h-4" />}
              sub="open (excl. completed/rejected)"
            />
            <Tile
              label="Completed"
              value={String(data.completed)}
              tone="text-emerald-600"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <Tile
              label="High SLA Risk"
              value={String(data.high_sla_risk)}
              tone="text-rose-600"
              icon={<AlertTriangle className="w-4 h-4" />}
              sub="open requests with risk ≥ 0.7"
            />
            <Tile
              label="Needs Correction"
              value={String(data.needs_correction)}
              tone="text-orange-600"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <Tile
              label="Avg SLA Risk"
              value={pct(data.avg_sla_risk)}
              icon={<Activity className="w-4 h-4" />}
              sub={`watch ${data.risk_buckets?.['watch_0.4-0.7'] ?? 0} · high ${data.risk_buckets?.['high_>=0.7'] ?? 0}`}
            />
          </div>
          <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Source: <code className="font-mono">GET /api/requests/kpis/summary</code> · computed live from the
            workflow database{lastUpdated && <> · updated {lastUpdated.toLocaleTimeString()} · auto-refresh 45s</>}
            {' '}· <span className="font-semibold">live on refresh</span> (streaming is roadmap).
          </p>
        </>
      ) : (
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Live API unreachable ({error}). Panels below continue on demo workspace data.
        </p>
      )}
    </section>
  );
};
