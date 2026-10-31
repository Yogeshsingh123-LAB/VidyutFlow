import React, { useCallback } from 'react';
import { Bot, CheckCircle2, RefreshCw, Scale, ShieldCheck, UserCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import { AiGovernanceResponse, fetchAiGovernance, useLivePoll } from '../../utils/liveData';

export const AI_GOVERNANCE_TRANSLATIONS: Record<
  LanguageCode,
  {
    title: string;
    subtitle: string;
    versionBadge: string;
    advisoryBadge: string;
    syntheticBadge: string;
    disclosure: string;
    refreshBtn: string;
    kpiAiAuto: string;
    kpiHumanDecisions: string;
    kpiExplainability: string;
    kpiInferences: string;
    registryTitle: string;
    colModelId: string;
    colTask: string;
    colAccuracy: string;
    colBaseline: string;
    colDataset: string;
    driftTitle: string;
    retrainingGateLabel: string;
  }
> = {
  en: {
    title: 'AI Governance, Model Monitoring & Human-Approval Audit',
    subtitle:
      'Versioned /v1 contract tracking model registry cards, runtime inference & OOD drift monitors, and human-in-the-loop sanction enforcement.',
    versionBadge: 'API Contract v1 (/v1/*)',
    advisoryBadge: 'HUMANS APPROVE · AI ADVISORY ONLY',
    syntheticBadge: 'SYNTHETIC TRAINING CORPUS',
    disclosure:
      'Models triage, prioritize, and explain SLA risk on synthetic training data only — every sanction approval or rejection requires an authenticated human officer.',
    refreshBtn: 'Refresh Governance',
    kpiAiAuto: 'AI Auto-Approvals',
    kpiHumanDecisions: 'Human Officer Decisions',
    kpiExplainability: 'Scores With Reasons',
    kpiInferences: 'Runtime ML Inferences',
    registryTitle: 'Versioned Model Registry & Held-Out Synthetic Evaluation',
    colModelId: 'Model Version ID',
    colTask: 'Decision-Support Task',
    colAccuracy: 'Held-Out Acc.',
    colBaseline: 'Majority Baseline',
    colDataset: 'Dataset Provenance',
    driftTitle: 'Live Prediction Distribution & Drift Guardrails',
    retrainingGateLabel: 'Pilot Real-Data Promotion Gate:',
  },
  gu: {
    title: 'AI ગવર્નન્સ, મોડેલ મોનિટરિંગ અને માનવ-મંજૂરી ઓડિટ',
    subtitle:
      'વર્ઝન્ડ /v1 કોન્ટ્રાક્ટ જે મોડેલ રજિસ્ટ્રી કાર્ડ્સ, રનટાઇમ ઇન્ફરન્સ/ડ્રિફ્ટ અને માનવ-મંજૂરી નિયમો ટ્રેક કરે છે.',
    versionBadge: 'API કોન્ટ્રાક્ટ v1 (/v1/*)',
    advisoryBadge: 'માનવ મંજૂરી ફરજિયાત · AI ફક્ત સલાહકાર',
    syntheticBadge: 'સિન્થેટિક તાલીમ ડેટા',
    disclosure:
      'મોડેલ્સ ફક્ત સિન્થેટિક ડેટા પર SLA જોખમ સમજાવે છે — દરેક મંજૂરી કે નામંજૂરી માટે અધિકૃત માનવ અધિકારી જરૂરી છે.',
    refreshBtn: 'ગવર્નન્સ રિફ્રેશ કરો',
    kpiAiAuto: 'AI ઓટો-મંજૂરીઓ',
    kpiHumanDecisions: 'માનવ અધિકારી નિર્ણયો',
    kpiExplainability: 'કારણો સાથેના સ્કોર્સ',
    kpiInferences: 'રનટાઇમ ML ઇન્ફરન્સ',
    registryTitle: 'વર્ઝન્ડ મોડેલ રજિસ્ટ્રી અને સિન્થેટિક મૂલ્યાંકન',
    colModelId: 'મોડેલ વર્ઝન ID',
    colTask: 'નિર્ણય-સહાય કાર્ય',
    colAccuracy: 'હેલ્ડ-આઉટ ચોકસાઈ',
    colBaseline: 'મેજોરિટી બેઝલાઇન',
    colDataset: 'ડેટાસેટ સ્ત્રોત',
    driftTitle: 'લાઈવ પ્રિડિક્શન વિતરણ અને ડ્રિફ્ટ ગાર્ડરેલ્સ',
    retrainingGateLabel: 'પાયલટ રિયલ-ડેટા પ્રમોશન ગેટ:',
  },
  hi: {
    title: 'AI गवर्नेंस, मॉडल मॉनिटरिंग व मानव-स्वीकृति ऑडिट',
    subtitle:
      'वर्ज़न्ड /v1 अनुबंध जो मॉडल रजिस्ट्री कार्ड, रनटाइम इन्फ़रेंस/ड्रिफ़्ट और मानव-इन-द-लूप स्वीकृति नियमों की निगरानी करता है।',
    versionBadge: 'API अनुबंध v1 (/v1/*)',
    advisoryBadge: 'मानव स्वीकृति अनिवार्य · AI केवल सलाहकार',
    syntheticBadge: 'सिंथेटिक प्रशिक्षण डेटा',
    disclosure:
      'मॉडल केवल सिंथेटिक डेटा पर SLA जोखिम समझाते हैं — प्रत्येक स्वीकृति या अस्वीकृति के लिए प्रमाणित मानव अधिकारी आवश्यक है।',
    refreshBtn: 'गवर्नेंस रीफ़्रेश करें',
    kpiAiAuto: 'AI स्वतः-स्वीकृतियाँ',
    kpiHumanDecisions: 'मानव अधिकारी निर्णय',
    kpiExplainability: 'कारण-सहित स्कोर',
    kpiInferences: 'रनटाइम ML इन्फ़रेंस',
    registryTitle: 'वर्ज़न्ड मॉडल रजिस्ट्री व हेल्ड-आउट सिंथेटिक मूल्यांकन',
    colModelId: 'मॉडल वर्ज़न ID',
    colTask: 'निर्णय-सहायता कार्य',
    colAccuracy: 'हेल्ड-आउट सटीकता',
    colBaseline: 'मेजॉरिटी बेसलाइन',
    colDataset: 'डेटासेट स्रोत',
    driftTitle: 'लाइव पूर्वानुमान वितरण व ड्रिफ़्ट गार्डरेल्स',
    retrainingGateLabel: 'पायलट रियल-डेटा प्रमोशन गेट:',
  },
  mr: {
    title: 'AI गव्हर्नन्स, मॉडेल मॉनिटरिंग आणि मानवी-मंजुरी ऑडिट',
    subtitle:
      'व्हर्जन्ड /v1 करार जो मॉडेल रजिस्ट्री कार्ड्स, रनटाइम इन्फरन्स/ड्रिफ्ट आणि मानवी मंजुरी नियमांचे निरीक्षण करतो.',
    versionBadge: 'API करार v1 (/v1/*)',
    advisoryBadge: 'मानवी मंजुरी अनिवार्य · AI केवळ सल्लागार',
    syntheticBadge: 'सिंथेटिक प्रशिक्षण डेटा',
    disclosure:
      'मॉडेल्स केवळ सिंथेटिक डेटावर SLA जोखीम स्पष्ट करतात — प्रत्येक मंजुरी किंवा नकारासाठी अधिकृत मानवी अधिकारी आवश्यक आहे.',
    refreshBtn: 'गव्हर्नन्स रिफ्रेश करा',
    kpiAiAuto: 'AI स्वयं-मंजुरी',
    kpiHumanDecisions: 'मानवी अधिकारी निर्णय',
    kpiExplainability: 'कारणांसह स्कोअर',
    kpiInferences: 'रनटाइम ML इन्फरन्स',
    registryTitle: 'व्हर्जन्ड मॉडेल रजिस्ट्री आणि हेल्ड-आउट सिंथेटिक मूल्यमापन',
    colModelId: 'मॉडेल व्हर्जन ID',
    colTask: 'निर्णय-सहाय्य कार्य',
    colAccuracy: 'हेल्ड-आउट अचूकता',
    colBaseline: 'मेजॉरिटी बेसलाइन',
    colDataset: 'डेटासेट स्रोत',
    driftTitle: 'लाइव्ह अंदाज वितरण आणि ड्रिफ्ट गार्डरेल्स',
    retrainingGateLabel: 'पायलट रिअल-डेटा प्रमोशन गेट:',
  },
};

const FALLBACK_AI_GOVERNANCE: AiGovernanceResponse = {
  api_version: 'v1',
  supported_version_prefixes: ['/', '/v1'],
  disclosure:
    'All ML models are trained on SYNTHETIC demo data only. Models are strictly advisory; every sanction decision requires a human officer.',
  advisory_governance: {
    ai_mode: 'ADVISORY_DECISION_SUPPORT_ONLY',
    models_can_approve_or_reject: false,
    ai_auto_approvals_or_rejections: 0,
    verified_human_officer_decisions: 4,
    unexplained_risk_scores: 0,
    every_score_has_reasons: true,
    training_data_provenance: 'SYNTHETIC_ONLY',
    real_ugvcl_retraining_gate:
      'Requires anonymized UGVCL historical sanction logs + officer sign-off before pilot promotion',
  },
  model_registry: [
    {
      model_id: 'vidyutflow-category-tfidf-v1.1',
      task: 'Request Category Triage',
      algorithm: 'TF-IDF + LogisticRegression + Deterministic Safety Escalation',
      dataset: 'Synthetic unseen-template holdout',
      held_out_accuracy: 0.8824,
      majority_baseline: 0.1667,
      test_samples: 102,
    },
    {
      model_id: 'vidyutflow-severity-tfidf-v1.1',
      task: 'Severity & Safety Escalation (100% CRITICAL Recall)',
      algorithm: 'Balanced TF-IDF + LogisticRegression + Safety Keyword Guardrail',
      dataset: 'Synthetic unseen-template holdout',
      held_out_accuracy: 0.8333,
      majority_baseline: 0.3333,
      test_samples: 102,
    },
    {
      model_id: 'vidyutflow-sla-rf-v1.1',
      task: 'Calibrated SLA Breach Triage (89.1% Breach Recall)',
      algorithm: 'OneHot + Cost-Sensitive RandomForest (threshold=0.38, OOD load-capped)',
      dataset: 'Synthetic workload holdout',
      held_out_accuracy: 0.835,
      roc_auc: 0.8913,
      majority_baseline: 0.54,
      test_samples: 200,
    },
  ],
  monitoring: {
    scoped_total_requests: 6,
    open_queue_distribution: {
      low_lt_0_4: 3,
      watch_0_4_to_0_7: 2,
      high_gte_0_7: 1,
      high_risk_share_pct: 16.7,
    },
    runtime_counters: {
      classification_inferences: 12,
      sla_risk_inferences: 12,
      safety_deterministic_overrides: 2,
      ood_capped_load_inputs: 0,
      runtime_category_counts: { NEW_CONNECTION: 5, SAFETY: 1 },
    },
    monitoring_alerts: ['Prediction distribution within expected synthetic baseline envelope.'],
  },
};

export const LiveAiGovernancePanel: React.FC = () => {
  const { language } = useLanguage();
  const t = AI_GOVERNANCE_TRANSLATIONS[language] || AI_GOVERNANCE_TRANSLATIONS.en;

  const fetcher = useCallback(() => fetchAiGovernance(), []);
  const { data: liveData, loading, refresh } = useLivePoll<AiGovernanceResponse>(fetcher, 45000);
  const gov = liveData || FALLBACK_AI_GOVERNANCE;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {t.title}
            </h3>
            <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 text-[10px] font-mono font-bold">
              {t.versionBadge}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
              {t.advisoryBadge}
            </span>
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
        {t.disclosure}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50">
          <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t.kpiAiAuto}
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
            {gov.advisory_governance.ai_auto_approvals_or_rejections}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            {t.kpiHumanDecisions}
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {gov.advisory_governance.verified_human_officer_decisions}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
            {t.kpiExplainability}
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {gov.advisory_governance.every_score_has_reasons ? '100%' : 'WARN'}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            {t.kpiInferences}
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {gov.monitoring.runtime_counters.classification_inferences +
              gov.monitoring.runtime_counters.sla_risk_inferences}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {t.registryTitle}
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
            {t.syntheticBadge}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 px-3 font-semibold">{t.colModelId}</th>
                <th className="py-2 px-3 font-semibold">{t.colTask}</th>
                <th className="py-2 px-3 font-semibold">{t.colAccuracy}</th>
                <th className="py-2 px-3 font-semibold">{t.colBaseline}</th>
                <th className="py-2 px-3 font-semibold">{t.colDataset}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {gov.model_registry.map(m => (
                <tr key={m.model_id}>
                  <td className="py-2 px-3 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    {m.model_id}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{m.task}</td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {m.held_out_accuracy !== null ? m.held_out_accuracy.toFixed(3) : '—'}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-500 tabular-nums">
                    {m.majority_baseline !== null ? m.majority_baseline.toFixed(3) : '—'}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">{m.dataset}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="font-bold text-slate-800 dark:text-slate-200">{t.driftTitle}</div>
        {gov.monitoring.monitoring_alerts.map((alertMsg, idx) => (
          <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-300">
            • {alertMsg}
          </div>
        ))}
        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/70 dark:border-slate-800">
          <strong>{t.retrainingGateLabel}</strong> {gov.advisory_governance.real_ugvcl_retraining_gate}
        </div>
      </div>
    </div>
  );
};
