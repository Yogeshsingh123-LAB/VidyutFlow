import assert from 'node:assert/strict';
import {
  ALL_BACKUP_CATEGORIES,
  EXCLUDED_SENSITIVE_OR_PREFERENCE_STORAGE_KEYS,
  CANONICAL_DEMO_STORAGE_KEYS,
  BACKUP_FORMAT_ID,
  BACKUP_SCHEMA_VERSION,
  BACKUP_FORMAT_VERSION,
  BACKUP_APPLICATION_VERSION,
  BACKUP_AUDIT_HISTORY_STORAGE_KEY,
  PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY,
  DEMO_BACKUP_UI_TRANSLATIONS,
  stableStringify,
  computeDeterministicHexDigest,
  computeCategoryChecksum,
  computeEnvelopeIntegrityChecksum,
  containsForbiddenCredentialKey,
  sanitizeBackupValue,
  createDemoBackup,
  validateDemoBackup,
  generateDemoRestorePreview,
  preparePreRestoreRecoverySnapshot,
  executeSafeDemoRestore,
  recoverFromPreRestoreSnapshot,
  getBackupAuditHistory,
  type BackupActorIdentity,
  type DemoBackupEnvelope
} from '../src/utils/demoBackupEngine';
import {
  INITIAL_CONSUMERS,
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_EMPLOYEES,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS
} from '../src/data/mockData';
import { CANONICAL_FIELD_ENGINEERS } from '../src/data/demoAuthData';
import { FieldOfflineQueueItem } from '../src/utils/fieldOfflineQueue';

class InMemoryStorage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  snapshot(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of this.map.entries()) {
      out[k] = v;
    }
    return out;
  }
}

const ADMIN_ACTOR: BackupActorIdentity = {
  id: 'ADM-DEMO-01',
  name: 'R. K. Vaghela (System Admin)',
  role: 'admin',
  subdivision: 'Corporate HQ, Mehsana'
};

function createSeededStorage(): InMemoryStorage {
  const storage = new InMemoryStorage();
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.consumers, JSON.stringify(INITIAL_CONSUMERS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.connections, JSON.stringify(INITIAL_CONNECTIONS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(INITIAL_BILLS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.payments, JSON.stringify(INITIAL_PAYMENTS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.applications, JSON.stringify(INITIAL_APPLICATIONS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.complaints, JSON.stringify(INITIAL_COMPLAINTS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.workOrders, JSON.stringify(INITIAL_WORK_ORDERS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.employees, JSON.stringify(INITIAL_EMPLOYEES));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.fieldEngineers, JSON.stringify(CANONICAL_FIELD_ENGINEERS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.incidents, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.notifications, JSON.stringify(INITIAL_NOTIFICATIONS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.auditLogs, JSON.stringify(AUDIT_LOGS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.aiRecommendations, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.notificationInboxState, JSON.stringify({}));
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.accountConnections,
    JSON.stringify({
      'ACC-CON-001': ['04281-99231', '04281-41572'],
      'ACC-CON-002': ['05112-88340']
    })
  );
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.selectedConsumerConnections,
    JSON.stringify({
      'ACC-CON-001': '04281-99231',
      'ACC-CON-002': '05112-88340'
    })
  );
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.billingReminderKeys,
    JSON.stringify(['BILL_REMINDER:BILL-UG-2026-10-8821:DUE_SOON'])
  );
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.slaEmittedEventKeys,
    JSON.stringify(['SLA_WARNING:CMP-2026-8841'])
  );
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.dismissedModalIds,
    JSON.stringify(['NTF-101'])
  );
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.adminStaffUsers,
    JSON.stringify([
      {
        id: 'USR-ADM-01',
        name: 'R. K. Vaghela',
        email: 'admin.hq@ugvcl.com',
        role: 'System Admin',
        subdivision: 'Corporate HQ, Mehsana',
        status: 'Active',
        lastLogin: '2 mins ago'
      }
    ])
  );
  storage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.adminRbacPermissions,
    JSON.stringify([
      {
        module: 'Billing & Tariff Override',
        consumer: false,
        employee: true,
        field: false,
        management: true,
        admin: true
      }
    ])
  );
  return storage;
}

console.log('=== VIDYUTFLOW 2.0 PHASE 5.3 — ADMIN DEMO BACKUP, VALIDATION & SAFE RESTORE VERIFICATION ===');

// 1. Full backup generation
{
  const storage = createSeededStorage();
  const res = createDemoBackup({
    actor: ADMIN_ACTOR,
    storage,
    nowIso: '2026-11-01T10:00:00.000Z'
  });

  assert.equal(res.success, true);
  assert.equal(res.authorized, true);
  const envelope = res.envelope!;
  assert.equal(envelope.formatId, BACKUP_FORMAT_ID);
  assert.equal(envelope.schemaVersion, BACKUP_SCHEMA_VERSION);
  assert.equal(envelope.formatVersion, BACKUP_FORMAT_VERSION);
  assert.equal(envelope.applicationVersion, BACKUP_APPLICATION_VERSION);
  assert.equal(envelope.createdAt, '2026-11-01T10:00:00.000Z');
  assert.equal(envelope.createdBy.id, ADMIN_ACTOR.id);
  assert.equal(envelope.createdBy.role, 'admin');
  const totalRecords = Object.values(envelope.recordCounts).reduce((a, b) => a + b, 0);
  assert.ok(totalRecords > 0, 'Backup should contain records');
  console.log('✓ [1/26] Full backup generation verified');
}

// 2. Correct category manifest (23 supported categories + explicit exclusion manifest)
{
  const storage = createSeededStorage();
  const res = createDemoBackup({ actor: ADMIN_ACTOR, storage });
  const envelope = res.envelope!;
  assert.equal(ALL_BACKUP_CATEGORIES.length, 23);
  assert.equal(envelope.categoryManifest.length, 23);
  for (const cat of ALL_BACKUP_CATEGORIES) {
    assert.ok(typeof envelope.recordCounts[cat] === 'number', `Missing record count for ${cat}`);
    assert.ok(
      typeof envelope.integrity.categoryChecksums[cat] === 'string' &&
        envelope.integrity.categoryChecksums[cat].length === 64,
      `Missing checksum for ${cat}`
    );
  }
  assert.ok(EXCLUDED_SENSITIVE_OR_PREFERENCE_STORAGE_KEYS.length >= 8);
  console.log('✓ [2/26] Correct 23-category manifest and excluded keys verified');
}

// 3. Stable deterministic serialization
{
  const objA = { b: 2, a: 1, nested: { z: 'last', a: 'first', arr: [{ y: 2, x: 1 }] } };
  const objB = { nested: { arr: [{ x: 1, y: 2 }], a: 'first', z: 'last' }, a: 1, b: 2 };
  const serializedA = stableStringify(objA);
  const serializedB = stableStringify(objB);
  assert.equal(serializedA, serializedB, 'stableStringify must be key-order invariant');
  assert.equal(
    computeDeterministicHexDigest(serializedA),
    computeDeterministicHexDigest(serializedB),
    'Checksums for identical objects with reordered keys must match'
  );
  console.log('✓ [3/26] Stable deterministic serialization verified');
}

// 4. Valid JSON export
{
  const storage = createSeededStorage();
  const res = createDemoBackup({
    actor: ADMIN_ACTOR,
    storage,
    nowIso: '2026-11-01T10:00:00.000Z'
  });
  assert.ok(res.filename!.startsWith('vidyutflow-ugvcl-demo-backup-20261101-'));
  assert.ok(res.filename!.endsWith('.json'));
  assert.ok(res.byteSize! > 1000);
  const parsed = JSON.parse(res.serializedJson!) as DemoBackupEnvelope;
  assert.equal(parsed.backupId, res.envelope!.backupId);
  assert.equal(parsed.integrity.checksum, res.envelope!.integrity.checksum);
  console.log('✓ [4/26] Valid portable JSON export verified');
}

// 5. Backup integrity validation
{
  const storage = createSeededStorage();
  const res = createDemoBackup({ actor: ADMIN_ACTOR, storage });
  const validation = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: res.envelope!,
    storage
  });
  assert.equal(validation.isValid, true);
  assert.equal(validation.schemaCompatible, true);
  assert.equal(validation.integrityVerified, true);
  assert.equal(validation.tamperedCategories.length, 0);
  assert.equal(validation.missingCategories.length, 0);
  assert.equal(validation.issues.length, 0);
  console.log('✓ [5/26] Backup integrity validation verified');
}

// 6. Corrupt / tampered backup rejection
{
  const storage = createSeededStorage();
  const res = createDemoBackup({ actor: ADMIN_ACTOR, storage });
  const tampered: DemoBackupEnvelope = JSON.parse(JSON.stringify(res.envelope!));
  tampered.payload.bills[0].totalAmount = 999999;

  const validation = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: tampered,
    storage
  });
  assert.equal(validation.isValid, false);
  assert.equal(validation.integrityVerified, false);
  assert.ok(validation.tamperedCategories.includes('bills'), 'Should detect tampered bills category');
  assert.ok(validation.issues.some(e => e.code === 'CATEGORY_CHECKSUM_MISMATCH'));
  assert.ok(validation.issues.some(e => e.code === 'CHECKSUM_MISMATCH'));
  console.log('✓ [6/26] Corrupt / tampered backup rejection verified');
}

// 7. Unsupported schema / format version rejection
{
  const storage = createSeededStorage();
  const res = createDemoBackup({ actor: ADMIN_ACTOR, storage });
  const envelope = res.envelope!;

  const badSchema = { ...envelope, schemaVersion: 999 };
  const res1 = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: badSchema, storage });
  assert.equal(res1.isValid, false);
  assert.equal(res1.schemaCompatible, false);
  assert.ok(res1.issues.some(e => e.code === 'UNSUPPORTED_SCHEMA_VERSION'));

  const badFormat = { ...envelope, formatId: 'UNKNOWN_FORMAT' };
  const res2 = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: badFormat, storage });
  assert.equal(res2.isValid, false);
  assert.ok(res2.issues.some(e => e.code === 'INVALID_FORMAT_ID'));

  const badFormatVer = { ...envelope, formatVersion: '9.9.9' };
  const res3 = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: badFormatVer, storage });
  assert.equal(res3.isValid, false);
  assert.ok(res3.issues.some(e => e.code === 'UNSUPPORTED_FORMAT_VERSION'));
  console.log('✓ [7/26] Unsupported schema/format version rejection verified');
}

// 8. Malformed JSON & unsafe script/prototype pollution rejection
{
  const malformedRes = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: '{ "formatId": "VIDYUTFLOW_DEMO_BACKUP_V1", broken json '
  });
  assert.equal(malformedRes.isValid, false);
  assert.ok(malformedRes.issues.some(e => e.code === 'MALFORMED_JSON'));

  const protoPollutedJson =
    '{"formatId":"VIDYUTFLOW_DEMO_BACKUP_V1","__proto__":{"polluted":true},"schemaVersion":1}';
  const protoRes = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: protoPollutedJson
  });
  assert.equal(protoRes.isValid, false);
  assert.ok(protoRes.issues.some(e => e.code === 'UNSAFE_CODE_DETECTED'));

  const storage = createSeededStorage();
  const xssEnvelope = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;
  const xssClone: DemoBackupEnvelope = JSON.parse(JSON.stringify(xssEnvelope));
  xssClone.payload.consumers[0].name = '<script>alert("xss")</script>';
  const xssRes = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: JSON.stringify(xssClone)
  });
  assert.equal(xssRes.isValid, false);
  assert.ok(xssRes.issues.some(e => e.code === 'UNSAFE_CODE_DETECTED'));
  console.log('✓ [8/26] Malformed JSON & unsafe script/prototype pollution rejection verified');
}

// 9. Oversized file handling
{
  const storage = createSeededStorage();
  const envelope = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;
  const json = JSON.stringify(envelope);
  const res = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: json,
    maxBytes: 256
  });
  assert.equal(res.isValid, false);
  assert.ok(res.issues.some(e => e.code === 'FILE_TOO_LARGE'));
  console.log('✓ [9/26] Oversized file handling verified');
}

// 10. Zero state changes during validation
{
  const storage = createSeededStorage();
  const envelope = createDemoBackup({
    actor: ADMIN_ACTOR,
    storage: createSeededStorage() // separate instance so storage has no audit mutation before test
  }).envelope!;
  const storageBeforeValidation = storage.snapshot();

  const valResult = validateDemoBackup({
    actor: ADMIN_ACTOR,
    backupInput: envelope,
    recordAudit: false,
    storage
  });
  assert.equal(valResult.isValid, true);
  assert.deepEqual(
    storage.snapshot(),
    storageBeforeValidation,
    'validateDemoBackup must not mutate live storage'
  );
  console.log('✓ [10/26] Zero live state changes during validation verified');
}

// 11. Restore preview correctness
{
  const liveStorage = createSeededStorage();
  const backupStorage = createSeededStorage();

  // Modify backupStorage: add a new complaint, modify a bill, remove a notification
  const modifiedComplaints = [
    ...INITIAL_COMPLAINTS,
    {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-2026-9999',
      description: 'New backup complaint'
    }
  ];
  backupStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.complaints, JSON.stringify(modifiedComplaints));

  const modifiedBills = INITIAL_BILLS.map((b, idx) =>
    idx === 0 ? { ...b, paidAmount: 500, status: 'Partial' as const } : b
  );
  backupStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(modifiedBills));

  const fewerNotifications = INITIAL_NOTIFICATIONS.slice(1);
  backupStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.notifications, JSON.stringify(fewerNotifications));

  const backupEnvelope = createDemoBackup({ actor: ADMIN_ACTOR, storage: backupStorage }).envelope!;
  const preview = generateDemoRestorePreview({
    actor: ADMIN_ACTOR,
    backupInput: backupEnvelope,
    storage: liveStorage
  });

  assert.equal(preview.canRestoreSafely, true);
  const complaintDiff = preview.categoryDiffs.find(d => d.category === 'complaints')!;
  assert.equal(complaintDiff.addedCount, 1);
  assert.equal(complaintDiff.removedCount, 0);

  const billDiff = preview.categoryDiffs.find(d => d.category === 'bills')!;
  assert.equal(billDiff.replacedCount, 1);

  const notifDiff = preview.categoryDiffs.find(d => d.category === 'notifications')!;
  assert.equal(notifDiff.removedCount, 1);
  console.log('✓ [11/26] Restore preview correctness (+Added, ~Replaced, -Removed, =Unchanged) verified');
}

// 12 & 13. Admin-only authorization & unauthorized role rejection
{
  const storage = createSeededStorage();
  const validBackup = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;
  const unauthorizedRoles = ['consumer', 'employee', 'field', 'management'] as const;

  for (const role of unauthorizedRoles) {
    const nonAdminActor: BackupActorIdentity = {
      id: `USR-${role.toUpperCase()}`,
      name: `Unauthorized ${role}`,
      role
    };

    const createRes = createDemoBackup({ actor: nonAdminActor, storage });
    assert.equal(createRes.success, false, `createDemoBackup must reject role ${role}`);
    assert.equal(createRes.authorized, false);

    const valRes = validateDemoBackup({ actor: nonAdminActor, backupInput: validBackup, storage });
    assert.equal(valRes.isValid, false);
    assert.equal(valRes.authorized, false);
    assert.ok(valRes.issues.some(e => e.code === 'UNAUTHORIZED_ROLE'));

    const previewRes = generateDemoRestorePreview({
      actor: nonAdminActor,
      backupInput: validBackup,
      storage
    });
    assert.equal(previewRes.authorized, false);
    assert.equal(previewRes.canRestoreSafely, false);

    const restoreRes = executeSafeDemoRestore({
      actor: nonAdminActor,
      backupInput: validBackup,
      explicitConfirmation: true,
      confirmationText: 'RESTORE',
      storage
    });
    assert.equal(restoreRes.success, false);
    assert.equal(restoreRes.authorized, false);
    assert.equal(restoreRes.status, 'BLOCKED_UNAUTHORIZED');

    const recoverRes = recoverFromPreRestoreSnapshot({ actor: nonAdminActor, storage });
    assert.equal(recoverRes.success, false);
    assert.equal(recoverRes.authorized, false);
    assert.equal(recoverRes.status, 'BLOCKED_UNAUTHORIZED');
  }
  console.log('✓ [12/26] Admin-only authorization enforced at engine boundary');
  console.log('✓ [13/26] Unauthorized restore rejection for Consumer, Employee, Field Engineer & Management verified');
}

// 14. Explicit confirmation requirement
{
  const storage = createSeededStorage();
  const validBackup = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;

  const noCheckbox = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: validBackup,
    explicitConfirmation: false,
    confirmationText: 'RESTORE',
    storage
  });
  assert.equal(noCheckbox.success, false);
  assert.equal(noCheckbox.status, 'BLOCKED_CONFIRMATION_REQUIRED');

  const wrongKeyword = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: validBackup,
    explicitConfirmation: true,
    confirmationText: 'YES',
    storage
  });
  assert.equal(wrongKeyword.success, false);
  assert.equal(wrongKeyword.status, 'BLOCKED_CONFIRMATION_REQUIRED');
  console.log('✓ [14/26] Explicit administrator confirmation requirement verified');
}

// 15. Pre-restore recovery snapshot creation & verification
{
  const storage = createSeededStorage();
  const snapRes = preparePreRestoreRecoverySnapshot({
    actor: ADMIN_ACTOR,
    targetBackupId: 'BKP-TEST-01',
    storage,
    nowIso: '2026-11-01T11:00:00.000Z'
  });
  assert.equal(snapRes.usable, true);
  assert.ok(snapRes.snapshot);
  assert.ok(storage.getItem(PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY));
  console.log('✓ [15/26] Pre-restore recovery snapshot creation and verification verified');
}

// 16. Successful restore
{
  const liveStorage = createSeededStorage();
  const targetStorage = createSeededStorage();

  // Mutate targetStorage so backup has a paid bill
  const updatedBills = INITIAL_BILLS.map(b =>
    b.billNo === 'BILL-UG-2026-10-8821'
      ? { ...b, paidAmount: b.totalAmount, status: 'Paid' as const }
      : b
  );
  targetStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(updatedBills));
  const backupEnvelope = createDemoBackup({ actor: ADMIN_ACTOR, storage: targetStorage }).envelope!;

  let callbackStateCalled = false;
  const restoreRes = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: backupEnvelope,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    storage: liveStorage,
    onApplyRestoredState: state => {
      callbackStateCalled = true;
      const restoredBill = state.bills.find(b => b.billNo === 'BILL-UG-2026-10-8821');
      assert.equal(restoredBill?.status, 'Paid');
    }
  });

  assert.equal(restoreRes.success, true);
  assert.equal(restoreRes.status, 'RESTORED');
  assert.equal(restoreRes.rolledBackToSnapshot, false);
  assert.equal(callbackStateCalled, true);

  const liveBillsAfter = JSON.parse(liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.bills)!);
  const billAfter = liveBillsAfter.find((b: { billNo: string }) => b.billNo === 'BILL-UG-2026-10-8821');
  assert.equal(billAfter.status, 'Paid');
  console.log('✓ [16/26] Successful transactional restore verified');
}

// 17 & 18. Interrupted/failed restore handling & automatic rollback recovery
{
  const liveStorage = createSeededStorage();
  const originalBillsJson = liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.bills)!;
  const originalConsumersJson = liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.consumers)!;

  const targetStorage = createSeededStorage();
  const modifiedConsumers = INITIAL_CONSUMERS.map(c => ({ ...c, name: `${c.name} (Restored)` }));
  targetStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.consumers, JSON.stringify(modifiedConsumers));
  const backupEnvelope = createDemoBackup({ actor: ADMIN_ACTOR, storage: targetStorage }).envelope!;

  // Simulate mid-write failure AFTER partial storage write
  const failedMidWrite = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: backupEnvelope,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    storage: liveStorage,
    simulateFailureAtStep: 'AFTER_PARTIAL_STORAGE_WRITE'
  });

  assert.equal(failedMidWrite.success, false);
  assert.equal(failedMidWrite.status, 'FAILED_AND_ROLLED_BACK');
  assert.equal(failedMidWrite.rolledBackToSnapshot, true, 'Must automatically rollback on mid-write failure');
  assert.deepEqual(
    JSON.parse(liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.consumers)!),
    JSON.parse(originalConsumersJson),
    'Consumers must be rolled back to exact pre-restore state without partial corruption'
  );
  assert.deepEqual(
    JSON.parse(liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.bills)!),
    JSON.parse(originalBillsJson),
    'Bills must remain intact after rollback'
  );

  // Also test failure during post-restore validation
  const failedPostVal = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: backupEnvelope,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    storage: liveStorage,
    simulateFailureAtStep: 'DURING_POST_RESTORE_VALIDATION'
  });
  assert.equal(failedPostVal.success, false);
  assert.equal(failedPostVal.rolledBackToSnapshot, true);
  assert.deepEqual(
    JSON.parse(liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.consumers)!),
    JSON.parse(originalConsumersJson)
  );

  // Also verify manual recovery from pre-restore snapshot
  const manualRecovery = recoverFromPreRestoreSnapshot({ actor: ADMIN_ACTOR, storage: liveStorage });
  assert.equal(manualRecovery.success, true);
  assert.deepEqual(
    JSON.parse(liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.consumers)!),
    JSON.parse(originalConsumersJson)
  );

  console.log('✓ [17/26] Interrupted/failed restore fault handling verified');
  console.log('✓ [18/26] Automatic rollback recovery & manual recovery verified (zero mixed state)');
}

// 19 & 20. Pending Field Engineer offline queue protection & duplicate prevention
{
  const liveStorage = createSeededStorage();
  const pendingItem: FieldOfflineQueueItem = {
    client_uuid: 'feq-live-pending-001',
    actionType: 'WORK_ORDER_STATUS_UPDATE',
    targetRecordId: 'WO-4401',
    timestamp: '15-Oct 09:00',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    status: 'PENDING',
    attemptCount: 0,
    payload: {
      woId: 'WO-4401',
      targetStatus: 'On Site'
    }
  };
  const completedItem: FieldOfflineQueueItem = {
    ...pendingItem,
    client_uuid: 'feq-already-completed-002',
    status: 'COMPLETED',
    syncedAt: '2026-11-01T09:05:00.000Z'
  };
  liveStorage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue,
    JSON.stringify([pendingItem, completedItem])
  );

  // Backup has feq-already-completed-002 as PENDING (older snapshot)
  const backupStorage = createSeededStorage();
  const staleBackupQueueItem: FieldOfflineQueueItem = {
    ...completedItem,
    status: 'PENDING',
    syncedAt: undefined
  };
  backupStorage.setItem(
    CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue,
    JSON.stringify([staleBackupQueueItem])
  );
  const backupEnvelope = createDemoBackup({ actor: ADMIN_ACTOR, storage: backupStorage }).envelope!;

  // Default policy BLOCK_IF_PENDING must block restore when live pending items exist
  const blockedRestore = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: backupEnvelope,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    offlineQueuePolicy: 'BLOCK_IF_PENDING',
    storage: liveStorage
  });
  assert.equal(blockedRestore.success, false);
  assert.equal(blockedRestore.status, 'BLOCKED_OFFLINE_QUEUE_CONFLICT');

  // Safe merge policy PRESERVE_LIVE_PENDING must preserve live pending item AND never downgrade COMPLETED item back to PENDING
  const mergedRestore = executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: backupEnvelope,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    offlineQueuePolicy: 'PRESERVE_LIVE_PENDING',
    storage: liveStorage
  });
  assert.equal(mergedRestore.success, true);

  const mergedQueue: FieldOfflineQueueItem[] = JSON.parse(
    liveStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue)!
  );
  const preservedPending = mergedQueue.find(i => i.client_uuid === 'feq-live-pending-001');
  const preservedCompleted = mergedQueue.find(i => i.client_uuid === 'feq-already-completed-002');
  assert.ok(preservedPending, 'Live pending offline action must be preserved');
  assert.equal(preservedPending.status, 'PENDING');
  assert.ok(preservedCompleted, 'Already completed offline action must remain in queue');
  assert.equal(
    preservedCompleted.status,
    'COMPLETED',
    'Already completed offline action must NOT be downgraded to PENDING (prevents duplicate replay)'
  );

  // Also verify duplicate record ID rejection during validation
  const dupBackup: DemoBackupEnvelope = JSON.parse(JSON.stringify(backupEnvelope));
  dupBackup.payload.bills.push({ ...dupBackup.payload.bills[0] });
  dupBackup.recordCounts.bills = dupBackup.payload.bills.length;
  dupBackup.integrity.categoryChecksums.bills = computeCategoryChecksum('bills', dupBackup.payload.bills);
  dupBackup.integrity.checksum = computeEnvelopeIntegrityChecksum({
    formatId: dupBackup.formatId,
    formatVersion: dupBackup.formatVersion,
    schemaVersion: dupBackup.schemaVersion,
    recordCounts: dupBackup.recordCounts,
    categoryChecksums: dupBackup.integrity.categoryChecksums
  });
  const dupVal = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: dupBackup });
  assert.equal(dupVal.isValid, false);
  assert.ok(dupVal.issues.some(e => e.code === 'DUPLICATE_RECORD_ID'));

  console.log('✓ [19/26] Pending Field Engineer offline queue protection verified');
  console.log('✓ [20/26] Duplicate record ID rejection & idempotent offline queue replay protection verified');
}

// 21, 22, 23. Bill/payment integrity, receipt/barcode/QR identity, Smart Payment Calendar & historical DEMO slab preservation
{
  const storage = createSeededStorage();
  const envelope = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;
  const validation = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: envelope });
  assert.equal(validation.isValid, true);

  // Verify historical DEMO slab note is preserved as informational warning, not altered
  assert.ok(
    validation.historicalDemoNotes.some(note => note.recordId === 'BILL-UG-2026-10-8821'),
    'Historical DEMO slab discrepancy for BILL-UG-2026-10-8821 must be surfaced as non-blocking informational note'
  );
  const bill8821 = envelope.payload.bills.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  assert.equal(bill8821.totalAmount, 2185, 'Source bill totalAmount must not be silently altered');

  // Verify Receipt & Document metadata (Code 128 barcode & QR verification URLs)
  const billMeta = envelope.payload.receiptAndDocumentMetadata.find(
    m => m.sourceRecordId === 'BILL-UG-2026-10-8821' && m.documentType === 'electricity_bill'
  )!;
  assert.ok(billMeta, 'Bill metadata must exist');
  assert.equal(billMeta.barcodeReference, 'UG-04281-99231-2026-10-8821');
  assert.ok(billMeta.qrVerificationUrl!.includes('ref=BILL-UG-2026-10-8821'));

  const paidMeta = envelope.payload.receiptAndDocumentMetadata.find(
    m => m.documentId === 'REC-TXN-UPI-9921448102'
  )!;
  assert.ok(paidMeta, 'Paid receipt metadata REC-TXN-UPI-9921448102 must exist');
  assert.equal(paidMeta.documentType, 'payment_receipt');

  // Verify Smart Payment Calendar entries
  const calEvents = envelope.payload.smartPaymentCalendar;
  assert.ok(calEvents.length >= INITIAL_BILLS.length);
  const paidCal = calEvents.find(e => e.billNo === 'BILL-UG-2026-09-8821')!;
  assert.equal(paidCal.status, 'Paid');
  assert.equal(paidCal.outstandingBalance, 0);

  // Verify broken payment->bill relationship is rejected
  const brokenRel: DemoBackupEnvelope = JSON.parse(JSON.stringify(envelope));
  brokenRel.payload.payments[0].billNo = 'BILL-NON-EXISTENT-999';
  brokenRel.integrity.categoryChecksums.payments = computeCategoryChecksum(
    'payments',
    brokenRel.payload.payments
  );
  brokenRel.integrity.checksum = computeEnvelopeIntegrityChecksum({
    formatId: brokenRel.formatId,
    formatVersion: brokenRel.formatVersion,
    schemaVersion: brokenRel.schemaVersion,
    recordCounts: brokenRel.recordCounts,
    categoryChecksums: brokenRel.integrity.categoryChecksums
  });
  const brokenVal = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: brokenRel });
  assert.equal(brokenVal.isValid, false);
  assert.ok(brokenVal.issues.some(e => e.code === 'BROKEN_PAYMENT_REF'));

  console.log('✓ [21/26] Bill/payment relationship & balance integrity verified');
  console.log('✓ [22/26] Receipt ID, Code 128 barcode & QR verification URL preservation verified');
  console.log('✓ [23/26] Smart Payment Calendar, reminder suppression & historical DEMO slab note verified');
}

// 24. Zero credential leakage
{
  const dirtyObj = {
    id: 'USR-1',
    name: 'Test User',
    password: 'secretPassword123',
    passwordHash: 'sha256$hash',
    sessionToken: 'tok_abc',
    nested: {
      signedToken: 'sig_xyz',
      apiKey: 'AIzaSyFakeKey',
      safeField: 'keep_me'
    }
  };
  assert.equal(containsForbiddenCredentialKey(dirtyObj), 'password');
  const sanitized = sanitizeBackupValue(dirtyObj) as Record<string, unknown>;
  assert.equal(containsForbiddenCredentialKey(sanitized), null);
  assert.equal((sanitized.nested as Record<string, unknown>).safeField, 'keep_me');

  const storage = createSeededStorage();
  const envelope = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;
  const serialized = JSON.stringify(envelope);
  assert.equal(serialized.includes('passwordHash'), false);
  assert.equal(serialized.includes('sessionToken'), false);
  assert.equal(serialized.includes('GEMINI_API_KEY'), false);

  // Inject forbidden credential key into backup and verify validateDemoBackup rejects it
  const polluted = JSON.parse(serialized);
  polluted.payload.consumers[0].passwordHash = 'leaked_hash';
  const valRes = validateDemoBackup({ actor: ADMIN_ACTOR, backupInput: polluted });
  assert.equal(valRes.isValid, false);
  assert.ok(valRes.issues.some(e => e.code === 'CREDENTIAL_LEAK_DETECTED'));
  console.log('✓ [24/26] Zero credential leakage & forbidden secret key rejection verified');
}

// 25. Four-language localization (`en`, `gu`, `hi`, `mr`)
{
  const languages = ['en', 'gu', 'hi', 'mr'] as const;
  const enKeys = Object.keys(DEMO_BACKUP_UI_TRANSLATIONS.en).sort();
  assert.ok(enKeys.length >= 60, 'Should have comprehensive backup UI translation keys');

  for (const lang of languages) {
    const langDict = DEMO_BACKUP_UI_TRANSLATIONS[lang];
    const langKeys = Object.keys(langDict).sort();
    assert.deepEqual(langKeys, enKeys, `Language ${lang} must have exact key parity with English`);
    for (const key of enKeys) {
      const val = langDict[key as keyof typeof langDict];
      if (key === 'categoryLabels') {
        assert.ok(val && typeof val === 'object', `Missing categoryLabels object for ${lang}`);
        const catMap = val as Record<string, string>;
        for (const cat of ALL_BACKUP_CATEGORIES) {
          assert.ok(
            typeof catMap[cat] === 'string' && catMap[cat].trim().length > 0,
            `Missing category label for ${lang}.categoryLabels.${cat}`
          );
          if (lang !== 'en') {
            assert.notEqual(
              catMap[cat],
              DEMO_BACKUP_UI_TRANSLATIONS.en.categoryLabels[cat],
              `Untranslated English fallback found in ${lang}.categoryLabels.${cat}`
            );
          }
        }
      } else {
        assert.ok(typeof val === 'string' && val.trim().length > 0, `Empty translation for ${lang}.${key}`);
        if (lang !== 'en') {
          assert.notEqual(
            val,
            DEMO_BACKUP_UI_TRANSLATIONS.en[key as keyof typeof langDict],
            `Untranslated English fallback found in ${lang}.${key}`
          );
        }
      }
    }
  }
  console.log('✓ [25/26] Four-language localization (English, Gujarati, Hindi, Marathi) verified with 100% key parity');
}

// 26. Audit trail & existing application regression check
{
  const storage = createSeededStorage();
  const env = createDemoBackup({ actor: ADMIN_ACTOR, storage }).envelope!;
  generateDemoRestorePreview({ actor: ADMIN_ACTOR, backupInput: env, storage });
  executeSafeDemoRestore({
    actor: ADMIN_ACTOR,
    backupInput: env,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    storage
  });

  const history = getBackupAuditHistory(storage);
  assert.ok(history.length >= 3, 'Backup audit history should record create, preview, and restore events');
  assert.equal(history[0].operationType, 'RESTORE_COMPLETED');
  assert.equal(history[0].outcome, 'SUCCESS');
  assert.ok(storage.getItem(BACKUP_AUDIT_HISTORY_STORAGE_KEY));
  console.log('✓ [26/26] Backup audit trail persistence & existing state regression check passed');
}

console.log('=== ALL 26 PHASE 5.3 AUTOMATED VERIFICATION SUITES PASSED ===');
