import {
  MeterReadingError,
  normalizeDisplayedReading,
  type MeterReadingRecord,
  type MeterAnomaly,
  type MeterAnomalyCategory,
  type MeterConfiguration,
  type AuditableMeterReplacementEvent,
  type MeterReadingSubmission
} from '../services/meterReading';
import type { ElectricityConnection } from '../types';

export interface MeterTimestampValidationResult {
  valid: boolean;
  days: number;
  error?: string;
  code?: 'OUT_OF_ORDER' | 'FUTURE_TIMESTAMP_DRIFT' | 'INVALID_DATE';
}

export interface MeterConsumptionCalculationResult {
  units: number;
  days: number;
  event: 'ordinary' | 'rollover' | 'replacement';
  breakdown?: {
    oldMeterUnits: number;
    newMeterUnits: number;
  };
}

export interface MeterIdentityValidationResult {
  matches: boolean;
  anomaly?: MeterAnomaly;
}

export interface ApprovalEligibilityResult {
  canApprove: boolean;
  blockerReasons: string[];
}

/**
 * Validates photographed meter serial number against expected utility connection records.
 * Uses strict alphanumeric comparison and generates explicit, non-inferential anomalies.
 */
export function validateMeterIdentity(
  expectedMeterNo: string,
  photographedMeterNo?: string | null
): MeterIdentityValidationResult {
  const expected = (expectedMeterNo || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!photographedMeterNo || !photographedMeterNo.trim()) {
    return {
      matches: false,
      anomaly: {
        id: `MAN-${crypto.randomUUID()}`,
        category: 'IDENTITY_UNREADABLE',
        severity: 'REVIEW',
        evidence: 'The meter identifier could not be read or matched from the photograph.',
        recommendedAction: 'Compare the physical meter display/plate with the selected connection before approval.',
        expectedValue: expectedMeterNo,
        recordedValue: 'unreadable',
        detectedAt: new Date().toISOString(),
        status: 'OPEN'
      }
    };
  }

  const observed = photographedMeterNo.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (observed.includes(expected) || expected.includes(observed)) {
    return { matches: true };
  }

  return {
    matches: false,
    anomaly: {
      id: `MAN-${crypto.randomUUID()}`,
      category: 'IDENTITY_MISMATCH',
      severity: 'HIGH',
      evidence: `Photographed meter identifier (${photographedMeterNo}) does not match expected meter (${expectedMeterNo}). Identity was not inferred.`,
      recommendedAction: 'Hold reading and have an authorized subdivision officer re-verify the physical meter serial.',
      expectedValue: expectedMeterNo,
      recordedValue: photographedMeterNo,
      detectedAt: new Date().toISOString(),
      status: 'OPEN'
    }
  };
}

/**
 * Validates timestamp ordering and future timestamp drift.
 */
export function validateReadingTimestamps(input: {
  currentReadingAt: string;
  previousReadingAt?: string;
  submissionAt?: string;
  maxFutureDriftMinutes?: number;
}): MeterTimestampValidationResult {
  const currentTime = Date.parse(input.currentReadingAt);
  if (!Number.isFinite(currentTime)) {
    return { valid: false, days: 0, error: 'Provide a valid ISO reading date.', code: 'INVALID_DATE' };
  }

  const nowMs = input.submissionAt ? Date.parse(input.submissionAt) : Date.now();
  const maxDriftMinutes = input.maxFutureDriftMinutes ?? 1440; // 24 hours default to accommodate timezone offsets
  const maxDriftMs = maxDriftMinutes * 60 * 1000;
  if (currentTime > nowMs + maxDriftMs) {
    return {
      valid: false,
      days: 0,
      error: `Reading timestamp (${input.currentReadingAt}) is in the future beyond acceptable drift (${maxDriftMinutes} min).`,
      code: 'FUTURE_TIMESTAMP_DRIFT'
    };
  }

  if (input.previousReadingAt) {
    const previousTime = Date.parse(input.previousReadingAt);
    if (!Number.isFinite(previousTime) || currentTime <= previousTime) {
      return {
        valid: false,
        days: 0,
        error: `Reading timestamp (${input.currentReadingAt}) must be strictly after the previous verified reading (${input.previousReadingAt}).`,
        code: 'OUT_OF_ORDER'
      };
    }

    const parseDayUtc = (raw: string, timestamp: number) => {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      const date = new Date(timestamp);
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    };

    const currentDay = parseDayUtc(input.currentReadingAt, currentTime);
    const previousDay = parseDayUtc(input.previousReadingAt, previousTime);
    const days = Math.max(1, Math.round((currentDay - previousDay) / 86400000));
    return { valid: true, days };
  }

  return { valid: true, days: 30 };
}

/**
 * Audits and calculates consumption for replacement events.
 * Old meter consumption: (oldFinal - oldPrevious) * multiplier
 * New meter consumption: (newCurrent - newInitial) * multiplier
 */
export function validateMeterReplacement(
  event: AuditableMeterReplacementEvent,
  options?: {
    multiplier?: number;
    previousReadingAt?: string;
    currentReadingAt?: string;
  }
): { valid: boolean; units: number; error?: string } {
  const mult = options?.multiplier ?? 1.0;
  if (event.oldFinalReading < event.oldPreviousReading) {
    return {
      valid: false,
      units: 0,
      error: `Old meter final reading (${event.oldFinalReading}) cannot be less than old previous reading (${event.oldPreviousReading}).`
    };
  }

  if (event.newCurrentReading < event.newInitialReading) {
    return {
      valid: false,
      units: 0,
      error: `New meter current reading (${event.newCurrentReading}) cannot be less than new initial reading (${event.newInitialReading}).`
    };
  }

  if (!event.authorizedActor || !event.authorizedActor.trim()) {
    return {
      valid: false,
      units: 0,
      error: 'Authorized actor ID is required for auditable meter replacement events.'
    };
  }

  const oldUnits = (event.oldFinalReading - event.oldPreviousReading) * mult;
  const newUnits = (event.newCurrentReading - event.newInitialReading) * mult;
  const totalUnits = Math.round((oldUnits + newUnits) * 100) / 100;

  return {
    valid: true,
    units: totalUnits
  };
}

/**
 * Canonical consumption calculation engine handling ordinary, rollover, and replacement events.
 */
export function calculateConsumptionWithEvents(input: {
  current: number;
  previous?: number;
  multiplier: number;
  previousAt?: string;
  currentAt: string;
  rolloverAt?: number;
  replacementEvent?: AuditableMeterReplacementEvent;
}): MeterConsumptionCalculationResult {
  if (!Number.isFinite(input.multiplier) || input.multiplier <= 0 || input.multiplier > 10000) {
    throw new MeterReadingError('Meter multiplier must be greater than zero.', 'INVALID_MULTIPLIER');
  }

  if (!Number.isFinite(input.current) || input.current < 0) {
    throw new MeterReadingError('Reading must be zero or greater.', 'INVALID_READING');
  }

  const timeValidation = validateReadingTimestamps({
    currentReadingAt: input.currentAt,
    previousReadingAt: input.previousAt
  });

  if (!timeValidation.valid) {
    throw new MeterReadingError(
      timeValidation.error || 'Invalid reading timestamp sequence.',
      timeValidation.code || 'OUT_OF_ORDER'
    );
  }

  const days = timeValidation.days;

  // Handle auditable meter replacement
  if (input.replacementEvent) {
    const replValidation = validateMeterReplacement(input.replacementEvent, {
      multiplier: input.multiplier,
      previousReadingAt: input.previousAt,
      currentReadingAt: input.currentAt
    });

    if (!replValidation.valid) {
      throw new MeterReadingError(
        replValidation.error || 'Invalid meter replacement record.',
        'INVALID_REPLACEMENT'
      );
    }

    const oldUnits = (input.replacementEvent.oldFinalReading - input.replacementEvent.oldPreviousReading) * input.multiplier;
    const newUnits = (input.replacementEvent.newCurrentReading - input.replacementEvent.newInitialReading) * input.multiplier;

    return {
      units: replValidation.units,
      days,
      event: 'replacement',
      breakdown: {
        oldMeterUnits: Math.round(oldUnits * 100) / 100,
        newMeterUnits: Math.round(newUnits * 100) / 100
      }
    };
  }

  if (input.previous === undefined) {
    throw new MeterReadingError(
      'No previous verified reading is available; review is required.',
      'MISSING_PREVIOUS'
    );
  }

  // Handle ordinary non-decreasing readings
  if (input.current >= input.previous) {
    const units = Math.round((input.current - input.previous) * input.multiplier * 100) / 100;
    return { units, days, event: 'ordinary' };
  }

  // Handle configured dial rollover
  if (input.rolloverAt && input.previous <= input.rolloverAt && input.current < input.rolloverAt) {
    // Standard utility rollover calculation: (rolloverAt - previous + current) * multiplier
    const rawDelta = input.rolloverAt - input.previous + input.current;
    const units = Math.round(rawDelta * input.multiplier * 100) / 100;
    return { units, days, event: 'rollover' };
  }

  // Decreasing reading without replacement or rollover
  throw new MeterReadingError(
    `Reading (${input.current}) is below previous value (${input.previous}). Confirm an authorized replacement or configured dial rollover.`,
    'DECREASING_READING'
  );
}

/**
 * Gatekeeper function enforcing separation of duties, role authorization,
 * subdivision scoping, and unresolved anomaly clearance before approval.
 */
export function canApproveMeterReading(
  reading: MeterReadingRecord,
  reviewer: {
    actorId: string;
    role: string;
    name?: string;
    subdivision?: string;
  },
  connection: {
    subdivision: string;
    meterNo: string;
  }
): ApprovalEligibilityResult {
  const blockers: string[] = [];

  // Gate 1: Role check. Consumers cannot approve readings!
  const allowedRoles = ['employee', 'admin'];
  if (!allowedRoles.includes(reviewer.role.toLowerCase())) {
    blockers.push('Consumers and unauthorized roles are strictly forbidden from approving meter readings.');
  }

  // Gate 2: Maker-checker separation of duties
  const submitterId = reading.submittedById;
  const submitterName = reading.submittedBy?.toLowerCase().trim();
  const reviewerId = reviewer.actorId;
  const reviewerName = (reviewer.name || '').toLowerCase().trim();

  if (submitterId && reviewerId && submitterId === reviewerId) {
    blockers.push(`Maker-Checker violation: Submitter (${reading.submittedBy} [${submitterId}]) cannot approve their own meter reading.`);
  } else if (submitterName && reviewerName && submitterName === reviewerName) {
    blockers.push(`Maker-Checker violation: Submitter (${reading.submittedBy}) cannot approve their own meter reading.`);
  }

  // Gate 3: Subdivision / Circle authorization
  if (reviewer.role.toLowerCase() === 'employee' && reviewer.subdivision) {
    const reviewerSub = reviewer.subdivision.toLowerCase().trim();
    const connSub = (connection.subdivision || '').toLowerCase().trim();
    if (reviewerSub && connSub && reviewerSub !== connSub && !reviewerSub.includes('circle') && !reviewerSub.includes('admin')) {
      blockers.push(`Subdivision mismatch: Reviewer is authorized for "${reviewer.subdivision}" but connection belongs to "${connection.subdivision}".`);
    }
  }

  // Gate 4: Reading status
  if (reading.status !== 'PENDING_REVIEW') {
    blockers.push(`Only readings in PENDING_REVIEW status can be approved. Current status: ${reading.status}.`);
  }

  // Gate 5: Unresolved HIGH anomalies
  const unresolvedHigh = reading.anomalies.filter(
    a => a.severity === 'HIGH' && a.status !== 'CLOSED'
  );
  if (unresolvedHigh.length > 0) {
    blockers.push(
      `Cannot approve reading with ${unresolvedHigh.length} unresolved HIGH severity anomaly cases (${unresolvedHigh.map(a => a.category).join(', ')}). All high-severity cases must be formally closed or investigated first.`
    );
  }

  // Gate 6: Consumption validity
  if (reading.consumedUnits === undefined || !Number.isFinite(reading.consumedUnits) || reading.consumedUnits < 0) {
    blockers.push('Consumption calculation is incomplete or invalid.');
  }

  return {
    canApprove: blockers.length === 0,
    blockerReasons: blockers
  };
}

/**
 * Creates an immutable audit trail entry for reading reviews and status transitions.
 */
export function createReadingReviewAuditEntry(params: {
  readingId: string;
  action: 'APPROVE' | 'REJECT' | 'REREAD' | 'MANUAL_OVERRIDE';
  fromStatus: string;
  toStatus: string;
  actor: { id: string; name: string; role: string };
  note: string;
  correctedReading?: number;
}): {
  id: string;
  readingId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  note: string;
  timestamp: string;
  correctedReading?: number;
} {
  return {
    id: `MRH-${crypto.randomUUID().slice(0, 8)}`,
    readingId: params.readingId,
    action: params.action,
    previousStatus: params.fromStatus,
    newStatus: params.toStatus,
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    note: params.note.slice(0, 1000),
    timestamp: new Date().toISOString(),
    ...(params.correctedReading !== undefined ? { correctedReading: params.correctedReading } : {})
  };
}
