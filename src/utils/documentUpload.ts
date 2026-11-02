export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MiB (backend remains authoritative)
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'] as const;
export const MAX_DOCUMENT_FILENAME_LENGTH = 120;

const CONTROL_OR_BIDI_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;

export type UploadValidationResult =
  | { valid: true; sanitizedName: string }
  | { valid: false; reason: 'empty' | 'too_large' | 'invalid_name_or_type'; maxBytes: number };

export function sanitizeUploadFilename(rawName: string): string | null {
  if (!rawName || !rawName.trim()) return null;
  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    // Keep rawName if malformed percent sequence; unsafe chars are still sanitized/checked below
  }
  if (CONTROL_OR_BIDI_RE.test(rawName) || CONTROL_OR_BIDI_RE.test(decoded)) {
    return null;
  }

  const parts = decoded.replace(/\\/g, '/').split('/');
  const basename = (parts[parts.length - 1] || '').trim();
  if (!basename || basename === '.' || basename === '..') return null;

  const withoutLeadingDots = basename.replace(/^\.+/, '');
  if (!withoutLeadingDots) return null;

  const lastDot = withoutLeadingDots.lastIndexOf('.');
  if (lastDot <= 0) return null;

  const ext = withoutLeadingDots.slice(lastDot).toLowerCase();
  if (!(ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return null;
  }

  const rawStem = withoutLeadingDots.slice(0, lastDot);
  const cleanStem = rawStem
    .normalize('NFKC')
    .replace(/\./g, '_')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');

  if (!cleanStem || !/[A-Za-z0-9]/.test(cleanStem)) {
    return null;
  }

  const maxStemLen = MAX_DOCUMENT_FILENAME_LENGTH - ext.length;
  const truncatedStem =
    cleanStem.length > maxStemLen
      ? cleanStem.slice(0, maxStemLen).replace(/[_-]+$/g, '')
      : cleanStem;

  if (!truncatedStem) return null;
  return `${truncatedStem}${ext}`;
}

export function validateDocumentUpload(
  file: { name: string; size: number },
  maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES
): UploadValidationResult {
  const sanitizedName = sanitizeUploadFilename(file.name);
  if (!sanitizedName) {
    return { valid: false, reason: 'invalid_name_or_type', maxBytes };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, reason: 'empty', maxBytes };
  }
  if (file.size > maxBytes) {
    return { valid: false, reason: 'too_large', maxBytes };
  }
  return { valid: true, sanitizedName };
}

export const uploadPolicyText = {
  en: {
    attachLabel: 'Attach supporting document (optional live upload)',
    hint: 'Allowed: PDF, JPG, JPEG, PNG, TXT · Max size: 5 MB (server enforces configured limit and sanitizes filenames).',
    selectedPrefix: 'Sanitized upload filename:',
    removeBtn: 'Remove file',
    empty: 'Selected document is empty (0 bytes). Choose a non-empty file.',
    too_large: 'Selected document exceeds the 5 MB upload limit.',
    invalid_name_or_type: 'Unsupported file type or invalid filename. Use PDF, JPG, JPEG, PNG, or TXT.',
    serverRejected: 'The backend rejected the uploaded document (size or filename check failed).',
  },
  gu: {
    attachLabel: 'આધારભૂત દસ્તાવેજ જોડો (વૈકલ્પિક લાઇવ અપલોડ)',
    hint: 'માન્ય: PDF, JPG, JPEG, PNG, TXT · મહત્તમ કદ: 5 MB (સર્વર કદ મર્યાદા અને ફાઇલનામ ચકાસે છે).',
    selectedPrefix: 'સ્વચ્છ કરેલ ફાઇલનામ:',
    removeBtn: 'ફાઇલ દૂર કરો',
    empty: 'પસંદ કરેલ દસ્તાવેજ ખાલી છે (0 બાઇટ). યોગ્ય ફાઇલ પસંદ કરો.',
    too_large: 'પસંદ કરેલ દસ્તાવેજ 5 MB અપલોડ મર્યાદા કરતાં મોટો છે.',
    invalid_name_or_type: 'અમાન્ય ફાઇલ પ્રકાર અથવા ફાઇલનામ. PDF, JPG, JPEG, PNG અથવા TXT વાપરો.',
    serverRejected: 'બેકએન્ડે અપલોડ કરેલ દસ્તાવેજ નકાર્યો (કદ અથવા ફાઇલનામ ચકાસણી નિષ્ફળ).',
  },
  hi: {
    attachLabel: 'सहायक दस्तावेज़ जोड़ें (वैकल्पिक लाइव अपलोड)',
    hint: 'मान्य: PDF, JPG, JPEG, PNG, TXT · अधिकतम आकार: 5 MB (सर्वर आकार सीमा और फ़ाइलनाम की जाँच करता है)।',
    selectedPrefix: 'स्वच्छ किया गया फ़ाइलनाम:',
    removeBtn: 'फ़ाइल हटाएँ',
    empty: 'चुना गया दस्तावेज़ खाली है (0 बाइट)। गैर-खाली फ़ाइल चुनें।',
    too_large: 'चुना गया दस्तावेज़ 5 MB अपलोड सीमा से बड़ा है।',
    invalid_name_or_type: 'अमान्य फ़ाइल प्रकार या फ़ाइलनाम। PDF, JPG, JPEG, PNG या TXT का उपयोग करें।',
    serverRejected: 'बैकएंड ने अपलोड किए गए दस्तावेज़ को अस्वीकार कर दिया (आकार या फ़ाइलनाम जाँच विफल)।',
  },
  mr: {
    attachLabel: 'सहाय्यक दस्तऐवज जोडा (ऐच्छिक लाइव्ह अपलोड)',
    hint: 'मान्य: PDF, JPG, JPEG, PNG, TXT · कमाल आकार: 5 MB (सर्व्हर आकार मर्यादा व फाइलनाव तपासतो).',
    selectedPrefix: 'स्वच्छ केलेले फाइलनाव:',
    removeBtn: 'फाइल काढा',
    empty: 'निवडलेला दस्तऐवज रिकामा आहे (0 बाइट). योग्य फाइल निवडा.',
    too_large: 'निवडलेला दस्तऐवज 5 MB अपलोड मर्यादेपेक्षा मोठा आहे.',
    invalid_name_or_type: 'अवैध फाइल प्रकार किंवा फाइलनाव. PDF, JPG, JPEG, PNG किंवा TXT वापरा.',
    serverRejected: 'बॅकएंडने अपलोड केलेला दस्तऐवज नाकारला (आकार किंवा फाइलनाव तपासणी अयशस्वी).',
  },
} as const;
