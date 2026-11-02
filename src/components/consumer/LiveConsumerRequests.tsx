import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { hasBackendSession, subscribeBackendSession } from '../../utils/backendSession';
import { fetchLiveRequests, useLivePoll, type LiveRequestRow } from '../../utils/liveData';
import { formatValidationIssue } from '../../utils/demoLoadPolicy';

const labels = {
  en: {
    title: 'Live backend requests',
    separate:
      'These records come from your verified backend session and are separate from local demo applications. Demo accounts remain shared prototype accounts—do not enter real personal data.',
    none: 'No live backend requests found for this account.',
    inactive:
      'No verified live backend session is active in this tab (tokens are held in memory only and clear on reload or account change). Sign in with matching server and backend credentials to view live records.',
    error: 'Could not load live backend records. Verify your session and backend connection.',
    refresh: 'Refresh',
    load: 'Requested load',
    status: 'Current workflow status',
    history: 'Validation reasons recorded at submission (historical snapshot)',
    historyHint: 'Historical snapshot at submission time; does not change when status or policy updates.',
    notes: 'Current server notes',
    legacy: 'Structured submission-time reasons were not recorded for this older request.',
  },
  gu: {
    title: 'લાઇવ બેકએન્ડ અરજીઓ',
    separate:
      'આ રેકોર્ડ તમારા ચકાસાયેલ બેકએન્ડ સત્રમાંથી આવે છે અને સ્થાનિક ડેમો અરજીઓથી અલગ છે. ડેમો ખાતાં શેર કરેલા પ્રોટોટાઇપ ખાતાં છે—વાસ્તવિક વ્યક્તિગત માહિતી દાખલ કરશો નહીં.',
    none: 'આ ખાતા માટે કોઈ લાઇવ બેકએન્ડ અરજી મળી નથી.',
    inactive:
      'આ ટૅબમાં કોઈ સક્રિય લાઇવ બેકએન્ડ સત્ર નથી (ટોકન માત્ર મેમરીમાં રહે છે અને રીલોડ કે ખાતું બદલાતાં સાફ થાય છે). લાઇવ રેકોર્ડ જોવા સમાન સર્વર અને બેકએન્ડ ઓળખપત્રોથી સાઇન ઇન કરો.',
    error: 'લાઇવ બેકએન્ડ રેકોર્ડ લોડ થઈ શક્યા નથી. સત્ર અને જોડાણ તપાસો.',
    refresh: 'તાજું કરો',
    load: 'માગેલ લોડ',
    status: 'હાલની વર્કફ્લો સ્થિતિ',
    history: 'અરજી સમયે નોંધાયેલા ચકાસણી કારણો (ઐતિહાસિક સ્નેપશોટ)',
    historyHint: 'અરજી સમયનો ઐતિહાસિક સ્નેપશોટ; સ્થિતિ કે નીતિ બદલાતાં બદલાતો નથી.',
    notes: 'હાલની સર્વર નોંધ',
    legacy: 'આ જૂની અરજી માટે સંરચિત અરજી-સમયના કારણો નોંધાયેલા નથી.',
  },
  hi: {
    title: 'लाइव बैकएंड आवेदन',
    separate:
      'ये रिकॉर्ड आपके सत्यापित बैकएंड सत्र से आते हैं और स्थानीय डेमो आवेदनों से अलग हैं। डेमो खाते साझा प्रोटोटाइप खाते हैं—वास्तविक व्यक्तिगत जानकारी दर्ज न करें।',
    none: 'इस खाते के लिए कोई लाइव बैकएंड आवेदन नहीं मिला।',
    inactive:
      'इस टैब में कोई सत्यापित लाइव बैकएंड सत्र सक्रिय नहीं है (टोकन केवल मेमोरी में रहते हैं और रीलोड या खाता बदलने पर साफ़ हो जाते हैं)। लाइव रिकॉर्ड देखने के लिए समान सर्वर और बैकएंड क्रेडेंशियल से साइन इन करें।',
    error: 'लाइव बैकएंड रिकॉर्ड लोड नहीं हो सके। सत्र और कनेक्शन जाँचें।',
    refresh: 'रीफ़्रेश करें',
    load: 'माँगा गया लोड',
    status: 'वर्तमान वर्कफ़्लो स्थिति',
    history: 'आवेदन के समय दर्ज सत्यापन कारण (ऐतिहासिक स्नैपशॉट)',
    historyHint: 'आवेदन के समय का ऐतिहासिक स्नैपशॉट; स्थिति या नीति बदलने पर यह नहीं बदलता।',
    notes: 'वर्तमान सर्वर नोट',
    legacy: 'इस पुराने आवेदन के लिए संरचित आवेदन-कालीन कारण दर्ज नहीं किए गए थे।',
  },
  mr: {
    title: 'लाइव्ह बॅकएंड अर्ज',
    separate:
      'या नोंदी तुमच्या पडताळलेल्या बॅकएंड सत्रातून येतात आणि स्थानिक डेमो अर्जांपेक्षा वेगळ्या आहेत. डेमो खाती सामायिक प्रोटोटाइप खाती आहेत—खरी वैयक्तिक माहिती भरू नका.',
    none: 'या खात्यासाठी कोणतेही लाइव्ह बॅकएंड अर्ज आढळले नाहीत.',
    inactive:
      'या टॅबमध्ये पडताळलेले लाइव्ह बॅकएंड सत्र सक्रिय नाही (टोकन फक्त मेमरीत राहतात आणि रीलोड किंवा खाते बदलल्यास साफ होतात). लाइव्ह नोंदी पाहण्यासाठी जुळणाऱ्या सर्व्हर आणि बॅकएंड तपशीलांनी साइन इन करा.',
    error: 'लाइव्ह बॅकएंड नोंदी लोड झाल्या नाहीत. सत्र आणि कनेक्शन तपासा.',
    refresh: 'रीफ्रेश करा',
    load: 'मागितलेला भार',
    status: 'सध्याची वर्कफ्लो स्थिती',
    history: 'अर्जाच्या वेळी नोंदवलेली पडताळणी कारणे (ऐतिहासिक स्नॅपशॉट)',
    historyHint: 'अर्जाच्या वेळचा ऐतिहासिक स्नॅपशॉट; स्थिती किंवा धोरण बदलल्यावर बदलत नाही.',
    notes: 'सध्याची सर्व्हर नोंद',
    legacy: 'या जुन्या अर्जासाठी संरचित अर्ज-वेळची कारणे नोंदवलेली नाहीत.',
  },
};

export const LiveConsumerRequests: React.FC = () => {
  const { language } = useLanguage();
  const text = labels[language];
  const [active, setActive] = useState(hasBackendSession);
  const { data, error, loading, refresh } = useLivePoll<LiveRequestRow[]>(fetchLiveRequests);

  useEffect(() => subscribeBackendSession(() => setActive(hasBackendSession())), []);

  return (
    <section
      className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-slate-900 dark:border-blue-800 dark:bg-slate-900 dark:text-slate-100"
      aria-label={text.title}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{text.title}</h3>
        {active && (
          <button
            type="button"
            disabled={loading}
            onClick={refresh}
            className="rounded border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-blue-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
          >
            {text.refresh}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{text.separate}</p>

      {!active ? (
        <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">{text.inactive}</p>
      ) : error ? (
        <p role="alert" className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          {text.error}
        </p>
      ) : data && data.length === 0 ? (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{text.none}</p>
      ) : null}

      {active && !error && data && data.length > 0 && (
        <div className="mt-3 space-y-3">
          {data.map(request => (
            <article
              key={request.id}
              className="rounded-lg border border-blue-100 bg-white p-3 break-words dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold">{request.id}</span>
                <span>
                  {text.load}: <strong>{request.requested_load_kw} kW</strong>
                </span>
              </div>
              <p className="mt-1 text-xs">
                {text.status}: <strong>{request.status}</strong>
              </p>
              {request.validation_notes && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {text.notes}: {request.validation_notes}
                </p>
              )}
              {request.validation_issues === null || request.validation_issues === undefined ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{text.legacy}</p>
              ) : (
                request.validation_issues.length > 0 && (
                  <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">
                    <p className="font-semibold">{text.history}</p>
                    <p className="text-[11px] opacity-80">{text.historyHint}</p>
                    <ul className="mt-1 list-disc pl-5">
                      {request.validation_issues.map((issue, index) => (
                        <li key={`${issue.code}-${index}`}>
                          {formatValidationIssue(issue, language)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
