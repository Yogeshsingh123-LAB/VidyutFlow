/**
 * Live Request Queue — wired to GET /api/requests (FastAPI backend).
 * Shows the real workflow rows (with ML category/severity + SLA risk) above the
 * demo queue in the Employee portal. Auto-polls every 45s; hidden without a backend session.
 */
import React from 'react';
import { ListChecks, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { fetchLiveRequests, useLivePoll, type LiveRequestRow } from '../../utils/liveData';

const riskTone = (risk: number) =>
  risk >= 0.7 ? 'text-rose-600' : risk >= 0.4 ? 'text-amber-600' : 'text-emerald-600';

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  NEEDS_CORRECTION: 'bg-orange-100 text-orange-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  FIELD_VERIFIED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  SUBMITTED: 'bg-slate-100 text-slate-700'
};

export const LiveRequestQueue: React.FC = () => {
  const { data, error, lastUpdated, refresh, loading } = useLivePoll<LiveRequestRow[]>(fetchLiveRequests);

  if (!data && !error) return null;

  return (
    <section
      aria-label="Live request queue from VidyutFlow API"
      className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5 mb-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
          <ListChecks className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="break-words">Live Request Queue — VidyutFlow API</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {data && !error ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
              <Wifi className="w-3 h-3" /> Live · {data.length} rows
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

      {data && data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-3">Ref</th>
                <th className="py-2 pr-3">Applicant</th>
                <th className="py-2 pr-3">ML Category / Severity</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">SLA Risk</th>
                <th className="py-2 pr-3">Zone</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 12).map(r => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 font-mono text-slate-500">{r.id.slice(0, 8)}</td>
                  <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-200">{r.applicant_name}</td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                    {r.category} / {r.severity}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        STATUS_TONE[r.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className={`py-2 pr-3 font-bold tabular-nums ${riskTone(r.sla_breach_risk)}`}>
                    {Math.round(r.sla_breach_risk * 100)}%
                    {Array.isArray(r.sla_risk_reasons) && r.sla_risk_reasons.length > 0 && (
                      <span className="block text-[10px] font-normal text-slate-400">{r.sla_risk_reasons[0]}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{r.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 12 && (
            <p className="mt-2 text-[10px] text-slate-400">
              Showing 12 of {data.length} live rows · full list at <code className="font-mono">GET /api/requests</code>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {data ? 'No live requests yet — submit one from the Consumer wizard.' : `Live API unreachable (${error}).`}
        </p>
      )}
      {lastUpdated && (
        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          updated {lastUpdated.toLocaleTimeString()} · auto-refresh 45s · <span className="font-semibold">live on refresh</span>
        </p>
      )}
    </section>
  );
};
