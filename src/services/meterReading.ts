import type { TariffCategory } from '../types';

export type MeterReadingStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REREAD_REQUESTED';

export type AnomalyReviewStatus =
  | 'DETECTED'
  | 'PENDING_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTED_THROUGH_ADJUSTMENT'
  | 'CLOSED';

export const VALID_ANOMALY_STATUS_TRANSITIONS: Readonly<Record<AnomalyReviewStatus, readonly AnomalyReviewStatus[]>> = {
  DETECTED: ['PENDING_REVIEW', 'UNDER_INVESTIGATION', 'CLOSED'],
  PENDING_REVIEW: ['UNDER_INVESTIGATION', 'APPROVED', 'REJECTED', 'CORRECTED_THROUGH_ADJUSTMENT'],
  UNDER_INVESTIGATION: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTED_THROUGH_ADJUSTMENT', 'CLOSED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CORRECTED_THROUGH_ADJUSTMENT: ['CLOSED'],
  CLOSED: [] // Terminal status
};

export function canTransitionAnomalyStatus(current: AnomalyReviewStatus, next: AnomalyReviewStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_ANOMALY_STATUS_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

export function validateStatusTransition(
  current: AnomalyReviewStatus,
  next: AnomalyReviewStatus,
  note?: string
): void {
  if (current === next) return;
  if (!canTransitionAnomalyStatus(current, next)) {
    throw new MeterReadingError(
      `Cannot transition status from ${current} to ${next}. Valid transitions: ${(VALID_ANOMALY_STATUS_TRANSITIONS[current] || []).join(', ') || 'none (terminal)'}.`,
      'INVALID_STATUS_TRANSITION'
    );
  }
  const requiresNote: AnomalyReviewStatus[] = [
    'UNDER_INVESTIGATION',
    'REJECTED',
    'CORRECTED_THROUGH_ADJUSTMENT',
    'CLOSED'
  ];
  if (requiresNote.includes(next) && (!note || !note.trim())) {
    throw new MeterReadingError(
      `A meaningful audit note is required when transitioning to ${next}.`,
      'AUDIT_NOTE_REQUIRED'
    );
  }
}

export interface AnomalyStatusHistoryItem {
  id: string;
  fromStatus: AnomalyReviewStatus;
  toStatus: AnomalyReviewStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  action: string;
  reason: string;
  referenceId?: string;
}

export interface StructuredAnomalyCase {
  id: string;
  readingId?: string;
  consumerNo: string;
  connectionId: string;
  meterNo: string;
  category: MeterAnomalyCategory;
  severity: 'INFO' | 'REVIEW' | 'HIGH';
  detectedAt: string;
  observedValue?: string;
  expectedValue?: string;
  explanation: string;
  status: AnomalyReviewStatus;
  assignedReviewer?: string;
  assignedRole?: string;
  investigationNotes?: string[];
  evidenceLinks?: string[];
  statusHistory: AnomalyStatusHistoryItem[];
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolutionType: 'APPROVED' | 'REJECTED' | 'ADJUSTED' | 'CLOSED';
    note: string;
    adjustmentId?: string;
  };
  demo: true;
}

export type BillingReviewCategory =
  | 'CONSUMPTION_DISPUTE'
  | 'TARIFF_MISMATCH'
  | 'METER_FAULT_SUSPECTED'
  | 'PAYMENT_NOT_REFLECTED'
  | 'DUPLICATE_BILL'
  | 'OTHER';

export interface ConsumerBillingReviewRequest {
  id: string;
  consumerNo: string;
  connectionId: string;
  billNo: string;
  readingId?: string;
  category: BillingReviewCategory;
  description: string;
  evidencePhotoId?: string;
  status: AnomalyReviewStatus;
  submittedBy: string;
  submittedAt: string;
  clientUuid: string;
  assignedTo?: string;
  consumerVisibleNote?: string;
  internalStaffNotes?: string[];
  statusHistory: AnomalyStatusHistoryItem[];
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolutionType: 'APPROVED' | 'REJECTED' | 'ADJUSTED' | 'CLOSED';
    publicNote: string;
    internalNote?: string;
    adjustmentId?: string;
  };
  demo: true;
}

export type FinancialAdjustmentStatus =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED_TO_LEDGER'
  | 'CANCELLED';

export interface FinancialAdjustmentProposal {
  id: string;
  billNo: string;
  consumerNo: string;
  connectionId: string;
  readingId?: string;
  anomalyId?: string;
  reviewRequestId?: string;
  originalBilledAmount: number;
  originalUnits: number;
  revisedUnits?: number;
  proposedAdjustmentAmount: number;
  adjustmentType: 'CREDIT_CONCESSION' | 'SLAB_CORRECTION' | 'METER_ERROR_REBATE' | 'SUPPLEMENTARY_CHARGE';
  proposedRevisedAmount: number;
  calculationBasis: string;
  reason: string;
  supportingEvidence?: string[];
  proposedBy: string;
  proposedByRole: string;
  proposedAt: string;
  status: FinancialAdjustmentStatus;
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;
  approvalNote?: string;
  rejectionReason?: string;
  statusHistory: Array<{
    status: FinancialAdjustmentStatus;
    actor: string;
    role: string;
    timestamp: string;
    note: string;
  }>;
  demo: true;
}

export type MeterAnomalyCategory =
  | 'FIRST_READING'
  | 'IDENTITY_MISMATCH'
  | 'IDENTITY_UNREADABLE'
  | 'DECREASING_READING'
  | 'METER_ROLLOVER'
  | 'METER_REPLACEMENT'
  | 'DUPLICATE_READING'
  | 'DUPLICATE_SUBMISSION'
  | 'OUT_OF_ORDER'
  | 'HIGH_CONSUMPTION'
  | 'LOW_CONSUMPTION'
  | 'ZERO_CONSUMPTION'
  | 'BILL_DISCREPANCY'
  | 'BILL_CALCULATION_MISMATCH'
  | 'PAYMENT_LINKAGE_MISMATCH'
  | 'INCORRECT_READING_LINKAGE'
  | 'OCR_LOW_CONFIDENCE';

export interface AmbiguousDigitNotice {
  position: number;
  rawChar: string;
  proposedDigit: string;
  alternatives: string[];
  reason: string;
}

export interface MeterOCRResult {
  meterId: string;
  rawText: string;
  candidateReading: string;
  normalizedReading?: number;
  confidence?: number;
  requiresReview: boolean;
  engineVersion: string;
  extractedAt: string;
  engine: 'tesseract.js';
  ambiguousDigits?: AmbiguousDigitNotice[];
  isCropped?: boolean;
}

export interface MeterReadingRecord {
  id: string;
  clientUuid: string;
  consumerNo: string;
  connectionId: string;
  meterNo: string;
  displayedReading: string;
  readingKwh: number;
  multiplier: number;
  meterEvent?: 'ordinary' | 'rollover' | 'replacement';
  rolloverAt?: number;
  readingAt: string;
  previousReadingKwh?: number;
  consumedUnits?: number;
  intervalDays?: number;
  status: MeterReadingStatus;
  submittedBy: string;
  submittedRole: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  ocr?: MeterOCRResult;
  photoId?: string;
  anomalies: MeterAnomaly[];
  billCheck?: BillCheckResult;
  demo: true;
}

export interface MeterAnomaly {
  id: string;
  category: MeterAnomalyCategory;
  severity: 'INFO' | 'REVIEW' | 'HIGH';
  evidence: string;
  expectedValue?: string;
  recordedValue?: string;
  recommendedAction: string;
  detectedAt: string;
  status: 'OPEN' | 'CLOSED';
}

export interface MeterReadingSubmission {
  clientUuid: string;
  consumerNo: string;
  meterNo: string;
  displayedReading: string;
  readingKwh: number;
  multiplier: number;
  readingAt: string;
  decimalPlaces?: number;
  meterEvent?: 'ordinary' | 'rollover' | 'replacement';
  rolloverAt?: number;
  ocr?: MeterOCRResult;
  photoDataUrl?: string;
}

export type BillFindingCategory =
  | 'TARIFF_SLAB_MISMATCH'
  | 'FIXED_CHARGE_MISMATCH'
  | 'FPPPA_MISMATCH'
  | 'ELECTRICITY_DUTY_MISMATCH'
  | 'PAYMENT_LINKAGE_MISMATCH'
  | 'DUPLICATE_BILL'
  | 'INCORRECT_READING_LINKAGE'
  | 'INCONSISTENT_INPUTS';

export interface BillValidationFinding {
  findingId: string;
  category: BillFindingCategory;
  severity: 'INFO' | 'REVIEW' | 'HIGH';
  expectedValue?: string;
  actualValue: string;
  explanation: string;
  relatedBillNo: string;
  relatedReadingId?: string;
  suggestedAction: string;
}

export interface BillLineComparisonItem {
  lineItem: string;
  expected: number;
  recorded: number;
  difference: number;
  status: 'MATCH' | 'DISCREPANCY';
}

export interface BillCheckResult {
  status: 'CLEAR' | 'REVIEW';
  expectedAmount: number;
  recordedAmount: number;
  difference: number;
  evidence: string[];
  billNo?: string;
  findings?: BillValidationFinding[];
  comparison?: BillLineComparisonItem[];
}

export interface MeterThresholds {
  version: number;
  minimumHistory: number;
  highDailyRatio: number;
  lowDailyRatio: number;
  highDailyUnits: number;
}

export interface MeterConfiguration {
  connectionId: string;
  meterNo: string;
  multiplier: number;
  decimalPlaces: number;
  rolloverAt?: number;
  version: number;
  source: 'DEMO_DEFAULT' | 'ADMIN_CONFIGURED';
}

export const DEFAULT_METER_THRESHOLDS: MeterThresholds = {
  version: 1,
  minimumHistory: 2,
  highDailyRatio: 2.5,
  lowDailyRatio: 0.35,
  highDailyUnits: 80
};

export class MeterReadingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MeterReadingError';
  }
}

export function normalizeDisplayedReading(value: string, decimals = 0): number {
  const normalized = value.trim().replace(/,/g, '');
  const pattern = decimals > 0 ? new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`) : /^\d+$/;
  if (!pattern.test(normalized)) throw new MeterReadingError('Enter a valid meter reading.', 'INVALID_READING');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new MeterReadingError('Reading must be zero or greater.', 'INVALID_READING');
  return parsed;
}

export function calculateMeterConsumption(input: {
  current: number;
  previous?: number;
  multiplier: number;
  previousAt?: string;
  currentAt: string;
  rolloverAt?: number;
  replacement?: boolean;
}): { units: number; days: number; event: 'ordinary' | 'rollover' | 'replacement' } {
  if (!Number.isFinite(input.multiplier) || input.multiplier <= 0 || input.multiplier > 10000) {
    throw new MeterReadingError('Meter multiplier must be greater than zero.', 'INVALID_MULTIPLIER');
  }
  if (!Number.isFinite(input.current) || input.current < 0) throw new MeterReadingError('Reading must be zero or greater.', 'INVALID_READING');
  if (!input.previousAt || input.previous === undefined) {
    throw new MeterReadingError('No previous verified reading is available; review is required.', 'MISSING_PREVIOUS');
  }
  const currentTime = Date.parse(input.currentAt);
  const previousTime = Date.parse(input.previousAt);
  if (!Number.isFinite(currentTime) || !Number.isFinite(previousTime) || currentTime <= previousTime) {
    throw new MeterReadingError('Reading date must be after the previous verified reading.', 'OUT_OF_ORDER');
  }
  const calendarDay = (raw: string, timestamp: number) => {
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const legacy = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (legacy) {
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].findIndex(value => value.toLowerCase() === legacy[2].toLowerCase());
      if (month >= 0) return Date.UTC(Number(legacy[3]), month, Number(legacy[1]));
    }
    const date = new Date(timestamp);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };
  const currentDay = calendarDay(input.currentAt, currentTime);
  const previousDay = calendarDay(input.previousAt, previousTime);
  const days = Math.max(1, Math.round((currentDay - previousDay) / 86400000));
  if (input.replacement) return { units: input.current * input.multiplier, days, event: 'replacement' };
  if (input.current >= input.previous) return { units: (input.current - input.previous) * input.multiplier, days, event: 'ordinary' };
  if (input.rolloverAt && input.previous <= input.rolloverAt && input.current < input.rolloverAt) {
    return { units: (input.rolloverAt - input.previous + input.current) * input.multiplier, days, event: 'rollover' };
  }
  throw new MeterReadingError('Reading is below the previous value. Confirm a meter replacement or configured rollover.', 'DECREASING_READING');
}

function anomaly(category: MeterAnomalyCategory, severity: MeterAnomaly['severity'], evidence: string, recommendedAction: string, expectedValue?: string, recordedValue?: string): MeterAnomaly {
  return {
    id: `MAN-${crypto.randomUUID()}`, category, severity, evidence, expectedValue, recordedValue,
    recommendedAction, detectedAt: new Date().toISOString(), status: 'OPEN'
  };
}

export function detectConsumptionAnomalies(input: {
  units: number;
  days: number;
  verifiedHistory: Array<{ units: number; days: number }>;
  thresholds?: MeterThresholds;
  event?: 'ordinary' | 'rollover' | 'replacement';
}): MeterAnomaly[] {
  const rules = input.thresholds || DEFAULT_METER_THRESHOLDS;
  const results: MeterAnomaly[] = [];
  if (input.event === 'rollover') results.push(anomaly('METER_ROLLOVER', 'REVIEW', 'A configured meter rollover was proposed.', 'Verify the meter display and authorized meter rollover limit.'));
  if (input.event === 'replacement') results.push(anomaly('METER_REPLACEMENT', 'REVIEW', 'Consumption was calculated from a meter replacement event.', 'Confirm the replacement date and closing/opening readings.'));
  if (input.units === 0) results.push(anomaly('ZERO_CONSUMPTION', 'REVIEW', 'No units were recorded for this interval.', 'Check for a stopped meter or a valid zero-use period.', 'greater than 0', '0'));
  if (input.days <= 0) return results;
  const daily = input.units / input.days;
  if (daily > rules.highDailyUnits) results.push(anomaly('HIGH_CONSUMPTION', 'REVIEW', `Average use is ${daily.toFixed(1)} units/day, above the configured ${rules.highDailyUnits} units/day review threshold. This is a review signal, not a fraud finding.`, 'Compare the photo, interval, meter multiplier and previous verified periods.', `${rules.highDailyUnits} units/day`, `${daily.toFixed(1)} units/day`));
  const history = input.verifiedHistory.filter(x => x.days > 0 && x.units >= 0).slice(0, 12);
  if (history.length < rules.minimumHistory) return results;
  const baseline = history.reduce((sum, item) => sum + item.units / item.days, 0) / history.length;
  if (baseline <= 0) return results;
  const ratio = daily / baseline;
  if (ratio >= rules.highDailyRatio) results.push(anomaly('HIGH_CONSUMPTION', 'REVIEW', `Daily consumption is ${ratio.toFixed(1)}× the verified historical daily average (${daily.toFixed(1)} vs ${baseline.toFixed(1)} units/day).`, 'Review seasonal use, reading interval and meter evidence; do not infer fraud.', `${(baseline * rules.highDailyRatio).toFixed(1)} units/day`, `${daily.toFixed(1)} units/day`));
  else if (ratio <= rules.lowDailyRatio) results.push(anomaly('LOW_CONSUMPTION', 'REVIEW', `Daily consumption is ${ratio.toFixed(1)}× the verified historical daily average.`, 'Confirm occupancy, interval and meter operation.', `${(baseline * rules.lowDailyRatio).toFixed(1)} units/day`, `${daily.toFixed(1)} units/day`));
  return results;
}

export function detectIdentityMismatch(expectedMeter: string, photographedText: string): MeterAnomaly | null {
  const expected = expectedMeter.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const observedText = photographedText.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!expected || !observedText) return null;
  if (observedText.includes(expected)) return null;
  return anomaly('IDENTITY_MISMATCH', 'HIGH', 'The expected meter number was not found in the photo OCR text. Identity was not inferred.', 'Hold the reading and have an authorized reviewer compare the connection and photograph.', expectedMeter, 'not recognized');
}

export function unreadableMeterIdentity(): MeterAnomaly {
  return anomaly('IDENTITY_UNREADABLE', 'REVIEW', 'The meter identifier could not be read from the photograph.', 'Compare the physical label with the selected connection before approval.');
}

export function detectDuplicateReading(existing: MeterReadingRecord[], input: Pick<MeterReadingSubmission, 'consumerNo' | 'meterNo' | 'readingAt' | 'readingKwh'>): boolean {
  const day = input.readingAt.slice(0, 10);
  return existing.some(r => r.consumerNo === input.consumerNo && r.meterNo === input.meterNo && r.readingAt.slice(0, 10) === day && r.readingKwh === input.readingKwh);
}

export function tariffCategoryId(category: TariffCategory): 'RGP_URBAN' | 'RGP_RURAL' | 'BPL' | 'NRGP' | 'GLP' {
  if (category.includes('Agricultural')) return 'GLP';
  if (category.includes('Industrial')) return 'NRGP';
  if (category.includes('Commercial')) return 'NRGP';
  return 'RGP_URBAN';
}
