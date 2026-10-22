/**
 * Live SLA-Risk Watchlist — the ML layer's output shown where officers/managers act on it.
 * Reads GET /api/requests and shows open requests sorted by model SLA-breach probability
 * with the model's human-readable reasons (outcome: intelligent recommendations, live).
 * Auto-polls 45s; hidden without a backend session.
 */
import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { fetchLiveRequests, useLivePoll, type LiveRequestRow } from '../../utils/liveData';

export const LiveSlaRiskWatchlist: React.FC = () => {
  const { data, error, lastUpdated, refresh, loading } = useLivePoll<LiveRequestRow[]>(fetchLiveRequests);
  if (!data && !error) return null;

  const atRisk = (data ?? [])
    .filter(r => !['COMPLETED', 'REJECTED'].includes(r.status) && r.sla_breach_risk >= 0.4)
    .sort((a, b) => b.sla_breach_risk - a.sla_breach_risk)
    .slice(0, 8);

  return (
    <section
      aria-label="Live SLA-risk watchlist from the ML models"
      className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="break-words">SLA-Risk Watchlist — live model output (synthetic-trained)</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {data && !error ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-600 text-white">
              <Wifi className="w-3 h-3" /> Live · {atRisk.length} at risk
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

      {atRisk.length > 0 ? (
        <ul className="space-y-2">
          {atRisk.map(r => (
            <li
              key={r.id}
              className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3 rounded-lg bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800"
            >
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 shrink-0 ${r.sla_breach_risk >= 0.7 ? 'text-rose-500' : 'text-amber-500'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                  {r.applicant_name}
                  <span className="ml-2 font-mono text-[10px] text-slate-400">{r.id.slice(0, 8)}</span>
                  <span className="ml-2 text-[10px] text-slate-500">
                    {r.category} / {r.severity} · {r.status} · {r.zone}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed break-words">
                  Reasons: {Array.isArray(r.sla_risk_reasons) && r.sla_risk_reasons.length
                    ? r.sla_risk_reasons.join(' · ')
                    : 'no major risk factors'}
                </p>
              </div>
              <span
                className={`text-sm font-extrabold tabular-nums shrink-0 ${
                  r.sla_breach_risk >= 0.7 ? 'text-rose-600' : 'text-amber-600'
                }`}
              >
                {Math.round(r.sla_breach_risk * 100)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {data ? 'No open requests with model risk ≥ 0.4 right now.' : `Live API unreachable (${error}).`}
        </p>
      )}
      <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
        Model: Random Forest over synthetic data · risk is a <span className="font-semibold">triage probability, not a verdict</span> —
        act on the reasons; the officer decides.{lastUpdated && <> · updated {lastUpdated.toLocaleTimeString()}</>}
      </p>
    </section>
  );
};
