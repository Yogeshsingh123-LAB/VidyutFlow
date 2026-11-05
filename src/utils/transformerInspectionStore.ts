/**
 * Offline Inspection & Photo Storage Engine for Phase 12 DTR Inspections.
 *
 * Persists high-resolution inspection photos as raw Blobs in IndexedDB
 * (keeping localStorage clean and lightweight).
 * Sync queue operations are fully idempotent via client_uuid.
 */

export const IDB_NAME = 'vidyutflow_offline_db';
export const INSPECTION_PHOTOS_STORE = 'transformer_inspection_photos';
export const INSPECTION_QUEUE_STORE = 'transformer_inspections_queue';
export const QUEUE_STORAGE_KEY = 'vidyutflow_transformer_offline_queue';

export interface OfflineInspectionRecord {
  client_uuid: string;
  transformer_id: string;
  work_order_id?: string;
  checklist: Record<string, string | boolean | number>;
  observations?: string;
  photo_refs?: string[];
  photoBlobs?: Blob[];
  gps_accuracy?: number;
  latitude?: number;
  longitude?: number;
  signature?: string;
  review_status: 'VERIFIED' | 'PENDING' | 'FLAGGED';
  queued_at: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

// In-memory fallback caches for node test environments without native indexedDB
const memoryPhotoStore = new Map<string, Blob>();
const memoryQueue: OfflineInspectionRecord[] = [];

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

export async function openInspectionDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return null;

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 4);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(INSPECTION_PHOTOS_STORE)) {
          db.createObjectStore(INSPECTION_PHOTOS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(INSPECTION_QUEUE_STORE)) {
          db.createObjectStore(INSPECTION_QUEUE_STORE, { keyPath: 'client_uuid' });
        }
        if (!db.objectStoreNames.contains('field_evidence_photos')) {
          db.createObjectStore('field_evidence_photos', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Store inspection photo Blob in IndexedDB (or in-memory fallback) */
export async function storeInspectionPhoto(photoId: string, blob: Blob): Promise<string> {
  memoryPhotoStore.set(photoId, blob);

  const db = await openInspectionDb();
  if (db && db.objectStoreNames.contains(INSPECTION_PHOTOS_STORE)) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction([INSPECTION_PHOTOS_STORE], 'readwrite');
        tx.objectStore(INSPECTION_PHOTOS_STORE).put({ id: photoId, blob, storedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  return photoId;
}

/** Retrieve photo Blob by ID */
export async function getInspectionPhoto(photoId: string): Promise<Blob | null> {
  if (memoryPhotoStore.has(photoId)) {
    return memoryPhotoStore.get(photoId) || null;
  }

  const db = await openInspectionDb();
  if (!db || !db.objectStoreNames.contains(INSPECTION_PHOTOS_STORE)) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([INSPECTION_PHOTOS_STORE], 'readonly');
      const req = tx.objectStore(INSPECTION_PHOTOS_STORE).get(photoId);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Enqueue an offline inspection record with client_uuid idempotency */
export async function enqueueOfflineInspection(record: OfflineInspectionRecord): Promise<void> {
  const existingIdx = memoryQueue.findIndex((i) => i.client_uuid === record.client_uuid);
  if (existingIdx >= 0) {
    memoryQueue[existingIdx] = record;
  } else {
    memoryQueue.push(record);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const metaQueue = memoryQueue.map(({ photoBlobs, ...meta }) => meta);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(metaQueue));
    } catch {
      // Quota exceeded safe fallback
    }
  }

  const db = await openInspectionDb();
  if (db && db.objectStoreNames.contains(INSPECTION_QUEUE_STORE)) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction([INSPECTION_QUEUE_STORE], 'readwrite');
        tx.objectStore(INSPECTION_QUEUE_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

/** Get all queued offline inspections pending sync */
export async function getOfflineInspections(): Promise<OfflineInspectionRecord[]> {
  const db = await openInspectionDb();
  if (db && db.objectStoreNames.contains(INSPECTION_QUEUE_STORE)) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([INSPECTION_QUEUE_STORE], 'readonly');
        const req = tx.objectStore(INSPECTION_QUEUE_STORE).getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as OfflineInspectionRecord[];
          if (list.length > 0) return resolve(list);
          resolve([...memoryQueue]);
        };
        req.onerror = () => resolve([...memoryQueue]);
      } catch {
        resolve([...memoryQueue]);
      }
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback to memoryQueue
    }
  }

  return [...memoryQueue];
}

/** Remove synced inspection from queue */
export async function removeOfflineInspection(client_uuid: string): Promise<void> {
  const idx = memoryQueue.findIndex((i) => i.client_uuid === client_uuid);
  if (idx >= 0) memoryQueue.splice(idx, 1);

  if (typeof localStorage !== 'undefined') {
    try {
      const metaQueue = memoryQueue.map(({ photoBlobs, ...meta }) => meta);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(metaQueue));
    } catch {
      // Safe ignore
    }
  }

  const db = await openInspectionDb();
  if (db && db.objectStoreNames.contains(INSPECTION_QUEUE_STORE)) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction([INSPECTION_QUEUE_STORE], 'readwrite');
        tx.objectStore(INSPECTION_QUEUE_STORE).delete(client_uuid);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

/** Sync pending offline inspections to FastAPI backend with client_uuid idempotency */
export async function syncOfflineInspections(
  postFn?: (endpoint: string, payload: unknown) => Promise<{ status: number; data?: unknown }>
): Promise<{ synced: number; failed: number }> {
  const queue = await getOfflineInspections();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.status === 'SYNCED') continue;

    try {
      const payload = {
        client_uuid: item.client_uuid,
        work_order_id: item.work_order_id || null,
        checklist: item.checklist,
        observations: item.observations || null,
        photo_refs: item.photo_refs || [],
        gps_accuracy: item.gps_accuracy || null,
        signature: item.signature || null,
        review_status: item.review_status,
      };

      if (postFn) {
        const res = await postFn(`/api/v1/transformers/${item.transformer_id}/inspections`, payload);
        if (res.status === 200 || res.status === 201) {
          await removeOfflineInspection(item.client_uuid);
          synced += 1;
        } else {
          item.status = 'FAILED';
          failed += 1;
        }
      } else {
        const res = await fetch(`/api/v1/transformers/${item.transformer_id}/inspections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          await removeOfflineInspection(item.client_uuid);
          synced += 1;
        } else {
          item.status = 'FAILED';
          failed += 1;
        }
      }
    } catch {
      item.status = 'FAILED';
      failed += 1;
    }
  }

  return { synced, failed };
}

