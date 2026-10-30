import type { LanguageCode } from '../i18n/types';

export interface ValidationIssue { code: string; message: string; threshold_kw?: number }

type PolicyText = {
  input: string; slider: string; loading: string; unavailable: string; retry: string;
  invalid: string; threshold: (n: number) => string; review: string;
  issues: Record<string, string>; reviewIssue: (n: number) => string;
};

export const policyText: Record<LanguageCode, PolicyText> = {
  en: {
    input: 'Requested load (kW)', slider: 'Quick selection (1 to 50 kW)', loading: 'Loading demo review threshold…',
    unavailable: 'Demo review threshold unavailable. The backend will check the load when you submit.', retry: 'Retry',
    invalid: 'Enter a finite load greater than zero.', threshold: n => `Demo review threshold: ${n} kW. This is not an official UGVCL limit.`,
    review: 'Above the demo threshold: the live request will be flagged for manual review.',
    issues: { APPLICANT_NAME_REQUIRED: 'Applicant name is missing.', PHONE_INVALID: 'A valid 10-digit phone number is required.', ADDRESS_REQUIRED: 'Address is missing.', LOAD_NONPOSITIVE: 'Requested load must be greater than zero.', DOCUMENT_REQUIRED: 'A supporting document is required for a new connection.' },
    reviewIssue: n => `Load exceeds the ${n} kW demo review threshold; manual review is required. This is not an official UGVCL limit.`,
  },
  gu: {
    input: 'માગેલ લોડ (kW)', slider: 'ઝડપી પસંદગી (1 થી 50 kW)', loading: 'ડેમો સમીક્ષા મર્યાદા લોડ થઈ રહી છે…',
    unavailable: 'ડેમો સમીક્ષા મર્યાદા ઉપલબ્ધ નથી. અરજી મોકલતી વખતે બેકએન્ડ લોડ તપાસશે.', retry: 'ફરી પ્રયાસ કરો',
    invalid: 'શૂન્યથી વધુ મર્યાદિત સંખ્યા દાખલ કરો.', threshold: n => `ડેમો સમીક્ષા મર્યાદા: ${n} kW. આ UGVCLની સત્તાવાર મર્યાદા નથી.`,
    review: 'ડેમો મર્યાદાથી વધુ: લાઇવ અરજી મેન્યુઅલ સમીક્ષા માટે ચિહ્નિત થશે.',
    issues: { APPLICANT_NAME_REQUIRED: 'અરજદારનું નામ નથી.', PHONE_INVALID: 'માન્ય 10 અંકનો ફોન નંબર જરૂરી છે.', ADDRESS_REQUIRED: 'સરનામું નથી.', LOAD_NONPOSITIVE: 'માગેલ લોડ શૂન્યથી વધુ હોવો જોઈએ.', DOCUMENT_REQUIRED: 'નવા જોડાણ માટે દસ્તાવેજ જરૂરી છે.' },
    reviewIssue: n => `લોડ ${n} kWની ડેમો સમીક્ષા મર્યાદાથી વધુ છે; મેન્યુઅલ સમીક્ષા જરૂરી છે. આ UGVCLની સત્તાવાર મર્યાદા નથી.`,
  },
  hi: {
    input: 'मांगा गया लोड (kW)', slider: 'त्वरित चयन (1 से 50 kW)', loading: 'डेमो समीक्षा सीमा लोड हो रही है…',
    unavailable: 'डेमो समीक्षा सीमा उपलब्ध नहीं है। आवेदन भेजने पर बैकएंड लोड की जाँच करेगा।', retry: 'फिर कोशिश करें',
    invalid: 'शून्य से बड़ी परिमित संख्या दर्ज करें।', threshold: n => `डेमो समीक्षा सीमा: ${n} kW। यह UGVCL की आधिकारिक सीमा नहीं है।`,
    review: 'डेमो सीमा से अधिक: लाइव आवेदन मैनुअल समीक्षा के लिए चिह्नित होगा।',
    issues: { APPLICANT_NAME_REQUIRED: 'आवेदक का नाम नहीं है।', PHONE_INVALID: 'मान्य 10 अंकों का फ़ोन नंबर आवश्यक है।', ADDRESS_REQUIRED: 'पता नहीं है।', LOAD_NONPOSITIVE: 'मांगा गया लोड शून्य से अधिक होना चाहिए।', DOCUMENT_REQUIRED: 'नए कनेक्शन के लिए दस्तावेज़ आवश्यक है।' },
    reviewIssue: n => `लोड ${n} kW की डेमो समीक्षा सीमा से अधिक है; मैनुअल समीक्षा आवश्यक है। यह UGVCL की आधिकारिक सीमा नहीं है।`,
  },
  mr: {
    input: 'मागितलेला भार (kW)', slider: 'जलद निवड (1 ते 50 kW)', loading: 'डेमो पुनरावलोकन मर्यादा लोड होत आहे…',
    unavailable: 'डेमो पुनरावलोकन मर्यादा उपलब्ध नाही. अर्ज पाठवल्यावर बॅकएंड भार तपासेल.', retry: 'पुन्हा प्रयत्न करा',
    invalid: 'शून्यापेक्षा मोठी परिमित संख्या प्रविष्ट करा.', threshold: n => `डेमो पुनरावलोकन मर्यादा: ${n} kW. ही UGVCL ची अधिकृत मर्यादा नाही.`,
    review: 'डेमो मर्यादेपेक्षा जास्त: लाइव्ह अर्ज मॅन्युअल पुनरावलोकनासाठी चिन्हांकित होईल.',
    issues: { APPLICANT_NAME_REQUIRED: 'अर्जदाराचे नाव नाही.', PHONE_INVALID: 'वैध 10 अंकी फोन क्रमांक आवश्यक आहे.', ADDRESS_REQUIRED: 'पत्ता नाही.', LOAD_NONPOSITIVE: 'मागितलेला भार शून्यापेक्षा जास्त असावा.', DOCUMENT_REQUIRED: 'नवीन जोडणीसाठी दस्तऐवज आवश्यक आहे.' },
    reviewIssue: n => `भार ${n} kW च्या डेमो पुनरावलोकन मर्यादेपेक्षा जास्त आहे; मॅन्युअल पुनरावलोकन आवश्यक आहे. ही UGVCL ची अधिकृत मर्यादा नाही.`,
  },
};

export function validLoad(value: string): boolean {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n > 0 && Number.isFinite(n * 1950 + 2100);
}

export function formatValidationIssue(issue: ValidationIssue, language: LanguageCode): string {
  const text = policyText[language];
  if (issue.code === 'DEMO_LOAD_REVIEW' && typeof issue.threshold_kw === 'number' && Number.isFinite(issue.threshold_kw)) {
    return text.reviewIssue(issue.threshold_kw);
  }
  return text.issues[issue.code] || issue.message;
}

export function requiresDemoReview(load: number, threshold: number): boolean {
  return Number.isFinite(load) && load > 0 && Number.isFinite(threshold) && threshold > 0 && load > threshold;
}
