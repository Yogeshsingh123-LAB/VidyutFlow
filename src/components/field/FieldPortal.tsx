import React, { useState, useEffect } from 'react';
import { LazyOutageMapSection } from '../outageMap/LazyOutageMapSection';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { UGVCL_LOGO_PATH, FEEDER_METRICS } from '../../data/mockData';
import { WorkOrder, FeederHealth } from '../../types';
import { WorkOrderEvidenceModal } from './WorkOrderEvidenceModal';
import { FieldMeterReadingModal } from './FieldMeterReadingModal';
import { WORK_ORDER_TRANSITIONS } from '../../services/erpAdapter';
import { fetchLiveRequests, useLivePoll } from '../../utils/liveData';
import { ExportMenu } from '../common/ExportMenu';
import { OfficialDocumentModal } from '../common/OfficialDocumentModal';
import {
  GeneratedOfficialDocument,
  getDocumentUiTranslations,
  generateInspectionSummaryDocument,
} from '../../utils/documentEngine';
import {
  FIELD_UI_TRANSLATIONS,
  localizeFeederName,
  localizeFeederStatus,
  localizeTerminalCondition,
  localizeSealStatus,
  localizeFieldTechnicianRemarks,
  localizeOfflineQueueFailureReason,
  resolveOfflineQueueSafeAction,
} from '../../i18n/fieldContentTranslations';
import { formatErpDateTime } from '../../utils/dateUtils';
import {
  resolveFieldConnectivityStatus,
  FieldConnectivityStatus,
} from '../../utils/fieldOfflineQueue';
import {
  getAnalyticsTransparencyDictionary,
  resolveAnalyticsDataSourceClassification
} from '../../utils/analyticsTransparency';
import {
  selectWorkOrderAndFieldMetrics,
  selectOfflineQueueCanonicalMetrics,
  getCanonicalAnalyticsTranslations
} from '../../utils/canonicalAnalytics';
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
  const [evidenceModalWO, setEvidenceModalWO] = useState<WorkOrder | null>(null);
  const [meterReadingWorkOrder, setMeterReadingWorkOrder] = useState<WorkOrder | null>(null);
  const {
    activeTab,
    setActiveTab,
    workOrders,
    updateWorkOrderStatus,
    reportFeederFault,
    showToast,
    openCaseDrawer,
    activeUser,
    incidents,
    fieldEngineers,
    roleIncidents,
    acknowledgeIncident,
    openIncidentModal,
    isOfflineSimulated,
    setIsOfflineSimulated,
    isBrowserOffline,
    isFieldOfflineActive,
    isFieldSyncing,
    fieldOfflineQueue,
    syncFieldOfflineQueue,
    refreshFieldOfflineQueueFromStorage,
    dataMode,
    backendStatus,
  } = useApp();

  const { language: currentLang } = useLanguage();
  const docUi = getDocumentUiTranslations(currentLang);
  const at = getAnalyticsTransparencyDictionary(currentLang);
  const liveRequests = useLivePoll(fetchLiveRequests);
  const [fieldOfficialDoc, setFieldOfficialDoc] = useState<GeneratedOfficialDocument | null>(null);

  const fieldDocumentActor = {
    id: activeUser.name || 'FLD-UG-201',
    name: activeUser.name,
    role: 'field' as const,
    email: activeUser.email,
    subdivision: activeUser.subdivision,
  };
  const fieldFeederSource = resolveAnalyticsDataSourceClassification({
    dataMode,
    backendStatusState: backendStatus.state,
    isBrowserOffline,
    isOfflineSimulated,
    language: currentLang
  });

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
  const caTranslations = getCanonicalAnalyticsTranslations(language);

  // Critical incidents specifically assigned to this Field Engineer (excluding RESOLVED and CLOSED)
  const assignedIncidents = criticalIncidents.filter(
    (inc) =>
      inc.status !== 'RESOLVED' &&
      inc.status !== 'CLOSED' &&
      (inc.assignedToUserId === activeUser.id ||
        inc.assignedEngineerName === activeUser.name ||
        (!inc.assignedToUserId &&
          (inc.responsibleRoles?.includes('field') ||
            (inc as unknown as { targetRoles?: string[] }).targetRoles?.includes('field'))))
  );

  const fieldCanonicalMetrics = React.useMemo(
    () =>
      selectWorkOrderAndFieldMetrics({
        workOrders,
        fieldEngineers,
        incidents,
        engineerId: activeUser.id,
        engineerName: activeUser.name
      }),
    [workOrders, fieldEngineers, incidents, activeUser.id, activeUser.name]
  );

  const offlineQueueCanonicalMetrics = React.useMemo(
    () => selectOfflineQueueCanonicalMetrics(fieldOfflineQueue, isFieldSyncing),
    [fieldOfflineQueue, isFieldSyncing]
  );

  const offlineSimulated = isFieldOfflineActive;
  const [recentlySynced, setRecentlySynced] = useState(false);
  const recentlySyncedTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSyncingRef = React.useRef(isFieldSyncing);

  useEffect(() => {
    if (prevSyncingRef.current && !isFieldSyncing) {
      setRecentlySynced(true);
      if (recentlySyncedTimeoutRef.current) clearTimeout(recentlySyncedTimeoutRef.current);
      recentlySyncedTimeoutRef.current = setTimeout(() => {
        setRecentlySynced(false);
      }, 4000);
    }
    prevSyncingRef.current = isFieldSyncing;
  }, [isFieldSyncing]);

  const connectivityStatus: FieldConnectivityStatus = resolveFieldConnectivityStatus({
    isBrowserOffline,
    isOfflineSimulated,
    isSyncing: isFieldSyncing,
    queue: fieldOfflineQueue,
    recentlySynced,
    prioritizeNetworkHealth: true,
  });

  // Load saved offline queue items when Field Engineer Portal initializes
  useEffect(() => {
    refreshFieldOfflineQueueFromStorage();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      syncFieldOfflineQueue({ restoreOnline: true });
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncFieldOfflineQueue]);

  const [selectedWOId, setSelectedWOId] = useState<string>(
    workOrders.find((w) => w.status !== 'Completed')?.id || workOrders[0]?.id || 'WO-4401'
  );

  // Inspection Form State
  const [meterSerial, setMeterSerial] = useState('UGVCL-SM-2026-99412');
  const [readingKwh, setReadingKwh] = useState('14820');
  const [sealIntact, setSealIntact] = useState(true);
  const [terminalCondition, setTerminalCondition] = useState<'Normal' | 'Burnt' | 'Loose'>('Normal');
  const [voltageR, setVoltageR] = useState('234');
  const [voltageY, setVoltageY] = useState('232');
  const [voltageB, setVoltageB] = useState('235');
  const [technicianRemarks, setTechnicianRemarks] = useState(tf.defaultTechnicianRemarks);
  const [gpsLocation] = useState('23.5880° N, 72.3693° E (Mehsana North)');

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

  const toggleOfflineMode = () => {
    const next = !isOfflineSimulated;
    setIsOfflineSimulated(next);
    showToast(
      next
        ? 'Simulated Offline Mode enabled (DEMO) — inspections and status updates will queue locally.'
        : 'Online mode restored. Pending offline actions will automatically replay into local ERP state.',
      next ? 'warning' : 'info'
    );
  };

  const handleSimulateSyncNow = (targetClientUuid?: string) => {
    if (isFieldSyncing) return;
    syncFieldOfflineQueue({ restoreOnline: true, targetClientUuid });
  };

  const handleInspectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const canonicalRemarks = DEFAULT_TECH_REMARKS_SET.has(technicianRemarks)
      ? FIELD_UI_TRANSLATIONS.en.defaultTechnicianRemarks
      : technicianRemarks;
    const wasOffline = isFieldOfflineActive;
    submitSiteInspection(selectedWOId, {
      meterSerial,
      readingKwh: Number(readingKwh) || 0,
      sealIntact,
      terminalCondition,
      voltageR: Number(voltageR) || 230,
      voltageY: Number(voltageY) || 230,
      voltageB: Number(voltageB) || 230,
      gpsLocation,
      photoAttached: true,
      technicianRemarks: canonicalRemarks,
      submittedBy: `${activeUser.name} (${activeUser.id})`,
    });
    if (wasOffline) {
      setActiveTab('offline');
    } else {
      showToast(
        `Inspection report submitted for ${selectedWOId} — Status updated to Completed`,
        'success'
      );
      setActiveTab('workorders');
    }
  };

  const pendingOfflineCount = offlineQueueCanonicalMetrics.pendingCount;
  const processingOfflineCount = offlineQueueCanonicalMetrics.processingCount;
  const failedOfflineCount = offlineQueueCanonicalMetrics.failedCount;
  const conflictCount = offlineQueueCanonicalMetrics.conflictCount;
  const completedOfflineCount = offlineQueueCanonicalMetrics.completedCount;
  const pendingWorkOrders = workOrders.filter((w) => w.status !== 'Completed');
  const completedWorkOrders = workOrders.filter((w) => w.status === 'Completed');

  const selectedWO = workOrders.find((w) => w.id === selectedWOId);

  const getStatusBadgeConfig = (status: FieldConnectivityStatus) => {
    switch (status) {
      case 'SYNCING':
        return {
          label: tf.statusSyncingLabel,
          icon: <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" aria-hidden="true" />,
          bg: 'bg-blue-50 dark:bg-blue-950/60',
          text: 'text-blue-800 dark:text-blue-200',
          border: 'border-blue-300 dark:border-blue-700',
        };
      case 'OFFLINE':
        return {
          label: tf.statusRealOfflineLabel,
          icon: <WifiOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-amber-100 dark:bg-amber-950/80',
          text: 'text-amber-900 dark:text-amber-200 font-bold',
          border: 'border-amber-400 dark:border-amber-700',
        };
      case 'SIMULATED_OFFLINE':
        return {
          label: tf.statusSimOfflineLabel,
          demoBadge: tf.badgeDemoIndicator,
          icon: <Sliders className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          text: 'text-amber-900 dark:text-amber-200 font-semibold',
          border: 'border-amber-300 dark:border-amber-700',
        };
      case 'PENDING_SYNC':
        return {
          label: `${tf.statusPendingSyncLabel} (${pendingOfflineCount})`,
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          text: 'text-amber-800 dark:text-amber-200 font-semibold',
          border: 'border-amber-300 dark:border-amber-700',
        };
      case 'SYNCHRONIZED_DEMO':
        return {
          label: tf.statusSyncedDemoLabel,
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          text: 'text-emerald-800 dark:text-emerald-200 font-semibold',
          border: 'border-emerald-300 dark:border-emerald-700',
        };
      case 'CONFLICT_DETECTED':
        return {
          label: `${tf.statusConflictDetectedLabel} (${conflictCount})`,
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          text: 'text-rose-800 dark:text-rose-200 font-semibold',
          border: 'border-rose-300 dark:border-rose-700',
        };
      case 'SYNC_FAILED':
        return {
          label: `${tf.statusSyncFailedLabel} (${failedOfflineCount})`,
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          text: 'text-rose-800 dark:text-rose-200 font-semibold',
          border: 'border-rose-300 dark:border-rose-700',
        };
      case 'ONLINE':
      default:
        return {
          label: tf.statusOnlineLabel,
          icon: <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          text: 'text-emerald-800 dark:text-emerald-200 font-semibold',
          border: 'border-emerald-300 dark:border-emerald-700',
        };
    }
  };

  const statusBadge = getStatusBadgeConfig(connectivityStatus);

  return (
    <div className="space-y-5">
      {/* Field Engineer Top Status Bar */}
      <div className="bg-white dark:bg-[#111827] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t-4 border-t-emerald-600">
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

        {/* Connectivity Status & Actions Cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge */}
          <div
            data-testid="field-connectivity-indicator"
            role="status"
            aria-live="polite"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
          >
            {statusBadge.icon}
            <span>{statusBadge.label}</span>
            {statusBadge.demoBadge && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100">
                {statusBadge.demoBadge}
              </span>
            )}
          </div>

          {/* Quick Review Conflict Action near indicator */}
          {(conflictCount > 0 || failedOfflineCount > 0) && (
            <button
              type="button"
              data-testid="review-conflict-btn"
              onClick={() => setActiveTab('offline')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 shadow-2xs transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>{tf.btnReviewConflict} ({conflictCount || failedOfflineCount})</span>
            </button>
          )}

          {/* Emergency Hazard Button */}
          <button
            type="button"
            onClick={() => setShowHazardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {tf.btnReportHazard}
          </button>

          {/* Simulated Offline Toggle (DEMO Testing Tool) */}
          <button
            type="button"
            onClick={toggleOfflineMode}
            aria-label={isOfflineSimulated ? tf.ariaDisableOffline : tf.ariaEnableOffline}
            aria-pressed={isOfflineSimulated}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isOfflineSimulated
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isOfflineSimulated ? tf.btnToggleSimOfflineDisable : tf.btnToggleSimOfflineEnable}</span>
          </button>

          {/* Manual Sync Button (Accessible Fallback) */}
          <button
            type="button"
            disabled={isFieldSyncing || isBrowserOffline || isOfflineSimulated || (pendingOfflineCount === 0 && failedOfflineCount === 0)}
            onClick={() => handleSimulateSyncNow()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFieldSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{tf.btnManualSyncNow}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Connectivity & Queue Notification Strip (Refined & Compact) */}
      {connectivityStatus === 'OFFLINE' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="real-offline-banner"
          className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">{tf.bannerRealOfflineTitle}:</strong>{' '}
              <span className="text-amber-800 dark:text-amber-300">{tf.bannerRealOfflineDesc}</span>
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 shrink-0">
            {tf.badgeAutoSyncReady}
          </span>
        </div>
      )}

      {connectivityStatus === 'SYNCING' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="syncing-queue-banner"
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">{tf.bannerSyncingTitle}:</strong>{' '}
              <span className="text-blue-800 dark:text-blue-300">{tf.bannerSyncingDesc}</span>
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-700 text-[10px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 shrink-0">
            {tf.badgeAutoSyncActive}
          </span>
        </div>
      )}

      {connectivityStatus === 'SYNCHRONIZED_DEMO' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="synced-demo-banner"
          className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">{tf.bannerSyncSuccessTitle}:</strong>{' '}
              <span className="text-emerald-800 dark:text-emerald-300">{tf.bannerSyncSuccessDesc}</span>
            </p>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 shrink-0">
            {tf.statusSyncedDemoLabel}
          </span>
        </div>
      )}

      {connectivityStatus === 'PENDING_SYNC' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="pending-sync-banner"
          className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">{tf.bannerPendingSyncTitle} ({pendingOfflineCount}):</strong>{' '}
              <span className="text-amber-800 dark:text-amber-300">{tf.bannerPendingSyncDesc}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSimulateSyncNow()}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shrink-0 self-start sm:self-auto cursor-pointer"
          >
            {tf.btnManualSyncNow}
          </button>
        </div>
      )}

      {(connectivityStatus === 'SYNC_FAILED' || connectivityStatus === 'CONFLICT_DETECTED') && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="sync-conflict-banner"
          className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">
                {connectivityStatus === 'CONFLICT_DETECTED' ? tf.statusConflictDetectedLabel : tf.statusSyncFailedLabel} ({failedOfflineCount}):
              </strong>{' '}
              <span className="text-rose-800 dark:text-rose-300">
                {connectivityStatus === 'CONFLICT_DETECTED' ? tf.statusConflictDetectedDesc : tf.statusSyncFailedDesc}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shrink-0 self-start sm:self-auto cursor-pointer"
          >
            {tf.btnReviewConflict} →
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
              <p
                data-testid="field-kpi-emergency-callouts"
                className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums"
              >
                {fieldCanonicalMetrics.totalActiveEmergencyCallouts} {tf.kpiEmergencyActiveSuffix}
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
                      disabled={wo.status === 'Completed'}
                      onChange={(e) => {
                        const nextStatus = e.target.value as typeof wo.status;
                        if (nextStatus !== wo.status) {
                          updateWorkOrderStatus(wo.id, nextStatus);
                        }
                      }}
                      className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium disabled:opacity-60"
                    >
                      <option value={wo.status}>
                        {localizeWorkOrderStatus(wo.status, language)}
                      </option>
                      {(WORK_ORDER_TRANSITIONS[wo.status] || [])
                        .filter((trans) => trans !== wo.status)
                        .map((trans) => (
                          <option key={trans} value={trans}>
                            {localizeWorkOrderStatus(trans, language)}
                          </option>
                        ))}
                    </select>
                    {fieldOfflineQueue.some(
                      (q) => q.targetRecordId === wo.id && q.status === 'PENDING'
                    ) && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        {tf.badgeOfflineQueuedOnWo}
                      </span>
                    )}
                    {wo.status !== 'Completed' && (
                      <>
                      <button
                        type="button"
                        onClick={() => setMeterReadingWorkOrder(wo)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Capture OCR Meter Reading"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Meter Reading</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvidenceModalWO(wo)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Complete with Evidence"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Evidence</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWOId(wo.id);
                          setActiveTab('inspections');
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        {tf.btnPerformInspection}
                      </button>
                      </>
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
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                {tf.headingAssignedWorkOrders}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tf.subtitleAssignedWorkOrders}
              </p>
            </div>
            <ExportMenu
              datasetKey="assigned_work_orders"
              filteredRecords={workOrders}
              variant="compact"
            />
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
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> {tf.labelInspectionFindingsRecorded}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFieldOfficialDoc(
                            generateInspectionSummaryDocument({
                              role: 'field',
                              actor: fieldDocumentActor,
                              workOrder: wo,
                              language: currentLang,
                              dataSource: dataMode,
                            })
                          );
                        }}
                        className="px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>{docUi.viewInspectionSummary}</span>
                      </button>
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
                  {selectedWO
                    ? `${selectedWO.id} — ${localizeWorkOrderTitle(selectedWO.title, language)}`
                    : tf.defaultInspectionTaskFallback}
                </p>
              </div>
            </div>

            <form onSubmit={handleInspectionSubmit} className="space-y-4">
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

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
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
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                  {tf.badgeGeotagVerified}
                </span>
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
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {tf.headingOfflineQueue}
                </h2>
                <span
                  data-testid="offline-queue-pending-badge"
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    pendingOfflineCount > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                  }`}
                >
                  {pendingOfflineCount} {tf.offlineQueuePendingCountBadge}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {tf.offlineQueueTotalItemsLabel}{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {fieldOfflineQueue.length}
                  </strong>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tf.subtitleOfflineQueue}
              </p>
            </div>
            <button
              type="button"
              data-testid="offline-queue-manual-sync-btn"
              disabled={isFieldSyncing || isBrowserOffline || isOfflineSimulated || (pendingOfflineCount === 0 && failedOfflineCount === 0)}
              onClick={() => handleSimulateSyncNow()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFieldSyncing ? 'animate-spin' : ''}`} />{' '}
              {isFieldSyncing ? tf.statusSyncingLabel : tf.btnSimulateSyncNow}
            </button>
          </div>

          {/* Compact 4-Card Status Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {tf.offlineQueueTotalItemsLabel}
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {fieldOfflineQueue.length}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30">
              <div className="text-[11px] font-medium text-amber-800 dark:text-amber-400 flex items-center justify-between gap-1">
                <span>{tf.queueStatusPending}</span>
                {processingOfflineCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                    {processingOfflineCount} {caTranslations.processingQueueLabel}
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-amber-900 dark:text-amber-300 mt-0.5 tabular-nums">
                {pendingOfflineCount}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30">
              <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400">
                {tf.queueStatusCompleted}
              </div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
                {completedOfflineCount}
              </div>
            </div>
            <div
              className={`p-3 rounded-lg border ${
                conflictCount > 0 || failedOfflineCount > 0
                  ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/30'
                  : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40'
              }`}
            >
              <div
                className={`text-[11px] font-medium ${
                  conflictCount > 0 || failedOfflineCount > 0
                    ? 'text-rose-800 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tf.statusConflictDetectedLabel}
              </div>
              <div
                className={`text-xl font-bold mt-0.5 ${
                  conflictCount > 0 || failedOfflineCount > 0
                    ? 'text-rose-900 dark:text-rose-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {conflictCount || failedOfflineCount}
              </div>
            </div>
          </div>

          {/* Real-time Storage & Auto-Sync Engine Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                Network Physical
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isBrowserOffline ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                {isBrowserOffline ? tf.statusRealOfflineLabel : tf.statusOnlineLabel}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                Demo Simulation
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isOfflineSimulated ? 'bg-amber-500' : 'bg-slate-400'}`} />
                {isOfflineSimulated ? tf.statusSimOfflineLabel : 'Disabled'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                Sync Engine
              </div>
              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isFieldSyncing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`} />
                {isFieldSyncing ? tf.statusSyncingLabel : tf.badgeAutoSyncReady}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                Local Persistence
              </div>
              <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate mt-0.5" title="vidyutflow_field_offline_queue (localStorage)">
                localStorage
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 rounded-lg px-3.5 py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
            {tf.offlineDemoDisclaimer}
          </div>

          {fieldOfflineQueue.length === 0 ? (
            <div
              data-testid="offline-queue-empty-state"
              className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                <Wifi className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tf.emptyOfflineQueueTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {tf.emptyOfflineQueueDesc}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {fieldOfflineQueue.map((item) => {
                const statusBadgeConfig =
                  item.status === 'COMPLETED'
                    ? {
                        label: tf.queueStatusCompleted,
                        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
                      }
                    : item.status === 'PROCESSING'
                    ? {
                        label: tf.queueStatusProcessing,
                        cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
                      }
                    : item.status === 'FAILED'
                    ? {
                        label: tf.queueStatusFailed,
                        cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800',
                      }
                    : {
                        label: tf.queueStatusPending,
                        cls: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
                      };

                const actionLabel =
                  item.actionType === 'SITE_INSPECTION_SUBMIT'
                    ? tf.offlineQueueActionInspection
                    : tf.offlineQueueActionStatusUpdate;

                const report = item.payload.inspectionReport;

                return (
                  <div
                    key={item.client_uuid}
                    data-testid={`offline-queue-item-${item.targetRecordId}`}
                    className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {item.targetRecordId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                          {actionLabel}
                        </span>
                        {item.relatedRefId && (
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {tf.labelRefPrefix} {item.relatedRefId}
                          </span>
                        )}
                      </div>

                      {item.payload.workOrderTitle && (
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {localizeWorkOrderTitle(item.payload.workOrderTitle, language)}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {tf.labelTransitionPrefix}{' '}
                        <strong>
                          {item.payload.expectedPreviousStatus
                            ? localizeWorkOrderStatus(item.payload.expectedPreviousStatus, language)
                            : '—'}
                        </strong>{' '}
                        →{' '}
                        <strong>
                          {localizeWorkOrderStatus(item.payload.targetStatus, language)}
                        </strong>
                        {report ? (
                          <>
                            {' '}
                            · {tf.labelMeterSerialPrefix}{' '}
                            <span className="font-mono">{report.meterSerialScanned}</span> ·{' '}
                            {tf.labelReadingPrefix} {report.readingKwh} kWh ·{' '}
                            {tf.labelVoltagePrefix} {report.testedPhaseVoltage?.r ?? 234}V/
                            {report.testedPhaseVoltage?.y ?? 232}V/
                            {report.testedPhaseVoltage?.b ?? 235}V
                          </>
                        ) : null}
                      </p>

                      {report?.technicianRemarks && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {tf.labelRemarksPrefix}{' '}
                          {localizeFieldTechnicianRemarks(report.technicianRemarks, language)}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>
                          {tf.labelQueuedAtPrefix} {formatErpDateTime(item.timestamp)}
                        </span>
                        {item.syncedAt && (
                          <span>
                            {tf.labelReplayedAtPrefix} {formatErpDateTime(item.syncedAt)}
                          </span>
                        )}
                        <span className="font-mono">
                          {tf.labelClientUuidPrefix} {item.client_uuid}
                        </span>
                      </div>

                      {item.status === 'FAILED' && item.failureReason && (() => {
                        const canonicalWo = workOrders.find((w) => w.id === item.targetRecordId);
                        const isAlreadyApplied =
                          canonicalWo &&
                          (canonicalWo.status === item.payload.targetStatus ||
                            (item.payload.targetStatus === 'Completed' && canonicalWo.status === 'Completed'));

                        return (
                          <div className="mt-2.5 p-3.5 rounded-lg bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-900 dark:text-rose-200 space-y-2.5">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-semibold block text-rose-950 dark:text-rose-100">
                                    {item.conflictDetected ? tf.statusConflictDetectedLabel : tf.statusSyncFailedLabel} — {item.targetRecordId}
                                  </strong>
                                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                                    {localizeOfflineQueueFailureReason(item.failureReason, language)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded border border-rose-200/80 dark:border-rose-800/60">
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  {tf.labelCanonicalStatePrefix}
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {canonicalWo ? localizeWorkOrderStatus(canonicalWo.status, language) : '—'}
                                </span>
                              </div>
                            </div>

                            {isAlreadyApplied && (
                              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[11px] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{tf.noticeActionAlreadyApplied}</span>
                              </div>
                            )}

                            <div className="text-[11px] pt-1.5 border-t border-rose-200/70 dark:border-rose-800/50 text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{tf.labelSafeActionPrefix}</span>{' '}
                                {resolveOfflineQueueSafeAction(item, language)}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openDetailDrawer({ type: 'workorder', id: item.targetRecordId })}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                                >
                                  <FileCheck className="w-3 h-3 text-slate-500" />
                                  <span>{tf.btnViewRecordInDrawer}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isFieldSyncing}
                                  onClick={() => handleSimulateSyncNow(item.client_uuid)}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white cursor-pointer shadow-2xs transition-colors"
                                >
                                  {tf.btnRetryQueueItem}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeConfig.cls}`}
                      >
                        {statusBadgeConfig.label}
                      </span>
                      {item.status === 'FAILED' && (
                        <button
                          type="button"
                          disabled={isFieldSyncing}
                          onClick={() => handleSimulateSyncNow(item.client_uuid)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white cursor-pointer"
                        >
                          {tf.btnRetryQueueItem}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {tf.headingFeederPatrol}
                    </h2>
                    <span
                      data-testid="field-feeder-source-badge"
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {fieldFeederSource.badgeLabel}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                      {at.simulatedVsRatedLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tf.subtitleFeederPatrol} · {at.fieldFeederPatrolDisclosure}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <ExportMenu
                  datasetKey="feeder_patrol"
                  filteredRecords={feeders}
                  dataSource={fieldFeederSource.code}
                  variant="compact"
                />
                <button
                  onClick={() => setActiveTab('workorders')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {tf.btnViewAssignedWorkOrdersArrow}
                </button>
              </div>
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {completedWorkOrders.length} {tf.badgeCompletedJobsCountSuffix}
              </span>
              <ExportMenu
                datasetKey="completed_jobs"
                filteredRecords={completedWorkOrders}
                variant="compact"
              />
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
                      className="flex items-center gap-2 self-start sm:self-center flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {wo.inspectionReport && (
                        <button
                          type="button"
                          onClick={() =>
                            setFieldOfficialDoc(
                              generateInspectionSummaryDocument({
                                role: 'field',
                                actor: fieldDocumentActor,
                                workOrder: wo,
                                language: currentLang,
                                dataSource: dataMode,
                              })
                            )
                          }
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{docUi.viewInspectionSummary}</span>
                        </button>
                      )}
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
      <OfficialDocumentModal
        document={fieldOfficialDoc}
        isOpen={Boolean(fieldOfficialDoc)}
        onClose={() => setFieldOfficialDoc(null)}
      />
      {activeTab === 'outage-map' && <LazyOutageMapSection />}
    
      {evidenceModalWO && (
        <WorkOrderEvidenceModal
          workOrder={evidenceModalWO}
          isOpen={Boolean(evidenceModalWO)}
          onClose={() => setEvidenceModalWO(null)}
        />
      )}

      {meterReadingWorkOrder && (
        <FieldMeterReadingModal
          workOrder={meterReadingWorkOrder}
          isOpen={Boolean(meterReadingWorkOrder)}
          onClose={() => setMeterReadingWorkOrder(null)}
        />
      )}
    </div>
  );
};