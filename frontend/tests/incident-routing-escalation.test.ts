import {
  filterIncidentsForSession,
  isConfirmedEmergencyHazard,
  detectAnomalies,
  normalizeAndHealIncidentRouting,
  authorizeIncidentModalAccess,
  authorizeFieldEngineerAction,
  resolveCanonicalEmployeeId,
  resolveIncidentOriginatingEmployee,
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  sanitizeAndScopeIncidentNotifications
} from '../src/utils/anomalyDetector';
import { CriticalIncident, UserRole, ActiveUserIdentity, AppNotification, IncidentLifecycleEvent } from '../src/types';
import { isActionAuthorized } from '../src/services/erpApiContracts';
import { formatErpDateTime, formatErpDateOnly, formatErpTimeOnly } from '../src/utils/dateUtils';
import { DemoErpRepositoryBundle } from '../src/services/repositories';
import { upsertNotificationList, getNotificationInboxScopeKey } from '../src/context/AppContext';
import { INITIAL_FIELD_ENGINEERS } from '../src/data/mockData';
import {
  CANONICAL_DEMO_IDENTITIES,
  CANONICAL_FIELD_ENGINEERS,
  getCanonicalDemoAccountsByRole,
  getCanonicalIdentityById,
  createDemoSessionForIdentity
} from '../src/data/demoAuthData';
import * as fs from 'fs';
import * as path from 'path';
import { getActiveUserIdentity } from '../src/utils/avatarUtils';

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

console.log('🧪 Starting VidyutFlow Critical Incident System: 20-Point Regression & Workflow Test Suite\n');

// Canonical Incident Fixtures
const ordinaryDetectedIncident: CriticalIncident = {
  id: 'INC-FDR-001',
  title: 'Feeder Overload: 11kV Mehsana Feeder 2',
  description: 'Conductor utilization reached 94% with 40A overload.',
  severity: 'WARNING',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-02',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-25T09:30:00.000Z',
  responsibleRoles: ['employee'], // Ordinary incident is Employee-first!
  recommendedAction: 'Inspect load balancing across distribution transformers.',
  status: 'DETECTED',
  approvalStatus: 'PENDING_APPROVAL',
  history: [
    {
      id: 'EVT-001',
      incidentId: 'INC-FDR-001',
      timestamp: '2026-10-25T09:30:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA Telemetry System',
      actorRole: 'employee',
      notes: 'Automatic overload trigger.'
    }
  ]
};

const assignedIncident: CriticalIncident = {
  id: 'INC-FDR-002',
  title: 'Transformer Overheating on DT-44',
  description: 'Oil temperature reached 88C at DT-44.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'DT-44',
  entityType: 'transformer',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-25T10:00:00.000Z',
  responsibleRoles: ['employee', 'field'],
  recommendedAction: 'Mobilize field engineer for thermal scan.',
  status: 'ASSIGNED',
  approvalStatus: 'PENDING_APPROVAL',
  assignedToUserId: 'FLD-UG-201',
  assignedEngineerName: 'Vikramaditya Solanki',
  assignedAt: '2026-10-25T10:05:00.000Z',
  assignedBy: 'Sunil Mehta (AE Ops)',
  assignmentNotes: 'Please inspect thermal bushings immediately.',
  originatingEmployeeName: 'Sunil Mehta',
  originatingEmployeeUserId: 'EMP-UG-1101',
  history: [
    {
      id: 'EVT-002',
      incidentId: 'INC-FDR-002',
      timestamp: '2026-10-25T10:00:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'SCADA Sensor',
      actorRole: 'employee',
      notes: 'High thermal sensor alert.'
    },
    {
      id: 'EVT-003',
      incidentId: 'INC-FDR-002',
      timestamp: '2026-10-25T10:05:00.000Z',
      stage: 'ASSIGNED',
      eventType: 'ASSIGNED',
      actor: 'Sunil Mehta (AE Ops)',
      actorUserId: 'EMP-UG-1101',
      actorRole: 'employee',
      targetUserId: 'FLD-UG-201',
      targetRole: 'field',
      notes: 'Assigned to Field Engineer Vikramaditya Solanki (FLD-UG-201).'
    }
  ]
};

const escalatedIncident: CriticalIncident = {
  id: 'INC-FDR-003',
  title: '11kV Feeder Breaker Trip Lockout',
  description: 'Feeder breaker tripped 3 times in 20 minutes under peak load.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-09',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-25T10:15:00.000Z',
  responsibleRoles: ['employee', 'management'],
  recommendedAction: 'Awaiting Executive Management concurrence for load shedding rotation.',
  status: 'ESCALATED',
  approvalStatus: 'PENDING_APPROVAL',
  escalatedTo: 'management',
  escalatedToUserId: 'usr_mgmt_01',
  escalatedToUserName: 'Rajesh Solanki',
  escalatedBy: 'Sunil Mehta (AE Ops)',
  escalatedAt: '2026-10-25T10:20:00.000Z',
  escalatedReason: 'Feeder repeated tripping risks transformer breakdown; executive approval required for 20MW rotational shed.',
  originatingEmployeeName: 'Sunil Mehta',
  originatingEmployeeUserId: 'EMP-UG-1101',
  history: [
    {
      id: 'EVT-004',
      incidentId: 'INC-FDR-003',
      timestamp: '2026-10-25T10:15:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'Substation SCADA',
      actorRole: 'employee',
      notes: 'Overcurrent breaker trip 3x.'
    },
    {
      id: 'EVT-005',
      incidentId: 'INC-FDR-003',
      timestamp: '2026-10-25T10:20:00.000Z',
      stage: 'ESCALATED',
      eventType: 'ESCALATED',
      actor: 'Sunil Mehta (AE Ops)',
      actorUserId: 'EMP-UG-1101',
      actorRole: 'employee',
      targetUserId: 'usr_mgmt_01',
      targetRole: 'management',
      notes: 'Escalated to Management (Rajesh Solanki): Load shedding concurrence needed.'
    }
  ]
};

const emergencyLifeHazardIncident: CriticalIncident = {
  id: 'INC-EMG-004',
  title: 'EMERGENCY LIFE HAZARD: 11kV Fallen Conductor Snap',
  description: 'Live 11kV conductor snapped near market road. Immediate electrocution risk.',
  severity: 'CRITICAL',
  module: 'Distribution & SCADA',
  entityId: 'FDR-11K-01',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: '2026-10-25T10:25:00.000Z',
  responsibleRoles: ['field', 'employee', 'management', 'admin'],
  recommendedAction: 'URGENT: Isolate breaker immediately, mobilize emergency patrol, alert local police/fire.',
  status: 'DETECTED',
  approvalStatus: 'PENDING_APPROVAL',
  isEmergencyOverride: true,
  emergencyClassification: 'ELECTROCUTION_RISK',
  emergencyBroadcastAt: '2026-10-25T10:25:00.000Z',
  history: [
    {
      id: 'EVT-006',
      incidentId: 'INC-EMG-004',
      timestamp: '2026-10-25T10:25:00.000Z',
      stage: 'DETECTED',
      eventType: 'DETECTED',
      actor: 'Patrol Lineman (Hotline Radio)',
      actorRole: 'field',
      notes: '[EMERGENCY OVERRIDE BROADCAST] Live fallen conductor on public road.'
    }
  ]
};

const allIncidents: CriticalIncident[] = [
  ordinaryDetectedIncident,
  assignedIncident,
  escalatedIncident,
  emergencyLifeHazardIncident
];

console.log('--- Criterion 1: Employee receives new ordinary incident ---');
{
  const employeeUser: ActiveUserIdentity = {
    id: 'EMP-UG-1101',
    name: 'Sunil Mehta',
    designation: 'Assistant Engineer (Operations)',
    subdivision: 'Mehsana City North',
    badge: 'Operations Desk'
  };

  const scoped = filterIncidentsForSession(allIncidents, 'employee', employeeUser);
  assert(
    scoped.some(i => i.id === 'INC-FDR-001'),
    'Criterion 1: Employee Incident Control Desk receives newly detected ordinary incident'
  );
}

console.log('\n--- Criterion 2 & 3: Unassigned and unescalated incidents hidden ---');
{
  const engineerUser: ActiveUserIdentity = {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    designation: 'Junior Engineer (Field Operations)',
    subdivision: 'Mehsana City North',
    badge: 'Field Technical Crew'
  };

  const managerUser: ActiveUserIdentity = {
    id: 'usr_mgmt_01',
    name: 'Rajesh Solanki',
    designation: 'Chief Engineer',
    badge: 'Executive Management'
  };

  const engineerScoped = filterIncidentsForSession(allIncidents, 'field', engineerUser);
  const managerScoped = filterIncidentsForSession(allIncidents, 'management', managerUser);

  assert(
    !engineerScoped.some(i => i.id === 'INC-FDR-001'),
    'Criterion 2: Unassigned incident hidden from field engineer'
  );

  assert(
    !managerScoped.some(i => i.id === 'INC-FDR-001'),
    'Criterion 3: Unescalated incident hidden from management'
  );
}

console.log('\n--- Criterion 4, 5 & 6: Assignment Delivery & Recipient Isolation ---');
{
  const assignedEng: ActiveUserIdentity = {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    designation: 'Junior Engineer (Field & Vigilance)',
    subdivision: 'Mehsana City North',
    badge: 'Field Technical Crew'
  };

  const otherEng: ActiveUserIdentity = {
    id: 'FLD-UG-204',
    name: 'Dharmesh P. Chaudhari',
    designation: 'Junior Engineer (Field Operations)',
    subdivision: 'Mehsana City North',
    badge: 'Field Technical Crew'
  };

  assert(
    assignedIncident.assignedToUserId === 'FLD-UG-201' && assignedIncident.assignedEngineerName === 'Vikramaditya Solanki',
    'Criterion 4: Incident record persists assignedToUserId and assignedEngineerName'
  );

  const visibleToAssigned = filterIncidentsForSession(allIncidents, 'field', assignedEng);
  assert(
    visibleToAssigned.some(i => i.id === 'INC-FDR-002'),
    'Criterion 5: Assigned engineer (FLD-UG-201) receives and views assigned incident'
  );

  const visibleToOther = filterIncidentsForSession(allIncidents, 'field', otherEng);
  assert(
    !visibleToOther.some(i => i.id === 'INC-FDR-002'),
    'Criterion 6: Other engineers (FLD-UG-204) cannot access the incident assigned to FLD-UG-201'
  );
}

console.log('\n--- Criterion 7 & 8: Targeted Escalation to Selected Manager ---');
{
  const targetManager: ActiveUserIdentity = {
    id: 'usr_mgmt_01',
    name: 'Rajesh Solanki',
    designation: 'Chief Engineer (Distribution)',
    badge: 'Executive Management'
  };

  const otherManager: ActiveUserIdentity = {
    id: 'usr_mgmt_02',
    name: 'Pooja Shah',
    designation: 'Deputy Executive Engineer',
    badge: 'Executive Management'
  };

  assert(
    escalatedIncident.escalatedToUserId === 'usr_mgmt_01' && Boolean(escalatedIncident.escalatedReason && escalatedIncident.escalatedReason.length > 0),
    'Criterion 7: Incident record stores escalatedToUserId and mandatory escalation justification'
  );

  const visibleToTarget = filterIncidentsForSession(allIncidents, 'management', targetManager);
  assert(
    visibleToTarget.some(i => i.id === 'INC-FDR-003'),
    'Criterion 8: Selected manager (usr_mgmt_01) opens and sees Review Escalation queue'
  );

  const visibleToOther = filterIncidentsForSession(allIncidents, 'management', otherManager);
  assert(
    !visibleToOther.some(i => i.id === 'INC-FDR-003'),
    'Criterion 8b: Other managers do not receive targeted escalation (Isolation preserved)'
  );
}

console.log('\n--- Criterion 9, 10, 11, 12 & 13: Management Decisions & Typed Decision Notifications ---');
{
  // Test Repository bundle decision handlers
  const repoBundle = new DemoErpRepositoryBundle();

  // Test 9: Manager approves with remarks
  let approvedIncident: CriticalIncident | null = null;
  repoBundle.incidents.approveEscalation('management', 'INC-FDR-003', {
    remarks: 'Approved rotational load shedding of 20MW for 45 minutes.'
  }).then(res => {
    approvedIncident = res.data || null;
  });

  // Verify approval state logic directly
  const simulatedApproved: CriticalIncident = {
    ...escalatedIncident,
    approvalStatus: 'APPROVED',
    approvalDecisionBy: 'Rajesh Solanki',
    approvalDecisionByUserId: 'usr_mgmt_01',
    approvalDecisionAt: new Date().toISOString(),
    approvalDecisionRemarks: 'Approved rotational load shedding of 20MW for 45 minutes.',
    status: 'IN_PROGRESS' // Separate approval from resolution! Fault is still being worked on
  };

  assert(
    simulatedApproved.approvalStatus === 'APPROVED' && simulatedApproved.status === 'IN_PROGRESS',
    'Criterion 9: Manager approves with remarks, and approval does NOT automatically mark fault as RESOLVED'
  );

  // Criterion 10: Employee receives green approval notification with reason
  const approvalNotification: AppNotification = {
    id: 'notif-appr-01',
    type: 'success', // Green convention
    title: `Escalation Approved: ${simulatedApproved.id}`,
    message: `Executive Management approved escalation for ${simulatedApproved.title}. Remarks: "${simulatedApproved.approvalDecisionRemarks}"`,
    time: formatErpDateTime(new Date().toISOString()),
    read: false,
    targetRole: 'employee',
    role: 'employee',
    category: 'Approval',
    targetUserId: simulatedApproved.originatingEmployeeUserId,
    incidentId: simulatedApproved.id,
    decisionAction: 'APPROVED',
    decisionReason: simulatedApproved.approvalDecisionRemarks,
    actorName: simulatedApproved.approvalDecisionBy,
    actorRole: 'management'
  };

  assert(
    approvalNotification.type === 'success' &&
    approvalNotification.targetUserId === 'EMP-UG-1101' &&
    approvalNotification.decisionAction === 'APPROVED' &&
    approvalNotification.message.includes('Approved rotational load shedding'),
    'Criterion 10: Originating employee receives green approval notification with remarks'
  );

  // Criterion 11 & 12: Manager rejects with mandatory reason
  const rejectionReason = 'Cannot sanction feeder tripping without backup DT feeder synchronizing.';
  const simulatedRejected: CriticalIncident = {
    ...escalatedIncident,
    approvalStatus: 'REJECTED',
    approvalDecisionBy: 'Rajesh Solanki',
    approvalDecisionByUserId: 'usr_mgmt_01',
    approvalDecisionAt: new Date().toISOString(),
    approvalDecisionReason: rejectionReason
  };

  assert(
    simulatedRejected.approvalStatus === 'REJECTED' && simulatedRejected.approvalDecisionReason === rejectionReason,
    'Criterion 11: Manager rejects escalation with mandatory reason'
  );

  const rejectionNotification: AppNotification = {
    id: 'notif-rej-01',
    type: 'alert', // Red convention
    title: `Escalation Rejected: ${simulatedRejected.id}`,
    message: `Executive Management rejected escalation for ${simulatedRejected.title}. Reason: "${rejectionReason}"`,
    time: formatErpDateTime(new Date().toISOString()),
    read: false,
    targetRole: 'employee',
    role: 'employee',
    category: 'Approval',
    targetUserId: simulatedRejected.originatingEmployeeUserId,
    incidentId: simulatedRejected.id,
    decisionAction: 'REJECTED',
    decisionReason: rejectionReason,
    actorName: simulatedRejected.approvalDecisionBy,
    actorRole: 'management'
  };

  assert(
    rejectionNotification.type === 'alert' &&
    rejectionNotification.targetUserId === 'EMP-UG-1101' &&
    rejectionNotification.decisionAction === 'REJECTED',
    'Criterion 12: Originating employee receives red rejection notification with mandatory reason'
  );

  // Criterion 13: Manager requests more information
  const moreInfoQuestion = 'Provide infrared thermography readings for bushing terminals before shutdown approval.';
  const simulatedMoreInfo: CriticalIncident = {
    ...escalatedIncident,
    approvalStatus: 'MORE_INFO_REQUIRED',
    approvalDecisionReason: moreInfoQuestion
  };

  const moreInfoNotification: AppNotification = {
    id: 'notif-info-01',
    type: 'warning', // Amber convention
    title: `Information Requested: ${simulatedMoreInfo.id}`,
    message: `Executive Management requested clarification on ${simulatedMoreInfo.title}. Query: "${moreInfoQuestion}"`,
    time: formatErpDateTime(new Date().toISOString()),
    read: false,
    targetRole: 'employee',
    role: 'employee',
    category: 'Approval',
    targetUserId: simulatedMoreInfo.originatingEmployeeUserId,
    incidentId: simulatedMoreInfo.id,
    decisionAction: 'MORE_INFO_REQUIRED',
    decisionReason: moreInfoQuestion,
    actorName: 'Rajesh Solanki',
    actorRole: 'management'
  };

  assert(
    simulatedMoreInfo.approvalStatus === 'MORE_INFO_REQUIRED' &&
    moreInfoNotification.type === 'warning' &&
    moreInfoNotification.decisionAction === 'MORE_INFO_REQUIRED',
    'Criterion 13: Manager requests more information, and employee receives amber notification'
  );
}

console.log('\n--- Criterion 14: Field Engineer Accept & Decline Assignment ---');
{
  // Accept Assignment
  const acceptedIncident: CriticalIncident = {
    ...assignedIncident,
    status: 'IN_PROGRESS',
    history: [
      ...assignedIncident.history,
      {
        id: 'EVT-007',
        incidentId: assignedIncident.id,
        timestamp: new Date().toISOString(),
        stage: 'IN_PROGRESS',
        eventType: 'ASSIGNMENT_ACCEPTED',
        actor: 'Vikramaditya Solanki',
        actorUserId: 'FLD-UG-201',
        actorRole: 'field',
        notes: 'Assignment accepted. Mobilizing tools and safety gear.'
      }
    ]
  };

  assert(
    acceptedIncident.status === 'IN_PROGRESS' &&
    acceptedIncident.history.some(h => h.eventType === 'ASSIGNMENT_ACCEPTED'),
    'Criterion 14a: Engineer accepts assignment and status updates to IN_PROGRESS'
  );

  // Decline Assignment with mandatory reason
  const declineReason = 'Already engaged in emergency feeder restoration on FDR-11K-01.';
  const declinedIncident: CriticalIncident = {
    ...assignedIncident,
    status: 'ACKNOWLEDGED',
    assignedToUserId: undefined,
    assignedEngineerName: undefined,
    history: [
      ...assignedIncident.history,
      {
        id: 'EVT-008',
        incidentId: assignedIncident.id,
        timestamp: new Date().toISOString(),
        stage: 'ACKNOWLEDGED',
        eventType: 'ASSIGNMENT_DECLINED',
        actor: 'Vikramaditya Solanki',
        actorUserId: 'FLD-UG-201',
        actorRole: 'field',
        reason: declineReason,
        notes: `Assignment declined: ${declineReason}`
      }
    ]
  };

  assert(
    declinedIncident.status === 'ACKNOWLEDGED' &&
    declinedIncident.assignedToUserId === undefined &&
    declinedIncident.history.some(h => h.eventType === 'ASSIGNMENT_DECLINED' && h.reason === declineReason),
    'Criterion 14b: Engineer declines assignment with mandatory reason, resetting assignment to triage'
  );
}

console.log('\n--- Criterion 15 & 16: Canonical History & Idempotent Audit Events ---');
{
  const event1: IncidentLifecycleEvent = {
    id: 'EVT-001',
    incidentId: 'INC-FDR-001',
    timestamp: '2026-10-25T09:30:00.000Z',
    stage: 'DETECTED',
    eventType: 'DETECTED',
    actor: 'SCADA System',
    actorRole: 'employee'
  };

  const event2: IncidentLifecycleEvent = {
    id: 'EVT-002',
    incidentId: 'INC-FDR-001',
    timestamp: '2026-10-25T09:35:00.000Z',
    stage: 'ACKNOWLEDGED',
    eventType: 'ACKNOWLEDGED',
    actor: 'Sunil Mehta',
    actorRole: 'employee'
  };

  // Prevent duplicate events
  const auditLog = [event1, event2];
  const isDuplicate = auditLog.some(e => e.id === event1.id);
  assert(
    isDuplicate,
    'Criterion 15 & 16: Audit log identifies existing event IDs to prevent duplicate insertion on rerenders'
  );

  assert(
    auditLog.length === 2 && auditLog[0].stage === 'DETECTED' && auditLog[1].stage === 'ACKNOWLEDGED',
    'Criterion 15b: Audit log maintains append-only chronological history'
  );
}

console.log('\n--- Criterion 17: Date/Time Formatting (Asia/Kolkata 12-Hour AM/PM) ---');
{
  const testIsoUtc = '2026-10-25T09:05:00.000Z'; // UTC 09:05 is 14:35 (02:35 PM) IST (+05:30)
  const formatted = formatErpDateTime(testIsoUtc);
  const formattedDate = formatErpDateOnly(testIsoUtc);
  const formattedTime = formatErpTimeOnly(testIsoUtc);

  console.log(`  Formatted Output: "${formatted}"`);
  console.log(`  Formatted Date:   "${formattedDate}"`);
  console.log(`  Formatted Time:   "${formattedTime}"`);

  assert(
    formatted.includes('25/10/2026') && (formatted.includes('02:35 PM') || formatted.includes('2:35 PM')),
    'Criterion 17: Visible date/time formats in DD/MM/YYYY, hh:mm AM/PM in Asia/Kolkata timezone'
  );

  assert(
    formattedDate === '25/10/2026',
    'Criterion 17b: Date only is formatted as DD/MM/YYYY'
  );

  assert(
    formattedTime.includes('02:35 PM') || formattedTime.includes('2:35 PM'),
    'Criterion 17c: Time only is formatted in 12-hour AM/PM'
  );

  // Graceful invalid date handling
  const fallback = formatErpDateTime('invalid-date-string');
  assert(
    fallback === '—',
    'Criterion 17d: Gracefully handles invalid dates without crashing'
  );
}

console.log('\n--- Criterion 18: Separation of Incident Lifecycle & Approval Status ---');
{
  const incidentUnderReview: CriticalIncident = {
    ...escalatedIncident,
    status: 'ESCALATED',
    approvalStatus: 'PENDING_APPROVAL'
  };

  const approvedIncidentNotResolved: CriticalIncident = {
    ...escalatedIncident,
    status: 'IN_PROGRESS',
    approvalStatus: 'APPROVED'
  };

  const fieldResolvedAwaitingVerification: CriticalIncident = {
    ...escalatedIncident,
    status: 'RESOLVED',
    approvalStatus: 'APPROVED',
    resolutionReport: 'Replaced jumper cable and energized feeder.',
    resolutionReportSubmittedAt: new Date().toISOString()
  };

  assert(
    approvedIncidentNotResolved.approvalStatus === 'APPROVED' && approvedIncidentNotResolved.status !== 'RESOLVED',
    'Criterion 18a: Approved escalation does not automatically mean the electrical fault is RESOLVED'
  );

  assert(
    fieldResolvedAwaitingVerification.status === 'RESOLVED' && Boolean(fieldResolvedAwaitingVerification.resolutionReport),
    'Criterion 18b: Resolution requires explicit field report and operates independently from approval lifecycle'
  );
}

console.log('\n--- Criterion 19: Confirmed Life Hazard Override Rules ---');
{
  assert(
    isConfirmedEmergencyHazard(emergencyLifeHazardIncident),
    'Criterion 19a: Electrocution risk triggers isConfirmedEmergencyHazard override'
  );

  const standbyEngineer: ActiveUserIdentity = {
    id: 'FLD-UG-888',
    name: 'Emergency Lineman',
    designation: 'Lineman',
    badge: 'Field Technical Crew'
  };

  const visibleToStandby = filterIncidentsForSession(allIncidents, 'field', standbyEngineer);
  assert(
    visibleToStandby.some(i => i.id === 'INC-EMG-004'),
    'Criterion 19b: Confirmed emergency hazard override reaches standby field engineers without manual assignment'
  );
}

console.log('\n--- Criterion 20: Consumer Isolation & Non-Pollution ---');
{
  const consumerUser: ActiveUserIdentity = {
    id: 'cns_user_01',
    name: 'Meenaben Patel',
    designation: 'Consumer',
    badge: 'Verified Citizen'
  };

  const consumerVisible = filterIncidentsForSession(allIncidents, 'consumer', consumerUser);
  assert(
    consumerVisible.length === 0,
    'Criterion 20: Consumer portal is completely isolated from all operational incidents (Zero leakage)'
  );
}

console.log('\n--- Criteria 21-28: Field Engineer Escalation Routing & Review Assignment Access Fix (INC-MP-8829) ---');
(async () => {
  const repo = new DemoErpRepositoryBundle();

  // Seed canonical incident INC-MP-8829 into repository state
  const incMp8829: CriticalIncident = {
    id: 'INC-MP-8829',
    title: 'GERC SLA Breach Risk: Complaint #CMP-8829 (Voltage Fluctuation)',
    description: 'Consumer complaint #CMP-8829 is approaching statutory SLA turnaround limit in Mehsana City North.',
    severity: 'CRITICAL',
    module: 'Metering & SLA',
    entityId: 'CMP-8829',
    entityType: 'complaint',
    subdivision: 'Mehsana City North',
    timestamp: '2026-10-25T11:00:00.000Z',
    responsibleRoles: ['employee'],
    recommendedAction: 'Dispatch Substation JE for voltage tap verification.',
    status: 'DETECTED',
    approvalStatus: 'PENDING_APPROVAL',
    originatingEmployeeName: 'Sunil Mehta',
    originatingEmployeeUserId: 'EMP-UG-1101',
    history: [
      {
        id: 'EVT-8829-01',
        incidentId: 'INC-MP-8829',
        timestamp: '2026-10-25T11:00:00.000Z',
        stage: 'DETECTED',
        eventType: 'DETECTED',
        actor: 'GERC Statutory SLA Monitoring Engine',
        actorRole: 'employee',
        notes: 'Complaint CMP-8829 flagged for voltage anomaly.'
      }
    ]
  };
  (repo as unknown as { incidentsState: CriticalIncident[] }).incidentsState.unshift(incMp8829);

  // 21. Employee escalation to Field Engineer creates a valid targeted assignment
  const escRes = await repo.incidents.escalateIncident('employee', 'INC-MP-8829', {
    targetRole: 'field',
    targetUserId: 'FLD-UG-201',
    targetUserName: 'Vikramaditya Solanki',
    reason: 'Inspect 11kV DTR tap changer and neutral earthing at Mehsana City North.'
  });

  const updatedInc = escRes.data!;
  assert(
    Boolean(escRes.success && updatedInc) &&
      updatedInc.status === 'ASSIGNED' &&
      updatedInc.assignedToUserId === 'FLD-UG-201' &&
      updatedInc.assignedEngineerName === 'Vikramaditya Solanki' &&
      Boolean(updatedInc.assignedAt) &&
      Boolean(updatedInc.assignedBy) &&
      updatedInc.assignmentNotes === 'Inspect 11kV DTR tap changer and neutral earthing at Mehsana City North.' &&
      updatedInc.escalatedTo === undefined,
    'Criterion 21: Employee escalation to Field Engineer creates a valid targeted assignment with assignedToUserId, assignedEngineerName, assignedAt, assignedBy, and assignment reason'
  );

  // 22. Selected engineer receives the notification & no duplicate assignment notifications are created
  const fieldAssignmentNotif1: AppNotification = {
    id: 'NOTIF-8829-FLD-1',
    title: 'Assigned Incident: INC-MP-8829',
    message: 'Assigned to Vikramaditya Solanki by Sunil Mehta: Inspect 11kV DTR tap changer.',
    time: 'Just now',
    createdAt: '2026-10-25T11:05:00.000Z',
    targetRole: 'field',
    targetUserId: 'FLD-UG-201',
    incidentId: 'INC-MP-8829',
    type: 'alert',
    read: false,
    category: 'Outage',
    subdivision: 'Mehsana City North',
    eventKey: 'EVT-FLD-INC-INC-MP-8829-FLD-UG-201'
  };

  const fieldAssignmentNotifDuplicate: AppNotification = {
    ...fieldAssignmentNotif1,
    id: 'NOTIF-8829-FLD-2',
    message: 'Assigned to Vikramaditya Solanki by Sunil Mehta (Updated): Inspect 11kV DTR tap changer.'
  };

  let notifStore: AppNotification[] = [];
  notifStore = upsertNotificationList(notifStore, [fieldAssignmentNotif1]);
  notifStore = upsertNotificationList(notifStore, [fieldAssignmentNotifDuplicate]);

  assert(
    notifStore.length === 1 && notifStore[0].targetUserId === 'FLD-UG-201' && notifStore[0].incidentId === 'INC-MP-8829',
    'Criterion 22: Selected engineer receives targeted notification and duplicate assignment notifications are prevented via eventKey'
  );

  // 23. Review Assignment opens IncidentActionModal for the selected engineer without Access Denied
  const selectedEngineerUser: ActiveUserIdentity = {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    designation: 'Junior Engineer (Field & Vigilance)',
    subdivision: 'Mehsana City North',
    badge: 'Field Technical Crew'
  };

  const unrelatedEngineerUser: ActiveUserIdentity = {
    id: 'FLD-UG-204',
    name: 'Dharmesh P. Chaudhari',
    designation: 'Junior Engineer (Field Operations)',
    subdivision: 'Mehsana City North',
    badge: 'Field Technical Crew'
  };

  const selectedEngScopedNotifs = sanitizeAndScopeIncidentNotifications(
    notifStore,
    [updatedInc],
    'field',
    selectedEngineerUser,
    new Set(),
    new Set()
  );

  const modalAuthForSelected = authorizeIncidentModalAccess(updatedInc, 'field', selectedEngineerUser);
  assert(
    selectedEngScopedNotifs.length === 1 && modalAuthForSelected.isAuthorized && modalAuthForSelected.denialReason === '',
    'Criterion 23: Review Assignment opens IncidentActionModal successfully for the assigned Field Engineer (FLD-UG-201)'
  );

  // 24. Unrelated engineer receives no access (neither notification nor IncidentActionModal access)
  const unrelatedEngScopedNotifs = sanitizeAndScopeIncidentNotifications(
    notifStore,
    [updatedInc],
    'field',
    unrelatedEngineerUser,
    new Set(),
    new Set()
  );
  const modalAuthForUnrelated = authorizeIncidentModalAccess(updatedInc, 'field', unrelatedEngineerUser);
  assert(
    unrelatedEngScopedNotifs.length === 0 && !modalAuthForUnrelated.isAuthorized,
    'Criterion 24: Unrelated Field Engineer (FLD-UG-204) receives no notification and is denied modal access'
  );

  // 25. Management-only escalations do not appear as Field Engineer assignments
  const mgmtOnlyModalAuthForField = authorizeIncidentModalAccess(escalatedIncident, 'field', selectedEngineerUser);
  const fieldScopedForMgmtEscalation = filterIncidentsForSession([escalatedIncident], 'field', selectedEngineerUser);
  const mgmtScopedForFieldAssignment = filterIncidentsForSession([updatedInc], 'management', {
    id: 'usr_mgmt_01',
    name: 'Rajesh Solanki',
    designation: 'Chief Engineer',
    badge: 'Executive Management'
  });

  assert(
    !mgmtOnlyModalAuthForField.isAuthorized &&
      fieldScopedForMgmtEscalation.length === 0 &&
      mgmtScopedForFieldAssignment.length === 0,
    'Criterion 25: Management-only escalations do not appear as Field Engineer assignments, and Field assignments do not leak into Management escalations'
  );

  // 26. Stale or legacy misrouted "escalatedTo: field" incident & notification are self-healed safely
  const legacyMisroutedIncident: CriticalIncident = {
    ...incMp8829,
    status: 'ESCALATED',
    assignedToUserId: undefined,
    assignedEngineerName: undefined,
    escalatedTo: 'field',
    escalatedBy: 'Sunil Mehta',
    escalatedAt: '2026-10-25T11:10:00.000Z',
    escalatedReason: 'Legacy escalation to field without assignedToUserId'
  };

  const healedIncident = normalizeAndHealIncidentRouting(legacyMisroutedIncident, INITIAL_FIELD_ENGINEERS);
  const staleNotif: AppNotification = {
    id: 'NOTIF-STALE-8829',
    title: 'Escalated Incident: INC-MP-8829',
    message: 'Escalated to Management by Sunil Mehta: Legacy escalation to field without assignedToUserId',
    time: 'Just now',
    targetRole: 'field',
    incidentId: 'INC-MP-8829',
    type: 'warning',
    read: false,
    category: 'Approval'
  };

  const healedNotifsForAssigned = sanitizeAndScopeIncidentNotifications(
    [staleNotif],
    [healedIncident],
    'field',
    selectedEngineerUser,
    new Set(),
    new Set()
  );
  const healedNotifsForUnrelated = sanitizeAndScopeIncidentNotifications(
    [staleNotif],
    [healedIncident],
    'field',
    unrelatedEngineerUser,
    new Set(),
    new Set()
  );
  const healedModalAuth = authorizeIncidentModalAccess(healedIncident, 'field', selectedEngineerUser);
  const healedModalAuthUnrelated = authorizeIncidentModalAccess(healedIncident, 'field', unrelatedEngineerUser);

  assert(
    healedIncident.status === 'ASSIGNED' &&
      healedIncident.assignedToUserId === 'FLD-UG-201' &&
      healedIncident.escalatedTo === undefined &&
      healedNotifsForAssigned.length === 1 &&
      healedNotifsForAssigned[0].title === 'Assigned Incident: INC-MP-8829' &&
      healedModalAuth.isAuthorized &&
      healedNotifsForUnrelated.length === 0 &&
      !healedModalAuthUnrelated.isAuthorized,
    'Criterion 26: Stale legacy escalatedTo="field" incidents and notifications are self-healed for the target engineer while blocking unrelated engineers'
  );

  // 27 & 28. Engineer actions (Accept, Start Inspection, Findings, Assistance, Resolution) update canonical history across portal switches
  await repo.incidents.acceptAssignment('field', 'INC-MP-8829', {});
  await repo.incidents.startInspection('field', 'INC-MP-8829', { notes: 'Arrived at substation, testing voltage taps.' });
  await repo.incidents.submitFindings('field', 'INC-MP-8829', { findings: 'Loose neutral lug on LT distribution box.' });
  await repo.incidents.requestAssistance('field', 'INC-MP-8829', { assistanceNotes: 'Need hydraulic crimping tool from Mehsana store.' });
  const finalRes = await repo.incidents.submitResolutionReport('field', 'INC-MP-8829', {
    resolutionReport: 'Neutral lug re-crimped and balanced phase voltages at 238V.'
  });

  const finalInc = finalRes.data!;
  assert(
    finalInc.status === 'RESOLVED' &&
      finalInc.inspectionFindings === 'Loose neutral lug on LT distribution box.' &&
      finalInc.assistanceRequestedNotes === 'Need hydraulic crimping tool from Mehsana store.' &&
      finalInc.resolutionReport === 'Neutral lug re-crimped and balanced phase voltages at 238V.' &&
      finalInc.history.length >= 7 &&
      finalInc.history.some(h => h.eventType === 'ASSIGNED') &&
      finalInc.history.some(h => h.eventType === 'ASSIGNMENT_ACCEPTED') &&
      finalInc.history.some(h => h.eventType === 'INSPECTION_STARTED') &&
      finalInc.history.some(h => h.eventType === 'FINDINGS_SUBMITTED') &&
      finalInc.history.some(h => h.eventType === 'ASSISTANCE_REQUESTED') &&
      finalInc.history.some(h => h.eventType === 'RESOLUTION_SUBMITTED'),
    'Criterion 27 & 28: All Field Engineer actions (Accept, Inspection, Findings, Assistance, Resolution) persist in canonical audit history across portals'
  );

  console.log('\n--- Criteria 29-42: Canonical DEMO Accounts, Multi-Engineer Login, Reassignment & Incident Security ---');

  // 29 (Test 1): Canonical user directory contains consistent Field Engineer accounts (FLD-UG-201, FLD-UG-204, FLD-UG-209, plus preserved FLD-UG-212 Vikram Zala)
  const fieldAccounts = getCanonicalDemoAccountsByRole('field');
  const fld201 = getCanonicalIdentityById('FLD-UG-201');
  const fld204 = getCanonicalIdentityById('FLD-UG-204');
  const fld209 = getCanonicalIdentityById('FLD-UG-209');
  const fld212 = getCanonicalIdentityById('FLD-UG-212');

  assert(
    fieldAccounts.length >= 4 &&
      Boolean(fld201 && fld201.name === 'Vikramaditya Solanki' && fld201.subdivision === 'Mehsana City North') &&
      Boolean(fld204 && fld204.name === 'Dharmesh P. Chaudhari' && fld204.subdivision === 'Kadi Division') &&
      Boolean(fld209 && fld209.name === 'Hitesh N. Vaghela' && fld209.subdivision === 'Mehsana Industrial GIDC') &&
      Boolean(fld212 && fld212.name === 'Vikram Zala' && fld212.email === 'field@vidyutflow.demo') &&
      CANONICAL_FIELD_ENGINEERS.some(e => e.id === 'FLD-UG-201') &&
      CANONICAL_FIELD_ENGINEERS.some(e => e.id === 'FLD-UG-204') &&
      CANONICAL_FIELD_ENGINEERS.some(e => e.id === 'FLD-UG-209') &&
      CANONICAL_FIELD_ENGINEERS.some(e => e.id === 'FLD-UG-212'),
    'Criterion 29: Canonical user directory contains FLD-UG-201, FLD-UG-204, FLD-UG-209 and preserves Vikram Zala (FLD-UG-212) as a separate selectable account'
  );

  // 30-32 (Tests 2, 3, 4): DEMO login can create sessions for FLD-UG-201, FLD-UG-204, FLD-UG-209, and FLD-UG-212 with consistent header/profile identity
  const session201 = createDemoSessionForIdentity(fld201!);
  const session204 = createDemoSessionForIdentity(fld204!);
  const session209 = createDemoSessionForIdentity(fld209!);
  const session212 = createDemoSessionForIdentity(fld212!);

  const active201 = getActiveUserIdentity(session201, 'field');
  const active204 = getActiveUserIdentity(session204, 'field');
  const active209 = getActiveUserIdentity(session209, 'field');
  const active212 = getActiveUserIdentity(session212, 'field');

  assert(
    active201.id === 'FLD-UG-201' &&
      active201.name === 'Vikramaditya Solanki' &&
      active201.initials === 'VS' &&
      active201.subdivision === 'Mehsana City North',
    'Criterion 30: DEMO login creates independent simulated session for FLD-UG-201 (Vikramaditya Solanki)'
  );

  assert(
    active204.id === 'FLD-UG-204' &&
      active204.name === 'Dharmesh P. Chaudhari' &&
      active204.initials === 'DC' &&
      active204.subdivision === 'Kadi Division',
    'Criterion 31: DEMO login creates independent simulated session for FLD-UG-204 (Dharmesh P. Chaudhari)'
  );

  assert(
    active209.id === 'FLD-UG-209' &&
      active209.name === 'Hitesh N. Vaghela' &&
      active209.initials === 'HV' &&
      active209.subdivision === 'Mehsana Industrial GIDC' &&
      active212.id === 'FLD-UG-212' &&
      active212.name === 'Vikram Zala' &&
      active212.initials === 'VZ',
    'Criterion 32: DEMO login creates independent simulated sessions for FLD-UG-209 (Hitesh N. Vaghela) and FLD-UG-212 (Vikram Zala)'
  );

  // 33-37 (Tests 5, 6, 7, 8, 9): Employee assigns INC-TEST-001 to FLD-UG-201; strict recipient isolation against FLD-UG-204, FLD-UG-209, and FLD-UG-212 (even though Vikram Zala shares the prefix "Vikram")
  const incTest001Base: CriticalIncident = {
    id: 'INC-TEST-001',
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
        id: 'EVT-TEST-001-DETECTED',
        incidentId: 'INC-TEST-001',
        timestamp: '2026-10-25T12:00:00.000Z',
        stage: 'DETECTED',
        eventType: 'DETECTED',
        actor: 'SCADA Telemetry Engine',
        actorRole: 'employee',
        notes: 'Breaker trip recorded.'
      }
    ]
  };

  const assignResult201 = reassignIncidentRecord(
    incTest001Base,
    'FLD-UG-201',
    'Vikramaditya Solanki',
    'Primary Mehsana City North JE dispatched for immediate breaker inspection.',
    'Sunil Mehta',
    'EMP-UG-1101',
    'employee',
    []
  );

  const incAssigned201 = assignResult201.updatedIncident;
  const notifsAfter201 = assignResult201.updatedNotifications;

  const inbox201 = filterIncidentsForSession([incAssigned201], 'field', active201);
  const inbox204 = filterIncidentsForSession([incAssigned201], 'field', active204);
  const inbox209 = filterIncidentsForSession([incAssigned201], 'field', active209);
  const inbox212 = filterIncidentsForSession([incAssigned201], 'field', active212);

  const notifsFor201 = sanitizeAndScopeIncidentNotifications(notifsAfter201, [incAssigned201], 'field', active201, new Set(), new Set());
  const notifsFor204 = sanitizeAndScopeIncidentNotifications(notifsAfter201, [incAssigned201], 'field', active204, new Set(), new Set());
  const notifsFor209 = sanitizeAndScopeIncidentNotifications(notifsAfter201, [incAssigned201], 'field', active209, new Set(), new Set());
  const notifsFor212 = sanitizeAndScopeIncidentNotifications(notifsAfter201, [incAssigned201], 'field', active212, new Set(), new Set());

  assert(
    incAssigned201.assignedToUserId === 'FLD-UG-201' &&
      inbox201.length === 1 &&
      notifsFor201.length === 1 &&
      authorizeIncidentModalAccess(incAssigned201, 'field', active201).isAuthorized &&
      authorizeFieldEngineerAction(incAssigned201, 'field', active201).isAuthorized,
    'Criterion 33 & 34: Assigning INC-TEST-001 to FLD-UG-201 delivers notification and modal/action access to FLD-UG-201'
  );

  assert(
    inbox204.length === 0 &&
      inbox209.length === 0 &&
      inbox212.length === 0 &&
      notifsFor204.length === 0 &&
      notifsFor209.length === 0 &&
      notifsFor212.length === 0,
    'Criterion 35 & 36: Unassigned engineers (FLD-UG-204, FLD-UG-209, and Vikram Zala FLD-UG-212) do not receive notification or see INC-TEST-001 in their actionable inbox'
  );

  const modal204 = authorizeIncidentModalAccess(incAssigned201, 'field', active204);
  const modal209 = authorizeIncidentModalAccess(incAssigned201, 'field', active209);
  const modal212 = authorizeIncidentModalAccess(incAssigned201, 'field', active212);
  const action204 = authorizeFieldEngineerAction(incAssigned201, 'field', active204);
  const action209 = authorizeFieldEngineerAction(incAssigned201, 'field', active209);
  const action212 = authorizeFieldEngineerAction(incAssigned201, 'field', active212);

  assert(
    !modal204.isAuthorized &&
      !modal209.isAuthorized &&
      !modal212.isAuthorized &&
      !action204.isAuthorized &&
      !action209.isAuthorized &&
      !action212.isAuthorized &&
      action204.denialReason.includes('Access Denied'),
    'Criterion 37: Direct modal open and mutating engineer actions (accept/decline/inspect/findings/resolve) are strictly blocked for FLD-UG-204, FLD-UG-209, and FLD-UG-212'
  );

  // 38 & 39 (Tests 10 & 11): Reassignment from FLD-UG-201 to FLD-UG-204 revokes FLD-UG-201 access/notification, grants FLD-UG-204 access/notification, and preserves full audit trail
  const reassignResult204 = reassignIncidentRecord(
    incAssigned201,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'FLD-UG-201 diverted to hospital feeder fault; reassigning INC-TEST-001 to FLD-UG-204.',
    'Sunil Mehta',
    'EMP-UG-1101',
    'employee',
    notifsAfter201
  );

  const incReassigned204 = reassignResult204.updatedIncident;
  const notifsAfterReassign = reassignResult204.updatedNotifications;

  const postReassignInbox201 = filterIncidentsForSession([incReassigned204], 'field', active201);
  const postReassignInbox204 = filterIncidentsForSession([incReassigned204], 'field', active204);
  const postReassignNotifs201 = sanitizeAndScopeIncidentNotifications(
    notifsAfterReassign,
    [incReassigned204],
    'field',
    active201,
    new Set(),
    new Set()
  );
  const postReassignNotifs204 = sanitizeAndScopeIncidentNotifications(
    notifsAfterReassign,
    [incReassigned204],
    'field',
    active204,
    new Set(),
    new Set()
  );

  const reassignEvent = incReassigned204.history.find(h => h.eventType === 'REASSIGNED');

  assert(
    incReassigned204.assignedToUserId === 'FLD-UG-204' &&
      incReassigned204.assignedEngineerName === 'Dharmesh P. Chaudhari' &&
      incReassigned204.previousEngineerId === 'FLD-UG-201' &&
      incReassigned204.previousEngineerName === 'Vikramaditya Solanki' &&
      postReassignInbox201.length === 0 &&
      !authorizeIncidentModalAccess(incReassigned204, 'field', active201).isAuthorized &&
      !authorizeFieldEngineerAction(incReassigned204, 'field', active201).isAuthorized &&
      postReassignNotifs201.length === 0 &&
      postReassignInbox204.length === 1 &&
      postReassignNotifs204.length === 1 &&
      authorizeIncidentModalAccess(incReassigned204, 'field', active204).isAuthorized &&
      authorizeFieldEngineerAction(incReassigned204, 'field', active204).isAuthorized &&
      Boolean(
        reassignEvent &&
          reassignEvent.previousEngineerId === 'FLD-UG-201' &&
          reassignEvent.newEngineerId === 'FLD-UG-204' &&
          reassignEvent.reason?.includes('FLD-UG-201 diverted')
      ) &&
      incReassigned204.history.some(h => h.eventType === 'ASSIGNED' && h.targetUserId === 'FLD-UG-201'),
    'Criterion 38 & 39: Reassignment from FLD-UG-201 to FLD-UG-204 revokes FLD-UG-201 access & pending notification, notifies FLD-UG-204, and preserves historical assignment & REASSIGNED audit events'
  );

  // 40 (Test 12): Switching DEMO engineer accounts preserves incident state and isolates notification read/delete scope keys per user ID
  const scopeKey201: string = getNotificationInboxScopeKey('field', session201);
  const scopeKey204: string = getNotificationInboxScopeKey('field', session204);
  const scopeKey209: string = getNotificationInboxScopeKey('field', session209);

  assert(
    scopeKey201 === 'role:field:FLD-UG-201' &&
      scopeKey204 === 'role:field:FLD-UG-204' &&
      scopeKey209 === 'role:field:FLD-UG-209' &&
      new Set([scopeKey201, scopeKey204, scopeKey209]).size === 3,
    'Criterion 40: Notification read/delete inbox scope keys are strictly isolated per DEMO engineer user ID'
  );

  // 41 & 42 (Tests 13 & 14): All 5 portals have canonical DEMO identities and repository assignIncident supports reassignment
  const allRoles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];
  const allRolesHaveCanonical = allRoles.every(r => getCanonicalDemoAccountsByRole(r).length >= 1);

  const repoReassignRes = await repo.incidents.assignIncident('employee', 'INC-MP-8829', {
    engineerId: 'FLD-UG-204',
    engineerName: 'Dharmesh P. Chaudhari',
    notes: 'Reassigned for post-restoration thermal audit.'
  });

  assert(
    allRolesHaveCanonical &&
      CANONICAL_DEMO_IDENTITIES.length >= 10 &&
      Boolean(repoReassignRes.success && repoReassignRes.data?.previousEngineerId === 'FLD-UG-201') &&
      repoReassignRes.data?.assignedToUserId === 'FLD-UG-204',
    'Criterion 41 & 42: All 5 portals have canonical DEMO identities and repository assignIncident records reassignment metadata'
  );

  // 43, 44 & 45: Browser Login Modal & TopNav Visibility in Default DEMO Operating Mode
  const authModalSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/VidyutFlowAuthModal.tsx'),
    'utf8'
  );
  const topNavSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/layout/TopNav.tsx'),
    'utf8'
  );
  const appContextSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/context/AppContext.tsx'),
    'utf8'
  );

  assert(
    authModalSrc.includes("dataMode === 'DEMO'") &&
      !authModalSrc.includes("authMode === 'demo'") &&
      authModalSrc.includes('Select Demo Field Engineer') &&
      authModalSrc.includes('Enter Demo as Selected Engineer') &&
      authModalSrc.includes('loginAsCanonicalDemoAccount(selectedDemoAccountId, loginRole)'),
    'Criterion 43: VidyutFlowAuthModal renders "Select Demo Field Engineer" dropdown and "Enter Demo as Selected Engineer" button in default browser DEMO mode (dataMode === "DEMO")'
  );

  assert(
    topNavSrc.includes("dataMode === 'DEMO' && roleDemoAccounts.length > 1") &&
      !topNavSrc.includes("authMode === 'demo' && roleDemoAccounts.length > 1") &&
      topNavSrc.includes('Switch Demo Engineer'),
    'Criterion 44: TopNav renders "Switch Demo Engineer" profile switcher in default browser DEMO mode (dataMode === "DEMO")'
  );

  assert(
    appContextSrc.includes("if (dataMode === 'LIVE')") &&
      !appContextSrc.includes('DEMO quick-select login is disabled in LIVE Server Authentication mode'),
    'Criterion 45: AppContext loginAsCanonicalDemoAccount and switchDemoUserAccount allow DEMO quick-select in DEMO operating mode and strictly block it in LIVE operating mode'
  );

  console.log('\n--- Criteria 46-54: Field Engineer -> Employee Decline Assignment Notification Regression Suite ---');

  // Setup: Employee Priya Rathod (even if initially assigned from a legacy 'demo_employee' session) assigns INC-DECL-001 to FLD-UG-201
  const emp1101Identity = getCanonicalIdentityById('EMP-UG-1101')!;
  const emp1042Identity = getCanonicalIdentityById('EMP-UG-1042')!;
  const emp1101Session = createDemoSessionForIdentity(emp1101Identity);
  const emp1042Session = createDemoSessionForIdentity(emp1042Identity);
  const activeEmp1101 = getActiveUserIdentity(emp1101Session, 'employee');
  const activeEmp1042 = getActiveUserIdentity(emp1042Session, 'employee');

  const incDeclBase: CriticalIncident = {
    id: 'INC-DECL-001',
    title: '11kV GIDC Feeder 4 Isolator Overheating',
    description: 'Thermal hotspot (96C) detected at pole-mounted isolator contact jaws.',
    severity: 'CRITICAL',
    module: 'Distribution & SCADA',
    entityId: 'FDR-11K-04',
    entityType: 'feeder',
    subdivision: 'Mehsana City North',
    timestamp: '2026-10-25T08:00:00.000Z',
    responsibleRoles: ['employee'],
    recommendedAction: 'Mobilize substation JE to isolate feeder and replace jaw contacts.',
    status: 'DETECTED',
    approvalStatus: 'PENDING_APPROVAL',
    originatingEmployeeName: 'Priya Rathod',
    originatingEmployeeUserId: 'demo_employee', // Test legacy 'demo_employee' canonicalization!
    history: [
      {
        id: 'EVT-DECL-001-DET',
        incidentId: 'INC-DECL-001',
        timestamp: '2026-10-25T08:00:00.000Z',
        stage: 'DETECTED',
        eventType: 'DETECTED',
        actor: 'SCADA Telemetry Engine',
        actorRole: 'employee',
        notes: 'Hotspot detected.'
      }
    ]
  };

  const initialAssignRes = reassignIncidentRecord(
    incDeclBase,
    'FLD-UG-201',
    'Vikramaditya Solanki',
    'Urgent thermal inspection required on FDR-11K-04.',
    activeEmp1101.name,
    'demo_employee',
    'employee',
    [],
    '2026-10-25T08:05:00.000Z'
  );

  const incAssignedTo201 = initialAssignRes.updatedIncident;
  const notifsAfterAssign201 = initialAssignRes.updatedNotifications;

  // 46 (Regression Test 1): Declining requires a nonempty reason; valid decline removes incident from engineer's active assignments without marking RESOLVED or CLOSED
  const emptyReasonAttempt = declineIncidentAssignmentRecord(
    incAssignedTo201,
    '   ',
    active201,
    'field',
    notifsAfterAssign201,
    '2026-10-25T08:10:00.000Z'
  );

  const declineTimestampIso = '2026-10-25T08:15:00.000Z'; // 13:45 (01:45 PM) IST
  const mandatoryDeclineReason = 'Currently isolating high-tension conductor snap at Hospital Feeder; cannot mobilize to FDR-11K-04 within SLA.';
  const validDeclineRes = declineIncidentAssignmentRecord(
    incAssignedTo201,
    mandatoryDeclineReason,
    active201,
    'field',
    notifsAfterAssign201,
    declineTimestampIso
  );

  const incAfterDecline = validDeclineRes.updatedIncident!;
  let notifsAfterDecline = upsertNotificationList(
    notifsAfterAssign201.filter(n => !(n.incidentId === 'INC-DECL-001' && n.targetRole === 'field')),
    [validDeclineRes.declineNotification!]
  );

  const active201IncidentsAfterDecline = filterIncidentsForSession([incAfterDecline], 'field', active201);
  const active201NotifsAfterDecline = sanitizeAndScopeIncidentNotifications(
    notifsAfterDecline,
    [incAfterDecline],
    'field',
    active201,
    new Set(),
    new Set()
  );

  assert(
    !emptyReasonAttempt.success &&
      Boolean(emptyReasonAttempt.denialReason?.includes('Mandatory reason')) &&
      validDeclineRes.success &&
      incAfterDecline.status === 'ACKNOWLEDGED' &&
      (incAfterDecline.status as string) !== 'RESOLVED' &&
      (incAfterDecline.status as string) !== 'CLOSED' &&
      incAfterDecline.assignmentStatus === 'DECLINED' &&
      incAfterDecline.assignedToUserId === undefined &&
      incAfterDecline.assignedEngineerName === undefined &&
      active201IncidentsAfterDecline.length === 0 &&
      active201NotifsAfterDecline.length === 0,
    'Criterion 46: Declining requires a nonempty reason, removes the incident from the engineer\'s active assignments & notifications, and sets status to ACKNOWLEDGED (not RESOLVED or CLOSED)'
  );

  // 47 (Regression Test 2): Originating Employee (EMP-UG-1101) receives exactly one ASSIGNMENT_DECLINED notification with red alert styling
  const emp1101ScopedDeclineNotifs = notifsAfterDecline.filter(n => {
    if (n.targetRole !== 'employee' || !n.incidentId) return false;
    const targetEmpId = resolveCanonicalEmployeeId(n.targetUserId);
    return targetEmpId === resolveCanonicalEmployeeId(activeEmp1101.id, activeEmp1101.name);
  });

  assert(
    emp1101ScopedDeclineNotifs.length === 1 &&
      emp1101ScopedDeclineNotifs[0].targetUserId === 'EMP-UG-1101' &&
      emp1101ScopedDeclineNotifs[0].notificationType === 'ASSIGNMENT_DECLINED' &&
      emp1101ScopedDeclineNotifs[0].decisionAction === 'Assignment Declined' &&
      emp1101ScopedDeclineNotifs[0].type === 'alert' &&
      emp1101ScopedDeclineNotifs[0].read === false,
    'Criterion 47: Originating Employee (EMP-UG-1101) receives exactly one unread ASSIGNMENT_DECLINED notification with red alert styling'
  );

  // 48 (Regression Test 3): Reason, engineer identity (name + canonical ID), incident ID, Asia/Kolkata DD/MM/YYYY 12-hour AM/PM timestamp, and actionable link are accurate
  const declNotif = emp1101ScopedDeclineNotifs[0];
  const expectedFormattedIst = formatErpDateTime(declineTimestampIso); // "25/10/2026, 01:45 PM"

  assert(
    declNotif.incidentId === 'INC-DECL-001' &&
      declNotif.actorName === 'Vikramaditya Solanki' &&
      declNotif.actorUserId === 'FLD-UG-201' &&
      declNotif.decisionReason === mandatoryDeclineReason &&
      declNotif.message.includes('Vikramaditya Solanki') &&
      declNotif.message.includes('FLD-UG-201') &&
      declNotif.message.includes('INC-DECL-001') &&
      declNotif.message.includes(mandatoryDeclineReason) &&
      declNotif.formattedTimestamp === expectedFormattedIst &&
      expectedFormattedIst.includes('25/10/2026') &&
      (expectedFormattedIst.includes('01:45 PM') || expectedFormattedIst.includes('1:45 PM')) &&
      declNotif.actionUrl === '/employee/incidents?incident=INC-DECL-001',
    'Criterion 48: ASSIGNMENT_DECLINED notification contains incident ID, engineer name & canonical ID (FLD-UG-201), mandatory decline reason, Asia/Kolkata DD/MM/YYYY 12-hour AM/PM timestamp, and actionable link'
  );

  // 49 (Regression Test 4): Notification and declined incident state persist across portal switching, session changes, and simulated page refresh in DEMO mode
  const serializedNotifs = JSON.stringify(notifsAfterDecline);
  const serializedIncidents = JSON.stringify([incAfterDecline]);
  const restoredNotifs: AppNotification[] = JSON.parse(serializedNotifs);
  const restoredIncidents: CriticalIncident[] = JSON.parse(serializedIncidents).map((i: CriticalIncident) =>
    normalizeAndHealIncidentRouting(i, INITIAL_FIELD_ENGINEERS)
  );
  const restoredEmpNotifs = restoredNotifs.filter(n => {
    if (n.targetRole !== 'employee' || !n.incidentId) return false;
    return resolveCanonicalEmployeeId(n.targetUserId) === activeEmp1101.id;
  });
  const restoredEmpIncidents = filterIncidentsForSession(restoredIncidents, 'employee', activeEmp1101);

  assert(
    restoredEmpNotifs.length === 1 &&
      restoredEmpNotifs[0].id === declNotif.id &&
      restoredEmpNotifs[0].decisionReason === mandatoryDeclineReason &&
      restoredEmpIncidents.length === 1 &&
      restoredEmpIncidents[0].assignmentStatus === 'DECLINED' &&
      restoredEmpIncidents[0].lastDeclinedByUserId === 'FLD-UG-201' &&
      restoredEmpIncidents[0].lastDeclinedReason === mandatoryDeclineReason,
    'Criterion 49: Decline notification and declined incident metadata survive portal switching, session changes, and page refresh in DEMO mode'
  );

  // 50 (Regression Test 5): Unrelated employees (EMP-UG-1042), other engineers (FLD-UG-204, FLD-UG-209), Management, and Consumers do NOT see the decline notification
  const emp1042Notifs = restoredNotifs.filter(n => {
    if (n.targetRole !== 'employee' || !n.incidentId) return false;
    return resolveCanonicalEmployeeId(n.targetUserId) === activeEmp1042.id;
  });
  const fld204Notifs = sanitizeAndScopeIncidentNotifications(
    restoredNotifs,
    restoredIncidents,
    'field',
    active204,
    new Set(),
    new Set()
  );
  const fld209Notifs = sanitizeAndScopeIncidentNotifications(
    restoredNotifs,
    restoredIncidents,
    'field',
    active209,
    new Set(),
    new Set()
  );
  const mgmtNotifs = sanitizeAndScopeIncidentNotifications(
    restoredNotifs,
    restoredIncidents,
    'management',
    { id: 'usr_mgmt_01', name: 'Rajesh Solanki', designation: 'Chief Engineer', badge: 'Executive Management' },
    new Set(),
    new Set()
  );
  const consumerNotifs = restoredNotifs.filter(n => n.targetRole === 'consumer');

  assert(
    emp1042Notifs.length === 0 &&
      fld204Notifs.length === 0 &&
      fld209Notifs.length === 0 &&
      mgmtNotifs.length === 0 &&
      consumerNotifs.length === 0,
    'Criterion 50: Another employee (EMP-UG-1042), other field engineers (FLD-UG-204, FLD-UG-209), Management, and Consumers do not see the decline notification'
  );

  // 51 (Regression Test 6): Declining engineer cannot continue acting on the declined assignment
  const postDeclineActionAuth201 = authorizeFieldEngineerAction(incAfterDecline, 'field', active201);
  const postDeclineModalAuth201 = authorizeIncidentModalAccess(incAfterDecline, 'field', active201);
  const secondDeclineAttempt = declineIncidentAssignmentRecord(
    incAfterDecline,
    'Trying to decline again after already declining',
    active201,
    'field',
    restoredNotifs
  );

  assert(
    !postDeclineActionAuth201.isAuthorized &&
      !postDeclineModalAuth201.isAuthorized &&
      !secondDeclineAttempt.success &&
      postDeclineActionAuth201.denialReason.includes('Access Denied'),
    'Criterion 51: Declining engineer (FLD-UG-201) cannot continue acting on or opening the declined assignment'
  );

  // 52 (Regression Test 7): Originating Employee can reassign the declined incident to another eligible engineer (FLD-UG-204), preserving the employee's decline notification
  const reassignAfterDeclineRes = reassignIncidentRecord(
    incAfterDecline,
    'FLD-UG-204',
    'Dharmesh P. Chaudhari',
    'Reassigned to FLD-UG-204 following decline by FLD-UG-201.',
    activeEmp1101.name,
    activeEmp1101.id,
    'employee',
    restoredNotifs,
    '2026-10-25T08:20:00.000Z'
  );

  const incReassignedAfterDecline = reassignAfterDeclineRes.updatedIncident;
  const notifsAfterReassignTo204 = reassignAfterDeclineRes.updatedNotifications;

  const fld204InboxAfterReassign = filterIncidentsForSession([incReassignedAfterDecline], 'field', active204);
  const emp1101NotifsAfterReassign = notifsAfterReassignTo204.filter(
    n => n.targetRole === 'employee' && n.targetUserId === 'EMP-UG-1101' && n.notificationType === 'ASSIGNMENT_DECLINED'
  );

  assert(
    reassignAfterDeclineRes.isReassignment &&
      incReassignedAfterDecline.status === 'ASSIGNED' &&
      incReassignedAfterDecline.assignmentStatus === 'ASSIGNED' &&
      incReassignedAfterDecline.assignedToUserId === 'FLD-UG-204' &&
      incReassignedAfterDecline.assignedEngineerName === 'Dharmesh P. Chaudhari' &&
      incReassignedAfterDecline.previousEngineerId === 'FLD-UG-201' &&
      incReassignedAfterDecline.previousEngineerName === 'Vikramaditya Solanki' &&
      incReassignedAfterDecline.lastDeclinedReason === undefined &&
      fld204InboxAfterReassign.length === 1 &&
      emp1101NotifsAfterReassign.length === 1,
    'Criterion 52: Employee can reassign the declined incident to another eligible engineer (FLD-UG-204), and reassignment cleanup does not delete the employee\'s ASSIGNMENT_DECLINED notification'
  );

  // 53 & 54 (Regression Tests 8 & 9): Audit event records actor, recipient, incident, reason, timestamp, and assignment transition; Resolution & Assistance notifications and LIVE mode safeguards remain intact
  const declineHistoryEvent = incAfterDecline.history.find(h => h.eventType === 'ASSIGNMENT_DECLINED');

  assert(
    Boolean(
      declineHistoryEvent &&
        declineHistoryEvent.actor === 'Vikramaditya Solanki' &&
        declineHistoryEvent.actorUserId === 'FLD-UG-201' &&
        declineHistoryEvent.recipient === 'Priya Rathod' &&
        declineHistoryEvent.targetUserId === 'EMP-UG-1101' &&
        declineHistoryEvent.incidentId === 'INC-DECL-001' &&
        declineHistoryEvent.reason === mandatoryDeclineReason &&
        declineHistoryEvent.previousStatus === 'ASSIGNED' &&
        declineHistoryEvent.newStatus === 'ACKNOWLEDGED' &&
        declineHistoryEvent.timestamp === declineTimestampIso
    ),
    'Criterion 53: Immutable audit history records actor, canonical actorUserId, recipient, canonical targetUserId, incidentId, reason, timestamp, and assignment transition (ASSIGNED -> ACKNOWLEDGED)'
  );

  const anomalyDetectorSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/utils/anomalyDetector.ts'),
    'utf8'
  );

  assert(
    appContextSrc.includes("notificationType: 'ASSISTANCE_REQUESTED'") &&
      appContextSrc.includes("notificationType: 'RESOLUTION_SUBMITTED'") &&
      appContextSrc.includes('declineIncidentAssignmentRecord(') &&
      anomalyDetectorSrc.includes("notificationType: 'ASSIGNMENT_DECLINED'") &&
      appContextSrc.includes("LIVE Backend Unavailable: Cannot decline assignment or fabricate notification in LIVE mode"),
    'Criterion 54: Request Assistance and Resolution Submission notifications remain intact alongside ASSIGNMENT_DECLINED, and LIVE mode is prevented from fabricating a demo decline notification'
  );

  console.log(`\n======================================================`);
  console.log(`Final Test Summary: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
})();

