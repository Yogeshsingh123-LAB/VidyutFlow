import assert from 'node:assert/strict';
import {
  detectAnomalies,
  filterIncidentsByRole,
  filterIncidentsForSession,
  isInternalOperationalIncident
} from '../src/utils/anomalyDetector';
import {
  INITIAL_APPLICATIONS,
  INITIAL_BILLS,
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_WORK_ORDERS,
  AUDIT_LOGS
} from '../src/data/mockData';
import {
  generateNextRecordId,
  ensureUniqueRecordIds
} from '../src/context/AppContext';
import {
  getCaseDrawerCapabilities,
  sanitizeConsumerTimelineEntry
} from '../src/components/common/CaseDetailDrawer';
import { isActionAuthorized } from '../src/services/erpAdapter';
import { isIncidentRoleAuthorized } from '../src/services/erpApiContracts';
import { createErpRepositoryBundle } from '../src/services/repositories';
import { defaultErpApiClient } from '../src/services/apiClient';
import { ServerAuthService } from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { executeAgenticTool, getRoleToolDeclarations } from '../src/server/agenticTools';
import { generateUtilityGroundedResponse } from '../src/utils/utilityAiEngine';

console.log('🛡️ Starting VidyutFlow Consumer Portal Security, Privacy & Workflow Visibility Regression Tests...');

async function runConsumerPortalSecurityTests() {
  const ownedConsumerNos = new Set(['04281-99231', '04281-77190']);
  const detectedIncidents = detectAnomalies({
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    auditLogs: AUDIT_LOGS,
    bills: INITIAL_BILLS,
    consumerOwnedNumbers: ownedConsumerNos
  });

  // ==========================================================================
  // 1. Consumer login does not trigger internal critical incident modals
  // ==========================================================================
  for (const inc of detectedIncidents) {
    assert.equal(
      inc.responsibleRoles.includes('consumer'),
      false,
      `Detected operational incident "${inc.id}" (${inc.title}) must NEVER include 'consumer' in responsibleRoles`
    );
  }

  const consumerSessionIncidents = filterIncidentsForSession(detectedIncidents, 'consumer');
  assert.equal(
    consumerSessionIncidents.length,
    0,
    'filterIncidentsForSession must return 0 incidents for consumer sessions so no critical modal or audio alarm can trigger'
  );

  // Even if a synthetic or legacy cached incident had responsibleRoles: ['consumer'] with SLA breach text, filterIncidentsByRole strips it
  const syntheticSlaBreach = {
    ...detectedIncidents[0],
    id: 'INC-CMP-8827',
    title: 'GERC SLA Breach Risk: Complaint #CMP-8827 (Meter Fault)',
    recommendedAction: 'Escalate to Sub-Divisional Officer and dispatch on-call JE',
    responsibleRoles: ['consumer', 'employee', 'management'] as any
  };
  assert.equal(isInternalOperationalIncident(syntheticSlaBreach), true);
  assert.equal(
    filterIncidentsByRole([syntheticSlaBreach], 'consumer').length,
    0,
    'filterIncidentsByRole must strip internal GERC SLA breach and operational incidents from consumer role'
  );
  console.log('✓ 1. Consumer login never triggers internal critical incident modals or emergency audio alarms');

  // ==========================================================================
  // 2. Consumer notification drawer does not expose internal incident actions
  // ==========================================================================
  assert.equal(
    isIncidentRoleAuthorized('consumer'),
    false,
    'Consumer role must not be authorized for internal critical incident center or actions'
  );
  assert.equal(
    isActionAuthorized('consumer', 'GET /api/v1/incidents'),
    false,
    'Consumer role must be blocked from GET /api/v1/incidents'
  );

  const consumerAllowedNotifications = INITIAL_NOTIFICATIONS.filter(
    n =>
      (n.targetRole === 'consumer' || n.targetRole === 'all') &&
      !`${n.title} ${n.message}`.toLowerCase().includes('gerc sla breach') &&
      !`${n.title} ${n.message}`.toLowerCase().includes('scada')
  );
  assert.ok(consumerAllowedNotifications.length > 0, 'Consumer still receives valid consumer notifications and advisories');
  for (const n of consumerAllowedNotifications) {
    assert.ok(
      n.targetRole === 'consumer' || n.targetRole === 'all',
      'Consumer notification center only shows consumer/public notifications'
    );
  }
  console.log('✓ 2. Consumer notification drawer exposes only consumer notifications & advisories (no internal incident actions)');

  // ==========================================================================
  // 3. Consumer complaint view does not expose staff dispatch or status update buttons
  // ==========================================================================
  const consumerDrawerCaps = getCaseDrawerCapabilities('consumer');
  assert.equal(consumerDrawerCaps.isConsumerView, true);
  assert.equal(consumerDrawerCaps.canMutateComplaintStatus, false, 'Consumer cannot mark complaint In Progress or Resolved');
  assert.equal(consumerDrawerCaps.canDispatchFieldLineman, false, 'Consumer cannot dispatch field lineman');
  assert.equal(consumerDrawerCaps.canSeeInternalTechnicianAssignment, false, 'Consumer does not see internal technician assignment');
  assert.equal(consumerDrawerCaps.canSeeInternalWorkOrderLinks, false, 'Consumer does not see internal work order links');
  assert.equal(consumerDrawerCaps.canViewWorkOrder, false, 'Consumer cannot open internal work order drawer');
  assert.equal(consumerDrawerCaps.canAppendOfficialNote, false, 'Consumer cannot append official staff notes');

  const sanitizedEntry = sanitizeConsumerTimelineEntry({
    time: '15-Oct 11:20',
    stage: 'Dispatched',
    actor: 'Rajesh V. Trivedi (EMPLOYEE)',
    remark: 'Assigned to field engineer Vikramaditya Solanki (JE Field). Work Order: WO-CMP-8821.'
  });
  assert.equal(
    sanitizedEntry.remark.includes('WO-CMP-8821'),
    false,
    'Consumer timeline entry must strip internal Work Order IDs'
  );
  assert.equal(sanitizedEntry.actorLabel, 'UGVCL Sub-Divisional Office');
  console.log('✓ 3. Consumer complaint view is strictly read-only and hides staff dispatch, status controls, and work order IDs');

  // ==========================================================================
  // 4. Consumer application view does not expose sanction lifecycle buttons
  // ==========================================================================
  assert.equal(
    consumerDrawerCaps.canMutateApplicationLifecycle,
    false,
    'Consumer application view must never expose Approve Docs, Dispatch Inspection, Sanction Approval, Energize & Install, or Reject File'
  );
  console.log('✓ 4. Consumer application view is strictly read-only and hides Sub-Divisional Sanction Lifecycle buttons');

  // ==========================================================================
  // 5. Consumer cannot execute application sanction actions
  // ==========================================================================
  assert.equal(isActionAuthorized('consumer', 'PATCH /api/v1/applications/:id/status'), false);
  const demoRepo = createErpRepositoryBundle('DEMO', defaultErpApiClient);
  const consumerSanctionRes = await demoRepo.applications.updateApplicationStatus(
    'consumer',
    'APP-2026-0842',
    { status: 'Sanction Approval', note: 'Unauthorized consumer self-approval attempt' }
  );
  assert.equal(consumerSanctionRes.success, false);
  assert.equal(consumerSanctionRes.code, 'UNAUTHORIZED_ROLE');
  assert.equal(consumerSanctionRes.statusCode, 403);
  console.log('✓ 5. Consumer cannot execute application sanction actions (rejected with 403 UNAUTHORIZED_ROLE)');

  // ==========================================================================
  // 6. Consumer cannot execute complaint dispatch or resolution actions
  // ==========================================================================
  assert.equal(isActionAuthorized('consumer', 'POST /api/v1/complaints/:id/assign'), false);
  assert.equal(isActionAuthorized('consumer', 'PATCH /api/v1/complaints/:id/status'), false);

  const consumerDispatchRes = await demoRepo.complaints.assignComplaintToField(
    'consumer',
    'CMP-8821',
    {
      engineerName: 'Vikramaditya Solanki (JE Field)',
      priority: 'High',
      instructions: 'Unauthorized consumer dispatch attempt'
    }
  );
  assert.equal(consumerDispatchRes.success, false);
  assert.equal(consumerDispatchRes.code, 'UNAUTHORIZED_ROLE');

  const consumerResolveCmpRes = await demoRepo.complaints.updateComplaintStatus(
    'consumer',
    'CMP-8821',
    { status: 'Resolved', remark: 'Unauthorized consumer resolution attempt' }
  );
  assert.equal(consumerResolveCmpRes.success, false);
  assert.equal(consumerResolveCmpRes.code, 'UNAUTHORIZED_ROLE');
  console.log('✓ 6. Consumer cannot execute complaint dispatch or resolution actions (rejected with 403 UNAUTHORIZED_ROLE)');

  // ==========================================================================
  // 7. Consumer cannot execute incident acknowledge/escalate/resolve actions
  // ==========================================================================
  assert.equal(isActionAuthorized('consumer', 'GET /api/v1/incidents'), false);
  assert.equal(isActionAuthorized('consumer', 'PATCH /api/v1/incidents/:id/acknowledge'), false);
  assert.equal(isActionAuthorized('consumer', 'POST /api/v1/incidents/:id/escalate'), false);
  assert.equal(isActionAuthorized('consumer', 'PATCH /api/v1/incidents/:id/resolve'), false);

  const consumerGetIncRes = await demoRepo.incidents.getIncidents('consumer');
  assert.equal(consumerGetIncRes.success, false);
  assert.equal(consumerGetIncRes.code, 'UNAUTHORIZED_ROLE');

  const consumerAckIncRes = await demoRepo.incidents.acknowledgeIncident(
    'consumer',
    'INC-CMP-8821',
    { notes: 'Unauthorized consumer ack' }
  );
  assert.equal(consumerAckIncRes.success, false);
  assert.equal(consumerAckIncRes.code, 'UNAUTHORIZED_ROLE');

  const consumerEscIncRes = await demoRepo.incidents.escalateIncident(
    'consumer',
    'INC-CMP-8821',
    { targetRole: 'management', reason: 'Unauthorized consumer escalate' }
  );
  assert.equal(consumerEscIncRes.success, false);
  assert.equal(consumerEscIncRes.code, 'UNAUTHORIZED_ROLE');

  const consumerResIncRes = await demoRepo.incidents.resolveIncident(
    'consumer',
    'INC-CMP-8821',
    { resolutionNotes: 'Unauthorized consumer resolve' }
  );
  assert.equal(consumerResIncRes.success, false);
  assert.equal(consumerResIncRes.code, 'UNAUTHORIZED_ROLE');
  console.log('✓ 7. Consumer cannot read, acknowledge, escalate, or resolve operational incidents');

  // ==========================================================================
  // 8. Consumer cannot view another consumer's records (Data Store & AI Assistant)
  // ==========================================================================
  const authService = new ServerAuthService();
  const dataStore = new ServerDataStore(authService);
  const consumerLogin = authService.login({
    email: 'consumer@vidyutflow.demo',
    password: 'Demo@12345',
    targetRole: 'consumer'
  });
  const consumerToken = consumerLogin.session.signedToken;

  const scopedConns = dataStore.getConnections(consumerToken);
  assert.ok(
    scopedConns.every(
      (c: { consumerNo: string }) => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190'
    )
  );
  assert.equal(
    scopedConns.some((c: { consumerNo: string }) => c.consumerNo === '04281-55104'),
    false,
    'Consumer must never see unowned connection 04281-55104'
  );

  // Attempting to query another consumer's bill via AI tool must be denied
  const unownedBillToolRes = await executeAgenticTool({
    name: 'getConsumerBillDetails',
    args: { consumerNo: '04281-55104' },
    role: 'consumer',
    dataStore,
    session: consumerLogin.session
  });
  assert.equal(unownedBillToolRes.success, false);
  assert.match(unownedBillToolRes.error || '', /Access Denied/i);

  // Consumer AI tools must only allow consumer-scoped tools and must strip internal fields
  const consumerTools = getRoleToolDeclarations('consumer').map(t => t.name);
  assert.equal(consumerTools.includes('getAssignedWorkOrders'), false);
  assert.equal(consumerTools.includes('querySystemAuditLogs'), false);
  assert.equal(consumerTools.includes('getComplaintSlaRisks'), false);

  const consumerCmpToolRes = await executeAgenticTool({
    name: 'getConsumerComplaints',
    args: {},
    role: 'consumer',
    dataStore,
    session: consumerLogin.session
  });
  assert.equal(consumerCmpToolRes.success, true);
  for (const cmp of consumerCmpToolRes.data.complaints) {
    assert.equal('assignedTechnician' in cmp, false, 'Consumer AI complaint tool must not leak assignedTechnician');
    assert.equal('assignedWorkOrderId' in cmp, false, 'Consumer AI complaint tool must not leak assignedWorkOrderId');
  }

  // Deterministic AI fallback engine refuses internal SCADA / SLA breach / audit log queries from consumers
  const aiBoundaryReply = generateUtilityGroundedResponse(
    'Show me internal SCADA diagnostics and security log audit trail',
    'consumer',
    { consumerName: 'Meenaben Patel', hasLinkedConnections: true, connections: [] }
  );
  assert.match(aiBoundaryReply, /Consumer Privacy & Role Authorization Boundary/);
  console.log('✓ 8. Consumer cannot view another consumer\'s records or internal staff data via DataStore or AI Assistant');

  // ==========================================================================
  // 9. Employee can still review and update applications
  // ==========================================================================
  const employeeDrawerCaps = getCaseDrawerCapabilities('employee');
  assert.equal(employeeDrawerCaps.isConsumerView, false);
  assert.equal(employeeDrawerCaps.canMutateApplicationLifecycle, true);
  assert.equal(employeeDrawerCaps.canAppendOfficialNote, true);

  const empAppUpdate = await demoRepo.applications.updateApplicationStatus(
    'employee',
    'APP-2026-0843',
    { status: 'Site Inspection', note: 'Documents verified by AE.' }
  );
  assert.equal(empAppUpdate.success, true);
  assert.equal(empAppUpdate.data?.status, 'Site Inspection');
  console.log('✓ 9. Employee can still review and update applications normally');

  // ==========================================================================
  // 10. Employee and Field Engineer can still manage complaints and work orders
  // ==========================================================================
  const fieldDrawerCaps = getCaseDrawerCapabilities('field');
  assert.equal(fieldDrawerCaps.canViewWorkOrder, true);
  assert.equal(fieldDrawerCaps.canMutateWorkOrderStatus, true);
  assert.equal(employeeDrawerCaps.canDispatchFieldLineman, true);

  const empDispatchRes = await demoRepo.complaints.assignComplaintToField(
    'employee',
    'CMP-8822',
    {
      engineerName: 'Vikramaditya Solanki (JE Field)',
      priority: 'High',
      instructions: 'Inspect meter terminal block.'
    }
  );
  assert.equal(empDispatchRes.success, true);
  assert.equal(empDispatchRes.data?.complaint.status, 'Dispatched');

  const woId = empDispatchRes.data!.workOrder.id;
  await demoRepo.workOrders.updateWorkOrderStatus('field', woId, { status: 'En Route' });
  await demoRepo.workOrders.updateWorkOrderStatus('field', woId, { status: 'On Site' });
  const fieldCompleteRes = await demoRepo.workOrders.updateWorkOrderStatus('field', woId, {
    status: 'Completed',
    report: {
      meterSerialScanned: 'UG-SM-77190',
      readingKwh: 14520,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 239, y: 240, b: 238 },
      technicianRemarks: 'Optical port calibrated and restored.',
      photoUploaded: true
    }
  });
  assert.equal(fieldCompleteRes.success, true);
  assert.equal(fieldCompleteRes.data?.syncedComplaint?.status, 'Resolved');
  console.log('✓ 10. Employee and Field Engineer can still dispatch complaints and complete work orders');

  // ==========================================================================
  // 11. Management and Admin can still view and manage critical incidents
  // ==========================================================================
  assert.equal(isIncidentRoleAuthorized('management'), true);
  assert.equal(isIncidentRoleAuthorized('admin'), true);
  assert.equal(isIncidentRoleAuthorized('employee'), true);
  assert.equal(isIncidentRoleAuthorized('field'), true);

  const mgmtIncidents = filterIncidentsForSession(detectedIncidents, 'management');
  const adminIncidents = filterIncidentsForSession(detectedIncidents, 'admin');
  assert.ok(mgmtIncidents.length > 0, 'Management must receive operational SLA & critical incidents');
  assert.ok(adminIncidents.length > 0, 'Admin must receive security & infrastructure incidents');

  await demoRepo.workOrders.reportFeederFault('field', {
    feederId: 'F-MS01',
    faultType: 'Transformer Oil Overheat',
    remarks: 'Thermal anomaly observed on DT-MS01.',
    severity: 'CRITICAL'
  });

  const mgmtGetInc = await demoRepo.incidents.getIncidents('management');
  assert.equal(mgmtGetInc.success, true);
  const targetIncId = mgmtGetInc.data![0].id;

  const mgmtAck = await demoRepo.incidents.acknowledgeIncident('management', targetIncId, {
    notes: 'Reviewed by SE Circle.'
  });
  assert.equal(mgmtAck.success, true);
  assert.equal(mgmtAck.data?.status, 'ACKNOWLEDGED');
  console.log('✓ 11. Management and Admin can still view, acknowledge, escalate, and resolve critical incidents');

  // ==========================================================================
  // 12. Cross-portal updates still reflect in the Consumer Portal in read-only form
  // ==========================================================================
  const consumerReadComplaint = await demoRepo.complaints.getComplaintById('consumer', 'CMP-8822');
  assert.equal(consumerReadComplaint.success, true);
  assert.equal(
    consumerReadComplaint.data?.status,
    'Resolved',
    'Field engineer completion automatically reflects as Resolved in Consumer Portal'
  );
  assert.equal(
    consumerReadComplaint.data?.resolutionRemarks,
    'Optical port calibrated and restored.',
    'Consumer can read resolution remarks'
  );

  const consumerReadApp = await demoRepo.applications.getApplicationById('consumer', 'APP-2026-0843');
  assert.equal(consumerReadApp.success, true);
  assert.equal(
    consumerReadApp.data?.status,
    'Site Inspection',
    'Employee application update automatically reflects in Consumer Portal tracker'
  );
  console.log('✓ 12. Cross-portal updates automatically synchronize to the Consumer Portal in read-only form');

  // ==========================================================================
  // 13. Application & Complaint ID Generation Never Collides with APP-2026-0845
  // ==========================================================================
  const initialAppIds = INITIAL_APPLICATIONS.map(a => a.id);
  assert.ok(initialAppIds.includes('APP-2026-0845'), 'INITIAL_APPLICATIONS contains APP-2026-0845');

  const nextAppId = generateNextRecordId(initialAppIds, 'APP-2026-', 846, 4);
  assert.equal(nextAppId, 'APP-2026-0846', 'First newly generated application ID must be APP-2026-0846, never colliding with APP-2026-0845');
  assert.equal(initialAppIds.includes(nextAppId), false);

  // Verify healing of persisted duplicate APP-2026-0845 in localStorage
  const corruptedList = [
    { ...INITIAL_APPLICATIONS[0], id: 'APP-2026-0845', applicantName: 'Duplicate Submitted App' },
    ...INITIAL_APPLICATIONS
  ];
  const healedList = ensureUniqueRecordIds(corruptedList, 'APP-2026-', 846, 4);
  const healedIds = healedList.map(a => a.id);
  const uniqueHealedIds = new Set(healedIds);
  assert.equal(uniqueHealedIds.size, healedList.length, 'All healed application IDs must be strictly unique');
  assert.equal(healedList[0].id, 'APP-2026-0846', 'Prepended duplicate APP-2026-0845 is healed to APP-2026-0846');
  assert.equal(healedList[healedList.length - 1].id, 'APP-2026-0845', 'Canonical APP-2026-0845 record retains its original ID');
  console.log('✓ 13. Application and Complaint ID generation prevents and heals APP-2026-0845 duplicate key collisions');

  console.log('================================================================');
  console.log('Consumer Portal Security & RBAC Regression Suite: ALL 13 PASSED');
  console.log('================================================================');
}

runConsumerPortalSecurityTests().catch(err => {
  console.error('Consumer Portal security regression test failed:', err);
  process.exit(1);
});
