import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Crop,
  Check,
  X,
  AlertTriangle,
  Sliders,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import {
  validateMeterPhoto,
  verifyImageMagicBytes,
  prepareMeterPhoto,
  sanitizeCropBox,
  type NormalizedCropBox,
  type ImageQualityIndicators,
  type PixelCropCoordinates
} from '../../services/meterOcr';
import { useLanguage } from '../../i18n/LanguageContext';

export interface ImageCaptureProps {
  onPhotoPrepared: (data: {
    file: File;
    blob: Blob;
    dataUrl: string;
    quality: ImageQualityIndicators | null;
    rotation: number;
    cropBox: NormalizedCropBox;
    isCropped: boolean;
  }) => void;
  onClear?: () => void;
  disabled?: boolean;
  initialDataUrl?: string;
}

export const ImageCapture: React.FC<ImageCaptureProps> = ({
  onPhotoPrepared,
  onClear,
  disabled = false,
  initialDataUrl
}) => {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialDataUrl || '');
  const [rotation, setRotation] = useState<number>(0);
  const [isCropMode, setIsCropMode] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<NormalizedCropBox>({ x: 0.1, y: 0.25, width: 0.8, height: 0.35 });
  const [isCropApplied, setIsCropApplied] = useState<boolean>(false);
  const [quality, setQuality] = useState<ImageQualityIndicators | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const t = {
    en: {
      takePhoto: 'Take a Photo',
      uploadPhoto: 'Upload from Storage',
      capture: 'Capture Frame',
      closeCamera: 'Close Camera',
      rotate: 'Rotate 90°',
      cropDisplay: 'Crop Display Register',
      applyCrop: 'Apply Crop',
      resetCrop: 'Reset Crop',
      retake: 'Retake / Replace',
      remove: 'Remove',
      localNotice: 'All OCR and image processing is conducted entirely in your browser. Photos are never uploaded to external AI services.',
      qualityHeader: 'Advisory Quality Check',
      processing: 'Preparing image...',
      cropHelp: 'Frame only the meter digit counter to exclude surrounding text and reflections.',
      confidenceUnavailable: 'Confidence Unavailable'
    },
    gu: {
      takePhoto: 'કેમેરાથી ફોટો લો',
      uploadPhoto: 'ગેલેરી / સ્ટોરેજમાંથી અપલોડ કરો',
      capture: 'ફોટો કેપ્ચર કરો',
      closeCamera: 'કેમેરા બંધ કરો',
      rotate: '૯૦° ફેરવો',
      cropDisplay: 'મીટર કાઉન્ટર ક્રોપ કરો',
      applyCrop: 'ક્રોપ લાગુ કરો',
      resetCrop: 'ક્રોપ રીસેટ કરો',
      retake: 'ફરી ફોટો લો / બદલો',
      remove: 'દૂર કરો',
      localNotice: 'તમામ OCR અને ફોટો પ્રક્રિયા સંપૂર્ણપણે તમારા બ્રાઉઝરમાં સ્થાનિક રીતે થાય છે. ફોટો ક્યારેય બાહ્ય AI સેવાઓને મોકલવામાં આવતો નથી.',
      qualityHeader: 'સલાહકારી ગુણવત્તા તપાસ',
      processing: 'ફોટો તૈયાર થઈ રહ્યો છે...',
      cropHelp: 'આજુબાજુના લખાણને બદલે ફક્ત મીટરના અંક ડિસ્પ્લે પર ધ્યાન કેન્દ્રિત કરો.',
      confidenceUnavailable: 'વિશ્વાસ અપ્રાપ્ય છે'
    },
    hi: {
      takePhoto: 'कैमरे से फोटो लें',
      uploadPhoto: 'स्टोरेज से अपलोड करें',
      capture: 'फोटो कैप्चर करें',
      closeCamera: 'कैमरा बंद करें',
      rotate: '९०° घुमाएँ',
      cropDisplay: 'मीटर काउंटर क्रॉप करें',
      applyCrop: 'क्रॉप लागू करें',
      resetCrop: 'क्रॉप रीसेट करें',
      retake: 'दोबारा लें / बदलें',
      remove: 'हटाएँ',
      localNotice: 'सभी OCR और इमेज प्रोसेसिंग पूरी तरह से आपके ब्राउज़र में स्थानीय रूप से होती है। तस्वीरें कभी भी किसी बाहरी AI सेवा पर अपलोड नहीं की जाती हैं।',
      qualityHeader: 'सलाहकारी गुणवत्ता जाँच',
      processing: 'फोटो तैयार हो रही है...',
      cropHelp: 'आसपास के लेबल को छोड़ केवल मीटर रीडिंग काउंटर को फ्रेम करें।',
      confidenceUnavailable: 'विश्वसनीयता अनुपलब्ध है'
    },
    mr: {
      takePhoto: 'कॅमेऱ्याने फोटो काढा',
      uploadPhoto: 'स्टोअरेजमधून अपलोड करा',
      capture: 'फोटो टिपा',
      closeCamera: 'कॅमेरा बंद करा',
      rotate: '९०° फिरवा',
      cropDisplay: 'मीटर काउंटर क्रॉप करा',
      applyCrop: 'क्रॉप लागू करा',
      resetCrop: 'क्रॉप रीसेट करा',
      retake: 'पुन्हा काढा / बदला',
      remove: 'काढून टाका',
      localNotice: 'सर्व OCR आणि प्रतिमा प्रक्रिया पूर्णपणे आपल्या ब्राउझरमध्ये स्थानिक पातळीवर होते. फोटो कधीही बाह्य AI सेवेकडे पाठवले जात नाहीत.',
      qualityHeader: 'सल्लागार गुणवत्ता पडताळणी',
      processing: 'फोटो तयार होत आहे...',
      cropHelp: 'आजूबाजूचा मजकूर वगळून फक्त मीटर रीडिंग काउंटर फ्रेम करा.',
      confidenceUnavailable: 'विश्वासार्हता अनुपलब्ध'
    }
  }[language] || {
    takePhoto: 'Take a Photo',
    uploadPhoto: 'Upload from Storage',
    capture: 'Capture Frame',
    closeCamera: 'Close Camera',
    rotate: 'Rotate 90°',
    cropDisplay: 'Crop Display Register',
    applyCrop: 'Apply Crop',
    resetCrop: 'Reset Crop',
    retake: 'Retake / Replace',
    remove: 'Remove',
    localNotice: 'All OCR and image processing is conducted entirely in your browser. Photos are never uploaded to external AI services.',
    qualityHeader: 'Advisory Quality Check',
    processing: 'Preparing image...',
    cropHelp: 'Frame only the meter digit counter to exclude surrounding text and reflections.',
    confidenceUnavailable: 'Confidence Unavailable'
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setValidationError('');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch {
      setValidationError('Camera access denied or unavailable. Please choose a photo from your device storage.');
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();

    canvas.toBlob(blob => {
      if (!blob) return;
      const capturedFile = new File([blob], `meter-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      processNewFile(capturedFile);
    }, 'image/jpeg', 0.92);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processNewFile(file);
    }
    e.target.value = '';
  };

  const processNewFile = async (file: File) => {
    setValidationError('');
    setIsProcessing(true);

    const validation = validateMeterPhoto(file);
    if (validation) {
      setValidationError(validation);
      setIsProcessing(false);
      return;
    }

    try {
      // Magic bytes verification
      const buffer = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      const magicCheck = verifyImageMagicBytes(buffer);
      if (!magicCheck.valid) {
        setValidationError(magicCheck.error || 'Invalid image signature.');
        setIsProcessing(false);
        return;
      }

      setSelectedFile(file);
      setRotation(0);
      setIsCropApplied(false);
      const defaultCrop = { x: 0.1, y: 0.25, width: 0.8, height: 0.35 };
      setCropBox(defaultCrop);

      const prepared = await prepareMeterPhoto(file, 0, undefined);
      setQuality(prepared.quality);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        onPhotoPrepared({
          file,
          blob: prepared.blob,
          dataUrl,
          quality: prepared.quality,
          rotation: 0,
          cropBox: defaultCrop,
          isCropped: false
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(prepared.blob);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to prepare image.');
      setIsProcessing(false);
    }
  };

  const handleRotate = async () => {
    if (!selectedFile) return;
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    setIsProcessing(true);
    try {
      const prepared = await prepareMeterPhoto(
        selectedFile,
        nextRotation,
        isCropApplied ? cropBox : undefined
      );
      setQuality(prepared.quality);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        onPhotoPrepared({
          file: selectedFile,
          blob: prepared.blob,
          dataUrl,
          quality: prepared.quality,
          rotation: nextRotation,
          cropBox,
          isCropped: isCropApplied
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(prepared.blob);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to rotate image.');
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const sanitized = sanitizeCropBox(cropBox);
      setCropBox(sanitized);
      setIsCropApplied(true);
      setIsCropMode(false);

      const prepared = await prepareMeterPhoto(selectedFile, rotation, sanitized);
      setQuality(prepared.quality);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        onPhotoPrepared({
          file: selectedFile,
          blob: prepared.blob,
          dataUrl,
          quality: prepared.quality,
          rotation,
          cropBox: sanitized,
          isCropped: true
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(prepared.blob);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to crop image.');
      setIsProcessing(false);
    }
  };

  const handleResetCrop = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const fullBox: NormalizedCropBox = { x: 0, y: 0, width: 1, height: 1 };
      setCropBox(fullBox);
      setIsCropApplied(false);
      setIsCropMode(false);

      const prepared = await prepareMeterPhoto(selectedFile, rotation, undefined);
      setQuality(prepared.quality);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        onPhotoPrepared({
          file: selectedFile,
          blob: prepared.blob,
          dataUrl,
          quality: prepared.quality,
          rotation,
          cropBox: fullBox,
          isCropped: false
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(prepared.blob);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to reset crop.');
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    stopCamera();
    setSelectedFile(null);
    setPreviewUrl('');
    setRotation(0);
    setIsCropMode(false);
    setIsCropApplied(false);
    setQuality(null);
    setValidationError('');
    onClear?.();
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Safe local processing banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
        <Info size={16} className="mt-0.5 shrink-0 text-cyan-700 dark:text-cyan-400" />
        <span className="leading-relaxed font-medium">{t.localNotice}</span>
      </div>

      {/* Camera Live Stream View */}
      {isCameraActive && (
        <div className="relative overflow-hidden rounded-xl border-2 border-cyan-500 bg-slate-950 shadow-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-64 w-full object-cover"
          />
          {/* Target alignment frame */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-32 w-full max-w-sm rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <span className="rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-white tracking-wide uppercase">
                Align Meter Digits Here
              </span>
            </div>
          </div>
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={captureCameraFrame}
              className="flex items-center gap-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 px-4 py-2 text-xs font-bold text-white shadow-lg transition-transform active:scale-95"
            >
              <Camera size={16} />
              {t.capture}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-xl border border-white/40 bg-black/50 hover:bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xs transition-colors"
            >
              {t.closeCamera}
            </button>
          </div>
        </div>
      )}

      {/* Main Action Buttons when no photo is active and camera is off */}
      {!previewUrl && !isCameraActive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={startCamera}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-50/50 hover:bg-cyan-100/70 p-4 text-xs font-bold text-cyan-900 transition-colors dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-200 disabled:opacity-50"
          >
            <Camera size={18} className="text-cyan-700 dark:text-cyan-400" />
            {t.takePhoto}
          </button>

          <button
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 p-4 text-xs font-bold text-slate-800 transition-colors dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200 disabled:opacity-50"
          >
            <Upload size={18} className="text-slate-600 dark:text-slate-400" />
            {t.uploadPhoto}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Error message */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
          <AlertTriangle size={15} className="shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Preview, Crop & Rotation Toolbar */}
      {previewUrl && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950/5 p-2 dark:border-slate-800 dark:bg-slate-950">
            <div className="relative flex justify-center items-center">
              <img
                src={previewUrl}
                alt="Meter Preview"
                className="max-h-72 w-full object-contain rounded-lg transition-transform duration-200"
              />

              {/* Crop Overlay when isCropMode is active */}
              {isCropMode && (
                <div
                  className="pointer-events-none absolute border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.width * 100}%`,
                    height: `${cropBox.height * 100}%`
                  }}
                >
                  <span className="absolute -top-5 left-0 rounded bg-cyan-800 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-white">
                    Crop Region
                  </span>
                </div>
              )}
            </div>

            {/* Quick action buttons row */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={handleRotate}
                  className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RotateCw size={13} />
                  {t.rotate}
                </button>

                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={() => setIsCropMode(!isCropMode)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors ${
                    isCropMode
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Crop size={13} />
                  {t.cropDisplay}
                </button>

                {isCropApplied && (
                  <button
                    type="button"
                    disabled={disabled || isProcessing}
                    onClick={handleResetCrop}
                    className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    <RefreshCw size={12} />
                    {t.resetCrop}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {t.retake}
                </button>
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={handleRemove}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Interactive Crop Sliders if Crop Mode is active */}
            {isCropMode && (
              <div className="mt-3 rounded-xl border border-cyan-300 bg-cyan-50/90 p-3 dark:border-cyan-800 dark:bg-cyan-950/50 space-y-2.5">
                <p className="text-[11px] text-cyan-900 dark:text-cyan-200 font-medium">{t.cropHelp}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="text-slate-700 dark:text-slate-300">
                    Left ({Math.round(cropBox.x * 100)}%)
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
                  <label className="text-slate-700 dark:text-slate-300">
                    Top ({Math.round(cropBox.y * 100)}%)
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
                  <label className="text-slate-700 dark:text-slate-300">
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
                  <label className="text-slate-700 dark:text-slate-300">
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
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleApplyCrop}
                  className="rounded-lg bg-cyan-700 hover:bg-cyan-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  {t.applyCrop}
                </button>
              </div>
            )}
          </div>

          {/* Measured Image-Quality Indicators Panel */}
          {quality && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders size={13} className="text-cyan-700 dark:text-cyan-400" />
                  {t.qualityHeader}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    quality.overallRating === 'EXCELLENT'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : quality.overallRating === 'GOOD'
                      ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                      : quality.overallRating === 'FAIR'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {quality.overallRating}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-slate-500 block">Focus / Sharpness</span>
                  <strong className={quality.isBlurry ? 'text-rose-600' : 'text-slate-900 dark:text-white'}>
                    {quality.blurScore}% {quality.isBlurry ? '· Blurry' : '· Sharp'}
                  </strong>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-slate-500 block">Glare Level</span>
                  <strong className={quality.hasGlare ? 'text-amber-600' : 'text-slate-900 dark:text-white'}>
                    {quality.glareScore}% {quality.hasGlare ? '· Glare' : '· Clear'}
                  </strong>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-slate-500 block">Contrast</span>
                  <strong className={quality.isLowContrast ? 'text-amber-600' : 'text-slate-900 dark:text-white'}>
                    {quality.contrastScore}% {quality.isLowContrast ? '· Low' : '· Good'}
                  </strong>
                </div>
                <div className="rounded-lg bg-white p-2 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                  <span className="text-slate-500 block">Aspect Alignment</span>
                  <strong className={quality.isExcessiveTilt ? 'text-amber-600' : 'text-slate-900 dark:text-white'}>
                    {quality.isExcessiveTilt ? 'Tilt Warning' : 'Level'}
                  </strong>
                </div>
              </div>

              {quality.warnings.length > 0 && (
                <div className="space-y-1 pt-1">
                  {quality.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
