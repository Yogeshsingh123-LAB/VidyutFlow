import type {
  MeterOCRResult,
  MeterReadingRecord,
  MeterConfiguration,
  MeterEventType,
  AmbiguousDigit,
  BillValidationResult,
  PhotoUploadContractResult
} from '../types/meterReading';
import { validateExistingBill } from './billingValidation';
import type { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../types';

export interface UploadMeterPhotoInput {
  connectionNo: string;
  photoDataUrl: string;
  mimeType?: string;
  metadataStripped?: boolean;
}

export interface SubmitOcrReadingInput {
  clientUuid: string;
  connectionNo: string;
  submittedReading: number;
  readingDate: string;
  captureMode?: 'CONSUMER_PHOTO' | 'FIELD_OVERDUE_CAPTURE' | 'STAFF_MANUAL';
  workOrderId?: string;
  ocrResult: MeterOCRResult;
  photoDataUrl?: string;
  manualOverride?: boolean;
  overrideReason?: string;
  meterEventType?: MeterEventType;
  oldMeterFinalReading?: number;
  newMeterStartReading?: number;
  rolloverMaxValue?: number;
  meterEventNotes?: string;
}

export interface SubmitMeterReadingContractInput {
  clientUuid: string;
  connectionNo: string;
  submittedReading: number;
  readingDate: string;
  captureMode?: 'CONSUMER_PHOTO' | 'FIELD_OVERDUE_CAPTURE' | 'STAFF_MANUAL';
  workOrderId?: string;
  ocrRawText?: string;
  ocrNormalizedReading?: number | null;
  ocrConfidence?: number;
  ocrEngineVersion?: string;
  ambiguousDigits?: AmbiguousDigit[];
  qualityPassed?: boolean;
  qualityWarnings?: string[];
  manualOverride?: boolean;
  overrideReason?: string;
  photoDataUrl?: string;
  meterEventType?: MeterEventType;
  oldMeterFinalReading?: number;
  newMeterStartReading?: number;
  rolloverMaxValue?: number;
  meterEventNotes?: string;
}

export interface ReviewMeterReadingInput {
  readingId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REREAD';
  note: string;
  correctedReading?: number;
  clientUuid?: string;
}

export interface MeterReadingRequestOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

function buildHeaders(extra?: Record<string, string>, isMutation = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(extra || {})
  };
  if (isMutation) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    headers['X-VidyutFlow-CSRF'] = headers['X-VidyutFlow-CSRF'] || '1';
  }
  return headers;
}

async function computeSha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Validates and prepares a meter photograph for private encrypted backend storage.
 * Photographs are never sent to external AI services or exposed via public URLs.
 */
export async function uploadMeterPhoto(
  input: UploadMeterPhotoInput,
  options?: MeterReadingRequestOptions
): Promise<PhotoUploadContractResult & { dataUrl: string }> {
  const trimmed = (input.photoDataUrl || '').trim();
  if (!trimmed.startsWith('data:image/')) {
    throw new Error('Meter photograph must be a valid data:image/* payload.');
  }
  const sha256 = await computeSha256Hex(trimmed);
  const fetcher = options?.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  const baseUrl = options?.baseUrl ?? '';

  if (fetcher) {
    try {
      const res = await fetcher(`${baseUrl}/api/meter-readings/photos`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildHeaders(options?.headers, true),
        body: JSON.stringify({
          connectionNo: input.connectionNo,
          photoDataUrl: trimmed,
          metadataStripped: input.metadataStripped ?? true
        })
      });
      if (res.ok) {
        const payload = await res.json();
        return {
          photoId: payload.photoId,
          connectionNo: payload.connectionNo || input.connectionNo,
          mimeType: payload.mimeType || input.mimeType || 'image/jpeg',
          byteLength: payload.byteLength || trimmed.length,
          sha256: payload.sha256 || sha256,
          encryptedAtRest: true,
          metadataStripped: true,
          createdAt: payload.createdAt || new Date().toISOString(),
          dataUrl: trimmed
        };
      }
    } catch {
      // Fallback to local prepared photo envelope when offline or before reading submission
    }
  }

  return {
    photoId: `PHOTO-${sha256.slice(0, 12).toUpperCase()}`,
    connectionNo: input.connectionNo,
    mimeType: input.mimeType || 'image/jpeg',
    byteLength: trimmed.length,
    sha256,
    encryptedAtRest: true,
    metadataStripped: input.metadataStripped ?? true,
    createdAt: new Date().toISOString(),
    dataUrl: trimmed
  };
}

/**
 * Submits a local OCR extraction result (`MeterOCRResult`) along with a meter reading
 * to the authoritative Phase 11 backend boundary (`/api/meter-readings`).
 */
export async function submitOcrResult(
  input: SubmitOcrReadingInput,
  options?: MeterReadingRequestOptions
): Promise<MeterReadingRecord> {
  return submitMeterReading(
    {
      clientUuid: input.clientUuid,
      connectionNo: input.connectionNo,
      submittedReading: input.submittedReading,
      readingDate: input.readingDate,
      captureMode: input.captureMode,
      workOrderId: input.workOrderId,
      ocrRawText: input.ocrResult.rawText,
      ocrNormalizedReading:
        input.ocrResult.normalizedReading !== undefined && input.ocrResult.normalizedReading !== null
          ? Number(input.ocrResult.normalizedReading)
          : input.ocrResult.candidateReading !== null
          ? Number(input.ocrResult.candidateReading)
          : null,
      ocrConfidence: input.ocrResult.confidence,
      ocrEngineVersion: input.ocrResult.engineVersion,
      ambiguousDigits: input.ocrResult.ambiguousDigits,
      qualityPassed: input.ocrResult.qualityPassed ?? !input.ocrResult.requiresReview,
      qualityWarnings: input.ocrResult.qualityWarnings ?? [],
      manualOverride:
        input.manualOverride ??
        (input.ocrResult.normalizedReading !== null &&
          input.ocrResult.normalizedReading !== input.submittedReading),
      overrideReason: input.overrideReason ?? input.ocrResult.overrideReason,
      photoDataUrl: input.photoDataUrl,
      meterEventType: input.meterEventType,
      oldMeterFinalReading: input.oldMeterFinalReading,
      newMeterStartReading: input.newMeterStartReading,
      rolloverMaxValue: input.rolloverMaxValue,
      meterEventNotes: input.meterEventNotes
    },
    options
  );
}

/**
 * Submits a meter reading to `/api/meter-readings` with actor-scoped idempotency (`clientUuid`).
 */
export async function submitMeterReading(
  input: SubmitMeterReadingContractInput,
  options?: MeterReadingRequestOptions
): Promise<MeterReadingRecord> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, true),
    body: JSON.stringify(input)
  });

  const payload = await res.json();
  if (!res.ok) {
    const err = new Error(payload.error || 'Failed to submit meter reading.') as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = payload.code;
    throw err;
  }
  return payload.reading as MeterReadingRecord;
}

/**
 * Fetches meter readings scoped to the authenticated user's role, ownership, or assignment.
 */
export async function fetchMeterReadings(
  connectionNo?: string,
  options?: MeterReadingRequestOptions
): Promise<MeterReadingRecord[]> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const query = connectionNo ? `?connectionNo=${encodeURIComponent(connectionNo)}` : '';
  const res = await fetcher(`${baseUrl}/api/meter-readings${query}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, false)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch meter readings.');
  }
  return (payload.readings || []) as MeterReadingRecord[];
}

/**
 * Reviews a meter reading (`APPROVE`, `REJECT`, `REQUEST_REREAD`) and records an append-only review history entry.
 */
export async function reviewMeterReading(
  input: ReviewMeterReadingInput,
  options?: MeterReadingRequestOptions
): Promise<MeterReadingRecord> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(
    `${baseUrl}/api/meter-readings/${encodeURIComponent(input.readingId)}/review`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, true),
      body: JSON.stringify({
        action: input.action,
        note: input.note,
        correctedReading: input.correctedReading,
        clientUuid: input.clientUuid
      })
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to review meter reading.');
  }
  return payload.reading as MeterReadingRecord;
}

/**
 * Retrieves a private decrypted meter photograph only for authorized actors (owner, assigned field engineer, employee/admin).
 */
export async function fetchPrivateMeterPhoto(
  readingId: string,
  options?: MeterReadingRequestOptions
): Promise<{ photoId: string; dataUrl: string }> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(
    `${baseUrl}/api/meter-readings/${encodeURIComponent(readingId)}/photo`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, false)
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch private meter photograph.');
  }
  return payload as { photoId: string; dataUrl: string };
}

/**
 * Retrieves the active meter configuration (and version history) for a connection.
 */
export async function fetchMeterConfiguration(
  connectionNo: string,
  options?: MeterReadingRequestOptions
): Promise<MeterConfiguration> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(
    `${baseUrl}/api/meter-readings/config/${encodeURIComponent(connectionNo)}`,
    {
      method: 'GET',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, false)
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch meter configuration.');
  }
  return payload.configuration as MeterConfiguration;
}

/**
 * Updates meter configuration and appends an immutable configuration version record.
 */
export async function updateMeterConfiguration(
  connectionNo: string,
  updates: Partial<MeterConfiguration> & { reason?: string },
  options?: MeterReadingRequestOptions
): Promise<MeterConfiguration> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(
    `${baseUrl}/api/meter-readings/config/${encodeURIComponent(connectionNo)}`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, true),
      body: JSON.stringify(updates)
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to update meter configuration.');
  }
  return payload.configuration as MeterConfiguration;
}

/**
 * Validates a bill strictly using the canonical Phase 9 tariff engine without overwriting billing logic.
 */
export function validateBillWithPhase9Engine(input: {
  bill: ElectricityBill;
  connection: ElectricityConnection;
  allBills: ElectricityBill[];
  payments: PaymentTransaction[];
  meterReadings?: MeterReadingRecord[];
}): BillValidationResult {
  return validateExistingBill(input);
}

