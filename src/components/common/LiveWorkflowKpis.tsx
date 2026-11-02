/**
 * Live Workflow KPIs — wired to GET /api/requests/kpis/summary (FastAPI backend).
 * Renders only when a backend session exists; auto-polls every 45s ("live on refresh").
 * Fully localized in English, Gujarati, Hindi, and Marathi (Item #32).
 */
import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import { fetchLiveKpis, useLivePoll, type LiveKpiSummary } from '../../utils/liveData';

export const LIVE_KPIS_TRANSLATIONS: Record<
  LanguageCode,
  {
    sectionAria: string;
    heading: string;
    liveApi: string;
    apiOffline: string;
    refresh: string;
    totalRequests: string;
    pending: string;
    pendingSub: string;
    completed: string;
    highSlaRisk: string;
    highSlaRiskSub: string;
    needsCorrection: string;
    avgSlaRisk: string;
    watchPrefix: string;
    highPrefix: string;
    sourcePrefix: string;
    computedLive: string;
    updatedPrefix: string;
    autoRefreshNote: string;
    liveOnRefresh: string;
    streamingRoadmap: string;
    unreachablePrefix: string;
    unreachableSuffix: string;
  }
> = {
  en: {
    sectionAria: 'Live workflow KPIs from VidyutFlow API',
    heading: 'Live Workflow KPIs — VidyutFlow API',
    liveApi: 'Live API',
    apiOffline: 'API offline',
    refresh: 'Refresh',
    totalRequests: 'Total Requests',
    pending: 'Pending',
    pendingSub: 'open (excl. completed/rejected)',
    completed: 'Completed',
    highSlaRisk: 'High SLA Risk',
    highSlaRiskSub: 'open requests with risk ≥ 0.7',
    needsCorrection: 'Needs Correction',
    avgSlaRisk: 'Avg SLA Risk',
    watchPrefix: 'watch',
    highPrefix: 'high',
    sourcePrefix: 'Source:',
    computedLive: 'computed live from the workflow database',
    updatedPrefix: 'updated',
    autoRefreshNote: 'auto-refresh 45s',
    liveOnRefresh: 'live on refresh',
    streamingRoadmap: '(streaming is roadmap).',
    unreachablePrefix: 'Live API unreachable',
    unreachableSuffix: 'Panels below continue on demo workspace data.',
  },
  gu: {
    sectionAria: 'VidyutFlow API માંથી લાઇવ વર્કફ્લો KPIs',
    heading: 'લાઇવ વર્કફ્લો KPIs — VidyutFlow API',
    liveApi: 'લાઇવ API',
    apiOffline: 'API ઓફલાઇન',
    refresh: 'તાજું કરો',
    totalRequests: 'કુલ અરજીઓ',
    pending: 'બાકી',
    pendingSub: 'ખુલ્લી (પૂર્ણ/નામંજૂર સિવાય)',
    completed: 'પૂર્ણ થયેલ',
    highSlaRisk: 'ઉચ્ચ SLA જોખમ',
    highSlaRiskSub: 'જોખમ ≥ 0.7 વાળી ખુલ્લી અરજીઓ',
    needsCorrection: 'સુધારાની જરૂર',
    avgSlaRisk: 'સરેરાશ SLA જોખમ',
    watchPrefix: 'નિરીક્ષણ',
    highPrefix: 'ઉચ્ચ',
    sourcePrefix: 'સ્ત્રોત:',
    computedLive: 'વર્કફ્લો ડેટાબેઝમાંથી લાઇવ ગણતરી',
    updatedPrefix: 'અપડેટ સમય',
    autoRefreshNote: 'ઓટો-રિફ્રેશ 45 સે.',
    liveOnRefresh: 'રિફ્રેશ પર લાઇવ',
    streamingRoadmap: '(સ્ટ્રીમિંગ રોડમેપ છે).',
    unreachablePrefix: 'લાઇવ API ઉપલબ્ધ નથી',
    unreachableSuffix: 'નીચેની પેનલ્સ ડેમો ડેટા પર ચાલુ રહે છે.',
  },
  hi: {
    sectionAria: 'VidyutFlow API से लाइव वर्कफ़्लो KPIs',
    heading: 'लाइव वर्कफ़्लो KPIs — VidyutFlow API',
    liveApi: 'लाइव API',
    apiOffline: 'API ऑफ़लाइन',
    refresh: 'रीफ़्रेश करें',
    totalRequests: 'कुल आवेदन',
    pending: 'लंबित',
    pendingSub: 'खुले (पूर्ण/अस्वीकृत को छोड़कर)',
    completed: 'पूर्ण',
    highSlaRisk: 'उच्च SLA जोखिम',
    highSlaRiskSub: 'जोखिम ≥ 0.7 वाले खुले आवेदन',
    needsCorrection: 'सुधार आवश्यक',
    avgSlaRisk: 'औसत SLA जोखिम',
    watchPrefix: 'निगरानी',
    highPrefix: 'उच्च',
    sourcePrefix: 'स्रोत:',
    computedLive: 'वर्कफ़्लो डेटाबेस से लाइव गणना',
    updatedPrefix: 'अद्यतन',
    autoRefreshNote: 'ऑटो-रीफ़्रेश 45 से.',
    liveOnRefresh: 'रीफ़्रेश पर लाइव',
    streamingRoadmap: '(स्ट्रीमिंग रोडमैप है)।',
    unreachablePrefix: 'लाइव API अनुपलब्ध',
    unreachableSuffix: 'नीचे के पैनल डेमो डेटा पर जारी हैं।',
  },
  mr: {
    sectionAria: 'VidyutFlow API मधून लाइव्ह वर्कफ्लो KPIs',
    heading: 'लाइव्ह वर्कफ्लो KPIs — VidyutFlow API',
    liveApi: 'लाइव्ह API',
    apiOffline: 'API ऑफलाइन',
    refresh: 'रीफ्रेश करा',
    totalRequests: 'एकूण अर्ज',
    pending: 'प्रलंबित',
    pendingSub: 'खुले (पूर्ण/नाकारलेले वगळून)',
    completed: 'पूर्ण झालेले',
    highSlaRisk: 'उच्च SLA जोखीम',
    highSlaRiskSub: 'जोखीम ≥ 0.7 असलेले खुले अर्ज',
    needsCorrection: 'दुरुस्ती आवश्यक',
    avgSlaRisk: 'सरासरी SLA जोखीम',
    watchPrefix: 'निरीक्षण',
    highPrefix: 'उच्च',
    sourcePrefix: 'स्रोत:',
    computedLive: 'वर्कफ्लो डेटाबेसमधून लाइव्ह गणना',
    updatedPrefix: 'अपडेट वेळ',
    autoRefreshNote: 'ऑटो-रीफ्रेश 45 से.',
    liveOnRefresh: 'रीफ्रेशवर लाइव्ह',
    streamingRoadmap: '(स्ट्रीमिंग रोडमॅप आहे).',
    unreachablePrefix: 'लाइव्ह API अनुपलब्ध',
    unreachableSuffix: 'खालील पॅनेल डेमो डेटावर सुरू आहेत.',
  },
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

const Tile: React.FC<{ label: string; value: string; tone?: string; sub?: string; icon: React.ReactNode }> = ({
  label,
  value,
  tone = 'text-slate-900 dark:text-white',
  sub,
  icon
}) => (
  <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs min-w-0">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1 leading-snug break-words">
      {label}
    </span>
    <div className="flex items-baseline gap-2">
      <span className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</span>
      <span className="text-slate-400 shrink-0" aria-hidden="true">
        {icon}
      </span>
    </div>
    {sub && <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed break-words">{sub}</span>}
  </div>
);

export const LiveWorkflowKpis: React.FC = () => {
  const { language } = useLanguage();
  const t = LIVE_KPIS_TRANSLATIONS[language] || LIVE_KPIS_TRANSLATIONS.en;
  const { data, error, lastUpdated, refresh, loading } = useLivePoll<LiveKpiSummary>(fetchLiveKpis);

  if (!data && !error) return null;

  const live = Boolean(data) && !error;

  return (
    <section
      aria-label={t.sectionAria}
      className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0 leading-snug">
          <Zap className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="break-words">{t.heading}</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {live ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
              <Wifi className="w-3 h-3" aria-hidden="true" /> {t.liveApi}
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

      {data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Tile label={t.totalRequests} value={String(data.total_requests)} icon={<Activity className="w-4 h-4" />} />
            <Tile
              label={t.pending}
              value={String(data.pending)}
              tone="text-amber-600"
              icon={<Clock className="w-4 h-4" />}
              sub={t.pendingSub}
            />
            <Tile
              label={t.completed}
              value={String(data.completed)}
              tone="text-emerald-600"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <Tile
              label={t.highSlaRisk}
              value={String(data.high_sla_risk)}
              tone="text-rose-600"
              icon={<AlertTriangle className="w-4 h-4" />}
              sub={t.highSlaRiskSub}
            />
            <Tile
              label={t.needsCorrection}
              value={String(data.needs_correction)}
              tone="text-orange-600"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <Tile
              label={t.avgSlaRisk}
              value={pct(data.avg_sla_risk)}
              icon={<Activity className="w-4 h-4" />}
              sub={`${t.watchPrefix} ${data.risk_buckets?.['watch_0.4-0.7'] ?? 0} · ${t.highPrefix} ${data.risk_buckets?.['high_>=0.7'] ?? 0}`}
            />
          </div>
          <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.sourcePrefix} <code className="font-mono">GET /api/requests/kpis/summary</code> · {t.computedLive}
            {lastUpdated && (
              <>
                {' '}· {t.updatedPrefix} {lastUpdated.toLocaleTimeString()} · {t.autoRefreshNote}
              </>
            )}{' '}
            · <span className="font-semibold">{t.liveOnRefresh}</span> {t.streamingRoadmap}
          </p>
        </>
      ) : (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          {t.unreachablePrefix} ({error}). {t.unreachableSuffix}
        </p>
      )}
    </section>
  );
};
