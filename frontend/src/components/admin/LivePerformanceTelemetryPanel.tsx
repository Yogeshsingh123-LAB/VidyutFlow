import React, { useCallback } from 'react';
import { Activity, Database, Gauge, RefreshCw, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import {
  SystemPerformanceResponse,
  fetchSystemPerformance,
  useLivePoll,
} from '../../utils/liveData';

export const PERFORMANCE_TELEMETRY_TRANSLATIONS: Record<
  LanguageCode,
  {
    title: string;
    subtitle: string;
    disclosure: string;
    refreshBtn: string;
    p50Label: string;
    p95Label: string;
    kpiCacheHitLabel: string;
    indexesLabel: string;
    routeTableTitle: string;
    colRoute: string;
    colSamples: string;
    colP50: string;
    colP95: string;
    sandboxNote: string;
  }
> = {
  en: {
    title: 'Live API Latency, TTL Cache & DB Index Telemetry',
    subtitle:
      'Rolling in-process HTTP percentiles, epoch-invalidated KPI cache hit ratio, and verified composite SQL indexes.',
    disclosure:
      'Process-local telemetry only — never claim loopback/demo latency numbers as a UGVCL production benchmark.',
    refreshBtn: 'Refresh Telemetry',
    p50Label: 'Rolling p50 Latency',
    p95Label: 'Rolling p95 Latency',
    kpiCacheHitLabel: 'KPI Cache Hit Rate',
    indexesLabel: 'Composite DB Indexes',
    routeTableTitle: 'Per-Route Rolling Latency Window',
    colRoute: 'Endpoint',
    colSamples: 'Samples',
    colP50: 'p50 (ms)',
    colP95: 'p95 (ms)',
    sandboxNote: 'Frontend sandbox mode — connect FastAPI backend for live rolling HTTP latency samples.',
  },
  gu: {
    title: 'લાઈવ API લેટન્સી, TTL કેશ અને DB ઇન્ડેક્સ ટેલિમેટ્રી',
    subtitle:
      'રોલિંગ HTTP પર્સેન્ટાઇલ્સ, ઇપોક-આધારિત KPI કેશ હિટ દર અને ચકાસાયેલ કમ્પોઝિટ SQL ઇન્ડેક્સ.',
    disclosure:
      'ફક્ત પ્રોસેસ-લોકલ ટેલિમેટ્રી — લૂપબેક/ડેમો લેટન્સી આંકડાને ક્યારેય UGVCL પ્રોડક્શન બેન્ચમાર્ક તરીકે રજૂ ન કરો.',
    refreshBtn: 'ટેલિમેટ્રી રિફ્રેશ કરો',
    p50Label: 'રોલિંગ p50 લેટન્સી',
    p95Label: 'રોલિંગ p95 લેટન્સી',
    kpiCacheHitLabel: 'KPI કેશ હિટ દર',
    indexesLabel: 'કમ્પોઝિટ DB ઇન્ડેક્સ',
    routeTableTitle: 'રૂટ મુજબ રોલિંગ લેટન્સી વિન્ડો',
    colRoute: 'એન્ડપોઇન્ટ',
    colSamples: 'નમૂનાઓ',
    colP50: 'p50 (ms)',
    colP95: 'p95 (ms)',
    sandboxNote: 'ફ્રન્ટએન્ડ સેન્ડબોક્સ મોડ — લાઈવ HTTP લેટન્સી માટે FastAPI બેકએન્ડ જોડો.',
  },
  hi: {
    title: 'लाइव API लेटेंसी, TTL कैश और DB इंडेक्स टेलीमेट्री',
    subtitle:
      'रोलिंग HTTP परसेंटाइल, एपॉक-इनवैलिडेटेड KPI कैश हिट अनुपात और सत्यापित कम्पोज़िट SQL इंडेक्स।',
    disclosure:
      'केवल प्रोसेस-लोकल टेलीमेट्री — लूपबैक/डेमो लेटेंसी आँकड़ों को कभी भी UGVCL प्रोडक्शन बेंचमार्क न बताएँ।',
    refreshBtn: 'टेलीमेट्री रीफ़्रेश करें',
    p50Label: 'रोलिंग p50 लेटेंसी',
    p95Label: 'रोलिंग p95 लेटेंसी',
    kpiCacheHitLabel: 'KPI कैश हिट दर',
    indexesLabel: 'कम्पोज़िट DB इंडेक्स',
    routeTableTitle: 'रूट-वार रोलिंग लेटेंसी विंडो',
    colRoute: 'एंडपॉइंट',
    colSamples: 'नमूने',
    colP50: 'p50 (ms)',
    colP95: 'p95 (ms)',
    sandboxNote: 'फ़्रंटएंड सैंडबॉक्स मोड — लाइव HTTP लेटेंसी हेतु FastAPI बैकएंड जोड़ें।',
  },
  mr: {
    title: 'लाइव्ह API लेटन्सी, TTL कॅश आणि DB इंडेक्स टेलिमेट्री',
    subtitle:
      'रोलिंग HTTP पर्सेंटाइल्स, इपॉक-आधारित KPI कॅश हिट दर आणि पडताळलेले कॉम्पोजिट SQL इंडेक्स.',
    disclosure:
      'केवळ प्रोसेस-लोकल टेलिमेट्री — लूपबॅक/डेमो लेटन्सी आकडे कधीही UGVCL प्रोडक्शन बेंचमार्क म्हणून सांगू नका.',
    refreshBtn: 'टेलिमेट्री रिफ्रेश करा',
    p50Label: 'रोलिंग p50 लेटन्सी',
    p95Label: 'रोलिंग p95 लेटन्सी',
    kpiCacheHitLabel: 'KPI कॅश हिट दर',
    indexesLabel: 'कॉम्पोजिट DB इंडेक्स',
    routeTableTitle: 'रूटनुसार रोलिंग लेटन्सी विंडो',
    colRoute: 'एंडपॉइंट',
    colSamples: 'नमुने',
    colP50: 'p50 (ms)',
    colP95: 'p95 (ms)',
    sandboxNote: 'फ्रंटएंड सँडबॉक्स मोड — लाइव्ह HTTP लेटन्सीसाठी FastAPI बॅकएंड जोडा.',
  },
};

export const LivePerformanceTelemetryPanel: React.FC = () => {
  const { language } = useLanguage();
  const t =
    PERFORMANCE_TELEMETRY_TRANSLATIONS[language] || PERFORMANCE_TELEMETRY_TRANSLATIONS.en;

  const fetcher = useCallback(() => fetchSystemPerformance(), []);
  const { data, loading, refresh } = useLivePoll<SystemPerformanceResponse>(fetcher, 45000);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {t.title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t.refreshBtn}
        </button>
      </div>

      <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
        {data?.disclosure || t.disclosure}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                {t.p50Label}
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {data.latency.p50_ms.toFixed(1)} ms
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                {t.p95Label}
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {data.latency.p95_ms.toFixed(1)} ms
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {t.kpiCacheHitLabel}
              </div>
              <div className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200 tabular-nums mt-0.5">
                {data.caches.kpi_summary.hit_rate_pct}% ({data.caches.kpi_summary.hits}H /{' '}
                {data.caches.kpi_summary.misses}M)
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/50">
              <div className="text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" />
                {t.indexesLabel}
              </div>
              <div className="text-lg font-extrabold text-blue-800 dark:text-blue-200 tabular-nums mt-0.5">
                {data.indexes.present} / {data.indexes.expected}
              </div>
            </div>
          </div>

          {data.latency.per_route.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 px-3 font-semibold">{t.colRoute}</th>
                    <th className="py-2 px-3 font-semibold">{t.colSamples}</th>
                    <th className="py-2 px-3 font-semibold">{t.colP50}</th>
                    <th className="py-2 px-3 font-semibold">{t.colP95}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {data.latency.per_route.slice(0, 6).map(r => (
                    <tr key={r.route}>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {r.route}
                      </td>
                      <td className="py-2 px-3 tabular-nums">{r.count}</td>
                      <td className="py-2 px-3 tabular-nums">{r.p50_ms.toFixed(1)}</td>
                      <td className="py-2 px-3 tabular-nums font-semibold">{r.p95_ms.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          {t.sandboxNote}
        </div>
      )}
    </div>
  );
};
