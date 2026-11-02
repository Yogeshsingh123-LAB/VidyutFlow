import { LanguageCode } from './types';
import { AIActionRecommendation } from '../types';
import { ApplicationStatusDisplayMeta } from '../services/erpAdapter';
import {
  localizeSubdivision,
  localizeTariffCategory,
  localizeComplaintCategory,
  localizeApplicationStatus,
  localizeComplaintStatus,
  localizeConsumerAddress
} from './consumerContentTranslations';
import { localizeIncidentTitle } from './incidentLocalization';

export interface EmployeeUiDictionary {
  // Top Operational Bar
  topBarTitle: string;
  topBarCircleBadge: string;
  topBarCorporateOfficerPrefix: string;
  refreshWorklistBtn: string;
  refreshedStreamToast: string;

  // Tab 1: Dashboard (ERP Overview)
  activeIncidentsBannerPrefix: string;
  activeIncidentsBannerSuffix: string;
  criticalCountSuffix: string;
  kpiPendingScrutinyTitle: string;
  kpiFilesUnit: string;
  kpiPendingScrutinySub: string;
  kpiFieldFeasibilityTitle: string;
  kpiSitesUnit: string;
  kpiFieldFeasibilitySub: string;
  kpiSanctionApprovalsTitle: string;
  kpiReadyUnit: string;
  kpiSanctionApprovalsSub: string;
  kpiActiveGrievancesTitle: string;
  kpiTicketsUnit: string;
  kpiZeroBreachedSlas: string;
  tatChartTitle: string;
  tatChartSubtitle: string;
  tatChartLegendAvgHours: string;
  smartSuggestionsTitle: string;
  suggestion1Title: string;
  suggestion1Badge: string;
  suggestion1Body: string;
  suggestion1Btn: string;
  suggestion1Note: string;
  suggestion2Title: string;
  suggestion2SlaBadge: string;
  suggestion2Body: string;
  suggestion2Btn: string;

  // Tab 2: Application Queue
  appQueueTitle: string;
  appQueueSubtitle: string;
  searchAppPlaceholder: string;
  searchAppAriaLabel: string;
  filterStatusAriaLabel: string;
  optAllActive: string;
  optActionRequired: string;
  optSubmittedNew: string;
  optDocVerification: string;
  optSiteInspection: string;
  optSanctionApproval: string;
  optMeterInstalled: string;
  optRejected: string;
  optArchived: string;
  pillAllActive: string;
  pillNeedsReview: string;
  pillSubmitted: string;
  pillDocScrutiny: string;
  pillSiteInspection: string;
  pillAwaitingApproval: string;
  pillApprovedEnergized: string;
  pillRejected: string;
  pillArchived: string;
  archiveConfirmTitlePrefix: string;
  archiveConfirmBody: string;
  archiveRemarkPlaceholder: string;
  archiveConfirmBtn: string;
  colAppRef: string;
  colApplicantContact: string;
  colCategoryLoad: string;
  colSubdivision: string;
  colEstSanction: string;
  colLifecycleStatus: string;
  colActions: string;
  noAppsMatchEmpty: string;
  filedDatePrefix: string;
  clarificationRequestedBadge: string;
  archivedByPrefix: string;
  inspectCaseBtn: string;
  archiveBtn: string;
  archiveBtnTitle: string;
  restoreBtn: string;
  restoreBtnTitle: string;

  // Tab 3: Consumer Ledger
  consumerLedgerTitle: string;
  consumerLedgerSubtitle: string;
  colConsumerNo: string;
  colNameAddress: string;
  colTariffCategory: string;
  colConnectedFeeder: string;
  colMeterSerial: string;
  colCurrentReading: string;
  colStatus: string;

  // Tab 4: Complaint Management
  complaintMatrixTitle: string;
  complaintMatrixSubtitle: string;
  colTicketId: string;
  colConsumer: string;
  colCategoryDesc: string;
  colPriority: string;
  colSlaWindow: string;
  actionTicketBtn: string;

  // Tab 5: Approval Center (Human-in-the-Loop AI Governance)
  approvalCenterTitle: string;
  approvalCenterSubtitle: string;
  rbacGuardActiveBadge: string;
  metricTotalProposals: string;
  metricGroundedInErp: string;
  metricAwaitingDecision: string;
  metricPendingReview: string;
  metricApprovedExecuted: string;
  metricCommittedToErp: string;
  metricRejectedProposals: string;
  metricCancelledByHuman: string;
  filterAllProposals: string;
  filterPendingReview: string;
  filterApprovedExecuted: string;
  filterRejected: string;
  colIdAgent: string;
  colActionTarget: string;
  colStateDiff: string;
  colRiskLevel: string;
  colRequiredRole: string;
  colOperatorReview: string;
  noProposalsEmpty: string;
  reviewAndDecideBtn: string;
  reviewedByPrefix: string;

  // Tab 6: Department Coordination
  interDeptRequisitionsTitle: string;
  req1Dept: string;
  req1Desc: string;
  req1StatusDispatched: string;
  req2Dept: string;
  req2Desc: string;
  req2StatusInReview: string;
  lineSquadMobilizationTitle: string;
  lineSquadMobilizationDesc: string;
  emergencyChannelStatus: string;

  // Tab 7: Revenue Reports
  revenueReportTitle: string;
  revenueReportSubtitle: string;
  exportCsvBtn: string;
  exportedCsvToast: string;
  revTotalEnergyBilled: string;
  revTotalEnergyValue: string;
  revCollectedTitle: string;
  revCollectedValue: string;
  revEfficiencyTitle: string;

  // CaseDetailDrawer (Staff / Employee / Field / Management / Admin View)
  drawerTypeApplication: string;
  drawerTypeComplaint: string;
  drawerTypeWorkOrder: string;
  drawerCurrentLifecycleStage: string;
  drawerStepOfFivePattern: string;
  drawerAppliedTargetPattern: string;
  drawerClarificationRequiredTitle: string;
  drawerRejectionNoticeTitle: string;
  drawerRejectionDefaultNote: string;
  drawerFiveStageProgressTitle: string;
  drawerStageCompleted: string;
  drawerStageCurrent: string;
  drawerStageUpcoming: string;
  drawerApplicantHeading: string;
  drawerSanctionSpecsHeading: string;
  drawerLoadLabel: string;
  drawerCategoryLabel: string;
  drawerEstSanctionLabel: string;
  drawerSubdivisionLabel: string;
  drawerVerifiedDocsHeading: string;
  drawerLinkedFieldOrderLabel: string;
  drawerOpenFieldOrderBtn: string;
  drawerSanctionLifecycleActionHeading: string;
  drawerApproveDocsBtn: string;
  drawerDispatchInspectionBtn: string;
  drawerSanctionApprovalBtn: string;
  drawerEnergizeInstallBtn: string;
  drawerRequestClarificationBtn: string;
  drawerRejectFileBtn: string;
  drawerAuditNotesTrailHeading: string;
  drawerCurrentStatusCategory: string;
  drawerExpectedResolutionSla: string;
  drawerWithinHoursPrefix: string;
  drawerHoursSuffix: string;
  drawerByTimePrefix: string;
  drawerGrievanceDetailsHeading: string;
  drawerComplaintIdLabel: string;
  drawerRegisteredOnLabel: string;
  drawerConsumerNoLabel: string;
  drawerFeederLabel: string;
  drawerAssignedTechLabel: string;
  drawerUnassigned: string;
  drawerResolutionSummaryHeading: string;
  drawerResolutionDefaultNote: string;
  drawerResolutionTimelineHeading: string;
  drawerLinkedDispatchOrderLabel: string;
  drawerUpdateRedressalHeading: string;
  drawerDispatchLinemanBtn: string;
  drawerMarkInProgressBtn: string;
  drawerMarkResolvedBtn: string;
  drawerLinkedConnAppLabel: string;
  drawerViewApplicationBtn: string;
  drawerLinkedGrievanceLabel: string;
  drawerViewGrievanceBtn: string;
  drawerTaskStatusLabel: string;
  drawerScheduledLabel: string;
  drawerWorkDetailsHeading: string;
  drawerAssignedToLabel: string;
  drawerMaterialsRequiredHeading: string;
  drawerFieldProgressActionHeading: string;
  drawerStartTripBtn: string;
  drawerArrivedOnSiteBtn: string;
  drawerSubmitInspectionCompleteBtn: string;
  drawerAppendOfficialNoteLabel: string;
  drawerNoteInputPlaceholder: string;
  drawerSaveNoteBtn: string;
  drawerSavedNoteToast: string;

  // HumanApprovalModal
  approvalModalCloseAria: string;
  approvalModalRiskSuffix: string;
  approvalModalRequiredApproverPrefix: string;
  approvalModalRecommendedByPrefix: string;
  approvalModalStateTransitionHeading: string;
  approvalModalAffectedEntityLabel: string;
  approvalModalAiReasoningLabel: string;
  approvalModalSupportingRefsLabel: string;
  approvalModalActiveIdentityLabel: string;
  approvalModalActiveRoleLabel: string;
  approvalModalIdentityVerifiedMsg: string;
  approvalModalAuthRestrictedPrefix: string;
  approvalModalRemarksLabel: string;
  approvalModalMandatoryRiskSuffix: string;
  approvalModalPlaceholderAuthorized: string;
  approvalModalPlaceholderRestricted: string;
  approvalModalErrorMandatory: string;
  approvalModalErrorRejectionReason: string;
  approvalModalGovernanceFooter: string;
  approvalModalCancelBtn: string;
  approvalModalRejectBtn: string;
  approvalModalApproveExecuteBtn: string;

  // IncidentActionModal & NotificationDrawer extras
  incidentModalSubtitle: string;
  incidentModalStandbyAlerts: string;
  incidentModalFieldAssignmentLabel: string;
  incidentModalAssignedLabel: string;
  incidentModalInstructionsLabel: string;
  incidentModalDeclinedTitle: string;
  incidentModalDeclinedAtLabel: string;
  incidentModalMandatoryDeclineReasonLabel: string;
  incidentModalManagementEscalationLabel: string;
  incidentModalEscalatedAtLabel: string;
  incidentModalJustificationLabel: string;
  incidentModalDecisionStatusLabel: string;
  incidentModalOnSiteFindingsHeading: string;
  incidentModalFinalRectificationHeading: string;
  incidentModalFiledByPrefix: string;
  incidentModalFiledOnPrefix: string;
  incidentModalEmployeeDeskOptionsHeading: string;
  incidentModalCurrentStatusLabel: string;
  incidentModalExecutiveDecisionLabel: string;
  incidentModalEmployeeDeskHint: string;
  incidentModalTimezoneFooter: string;
  notifDrawerTargetChannelLabel: string;
  notifDrawerOptManagement: string;
  notifDrawerOptField: string;
  notifDrawerOptEmployee: string;
  notifDrawerOptAdmin: string;
  notifDrawerConfirmFieldAssignBtn: string;
  notifDrawerConfirmEscalationBtn: string;
  notifDrawerConfirmResolutionBtn: string;
}

export const EMPLOYEE_UI_TRANSLATIONS: Record<LanguageCode, EmployeeUiDictionary> = {
  en: {
    topBarTitle: 'Sub-Divisional Operations & Sanction Desk',
    topBarCircleBadge: 'Gandhinagar & Mehsana Circle',
    topBarCorporateOfficerPrefix: 'UGVCL Corporate · Officer:',
    refreshWorklistBtn: 'Refresh Worklist',
    refreshedStreamToast: 'Refreshed real-time ERP event stream',

    activeIncidentsBannerPrefix: 'Active Operational Incident(s) in Sub-Division Control Desk',
    activeIncidentsBannerSuffix: 'Active',
    criticalCountSuffix: 'CRITICAL',
    kpiPendingScrutinyTitle: 'Pending Scrutiny',
    kpiFilesUnit: 'Files',
    kpiPendingScrutinySub: 'Awaiting document sign-off',
    kpiFieldFeasibilityTitle: 'Under Field Feasibility',
    kpiSitesUnit: 'Sites',
    kpiFieldFeasibilitySub: 'Assigned to JE Solanki',
    kpiSanctionApprovalsTitle: 'Sanction Approvals',
    kpiReadyUnit: 'Ready',
    kpiSanctionApprovalsSub: 'Estimate clearance pending',
    kpiActiveGrievancesTitle: 'Active Grievances',
    kpiTicketsUnit: 'Tickets',
    kpiZeroBreachedSlas: '0 Breached SLAs',
    tatChartTitle: 'Sub-Divisional TAT (Turnaround Time in Hours)',
    tatChartSubtitle: 'Average grievance resolution vs SLA baseline by Sub-Division',
    tatChartLegendAvgHours: 'Avg TAT (Hours)',
    smartSuggestionsTitle: 'UGVCL Smart Suggestions',
    suggestion1Title: 'APP-2026-0844 Sanction Ready',
    suggestion1Badge: '96% Match',
    suggestion1Body: 'Site report received from JE Solanki with 0% overload risk. 1-click approve to generate demand note.',
    suggestion1Btn: 'Authorize Sanction Now →',
    suggestion1Note: 'Approved via quick suggestion',
    suggestion2Title: 'CMP-8821 Voltage Drop',
    suggestion2SlaBadge: 'SLA: 12h',
    suggestion2Body: 'Consumer Meenaben Patel filed voltage drop. Feeder SCADA reports 184A load on 11kV line.',
    suggestion2Btn: 'Open Case Drawer →',

    appQueueTitle: 'New Connection Applications Queue',
    appQueueSubtitle: 'Manage document scrutiny, site inspections, sanction approvals, and completed queue archiving',
    searchAppPlaceholder: 'Search Application ID or Applicant...',
    searchAppAriaLabel: 'Search Application ID or Applicant',
    filterStatusAriaLabel: 'Filter applications by status',
    optAllActive: 'All Active',
    optActionRequired: 'Action Required',
    optSubmittedNew: 'Submitted (New)',
    optDocVerification: 'Document Verification (In Progress)',
    optSiteInspection: 'Site Inspection (In Progress)',
    optSanctionApproval: 'Sanction Approval (Awaiting Approval)',
    optMeterInstalled: 'Meter Installed (Approved / Completed)',
    optRejected: 'Rejected',
    optArchived: 'Archived',
    pillAllActive: 'All Active',
    pillNeedsReview: 'Needs Review',
    pillSubmitted: 'Submitted',
    pillDocScrutiny: 'Doc Scrutiny',
    pillSiteInspection: 'Site Inspection',
    pillAwaitingApproval: 'Awaiting Approval',
    pillApprovedEnergized: 'Approved / Energized',
    pillRejected: 'Rejected',
    pillArchived: 'Archived',
    archiveConfirmTitlePrefix: 'Confirm Safe Queue Archive for',
    archiveConfirmBody: 'This will remove the completed/rejected application from the active employee worklist while preserving its full audit trail and consumer portal record.',
    archiveRemarkPlaceholder: 'Optional archive remark...',
    archiveConfirmBtn: 'Confirm Archive',
    colAppRef: 'Application Ref',
    colApplicantContact: 'Applicant & Contact',
    colCategoryLoad: 'Category & Load',
    colSubdivision: 'Subdivision',
    colEstSanction: 'Est. Sanction',
    colLifecycleStatus: 'Lifecycle Status & Review State',
    colActions: 'Actions',
    noAppsMatchEmpty: 'No applications match the selected status filter or search query.',
    filedDatePrefix: 'Filed:',
    clarificationRequestedBadge: 'Clarification Requested',
    archivedByPrefix: 'Archived by',
    inspectCaseBtn: 'Inspect Case',
    archiveBtn: 'Archive',
    archiveBtnTitle: 'Archive completed/rejected application from active queue',
    restoreBtn: 'Restore',
    restoreBtnTitle: 'Restore application to active queue',

    consumerLedgerTitle: 'Consumer Records & Energy Ledger',
    consumerLedgerSubtitle: 'Master connection database with meter serials and security deposits',
    colConsumerNo: 'Consumer No',
    colNameAddress: 'Name & Address',
    colTariffCategory: 'Tariff Category',
    colConnectedFeeder: 'Connected Feeder',
    colMeterSerial: 'Meter Serial',
    colCurrentReading: 'Current Reading',
    colStatus: 'Status',

    complaintMatrixTitle: 'Sub-Divisional Grievance Management Matrix',
    complaintMatrixSubtitle: 'SLA monitoring, technician dispatch, and resolution sign-offs',
    colTicketId: 'Ticket ID',
    colConsumer: 'Consumer',
    colCategoryDesc: 'Category & Description',
    colPriority: 'Priority',
    colSlaWindow: 'SLA Window',
    actionTicketBtn: 'Action Ticket',

    approvalCenterTitle: 'Approval Center — Human-in-the-Loop AI Governance',
    approvalCenterSubtitle: 'Review evidence-backed proposals generated by Operations Co-Pilot AI. Authenticated human sign-off required for execution.',
    rbacGuardActiveBadge: 'RBAC Guard: Active',
    metricTotalProposals: 'Total AI Proposals',
    metricGroundedInErp: 'Grounded in ERP state',
    metricAwaitingDecision: 'Awaiting Operator Decision',
    metricPendingReview: 'Pending Review',
    metricApprovedExecuted: 'Approved & Executed',
    metricCommittedToErp: 'Committed to ERP',
    metricRejectedProposals: 'Rejected Proposals',
    metricCancelledByHuman: 'Cancelled by Human',
    filterAllProposals: 'All Proposals',
    filterPendingReview: 'Pending Review',
    filterApprovedExecuted: 'Approved & Executed',
    filterRejected: 'Rejected',
    colIdAgent: 'ID & Agent',
    colActionTarget: 'Action & Target',
    colStateDiff: 'State Diff',
    colRiskLevel: 'Risk Level',
    colRequiredRole: 'Required Role',
    colOperatorReview: 'Operator Review',
    noProposalsEmpty: 'No AI recommendations found in this filter.',
    reviewAndDecideBtn: 'Review & Decide',
    reviewedByPrefix: 'By',

    interDeptRequisitionsTitle: 'Inter-Departmental Requisitions',
    req1Dept: 'Metering & Testing Squad',
    req1Desc: 'Requisition for 4G AMR Smart Meter for APP-2026-0842',
    req1StatusDispatched: 'Dispatched',
    req2Dept: 'Civil & Pole Erection Wing',
    req2Desc: 'Road crossing permission for Dediyasan GIDC plot 48',
    req2StatusInReview: 'In Review',
    lineSquadMobilizationTitle: 'Line Squad Emergency Mobilization',
    lineSquadMobilizationDesc: 'Active line patrol squads on standby across 8 feeders in Gandhinagar & Mehsana divisions.',
    emergencyChannelStatus: 'Sub-Division Emergency Channel 4: Ready · Hot-line permit protocols active.',

    revenueReportTitle: 'Sub-Division Revenue & Collection Reconciliation',
    revenueReportSubtitle: 'Monthly billing demand vs collections for Gandhinagar Sub-Division 2',
    exportCsvBtn: 'Export CSV',
    exportedCsvToast: 'Exported revenue statement as CSV (Demo)',
    revTotalEnergyBilled: 'Total Energy Billed',
    revTotalEnergyValue: '161.9 MU',
    revCollectedTitle: 'Revenue Collected',
    revCollectedValue: '₹79.6 Crores',
    revEfficiencyTitle: 'Collection Efficiency',

    drawerTypeApplication: 'Application',
    drawerTypeComplaint: 'Complaint',
    drawerTypeWorkOrder: 'Work Order',
    drawerCurrentLifecycleStage: 'Current Lifecycle Stage',
    drawerStepOfFivePattern: 'Step {step} of 5',
    drawerAppliedTargetPattern: 'Applied: {applied} · Target Completion: {target}',
    drawerClarificationRequiredTitle: 'Clarification Required',
    drawerRejectionNoticeTitle: 'Application Rejection Notice',
    drawerRejectionDefaultNote: 'Application did not meet regulatory or technical feasibility criteria.',
    drawerFiveStageProgressTitle: '5-Stage Application Progress',
    drawerStageCompleted: 'Completed',
    drawerStageCurrent: 'Current Stage',
    drawerStageUpcoming: 'Upcoming',
    drawerApplicantHeading: 'Applicant',
    drawerSanctionSpecsHeading: 'Sanction Specs',
    drawerLoadLabel: 'Load:',
    drawerCategoryLabel: 'Category:',
    drawerEstSanctionLabel: 'Est. Sanction:',
    drawerSubdivisionLabel: 'Subdivision:',
    drawerVerifiedDocsHeading: 'Verified Documents',
    drawerLinkedFieldOrderLabel: 'Linked Field Inspection Order:',
    drawerOpenFieldOrderBtn: 'Open Field Order',
    drawerSanctionLifecycleActionHeading: 'Sub-Divisional Sanction Lifecycle Action',
    drawerApproveDocsBtn: 'Approve Docs',
    drawerDispatchInspectionBtn: 'Dispatch Inspection',
    drawerSanctionApprovalBtn: 'Sanction Approval',
    drawerEnergizeInstallBtn: 'Energize & Install',
    drawerRequestClarificationBtn: 'Request Clarification',
    drawerRejectFileBtn: 'Reject File',
    drawerAuditNotesTrailHeading: 'Audit & Notes Trail',
    drawerCurrentStatusCategory: 'Current Status & Category',
    drawerExpectedResolutionSla: 'Expected Resolution / SLA',
    drawerWithinHoursPrefix: 'Within',
    drawerHoursSuffix: 'Hours',
    drawerByTimePrefix: 'By',
    drawerGrievanceDetailsHeading: 'Grievance Details',
    drawerComplaintIdLabel: 'Complaint ID:',
    drawerRegisteredOnLabel: 'Registered On:',
    drawerConsumerNoLabel: 'Consumer No:',
    drawerFeederLabel: 'Feeder:',
    drawerAssignedTechLabel: 'Assigned Tech:',
    drawerUnassigned: 'Unassigned',
    drawerResolutionSummaryHeading: 'Resolution Summary',
    drawerResolutionDefaultNote: 'Issue resolved and supply restored by field technician.',
    drawerResolutionTimelineHeading: 'Resolution Timeline',
    drawerLinkedDispatchOrderLabel: 'Linked Field Dispatch Order:',
    drawerUpdateRedressalHeading: 'Update Redressal Status',
    drawerDispatchLinemanBtn: 'Dispatch Field Lineman',
    drawerMarkInProgressBtn: 'Mark In Progress',
    drawerMarkResolvedBtn: 'Mark Resolved',
    drawerLinkedConnAppLabel: 'Linked Connection Application:',
    drawerViewApplicationBtn: 'View Application',
    drawerLinkedGrievanceLabel: 'Linked Consumer Grievance:',
    drawerViewGrievanceBtn: 'View Grievance',
    drawerTaskStatusLabel: 'Task Status',
    drawerScheduledLabel: 'Scheduled',
    drawerWorkDetailsHeading: 'Work Details',
    drawerAssignedToLabel: 'Assigned To:',
    drawerMaterialsRequiredHeading: 'Materials Required',
    drawerFieldProgressActionHeading: 'Field Progress Action',
    drawerStartTripBtn: 'Start Trip (En Route)',
    drawerArrivedOnSiteBtn: 'Arrived On Site',
    drawerSubmitInspectionCompleteBtn: 'Submit Inspection & Complete',
    drawerAppendOfficialNoteLabel: 'Append Official Note / Remark',
    drawerNoteInputPlaceholder: 'Type case remark or inspection update...',
    drawerSaveNoteBtn: 'Save',
    drawerSavedNoteToast: 'Added case note to #',

    approvalModalCloseAria: 'Close approval dialog',
    approvalModalRiskSuffix: 'RISK',
    approvalModalRequiredApproverPrefix: 'Required Approver:',
    approvalModalRecommendedByPrefix: 'Recommended by:',
    approvalModalStateTransitionHeading: 'State Transition Preview (Proposed Mutation)',
    approvalModalAffectedEntityLabel: 'Affected Entity',
    approvalModalAiReasoningLabel: 'AI Evidence-Based Reasoning:',
    approvalModalSupportingRefsLabel: 'Supporting Record References (Grounded ERP Facts):',
    approvalModalActiveIdentityLabel: 'Active Approver Identity:',
    approvalModalActiveRoleLabel: 'Active Role:',
    approvalModalIdentityVerifiedMsg: 'Identity Verified: Authorized to execute this operational decision.',
    approvalModalAuthRestrictedPrefix: 'Authorization Restricted:',
    approvalModalRemarksLabel: 'Operator Review Remarks',
    approvalModalMandatoryRiskSuffix: '* (Mandatory for {risk} risk)',
    approvalModalPlaceholderAuthorized: 'Enter operational justification, verification note, or reason for rejection...',
    approvalModalPlaceholderRestricted: 'Switch to the authorized role to approve or reject this proposal.',
    approvalModalErrorMandatory: 'Review remarks are mandatory for HIGH and CRITICAL risk actions (minimum 5 characters).',
    approvalModalErrorRejectionReason: 'Please provide a brief reason for rejecting this AI recommendation.',
    approvalModalGovernanceFooter: 'Human-in-the-Loop Governance: AI recommends, operator decides.',
    approvalModalCancelBtn: 'Cancel',
    approvalModalRejectBtn: 'Reject Proposal',
    approvalModalApproveExecuteBtn: 'Approve & Execute Action',

    incidentModalSubtitle: 'Authoritative UGVCL ERP Operational Incident Record',
    incidentModalStandbyAlerts: 'Standby field & executive alerts active.',
    incidentModalFieldAssignmentLabel: 'Field Assignment:',
    incidentModalAssignedLabel: 'Assigned:',
    incidentModalInstructionsLabel: 'Instructions:',
    incidentModalDeclinedTitle: 'Assignment Declined:',
    incidentModalDeclinedAtLabel: 'Declined:',
    incidentModalMandatoryDeclineReasonLabel: 'Mandatory Decline Reason:',
    incidentModalManagementEscalationLabel: 'Management Escalation:',
    incidentModalEscalatedAtLabel: 'Escalated:',
    incidentModalJustificationLabel: 'Justification:',
    incidentModalDecisionStatusLabel: 'Decision Status:',
    incidentModalOnSiteFindingsHeading: 'On-Site Technical Findings',
    incidentModalFinalRectificationHeading: 'Final Rectification & Resolution Report',
    incidentModalFiledByPrefix: 'Filed by',
    incidentModalFiledOnPrefix: 'on',
    incidentModalEmployeeDeskOptionsHeading: 'Employee Incident Control Desk Options',
    incidentModalCurrentStatusLabel: 'Current incident status:',
    incidentModalExecutiveDecisionLabel: 'Executive Decision:',
    incidentModalEmployeeDeskHint: 'To re-assign or escalate, use the Incident Control Desk table action buttons in the Employee Portal.',
    incidentModalTimezoneFooter: 'VidyutFlow Core · Timezone: Asia/Kolkata',
    notifDrawerTargetChannelLabel: 'Target Operational Channel',
    notifDrawerOptManagement: 'Management Portal (Executive)',
    notifDrawerOptField: 'Field Engineer (Substation JE)',
    notifDrawerOptEmployee: 'Operations Desk (Division)',
    notifDrawerOptAdmin: 'System Admin & Cybersecurity',
    notifDrawerConfirmFieldAssignBtn: 'Confirm Field Assignment',
    notifDrawerConfirmEscalationBtn: 'Confirm Escalation',
    notifDrawerConfirmResolutionBtn: 'Confirm Resolution'
  },

  gu: {
    topBarTitle: 'પેટા-વિભાગીય સંચાલન અને મંજૂરી ડેસ્ક',
    topBarCircleBadge: 'ગાંધીનગર અને મહેસાણા વર્તુળ',
    topBarCorporateOfficerPrefix: 'UGVCL કોર્પોરેટ · અધિકારી:',
    refreshWorklistBtn: 'કાર્યસૂચિ તાજી કરો',
    refreshedStreamToast: 'રીઅલ-ટાઇમ ERP ઇવેન્ટ સ્ટ્રીમ તાજી કરવામાં આવી',

    activeIncidentsBannerPrefix: 'પેટા-વિભાગ નિયંત્રણ ડેસ્કમાં સક્રિય સંચાલન ઘટના(ઓ)',
    activeIncidentsBannerSuffix: 'સક્રિય',
    criticalCountSuffix: 'અત્યંત ગંભીર',
    kpiPendingScrutinyTitle: 'બાકી દસ્તાવેજ ચકાસણી',
    kpiFilesUnit: 'ફાઇલો',
    kpiPendingScrutinySub: 'દસ્તાવેજ મંજૂરીની રાહમાં',
    kpiFieldFeasibilityTitle: 'સ્થળ શક્યતા ચકાસણી હેઠળ',
    kpiSitesUnit: 'સ્થળો',
    kpiFieldFeasibilitySub: 'JE સોલંકીને સોંપાયેલ',
    kpiSanctionApprovalsTitle: 'મંજૂરી પરવાનગીઓ',
    kpiReadyUnit: 'તૈયાર',
    kpiSanctionApprovalsSub: 'અંદાજપત્ર ક્લિયરન્સ બાકી',
    kpiActiveGrievancesTitle: 'સક્રિય ફરિયાદો',
    kpiTicketsUnit: 'ટિકિટો',
    kpiZeroBreachedSlas: '0 SLA ભંગ',
    tatChartTitle: 'પેટા-વિભાગીય TAT (નિવારણ સમય કલાકોમાં)',
    tatChartSubtitle: 'પેટા-વિભાગ મુજબ સરેરાશ ફરિયાદ નિવારણ વિરુદ્ધ SLA સમયમર્યાદા',
    tatChartLegendAvgHours: 'સરેરાશ TAT (કલાક)',
    smartSuggestionsTitle: 'UGVCL સ્માર્ટ સૂચનો',
    suggestion1Title: 'APP-2026-0844 મંજૂરી માટે તૈયાર',
    suggestion1Badge: '96% સુસંગત',
    suggestion1Body: 'JE સોલંકી પાસેથી 0% ઓવરલોડ જોખમ સાથે સ્થળ અહેવાલ મળ્યો છે. ડિમાન્ડ નોટ જનરેટ કરવા 1-ક્લિકથી મંજૂર કરો.',
    suggestion1Btn: 'હમણાં જ મંજૂરી આપો →',
    suggestion1Note: 'ઝડપી સૂચન દ્વારા મંજૂર કરવામાં આવ્યું',
    suggestion2Title: 'CMP-8821 વોલ્ટેજ ઘટાડો',
    suggestion2SlaBadge: 'SLA: 12 કલાક',
    suggestion2Body: 'ગ્રાહક મીનાબેન પટેલે વોલ્ટેજ ઘટાડાની ફરિયાદ નોંધાવી છે. ફીડર SCADA 11kV લાઇન પર 184A લોડ દર્શાવે છે.',
    suggestion2Btn: 'કેસ ડ્રોઅર ખોલો →',

    appQueueTitle: 'નવા વીજ જોડાણ અરજીઓની કતાર',
    appQueueSubtitle: 'દસ્તાવેજ ચકાસણી, સ્થળ નિરીક્ષણ, લોડ મંજૂરીઓ અને પૂર્ણ થયેલ અરજી આર્કાઇવિંગનું સંચાલન કરો',
    searchAppPlaceholder: 'અરજી આઈડી અથવા અરજદારનું નામ શોધો...',
    searchAppAriaLabel: 'અરજી આઈડી અથવા અરજદાર શોધો',
    filterStatusAriaLabel: 'સ્થિતિ મુજબ અરજીઓ ફિલ્ટર કરો',
    optAllActive: 'તમામ સક્રિય',
    optActionRequired: 'કાર્યવાહી જરૂરી',
    optSubmittedNew: 'સબમિટ થયેલ (નવી)',
    optDocVerification: 'દસ્તાવેજ ચકાસણી (પ્રગતિમાં)',
    optSiteInspection: 'સ્થળ નિરીક્ષણ (પ્રગતિમાં)',
    optSanctionApproval: 'લોડ મંજૂરી (મંજૂરીની રાહમાં)',
    optMeterInstalled: 'મીટર સ્થાપિત (મંજૂર / પૂર્ણ)',
    optRejected: 'નામંજૂર',
    optArchived: 'આર્કાઇવ કરેલ',
    pillAllActive: 'તમામ સક્રિય',
    pillNeedsReview: 'સમીક્ષા જરૂરી',
    pillSubmitted: 'સબમિટ થયેલ',
    pillDocScrutiny: 'દસ્તાવેજ ચકાસણી',
    pillSiteInspection: 'સ્થળ નિરીક્ષણ',
    pillAwaitingApproval: 'મંજૂરીની રાહમાં',
    pillApprovedEnergized: 'મંજૂર / કાર્યાન્વિત',
    pillRejected: 'નામંજૂર',
    pillArchived: 'આર્કાઇવ કરેલ',
    archiveConfirmTitlePrefix: 'માટે સુરક્ષિત કતાર આર્કાઇવની પુષ્ટિ કરો:',
    archiveConfirmBody: 'આ પૂર્ણ થયેલ/નામંજૂર અરજીને સક્રિય કર્મચારી કાર્યસૂચિમાંથી દૂર કરશે જ્યારે તેનો સંપૂર્ણ ઑડિટ ઇતિહાસ અને ગ્રાહક પોર્ટલ રેકોર્ડ સુરક્ષિત રાખશે.',
    archiveRemarkPlaceholder: 'વૈકલ્પિક આર્કાઇવ નોંધ...',
    archiveConfirmBtn: 'આર્કાઇવની પુષ્ટિ કરો',
    colAppRef: 'અરજી સંદર્ભ',
    colApplicantContact: 'અરજદાર અને સંપર્ક',
    colCategoryLoad: 'શ્રેણી અને લોડ',
    colSubdivision: 'પેટા-વિભાગ',
    colEstSanction: 'અંદાજિત મંજૂરી ખર્ચ',
    colLifecycleStatus: 'પ્રક્રિયા સ્થિતિ અને સમીક્ષા તબક્કો',
    colActions: 'કાર્યવાહી',
    noAppsMatchEmpty: 'પસંદ કરેલ સ્થિતિ ફિલ્ટર અથવા શોધ સાથે કોઈ અરજી મેળ ખાતી નથી.',
    filedDatePrefix: 'નોંધણી:',
    clarificationRequestedBadge: 'સ્પષ્ટતા માંગવામાં આવી',
    archivedByPrefix: 'દ્વારા આર્કાઇવ:',
    inspectCaseBtn: 'કેસ તપાસો',
    archiveBtn: 'આર્કાઇવ',
    archiveBtnTitle: 'પૂર્ણ/નામંજૂર અરજીને સક્રિય કતારમાંથી આર્કાઇવ કરો',
    restoreBtn: 'પુનઃસ્થાપિત કરો',
    restoreBtnTitle: 'અરજીને સક્રિય કતારમાં પુનઃસ્થાપિત કરો',

    consumerLedgerTitle: 'ગ્રાહક રેકોર્ડ્સ અને ઊર્જા ખાતાવહી',
    consumerLedgerSubtitle: 'મીટર સીરીયલ અને સિક્યોરિટી ડિપોઝિટ સાથેનો મુખ્ય જોડાણ ડેટાબેઝ',
    colConsumerNo: 'ગ્રાહક નંબર',
    colNameAddress: 'નામ અને સરનામું',
    colTariffCategory: 'ટેરિફ શ્રેણી',
    colConnectedFeeder: 'જોડાયેલ ફીડર',
    colMeterSerial: 'મીટર સીરીયલ',
    colCurrentReading: 'વર્તમાન રીડિંગ',
    colStatus: 'સ્થિતિ',

    complaintMatrixTitle: 'પેટા-વિભાગીય ફરિયાદ નિવારણ મેટ્રિક્સ',
    complaintMatrixSubtitle: 'SLA દેખરેખ, ટેકનિશિયન રવાનગી અને નિવારણ મંજૂરીઓ',
    colTicketId: 'ટિકિટ આઈડી',
    colConsumer: 'ગ્રાહક',
    colCategoryDesc: 'શ્રેણી અને વિગત',
    colPriority: 'પ્રાથમિકતા',
    colSlaWindow: 'SLA સમયમર્યાદા',
    actionTicketBtn: 'ટિકિટ કાર્યવાહી',

    approvalCenterTitle: 'મંજૂરી કેન્દ્ર — માનવ-નિયંત્રિત AI ગવર્નન્સ',
    approvalCenterSubtitle: 'ઓપરેશન્સ કો-પાયલટ AI દ્વારા જનરેટ કરાયેલ પુરાવા-આધારિત દરખાસ્તોની સમીક્ષા કરો. અમલીકરણ માટે અધિકૃત માનવ મંજૂરી અનિવાર્ય છે.',
    rbacGuardActiveBadge: 'RBAC સુરક્ષા: સક્રિય',
    metricTotalProposals: 'કુલ AI દરખાસ્તો',
    metricGroundedInErp: 'ERP ડેટા પર આધારિત',
    metricAwaitingDecision: 'ઓપરેટર નિર્ણયની રાહમાં',
    metricPendingReview: 'સમીક્ષા બાકી',
    metricApprovedExecuted: 'મંજૂર અને અમલીકૃત',
    metricCommittedToErp: 'ERP માં નોંધાયેલ',
    metricRejectedProposals: 'નામંજૂર દરખાસ્તો',
    metricCancelledByHuman: 'ઓપરેટર દ્વારા રદ',
    filterAllProposals: 'તમામ દરખાસ્તો',
    filterPendingReview: 'સમીક્ષા બાકી',
    filterApprovedExecuted: 'મંજૂર અને અમલીકૃત',
    filterRejected: 'નામંજૂર',
    colIdAgent: 'આઈડી અને એજન્ટ',
    colActionTarget: 'કાર્યવાહી અને લક્ષ્ય',
    colStateDiff: 'સ્થિતિ ફેરફાર',
    colRiskLevel: 'જોખમ સ્તર',
    colRequiredRole: 'જરૂરી ભૂમિકા',
    colOperatorReview: 'ઓપરેટર સમીક્ષા',
    noProposalsEmpty: 'આ ફિલ્ટરમાં કોઈ AI ભલામણો મળી નથી.',
    reviewAndDecideBtn: 'સમીક્ષા અને નિર્ણય',
    reviewedByPrefix: 'દ્વારા:',

    interDeptRequisitionsTitle: 'આંતર-વિભાગીય માંગણીપત્રો',
    req1Dept: 'મીટરિંગ અને ટેસ્ટિંગ સ્ક્વોડ',
    req1Desc: 'APP-2026-0842 માટે 4G AMR સ્માર્ટ મીટરની માંગણી',
    req1StatusDispatched: 'રવાના થયેલ',
    req2Dept: 'સિવિલ અને પોલ ઇરેક્શન વિંગ',
    req2Desc: 'દેદિયાસણ GIDC પ્લોટ 48 માટે રોડ ક્રોસિંગ પરવાનગી',
    req2StatusInReview: 'સમીક્ષા હેઠળ',
    lineSquadMobilizationTitle: 'લાઇન સ્ક્વોડ કટોકટી મોબિલાઇઝેશન',
    lineSquadMobilizationDesc: 'ગાંધીનગર અને મહેસાણા વિભાગના 8 ફીડરો પર સક્રિય લાઇન પેટ્રોલિંગ ટીમો સ્ટેન્ડબાય પર છે.',
    emergencyChannelStatus: 'પેટા-વિભાગ કટોકટી ચેનલ 4: તૈયાર · હોટ-લાઇન પરમિટ પ્રોટોકોલ સક્રિય.',

    revenueReportTitle: 'પેટા-વિભાગ મહેસૂલ અને વસૂલાત હિસાબ મિલન',
    revenueReportSubtitle: 'ગાંધીનગર પેટા-વિભાગ 2 માટે માસિક બિલિંગ માંગ વિરુદ્ધ વસૂલાત',
    exportCsvBtn: 'CSV નિકાસ કરો',
    exportedCsvToast: 'મહેસૂલ પત્રક CSV તરીકે નિકાસ કરવામાં આવ્યું (ડેમો)',
    revTotalEnergyBilled: 'કુલ બિલ થયેલ ઊર્જા',
    revTotalEnergyValue: '161.9 MU',
    revCollectedTitle: 'એકત્રિત મહેસૂલ',
    revCollectedValue: '₹79.6 કરોડ',
    revEfficiencyTitle: 'વસૂલાત કાર્યક્ષમતા',

    drawerTypeApplication: 'અરજી',
    drawerTypeComplaint: 'ફરિયાદ',
    drawerTypeWorkOrder: 'વર્ક ઓર્ડર',
    drawerCurrentLifecycleStage: 'વર્તમાન પ્રક્રિયા તબક્કો',
    drawerStepOfFivePattern: 'તબક્કો {step} / 5',
    drawerAppliedTargetPattern: 'અરજી તારીખ: {applied} · લક્ષિત પૂર્ણતા: {target}',
    drawerClarificationRequiredTitle: 'સ્પષ્ટતા જરૂરી છે',
    drawerRejectionNoticeTitle: 'અરજી નામંજૂરી સૂચના',
    drawerRejectionDefaultNote: 'અરજી નિયમનકારી અથવા તકનીકી શક્યતા માપદંડોને પૂર્ણ કરતી નથી.',
    drawerFiveStageProgressTitle: '5-તબક્કાની અરજી પ્રગતિ',
    drawerStageCompleted: 'પૂર્ણ',
    drawerStageCurrent: 'વર્તમાન તબક્કો',
    drawerStageUpcoming: 'આગામી',
    drawerApplicantHeading: 'અરજદાર',
    drawerSanctionSpecsHeading: 'મંજૂરી વિગતો',
    drawerLoadLabel: 'લોડ:',
    drawerCategoryLabel: 'શ્રેણી:',
    drawerEstSanctionLabel: 'અંદાજિત ખર્ચ:',
    drawerSubdivisionLabel: 'પેટા-વિભાગ:',
    drawerVerifiedDocsHeading: 'ચકાસાયેલ દસ્તાવેજો',
    drawerLinkedFieldOrderLabel: 'સંકળાયેલ સ્થળ નિરીક્ષણ ઓર્ડર:',
    drawerOpenFieldOrderBtn: 'ફિલ્ડ ઓર્ડર ખોલો',
    drawerSanctionLifecycleActionHeading: 'પેટા-વિભાગીય મંજૂરી પ્રક્રિયા કાર્યવાહી',
    drawerApproveDocsBtn: 'દસ્તાવેજ મંજૂર કરો',
    drawerDispatchInspectionBtn: 'નિરીક્ષણ મોકલો',
    drawerSanctionApprovalBtn: 'લોડ મંજૂરી આપો',
    drawerEnergizeInstallBtn: 'મીટર સ્થાપિત અને કાર્યાન્વિત કરો',
    drawerRequestClarificationBtn: 'સ્પષ્ટતા માંગો',
    drawerRejectFileBtn: 'ફાઇલ નામંજૂર કરો',
    drawerAuditNotesTrailHeading: 'ઑડિટ અને નોંધ ઇતિહાસ',
    drawerCurrentStatusCategory: 'વર્તમાન સ્થિતિ અને શ્રેણી',
    drawerExpectedResolutionSla: 'અપેક્ષિત નિવારણ / SLA',
    drawerWithinHoursPrefix: 'આગામી',
    drawerHoursSuffix: 'કલાકની અંદર',
    drawerByTimePrefix: 'સુધીમાં:',
    drawerGrievanceDetailsHeading: 'ફરિયાદની વિગતો',
    drawerComplaintIdLabel: 'ફરિયાદ આઈડી:',
    drawerRegisteredOnLabel: 'નોંધણી સમય:',
    drawerConsumerNoLabel: 'ગ્રાહક નંબર:',
    drawerFeederLabel: 'ફીડર:',
    drawerAssignedTechLabel: 'સોંપાયેલ ટેકનિશિયન:',
    drawerUnassigned: 'સોંપાયેલ નથી',
    drawerResolutionSummaryHeading: 'નિવારણ સારાંશ',
    drawerResolutionDefaultNote: 'ફિલ્ડ ટેકનિશિયન દ્વારા સમસ્યાનું નિવારણ કરવામાં આવ્યું છે અને પુરવઠો પૂર્વવત કરાયો છે.',
    drawerResolutionTimelineHeading: 'નિવારણ ટાઇમલાઇન',
    drawerLinkedDispatchOrderLabel: 'સંકળાયેલ ફિલ્ડ ડિસ્પેચ ઓર્ડર:',
    drawerUpdateRedressalHeading: 'નિવારણ સ્થિતિ અપડેટ કરો',
    drawerDispatchLinemanBtn: 'ફિલ્ડ લાઇનમેન મોકલો',
    drawerMarkInProgressBtn: 'પ્રગતિમાં ચિહ્નિત કરો',
    drawerMarkResolvedBtn: 'નિવારણ થયેલ ચિહ્નિત કરો',
    drawerLinkedConnAppLabel: 'સંકળાયેલ જોડાણ અરજી:',
    drawerViewApplicationBtn: 'અરજી જુઓ',
    drawerLinkedGrievanceLabel: 'સંકળાયેલ ગ્રાહક ફરિયાદ:',
    drawerViewGrievanceBtn: 'ફરિયાદ જુઓ',
    drawerTaskStatusLabel: 'કાર્ય સ્થિતિ',
    drawerScheduledLabel: 'નિર્ધારિત તારીખ',
    drawerWorkDetailsHeading: 'કાર્ય વિગતો',
    drawerAssignedToLabel: 'સોંપાયેલ અધિકારી:',
    drawerMaterialsRequiredHeading: 'જરૂરી સાધનસામગ્રી',
    drawerFieldProgressActionHeading: 'ફિલ્ડ પ્રગતિ કાર્યવાહી',
    drawerStartTripBtn: 'પ્રવાસ શરૂ કરો (માર્ગમાં)',
    drawerArrivedOnSiteBtn: 'સ્થળ પર પહોંચ્યા',
    drawerSubmitInspectionCompleteBtn: 'નિરીક્ષણ સબમિટ કરો અને પૂર્ણ કરો',
    drawerAppendOfficialNoteLabel: 'સત્તાવાર નોંધ / શેરો ઉમેરો',
    drawerNoteInputPlaceholder: 'કેસ નોંધ અથવા નિરીક્ષણ અપડેટ લખો...',
    drawerSaveNoteBtn: 'સાચવો',
    drawerSavedNoteToast: 'કેસ નોંધ ઉમેરવામાં આવી #',

    approvalModalCloseAria: 'મંજૂરી સંવાદ બંધ કરો',
    approvalModalRiskSuffix: 'જોખમ',
    approvalModalRequiredApproverPrefix: 'જરૂરી મંજૂરકર્તા:',
    approvalModalRecommendedByPrefix: 'ભલામણ કરનાર:',
    approvalModalStateTransitionHeading: 'સ્થિતિ પરિવર્તન પૂર્વાવલોકન (સૂચિત ફેરફાર)',
    approvalModalAffectedEntityLabel: 'અસરગ્રસ્ત એકમ',
    approvalModalAiReasoningLabel: 'AI પુરાવા-આધારિત તર્ક:',
    approvalModalSupportingRefsLabel: 'આધારભૂત રેકોર્ડ સંદર્ભો (ERP હકીકતો):',
    approvalModalActiveIdentityLabel: 'સક્રિય મંજૂરકર્તા ઓળખ:',
    approvalModalActiveRoleLabel: 'સક્રિય ભૂમિકા:',
    approvalModalIdentityVerifiedMsg: 'ઓળખ ચકાસાયેલ: આ સંચાલન નિર્ણય અમલમાં મૂકવા માટે અધિકૃત.',
    approvalModalAuthRestrictedPrefix: 'અધિકાર પ્રતિબંધિત:',
    approvalModalRemarksLabel: 'ઓપરેટર સમીક્ષા નોંધ',
    approvalModalMandatoryRiskSuffix: '* ({risk} જોખમ માટે ફરજિયાત)',
    approvalModalPlaceholderAuthorized: 'સંચાલન વાજબીપણું, ચકાસણી નોંધ અથવા નામંજૂર કરવાનું કારણ દાખલ કરો...',
    approvalModalPlaceholderRestricted: 'આ દરખાસ્તને મંજૂર અથવા નામંજૂર કરવા માટે અધિકૃત ભૂમિકા પર સ્વિચ કરો.',
    approvalModalErrorMandatory: 'ઉચ્ચ અને અત્યંત ગંભીર જોખમવાળી કાર્યવાહી માટે સમીક્ષા નોંધ ફરજિયાત છે (ઓછામાં ઓછા 5 અક્ષરો).',
    approvalModalErrorRejectionReason: 'કૃપા કરીને આ AI ભલામણને નામંજૂર કરવા માટે ટૂંકું કારણ આપો.',
    approvalModalGovernanceFooter: 'માનવ-નિયંત્રિત ગવર્નન્સ: AI ભલામણ કરે છે, ઓપરેટર નિર્ણય લે છે.',
    approvalModalCancelBtn: 'રદ કરો',
    approvalModalRejectBtn: 'દરખાસ્ત નામંજૂર કરો',
    approvalModalApproveExecuteBtn: 'મંજૂર કરો અને અમલમાં મૂકો',

    incidentModalSubtitle: 'સત્તાવાર UGVCL ERP સંચાલન ઘટના રેકોર્ડ',
    incidentModalStandbyAlerts: 'સ્ટેન્ડબાય ફિલ્ડ અને એક્ઝિક્યુટિવ ચેતવણીઓ સક્રિય.',
    incidentModalFieldAssignmentLabel: 'ફિલ્ડ સોંપણી:',
    incidentModalAssignedLabel: 'સોંપણી સમય:',
    incidentModalInstructionsLabel: 'સૂચનાઓ:',
    incidentModalDeclinedTitle: 'સોંપણી નકારવામાં આવી:',
    incidentModalDeclinedAtLabel: 'નકાર્યા સમય:',
    incidentModalMandatoryDeclineReasonLabel: 'ફરજિયાત નકારવાનું કારણ:',
    incidentModalManagementEscalationLabel: 'મેનેજમેન્ટ એસ્કેલેશન:',
    incidentModalEscalatedAtLabel: 'એસ્કેલેશન સમય:',
    incidentModalJustificationLabel: 'વાજબીપણું:',
    incidentModalDecisionStatusLabel: 'નિર્ણય સ્થિતિ:',
    incidentModalOnSiteFindingsHeading: 'સ્થળ પરના તકનીકી તારણો',
    incidentModalFinalRectificationHeading: 'અંતિમ દુરસ્તી અને નિવારણ અહેવાલ',
    incidentModalFiledByPrefix: 'નોંધનાર:',
    incidentModalFiledOnPrefix: 'સમય:',
    incidentModalEmployeeDeskOptionsHeading: 'કર્મચારી ઘટના નિયંત્રણ ડેસ્ક વિકલ્પો',
    incidentModalCurrentStatusLabel: 'વર્તમાન ઘટના સ્થિતિ:',
    incidentModalExecutiveDecisionLabel: 'એક્ઝિક્યુટિવ નિર્ણય:',
    incidentModalEmployeeDeskHint: 'ફરીથી સોંપવા અથવા આગળ મોકલવા માટે, કર્મચારી પોર્ટલમાં ઘટના નિયંત્રણ ડેસ્ક ટેબલના બટનોનો ઉપયોગ કરો.',
    incidentModalTimezoneFooter: 'VidyutFlow કોર · સમયક્ષેત્ર: Asia/Kolkata',
    notifDrawerTargetChannelLabel: 'લક્ષિત સંચાલન ચેનલ',
    notifDrawerOptManagement: 'મેનેજમેન્ટ પોર્ટલ (એક્ઝિક્યુટિવ)',
    notifDrawerOptField: 'ફિલ્ડ ઇજનેર (સબસ્ટેશન JE)',
    notifDrawerOptEmployee: 'સંચાલન ડેસ્ક (વિભાગ)',
    notifDrawerOptAdmin: 'સિસ્ટમ એડમિન અને સાયબર સુરક્ષા',
    notifDrawerConfirmFieldAssignBtn: 'ફિલ્ડ સોંપણીની પુષ્ટિ કરો',
    notifDrawerConfirmEscalationBtn: 'એસ્કેલેશનની પુષ્ટિ કરો',
    notifDrawerConfirmResolutionBtn: 'નિવારણની પુષ્ટિ કરો'
  },

  hi: {
    topBarTitle: 'उप-संभागीय परिचालन एवं स्वीकृति डेस्क',
    topBarCircleBadge: 'गांधीनगर एवं मेहसाणा सर्कल',
    topBarCorporateOfficerPrefix: 'UGVCL कॉर्पोरेट · अधिकारी:',
    refreshWorklistBtn: 'कार्यसूची रिफ्रेश करें',
    refreshedStreamToast: 'रीयल-टाइम ERP इवेंट स्ट्रीम रिफ्रेश की गई',

    activeIncidentsBannerPrefix: 'उप-संभाग नियंत्रण डेस्क में सक्रिय परिचालन घटना(एं)',
    activeIncidentsBannerSuffix: 'सक्रिय',
    criticalCountSuffix: 'अत्यंत गंभीर',
    kpiPendingScrutinyTitle: 'लंबित दस्तावेज़ जाँच',
    kpiFilesUnit: 'फ़ाइलें',
    kpiPendingScrutinySub: 'दस्तावेज़ अनुमोदन की प्रतीक्षा में',
    kpiFieldFeasibilityTitle: 'स्थल व्यवहार्यता जाँच के अधीन',
    kpiSitesUnit: 'स्थल',
    kpiFieldFeasibilitySub: 'JE सोलंकी को सौंपा गया',
    kpiSanctionApprovalsTitle: 'लोड स्वीकृति अनुमोदन',
    kpiReadyUnit: 'तैयार',
    kpiSanctionApprovalsSub: 'प्राक्कलन क्लीयरेंस लंबित',
    kpiActiveGrievancesTitle: 'सक्रिय शिकायतें',
    kpiTicketsUnit: 'टिकट',
    kpiZeroBreachedSlas: '0 SLA उल्लंघन',
    tatChartTitle: 'उप-संभागीय TAT (समाधान समय घंटों में)',
    tatChartSubtitle: 'उप-संभाग के अनुसार औसत शिकायत समाधान बनाम SLA मानक',
    tatChartLegendAvgHours: 'औसत TAT (घंटे)',
    smartSuggestionsTitle: 'UGVCL स्मार्ट सुझाव',
    suggestion1Title: 'APP-2026-0844 स्वीकृति हेतु तैयार',
    suggestion1Badge: '96% उपयुक्त',
    suggestion1Body: 'JE सोलंकी से 0% ओवरलोड जोखिम के साथ स्थल रिपोर्ट प्राप्त हुई। डिमांड नोट जारी करने हेतु 1-क्लिक से स्वीकृत करें।',
    suggestion1Btn: 'अभी स्वीकृति अधिकृत करें →',
    suggestion1Note: 'त्वरित सुझाव के माध्यम से स्वीकृत',
    suggestion2Title: 'CMP-8821 वोल्टेज गिरावट',
    suggestion2SlaBadge: 'SLA: 12 घंटे',
    suggestion2Body: 'उपभोक्ता मीनाबेन पटेल ने वोल्टेज गिरावट की शिकायत दर्ज की है। फीडर SCADA 11kV लाइन पर 184A लोड दर्शाता है।',
    suggestion2Btn: 'केस ड्रॉअर खोलें →',

    appQueueTitle: 'नए विद्युत कनेक्शन आवेदनों की कतार',
    appQueueSubtitle: 'दस्तावेज़ जाँच, स्थल निरीक्षण, लोड स्वीकृति और पूर्ण आवेदनों के संग्रहण का प्रबंधन करें',
    searchAppPlaceholder: 'आवेदन आईडी या आवेदक का नाम खोजें...',
    searchAppAriaLabel: 'आवेदन आईडी या आवेदक खोजें',
    filterStatusAriaLabel: 'स्थिति के अनुसार आवेदन फ़िल्टर करें',
    optAllActive: 'सभी सक्रिय',
    optActionRequired: 'कार्रवाई आवश्यक',
    optSubmittedNew: 'प्रस्तुत (नया)',
    optDocVerification: 'दस्तावेज़ सत्यापन (प्रगति पर)',
    optSiteInspection: 'स्थल निरीक्षण (प्रगति पर)',
    optSanctionApproval: 'लोड स्वीकृति (अनुमोदन की प्रतीक्षा में)',
    optMeterInstalled: 'मीटर स्थापित (स्वीकृत / पूर्ण)',
    optRejected: 'अस्वीकृत',
    optArchived: 'संग्रहीत (आर्काइव)',
    pillAllActive: 'सभी सक्रिय',
    pillNeedsReview: 'समीक्षा आवश्यक',
    pillSubmitted: 'प्रस्तुत',
    pillDocScrutiny: 'दस्तावेज़ जाँच',
    pillSiteInspection: 'स्थल निरीक्षण',
    pillAwaitingApproval: 'अनुमोदन प्रतीक्षित',
    pillApprovedEnergized: 'स्वीकृत / ऊर्जित',
    pillRejected: 'अस्वीकृत',
    pillArchived: 'संग्रहीत',
    archiveConfirmTitlePrefix: 'के लिए सुरक्षित कतार संग्रहण की पुष्टि करें:',
    archiveConfirmBody: 'यह पूर्ण/अस्वीकृत आवेदन को सक्रिय कर्मचारी कार्यसूची से हटा देगा जबकि इसका पूर्ण ऑडिट ट्रेल और उपभोक्ता पोर्टल रिकॉर्ड सुरक्षित रखेगा।',
    archiveRemarkPlaceholder: 'वैकल्पिक संग्रहण टिप्पणी...',
    archiveConfirmBtn: 'संग्रहण की पुष्टि करें',
    colAppRef: 'आवेदन संदर्भ',
    colApplicantContact: 'आवेदक एवं संपर्क',
    colCategoryLoad: 'श्रेणी एवं लोड',
    colSubdivision: 'उप-संभाग',
    colEstSanction: 'अनुमानित स्वीकृति शुल्क',
    colLifecycleStatus: 'प्रक्रिया स्थिति एवं समीक्षा चरण',
    colActions: 'कार्रवाई',
    noAppsMatchEmpty: 'चयनित स्थिति फ़िल्टर या खोज से कोई आवेदन मेल नहीं खाता।',
    filedDatePrefix: 'दर्ज:',
    clarificationRequestedBadge: 'स्पष्टीकरण मांगा गया',
    archivedByPrefix: 'द्वारा संग्रहीत:',
    inspectCaseBtn: 'केस जांचें',
    archiveBtn: 'संग्रहीत करें',
    archiveBtnTitle: 'पूर्ण/अस्वीकृत आवेदन को सक्रिय कतार से संग्रहीत करें',
    restoreBtn: 'पुनर्स्थापित करें',
    restoreBtnTitle: 'आवेदन को सक्रिय कतार में पुनर्स्थापित करें',

    consumerLedgerTitle: 'उपभोक्ता रिकॉर्ड एवं ऊर्जा खाता-बही',
    consumerLedgerSubtitle: 'मीटर सीरियल और सुरक्षा जमा राशि के साथ मास्टर कनेक्शन डेटाबेस',
    colConsumerNo: 'उपभोक्ता क्र.',
    colNameAddress: 'नाम एवं पता',
    colTariffCategory: 'टैरिफ श्रेणी',
    colConnectedFeeder: 'संबद्ध फीडर',
    colMeterSerial: 'मीटर सीरियल',
    colCurrentReading: 'वर्तमान रीडिंग',
    colStatus: 'स्थिति',

    complaintMatrixTitle: 'उप-संभागीय शिकायत निवारण मैट्रिक्स',
    complaintMatrixSubtitle: 'SLA निगरानी, तकनीशियन डिस्पैच और समाधान अनुमोदन',
    colTicketId: 'टिकट आईडी',
    colConsumer: 'उपभोक्ता',
    colCategoryDesc: 'श्रेणी एवं विवरण',
    colPriority: 'प्राथमिकता',
    colSlaWindow: 'SLA समयसीमा',
    actionTicketBtn: 'टिकट कार्रवाई',

    approvalCenterTitle: 'अनुमोदन केंद्र — मानव-नियंत्रित AI गवर्नेंस',
    approvalCenterSubtitle: 'ऑपरेशंस को-पायलट AI द्वारा जनित साक्ष्य-आधारित प्रस्तावों की समीक्षा करें। निष्पादन के लिए अधिकृत मानवीय स्वीकृति अनिवार्य है।',
    rbacGuardActiveBadge: 'RBAC सुरक्षा: सक्रिय',
    metricTotalProposals: 'कुल AI प्रस्ताव',
    metricGroundedInErp: 'ERP डेटा पर आधारित',
    metricAwaitingDecision: 'ऑपरेटर निर्णय की प्रतीक्षा में',
    metricPendingReview: 'समीक्षाधीन',
    metricApprovedExecuted: 'स्वीकृत एवं निष्पादित',
    metricCommittedToErp: 'ERP में दर्ज',
    metricRejectedProposals: 'अस्वीकृत प्रस्ताव',
    metricCancelledByHuman: 'ऑपरेटर द्वारा निरस्त',
    filterAllProposals: 'सभी प्रस्ताव',
    filterPendingReview: 'समीक्षाधीन',
    filterApprovedExecuted: 'स्वीकृत एवं निष्पादित',
    filterRejected: 'अस्वीकृत',
    colIdAgent: 'आईडी एवं एजेंट',
    colActionTarget: 'कार्रवाई एवं लक्ष्य',
    colStateDiff: 'स्थिति परिवर्तन',
    colRiskLevel: 'जोखिम स्तर',
    colRequiredRole: 'आवश्यक भूमिका',
    colOperatorReview: 'ऑपरेटर समीक्षा',
    noProposalsEmpty: 'इस फ़िल्टर में कोई AI अनुशंसा नहीं मिली।',
    reviewAndDecideBtn: 'समीक्षा एवं निर्णय',
    reviewedByPrefix: 'द्वारा:',

    interDeptRequisitionsTitle: 'अंतर-विभागीय मांगपत्र',
    req1Dept: 'मीटरिंग एवं टेस्टिंग स्क्वाड',
    req1Desc: 'APP-2026-0842 के लिए 4G AMR स्मार्ट मीटर की मांग',
    req1StatusDispatched: 'रवाना किया गया',
    req2Dept: 'सिविल एवं पोल इरेक्शन विंग',
    req2Desc: 'देदियासण GIDC प्लॉट 48 के लिए रोड क्रॉसिंग अनुमति',
    req2StatusInReview: 'समीक्षाधीन',
    lineSquadMobilizationTitle: 'लाइन स्क्वाड आपातकालीन तैनाती',
    lineSquadMobilizationDesc: 'गांधीनगर और मेहसाणा डिवीजनों के 8 फीडरों पर सक्रिय लाइन पेट्रोलिंग टीमें स्टैंडबाय पर हैं।',
    emergencyChannelStatus: 'उप-संभाग आपातकालीन चैनल 4: तैयार · हॉट-लाइन परमिट प्रोटोकॉल सक्रिय।',

    revenueReportTitle: 'उप-संभाग राजस्व एवं संग्रहण समाधान',
    revenueReportSubtitle: 'गांधीनगर उप-संभाग 2 के लिए मासिक बिलिंग मांग बनाम संग्रहण',
    exportCsvBtn: 'CSV निर्यात करें',
    exportedCsvToast: 'राजस्व विवरण CSV के रूप में निर्यात किया गया (डेमो)',
    revTotalEnergyBilled: 'कुल बिल की गई ऊर्जा',
    revTotalEnergyValue: '161.9 MU',
    revCollectedTitle: 'संग्रहीत राजस्व',
    revCollectedValue: '₹79.6 करोड़',
    revEfficiencyTitle: 'संग्रहण दक्षता',

    drawerTypeApplication: 'आवेदन',
    drawerTypeComplaint: 'शिकायत',
    drawerTypeWorkOrder: 'वर्क ऑर्डर',
    drawerCurrentLifecycleStage: 'वर्तमान प्रक्रिया चरण',
    drawerStepOfFivePattern: 'चरण {step} / 5',
    drawerAppliedTargetPattern: 'आवेदन तिथि: {applied} · लक्षित पूर्णता: {target}',
    drawerClarificationRequiredTitle: 'स्पष्टीकरण आवश्यक है',
    drawerRejectionNoticeTitle: 'आवेदन अस्वीकृति सूचना',
    drawerRejectionDefaultNote: 'आवेदन नियामक या तकनीकी व्यवहार्यता मानदंडों को पूरा नहीं करता है।',
    drawerFiveStageProgressTitle: '5-चरणीय आवेदन प्रगति',
    drawerStageCompleted: 'पूर्ण',
    drawerStageCurrent: 'वर्तमान चरण',
    drawerStageUpcoming: 'आगामी',
    drawerApplicantHeading: 'आवेदक',
    drawerSanctionSpecsHeading: 'स्वीकृति विवरण',
    drawerLoadLabel: 'लोड:',
    drawerCategoryLabel: 'श्रेणी:',
    drawerEstSanctionLabel: 'अनुमानित शुल्क:',
    drawerSubdivisionLabel: 'उप-संभाग:',
    drawerVerifiedDocsHeading: 'सत्यापित दस्तावेज़',
    drawerLinkedFieldOrderLabel: 'संबद्ध स्थल निरीक्षण ऑर्डर:',
    drawerOpenFieldOrderBtn: 'फील्ड ऑर्डर खोलें',
    drawerSanctionLifecycleActionHeading: 'उप-संभागीय स्वीकृति प्रक्रिया कार्रवाई',
    drawerApproveDocsBtn: 'दस्तावेज़ स्वीकृत करें',
    drawerDispatchInspectionBtn: 'निरीक्षण भेजें',
    drawerSanctionApprovalBtn: 'लोड स्वीकृति दें',
    drawerEnergizeInstallBtn: 'मीटर स्थापित एवं ऊर्जित करें',
    drawerRequestClarificationBtn: 'स्पष्टीकरण मांगें',
    drawerRejectFileBtn: 'फ़ाइल अस्वीकृत करें',
    drawerAuditNotesTrailHeading: 'ऑडिट एवं टिप्पणी इतिहास',
    drawerCurrentStatusCategory: 'वर्तमान स्थिति एवं श्रेणी',
    drawerExpectedResolutionSla: 'अपेक्षित समाधान / SLA',
    drawerWithinHoursPrefix: 'अगले',
    drawerHoursSuffix: 'घंटे के भीतर',
    drawerByTimePrefix: 'तक:',
    drawerGrievanceDetailsHeading: 'शिकायत विवरण',
    drawerComplaintIdLabel: 'शिकायत आईडी:',
    drawerRegisteredOnLabel: 'पंजीकरण समय:',
    drawerConsumerNoLabel: 'उपभोक्ता क्र.:',
    drawerFeederLabel: 'फीडर:',
    drawerAssignedTechLabel: 'नियुक्त तकनीशियन:',
    drawerUnassigned: 'असाइन नहीं किया गया',
    drawerResolutionSummaryHeading: 'समाधान सारांश',
    drawerResolutionDefaultNote: 'फील्ड तकनीशियन द्वारा समस्या का समाधान कर आपूर्ति बहाल कर दी गई है।',
    drawerResolutionTimelineHeading: 'समाधान समयरेखा',
    drawerLinkedDispatchOrderLabel: 'संबद्ध फील्ड डिस्पैच ऑर्डर:',
    drawerUpdateRedressalHeading: 'निवारण स्थिति अपडेट करें',
    drawerDispatchLinemanBtn: 'फील्ड लाइनमैन भेजें',
    drawerMarkInProgressBtn: 'प्रगति पर चिह्नित करें',
    drawerMarkResolvedBtn: 'समाधानित चिह्नित करें',
    drawerLinkedConnAppLabel: 'संबद्ध कनेक्शन आवेदन:',
    drawerViewApplicationBtn: 'आवेदन देखें',
    drawerLinkedGrievanceLabel: 'संबद्ध उपभोक्ता शिकायत:',
    drawerViewGrievanceBtn: 'शिकायत देखें',
    drawerTaskStatusLabel: 'कार्य स्थिति',
    drawerScheduledLabel: 'निर्धारित तिथि',
    drawerWorkDetailsHeading: 'कार्य विवरण',
    drawerAssignedToLabel: 'नियुक्त अधिकारी:',
    drawerMaterialsRequiredHeading: 'आवश्यक सामग्री',
    drawerFieldProgressActionHeading: 'फील्ड प्रगति कार्रवाई',
    drawerStartTripBtn: 'यात्रा शुरू करें (मार्ग में)',
    drawerArrivedOnSiteBtn: 'स्थल पर पहुँचे',
    drawerSubmitInspectionCompleteBtn: 'निरीक्षण प्रस्तुत करें एवं पूर्ण करें',
    drawerAppendOfficialNoteLabel: 'आधिकारिक टिप्पणी / नोट जोड़ें',
    drawerNoteInputPlaceholder: 'केस टिप्पणी या निरीक्षण अपडेट लिखें...',
    drawerSaveNoteBtn: 'सहेजें',
    drawerSavedNoteToast: 'केस नोट जोड़ा गया #',

    approvalModalCloseAria: 'अनुमोदन संवाद बंद करें',
    approvalModalRiskSuffix: 'जोखिम',
    approvalModalRequiredApproverPrefix: 'आवश्यक अनुमोदक:',
    approvalModalRecommendedByPrefix: 'अनुशंसाकर्ता:',
    approvalModalStateTransitionHeading: 'स्थिति परिवर्तन पूर्वावलोकन (प्रस्तावित बदलाव)',
    approvalModalAffectedEntityLabel: 'प्रभावित इकाई',
    approvalModalAiReasoningLabel: 'AI साक्ष्य-आधारित तर्क:',
    approvalModalSupportingRefsLabel: 'सहायक रिकॉर्ड संदर्भ (ERP तथ्य):',
    approvalModalActiveIdentityLabel: 'सक्रिय अनुमोदक पहचान:',
    approvalModalActiveRoleLabel: 'सक्रिय भूमिका:',
    approvalModalIdentityVerifiedMsg: 'पहचान सत्यापित: इस परिचालन निर्णय को निष्पादित करने के लिए अधिकृत।',
    approvalModalAuthRestrictedPrefix: 'अधिकार प्रतिबंधित:',
    approvalModalRemarksLabel: 'ऑपरेटर समीक्षा टिप्पणी',
    approvalModalMandatoryRiskSuffix: '* ({risk} जोखिम के लिए अनिवार्य)',
    approvalModalPlaceholderAuthorized: 'परिचालन औचित्य, सत्यापन नोट या अस्वीकृति का कारण दर्ज करें...',
    approvalModalPlaceholderRestricted: 'इस प्रस्ताव को स्वीकृत या अस्वीकृत करने के लिए अधिकृत भूमिका पर स्विच करें।',
    approvalModalErrorMandatory: 'उच्च और अत्यंत गंभीर जोखिम वाली कार्रवाइयों के लिए समीक्षा टिप्पणी अनिवार्य है (न्यूनतम 5 अक्षर)।',
    approvalModalErrorRejectionReason: 'कृपया इस AI अनुशंसा को अस्वीकृत करने का संक्षिप्त कारण बताएं।',
    approvalModalGovernanceFooter: 'मानव-नियंत्रित गवर्नेंस: AI अनुशंसा करता है, ऑपरेटर निर्णय लेता है।',
    approvalModalCancelBtn: 'रद्द करें',
    approvalModalRejectBtn: 'प्रस्ताव अस्वीकृत करें',
    approvalModalApproveExecuteBtn: 'स्वीकृत करें एवं निष्पादित करें',

    incidentModalSubtitle: 'आधिकारिक UGVCL ERP परिचालन घटना रिकॉर्ड',
    incidentModalStandbyAlerts: 'स्टैंडबाय फील्ड एवं कार्यपालक अलर्ट सक्रिय।',
    incidentModalFieldAssignmentLabel: 'फील्ड नियुक्ति:',
    incidentModalAssignedLabel: 'नियुक्ति समय:',
    incidentModalInstructionsLabel: 'निर्देश:',
    incidentModalDeclinedTitle: 'असाइनमेंट अस्वीकृत:',
    incidentModalDeclinedAtLabel: 'अस्वीकृति समय:',
    incidentModalMandatoryDeclineReasonLabel: 'अनिवार्य अस्वीकृति कारण:',
    incidentModalManagementEscalationLabel: 'प्रबंधन एस्केलेशन:',
    incidentModalEscalatedAtLabel: 'एस्केलेशन समय:',
    incidentModalJustificationLabel: 'औचित्य:',
    incidentModalDecisionStatusLabel: 'निर्णय स्थिति:',
    incidentModalOnSiteFindingsHeading: 'स्थल पर तकनीकी निष्कर्ष',
    incidentModalFinalRectificationHeading: 'अंतिम सुधार एवं समाधान रिपोर्ट',
    incidentModalFiledByPrefix: 'दर्ज कर्ता:',
    incidentModalFiledOnPrefix: 'समय:',
    incidentModalEmployeeDeskOptionsHeading: 'कर्मचारी घटना नियंत्रण डेस्क विकल्प',
    incidentModalCurrentStatusLabel: 'वर्तमान घटना स्थिति:',
    incidentModalExecutiveDecisionLabel: 'कार्यपालक निर्णय:',
    incidentModalEmployeeDeskHint: 'पुनः नियुक्त करने या आगे भेजने के लिए, कर्मचारी पोर्टल में घटना नियंत्रण डेस्क तालिका के एक्शन बटनों का उपयोग करें।',
    incidentModalTimezoneFooter: 'VidyutFlow कोर · समयक्षेत्र: Asia/Kolkata',
    notifDrawerTargetChannelLabel: 'लक्षित परिचालन चैनल',
    notifDrawerOptManagement: 'प्रबंधन पोर्टल (कार्यपालक)',
    notifDrawerOptField: 'फील्ड अभियंता (सबस्टेशन JE)',
    notifDrawerOptEmployee: 'परिचालन डेस्क (डिवीजन)',
    notifDrawerOptAdmin: 'सिस्टम एडमिन एवं साइबर सुरक्षा',
    notifDrawerConfirmFieldAssignBtn: 'फील्ड नियुक्ति की पुष्टि करें',
    notifDrawerConfirmEscalationBtn: 'एस्केलेशन की पुष्टि करें',
    notifDrawerConfirmResolutionBtn: 'समाधान की पुष्टि करें'
  },

  mr: {
    topBarTitle: 'उप-विभागीय परिचालन आणि मंजुरी डेस्क',
    topBarCircleBadge: 'गांधीनगर आणि मेहसाणा मंडळ',
    topBarCorporateOfficerPrefix: 'UGVCL कॉर्पोरेट · अधिकारी:',
    refreshWorklistBtn: 'कार्यसूची रिफ्रेश करा',
    refreshedStreamToast: 'रिअल-टाइम ERP इव्हेंट स्ट्रीम रिफ्रेश केली गेली',

    activeIncidentsBannerPrefix: 'उप-विभाग नियंत्रण डेस्कमध्ये सक्रिय परिचालन घटना',
    activeIncidentsBannerSuffix: 'सक्रिय',
    criticalCountSuffix: 'अत्यंत गंभीर',
    kpiPendingScrutinyTitle: 'प्रलंबित दस्तऐवज छाननी',
    kpiFilesUnit: 'फाइल्स',
    kpiPendingScrutinySub: 'दस्तऐवज मंजुरीच्या प्रतीक्षेत',
    kpiFieldFeasibilityTitle: 'स्थळ व्यवहार्यता तपासणीखाली',
    kpiSitesUnit: 'स्थळे',
    kpiFieldFeasibilitySub: 'JE सोलंकी यांच्याकडे सोपवले',
    kpiSanctionApprovalsTitle: 'लोड मंजुरी परवानग्या',
    kpiReadyUnit: 'तयार',
    kpiSanctionApprovalsSub: 'अंदाजपत्रक मंजुरी प्रलंबित',
    kpiActiveGrievancesTitle: 'सक्रिय तक्रारी',
    kpiTicketsUnit: 'तिकिटे',
    kpiZeroBreachedSlas: '0 SLA उल्लंघन',
    tatChartTitle: 'उप-विभागीय TAT (निवारण वेळ तासांमध्ये)',
    tatChartSubtitle: 'उप-विभागानुसार सरासरी तक्रार निवारण विरुद्ध SLA मानक',
    tatChartLegendAvgHours: 'सरासरी TAT (तास)',
    smartSuggestionsTitle: 'UGVCL स्मार्ट सूचना',
    suggestion1Title: 'APP-2026-0844 मंजुरीसाठी तयार',
    suggestion1Badge: '96% सुसंगत',
    suggestion1Body: 'JE सोलंकी यांच्याकडून 0% ओव्हरलोड जोखमीसह स्थळ अहवाल प्राप्त झाला. डिमांड नोट तयार करण्यासाठी 1-क्लिकने मंजूर करा.',
    suggestion1Btn: 'आताच मंजुरी अधिकृत करा →',
    suggestion1Note: 'जलद सूचनेद्वारे मंजूर केले',
    suggestion2Title: 'CMP-8821 व्होल्टेज घट',
    suggestion2SlaBadge: 'SLA: 12 तास',
    suggestion2Body: 'ग्राहक मीनाबेन पटेल यांनी व्होल्टेज घटीची तक्रार नोंदवली आहे. फिडर SCADA 11kV लाईनवर 184A भार दर्शवतो.',
    suggestion2Btn: 'केस ड्रॉअर उघडा →',

    appQueueTitle: 'नवीन वीज जोडणी अर्जांची रांग',
    appQueueSubtitle: 'दस्तऐवज छाननी, स्थळ निरीक्षण, भार मंजुरी आणि पूर्ण झालेल्या अर्जांचे संग्रहण व्यवस्थापित करा',
    searchAppPlaceholder: 'अर्ज आयडी किंवा अर्जदाराचे नाव शोधा...',
    searchAppAriaLabel: 'अर्ज आयडी किंवा अर्जदार शोधा',
    filterStatusAriaLabel: 'स्थितीनुसार अर्ज फिल्टर करा',
    optAllActive: 'सर्व सक्रिय',
    optActionRequired: 'कृती आवश्यक',
    optSubmittedNew: 'सादर केलेले (नवीन)',
    optDocVerification: 'दस्तऐवज पडताळणी (प्रगतीपथावर)',
    optSiteInspection: 'स्थळ निरीक्षण (प्रगतीपथावर)',
    optSanctionApproval: 'भार मंजुरी (मंजुरीच्या प्रतीक्षेत)',
    optMeterInstalled: 'मीटर बसवले (मंजूर / पूर्ण)',
    optRejected: 'नामंजूर',
    optArchived: 'संग्रहित (आर्काइव्ह)',
    pillAllActive: 'सर्व सक्रिय',
    pillNeedsReview: 'पुनरावलोकन आवश्यक',
    pillSubmitted: 'सादर केलेले',
    pillDocScrutiny: 'दस्तऐवज छाननी',
    pillSiteInspection: 'स्थळ निरीक्षण',
    pillAwaitingApproval: 'मंजुरीच्या प्रतीक्षेत',
    pillApprovedEnergized: 'मंजूर / कार्यान्वित',
    pillRejected: 'नामंजूर',
    pillArchived: 'संग्रहित',
    archiveConfirmTitlePrefix: 'साठी सुरक्षित रांग संग्रहणाची पुष्टी करा:',
    archiveConfirmBody: 'हे पूर्ण झालेले/नामंजूर अर्ज सक्रिय कर्मचारी कार्यसूचीतून काढून टाकेल आणि त्याचा संपूर्ण ऑडिट ट्रेल व ग्राहक पोर्टल रेकॉर्ड सुरक्षित ठेवेल.',
    archiveRemarkPlaceholder: 'पर्यायी संग्रहण शेरा...',
    archiveConfirmBtn: 'संग्रहणाची पुष्टी करा',
    colAppRef: 'अर्ज संदर्भ',
    colApplicantContact: 'अर्जदार आणि संपर्क',
    colCategoryLoad: 'श्रेणी आणि भार',
    colSubdivision: 'उप-विभाग',
    colEstSanction: 'अंदाजित मंजुरी शुल्क',
    colLifecycleStatus: 'प्रक्रिया स्थिती आणि पुनरावलोकन टप्पा',
    colActions: 'कृती',
    noAppsMatchEmpty: 'निवडलेल्या स्थिती फिल्टर किंवा शोधाशी कोणताही अर्ज जुळत नाही.',
    filedDatePrefix: 'नोंदणी:',
    clarificationRequestedBadge: 'स्पष्टीकरण मागवले',
    archivedByPrefix: 'द्वारे संग्रहित:',
    inspectCaseBtn: 'केस तपासा',
    archiveBtn: 'संग्रहित करा',
    archiveBtnTitle: 'पूर्ण/नामंजूर अर्ज सक्रिय रांगेतून संग्रहित करा',
    restoreBtn: 'पुनर्संचयित करा',
    restoreBtnTitle: 'अर्ज सक्रिय रांगेत पुनर्संचयित करा',

    consumerLedgerTitle: 'ग्राहक रेकॉर्ड आणि ऊर्जा खातेवही',
    consumerLedgerSubtitle: 'मीटर सिरियल आणि सुरक्षा ठेवीसह मुख्य वीज जोडणी डेटाबेस',
    colConsumerNo: 'ग्राहक क्र.',
    colNameAddress: 'नाव आणि पत्ता',
    colTariffCategory: 'टॅरिफ श्रेणी',
    colConnectedFeeder: 'जोडलेला फिडर',
    colMeterSerial: 'मीटर सिरियल',
    colCurrentReading: 'सद्य रीडिंग',
    colStatus: 'स्थिती',

    complaintMatrixTitle: 'उप-विभागीय तक्रार निवारण मॅट्रिक्स',
    complaintMatrixSubtitle: 'SLA निरीक्षण, तंत्रज्ञ रवानगी आणि निवारण स्वाक्षरी',
    colTicketId: 'तिकीट आयडी',
    colConsumer: 'ग्राहक',
    colCategoryDesc: 'श्रेणी आणि वर्णन',
    colPriority: 'प्राधान्य',
    colSlaWindow: 'SLA कालमर्यादा',
    actionTicketBtn: 'तिकीट कृती',

    approvalCenterTitle: 'मंजुरी केंद्र — मानव-नियंत्रित AI गव्हर्नन्स',
    approvalCenterSubtitle: 'ऑपरेशन्स को-पायलट AI द्वारे तयार केलेल्या पुराव्यावर आधारित प्रस्तावांचे पुनरावलोकन करा. अंमलबजावणीसाठी अधिकृत मानवी मंजुरी आवश्यक आहे.',
    rbacGuardActiveBadge: 'RBAC सुरक्षा: सक्रिय',
    metricTotalProposals: 'एकूण AI प्रस्ताव',
    metricGroundedInErp: 'ERP डेटावर आधारित',
    metricAwaitingDecision: 'ऑपरेटर निर्णयाच्या प्रतीक्षेत',
    metricPendingReview: 'पुनरावलोकनाधीन',
    metricApprovedExecuted: 'मंजूर आणि कार्यान्वित',
    metricCommittedToErp: 'ERP मध्ये नोंदवलेले',
    metricRejectedProposals: 'नाकारलेले प्रस्ताव',
    metricCancelledByHuman: 'ऑपरेटरद्वारे रद्द',
    filterAllProposals: 'सर्व प्रस्ताव',
    filterPendingReview: 'पुनरावलोकनाधीन',
    filterApprovedExecuted: 'मंजूर आणि कार्यान्वित',
    filterRejected: 'नाकारलेले',
    colIdAgent: 'आयडी आणि एजंट',
    colActionTarget: 'कृती आणि लक्ष्य',
    colStateDiff: 'स्थिती बदल',
    colRiskLevel: 'जोखीम पातळी',
    colRequiredRole: 'आवश्यक भूमिका',
    colOperatorReview: 'ऑपरेटर पुनरावलोकन',
    noProposalsEmpty: 'या फिल्टरमध्ये कोणतीही AI शिफारस आढळली नाही.',
    reviewAndDecideBtn: 'पुनरावलोकन आणि निर्णय',
    reviewedByPrefix: 'द्वारे:',

    interDeptRequisitionsTitle: 'आंतर-विभागीय मागणीपत्रे',
    req1Dept: 'मीटरिंग आणि टेस्टिंग पथक',
    req1Desc: 'APP-2026-0842 साठी 4G AMR स्मार्ट मीटरची मागणी',
    req1StatusDispatched: 'रवाना केले',
    req2Dept: 'सिव्हिल आणि पोल उभारणी विभाग',
    req2Desc: 'देदियासण GIDC प्लॉट 48 साठी रस्ता ओलांडण्याची परवानगी',
    req2StatusInReview: 'पुनरावलोकनाधीन',
    lineSquadMobilizationTitle: 'लाईन पथक आपत्कालीन तैनाती',
    lineSquadMobilizationDesc: 'गांधीनगर आणि मेहसाणा विभागातील 8 फिडरवर सक्रिय लाईन गस्त पथके सज्ज आहेत.',
    emergencyChannelStatus: 'उप-विभाग आपत्कालीन चॅनेल 4: सज्ज · हॉट-लाईन परमिट प्रोटोकॉल सक्रिय.',

    revenueReportTitle: 'उप-विभाग महसूल आणि वसुली ताळमेळ',
    revenueReportSubtitle: 'गांधीनगर उप-विभाग 2 साठी मासिक बिलिंग मागणी विरुद्ध वसुली',
    exportCsvBtn: 'CSV निर्यात करा',
    exportedCsvToast: 'महसूल विवरण CSV म्हणून निर्यात केले (डेमो)',
    revTotalEnergyBilled: 'एकूण बिल केलेली ऊर्जा',
    revTotalEnergyValue: '161.9 MU',
    revCollectedTitle: 'गोळा केलेला महसूल',
    revCollectedValue: '₹79.6 कोटी',
    revEfficiencyTitle: 'वसुली कार्यक्षमता',

    drawerTypeApplication: 'अर्ज',
    drawerTypeComplaint: 'तक्रार',
    drawerTypeWorkOrder: 'वर्क ऑर्डर',
    drawerCurrentLifecycleStage: 'सद्य प्रक्रिया टप्पा',
    drawerStepOfFivePattern: 'टप्पा {step} / 5',
    drawerAppliedTargetPattern: 'अर्ज दिनांक: {applied} · लक्षित पूर्णता: {target}',
    drawerClarificationRequiredTitle: 'स्पष्टीकरण आवश्यक आहे',
    drawerRejectionNoticeTitle: 'अर्ज नामंजुरी सूचना',
    drawerRejectionDefaultNote: 'अर्ज नियामक किंवा तांत्रिक व्यवहार्यता निकष पूर्ण करत नाही.',
    drawerFiveStageProgressTitle: '5-टप्प्यांची अर्ज प्रगती',
    drawerStageCompleted: 'पूर्ण',
    drawerStageCurrent: 'सद्य टप्पा',
    drawerStageUpcoming: 'आगामी',
    drawerApplicantHeading: 'अर्जदार',
    drawerSanctionSpecsHeading: 'मंजुरी तपशील',
    drawerLoadLabel: 'भार:',
    drawerCategoryLabel: 'श्रेणी:',
    drawerEstSanctionLabel: 'अंदाजित शुल्क:',
    drawerSubdivisionLabel: 'उप-विभाग:',
    drawerVerifiedDocsHeading: 'पडताळलेले दस्तऐवज',
    drawerLinkedFieldOrderLabel: 'जोडलेली स्थळ निरीक्षण ऑर्डर:',
    drawerOpenFieldOrderBtn: 'फील्ड ऑर्डर उघडा',
    drawerSanctionLifecycleActionHeading: 'उप-विभागीय मंजुरी प्रक्रिया कृती',
    drawerApproveDocsBtn: 'दस्तऐवज मंजूर करा',
    drawerDispatchInspectionBtn: 'निरीक्षण पाठवा',
    drawerSanctionApprovalBtn: 'भार मंजुरी द्या',
    drawerEnergizeInstallBtn: 'मीटर बसवा आणि कार्यान्वित करा',
    drawerRequestClarificationBtn: 'स्पष्टीकरण मागवा',
    drawerRejectFileBtn: 'फाइल नामंजूर करा',
    drawerAuditNotesTrailHeading: 'ऑडिट आणि शेरा इतिहास',
    drawerCurrentStatusCategory: 'सद्य स्थिती आणि श्रेणी',
    drawerExpectedResolutionSla: 'अपेक्षित निवारण / SLA',
    drawerWithinHoursPrefix: 'पुढील',
    drawerHoursSuffix: 'तासांच्या आत',
    drawerByTimePrefix: 'पर्यंत:',
    drawerGrievanceDetailsHeading: 'तक्रार तपशील',
    drawerComplaintIdLabel: 'तक्रार आयडी:',
    drawerRegisteredOnLabel: 'नोंदणी वेळ:',
    drawerConsumerNoLabel: 'ग्राहक क्र.:',
    drawerFeederLabel: 'फिडर:',
    drawerAssignedTechLabel: 'नियुक्त तंत्रज्ञ:',
    drawerUnassigned: 'नियुक्त नाही',
    drawerResolutionSummaryHeading: 'निवारण सारांश',
    drawerResolutionDefaultNote: 'फील्ड तंत्रज्ञांद्वारे समस्येचे निवारण करून वीज पुरवठा पूर्ववत केला आहे.',
    drawerResolutionTimelineHeading: 'निवारण कालरेषा',
    drawerLinkedDispatchOrderLabel: 'जोडलेली फील्ड डिस्पॅच ऑर्डर:',
    drawerUpdateRedressalHeading: 'निवारण स्थिती अद्यतनित करा',
    drawerDispatchLinemanBtn: 'फील्ड लाईनमन पाठवा',
    drawerMarkInProgressBtn: 'प्रगतीपथावर चिन्हांकित करा',
    drawerMarkResolvedBtn: 'निवारण झालेले चिन्हांकित करा',
    drawerLinkedConnAppLabel: 'जोडलेला वीज जोडणी अर्ज:',
    drawerViewApplicationBtn: 'अर्ज पहा',
    drawerLinkedGrievanceLabel: 'जोडलेली ग्राहक तक्रार:',
    drawerViewGrievanceBtn: 'तक्रार पहा',
    drawerTaskStatusLabel: 'कार्य स्थिती',
    drawerScheduledLabel: 'नियोजित दिनांक',
    drawerWorkDetailsHeading: 'कार्य तपशील',
    drawerAssignedToLabel: 'नियुक्त अधिकारी:',
    drawerMaterialsRequiredHeading: 'आवश्यक साहित्य',
    drawerFieldProgressActionHeading: 'फील्ड प्रगती कृती',
    drawerStartTripBtn: 'प्रवास सुरू करा (मार्गावर)',
    drawerArrivedOnSiteBtn: 'स्थळावर पोहोचले',
    drawerSubmitInspectionCompleteBtn: 'निरीक्षण सादर करा आणि पूर्ण करा',
    drawerAppendOfficialNoteLabel: 'अधिकृत शेरा / नोंद जोडा',
    drawerNoteInputPlaceholder: 'केस शेरा किंवा निरीक्षण अद्यतन लिहा...',
    drawerSaveNoteBtn: 'जतन करा',
    drawerSavedNoteToast: 'केस नोंद जोडली गेली #',

    approvalModalCloseAria: 'मंजुरी संवाद बंद करा',
    approvalModalRiskSuffix: 'जोखीम',
    approvalModalRequiredApproverPrefix: 'आवश्यक मंजूरकर्ता:',
    approvalModalRecommendedByPrefix: 'शिफारसकर्ता:',
    approvalModalStateTransitionHeading: 'स्थिती बदल पूर्वावलोकन (प्रस्तावित बदल)',
    approvalModalAffectedEntityLabel: 'बाधित घटक',
    approvalModalAiReasoningLabel: 'AI पुराव्यावर आधारित तर्क:',
    approvalModalSupportingRefsLabel: 'आधारभूत रेकॉर्ड संदर्भ (ERP तथ्ये):',
    approvalModalActiveIdentityLabel: 'सक्रिय मंजूरकर्ता ओळख:',
    approvalModalActiveRoleLabel: 'सक्रिय भूमिका:',
    approvalModalIdentityVerifiedMsg: 'ओळख पडताळली: हा परिचालन निर्णय कार्यान्वित करण्यासाठी अधिकृत.',
    approvalModalAuthRestrictedPrefix: 'अधिकार प्रतिबंधित:',
    approvalModalRemarksLabel: 'ऑपरेटर पुनरावलोकन शेरा',
    approvalModalMandatoryRiskSuffix: '* ({risk} जोखमीसाठी अनिवार्य)',
    approvalModalPlaceholderAuthorized: 'परिचालन औचित्य, पडताळणी नोंद किंवा नाकारण्याचे कारण प्रविष्ट करा...',
    approvalModalPlaceholderRestricted: 'हा प्रस्ताव मंजूर किंवा नामंजूर करण्यासाठी अधिकृत भूमिकेवर स्विच करा.',
    approvalModalErrorMandatory: 'उच्च आणि अत्यंत गंभीर जोखमीच्या कृतींसाठी पुनरावलोकन शेरा अनिवार्य आहे (किमान 5 अक्षरे).',
    approvalModalErrorRejectionReason: 'कृपया ही AI शिफारस नाकारण्याचे संक्षिप्त कारण द्या.',
    approvalModalGovernanceFooter: 'मानव-नियंत्रित गव्हर्नन्स: AI शिफारस करते, ऑपरेटर निर्णय घेतो.',
    approvalModalCancelBtn: 'रद्द करा',
    approvalModalRejectBtn: 'प्रस्ताव फेटाळा',
    approvalModalApproveExecuteBtn: 'मंजूर करा आणि कार्यान्वित करा',

    incidentModalSubtitle: 'अधिकृत UGVCL ERP परिचालन घटना रेकॉर्ड',
    incidentModalStandbyAlerts: 'स्टँडबाय फील्ड आणि कार्यकारी अलर्ट सक्रिय.',
    incidentModalFieldAssignmentLabel: 'फील्ड नियुक्ती:',
    incidentModalAssignedLabel: 'नियुक्ती वेळ:',
    incidentModalInstructionsLabel: 'सूचना:',
    incidentModalDeclinedTitle: 'नियुक्ती नाकारली:',
    incidentModalDeclinedAtLabel: 'नाकारण्याची वेळ:',
    incidentModalMandatoryDeclineReasonLabel: 'अनिवार्य नकार कारण:',
    incidentModalManagementEscalationLabel: 'व्यवस्थापन एस्केलेशन:',
    incidentModalEscalatedAtLabel: 'एस्केलेशन वेळ:',
    incidentModalJustificationLabel: 'औचित्य:',
    incidentModalDecisionStatusLabel: 'निर्णय स्थिती:',
    incidentModalOnSiteFindingsHeading: 'स्थळावरील तांत्रिक निष्कर्ष',
    incidentModalFinalRectificationHeading: 'अंतिम दुरुस्ती आणि निवारण अहवाल',
    incidentModalFiledByPrefix: 'नोंदणीकर्ता:',
    incidentModalFiledOnPrefix: 'वेळ:',
    incidentModalEmployeeDeskOptionsHeading: 'कर्मचारी घटना नियंत्रण डेस्क पर्याय',
    incidentModalCurrentStatusLabel: 'सद्य घटना स्थिती:',
    incidentModalExecutiveDecisionLabel: 'कार्यकारी निर्णय:',
    incidentModalEmployeeDeskHint: 'पुनर्नियुक्त करण्यासाठी किंवा वर्ग करण्यासाठी, कर्मचारी पोर्टलमधील घटना नियंत्रण डेस्क तक्त्यावरील कृती बटणे वापरा.',
    incidentModalTimezoneFooter: 'VidyutFlow कोर · टाइमझोन: Asia/Kolkata',
    notifDrawerTargetChannelLabel: 'लक्षित परिचालन चॅनेल',
    notifDrawerOptManagement: 'व्यवस्थापन पोर्टल (कार्यकारी)',
    notifDrawerOptField: 'फील्ड अभियंता (उपकेंद्र JE)',
    notifDrawerOptEmployee: 'परिचालन डेस्क (विभाग)',
    notifDrawerOptAdmin: 'सिस्टम ॲडमिन आणि सायबर सुरक्षा',
    notifDrawerConfirmFieldAssignBtn: 'फील्ड नियुक्ती निश्चित करा',
    notifDrawerConfirmEscalationBtn: 'एस्केलेशन निश्चित करा',
    notifDrawerConfirmResolutionBtn: 'निवारण निश्चित करा'
  }
};

export function getEmployeeUiTranslations(lang: LanguageCode): EmployeeUiDictionary {
  return EMPLOYEE_UI_TRANSLATIONS[lang] || EMPLOYEE_UI_TRANSLATIONS.en;
}

export function localizeEmployeeDesignation(designation: string | undefined, lang: LanguageCode): string {
  if (!designation || lang === 'en') return designation || '';
  const map: Record<string, Record<LanguageCode, string>> = {
    'Assistant Engineer (Commerce & Ops)': {
      en: 'Assistant Engineer (Commerce & Ops)',
      gu: 'મદદનીશ ઇજનેર (વાણિજ્ય અને સંચાલન)',
      hi: 'सहायक अभियंता (वाणिज्य एवं परिचालन)',
      mr: 'सहाय्यक अभियंता (वाणिज्य आणि परिचालन)'
    },
    'Executive Engineer — Operations': {
      en: 'Executive Engineer — Operations',
      gu: 'કાર્યપાલક ઇજનેર — સંચાલન',
      hi: 'अधिशासी अभियंता — परिचालन',
      mr: 'कार्यकारी अभियंता — परिचालन'
    },
    'Deputy Executive Engineer': {
      en: 'Deputy Executive Engineer',
      gu: 'નાયબ કાર્યપાલક ઇજનેર',
      hi: 'उप अधिशासी अभियंता',
      mr: 'उप कार्यकारी अभियंता'
    },
    'Deputy Executive Engineer (Sub-Division)': {
      en: 'Deputy Executive Engineer (Sub-Division)',
      gu: 'નાયબ કાર્યપાલક ઇજનેર (પેટા-વિભાગ)',
      hi: 'उप अधिशासी अभियंता (उप-संभाग)',
      mr: 'उप कार्यकारी अभियंता (उप-विभाग)'
    },
    'Accounts Officer': {
      en: 'Accounts Officer',
      gu: 'હિસાબી અધિકારી',
      hi: 'लेखा अधिकारी',
      mr: 'लेखा अधिकारी'
    },
    'Junior Engineer (Field Operations)': {
      en: 'Junior Engineer (Field Operations)',
      gu: 'જુનિયર ઇજનેર (ફિલ્ડ સંચાલન)',
      hi: 'कनिष्ठ अभियंता (फील्ड परिचालन)',
      mr: 'कनिष्ठ अभियंता (फील्ड परिचालन)'
    },
    'Senior Line Inspector': {
      en: 'Senior Line Inspector',
      gu: 'વરિષ્ઠ લાઇન ઇન્સ્પેક્ટર',
      hi: 'वरिष्ठ लाइन निरीक्षक',
      mr: 'वरिष्ठ लाईन निरीक्षक'
    },
    'Chief Engineer (Operations & Planning)': {
      en: 'Chief Engineer (Operations & Planning)',
      gu: 'મુખ્ય ઇજનેર (સંચાલન અને આયોજન)',
      hi: 'मुख्य अभियंता (परिचालन एवं योजना)',
      mr: 'मुख्य अभियंता (परिचालन आणि नियोजन)'
    },
    'Superintending Engineer (Circle Head)': {
      en: 'Superintending Engineer (Circle Head)',
      gu: 'અધીક્ષક ઇજનેર (વર્તુળ વડા)',
      hi: 'अधीक्षण अभियंता (सर्कल प्रमुख)',
      mr: 'अधीक्षक अभियंता (मंडळ प्रमुख)'
    },
    'Head of IT & Cybersecurity': {
      en: 'Head of IT & Cybersecurity',
      gu: 'IT અને સાયબર સુરક્ષા વડા',
      hi: 'IT एवं साइबर सुरक्षा प्रमुख',
      mr: 'IT आणि सायबर सुरक्षा प्रमुख'
    },
    'Chief IT Infrastructure & Cyber Architect': {
      en: 'Chief IT Infrastructure & Cyber Architect',
      gu: 'મુખ્ય IT ઇન્ફ્રાસ્ટ્રક્ચર અને સાયબર આર્કિટેક્ટ',
      hi: 'मुख्य IT अवसंरचना एवं साइबर आर्किटेक्ट',
      mr: 'मुख्य IT पायाभूत सुविधा आणि सायबर आर्किटेक्ट'
    },
    'IT & Cyber Resilience': {
      en: 'IT & Cyber Resilience',
      gu: 'IT અને સાયબર સુરક્ષા',
      hi: 'IT एवं साइबर सुरक्षा',
      mr: 'IT आणि सायबर सुरक्षा'
    },
    'System Administrator — IT & Cyber Resilience': {
      en: 'System Administrator — IT & Cyber Resilience',
      gu: 'સિસ્ટમ એડમિનિસ્ટ્રેટર — IT અને સાયબર સુરક્ષા',
      hi: 'सिस्टम प्रशासक — IT एवं साइबर सुरक्षा',
      mr: 'सिस्टम प्रशासक — IT आणि सायबर सुरक्षा'
    },
    'Residential / Domestic Consumer': {
      en: 'Residential / Domestic Consumer',
      gu: 'રહેણાંક / ઘરગથ્થુ ગ્રાહક',
      hi: 'आवासीय / घरेलू उपभोक्ता',
      mr: 'निवासी / घरगुती ग्राहक'
    },
    'Junior Engineer (Field & Vigilance)': {
      en: 'Junior Engineer (Field & Vigilance)',
      gu: 'જુનિયર ઇજનેર (ફિલ્ડ અને વિજિલન્સ)',
      hi: 'कनिष्ठ अभियंता (फील्ड एवं सतर्कता)',
      mr: 'कनिष्ठ अभियंता (फील्ड आणि दक्षता)'
    },
    'Line Inspector & Field Feasibility Officer': {
      en: 'Line Inspector & Field Feasibility Officer',
      gu: 'લાઇન ઇન્સ્પેક્ટર અને સ્થળ શક્યતા અધિકારી',
      hi: 'लाइन निरीक्षक एवं फील्ड व्यवहार्यता अधिकारी',
      mr: 'लाईन निरीक्षक आणि स्थळ व्यवहार्यता अधिकारी'
    },
    'Substation Technician Grade-I': {
      en: 'Substation Technician Grade-I',
      gu: 'સબસ્ટેશન ટેકનિશિયન ગ્રેડ-I',
      hi: 'सबस्टेशन तकनीशियन ग्रेड-I',
      mr: 'उपकेंद्र तंत्रज्ञ श्रेणी-I'
    },
    'Junior Engineer (Field)': {
      en: 'Junior Engineer (Field)',
      gu: 'જુનિયર ઇજનેર (ફિલ્ડ)',
      hi: 'कनिष्ठ अभियंता (फील्ड)',
      mr: 'कनिष्ठ अभियंता (फील्ड)'
    },
    'Junior Engineer (Field) / Sr. Lineman': {
      en: 'Junior Engineer (Field) / Sr. Lineman',
      gu: 'જુનિયર ઇજનેર (ફિલ્ડ) / વરિષ્ઠ લાઇનમેન',
      hi: 'कनिष्ठ अभियंता (फील्ड) / वरिष्ठ लाइनमैन',
      mr: 'कनिष्ठ अभियंता (फील्ड) / वरिष्ठ लाईनमन'
    }
  };
  return map[designation]?.[lang] || designation;
}

export function localizeFieldEngineerStatus(status: string | undefined, lang: LanguageCode): string {
  if (!status || lang === 'en') return status || '';
  const map: Record<string, Record<LanguageCode, string>> = {
    'On Site': {
      en: 'On Site',
      gu: 'સ્થળ પર',
      hi: 'स्थल पर',
      mr: 'स्थळावर'
    },
    Available: {
      en: 'Available',
      gu: 'ઉપલબ્ધ',
      hi: 'उपलब्ध',
      mr: 'उपलब्ध'
    },
    'En Route': {
      en: 'En Route',
      gu: 'માર્ગમાં',
      hi: 'मार्ग में',
      mr: 'मार्गावर'
    },
    Off_Duty: {
      en: 'Off Duty',
      gu: 'ફરજ બહાર',
      hi: 'ड्यूटी से बाहर',
      mr: 'ड्युटीबाहेर'
    }
  };
  return map[status]?.[lang] || status;
}

export function localizePriorityLevel(priority: string | undefined, lang: LanguageCode): string {
  if (!priority || lang === 'en') return priority || '';
  const map: Record<string, Record<LanguageCode, string>> = {
    Critical: {
      en: 'Critical',
      gu: 'અત્યંત ગંભીર',
      hi: 'अत्यंत गंभीर',
      mr: 'अत्यंत गंभीर'
    },
    High: {
      en: 'High',
      gu: 'ઉચ્ચ',
      hi: 'उच्च',
      mr: 'उच्च'
    },
    Medium: {
      en: 'Medium',
      gu: 'મધ્યમ',
      hi: 'मध्यम',
      mr: 'मध्यम'
    },
    Low: {
      en: 'Low',
      gu: 'સામાન્ય',
      hi: 'सामान्य',
      mr: 'सामान्य'
    },
    Emergency: {
      en: 'Emergency',
      gu: 'કટોકટી',
      hi: 'आपातकालीन',
      mr: 'आपत्कालीन'
    },
    Routine: {
      en: 'Routine',
      gu: 'નિયમિત',
      hi: 'नियमित',
      mr: 'नियमित'
    }
  };
  return map[priority]?.[lang] || priority;
}

export function localizeSlaDuration(slaHours: number, lang: LanguageCode): string {
  if (lang === 'en') return `${slaHours}h`;
  if (lang === 'gu') return `${slaHours} કલાક`;
  if (lang === 'hi') return `${slaHours} घं.`;
  return `${slaHours} तास`;
}

export function localizeApplicationStatusMeta(
  meta: ApplicationStatusDisplayMeta,
  lang: LanguageCode
): ApplicationStatusDisplayMeta {
  if (lang === 'en') return meta;

  const shortMap: Record<string, Record<LanguageCode, string>> = {
    Submitted: { en: 'Submitted', gu: 'સબમિટ થયેલ', hi: 'प्रस्तुत', mr: 'सादर केलेले' },
    'Clarification Pending': { en: 'Clarification Pending', gu: 'સ્પષ્ટતા બાકી', hi: 'स्पष्टीकरण लंबित', mr: 'स्पष्टीकरण प्रलंबित' },
    'Clarification Requested': { en: 'Clarification Requested', gu: 'સ્પષ્ટતા માંગવામાં આવી', hi: 'स्पष्टीकरण मांगा गया', mr: 'स्पष्टीकरण मागवले' },
    'In Progress': { en: 'In Progress', gu: 'પ્રગતિમાં', hi: 'प्रगति पर', mr: 'प्रगतीपथावर' },
    'Awaiting Approval': { en: 'Awaiting Approval', gu: 'મંજૂરીની રાહમાં', hi: 'अनुमोदन की प्रतीक्षा में', mr: 'मंजुरीच्या प्रतीक्षेत' },
    'Approved / Completed': { en: 'Approved / Completed', gu: 'મંજૂર / પૂર્ણ', hi: 'स्वीकृत / पूर्ण', mr: 'मंजूर / पूर्ण' },
    'Doc Verification': { en: 'Doc Verification', gu: 'દસ્તાવેજ ચકાસણી', hi: 'दस्तावेज़ सत्यापन', mr: 'दस्तऐवज पडताळणी' },
    'Site Inspection': { en: 'Site Inspection', gu: 'સ્થળ નિરીક્ષણ', hi: 'स्थल निरीक्षण', mr: 'स्थळ निरीक्षण' },
    'Sanction Approval': { en: 'Sanction Approval', gu: 'લોડ મંજૂરી', hi: 'लोड स्वीकृति', mr: 'भार मंजुरी' },
    'Meter Installed': { en: 'Meter Installed', gu: 'મીટર સ્થાપિત', hi: 'मीटर स्थापित', mr: 'मीटर बसवले' },
    Rejected: { en: 'Rejected', gu: 'નામંજૂર', hi: 'अस्वीकृत', mr: 'नामंजूर' }
  };

  const reviewMap: Record<string, Record<LanguageCode, string>> = {
    'Clarification Requested': {
      en: 'Clarification Requested',
      gu: 'સ્પષ્ટતા માંગવામાં આવી',
      hi: 'स्पष्टीकरण मांगा गया',
      mr: 'स्पष्टीकरण मागवले'
    },
    'Pending Review': {
      en: 'Pending Review',
      gu: 'સમીક્ષા બાકી',
      hi: 'समीक्षाधीन',
      mr: 'पुनरावलोकनाधीन'
    },
    'In Field Review': {
      en: 'In Field Review',
      gu: 'સ્થળ ચકાસણી હેઠળ',
      hi: 'फील्ड समीक्षाधीन',
      mr: 'स्थळ तपासणीखाली'
    },
    'Awaiting Sanction': {
      en: 'Awaiting Sanction',
      gu: 'લોડ મંજૂરીની રાહમાં',
      hi: 'लोड स्वीकृति की प्रतीक्षा में',
      mr: 'भार मंजुरीच्या प्रतीक्षेत'
    },
    'Reviewed & Completed': {
      en: 'Reviewed & Completed',
      gu: 'ચકાસાયેલ અને પૂર્ણ',
      hi: 'समीक्षित एवं पूर्ण',
      mr: 'तपासलेले आणि पूर्ण'
    },
    'Reviewed & Rejected': {
      en: 'Reviewed & Rejected',
      gu: 'ચકાસાયેલ અને નામંજૂર',
      hi: 'समीक्षित एवं अस्वीकृत',
      mr: 'तपासलेले आणि नामंजूर'
    },
    'New · Needs Scrutiny': {
      en: 'New · Needs Scrutiny',
      gu: 'નવી · ચકાસણી જરૂરી',
      hi: 'नया · जाँच आवश्यक',
      mr: 'नवीन · छाननी आवश्यक'
    },
    'Awaiting Consumer Response': {
      en: 'Awaiting Consumer Response',
      gu: 'ગ્રાહકના પ્રતિસાદની રાહમાં',
      hi: 'उपभोक्ता प्रतिक्रिया की प्रतीक्षा में',
      mr: 'ग्राहक प्रतिसादाच्या प्रतीक्षेत'
    },
    'In Progress · Ready for Inspection Dispatch': {
      en: 'In Progress · Ready for Inspection Dispatch',
      gu: 'પ્રગતિમાં · નિરીક્ષણ રવાનગી માટે તૈયાર',
      hi: 'प्रगति पर · निरीक्षण डिस्पैच हेतु तैयार',
      mr: 'प्रगतीपथावर · निरीक्षण रवानगीसाठी तयार'
    },
    'In Progress · Field Feasibility Check': {
      en: 'In Progress · Field Feasibility Check',
      gu: 'પ્રગતિમાં · સ્થળ શક્યતા ચકાસણી',
      hi: 'प्रगति पर · फील्ड व्यवहार्यता जाँच',
      mr: 'प्रगतीपथावर · स्थळ व्यवहार्यता तपासणी'
    },
    'Awaiting Final Sanction Approval': {
      en: 'Awaiting Final Sanction Approval',
      gu: 'અંતિમ લોડ મંજૂરીની રાહમાં',
      hi: 'अंतिम लोड स्वीकृति की प्रतीक्षा में',
      mr: 'अंतिम भार मंजुरीच्या प्रतीक्षेत'
    },
    'Approved · Energized & Completed': {
      en: 'Approved · Energized & Completed',
      gu: 'મંજૂર · કાર્યાન્વિત અને પૂર્ણ',
      hi: 'स्वीकृत · ऊर्जित एवं पूर्ण',
      mr: 'मंजूर · कार्यान्वित आणि पूर्ण'
    },
    'Rejected · Closed': {
      en: 'Rejected · Closed',
      gu: 'નામંજૂર · બંધ',
      hi: 'अस्वीकृत · बंद',
      mr: 'नामंजूर · बंद'
    }
  };

  const stageSummaryMap: Record<string, Record<LanguageCode, string>> = {
    'Submitted — New Filing': {
      en: 'Submitted — New Filing',
      gu: 'સબમિટ થયેલ — નવી અરજી',
      hi: 'प्रस्तुत — नया आवेदन',
      mr: 'सादर केलेले — नवीन अर्ज'
    },
    'Document Verification — In Progress': {
      en: 'Document Verification — In Progress',
      gu: 'દસ્તાવેજ ચકાસણી — પ્રગતિમાં',
      hi: 'दस्तावेज़ सत्यापन — प्रगति पर',
      mr: 'दस्तऐवज पडताळणी — प्रगतीपथावर'
    },
    'Site Inspection — In Progress': {
      en: 'Site Inspection — In Progress',
      gu: 'સ્થળ નિરીક્ષણ — પ્રગતિમાં',
      hi: 'स्थल निरीक्षण — प्रगति पर',
      mr: 'स्थळ निरीक्षण — प्रगतीपथावर'
    },
    'Sanction Approval — Awaiting Approval': {
      en: 'Sanction Approval — Awaiting Approval',
      gu: 'લોડ મંજૂરી — મંજૂરીની રાહમાં',
      hi: 'लोड स्वीकृति — अनुमोदन की प्रतीक्षा में',
      mr: 'भार मंजुरी — मंजुरीच्या प्रतीक्षेत'
    },
    'Meter Installed — Approved / Completed': {
      en: 'Meter Installed — Approved / Completed',
      gu: 'મીટર સ્થાપિત — મંજૂર / પૂર્ણ',
      hi: 'मीटर स्थापित — स्वीकृत / पूर्ण',
      mr: 'मीटर बसवले — मंजूर / पूर्ण'
    },
    Rejected: {
      en: 'Rejected',
      gu: 'નામંજૂર',
      hi: 'अस्वीकृत',
      mr: 'नामंजूर'
    },
    'Stage 1/5 · Application Submitted': {
      en: 'Stage 1/5 · Application Submitted',
      gu: 'તબક્કો 1/5 · અરજી સબમિટ થયેલ',
      hi: 'चरण 1/5 · आवेदन प्रस्तुत',
      mr: 'टप्पा 1/5 · अर्ज सादर केला'
    },
    'Stage 2/5 · Document Scrutiny': {
      en: 'Stage 2/5 · Document Scrutiny',
      gu: 'તબક્કો 2/5 · દસ્તાવેજ ચકાસણી',
      hi: 'चरण 2/5 · दस्तावेज़ जाँच',
      mr: 'टप्पा 2/5 · दस्तऐवज छाननी'
    },
    'Stage 3/5 · Field Site Inspection': {
      en: 'Stage 3/5 · Field Site Inspection',
      gu: 'તબક્કો 3/5 · સ્થળ નિરીક્ષણ',
      hi: 'चरण 3/5 · फील्ड स्थल निरीक्षण',
      mr: 'टप्पा 3/5 · स्थळ निरीक्षण'
    },
    'Stage 4/5 · Sanction & Estimate Clearance': {
      en: 'Stage 4/5 · Sanction & Estimate Clearance',
      gu: 'તબક્કો 4/5 · મંજૂરી અને અંદાજપત્ર ક્લિયરન્સ',
      hi: 'चरण 4/5 · स्वीकृति एवं प्राक्कलन क्लीयरेंस',
      mr: 'टप्पा 4/5 · मंजुरी आणि अंदाजपत्रक क्लिअरन्स'
    },
    'Stage 5/5 · Meter Installed & Energized': {
      en: 'Stage 5/5 · Meter Installed & Energized',
      gu: 'તબક્કો 5/5 · મીટર સ્થાપિત અને કાર્યાન્વિત',
      hi: 'चरण 5/5 · मीटर स्थापित एवं ऊर्जित',
      mr: 'टप्पा 5/5 · मीटर बसवले आणि कार्यान्वित'
    },
    'Terminated · Application Rejected': {
      en: 'Terminated · Application Rejected',
      gu: 'સમાપ્ત · અરજી નામંજૂર',
      hi: 'समाप्त · आवेदन अस्वीकृत',
      mr: 'समाप्त · अर्ज नामंजूर'
    }
  };

  let localizedStageSummary = stageSummaryMap[meta.stageSummaryLabel]?.[lang];
  if (!localizedStageSummary) {
    const m1 = meta.stageSummaryLabel.match(/^(.+?)\s*\(Clarification Requested\)$/);
    if (m1) {
      const stLoc = localizeApplicationStatus(m1[1], lang);
      localizedStageSummary =
        lang === 'gu'
          ? `${stLoc} (સ્પષ્ટતા માંગવામાં આવી)`
          : lang === 'hi'
          ? `${stLoc} (स्पष्टीकरण मांगा गया)`
          : `${stLoc} (स्पष्टीकरण मागवले)`;
    } else {
      const m = meta.stageSummaryLabel.match(/^Stage\s+(\d)\/5\s+·\s+Clarification Requested$/);
      if (m) {
        localizedStageSummary =
          lang === 'gu'
            ? `તબક્કો ${m[1]}/5 · સ્પષ્ટતા માંગવામાં આવી`
            : lang === 'hi'
            ? `चरण ${m[1]}/5 · स्पष्टीकरण मांगा गया`
            : `टप्पा ${m[1]}/5 · स्पष्टीकरण मागवले`;
      } else {
        localizedStageSummary = meta.stageSummaryLabel;
      }
    }
  }

  return {
    ...meta,
    shortLabel: shortMap[meta.shortLabel]?.[lang] || meta.shortLabel,
    reviewStateLabel: (reviewMap[meta.reviewStateLabel]?.[lang] || meta.reviewStateLabel) as ApplicationStatusDisplayMeta['reviewStateLabel'],
    stageSummaryLabel: localizedStageSummary
  };
}

export function localizeWorkOrderType(type: string | undefined, lang: LanguageCode): string {
  if (!type || lang === 'en') return type || '';
  const map: Record<string, Record<LanguageCode, string>> = {
    'Site Inspection': {
      en: 'Site Inspection',
      gu: 'સ્થળ નિરીક્ષણ',
      hi: 'स्थल निरीक्षण',
      mr: 'स्थळ निरीक्षण'
    },
    'New Connection Verification': {
      en: 'New Connection Verification',
      gu: 'નવા જોડાણની ચકાસણી',
      hi: 'नए कनेक्शन का सत्यापन',
      mr: 'नवीन जोडणी पडताळणी'
    },
    'Meter Replacement': {
      en: 'Meter Replacement',
      gu: 'મીટર બદલવું',
      hi: 'मीटर प्रतिस्थापन',
      mr: 'मीटर बदलणे'
    },
    'Transformer Repair': {
      en: 'Transformer Repair',
      gu: 'ટ્રાન્સફોર્મર સમારકામ',
      hi: 'ट्रांसफॉर्मर मरम्मत',
      mr: 'ट्रान्सफॉर्मर दुरुस्ती'
    },
    'Feeder Patrol & Maintenance': {
      en: 'Feeder Patrol & Maintenance',
      gu: 'ફીડર પેટ્રોલિંગ અને જાળવણી',
      hi: 'फीडर पेट्रोलिंग एवं रखरखाव',
      mr: 'फिडर गस्त आणि देखभाल'
    },
    'Solar Net-Metering Check': {
      en: 'Solar Net-Metering Check',
      gu: 'સોલાર નેટ-મીટરિંગ ચકાસણી',
      hi: 'सोलर नेट-मीटरिंग जाँच',
      mr: 'सोलर नेट-मीटरिंग तपासणी'
    },
    'Transformer Overload Inspection': {
      en: 'Transformer Overload Inspection',
      gu: 'ટ્રાન્સફોર્મર ઓવરલોડ નિરીક્ષણ',
      hi: 'ट्रांसफॉर्मर ओवरलोड निरीक्षण',
      mr: 'ट्रान्सफॉर्मर ओव्हरलोड निरीक्षण'
    }
  };
  return map[type]?.[lang] || type;
}

export function localizeWorkOrderStatus(status: string | undefined, lang: LanguageCode): string {
  if (!status || lang === 'en') return status || '';
  const map: Record<string, Record<LanguageCode, string>> = {
    Pending: { en: 'Pending', gu: 'બાકી', hi: 'लंबित', mr: 'प्रलंबित' },
    'En Route': { en: 'En Route', gu: 'માર્ગમાં', hi: 'मार्ग में', mr: 'मार्गावर' },
    'On Site': { en: 'On Site', gu: 'સ્થળ પર', hi: 'स्थल पर', mr: 'स्थळावर' },
    Completed: { en: 'Completed', gu: 'પૂર્ણ', hi: 'पूर्ण', mr: 'पूर्ण' },
    Escalated: { en: 'Escalated', gu: 'એસ્કેલેટ કરેલ', hi: 'एस्केलेट किया गया', mr: 'वर्ग केलेले' }
  };
  return map[status]?.[lang] || status;
}

export function localizeWorkOrderTitle(title: string | undefined, lang: LanguageCode): string {
  if (!title || lang === 'en') return title || '';
  const map: Record<string, Record<LanguageCode, string>> = {
    'Voltage Drop & Tap Changer Audit': {
      en: 'Voltage Drop & Tap Changer Audit',
      gu: 'વોલ્ટેજ ઘટાડો અને ટેપ ચેન્જર ઑડિટ',
      hi: 'वोल्टेज गिरावट एवं टैप चेंजर ऑडिट',
      mr: 'व्होल्टेज घट आणि टॅप चेंजर ऑडिट'
    },
    '8kW Load Feasibility & Transformer Margin Check': {
      en: '8kW Load Feasibility & Transformer Margin Check',
      gu: '8kW લોડ શક્યતા અને ટ્રાન્સફોર્મર માર્જિન ચકાસણી',
      hi: '8kW लोड व्यवहार्यता एवं ट्रांसफॉर्मर मार्जिन जाँच',
      mr: '8kW भार व्यवहार्यता आणि ट्रान्सफॉर्मर मार्जिन तपासणी'
    },
    '100kVA DT-09 Oil Top-up & Silica Gel Breather Replace': {
      en: '100kVA DT-09 Oil Top-up & Silica Gel Breather Replace',
      gu: '100kVA DT-09 ઓઇલ ટોપ-અપ અને સિલિકા જેલ બ્રીધર બદલવું',
      hi: '100kVA DT-09 ऑयल टॉप-अप एवं सिलिका जेल ब्रीदर प्रतिस्थापन',
      mr: '100kVA DT-09 ऑईल टॉप-अप आणि सिलिका जेल ब्रीदर बदलणे'
    },
    'Burnt Smart Meter Terminal Block Replacement': {
      en: 'Burnt Smart Meter Terminal Block Replacement',
      gu: 'બળી ગયેલ સ્માર્ટ મીટર ટર્મિનલ બ્લોક બદલવું',
      hi: 'जले हुए स्मार्ट मीटर टर्मिनल ब्लॉक का प्रतिस्थापन',
      mr: 'जळालेला स्मार्ट मीटर टर्मिनल ब्लॉक बदलणे'
    },
    '45kW Industrial HT/LT CT-PT Metering Feasibility': {
      en: '45kW Industrial HT/LT CT-PT Metering Feasibility',
      gu: '45kW ઔદ્યોગિક HT/LT CT-PT મીટરિંગ શક્યતા ચકાસણી',
      hi: '45kW औद्योगिक HT/LT CT-PT मीटरिंग व्यवहार्यता जाँच',
      mr: '45kW औद्योगिक HT/LT CT-PT मीटरिंग व्यवहार्यता तपासणी'
    },
    'Site Rectification for Voltage Anomaly (CMP-8821)': {
      en: 'Site Rectification for Voltage Anomaly (CMP-8821)',
      gu: 'વોલ્ટેજ વિસંગતતા માટે સ્થળ સુધારણા (CMP-8821)',
      hi: 'वोल्टेज विसंगति हेतु स्थल सुधार (CMP-8821)',
      mr: 'व्होल्टेज विसंगतीसाठी स्थळ दुरुस्ती (CMP-8821)'
    },
    'Field Verification for New Connection (APP-2026-0842)': {
      en: 'Field Verification for New Connection (APP-2026-0842)',
      gu: 'નવા વીજ જોડાણ માટે સ્થળ ચકાસણી (APP-2026-0842)',
      hi: 'नए विद्युत कनेक्शन हेतु फील्ड सत्यापन (APP-2026-0842)',
      mr: 'नवीन वीज जोडणीसाठी स्थळ पडताळणी (APP-2026-0842)'
    },
    'Distribution Transformer Thermal Scan & Oil Check': {
      en: 'Distribution Transformer Thermal Scan & Oil Check',
      gu: 'ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર થર્મલ સ્કેન અને ઓઇલ ચકાસણી',
      hi: 'डिस्ट्रीब्यूशन ट्रांसफॉर्मर थर्मल स्कैन एवं ऑयल जाँच',
      mr: 'डिस्ट्रिब्युशन ट्रान्सफॉर्मर थर्मल स्कॅन आणि ऑईल तपासणी'
    },
    'Smart Meter Installation & Seal Verification': {
      en: 'Smart Meter Installation & Seal Verification',
      gu: 'સ્માર્ટ મીટર ઇન્સ્ટોલેશન અને સીલ ચકાસણી',
      hi: 'स्मार्ट मीटर स्थापना एवं सील सत्यापन',
      mr: 'स्मार्ट मीटर बसवणे आणि सील पडताळणी'
    }
  };
  if (map[title]?.[lang]) return map[title][lang];

  let m = title.match(/^Site Feasibility & Meter Load Inspection\s*\(([^)]+)\)$/);
  if (m) {
    return lang === 'gu'
      ? `સ્થળ શક્યતા અને મીટર લોડ નિરીક્ષણ (${m[1]})`
      : lang === 'hi'
      ? `स्थल व्यवहार्यता एवं मीटर लोड निरीक्षण (${m[1]})`
      : `स्थळ व्यवहार्यता आणि मीटर भार निरीक्षण (${m[1]})`;
  }

  m = title.match(/^Grievance Rectification:\s*(.+?)\s*\(([^)]+)\)$/);
  if (m) {
    const cat = localizeComplaintCategory(m[1], lang);
    return lang === 'gu'
      ? `ફરિયાદ નિવારણ: ${cat} (${m[2]})`
      : lang === 'hi'
      ? `शिकायत निवारण: ${cat} (${m[2]})`
      : `तक्रार निवारण: ${cat} (${m[2]})`;
  }

  return title;
}

export function localizeWorkOrderScheduledDate(date: string | undefined, lang: LanguageCode): string {
  if (!date || lang === 'en') return date || '';
  if (date === 'Today') {
    return lang === 'gu' ? 'આજે' : lang === 'hi' ? 'आज' : 'आज';
  }
  if (date === 'Yesterday') {
    return lang === 'gu' ? 'ગઈકાલે' : lang === 'hi' ? 'कल' : 'काल';
  }
  const monthMap: Record<string, Record<LanguageCode, string>> = {
    Jan: { en: 'Jan', gu: 'જાન્યુ', hi: 'जन', mr: 'जाने' },
    Feb: { en: 'Feb', gu: 'ફેબ્રુ', hi: 'फ़र', mr: 'फेब्रु' },
    Mar: { en: 'Mar', gu: 'માર્ચ', hi: 'मार्च', mr: 'मार्च' },
    Apr: { en: 'Apr', gu: 'એપ્રિલ', hi: 'अप्रैल', mr: 'एप्रिल' },
    May: { en: 'May', gu: 'મે', hi: 'मई', mr: 'मे' },
    Jun: { en: 'Jun', gu: 'જૂન', hi: 'जून', mr: 'जून' },
    Jul: { en: 'Jul', gu: 'જુલાઈ', hi: 'जुलाई', mr: 'जुलै' },
    Aug: { en: 'Aug', gu: 'ઑગસ્ટ', hi: 'अगस्त', mr: 'ऑगस्ट' },
    Sep: { en: 'Sep', gu: 'સપ્ટે', hi: 'सितं', mr: 'सप्टें' },
    Oct: { en: 'Oct', gu: 'ઑક્ટો', hi: 'अक्टू', mr: 'ऑक्टो' },
    Nov: { en: 'Nov', gu: 'નવે', hi: 'नवं', mr: 'नोव्हें' },
    Dec: { en: 'Dec', gu: 'ડિસે', hi: 'दिसं', mr: 'डिसें' }
  };
  let out = date
    .replace('Today,', lang === 'gu' ? 'આજે,' : lang === 'hi' ? 'आज,' : 'आज,')
    .replace('Yesterday,', lang === 'gu' ? 'ગઈકાલે,' : lang === 'hi' ? 'कल,' : 'काल,')
    .replace('Tomorrow,', lang === 'gu' ? 'આવતીકાલે,' : lang === 'hi' ? 'कल,' : 'उद्या,');
  for (const [mKey, mVal] of Object.entries(monthMap)) {
    out = out.replace(new RegExp(`\\b${mKey}\\b`, 'g'), mVal[lang]);
  }
  return out;
}

export function localizeWorkOrderMaterial(material: string, lang: LanguageCode): string {
  if (lang === 'en') return material;
  const map: Record<string, Record<LanguageCode, string>> = {
    'Digital Multimeter': { en: 'Digital Multimeter', gu: 'ડિજિટલ મલ્ટિમીટર', hi: 'डिजिटल मल्टीमीटर', mr: 'डिजिटल मल्टीमीटर' },
    'Clamp Meter': { en: 'Clamp Meter', gu: 'ક્લેમ્પ મીટર', hi: 'क्लैंप मीटर', mr: 'क्लॅम्प मीटर' },
    'Digital Clamp Meter': { en: 'Digital Clamp Meter', gu: 'ડિજિટલ ક્લેમ્પ મીટર', hi: 'डिजिटल क्लैंप मीटर', mr: 'डिजिटल क्लॅम्प मीटर' },
    'Insulated Gloves': { en: 'Insulated Gloves', gu: 'ઇન્સ્યુલેટેડ મોજાં', hi: 'इंसुलेटेड दस्ताने', mr: 'इंसुलेटेड हातमोजे' },
    'Laser Distance Meter': { en: 'Laser Distance Meter', gu: 'લેસર ડિસ્ટન્સ મીટર', hi: 'लेजर दूरी मीटर', mr: 'लेझर अंतर मीटर' },
    '3-Phase Smart Meter': { en: '3-Phase Smart Meter', gu: '3-ફેઝ સ્માર્ટ મીટર', hi: '3-फेज स्मार्ट मीटर', mr: '3-फेज स्मार्ट मीटर' },
    'Seal Kit': { en: 'Seal Kit', gu: 'સીલ કિટ', hi: 'सील किट', mr: 'सील किट' },
    'Transformer Oil (20L)': { en: 'Transformer Oil (20L)', gu: 'ટ્રાન્સફોર્મર ઓઇલ (20L)', hi: 'ट्रांसफॉर्मर ऑयल (20L)', mr: 'ट्रान्सफॉर्मर ऑईल (20L)' },
    'Silica Gel Cartridge': { en: 'Silica Gel Cartridge', gu: 'સિલિકા જેલ કાર્ટ્રિજ', hi: 'सिलिका जेल कार्ट्रिज', mr: 'सिलिका जेल कार्ट्रिज' },
    'Infrared Thermal Scanner': { en: 'Infrared Thermal Scanner', gu: 'ઇન્ફ્રારેડ થર્મલ સ્કેનર', hi: 'इन्फ्रारेड थर्मल स्कैनर', mr: 'इन्फ्रारेड थर्मल स्कॅनर' },
    '1-Phase 4G Smart Meter': { en: '1-Phase 4G Smart Meter', gu: '1-ફેઝ 4G સ્માર્ટ મીટર', hi: '1-फेज 4G स्मार्ट मीटर', mr: '1-फेज 4G स्मार्ट मीटर' },
    '16 sq.mm Service Cable (10m)': { en: '16 sq.mm Service Cable (10m)', gu: '16 sq.mm સર્વિસ કેબલ (10m)', hi: '16 sq.mm सर्विस केबल (10m)', mr: '16 sq.mm सर्व्हिस केबल (10m)' },
    'Polycarbonate Seal': { en: 'Polycarbonate Seal', gu: 'પોલીકાર્બોનેટ સીલ', hi: 'पॉलीकार्बोनेट सील', mr: 'पॉलीकार्बोनेट सील' },
    'CT/PT Cubicle Checklist': { en: 'CT/PT Cubicle Checklist', gu: 'CT/PT ક્યુબિકલ ચેકલિસ્ટ', hi: 'CT/PT क्यूबिकल चेकलिस्ट', mr: 'CT/PT क्युबिकल चेकलिस्ट' },
    'Harmonic Analyzer': { en: 'Harmonic Analyzer', gu: 'હાર્મોનિક એનાલાઇઝર', hi: 'हार्मोनिक एनालाइजर', mr: 'हार्मोनिक ॲनालायझर' },
    'Earth Tester': { en: 'Earth Tester', gu: 'અર્થ ટેસ્ટર', hi: 'अर्थ टेस्टर', mr: 'अर्थ टेस्टर' },
    'Earthing Resistance Meter': { en: 'Earthing Resistance Meter', gu: 'અર્થિંગ રેઝિસ્ટન્સ મીટર', hi: 'अर्थिंग रेजिस्टेंस मीटर', mr: 'अर्थिंग रेझिस्टन्स मीटर' },
    'GPS Geotag Camera': { en: 'GPS Geotag Camera', gu: 'GPS જિયોટેગ કેમેરા', hi: 'GPS जियोटैग कैमरा', mr: 'GPS जिओटॅग कॅमेरा' },
    'Safety Harness': { en: 'Safety Harness', gu: 'સેફ્ટી હાર્નેસ', hi: 'सेफ्टी हार्नेस', mr: 'सेफ्टी हार्नेस' },
    'Insulated Tool Kit': { en: 'Insulated Tool Kit', gu: 'ઇન્સ્યુલેટેડ ટૂલ કિટ', hi: 'इंसुलेटेड टूल किट', mr: 'इंसुलेटेड टूल किट' },
    'Crimping Tool': { en: 'Crimping Tool', gu: 'ક્રિમ્પિંગ ટૂલ', hi: 'क्रिम्पिंग टूल', mr: 'क्रिम्पिंग टूल' },
    'Aluminium Lug 50 sq mm': { en: 'Aluminium Lug 50 sq mm', gu: 'એલ્યુમિનિયમ લગ 50 sq mm', hi: 'एल्युमिनियम लग 50 sq mm', mr: 'ॲल्युमिनियम लग 50 sq mm' },
    'Safety Helmet & Gloves': { en: 'Safety Helmet & Gloves', gu: 'સેફ્ટી હેલ્મેટ અને મોજાં', hi: 'सुरक्षा हेलमेट एवं दस्ताने', mr: 'सुरक्षा हेल्मेट आणि हातमोजे' },
    'Handheld GPS Terminal': { en: 'Handheld GPS Terminal', gu: 'હેન્ડહેલ્ડ GPS ટર્મિનલ', hi: 'हैंडहेल्ड GPS टर्मिनल', mr: 'हँडहेल्ड GPS टर्मिनल' },
    'Camera / Mobile App': { en: 'Camera / Mobile App', gu: 'કેમેરા / મોબાઇલ એપ', hi: 'कैमरा / मोबाइल ऐप', mr: 'कॅमेरा / मोबाईल ॲप' },
    'Load Audit Sheet': { en: 'Load Audit Sheet', gu: 'લોડ ઑડિટ શીટ', hi: 'लोड ऑडिट शीट', mr: 'भार ऑडिट शीट' },
    'FLIR Thermal Camera': { en: 'FLIR Thermal Camera', gu: 'FLIR થર્મલ કેમેરા', hi: 'FLIR थर्मल कैमरा', mr: 'FLIR थर्मल कॅमेरा' },
    'BDV Oil Tester': { en: 'BDV Oil Tester', gu: 'BDV ઓઇલ ટેસ્ટર', hi: 'BDV ऑयल टेस्टर', mr: 'BDV ऑईल टेस्टर' },
    'Silica Gel Breather Cartridge': { en: 'Silica Gel Breather Cartridge', gu: 'સિલિકા જેલ બ્રીધર કાર્ટ્રિજ', hi: 'सिलिका जेल ब्रीदर कार्ट्रिज', mr: 'सिलिका जेल ब्रीदर कार्ट्रिज' },
    'Secure 3-Phase Smart Meter (4G)': { en: 'Secure 3-Phase Smart Meter (4G)', gu: 'સુરક્ષિત 3-ફેઝ સ્માર્ટ મીટર (4G)', hi: 'सुरक्षित 3-फेज स्मार्ट मीटर (4G)', mr: 'सुरक्षित 3-फेज स्मार्ट मीटर (4G)' },
    'Polycarbonate Holographic Seals (x2)': { en: 'Polycarbonate Holographic Seals (x2)', gu: 'પોલીકાર્બોનેટ હોલોગ્રાફિક સીલ (x2)', hi: 'पॉलीकार्बोनेट होलोग्राफिक सील (x2)', mr: 'पॉलीकार्बोनेट होलोग्राफिक सील (x2)' }
  };
  return map[material]?.[lang] || material;
}

export function localizeAssignedActorName(actor: string | undefined, lang: LanguageCode): string {
  if (!actor || lang === 'en') return actor || '';
  return actor
    .replace('(JE Field)', lang === 'gu' ? '(JE ફિલ્ડ)' : lang === 'hi' ? '(JE फील्ड)' : '(JE फील्ड)')
    .replace('(Field JE)', lang === 'gu' ? '(ફિલ્ડ JE)' : lang === 'hi' ? '(फील्ड JE)' : '(फील्ड JE)')
    .replace('(Sr. Lineman)', lang === 'gu' ? '(વરિષ્ઠ લાઇનમેન)' : lang === 'hi' ? '(वरिष्ठ लाइनमैन)' : '(वरिष्ठ लाईनमन)')
    .replace('(AE Ops)', lang === 'gu' ? '(AE સંચાલન)' : lang === 'hi' ? '(AE परिचालन)' : '(AE परिचालन)')
    .replace('(DEE Ops)', lang === 'gu' ? '(DEE સંચાલન)' : lang === 'hi' ? '(DEE परिचालन)' : '(DEE परिचालन)')
    .replace('(EE Ops)', lang === 'gu' ? '(EE સંચાલન)' : lang === 'hi' ? '(EE परिचालन)' : '(EE परिचालन)')
    .replace('(SE Circle)', lang === 'gu' ? '(SE વર્તુળ)' : lang === 'hi' ? '(SE सर्कल)' : '(SE मंडळ)')
    .replace('(EMPLOYEE)', lang === 'gu' ? '(કર્મચારી)' : lang === 'hi' ? '(कर्मचारी)' : '(कर्मचारी)')
    .replace('(FIELD)', lang === 'gu' ? '(ફિલ્ડ)' : lang === 'hi' ? '(फील्ड)' : '(फील्ड)')
    .replace('(MANAGEMENT)', lang === 'gu' ? '(મેનેજમેન્ટ)' : lang === 'hi' ? '(प्रबंधन)' : '(व्यवस्थापन)')
    .replace('(ADMIN)', lang === 'gu' ? '(એડમિન)' : lang === 'hi' ? '(एडमिन)' : '(ॲडमिन)');
}

export function localizeAIRecommendation(
  rec: AIActionRecommendation,
  lang: LanguageCode
): {
  agentPersonaName: string;
  title: string;
  description: string;
  reasoningSummary: string;
  supportingRecordReferences: string[];
  entityTypeLabel: string;
  affectedRecordLabel: string;
  previousValueLabel: string;
  proposedValueLabel: string;
  riskLevelLabel: string;
  requiredRoleLabel: string;
  statusLabel: string;
  decisionRemarksLabel?: string;
} {
  if (lang === 'en') {
    return {
      agentPersonaName: rec.agentPersonaName,
      title: rec.title,
      description: rec.description,
      reasoningSummary: rec.reasoningSummary,
      supportingRecordReferences: rec.supportingRecordReferences,
      entityTypeLabel: rec.affectedRecord.type.toUpperCase(),
      affectedRecordLabel: rec.affectedRecord.label,
      previousValueLabel: rec.previousValue,
      proposedValueLabel: rec.proposedValue,
      riskLevelLabel: rec.riskLevel,
      requiredRoleLabel: rec.requiredApprovingRole.toUpperCase(),
      statusLabel: rec.status.replace('_', ' '),
      decisionRemarksLabel: rec.decisionRemarks
    };
  }

  const personaMap: Record<string, Record<LanguageCode, string>> = {
    'Operations Co-Pilot': {
      en: 'Operations Co-Pilot',
      gu: 'ઓપરેશન્સ કો-પાયલટ',
      hi: 'ऑपरेशंस को-पायलट',
      mr: 'ऑपरेशन्स को-पायलट'
    },
    'Field Intelligence Assistant': {
      en: 'Field Intelligence Assistant',
      gu: 'ફિલ્ડ ઇન્ટેલિજન્સ આસિસ્ટન્ટ',
      hi: 'फील्ड इंटेलिजेंस असिस्टेंट',
      mr: 'फील्ड इंटेलिजन्स असिस्टंट'
    },
    'Executive Intelligence Agent': {
      en: 'Executive Intelligence Agent',
      gu: 'એક્ઝિક્યુટિવ ઇન્ટેલિજન્સ એજન્ટ',
      hi: 'एक्जीक्यूटिव इंटेलिजेंस एजेंट',
      mr: 'एक्झिक्युटिव्ह इंटेलिजन्स एजंट'
    },
    'Security & Governance Agent': {
      en: 'Security & Governance Agent',
      gu: 'સુરક્ષા અને ગવર્નન્સ એજન્ટ',
      hi: 'सुरक्षा एवं गवर्नेंस एजेंट',
      mr: 'सुरक्षा आणि गव्हर्नन्स एजंट'
    }
  };

  const entityTypeMap: Record<string, Record<LanguageCode, string>> = {
    application: { en: 'APPLICATION', gu: 'અરજી', hi: 'आवेदन', mr: 'अर्ज' },
    complaint: { en: 'COMPLAINT', gu: 'ફરિયાદ', hi: 'शिकायत', mr: 'तक्रार' },
    workorder: { en: 'WORKORDER', gu: 'વર્ક ઓર્ડર', hi: 'वर्क ऑर्डर', mr: 'वर्क ऑर्डर' },
    incident: { en: 'INCIDENT', gu: 'ઘટના', hi: 'घटना', mr: 'घटना' },
    audit: { en: 'AUDIT', gu: 'ઑડિટ', hi: 'ऑडिट', mr: 'ऑडिट' },
    security: { en: 'SECURITY', gu: 'સુરક્ષા', hi: 'सुरक्षा', mr: 'सुरक्षा' }
  };

  const riskMap: Record<string, Record<LanguageCode, string>> = {
    LOW: { en: 'LOW', gu: 'ઓછું', hi: 'कम', mr: 'कमी' },
    MEDIUM: { en: 'MEDIUM', gu: 'મધ્યમ', hi: 'मध्यम', mr: 'मध्यम' },
    HIGH: { en: 'HIGH', gu: 'ઉચ્ચ', hi: 'उच्च', mr: 'उच्च' },
    CRITICAL: { en: 'CRITICAL', gu: 'અત્યંત ગંભીર', hi: 'अत्यंत गंभीर', mr: 'अत्यंत गंभीर' }
  };

  const roleMap: Record<string, Record<LanguageCode, string>> = {
    employee: { en: 'EMPLOYEE', gu: 'કર્મચારી', hi: 'कर्मचारी', mr: 'कर्मचारी' },
    field: { en: 'FIELD', gu: 'ફિલ્ડ ઇજનેર', hi: 'फील्ड अभियंता', mr: 'फील्ड अभियंता' },
    management: { en: 'MANAGEMENT', gu: 'મેનેજમેન્ટ', hi: 'प्रबंधन', mr: 'व्यवस्थापन' },
    admin: { en: 'ADMIN', gu: 'સિસ્ટમ એડમિન', hi: 'सिस्टम एडमिन', mr: 'सिस्टम ॲडमिन' },
    consumer: { en: 'CONSUMER', gu: 'ગ્રાહક', hi: 'उपभोक्ता', mr: 'ग्राहक' }
  };

  const statusMap: Record<string, Record<LanguageCode, string>> = {
    PENDING_APPROVAL: { en: 'PENDING APPROVAL', gu: 'મંજૂરી બાકી', hi: 'अनुमोदन लंबित', mr: 'मंजुरी प्रलंबित' },
    APPROVED: { en: 'APPROVED', gu: 'મંજૂર', hi: 'स्वीकृत', mr: 'मंजूर' },
    EXECUTED: { en: 'EXECUTED', gu: 'અમલીકૃત', hi: 'निष्पादित', mr: 'कार्यान्वित' },
    REJECTED: { en: 'REJECTED', gu: 'નામંજૂર', hi: 'अस्वीकृत', mr: 'नाकारले' }
  };

  let localizedTitle = rec.title;
  let localizedDesc = rec.description;
  let localizedReasoning = rec.reasoningSummary;

  if (rec.proposedAction === 'APPROVE_HIGH_RISK_SANCTION' || rec.id.startsWith('REC-SANCTION-')) {
    const appId = rec.affectedRecord.id;
    const mTitle = rec.title.match(/^Executive Sanction Concurrence:\s*(.+?)\s*\((\d+(?:\.\d+)?)\s*kW\s+(.+)\)$/);
    const applicant = mTitle ? mTitle[1] : rec.affectedRecord.label;
    const loadKw = mTitle ? mTitle[2] : '';
    const cat = mTitle ? localizeTariffCategory(mTitle[3], lang) : '';
    localizedTitle =
      lang === 'gu'
        ? `કાર્યપાલક લોડ મંજૂરી સંમતિ: ${applicant} (${loadKw} kW ${cat})`
        : lang === 'hi'
        ? `कार्यपालक लोड स्वीकृति सहमति: ${applicant} (${loadKw} kW ${cat})`
        : `कार्यकारी भार मंजुरी सहमती: ${applicant} (${loadKw} kW ${cat})`;
    localizedDesc =
      lang === 'gu'
        ? `અરજદાર ${applicant} માટે ${loadKw} kW સ્થળ શક્યતા ચકાસણી પૂર્ણ થઈ છે. મીટર કાર્યાન્વિત કરતા પહેલા કાર્યપાલક ઇજનેરની મંજૂરી આવશ્યક છે.`
        : lang === 'hi'
        ? `आवेदक ${applicant} के लिए ${loadKw} kW स्थल व्यवहार्यता सत्यापन पूर्ण हो चुका है। मीटर चालू करने से पूर्व अधिशासी अभियंता का अनुमोदन आवश्यक है।`
        : `अर्जदार ${applicant} साठी ${loadKw} kW स्थळ व्यवहार्यता पडताळणी पूर्ण झाली आहे. मीटर कार्यान्वित करण्यापूर्वी कार्यकारी अभियंत्यांची मंजुरी आवश्यक आहे.`;
    localizedReasoning =
      lang === 'gu'
        ? `નિરીક્ષણ અહેવાલ દ્વારા સ્થળ શક્યતાની પુષ્ટિ થઈ છે. 10 kW થી વધુની ઉચ્ચ-લોડ માંગ માટે GERC વિતરણ સંહિતા 2026 હેઠળ વૈધાનિક મેનેજમેન્ટ સંમતિ આવશ્યક છે.`
        : lang === 'hi'
        ? `निरीक्षण रिपोर्ट के माध्यम से स्थल व्यवहार्यता की पुष्टि हुई है। 10 kW से अधिक की उच्च-लोड मांग के लिए GERC वितरण संहिता 2026 के अंतर्गत वैधानिक प्रबंधकीय सहमति आवश्यक है।`
        : `निरीक्षण अहवालाद्वारे स्थळ व्यवहार्यतेची पुष्टी झाली आहे. 10 kW पेक्षा जास्त उच्च-भार मागणीसाठी GERC वितरण संहिता 2026 अंतर्गत वैधानिक व्यवस्थापकीय सहमती आवश्यक आहे.`;
  } else if (rec.proposedAction === 'ASSIGN_COMPLAINT_TO_FIELD' || rec.id.startsWith('REC-DISPATCH-')) {
    const cmpId = rec.affectedRecord.id;
    const mTitle = rec.title.match(/^Dispatch Field Lineman:\s*(.+?)\s*\((.+)\)$/);
    const cat = mTitle ? localizeComplaintCategory(mTitle[1], lang) : '';
    const consumer = mTitle ? mTitle[2] : rec.affectedRecord.label;
    localizedTitle =
      lang === 'gu'
        ? `ફિલ્ડ લાઇનમેન રવાના કરો: ${cat} (${consumer})`
        : lang === 'hi'
        ? `फील्ड लाइनमैन भेजें: ${cat} (${consumer})`
        : `फील्ड लाईनमन पाठवा: ${cat} (${consumer})`;
    localizedDesc =
      lang === 'gu'
        ? `ગ્રાહક ${consumer} દ્વારા નોંધાયેલ ફરિયાદ (${cmpId}) માટે સ્વચાલિત વર્ક ઓર્ડર સાથે વિસ્તારના JE લાઇનમેનને સોંપણી કરો.`
        : lang === 'hi'
        ? `उपभोक्ता ${consumer} द्वारा दर्ज शिकायत (${cmpId}) के लिए स्वचालित वर्क ऑर्डर के साथ क्षेत्रीय JE लाइनमैन को नियुक्त करें।`
        : `ग्राहक ${consumer} यांनी नोंदवलेल्या तक्रारीसाठी (${cmpId}) स्वयंचलित वर्क ऑर्डरसह क्षेत्रीय JE लाईनमनची नियुक्ती करा.`;
    localizedReasoning =
      lang === 'gu'
        ? `${cat} હેઠળ ફરિયાદ નોંધાયેલ છે. GERC કામગીરી ધોરણો હેઠળ દંડ ટાળવા માટે નિર્ધારિત SLA સમયમર્યાદામાં તાત્કાલિક ફિલ્ડ કાર્યવાહી જરૂરી છે.`
        : lang === 'hi'
        ? `${cat} के अंतर्गत शिकायत पंजीकृत है। GERC प्रदर्शन मानकों के तहत दंड से बचने के लिए निर्धारित SLA समयसीमा के भीतर त्वरित फील्ड हस्तक्षेप आवश्यक है।`
        : `${cat} अंतर्गत तक्रार नोंदवली आहे. GERC कार्यप्रदर्शन मानकांनुसार दंड टाळण्यासाठी निर्धारित SLA कालमर्यादेत तात्काळ फील्ड हस्तक्षेप आवश्यक आहे.`;
  } else if (rec.proposedAction === 'ESCALATE_CRITICAL_INCIDENT' || rec.id.startsWith('REC-ESCALATE-')) {
    const incId = rec.affectedRecord.id;
    const rawIncTitle = rec.title.replace(/^Escalate Critical Grid Hazard:\s*/, '');
    const locIncTitle = localizeIncidentTitle(rawIncTitle, lang);
    localizedTitle =
      lang === 'gu'
        ? `ગંભીર ગ્રીડ જોખમ એસ્કેલેટ કરો: ${locIncTitle}`
        : lang === 'hi'
        ? `गंभीर ग्रिड संकट एस्केलेट करें: ${locIncTitle}`
        : `गंभीर ग्रिड धोका वर्ग करा: ${locIncTitle}`;
    localizedDesc =
      lang === 'gu'
        ? `SCADA/ફિલ્ડ ટેલિમેટ્રીમાં ગંભીર જોખમ (${incId}) જણાયું છે. ઉત્તર ગુજરાત વર્તુળમાં વીજ પુરવઠાની સાતત્યતા જાળવવા તાત્કાલિક કાર્યવાહી જરૂરી છે.`
        : lang === 'hi'
        ? `SCADA/फील्ड टेलीमेट्री में गंभीर संकट (${incId}) पाया गया है। उत्तर गुजरात सर्कल में वितरण निरंतरता बनाए रखने हेतु तत्काल कार्रवाई आवश्यक है।`
        : `SCADA/फील्ड टेलिमेट्रीमध्ये गंभीर धोका (${incId}) आढळला आहे. उत्तर गुजरात मंडळात वीज पुरवठा सातत्य राखण्यासाठी तात्काळ कृती आवश्यक आहे.`;
    localizedReasoning =
      lang === 'gu'
        ? `ઘટના #${incId} અત્યંત ગંભીર (CRITICAL) તરીકે વર્ગીકૃત છે. એસ્કેલેશન કરવાથી અધીક્ષક ઇજનેર (SE) ને જાણ થાય છે અને પ્રાથમિકતાના ધોરણે લોડ ડાયવર્ઝન પ્રોટોકોલ શરૂ થાય છે.`
        : lang === 'hi'
        ? `घटना #${incId} अत्यंत गंभीर (CRITICAL) के रूप में वर्गीकृत है। एस्केलेट करने से अधीक्षण अभियंता (SE) को अलर्ट जाता है और प्राथमिकता लोड डायवर्जन प्रोटोकॉल शुरू होता है।`
        : `घटना #${incId} अत्यंत गंभीर (CRITICAL) म्हणून वर्गीकृत आहे. वर्ग केल्याने अधीक्षक अभियंता (SE) यांना सूचना मिळते आणि प्राधान्य भार वळवण्याचे प्रोटोकॉल सुरू होतात.`;
  } else if (rec.proposedAction === 'REVOKE_SUSPICIOUS_SESSION' || rec.id === 'REC-SEC-AUTH-01') {
    localizedTitle =
      lang === 'gu'
        ? `શંકાસ્પદ IP સત્ર રદ કરો અને MFA પુનઃચકાસણી લાગુ કરો`
        : lang === 'hi'
        ? `संदिग्ध IP सत्र निरस्त करें एवं MFA पुनः सत्यापन लागू करें`
        : `संशयास्पद IP सत्र रद्द करा आणि MFA पुनर्तपासणी लागू करा`;
    localizedDesc =
      lang === 'gu'
        ? `ઓપરેટર ખાતાઓને લક્ષ્ય બનાવતા IP 192.168.10.45 પરથી સતત 4 નિષ્ફળ પ્રમાણીકરણ પ્રયાસો જણાયા છે. તાત્કાલિક સત્ર રદ કરવાની ભલામણ છે.`
        : lang === 'hi'
        ? `ऑपरेटर खातों को लक्षित करते हुए IP 192.168.10.45 से लगातार 4 विफल प्रमाणीकरण प्रयास देखे गए हैं। तत्काल सत्र निरस्तीकरण की अनुशंसा की जाती है।`
        : `ऑपरेटर खात्यांना लक्ष्य करणाऱ्या IP 192.168.10.45 वरून सलग 4 अयशस्वी प्रमाणीकरण प्रयत्न आढळले आहेत. तात्काळ सत्र रद्द करण्याची शिफारस आहे.`;
    localizedReasoning =
      lang === 'gu'
        ? `વિસંગતતા ડિટેક્ટરે ઉચ્ચ-આવર્તન પ્રમાણીકરણ નિષ્ફળતાઓ ઓળખી છે. આગોતરું સત્ર રદ કરવાથી આંતરિક ERP એન્ડપોઇન્ટ્સ સુરક્ષિત રહે છે.`
        : lang === 'hi'
        ? `विसंगति डिटेक्टर ने उच्च-आवृत्ति प्रमाणीकरण विफलताओं की पहचान की है। निवारक सत्र निरस्तीकरण आंतरिक ERP एंडपॉइंट्स को सुरक्षित रखता है।`
        : `विसंगती डिटेक्टरने उच्च-वारंवारता प्रमाणीकरण अपयश ओळखले आहे. प्रतिबंधात्मक सत्र रद्द केल्याने अंतर्गत ERP एंडपॉइंट्स सुरक्षित राहतात.`;
  } else if (rec.id === 'REC-EMP-01' || rec.title.startsWith('Approve Sanction & Demand Note for ')) {
    const appId = rec.affectedRecord.id;
    localizedTitle =
      lang === 'gu'
        ? `${appId} માટે લોડ મંજૂરી અને ડિમાન્ડ નોટ પાસ કરો`
        : lang === 'hi'
        ? `${appId} के लिए लोड स्वीकृति एवं डिमांड नोट अनुमोदित करें`
        : `${appId} साठी भार मंजुरी आणि डिमांड नोट मंजूर करा`;
    localizedDesc =
      lang === 'gu'
        ? `સ્થળ શક્યતા નિરીક્ષણ પાસ થયું છે. મીટર ઇન્સ્ટોલેશન પહેલાં સત્તાવાર લોડ મંજૂરી માટે મંજૂરી આપો.`
        : lang === 'hi'
        ? `स्थल व्यवहार्यता निरीक्षण सफल रहा है। मीटर स्थापना से पूर्व आधिकारिक लोड स्वीकृति हेतु अनुमोदन दें।`
        : `स्थळ व्यवहार्यता निरीक्षण उत्तीर्ण झाले आहे. मीटर बसवण्यापूर्वी अधिकृत भार मंजुरीसाठी परवानगी द्या.`;
    localizedReasoning =
      lang === 'gu'
        ? `અરજી #${appId} ના તકનીકી સ્થળ અહેવાલમાં પૂરતી ટ્રાન્સફોર્મર ક્ષમતા અને શૂન્ય બાકી લેણાંની પુષ્ટિ થઈ છે.`
        : lang === 'hi'
        ? `आवेदन #${appId} की तकनीकी स्थल रिपोर्ट में पर्याप्त ट्रांसफॉर्मर क्षमता और शून्य बकाया राशि की पुष्टि हुई है।`
        : `अर्ज #${appId} च्या तांत्रिक स्थळ अहवालात पुरेशी ट्रान्सफॉर्मर क्षमता आणि शून्य थकबाकीची पुष्टी झाली आहे.`;
  } else if (rec.id === 'REC-EMP-02' || (rec.title.startsWith('Advance ') && rec.title.includes('to Site Inspection'))) {
    const appId = rec.affectedRecord.id;
    localizedTitle =
      lang === 'gu'
        ? `${appId} ને સ્થળ નિરીક્ષણ તબક્કામાં આગળ વધારો`
        : lang === 'hi'
        ? `${appId} को स्थल निरीक्षण चरण में आगे बढ़ाएं`
        : `${appId} ला स्थळ निरीक्षण टप्प्यात पुढे न्या`;
    localizedDesc =
      lang === 'gu'
        ? `KYC અને મિલકત માલિકીના દસ્તાવેજો ચકાસાયેલ છે. ફિલ્ડ શક્યતા વર્ક ઓર્ડર રવાના કરવા મંજૂરી આપો.`
        : lang === 'hi'
        ? `KYC और संपत्ति स्वामित्व दस्तावेज़ सत्यापित हैं। फील्ड व्यवहार्यता वर्क ऑर्डर भेजने हेतु स्वीकृति दें।`
        : `KYC आणि मालमत्ता मालकी दस्तऐवज पडताळले आहेत. फील्ड व्यवहार्यता वर्क ऑर्डर पाठवण्यासाठी मंजुरी द्या.`;
    localizedReasoning =
      lang === 'gu'
        ? `અરજી #${appId} ના અપલોડ કરેલા દસ્તાવેજો સબ-ડિવિઝન ચેકલિસ્ટના નિયમોને પૂર્ણ કરે છે.`
        : lang === 'hi'
        ? `आवेदन #${appId} के अपलोड किए गए दस्तावेज़ उप-संभाग चेकलिस्ट मानकों को पूरा करते हैं।`
        : `अर्ज #${appId} चे अपलोड केलेले दस्तऐवज उप-विभाग चेकलिस्ट निकष पूर्ण करतात.`;
  } else if (rec.id === 'REC-FLD-01' || rec.title.startsWith('Dispatch Field Crew for ')) {
    const cmpId = rec.affectedRecord.id;
    localizedTitle =
      lang === 'gu'
        ? `${cmpId} માટે ફિલ્ડ ટીમ રવાના કરો`
        : lang === 'hi'
        ? `${cmpId} के लिए फील्ड टीम रवाना करें`
        : `${cmpId} साठी फील्ड पथक रवाना करा`;
    localizedDesc =
      lang === 'gu'
        ? `SLA સમયમર્યાદાનો ભંગ અટકાવવા માટે ઉચ્ચ-પ્રાથમિકતા ધરાવતી ફરિયાદને સ્થળ પરની લાઇન ટીમને સોંપો.`
        : lang === 'hi'
        ? `SLA समयसीमा उल्लंघन रोकने के लिए उच्च-प्राथमिकता वाली शिकायत को ऑन-साइट लाइन टीम को सौंपें।`
        : `SLA कालमर्यादेचे उल्लंघन टाळण्यासाठी उच्च-प्राधान्य तक्रार स्थळावरील लाईन पथकाकडे सोपवा.`;
    localizedReasoning =
      lang === 'gu'
        ? `ફરિયાદ #${cmpId} ખુલ્લી છે અને તેની SLA સમયમર્યાદા નજીક આવી રહી છે.`
        : lang === 'hi'
        ? `शिकायत #${cmpId} खुली है और अपनी SLA समयसीमा के करीब पहुंच रही है।`
        : `तक्रार #${cmpId} खुली असून तिच्या SLA कालमर्यादेजवळ पोहोचत आहे.`;
  } else if (rec.id === 'REC-MGM-01' || rec.title.startsWith('Escalate Critical Incident ')) {
    const incId = rec.affectedRecord.id;
    localizedTitle =
      lang === 'gu'
        ? `ગંભીર ઘટના ${incId} ને કાર્યકારી ડેસ્ક પર મોકલો`
        : lang === 'hi'
        ? `गंभीर घटना ${incId} को कार्यपालक डेस्क पर एस्केलेट करें`
        : `गंभीर घटना ${incId} कार्यकारी डेस्ककडे वर्ग करा`;
    localizedDesc =
      lang === 'gu'
        ? `આંતર-વિભાગીય સંસાધન ફાળવણી માટે અત્યંત ગંભીર સંચાલન વિસંગતતાને મેનેજમેન્ટ ડેસ્ક પર મોકલો.`
        : lang === 'hi'
        ? `अंतर-विभागीय संसाधन आवंटन के लिए अत्यंत गंभीर परिचालन विसंगति को प्रबंधन डेस्क पर भेजें।`
        : `आंतर-विभागीय संसाधन वाटपासाठी अत्यंत गंभीर परिचालन विसंगती व्यवस्थापन डेस्ककडे वर्ग करा.`;
    localizedReasoning =
      lang === 'gu'
        ? `ઘટના #${incId} અત્યંત ગંભીર (CRITICAL) તરીકે વર્ગીકૃત છે અને તેને કાર્યકારી મંજૂરીની જરૂર છે.`
        : lang === 'hi'
        ? `घटना #${incId} अत्यंत गंभीर (CRITICAL) के रूप में वर्गीकृत है और इसे कार्यपालक सहमति की आवश्यकता है।`
        : `घटना #${incId} अत्यंत गंभीर (CRITICAL) म्हणून वर्गीकृत असून तिला कार्यकारी मंजुरीची आवश्यकता आहे.`;
  } else if (rec.id === 'REC-ADM-01' || rec.title.startsWith('Flag Security Anomaly ')) {
    const audId = rec.affectedRecord.id;
    localizedTitle =
      lang === 'gu'
        ? `સાયબર સુરક્ષા સમીક્ષા માટે સુરક્ષા વિસંગતતા ${audId} ચિહ્નિત કરો`
        : lang === 'hi'
        ? `साइबर सुरक्षा समीक्षा हेतु सुरक्षा विसंगति ${audId} को चिह्नित करें`
        : `सायबर सुरक्षा पुनरावलोकनासाठी सुरक्षा विसंगती ${audId} चिन्हांकित करा`;
    localizedDesc =
      lang === 'gu'
        ? `અસામાન્ય એક્સેસ પેટર્નને સત્તાવાર સુરક્ષા તપાસ માટે નોંધો.`
        : lang === 'hi'
        ? `असामान्य एक्सेस पैटर्न को आधिकारिक सुरक्षा जाँच के लिए दर्ज करें।`
        : `असामान्य ॲक्सेस पॅटर्नची अधिकृत सुरक्षा तपासणीसाठी नोंद करा.`;
    localizedReasoning =
      lang === 'gu'
        ? `ઑડિટ રેકોર્ડ #${audId} માં ચેતવણી અથવા નિષ્ફળ પ્રમાણીકરણ પ્રયાસ જણાયો છે.`
        : lang === 'hi'
        ? `ऑडिट रिकॉर्ड #${audId} में चेतावनी या विफल प्रमाणीकरण प्रयास देखा गया है।`
        : `ऑडिट रेकॉर्ड #${audId} मध्ये इशारा किंवा अयशस्वी प्रमाणीकरण प्रयत्न आढळला आहे.`;
  }

  const localizeStateVal = (val: string): string => {
    const appStat = localizeApplicationStatus(val, lang);
    if (appStat !== val) return appStat;
    const cmpStat = localizeComplaintStatus(val, lang);
    if (cmpStat !== val) return cmpStat;
    const valMap: Record<string, Record<LanguageCode, string>> = {
      DETECTED: { en: 'DETECTED', gu: 'શોધાયેલ', hi: 'खोजी गई', mr: 'शोधलेले' },
      ACKNOWLEDGED: { en: 'ACKNOWLEDGED', gu: 'સ્વીકારેલ', hi: 'स्वीकृत', mr: 'स्वीकृत' },
      ASSIGNED: { en: 'ASSIGNED', gu: 'સોંપાયેલ', hi: 'सौंपी गई', mr: 'नियुक्त' },
      ESCALATED: { en: 'ESCALATED', gu: 'મોકલેલ', hi: 'प्रेषित', mr: 'वर्ग केलेले' },
      RESOLVED: { en: 'RESOLVED', gu: 'નિરાકરણ થયેલ', hi: 'समाधानित', mr: 'निवारण झालेले' },
      WARNING: { en: 'WARNING', gu: 'ચેતવણી', hi: 'चेतावनी', mr: 'इशारा' },
      FAILED: { en: 'FAILED', gu: 'નિષ્ફળ', hi: 'विफल', mr: 'अयशस्वी' },
      FLAGGED_FOR_AUDIT: { en: 'FLAGGED FOR AUDIT', gu: 'ઑડિટ માટે ચિહ્નિત', hi: 'ऑडिट हेतु चिह्नित', mr: 'ऑडिटसाठी चिन्हांकित' },
      Active: { en: 'Active', gu: 'સક્રિય', hi: 'सक्रिय', mr: 'सक्रिय' },
      Revoked: { en: 'Revoked', gu: 'રદ કરેલ', hi: 'निरस्त', mr: 'रद्द केलेले' }
    };
    return valMap[val]?.[lang] || val;
  };

  const localizeSupportRef = (refStr: string): string => {
    return refStr
      .replace('Application ID: ', lang === 'gu' ? 'અરજી ID: ' : lang === 'hi' ? 'आवेदन ID: ' : 'अर्ज ID: ')
      .replace('Requested Load: ', lang === 'gu' ? 'માંગેલ લોડ: ' : lang === 'hi' ? 'मांगा गया लोड: ' : 'मागितलेला भार: ')
      .replace('Sub-division: ', lang === 'gu' ? 'પેટા-વિભાગ: ' : lang === 'hi' ? 'उप-संभाग: ' : 'उप-विभाग: ')
      .replace('Verified Work Order: ', lang === 'gu' ? 'ચકાસાયેલ વર્ક ઓર્ડર: ' : lang === 'hi' ? 'सत्यापित वर्क ऑर्डर: ' : 'पडताळलेली वर्क ऑर्डर: ')
      .replace('Complaint ID: ', lang === 'gu' ? 'ફરિયાદ ID: ' : lang === 'hi' ? 'शिकायत ID: ' : 'तक्रार ID: ')
      .replace('Consumer No: ', lang === 'gu' ? 'ગ્રાહક નં.: ' : lang === 'hi' ? 'उपभोक्ता क्र.: ' : 'ग्राहक क्र.: ')
      .replace('Feeder Corridor: ', lang === 'gu' ? 'ફીડર કોરિડોર: ' : lang === 'hi' ? 'फीडर कॉरिडोर: ' : 'फिडर कॉरिडॉर: ')
      .replace('Incident ID: ', lang === 'gu' ? 'ઘટના ID: ' : lang === 'hi' ? 'घटना ID: ' : 'घटना ID: ')
      .replace('Severity: ', lang === 'gu' ? 'તીવ્રતા: ' : lang === 'hi' ? 'गंभीरता: ' : 'तीव्रता: ')
      .replace('Detection Time: ', lang === 'gu' ? 'શોધ સમય: ' : lang === 'hi' ? 'पहचान समय: ' : 'शोध वेळ: ')
      .replace('Audit Log ID: ', lang === 'gu' ? 'ઑડિટ લોગ ID: ' : lang === 'hi' ? 'ऑडिट लॉग ID: ' : 'ऑडिट लॉग ID: ')
      .replace('(FAILED Password Attempt)', lang === 'gu' ? '(નિષ્ફળ પાસવર્ડ પ્રયાસ)' : lang === 'hi' ? '(विफल पासवर्ड प्रयास)' : '(अयशस्वी पासवर्ड प्रयत्न)')
      .replace('Source IP: ', lang === 'gu' ? 'મૂળ IP: ' : lang === 'hi' ? 'स्रोत IP: ' : 'मूळ IP: ')
      .replace('(Mehsana Circle External)', lang === 'gu' ? '(મહેસાણા વર્તુળ બાહ્ય)' : lang === 'hi' ? '(मेहसाणा सर्कल बाह्य)' : '(मेहसाणा मंडळ बाह्य)')
      .replace('Target Role: Employee Sub-division Desk', lang === 'gu' ? 'લક્ષ્ય ભૂમિકા: કર્મચારી પેટા-વિભાગ ડેસ્ક' : lang === 'hi' ? 'लक्षित भूमिका: कर्मचारी उप-संभाग डेस्क' : 'लक्षित भूमिका: कर्मचारी उप-विभाग डेस्क')
      .replace('Application ', lang === 'gu' ? 'અરજી ' : lang === 'hi' ? 'आवेदन ' : 'अर्ज ')
      .replace('Applicant: ', lang === 'gu' ? 'અરજદાર: ' : lang === 'hi' ? 'आवेदक: ' : 'अर्जदार: ')
      .replace('Category: ', lang === 'gu' ? 'શ્રેણી: ' : lang === 'hi' ? 'श्रेणी: ' : 'श्रेणी: ')
      .replace('Documents Submitted: ', lang === 'gu' ? 'સબમિટ કરેલ દસ્તાવેજો: ' : lang === 'hi' ? 'प्रस्तुत दस्तावेज़: ' : 'सादर केलेले दस्तऐवज: ')
      .replace('Complaint ', lang === 'gu' ? 'ફરિયાદ ' : lang === 'hi' ? 'शिकायत ' : 'तक्रार ')
      .replace('Consumer: ', lang === 'gu' ? 'ગ્રાહક: ' : lang === 'hi' ? 'उपभोक्ता: ' : 'ग्राहक: ')
      .replace('SLA Window: ', lang === 'gu' ? 'SLA સમયમર્યાદા: ' : lang === 'hi' ? 'SLA समयसीमा: ' : 'SLA कालमर्यादा: ')
      .replace('Priority: ', lang === 'gu' ? 'પ્રાથમિકતા: ' : lang === 'hi' ? 'प्राथमिकता: ' : 'प्राधान्य: ')
      .replace('Incident ', lang === 'gu' ? 'ઘટના ' : lang === 'hi' ? 'घटना ' : 'घटना ')
      .replace('Module: ', lang === 'gu' ? 'મોડ્યુલ: ' : lang === 'hi' ? 'मॉड्यूल: ' : 'मॉड्यूल: ')
      .replace('Target Entity: ', lang === 'gu' ? 'લક્ષ્ય એકમ: ' : lang === 'hi' ? 'लक्ष्य इकाई: ' : 'लक्ष्य घटक: ')
      .replace('Audit Log ', lang === 'gu' ? 'ઑડિટ લોગ ' : lang === 'hi' ? 'ऑडिट लॉग ' : 'ऑडिट लॉग ')
      .replace('Actor: ', lang === 'gu' ? 'કર્તા: ' : lang === 'hi' ? 'कर्ता: ' : 'कर्ता: ')
      .replace('Resource: ', lang === 'gu' ? 'સંસાધન: ' : lang === 'hi' ? 'संसाधन: ' : 'संसाधन: ');
  };

  let localizedAffectedLabel = rec.affectedRecord.label;
  if (localizedAffectedLabel === 'IP 192.168.10.45 Session Cluster') {
    localizedAffectedLabel =
      lang === 'gu'
        ? 'IP 192.168.10.45 સત્ર ક્લસ્ટર'
        : lang === 'hi'
        ? 'IP 192.168.10.45 सत्र क्लस्टर'
        : 'IP 192.168.10.45 सत्र क्लस्टर';
  }

  return {
    agentPersonaName: personaMap[rec.agentPersonaName]?.[lang] || rec.agentPersonaName,
    title: localizedTitle,
    description: localizedDesc,
    reasoningSummary: localizedReasoning,
    supportingRecordReferences: rec.supportingRecordReferences.map(localizeSupportRef),
    entityTypeLabel: entityTypeMap[rec.affectedRecord.type]?.[lang] || rec.affectedRecord.type.toUpperCase(),
    affectedRecordLabel: localizedAffectedLabel,
    previousValueLabel: localizeStateVal(rec.previousValue),
    proposedValueLabel: localizeStateVal(rec.proposedValue),
    riskLevelLabel: riskMap[rec.riskLevel]?.[lang] || rec.riskLevel,
    requiredRoleLabel: roleMap[rec.requiredApprovingRole]?.[lang] || rec.requiredApprovingRole.toUpperCase(),
    statusLabel: statusMap[rec.status]?.[lang] || rec.status,
    decisionRemarksLabel: rec.decisionRemarks
  };
}

export function localizeApprovalPermissionReason(
  reason: string | undefined,
  lang: LanguageCode
): string {
  if (!reason || lang === 'en') return reason || '';
  if (reason.startsWith('Consumers are not permitted') || reason.startsWith('Consumers are consumers of electricity')) {
    return lang === 'gu'
      ? 'ગ્રાહકોને આંતરિક ERP AI ભલામણોને મંજૂરી આપવાની પરવાનગી નથી.'
      : lang === 'hi'
      ? 'उपभोक्ताओं को आंतरिक ERP AI अनुशंसाओं को अनुमोदित करने की अनुमति नहीं है।'
      : 'ग्राहकांना अंतर्गत ERP AI शिफारसी मंजूर करण्याची परवानगी नाही.';
  }
  if (reason.startsWith('High-risk commercial and industrial sanctions')) {
    return lang === 'gu'
      ? 'ઉચ્ચ-જોખમી વાણિજ્યિક અને ઔદ્યોગિક લોડ મંજૂરી (>10 kW) માટે કાર્યપાલક / અધીક્ષક ઇજનેરની પરવાનગી (મેનેજમેન્ટ ભૂમિકા) આવશ્યક છે.'
      : lang === 'hi'
      ? 'उच्च-जोखिम वाले वाणिज्यिक और औद्योगिक लोड अनुमोदनों (>10 kW) के लिए अधिशासी / अधीक्षण अभियंता के अधिकार (प्रबंधन भूमिका) की आवश्यकता है।'
      : 'उच्च-जोखमीच्या व्यावसायिक आणि औद्योगिक भार मंजुरीसाठी (>10 kW) कार्यकारी / अधीक्षक अभियंता परवानगी (व्यवस्थापन भूमिका) आवश्यक आहे.';
  }
  if (reason.startsWith('Security credential and active session revocation')) {
    return lang === 'gu'
      ? 'સુરક્ષા પ્રમાણપત્ર અને સક્રિય સત્ર રદ કરવા માટે સિસ્ટમ એડમિનિસ્ટ્રેશન અને સુરક્ષા ગવર્નન્સ અધિકાર (એડમિન ભૂમિકા) આવશ્યક છે.'
      : lang === 'hi'
      ? 'सुरक्षा क्रेडेंशियल और सक्रिय सत्र निरस्तीकरण के लिए सिस्टम प्रशासन एवं सुरक्षा गवर्नेंस अधिकार (एडमिन भूमिका) की आवश्यकता है।'
      : 'सुरक्षा क्रेडेन्शियल आणि सक्रिय सत्र रद्द करण्यासाठी सिस्टम प्रशासन व सुरक्षा गव्हर्नन्स अधिकार (ॲडमिन भूमिका) आवश्यक आहे.';
  }
  let m = reason.match(/^Role "([^"]+)" is not authorized for "([^"]+)"\.\s*Required approving authority:\s*"([^"]+)"\.$/);
  if (m) {
    return lang === 'gu'
      ? `ભૂમિકા "${m[1]}" ને "${m[2]}" માટે અધિકાર નથી. જરૂરી મંજૂરી સત્તા: "${m[3]}".`
      : lang === 'hi'
      ? `भूमिका "${m[1]}" को "${m[2]}" के लिए अधिकार नहीं है। आवश्यक अनुमोदन प्राधिकारी: "${m[3]}"।`
      : `"${m[1]}" भूमिकेला "${m[2]}" साठी अधिकार नाही. आवश्यक मंजुरी प्राधिकरण: "${m[3]}".`;
  }
  m = reason.match(/^This action requires\s+(.+?)\s+role authorization\s+\(current role:\s*(.+?)\)\.$/);
  if (m) {
    return lang === 'gu'
      ? `આ કાર્યવાહી માટે ${m[1]} ભૂમિકાના અધિકારની જરૂર છે (વર્તમાન ભૂમિકા: ${m[2]}).`
      : lang === 'hi'
      ? `इस कार्रवाई के लिए ${m[1]} भूमिका के अधिकार की आवश्यकता है (वर्तमान भूमिका: ${m[2]})।`
      : `या कृतीसाठी ${m[1]} भूमिकेच्या अधिकाराची आवश्यकता आहे (सद्य भूमिका: ${m[2]}).`;
  }
  return reason;
}

export function localizeIncidentAccessDenialReason(
  reason: string | undefined,
  lang: LanguageCode
): string {
  if (!reason || lang === 'en') return reason || '';
  if (
    reason.startsWith('Consumer accounts do not have access') ||
    reason.startsWith('Consumers are strictly prohibited')
  ) {
    return lang === 'gu'
      ? 'ગ્રાહક ખાતાઓને આંતરિક સંચાલન ઘટના દસ્તાવેજો જોવા માટે પરવાનગી નથી.'
      : lang === 'hi'
      ? 'उपभोक्ता खातों को आंतरिक परिचालन घटना दस्तावेज़ों तक पहुंचने की अनुमति नहीं है।'
      : 'ग्राहक खात्यांना अंतर्गत परिचालन घटना दस्तऐवज पाहण्याची परवानगी नाही.';
  }
  if (reason === 'This incident is not assigned to your field engineering account.') {
    return lang === 'gu'
      ? 'આ ઘટના તમારા ફિલ્ડ ઇજનેર ખાતાને સોંપવામાં આવી નથી.'
      : lang === 'hi'
      ? 'यह घटना आपके फील्ड इंजीनियरिंग खाते को नहीं सौंपी गई है।'
      : 'ही घटना तुमच्या फील्ड अभियांत्रिकी खात्याकडे सोपवलेली नाही.';
  }
  if (reason === 'This incident has not been escalated to your executive management authority.') {
    return lang === 'gu'
      ? 'આ ઘટના તમારા એક્ઝિક્યુટિવ મેનેજમેન્ટ સત્તાધિકારી સમક્ષ એસ્કેલેટ કરવામાં આવી નથી.'
      : lang === 'hi'
      ? 'यह घटना आपके कार्यकारी प्रबंधन प्राधिकरण को एस्केलेट नहीं की गई है।'
      : 'ही घटना तुमच्या कार्यकारी व्यवस्थापन प्राधिकरणाकडे एस्केलेट केलेली नाही.';
  }
  if (reason === 'Your current session role is not authorized to view this incident.') {
    return lang === 'gu'
      ? 'તમારી વર્તમાન સત્ર ભૂમિકા આ ઘટના જોવા માટે અધિકૃત નથી.'
      : lang === 'hi'
      ? 'आपकी वर्तमान सत्र भूमिका इस घटना को देखने के लिए अधिकृत नहीं है।'
      : 'तुमची सद्य सत्र भूमिका ही घटना पाहण्यासाठी अधिकृत नाही.';
  }
  let m = reason.match(/^Access Restricted:\s*Incident\s+(\S+)\s+is not yet assigned to a Field Engineer/);
  if (m) {
    return lang === 'gu'
      ? `પ્રવેશ પ્રતિબંધિત: ઘટના ${m[1]} હજુ સુધી ફિલ્ડ ઇજનેરને સોંપવામાં આવી નથી. સામાન્ય સંચાલન ઘટનાઓ પહેલા કર્મચારી નિયંત્રણ ડેસ્ક દ્વારા તપાસવી અને સોંપવી આવશ્યક છે.`
      : lang === 'hi'
      ? `पहुंच प्रतिबंधित: घटना ${m[1]} अभी तक किसी फील्ड अभियंता को नहीं सौंपी गई है। सामान्य परिचालन घटनाओं को पहले कर्मचारी नियंत्रण डेस्क द्वारा जांचा और सौंपा जाना आवश्यक है।`
      : `प्रवेश प्रतिबंधित: घटना ${m[1]} अद्याप फील्ड अभियंत्याकडे सोपवलेली नाही. सामान्य परिचालन घटना प्रथम कर्मचारी नियंत्रण डेस्कद्वारे तपासल्या आणि नियुक्त केल्या गेल्या पाहिजेत.`;
  }
  m = reason.match(/^Access Restricted:\s*Incident\s+(\S+)\s+is assigned to\s+(.+?)\.\s*Only the designated Field Engineer may access this operational dossier\.$/);
  if (m) {
    return lang === 'gu'
      ? `પ્રવેશ પ્રતિબંધિત: ઘટના ${m[1]} એ ${m[2]} ને સોંપાયેલ છે. માત્ર નિયુક્ત ફિલ્ડ ઇજનેર જ આ દસ્તાવેજ ખોલી શકે છે.`
      : lang === 'hi'
      ? `पहुंच प्रतिबंधित: घटना ${m[1]} ${m[2]} को सौंपी गई है। केवल नामित फील्ड अभियंता ही इस दस्तावेज़ तक पहुंच सकते हैं।`
      : `प्रवेश प्रतिबंधित: घटना ${m[1]} ${m[2]} यांच्याकडे सोपवलेली आहे. केवळ नियुक्त फील्ड अभियंताच हा दस्तऐवज पाहू शकतात.`;
  }
  m = reason.match(/^Jurisdiction Restricted:\s*Incident\s+(\S+)\s+belongs to\s+(.+?),\s*outside your authorized subdivision\s*\(([^)]+)\)\.$/);
  if (m) {
    const sub1 = localizeSubdivision(m[2], lang);
    const sub2 = localizeSubdivision(m[3], lang);
    return lang === 'gu'
      ? `કાર્યક્ષેત્ર પ્રતિબંધિત: ઘટના ${m[1]} એ ${sub1} ની છે, જે તમારા અધિકૃત પેટા-વિભાગ (${sub2}) ની બહાર છે.`
      : lang === 'hi'
      ? `कार्यक्षेत्र प्रतिबंधित: घटना ${m[1]} ${sub1} से संबंधित है, जो आपके अधिकृत उप-संभाग (${sub2}) के बाहर है।`
      : `कार्यक्षेत्र प्रतिबंधित: घटना ${m[1]} ${sub1} मधील आहे, जी तुमच्या अधिकृत उप-विभागाबाहेर (${sub2}) आहे.`;
  }
  return reason;
}

export function localizeToastMessage(message: string, lang: LanguageCode): string {
  if (!message || lang === 'en') return message;

  const exactMap: Record<string, Record<LanguageCode, string>> = {
    'Refreshed real-time ERP event stream': {
      en: 'Refreshed real-time ERP event stream',
      gu: 'રીઅલ-ટાઇમ ERP ઇવેન્ટ સ્ટ્રીમ તાજી કરવામાં આવી',
      hi: 'रीयल-टाइम ERP इवेंट स्ट्रीम रिफ्रेश की गई',
      mr: 'रिअल-टाइम ERP इव्हेंट स्ट्रीम रिफ्रेश केली गेली'
    },
    'Exported revenue statement as CSV (Demo)': {
      en: 'Exported revenue statement as CSV (Demo)',
      gu: 'મહેસૂલ પત્રક CSV તરીકે નિકાસ કરવામાં આવ્યું (ડેમો)',
      hi: 'राजस्व विवरण CSV के रूप में निर्यात किया गया (डेमो)',
      mr: 'महसूल विवरण CSV म्हणून निर्यात केले (डेमो)'
    },
    'Please provide a reason for reassigning this incident.': {
      en: 'Please provide a reason for reassigning this incident.',
      gu: 'કૃપા કરીને આ ઘટના ફરીથી સોંપવા માટેનું કારણ આપો.',
      hi: 'कृपया इस घटना को पुनः सौंपने का कारण प्रदान करें।',
      mr: 'कृपया ही घटना पुनर्नियुक्त करण्याचे कारण द्या.'
    },
    'Escalation reason is required.': {
      en: 'Escalation reason is required.',
      gu: 'એસ્કેલેશનનું કારણ આપવું આવશ્યક છે.',
      hi: 'एस्केलेशन का कारण आवश्यक है।',
      mr: 'एस्केलेशनचे कारण आवश्यक आहे.'
    },
    'All visible notifications marked as read.': {
      en: 'All visible notifications marked as read.',
      gu: 'તમામ દૃશ્યમાન સૂચનાઓ વાંચેલી તરીકે ચિહ્નિત કરવામાં આવી.',
      hi: 'सभी दृश्यमान सूचनाएं पढ़ी गई के रूप में चिह्नित की गईं।',
      mr: 'सर्व दृश्यमान सूचना वाचल्या म्हणून चिन्हांकित केल्या.'
    },
    'Notification removed.': {
      en: 'Notification removed.',
      gu: 'સૂચના દૂર કરવામાં આવી.',
      hi: 'सूचना हटा दी गई।',
      mr: 'सूचना काढून टाकली.'
    },
    'Notification list cleared.': {
      en: 'Notification list cleared.',
      gu: 'સૂચના યાદી સાફ કરવામાં આવી.',
      hi: 'सूचना सूची साफ़ कर दी गई।',
      mr: 'सूचना यादी साफ केली.'
    },
    'Demo dataset reset to initial state!': {
      en: 'Demo dataset reset to initial state!',
      gu: 'ડેમો ડેટાસેટ પ્રારંભિક સ્થિતિમાં રીસેટ કરવામાં આવ્યો!',
      hi: 'डेमो डेटासेट प्रारंभिक स्थिति में रीसेट किया गया!',
      mr: 'डेमो डेटासेट प्रारंभिक स्थितीत रीसेट केला!'
    },
    'Simulated Offline Mode enabled — inspections will queue locally': {
      en: 'Simulated Offline Mode enabled — inspections will queue locally',
      gu: 'સિમ્યુલેટેડ ઓફલાઇન મોડ સક્રિય — નિરીક્ષણો સ્થાનિક રીતે કતારબદ્ધ થશે',
      hi: 'सिम्युलेटेड ऑफलाइन मोड सक्षम — निरीक्षण स्थानीय रूप से कतारबद्ध होंगे',
      mr: 'सिम्युलेटेड ऑफलाईन मोड सुरू — तपासण्या स्थानिक पातळीवर रांगेत राहतील'
    },
    'Simulated Online Mode restored — local queue synchronized': {
      en: 'Simulated Online Mode restored — local queue synchronized',
      gu: 'સિમ્યુલેટેડ ઓનલાઇન મોડ પુનઃસ્થાપિત — સ્થાનિક કતાર સિંક્રનાઇઝ થઈ',
      hi: 'सिम्युलेटेड ऑनलाइन मोड बहाल — स्थानीय कतार सिंक्रनाइज़ की गई',
      mr: 'सिम्युलेटेड ऑनलाईन मोड पूर्ववत — स्थानिक रांग सिंक्रनाइझ झाली'
    },
    'Simulated flush: All 2 queued inspections transmitted': {
      en: 'Simulated flush: All 2 queued inspections transmitted',
      gu: 'સિમ્યુલેટેડ સિંક: કતારમાં રહેલા તમામ 2 નિરીક્ષણો મોકલવામાં આવ્યા',
      hi: 'सिम्युलेटेड सिंक: कतारबद्ध सभी 2 निरीक्षण भेजे गए',
      mr: 'सिम्युलेटेड सिंक: रांगेतील सर्व 2 तपासण्या पाठवल्या गेल्या'
    },
    'Decline reason is mandatory.': {
      en: 'Decline reason is mandatory.',
      gu: 'અસ્વીકાર કરવાનું કારણ આપવું ફરજિયાત છે.',
      hi: 'अस्वीकार करने का कारण अनिवार्य है।',
      mr: 'नाकारण्याचे कारण देणे अनिवार्य आहे.'
    },
    'Technical observations/findings are required.': {
      en: 'Technical observations/findings are required.',
      gu: 'ટેકનિકલ અવલોકનો/તારણો દાખલ કરવા આવશ્યક છે.',
      hi: 'तकनीकी अवलोकन/निष्कर्ष दर्ज करना आवश्यक है।',
      mr: 'तांत्रिक निरीक्षणे/निष्कर्ष नोंदवणे आवश्यक आहे.'
    },
    'Assistance specifications are required.': {
      en: 'Assistance specifications are required.',
      gu: 'સહાયની વિગતો આપવી આવશ્યક છે.',
      hi: 'सहायता का विवरण आवश्यक है।',
      mr: 'मदतीचा तपशील देणे आवश्यक आहे.'
    },
    'Resolution summary report is required.': {
      en: 'Resolution summary report is required.',
      gu: 'નિવારણ સારાંશ અહેવાલ આપવો આવશ્યક છે.',
      hi: 'समाधान सारांश रिपोर्ट आवश्यक है।',
      mr: 'निवारण सारांश अहवाल आवश्यक आहे.'
    },
    'Executive advisory note cannot be empty.': {
      en: 'Executive advisory note cannot be empty.',
      gu: 'એક્ઝિક્યુટિવ સલાહ નોંધ ખાલી હોઈ શકે નહીં.',
      hi: 'कार्यकारी सलाह टिप्पणी खाली नहीं हो सकती।',
      mr: 'कार्यकारी सल्ला नोंद रिकामी असू शकत नाही.'
    },
    'Closure justification is required.': {
      en: 'Closure justification is required.',
      gu: 'સમાપ્તિનું વાજબી કારણ આપવું આવશ્યક છે.',
      hi: 'समापन का औचित्य आवश्यक है।',
      mr: 'समाप्तीचे समर्थन आवश्यक आहे.'
    },
    'Simulated zero-downtime certificate renewal': {
      en: 'Simulated zero-downtime certificate renewal',
      gu: 'સિમ્યુલેટેડ ઝીરો-ડાઉનટાઇમ પ્રમાણપત્ર નવીનીકરણ પૂર્ણ',
      hi: 'सिम्युलेटेड ज़ीरो-डाउनटाइम प्रमाणपत्र नवीनीकरण पूर्ण',
      mr: 'सिम्युलेटेड झिरो-डाउनटाइम प्रमाणपत्र नूतनीकरण पूर्ण'
    },
    'New enterprise user onboarding dialog (Demo)': {
      en: 'New enterprise user onboarding dialog (Demo)',
      gu: 'નવા એન્ટરપ્રાઇઝ વપરાશકર્તા ઓનબોર્ડિંગ સંવાદ (ડેમો)',
      hi: 'नया एंटरप्राइज उपयोगकर्ता ऑनबोर्डिंग संवाद (डेमो)',
      mr: 'नवीन एंटरप्राइझ वापरकर्ता ऑनबोर्डिंग संवाद (डेमो)'
    },
    'Permission matrix updated in volatile session': {
      en: 'Permission matrix updated in volatile session',
      gu: 'અસ્થાયી સત્રમાં પરવાનગી મેટ્રિક્સ અપડેટ કરવામાં આવ્યું',
      hi: 'अस्थायी सत्र में अनुमति मैट्रिक्स अपडेट किया गया',
      mr: 'तात्पुरत्या सत्रात परवानगी मॅट्रिक्स अद्यतनित केले'
    },
    'Simulated database snapshot triggered (PostgreSQL Cluster)': {
      en: 'Simulated database snapshot triggered (PostgreSQL Cluster)',
      gu: 'સિમ્યુલેટેડ ડેટાબેઝ સ્નેપશોટ શરૂ કરવામાં આવ્યો (PostgreSQL ક્લસ્ટર)',
      hi: 'सिम्युलेटेड डेटाबेस स्नैपशॉट शुरू किया गया (PostgreSQL क्लस्टर)',
      mr: 'सिम्युलेटेड डेटाबेस स्नॅपशॉट सुरू केला (PostgreSQL क्लस्टर)'
    },
    'Simulated snapshot completed: 184.6 GB archived to GSDC cold storage': {
      en: 'Simulated snapshot completed: 184.6 GB archived to GSDC cold storage',
      gu: 'સિમ્યુલેટેડ સ્નેપશોટ પૂર્ણ: 184.6 GB GSDC કોલ્ડ સ્ટોરેજમાં આર્કાઇવ થયું',
      hi: 'सिम्युलेटेड स्नैपशॉट पूर्ण: 184.6 GB GSDC कोल्ड स्टोरेज में संग्रहीत',
      mr: 'सिम्युलेटेड स्नॅपशॉट पूर्ण: 184.6 GB GSDC कोल्ड स्टोरेजमध्ये संग्रहित'
    },
    'Settings saved to volatile session (Demo)': {
      en: 'Settings saved to volatile session (Demo)',
      gu: 'અસ્થાયી સત્રમાં સેટિંગ્સ સાચવવામાં આવી (ડેમો)',
      hi: 'अस्थायी सत्र में सेटिंग्स सहेजी गईं (डेमो)',
      mr: 'तात्पुरत्या सत्रात सेटिंग्ज जतन केल्या (डेमो)'
    }
  };

  if (exactMap[message]?.[lang]) {
    return exactMap[message][lang];
  }

  let m = message.match(/^Application\s+(\S+)\s+Approved & Energized!$/);
  if (m) {
    return lang === 'gu'
      ? `અરજી ${m[1]} મંજૂર અને કાર્યાન્વિત કરવામાં આવી!`
      : lang === 'hi'
      ? `आवेदन ${m[1]} स्वीकृत एवं ऊर्जित किया गया!`
      : `अर्ज ${m[1]} मंजूर आणि कार्यान्वित केला!`;
  }

  m = message.match(/^Application\s+(\S+)\s+Rejected(?::\s*(.+))?$/);
  if (m) {
    const suffix = m[2] ? `: ${m[2]}` : '';
    return lang === 'gu'
      ? `અરજી ${m[1]} નામંજૂર કરવામાં આવી${suffix}`
      : lang === 'hi'
      ? `आवेदन ${m[1]} अस्वीकृत किया गया${suffix}`
      : `अर्ज ${m[1]} नामंजूर केला${suffix}`;
  }

  m = message.match(/^Application\s+(\S+)\s+advanced to\s+"([^"]+)"$/);
  if (m) {
    const stage = localizeApplicationStatus(m[2], lang);
    return lang === 'gu'
      ? `અરજી ${m[1]} ને "${stage}" તબક્કામાં આગળ વધારવામાં આવી`
      : lang === 'hi'
      ? `आवेदन ${m[1]} को "${stage}" चरण में आगे बढ़ाया गया`
      : `अर्ज ${m[1]} "${stage}" टप्प्यात पुढे नेला`;
  }

  m = message.match(/^Clarification requested for\s+(\S+)\.\s*Consumer notified\.$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે સ્પષ્ટતા માંગવામાં આવી. ગ્રાહકને જાણ કરવામાં આવી.`
      : lang === 'hi'
      ? `${m[1]} के लिए स्पष्टीकरण मांगा गया। उपभोक्ता को सूचित किया गया।`
      : `${m[1]} साठी स्पष्टीकरण मागवले. ग्राहकाला सूचित केले.`;
  }

  m = message.match(/^Application\s+(\S+)\s+archived from active queue\.\s*Audit trail & consumer record preserved\.$/);
  if (m) {
    return lang === 'gu'
      ? `અરજી ${m[1]} સક્રિય કતારમાંથી આર્કાઇવ કરવામાં આવી. ઑડિટ ઇતિહાસ અને ગ્રાહક રેકોર્ડ સુરક્ષિત.`
      : lang === 'hi'
      ? `आवेदन ${m[1]} सक्रिय कतार से संग्रहीत किया गया। ऑडिट ट्रेल एवं उपभोक्ता रिकॉर्ड सुरक्षित।`
      : `अर्ज ${m[1]} सक्रिय रांगेतून संग्रहित केला. ऑडिट ट्रेल आणि ग्राहक रेकॉर्ड सुरक्षित.`;
  }

  m = message.match(/^Application\s+(\S+)\s+restored to active queue\.$/);
  if (m) {
    return lang === 'gu'
      ? `અરજી ${m[1]} સક્રિય કતારમાં પુનઃસ્થાપિત કરવામાં આવી.`
      : lang === 'hi'
      ? `आवेदन ${m[1]} सक्रिय कतार में पुनर्स्थापित किया गया।`
      : `अर्ज ${m[1]} सक्रिय रांगेत पुनर्संचयित केला.`;
  }

  m = message.match(/^Complaint\s+(\S+)\s+marked as\s+"([^"]+)"$/);
  if (m) {
    const st = localizeComplaintStatus(m[2], lang);
    return lang === 'gu'
      ? `ફરિયાદ ${m[1]} ને "${st}" તરીકે ચિહ્નિત કરવામાં આવી`
      : lang === 'hi'
      ? `शिकायत ${m[1]} को "${st}" के रूप में चिह्नित किया गया`
      : `तक्रार ${m[1]} "${st}" म्हणून चिन्हांकित केली`;
  }

  m = message.match(/^Complaint\s+(\S+)\s+dispatched to\s+(.+?)\s*\(Work Order:\s*(\S+)\)$/);
  if (m) {
    return lang === 'gu'
      ? `ફરિયાદ ${m[1]} એ ${m[2]} ને સોંપવામાં આવી (વર્ક ઓર્ડર: ${m[3]})`
      : lang === 'hi'
      ? `शिकायत ${m[1]} ${m[2]} को भेजी गई (वर्क ऑर्डर: ${m[3]})`
      : `तक्रार ${m[1]} ${m[2]} यांच्याकडे पाठवली (वर्क ऑर्डर: ${m[3]})`;
  }

  m = message.match(/^Work Order\s+(\S+)\s+updated to\s+"([^"]+)"$/);
  if (m) {
    const st = localizeWorkOrderStatus(m[2], lang);
    return lang === 'gu'
      ? `વર્ક ઓર્ડર ${m[1]} ને "${st}" પર અપડેટ કરવામાં આવ્યો`
      : lang === 'hi'
      ? `वर्क ऑर्डर ${m[1]} को "${st}" पर अपडेट किया गया`
      : `वर्क ऑर्डर ${m[1]} "${st}" वर अद्यतनित केली`;
  }

  m = message.match(/^Added case note to\s+#?(\S+)$/);
  if (m) {
    return lang === 'gu'
      ? `#${m[1]} માં કેસ નોંધ ઉમેરવામાં આવી`
      : lang === 'hi'
      ? `#${m[1]} में केस नोट जोड़ा गया`
      : `#${m[1]} मध्ये केस नोंद जोडली`;
  }

  m = message.match(/^(\d+)\s+notifications?\s+marked as read\.$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} સૂચના(ઓ) વાંચેલી તરીકે ચિહ્નિત કરવામાં આવી.`
      : lang === 'hi'
      ? `${m[1]} सूचना(एं) पढ़ी गई के रूप में चिह्नित की गईं।`
      : `${m[1]} सूचना वाचल्या म्हणून चिन्हांकित केल्या.`;
  }

  m = message.match(/^(\d+)\s+notifications?\s+deleted\.$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} સૂચના(ઓ) કાઢી નાખવામાં આવી.`
      : lang === 'hi'
      ? `${m[1]} सूचना(एं) हटाई गईं।`
      : `${m[1]} सूचना हटवल्या.`;
  }

  m = message.match(/^Emergency Hazard reported for\s+(\S+)\s+—\s+Critical incident broadcasted$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે કટોકટી જોખમની જાણ કરવામાં આવી — ગંભીર ઘટના પ્રસારિત થઈ`
      : lang === 'hi'
      ? `${m[1]} के लिए आपातकालीन खतरे की रिपोर्ट की गई — गंभीर घटना प्रसारित की गई`
      : `${m[1]} साठी आपत्कालीन धोक्याची नोंद केली — गंभीर घटना प्रसारित केली`;
  }

  m = message.match(/^Inspection report submitted for\s+(\S+)\s+—\s+Status updated to Completed$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે નિરીક્ષણ અહેવાલ સબમિટ કરવામાં આવ્યો — સ્થિતિ પૂર્ણ પર અપડેટ થઈ`
      : lang === 'hi'
      ? `${m[1]} के लिए निरीक्षण रिपोर्ट सबमिट की गई — स्थिति पूर्ण पर अपडेट की गई`
      : `${m[1]} साठी तपासणी अहवाल सादर केला — स्थिती पूर्ण वर अद्यतनित केली`;
  }

  m = message.match(/^Focused 11kV Feeder Patrol on\s+(.+)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} પર 11kV ફીડર પેટ્રોલિંગ કેન્દ્રિત કરવામાં આવ્યું`
      : lang === 'hi'
      ? `${m[1]} पर 11kV फीडर पेट्रोलिंग केंद्रित किया गया`
      : `${m[1]} वर 11kV फीडर पेट्रोलिंग केंद्रित केले`;
  }

  m = message.match(/^Logged routine corridor patrol check for\s+(\S+)\s+\((.+)\)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} (${m[2]}) માટે નિયમિત કોરિડોર પેટ્રોલિંગ ચકાસણી નોંધવામાં આવી`
      : lang === 'hi'
      ? `${m[1]} (${m[2]}) के लिए नियमित कॉरिडोर पेट्रोलिंग जांच दर्ज की गई`
      : `${m[1]} (${m[2]}) साठी नियमित कॉरिडॉर पेट्रोलिंग तपासणी नोंदवली`;
  }

  m = message.match(/^Assignment accepted for\s+(\S+)\.\s*Status:\s*(\S+)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે સોંપણી સ્વીકારવામાં આવી. સ્થિતિ: ${m[2]}`
      : lang === 'hi'
      ? `${m[1]} के लिए असाइनमेंट स्वीकार किया गया। स्थिति: ${m[2]}`
      : `${m[1]} साठी नेमणूक स्वीकारली. स्थिती: ${m[2]}`;
  }

  m = message.match(/^Assignment Declined:\s*(\S+)\s+returned to Employee queue for reassignment\.?$/);
  if (m) {
    return lang === 'gu'
      ? `સોંપણી અસ્વીકાર: ${m[1]} ને ફરીથી સોંપણી માટે કર્મચારી કતારમાં પરત મોકલવામાં આવી.`
      : lang === 'hi'
      ? `असाइनमेंट अस्वीकृत: ${m[1]} को पुनः असाइनमेंट के लिए कर्मचारी कतार में वापस भेजा गया।`
      : `नेमणूक नाकारली: ${m[1]} पुन्हा नेमणुकीसाठी कर्मचारी रांगेत परत पाठवले.`;
  }

  m = message.match(/^On-site inspection started for\s+(\S+)\.\s*Status:\s*(\S+)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે સ્થળ પર નિરીક્ષણ શરૂ થયું. સ્થિતિ: ${m[2]}`
      : lang === 'hi'
      ? `${m[1]} के लिए साइट पर निरीक्षण शुरू हुआ। स्थिति: ${m[2]}`
      : `${m[1]} साठी प्रत्यक्ष साईट तपासणी सुरू झाली. स्थिती: ${m[2]}`;
  }

  m = message.match(/^Technical findings filed for\s+(\S+)\.\s*Status:\s*(\S+)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે ટેકનિકલ તારણો દાખલ કરવામાં આવ્યા. સ્થિતિ: ${m[2]}`
      : lang === 'hi'
      ? `${m[1]} के लिए तकनीकी निष्कर्ष दर्ज किए गए। स्थिति: ${m[2]}`
      : `${m[1]} साठी तांत्रिक निष्कर्ष नोंदवले. स्थिती: ${m[2]}`;
  }

  m = message.match(/^Assistance request transmitted for\s+(\S+)\.$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે સહાયની વિનંતી મોકલવામાં આવી.`
      : lang === 'hi'
      ? `${m[1]} के लिए सहायता का अनुरोध भेजा गया।`
      : `${m[1]} साठी मदतीची विनंती पाठवली.`;
  }

  m = message.match(/^Resolution report filed for\s+(\S+)\.\s*Status:\s*(\S+)$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે નિવારણ અહેવાલ સબમિટ થયો. સ્થિતિ: ${m[2]}`
      : lang === 'hi'
      ? `${m[1]} के लिए समाधान रिपोर्ट सबमिट की गई। स्थिति: ${m[2]}`
      : `${m[1]} साठी निवारण अहवाल सादर केला. स्थिती: ${m[2]}`;
  }

  m = message.match(/^EMERGENCY SAFETY OVERRIDE broadcasted for\s+(\S+)!$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે તાત્કાલિક સુરક્ષા ઓવરરાઇડ પ્રસારિત કરવામાં આવ્યું!`
      : lang === 'hi'
      ? `${m[1]} के लिए आपातकालीन सुरक्षा ओवरराइड प्रसारित किया गया!`
      : `${m[1]} साठी आपत्कालीन सुरक्षा ओव्हरराईड प्रसारित केले!`;
  }

  m = message.match(/^Feeder hazard reported on\s+(\S+)\.\s*Routed to Employee Incident (?:Control )?Desk\.?$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} પર ફીડર જોખમની જાણ કરવામાં આવી. કર્મચારી ઘટના નિયંત્રણ ડેસ્ક પર મોકલવામાં આવ્યું.`
      : lang === 'hi'
      ? `${m[1]} पर फीडर खतरे की रिपोर्ट की गई। कर्मचारी इंसिडेंट डेस्क को भेजा गया।`
      : `${m[1]} वर फीडर धोक्याची नोंद केली. कर्मचारी घटना डेस्ककडे पाठवले.`;
  }

  m = message.match(/^Incident\s+(\S+)\s+escalated to\s+(.+)\.$/);
  if (m) {
    return lang === 'gu'
      ? `ઘટના ${m[1]} ને ${m[2]} સમક્ષ એસ્કેલેટ કરવામાં આવી.`
      : lang === 'hi'
      ? `घटना ${m[1]} को ${m[2]} को एस्केलेट किया गया।`
      : `घटना ${m[1]} ${m[2]} यांच्याकडे एस्केलेट केली.`;
  }

  m = message.match(/^Executive directive logged for\s+(\S+)\.$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે એક્ઝિક્યુટિવ સૂચના નોંધવામાં આવી.`
      : lang === 'hi'
      ? `${m[1]} के लिए कार्यकारी निर्देश दर्ज किया गया।`
      : `${m[1]} साठी कार्यकारी निर्देश नोंदवले.`;
  }

  m = message.match(/^Incident\s+(\S+)\s+verified and closed\.?$/);
  if (m) {
    return lang === 'gu'
      ? `ઘટના ${m[1]} ચકાસવામાં આવી અને બંધ કરવામાં આવી.`
      : lang === 'hi'
      ? `घटना ${m[1]} सत्यापित और बंद की गई।`
      : `घटना ${m[1]} पडताळली आणि बंद केली.`;
  }

  m = message.match(/^Administrative closure executed for\s+(\S+)\.$/);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} માટે વહીવટી સમાપ્તિ અમલમાં મૂકવામાં આવી.`
      : lang === 'hi'
      ? `${m[1]} के लिए प्रशासनिक समापन निष्पादित किया गया।`
      : `${m[1]} साठी प्रशासकीय समाप्ती कार्यान्वित केली.`;
  }

  m = message.match(/^User\s+(\S+)\s+access state toggled \(Demo\)$/);
  if (m) {
    return lang === 'gu'
      ? `વપરાશકર્તા ${m[1]} એક્સેસ સ્થિતિ બદલવામાં આવી (ડેમો)`
      : lang === 'hi'
      ? `उपयोगकर्ता ${m[1]} एक्सेस स्थिति बदली गई (डेमो)`
      : `वापरकर्ता ${m[1]} ॲक्सेस स्थिती बदलली (डेमो)`;
  }

  m = message.match(/^Action\s+(\S+)\s+approved & executed successfully!$/);
  if (m) {
    return lang === 'gu'
      ? `કાર્યવાહી ${m[1]} સફળતાપૂર્વક મંજૂર અને અમલીકૃત કરવામાં આવી!`
      : lang === 'hi'
      ? `कार्रवाई ${m[1]} सफलतापूर्वक स्वीकृत एवं निष्पादित की गई!`
      : `कृती ${m[1]} यशस्वीपणे मंजूर आणि कार्यान्वित केली!`;
  }

  m = message.match(/^Recommendation\s+(\S+)\s+rejected by operator\.\s*Action cancelled\.$/);
  if (m) {
    return lang === 'gu'
      ? `ભલામણ ${m[1]} ઓપરેટર દ્વારા નામંજૂર કરવામાં આવી. કાર્યવાહી રદ થઈ.`
      : lang === 'hi'
      ? `अनुशंसा ${m[1]} ऑपरेटर द्वारा अस्वीकृत की गई। कार्रवाई रद्द।`
      : `शिफारस ${m[1]} ऑपरेटरद्वारे फेटाळली. कृती रद्द.`;
  }

  return message;
}
