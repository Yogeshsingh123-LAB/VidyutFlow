import type {
  FieldEvidenceItem,
  EvidenceType,
  EvidenceVerificationStatus,
  WorkOrderCompletionReport
} from '../types';
import { generateClientUuid } from '../utils/offlineFieldSync';
export { generateClientUuid };

export const MAX_EVIDENCE_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MiB
export const ACCEPTED_EVIDENCE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const IDB_NAME = 'vidyutflow_offline_db';
const EVIDENCE_STORE_NAME = 'field_evidence_photos';

// In-memory thumbnail cache to avoid re-reading IndexedDB for rapid rendering
const thumbnailMemoryCache = new Map<string, string>();
const inFlightSubmissions = new Set<string>();

/** Validate photo MIME type and size */
export function validateEvidencePhoto(file: File): string | null {
  if (!ACCEPTED_EVIDENCE_PHOTO_TYPES.has(file.type)) {
    return 'Choose a JPEG, PNG, or WebP photo.';
  }
  if (file.size <= 0 || file.size > MAX_EVIDENCE_PHOTO_BYTES) {
    return 'Photo must be between 1 byte and 5 MiB.';
  }
  return null;
}

/**
 * Re-encodes photo through HTML Canvas to strip EXIF/location metadata
 * and applies any requested rotation before saving or uploading.
 */
export async function prepareEvidencePhoto(file: File, rotationDegrees = 0): Promise<Blob> {
  const image = await createImageBitmap(file);
  const rotated = Math.abs(rotationDegrees % 180) === 90;
  const canvas = document.createElement('canvas');
  canvas.width = rotated ? image.height : image.width;
  canvas.height = rotated ? image.width : image.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Photo processing is not supported by this browser.');
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotationDegrees * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  image.close();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', 0.88)
  );

  if (!blob) {
    throw new Error('The evidence photo could not be prepared.');
  }
  if (blob.size > MAX_EVIDENCE_PHOTO_BYTES) {
    throw new Error('Prepared photo exceeds the 5 MiB limit.');
  }
  return blob;
}

/** Convert a Blob to a data URL for preview rendering */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Evidence photo could not be read.'));
    reader.readAsDataURL(blob);
  });
}

function openEvidenceDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    // Open DB with version 3 to ensure field_evidence_photos store exists alongside existing stores
    const req = indexedDB.open(IDB_NAME, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('field_sync_queue')) {
        db.createObjectStore('field_sync_queue', { keyPath: 'client_uuid' });
      }
      if (!db.objectStoreNames.contains('meter_reading_photos')) {
        db.createObjectStore('meter_reading_photos', { keyPath: 'client_uuid' });
      }
      if (!db.objectStoreNames.contains(EVIDENCE_STORE_NAME)) {
        db.createObjectStore(EVIDENCE_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

/**
 * Persist an evidence photo Blob into IndexedDB.
 * Large images are NOT stored in localStorage.
 */
export async function storeEvidencePhoto(evidenceId: string, blob: Blob): Promise<void> {
  try {
    const dataUrl = await blobToDataUrl(blob);
    thumbnailMemoryCache.set(evidenceId, dataUrl);
  } catch {
    // Non-fatal if data URL conversion fails for memory cache
  }

  const db = await openEvidenceDb();
  if (!db) return;

  return new Promise(resolve => {
    try {
      if (!db.objectStoreNames.contains(EVIDENCE_STORE_NAME)) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(EVIDENCE_STORE_NAME, 'readwrite');
      tx.objectStore(EVIDENCE_STORE_NAME).put({ id: evidenceId, photo: blob });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/** Retrieve an evidence photo Blob from IndexedDB */
export async function getEvidencePhoto(evidenceId: string): Promise<Blob | undefined> {
  const db = await openEvidenceDb();
  if (!db) return undefined;

  return new Promise(resolve => {
    try {
      if (!db.objectStoreNames.contains(EVIDENCE_STORE_NAME)) {
        db.close();
        resolve(undefined);
        return;
      }
      const tx = db.transaction(EVIDENCE_STORE_NAME, 'readonly');
      const req = tx.objectStore(EVIDENCE_STORE_NAME).get(evidenceId);
      req.onsuccess = () => {
        db.close();
        resolve(req.result?.photo as Blob | undefined);
      };
      req.onerror = () => {
        db.close();
        resolve(undefined);
      };
    } catch {
      db.close();
      resolve(undefined);
    }
  });
}

/** Get a preview data URL for an evidence item (from memory cache or IndexedDB) */
export async function getEvidenceThumbnailUrl(evidenceId: string): Promise<string | undefined> {
  const cached = thumbnailMemoryCache.get(evidenceId);
  if (cached) return cached;

  const blob = await getEvidencePhoto(evidenceId);
  if (!blob) return undefined;

  try {
    const dataUrl = await blobToDataUrl(blob);
    thumbnailMemoryCache.set(evidenceId, dataUrl);
    return dataUrl;
  } catch {
    return undefined;
  }
}

/** Delete an evidence photo from IndexedDB */
export async function deleteEvidencePhoto(evidenceId: string): Promise<void> {
  thumbnailMemoryCache.delete(evidenceId);
  const db = await openEvidenceDb();
  if (!db) return;

  return new Promise(resolve => {
    try {
      if (!db.objectStoreNames.contains(EVIDENCE_STORE_NAME)) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(EVIDENCE_STORE_NAME, 'readwrite');
      tx.objectStore(EVIDENCE_STORE_NAME).delete(evidenceId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/** Return category-dependent checklist items */
export function getCategoryChecklistTemplate(categoryOrType: string): string[] {
  const text = (categoryOrType || '').toLowerCase();

  if (text.includes('meter')) {
    return [
      'Old meter serial, physical seal, and terminal block inspected',
      'New optical security seal correctly crimped and recorded',
      'Display reading digits verified with consumer on site',
      'Consumer installation tested and load connection energized'
    ];
  }

  if (text.includes('transformer') || text.includes('overload')) {
    return [
      'Transformer oil level and radiator fins verified clean',
      'HT / LT bushing connections checked and torqued to spec',
      'Neutral grounding pit resistance tested and recorded',
      'Phase currents balanced and peak load verified safe'
    ];
  }

  if (text.includes('sparking') || text.includes('hazardous') || text.includes('wire')) {
    return [
      'Site safety perimeter cordoned off and public hazard eliminated',
      'Faulty jumper / damaged conductor replaced or re-tensioned',
      'Ground clearance and tree branch clearance confirmed',
      'Visual thermal inspection clear before line re-energization'
    ];
  }

  if (text.includes('voltage') || text.includes('fluctuation')) {
    return [
      'Distribution transformer tap position confirmed optimal',
      'Phase-to-neutral voltages verified on consumer service mains',
      'Loose neutral terminal or joint rectified',
      'Post-repair voltages measured within statutory ±6% limits'
    ];
  }

  // Default: Outage / Feeder Patrol / Maintenance
  return [
    'Hazard isolated and de-energized clearance permit verified',
    'Conductor joints, jumpers, and insulator discs inspected',
    'Phase voltages verified balanced across all 3 phases',
    'Service connection restored and normal supply verified'
  ];
}

export const getChecklistForCategory = getCategoryChecklistTemplate;

/** Check if a submission is currently in flight to prevent double clicks */
export function isSubmissionInFlight(uuid: string): boolean {
  return inFlightSubmissions.has(uuid);
}

export function setSubmissionInFlight(uuid: string): void {
  inFlightSubmissions.add(uuid);
}

export function clearSubmissionInFlight(uuid: string): void {
  inFlightSubmissions.delete(uuid);
}

/** Factory to construct a new FieldEvidenceItem */
export function createFieldEvidenceItem(params: {
  workOrderId: string;
  type: EvidenceType;
  file: File;
  submittedByUser: string;
  relatedComplaintId?: string;
  relatedIncidentId?: string;
  caption?: string;
  capturedAt?: string;
}): { item: FieldEvidenceItem; rawFile: File } {
  const evidenceId = `EVD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const item: FieldEvidenceItem = {
    id: evidenceId,
    workOrderId: params.workOrderId,
    relatedComplaintId: params.relatedComplaintId,
    relatedIncidentId: params.relatedIncidentId,
    type: params.type,
    capturedAt: params.capturedAt || nowIso,
    submittedAt: nowIso,
    submittedByRole: 'field',
    submittedByUser: params.submittedByUser,
    storageRef: `idb://${EVIDENCE_STORE_NAME}/${evidenceId}`,
    mimeType: params.file.type || 'image/jpeg',
    fileSize: params.file.size,
    verificationStatus: 'pending',
    source: 'DEMO',
    caption: params.caption
  };

  return { item, rawFile: params.file };
}

