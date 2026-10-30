import { LanguageCode } from './types';
import { AuditLogItem, SystemServiceStatus } from '../types';
import { localizeSubdivision, localizeNotificationTimestamp } from './consumerContentTranslations';

export interface AdminUiDictionary {
  // Top Header
  logoAltText: string;
  topBarTitle: string;
  topBarBadge: string;
  topBarSubtitlePrefix: string;
  checkSslBtn: string;
  sslRenewedToast: string;

  // View 1: System Overview & Integrations
  kpiMicroservicesTitle: string;
  kpiMicroservicesValue: string;
  kpiMicroservicesSub: string;
  kpiGatewayTitle: string;
  kpiGatewayValue: string;
  kpiGatewaySub: string;
  kpiAmrTitle: string;
  kpiAmrValue: string;
  kpiAmrSub: string;
  kpiThreatTitle: string;
  kpiThreatValue: string;
  kpiThreatSub: string;

  servicesTableTitle: string;
  colServiceName: string;
  colCategory: string;
  colLatency: string;
  colUptime90d: string;
  colLastIncidentNote: string;
  colStatus: string;
  statusOperationalBadge: string;

  // View 2: User & Role Management
  userMgmtTitle: string;
  userMgmtSubtitle: string;
  addStaffUserBtn: string;
  addStaffUserToast: string;
  colUserId: string;
  colNameEmail: string;
  colRoleProfile: string;
  colSubdivision: string;
  colLastLogin: string;
  colActions: string;
  lockAccountBtn: string;
  unlockAccountBtn: string;
  userAccessToggledToastPattern: string;

  // View 3: Access Control Matrix (RBAC)
  rbacTitle: string;
  rbacSubtitle: string;
  colEnterpriseModuleAction: string;
  colRoleConsumer: string;
  colRoleEmployee: string;
  colRoleField: string;
  colRoleManagement: string;
  colRoleAdmin: string;
  rbacUpdatedToast: string;

  // View 4: Audit Trail & Security Governance
  hitlQueueTitle: string;
  hitlQueueSubtitle: string;
  hitlPendingBadgeSuffix: string;
  colProposalId: string;
  colProposedActionEntity: string;
  colRequiredAuthority: string;
  colRiskLevel: string;
  colLifecycleStatus: string;
  colGovernanceReview: string;
  noAiRecsEmpty: string;
  targetEntityPrefix: string;
  authorizeSecurityActionBtn: string;
  inspectGovernanceRecordBtn: string;

  auditStreamTitle: string;
  auditStreamSubtitle: string;
  auditSearchPlaceholder: string;
  auditSearchAriaLabel: string;
  filterAll: string;
  filterSuccess: string;
  filterWarning: string;
  filterFailed: string;
  colAuditEventId: string;
  colTimestamp: string;
  colActorRole: string;
  colAction: string;
  colTargetResource: string;
  colOriginIp: string;
  noAuditEventsMatchPattern: string;
  auditPaginationSummaryPattern: string;
  prevPageBtn: string;
  pageIndicatorPattern: string;
  nextPageBtn: string;

  // View 5: Infrastructure & Backup
  backupCardTitle: string;
  backupCardDescription: string;
  lastSnapshotLabel: string;
  lastSnapshotValue: string;
  rpoRtoLabel: string;
  rpoRtoValue: string;
  executingBackupBtn: string;
  triggerBackupBtn: string;
  backupTriggeredToast: string;
  backupCompletedToast: string;

  cyberResilienceTitle: string;
  tlsCipherLabel: string;
  tlsCipherStatus: string;
  aadhaarMaskingLabel: string;
  aadhaarMaskingStatus: string;
  scadaFirewallLabel: string;
  scadaFirewallStatus: string;

  // View 6: System Settings
  settingsTitle: string;
  idleTimeoutLabel: string;
  idleTimeoutDefaultValue: string;
  patchScheduleLabel: string;
  patchScheduleDefaultValue: string;
  saveConfigurationBtn: string;
  settingsSavedToast: string;

  // ERP Adapter & Dead-Letter Queue (Item #16)
  erpAdapterTitle: string;
  erpAdapterSubtitle: string;
  erpSimulatedBadge: string;
  erpDisclosureBanner: string;
  erpMappingHeading: string;
  erpColSourceField: string;
  erpColTargetField: string;
  erpColTransformRule: string;
  erpColRequiredStage: string;
  erpSyncLogHeading: string;
  erpFilterAll: string;
  erpFilterFailedQueue: string;
  erpFilterSynced: string;
  erpBtnSyncRequest: string;
  erpBtnSimulateFailure: string;
  erpBtnRetrySync: string;
  erpStatusSynced: string;
  erpStatusFailed: string;
  erpColApplicant: string;
  erpColEvent: string;
  erpColAttempts: string;
  erpColRefOrError: string;
  erpColAction: string;
  erpEmptyLogs: string;
}

export const ADMIN_UI_TRANSLATIONS: Record<LanguageCode, AdminUiDictionary> = {
  en: {
    logoAltText: 'UGVCL Official Logo',
    topBarTitle: 'IT Infrastructure & Cyber Resilience Console',
    topBarBadge: 'Simulated Control Plane',
    topBarSubtitlePrefix: 'UGVCL State Data Center · Admin:',
    checkSslBtn: 'Check SSL Certificates',
    sslRenewedToast: 'Simulated zero-downtime certificate renewal',

    kpiMicroservicesTitle: 'Core Microservices Health',
    kpiMicroservicesValue: '6 / 6 Operational',
    kpiMicroservicesSub: '99.98% Composite Uptime',
    kpiGatewayTitle: 'API Gateway Throughput',
    kpiGatewayValue: '2,480 req/min',
    kpiGatewaySub: 'Median Latency: 28 ms',
    kpiAmrTitle: 'Smart Meter Ingestion (AMR)',
    kpiAmrValue: '98.8% Sync Rate',
    kpiAmrSub: '15-minute interval telemetry',
    kpiThreatTitle: 'Security Threat Level',
    kpiThreatValue: 'Defcon 5 (Nominal)',
    kpiThreatSub: '0 active intrusion alerts',

    servicesTableTitle: 'Enterprise Integration Health & Microservices (Demo Telemetry)',
    colServiceName: 'Service Name',
    colCategory: 'Category',
    colLatency: 'Latency',
    colUptime90d: '90-Day Uptime',
    colLastIncidentNote: 'Last Incident Note',
    colStatus: 'Status',
    statusOperationalBadge: '● Operational',

    userMgmtTitle: 'Enterprise User Management',
    userMgmtSubtitle: 'Manage accounts, circle subdivisions, and security locks',
    addStaffUserBtn: 'Add Staff User',
    addStaffUserToast: 'New enterprise user onboarding dialog (Demo)',
    colUserId: 'User ID',
    colNameEmail: 'Name & Email',
    colRoleProfile: 'Role Profile',
    colSubdivision: 'Sub-Division',
    colLastLogin: 'Last Login',
    colActions: 'Actions',
    lockAccountBtn: 'Lock Account',
    unlockAccountBtn: 'Unlock',
    userAccessToggledToastPattern: 'User {id} access state toggled (Demo)',

    rbacTitle: 'Role-Based Access Control (RBAC) Matrix',
    rbacSubtitle: 'Interactive permission toggles governing the 5 VidyutOne ecosystem personas',
    colEnterpriseModuleAction: 'Enterprise Module / Action',
    colRoleConsumer: 'Consumer',
    colRoleEmployee: 'Office Employee',
    colRoleField: 'Field Engineer',
    colRoleManagement: 'Management',
    colRoleAdmin: 'System Admin',
    rbacUpdatedToast: 'Permission matrix updated in volatile session',

    hitlQueueTitle: 'Security & Governance Human-in-the-Loop Approvals Queue',
    hitlQueueSubtitle: 'Centralized audit of all AI-proposed actions across Employee, Field, Management, and Admin portals.',
    hitlPendingBadgeSuffix: 'Total Pending Across Portals',
    colProposalId: 'Proposal ID',
    colProposedActionEntity: 'Proposed Action & Entity',
    colRequiredAuthority: 'Required Authority',
    colRiskLevel: 'Risk Level',
    colLifecycleStatus: 'Lifecycle Status',
    colGovernanceReview: 'Governance Review',
    noAiRecsEmpty: 'No AI recommendations registered in session.',
    targetEntityPrefix: 'Target:',
    authorizeSecurityActionBtn: 'Authorize Security Action',
    inspectGovernanceRecordBtn: 'Inspect Governance Record',

    auditStreamTitle: 'System Audit Stream & Security Events',
    auditStreamSubtitle: 'Immutable operational logs across all 5 portals',
    auditSearchPlaceholder: 'Filter by ID, actor, or action...',
    auditSearchAriaLabel: 'Search audit logs',
    filterAll: 'ALL',
    filterSuccess: 'SUCCESS',
    filterWarning: 'WARNING',
    filterFailed: 'FAILED',
    colAuditEventId: 'Audit Event ID',
    colTimestamp: 'Timestamp',
    colActorRole: 'Actor & Role',
    colAction: 'Action',
    colTargetResource: 'Target Resource',
    colOriginIp: 'Origin IP',
    noAuditEventsMatchPattern: 'No audit events match the active filter criteria ({filter}).',
    auditPaginationSummaryPattern: 'Showing {start}–{end} of {total} audit events',
    prevPageBtn: 'Previous',
    pageIndicatorPattern: 'Page {page} / {total}',
    nextPageBtn: 'Next',

    backupCardTitle: 'PostgreSQL Enterprise Cluster Backup',
    backupCardDescription: 'Automated physical snapshots running nightly at 04:30 AM with write-ahead log (WAL) archiving to Gujarat State Data Center.',
    lastSnapshotLabel: 'Last Snapshot:',
    lastSnapshotValue: '15-Oct-2026 04:30 AM (184.2 GB)',
    rpoRtoLabel: 'RPO / RTO Target:',
    rpoRtoValue: '< 5 mins / < 15 mins',
    executingBackupBtn: 'Executing Backup...',
    triggerBackupBtn: 'Trigger Manual Backup Snapshot',
    backupTriggeredToast: 'Simulated database snapshot triggered (PostgreSQL Cluster)',
    backupCompletedToast: 'Simulated snapshot completed: 184.6 GB archived to GSDC cold storage',

    cyberResilienceTitle: 'Cyber Resilience & Data Protection',
    tlsCipherLabel: 'TLS 1.3 Strict Cipher Suites',
    tlsCipherStatus: 'Enforced',
    aadhaarMaskingLabel: 'Aadhaar Masking (UIDAI Compliant)',
    aadhaarMaskingStatus: 'Active',
    scadaFirewallLabel: 'SCADA Air-Gap VPN Firewall',
    scadaFirewallStatus: 'Optimal',

    settingsTitle: 'System Configuration & Maintenance Windows',
    idleTimeoutLabel: 'Portal Idle Session Timeout',
    idleTimeoutDefaultValue: '30 Minutes (Auto-lock)',
    patchScheduleLabel: 'Weekly Patch Maintenance Schedule',
    patchScheduleDefaultValue: 'Every Sunday 02:00 AM - 04:00 AM IST',
    saveConfigurationBtn: 'Save Configuration',
    settingsSavedToast: 'Settings saved to volatile session (Demo)',

    erpAdapterTitle: 'Outbound Utility ERP Webhook Adapter & Dead-Letter Queue',
    erpAdapterSubtitle: 'Canonical SAP IS-U-style field mapping, outbound delivery log, failed-sync queue, and operator retry',
    erpSimulatedBadge: 'Simulated ERP Adapter (No Live UGVCL Link)',
    erpDisclosureBanner: 'Honesty Disclosure: Outbound payloads are validated and recorded against VidyutFlow’s internal mock ERP adapter; live connectivity to UGVCL production SAP / billing servers is a roadmap item.',
    erpMappingHeading: 'Canonical VidyutFlow → Discom ERP Field Mapping Table',
    erpColSourceField: 'VidyutFlow Field',
    erpColTargetField: 'ERP Target Field',
    erpColTransformRule: 'Transformation & Validation Rule',
    erpColRequiredStage: 'Required Stage',
    erpSyncLogHeading: 'ERP Sync Log & Failed-Sync Queue',
    erpFilterAll: 'All Sync Logs',
    erpFilterFailedQueue: 'Failed Queue',
    erpFilterSynced: 'Synced',
    erpBtnSyncRequest: 'Sync Request to ERP',
    erpBtnSimulateFailure: 'Inject 503 Timeout (Test Failed Queue)',
    erpBtnRetrySync: 'Retry Sync',
    erpStatusSynced: 'SYNCED',
    erpStatusFailed: 'FAILED',
    erpColApplicant: 'Request & Applicant',
    erpColEvent: 'Handoff Event',
    erpColAttempts: 'Attempts',
    erpColRefOrError: 'ERP Reference / Failure Reason',
    erpColAction: 'Recovery Action',
    erpEmptyLogs: 'No ERP sync entries match the selected filter.'
  },

  gu: {
    logoAltText: 'UGVCL સત્તાવાર લોગો',
    topBarTitle: 'IT ઇન્ફ્રાસ્ટ્રક્ચર અને સાયબર સુરક્ષા કન્સોલ',
    topBarBadge: 'સિમ્યુલેટેડ કંટ્રોલ પ્લેન',
    topBarSubtitlePrefix: 'UGVCL સ્ટેટ ડેટા સેન્ટર · એડમિન:',
    checkSslBtn: 'SSL પ્રમાણપત્રો તપાસો',
    sslRenewedToast: 'સિમ્યુલેટેડ ઝીરો-ડાઉનટાઇમ પ્રમાણપત્ર નવીનીકરણ પૂર્ણ',

    kpiMicroservicesTitle: 'મુખ્ય માઇક્રોસર્વિસિસ સ્થિતિ',
    kpiMicroservicesValue: '6 / 6 કાર્યરત',
    kpiMicroservicesSub: '99.98% સંયુક્ત અપટાઇમ',
    kpiGatewayTitle: 'API ગેટવે થ્રુપુટ',
    kpiGatewayValue: '2,480 req/min',
    kpiGatewaySub: 'સરેરાશ લેટન્સી: 28 ms',
    kpiAmrTitle: 'સ્માર્ટ મીટર ડેટા સંકલન (AMR)',
    kpiAmrValue: '98.8% સિંક દર',
    kpiAmrSub: '15-મિનિટ અંતરાલ ટેલિમેટ્રી',
    kpiThreatTitle: 'સુરક્ષા જોખમ સ્તર',
    kpiThreatValue: 'ડેફકોન 5 (સામાન્ય)',
    kpiThreatSub: '0 સક્રિય ઘૂસણખોરી ચેતવણીઓ',

    servicesTableTitle: 'એન્ટરપ્રાઇઝ ઇન્ટિગ્રેશન હેલ્થ અને માઇક્રોસર્વિસિસ (ડેમો ટેલિમેટ્રી)',
    colServiceName: 'સેવાનું નામ',
    colCategory: 'શ્રેણી',
    colLatency: 'લેટન્સી',
    colUptime90d: '90-દિવસ અપટાઇમ',
    colLastIncidentNote: 'છેલ્લી ઘટના નોંધ',
    colStatus: 'સ્થિતિ',
    statusOperationalBadge: '● કાર્યરત',

    userMgmtTitle: 'એન્ટરપ્રાઇઝ વપરાશકર્તા વ્યવસ્થાપન',
    userMgmtSubtitle: 'ખાતાઓ, વર્તુળ પેટા-વિભાગો અને સુરક્ષા લોકનું સંચાલન કરો',
    addStaffUserBtn: 'સ્ટાફ વપરાશકર્તા ઉમેરો',
    addStaffUserToast: 'નવા એન્ટરપ્રાઇઝ વપરાશકર્તા ઓનબોર્ડિંગ સંવાદ (ડેમો)',
    colUserId: 'વપરાશકર્તા ID',
    colNameEmail: 'નામ અને ઇમેઇલ',
    colRoleProfile: 'ભૂમિકા પ્રોફાઇલ',
    colSubdivision: 'પેટા-વિભાગ',
    colLastLogin: 'છેલ્લું લૉગિન',
    colActions: 'કાર્યવાહી',
    lockAccountBtn: 'ખાતું લોક કરો',
    unlockAccountBtn: 'અનલોક કરો',
    userAccessToggledToastPattern: 'વપરાશકર્તા {id} એક્સેસ સ્થિતિ બદલવામાં આવી (ડેમો)',

    rbacTitle: 'ભૂમિકા-આધારિત એક્સેસ કંટ્રોલ (RBAC) મેટ્રિક્સ',
    rbacSubtitle: '5 VidyutOne ઇકોસિસ્ટમ ભૂમિકાઓને નિયંત્રિત કરતા ઇન્ટરેક્ટિવ પરવાનગી ટૉગલ્સ',
    colEnterpriseModuleAction: 'એન્ટરપ્રાઇઝ મોડ્યુલ / કાર્યવાહી',
    colRoleConsumer: 'ગ્રાહક',
    colRoleEmployee: 'કચેરી કર્મચારી',
    colRoleField: 'ફિલ્ડ ઇજનેર',
    colRoleManagement: 'મેનેજમેન્ટ',
    colRoleAdmin: 'સિસ્ટમ એડમિન',
    rbacUpdatedToast: 'અસ્થાયી સત્રમાં પરવાનગી મેટ્રિક્સ અપડેટ કરવામાં આવ્યું',

    hitlQueueTitle: 'સુરક્ષા અને ગવર્નન્સ માનવ-નિયંત્રિત (Human-in-the-Loop) મંજૂરી કતાર',
    hitlQueueSubtitle: 'કર્મચારી, ફિલ્ડ, મેનેજમેન્ટ અને એડમિન પોર્ટલ પરની તમામ AI-પ્રસ્તાવિત કાર્યવાહીનું કેન્દ્રીય ઑડિટ.',
    hitlPendingBadgeSuffix: 'તમામ પોર્ટલ પર કુલ બાકી',
    colProposalId: 'પ્રસ્તાવ ID',
    colProposedActionEntity: 'પ્રસ્તાવિત કાર્યવાહી અને એકમ',
    colRequiredAuthority: 'જરૂરી સત્તા',
    colRiskLevel: 'જોખમ સ્તર',
    colLifecycleStatus: 'પ્રક્રિયા સ્થિતિ',
    colGovernanceReview: 'ગવર્નન્સ સમીક્ષા',
    noAiRecsEmpty: 'આ સત્રમાં કોઈ AI ભલામણ નોંધાયેલ નથી.',
    targetEntityPrefix: 'લક્ષ્ય:',
    authorizeSecurityActionBtn: 'સુરક્ષા કાર્યવાહી અધિકૃત કરો',
    inspectGovernanceRecordBtn: 'ગવર્નન્સ રેકોર્ડ તપાસો',

    auditStreamTitle: 'સિસ્ટમ ઑડિટ સ્ટ્રીમ અને સુરક્ષા ઘટનાઓ',
    auditStreamSubtitle: 'તમામ 5 પોર્ટલ પરના અપરિવર્તનીય સંચાલન લોગ્સ',
    auditSearchPlaceholder: 'ID, કર્તા અથવા કાર્યવાહી દ્વારા ફિલ્ટર કરો...',
    auditSearchAriaLabel: 'ઑડિટ લોગ્સ શોધો',
    filterAll: 'તમામ',
    filterSuccess: 'સફળ',
    filterWarning: 'ચેતવણી',
    filterFailed: 'નિષ્ફળ',
    colAuditEventId: 'ઑડિટ ઇવેન્ટ ID',
    colTimestamp: 'સમયનોંધ',
    colActorRole: 'કર્તા અને ભૂમિકા',
    colAction: 'કાર્યવાહી',
    colTargetResource: 'લક્ષ્ય સંસાધન',
    colOriginIp: 'મૂળ IP',
    noAuditEventsMatchPattern: 'સક્રિય ફિલ્ટર માપદંડ ({filter}) સાથે કોઈ ઑડિટ ઘટનાઓ મેળ ખાતી નથી.',
    auditPaginationSummaryPattern: '{total} ઑડિટ ઘટનાઓમાંથી {start}–{end} દર્શાવી રહ્યા છીએ',
    prevPageBtn: 'પાછળ',
    pageIndicatorPattern: 'પૃષ્ઠ {page} / {total}',
    nextPageBtn: 'આગળ',

    backupCardTitle: 'PostgreSQL એન્ટરપ્રાઇઝ ક્લસ્ટર બેકઅપ',
    backupCardDescription: 'ગુજરાત સ્ટેટ ડેટા સેન્ટર ખાતે રાત્રે 04:30 AM વાગ્યે રાઇટ-અહેડ લોગ (WAL) આર્કાઇવિંગ સાથે સ્વચાલિત ભૌતિક સ્નેપશોટ.',
    lastSnapshotLabel: 'છેલ્લો સ્નેપશોટ:',
    lastSnapshotValue: '15-ઓક્ટો-2026 04:30 AM (184.2 GB)',
    rpoRtoLabel: 'RPO / RTO લક્ષ્યાંક:',
    rpoRtoValue: '< 5 મિનિટ / < 15 મિનિટ',
    executingBackupBtn: 'બેકઅપ ચાલી રહ્યું છે...',
    triggerBackupBtn: 'મેન્યુઅલ બેકઅપ સ્નેપશોટ શરૂ કરો',
    backupTriggeredToast: 'સિમ્યુલેટેડ ડેટાબેઝ સ્નેપશોટ શરૂ કરવામાં આવ્યો (PostgreSQL ક્લસ્ટર)',
    backupCompletedToast: 'સિમ્યુલેટેડ સ્નેપશોટ પૂર્ણ: 184.6 GB GSDC કોલ્ડ સ્ટોરેજમાં આર્કાઇવ થયું',

    cyberResilienceTitle: 'સાયબર સ્થિતિસ્થાપકતા અને ડેટા સુરક્ષા',
    tlsCipherLabel: 'TLS 1.3 કડક સાઇફર સ્યુટ્સ',
    tlsCipherStatus: 'અમલીકૃત',
    aadhaarMaskingLabel: 'આધાર માસ્કિંગ (UIDAI સુસંગત)',
    aadhaarMaskingStatus: 'સક્રિય',
    scadaFirewallLabel: 'SCADA એર-ગેપ VPN ફાયરવોલ',
    scadaFirewallStatus: 'શ્રેષ્ઠ',

    settingsTitle: 'સિસ્ટમ રૂપરેખાંકન અને જાળવણી સમયગાળો',
    idleTimeoutLabel: 'પોર્ટલ નિષ્ક્રિય સત્ર સમયમર્યાદા',
    idleTimeoutDefaultValue: '30 મિનિટ (ઓટો-લોક)',
    patchScheduleLabel: 'સાપ્તાહિક પેચ જાળવણી સમયપત્રક',
    patchScheduleDefaultValue: 'દર રવિવારે 02:00 AM - 04:00 AM IST',
    saveConfigurationBtn: 'રૂપરેખાંકન સાચવો',
    settingsSavedToast: 'અસ્થાયી સત્રમાં સેટિંગ્સ સાચવવામાં આવી (ડેમો)',

    erpAdapterTitle: 'આઉટબાઉન્ડ યુટિલિટી ERP વેબહુક એડેપ્ટર અને ફેઇલ્ડ-સિંક કતાર',
    erpAdapterSubtitle: 'પ્રમાણભૂત SAP IS-U શૈલી ફિલ્ડ મેપિંગ, આઉટબાઉન્ડ સિંક લોગ, નિષ્ફળ કતાર અને પુનઃપ્રયાસ',
    erpSimulatedBadge: 'સિમ્યુલેટેડ ERP એડેપ્ટર (લાઇવ UGVCL જોડાણ નથી)',
    erpDisclosureBanner: 'સ્પષ્ટતા: આઉટબાઉન્ડ પેલોડ્સ VidyutFlow ના આંતરિક મોક ERP એડેપ્ટર પર ચકાસાય છે અને નોંધાય છે; UGVCL ના લાઇવ SAP/બિલિંગ સર્વર સાથે સીધું જોડાણ રોડમેપમાં છે.',
    erpMappingHeading: 'પ્રમાણભૂત VidyutFlow → Discom ERP ફિલ્ડ મેપિંગ કોષ્ટક',
    erpColSourceField: 'VidyutFlow ફિલ્ડ',
    erpColTargetField: 'ERP લક્ષ્ય ફિલ્ડ',
    erpColTransformRule: 'રૂપાંતરણ અને ચકાસણી નિયમ',
    erpColRequiredStage: 'જરૂરી તબક્કો',
    erpSyncLogHeading: 'ERP સિંક લોગ અને નિષ્ફળ-સિંક કતાર',
    erpFilterAll: 'તમામ સિંક લોગ',
    erpFilterFailedQueue: 'નિષ્ફળ કતાર',
    erpFilterSynced: 'સિંક થયેલ',
    erpBtnSyncRequest: 'ERP પર અરજી સિંક કરો',
    erpBtnSimulateFailure: '503 ટાઇમઆઉટ ટેસ્ટ (નિષ્ફળ કતાર ચકાસો)',
    erpBtnRetrySync: 'ફરી સિંક કરો',
    erpStatusSynced: 'સિંક થયેલ',
    erpStatusFailed: 'નિષ્ફળ',
    erpColApplicant: 'અરજી અને અરજદાર',
    erpColEvent: 'હેન્ડઓફ ઇવેન્ટ',
    erpColAttempts: 'પ્રયાસો',
    erpColRefOrError: 'ERP સંદર્ભ / નિષ્ફળતાનું કારણ',
    erpColAction: 'પુનઃપ્રાપ્તિ પગલું',
    erpEmptyLogs: 'પસંદ કરેલ ફિલ્ટર માટે કોઈ ERP સિંક નોંધ મળી નથી.'
  },

  hi: {
    logoAltText: 'UGVCL आधिकारिक लोगो',
    topBarTitle: 'IT अवसंरचना एवं साइबर सुरक्षा कंसोल',
    topBarBadge: 'सिम्युलेटेड कंट्रोल प्लेन',
    topBarSubtitlePrefix: 'UGVCL स्टेट डेटा सेंटर · एडमिन:',
    checkSslBtn: 'SSL प्रमाणपत्र जांचें',
    sslRenewedToast: 'सिम्युलेटेड ज़ीरो-डाउनटाइम प्रमाणपत्र नवीनीकरण पूर्ण',

    kpiMicroservicesTitle: 'कोर माइक्रोसर्विसेज स्वास्थ्य',
    kpiMicroservicesValue: '6 / 6 परिचालित',
    kpiMicroservicesSub: '99.98% संयुक्त अपटाइम',
    kpiGatewayTitle: 'API गेटवे थ्रूपुट',
    kpiGatewayValue: '2,480 req/min',
    kpiGatewaySub: 'माध्य विलंबता: 28 ms',
    kpiAmrTitle: 'स्मार्ट मीटर डेटा संग्रहण (AMR)',
    kpiAmrValue: '98.8% सिंक दर',
    kpiAmrSub: '15-मिनट अंतराल टेलीमेट्री',
    kpiThreatTitle: 'सुरक्षा खतरा स्तर',
    kpiThreatValue: 'डेफकॉन 5 (सामान्य)',
    kpiThreatSub: '0 सक्रिय घुसपैठ अलर्ट',

    servicesTableTitle: 'एंटरप्राइज एकीकरण स्वास्थ्य एवं माइक्रोसर्विसेज (डेमो टेलीमेट्री)',
    colServiceName: 'सेवा का नाम',
    colCategory: 'श्रेणी',
    colLatency: 'विलंबता (Latency)',
    colUptime90d: '90-दिवसीय अपटाइम',
    colLastIncidentNote: 'अंतिम घटना टिप्पणी',
    colStatus: 'स्थिति',
    statusOperationalBadge: '● परिचालित',

    userMgmtTitle: 'एंटरप्राइज उपयोगकर्ता प्रबंधन',
    userMgmtSubtitle: 'खातों, सर्कल उप-संभागों और सुरक्षा लॉक का प्रबंधन करें',
    addStaffUserBtn: 'स्टाफ उपयोगकर्ता जोड़ें',
    addStaffUserToast: 'नया एंटरप्राइज उपयोगकर्ता ऑनबोर्डिंग संवाद (डेमो)',
    colUserId: 'उपयोगकर्ता ID',
    colNameEmail: 'नाम एवं ईमेल',
    colRoleProfile: 'भूमिका प्रोफ़ाइल',
    colSubdivision: 'उप-संभाग',
    colLastLogin: 'अंतिम लॉगिन',
    colActions: 'कार्रवाई',
    lockAccountBtn: 'खाता लॉक करें',
    unlockAccountBtn: 'अनलॉक करें',
    userAccessToggledToastPattern: 'उपयोगकर्ता {id} एक्सेस स्थिति बदली गई (डेमो)',

    rbacTitle: 'भूमिका-आधारित एक्सेस नियंत्रण (RBAC) मैट्रिक्स',
    rbacSubtitle: '5 VidyutOne इकोसिस्टम भूमिकाओं को नियंत्रित करने वाले इंटरैक्टिव अनुमति टॉगल',
    colEnterpriseModuleAction: 'एंटरप्राइज मॉड्यूल / कार्रवाई',
    colRoleConsumer: 'उपभोक्ता',
    colRoleEmployee: 'कार्यालय कर्मचारी',
    colRoleField: 'फील्ड अभियंता',
    colRoleManagement: 'प्रबंधन',
    colRoleAdmin: 'सिस्टम एडमिन',
    rbacUpdatedToast: 'अस्थायी सत्र में अनुमति मैट्रिक्स अपडेट किया गया',

    hitlQueueTitle: 'सुरक्षा एवं गवर्नेंस मानव-नियंत्रित (Human-in-the-Loop) अनुमोदन कतार',
    hitlQueueSubtitle: 'कर्मचारी, फील्ड, प्रबंधन और एडमिन पोर्टलों में सभी AI-प्रस्तावित कार्रवाइयों का केंद्रीकृत ऑडिट।',
    hitlPendingBadgeSuffix: 'सभी पोर्टलों में कुल लंबित',
    colProposalId: 'प्रस्ताव ID',
    colProposedActionEntity: 'प्रस्तावित कार्रवाई एवं इकाई',
    colRequiredAuthority: 'आवश्यक प्राधिकारी',
    colRiskLevel: 'जोखिम स्तर',
    colLifecycleStatus: 'प्रक्रिया स्थिति',
    colGovernanceReview: 'गवर्नेंस समीक्षा',
    noAiRecsEmpty: 'इस सत्र में कोई AI अनुशंसा दर्ज नहीं है।',
    targetEntityPrefix: 'लक्ष्य:',
    authorizeSecurityActionBtn: 'सुरक्षा कार्रवाई अधिकृत करें',
    inspectGovernanceRecordBtn: 'गवर्नेंस रिकॉर्ड जांचें',

    auditStreamTitle: 'सिस्टम ऑडिट स्ट्रीम एवं सुरक्षा घटनाएं',
    auditStreamSubtitle: 'सभी 5 पोर्टलों में अपरिवर्तनीय परिचालन लॉग',
    auditSearchPlaceholder: 'ID, कर्ता या कार्रवाई द्वारा फ़िल्टर करें...',
    auditSearchAriaLabel: 'ऑडिट लॉग खोजें',
    filterAll: 'सभी',
    filterSuccess: 'सफल',
    filterWarning: 'चेतावनी',
    filterFailed: 'विफल',
    colAuditEventId: 'ऑडिट इवेंट ID',
    colTimestamp: 'समय-मुद्रा',
    colActorRole: 'कर्ता एवं भूमिका',
    colAction: 'कार्रवाई',
    colTargetResource: 'लक्षित संसाधन',
    colOriginIp: 'मूल IP',
    noAuditEventsMatchPattern: 'सक्रिय फ़िल्टर मानदंड ({filter}) से कोई ऑडिट घटना मेल नहीं खाती।',
    auditPaginationSummaryPattern: '{total} ऑडिट घटनाओं में से {start}–{end} प्रदर्शित',
    prevPageBtn: 'पिछला',
    pageIndicatorPattern: 'पृष्ठ {page} / {total}',
    nextPageBtn: 'अगला',

    backupCardTitle: 'PostgreSQL एंटरप्राइज क्लस्टर बैकअप',
    backupCardDescription: 'गुजरात स्टेट डेटा सेंटर में राइट-अहेड लॉग (WAL) संग्रहण के साथ प्रतिदिन रात्रि 04:30 AM पर स्वचालित भौतिक स्नैपशॉट।',
    lastSnapshotLabel: 'अंतिम स्नैपशॉट:',
    lastSnapshotValue: '15-अक्टू-2026 04:30 AM (184.2 GB)',
    rpoRtoLabel: 'RPO / RTO लक्ष्य:',
    rpoRtoValue: '< 5 मिनट / < 15 मिनट',
    executingBackupBtn: 'बैकअप निष्पादित हो रहा है...',
    triggerBackupBtn: 'मैनुअल बैकअप स्नैपशॉट ट्रिगर करें',
    backupTriggeredToast: 'सिम्युलेटेड डेटाबेस स्नैपशॉट शुरू किया गया (PostgreSQL क्लस्टर)',
    backupCompletedToast: 'सिम्युलेटेड स्नैपशॉट पूर्ण: 184.6 GB GSDC कोल्ड स्टोरेज में संग्रहीत',

    cyberResilienceTitle: 'साइबर लचीलापन एवं डेटा संरक्षण',
    tlsCipherLabel: 'TLS 1.3 सख्त साइफर सुइट्स',
    tlsCipherStatus: 'लागू (Enforced)',
    aadhaarMaskingLabel: 'आधार मास्किंग (UIDAI अनुपालित)',
    aadhaarMaskingStatus: 'सक्रिय',
    scadaFirewallLabel: 'SCADA एयर-गैप VPN फ़ायरवॉल',
    scadaFirewallStatus: 'इष्टतम',

    settingsTitle: 'सिस्टम कॉन्फ़िगरेशन एवं रखरखाव समय-सीमा',
    idleTimeoutLabel: 'पोर्टल निष्क्रिय सत्र समय-सीमा',
    idleTimeoutDefaultValue: '30 मिनट (ऑटो-लॉक)',
    patchScheduleLabel: 'साप्ताहिक पैच रखरखाव समय-सारणी',
    patchScheduleDefaultValue: 'प्रत्येक रविवार 02:00 AM - 04:00 AM IST',
    saveConfigurationBtn: 'कॉन्फ़िगरेशन सहेजें',
    settingsSavedToast: 'अस्थायी सत्र में सेटिंग्स सहेजी गईं (डेमो)',

    erpAdapterTitle: 'आउटबाउंड यूटिलिटी ERP वेबहुक एडेप्टर एवं विफल-सिंक कतार',
    erpAdapterSubtitle: 'मानक SAP IS-U शैली फ़ील्ड मैपिंग, आउटबाउंड सिंक लॉग, विफल कतार और पुनः प्रयास',
    erpSimulatedBadge: 'सिम्युलेटेड ERP एडेप्टर (लाइव UGVCL लिंक नहीं)',
    erpDisclosureBanner: 'स्पष्टता सूचना: आउटबाउंड पेलोड VidyutFlow के आंतरिक मॉक ERP एडेप्टर पर सत्यापित व लॉग किए जाते हैं; UGVCL के लाइव SAP/बिलिंग सर्वर से संयोजन रोडमैप में है।',
    erpMappingHeading: 'मानक VidyutFlow → Discom ERP फ़ील्ड मैपिंग तालिका',
    erpColSourceField: 'VidyutFlow फ़ील्ड',
    erpColTargetField: 'ERP लक्ष्य फ़ील्ड',
    erpColTransformRule: 'रूपांतरण एवं सत्यापन नियम',
    erpColRequiredStage: 'अनिवार्य चरण',
    erpSyncLogHeading: 'ERP सिंक लॉग एवं विफल-सिंक कतार',
    erpFilterAll: 'सभी सिंक लॉग',
    erpFilterFailedQueue: 'विफल कतार',
    erpFilterSynced: 'सिंक पूर्ण',
    erpBtnSyncRequest: 'ERP पर अनुरोध सिंक करें',
    erpBtnSimulateFailure: '503 टाइमआउट परीक्षण (विफल कतार जांचें)',
    erpBtnRetrySync: 'पुनः सिंक करें',
    erpStatusSynced: 'सिंक पूर्ण',
    erpStatusFailed: 'विफल',
    erpColApplicant: 'अनुरोध एवं आवेदक',
    erpColEvent: 'हैंडऑफ़ इवेंट',
    erpColAttempts: 'प्रयास',
    erpColRefOrError: 'ERP संदर्भ / विफलता कारण',
    erpColAction: 'पुनर्प्राप्ति कार्रवाई',
    erpEmptyLogs: 'चयनित फ़िल्टर के लिए कोई ERP सिंक प्रविष्टि नहीं मिली।'
  },

  mr: {
    logoAltText: 'UGVCL अधिकृत लोगो',
    topBarTitle: 'IT पायाभूत सुविधा आणि सायबर सुरक्षा कन्सोल',
    topBarBadge: 'सिम्युलेटेड कंट्रोल प्लेन',
    topBarSubtitlePrefix: 'UGVCL स्टेट डेटा सेंटर · ॲडमिन:',
    checkSslBtn: 'SSL प्रमाणपत्रे तपासा',
    sslRenewedToast: 'सिम्युलेटेड झिरो-डाउनटाइम प्रमाणपत्र नूतनीकरण पूर्ण',

    kpiMicroservicesTitle: 'मुख्य मायक्रोसर्व्हिसेस आरोग्य',
    kpiMicroservicesValue: '6 / 6 कार्यरत',
    kpiMicroservicesSub: '99.98% एकत्रित अपटाइम',
    kpiGatewayTitle: 'API गेटवे थ्रूपुट',
    kpiGatewayValue: '2,480 req/min',
    kpiGatewaySub: 'सरासरी विलंबता: 28 ms',
    kpiAmrTitle: 'स्मार्ट मीटर डेटा संकलन (AMR)',
    kpiAmrValue: '98.8% सिंक दर',
    kpiAmrSub: '15-मिनिट अंतराने टेलिमेट्री',
    kpiThreatTitle: 'सुरक्षा धोका पातळी',
    kpiThreatValue: 'डेफकॉन 5 (सामान्य)',
    kpiThreatSub: '0 सक्रिय घुसखोरी इशारे',

    servicesTableTitle: 'एंटरप्राइझ एकत्रीकरण आरोग्य आणि मायक्रोसर्व्हिसेस (डेमो टेलिमेट्री)',
    colServiceName: 'सेवेचे नाव',
    colCategory: 'श्रेणी',
    colLatency: 'विलंबता (Latency)',
    colUptime90d: '90-दिवस अपटाइम',
    colLastIncidentNote: 'शेवटची घटना नोंद',
    colStatus: 'स्थिती',
    statusOperationalBadge: '● कार्यरत',

    userMgmtTitle: 'एंटरप्राइझ वापरकर्ता व्यवस्थापन',
    userMgmtSubtitle: 'खाती, मंडळ उप-विभाग आणि सुरक्षा लॉक व्यवस्थापित करा',
    addStaffUserBtn: 'कर्मचारी वापरकर्ता जोडा',
    addStaffUserToast: 'नवीन एंटरप्राइझ वापरकर्ता ऑनबोर्डिंग संवाद (डेमो)',
    colUserId: 'वापरकर्ता ID',
    colNameEmail: 'नाव आणि ईमेल',
    colRoleProfile: 'भूमिका प्रोफाइल',
    colSubdivision: 'उप-विभाग',
    colLastLogin: 'शेवटचे लॉगिन',
    colActions: 'कृती',
    lockAccountBtn: 'खाते लॉक करा',
    unlockAccountBtn: 'अनलॉक करा',
    userAccessToggledToastPattern: 'वापरकर्ता {id} ॲक्सेस स्थिती बदलली (डेमो)',

    rbacTitle: 'भूमिका-आधारित ॲक्सेस नियंत्रण (RBAC) मॅट्रिक्स',
    rbacSubtitle: '5 VidyutOne इकोसिस्टम भूमिका नियंत्रित करणारे इंटरॲक्टिव्ह परवानगी टॉगल',
    colEnterpriseModuleAction: 'एंटरप्राइझ मॉड्यूल / कृती',
    colRoleConsumer: 'ग्राहक',
    colRoleEmployee: 'कार्यालय कर्मचारी',
    colRoleField: 'फील्ड अभियंता',
    colRoleManagement: 'व्यवस्थापन',
    colRoleAdmin: 'सिस्टम ॲडमिन',
    rbacUpdatedToast: 'तात्पुरत्या सत्रात परवानगी मॅट्रिक्स अद्यतनित केले',

    hitlQueueTitle: 'सुरक्षा आणि गव्हर्नन्स मानव-नियंत्रित (Human-in-the-Loop) मंजुरी रांग',
    hitlQueueSubtitle: 'कर्मचारी, फील्ड, व्यवस्थापन आणि ॲडमिन पोर्टलवरील सर्व AI-प्रस्तावित कृतींचे केंद्रीकृत ऑडिट.',
    hitlPendingBadgeSuffix: 'सर्व पोर्टलवर एकूण प्रलंबित',
    colProposalId: 'प्रस्ताव ID',
    colProposedActionEntity: 'प्रस्तावित कृती आणि घटक',
    colRequiredAuthority: 'आवश्यक प्राधिकरण',
    colRiskLevel: 'जोखीम पातळी',
    colLifecycleStatus: 'प्रक्रिया स्थिती',
    colGovernanceReview: 'गव्हर्नन्स पुनरावलोकन',
    noAiRecsEmpty: 'या सत्रात कोणतीही AI शिफारस नोंदवलेली नाही.',
    targetEntityPrefix: 'लक्ष्य:',
    authorizeSecurityActionBtn: 'सुरक्षा कृती अधिकृत करा',
    inspectGovernanceRecordBtn: 'गव्हर्नन्स रेकॉर्ड तपासा',

    auditStreamTitle: 'सिस्टम ऑडिट स्ट्रीम आणि सुरक्षा घटना',
    auditStreamSubtitle: 'सर्व 5 पोर्टलवरील अपरिवर्तनीय परिचालन लॉग',
    auditSearchPlaceholder: 'ID, कर्ता किंवा कृतीनुसार फिल्टर करा...',
    auditSearchAriaLabel: 'ऑडिट लॉग शोधा',
    filterAll: 'सर्व',
    filterSuccess: 'यशस्वी',
    filterWarning: 'इशारा',
    filterFailed: 'अयशस्वी',
    colAuditEventId: 'ऑडिट इव्हेंट ID',
    colTimestamp: 'वेळ-नोंद',
    colActorRole: 'कर्ता आणि भूमिका',
    colAction: 'कृती',
    colTargetResource: 'लक्षित संसाधन',
    colOriginIp: 'मूळ IP',
    noAuditEventsMatchPattern: 'सक्रिय फिल्टर निकषांशी ({filter}) कोणतीही ऑडिट घटना जुळत नाही.',
    auditPaginationSummaryPattern: '{total} ऑडिट घटनांपैकी {start}–{end} दर्शवत आहे',
    prevPageBtn: 'मागील',
    pageIndicatorPattern: 'पृष्ठ {page} / {total}',
    nextPageBtn: 'पुढील',

    backupCardTitle: 'PostgreSQL एंटरप्राइझ क्लस्टर बॅकअप',
    backupCardDescription: 'गुजरात स्टेट डेटा सेंटरमध्ये राईट-अहेड लॉग (WAL) संग्रहासह दररोज रात्री 04:30 AM वाजता स्वयंचलित भौतिक स्नॅपशॉट.',
    lastSnapshotLabel: 'शेवटचा स्नॅपशॉट:',
    lastSnapshotValue: '15-ऑक्टो-2026 04:30 AM (184.2 GB)',
    rpoRtoLabel: 'RPO / RTO उद्दिष्ट:',
    rpoRtoValue: '< 5 मिनिटे / < 15 मिनिटे',
    executingBackupBtn: 'बॅकअप सुरू आहे...',
    triggerBackupBtn: 'मॅन्युअल बॅकअप स्नॅपशॉट सुरू करा',
    backupTriggeredToast: 'सिम्युलेटेड डेटाबेस स्नॅपशॉट सुरू केला (PostgreSQL क्लस्टर)',
    backupCompletedToast: 'सिम्युलेटेड स्नॅपशॉट पूर्ण: 184.6 GB GSDC कोल्ड स्टोरेजमध्ये संग्रहित',

    cyberResilienceTitle: 'सायबर लवचिकता आणि डेटा संरक्षण',
    tlsCipherLabel: 'TLS 1.3 कठोर सायफर सुइट्स',
    tlsCipherStatus: 'लागू केलेले',
    aadhaarMaskingLabel: 'आधार मास्किंग (UIDAI सुसंगत)',
    aadhaarMaskingStatus: 'सक्रिय',
    scadaFirewallLabel: 'SCADA एअर-गॅप VPN फायरवॉल',
    scadaFirewallStatus: 'उत्तम',

    settingsTitle: 'सिस्टम कॉन्फिगरेशन आणि देखभाल कालावधी',
    idleTimeoutLabel: 'पोर्टल निष्क्रिय सत्र कालमर्यादा',
    idleTimeoutDefaultValue: '30 मिनिटे (ऑटो-लॉक)',
    patchScheduleLabel: 'साप्ताहिक पॅच देखभाल वेळापत्रक',
    patchScheduleDefaultValue: 'दर रविवारी 02:00 AM - 04:00 AM IST',
    saveConfigurationBtn: 'कॉन्फिगरेशन जतन करा',
    settingsSavedToast: 'तात्पुरत्या सत्रात सेटिंग्ज जतन केल्या (डेमो)',

    erpAdapterTitle: 'आउटबाउंड युटिलिटी ERP वेबहुक अडॅप्टर आणि अयशस्वी-सिंक रांग',
    erpAdapterSubtitle: 'प्रमाणित SAP IS-U शैली फील्ड मॅपिंग, आउटबाउंड सिंक लॉग, अयशस्वी रांग आणि पुन्हा प्रयत्न',
    erpSimulatedBadge: 'सिम्युलेटेड ERP अडॅप्टर (लाईव्ह UGVCL जोडणी नाही)',
    erpDisclosureBanner: 'स्पष्टता सूचना: आउटबाउंड पेलोड्स VidyutFlow च्या अंतर्गत मॉक ERP अडॅप्टरवर तपासले व नोंदवले जातात; UGVCL च्या लाईव्ह SAP/बिलिंग सर्व्हरशी जोडणी रोडमॅपमध्ये आहे.',
    erpMappingHeading: 'प्रमाणित VidyutFlow → Discom ERP फील्ड मॅपिंग तक्ता',
    erpColSourceField: 'VidyutFlow फील्ड',
    erpColTargetField: 'ERP लक्ष्य फील्ड',
    erpColTransformRule: 'रूपांतरण आणि पडताळणी नियम',
    erpColRequiredStage: 'आवश्यक टप्पा',
    erpSyncLogHeading: 'ERP सिंक लॉग आणि अयशस्वी-सिंक रांग',
    erpFilterAll: 'सर्व सिंक लॉग',
    erpFilterFailedQueue: 'अयशस्वी रांग',
    erpFilterSynced: 'सिंक पूर्ण',
    erpBtnSyncRequest: 'ERP वर अर्ज सिंक करा',
    erpBtnSimulateFailure: '503 टाईमआउट चाचणी (अयशस्वी रांग तपासा)',
    erpBtnRetrySync: 'पुन्हा सिंक करा',
    erpStatusSynced: 'सिंक पूर्ण',
    erpStatusFailed: 'अयशस्वी',
    erpColApplicant: 'अर्ज आणि अर्जदार',
    erpColEvent: 'हँडऑफ इव्हेंट',
    erpColAttempts: 'प्रयत्न',
    erpColRefOrError: 'ERP संदर्भ / अपयशाचे कारण',
    erpColAction: 'पुनर्प्राप्ती कृती',
    erpEmptyLogs: 'निवडलेल्या फिल्टरसाठी कोणतीही ERP सिंक नोंद आढळली नाही.'
  }
};

export function getAdminUiDictionary(lang: LanguageCode): AdminUiDictionary {
  return ADMIN_UI_TRANSLATIONS[lang] || ADMIN_UI_TRANSLATIONS.en;
}

export function localizeSystemService(
  svc: SystemServiceStatus,
  lang: LanguageCode
): {
  name: string;
  category: string;
  lastIncident: string;
  statusBadge: string;
} {
  if (lang === 'en') {
    return {
      name: svc.name,
      category: svc.category,
      lastIncident: svc.lastIncident,
      statusBadge: svc.status
    };
  }

  const nameMap: Record<string, Record<LanguageCode, string>> = {
    'AMR / Smart Meter Head-End System (HES)': {
      en: 'AMR / Smart Meter Head-End System (HES)',
      gu: 'AMR / સ્માર્ટ મીટર હેડ-એન્ડ સિસ્ટમ (HES)',
      hi: 'AMR / स्मार्ट मीटर हेड-एंड सिस्टम (HES)',
      mr: 'AMR / स्मार्ट मीटर हेड-एंड सिस्टम (HES)'
    },
    'SAP-ISU Billing Engine Bridge': {
      en: 'SAP-ISU Billing Engine Bridge',
      gu: 'SAP-ISU બિલિંગ એન્જિન બ્રિજ',
      hi: 'SAP-ISU बिलिंग इंजन ब्रिज',
      mr: 'SAP-ISU बिलिंग इंजिन ब्रिज'
    },
    'Citizen Portal & Mobile Service Gateway': {
      en: 'Citizen Portal & Mobile Service Gateway',
      gu: 'નાગરિક પોર્ટલ અને મોબાઇલ સર્વિસ ગેટવે',
      hi: 'नागरिक पोर्टल एवं मोबाइल सेवा गेटवे',
      mr: 'नागरિક पोर्टल आणि मोबाईल सेवा गेटवे'
    },
    'SCADA Substation Telemetry Ingestion (132/66/11kV)': {
      en: 'SCADA Substation Telemetry Ingestion (132/66/11kV)',
      gu: 'SCADA સબસ્ટેશન ટેલિમેટ્રી સંકલન (132/66/11kV)',
      hi: 'SCADA सबस्टेशन टेलीमेट्री संग्रहण (132/66/11kV)',
      mr: 'SCADA उपकेंद्र टेलिमेट्री संकलन (132/66/11kV)'
    },
    'Gujarat State Data Center Secured Tunnel (GSDC)': {
      en: 'Gujarat State Data Center Secured Tunnel (GSDC)',
      gu: 'ગુજરાત સ્ટેટ ડેટા સેન્ટર સુરક્ષિત ટનલ (GSDC)',
      hi: 'गुजरात स्टेट डेटा सेंटर सुरक्षित टनल (GSDC)',
      mr: 'गुजरात स्टेट डेटा सेंटर सुरक्षित टनेल (GSDC)'
    },
    'Bharat Bill Payment System (BBPS) Real-time Sync': {
      en: 'Bharat Bill Payment System (BBPS) Real-time Sync',
      gu: 'ભારત બિલ પેમેન્ટ સિસ્ટમ (BBPS) રીઅલ-ટાઇમ સિંક',
      hi: 'भारत बिल भुगतान प्रणाली (BBPS) रीयल-टाइम सिंक',
      mr: 'भारत बिल पेमेंट सिस्टम (BBPS) रिअल-टाइम सिंक'
    }
  };

  const categoryMap: Record<string, Record<LanguageCode, string>> = {
    'Metering & AMR': {
      en: 'Metering & AMR',
      gu: 'મીટરિંગ અને AMR',
      hi: 'मीटरिंग एवं AMR',
      mr: 'मीटरिंग आणि AMR'
    },
    'Billing & Rev': {
      en: 'Billing & Rev',
      gu: 'બિલિંગ અને મહેસૂલ',
      hi: 'बिलिंग एवं राजस्व',
      mr: 'बिलिंग आणि महसूल'
    },
    'Citizen Portals': {
      en: 'Citizen Portals',
      gu: 'નાગરિક પોર્ટલ',
      hi: 'नागरिक पोर्टल',
      mr: 'नागरिक पोर्टल'
    },
    'Core ERP': {
      en: 'Core ERP',
      gu: 'કોર ERP',
      hi: 'कोर ERP',
      mr: 'कोअर ERP'
    },
    Security: {
      en: 'Security',
      gu: 'સુરક્ષા',
      hi: 'सुरक्षा',
      mr: 'सुरक्षा'
    }
  };

  const incidentMap: Record<string, Record<LanguageCode, string>> = {
    'None in past 30 days': {
      en: 'None in past 30 days',
      gu: 'છેલ્લા 30 દિવસમાં કોઈ નહીં',
      hi: 'पिछले 30 दिनों में कोई नहीं',
      mr: 'मागील 30 दिवसांत काहीही नाही'
    },
    'Batch reconciliation delay (2-Oct-2026)': {
      en: 'Batch reconciliation delay (2-Oct-2026)',
      gu: 'બેચ હિસાબ મેળવણી વિલંબ (2-ઓક્ટો-2026)',
      hi: 'बैच मिलान विलंब (2-अक्टू-2026)',
      mr: 'बॅच ताळमेळ विलंब (2-ऑक्टो-2026)'
    },
    'Scheduled patch (28-Sep-2026)': {
      en: 'Scheduled patch (28-Sep-2026)',
      gu: 'નિર્ધારિત પેચ અપડેટ (28-સપ્ટે-2026)',
      hi: 'निर्धारित पैच अपडेट (28-सितं-2026)',
      mr: 'नियोजित पॅच अद्यतन (28-सप्टें-2026)'
    },
    'None in past 90 days': {
      en: 'None in past 90 days',
      gu: 'છેલ્લા 90 દિવસમાં કોઈ નહીં',
      hi: 'पिछले 90 दिनों में कोई नहीं',
      mr: 'मागील 90 दिवसांत काहीही नाही'
    },
    'External NPCI gateway timeout (11-Oct-2026)': {
      en: 'External NPCI gateway timeout (11-Oct-2026)',
      gu: 'બાહ્ય NPCI ગેટવે ટાઇમઆઉટ (11-ઓક્ટો-2026)',
      hi: 'बाह्य NPCI गेटवे टाइमआउट (11-अक्टू-2026)',
      mr: 'बाह्य NPCI गेटवे टाइमआउट (11-ऑक्टो-2026)'
    }
  };

  const statusMap: Record<string, Record<LanguageCode, string>> = {
    Operational: {
      en: 'Operational',
      gu: 'કાર્યરત',
      hi: 'परिचालित',
      mr: 'कार्यरत'
    },
    Degraded: {
      en: 'Degraded',
      gu: 'ધીમી ગતિ',
      hi: 'आंशिक बाधित',
      mr: 'अंशतः बाधित'
    },
    Down: {
      en: 'Down',
      gu: 'બંધ',
      hi: 'बंद',
      mr: 'बंद'
    }
  };

  return {
    name: nameMap[svc.name]?.[lang] || svc.name,
    category: categoryMap[svc.category]?.[lang] || svc.category,
    lastIncident: incidentMap[svc.lastIncident]?.[lang] || svc.lastIncident,
    statusBadge: statusMap[svc.status]?.[lang] || svc.status
  };
}

export function localizeAdminUserRole(role: string, lang: LanguageCode): string {
  if (!role || lang === 'en') return role;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Office Employee ERP': {
      en: 'Office Employee ERP',
      gu: 'કચેરી કર્મચારી ERP',
      hi: 'कार्यालय कर्मचारी ERP',
      mr: 'कार्यालय कर्मचारी ERP'
    },
    'Field Engineer': {
      en: 'Field Engineer',
      gu: 'ફિલ્ડ ઇજનેર',
      hi: 'फील्ड अभियंता',
      mr: 'फील्ड अभियंता'
    },
    Management: {
      en: 'Management',
      gu: 'મેનેજમેન્ટ',
      hi: 'प्रबंधन',
      mr: 'व्यवस्थापन'
    },
    'System Administrator': {
      en: 'System Administrator',
      gu: 'સિસ્ટમ એડમિનિસ્ટ્રેટર',
      hi: 'सिस्टम प्रशासक',
      mr: 'सिस्टम प्रशासक'
    },
    'Consumer Portal': {
      en: 'Consumer Portal',
      gu: 'ગ્રાહક પોર્ટલ',
      hi: 'उपभोक्ता पोर्टल',
      mr: 'ग्राहक पोर्टल'
    },
    'System Scheduler': {
      en: 'System Scheduler',
      gu: 'સિસ્ટમ શેડ્યૂલર',
      hi: 'सिस्टम शेड्यूलर',
      mr: 'सिस्टम शेड्यूलर'
    },
    'External Gateway': {
      en: 'External Gateway',
      gu: 'બાહ્ય ગેટવે',
      hi: 'बाह्य गेटवे',
      mr: 'बाह्य गेटवे'
    }
  };
  return map[role]?.[lang] || role;
}

export function localizeAdminUserStatus(status: string, lang: LanguageCode): string {
  if (!status || lang === 'en') return status;
  const map: Record<string, Record<LanguageCode, string>> = {
    Active: {
      en: 'Active',
      gu: 'સક્રિય',
      hi: 'सक्रिय',
      mr: 'सक्रिय'
    },
    Locked: {
      en: 'Locked',
      gu: 'લોક કરેલ',
      hi: 'लॉक किया गया',
      mr: 'लॉक केलेले'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizeAdminSubdivision(subdiv: string, lang: LanguageCode): string {
  if (!subdiv || lang === 'en') return subdiv;
  const adminSubdivMap: Record<string, Record<LanguageCode, string>> = {
    'Mehsana Rural Feeder Wing': {
      en: 'Mehsana Rural Feeder Wing',
      gu: 'મહેસાણા ગ્રામ્ય ફીડર વિંગ',
      hi: 'मेहसाणा ग्रामीण फीडर विंग',
      mr: 'मेहसाणा ग्रामीण फिडर विंग'
    },
    'UGVCL Corporate Mehsana': {
      en: 'UGVCL Corporate Mehsana',
      gu: 'UGVCL કોર્પોરેટ મહેસાણા',
      hi: 'UGVCL कॉर्पोरेट मेहसाणा',
      mr: 'UGVCL कॉर्पोरेट मेहसाणा'
    },
    'State Data Center / IT Cell': {
      en: 'State Data Center / IT Cell',
      gu: 'સ્ટેટ ડેટા સેન્ટર / IT સેલ',
      hi: 'स्टेट डेटा सेंटर / IT सेल',
      mr: 'स्टेट डेटा सेंटर / IT सेल'
    }
  };
  if (adminSubdivMap[subdiv]?.[lang]) {
    return adminSubdivMap[subdiv][lang];
  }
  return localizeSubdivision(subdiv, lang);
}

export function localizeRbacModuleName(moduleName: string, lang: LanguageCode): string {
  if (!moduleName || lang === 'en') return moduleName;
  const map: Record<string, Record<LanguageCode, string>> = {
    'New Connection Sanction Approval': {
      en: 'New Connection Sanction Approval',
      gu: 'નવા વીજ જોડાણ લોડ મંજૂરી પરવાનગી',
      hi: 'नवीन कनेक्शन लोड स्वीकृति अनुमोदन',
      mr: 'नवीन वीज जोडणी भार मंजुरी परवानगी'
    },
    'Field Feasibility & Meter Audit Submission': {
      en: 'Field Feasibility & Meter Audit Submission',
      gu: 'સ્થળ શક્યતા અને મીટર ઑડિટ સબમિશન',
      hi: 'फील्ड व्यवहार्यता एवं मीटर ऑडिट प्रस्तुतिकरण',
      mr: 'स्थळ व्यवहार्यता आणि मीटर ऑडिट सादरीकरण'
    },
    'Electricity Bill Adjustment & Tariff Modification': {
      en: 'Electricity Bill Adjustment & Tariff Modification',
      gu: 'વીજ બિલ સમાયોજન અને ટેરિફ ફેરફાર',
      hi: 'बिजली बिल समायोजन एवं टैरिफ संशोधन',
      mr: 'वीज बिल समायोजन आणि टॅरिफ बदल'
    },
    'Grievance Redressal Dispatch & Closure': {
      en: 'Grievance Redressal Dispatch & Closure',
      gu: 'ફરિયાદ નિવારણ રવાનગી અને સમાપ્તિ',
      hi: 'शिकायत निवारण प्रेषण एवं समापन',
      mr: 'तक्रार निवारण रवानगी आणि समाप्ती'
    },
    'Citizen Bill Payment & Self Service Portal': {
      en: 'Citizen Bill Payment & Self Service Portal',
      gu: 'નાગરિક બિલ ચુકવણી અને સ્વ-સેવા પોર્ટલ',
      hi: 'नागरिक बिल भुगतान एवं स्व-सेवा पोर्टल',
      mr: 'नागरिक बिल भरणा आणि स्वयं-सेवा पोर्टल'
    },
    'SCADA Feeder Telemetry & AT&C Loss Dashboard': {
      en: 'SCADA Feeder Telemetry & AT&C Loss Dashboard',
      gu: 'SCADA ફીડર ટેલિમેટ્રી અને AT&C લોસ ડેશબોર્ડ',
      hi: 'SCADA फीडर टेलीमेट्री एवं AT&C हानि डैशबोर्ड',
      mr: 'SCADA फिडर टेलिमेट्री आणि AT&C हानी डॅशबोर्ड'
    },
    'RBAC Security Matrix & System Audit Logs': {
      en: 'RBAC Security Matrix & System Audit Logs',
      gu: 'RBAC સુરક્ષા મેટ્રિક્સ અને સિસ્ટમ ઑડિટ લોગ્સ',
      hi: 'RBAC सुरक्षा मैट्रिक्स एवं सिस्टम ऑडिट लॉग',
      mr: 'RBAC सुरक्षा मॅट्रिक्स आणि सिस्टम ऑडिट लॉग'
    }
  };
  return map[moduleName]?.[lang] || moduleName;
}

export function localizeRbacToggleAria(
  moduleName: string,
  roleKey: 'consumer' | 'employee' | 'field' | 'management' | 'admin',
  lang: LanguageCode
): string {
  if (lang === 'en') {
    return `Toggle ${moduleName} permission for ${roleKey}`;
  }
  const modLabel = localizeRbacModuleName(moduleName, lang);
  const dict = getAdminUiDictionary(lang);
  const roleLabelMap: Record<typeof roleKey, string> = {
    consumer: dict.colRoleConsumer,
    employee: dict.colRoleEmployee,
    field: dict.colRoleField,
    management: dict.colRoleManagement,
    admin: dict.colRoleAdmin
  };
  const roleLabel = roleLabelMap[roleKey];
  if (lang === 'gu') return `${roleLabel} માટે ${modLabel} પરવાનગી ટૉગલ કરો`;
  if (lang === 'hi') return `${roleLabel} के लिए ${modLabel} अनुमति टॉगल करें`;
  return `${roleLabel} साठी ${modLabel} परवानगी टॉगल करा`;
}

export function localizeAuditStatusFilter(
  status: 'ALL' | 'SUCCESS' | 'WARNING' | 'FAILED',
  lang: LanguageCode
): string {
  const dict = getAdminUiDictionary(lang);
  if (status === 'ALL') return dict.filterAll;
  if (status === 'SUCCESS') return dict.filterSuccess;
  if (status === 'WARNING') return dict.filterWarning;
  return dict.filterFailed;
}

export function localizeAuditTimestamp(timestamp: string, lang: LanguageCode): string {
  if (!timestamp || lang === 'en') return timestamp;
  const shortMonthMap: Record<string, Record<LanguageCode, string>> = {
    Jan: { en: 'Jan', gu: 'જાન્યુ', hi: 'जन', mr: 'जाने' },
    Feb: { en: 'Feb', gu: 'ફેબ્રુ', hi: 'फ़र', mr: 'फेब्रु' },
    Mar: { en: 'Mar', gu: 'માર્ચ', hi: 'मार्च', mr: 'मार्च' },
    Apr: { en: 'Apr', gu: 'એપ્રિલ', hi: 'अप्रै', mr: 'एप्रि' },
    May: { en: 'May', gu: 'મે', hi: 'मई', mr: 'मे' },
    Jun: { en: 'Jun', gu: 'જૂન', hi: 'जून', mr: 'जून' },
    Jul: { en: 'Jul', gu: 'જુલાઈ', hi: 'जुला', mr: 'जुलै' },
    Aug: { en: 'Aug', gu: 'ઓગસ્ટ', hi: 'अग', mr: 'ऑग' },
    Sep: { en: 'Sep', gu: 'સપ્ટે', hi: 'सितं', mr: 'सप्टें' },
    Oct: { en: 'Oct', gu: 'ઓક્ટો', hi: 'अक्टू', mr: 'ऑक्टो' },
    Nov: { en: 'Nov', gu: 'નવે', hi: 'नवं', mr: 'नोव्हें' },
    Dec: { en: 'Dec', gu: 'ડિસે', hi: 'दिसं', mr: 'डिसें' }
  };
  let m = timestamp.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})\s+(.+)$/);
  if (m) {
    const [, dd, mon, yyyy, timePart] = m;
    const locMon = shortMonthMap[mon]?.[lang] || mon;
    return `${dd}-${locMon}-${yyyy} ${timePart}`;
  }
  return localizeNotificationTimestamp(timestamp, lang);
}

export function localizeAuditLogEntry(
  log: AuditLogItem,
  lang: LanguageCode
): {
  timestamp: string;
  actor: string;
  role: string;
  actionLabel: string;
  resource: string;
  ipAddress: string;
  statusBadge: string;
} {
  if (lang === 'en') {
    return {
      timestamp: log.timestamp,
      actor: log.actor,
      role: log.role,
      actionLabel: log.action,
      resource: log.resource,
      ipAddress: log.ipAddress,
      statusBadge: log.status === 'SUCCESS' ? '● SUCCESS' : `▲ ${log.status}`
    };
  }

  const roleMap: Record<string, Record<LanguageCode, string>> = {
    'Office Employee ERP': {
      en: 'Office Employee ERP',
      gu: 'કચેરી કર્મચારી ERP',
      hi: 'कार्यालय कर्मचारी ERP',
      mr: 'कार्यालय कर्मचारी ERP'
    },
    'Field Engineer': {
      en: 'Field Engineer',
      gu: 'ફિલ્ડ ઇજનેર',
      hi: 'फील्ड अभियंता',
      mr: 'फील्ड अभियंता'
    },
    'System Scheduler': {
      en: 'System Scheduler',
      gu: 'સિસ્ટમ શેડ્યૂલર',
      hi: 'सिस्टम शेड्यूलर',
      mr: 'सिस्टम शेड्यूलर'
    },
    'External Gateway': {
      en: 'External Gateway',
      gu: 'બાહ્ય ગેટવે',
      hi: 'बाह्य गेटवे',
      mr: 'बाह्य गेटवे'
    },
    'Consumer Portal': {
      en: 'Consumer Portal',
      gu: 'ગ્રાહક પોર્ટલ',
      hi: 'उपभोक्ता पोर्टल',
      mr: 'ग्राहक पोर्टल'
    },
    'Residential Consumer': {
      en: 'Residential Consumer',
      gu: 'રહેણાંક ગ્રાહક',
      hi: 'आवासीय उपभोक्ता',
      mr: 'निवासी ग्राहक'
    },
    'Sub-Division Officer': {
      en: 'Sub-Division Officer',
      gu: 'પેટા-વિભાગ અધિકારી',
      hi: 'उप-संभाग अधिकारी',
      mr: 'उप-विभाग अधिकारी'
    },
    'Field Operations JE': {
      en: 'Field Operations JE',
      gu: 'ફિલ્ડ સંચાલન JE',
      hi: 'फील्ड परिचालन JE',
      mr: 'फील्ड परिचालन JE'
    },
    'Executive Circle Head': {
      en: 'Executive Circle Head',
      gu: 'કાર્યપાલક વર્તુળ વડા',
      hi: 'कार्यपालक सर्कल प्रमुख',
      mr: 'कार्यकारी मंडळ प्रमुख'
    },
    'IT & Cyber Resilience': {
      en: 'IT & Cyber Resilience',
      gu: 'IT અને સાયબર સુરક્ષા',
      hi: 'IT एवं साइबर सुरक्षा',
      mr: 'IT आणि सायबर सुरक्षा'
    }
  };

  const actionMap: Record<string, Record<LanguageCode, string>> = {
    SANCTION_ESTIMATE_APPROVED: {
      en: 'SANCTION_ESTIMATE_APPROVED',
      gu: 'લોડ મંજૂરી અંદાજપત્ર પાસ',
      hi: 'लोड स्वीकृति प्राक्कलन अनुमोदित',
      mr: 'भार मंजुरी अंदाजपत्रक मंजूर'
    },
    WORK_ORDER_STATUS_UPDATE: {
      en: 'WORK_ORDER_STATUS_UPDATE',
      gu: 'વર્ક ઓર્ડર સ્થિતિ અપડેટ',
      hi: 'वर्क ऑर्डर स्थिति अपडेट',
      mr: 'वर्क ऑर्डर स्थिती अद्यतन'
    },
    WORK_ORDER_STATUS_UPDATED: {
      en: 'WORK_ORDER_STATUS_UPDATED',
      gu: 'વર્ક ઓર્ડર સ્થિતિ અપડેટ થઈ',
      hi: 'वर्क ऑर्डर स्थिति अपडेट की गई',
      mr: 'वर्क ऑर्डर स्थिती अद्यतनित केली'
    },
    DAILY_BACKUP_EXECUTION: {
      en: 'DAILY_BACKUP_EXECUTION',
      gu: 'દૈનિક બેકઅપ અમલીકરણ',
      hi: 'दैनिक बैकअप निष्पादन',
      mr: 'दैनिक बॅकअप अंमलबजावणी'
    },
    FAILED_PORTAL_LOGIN_ATTEMPT: {
      en: 'FAILED_PORTAL_LOGIN_ATTEMPT',
      gu: 'નિષ્ફળ પોર્ટલ લૉગિન પ્રયાસ',
      hi: 'विफल पोर्टल लॉगिन प्रयास',
      mr: 'अयशस्वी पोर्टल लॉगिन प्रयत्न'
    },
    GRIEVANCE_REGISTERED: {
      en: 'GRIEVANCE_REGISTERED',
      gu: 'ફરિયાદ નોંધવામાં આવી',
      hi: 'शिकायत पंजीकृत की गई',
      mr: 'तक्रार नोंदवली गेली'
    },
    GRIEVANCE_STATUS_UPDATED: {
      en: 'GRIEVANCE_STATUS_UPDATED',
      gu: 'ફરિયાદ સ્થિતિ અપડેટ થઈ',
      hi: 'शिकायत स्थिति अपडेट की गई',
      mr: 'तक्रार स्थिती अद्यतनित केली'
    },
    COMPLAINT_ASSIGNED_TO_FIELD: {
      en: 'COMPLAINT_ASSIGNED_TO_FIELD',
      gu: 'ફરિયાદ ફિલ્ડ ટીમને સોંપાઈ',
      hi: 'शिकायत फील्ड टीम को सौंपी गई',
      mr: 'तक्रार फील्ड पथकाकडे सोपवली'
    },
    DEMO_AUTH_LOGIN: {
      en: 'DEMO_AUTH_LOGIN',
      gu: 'ડેમો સત્ર પ્રમાણીકરણ લૉગિન',
      hi: 'डेमो सत्र प्रमाणीकरण लॉगिन',
      mr: 'डेमो सत्र प्रमाणीकरण लॉगिन'
    },
    DEMO_ACCOUNT_SWITCHED: {
      en: 'DEMO_ACCOUNT_SWITCHED',
      gu: 'ડેમો ખાતું બદલવામાં આવ્યું',
      hi: 'डेमो खाता बदला गया',
      mr: 'डेमो खाते बदलले'
    },
    SERVER_AUTH_LOGIN: {
      en: 'SERVER_AUTH_LOGIN',
      gu: 'સર્વર સત્ર પ્રમાણીકરણ લૉગિન',
      hi: 'सर्वर सत्र प्रमाणीकरण लॉगिन',
      mr: 'सर्व्हर सत्र प्रमाणीकरण लॉगिन'
    },
    DEMO_AUTH_SIGNUP: {
      en: 'DEMO_AUTH_SIGNUP',
      gu: 'નવા ગ્રાહક ખાતાની નોંધણી',
      hi: 'नवीन उपभोक्ता खाता पंजीकरण',
      mr: 'नवीन ग्राहक खाते नोंदणी'
    },
    SERVER_AUTH_SIGNUP: {
      en: 'SERVER_AUTH_SIGNUP',
      gu: 'સર્વર ગ્રાહક ખાતાની નોંધણી',
      hi: 'सर्वर उपभोक्ता खाता पंजीकरण',
      mr: 'सर्व्हर ग्राहक खाते नोंदणी'
    },
    ACCOUNT_CONNECTION_LINKED: {
      en: 'ACCOUNT_CONNECTION_LINKED',
      gu: 'ગ્રાહક વીજ જોડાણ લિંક થયું',
      hi: 'उपभोक्ता कनेक्शन लिंक किया गया',
      mr: 'ग्राहक वीज जोडणी लिंक केली'
    },
    BILL_PAYMENT_COLLECTED: {
      en: 'BILL_PAYMENT_COLLECTED',
      gu: 'વીજ બિલ ચુકવણી સ્વીકારાઈ',
      hi: 'बिजली बिल भुगतान प्राप्त',
      mr: 'वीज बिल भरणा स्वीकारला'
    },
    NEW_CONNECTION_APPLICATION_SUBMITTED: {
      en: 'NEW_CONNECTION_APPLICATION_SUBMITTED',
      gu: 'નવા વીજ જોડાણની અરજી સબમિટ',
      hi: 'नवीन कनेक्शन आवेदन प्रस्तुत',
      mr: 'नवीन वीज जोडणी अर्ज सादर'
    },
    APPLICATION_STATUS_UPDATED: {
      en: 'APPLICATION_STATUS_UPDATED',
      gu: 'અરજીની સ્થિતિ અપડેટ થઈ',
      hi: 'आवेदन स्थिति अपडेट की गई',
      mr: 'अर्ज स्थिती अद्यतनित केली'
    },
    APPLICATION_CLARIFICATION_REQUESTED: {
      en: 'APPLICATION_CLARIFICATION_REQUESTED',
      gu: 'અરજી માટે સ્પષ્ટતા માંગવામાં આવી',
      hi: 'आवेदन स्पष्टीकरण मांगा गया',
      mr: 'अर्जासाठी स्पष्टीकरण मागवले'
    },
    APPLICATION_ARCHIVED_FROM_QUEUE: {
      en: 'APPLICATION_ARCHIVED_FROM_QUEUE',
      gu: 'અરજી કતારમાંથી આર્કાઇવ કરાઈ',
      hi: 'आवेदन कतार से संग्रहीत किया गया',
      mr: 'अर्ज रांगेतून संग्रहित केला'
    },
    APPLICATION_RESTORED_TO_QUEUE: {
      en: 'APPLICATION_RESTORED_TO_QUEUE',
      gu: 'અરજી સક્રિય કતારમાં પુનઃસ્થાપિત',
      hi: 'आवेदन सक्रिय कतार में पुनर्स्थापित',
      mr: 'अर्ज सक्रिय रांगेत पुनर्संचयित'
    },
    ACCESS_DENIED: {
      en: 'ACCESS_DENIED',
      gu: 'અનધિકૃત પ્રવેશ અટકાવાયો',
      hi: 'अनधिकृत पहुंच अस्वीकृत',
      mr: 'अनधिकृत प्रवेश नाकारला'
    },
    INCIDENT_ACKNOWLEDGED: {
      en: 'INCIDENT_ACKNOWLEDGED',
      gu: 'ઘટના સ્વીકારવામાં આવી',
      hi: 'घटना पावती दर्ज की गई',
      mr: 'घटनेची पोचपावती नोंदवली'
    },
    INCIDENT_ASSIGNED_TO_FIELD: {
      en: 'INCIDENT_ASSIGNED_TO_FIELD',
      gu: 'ઘટના ફિલ્ડ ઇજનેરને સોંપાઈ',
      hi: 'घटना फील्ड अभियंता को सौंपी गई',
      mr: 'घटना फील्ड अभियंत्याकडे सोपवली'
    },
    INCIDENT_REASSIGNED_TO_FIELD: {
      en: 'INCIDENT_REASSIGNED_TO_FIELD',
      gu: 'ઘટના અન્ય ફિલ્ડ ઇજનેરને ફરી સોંપાઈ',
      hi: 'घटना अन्य फील्ड अभियंता को पुनः सौंपी गई',
      mr: 'घटना इतर फील्ड अभियंत्याकडे पुनर्नियुक्त'
    },
    INCIDENT_ESCALATED: {
      en: 'INCIDENT_ESCALATED',
      gu: 'ઘટના ઉચ્ચ સત્તાને એસ્કેલેટ કરાઈ',
      hi: 'घटना उच्च प्राधिकारी को एस्केलेट की गई',
      mr: 'घटना वरिष्ठ प्राधिकरणाकडे वर्ग केली'
    },
    INCIDENT_RESOLVED: {
      en: 'INCIDENT_RESOLVED',
      gu: 'ઘટનાનું નિરાકરણ થયું',
      hi: 'घटना का समाधान किया गया',
      mr: 'घटनेचे निवारण झाले'
    },
    FIELD_ASSIGNMENT_ACCEPTED: {
      en: 'FIELD_ASSIGNMENT_ACCEPTED',
      gu: 'ફિલ્ડ સોંપણી સ્વીકારવામાં આવી',
      hi: 'फील्ड असाइनमेंट स्वीकार किया गया',
      mr: 'फील्ड नियुक्ती स्वीकारली'
    },
    FIELD_ASSIGNMENT_DECLINED: {
      en: 'FIELD_ASSIGNMENT_DECLINED',
      gu: 'ફિલ્ડ સોંપણી નકારવામાં આવી',
      hi: 'फील्ड असाइनमेंट अस्वीकार किया गया',
      mr: 'फील्ड नियुक्ती नाकारली'
    },
    FIELD_INSPECTION_STARTED: {
      en: 'FIELD_INSPECTION_STARTED',
      gu: 'સ્થળ પર નિરીક્ષણ શરૂ થયું',
      hi: 'स्थल पर निरीक्षण प्रारंभ किया गया',
      mr: 'स्थळावर निरीक्षण सुरू झाले'
    },
    FIELD_FINDINGS_SUBMITTED: {
      en: 'FIELD_FINDINGS_SUBMITTED',
      gu: 'ફિલ્ડ તકનીકી તારણો સબમિટ થયા',
      hi: 'फील्ड तकनीकी निष्कर्ष प्रस्तुत किए गए',
      mr: 'फील्ड तांत्रिक निष्कर्ष सादर केले'
    },
    FIELD_ASSISTANCE_REQUESTED: {
      en: 'FIELD_ASSISTANCE_REQUESTED',
      gu: 'ફિલ્ડ સહાયની વિનંતી કરાઈ',
      hi: 'फील्ड सहायता का अनुरोध किया गया',
      mr: 'फील्ड मदतीची विनंती केली'
    },
    FIELD_RESOLUTION_REPORT_SUBMITTED: {
      en: 'FIELD_RESOLUTION_REPORT_SUBMITTED',
      gu: 'ફિલ્ડ નિવારણ અહેવાલ સબમિટ થયો',
      hi: 'फील्ड समाधान रिपोर्ट प्रस्तुत की गई',
      mr: 'फील्ड निवारण अहवाल सादर केला'
    },
    MANAGEMENT_ESCALATION_APPROVED: {
      en: 'MANAGEMENT_ESCALATION_APPROVED',
      gu: 'મેનેજમેન્ટ એસ્કેલેશન મંજૂર',
      hi: 'प्रबंधन एस्केलेशन अनुमोदित',
      mr: 'व्यवस्थापन एस्केलेशन मंजूर'
    },
    MANAGEMENT_ESCALATION_REJECTED: {
      en: 'MANAGEMENT_ESCALATION_REJECTED',
      gu: 'મેનેજમેન્ટ એસ્કેલેશન નામંજૂર',
      hi: 'प्रबंधन एस्केलेशन अस्वीकृत',
      mr: 'व्यवस्थापन एस्केलेशन फेटाळले'
    },
    MANAGEMENT_INFO_REQUESTED: {
      en: 'MANAGEMENT_INFO_REQUESTED',
      gu: 'મેનેજમેન્ટ દ્વારા વધુ માહિતી માંગવામાં આવી',
      hi: 'प्रबंधन द्वारा अतिरिक्त जानकारी मांगी गई',
      mr: 'व्यवस्थापनाकडून अधिक माहिती मागवली'
    },
    EMERGENCY_SAFETY_OVERRIDE_BROADCAST: {
      en: 'EMERGENCY_SAFETY_OVERRIDE_BROADCAST',
      gu: 'કટોકટી સુરક્ષા ઓવરરાઇડ પ્રસારિત',
      hi: 'आपातकालीन सुरक्षा ओवरराइड प्रसारित',
      mr: 'आपत्कालीन सुरक्षा ओव्हरराईड प्रसारित'
    },
    FEEDER_FAULT_REPORTED_FROM_FIELD: {
      en: 'FEEDER_FAULT_REPORTED_FROM_FIELD',
      gu: 'ફિલ્ડમાંથી ફીડર ફોલ્ટની જાણ કરાઈ',
      hi: 'फील्ड से फीडर फॉल्ट की सूचना दी गई',
      mr: 'फील्डमधून फिडर बिघाडाची नोंद केली'
    },
    AI_RECOMMENDATION_PROPOSED: {
      en: 'AI_RECOMMENDATION_PROPOSED',
      gu: 'AI ભલામણ પ્રસ્તાવિત કરવામાં આવી',
      hi: 'AI अनुशंसा प्रस्तावित की गई',
      mr: 'AI शिफारस प्रस्तावित केली'
    },
    AI_APPROVAL_UNAUTHORIZED_ATTEMPT: {
      en: 'AI_APPROVAL_UNAUTHORIZED_ATTEMPT',
      gu: 'અનધિકૃત AI મંજૂરી પ્રયાસ',
      hi: 'अनधिकृत AI अनुमोदन प्रयास',
      mr: 'अनधिकृत AI मंजुरी प्रयत्न'
    },
    AI_APPROVAL_STATE_DRIFT_BLOCKED: {
      en: 'AI_APPROVAL_STATE_DRIFT_BLOCKED',
      gu: 'સ્થિતિ ફેરફારને કારણે AI અમલ અટકાવાયો',
      hi: 'स्थिति परिवर्तन के कारण AI निष्पादन रोका गया',
      mr: 'स्थिती बदलामुळे AI अंमलबजावणी रोखली'
    },
    AI_ACTION_APPROVED_AND_EXECUTED: {
      en: 'AI_ACTION_APPROVED_AND_EXECUTED',
      gu: 'AI કાર્યવાહી મંજૂર અને અમલીકૃત',
      hi: 'AI कार्रवाई स्वीकृत एवं निष्पादित',
      mr: 'AI कृती मंजूर आणि कार्यान्वित'
    },
    AI_ACTION_EXECUTION_FAILED: {
      en: 'AI_ACTION_EXECUTION_FAILED',
      gu: 'AI કાર્યવાહી અમલીકરણ નિષ્ફળ',
      hi: 'AI कार्रवाई निष्पादन विफल',
      mr: 'AI कृती अंमलबजावणी अयशस्वी'
    },
    AI_REJECTION_UNAUTHORIZED_ATTEMPT: {
      en: 'AI_REJECTION_UNAUTHORIZED_ATTEMPT',
      gu: 'અનધિકૃત AI અસ્વીકાર પ્રયાસ',
      hi: 'अनधिकृत AI अस्वीकृति प्रयास',
      mr: 'अनधिकृत AI नकार प्रयत्न'
    },
    AI_ACTION_REJECTED: {
      en: 'AI_ACTION_REJECTED',
      gu: 'AI ભલામણ નામંજૂર કરવામાં આવી',
      hi: 'AI अनुशंसा अस्वीकृत की गई',
      mr: 'AI शिफारस फेटाळली'
    },
    SECURITY_REVOKE_SESSION: {
      en: 'SECURITY_REVOKE_SESSION',
      gu: 'સુરક્ષા સત્ર રદ કરવામાં આવ્યું',
      hi: 'सुरक्षा सत्र निरस्त किया गया',
      mr: 'सुरक्षा सत्र रद्द केले'
    }
  };

  let localizedResource = log.resource;
  if (log.resource === 'Consumer Auth Gateway') {
    localizedResource =
      lang === 'gu'
        ? 'ગ્રાહક પ્રમાણીકરણ ગેટવે'
        : lang === 'hi'
        ? 'उपभोक्ता प्रमाणीकरण गेटवे'
        : 'ग्राहक प्रमाणीकरण गेटवे';
  } else if (log.resource === 'Consumer Account Registered') {
    localizedResource =
      lang === 'gu'
        ? 'ગ્રાહક ખાતું નોંધાયેલ'
        : lang === 'hi'
        ? 'उपभोक्ता खाता पंजीकृत'
        : 'ग्राहक खाते नोंदणीकृत';
  } else if (log.resource.startsWith('Workspace:')) {
    const wsRole = log.resource.split(':')[1] || '';
    const wsRoleMap: Record<string, Record<LanguageCode, string>> = {
      consumer: { en: 'consumer', gu: 'ગ્રાહક પોર્ટલ', hi: 'उपभोक्ता पोर्टल', mr: 'ग्राहक पोर्टल' },
      employee: { en: 'employee', gu: 'કર્મચારી પોર્ટલ', hi: 'कर्मचारी पोर्टल', mr: 'कर्मचारी पोर्टल' },
      field: { en: 'field', gu: 'ફિલ્ડ પોર્ટલ', hi: 'फील्ड पोर्टल', mr: 'फील्ड पोर्टल' },
      management: { en: 'management', gu: 'મેનેજમેન્ટ પોર્ટલ', hi: 'प्रबंधन पोर्टल', mr: 'व्यवस्थापन पोर्टल' },
      admin: { en: 'admin', gu: 'એડમિન પોર્ટલ', hi: 'एडमिन पोर्टल', mr: 'ॲडमिन पोर्टल' }
    };
    const roleTranslated = wsRoleMap[wsRole]?.[lang] || wsRole;
    localizedResource =
      lang === 'gu'
        ? `કાર્યક્ષેત્ર: ${roleTranslated}`
        : lang === 'hi'
        ? `कार्यक्षेत्र: ${roleTranslated}`
        : `कार्यक्षेत्र: ${roleTranslated}`;
  }

  const localizedIp = log.ipAddress.replace(
    '(UGVCL VPN)',
    lang === 'gu' ? '(UGVCL VPN)' : lang === 'hi' ? '(UGVCL VPN)' : '(UGVCL VPN)'
  );

  const dict = getAdminUiDictionary(lang);
  const statusBadge =
    log.status === 'SUCCESS'
      ? `● ${dict.filterSuccess}`
      : log.status === 'WARNING'
      ? `▲ ${dict.filterWarning}`
      : `▲ ${dict.filterFailed}`;

  return {
    timestamp: localizeAuditTimestamp(log.timestamp, lang),
    actor: log.actor,
    role: roleMap[log.role]?.[lang] || log.role,
    actionLabel: actionMap[log.action]?.[lang] || log.action,
    resource: localizedResource,
    ipAddress: localizedIp,
    statusBadge
  };
}
