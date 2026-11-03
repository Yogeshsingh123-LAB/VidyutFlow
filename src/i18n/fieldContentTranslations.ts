import { Language } from './types';
import type { FieldOfflineQueueItem } from '../utils/fieldOfflineQueue';

export interface FieldUiDictionary {
  // Top Status Bar & Controls
  consoleTitle: string;
  roleBadgeField: string;
  ugvclLogoAlt: string;
  subtitleOpsPrefix: string;
  btnReportHazard: string;
  ariaDisableOffline: string;
  ariaEnableOffline: string;
  btnSimulatedOffline: string;
  btnOnlineAmr: string;
  offlineBufferActivePrefix: string;
  offlineBufferActiveDesc: string;
  badgeLocalQueueReady: string;
  offlineSimNoticePrefix: string;
  offlineSimNoticeDesc: string;

  // Real-time Field Connectivity & Auto-Sync
  statusOnlineLabel: string;
  statusOnlineDesc: string;
  statusRealOfflineLabel: string;
  statusRealOfflineDesc: string;
  statusSimOfflineLabel: string;
  statusSimOfflineDesc: string;
  statusPendingSyncLabel: string;
  statusPendingSyncDesc: string;
  statusSyncingLabel: string;
  statusSyncingDesc: string;
  statusSyncedDemoLabel: string;
  statusSyncedDemoDesc: string;
  statusSyncFailedLabel: string;
  statusSyncFailedDesc: string;
  statusConflictDetectedLabel: string;
  statusConflictDetectedDesc: string;
  btnToggleSimOfflineEnable: string;
  btnToggleSimOfflineDisable: string;
  btnManualSyncNow: string;
  badgeAutoSyncActive: string;
  badgeAutoSyncReady: string;
  ariaConnectivityStatusPrefix: string;
  bannerRealOfflineTitle: string;
  bannerRealOfflineDesc: string;
  bannerSimOfflineTitle: string;
  bannerSimOfflineDesc: string;
  bannerPendingSyncTitle: string;
  bannerPendingSyncDesc: string;
  bannerSyncingTitle: string;
  bannerSyncingDesc: string;
  bannerSyncSuccessTitle: string;
  bannerSyncSuccessDesc: string;
  btnReviewConflict: string;
  labelSafeActionPrefix: string;
  badgeDemoIndicator: string;
  labelCanonicalStatePrefix: string;
  noticeActionAlreadyApplied: string;
  btnViewRecordInDrawer: string;

  // Emergency Hazard Reporting Modal
  hazardModalTitle: string;
  hazardModalSubtitle: string;
  labelTargetFeederCorridor: string;
  labelDetectedHazardType: string;
  optionHazardTransformerOverheating: string;
  optionHazardFeederOverload: string;
  optionHazardCriticalOutage: string;
  labelHazardObservations: string;
  defaultHazardRemarks: string;
  btnCancel: string;
  btnTransmitCriticalAlert: string;

  // Tab 1: Field Dashboard
  kpiAssignedWorkOrders: string;
  kpiAssignedWorkOrdersSub: string;
  kpiEmergencyCallouts: string;
  kpiEmergencyActiveSuffix: string;
  kpiEmergencySub: string;
  kpiCompletedInspections: string;
  kpiCompletedInspectionsSub: string;
  sectionAssignedIncidents: string;
  badgeTargetedDispatch: string;
  btnReviewAssignment: string;
  btnAcknowledge: string;
  btnInspectFeederTelemetry: string;
  labelFeederAsset: string;
  labelSubdivision: string;
  labelAssignedTime: string;
  labelNotes: string;
  sectionTodaysItinerary: string;
  btnViewAllWorkOrders: string;
  tooltipViewSourceComplaint: string;
  tooltipViewSourceApplication: string;
  labelRefPrefix: string;
  labelFeederPrefix: string;
  labelScheduledPrefix: string;
  labelStatusPrefix: string;
  btnDetails: string;
  btnPerformInspection: string;

  // Tab 2: Assigned Work Orders
  headingAssignedWorkOrders: string;
  subtitleAssignedWorkOrders: string;
  labelTypePrefix: string;
  labelLocationPrefix: string;
  btnEnterInspectionFindings: string;
  badgeCompleted: string;
  labelInspectionFindingsRecorded: string;
  labelMeterSerialPrefix: string;
  labelReadingPrefix: string;
  labelVoltagePrefix: string;
  labelRemarksPrefix: string;

  // Tab 3: Site Inspection Form
  headingSiteInspectionReport: string;
  labelTaskPrefix: string;
  defaultInspectionTaskFallback: string;
  labelScannedMeterSerial: string;
  labelVerifiedMeterReading: string;
  labelOpticalSealStatus: string;
  optionSealIntactVerified: string;
  optionSealBrokenSuspicious: string;
  labelTerminalBlockCondition: string;
  optionTerminalNormal: string;
  optionTerminalBurnt: string;
  optionTerminalLooseNeutral: string;
  labelTestedPhaseVoltages: string;
  labelRPhase: string;
  labelYPhase: string;
  labelBPhase: string;
  labelSitePhotoEvidence: string;
  labelGpsGeotag: string;
  badgeGeotagVerified: string;
  labelTechnicianObservations: string;
  defaultTechnicianRemarks: string;
  btnSignTransmitReport: string;

  // Tab 4: Offline Queue
  headingOfflineQueue: string;
  subtitleOfflineQueue: string;
  btnSimulateSyncNow: string;
  offlineItem1Title: string;
  offlineItem1Desc: string;
  badgeSyncedToServer: string;
  offlineItem2Title: string;
  offlineItem2Desc: string;
  badgePendingBackgroundPush: string;
  offlineQueuePendingCountBadge: string;
  offlineQueueTotalItemsLabel: string;
  offlineQueueActionInspection: string;
  offlineQueueActionStatusUpdate: string;
  queueStatusPending: string;
  queueStatusProcessing: string;
  queueStatusCompleted: string;
  queueStatusFailed: string;
  emptyOfflineQueueTitle: string;
  emptyOfflineQueueDesc: string;
  labelClientUuidPrefix: string;
  labelQueuedAtPrefix: string;
  labelReplayedAtPrefix: string;
  labelTransitionPrefix: string;
  btnRetryQueueItem: string;
  offlineDemoDisclaimer: string;
  badgeOfflineQueuedOnWo: string;

  // Tab 5: Feeder Patrol & Line Surveillance
  headingFeederPatrol: string;
  subtitleFeederPatrol: string;
  btnViewAssignedWorkOrdersArrow: string;
  summaryMonitoredFeeders: string;
  summaryMonitoredFeedersSub: string;
  summaryFeedersAttention: string;
  summaryFeedersAttentionSub: string;
  summaryOpenFieldWorkOrders: string;
  summaryOpenFieldWorkOrdersSub: string;
  labelConductorLoadUtilization: string;
  labelPeakLoad: string;
  labelTransformers: string;
  unitDts: string;
  labelConsumers: string;
  labelLinkedWorkOrder: string;
  noOpenFaultCalloutsOnFeeder: string;
  btnInspectFeederPrefix: string;
  btnLogPatrolCheck: string;
  emptyFeederRecordsTitle: string;
  emptyFeederRecordsDesc: string;

  // Tab 6: Completed Jobs & Inspection History
  headingCompletedJobs: string;
  subtitleCompletedJobs: string;
  badgeCompletedJobsCountSuffix: string;
  btnAllWorkOrders: string;
  btnViewCaseFile: string;
  labelRecordedInspectionReport: string;
  labelEngineerPrefix: string;
  labelScannedMeterSerialShort: string;
  labelVerifiedReadingShort: string;
  labelSealAndTerminal: string;
  labelPhaseVoltagesShort: string;
  fallbackWorkOrderCompletedPrefix: string;
  fallbackWorkOrderCompletedSuffix: string;
  emptyCompletedJobsTitle: string;
  emptyCompletedJobsDesc: string;
  btnViewAssignedWorkOrdersPlain: string;

  // IncidentActionModal: Field Engineer & Management Action Desk
  modalFieldDispatchControlsPrefix: string;
  modalFieldDispatchControlsDesc: string;
  modalStep1Acceptance: string;
  modalBtnAcceptMobilize: string;
  modalBtnDeclineAssignment: string;
  modalLabelDeclineReason: string;
  modalPlaceholderDeclineReason: string;
  modalBtnConfirmDecline: string;
  modalStep2InspectionFindings: string;
  modalBtnStartOnSiteInspection: string;
  modalInspectionCommencedPrefix: string;
  modalLabelRecordTechnicalFindings: string;
  modalPlaceholderTechnicalFindings: string;
  modalBtnTransmitFindings: string;
  modalLabelRequestAdditionalCrew: string;
  modalPlaceholderAssistanceNote: string;
  modalBtnRequestSpecializedAssistance: string;
  modalHeadingSubmitFinalResolution: string;
  modalDescSubmitFinalResolution: string;
  modalPlaceholderResolutionSummary: string;
  modalBtnSubmitResolutionClearFault: string;
  modalIncidentAlreadyResolvedTitle: string;
  modalIncidentAlreadyResolvedDesc: string;

  // IncidentActionModal: Management Action Desk
  modalMgmtConcurrenceTitle: string;
  modalMgmtConcurrenceDesc: string;
  modalMgmtDecisionHeading: string;
  modalMgmtRemarksLabel: string;
  modalMgmtRemarksPlaceholder: string;
  modalMgmtApproveBtn: string;
  modalMgmtRejectBtn: string;
  modalMgmtMoreInfoBtn: string;
  modalMgmtMandatoryRejectLabel: string;
  modalMgmtMandatoryRejectPlaceholder: string;
  modalMgmtConfirmRejectBtn: string;
  modalMgmtClarificationLabel: string;
  modalMgmtClarificationPlaceholder: string;
  modalMgmtSendInfoRequestBtn: string;
  modalMgmtDecisionRecordedPrefix: string;
  modalMgmtByPrefix: string;
  modalMgmtOnPrefix: string;
}

export const FIELD_UI_TRANSLATIONS: Record<Language, FieldUiDictionary> = {
  en: {
    consoleTitle: 'Field Operations Console & Inspection App',
    roleBadgeField: 'Field Lineman / JE',
    ugvclLogoAlt: 'UGVCL Official Logo',
    subtitleOpsPrefix: 'UGVCL Operations · Engineer:',
    btnReportHazard: 'Report Feeder / DTR Hazard',
    ariaDisableOffline: 'Disable simulated offline mode',
    ariaEnableOffline: 'Enable simulated offline mode',
    btnSimulatedOffline: 'Simulated Offline (Demo)',
    btnOnlineAmr: 'Online (Connected)',
    offlineBufferActivePrefix: '◆ OFFLINE FIELD BUFFER ACTIVE:',
    offlineBufferActiveDesc:
      'Site inspections, work order progress, and meter commissioning updates are saved to persistent local storage (localStorage) and will automatically synchronize when network connectivity resumes.',
    badgeLocalQueueReady: 'Local Queue Ready',
    offlineSimNoticePrefix: 'UI Simulation Only:',
    offlineSimNoticeDesc:
      'You are testing the field offline simulation tool. Completed inspections and status updates are saved to persistent browser storage (localStorage) and will automatically synchronize with local DEMO ERP records when reconnected or toggled off.',

    // Real-time Field Connectivity & Auto-Sync
    statusOnlineLabel: 'Online (Connected)',
    statusOnlineDesc: 'Network connectivity active · Telemetry online',
    statusRealOfflineLabel: 'Network Offline',
    statusRealOfflineDesc: 'Real network unavailable · Actions saved in local persistent queue',
    statusSimOfflineLabel: 'Simulated Offline (Demo)',
    statusSimOfflineDesc: 'Demo simulation active · Actions queued in persistent storage',
    statusPendingSyncLabel: 'Pending Auto-Sync',
    statusPendingSyncDesc: 'Connectivity available · Queued actions awaiting replay',
    statusSyncingLabel: 'Auto-Syncing...',
    statusSyncingDesc: 'Single-flight replay in progress · Applying queued actions',
    statusSyncedDemoLabel: 'Synchronized (DEMO)',
    statusSyncedDemoDesc: 'All queued actions replayed into local ERP state',
    statusSyncFailedLabel: 'Sync Failed',
    statusSyncFailedDesc: '1 or more queued actions failed · Review in Offline Queue',
    statusConflictDetectedLabel: 'Conflict Detected',
    statusConflictDetectedDesc: 'Work order changed before replay · Manual review required',
    btnToggleSimOfflineEnable: 'Simulate Offline',
    btnToggleSimOfflineDisable: 'End Simulation',
    btnManualSyncNow: 'Sync Now',
    badgeAutoSyncActive: 'Auto-Sync Active',
    badgeAutoSyncReady: 'Auto-Sync Ready',
    ariaConnectivityStatusPrefix: 'Connectivity Status:',
    bannerRealOfflineTitle: 'Network Disconnected (Real Offline)',
    bannerRealOfflineDesc: 'Field inspections and work order updates will automatically be saved to persistent local storage and will auto-sync once connectivity is restored.',
    bannerSimOfflineTitle: 'Demo Mode: Simulated Offline',
    bannerSimOfflineDesc: 'Simulating field connectivity drop. Actions are saved in persistent storage (localStorage) and will auto-sync when simulation is ended.',
    bannerPendingSyncTitle: 'Pending Auto-Replay',
    bannerPendingSyncDesc: 'Connectivity is available. Queued actions are preparing for automatic local replay.',
    bannerSyncingTitle: 'Auto-Sync in Progress',
    bannerSyncingDesc: 'Applying queued inspection and status actions into local shared ERP state with single-flight protection...',
    bannerSyncSuccessTitle: 'DEMO Synchronization Complete',
    bannerSyncSuccessDesc: 'All queued actions were successfully replayed into local ERP records.',
    btnReviewConflict: 'Review Conflict',
    labelSafeActionPrefix: 'Recommended Safe Action:',
    badgeDemoIndicator: 'DEMO',
    labelCanonicalStatePrefix: 'Canonical State in ERP:',
    noticeActionAlreadyApplied: 'Notice: Target work order has already reached completed state in the canonical ERP system.',
    btnViewRecordInDrawer: 'View Work Order',

    hazardModalTitle: 'Report Field Feeder / DTR Hazard',
    hazardModalSubtitle: 'Broadcasts critical operational incident to Sub-division & Management Cockpit',
    labelTargetFeederCorridor: 'Target Feeder Corridor *',
    labelDetectedHazardType: 'Detected Hazard Type *',
    optionHazardTransformerOverheating: 'Transformer Overheating / Thermal Runaway',
    optionHazardFeederOverload: '11kV Feeder Overload / Conductor Sagging',
    optionHazardCriticalOutage: 'Feeder Tripping / Conductor Break Outage',
    labelHazardObservations: 'Field Observations & Safety Hazard Remarks *',
    defaultHazardRemarks: 'Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.',
    btnCancel: 'Cancel',
    btnTransmitCriticalAlert: 'Transmit Critical Alert',

    kpiAssignedWorkOrders: 'Assigned Work Orders Today',
    kpiAssignedWorkOrdersSub: '1 In Progress · 2 Pending Sites',
    kpiEmergencyCallouts: 'Emergency Fault Callouts',
    kpiEmergencyActiveSuffix: 'Active',
    kpiEmergencySub: 'DT Overload Inspection (WO-4403)',
    kpiCompletedInspections: 'Completed Inspections',
    kpiCompletedInspectionsSub: 'Synchronized with Sub-division',
    sectionAssignedIncidents: 'Assigned Field Incidents & Priority Callouts',
    badgeTargetedDispatch: 'Targeted Dispatch',
    btnReviewAssignment: 'Review Assignment',
    btnAcknowledge: 'Acknowledge',
    btnInspectFeederTelemetry: 'Inspect Feeder Telemetry →',
    labelFeederAsset: 'Feeder/Asset:',
    labelSubdivision: 'Subdivision:',
    labelAssignedTime: 'Assigned:',
    labelNotes: 'Notes:',
    sectionTodaysItinerary: "Today's Field Itinerary & Tasks",
    btnViewAllWorkOrders: 'View All Work Orders →',
    tooltipViewSourceComplaint: 'View source complaint in drawer',
    tooltipViewSourceApplication: 'View source connection application in drawer',
    labelRefPrefix: 'Ref:',
    labelFeederPrefix: 'Feeder:',
    labelScheduledPrefix: 'Scheduled:',
    labelStatusPrefix: 'Status:',
    btnDetails: 'Details',
    btnPerformInspection: 'Perform Inspection',

    headingAssignedWorkOrders: 'Assigned Work Orders',
    subtitleAssignedWorkOrders: 'Inspection tasks, fault callouts, and meter replacements',
    labelTypePrefix: 'Type:',
    labelLocationPrefix: 'Location:',
    btnEnterInspectionFindings: 'Enter Inspection Findings',
    badgeCompleted: 'Completed',
    labelInspectionFindingsRecorded: 'Inspection Findings Recorded:',
    labelMeterSerialPrefix: 'Meter Serial:',
    labelReadingPrefix: 'Reading:',
    labelVoltagePrefix: 'Voltage:',
    labelRemarksPrefix: 'Remarks:',

    headingSiteInspectionReport: 'Field Site Inspection & Feasibility Report',
    labelTaskPrefix: 'Task:',
    defaultInspectionTaskFallback: 'WO-4401 (CMP-8821 Rectification)',
    labelScannedMeterSerial: 'Scanned Meter Serial / Barcode *',
    labelVerifiedMeterReading: 'Verified Meter Reading (kWh) *',
    labelOpticalSealStatus: 'Holographic Optical Seal Status',
    optionSealIntactVerified: 'Seal Intact & Verified',
    optionSealBrokenSuspicious: 'Seal Broken / Suspicious',
    labelTerminalBlockCondition: 'Terminal Block Condition',
    optionTerminalNormal: 'Normal Condition',
    optionTerminalBurnt: 'Burnt / Flashover Marks',
    optionTerminalLooseNeutral: 'Loose Neutral Connection',
    labelTestedPhaseVoltages: 'Tested Phase Voltages (Volts AC)',
    labelRPhase: 'R-Phase',
    labelYPhase: 'Y-Phase',
    labelBPhase: 'B-Phase',
    labelSitePhotoEvidence: 'Site Photo Evidence (Mobile Camera Preview)',
    labelGpsGeotag: 'GPS Geotag:',
    badgeGeotagVerified: 'Geotag Timestamp Verified',
    labelTechnicianObservations: 'Technician Observations & Rectification Remarks *',
    defaultTechnicianRemarks: 'Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.',
    btnSignTransmitReport: 'Sign & Transmit Inspection Report',

    headingOfflineQueue: 'Simulated Offline Queue Status',
    subtitleOfflineQueue: 'Local field buffer for areas with intermittent mobile network coverage',
    btnSimulateSyncNow: 'Simulate Sync Now',
    offlineItem1Title: 'WO-4398 Smart Meter Seal',
    offlineItem1Desc: 'Sector 4/B · Polycarbonate seal #UGVCL-882191 affixed',
    badgeSyncedToServer: 'Synced to Server',
    offlineItem2Title: 'WO-4401 Voltage Rectification',
    offlineItem2Desc: '14 Anand Nagar · Neutral crimped, 232V tested',
    badgePendingBackgroundPush: 'Pending Background Push',
    offlineQueuePendingCountBadge: 'Pending Replay',
    offlineQueueTotalItemsLabel: 'Total Queued Actions:',
    offlineQueueActionInspection: 'Site Inspection Submission',
    offlineQueueActionStatusUpdate: 'Work Order Status Change',
    queueStatusPending: 'Pending Replay',
    queueStatusProcessing: 'Processing Replay',
    queueStatusCompleted: 'Replayed (DEMO State)',
    queueStatusFailed: 'Replay Failed / Conflict',
    emptyOfflineQueueTitle: 'No Queued Offline Actions',
    emptyOfflineQueueDesc:
      'Enable Simulated Offline mode and submit a site inspection or update a work order status to capture actions in the persistent local queue.',
    labelClientUuidPrefix: 'Client UUID:',
    labelQueuedAtPrefix: 'Queued At:',
    labelReplayedAtPrefix: 'Replayed At:',
    labelTransitionPrefix: 'Transition:',
    btnRetryQueueItem: 'Retry Replay',
    offlineDemoDisclaimer:
      'DEMO Mode Persistence: Queued actions are stored in localStorage (vidyutflow_field_offline_queue) and replayed into local shared ERP state when online mode is restored. Live server synchronization requires backend integration.',
    badgeOfflineQueuedOnWo: 'Offline Action Queued',

    headingFeederPatrol: '11kV Feeder Patrol & Line Corridor Surveillance',
    subtitleFeederPatrol: 'Distribution feeder loading, transformer clusters, and active field tasks across North Gujarat subdivisions',
    btnViewAssignedWorkOrdersArrow: 'View Assigned Work Orders →',
    summaryMonitoredFeeders: 'Monitored 11kV Feeders',
    summaryMonitoredFeedersSub: 'Mehsana & Gandhinagar Circles',
    summaryFeedersAttention: 'Feeders Requiring Attention',
    summaryFeedersAttentionSub: '1 Critical Overload · 1 High Load Warning',
    summaryOpenFieldWorkOrders: 'Open Field Work Orders',
    summaryOpenFieldWorkOrdersSub: 'Scheduled along 11kV corridors',
    labelConductorLoadUtilization: 'Conductor Load Utilization',
    labelPeakLoad: 'Peak Load',
    labelTransformers: 'Transformers',
    unitDts: 'DTs',
    labelConsumers: 'Consumers',
    labelLinkedWorkOrder: 'Linked Work Order:',
    noOpenFaultCalloutsOnFeeder: 'No open fault callouts on this feeder',
    btnInspectFeederPrefix: 'Inspect',
    btnLogPatrolCheck: 'Log Patrol Check',
    emptyFeederRecordsTitle: 'No Feeder Patrol Records Available',
    emptyFeederRecordsDesc: 'No 11kV feeder telemetry records are currently loaded in the field console.',

    headingCompletedJobs: 'Completed Jobs & Inspection History',
    subtitleCompletedJobs: 'Closed field work orders and submitted technical inspection reports',
    badgeCompletedJobsCountSuffix: 'Completed Job(s)',
    btnAllWorkOrders: 'All Work Orders',
    btnViewCaseFile: 'View Case File',
    labelRecordedInspectionReport: 'Recorded Site Inspection Report',
    labelEngineerPrefix: 'Engineer:',
    labelScannedMeterSerialShort: 'Scanned Meter Serial',
    labelVerifiedReadingShort: 'Verified Reading',
    labelSealAndTerminal: 'Seal & Terminal',
    labelPhaseVoltagesShort: 'Phase Voltages (R/Y/B)',
    fallbackWorkOrderCompletedPrefix: 'Work order marked completed (',
    fallbackWorkOrderCompletedSuffix: ').',
    emptyCompletedJobsTitle: 'No Completed Work Orders Yet',
    emptyCompletedJobsDesc: 'Completed field inspections and fault rectifications will appear here once submitted.',
    btnViewAssignedWorkOrdersPlain: 'View Assigned Work Orders',

    modalFieldDispatchControlsPrefix: 'Field Dispatch Controls for',
    modalFieldDispatchControlsDesc:
      'Executing decisions here directly notifies the originating operations employee and synchronizes the canonical incident state.',
    modalStep1Acceptance: 'Step 1: Assignment Acceptance',
    modalBtnAcceptMobilize: 'Accept Assignment & Mobilize',
    modalBtnDeclineAssignment: 'Decline Assignment',
    modalLabelDeclineReason: 'Mandatory Reason for Declining *',
    modalPlaceholderDeclineReason:
      'State technical reason (e.g., currently isolated on 33kV substation feeder fault; please redirect to on-call engineer FLD-UG-204)...',
    modalBtnConfirmDecline: 'Confirm Decline (Alert Employee)',
    modalStep2InspectionFindings: 'Step 2: On-Site Inspection & Findings',
    modalBtnStartOnSiteInspection: 'Start On-Site Physical Inspection',
    modalInspectionCommencedPrefix: 'Inspection commenced at',
    modalLabelRecordTechnicalFindings: 'Record Technical Findings & Measured Readings *',
    modalPlaceholderTechnicalFindings:
      'e.g. Measured 88C at transformer top oil. Neutral bushing crimp oxidized. Replaced aluminium lug with bi-metallic crimp sleeve.',
    modalBtnTransmitFindings: 'Transmit Findings to Operations Desk',
    modalLabelRequestAdditionalCrew: 'Request Additional Crew or Heavy Equipment',
    modalPlaceholderAssistanceNote:
      'e.g. Need bucket truck / crane squad for high-tension tree trimming along corridor.',
    modalBtnRequestSpecializedAssistance: 'Request Specialized Assistance',
    modalHeadingSubmitFinalResolution: 'Submit Final Resolution Report & Clear Fault',
    modalDescSubmitFinalResolution:
      'Filing this report resolves the electrical fault on site and notifies the employee operations desk. (Separate from management capital approval per Fix 6).',
    modalPlaceholderResolutionSummary:
      'Detailed resolution summary: Tested insulation resistance (IR > 50 Mega-ohms). Line energised under normal load. Feeder operating within rated parameters.',
    modalBtnSubmitResolutionClearFault: 'Submit Resolution Report & Clear Fault',
    modalIncidentAlreadyResolvedTitle: 'This incident is already marked RESOLVED.',
    modalIncidentAlreadyResolvedDesc: 'Resolution details are preserved in the canonical audit trail.',

    modalMgmtConcurrenceTitle: 'Executive Concurrence & Escalation Authority',
    modalMgmtConcurrenceDesc:
      'Review operations escalation justification. Approving grants executive concurrence without prematurely marking unverified electrical faults as resolved.',
    modalMgmtDecisionHeading: 'Executive Concurrence Decision',
    modalMgmtRemarksLabel: 'Executive Concurrence Remarks (Optional)',
    modalMgmtRemarksPlaceholder:
      'e.g. Concurrence granted for auxiliary feeder bus swap. Capital transformer augmentation sanction approved.',
    modalMgmtApproveBtn: 'Approve Escalation (Green Notice)',
    modalMgmtRejectBtn: 'Reject Escalation',
    modalMgmtMoreInfoBtn: 'Request More Info',
    modalMgmtMandatoryRejectLabel: 'Mandatory Rejection Justification *',
    modalMgmtMandatoryRejectPlaceholder:
      'State executive reason (e.g., feeder load data shows peak occurs for <15 min; initiate sub-division capacitor bank switching before requesting capital transformer augmentation)...',
    modalMgmtConfirmRejectBtn: 'Confirm Rejection (Red Notice to Employee)',
    modalMgmtClarificationLabel: 'Specific Clarification / Question Required *',
    modalMgmtClarificationPlaceholder:
      'e.g. Please furnish 24-hour SCADA thermal log and confirmed DGA oil test results before executive concurrence.',
    modalMgmtSendInfoRequestBtn: 'Send Information Request (Amber Notice)',
    modalMgmtDecisionRecordedPrefix: 'Executive Decision already recorded:',
    modalMgmtByPrefix: 'By',
    modalMgmtOnPrefix: 'on',
  },

  gu: {
    consoleTitle: 'ફિલ્ડ ઓપરેશન્સ કોન્સોલ અને નિરીક્ષણ એપ',
    roleBadgeField: 'ફિલ્ડ લાઇનમેન / જુનિયર ઇજનેર',
    ugvclLogoAlt: 'UGVCL સત્તાવાર લોગો',
    subtitleOpsPrefix: 'UGVCL ઓપરેશન્સ · ઇજનેર:',
    btnReportHazard: 'ફીડર / DTR જોખમની જાણ કરો',
    ariaDisableOffline: 'સિમ્યુલેટેડ ઓફલાઇન મોડ બંધ કરો',
    ariaEnableOffline: 'સિમ્યુલેટેડ ઓફલાઇન મોડ ચાલુ કરો',
    btnSimulatedOffline: 'સિમ્યુલેટેડ ઓફલાઇન (ડેમો)',
    btnOnlineAmr: 'ઓનલાઇન (જોડાયેલ)',
    offlineBufferActivePrefix: '◆ ઓફલાઇન ફિલ્ડ બફર સક્રિય:',
    offlineBufferActiveDesc:
      'સાઇટ નિરીક્ષણો, વર્ક ઓર્ડર પ્રગતિ અને મીટર કમિશનિંગ અપડેટ્સ કાયમી સ્થાનિક સ્ટોરેજ (localStorage) માં સાચવવામાં આવે છે અને નેટવર્ક કનેક્ટિવિટી ફરી શરૂ થતાં આપમેળે સિંક્રનાઇઝ થશે.',
    badgeLocalQueueReady: 'સ્થાનિક કતાર તૈયાર',
    offlineSimNoticePrefix: 'માત્ર UI સિમ્યુલેશન:',
    offlineSimNoticeDesc:
      'તમે ફિલ્ડ ઓફલાઇન સિમ્યુલેશન ટૂલ ચલાવી રહ્યા છો. પૂર્ણ થયેલ નિરીક્ષણો અને સ્થિતિ અપડેટ્સ કાયમી બ્રાઉઝર સ્ટોરેજ (localStorage) માં સાચવવામાં આવે છે અને ફરી જોડાતાં સ્થાનિક DEMO ERP રેકોર્ડ્સ સાથે આપમેળે સિંક્રનાઇઝ થશે.',

    // Real-time Field Connectivity & Auto-Sync
    statusOnlineLabel: 'ઓનલાઇન (જોડાયેલ)',
    statusOnlineDesc: 'નેટવર્ક કનેક્ટિવિટી સક્રિય · ટેલિમેટ્રી ઓનલાઇન',
    statusRealOfflineLabel: 'નેટવર્ક ઓફલાઇન',
    statusRealOfflineDesc: 'વાસ્તવિક નેટવર્ક અનુપલબ્ધ · ક્રિયાઓ સ્થાનિક કતારમાં સચવાય છે',
    statusSimOfflineLabel: 'સિમ્યુલેટેડ ઓફલાઇન (ડેમો)',
    statusSimOfflineDesc: 'ડેમો સિમ્યુલેશન સક્રિય · ક્રિયાઓ સ્થાનિક સ્ટોરેજમાં કતારબદ્ધ',
    statusPendingSyncLabel: 'ઓટો-સિંક બાકી',
    statusPendingSyncDesc: 'કનેક્ટિવિટી ઉપલબ્ધ · કતારબદ્ધ ક્રિયાઓ રિપ્લેની રાહમાં',
    statusSyncingLabel: 'ઓટો-સિંકિંગ...',
    statusSyncingDesc: 'સિંગલ-ફ્લાઇટ રિપ્લે પ્રગતિમાં · કતારબદ્ધ ક્રિયાઓ લાગુ થઈ રહી છે',
    statusSyncedDemoLabel: 'સિંક્રનાઇઝ થયેલ (ડેમો)',
    statusSyncedDemoDesc: 'બધી કતારબદ્ધ ક્રિયાઓ સ્થાનિક ERP સ્ટેટમાં સફળતાપૂર્વક લાગુ થઈ',
    statusSyncFailedLabel: 'સિંક નિષ્ફળ',
    statusSyncFailedDesc: '૧ અથવા વધુ ક્રિયાઓ નિષ્ફળ · ઓફલાઇન કતારમાં સમીક્ષા કરો',
    statusConflictDetectedLabel: 'વિસંગતતા જણાઈ',
    statusConflictDetectedDesc: 'રિપ્લે પહેલાં વર્ક ઓર્ડર બદલાઈ ગયો · મેન્યુઅલ સમીક્ષા જરૂરી',
    btnToggleSimOfflineEnable: 'ઓફલાઇન સિમ્યુલેટ કરો',
    btnToggleSimOfflineDisable: 'સિમ્યુલેશન સમાપ્ત કરો',
    btnManualSyncNow: 'હમણાં સિંક કરો',
    badgeAutoSyncActive: 'ઓટો-સિંક સક્રિય',
    badgeAutoSyncReady: 'ઓટો-સિંક તૈયાર',
    ariaConnectivityStatusPrefix: 'કનેક્ટિવિટી સ્થિતિ:',
    bannerRealOfflineTitle: 'નેટવર્ક ડિસ્કનેક્ટ થયેલ (વાસ્તવિક ઓફલાઇન)',
    bannerRealOfflineDesc: 'ફિલ્ડ નિરીક્ષણો અને વર્ક ઓર્ડર અપડેટ્સ સ્થાનિક સ્ટોરેજમાં સંગ્રહિત થશે અને કનેક્ટિવિટી પુનઃસ્થાપિત થતાં આપમેળે સિંક થશે.',
    bannerSimOfflineTitle: 'ડેમો મોડ: સિમ્યુલેટેડ ઓફલાઇન',
    bannerSimOfflineDesc: 'ફિલ્ડ કનેક્ટિવિટી ડ્રોપનું સિમ્યુલેશન. ક્રિયાઓ સ્થાનિક સ્ટોરેજમાં સચવાય છે અને સિમ્યુલેશન સમાપ્ત થતાં આપમેળે સિંક થશે.',
    bannerPendingSyncTitle: 'ઓટો-રિપ્લે બાકી',
    bannerPendingSyncDesc: 'કનેક્ટિવિટી ઉપલબ્ધ છે. કતારબદ્ધ ક્રિયાઓ આપમેળે સ્થાનિક રિપ્લે માટે તૈયાર થઈ રહી છે.',
    bannerSyncingTitle: 'ઓટો-સિંક પ્રક્રિયા હેઠળ',
    bannerSyncingDesc: 'સિંગલ-ફ્લાઇટ સુરક્ષા સાથે સ્થાનિક ERP સ્ટેટમાં કતારબદ્ધ નિરીક્ષણ અને સ્થિતિ ક્રિયાઓ લાગુ થઈ રહી છે...',
    bannerSyncSuccessTitle: 'DEMO સિંક્રનાઇઝેશન પૂર્ણ',
    bannerSyncSuccessDesc: 'બધી કતારબદ્ધ ક્રિયાઓ સ્થાનિક ERP રેકોર્ડ્સમાં સફળતાપૂર્વક રિપ્લે કરવામાં આવી.',
    btnReviewConflict: 'વિસંગતતા તપાસો',
    labelSafeActionPrefix: 'ભલામણ કરેલ સુરક્ષિત પગલું:',
    badgeDemoIndicator: 'ડેમો',
    labelCanonicalStatePrefix: 'ERP માં મૂળ સ્થિતિ:',
    noticeActionAlreadyApplied: 'સૂચના: લક્ષિત વર્ક ઓર્ડર મૂળ ERP સિસ્ટમમાં પહેલેથી જ પૂર્ણ સ્થિતિમાં પહોંચી ગયો છે.',
    btnViewRecordInDrawer: 'વર્ક ઓર્ડર જુઓ',

    hazardModalTitle: 'ફિલ્ડ ફીડર / DTR જોખમનો અહેવાલ આપો',
    hazardModalSubtitle: 'સબ-ડિવિઝન અને મેનેજમેન્ટ કોકપીટને ગંભીર ઓપરેશનલ ઘટના પ્રસારિત કરે છે',
    labelTargetFeederCorridor: 'લક્ષિત ફીડર કોરિડોર *',
    labelDetectedHazardType: 'શોધાયેલ જોખમનો પ્રકાર *',
    optionHazardTransformerOverheating: 'ટ્રાન્સફોર્મર ઓવરહીટિંગ / થર્મલ રનઅવે',
    optionHazardFeederOverload: '11kV ફીડર ઓવરલોડ / કંડક્ટર ઝૂલવું (Sagging)',
    optionHazardCriticalOutage: 'ફીડર ટ્રિપિંગ / કંડક્ટર તૂટવાથી વીજ પુરવઠો બંધ',
    labelHazardObservations: 'ફિલ્ડ અવલોકનો અને સુરક્ષા જોખમની નોંધ *',
    defaultHazardRemarks: '100kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર પર ઉચ્ચ થર્મલ સિગ્નેચર (>85°C) અને ઓઇલ લીકેજ જોવા મળ્યું.',
    btnCancel: 'રદ કરો',
    btnTransmitCriticalAlert: 'ગંભીર ચેતવણી મોકલો',

    kpiAssignedWorkOrders: 'આજના સોંપાયેલ વર્ક ઓર્ડર્સ',
    kpiAssignedWorkOrdersSub: '1 પ્રગતિમાં · 2 બાકી સાઇટ્સ',
    kpiEmergencyCallouts: 'કટોકટી ફોલ્ટ કોલઆઉટ્સ',
    kpiEmergencyActiveSuffix: 'સક્રિય',
    kpiEmergencySub: 'DT ઓવરલોડ નિરીક્ષણ (WO-4403)',
    kpiCompletedInspections: 'પૂર્ણ થયેલા નિરીક્ષણો',
    kpiCompletedInspectionsSub: 'સબ-ડિવિઝન સાથે સિંક્રનાઇઝ થયેલ',
    sectionAssignedIncidents: 'સોંપાયેલ ફિલ્ડ ઘટનાઓ અને પ્રાથમિકતા કોલઆઉટ્સ',
    badgeTargetedDispatch: 'લક્ષિત ડિસ્પેચ',
    btnReviewAssignment: 'સોંપણીની સમીક્ષા કરો',
    btnAcknowledge: 'સ્વીકારો (Acknowledge)',
    btnInspectFeederTelemetry: 'ફીડર ટેલિમેટ્રી તપાસો →',
    labelFeederAsset: 'ફીડર/એસેટ:',
    labelSubdivision: 'સબ-ડિવિઝન:',
    labelAssignedTime: 'સોંપાયેલ સમય:',
    labelNotes: 'નોંધ:',
    sectionTodaysItinerary: 'આજની ફિલ્ડ કાર્યসূચિ અને કાર્યો',
    btnViewAllWorkOrders: 'તમામ વર્ક ઓર્ડર્સ જુઓ →',
    tooltipViewSourceComplaint: 'ડ્રોઅરમાં મૂળ ફરિયાદ જુઓ',
    tooltipViewSourceApplication: 'ડ્રોઅરમાં મૂળ જોડાણ અરજી જુઓ',
    labelRefPrefix: 'સંદર્ભ:',
    labelFeederPrefix: 'ફીડર:',
    labelScheduledPrefix: 'નિર્ધારિત:',
    labelStatusPrefix: 'સ્થિતિ:',
    btnDetails: 'વિગતો',
    btnPerformInspection: 'નિરીક્ષણ કરો',

    headingAssignedWorkOrders: 'સોંપાયેલ વર્ક ઓર્ડર્સ',
    subtitleAssignedWorkOrders: 'નિરીક્ષણ કાર્યો, ફોલ્ટ કોલઆઉટ્સ અને મીટર બદલવાની કામગીરી',
    labelTypePrefix: 'પ્રકાર:',
    labelLocationPrefix: 'સ્થળ:',
    btnEnterInspectionFindings: 'નિરીક્ષણ તારણો દાખલ કરો',
    badgeCompleted: 'પૂર્ણ થયેલ',
    labelInspectionFindingsRecorded: 'નોંધાયેલા નિરીક્ષણ તારણો:',
    labelMeterSerialPrefix: 'મીટર સીરીયલ:',
    labelReadingPrefix: 'રીડિંગ:',
    labelVoltagePrefix: 'વોલ્ટેજ:',
    labelRemarksPrefix: 'નોંધ:',

    headingSiteInspectionReport: 'ફિલ્ડ સાઇટ નિરીક્ષણ અને શક્યતા અહેવાલ',
    labelTaskPrefix: 'કાર્ય:',
    defaultInspectionTaskFallback: 'WO-4401 (CMP-8821 નિવારણ)',
    labelScannedMeterSerial: 'સ્કેન કરેલ મીટર સીરીયલ / બારકોડ *',
    labelVerifiedMeterReading: 'ચકાસાયેલ મીટર રીડિંગ (kWh) *',
    labelOpticalSealStatus: 'હોલોગ્રાફિક ઓપ્ટિકલ સીલ સ્થિતિ',
    optionSealIntactVerified: 'સીલ અકબંધ અને ચકાસાયેલ',
    optionSealBrokenSuspicious: 'સીલ તૂટેલ / શંકાસ્પદ',
    labelTerminalBlockCondition: 'ટર્મિનલ બ્લોકની સ્થિતિ',
    optionTerminalNormal: 'સામાન્ય સ્થિતિ',
    optionTerminalBurnt: 'બળી ગયેલ / ફ્લેશઓવરના નિશાન',
    optionTerminalLooseNeutral: 'ઢીલું ન્યુટ્રલ જોડાણ',
    labelTestedPhaseVoltages: 'ચકાસાયેલ ફેઝ વોલ્ટેજ (Volts AC)',
    labelRPhase: 'R-ફેઝ',
    labelYPhase: 'Y-ફેઝ',
    labelBPhase: 'B-ફેઝ',
    labelSitePhotoEvidence: 'સાઇટ ફોટો પુરાવા (મોબાઇલ કેમેરા પ્રિવ્યૂ)',
    labelGpsGeotag: 'GPS જીઓટેગ:',
    badgeGeotagVerified: 'જીઓટેગ ટાઇમસ્ટેમ્પ ચકાસાયેલ',
    labelTechnicianObservations: 'ટેકનિશિયન અવલોકનો અને નિવારણ નોંધ *',
    defaultTechnicianRemarks: 'DP-14 ખાતે ન્યુટ્રલ ટર્મિનલનું નિરીક્ષણ કર્યું અને ઓક્સિડાઇઝ્ડ એલ્યુમિનિયમ ક્રિમ્પ બદલ્યું.',
    btnSignTransmitReport: 'સહી કરો અને નિરીક્ષણ અહેવાલ મોકલો',

    headingOfflineQueue: 'સિમ્યુલેટેડ ઓફલાઇન કતાર સ્થિતિ',
    subtitleOfflineQueue: 'અનિયમિત મોબાઇલ નેટવર્ક કવરેજ ધરાવતા વિસ્તારો માટે સ્થાનિક ફિલ્ડ બફર',
    btnSimulateSyncNow: 'હમણાં સિંક સિમ્યુલેટ કરો',
    offlineItem1Title: 'WO-4398 સ્માર્ટ મીટર સીલ',
    offlineItem1Desc: 'સેક્ટર 4/B · પોલીકાર્બોનેટ સીલ #UGVCL-882191 લગાવી',
    badgeSyncedToServer: 'સર્વર સાથે સિંક થયેલ',
    offlineItem2Title: 'WO-4401 વોલ્ટેજ નિવારણ',
    offlineItem2Desc: '14 આનંદ નગર · ન્યુટ્રલ ક્રિમ્પ કર્યું, 232V ચકાસ્યું',
    badgePendingBackgroundPush: 'બેકગ્રાઉન્ડ પુશ બાકી',
    offlineQueuePendingCountBadge: 'રિપ્લે બાકી',
    offlineQueueTotalItemsLabel: 'કુલ કતારબદ્ધ ક્રિયાઓ:',
    offlineQueueActionInspection: 'સાઇટ નિરીક્ષણ સબમિશન',
    offlineQueueActionStatusUpdate: 'વર્ક ઓર્ડર સ્થિતિ ફેરફાર',
    queueStatusPending: 'રિપ્લે બાકી',
    queueStatusProcessing: 'રિપ્લે પ્રક્રિયા હેઠળ',
    queueStatusCompleted: 'રિપ્લે પૂર્ણ (DEMO સ્ટેટ)',
    queueStatusFailed: 'રિપ્લે નિષ્ફળ / વિરોધાભાસ',
    emptyOfflineQueueTitle: 'કોઈ ઓફલાઇન ક્રિયા કતારમાં નથી',
    emptyOfflineQueueDesc:
      'સ્થાનિક કતારમાં ક્રિયાઓ નોંધવા માટે સિમ્યુલેટેડ ઓફલાઇન મોડ ચાલુ કરો અને સાઇટ નિરીક્ષણ સબમિટ કરો અથવા વર્ક ઓર્ડરની સ્થિતિ અપડેટ કરો.',
    labelClientUuidPrefix: 'ક્લાયન્ટ UUID:',
    labelQueuedAtPrefix: 'કતાર સમય:',
    labelReplayedAtPrefix: 'રિપ્લે સમય:',
    labelTransitionPrefix: 'સ્થિતિ ફેરફાર:',
    btnRetryQueueItem: 'ફરી પ્રયાસ કરો',
    offlineDemoDisclaimer:
      'DEMO મોડ સંગ્રહ: કતારબદ્ધ ક્રિયાઓ localStorage (vidyutflow_field_offline_queue) માં સાચવવામાં આવે છે અને ઓનલાઇન મોડ પુનઃસ્થાપિત થતાં સ્થાનિક ERP સ્ટેટમાં રિપ્લે થાય છે. લાઇવ સર્વર સિંક્રનાઇઝેશન માટે બેકએન્ડ જોડાણ જરૂરી છે.',
    badgeOfflineQueuedOnWo: 'ઓફલાઇન ક્રિયા કતારબદ્ધ',

    headingFeederPatrol: '11kV ફીડર પેટ્રોલિંગ અને લાઇન કોરિડોર દેખરેખ',
    subtitleFeederPatrol: 'ઉત્તર ગુજરાત સબ-ડિવિઝનોમાં ડિસ્ટ્રિબ્યુશન ફીડર લોડિંગ, ટ્રાન્સફોર્મર ક્લસ્ટરો અને સક્રિય ફિલ્ડ કાર્યો',
    btnViewAssignedWorkOrdersArrow: 'સોંપાયેલ વર્ક ઓર્ડર્સ જુઓ →',
    summaryMonitoredFeeders: 'દેખરેખ હેઠળના 11kV ફીડર્સ',
    summaryMonitoredFeedersSub: 'મહેસાણા અને ગાંધીનગર સર્કલ',
    summaryFeedersAttention: 'ધ્યાન આપવાની જરૂર હોય તેવા ફીડર્સ',
    summaryFeedersAttentionSub: '1 ગંભીર ઓવરલોડ · 1 ઉચ્ચ લોડ ચેતવણી',
    summaryOpenFieldWorkOrders: 'ખુલ્લા ફિલ્ડ વર્ક ઓર્ડર્સ',
    summaryOpenFieldWorkOrdersSub: '11kV કોરિડોર પર નિર્ધારિત',
    labelConductorLoadUtilization: 'કંડક્ટર લોડ વપરાશ',
    labelPeakLoad: 'મહત્તમ લોડ (Peak Load)',
    labelTransformers: 'ટ્રાન્સફોર્મર્સ',
    unitDts: 'DTs',
    labelConsumers: 'ગ્રાહકો',
    labelLinkedWorkOrder: 'સંકળાયેલ વર્ક ઓર્ડર:',
    noOpenFaultCalloutsOnFeeder: 'આ ફીડર પર કોઈ ખુલ્લા ફોલ્ટ કોલઆઉટ્સ નથી',
    btnInspectFeederPrefix: 'નિરીક્ષણ કરો:',
    btnLogPatrolCheck: 'પેટ્રોલિંગ ચકાસણી નોંધો',
    emptyFeederRecordsTitle: 'કોઈ ફીડર પેટ્રોલિંગ રેકોર્ડ ઉપલબ્ધ નથી',
    emptyFeederRecordsDesc: 'ફિલ્ડ કોન્સોલમાં હાલમાં કોઈ 11kV ફીડર ટેલિમેટ્રી રેકોર્ડ લોડ થયેલ નથી.',

    headingCompletedJobs: 'પૂર્ણ થયેલા કાર્યો અને નિરીક્ષણ ઇતિહાસ',
    subtitleCompletedJobs: 'બંધ થયેલા ફિલ્ડ વર્ક ઓર્ડર્સ અને સબમિટ કરેલા ટેકનિકલ નિરીક્ષણ અહેવાલો',
    badgeCompletedJobsCountSuffix: 'પૂર્ણ થયેલ કાર્ય(કાર્યો)',
    btnAllWorkOrders: 'તમામ વર્ક ઓર્ડર્સ',
    btnViewCaseFile: 'કેસ ફાઇલ જુઓ',
    labelRecordedInspectionReport: 'નોંધાયેલ સાઇટ નિરીક્ષણ અહેવાલ',
    labelEngineerPrefix: 'ઇજનેર:',
    labelScannedMeterSerialShort: 'સ્કેન કરેલ મીટર સીરીયલ',
    labelVerifiedReadingShort: 'ચકાસાયેલ રીડિંગ',
    labelSealAndTerminal: 'સીલ અને ટર્મિનલ',
    labelPhaseVoltagesShort: 'ફેઝ વોલ્ટેજ (R/Y/B)',
    fallbackWorkOrderCompletedPrefix: 'વર્ક ઓર્ડર પૂર્ણ તરીકે ચિહ્નિત (',
    fallbackWorkOrderCompletedSuffix: ').',
    emptyCompletedJobsTitle: 'હજુ સુધી કોઈ પૂર્ણ થયેલા વર્ક ઓર્ડર્સ નથી',
    emptyCompletedJobsDesc: 'પૂર્ણ થયેલા ફિલ્ડ નિરીક્ષણો અને ફોલ્ટ નિવારણ સબમિટ થયા પછી અહીં દેખાશે.',
    btnViewAssignedWorkOrdersPlain: 'સોંપાયેલ વર્ક ઓર્ડર્સ જુઓ',

    modalFieldDispatchControlsPrefix: 'માટે ફિલ્ડ ડિસ્પેચ નિયંત્રણો:',
    modalFieldDispatchControlsDesc:
      'અહીં નિર્ણયોનો અમલ કરવાથી મૂળ ઓપરેશન્સ કર્મચારીને સીધી જાણ થાય છે અને સત્તાવાર ઘટના સ્થિતિ સિંક્રનાઇઝ થાય છે.',
    modalStep1Acceptance: 'પગલું 1: સોંપણી સ્વીકૃતિ',
    modalBtnAcceptMobilize: 'સોંપણી સ્વીકારો અને સાઇટ પર રવાના થાઓ',
    modalBtnDeclineAssignment: 'સોંપણી અસ્વીકાર કરો',
    modalLabelDeclineReason: 'અસ્વીકાર કરવાનું ફરજિયાત કારણ *',
    modalPlaceholderDeclineReason:
      'ટેકનિકલ કારણ જણાવો (દા.ત., હાલમાં 33kV સબસ્ટેશન ફીડર ફોલ્ટ પર આઇસોલેશન કામગીરીમાં વ્યસ્ત; કૃપા કરીને ઓન-કોલ ઇજનેર FLD-UG-204 ને સોંપો)...',
    modalBtnConfirmDecline: 'અસ્વીકારની પુષ્ટિ કરો (કર્મચારીને જાણ કરો)',
    modalStep2InspectionFindings: 'પગલું 2: સ્થળ પર નિરીક્ષણ અને તારણો',
    modalBtnStartOnSiteInspection: 'સ્થળ પર ભૌતિક નિરીક્ષણ શરૂ કરો',
    modalInspectionCommencedPrefix: 'નિરીક્ષણ શરૂ થવાનો સમય:',
    modalLabelRecordTechnicalFindings: 'ટેકનિકલ તારણો અને માપેલા રીડિંગ્સ નોંધો *',
    modalPlaceholderTechnicalFindings:
      'દા.ત. ટ્રાન્સફોર્મર ટોપ ઓઇલનું તાપમાન 88C માપવામાં આવ્યું. ન્યુટ્રલ બુશિંગ ક્રિમ્પ ઓક્સિડાઇઝ થયેલ. એલ્યુમિનિયમ લગને બાય-મેટાલિક ક્રિમ્પ સ્લીવથી બદલ્યું.',
    modalBtnTransmitFindings: 'ઓપરેશન્સ ડેસ્કને તારણો મોકલો',
    modalLabelRequestAdditionalCrew: 'વધારાની ટીમ અથવા ભારે સાધનોની વિનંતી કરો',
    modalPlaceholderAssistanceNote:
      'દા.ત. હાઇ-ટેન્શન કોરિડોર પર વૃક્ષોની છાંટણી માટે બકેટ ટ્રક / ક્રેન ટુકડીની જરૂર છે.',
    modalBtnRequestSpecializedAssistance: 'વિશેષ સહાયની વિનંતી કરો',
    modalHeadingSubmitFinalResolution: 'અંતિમ નિવારણ અહેવાલ સબમિટ કરો અને ફોલ્ટ ક્લિયર કરો',
    modalDescSubmitFinalResolution:
      'આ અહેવાલ દાખલ કરવાથી સ્થળ પરનો ઇલેક્ટ્રિકલ ફોલ્ટ ઉકેલાય છે અને કર્મચારી ઓપરેશન્સ ડેસ્કને જાણ થાય છે. (ફિક્સ 6 મુજબ મેનેજમેન્ટ મૂડી મંજૂરીથી અલગ).',
    modalPlaceholderResolutionSummary:
      'વિગતવાર નિવારણ સારાંશ: ઇન્સ્યુલેશન રેઝિસ્ટન્સ ચકાસ્યું (IR > 50 Mega-ohms). સામાન્ય લોડ હેઠળ લાઇન ચાર્જ કરવામાં આવી. ફીડર નિર્ધારિત માપદંડોમાં કાર્યરત છે.',
    modalBtnSubmitResolutionClearFault: 'નિવારણ અહેવાલ સબમિટ કરો અને ફોલ્ટ ક્લિયર કરો',
    modalIncidentAlreadyResolvedTitle: 'આ ઘટના પહેલેથી જ ઉકેલાયેલ (RESOLVED) તરીકે ચિહ્નિત છે.',
    modalIncidentAlreadyResolvedDesc: 'નિવારણની વિગતો સત્તાવાર ઓડિટ ટ્રેલમાં સુરક્ષિત છે.',

    modalMgmtConcurrenceTitle: 'એક્ઝિક્યુટિવ સંમતિ અને એસ્કેલેશન સત્તા',
    modalMgmtConcurrenceDesc:
      'ઓપરેશન્સ એસ્કેલેશનના વાજબીપણાની સમીક્ષા કરો. મંજૂરી આપવાથી ચકાસ્યા વિનાના ઇલેક્ટ્રિકલ ફોલ્ટને અકાળે ઉકેલાયેલ ગણ્યા વિના એક્ઝિક્યુટિવ સંમતિ મળે છે.',
    modalMgmtDecisionHeading: 'એક્ઝિક્યુટિવ સંમતિ નિર્ણય',
    modalMgmtRemarksLabel: 'એક્ઝિક્યુટિવ સંમતિ નોંધ (વૈકલ્પિક)',
    modalMgmtRemarksPlaceholder:
      'દા.ત. સહાયક ફીડર બસ સ્વેપ માટે સંમતિ આપવામાં આવી. મૂડી ટ્રાન્સફોર્મર ક્ષમતા વધારાની મંજૂરી આપવામાં આવી.',
    modalMgmtApproveBtn: 'એસ્કેલેશન મંજૂર કરો (ગ્રીન નોટિસ)',
    modalMgmtRejectBtn: 'એસ્કેલેશન નામંજૂર કરો',
    modalMgmtMoreInfoBtn: 'વધુ માહિતી માંગો',
    modalMgmtMandatoryRejectLabel: 'નામંજૂર કરવાનું ફરજિયાત કારણ *',
    modalMgmtMandatoryRejectPlaceholder:
      'એક્ઝિક્યુટિવ કારણ જણાવો (દા.ત., ફીડર લોડ ડેટા દર્શાવે છે કે પીક લોડ <15 મિનિટ રહે છે; મૂડી ટ્રાન્સફોર્મર વધારાની વિનંતી કરતા પહેલા સબ-ડિવિઝન કેપેસિટર બેંક સ્વિચિંગ શરૂ કરો)...',
    modalMgmtConfirmRejectBtn: 'નામંજૂરીની પુષ્ટિ કરો (કર્મચારીને રેડ નોટિસ)',
    modalMgmtClarificationLabel: 'જરૂરી ચોક્કસ સ્પષ્ટતા / પ્રશ્ન *',
    modalMgmtClarificationPlaceholder:
      'દા.ત. એક્ઝિક્યુટિવ સંમતિ પહેલાં કૃપા કરીને 24-કલાકનો SCADA થર્મલ લોગ અને પુષ્ટિ થયેલ DGA ઓઇલ ટેસ્ટ પરિણામો રજૂ કરો.',
    modalMgmtSendInfoRequestBtn: 'માહિતી વિનંતી મોકલો (એમ્બર નોટિસ)',
    modalMgmtDecisionRecordedPrefix: 'એક્ઝિક્યુટિવ નિર્ણય પહેલેથી જ નોંધાયેલ છે:',
    modalMgmtByPrefix: 'દ્વારા:',
    modalMgmtOnPrefix: 'સમય:',
  },

  hi: {
    consoleTitle: 'फील्ड ऑपरेशंस कंसोल और निरीक्षण ऐप',
    roleBadgeField: 'फील्ड लाइनमैन / जूनियर इंजीनियर',
    ugvclLogoAlt: 'UGVCL आधिकारिक लोगो',
    subtitleOpsPrefix: 'UGVCL ऑपरेशंस · इंजीनियर:',
    btnReportHazard: 'फीडर / DTR खतरे की रिपोर्ट करें',
    ariaDisableOffline: 'सिम्युलेटेड ऑफलाइन मोड अक्षम करें',
    ariaEnableOffline: 'सिम्युलेटेड ऑफलाइन मोड सक्षम करें',
    btnSimulatedOffline: 'सिमुलेटेड ऑफ़लाइन (डेमो)',
    btnOnlineAmr: 'ऑनलाइन (कनेक्टेड)',
    offlineBufferActivePrefix: '◆ ऑफ़लाइन फील्ड बफर सक्रिय:',
    offlineBufferActiveDesc:
      'साइट निरीक्षण, वर्क ऑर्डर प्रगति और मीटर कमिशनिंग अपडेट स्थायी स्थानीय स्टोरेज (localStorage) में सहेजे जाते हैं और नेटवर्क कनेक्टिविटी बहाल होने पर स्वतः सिंक्रनाइज़ हो जाएंगे।',
    badgeLocalQueueReady: 'स्थानीय कतार तैयार',
    offlineSimNoticePrefix: 'केवल UI सिमुलेशन:',
    offlineSimNoticeDesc:
      'आप फील्ड ऑफ़लाइन सिमुलेशन टूल चला रहे हैं। पूर्ण किए गए निरीक्षण और स्थिति अपडेट स्थायी ब्राउज़र स्टोरेज (localStorage) में सहेजे जाते हैं और पुनः कनेक्ट होने पर स्थानीय DEMO ईआरपी रिकॉर्ड के साथ स्वतः सिंक्रनाइज़ हो जाएंगे।',

    // Real-time Field Connectivity & Auto-Sync
    statusOnlineLabel: 'ऑनलाइन (कनेक्टेड)',
    statusOnlineDesc: 'नेटवर्क कनेक्टिविटी सक्रिय · टेलीमेट्री ऑनलाइन',
    statusRealOfflineLabel: 'नेटवर्क ऑफ़लाइन',
    statusRealOfflineDesc: 'वास्तविक नेटवर्क अनुपलब्ध · क्रियाएं स्थानीय कतार में सुरक्षित हैं',
    statusSimOfflineLabel: 'सिमुलेटेड ऑफ़लाइन (डेमो)',
    statusSimOfflineDesc: 'डेमो सिमुलेशन सक्रिय · क्रियाएं स्थानीय स्टोरेज में कतारबद्ध',
    statusPendingSyncLabel: 'ऑटो-सिंक लंबित',
    statusPendingSyncDesc: 'कनेक्टिविटी उपलब्ध · कतारबद्ध क्रियाएं रीप्ले की प्रतीक्षा में',
    statusSyncingLabel: 'ऑटो-सिंक जारी है...',
    statusSyncingDesc: 'सिंगल-फ्लाइट रीप्ले प्रगति पर है · कतारबद्ध क्रियाएं लागू की जा रही हैं',
    statusSyncedDemoLabel: 'सिंक्रनाइज़्ड (डेमो)',
    statusSyncedDemoDesc: 'सभी कतारबद्ध क्रियाएं स्थानीय ईआरपी स्टेट में सफलतापूर्वक लागू हुईं',
    statusSyncFailedLabel: 'सिंक विफल',
    statusSyncFailedDesc: '1 या अधिक क्रियाएं विफल · ऑफ़लाइन कतार में समीक्षा करें',
    statusConflictDetectedLabel: 'संघर्ष का पता चला',
    statusConflictDetectedDesc: 'रीप्ले से पहले वर्क ऑर्डर बदल गया · मैन्युअल समीक्षा आवश्यक',
    btnToggleSimOfflineEnable: 'ऑफ़लाइन सिमुलेट करें',
    btnToggleSimOfflineDisable: 'सिमुलेशन समाप्त करें',
    btnManualSyncNow: 'अभी सिंक करें',
    badgeAutoSyncActive: 'ऑटो-सिंक सक्रिय',
    badgeAutoSyncReady: 'ऑटो-सिंक तैयार',
    ariaConnectivityStatusPrefix: 'कनेक्टिविटी स्थिति:',
    bannerRealOfflineTitle: 'नेटवर्क डिस्कनेक्ट हुआ (वास्तविक ऑफ़लाइन)',
    bannerRealOfflineDesc: 'फील्ड निरीक्षण और वर्क ऑर्डर अपडेट स्थानीय स्टोरेज में सहेजे जाएंगे और कनेक्टिविटी बहाल होने पर स्वतः सिंक हो जाएंगे।',
    bannerSimOfflineTitle: 'डेमो मोड: सिमुलेटेड ऑफ़लाइन',
    bannerSimOfflineDesc: 'फील्ड कनेक्टिविटी ड्रॉप का सिमुलेशन। क्रियाएं स्थानीय स्टोरेज में सुरक्षित हैं और सिमुलेशन समाप्त होने पर स्वतः सिंक होंगी।',
    bannerPendingSyncTitle: 'ऑटो-रीप्ले लंबित',
    bannerPendingSyncDesc: 'कनेक्टिविटी उपलब्ध है। कतारबद्ध क्रियाएं स्वचालित स्थानीय रीप्ले के लिए तैयार हो रही हैं।',
    bannerSyncingTitle: 'ऑटो-सिंक प्रगति पर है',
    bannerSyncingDesc: 'सिंगल-फ्लाइट सुरक्षा के साथ स्थानीय ईआरपी स्टेट में कतारबद्ध निरीक्षण और स्थिति क्रियाएं लागू की जा रही हैं...',
    bannerSyncSuccessTitle: 'DEMO सिंक्रनाइज़ेशन पूर्ण हुआ',
    bannerSyncSuccessDesc: 'सभी कतारबद्ध क्रियाएं स्थानीय ईआरपी रिकॉर्ड में सफलतापूर्वक रीप्ले हो गईं।',
    btnReviewConflict: 'विवाद की समीक्षा करें',
    labelSafeActionPrefix: 'अनुशंसित सुरक्षित कार्रवाई:',
    badgeDemoIndicator: 'डेमो',
    labelCanonicalStatePrefix: 'ईआरपी में मुख्य स्थिति:',
    noticeActionAlreadyApplied: 'सूचना: लक्षित वर्क ऑर्डर मुख्य ईआरपी सिस्टम में पहले से ही पूर्ण स्थिति में पहुंच चुका है।',
    btnViewRecordInDrawer: 'वर्क ऑर्डर देखें',

    hazardModalTitle: 'फील्ड फीडर / DTR खतरे की रिपोर्ट करें',
    hazardModalSubtitle: 'सब-डिवीजन और प्रबंधन कॉकपिट को गंभीर परिचालन घटना प्रसारित करता है',
    labelTargetFeederCorridor: 'लक्षित फीडर कॉरिडोर *',
    labelDetectedHazardType: 'पता लगाया गया खतरे का प्रकार *',
    optionHazardTransformerOverheating: 'ट्रांसफॉर्मर ओवरहीटिंग / थर्मल रनअवे',
    optionHazardFeederOverload: '11kV फीडर ओवरलोड / कंडक्टर झुकना (Sagging)',
    optionHazardCriticalOutage: 'फीडर ट्रिपिंग / कंडक्टर टूटने से आउटेज',
    labelHazardObservations: 'फील्ड अवलोकन और सुरक्षा खतरे की टिप्पणी *',
    defaultHazardRemarks: '100kVA वितरण ट्रांसफॉर्मर पर उच्च थर्मल सिग्नेचर (>85°C) और तेल रिसाव देखा गया।',
    btnCancel: 'रद्द करें',
    btnTransmitCriticalAlert: 'गंभीर अलर्ट भेजें',

    kpiAssignedWorkOrders: 'आज सौंपे गए वर्क ऑर्डर',
    kpiAssignedWorkOrdersSub: '1 प्रगति पर · 2 लंबित साइटें',
    kpiEmergencyCallouts: 'आपातकालीन फॉल्ट कॉलआउट',
    kpiEmergencyActiveSuffix: 'सक्रिय',
    kpiEmergencySub: 'DT ओवरलोड निरीक्षण (WO-4403)',
    kpiCompletedInspections: 'पूर्ण किए गए निरीक्षण',
    kpiCompletedInspectionsSub: 'सब-डिवीजन के साथ सिंक्रनाइज़ किया गया',
    sectionAssignedIncidents: 'सौंपे गए फील्ड इंसिडेंट और प्राथमिकता कॉलआउट',
    badgeTargetedDispatch: 'लक्षित डिस्पैच',
    btnReviewAssignment: 'असाइनमेंट की समीक्षा करें',
    btnAcknowledge: 'स्वीकार करें (Acknowledge)',
    btnInspectFeederTelemetry: 'फीडर टेलीमेट्री का निरीक्षण करें →',
    labelFeederAsset: 'फीडर/एसेट:',
    labelSubdivision: 'सब-डिवीजन:',
    labelAssignedTime: 'सौंपा गया समय:',
    labelNotes: 'टिप्पणी:',
    sectionTodaysItinerary: 'आज की फील्ड कार्यसूची और कार्य',
    btnViewAllWorkOrders: 'सभी वर्क ऑर्डर देखें →',
    tooltipViewSourceComplaint: 'ड्रॉअर में मूल शिकायत देखें',
    tooltipViewSourceApplication: 'ड्रॉअर में मूल कनेक्शन आवेदन देखें',
    labelRefPrefix: 'संदर्भ:',
    labelFeederPrefix: 'फीडर:',
    labelScheduledPrefix: 'निर्धारित:',
    labelStatusPrefix: 'स्थिति:',
    btnDetails: 'विवरण',
    btnPerformInspection: 'निरीक्षण करें',

    headingAssignedWorkOrders: 'सौंपे गए वर्क ऑर्डर',
    subtitleAssignedWorkOrders: 'निरीक्षण कार्य, फॉल्ट कॉलआउट और मीटर प्रतिस्थापन',
    labelTypePrefix: 'प्रकार:',
    labelLocationPrefix: 'स्थान:',
    btnEnterInspectionFindings: 'निरीक्षण निष्कर्ष दर्ज करें',
    badgeCompleted: 'पूर्ण',
    labelInspectionFindingsRecorded: 'दर्ज किए गए निरीक्षण निष्कर्ष:',
    labelMeterSerialPrefix: 'मीटर सीरियल:',
    labelReadingPrefix: 'रीडिंग:',
    labelVoltagePrefix: 'वोल्टेज:',
    labelRemarksPrefix: 'टिप्पणी:',

    headingSiteInspectionReport: 'फील्ड साइट निरीक्षण और व्यवहार्यता रिपोर्ट',
    labelTaskPrefix: 'कार्य:',
    defaultInspectionTaskFallback: 'WO-4401 (CMP-8821 सुधार)',
    labelScannedMeterSerial: 'स्कैन किया गया मीटर सीरियल / बारकोड *',
    labelVerifiedMeterReading: 'सत्यापित मीटर रीडिंग (kWh) *',
    labelOpticalSealStatus: 'होलोग्राफिक ऑप्टिकल सील स्थिति',
    optionSealIntactVerified: 'सील सुरक्षित और सत्यापित',
    optionSealBrokenSuspicious: 'सील टूटी हुई / संदिग्ध',
    labelTerminalBlockCondition: 'टर्मिनल ब्लॉक की स्थिति',
    optionTerminalNormal: 'सामान्य स्थिति',
    optionTerminalBurnt: 'जले हुए / फ्लैशओवर के निशान',
    optionTerminalLooseNeutral: 'ढीला न्यूट्रल कनेक्शन',
    labelTestedPhaseVoltages: 'परीक्षित फेज वोल्टेज (Volts AC)',
    labelRPhase: 'R-फेज',
    labelYPhase: 'Y-फेज',
    labelBPhase: 'B-फेज',
    labelSitePhotoEvidence: 'साइट फोटो साक्ष्य (मोबाइल कैमरा पूर्वावलोकन)',
    labelGpsGeotag: 'GPS जियोटैग:',
    badgeGeotagVerified: 'जियोटैग टाइमस्टैम्प सत्यापित',
    labelTechnicianObservations: 'तकनीशियन अवलोकन और सुधार टिप्पणी *',
    defaultTechnicianRemarks: 'DP-14 पर न्यूट्रल टर्मिनल का निरीक्षण किया और ऑक्सीकृत एल्यूमीनियम क्रिम्प को बदला।',
    btnSignTransmitReport: 'हस्ताक्षर करें और निरीक्षण रिपोर्ट भेजें',

    headingOfflineQueue: 'सिम्युलेटेड ऑफलाइन कतार स्थिति',
    subtitleOfflineQueue: 'अनियमित मोबाइल नेटवर्क कवरेज वाले क्षेत्रों के लिए स्थानीय फील्ड बफर',
    btnSimulateSyncNow: 'अभी सिंक सिम्युलेट करें',
    offlineItem1Title: 'WO-4398 स्मार्ट मीटर सील',
    offlineItem1Desc: 'सेक्टर 4/B · पॉलीकार्बोनेट सील #UGVCL-882191 लगाई गई',
    badgeSyncedToServer: 'सर्वर से सिंक किया गया',
    offlineItem2Title: 'WO-4401 वोल्टेज सुधार',
    offlineItem2Desc: '14 आनंद नगर · न्यूट्रल क्रिम्प किया गया, 232V परीक्षित',
    badgePendingBackgroundPush: 'बैकग्राउंड पुश लंबित',
    offlineQueuePendingCountBadge: 'रिप्ले लंबित',
    offlineQueueTotalItemsLabel: 'कुल कतारबद्ध कार्रवाइयां:',
    offlineQueueActionInspection: 'साइट निरीक्षण सबमिशन',
    offlineQueueActionStatusUpdate: 'वर्क ऑर्डर स्थिति परिवर्तन',
    queueStatusPending: 'रिप्ले लंबित',
    queueStatusProcessing: 'रिप्ले प्रक्रियाधीन',
    queueStatusCompleted: 'रिप्ले पूर्ण (DEMO स्टेट)',
    queueStatusFailed: 'रिप्ले विफल / स्थिति टकराव',
    emptyOfflineQueueTitle: 'कोई ऑफलाइन कार्रवाई कतार में नहीं है',
    emptyOfflineQueueDesc:
      'स्थायी स्थानीय कतार में कार्रवाइयों को सहेजने के लिए सिम्युलेटेड ऑफलाइन मोड सक्षम करें और साइट निरीक्षण सबमिट करें या वर्क ऑर्डर स्थिति अपडेट करें।',
    labelClientUuidPrefix: 'क्लाइंट UUID:',
    labelQueuedAtPrefix: 'कतार समय:',
    labelReplayedAtPrefix: 'रिप्ले समय:',
    labelTransitionPrefix: 'स्थिति परिवर्तन:',
    btnRetryQueueItem: 'पुनः प्रयास करें',
    offlineDemoDisclaimer:
      'DEMO मोड स्टोरेज: कतारबद्ध कार्रवाइयां localStorage (vidyutflow_field_offline_queue) में सहेजी जाती हैं और ऑनलाइन मोड बहाल होने पर स्थानीय साझा ERP स्टेट में रिप्ले की जाती हैं। लाइव सर्वर सिंक के लिए बैकएंड एकीकरण आवश्यक है।',
    badgeOfflineQueuedOnWo: 'ऑफलाइन कार्रवाई कतारबद्ध',

    headingFeederPatrol: '11kV फीडर पेट्रोलिंग और लाइन कॉरिडोर निगरानी',
    subtitleFeederPatrol: 'उत्तर गुजरात सब-डिवीजनों में वितरण फीडर लोडिंग, ट्रांसफॉर्मर क्लस्टर और सक्रिय फील्ड कार्य',
    btnViewAssignedWorkOrdersArrow: 'सौंपे गए वर्क ऑर्डर देखें →',
    summaryMonitoredFeeders: 'निगरानी किए गए 11kV फीडर',
    summaryMonitoredFeedersSub: 'महेसाणा और गांधीनगर सर्कल',
    summaryFeedersAttention: 'ध्यान देने योग्य फीडर',
    summaryFeedersAttentionSub: '1 गंभीर ओवरलोड · 1 उच्च लोड चेतावनी',
    summaryOpenFieldWorkOrders: 'खुले फील्ड वर्क ऑर्डर',
    summaryOpenFieldWorkOrdersSub: '11kV कॉरिडोर पर निर्धारित',
    labelConductorLoadUtilization: 'कंडक्टर लोड उपयोग',
    labelPeakLoad: 'अधिकतम लोड (Peak Load)',
    labelTransformers: 'ट्रांसफॉर्मर',
    unitDts: 'DTs',
    labelConsumers: 'उपभोक्ता',
    labelLinkedWorkOrder: 'लिंक किया गया वर्क ऑर्डर:',
    noOpenFaultCalloutsOnFeeder: 'इस फीडर पर कोई खुला फॉल्ट कॉलआउट नहीं है',
    btnInspectFeederPrefix: 'निरीक्षण करें:',
    btnLogPatrolCheck: 'पेट्रोलिंग जांच दर्ज करें',
    emptyFeederRecordsTitle: 'कोई फीडर पेट्रोलिंग रिकॉर्ड उपलब्ध नहीं है',
    emptyFeederRecordsDesc: 'फील्ड कंसोल में वर्तमान में कोई 11kV फीडर टेलीमेट्री रिकॉर्ड लोड नहीं है।',

    headingCompletedJobs: 'पूर्ण किए गए कार्य और निरीक्षण इतिहास',
    subtitleCompletedJobs: 'बंद किए गए फील्ड वर्क ऑर्डर और सबमिट की गई तकनीकी निरीक्षण रिपोर्ट',
    badgeCompletedJobsCountSuffix: 'पूर्ण कार्य',
    btnAllWorkOrders: 'सभी वर्क ऑर्डर',
    btnViewCaseFile: 'केस फ़ाइल देखें',
    labelRecordedInspectionReport: 'दर्ज की गई साइट निरीक्षण रिपोर्ट',
    labelEngineerPrefix: 'इंजीनियर:',
    labelScannedMeterSerialShort: 'स्कैन किया गया मीटर सीरियल',
    labelVerifiedReadingShort: 'सत्यापित रीडिंग',
    labelSealAndTerminal: 'सील और टर्मिनल',
    labelPhaseVoltagesShort: 'फेज वोल्टेज (R/Y/B)',
    fallbackWorkOrderCompletedPrefix: 'वर्क ऑर्डर पूर्ण के रूप में चिह्नित (',
    fallbackWorkOrderCompletedSuffix: ').',
    emptyCompletedJobsTitle: 'अभी तक कोई पूर्ण वर्क ऑर्डर नहीं है',
    emptyCompletedJobsDesc: 'पूर्ण किए गए फील्ड निरीक्षण और फॉल्ट सुधार सबमिट होने के बाद यहां दिखाई देंगे।',
    btnViewAssignedWorkOrdersPlain: 'सौंपे गए वर्क ऑर्डर देखें',

    modalFieldDispatchControlsPrefix: 'के लिए फील्ड डिस्पैच नियंत्रण:',
    modalFieldDispatchControlsDesc:
      'यहां निर्णयों को निष्पादित करने से सीधे संबंधित ऑपरेशंस कर्मचारी को सूचित किया जाता है और आधिकारिक घटना स्थिति सिंक्रनाइज़ होती है।',
    modalStep1Acceptance: 'चरण 1: असाइनमेंट स्वीकृति',
    modalBtnAcceptMobilize: 'असाइनमेंट स्वीकार करें और साइट पर रवाना हों',
    modalBtnDeclineAssignment: 'असाइनमेंट अस्वीकार करें',
    modalLabelDeclineReason: 'अस्वीकार करने का अनिवार्य कारण *',
    modalPlaceholderDeclineReason:
      'तकनीकी कारण बताएं (उदा., वर्तमान में 33kV सबस्टेशन फीडर फॉल्ट पर आइसोलेटेड; कृपया ऑन-कॉल इंजीनियर FLD-UG-204 को सौंपें)...',
    modalBtnConfirmDecline: 'अस्वीकृति की पुष्टि करें (कर्मचारी को सूचित करें)',
    modalStep2InspectionFindings: 'चरण 2: साइट पर निरीक्षण और निष्कर्ष',
    modalBtnStartOnSiteInspection: 'साइट पर भौतिक निरीक्षण शुरू करें',
    modalInspectionCommencedPrefix: 'निरीक्षण शुरू होने का समय:',
    modalLabelRecordTechnicalFindings: 'तकनीकी निष्कर्ष और मापी गई रीडिंग दर्ज करें *',
    modalPlaceholderTechnicalFindings:
      'उदा. ट्रांसफॉर्मर टॉप ऑयल पर 88C मापा गया। न्यूट्रल बुशिंग क्रिम्प ऑक्सीकृत। एल्यूमीनियम लग को बाई-मेटालिक क्रिम्प स्लीव से बदला गया।',
    modalBtnTransmitFindings: 'ऑपरेशंस डेस्क को निष्कर्ष भेजें',
    modalLabelRequestAdditionalCrew: 'अतिरिक्त टीम या भारी उपकरण का अनुरोध करें',
    modalPlaceholderAssistanceNote:
      'उदा. कॉरिडोर के साथ हाई-टेंशन पेड़ की छंटाई के लिए बकेट ट्रक / क्रेन दस्ते की आवश्यकता है।',
    modalBtnRequestSpecializedAssistance: 'विशेष सहायता का अनुरोध करें',
    modalHeadingSubmitFinalResolution: 'अंतिम समाधान रिपोर्ट सबमिट करें और फॉल्ट क्लियर करें',
    modalDescSubmitFinalResolution:
      'इस रिपोर्ट को दाखिल करने से साइट पर विद्युत फॉल्ट का समाधान हो जाता है और कर्मचारी ऑपरेशंस डेस्क को सूचित किया जाता है। (फिक्स 6 के अनुसार प्रबंधन पूंजी अनुमोदन से अलग)।',
    modalPlaceholderResolutionSummary:
      'विस्तृत समाधान सारांश: इंसुलेशन प्रतिरोध का परीक्षण किया गया (IR > 50 Mega-ohms)। सामान्य लोड के तहत लाइन को ऊर्जित किया गया। फीडर निर्धारित मापदंडों के भीतर कार्यरत है।',
    modalBtnSubmitResolutionClearFault: 'समाधान रिपोर्ट सबमिट करें और फॉल्ट क्लियर करें',
    modalIncidentAlreadyResolvedTitle: 'यह घटना पहले से ही हल (RESOLVED) के रूप में चिह्नित है।',
    modalIncidentAlreadyResolvedDesc: 'समाधान का विवरण आधिकारिक ऑडिट ट्रेल में सुरक्षित है।',

    modalMgmtConcurrenceTitle: 'कार्यकारी सहमति और एस्केलेशन प्राधिकरण',
    modalMgmtConcurrenceDesc:
      'ऑपरेशंस एस्केलेशन औचित्य की समीक्षा करें। अनुमोदन करने से असत्यापित विद्युत फॉल्ट को समय से पहले हल किए गए के रूप में चिह्नित किए बिना कार्यकारी सहमति मिलती है।',
    modalMgmtDecisionHeading: 'कार्यकारी सहमति निर्णय',
    modalMgmtRemarksLabel: 'कार्यकारी सहमति टिप्पणी (वैकल्पिक)',
    modalMgmtRemarksPlaceholder:
      'उदा. सहायक फीडर बस स्वैप के लिए सहमति प्रदान की गई। पूंजी ट्रांसफॉर्मर संवर्धन स्वीकृति अनुमोदित।',
    modalMgmtApproveBtn: 'एस्केलेशन स्वीकृत करें (ग्रीन नोटिस)',
    modalMgmtRejectBtn: 'एस्केलेशन अस्वीकार करें',
    modalMgmtMoreInfoBtn: 'अधिक जानकारी मांगें',
    modalMgmtMandatoryRejectLabel: 'अस्वीकृति का अनिवार्य औचित्य *',
    modalMgmtMandatoryRejectPlaceholder:
      'कार्यकारी कारण बताएं (उदा., फीडर लोड डेटा दिखाता है कि पीक <15 मिनट के लिए होता है; पूंजी ट्रांसफॉर्मर संवर्धन का अनुरोध करने से पहले सब-डिवीजन कैपेसिटर बैंक स्विचिंग शुरू करें)...',
    modalMgmtConfirmRejectBtn: 'अस्वीकृति की पुष्टि करें (कर्मचारी को रेड नोटिस)',
    modalMgmtClarificationLabel: 'आवश्यक विशिष्ट स्पष्टीकरण / प्रश्न *',
    modalMgmtClarificationPlaceholder:
      'उदा. कार्यकारी सहमति से पहले कृपया 24-घंटे का SCADA थर्मल लॉग और पुष्ट DGA ऑयल परीक्षण परिणाम प्रस्तुत करें।',
    modalMgmtSendInfoRequestBtn: 'जानकारी अनुरोध भेजें (एम्बर नोटिस)',
    modalMgmtDecisionRecordedPrefix: 'कार्यकारी निर्णय पहले से ही दर्ज है:',
    modalMgmtByPrefix: 'द्वारा:',
    modalMgmtOnPrefix: 'दिनांक:',
  },

  mr: {
    consoleTitle: 'फील्ड ऑपरेशन्स कन्सोल आणि तपासणी ॲप',
    roleBadgeField: 'फील्ड लाईनमन / कनिष्ठ अभियंता',
    ugvclLogoAlt: 'UGVCL अधिकृत लोगो',
    subtitleOpsPrefix: 'UGVCL ऑपरेशन्स · अभियंता:',
    btnReportHazard: 'फीडर / DTR धोक्याची नोंद करा',
    ariaDisableOffline: 'सिम्युलेटेड ऑफलाईन मोड बंद करा',
    ariaEnableOffline: 'सिम्युलेटेड ऑफलाईन मोड सुरू करा',
    btnSimulatedOffline: 'सिम्युलेटेड ऑफलाईन (डेमो)',
    btnOnlineAmr: 'ऑनलाईन (कनेक्ट केलेले)',
    offlineBufferActivePrefix: '◆ অফलाईन फील्ड बफर सक्रिय:',
    offlineBufferActiveDesc:
      'साईट तपासणी, वर्क ऑर्डर प्रगती आणि मीटर कमिशनिंग अपडेट્સ कायमस्वरूपी स्थानिक स्टोरेज (localStorage) मध्ये जतन केले जातात आणि नेटवर्क कनेक्टिव्हिटी पुन्हा सुरू झाल्यावर आपोआप सिंक्रोनाइझ होतील.',
    badgeLocalQueueReady: 'स्थानिक रांग तयार',
    offlineSimNoticePrefix: 'फक्त UI सिम्युलेशन:',
    offlineSimNoticeDesc:
      'तुम्ही फील्ड ऑफलाईन सिम्युलेशन टूल चालवत आहात. पूर्ण झालेली तपासणी आणि स्थिती अपडेट्स कायमस्वरूपी ब्राउझर स्टोरेज (localStorage) मध्ये जतन केले जातात आणि पुन्हा कनेक्ट केल्यावर स्थानिक DEMO ईआरपी नोंदींसह आपोआप सिंक्रोनाइझ होतील.',

    // Real-time Field Connectivity & Auto-Sync
    statusOnlineLabel: 'ऑनलाईन (कनेक्ट केलेले)',
    statusOnlineDesc: 'नेटवर्क कनेक्टिव्हिटी सक्रिय · टेलिमेट्री ऑनलाईन',
    statusRealOfflineLabel: 'नेटवर्क ऑफलाईन',
    statusRealOfflineDesc: 'प्रत्यक्ष नेटवर्क अनुपलब्ध · कृती स्थानिक रांगेत जतन केल्या जातात',
    statusSimOfflineLabel: 'सिम्युलेटेड ऑफलाईन (डेमो)',
    statusSimOfflineDesc: 'डेमो सिम्युलेशन सक्रिय · कृती स्थानिक स्टोरेजमध्ये रांगेत',
    statusPendingSyncLabel: 'ऑटो-सिंक प्रलंबित',
    statusPendingSyncDesc: 'कनेक्टिव्हिटी उपलब्ध · रांगेतील कृती रीप्लेच्या प्रतीक्षेत',
    statusSyncingLabel: 'ऑटो-सिंक सुरू आहे...',
    statusSyncingDesc: 'सिंगल-फ्लाइट रीप्ले सुरू आहे · रांगेतील कृती लागू केल्या जात आहेत',
    statusSyncedDemoLabel: 'सिंक्रोनाइझ झाले (डेमो)',
    statusSyncedDemoDesc: 'सर्व रांगेतील कृती स्थानिक ईआरपी स्थितीत यशस्वीरित्या लागू झाल्या',
    statusSyncFailedLabel: 'सिंक अयशस्वी',
    statusSyncFailedDesc: '१ किंवा अधिक कृती अयशस्वी · ऑफलाईन रांगेत पुनरावलोकन करा',
    statusConflictDetectedLabel: 'विसंगती आढळली',
    statusConflictDetectedDesc: 'रीप्लेपूर्वी वर्क ऑर्डर बदलली · मॅन्युअल पुनरावलोकन आवश्यक',
    btnToggleSimOfflineEnable: 'ऑफलाईन सिम्युलेट करा',
    btnToggleSimOfflineDisable: 'सिम्युलेशन समाप्त करा',
    btnManualSyncNow: 'आता सिंक करा',
    badgeAutoSyncActive: 'ऑटो-सिंक सक्रिय',
    badgeAutoSyncReady: 'ऑटो-सिंक तयार',
    ariaConnectivityStatusPrefix: 'कनेक्टिव्हिटी स्थिती:',
    bannerRealOfflineTitle: 'नेटवर्क डिस्कनेक्ट झाले (प्रत्यक्ष ऑफलाईन)',
    bannerRealOfflineDesc: 'फील्ड तपासणी आणि वर्क ऑर्डर अपडेट स्थानिक स्टोरेजमध्ये जतन केले जातील आणि कनेक्टिव्हिटी पूर्ववत झाल्यावर आपोआप सिंक होतील.',
    bannerSimOfflineTitle: 'डेमो मोड: सिम्युलेटेड ऑफलाईन',
    bannerSimOfflineDesc: 'फील्ड कनेक्टिव्हिटी खंडित झाल्याचे सिम्युलेशन. कृती स्थानिक स्टोरेजमध्ये जतन केल्या आहेत आणि सिम्युलेशन संपल्यावर आपोआप सिंक होतील.',
    bannerPendingSyncTitle: 'ऑटो-रीप्ले प्रलंबित',
    bannerPendingSyncDesc: 'कनेक्टिव्हिटी उपलब्ध आहे. रांगेतील कृती स्वयंचलित स्थानिक रीप्लेसाठी तयार होत आहेत.',
    bannerSyncingTitle: 'ऑटो-सिंक सुरू आहे',
    bannerSyncingDesc: 'सिंगल-फ्लाइट सुरक्षेसह स्थानिक ईआरपी स्थितीत रांगेतील तपासणी आणि स्थिती कृती लागू केल्या जात आहेत...',
    bannerSyncSuccessTitle: 'DEMO सिंक्रोनाइझेशन पूर्ण झाले',
    bannerSyncSuccessDesc: 'सर्व रांगेतील कृती स्थानिक ईआरपी नोंदींमध्ये यशस्वीरित्या रीप्ले झाल्या.',
    btnReviewConflict: 'विसंगतीचे पुनरावलोकन करा',
    labelSafeActionPrefix: 'शिफारस केलेली सुरक्षित कृती:',
    badgeDemoIndicator: 'डेमो',
    labelCanonicalStatePrefix: 'ईआरपीमधील मूळ स्थिती:',
    noticeActionAlreadyApplied: 'सूचना: लक्षित वर्क ऑर्डर मुख्य ईआरपी प्रणालीमध्ये आधीच पूर्ण स्थितीत पोहोचला आहे.',
    btnViewRecordInDrawer: 'वर्क ऑर्डर पहा',

    hazardModalTitle: 'फील्ड फीडर / DTR धोक्याचा अहवाल द्या',
    hazardModalSubtitle: 'सब-डिव्हिजन आणि मॅनेजमेंट कॉकपिटला गंभीर ऑपरेशनल घटना प्रसारित करते',
    labelTargetFeederCorridor: 'लक्षित फीडर कॉरिडॉर *',
    labelDetectedHazardType: 'आढळलेला धोक्याचा प्रकार *',
    optionHazardTransformerOverheating: 'ट्रान्सफॉर्मर ओव्हरहीटिंग / थर्मल रनअवे',
    optionHazardFeederOverload: '11kV फीडर ओव्हरलोड / कंडक्टर झुकणे (Sagging)',
    optionHazardCriticalOutage: 'फीडर ट्रिपिंग / कंडक्टर तुटल्यामुळे वीज खंडित',
    labelHazardObservations: 'फील्ड निरीक्षणे आणि सुरक्षा धोक्याची नोंद *',
    defaultHazardRemarks: '100kVA वितरण ट्रान्सफॉर्मरवर उच्च थर्मल सिग्नेचर (>85°C) आणि ऑईल गळती आढळली.',
    btnCancel: 'रद्द करा',
    btnTransmitCriticalAlert: 'गंभीर इशारा पाठवा',

    kpiAssignedWorkOrders: 'आज नेमून दिलेले वर्क ऑर्डर्स',
    kpiAssignedWorkOrdersSub: '1 प्रगतीपथावर · 2 प्रलंबित साईट्स',
    kpiEmergencyCallouts: 'आपत्कालीन फॉल्ट कॉलआउट्स',
    kpiEmergencyActiveSuffix: 'सक्रिय',
    kpiEmergencySub: 'DT ओव्हरलोड तपासणी (WO-4403)',
    kpiCompletedInspections: 'पूर्ण झालेल्या तपासण्या',
    kpiCompletedInspectionsSub: 'सब-डिव्हिजनशी सिंक्रनाइझ केलेले',
    sectionAssignedIncidents: 'नेमून दिलेल्या फील्ड घटना आणि प्राधान्य कॉलआउट्स',
    badgeTargetedDispatch: 'लक्षित डिस्पॅच',
    btnReviewAssignment: 'नेमणुकीचे पुनरावलोकन करा',
    btnAcknowledge: 'स्वीकारा (Acknowledge)',
    btnInspectFeederTelemetry: 'फीडर टेलीमेट्री तपासा →',
    labelFeederAsset: 'फीडर/मालमत्ता:',
    labelSubdivision: 'सब-डिव्हिजन:',
    labelAssignedTime: 'नेमून दिलेली वेळ:',
    labelNotes: 'नोंदी:',
    sectionTodaysItinerary: 'आजचे फील्ड वेळापत्रक आणि कार्ये',
    btnViewAllWorkOrders: 'सर्व वर्क ऑर्डर्स पहा →',
    tooltipViewSourceComplaint: 'ड्रॉवरमध्ये मूळ तक्रार पहा',
    tooltipViewSourceApplication: 'ड्रॉवरमध्ये मूळ जोडणी अर्ज पहा',
    labelRefPrefix: 'संदर्भ:',
    labelFeederPrefix: 'फीडर:',
    labelScheduledPrefix: 'नियोजित:',
    labelStatusPrefix: 'स्थिती:',
    btnDetails: 'तपशील',
    btnPerformInspection: 'तपासणी करा',

    headingAssignedWorkOrders: 'नेमून दिलेले वर्क ऑर्डर्स',
    subtitleAssignedWorkOrders: 'तपासणी कार्ये, फॉल्ट कॉलआउट्स आणि मीटर बदलण्याची कामे',
    labelTypePrefix: 'प्रकार:',
    labelLocationPrefix: 'ठिकाण:',
    btnEnterInspectionFindings: 'तपासणी निष्कर्ष नोंदवा',
    badgeCompleted: 'पूर्ण झाले',
    labelInspectionFindingsRecorded: 'नोंदवलेले तपासणी निष्कर्ष:',
    labelMeterSerialPrefix: 'मीटर सिरीयल:',
    labelReadingPrefix: 'रीडिंग:',
    labelVoltagePrefix: 'व्होल्टेज:',
    labelRemarksPrefix: 'शेरा:',

    headingSiteInspectionReport: 'फील्ड साईट तपासणी आणि व्यवहार्यता अहवाल',
    labelTaskPrefix: 'कार्य:',
    defaultInspectionTaskFallback: 'WO-4401 (CMP-8821 दुरुस्ती)',
    labelScannedMeterSerial: 'स्कॅन केलेला मीटर सिरीयल / बारकोड *',
    labelVerifiedMeterReading: 'पडताळलेले मीटर रीडिंग (kWh) *',
    labelOpticalSealStatus: 'होलोग्राफिक ऑप्टिकल सील स्थिती',
    optionSealIntactVerified: 'सील अखंड आणि पडताळलेले',
    optionSealBrokenSuspicious: 'सील तुटलेले / संशयास्पद',
    labelTerminalBlockCondition: 'टर्मिनल ब्लॉकची स्थिती',
    optionTerminalNormal: 'सामान्य स्थिती',
    optionTerminalBurnt: 'जळालेले / फ्लॅशओव्हरच्या खुणा',
    optionTerminalLooseNeutral: 'सैल न्यूट्रल कनेक्शन',
    labelTestedPhaseVoltages: 'तपासलेले फेज व्होल्टेज (Volts AC)',
    labelRPhase: 'R-फेज',
    labelYPhase: 'Y-फेज',
    labelBPhase: 'B-फेज',
    labelSitePhotoEvidence: 'साईट फोटो पुरावा (मोबाईल कॅमेरा प्रिव्ह्यू)',
    labelGpsGeotag: 'GPS जिओटॅग:',
    badgeGeotagVerified: 'जिओटॅग टाईमस्टॅम्प पडताळलेला',
    labelTechnicianObservations: 'तंत्रज्ञ निरीक्षणे आणि दुरुस्ती शेरा *',
    defaultTechnicianRemarks: 'DP-14 येथील न्यूट्रल टर्मिनलची तपासणी केली आणि ऑक्सिडाइज्ड ॲल्युमिनियम क्रिम्प बदलले.',
    btnSignTransmitReport: 'स्वाक्षरी करा आणि तपासणी अहवाल पाठवा',

    headingOfflineQueue: 'सिम्युलेटेड ऑफलाईन रांग स्थिती',
    subtitleOfflineQueue: 'अधूनमधून मोबाईल नेटवर्क कव्हरेज असलेल्या भागांसाठी स्थानिक फील्ड बफर',
    btnSimulateSyncNow: 'आता सिंक सिम्युलेट करा',
    offlineItem1Title: 'WO-4398 स्मार्ट मीटर सील',
    offlineItem1Desc: 'सेक्टर 4/B · पॉलीकार्बोनेट सील #UGVCL-882191 लावले',
    badgeSyncedToServer: 'सर्व्हरशी सिंक झाले',
    offlineItem2Title: 'WO-4401 व्होल्टेज दुरुस्ती',
    offlineItem2Desc: '14 आनंद नगर · न्यूट्रल क्रिम्प केले, 232V तपासले',
    badgePendingBackgroundPush: 'बॅकग्राउंड पुश प्रलंबित',
    offlineQueuePendingCountBadge: 'रिप्ले प्रलंबित',
    offlineQueueTotalItemsLabel: 'एकूण रांगेतील कृती:',
    offlineQueueActionInspection: 'साईट तपासणी सादरीकरण',
    offlineQueueActionStatusUpdate: 'वर्क ऑर्डर स्थिती बदल',
    queueStatusPending: 'रिप्ले प्रलंबित',
    queueStatusProcessing: 'रिप्ले सुरू आहे',
    queueStatusCompleted: 'रिप्ले पूर्ण (DEMO स्टेट)',
    queueStatusFailed: 'रिप्ले अयशस्वी / विसंगती',
    emptyOfflineQueueTitle: 'रांगेत कोणतीही ऑफलाईन कृती नाही',
    emptyOfflineQueueDesc:
      'स्थानिक रांगेत कृती जतन करण्यासाठी सिम्युलेटेड ऑफलाईन मोड सक्षम करा आणि साईट तपासणी सादर करा किंवा वर्क ऑर्डर स्थिती अद्ययावत करा.',
    labelClientUuidPrefix: 'क्लायंट UUID:',
    labelQueuedAtPrefix: 'रांग वेळ:',
    labelReplayedAtPrefix: 'रिप्ले वेळ:',
    labelTransitionPrefix: 'स्थिती बदल:',
    btnRetryQueueItem: 'पुन्हा प्रयत्न करा',
    offlineDemoDisclaimer:
      'DEMO मोड स्टोरेज: रांगेतील कृती localStorage (vidyutflow_field_offline_queue) मध्ये जतन केल्या जातात आणि ऑनलाईन मोड पूर्ववत झाल्यावर स्थानिक ERP स्टेटमध्ये रिप्ले होतात. थेट सर्व्हर सिंकसाठी बॅकएंड एकत्रीकरण आवश्यक आहे.',
    badgeOfflineQueuedOnWo: 'ऑफलाईन कृती रांगेत',

    headingFeederPatrol: '11kV फीडर पेट्रोलिंग आणि लाईन कॉरिडॉर निरीक्षण',
    subtitleFeederPatrol: 'उत्तर गुजरात सब-डिव्हिजनमधील वितरण फीडर लोडिंग, ट्रान्सफॉर्मर क्लस्टर्स आणि सक्रिय फील्ड कार्ये',
    btnViewAssignedWorkOrdersArrow: 'नेमून दिलेले वर्क ऑर्डर्स पहा →',
    summaryMonitoredFeeders: 'निरीक्षणाखालील 11kV फीडर्स',
    summaryMonitoredFeedersSub: 'महेसाणा आणि गांधीनगर सर्कल',
    summaryFeedersAttention: 'लक्ष देण्याची गरज असलेले फीडर्स',
    summaryFeedersAttentionSub: '1 गंभीर ओव्हरलोड · 1 उच्च लोड इशारा',
    summaryOpenFieldWorkOrders: 'खुले फील्ड वर्क ऑर्डर्स',
    summaryOpenFieldWorkOrdersSub: '11kV कॉरिडॉरवर नियोजित',
    labelConductorLoadUtilization: 'कंडक्टर लोड वापर',
    labelPeakLoad: 'कमाल लोड (Peak Load)',
    labelTransformers: 'ट्रान्सफॉर्मर्स',
    unitDts: 'DTs',
    labelConsumers: 'ग्राहक',
    labelLinkedWorkOrder: 'संलग्न वर्क ऑर्डर:',
    noOpenFaultCalloutsOnFeeder: 'या फीडरवर कोणतेही खुले फॉल्ट कॉलआउट्स नाहीत',
    btnInspectFeederPrefix: 'तपासणी करा:',
    btnLogPatrolCheck: 'पेट्रोलिंग तपासणी नोंदवा',
    emptyFeederRecordsTitle: 'कोणतेही फीडर पेट्रोलिंग रेकॉर्ड उपलब्ध नाहीत',
    emptyFeederRecordsDesc: 'फील्ड कन्सोलमध्ये सध्या कोणतेही 11kV फीडर टेलीमेट्री रेकॉर्ड लोड केलेले नाहीत.',

    headingCompletedJobs: 'पूर्ण झालेली कामे आणि तपासणी इतिहास',
    subtitleCompletedJobs: 'बंद केलेले फील्ड वर्क ऑर्डर्स आणि सादर केलेले तांत्रिक तपासणी अहवाल',
    badgeCompletedJobsCountSuffix: 'पूर्ण झालेली कामे',
    btnAllWorkOrders: 'सर्व वर्क ऑर्डर्स',
    btnViewCaseFile: 'केस फाईल पहा',
    labelRecordedInspectionReport: 'नोंदवलेला साईट तपासणी अहवाल',
    labelEngineerPrefix: 'अभियंता:',
    labelScannedMeterSerialShort: 'स्कॅन केलेला मीटर सिरीयल',
    labelVerifiedReadingShort: 'पडताळलेले रीडिंग',
    labelSealAndTerminal: 'सील आणि टर्मिनल',
    labelPhaseVoltagesShort: 'फेज व्होल्टेज (R/Y/B)',
    fallbackWorkOrderCompletedPrefix: 'वर्क ऑर्डर पूर्ण म्हणून चिन्हांकित (',
    fallbackWorkOrderCompletedSuffix: ').',
    emptyCompletedJobsTitle: 'अद्याप कोणतेही पूर्ण झालेले वर्क ऑर्डर्स नाहीत',
    emptyCompletedJobsDesc: 'पूर्ण झालेल्या फील्ड तपासण्या आणि फॉल्ट दुरुस्त्या सादर केल्यानंतर येथे दिसतील.',
    btnViewAssignedWorkOrdersPlain: 'नेमून दिलेले वर्क ऑर्डर्स पहा',

    modalFieldDispatchControlsPrefix: 'साठी फील्ड डिस्पॅच नियंत्रणे:',
    modalFieldDispatchControlsDesc:
      'येथे निर्णय कार्यान्वित केल्याने मूळ ऑपरेशन्स कर्मचाऱ्यास थेट सूचित केले जाते आणि अधिकृत घटना स्थिती सिंक्रनाइझ होते.',
    modalStep1Acceptance: 'पायरी 1: नेमणूक स्वीकृती',
    modalBtnAcceptMobilize: 'नेमणूक स्वीकारा आणि साईटवर रवाना व्हा',
    modalBtnDeclineAssignment: 'नेमणूक नाकारा',
    modalLabelDeclineReason: 'नाकारण्याचे अनिवार्य कारण *',
    modalPlaceholderDeclineReason:
      'तांत्रिक कारण सांगा (उदा., सध्या 33kV सबस्टेशन फीडर फॉल्टवर आयसोलेटेड; कृपया ऑन-कॉल अभियंता FLD-UG-204 कडे वर्ग करा)...',
    modalBtnConfirmDecline: 'नकाराची पुष्टी करा (कर्मचाऱ्यास सूचित करा)',
    modalStep2InspectionFindings: 'पायरी 2: प्रत्यक्ष साईट तपासणी आणि निष्कर्ष',
    modalBtnStartOnSiteInspection: 'प्रत्यक्ष साईटवर भौतिक तपासणी सुरू करा',
    modalInspectionCommencedPrefix: 'तपासणी सुरू झाल्याची वेळ:',
    modalLabelRecordTechnicalFindings: 'तांत्रिक निष्कर्ष आणि मोजलेले रीडिंग्ज नोंदवा *',
    modalPlaceholderTechnicalFindings:
      'उदा. ट्रान्सफॉर्मर टॉप ऑईलचे तापमान 88C मोजले गेले. न्यूट्रल बुशिंग क्रिम्प ऑक्सिडाइज झालेले. ॲल्युमिनियम लग बाय-मेटालिक क्रिम्प स्लीव्हने बदलले.',
    modalBtnTransmitFindings: 'ऑपरेशन्स डेस्कला निष्कर्ष पाठवा',
    modalLabelRequestAdditionalCrew: 'अतिरिक्त पथक किंवा जड उपकरणांची विनंती करा',
    modalPlaceholderAssistanceNote:
      'उदा. कॉरिडॉरवर हाय-टेन्शन झाडांच्या फांद्या छाटण्यासाठी बकेट ट्रक / क्रेन पथकाची आवश्यकता आहे.',
    modalBtnRequestSpecializedAssistance: 'विशेष मदतीची विनंती करा',
    modalHeadingSubmitFinalResolution: 'अंतिम निवारण अहवाल सादर करा आणि फॉल्ट क्लिअर करा',
    modalDescSubmitFinalResolution:
      'हा अहवाल दाखल केल्याने साईटवरील विद्युत फॉल्टचे निराकरण होते आणि कर्मचारी ऑपरेशन्स डेस्कला सूचित केले जाते. (फिक्स 6 नुसार व्यवस्थापन भांडवली मंजुरीपेक्षा वेगळे).',
    modalPlaceholderResolutionSummary:
      'सविस्तर निवारण सारांश: इन्सुलेशन रेझिस्टन्सची चाचणी केली (IR > 50 Mega-ohms). सामान्य लोडखाली लाईन कार्यान्वित केली. फीडर निर्धारित मानकांमध्ये कार्यरत आहे.',
    modalBtnSubmitResolutionClearFault: 'निवारण अहवाल सादर करा आणि फॉल्ट क्लिअर करा',
    modalIncidentAlreadyResolvedTitle: 'ही घटना आधीच निराकरण (RESOLVED) म्हणून चिन्हांकित केली आहे.',
    modalIncidentAlreadyResolvedDesc: 'निवारणाचे तपशील अधिकृत ऑडिट ट्रेलमध्ये जतन केले आहेत.',

    modalMgmtConcurrenceTitle: 'कार्यकारी सहमती आणि एस्केलेशन प्राधिकरण',
    modalMgmtConcurrenceDesc:
      'ऑपरेशन्स एस्केलेशन समर्थनाचे पुनरावलोकन करा. मंजूर केल्याने अपडताळित विद्युत फॉल्ट अकाली निराकरण झालेले मानल्याशिवाय कार्यकारी सहमती मिळते.',
    modalMgmtDecisionHeading: 'कार्यकारी सहमती निर्णय',
    modalMgmtRemarksLabel: 'कार्यकारी सहमती शेरा (पर्यायी)',
    modalMgmtRemarksPlaceholder:
      'उदा. सहाय्यक फीडर बस स्वॅपसाठी सहमती दिली. भांडवली ट्रान्सफॉर्मर क्षमता वाढीस मंजुरी.',
    modalMgmtApproveBtn: 'एस्केलेशन मंजूर करा (ग्रीन नोटीस)',
    modalMgmtRejectBtn: 'एस्केलेशन नाकारा',
    modalMgmtMoreInfoBtn: 'अधिक माहिती मागवा',
    modalMgmtMandatoryRejectLabel: 'नाकारण्याचे अनिवार्य समर्थन *',
    modalMgmtMandatoryRejectPlaceholder:
      'कार्यकारी कारण सांगा (उदा., फीडर लोड डेटा दर्शवतो की पीक <15 मिनिटांसाठी असतो; भांडवली ट्रान्सफॉर्मर वाढीची विनंती करण्यापूर्वी सब-डिव्हिजन कॅपेसिटर बँक स्विचिंग सुरू करा)...',
    modalMgmtConfirmRejectBtn: 'नकाराची पुष्टी करा (कर्मचाऱ्यास रेड नोटीस)',
    modalMgmtClarificationLabel: 'आवश्यक विशिष्ट स्पष्टीकरण / प्रश्न *',
    modalMgmtClarificationPlaceholder:
      'उदा. कार्यकारी सहमतीपूर्वी कृपया 24-तास SCADA थर्मल लॉग आणि पुष्टी केलेले DGA ऑईल चाचणी निकाल सादर करा.',
    modalMgmtSendInfoRequestBtn: 'माहिती विनंती पाठवा (अॅम्बर नोटीस)',
    modalMgmtDecisionRecordedPrefix: 'कार्यकारी निर्णय आधीच नोंदवला आहे:',
    modalMgmtByPrefix: 'द्वारे:',
    modalMgmtOnPrefix: 'दिनांक:',
  },
};

export function localizeFeederName(name: string, lang: Language): string {
  if (!name || lang === 'en') return name;
  const trimmed = name.trim();
  const map: Record<string, Record<Language, string>> = {
    '11kV Visnagar Road Feeder': {
      en: '11kV Visnagar Road Feeder',
      gu: '11kV વિસનગર રોડ ફીડર',
      hi: '11kV विसनगर रोड फीडर',
      mr: '11kV विसनगर रोड फीडर',
    },
    '11kV GIDC-2 Dedicated Feeder': {
      en: '11kV GIDC-2 Dedicated Feeder',
      gu: '11kV GIDC-2 સમર્પિત ફીડર',
      hi: '11kV GIDC-2 समर्पित फीडर',
      mr: '11kV GIDC-2 समर्पित फीडर',
    },
    '11kV Kadi-Rural Ag Feeder (Jyotigram)': {
      en: '11kV Kadi-Rural Ag Feeder (Jyotigram)',
      gu: '11kV કડી-ગ્રામ્ય કૃષિ ફીડર (જ્યોતિગ્રામ)',
      hi: '11kV कडी-ग्रामीण कृषि फीडर (ज्योतिग्राम)',
      mr: '11kV कडी-ग्रामीण कृषी फीडर (ज्योतिग्राम)',
    },
    '11kV Kadi-Rural Ag Feeder': {
      en: '11kV Kadi-Rural Ag Feeder',
      gu: '11kV કડી-ગ્રામ્ય કૃષિ ફીડર',
      hi: '11kV कडी-ग्रामीण कृषि फीडर',
      mr: '11kV कडी-ग्रामीण कृषी फीडर',
    },
    '11kV Gandhinagar City-1 Feeder': {
      en: '11kV Gandhinagar City-1 Feeder',
      gu: '11kV ગાંધીનગર સિટી-1 ફીડર',
      hi: '11kV गांधीनगर सिटी-1 फीडर',
      mr: '11kV गांधीनगर सिटी-1 फीडर',
    },
    '11kV City-1 Feeder': {
      en: '11kV City-1 Feeder',
      gu: '11kV સિટી-1 ફીડર',
      hi: '11kV सिटी-1 फीडर',
      mr: '11kV सिटी-1 फीडर',
    },
    'Local Feeder': {
      en: 'Local Feeder',
      gu: 'સ્થાનિક ફીડર',
      hi: 'स्थानीय फीडर',
      mr: 'स्थानिक फीडर',
    },
  };
  return map[trimmed]?.[lang] ?? name;
}

export function localizeFeederStatus(status: string, lang: Language): string {
  if (!status || lang === 'en') return status;
  const map: Record<string, Record<Language, string>> = {
    Optimal: {
      en: 'Optimal',
      gu: 'સામાન્ય (Optimal)',
      hi: 'सामान्य (Optimal)',
      mr: 'सामान्य (Optimal)',
    },
    Warning: {
      en: 'Warning',
      gu: 'ચેતવણી (Warning)',
      hi: 'चेतावनी (Warning)',
      mr: 'इशारा (Warning)',
    },
    'Critical Overload': {
      en: 'Critical Overload',
      gu: 'ગંભીર ઓવરલોડ',
      hi: 'गंभीर ओवरलोड',
      mr: 'गंभीर ओव्हरलोड',
    },
  };
  return map[status.trim()]?.[lang] ?? status;
}

export function localizeTerminalCondition(cond: string, lang: Language): string {
  if (!cond || lang === 'en') return cond;
  const map: Record<string, Record<Language, string>> = {
    Normal: {
      en: 'Normal',
      gu: 'સામાન્ય',
      hi: 'सामान्य',
      mr: 'सामान्य',
    },
    Burnt: {
      en: 'Burnt',
      gu: 'બળી ગયેલ',
      hi: 'जला हुआ',
      mr: 'जळालेले',
    },
    Loose: {
      en: 'Loose',
      gu: 'ઢીલું જોડાણ',
      hi: 'ढीला कनेक्शन',
      mr: 'सैल कनेक्शन',
    },
  };
  return map[cond.trim()]?.[lang] ?? cond;
}

export function localizeSealStatus(sealIntact: boolean, lang: Language): string {
  if (lang === 'en') return sealIntact ? 'Seal Intact' : 'Seal Broken';
  if (sealIntact) {
    return {
      en: 'Seal Intact',
      gu: 'સીલ અકબંધ',
      hi: 'सील सुरक्षित',
      mr: 'सील अखंड',
    }[lang];
  }
  return {
    en: 'Seal Broken',
    gu: 'સીલ તૂટેલ',
    hi: 'सील टूटी हुई',
    mr: 'सील तुटलेले',
  }[lang];
}

export function localizeFieldTechnicianRemarks(remarks: string, lang: Language): string {
  if (!remarks || lang === 'en') return remarks;
  const trimmed = remarks.trim();

  const exactMap: Record<string, Record<Language, string>> = {
    'Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.': {
      en: 'Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.',
      gu: 'DP-14 ખાતે ન્યુટ્રલ ટર્મિનલનું નિરીક્ષણ કર્યું અને ઓક્સિડાઇઝ્ડ એલ્યુમિનિયમ ક્રિમ્પ બદલ્યું.',
      hi: 'DP-14 पर न्यूट्रल टर्मिनल का निरीक्षण किया और ऑक्सीकृत एल्यूमीनियम क्रिम्प को बदला।',
      mr: 'DP-14 येथील न्यूट्रल टर्मिनलची तपासणी केली आणि ऑक्सिडाइज्ड ॲल्युमिनियम क्रिम्प बदलले.',
    },
    'Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.': {
      en: 'Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.',
      gu: '100kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર પર ઉચ્ચ થર્મલ સિગ્નેચર (>85°C) અને ઓઇલ લીકેજ જોવા મળ્યું.',
      hi: '100kVA वितरण ट्रांसफॉर्मर पर उच्च थર્મल सिग्नेचर (>85°C) और तेल रिसाव देखा गया।',
      mr: '100kVA वितरण ट्रान्सफॉर्मरवर उच्च थર્મल सिग्नेचर (>85°C) आणि ऑईल गळती आढळली.',
    },
    'Inspected neutral crimp and restored phase balance.': {
      en: 'Inspected neutral crimp and restored phase balance.',
      gu: 'ન્યુટ્રલ ક્રિમ્પનું નિરીક્ષણ કર્યું અને ફેઝ સંતુલન પૂર્વવત્ કર્યું.',
      hi: 'न्यूट्रल क्रिम्प का निरीक्षण किया और फेज संतुलन बहाल किया।',
      mr: 'न्यूट्रल क्रिम्पची तपासणी केली आणि फेज संतुलन पूर्ववत केले.',
    },
    'Existing 1-Phase L&T meter replaced with 3-Phase Smart AMR Meter. Optical seal #UGVCL-882191 affixed.': {
      en: 'Existing 1-Phase L&T meter replaced with 3-Phase Smart AMR Meter. Optical seal #UGVCL-882191 affixed.',
      gu: 'હાલના 1-ફેઝ L&T મીટરને બદલે 3-ફેઝ સ્માર્ટ AMR મીટર લગાવ્યું. ઓપ્ટિકલ સીલ #UGVCL-882191 લગાવી.',
      hi: 'मौजूदा 1-फेज L&T मीटर को 3-फेज स्मार्ट AMR मीटर से बदला गया। ऑप्टिकल सील #UGVCL-882191 लगाई गई।',
      mr: 'सध्याच्या 1-फेज L&T मीटरऐवजी 3-फेज स्मार्ट AMR मीटर बसवले. ऑप्टिकल सील #UGVCL-882191 लावले.',
    },
    'Affixed polycarbonate security seal #UGVCL-882191, tested phase voltages, and verified 4G AMR optical handshake.': {
      en: 'Affixed polycarbonate security seal #UGVCL-882191, tested phase voltages, and verified 4G AMR optical handshake.',
      gu: 'પોલીકાર્બોનેટ સુરક્ષા સીલ #UGVCL-882191 લગાવી, ફેઝ વોલ્ટેજ ચકાસ્યા અને 4G AMR ઓપ્ટિકલ હેન્ડશેકની પુષ્ટિ કરી.',
      hi: 'पॉलीकार्बोनेट सुरक्षा सील #UGVCL-882191 लगाई, फेज वोल्टेज का परीक्षण किया और 4G AMR ऑप्टिकल हैंडशेक सत्यापित किया।',
      mr: 'पॉलीकार्बोनेट सुरक्षा सील #UGVCL-882191 लावले, फेज व्होल्टेज तपासले आणि 4G AMR ऑप्टिकल हँडशेक पडताळले.',
    },
    'Old electromechanical meter replaced with 4G AMR Smart Meter. Seal numbers #UGVCL-882191 and #UGVCL-882192 affixed.': {
      en: 'Old electromechanical meter replaced with 4G AMR Smart Meter. Seal numbers #UGVCL-882191 and #UGVCL-882192 affixed.',
      gu: 'જૂના ઇલેક્ટ્રોમિકેનિકલ મીટરને બદલે 4G AMR સ્માર્ટ મીટર લગાવ્યું. સીલ નંબર #UGVCL-882191 અને #UGVCL-882192 લગાવી.',
      hi: 'पुराने इलेक्ट्रोमैकेनिकल मीटर को 4G AMR स्मार्ट मीटर से बदला गया। सील नंबर #UGVCL-882191 और #UGVCL-882192 लगाए गए।',
      mr: 'जुन्या इलेक्ट्रोमेकॅनिकल मीटरऐवजी 4G AMR स्मार्ट मीटर बसवले. सील क्रमांक #UGVCL-882191 आणि #UGVCL-882192 लावले.',
    },
  };

  if (exactMap[trimmed]?.[lang]) {
    return exactMap[trimmed][lang];
  }

  return remarks;
}

export function localizeOfflineQueueFailureReason(
  reason: string | undefined,
  lang: Language
): string {
  if (!reason || lang === 'en') return reason || '';
  const trimmed = reason.trim();

  // Conflict: Work Order WO-4401 status changed from "On Site" to "Completed" before replay.
  const statusChangedMatch = trimmed.match(
    /^Conflict: Work Order ([A-Z0-9-]+) status changed from "([^"]+)" to "([^"]+)" before replay\.$/i
  );
  if (statusChangedMatch) {
    const [, woId, fromSt, toSt] = statusChangedMatch;
    return {
      en: trimmed,
      gu: `વિરોધાભાસ: રિપ્લે પહેલાં વર્ક ઓર્ડર ${woId} ની સ્થિતિ "${fromSt}" માંથી બદલાઈને "${toSt}" થઈ ગઈ છે.`,
      hi: `टकराव: रिप्ले से पहले वर्क ऑर्डर ${woId} की स्थिति "${fromSt}" से बदलकर "${toSt}" हो गई है।`,
      mr: `विसंगती: रिप्ले करण्यापूर्वी वर्क ऑर्डर ${woId} ची स्थिती "${fromSt}" वरून "${toSt}" अशी बदलली आहे.`,
    }[lang];
  }

  // Conflict: Work Order WO-4401 is already "Completed" in canonical ERP state.
  const alreadyTerminalMatch = trimmed.match(
    /^Conflict: Work Order ([A-Z0-9-]+) is already "([^"]+)" in canonical ERP state\.$/i
  );
  if (alreadyTerminalMatch) {
    const [, woId, st] = alreadyTerminalMatch;
    return {
      en: trimmed,
      gu: `વિરોધાભાસ: વર્ક ઓર્ડર ${woId} પહેલેથી જ સત્તાવાર ERP સ્ટેટમાં "${st}" સ્થિતિમાં છે.`,
      hi: `टकराव: वर्क ऑर्डर ${woId} आधिकारिक ERP स्टेट में पहले से ही "${st}" स्थिति में है।`,
      mr: `विसंगती: वर्क ऑर्डर ${woId} अधिकृत ERP स्टेटमध्ये आधीच "${st}" स्थितीत आहे.`,
    }[lang];
  }

  // Conflict: Work Order WO-4401 was modified by another operation before offline replay.
  const modifiedOtherMatch = trimmed.match(
    /^Conflict: Work Order ([A-Z0-9-]+) was modified by another operation before offline replay\.$/i
  );
  if (modifiedOtherMatch) {
    const [, woId] = modifiedOtherMatch;
    return {
      en: trimmed,
      gu: `વિરોધાભાસ: ઓફલાઇન રિપ્લે પહેલાં અન્ય કામગીરી દ્વારા વર્ક ઓર્ડર ${woId} માં ફેરફાર કરવામાં આવ્યો હતો.`,
      hi: `टकराव: ऑफलाइन रिप्ले से पहले किसी अन्य प्रक्रिया द्वारा वर्क ऑर्डर ${woId} को संशोधित किया गया था।`,
      mr: `विसंगती: ऑफलाईन रिप्ले करण्यापूर्वी दुसऱ्या प्रक्रियेद्वारे वर्क ऑर्डर ${woId} मध्ये बदल करण्यात आला होता.`,
    }[lang];
  }

  // Conflict: Work Order WO-4401 is already in "On Site" status.
  const alreadyInStatusMatch = trimmed.match(
    /^Conflict: Work Order ([A-Z0-9-]+) is already in "([^"]+)" status\.$/i
  );
  if (alreadyInStatusMatch) {
    const [, woId, st] = alreadyInStatusMatch;
    return {
      en: trimmed,
      gu: `વિરોધાભાસ: વર્ક ઓર્ડર ${woId} પહેલેથી જ "${st}" સ્થિતિમાં છે.`,
      hi: `टकराव: वर्क ऑर्डर ${woId} पहले से ही "${st}" स्थिति में है।`,
      mr: `विसंगती: वर्क ऑर्डर ${woId} आधीच "${st}" स्थितीत आहे.`,
    }[lang];
  }

  // Invalid progression from "Pending" to "On Site".
  const invalidProgressionMatch = trimmed.match(
    /^Invalid progression from "([^"]+)" to "([^"]+)"\.$/i
  );
  if (invalidProgressionMatch) {
    const [, fromSt, toSt] = invalidProgressionMatch;
    return {
      en: trimmed,
      gu: `"${fromSt}" માંથી "${toSt}" તરફ અમાન્ય સ્થિતિ પરિવર્તન.`,
      hi: `"${fromSt}" से "${toSt}" में अमान्य स्थिति परिवर्तन।`,
      mr: `"${fromSt}" वरून "${toSt}" कडे अवैध स्थिती बदल.`,
    }[lang];
  }

  // Replay interrupted by browser reload — verify work order state before retrying.
  if (
    trimmed === 'Replay interrupted by browser reload — verify work order state before retrying.'
  ) {
    return {
      en: trimmed,
      gu: 'બ્રાઉઝર રીલોડ થવાને કારણે રિપ્લે અટકી ગયું — ફરી પ્રયાસ કરતા પહેલા વર્ક ઓર્ડરની સ્થિતિ ચકાસો.',
      hi: 'ब्राउज़र रीलोड के कारण रिप्ले बाधित हुआ — पुनः प्रयास करने से पहले वर्क ऑर्डर की स्थिति जांचें।',
      mr: 'ब्राउझर रीलोड झाल्यामुळे रिप्ले खंडित झाले — पुन्हा प्रयत्न करण्यापूर्वी वर्क ऑर्डरची स्थिती तपासा.',
    }[lang];
  }

  return reason;
}

/**
 * Provides actionable, localized guidance for queued actions that encountered
 * conflicts or validation failures during synchronization.
 */
export function resolveOfflineQueueSafeAction(
  item: FieldOfflineQueueItem,
  lang: Language
): string {
  const reason = item.failureReason || '';
  if (reason.includes('already "Completed"') || reason.includes('already "Deferred"')) {
    return {
      en: 'Safe Action: Work order is already finalized in canonical records. No further field update required.',
      gu: 'સુરક્ષિત પગલું: વર્ક ઓર્ડર મૂળ રેકોર્ડમાં પહેલેથી જ પૂર્ણ છે. હવે આગળ કોઈ ફિલ્ડ અપડેટની જરૂર નથી.',
      hi: 'सुरक्षित कार्रवाई: वर्क ऑर्डर मुख्य रिकॉर्ड में पहले से ही अंतिम रूप ले चुका है। आगे किसी फील्ड अपडेट की आवश्यकता नहीं है।',
      mr: 'सुरक्षित कृती: वर्क ऑर्डर मूळ नोंदींमध्ये आधीच अंतिम झाला आहे. पुढील फील्ड अपडेटची आवश्यकता नाही.',
    }[lang];
  }
  if (reason.includes('status changed from') || reason.includes('Invalid progression')) {
    return {
      en: 'Safe Action: Verify current work order stage in Assigned Work Orders or submit a verified Site Inspection report.',
      gu: 'સુરક્ષિત પગલું: અસાઇન કરેલ વર્ક ઓર્ડર્સમાં વર્તમાન તબક્કો ચકાસો અથવા સત્તાવાર સાઇટ નિરીક્ષણ અહેવાલ સબમિટ કરો.',
      hi: 'सुरक्षित कार्रवाई: असाइन किए गए वर्क ऑर्डर्स में वर्तमान चरण सत्यापित करें या सत्यापित साइट निरीक्षण रिपोर्ट सबमिट करें।',
      mr: 'सुरक्षित कृती: नियुक्त केलेल्या वर्क ऑर्डर्समध्ये वर्तमान टप्पा तपासा किंवा सत्यापित साइट तपासणी अहवाल सबमिट करा.',
    }[lang];
  }
  return {
    en: 'Safe Action: Review canonical record in Assigned Work Orders before retrying synchronization.',
    gu: 'સુરક્ષિત પગલું: સિંક્રોનાઇઝેશનનો પુનઃ પ્રયાસ કરતા પહેલા અસાઇન કરેલ વર્ક ઓર્ડર્સમાં મૂળ રેકોર્ડ ચકાસો.',
    hi: 'सुरक्षित कार्रवाई: सिंक्रोनाइज़ेशन का पुनः प्रयास करने से पहले असाइन किए गए वर्क ऑर्डर्स में मुख्य रिकॉर्ड जांचें।',
    mr: 'सुरक्षित कृती: सिंक्रोनाइझेशनचा पुन्हा प्रयत्न करण्यापूर्वी नियुक्त केलेल्या वर्क ऑर्डर्समधील मूळ नोंद तपासा.',
  }[lang];
}

