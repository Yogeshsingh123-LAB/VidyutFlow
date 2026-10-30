import React, { useCallback, useState } from 'react';
import { BellRing, Mail, MessageSquare, Play, RefreshCw, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import {
  AlertDispatchItem,
  evaluateLiveAlerts,
  fetchAlertDispatches,
  useLivePoll,
} from '../../utils/liveData';

export interface AlertEngineUiStrings {
  title: string;
  subtitle: string;
  simulatedBadge: string;
  disclosure: string;
  btnRunSweep: string;
  btnRunningSweep: string;
  filterAll: string;
  filterSms: string;
  filterEmail: string;
  filterInApp: string;
  ruleSlaRisk: string;
  ruleUnassigned: string;
  ruleZoneFailures: string;
  colRuleZone: string;
  colChannel: string;
  colRecipient: string;
  colPayload: string;
  colTimestamp: string;
  emptyState: string;
}

export const ALERT_ENGINE_TRANSLATIONS: Record<LanguageCode, AlertEngineUiStrings> = {
  en: {
    title: 'Operational Alert Engine — Simulated SMS / Email & Audit Trail',
    subtitle: 'Rule-based detection for SLA breach risk, unassigned > 4h requests, and repeated zone failures',
    simulatedBadge: 'Simulated SMS & SMTP Outbox',
    disclosure:
      'Honesty Disclosure: Alert dispatches are formatted, stored in alert_dispatches, delivered to the in-app Alert Centre, and hash-chained into audit_logs. No external telecom SMS or SMTP server is contacted.',
    btnRunSweep: 'Run Alert Rule Sweep',
    btnRunningSweep: 'Evaluating Rules...',
    filterAll: 'All Channels',
    filterSms: 'Simulated SMS',
    filterEmail: 'Simulated Email',
    filterInApp: 'In-App Centre',
    ruleSlaRisk: 'SLA Breach Risk',
    ruleUnassigned: 'Unassigned > 4h',
    ruleZoneFailures: 'Repeated Zone Failures',
    colRuleZone: 'Trigger Rule & Zone',
    colChannel: 'Channel',
    colRecipient: 'Recipient (Masked)',
    colPayload: 'Formatted Alert Message',
    colTimestamp: 'Logged At',
    emptyState: 'No alert dispatches match the selected channel filter.',
  },
  gu: {
    title: 'ઓપરેશનલ એલર્ટ એન્જિન — સિમ્યુલેટેડ SMS / ઇમેઇલ અને ઓડિટ ટ્રેઇલ',
    subtitle: 'SLA ભંગ જોખમ, > 4 કલાક વગર સોંપાયેલ અરજીઓ અને વારંવાર ઝોન નિષ્ફળતા માટે નિયમ-આધારિત તપાસ',
    simulatedBadge: 'સિમ્યુલેટેડ SMS અને SMTP આઉટબોક્સ',
    disclosure:
      'સ્પષ્ટતા: એલર્ટ સંદેશાઓ alert_dispatches માં સાચવાય છે, ઇન-એપ એલર્ટ સેન્ટરમાં પહોંચે છે અને audit_logs માં હેશ-ચેઇન થાય છે. કોઈ બાહ્ય ટેલિકોમ SMS કે SMTP સર્વરનો સંપર્ક થતો નથી.',
    btnRunSweep: 'એલર્ટ નિયમ તપાસ ચલાવો',
    btnRunningSweep: 'નિયમો ચકાસાઈ રહ્યા છે...',
    filterAll: 'તમામ ચેનલો',
    filterSms: 'સિમ્યુલેટેડ SMS',
    filterEmail: 'સિમ્યુલેટેડ ઇમેઇલ',
    filterInApp: 'ઇન-એપ સેન્ટર',
    ruleSlaRisk: 'SLA ભંગ જોખમ',
    ruleUnassigned: 'સોંપણી બાકી > 4h',
    ruleZoneFailures: 'વારંવાર ઝોન નિષ્ફળતા',
    colRuleZone: 'ટ્રિગર નિયમ અને ઝોન',
    colChannel: 'ચેનલ',
    colRecipient: 'પ્રાપ્તકર્તા (માસ્ક કરેલ)',
    colPayload: 'એલર્ટ સંદેશ વિગત',
    colTimestamp: 'નોંધાયેલ સમય',
    emptyState: 'પસંદ કરેલ ચેનલ ફિલ્ટર માટે કોઈ એલર્ટ નોંધ મળી નથી.',
  },
  hi: {
    title: 'ऑपरेशनल अलर्ट इंजन — सिम्युलेटेड SMS / ईमेल एवं ऑडिट ट्रेल',
    subtitle: 'SLA उल्लंघन जोखिम, > 4 घंटे अनावंटित अनुरोध और बार-बार ज़ोन विफलताओं की नियम-आधारित जांच',
    simulatedBadge: 'सिम्युलेटेड SMS व SMTP आउटबॉक्स',
    disclosure:
      'स्पष्टता सूचना: अलर्ट संदेश alert_dispatches में सहेजे जाते हैं, इन-ऐप अलर्ट सेंटर में भेजे जाते हैं और audit_logs में हैश-चेन होते हैं। किसी बाहरी टेलीकॉम SMS या SMTP गेटवे को कॉल नहीं किया जाता।',
    btnRunSweep: 'अलर्ट नियम जांच चलाएं',
    btnRunningSweep: 'नियमों की जांच जारी...',
    filterAll: 'सभी चैनल',
    filterSms: 'सिम्युलेटेड SMS',
    filterEmail: 'सिम्युलेटेड ईमेल',
    filterInApp: 'इन-ऐप सेंटर',
    ruleSlaRisk: 'SLA उल्लंघन जोखिम',
    ruleUnassigned: 'अनावंटित > 4h',
    ruleZoneFailures: 'बार-बार ज़ोन विफलता',
    colRuleZone: 'ट्रिगर नियम एवं ज़ोन',
    colChannel: 'चैनल',
    colRecipient: 'प्राप्तकर्ता (मास्क्ड)',
    colPayload: 'स्वरूपित अलर्ट संदेश',
    colTimestamp: 'लॉग समय',
    emptyState: 'चयनित चैनल फ़िल्टर के लिए कोई अलर्ट प्रविष्टि नहीं मिली।',
  },
  mr: {
    title: 'ऑपरेशनल अलर्ट इंजिन — सिम्युलेटेड SMS / ईमेल आणि ऑडिट ट्रेल',
    subtitle: 'SLA उल्लंघन जोखीम, > 4 तास अनावंटित अर्ज आणि वारंवार झोन अपयशांची नियम-आधारित तपासणी',
    simulatedBadge: 'सिम्युलेटेड SMS व SMTP आउटबॉक्स',
    disclosure:
      'स्पष्टता सूचना: अलर्ट संदेश alert_dispatches मध्ये जतन केले जातात, इन-ॲप अलर्ट सेंटरमध्ये पाठवले जातात आणि audit_logs मध्ये हॅश-चेन होतात. कोणत्याही बाह्य टेलिकॉम SMS किंवा SMTP सर्व्हरशी संपर्क केला जात नाही.',
    btnRunSweep: 'अलर्ट नियम तपासणी चालवा',
    btnRunningSweep: 'नियम तपासले जात आहेत...',
    filterAll: 'सर्व चॅनेल्स',
    filterSms: 'सिम्युलेटेड SMS',
    filterEmail: 'सिम्युलेटेड ईमेल',
    filterInApp: 'इन-ॲप सेंटर',
    ruleSlaRisk: 'SLA उल्लंघन जोखीम',
    ruleUnassigned: 'अनावंटित > 4h',
    ruleZoneFailures: 'वारंवार झोन अपयश',
    colRuleZone: 'ट्रिगर नियम आणि झोन',
    colChannel: 'चॅनेल',
    colRecipient: 'प्राप्तकर्ता (मास्क्ड)',
    colPayload: 'स्वरूपित अलर्ट संदेश',
    colTimestamp: 'नोंद वेळ',
    emptyState: 'निवडलेल्या चॅनेल फिल्टरसाठी कोणतीही अलर्ट नोंद आढळली नाही.',
  },
};

const SANDBOX_ALERT_FALLBACK: AlertDispatchItem[] = [
  {
    id: 'sim-alert-sms-1',
    rule_code: 'SLA_BREACH_RISK',
    severity: 'critical',
    zone: 'North',
    request_id: 'APP-2026-0845',
    dedup_key: 'SLA_BREACH_RISK:APP-2026-0845',
    channel: 'SIMULATED_SMS',
    recipient: '+91-XXXXXX3210',
    subject: 'SLA Breach Risk Alert (North)',
    body: '[SIMULATED SMS · UGVCL-DEMO] SLA Breach Risk Alert (North): Sample Applicant · SLA breach risk 88% · status ASSIGNED',
    status: 'SIMULATED_SENT',
    created_at: '2026-10-30T09:10:00Z',
    is_simulated: true,
  },
  {
    id: 'sim-alert-email-1',
    rule_code: 'REPEATED_ZONE_FAILURES',
    severity: 'warning',
    zone: 'North',
    request_id: '',
    dedup_key: 'REPEATED_ZONE_FAILURES:North:n=3',
    channel: 'SIMULATED_EMAIL',
    recipient: 'admin@vidyut.local, officer@vidyut.local',
    subject: '[SIMULATED EMAIL · WARNING] Repeated Zone Failures (North · 3 active)',
    body: 'North zone has 3 concurrent abnormal/blocked/failed items (threshold: 2) requiring supervisory triage.',
    status: 'SIMULATED_SENT',
    created_at: '2026-10-30T09:10:05Z',
    is_simulated: true,
  },
  {
    id: 'sim-alert-inapp-1',
    rule_code: 'UNASSIGNED_STALE',
    severity: 'warning',
    zone: 'South',
    request_id: 'APP-2026-0851',
    dedup_key: 'UNASSIGNED_STALE:APP-2026-0851',
    channel: 'IN_APP',
    recipient: '2 staff inbox(es) (South)',
    subject: 'Unassigned Request > 4h (South)',
    body: 'Unassigned request in South zone exceeding 4h dispatch window (status ROUTED)',
    status: 'DELIVERED_IN_APP',
    created_at: '2026-10-30T08:50:00Z',
    is_simulated: false,
  },
];

export const LiveAlertEnginePanel: React.FC = () => {
  const { showToast } = useApp();
  const { language } = useLanguage();
  const ui = ALERT_ENGINE_TRANSLATIONS[language] || ALERT_ENGINE_TRANSLATIONS.en;

  const [channelFilter, setChannelFilter] = useState<
    'ALL' | 'SIMULATED_SMS' | 'SIMULATED_EMAIL' | 'IN_APP'
  >('ALL');
  const [sweeping, setSweeping] = useState(false);

  const fetcher = useCallback(() => fetchAlertDispatches('ALL', 'ALL'), []);
  const dispatchesRes = useLivePoll(fetcher);

  const isLive = dispatchesRes.data !== null;
  const allItems = isLive ? dispatchesRes.data!.items : SANDBOX_ALERT_FALLBACK;
  const visibleItems =
    channelFilter === 'ALL' ? allItems : allItems.filter((i) => i.channel === channelFilter);

  const smsCount = isLive
    ? dispatchesRes.data!.summary.simulated_sms
    : SANDBOX_ALERT_FALLBACK.filter((i) => i.channel === 'SIMULATED_SMS').length;
  const emailCount = isLive
    ? dispatchesRes.data!.summary.simulated_email
    : SANDBOX_ALERT_FALLBACK.filter((i) => i.channel === 'SIMULATED_EMAIL').length;
  const inAppCount = isLive
    ? dispatchesRes.data!.summary.in_app
    : SANDBOX_ALERT_FALLBACK.filter((i) => i.channel === 'IN_APP').length;

  const formatRuleLabel = (code: AlertDispatchItem['rule_code']) => {
    if (code === 'SLA_BREACH_RISK') return ui.ruleSlaRisk;
    if (code === 'UNASSIGNED_STALE') return ui.ruleUnassigned;
    return ui.ruleZoneFailures;
  };

  const handleRunSweep = async () => {
    setSweeping(true);
    try {
      if (isLive) {
        const res = await evaluateLiveAlerts();
        dispatchesRes.refresh();
        showToast(
          res.newly_dispatched > 0
            ? `Alert sweep dispatched ${res.newly_dispatched} new multi-channel record(s) + audit chain entries.`
            : 'Alert sweep complete — all active conditions already dispatched (idempotent dedup).',
          res.newly_dispatched > 0 ? 'warning' : 'info'
        );
      } else {
        showToast(
          'Alert sweep evaluated in sandbox — active alerts already recorded.',
          'info'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Alert sweep failed', 'error');
    } finally {
      setSweeping(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-0 min-w-0">
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {ui.title}
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
                  {ui.simulatedBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ui.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={sweeping}
              onClick={() => void handleRunSweep()}
              className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              {sweeping ? ui.btnRunningSweep : ui.btnRunSweep}
            </button>
            <button
              type="button"
              onClick={() => dispatchesRes.refresh()}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Refresh alert dispatches"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 px-3.5 py-2 text-xs text-amber-900 dark:text-amber-200">
          {ui.disclosure}
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => setChannelFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              channelFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {ui.filterAll} ({allItems.length})
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('SIMULATED_SMS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              channelFilter === 'SIMULATED_SMS'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {ui.filterSms} ({smsCount})
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('SIMULATED_EMAIL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              channelFilter === 'SIMULATED_EMAIL'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            {ui.filterEmail} ({emailCount})
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('IN_APP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              channelFilter === 'IN_APP'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            {ui.filterInApp} ({inAppCount})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5 font-semibold whitespace-nowrap">{ui.colRuleZone}</th>
              <th className="p-3.5 font-semibold whitespace-nowrap">{ui.colChannel}</th>
              <th className="p-3.5 font-semibold whitespace-nowrap">{ui.colRecipient}</th>
              <th className="p-3.5 font-semibold">{ui.colPayload}</th>
              <th className="p-3.5 font-semibold whitespace-nowrap">{ui.colTimestamp}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  {ui.emptyState}
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatRuleLabel(item.rule_code)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.zone} {item.request_id ? `· ${item.request_id.slice(0, 8)}` : ''}
                    </div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        item.channel === 'SIMULATED_SMS'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : item.channel === 'SIMULATED_EMAIL'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {item.channel}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                    {item.recipient}
                  </td>
                  <td className="p-3.5 max-w-md">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.body}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
