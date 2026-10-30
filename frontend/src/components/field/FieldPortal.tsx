import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { UGVCL_LOGO_PATH, FEEDER_METRICS } from '../../data/mockData';
import { WorkOrder, FeederHealth } from '../../types';
import { fetchLiveRequests, useLivePoll } from '../../utils/liveData';
import { subscribeBackendSession } from '../../utils/backendSession';
import { getServiceWorkerState } from '../../utils/serviceWorkerRegistration';
import {
  FieldSyncTaskStatus,
  OfflineFieldQueueItem,
  dismissFieldQueueConflict,
  enqueueFieldInspection,
  flushOfflineFieldQueue,
  getManualOfflineOverride,
  getVisibleFieldQueue,
  hydrateFieldQueueFromIndexedDb,
  isBrowserOnline,
  requeueSameUuidForIdempotencyCheck,
  resolveConflictWithUpdatedOutcome,
  setManualOfflineOverride,
  subscribeFieldQueue,
} from '../../utils/offlineFieldSync';
import {
  FIELD_UI_TRANSLATIONS,
  localizeFeederName,
  localizeFeederStatus,
  localizeTerminalCondition,
  localizeSealStatus,
  localizeFieldTechnicianRemarks,
} from '../../i18n/fieldContentTranslations';
import {
  localizeSubdivision,
  localizeConsumerAddress,
} from '../../i18n/consumerContentTranslations';
import {
  localizeEmployeeDesignation,
  localizeWorkOrderTitle,
  localizeWorkOrderType,
  localizeWorkOrderStatus,
  localizeWorkOrderScheduledDate,
  localizePriorityLevel,
  localizeAssignedActorName,
} from '../../i18n/employeeContentTranslations';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeAuditTrailNote,
} from '../../i18n/incidentLocalization';
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Wifi,
  WifiOff,
  FileCheck,
  AlertTriangle,
  Zap,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Flame,
  X,
} from 'lucide-react';

const DEFAULT_TECH_REMARKS_SET = new Set(
  Object.values(FIELD_UI_TRANSLATIONS).map((d) => d.defaultTechnicianRemarks)
);
const DEFAULT_HAZARD_REMARKS_SET = new Set(
  Object.values(FIELD_UI_TRANSLATIONS).map((d) => d.defaultHazardRemarks)
);

export const FieldPortal: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    workOrders,
    updateWorkOrderStatus,
    reportFeederFault,
    showToast,
    openCaseDrawer,
    activeUser,
    roleIncidents,
    acknowledgeIncident,
    openIncidentModal,
  } = useApp();

  const feeders: FeederHealth[] = FEEDER_METRICS;
  const criticalIncidents = roleIncidents;
  const acknowledgeCriticalIncident = acknowledgeIncident;
  const openDetailDrawer = (c: { type: 'workorder' | 'complaint' | 'application'; id: string }) => {
    openCaseDrawer(c.type, c.id);
  };

  const submitSiteInspection = (
    woId: string,
    data: {
      meterSerial: string;
      readingKwh: number;
      sealIntact: boolean;
      terminalCondition: 'Normal' | 'Burnt' | 'Loose';
      voltageR: number;
      voltageY: number;
      voltageB: number;
      gpsLocation: string;
      photoAttached: boolean;
      technicianRemarks: string;
      submittedBy: string;
    }
  ) => {
    updateWorkOrderStatus(woId, 'Completed', {
      meterSerialScanned: data.meterSerial,
      readingKwh: data.readingKwh,
      sealIntact: data.sealIntact,
      terminalCondition: data.terminalCondition,
      tamperDetected: false,
      testedPhaseVoltage: {
        r: data.voltageR,
        y: data.voltageY,
        b: data.voltageB,
      },
      technicianRemarks: data.technicianRemarks,
      photoUploaded: data.photoAttached,
    });
  };

  const { language, t } = useLanguage();
  const tf = t.field;

  // Critical incidents specifically assigned to this Field Engineer
  const assignedIncidents = criticalIncidents.filter(
    (inc) =>
      inc.status !== 'RESOLVED' &&
      (inc.assignedToUserId === activeUser.id ||
        inc.assignedEngineerName === activeUser.name ||
        (!inc.assignedToUserId &&
          (inc.responsibleRoles?.includes('field') ||
            (inc as unknown as { targetRoles?: string[] }).targetRoles?.includes('field'))))
  );

  const [offlineSimulated, setOfflineSimulated] = useState<boolean>(() => getManualOfflineOverride());
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => isBrowserOnline());
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineFieldQueueItem[]>(() =>
    getVisibleFieldQueue(activeUser.email || '')
  );
  const liveRequests = useLivePoll(fetchLiveRequests);
  const liveAssignedRequests = (liveRequests.data || []).filter(
    (r) => r.status !== 'COMPLETED' && r.status !== 'REJECTED'
  );

  const [selectedWOId, setSelectedWOId] = useState<string>(
    workOrders.find((w) => w.status !== 'Completed')?.id || workOrders[0]?.id || 'WO-4401'
  );
  const [selectedBackendRequestId, setSelectedBackendRequestId] = useState<string>('');
  const [taskOutcome, setTaskOutcome] = useState<FieldSyncTaskStatus>('COMPLETED');

  const effectiveOffline = offlineSimulated || !browserOnline;

  // Inspection Form State
  const [meterSerial, setMeterSerial] = useState('UGVCL-SM-2026-99412');
  const [readingKwh, setReadingKwh] = useState('14820');
  const [sealIntact, setSealIntact] = useState(true);
  const [terminalCondition, setTerminalCondition] = useState<'Normal' | 'Burnt' | 'Loose'>('Normal');
  const [voltageR, setVoltageR] = useState('234');
  const [voltageY, setVoltageY] = useState('232');
  const [voltageB, setVoltageB] = useState('235');
  const [technicianRemarks, setTechnicianRemarks] = useState(tf.defaultTechnicianRemarks);
  const [gpsLocation, setGpsLocation] = useState('23.5880° N, 72.3693° E (Mehsana North)');

  // Emergency Hazard Reporting Modal
  const [showHazardModal, setShowHazardModal] = useState(false);
  const [selectedFeederId, setSelectedFeederId] = useState(feeders[0]?.id || 'FDR-01');
  const [faultType, setFaultType] = useState<
    'TRANSFORMER_OVERHEATING' | 'FEEDER_OVERLOAD' | 'CRITICAL_FEEDER_OUTAGE'
  >('TRANSFORMER_OVERHEATING');
  const [faultRemarks, setFaultRemarks] = useState(tf.defaultHazardRemarks);

  // Keep default sample remarks synchronized with active language unless edited by user
  useEffect(() => {
    setTechnicianRemarks((prev) =>
      DEFAULT_TECH_REMARKS_SET.has(prev) ? tf.defaultTechnicianRemarks : prev
    );
    setFaultRemarks((prev) =>
      DEFAULT_HAZARD_REMARKS_SET.has(prev) ? tf.defaultHazardRemarks : prev
    );
  }, [language, tf.defaultTechnicianRemarks, tf.defaultHazardRemarks]);

  const handleHazardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const canonicalRemarks = DEFAULT_HAZARD_REMARKS_SET.has(faultRemarks)
      ? FIELD_UI_TRANSLATIONS.en.defaultHazardRemarks
      : faultRemarks;
    reportFeederFault(selectedFeederId, faultType, canonicalRemarks);
    setShowHazardModal(false);
    showToast(
      `Emergency Hazard reported for ${selectedFeederId} — Critical incident broadcasted`,
      'warning'
    );
  };

  const applyQueuedDemoWorkOrder = useCallback(
    (item: OfflineFieldQueueItem) => {
      if (item.target_kind !== 'demo_workorder') return;
      const details = item.inspection_details;
      submitSiteInspection(item.request_id, {
        meterSerial: item.meter_serial,
        readingKwh: details?.readingKwh ?? 0,
        sealIntact: details?.sealIntact ?? true,
        terminalCondition: details?.terminalCondition ?? 'Normal',
        voltageR: details?.voltageR ?? 230,
        voltageY: details?.voltageY ?? 230,
        voltageB: details?.voltageB ?? 230,
        gpsLocation: details?.gpsLocation ?? gpsLocation,
        photoAttached: details?.photoAttached ?? true,
        technicianRemarks: item.notes,
        submittedBy: details?.submittedBy ?? `${activeUser.name} (${activeUser.id})`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeUser.id, activeUser.name, gpsLocation]
  );

  const runQueueFlush = useCallback(
    async (manualOfflineFlag: boolean, showFeedback: boolean) => {
      setIsSyncingQueue(true);
      try {
        const summary = await flushOfflineFieldQueue({
          actorEmail: activeUser.email || '',
          manualOffline: manualOfflineFlag,
          onApplyDemoWorkOrder: applyQueuedDemoWorkOrder,
        });
        if (!summary.skippedOffline && (summary.syncedCount > 0 || summary.duplicateCount > 0)) {
          liveRequests.refresh();
        }
        if (showFeedback) {
          if (summary.conflictCount > 0) {
            showToast(
              `Sync completed with ${summary.conflictCount} server conflict(s) requiring review.`,
              'warning'
            );
          } else if (summary.duplicateCount > 0 && summary.syncedCount === 0) {
            showToast(
              `UUID de-duplication verified: ${summary.duplicateCount} duplicate update(s) ignored safely.`,
              'info'
            );
          } else if (summary.syncedCount > 0 || summary.duplicateCount > 0) {
            showToast(
              `Simulated Online Mode restored — local queue synchronized`,
              'success'
            );
          } else if (!summary.skippedOffline) {
            showToast(
              `Simulated Online Mode restored — local queue synchronized`,
              'success'
            );
          }
        }
        return summary;
      } finally {
        setIsSyncingQueue(false);
      }
    },
    [activeUser.email, applyQueuedDemoWorkOrder, liveRequests, showToast]
  );

  // Hydrate persistent IndexedDB/localStorage queue & subscribe to queue/session updates
  useEffect(() => {
    const syncLocalView = () => {
      setQueueItems(getVisibleFieldQueue(activeUser.email || ''));
    };
    syncLocalView();
    void hydrateFieldQueueFromIndexedDb().then(() => syncLocalView());
    const unsubQueue = subscribeFieldQueue(syncLocalView);
    const unsubSession = subscribeBackendSession(() => {
      syncLocalView();
      if (!getManualOfflineOverride() && isBrowserOnline()) {
        void runQueueFlush(false, false);
      }
    });
    return () => {
      unsubQueue();
      unsubSession();
    };
  }, [activeUser.email, runQueueFlush]);

  // Listen to browser online/offline transitions for automatic reconnect replay
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setBrowserOnline(true);
      if (!getManualOfflineOverride()) {
        void runQueueFlush(false, true);
      }
    };
    const handleOffline = () => {
      setBrowserOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [runQueueFlush]);

  const toggleOfflineMode = () => {
    const next = !offlineSimulated;
    setOfflineSimulated(next);
    setManualOfflineOverride(next);
    if (next) {
      showToast(
        'Simulated Offline Mode enabled — inspections will queue locally',
        'warning'
      );
    } else {
      void runQueueFlush(false, true);
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const canonicalRemarks = DEFAULT_TECH_REMARKS_SET.has(technicianRemarks)
      ? FIELD_UI_TRANSLATIONS.en.defaultTechnicianRemarks
      : technicianRemarks;

    const liveTarget = selectedBackendRequestId
      ? (liveRequests.data || []).find((r) => r.id === selectedBackendRequestId)
      : undefined;

    const queued = enqueueFieldInspection({
      target_kind: liveTarget ? 'backend_request' : 'demo_workorder',
      request_id: liveTarget ? liveTarget.id : selectedWOId,
      title: liveTarget
        ? `${liveTarget.applicant_name} (${liveTarget.zone} · ${liveTarget.requested_load_kw} kW)`
        : selectedWO
          ? `${selectedWO.id} — ${selectedWO.title}`
          : selectedWOId,
      task_status: taskOutcome,
      notes: canonicalRemarks,
      meter_serial: meterSerial,
      actor_email: activeUser.email || '',
      inspection_details: {
        readingKwh: Number(readingKwh) || 0,
        sealIntact,
        terminalCondition,
        voltageR: Number(voltageR) || 230,
        voltageY: Number(voltageY) || 230,
        voltageB: Number(voltageB) || 230,
        gpsLocation,
        photoAttached: true,
        submittedBy: `${activeUser.name} (${activeUser.id})`,
      },
    });

    if (effectiveOffline) {
      showToast(
        `Queued offline (UUID ${queued.client_uuid.slice(0, 8)}) — will auto-sync on reconnect`,
        'warning'
      );
      setActiveTab('offline');
      return;
    }

    const summary = await runQueueFlush(false, false);
    if (summary.conflictCount > 0) {
      showToast(
        `Sync conflict on ${queued.request_id.slice(0, 8)} — review server status in Offline Queue`,
        'warning'
      );
      setActiveTab('offline');
      return;
    }

    showToast(
      liveTarget
        ? `Synced ${taskOutcome} for ${liveTarget.applicant_name} (UUID ${queued.client_uuid.slice(0, 8)})`
        : `Inspection report submitted for ${selectedWOId} — Status updated to Completed`,
      'success'
    );
    setActiveTab(liveTarget ? 'offline' : 'workorders');
  };

  const pendingQueueCount = queueItems.filter((i) => i.sync_state === 'PENDING' || i.sync_state === 'SYNCING').length;
  const conflictItems = queueItems.filter((i) => i.sync_state === 'CONFLICT');

  const pendingWorkOrders = workOrders.filter((w) => w.status !== 'Completed');
  const completedWorkOrders = workOrders.filter((w) => w.status === 'Completed');

  const selectedWO = workOrders.find((w) => w.id === selectedWOId);

  return (
    <div className="space-y-6">
      {/* Field Engineer Top Status Bar */}
      <div className="bg-white dark:bg-[#111827] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t-4 border-t-emerald-600">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-white p-1.5 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
            <img
              src={UGVCL_LOGO_PATH}
              alt={tf.ugvclLogoAlt}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug break-words">
                {tf.consoleTitle}
              </h1>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                {tf.roleBadgeField}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {tf.subtitleOpsPrefix}{' '}
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {activeUser.name}
              </span>{' '}
              •{' '}
              <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                {activeUser.id}
              </span>{' '}
              (
              {localizeEmployeeDesignation(
                activeUser.designation || 'Junior Engineer (Field) / Sr. Lineman',
                language
              )}
              ) · {localizeSubdivision(activeUser.subdivision || 'Feeder Wing Mehsana', language)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHazardModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {tf.btnReportHazard}
          </button>

          <button
            type="button"
            onClick={toggleOfflineMode}
            aria-label={effectiveOffline ? tf.ariaDisableOffline : tf.ariaEnableOffline}
            aria-pressed={effectiveOffline}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              effectiveOffline
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {effectiveOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                {tf.badgeOfflineModeActive}
                {pendingQueueCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                    {pendingQueueCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                {tf.btnOnlineAmr}
                {pendingQueueCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {pendingQueueCount}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Offline Queue Indicator Banner */}
      {effectiveOffline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-950 border border-amber-700/80 text-white px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {tf.offlineBufferActivePrefix}{' '}
                <span className="font-normal text-amber-100/90 normal-case">
                  {tf.offlineBufferActiveDesc}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {getServiceWorkerState() === 'registered' && (
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                {tf.badgeSwOfflineShellReady}
              </span>
            )}
            <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {tf.badgeLocalQueueReady} ({pendingQueueCount})
            </span>
          </div>
        </div>
      )}

      {/* Top-Level Sync Conflict Alert Banner */}
      {conflictItems.length > 0 && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                {tf.conflictAlertTitle} ({conflictItems.length})
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                {conflictItems[0].title} — HTTP {conflictItems[0].conflict_code ?? 409}:{' '}
                {conflictItems[0].conflict_reason}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer"
          >
            {tf.badgeSyncConflict}
          </button>
        </div>
      )}

      {/* Emergency Hazard Reporting Modal */}
      {showHazardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hazard-modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowHazardModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-900/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <Flame className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="hazard-modal-title" className="font-bold text-slate-900 dark:text-white text-base">
                    {tf.hazardModalTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tf.hazardModalSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHazardModal(false)}
                aria-label={t.common.close}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHazardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {tf.labelTargetFeederCorridor}
                </label>
                <select
                  value={selectedFeederId}
                  onChange={(e) => setSelectedFeederId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                >
                  {feeders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.id} — {localizeFeederName(f.name, language)} (
                      {localizeSubdivision(f.subdivision, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {tf.labelDetectedHazardType}
                </label>
                <select
                  value={faultType}
                  onChange={(e) => setFaultType(e.target.value as typeof faultType)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                >
                  <option value="TRANSFORMER_OVERHEATING">
                    {tf.optionHazardTransformerOverheating}
                  </option>
                  <option value="FEEDER_OVERLOAD">{tf.optionHazardFeederOverload}</option>
                  <option value="CRITICAL_FEEDER_OUTAGE">{tf.optionHazardCriticalOutage}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {tf.labelHazardObservations}
                </label>
                <textarea
                  rows={3}
                  required
                  value={faultRemarks}
                  onChange={(e) => setFaultRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHazardModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {tf.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {tf.btnTransmitCriticalAlert}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: FIELD DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Live Assigned Backend Requests (FastAPI) */}
          {liveAssignedRequests.length > 0 && (
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-emerald-200 dark:border-emerald-900/60 overflow-hidden shadow-xs">
              <div className="px-6 py-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                    {tf.sectionLiveAssignedRequests} ({liveAssignedRequests.length})
                  </h2>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {tf.subtitleLiveAssignedRequests}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => liveRequests.refresh()}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {tf.btnRefreshLiveQueue}
                </button>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {liveAssignedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {req.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {req.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {req.category} · {req.requested_load_kw} kW
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {req.applicant_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {req.address || req.zone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBackendRequestId(req.id);
                        setActiveTab('inspections');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      {tf.btnInspectLiveRequest}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#111827] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tf.kpiAssignedWorkOrders}
                </span>
                <Wrench className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {pendingWorkOrders.length}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {tf.kpiAssignedWorkOrdersSub}
              </p>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tf.kpiEmergencyCallouts}
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                1 {tf.kpiEmergencyActiveSuffix}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tf.kpiEmergencySub}
              </p>
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tf.kpiCompletedInspections}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {completedWorkOrders.length}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                {tf.kpiCompletedInspectionsSub}
              </p>
            </div>
          </div>

          {/* Assigned Critical Incidents Section */}
          {assignedIncidents.length > 0 && (
            <div className="bg-white dark:bg-[#111827] rounded-xl border-2 border-rose-300 dark:border-rose-900/70 overflow-hidden shadow-xs">
              <div className="px-6 py-3.5 bg-rose-50/80 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                    {tf.sectionAssignedIncidents} ({assignedIncidents.length})
                  </h2>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-rose-600 text-white">
                  {tf.badgeTargetedDispatch}
                </span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {assignedIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                          {inc.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {localizeIncidentSeverity(inc.severity, language)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {localizeIncidentStatus(inc.status, language)}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {localizeIncidentTitle(inc.title, language)}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {localizeIncidentDescription(inc.description, language)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        {inc.entityId && (
                          <span>
                            {tf.labelFeederAsset} <strong>{inc.entityId}</strong>
                          </span>
                        )}
                        {inc.subdivision && (
                          <span>
                            {tf.labelSubdivision}{' '}
                            <strong>{localizeSubdivision(inc.subdivision, language)}</strong>
                          </span>
                        )}
                        {inc.assignedAt && (
                          <span>
                            {tf.labelAssignedTime} {inc.assignedAt}
                          </span>
                        )}
                        {inc.assignmentNotes && (
                          <span className="text-blue-700 dark:text-blue-300">
                            {tf.labelNotes} {localizeAuditTrailNote(inc.assignmentNotes, language)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openIncidentModal(inc.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                      >
                        {tf.btnReviewAssignment}
                      </button>
                      {inc.status !== 'ACKNOWLEDGED' && inc.status !== 'IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() => acknowledgeCriticalIncident(inc.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
                        >
                          {tf.btnAcknowledge}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('maintenance')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        {tf.btnInspectFeederTelemetry}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Field Itinerary */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">
                {tf.sectionTodaysItinerary}
              </h2>
              <button
                onClick={() => setActiveTab('workorders')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {tf.btnViewAllWorkOrders}
              </button>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {workOrders.map((wo) => {
                const woRefId = wo.complaintId || wo.applicationId;
                return (
                <div
                  key={wo.id}
                  onClick={() => openDetailDrawer({ type: 'workorder', id: wo.id })}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {wo.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          wo.priority === 'Emergency'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : wo.priority === 'High'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {localizePriorityLevel(wo.priority, language)}
                      </span>
                      {woRefId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (woRefId.startsWith('CMP-')) {
                              openDetailDrawer({ type: 'complaint', id: woRefId });
                            } else if (woRefId.startsWith('APP-')) {
                              openDetailDrawer({ type: 'application', id: woRefId });
                            } else {
                              openDetailDrawer({ type: 'workorder', id: wo.id });
                            }
                          }}
                          title={
                            woRefId.startsWith('CMP-')
                              ? tf.tooltipViewSourceComplaint
                              : tf.tooltipViewSourceApplication
                          }
                          className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-0.5 rounded bg-blue-50/70 dark:bg-blue-950/40 cursor-pointer"
                        >
                          {tf.labelRefPrefix} {woRefId}
                        </button>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {localizeWorkOrderTitle(wo.title, language)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />{' '}
                        {localizeConsumerAddress(wo.location, language)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> {tf.labelFeederPrefix}{' '}
                        {localizeFeederName(wo.feederName, language)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {tf.labelScheduledPrefix}{' '}
                        {localizeWorkOrderScheduledDate(wo.scheduledDate, language)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openDetailDrawer({ type: 'workorder', id: wo.id })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      {tf.btnDetails}
                    </button>
                    <select
                      aria-label={`${tf.labelStatusPrefix} ${wo.id}`}
                      value={wo.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as typeof wo.status;
                        updateWorkOrderStatus(wo.id, nextStatus);
                        showToast(`Work Order ${wo.id} updated to "${nextStatus}"`, 'info');
                      }}
                      className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      <option value="Pending">
                        {localizeWorkOrderStatus('Pending', language)}
                      </option>
                      <option value="En Route">
                        {localizeWorkOrderStatus('En Route', language)}
                      </option>
                      <option value="On Site">
                        {localizeWorkOrderStatus('On Site', language)}
                      </option>
                      <option value="Completed">
                        {localizeWorkOrderStatus('Completed', language)}
                      </option>
                    </select>
                    {wo.status !== 'Completed' && (
                      <button
                        onClick={() => {
                          setSelectedWOId(wo.id);
                          setActiveTab('inspections');
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        {tf.btnPerformInspection}
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNED WORK ORDERS */}
      {activeTab === 'workorders' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white text-base">
              {tf.headingAssignedWorkOrders}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tf.subtitleAssignedWorkOrders}
            </p>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {workOrders.map((wo) => {
              const woRefId = wo.complaintId || wo.applicationId;
              return (
              <div
                key={wo.id}
                onClick={() => openDetailDrawer({ type: 'workorder', id: wo.id })}
                className="p-5 flex flex-col justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {wo.id}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {localizeWorkOrderTitle(wo.title, language)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tf.labelTypePrefix} {localizeWorkOrderType(wo.type, language)} ·{' '}
                      {tf.labelLocationPrefix} {localizeConsumerAddress(wo.location, language)}
                      {woRefId ? (
                        <>
                          {' '}· {tf.labelRefPrefix}{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (woRefId.startsWith('CMP-')) {
                                openDetailDrawer({ type: 'complaint', id: woRefId });
                              } else if (woRefId.startsWith('APP-')) {
                                openDetailDrawer({ type: 'application', id: woRefId });
                              } else {
                                openDetailDrawer({ type: 'workorder', id: wo.id });
                              }
                            }}
                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {woRefId}
                          </button>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openDetailDrawer({ type: 'workorder', id: wo.id })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      {tf.btnDetails}
                    </button>
                    {wo.status !== 'Completed' ? (
                      <button
                        onClick={() => {
                          setSelectedWOId(wo.id);
                          setActiveTab('inspections');
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {tf.btnEnterInspectionFindings}
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {tf.badgeCompleted}
                      </span>
                    )}
                  </div>
                </div>
                {wo.inspectionReport && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3.5 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> {tf.labelInspectionFindingsRecorded}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {tf.labelMeterSerialPrefix}{' '}
                      <span className="font-mono">{wo.inspectionReport.meterSerialScanned}</span> ·{' '}
                      {tf.labelReadingPrefix} {wo.inspectionReport.readingKwh} kWh ·{' '}
                      {tf.labelVoltagePrefix}{' '}
                      {wo.inspectionReport.testedPhaseVoltage?.r ?? 234}V /{' '}
                      {wo.inspectionReport.testedPhaseVoltage?.y ?? 232}V /{' '}
                      {wo.inspectionReport.testedPhaseVoltage?.b ?? 235}V
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {tf.labelRemarksPrefix}{' '}
                      {localizeFieldTechnicianRemarks(
                        wo.inspectionReport.technicianRemarks,
                        language
                      )}
                    </p>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SITE INSPECTION FORM */}
      {activeTab === 'inspections' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {tf.headingSiteInspectionReport}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tf.labelTaskPrefix}{' '}
                  {selectedBackendRequestId
                    ? (() => {
                        const r = (liveRequests.data || []).find((x) => x.id === selectedBackendRequestId);
                        return r
                          ? `[FastAPI ${r.id.slice(0, 8)}] ${r.applicant_name} (${r.zone} · ${r.requested_load_kw} kW)`
                          : selectedBackendRequestId;
                      })()
                    : selectedWO
                      ? `${selectedWO.id} — ${localizeWorkOrderTitle(selectedWO.title, language)}`
                      : tf.defaultInspectionTaskFallback}
                </p>
              </div>
            </div>

            <form onSubmit={handleInspectionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {tf.labelInspectionTarget}
                  </label>
                  <select
                    value={selectedBackendRequestId ? `backend:${selectedBackendRequestId}` : `wo:${selectedWOId}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('backend:')) {
                        setSelectedBackendRequestId(val.slice('backend:'.length));
                      } else {
                        setSelectedBackendRequestId('');
                        setSelectedWOId(val.replace(/^wo:/, ''));
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                  >
                    {liveAssignedRequests.map((req) => (
                      <option key={`backend:${req.id}`} value={`backend:${req.id}`}>
                        [FastAPI {req.id.slice(0, 8)}] {req.applicant_name} ({req.status} · {req.requested_load_kw} kW)
                      </option>
                    ))}
                    {workOrders.map((wo) => (
                      <option key={`wo:${wo.id}`} value={`wo:${wo.id}`}>
                        {wo.id} — {localizeWorkOrderTitle(wo.title, language)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {tf.labelFieldSyncOutcome}
                  </label>
                  <select
                    value={taskOutcome}
                    onChange={(e) => setTaskOutcome(e.target.value as FieldSyncTaskStatus)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="COMPLETED">{tf.optionOutcomeCompleted}</option>
                    <option value="FIELD_VERIFIED">{tf.optionOutcomeFieldVerified}</option>
                    <option value="BLOCKED">{tf.optionOutcomeBlocked}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {tf.labelScannedMeterSerial}
                  </label>
                  <input
                    type="text"
                    required
                    value={meterSerial}
                    onChange={(e) => setMeterSerial(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {tf.labelVerifiedMeterReading}
                  </label>
                  <input
                    type="number"
                    required
                    value={readingKwh}
                    onChange={(e) => setReadingKwh(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {tf.labelOpticalSealStatus}
                  </label>
                  <select
                    value={sealIntact ? 'intact' : 'broken'}
                    onChange={(e) => setSealIntact(e.target.value === 'intact')}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="intact">{tf.optionSealIntactVerified}</option>
                    <option value="broken">{tf.optionSealBrokenSuspicious}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {tf.labelTerminalBlockCondition}
                  </label>
                  <select
                    value={terminalCondition}
                    onChange={(e) =>
                      setTerminalCondition(e.target.value as 'Normal' | 'Burnt' | 'Loose')
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Normal">{tf.optionTerminalNormal}</option>
                    <option value="Burnt">{tf.optionTerminalBurnt}</option>
                    <option value="Loose">{tf.optionTerminalLooseNeutral}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {tf.labelTestedPhaseVoltages}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase">
                      {tf.labelRPhase}
                    </span>
                    <input
                      type="number"
                      value={voltageR}
                      onChange={(e) => setVoltageR(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 uppercase">
                      {tf.labelYPhase}
                    </span>
                    <input
                      type="number"
                      value={voltageY}
                      onChange={(e) => setVoltageY(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">
                      {tf.labelBPhase}
                    </span>
                    <input
                      type="number"
                      value={voltageB}
                      onChange={(e) => setVoltageB(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {tf.labelSitePhotoEvidence}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {tf.labelGpsGeotag} {gpsLocation}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          pos => {
                            const coords = `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`;
                            setGpsLocation(coords);
                            showToast(`GPS Geotag updated: ${coords}`, 'success');
                          },
                          () => {
                            showToast('Browser GPS permission declined; retaining last verified feeder geotag.', 'info');
                          },
                          { enableHighAccuracy: true, timeout: 5000 }
                        );
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>
                      {language === 'gu'
                        ? 'લાઇવ GPS લો'
                        : language === 'hi'
                        ? 'लाइव GPS लें'
                        : language === 'mr'
                        ? 'लाइव्ह GPS घ्या'
                        : 'Capture Live GPS'}
                    </span>
                  </button>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                    {tf.badgeGeotagVerified}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {tf.labelTechnicianObservations}
                </label>
                <textarea
                  rows={3}
                  required
                  value={technicianRemarks}
                  onChange={(e) => setTechnicianRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-xs transition-all cursor-pointer"
              >
                {tf.btnSignTransmitReport}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: OFFLINE QUEUE */}
      {activeTab === 'offline' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {tf.headingLivePersistentQueue}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tf.subtitleLivePersistentQueue}
              </p>
            </div>
            <button
              type="button"
              disabled={isSyncingQueue}
              onClick={() => {
                setOfflineSimulated(false);
                setManualOfflineOverride(false);
                void runQueueFlush(false, true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              {isSyncingQueue ? tf.btnSyncingQueue : tf.btnSyncQueueNow}
            </button>
          </div>

          {queueItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-5 text-xs text-slate-500 dark:text-slate-400">
              {tf.emptyPersistentQueue}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {queueItems.map((item) => (
                <div key={item.client_uuid} className="p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          UUID: {item.client_uuid.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                          {item.task_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.meter_serial ? `${item.meter_serial} · ` : ''}
                        {item.notes} · <Clock className="w-3 h-3 inline -mt-0.5" />{' '}
                        {new Date(item.created_offline_at).toLocaleString()}
                      </p>
                      {item.last_network_error && item.sync_state === 'PENDING' && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          {item.last_network_error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {item.sync_state === 'SYNCED' && (
                        <>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            {tf.badgeSyncedToServer}
                          </span>
                          {item.target_kind === 'backend_request' && (
                            <button
                              type="button"
                              onClick={() => {
                                requeueSameUuidForIdempotencyCheck(item.client_uuid);
                                if (!effectiveOffline) {
                                  void runQueueFlush(false, true);
                                }
                              }}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              {tf.btnTestUuidDeduplication}
                            </button>
                          )}
                        </>
                      )}
                      {item.sync_state === 'DUPLICATE' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {tf.badgeUuidDeduplicated}
                        </span>
                      )}
                      {item.sync_state === 'SYNCING' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                          {tf.badgeSyncingNow}
                        </span>
                      )}
                      {item.sync_state === 'PENDING' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          {tf.badgePendingSync}
                        </span>
                      )}
                      {item.sync_state === 'CONFLICT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          {tf.badgeSyncConflict}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.sync_state === 'CONFLICT' && (
                    <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <p className="text-xs text-rose-800 dark:text-rose-200">
                        <strong>HTTP {item.conflict_code ?? 409}:</strong>{' '}
                        {item.conflict_reason || tf.conflictAlertTitle}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {item.conflict_code === 409 && item.task_status !== 'FIELD_VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => {
                              resolveConflictWithUpdatedOutcome(item.client_uuid, 'FIELD_VERIFIED');
                              if (!effectiveOffline) {
                                void runQueueFlush(false, true);
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            {tf.btnRetryFieldVerified}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            dismissFieldQueueConflict(item.client_uuid);
                            liveRequests.refresh();
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          {tf.btnDismissConflict}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FEEDER PATROL & LINE SURVEILLANCE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Zap className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {tf.headingFeederPatrol}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tf.subtitleFeederPatrol}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('workorders')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
              >
                {tf.btnViewAssignedWorkOrdersArrow}
              </button>
            </div>

            {/* Feeder Health Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tf.summaryMonitoredFeeders}
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {feeders.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{tf.summaryMonitoredFeedersSub}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tf.summaryFeedersAttention}
                </span>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {feeders.filter((f: FeederHealth) => f.status !== 'Optimal').length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{tf.summaryFeedersAttentionSub}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tf.summaryOpenFieldWorkOrders}
                </span>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {pendingWorkOrders.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tf.summaryOpenFieldWorkOrdersSub}
                </p>
              </div>
            </div>

            {/* Feeder Cards */}
            {feeders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {feeders.map((fdr: FeederHealth) => {
                  const loadPercent = Math.min(
                    100,
                    Math.round((fdr.peakLoadAmps / fdr.ratedCapacityAmps) * 100)
                  );
                  const relatedWO = workOrders.find(
                    (w) =>
                      w.feederName.toLowerCase().includes(fdr.name.split(' ')[1]?.toLowerCase() || '') &&
                      w.status !== 'Completed'
                  );

                  return (
                    <div
                      key={fdr.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                {fdr.id}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {localizeSubdivision(fdr.subdivision, language)}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                              {localizeFeederName(fdr.name, language)}
                            </h3>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                              fdr.status === 'Critical Overload'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                : fdr.status === 'Warning'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {localizeFeederStatus(fdr.status, language)}
                          </span>
                        </div>

                        {/* Load Bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500 dark:text-slate-400">
                              {tf.labelConductorLoadUtilization}
                            </span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {fdr.peakLoadAmps}A / {fdr.ratedCapacityAmps}A ({loadPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                loadPercent >= 95
                                  ? 'bg-rose-600'
                                  : loadPercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${loadPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2">
                            <span className="text-[10px] text-slate-400 block">
                              {tf.labelPeakLoad}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {((fdr.peakLoadAmps * fdr.voltageKv * 1.732) / 1000).toFixed(1)} MW
                            </span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2">
                            <span className="text-[10px] text-slate-400 block">
                              {tf.labelTransformers}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {fdr.transformersCount} {tf.unitDts}
                            </span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2">
                            <span className="text-[10px] text-slate-400 block">
                              {tf.labelConsumers}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {fdr.consumersConnected.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        {relatedWO ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">
                            {tf.labelLinkedWorkOrder} {relatedWO.id} (
                            {localizePriorityLevel(relatedWO.priority, language)})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {tf.noOpenFaultCalloutsOnFeeder}
                          </span>
                        )}

                        {relatedWO ? (
                          <button
                            onClick={() => {
                              setSelectedWOId(relatedWO.id);
                              setActiveTab('inspections');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            {tf.btnInspectFeederPrefix} {relatedWO.id}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              showToast(
                                `Logged routine corridor patrol check for ${fdr.id} (${fdr.name})`,
                                'success'
                              )
                            }
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            {tf.btnLogPatrolCheck}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <Sliders className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {tf.emptyFeederRecordsTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {tf.emptyFeederRecordsDesc}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: COMPLETED JOBS & INSPECTION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                {tf.headingCompletedJobs}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tf.subtitleCompletedJobs}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {completedWorkOrders.length} {tf.badgeCompletedJobsCountSuffix}
              </span>
              <button
                onClick={() => setActiveTab('workorders')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {tf.btnAllWorkOrders}
              </button>
            </div>
          </div>

          {completedWorkOrders.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {completedWorkOrders.map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => openDetailDrawer({ type: 'workorder', id: wo.id })}
                  className="p-5 space-y-3 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {wo.id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {localizeWorkOrderType(wo.type, language)}
                        </span>
                        {(() => {
                          const woRefId = wo.complaintId || wo.applicationId;
                          return woRefId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (woRefId.startsWith('CMP-')) {
                                  openDetailDrawer({ type: 'complaint', id: woRefId });
                                } else if (woRefId.startsWith('APP-')) {
                                  openDetailDrawer({ type: 'application', id: woRefId });
                                } else {
                                  openDetailDrawer({ type: 'workorder', id: wo.id });
                                }
                              }}
                              className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {tf.labelRefPrefix} {woRefId}
                            </button>
                          ) : null;
                        })()}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                        {localizeWorkOrderTitle(wo.title, language)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />{' '}
                          {localizeConsumerAddress(wo.location, language)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> {tf.labelFeederPrefix}{' '}
                          {localizeFeederName(wo.feederName, language)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />{' '}
                          {tf.labelScheduledPrefix}{' '}
                          {localizeWorkOrderScheduledDate(wo.scheduledDate, language)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 self-start sm:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openDetailDrawer({ type: 'workorder', id: wo.id })}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        {tf.btnViewCaseFile}
                      </button>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {tf.badgeCompleted}
                      </span>
                    </div>
                  </div>

                  {wo.inspectionReport ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" /> {tf.labelRecordedInspectionReport}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {wo.actionHistory?.[wo.actionHistory.length - 1]?.timestamp || '15-Oct 14:30'} · {tf.labelEngineerPrefix}{' '}
                          {localizeAssignedActorName(wo.assignedTo, language)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">
                            {tf.labelScannedMeterSerialShort}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.meterSerialScanned}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">
                            {tf.labelVerifiedReadingShort}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.readingKwh} kWh
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">
                            {tf.labelSealAndTerminal}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {localizeSealStatus(wo.inspectionReport.sealIntact, language)} ·{' '}
                            {localizeTerminalCondition(
                              wo.inspectionReport.terminalCondition,
                              language
                            )}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">
                            {tf.labelPhaseVoltagesShort}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.testedPhaseVoltage?.r ?? 234}V /{' '}
                            {wo.inspectionReport.testedPhaseVoltage?.y ?? 232}V /{' '}
                            {wo.inspectionReport.testedPhaseVoltage?.b ?? 235}V
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 pt-1">
                        <strong>{tf.labelRemarksPrefix}</strong>{' '}
                        {localizeFieldTechnicianRemarks(
                          wo.inspectionReport.technicianRemarks,
                          language
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 text-xs text-slate-500 dark:text-slate-400">
                      {tf.fallbackWorkOrderCompletedPrefix}
                      {localizeWorkOrderTitle(wo.title, language)}
                      {tf.fallbackWorkOrderCompletedSuffix}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {tf.emptyCompletedJobsTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {tf.emptyCompletedJobsDesc}
              </p>
              <button
                onClick={() => setActiveTab('workorders')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {tf.btnViewAssignedWorkOrdersPlain}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
