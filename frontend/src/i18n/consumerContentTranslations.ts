/**
 * Consumer Portal Content & Record Localization Layer
 *
 * Provides pure, deterministic localization helpers for data-driven records,
 * enum labels, status badges, categories, documents, complaint descriptions,
 * notifications, and timeline entries in the Consumer Portal across
 * English (en), Gujarati (gu), Hindi (hi), and Marathi (mr).
 *
 * Architectural Guarantees:
 * 1. Canonical IDs, meter numbers, bill numbers, amounts, dates, and records in
 *    `mockData.ts` remain 100% untouched.
 * 2. English ('en') returns the exact canonical text verbatim.
 * 3. Unknown or user-entered values fall back safely to their original string.
 */

import { LanguageCode } from './types';

export function localizeTariffCategory(category: string, lang: LanguageCode): string {
  if (lang === 'en' || !category) return category;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Residential (RGPU)': {
      en: 'Residential (RGPU)',
      gu: 'રહેણાંક (RGPU)',
      hi: 'आवासीय (RGPU)',
      mr: 'निवासी (RGPU)'
    },
    'Commercial (NRGP)': {
      en: 'Commercial (NRGP)',
      gu: 'વાણિજ્યિક (NRGP)',
      hi: 'वाणिज्यिक (NRGP)',
      mr: 'व्यावसायिक (NRGP)'
    },
    'Industrial (LTMD)': {
      en: 'Industrial (LTMD)',
      gu: 'ઔદ્યોગિક (LTMD)',
      hi: 'औद्योगिक (LTMD)',
      mr: 'औद्योगिक (LTMD)'
    },
    'Agricultural (AG)': {
      en: 'Agricultural (AG)',
      gu: 'કૃષિ (AG)',
      hi: 'कृषि (AG)',
      mr: 'कृषी (AG)'
    }
  };
  return map[category]?.[lang] || category;
}

export function localizeConnectionStatus(status: string, lang: LanguageCode): string {
  if (lang === 'en' || !status) return status;
  const map: Record<string, Record<LanguageCode, string>> = {
    Active: {
      en: 'Active',
      gu: 'સક્રિય',
      hi: 'सक्रिय',
      mr: 'सक्रिय'
    },
    Disconnected: {
      en: 'Disconnected',
      gu: 'જોડાણ કપાયેલ',
      hi: 'विच्छेदित',
      mr: 'खंडित'
    },
    PendingMeter: {
      en: 'PendingMeter',
      gu: 'મીટર બાકી',
      hi: 'मीटर लंबित',
      mr: 'मीटर प्रलंबित'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizePhase(phase: string, lang: LanguageCode): string {
  if (lang === 'en' || !phase) return phase;
  const map: Record<string, Record<LanguageCode, string>> = {
    '1-Phase': {
      en: '1-Phase',
      gu: '૧-ફેઝ (1-Phase)',
      hi: '१-फेज़ (1-Phase)',
      mr: '१-फेज (1-Phase)'
    },
    '3-Phase': {
      en: '3-Phase',
      gu: '૩-ફેઝ (3-Phase)',
      hi: '३-फेज़ (3-Phase)',
      mr: '३-फेज (3-Phase)'
    }
  };
  return map[phase]?.[lang] || phase;
}

export function normalizeCanonicalTariffCategory(category: string): string {
  if (!category) return 'Residential (RGPU)';
  const trimmed = category.trim();
  const reverseMap: Record<string, string> = {
    'Residential (RGPU)': 'Residential (RGPU)',
    'રહેણાંક (RGPU)': 'Residential (RGPU)',
    'आवासीय (RGPU)': 'Residential (RGPU)',
    'निवासी (RGPU)': 'Residential (RGPU)',
    'Commercial (NRGP)': 'Commercial (NRGP)',
    'વાણિજ્યિક (NRGP)': 'Commercial (NRGP)',
    'वाणिज्यिक (NRGP)': 'Commercial (NRGP)',
    'व्यावसायिक (NRGP)': 'Commercial (NRGP)',
    'Industrial (LTMD)': 'Industrial (LTMD)',
    'ઔદ્યોગિક (LTMD)': 'Industrial (LTMD)',
    'औद्योगिक (LTMD)': 'Industrial (LTMD)',
    'Agricultural (AG)': 'Agricultural (AG)',
    'કૃષિ (AG)': 'Agricultural (AG)',
    'कृषि (AG)': 'Agricultural (AG)',
    'कृषी (AG)': 'Agricultural (AG)'
  };
  if (reverseMap[trimmed]) return reverseMap[trimmed];
  if (/RGPU|Residential/i.test(trimmed)) return 'Residential (RGPU)';
  if (/NRGP|Commercial/i.test(trimmed)) return 'Commercial (NRGP)';
  if (/LTMD|Industrial/i.test(trimmed)) return 'Industrial (LTMD)';
  if (/\bAG\b|Agricultural/i.test(trimmed)) return 'Agricultural (AG)';
  return trimmed;
}

const SUBDIVISION_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  'Mehsana City North': {
    en: 'Mehsana City North',
    gu: 'મહેસાણા સિટી ઉત્તર',
    hi: 'महेसाणा सिटी उत्तर',
    mr: 'महेसाणा सिटी उत्तर'
  },
  'Mehsana City South': {
    en: 'Mehsana City South',
    gu: 'મહેસાણા સિટી દક્ષિણ',
    hi: 'महेसाणा सिटी दक्षिण',
    mr: 'महेसाणा सिटी दक्षिण'
  },
  'Mehsana Industrial GIDC': {
    en: 'Mehsana Industrial GIDC',
    gu: 'મહેસાણા ઔદ્યોગિક GIDC',
    hi: 'महेसाणा औद्योगिक GIDC',
    mr: 'महेसाणा औद्योगिक GIDC'
  },
  'Mehsana Circle': {
    en: 'Mehsana Circle',
    gu: 'મહેસાણા વર્તુળ',
    hi: 'महेसाणा सर्कल',
    mr: 'महेसाणा मंडळ'
  },
  'Mehsana Corporate Circle': {
    en: 'Mehsana Corporate Circle',
    gu: 'મહેસાણા કોર્પોરેટ વર્તુળ',
    hi: 'महेसाणा कॉर्पोरेट सर्कल',
    mr: 'महेसाणा कॉर्पोरेट मंडळ'
  },
  'Gandhinagar Sub-Division 2': {
    en: 'Gandhinagar Sub-Division 2',
    gu: 'ગાંધીનગર સબ-ડિવિઝન ૨',
    hi: 'गांधीनगर उप-प्रभाग २',
    mr: 'गांधीनगर उप-विभाग २'
  },
  'Gandhinagar Circle': {
    en: 'Gandhinagar Circle',
    gu: 'ગાંધીનગર વર્તુળ',
    hi: 'गांधीनगर सर्कल',
    mr: 'गांधीनगर मंडळ'
  },
  'Visnagar Division': {
    en: 'Visnagar Division',
    gu: 'વિસનગર ડિવિઝન',
    hi: 'विसनगर प्रभाग',
    mr: 'विसनगर विभाग'
  },
  'Visnagar Rural': {
    en: 'Visnagar Rural',
    gu: 'વિસનગર ગ્રામ્ય',
    hi: 'विसनगर ग्रामीण',
    mr: 'विसनगर ग्रामीण'
  },
  'Kalol Sub-Division': {
    en: 'Kalol Sub-Division',
    gu: 'કલોલ સબ-ડિવિઝન',
    hi: 'कलोल उप-प्रभाग',
    mr: 'कलोल उप-विभाग'
  },
  'Kalol Industrial Division': {
    en: 'Kalol Industrial Division',
    gu: 'કલોલ ઔદ્યોગિક ડિવિઝન',
    hi: 'कलोल औद्योगिक प्रभाग',
    mr: 'कलोल औद्योगिक विभाग'
  },
  'Kadi Division': {
    en: 'Kadi Division',
    gu: 'કડી ડિવિઝન',
    hi: 'कडी प्रभाग',
    mr: 'कडी विभाग'
  },
  'Kadi Sub-Division': {
    en: 'Kadi Sub-Division',
    gu: 'કડી સબ-ડિવિઝન',
    hi: 'कडी उप-प्रभाग',
    mr: 'कडी उप-विभाग'
  },
  'Patan Urban Zone': {
    en: 'Patan Urban Zone',
    gu: 'પાટણ શહેરી ઝોન',
    hi: 'पाटण शहरी ज़ोन',
    mr: 'पाटण शहरी झोन'
  },
  'Patan Industrial Zone': {
    en: 'Patan Industrial Zone',
    gu: 'પાટણ ઔદ્યોગિક ઝોન',
    hi: 'पाटण औद्योगिक ज़ोन',
    mr: 'पाटण औद्योगिक झोन'
  },
  'Gandhinagar Sub-Div 2': {
    en: 'Gandhinagar Sub-Div 2',
    gu: 'ગાંધીનગર સબ-ડિવિઝન ૨',
    hi: 'गांधीनगर उप-प्रभाग २',
    mr: 'गांधीनगर उप-विभाग २'
  },
  'Kadi Rural (Ag)': {
    en: 'Kadi Rural (Ag)',
    gu: 'કડી ગ્રામ્ય (કૃષિ)',
    hi: 'कडी ग्रामीण (कृषि)',
    mr: 'कडी ग्रामीण (कृषी)'
  },
  'Central Office': {
    en: 'Central Office',
    gu: 'મધ્યસ્થ કચેરી',
    hi: 'केंद्रीय कार्यालय',
    mr: 'मध्यवर्ती कार्यालय'
  },
  'Feeder Wing Mehsana': {
    en: 'Feeder Wing Mehsana',
    gu: 'ફીડર વિંગ મહેસાણા',
    hi: 'फीडर विंग महेसाणा',
    mr: 'फीडर विंग महेसाणा'
  },
  'Sabarmati & Mehsana Rural Feeder Wing': {
    en: 'Sabarmati & Mehsana Rural Feeder Wing',
    gu: 'સાબરમતી અને મહેસાણા ગ્રામ્ય ફીડર વિંગ',
    hi: 'साबरमती और महेसाणा ग्रामीण फीडर विंग',
    mr: 'साबरमती आणि महेसाणा ग्रामीण फीडर विंग'
  },
  'Mehsana Rural Feeder Wing': {
    en: 'Mehsana Rural Feeder Wing',
    gu: 'મહેસાણા ગ્રામ્ય ફીડર વિંગ',
    hi: 'महेसाणा ग्रामीण फीडर विंग',
    mr: 'महेसाणा ग्रामीण फिडर विंग'
  },
  'UGVCL Corporate Mehsana': {
    en: 'UGVCL Corporate Mehsana',
    gu: 'UGVCL કોર્પોરેટ મહેસાણા',
    hi: 'UGVCL कॉर्पोरेट महेसाणा',
    mr: 'UGVCL कॉर्पोरेट महेसाणा'
  },
  'State Data Center / IT Cell': {
    en: 'State Data Center / IT Cell',
    gu: 'સ્ટેટ ડેટા સેન્ટર / IT સેલ',
    hi: 'स्टेट डेटा सेंटर / IT सेल',
    mr: 'स्टेट डेटा सेंटर / IT सेल'
  },
  Circle: {
    en: 'Circle',
    gu: 'વર્તુળ (Circle)',
    hi: 'सर्कल (Circle)',
    mr: 'मंडळ (Circle)'
  }
};

export function normalizeCanonicalSubdivision(subdivision: string): string {
  if (!subdivision) return 'Mehsana City North';
  const trimmed = subdivision.trim().replace(/\s*\(HQ\)\s*$/i, '');
  const devanagariNormalized = trimmed.replace(/मेहसाणा/g, 'महेसाणा');
  if (SUBDIVISION_TRANSLATIONS[trimmed]) {
    return trimmed;
  }
  for (const [canonical, translations] of Object.entries(SUBDIVISION_TRANSLATIONS)) {
    if (
      canonical.toLowerCase() === trimmed.toLowerCase() ||
      Object.values(translations).some(
        (val) =>
          val === trimmed ||
          val === devanagariNormalized ||
          val.replace(/\s*\(HQ\)\s*$/i, '') === trimmed ||
          val.replace(/\s*\(HQ\)\s*$/i, '') === devanagariNormalized
      )
    ) {
      return canonical;
    }
  }
  return trimmed;
}

export function localizeSubdivision(subdivision: string | undefined, lang: LanguageCode): string {
  if (!subdivision) return "";
  if (lang === 'en' || !subdivision) return subdivision;
  const canonical = normalizeCanonicalSubdivision(subdivision);
  return SUBDIVISION_TRANSLATIONS[canonical]?.[lang] || subdivision;
}

export function localizeNotificationDateGroupHeader(
  bucketKey: string,
  calendarDate: string,
  lang: LanguageCode
): string {
  if (bucketKey === 'TODAY') {
    const label = {
      en: 'Today',
      gu: 'આજે',
      hi: 'आज',
      mr: 'आज'
    }[lang];
    return calendarDate ? `${label} — ${calendarDate}` : label;
  }
  if (bucketKey === 'YESTERDAY') {
    const label = {
      en: 'Yesterday',
      gu: 'ગઈકાલે',
      hi: 'कल (बीता हुआ)',
      mr: 'काल'
    }[lang];
    return calendarDate ? `${label} — ${calendarDate}` : label;
  }
  if (bucketKey === 'UNDATED' || !calendarDate) {
    return {
      en: 'Prior Records (Timestamp Not Recorded)',
      gu: 'અગાઉના રેકોર્ડ્સ (સમય નોંધાયેલ નથી)',
      hi: 'पूर्व रिकॉर्ड (समय दर्ज नहीं)',
      mr: 'मागील रेकॉर्ड (वेळ नोंदवलेली नाही)'
    }[lang];
  }
  const prefix = {
    en: 'Date:',
    gu: 'તારીખ:',
    hi: 'दिनांक:',
    mr: 'दिनांक:'
  }[lang];
  return `${prefix} ${calendarDate}`;
}

export function localizeFeederName(feederName: string, lang: LanguageCode): string {
  if (lang === 'en' || !feederName) return feederName;
  const map: Record<string, Record<LanguageCode, string>> = {
    '11kV Visnagar Road Feeder': {
      en: '11kV Visnagar Road Feeder',
      gu: '11kV વિસનગર રોડ ફીડર',
      hi: '11kV विसनगर रोड फीडर',
      mr: '11kV विसनगर रोड फीडर'
    },
    '11kV GIDC-2 Dedicated Feeder': {
      en: '11kV GIDC-2 Dedicated Feeder',
      gu: '11kV GIDC-2 સમર્પિત ફીડર',
      hi: '11kV GIDC-2 समर्पित फीडर',
      mr: '11kV GIDC-2 समर्पित फीडर'
    },
    '11kV City-1 Feeder': {
      en: '11kV City-1 Feeder',
      gu: '11kV સિટી-1 ફીડર',
      hi: '11kV सिटी-1 फीडर',
      mr: '11kV सिटी-1 फीडर'
    },
    '11kV Kadi-Rural Ag Feeder (Jyotigram)': {
      en: '11kV Kadi-Rural Ag Feeder (Jyotigram)',
      gu: '11kV કડી-ગ્રામ્ય કૃષિ ફીડર (જ્યોતિગ્રામ)',
      hi: '11kV कडी-ग्रामीण कृषि फीडर (ज्योतिग्राम)',
      mr: '11kV कडी-ग्रामीण कृषी फीडर (ज्योतिग्राम)'
    },
    '11kV Kadi-Rural Ag Feeder': {
      en: '11kV Kadi-Rural Ag Feeder',
      gu: '11kV કડી-ગ્રામ્ય કૃષિ ફીડર',
      hi: '11kV कडी-ग्रामीण कृषि फीडर',
      mr: '11kV कडी-ग्रामीण कृषी फीडर'
    },
    '11kV Gandhinagar City-1 Feeder': {
      en: '11kV Gandhinagar City-1 Feeder',
      gu: '11kV ગાંધીનગર સિટી-1 ફીડર',
      hi: '11kV गांधीनगर सिटी-1 फीडर',
      mr: '11kV गांधीनगर सिटी-1 फीडर'
    },
    'Local Feeder': {
      en: 'Local Feeder',
      gu: 'સ્થાનિક ફીડર',
      hi: 'स्थानीय फीडर',
      mr: 'स्थानिक फीडर'
    }
  };
  return map[feederName]?.[lang] || feederName;
}

export function localizeConsumerAddress(address: string, lang: LanguageCode): string {
  if (lang === 'en' || !address) return address;
  const map: Record<string, Record<LanguageCode, string>> = {
    '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002': {
      en: '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002',
      gu: '૧૪, આનંદ નગર સોસાયટી, રાધનપુર ચાર રસ્તા પાસે, મહેસાણા - 384002',
      hi: '१४, आनंद नगर सोसायटी, राधनपुर चार रास्ता के पास, महेसाणा - 384002',
      mr: '१४, आनंद नगर सोसायटी, राधनपूर चार रस्ता जवळ, महेसाणा - 384002'
    },
    'Plot 48/B, GIDC Phase II, Dediyasan, Mehsana - 384002': {
      en: 'Plot 48/B, GIDC Phase II, Dediyasan, Mehsana - 384002',
      gu: 'પ્લોટ 48/B, GIDC ફેઝ-II, દેદિયાસણ, મહેસાણા - 384002',
      hi: 'प्लॉट 48/B, GIDC फेज़-II, देदियासण, महेसाणा - 384002',
      mr: 'प्लॉट 48/B, GIDC फेज-II, देदियासण, महेसाणा - 384002'
    },
    'Plot 48/B, GIDC Phase II, Dediyasan': {
      en: 'Plot 48/B, GIDC Phase II, Dediyasan',
      gu: 'પ્લોટ 48/B, GIDC ફેઝ-II, દેદિયાસણ',
      hi: 'प्लॉट 48/B, GIDC फेज़-II, देदियासण',
      mr: 'प्लॉट 48/B, GIDC फेज-II, देदियासण'
    },
    '14, Anand Nagar Society, Radhanpur Road, Mehsana': {
      en: '14, Anand Nagar Society, Radhanpur Road, Mehsana',
      gu: '૧૪, આનંદ નગર સોસાયટી, રાધનપુર રોડ, મહેસાણા',
      hi: '१४, आनंद नगर सोसायटी, राधनपुर रोड, महेसाणा',
      mr: '१४, आनंद नगर सोसायटी, राधनपूर रोड, महेसाणा'
    },
    '14, Anand Nagar Society, Visnagar Road, Mehsana - 384002': {
      en: '14, Anand Nagar Society, Visnagar Road, Mehsana - 384002',
      gu: '૧૪, આનંદ નગર સોસાયટી, વિસનગર રોડ, મહેસાણા - 384002',
      hi: '१४, आनंद नगर सोसायटी, विसनगर रोड, महेसाणा - 384002',
      mr: '१४, आनंद नगर सोसायटी, विसनगर रोड, महेसाणा - 384002'
    },
    '14, Anand Nagar & Pole DP-14, Radhanpur Road': {
      en: '14, Anand Nagar & Pole DP-14, Radhanpur Road',
      gu: '૧૪, આનંદ નગર અને પોલ DP-14, રાધનપુર રોડ',
      hi: '१४, आनंद नगर और पोल DP-14, राधनपुर रोड',
      mr: '१४, आनंद नगर आणि पोल DP-14, राधनपूर रोड'
    },
    '14, Anand Nagar Society, Mehsana': {
      en: '14, Anand Nagar Society, Mehsana',
      gu: '૧૪, આનંદ નગર સોસાયટી, મહેસાણા',
      hi: '१४, आनंद नगर सोसायटी, महेसाणा',
      mr: '१४, आनंद नगर सोसायटी, महेसाणा'
    },
    'DT-GIDC-08, Dediyasan Sub-station Yard': {
      en: 'DT-GIDC-08, Dediyasan Sub-station Yard',
      gu: 'DT-GIDC-08, દેદિયાસણ સબ-સ્ટેશન યાર્ડ',
      hi: 'DT-GIDC-08, देदियासण सब-स्टेशन यार्ड',
      mr: 'DT-GIDC-08, देदियासण सब-स्टेशन यार्ड'
    },
    'Sector 4/B, Near Swaminarayan Temple': {
      en: 'Sector 4/B, Near Swaminarayan Temple',
      gu: 'સેક્ટર 4/B, સ્વામિનારાયણ મંદિર પાસે',
      hi: 'सेक्टर 4/B, स्वामीनारायण मंदिर के पास',
      mr: 'सेक्टर 4/B, स्वामीनारायण मंदिराजवळ'
    }
  };
  return map[address]?.[lang] || address;
}

export function localizeBillMonth(month: string, lang: LanguageCode): string {
  if (lang === 'en' || !month) return month;
  const map: Record<string, Record<LanguageCode, string>> = {
    'September 2026': {
      en: 'September 2026',
      gu: 'સપ્ટેમ્બર 2026',
      hi: 'सितंबर 2026',
      mr: 'सप्टेंबर 2026'
    },
    'August 2026': {
      en: 'August 2026',
      gu: 'ઓગસ્ટ 2026',
      hi: 'अगस्त 2026',
      mr: 'ऑगस्ट 2026'
    },
    'July 2026': {
      en: 'July 2026',
      gu: 'જુલાઈ 2026',
      hi: 'जुलाई 2026',
      mr: 'जुलै 2026'
    }
  };
  return map[month]?.[lang] || month;
}

export function localizeBillStatus(status: string, lang: LanguageCode): string {
  if (lang === 'en' || !status) return status;
  const map: Record<string, Record<LanguageCode, string>> = {
    Paid: {
      en: 'Paid',
      gu: 'ચૂકવાયેલ',
      hi: 'भुगतान किया गया',
      mr: 'भरलेले'
    },
    Unpaid: {
      en: 'Unpaid',
      gu: 'બાકી (Unpaid)',
      hi: 'अदत्त (बाकी)',
      mr: 'थकीत (बाकी)'
    },
    Overdue: {
      en: 'Overdue',
      gu: 'મુદતવીતી',
      hi: 'अतिदेय',
      mr: 'मुदतबाह्य'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizePaymentMethod(method: string, lang: LanguageCode): string {
  if (lang === 'en' || !method) return method;
  const map: Record<string, Record<LanguageCode, string>> = {
    'UPI / BHIM': {
      en: 'UPI / BHIM',
      gu: 'UPI / BHIM',
      hi: 'UPI / BHIM',
      mr: 'UPI / BHIM'
    },
    'Net Banking': {
      en: 'Net Banking',
      gu: 'નેટ બેન્કિંગ (Net Banking)',
      hi: 'नेट बैंकिंग (Net Banking)',
      mr: 'नेट बँकिंग (Net Banking)'
    },
    'Debit Card': {
      en: 'Debit Card',
      gu: 'ડેબિટ કાર્ડ (Debit Card)',
      hi: 'डेबिट कार्ड (Debit Card)',
      mr: 'डेबिट कार्ड (Debit Card)'
    },
    'RTGS/NEFT': {
      en: 'RTGS/NEFT',
      gu: 'RTGS/NEFT',
      hi: 'RTGS/NEFT',
      mr: 'RTGS/NEFT'
    }
  };
  return map[method]?.[lang] || method;
}

export function localizePaymentStatus(status: string, lang: LanguageCode): string {
  if (lang === 'en' || !status) return status;
  const map: Record<string, Record<LanguageCode, string>> = {
    Successful: {
      en: 'Successful',
      gu: 'સફળ',
      hi: 'सफल',
      mr: 'यशस्वी'
    },
    Pending: {
      en: 'Pending',
      gu: 'પ્રક્રિયામાં',
      hi: 'लंबित',
      mr: 'प्रलंबित'
    },
    Failed: {
      en: 'Failed',
      gu: 'નિષ્ફળ',
      hi: 'विफल',
      mr: 'अयशस्वी'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizeApplicationStatus(status: string, lang: LanguageCode): string {
  if (lang === 'en' || !status) return status;
  const map: Record<string, Record<LanguageCode, string>> = {
    Submitted: {
      en: 'Submitted',
      gu: 'સબમિટ કરેલ',
      hi: 'प्रस्तुत किया गया',
      mr: 'सादर केले'
    },
    'Document Verification': {
      en: 'Document Verification',
      gu: 'દસ્તાવેજ ચકાસણી',
      hi: 'दस्तावेज़ सत्यापन',
      mr: 'दस्तऐवज पडताळणी'
    },
    'Site Inspection': {
      en: 'Site Inspection',
      gu: 'સ્થળ નિરીક્ષણ',
      hi: 'स्थल निरीक्षण',
      mr: 'स्थळ पाहणी'
    },
    'Sanction Approval': {
      en: 'Sanction Approval',
      gu: 'મંજૂરી (Sanction Approval)',
      hi: 'स्वीकृति अनुमोदन',
      mr: 'मंजुरी मान्यता'
    },
    'Meter Installed': {
      en: 'Meter Installed',
      gu: 'મીટર સ્થાપિત',
      hi: 'मीटर स्थापित',
      mr: 'मीटर बसवले'
    },
    Rejected: {
      en: 'Rejected',
      gu: 'નામંજૂર (Rejected)',
      hi: 'अस्वीकृत (Rejected)',
      mr: 'नाकारले (Rejected)'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizeDocumentName(doc: string, lang: LanguageCode): string {
  if (lang === 'en' || !doc) return doc;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Aadhaar Card (PDF, 420 KB)': {
      en: 'Aadhaar Card (PDF, 420 KB)',
      gu: 'આધાર કાર્ડ (PDF, 420 KB)',
      hi: 'आधार कार्ड (PDF, 420 KB)',
      mr: 'आधार कार्ड (PDF, 420 KB)'
    },
    'Registered Ownership Deed / Index-II (PDF, 1.2 MB)': {
      en: 'Registered Ownership Deed / Index-II (PDF, 1.2 MB)',
      gu: 'રજિસ્ટર્ડ માલિકી દસ્તાવેજ / Index-II (PDF, 1.2 MB)',
      hi: 'पंजीकृत स्वामित्व विलेख / Index-II (PDF, 1.2 MB)',
      mr: 'नोंदणीकृत मालकी खत / Index-II (PDF, 1.2 MB)'
    },
    'Government Licensed Electrical Contractor Test Certificate (PDF, 850 KB)': {
      en: 'Government Licensed Electrical Contractor Test Certificate (PDF, 850 KB)',
      gu: 'સરકાર માન્ય ઇલેક્ટ્રિકલ કોન્ટ્રાક્ટર ટેસ્ટ સર્ટિફિકેટ (PDF, 850 KB)',
      hi: 'सरकार लाइसेंस प्राप्त इलेक्ट्रिकल कॉन्ट्रैक्टर टेस्ट प्रमाणपत्र (PDF, 850 KB)',
      mr: 'सरकारी परवानाधारक इलेक्ट्रिकल कंत्राटदार चाचणी प्रमाणपत्र (PDF, 850 KB)'
    },
    'Electricity Bill of Neighbor': {
      en: 'Electricity Bill of Neighbor',
      gu: 'પાડોશીનું વીજ બિલ',
      hi: 'पड़ोसी का बिजली बिल',
      mr: 'शेजाऱ्याचे वीज बिल'
    },
    'Sale Deed / Registry': {
      en: 'Sale Deed / Registry',
      gu: 'વેચાણ દસ્તાવેજ / રજિસ્ટ્રી',
      hi: 'बिक्री विलेख / रजिस्ट्री',
      mr: 'खरेदीखत / नोंदणी'
    },
    'Aadhaar Card': {
      en: 'Aadhaar Card',
      gu: 'આધાર કાર્ડ',
      hi: 'आधार कार्ड',
      mr: 'आधार कार्ड'
    },
    'Test Report Form': {
      en: 'Test Report Form',
      gu: 'ટેસ્ટ રિપોર્ટ ફોર્મ',
      hi: 'टेस्ट रिपोर्ट फॉर्म',
      mr: 'चाचणी अहवाल फॉर्म'
    },
    '7/12 Land Record': {
      en: '7/12 Land Record',
      gu: '૭/૧૨ જમીન ઉતારો',
      hi: '७/१२ भूमि रिकॉर्ड',
      mr: '७/१२ सातबारा उतारा'
    },
    '8-A Khata Certificate': {
      en: '8-A Khata Certificate',
      gu: '૮-અ ખાતા પ્રમાણપત્ર',
      hi: '८-अ खाता प्रमाणपत्र',
      mr: '८-अ खाते प्रमाणपत्र'
    },
    'Factory License': {
      en: 'Factory License',
      gu: 'ફેક્ટરી લાઇસન્સ',
      hi: 'फैक्ट्री लाइसेंस',
      mr: 'कारखाना परवाना'
    },
    'Pollution Control NOC': {
      en: 'Pollution Control NOC',
      gu: 'પ્રદૂષણ નિયંત્રણ NOC',
      hi: 'प्रदूषण नियंत्रण NOC',
      mr: 'प्रदूषण नियंत्रण NOC'
    },
    'Electrical Inspector Certificate': {
      en: 'Electrical Inspector Certificate',
      gu: 'ઇલેક્ટ્રિકલ ઇન્સ્પેક્ટર પ્રમાણપત્ર',
      hi: 'इलेक्ट्रिकल इंस्पेक्टर प्रमाणपत्र',
      mr: 'विद्युत निरीक्षक प्रमाणपत्र'
    },
    'GST Certificate': {
      en: 'GST Certificate',
      gu: 'GST પ્રમાણપત્ર',
      hi: 'GST प्रमाणपत्र',
      mr: 'GST प्रमाणपत्र'
    },
    'Tax Receipt': {
      en: 'Tax Receipt',
      gu: 'વેરા પાવતી',
      hi: 'कर रसीद',
      mr: 'कर पावती'
    },
    'NOC from Society': {
      en: 'NOC from Society',
      gu: 'સોસાયટીનું ના-વાંધા પ્રમાણપત્ર (NOC)',
      hi: 'सोसायटी से अनापत्ति प्रमाणपत्र (NOC)',
      mr: 'सोसायटीचे ना-हरकत प्रमाणपत्र (NOC)'
    }
  };
  return map[doc]?.[lang] || doc;
}

export function localizeApplicationNote(note: string, lang: LanguageCode): string {
  if (lang === 'en' || !note) return note;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Application filed online with documents.': {
      en: 'Application filed online with documents.',
      gu: 'દસ્તાવેજો સાથે ઓનલાઇન અરજી દાખલ કરવામાં આવી.',
      hi: 'दस्तावेजों के साथ ऑनलाइन आवेदन दर्ज किया गया।',
      mr: 'दस्तऐवजांसह ऑनलाइन अर्ज दाखल केला.'
    },
    'Ownership deed verified. Assigned site inspection to JE Solanki.': {
      en: 'Ownership deed verified. Assigned site inspection to JE Solanki.',
      gu: 'માલિકી દસ્તાવેજની ચકાસણી પૂર્ણ. સ્થળ નિરીક્ષણ JE સોલંકીને સોંપવામાં આવ્યું.',
      hi: 'स्वामित्व विलेख सत्यापित। स्थल निरीक्षण JE सोलंकी को सौंपा गया।',
      mr: 'मालकी दस्तऐवज पडताळणी पूर्ण. स्थळ पाहणी JE सोलंकी यांना सोपवली.'
    },
    'Agricultural pump connection application submitted.': {
      en: 'Agricultural pump connection application submitted.',
      gu: 'કૃષિ પંપ વીજ જોડાણ માટેની અરજી સબમિટ કરવામાં આવી.',
      hi: 'कृषि पंप कनेक्शन आवेदन प्रस्तुत किया गया।',
      mr: 'कृषी पंप वीज जोडणी अर्ज सादर केला.'
    },
    'Industrial load sanction file submitted.': {
      en: 'Industrial load sanction file submitted.',
      gu: 'ઔદ્યોગિક લોડ મંજૂરી ફાઇલ સબમિટ કરવામાં આવી.',
      hi: 'औद्योगिक लोड स्वीकृति फ़ाइल प्रस्तुत की गई।',
      mr: 'औद्योगिक भार मंजुरी फाईल सादर केली.'
    },
    'Field inspection completed. 100kVA transformer has spare capacity.': {
      en: 'Field inspection completed. 100kVA transformer has spare capacity.',
      gu: 'સ્થળ નિરીક્ષણ પૂર્ણ. 100kVA ટ્રાન્સફોર્મરમાં વધારાની ક્ષમતા ઉપલબ્ધ છે.',
      hi: 'फील्ड निरीक्षण पूर्ण। 100kVA ट्रांसफॉर्मर में अतिरिक्त क्षमता उपलब्ध है।',
      mr: 'स्थळ पाहणी पूर्ण. 100kVA ट्रान्सफॉर्मरमध्ये अतिरिक्त क्षमता उपलब्ध आहे.'
    },
    'Estimate generated and forwarded for Executive Sanction.': {
      en: 'Estimate generated and forwarded for Executive Sanction.',
      gu: 'અંદાજપત્ર (Estimate) તૈયાર કરી કાર્યપાલક મંજૂરી માટે મોકલવામાં આવ્યું.',
      hi: 'प्राक्कलन तैयार कर कार्यकारी स्वीकृति हेतु अग्रेषित किया गया।',
      mr: 'अंदाजपत्रक तयार करून कार्यकारी मंजुरीसाठी पाठवले.'
    },
    'Application submitted.': {
      en: 'Application submitted.',
      gu: 'અરજી સબમિટ કરવામાં આવી.',
      hi: 'आवेदन प्रस्तुत किया गया।',
      mr: 'अर्ज सादर केला.'
    },
    'Smart meter installed and energized successfully.': {
      en: 'Smart meter installed and energized successfully.',
      gu: 'સ્માર્ટ મીટર સફળતાપૂર્વક સ્થાપિત અને વીજ પુરવઠો ચાલુ કરવામાં આવ્યો.',
      hi: 'स्मार्ट मीटर सफलतापूर्वक स्थापित और ऊर्जान्वित किया गया।',
      mr: 'स्मार्ट मीटर यशस्वीपणे बसवून वीज पुरवठा सुरू केला.'
    },
    'Online application submitted via Citizen Self-Service Portal.': {
      en: 'Online application submitted via Citizen Self-Service Portal.',
      gu: 'નાગરિક સ્વ-સેવા પોર્ટલ મારફતે ઓનલાઇન અરજી સબમિટ કરવામાં આવી.',
      hi: 'नागरिक स्व-सेवा पोर्टल के माध्यम से ऑनलाइन आवेदन प्रस्तुत किया गया।',
      mr: 'नागरिक स्वयं-सेवा पोर्टलद्वारे ऑनलाइन अर्ज सादर केला.'
    },
    'Sanction approved via Quick Suggestion': {
      en: 'Sanction approved via Quick Suggestion',
      gu: 'ઝડપી સૂચન મારફતે લોડ મંજૂરી આપવામાં આવી',
      hi: 'त्वरित सुझाव के माध्यम से लोड स्वीकृति अनुमोदित',
      mr: 'जलद सूचनेद्वारे भार मंजुरी दिली'
    }
  };
  const trimmed = note.trim();
  if (map[trimmed]?.[lang]) return map[trimmed][lang];

  let m = trimmed.match(/^Advanced to\s+(.+?)\s+by\s+(.+)$/);
  if (m) {
    const stage = localizeApplicationStatus(m[1], lang);
    return lang === 'gu'
      ? `${m[2]} દ્વારા "${stage}" તબક્કામાં આગળ વધારવામાં આવી`
      : lang === 'hi'
      ? `${m[2]} द्वारा "${stage}" चरण में आगे बढ़ाया गया`
      : `${m[2]} द्वारे "${stage}" टप्प्यात पुढे नेले`;
  }

  m = trimmed.match(/^Dispatched field site inspection\s+(\S+)\s+to\s+(.+)$/);
  if (m) {
    return lang === 'gu'
      ? `સ્થળ નિરીક્ષણ વર્ક ઓર્ડર ${m[1]} એ ${m[2]} ને સોંપવામાં આવ્યો`
      : lang === 'hi'
      ? `फील्ड स्थल निरीक्षण वर्क ऑर्डर ${m[1]} ${m[2]} को भेजा गया`
      : `स्थळ निरीक्षण वर्क ऑर्डर ${m[1]} ${m[2]} यांच्याकडे पाठवला`;
  }

  m = trimmed.match(/^Clarifications? requested from applicant:\s*(.+)$/i);
  if (m) {
    return lang === 'gu'
      ? `અરજદાર પાસેથી સ્પષ્ટતા માંગવામાં આવી: ${m[1]}`
      : lang === 'hi'
      ? `आवेदक से स्पष्टीकरण मांगा गया: ${m[1]}`
      : `अर्जदाराकडून स्पष्टीकरण मागवले: ${m[1]}`;
  }

  m = trimmed.match(/^Application archived from active queue by\s+(.+?)(?:\s+—\s+(.+))?$/);
  if (m) {
    const suffix = m[2] ? ` — ${m[2]}` : '';
    return lang === 'gu'
      ? `${m[1]} દ્વારા અરજી સક્રિય કતારમાંથી આર્કાઇવ કરવામાં આવી${suffix}`
      : lang === 'hi'
      ? `${m[1]} द्वारा आवेदन सक्रिय कतार से संग्रहीत किया गया${suffix}`
      : `${m[1]} द्वारे अर्ज सक्रिय रांगेतून संग्रहित केला${suffix}`;
  }

  m = trimmed.match(/^Application restored to active queue by\s+(.+)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} દ્વારા અરજી સક્રિય કતારમાં પુનઃસ્થાપિત કરવામાં આવી`
      : lang === 'hi'
      ? `${m[1]} द्वारा आवेदन सक्रिय कतार में पुनर्स्थापित किया गया`
      : `${m[1]} द्वारे अर्ज सक्रिय रांगेत पुनर्संचयित केला`;
  }

  return note;
}

export function localizeComplaintCategory(category: string, lang: LanguageCode): string {
  if (lang === 'en' || !category) return category;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Voltage Fluctuation': {
      en: 'Voltage Fluctuation',
      gu: 'વોલ્ટેજની વધ-ઘટ (Voltage Fluctuation)',
      hi: 'वोल्टेज उतार-चढ़ाव (Voltage Fluctuation)',
      mr: 'व्होल्टेज चढ-उतार (Voltage Fluctuation)'
    },
    'Power Outage': {
      en: 'Power Outage',
      gu: 'વીજ પુરવઠો બંધ (Power Outage)',
      hi: 'विद्युत कटौती / आपूर्ति बाधित (Power Outage)',
      mr: 'वीज पुरवठा खंडित (Power Outage)'
    },
    'Meter Fault': {
      en: 'Meter Fault',
      gu: 'મીટરમાં ખામી (Meter Fault)',
      hi: 'मीटर खराबी (Meter Fault)',
      mr: 'मीटर बिघाड (Meter Fault)'
    },
    'Billing Dispute': {
      en: 'Billing Dispute',
      gu: 'બિલ અંગેની ફરિયાદ (Billing Dispute)',
      hi: 'बिलिंग विवाद (Billing Dispute)',
      mr: 'बिलिंग तक्रार (Billing Dispute)'
    },
    'Sparking / Hazardous Wire': {
      en: 'Sparking / Hazardous Wire',
      gu: 'સ્પાર્કિંગ / જોખમી તાર (Sparking / Hazardous Wire)',
      hi: 'स्पार्किंग / खतरनाक तार (Sparking / Hazardous Wire)',
      mr: 'स्पार्किंग / धोकादायक तार (Sparking / Hazardous Wire)'
    }
  };
  return map[category]?.[lang] || category;
}

export function localizeComplaintStatus(status: string, lang: LanguageCode): string {
  if (lang === 'en' || !status) return status;
  const map: Record<string, Record<LanguageCode, string>> = {
    Registered: {
      en: 'Registered',
      gu: 'નોંધાયેલ',
      hi: 'पंजीकृत',
      mr: 'नोंदणीकृत'
    },
    'In Review': {
      en: 'In Review',
      gu: 'સમીક્ષા હેઠળ',
      hi: 'समीक्षाधीन',
      mr: 'पुनरावलोकनाधीन'
    },
    Dispatched: {
      en: 'Dispatched',
      gu: 'ટીમ રવાના (Dispatched)',
      hi: 'टीम रवाना (Dispatched)',
      mr: 'पथक रवाना (Dispatched)'
    },
    'In Progress': {
      en: 'In Progress',
      gu: 'કામગીરી ચાલુ',
      hi: 'प्रगति पर',
      mr: 'काम सुरू'
    },
    Resolved: {
      en: 'Resolved',
      gu: 'ઉકેલાયેલ (Resolved)',
      hi: 'समाधान हो गया (Resolved)',
      mr: 'निवारण झाले (Resolved)'
    },
    Closed: {
      en: 'Closed',
      gu: 'બંધ (Closed)',
      hi: 'बंद (Closed)',
      mr: 'बंद (Closed)'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizeComplaintDescription(id: string, fallbackDescription: string, lang: LanguageCode): string {
  if (lang === 'en') return fallbackDescription;
  const map: Record<string, Record<LanguageCode, string>> = {
    'CMP-8821': {
      en: 'Frequent voltage drop below 180V during 19:00 to 22:00 causing appliances to trip. Suspected neutral wire loose at pole DP-14.',
      gu: 'સાંજે 19:00 થી 22:00 દરમિયાન વોલ્ટેજ વારંવાર 180V થી નીચે જતાં ઘરવપરાશના સાધનો બંધ થઈ જાય છે. પોલ DP-14 પાસે ન્યુટ્રલ વાયર ઢીલો હોવાની શંકા છે.',
      hi: 'शाम 19:00 से 22:00 के दौरान वोल्टेज बार-बार 180V से नीचे गिरने से उपकरण ट्रिप हो रहे हैं। पोल DP-14 पर न्यूट्रल तार ढीला होने की आशंका है।',
      mr: 'संध्याकाळी 19:00 ते 22:00 दरम्यान व्होल्टेज वारंवार 180V खाली जात असल्याने उपकरणे बंद पडत आहेत. पोल DP-14 जवळ न्यूट्रल वायर सैल असल्याचा संशय आहे.'
    },
    'CMP-8822': {
      en: 'Digital display on electronic meter shows Error code E-04 and optical port flashing red since yesterday morning.',
      gu: 'ગઈકાલ સવારથી ઇલેક્ટ્રોનિક મીટરના ડિજિટલ ડિસ્પ્લે પર Error code E-04 બતાવે છે અને ઓપ્ટિકલ પોર્ટ પર લાલ લાઇટ ઝબકે છે.',
      hi: 'कल सुबह से इलेक्ट्रॉनिक मीटर के डिजिटल डिस्प्ले पर Error code E-04 दिख रहा है और ऑप्टिकल पोर्ट लाल चमक रहा है।',
      mr: 'काल सकाळपासून इलेक्ट्रॉनिक मीटरच्या डिजिटल डिस्प्लेवर Error code E-04 दिसत असून ऑप्टिकल पोर्ट लाल चमकत आहे.'
    },
    'CMP-8819': {
      en: 'Overhead conductor touching neem tree branch near Sector 4 transformer. Visible sparking during gusty wind.',
      gu: 'સેક્ટર 4 ટ્રાન્સફોર્મર પાસે ઓવરહેડ વીજ તાર લીમડાની ડાળીને અડે છે. ભારે પવન વખતે સ્પાર્કિંગ દેખાય છે.',
      hi: 'सेक्टर 4 ट्रांसफॉर्मर के पास ओवरहेड तार नीम की डाल से छू रहा है। तेज़ हवा के दौरान स्पार्किंग दिखाई देती है।',
      mr: 'सेक्टर 4 ट्रान्सफॉर्मरजवळ ओव्हरहेड तार कडुनिंबाच्या फांदीला लागत आहे. जोरदार वाऱ्या दरम्यान स्पार्किंग दिसत आहे.'
    },
    'CMP-8815': {
      en: 'No supply in lane 3 since 2:00 AM after heavy rain.',
      gu: 'ભારે વરસાદ પછી રાત્રે 2:00 વાગ્યાથી શેરી નં. 3 માં વીજ પુરવઠો બંધ છે.',
      hi: 'भारी बारिश के बाद रात 2:00 बजे से गली नंबर 3 में बिजली आपूर्ति बंद है।',
      mr: 'मुसळधार पावसानंतर पहाटे 2:00 पासून गल्ली क्र. 3 मध्ये वीज पुरवठा बंद आहे.'
    }
  };
  return map[id]?.[lang] || fallbackDescription;
}

export function localizeComplaintResolution(
  id: string,
  fallbackRemarks: string | undefined,
  lang: LanguageCode
): string | undefined {
  if (!fallbackRemarks || lang === 'en') return fallbackRemarks;
  const map: Record<string, Record<LanguageCode, string>> = {
    'CMP-8815': {
      en: 'Blown HT fuse on 200kVA Distribution Transformer replaced and phase load balanced.',
      gu: '200kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મરનો ઊડી ગયેલો HT ફ્યુઝ બદલવામાં આવ્યો અને ફેઝ લોડ સંતુલિત કરવામાં આવ્યો.',
      hi: '200kVA वितरण ट्रांसफॉर्मर पर उड़ा हुआ HT फ़्यूज़ बदला गया और फेज़ लोड संतुलित किया गया।',
      mr: '200kVA वितरण ट्रान्सफॉर्मरवरील उडालेला HT फ्यूज बदलला आणि फेज लोड संतुलित केला.'
    }
  };
  if (map[id]?.[lang]) return map[id][lang];
  if (fallbackRemarks === 'Neutral connection restored. Voltage verified at 230V.') {
    return {
      en: fallbackRemarks,
      gu: 'ન્યુટ્રલ જોડાણ પૂર્વવત કરવામાં આવ્યું. વોલ્ટેજ 230V પર ચકાસવામાં આવ્યા.',
      hi: 'न्यूट्रल कनेक्शन बहाल किया गया। वोल्टेज 230V पर सत्यापित।',
      mr: 'न्यूट्रल कनेक्शन पूर्ववत केले. व्होल्टेज 230V वर तपासले.'
    }[lang];
  }
  return fallbackRemarks;
}

export function localizeConsumerTimelineStage(stage: string, lang: LanguageCode): string {
  return localizeComplaintStatus(stage, lang);
}

export function localizeConsumerTimelineActor(actorLabel: string, lang: LanguageCode): string {
  if (lang === 'en' || !actorLabel) return actorLabel;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Consumer Portal': {
      en: 'Consumer Portal',
      gu: 'ગ્રાહક પોર્ટલ',
      hi: 'उपभोक्ता पोर्टल',
      mr: 'ग्राहक पोर्टल'
    },
    'UGVCL Sub-Divisional Office': {
      en: 'UGVCL Sub-Divisional Office',
      gu: 'UGVCL સબ-ડિવિઝનલ કચેરી',
      hi: 'UGVCL उप-प्रभागीय कार्यालय',
      mr: 'UGVCL उप-विभागीय कार्यालय'
    },
    'UGVCL Field Engineering Team': {
      en: 'UGVCL Field Engineering Team',
      gu: 'UGVCL ફિલ્ડ એન્જિનિયરિંગ ટીમ',
      hi: 'UGVCL फील्ड इंजीनियरिंग टीम',
      mr: 'UGVCL फील्ड अभियांत्रिकी पथक'
    },
    'UGVCL Service Desk': {
      en: 'UGVCL Service Desk',
      gu: 'UGVCL સર્વિસ ડેસ્ક',
      hi: 'UGVCL सेवा डेस्क',
      mr: 'UGVCL सेवा डेस्क'
    }
  };
  return map[actorLabel]?.[lang] || actorLabel;
}

export function localizeConsumerTimelineRemark(remark: string, lang: LanguageCode): string {
  if (lang === 'en' || !remark) return remark;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Complaint logged with smart meter voltage anomaly flag.': {
      en: 'Complaint logged with smart meter voltage anomaly flag.',
      gu: 'સ્માર્ટ મીટર વોલ્ટેજ વિસંગતતા ફ્લેગ સાથે ફરિયાદ નોંધવામાં આવી.',
      hi: 'स्मार्ट मीटर वोल्टेज विसंगति फ्लैग के साथ शिकायत दर्ज की गई।',
      mr: 'स्मार्ट मीटर व्होल्टेज विसंगती फ्लॅगसह तक्रार नोंदवली.'
    },
    'Cross-checked with feeder SCADA metrics. 4 other calls nearby.': {
      en: 'Cross-checked with feeder SCADA metrics. 4 other calls nearby.',
      gu: 'ફીડર SCADA મેટ્રિક્સ સાથે ચકાસણી કરવામાં આવી. નજીકમાંથી અન્ય ૪ કોલ નોંધાયા છે.',
      hi: 'फीडर SCADA मेट्रिक्स के साथ क्रॉस-चेक किया गया। पास में 4 अन्य कॉल।',
      mr: 'फीडर SCADA मेट्रिक्ससह तपासणी केली. परिसरातून इतर ४ कॉल.'
    },
    'Assigned Work Order WO-4401 to JE Solanki for pole DP-14 inspection.': {
      en: 'Assigned Work Order WO-4401 to JE Solanki for pole DP-14 inspection.',
      gu: 'પોલ DP-14 ના સ્થળ નિરીક્ષણ માટે ફિલ્ડ ટેકનિકલ ટીમને રવાના કરવામાં આવી.',
      hi: 'पोल DP-14 के स्थल निरीक्षण हेतु फील्ड तकनीकी टीम को भेजा गया।',
      mr: 'पोल DP-14 च्या स्थळ पाहणीसाठी फील्ड तांत्रिक पथक रवाना केले.'
    },
    'Field technical team dispatched for on-site inspection.': {
      en: 'Field technical team dispatched for on-site inspection.',
      gu: 'સ્થળ નિરીક્ષણ માટે ફિલ્ડ ટેકનિકલ ટીમને રવાના કરવામાં આવી.',
      hi: 'स्थल निरीक्षण के लिए फील्ड तकनीकी टीम को रवाना किया गया।',
      mr: 'स्थळ पाहणीसाठी फील्ड तांत्रिक पथक रवाना करण्यात आले.'
    },
    'Meter error reported with photo of display.': {
      en: 'Meter error reported with photo of display.',
      gu: 'ડિસ્પ્લેના ફોટા સાથે મીટર ખામીની જાણ કરવામાં આવી.',
      hi: 'डिस्प्ले की फोटो के साथ मीटर त्रुटि की सूचना दी गई।',
      mr: 'डिस्प्लेच्या फोटोसह मीटर त्रुटीची नोंद केली.'
    },
    'Meter test squad requisition initiated.': {
      en: 'Meter test squad requisition initiated.',
      gu: 'મીટર ટેસ્ટ સ્ક્વોડની તપાસ પ્રક્રિયા શરૂ કરવામાં આવી.',
      hi: 'मीटर परीक्षण दस्ते की मांग शुरू की गई।',
      mr: 'मीटर चाचणी पथकाची कार्यवाही सुरू केली.'
    },
    'Outage reported.': {
      en: 'Outage reported.',
      gu: 'વીજ પુરવઠો બંધ થયાની ફરિયાદ નોંધાઈ.',
      hi: 'बिजली गुल होने की सूचना दी गई।',
      mr: 'वीज पुरवठा खंडित झाल्याची नोंद.'
    },
    'Night emergency team mobilized.': {
      en: 'Night emergency team mobilized.',
      gu: 'રાત્રિ તાત્કાલિક સમારકામ ટીમ રવાના કરવામાં આવી.',
      hi: 'रात्रि आपातकालीन टीम को रवाना किया गया।',
      mr: 'रात्रीचे आपत्कालीन पथक रवाना केले.'
    },
    'Supply restored. Informed consumer via SMS.': {
      en: 'Supply restored. Informed consumer via SMS.',
      gu: 'વીજ પુરવઠો પૂર્વવત કરવામાં આવ્યો. ગ્રાહકને SMS દ્વારા જાણ કરવામાં આવી.',
      hi: 'आपूर्ति बहाल की गई। उपभोक्ता को SMS द्वारा सूचित किया गया।',
      mr: 'वीज पुरवठा पूर्ववत केला. ग्राहकाला SMS द्वारे कळवले.'
    },
    'Safety emergency ticket created.': {
      en: 'Safety emergency ticket created.',
      gu: 'સુરક્ષા કટોકટી ટિકિટ બનાવવામાં આવી.',
      hi: 'सुरक्षा आपातकालीन टिकट बनाया गया।',
      mr: 'सुरक्षा आपत्कालीन तिकीट तयार केले.'
    },
    'Emergency line patrol van dispatched with tree trimmer squad.': {
      en: 'Emergency line patrol van dispatched with tree trimmer squad.',
      gu: 'ટ્રી ટ્રિમર સ્ક્વોડ સાથે કટોકટી લાઇન પેટ્રોલ વાન રવાના કરવામાં આવી.',
      hi: 'ट्री ट्रिमर दस्ते के साथ आपातकालीन लाइन पेट्रोल वैन रवाना की गई।',
      mr: 'झाडांच्या फांद्या छाटणाऱ्या पथकासह आपत्कालीन लाईन पेट्रोल व्हॅन रवाना केली.'
    },
    'Permit-to-work obtained from substation operator. Tree trimming underway.': {
      en: 'Permit-to-work obtained from substation operator. Tree trimming underway.',
      gu: 'સબસ્ટેશન ઓપરેટર પાસેથી પરમિટ-ટુ-વર્ક મેળવવામાં આવી. વૃક્ષની ડાળીઓ કાપવાની કામગીરી ચાલુ છે.',
      hi: 'सबस्टेशन ऑपरेटर से कार्य-अनुमति प्राप्त की गई। पेड़ की छंटाई जारी है।',
      mr: 'उपकेंद्र ऑपरेटरकडून परमिट-टू-वर्क घेतले. झाडांच्या फांद्या छाटण्याचे काम सुरू आहे.'
    }
  };
  if (map[remark]?.[lang]) return map[remark][lang];

  if (remark.includes('Assigned Work Order') && remark.includes('pole DP-14')) {
    return map['Assigned Work Order WO-4401 to JE Solanki for pole DP-14 inspection.'][lang];
  }

  let m = remark.match(/^Updated status to\s+(.+?)\s+via ERP Operations Console\.?$/);
  if (m) {
    const st = localizeComplaintStatus(m[1], lang);
    return lang === 'gu'
      ? `ERP સંચાલન કન્સોલ મારફતે સ્થિતિ "${st}" પર અપડેટ કરવામાં આવી.`
      : lang === 'hi'
      ? `ERP परिचालन कंसोल के माध्यम से स्थिति "${st}" पर अपडेट की गई।`
      : `ERP परिचालन कन्सोलद्वारे स्थिती "${st}" वर अद्यतनित केली.`;
  }

  m = remark.match(/^Dispatched field engineer\s+(.+?)\s*\(Work Order\s+#?(\S+)\)\.?$/);
  if (m) {
    return lang === 'gu'
      ? `ફિલ્ડ ઇજનેર ${m[1]} ને રવાના કરવામાં આવ્યા (વર્ક ઓર્ડર #${m[2]}).`
      : lang === 'hi'
      ? `फील्ड अभियंता ${m[1]} को रवाना किया गया (वर्क ऑर्डर #${m[2]})।`
      : `फील्ड अभियंता ${m[1]} यांना रवाना केले (वर्क ऑर्डर #${m[2]}).`;
  }

  return remark;
}

export function localizeNotificationStatusBadge(label: string, lang: LanguageCode): string {
  if (lang === 'en' || !label) return label;

  const badgeMap: Record<string, Record<LanguageCode, string>> = {
    Approved: {
      en: 'Approved',
      gu: 'મંજૂર',
      hi: 'स्वीकृत',
      mr: 'मंजूर'
    },
    Rejected: {
      en: 'Rejected',
      gu: 'નામંજૂર',
      hi: 'अस्वीकृत',
      mr: 'नामंजूर'
    },
    'Clarification Requested': {
      en: 'Clarification Requested',
      gu: 'સ્પષ્ટતા માંગવામાં આવી',
      hi: 'स्पष्टीकरण मांगा गया',
      mr: 'स्पष्टीकरण मागवले'
    },
    'Clarification Required': {
      en: 'Clarification Required',
      gu: 'સ્પષ્ટતા જરૂરી',
      hi: 'स्पष्टीकरण आवश्यक',
      mr: 'स्पष्टीकरण आवश्यक'
    },
    'Awaiting Approval': {
      en: 'Awaiting Approval',
      gu: 'મંજૂરીની રાહમાં',
      hi: 'अनुमोदन की प्रतीक्षा में',
      mr: 'मंजुरीची प्रतीक्षा'
    },
    'Document Verification': {
      en: 'Document Verification',
      gu: 'દસ્તાવેજ ચકાસણી',
      hi: 'दस्तावेज़ सत्यापन',
      mr: 'दस्तऐवज पडताळणी'
    },
    'Site Inspection': {
      en: 'Site Inspection',
      gu: 'સ્થળ નિરીક્ષણ',
      hi: 'स्थल निरीक्षण',
      mr: 'स्थळ निरीक्षण'
    },
    'In Progress': {
      en: 'In Progress',
      gu: 'પ્રગતિમાં',
      hi: 'प्रगति पर',
      mr: 'प्रगतीपथावर'
    },
    'New Submission': {
      en: 'New Submission',
      gu: 'નવી અરજી',
      hi: 'नया आवेदन',
      mr: 'नवीन अर्ज'
    },
    'Application Approved': {
      en: 'Application Approved',
      gu: 'અરજી મંજૂર',
      hi: 'आवेदन स्वीकृत',
      mr: 'अर्ज मंजूर'
    },
    'Application Rejected': {
      en: 'Application Rejected',
      gu: 'અરજી નામંજૂર',
      hi: 'आवेदन अस्वीकृत',
      mr: 'अर्ज नामंजूर'
    },
    'Field Assignment': {
      en: 'Field Assignment',
      gu: 'ક્ષેત્ર સોંપણી',
      hi: 'फील्ड असाइनमेंट',
      mr: 'फील्ड नेमणूक'
    },
    'Executive Escalation': {
      en: 'Executive Escalation',
      gu: 'એક્ઝિક્યુટિવ એસ્કેલેશન',
      hi: 'कार्यपालक एस्केलेशन',
      mr: 'कार्यकारी एस्केलेशन'
    },
    'Assignment Accepted': {
      en: 'Assignment Accepted',
      gu: 'સોંપણી સ્વીકારાઈ',
      hi: 'असाइनमेंट स्वीकृत',
      mr: 'नेमणूक स्वीकारली'
    },
    'Assignment Declined': {
      en: 'Assignment Declined',
      gu: 'સોંપણી નકારાઈ',
      hi: 'असाइनमेंट अस्वीकृत',
      mr: 'नेमणूक नाकारली'
    },
    'Resolution Report Submitted': {
      en: 'Resolution Report Submitted',
      gu: 'નિવારણ અહેવાલ સબમિટ થયો',
      hi: 'समाधान रिपोर्ट प्रस्तुत',
      mr: 'निवारण अहवाल सादर'
    },
    'More Information Required': {
      en: 'More Information Required',
      gu: 'વધુ માહિતી જરૂરી',
      hi: 'अधिक जानकारी आवश्यक',
      mr: 'अधिक माहिती आवश्यक'
    },
    'Assistance Requested': {
      en: 'Assistance Requested',
      gu: 'સહાયની વિનંતી કરાઈ',
      hi: 'सहायता का अनुरोध किया गया',
      mr: 'मदतीची विनंती केली'
    },
    'Inspection Started': {
      en: 'Inspection Started',
      gu: 'નિરીક્ષણ શરૂ થયું',
      hi: 'निरीक्षण प्रारंभ',
      mr: 'निरीक्षण सुरू'
    },
    'Findings Submitted': {
      en: 'Findings Submitted',
      gu: 'તારણો સબમિટ થયા',
      hi: 'निष्कर्ष प्रस्तुत',
      mr: 'निष्कर्ष सादर'
    },
    Billing: {
      en: 'Billing',
      gu: 'બિલિંગ',
      hi: 'बिलिंग',
      mr: 'बिलिंग'
    },
    Approval: {
      en: 'Approval',
      gu: 'મંજૂરી',
      hi: 'अनुमोदन',
      mr: 'मंजुरी'
    },
    Outage: {
      en: 'Outage',
      gu: 'વીજ કાપ',
      hi: 'विद्युत कटौती',
      mr: 'वीज खंडित'
    },
    Inspection: {
      en: 'Inspection',
      gu: 'નિરીક્ષણ',
      hi: 'निरीक्षण',
      mr: 'निरीक्षण'
    },
    Security: {
      en: 'Security',
      gu: 'સુરક્ષા',
      hi: 'सुरक्षा',
      mr: 'सुरक्षा'
    }
  };

  return badgeMap[label]?.[lang] || label;
}

export function localizeNotificationTimestamp(time: string, lang: LanguageCode): string {
  if (lang === 'en' || !time) return time;

  const timeMap: Record<string, Record<LanguageCode, string>> = {
    'Just now': {
      en: 'Just now',
      gu: 'હમણાં જ',
      hi: 'अभी-अभी',
      mr: 'आत्ताच'
    },
    Recent: {
      en: 'Recent',
      gu: 'તાજેતરમાં',
      hi: 'हाल ही में',
      mr: 'नुकतेच'
    },
    '15 mins ago': {
      en: '15 mins ago',
      gu: '૧૫ મિનિટ પહેલાં',
      hi: '१५ मिनट पहले',
      mr: '१५ मिनिटांपूर्वी'
    },
    '1 hour ago': {
      en: '1 hour ago',
      gu: '૧ કલાક પહેલાં',
      hi: '१ घंटे पहले',
      mr: '१ तासापूर्वी'
    },
    '2 hours ago': {
      en: '2 hours ago',
      gu: '૨ કલાક પહેલાં',
      hi: '२ घंटे पहले',
      mr: '२ तासांपूर्वी'
    },
    '3 hours ago': {
      en: '3 hours ago',
      gu: '૩ કલાક પહેલાં',
      hi: '३ घंटे पहले',
      mr: '३ तासांपूर्वी'
    },
    '5 hours ago': {
      en: '5 hours ago',
      gu: '૫ કલાક પહેલાં',
      hi: '५ घंटे पहले',
      mr: '५ तासांपूर्वी'
    }
  };

  if (timeMap[time]?.[lang]) return timeMap[time][lang];

  const minsMatch = time.match(/^(\d+)\s+mins?\s+ago$/i);
  if (minsMatch) {
    const n = minsMatch[1];
    if (lang === 'gu') return `${n} મિનિટ પહેલાં`;
    if (lang === 'hi') return `${n} मिनट पहले`;
    if (lang === 'mr') return `${n} मिनिटांपूर्वी`;
  }

  const hoursMatch = time.match(/^(\d+)\s+hours?\s+ago$/i);
  if (hoursMatch) {
    const n = hoursMatch[1];
    if (lang === 'gu') return `${n} કલાક પહેલાં`;
    if (lang === 'hi') return `${n} घंटे पहले`;
    if (lang === 'mr') return `${n} तासांपूर्वी`;
  }

  const daysMatch = time.match(/^(\d+)\s+days?\s+ago$/i);
  if (daysMatch) {
    const n = daysMatch[1];
    if (lang === 'gu') return `${n} દિવસ પહેલાં`;
    if (lang === 'hi') return `${n} दिन पहले`;
    if (lang === 'mr') return `${n} दिवसांपूर्वी`;
  }

  const shortDateTimeMatch = time.match(/^(\d{2})-([A-Za-z]{3})\s+(\d{2}:\d{2})$/);
  if (shortDateTimeMatch) {
    const [, dd, mon, hhmm] = shortDateTimeMatch;
    const shortMonthMap: Record<string, Record<LanguageCode, string>> = {
      Jan: { en: 'Jan', gu: 'જાન્યુ', hi: 'जन', mr: 'जाने' },
      Feb: { en: 'Feb', gu: 'ફેબ્રુ', hi: 'फ़र', mr: 'फेब्रु' },
      Mar: { en: 'Mar', gu: 'માર્ચ', hi: 'मार्च', mr: 'मार्च' },
      Apr: { en: 'Apr', gu: 'એપ્રિલ', hi: 'अप्रै', mr: 'एप्रि' },
      May: { en: 'May', gu: 'મે', hi: 'मई', mr: 'मे' },
      Jun: { en: 'Jun', gu: 'જૂન', hi: 'जून', mr: 'जून' },
      Jul: { en: 'Jul', gu: 'જુલાઈ', hi: 'जुला', mr: 'जुलै' },
      Aug: { en: 'Aug', gu: 'ઓગસ્ટ', hi: 'अग', mr: 'ऑग' },
      Sep: { en: 'Sep', gu: 'સપ્ટે', hi: 'सितं', mr: 'सप्टें' },
      Oct: { en: 'Oct', gu: 'ઓક્ટો', hi: 'अक्टू', mr: 'ऑक्टो' },
      Nov: { en: 'Nov', gu: 'નવે', hi: 'नवं', mr: 'नोव्हें' },
      Dec: { en: 'Dec', gu: 'ડિસે', hi: 'दिसं', mr: 'डिसें' }
    };
    const localizedMon = shortMonthMap[mon]?.[lang];
    if (localizedMon) {
      return `${dd}-${localizedMon} ${hhmm}`;
    }
  }

  return time;
}

function localizeDynamicConnectionTypePhrase(rawTypePart: string, lang: LanguageCode): string {
  const trimmed = rawTypePart.trim();
  if (!trimmed || lang === 'en') return trimmed;
  return localizeTariffCategory(trimmed, lang);
}

function localizeLoadAndCategoryPhrase(rawLoadPhrase: string, lang: LanguageCode): string {
  const trimmed = rawLoadPhrase.trim();
  if (!trimmed || lang === 'en') return trimmed;
  const match = trimmed.match(/^(\S+)\s+(.+)$/);
  if (!match) return trimmed;
  return `${match[1]} ${localizeDynamicConnectionTypePhrase(match[2], lang)}`;
}

function localizeNotificationTitleAndMessage(
  notif: {
    id: string;
    title: string;
    message: string;
  },
  lang: LanguageCode
): { title: string; message: string } {
  if (lang === 'en') {
    return { title: notif.title, message: notif.message };
  }

  const canonicalNotifMap: Record<string, Record<LanguageCode, { title: string; message: string }>> = {
    'NOTIF-01': {
      en: {
        title: 'Urgent Work Order Dispatched: WO-4401',
        message: 'Work order for voltage fluctuation at 14 Anand Nagar (CMP-8821) has been scheduled.'
      },
      gu: {
        title: 'તાત્કાલિક વર્ક ઓર્ડર રવાના: WO-4401',
        message: '14 આનંદ નગર (CMP-8821) ખાતે વોલ્ટેજ વધઘટ માટે વર્ક ઓર્ડર નિર્ધારિત કરવામાં આવ્યો છે.'
      },
      hi: {
        title: 'तत्काल वर्क ऑर्डर रवाना: WO-4401',
        message: '14 आनंद नगर (CMP-8821) में वोल्टेज उतार-चढ़ाव के लिए वर्क ऑर्डर निर्धारित किया गया है।'
      },
      mr: {
        title: 'तातडीचे वर्क ऑर्डर रवाना: WO-4401',
        message: '14 आनंद नगर (CMP-8821) येथील व्होल्टेज चढ-उतारासाठी वर्क ऑर्डर नियोजित करण्यात आली आहे.'
      }
    },
    'NOTIF-02': {
      en: {
        title: 'Electricity Bill Ready: September 2026',
        message: 'Your bill of ₹2,185 for consumer no. 04281-99231 is due on 22-Oct-2026.'
      },
      gu: {
        title: 'વીજ બિલ તૈયાર છે: સપ્ટેમ્બર 2026',
        message: 'ગ્રાહક નં. 04281-99231 માટે તમારું ₹2,185 નું વીજ બિલ 22-Oct-2026 સુધીમાં ચૂકવવાનું રહેશે.'
      },
      hi: {
        title: 'बिजली बिल तैयार: सितंबर 2026',
        message: 'उपभोक्ता क्र. 04281-99231 के लिए आपका ₹2,185 का बिल 22-Oct-2026 को देय है।'
      },
      mr: {
        title: 'वीज बिल तयार: सप्टेंबर 2026',
        message: 'ग्राहक क्र. 04281-99231 साठी तुमचे ₹2,185 चे बिल 22-Oct-2026 रोजी देय आहे.'
      }
    },
    'NOTIF-03-LEGACY': {
      en: {
        title: 'New Connection Verification Pending',
        message: 'Application APP-2026-0842 for 8kW load extension requires sub-divisional sanction approval.'
      },
      gu: {
        title: 'નવા વીજ જોડાણની ચકાસણી બાકી',
        message: '8kW લોડ વિસ્તરણ માટેની અરજી APP-2026-0842 ને પેટા-વિભાગીય મંજૂરીની જરૂર છે.'
      },
      hi: {
        title: 'नए कनेक्शन का सत्यापन लंबित',
        message: '8kW लोड विस्तार के लिए आवेदन APP-2026-0842 को उप-मंडलीय स्वीकृति अनुमोदन की आवश्यकता है।'
      },
      mr: {
        title: 'नवीन वीज जोडणी पडताळणी प्रलंबित',
        message: '8kW भार विस्तारासाठी अर्ज APP-2026-0842 ला उपविभागीय मंजुरीची आवश्यकता आहे.'
      }
    },
    'NOTIF-04': {
      en: {
        title: 'Peak Load Warning: 11kV Kadi-Rural Feeder',
        message: 'Feeder utilization reached 108.2% of rated capacity. Load shedding or feeder segregation recommended.'
      },
      gu: {
        title: 'પીક લોડ ચેતવણી: 11kV કડી-ગ્રામ્ય ફીડર',
        message: 'ફીડરનો વપરાશ નિર્ધારિત ક્ષમતાના 108.2% સુધી પહોંચ્યો છે. લોડ શેડિંગ અથવા ફીડર વિભાજનની ભલામણ છે.'
      },
      hi: {
        title: 'पीक लोड चेतावनी: 11kV कडी-ग्रामीण फीडर',
        message: 'फीडर उपयोग निर्धारित क्षमता के 108.2% तक पहुंच गया है। लोड शेडिंग या फीडर पृथक्करण की अनुशंसा की जाती है।'
      },
      mr: {
        title: 'पीक लोड इशारा: 11kV कडी-ग्रामीण फिडर',
        message: 'फिडर वापर निर्धारित क्षमतेच्या 108.2% वर पोहोचला आहे. लोड शेडिंग किंवा फिडर विलगीकरणाची शिफारस आहे.'
      }
    },
    'NOTIF-05': {
      en: {
        title: 'Automated Snapshot Succeeded',
        message: 'UGVCL core enterprise database snapshot completed at 04:30 AM (184.2 GB).'
      },
      gu: {
        title: 'ઓટોમેટેડ સ્નેપશોટ સફળ',
        message: 'UGVCL કોર એન્ટરપ્રાઇઝ ડેટાબેઝ સ્નેપશોટ 04:30 AM (184.2 GB) વાગ્યે પૂર્ણ થયો.'
      },
      hi: {
        title: 'स्वचालित स्नैपशॉट सफल',
        message: 'UGVCL कोर एंटरप्राइज डेटाबेस स्नैपशॉट 04:30 AM (184.2 GB) पर पूर्ण हुआ।'
      },
      mr: {
        title: 'स्वयंचलित स्नॅपशॉट यशस्वी',
        message: 'UGVCL कोअर एंटरप्राइझ डेटाबेस स्नॅपशॉट 04:30 AM (184.2 GB) वाजता पूर्ण झाला.'
      }
    }
  };

  if (
    canonicalNotifMap[notif.id]?.[lang] &&
    notif.title === canonicalNotifMap[notif.id].en.title
  ) {
    return canonicalNotifMap[notif.id][lang];
  }
  if (
    notif.id === 'NOTIF-03' &&
    notif.title === canonicalNotifMap['NOTIF-03-LEGACY'].en.title
  ) {
    return canonicalNotifMap['NOTIF-03-LEGACY'][lang];
  }

  let localizedTitle = notif.title;
  let localizedMessage = notif.message;

  // --- TITLE PATTERNS ---
  let m: RegExpMatchArray | null = null;

  if ((m = notif.title.match(/^Application Approved for Sanction:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `મંજૂરી માટે અરજી પાસ થઈ: ${appId}`
        : lang === 'hi'
        ? `स्वीकृति हेतु आवेदन अनुमोदित: ${appId}`
        : `मंजुरीसाठी अर्ज संमत: ${appId}`;
  } else if ((m = notif.title.match(/^Application Approved:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `અરજી મંજૂર: ${appId}`
        : lang === 'hi'
        ? `आवेदन स्वीकृत: ${appId}`
        : `अर्ज मंजूर: ${appId}`;
  } else if ((m = notif.title.match(/^Application Submitted:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `અરજી સબમિટ થઈ: ${appId}`
        : lang === 'hi'
        ? `आवेदन प्रस्तुत: ${appId}`
        : `अर्ज सादर केला: ${appId}`;
  } else if ((m = notif.title.match(/^Clarification Required:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સ્પષ્ટતા જરૂરી: ${appId}`
        : lang === 'hi'
        ? `स्पष्टीकरण आवश्यक: ${appId}`
        : `स्पष्टीकरण आवश्यक: ${appId}`;
  } else if ((m = notif.title.match(/^Clarification Requested:\s*#?(.+)$/))) {
    const entityId = m[1];
    const hasHash = notif.title.includes('#');
    const idDisplay = hasHash ? `#${entityId}` : entityId;
    localizedTitle =
      lang === 'gu'
        ? `સ્પષ્ટતા માંગવામાં આવી: ${idDisplay}`
        : lang === 'hi'
        ? `स्पष्टीकरण मांगा गया: ${idDisplay}`
        : `स्पष्टीकरण मागवले: ${idDisplay}`;
  } else if ((m = notif.title.match(/^Clarification Resubmitted:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સ્પષ્ટતા ફરીથી સબમિટ કરાઈ: ${appId}`
        : lang === 'hi'
        ? `स्पष्टीकरण पुनः प्रस्तुत: ${appId}`
        : `स्पष्टीकरण पुन्हा सादर: ${appId}`;
  } else if ((m = notif.title.match(/^Document Verification In Progress:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `દસ્તાવેજ ચકાસણી પ્રગતિમાં: ${appId}`
        : lang === 'hi'
        ? `दस्तावेज़ सत्यापन प्रगति पर: ${appId}`
        : `दस्तऐवज पडताळणी प्रगतीपथावर: ${appId}`;
  } else if ((m = notif.title.match(/^Site Inspection Scheduled:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સ્થળ નિરીક્ષણ નિર્ધારિત: ${appId}`
        : lang === 'hi'
        ? `स्थल निरीक्षण निर्धारित: ${appId}`
        : `स्थळ निरीक्षण नियोजित: ${appId}`;
  } else if ((m = notif.title.match(/^Inspection Dispatched:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નિરીક્ષણ રવાના કરાયું: ${appId}`
        : lang === 'hi'
        ? `निरीक्षण रवाना किया गया: ${appId}`
        : `निरीक्षण रवाना केले: ${appId}`;
  } else if ((m = notif.title.match(/^New Site Inspection Order:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નવો સ્થળ નિરીક્ષણ ઓર્ડર: ${woId}`
        : lang === 'hi'
        ? `नया स्थल निरीक्षण आदेश: ${woId}`
        : `नवीन स्थळ निरीक्षण आदेश: ${woId}`;
  } else if ((m = notif.title.match(/^Awaiting Final Sanction:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `અંતિમ મંજૂરીની રાહમાં: ${appId}`
        : lang === 'hi'
        ? `अंतिम स्वीकृति की प्रतीक्षा में: ${appId}`
        : `अंतिम मंजुरीची प्रतीक्षा: ${appId}`;
  } else if ((m = notif.title.match(/^Application Rejected:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `અરજી નામંજૂર: ${appId}`
        : lang === 'hi'
        ? `आवेदन अस्वीकृत: ${appId}`
        : `अर्ज नामंजूर: ${appId}`;
  } else if ((m = notif.title.match(/^Application\s+(APP-\d{4}-\d+)\s+Updated$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `અરજી ${appId} અપડેટ થઈ`
        : lang === 'hi'
        ? `आवेदन ${appId} अपडेट किया गया`
        : `अर्ज ${appId} अद्ययावत केला`;
  } else if ((m = notif.title.match(/^New Application Submitted:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નવી અરજી સબમિટ થઈ: ${appId}`
        : lang === 'hi'
        ? `नया आवेदन प्रस्तुत: ${appId}`
        : `नवीन अर्ज सादर: ${appId}`;
  } else if ((m = notif.title.match(/^Documents Awaiting Review:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `દસ્તાવેજો સમીક્ષાની રાહમાં: ${appId}`
        : lang === 'hi'
        ? `दस्तावेज़ समीक्षा की प्रतीक्षा में: ${appId}`
        : `दस्तऐवज पुनरावलोकनाच्या प्रतीक्षेत: ${appId}`;
  } else if ((m = notif.title.match(/^Site Inspection Stage:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સ્થળ નિરીક્ષણ તબક્કો: ${appId}`
        : lang === 'hi'
        ? `स्थल निरीक्षण चरण: ${appId}`
        : `स्थळ निरीक्षण टप्पा: ${appId}`;
  } else if ((m = notif.title.match(/^Sanction Approval Required:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `મંજૂરીની આવશ્યકતા: ${appId}`
        : lang === 'hi'
        ? `स्वीकृति अनुमोदन आवश्यक: ${appId}`
        : `मंजुरी आवश्यक: ${appId}`;
  } else if ((m = notif.title.match(/^Application Approved & Energized:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `અરજી મંજૂર અને વીજ પુરવઠો ચાલુ: ${appId}`
        : lang === 'hi'
        ? `आवेदन स्वीकृत एवं ऊर्जीकृत: ${appId}`
        : `अर्ज मंजूर आणि वीज पुरवठा सुरू: ${appId}`;
  } else if ((m = notif.title.match(/^Electricity Bill Ready:\s*(.+)$/))) {
    const monthStr = localizeConsumptionMonth(m[1], lang);
    localizedTitle =
      lang === 'gu'
        ? `વીજ બિલ તૈયાર છે: ${monthStr}`
        : lang === 'hi'
        ? `बिजली बिल तैयार: ${monthStr}`
        : `वीज बिल तयार: ${monthStr}`;
  } else if ((m = notif.title.match(/^Bill Payment Confirmed:\s*(.+)$/))) {
    const billId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `બિલ ચુકવણીની પુષ્ટિ થઈ: ${billId}`
        : lang === 'hi'
        ? `बिल भुगतान की पुष्टि हुई: ${billId}`
        : `बिल देयकाची पुष्टी झाली: ${billId}`;
  } else if (notif.title === 'Payment Successful') {
    localizedTitle =
      lang === 'gu'
        ? 'ચુકવણી સફળ'
        : lang === 'hi'
        ? 'भुगतान सफल'
        : 'देयक यशस्वी';
  } else if ((m = notif.title.match(/^Connection Linked:\s*(.+)$/))) {
    const cNo = m[1];
    localizedTitle =
      lang === 'gu'
        ? `વીજ જોડાણ લિંક થયું: ${cNo}`
        : lang === 'hi'
        ? `विद्युत कनेक्शन लिंक किया गया: ${cNo}`
        : `वीज जोडणी लिंक झाली: ${cNo}`;
  } else if (notif.title === 'Electricity Connection Linked') {
    localizedTitle =
      lang === 'gu'
        ? 'વીજ જોડાણ લિંક થયું'
        : lang === 'hi'
        ? 'विद्युत कनेक्शन लिंक किया गया'
        : 'वीज जोडणी लिंक झाली';
  } else if ((m = notif.title.match(/^New Grievance Registered:\s*#?(.+)$/))) {
    const cmpId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નવી ફરિયાદ નોંધાઈ: #${cmpId}`
        : lang === 'hi'
        ? `नई शिकायत दर्ज की गई: #${cmpId}`
        : `नवीन तक्रार नोंदवली: #${cmpId}`;
  } else if ((m = notif.title.match(/^Field Team Dispatched:\s*#?(.+)$/))) {
    const cmpId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `ક્ષેત્ર ટીમ રવાના કરાઈ: #${cmpId}`
        : lang === 'hi'
        ? `फील्ड टीम रवाना की गई: #${cmpId}`
        : `फील्ड पथक रवाना: #${cmpId}`;
  } else if ((m = notif.title.match(/^Urgent Field Dispatch:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `તાત્કાલિક ક્ષેત્ર રવાનગી: ${woId}`
        : lang === 'hi'
        ? `तत्काल फील्ड डिस्पैच: ${woId}`
        : `तातडीचे फील्ड पथक रवाना: ${woId}`;
  } else if ((m = notif.title.match(/^New Dispatch:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નવી ક્ષેત્ર રવાનગી: ${woId}`
        : lang === 'hi'
        ? `नया फील्ड डिस्पैच: ${woId}`
        : `नवीन फील्ड रवानगी: ${woId}`;
  } else if ((m = notif.title.match(/^Grievance\s*#?(\S+)\s+Resolved$/))) {
    const cmpId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `ફરિયાદ #${cmpId} નું નિવારણ થયું`
        : lang === 'hi'
        ? `शिकायत #${cmpId} का समाधान किया गया`
        : `तक्रार #${cmpId} चे निवारण झाले`;
  } else if ((m = notif.title.match(/^New Work Order Assigned:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નવો વર્ક ઓર્ડર સોંપાયો: ${woId}`
        : lang === 'hi'
        ? `नया वर्क ऑर्डर सौंपा गया: ${woId}`
        : `नवीन वर्क ऑर्डर सोपवली: ${woId}`;
  } else if ((m = notif.title.match(/^Work Order Completed:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `વર્ક ઓર્ડર પૂર્ણ થયો: ${woId}`
        : lang === 'hi'
        ? `वर्क ऑर्डर पूर्ण हुआ: ${woId}`
        : `वर्क ऑर्डर पूर्ण झाली: ${woId}`;
  } else if ((m = notif.title.match(/^Work Order Closed:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `વર્ક ઓર્ડર બંધ થયો: ${woId}`
        : lang === 'hi'
        ? `वर्क ऑर्डर बंद किया गया: ${woId}`
        : `वर्क ऑर्डर बंद केली: ${woId}`;
  } else if ((m = notif.title.match(/^Field Inspection Completed:\s*(.+)$/))) {
    const appId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સ્થળ નિરીક્ષણ પૂર્ણ: ${appId}`
        : lang === 'hi'
        ? `स्थल निरीक्षण पूर्ण: ${appId}`
        : `स्थळ निरीक्षण पूर्ण: ${appId}`;
  } else if ((m = notif.title.match(/^Assigned Incident:\s*(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સોંપાયેલ ઘટના: ${incId}`
        : lang === 'hi'
        ? `सौंपी गई घटना: ${incId}`
        : `सोपवलेली घटना: ${incId}`;
  } else if ((m = notif.title.match(/^Reassigned Incident:\s*(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `ફરીથી સોંપાયેલ ઘટના: ${incId}`
        : lang === 'hi'
        ? `पुनः सौंपी गई घटना: ${incId}`
        : `पुन्हा सोपवलेली घटना: ${incId}`;
  } else if ((m = notif.title.match(/^Assignment Declined:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સોંપણી નકારાઈ: #${incId}`
        : lang === 'hi'
        ? `असाइनमेंट अस्वीकृत: #${incId}`
        : `नेमणूक नाकारली: #${incId}`;
  } else if ((m = notif.title.match(/^Escalated Incident:\s*(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `એસ્કેલેટ કરાયેલ ઘટના: ${incId}`
        : lang === 'hi'
        ? `एस्केलेट की गई घटना: ${incId}`
        : `एस्केलेट केलेली घटना: ${incId}`;
  } else if ((m = notif.title.match(/^Assignment Accepted:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સોંપણી સ્વીકારાઈ: #${incId}`
        : lang === 'hi'
        ? `असाइनमेंट स्वीकृत: #${incId}`
        : `नेमणूक स्वीकारली: #${incId}`;
  } else if ((m = notif.title.match(/^Inspection Started:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નિરીક્ષણ શરૂ થયું: #${incId}`
        : lang === 'hi'
        ? `निरीक्षण प्रारंभ: #${incId}`
        : `निरीक्षण सुरू: #${incId}`;
  } else if ((m = notif.title.match(/^Field Findings Submitted:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `ક્ષેત્ર તારણો સબમિટ થયા: #${incId}`
        : lang === 'hi'
        ? `फील्ड निष्कर्ष प्रस्तुत: #${incId}`
        : `फील्ड निष्कर्ष सादर: #${incId}`;
  } else if ((m = notif.title.match(/^Field Assistance Requested:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `ક્ષેત્ર સહાયની વિનંતી: #${incId}`
        : lang === 'hi'
        ? `फील्ड सहायता का अनुरोध: #${incId}`
        : `फील्ड मदतीची विनंती: #${incId}`;
  } else if ((m = notif.title.match(/^Resolution Filed:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `નિવારણ અહેવાલ દાખલ થયો: #${incId}`
        : lang === 'hi'
        ? `समाधान रिपोर्ट दर्ज: #${incId}`
        : `निवारण अहवाल दाखल: #${incId}`;
  } else if ((m = notif.title.match(/^Escalation Approved:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `એસ્કેલેશન મંજૂર: #${incId}`
        : lang === 'hi'
        ? `एस्केलेशन स्वीकृत: #${incId}`
        : `एस्केलेशन मंजूर: #${incId}`;
  } else if ((m = notif.title.match(/^Escalation Rejected:\s*#?(.+)$/))) {
    const incId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `એસ્કેલેશન નામંજૂર: #${incId}`
        : lang === 'hi'
        ? `एस्केलेशन अस्वीकृत: #${incId}`
        : `एस्केलेशन नामंजूर: #${incId}`;
  } else if ((m = notif.title.match(/^EMERGENCY SAFETY OVERRIDE:\s*(.+)$/))) {
    const feederId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `તાત્કાલિક સુરક્ષા ઓવરરાઇડ: ${feederId}`
        : lang === 'hi'
        ? `आपातकालीन सुरक्षा ओवरराइड: ${feederId}`
        : `आपत्कालीन सुरक्षा ओव्हरराइड: ${feederId}`;
  } else if ((m = notif.title.match(/^Feeder Hazard Reported:\s*(.+)$/))) {
    const feederId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `ફીડર જોખમની જાણ કરાઈ: ${feederId}`
        : lang === 'hi'
        ? `फीडर खतरे की रिपोर्ट: ${feederId}`
        : `फीडर धोक्याची नोंद: ${feederId}`;
  } else if ((m = notif.title.match(/^Site Feasibility Check:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `સ્થળ શક્યતા ચકાસણી: ${woId}`
        : lang === 'hi'
        ? `स्थल व्यवहार्यता जांच: ${woId}`
        : `स्थळ व्यवहार्यता तपासणी: ${woId}`;
  } else if ((m = notif.title.match(/^Emergency DT Thermal Alert:\s*(.+)$/))) {
    const woId = m[1];
    localizedTitle =
      lang === 'gu'
        ? `કટોકટી DT થર્મલ ચેતવણી: ${woId}`
        : lang === 'hi'
        ? `आपातकालीन DT थर्मल अलर्ट: ${woId}`
        : `आपत्कालीन DT थर्मल इशारा: ${woId}`;
  }

  // --- MESSAGE PATTERNS ---
  if (
    (m = notif.message.match(
      /^Your\s+(\S+)(?:\s+(.+?))?\s+connection application has been approved and smart meter installed\.(?:\s*Consumer No:\s*([^\s(]+)\s*\(Meter #([^)]+)\)\.)?$/
    ))
  ) {
    const load = m[1];
    const connType = m[2] ? localizeDynamicConnectionTypePhrase(m[2], lang) : '';
    const typeSegment = connType ? ` ${connType}` : '';
    const cNo = m[3];
    const mNo = m[4];
    const connSuffix = cNo
      ? lang === 'gu'
        ? ` ગ્રાહક નં: ${cNo} (મીટર #${mNo || 'Smart Meter'}).`
        : lang === 'hi'
        ? ` उपभोक्ता क्र: ${cNo} (मीटर #${mNo || 'Smart Meter'})।`
        : ` ग्राहक क्र: ${cNo} (मीटर #${mNo || 'Smart Meter'}).`
      : '';
    localizedMessage =
      lang === 'gu'
        ? `તમારી ${load}${typeSegment} વીજ જોડાણ અરજી મંજૂર કરવામાં આવી છે અને સ્માર્ટ મીટર સ્થાપિત કરવામાં આવ્યું છે.${connSuffix}`
        : lang === 'hi'
        ? `आपका ${load}${typeSegment} कनेक्शन आवेदन स्वीकृत हो गया है और स्मार्ट मीटर स्थापित कर दिया गया है।${connSuffix}`
        : `तुमचा ${load}${typeSegment} वीज जोडणी अर्ज मंजूर झाला असून स्मार्ट मीटर बसवण्यात आले आहे.${connSuffix}`;
  } else if (
    (m = notif.message.match(
      /^Sanctioned load approved\.\s*Consumer No:\s*([^,]+),\s*Meter No:\s*(\S+)\s*assigned\.$/
    ))
  ) {
    const cNo = m[1].trim();
    const mNo = m[2].trim();
    localizedMessage =
      lang === 'gu'
        ? `મંજૂર લોડ પાસ કરવામાં આવ્યો છે. ગ્રાહક નં: ${cNo}, મીટર નં: ${mNo} ફાળવવામાં આવ્યા છે.`
        : lang === 'hi'
        ? `स्वीकृत लोड अनुमोदित किया गया। उपभोक्ता क्र: ${cNo}, मीटर क्र: ${mNo} आवंटित किया गया।`
        : `मंजूर वीज भार संमत करण्यात आला आहे. ग्राहक क्र: ${cNo}, मीटर क्र: ${mNo} वितरित केले आहे.`;
  } else if (
    (m = notif.message.match(
      /^Your\s+(.+?)\s+connection application has been registered\.\s*Estimated sanction cost:\s*(₹[\d,]+)\.$/
    ))
  ) {
    const loadPhrase = localizeLoadAndCategoryPhrase(m[1], lang);
    const cost = m[2];
    localizedMessage =
      lang === 'gu'
        ? `તમારી ${loadPhrase} વીજ જોડાણ અરજી નોંધવામાં આવી છે. અંદાજિત મંજૂરી ખર્ચ: ${cost}.`
        : lang === 'hi'
        ? `आपका ${loadPhrase} कनेक्शन आवेदन पंजीकृत कर लिया गया है। अनुमानित स्वीकृति लागत: ${cost}।`
        : `तुमचा ${loadPhrase} वीज जोडणी अर्ज नोंदवण्यात आला आहे. अंदाजित मंजुरी खर्च: ${cost}.`;
  } else if (
    (m = notif.message.match(
      /^Your\s+(\S+)(?:\s+(.+?))?\s+connection application has been submitted and is awaiting verification\.$/
    ))
  ) {
    const load = m[1];
    const connType = m[2] ? localizeDynamicConnectionTypePhrase(m[2], lang) : '';
    const typeSegment = connType ? ` ${connType}` : '';
    localizedMessage =
      lang === 'gu'
        ? `તમારી ${load}${typeSegment} વીજ જોડાણ અરજી સબમિટ કરવામાં આવી છે અને ચકાસણીની રાહમાં છે.`
        : lang === 'hi'
        ? `आपका ${load}${typeSegment} कनेक्शन आवेदन प्रस्तुत कर दिया गया है और सत्यापन की प्रतीक्षा में है।`
        : `तुमचा ${load}${typeSegment} वीज जोडणी अर्ज सादर करण्यात आला असून पडताळणीच्या प्रतीक्षेत आहे.`;
  } else if (
    (m = notif.message.match(
      /^Your\s+(.+?)\s+connection request\s*\(([^)]+)\)\s+is now in Document Verification\.$/
    ))
  ) {
    const connType = localizeDynamicConnectionTypePhrase(m[1], lang);
    const load = m[2];
    localizedMessage =
      lang === 'gu'
        ? `તમારી ${connType} જોડાણ વિનંતી (${load}) હવે દસ્તાવેજ ચકાસણી હેઠળ છે.`
        : lang === 'hi'
        ? `आपका ${connType} कनेक्शन अनुरोध (${load}) अब दस्तावेज़ सत्यापन चरण में है।`
        : `तुमची ${connType} जोडणी विनंती (${load}) आता दस्तऐवज पडताळणी टप्प्यात आहे.`;
  } else if (
    (m = notif.message.match(
      /^Action needed on application\s+#?(\S+):\s*(.+)$/
    ))
  ) {
    const appId = m[1];
    const remarks = m[2];
    localizedMessage =
      lang === 'gu'
        ? `અરજી #${appId} પર કાર્યવાહી જરૂરી છે: ${remarks}`
        : lang === 'hi'
        ? `आवेदन #${appId} पर कार्रवाई आवश्यक है: ${remarks}`
        : `अर्ज #${appId} वर कार्यवाही आवश्यक आहे: ${remarks}`;
  } else if (
    (m = notif.message.match(
      /^Subdivision officer requested additional information:\s*(.+)$/
    ))
  ) {
    const remarks = m[1];
    localizedMessage =
      lang === 'gu'
        ? `પેટા-વિભાગ અધિકારીએ વધારાની માહિતી માંગી છે: ${remarks}`
        : lang === 'hi'
        ? `उप-मंडल अधिकारी ने अतिरिक्त जानकारी मांगी है: ${remarks}`
        : `उपविभाग अधिकाऱ्यांनी अतिरिक्त माहिती मागवली आहे: ${remarks}`;
  } else if (
    (m = notif.message.match(
      /^Additional documents or clarification requested:\s*(.+)$/
    ))
  ) {
    const remarks = m[1];
    localizedMessage =
      lang === 'gu'
        ? `વધારાના દસ્તાવેજો અથવા સ્પષ્ટતા માંગવામાં આવી છે: ${remarks}`
        : lang === 'hi'
        ? `अतिरिक्त दस्तावेज़ या स्पष्टीकरण मांगा गया है: ${remarks}`
        : `अतिरिक्त दस्तऐवज किंवा स्पष्टीकरण मागवले आहे: ${remarks}`;
  } else if (
    (m = notif.message.match(
      /^Subdivision office is verifying your uploaded identity and property documents for\s+(\S+)\s+connection\.$/
    ))
  ) {
    const load = m[1];
    localizedMessage =
      lang === 'gu'
        ? `પેટા-વિભાગ કચેરી તમારા ${load} જોડાણ માટે અપલોડ કરેલા ઓળખ અને મિલકતના દસ્તાવેજોની ચકાસણી કરી રહી છે.`
        : lang === 'hi'
        ? `उप-मंडल कार्यालय आपके ${load} कनेक्शन के लिए अपलोड किए गए पहचान और संपत्ति दस्तावेज़ों का सत्यापन कर रहा है।`
        : `उपविभाग कार्यालय तुमच्या ${load} जोडणीसाठी अपलोड केलेल्या ओळખ आणि मालमत्ता दस्तऐवजांची पडताळणी करत आहे.`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer has been assigned to inspect site feasibility for your\s+(\S+)\s+connection\.$/
    ))
  ) {
    const load = m[1];
    localizedMessage =
      lang === 'gu'
        ? `તમારા ${load} જોડાણ માટે સ્થળ શક્યતા ચકાસવા ક્ષેત્ર ઇજનેરની નિમણૂક કરવામાં આવી છે.`
        : lang === 'hi'
        ? `आपके ${load} कनेक्शन हेतु स्थल व्यवहार्यता निरीक्षण के लिए फील्ड इंजीनियर नियुक्त किया गया है।`
        : `तुमच्या ${load} जोडणीसाठी स्थळ व्यवहार्यता तपासणीकरिता फील्ड अभियंत्याची नेमणूक करण्यात आली आहे.`;
  } else if (
    (m = notif.message.match(
      /^Site inspection completed\.\s*Your\s+(\S+)\s+application is awaiting final sanction approval\.$/
    ))
  ) {
    const load = m[1];
    localizedMessage =
      lang === 'gu'
        ? `સ્થળ નિરીક્ષણ પૂર્ણ થયું છે. તમારી ${load} અરજી અંતિમ મંજૂરીની રાહમાં છે.`
        : lang === 'hi'
        ? `स्थल निरीक्षण पूर्ण हो गया है। आपका ${load} आवेदन अंतिम स्वीकृति अनुमोदन की प्रतीक्षा में है।`
        : `स्थळ निरीक्षण पूर्ण झाले आहे. तुमचा ${load} अर्ज अंतिम मंजुरीच्या प्रतीक्षेत आहे.`;
  } else if (
    (m = notif.message.match(
      /^Your\s+(.+?)\s+application passed technical verification and load sanction is approved\.$/
    ))
  ) {
    const loadPhrase = localizeLoadAndCategoryPhrase(m[1], lang);
    localizedMessage =
      lang === 'gu'
        ? `તમારી ${loadPhrase} અરજી તકનીકી ચકાસણીમાં પાસ થઈ છે અને લોડ મંજૂરી આપવામાં આવી છે.`
        : lang === 'hi'
        ? `आपका ${loadPhrase} आवेदन तकनीकी सत्यापन में सफल रहा है और लोड स्वीकृति अनुमोदित कर दी गई है।`
        : `तुमचा ${loadPhrase} अर्ज तांत्रिक पडताळणीत उत्तीर्ण झाला असून वीज भार मंजुरी देण्यात आली आहे.`;
  } else if (
    (m = notif.message.match(
      /^Your application\s+#?(\S+)\s+was rejected\.\s*Reason:\s*(.+)$/
    ))
  ) {
    const appId = m[1];
    const reason = m[2];
    localizedMessage =
      lang === 'gu'
        ? `તમારી અરજી #${appId} નામંજૂર કરવામાં આવી છે. કારણ: ${reason}`
        : lang === 'hi'
        ? `आपका आवेदन #${appId} अस्वीकृत कर दिया गया है। कारण: ${reason}`
        : `तुमचा अर्ज #${appId} नामंजूर करण्यात आला आहे. कारण: ${reason}`;
  } else if (
    (m = notif.message.match(
      /^Your connection application could not be approved\.\s*Reason:\s*(.+)$/
    ))
  ) {
    const reason = m[1];
    localizedMessage =
      lang === 'gu'
        ? `તમારી વીજ જોડાણ અરજી મંજૂર થઈ શકી નથી. કારણ: ${reason}`
        : lang === 'hi'
        ? `आपका कनेक्शन आवेदन स्वीकृत नहीं किया जा सका। कारण: ${reason}`
        : `तुमचा वीज जोडणी अर्ज मंजूर होऊ शकला नाही. कारण: ${reason}`;
  } else if ((m = notif.message.match(/^Reason:\s*(.+)$/))) {
    const reason = m[1];
    localizedMessage =
      lang === 'gu'
        ? `કારણ: ${reason}`
        : lang === 'hi'
        ? `कारण: ${reason}`
        : `कारण: ${reason}`;
  } else if (
    (m = notif.message.match(
      /^Your connection application moved to stage:\s*(.+)\.$/
    ))
  ) {
    const stage = localizeApplicationStatus(m[1], lang);
    localizedMessage =
      lang === 'gu'
        ? `તમારી વીજ જોડાણ અરજી આ તબક્કામાં પહોંચી છે: ${stage}.`
        : lang === 'hi'
        ? `आपका कनेक्शन आवेदन इस चरण में पहुंच गया है: ${stage}।`
        : `तुमचा वीज जोडणी अर्ज या टप्प्यावर पोहोचला आहे: ${stage}.`;
  } else if (
    (m = notif.message.match(
      /^Your bill of\s+(\S+)\s+for consumer no\.\s+(\S+)\s+is due on\s+(.+)\.$/
    ))
  ) {
    const amount = m[1];
    const cNo = m[2];
    const dueDate = m[3];
    localizedMessage =
      lang === 'gu'
        ? `ગ્રાહક નં. ${cNo} માટે તમારું ${amount} નું વીજ બિલ ${dueDate} સુધીમાં ચૂકવવાનું રહેશે.`
        : lang === 'hi'
        ? `उपभोक्ता क्र. ${cNo} के लिए आपका ${amount} का बिल ${dueDate} को देय है।`
        : `ग्राहक क्र. ${cNo} साठी तुमचे ${amount} चे बिल ${dueDate} रोजी देय आहे.`;
  } else if (
    (m = notif.message.match(
      /^Payment of\s+(\S+)\s+via\s+(.+?)\s+received\.\s*Transaction Ref:\s*(.+)\.$/
    ))
  ) {
    const amount = m[1];
    const method = m[2];
    const txRef = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${method} દ્વારા ${amount} ની ચુકવણી પ્રાપ્ત થઈ છે. ટ્રાન્ઝેક્શન સંદર્ભ: ${txRef}.`
        : lang === 'hi'
        ? `${method} के माध्यम से ${amount} का भुगतान प्राप्त हुआ। लेनदेन संदर्भ: ${txRef}।`
        : `${method} द्वारे ${amount} चे देयक प्राप्त झाले. व्यवहार संदर्भ: ${txRef}.`;
  } else if (
    (m = notif.message.match(
      /^(₹[\d,]+)\s+paid for Bill\s+#?(\S+)\.\s*Reference:\s*(.+)$/
    ))
  ) {
    const amount = m[1];
    const billNo = m[2];
    const txId = m[3];
    localizedMessage =
      lang === 'gu'
        ? `બિલ #${billNo} માટે ${amount} ચૂકવવામાં આવ્યા છે. સંદર્ભ: ${txId}`
        : lang === 'hi'
        ? `बिल #${billNo} के लिए ${amount} का भुगतान किया गया। संदर्भ: ${txId}`
        : `बिल #${billNo} साठी ${amount} अदा केले. संदर्भ: ${txId}`;
  } else if (
    (m = notif.message.match(
      /^Electricity connection\s+(\S+)\s+\(Meter\s+([^)]+)\)\s+is now linked to your account\.$/
    ))
  ) {
    const cNo = m[1];
    const mNo = m[2];
    localizedMessage =
      lang === 'gu'
        ? `વીજ જોડાણ ${cNo} (મીટર ${mNo}) હવે તમારા ખાતા સાથે લિંક કરવામાં આવ્યું છે.`
        : lang === 'hi'
        ? `विद्युत कनेक्शन ${cNo} (मीटर ${mNo}) अब आपके खाते से लिंक कर दिया गया है।`
        : `वीज जोडणी ${cNo} (मीटर ${mNo}) आता तुमच्या खात्याशी लिंक करण्यात आली आहे.`;
  } else if (
    (m = notif.message.match(
      /^Consumer account\s+#?(\S+)\s+\(([^)]+)\)\s+was linked to your profile successfully\.$/
    ))
  ) {
    const cNo = m[1];
    const cat = localizeTariffCategory(m[2], lang);
    localizedMessage =
      lang === 'gu'
        ? `ગ્રાહક ખાતું #${cNo} (${cat}) તમારી પ્રોફાઇલ સાથે સફળતાપૂર્વક લિંક કરવામાં આવ્યું છે.`
        : lang === 'hi'
        ? `उपभोक्ता खाता #${cNo} (${cat}) आपकी प्रोफ़ाइल से सफलतापूर्वक लिंक कर दिया गया है।`
        : `ग्राहक खाते #${cNo} (${cat}) तुमच्या प्रोफाइलशी यशस्वीरित्या लिंक करण्यात आले आहे.`;
  } else if (
    (m = notif.message.match(
      /^Your complaint regarding\s+"([^"]+)"\s+has been assigned to\s+(.+?)\.\s*Work Order\s+(\S+)\s+is now in progress\.$/
    ))
  ) {
    const cat = localizeComplaintCategory(m[1], lang);
    const eng = m[2];
    const woId = m[3];
    localizedMessage =
      lang === 'gu'
        ? `"${cat}" અંગેની તમારી ફરિયાદ ${eng} ને સોંપવામાં આવી છે. વર્ક ઓર્ડર ${woId} હાલમાં પ્રગતિમાં છે.`
        : lang === 'hi'
        ? `"${cat}" के संबंध में आपकी शिकायत ${eng} को सौंपी गई है। वर्क ऑर्डर ${woId} अब प्रगति पर है।`
        : `"${cat}" संदर्भातील तुमची तक्रार ${eng} यांच्याकडे सोपवण्यात आली आहे. वर्क ऑर्डर ${woId} सध्या प्रगतीपथावर आहे.`;
  } else if (
    notif.message === 'A field engineering team has been dispatched to inspect and rectify your grievance.'
  ) {
    localizedMessage =
      lang === 'gu'
        ? 'તમારી ફરિયાદનું નિરીક્ષણ અને નિવારણ કરવા માટે ક્ષેત્ર ઇજનેરી ટીમ રવાના કરવામાં આવી છે.'
        : lang === 'hi'
        ? 'आपकी शिकायत का निरीक्षण और समाधान करने के लिए फील्ड इंजीनियरिंग टीम रवाना कर दी गई है।'
        : 'तुमच्या तक्रारीची पाहणी आणि निवारण करण्यासाठी फील्ड अभियांत्रिकी पथक रवाना करण्यात आले आहे.';
  } else if (
    (m = notif.message.match(
      /^Your grievance has been resolved on site by\s+(.+?)\.\s*Resolution remarks:\s*(.+)$/
    ))
  ) {
    const actor = m[1];
    const rem = localizeConsumerTimelineRemark(m[2], lang);
    localizedMessage =
      lang === 'gu'
        ? `${actor} દ્વારા સ્થળ પર તમારી ફરિયાદનું નિવારણ કરવામાં આવ્યું છે. નિવારણ નોંધ: ${rem}`
        : lang === 'hi'
        ? `${actor} द्वारा स्थल पर आपकी शिकायत का समाधान कर दिया गया है। समाधान टिप्पणी: ${rem}`
        : `${actor} यांच्याद्वारे स्थळावर तुमच्या तक्रारीचे निवारण करण्यात आले आहे. निवारण शेरा: ${rem}`;
  } else if (
    (m = notif.message.match(
      /^Your grievance has been resolved:\s*(.+)$/
    ))
  ) {
    const rem = localizeConsumerTimelineRemark(m[1], lang);
    localizedMessage =
      lang === 'gu'
        ? `તમારી ફરિયાદનું નિવારણ કરવામાં આવ્યું છે: ${rem}`
        : lang === 'hi'
        ? `आपकी शिकायत का समाधान कर दिया गया है: ${rem}`
        : `तुमच्या तक्रारीचे निवारण करण्यात आले आहे: ${rem}`;
  } else if (
    (m = notif.message.match(
      /^Field engineer\s+(.+?)\s+has resolved your\s+"([^"]+)"\s+complaint\.\s*Remarks:\s*(.+)$/
    ))
  ) {
    const eng = m[1];
    const cat = localizeComplaintCategory(m[2], lang);
    const rem = localizeConsumerTimelineRemark(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${eng} એ તમારી "${cat}" ફરિયાદનું નિવારણ કર્યું છે. નોંધ: ${rem}`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${eng} ने आपकी "${cat}" शिकायत का समाधान कर दिया है। टिप्पणी: ${rem}`
        : `फील्ड अभियंता ${eng} यांनी तुमच्या "${cat}" तक्रारीचे निवारण केले आहे. शेरा: ${rem}`;
  } else if (
    (m = notif.message.match(
      /^Field crew resolved complaint\s+#?(\S+)\s+\(([^)]+)\)\.\s*Remarks:\s*(.+)$/
    ))
  ) {
    const cmpId = m[1];
    const sub = localizeSubdivision(m[2], lang);
    const rem = localizeConsumerTimelineRemark(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ટીમે ફરિયાદ #${cmpId} (${sub}) નું નિવારણ કર્યું છે. નોંધ: ${rem}`
        : lang === 'hi'
        ? `फील्ड टीम ने शिकायत #${cmpId} (${sub}) का समाधान किया। टिप्पणी: ${rem}`
        : `फील्ड पथकाने तक्रार #${cmpId} (${sub}) चे निवारण केले. शेरा: ${rem}`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+filed a\s+(.+?)\s+grievance\s+\(([^)]+)\)\s+in\s+(.+)\.$/
    ))
  ) {
    const consumerName = m[1];
    const cat = localizeComplaintCategory(m[2], lang);
    const prio = m[3];
    const sub = localizeSubdivision(m[4], lang);
    localizedMessage =
      lang === 'gu'
        ? `${consumerName} એ ${sub} માં ${cat} ફરિયાદ (${prio}) નોંધાવી છે.`
        : lang === 'hi'
        ? `${consumerName} ने ${sub} में ${cat} शिकायत (${prio}) दर्ज की है।`
        : `${consumerName} यांनी ${sub} मध्ये ${cat} तक्रार (${prio}) नोंदवली आहे.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+reported at\s+(.+?)\.\s*Assigned to JE Field\.$/
    ))
  ) {
    const cat = localizeComplaintCategory(m[1], lang);
    const sub = localizeSubdivision(m[2], lang);
    localizedMessage =
      lang === 'gu'
        ? `${sub} ખાતે ${cat} ની જાણ કરવામાં આવી છે. JE ફિલ્ડને સોંપવામાં આવ્યું.`
        : lang === 'hi'
        ? `${sub} में ${cat} की सूचना मिली है। JE फील्ड को सौंपा गया।`
        : `${sub} येथे ${cat} ची नोंद झाली आहे. JE फील्डकडे सोपवले.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+assigned at\s+(.+?)\s+for\s+(.+)\.$/
    ))
  ) {
    const cat = localizeComplaintCategory(m[1], lang);
    const sub = localizeSubdivision(m[2], lang);
    const consumerName = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${consumerName} માટે ${sub} ખાતે ${cat} સોંપવામાં આવ્યું છે.`
        : lang === 'hi'
        ? `${consumerName} के लिए ${sub} में ${cat} सौंपा गया है।`
        : `${consumerName} यांच्यासाठी ${sub} येथे ${cat} सोपवण्यात आले आहे.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+submitted a\s+(.+?)\s+application in\s+(.+?)\.\s*Documents awaiting scrutiny\.$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `${applicant} એ ${sub} માં ${loadPhrase} અરજી સબમિટ કરી છે. દસ્તાવેજો ચકાસણીની રાહમાં છે.`
        : lang === 'hi'
        ? `${applicant} ने ${sub} में ${loadPhrase} आवेदन प्रस्तुत किया है। दस्तावेज़ जांच की प्रतीक्षा में हैं।`
        : `${applicant} यांनी ${sub} मध्ये ${loadPhrase} अर्ज सादर केला आहे. दस्तऐवज तपासणीच्या प्रतीक्षेत आहेत.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+submitted a\s+(\S+)(?:\s+(.+?))?\s+connection application in\s+(.+)\.$/
    ))
  ) {
    const applicant = m[1];
    const load = m[2];
    const connType = m[3] ? localizeDynamicConnectionTypePhrase(m[3], lang) : '';
    const sub = localizeSubdivision(m[4], lang);
    const typeSegment = connType ? ` ${connType}` : '';
    localizedMessage =
      lang === 'gu'
        ? `${applicant} એ ${sub} માં ${load}${typeSegment} વીજ જોડાણ અરજી સબમિટ કરી છે.`
        : lang === 'hi'
        ? `${applicant} ने ${sub} में ${load}${typeSegment} कनेक्शन आवेदन प्रस्तुत किया है।`
        : `${applicant} यांनी ${sub} मध्ये ${load}${typeSegment} वीज जोडणी अर्ज सादर केला आहे.`;
  } else if (
    (m = notif.message.match(
      /^Clarification requested from\s+(.+?)\s+\((.+)\):\s*(.+)$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const remarks = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${loadPhrase}) પાસેથી સ્પષ્ટતા માંગવામાં આવી: ${remarks}`
        : lang === 'hi'
        ? `${applicant} (${loadPhrase}) से स्पष्टीकरण मांगा गया: ${remarks}`
        : `${applicant} (${loadPhrase}) यांच्याकडून स्पष्टीकरण मागवले: ${remarks}`;
  } else if (
    (m = notif.message.match(
      /^Awaiting applicant response from\s+([^:]+):\s*(.+)$/
    ))
  ) {
    const applicant = m[1];
    const remarks = m[2];
    localizedMessage =
      lang === 'gu'
        ? `${applicant} તરફથી અરજદારના પ્રતિસાદની રાહમાં: ${remarks}`
        : lang === 'hi'
        ? `${applicant} से आवेदक की प्रतिक्रिया की प्रतीक्षा में: ${remarks}`
        : `${applicant} यांच्याकडून अर्जदाराच्या प्रतिसादाची प्रतीक्षा: ${remarks}`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+responded to the clarification request and resubmitted application\s+(\S+)\s+for Document Verification\.$/
    ))
  ) {
    const applicant = m[1];
    const appId = m[2];
    localizedMessage =
      lang === 'gu'
        ? `${applicant} એ સ્પષ્ટતા વિનંતીનો પ્રતિસાદ આપ્યો છે અને દસ્તાવેજ ચકાસણી માટે અરજી ${appId} ફરીથી સબમિટ કરી છે.`
        : lang === 'hi'
        ? `${applicant} ने स्पष्टीकरण अनुरोध का उत्तर दिया है और दस्तावेज़ सत्यापन के लिए आवेदन ${appId} पुनः प्रस्तुत किया है।`
        : `${applicant} यांनी स्पष्टीकरण विनंतीला प्रतिसाद दिला असून दस्तऐवज पडताळणीसाठी अर्ज ${appId} पुन्हा सादर केला आहे.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\(([^,]+),\s*([^)]+)\)\s+is in Document Verification stage\.\s*Ready for site inspection dispatch\.$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3].trim(), lang);
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${loadPhrase}, ${sub}) દસ્તાવેજ ચકાસણી તબક્કામાં છે. સ્થળ નિરીક્ષણ રવાનગી માટે તૈયાર.`
        : lang === 'hi'
        ? `${applicant} (${loadPhrase}, ${sub}) दस्तावेज़ सत्यापन चरण में है। स्थल निरीक्षण डिस्पैच के लिए तैयार।`
        : `${applicant} (${loadPhrase}, ${sub}) दस्तऐवज पडताळणी टप्प्यात आहे. स्थळ निरीक्षण रवानगीसाठी तयार.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\((.+)\)\s+is in Document Verification stage at\s+(.+)\.$/
    ))
  ) {
    const applicant = m[1];
    const load = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${load}) ${sub} ખાતે દસ્તાવેજ ચકાસણી તબક્કામાં છે.`
        : lang === 'hi'
        ? `${applicant} (${load}) ${sub} में दस्तावेज़ सत्यापन चरण में है।`
        : `${applicant} (${load}) ${sub} येथे दस्तऐवज पडताळणी टप्प्यात आहे.`;
  } else if (
    (m = notif.message.match(
      /^Field feasibility check assigned for\s+(.+?)\s+\((.+)\)\s+in\s+(.+)\.$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `${sub} માં ${applicant} (${loadPhrase}) માટે સ્થળ શક્યતા ચકાસણી સોંપવામાં આવી છે.`
        : lang === 'hi'
        ? `${sub} में ${applicant} (${loadPhrase}) के लिए फील्ड व्यवहार्यता जांच सौंपी गई है।`
        : `${sub} मध्ये ${applicant} (${loadPhrase}) साठी स्थळ व्यवहार्यता तपासणी सोपवण्यात आली आहे.`;
  } else if (
    (m = notif.message.match(
      /^Feasibility check scheduled for\s+(.+?)\s+\((.+)\)\s+in\s+(.+)\.$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `${sub} માં ${applicant} (${loadPhrase}) માટે શક્યતા ચકાસણી નિર્ધારિત કરવામાં આવી છે.`
        : lang === 'hi'
        ? `${sub} में ${applicant} (${loadPhrase}) के लिए व्यवहार्यता जांच निर्धारित की गई है।`
        : `${sub} मध्ये ${applicant} (${loadPhrase}) साठी व्यवहार्यता तपासणी नियोजित करण्यात आली आहे.`;
  } else if (
    (m = notif.message.match(
      /^Field feasibility check pending for\s+(.+?)\s+\((.+)\)\s+in\s+(.+)\.$/
    ))
  ) {
    const applicant = m[1];
    const load = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3], lang);
    localizedMessage =
      lang === 'gu'
        ? `${sub} માં ${applicant} (${load}) માટે સ્થળ શક્યતા ચકાસણી બાકી છે.`
        : lang === 'hi'
        ? `${sub} में ${applicant} (${load}) के लिए फील्ड व्यवहार्यता जांच लंबित है।`
        : `${sub} मध्ये ${applicant} (${load}) साठी स्थळ व्यवहार्यता तपासणी प्रलंबित आहे.`;
  } else if (
    (m = notif.message.match(
      /^Inspection completed for\s+(.+?)\s+\(([^,]+),\s*([^)]+)\)\.\s*Ready for final sanction release\.$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3].trim(), lang);
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${loadPhrase}, ${sub}) માટે નિરીક્ષણ પૂર્ણ થયું છે. અંતિમ મંજૂરી આપવા માટે તૈયાર.`
        : lang === 'hi'
        ? `${applicant} (${loadPhrase}, ${sub}) के लिए निरीक्षण पूर्ण हो गया है। अंतिम स्वीकृति जारी करने के लिए तैयार।`
        : `${applicant} (${loadPhrase}, ${sub}) साठी निरीक्षण पूर्ण झाले आहे. अंतिम मंजुरी देण्यासाठी तयार.`;
  } else if (
    (m = notif.message.match(
      /^Site inspection passed for\s+(.+?)\s+\((.+)\)\.\s*Ready for final sanction & meter allocation\.$/
    ))
  ) {
    const applicant = m[1];
    const load = localizeLoadAndCategoryPhrase(m[2], lang);
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${load}) માટે સ્થળ નિરીક્ષણ પાસ થયું છે. અંતિમ મંજૂરી અને મીટર ફાળવણી માટે તૈયાર.`
        : lang === 'hi'
        ? `${applicant} (${load}) के लिए स्थल निरीक्षण सफल रहा। अंतिम स्वीकृति एवं मीटर आवंटन के लिए तैयार।`
        : `${applicant} (${load}) साठी स्थळ निरीक्षण उत्तीर्ण झाले आहे. अंतिम मंजुरी आणि मीटर वाटपासाठी तयार.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\(([^,]+),\s*([^)]+)\)\s+connection approved and meter installed\.(?:\s*Consumer No:\s*([^\s(]+)\s*\(Meter #([^)]+)\)\.)?$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3].trim(), lang);
    const cNo = m[4];
    const mNo = m[5];
    const connSuffix = cNo
      ? lang === 'gu'
        ? ` ગ્રાહક નં: ${cNo} (મીટર #${mNo || 'Smart Meter'}).`
        : lang === 'hi'
        ? ` उपभोक्ता क्र: ${cNo} (मीटर #${mNo || 'Smart Meter'})।`
        : ` ग्राहक क्र: ${cNo} (मीटर #${mNo || 'Smart Meter'}).`
      : '';
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${loadPhrase}, ${sub}) વીજ જોડાણ મંજૂર થયું અને મીટર સ્થાપિત કરાયું.${connSuffix}`
        : lang === 'hi'
        ? `${applicant} (${loadPhrase}, ${sub}) कनेक्शन स्वीकृत किया गया और मीटर स्थापित किया गया।${connSuffix}`
        : `${applicant} (${loadPhrase}, ${sub}) वीज जोडणी मंजूर झाली आणि मीटर बसवण्यात आले.${connSuffix}`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\((.+)\)\s+approved and smart meter installed\.$/
    ))
  ) {
    const applicant = m[1];
    const load = localizeLoadAndCategoryPhrase(m[2], lang);
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${load}) મંજૂર કરવામાં આવ્યું અને સ્માર્ટ મીટર સ્થાપિત કરાયું.`
        : lang === 'hi'
        ? `${applicant} (${load}) स्वीकृत किया गया और स्मार्ट मीटर स्थापित किया गया।`
        : `${applicant} (${load}) मंजूर झाले आणि स्मार्ट मीटर बसवण्यात आले.`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\(([^,]+),\s*([^)]+)\)\s+marked Rejected\.\s*Reason:\s*(.+)$/
    ))
  ) {
    const applicant = m[1];
    const loadPhrase = localizeLoadAndCategoryPhrase(m[2], lang);
    const sub = localizeSubdivision(m[3].trim(), lang);
    const reason = m[4];
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${loadPhrase}, ${sub}) નામંજૂર કરવામાં આવ્યું. કારણ: ${reason}`
        : lang === 'hi'
        ? `${applicant} (${loadPhrase}, ${sub}) को अस्वीकृत चिह्नित किया गया। कारण: ${reason}`
        : `${applicant} (${loadPhrase}, ${sub}) नामंजूर म्हणून चिन्हांकित केले. कारण: ${reason}`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\((.+)\)\s+was rejected\.\s*Reason:\s*(.+)$/
    ))
  ) {
    const applicant = m[1];
    const load = localizeLoadAndCategoryPhrase(m[2], lang);
    const reason = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${applicant} (${load}) નામંજૂર કરવામાં આવ્યું. કારણ: ${reason}`
        : lang === 'hi'
        ? `${applicant} (${load}) को अस्वीकृत कर दिया गया। कारण: ${reason}`
        : `${applicant} (${load}) नामंजूर करण्यात आले. कारण: ${reason}`;
  } else if (
    (m = notif.message.match(
      /^(Assigned|Reassigned)\s+to\s+(.+?)\s+by\s+(.+?):\s*(.+)$/
    ))
  ) {
    const isRe = m[1] === 'Reassigned';
    const eng = m[2];
    const actor = m[3];
    const notes = m[4];
    localizedMessage =
      lang === 'gu'
        ? `${actor} દ્વારા ${eng} ને ${isRe ? 'ફરીથી સોંપવામાં આવ્યું' : 'સોંપવામાં આવ્યું'}: ${notes}`
        : lang === 'hi'
        ? `${actor} द्वारा ${eng} को ${isRe ? 'पुनः सौंपा गया' : 'सौंपा गया'}: ${notes}`
        : `${actor} यांच्याद्वारे ${eng} यांच्याकडे ${isRe ? 'पुन्हा सोपवले' : 'सोपवले'}: ${notes}`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer\s+(.+?)\s+\(([^)]+)\)\s+declined assignment for\s+(\S+)\s+on\s+(.+?)\.\s*Reason:\s*"([^"]+)"\.\s*Reassignment required\.$/
    ))
  ) {
    const actor = m[1];
    const actorId = m[2];
    const incId = m[3];
    const time = m[4];
    const reason = m[5];
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${actor} (${actorId}) એ ${time} ના રોજ ${incId} માટેની સોંપણી નકારી છે. કારણ: "${reason}". ફરીથી સોંપણી જરૂરી છે.`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${actor} (${actorId}) ने ${time} को ${incId} के लिए असाइनमेंट अस्वीकार कर दिया। कारण: "${reason}"। पुनः असाइनमेंट आवश्यक है।`
        : `फील्ड अभियंता ${actor} (${actorId}) यांनी ${time} रोजी ${incId} साठी नेमणूक नाकारली. कारण: "${reason}". पुन्हा नेमणूक आवश्यक आहे.`;
  } else if (
    (m = notif.message.match(
      /^Escalated to\s+(.+?)\s+by\s+(.+?):\s*(.+)$/
    ))
  ) {
    const role = m[1];
    const actor = m[2];
    const reason = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${actor} દ્વારા ${role} ને એસ્કેલેટ કરવામાં આવ્યું: ${reason}`
        : lang === 'hi'
        ? `${actor} द्वारा ${role} को एस्केलेट किया गया: ${reason}`
        : `${actor} यांच्याद्वारे ${role} कडे एस्केलेट केले: ${reason}`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer\s+(.+?)\s+\(([^)]+)\)\s+accepted assignment and mobilized to site for\s+(.+)\.$/
    ))
  ) {
    const actor = m[1];
    const actorId = m[2];
    const entity = m[3];
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${actor} (${actorId}) એ સોંપણી સ્વીકારી છે અને ${entity} માટે સ્થળ પર રવાના થયા છે.`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${actor} (${actorId}) ने असाइनमेंट स्वीकार कर लिया है और ${entity} के लिए स्थल पर रवाना हो गए हैं।`
        : `फील्ड अभियंता ${actor} (${actorId}) यांनी नेमणूक स्वीकारली असून ${entity} साठी घटनास्थळी रवाना झाले आहेत.`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer\s+(.+?)\s+\(([^)]+)\)\s+commenced physical on-site inspection for\s+(.+?)\.(?:\s*Notes:\s*(.+))?$/
    ))
  ) {
    const actor = m[1];
    const actorId = m[2];
    const entity = m[3];
    const notes = m[4];
    const notesSuffix = notes
      ? lang === 'gu'
        ? ` નોંધ: ${notes}`
        : lang === 'hi'
        ? ` टिप्पणी: ${notes}`
        : ` शेरा: ${notes}`
      : '';
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${actor} (${actorId}) એ ${entity} માટે પ્રત્યક્ષ સ્થળ નિરીક્ષણ શરૂ કર્યું છે.${notesSuffix}`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${actor} (${actorId}) ने ${entity} के लिए भौतिक स्थल निरीक्षण शुरू किया है।${notesSuffix}`
        : `फील्ड अभियंता ${actor} (${actorId}) यांनी ${entity} साठी प्रत्यक्ष स्थळ निरीक्षण सुरू केले आहे.${notesSuffix}`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer\s+(.+?)\s+\(([^)]+)\)\s+filed technical observations for\s+(\S+):\s*"([^"]+)"\.$/
    ))
  ) {
    const actor = m[1];
    const actorId = m[2];
    const incId = m[3];
    const findings = m[4];
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${actor} (${actorId}) એ ${incId} માટે તકનીકી અવલોકનો નોંધાવ્યા છે: "${findings}".`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${actor} (${actorId}) ने ${incId} के लिए तकनीकी अवलोकन दर्ज किए हैं: "${findings}"।`
        : `फील्ड अभियंता ${actor} (${actorId}) यांनी ${incId} साठी तांत्रिक निरीक्षणे नोंदवली आहेत: "${findings}".`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer\s+(.+?)\s+\(([^)]+)\)\s+requested assistance for\s+(\S+):\s*"([^"]+)"\.$/
    ))
  ) {
    const actor = m[1];
    const actorId = m[2];
    const incId = m[3];
    const notes = m[4];
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${actor} (${actorId}) એ ${incId} માટે સહાયની વિનંતી કરી છે: "${notes}".`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${actor} (${actorId}) ने ${incId} के लिए सहायता का अनुरोध किया है: "${notes}"।`
        : `फील्ड अभियंता ${actor} (${actorId}) यांनी ${incId} साठी मदतीची विनंती केली आहे: "${notes}".`;
  } else if (
    (m = notif.message.match(
      /^Field Engineer\s+(.+?)\s+\(([^)]+)\)\s+submitted final resolution report for\s+(\S+):\s*"([^"]+)"\.$/
    ))
  ) {
    const actor = m[1];
    const actorId = m[2];
    const incId = m[3];
    const report = m[4];
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર ${actor} (${actorId}) એ ${incId} માટે અંતિમ નિવારણ અહેવાલ સબમિટ કર્યો છે: "${report}".`
        : lang === 'hi'
        ? `फील्ड इंजीनियर ${actor} (${actorId}) ने ${incId} के लिए अंतिम समाधान रिपोर्ट प्रस्तुत की है: "${report}"।`
        : `फील्ड अभियंता ${actor} (${actorId}) यांनी ${incId} साठी अंतिम निवारण अहवाल सादर केला आहे: "${report}".`;
  } else if (
    (m = notif.message.match(
      /^Executive concurrence approved by\s+(.+?)\s+\((.+)\)\.\s*Remarks:\s*"([^"]+)"\.$/
    ))
  ) {
    const actor = m[1];
    const desig = m[2];
    const remarks = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${actor} (${desig}) દ્વારા એક્ઝિક્યુટિવ સંમતિ મંજૂર કરવામાં આવી છે. નોંધ: "${remarks}".`
        : lang === 'hi'
        ? `${actor} (${desig}) द्वारा कार्यपालक सहमति अनुमोदित की गई है। टिप्पणी: "${remarks}"।`
        : `${actor} (${desig}) यांच्याद्वारे कार्यकारी सहमती मंजूर करण्यात आली आहे. शेरा: "${remarks}".`;
  } else if (
    (m = notif.message.match(
      /^Executive concurrence rejected by\s+(.+?)\s+\((.+)\)\.\s*Reason:\s*"([^"]+)"\.$/
    ))
  ) {
    const actor = m[1];
    const desig = m[2];
    const reason = m[3];
    localizedMessage =
      lang === 'gu'
        ? `${actor} (${desig}) દ્વારા એક્ઝિક્યુટિવ સંમતિ નામંજૂર કરવામાં આવી છે. કારણ: "${reason}".`
        : lang === 'hi'
        ? `${actor} (${desig}) द्वारा कार्यपालक सहमति अस्वीकृत की गई है। कारण: "${reason}"।`
        : `${actor} (${desig}) यांच्याद्वारे कार्यकारी सहमती नामंजूर करण्यात आली आहे. कारण: "${reason}".`;
  } else if (
    (m = notif.message.match(
      /^Management requested more information for\s+(\S+):\s*"([^"]+)"\.$/
    ))
  ) {
    const incId = m[1];
    const question = m[2];
    localizedMessage =
      lang === 'gu'
        ? `મેનેજમેન્ટે ${incId} માટે વધુ માહિતી માંગી છે: "${question}".`
        : lang === 'hi'
        ? `प्रबंधन ने ${incId} के लिए अधिक जानकारी मांगी है: "${question}"।`
        : `व्यवस्थापनाने ${incId} साठी अधिक माहिती मागवली आहे: "${question}".`;
  } else if (
    (m = notif.message.match(
      /^(.+?)\s+\(([^)]+)\)\s+reported by field engineer:\s*(.+)$/
    ))
  ) {
    const rawFault = m[1].trim();
    const rawClass = m[2].trim();
    const rawRemarks = m[3].trim();
    const faultMap: Record<string, Record<LanguageCode, string>> = {
      'TRANSFORMER OVERHEATING': {
        en: 'TRANSFORMER OVERHEATING',
        gu: 'ટ્રાન્સફોર્મર ઓવરહીટિંગ',
        hi: 'ट्रांसफॉर्मर ओवरहीटिंग',
        mr: 'ट्रान्सफॉर्मर ओव्हरहीटिंग'
      },
      'FEEDER OVERLOAD': {
        en: 'FEEDER OVERLOAD',
        gu: 'ફીડર ઓવરલોડ',
        hi: 'फीडर ओवरलोड',
        mr: 'फीडर ओव्हरलोड'
      },
      'CRITICAL FEEDER OUTAGE': {
        en: 'CRITICAL FEEDER OUTAGE',
        gu: 'ગંભીર ફીડર આઉટેજ',
        hi: 'गंभीर फीडर आउटेज',
        mr: 'गंभीर फीडर आउटेज'
      }
    };
    const classMap: Record<string, Record<LanguageCode, string>> = {
      'EMERGENCY SAFETY OVERRIDE': {
        en: 'EMERGENCY SAFETY OVERRIDE',
        gu: 'તાત્કાલિક સુરક્ષા ઓવરરાઇડ',
        hi: 'आपातकालीन सुरक्षा ओवरराइड',
        mr: 'आपत्कालीन सुरक्षा ओव्हरराइड'
      },
      'Employee Action Required': {
        en: 'Employee Action Required',
        gu: 'કર્મચારી કાર્યવાહી જરૂરી',
        hi: 'कर्मचारी कार्रवाई आवश्यक',
        mr: 'कर्मचारी कार्यवाही आवश्यक'
      }
    };
    const remarksMap: Record<string, Record<LanguageCode, string>> = {
      'Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.': {
        en: 'Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.',
        gu: '100kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર પર ઉચ્ચ થર્મલ સિગ્નેચર (>85°C) અને ઓઇલ લીકેજ જોવા મળ્યું.',
        hi: '100kVA वितरण ट्रांसफॉर्मर पर उच्च थર્મल सिग्नेचर (>85°C) और तेल रिसाव देखा गया।',
        mr: '100kVA वितरण ट्रान्सफॉर्मरवर उच्च थर्मल सिग्नेचर (>85°C) आणि ऑईल गळती आढळली.'
      }
    };
    const faultType = faultMap[rawFault]?.[lang] || rawFault;
    const classification = classMap[rawClass]?.[lang] || rawClass;
    const remarks = remarksMap[rawRemarks]?.[lang] || rawRemarks;
    localizedMessage =
      lang === 'gu'
        ? `ક્ષેત્ર ઇજનેર દ્વારા ${faultType} (${classification}) ની જાણ કરવામાં આવી: ${remarks}`
        : lang === 'hi'
        ? `फील्ड इंजीनियर द्वारा ${faultType} (${classification}) की सूचना दी गई: ${remarks}`
        : `फील्ड अभियंत्याद्वारे ${faultType} (${classification}) ची नोंद करण्यात आली: ${remarks}`;
  } else if (
    notif.message === 'Voltage fluctuation & flicker inspection at 14, Anand Nagar (Pole DP-14).'
  ) {
    localizedMessage =
      lang === 'gu'
        ? '૧૪, આનંદ નગર (પોલ DP-14) ખાતે વોલ્ટેજ વધઘટ અને ફ્લિકર નિરીક્ષણ.'
        : lang === 'hi'
        ? '१४, आनंद नगर (पोल DP-14) पर वोल्टेज उतार-चढ़ाव और फ्लिकर निरीक्षण।'
        : '१४, आनंद नगर (पोल DP-14) येथे व्होल्टेज चढ-उतार आणि फ्लिकर तपासणी.';
  } else if (
    (m = notif.message.match(
      /^Inspect 3-Phase\s+(\S+\s*kW)\s+load feasibility for\s+(\S+)\.$/
    ))
  ) {
    const load = m[1];
    const appId = m[2];
    localizedMessage =
      lang === 'gu'
        ? `${appId} માટે 3-ફેઝ ${load} લોડ શક્યતા તપાસો.`
        : lang === 'hi'
        ? `${appId} के लिए 3-फेज ${load} लोड व्यवहार्यता का निरीक्षण करें।`
        : `${appId} साठी 3-फेज ${load} लोड व्यवहार्यता तपासा.`;
  } else if (
    notif.message === 'DT-GIDC-08 oil temperature >88°C. Immediate load balancing required.'
  ) {
    localizedMessage =
      lang === 'gu'
        ? 'DT-GIDC-08 ઓઇલ તાપમાન >88°C. તાત્કાલિક લોડ બેલેન્સિંગ જરૂરી છે.'
        : lang === 'hi'
        ? 'DT-GIDC-08 तेल तापमान >88°C। तत्काल लोड संतुलन आवश्यक है।'
        : 'DT-GIDC-08 ऑईल तापमान >88°C. तात्काळ लोड बॅलन्सिंग आवश्यक आहे.';
  } else if (
    (m = notif.message.match(
      /^Field inspection and technical report submitted for\s+(.+)\.$/
    ))
  ) {
    const title = m[1];
    localizedMessage =
      lang === 'gu'
        ? `${title} માટે ફિલ્ડ નિરીક્ષણ અને ટેકનિકલ અહેવાલ સબમિટ કરવામાં આવ્યો છે.`
        : lang === 'hi'
        ? `${title} के लिए फील्ड निरीक्षण और तकनीकी रिपोर्ट सबमिट की गई है।`
        : `${title} साठी फील्ड तपासणी आणि तांत्रिक अहवाल सादर करण्यात आला आहे.`;
  }

  return {
    title: localizedTitle,
    message: localizedMessage
  };
}

export function localizeConsumerNotification(
  notif: {
    id: string;
    title: string;
    message: string;
    time: string;
    category: string;
    eventType?: string;
  },
  lang: LanguageCode
): { title: string; message: string; time: string; badgeLabel: string } {
  const rawBadge =
    notif.eventType === 'APPLICATION_APPROVED'
      ? 'Application Approved'
      : notif.eventType === 'APPLICATION_REJECTED'
      ? 'Application Rejected'
      : notif.eventType === 'CLARIFICATION_REQUESTED'
      ? 'Clarification Required'
      : notif.category;

  if (lang === 'en') {
    return {
      title: notif.title,
      message: notif.message,
      time: notif.time,
      badgeLabel: rawBadge
    };
  }

  const { title, message } = localizeNotificationTitleAndMessage(notif, lang);

  return {
    title,
    message,
    time: localizeNotificationTimestamp(notif.time, lang),
    badgeLabel: localizeNotificationStatusBadge(rawBadge, lang)
  };
}

export function localizeConsumptionMonth(month: string, lang: LanguageCode): string {
  if (lang === 'en' || !month) return month;
  const map: Record<string, Record<LanguageCode, string>> = {
    'May 2026': {
      en: 'May 2026',
      gu: 'મે 2026',
      hi: 'मई 2026',
      mr: 'मे 2026'
    },
    'Jun 2026': {
      en: 'Jun 2026',
      gu: 'જૂન 2026',
      hi: 'जून 2026',
      mr: 'जून 2026'
    },
    'Jul 2026': {
      en: 'Jul 2026',
      gu: 'જુલાઈ 2026',
      hi: 'जुलाई 2026',
      mr: 'जुलै 2026'
    },
    'Aug 2026': {
      en: 'Aug 2026',
      gu: 'ઓગસ્ટ 2026',
      hi: 'अगस्त 2026',
      mr: 'ऑगस्ट 2026'
    },
    'Sep 2026': {
      en: 'Sep 2026',
      gu: 'સપ્ટે 2026',
      hi: 'सितं 2026',
      mr: 'सप्टें 2026'
    },
    'Oct 2026 (Est)': {
      en: 'Oct 2026 (Est)',
      gu: 'ઓક્ટો 2026 (અંદાજિત)',
      hi: 'अक्टू 2026 (अनुमानित)',
      mr: 'ऑक्टो 2026 (अंदाजित)'
    }
  };
  return map[month]?.[lang] || month;
}

export function localizeLinkConnectionError(error: string, lang: LanguageCode): string {
  if (lang === 'en' || !error) return error;
  if (error === 'Please enter an 11-digit UGVCL consumer number.') {
    return {
      en: error,
      gu: 'કૃપા કરીને ૧૧-અંકનો UGVCL ગ્રાહક નંબર દાખલ કરો.',
      hi: 'कृपया ११-अंकों का UGVCL उपभोक्ता नंबर दर्ज करें।',
      mr: 'कृपया ११-अंकी UGVCL ग्राहक क्रमांक प्रविष्ट करा.'
    }[lang];
  }
  if (error.includes('is already linked to your account')) {
    const match = error.match(/Consumer number ([0-9-]+)/i);
    const num = match ? match[1] : '';
    return {
      en: error,
      gu: `ગ્રાહક નંબર ${num} તમારા ખાતા સાથે પહેલેથી જ જોડાયેલ છે.`,
      hi: `उपभोक्ता नंबर ${num} आपके खाते से पहले से ही जुड़ा हुआ है।`,
      mr: `ग्राहक क्रमांक ${num} तुमच्या खात्याशी आधीच जोडलेला आहे.`
    }[lang];
  }
  return error;
}
