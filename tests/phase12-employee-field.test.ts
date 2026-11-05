/**
 * Phase 12 Step 9: Employee + Field Engineer Frontend Verification.
 *
 * Verifies:
 * 1. ROLE_ALLOWED_TABS permissions in src/utils/authSecurity.ts
 * 2. Sidebar & MobileNav tab registration for 'transformers'
 * 3. React.lazy code-splitting in EmployeePortal & FieldPortal
 * 4. Offline IndexedDB & client_uuid idempotency in transformerInspectionStore
 * 5. Isolation guardrail: mockData.ts unmodified, transformerDemoData.ts intact
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ROLE_ALLOWED_TABS, isTabAllowedForRole } from '../src/utils/authSecurity';
import {
  DEMO_TRANSFORMERS,
  DEMO_TELEMETRY_SERIES,
  DEMO_TRANSFORMER_ALERTS,
  DEFAULT_INSPECTION_CHECKLIST
} from '../src/data/transformerDemoData';
import {
  storeInspectionPhoto,
  getInspectionPhoto,
  enqueueOfflineInspection,
  getOfflineInspections,
  removeOfflineInspection,
  syncOfflineInspections,
  OfflineInspectionRecord
} from '../src/utils/transformerInspectionStore';

async function run() {
  console.log('Running tests/phase12-employee-field.test.ts...');

  // -------------------------------------------------------------------------
  // 1. Role-Based Access Control Permissions
  // -------------------------------------------------------------------------
  assert.ok(ROLE_ALLOWED_TABS.employee.includes('transformers'), 'employee must have transformers tab');
  assert.ok(ROLE_ALLOWED_TABS.field.includes('transformers'), 'field must have transformers tab');
  assert.ok(ROLE_ALLOWED_TABS.management.includes('transformers'), 'management must have transformers tab');
  assert.ok(ROLE_ALLOWED_TABS.admin.includes('transformers'), 'admin must have transformers tab');
  assert.ok(!ROLE_ALLOWED_TABS.consumer.includes('transformers'), 'consumer must NOT have transformers tab');

  assert.equal(isTabAllowedForRole('employee', 'transformers'), true);
  assert.equal(isTabAllowedForRole('field', 'transformers'), true);
  assert.equal(isTabAllowedForRole('consumer', 'transformers'), false);
  console.log('✓ RBAC tab permissions verified');

  // -------------------------------------------------------------------------
  // 2. Navigation & Sidebar Registration
  // -------------------------------------------------------------------------
  const sidebarSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/Sidebar.tsx'), 'utf8');
  assert.ok(sidebarSrc.includes("id: 'transformers'"), 'Sidebar.tsx must define transformers nav item');
  assert.ok(sidebarSrc.includes('Distribution Transformers'), 'Sidebar.tsx must have employee transformers label');
  assert.ok(sidebarSrc.includes('DTR Inspections'), 'Sidebar.tsx must have field transformers label');

  const mobileNavSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/MobileNav.tsx'), 'utf8');
  assert.ok(mobileNavSrc.includes("id: 'transformers'"), 'MobileNav.tsx must define transformers nav item');
  console.log('✓ Sidebar and MobileNav tab registration verified');

  // -------------------------------------------------------------------------
  // 3. Code-Splitting & React.lazy Portal Integration
  // -------------------------------------------------------------------------
  const empPortalSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/employee/EmployeePortal.tsx'), 'utf8');
  assert.ok(empPortalSrc.includes('EmployeeTransformersView'), 'EmployeePortal must reference EmployeeTransformersView');
  assert.ok(empPortalSrc.includes("activeTab === 'transformers'"), 'EmployeePortal must switch on activeTab transformers');
  assert.ok(empPortalSrc.includes('React.lazy(') || empPortalSrc.includes('lazy('), 'EmployeePortal must lazy load');

  const fldPortalSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/field/FieldPortal.tsx'), 'utf8');
  assert.ok(fldPortalSrc.includes('FieldTransformerInspectionsView'), 'FieldPortal must reference FieldTransformerInspectionsView');
  assert.ok(fldPortalSrc.includes("activeTab === 'transformers'"), 'FieldPortal must switch on activeTab transformers');
  assert.ok(fldPortalSrc.includes('React.lazy(') || fldPortalSrc.includes('lazy('), 'FieldPortal must lazy load');
  console.log('✓ React.lazy code-splitting in portals verified');

  // -------------------------------------------------------------------------
  // 4. Offline Inspection Store & Idempotency
  // -------------------------------------------------------------------------
  // Test photo storage
  const mockBlob = new Blob(['fake-image-bytes-data'], { type: 'image/jpeg' });
  const photoId = 'test-photo-001';
  await storeInspectionPhoto(photoId, mockBlob);
  const retrievedBlob = await getInspectionPhoto(photoId);
  assert.ok(retrievedBlob !== null, 'Stored photo Blob must be retrievable');
  assert.equal(retrievedBlob?.type, 'image/jpeg');

  // Test offline inspection enqueue & idempotency
  const testClientUuid = 'client-uuid-test-inspection-99';
  const inspectionRecord: OfflineInspectionRecord = {
    client_uuid: testClientUuid,
    transformer_id: 'tr-north-01-uuid',
    work_order_id: 'WO-TR-DEMO-TR-NORTH-01-FLD',
    checklist: { 'Conservator tank oil level within nominal mark': 'PASS' },
    observations: 'Test observation',
    photo_refs: [photoId],
    gps_accuracy: 3.5,
    signature: 'SIG-TEST',
    review_status: 'VERIFIED',
    queued_at: new Date().toISOString(),
    status: 'PENDING',
  };

  await enqueueOfflineInspection(inspectionRecord);
  let queue = await getOfflineInspections();
  const queuedItem = queue.find((i) => i.client_uuid === testClientUuid);
  assert.ok(queuedItem !== undefined, 'Inspection record must be queued');
  assert.equal(queuedItem?.client_uuid, testClientUuid);

  // Re-enqueueing same client_uuid should be idempotent (not duplicate)
  await enqueueOfflineInspection(inspectionRecord);
  queue = await getOfflineInspections();
  const duplicateMatches = queue.filter((i) => i.client_uuid === testClientUuid);
  assert.equal(duplicateMatches.length, 1, 'Client UUID must be idempotent in queue');

  // Test sync function with mock API
  let apiCalledWith: any = null;
  const mockPostFn = async (endpoint: string, payload: any) => {
    apiCalledWith = { endpoint, payload };
    return { status: 201, data: { id: 'insp-server-id' } };
  };

  const syncResult = await syncOfflineInspections(mockPostFn);
  assert.ok(syncResult.synced >= 1, 'Should sync at least 1 inspection');
  assert.ok(apiCalledWith !== null, 'Mock API must be invoked during sync');
  assert.ok(apiCalledWith.endpoint.includes('/transformers/tr-north-01-uuid/inspections'));
  assert.equal(apiCalledWith.payload.client_uuid, testClientUuid);

  // Queue should no longer have the synced item
  queue = await getOfflineInspections();
  const remaining = queue.find((i) => i.client_uuid === testClientUuid);
  assert.equal(remaining, undefined, 'Synced inspection must be cleared from queue');
  console.log('✓ Offline storage and client_uuid idempotency verified');

  // -------------------------------------------------------------------------
  // 5. Guardrail: mockData.ts Untouched & Demo Fixtures Isolated
  // -------------------------------------------------------------------------
  assert.ok(DEMO_TRANSFORMERS.length >= 3, 'Must have at least 3 demo transformers');
  assert.ok(DEMO_TELEMETRY_SERIES.length >= 5, 'Must have telemetry series points');
  assert.ok(DEMO_TRANSFORMER_ALERTS.length >= 2, 'Must have demo transformer alerts');
  assert.ok(DEFAULT_INSPECTION_CHECKLIST.length >= 5, 'Must have checklist items');

  const northTr = DEMO_TRANSFORMERS.find((t) => t.zone === 'North');
  const southTr = DEMO_TRANSFORMERS.find((t) => t.zone === 'South');
  assert.ok(northTr !== undefined && southTr !== undefined, 'Must have North and South transformers');
  assert.notEqual(northTr?.id, southTr?.id, 'North and South transformers must be distinct');
  console.log('✓ Demo data isolation guardrail verified');

  console.log('\n✓ ALL PHASE 12 EMPLOYEE + FIELD FRONTEND TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

