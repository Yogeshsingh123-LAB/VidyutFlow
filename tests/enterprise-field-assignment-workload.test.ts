/**
 * Enterprise-Wide Field Engineer Assignment, Real-Time Workload & Transformer Dashboard Test Suite
 *
 * Verifies:
 * 1. Dynamic active-task counts calculation and real-time synchronization on dispatch,
 *    reassignment, rejection, and completion.
 * 2. Strict subdivision authorization rules (Mehsana City North allows ONLY Vikramaditya,
 *    rejects Hitesh from GIDC and Vikram Zala from Himatnagar; Gandhinagar returns 0 eligible).
 * 3. Unified "Refresh Data" consolidating worklist catalog and live telemetry sensor updates.
 * 4. Multilingual label parity across all 4 official languages (en, gu, hi, mr).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  isEngineerAuthorizedForSubdivision,
  getEligibleEngineersForSubdivision,
  isWorkOrderActiveStatus,
  getEngineerActiveWorkload,
  syncFieldEngineersWorkload,
  dispatchTransformerMaintenanceOrder,
  reassignTransformerMaintenanceOrder,
  acceptTransformerMaintenanceOrder,
  rejectTransformerMaintenanceOrder,
  startTransformerMaintenanceWorkOrder,
  completeTransformerMaintenanceOrder
} from '../src/utils/transformerMaintenanceEngine';
import { CANONICAL_FIELD_ENGINEERS } from '../src/data/demoAuthData';
import { INITIAL_FIELD_ENGINEERS, INITIAL_WORK_ORDERS } from '../src/data/mockData';
import { DEMO_TRANSFORMERS } from '../src/data/transformerDemoData';
import { TRANSFORMER_TRANSLATIONS, getTransformerI18n } from '../src/i18n/transformerTranslations';
import { WorkOrder, AppNotification, ActiveUserIdentity } from '../src/types';

console.log('Running tests/enterprise-field-assignment-workload.test.ts...');

const employeeNorth: ActiveUserIdentity = {
  id: 'EMP-UG-1101',
  name: 'Priya Rathod',
  designation: 'Deputy Executive Engineer',
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

// ============================================================================
// TEST GROUP A: Real-Time Workload Counts & Lifecycle Dynamics
// ============================================================================
console.log('--- Test Group A: Real-Time Workload Counts ---');

// 1. Initial active task backlog calculation
const initialVikramActive = getEngineerActiveWorkload('FLD-UG-201', INITIAL_WORK_ORDERS, CANONICAL_FIELD_ENGINEERS);
const initialHiteshActive = getEngineerActiveWorkload('FLD-UG-209', INITIAL_WORK_ORDERS, CANONICAL_FIELD_ENGINEERS);

assert.ok(initialVikramActive >= 2, 'Vikramaditya has active work orders in initial backlog');
assert.equal(initialHiteshActive, 0, 'Hitesh has 0 active work orders initially');

// 2. Dispatch a new maintenance work order to Vikramaditya -> count increases dynamically by 1
let workOrders: WorkOrder[] = [...INITIAL_WORK_ORDERS];
let notifications: AppNotification[] = [];

const assetNorth01 = DEMO_TRANSFORMERS[0];
const dispatchResult = dispatchTransformerMaintenanceOrder({
  transformerId: assetNorth01.id,
  utilityAssetCode: assetNorth01.utility_asset_code,
  feederId: assetNorth01.feeder_id,
  zone: 'North',
  priority: 'High',
  reason: 'Thermal runaway prevention and tap calibration',
  assignedEngineerIdOrName: 'Vikramaditya Solanki',
  actorUser: employeeNorth,
  effectiveRole: 'employee',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications,
  nextWoId: 'WO-9901'
});

assert.equal(dispatchResult.success, true, 'Dispatch should succeed');
workOrders = dispatchResult.updatedWorkOrders;
notifications = dispatchResult.updatedNotifications;

const countAfterDispatch = getEngineerActiveWorkload('FLD-UG-201', workOrders, CANONICAL_FIELD_ENGINEERS);
assert.equal(countAfterDispatch, initialVikramActive + 1, 'Active task count must increment by 1 after dispatch');

// 3. Synchronized fieldEngineers record reflects live count
const syncedEngineers = syncFieldEngineersWorkload(CANONICAL_FIELD_ENGINEERS, workOrders);
const syncedVikram = syncedEngineers.find(fe => fe.id === 'FLD-UG-201')!;
assert.equal(syncedVikram.activeWorkOrders, countAfterDispatch, 'synced fieldEngineers record must match live workload count');

// 4. Reassignment: Reassign WO-9901 to Hitesh N. Vaghela
// Vikramaditya count must decrement by 1, Hitesh count must increment by 1
const reassignResult = reassignTransformerMaintenanceOrder({
  woId: 'WO-9901',
  newEngineerIdOrName: 'Hitesh N. Vaghela',
  notes: 'Reassigned to Industrial GIDC crew',
  actorUser: employeeNorth,
  effectiveRole: 'employee',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications
});

assert.equal(reassignResult.success, true, 'Reassignment must succeed');
workOrders = reassignResult.updatedWorkOrders;
notifications = reassignResult.updatedNotifications;

const vikramCountAfterReassign = getEngineerActiveWorkload('FLD-UG-201', workOrders, CANONICAL_FIELD_ENGINEERS);
const hiteshCountAfterReassign = getEngineerActiveWorkload('FLD-UG-209', workOrders, CANONICAL_FIELD_ENGINEERS);

assert.equal(vikramCountAfterReassign, initialVikramActive, 'Vikramaditya active count must decrement back after reassignment');
assert.equal(hiteshCountAfterReassign, 1, 'Hitesh active count must increment to 1');

// 5. Rejection: Hitesh rejects WO-9901 with a valid reason
// When rejected, it is no longer an active task for Hitesh
const rejectResult = rejectTransformerMaintenanceOrder({
  woId: 'WO-9901',
  reason: 'Emergency feeder maintenance at Dediyasan GIDC',
  actorUser: fieldHitesh,
  effectiveRole: 'field',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications
});

assert.equal(rejectResult.success, true, 'Rejection with valid reason must succeed');
workOrders = rejectResult.updatedWorkOrders;

const hiteshCountAfterReject = getEngineerActiveWorkload('FLD-UG-209', workOrders, CANONICAL_FIELD_ENGINEERS);
assert.equal(hiteshCountAfterReject, 0, 'Rejected work order must not count as active task for rejecting engineer');

// 6. Completion: Accept, start and complete another order -> active count decrements
// Reassign back to Vikramaditya and complete it
const reassignBack = reassignTransformerMaintenanceOrder({
  woId: 'WO-9901',
  newEngineerIdOrName: 'Vikramaditya Solanki',
  notes: 'Reassigned back to Vikramaditya',
  actorUser: employeeNorth,
  effectiveRole: 'employee',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications
});
assert.equal(reassignBack.success, true);
workOrders = reassignBack.updatedWorkOrders;

const acceptRes = acceptTransformerMaintenanceOrder({
  woId: 'WO-9901',
  actorUser: fieldVikram,
  effectiveRole: 'field',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications
});
assert.equal(acceptRes.success, true);
workOrders = acceptRes.updatedWorkOrders;

const startRes = startTransformerMaintenanceWorkOrder({
  woId: 'WO-9901',
  actorUser: fieldVikram,
  effectiveRole: 'field',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications
});
assert.equal(startRes.success, true);
workOrders = startRes.updatedWorkOrders;

const completeRes = completeTransformerMaintenanceOrder({
  woId: 'WO-9901',
  completionNotes: 'Verified on site, temperatures normal',
  actorUser: employeeNorth,
  effectiveRole: 'employee',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications
});
assert.equal(completeRes.success, true);
workOrders = completeRes.updatedWorkOrders;

const vikramCountAfterComplete = getEngineerActiveWorkload('FLD-UG-201', workOrders, CANONICAL_FIELD_ENGINEERS);
assert.equal(vikramCountAfterComplete, initialVikramActive, 'Completed work order must decrement active count');

console.log('✓ Test Group A: Dynamic workload counts and lifecycle synchronization passed');

// ============================================================================
// TEST GROUP B: Strict Subdivision Authorization Rules
// ============================================================================
console.log('--- Test Group B: Subdivision Authorization Rules ---');

// 1. Mehsana City North must allow ONLY Vikramaditya Solanki (FLD-UG-201)
const northEligible = getEligibleEngineersForSubdivision('Mehsana City North', CANONICAL_FIELD_ENGINEERS);
assert.equal(northEligible.length, 1, 'Mehsana City North must have exactly 1 eligible engineer');
assert.equal(northEligible[0].id, 'FLD-UG-201', 'Eligible engineer must be Vikramaditya Solanki');
assert.equal(northEligible[0].name, 'Vikramaditya Solanki');

// 2. Hitesh N. Vaghela (FLD-UG-209, Mehsana Industrial GIDC) must NOT be authorized for Mehsana City North
assert.equal(
  isEngineerAuthorizedForSubdivision('Mehsana Industrial GIDC', 'FLD-UG-209', 'Mehsana City North'),
  false,
  'Hitesh from GIDC must be blocked from Mehsana City North'
);

// 3. Vikram Zala (FLD-UG-212, Himatnagar Circle) must NOT be authorized for Mehsana City North
assert.equal(
  isEngineerAuthorizedForSubdivision('Himatnagar Circle · 11kV Radial Feeder Ops', 'FLD-UG-212', 'Mehsana City North'),
  false,
  'Vikram Zala from Himatnagar must be blocked from Mehsana City North'
);

// 4. Dharmesh P. Chaudhari (FLD-UG-204, Kadi Division) must NOT be authorized for Mehsana City North
assert.equal(
  isEngineerAuthorizedForSubdivision('Kadi Division', 'FLD-UG-204', 'Mehsana City North'),
  false,
  'Dharmesh Chaudhari from Kadi must be blocked from Mehsana City North'
);

// 5. Mehsana Industrial GIDC must allow ONLY Hitesh N. Vaghela (FLD-UG-209)
const gidcEligible = getEligibleEngineersForSubdivision('Mehsana Industrial GIDC', CANONICAL_FIELD_ENGINEERS);
assert.equal(gidcEligible.length, 1);
assert.equal(gidcEligible[0].id, 'FLD-UG-209');
assert.equal(gidcEligible[0].name, 'Hitesh N. Vaghela');

// 6. Kadi Division must allow ONLY Dharmesh P. Chaudhari (FLD-UG-204)
const kadiEligible = getEligibleEngineersForSubdivision('Kadi Division', CANONICAL_FIELD_ENGINEERS);
assert.equal(kadiEligible.length, 1);
assert.equal(kadiEligible[0].id, 'FLD-UG-204');

// 7. Himatnagar Circle must allow ONLY Vikram Zala (FLD-UG-212)
const himatEligible = getEligibleEngineersForSubdivision('Himatnagar Circle · 11kV Radial Feeder Ops', CANONICAL_FIELD_ENGINEERS);
assert.equal(himatEligible.length, 1);
assert.equal(himatEligible[0].id, 'FLD-UG-212');

// 8. Gandhinagar Sub-Division 2 has no stationed crew -> must return empty list []
const gandhiEligible = getEligibleEngineersForSubdivision('Gandhinagar Sub-Division 2', CANONICAL_FIELD_ENGINEERS);
assert.equal(gandhiEligible.length, 0, 'Gandhinagar must return 0 eligible engineers');

// 9. Dispatching to out-of-subdivision engineer must be rejected by engine
const invalidDispatch = dispatchTransformerMaintenanceOrder({
  transformerId: DEMO_TRANSFORMERS[1].id,
  utilityAssetCode: DEMO_TRANSFORMERS[1].utility_asset_code,
  feederId: DEMO_TRANSFORMERS[1].feeder_id,
  zone: 'Mehsana City North',
  priority: 'Routine',
  reason: 'Testing cross-subdivision block',
  assignedEngineerIdOrName: 'Hitesh N. Vaghela',
  actorUser: employeeNorth,
  effectiveRole: 'employee',
  workOrders,
  fieldEngineers: CANONICAL_FIELD_ENGINEERS,
  notifications,
  nextWoId: 'WO-9902'
});
assert.equal(invalidDispatch.success, false, 'Dispatching GIDC engineer to Mehsana City North must fail');
assert.ok(invalidDispatch.error?.includes('Unauthorized Assignment') || invalidDispatch.error?.includes('cannot be assigned'));

console.log('✓ Test Group B: Strict subdivision authorization rules verified');

// ============================================================================
// TEST GROUP C: Multilingual Label Parity (en, gu, hi, mr)
// ============================================================================
console.log('--- Test Group C: Multilingual Label Parity ---');

const languages = ['en', 'gu', 'hi', 'mr'] as const;

for (const lang of languages) {
  const dict = getTransformerI18n(lang);
  assert.ok(dict.activeTasksLabel && dict.activeTasksLabel.trim().length > 0, `Missing activeTasksLabel for ${lang}`);
  assert.ok(dict.activeTaskSingular && dict.activeTaskSingular.trim().length > 0, `Missing activeTaskSingular for ${lang}`);
  assert.ok(dict.noEligibleEngineers && dict.noEligibleEngineers.trim().length > 0, `Missing noEligibleEngineers for ${lang}`);
  assert.ok(dict.subdivisionMismatch && dict.subdivisionMismatch.trim().length > 0, `Missing subdivisionMismatch for ${lang}`);
  assert.ok(dict.refreshData && dict.refreshData.trim().length > 0, `Missing refreshData for ${lang}`);
  assert.ok(dict.refreshing && dict.refreshing.trim().length > 0, `Missing refreshing for ${lang}`);
}

console.log('✓ Test Group C: Multilingual label parity (en, gu, hi, mr) verified');

// ============================================================================
// TEST GROUP D: Manual-Only Refresh Data, In-Flight Guard & No Auto-Refresh Loop
// ============================================================================
console.log('--- Test Group D: Manual-Only Refresh Data & Telemetry Integrity ---');

const empTrViewPath = path.resolve(process.cwd(), 'src/components/transformers/EmployeeTransformersView.tsx');
const empTrViewSrc = fs.readFileSync(empTrViewPath, 'utf-8');

const appContextPath = path.resolve(process.cwd(), 'src/context/AppContext.tsx');
const appContextSrc = fs.readFileSync(appContextPath, 'utf-8');

// 1. Verify showToast and dismissToast in AppContext are memoized with useCallback
assert.ok(
  appContextSrc.includes('const dismissToast = useCallback(') &&
    appContextSrc.includes('const showToast = useCallback('),
  'AppContext must memoize dismissToast and showToast with useCallback to prevent effect dependency loops'
);

// 2. Verify no automatic useEffect calls handleRefreshData on mount or dependency change
assert.equal(
  /useEffect\(\(\)\s*=>\s*\{\s*handleRefreshData\(\)/m.test(empTrViewSrc),
  false,
  'EmployeeTransformersView must NOT automatically invoke handleRefreshData inside a useEffect'
);

// 3. Verify lastDataRefreshTime is initialized to null (initial load is not labeled as a manual refresh)
assert.ok(
  empTrViewSrc.includes('const [lastDataRefreshTime, setLastDataRefreshTime] = useState<string | null>(null);'),
  'lastDataRefreshTime must initialize to null until a user-initiated manual refresh occurs'
);

// 4. Verify in-flight concurrency guard prevents duplicate concurrent refreshes
assert.ok(
  empTrViewSrc.includes('if (isRefreshingRef.current) return;') &&
    empTrViewSrc.includes('isRefreshingRef.current = true;'),
  'handleRefreshData must guard against concurrent duplicate refreshes using isRefreshingRef'
);

// 5. Verify no random telemetry mutation (Math.random) in EmployeeTransformersView
assert.equal(
  empTrViewSrc.includes('Math.random()'),
  false,
  'EmployeeTransformersView must not randomly mutate calibrated DEMO telemetry values on refresh'
);

// 6. Verify calibrated DEMO transformers preserve exact values
const northDemoAssets = DEMO_TRANSFORMERS.filter(t => t.zone === 'North');
assert.equal(northDemoAssets.length, 4, 'Must preserve all 4 North Subdivision DEMO transformers');
assert.equal(northDemoAssets[0].utility_asset_code, 'DEMO-TR-NORTH-01');
assert.equal(northDemoAssets[0].load_utilization_pct, 94.6);
assert.equal(northDemoAssets[0].oil_temp_c, 88.5);
assert.equal(northDemoAssets[0].winding_temp_c, 98.2);
assert.equal(northDemoAssets[1].utility_asset_code, 'DEMO-TR-NORTH-02');
assert.equal(northDemoAssets[1].load_utilization_pct, 48.0);
assert.equal(northDemoAssets[2].utility_asset_code, 'DEMO-TR-NORTH-03');
assert.equal(northDemoAssets[2].load_utilization_pct, 81.0);
assert.equal(northDemoAssets[3].utility_asset_code, 'DEMO-TR-NORTH-04');
assert.equal(northDemoAssets[3].status, 'OFFLINE');

// 7. Verify header retains CALIBRATED DEMO TELEMETRY indicator and exactly one Refresh Data button
assert.ok(
  empTrViewSrc.includes('CALIBRATED DEMO TELEMETRY'),
  'Header must retain the CALIBRATED DEMO TELEMETRY indicator'
);
const refreshButtonMatches = empTrViewSrc.match(/aria-label="Refresh Transformer Catalog and Telemetry Data"/g) || [];
assert.equal(
  refreshButtonMatches.length,
  1,
  'Header must contain exactly one unified Refresh Data button'
);

console.log('✓ Test Group D: Manual-only Refresh Data, in-flight guard, and DEMO telemetry preservation verified');

console.log('======================================================================');
console.log('ALL ENTERPRISE FIELD ASSIGNMENT & WORKLOAD TESTS PASSED SUCCESSFULLY!');
console.log('======================================================================');

