import React, { useState, useEffect, useId } from 'react';
import { WorkOrder, FieldEvidenceItem, WorkOrderCompletionReport } from '../../types';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  validateEvidencePhoto,
  prepareEvidencePhoto,
  blobToDataUrl,
  storeEvidencePhoto,
  getCategoryChecklistTemplate,
  createFieldEvidenceItem,
  isSubmissionInFlight,
  setSubmissionInFlight,
  clearSubmissionInFlight
} from '../../services/evidenceService';
import {
  generateClientUuid,
  isFieldEffectivelyOffline,
  enqueueWorkOrderCompletion
} from '../../utils/offlineFieldSync';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  ShieldAlert,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';

interface WorkOrderEvidenceModalProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const WorkOrderEvidenceModal: React.FC<WorkOrderEvidenceModalProps> = ({
  workOrder,
  isOpen,
  onClose,
  onSubmitted
}) => {
  const { submitWorkOrderCompletionEvidence, activeUser, showToast } = useApp();
  const { language } = useLanguage();

  const [clientUuid, setClientUuid] = useState<string>(() => generateClientUuid());
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const [beforeBlob, setBeforeBlob] = useState<Blob | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [beforeCaption, setBeforeCaption] = useState('');

  const [afterBlob, setAfterBlob] = useState<Blob | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [afterCaption, setAfterCaption] = useState('');

  const [safetyExempt, setSafetyExempt] = useState(false);
  const [safetyReason, setSafetyReason] = useState('');

  const [technicalObservations, setTechnicalObservations] = useState('');
  const [repairAction, setRepairAction] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState(
    workOrder.materialsNeeded ? workOrder.materialsNeeded.join(', ') : ''
  );
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [gpsLocation, setGpsLocation] = useState(
    `${workOrder.gpsCoordinates?.lat || 23.2156}° N, ${workOrder.gpsCoordinates?.lng || 72.6369}° E`
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const beforeInputId = useId();
  const afterInputId = useId();

  // Initialize category checklist
  useEffect(() => {
    if (isOpen) {
      setClientUuid(generateClientUuid());
      const items = getCategoryChecklistTemplate(workOrder.type);
      const initial: Record<string, boolean> = {};
      for (const item of items) {
        initial[item] = false;
      }
      setChecklist(initial);
      setErrorText(null);
    }
  }, [isOpen, workOrder.id, workOrder.type]);

  if (!isOpen) return null;

  const handlePhotoSelect = async (
    file: File,
    type: 'before' | 'after'
  ) => {
    setErrorText(null);
    const err = validateEvidencePhoto(file);
    if (err) {
      setErrorText(err);
      return;
    }
    try {
      const prepared = await prepareEvidencePhoto(file);
      const preview = await blobToDataUrl(prepared);
      if (type === 'before') {
        setBeforeBlob(prepared);
        setBeforePreview(preview);
      } else {
        setAfterBlob(prepared);
        setAfterPreview(preview);
      }
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : 'Photo processing error.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Rule: photo is never mandatory if unsafe/inappropriate, but if no after photo is given, reason must be provided
    if (!afterBlob && !safetyExempt) {
      setErrorText('Please attach an after-work photo or specify a safety exemption reason.');
      return;
    }

    if (safetyExempt && !safetyReason.trim()) {
      setErrorText('Please describe why taking a photo was unsafe or impossible at this site.');
      return;
    }

    if (!repairAction.trim()) {
      setErrorText('Please specify the repair action taken.');
      return;
    }

    if (isSubmissionInFlight(clientUuid)) {
      showToast('A completion submission is already in progress.', 'info');
      return;
    }

    setIsSubmitting(true);
    setSubmissionInFlight(clientUuid);

    try {
      const evidenceItems: FieldEvidenceItem[] = [];

      // Store before photo if provided
      if (beforeBlob) {
        const fileObj = new File([beforeBlob], `before-${workOrder.id}.jpg`, {
          type: 'image/jpeg'
        });
        const { item } = createFieldEvidenceItem({
          workOrderId: workOrder.id,
          type: 'before',
          file: fileObj,
          submittedByUser: activeUser.name,
          relatedComplaintId: workOrder.complaintId,
          caption: beforeCaption || 'Initial site conditions prior to work'
        });
        await storeEvidencePhoto(item.id, beforeBlob);
        item.thumbnailUrl = beforePreview || undefined;
        evidenceItems.push(item);
      }

      // Store after photo if provided
      if (afterBlob) {
        const fileObj = new File([afterBlob], `after-${workOrder.id}.jpg`, {
          type: 'image/jpeg'
        });
        const { item } = createFieldEvidenceItem({
          workOrderId: workOrder.id,
          type: 'after',
          file: fileObj,
          submittedByUser: activeUser.name,
          relatedComplaintId: workOrder.complaintId,
          caption: afterCaption || 'Restored site conditions upon completion'
        });
        await storeEvidencePhoto(item.id, afterBlob);
        item.thumbnailUrl = afterPreview || undefined;
        evidenceItems.push(item);
      }

      const report: WorkOrderCompletionReport = {
        technicalObservations: technicalObservations.trim() || 'Site work completed per standard operating procedure.',
        repairAction: repairAction.trim(),
        materialsUsed: materialsUsed
          ? materialsUsed
              .split(',')
              .map(m => m.trim())
              .filter(Boolean)
          : [],
        checklist,
        completionRemarks: completionRemarks.trim() || 'Restoration complete and verified ready for employee verification.',
        completedAt: new Date().toISOString(),
        locationEvidencePermitted: true,
        gpsLocation,
        evidenceItems,
        clientUuid,
        safetyPhotoExemptionReason: safetyExempt ? safetyReason.trim() : undefined
      };

      // Check if offline
      if (isFieldEffectivelyOffline()) {
        enqueueWorkOrderCompletion({
          clientUuid,
          workOrderId: workOrder.id,
          title: workOrder.title,
          actorEmail: activeUser.email || 'engineer@vidyut.local',
          completionReport: report,
          notes: report.completionRemarks
        });
        submitWorkOrderCompletionEvidence(workOrder.id, report);
        showToast(`Work order completion queued in offline store (${clientUuid.slice(0, 8)}). Will sync when online.`, 'info');
      } else {
        submitWorkOrderCompletionEvidence(workOrder.id, report);
      }

      onSubmitted?.();
      onClose();
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Submission failed. Please retry.');
    } finally {
      clearSubmissionInFlight(clientUuid);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {workOrder.id}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {workOrder.type}
              </span>
              {workOrder.complaintId && (
                <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                  Ref: {workOrder.complaintId}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Field Completion & Evidence Submission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Attach before/after photos, checklist, and notes for authorized employee review.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Returned for more info alert banner */}
        {workOrder.verificationStatus === 'more_info_needed' && workOrder.verificationReview && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-amber-800 dark:text-amber-300 block font-semibold">
                Reviewer Requested More Information ({workOrder.verificationReview.reviewedBy})
              </strong>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                {workOrder.verificationReview.reason}
              </p>
            </div>
          </div>
        )}

        {/* Rejected alert banner */}
        {workOrder.verificationStatus === 'rejected' && workOrder.verificationReview && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-rose-800 dark:text-rose-300 block font-semibold">
                Previous Completion Rejected ({workOrder.verificationReview.reviewedBy})
              </strong>
              <p className="text-rose-700 dark:text-rose-400 mt-0.5">
                {workOrder.verificationReview.reason}
              </p>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorText && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Section 1: Category-Dependent Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              Inspection & Safety Checklist ({workOrder.type})
            </h4>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {Object.keys(checklist).map(item => (
                <label key={item} className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checklist[item] || false}
                    onChange={e => setChecklist(prev => ({ ...prev, [item]: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Before & After Photos */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-blue-600" />
              Field Evidence Photographs
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Attach clear photographs of the site. Metadata is stripped locally for privacy. JPEG, PNG, or WebP up to 5 MiB.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900/60 flex flex-col justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  1. Before-Work Condition (Optional)
                </span>
                {beforePreview ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={beforePreview}
                      alt="Before work preview"
                      className="w-full h-36 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBeforeBlob(null);
                        setBeforePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg h-36 flex flex-col items-center justify-center p-3 text-center">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-500 mb-2">Attach initial photo</span>
                    <label
                      htmlFor={beforeInputId}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Select / Take Photo
                    </label>
                    <input
                      id={beforeInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          void handlePhotoSelect(e.target.files[0], 'before');
                        }
                      }}
                    />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Before photo remarks (optional)"
                  value={beforeCaption}
                  onChange={e => setBeforeCaption(e.target.value)}
                  className="mt-2 w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                />
              </div>

              {/* After Photo */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900/60 flex flex-col justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  2. After-Work Condition (Restoration)
                </span>
                {afterPreview ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img
                      src={afterPreview}
                      alt="After work preview"
                      className="w-full h-36 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAfterBlob(null);
                        setAfterPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg h-36 flex flex-col items-center justify-center p-3 text-center">
                    <Camera className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-500 mb-2">Attach completion photo</span>
                    <label
                      htmlFor={afterInputId}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Select / Take Photo
                    </label>
                    <input
                      id={afterInputId}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          void handlePhotoSelect(e.target.files[0], 'after');
                        }
                      }}
                    />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="After photo remarks (optional)"
                  value={afterCaption}
                  onChange={e => setAfterCaption(e.target.value)}
                  className="mt-2 w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                />
              </div>
            </div>

            {/* Safety Photo Exemption Option */}
            <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyExempt}
                  onChange={e => setSafetyExempt(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Taking a photo was unsafe, inappropriate, or impossible at this location
                </span>
              </label>
              {safetyExempt && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Provide specific reason (e.g. hazardous live substation bay / heavy storm / private consumer area)"
                    value={safetyReason}
                    onChange={e => setSafetyReason(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Technical Observations & Action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Technical Observations *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Observed root cause, terminal conditions, feeder readings..."
                value={technicalObservations}
                onChange={e => setTechnicalObservations(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Repair Action Taken *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Specific repair performed (e.g. replaced jumper clamp, re-tensioned conductor...)"
                value={repairAction}
                onChange={e => setRepairAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section 4: Materials & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Materials / Components Used
              </label>
              <input
                type="text"
                placeholder="e.g. 11kV PG Clamp, 15m ACSR Rabbit Conductor"
                value={materialsUsed}
                onChange={e => setMaterialsUsed(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Permitted GPS Geotag
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={gpsLocation}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        pos => {
                          const coords = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`;
                          setGpsLocation(coords);
                          showToast(`GPS captured: ${coords}`, 'success');
                        },
                        () => {
                          showToast('Retaining permitted feeder location.', 'info');
                        },
                        { timeout: 5000 }
                      );
                    }
                  }}
                  className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                  title="Update GPS"
                >
                  <MapPin className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Completion Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Field Completion Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Final technical remarks for employee verifier..."
              value={completionRemarks}
              onChange={e => setCompletionRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Idempotency UUID: <span className="font-mono">{clientUuid.slice(0, 8)}...</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmitting ? 'Transmitting Evidence...' : 'Submit for Employee Verification'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
