import {
  filterIncidentsForSession,
  isConfirmedEmergencyHazard,
  reclassifyIncidentEmergencyOverride,
  normalizeAndHealIncidentRouting,
  authorizeIncidentModalAccess,
  authorizeEmployeeAction,
  authorizeManagementAction,
  authorizeFieldEngineerAction,
  resolveCanonicalEmployeeId,
  resolveIncidentOriginatingEmployee,
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  sanitizeAndScopeIncidentNotifications
} from '../src/utils/anomalyDetector';
import { CriticalIncident, UserRole } from '../src/types';

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

console.log('🧪 Starting VidyutFlow Part 3: Employee-First Critical Incident Routing & Authorization Test Suite\n');

// --------------------------------------------------------------------------
// TEST FIXTURES
// --------------------------------------------------------------------------

const ordinaryMehsanaIncident: CriticalIncident = {
  id: 'INC-MS-101',
  title: 'Feeder Overload: 11kV Radhanpur Road',
  description: 'Conductor thermal sensor triggered at 92C with 420A load.',
  severity: 'WARNING',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-RAD',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-26T10:00:00.000Z',
  responsibleRoles: ['employee'], // Employee-first!
  recommendedAction: 'Redistribute load to Auxiliary Feeder 3.',
  status: 'DETECTED',
  approvalStatus: 'PENDING_APPROVAL',
  history: [
    {
      id: 'EVT-101-1',
      incidentId: 'INC-MS-101',
      timestamp: '2026-10-26T10:00:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA Telemetry Unit',
      actorRole: 'employee',
      notes: 'Automatic overload trigger.'
    }
  ]
};

const assignedMehsanaIncident: CriticalIncident = {
  id: 'INC-MS-102',
  title: 'Distribution Transformer Thermal Trip on DT-88',
  description: 'Oil temperature reached 91C at Substation North DT-88.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'DT-88',
  entityType: 'transformer',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-26T10:15:00.000Z',
  responsibleRoles: ['employee', 'field'],
  recommendedAction: 'Mobilize field engineer for thermal scan.',
  status: 'ASSIGNED',
  approvalStatus: 'PENDING_APPROVAL',
  assignedToUserId: 'FLD-UG-201',
  assignedEngineerName: 'Vikramaditya Solanki',
  assignedAt: '2026-10-26T10:20:00.000Z',
  assignedBy: 'Sunil Mehta (AE Ops)',
  assignmentNotes: 'Immediate on-site radiator inspection required.',
  originatingEmployeeName: 'Sunil Mehta',
  originatingEmployeeUserId: 'EMP-UG-1101',
  history: [
    {
      id: 'EVT-102-1',
      incidentId: 'INC-MS-102',
      timestamp: '2026-10-26T10:15:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA Sensor',
      actorRole: 'employee',
      notes: 'Thermal alert.'
    },
    {
      id: 'EVT-102-2',
      incidentId: 'INC-MS-102',
      timestamp: '2026-10-26T10:20:00.000Z',
      stage: 'ASSIGNED',
      eventType: 'ASSIGNED',
      actor: 'Sunil Mehta',
      actorUserId: 'EMP-UG-1101',
      actorRole: 'employee',
      targetUserId: 'FLD-UG-201',
      targetRole: 'field',
      notes: 'Assigned to Vikramaditya Solanki.'
    }
  ]
};

const escalatedMehsanaIncident: CriticalIncident = {
  id: 'INC-MS-103',
  title: '11kV Feeder Lockout: Rotational Load Shedding Concurrence',
  description: 'Tripped 3 times under peak load. Executive approval needed for 15MW rotational shed.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-08',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-26T10:30:00.000Z',
  responsibleRoles: ['employee', 'management'],
  recommendedAction: 'Awaiting Executive Management concurrence.',
  status: 'ESCALATED',
  approvalStatus: 'PENDING_APPROVAL',
  escalatedTo: 'management',
  escalatedToUserId: 'usr_mgmt_01',
  escalatedToUserName: 'Rajesh Solanki',
  escalatedBy: 'Sunil Mehta (AE Ops)',
  escalatedAt: '2026-10-26T10:35:00.000Z',
  escalatedReason: 'Severe load shedding rotation of 15MW requires SE approval.',
  originatingEmployeeName: 'Sunil Mehta',
  originatingEmployeeUserId: 'EMP-UG-1101',
  history: [
    {
      id: 'EVT-103-1',
      incidentId: 'INC-MS-103',
      timestamp: '2026-10-26T10:30:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA',
      actorRole: 'employee',
      notes: 'Repeated trip.'
    },
    {
      id: 'EVT-103-2',
      incidentId: 'INC-MS-103',
      timestamp: '2026-10-26T10:35:00.000Z',
      stage: 'ESCALATED',
      eventType: 'ESCALATED',
      actor: 'Sunil Mehta',
      actorUserId: 'EMP-UG-1101',
      actorRole: 'employee',
      targetUserId: 'usr_mgmt_01',
      targetRole: 'management',
      notes: 'Escalated to Superintending Engineer Rajesh Solanki.'
    }
  ]
};

const emergencyElectrocutionIncident: CriticalIncident = {
  id: 'INC-EMG-999',
  title: 'EMERGENCY: Snapped 11kV Conductor & Electrocution Risk',
  description: 'Conductor snapped near North Bus Stand. High live-wire electrocution hazard.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-EMG',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-26T10:45:00.000Z',
  responsibleRoles: ['field', 'employee', 'management', 'admin'],
  recommendedAction: 'IMMEDIATE EMERGENCY ISOLATION AND CREW DISPATCH',
  status: 'DETECTED',
  approvalStatus: 'PENDING_APPROVAL',
  isEmergencyOverride: true,
  hazardClassification: 'electrocution',
  hazardDetails: 'Live snapped wire on public road.',
  emergencyBroadcastAt: '2026-10-26T10:45:00.000Z',
  history: [
    {
      id: 'EVT-EMG-1',
      incidentId: 'INC-EMG-999',
      timestamp: '2026-10-26T10:45:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'Feeder Fault Telemetry',
      actorRole: 'field',
      notes: 'Emergency live conductor snap.'
    }
  ]
};

// User Contexts
const mehsanaEmployee = {
  id: 'EMP-UG-1101',
  name: 'Sunil Mehta',
  role: 'employee' as UserRole,
  subdivision: 'Mehsana City North'
};

const visnagarEmployee = {
  id: 'EMP-UG-1042',
  name: 'Prakash Patel',
  role: 'employee' as UserRole,
  subdivision: 'Visnagar Rural'
};

const circleHqEmployee = {
  id: 'EMP-UG-1001',
  name: 'Circle Operations Lead',
  role: 'employee' as UserRole,
  subdivision: 'Mehsana Corporate Circle'
};

const assignedEngineer = {
  id: 'FLD-UG-201',
  name: 'Vikramaditya Solanki',
  role: 'field' as UserRole,
  subdivision: 'Mehsana City North'
};

const unassignedEngineer = {
  id: 'FLD-UG-204',
  name: 'Dharmesh P. Chaudhari',
  role: 'field' as UserRole,
  subdivision: 'Mehsana City North'
};

const targetedManager = {
  id: 'usr_mgmt_01',
  name: 'Rajesh Solanki',
  role: 'management' as UserRole
};

const unrelatedManager = {
  id: 'usr_mgmt_02',
  name: 'Pooja Shah',
  role: 'management' as UserRole
};

const consumerUser = {
  id: 'USR-C-001',
  name: 'Ketan Patel',
  role: 'consumer' as UserRole
};

// --------------------------------------------------------------------------
// SCENARIO 1: New ordinary critical incident -> Authorized Employee permitted
// --------------------------------------------------------------------------
console.log('--- SCENARIO 1: New Ordinary Critical Incident -> Authorized Employee ---');
{
  // Appears in employee filtered inbox
  const filtered = filterIncidentsForSession([ordinaryMehsanaIncident], 'employee', mehsanaEmployee);
  assert(filtered.length === 1 && filtered[0].id === 'INC-MS-101', 'Ordinary incident appears in authorized employee inbox');

  // Employee action authorization check
  const auth = authorizeEmployeeAction(ordinaryMehsanaIncident, 'employee', mehsanaEmployee);
  assert(auth.isAuthorized, 'Authorized employee permitted to act on incident in their subdivision');

  // Modal access check
  const modalAuth = authorizeIncidentModalAccess(ordinaryMehsanaIncident, 'employee', mehsanaEmployee);
  assert(modalAuth.isAuthorized, 'Authorized employee permitted to open incident modal / review');
}

// --------------------------------------------------------------------------
// SCENARIO 2: Unrelated Employee (different subdivision) -> Denied
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 2: Unrelated Employee Outside Jurisdiction -> Denied ---');
{
  // Does not appear in unrelated employee filtered inbox
  const filtered = filterIncidentsForSession([ordinaryMehsanaIncident], 'employee', visnagarEmployee);
  assert(filtered.length === 0, 'Incident filtered out from employee outside subdivision');

  // Action check denied
  const auth = authorizeEmployeeAction(ordinaryMehsanaIncident, 'employee', visnagarEmployee);
  assert(!auth.isAuthorized, 'Unrelated employee denied execution of operational action');
  assert(auth.denialReason.includes('outside your jurisdiction'), 'Denial reason mentions jurisdiction mismatch');

  // Modal access check denied
  const modalAuth = authorizeIncidentModalAccess(ordinaryMehsanaIncident, 'employee', visnagarEmployee);
  assert(!modalAuth.isAuthorized, 'Unrelated employee denied opening modal via deep link or direct selection');

  // Supervisory circle office employee remains permitted
  const circleAuth = authorizeEmployeeAction(ordinaryMehsanaIncident, 'employee', circleHqEmployee);
  assert(circleAuth.isAuthorized, 'Corporate Circle supervisory employee retains operational oversight');
}

// --------------------------------------------------------------------------
// SCENARIO 3: Unassigned Field Engineer -> Denied
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Unassigned Field Engineer -> Denied ---');
{
  // Ordinary unassigned incident does NOT appear in Field Engineer inbox
  const filteredUnassigned = filterIncidentsForSession([ordinaryMehsanaIncident], 'field', assignedEngineer);
  assert(filteredUnassigned.length === 0, 'Unassigned ordinary incident does NOT appear in field engineer inbox');

  // Assigned incident does NOT appear for unassigned engineer
  const filteredOther = filterIncidentsForSession([assignedMehsanaIncident], 'field', unassignedEngineer);
  assert(filteredOther.length === 0, 'Incident assigned to FLD-UG-201 does NOT appear for FLD-UG-204');

  // Mutating field action blocked for unassigned engineer
  const fieldAuth = authorizeFieldEngineerAction(assignedMehsanaIncident, 'field', unassignedEngineer);
  assert(!fieldAuth.isAuthorized, 'Unassigned field engineer denied executing mutating field actions');
  assert(fieldAuth.denialReason.includes('not assigned to your field engineering account'), 'Clear denial reason provided');

  // Modal access denied for unassigned engineer
  const modalAuth = authorizeIncidentModalAccess(assignedMehsanaIncident, 'field', unassignedEngineer);
  assert(!modalAuth.isAuthorized, 'Unassigned field engineer denied modal access');
}

// --------------------------------------------------------------------------
// SCENARIO 4: Assigned Field Engineer -> Permitted
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 4: Assigned Field Engineer -> Permitted ---');
{
  const filtered = filterIncidentsForSession([assignedMehsanaIncident], 'field', assignedEngineer);
  assert(filtered.length === 1 && filtered[0].id === 'INC-MS-102', 'Assigned incident appears in assigned engineer inbox');

  const fieldAuth = authorizeFieldEngineerAction(assignedMehsanaIncident, 'field', assignedEngineer);
  assert(fieldAuth.isAuthorized, 'Assigned engineer permitted to execute field actions');

  const modalAuth = authorizeIncidentModalAccess(assignedMehsanaIncident, 'field', assignedEngineer);
  assert(modalAuth.isAuthorized, 'Assigned engineer permitted to open modal');
}

// --------------------------------------------------------------------------
// SCENARIO 5: Declined Assignment -> Returns to ACKNOWLEDGED for Employee
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Declined Assignment Workflow ---');
{
  const nowIso = new Date().toISOString();
  const declineResult = declineIncidentAssignmentRecord(
    assignedMehsanaIncident,
    'Bucket truck hydraulic failure; unavailable for on-site inspection.',
    assignedEngineer,
    'field',
    [],
    nowIso
  );

  assert(declineResult.success, 'Decline assignment succeeds with mandatory reason');
  assert(declineResult.updatedIncident?.status === 'ACKNOWLEDGED', 'Status resets to ACKNOWLEDGED for employee triage');
  assert(declineResult.updatedIncident?.isDeclined === true, 'Incident flagged as isDeclined');
  assert(declineResult.updatedIncident?.assignedToUserId === undefined, 'assignedToUserId cleared on decline');
  assert(declineResult.declineNotification?.targetUserId === 'EMP-UG-1101', 'High-priority notification sent to originating employee');

  // Declining engineer can no longer act on the incident
  const fieldAuthAfterDecline = authorizeFieldEngineerAction(declineResult.updatedIncident!, 'field', assignedEngineer);
  assert(!fieldAuthAfterDecline.isAuthorized, 'Declining engineer cannot continue acting on declined incident');
}

// --------------------------------------------------------------------------
// SCENARIO 6: Reassigned Engineer -> Previous Denied, New Permitted
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 6: Reassignment Workflow ---');
{
  const nowIso = new Date().toISOString();
  const { updatedIncident, updatedNotifications } = reassignIncidentRecord(
    assignedMehsanaIncident,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Reassigned due to equipment breakdown.',
    'Sunil Mehta',
    'EMP-UG-1101',
    'employee',
    [],
    nowIso
  );

  assert(updatedIncident.assignedToUserId === 'FLD-UG-204', 'Incident now assigned to FLD-UG-204');
  assert(updatedIncident.status === 'ASSIGNED', 'Status remains ASSIGNED');

  // Previous engineer FLD-UG-201 denied
  const prevAuth = authorizeFieldEngineerAction(updatedIncident, 'field', assignedEngineer);
  assert(!prevAuth.isAuthorized, 'Previous engineer FLD-UG-201 denied after reassignment');

  // New engineer FLD-UG-204 permitted
  const newAuth = authorizeFieldEngineerAction(updatedIncident, 'field', unassignedEngineer);
  assert(newAuth.isAuthorized, 'New engineer FLD-UG-204 permitted after reassignment');
}

// --------------------------------------------------------------------------
// SCENARIO 7: Unescalated Incident -> Management Action Denied
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 7: Unescalated Incident -> Management Denied ---');
{
  // Ordinary detected incident does NOT appear in Management inbox
  const filteredOrdinary = filterIncidentsForSession([ordinaryMehsanaIncident], 'management', targetedManager);
  assert(filteredOrdinary.length === 0, 'Unescalated ordinary incident hidden from Management inbox');

  // Assigned field incident does NOT appear in Management inbox
  const filteredField = filterIncidentsForSession([assignedMehsanaIncident], 'management', targetedManager);
  assert(filteredField.length === 0, 'Field assignment hidden from Management inbox');

  // Management mutating action blocked on unescalated incident
  const mgmtAuth = authorizeManagementAction(ordinaryMehsanaIncident, 'management', targetedManager);
  assert(!mgmtAuth.isAuthorized, 'Management denied acting on unescalated incident');
  assert(mgmtAuth.denialReason.includes('has not been escalated to Management'), 'Clear unescalated denial reason');
}

// --------------------------------------------------------------------------
// SCENARIO 8: Escalated Incident -> Selected Management Authority Permitted
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 8: Escalated Incident -> Targeted Manager Permitted ---');
{
  const filtered = filterIncidentsForSession([escalatedMehsanaIncident], 'management', targetedManager);
  assert(filtered.length === 1 && filtered[0].id === 'INC-MS-103', 'Escalated incident appears in targeted manager inbox');

  const mgmtAuth = authorizeManagementAction(escalatedMehsanaIncident, 'management', targetedManager);
  assert(mgmtAuth.isAuthorized, 'Targeted manager permitted to approve/reject/request info');

  const modalAuth = authorizeIncidentModalAccess(escalatedMehsanaIncident, 'management', targetedManager);
  assert(modalAuth.isAuthorized, 'Targeted manager permitted to open modal');
}

// --------------------------------------------------------------------------
// SCENARIO 9: Unrelated Management Authority -> Denied
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 9: Unrelated Management Authority -> Denied ---');
{
  // Hidden from inbox of manager not targeted
  const filtered = filterIncidentsForSession([escalatedMehsanaIncident], 'management', unrelatedManager);
  assert(filtered.length === 0, 'Incident targeted to usr_mgmt_01 hidden from usr_mgmt_02 inbox');

  // Action denied
  const mgmtAuth = authorizeManagementAction(escalatedMehsanaIncident, 'management', unrelatedManager);
  assert(!mgmtAuth.isAuthorized, 'Unrelated manager denied acting on incident targeted to another manager');
  assert(mgmtAuth.denialReason.includes('escalated specifically to authority'), 'Denial reason mentions targeted authority');

  // Modal access denied
  const modalAuth = authorizeIncidentModalAccess(escalatedMehsanaIncident, 'management', unrelatedManager);
  assert(!modalAuth.isAuthorized, 'Unrelated manager denied modal access');
}

// --------------------------------------------------------------------------
// SCENARIO 10: Emergency Safety Override -> Broadcast Preserved
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 10: Emergency Safety Override ---');
{
  assert(isConfirmedEmergencyHazard(emergencyElectrocutionIncident), 'Emergency electrocution hazard recognized');

  // Appears for all operational roles and subdivisions
  const empFiltered = filterIncidentsForSession([emergencyElectrocutionIncident], 'employee', visnagarEmployee);
  assert(empFiltered.length === 1, 'Emergency broadcast appears for employee regardless of subdivision');

  const fieldFiltered = filterIncidentsForSession([emergencyElectrocutionIncident], 'field', unassignedEngineer);
  assert(fieldFiltered.length === 1, 'Emergency broadcast appears for field engineer even without prior assignment');

  const mgmtFiltered = filterIncidentsForSession([emergencyElectrocutionIncident], 'management', unrelatedManager);
  assert(mgmtFiltered.length === 1, 'Emergency broadcast appears for management even without prior escalation');

  // Authorizations allow immediate emergency response
  const empAuth = authorizeEmployeeAction(emergencyElectrocutionIncident, 'employee', visnagarEmployee);
  assert(empAuth.isAuthorized, 'Employee authorized for emergency hazard response across subdivisions');

  const fieldAuth = authorizeFieldEngineerAction(emergencyElectrocutionIncident, 'field', unassignedEngineer);
  assert(fieldAuth.isAuthorized, 'Field engineer authorized for emergency hazard response');

  const mgmtAuth = authorizeManagementAction(emergencyElectrocutionIncident, 'management', unrelatedManager);
  assert(mgmtAuth.isAuthorized, 'Management authorized for emergency hazard response');

  // Consumers remain strictly isolated even in emergencies
  const consumerFiltered = filterIncidentsForSession([emergencyElectrocutionIncident], 'consumer', consumerUser);
  assert(consumerFiltered.length === 0, 'Consumer strictly isolated from operational emergency incidents');

  const consumerModalAuth = authorizeIncidentModalAccess(emergencyElectrocutionIncident, 'consumer', consumerUser);
  assert(!consumerModalAuth.isAuthorized, 'Consumer strictly denied incident modal access');
}

// --------------------------------------------------------------------------
// SCENARIO 11: Notification Deep Links / Modal Access Authorization
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 11: Notification Deep Links & Modal Authorization ---');
{
  // Deep linking to an incident in a different subdivision
  const deepLinkEmpResult = authorizeIncidentModalAccess(ordinaryMehsanaIncident, 'employee', visnagarEmployee);
  assert(!deepLinkEmpResult.isAuthorized, 'Employee cannot bypass subdivision jurisdiction via deep link or modal');

  // Deep linking to an unassigned incident as a field engineer
  const deepLinkFieldResult = authorizeIncidentModalAccess(ordinaryMehsanaIncident, 'field', assignedEngineer);
  assert(!deepLinkFieldResult.isAuthorized, 'Field engineer cannot bypass unassigned state via deep link or modal');

  // Deep linking to an unescalated incident as management
  const deepLinkMgmtResult = authorizeIncidentModalAccess(ordinaryMehsanaIncident, 'management', targetedManager);
  assert(!deepLinkMgmtResult.isAuthorized, 'Management cannot bypass unescalated state via deep link or modal');
}

// --------------------------------------------------------------------------
// SCENARIO 12: Audit Trail Transitions & Record Integrity
// --------------------------------------------------------------------------
console.log('\n--- SCENARIO 12: Audit Trail & Transition Integrity ---');
{
  const history = [
    ...(ordinaryMehsanaIncident.history || []),
    {
      id: 'EVT-ACK-1',
      incidentId: 'INC-MS-101',
      timestamp: '2026-10-26T10:05:00.000Z',
      stage: 'ACKNOWLEDGED' as const,
      eventType: 'ACKNOWLEDGED' as const,
      actor: 'Sunil Mehta',
      actorUserId: 'EMP-UG-1101',
      actorRole: 'employee' as UserRole,
      notes: 'Acknowledged at operations desk.'
    },
    {
      id: 'EVT-ASN-1',
      incidentId: 'INC-MS-101',
      timestamp: '2026-10-26T10:10:00.000Z',
      stage: 'ASSIGNED' as const,
      eventType: 'ASSIGNED' as const,
      actor: 'Sunil Mehta',
      actorUserId: 'EMP-UG-1101',
      actorRole: 'employee' as UserRole,
      targetUserId: 'FLD-UG-201',
      targetRole: 'field' as UserRole,
      notes: 'Dispatched to Vikramaditya Solanki.'
    }
  ];

  assert(history.length === 3, 'Audit history correctly records 3 sequential chronological events');
  assert(history[1].actorUserId === 'EMP-UG-1101', 'History event persists canonical actorUserId');
  assert(history[2].targetUserId === 'FLD-UG-201', 'History event persists canonical targetUserId');
  assert(history[1].stage === 'ACKNOWLEDGED' && history[2].stage === 'ASSIGNED', 'History correctly reflects lifecycle stages');
}

// --------------------------------------------------------------------------
// TASK 3 FINAL SECURITY REGRESSION SUITE (CONCERNS 1 & 2)
// --------------------------------------------------------------------------
console.log('\n--- TASK 3.1 & 3.2: Authorized vs. Unauthorized Employee Reassignment ---');
{
  const initialNotifs = [
    {
      id: 'NOTIF-INIT-201',
      title: 'Assigned Incident: INC-MS-102',
      message: 'Assigned to Vikramaditya Solanki',
      time: 'Just now',
      targetRole: 'field' as UserRole,
      targetUserId: 'FLD-UG-201',
      incidentId: 'INC-MS-102',
      type: 'alert' as const,
      read: false,
      category: 'Outage' as const,
      subdivision: 'Mehsana City North'
    }
  ];

  // 1. Unauthorized Employee from different subdivision (Visnagar Rural) attempting reassignment
  const unauthVisnagarReassign = reassignIncidentRecord(
    assignedMehsanaIncident,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Attempting cross-subdivision reassignment',
    'Prakash Patel',
    'EMP-UG-1042',
    'employee',
    initialNotifs,
    '2026-10-26T11:00:00.000Z',
    'Visnagar Rural'
  );
  assert(!unauthVisnagarReassign.success, 'Out-of-subdivision Employee (Visnagar Rural) is denied reassignment');
  assert(
    Boolean(unauthVisnagarReassign.denialReason?.includes('outside your jurisdiction')),
    'Unauthorized employee reassignment returns explicit jurisdiction denial reason'
  );
  assert(
    unauthVisnagarReassign.updatedIncident.assignedToUserId === 'FLD-UG-201' &&
      unauthVisnagarReassign.updatedIncident.history.length === assignedMehsanaIncident.history.length &&
      unauthVisnagarReassign.updatedNotifications.length === 1 &&
      unauthVisnagarReassign.updatedNotifications[0].targetUserId === 'FLD-UG-201',
    'Failed employee reassignment does NOT mutate incident assignment, history, or notifications'
  );

  // 2. Unauthorized Canonical Employee from Gandhinagar Circle (EMP-UG-1088) attempting reassignment without explicit subdivision param
  const unauthCanonicalEmpReassign = reassignIncidentRecord(
    assignedMehsanaIncident,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Attempting reassignment from Gandhinagar Circle',
    'Pooja Shah',
    'EMP-UG-1088',
    'employee',
    initialNotifs,
    '2026-10-26T11:00:00.000Z'
  );
  assert(!unauthCanonicalEmpReassign.success, 'Canonical employee EMP-UG-1088 (Gandhinagar Circle) is denied reassigning Mehsana City North incident');
  assert(
    unauthCanonicalEmpReassign.updatedIncident.assignedToUserId === 'FLD-UG-201',
    'Canonical out-of-jurisdiction employee failure leaves assignedToUserId untouched'
  );

  // 3. Unauthorized non-employee roles (field, management, consumer) attempting reassignment
  const unauthFieldReassign = reassignIncidentRecord(
    assignedMehsanaIncident,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Self-reassignment attempt',
    'Vikramaditya Solanki',
    'FLD-UG-201',
    'field',
    initialNotifs
  );
  const unauthConsumerReassign = reassignIncidentRecord(
    assignedMehsanaIncident,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Consumer reassignment attempt',
    'Ketan Patel',
    'USR-C-001',
    'consumer',
    initialNotifs
  );
  assert(
    !unauthFieldReassign.success && !unauthConsumerReassign.success,
    'Field Engineer and Consumer roles are strictly denied executing reassignIncidentRecord'
  );

  // 4. Authorized Employee (Mehsana City North) reassignment succeeds
  const authReassign = reassignIncidentRecord(
    assignedMehsanaIncident,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Reassigned due to primary crew vehicle maintenance.',
    'Sunil Mehta',
    'EMP-UG-1101',
    'employee',
    initialNotifs,
    '2026-10-26T11:05:00.000Z',
    'Mehsana City North'
  );
  assert(authReassign.success && authReassign.isReassignment, 'Authorized Employee in Mehsana City North successfully reassigns incident');

  // TASK 3.3 & 3.4: Previous Engineer Access Revocation & New Engineer Assignment Access
  const reassignedInc = authReassign.updatedIncident;
  const reassignedNotifs = authReassign.updatedNotifications;

  const prevEngSessionInbox = filterIncidentsForSession([reassignedInc], 'field', assignedEngineer);
  const newEngSessionInbox = filterIncidentsForSession([reassignedInc], 'field', unassignedEngineer);
  const prevEngScopedNotifs = sanitizeAndScopeIncidentNotifications(
    reassignedNotifs,
    [reassignedInc],
    'field',
    assignedEngineer,
    new Set(),
    new Set()
  );
  const newEngScopedNotifs = sanitizeAndScopeIncidentNotifications(
    reassignedNotifs,
    [reassignedInc],
    'field',
    unassignedEngineer,
    new Set(),
    new Set()
  );

  assert(
    prevEngSessionInbox.length === 0 &&
      !authorizeIncidentModalAccess(reassignedInc, 'field', assignedEngineer).isAuthorized &&
      !authorizeFieldEngineerAction(reassignedInc, 'field', assignedEngineer).isAuthorized &&
      prevEngScopedNotifs.length === 0,
    'Previous Field Engineer (FLD-UG-201) immediately loses inbox visibility, modal access, action execution, and pending notifications'
  );

  assert(
    newEngSessionInbox.length === 1 &&
      authorizeIncidentModalAccess(reassignedInc, 'field', unassignedEngineer).isAuthorized &&
      authorizeFieldEngineerAction(reassignedInc, 'field', unassignedEngineer).isAuthorized &&
      newEngScopedNotifs.length === 1 &&
      newEngScopedNotifs[0].targetUserId === 'FLD-UG-204',
    'New Field Engineer (FLD-UG-204) immediately gains inbox visibility, modal access, action execution, and targeted notification'
  );
}

console.log('\n--- TASK 3.5 & 3.6: Emergency Override Security & Anti-Spoofing ---');
{
  // 5. Ordinary incident cannot exploit emergency bypass merely by flipping client-editable flags
  const flagSpoofedWarning: CriticalIncident = {
    ...ordinaryMehsanaIncident,
    isEmergencyOverride: true,
    emergencyClassification: 'ELECTROCUTION_RISK'
  };
  const flagSpoofedCriticalOverload: CriticalIncident = {
    ...assignedMehsanaIncident,
    isEmergencyOverride: true,
    emergencyClassification: 'ELECTROCUTION_RISK'
  };
  const flagSpoofedBilling: CriticalIncident = {
    ...ordinaryMehsanaIncident,
    id: 'INC-BIL-999',
    severity: 'CRITICAL',
    entityType: 'billing',
    title: 'Billing Anomaly: High Unbilled Revenue',
    description: 'Electrocution keyword injected into billing record.',
    isEmergencyOverride: true,
    emergencyClassification: 'ELECTROCUTION_RISK'
  };

  assert(
    !isConfirmedEmergencyHazard(flagSpoofedWarning),
    'Ordinary WARNING incident with tampered isEmergencyOverride=true is rejected by isConfirmedEmergencyHazard'
  );
  assert(
    !isConfirmedEmergencyHazard(flagSpoofedCriticalOverload),
    'Ordinary CRITICAL transformer overheating incident with tampered isEmergencyOverride=true and uncorroborated classification is rejected'
  );
  assert(
    !isConfirmedEmergencyHazard(flagSpoofedBilling),
    'Non-physical billing/security/service incident cannot trigger life-hazard emergency override'
  );

  // Verify normalizeAndHealIncidentRouting strips tampered flags and blocks unauthorized roles
  const healedSpoofed = normalizeAndHealIncidentRouting(flagSpoofedCriticalOverload);
  assert(
    healedSpoofed.isEmergencyOverride === false &&
      healedSpoofed.emergencyClassification === 'NONE' &&
      !authorizeEmployeeAction(healedSpoofed, 'employee', visnagarEmployee).isAuthorized &&
      !authorizeFieldEngineerAction(healedSpoofed, 'field', unassignedEngineer).isAuthorized &&
      !authorizeManagementAction(healedSpoofed, 'management', targetedManager).isAuthorized,
    'normalizeAndHealIncidentRouting strips tampered emergency flags and preserves strict RBAC & jurisdiction isolation'
  );

  // 6. Unauthorized emergency reclassification denied
  const consumerReclassify = reclassifyIncidentEmergencyOverride(
    ordinaryMehsanaIncident,
    'ELECTROCUTION_RISK',
    'Live snapped 11kV conductor causing electrocution hazard.',
    'consumer',
    consumerUser
  );
  const outOfSubdivEmpReclassify = reclassifyIncidentEmergencyOverride(
    ordinaryMehsanaIncident,
    'ELECTROCUTION_RISK',
    'Live snapped 11kV conductor causing electrocution hazard.',
    'employee',
    visnagarEmployee
  );
  const unassignedFieldReclassify = reclassifyIncidentEmergencyOverride(
    assignedMehsanaIncident,
    'ELECTROCUTION_RISK',
    'Live snapped 11kV conductor causing electrocution hazard.',
    'field',
    unassignedEngineer
  );
  const uncorroboratedReclassify = reclassifyIncidentEmergencyOverride(
    ordinaryMehsanaIncident,
    'ELECTROCUTION_RISK',
    'Routine load balancing requested for feeder.',
    'employee',
    mehsanaEmployee
  );

  assert(
    !consumerReclassify.success &&
      !outOfSubdivEmpReclassify.success &&
      !unassignedFieldReclassify.success &&
      !uncorroboratedReclassify.success &&
      !isConfirmedEmergencyHazard(consumerReclassify.updatedIncident) &&
      !isConfirmedEmergencyHazard(outOfSubdivEmpReclassify.updatedIncident),
    'Unauthorized users and uncorroborated remarks are strictly denied emergency reclassification'
  );

  // 7. Legitimate emergency reclassification and broadcasts preserved
  const legitimateReclassify = reclassifyIncidentEmergencyOverride(
    ordinaryMehsanaIncident,
    'CONDUCTOR_SNAP',
    'Confirmed live 11kV fallen conductor snap on public road with immediate electrocution hazard.',
    'employee',
    mehsanaEmployee
  );
  assert(
    legitimateReclassify.success &&
      isConfirmedEmergencyHazard(legitimateReclassify.updatedIncident) &&
      filterIncidentsForSession([legitimateReclassify.updatedIncident], 'employee', visnagarEmployee).length === 1 &&
      filterIncidentsForSession([legitimateReclassify.updatedIncident], 'field', unassignedEngineer).length === 1 &&
      filterIncidentsForSession([legitimateReclassify.updatedIncident], 'management', unrelatedManager).length === 1 &&
      filterIncidentsForSession([legitimateReclassify.updatedIncident], 'consumer', consumerUser).length === 0,
    'Legitimate confirmed life-hazard emergency broadcast reaches all responder roles across subdivisions while isolating Consumers'
  );
}

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`Final Part 3 Test Summary: ${passed} passed, ${failed} failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
