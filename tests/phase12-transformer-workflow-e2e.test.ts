/**
 * Phase 12 & Prompt 3: Complete Transformer Maintenance Assignment & Tracking System E2E Suite
 *
 * Verifies all 18 mandatory scenarios:
 *  1. Initial transformer table maintenance statuses (NOT_ASSIGNED) distinct from Operational Status
 *  2. Default 6-tier case prioritization sorting (REJECTED > AWAITING_ACCEPTANCE > ACCEPTED/IN_PROGRESS > PENDING_REVIEW > COMPLETED > NOT_ASSIGNED, then Risk HIGH > MEDIUM > LOW)
 *  3. Opening Dossier/Inspect does NOT mutate maintenance status
 *  4. Employee dispatch sets initial maintenanceStatus to AWAITING_ACCEPTANCE
 *  5. Employee table displays AWAITING_ACCEPTANCE, WO ID, and assigned engineer
 *  6. Field Engineer receives assignment notification and sees work order in inbox
 *  7. Field Engineer accepts assignment -> status becomes ACCEPTED
 *  8. Employee receives acceptance notification and sees ACCEPTED
 *  9. Field Engineer starts work -> status becomes IN_PROGRESS
 * 10. Field Engineer submits inspection -> status becomes PENDING_REVIEW (not auto-completed)
 * 11. Completion updates status to COMPLETED and notifies Employee & Field Engineer
 * 12. Field Engineer rejects assignment without reason -> blocked
 * 13. Field Engineer rejects assignment with reason -> status becomes REJECTED, moves to top of table
 * 14. Employee receives rejection notification with reason
 * 15. Employee reassigns work order -> preserves original WO ID & history, resets to AWAITING_ACCEPTANCE, notifies new engineer, revokes old engineer ownership
 * 16. Duplicate dispatch prevention while an active work order exists
 * 17. Cross-subdivision and unauthorized role/assignee protection
 * 18. Four-language label parity (en, gu, hi, mr) & offline IndexedDB queue resilience
 */

import assert from 'node:assert/strict';
import {
  DEMO_TRANSFORMERS,
  getTransformerTelemetrySeries
} from '../src/data/transformerDemoData';
import {
  storeInspectionPhoto,
  getInspectionPhoto,
  enqueueOfflineInspection,
  getOfflineInspections,
  syncOfflineInspections,
  OfflineInspectionRecord
} from '../src/utils/transformerInspectionStore';
import { TRANSFORMER_TRANSLATIONS, getTransformerI18n } from '../src/i18n/transformerTranslations';
import {
  WorkOrder,
  AppNotification,
  deriveTransformerMaintenanceStatus,
  ActiveUserIdentity
} from '../src/types';
import { INITIAL_FIELD_ENGINEERS } from '../src/data/mockData';
import {
  getLatestTransformerWorkOrder,
  sortTransformersByMaintenancePriority,
  computeTransformerMaintenanceCounts,
  dispatchTransformerMaintenanceOrder,
  acceptTransformerMaintenanceOrder,
  rejectTransformerMaintenanceOrder,
  reassignTransformerMaintenanceOrder,
  startTransformerMaintenanceWorkOrder,
  submitTransformerInspectionOrderForReview,
  completeTransformerMaintenanceOrder,
  isAssignedEngineerForWorkOrder
} from '../src/utils/transformerMaintenanceEngine';

async function run() {
  console.log('Running tests/phase12-transformer-workflow-e2e.test.ts...\n');

  const northAssets = DEMO_TRANSFORMERS.filter((t) => t.zone === 'North');
  assert.equal(northAssets.length, 4, 'Must have exactly 4 North transformer fixtures');

  const north01 = northAssets.find((t) => t.utility_asset_code === 'DEMO-TR-NORTH-01')!;
  const north02 = northAssets.find((t) => t.utility_asset_code === 'DEMO-TR-NORTH-02')!;
  const north03 = northAssets.find((t) => t.utility_asset_code === 'DEMO-TR-NORTH-03')!;
  const north04 = northAssets.find((t) => t.utility_asset_code === 'DEMO-TR-NORTH-04')!;

  // =========================================================================
  // Scenario 1, 2 & 3: Initial Maintenance Statuses, Sorting & Dossier Safety
  // =========================================================================
  let workOrders: WorkOrder[] = [];
  let notifications: AppNotification[] = [];

  for (const asset of northAssets) {
    const latestWo = getLatestTransformerWorkOrder(asset, workOrders);
    assert.equal(latestWo, undefined, 'Initially no work order exists');
    assert.equal(
      deriveTransformerMaintenanceStatus(latestWo),
      'NOT_ASSIGNED',
      `Initial maintenance status for ${asset.utility_asset_code} must be NOT_ASSIGNED`
    );
  }
  assert.equal(north01.status, 'IN_SERVICE', 'Operational status remains IN_SERVICE');
  assert.equal(north04.status, 'OFFLINE', 'Operational status remains OFFLINE');

  // Initial sort when all are NOT_ASSIGNED: sorted by Risk (HIGH > MEDIUM > LOW)
  const initialSorted = sortTransformersByMaintenancePriority(northAssets, workOrders);
  assert.equal(initialSorted[0].utility_asset_code, 'DEMO-TR-NORTH-01', 'HIGH risk asset first when all NOT_ASSIGNED');

  // Scenario 3: Opening Dossier / Inspect reads telemetry & asset state without mutating workOrders
  const inspectSeries = getTransformerTelemetrySeries(north01);
  assert.ok(inspectSeries.length >= 5);
  assert.equal(
    deriveTransformerMaintenanceStatus(getLatestTransformerWorkOrder(north01, workOrders)),
    'NOT_ASSIGNED',
    'Opening Dossier/Inspect must never change maintenance status to IN_PROGRESS'
  );
  console.log('✓ Scenarios 1, 2 & 3: Initial NOT_ASSIGNED status, risk-based initial sorting, and read-only Dossier verified');

  // Actors
  const employeeNorth: ActiveUserIdentity = {
    id: 'EMP-UG-1042',
    name: 'Rajesh V. Trivedi',
    designation: 'Assistant Engineer (Commerce & Ops)',
    subdivision: 'Mehsana City North',
    zone: 'North'
  };

  const fieldVikram: ActiveUserIdentity = {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    designation: 'Junior Engineer (Field & Vigilance)',
    subdivision: 'Mehsana City North',
    zone: 'North'
  };

  const fieldHitesh: ActiveUserIdentity = {
    id: 'FLD-UG-209',
    name: 'Hitesh N. Vaghela',
    designation: 'Substation Technician Grade-I',
    subdivision: 'Mehsana Industrial GIDC',
    zone: 'North'
  };

  const fieldDharmesh: ActiveUserIdentity = {
    id: 'FLD-UG-204',
    name: 'Dharmesh P. Chaudhari',
    designation: 'Line Inspector',
    subdivision: 'Kadi Division',
    zone: 'South'
  };

  const consumerUser: ActiveUserIdentity = {
    id: 'demo_consumer',
    name: 'Smt. Meenaben Patel',
    designation: 'Consumer',
    subdivision: 'Mehsana City North',
    zone: 'North'
  };

  // =========================================================================
  // Scenario 4, 5 & 6: Employee Dispatches Work Order -> AWAITING_ACCEPTANCE
  // =========================================================================
  const dispatch1 = dispatchTransformerMaintenanceOrder({
    transformerId: north01.id,
    utilityAssetCode: north01.utility_asset_code,
    feederId: north01.feeder_id,
    zone: north01.zone,
    priority: 'High',
    reason: 'Peak overload 94.6% and top-oil thermal anomaly 88.5°C',
    recommendedAction: 'Infrared scan & load tap adjustment',
    assignedEngineerIdOrName: 'Vikramaditya Solanki',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications,
    nextWoId: 'WO-4411'
  });

  assert.equal(dispatch1.success, true, 'Employee dispatch must succeed');
  assert.ok(dispatch1.workOrder);
  workOrders = dispatch1.updatedWorkOrders;
  notifications = dispatch1.updatedNotifications;

  const woNorth01 = getLatestTransformerWorkOrder(north01, workOrders)!;
  assert.equal(woNorth01.id, 'WO-4411');
  assert.equal(
    deriveTransformerMaintenanceStatus(woNorth01),
    'AWAITING_ACCEPTANCE',
    'Newly dispatched work order must start in AWAITING_ACCEPTANCE (not IN_PROGRESS)'
  );
  assert.equal(woNorth01.assignedTo, 'Vikramaditya Solanki');
  assert.equal(woNorth01.assignedEngineerId, 'FLD-UG-201');

  // Verify Field Engineer notification
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].targetRole, 'field');
  assert.equal(notifications[0].targetUserId, 'FLD-UG-201');
  assert.equal(notifications[0].workOrderId, 'WO-4411');
  assert.equal(notifications[0].statusBadge, 'Awaiting Acceptance');

  // Verify summary counters
  let counts = computeTransformerMaintenanceCounts(northAssets, workOrders);
  assert.equal(counts.awaitingAcceptance, 1);
  assert.equal(counts.notAssigned, 3);
  console.log('✓ Scenarios 4, 5 & 6: Employee dispatch sets AWAITING_ACCEPTANCE, updates counters, and notifies Field Engineer');

  // =========================================================================
  // Scenario 16: Duplicate Dispatch Prevention
  // =========================================================================
  const dupDispatch = dispatchTransformerMaintenanceOrder({
    transformerId: north01.id,
    utilityAssetCode: north01.utility_asset_code,
    feederId: north01.feeder_id,
    zone: north01.zone,
    priority: 'Emergency',
    reason: 'Duplicate attempt',
    assignedEngineerIdOrName: 'Vikramaditya Solanki',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications,
    nextWoId: 'WO-4412'
  });
  assert.equal(dupDispatch.success, false, 'Duplicate active dispatch for same transformer must be blocked');
  assert.equal(workOrders.length, 1, 'WorkOrder count must remain 1');
  console.log('✓ Scenario 16: Duplicate active dispatch prevented');

  // =========================================================================
  // Scenario 17: Unauthorized Role, Cross-Subdivision & Unrelated Engineer Protection
  // =========================================================================
  const consumerDispatch = dispatchTransformerMaintenanceOrder({
    transformerId: north02.id,
    utilityAssetCode: north02.utility_asset_code,
    feederId: north02.feeder_id,
    zone: north02.zone,
    priority: 'Routine',
    reason: 'Consumer attempt',
    actorUser: consumerUser,
    effectiveRole: 'consumer',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications,
    nextWoId: 'WO-4412'
  });
  assert.equal(consumerDispatch.success, false, 'Consumer cannot dispatch');

  const crossZoneDispatch = dispatchTransformerMaintenanceOrder({
    transformerId: north02.id,
    utilityAssetCode: north02.utility_asset_code,
    feederId: north02.feeder_id,
    zone: 'South',
    priority: 'Routine',
    reason: 'Cross-zone attempt',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications,
    nextWoId: 'WO-4412'
  });
  assert.equal(crossZoneDispatch.success, false, 'Employee cannot dispatch outside assigned zone');

  const wrongSubdivEngDispatch = dispatchTransformerMaintenanceOrder({
    transformerId: north02.id,
    utilityAssetCode: north02.utility_asset_code,
    feederId: north02.feeder_id,
    zone: 'North',
    priority: 'Routine',
    reason: 'Assigning Kadi Division engineer to North',
    assignedEngineerIdOrName: 'Dharmesh P. Chaudhari',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications,
    nextWoId: 'WO-4412'
  });
  assert.equal(wrongSubdivEngDispatch.success, false, 'Cannot assign out-of-subdivision engineer to North transformer');

  // Unrelated engineer (Hitesh) trying to accept Vikram's assignment WO-4411
  const unrelatedAccept = acceptTransformerMaintenanceOrder({
    woId: 'WO-4411',
    actorUser: fieldHitesh,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(unrelatedAccept.success, false, 'Unrelated engineer cannot accept another engineer assignment');
  console.log('✓ Scenario 17: Role, cross-subdivision, and assignee ownership guards verified');

  // =========================================================================
  // Scenarios 12, 13, 14 & 15: Rejection (Mandatory Reason), Top Sorting & Reassignment
  // =========================================================================
  // Dispatch a second work order on NORTH-03 (Medium risk) to Vikram so we can test Rejection & Reassignment on NORTH-03 while NORTH-01 is AWAITING_ACCEPTANCE
  const dispatchNorth03 = dispatchTransformerMaintenanceOrder({
    transformerId: north03.id,
    utilityAssetCode: north03.utility_asset_code,
    feederId: north03.feeder_id,
    zone: north03.zone,
    priority: 'Routine',
    reason: 'Commercial surge warning inspection',
    assignedEngineerIdOrName: 'Vikramaditya Solanki',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications,
    nextWoId: 'WO-4412'
  });
  assert.equal(dispatchNorth03.success, true);
  workOrders = dispatchNorth03.updatedWorkOrders;
  notifications = dispatchNorth03.updatedNotifications;

  // Scenario 12: Reject without reason -> blocked
  const emptyReject = rejectTransformerMaintenanceOrder({
    woId: 'WO-4412',
    reason: '   ',
    actorUser: fieldVikram,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(emptyReject.success, false, 'Rejection without a non-empty reason must be blocked');
  assert.equal(
    deriveTransformerMaintenanceStatus(getLatestTransformerWorkOrder(north03, workOrders)),
    'AWAITING_ACCEPTANCE',
    'Status must remain AWAITING_ACCEPTANCE when empty rejection is blocked'
  );

  // Scenario 13 & 14: Valid rejection with reason -> status becomes REJECTED, moves to TOP of Employee table, notifies Employee
  const validReject = rejectTransformerMaintenanceOrder({
    woId: 'WO-4412',
    reason: 'Engaged in emergency 11kV fault restoration on Visnagar Road feeder',
    actorUser: fieldVikram,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(validReject.success, true);
  workOrders = validReject.updatedWorkOrders;
  notifications = validReject.updatedNotifications;

  const rejectedWo = getLatestTransformerWorkOrder(north03, workOrders)!;
  assert.equal(deriveTransformerMaintenanceStatus(rejectedWo), 'REJECTED');
  assert.equal(rejectedWo.rejectionReason, 'Engaged in emergency 11kV fault restoration on Visnagar Road feeder');
  assert.equal(rejectedWo.rejectedBy, 'Vikramaditya Solanki');

  // Verify Employee notification includes reason and Reassignment Required badge
  const empRejectNotif = notifications[0];
  assert.equal(empRejectNotif.targetRole, 'employee');
  assert.equal(empRejectNotif.workOrderId, 'WO-4412');
  assert.equal(empRejectNotif.statusBadge, 'Reassignment Required');
  assert.ok(empRejectNotif.message.includes('Engaged in emergency 11kV fault restoration'));

  // Verify automatic case prioritization: NORTH-03 (REJECTED, MEDIUM risk) now sorts ABOVE NORTH-01 (AWAITING_ACCEPTANCE, HIGH risk)!
  const sortedAfterReject = sortTransformersByMaintenancePriority(northAssets, workOrders);
  assert.equal(
    sortedAfterReject[0].utility_asset_code,
    'DEMO-TR-NORTH-03',
    'REJECTED transformer case must automatically move to the very top of the Employee table'
  );
  assert.equal(
    sortedAfterReject[1].utility_asset_code,
    'DEMO-TR-NORTH-01',
    'AWAITING_ACCEPTANCE transformer case sorts second'
  );

  // Scenario 15: Employee reassigns WO-4412 to Hitesh N. Vaghela (FLD-UG-209)
  const reassignRes = reassignTransformerMaintenanceOrder({
    woId: 'WO-4412',
    newEngineerIdOrName: 'Hitesh N. Vaghela',
    notes: 'Reallocated to Mehsana Industrial GIDC technician Hitesh N. Vaghela',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(reassignRes.success, true, 'Reassignment to another eligible North engineer must succeed');
  workOrders = reassignRes.updatedWorkOrders;
  notifications = reassignRes.updatedNotifications;

  const reassignedWo = getLatestTransformerWorkOrder(north03, workOrders)!;
  assert.equal(reassignedWo.id, 'WO-4412', 'Original work-order ID must be preserved across reassignment');
  assert.equal(deriveTransformerMaintenanceStatus(reassignedWo), 'AWAITING_ACCEPTANCE', 'Reassigned WO returns to AWAITING_ACCEPTANCE');
  assert.equal(reassignedWo.assignedTo, 'Hitesh N. Vaghela');
  assert.equal(reassignedWo.assignedEngineerId, 'FLD-UG-209');
  assert.ok(reassignedWo.reassignmentHistory && reassignedWo.reassignmentHistory.length === 1);
  assert.ok(reassignedWo.actionHistory && reassignedWo.actionHistory.length >= 3, 'Full audit history preserved');

  // Verify old engineer (Vikram) is no longer active owner of WO-4412, and new engineer (Hitesh) is owner
  assert.equal(isAssignedEngineerForWorkOrder(reassignedWo, fieldVikram, INITIAL_FIELD_ENGINEERS), false, 'Old engineer revoked');
  assert.equal(isAssignedEngineerForWorkOrder(reassignedWo, fieldHitesh, INITIAL_FIELD_ENGINEERS), true, 'New engineer active');
  assert.equal(notifications[0].targetRole, 'field');
  assert.equal(notifications[0].targetUserId, 'FLD-UG-209');
  console.log('✓ Scenarios 12, 13, 14 & 15: Mandatory rejection reason, top-of-table prioritization, Employee notification, and ID-preserving reassignment verified');

  // =========================================================================
  // Scenarios 7, 8, 9, 10 & 11: Full Acceptance -> In Progress -> Pending Review -> Completed Lifecycle
  // =========================================================================
  // Attempt to start work on WO-4411 BEFORE accepting -> must be blocked
  const prematureStart = startTransformerMaintenanceWorkOrder({
    woId: 'WO-4411',
    actorUser: fieldVikram,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(prematureStart.success, false, 'Cannot start work before accepting assignment');

  // Scenario 7 & 8: Field Engineer Vikram accepts WO-4411 -> ACCEPTED
  const acceptRes = acceptTransformerMaintenanceOrder({
    woId: 'WO-4411',
    notes: 'Accepted dispatch; proceeding to Substation Yard',
    actorUser: fieldVikram,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(acceptRes.success, true);
  workOrders = acceptRes.updatedWorkOrders;
  notifications = acceptRes.updatedNotifications;

  assert.equal(
    deriveTransformerMaintenanceStatus(getLatestTransformerWorkOrder(north01, workOrders)),
    'ACCEPTED'
  );
  assert.equal(notifications[0].targetRole, 'employee');
  assert.equal(notifications[0].statusBadge, 'Accepted');

  // Scenario 9: Field Engineer Vikram starts work on WO-4411 -> IN_PROGRESS
  const startRes = startTransformerMaintenanceWorkOrder({
    woId: 'WO-4411',
    notes: 'Thermal camera scan & tap changer inspection started on DEMO-TR-NORTH-01',
    actorUser: fieldVikram,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(startRes.success, true);
  workOrders = startRes.updatedWorkOrders;
  notifications = startRes.updatedNotifications;

  assert.equal(
    deriveTransformerMaintenanceStatus(getLatestTransformerWorkOrder(north01, workOrders)),
    'IN_PROGRESS'
  );
  assert.equal(notifications[0].targetRole, 'employee');
  assert.equal(notifications[0].statusBadge, 'In Progress');

  // Scenario 10: Field Engineer submits inspection -> PENDING_REVIEW (NOT auto-completed!)
  const submitInspRes = submitTransformerInspectionOrderForReview({
    woId: 'WO-4411',
    report: {
      meterSerialScanned: north01.serial_number,
      readingKwh: 3150,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 239, y: 240, b: 238 },
      technicianRemarks: 'Bushing cleaned, silica gel cartridge replaced, load balanced across phases.',
      photoUploaded: true
    },
    checklist: {
      'Oil Level & Silica Gel Breather': 'PASS',
      'HV/LV Bushing Condition': 'PASS'
    },
    photoRefs: ['photo-north01-1'],
    actorUser: fieldVikram,
    effectiveRole: 'field',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(submitInspRes.success, true);
  workOrders = submitInspRes.updatedWorkOrders;
  notifications = submitInspRes.updatedNotifications;

  const afterInspWo = getLatestTransformerWorkOrder(north01, workOrders)!;
  assert.equal(
    deriveTransformerMaintenanceStatus(afterInspWo),
    'PENDING_REVIEW',
    'Submitting inspection must set status to PENDING_REVIEW, not auto-complete to COMPLETED'
  );
  assert.equal(notifications[0].targetRole, 'employee');
  assert.equal(notifications[0].statusBadge, 'Inspection Submitted');

  // Scenario 11: Complete Maintenance Work Order -> COMPLETED
  const completeRes = completeTransformerMaintenanceOrder({
    woId: 'WO-4411',
    completionNotes: 'Verified thermal scan and phase load balancing. Order completed.',
    actorUser: employeeNorth,
    effectiveRole: 'employee',
    workOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    notifications
  });
  assert.equal(completeRes.success, true);
  workOrders = completeRes.updatedWorkOrders;
  notifications = completeRes.updatedNotifications;

  const completedWo = getLatestTransformerWorkOrder(north01, workOrders)!;
  assert.equal(deriveTransformerMaintenanceStatus(completedWo), 'COMPLETED');
  assert.equal(completedWo.status, 'Completed');
  assert.equal(completedWo.actionHistory?.length, 5, 'Chronological timeline has all 5 lifecycle stages');
  console.log('✓ Scenarios 7, 8, 9, 10 & 11: Full lifecycle (AWAITING_ACCEPTANCE -> ACCEPTED -> IN_PROGRESS -> PENDING_REVIEW -> COMPLETED) verified');

  // =========================================================================
  // Scenario 18: 4-Language Dictionary Parity & Offline Queue Resilience
  // =========================================================================
  const languages = ['en', 'gu', 'hi', 'mr'] as const;
  const enKeys = Object.keys(TRANSFORMER_TRANSLATIONS.en);

  for (const lang of languages) {
    const dict = getTransformerI18n(lang);
    assert.ok(dict.cockpitTitle && dict.cockpitTitle.length > 0);
    assert.ok(dict.maintAwaitingAcceptance && dict.maintAwaitingAcceptance.length > 0);
    assert.ok(dict.maintRejected && dict.maintRejected.length > 0);
    assert.ok(dict.btnAcceptAssignment && dict.btnAcceptAssignment.length > 0);
    assert.ok(dict.btnRejectAssignment && dict.btnRejectAssignment.length > 0);
    assert.ok(dict.btnReassignWo && dict.btnReassignWo.length > 0);
    for (const k of enKeys) {
      assert.ok(
        typeof (dict as any)[k] === 'string' && (dict as any)[k].length > 0,
        `Missing translation key "${k}" in language "${lang}"`
      );
    }
  }

  // Offline Queue verification
  const mockBlob = new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' });
  await storeInspectionPhoto('photo-e2e-01', mockBlob);
  const retrievedBlob = await getInspectionPhoto('photo-e2e-01');
  assert.ok(retrievedBlob, 'Photo blob must be retrievable');

  const clientUuid = `insp-e2e-${Date.now()}`;
  const offlineRec: OfflineInspectionRecord = {
    client_uuid: clientUuid,
    transformer_id: north01.id,
    work_order_id: 'WO-4411',
    checklist: { 'Oil Level & Silica Gel Breather': 'PASS' },
    observations: 'Replaced breather silica gel',
    photo_refs: ['photo-e2e-01'],
    gps_accuracy: 3.8,
    latitude: north01.latitude,
    longitude: north01.longitude,
    signature: 'SIG-VIKRAM-SOLANKI',
    review_status: 'PENDING',
    queued_at: new Date().toISOString(),
    status: 'PENDING'
  };

  await enqueueOfflineInspection(offlineRec);
  await enqueueOfflineInspection(offlineRec); // Idempotent duplicate test
  const queued = await getOfflineInspections();
  const matching = queued.filter((q) => q.client_uuid === clientUuid);
  assert.equal(matching.length, 1, 'Offline inspection queue must be idempotent by client_uuid');

  const syncRes = await syncOfflineInspections();
  assert.ok(typeof syncRes.synced === 'number' && typeof syncRes.failed === 'number');
  console.log('✓ Scenario 18: 4-language parity (en/gu/hi/mr) and offline IndexedDB queue idempotency verified');

  console.log('\nALL 18 TRANSFORMER MAINTENANCE ASSIGNMENT & TRACKING E2E TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
