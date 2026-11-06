import type {
  TariffCategoryId,
  DetailedBillCalculation,
  BillingCycle
} from '../data/ugvclTariffSchedule';
import type {
  MeterReadingStatus,
  AnomalyReviewStatus,
  AnomalyStatusHistoryItem,
  StructuredAnomalyCase,
  BillingReviewCategory,
  ConsumerBillingReviewRequest,
  FinancialAdjustmentStatus,
  FinancialAdjustmentProposal,
  MeterAnomalyCategory,
  AmbiguousDigitNotice,
  MeterAnomaly,
  MeterReadingSubmission,
  BillFindingCategory,
  BillValidationFinding,
  BillLineComparisonItem,
  BillCheckResult,
  MeterThresholds,
  MeterConfiguration,
  MeterReadingRecord,
  AuditableMeterReplacementEvent
} from '../services/meterReading';

export type {
  TariffCategoryId,
  DetailedBillCalculation,
  BillingCycle,
  MeterReadingStatus,
  AnomalyReviewStatus,
  AnomalyStatusHistoryItem,
  StructuredAnomalyCase,
  BillingReviewCategory,
  ConsumerBillingReviewRequest,
  FinancialAdjustmentStatus,
  FinancialAdjustmentProposal,
  MeterAnomalyCategory,
  AmbiguousDigitNotice,
  MeterAnomaly,
  MeterReadingSubmission,
  BillFindingCategory,
  BillValidationFinding,
  BillLineComparisonItem,
  BillCheckResult,
  MeterThresholds,
  MeterConfiguration,
  MeterReadingRecord,
  AuditableMeterReplacementEvent
};

export type TariffCategoryCode = TariffCategoryId;
export type TariffEngineBreakdown = DetailedBillCalculation;
export type TariffCycleConfig = BillingCycle;
export type BillValidationIssue = BillValidationFinding;
export type BillValidationResult = BillCheckResult;
export type MeterEventType = 'ordinary' | 'rollover' | 'replacement';
export type AmbiguousDigit = AmbiguousDigitNotice;
export type AnomalyCategory = MeterAnomalyCategory;
export type AnomalySeverity = 'INFO' | 'REVIEW' | 'HIGH';
export type AnomalyFlag = MeterAnomaly;
export type AnomalyCaseStatus = AnomalyReviewStatus;
export type ConsumerBillingReviewStatus = AnomalyReviewStatus;
export type ConsumerBillingReviewCategory = BillingReviewCategory;

/**
 * Phase 11 — Local OCR Extraction Contract (`MeterOCRResult`).
 * Produced by deterministic client-side OCR / canvas inspection and stored as
 * an immutable OCR extraction record on the backend. Never sent to external AI APIs.
 */
export interface MeterOCRResult {
  meterId: string;
  rawText: string;
  candidateReading: string | number | null;
  normalizedReading: number | null | undefined;
  confidence?: number;
  requiresReview: boolean;
  engineVersion: string;
  extractedAt: string;
  engine?: 'tesseract.js';
  ambiguousDigits?: AmbiguousDigitNotice[];
  isCropped?: boolean;
  qualityPassed?: boolean;
  qualityWarnings?: string[];
  manualOverride?: boolean;
  overrideReason?: string;
}

/**
 * Human-readable and canonical backend anomaly lifecycle statuses.
 */
export type AnomalyDisplayStatus =
  | 'Detected'
  | 'Pending review'
  | 'Under investigation'
  | 'Approved'
  | 'Rejected'
  | 'Corrected'
  | 'Closed';

export type AnomalyCanonicalStatus =
  | 'DETECTED'
  | 'PENDING_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTED_THROUGH_ADJUSTMENT'
  | 'ADJUSTED'
  | 'CORRECTED'
  | 'CLOSED';

export type AnomalyStatus = AnomalyDisplayStatus | AnomalyCanonicalStatus;

export interface AnomalyEvidence {
  reasons: string[];
  thresholdVersion?: number;
  dailyAverageCurrent?: number;
  dailyAverageBaseline?: number;
  cycleDays?: number;
  photoId?: string;
  provisionalTariffBreakdown?: DetailedBillCalculation;
}

/**
 * Phase 11 — Unified Anomaly Contract (`Anomaly`).
 * Respects Phase 9 billing types without overwriting canonical billing logic.
 */
export interface Anomaly {
  anomalyId: string;
  relatedId: string; // readingId or billNo
  connectionNo?: string;
  consumerNo?: string;
  consumerName?: string;
  category: MeterAnomalyCategory;
  severity: AnomalySeverity;
  evidence: AnomalyEvidence | string[] | string;
  expectedValue: number | string | null;
  recordedValue: number | string | null;
  reviewAction: string | null;
  status: AnomalyStatus;
  thresholdVersion?: number;
  adjustedUnits?: number;
  adjustedAmount?: number;
  resolutionNote?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: AnomalyStatusHistoryItem[];
}

export interface MeterConfigurationVersionRecord {
  version: number;
  connectionId: string;
  meterNo: string;
  multiplier: number;
  decimalPlaces: number;
  rolloverAt?: number;
  source: 'DEMO_DEFAULT' | 'ADMIN_CONFIGURED';
  changedBy: string;
  changedAt: string;
}

export interface MeterReadingReviewHistoryEntry {
  id: string;
  readingId: string;
  action: 'APPROVE' | 'REJECT' | 'REREAD';
  fromStatus: MeterReadingStatus;
  toStatus: MeterReadingStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  note: string;
  timestamp: string;
}

export interface PhotoUploadContractResult {
  photoId: string;
  connectionNo: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  encryptedAtRest: boolean;
  metadataStripped: boolean;
  createdAt: string;
}

const DISPLAY_TO_CANONICAL_STATUS: Record<string, AnomalyCanonicalStatus> = {
  Detected: 'DETECTED',
  DETECTED: 'DETECTED',
  'Pending review': 'PENDING_REVIEW',
  PENDING_REVIEW: 'PENDING_REVIEW',
  'Under investigation': 'UNDER_INVESTIGATION',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  Approved: 'APPROVED',
  APPROVED: 'APPROVED',
  Rejected: 'REJECTED',
  REJECTED: 'REJECTED',
  Corrected: 'CORRECTED_THROUGH_ADJUSTMENT',
  CORRECTED: 'CORRECTED_THROUGH_ADJUSTMENT',
  CORRECTED_THROUGH_ADJUSTMENT: 'CORRECTED_THROUGH_ADJUSTMENT',
  ADJUSTED: 'CORRECTED_THROUGH_ADJUSTMENT',
  Closed: 'CLOSED',
  CLOSED: 'CLOSED'
};

const CANONICAL_TO_DISPLAY_STATUS: Record<AnomalyCanonicalStatus, AnomalyDisplayStatus> = {
  DETECTED: 'Detected',
  PENDING_REVIEW: 'Pending review',
  UNDER_INVESTIGATION: 'Under investigation',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CORRECTED_THROUGH_ADJUSTMENT: 'Corrected',
  ADJUSTED: 'Corrected',
  CORRECTED: 'Corrected',
  CLOSED: 'Closed'
};

export function toCanonicalAnomalyStatus(status: AnomalyStatus): AnomalyCanonicalStatus {
  return DISPLAY_TO_CANONICAL_STATUS[status] ?? 'PENDING_REVIEW';
}

export function toDisplayAnomalyStatus(status: AnomalyStatus): AnomalyDisplayStatus {
  const canonical = toCanonicalAnomalyStatus(status);
  return CANONICAL_TO_DISPLAY_STATUS[canonical] ?? 'Pending review';
}

export function mapStructuredCaseToAnomaly(item: StructuredAnomalyCase): Anomaly {
  return {
    anomalyId: item.id,
    relatedId: item.readingId || item.consumerNo || item.id,
    connectionNo: item.connectionId,
    consumerNo: item.consumerNo,
    category: item.category,
    severity: item.severity,
    evidence: {
      reasons: [item.explanation, ...(item.evidenceLinks || [])]
    },
    expectedValue: item.expectedValue ?? null,
    recordedValue: item.observedValue ?? null,
    reviewAction: item.resolution?.note ?? null,
    status: toDisplayAnomalyStatus(item.status),
    resolutionNote: item.resolution?.note,
    createdAt: item.detectedAt,
    updatedAt: item.resolution?.resolvedAt || item.detectedAt,
    history: item.statusHistory
  };
}
