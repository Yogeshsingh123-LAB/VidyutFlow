import type {
  ElectricityBill,
  ElectricityConnection,
  PaymentTransaction,
  CriticalIncident
} from '../types';
import type {
  Anomaly,
  AnomalySeverity,
  MeterAnomaly,
  MeterAnomalyCategory,
  MeterReadingRecord,
  MeterReadingSubmission,
  MeterThresholds,
  BillValidationFinding,
  BillCheckResult
} from '../types/meterReading';
import { validateExistingBill } from '../services/billingValidation';

export interface AnomalyEngineThresholds extends Partial<MeterThresholds> {
  highMultiplier?: number;
  lowMultiplier?: number;
  spikePercent?: number;
  zeroSpikeConsecutiveCount?: number;
  minBaselineReadings?: number;
}

export interface ConsumptionAnomalyInput {
  connection: ElectricityConnection;
  currentReading:
    | MeterReadingRecord
    | MeterReadingSubmission
    | {
        id?: string;
        consumerNo: string;
        connectionId?: string;
        meterNo: string;
        readingKwh?: number;
        candidateReading?: string | number;
        multiplier?: number;
        readingAt?: string;
        submittedAt?: string;
        replacementEvent?: MeterReadingRecord['replacementEvent'];
      };
  previousReading?: MeterReadingRecord | { id?: string; readingKwh: number; readingAt?: string } | null;
  historicalReadings?: MeterReadingRecord[];
  historicalBills?: ElectricityBill[];
  recentOutages?: CriticalIncident[];
  thresholds?: AnomalyEngineThresholds;
}

export interface OutageEvidenceSummary {
  recorded: boolean;
  incidentCount: number;
  incidentIds: string[];
  summary: string;
  totalInterruptionHours?: number;
}

export interface ConsumptionAnomalyCheckResult {
  hasAnomaly: boolean;
  severity: AnomalySeverity;
  anomalies: MeterAnomaly[];
  normalizedDailyCurrentKwh: number;
  normalizedDailyBaselineKwh: number;
  intervalDays: number;
  baselineReadingCount: number;
  outageEvidence?: OutageEvidenceSummary;
  explanation: string;
}

export interface BillingAnomalyInput {
  bill: ElectricityBill;
  connection: ElectricityConnection;
  allBills: ElectricityBill[];
  payments: PaymentTransaction[];
  meterReadings?: MeterReadingRecord[];
}

export interface BillingAnomalyCheckResult extends BillCheckResult {
  anomalies: Anomaly[];
}

const DEFAULT_ANOMALY_THRESHOLDS = {
  highMultiplier: 2.5,
  lowMultiplier: 0.3,
  spikePercent: 150,
  zeroSpikeConsecutiveCount: 2,
  minBaselineReadings: 1
};

/**
 * Calculates calendar day interval between two date/ISO strings.
 * Defaults to 60 days for standard UGVCL bi-monthly cycles.
 */
function calculateIntervalDays(
  currentDateStr?: string,
  previousDateStr?: string,
  defaultDays = 60
): number {
  if (!currentDateStr || !previousDateStr) return defaultDays;
  const currMs = new Date(currentDateStr).getTime();
  const prevMs = new Date(previousDateStr).getTime();
  if (isNaN(currMs) || isNaN(prevMs) || currMs <= prevMs) return defaultDays;
  const diffDays = Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Consumption Anomaly Engine:
 * Evaluates meter readings against persistent verified baselines and preserved Phase 9 history.
 * Normalizes by actual interval days and provides transparent, non-fraudulent explanations.
 */
export function detectConsumptionAnomalies(
  input: ConsumptionAnomalyInput
): ConsumptionAnomalyCheckResult {
  const {
    connection,
    currentReading,
    previousReading,
    historicalReadings = [],
    historicalBills = [],
    recentOutages = [],
    thresholds = {}
  } = input;

  const cfg = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    highMultiplier: thresholds.highMultiplier ?? thresholds.highDailyRatio ?? DEFAULT_ANOMALY_THRESHOLDS.highMultiplier,
    lowMultiplier: thresholds.lowMultiplier ?? thresholds.lowDailyRatio ?? DEFAULT_ANOMALY_THRESHOLDS.lowMultiplier,
    minBaselineReadings: thresholds.minBaselineReadings ?? DEFAULT_ANOMALY_THRESHOLDS.minBaselineReadings
  };

  const anomalies: MeterAnomaly[] = [];
  const nowIso = new Date().toISOString();
  let anomalySeq = 1;

  const pushAnomaly = (
    category: MeterAnomalyCategory,
    severity: AnomalySeverity,
    evidence: string,
    recommendedAction: string,
    expectedValue?: string,
    recordedValue?: string
  ) => {
    anomalies.push({
      id: `ANO-CONS-${connection.consumerNo}-${anomalySeq++}`,
      category,
      severity,
      evidence,
      recommendedAction,
      expectedValue,
      recordedValue,
      detectedAt: nowIso,
      status: 'OPEN'
    });
  };

  // 1. Determine current reading value and consumed units
  const candidateVal = 'candidateReading' in currentReading ? currentReading.candidateReading : undefined;
  const currentKwh =
    'readingKwh' in currentReading && typeof currentReading.readingKwh === 'number'
      ? currentReading.readingKwh
      : typeof candidateVal === 'number'
      ? candidateVal
      : parseFloat(String(candidateVal || '0')) || 0;

  const prevKwh =
    previousReading?.readingKwh !== undefined
      ? previousReading.readingKwh
      : connection.previousReadingKwh ?? (connection.currentReadingKwh || 0);

  const multiplier =
    'multiplier' in currentReading && typeof currentReading.multiplier === 'number'
      ? currentReading.multiplier
      : connection.multiplier || 1;

  // Actual interval calculation
  const currentDateStr =
    'readingAt' in currentReading && currentReading.readingAt
      ? currentReading.readingAt
      : 'submittedAt' in currentReading && currentReading.submittedAt
      ? currentReading.submittedAt
      : nowIso;

  const prevDateStr =
    previousReading?.readingAt ||
    connection.lastReadingDate ||
    undefined;

  const intervalDays = calculateIntervalDays(currentDateStr, prevDateStr, 60);

  // Raw consumed delta (without rollover)
  const rawDelta = (currentKwh - prevKwh) * multiplier;
  let consumedUnits = Math.max(0, rawDelta);

  // 2. Establish historical baseline normalized by interval days
  const verifiedHistoricalReadings = historicalReadings.filter(
    r => r.consumerNo === connection.consumerNo && r.status === 'APPROVED' && r.consumedUnits !== undefined
  );

  const validHistoricalBills = historicalBills.filter(
    b => b.consumerNo === connection.consumerNo && b.isIssued !== false && b.status !== 'Scheduled' && b.unitsConsumed > 0
  );

  let baselineDailyTotal = 0;
  let baselineDaysTotal = 0;
  let baselineCount = 0;

  for (const r of verifiedHistoricalReadings) {
    if (r.consumedUnits !== undefined && r.consumedUnits >= 0) {
      const days = 60; // Standard bi-monthly
      baselineDailyTotal += r.consumedUnits;
      baselineDaysTotal += days;
      baselineCount++;
    }
  }

  for (const b of validHistoricalBills) {
    const days = b.billedDaysCount || (b.billingCycleType === 'MONTHLY' ? 30 : 60);
    baselineDailyTotal += b.unitsConsumed;
    baselineDaysTotal += days;
    baselineCount++;
  }

  const normalizedDailyBaselineKwh =
    baselineDaysTotal > 0 && baselineCount >= cfg.minBaselineReadings
      ? Number((baselineDailyTotal / baselineDaysTotal).toFixed(2))
      : 0;

  const normalizedDailyCurrentKwh = Number((consumedUnits / Math.max(1, intervalDays)).toFixed(2));

  // 3. Phase 10 Outage Evidence Attachment
  let outageEvidence: OutageEvidenceSummary | undefined;
  if (recentOutages.length > 0) {
    const matchingOutages = recentOutages.filter(inc => {
      const matchSub =
        inc.subdivision &&
        connection.subdivision &&
        inc.subdivision.toLowerCase().trim() === connection.subdivision.toLowerCase().trim();
      const matchFeeder =
        connection.feederId &&
        inc.entityId &&
        inc.entityId.toLowerCase().trim() === connection.feederId.toLowerCase().trim();
      return matchSub || matchFeeder;
    });

    if (matchingOutages.length > 0) {
      outageEvidence = {
        recorded: true,
        incidentCount: matchingOutages.length,
        incidentIds: matchingOutages.map(i => i.id),
        summary: `Subdivision/Feeder experienced ${matchingOutages.length} recorded grid interruption event(s) during this cycle (${matchingOutages.map(i => i.title).join('; ')}). Context explains potential lower consumption; not an automatic dismissal.`,
        totalInterruptionHours: matchingOutages.length * 4
      };
    }
  }

  // 4. Anomaly Evaluations

  // Check A: Baseline requirement & First Reading
  if (baselineCount < cfg.minBaselineReadings) {
    pushAnomaly(
      'FIRST_READING',
      'INFO',
      `Initial baseline cycle for connection ${connection.consumerNo}. Verified baseline requires at least ${cfg.minBaselineReadings} historical cycle(s).`,
      'Verify initial meter reading against physical installation certificate.',
      'N/A (Initial baseline)',
      `${currentKwh} kWh`
    );
  }

  // Check B: Missing Previous Reading on existing connection
  if (previousReading === null && (connection.previousReadingKwh === undefined || connection.previousReadingKwh === 0) && validHistoricalBills.length > 0) {
    pushAnomaly(
      'IDENTITY_UNREADABLE',
      'REVIEW',
      `Connection has ${validHistoricalBills.length} historical bill(s) but no verified previous meter reading snapshot was provided.`,
      'Link connection to latest verified historical closing reading before billing.',
      'Verified prior meter reading',
      'None provided'
    );
  }

  // Check C: Decreasing reading / Rollover / Replacement
  const replacementEvent = 'replacementEvent' in currentReading ? currentReading.replacementEvent : undefined;
  if (currentKwh < prevKwh) {
    if (replacementEvent) {
      pushAnomaly(
        'METER_REPLACEMENT',
        'INFO',
        `Meter replacement recorded: Old meter ${replacementEvent.oldMeterNumber} (final: ${replacementEvent.oldFinalReading}) replaced by ${replacementEvent.newMeterNumber} (initial: ${replacementEvent.newInitialReading}).`,
        'Confirm replacement work order and closing/opening readings.',
        `>= ${prevKwh}`,
        `${currentKwh} kWh`
      );
    } else {
      const dialDigits = connection.decimalPlaces ? 6 : 5;
      const dialMax = Math.pow(10, dialDigits);
      if (prevKwh > dialMax * 0.9 && currentKwh < dialMax * 0.1) {
        pushAnomaly(
          'METER_ROLLOVER',
          'INFO',
          `Meter register rollover detected at ${dialMax} limit (previous: ${prevKwh}, current: ${currentKwh}).`,
          'Confirm register digit rollover against physical meter specification.',
          `>= ${prevKwh}`,
          `${currentKwh} kWh`
        );
        consumedUnits = (dialMax - prevKwh + currentKwh) * multiplier;
      } else {
        pushAnomaly(
          'DECREASING_READING',
          'HIGH',
          `Current reading (${currentKwh} kWh) is less than previous reading (${prevKwh} kWh) without an authorized replacement or rollover event.`,
          'Reject or request re-reading; verify whether a meter replacement occurred.',
          `>= ${prevKwh}`,
          `${currentKwh} kWh`
        );
      }
    }
  }

  // Check D: Repeated identical reading / Zero consumption
  if (currentKwh === prevKwh && consumedUnits === 0) {
    if (normalizedDailyBaselineKwh > 0 && connection.status === 'Active') {
      pushAnomaly(
        'ZERO_CONSUMPTION',
        'REVIEW',
        `Zero units consumed over ${intervalDays} days on active connection (baseline daily: ${normalizedDailyBaselineKwh} kWh/day). Premise may be locked/vacant or meter counter may be stalled.`,
        'Verify whether the premise is vacant or dispatch field inspection for stalled register.',
        `> 0 kWh (${(normalizedDailyBaselineKwh * intervalDays).toFixed(0)} kWh expected)`,
        '0 kWh'
      );
    } else {
      pushAnomaly(
        'DUPLICATE_READING',
        'INFO',
        `Meter reading is identical to previous reading (${currentKwh} kWh).`,
        'Confirm whether reading is a duplicate submission or zero consumption cycle.',
        'Updated reading',
        `${currentKwh} kWh`
      );
    }
  }

  // Check E: Inconsistent interval days
  if (intervalDays < 15) {
    pushAnomaly(
      'DUPLICATE_SUBMISSION',
      'REVIEW',
      `Unusually short reading interval (${intervalDays} days). Standard UGVCL billing interval is 60 days (bi-monthly) or 30 days (monthly).`,
      'Verify capture date and ensure submission is not a rapid duplicate.',
      '>= 15 days',
      `${intervalDays} days`
    );
  } else if (intervalDays > 95) {
    pushAnomaly(
      'OUT_OF_ORDER',
      'REVIEW',
      `Prolonged billing interval (${intervalDays} days). Slabs and fixed charges may require pro-rata period scaling.`,
      'Verify reading chronology and apply appropriate multi-month billing period.',
      '<= 90 days',
      `${intervalDays} days`
    );
  }

  // Check F: Physical theoretical capacity limit (Implausible delta)
  const contractedLoadKw = Math.max(1, connection.sanctionedLoadKw || 2);
  const maxPossibleContinuousKwh = contractedLoadKw * 24 * intervalDays; // 100% continuous 24x7 full load
  if (consumedUnits > maxPossibleContinuousKwh && maxPossibleContinuousKwh > 0) {
    pushAnomaly(
      'HIGH_CONSUMPTION',
      'HIGH',
      `Recorded consumption (${consumedUnits} kWh) exceeds the physical continuous capacity of the ${contractedLoadKw} kW contracted connection (${maxPossibleContinuousKwh.toFixed(0)} kWh at 100% continuous load factor). Requires test bench or CT ratio verification.`,
      'Verify OCR decimal placement, multiplier, or schedule meter test bench check.',
      `<= ${maxPossibleContinuousKwh.toFixed(0)} kWh`,
      `${consumedUnits} kWh`
    );
  }

  // Check G: High Consumption (Non-fraudulent explanation)
  if (
    normalizedDailyBaselineKwh > 0 &&
    normalizedDailyCurrentKwh > normalizedDailyBaselineKwh * cfg.highMultiplier &&
    consumedUnits <= maxPossibleContinuousKwh
  ) {
    const spikePercent = Math.round(
      ((normalizedDailyCurrentKwh - normalizedDailyBaselineKwh) / normalizedDailyBaselineKwh) * 100
    );
    const severity: AnomalySeverity = normalizedDailyCurrentKwh > normalizedDailyBaselineKwh * 4.0 ? 'HIGH' : 'REVIEW';
    pushAnomaly(
      'HIGH_CONSUMPTION',
      severity,
      `Significant consumption increase (${normalizedDailyCurrentKwh} kWh/day vs baseline ${normalizedDailyBaselineKwh} kWh/day, +${spikePercent}%). May indicate seasonal load (cooling/irrigation), household expansion, appliance installation, or wiring inspection. Human confirmation recommended.`,
      'Compare meter photograph, interval days, and seasonal load pattern before billing.',
      `<= ${(normalizedDailyBaselineKwh * cfg.highMultiplier).toFixed(1)} kWh/day`,
      `${normalizedDailyCurrentKwh} kWh/day`
    );
  }

  // Check H: Low Consumption
  if (
    normalizedDailyBaselineKwh > 0 &&
    normalizedDailyCurrentKwh > 0 &&
    normalizedDailyCurrentKwh < normalizedDailyBaselineKwh * cfg.lowMultiplier
  ) {
    const dropPercent = Math.round(
      ((normalizedDailyBaselineKwh - normalizedDailyCurrentKwh) / normalizedDailyBaselineKwh) * 100
    );
    let evidenceText = `Low consumption recorded (${normalizedDailyCurrentKwh} kWh/day vs baseline ${normalizedDailyBaselineKwh} kWh/day, -${dropPercent}%). May indicate vacancy or partial occupancy.`;
    if (outageEvidence?.recorded) {
      evidenceText += ` Context: Feeder experienced ${outageEvidence.incidentCount} recorded grid interruption(s) during this cycle.`;
    }
    pushAnomaly(
      'LOW_CONSUMPTION',
      'REVIEW',
      evidenceText,
      'Review feeder outage logs and consumer occupancy context.',
      `>= ${(normalizedDailyBaselineKwh * cfg.lowMultiplier).toFixed(1)} kWh/day`,
      `${normalizedDailyCurrentKwh} kWh/day`
    );
  }

  // Determine overall severity
  let highestSeverity: AnomalySeverity = 'INFO';
  if (anomalies.some(a => a.severity === 'HIGH')) {
    highestSeverity = 'HIGH';
  } else if (anomalies.some(a => a.severity === 'REVIEW')) {
    highestSeverity = 'REVIEW';
  }

  const explanation =
    anomalies.length > 0
      ? anomalies.map(a => a.evidence).join(' ')
      : `Consumption is consistent with verified historical baseline (${normalizedDailyCurrentKwh} kWh/day vs ${normalizedDailyBaselineKwh} kWh/day).`;

  return {
    hasAnomaly: anomalies.length > 0,
    severity: highestSeverity,
    anomalies,
    normalizedDailyCurrentKwh,
    normalizedDailyBaselineKwh,
    intervalDays,
    baselineReadingCount: baselineCount,
    outageEvidence,
    explanation
  };
}

/**
 * Billing Anomaly Engine:
 * Validates the generated bill against Phase 9's canonical calculations,
 * payment reconciliation, reading linkage, and period overlap rules.
 */
export function detectBillingAnomalies(input: BillingAnomalyInput): BillingAnomalyCheckResult {
  const result = validateExistingBill(input);
  const anomalies = convertFindingsToAnomalies(input.bill.billNo, input.connection.consumerNo, result.findings || []);
  return {
    ...result,
    anomalies
  };
}

/**
 * Converts structured BillValidationFinding records into the unified Anomaly contract.
 */
export function convertFindingsToAnomalies(
  billNo: string,
  consumerNo: string,
  findings: BillValidationFinding[]
): Anomaly[] {
  return findings.map((f, idx) => {
    let cat: MeterAnomalyCategory = 'BILL_DISCREPANCY';
    if (f.category === 'TARIFF_SLAB_MISMATCH') cat = 'BILL_CALCULATION_MISMATCH';
    else if (f.category === 'FIXED_CHARGE_MISMATCH') cat = 'BILL_CALCULATION_MISMATCH';
    else if (f.category === 'FPPPA_MISMATCH') cat = 'BILL_CALCULATION_MISMATCH';
    else if (f.category === 'ELECTRICITY_DUTY_MISMATCH') cat = 'BILL_CALCULATION_MISMATCH';
    else if (f.category === 'INCORRECT_READING_LINKAGE') cat = 'INCORRECT_READING_LINKAGE';
    else if (f.category === 'PAYMENT_LINKAGE_MISMATCH') cat = 'PAYMENT_LINKAGE_MISMATCH';
    else if (f.category === 'DUPLICATE_BILL') cat = 'DUPLICATE_SUBMISSION';

    return {
      anomalyId: `ANO-BILL-${billNo}-${idx + 1}`,
      relatedId: billNo,
      consumerNo,
      category: cat,
      severity: f.severity,
      evidence: f.explanation,
      expectedValue: f.expectedValue ?? null,
      recordedValue: f.actualValue ?? null,
      reviewAction: f.suggestedAction,
      status: 'DETECTED',
      createdAt: new Date().toISOString()
    };
  });
}
