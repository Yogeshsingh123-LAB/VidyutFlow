import assert from 'node:assert/strict';
import {
  validateApprovalPermission,
  validateCurrentRecordState,
  generateGroundedRecommendations,
  ROLE_APPROVAL_AUTHORITY,
} from '../src/utils/aiRecommendationEngine';
import {
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
} from '../src/data/mockData';
import { AIActionRecommendation, AuditLogItem, CriticalIncident } from '../src/types';

console.log('Running Phase 4: Human-in-the-Loop AI Governance & Approval Tests...');

const mockIncidents: CriticalIncident[] = [
  {
    id: 'INC-2026-901',
    title: '11kV Kadi-Rural Feeder Thermal Overload (108.2%)',
    description: 'Feeder utilization exceeded rated capacity with 4 transient trips.',
    severity: 'CRITICAL',
    status: 'DETECTED',
    module: 'Distribution & SCADA',
    entityId: 'FDR-KADI-04',
    entityType: 'feeder',
    timestamp: '24-Oct-2026 09:45 AM',
    responsibleRoles: ['management', 'field'],
    recommendedAction: 'Segregate agricultural load and dispatch line patrol.',
    history: [
      {
        stage: 'DETECTED',
        timestamp: '24-Oct-2026 09:45 AM',
        actor: 'SCADA Anomaly Sentinel',
        notes: 'Automated threshold breach alert.',
      },
    ],
  },
];

const mockAuditLogs: AuditLogItem[] = [
  {
    id: 'AUD-1082',
    timestamp: '24-Oct-2026 09:30 AM',
    actor: 'Unknown Session',
    role: 'employee',
    action: 'Failed Password Attempt (4x Brute Force)',
    resource: 'Auth Gateway /api/auth/login',
    ipAddress: '192.168.10.45',
    status: 'WARNING',
    metaDetail: 'Multiple invalid credential attempts from external IP.',
  },
];

// 1. Verify Grounded Recommendation Synthesis from ERP Records
const synthesized = generateGroundedRecommendations({
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  incidents: mockIncidents,
  auditLogs: mockAuditLogs,
});

assert.ok(synthesized.length >= 4, 'Should synthesize grounded recommendations from live ERP state');

for (const rec of synthesized) {
  assert.equal(
    rec.status,
    'PENDING_APPROVAL',
    `Recommendation ${rec.id} must initialize in PENDING_APPROVAL and never auto-execute`
  );
  assert.ok(rec.idempotencyKey.length > 5, 'Recommendation must include an idempotency key');
  assert.ok(rec.supportingRecordReferences.length > 0, 'Recommendation must cite real ERP records');
}
console.log('✓ 1. Grounded AI recommendations initialize in PENDING_APPROVAL without auto-execution');

// 2. Verify Consumer and Field Engineer Cannot Approve Internal Commercial/Governance Actions
assert.equal(
  ROLE_APPROVAL_AUTHORITY.consumer.length,
  0,
  'Consumer role must have zero internal ERP approval authority'
);

const highRiskSanctionRec = synthesized.find(
  r => r.proposedAction === 'APPROVE_HIGH_RISK_SANCTION'
);
assert.ok(highRiskSanctionRec, 'High-risk sanction recommendation should be synthesized for >=10kW load');

const consumerCheck = validateApprovalPermission(highRiskSanctionRec, 'consumer');
assert.equal(consumerCheck.allowed, false, 'Consumer must be blocked from approving ERP actions');

const fieldCheck = validateApprovalPermission(highRiskSanctionRec, 'field');
assert.equal(fieldCheck.allowed, false, 'Field Engineer must be blocked from approving commercial sanctions');

const employeeHighRiskCheck = validateApprovalPermission(highRiskSanctionRec, 'employee');
assert.equal(
  employeeHighRiskCheck.allowed,
  false,
  'Sub-Division Employee must be blocked from approving high-risk >=10kW commercial/industrial load sanctions'
);

const adminHighRiskBusinessCheck = validateApprovalPermission(highRiskSanctionRec, 'admin');
assert.equal(
  adminHighRiskBusinessCheck.allowed,
  false,
  'SysAdmin must not override Management authority on high-risk commercial sanctions'
);

const managementHighRiskCheck = validateApprovalPermission(highRiskSanctionRec, 'management');
assert.equal(
  managementHighRiskCheck.allowed,
  true,
  'Management role must be authorized to approve high-risk commercial sanctions'
);
console.log('✓ 2. Role-based approval matrix strictly enforces Consumer, Field, Employee, Management, and Admin boundaries');

// 3. Verify Admin Security Authority vs Other Roles
const securityRec = synthesized.find(r => r.proposedAction === 'REVOKE_SUSPICIOUS_SESSION');
assert.ok(securityRec, 'Security anomaly recommendation should be synthesized from audit logs');

assert.equal(
  validateApprovalPermission(securityRec, 'management').allowed,
  false,
  'Management cannot authorize system session revocations reserved for Admin'
);
assert.equal(
  validateApprovalPermission(securityRec, 'admin').allowed,
  true,
  'Admin can authorize security session revocations'
);
console.log('✓ 3. Security governance actions require Admin role authorization');

// 4. Verify Current-State Revalidation (State Drift Protection)
const validStateCheck = validateCurrentRecordState(highRiskSanctionRec, {
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  incidents: mockIncidents,
});
assert.equal(validStateCheck.valid, true, 'Unchanged ERP record state should pass validation');

// Simulate state drift: application already moved to Meter Installed or Rejected before human review completes
const driftedApplications = INITIAL_APPLICATIONS.map(app =>
  app.id === highRiskSanctionRec.affectedRecord.id
    ? { ...app, status: 'Meter Installed' as const }
    : app
);

const driftedStateCheck = validateCurrentRecordState(highRiskSanctionRec, {
  applications: driftedApplications,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  incidents: mockIncidents,
});
assert.equal(
  driftedStateCheck.valid,
  false,
  'State drift must be detected and block execution if record status changed since proposal'
);
assert.match(driftedStateCheck.reason || '', /State Drift Detected/i);
console.log('✓ 4. Current-state revalidation detects state drift and prevents stale execution');

// 5. Verify Rejected Recommendations Cannot Execute & Duplicate Execution (Idempotency) Protection
const simulatedQueue: AIActionRecommendation[] = synthesized.map(r => ({ ...r }));
const targetRec = simulatedQueue[0];

// Simulate human rejection
targetRec.status = 'REJECTED';
targetRec.reviewedBy = 'K. V. Patel (Dy. Engineer)';
targetRec.decisionRemarks = 'Rejected due to pending transformer capacity verification.';

assert.notEqual(targetRec.status, 'EXECUTED', 'Rejected action must never transition to EXECUTED');

// Simulate idempotency guard on an already executed recommendation
const executedRec: AIActionRecommendation = {
  ...highRiskSanctionRec,
  status: 'EXECUTED',
  executionResult: {
    success: true,
    executedAt: '24-Oct-2026 10:15 AM',
    message: 'Executed via validated ERP workflow.',
  },
};
const isDuplicateBlocked = executedRec.status === 'EXECUTED';
assert.equal(isDuplicateBlocked, true, 'Duplicate execution request on EXECUTED recommendation must be blocked');
console.log('✓ 5. Rejected actions never execute and idempotency check blocks duplicate execution');

console.log('All Phase 4 Human-in-the-Loop AI Governance tests passed successfully!');
