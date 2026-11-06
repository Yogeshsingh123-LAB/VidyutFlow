import React, { useState } from 'react';
import {
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Check,
  RefreshCw,
  Eye,
  Info,
  Maximize2
} from 'lucide-react';
import type { MeterOCRResult } from '../../types/meterReading';
import type { OcrCandidate, OcrWordBox } from '../../services/meterOcr';
import { useLanguage } from '../../i18n/LanguageContext';

export interface OCRExtractionViewerProps {
  ocrResult: (MeterOCRResult & { wordBoxes?: OcrWordBox[]; candidates?: OcrCandidate[] }) | null;
  onConfirmReading: (confirmedValue: string, isManualOverride: boolean, reason?: string) => void;
  isLoading?: boolean;
  progress?: number;
  progressStatus?: string;
  expectedDigits?: number;
  expectedDecimals?: number;
  initialValue?: string;
  meterPhotoUrl?: string;
}

export const OCRExtractionViewer: React.FC<OCRExtractionViewerProps> = ({
  ocrResult,
  onConfirmReading,
  isLoading = false,
  progress = 0,
  progressStatus = 'Extracting meter reading...',
  expectedDigits = 5,
  expectedDecimals = 0,
  initialValue,
  meterPhotoUrl
}) => {
  const { language } = useLanguage();
  const [confirmedDigits, setConfirmedDigits] = useState<string>(
    initialValue || (ocrResult?.candidateReading ? String(ocrResult.candidateReading) : '')
  );
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);

  // Sync with new OCR result if not manually edited yet
  React.useEffect(() => {
    if (ocrResult?.candidateReading && !isEditing) {
      setConfirmedDigits(String(ocrResult.candidateReading));
    }
  }, [ocrResult, isEditing]);

  const rawCandidate = ocrResult?.candidateReading ? String(ocrResult.candidateReading) : '';
  const isManuallyOverridden = confirmedDigits.trim() !== rawCandidate.trim();

  const t = {
    en: {
      header: 'Local OCR Extraction Result',
      candidateLabel: 'Detected Numeric Candidate',
      confidenceLabel: 'Confidence Score',
      confidenceUnavailable: 'Confidence Unavailable',
      humanConfirmation: 'Human Review & Confirmation',
      editReading: 'Edit / Correct Digits',
      applyReading: 'Confirm Value',
      overrideWarning: 'Manual Override Active — OCR candidate differed from confirmed reading.',
      overrideReasonLabel: 'Reason for Manual Correction:',
      overridePlaceholder: 'e.g. Corrected digit 8 misread as B, or decimal point clarified from dial display',
      ambiguousTitle: 'Ambiguous Character Flags',
      useProposed: 'Use',
      engineVersion: 'Engine / Model Version',
      extractedAt: 'Extracted At',
      wordsDetected: 'Words & Digit Bounding Boxes',
      toggleBoxes: 'Toggle Detection Overlay',
      manualFallbackNotice: 'If OCR cannot recognize the meter display, enter the exact displayed digits directly below.',
      leadingZeroNotice: 'Leading zeroes are preserved for audit alignment with the physical meter register.'
    },
    gu: {
      header: 'સ્થાનિક OCR પરિણામ',
      candidateLabel: 'શોધાયેલ અંક ઉમેદવાર',
      confidenceLabel: 'વિશ્વાસ સ્કોર',
      confidenceUnavailable: 'વિશ્વાસ અપ્રાપ્ય છે',
      humanConfirmation: 'માનવીય સમીક્ષા અને પુષ્ટિ',
      editReading: 'અંકો સુધારો / સંપાદિત કરો',
      applyReading: 'મૂલ્ય પુષ્ટિ કરો',
      overrideWarning: 'મેન્યુઅલ ઓવરરાઇડ સક્રિય — OCR અંક અને પુષ્ટિ થયેલ મૂલ્ય અલગ છે.',
      overrideReasonLabel: 'મેન્યુઅલ સુધારણાનું કારણ:',
      overridePlaceholder: 'દા.ત. B ને બદલે 8 અંક સુધાર્યો, અથવા દશાંશ ચિહ્ન સ્પષ્ટ કર્યું',
      ambiguousTitle: 'અસ્પષ્ટ અક્ષર ચેતવણીઓ',
      useProposed: 'વાપરો',
      engineVersion: 'એન્જિન / મોડેલ આવૃત્તિ',
      extractedAt: 'કાઢ્યાનો સમય',
      wordsDetected: 'શોધાયેલ શબ્દો અને બોક્સ',
      toggleBoxes: 'ડિટેક્શન ઓવરલે ટૉગલ કરો',
      manualFallbackNotice: 'જો OCR અંકો ઓળખી ન શકે, તો નીચે સીધા મીટર પર દેખાતા અંકો દાખલ કરો.',
      leadingZeroNotice: 'મીટર સાથે મેળ ખાવા માટે આગળના શૂન્ય (leading zeroes) જાળવી રાખવામાં આવે છે.'
    },
    hi: {
      header: 'स्थानीय OCR निष्कर्षण परिणाम',
      candidateLabel: 'पहचाना गया संख्यात्मक उम्मीदवार',
      confidenceLabel: 'विश्वसनीयता स्कोर',
      confidenceUnavailable: 'विश्वसनीयता अनुपलब्ध है',
      humanConfirmation: 'मानव समीक्षा एवं पुष्टि',
      editReading: 'अंक सुधारें / संपादित करें',
      applyReading: 'मान की पुष्टि करें',
      overrideWarning: 'मैन्युअल ओवरराइड सक्रिय — OCR उम्मीदवार और पुष्टि किया गया मान भिन्न हैं।',
      overrideReasonLabel: 'मैन्युअल सुधार का कारण:',
      overridePlaceholder: 'उदा. B के स्थान पर अंक 8 सुधारा, या दशमलव बिंदु स्पष्ट किया',
      ambiguousTitle: 'संदिग्ध वर्ण चेतावनियाँ',
      useProposed: 'उपयोग करें',
      engineVersion: 'इंजन / मॉडल संस्करण',
      extractedAt: 'निष्कर्षण समय',
      wordsDetected: 'पहचाने गए शब्द एवं बाउंडिंग बॉक्स',
      toggleBoxes: 'डिटेक्शन ओवरले टॉगल करें',
      manualFallbackNotice: 'यदि OCR मीटर अंकों को नहीं पहचान पाता है, तो सीधे नीचे सही अंक दर्ज करें।',
      leadingZeroNotice: 'मीटर रजिस्टर से मिलान के लिए आगे के शून्य (leading zeroes) सुरक्षित रखे जाते हैं।'
    },
    mr: {
      header: 'स्थानिक OCR निष्कर्ष परिणाम',
      candidateLabel: 'ओळखलेला संख्यात्मक उमेदवार',
      confidenceLabel: 'विश्वासार्हता गुण',
      confidenceUnavailable: 'विश्वासार्हता अनुपलब्ध',
      humanConfirmation: 'मानवी पुनरावलोकन आणि पुष्टी',
      editReading: 'अंक दुरुस्त करा / संपादित करा',
      applyReading: 'मूल्य निश्चित करा',
      overrideWarning: 'मॅन्युअल ओव्हरराइड सक्रिय — OCR उमेदवार आणि पुष्टी केलेले मूल्य वेगळे आहेत.',
      overrideReasonLabel: 'मॅन्युअल दुरुस्तीचे कारण:',
      overridePlaceholder: 'उदा. B ऐवजी 8 दुरुस्त केले, किंवा दशांश बिंदू स्पष्ट केला',
      ambiguousTitle: 'संदिग्ध अक्षरांच्या सूचना',
      useProposed: 'वापरा',
      engineVersion: 'इंजिन / मॉडेल आवृत्ती',
      extractedAt: 'निष्कर्ष वेळ',
      wordsDetected: 'शोधलेले शब्द आणि बाउंडिंग बॉक्सेस',
      toggleBoxes: 'डिटेक्शन ओव्हरले टॉगल करा',
      manualFallbackNotice: 'जर OCR डिस्प्ले ओळखू शकला नाही, तर खाली थेट मीटरवरील अंक प्रविष्ट करा.',
      leadingZeroNotice: 'मीटर रजिस्टरशी जुळण्यासाठी सुरुवातीचे शून्य जतन केले जातात.'
    }
  }[language] || {
    header: 'Local OCR Extraction Result',
    candidateLabel: 'Detected Numeric Candidate',
    confidenceLabel: 'Confidence Score',
    confidenceUnavailable: 'Confidence Unavailable',
    humanConfirmation: 'Human Review & Confirmation',
    editReading: 'Edit / Correct Digits',
    applyReading: 'Confirm Value',
    overrideWarning: 'Manual Override Active — OCR candidate differed from confirmed reading.',
    overrideReasonLabel: 'Reason for Manual Correction:',
    overridePlaceholder: 'e.g. Corrected digit 8 misread as B, or decimal point clarified from dial display',
    ambiguousTitle: 'Ambiguous Character Flags',
    useProposed: 'Use',
    engineVersion: 'Engine / Model Version',
    extractedAt: 'Extracted At',
    wordsDetected: 'Words & Digit Bounding Boxes',
    toggleBoxes: 'Toggle Detection Overlay',
    manualFallbackNotice: 'If OCR cannot recognize the meter display, enter the exact displayed digits directly below.',
    leadingZeroNotice: 'Leading zeroes are preserved for audit alignment with the physical meter register.'
  };

  const handleApplyAlternative = (position: number, replacement: string) => {
    // Replace character at 1-based position in confirmedDigits
    const chars = confirmedDigits.split('');
    if (position >= 1 && position <= chars.length) {
      chars[position - 1] = replacement;
      const updated = chars.join('');
      setConfirmedDigits(updated);
      setIsEditing(true);
      if (!overrideReason) {
        setOverrideReason(`Replaced ambiguous character at position ${position} with '${replacement}'`);
      }
    }
  };

  const handleConfirm = () => {
    onConfirmReading(
      confirmedDigits.trim(),
      isManuallyOverridden,
      isManuallyOverridden ? overrideReason : undefined
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-6 text-center text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100 space-y-3">
        <Gauge size={28} className="mx-auto animate-spin text-cyan-700 dark:text-cyan-400" />
        <h4 className="font-bold text-sm">{progressStatus}</h4>
        <div className="w-full max-w-xs mx-auto bg-cyan-200/60 rounded-full h-2 dark:bg-cyan-900">
          <div
            className="bg-cyan-700 h-2 rounded-full transition-all duration-300 dark:bg-cyan-400"
            style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
          />
        </div>
        <p className="text-xs text-cyan-800 dark:text-cyan-300">
          Running entirely in your browser via local WebAssembly worker ({progress}%)
        </p>
      </div>
    );
  }

  if (!ocrResult) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
          <Info size={16} className="text-cyan-700 dark:text-cyan-400" />
          <span>{t.manualFallbackNotice}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={confirmedDigits}
            onChange={e => setConfirmedDigits(e.target.value)}
            placeholder="e.g. 015310"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg bg-cyan-700 hover:bg-cyan-800 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            {t.applyReading}
          </button>
        </div>
      </div>
    );
  }

  const confidenceScore =
    ocrResult.confidence !== undefined && Number.isFinite(ocrResult.confidence)
      ? Math.round(ocrResult.confidence)
      : null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
        <h4 className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <Gauge size={16} className="text-cyan-700 dark:text-cyan-400" />
          {t.header}
        </h4>
        <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
          {ocrResult.engineVersion}
        </span>
      </div>

      {/* Main Extracted Display & Confidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            {t.candidateLabel}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black tracking-wider text-slate-900 dark:text-white">
              {rawCandidate || '—'}
            </span>
            {ocrResult.normalizedReading !== undefined && (
              <span className="text-xs text-slate-500 font-mono">
                (= {ocrResult.normalizedReading} kWh)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">{t.leadingZeroNotice}</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            {t.confidenceLabel}
          </span>
          <div className="flex items-center gap-2">
            {confidenceScore !== null ? (
              <>
                <span
                  className={`font-mono text-2xl font-black ${
                    confidenceScore >= 80
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : confidenceScore >= 60
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {confidenceScore}%
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {confidenceScore >= 80 ? 'High Confidence' : confidenceScore >= 60 ? 'Review Recommended' : 'Low Confidence'}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-500 italic">
                {t.confidenceUnavailable}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bounding box detection overlay if photo available */}
      {meterPhotoUrl && ocrResult.wordBoxes && ocrResult.wordBoxes.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <Eye size={13} className="text-cyan-700 dark:text-cyan-400" />
              {t.wordsDetected} ({ocrResult.wordBoxes.length})
            </span>
            <button
              type="button"
              onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              className="text-[11px] text-cyan-700 hover:underline dark:text-cyan-400"
            >
              {t.toggleBoxes}
            </button>
          </div>
          {showBoundingBoxes && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
              {ocrResult.wordBoxes.map((w, idx) => (
                <span
                  key={idx}
                  className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold border ${
                    /\d/.test(w.text)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                  }`}
                  title={`Confidence: ${w.confidence}% | Box: [${w.bbox.x0}, ${w.bbox.y0}, ${w.bbox.x1}, ${w.bbox.y1}]`}
                >
                  {w.text} <span className="text-[9px] font-normal opacity-70">({Math.round(w.confidence)}%)</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ambiguous Digits Notice List */}
      {ocrResult.ambiguousDigits && ocrResult.ambiguousDigits.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{t.ambiguousTitle} ({ocrResult.ambiguousDigits.length})</span>
          </div>
          <div className="space-y-1.5">
            {ocrResult.ambiguousDigits.map((notice, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/90 p-2 border border-amber-200 dark:bg-slate-900 dark:border-amber-900"
              >
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Position #{notice.position}: &lsquo;<span className="font-mono font-bold text-rose-600">{notice.rawChar}</span>&rsquo;
                  </span>
                  <p className="text-[11px] text-amber-900 dark:text-amber-300">{notice.reason}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {notice.alternatives.map((alt, aIdx) => (
                    <button
                      key={aIdx}
                      type="button"
                      onClick={() => handleApplyAlternative(notice.position, alt)}
                      className="rounded bg-amber-100 px-2 py-1 font-mono text-xs font-bold text-amber-950 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-100"
                    >
                      {t.useProposed} &lsquo;{alt}&rsquo;
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Human Confirmation & Manual Edit Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-600" />
            {t.humanConfirmation}
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-[11px] text-cyan-700 hover:underline dark:text-cyan-400 font-semibold"
          >
            <Edit3 size={12} />
            {t.editReading}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={confirmedDigits}
            onChange={e => {
              setConfirmedDigits(e.target.value);
              setIsEditing(true);
            }}
            placeholder="000000"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-mono font-black text-slate-900 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-white w-48 tracking-wider"
          />
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <Check size={14} />
            {t.applyReading}
          </button>
        </div>

        {/* Manual Override audit alert */}
        {isManuallyOverridden && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              <span>{t.overrideWarning}</span>
            </div>
            <label className="block text-slate-700 dark:text-slate-300">
              {t.overrideReasonLabel}
              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder={t.overridePlaceholder}
                className="mt-1 w-full rounded border border-amber-300 bg-white p-1.5 text-xs text-slate-900 dark:border-amber-800 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
