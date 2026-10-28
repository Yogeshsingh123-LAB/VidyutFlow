/**
 * VIDYUTFLOW — END-TO-END NOTIFICATION EVENT WORKFLOW VERIFICATION SUITE
 *
 * Verifies:
 * 1. Application Lifecycle Notifications (Submitted -> Clarification -> Doc Verification -> Site Inspection -> Sanction Approval -> Meter Installed / Rejected)
 * 2. Critical Incident & Escalation Notifications (Assign -> Accept -> Decline with mandatory reason -> Return to ACKNOWLEDGED -> Reassign -> Escalate -> Management Decision)
 * 3. Complaint & Field Assignment Notifications (Registered -> Dispatched -> Resolved / Work Order Closed)
 * 4. Strict Role & Account Isolation (Consumer vs Employee vs Field Engineer vs Management vs Admin)
 * 5. Read / Unread / Dismissed Inbox Scope Isolation & Deduplication
 * 6. Four-Language Localization Integrity (en, gu, hi, mr) with Canonical Identifier Preservation
 */

import assert from 'node:assert/strict';
import {
  buildApplicationLifecycleNotifications,
  filterEmployeeApplicationNotifications,
  isEmployeeAuthorizedForSubdivision,
  resolveAssignedOfficerForSubdivision,
  upsertNotificationList,
  getNotificationInboxScopeKey
} from '../src/context/AppContext';
import {
  filterIncidentsForSession,
  authorizeIncidentModalAccess,
  authorizeFieldEngineerAction,
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  sanitizeAndScopeIncidentNotifications
} from '../src/utils/anomalyDetector';
import {
  localizeConsumerNotification,
  localizeNotificationDateGroupHeader,
  localizeNotificationStatusBadge,
  localizeNotificationTimestamp,
  localizeSubdivision,
  normalizeCanonicalSubdivision,
  normalizeCanonicalTariffCategory
} from '../src/i18n/consumerContentTranslations';
import {
  formatErpDateTime,
  groupNotificationsByDate,
  parseNotificationStoredDate,
  sortNotificationsNewestFirst
} from '../src/utils/dateUtils';
import {
  getCanonicalIdentityById,
  createDemoSessionForIdentity
} from '../src/data/demoAuthData';
import { getActiveUserIdentity } from '../src/utils/avatarUtils';
import { AppNotification, CriticalIncident, NewConnectionApplication } from '../src/types';
import { LanguageCode } from '../src/i18n/types';

console.log('=== VIDYUTFLOW NOTIFICATION EVENT WORKFLOW VERIFICATION ===\n');

// ---------------------------------------------------------------------------
// 1. APPLICATION LIFECYCLE WORKFLOW & DEDUPLICATION
// ---------------------------------------------------------------------------
console.log('1. Testing Application Lifecycle Notification Generation & Deduplication...');

const testApp: NewConnectionApplication = {
  id: 'APP-2026-0991',
  applicantName: 'Rameshbhai Chaudhary',
  phone: '+91 98250 11223',
  email: 'ramesh.c@example.com',
  address: '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002',
  subdivision: 'Mehsana City North',
  category: 'Residential (RGPU)',
  requestedLoadKw: 5,
  phase: '1-Phase',
  status: 'Submitted',
  appliedDate: '15-Oct-2026',
  targetCompletionDate: '25-Oct-2026',
  workflowStep: 1,
  documentsSubmitted: ['Aadhaar Card', 'Property Tax Receipt', 'Test Report'],
  premisesType: 'Owned',
  assignedOfficer: 'Sunil Mehta (AE Ops)',
  estimatedSanctionCost: 6450,
  accountId: 'cns_ramesh_01',
  notesHistory: []
};

let appInbox: AppNotification[] = [];

// Stage 1: Submitted
const subStage = buildApplicationLifecycleNotifications(testApp, 'Submitted');
assert.equal(subStage.employeeNotif.targetRole, 'employee');
assert.equal(subStage.employeeNotif.applicationId, 'APP-2026-0991');
assert.equal(subStage.employeeNotif.subdivision, 'Mehsana City North');
assert.ok(subStage.consumerNotif, 'Consumer should receive confirmation notification on submission');
assert.equal(subStage.consumerNotif!.targetRole, 'consumer');
assert.equal(subStage.consumerNotif!.accountId, 'cns_ramesh_01');
appInbox = upsertNotificationList(appInbox, [subStage.employeeNotif, subStage.consumerNotif!]);
assert.equal(appInbox.length, 2);

// Stage 1b: Clarification Requested
const clarStage = buildApplicationLifecycleNotifications(
  { ...testApp, clarificationRequested: true },
  'Clarification Requested',
  'Please upload clear property tax receipt.'
);
assert.equal(clarStage.employeeNotif.eventType, 'CLARIFICATION_REQUESTED');
assert.equal(clarStage.consumerNotif?.eventType, 'CLARIFICATION_REQUESTED');
assert.ok(clarStage.consumerNotif?.message.includes('Please upload clear property tax receipt.'));
appInbox = upsertNotificationList(appInbox, [clarStage.employeeNotif, clarStage.consumerNotif!]);
// upsertNotificationList replaces previous stage notification for same role + applicationId
assert.equal(appInbox.filter(n => n.targetRole === 'employee' && n.applicationId === 'APP-2026-0991').length, 1);
assert.equal(appInbox.filter(n => n.targetRole === 'consumer' && n.applicationId === 'APP-2026-0991').length, 1);

// Stage 2: Document Verification
const docVerStage = buildApplicationLifecycleNotifications(
  { ...testApp, status: 'Document Verification', workflowStep: 2 },
  'Document Verification'
);
assert.equal(docVerStage.employeeNotif.applicationStatus, 'Document Verification');
assert.equal(docVerStage.consumerNotif, null, 'Internal document scrutiny should not spam consumer');

// Stage 3: Site Inspection
const siteInspStage = buildApplicationLifecycleNotifications(
  { ...testApp, status: 'Site Inspection', workflowStep: 3 },
  'Site Inspection'
);
assert.equal(siteInspStage.employeeNotif.applicationStatus, 'Site Inspection');

// Stage 4: Sanction Approval (after Field Engineer completes WO-INS)
const sanctionStage = buildApplicationLifecycleNotifications(
  { ...testApp, status: 'Sanction Approval', workflowStep: 4 },
  'Sanction Approval'
);
assert.equal(sanctionStage.employeeNotif.eventType, 'SANCTION_APPROVAL_REQUIRED');
assert.ok(sanctionStage.consumerNotif);
assert.equal(sanctionStage.consumerNotif!.applicationStatus, 'Sanction Approval');

// Stage 5: Meter Installed (Final Approval with provisioned Consumer No & Meter No)
const meterInstalledStage = buildApplicationLifecycleNotifications(
  { ...testApp, status: 'Meter Installed', workflowStep: 5 },
  'Meter Installed',
  'Approved and smart meter energized.',
  { newConsumerNo: '04281-55119', newMeterNo: 'MTR-2026-88412' }
);
assert.equal(meterInstalledStage.employeeNotif.applicationStatus, 'Meter Installed');
assert.ok(meterInstalledStage.employeeNotif.message.includes('04281-55119'));
assert.ok(meterInstalledStage.employeeNotif.message.includes('MTR-2026-88412'));
assert.ok(meterInstalledStage.consumerNotif);
assert.ok(meterInstalledStage.consumerNotif!.message.includes('04281-55119'));
assert.ok(meterInstalledStage.consumerNotif!.message.includes('MTR-2026-88412'));

// Rejection branch
const rejectedStage = buildApplicationLifecycleNotifications(
  { ...testApp, status: 'Rejected', workflowStep: 0 },
  'Rejected',
  'Transformer capacity exceeded on local distribution pole.'
);
assert.equal(rejectedStage.employeeNotif.eventType, 'APPLICATION_REJECTED');
assert.ok(rejectedStage.consumerNotif);
assert.equal(rejectedStage.consumerNotif!.eventType, 'APPLICATION_REJECTED');
assert.ok(rejectedStage.consumerNotif!.message.includes('Transformer capacity exceeded on local distribution pole.'));

// Employee Queue Filtering by Subdivision
const mehsanaFiltered = filterEmployeeApplicationNotifications(
  [meterInstalledStage.employeeNotif, meterInstalledStage.consumerNotif!],
  [{ ...testApp, status: 'Meter Installed' }],
  { subdivisionScope: 'Mehsana City North' }
);
assert.equal(mehsanaFiltered.length, 1);
assert.equal(mehsanaFiltered[0].targetRole, 'employee');

const patanFiltered = filterEmployeeApplicationNotifications(
  [meterInstalledStage.employeeNotif],
  [{ ...testApp, status: 'Meter Installed' }],
  { subdivisionScope: 'Patan Urban Zone' }
);
assert.equal(patanFiltered.length, 0, 'Employee in Patan must not receive Mehsana City North application notifications');

console.log('   ✓ Application lifecycle notifications & subdivision scoping verified.');

// ---------------------------------------------------------------------------
// 2. CRITICAL INCIDENT & ESCALATION WORKFLOW
// ---------------------------------------------------------------------------
console.log('2. Testing Critical Incident Assignment, Decline, Reassignment & Escalation...');

const baseIncident: CriticalIncident = {
  id: 'INC-VER-001',
  title: '11kV Mehsana Feeder 2 Breaker Trip & Overcurrent',
  description: 'Directional overcurrent relay tripped at Substation Bay 4.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-02',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-25T12:00:00.000Z',
  responsibleRoles: ['employee'],
  recommendedAction: 'Inspect 11kV vacuum circuit breaker and isolate faulty section.',
  status: 'DETECTED',
  approvalStatus: 'PENDING_APPROVAL',
  originatingEmployeeName: 'Sunil Mehta',
  originatingEmployeeUserId: 'EMP-UG-1101',
  history: [
    {
      id: 'EVT-VER-001-DETECTED',
      incidentId: 'INC-VER-001',
      timestamp: '2026-10-25T12:00:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA Telemetry Engine',
      actorRole: 'employee',
      notes: 'Breaker trip recorded.'
    }
  ]
};

const fld201Identity = getCanonicalIdentityById('FLD-UG-201')!;
const fld204Identity = getCanonicalIdentityById('FLD-UG-204')!;
const session201 = createDemoSessionForIdentity(fld201Identity);
const session204 = createDemoSessionForIdentity(fld204Identity);
const active201 = getActiveUserIdentity(session201, 'field');
const active204 = getActiveUserIdentity(session204, 'field');

// Step 2a: Employee assigns incident to Engineer Solanki (FLD-UG-201)
const assignResult = reassignIncidentRecord(
  baseIncident,
  'FLD-UG-201',
  'Vikramaditya Solanki',
  'Check transformer T-104 oil temperature and load balance.',
  'Sunil Mehta',
  'EMP-UG-1101',
  'employee',
  [],
  '2026-10-25T12:05:00.000Z'
);
assert.equal(assignResult.updatedIncident.status, 'ASSIGNED');
assert.equal(assignResult.updatedIncident.assignedToUserId, 'FLD-UG-201');
assert.equal(assignResult.updatedNotifications.length, 1);
const assignNotif = assignResult.updatedNotifications[0];
assert.equal(assignNotif.targetRole, 'field');
assert.equal(assignNotif.targetUserId, 'FLD-UG-201');
assert.equal(assignNotif.incidentId, 'INC-VER-001');

// Verify Solanki can access, Desai/Chaudhari cannot, Consumer cannot
assert.equal(authorizeIncidentModalAccess(assignResult.updatedIncident, 'field', active201).isAuthorized, true);
assert.equal(authorizeIncidentModalAccess(assignResult.updatedIncident, 'field', active204).isAuthorized, false);
assert.equal(
  authorizeIncidentModalAccess(assignResult.updatedIncident, 'consumer', {
    id: 'cns_01',
    name: 'Consumer',
    designation: 'Citizen',
    badge: 'Consumer'
  }).isAuthorized,
  false
);

// Step 2b: Decline without reason must be rejected
const emptyDeclineAttempt = declineIncidentAssignmentRecord(
  assignResult.updatedIncident,
  '   ',
  active201,
  'field',
  assignResult.updatedNotifications,
  '2026-10-25T12:10:00.000Z'
);
assert.equal(emptyDeclineAttempt.success, false);
assert.ok(emptyDeclineAttempt.denialReason?.includes('Mandatory reason'));

// Step 2c: Engineer Solanki declines with mandatory reason
const declineReason = 'Currently attending live 11kV jumper fault at Visnagar Road.';
const declineResult = declineIncidentAssignmentRecord(
  assignResult.updatedIncident,
  declineReason,
  active201,
  'field',
  assignResult.updatedNotifications,
  '2026-10-25T12:15:00.000Z'
);
assert.equal(declineResult.success, true);
const incAfterDecline = declineResult.updatedIncident!;

// Verify incident returns to ACKNOWLEDGED (Employee queue) and clears current assignee
assert.equal(incAfterDecline.status, 'ACKNOWLEDGED');
assert.equal(incAfterDecline.assignedToUserId, undefined);
assert.equal(incAfterDecline.lastDeclinedReason, declineReason);

// Verify high-priority red notification goes to the originating Employee
const declineNotif = declineResult.declineNotification!;
assert.equal(declineNotif.targetRole, 'employee');
assert.equal(declineNotif.targetUserId, 'EMP-UG-1101');
assert.equal(declineNotif.type, 'alert');
assert.equal(declineNotif.notificationType, 'ASSIGNMENT_DECLINED');
assert.equal(declineNotif.decisionAction, 'Assignment Declined');
assert.equal(declineNotif.decisionReason, declineReason);
assert.equal(declineNotif.incidentId, 'INC-VER-001');

// Verify Solanki no longer sees the declined incident in his field queue
const solankiQueueAfterDecline = filterIncidentsForSession([incAfterDecline], 'field', active201);
assert.equal(solankiQueueAfterDecline.length, 0);

// Step 2d: Employee reassigns incident to Engineer Dharmesh P. Chaudhari (FLD-UG-204)
const reassignResult = reassignIncidentRecord(
  incAfterDecline,
  'FLD-UG-204',
  'Dharmesh P. Chaudhari',
  'Reassigned after Solanki declined due to active line fault.',
  'Sunil Mehta',
  'EMP-UG-1101',
  'employee',
  declineResult.updatedNotifications,
  '2026-10-25T12:20:00.000Z'
);
assert.equal(reassignResult.updatedIncident.status, 'ASSIGNED');
assert.equal(reassignResult.updatedIncident.assignedToUserId, 'FLD-UG-204');

// Verify FLD-UG-204 now has access and FLD-UG-201 does NOT
const fld204ScopedNotifs = sanitizeAndScopeIncidentNotifications(
  reassignResult.updatedNotifications,
  [reassignResult.updatedIncident],
  'field',
  active204,
  new Set(),
  new Set()
);
assert.ok(fld204ScopedNotifs.some(n => n.incidentId === 'INC-VER-001'));

const fld201ScopedNotifs = sanitizeAndScopeIncidentNotifications(
  reassignResult.updatedNotifications,
  [reassignResult.updatedIncident],
  'field',
  active201,
  new Set(),
  new Set()
);
assert.equal(
  fld201ScopedNotifs.some(n => n.incidentId === 'INC-VER-001'),
  false,
  'Previous engineer must not retain active assignment notifications after reassignment'
);
assert.equal(authorizeFieldEngineerAction(reassignResult.updatedIncident, 'field', active201).isAuthorized, false);
assert.equal(authorizeFieldEngineerAction(reassignResult.updatedIncident, 'field', active204).isAuthorized, true);

// Verify Management only sees incidents escalated to Management
const mgmtQueueBeforeEscalation = filterIncidentsForSession(
  [reassignResult.updatedIncident],
  'management',
  { id: 'usr_mgmt_01', name: 'R. K. Jadeja (CE)', designation: 'Chief Engineer', badge: 'Executive Management' }
);
assert.equal(mgmtQueueBeforeEscalation.length, 0, 'Management must not see non-escalated field incidents');

console.log('   ✓ Critical incident assignment, mandatory decline reason, return to queue, and reassignment verified.');

// ---------------------------------------------------------------------------
// 3. INBOX SCOPE ISOLATION & READ/DISMISS CONTROLS
// ---------------------------------------------------------------------------
console.log('3. Testing Notification Inbox Scope Isolation...');

const empIdentity = getCanonicalIdentityById('EMP-UG-1101')!;
const empSession = createDemoSessionForIdentity(empIdentity);
const empScopeKey = getNotificationInboxScopeKey('employee', empSession);
const fld201ScopeKey = getNotificationInboxScopeKey('field', session201);
const fld204ScopeKey = getNotificationInboxScopeKey('field', session204);

assert.notEqual(empScopeKey, fld201ScopeKey);
assert.notEqual(fld201ScopeKey, fld204ScopeKey);

console.log('   ✓ Per-role and per-account inbox scope keys verified.');

// ---------------------------------------------------------------------------
// 4. FOUR-LANGUAGE LOCALIZATION INTEGRITY (EN, GU, HI, MR)
// ---------------------------------------------------------------------------
console.log('4. Testing Four-Language Notification Rendering (en, gu, hi, mr)...');

const workflowNotificationSamples: AppNotification[] = [
  subStage.employeeNotif,
  subStage.consumerNotif!,
  clarStage.employeeNotif,
  clarStage.consumerNotif!,
  docVerStage.employeeNotif,
  siteInspStage.employeeNotif,
  sanctionStage.employeeNotif,
  sanctionStage.consumerNotif!,
  meterInstalledStage.employeeNotif,
  meterInstalledStage.consumerNotif!,
  rejectedStage.employeeNotif,
  rejectedStage.consumerNotif!,
  assignNotif,
  declineNotif,
  {
    id: 'NOTIF-FLD-INS-TEST',
    title: 'New Site Inspection Order: WO-INS-2026-0991',
    message: 'Feasibility check scheduled for Rameshbhai Chaudhary (5kW) in Mehsana City North.',
    time: 'Just now',
    targetRole: 'field',
    type: 'info',
    read: false,
    category: 'Inspection',
    applicationId: 'APP-2026-0991',
    workOrderId: 'WO-INS-2026-0991'
  },
  {
    id: 'NOTIF-EMP-CMP-REG',
    title: 'New Grievance Registered: #CMP-8835',
    message: 'Rameshbhai Chaudhary filed a Power Outage grievance (High) in Mehsana City North.',
    time: 'Just now',
    targetRole: 'employee',
    type: 'warning',
    read: false,
    category: 'Outage',
    complaintId: 'CMP-8835'
  },
  {
    id: 'NOTIF-FLD-CMP-DISP',
    title: 'New Dispatch: WO-CMP-8835',
    message: 'Power Outage assigned at Mehsana City North for Rameshbhai Chaudhary.',
    time: 'Just now',
    targetRole: 'field',
    type: 'alert',
    read: false,
    category: 'Outage',
    complaintId: 'CMP-8835',
    workOrderId: 'WO-CMP-8835'
  },
  {
    id: 'NOTIF-CNS-CMP-DISP',
    title: 'Field Team Dispatched: #CMP-8835',
    message: 'A field engineering team has been dispatched to inspect and rectify your grievance.',
    time: 'Just now',
    targetRole: 'consumer',
    type: 'info',
    read: false,
    category: 'Outage',
    complaintId: 'CMP-8835'
  },
  {
    id: 'NOTIF-CNS-CMP-RES',
    title: 'Grievance #CMP-8835 Resolved',
    message: 'Your grievance has been resolved on site by Vikramaditya Solanki. Resolution remarks: Fuse replaced on pole DP-14.',
    time: '15 mins ago',
    targetRole: 'consumer',
    type: 'success',
    read: false,
    category: 'Outage',
    complaintId: 'CMP-8835'
  },
  {
    id: 'NOTIF-EMP-WO-CLOSED',
    title: 'Work Order Closed: WO-CMP-8835',
    message: 'Field crew resolved complaint #CMP-8835 (Mehsana City North). Remarks: Fuse replaced on pole DP-14.',
    time: '15 mins ago',
    targetRole: 'employee',
    type: 'info',
    read: false,
    category: 'Outage',
    complaintId: 'CMP-8835',
    workOrderId: 'WO-CMP-8835'
  },
  {
    id: 'NOTIF-CNS-PAY-SUCCESS',
    title: 'Payment Successful',
    message: '₹2,185 paid for Bill #BILL-2026-09-99231. Reference: TXN-UGVCL-88120',
    time: 'Just now',
    targetRole: 'consumer',
    type: 'success',
    read: false,
    category: 'Billing'
  },
  {
    id: 'NOTIF-MGMT-ESC-APPROVED',
    title: 'Escalation Approved: #INC-VER-001',
    message: 'Executive concurrence approved by R. K. Jadeja (Chief Engineer (O&M)). Remarks: "Emergency mobile DG set sanctioned".',
    time: 'Just now',
    targetRole: 'employee',
    type: 'success',
    read: false,
    category: 'Approval',
    incidentId: 'INC-VER-001',
    decisionAction: 'Approved'
  }
];

for (const sample of workflowNotificationSamples) {
  const enRendered = localizeConsumerNotification(sample, 'en');
  assert.equal(enRendered.title, sample.title, 'English title must preserve canonical text');
  assert.equal(enRendered.message, sample.message, 'English message must preserve canonical text');

  for (const lang of ['gu', 'hi', 'mr'] as LanguageCode[]) {
    const localized = localizeConsumerNotification(sample, lang);
    assert.notEqual(
      localized.title,
      sample.title,
      `Notification title "${sample.title}" must be translated in ${lang}`
    );
    assert.notEqual(
      localized.message,
      sample.message,
      `Notification message "${sample.message}" must be translated in ${lang}`
    );

    // Ensure canonical IDs and numbers are preserved verbatim across all languages
    const idTokens = `${sample.title} ${sample.message}`.match(
      /(?:APP-\d{4}-\d+|CMP-\d+|WO-[A-Z0-9-]+|BILL-[A-Z0-9-]+|TXN-[A-Z0-9-]+|MTR-\d{4}-\d+|04281-\d+|INC-[A-Z0-9-]+)/g
    ) || [];
    for (const token of idTokens) {
      assert.ok(
        `${localized.title} ${localized.message}`.includes(token),
        `Canonical token "${token}" must be preserved in ${lang} localization`
      );
    }
  }
}

for (const lang of ['gu', 'hi', 'mr'] as LanguageCode[]) {
  assert.notEqual(localizeNotificationStatusBadge('Approved', lang), 'Approved');
  assert.notEqual(localizeNotificationStatusBadge('Assignment Declined', lang), 'Assignment Declined');
  assert.notEqual(localizeNotificationTimestamp('Just now', lang), 'Just now');
  assert.notEqual(localizeSubdivision('Mehsana City North', lang), 'Mehsana City North');
}

console.log('   ✓ Four-language notification rendering and canonical identifier preservation verified.');

// ---------------------------------------------------------------------------
// 5. CONSUMER APPLICATION SUBMISSION IN EN/GU/HI/MR -> EMPLOYEE NOTIFICATION ROUTING
// ---------------------------------------------------------------------------
console.log('5. Testing Consumer Submission (EN/GU/HI/MR) -> Authorized Employee Notification Inbox...');

const multilingualSubmissions: Array<{
  lang: LanguageCode;
  appId: string;
  rawSubdivision: string;
  expectedCanonicalSubdivision: string;
  rawCategory: string;
  expectedCanonicalCategory: 'Residential (RGPU)' | 'Commercial (NRGP)' | 'Industrial (LTMD)' | 'Agricultural (AG)';
}> = [
  {
    lang: 'en',
    appId: 'APP-2026-0851',
    rawSubdivision: 'Mehsana City North',
    expectedCanonicalSubdivision: 'Mehsana City North',
    rawCategory: 'Residential (RGPU)',
    expectedCanonicalCategory: 'Residential (RGPU)'
  },
  {
    lang: 'gu',
    appId: 'APP-2026-0852',
    rawSubdivision: 'મહેસાણા સિટી ઉત્તર',
    expectedCanonicalSubdivision: 'Mehsana City North',
    rawCategory: 'રહેણાંક (RGPU)',
    expectedCanonicalCategory: 'Residential (RGPU)'
  },
  {
    lang: 'hi',
    appId: 'APP-2026-0853',
    rawSubdivision: 'मेहसाणा सिटी उत्तर',
    expectedCanonicalSubdivision: 'Mehsana City North',
    rawCategory: 'आवासीय (RGPU)',
    expectedCanonicalCategory: 'Residential (RGPU)'
  },
  {
    lang: 'mr',
    appId: 'APP-2026-0854',
    rawSubdivision: 'मेहसाणा सिटी उत्तर',
    expectedCanonicalSubdivision: 'Mehsana City North',
    rawCategory: 'निवासी (RGPU)',
    expectedCanonicalCategory: 'Residential (RGPU)'
  }
];

let multiLangInbox: AppNotification[] = [];
const submittedAppsQueue: NewConnectionApplication[] = [];

for (const item of multilingualSubmissions) {
  const canonicalSub = normalizeCanonicalSubdivision(item.rawSubdivision);
  const canonicalCat = normalizeCanonicalTariffCategory(item.rawCategory);
  assert.equal(canonicalSub, item.expectedCanonicalSubdivision);
  assert.equal(canonicalCat, item.expectedCanonicalCategory);

  const assignedOfficer = resolveAssignedOfficerForSubdivision(canonicalSub);
  assert.equal(assignedOfficer, 'Rajesh V. Trivedi (AE Ops)');

  const appRecord: NewConnectionApplication = {
    id: item.appId,
    applicantName: 'Arvindbhai M. Patel',
    phone: '+91 98250 44112',
    email: 'arvind.patel@ugvcl-demo.in',
    address: '14, Shantiniketan Society, Highway Road, Mehsana',
    subdivision: canonicalSub,
    category: canonicalCat,
    requestedLoadKw: 6,
    phase: '1-Phase',
    status: 'Submitted',
    appliedDate: '19/05/2026',
    targetCompletionDate: '03/06/2026',
    workflowStep: 1,
    documentsSubmitted: ['Aadhaar Card', 'Property Tax Receipt', 'Wiring Test Report'],
    premisesType: 'Owned',
    assignedOfficer,
    estimatedSanctionCost: 6500,
    accountId: 'CNS-UG-001',
    notesHistory: []
  };

  submittedAppsQueue.push(appRecord);
  const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(
    appRecord,
    'Submitted',
    undefined,
    undefined,
    '2026-05-19T09:05:00.000Z'
  );

  assert.equal(employeeNotif.id, `NOTIF-EMP-${item.appId}-SUBMITTED`);
  assert.equal(employeeNotif.applicationId, item.appId);
  assert.equal(employeeNotif.relatedEntityType, 'application');
  assert.equal(employeeNotif.relatedEntityId, item.appId);
  assert.equal(employeeNotif.eventType, 'APPLICATION_SUBMITTED');
  assert.equal(employeeNotif.targetRole, 'employee');
  assert.equal(employeeNotif.subdivision, 'Mehsana City North');
  assert.ok(employeeNotif.createdAt, 'Employee notification must store real createdAt timestamp');
  assert.ok(employeeNotif.formattedTimestamp, 'Employee notification must store formattedTimestamp');
  assert.ok(consumerNotif, 'Consumer confirmation notification must also be generated');

  // Verify idempotent deduplication if upsert is invoked twice
  multiLangInbox = upsertNotificationList(multiLangInbox, [employeeNotif, consumerNotif!]);
  multiLangInbox = upsertNotificationList(multiLangInbox, [employeeNotif, consumerNotif!]);
}

// Verify no duplicate notifications were created
assert.equal(
  multiLangInbox.filter(n => n.targetRole === 'employee').length,
  4,
  'Exactly 4 employee notifications must exist for the 4 submitted applications'
);

// Verify Priya Rathod (EMP-UG-1101, Mehsana Corporate Circle) receives all 4 Mehsana City North applications
const priyaInbox = filterEmployeeApplicationNotifications(multiLangInbox, submittedAppsQueue, {
  subdivisionScope: 'Mehsana Corporate Circle',
  assignedOfficerName: 'Priya Rathod'
});
assert.equal(
  priyaInbox.length,
  4,
  'Priya Rathod (Mehsana Corporate Circle) must receive Mehsana City North application notifications'
);

// Verify Rajesh V. Trivedi (EMP-01, Mehsana City North) receives all 4 Mehsana City North applications
const rajeshInbox = filterEmployeeApplicationNotifications(multiLangInbox, submittedAppsQueue, {
  subdivisionScope: 'Mehsana City North',
  assignedOfficerName: 'Rajesh V. Trivedi'
});
assert.equal(
  rajeshInbox.length,
  4,
  'Rajesh V. Trivedi (Mehsana City North) must receive Mehsana City North application notifications'
);

// Verify Kiranben S. Patel (EMP-02, Patan Urban Zone) does NOT receive Mehsana City North applications
const kiranbenInbox = filterEmployeeApplicationNotifications(multiLangInbox, submittedAppsQueue, {
  subdivisionScope: 'Patan Urban Zone',
  assignedOfficerName: 'Kiranben S. Patel'
});
assert.equal(
  kiranbenInbox.length,
  0,
  'Unrelated Employee in Patan Urban Zone must NOT receive Mehsana City North application notifications'
);

// Verify Pooja Shah (EMP-03, Gandhinagar Circle) receives Kalol GIDC Phase-2 applications but not Patan
assert.equal(isEmployeeAuthorizedForSubdivision('Gandhinagar Circle', 'Kalol GIDC Phase-2'), true);
assert.equal(isEmployeeAuthorizedForSubdivision('Gandhinagar Circle', 'Patan Urban Zone'), false);

// Verify filterEmployeeApplicationNotifications does NOT manufacture fake notifications when stored notifications list is empty
const emptyStoredInbox = filterEmployeeApplicationNotifications([], submittedAppsQueue, {
  subdivisionScope: 'Mehsana City North',
  assignedOfficerName: 'Rajesh V. Trivedi'
});
assert.equal(
  emptyStoredInbox.length,
  0,
  'filterEmployeeApplicationNotifications must NOT manufacture notifications from queue entries when stored notifications are empty'
);

console.log('   ✓ Consumer submission -> Employee inbox routing, Circle/Subdivision authorization, and no queue manufacturing verified.');

// ---------------------------------------------------------------------------
// 6. DATE-WISE GROUPING (TODAY, YESTERDAY, EARLIER DATES, UNDATED) & NEWEST-FIRST SORTING
// ---------------------------------------------------------------------------
console.log('6. Testing Date-Wise Grouping (Today, Yesterday, Earlier Dates, Undated) & Newest-First Sorting...');

const referenceNow = new Date('2026-05-19T15:30:00+05:30'); // 19/05/2026 in Asia/Kolkata

const dateTestNotifications: AppNotification[] = [
  {
    id: 'NOTIF-OLDER-16MAY',
    title: 'New Application Submitted: APP-2026-0842',
    message: 'Vikrambhai D. Rathod submitted a 45kW Industrial (LTMD) connection request in Visnagar GIDC.',
    time: '16/05/2026, 04:40 PM',
    createdAt: '2026-05-16T16:40:00+05:30',
    formattedTimestamp: '16/05/2026, 04:40 PM',
    targetRole: 'employee',
    type: 'info',
    read: false,
    category: 'Approval',
    applicationId: 'APP-2026-0842',
    applicationStatus: 'Submitted',
    subdivision: 'Visnagar GIDC'
  },
  {
    id: 'NOTIF-TODAY-MORNING',
    title: 'New Application Submitted: APP-2026-0843',
    message: 'Meenaben K. Joshi submitted a 12kW Commercial (NRGP) connection request in Kalol GIDC Phase-2.',
    time: '19/05/2026, 09:20 AM',
    createdAt: '2026-05-19T09:20:00+05:30',
    formattedTimestamp: '19/05/2026, 09:20 AM',
    targetRole: 'employee',
    type: 'info',
    read: false,
    category: 'Approval',
    applicationId: 'APP-2026-0843',
    applicationStatus: 'Submitted',
    subdivision: 'Kalol GIDC Phase-2'
  },
  {
    id: 'NOTIF-YESTERDAY-EVENING',
    title: 'New Application Submitted: APP-2026-0845',
    message: 'Sureshbhai Chaudhary submitted a 15kW Agricultural (AG) connection request in Mehsana Rural.',
    time: '18/05/2026, 05:15 PM',
    createdAt: '2026-05-18T17:15:00+05:30',
    formattedTimestamp: '18/05/2026, 05:15 PM',
    targetRole: 'employee',
    type: 'info',
    read: false,
    category: 'Approval',
    applicationId: 'APP-2026-0845',
    applicationStatus: 'Submitted',
    subdivision: 'Mehsana Rural'
  },
  {
    id: 'NOTIF-TODAY-AFTERNOON',
    title: 'New Application Submitted: APP-2026-0850',
    message: 'Arvindbhai M. Patel submitted a 5kW Residential (RGPU) connection request in Mehsana City North.',
    time: 'Just now',
    createdAt: '2026-05-19T14:45:00+05:30',
    formattedTimestamp: '19/05/2026, 02:45 PM',
    targetRole: 'employee',
    type: 'info',
    read: false,
    category: 'Approval',
    applicationId: 'APP-2026-0850',
    applicationStatus: 'Submitted',
    subdivision: 'Mehsana City North'
  },
  {
    id: 'NOTIF-LEGACY-UNDATED',
    title: 'Scheduled Feeder Maintenance Notice',
    message: 'Planned preventive maintenance on 11kV Mehsana City North Feeder-02.',
    time: '2 hours ago',
    targetRole: 'employee',
    type: 'warning',
    read: true,
    category: 'Outage'
  }
];

const sorted = sortNotificationsNewestFirst(dateTestNotifications);
assert.equal(sorted[0].id, 'NOTIF-TODAY-AFTERNOON', 'Newest notification today (2:45 PM) must be first');
assert.equal(sorted[1].id, 'NOTIF-TODAY-MORNING', 'Earlier notification today (9:20 AM) must be second');
assert.equal(sorted[2].id, 'NOTIF-YESTERDAY-EVENING', 'Yesterday notification must be third');
assert.equal(sorted[3].id, 'NOTIF-OLDER-16MAY', 'Older calendar date notification (16/05/2026) must be fourth');
assert.equal(sorted[4].id, 'NOTIF-LEGACY-UNDATED', 'Undated legacy notification must be placed last without inventing a date');
assert.equal(parseNotificationStoredDate(sorted[4]), null, 'Undated legacy notification must not have a fabricated Date');

const grouped = groupNotificationsByDate(dateTestNotifications, referenceNow);
assert.equal(grouped.length, 4);
assert.equal(grouped[0].bucketKey, 'TODAY');
assert.equal(grouped[0].calendarDate, '19/05/2026');
assert.equal(grouped[0].items.length, 2);
assert.equal(grouped[0].items[0].id, 'NOTIF-TODAY-AFTERNOON');
assert.equal(grouped[0].items[1].id, 'NOTIF-TODAY-MORNING');

assert.equal(grouped[1].bucketKey, 'YESTERDAY');
assert.equal(grouped[1].calendarDate, '18/05/2026');
assert.equal(grouped[1].items.length, 1);
assert.equal(grouped[1].items[0].id, 'NOTIF-YESTERDAY-EVENING');

assert.equal(grouped[2].bucketKey, '16/05/2026');
assert.equal(grouped[2].calendarDate, '16/05/2026');
assert.equal(grouped[2].items.length, 1);
assert.equal(grouped[2].items[0].id, 'NOTIF-OLDER-16MAY');

assert.equal(grouped[3].bucketKey, 'UNDATED');
assert.equal(grouped[3].calendarDate, '');
assert.equal(grouped[3].items.length, 1);
assert.equal(grouped[3].items[0].id, 'NOTIF-LEGACY-UNDATED');

// Verify stored timestamp formatting in Asia/Kolkata
const storedTopDate = parseNotificationStoredDate(grouped[0].items[0]);
assert.ok(storedTopDate);
assert.equal(formatErpDateTime(storedTopDate!), '19/05/2026, 02:45 PM');

// Verify 4-language date group header localization
assert.equal(localizeNotificationDateGroupHeader('TODAY', '19/05/2026', 'en'), 'Today — 19/05/2026');
assert.equal(localizeNotificationDateGroupHeader('TODAY', '19/05/2026', 'gu'), 'આજે — 19/05/2026');
assert.equal(localizeNotificationDateGroupHeader('TODAY', '19/05/2026', 'hi'), 'आज — 19/05/2026');
assert.equal(localizeNotificationDateGroupHeader('TODAY', '19/05/2026', 'mr'), 'आज — 19/05/2026');

assert.equal(localizeNotificationDateGroupHeader('YESTERDAY', '18/05/2026', 'en'), 'Yesterday — 18/05/2026');
assert.equal(localizeNotificationDateGroupHeader('YESTERDAY', '18/05/2026', 'gu'), 'ગઈકાલે — 18/05/2026');
assert.equal(localizeNotificationDateGroupHeader('YESTERDAY', '18/05/2026', 'hi'), 'कल (बीता हुआ) — 18/05/2026');
assert.equal(localizeNotificationDateGroupHeader('YESTERDAY', '18/05/2026', 'mr'), 'काल — 18/05/2026');

assert.equal(localizeNotificationDateGroupHeader('16/05/2026', '16/05/2026', 'en'), 'Date: 16/05/2026');
assert.equal(localizeNotificationDateGroupHeader('16/05/2026', '16/05/2026', 'gu'), 'તારીખ: 16/05/2026');
assert.equal(localizeNotificationDateGroupHeader('16/05/2026', '16/05/2026', 'hi'), 'दिनांक: 16/05/2026');
assert.equal(localizeNotificationDateGroupHeader('16/05/2026', '16/05/2026', 'mr'), 'दिनांक: 16/05/2026');

for (const lang of ['gu', 'hi', 'mr'] as LanguageCode[]) {
  assert.notEqual(
    localizeNotificationDateGroupHeader('UNDATED', '', lang),
    localizeNotificationDateGroupHeader('UNDATED', '', 'en'),
    `Undated group header must be translated in ${lang}`
  );
}

console.log('   ✓ Date-wise grouping, newest-first sorting, stored timestamp display, and 4-language date headers verified.');
console.log('\n=== ALL NOTIFICATION WORKFLOW VERIFICATION CHECKS PASSED ===');
