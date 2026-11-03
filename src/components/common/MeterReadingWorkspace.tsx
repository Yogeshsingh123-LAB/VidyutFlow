import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  Crop,
  FileCheck2,
  Gauge,
  RefreshCw,
  RotateCw,
  Sliders,
  Upload,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeMeterNotification,
  localizePhase11Status
} from '../../i18n/meterPhase11Translations';
import {
  extractMeterReading,
  prepareMeterPhoto,
  validateMeterPhoto,
  type NormalizedCropBox,
  sanitizeCropBox
} from '../../services/meterOcr';
import {
  normalizeDisplayedReading,
  type MeterConfiguration,
  type MeterReadingRecord,
  type MeterReadingSubmission
} from '../../services/meterReading';
import { enqueueOfflineMeterReading, isFieldEffectivelyOffline } from '../../utils/offlineFieldSync';
import { validateExistingBill } from '../../services/billingValidation';

type Copy = {
  title: string; subtitle: string; open: string; close: string; connection: string; meter: string;
  reading: string; date: string; multiplier: string; precision: string; config: string; saveConfig: string;
  configVersion: string; takePhoto: string; capturePhoto: string; closeCamera: string; gallery: string;
  photoHelp: string; rotate: string; runOcr: string; readingCheck: string; identityCheck: string;
  localOcr: string; submit: string; pending: string; review: string; approve: string; reject: string;
  reread: string; note: string; noReadings: string; metrics: string; anomalies: string; history: string;
  confidence: string; billReview: string; expected: string; recorded: string; demo: string; privacy: string;
  queuedOffline: string; loading: string; error: string; retry: string; notifications: string; configHelp: string;
  crop: string; applyCrop: string; resetCrop: string; cropActive: string; cropHelp: string; retake: string;
  replacePhoto: string; croppedPreview: string; originalPhoto: string; ambiguousWarning: string;
  ambiguousHelp: string; useProposed: string;
};
const EVENT_COPY = {
  en: { label: 'Reading event', ordinary: 'Ordinary', replacement: 'Meter replaced', rollover: 'Meter rollover', limit: 'Rollover limit' },
  gu: { label: 'રીડિંગ ઘટના', ordinary: 'સામાન્ય', replacement: 'મીટર બદલાયું', rollover: 'મીટર રોલઓવર', limit: 'રોલઓવર મર્યાદા' },
  hi: { label: 'रीडिंग घटना', ordinary: 'सामान्य', replacement: 'मीटर बदला गया', rollover: 'मीटर रोलओवर', limit: 'रोलओवर सीमा' },
  mr: { label: 'रीडिंग घटना', ordinary: 'सामान्य', replacement: 'मीटर बदलले', rollover: 'मीटर रोलओव्हर', limit: 'रोलओव्हर मर्यादा' }
} as const;
const COPY: Record<'en' | 'gu' | 'hi' | 'mr', Copy> = {
  en: {
    title: 'Meter Reading & Bill Review', subtitle: 'Photo assisted readings with human approval and explainable checks.',
    open: 'Open meter workspace', close: 'Close', connection: 'Connection', meter: 'Meter number',
    reading: 'Reading shown on meter', date: 'Reading date', multiplier: 'Meter multiplier', precision: 'Decimal places',
    config: 'Meter configuration', saveConfig: 'Save meter configuration', configVersion: 'Configuration version',
    takePhoto: 'Take a photo', capturePhoto: 'Capture photo', closeCamera: 'Close camera', gallery: 'Choose from gallery',
    photoHelp: 'Frame the complete display and meter label. JPEG, PNG or WebP up to 5 MiB.', rotate: 'Rotate',
    runOcr: 'Read photo on this device', readingCheck: 'Review the detected digits. Correct them before submission if needed.',
    identityCheck: 'The meter label is not treated as verified unless a reviewer confirms it.',
    localOcr: 'OCR runs on this device. The image is not sent to an AI provider. The English OCR model may download from the Tesseract project CDN on first use.',
    submit: 'Submit for employee review', pending: 'Pending review', review: 'Readings to review',
    approve: 'Approve reading', reject: 'Reject', reread: 'Request re-reading', note: 'Review note',
    noReadings: 'No meter readings have been submitted.', metrics: 'Reading quality overview', anomalies: 'Review flags',
    history: 'Verified history', confidence: 'OCR confidence', billReview: 'Read-only bill validation',
    expected: 'Expected', recorded: 'Recorded', demo: 'DEMO data · not an official UGVCL billing decision',
    privacy: 'Photos are re-encoded to remove metadata and held privately in the demo server memory. They are unavailable after that server restarts.',
    queuedOffline: 'Reading and photo saved in the Field Engineer offline queue.', loading: 'Working…',
    error: 'The request could not be completed.', retry: 'Try again', notifications: 'Notifications',
    configHelp: 'Configure these values from the meter nameplate or verified utility records. Seeded demo defaults are not verified meter specifications.',
    crop: 'Crop display', applyCrop: 'Apply crop', resetCrop: 'Reset crop', cropActive: 'Crop applied',
    cropHelp: 'Frame only the meter reading counter to eliminate surrounding glare or label text.',
    retake: 'Retake photo', replacePhoto: 'Replace photo', croppedPreview: 'Framed counter preview',
    originalPhoto: 'Original photo', ambiguousWarning: 'Ambiguous characters detected',
    ambiguousHelp: 'Some characters resemble letters (e.g. B for 8, O for 0). Check and correct the digits before submission.',
    useProposed: 'Use'
  },
  gu: {
    title: 'મીટર રીડિંગ અને બિલ સમીક્ષા', subtitle: 'ફોટોથી સહાયિત રીડિંગ, માનવીય મંજૂરી અને સમજાવી શકાય તેવી તપાસ.',
    open: 'મીટર વર્કસ્પેસ ખોલો', close: 'બંધ કરો', connection: 'કનેક્શન', meter: 'મીટર નંબર',
    reading: 'મીટર પરનું રીડિંગ', date: 'રીडिंगની તારીખ', multiplier: 'મીટર ગુણક', precision: 'દશાંશ સ્થાન',
    config: 'મીટર ગોઠવણી', saveConfig: 'મીટર ગોઠવણી સાચવો', configVersion: 'ગોઠવણી આવૃત્તિ',
    takePhoto: 'ફોટો લો', capturePhoto: 'ફોટો કેપ્ચર કરો', closeCamera: 'કેમેરા બંધ કરો', gallery: 'ગેલેરીમાંથી પસંદ કરો',
    photoHelp: 'આખું ડિસ્પ્લે અને મીટર લેબલ ફ્રેમમાં લો. 5 MiB સુધી JPEG, PNG અથવા WebP.', rotate: 'ફેરવો',
    runOcr: 'આ ઉપકરણ પર ફોટો વાંચો', readingCheck: 'મળેલા અંકો તપાસો. સબમિટ કરતાં પહેલાં જરૂર હોય તો સુધારો.',
    identityCheck: 'સમીક્ષક પુષ્ટિ કરે ત્યાં સુધી મીટર લેબલ ચકાસાયેલ ગણાતું નથી.',
    localOcr: 'OCR આ ઉપકરણ પર ચાલે છે. ફોટો AI પ્રદાતાને મોકલાતો નથી. પ્રથમ ઉપયોગે અંગ્રેજી OCR મોડેલ Tesseract CDN પરથી ડાઉનલોડ થઈ શકે છે.',
    submit: 'કર્મચારી સમીક્ષા માટે મોકલો', pending: 'સમીક્ષા બાકી', review: 'સમીક્ષા માટેના રીડિંગ',
    approve: 'રીડિંગ મંજૂર કરો', reject: 'નકારો', reread: 'ફરીથી રીડિંગ માંગો', note: 'સમીક્ષા નોંધ',
    noReadings: 'કોઈ મીટર રીડિંગ સબમિટ થયું નથી.', metrics: 'રીડિંગ ગુણવત્તા સારાંશ', anomalies: 'સમીક્ષા ચિહ્નો',
    history: 'ચકાસાયેલ ઇતિહાસ', confidence: 'OCR વિશ્વાસ', billReview: 'ફક્ત વાંચવા માટે બિલ તપાસ',
    expected: 'અપેક્ષિત', recorded: 'નોંધાયેલ', demo: 'DEMO ડેટા · સત્તાવાર UGVCL બિલિંગ નિર્ણય નથી',
    privacy: 'મેટાડેટા દૂર કરવા ફોટો ફરી એન્કોડ થાય છે અને ડેમો સર્વર મેમરીમાં ખાનગી રહે છે. સર્વર ફરી શરૂ થાય પછી ઉપલબ્ધ નહીં હોય.',
    queuedOffline: 'રીडिंग અને ફોટો Field Engineer ઓફલાઇન કતારમાં સાચવ્યા.', loading: 'પ્રક્રિયા ચાલુ…',
    error: 'વિનંતી પૂર્ણ થઈ શકી નથી.', retry: 'ફરી પ્રયાસ કરો', notifications: 'સૂચનાઓ',
    configHelp: 'મીટર પ્લેટ અથવા ચકાસેલા યુટિલિટી રેકોર્ડ મુજબ આ મૂલ્યો ગોઠવો. ડેમોના મૂળભૂત મૂલ્યો ચકાસેલી મીટર વિગતો નથી.',
    crop: 'ડિસ્પ્લે ક્રોપ કરો', applyCrop: 'ક્રોપ લાગુ કરો', resetCrop: 'ક્રોપ રીસેટ કરો', cropActive: 'ક્રોપ કરેલ',
    cropHelp: 'આજુબાજુના લખાણને બદલે ફક્ત મીટરના અંક ડિસ્પ્લે પર ધ્યાન કેન્દ્રિત કરો.',
    retake: 'ફરી ફોટો લો', replacePhoto: 'ફોટો બદલો', croppedPreview: 'ક્રોપ કરેલ ડિસ્પ્લે',
    originalPhoto: 'મૂળ આખો ફોટો', ambiguousWarning: 'અસ્પષ્ટ અક્ષરો જણાયા',
    ambiguousHelp: 'કેટલાક અક્ષરો અંક જેવા અક્ષરો (જેમ કે 8 માટે B, 0 માટે O) હોઈ શકે છે. સબમિટ કરતાં પહેલાં તપાસો.',
    useProposed: 'વાપરો'
  },
  hi: {
    title: 'मीटर रीडिंग और बिल समीक्षा', subtitle: 'फोटो से सहायता, मानव स्वीकृति और समझने योग्य जाँच।',
    open: 'मीटर कार्यक्षेत्र खोलें', close: 'बंद करें', connection: 'कनेक्शन', meter: 'मीटर नंबर',
    reading: 'मीटर पर दिखी रीडिंग', date: 'रीडिंग की तारीख', multiplier: 'मीटर गुणक', precision: 'दशमलव स्थान',
    config: 'मीटर कॉन्फ़िगरेशन', saveConfig: 'मीटर कॉन्फ़िगरेशन सहेजें', configVersion: 'कॉन्फ़िगरेशन संस्करण',
    takePhoto: 'फोटो लें', capturePhoto: 'फोटो कैप्चर करें', closeCamera: 'कैमरा बंद करें', gallery: 'गैलरी से चुनें',
    photoHelp: 'पूरा डिस्प्ले और मीटर लेबल फ्रेम में रखें। 5 MiB तक JPEG, PNG या WebP।', rotate: 'घुमाएँ',
    runOcr: 'इस डिवाइस पर फोटो पढ़ें', readingCheck: 'पहचाने गए अंक जाँचें। सबमिट करने से पहले ज़रूरत हो तो सुधारें।',
    identityCheck: 'समीक्षक की पुष्टि तक मीटर लेबल सत्यापित नहीं माना जाएगा।',
    localOcr: 'OCR इसी डिवाइस पर चलता है। फोटो किसी AI प्रदाता को नहीं भेजी जाती। पहली बार अंग्रेज़ी OCR मॉडल Tesseract CDN से डाउनलोड हो सकता है।',
    submit: 'कर्मचारी समीक्षा के लिए भेजें', pending: 'समीक्षा लंबित', review: 'समीक्षा हेतु रीडिंग',
    approve: 'रीडिंग स्वीकृत करें', reject: 'अस्वीकार करें', reread: 'दोबारा रीडिंग माँगें', note: 'समीक्षा टिप्पणी',
    noReadings: 'कोई मीटर रीडिंग सबमिट नहीं हुई।', metrics: 'रीडिंग गुणवत्ता सारांश', anomalies: 'समीक्षा संकेत',
    history: 'सत्यापित इतिहास', confidence: 'OCR विश्वास', billReview: 'केवल-पठन बिल जाँच',
    expected: 'अपेक्षित', recorded: 'दर्ज', demo: 'DEMO डेटा · आधिकारिक UGVCL बिलिंग निर्णय नहीं',
    privacy: 'मेटाडेटा हटाने के लिए फोटो दोबारा एन्कोड होती है और डेमो सर्वर मेमोरी में निजी रहती है। सर्वर रीस्टार्ट के बाद उपलब्ध नहीं होगी।',
    queuedOffline: 'रीडिंग और फोटो Field Engineer ऑफलाइन कतार में सहेजी गई।', loading: 'काम हो रहा है…',
    error: 'अनुरोध पूरा नहीं हुआ।', retry: 'फिर प्रयास करें', notifications: 'सूचनाएँ',
    configHelp: 'मीटर नेमप्लेट या सत्यापित उपयोगिता रिकॉर्ड से ये मान तय करें। डेमो के शुरुआती मान सत्यापित मीटर विनिर्देश नहीं हैं।',
    crop: 'डिस्प्ले क्रॉप करें', applyCrop: 'क्रॉप लागू करें', resetCrop: 'क्रॉप रीसेट करें', cropActive: 'क्रॉप लागू',
    cropHelp: 'आसपास के लेबल को छोड़ केवल मीटर रीडिंग डिस्प्ले को फ्रेम करें।',
    retake: 'दोबारा फोटो लें', replacePhoto: 'फोटो बदलें', croppedPreview: 'क्रॉप किया डिस्प्ले',
    originalPhoto: 'मूल पूरा फोटो', ambiguousWarning: 'संदिग्ध वर्ण पहचाने गए',
    ambiguousHelp: 'कुछ वर्ण अंकों जैसे दिखने वाले अक्षर (जैसे 8 के लिए B, 0 के लिए O) हो सकते हैं। सबमिट करने से पहले जाँचें।',
    useProposed: 'उपयोग करें'
  },
  mr: {
    title: 'मीटर रीडिंग आणि बिल पुनरावलोकन', subtitle: 'फोटो सहाय्यित रीडिंग, मानवी मंजुरी आणि समजण्याजोग्या तपासण्या.',
    open: 'मीटर कार्यक्षेत्र उघडा', close: 'बंद करा', connection: 'जोडणी', meter: 'मीटर क्रमांक',
    reading: 'मीटरवरील रीडिंग', date: 'रीडिंगची तारीख', multiplier: 'मीटर गुणक', precision: 'दशांश स्थाने',
    config: 'मीटर संरचना', saveConfig: 'मीटर संरचना जतन करा', configVersion: 'संरचना आवृत्ती',
    takePhoto: 'फोटो काढा', capturePhoto: 'फोटो टिपा', closeCamera: 'कॅमेरा बंद करा', gallery: 'गॅलरीतून निवडा',
    photoHelp: 'पूर्ण डिस्प्ले आणि मीटर लेबल फ्रेममध्ये घ्या. 5 MiB पर्यंत JPEG, PNG किंवा WebP.', rotate: 'फिरवा',
    runOcr: 'या उपकरणावर फोटो वाचा', readingCheck: 'ओळखलेले अंक तपासा. सबमिट करण्यापूर्वी आवश्यक असल्यास दुरुस्त करा.',
    identityCheck: 'पुनरावलोककाने खात्री करेपर्यंत मीटर लेबल पडताळलेले मानले जाणार नाही.',
    localOcr: 'OCR या उपकरणावर चालते. फोटो AI पुरवठादाराकडे पाठवला जात नाही. पहिल्या वापरावेळी इंग्रजी OCR मॉडेल Tesseract CDN वरून डाउनलोड होऊ शकते.',
    submit: 'कर्मचारी पुनरावलोकनासाठी पाठवा', pending: 'पुनरावलोकन बाकी', review: 'पुनरावलोकनासाठी रीडिंग',
    approve: 'रीडिंग मंजूर करा', reject: 'नकारा', reread: 'पुन्हा रीडिंग मागवा', note: 'पुनरावलोकन नोंद',
    noReadings: 'कोणतेही मीटर रीडिंग सबमिट केलेले नाही.', metrics: 'रीडिंग गुणवत्ता सारांश', anomalies: 'पुनरावलोकन सूचना',
    history: 'पडताळलेला इतिहास', confidence: 'OCR विश्वास', billReview: 'केवळ-वाचन बिल तपासणी',
    expected: 'अपेक्षित', recorded: 'नोंदलेले', demo: 'DEMO डेटा · अधिकृत UGVCL बिलिंग निर्णय नाही',
    privacy: 'मेटाडेटा काढण्यासाठी फोटो पुन्हा एन्कोड केला जातो आणि डेमो सर्व्हर मेमरीमध्ये खाजगी ठेवला जातो. सर्व्हर रीस्टार्टनंतर उपलब्ध नसेल.',
    queuedOffline: 'रीडिंग आणि फोटो Field Engineer ऑफलाइन रांगेत जतन केले.', loading: 'काम सुरू आहे…',
    error: 'विनंती पूर्ण होऊ शकली नाही.', retry: 'पुन्हा प्रयत्न करा', notifications: 'सूचना',
    configHelp: 'मीटर नेमप्लेट किंवा पडताळलेल्या उपयोगिता नोंदींवरून ही मूल्ये ठरवा. डेमोचे सुरुवातीचे मूल्य हे पडताळलेले मीटर तपशील नाहीत.',
    crop: 'डिस्प्ले क्रॉप करा', applyCrop: 'क्रॉप लागू करा', resetCrop: 'क्रॉप रीसेट करा', cropActive: 'क्रॉप लागू',
    cropHelp: 'आजूबाजूचा मजकूर वगळून फक्त मीटर रीडिंग काउंटर फ्रेम करा.',
    retake: 'पुन्हा फोटो काढा', replacePhoto: 'फोटो बदला', croppedPreview: 'क्रॉप केलेले डिस्प्ले',
    originalPhoto: 'मूळ पूर्ण फोटो', ambiguousWarning: 'संदिग्ध अक्षरे आढळली',
    ambiguousHelp: 'काही अक्षरे अंकांसारखी दिसणारी अक्षरे (उदा. 8 साठी B, 0 साठी O) असू शकतात. सबमिट करण्यापूर्वी तपासा.',
    useProposed: 'प्रस्तावित वापरा'
  }
};

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: { ...(body ? { 'Content-Type': 'application/json', 'X-VidyutFlow-CSRF': '1' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload as T;
}

export interface MeterReadingWorkspaceProps {
  initialOpen?: boolean;
  initialConnectionNo?: string;
  onClose?: () => void;
}

export const MeterReadingWorkspace: React.FC<MeterReadingWorkspaceProps> = ({
  initialOpen = false,
  initialConnectionNo,
  onClose
}) => {
  const { currentRole, demoSession, activeUser, connections, userConnections, userBills, userPayments, bills, payments, workOrders, showToast, isOfflineSimulated } = useApp();
  const { language, t } = useLanguage();
  const mp = t.meterPhase11;
  const text = COPY[language];
  const eventText = EVENT_COPY[language];
  const [open, setOpen] = useState(initialOpen);
  const [records, setRecords] = useState<MeterReadingRecord[]>([]);
  const [meterNotifications, setMeterNotifications] = useState<{ id: string; title: string; message: string; time: string; type: string }[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [connectionNo, setConnectionNo] = useState(initialConnectionNo || '');
  const [reading, setReading] = useState('');
  const [readingAt, setReadingAt] = useState(new Date().toISOString().slice(0, 10));
  const [meterEvent, setMeterEvent] = useState<'ordinary' | 'replacement' | 'rollover'>('ordinary');

  useEffect(() => {
    if (initialConnectionNo) {
      setConnectionNo(initialConnectionNo);
    }
  }, [initialConnectionNo]);
  const [file, setFile] = useState<File | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const cameraVideo = useRef<HTMLVideoElement>(null);
  const requestedPhotoIds = useRef<Set<string>>(new Set());
  const [preview, setPreview] = useState('');
  const [photoPayload, setPhotoPayload] = useState('');
  const [rotation, setRotation] = useState(0);
  const [cropBox, setCropBox] = useState<NormalizedCropBox>({ x: 0.1, y: 0.25, width: 0.8, height: 0.4 });
  const [isCropMode, setIsCropMode] = useState(false);
  const [isCropApplied, setIsCropApplied] = useState(false);
  const [croppedPreview, setCroppedPreview] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState<'full' | 'cropped'>('full');
  const [ocr, setOcr] = useState<MeterReadingSubmission['ocr']>();
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewPhotos, setReviewPhotos] = useState<Record<string, string>>({});
  const [thresholds, setThresholds] = useState<{ version: number; minimumHistory: number; highDailyRatio: number; lowDailyRatio: number; highDailyUnits: number } | null>(null);
  const [meterConfiguration, setMeterConfiguration] = useState<MeterConfiguration | null>(null);
  const isStaffReview = currentRole === 'employee' || currentRole === 'admin';
  const candidates = useMemo(() => currentRole === 'consumer' ? userConnections : currentRole === 'field' ? connections.filter(conn => workOrders.some(wo => wo.consumerNo === conn.consumerNo && wo.assignedTo.toLowerCase().includes(activeUser.name.toLowerCase()))) : connections, [activeUser.name, connections, currentRole, userConnections, workOrders]);
  const selectedConnection = candidates.find(conn => conn.consumerNo === connectionNo) || candidates[0];
  const visibleBills = currentRole === 'consumer' ? userBills : bills;
  const visiblePayments = currentRole === 'consumer' ? userPayments : payments;

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideo.current) cameraVideo.current.srcObject = null;
    setCameraStream(prev => {
      prev?.getTracks().forEach(track => track.stop());
      return null;
    });
  };

  useEffect(() => {
    if (open && cameraVideo.current && cameraStream) {
      cameraVideo.current.srcObject = cameraStream;
    }
  }, [open, cameraStream]);

  useEffect(() => {
    if (!open || (currentRole !== 'consumer' && currentRole !== 'field')) {
      closeCamera();
    }
  }, [open, currentRole, demoSession?.user.id]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    if (preview) URL.revokeObjectURL(preview);
    if (croppedPreview) URL.revokeObjectURL(croppedPreview);
  }, []);

  const resetImageState = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (croppedPreview) URL.revokeObjectURL(croppedPreview);
    setFile(null);
    setPreview('');
    setCroppedPreview('');
    setPhotoPayload('');
    setOcr(undefined);
    setRotation(0);
    setIsCropMode(false);
    setIsCropApplied(false);
    setActivePreviewTab('full');
    setCropBox({ x: 0.1, y: 0.25, width: 0.8, height: 0.4 });
    setError('');
  };

  const startCamera = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost and a browser that supports camera access.');
      closeCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!openRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open the camera. Check browser camera permission and try again.');
    }
  };

  const captureCameraPhoto = () => {
    const video = cameraVideo.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setError('Camera is still starting. Try again in a moment.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) { setError('The camera photo could not be captured.'); return; }
      chooseFile(new File([blob], `meter-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleRetake = () => {
    resetImageState();
    void startCamera();
  };

  const handleReplacePhoto = () => {
    resetImageState();
    closeCamera();
  };

  const applyCrop = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const sanitized = sanitizeCropBox(cropBox);
      const croppedBlob = await prepareMeterPhoto(file, rotation, sanitized);
      if (croppedPreview) URL.revokeObjectURL(croppedPreview);
      const url = URL.createObjectURL(croppedBlob);
      setCroppedPreview(url);
      setIsCropApplied(true);
      setIsCropMode(false);
      setActivePreviewTab('cropped');
      showToast(text.cropActive, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
    } finally {
      setBusy(false);
    }
  };

  const resetCrop = () => {
    if (croppedPreview) URL.revokeObjectURL(croppedPreview);
    setCroppedPreview('');
    setIsCropApplied(false);
    setIsCropMode(false);
    setActivePreviewTab('full');
    setCropBox({ x: 0.1, y: 0.25, width: 0.8, height: 0.4 });
  };

  const refresh = async () => {
    try {
      if (currentRole === 'management') {
        setMetrics(await request<Record<string, unknown>>('/api/meter-readings/metrics'));
        const inbox = await request<{ notifications: typeof meterNotifications }>('/api/meter-readings/notifications');
        setMeterNotifications(inbox.notifications);
        return;
      }
      const result = await request<{ readings: MeterReadingRecord[] }>('/api/meter-readings');
      setRecords(result.readings);
      const inbox = await request<{ notifications: typeof meterNotifications }>('/api/meter-readings/notifications');
      setMeterNotifications(inbox.notifications);
      if (currentRole === 'admin') setMetrics(await request<Record<string, unknown>>('/api/meter-readings/metrics'));
      if (currentRole === 'admin' || currentRole === 'employee') {
        const config = await request<{ thresholds: NonNullable<typeof thresholds> }>('/api/meter-readings/thresholds');
        setThresholds(config.thresholds);
      }
    } catch (err) { setError(err instanceof Error ? err.message : text.error); }
  };

  useEffect(() => { requestedPhotoIds.current.clear(); setReviewPhotos({}); }, [demoSession?.user.id]);
  useEffect(() => { if (open && demoSession) void refresh(); }, [open, demoSession, currentRole]);
  useEffect(() => {
    if (!open || !selectedConnection || currentRole === 'management') return;
    void request<{ configuration: MeterConfiguration }>(`/api/meter-readings/config?consumerNo=${encodeURIComponent(selectedConnection.consumerNo)}`).then(result => setMeterConfiguration(result.configuration)).catch(err => setError(err instanceof Error ? err.message : text.error));
  }, [open, selectedConnection?.consumerNo, currentRole]);
  useEffect(() => {
    if (!open || !isStaffReview) return;
    for (const record of records) {
      if (!record.photoId || reviewPhotos[record.id] || requestedPhotoIds.current.has(record.id)) continue;
      requestedPhotoIds.current.add(record.id);
      void request<{ photo: string }>(`/api/meter-readings/${record.id}/photo`).then(result => setReviewPhotos(current => ({ ...current, [record.id]: result.photo }))).catch(() => undefined);
    }
  }, [open, isStaffReview, records]);
  useEffect(() => { if (!candidates.some(c => c.consumerNo === connectionNo)) setConnectionNo(candidates[0]?.consumerNo || ''); }, [candidates, connectionNo]);

  const chooseFile = (next: File | null) => {
    if (!next) return;
    const issue = validateMeterPhoto(next);
    if (issue) { setError(issue); return; }
    closeCamera();
    resetImageState();
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const runOcr = async () => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      // 1. Prepare cropped display if crop was applied; otherwise use rotated full photo
      const preparedForOcr = await prepareMeterPhoto(file, rotation, isCropApplied ? cropBox : undefined);
      // 2. Prepare full rotated photo for server preservation & authorized staff audit
      const fullPrepared = await prepareMeterPhoto(file, rotation);
      const preparedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Photo could not be prepared.'));
        reader.readAsDataURL(fullPrepared);
      });
      setPhotoPayload(preparedDataUrl);

      // 3. Run local Tesseract Web Worker OCR
      const result = await extractMeterReading(
        preparedForOcr,
        (value) => setProgress(Math.round(value * 100)),
        isCropApplied
      );
      setOcr(result);
      if (result.normalizedReading !== undefined) {
        setReading(result.candidateReading.replace(',', '.'));
      }
      if (result.requiresReview) {
        showToast(text.readingCheck, 'warning');
      }
    } catch (err) { setError(err instanceof Error ? err.message : text.error); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!selectedConnection) return;
    setBusy(true); setError('');
    try {
      if (!meterConfiguration) throw new Error('The administrator-configured meter format is not available.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(readingAt) || Number.isNaN(Date.parse(`${readingAt}T12:00:00Z`))) {
        throw new Error('Choose a valid reading date.');
      }
      const readingIso = new Date(`${readingAt}T12:00:00Z`).toISOString();
      const normalized = normalizeDisplayedReading(reading, meterConfiguration.decimalPlaces);
      closeCamera();
      if (currentRole === 'field' && isFieldEffectivelyOffline(isOfflineSimulated)) {
        let offlinePhoto: Blob | undefined;
        if (file) offlinePhoto = await prepareMeterPhoto(file, rotation);
        await enqueueOfflineMeterReading({
          requestId: selectedConnection.consumerNo, title: `Meter reading · ${selectedConnection.consumerNo}`,
          actorEmail: demoSession?.user.email || activeUser.email || '',
          meterReading: { consumerNo: selectedConnection.consumerNo, meterNo: meterConfiguration.meterNo, displayedReading: reading.trim(), readingKwh: normalized, multiplier: meterConfiguration.multiplier, readingAt: readingIso, decimalPlaces: meterConfiguration.decimalPlaces, meterEvent, ...(ocr ? { ocr } : {}) },
          ...(offlinePhoto ? { photo: offlinePhoto } : {})
        });
        setReading(''); resetImageState();
        showToast(text.queuedOffline, 'success');
        return;
      }
      let submittedPhotoPayload = photoPayload;
      if (file && !submittedPhotoPayload) {
        const prepared = await prepareMeterPhoto(file, rotation);
        submittedPhotoPayload = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Photo could not be prepared.')); reader.readAsDataURL(prepared); });
        setPhotoPayload(submittedPhotoPayload);
      }
      await request('/api/meter-readings', 'POST', {
        clientUuid: crypto.randomUUID(), consumerNo: selectedConnection.consumerNo,
        meterNo: meterConfiguration.meterNo, displayedReading: reading.trim(), readingKwh: normalized,
        multiplier: meterConfiguration.multiplier, readingAt: readingIso, decimalPlaces: meterConfiguration.decimalPlaces, meterEvent,
        ...(ocr ? { ocr } : {}), ...(submittedPhotoPayload ? { photoDataUrl: submittedPhotoPayload } : {})
      });
      setReading(''); resetImageState();
      showToast(text.pending, 'success');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : text.error); }
    finally { setBusy(false); }
  };

  const review = async (record: MeterReadingRecord, action: 'APPROVE' | 'REJECT' | 'REREAD') => {
    setBusy(true);
    try {
      await request(`/api/meter-readings/${record.id}/review`, 'PATCH', { action, note: reviewNotes[record.id] || '' });
      await refresh();
      showToast(action === 'APPROVE' ? text.approve : action === 'REREAD' ? text.reread : text.reject, action === 'APPROVE' ? 'success' : 'warning');
    } catch (err) { setError(err instanceof Error ? err.message : text.error); }
    finally { setBusy(false); }
  };

  const saveThresholds = async () => {
    if (!thresholds) return;
    setBusy(true);
    try { const result = await request<{ thresholds: NonNullable<typeof thresholds> }>('/api/meter-readings/thresholds', 'PATCH', thresholds); setThresholds(result.thresholds); showToast(`Threshold policy v${result.thresholds.version} saved.`, 'success'); }
    catch (err) { setError(err instanceof Error ? err.message : text.error); }
    finally { setBusy(false); }
  };

  const saveMeterConfiguration = async () => {
    if (!selectedConnection || !meterConfiguration) return;
    setBusy(true);
    try {
      const result = await request<{ configuration: MeterConfiguration }>('/api/meter-readings/config', 'PATCH', {
        consumerNo: selectedConnection.consumerNo, multiplier: meterConfiguration.multiplier,
        decimalPlaces: meterConfiguration.decimalPlaces,
        ...(meterConfiguration.rolloverAt ? { rolloverAt: meterConfiguration.rolloverAt } : {})
      });
      setMeterConfiguration(result.configuration);
      showToast(`${text.configVersion} ${result.configuration.version} saved.`, 'success');
    } catch (err) { setError(err instanceof Error ? err.message : text.error); }
    finally { setBusy(false); }
  };

  if (!demoSession || !['consumer', 'employee', 'field', 'management', 'admin'].includes(currentRole)) return null;
  return (
    <section className="mb-5 rounded-2xl border border-cyan-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label={text.title}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"><Gauge size={20} /></span><span><strong className="block text-sm text-slate-900 dark:text-white">{text.title}</strong><span className="text-xs text-slate-500">{text.subtitle}</span></span></span>
        <span className="flex items-center gap-2 text-xs font-semibold text-cyan-700">{open ? text.close : text.open}<ChevronDown size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} /></span>
      </button>
      {open && <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><span className="font-semibold">{text.demo}</span><div>{text.privacy}</div></div>
        {error && <div role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}<button type="button" className="ml-2 underline" onClick={() => { setError(''); void refresh(); }}>{text.retry}</button></div>}

        {meterNotifications.length > 0 && <div className="mb-4 space-y-2" aria-live="polite"><h3 className="text-sm font-bold text-slate-800 dark:text-white">{text.notifications}</h3>{meterNotifications.slice(0, 5).map(item => { const loc = localizeMeterNotification(item.title, item.message, language); return <div key={item.id} className="rounded-lg bg-cyan-50 p-3 text-xs text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-100"><strong>{loc.title}</strong><p>{loc.message}</p><time className="text-[10px] opacity-70">{new Date(item.time).toLocaleString()}</time></div>; })}</div>}

        {(currentRole === 'consumer' || currentRole === 'field') && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.85fr)]">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.connection}<select value={selectedConnection?.consumerNo || ''} onChange={event => setConnectionNo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950">{candidates.map(conn => <option key={conn.consumerNo} value={conn.consumerNo}>{conn.consumerNo} · {conn.consumerName}</option>)}</select></label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.meter}<input readOnly value={selectedConnection?.meterNo || ''} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.reading}<input value={reading} onChange={event => setReading(event.target.value)} inputMode="decimal" maxLength={24} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-lg font-mono dark:border-slate-700 dark:bg-slate-950" placeholder="e.g. 015180" /></label>
            <div className="grid grid-cols-3 gap-3"><label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.date}<input type="date" value={readingAt} onChange={event => setReadingAt(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.multiplier}<input readOnly value={meterConfiguration?.multiplier ?? '…'} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.precision}<input readOnly value={meterConfiguration?.decimalPlaces ?? '…'} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label></div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{eventText.label}<select value={meterEvent} onChange={event => setMeterEvent(event.target.value as typeof meterEvent)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="ordinary">{eventText.ordinary}</option><option value="replacement">{eventText.replacement}</option><option value="rollover">{eventText.rollover}</option></select></label>
            {meterEvent === 'rollover' && <p className="text-xs text-amber-700">{eventText.limit}: {meterConfiguration?.rolloverAt ?? 'not configured; ask an administrator to verify the meter specification'}</p>}
            <p className="text-xs text-slate-500">{text.identityCheck}</p>
            <button type="button" disabled={busy || !reading} onClick={() => void submit()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? text.loading : text.submit}</button>
          </div>
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-300">{text.photoHelp}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => cameraStream ? closeCamera() : void startCamera()}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Camera className="mr-1 inline text-cyan-600" size={15} />
                {text.takePhoto}
              </button>
              <label className="cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Upload className="mr-1 inline text-slate-600" size={15} />
                {text.gallery}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={event => chooseFile(event.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="rounded-lg border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 dark:border-cyan-800 px-3 py-2 text-xs font-semibold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 transition-colors"
                    title={text.retake}
                  >
                    <RefreshCw className="mr-1 inline" size={13} />
                    {text.retake}
                  </button>
                  <button
                    type="button"
                    onClick={handleReplacePhoto}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={text.replacePhoto}
                  >
                    <X className="mr-1 inline" size={13} />
                    {text.replacePhoto}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation(value => (value + 90) % 360)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title={text.rotate}
                  >
                    <RotateCw className="mr-1 inline" size={13} />
                    {text.rotate}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCropMode(prev => !prev)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      isCropMode
                        ? 'bg-cyan-700 text-white border-cyan-700'
                        : isCropApplied
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    title={text.crop}
                  >
                    <Crop className="mr-1 inline" size={13} />
                    {isCropApplied ? text.cropActive : text.crop}
                  </button>
                  {isCropApplied && (
                    <button
                      type="button"
                      onClick={resetCrop}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {text.resetCrop}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Live Camera Stream View */}
            {cameraStream && (
              <div className="space-y-2">
                <video
                  ref={cameraVideo}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-80 w-full rounded-lg bg-black object-contain shadow-inner"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-cyan-800 transition-colors"
                  >
                    {text.capturePhoto}
                  </button>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    {text.closeCamera}
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Crop Adjustment Controls */}
            {file && isCropMode && (
              <div className="rounded-xl border border-cyan-300 bg-cyan-50/70 p-3 dark:border-cyan-800 dark:bg-cyan-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-950 dark:text-cyan-100 flex items-center gap-1.5">
                    <Sliders size={14} className="text-cyan-700" />
                    {text.crop}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCropBox({ x: 0.1, y: 0.25, width: 0.8, height: 0.35 })}
                      className="px-2 py-0.5 rounded text-[10px] bg-white border border-cyan-200 text-cyan-900 font-semibold hover:bg-cyan-100 dark:bg-slate-900 dark:border-cyan-800 dark:text-cyan-200"
                    >
                      Counter Window
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropBox({ x: 0.2, y: 0.2, width: 0.6, height: 0.6 })}
                      className="px-2 py-0.5 rounded text-[10px] bg-white border border-cyan-200 text-cyan-900 font-semibold hover:bg-cyan-100 dark:bg-slate-900 dark:border-cyan-800 dark:text-cyan-200"
                    >
                      Center 60%
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-cyan-900 dark:text-cyan-200 leading-snug">{text.cropHelp}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300">
                    Horizontal Left ({Math.round(cropBox.x * 100)}%)
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.02"
                      value={cropBox.x}
                      onChange={e => setCropBox(prev => sanitizeCropBox({ ...prev, x: Number(e.target.value) }))}
                      className="w-full mt-1 accent-cyan-700"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300">
                    Vertical Top ({Math.round(cropBox.y * 100)}%)
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.02"
                      value={cropBox.y}
                      onChange={e => setCropBox(prev => sanitizeCropBox({ ...prev, y: Number(e.target.value) }))}
                      className="w-full mt-1 accent-cyan-700"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300">
                    Width ({Math.round(cropBox.width * 100)}%)
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.02"
                      value={cropBox.width}
                      onChange={e => setCropBox(prev => sanitizeCropBox({ ...prev, width: Number(e.target.value) }))}
                      className="w-full mt-1 accent-cyan-700"
                    />
                  </label>
                  <label className="block text-[11px] text-slate-700 dark:text-slate-300">
                    Height ({Math.round(cropBox.height * 100)}%)
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.02"
                      value={cropBox.height}
                      onChange={e => setCropBox(prev => sanitizeCropBox({ ...prev, height: Number(e.target.value) }))}
                      className="w-full mt-1 accent-cyan-700"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void applyCrop()}
                    disabled={busy}
                    className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-cyan-800 disabled:opacity-50"
                  >
                    {text.applyCrop}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCropMode(false)}
                    className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200"
                  >
                    {text.close}
                  </button>
                </div>
              </div>
            )}

            {/* Photo Previews (Full and Cropped) */}
            {preview && (
              <div className="space-y-2">
                {isCropApplied && (
                  <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('cropped')}
                      className={`px-3 py-1.5 font-semibold border-b-2 transition-colors ${
                        activePreviewTab === 'cropped'
                          ? 'border-cyan-700 text-cyan-800 dark:border-cyan-400 dark:text-cyan-300'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {text.croppedPreview}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('full')}
                      className={`px-3 py-1.5 font-semibold border-b-2 transition-colors ${
                        activePreviewTab === 'full'
                          ? 'border-cyan-700 text-cyan-800 dark:border-cyan-400 dark:text-cyan-300'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {text.originalPhoto}
                    </button>
                  </div>
                )}

                <div className="relative overflow-hidden rounded-lg bg-slate-900/5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {activePreviewTab === 'cropped' && croppedPreview ? (
                    <img
                      src={croppedPreview}
                      alt="Cropped meter display preview"
                      className="max-h-64 w-full rounded-lg object-contain bg-slate-950/20"
                    />
                  ) : (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Meter photo preview"
                        className="max-h-64 w-full rounded-lg object-contain transition-transform duration-200"
                        style={{ transform: `rotate(${rotation}deg)` }}
                      />
                      {/* Visual Crop Box Guide Overlay in Crop Mode */}
                      {isCropMode && (
                        <div
                          className="absolute pointer-events-none border-2 border-cyan-400 bg-cyan-400/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
                          style={{
                            left: `${cropBox.x * 100}%`,
                            top: `${cropBox.y * 100}%`,
                            width: `${cropBox.width * 100}%`,
                            height: `${cropBox.height * 100}%`
                          }}
                        >
                          <span className="absolute -top-5 left-0 rounded bg-cyan-800 text-white px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                            Framed Area
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {file && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runOcr()}
                className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Gauge size={15} />
                {busy ? `${text.loading} ${progress}%` : text.runOcr}
              </button>
            )}

            {/* OCR Extracted Result & Ambiguous Characters Panel */}
            {ocr && (
              <div className="space-y-2 rounded-xl bg-cyan-50/80 p-3 text-xs text-cyan-950 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-100 dark:border-cyan-800">
                <div className="flex items-center justify-between gap-2 border-b border-cyan-200/60 pb-1.5 dark:border-cyan-800/60">
                  <strong className="text-xs font-bold">{text.readingCheck}</strong>
                  <span className="text-[10px] font-mono text-cyan-800 dark:text-cyan-300">
                    {ocr.isCropped ? text.croppedPreview : text.originalPhoto}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {ocr.candidateReading || '—'}
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    · {text.confidence}:{' '}
                    <strong className={ocr.confidence && ocr.confidence >= 75 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                      {ocr.confidence === undefined ? '—' : `${ocr.confidence}%`}
                    </strong>
                  </span>
                </div>
                <p className="break-all font-mono text-[11px] text-slate-500 bg-white/70 dark:bg-slate-900/60 p-1.5 rounded border border-cyan-100 dark:border-cyan-900">
                  {mp.wsOcrRawText}: {ocr.rawText || '—'}
                </p>

                {/* Ambiguous Digits Notice List */}
                {ocr.ambiguousDigits && ocr.ambiguousDigits.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100 space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-[11px]">
                      <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{text.ambiguousWarning} ({ocr.ambiguousDigits.length})</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                      {text.ambiguousHelp}
                    </p>
                    <div className="space-y-1.5 pt-0.5">
                      {ocr.ambiguousDigits.map((notice, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center justify-between gap-1.5 rounded bg-white/90 p-1.5 border border-amber-200 dark:bg-slate-900 dark:border-amber-800"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white text-[11px]">
                              #{notice.position}: &lsquo;<span className="font-mono font-bold text-rose-600">{notice.rawChar}</span>&rsquo;
                            </span>
                            <span className="text-[10px] text-slate-500 block">{notice.reason}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">{text.useProposed}:</span>
                            {notice.alternatives.map(alt => (
                              <button
                                key={alt}
                                type="button"
                                onClick={() => {
                                  setReading(prev => {
                                    const chars = prev.split('');
                                    if (notice.position - 1 < chars.length) {
                                      chars[notice.position - 1] = alt;
                                      return chars.join('');
                                    }
                                    return prev;
                                  });
                                }}
                                className="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-mono font-bold text-[11px] border border-amber-300 dark:bg-amber-900/60 dark:text-amber-100 dark:border-amber-700"
                              >
                                {alt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500">{text.localOcr}</p>
          </div>
        </div>}

        {currentRole === 'management' && metrics && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={text.metrics} value={String(metrics.totalReadings ?? 0)} /><Metric label={text.pending} value={String(metrics.pendingReview ?? 0)} /><Metric label={text.anomalies} value={String(metrics.openAnomalies ?? 0)} /><Metric label={text.history} value={String(metrics.approved ?? 0)} /></div>}
        {currentRole === 'admin' && <div className="mb-4 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{text.config}</h3>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{text.connection}<select value={selectedConnection?.consumerNo || ''} onChange={event => setConnectionNo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950">{candidates.map(conn => <option key={conn.consumerNo} value={conn.consumerNo}>{conn.consumerNo} · {conn.consumerName}</option>)}</select></label>
          {meterConfiguration && <>
            <p className="text-xs text-slate-500">{text.meter}: {meterConfiguration.meterNo} · {text.configVersion} {meterConfiguration.version}</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs">{text.multiplier}<input type="number" min="0.0001" max="10000" step="any" value={meterConfiguration.multiplier} onChange={event => setMeterConfiguration({ ...meterConfiguration, multiplier: Number(event.target.value) })} className="mt-1 block w-32 rounded border p-2 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="text-xs">{text.precision}<input type="number" min="0" max="2" step="1" value={meterConfiguration.decimalPlaces} onChange={event => setMeterConfiguration({ ...meterConfiguration, decimalPlaces: Number(event.target.value) })} className="mt-1 block w-28 rounded border p-2 dark:border-slate-700 dark:bg-slate-950" /></label>
              <label className="text-xs">{eventText.limit}<input type="number" min="1" step="any" value={meterConfiguration.rolloverAt ?? ''} onChange={event => setMeterConfiguration({ ...meterConfiguration, rolloverAt: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1 block w-36 rounded border p-2 dark:border-slate-700 dark:bg-slate-950" /></label>
              <button type="button" disabled={busy} onClick={() => void saveMeterConfiguration()} className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? text.loading : text.saveConfig}</button>
            </div>
            <p className="text-[11px] text-amber-700">{text.configHelp}</p>
          </>}
        </div>}
        {currentRole === 'admin' && <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={text.metrics} value={String(metrics?.totalReadings ?? 0)} /><Metric label={text.pending} value={String(metrics?.pendingReview ?? 0)} /><Metric label={text.anomalies} value={String(metrics?.openAnomalies ?? 0)} /><Metric label={mp.mgtThresholdVersionLabel} value={String(thresholds?.version ?? '—')} />{thresholds && <div className="col-span-full flex flex-wrap items-end gap-3 rounded-xl border p-3">{(['minimumHistory', 'highDailyRatio', 'lowDailyRatio', 'highDailyUnits'] as const).map(key => <label key={key} className="text-xs">{key}<input type="number" value={thresholds[key]} onChange={event => setThresholds({ ...thresholds, [key]: Number(event.target.value) })} className="mt-1 block w-28 rounded border p-2" /></label>)}<button type="button" onClick={() => void saveThresholds()} className="rounded bg-slate-900 px-3 py-2 text-xs text-white">{mp.admSaveThresholdsBtn}</button></div>}</div>}

        {(currentRole === 'consumer' || currentRole === 'field' || isStaffReview) && <div className="mt-4 space-y-3"><h3 className="text-sm font-bold text-slate-800 dark:text-white">{isStaffReview ? text.review : text.history}</h3>{records.length === 0 && <p className="text-sm text-slate-500">{text.noReadings}</p>}{records.map(record => <article key={record.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="font-mono text-sm">{record.displayedReading} kWh</strong><p className="text-xs text-slate-500">{record.consumerNo} · {record.meterNo} · {new Date(record.readingAt).toLocaleDateString()}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold dark:bg-slate-800">{localizePhase11Status(record.status, language)}</span></div>{reviewPhotos[record.id] && <img src={reviewPhotos[record.id]} alt={`Submitted meter photo for ${record.meterNo}`} className="mt-3 max-h-72 rounded-lg border object-contain" />}{record.consumedUnits !== undefined && <p className="mt-2 text-xs">{mp.wsConsumptionUnits}: {record.consumedUnits.toLocaleString()} kWh ({record.intervalDays} {mp.wsIntervalDays}) · ×{record.multiplier}</p>}{record.anomalies.length > 0 && <div className="mt-2 space-y-1">{record.anomalies.map(item => <p key={item.id} className="flex gap-1 text-xs text-amber-800 dark:text-amber-300"><AlertTriangle size={14} />{item.evidence}</p>)}</div>}{record.ocr && <p className="mt-2 text-xs text-slate-500">{text.confidence}: {record.ocr.confidence === undefined ? '—' : `${record.ocr.confidence}%`} · {record.ocr.engineVersion}</p>}{record.reviewNote && <p className="mt-2 text-xs text-slate-600">{text.note}: {record.reviewNote}</p>}{isStaffReview && record.status === 'PENDING_REVIEW' && <div className="mt-3 space-y-2"><textarea value={reviewNotes[record.id] || ''} onChange={event => setReviewNotes({ ...reviewNotes, [record.id]: event.target.value })} maxLength={1000} placeholder={text.note} className="w-full rounded-lg border p-2 text-xs dark:border-slate-700 dark:bg-slate-950" /><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void review(record, 'APPROVE')} className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"><Check className="mr-1 inline" size={14} />{text.approve}</button><button disabled={busy} onClick={() => void review(record, 'REJECT')} className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white"><X className="mr-1 inline" size={14} />{text.reject}</button><button disabled={busy} onClick={() => void review(record, 'REREAD')} className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white"><FileCheck2 className="mr-1 inline" size={14} />{text.reread}</button></div></div>}</article>)}</div>}
        {(currentRole === 'consumer' || currentRole === 'employee' || currentRole === 'admin') && selectedConnection && <div className="mt-4 space-y-2"><h3 className="text-sm font-bold text-slate-800 dark:text-white">{text.billReview}</h3>{visibleBills.filter(bill => bill.consumerNo === selectedConnection.consumerNo).slice(0, 3).map(bill => { const result = validateExistingBill({ bill, connection: selectedConnection, allBills: visibleBills, payments: visiblePayments }); return <article key={bill.billNo} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-700"><div className="flex justify-between gap-2"><strong>{bill.billNo} · {bill.billMonth}</strong><span className={result.status === 'CLEAR' ? 'text-emerald-700' : 'text-amber-700'}>{localizePhase11Status(result.status, language)}</span></div><p className="mt-1">{text.expected}: ₹{result.expectedAmount.toFixed(2)} · {text.recorded}: ₹{result.recordedAmount.toFixed(2)} · {mp.cnsVariance}: ₹{result.difference.toFixed(2)}</p><ul className="mt-1 list-inside list-disc text-slate-600 dark:text-slate-300">{result.evidence.map((line, index) => <li key={index}>{line}</li>)}</ul></article>; })}</div>}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><Activity size={14} />{text.demo}</div>
      </div>}
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span className="block text-[11px] text-slate-500">{label}</span><strong className="text-xl text-slate-900 dark:text-white">{value}</strong></div>;
