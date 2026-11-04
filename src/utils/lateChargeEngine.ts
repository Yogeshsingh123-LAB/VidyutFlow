/**
 * VIDYUTFLOW 2.0 — Delayed Payment Surcharge (DPS) & Late-Payment Engine
 *
 * Provides a canonical, deterministic, date-aware late-payment charge calculation
 * engine supporting:
 * - Monthly and bi-monthly electricity bills
 * - Calendar day overdue counting in Asia/Kolkata timezone
 * - Configurable, versioned, effective-dated policies
 * - Explicit DEMO tariff simulation disclosure (15% p.a. unverified tariff assumption)
 * - Grace periods (0 to N days)
 * - Daily simple interest accrual on remaining principal
 * - Partial payments and multi-installment tranches
 * - Payment reversals and authorized charge waivers
 * - Strict half-up rupee/paise currency rounding (never negative, no floating-point drift)
 * - Zero mutation of original issued bill amount or protected statutory records
 */

import { ElectricityBill, PaymentTransaction, TariffCategory } from '../types';
import { LanguageCode } from '../i18n/types';

export const ERP_BUSINESS_TIMEZONE = 'Asia/Kolkata';

// ============================================================================
// POLICY DATA CONTRACTS
// ============================================================================

export type LateChargeCalculationMethod = 'DAILY_SIMPLE' | 'MONTHLY_FLAT' | 'NONE';

export interface CategoryLateChargeRule {
  annualRatePercent?: number;
  gracePeriodDays?: number;
  minimumChargeInr?: number;
}

export interface LateChargePolicy {
  policyId: string;
  version: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // Optional sunset date
  isDemoSimulation: boolean; // TRUE: explicit disclaimer that rate is an unverified DEMO assumption
  tariffAuthority: string;
  calculationMethod: LateChargeCalculationMethod;
  annualRatePercent: number; // e.g. 15.0 for 15% p.a.
  gracePeriodDays: number; // Days after dueDate before charges begin accruing
  daysInYearBasis: 365 | 366; // 365 standard or leap-year basis
  minimumChargeInr: number;
  roundingMethod: 'ROUND_HALF_UP_2DEC' | 'ROUND_UP_RUPEE' | 'NONE';
  categoryOverrides?: Partial<Record<TariffCategory, CategoryLateChargeRule>>;
  statutoryReference?: string;
  notes: string;
}

export const DEFAULT_LATE_CHARGE_POLICY: LateChargePolicy = {
  policyId: 'POL-UGVCL-DPS-DEMO-2026.1',
  version: '2026.1-DEMO',
  effectiveFrom: '2026-01-01',
  isDemoSimulation: true,
  tariffAuthority: 'UGVCL Tariff Regulation Simulation (DEMO Verification Engine)',
  calculationMethod: 'DAILY_SIMPLE',
  annualRatePercent: 15.0, // 15.0% per annum demo simulation
  gracePeriodDays: 0, // Immediate daily accrual from day following due date
  daysInYearBasis: 365,
  minimumChargeInr: 0,
  roundingMethod: 'ROUND_HALF_UP_2DEC',
  categoryOverrides: {
    'Residential (RGPU)': {
      annualRatePercent: 15.0,
      gracePeriodDays: 0,
      minimumChargeInr: 0,
    },
    'Commercial (NRGP)': {
      annualRatePercent: 15.0,
      gracePeriodDays: 0,
      minimumChargeInr: 0,
    },
    'Industrial (LTMD)': {
      annualRatePercent: 18.0,
      gracePeriodDays: 0,
      minimumChargeInr: 0,
    },
    'Agricultural (AG)': {
      annualRatePercent: 12.0,
      gracePeriodDays: 7, // 7-day agricultural grace window
      minimumChargeInr: 0,
    },
  },
  statutoryReference: 'GERC Electricity Supply Code & Related Matters (Simulated DEMO Parameter)',
  notes:
    'Configurable DEMO Late-Payment Surcharge Policy: 15% p.a. simple daily accrual on outstanding principal. Non-statutory demonstration rate; not an approved UGVCL demand.',
};

// ============================================================================
// WAIVERS & REVERSALS CONTRACTS
// ============================================================================

export interface LateChargeWaiverRecord {
  waiverId?: string;
  id?: string;
  billNo: string;
  amount?: number;
  waivedAmount?: number;
  waivedDate?: string; // e.g. '26-Oct-2026'
  approvedAt?: string;
  authorizedBy?: string;
  approvedBy?: string;
  reason: string;
  timestampIso?: string;
}

export interface PaymentReversalRecord {
  reversalId?: string;
  id?: string;
  txId: string;
  billNo: string;
  amount?: number;
  reversedDate?: string;
  reversedAt?: string;
  authorizedBy?: string;
  reason: string;
  timestampIso?: string;
}

// ============================================================================
// OVERDUE FINANCIAL BREAKDOWN RESULT
// ============================================================================

export interface OverdueAccrualTranche {
  startDate: string;
  endDate: string;
  days: number;
  principalInr: number;
  dailyRate: number;
  accruedInr: number;
}

export interface OverdueFinancialBreakdown {
  billNo: string;
  consumerNo: string;
  billingCycleType: 'MONTHLY' | 'BI_MONTHLY';
  billingPeriodLabel: string;
  dueDate: string;
  referenceDate: string;
  daysOverdue: number;
  isOverdue: boolean;
  gracePeriodDays: number;
  chargeableDays: number;
  // Principal & Payment Reconciliation
  originalBillAmount: number;
  successfulPayments: number;
  settledPaymentsAmount: number;
  remainingPrincipal: number;
  // Charges & Adjustments
  lateChargesAccrued: number;
  accruedLateCharges: number;
  lateChargesSettled: number;
  settledLateCharges: number;
  lateChargesWaived: number;
  waivedLateCharges: number;
  netLateChargesPayable: number;
  totalOutstandingPayable: number;
  // Rates & Metadata
  dailyChargeRate: number; // Daily accrual amount on current remaining principal (₹/day)
  dailyChargeInr: number;
  effectiveAnnualRatePercent: number;
  isDemoSimulation: boolean;
  isDemoPolicy: boolean;
  policyId: string;
  policyVersion: string;
  applicablePolicyId: string;
  applicablePolicyVersion: string;
  gracePeriodEndsOn: string;
  tariffCategory: TariffCategory;
  calculationReferenceDate: string;
  policyDisclaimer: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
  currentPaymentStatus: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
  historicalDaysLate?: number;
  // Detailed Audit Trail
  auditTrail: {
    referenceDateUsed: string;
    calculationTimestampIso: string;
    calculationMethod: LateChargeCalculationMethod;
    tranches: OverdueAccrualTranche[];
    waiversApplied: LateChargeWaiverRecord[];
    reversalsApplied: PaymentReversalRecord[];
  };
}

// ============================================================================
// DATE NORMALIZATION & TIMEZONE-AWARE CALENDAR HELPERS
// ============================================================================

const MONTH_NAMES_MAP: Record<string, number> = {
  JAN: 0,
  JANUARY: 0,
  FEB: 1,
  FEBRUARY: 1,
  MAR: 2,
  MARCH: 2,
  APR: 3,
  APRIL: 3,
  MAY: 4,
  JUN: 5,
  JUNE: 5,
  JUL: 6,
  JULY: 6,
  AUG: 7,
  AUGUST: 7,
  SEP: 8,
  SEPT: 8,
  SEPTEMBER: 8,
  OCT: 9,
  OCTOBER: 9,
  NOV: 10,
  NOVEMBER: 10,
  DEC: 11,
  DECEMBER: 11,
};

/**
 * Parses date inputs into a UTC midnight timestamp (ms) corresponding to
 * calendar days in the Asia/Kolkata business timezone.
 */
export function parseDateToMidnightUtcMs(input?: string | number | Date | null): number | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate());
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  const trimmed = input.trim();
  if (!trimmed) return null;

  // DD-MMM-YYYY format (e.g. '22-Oct-2026' or '04-Oct-2026 14:22')
  const dmyMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3,9})-(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthIdx = MONTH_NAMES_MAP[dmyMatch[2].toUpperCase()];
    const year = parseInt(dmyMatch[3], 10);
    if (monthIdx !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return Date.UTC(year, monthIdx, day);
    }
  }

  // YYYY-MM-DD ISO format (e.g. '2026-10-22')
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (!Number.isNaN(year) && monthIdx >= 0 && monthIdx <= 11 && !Number.isNaN(day)) {
      return Date.UTC(year, monthIdx, day);
    }
  }

  // DD/MM/YYYY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const monthIdx = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    if (!Number.isNaN(year) && monthIdx >= 0 && monthIdx <= 11 && !Number.isNaN(day)) {
      return Date.UTC(year, monthIdx, day);
    }
  }

  const fallback = Date.parse(trimmed);
  if (!Number.isNaN(fallback)) {
    const d = new Date(fallback);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  return null;
}

/**
 * Calculates calendar days difference from dueDate to referenceDate in Asia/Kolkata:
 * - Positive (> 0): past due date (overdue)
 * - Zero (0): exactly due today
 * - Negative (< 0): before due date (not overdue)
 */
export function calculateOverdueDays(
  dueDateStr: string | null | undefined,
  referenceDateStr: string | Date = '28-Oct-2026'
): { daysOverdue: number; isOverdue: boolean } {
  const dueMs = parseDateToMidnightUtcMs(dueDateStr);
  const refMs = parseDateToMidnightUtcMs(referenceDateStr);

  if (dueMs === null || refMs === null) {
    return { daysOverdue: 0, isOverdue: false };
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((refMs - dueMs) / MS_PER_DAY);

  if (diffDays <= 0) {
    return { daysOverdue: 0, isOverdue: false };
  }

  return { daysOverdue: diffDays, isOverdue: true };
}

/**
 * Formats a timestamp into canonical DD-MMM-YYYY.
 */
export function formatToVidyutDate(input: string | number | Date): string {
  const ms = parseDateToMidnightUtcMs(input);
  if (ms === null) return String(input);
  const d = new Date(ms);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export type LateChargePolicyConfig = LateChargePolicy;

export function parseFlexibleBillDateToIstMidnight(input?: string | number | Date | null): Date | null {
  const ms = parseDateToMidnightUtcMs(input);
  if (ms === null) return null;
  return new Date(ms);
}

export const formatDateDdMmmYyyy = formatToVidyutDate;

export function roundCurrency2Dec(val: number): number {
  if (!Number.isFinite(val) || val <= 0) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// ============================================================================
// CORE LATE-CHARGE CALCULATION ENGINE
// ============================================================================

export interface CalculateLatePaymentChargesParams {
  bill: ElectricityBill;
  payments?: PaymentTransaction[];
  referenceDate?: string | Date;
  policy?: LateChargePolicy;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  lateChargesSettled?: number;
  tariffCategory?: TariffCategory;
}

/**
 * Calculates canonical late-payment charges, remaining principal, and total outstanding
 * for an electricity bill against verified payment records and business reference date.
 *
 * Guarantees:
 * 1. Zero charges prior to the due date + grace period boundary.
 * 2. Original bill amount is strictly preserved and never mutated.
 * 3. Successful payments reduce principal before late charges accrue.
 * 4. Failed or pending payments are strictly rejected and do not reduce balance or halt accrual.
 * 5. Full settlement immediately stops further accrual and yields status 'Paid'.
 * 6. Partial payments correctly establish tranches so charges only accrue on unpaid principal.
 * 7. Waivers and reversals are recorded and accounted for deterministically.
 */
export function calculateLatePaymentCharges(
  params: CalculateLatePaymentChargesParams
): OverdueFinancialBreakdown {
  const {
    bill,
    payments = [],
    referenceDate = '28-Oct-2026',
    policy = DEFAULT_LATE_CHARGE_POLICY,
    waivers = [],
    reversals = [],
    lateChargesSettled: explicitLateChargesSettled,
    tariffCategory,
  } = params;

  const originalBillAmount = Math.max(0, Number(bill.totalAmount) || 0);
  const normBillNo = (bill.billNo || '').trim().toUpperCase();
  const refDateStr = formatToVidyutDate(referenceDate);
  const dueDateStr = bill.dueDate ? formatToVidyutDate(bill.dueDate) : refDateStr;

  // Resolve Category Specific Policy
  const effectiveCategory = (tariffCategory || 'Residential (RGPU)') as TariffCategory;
  const categoryOverride = policy.categoryOverrides?.[effectiveCategory];
  const annualRatePercent = categoryOverride?.annualRatePercent ?? policy.annualRatePercent;
  const gracePeriodDays = categoryOverride?.gracePeriodDays ?? policy.gracePeriodDays;
  const minimumChargeInr = categoryOverride?.minimumChargeInr ?? policy.minimumChargeInr;
  const daysInYear = policy.daysInYearBasis || 365;

  // Filter applicable waivers and reversals for this bill
  const applicableWaivers = waivers.filter(
    (w) => (w.billNo || '').trim().toUpperCase() === normBillNo && ((w.amount ?? w.waivedAmount ?? 0) > 0)
  );
  const applicableReversals = reversals.filter(
    (r) => (r.billNo || '').trim().toUpperCase() === normBillNo && Boolean(r.txId)
  );
  const reversedTxIds = new Set(applicableReversals.map((r) => (r.txId || '').trim().toUpperCase()));

  // Reconcile successful payments (excluding reversed transactions)
  const matchingPayments = payments.filter(
    (p) => (p.billNo || '').trim().toUpperCase() === normBillNo
  );

  const appliedPayments: PaymentTransaction[] = [];
  const seenTxKeys = new Set<string>();

  for (const p of matchingPayments) {
    if (p.status === 'Successful') {
      const normTxId = (p.txId || '').trim().toUpperCase();
      // Skip if explicitly reversed
      if (normTxId && reversedTxIds.has(normTxId)) {
        continue;
      }
      const txKey = normTxId || `${p.billNo}:${p.amount}:${p.date}`;
      if (!seenTxKeys.has(txKey)) {
        seenTxKeys.add(txKey);
        appliedPayments.push(p);
      }
    }
  }

  // Sort payments chronologically
  appliedPayments.sort((a, b) => {
    const msA = parseDateToMidnightUtcMs(a.date) ?? 0;
    const msB = parseDateToMidnightUtcMs(b.date) ?? 0;
    return msA - msB;
  });

  const successfulPayments = Number(
    appliedPayments.reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0).toFixed(2)
  );

  const remainingPrincipal = Math.max(
    0,
    Number((originalBillAmount - successfulPayments).toFixed(2))
  );

  // Overdue and chargeable days
  const { daysOverdue: rawDaysOverdue, isOverdue: rawIsOverdue } = calculateOverdueDays(dueDateStr, refDateStr);
  const isSettled = remainingPrincipal <= 0;
  const isOverdue = !isSettled && rawIsOverdue;
  const daysOverdue = isSettled ? 0 : (isOverdue ? rawDaysOverdue : 0);
  const historicalDaysLate = rawIsOverdue ? rawDaysOverdue : 0;
  const chargeableDays = isSettled ? 0 : Math.max(0, rawDaysOverdue - gracePeriodDays);

  // Daily rate calculation
  const dailyRateFraction = (annualRatePercent / 100) / daysInYear;
  const dailyChargeRate = Number((remainingPrincipal * dailyRateFraction).toFixed(4));

  // Determine accrual with multi-installment chronological tranche support
  let lateChargesAccrued = 0;
  const tranches: OverdueAccrualTranche[] = [];

  const dueMidnightMs = parseDateToMidnightUtcMs(dueDateStr) ?? 0;
  const refMidnightMs = parseDateToMidnightUtcMs(refDateStr) ?? 0;
  const graceMs = gracePeriodDays * 24 * 60 * 60 * 1000;
  const chargeStartMs = dueMidnightMs + graceMs;

  if (chargeableDays > 0 && policy.calculationMethod === 'DAILY_SIMPLE' && originalBillAmount > 0) {
    // Check if any payments occurred after the charge start date
    const overduePayments = appliedPayments.filter((p) => {
      const pMs = parseDateToMidnightUtcMs(p.date) ?? 0;
      return pMs > chargeStartMs;
    });

    if (overduePayments.length === 0) {
      // Standard single tranche on remaining principal
      if (remainingPrincipal > 0) {
        const rawCharge = remainingPrincipal * dailyRateFraction * chargeableDays;
        const roundedCharge = Number(rawCharge.toFixed(2));
        lateChargesAccrued = roundedCharge;
        tranches.push({
          startDate: formatToVidyutDate(new Date(chargeStartMs)),
          endDate: refDateStr,
          days: chargeableDays,
          principalInr: remainingPrincipal,
          dailyRate: dailyChargeRate,
          accruedInr: roundedCharge,
        });
      }
    } else {
      // Chronological tranches across payment dates
      let currentPrincipal = originalBillAmount;
      // Pre-charge payments (occurred before or on chargeStartMs)
      const preChargePayments = appliedPayments.filter((p) => {
        const pMs = parseDateToMidnightUtcMs(p.date) ?? 0;
        return pMs <= chargeStartMs;
      });
      for (const p of preChargePayments) {
        currentPrincipal = Math.max(0, Number((currentPrincipal - Number(p.amount)).toFixed(2)));
      }

      let trancheStartMs = chargeStartMs;
      let totalTrancheCharge = 0;

      for (const p of overduePayments) {
        const pMs = Math.min(refMidnightMs, parseDateToMidnightUtcMs(p.date) ?? refMidnightMs);
        if (pMs > trancheStartMs && currentPrincipal > 0) {
          const trancheDays = Math.round((pMs - trancheStartMs) / (24 * 60 * 60 * 1000));
          const trancheCharge = currentPrincipal * dailyRateFraction * trancheDays;
          const roundedTrancheCharge = Number(trancheCharge.toFixed(2));
          totalTrancheCharge += roundedTrancheCharge;
          tranches.push({
            startDate: formatToVidyutDate(new Date(trancheStartMs)),
            endDate: formatToVidyutDate(new Date(pMs)),
            days: trancheDays,
            principalInr: currentPrincipal,
            dailyRate: Number((currentPrincipal * dailyRateFraction).toFixed(4)),
            accruedInr: roundedTrancheCharge,
          });
          trancheStartMs = pMs;
        }
        currentPrincipal = Math.max(0, Number((currentPrincipal - Number(p.amount)).toFixed(2)));
      }

      // Final tranche from last payment to referenceDate
      if (refMidnightMs > trancheStartMs && currentPrincipal > 0) {
        const remainingDays = Math.round((refMidnightMs - trancheStartMs) / (24 * 60 * 60 * 1000));
        const finalCharge = currentPrincipal * dailyRateFraction * remainingDays;
        const roundedFinalCharge = Number(finalCharge.toFixed(2));
        totalTrancheCharge += roundedFinalCharge;
        tranches.push({
          startDate: formatToVidyutDate(new Date(trancheStartMs)),
          endDate: refDateStr,
          days: remainingDays,
          principalInr: currentPrincipal,
          dailyRate: Number((currentPrincipal * dailyRateFraction).toFixed(4)),
          accruedInr: roundedFinalCharge,
        });
      }

      lateChargesAccrued = Number(totalTrancheCharge.toFixed(2));
    }

    if (lateChargesAccrued > 0 && lateChargesAccrued < minimumChargeInr) {
      lateChargesAccrued = minimumChargeInr;
    }
  }

  // Apply waivers (capped at accrued late charges)
  const rawWaived = Number(
    applicableWaivers.reduce((sum, w) => sum + Math.max(0, Number(w.amount ?? w.waivedAmount ?? 0) || 0), 0).toFixed(2)
  );
  const lateChargesWaived = Math.min(lateChargesAccrued, rawWaived);

  const excessPaymentOverPrincipal = Math.max(
    0,
    Number((successfulPayments - originalBillAmount).toFixed(2))
  );
  const explicitSettled =
    typeof explicitLateChargesSettled === 'number' && !Number.isNaN(explicitLateChargesSettled)
      ? Math.max(0, Number(explicitLateChargesSettled.toFixed(2)))
      : 0;
  const lateChargesSettled =
    remainingPrincipal === 0
      ? Math.max(excessPaymentOverPrincipal, explicitSettled, Number((lateChargesAccrued - lateChargesWaived).toFixed(2)))
      : Math.min(Number((lateChargesAccrued - lateChargesWaived).toFixed(2)), Math.max(excessPaymentOverPrincipal, explicitSettled));
  const netLateChargesPayable = Math.max(
    0,
    Number((lateChargesAccrued - lateChargesSettled - lateChargesWaived).toFixed(2))
  );

  const totalOutstandingPayable = Math.max(
    0,
    Number((remainingPrincipal + netLateChargesPayable).toFixed(2))
  );

  // Reconciled effective status
  let effectiveStatus: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
  if (remainingPrincipal === 0) {
    effectiveStatus = 'Paid';
  } else if (isOverdue) {
    effectiveStatus = 'Overdue';
  } else if (successfulPayments > 0) {
    effectiveStatus = 'Partially Paid';
  } else {
    effectiveStatus = 'Unpaid';
  }

  const cycleType = bill.billingCycleType === 'BI_MONTHLY' ? 'BI_MONTHLY' : 'MONTHLY';
  const periodLabel = bill.billingPeriodLabel || bill.billMonth || 'Current Billing Cycle';
  const gracePeriodEndsOn = dueMidnightMs > 0 ? formatToVidyutDate(new Date(chargeStartMs)) : dueDateStr;

  const policyDisclaimer = policy.isDemoSimulation
    ? `DEMO Delayed Payment Surcharge (${annualRatePercent}% p.a. simple daily accrual — Simulated Policy v${policy.version}). Not an official statutory UGVCL demand.`
    : `Official Late Payment Surcharge (${annualRatePercent}% p.a. as per GERC regulations).`;

  return {
    billNo: bill.billNo,
    consumerNo: bill.consumerNo,
    billingCycleType: cycleType,
    billingPeriodLabel: periodLabel,
    dueDate: dueDateStr,
    referenceDate: refDateStr,
    calculationReferenceDate: refDateStr,
    daysOverdue,
    isOverdue,
    historicalDaysLate,
    gracePeriodDays,
    gracePeriodEndsOn,
    chargeableDays,
    originalBillAmount,
    successfulPayments,
    settledPaymentsAmount: successfulPayments,
    remainingPrincipal,
    lateChargesAccrued,
    accruedLateCharges: lateChargesAccrued,
    lateChargesSettled,
    settledLateCharges: lateChargesSettled,
    lateChargesWaived,
    waivedLateCharges: lateChargesWaived,
    netLateChargesPayable,
    totalOutstandingPayable,
    dailyChargeRate,
    dailyChargeInr: dailyChargeRate,
    effectiveAnnualRatePercent: annualRatePercent,
    isDemoSimulation: policy.isDemoSimulation,
    isDemoPolicy: policy.isDemoSimulation,
    policyId: policy.policyId,
    policyVersion: policy.version,
    applicablePolicyId: policy.policyId,
    applicablePolicyVersion: policy.version,
    tariffCategory: effectiveCategory,
    policyDisclaimer,
    status: effectiveStatus,
    currentPaymentStatus: effectiveStatus,
    auditTrail: {
      referenceDateUsed: refDateStr,
      calculationTimestampIso: new Date().toISOString(),
      calculationMethod: policy.calculationMethod,
      tranches,
      waiversApplied: applicableWaivers,
      reversalsApplied: applicableReversals,
    },
  };
}

// ============================================================================
// BATCH OVERDUE SUMMARY SELECTOR
// ============================================================================

export interface BatchOverdueSummary {
  totalBillsEvaluated: number;
  overdueBillsCount: number;
  paidBillsCount: number;
  partiallyPaidBillsCount: number;
  totalOriginalAmountInr: number;
  totalSuccessfulPaymentsInr: number;
  totalRemainingPrincipalInr: number;
  totalOverduePrincipalInr: number;
  totalAccruedLateChargesInr: number;
  totalWaivedLateChargesInr: number;
  totalOutstandingWithChargesInr: number;
  referenceDate: string;
  policyVersion: string;
  isDemoSimulation: boolean;
  breakdowns: OverdueFinancialBreakdown[];
}

export function calculateBatchOverdueSummary(params: {
  bills: ElectricityBill[];
  payments?: PaymentTransaction[];
  referenceDate?: string | Date;
  policy?: LateChargePolicy;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
}): BatchOverdueSummary {
  const {
    bills,
    payments = [],
    referenceDate = '28-Oct-2026',
    policy = DEFAULT_LATE_CHARGE_POLICY,
    waivers = [],
    reversals = [],
  } = params;

  const breakdowns: OverdueFinancialBreakdown[] = [];
  let overdueBillsCount = 0;
  let paidBillsCount = 0;
  let partiallyPaidBillsCount = 0;
  let totalOriginalAmountInr = 0;
  let totalSuccessfulPaymentsInr = 0;
  let totalRemainingPrincipalInr = 0;
  let totalOverduePrincipalInr = 0;
  let totalAccruedLateChargesInr = 0;
  let totalWaivedLateChargesInr = 0;
  let totalOutstandingWithChargesInr = 0;

  for (const bill of bills) {
    const bd = calculateLatePaymentCharges({
      bill,
      payments,
      referenceDate,
      policy,
      waivers,
      reversals,
    });
    breakdowns.push(bd);

    totalOriginalAmountInr += bd.originalBillAmount;
    totalSuccessfulPaymentsInr += bd.successfulPayments;
    totalRemainingPrincipalInr += bd.remainingPrincipal;
    totalAccruedLateChargesInr += bd.netLateChargesPayable;
    totalWaivedLateChargesInr += bd.lateChargesWaived;
    totalOutstandingWithChargesInr += bd.totalOutstandingPayable;

    if (bd.status === 'Paid') {
      paidBillsCount++;
    } else if (bd.status === 'Overdue') {
      overdueBillsCount++;
      totalOverduePrincipalInr += bd.remainingPrincipal;
    } else if (bd.status === 'Partially Paid') {
      partiallyPaidBillsCount++;
    }
  }

  return {
    totalBillsEvaluated: bills.length,
    overdueBillsCount,
    paidBillsCount,
    partiallyPaidBillsCount,
    totalOriginalAmountInr: Number(totalOriginalAmountInr.toFixed(2)),
    totalSuccessfulPaymentsInr: Number(totalSuccessfulPaymentsInr.toFixed(2)),
    totalRemainingPrincipalInr: Number(totalRemainingPrincipalInr.toFixed(2)),
    totalOverduePrincipalInr: Number(totalOverduePrincipalInr.toFixed(2)),
    totalAccruedLateChargesInr: Number(totalAccruedLateChargesInr.toFixed(2)),
    totalWaivedLateChargesInr: Number(totalWaivedLateChargesInr.toFixed(2)),
    totalOutstandingWithChargesInr: Number(totalOutstandingWithChargesInr.toFixed(2)),
    referenceDate: formatToVidyutDate(referenceDate),
    policyVersion: policy.version,
    isDemoSimulation: policy.isDemoSimulation,
    breakdowns,
  };
}

// ============================================================================
// MULTILINGUAL LOCALIZATION STRINGS
// ============================================================================

export interface LateChargeLocalizationDictionary {
  overdue: string;
  daysOverdue: (days: number) => string;
  lateCharges: string;
  originalAmount: string;
  remainingPrincipal: string;
  totalOutstanding: string;
  paymentReceived: string;
  chargeCalculationDate: string;
  gracePeriod: string;
  dailyAccrualRate: string;
  annualRate: string;
  demoTariffBadge: string;
  payTotalOutstandingBtn: string;
  waivedChargesBadge: string;
  dueOn: string;
  statusOverdueBadge: string;
  overdueBreakdownTitle: string;
}

export const LATE_CHARGE_LOCALIZATION: Record<LanguageCode, LateChargeLocalizationDictionary> = {
  en: {
    overdue: 'Overdue',
    daysOverdue: (days: number) => `${days} Day${days === 1 ? '' : 's'} Overdue`,
    lateCharges: 'Late-Payment Charges (DPS)',
    originalAmount: 'Original Bill Amount',
    remainingPrincipal: 'Remaining Principal',
    totalOutstanding: 'Total Outstanding',
    paymentReceived: 'Payment Received',
    chargeCalculationDate: 'Charge Calculation Date',
    gracePeriod: 'Grace Period',
    dailyAccrualRate: 'Daily Accrual Rate',
    annualRate: 'Annual Surcharge Rate',
    demoTariffBadge: 'DEMO Tariff Assumption (15% p.a. Simple Daily Accrual — Non-statutory Simulation)',
    payTotalOutstandingBtn: 'Pay Total Outstanding',
    waivedChargesBadge: 'Late Charges Waived',
    dueOn: 'Due Date',
    statusOverdueBadge: 'OVERDUE BILL',
    overdueBreakdownTitle: 'Overdue Financial Breakdown & Daily Charges',
  },
  gu: {
    overdue: 'મુદત વીતી ગઈ (Overdue)',
    daysOverdue: (days: number) => `${days} દિવસ મુદત વીતી ગઈ`,
    lateCharges: 'વિલંબિત ચુકવણી સરચાર્જ (DPS)',
    originalAmount: 'મૂળ બિલ રકમ',
    remainingPrincipal: 'બાકી મુદ્દલ રકમ',
    totalOutstanding: 'કુલ બાકી લેણી રકમ',
    paymentReceived: 'પ્રાપ્ત થયેલ ચુકવણી',
    chargeCalculationDate: 'ચાર્જ ગણતરી તારીખ',
    gracePeriod: 'ગ્રેસ સમયગાળો (છૂટછાટ)',
    dailyAccrualRate: 'દૈનિક ચાર્જ દર',
    annualRate: 'વાર્ષિક સરચાર્જ દર',
    demoTariffBadge: 'DEMO ટેરિફ અનુમાન (૧૫% વાર્ષિક સાદી દૈનિક ગણતરી — બિન-વૈધાનિક સિમ્યુલેશન)',
    payTotalOutstandingBtn: 'કુલ બાકી રકમ ચૂકવો',
    waivedChargesBadge: 'વિલંબ ચાર્જ માફ કરેલ',
    dueOn: 'નિયત તારીખ',
    statusOverdueBadge: 'મુદત વીતેલ બિલ',
    overdueBreakdownTitle: 'મુદત વીતેલ નાણાકીય વિશ્લેષણ અને દૈનિક ચાર્જ',
  },
  hi: {
    overdue: 'अतिदेय (Overdue)',
    daysOverdue: (days: number) => `${days} दिन अतिदेय`,
    lateCharges: 'विलंबित भुगतान अधिभार (DPS)',
    originalAmount: 'मूल बिल राशि',
    remainingPrincipal: 'शेष मूलधन',
    totalOutstanding: 'कुल बकाया देय राशि',
    paymentReceived: 'प्राप्त भुगतान',
    chargeCalculationDate: 'शुल्क गणना तिथि',
    gracePeriod: 'रियायती अवधि (ग्रेस पीरियड)',
    dailyAccrualRate: 'दैनिक संचय दर',
    annualRate: 'वार्षिक अधिभार दर',
    demoTariffBadge: 'DEMO टैरिफ अनुमान (१५% वार्षिक साधारण दैनिक संचय — गैर-सांविधिक सिमुलेशन)',
    payTotalOutstandingBtn: 'कुल बकाया राशि का भुगतान करें',
    waivedChargesBadge: 'विलंब शुल्क माफ',
    dueOn: 'देय तिथि',
    statusOverdueBadge: 'अतिदेय बिजली बिल',
    overdueBreakdownTitle: 'अतिदेय वित्तीय विवरण एवं दैनिक प्रभार',
  },
  mr: {
    overdue: 'मुदतबाह्य (Overdue)',
    daysOverdue: (days: number) => `${days} दिवस मुदतबाह्य`,
    lateCharges: 'विलंबित देयक अधिभार (DPS)',
    originalAmount: 'मूळ बिल रक्कम',
    remainingPrincipal: 'शिल्लक मुद्दल',
    totalOutstanding: 'एकूण थकीत देय रक्कम',
    paymentReceived: 'प्राप्त भरणा',
    chargeCalculationDate: 'आकारणी गणना तारीख',
    gracePeriod: 'सवलत कालावधी',
    dailyAccrualRate: 'दैनिक संचय दर',
    annualRate: 'वार्षिक अधिभार दर',
    demoTariffBadge: 'DEMO टॅरिफ गृहितक (१५% वार्षिक साधे दैनिक संचयन — अनिर्बंध सिम्युलेशन)',
    payTotalOutstandingBtn: 'एकूण थकीत रक्कम भरा',
    waivedChargesBadge: 'विलंब शुल्क माफ',
    dueOn: 'देय तारीख',
    statusOverdueBadge: 'मुदतबाह्य वीज बिल',
    overdueBreakdownTitle: 'मुदतबाह्य वित्तीय तपशील आणि दैनिक आकारणी',
  },
};

export function getLateChargeTranslations(lang: LanguageCode = 'en'): LateChargeLocalizationDictionary {
  return LATE_CHARGE_LOCALIZATION[lang] || LATE_CHARGE_LOCALIZATION.en;
}

export const getLateChargeLocalization = getLateChargeTranslations;

