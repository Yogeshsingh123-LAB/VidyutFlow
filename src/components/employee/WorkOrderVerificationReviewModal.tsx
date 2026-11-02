import React, { useState, useEffect } from 'react';
import { WorkOrder, WorkOrderVerificationReview } from '../../types';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { getEvidenceThumbnailUrl } from '../../services/evidenceService';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  UserCheck,
  Clock,
  Camera,
  FileCheck2,
  MapPin,
  History,
  Lock
} from 'lucide-react';

interface WorkOrderVerificationReviewModalProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onDecisionCompleted?: () => void;
}

export const WorkOrderVerificationReviewModal: React.FC<WorkOrderVerificationReviewModalProps> = ({
  workOrder,
  isOpen,
  onClose,
  onDecisionCompleted
}) => {
  const {
    reviewWorkOrderCompletion,
    assignComplaintToField,
    activeUser,
    currentRole,
    fieldEngineers,
    complaints,
    showToast
  } = useApp();
  const { language } = useLanguage();

  const [decision, setDecision] = useState<'approve' | 'request_more_info' | 'reject' | 'reassign'>('approve');
  const [reason, setReason] = useState('');
  const [selectedReassignEngineer, setSelectedReassignEngineer] = useState(
    fieldEngineers[0]?.name || 'Ramesh Patel'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const report = workOrder.completionReport;
  const linkedComplaint = complaints.find(c => c.id === workOrder.complaintId);
  const isAuthorized = currentRole === 'employee' || currentRole === 'admin';

  // Load photos from IndexedDB/cache
  useEffect(() => {
    if (!isOpen || !report?.evidenceItems) return;
    let isCancelled = false;

    const loadThumbnails = async () => {
      const map: Record<string, string> = {};
      for (const item of report.evidenceItems) {
        if (item.thumbnailUrl) {
          map[item.id] = item.thumbnailUrl;
        } else {
          const url = await getEvidenceThumbnailUrl(item.id);
          if (url) map[item.id] = url;
        }
      }
      if (!isCancelled) {
        setThumbnails(map);
      }
    };

    void loadThumbnails();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, report]);

  if (!isOpen) return null;

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!isAuthorized) {
      setErrorText(`Access Denied: Role "${currentRole.toUpperCase()}" cannot verify field completion.`);
      showToast('Unauthorized access attempt logged.', 'error');
      return;
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      setErrorText('Please provide a review reason / justification.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (decision === 'reassign') {
        if (workOrder.complaintId) {
          assignComplaintToField(workOrder.complaintId, selectedReassignEngineer, workOrder.priority, cleanReason);
        }
        reviewWorkOrderCompletion(workOrder.id, {
          reviewedBy: activeUser.name,
          reviewedByRole: currentRole,
          reviewedAt: new Date().toISOString(),
          action: 'reassign',
          reason: `Reassigned to ${selectedReassignEngineer}: ${cleanReason}`
        });
        showToast(`Work order reassigned to ${selectedReassignEngineer}.`, 'info');
      } else {
        const review: WorkOrderVerificationReview = {
          reviewedBy: activeUser.name,
          reviewedByRole: currentRole,
          reviewedAt: new Date().toISOString(),
          action: decision,
          reason: cleanReason
        };
        const ok = reviewWorkOrderCompletion(workOrder.id, review);
        if (!ok) {
          setErrorText('Verification action failed or access was denied.');
          return;
        }
      }

      onDecisionCompleted?.();
      onClose();
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Review action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checklistItems = report?.checklist ? Object.entries(report.checklist) : [];
  const verifiedCount = checklistItems.filter(([, checked]) => checked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
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
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {workOrder.verificationStatus ? workOrder.verificationStatus.replace('_', ' ').toUpperCase() : 'PENDING VERIFICATION'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              Field Completion Evidence Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submitted by <strong>{workOrder.assignedTo}</strong>{' '}
              {report?.completedAt && `on ${new Date(report.completedAt).toLocaleString()}`}
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

        {/* Unauthorized Warning if not staff */}
        {!isAuthorized && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              <strong>Access Denied:</strong> Your current role ({currentRole.toUpperCase()}) cannot approve or reject field verification. Only authorized Employees and Admins may make closure decisions.
            </span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorText && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Evidence Completeness Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Evidence Completeness
              </span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                {report ? 'Report & Evidence Submitted' : 'Pending Submission'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Photos Attached
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {report?.evidenceItems?.length || 0} photo(s)
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Checklist Passed
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {verifiedCount} / {checklistItems.length || 4} verified
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Linked Case
              </span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                {workOrder.complaintId || workOrder.applicationId || 'None'}
              </span>
            </div>
          </div>

          {/* Before & After Photos Display */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-blue-600" />
              Submitted Photo Evidence
            </h4>
            {report?.evidenceItems && report.evidenceItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {report.evidenceItems.map((item, idx) => {
                  const preview = thumbnails[item.id] || item.thumbnailUrl;
                  return (
                    <div
                      key={item.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900/60"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                          {item.type === 'before' ? 'Before Work' : item.type === 'after' ? 'After Work (Restored)' : item.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(item.fileSize / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      {preview ? (
                        <img
                          src={preview}
                          alt={`${item.type} evidence`}
                          className="w-full h-44 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-full h-44 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                          <Camera className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 mt-2 italic">
                        {item.caption || `Photo #${idx + 1}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 italic">
                {report?.safetyPhotoExemptionReason ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium not-italic flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Photo Exemption Declared: {report.safetyPhotoExemptionReason}
                  </span>
                ) : (
                  'No photographs attached to this work order report.'
                )}
              </div>
            )}
          </div>

          {/* Technical Observations & Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Technical Observations
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {report?.technicalObservations || 'No technical observations recorded.'}
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Repair Action Taken
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {report?.repairAction || 'Standard repair procedure.'}
                </p>
                {report?.materialsUsed && report.materialsUsed.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400">Materials: </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {report.materialsUsed.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" /> Verified Safety Checklist
                </span>
                <div className="space-y-1.5">
                  {checklistItems.map(([item, checked]) => (
                    <div key={item} className="flex items-center gap-2">
                      {checked ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={checked ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through'}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {report?.gpsLocation && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Geotag: {report.gpsLocation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Complaint Context & Prior Action History */}
          {linkedComplaint && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Linked Consumer Grievance: {linkedComplaint.id} ({linkedComplaint.consumerName})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  SLA: {linkedComplaint.slaTargetHours} hrs
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {linkedComplaint.description}
              </p>
            </div>
          )}

          {/* Review Decision Form */}
          <form onSubmit={handleDecisionSubmit} className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Verification Decision & Quality Sign-Off
            </h4>

            {/* Decision Radio Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <label
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  decision === 'approve'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">Approve</span>
                  <input
                    type="radio"
                    name="decision"
                    value="approve"
                    checked={decision === 'approve'}
                    onChange={() => setDecision('approve')}
                    className="text-emerald-600"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Evidence sufficient. Close work order & resolve grievance.
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  decision === 'request_more_info'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-700 dark:text-amber-400">Request Info</span>
                  <input
                    type="radio"
                    name="decision"
                    value="request_more_info"
                    checked={decision === 'request_more_info'}
                    onChange={() => setDecision('request_more_info')}
                    className="text-amber-600"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Return to engineer with request for more photos/clarity.
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  decision === 'reject'
                    ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-rose-700 dark:text-rose-400">Reject</span>
                  <input
                    type="radio"
                    name="decision"
                    value="reject"
                    checked={decision === 'reject'}
                    onChange={() => setDecision('reject')}
                    className="text-rose-600"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Deficient or incomplete. Reject work for on-site rework.
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  decision === 'reassign'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-700 dark:text-blue-400">Reassign</span>
                  <input
                    type="radio"
                    name="decision"
                    value="reassign"
                    checked={decision === 'reassign'}
                    onChange={() => setDecision('reassign')}
                    className="text-blue-600"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  Route to alternate field squad for specialized handling.
                </span>
              </label>
            </div>

            {decision === 'reassign' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reassign to Field Engineer
                </label>
                <select
                  value={selectedReassignEngineer}
                  onChange={e => setSelectedReassignEngineer(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  {fieldEngineers.map(eng => (
                    <option key={eng.id} value={eng.name}>
                      {eng.name} ({eng.subdivision} • {eng.designation})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verification Reason / Remarks *
              </label>
              <textarea
                rows={2}
                required
                placeholder={
                  decision === 'approve'
                    ? 'State verified conditions (e.g. restoration verified on site, voltages normal, clearances met).'
                    : decision === 'request_more_info'
                    ? 'Specify exact details required from the engineer...'
                    : 'State reasons for rejection or instructions for rework...'
                }
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-slate-400">
                Reviewer: <strong>{activeUser.name}</strong> ({currentRole.toUpperCase()})
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
                  disabled={isSubmitting || !isAuthorized}
                  className={`px-5 py-2 rounded-lg font-semibold text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    decision === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decision === 'request_more_info'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : decision === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSubmitting ? 'Recording Decision...' : `Confirm ${decision.replace('_', ' ').toUpperCase()}`}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
