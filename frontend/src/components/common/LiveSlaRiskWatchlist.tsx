/**
 * Live SLA-Risk Watchlist — reads GET /api/requests and shows open requests sorted by
 * Logistic Regression SLA-breach probability with human-readable reasons.
 * Fully localized in English, Gujarati, Hindi, and Marathi (Item #32).
 */
import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import { fetchLiveRequests, useLivePoll, type LiveRequestRow } from '../../utils/liveData';

export const LIVE_WATCHLIST_TRANSLATIONS: Record<
  LanguageCode,
  {
    sectionAria: string;
    heading: string;
    atRiskSuffix: string;
    apiOffline: string;
    refresh: string;
    reasonsPrefix: string;
    noMajorFactors: string;
    emptyAtRisk: string;
    unreachablePrefix: string;
    modelProvenance: string;
    triageNote: string;
    officerDecides: string;
    updatedPrefix: string;
  }
> = {
  en: {
    sectionAria: 'Live SLA-risk watchlist from the ML models',
    heading: 'SLA-Risk Watchlist — live model output (synthetic-trained)',
    atRiskSuffix: 'at risk',
    apiOffline: 'API offline',
    refresh: 'Refresh',
    reasonsPrefix: 'Reasons:',
    noMajorFactors: 'no major risk factors',
    emptyAtRisk: 'No open requests with model risk ≥ 0.4 right now.',
    unreachablePrefix: 'Live API unreachable',
    modelProvenance: 'Model: Logistic Regression over synthetic data · risk is a',
    triageNote: 'triage probability, not a verdict',
    officerDecides: '— act on the reasons; the officer decides.',
    updatedPrefix: 'updated',
  },
  gu: {
    sectionAria: 'ML મોડેલ્સમાંથી લાઇવ SLA-જોખમ વોચલિસ્ટ',
    heading: 'SLA-જોખમ વોચલિસ્ટ — લાઇવ મોડેલ આઉટપુટ (સિન્થેટિક તાલીમ)',
    atRiskSuffix: 'જોખમમાં',
    apiOffline: 'API ઓફલાઇન',
    refresh: 'તાજું કરો',
    reasonsPrefix: 'કારણો:',
    noMajorFactors: 'કોઈ મુખ્ય જોખમ પરિબળ નથી',
    emptyAtRisk: 'હાલમાં મોડેલ જોખમ ≥ 0.4 વાળી કોઈ ખુલ્લી અરજી નથી.',
    unreachablePrefix: 'લાઇવ API ઉપલબ્ધ નથી',
    modelProvenance: 'મોડેલ: સિન્થેટિક ડેટા પર લોજિસ્ટિક રિગ્રેશન · જોખમ એક',
    triageNote: 'ટ્રાયેજ સંભાવના છે, અંતિમ ચુકાદો નથી',
    officerDecides: '— કારણો તપાસો; અંતિમ નિર્ણય અધિકારીનો છે.',
    updatedPrefix: 'અપડેટ સમય',
  },
  hi: {
    sectionAria: 'ML मॉडलों से लाइव SLA-जोखिम वॉचलिस्ट',
    heading: 'SLA-जोखिम वॉचलिस्ट — लाइव मॉडल आउटपुट (सिंथेटिक प्रशिक्षित)',
    atRiskSuffix: 'जोखिम में',
    apiOffline: 'API ऑफ़लाइन',
    refresh: 'रीफ़्रेश करें',
    reasonsPrefix: 'कारण:',
    noMajorFactors: 'कोई प्रमुख जोखिम कारक नहीं',
    emptyAtRisk: 'अभी मॉडल जोखिम ≥ 0.4 वाला कोई खुला आवेदन नहीं है।',
    unreachablePrefix: 'लाइव API अनुपलब्ध',
    modelProvenance: 'मॉडल: सिंथेटिक डेटा पर लॉजिस्टिक रिग्रेशन · जोखिम एक',
    triageNote: 'ट्रायेज संभावना है, अंतिम निर्णय नहीं',
    officerDecides: '— कारणों पर कार्रवाई करें; अंतिम निर्णय अधिकारी का है।',
    updatedPrefix: 'अद्यतन',
  },
  mr: {
    sectionAria: 'ML मॉडेल्समधून लाइव्ह SLA-जोखीम वॉचलिस्ट',
    heading: 'SLA-जोखीम वॉचलिस्ट — लाइव्ह मॉडेल आउटपुट (सिंथेटिक प्रशिक्षित)',
    atRiskSuffix: 'धोक्यात',
    apiOffline: 'API ऑफलाइन',
    refresh: 'रीफ्रेश करा',
    reasonsPrefix: 'कारणे:',
    noMajorFactors: 'कोणतेही मोठे जोखीम घटक नाहीत',
    emptyAtRisk: 'सध्या मॉडेल जोखीम ≥ 0.4 असलेला कोणताही खुला अर्ज नाही.',
    unreachablePrefix: 'लाइव्ह API अनुपलब्ध',
    modelProvenance: 'मॉडेल: सिंथेटिक डेटावर लॉजिस्टिक रिग्रेशन · जोखीम ही',
    triageNote: 'प्राधान्य संभाव्यता आहे, अंतिम निर्णय नाही',
    officerDecides: '— कारणांवर कृती करा; अंतिम निर्णय अधिकाऱ्याचा असतो.',
    updatedPrefix: 'अपडेट वेळ',
  },
};

export const LiveSlaRiskWatchlist: React.FC = () => {
  const { language } = useLanguage();
  const t = LIVE_WATCHLIST_TRANSLATIONS[language] || LIVE_WATCHLIST_TRANSLATIONS.en;
  const { data, error, lastUpdated, refresh, loading } = useLivePoll<LiveRequestRow[]>(fetchLiveRequests);
  if (!data && !error) return null;

  const atRisk = (data ?? [])
    .filter(r => !['COMPLETED', 'REJECTED'].includes(r.status) && r.sla_breach_risk >= 0.4)
    .sort((a, b) => b.sla_breach_risk - a.sla_breach_risk)
    .slice(0, 8);

  return (
    <section
      aria-label={t.sectionAria}
      className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0 leading-snug">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
          <span className="break-words">{t.heading}</span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {data && !error ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-600 text-white">
              <Wifi className="w-3 h-3" aria-hidden="true" /> {atRisk.length} {t.atRiskSuffix}
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

      {atRisk.length > 0 ? (
        <ul className="space-y-2">
          {atRisk.map(r => (
            <li
              key={r.id}
              className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3 rounded-lg bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800"
            >
              <AlertTriangle
                aria-hidden="true"
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
                  {t.reasonsPrefix}{' '}
                  {Array.isArray(r.sla_risk_reasons) && r.sla_risk_reasons.length
                    ? r.sla_risk_reasons.join(' · ')
                    : t.noMajorFactors}
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
          {data ? t.emptyAtRisk : `${t.unreachablePrefix} (${error}).`}
        </p>
      )}
      <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
        {t.modelProvenance} <span className="font-semibold">{t.triageNote}</span> {t.officerDecides}
        {lastUpdated && (
          <>
            {' '}· {t.updatedPrefix} {lastUpdated.toLocaleTimeString()}
          </>
        )}
      </p>
    </section>
  );
};
