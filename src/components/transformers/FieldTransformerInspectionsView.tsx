import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardCheck,
  Camera,
  MapPin,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCheck,
  X,
  Wrench,
  Clock,
  UserCheck,
  Play,
  XCircle,
  User,
  History,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEMO_TRANSFORMERS,
  DEFAULT_INSPECTION_CHECKLIST,
  InspectionChecklistItem,
  DemoTransformerAsset
} from '../../data/transformerDemoData';
import {
  storeInspectionPhoto,
  enqueueOfflineInspection,
  getOfflineInspections,
  syncOfflineInspections,
  OfflineInspectionRecord
} from '../../utils/transformerInspectionStore';
import {
  WorkOrder,
  TransformerMaintenanceStatus,
  deriveTransformerMaintenanceStatus
} from '../../types';
import {
  isAssignedEngineerForWorkOrder,
  getLatestTransformerWorkOrder
} from '../../utils/transformerMaintenanceEngine';

export const FieldTransformerInspectionsView: React.FC = () => {
  const {
    activeUser,
    showToast,
    workOrders,
    fieldEngineers,
    acceptTransformerWorkOrder,
    rejectTransformerWorkOrder,
    startTransformerMaintenanceWork,
    submitTransformerInspectionForReview,
    completeTransformerMaintenanceWorkOrder,
    switchDemoUserAccount,
    activeTransformerTrackingWoId,
    setActiveTransformerTrackingWoId,
    dataMode
  } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;
  const userZone = activeUser?.zone || 'North';

  // State
  const [transformers] = useState<DemoTransformerAsset[]>(DEMO_TRANSFORMERS);
  const [selectedTrId, setSelectedTrId] = useState<string>('tr-north-01-uuid');
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [inboxScope, setInboxScope] = useState<'MY_ASSIGNMENTS' | 'ALL_SUBDIVISION'>('MY_ASSIGNMENTS');
  const [rejectingWoId, setRejectingWoId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [completionNotesInput, setCompletionNotesInput] = useState<string>(
    'All thermal, bushing, and tap-changer maintenance actions completed on site.'
  );

  const [checklist, setChecklist] = useState<InspectionChecklistItem[]>(DEFAULT_INSPECTION_CHECKLIST);
  const [observations, setObservations] = useState('');
  const [gpsAccuracy] = useState<number | null>(4.2);
  const [photoPreviews, setPhotoPreviews] = useState<{ id: string; url: string }[]>([]);
  const [photoBlobs, setPhotoBlobs] = useState<Blob[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueue, setPendingQueue] = useState<OfflineInspectionRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Deep link from NotificationDrawer
  useEffect(() => {
    if (activeTransformerTrackingWoId) {
      setSelectedWoId(activeTransformerTrackingWoId);
      const targetWo = workOrders.find((w) => w.id === activeTransformerTrackingWoId);
      if (targetWo) {
        const matchedTr = transformers.find(
          (t) =>
            t.id === targetWo.transformerId ||
            t.utility_asset_code === targetWo.utilityAssetCode ||
            targetWo.title.includes(t.utility_asset_code)
        );
        if (matchedTr) {
          setSelectedTrId(matchedTr.id);
        }
      }
      setActiveTransformerTrackingWoId(null);
    }
  }, [activeTransformerTrackingWoId, setActiveTransformerTrackingWoId, workOrders, transformers]);

  // Load pending offline queue count
  const refreshQueue = useCallback(async () => {
    const q = await getOfflineInspections();
    setPendingQueue(q);
  }, []);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Zone-filtered transformers
  const zoneTransformers = useMemo(() => {
    const list = transformers.filter((t) => t.zone.toLowerCase() === userZone.toLowerCase());
    return list.length > 0 ? list : transformers;
  }, [transformers, userZone]);

  const activeTransformer = useMemo(() => {
    return zoneTransformers.find((t) => t.id === selectedTrId) || zoneTransformers[0];
  }, [zoneTransformers, selectedTrId]);

  // All transformer maintenance work orders
  const transformerWorkOrders = useMemo(() => {
    return workOrders.filter(
      (w) =>
        w.type === 'Transformer Overload Inspection' ||
        Boolean(w.transformerId) ||
        Boolean(w.utilityAssetCode)
    );
  }, [workOrders]);

  // Filtered inbox assignments
  const inboxWorkOrders = useMemo(() => {
    if (inboxScope === 'ALL_SUBDIVISION') {
      return transformerWorkOrders;
    }
    return transformerWorkOrders.filter((w) =>
      isAssignedEngineerForWorkOrder(w, activeUser, fieldEngineers)
    );
  }, [transformerWorkOrders, inboxScope, activeUser, fieldEngineers]);

  // Detect active work order for the selected transformer (or explicitly selected WO)
  const activeWorkOrder = useMemo(() => {
    if (selectedWoId) {
      const explicit = transformerWorkOrders.find((w) => w.id === selectedWoId);
      if (explicit) return explicit;
    }
    if (!activeTransformer) return null;
    return getLatestTransformerWorkOrder(activeTransformer, workOrders) || null;
  }, [selectedWoId, activeTransformer, transformerWorkOrders, workOrders]);

  // Select a work order and sync the selected transformer
  const handleSelectWorkOrder = (wo: WorkOrder) => {
    setSelectedWoId(wo.id);
    const matchedTr = transformers.find(
      (t) =>
        t.id === wo.transformerId ||
        t.utility_asset_code === wo.utilityAssetCode ||
        wo.title.includes(t.utility_asset_code)
    );
    if (matchedTr) {
      setSelectedTrId(matchedTr.id);
    }
  };

  // Render accessible Maintenance Status Badge
  const renderMaintenanceBadge = (status: TransformerMaintenanceStatus) => {
    switch (status) {
      case 'AWAITING_ACCEPTANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            {tr.maintAwaitingAcceptance || 'Awaiting Acceptance'}
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
            <UserCheck className="w-3 h-3 text-cyan-700" />
            {tr.maintAccepted || 'Accepted'}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Wrench className="w-3 h-3 text-blue-700" />
            {tr.maintInProgress || 'In Progress'}
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <FileText className="w-3 h-3 text-indigo-700" />
            {tr.maintPendingReview || 'Inspection Submitted'}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            {tr.maintCompleted || 'Completed'}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            {tr.maintRejected || 'Rejected • Reassign'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {tr.maintNotAssigned || 'Not Assigned'}
          </span>
        );
    }
  };

  // Stage Action 1: Accept Assignment
  const handleAcceptAssignment = (wo: WorkOrder) => {
    const res = acceptTransformerWorkOrder(wo.id);
    if (res.success) {
      handleSelectWorkOrder(wo);
    }
  };

  // Stage Action 2: Reject Assignment with Mandatory Reason
  const handleConfirmRejectAssignment = (wo: WorkOrder) => {
    if (!rejectionReasonInput.trim()) {
      setRejectionError('Please provide a non-empty reason for rejecting this assignment.');
      return;
    }
    const res = rejectTransformerWorkOrder(wo.id, rejectionReasonInput.trim());
    if (res.success) {
      setRejectingWoId(null);
      setRejectionReasonInput('');
      setRejectionError(null);
    }
  };

  // Stage Action 3: Start Maintenance Work
  const handleStartWork = (wo: WorkOrder) => {
    const res = startTransformerMaintenanceWork(wo.id);
    if (res.success) {
      handleSelectWorkOrder(wo);
    }
  };

  // Stage Action 5: Complete Maintenance Work Order
  const handleCompleteWorkOrder = (wo: WorkOrder) => {
    completeTransformerMaintenanceWorkOrder(wo.id, completionNotesInput);
  };

  // Checklist status toggle
  const toggleChecklistItem = (id: string, status: 'PASS' | 'FAIL' | 'NEEDS_ATTENTION') => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  // Capture photo & store in IndexedDB
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const photoId = `photo-${Date.now()}-${i}`;
      await storeInspectionPhoto(photoId, file);
      const url = URL.createObjectURL(file);
      setPhotoPreviews((prev) => [...prev, { id: photoId, url }]);
      setPhotoBlobs((prev) => [...prev, file]);
    }
    showToast?.('Inspection photo saved to local IndexedDB store', 'info');
  };

  // Stage Action 4: Submit Inspection for Review (transitions IN_PROGRESS -> PENDING_REVIEW, NOT auto-completed)
  const handleSubmitInspection = async () => {
    if (!activeTransformer) return;

    // If linked to a work order, validate state progression
    if (activeWorkOrder) {
      const maintSt = deriveTransformerMaintenanceStatus(activeWorkOrder);
      if (maintSt === 'AWAITING_ACCEPTANCE') {
        showToast?.('Please Accept the assignment and Start Maintenance Work before submitting inspection.', 'warning');
        return;
      }
      if (maintSt === 'REJECTED') {
        showToast?.('Cannot submit inspection for a rejected assignment.', 'error');
        return;
      }
    }

    setIsSubmitting(true);

    const clientUuid = `insp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const checklistMap = checklist.reduce<Record<string, string>>((acc, item) => {
      acc[item.label] = item.status;
      return acc;
    }, {});

    const targetWoId = activeWorkOrder ? activeWorkOrder.id : `WO-TR-${activeTransformer.utility_asset_code}-FLD`;

    const reportPayload: NonNullable<WorkOrder['inspectionReport']> = {
      meterSerialScanned: activeTransformer.serial_number || 'DTR-MTR-VERIFIED',
      readingKwh: Math.round(activeTransformer.rated_kva * 10),
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 238, y: 240, b: 239 },
      technicianRemarks: `Field DTR inspection submitted for ${activeTransformer.utility_asset_code}: ${observations || 'All checklist parameters verified'}.`,
      photoUploaded: photoPreviews.length > 0,
    };

    const record: OfflineInspectionRecord = {
      client_uuid: clientUuid,
      transformer_id: activeTransformer.id,
      work_order_id: targetWoId,
      checklist: checklistMap,
      observations: observations || 'Routine field inspection completed.',
      photo_refs: photoPreviews.map((p) => p.id),
      photoBlobs: photoBlobs,
      gps_accuracy: gpsAccuracy || 5.0,
      latitude: activeTransformer.latitude,
      longitude: activeTransformer.longitude,
      signature: `SIG-${activeUser?.name || 'FIELD-ENG'}-${Date.now()}`,
      review_status: 'PENDING',
      queued_at: new Date().toISOString(),
      status: 'PENDING',
    };

    try {
      if (isOnline) {
        try {
          const res = await fetch(`/api/v1/transformers/${activeTransformer.id}/inspections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              client_uuid: clientUuid,
              work_order_id: record.work_order_id,
              checklist: checklistMap,
              observations: record.observations,
              photo_refs: record.photo_refs,
              gps_accuracy: record.gps_accuracy,
              signature: record.signature,
              review_status: 'PENDING',
            }),
          });
          if (res.ok && activeWorkOrder) {
            submitTransformerInspectionForReview(
              activeWorkOrder.id,
              reportPayload,
              checklistMap,
              record.photo_refs
            );
            setObservations('');
            setPhotoPreviews([]);
            setPhotoBlobs([]);
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Proceed to local state update + IndexedDB queue
        }
      }

      // Enqueue to IndexedDB for offline resilience
      await enqueueOfflineInspection(record);
      await refreshQueue();

      if (activeWorkOrder) {
        submitTransformerInspectionForReview(
          activeWorkOrder.id,
          reportPayload,
          checklistMap,
          record.photo_refs
        );
      } else {
        showToast?.(`Inspection recorded for ${activeTransformer.utility_asset_code} (${clientUuid.slice(0, 10)})`, 'success');
      }

      setObservations('');
      setPhotoPreviews([]);
      setPhotoBlobs([]);
    } catch {
      await enqueueOfflineInspection(record);
      await refreshQueue();
      showToast?.('Network error: Inspection stored offline in IndexedDB', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Trigger for Syncing Offline Queue
  const handleSyncQueue = async () => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineInspections();
      await refreshQueue();
      showToast?.(`Sync finished: ${result.synced} uploaded, ${result.failed} pending`, 'info');
    } catch {
      showToast?.('Sync failed: backend unreachable', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Distribution Transformer Maintenance & Field Inspections
            </h1>
            <p className="text-xs text-slate-500">
              Active Engineer: <strong className="text-slate-800">{activeUser?.name} ({activeUser?.id || 'FLD-UG-201'})</strong> •{' '}
              Subdivision: <strong className="text-slate-700">{userZone} Subdivision</strong>
            </p>
          </div>
        </div>

        {/* Connectivity, Engineer Persona Switcher & Offline Queue Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Engineer Switcher for verifying multi-engineer assignment & reassignment (DEMO mode only) */}
          {dataMode === 'DEMO' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-200">
                DEMO
              </span>
              <User className="w-3.5 h-3.5 text-blue-600" />
              <select
                aria-label="Active Field Engineer Account"
                value={activeUser?.id || 'FLD-UG-201'}
                onChange={(e) => switchDemoUserAccount(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="FLD-UG-201">Vikramaditya Solanki (FLD-UG-201 • North)</option>
                <option value="FLD-UG-209">Hitesh N. Vaghela (FLD-UG-209 • North GIDC)</option>
                <option value="FLD-UG-212">Vikram Zala (FLD-UG-212 • Radial Ops)</option>
                <option value="FLD-UG-204">Dharmesh P. Chaudhari (FLD-UG-204 • Kadi)</option>
              </select>
            </div>
          )}

          <div
            role="status"
            aria-live="polite"
            aria-label={isOnline ? 'Online - Ready to sync' : 'Offline mode - Queuing locally'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? <Wifi aria-hidden="true" className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff aria-hidden="true" className="w-3.5 h-3.5 text-amber-600" />}
            {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
          </div>

          {pendingQueue.length > 0 && (
            <button
              onClick={handleSyncQueue}
              disabled={isSyncing}
              aria-label={`Sync ${pendingQueue.length} queued records`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
            >
              <UploadCloud aria-hidden="true" className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              Sync ({pendingQueue.length} Queued)
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: FIELD ENGINEER MAINTENANCE ASSIGNMENT INBOX */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Transformer Maintenance Assignment Inbox ({inboxWorkOrders.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Accept or reject new dispatches, start on-site maintenance, submit inspection findings, and close verified tasks.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInboxScope('MY_ASSIGNMENTS')}
              className={`px-3 py-1 rounded-md transition-all ${
                inboxScope === 'MY_ASSIGNMENTS' ? 'bg-white shadow-2xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              My Assignments ({transformerWorkOrders.filter((w) => isAssignedEngineerForWorkOrder(w, activeUser, fieldEngineers)).length})
            </button>
            <button
              type="button"
              onClick={() => setInboxScope('ALL_SUBDIVISION')}
              className={`px-3 py-1 rounded-md transition-all ${
                inboxScope === 'ALL_SUBDIVISION' ? 'bg-white shadow-2xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              All Subdivision Tasks ({transformerWorkOrders.length})
            </button>
          </div>
        </div>

        {inboxWorkOrders.length > 0 ? (
          <div className="space-y-3">
            {inboxWorkOrders.map((wo) => {
              const maintStatus = deriveTransformerMaintenanceStatus(wo);
              const isMine = isAssignedEngineerForWorkOrder(wo, activeUser, fieldEngineers);
              const isSelected = activeWorkOrder?.id === wo.id;

              return (
                <div
                  key={wo.id}
                  onClick={() => handleSelectWorkOrder(wo)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/15'
                      : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{wo.id}</span>
                      <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {wo.utilityAssetCode || 'DTR Asset'}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          wo.priority === 'Emergency'
                            ? 'bg-rose-100 text-rose-800'
                            : wo.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {wo.priority} Priority
                      </span>
                      {renderMaintenanceBadge(maintStatus)}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      Updated: {wo.updatedAt ? new Date(wo.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : wo.scheduledDate}
                    </div>
                  </div>

                  <div className="text-xs text-slate-800 font-medium">{wo.title}</div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block">Location / Feeder:</span>
                      <strong className="text-slate-800">{wo.feederName} ({wo.subdivision})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Assigned Engineer:</span>
                      <strong className="text-slate-800">{wo.assignedTo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Dispatched By:</span>
                      <strong className="text-slate-800">{wo.dispatchedBy || 'Subdivision AE Ops'}</strong>
                    </div>
                  </div>

                  {wo.scopeDescription && (
                    <div className="text-xs text-slate-700 bg-white/90 px-3 py-2 rounded-lg border border-slate-200/70">
                      <strong className="text-slate-900">Scope & Recommended Action:</strong> {wo.scopeDescription} •{' '}
                      <span className="text-blue-800 font-medium">{wo.recommendedAction}</span>
                    </div>
                  )}

                  {/* Ownership Guard or Explicit Stage Controls */}
                  {!isMine ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Assigned to <strong>{wo.assignedTo}</strong>. Unrelated engineers cannot accept, reject, or modify this assignment.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70">
                      <div className="text-[11px] text-slate-500 font-medium">
                        {maintStatus === 'AWAITING_ACCEPTANCE' && 'Action Required: Accept or Reject this maintenance dispatch.'}
                        {maintStatus === 'ACCEPTED' && 'Assignment Accepted: Click "Start Maintenance Work" when on site.'}
                        {maintStatus === 'IN_PROGRESS' && 'Work In Progress: Complete the DTR checklist below and submit for review.'}
                        {maintStatus === 'PENDING_REVIEW' && 'Inspection Submitted: Verify final site restoration to mark Completed.'}
                        {maintStatus === 'COMPLETED' && 'Maintenance Work Order Completed & Closed.'}
                        {maintStatus === 'REJECTED' && `Rejected ("${wo.rejectionReason}") — Pending Employee Reassignment.`}
                      </div>

                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {maintStatus === 'AWAITING_ACCEPTANCE' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAcceptAssignment(wo)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {tr.btnAcceptAssignment || 'Accept Assignment'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingWoId(wo.id);
                                setRejectionReasonInput('');
                                setRejectionError(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {tr.btnRejectAssignment || 'Reject Assignment'}
                            </button>
                          </>
                        )}

                        {maintStatus === 'ACCEPTED' && (
                          <button
                            type="button"
                            onClick={() => handleStartWork(wo)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            {tr.btnStartMaintenance || 'Start Maintenance Work'}
                          </button>
                        )}

                        {maintStatus === 'PENDING_REVIEW' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={completionNotesInput}
                              onChange={(e) => setCompletionNotesInput(e.target.value)}
                              placeholder="Final restoration notes..."
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 w-56"
                            />
                            <button
                              type="button"
                              onClick={() => handleCompleteWorkOrder(wo)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {tr.btnCompleteMaintenance || 'Complete Maintenance'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Mandatory Rejection Reason Input Box */}
                  {rejectingWoId === wo.id && isMine && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 text-xs"
                    >
                      <label className="font-bold text-rose-900 block">
                        {tr.lblRejectionReason || 'Mandatory Reason for Rejecting Assignment'} *
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g., Currently engaged in emergency 11kV feeder fault restoration at Visnagar Road; bucket truck unavailable..."
                        value={rejectionReasonInput}
                        onChange={(e) => {
                          setRejectionReasonInput(e.target.value);
                          if (e.target.value.trim()) setRejectionError(null);
                        }}
                        className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
                      />
                      {rejectionError && (
                        <div className="text-rose-700 font-semibold text-[11px]">{rejectionError}</div>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingWoId(null);
                            setRejectionError(null);
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmRejectAssignment(wo)}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-2xs"
                        >
                          Confirm Rejection & Notify Employee
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Compact Timeline History */}
                  {wo.actionHistory && wo.actionHistory.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                        <History className="w-3 h-3" />
                        Work-Order Timeline ({wo.actionHistory.length} events)
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {wo.actionHistory.map((ev, i) => (
                          <div key={i} className="text-[11px] text-slate-600 flex items-start gap-2">
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="font-bold text-slate-800 shrink-0">{ev.stage}:</span>
                            <span className="truncate">{ev.notes}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
            No transformer maintenance work orders currently assigned to <strong>{activeUser?.name}</strong>.
            Switch to &ldquo;All Subdivision Tasks&rdquo; or dispatch a maintenance order from the Employee DTR Cockpit.
          </div>
        )}
      </div>

      {/* Target Asset Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Select Target Transformer in {userZone} Zone for Inspection
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Target Transformer selection">
          {zoneTransformers.map((transformerItem) => {
            const trWo = getLatestTransformerWorkOrder(transformerItem, workOrders);
            const trMaint = deriveTransformerMaintenanceStatus(trWo);
            return (
              <div
                key={transformerItem.id}
                role="radio"
                tabIndex={0}
                aria-checked={activeTransformer?.id === transformerItem.id}
                onClick={() => {
                  setSelectedTrId(transformerItem.id);
                  setSelectedWoId(trWo?.id || null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedTrId(transformerItem.id);
                    setSelectedWoId(trWo?.id || null);
                  }
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeTransformer?.id === transformerItem.id
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">{transformerItem.utility_asset_code}</span>
                  <div className="flex items-center gap-1.5">
                    {renderMaintenanceBadge(trMaint)}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      {transformerItem.rated_kva} kVA
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Feeder: {transformerItem.feeder_id} {trWo ? `• ${trWo.id} (${trWo.assignedTo})` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structured Field Checklist */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Standard DTR Verification Checklist ({activeTransformer?.utility_asset_code})
          </h2>
          {activeWorkOrder && (
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              Linked Order: {activeWorkOrder.id} ({deriveTransformerMaintenanceStatus(activeWorkOrder)})
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {checklist.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-800">{item.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, 'PASS')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    item.status === 'PASS'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, 'NEEDS_ATTENTION')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    item.status === 'NEEDS_ATTENTION'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Attention
                </button>
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, 'FAIL')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                    item.status === 'FAIL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Fail
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observation Notes & Photo Capture */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Field Evidence & Observations
        </h2>

        <div>
          <label htmlFor="lineman-physical-notes" className="text-xs font-semibold text-slate-600 block mb-1">
            Lineman Physical Notes
          </label>
          <textarea
            id="lineman-physical-notes"
            rows={3}
            placeholder="Record oil seepage, breather silica gel state, terminal rust..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label htmlFor="field-photo-input" className="text-xs font-semibold text-slate-600 block mb-2">
            Inspection Photos (Persisted in IndexedDB)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="field-photo-input" className="flex flex-col items-center justify-center w-28 h-24 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50 transition-colors">
              <Camera aria-hidden="true" className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-[11px] text-slate-600 font-medium">+ Add Photo</span>
              <input id="field-photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" aria-label="Upload inspection photo" />
            </label>

            {photoPreviews.map((p, idx) => (
              <div key={p.id} className="relative w-28 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <img src={p.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setPhotoPreviews((prev) => prev.filter((item) => item.id !== p.id));
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>GPS Fix: {activeTransformer?.latitude.toFixed(4)}° N, {activeTransformer?.longitude.toFixed(4)}° E</span>
          </div>
          <span className="font-semibold text-emerald-700">Accuracy: ±{gpsAccuracy}m</span>
        </div>
      </div>

      {/* Submission Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleSubmitInspection}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          {isSubmitting
            ? 'Recording Inspection...'
            : isOnline
              ? tr.btnSubmitForReview || 'Submit Inspection for Review'
              : 'Save Offline to IndexedDB'}
        </button>
      </div>
    </div>
  );
};
