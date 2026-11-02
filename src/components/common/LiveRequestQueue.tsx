/**
 * Live Request Queue — wired to GET /api/requests (FastAPI backend).
 * Shows real workflow rows (with ML category/severity + SLA risk) in Employee portal.
 * Fully localized in English, Gujarati, Hindi, and Marathi (Item #32).
 */
import React from 'react';
import { ListChecks, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import { fetchLiveRequests, useLivePoll, type LiveRequestRow } from '../../utils/liveData';

export const LIVE_QUEUE_TRANSLATIONS: Record<
  LanguageCode,
  {
    sectionAria: string;
    heading: string;
    liveRows: string;
    apiOffline: string;
    refresh: string;
    colRef: string;
    colApplicant: string;
    colMlTriage: string;
    colStatus: string;
    colSlaRisk: string;
    colZone: string;
    showingPrefix: string;
    ofWord: string;
    rowsFullAt: string;
    emptyQueue: string;
    unreachablePrefix: string;
    updatedPrefix: string;
    autoRefreshNote: string;
    liveOnRefresh: string;
  }
> = {
  en: {
    sectionAria: 'Live request queue from VidyutFlow API',
    heading: 'Live Request Queue — VidyutFlow API',
    liveRows: 'rows',
    apiOffline: 'API offline',
    refresh: 'Refresh',
    colRef: 'Ref',
    colApplicant: 'Applicant',
    colMlTriage: 'ML Category / Severity',
    colStatus: 'Status',
    colSlaRisk: 'SLA Risk',
    colZone: 'Zone',
    showingPrefix: 'Showing 12 of',
    ofWord: 'live rows',
    rowsFullAt: 'full list at',
    emptyQueue: 'No live requests yet — submit one from the Consumer wizard.',
    unreachablePrefix: 'Live API unreachable',
    updatedPrefix: 'updated',
    autoRefreshNote: 'auto-refresh 45s',
    liveOnRefresh: 'live on refresh',
  },
  gu: {
    sectionAria: 'VidyutFlow API માંથી લાઇવ અરજી કતાર',
    heading: 'લાઇવ અરજી કતાર — VidyutFlow API',
    liveRows: 'અરજીઓ',
    apiOffline: 'API ઓફલાઇન',
    refresh: 'તાજું કરો',
    colRef: 'સંદર્ભ',
    colApplicant: 'અરજદાર',
    colMlTriage: 'ML શ્રેણી / ગંભીરતા',
    colStatus: 'સ્થિતિ',
    colSlaRisk: 'SLA જોખમ',
    colZone: 'ઝોન',
    showingPrefix: 'કુલ માંથી 12 દર્શાવેલ:',
    ofWord: 'લાઇવ અરજીઓ',
    rowsFullAt: 'સંપૂર્ણ યાદી:',
    emptyQueue: 'હજુ સુધી કોઈ લાઇવ અરજી નથી — ગ્રાહક પોર્ટલ પરથી અરજી સબમિટ કરો.',
    unreachablePrefix: 'લાઇવ API ઉપલબ્ધ નથી',
    updatedPrefix: 'અપડેટ સમય',
    autoRefreshNote: 'ઓટો-રિફ્રેશ 45 સે.',
    liveOnRefresh: 'રિફ્રેશ પર લાઇવ',
  },
  hi: {
    sectionAria: 'VidyutFlow API से लाइव आवेदन कतार',
    heading: 'लाइव आवेदन कतार — VidyutFlow API',
    liveRows: 'आवेदन',
    apiOffline: 'API ऑफ़लाइन',
    refresh: 'रीफ़्रेश करें',
    colRef: 'संदर्भ',
    colApplicant: 'आवेदक',
    colMlTriage: 'ML श्रेणी / गंभीरता',
    colStatus: 'स्थिति',
    colSlaRisk: 'SLA जोखिम',
    colZone: 'ज़ोन',
    showingPrefix: '12 प्रदर्शित, कुल:',
    ofWord: 'लाइव आवेदन',
    rowsFullAt: 'पूरी सूची:',
    emptyQueue: 'अभी कोई लाइव आवेदन नहीं — उपभोक्ता पोर्टल से नया आवेदन भेजें।',
    unreachablePrefix: 'लाइव API अनुपलब्ध',
    updatedPrefix: 'अद्यतन',
    autoRefreshNote: 'ऑटो-रीफ़्रेश 45 से.',
    liveOnRefresh: 'रीफ़्रेश पर लाइव',
  },
  mr: {
    sectionAria: 'VidyutFlow API मधून लाइव्ह अर्ज रांग',
    heading: 'लाइव्ह अर्ज रांग — VidyutFlow API',
    liveRows: 'अर्ज',
    apiOffline: 'API ऑफलाइन',
    refresh: 'रीफ्रेश करा',
    colRef: 'संदर्भ',
    colApplicant: 'अर्जदार',
    colMlTriage: 'ML श्रेणी / तीव्रता',
    colStatus: 'स्थिती',
    colSlaRisk: 'SLA जोखीम',
    colZone: 'झोन',
    showingPrefix: '12 दर्शविले, एकूण:',
    ofWord: 'लाइव्ह अर्ज',
    rowsFullAt: 'संपूर्ण यादी:',
    emptyQueue: 'अद्याप कोणतेही लाइव्ह अर्ज नाहीत — ग्राहक पोर्टलवरून अर्ज सादर करा.',
    unreachablePrefix: 'लाइव्ह API अनुपलब्ध',
    updatedPrefix: 'अपडेट वेळ',
    autoRefreshNote: 'ऑटो-रीफ्रेश 45 से.',
    liveOnRefresh: 'रीफ्रेशवर लाइव्ह',
  },
};

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
  const { language } = useLanguage();
  const t = LIVE_QUEUE_TRANSLATIONS[language] || LIVE_QUEUE_TRANSLATIONS.en;
  const { data, error, lastUpdated, refresh, loading } = useLivePoll<LiveRequestRow[]>(fetchLiveRequests);

  if (!data && !error) return null;

  return (
    <section
      aria-label={t.sectionAria}
      className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5 mb-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0 leading-snug">
          <ListChecks className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="break-words">{t.heading}</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {data && !error ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
              <Wifi className="w-3 h-3" aria-hidden="true" /> {data.length} {t.liveRows}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">
              <WifiOff className="w-3 h-3" aria-hidden="true" /> {t.apiOffline}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 min-h-8 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {t.refresh}
          </button>
        </div>
      </div>

      {data && data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 pr-3">{t.colRef}</th>
                <th className="py-2 pr-3">{t.colApplicant}</th>
                <th className="py-2 pr-3">{t.colMlTriage}</th>
                <th className="py-2 pr-3">{t.colStatus}</th>
                <th className="py-2 pr-3">{t.colSlaRisk}</th>
                <th className="py-2 pr-3">{t.colZone}</th>
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
                      <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        {r.sla_risk_reasons[0]}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{r.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 12 && (
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
              {t.showingPrefix} {data.length} {t.ofWord} · {t.rowsFullAt}{' '}
              <code className="font-mono">GET /api/requests</code>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {data ? t.emptyQueue : `${t.unreachablePrefix} (${error}).`}
        </p>
      )}
      {lastUpdated && (
        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          {t.updatedPrefix} {lastUpdated.toLocaleTimeString()} · {t.autoRefreshNote} ·{' '}
          <span className="font-semibold">{t.liveOnRefresh}</span>
        </p>
      )}
    </section>
  );
};
