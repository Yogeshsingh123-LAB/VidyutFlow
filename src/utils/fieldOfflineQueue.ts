import { WorkOrder } from '../types';
import { isValidWorkOrderTransition } from '../services/erpAdapter';
import { OperatingDataMode } from '../services/erpApiContracts';

export const FIELD_OFFLINE_QUEUE_STORAGE_KEY = 'vidyutflow_field_offline_queue';

export type FieldOfflineActionType = 'SITE_INSPECTION_SUBMIT' | 'WORK_ORDER_STATUS_UPDATE';

export type FieldOfflineSyncStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface FieldOfflineActionPayload {
  woId: string;
  targetStatus: WorkOrder['status'];
  expectedPreviousStatus?: WorkOrder['status'];
  expectedActionCount?: number;
  workOrderTitle?: string;
  location?: string;
  relatedRefId?: string;
  inspectionReport?: WorkOrder['inspectionReport'];
  submittedBy?: string;
}

export interface FieldOfflineQueueItem {
  client_uuid: string;
  actionType: FieldOfflineActionType;
  targetRecordId: string;
  relatedRefId?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  status: FieldOfflineSyncStatus;
  payload: FieldOfflineActionPayload;
  attemptCount: number;
  syncedAt?: string;
  failureReason?: string;
  conflictDetected?: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type FieldConnectivityStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'SIMULATED_OFFLINE'
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCHRONIZED_DEMO'
  | 'SYNC_FAILED'
  | 'CONFLICT_DETECTED';

export interface ResolveFieldConnectivityParams {
  isBrowserOffline: boolean;
  isOfflineSimulated: boolean;
  isSyncing: boolean;
  queue: FieldOfflineQueueItem[];
  recentlySynced?: boolean;
  prioritizeNetworkHealth?: boolean;
}

/**
 * Determines the unambiguous field operations connectivity and queue status.
 * Evaluates real browser network connectivity, demo simulation toggle, active
 * synchronization progress, and pending/failed queue states.
 * When prioritizeNetworkHealth is enabled, displays pure network status (ONLINE, OFFLINE,
 * SIMULATED_OFFLINE, PENDING_SYNC, SYNCING, SYNCHRONIZED_DEMO) so network connectivity
 * is not confused with queue health.
 */
export function resolveFieldConnectivityStatus(
  params: ResolveFieldConnectivityParams
): FieldConnectivityStatus {
  if (params.isSyncing) {
    return 'SYNCING';
  }
  if (params.isBrowserOffline) {
    return 'OFFLINE';
  }
  if (params.isOfflineSimulated) {
    return 'SIMULATED_OFFLINE';
  }
  const pendingCount = params.queue.filter((q) => q.status === 'PENDING').length;
  const conflictCount = params.queue.filter((q) => q.status === 'FAILED' && q.conflictDetected).length;
  const failedCount = params.queue.filter((q) => q.status === 'FAILED' && !q.conflictDetected).length;

  if (params.prioritizeNetworkHealth) {
    if (pendingCount > 0) {
      return 'PENDING_SYNC';
    }
    if (params.recentlySynced) {
      return 'SYNCHRONIZED_DEMO';
    }
    return 'ONLINE';
  }

  if (conflictCount > 0) {
    return 'CONFLICT_DETECTED';
  }
  if (failedCount > 0) {
    return 'SYNC_FAILED';
  }
  if (pendingCount > 0) {
    return 'PENDING_SYNC';
  }
  if (params.recentlySynced) {
    return 'SYNCHRONIZED_DEMO';
  }
  return 'ONLINE';
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Sandboxed or unavailable localStorage
  }
  return null;
}

/**
 * Generates a stable client_uuid using crypto.randomUUID() when available,
 * with an RFC4122 v4-compatible fallback for environments without randomUUID.
 */
export function generateClientUuid(): string {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === 'function'
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Fallback below
  }
  const hex4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16);
  return `${hex4()}${hex4()}-${hex4()}-4${hex4().slice(1)}-${variant}${hex4().slice(1)}-${hex4()}${hex4()}${hex4()}`;
}

const VALID_ACTION_TYPES = new Set<FieldOfflineActionType>([
  'SITE_INSPECTION_SUBMIT',
  'WORK_ORDER_STATUS_UPDATE',
]);

const VALID_SYNC_STATUSES = new Set<FieldOfflineSyncStatus>([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

const VALID_WO_STATUSES = new Set<WorkOrder['status']>([
  'Pending',
  'En Route',
  'On Site',
  'Completed',
  'Deferred',
]);

export function isValidOfflineQueueItem(candidate: unknown): candidate is FieldOfflineQueueItem {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return false;
  }
  const item = candidate as Partial<FieldOfflineQueueItem>;
  if (typeof item.client_uuid !== 'string' || item.client_uuid.trim().length === 0) {
    return false;
  }
  if (!item.actionType || !VALID_ACTION_TYPES.has(item.actionType)) {
    return false;
  }
  if (typeof item.targetRecordId !== 'string' || item.targetRecordId.trim().length === 0) {
    return false;
  }
  if (!item.status || !VALID_SYNC_STATUSES.has(item.status)) {
    return false;
  }
  if (!item.payload || typeof item.payload !== 'object') {
    return false;
  }
  if (
    typeof item.payload.woId !== 'string' ||
    !item.payload.targetStatus ||
    !VALID_WO_STATUSES.has(item.payload.targetStatus)
  ) {
    return false;
  }
  return true;
}

/**
 * Safely loads the Field Engineer offline queue from localStorage.
 * Handles malformed JSON, non-array payloads, or unavailable storage without crashing.
 * Conservatively marks any item left in 'PROCESSING' (e.g., interrupted by browser reload/crash)
 * as 'FAILED' so replay never silently duplicates an unconfirmed mutation.
 */
export function loadFieldOfflineQueue(
  storage: StorageLike | null = getDefaultStorage()
): FieldOfflineQueueItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      try {
        storage.setItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify([]));
      } catch {
        // Ignore write error
      }
      return [];
    }

    let mutatedDuringRecovery = false;
    const seenUuids = new Set<string>();
    const validItems: FieldOfflineQueueItem[] = [];

    for (const entry of parsed) {
      if (!isValidOfflineQueueItem(entry)) {
        mutatedDuringRecovery = true;
        continue;
      }
      if (seenUuids.has(entry.client_uuid)) {
        mutatedDuringRecovery = true;
        continue;
      }
      seenUuids.add(entry.client_uuid);

      const normalizedTimestamp = entry.timestamp || entry.createdAt || new Date().toISOString();
      const normalizedCreatedAt = entry.createdAt || normalizedTimestamp;

      // Conservative recovery for interrupted replay across browser refresh/crash
      if (entry.status === 'PROCESSING') {
        mutatedDuringRecovery = true;
        validItems.push({
          ...entry,
          timestamp: normalizedTimestamp,
          createdAt: normalizedCreatedAt,
          updatedAt: new Date().toISOString(),
          status: 'FAILED',
          conflictDetected: true,
          failureReason:
            'Replay interrupted by browser reload — verify work order state before retrying.',
        });
      } else {
        validItems.push({
          ...entry,
          timestamp: normalizedTimestamp,
          createdAt: normalizedCreatedAt,
          updatedAt: entry.updatedAt || normalizedCreatedAt,
          attemptCount: typeof entry.attemptCount === 'number' ? entry.attemptCount : 0,
        });
      }
    }

    if (mutatedDuringRecovery) {
      saveFieldOfflineQueue(validItems, storage);
    }

    return validItems;
  } catch {
    // Self-heal corrupted JSON in storage without crashing
    try {
      storage.setItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // Ignore write error
    }
    return [];
  }
}

/**
 * Safely persists the Field Engineer offline queue to localStorage.
 */
export function saveFieldOfflineQueue(
  items: FieldOfflineQueueItem[],
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the effective prior status for a work order when capturing multiple offline actions
 * sequentially before replay (e.g. Pending -> En Route -> On Site while offline).
 */
export function getEffectiveOfflineWorkOrderStatus(
  woId: string,
  canonicalWorkOrders: WorkOrder[],
  queueItems: FieldOfflineQueueItem[]
): WorkOrder['status'] | undefined {
  const pendingForWo = queueItems.filter(
    (item) => item.targetRecordId === woId && item.status === 'PENDING'
  );
  if (pendingForWo.length > 0) {
    return pendingForWo[pendingForWo.length - 1].payload.targetStatus;
  }
  return canonicalWorkOrders.find((w) => w.id === woId)?.status;
}

export interface EnqueueInspectionParams {
  woId: string;
  canonicalWorkOrders: WorkOrder[];
  existingQueue?: FieldOfflineQueueItem[];
  inspectionReport: NonNullable<WorkOrder['inspectionReport']>;
  submittedBy: string;
  clientUuid?: string;
  nowIso?: string;
}

function resolveWorkOrderRelatedRefId(
  woId: string,
  targetWo: WorkOrder | undefined
): string | undefined {
  if (targetWo?.complaintId) return targetWo.complaintId;
  if (targetWo?.applicationId) return targetWo.applicationId;
  if (targetWo?.title) {
    const cmpMatch = targetWo.title.match(/\b(CMP-\d+)\b/);
    if (cmpMatch) return cmpMatch[1];
    const appMatch = targetWo.title.match(/\b(APP-\d{4}-\d+)\b/);
    if (appMatch) return appMatch[1];
  }
  if (woId === 'WO-4401') return 'CMP-8821';
  if (woId === 'WO-4402') return 'APP-2026-0842';
  if (woId.startsWith('WO-CMP-')) return woId.replace('WO-CMP-', 'CMP-');
  if (woId.startsWith('WO-INS-')) return woId.replace('WO-INS-', 'APP-');
  return undefined;
}

export function enqueueFieldInspectionAction(
  params: EnqueueInspectionParams,
  storage: StorageLike | null = getDefaultStorage()
): { item: FieldOfflineQueueItem; queue: FieldOfflineQueueItem[] } {
  const currentQueue = params.existingQueue ?? loadFieldOfflineQueue(storage);
  const targetWo = params.canonicalWorkOrders.find((w) => w.id === params.woId);
  const effectivePrevStatus = getEffectiveOfflineWorkOrderStatus(
    params.woId,
    params.canonicalWorkOrders,
    currentQueue
  );
  const hasPriorPendingForSameWo = currentQueue.some(
    (q) => q.targetRecordId === params.woId && q.status === 'PENDING'
  );
  const now = params.nowIso || new Date().toISOString();
  const relatedRefId = resolveWorkOrderRelatedRefId(params.woId, targetWo);

  const newItem: FieldOfflineQueueItem = {
    client_uuid: params.clientUuid || generateClientUuid(),
    actionType: 'SITE_INSPECTION_SUBMIT',
    targetRecordId: params.woId,
    relatedRefId,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
    attemptCount: 0,
    payload: {
      woId: params.woId,
      targetStatus: 'Completed',
      expectedPreviousStatus: effectivePrevStatus,
      expectedActionCount:
        !hasPriorPendingForSameWo && targetWo
          ? (targetWo.actionHistory || []).length
          : undefined,
      workOrderTitle: targetWo?.title,
      location: targetWo?.location,
      relatedRefId,
      inspectionReport: structuredClone(params.inspectionReport),
      submittedBy: params.submittedBy,
    },
  };

  const updatedQueue = [...currentQueue, newItem];
  saveFieldOfflineQueue(updatedQueue, storage);
  return { item: newItem, queue: updatedQueue };
}

export interface EnqueueWorkOrderStatusParams {
  woId: string;
  targetStatus: WorkOrder['status'];
  canonicalWorkOrders: WorkOrder[];
  existingQueue?: FieldOfflineQueueItem[];
  inspectionReport?: WorkOrder['inspectionReport'];
  submittedBy?: string;
  clientUuid?: string;
  nowIso?: string;
}

export function enqueueFieldWorkOrderStatusAction(
  params: EnqueueWorkOrderStatusParams,
  storage: StorageLike | null = getDefaultStorage()
): { item: FieldOfflineQueueItem; queue: FieldOfflineQueueItem[] } {
  const currentQueue = params.existingQueue ?? loadFieldOfflineQueue(storage);
  const targetWo = params.canonicalWorkOrders.find((w) => w.id === params.woId);
  const effectivePrevStatus = getEffectiveOfflineWorkOrderStatus(
    params.woId,
    params.canonicalWorkOrders,
    currentQueue
  );
  const hasPriorPendingForSameWo = currentQueue.some(
    (q) => q.targetRecordId === params.woId && q.status === 'PENDING'
  );
  const now = params.nowIso || new Date().toISOString();
  const relatedRefId = resolveWorkOrderRelatedRefId(params.woId, targetWo);

  const isFullInspection =
    params.targetStatus === 'Completed' &&
    Boolean(params.inspectionReport && params.inspectionReport.meterSerialScanned);

  const newItem: FieldOfflineQueueItem = {
    client_uuid: params.clientUuid || generateClientUuid(),
    actionType: isFullInspection ? 'SITE_INSPECTION_SUBMIT' : 'WORK_ORDER_STATUS_UPDATE',
    targetRecordId: params.woId,
    relatedRefId,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
    attemptCount: 0,
    payload: {
      woId: params.woId,
      targetStatus: params.targetStatus,
      expectedPreviousStatus: effectivePrevStatus,
      expectedActionCount:
        !hasPriorPendingForSameWo && targetWo
          ? (targetWo.actionHistory || []).length
          : undefined,
      workOrderTitle: targetWo?.title,
      location: targetWo?.location,
      relatedRefId,
      ...(params.inspectionReport
        ? { inspectionReport: structuredClone(params.inspectionReport) }
        : {}),
      submittedBy: params.submittedBy,
    },
  };

  const updatedQueue = [...currentQueue, newItem];
  saveFieldOfflineQueue(updatedQueue, storage);
  return { item: newItem, queue: updatedQueue };
}

export interface ValidateOfflineReplayResult {
  valid: boolean;
  conflict: boolean;
  reason?: string;
}

/**
 * Validates whether a queued offline action can be safely replayed against the current
 * canonical WorkOrder record without overwriting incompatible or newer state.
 */
export function validateOfflineQueueItemAgainstRecord(
  item: FieldOfflineQueueItem,
  currentWo: WorkOrder | undefined
): ValidateOfflineReplayResult {
  if (!currentWo) {
    return {
      valid: false,
      conflict: false,
      reason: `Work Order #${item.targetRecordId} was not found in canonical ERP state.`,
    };
  }

  // If canonical work order is already terminal (Completed or Deferred), report conflict
  if (currentWo.status === 'Completed' || currentWo.status === 'Deferred') {
    return {
      valid: false,
      conflict: true,
      reason: `Conflict: Work Order ${currentWo.id} is already "${currentWo.status}" in canonical ERP state.`,
    };
  }

  // Check if the record's status diverged from expectedPreviousStatus captured when queued
  if (
    item.payload.expectedPreviousStatus &&
    currentWo.status !== item.payload.expectedPreviousStatus
  ) {
    return {
      valid: false,
      conflict: true,
      reason: `Conflict: Work Order ${currentWo.id} status changed from "${item.payload.expectedPreviousStatus}" to "${currentWo.status}" before replay.`,
    };
  }

  // Check if another actor appended history entries to this work order since capture
  if (
    typeof item.payload.expectedActionCount === 'number' &&
    (currentWo.actionHistory || []).length !== item.payload.expectedActionCount
  ) {
    return {
      valid: false,
      conflict: true,
      reason: `Conflict: Work Order ${currentWo.id} was modified by another operation before offline replay.`,
    };
  }

  if (item.actionType === 'SITE_INSPECTION_SUBMIT') {
    if (!item.payload.inspectionReport || !item.payload.inspectionReport.meterSerialScanned) {
      return {
        valid: false,
        conflict: false,
        reason: `Invalid inspection payload for ${currentWo.id}: missing scanned meter serial.`,
      };
    }
    return { valid: true, conflict: false };
  }

  // WORK_ORDER_STATUS_UPDATE: enforce state machine transition rules
  if (currentWo.status === item.payload.targetStatus) {
    return {
      valid: false,
      conflict: true,
      reason: `Conflict: Work Order ${currentWo.id} is already in "${currentWo.status}" status.`,
    };
  }

  if (!isValidWorkOrderTransition(currentWo.status, item.payload.targetStatus)) {
    return {
      valid: false,
      conflict: false,
      reason: `Invalid progression from "${currentWo.status}" to "${item.payload.targetStatus}".`,
    };
  }

  return { valid: true, conflict: false };
}

export interface FieldOfflineReplaySummary {
  queue: FieldOfflineQueueItem[];
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  skippedCount: number;
  blockedOffline: boolean;
  blockedLiveBackendUnavailable?: boolean;
  error?: string;
}

export interface ReplayFieldOfflineQueueOptions {
  queue?: FieldOfflineQueueItem[];
  isOnline: boolean;
  dataMode?: OperatingDataMode;
  isLiveBackendConnected?: boolean;
  processedUuids: Set<string>;
  getWorkOrder: (woId: string) => WorkOrder | undefined;
  executeWorkflowUpdate: (item: FieldOfflineQueueItem) => {
    success: boolean;
    error?: string;
    conflict?: boolean;
  };
  storage?: StorageLike | null;
  targetClientUuid?: string;
  nowIso?: string;
}

/**
 * Replays pending Field Engineer offline queue items in FIFO order in DEMO mode
 * only when online mode is restored.
 * Guarantees each client_uuid is processed at most once in the DEMO replay flow.
 */
export function replayFieldOfflineQueue(
  options: ReplayFieldOfflineQueueOptions
): FieldOfflineReplaySummary {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const workingQueue = (options.queue ?? loadFieldOfflineQueue(storage)).map((item) => ({
    ...item,
  }));

  const eligibleItems = workingQueue.filter((item) => {
    if (options.targetClientUuid) {
      return (
        item.client_uuid === options.targetClientUuid &&
        (item.status === 'PENDING' || item.status === 'FAILED')
      );
    }
    return item.status === 'PENDING';
  });

  if (!options.isOnline) {
    return {
      queue: workingQueue,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      skippedCount: eligibleItems.length,
      blockedOffline: true,
      error: 'Cannot replay queued actions while offline mode is active.',
    };
  }

  if (options.dataMode === 'LIVE' && !options.isLiveBackendConnected) {
    return {
      queue: workingQueue,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      skippedCount: eligibleItems.length,
      blockedOffline: false,
      blockedLiveBackendUnavailable: true,
      error:
        'Live backend integration is not verified/connected. DEMO replay will not attempt unverified live server writes.',
    };
  }

  let syncedCount = 0;
  let failedCount = 0;
  let conflictCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < workingQueue.length; i++) {
    const item = workingQueue[i];
    const isTarget = options.targetClientUuid
      ? item.client_uuid === options.targetClientUuid &&
        (item.status === 'PENDING' || item.status === 'FAILED')
      : item.status === 'PENDING';

    if (!isTarget) {
      continue;
    }

    // Idempotency guard: never process a client_uuid that has already completed
    if (item.status === 'COMPLETED' || options.processedUuids.has(item.client_uuid)) {
      skippedCount++;
      if (item.status !== 'COMPLETED') {
        workingQueue[i] = {
          ...item,
          status: 'COMPLETED',
          updatedAt: options.nowIso || new Date().toISOString(),
        };
      }
      continue;
    }

    const now = options.nowIso || new Date().toISOString();

    // Mark as PROCESSING and persist before invoking workflow mutation
    workingQueue[i] = {
      ...item,
      status: 'PROCESSING',
      attemptCount: (item.attemptCount || 0) + 1,
      updatedAt: now,
      failureReason: undefined,
    };
    saveFieldOfflineQueue(workingQueue, storage);

    const currentWo = options.getWorkOrder(item.targetRecordId);
    const validation = validateOfflineQueueItemAgainstRecord(workingQueue[i], currentWo);

    if (!validation.valid) {
      failedCount++;
      if (validation.conflict) conflictCount++;
      workingQueue[i] = {
        ...workingQueue[i],
        status: 'FAILED',
        conflictDetected: validation.conflict,
        failureReason: validation.reason,
        updatedAt: now,
      };
      saveFieldOfflineQueue(workingQueue, storage);
      continue;
    }

    const execResult = options.executeWorkflowUpdate(workingQueue[i]);
    if (execResult.success) {
      options.processedUuids.add(item.client_uuid);
      syncedCount++;
      workingQueue[i] = {
        ...workingQueue[i],
        status: 'COMPLETED',
        syncedAt: now,
        updatedAt: now,
        failureReason: undefined,
        conflictDetected: false,
      };
      saveFieldOfflineQueue(workingQueue, storage);
    } else {
      failedCount++;
      if (execResult.conflict) conflictCount++;
      workingQueue[i] = {
        ...workingQueue[i],
        status: 'FAILED',
        conflictDetected: Boolean(execResult.conflict),
        failureReason: execResult.error || 'Workflow operation failed during DEMO replay.',
        updatedAt: now,
      };
      saveFieldOfflineQueue(workingQueue, storage);
    }
  }

  return {
    queue: workingQueue,
    syncedCount,
    failedCount,
    conflictCount,
    skippedCount,
    blockedOffline: false,
  };
}
