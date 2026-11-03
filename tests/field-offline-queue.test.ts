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
  validateOfflineQueueItemAgainstRecord,
  replayFieldOfflineQueue,
} from '../src/utils/fieldOfflineQueue';
import {
  INITIAL_CONNECTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_BILLS,
} from '../src/data/mockData';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { isValidWorkOrderTransition } from '../src/services/erpAdapter';
import {
  FIELD_UI_TRANSLATIONS,
  localizeOfflineQueueFailureReason,
} from '../src/i18n/fieldContentTranslations';
import { localizeToastMessage } from '../src/i18n/employeeContentTranslations';
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

console.log('Running Field Engineer Functional Offline Queue Test Suite...');

// ============================================================================
// 1. Offline Inspection Submission Creates a Pending Queue Entry
// ============================================================================
console.log('1. Testing offline inspection submission capture & client_uuid generation...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);

  const uuid1 = generateClientUuid();
  const uuid2 = generateClientUuid();
  assert.ok(uuid1.length >= 32, 'client_uuid should be a valid non-empty UUID string');
  assert.notEqual(uuid1, uuid2, 'Each generated client_uuid must be unique');

  const inspectionReport: NonNullable<WorkOrder['inspectionReport']> = {
    meterSerialScanned: 'UGVCL-SM-2026-99412',
    readingKwh: 14820,
    sealIntact: true,
    terminalCondition: 'Normal',
    tamperDetected: false,
    testedPhaseVoltage: { r: 234, y: 232, b: 235 },
    technicianRemarks: 'Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.',
    photoUploaded: true,
  };

  const { item, queue } = enqueueFieldInspectionAction(
    {
      woId: 'WO-4401',
      canonicalWorkOrders,
      inspectionReport,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
      nowIso: '2026-10-15T10:15:00.000Z',
    },
    storage
  );

  assert.equal(queue.length, 1, 'Queue should contain 1 item after offline inspection submission');
  assert.equal(item.actionType, 'SITE_INSPECTION_SUBMIT');
  assert.equal(item.targetRecordId, 'WO-4401');
  assert.equal(item.relatedRefId, 'CMP-8821');
  assert.equal(item.status, 'PENDING');
  assert.equal(item.timestamp, '2026-10-15T10:15:00.000Z');
  assert.equal(item.payload.woId, 'WO-4401');
  assert.equal(item.payload.targetStatus, 'Completed');
  assert.equal(item.payload.expectedPreviousStatus, 'On Site');
  assert.equal(item.payload.inspectionReport?.meterSerialScanned, 'UGVCL-SM-2026-99412');
  assert.equal(item.payload.inspectionReport?.readingKwh, 14820);

  const rawStored = storage.getItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY);
  assert.ok(rawStored, 'Queue must be persisted under vidyutflow_field_offline_queue');
  const parsed = JSON.parse(rawStored!);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].client_uuid, item.client_uuid);
}

// ============================================================================
// 2. Offline Work-Order Status Update Creates a Pending Queue Entry
// ============================================================================
console.log('2. Testing offline work-order status update capture...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);

  const { item: step1, queue: q1 } = enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4402',
      targetStatus: 'En Route',
      canonicalWorkOrders,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  assert.equal(q1.length, 1);
  assert.equal(step1.actionType, 'WORK_ORDER_STATUS_UPDATE');
  assert.equal(step1.targetRecordId, 'WO-4402');
  assert.equal(step1.relatedRefId, 'APP-2026-0842');
  assert.equal(step1.status, 'PENDING');
  assert.equal(step1.payload.expectedPreviousStatus, 'Pending');
  assert.equal(step1.payload.targetStatus, 'En Route');

  // Sequential offline update on same WO tracks effective offline status ('En Route' -> 'On Site')
  const { item: step2, queue: q2 } = enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4402',
      targetStatus: 'On Site',
      canonicalWorkOrders,
      existingQueue: q1,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  assert.equal(q2.length, 2);
  assert.equal(step2.payload.expectedPreviousStatus, 'En Route');
  assert.equal(step2.payload.targetStatus, 'On Site');
}

// ============================================================================
// 3. Canonical ERP State Remains Unchanged While Action Is Pending
// ============================================================================
console.log('3. Testing canonical ERP state isolation while offline actions are pending...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  const canonicalApplications: NewConnectionApplication[] = structuredClone(INITIAL_APPLICATIONS);
  const canonicalComplaints: ComplaintRecord[] = structuredClone(INITIAL_COMPLAINTS);

  const woBefore = structuredClone(canonicalWorkOrders.find((w) => w.id === 'WO-4401')!);
  const cmpBefore = structuredClone(canonicalComplaints.find((c) => c.id === 'CMP-8821')!);
  const appBefore = structuredClone(canonicalApplications.find((a) => a.id === 'APP-2026-0842')!);

  enqueueFieldInspectionAction(
    {
      woId: 'WO-4401',
      canonicalWorkOrders,
      inspectionReport: {
        meterSerialScanned: 'UGVCL-SM-2026-99412',
        readingKwh: 14820,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 234, y: 232, b: 235 },
        technicianRemarks: 'Neutral crimped.',
        photoUploaded: true,
      },
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4402',
      targetStatus: 'En Route',
      canonicalWorkOrders,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  const woAfter = canonicalWorkOrders.find((w) => w.id === 'WO-4401')!;
  const cmpAfter = canonicalComplaints.find((c) => c.id === 'CMP-8821')!;
  const appAfter = canonicalApplications.find((a) => a.id === 'APP-2026-0842')!;

  assert.equal(woAfter.status, woBefore.status, 'Canonical WO-4401 must remain On Site while queued');
  assert.equal(woAfter.inspectionReport, undefined, 'Canonical WO-4401 must not have inspectionReport before replay');
  assert.equal(cmpAfter.status, cmpBefore.status, 'Canonical CMP-8821 must remain Dispatched while queued');
  assert.equal(appAfter.status, appBefore.status, 'Canonical APP-2026-0842 must remain Site Inspection while queued');
}

// ============================================================================
// 4. Persistence Across Reloads, Malformed Storage & Interrupted Replay Recovery
// ============================================================================
console.log('4. Testing persistence across reloads, malformed JSON handling & interrupted PROCESSING recovery...');
{
  const storage = new MemoryStorage();
  const canonicalWorkOrders: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);

  const { item } = enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4403',
      targetStatus: 'En Route',
      canonicalWorkOrders,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  // Simulate page reload / portal re-initialization by calling loadFieldOfflineQueue(storage)
  const reloadedQueue = loadFieldOfflineQueue(storage);
  assert.equal(reloadedQueue.length, 1);
  assert.equal(reloadedQueue[0].client_uuid, item.client_uuid);
  assert.equal(reloadedQueue[0].targetRecordId, 'WO-4403');
  assert.equal(reloadedQueue[0].status, 'PENDING');

  // Test interrupted replay recovery: if browser crashed while an item was 'PROCESSING',
  // loadFieldOfflineQueue must conservatively transition it to 'FAILED' with conflictDetected: true
  const interruptedItem: FieldOfflineQueueItem = {
    ...reloadedQueue[0],
    status: 'PROCESSING',
  };
  saveFieldOfflineQueue([interruptedItem], storage);

  const recoveredQueue = loadFieldOfflineQueue(storage);
  assert.equal(recoveredQueue.length, 1);
  assert.equal(recoveredQueue[0].status, 'FAILED', 'Interrupted PROCESSING item must recover to FAILED');
  assert.equal(recoveredQueue[0].conflictDetected, true);
  assert.ok(recoveredQueue[0].failureReason?.includes('interrupted by browser reload'));

  // Test malformed JSON in localStorage does not crash
  storage.setItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY, '{corrupted-json');
  const healedFromCorrupt = loadFieldOfflineQueue(storage);
  assert.deepEqual(healedFromCorrupt, []);

  // Test non-array JSON in localStorage does not crash
  storage.setItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
  const healedFromObject = loadFieldOfflineQueue(storage);
  assert.deepEqual(healedFromObject, []);

  // Test unavailable / throwing storage does not crash
  const throwingStorage: StorageLike = {
    getItem() {
      throw new Error('Storage disabled');
    },
    setItem() {
      throw new Error('Storage disabled');
    },
  };
  assert.deepEqual(loadFieldOfflineQueue(throwingStorage), []);
  assert.equal(saveFieldOfflineQueue([], throwingStorage), false);
}

// ============================================================================
// 5. Successful DEMO Replay Updates Work Order & Linked Records When Online Restored
// ============================================================================
console.log('5. Testing DEMO replay when online mode is restored...');
{
  const storage = new MemoryStorage();
  const workOrdersState: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  const applicationsState: NewConnectionApplication[] = structuredClone(INITIAL_APPLICATIONS);
  const complaintsState: ComplaintRecord[] = structuredClone(INITIAL_COMPLAINTS);
  const processedUuids = new Set<string>();

  // Queue inspection for WO-4401 (linked to CMP-8821) and inspection for WO-4402 (linked to APP-2026-0841)
  enqueueFieldInspectionAction(
    {
      woId: 'WO-4401',
      canonicalWorkOrders: workOrdersState,
      inspectionReport: {
        meterSerialScanned: 'UGVCL-SM-2026-99412',
        readingKwh: 14820,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 234, y: 232, b: 235 },
        technicianRemarks: 'Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.',
        photoUploaded: true,
      },
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  enqueueFieldInspectionAction(
    {
      woId: 'WO-4402',
      canonicalWorkOrders: workOrdersState,
      inspectionReport: {
        meterSerialScanned: 'UGVCL-SM-2026-99488',
        readingKwh: 0,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 233, y: 233, b: 234 },
        technicianRemarks: 'Feasibility verified.',
        photoUploaded: true,
      },
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  // Attempting replay while still offline must be blocked
  const blockedSummary = replayFieldOfflineQueue({
    isOnline: false,
    dataMode: 'DEMO',
    processedUuids,
    storage,
    getWorkOrder: (woId) => workOrdersState.find((w) => w.id === woId),
    executeWorkflowUpdate: () => ({ success: true }),
  });
  assert.equal(blockedSummary.blockedOffline, true);
  assert.equal(blockedSummary.syncedCount, 0);
  assert.equal(
    workOrdersState.find((w) => w.id === 'WO-4401')!.status,
    'On Site',
    'WO-4401 must not update when replay is attempted while offline'
  );

  // Attempting replay when online is restored in DEMO mode
  const onlineSummary = replayFieldOfflineQueue({
    isOnline: true,
    dataMode: 'DEMO',
    processedUuids,
    storage,
    getWorkOrder: (woId) => workOrdersState.find((w) => w.id === woId),
    executeWorkflowUpdate: (item) => {
      const idx = workOrdersState.findIndex((w) => w.id === item.payload.woId);
      if (idx === -1) return { success: false, error: 'Not found' };
      const targetWo = workOrdersState[idx];
      workOrdersState[idx] = {
        ...targetWo,
        status: item.payload.targetStatus,
        ...(item.payload.inspectionReport
          ? { inspectionReport: item.payload.inspectionReport }
          : {}),
        actionHistory: [
          ...(targetWo.actionHistory || []),
          {
            timestamp: new Date().toISOString(),
            stage: item.payload.targetStatus,
            actor: item.payload.submittedBy || 'Field Engineer',
            notes: item.payload.inspectionReport?.technicianRemarks || 'Replayed',
          },
        ],
      };

      if (item.payload.targetStatus === 'Completed') {
        const targetCmpId =
          targetWo.complaintId ||
          (item.payload.woId === 'WO-4401' ? 'CMP-8821' : undefined);
        if (targetCmpId) {
          const cIdx = complaintsState.findIndex((c) => c.id === targetCmpId);
          if (cIdx !== -1) {
            complaintsState[cIdx] = { ...complaintsState[cIdx], status: 'Resolved' };
          }
        }
        const targetAppId =
          targetWo.applicationId ||
          (item.payload.woId === 'WO-4402' ? 'APP-2026-0842' : undefined);
        if (targetAppId) {
          const aIdx = applicationsState.findIndex((a) => a.id === targetAppId);
          if (aIdx !== -1) {
            applicationsState[aIdx] = {
              ...applicationsState[aIdx],
              status: 'Sanction Approval',
              workflowStep: 4,
            };
          }
        }
      }
      return { success: true };
    },
  });

  assert.equal(onlineSummary.blockedOffline, false);
  assert.equal(onlineSummary.syncedCount, 2);
  assert.equal(onlineSummary.failedCount, 0);
  assert.ok(onlineSummary.queue.every((q) => q.status === 'COMPLETED'));

  // Verify canonical work orders and linked records updated after DEMO replay
  const updatedWo4401 = workOrdersState.find((w) => w.id === 'WO-4401')!;
  const updatedWo4402 = workOrdersState.find((w) => w.id === 'WO-4402')!;
  const updatedCmp8821 = complaintsState.find((c) => c.id === 'CMP-8821')!;
  const updatedApp0842 = applicationsState.find((a) => a.id === 'APP-2026-0842')!;

  assert.equal(updatedWo4401.status, 'Completed');
  assert.equal(updatedWo4401.inspectionReport?.meterSerialScanned, 'UGVCL-SM-2026-99412');
  assert.equal(updatedCmp8821.status, 'Resolved');
  assert.equal(updatedWo4402.status, 'Completed');
  assert.equal(updatedApp0842.status, 'Sanction Approval');
}

// ============================================================================
// 6. Repeated Sync Does Not Create Duplicate Updates (Idempotency per client_uuid)
// ============================================================================
console.log('6. Testing idempotency guard against repeated Sync clicks...');
{
  const storage = new MemoryStorage();
  const workOrdersState: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  const processedUuids = new Set<string>();
  let executionCallCount = 0;

  const { item } = enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4403',
      targetStatus: 'En Route',
      canonicalWorkOrders: workOrdersState,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  const runSync = () =>
    replayFieldOfflineQueue({
      isOnline: true,
      dataMode: 'DEMO',
      processedUuids,
      storage,
      getWorkOrder: (woId) => workOrdersState.find((w) => w.id === woId),
      executeWorkflowUpdate: (qItem) => {
        executionCallCount++;
        const idx = workOrdersState.findIndex((w) => w.id === qItem.payload.woId);
        workOrdersState[idx] = {
          ...workOrdersState[idx],
          status: qItem.payload.targetStatus,
        };
        return { success: true };
      },
    });

  const firstRun = runSync();
  assert.equal(firstRun.syncedCount, 1);
  assert.equal(executionCallCount, 1);

  // Second and third repeated Sync clicks
  const secondRun = runSync();
  const thirdRun = runSync();
  assert.equal(secondRun.syncedCount, 0);
  assert.equal(thirdRun.syncedCount, 0);
  assert.equal(executionCallCount, 1, 'Workflow update must execute at most once for the same client_uuid');

  // Even if storage still had status: 'PENDING' with the same client_uuid in processedUuids
  saveFieldOfflineQueue([{ ...item, status: 'PENDING' }], storage);
  const duplicateUuidRun = runSync();
  assert.equal(duplicateUuidRun.syncedCount, 0);
  assert.equal(duplicateUuidRun.skippedCount, 1);
  assert.equal(executionCallCount, 1, 'processedUuids set must block duplicate client_uuid execution');
}

// ============================================================================
// 7. Failed or Conflicting Actions Remain Visible Without Overwriting Newer State
// ============================================================================
console.log('7. Testing conflict detection and failed item visibility...');
{
  const storage = new MemoryStorage();
  const workOrdersState: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
  const processedUuids = new Set<string>();

  // Field Engineer queues status change on WO-4403 while it is 'Pending'
  enqueueFieldWorkOrderStatusAction(
    {
      woId: 'WO-4403',
      targetStatus: 'En Route',
      canonicalWorkOrders: workOrdersState,
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
    },
    storage
  );

  // Before offline replay occurs, another actor marks WO-4403 as 'Completed' in canonical ERP state
  const woIdx = workOrdersState.findIndex((w) => w.id === 'WO-4403');
  workOrdersState[woIdx] = {
    ...workOrdersState[woIdx],
    status: 'Completed',
    actionHistory: [
      ...(workOrdersState[woIdx].actionHistory || []),
      {
        timestamp: new Date().toISOString(),
        stage: 'Completed',
        actor: 'Rajesh V. Trivedi (EMPLOYEE)',
        notes: 'Closed directly by subdivision desk.',
      },
    ],
  };

  let workflowCalled = false;
  const conflictSummary = replayFieldOfflineQueue({
    isOnline: true,
    dataMode: 'DEMO',
    processedUuids,
    storage,
    getWorkOrder: (woId) => workOrdersState.find((w) => w.id === woId),
    executeWorkflowUpdate: () => {
      workflowCalled = true;
      return { success: true };
    },
  });

  assert.equal(workflowCalled, false, 'Conflicting item must not overwrite canonical state');
  assert.equal(conflictSummary.syncedCount, 0);
  assert.equal(conflictSummary.failedCount, 1);
  assert.equal(conflictSummary.conflictCount, 1);
  assert.equal(conflictSummary.queue.length, 1, 'Failed item must remain visible in the queue');
  assert.equal(conflictSummary.queue[0].status, 'FAILED');
  assert.equal(conflictSummary.queue[0].conflictDetected, true);
  assert.ok(conflictSummary.queue[0].failureReason?.includes('Conflict:'));
  assert.equal(
    workOrdersState[woIdx].status,
    'Completed',
    'Canonical WO-4403 status must remain Completed'
  );
}

// ============================================================================
// 8. Existing Online Workflow Behavior Remains Unchanged
// ============================================================================
console.log('8. Testing existing online work-order transition rules...');
{
  assert.equal(isValidWorkOrderTransition('Pending', 'En Route'), true);
  assert.equal(isValidWorkOrderTransition('En Route', 'On Site'), true);
  assert.equal(isValidWorkOrderTransition('On Site', 'Completed'), true);
  assert.equal(isValidWorkOrderTransition('Pending', 'Completed'), false);
  assert.equal(isValidWorkOrderTransition('Completed', 'Pending'), false);

  const sampleWo = structuredClone(INITIAL_WORK_ORDERS.find((w) => w.id === 'WO-4402')!);
  const validStepCheck = validateOfflineQueueItemAgainstRecord(
    {
      client_uuid: generateClientUuid(),
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4402',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'PENDING',
      attemptCount: 0,
      payload: {
        woId: 'WO-4402',
        expectedPreviousStatus: 'Pending',
        targetStatus: 'En Route',
      },
    },
    sampleWo
  );
  assert.equal(validStepCheck.valid, true);
}

// ============================================================================
// 9. Four-Language Queue Labels & Toast Localizations Are Available
// ============================================================================
console.log('9. Testing four-language (en, gu, hi, mr) offline queue translations...');
{
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  const requiredKeys: (keyof typeof FIELD_UI_TRANSLATIONS.en)[] = [
    'headingOfflineQueue',
    'subtitleOfflineQueue',
    'btnSimulateSyncNow',
    'offlineQueuePendingCountBadge',
    'offlineQueueTotalItemsLabel',
    'offlineQueueActionInspection',
    'offlineQueueActionStatusUpdate',
    'queueStatusPending',
    'queueStatusProcessing',
    'queueStatusCompleted',
    'queueStatusFailed',
    'emptyOfflineQueueTitle',
    'emptyOfflineQueueDesc',
    'labelClientUuidPrefix',
    'labelQueuedAtPrefix',
    'labelReplayedAtPrefix',
    'labelTransitionPrefix',
    'btnRetryQueueItem',
    'offlineDemoDisclaimer',
    'badgeOfflineQueuedOnWo',
  ];

  for (const lang of languages) {
    const dict = FIELD_UI_TRANSLATIONS[lang];
    for (const key of requiredKeys) {
      assert.ok(
        typeof dict[key] === 'string' && dict[key].trim().length > 0,
        `Missing translation for ${String(key)} in ${lang}`
      );
      if (lang !== 'en') {
        assert.notEqual(
          dict[key],
          FIELD_UI_TRANSLATIONS.en[key],
          `Translation for ${String(key)} in ${lang} must not equal English`
        );
      }
    }
  }

  // Verify failure reason localization across gu, hi, mr
  const sampleConflict =
    'Conflict: Work Order WO-4401 status changed from "On Site" to "Completed" before replay.';
  for (const lang of ['gu', 'hi', 'mr'] as Language[]) {
    const localized = localizeOfflineQueueFailureReason(sampleConflict, lang);
    assert.notEqual(localized, sampleConflict);
    assert.ok(localized.includes('WO-4401'));
  }

  // Verify toast localization across gu, hi, mr
  const sampleToast =
    'Inspection report for WO-4401 queued locally (Offline Queue). Canonical ERP state will update after DEMO replay.';
  for (const lang of ['gu', 'hi', 'mr'] as Language[]) {
    const localizedToast = localizeToastMessage(sampleToast, lang);
    assert.notEqual(localizedToast, sampleToast);
    assert.ok(localizedToast.includes('WO-4401'));
  }
}

// ============================================================================
// 10. Existing DEMO Data Remains Intact
// ============================================================================
console.log('10. Verifying canonical DEMO datasets and accounts remain intact...');
{
  assert.ok(INITIAL_CONNECTIONS.length >= 2);
  assert.ok(INITIAL_APPLICATIONS.some((a) => a.id === 'APP-2026-0842'));
  assert.ok(INITIAL_COMPLAINTS.some((c) => c.id === 'CMP-8821'));
  assert.ok(INITIAL_WORK_ORDERS.some((w) => w.id === 'WO-4401'));
  assert.ok(INITIAL_WORK_ORDERS.some((w) => w.id === 'WO-4402'));
  assert.ok(INITIAL_WORK_ORDERS.some((w) => w.id === 'WO-4403'));
  assert.ok(INITIAL_BILLS.length >= 2);
  assert.equal(Object.keys(DEFAULT_DEMO_ACCOUNTS).length, 5);
}

console.log('All 10 Field Engineer Functional Offline Queue test scenarios PASSED!');
