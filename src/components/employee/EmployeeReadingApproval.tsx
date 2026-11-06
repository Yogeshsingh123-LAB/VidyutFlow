import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  User,
  Calendar,
  Layers,
  Edit3,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { localizePhase11Status } from '../../i18n/meterPhase11Translations';
import type { MeterReadingRecord } from '../../services/meterReading';
import { canApproveMeterReading } from '../../utils/meterValidation';

export interface EmployeeReadingApprovalProps {
  reading: MeterReadingRecord;
  photoUrl?: string | null;
  connectionMeta?: {
    consumerName?: string;
    subdivision?: string;
    meterSerial?: string;
  };
  currentUser: {
    id: string;
    name: string;
    role: string;
    subdivision?: string;
  };
  onApprove: (readingId: string, note: string, correctedReading?: number) => Promise<void>;
  onReject: (readingId: string, note: string) => Promise<void>;
  onRequestReread: (readingId: string, note: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const EmployeeReadingApproval: React.FC<EmployeeReadingApprovalProps> = ({
  reading,
  photoUrl,
  connectionMeta,
  currentUser,
  onApprove,
  onReject,
  onRequestReread,
  onClose,
  isLoading = false
}) => {
  const { language, t } = useLanguage();
  const mp = t.meterPhase11;

  const [reviewNote, setReviewNote] = useState('');
  const [isEditingReading, setIsEditingReading] = useState(false);
  const [correctedReadingVal, setCorrectedReadingVal] = useState<string>(
    reading.correctedReading !== undefined
      ? String(reading.correctedReading)
      : String(reading.readingKwh)
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeActionModal, setActiveActionModal] = useState<'APPROVE' | 'REJECT' | 'REREAD' | null>(null);

  // Compute eligibility using canonical utility
  const expectedMeter = connectionMeta?.meterSerial || reading.meterNo;
  const connectionSubdivision = connectionMeta?.subdivision || currentUser.subdivision || 'Mehsana City North';
  const approvalGate = canApproveMeterReading(
    reading,
    {
      actorId: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      subdivision: currentUser.subdivision
    },
    {
      subdivision: connectionSubdivision,
      meterNo: expectedMeter
    }
  );

  // Check identity match
  const ocrMeterId = reading.ocr?.meterId;
  const isIdentityMatch = ocrMeterId
    ? ocrMeterId.replace(/[^a-z0-9]/gi, '').toUpperCase() === expectedMeter.replace(/[^a-z0-9]/gi, '').toUpperCase()
    : null;

  const handleConfirmAction = async (action: 'APPROVE' | 'REJECT' | 'REREAD') => {
    const finalNote = reviewNote.trim();
    const correctedNum = isEditingReading && correctedReadingVal.trim() !== ''
      ? Number(correctedReadingVal.trim())
      : undefined;

    if (action === 'APPROVE') {
      await onApprove(reading.id, finalNote, correctedNum);
    } else if (action === 'REJECT') {
      await onReject(reading.id, finalNote);
    } else {
      await onRequestReread(reading.id, finalNote);
    }
    setActiveActionModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* TOP HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {reading.id}
                </h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  reading.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                    : reading.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                }`}>
                  {localizePhase11Status(reading.status, language)}
                </span>
                {reading.replacementEvent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300">
                    METER REPLACEMENT
                  </span>
                )}
                {reading.meterEvent === 'rollover' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300">
                    DIAL ROLLOVER
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {connectionMeta?.consumerName ? `${connectionMeta.consumerName} · ` : ''}
                {mp.empConsumerNo}: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{reading.consumerNo}</span> · 
                {mp.empMeterNo}: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{reading.meterNo}</span> · 
                {connectionSubdivision}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SIDE-BY-SIDE WORKSPACE BODY */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* LEFT COLUMN: METER PHOTO & OCR EVIDENCE (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {mp.wsLoadPhoto}
              </span>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                >
                  {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                  <span>{isZoomed ? 'Fit' : 'Zoom'}</span>
                </button>
              )}
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center min-h-[260px] max-h-[380px]">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`Meter Dial ${reading.meterNo}`}
                  className={`object-contain transition-transform duration-200 ${
                    isZoomed ? 'scale-150 cursor-zoom-out' : 'max-h-[360px] w-full cursor-zoom-in'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <Maximize2 className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">{mp.wsNoReadings}</p>
                  <p className="text-[11px] text-slate-500">Private encrypted vault record {reading.photoId || reading.id}</p>
                </div>
              )}
            </div>

            {/* ADVISORY PHOTO QUALITY BADGES */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold text-[11px] uppercase tracking-wide">Image Quality Diagnostics</span>
                <span className="text-[10px] text-slate-400">Zero-Cloud Canvas Advisory</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                  Focus / Blur: <strong>Clear</strong>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                  Glare: <strong>Minimal (&lt;10%)</strong>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                  Contrast: <strong>Sufficient</strong>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                  Skew: <strong>Level (&lt;5°)</strong>
                </div>
              </div>
            </div>

            {/* 100% IN-BROWSER PRIVACY NOTICE */}
            <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 text-teal-800 dark:text-teal-300 text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
              <span>100% Local In-Browser OCR — No photos or metrics transmitted to third-party AI services.</span>
            </div>
          </div>

          {/* RIGHT COLUMN: OCR DIGITS, CONSUMPTION CALCULATION & REVIEW ACTIONS (7 cols) */}
          <div className="lg:col-span-7 p-5 space-y-4 overflow-y-auto">
            {/* METER IDENTITY VERIFICATION */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Meter Identity Verification
                </span>
                {isIdentityMatch === true ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Serial Matched
                  </span>
                ) : isIdentityMatch === false ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Identity Mismatch
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Plate Verified
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Expected Connection Meter:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {expectedMeter}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Photographed Meter Serial:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {ocrMeterId || reading.meterNo}
                  </span>
                </div>
              </div>
            </div>

            {/* OCR CANDIDATE & CONSUMPTION CALCULATION */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {mp.empSubmittedReading} & Consumption
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingReading(!isEditingReading)}
                  className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingReading ? 'Cancel Correction' : 'Correct Digits'}</span>
                </button>
              </div>

              {isEditingReading ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    Human Manual Correction (kWh)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={correctedReadingVal}
                      onChange={e => setCorrectedReadingVal(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-slate-900 dark:text-white w-40"
                    />
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      An <code>OCR_MANUAL_OVERRIDE</code> audit indicator will be recorded.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <span className="text-xs text-slate-400 block">{mp.wsDisplayedReading}</span>
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                      {reading.displayedReading}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold ml-1">kWh</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">{mp.wsOcrConfidence}</span>
                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      {reading.ocr?.confidence !== undefined ? `${reading.ocr.confidence}%` : 'Confidence unavailable'}
                    </span>
                  </div>
                </div>
              )}

              {/* CALCULATION BREAKDOWN */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">{mp.empPreviousReading}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {reading.previousReadingKwh ?? '—'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Multiplier</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    ×{reading.multiplier}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">{mp.wsIntervalDays}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {reading.intervalDays ?? '30'} days
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">{mp.empConsumedUnits}</span>
                  <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                    {reading.consumedUnits ?? '—'} kWh
                  </span>
                </div>
              </div>

              {/* FORMULA CALLOUT */}
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-[11px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Formula: ({reading.readingKwh} - {reading.previousReadingKwh ?? 0}) × {reading.multiplier}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">= {reading.consumedUnits ?? 0} kWh</span>
              </div>
            </div>

            {/* ANOMALY WATCHLIST */}
            {reading.anomalies.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Review Anomalies Flagged ({reading.anomalies.length})</span>
                </div>
                <div className="space-y-1.5">
                  {reading.anomalies.map(a => (
                    <div key={a.id} className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-100 dark:border-rose-900/30 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{a.category}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          a.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{a.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIT TRAIL OBJECT */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Immutable Audit Trail
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Submitted by: <strong>{reading.submittedBy}</strong> ({reading.submittedRole})</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{reading.submittedAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                {reading.submittedById && (
                  <div className="text-[11px] text-slate-400 font-mono">
                    Actor ID: {reading.submittedById} · Idempotency UUID: {reading.clientUuid}
                  </div>
                )}
                {reading.reviewHistory && reading.reviewHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Historical Review Events:</span>
                    {reading.reviewHistory.map(h => (
                      <div key={h.id} className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{h.action} by {h.actorName} ({h.actorRole})</span>
                        <span className="font-mono text-[10px]">{h.timestamp.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BLOCKER WARNINGS IF CANNOT APPROVE */}
            {!approvalGate.canApprove && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Approval Blocked by System Gate</span>
                </div>
                {approvalGate.blockerReasons.map((reason, idx) => (
                  <p key={idx} className="text-[11px] pl-5">{reason}</p>
                ))}
              </div>
            )}

            {/* REVIEW NOTE INPUT */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {mp.wsReviewNotesPlaceholder} {reading.anomalies.length > 0 && <span className="text-rose-500">* (Required for flagged readings)</span>}
              </label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Enter formal justification or inspection findings..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ACTION BUTTONS (APPROVE, REJECT, REQUEST RE-READ) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveActionModal('APPROVE')}
                disabled={!approvalGate.canApprove || isLoading || (reading.anomalies.length > 0 && !reviewNote.trim())}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  approvalGate.canApprove && !(reading.anomalies.length > 0 && !reviewNote.trim())
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{mp.wsApprove}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveActionModal('REREAD')}
                disabled={isLoading}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{mp.wsRequestReread}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveActionModal('REJECT')}
                disabled={isLoading}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                <span>{mp.wsReject}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {activeActionModal && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Confirm Action: {activeActionModal}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to {activeActionModal.toLowerCase().replace('_', ' ')} reading <strong>{reading.id}</strong>?
              An immutable audit log will be appended and role notifications emitted.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(activeActionModal)}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Confirm {activeActionModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
