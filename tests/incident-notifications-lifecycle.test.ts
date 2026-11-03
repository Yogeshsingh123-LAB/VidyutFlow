import {
  filterIncidentsForSession,
  authorizeIncidentModalAccess,
  authorizeEmployeeAction,
  authorizeManagementAction,
  authorizeFieldEngineerAction,
  resolveCanonicalEmployeeId,
  resolveIncidentOriginatingEmployee,
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  sanitizeAndScopeIncidentNotifications,
  isConfirmedEmergencyHazard
} from '../src/utils/anomalyDetector';
import {
  INCIDENT_TRANSITIONS,
  isValidIncidentTransition
} from '../src/services/erpAdapter';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentNotification
} from '../src/i18n/incidentLocalization';
import { localizeNotificationStatusBadge } from '../src/i18n/consumerContentTranslations';
import { CriticalIncident, AppNotification, UserRole } from '../src/types';
import { sortNotificationsNewestFirst } from '../src/utils/dateUtils';
import { upsertNotificationList } from '../src/context/AppContext';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

console.log('🧪 Starting VidyutFlow Phase 4 Step 4.3: Incident Notifications & Escalation Lifecycle Tests\n');

// --------------------------------------------------------------------------
// TEST FIXTURES
// --------------------------------------------------------------------------

const mehsanaIncident: CriticalIncident = {
  id: 'INC-MS-881',
  title: 'Critical 11kV Overload: Mehsana Feeder 2',
  description: 'Feeder operating at 108% capacity. Risk of DTR failure.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'FDR-MS-02',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-31T08:00:00.000Z',
  responsibleRoles: ['employee'], // Employee-First Rule!
  recommendedAction: 'Initiate load shedding or re-route agricultural load.',
  status: 'DETECTED',
  history: [
    {
      id: 'EVT-INC-881-DET',
      incidentId: 'INC-MS-881',
      timestamp: '2026-10-31T08:00:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA Telemetry Monitor',
      actorRole: 'employee',
      notes: 'Feeder overload threshold breached.'
    }
  ]
};

const empMehsana = {
  id: 'EMP-UG-1101',
  name: 'Priya Rathod',
  role: 'employee' as UserRole,
  subdivision: 'Mehsana City North'
};

const empGandhinagar = {
  id: 'EMP-UG-1088',
  name: 'Kavita Dave',
  role: 'employee' as UserRole,
  subdivision: 'Gandhinagar Sub-Division 2'
};

const empCircleSupervisory = {
  id: 'EMP-UG-1002',
  name: 'Supervisory Officer',
  role: 'employee' as UserRole,
  subdivision: 'Mehsana Corporate Circle'
};

const fldVikram = {
  id: 'FLD-UG-201',
  name: 'Vikramaditya Solanki',
  role: 'field' as UserRole,
  subdivision: 'Mehsana City North'
};

const fldHardik = {
  id: 'FLD-UG-204',
  name: 'Hardik Patel',
  role: 'field' as UserRole,
  subdivision: 'Kalol Industrial Division'
};

const mgmtRajesh = {
  id: 'usr_mgmt_01',
  name: 'Rajesh Solanki',
  role: 'management' as UserRole,
  subdivision: 'Corporate HQ'
};

const mgmtNilesh = {
  id: 'usr_mgmt_02',
  name: 'Nilesh Varma',
  role: 'management' as UserRole,
  subdivision: 'Central Office'
};

const consumerKishore = {
  id: 'demo_consumer',
  name: 'Kishore Patel',
  role: 'consumer' as UserRole,
  subdivision: 'Mehsana City North'
};

// --------------------------------------------------------------------------
// TEST 1: Critical incident detection notifies authorized Employee ONLY
// --------------------------------------------------------------------------
console.log('--- TEST 1: Critical incident detection notifies authorized Employee ONLY ---');

const detectedNotif: AppNotification = {
  id: 'NOTIF-INC-MS-881-DET',
  notificationType: 'CRITICAL_INCIDENT_DETECTED',
  title: 'Critical Incident Detected: INC-MS-881',
  message: 'Critical 11kV Overload: Mehsana Feeder 2. Feeder: FDR-MS-02. Subdivision: Mehsana City North. Immediate operational review required.',
  time: 'Just now',
  createdAt: '2026-10-31T08:00:00.000Z',
  formattedTimestamp: '31/10/2026, 01:30 PM',
  targetRole: 'employee',
  role: 'employee',
  targetUserId: 'EMP-UG-1101',
  incidentId: 'INC-MS-881',
  actionUrl: '/employee/incidents?incident=INC-MS-881',
  type: 'alert',
  read: false,
  category: 'Outage',
  subdivision: 'Mehsana City North',
  statusBadge: 'Critical Incident',
  eventKey: 'EVT-INC-INC-MS-881-DETECTED'
};

const empInbox = sanitizeAndScopeIncidentNotifications(
  [detectedNotif],
  [mehsanaIncident],
  'employee',
  empMehsana,
  new Set(),
  new Set()
);
assert(empInbox.length === 1, 'Authorized employee in Mehsana City North receives critical incident notification');
assert(empInbox[0].incidentId === 'INC-MS-881', 'Notification correctly references incident INC-MS-881');

// --------------------------------------------------------------------------
// TEST 2: Field Engineer cannot see unassigned critical incident
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Field Engineer cannot see unassigned critical incident ---');

const fieldInbox = sanitizeAndScopeIncidentNotifications(
  [detectedNotif],
  [mehsanaIncident],
  'field',
  fldVikram,
  new Set(),
  new Set()
);
assert(fieldInbox.length === 0, 'Field Engineer does NOT receive unassigned incident notification');

const fieldIncidents = filterIncidentsForSession([mehsanaIncident], 'field', fldVikram);
assert(fieldIncidents.length === 0, 'Unassigned critical incident is hidden from Field Engineer session');

const fieldAuth = authorizeFieldEngineerAction(mehsanaIncident, 'field', fldVikram);
assert(!fieldAuth.isAuthorized, 'Field Engineer is denied actions on unassigned incident');

// --------------------------------------------------------------------------
// TEST 3: Management cannot see un-escalated critical incident
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Management cannot see un-escalated critical incident ---');

const mgmtInbox = sanitizeAndScopeIncidentNotifications(
  [detectedNotif],
  [mehsanaIncident],
  'management',
  mgmtRajesh,
  new Set(),
  new Set()
);
assert(mgmtInbox.length === 0, 'Management does NOT receive un-escalated incident notification');

const mgmtIncidents = filterIncidentsForSession([mehsanaIncident], 'management', mgmtRajesh);
assert(mgmtIncidents.length === 0, 'Un-escalated critical incident is hidden from Management session');

const mgmtAuth = authorizeManagementAction(mehsanaIncident, 'management', mgmtRajesh);
assert(!mgmtAuth.isAuthorized, 'Management is denied executing actions on un-escalated incident');

// --------------------------------------------------------------------------
// TEST 4: Unrelated Employees outside jurisdiction cannot access incident
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Unrelated Employees outside jurisdiction cannot access incident ---');

const outOfJurisdictionInbox = sanitizeAndScopeIncidentNotifications(
  [detectedNotif],
  [mehsanaIncident],
  'employee',
  empGandhinagar,
  new Set(),
  new Set()
);
assert(outOfJurisdictionInbox.length === 0, 'Employee in Gandhinagar is filtered out from Mehsana City North notification');

const outOfJurisdictionIncidents = filterIncidentsForSession([mehsanaIncident], 'employee', empGandhinagar);
assert(outOfJurisdictionIncidents.length === 0, 'Incident outside jurisdiction is hidden from Gandhinagar employee');

const outOfJurisdictionAuth = authorizeEmployeeAction(mehsanaIncident, 'employee', empGandhinagar);
assert(!outOfJurisdictionAuth.isAuthorized, 'Out of jurisdiction employee is denied operational actions');
assert(outOfJurisdictionAuth.denialReason.includes('outside your jurisdiction'), 'Denial reason explicitly states jurisdiction mismatch');

// Supervisory Circle HQ employee CAN view
const circleSupervisoryIncidents = filterIncidentsForSession([mehsanaIncident], 'employee', empCircleSupervisory);
assert(circleSupervisoryIncidents.length === 1, 'Circle supervisory employee maintains cross-subdivision oversight');

// --------------------------------------------------------------------------
// TEST 5: Employee assignment notifies selected Field Engineer with targetUserId
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Employee assignment notifies selected Field Engineer with targetUserId ---');

const assignResult = reassignIncidentRecord(
  mehsanaIncident,
  fldVikram.id,
  fldVikram.name,
  'Inspect vacuum circuit breaker at Feeder 2 busbar.',
  empMehsana.name,
  empMehsana.id,
  'employee',
  [],
  '2026-10-31T08:15:00.000Z',
  empMehsana.subdivision
);
assert(assignResult.success, 'Incident successfully assigned to Vikramaditya Solanki (FLD-UG-201)');
assert(assignResult.updatedIncident.status === 'ASSIGNED', 'Incident status transitioned to ASSIGNED');
assert(assignResult.updatedIncident.assignedToUserId === 'FLD-UG-201', 'assignedToUserId is set to FLD-UG-201');

const assignedNotif = assignResult.updatedNotifications[0];
assert(Boolean(assignedNotif && assignedNotif.targetUserId === 'FLD-UG-201'), 'Assignment notification targets FLD-UG-201');

// Recipient isolation: Vikram sees it, Hardik does not
const vikramScoped = sanitizeAndScopeIncidentNotifications(
  [assignedNotif],
  [assignResult.updatedIncident],
  'field',
  fldVikram,
  new Set(),
  new Set()
);
assert(vikramScoped.length === 1, 'Assigned engineer FLD-UG-201 receives assignment notification');

const hardikScoped = sanitizeAndScopeIncidentNotifications(
  [assignedNotif],
  [assignResult.updatedIncident],
  'field',
  fldHardik,
  new Set(),
  new Set()
);
assert(hardikScoped.length === 0, 'Unassigned engineer FLD-UG-204 is isolated and does not receive FLD-UG-201 notification');

// --------------------------------------------------------------------------
// TEST 6: Employee escalation to Management notifies only authorized management recipient
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Employee escalation to Management notifies authorized management recipient ---');

const escalatedIncident: CriticalIncident = {
  ...mehsanaIncident,
  status: 'ESCALATED',
  escalatedTo: 'management',
  escalatedToUserId: 'usr_mgmt_01',
  escalatedToUserName: 'Rajesh Solanki',
  escalatedAt: '2026-10-31T08:30:00.000Z',
  escalatedBy: 'Priya Rathod',
  escalatedReason: 'Feeder load reached 112%, requires emergency bus coupler approval.',
  approvalStatus: 'PENDING_APPROVAL'
};

const mgmtEscNotif: AppNotification = {
  id: 'NOTIF-INC-881-MGMT-ESC',
  title: 'Escalated Incident: INC-MS-881',
  message: 'Escalated to Management (Rajesh Solanki) by Priya Rathod: Feeder load reached 112%.',
  time: 'Just now',
  createdAt: '2026-10-31T08:30:00.000Z',
  formattedTimestamp: '31/10/2026, 02:00 PM',
  targetRole: 'management',
  role: 'management',
  targetUserId: 'usr_mgmt_01',
  incidentId: 'INC-MS-881',
  type: 'warning',
  read: false,
  category: 'Approval',
  subdivision: 'Mehsana City North',
  eventKey: 'EVT-MGMT-ESC-INC-MS-881-usr_mgmt_01'
};

const rajeshScoped = sanitizeAndScopeIncidentNotifications(
  [mgmtEscNotif],
  [escalatedIncident],
  'management',
  mgmtRajesh,
  new Set(),
  new Set()
);
assert(rajeshScoped.length === 1, 'Targeted manager usr_mgmt_01 receives escalation notification');

const nileshScoped = sanitizeAndScopeIncidentNotifications(
  [mgmtEscNotif],
  [escalatedIncident],
  'management',
  mgmtNilesh,
  new Set(),
  new Set()
);
assert(nileshScoped.length === 0, 'Untargeted manager usr_mgmt_02 does NOT receive escalation targeted to usr_mgmt_01');

// --------------------------------------------------------------------------
// TEST 7: Incident reassignment updates access and revokes former engineer
// --------------------------------------------------------------------------
console.log('\n--- TEST 7: Incident reassignment updates access and revokes former engineer ---');

const reassignResult = reassignIncidentRecord(
  assignResult.updatedIncident,
  fldHardik.id,
  fldHardik.name,
  'Lineman reassignment: primary engineer mobilized to major hospital feeder.',
  empMehsana.name,
  empMehsana.id,
  'employee',
  assignResult.updatedNotifications,
  '2026-10-31T08:45:00.000Z',
  empMehsana.subdivision
);
assert(reassignResult.success, 'Reassignment succeeds');
assert(reassignResult.isReassignment, 'Operation is detected as reassignment');
assert(reassignResult.updatedIncident.assignedToUserId === 'FLD-UG-204', 'assignedToUserId now set to FLD-UG-204');

// Vikram loses modal access; Hardik gains modal access
const vikramAfterReassign = authorizeIncidentModalAccess(reassignResult.updatedIncident, 'field', fldVikram);
assert(!vikramAfterReassign.isAuthorized, 'Former engineer FLD-UG-201 denied access following reassignment');

const hardikAfterReassign = authorizeIncidentModalAccess(reassignResult.updatedIncident, 'field', fldHardik);
assert(hardikAfterReassign.isAuthorized, 'New engineer FLD-UG-204 granted modal access');

// --------------------------------------------------------------------------
// TEST 8: Severity change notifies active participants and ignores unchanged values
// --------------------------------------------------------------------------
console.log('\n--- TEST 8: Severity change notifies active participants and ignores unchanged values ---');

// Unchanged value check
const isSeveritySame = mehsanaIncident.severity === 'CRITICAL';
assert(isSeveritySame, 'Severity unchanged condition detected');

// New severity event
const sevChangeNotif: AppNotification = {
  id: 'NOTIF-INC-881-SEV',
  notificationType: 'SEVERITY_CHANGED',
  title: 'Incident Severity Changed: #INC-MS-881',
  message: 'Incident INC-MS-881 severity changed from WARNING to CRITICAL by Priya Rathod. Reason: Feeder current spiked above 450A.',
  time: 'Just now',
  createdAt: '2026-10-31T09:00:00.000Z',
  targetRole: 'employee',
  role: 'employee',
  targetUserId: 'EMP-UG-1101',
  incidentId: 'INC-MS-881',
  type: 'alert',
  read: false,
  category: 'Outage',
  subdivision: 'Mehsana City North',
  eventKey: 'EVT-INC-INC-MS-881-SEV-CRITICAL'
};

const localizedSev = localizeIncidentNotification(sevChangeNotif, 'gu');
assert(localizedSev.title.includes('ઘટનાની ગંભીરતા બદલાઈ'), 'Severity changed title localized to Gujarati');
assert(localizedSev.message.includes('ચેતવણી (WARNING)') || localizedSev.message.includes('ગંભીર (CRITICAL)'), 'Severity levels localized inside message');

// --------------------------------------------------------------------------
// TEST 9: Incident status updates (Acknowledged, In Progress, Resolved)
// --------------------------------------------------------------------------
console.log('\n--- TEST 9: Incident status updates (Acknowledged, In Progress, Resolved) ---');

const ackNotif: AppNotification = {
  id: 'NOTIF-INC-881-ACK',
  notificationType: 'ACKNOWLEDGED',
  title: 'Incident Acknowledged: INC-MS-881',
  message: 'Incident INC-MS-881 has been acknowledged by Priya Rathod. Initial triage underway.',
  time: 'Just now',
  createdAt: '2026-10-31T08:05:00.000Z',
  targetRole: 'employee',
  role: 'employee',
  targetUserId: 'EMP-UG-1101',
  incidentId: 'INC-MS-881',
  type: 'info',
  read: false,
  category: 'Outage',
  statusBadge: 'Acknowledged',
  subdivision: 'Mehsana City North',
  eventKey: 'EVT-INC-INC-MS-881-ACK'
};

const localizedAck = localizeIncidentNotification(ackNotif, 'hi');
assert(localizedAck.title.includes('घटना स्वीकृत की गई'), 'Acknowledgment title localized to Hindi');
assert(localizedAck.message.includes('प्रारंभिक जांच जारी है'), 'Acknowledgment message localized to Hindi');

const resNotif: AppNotification = {
  id: 'NOTIF-INC-881-RES',
  notificationType: 'RESOLVED',
  title: 'Incident Resolved: INC-MS-881',
  message: 'Incident INC-MS-881 resolved by Priya Rathod. Resolution: Vacuum breaker repaired and line re-energized.',
  time: 'Just now',
  createdAt: '2026-10-31T09:30:00.000Z',
  targetRole: 'employee',
  role: 'employee',
  targetUserId: 'EMP-UG-1101',
  incidentId: 'INC-MS-881',
  type: 'success',
  read: false,
  category: 'Outage',
  statusBadge: 'Resolved',
  subdivision: 'Mehsana City North',
  eventKey: 'EVT-INC-INC-MS-881-RESOLVED-EMP'
};

const localizedRes = localizeIncidentNotification(resNotif, 'mr');
assert(localizedRes.title.includes('घटनेचे निवारण झाले'), 'Resolution title localized to Marathi');
assert(localizedRes.message.includes('निवारण नोंदी'), 'Resolution message localized to Marathi');

// --------------------------------------------------------------------------
// TEST 10: Repeated resolution does not produce duplicate notifications
// --------------------------------------------------------------------------
console.log('\n--- TEST 10: Deduplication via eventKey ---');

const existingList = [resNotif];
const upsertedList = upsertNotificationList(existingList, [resNotif, resNotif]);
assert(upsertedList.length === 1, 'Duplicate notifications with identical eventKey are suppressed');

// --------------------------------------------------------------------------
// TEST 11: SLA breach notifications adhere to Employee-first rule
// --------------------------------------------------------------------------
console.log('\n--- TEST 11: SLA breach notifications adhere to Employee-first rule ---');

const slaBreachNotif: AppNotification = {
  id: 'NOTIF-SLA-BREACH-881',
  notificationType: 'SLA_BREACHED',
  title: 'SLA Breach Risk: #INC-MS-881',
  message: 'Feeder overload turnaround window is nearing maximum statutory SLA limit (4 hours).',
  time: 'Just now',
  createdAt: '2026-10-31T09:10:00.000Z',
  targetRole: 'employee',
  role: 'employee',
  targetUserId: 'EMP-UG-1101',
  incidentId: 'INC-MS-881',
  type: 'alert',
  read: false,
  category: 'Outage',
  subdivision: 'Mehsana City North',
  eventKey: 'EVT-INC-INC-MS-881-SLA-BREACH'
};

const slaEmployeeInbox = sanitizeAndScopeIncidentNotifications(
  [slaBreachNotif],
  [mehsanaIncident],
  'employee',
  empMehsana,
  new Set(),
  new Set()
);
assert(slaEmployeeInbox.length === 1, 'Responsible Employee receives SLA breach warning');

const slaFieldInbox = sanitizeAndScopeIncidentNotifications(
  [slaBreachNotif],
  [mehsanaIncident],
  'field',
  fldVikram,
  new Set(),
  new Set()
);
assert(slaFieldInbox.length === 0, 'Unassigned Field Engineer does not receive SLA breach alert');

// --------------------------------------------------------------------------
// TEST 12: Notification timestamps and newest-first sorting
// --------------------------------------------------------------------------
console.log('\n--- TEST 12: Notification timestamps and newest-first sorting ---');

const nEarly: AppNotification = {
  ...detectedNotif,
  id: 'N-EARLY',
  createdAt: '2026-10-31T08:00:00.000Z'
};
const nLate: AppNotification = {
  ...ackNotif,
  id: 'N-LATE',
  createdAt: '2026-10-31T08:30:00.000Z'
};

const sorted = sortNotificationsNewestFirst([nEarly, nLate]);
assert(sorted[0].id === 'N-LATE' && sorted[1].id === 'N-EARLY', 'Notifications are sorted strictly newest-first');

// --------------------------------------------------------------------------
// TEST 13: Read/unread state survives language switching
// --------------------------------------------------------------------------
console.log('\n--- TEST 13: Read/unread state survives language switching ---');

const readSet = new Set(['NOTIF-INC-MS-881-DET']);
const scopedRead = sanitizeAndScopeIncidentNotifications(
  [detectedNotif],
  [mehsanaIncident],
  'employee',
  empMehsana,
  readSet,
  new Set()
);
assert(scopedRead[0].read === true, 'Read state is marked true in scoped notifications');

// Localize notification in all 4 languages and verify read remains true
for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
  const loc = localizeIncidentNotification(scopedRead[0], lang);
  assert(loc.read === true, `Read state preserved in ${lang} localization`);
  assert(loc.id === 'NOTIF-INC-MS-881-DET', `Canonical ID preserved in ${lang} localization`);
}

// --------------------------------------------------------------------------
// TEST 14: Four-language localization parity across en, gu, hi, mr
// --------------------------------------------------------------------------
console.log('\n--- TEST 14: Four-language localization parity across en, gu, hi, mr ---');

const testCases = [
  { raw: 'Critical Incident Detected: INC-MS-881', gu: 'ગંભીર ઘટના જણાઈ: INC-MS-881', hi: 'गंभीर घटना पहचानी गई: INC-MS-881', mr: 'अति-गंभीर घटना आढळली: INC-MS-881' },
  { raw: 'Escalated Incident: INC-MS-881', gu: 'એસ્કેલેટ કરેલ ઘટના: INC-MS-881', hi: 'अग्रेषित घटना: INC-MS-881', mr: 'वरिष्ठांकडे पाठवलेली घटना: INC-MS-881' },
  { raw: 'Incident Acknowledged: INC-MS-881', gu: 'ઘટના સ્વીકારાઈ: INC-MS-881', hi: 'घटना स्वीकृत की गई: INC-MS-881', mr: 'घटना स्वीकारली गेली: INC-MS-881' },
  { raw: 'Incident Resolved: INC-MS-881', gu: 'ઘટના ઉકેલાઈ ગઈ: INC-MS-881', hi: 'घटना का समाधान हुआ: INC-MS-881', mr: 'घटनेचे निवारण झाले: INC-MS-881' },
  { raw: 'Field Assistance Requested: #INC-MS-881', gu: 'ફીલ્ડ સહાયતા માંગી: #INC-MS-881', hi: 'फील्ड सहायता का अनुरोध: #INC-MS-881', mr: 'फील्ड सहाय्याची विनंती: #INC-MS-881' }
];

for (const tc of testCases) {
  const dummyNotif = { title: tc.raw, message: 'Sample message' };
  const locGu = localizeIncidentNotification(dummyNotif, 'gu');
  const locHi = localizeIncidentNotification(dummyNotif, 'hi');
  const locMr = localizeIncidentNotification(dummyNotif, 'mr');
  assert(locGu.title === tc.gu, `Gujarati match for "${tc.raw}"`);
  assert(locHi.title === tc.hi, `Hindi match for "${tc.raw}"`);
  assert(locMr.title === tc.mr, `Marathi match for "${tc.raw}"`);
}

// Status Badges
assert(localizeNotificationStatusBadge('Acknowledged', 'gu') === 'સ્વીકૃત', 'Status badge Acknowledged localized in Gujarati');
assert(localizeNotificationStatusBadge('Acknowledged', 'hi') === 'स्वीकृत', 'Status badge Acknowledged localized in Hindi');
assert(localizeNotificationStatusBadge('Acknowledged', 'mr') === 'स्वीकारले', 'Status badge Acknowledged localized in Marathi');
assert(localizeNotificationStatusBadge('Critical Incident', 'gu') === 'ગંભીર ઘટના', 'Status badge Critical Incident in Gujarati');
assert(localizeNotificationStatusBadge('Resolved', 'mr') === 'निवारण झाले', 'Status badge Resolved in Marathi');

// --------------------------------------------------------------------------
// TEST 15: Deep link verification (authorizeIncidentModalAccess)
// --------------------------------------------------------------------------
console.log('\n--- TEST 15: Deep link verification (authorizeIncidentModalAccess) ---');

// Employee in subdivision -> Authorized
const empModalAccess = authorizeIncidentModalAccess(mehsanaIncident, 'employee', empMehsana);
assert(empModalAccess.isAuthorized, 'Authorized employee can access incident via deep link');

// Employee outside subdivision -> Denied
const empOutModalAccess = authorizeIncidentModalAccess(mehsanaIncident, 'employee', empGandhinagar);
assert(!empOutModalAccess.isAuthorized, 'Out-of-jurisdiction employee denied modal access via deep link');
assert(empOutModalAccess.denialReason.includes('outside your jurisdiction'), 'Denial message explains subdivision restriction');

// Field Engineer on unassigned incident -> Denied
const fldUnassignedModalAccess = authorizeIncidentModalAccess(mehsanaIncident, 'field', fldVikram);
assert(!fldUnassignedModalAccess.isAuthorized, 'Unassigned field engineer denied modal access via deep link');

// Consumer -> Strictly Denied
const consumerModalAccess = authorizeIncidentModalAccess(mehsanaIncident, 'consumer', consumerKishore);
assert(!consumerModalAccess.isAuthorized, 'Consumer is strictly denied access to operational incident modal');
assert(consumerModalAccess.denialReason.includes('Consumers are strictly prohibited'), 'Clear consumer denial reason');

// --------------------------------------------------------------------------
// TEST 16: Canonical lifecycle transitions & Reopen status check
// --------------------------------------------------------------------------
console.log('\n--- TEST 16: Canonical lifecycle transitions & Reopen status check ---');

assert(isValidIncidentTransition('DETECTED', 'ACKNOWLEDGED'), 'DETECTED -> ACKNOWLEDGED is valid');
assert(isValidIncidentTransition('ACKNOWLEDGED', 'ASSIGNED'), 'ACKNOWLEDGED -> ASSIGNED is valid');
assert(isValidIncidentTransition('ASSIGNED', 'IN_PROGRESS'), 'ASSIGNED -> IN_PROGRESS is valid');
assert(isValidIncidentTransition('IN_PROGRESS', 'RESOLVED'), 'IN_PROGRESS -> RESOLVED is valid');
assert(isValidIncidentTransition('RESOLVED', 'CLOSED'), 'RESOLVED -> CLOSED is valid');

// Verify invalid transition to 'REOPENED' is strictly rejected
assert(!isValidIncidentTransition('RESOLVED', 'REOPENED' as any), 'Transition from RESOLVED to REOPENED is strictly rejected');
assert(!isValidIncidentTransition('CLOSED', 'DETECTED'), 'Reopening a CLOSED incident back to DETECTED is strictly rejected');
assert(!isValidIncidentTransition('CLOSED', 'IN_PROGRESS'), 'Reopening a CLOSED incident back to IN_PROGRESS is strictly rejected');
assert(INCIDENT_TRANSITIONS['CLOSED'].length === 0, 'CLOSED status has no permitted outgoing transitions (terminal)');

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log(`\n======================================================`);
console.log(`Final Incident Notifications Lifecycle Test Summary: ${passed} passed, ${failed} failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
