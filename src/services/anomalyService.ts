import {
  type Anomaly,
  type AnomalyStatus,
  type StructuredAnomalyCase,
  type ConsumerBillingReviewRequest,
  type ConsumerBillingReviewCategory,
  type ConsumerBillingReviewStatus,
  type FinancialAdjustmentProposal,
  type MeterThresholds,
  toCanonicalAnomalyStatus,
  mapStructuredCaseToAnomaly
} from '../types/meterReading';
import type { MeterReadingRequestOptions } from './meterReadingService';

export interface UpdateAnomalyStatusInput {
  anomalyId: string;
  status: AnomalyStatus;
  note: string;
  adjustedUnits?: number;
  adjustedAmount?: number;
  clientUuid?: string;
}

export interface CreateBillingReviewContractInput {
  billNo: string;
  category: ConsumerBillingReviewCategory;
  description: string;
  preferredReading?: number;
  evidencePhotoDataUrl?: string;
  clientUuid: string;
}

export interface TransitionBillingReviewContractInput {
  reviewId: string;
  status: ConsumerBillingReviewStatus;
  note: string;
  clientUuid?: string;
}

export interface ProposeFinancialAdjustmentContractInput {
  anomalyCaseId?: string;
  anomalyId?: string;
  billingReviewId?: string;
  billNo: string;
  proposedAdjustedUnits?: number;
  proposedAdjustmentAmount?: number;
  adjustmentType:
    | 'CREDIT_MEMO'
    | 'DEBIT_MEMO'
    | 'REBILL_PROPOSAL'
    | 'CREDIT_CONCESSION'
    | 'SLAB_CORRECTION'
    | 'METER_ERROR_REBATE'
    | 'SUPPLEMENTARY_CHARGE';
  reason: string;
  clientUuid?: string;
}

export interface ReviewFinancialAdjustmentContractInput {
  adjustmentId: string;
  action: 'APPROVE' | 'REJECT';
  note: string;
  clientUuid?: string;
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

/**
 * Fetches structured anomaly cases from the authoritative backend and returns both
 * normalized `Anomaly[]` items and canonical `StructuredAnomalyCase[]` records.
 */
export async function fetchAnomalies(
  connectionNo?: string,
  options?: MeterReadingRequestOptions
): Promise<{ anomalies: Anomaly[]; cases: StructuredAnomalyCase[] }> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const query = connectionNo ? `?connectionNo=${encodeURIComponent(connectionNo)}` : '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/cases${query}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, false)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch anomaly cases.');
  }
  const cases = (payload.cases || []) as StructuredAnomalyCase[];
  const anomalies = cases.map(mapStructuredCaseToAnomaly);
  return { anomalies, cases };
}

/**
 * Updates the status of an anomaly case (`Detected`, `Pending review`, `Under investigation`,
 * `Approved`, `Rejected`, `Corrected`, `Closed` or canonical uppercase codes) and appends an
 * immutable status history record.
 */
export async function updateAnomalyStatus(
  input: UpdateAnomalyStatusInput,
  options?: MeterReadingRequestOptions
): Promise<{ anomaly: Anomaly; anomalyCase: StructuredAnomalyCase }> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const canonicalStatus = toCanonicalAnomalyStatus(input.status);

  const res = await fetcher(
    `${baseUrl}/api/meter-readings/cases/${encodeURIComponent(input.anomalyId)}/status`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, true),
      body: JSON.stringify({
        status: canonicalStatus,
        note: input.note,
        adjustedUnits: input.adjustedUnits,
        adjustedAmount: input.adjustedAmount,
        clientUuid: input.clientUuid
      })
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to update anomaly status.');
  }
  const anomalyCase = payload.anomalyCase as StructuredAnomalyCase;
  return {
    anomaly: mapStructuredCaseToAnomaly(anomalyCase),
    anomalyCase
  };
}

/**
 * Fetches consumer billing review requests scoped to the authenticated user.
 */
export async function fetchBillingReviews(
  connectionNo?: string,
  options?: MeterReadingRequestOptions
): Promise<ConsumerBillingReviewRequest[]> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const query = connectionNo ? `?connectionNo=${encodeURIComponent(connectionNo)}` : '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/billing-reviews${query}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, false)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch billing reviews.');
  }
  return (payload.reviews || []) as ConsumerBillingReviewRequest[];
}

/**
 * Submits a consumer billing review request with actor-scoped idempotency (`clientUuid`).
 */
export async function createBillingReview(
  input: CreateBillingReviewContractInput,
  options?: MeterReadingRequestOptions
): Promise<ConsumerBillingReviewRequest> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/billing-reviews`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, true),
    body: JSON.stringify(input)
  });

  const payload = await res.json();
  if (!res.ok) {
    const err = new Error(payload.error || 'Failed to create billing review.') as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = payload.code;
    throw err;
  }
  return payload.review as ConsumerBillingReviewRequest;
}

/**
 * Transitions a consumer billing review request status (`UNDER_INVESTIGATION`, `APPROVED`, `REJECTED`, `ADJUSTED`, `CLOSED`).
 */
export async function transitionBillingReview(
  input: TransitionBillingReviewContractInput,
  options?: MeterReadingRequestOptions
): Promise<ConsumerBillingReviewRequest> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(
    `${baseUrl}/api/meter-readings/billing-reviews/${encodeURIComponent(input.reviewId)}/status`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, true),
      body: JSON.stringify({
        status: input.status,
        note: input.note,
        clientUuid: input.clientUuid
      })
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to transition billing review.');
  }
  return payload.review as ConsumerBillingReviewRequest;
}

/**
 * Fetches financial adjustment proposals for Employee/Admin workflows.
 */
export async function fetchFinancialAdjustments(
  options?: MeterReadingRequestOptions
): Promise<FinancialAdjustmentProposal[]> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/adjustments`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, false)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch financial adjustments.');
  }
  return (payload.adjustments || []) as FinancialAdjustmentProposal[];
}

/**
 * Proposes a financial adjustment calculated via the canonical Phase 9 tariff engine without overwriting historical bills.
 */
export async function proposeFinancialAdjustment(
  input: ProposeFinancialAdjustmentContractInput,
  options?: MeterReadingRequestOptions
): Promise<FinancialAdjustmentProposal> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/adjustments`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, true),
    body: JSON.stringify(input)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to propose financial adjustment.');
  }
  return payload.adjustment as FinancialAdjustmentProposal;
}

/**
 * Approves or rejects a financial adjustment proposal (enforcing separation of duties).
 */
export async function reviewFinancialAdjustment(
  input: ReviewFinancialAdjustmentContractInput,
  options?: MeterReadingRequestOptions
): Promise<FinancialAdjustmentProposal> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(
    `${baseUrl}/api/meter-readings/adjustments/${encodeURIComponent(input.adjustmentId)}/review`,
    {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: buildHeaders(options?.headers, true),
      body: JSON.stringify({
        action: input.action,
        note: input.note,
        clientUuid: input.clientUuid
      })
    }
  );

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to review financial adjustment.');
  }
  return payload.adjustment as FinancialAdjustmentProposal;
}

/**
 * Fetches current versioned anomaly detection thresholds and policy change history.
 */
export async function fetchMeterThresholds(
  options?: MeterReadingRequestOptions
): Promise<
  MeterThresholds & {
    history?: Array<{
      version: number;
      changedAt: string;
      changedBy: string;
      reason: string;
      thresholds: MeterThresholds;
    }>;
  }
> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/thresholds`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, false)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to fetch meter thresholds.');
  }
  return payload.thresholds;
}

/**
 * Updates anomaly detection thresholds and appends a new threshold policy version.
 */
export async function updateMeterThresholds(
  input: Partial<
    Pick<MeterThresholds, 'minimumHistory' | 'highDailyRatio' | 'lowDailyRatio' | 'highDailyUnits'>
  > & { reason: string },
  options?: MeterReadingRequestOptions
): Promise<MeterThresholds> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/thresholds`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, true),
    body: JSON.stringify(input)
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to update meter thresholds.');
  }
  return payload.thresholds as MeterThresholds;
}

/**
 * Applies an approved financial adjustment to the billing ledger (APPLIED_TO_LEDGER).
 */
export async function applyFinancialAdjustment(
  adjustmentId: string,
  note?: string,
  options?: MeterReadingRequestOptions
): Promise<FinancialAdjustmentProposal> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/adjustments/${encodeURIComponent(adjustmentId)}/apply`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, true),
    body: JSON.stringify({ note })
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to apply financial adjustment to ledger.');
  }
  return payload.adjustment as FinancialAdjustmentProposal;
}

/**
 * Issues an idempotent Phase 9 electricity bill from a verified approved meter reading.
 */
export async function issueBillFromReading(
  readingId: string,
  options?: MeterReadingRequestOptions
): Promise<{ created: boolean; bill: unknown; message: string }> {
  const fetcher = options?.fetchImpl ?? fetch;
  const baseUrl = options?.baseUrl ?? '';
  const res = await fetcher(`${baseUrl}/api/meter-readings/issue-bill`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: buildHeaders(options?.headers, true),
    body: JSON.stringify({ readingId })
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to issue bill from reading.');
  }
  return payload;
}

