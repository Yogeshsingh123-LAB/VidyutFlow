/**
 * Persistent Offline Field Queue & Auto-Reconnect Sync Engine (Item #22)
 *
 * - Persists offline field updates across reloads in BOTH `localStorage`
 *   (`vidyutflow_field_sync_queue_v1`) and browser `IndexedDB` (`vidyutflow_offline_db` /
 *   object store `field_sync_queue`).
 * - Generates an RFC-4122 `client_uuid` per field inspection for idempotent replay against
 *   FastAPI `POST /api/requests/field-sync` (server returns `duplicate: true` on re-delivery).
 * - Scopes backend sync items by `actor_email` so one engineer's queued items are never
 *   transmitted under another engineer's JWT session.
 * - Captures HTTP `409` / `403` / `404` / `400` responses as explicit `CONFLICT` states
 *   with server reasons and resolution controls instead of silently dropping or infinitely looping.
 */

import { hasBackendSession } from './backendSession';
import { FieldSyncResponse, syncLiveFieldUpdate } from './liveData';

export type FieldSyncTaskStatus = 'FIELD_VERIFIED' | 'COMPLETED' | 'BLOCKED';
export type OfflineQueueSyncState = 'PENDING' | 'SYNCING' | 'SYNCED' | 'DUPLICATE' | 'CONFLICT';
export type OfflineQueueTargetKind = 'backend_request' | 'demo_workorder';

export interface OfflineInspectionDetails {
  readingKwh: number;
  sealIntact: boolean;
  terminalCondition: 'Normal' | 'Burnt' | 'Loose';
  voltageR: number;
  voltageY: number;
  voltageB: number;
  gpsLocation: string;
  photoAttached: boolean;
  submittedBy: string;
}

export interface OfflineFieldQueueItem {
  client_uuid: string;
  target_kind: OfflineQueueTargetKind;
  request_id: string;
  title: string;
  task_status: FieldSyncTaskStatus;
  notes: string;
  meter_serial: string;
  created_offline_at: string;
  actor_email: string;
  sync_state: OfflineQueueSyncState;
  attempts: number;
  last_attempt_at?: string;
  synced_at?: string;
  field_update_id?: string;
  server_request_status?: string;
  conflict_code?: number;
  conflict_reason?: string;
  last_network_error?: string;
  inspection_details?: OfflineInspectionDetails;
}

export interface EnqueueFieldInspectionInput {
  client_uuid?: string;
  target_kind: OfflineQueueTargetKind;
  request_id: string;
  title: string;
  task_status: FieldSyncTaskStatus;
  notes: string;
  meter_serial: string;
  created_offline_at?: string;
  actor_email: string;
  inspection_details?: OfflineInspectionDetails;
}

export interface FlushFieldQueueSummary {
  attempted: number;
  syncedCount: number;
  duplicateCount: number;
  conflictCount: number;
  remainingPending: number;
  skippedOffline: boolean;
}

export const OFFLINE_FIELD_QUEUE_KEY = 'vidyutflow_field_offline_queue';
export const OFFLINE_MANUAL_OVERRIDE_KEY = 'vidyutflow_field_offline_override';
const IDB_NAME = 'vidyutflow_offline_db';
const IDB_STORE = 'field_sync_queue';

let memoryQueue: OfflineFieldQueueItem[] | null = null;
let activeFlushPromise: Promise<FlushFieldQueueSummary> | null = null;
const queueListeners = new Set<() => void>();

function notifyQueueListeners(): void {
  for (const listener of queueListeners) {
    listener();
  }
}

export function subscribeFieldQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => {
    queueListeners.delete(listener);
  };
}

export function generateClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function getManualOfflineOverride(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(OFFLINE_MANUAL_OVERRIDE_KEY) === 'true';
}

export function setManualOfflineOverride(offline: boolean): void {
  const storage = getStorage();
  if (!storage) return;
  if (offline) {
    storage.setItem(OFFLINE_MANUAL_OVERRIDE_KEY, 'true');
  } else {
    storage.removeItem(OFFLINE_MANUAL_OVERRIDE_KEY);
  }
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }
  return navigator.onLine;
}

export function isFieldEffectivelyOffline(manualOffline = getManualOfflineOverride()): boolean {
  return Boolean(manualOffline) || !isBrowserOnline();
}

function readQueueFromLocalStorage(): OfflineFieldQueueItem[] {
  const storage = getStorage();
  if (!storage) return memoryQueue ? [...memoryQueue] : [];
  try {
    const raw = storage.getItem(OFFLINE_FIELD_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is OfflineFieldQueueItem =>
        Boolean(item) &&
        typeof item.client_uuid === 'string' &&
        typeof item.request_id === 'string' &&
        (item.task_status === 'FIELD_VERIFIED' ||
          item.task_status === 'COMPLETED' ||
          item.task_status === 'BLOCKED')
    );
  } catch {
    return [];
  }
}

function writeQueueToIndexedDb(items: OfflineFieldQueueItem[]): void {
  if (typeof indexedDB === 'undefined') return;
  try {
    const openReq = indexedDB.open(IDB_NAME, 1);
    openReq.onupgradeneeded = () => {
      const db = openReq.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'client_uuid' });
      }
    };
    openReq.onsuccess = () => {
      try {
        const db = openReq.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.clear();
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      } catch {
        // Ignore non-fatal IndexedDB transaction issues; localStorage mirror remains authoritative.
      }
    };
  } catch {
    // IndexedDB unavailable (e.g. private browsing / Node test runtime)
  }
}

function persistQueue(items: OfflineFieldQueueItem[]): void {
  memoryQueue = [...items];
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(OFFLINE_FIELD_QUEUE_KEY, JSON.stringify(items));
    } catch {
      // Quota or sandbox error; memoryQueue + IndexedDB retain items.
    }
  }
  writeQueueToIndexedDb(items);
  notifyQueueListeners();
}

export function loadFieldQueue(): OfflineFieldQueueItem[] {
  const stored = readQueueFromLocalStorage();
  if (stored.length > 0 || getStorage() !== null) {
    memoryQueue = stored;
    return [...stored];
  }
  return memoryQueue ? [...memoryQueue] : [];
}

/**
 * Hydrate any items persisted in IndexedDB that are missing from localStorage
 * (for example if localStorage was evicted under mobile storage pressure).
 */
export async function hydrateFieldQueueFromIndexedDb(): Promise<OfflineFieldQueueItem[]> {
  const current = loadFieldQueue();
  if (typeof indexedDB === 'undefined') return current;

  return new Promise(resolve => {
    try {
      const openReq = indexedDB.open(IDB_NAME, 1);
      openReq.onupgradeneeded = () => {
        const db = openReq.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'client_uuid' });
        }
      };
      openReq.onerror = () => resolve(current);
      openReq.onsuccess = () => {
        try {
          const db = openReq.result;
          const tx = db.transaction(IDB_STORE, 'readonly');
          const getAllReq = tx.objectStore(IDB_STORE).getAll();
          getAllReq.onsuccess = () => {
            const idbItems = Array.isArray(getAllReq.result)
              ? (getAllReq.result as OfflineFieldQueueItem[])
              : [];
            db.close();
            if (idbItems.length === 0) {
              resolve(current);
              return;
            }
            const byUuid = new Map<string, OfflineFieldQueueItem>();
            for (const item of idbItems) {
              if (item && typeof item.client_uuid === 'string') {
                byUuid.set(item.client_uuid, item);
              }
            }
            for (const item of current) {
              byUuid.set(item.client_uuid, item);
            }
            const merged = Array.from(byUuid.values()).sort((a, b) =>
              b.created_offline_at.localeCompare(a.created_offline_at)
            );
            if (merged.length !== current.length) {
              persistQueue(merged);
            }
            resolve(merged);
          };
          getAllReq.onerror = () => {
            db.close();
            resolve(current);
          };
        } catch {
          resolve(current);
        }
      };
    } catch {
      resolve(current);
    }
  });
}

export function getVisibleFieldQueue(actorEmail: string): OfflineFieldQueueItem[] {
  const normalized = actorEmail.trim().toLowerCase();
  return loadFieldQueue().filter(
    item => !item.actor_email || item.actor_email.toLowerCase() === normalized
  );
}

export function enqueueFieldInspection(input: EnqueueFieldInspectionInput): OfflineFieldQueueItem {
  const nowIso = new Date().toISOString();
  const item: OfflineFieldQueueItem = {
    client_uuid: input.client_uuid?.trim() || generateClientUuid(),
    target_kind: input.target_kind,
    request_id: input.request_id.trim(),
    title: input.title.trim(),
    task_status: input.task_status,
    notes: input.notes.trim(),
    meter_serial: input.meter_serial.trim(),
    created_offline_at: input.created_offline_at || nowIso,
    actor_email: input.actor_email.trim().toLowerCase(),
    sync_state: 'PENDING',
    attempts: 0,
    inspection_details: input.inspection_details,
  };
  const next = [item, ...loadFieldQueue().filter(existing => existing.client_uuid !== item.client_uuid)];
  persistQueue(next);
  return item;
}

export interface FlushFieldQueueOptions {
  actorEmail: string;
  manualOffline?: boolean;
  syncFn?: (payload: {
    client_uuid: string;
    request_id: string;
    task_status: FieldSyncTaskStatus;
    notes: string;
    meter_serial: string;
    created_offline_at: string;
  }) => Promise<FieldSyncResponse>;
  hasSessionFn?: () => boolean;
  onApplyDemoWorkOrder?: (item: OfflineFieldQueueItem) => void;
}

export async function flushOfflineFieldQueue(
  options: FlushFieldQueueOptions
): Promise<FlushFieldQueueSummary> {
  if (activeFlushPromise) {
    return activeFlushPromise;
  }

  activeFlushPromise = (async (): Promise<FlushFieldQueueSummary> => {
    const manualOffline = options.manualOffline ?? getManualOfflineOverride();
    const actor = options.actorEmail.trim().toLowerCase();
    const initialQueue = loadFieldQueue();

    if (isFieldEffectivelyOffline(manualOffline)) {
      const remainingPending = initialQueue.filter(
        i => (!i.actor_email || i.actor_email === actor) && i.sync_state === 'PENDING'
      ).length;
      return {
        attempted: 0,
        syncedCount: 0,
        duplicateCount: 0,
        conflictCount: 0,
        remainingPending,
        skippedOffline: true,
      };
    }

    const syncBackend = options.syncFn ?? syncLiveFieldUpdate;
    const checkSession = options.hasSessionFn ?? hasBackendSession;

    // Replay in chronological order (oldest queued update first) so state transitions execute in sequence.
    const pendingUuids = initialQueue
      .filter(i => (!i.actor_email || i.actor_email === actor) && i.sync_state === 'PENDING')
      .sort((a, b) => a.created_offline_at.localeCompare(b.created_offline_at))
      .map(i => i.client_uuid);

    let attempted = 0;
    let syncedCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;

    for (const uuid of pendingUuids) {
      const snapshot = loadFieldQueue();
      const idx = snapshot.findIndex(i => i.client_uuid === uuid);
      if (idx === -1 || snapshot[idx].sync_state !== 'PENDING') continue;

      const currentItem = snapshot[idx];
      const attemptTime = new Date().toISOString();

      if (currentItem.target_kind === 'demo_workorder') {
        attempted += 1;
        options.onApplyDemoWorkOrder?.(currentItem);
        const updated = loadFieldQueue().map(i =>
          i.client_uuid === uuid
            ? {
                ...i,
                sync_state: 'SYNCED' as const,
                attempts: i.attempts + 1,
                last_attempt_at: attemptTime,
                synced_at: attemptTime,
                last_network_error: undefined,
              }
            : i
        );
        persistQueue(updated);
        syncedCount += 1;
        continue;
      }

      // Backend request requires an active verified backend session
      if (!checkSession()) {
        const updated = loadFieldQueue().map(i =>
          i.client_uuid === uuid
            ? {
                ...i,
                last_network_error: 'Waiting for verified backend session before replay.',
              }
            : i
        );
        persistQueue(updated);
        continue;
      }

      attempted += 1;
      persistQueue(
        loadFieldQueue().map(i =>
          i.client_uuid === uuid
            ? { ...i, sync_state: 'SYNCING' as const, attempts: i.attempts + 1, last_attempt_at: attemptTime }
            : i
        )
      );

      try {
        const res = await syncBackend({
          client_uuid: currentItem.client_uuid,
          request_id: currentItem.request_id,
          task_status: currentItem.task_status,
          notes: currentItem.notes,
          meter_serial: currentItem.meter_serial,
          created_offline_at: currentItem.created_offline_at,
        });

        const doneTime = new Date().toISOString();
        if (res.duplicate) {
          duplicateCount += 1;
          persistQueue(
            loadFieldQueue().map(i =>
              i.client_uuid === uuid
                ? {
                    ...i,
                    sync_state: 'DUPLICATE' as const,
                    synced_at: doneTime,
                    field_update_id: res.field_update_id,
                    conflict_code: undefined,
                    conflict_reason: undefined,
                    last_network_error: undefined,
                  }
                : i
            )
          );
        } else {
          syncedCount += 1;
          persistQueue(
            loadFieldQueue().map(i =>
              i.client_uuid === uuid
                ? {
                    ...i,
                    sync_state: 'SYNCED' as const,
                    synced_at: doneTime,
                    field_update_id: res.field_update_id,
                    server_request_status: res.request_status,
                    conflict_code: undefined,
                    conflict_reason: undefined,
                    last_network_error: undefined,
                  }
                : i
            )
          );
        }
      } catch (err) {
        const status = typeof (err as { status?: unknown })?.status === 'number'
          ? ((err as { status: number }).status)
          : undefined;
        const message = err instanceof Error ? err.message : 'Sync request failed';

        if (status === 409 || status === 403 || status === 404 || status === 400) {
          conflictCount += 1;
          persistQueue(
            loadFieldQueue().map(i =>
              i.client_uuid === uuid
                ? {
                    ...i,
                    sync_state: 'CONFLICT' as const,
                    conflict_code: status,
                    conflict_reason: message,
                    last_network_error: undefined,
                  }
                : i
            )
          );
        } else {
          // Transient network error, offline drop, 401 session refresh, or 5xx -> keep PENDING for auto-reconnect
          persistQueue(
            loadFieldQueue().map(i =>
              i.client_uuid === uuid
                ? {
                    ...i,
                    sync_state: 'PENDING' as const,
                    last_network_error: message,
                  }
                : i
            )
          );
        }
      }
    }

    const remainingPending = loadFieldQueue().filter(
      i => (!i.actor_email || i.actor_email === actor) && i.sync_state === 'PENDING'
    ).length;

    return {
      attempted,
      syncedCount,
      duplicateCount,
      conflictCount,
      remainingPending,
      skippedOffline: false,
    };
  })();

  try {
    return await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
}

export function dismissFieldQueueConflict(clientUuid: string): void {
  const next = loadFieldQueue().filter(item => item.client_uuid !== clientUuid);
  persistQueue(next);
}

/**
 * Re-queue a conflicted item with an updated FieldSyncTaskStatus / notes and a fresh client_uuid.
 */
export function resolveConflictWithUpdatedOutcome(
  clientUuid: string,
  nextStatus: FieldSyncTaskStatus,
  nextNotes?: string
): OfflineFieldQueueItem | null {
  const queue = loadFieldQueue();
  const target = queue.find(i => i.client_uuid === clientUuid);
  if (!target) return null;

  const updatedItem: OfflineFieldQueueItem = {
    ...target,
    client_uuid: generateClientUuid(),
    task_status: nextStatus,
    notes: typeof nextNotes === 'string' ? nextNotes.trim() : target.notes,
    sync_state: 'PENDING',
    conflict_code: undefined,
    conflict_reason: undefined,
    last_network_error: undefined,
  };
  const next = queue.map(i => (i.client_uuid === clientUuid ? updatedItem : i));
  persistQueue(next);
  return updatedItem;
}

/**
 * Re-queue an already-synced item keeping the EXACT same `client_uuid` so engineers/auditors
 * can verify server-side UUID idempotency (`duplicate: true, synced: false`).
 */
export function requeueSameUuidForIdempotencyCheck(clientUuid: string): OfflineFieldQueueItem | null {
  const queue = loadFieldQueue();
  const target = queue.find(i => i.client_uuid === clientUuid);
  if (!target) return null;

  const updatedItem: OfflineFieldQueueItem = {
    ...target,
    sync_state: 'PENDING',
    conflict_code: undefined,
    conflict_reason: undefined,
    last_network_error: undefined,
  };
  const next = queue.map(i => (i.client_uuid === clientUuid ? updatedItem : i));
  persistQueue(next);
  return updatedItem;
}

export function clearOfflineFieldQueue(): void {
  memoryQueue = [];
  const storage = getStorage();
  if (storage) {
    storage.removeItem(OFFLINE_FIELD_QUEUE_KEY);
    storage.removeItem(OFFLINE_MANUAL_OVERRIDE_KEY);
  }
  if (typeof indexedDB !== 'undefined') {
    try {
      const openReq = indexedDB.open(IDB_NAME, 1);
      openReq.onsuccess = () => {
        try {
          const db = openReq.result;
          if (db.objectStoreNames.contains(IDB_STORE)) {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).clear();
            tx.oncomplete = () => db.close();
          } else {
            db.close();
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
  }
  notifyQueueListeners();
}
