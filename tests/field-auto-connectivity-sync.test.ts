import assert from 'node:assert/strict';
import {
  FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  FieldOfflineQueueItem,
  StorageLike,
  generateClientUuid,
  loadFieldOfflineQueue,
  saveFieldOfflineQueue,
  enqueueFieldInspectionAction,
  enqueueFieldWorkOrderStatusAction,
  replayFieldOfflineQueue,
  resolveFieldConnectivityStatus,
  FieldConnectivityStatus,
} from '../src/utils/fieldOfflineQueue';
import {
  INITIAL_WORK_ORDERS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
} from '../src/data/mockData';
import {
  FIELD_UI_TRANSLATIONS,
  FieldUiDictionary,
} from '../src/i18n/fieldContentTranslations';
import { Language } from '../src/i18n/types';
import { WorkOrder, NewConnectionApplication, ComplaintRecord } from '../src/types';

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

console.log('Running VidyutFlow Field Auto-Connectivity & Safe Sync Test Suite...');

// ============================================================================
// 1. Initial State: Normal Online with Clean Queue
// ============================================================================
console.log('1. Testing initial state (online, no pending actions)...');
{
  const status = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSyncing: false,
    queue: [],
    recentlySynced: false,
  });
  assert.equal(status, 'ONLINE', 'Initial state without pending items should resolve to ONLINE');
}

// ============================================================================
// 2. Real Physical Network Offline Detection
// ============================================================================
console.log('2. Testing real physical network offline detection...');
{
  // When browser is offline, status must be OFFLINE regardless of simulation state
  const status1 = resolveFieldConnectivityStatus({
    isBrowserOffline: true,
    isOfflineSimulated: false,
    isSyncing: false,
    queue: [],
    recentlySynced: false,
  });
  assert.equal(status1, 'OFFLINE', 'When browser is offline, status should resolve to OFFLINE');

  const status2 = resolveFieldConnectivityStatus({
    isBrowserOffline: true,
    isOfflineSimulated: true, // both real offline and simulated offline
    isSyncing: false,
    queue: [],
    recentlySynced: false,
  });
  assert.equal(status2, 'OFFLINE', 'Physical offline takes precedence over simulated offline');
}

// ============================================================================
// 3. Simulated Offline Mode (DEMO Tool)
// ============================================================================
console.log('3. Testing simulated offline mode for field presentations...');
{
  const status = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: true,
    isSyncing: false,
    queue: [],
    recentlySynced: false,
  });
  assert.equal(status, 'SIMULATED_OFFLINE', 'Browser online with simulation toggle active must resolve to SIMULATED_OFFLINE');
}

// ============================================================================
// 4. Offline Actions Queuing (Inspections and Work Order Status Transitions)
// ============================================================================
console.log('4. Testing offline action capture for inspections and status updates...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);

  // Enqueue site inspection
  const inspectionPayload = {
    meterSerialScanned: 'UGVCL-SM-2026-99412',
    readingKwh: 14820,
    sealIntact: true,
    terminalCondition: 'Normal' as const,
    tamperDetected: false,
    testedPhaseVoltage: { r: 234, y: 232, b: 235 },
    technicianRemarks: 'Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.',
    photoUploaded: true,
  };

  const { item: inspItem, queue: queue1 } = enqueueFieldInspectionAction(
    {
      woId: 'WO-4401',
      canonicalWorkOrders,
      inspectionReport: inspectionPayload,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
      nowIso: '2026-10-15T10:00:00.000Z',
    },
    storage
  );

  assert.equal(queue1.length, 1);
  assert.equal(inspItem.actionType, 'SITE_INSPECTION_SUBMIT');
  assert.equal(inspItem.status, 'PENDING');
  assert.ok(inspItem.client_uuid && inspItem.client_uuid.length >= 32);

  // Enqueue status transition (En Route -> On Site) for WO-4402
  const { item: statusItem, queue: queue2 } = enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4402',
      targetStatus: 'On Site',
      canonicalWorkOrders,
      nowIso: '2026-10-15T10:05:00.000Z',
    },
    storage
  );

  assert.equal(queue2.length, 2);
  assert.equal(statusItem.actionType, 'WORK_ORDER_STATUS_UPDATE');
  assert.equal(statusItem.payload.targetStatus, 'On Site');
  assert.equal(statusItem.status, 'PENDING');
  assert.notEqual(inspItem.client_uuid, statusItem.client_uuid, 'Client UUIDs must be distinct');
}

// ============================================================================
// 5. LocalStorage Persistence Under vidyutflow_field_offline_queue
// ============================================================================
console.log('5. Testing persistent localStorage serialization...');
{
  const storage = new MemoryStorage();
  const sampleItem: FieldOfflineQueueItem = {
    client_uuid: generateClientUuid(),
    actionType: 'WORK_ORDER_STATUS_UPDATE',
    targetRecordId: 'WO-4401',
    timestamp: '2026-10-15T10:10:00.000Z',
    payload: {
      woId: 'WO-4401',
      targetStatus: 'Completed',
      expectedPreviousStatus: 'On Site',
    },
    status: 'PENDING',
    attemptCount: 0,
    createdAt: '2026-10-15T10:10:00.000Z',
    updatedAt: '2026-10-15T10:10:00.000Z',
  };

  saveFieldOfflineQueue([sampleItem], storage);

  const raw = storage.getItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY);
  assert.ok(raw, 'Data must be saved in storage under vidyutflow_field_offline_queue');

  const reloaded = loadFieldOfflineQueue(storage);
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].client_uuid, sampleItem.client_uuid);
  assert.equal(reloaded[0].targetRecordId, 'WO-4401');
  assert.equal(reloaded[0].status, 'PENDING');
}

// ============================================================================
// 6. Online Detection with Pending Items Resolves to PENDING_SYNC
// ============================================================================
console.log('6. Testing status resolution when online with pending actions (PENDING_SYNC)...');
{
  const pendingQueue: FieldOfflineQueueItem[] = [
    {
      client_uuid: 'uuid-1',
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4401',
      timestamp: '2026-10-15T10:00:00.000Z',
      payload: { woId: 'WO-4401', targetStatus: 'Completed', expectedPreviousStatus: 'On Site' },
      status: 'PENDING',
      attemptCount: 0,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    },
  ];

  const status = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSyncing: false,
    queue: pendingQueue,
    recentlySynced: false,
  });

  assert.equal(status, 'PENDING_SYNC', 'Should resolve to PENDING_SYNC when online with pending queue items');
}

// ============================================================================
// 7. Reconnection Triggers FIFO Auto-Sync Replay
// ============================================================================
console.log('7. Testing FIFO queue replay upon reconnection...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  const processedUuids = new Set<string>();

  // Find WO-4401 (On Site)
  const wo4401 = canonicalWorkOrders.find((w) => w.id === 'WO-4401')!;
  assert.equal(wo4401.status, 'On Site');

  // Enqueue site inspection
  const { queue } = enqueueFieldInspectionAction(
    {
      woId: 'WO-4401',
      canonicalWorkOrders,
      inspectionReport: {
        meterSerialScanned: 'UGVCL-SM-2026-99412',
        readingKwh: 14850,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 235, y: 232, b: 234 },
        technicianRemarks: 'Replaced neutral lug and verified voltage balance.',
        photoUploaded: true,
      },
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
      nowIso: '2026-10-15T10:30:00.000Z',
    },
    storage
  );

  // Replay with online: true in DEMO mode
  const replayResult = replayFieldOfflineQueue({
    queue,
    isOnline: true,
    dataMode: 'DEMO',
    processedUuids,
    getWorkOrder: (id) => canonicalWorkOrders.find((w) => w.id === id),
    executeWorkflowUpdate: (item) => {
      const idx = canonicalWorkOrders.findIndex((w) => w.id === item.payload.woId);
      if (idx !== -1) {
        canonicalWorkOrders[idx] = {
          ...canonicalWorkOrders[idx],
          status: item.payload.targetStatus,
          inspectionReport: item.payload.inspectionReport,
        };
      }
      return { success: true };
    },
    storage,
    nowIso: '2026-10-15T10:35:00.000Z',
  });

  assert.equal(replayResult.syncedCount, 1);
  assert.equal(replayResult.failedCount, 0);

  // Verify WO-4401 status updated to Completed in canonical state
  const updatedWO = canonicalWorkOrders.find((w) => w.id === 'WO-4401')!;
  assert.equal(updatedWO.status, 'Completed');
  assert.ok(updatedWO.inspectionReport);
  assert.equal(updatedWO.inspectionReport?.readingKwh, 14850);
}

// ============================================================================
// 8. In-Flight Synchronization Status (SYNCING)
// ============================================================================
console.log('8. Testing in-flight synchronization status resolution...');
{
  const status = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSyncing: true, // Sync in progress
    queue: [],
    recentlySynced: false,
  });

  assert.equal(status, 'SYNCING', 'isSyncing: true must resolve to SYNCING');
}

// ============================================================================
// 9. Successful Sync Completion Resolves to SYNCHRONIZED_DEMO
// ============================================================================
console.log('9. Testing post-sync success state (SYNCHRONIZED_DEMO)...');
{
  const completedQueue: FieldOfflineQueueItem[] = [
    {
      client_uuid: 'uuid-1',
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4401',
      timestamp: '2026-10-15T10:00:00.000Z',
      payload: { woId: 'WO-4401', targetStatus: 'Completed', expectedPreviousStatus: 'On Site' },
      status: 'COMPLETED',
      attemptCount: 1,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:01:00.000Z',
      syncedAt: '2026-10-15T10:01:00.000Z',
    },
  ];

  const status = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSyncing: false,
    queue: completedQueue,
    recentlySynced: true, // Recently finished sync
  });

  assert.equal(status, 'SYNCHRONIZED_DEMO', 'Recently finished sync with no pending items must resolve to SYNCHRONIZED_DEMO');
}

// ============================================================================
// 10. Error / Conflict Detection (SYNC_FAILED and CONFLICT_DETECTED)
// ============================================================================
console.log('10. Testing error & conflict handling when record states mismatch...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  const processedUuids = new Set<string>();

  // Suppose WO-4401 was already Completed by someone else in the office ERP
  const wo4401 = canonicalWorkOrders.find((w) => w.id === 'WO-4401')!;
  wo4401.status = 'Completed';

  // An offline action arrives expecting WO-4401 to be 'On Site' and transitions to 'Completed'
  const conflictingQueue: FieldOfflineQueueItem[] = [
    {
      client_uuid: 'uuid-conflict',
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4401',
      timestamp: '2026-10-15T10:00:00.000Z',
      payload: {
        woId: 'WO-4401',
        targetStatus: 'Completed',
        expectedPreviousStatus: 'On Site',
      },
      status: 'PENDING',
      attemptCount: 0,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    },
  ];

  const replayResult = replayFieldOfflineQueue({
    queue: conflictingQueue,
    isOnline: true,
    dataMode: 'DEMO',
    processedUuids,
    getWorkOrder: (id) => canonicalWorkOrders.find((w) => w.id === id),
    executeWorkflowUpdate: () => ({ success: true }),
    storage,
    nowIso: '2026-10-15T10:10:00.000Z',
  });

  assert.equal(replayResult.syncedCount, 0);
  assert.equal(replayResult.failedCount, 1);
  assert.equal(replayResult.queue[0].status, 'FAILED');
  assert.ok(replayResult.queue[0].failureReason);

  // Status resolution with failed items
  const statusFailed = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSyncing: false,
    queue: replayResult.queue,
    recentlySynced: false,
  });

  assert.ok(
    statusFailed === 'SYNC_FAILED' || statusFailed === 'CONFLICT_DETECTED',
    `Should identify failure or conflict. Got: ${statusFailed}`
  );

  const statusPrioritized = resolveFieldConnectivityStatus({
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSyncing: false,
    queue: replayResult.queue,
    recentlySynced: false,
    prioritizeNetworkHealth: true,
  });
  assert.equal(
    statusPrioritized,
    'ONLINE',
    'With prioritizeNetworkHealth: true, network status should remain ONLINE so conflicts are rendered separately'
  );
}

// ============================================================================
// 11. Accurate Typography & Disclaimer Validation
// ============================================================================
console.log('11. Verifying typography: no claims of volatile state or AMR telemetry...');
{
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];

  for (const lang of languages) {
    const dict = FIELD_UI_TRANSLATIONS[lang];
    assert.ok(dict, `Dictionary for ${lang} must exist`);

    // Verify accurate disclaimer
    assert.ok(dict.offlineDemoDisclaimer.length > 10);
    // English specifically must not claim volatile client state or AMR hardware
    if (lang === 'en') {
      assert.ok(
        !dict.offlineDemoDisclaimer.includes('volatile client state'),
        'Must not state volatile client state when localStorage is used'
      );
      assert.ok(
        !dict.offlineDemoDisclaimer.includes('4G AMR telemetry'),
        'Must not claim real 4G AMR telemetry in DEMO mode'
      );
      assert.ok(
        dict.offlineDemoDisclaimer.includes('DEMO Mode') || dict.offlineDemoDisclaimer.includes('localStorage'),
        'Should clearly mention DEMO Mode and localStorage persistence'
      );
    }
  }
}

// ============================================================================
// 12. Full Multilingual Coverage for All 8 Connectivity States & Banners
// ============================================================================
console.log('12. Testing multilingual coverage across en, gu, hi, mr for all 8 states...');
{
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];

  const requiredKeys: (keyof FieldUiDictionary)[] = [
    'statusOnlineLabel',
    'statusOnlineDesc',
    'statusRealOfflineLabel',
    'statusRealOfflineDesc',
    'statusSimOfflineLabel',
    'statusSimOfflineDesc',
    'statusPendingSyncLabel',
    'statusPendingSyncDesc',
    'statusSyncingLabel',
    'statusSyncingDesc',
    'statusSyncedDemoLabel',
    'statusSyncedDemoDesc',
    'statusSyncFailedLabel',
    'statusSyncFailedDesc',
    'statusConflictDetectedLabel',
    'statusConflictDetectedDesc',
    'btnToggleSimOfflineEnable',
    'btnToggleSimOfflineDisable',
    'btnManualSyncNow',
    'badgeAutoSyncActive',
    'badgeAutoSyncReady',
    'ariaConnectivityStatusPrefix',
    'bannerRealOfflineTitle',
    'bannerRealOfflineDesc',
    'bannerSimOfflineTitle',
    'bannerSimOfflineDesc',
    'bannerPendingSyncTitle',
    'bannerPendingSyncDesc',
    'bannerSyncingTitle',
    'bannerSyncingDesc',
    'bannerSyncSuccessTitle',
    'bannerSyncSuccessDesc',
    'btnReviewConflict',
    'labelSafeActionPrefix',
    'badgeDemoIndicator',
    'labelCanonicalStatePrefix',
    'noticeActionAlreadyApplied',
    'btnViewRecordInDrawer',
  ];

  for (const lang of languages) {
    const dict = FIELD_UI_TRANSLATIONS[lang];
    for (const key of requiredKeys) {
      const val = dict[key];
      assert.ok(
        typeof val === 'string' && val.trim().length > 0,
        `Language "${lang}" must have a non-empty translation for key "${key}"`
      );
    }
  }
}

// ============================================================================
// 13. Safe Action Guidance for Conflicting or Failed Actions
// ============================================================================
console.log('13. Testing safe action guidance generation for conflict resolution...');
{
  const { resolveOfflineQueueSafeAction } = await import('../src/i18n/fieldContentTranslations');
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];

  const conflictItem: FieldOfflineQueueItem = {
    client_uuid: 'uuid-safe-action-1',
    actionType: 'WORK_ORDER_STATUS_UPDATE',
    targetRecordId: 'WO-4401',
    timestamp: '2026-10-15T10:00:00.000Z',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    attemptCount: 1,
    status: 'FAILED',
    conflictDetected: true,
    failureReason: 'Conflict: Work Order WO-4401 is already "Completed" in canonical ERP state.',
    payload: {
      woId: 'WO-4401',
      targetStatus: 'Completed',
      expectedPreviousStatus: 'Pending',
    },
  };

  for (const lang of languages) {
    const advice = resolveOfflineQueueSafeAction(conflictItem, lang);
    assert.ok(
      typeof advice === 'string' && advice.length > 10,
      `Safe action advice for ${lang} must be descriptive and non-empty`
    );
  }

  // Also test invalid progression failure advice
  const invalidProgressionItem: FieldOfflineQueueItem = {
    ...conflictItem,
    failureReason: 'Invalid progression from "Pending" to "Completed".',
  };

  for (const lang of languages) {
    const advice = resolveOfflineQueueSafeAction(invalidProgressionItem, lang);
    assert.ok(
      typeof advice === 'string' && advice.length > 10,
      `Safe action advice for invalid progression in ${lang} must be non-empty`
    );
  }
}

// ============================================================================
// 14. Verification of Redundant Banners Removal
// ============================================================================
console.log('14. Verifying removal of redundant purple and yellow simulation banners...');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fieldPortalPath = path.resolve('src/components/field/FieldPortal.tsx');
  const fieldPortalCode = fs.readFileSync(fieldPortalPath, 'utf8');

  // Must not render the oversized purple banner
  assert.ok(
    !fieldPortalCode.includes('data-testid="simulated-offline-banner"'),
    'FieldPortal must no longer render the large purple simulated-offline-banner'
  );

  // Must not render the oversized yellow simulation banner
  assert.ok(
    !fieldPortalCode.includes('offlineSimNoticePrefix'),
    'FieldPortal must no longer render the large yellow offlineSimNotice banner'
  );
}

// ============================================================================
// 15. Review Conflict Action Button Availability
// ============================================================================
console.log('15. Verifying review conflict action and compact indicator...');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fieldPortalPath = path.resolve('src/components/field/FieldPortal.tsx');
  const fieldPortalCode = fs.readFileSync(fieldPortalPath, 'utf8');

  assert.ok(
    fieldPortalCode.includes('data-testid="review-conflict-btn"'),
    'FieldPortal must provide a review-conflict-btn near the indicator when conflicts occur'
  );
  assert.ok(
    fieldPortalCode.includes('badgeDemoIndicator'),
    'FieldPortal must render badgeDemoIndicator for simulated offline mode'
  );
}

console.log('All 15 VidyutFlow Field Auto-Connectivity & Refined Sync tests passed successfully!');
