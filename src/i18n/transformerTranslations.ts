import type { LanguageCode } from './types';

export interface TransformerPhase12Dictionary {
  // Employee Cockpit
  cockpitTitle: string;
  cockpitSubtitle: string;
  statTotalDtrs: string;
  statCriticalAlerts: string;
  statOverloaded: string;
  statAvgHealthIndex: string;
  sseStreaming: string;
  sseReconnecting: string;
  sseOffline: string;
  searchPlaceholder: string;
  filterAllStatuses: string;
  colCode: string;
  colName: string;
  colCapacity: string;
  colPeakLoad: string;
  colOilTemp: string;
  colHealthIndex: string;
  colRiskTier: string;
  colStatus: string;
  colActions: string;
  btnViewTelemetry: string;
  btnDossier: string;
  modalDossierTitle: string;
  chartLoadTitle: string;
  chartTempTitle: string;
  predictiveRiskHeader: string;
  riskTierLow: string;
  riskTierMedium: string;
  riskTierHigh: string;
  riskTierSevere: string;
  actionAcknowledge: string;
  actionDispatchWo: string;
  actionScheduleInspection: string;

  // Field Inspections
  fieldTitle: string;
  fieldSubtitle: string;
  statAssigned: string;
  statPending: string;
  statCompletedToday: string;
  statSyncQueue: string;
  btnSyncNow: string;
  btnSyncing: string;
  syncAllSynced: string;
  checkOilLevel: string;
  checkBushing: string;
  checkSilicaGel: string;
  checkEarthResistance: string;
  checkCorrosion: string;
  checkHumming: string;
  lblSelectTransformer: string;
  lblOilLevel: string;
  lblOilLevelNormal: string;
  lblOilLevelLow: string;
  lblOilLevelCritical: string;
  lblOilTemp: string;
  lblWindingTemp: string;
  lblPhysicalNotes: string;
  lblPhotoEvidence: string;
  btnCapturePhoto: string;
  lblGpsLocation: string;
  btnAcquireGps: string;
  btnSubmitInspection: string;

  // Management Executive Cockpit
  mgmtTitle: string;
  mgmtSubtitle: string;
  kpiFleetHealthIndex: string;
  kpiActiveFleet: string;
  kpiHighRiskCount: string;
  kpiTelemetryAlarms24h: string;
  chartSubdivisionHealth: string;
  chartRiskTiering: string;
  tblHighestRiskTitle: string;
  tblColSubdivision: string;
  tblColRiskScore: string;
  tblColDriver: string;
  tblColIntervention: string;
  btnIssueWo: string;
  modalWoTitle: string;
  lblWoPriority: string;
  lblWoUrgent: string;
  lblWoEmergency: string;
  lblWoRoutine: string;
  lblAssignCrew: string;
  btnCreateWo: string;

  // Admin Registry & Policies
  adminTitle: string;
  adminSubtitle: string;
  tabRegistry: string;
  tabPolicies: string;
  tabDlq: string;
  btnRegisterAsset: string;
  btnAddPolicy: string;
  btnReprocessDlq: string;
  modalRegisterTitle: string;
  lblSerialNo: string;
  lblSubdivision: string;
  lblRatedKva: string;
  lblVoltageRating: string;
  lblInstallDate: string;
  lblManufacturer: string;
  modalPolicyTitle: string;
  lblMetricName: string;
  lblWarningThreshold: string;
  lblCriticalThreshold: string;
  lblSustainedWindow: string;
  tblDlqPayloadId: string;
  tblDlqTimestamp: string;
  tblDlqError: string;
  tblDlqRawPayload: string;
  btnRetry: string;
  btnDiscard: string;

  // Shared status & buttons
  statusOperational: string;
  statusDegraded: string;
  statusCritical: string;
  statusMaintenance: string;
  btnRefresh: string;
  btnExportCsv: string;
  btnClose: string;
  btnCancel: string;
  btnSave: string;
  liveAriaStatus: string;

  // Maintenance Assignment & Tracking System
  colOperationalStatus: string;
  colMaintenanceStatus: string;
  maintNotAssigned: string;
  maintAwaitingAcceptance: string;
  maintAccepted: string;
  maintInProgress: string;
  maintPendingReview: string;
  maintCompleted: string;
  maintRejected: string;
  maintCancelled: string;
  counterAwaitingAcceptance: string;
  counterInProgress: string;
  counterReassignmentRequired: string;
  counterCompleted: string;
  filterAllMaintenance: string;
  sortPriorityIndicator: string;
  btnTrackWo: string;
  btnReassignWo: string;
  btnAcceptAssignment: string;
  btnRejectAssignment: string;
  btnStartMaintenance: string;
  btnSubmitForReview: string;
  btnCompleteMaintenance: string;
  modalTrackWoTitle: string;
  modalReassignTitle: string;
  lblRejectionReason: string;
  activeTasksLabel: string;
  activeTaskSingular: string;
  noEligibleEngineers: string;
  subdivisionMismatch: string;
  assignmentNotAllowed: string;
  refreshData: string;
  refreshing: string;
}

export const TRANSFORMER_TRANSLATIONS: Record<LanguageCode, TransformerPhase12Dictionary> = {
  en: {
    cockpitTitle: 'Distribution Transformers (DTR) Cockpit',
    cockpitSubtitle: 'Real-time telemetry, predictive health index & operational alert triaging',
    statTotalDtrs: 'Subdivision Transformers',
    statCriticalAlerts: 'Critical Alerts',
    statOverloaded: 'Overloaded / Low Margin',
    statAvgHealthIndex: 'Avg Health Index',
    sseStreaming: 'Live Streaming',
    sseReconnecting: 'Reconnecting...',
    sseOffline: 'Offline',
    searchPlaceholder: 'Search transformer code or name...',
    filterAllStatuses: 'All Statuses',
    colCode: 'Transformer Code',
    colName: 'Name / Location',
    colCapacity: 'Capacity (kVA)',
    colPeakLoad: 'Peak Load',
    colOilTemp: 'Oil Temp (°C)',
    colHealthIndex: 'Health Index',
    colRiskTier: 'Risk Tier',
    colStatus: 'Status',
    colActions: 'Actions',
    btnViewTelemetry: 'View Telemetry',
    btnDossier: 'Dossier',
    modalDossierTitle: 'Transformer Dossier & Telemetry',
    chartLoadTitle: 'Telemetry Stream (Last 24 Hours) — Load (kVA)',
    chartTempTitle: 'Temperature Trends — Oil & Winding (°C)',
    predictiveRiskHeader: 'Predictive Risk & Failure Probability',
    riskTierLow: 'Low Risk',
    riskTierMedium: 'Medium Risk',
    riskTierHigh: 'High Risk',
    riskTierSevere: 'Severe Risk',
    actionAcknowledge: 'Acknowledge Alert',
    actionDispatchWo: 'Dispatch Work Order',
    actionScheduleInspection: 'Schedule Field Inspection',
    fieldTitle: 'DTR Field Inspection Console',
    fieldSubtitle: 'Offline-first inspection execution, photo evidence & sensor validation',
    statAssigned: 'Assigned DTRs',
    statPending: 'Pending Inspection',
    statCompletedToday: 'Completed Today',
    statSyncQueue: 'Sync Queue',
    btnSyncNow: 'Sync Now',
    btnSyncing: 'Syncing...',
    syncAllSynced: 'All records synced to cloud',
    checkOilLevel: 'Oil Level & Color Check',
    checkBushing: 'Bushing Condition & Flashover Check',
    checkSilicaGel: 'Silica Gel Breather Condition',
    checkEarthResistance: 'Earth Resistance & Grounding Check',
    checkCorrosion: 'Tank Leakage & Corrosion Inspection',
    checkHumming: 'Unusual Humming / Vibration Check',
    lblSelectTransformer: 'Select Transformer',
    lblOilLevel: 'Oil Level',
    lblOilLevelNormal: 'Normal',
    lblOilLevelLow: 'Low',
    lblOilLevelCritical: 'Critical Low',
    lblOilTemp: 'Oil Temperature (°C)',
    lblWindingTemp: 'Winding Temperature (°C)',
    lblPhysicalNotes: 'Physical Condition Notes',
    lblPhotoEvidence: 'Photo Evidence',
    btnCapturePhoto: 'Capture / Upload Photo',
    lblGpsLocation: 'GPS Coordinates',
    btnAcquireGps: 'Acquire GPS Location',
    btnSubmitInspection: 'Submit Inspection Record',
    mgmtTitle: 'Transformer Fleet Health & Predictive Risk Cockpit',
    mgmtSubtitle: 'Executive cross-zone reliability, subdivision telemetry & asset replacement risk',
    kpiFleetHealthIndex: 'Fleet Health Index',
    kpiActiveFleet: 'Total Active Fleet',
    kpiHighRiskCount: 'High Risk Assets',
    kpiTelemetryAlarms24h: 'Telemetry Alarms (24h)',
    chartSubdivisionHealth: 'Subdivision Asset Health Distribution',
    chartRiskTiering: 'Predictive Risk Tiering',
    tblHighestRiskTitle: 'Highest Risk Transformers',
    tblColSubdivision: 'Subdivision',
    tblColRiskScore: 'Risk Score',
    tblColDriver: 'Primary Failure Driver',
    tblColIntervention: 'Recommended Intervention',
    btnIssueWo: 'Issue Emergency Work Order',
    modalWoTitle: 'Create Maintenance Work Order',
    lblWoPriority: 'Work Order Priority',
    lblWoUrgent: 'Urgent',
    lblWoEmergency: 'Emergency',
    lblWoRoutine: 'Routine',
    lblAssignCrew: 'Assigned Maintenance Crew',
    btnCreateWo: 'Generate Work Order',
    adminTitle: 'Transformer Asset Registry & Policy Management',
    adminSubtitle: 'Asset lifecycle registration, telemetry threshold rules & dead-letter queue',
    tabRegistry: 'Asset Registry',
    tabPolicies: 'Threshold Policies',
    tabDlq: 'Dead-Letter Queue (DLQ)',
    btnRegisterAsset: 'Register New Transformer',
    btnAddPolicy: 'Add Policy Rule',
    btnReprocessDlq: 'Reprocess DLQ',
    modalRegisterTitle: 'Register Distribution Transformer',
    lblSerialNo: 'Serial Number',
    lblSubdivision: 'Subdivision',
    lblRatedKva: 'Rated Capacity (kVA)',
    lblVoltageRating: 'Voltage Rating',
    lblInstallDate: 'Installation Date',
    lblManufacturer: 'Manufacturer',
    modalPolicyTitle: 'Configure Alert Threshold Policy',
    lblMetricName: 'Metric Name',
    lblWarningThreshold: 'Warning Threshold',
    lblCriticalThreshold: 'Critical Threshold',
    lblSustainedWindow: 'Sustained Window (minutes)',
    tblDlqPayloadId: 'Payload ID',
    tblDlqTimestamp: 'Timestamp',
    tblDlqError: 'Error Reason',
    tblDlqRawPayload: 'Raw Payload',
    btnRetry: 'Retry Ingestion',
    btnDiscard: 'Discard',
    statusOperational: 'Operational',
    statusDegraded: 'Degraded',
    statusCritical: 'Critical',
    statusMaintenance: 'Maintenance',
    btnRefresh: 'Refresh Data',
    btnExportCsv: 'Export CSV',
    btnClose: 'Close',
    btnCancel: 'Cancel',
    btnSave: 'Save',
    liveAriaStatus: 'Real-time telemetry event stream status',
    colOperationalStatus: 'Operational Status',
    colMaintenanceStatus: 'Maintenance Status',
    maintNotAssigned: 'Not Assigned',
    maintAwaitingAcceptance: 'Awaiting Acceptance',
    maintAccepted: 'Accepted',
    maintInProgress: 'In Progress',
    maintPendingReview: 'Inspection Submitted',
    maintCompleted: 'Completed',
    maintRejected: 'Rejected • Reassign',
    maintCancelled: 'Cancelled',
    counterAwaitingAcceptance: 'Awaiting Acceptance',
    counterInProgress: 'In Progress',
    counterReassignmentRequired: 'Reassignment Required',
    counterCompleted: 'Completed',
    filterAllMaintenance: 'All Maintenance States',
    sortPriorityIndicator: 'Sorted by Action Priority & Risk',
    btnTrackWo: 'Track Work Order',
    btnReassignWo: 'Reassign Engineer',
    btnAcceptAssignment: 'Accept Assignment',
    btnRejectAssignment: 'Reject Assignment',
    btnStartMaintenance: 'Start Maintenance Work',
    btnSubmitForReview: 'Submit Inspection for Review',
    btnCompleteMaintenance: 'Complete Maintenance',
    modalTrackWoTitle: 'Work Order Lifecycle & Audit Timeline',
    modalReassignTitle: 'Reassign Maintenance Work Order',
    lblRejectionReason: 'Reason for Rejection',
    activeTasksLabel: 'Active Tasks',
    activeTaskSingular: 'Active Task',
    noEligibleEngineers: 'No eligible field engineers are currently available for this subdivision.',
    subdivisionMismatch: 'Subdivision Mismatch',
    assignmentNotAllowed: 'Assignment not allowed for this subdivision',
    refreshData: 'Refresh Data',
    refreshing: 'Refreshing...'
  },
  gu: {
    cockpitTitle: 'ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર્સ (ડીટીઆર) કોકપિટ',
    cockpitSubtitle: 'રીઅલ-ટાઇમ ટેલિમેટ્રી, અનુમાનિત આરોગ્ય સૂચકાંક અને કાર્યકારી ચેતવણી વ્યવસ્થાપન',
    statTotalDtrs: 'પેટાવિભાગ ટ્રાન્સફોર્મર્સ',
    statCriticalAlerts: 'ગંભીર ચેતવણીઓ',
    statOverloaded: 'ઓવરલોડેડ / અલ્પ માર્જિન',
    statAvgHealthIndex: 'સરેરાશ આરોગ્ય સૂચકાંક',
    sseStreaming: 'લાઇવ સ્ટ્રીમિંગ',
    sseReconnecting: 'પુનઃજોડાણ થઈ રહ્યું છે...',
    sseOffline: 'ઑફલાઇન',
    searchPlaceholder: 'ટ્રાન્સફોર્મર કોડ અથવા નામ શોધો...',
    filterAllStatuses: 'બધી સ્થિતિઓ',
    colCode: 'ટ્રાન્સફોર્મર કોડ',
    colName: 'નામ / સ્થળ',
    colCapacity: 'ક્ષમતા (kVA)',
    colPeakLoad: 'પીક લોડ',
    colOilTemp: 'ઓઇલ તાપમાન (°C)',
    colHealthIndex: 'આરોગ્ય સૂચકાંક',
    colRiskTier: 'જોખમ સ્તર',
    colStatus: 'સ્થિતિ',
    colActions: 'કાર્યવાહી',
    btnViewTelemetry: 'ટેલિમેટ્રી જુઓ',
    btnDossier: 'ડોઝિયર',
    modalDossierTitle: 'ટ્રાન્સફોર્મર ડોઝિયર અને ટેલિમેટ્રી',
    chartLoadTitle: 'ટેલિમેટ્રી પ્રવાહ (છેલ્લા 24 કલાક) — લોડ (kVA)',
    chartTempTitle: 'તાપમાન વલણો — ઓઇલ અને વાઇન્ડિંગ (°C)',
    predictiveRiskHeader: 'અનુમાનિત જોખમ અને નિષ્ફળતા સંભાવના',
    riskTierLow: 'ઓછું જોખમ',
    riskTierMedium: 'મધ્યમ જોખમ',
    riskTierHigh: 'ઉચ્ચ જોખમ',
    riskTierSevere: 'ગંભીર જોખમ',
    actionAcknowledge: 'ચેતવણી સ્વીકારો',
    actionDispatchWo: 'વર્ક ઓર્ડર મોકલો',
    actionScheduleInspection: 'ક્ષેત્ર નિરીક્ષણ શેડ્યૂલ કરો',
    fieldTitle: 'ડીટીઆર ક્ષેત્ર નિરીક્ષણ કન્સોલ',
    fieldSubtitle: 'ઑફલાઇન-પ્રથમ નિરીક્ષણ અમલીકરણ, ફોટો પુરાવા અને સેન્સર ચકાસણી',
    statAssigned: 'સોંપાયેલ ડીટીઆર',
    statPending: 'બાકી નિરીક્ષણ',
    statCompletedToday: 'આજે પૂર્ણ થયેલ',
    statSyncQueue: 'સિંક કતાર',
    btnSyncNow: 'હવે સિંક કરો',
    btnSyncing: 'સિંક થઈ રહ્યું છે...',
    syncAllSynced: 'બધા રેકોર્ડ્સ ક્લાઉડ સાથે સિંક થયેલ છે',
    checkOilLevel: 'ઓઇલ સ્તર અને રંગ તપાસ',
    checkBushing: 'બુશિંગ સ્થિતિ અને ફ્લેશઓવર તપાસ',
    checkSilicaGel: 'સિલિકા જેલ બ્રીધર સ્થિતિ',
    checkEarthResistance: 'અર્થિંગ પ્રતિકાર અને ગ્રાઉન્ડિંગ તપાસ',
    checkCorrosion: 'ટાંકી લિકેજ અને ક્ષારણ નિરીક્ષણ',
    checkHumming: 'અસામાન્ય અવાજ / કંપન તપાસ',
    lblSelectTransformer: 'ટ્રાન્સફોર્મર પસંદ કરો',
    lblOilLevel: 'ઓઇલ સ્તર',
    lblOilLevelNormal: 'સામાન્ય',
    lblOilLevelLow: 'ઓછું',
    lblOilLevelCritical: 'ગંભીર ઓછું',
    lblOilTemp: 'ઓઇલ તાપમાન (°C)',
    lblWindingTemp: 'વાઇન્ડિંગ તાપમાન (°C)',
    lblPhysicalNotes: 'ભૌતિક સ્થિતિ નોંધો',
    lblPhotoEvidence: 'ફોટો પુરાવા',
    btnCapturePhoto: 'ફોટો લો / અપલોડ કરો',
    lblGpsLocation: 'જીપીએસ કોઓર્ડિનેટ્સ',
    btnAcquireGps: 'જીપીએસ સ્થાન મેળવો',
    btnSubmitInspection: 'નિરીક્ષણ રેકોર્ડ સબમિટ કરો',
    mgmtTitle: 'ટ્રાન્સફોર્મર ફ્લીટ આરોગ્ય અને અનુમાનિત જોખમ કોકપિટ',
    mgmtSubtitle: 'એક્ઝિક્યુટિવ ક્રોસ-ઝોન વિશ્વસનીયતા, પેટાવિભાગ ટેલિમેટ્રી અને એસેટ બદલી જોખમ',
    kpiFleetHealthIndex: 'ફ્લીટ આરોગ્ય સૂચકાંક',
    kpiActiveFleet: 'કુલ સક્રિય ફ્લીટ',
    kpiHighRiskCount: 'ઉચ્ચ જોખમ ધરાવતી સંપત્તિ',
    kpiTelemetryAlarms24h: 'ટેલિમેટ્રી અલાર્મ્સ (24 કલાક)',
    chartSubdivisionHealth: 'પેટાવિભાગ એસેટ આરોગ્ય વિતરણ',
    chartRiskTiering: 'અનુમાનિત જોખમ સ્તરીકરણ',
    tblHighestRiskTitle: 'સૌથી વધુ જોખમ ધરાવતા ટ્રાન્સફોર્મર્સ',
    tblColSubdivision: 'પેટાવિભાગ',
    tblColRiskScore: 'જોખમ સ્કોર',
    tblColDriver: 'મુખ્ય નિષ્ફળતા પરિબળ',
    tblColIntervention: 'ભલામણ કરેલ હસ્તક્ષેપ',
    btnIssueWo: 'ઇમરજન્સી વર્ક ઓર્ડર જારી કરો',
    modalWoTitle: 'જાળવણી વર્ક ઓર્ડર બનાવો',
    lblWoPriority: 'વર્ક ઓર્ડર અગ્રતા',
    lblWoUrgent: 'તાકીદનું',
    lblWoEmergency: 'ઇમરજન્સી',
    lblWoRoutine: 'નિયમિત',
    lblAssignCrew: 'સોંપાયેલ જાળવણી ટીમ',
    btnCreateWo: 'વર્ક ઓર્ડર જનરેટ કરો',
    adminTitle: 'ટ્રાન્સફોર્મર એસેટ રજિસ્ટ્રી અને નીતિ વ્યવસ્થાપન',
    adminSubtitle: 'સંપત્તિ નોંધણી, ટેલિમેટ્રી થ્રેશોલ્ડ નિયમો અને ડેડ-લેટર કતાર',
    tabRegistry: 'એસેટ રજિસ્ટ્રી',
    tabPolicies: 'થ્રેશોલ્ડ નીતિઓ',
    tabDlq: 'ડેડ-લેટર કતાર (DLQ)',
    btnRegisterAsset: 'નવું ટ્રાન્સફોર્મર નોંધણી કરો',
    btnAddPolicy: 'નીતિ નિયમ ઉમેરો',
    btnReprocessDlq: 'DLQ પુનઃપ્રક્રિયા કરો',
    modalRegisterTitle: 'ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર નોંધણી કરો',
    lblSerialNo: 'સીરીયલ નંબર',
    lblSubdivision: 'પેટાવિભાગ',
    lblRatedKva: 'રેટેડ ક્ષમતા (kVA)',
    lblVoltageRating: 'વોલ્ટેજ રેટિંગ',
    lblInstallDate: 'સ્થાપના તારીખ',
    lblManufacturer: 'ઉત્પાદક',
    modalPolicyTitle: 'ચેતવણી થ્રેશોલ્ડ નીતિ રૂપરેખાંકિત કરો',
    lblMetricName: 'મેટ્રિક નામ',
    lblWarningThreshold: 'ચેતવણી થ્રેશોલ્ડ',
    lblCriticalThreshold: 'ગંભીર થ્રેશોલ્ડ',
    lblSustainedWindow: 'ટકી રહેવાનો સમયગાળો (મિનિટ)',
    tblDlqPayloadId: 'પેલોડ ID',
    tblDlqTimestamp: 'સમયસ્ટેમ્પ',
    tblDlqError: 'ભૂલનું કારણ',
    tblDlqRawPayload: 'કાચો પેલોડ',
    btnRetry: 'ફરીથી પ્રયાસ કરો',
    btnDiscard: 'રદ કરો',
    statusOperational: 'કાર્યરત',
    statusDegraded: 'અવરોધિત',
    statusCritical: 'ગંભીર',
    statusMaintenance: 'જાળવણી હેઠળ',
    btnRefresh: 'ડેટા તાજો કરો',
    btnExportCsv: 'CSV નિકાસ કરો',
    btnClose: 'બંધ કરો',
    btnCancel: 'રદ કરો',
    btnSave: 'સાચવો',
    liveAriaStatus: 'રીઅલ-ટાઇમ ટેલિમેટ્રી ઇવેન્ટ સ્ટ્રીમ સ્થિતિ',
    colOperationalStatus: 'કાર્યકારી સ્થિતિ',
    colMaintenanceStatus: 'જાળવણી સ્થિતિ',
    maintNotAssigned: 'સોંપાયેલ નથી',
    maintAwaitingAcceptance: 'સ્વીકૃતિની રાહમાં',
    maintAccepted: 'સ્વીકારાયેલ',
    maintInProgress: 'કાર્ય પ્રગતિમાં',
    maintPendingReview: 'નિરીક્ષણ સબમિટ થયેલ',
    maintCompleted: 'પૂર્ણ થયેલ',
    maintRejected: 'નકારાયેલ • ફરી સોંપો',
    maintCancelled: 'રદ થયેલ',
    counterAwaitingAcceptance: 'સ્વીકૃતિ બાકી',
    counterInProgress: 'કાર્ય પ્રગતિમાં',
    counterReassignmentRequired: 'ફરી સોંપણી જરૂરી',
    counterCompleted: 'પૂર્ણ થયેલ',
    filterAllMaintenance: 'બધી જાળવણી સ્થિતિઓ',
    sortPriorityIndicator: 'કાર્યવાહી અગ્રતા અને જોખમ મુજબ ક્રમાંકિત',
    btnTrackWo: 'વર્ક ઓર્ડર ટ્રેક કરો',
    btnReassignWo: 'એન્જિનિયર ફરી સોંપો',
    btnAcceptAssignment: 'સોંપણી સ્વીકારો',
    btnRejectAssignment: 'સોંપણી નકારો',
    btnStartMaintenance: 'જાળવણી કાર્ય શરૂ કરો',
    btnSubmitForReview: 'સમીક્ષા માટે નિરીક્ષણ સબમિટ કરો',
    btnCompleteMaintenance: 'જાળવણી પૂર્ણ કરો',
    modalTrackWoTitle: 'વર્ક ઓર્ડર જીવનચક્ર અને ઓડિટ ટાઇમલાઇન',
    modalReassignTitle: 'જાળવણી વર્ક ઓર્ડર ફરી સોંપો',
    lblRejectionReason: 'નકારવાનું કારણ',
    activeTasksLabel: 'સક્રિય કાર્યો',
    activeTaskSingular: 'સક્રિય કાર્ય',
    noEligibleEngineers: 'આ પેટાવિભાગ માટે હાલમાં કોઈ યોગ્ય ફિલ્ડ એન્જિનિયર ઉપલબ્ધ નથી.',
    subdivisionMismatch: 'પેટાવિભાગ મેળ ખાતો નથી',
    assignmentNotAllowed: 'આ પેટાવિભાગ માટે સોંપણી માન્ય નથી',
    refreshData: 'ડેટા તાજું કરો',
    refreshing: 'તાજું થઈ રહ્યું છે...'
  },
  hi: {
    cockpitTitle: 'वितरण ट्रांसफॉर्मर (डीटीआर) कॉकपिट',
    cockpitSubtitle: 'रीयल-टाइम टेलीमेट्री, भविष्यसूचक स्वास्थ्य सूचकांक और परिचालन अलर्ट प्रबंधन',
    statTotalDtrs: 'उपखंड ट्रांसफॉर्मर',
    statCriticalAlerts: 'गंभीर अलर्ट',
    statOverloaded: 'अतिभारित / निम्न मार्जिन',
    statAvgHealthIndex: 'औसत स्वास्थ्य सूचकांक',
    sseStreaming: 'लाइव स्ट्रीमिंग',
    sseReconnecting: 'पुनः कनेक्ट हो रहा है...',
    sseOffline: 'ऑफ़लाइन',
    searchPlaceholder: 'ट्रांसफॉर्मर कोड या नाम खोजें...',
    filterAllStatuses: 'सभी स्थितियां',
    colCode: 'ट्रांसफॉर्मर कोड',
    colName: 'नाम / स्थान',
    colCapacity: 'क्षमता (kVA)',
    colPeakLoad: 'पीक लोड',
    colOilTemp: 'तेल का तापमान (°C)',
    colHealthIndex: 'स्वास्थ्य सूचकांक',
    colRiskTier: 'जोखिम स्तर',
    colStatus: 'स्थिति',
    colActions: 'कार्रवाई',
    btnViewTelemetry: 'टेलीमेट्री देखें',
    btnDossier: 'दस्तावेज़',
    modalDossierTitle: 'ट्रांसफॉर्मर दस्तावेज़ एवं टेलीमेट्री',
    chartLoadTitle: 'टेलीमेट्री स्ट्रीम (पिछले 24 घंटे) — लोड (kVA)',
    chartTempTitle: 'तापमान रुझान — तेल और वाइंडिंग (°C)',
    predictiveRiskHeader: 'भविष्यसूचक जोखिम एवं विफलता संभावना',
    riskTierLow: 'कम जोखिम',
    riskTierMedium: 'मध्यम जोखिम',
    riskTierHigh: 'उच्च जोखिम',
    riskTierSevere: 'गंभीर जोखिम',
    actionAcknowledge: 'अलर्ट स्वीकारें',
    actionDispatchWo: 'वर्क ऑर्डर भेजें',
    actionScheduleInspection: 'फील्ड निरीक्षण शेड्यूल करें',
    fieldTitle: 'डीटीआर फील्ड निरीक्षण कंसोल',
    fieldSubtitle: 'ऑफ़लाइन-प्रथम निरीक्षण निष्पादन, फोटो साक्ष्य और सेंसर सत्यापन',
    statAssigned: 'आवंटित डीटीआर',
    statPending: 'लंबित निरीक्षण',
    statCompletedToday: 'आज पूर्ण हुए',
    statSyncQueue: 'सिंक कतार',
    btnSyncNow: 'अभी सिंक करें',
    btnSyncing: 'सिंक हो रहा है...',
    syncAllSynced: 'सभी रिकॉर्ड क्लाउड से सिंक हो गए हैं',
    checkOilLevel: 'तेल स्तर एवं रंग जांच',
    checkBushing: 'बुशिंग स्थिति और फ्लैशओवर जांच',
    checkSilicaGel: 'सिलिका जेल ब्रीदर स्थिति',
    checkEarthResistance: 'अर्थिंग प्रतिरोध एवं ग्राउंडिंग जांच',
    checkCorrosion: 'टैंक रिसाव और क्षरण निरीक्षण',
    checkHumming: 'असामान्य कंपन / हमिंग जांच',
    lblSelectTransformer: 'ट्रांसफॉर्मर चुनें',
    lblOilLevel: 'तेल का स्तर',
    lblOilLevelNormal: 'सामान्य',
    lblOilLevelLow: 'कम',
    lblOilLevelCritical: 'गंभीर रूप से कम',
    lblOilTemp: 'तेल का तापमान (°C)',
    lblWindingTemp: 'वाइंडिंग तापमान (°C)',
    lblPhysicalNotes: 'भौतिक स्थिति विवरण',
    lblPhotoEvidence: 'फोटो साक्ष्य',
    btnCapturePhoto: 'फोटो लें / अपलोड करें',
    lblGpsLocation: 'जीपीएस निर्देशांक',
    btnAcquireGps: 'जीपीएस स्थान प्राप्त करें',
    btnSubmitInspection: 'निरीक्षण रिकॉर्ड जमा करें',
    mgmtTitle: 'ट्रांसफॉर्मर बेड़ा स्वास्थ्य एवं भविष्यसूचक जोखिम कॉकपिट',
    mgmtSubtitle: 'कार्यकारी अंतर-क्षेत्रीय विश्वसनीयता, उपखंड टेलीमेट्री एवं परिसंपत्ति प्रतिस्थापन जोखिम',
    kpiFleetHealthIndex: 'बेड़ा स्वास्थ्य सूचकांक',
    kpiActiveFleet: 'कुल सक्रिय बेड़ा',
    kpiHighRiskCount: 'उच्च जोखिम संपत्तियां',
    kpiTelemetryAlarms24h: 'टेलीमेट्री अलार्म (24 घंटे)',
    chartSubdivisionHealth: 'उपखंड परिसंपत्ति स्वास्थ्य वितरण',
    chartRiskTiering: 'भविष्यसूचक जोखिम स्तरीकरण',
    tblHighestRiskTitle: 'उच्चतम जोखिम वाले ट्रांसफॉर्मर',
    tblColSubdivision: 'उपखंड',
    tblColRiskScore: 'जोखिम स्कोर',
    tblColDriver: 'प्रमुख विफलता कारक',
    tblColIntervention: 'अनुशंसित हस्तक्षेप',
    btnIssueWo: 'आपातकालीन वर्क ऑर्डर जारी करें',
    modalWoTitle: 'रखरखाव वर्क ऑर्डर बनाएं',
    lblWoPriority: 'वर्क ऑर्डर प्राथमिकता',
    lblWoUrgent: 'अति आवश्यक',
    lblWoEmergency: 'आपातकालीन',
    lblWoRoutine: 'नियमित',
    lblAssignCrew: 'आवंटित रखरखाव दल',
    btnCreateWo: 'वर्क ऑर्डर उत्पन्न करें',
    adminTitle: 'ट्रांसफॉर्मर परिसंपत्ति रजिस्ट्री एवं नीति प्रबंधन',
    adminSubtitle: 'परिसंपत्ति जीवनचक्र पंजीकरण, टेलीमेट्री सीमा नियम और डेड-लेटर कतार',
    tabRegistry: 'परिसंपत्ति रजिस्ट्री',
    tabPolicies: 'सीमा नीतियां',
    tabDlq: 'डेड-लेटर कतार (DLQ)',
    btnRegisterAsset: 'नया ट्रांसफॉर्मर पंजीकृत करें',
    btnAddPolicy: 'नीति नियम जोड़ें',
    btnReprocessDlq: 'DLQ पुनः संसाधित करें',
    modalRegisterTitle: 'वितरण ट्रांसफॉर्मर पंजीकृत करें',
    lblSerialNo: 'सीरियल नंबर',
    lblSubdivision: 'उपखंड',
    lblRatedKva: 'रेटेड क्षमता (kVA)',
    lblVoltageRating: 'वोल्टेज रेटिंग',
    lblInstallDate: 'स्थापना तिथि',
    lblManufacturer: 'निर्माता',
    modalPolicyTitle: 'अलर्ट सीमा नीति कॉन्फ़िगर करें',
    lblMetricName: 'मीट्रिक नाम',
    lblWarningThreshold: 'चेतावनी सीमा',
    lblCriticalThreshold: 'गंभीर सीमा',
    lblSustainedWindow: 'निरंतर अवधि (मिनट)',
    tblDlqPayloadId: 'पेलोड आईडी',
    tblDlqTimestamp: 'समय',
    tblDlqError: 'त्रुटि कारण',
    tblDlqRawPayload: 'कच्चा पेलोड',
    btnRetry: 'पुनः प्रयास करें',
    btnDiscard: 'खारिज करें',
    statusOperational: 'कार्यरत',
    statusDegraded: 'घटा हुआ',
    statusCritical: 'गंभीर',
    statusMaintenance: 'रखरखाव में',
    btnRefresh: 'डेटा ताज़ा करें',
    btnExportCsv: 'CSV निर्यात करें',
    btnClose: 'बंद करें',
    btnCancel: 'रद्द करें',
    btnSave: 'सहेजें',
    liveAriaStatus: 'रीयल-टाइम टेलीमेट्री इवेंट स्ट्रीम स्थिति',
    colOperationalStatus: 'परिचालन स्थिति',
    colMaintenanceStatus: 'रखरखाव स्थिति',
    maintNotAssigned: 'असाइन नहीं किया गया',
    maintAwaitingAcceptance: 'स्वीकृति की प्रतीक्षा में',
    maintAccepted: 'स्वीकृत',
    maintInProgress: 'प्रगति पर',
    maintPendingReview: 'निरीक्षण प्रस्तुत',
    maintCompleted: 'पूर्ण',
    maintRejected: 'अस्वीकृत • पुनः असाइन करें',
    maintCancelled: 'रद्द',
    counterAwaitingAcceptance: 'स्वीकृति लंबित',
    counterInProgress: 'प्रगति पर',
    counterReassignmentRequired: 'पुनः असाइनमेंट आवश्यक',
    counterCompleted: 'पूर्ण',
    filterAllMaintenance: 'सभी रखरखाव स्थितियां',
    sortPriorityIndicator: 'कार्रवाई प्राथमिकता और जोखिम द्वारा क्रमबद्ध',
    btnTrackWo: 'वर्क ऑर्डर ट्रैक करें',
    btnReassignWo: 'इंजीनियर पुनः असाइन करें',
    btnAcceptAssignment: 'असाइनमेंट स्वीकार करें',
    btnRejectAssignment: 'असाइनमेंट अस्वीकार करें',
    btnStartMaintenance: 'रखरखाव कार्य शुरू करें',
    btnSubmitForReview: 'समीक्षा हेतु निरीक्षण जमा करें',
    btnCompleteMaintenance: 'रखरखाव पूर्ण करें',
    modalTrackWoTitle: 'वर्क ऑर्डर जीवनचक्र और ऑडिट समयरेखा',
    modalReassignTitle: 'रखरखाव वर्क ऑर्डर पुनः असाइन करें',
    lblRejectionReason: 'अस्वीकृति का कारण',
    activeTasksLabel: 'सक्रिय कार्य',
    activeTaskSingular: 'सक्रिय कार्य',
    noEligibleEngineers: 'इस उप-विभाग के लिए वर्तमान में कोई पात्र फ़ील्ड इंजीनियर उपलब्ध नहीं है।',
    subdivisionMismatch: 'उप-विभाग बेमेल',
    assignmentNotAllowed: 'इस उप-विभाग के लिए कार्य सौंपने की अनुमति नहीं है',
    refreshData: 'डेटा रीफ़्रेश करें',
    refreshing: 'रीफ़्रेश हो रहा है...'
  },
  mr: {
    cockpitTitle: 'वितरण ट्रान्सफॉर्मर्स (डीटीआर) कॉकपिट',
    cockpitSubtitle: 'रिअल-टाइम टेलिमेट्री, भविष्यसूचक आरोग्य निर्देशांक आणि कार्यप्रणाली अलर्ट व्यवस्थापन',
    statTotalDtrs: 'उपविभाग ट्रान्सफॉर्मर्स',
    statCriticalAlerts: 'गंभीर अलर्ट्स',
    statOverloaded: 'अतिभारित / कमी मार्जिन',
    statAvgHealthIndex: 'सरासरी आरोग्य निर्देशांक',
    sseStreaming: 'थेट प्रवाह',
    sseReconnecting: 'पुन्हा जोडत आहे...',
    sseOffline: 'ऑफलाइन',
    searchPlaceholder: 'ट्रान्सफॉर्मर कोड किंवा नाव शोधा...',
    filterAllStatuses: 'सर्व स्थिती',
    colCode: 'ट्रान्सफॉर्मर कोड',
    colName: 'नाव / ठिकाण',
    colCapacity: 'क्षमता (kVA)',
    colPeakLoad: 'कमाल भार',
    colOilTemp: 'तेल तापमान (°C)',
    colHealthIndex: 'आरोग्य निर्देशांक',
    colRiskTier: 'जोखीम पातळी',
    colStatus: 'स्थिती',
    colActions: 'कृती',
    btnViewTelemetry: 'टेलिमेट्री पहा',
    btnDossier: 'दस्तऐवज',
    modalDossierTitle: 'ट्रान्सफॉर्मर दस्तऐवज आणि टेलिमेट्री',
    chartLoadTitle: 'टेलिमेट्री प्रवाह (मागील 24 तास) — भार (kVA)',
    chartTempTitle: 'तापमान कल — तेल आणि वाइंडिंग (°C)',
    predictiveRiskHeader: 'भविष्यसूचक जोखीम आणि बिघाड शक्यता',
    riskTierLow: 'कमी जोखीम',
    riskTierMedium: 'मध्यम जोखीम',
    riskTierHigh: 'उच्च जोखीम',
    riskTierSevere: 'गंभीर जोखीम',
    actionAcknowledge: 'अलर्ट स्वीकारा',
    actionDispatchWo: 'वर्क ऑर्डर पाठवा',
    actionScheduleInspection: 'फील्ड तपासणी नियोजित करा',
    fieldTitle: 'डीटीआर फील्ड तपासणी कन्सोल',
    fieldSubtitle: 'ऑफलाइन-प्रथम तपासणी अंमलबजावणी, फोटो पुरावा आणि सेन्सर पडताळणी',
    statAssigned: 'नियुक्त डीटीआर',
    statPending: 'प्रलंबित तपासणी',
    statCompletedToday: 'आज पूर्ण',
    statSyncQueue: 'सिंक रांग',
    btnSyncNow: 'आता सिंक करा',
    btnSyncing: 'सिंक होत आहे...',
    syncAllSynced: 'सर्व नोंदी क्लाउडवर सिंक झाल्या आहेत',
    checkOilLevel: 'तेल पातळी आणि रंग तपासणी',
    checkBushing: 'बुशिंग स्थिती आणि फ्लॅशओव्हर तपासणी',
    checkSilicaGel: 'सिलिका जेल ब्रीदर स्थिती',
    checkEarthResistance: 'अर्थिंग प्रतिकार आणि ग्राउंडिंग तपासणी',
    checkCorrosion: 'टाकी गळती आणि गंज तपासणी',
    checkHumming: 'असामान्य कंपन / हमिंग तपासणी',
    lblSelectTransformer: 'ट्रान्सफॉर्मर निवडा',
    lblOilLevel: 'तेल पातळी',
    lblOilLevelNormal: 'सामान्य',
    lblOilLevelLow: 'कमी',
    lblOilLevelCritical: 'गंभीर कमी',
    lblOilTemp: 'तेल तापमान (°C)',
    lblWindingTemp: 'वाइंडिंग तापमान (°C)',
    lblPhysicalNotes: 'भौतिक स्थिती नोंदी',
    lblPhotoEvidence: 'फोटो पुरावा',
    btnCapturePhoto: 'फोटो काढा / अपलोड करा',
    lblGpsLocation: 'जीपीएस निर्देशांक',
    btnAcquireGps: 'जीपीएस स्थान मिळवा',
    btnSubmitInspection: 'तपासणी नोंद सादर करा',
    mgmtTitle: 'ट्रान्सफॉर्मर ताफा आरोग्य आणि भविष्यसूचक जोखीम कॉकपिट',
    mgmtSubtitle: 'कार्यकारी अंतर-विभागीय विश्वासार्हता, उपविभाग टेलिमेट्री आणि मालमत्ता बदल जोखीम',
    kpiFleetHealthIndex: 'ताफा आरोग्य निर्देशांक',
    kpiActiveFleet: 'एकूण सक्रिय ताफा',
    kpiHighRiskCount: 'उच्च जोखीम मालमत्ता',
    kpiTelemetryAlarms24h: 'टेलिमेट्री अलार्म्स (24 तास)',
    chartSubdivisionHealth: 'उपविभाग मालमत्ता आरोग्य वितरण',
    chartRiskTiering: 'भविष्यसूचक जोखीम वर्गीकरण',
    tblHighestRiskTitle: 'सर्वात जास्त जोखीम असलेले ट्रान्सफॉर्मर्स',
    tblColSubdivision: 'उपविभाग',
    tblColRiskScore: 'जोखिम गुण',
    tblColDriver: 'मुख्य बिघाड घटक',
    tblColIntervention: 'शिफारस केलेला हस्तक्षेप',
    btnIssueWo: 'तातडीची वर्क ऑर्डर जारी करा',
    modalWoTitle: 'देखभाल वर्क ऑर्डर तयार करा',
    lblWoPriority: 'वर्क ऑर्डर प्राधान्य',
    lblWoUrgent: 'तातडीचे',
    lblWoEmergency: 'आपत्कालीन',
    lblWoRoutine: 'नियमित',
    lblAssignCrew: 'नियुक्त देखभाल पथक',
    btnCreateWo: 'वर्क ऑर्डर तयार करा',
    adminTitle: 'ट्रान्सफॉर्मर मालमत्ता नोंदणी आणि धोरण व्यवस्थापन',
    adminSubtitle: 'मालमत्ता जीवनचक्र नोंदणी, टेलिमेट्री मर्यादा नियम आणि डेड-लेटर रांग',
    tabRegistry: 'मालमत्ता नोंदणी',
    tabPolicies: 'मर्यादा धोरणे',
    tabDlq: 'डेड-लेटर रांग (DLQ)',
    btnRegisterAsset: 'नवीन ट्रान्सफॉर्मर नोंदणी करा',
    btnAddPolicy: 'धोरण नियम जोडा',
    btnReprocessDlq: 'DLQ पुन्हा प्रक्रिया करा',
    modalRegisterTitle: 'वितरण ट्रान्सफॉर्मर नोंदणी करा',
    lblSerialNo: 'अनुक्रमांक',
    lblSubdivision: 'उपविभाग',
    lblRatedKva: 'रेट केलेली क्षमता (kVA)',
    lblVoltageRating: 'व्होल्टेज रेटिंग',
    lblInstallDate: 'स्थापना तारीख',
    lblManufacturer: 'उत्पादक',
    modalPolicyTitle: 'अलर्ट मर्यादा धोरण कॉन्फिगर करा',
    lblMetricName: 'मेट्रिक नाव',
    lblWarningThreshold: 'चेतावणी मर्यादा',
    lblCriticalThreshold: 'गंभीर मर्यादा',
    lblSustainedWindow: 'सलग कालावधी (मिनिटे)',
    tblDlqPayloadId: 'पेलोड आयडी',
    tblDlqTimestamp: 'वेळ',
    tblDlqError: 'त्रुटी कारण',
    tblDlqRawPayload: 'मूळ पेलोड',
    btnRetry: 'पुन्हा प्रयत्न करा',
    btnDiscard: 'रद्द करा',
    statusOperational: 'कार्यरत',
    statusDegraded: 'खालावलेली',
    statusCritical: 'गंभीर',
    statusMaintenance: 'देखभालीखाली',
    btnRefresh: 'डेटा रिफ्रेश करा',
    btnExportCsv: 'CSV निर्यात करा',
    btnClose: 'बंद करा',
    btnCancel: 'रद्द करा',
    btnSave: 'जतन करा',
    liveAriaStatus: 'रिअल-टाइम टेलिमेट्री इव्हेंट प्रवाह स्थिती',
    colOperationalStatus: 'कार्यप्रणाली स्थिती',
    colMaintenanceStatus: 'देखभाल स्थिती',
    maintNotAssigned: 'नियुक्त नाही',
    maintAwaitingAcceptance: 'स्वीकृतीच्या प्रतीक्षेत',
    maintAccepted: 'स्वीकारले',
    maintInProgress: 'प्रगतीपथावर',
    maintPendingReview: 'तपासणी सादर केली',
    maintCompleted: 'पूर्ण झाले',
    maintRejected: 'नाकारले • पुन्हा नियुक्त करा',
    maintCancelled: 'रद्द केले',
    counterAwaitingAcceptance: 'स्वीकृती प्रलंबित',
    counterInProgress: 'प्रगतीपथावर',
    counterReassignmentRequired: 'पुनर्नियुक्ती आवश्यक',
    counterCompleted: 'पूर्ण झाले',
    filterAllMaintenance: 'सर्व देखभाल स्थिती',
    sortPriorityIndicator: 'कृती प्राधान्य आणि जोखमीनुसार क्रमवारी',
    btnTrackWo: 'वर्क ऑर्डर ट्रॅक करा',
    btnReassignWo: 'अभियंता पुन्हा नियुक्त करा',
    btnAcceptAssignment: 'नियुक्ती स्वीकारा',
    btnRejectAssignment: 'नियुक्ती नाकारा',
    btnStartMaintenance: 'देखभाल काम सुरू करा',
    btnSubmitForReview: 'पुनरावलोकनासाठी तपासणी सादर करा',
    btnCompleteMaintenance: 'देखभाल पूर्ण करा',
    modalTrackWoTitle: 'वर्क ऑर्डर जीवनचक्र आणि ऑडिट टाइमलाइन',
    modalReassignTitle: 'देखभाल वर्क ऑर्डर पुन्हा नियुक्त करा',
    lblRejectionReason: 'नाकारण्याचे कारण',
    activeTasksLabel: 'सक्रिय कार्ये',
    activeTaskSingular: 'सक्रिय कार्य',
    noEligibleEngineers: 'या उपविभागासाठी सध्या कोणताही पात्र फील्ड अभियंता उपलब्ध नाही.',
    subdivisionMismatch: 'उपविभाग जुळत नाही',
    assignmentNotAllowed: 'या उपविभागासाठी काम वाटप करण्याची परवानगी नाही',
    refreshData: 'डेटा रिफ्रेश करा',
    refreshing: 'रिफ्रेश होत आहे...'
  }
};

export function getTransformerI18n(lang: LanguageCode | string): TransformerPhase12Dictionary {
  const code = (lang || 'en') as LanguageCode;
  return TRANSFORMER_TRANSLATIONS[code] || TRANSFORMER_TRANSLATIONS.en;
}


