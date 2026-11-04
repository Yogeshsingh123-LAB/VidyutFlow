import {
  ElectricityBill,
  ElectricityConnection,
  PaymentTransaction,
  AppNotification,
  UserRole,
  TariffCategory,
} from '../types';
import { Language } from '../i18n/types';
import {
  LateChargePolicyConfig,
  LateChargeWaiverRecord,
  PaymentReversalRecord,
  DEFAULT_LATE_CHARGE_POLICY,
  parseDateToMidnightUtcMs,
  parseFlexibleBillDateToIstMidnight,
  formatDateDdMmmYyyy,
} from './lateChargeEngine';
import {
  ReconciledBillSummary,
  reconcileBillWithPayments,
  normalizeBillingIdentifier,
} from './billingEngine';
import { normalizeCanonicalSubdivision } from '../i18n/consumerContentTranslations';

// ============================================================================
// 1. CANONICAL 9-FIELD OVERDUE & OUTSTANDING BALANCE MODEL (STEP 4B)
// ============================================================================

export interface Canonical9FieldBillStatement {
  billNo: string;
  consumerNo: string;
  connectionId: string;
  consumerName: string;
  subdivision: string;
  tariffCategory: TariffCategory;
  billMonth: string;
  billingCycleType: 'MONTHLY' | 'BI_MONTHLY';
  // The 9 required canonical fields across every view:
  originalBillAmount: number;          // 1. Original bill amount
  paymentsSuccessfullySettled: number; // 2. Payments successfully settled
  remainingPrincipal: number;          // 3. Remaining principal
  accruedLatePaymentCharges: number;   // 4. Accrued late-payment charges (net payable DPS)
  grossAccruedLateCharges: number;     // Gross accrued before waivers/settlement
  chargesAlreadyPaidOrWaived: number;  // 5. Charges already paid or waived
  totalCurrentOutstanding: number;     // 6. Total current outstanding (Remaining Principal + Net Late Charges)
  originalDueDate: string;             // 7. Original due date
  daysOverdue: number;                 // 8. Days overdue
  lastCalculationDate: string;         // 9. Last calculation date (reference date)
  // Supporting metadata & aliases
  dailyLateChargeAccrual: number;
  dailyLateChargeRate: number;
  annualRatePercent: number;
  effectiveAnnualRatePercent: number;
  policyId: string;
  tariffPolicyCode: string;
  policyVersion: string;
  isDemoPolicy: boolean;
  isDemoSimulation: boolean;
  policyDisclaimer: string;
  derivedStatus: ElectricityBill['status'];
  effectiveStatus: ElectricityBill['status'];
  isOverdue: boolean;
  isFullySettled: boolean;
}

export interface DeriveCanonical9FieldBillStatementParams {
  bill: ElectricityBill;
  payments?: PaymentTransaction[];
  referenceDate?: string | Date;
  connection?: ElectricityConnection | null;
  policy?: LateChargePolicyConfig;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  lateChargesSettled?: number;
  language?: Language;
}

/**
 * Derives the single canonical 9-field financial statement for a bill from its
 * Step 4A ReconciledBillSummary. Every UI view, calendar milestone, notice, and
 * account statement MUST read from this canonical function.
 * Supports both positional `(bill, payments, options)` and object `({ bill, payments, ... })` signatures.
 */
export function deriveCanonical9FieldBillStatement(
  billOrParams: ElectricityBill | DeriveCanonical9FieldBillStatementParams,
  paymentsArg?: PaymentTransaction[],
  optionsArg?: {
    referenceDate?: string | Date;
    connection?: ElectricityConnection | null;
    policy?: LateChargePolicyConfig;
    waivers?: LateChargeWaiverRecord[];
    reversals?: PaymentReversalRecord[];
    lateChargesSettled?: number;
    language?: Language;
  }
): Canonical9FieldBillStatement {
  const isParamsObj =
    billOrParams &&
    typeof billOrParams === 'object' &&
    'bill' in billOrParams &&
    Boolean((billOrParams as DeriveCanonical9FieldBillStatementParams).bill);

  const bill: ElectricityBill = isParamsObj
    ? (billOrParams as DeriveCanonical9FieldBillStatementParams).bill
    : (billOrParams as ElectricityBill);

  const payments: PaymentTransaction[] = isParamsObj
    ? (billOrParams as DeriveCanonical9FieldBillStatementParams).payments || []
    : paymentsArg || [];

  const options = isParamsObj
    ? (billOrParams as DeriveCanonical9FieldBillStatementParams)
    : optionsArg;

  const refDateStr =
    typeof options?.referenceDate === 'string'
      ? options.referenceDate
      : options?.referenceDate instanceof Date
      ? formatDateDdMmmYyyy(options.referenceDate)
      : '28-Oct-2026';

  const reconciled: ReconciledBillSummary = reconcileBillWithPayments(
    bill,
    payments,
    refDateStr,
    {
      policy: options?.policy || DEFAULT_LATE_CHARGE_POLICY,
      waivers: options?.waivers,
      reversals: options?.reversals,
      lateChargesSettled: options?.lateChargesSettled,
      language: options?.language || 'en',
    }
  );

  const lc = reconciled.lateChargeBreakdown;
  const chargesAlreadyPaidOrWaived = Number(
    (lc.lateChargesWaived + lc.lateChargesSettled).toFixed(2)
  );

  return {
    billNo: bill.billNo,
    consumerNo: bill.consumerNo,
    connectionId:
      bill.connectionId ||
      options?.connection?.connectionId ||
      `CONN-${bill.consumerNo}`,
    consumerName: options?.connection?.consumerName || 'UGVCL Consumer',
    subdivision: normalizeCanonicalSubdivision(
      options?.connection?.subdivision || 'Mehsana City North'
    ),
    tariffCategory: options?.connection?.tariffCategory || 'Residential (RGPU)',
    billMonth: bill.billMonth,
    billingCycleType: bill.billingCycleType || 'BI_MONTHLY',
    // 1..9 Canonical Fields:
    originalBillAmount: lc.originalBillAmount,
    paymentsSuccessfullySettled: lc.successfulPayments,
    remainingPrincipal: lc.remainingPrincipal,
    accruedLatePaymentCharges: lc.netLateChargesPayable,
    grossAccruedLateCharges: lc.lateChargesAccrued,
    chargesAlreadyPaidOrWaived,
    totalCurrentOutstanding: lc.totalOutstandingPayable,
    originalDueDate: bill.dueDate,
    daysOverdue: lc.daysOverdue,
    lastCalculationDate: lc.referenceDate,
    // Metadata & Aliases:
    dailyLateChargeAccrual: lc.dailyChargeRate,
    dailyLateChargeRate: lc.dailyChargeRate,
    annualRatePercent: lc.effectiveAnnualRatePercent,
    effectiveAnnualRatePercent: lc.effectiveAnnualRatePercent,
    policyId: lc.policyId,
    tariffPolicyCode: `${lc.policyId} (${lc.policyVersion})`,
    policyVersion: lc.policyVersion,
    isDemoPolicy: lc.isDemoPolicy,
    isDemoSimulation: lc.isDemoPolicy,
    policyDisclaimer: lc.policyDisclaimer,
    derivedStatus: reconciled.derivedStatus,
    effectiveStatus: reconciled.derivedStatus,
    isOverdue: lc.daysOverdue > 0 && lc.totalOutstandingPayable > 0,
    isFullySettled: lc.totalOutstandingPayable <= 0.009,
  };
}

// ============================================================================
// 2. FORMAL NOTICE WORKFLOW & SECTION 56 SAFEGUARDS (STEP 4B)
// ============================================================================

export type FormalNoticeStatus =
  | 'NOT_REQUIRED'
  | 'ELIGIBLE_FOR_REVIEW'
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'SERVICE_PENDING'
  | 'SERVED'
  | 'DEADLINE_APPROACHING'
  | 'DEADLINE_REACHED'
  | 'ON_HOLD'
  | 'WITHDRAWN'
  | 'RESOLVED';

export type FormalNoticeServiceMethod =
  | 'REGISTERED_POST_ACK'
  | 'IN_PERSON_SIGNATURE'
  | 'ELECTRONIC_PORTAL_DEMO'
  | 'PORTAL_AND_SMS_DEMO';

export interface FormalNoticePolicyConfig {
  policyId: string;
  version: string;
  effectiveFrom: string;
  isDemoPolicy: boolean;
  isDemoSimulation: boolean;
  minimumDaysOverdueForEligibility: number;
  minimumPrincipalForEligibilityInr: number;
  statutoryClearDaysNoticePeriod: number; // 15 clear days under Section 56(1), Electricity Act 2003
  clearNoticePeriodDays: number;
  deadlineApproachingThresholdDays: number; // 3 days before deadline
  requireSdoOrManagementApproval: boolean;
  neverAutoDisconnectOnExpiry: true; // Hard invariant: never automatically disconnect
  statutoryCitation: string;
  demoSafeguardDisclosure: string;
}

export const DEFAULT_FORMAL_NOTICE_POLICY: FormalNoticePolicyConfig = {
  policyId: 'UGVCL-DEMO-SEC56-NOTICE-2026-V1',
  version: 'v1.0-DEMO-SEC56',
  effectiveFrom: '01-Apr-2026',
  isDemoPolicy: true,
  isDemoSimulation: true,
  minimumDaysOverdueForEligibility: 5,
  minimumPrincipalForEligibilityInr: 500,
  statutoryClearDaysNoticePeriod: 15,
  clearNoticePeriodDays: 15,
  deadlineApproachingThresholdDays: 3,
  requireSdoOrManagementApproval: true,
  neverAutoDisconnectOnExpiry: true,
  statutoryCitation:
    'Section 56(1), Electricity Act, 2003 & GERC Supply Code Regulations (15 Clear Days Written Notice — DEMO Simulation)',
  demoSafeguardDisclosure:
    'DEMO SIMULATION SAFEGUARD: This notice record is a simulated administrative workflow under Section 56(1) of the Electricity Act, 2003 (15 clear days notice). It is NOT a legally served statutory disconnection demand, and expiry of the notice deadline triggers Authorized Administrative Review only — never automatic physical disconnection.',
};

export interface FormalNoticeSnapshotAtIssuance {
  originalBillAmount: number;
  paymentsSettledAtIssuance: number;
  principalAtIssuance: number;
  lateChargesAtIssuance: number;
  waivedChargesAtIssuance: number;
  totalOutstandingAtIssuance: number;
  daysOverdueAtIssuance: number;
  originalDueDate: string;
  snapshotReferenceDate: string;
}

export interface FormalNoticeCurrentBalanceView {
  originalBillAmount: number;
  paymentsSuccessfullySettled: number;
  remainingPrincipal: number;
  accruedLatePaymentCharges: number;
  chargesAlreadyPaidOrWaived: number;
  totalCurrentOutstanding: number;
  originalDueDate: string;
  daysOverdue: number;
  lastCalculationDate: string;
}

export interface FormalNoticeHoldOrDispute {
  isOnHold: boolean;
  holdReason?: string;
  disputeReferenceId?: string;
  placedByActor?: string;
  placedByRole?: UserRole;
  placedAt?: string;
}

export interface FormalNoticeResolution {
  resolvedAt?: string;
  resolutionType?: 'FULL_PAYMENT_SETTLED' | 'AUTHORIZED_WITHDRAWAL' | 'WAIVER_SETTLED';
  resolvedByActor?: string;
  resolvedByRole?: UserRole;
  notes?: string;
}

export interface FormalNoticeAuditEntry {
  timestamp: string;
  actor: string;
  role: UserRole;
  fromStatus?: FormalNoticeStatus;
  toStatus: FormalNoticeStatus;
  note: string;
}

export type DisconnectionReviewStatus =
  | 'NOT_APPLICABLE'
  | 'NOTICE_PERIOD_ACTIVE'
  | 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD'
  | 'ON_HOLD_PROTECTED'
  | 'AUTHORIZED_REVIEW_REQUIRED'
  | 'RESOLVED_NO_ACTION'
  | 'RESOLVED_BY_SETTLEMENT'
  | 'WITHDRAWN';

export interface FormalNoticeRecord {
  noticeId: string;
  billNo: string;
  consumerNo: string;
  connectionId: string;
  consumerName: string;
  subdivision: string;
  tariffCategory: TariffCategory;
  status: FormalNoticeStatus;
  policyId: string;
  policyVersion: string;
  isDemoSimulation: true;
  statutoryCitation: string;
  statutoryReferenceLabel: string;
  demoSafeguardDisclosure: string;
  statutoryNoticePeriodDays: number;
  createdAt: string;
  createdByActor: string;
  createdByRole: UserRole;
  submittedForApprovalAt?: string;
  approvedAt?: string;
  approvedByActor?: string;
  approvedBy?: string;
  approvedByRole?: UserRole;
  issueDate?: string;
  serviceDate?: string;
  serviceMethod?: FormalNoticeServiceMethod;
  serviceChannel?: FormalNoticeServiceMethod;
  serviceEvidenceRef?: string;
  paymentDeadlineDate?: string;
  daysRemainingUntilDeadline: number | null;
  daysRemaining: number | null;
  isDeadlineApproaching: boolean;
  isDeadlineReached: boolean;
  disconnectionReviewStatus: DisconnectionReviewStatus;
  snapshotAtIssuance: FormalNoticeSnapshotAtIssuance;
  currentBalanceView: FormalNoticeCurrentBalanceView;
  holdOrDispute: FormalNoticeHoldOrDispute;
  resolution?: FormalNoticeResolution;
  auditHistory: FormalNoticeAuditEntry[];
}

function normalizeRoleInput(role?: string | UserRole): UserRole {
  const lower = (role || 'employee').toString().toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'management') return 'management';
  if (lower === 'field') return 'field';
  if (lower === 'consumer') return 'consumer';
  return 'employee';
}

/**
 * Adds a specified number of calendar days to an IST midnight date and formats as DD-MMM-YYYY.
 */
export function addClearDaysToBillDate(
  startDateInput: string | Date,
  clearDays: number
): string {
  const startMs = parseDateToMidnightUtcMs(startDateInput);
  if (startMs === null) return '08-Nov-2026';
  const targetMs = startMs + clearDays * 24 * 60 * 60 * 1000;
  return formatDateDdMmmYyyy(new Date(targetMs));
}

/**
 * Computes remaining calendar days from referenceDate to deadlineDate in IST.
 * Positive = days remaining; 0 = due today; Negative = deadline expired by |N| days.
 */
export function calculateDaysUntilNoticeDeadline(
  deadlineDateInput: string | Date | undefined,
  referenceDateInput: string | Date
): number | null {
  if (!deadlineDateInput) return null;
  const deadlineMs = parseDateToMidnightUtcMs(deadlineDateInput);
  const refMs = parseDateToMidnightUtcMs(referenceDateInput);
  if (deadlineMs === null || refMs === null) return null;
  return Math.round((deadlineMs - refMs) / (24 * 60 * 60 * 1000));
}

/**
 * Evaluates whether an unpaid overdue bill is eligible for formal notice review.
 */
export function evaluateNoticeEligibilityForBill(
  statement: Canonical9FieldBillStatement,
  existingNotice?: FormalNoticeRecord | null,
  policy: FormalNoticePolicyConfig = DEFAULT_FORMAL_NOTICE_POLICY
): {
  eligible: boolean;
  recommendedStatus: FormalNoticeStatus;
  reason: string;
} {
  if (statement.isFullySettled || statement.totalCurrentOutstanding <= 0.009) {
    return {
      eligible: false,
      recommendedStatus: existingNotice ? 'RESOLVED' : 'NOT_REQUIRED',
      reason: 'Bill balance is fully settled. No formal notice required.',
    };
  }

  if (existingNotice && existingNotice.status !== 'WITHDRAWN' && existingNotice.status !== 'RESOLVED') {
    return {
      eligible: true,
      recommendedStatus: existingNotice.status,
      reason: `Active formal notice ${existingNotice.noticeId} is currently in ${existingNotice.status} state.`,
    };
  }

  if (
    statement.daysOverdue >= policy.minimumDaysOverdueForEligibility &&
    statement.remainingPrincipal >= policy.minimumPrincipalForEligibilityInr
  ) {
    return {
      eligible: true,
      recommendedStatus: 'ELIGIBLE_FOR_REVIEW',
      reason: `Bill is ${statement.daysOverdue} days overdue with ₹${statement.remainingPrincipal.toFixed(2)} remaining principal (meets DEMO threshold of ${policy.minimumDaysOverdueForEligibility} days / ₹${policy.minimumPrincipalForEligibilityInr}).`,
    };
  }

  return {
    eligible: false,
    recommendedStatus: 'NOT_REQUIRED',
    reason: `Bill does not yet meet the ${policy.minimumDaysOverdueForEligibility}-day / ₹${policy.minimumPrincipalForEligibilityInr} threshold for Section 56 notice review.`,
  };
}

/**
 * Creates a new DRAFT Formal Notice record for an eligible overdue bill.
 * Requires employee, management, or admin role.
 */
export function createDraftFormalNotice(params: {
  statement: Canonical9FieldBillStatement;
  actorName?: string;
  createdBy?: string;
  actorRole?: UserRole | string;
  subdivision?: string;
  noticeId?: string;
  policy?: FormalNoticePolicyConfig;
  note?: string;
}): FormalNoticeRecord {
  const { statement } = params;
  const actorName = params.actorName || params.createdBy || 'Subdivision Billing Officer';
  const actorRole = normalizeRoleInput(params.actorRole || 'employee');
  if (actorRole !== 'employee' && actorRole !== 'management' && actorRole !== 'admin') {
    throw new Error('Unauthorized role: Only authorized utility officers may draft a formal notice.');
  }
  const policy = params.policy || DEFAULT_FORMAL_NOTICE_POLICY;
  const noticeId =
    params.noticeId ||
    `NTC-${statement.billNo.replace(/^BILL-/, '')}`;

  const snapshotAtIssuance: FormalNoticeSnapshotAtIssuance = {
    originalBillAmount: statement.originalBillAmount,
    paymentsSettledAtIssuance: statement.paymentsSuccessfullySettled,
    principalAtIssuance: statement.remainingPrincipal,
    lateChargesAtIssuance: statement.accruedLatePaymentCharges,
    waivedChargesAtIssuance: statement.chargesAlreadyPaidOrWaived,
    totalOutstandingAtIssuance: statement.totalCurrentOutstanding,
    daysOverdueAtIssuance: statement.daysOverdue,
    originalDueDate: statement.originalDueDate,
    snapshotReferenceDate: statement.lastCalculationDate,
  };

  const currentBalanceView: FormalNoticeCurrentBalanceView = {
    originalBillAmount: statement.originalBillAmount,
    paymentsSuccessfullySettled: statement.paymentsSuccessfullySettled,
    remainingPrincipal: statement.remainingPrincipal,
    accruedLatePaymentCharges: statement.accruedLatePaymentCharges,
    chargesAlreadyPaidOrWaived: statement.chargesAlreadyPaidOrWaived,
    totalCurrentOutstanding: statement.totalCurrentOutstanding,
    originalDueDate: statement.originalDueDate,
    daysOverdue: statement.daysOverdue,
    lastCalculationDate: statement.lastCalculationDate,
  };

  return {
    noticeId,
    billNo: statement.billNo,
    consumerNo: statement.consumerNo,
    connectionId: statement.connectionId,
    consumerName: statement.consumerName,
    subdivision: params.subdivision || statement.subdivision,
    tariffCategory: statement.tariffCategory,
    status: 'DRAFT',
    policyId: policy.policyId,
    policyVersion: policy.version,
    isDemoSimulation: true,
    statutoryCitation: policy.statutoryCitation,
    statutoryReferenceLabel: policy.statutoryCitation,
    demoSafeguardDisclosure: policy.demoSafeguardDisclosure,
    statutoryNoticePeriodDays: policy.statutoryClearDaysNoticePeriod,
    createdAt: statement.lastCalculationDate,
    createdByActor: actorName,
    createdByRole: actorRole,
    daysRemainingUntilDeadline: null,
    daysRemaining: null,
    isDeadlineApproaching: false,
    isDeadlineReached: false,
    disconnectionReviewStatus: 'NOT_APPLICABLE',
    snapshotAtIssuance,
    currentBalanceView,
    holdOrDispute: { isOnHold: false },
    auditHistory: [
      {
        timestamp: statement.lastCalculationDate,
        actor: actorName,
        role: actorRole,
        fromStatus: 'ELIGIBLE_FOR_REVIEW',
        toStatus: 'DRAFT',
        note:
          params.note ||
          `Drafted DEMO Section 56 notice for overdue bill ${statement.billNo} (Total Outstanding ₹${statement.totalCurrentOutstanding.toFixed(2)}).`,
      },
    ],
  };
}

/**
 * Submits a DRAFT notice for SDO / Management approval.
 */
export function submitFormalNoticeForApproval(
  notice: FormalNoticeRecord,
  actorName: string,
  actorRoleInput: UserRole | string = 'employee',
  referenceDate: string = '28-Oct-2026',
  note?: string
): FormalNoticeRecord {
  const actorRole = normalizeRoleInput(actorRoleInput);
  if (actorRole !== 'employee' && actorRole !== 'management' && actorRole !== 'admin') {
    throw new Error('Unauthorized role: Only utility officers can submit a notice for approval.');
  }
  return {
    ...notice,
    status: 'PENDING_APPROVAL',
    submittedForApprovalAt: referenceDate,
    auditHistory: [
      ...notice.auditHistory,
      {
        timestamp: referenceDate,
        actor: actorName,
        role: actorRole,
        fromStatus: notice.status,
        toStatus: 'PENDING_APPROVAL',
        note: note || 'Submitted formal notice draft for Sub-Divisional Officer / Management approval.',
      },
    ],
  };
}

/**
 * Approves a formal notice (requires employee SDO, management, or admin).
 */
export function approveFormalNotice(
  notice: FormalNoticeRecord,
  actorName: string,
  actorRoleInput: UserRole | string = 'employee',
  noteOrRefDate?: string,
  maybeNote?: string
): FormalNoticeRecord {
  const actorRole = normalizeRoleInput(actorRoleInput);
  if (actorRole !== 'employee' && actorRole !== 'management' && actorRole !== 'admin') {
    throw new Error('Unauthorized role: Formal notice approval requires authorized officer privileges.');
  }
  const isRefDate = Boolean(noteOrRefDate && parseDateToMidnightUtcMs(noteOrRefDate) !== null);
  const referenceDate = isRefDate ? noteOrRefDate! : notice.createdAt || '28-Oct-2026';
  const note = isRefDate ? maybeNote : noteOrRefDate;

  return {
    ...notice,
    status: 'APPROVED',
    approvedAt: referenceDate,
    approvedByActor: actorName,
    approvedBy: actorName,
    approvedByRole: actorRole,
    auditHistory: [
      ...notice.auditHistory,
      {
        timestamp: referenceDate,
        actor: actorName,
        role: actorRole,
        fromStatus: notice.status,
        toStatus: 'APPROVED',
        note: note || 'Approved DEMO Section 56 notice for issuance and service.',
      },
    ],
  };
}

/**
 * Issues and records service evidence for an approved formal notice.
 * Freezes `snapshotAtIssuance` at the issue/service moment and calculates the 15-day clear statutory deadline.
 */
export function issueAndServeFormalNotice(params: {
  notice: FormalNoticeRecord;
  statementAtIssuance?: Canonical9FieldBillStatement;
  statement?: Canonical9FieldBillStatement;
  actorName: string;
  actorRole: UserRole | string;
  issueDate: string;
  serviceDate?: string;
  serviceMethod?: FormalNoticeServiceMethod;
  serviceChannel?: FormalNoticeServiceMethod;
  serviceEvidenceRef?: string;
  markServedImmediately?: boolean;
  note?: string;
}): FormalNoticeRecord {
  const { notice, actorName, issueDate } = params;
  const statementAtIssuance = params.statementAtIssuance || params.statement!;
  const actorRole = normalizeRoleInput(params.actorRole);
  if (actorRole !== 'employee' && actorRole !== 'management' && actorRole !== 'admin') {
    throw new Error('Unauthorized role: Only authorized utility officers can issue or serve a formal notice.');
  }
  if (
    notice.status !== 'APPROVED' &&
    notice.status !== 'ISSUED' &&
    notice.status !== 'SERVICE_PENDING'
  ) {
    throw new Error(`Cannot issue notice from status ${notice.status}; notice must be APPROVED first.`);
  }

  const markServed = params.markServedImmediately !== false;
  const effectiveServiceDate = params.serviceDate || issueDate;
  const paymentDeadlineDate = markServed
    ? addClearDaysToBillDate(
        effectiveServiceDate,
        notice.statutoryNoticePeriodDays || 15
      )
    : undefined;

  // Freeze historical snapshot at issuance if not already issued
  const frozenSnapshot: FormalNoticeSnapshotAtIssuance =
    notice.issueDate && notice.snapshotAtIssuance
      ? notice.snapshotAtIssuance
      : {
          originalBillAmount: statementAtIssuance.originalBillAmount,
          paymentsSettledAtIssuance: statementAtIssuance.paymentsSuccessfullySettled,
          principalAtIssuance: statementAtIssuance.remainingPrincipal,
          lateChargesAtIssuance: statementAtIssuance.accruedLatePaymentCharges,
          waivedChargesAtIssuance: statementAtIssuance.chargesAlreadyPaidOrWaived,
          totalOutstandingAtIssuance: statementAtIssuance.totalCurrentOutstanding,
          daysOverdueAtIssuance: statementAtIssuance.daysOverdue,
          originalDueDate: statementAtIssuance.originalDueDate,
          snapshotReferenceDate: issueDate,
        };

  const daysRemaining =
    markServed && paymentDeadlineDate
      ? calculateDaysUntilNoticeDeadline(
          paymentDeadlineDate,
          statementAtIssuance.lastCalculationDate
        )
      : null;

  let nextStatus: FormalNoticeStatus = markServed ? 'SERVED' : 'SERVICE_PENDING';
  if (markServed && daysRemaining !== null) {
    if (daysRemaining <= 0) {
      nextStatus = 'DEADLINE_REACHED';
    } else if (daysRemaining <= 3) {
      nextStatus = 'DEADLINE_APPROACHING';
    }
  }

  const evidenceRef =
    params.serviceEvidenceRef ||
    `SRV-ACK-${notice.noticeId}-${effectiveServiceDate.replace(/[^A-Za-z0-9]/g, '')}`;
  const channel = params.serviceChannel || params.serviceMethod || 'ELECTRONIC_PORTAL_DEMO';

  return {
    ...notice,
    status: nextStatus,
    issueDate: notice.issueDate || issueDate,
    serviceDate: markServed ? effectiveServiceDate : undefined,
    serviceMethod: channel,
    serviceChannel: channel,
    serviceEvidenceRef: markServed ? evidenceRef : undefined,
    paymentDeadlineDate,
    daysRemainingUntilDeadline: daysRemaining,
    daysRemaining,
    isDeadlineApproaching:
      markServed && daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 3,
    isDeadlineReached: markServed && daysRemaining !== null && daysRemaining <= 0,
    disconnectionReviewStatus:
      markServed && daysRemaining !== null && daysRemaining <= 0
        ? 'AUTHORIZED_REVIEW_REQUIRED'
        : 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD',
    snapshotAtIssuance: frozenSnapshot,
    currentBalanceView: {
      originalBillAmount: statementAtIssuance.originalBillAmount,
      paymentsSuccessfullySettled: statementAtIssuance.paymentsSuccessfullySettled,
      remainingPrincipal: statementAtIssuance.remainingPrincipal,
      accruedLatePaymentCharges: statementAtIssuance.accruedLatePaymentCharges,
      chargesAlreadyPaidOrWaived: statementAtIssuance.chargesAlreadyPaidOrWaived,
      totalCurrentOutstanding: statementAtIssuance.totalCurrentOutstanding,
      originalDueDate: statementAtIssuance.originalDueDate,
      daysOverdue: statementAtIssuance.daysOverdue,
      lastCalculationDate: statementAtIssuance.lastCalculationDate,
    },
    auditHistory: [
      ...notice.auditHistory,
      {
        timestamp: markServed ? effectiveServiceDate : issueDate,
        actor: actorName,
        role: actorRole,
        fromStatus: notice.status,
        toStatus: nextStatus,
        note:
          params.note ||
          (markServed
            ? `Issued & served DEMO Section 56 notice (${evidenceRef}). 15-day statutory deadline set to ${paymentDeadlineDate}.`
            : `Issued DEMO Section 56 notice pending delivery verification. Enforceable 15-day countdown deferred until valid service evidence is recorded.`),
      },
    ],
  };
}

/**
 * Records verified delivery/service evidence for a notice that was previously in
 * `SERVICE_PENDING` or `ISSUED` state without verified service delivery.
 * Starts the 15-clear-day statutory countdown on the calendar day after `serviceDate`.
 */
export function recordFormalNoticeServiceEvidence(params: {
  notice: FormalNoticeRecord;
  statement: Canonical9FieldBillStatement;
  serviceDate: string;
  serviceEvidenceRef: string;
  serviceChannel?: FormalNoticeServiceMethod;
  actorName: string;
  actorRole: UserRole | string;
  note?: string;
}): FormalNoticeRecord {
  const trimmedRef = (params.serviceEvidenceRef || '').trim();
  if (!trimmedRef) {
    throw new Error('Valid serviceEvidenceRef is required to verify formal notice service.');
  }
  return issueAndServeFormalNotice({
    notice: params.notice,
    statementAtIssuance: params.statement,
    actorName: params.actorName,
    actorRole: params.actorRole,
    issueDate: params.notice.issueDate || params.serviceDate,
    serviceDate: params.serviceDate,
    serviceChannel: params.serviceChannel || params.notice.serviceChannel,
    serviceEvidenceRef: trimmedRef,
    markServedImmediately: true,
    note:
      params.note ||
      `Verified notice service evidence (${trimmedRef}) on ${params.serviceDate}.`,
  });
}

/**
 * Places an active formal notice on hold due to a billing dispute or administrative stay.
 * Protects the consumer connection from deadline expiry escalation while under dispute.
 * Supports both object and positional argument signatures.
 */
export function placeFormalNoticeOnHold(
  noticeOrParams:
    | FormalNoticeRecord
    | {
        notice: FormalNoticeRecord;
        actorName: string;
        actorRole: UserRole | string;
        holdReason: string;
        disputeReferenceId?: string;
        referenceDate?: string;
      },
  holdReasonArg?: string,
  actorNameArg?: string,
  actorRoleArg?: UserRole | string,
  referenceDateArg?: string
): FormalNoticeRecord {
  const isParams = 'notice' in noticeOrParams;
  const notice = isParams ? noticeOrParams.notice : noticeOrParams;
  const holdReason = isParams ? noticeOrParams.holdReason : holdReasonArg || 'Billing dispute under review';
  const actorName = isParams ? noticeOrParams.actorName : actorNameArg || 'Subdivision Officer';
  const actorRole = normalizeRoleInput(isParams ? noticeOrParams.actorRole : actorRoleArg);
  const disputeReferenceId = isParams ? noticeOrParams.disputeReferenceId : undefined;
  const referenceDate = (isParams ? noticeOrParams.referenceDate : referenceDateArg) || '28-Oct-2026';

  return {
    ...notice,
    status: 'ON_HOLD',
    disconnectionReviewStatus: 'ON_HOLD_PROTECTED',
    holdOrDispute: {
      isOnHold: true,
      holdReason,
      disputeReferenceId: disputeReferenceId || `DISP-${notice.billNo}`,
      placedByActor: actorName,
      placedByRole: actorRole,
      placedAt: referenceDate,
    },
    auditHistory: [
      ...notice.auditHistory,
      {
        timestamp: referenceDate,
        actor: actorName,
        role: actorRole,
        fromStatus: notice.status,
        toStatus: 'ON_HOLD',
        note: `Notice placed ON HOLD: ${holdReason}`,
      },
    ],
  };
}

/**
 * Withdraws a formal notice by an authorized officer.
 * Supports both object and positional argument signatures.
 */
export function withdrawFormalNotice(
  noticeOrParams:
    | FormalNoticeRecord
    | {
        notice: FormalNoticeRecord;
        actorName: string;
        actorRole: UserRole | string;
        reason: string;
        referenceDate?: string;
      },
  reasonArg?: string,
  actorNameArg?: string,
  actorRoleArg?: UserRole | string,
  referenceDateArg?: string
): FormalNoticeRecord {
  const isParams = 'notice' in noticeOrParams;
  const notice = isParams ? noticeOrParams.notice : noticeOrParams;
  const reason = isParams ? noticeOrParams.reason : reasonArg || 'Administrative withdrawal';
  const actorName = isParams ? noticeOrParams.actorName : actorNameArg || 'Subdivision Officer';
  const actorRole = normalizeRoleInput(isParams ? noticeOrParams.actorRole : actorRoleArg);
  const referenceDate = (isParams ? noticeOrParams.referenceDate : referenceDateArg) || '28-Oct-2026';

  if (actorRole !== 'employee' && actorRole !== 'management' && actorRole !== 'admin') {
    throw new Error('Unauthorized role: Only utility officers may withdraw a formal notice.');
  }
  return {
    ...notice,
    status: 'WITHDRAWN',
    daysRemainingUntilDeadline: null,
    daysRemaining: null,
    isDeadlineApproaching: false,
    isDeadlineReached: false,
    disconnectionReviewStatus: 'WITHDRAWN',
    holdOrDispute: { isOnHold: false },
    resolution: {
      resolvedAt: referenceDate,
      resolutionType: 'AUTHORIZED_WITHDRAWAL',
      resolvedByActor: actorName,
      resolvedByRole: actorRole,
      notes: reason,
    },
    auditHistory: [
      ...notice.auditHistory,
      {
        timestamp: referenceDate,
        actor: actorName,
        role: actorRole,
        fromStatus: notice.status,
        toStatus: 'WITHDRAWN',
        note: `Formal notice withdrawn by ${actorName}: ${reason}`,
      },
    ],
  };
}

/**
 * Reconciles an existing formal notice with the latest canonical 9-field bill balance
 * and reference date.
 *
 * Key Guarantees:
 * - Never mutates `snapshotAtIssuance` (preserves historical amount at notice issuance).
 * - Updates `currentBalanceView` with live remaining principal, accrued DPS, and waivers.
 * - Full settlement (`totalCurrentOutstanding <= 0`) automatically resolves the notice (`RESOLVED`).
 * - Partial payment keeps the notice active and updates `currentBalanceView`.
 * - Payment reversal on a previously resolved notice restores active notice status if balance becomes overdue again.
 * - Countdown reaching `<= 0` transitions status to `DEADLINE_REACHED` and `disconnectionReviewStatus` to `AUTHORIZED_REVIEW_REQUIRED` (NEVER auto-disconnecting).
 */
export function reconcileFormalNoticeWithStatement(
  notice: FormalNoticeRecord,
  statement: Canonical9FieldBillStatement,
  referenceDate?: string
): FormalNoticeRecord {
  const effectiveRefDate = referenceDate || statement.lastCalculationDate;

  const updatedCurrentBalanceView: FormalNoticeCurrentBalanceView = {
    originalBillAmount: statement.originalBillAmount,
    paymentsSuccessfullySettled: statement.paymentsSuccessfullySettled,
    remainingPrincipal: statement.remainingPrincipal,
    accruedLatePaymentCharges: statement.accruedLatePaymentCharges,
    chargesAlreadyPaidOrWaived: statement.chargesAlreadyPaidOrWaived,
    totalCurrentOutstanding: statement.totalCurrentOutstanding,
    originalDueDate: statement.originalDueDate,
    daysOverdue: statement.daysOverdue,
    lastCalculationDate: effectiveRefDate,
  };

  // Case 1: Full settlement resolves any active or on-hold notice
  if (statement.isFullySettled || statement.totalCurrentOutstanding <= 0.009) {
    if (notice.status === 'RESOLVED' || notice.status === 'WITHDRAWN') {
      return {
        ...notice,
        currentBalanceView: updatedCurrentBalanceView,
        daysRemainingUntilDeadline: null,
        daysRemaining: null,
        isDeadlineApproaching: false,
        isDeadlineReached: false,
        disconnectionReviewStatus:
          notice.status === 'WITHDRAWN' ? 'WITHDRAWN' : 'RESOLVED_BY_SETTLEMENT',
      };
    }

    return {
      ...notice,
      status: 'RESOLVED',
      currentBalanceView: updatedCurrentBalanceView,
      daysRemainingUntilDeadline: null,
      daysRemaining: null,
      isDeadlineApproaching: false,
      isDeadlineReached: false,
      disconnectionReviewStatus: 'RESOLVED_BY_SETTLEMENT',
      holdOrDispute: { ...notice.holdOrDispute, isOnHold: false },
      resolution: {
        resolvedAt: effectiveRefDate,
        resolutionType:
          statement.chargesAlreadyPaidOrWaived > 0 && statement.paymentsSuccessfullySettled === 0
            ? 'WAIVER_SETTLED'
            : 'FULL_PAYMENT_SETTLED',
        resolvedByActor: 'Automated Payment Reconciliation Engine',
        resolvedByRole: 'admin',
        notes: `Full balance settled (Payments: ₹${statement.paymentsSuccessfullySettled.toFixed(2)}, Waived/Settled Charges: ₹${statement.chargesAlreadyPaidOrWaived.toFixed(2)}). Notice closed.`,
      },
      auditHistory: [
        ...notice.auditHistory,
        {
          timestamp: effectiveRefDate,
          actor: 'Canonical Billing Engine',
          role: 'admin',
          fromStatus: notice.status,
          toStatus: 'RESOLVED',
          note: `Notice automatically resolved upon full settlement of bill ${statement.billNo}.`,
        },
      ],
    };
  }

  // Case 2: If notice was WITHDRAWN by an officer, keep it WITHDRAWN
  if (notice.status === 'WITHDRAWN') {
    return {
      ...notice,
      currentBalanceView: updatedCurrentBalanceView,
      daysRemainingUntilDeadline: null,
      daysRemaining: null,
      disconnectionReviewStatus: 'WITHDRAWN',
    };
  }

  // Case 3: If notice was previously RESOLVED via payment, but a payment reversal restored an overdue balance:
  // Re-open the notice according to its deadline or eligibility!
  const wasReopenedAfterReversal =
    notice.status === 'RESOLVED' &&
    notice.resolution?.resolutionType === 'FULL_PAYMENT_SETTLED' &&
    statement.totalCurrentOutstanding > 0.009;

  // Case 4: If notice is ON_HOLD, preserve ON_HOLD and protect from deadline expiry
  if (notice.status === 'ON_HOLD' || notice.holdOrDispute.isOnHold) {
    const daysRem = calculateDaysUntilNoticeDeadline(
      notice.paymentDeadlineDate,
      effectiveRefDate
    );
    return {
      ...notice,
      status: 'ON_HOLD',
      currentBalanceView: updatedCurrentBalanceView,
      daysRemainingUntilDeadline: daysRem,
      daysRemaining: daysRem,
      isDeadlineApproaching: false,
      isDeadlineReached: false,
      disconnectionReviewStatus: 'ON_HOLD_PROTECTED',
    };
  }

  // Case 5: Draft / Pending Approval / Approved notices (not yet issued/served)
  if (
    notice.status === 'DRAFT' ||
    notice.status === 'PENDING_APPROVAL' ||
    notice.status === 'APPROVED' ||
    notice.status === 'ELIGIBLE_FOR_REVIEW'
  ) {
    return {
      ...notice,
      currentBalanceView: updatedCurrentBalanceView,
    };
  }

  // Case 5b: Issued notice awaiting valid service delivery evidence (SERVICE_PENDING or missing serviceDate/serviceEvidenceRef)
  // Legal safety invariant: Never fabricate an enforceable 15-day countdown if service evidence is missing.
  const hasVerifiedServiceEvidence = Boolean(
    notice.serviceDate &&
      notice.serviceDate.trim() &&
      notice.serviceEvidenceRef &&
      notice.serviceEvidenceRef.trim()
  );

  if (notice.status === 'SERVICE_PENDING' || !hasVerifiedServiceEvidence) {
    return {
      ...notice,
      status: notice.status === 'ISSUED' ? 'ISSUED' : 'SERVICE_PENDING',
      currentBalanceView: updatedCurrentBalanceView,
      paymentDeadlineDate: undefined,
      daysRemainingUntilDeadline: null,
      daysRemaining: null,
      isDeadlineApproaching: false,
      isDeadlineReached: false,
      disconnectionReviewStatus: 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD',
    };
  }

  // Case 6: Served notices with verified service evidence — evaluate countdown against `paymentDeadlineDate`
  const effectiveDeadlineDate =
    notice.paymentDeadlineDate ||
    addClearDaysToBillDate(
      notice.serviceDate!,
      notice.statutoryNoticePeriodDays || 15
    );

  const daysRemaining = calculateDaysUntilNoticeDeadline(
    effectiveDeadlineDate,
    effectiveRefDate
  );

  let derivedStatus: FormalNoticeStatus = 'SERVED';
  let reviewStatus: DisconnectionReviewStatus = 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD';
  let isApproaching = false;
  let isReached = false;

  if (daysRemaining !== null) {
    if (daysRemaining <= 0) {
      derivedStatus = 'DEADLINE_REACHED';
      reviewStatus = 'AUTHORIZED_REVIEW_REQUIRED';
      isReached = true;
    } else if (daysRemaining <= DEFAULT_FORMAL_NOTICE_POLICY.deadlineApproachingThresholdDays) {
      derivedStatus = 'DEADLINE_APPROACHING';
      reviewStatus = 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD';
      isApproaching = true;
    }
  }

  const nextAudit = [...notice.auditHistory];
  if (wasReopenedAfterReversal) {
    nextAudit.push({
      timestamp: effectiveRefDate,
      actor: 'Canonical Billing Engine',
      role: 'admin',
      fromStatus: 'RESOLVED',
      toStatus: derivedStatus,
      note: `Payment reversal restored unpaid balance (₹${statement.totalCurrentOutstanding.toFixed(2)}). Formal notice re-activated.`,
    });
  } else if (derivedStatus !== notice.status) {
    nextAudit.push({
      timestamp: effectiveRefDate,
      actor: 'Notice Deadline Monitor',
      role: 'admin',
      fromStatus: notice.status,
      toStatus: derivedStatus,
      note:
        derivedStatus === 'DEADLINE_REACHED'
          ? `Notice deadline (${effectiveDeadlineDate}) reached. Flagged for Authorized Officer Review (No automatic physical disconnection).`
          : `Notice deadline (${effectiveDeadlineDate}) is approaching (${daysRemaining} days remaining).`,
    });
  }

  return {
    ...notice,
    status: derivedStatus,
    paymentDeadlineDate: effectiveDeadlineDate,
    currentBalanceView: updatedCurrentBalanceView,
    daysRemainingUntilDeadline: daysRemaining,
    daysRemaining,
    isDeadlineApproaching: isApproaching,
    isDeadlineReached: isReached,
    disconnectionReviewStatus: reviewStatus,
    resolution: wasReopenedAfterReversal ? undefined : notice.resolution,
    auditHistory: nextAudit,
  };
}

/**
 * Initial canonical DEMO formal notice for the overdue bill `BILL-UG-2026-10-8821`
 * (Issued & served on `24-Oct-2026` with 15-day statutory deadline `08-Nov-2026`).
 * On the default business reference date `28-Oct-2026`, 11 clear days remain (`SERVED`).
 */
export const INITIAL_FORMAL_NOTICES: FormalNoticeRecord[] = [
  {
    noticeId: 'NTC-UG-2026-10-8821',
    billNo: 'BILL-UG-2026-10-8821',
    consumerNo: '04281-99231',
    connectionId: 'CONN-1001',
    consumerName: 'Rameshbhai Patel',
    subdivision: 'Mehsana City North',
    tariffCategory: 'Residential (RGPU)',
    status: 'SERVED',
    policyId: DEFAULT_FORMAL_NOTICE_POLICY.policyId,
    policyVersion: DEFAULT_FORMAL_NOTICE_POLICY.version,
    isDemoSimulation: true,
    statutoryCitation: DEFAULT_FORMAL_NOTICE_POLICY.statutoryCitation,
    statutoryReferenceLabel: DEFAULT_FORMAL_NOTICE_POLICY.statutoryCitation,
    demoSafeguardDisclosure: DEFAULT_FORMAL_NOTICE_POLICY.demoSafeguardDisclosure,
    statutoryNoticePeriodDays: 15,
    createdAt: '23-Oct-2026',
    createdByActor: 'Kiran Desai (Billing Officer)',
    createdByRole: 'employee',
    submittedForApprovalAt: '23-Oct-2026',
    approvedAt: '24-Oct-2026',
    approvedByActor: 'S. K. Gadhvi (Sub-Divisional Officer)',
    approvedBy: 'S. K. Gadhvi (Sub-Divisional Officer)',
    approvedByRole: 'employee',
    issueDate: '24-Oct-2026',
    serviceDate: '24-Oct-2026',
    serviceMethod: 'ELECTRONIC_PORTAL_DEMO',
    serviceChannel: 'ELECTRONIC_PORTAL_DEMO',
    serviceEvidenceRef: 'SRV-ACK-NTC-UG-2026-10-8821-24Oct2026',
    paymentDeadlineDate: '08-Nov-2026',
    daysRemainingUntilDeadline: 11,
    daysRemaining: 11,
    isDeadlineApproaching: false,
    isDeadlineReached: false,
    disconnectionReviewStatus: 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD',
    snapshotAtIssuance: {
      originalBillAmount: 2185,
      paymentsSettledAtIssuance: 0,
      principalAtIssuance: 2185,
      lateChargesAtIssuance: 1.8, // 2 days overdue on 24-Oct-2026: 2185 * 0.15 * (2/365) = 1.80
      waivedChargesAtIssuance: 0,
      totalOutstandingAtIssuance: 2186.8,
      daysOverdueAtIssuance: 2,
      originalDueDate: '22-Oct-2026',
      snapshotReferenceDate: '24-Oct-2026',
    },
    currentBalanceView: {
      originalBillAmount: 2185,
      paymentsSuccessfullySettled: 0,
      remainingPrincipal: 2185,
      accruedLatePaymentCharges: 5.39,
      chargesAlreadyPaidOrWaived: 0,
      totalCurrentOutstanding: 2190.39,
      originalDueDate: '22-Oct-2026',
      daysOverdue: 6,
      lastCalculationDate: '28-Oct-2026',
    },
    holdOrDispute: {
      isOnHold: false,
    },
    auditHistory: [
      {
        timestamp: '23-Oct-2026',
        actor: 'Kiran Desai (Billing Officer)',
        role: 'employee',
        fromStatus: 'ELIGIBLE_FOR_REVIEW',
        toStatus: 'DRAFT',
        note: 'Prepared DEMO Section 56 notice draft for overdue balance on BILL-UG-2026-10-8821.',
      },
      {
        timestamp: '23-Oct-2026',
        actor: 'Kiran Desai (Billing Officer)',
        role: 'employee',
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_APPROVAL',
        note: 'Submitted notice draft for SDO approval.',
      },
      {
        timestamp: '24-Oct-2026',
        actor: 'S. K. Gadhvi (Sub-Divisional Officer)',
        role: 'employee',
        fromStatus: 'PENDING_APPROVAL',
        toStatus: 'APPROVED',
        note: 'Approved DEMO Section 56 notice (15 clear days statutory period).',
      },
      {
        timestamp: '24-Oct-2026',
        actor: 'S. K. Gadhvi (Sub-Divisional Officer)',
        role: 'employee',
        fromStatus: 'APPROVED',
        toStatus: 'SERVED',
        note: 'Issued & served via Electronic Portal Demo (Ref: SRV-ACK-NTC-UG-2026-10-8821-24Oct2026). Payment deadline: 08-Nov-2026.',
      },
    ],
  },
];

// ============================================================================
// 3. CONFIGURABLE OVERDUE & FORMAL NOTICE NOTIFICATION ENGINE (11 STAGES)
// ============================================================================

export type Step4BNotificationStage =
  | 'UPCOMING_DUE_5D'
  | 'UPCOMING_DUE_1D'
  | 'DUE_TODAY'
  | 'OVERDUE_DAY_1'
  | 'OVERDUE_SUBSEQUENT_REMINDER'
  | 'FORMAL_NOTICE_ISSUED'
  | 'FORMAL_NOTICE_DEADLINE_APPROACHING'
  | 'FORMAL_NOTICE_DEADLINE_REACHED'
  | 'PAYMENT_RECEIVED'
  | 'BALANCE_FULLY_SETTLED'
  | 'NOTICE_WITHDRAWN_OR_RESOLVED';

export interface OverdueNotificationSchedulePolicy {
  preDueReminderDays: number[];         // Default [5, 1]
  notifyOnDueDate: boolean;             // Default true
  notifyFirstDayOverdue: boolean;       // Default true
  subsequentOverdueReminderDays: number[]; // Default [6, 10, 15, 30]
  notifyOnFormalNoticeIssued: boolean;
  notifyOnNoticeDeadlineApproaching: boolean;
  notifyOnNoticeDeadlineReached: boolean;
  notifyOnPartialPayment: boolean;
  notifyOnFullSettlement: boolean;
  notifyOnNoticeWithdrawnOrResolved: boolean;
}

export const DEFAULT_OVERDUE_NOTIFICATION_POLICY: OverdueNotificationSchedulePolicy = {
  preDueReminderDays: [5, 1],
  notifyOnDueDate: true,
  notifyFirstDayOverdue: true,
  subsequentOverdueReminderDays: [6, 10, 15, 25],
  notifyOnFormalNoticeIssued: true,
  notifyOnNoticeDeadlineApproaching: true,
  notifyOnNoticeDeadlineReached: true,
  notifyOnPartialPayment: true,
  notifyOnFullSettlement: true,
  notifyOnNoticeWithdrawnOrResolved: true,
};

export interface EvaluateStep4BNotificationsInput {
  bills: ElectricityBill[];
  connections: ElectricityConnection[];
  payments: PaymentTransaction[];
  formalNotices?: FormalNoticeRecord[];
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  existingNotifications?: AppNotification[];
  emittedEventKeys?: string[];
  referenceDate?: string | Date;
  schedulePolicy?: OverdueNotificationSchedulePolicy;
  lateChargePolicy?: LateChargePolicyConfig;
  language?: Language;
  defaultConsumerAccountId?: string;
}

export interface EvaluateStep4BNotificationsResult {
  newNotifications: AppNotification[];
  allNotifications: AppNotification[];
  newEventKeys: string[];
  updatedEmittedEventKeys: string[];
  suppressedNotificationIds: string[];
}

/**
 * Evaluates all 11 configurable overdue, payment, and formal notice notification stages.
 * Strictly deduplicated via deterministic `eventKey` so page refreshes or language
 * switches never create duplicate notifications.
 * Produces both consumer-scoped notifications and authorized subdivision employee notifications.
 */
export function evaluateStep4BOverdueAndNoticeNotifications(
  input: EvaluateStep4BNotificationsInput
): EvaluateStep4BNotificationsResult {
  const {
    bills,
    connections,
    payments,
    formalNotices = [],
    waivers = [],
    reversals = [],
    existingNotifications = [],
    emittedEventKeys = [],
    schedulePolicy = DEFAULT_OVERDUE_NOTIFICATION_POLICY,
    lateChargePolicy = DEFAULT_LATE_CHARGE_POLICY,
    language = 'en',
    defaultConsumerAccountId = 'demo_consumer',
  } = input;

  const refDateStr =
    typeof input.referenceDate === 'string'
      ? input.referenceDate
      : input.referenceDate instanceof Date
      ? formatDateDdMmmYyyy(input.referenceDate)
      : '28-Oct-2026';

  const t = getFormalNoticeTranslations(language);
  const connByConsumerNo = new Map<string, ElectricityConnection>();
  for (const c of connections) {
    connByConsumerNo.set(normalizeBillingIdentifier(c.consumerNo), c);
  }

  const noticeByBillNo = new Map<string, FormalNoticeRecord>();
  for (const n of formalNotices) {
    noticeByBillNo.set(normalizeBillingIdentifier(n.billNo), n);
  }

  const existingIds = new Set(existingNotifications.map(n => n.id));
  const existingKeys = new Set<string>(emittedEventKeys);
  for (const n of existingNotifications) {
    if (n.eventKey) existingKeys.add(n.eventKey);
  }

  const newNotifications: AppNotification[] = [];
  const newEventKeys: string[] = [];
  const suppressedNotificationIds: string[] = [];

  const emitNotification = (notif: AppNotification) => {
    const key = notif.eventKey || notif.id;
    if (existingKeys.has(key) || existingIds.has(notif.id)) {
      return;
    }
    existingKeys.add(key);
    existingIds.add(notif.id);
    newEventKeys.push(key);
    newNotifications.push(notif);
  };

  for (const bill of bills) {
    const conn = connByConsumerNo.get(normalizeBillingIdentifier(bill.consumerNo));
    const accountId =
      bill.consumerNo === '04281-99231' || bill.consumerNo === '04281-77190'
        ? 'demo_consumer'
        : conn?.accountId || defaultConsumerAccountId;
    const subdivision = normalizeCanonicalSubdivision(
      conn?.subdivision || 'Mehsana City North'
    );

    const statement = deriveCanonical9FieldBillStatement(bill, payments, {
      referenceDate: refDateStr,
      connection: conn,
      policy: lateChargePolicy,
      waivers,
      reversals,
      language,
    });

    const rawNotice = noticeByBillNo.get(normalizeBillingIdentifier(bill.billNo));
    const reconciledNotice = rawNotice
      ? reconcileFormalNoticeWithStatement(rawNotice, statement, refDateStr)
      : undefined;

    // Calculate signed day delta from refDate to originalDueDate
    const dueMs = parseDateToMidnightUtcMs(bill.dueDate);
    const refMs = parseDateToMidnightUtcMs(refDateStr);
    const daysUntilDue =
      dueMs !== null && refMs !== null
        ? Math.round((dueMs - refMs) / (24 * 60 * 60 * 1000))
        : null;

    // If fully settled: suppress active overdue/due alerts for this bill and emit settlement notifications
    if (statement.isFullySettled) {
      for (const existing of existingNotifications) {
        if (
          existing.relatedEntityId === bill.billNo &&
          !existing.read &&
          existing.notificationType &&
          (existing.notificationType.startsWith('UPCOMING_DUE') ||
            existing.notificationType.startsWith('DUE_TODAY') ||
            existing.notificationType.startsWith('OVERDUE_') ||
            existing.notificationType === 'FORMAL_NOTICE_ISSUED' ||
            existing.notificationType === 'FORMAL_NOTICE_DEADLINE_APPROACHING' ||
            existing.notificationType === 'FORMAL_NOTICE_DEADLINE_REACHED')
        ) {
          suppressedNotificationIds.push(existing.id);
        }
      }

      // Only emit dynamic BALANCE_FULLY_SETTLED for bills settled after initial seed Paid bills
      const hasDynamicSettlement =
        bill.status !== 'Paid' ||
        payments.some(
          p =>
            normalizeBillingIdentifier(p.billNo) === normalizeBillingIdentifier(bill.billNo) &&
            p.status === 'Successful' &&
            !(p.txId || '').startsWith('TXN-UG-99201') &&
            !(p.txId || '').startsWith('TXN-UG-88110')
        ) ||
        statement.chargesAlreadyPaidOrWaived > 0;

      if (schedulePolicy.notifyOnFullSettlement && hasDynamicSettlement) {
        const eventKey = `STEP4B-NOTIF:${bill.billNo}:BALANCE_FULLY_SETTLED`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-SETTLED`,
          title: t.notifTitles.BALANCE_FULLY_SETTLED(bill.billNo),
          message: t.notifMessages.BALANCE_FULLY_SETTLED({
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            settledAmount: statement.paymentsSuccessfullySettled,
            waivedAmount: statement.chargesAlreadyPaidOrWaived,
            dueDate: bill.dueDate,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 10:00 IST`,
          formattedTimestamp: `${refDateStr}, 10:00 IST`,
          targetRole: 'consumer',
          type: 'success',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'BALANCE_FULLY_SETTLED',
          statusBadge: t.statuses.RESOLVED,
          eventKey,
        });
      }

      if (
        schedulePolicy.notifyOnNoticeWithdrawnOrResolved &&
        reconciledNotice &&
        (reconciledNotice.status === 'RESOLVED' || reconciledNotice.status === 'WITHDRAWN')
      ) {
        const eventKey = `STEP4B-NOTIF:${bill.billNo}:NOTICE_WITHDRAWN_OR_RESOLVED:${reconciledNotice.status}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-NTC-${reconciledNotice.status}`,
          title: t.notifTitles.NOTICE_WITHDRAWN_OR_RESOLVED(reconciledNotice.noticeId),
          message: t.notifMessages.NOTICE_WITHDRAWN_OR_RESOLVED({
            noticeId: reconciledNotice.noticeId,
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            status: reconciledNotice.status,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 10:05 IST`,
          formattedTimestamp: `${refDateStr}, 10:05 IST`,
          targetRole: 'consumer',
          type: 'success',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'NOTICE_WITHDRAWN_OR_RESOLVED',
          statusBadge: t.statuses[reconciledNotice.status],
          eventKey,
        });
      }

      continue;
    }

    // Notice Withdrawn while bill still has balance
    if (
      schedulePolicy.notifyOnNoticeWithdrawnOrResolved &&
      reconciledNotice &&
      reconciledNotice.status === 'WITHDRAWN'
    ) {
      const eventKey = `STEP4B-NOTIF:${bill.billNo}:NOTICE_WITHDRAWN_OR_RESOLVED:WITHDRAWN`;
      emitNotification({
        id: `NOTIF-S4B-${bill.billNo}-NTC-WITHDRAWN`,
        title: t.notifTitles.NOTICE_WITHDRAWN_OR_RESOLVED(reconciledNotice.noticeId),
        message: t.notifMessages.NOTICE_WITHDRAWN_OR_RESOLVED({
          noticeId: reconciledNotice.noticeId,
          billNo: bill.billNo,
          consumerNo: bill.consumerNo,
          status: 'WITHDRAWN',
        }),
        time: refDateStr,
        createdAt: `${refDateStr} 10:05 IST`,
        formattedTimestamp: `${refDateStr}, 10:05 IST`,
        targetRole: 'consumer',
        type: 'info',
        read: false,
        category: 'Billing',
        actionUrl: 'consumer:bills',
        accountId,
        consumerNo: bill.consumerNo,
        targetConsumerNo: bill.consumerNo,
        targetConsumerAccountId: accountId,
        subdivision,
        relatedEntityType: 'bill',
        relatedEntityId: bill.billNo,
        notificationType: 'NOTICE_WITHDRAWN_OR_RESOLVED',
        statusBadge: t.statuses.WITHDRAWN,
        eventKey,
      });
    }

    // Partial payment received notification
    if (
      schedulePolicy.notifyOnPartialPayment &&
      statement.paymentsSuccessfullySettled > 0 &&
      statement.totalCurrentOutstanding > 0
    ) {
      const pKey = `STEP4B-NOTIF:${bill.billNo}:PAYMENT_RECEIVED:${statement.paymentsSuccessfullySettled.toFixed(2)}`;
      emitNotification({
        id: `NOTIF-S4B-${bill.billNo}-PARTIAL-${Math.round(statement.paymentsSuccessfullySettled)}`,
        title: t.notifTitles.PAYMENT_RECEIVED(bill.billNo),
        message: t.notifMessages.PAYMENT_RECEIVED({
          billNo: bill.billNo,
          consumerNo: bill.consumerNo,
          paidAmount: statement.paymentsSuccessfullySettled,
          remainingPrincipal: statement.remainingPrincipal,
          lateCharges: statement.accruedLatePaymentCharges,
          totalOutstanding: statement.totalCurrentOutstanding,
          dueDate: bill.dueDate,
        }),
        time: refDateStr,
        createdAt: `${refDateStr} 09:15 IST`,
        formattedTimestamp: `${refDateStr}, 09:15 IST`,
        targetRole: 'consumer',
        type: 'info',
        read: false,
        category: 'Billing',
        actionUrl: 'consumer:bills',
        accountId,
        consumerNo: bill.consumerNo,
        targetConsumerNo: bill.consumerNo,
        targetConsumerAccountId: accountId,
        subdivision,
        relatedEntityType: 'bill',
        relatedEntityId: bill.billNo,
        notificationType: 'PAYMENT_RECEIVED',
        statusBadge: 'Partial Payment',
        eventKey: pKey,
      });
    }

    // Pre-Due & Due-Date Stages
    if (daysUntilDue !== null && daysUntilDue >= 0) {
      if (daysUntilDue === 5 && schedulePolicy.preDueReminderDays.includes(5)) {
        const key = `STEP4B-NOTIF:UPCOMING_DUE_5D:${bill.billNo}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-DUE-5D`,
          title: t.notifTitles.UPCOMING_DUE_5D(bill.billNo),
          message: t.notifMessages.UPCOMING_DUE_5D({
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            dueDate: bill.dueDate,
            totalOutstanding: statement.totalCurrentOutstanding,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 09:00 IST`,
          formattedTimestamp: `${refDateStr}, 09:00 IST`,
          targetRole: 'consumer',
          type: 'info',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'UPCOMING_DUE_5D',
          statusBadge: 'Due in 5 Days',
          eventKey: key,
        });
      } else if (daysUntilDue === 1 && schedulePolicy.preDueReminderDays.includes(1)) {
        const key = `STEP4B-NOTIF:UPCOMING_DUE_1D:${bill.billNo}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-DUE-1D`,
          title: t.notifTitles.UPCOMING_DUE_1D(bill.billNo),
          message: t.notifMessages.UPCOMING_DUE_1D({
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            dueDate: bill.dueDate,
            totalOutstanding: statement.totalCurrentOutstanding,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 09:00 IST`,
          formattedTimestamp: `${refDateStr}, 09:00 IST`,
          targetRole: 'consumer',
          type: 'warning',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'UPCOMING_DUE_1D',
          statusBadge: 'Due Tomorrow',
          eventKey: key,
        });
      } else if (daysUntilDue === 0 && schedulePolicy.notifyOnDueDate) {
        const key = `STEP4B-NOTIF:DUE_TODAY:${bill.billNo}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-DUE-TODAY`,
          title: t.notifTitles.DUE_TODAY(bill.billNo),
          message: t.notifMessages.DUE_TODAY({
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            dueDate: bill.dueDate,
            totalOutstanding: statement.totalCurrentOutstanding,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 09:00 IST`,
          formattedTimestamp: `${refDateStr}, 09:00 IST`,
          targetRole: 'consumer',
          type: 'warning',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'DUE_TODAY',
          statusBadge: 'Due Today',
          eventKey: key,
        });
      }
    }

    // Overdue Stages
    if (statement.daysOverdue > 0 && statement.totalCurrentOutstanding > 0) {
      if (statement.daysOverdue === 1 && schedulePolicy.notifyFirstDayOverdue) {
        const key = `STEP4B-NOTIF:OVERDUE_DAY_1:${bill.billNo}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-OVERDUE-1D`,
          title: t.notifTitles.OVERDUE_DAY_1(bill.billNo),
          message: t.notifMessages.OVERDUE_DAY_1({
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            dueDate: bill.dueDate,
            daysOverdue: 1,
            remainingPrincipal: statement.remainingPrincipal,
            lateCharges: statement.accruedLatePaymentCharges,
            totalOutstanding: statement.totalCurrentOutstanding,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 09:30 IST`,
          formattedTimestamp: `${refDateStr}, 09:30 IST`,
          targetRole: 'consumer',
          type: 'alert',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'OVERDUE_DAY_1',
          statusBadge: '1 Day Overdue',
          eventKey: key,
        });

        const empKey1 = `STEP4B-EMP:OVERDUE_DAY_1:${bill.billNo}`;
        emitNotification({
          id: `NOTIF-EMP-S4B-${bill.billNo}-OVERDUE-1D`,
          title: `Overdue Account (Day 1): ${bill.billNo} (${bill.consumerNo})`,
          message: `Consumer ${statement.consumerName} (${subdivision}) is 1 day overdue (Due: ${bill.dueDate}). Principal: ₹${statement.remainingPrincipal.toFixed(2)}, Accrued DPS: ₹${statement.accruedLatePaymentCharges.toFixed(2)}, Total Payable: ₹${statement.totalCurrentOutstanding.toFixed(2)}.`,
          time: refDateStr,
          createdAt: `${refDateStr} 09:31 IST`,
          formattedTimestamp: `${refDateStr}, 09:31 IST`,
          targetRole: 'employee',
          type: 'warning',
          read: false,
          category: 'Billing',
          actionUrl: 'employee:consumers',
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'OVERDUE_DAY_1',
          statusBadge: '1d Overdue',
          eventKey: empKey1,
        });
      } else if (
        statement.daysOverdue > 1 &&
        schedulePolicy.subsequentOverdueReminderDays.includes(statement.daysOverdue)
      ) {
        const key = `STEP4B-NOTIF:OVERDUE_SUBSEQUENT_REMINDER:${bill.billNo}:D${statement.daysOverdue}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-OVERDUE-${statement.daysOverdue}D`,
          title: t.notifTitles.OVERDUE_SUBSEQUENT_REMINDER(bill.billNo, statement.daysOverdue),
          message: t.notifMessages.OVERDUE_SUBSEQUENT_REMINDER({
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            dueDate: bill.dueDate,
            daysOverdue: statement.daysOverdue,
            remainingPrincipal: statement.remainingPrincipal,
            lateCharges: statement.accruedLatePaymentCharges,
            totalOutstanding: statement.totalCurrentOutstanding,
            noticeId: reconciledNotice?.noticeId,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 09:45 IST`,
          formattedTimestamp: `${refDateStr}, 09:45 IST`,
          targetRole: 'consumer',
          type: 'alert',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'OVERDUE_SUBSEQUENT_REMINDER',
          statusBadge: `${statement.daysOverdue} Days Overdue`,
          eventKey: key,
        });

        // Also emit an authorized Subdivision Employee overdue ledger alert
        const empKey = `STEP4B-EMP-NOTIF:OVERDUE_SUBSEQUENT_REMINDER:${bill.billNo}:D${statement.daysOverdue}`;
        emitNotification({
          id: `NOTIF-EMP-S4B-${bill.billNo}-OVERDUE-${statement.daysOverdue}D`,
          title: `Overdue Account Alert: ${bill.billNo} (${bill.consumerNo})`,
          message: `Consumer ${statement.consumerName} (${subdivision}) is ${statement.daysOverdue} days overdue (Due: ${bill.dueDate}). Principal: ₹${statement.remainingPrincipal.toFixed(2)}, Accrued DPS: ₹${statement.accruedLatePaymentCharges.toFixed(2)}, Total Payable: ₹${statement.totalCurrentOutstanding.toFixed(2)}.`,
          time: refDateStr,
          createdAt: `${refDateStr} 09:46 IST`,
          formattedTimestamp: `${refDateStr}, 09:46 IST`,
          targetRole: 'employee',
          type: 'warning',
          read: false,
          category: 'Billing',
          actionUrl: 'employee:consumers',
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'OVERDUE_SUBSEQUENT_REMINDER',
          statusBadge: `${statement.daysOverdue}d Overdue`,
          eventKey: empKey,
        });
      }
    }

    // Formal Notice Stages (Issued, Deadline Approaching, Deadline Reached)
    if (
      reconciledNotice &&
      (reconciledNotice.status === 'ISSUED' ||
        reconciledNotice.status === 'SERVED' ||
        reconciledNotice.status === 'DEADLINE_APPROACHING' ||
        reconciledNotice.status === 'DEADLINE_REACHED')
    ) {
      if (schedulePolicy.notifyOnFormalNoticeIssued && reconciledNotice.issueDate) {
        const key = `STEP4B-NOTIF:${bill.billNo}:FORMAL_NOTICE_ISSUED:${reconciledNotice.noticeId}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-NTC-ISSUED`,
          title: t.notifTitles.FORMAL_NOTICE_ISSUED(reconciledNotice.noticeId),
          message: t.notifMessages.FORMAL_NOTICE_ISSUED({
            noticeId: reconciledNotice.noticeId,
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            issueDate: reconciledNotice.issueDate,
            paymentDeadlineDate: reconciledNotice.paymentDeadlineDate || '',
            daysOverdue: statement.daysOverdue,
            lateCharges: statement.accruedLatePaymentCharges,
            totalOutstanding: statement.totalCurrentOutstanding,
          }),
          time: reconciledNotice.issueDate,
          createdAt: `${reconciledNotice.issueDate} 11:00 IST`,
          formattedTimestamp: `${reconciledNotice.issueDate}, 11:00 IST`,
          targetRole: 'consumer',
          type: 'alert',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'FORMAL_NOTICE_ISSUED',
          statusBadge: t.statuses.SERVED,
          eventKey: key,
        });
      }

      if (
        schedulePolicy.notifyOnNoticeDeadlineApproaching &&
        reconciledNotice.status === 'DEADLINE_APPROACHING' &&
        reconciledNotice.daysRemainingUntilDeadline !== null
      ) {
        const key = `STEP4B-NOTIF:${bill.billNo}:FORMAL_NOTICE_DEADLINE_APPROACHING:${reconciledNotice.noticeId}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-NTC-APPROACHING`,
          title: t.notifTitles.FORMAL_NOTICE_DEADLINE_APPROACHING(
            reconciledNotice.noticeId,
            reconciledNotice.daysRemainingUntilDeadline
          ),
          message: t.notifMessages.FORMAL_NOTICE_DEADLINE_APPROACHING({
            noticeId: reconciledNotice.noticeId,
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            paymentDeadlineDate: reconciledNotice.paymentDeadlineDate || '',
            daysRemaining: reconciledNotice.daysRemainingUntilDeadline,
            totalOutstanding: statement.totalCurrentOutstanding,
            lateCharges: statement.accruedLatePaymentCharges,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 10:15 IST`,
          formattedTimestamp: `${refDateStr}, 10:15 IST`,
          targetRole: 'consumer',
          type: 'alert',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'FORMAL_NOTICE_DEADLINE_APPROACHING',
          statusBadge: `${reconciledNotice.daysRemainingUntilDeadline}d Left on Notice`,
          eventKey: key,
        });
      }

      if (
        schedulePolicy.notifyOnNoticeDeadlineReached &&
        reconciledNotice.status === 'DEADLINE_REACHED'
      ) {
        const key = `STEP4B-NOTIF:${bill.billNo}:FORMAL_NOTICE_DEADLINE_REACHED:${reconciledNotice.noticeId}`;
        emitNotification({
          id: `NOTIF-S4B-${bill.billNo}-NTC-REACHED`,
          title: t.notifTitles.FORMAL_NOTICE_DEADLINE_REACHED(reconciledNotice.noticeId),
          message: t.notifMessages.FORMAL_NOTICE_DEADLINE_REACHED({
            noticeId: reconciledNotice.noticeId,
            billNo: bill.billNo,
            consumerNo: bill.consumerNo,
            paymentDeadlineDate: reconciledNotice.paymentDeadlineDate || '',
            totalOutstanding: statement.totalCurrentOutstanding,
            lateCharges: statement.accruedLatePaymentCharges,
          }),
          time: refDateStr,
          createdAt: `${refDateStr} 10:30 IST`,
          formattedTimestamp: `${refDateStr}, 10:30 IST`,
          targetRole: 'consumer',
          type: 'alert',
          read: false,
          category: 'Billing',
          actionUrl: 'consumer:bills',
          accountId,
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          targetConsumerAccountId: accountId,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'FORMAL_NOTICE_DEADLINE_REACHED',
          statusBadge: t.statuses.DEADLINE_REACHED,
          eventKey: key,
        });

        // Emit authorized Subdivision Employee notice review alert
        const empKey = `STEP4B-EMP-NOTIF:${bill.billNo}:FORMAL_NOTICE_DEADLINE_REACHED:${reconciledNotice.noticeId}`;
        emitNotification({
          id: `NOTIF-EMP-S4B-${bill.billNo}-NTC-REACHED`,
          title: `Notice Deadline Reached — Review Required: ${reconciledNotice.noticeId}`,
          message: `Formal notice ${reconciledNotice.noticeId} for Bill ${bill.billNo} (${bill.consumerNo}, ${subdivision}) reached its 15-day deadline (${reconciledNotice.paymentDeadlineDate}). Current Outstanding: ₹${statement.totalCurrentOutstanding.toFixed(2)}. Authorized SDO review required (No automatic physical disconnection).`,
          time: refDateStr,
          createdAt: `${refDateStr} 10:31 IST`,
          formattedTimestamp: `${refDateStr}, 10:31 IST`,
          targetRole: 'employee',
          type: 'alert',
          read: false,
          category: 'Billing',
          actionUrl: 'employee:consumers',
          consumerNo: bill.consumerNo,
          targetConsumerNo: bill.consumerNo,
          subdivision,
          relatedEntityType: 'bill',
          relatedEntityId: bill.billNo,
          notificationType: 'FORMAL_NOTICE_DEADLINE_REACHED',
          statusBadge: 'Authorized Review Required',
          eventKey: empKey,
        });
      }
    }
  }

  return {
    newNotifications,
    allNotifications: [...newNotifications, ...existingNotifications],
    newEventKeys,
    updatedEmittedEventKeys: Array.from(existingKeys),
    suppressedNotificationIds,
  };
}

/**
 * Strictly scopes Step 4B financial & formal notice notifications to an authorized employee's subdivision.
 * Unauthorized employees from other subdivisions never see another subdivision's consumer overdue records or notices.
 */
export function filterEmployeeStep4BBillingNotifications(
  notifications: AppNotification[],
  authorizedSubdivision: string,
  dismissedIds?: Set<string>,
  readIds?: Set<string>
): AppNotification[] {
  const normAuthSubdiv = normalizeCanonicalSubdivision(authorizedSubdivision);
  const isCircleWide =
    !authorizedSubdivision ||
    authorizedSubdivision === 'All' ||
    authorizedSubdivision.toLowerCase().includes('corporate circle');

  return notifications
    .filter(n => {
      if (dismissedIds?.has(n.id)) return false;
      if (n.targetRole !== 'employee') return false;
      if (n.category !== 'Billing') return false;
      if (isCircleWide) return true;
      const notifSubdiv = normalizeCanonicalSubdivision(n.subdivision || 'Mehsana City North');
      return notifSubdiv.toLowerCase() === normAuthSubdiv.toLowerCase();
    })
    .map(n => (readIds?.has(n.id) ? { ...n, read: true } : n));
}

// ============================================================================
// 4. FOUR-LANGUAGE LOCALIZATION DICTIONARY (EN, GU, HI, MR)
// ============================================================================

export interface FormalNoticeTranslations {
  sectionTitle: string;
  noticeIdLabel: string;
  statutoryBasisLabel: string;
  issueDateLabel: string;
  serviceDateLabel: string;
  serviceMethodLabel: string;
  serviceEvidenceLabel: string;
  paymentDeadlineLabel: string;
  deadlineDateLabel: string;
  daysRemainingLabel: (days: number) => string;
  snapshotAtIssuanceTitle: string;
  currentLiveBalanceTitle: string;
  snapshotVsLiveNote: string;
  disconnectionReviewLabel: string;
  demoSafeguardBanner: string;
  demoDisclosure: string;
  updatedAccountStatementBtn: string;
  updatedAccountStatementTitle: string;
  holdBtn: string;
  withdrawBtn: string;
  approveBtn: string;
  issueAndServeBtn: string;
  nineFields: {
    originalBillAmount: string;
    paymentsSuccessfullySettled: string;
    remainingPrincipal: string;
    accruedLatePaymentCharges: string;
    chargesAlreadyPaidOrWaived: string;
    totalCurrentOutstanding: string;
    originalDueDate: string;
    daysOverdue: string;
    lastCalculationDate: string;
  };
  statuses: Record<FormalNoticeStatus, string>;
  disconnectionReviewStatuses: Record<DisconnectionReviewStatus, string>;
  milestones: {
    ORIGINAL_BILL_DUE_DATE: string;
    LATE_CHARGE_ACCRUAL_DATE: string;
    FORMAL_NOTICE_ISSUE_DATE: string;
    FORMAL_NOTICE_PAYMENT_DEADLINE: string;
    AUTHORIZED_DISCONNECTION_REVIEW: string;
  };
  notifTitles: {
    UPCOMING_DUE_5D: (billNo: string) => string;
    UPCOMING_DUE_1D: (billNo: string) => string;
    DUE_TODAY: (billNo: string) => string;
    OVERDUE_DAY_1: (billNo: string) => string;
    OVERDUE_SUBSEQUENT_REMINDER: (billNo: string, days: number) => string;
    FORMAL_NOTICE_ISSUED: (noticeId: string) => string;
    FORMAL_NOTICE_DEADLINE_APPROACHING: (noticeId: string, daysLeft: number) => string;
    FORMAL_NOTICE_DEADLINE_REACHED: (noticeId: string) => string;
    PAYMENT_RECEIVED: (billNo: string) => string;
    BALANCE_FULLY_SETTLED: (billNo: string) => string;
    NOTICE_WITHDRAWN_OR_RESOLVED: (noticeId: string) => string;
  };
  notifMessages: {
    UPCOMING_DUE_5D: (p: { billNo: string; consumerNo: string; dueDate: string; totalOutstanding: number }) => string;
    UPCOMING_DUE_1D: (p: { billNo: string; consumerNo: string; dueDate: string; totalOutstanding: number }) => string;
    DUE_TODAY: (p: { billNo: string; consumerNo: string; dueDate: string; totalOutstanding: number }) => string;
    OVERDUE_DAY_1: (p: { billNo: string; consumerNo: string; dueDate: string; daysOverdue: number; remainingPrincipal: number; lateCharges: number; totalOutstanding: number }) => string;
    OVERDUE_SUBSEQUENT_REMINDER: (p: { billNo: string; consumerNo: string; dueDate: string; daysOverdue: number; remainingPrincipal: number; lateCharges: number; totalOutstanding: number; noticeId?: string }) => string;
    FORMAL_NOTICE_ISSUED: (p: { noticeId: string; billNo: string; consumerNo: string; issueDate: string; paymentDeadlineDate: string; daysOverdue: number; lateCharges: number; totalOutstanding: number }) => string;
    FORMAL_NOTICE_DEADLINE_APPROACHING: (p: { noticeId: string; billNo: string; consumerNo: string; paymentDeadlineDate: string; daysRemaining: number; totalOutstanding: number; lateCharges: number }) => string;
    FORMAL_NOTICE_DEADLINE_REACHED: (p: { noticeId: string; billNo: string; consumerNo: string; paymentDeadlineDate: string; totalOutstanding: number; lateCharges: number }) => string;
    PAYMENT_RECEIVED: (p: { billNo: string; consumerNo: string; paidAmount: number; remainingPrincipal: number; lateCharges: number; totalOutstanding: number; dueDate: string }) => string;
    BALANCE_FULLY_SETTLED: (p: { billNo: string; consumerNo: string; settledAmount: number; waivedAmount: number; dueDate: string }) => string;
    NOTICE_WITHDRAWN_OR_RESOLVED: (p: { noticeId: string; billNo: string; consumerNo: string; status: string }) => string;
  };
}

export function getFormalNoticeTranslations(lang: Language = 'en'): FormalNoticeTranslations {
  const baseReviewEn: Record<DisconnectionReviewStatus, string> = {
    NOT_APPLICABLE: 'Not Applicable',
    NOTICE_PERIOD_ACTIVE: '15-Day Statutory Notice Window Active',
    NOT_ELIGIBLE_DURING_NOTICE_PERIOD: '15-Day Statutory Notice Window Active',
    ON_HOLD_PROTECTED: 'Protected Under Dispute / Administrative Hold',
    AUTHORIZED_REVIEW_REQUIRED: 'Authorized Officer Review Required (No Auto-Disconnection)',
    RESOLVED_NO_ACTION: 'Balance Resolved — No Action Required',
    RESOLVED_BY_SETTLEMENT: 'Balance Resolved — No Action Required',
    WITHDRAWN: 'Notice Administratively Withdrawn',
  };
  const baseReviewGu: Record<DisconnectionReviewStatus, string> = {
    NOT_APPLICABLE: 'લાગુ પડતું નથી',
    NOTICE_PERIOD_ACTIVE: '૧૫-દિવસની વૈધાનિક નોટિસ મુદત સક્રિય',
    NOT_ELIGIBLE_DURING_NOTICE_PERIOD: '૧૫-દિવસની વૈધાનિક નોટિસ મુદત સક્રિય',
    ON_HOLD_PROTECTED: 'વિવાદ / વહીવટી હોલ્ડ હેઠળ સુરક્ષિત',
    AUTHORIZED_REVIEW_REQUIRED: 'અધિકૃત અધિકારી સમીક્ષા જરૂરી (આપમેળે જોડાણ કપાશે નહીં)',
    RESOLVED_NO_ACTION: 'બાકી રકમ ચૂકવાઈ — કોઈ કાર્યવાહી જરૂરી નથી',
    RESOLVED_BY_SETTLEMENT: 'બાકી રકમ ચૂકવાઈ — કોઈ કાર્યવાહી જરૂરી નથી',
    WITHDRAWN: 'નોટિસ વહીવટી રીતે પાછી ખેંચાઈ',
  };
  const baseReviewHi: Record<DisconnectionReviewStatus, string> = {
    NOT_APPLICABLE: 'लागू नहीं',
    NOTICE_PERIOD_ACTIVE: '15-दिवसीय वैधानिक नोटिस अवधि सक्रिय',
    NOT_ELIGIBLE_DURING_NOTICE_PERIOD: '15-दिवसीय वैधानिक नोटिस अवधि सक्रिय',
    ON_HOLD_PROTECTED: 'विवाद / प्रशासनिक होल्ड के तहत सुरक्षित',
    AUTHORIZED_REVIEW_REQUIRED: 'अधिकृत अधिकारी समीक्षा आवश्यक (स्वतः विच्छेदन नहीं)',
    RESOLVED_NO_ACTION: 'बकाया राशि चुकता — कोई कार्रवाई अपेक्षित नहीं',
    RESOLVED_BY_SETTLEMENT: 'बकाया राशि चुकता — कोई कार्रवाई अपेक्षित नहीं',
    WITHDRAWN: 'नोटिस प्रशासनिक रूप से वापस लिया गया',
  };
  const baseReviewMr: Record<DisconnectionReviewStatus, string> = {
    NOT_APPLICABLE: 'लागू नाही',
    NOTICE_PERIOD_ACTIVE: '१५-दिवसीय वैधानिक नोटीस कालावधी सक्रिय',
    NOT_ELIGIBLE_DURING_NOTICE_PERIOD: '१५-दिवसीय वैधानिक नोटीस कालावधी सक्रिय',
    ON_HOLD_PROTECTED: 'तक्रार / प्रशासकीय होल्ड अंतर्गत संरक्षित',
    AUTHORIZED_REVIEW_REQUIRED: 'अधिकृत अधिकारी पुनरावलोकन आवश्यक (आपोआप जोडणी खंडित नाही)',
    RESOLVED_NO_ACTION: 'थकबाकी पूर्ण भरली — कोणतीही कारवाई आवश्यक नाही',
    RESOLVED_BY_SETTLEMENT: 'थकबाकी पूर्ण भरली — कोणतीही कारवाई आवश्यक नाही',
    WITHDRAWN: 'नोटीस प्रशासकीयरीत्या मागे घेतली',
  };

  const dict: Record<Language, FormalNoticeTranslations> = {
    en: {
      sectionTitle: 'Section 56 Formal Notice & Statutory Payment Deadline (DEMO)',
      noticeIdLabel: 'Formal Notice ID',
      statutoryBasisLabel: 'Statutory Basis',
      issueDateLabel: 'Notice Issue Date',
      serviceDateLabel: 'Notice Service Date',
      serviceMethodLabel: 'Service Delivery Mode',
      serviceEvidenceLabel: 'Service Evidence Ref',
      paymentDeadlineLabel: 'Formal Notice Payment Deadline (15 Clear Days)',
      deadlineDateLabel: '15-Day Payment Deadline',
      daysRemainingLabel: (d: number) =>
        d > 0 ? `${d} Clear Days Remaining` : d === 0 ? 'Notice Deadline Today' : `Notice Deadline Expired (${Math.abs(d)}d ago)`,
      snapshotAtIssuanceTitle: 'Frozen Balance at Notice Issuance',
      currentLiveBalanceTitle: 'Current Updated Outstanding Balance',
      snapshotVsLiveNote: 'Frozen at Issuance vs Live Balance',
      disconnectionReviewLabel: 'Disconnection Governance Status',
      demoSafeguardBanner:
        'DEMO SIMULATION SAFEGUARD: Simulated workflow under Section 56(1), Electricity Act, 2003 (15 clear days notice). Not a legally served live UGVCL demand. Expiry triggers Authorized Officer Review only — never automatic physical disconnection.',
      demoDisclosure:
        'DEMO SIMULATION SAFEGUARD: Simulated workflow under Section 56(1), Electricity Act, 2003 (15 clear days notice). Not a legally served live UGVCL demand. Expiry triggers Authorized Officer Review only — never automatic physical disconnection.',
      updatedAccountStatementBtn: 'Updated Account Statement',
      updatedAccountStatementTitle: 'Updated Account Statement & Overdue Demand Summary',
      holdBtn: 'Place Notice on Hold',
      withdrawBtn: 'Withdraw Notice',
      approveBtn: 'Approve Notice',
      issueAndServeBtn: 'Issue & Serve Notice',
      nineFields: {
        originalBillAmount: 'Original Bill Amount',
        paymentsSuccessfullySettled: 'Payments Successfully Settled',
        remainingPrincipal: 'Remaining Principal',
        accruedLatePaymentCharges: 'Accrued Late-Payment Charges (DPS)',
        chargesAlreadyPaidOrWaived: 'Charges Already Paid or Waived',
        totalCurrentOutstanding: 'Total Current Outstanding',
        originalDueDate: 'Original Due Date',
        daysOverdue: 'Days Overdue',
        lastCalculationDate: 'Last Calculation Date',
      },
      statuses: {
        NOT_REQUIRED: 'Not Required',
        ELIGIBLE_FOR_REVIEW: 'Eligible for Notice Review',
        DRAFT: 'Draft Prepared',
        PENDING_APPROVAL: 'Pending SDO Approval',
        APPROVED: 'Approved for Issue',
        ISSUED: 'Formal Notice Issued',
        SERVICE_PENDING: 'Service Delivery Pending',
        SERVED: 'Formal Notice Served (15-Day Period Active)',
        DEADLINE_APPROACHING: 'Notice Deadline Approaching',
        DEADLINE_REACHED: 'Notice Deadline Reached — Authorized Review Required',
        ON_HOLD: 'On Hold (Dispute / Stay Active)',
        WITHDRAWN: 'Notice Withdrawn',
        RESOLVED: 'Resolved & Settled',
      },
      disconnectionReviewStatuses: baseReviewEn,
      milestones: {
        ORIGINAL_BILL_DUE_DATE: 'A. Original Bill Payment Deadline',
        LATE_CHARGE_ACCRUAL_DATE: 'B. Daily Late-Charge Accrual Active',
        FORMAL_NOTICE_ISSUE_DATE: 'C. Formal Section 56 Notice Issued (DEMO)',
        FORMAL_NOTICE_PAYMENT_DEADLINE: 'D. Formal Notice 15-Day Payment Deadline',
        AUTHORIZED_DISCONNECTION_REVIEW: 'E. Authorized Disconnection-Review Status',
      },
      notifTitles: {
        UPCOMING_DUE_5D: billNo => `Upcoming Payment Due in 5 Days: ${billNo}`,
        UPCOMING_DUE_1D: billNo => `Payment Due Tomorrow: ${billNo}`,
        DUE_TODAY: billNo => `Electricity Bill Due Today: ${billNo}`,
        OVERDUE_DAY_1: billNo => `Bill Overdue (Day 1): ${billNo}`,
        OVERDUE_SUBSEQUENT_REMINDER: (billNo, days) => `Overdue Reminder (${days} Days Overdue): ${billNo}`,
        FORMAL_NOTICE_ISSUED: noticeId => `Formal Payment Notice Issued (DEMO): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: (noticeId, daysLeft) =>
          `Formal Notice Deadline Approaching (${daysLeft} Days Left): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_REACHED: noticeId =>
          `Formal Notice Deadline Reached (Review Required): ${noticeId}`,
        PAYMENT_RECEIVED: billNo => `Partial Payment Recorded: ${billNo}`,
        BALANCE_FULLY_SETTLED: billNo => `Electricity Bill Balance Fully Settled: ${billNo}`,
        NOTICE_WITHDRAWN_OR_RESOLVED: noticeId => `Formal Notice Closed / Resolved: ${noticeId}`,
      },
      notifMessages: {
        UPCOMING_DUE_5D: p =>
          `Bill ${p.billNo} for Connection ${p.consumerNo} is due in 5 days on ${p.dueDate}. Current payable: ₹${p.totalOutstanding.toFixed(2)}.`,
        UPCOMING_DUE_1D: p =>
          `Reminder: Bill ${p.billNo} for Connection ${p.consumerNo} is due tomorrow (${p.dueDate}). Payable amount: ₹${p.totalOutstanding.toFixed(2)}.`,
        DUE_TODAY: p =>
          `Bill ${p.billNo} for Connection ${p.consumerNo} is due today (${p.dueDate}). Please settle ₹${p.totalOutstanding.toFixed(2)} to avoid delayed payment charges.`,
        OVERDUE_DAY_1: p =>
          `Bill ${p.billNo} (Connection ${p.consumerNo}, Due: ${p.dueDate}) is now 1 day overdue. Remaining Principal: ₹${p.remainingPrincipal.toFixed(2)}, Accrued Late Charges: ₹${p.lateCharges.toFixed(2)}, Total Outstanding: ₹${p.totalOutstanding.toFixed(2)}.`,
        OVERDUE_SUBSEQUENT_REMINDER: p =>
          `Bill ${p.billNo} (Connection ${p.consumerNo}, Due: ${p.dueDate}) is ${p.daysOverdue} days overdue. Remaining Principal: ₹${p.remainingPrincipal.toFixed(2)}, Late Charges (DPS): ₹${p.lateCharges.toFixed(2)}, Total Current Outstanding: ₹${p.totalOutstanding.toFixed(2)}.${p.noticeId ? ` Active Notice: ${p.noticeId}.` : ''}`,
        FORMAL_NOTICE_ISSUED: p =>
          `DEMO Section 56 Notice ${p.noticeId} issued on ${p.issueDate} for Bill ${p.billNo} (Connection ${p.consumerNo}, ${p.daysOverdue}d overdue). 15-day statutory payment deadline: ${p.paymentDeadlineDate}. Total Current Outstanding: ₹${p.totalOutstanding.toFixed(2)} (includes ₹${p.lateCharges.toFixed(2)} DPS).`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: p =>
          `Notice ${p.noticeId} for Bill ${p.billNo} (Connection ${p.consumerNo}) has ${p.daysRemaining} clear days remaining before the ${p.paymentDeadlineDate} deadline. Current Outstanding: ₹${p.totalOutstanding.toFixed(2)} (DPS: ₹${p.lateCharges.toFixed(2)}).`,
        FORMAL_NOTICE_DEADLINE_REACHED: p =>
          `The 15-day payment deadline (${p.paymentDeadlineDate}) under DEMO Notice ${p.noticeId} for Bill ${p.billNo} (Connection ${p.consumerNo}) has been reached. Total Outstanding: ₹${p.totalOutstanding.toFixed(2)}. Status: Authorized Officer Review Required (no automatic disconnection).`,
        PAYMENT_RECEIVED: p =>
          `Settled payment of ₹${p.paidAmount.toFixed(2)} credited to Bill ${p.billNo} (Connection ${p.consumerNo}, Due: ${p.dueDate}). Remaining Principal: ₹${p.remainingPrincipal.toFixed(2)}, Accrued DPS: ₹${p.lateCharges.toFixed(2)}, Updated Total Outstanding: ₹${p.totalOutstanding.toFixed(2)}.`,
        BALANCE_FULLY_SETTLED: p =>
          `Bill ${p.billNo} (Connection ${p.consumerNo}, Due: ${p.dueDate}) is now fully settled (Paid: ₹${p.settledAmount.toFixed(2)}, Waived: ₹${p.waivedAmount.toFixed(2)}). Daily late-charge accrual has stopped.`,
        NOTICE_WITHDRAWN_OR_RESOLVED: p =>
          `Formal Notice ${p.noticeId} for Bill ${p.billNo} (Connection ${p.consumerNo}) has been marked ${p.status}. No further notice action is pending.`,
      },
    },
    gu: {
      sectionTitle: 'કલમ ૫૬ ઔપચારિક નોટિસ અને વૈધાનિક ચુકવણી મુદત (DEMO)',
      noticeIdLabel: 'ઔપચારિક નોટિસ ક્રમાંક',
      statutoryBasisLabel: 'વૈધાનિક આધાર',
      issueDateLabel: 'નોટિસ જારી તારીખ',
      serviceDateLabel: 'નોટિસ બજવણી તારીખ',
      serviceMethodLabel: 'બજવણી માધ્યમ',
      serviceEvidenceLabel: 'બજવણી પુરાવા સંદર્ભ',
      paymentDeadlineLabel: 'નોટિસ ચુકવણી અંતિમ તારીખ (૧૫ સ્પષ્ટ દિવસ)',
      deadlineDateLabel: '૧૫-દિવસ ચુકવણી મુદત',
      daysRemainingLabel: (d: number) =>
        d > 0 ? `${d} સ્પષ્ટ દિવસ બાકી` : d === 0 ? 'નોટિસ મુદત આજે પૂર્ણ' : `નોટિસ મુદત પૂર્ણ (${Math.abs(d)} દિવસ પહેલાં)`,
      snapshotAtIssuanceTitle: 'નોટિસ જારી સમયે સ્થિર રકમ',
      currentLiveBalanceTitle: 'વર્તમાન અદ્યતન બાકી રકમ',
      snapshotVsLiveNote: 'નોટિસ સમયે રકમ વિ. વર્તમાન બાકી',
      disconnectionReviewLabel: 'જોડાણ સમીક્ષા સ્થિતિ',
      demoSafeguardBanner:
        'DEMO સિમ્યુલેશન સૂચના: વીજળી અધિનિયમ ૨૦૦૩ની કલમ ૫૬(૧) હેઠળ ૧૫ દિવસની નોટિસનું આ માત્ર ડેમો સિમ્યુલેશન છે. મુદત પૂર્ણ થયે આપમેળે વીજ જોડાણ કાપવામાં આવતું નથી — માત્ર અધિકૃત અધિકારી સમીક્ષા થાય છે.',
      demoDisclosure:
        'DEMO સિમ્યુલેશન સૂચના: વીજળી અધિનિયમ ૨૦૦૩ની કલમ ૫૬(૧) હેઠળ ૧૫ દિવસની નોટિસનું આ માત્ર ડેમો સિમ્યુલેશન છે. મુદત પૂર્ણ થયે આપમેળે વીજ જોડાણ કાપવામાં આવતું નથી — માત્ર અધિકૃત અધિકારી સમીક્ષા થાય છે.',
      updatedAccountStatementBtn: 'અદ્યતન ખાતા પત્રક (Account Statement)',
      updatedAccountStatementTitle: 'અદ્યતન ખાતા પત્રક અને મુદતવીતી માંગણી સારાંશ',
      holdBtn: 'નોટિસ હોલ્ડ પર મૂકો',
      withdrawBtn: 'નોટિસ પાછી ખેંચો',
      approveBtn: 'નોટિસ મંજૂર કરો',
      issueAndServeBtn: 'નોટિસ જારી અને બજવણી કરો',
      nineFields: {
        originalBillAmount: 'મૂળ બિલ રકમ',
        paymentsSuccessfullySettled: 'સફળતાપૂર્વક ચૂકવેલ રકમ',
        remainingPrincipal: 'બાકી મુદ્દલ રકમ',
        accruedLatePaymentCharges: 'ચઢેલ વિલંબિત ચુકવણી સરચાર્જ (DPS)',
        chargesAlreadyPaidOrWaived: 'ચૂકવેલ અથવા માફ કરેલ સરચાર્જ',
        totalCurrentOutstanding: 'કુલ વર્તમાન બાકી રકમ',
        originalDueDate: 'મૂળ ચુકવણી અંતિમ તારીખ',
        daysOverdue: 'મુદતવીતી દિવસો',
        lastCalculationDate: 'છેલ્લી ગણતરી તારીખ',
      },
      statuses: {
        NOT_REQUIRED: 'જરૂરી નથી',
        ELIGIBLE_FOR_REVIEW: 'નોટિસ સમીક્ષા માટે પાત્ર',
        DRAFT: 'ડ્રાફ્ટ તૈયાર',
        PENDING_APPROVAL: 'SDO મંજૂરી બાકી',
        APPROVED: 'જારી કરવા મંજૂર',
        ISSUED: 'ઔપચારિક નોટિસ જારી',
        SERVICE_PENDING: 'બજવણી બાકી',
        SERVED: 'નોટિસ બજવેલ (૧૫-દિવસની મુદત સક્રિય)',
        DEADLINE_APPROACHING: 'નોટિસ મુદત નજીક છે',
        DEADLINE_REACHED: 'નોટિસ મુદત પૂર્ણ — અધિકૃત સમીક્ષા જરૂરી',
        ON_HOLD: 'હોલ્ડ પર (વિવાદ / સ્ટે સક્રિય)',
        WITHDRAWN: 'નોટિસ પાછી ખેંચાઈ',
        RESOLVED: 'નિરાકરણ અને ચુકવણી પૂર્ણ',
      },
      disconnectionReviewStatuses: baseReviewGu,
      milestones: {
        ORIGINAL_BILL_DUE_DATE: 'A. મૂળ બિલ ચુકવણી અંતિમ તારીખ',
        LATE_CHARGE_ACCRUAL_DATE: 'B. દૈનિક વિલંબ સરચાર્જ ગણતરી સક્રિય',
        FORMAL_NOTICE_ISSUE_DATE: 'C. કલમ ૫૬ ઔપચારિક નોટિસ જારી (DEMO)',
        FORMAL_NOTICE_PAYMENT_DEADLINE: 'D. ઔપચારિક નોટિસ ૧૫-દિવસ ચુકવણી મુદત',
        AUTHORIZED_DISCONNECTION_REVIEW: 'E. અધિકૃત જોડાણ-સમીક્ષા સ્થિતિ',
      },
      notifTitles: {
        UPCOMING_DUE_5D: billNo => `૫ દિવસમાં બિલ ચુકવણી મુદત: ${billNo}`,
        UPCOMING_DUE_1D: billNo => `આવતીકાલે બિલ ચુકવણીની છેલ્લી તારીખ: ${billNo}`,
        DUE_TODAY: billNo => `આજે વીજ બિલ ચુકવણીની અંતિમ તારીખ: ${billNo}`,
        OVERDUE_DAY_1: billNo => `વીજ બિલ મુદતવીતી (દિવસ ૧): ${billNo}`,
        OVERDUE_SUBSEQUENT_REMINDER: (billNo, days) => `મુદતવીતી બિલ રિમાઇન્ડર (${days} દિવસ મુદતવીતી): ${billNo}`,
        FORMAL_NOTICE_ISSUED: noticeId => `ઔપચારિક ચુકવણી નોટિસ જારી (DEMO): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: (noticeId, daysLeft) =>
          `નોટિસ ચુકવણી મુદત નજીક છે (${daysLeft} દિવસ બાકી): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_REACHED: noticeId =>
          `નોટિસ ચુકવણી મુદત પૂર્ણ (સમીક્ષા જરૂરી): ${noticeId}`,
        PAYMENT_RECEIVED: billNo => `આંશિક ચુકવણી નોંધાઈ: ${billNo}`,
        BALANCE_FULLY_SETTLED: billNo => `વીજ બિલની સંપૂર્ણ રકમ ચૂકવાઈ ગઈ: ${billNo}`,
        NOTICE_WITHDRAWN_OR_RESOLVED: noticeId => `ઔપચારિક નોટિસ પૂર્ણ / નિરાકરણ: ${noticeId}`,
      },
      notifMessages: {
        UPCOMING_DUE_5D: p =>
          `જોડાણ ${p.consumerNo} માટે બિલ ${p.billNo} ની ચુકવણી તારીખ ${p.dueDate} (૫ દિવસ બાકી) છે. ચૂકવવાપાત્ર રકમ: ₹${p.totalOutstanding.toFixed(2)}.`,
        UPCOMING_DUE_1D: p =>
          `રિમાઇન્ડર: જોડાણ ${p.consumerNo} માટે બિલ ${p.billNo} આવતીકાલે (${p.dueDate}) પાકે છે. ચૂકવવાપાત્ર રકમ: ₹${p.totalOutstanding.toFixed(2)}.`,
        DUE_TODAY: p =>
          `જોડાણ ${p.consumerNo} માટે બિલ ${p.billNo} આજે (${p.dueDate}) પાકે છે. વિલંબ સરચાર્જ ટાળવા ₹${p.totalOutstanding.toFixed(2)} ચૂકવો.`,
        OVERDUE_DAY_1: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}, ડ્યુ ડેટ: ${p.dueDate}) ૧ દિવસ મુદતવીતી છે. બાકી મુદ્દલ: ₹${p.remainingPrincipal.toFixed(2)}, વિલંબ ચાર્જ: ₹${p.lateCharges.toFixed(2)}, કુલ બાકી: ₹${p.totalOutstanding.toFixed(2)}.`,
        OVERDUE_SUBSEQUENT_REMINDER: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}, ડ્યુ ડેટ: ${p.dueDate}) ${p.daysOverdue} દિવસ મુદતવીતી છે. બાકી મુદ્દલ: ₹${p.remainingPrincipal.toFixed(2)}, વિલંબ ચાર્જ (DPS): ₹${p.lateCharges.toFixed(2)}, કુલ બાકી: ₹${p.totalOutstanding.toFixed(2)}.`,
        FORMAL_NOTICE_ISSUED: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}) માટે DEMO કલમ ૫૬ નોટિસ ${p.noticeId} તારીખ ${p.issueDate} ના રોજ જારી થઈ છે. ૧૫-દિવસની ચુકવણી મુદત: ${p.paymentDeadlineDate}. કુલ બાકી: ₹${p.totalOutstanding.toFixed(2)}.`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}) ની નોટિસ ${p.noticeId} ની મુદત (${p.paymentDeadlineDate}) પૂર્ણ થવામાં ${p.daysRemaining} દિવસ બાકી છે. કુલ બાકી: ₹${p.totalOutstanding.toFixed(2)}.`,
        FORMAL_NOTICE_DEADLINE_REACHED: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}) માટે DEMO નોટિસ ${p.noticeId} ની ૧૫-દિવસની મુદત (${p.paymentDeadlineDate}) પૂર્ણ થઈ છે. કુલ બાકી: ₹${p.totalOutstanding.toFixed(2)}. સ્થિતિ: અધિકૃત અધિકારી સમીક્ષા જરૂરી.`,
        PAYMENT_RECEIVED: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}) માં ₹${p.paidAmount.toFixed(2)} ની ચુકવણી જમા થઈ છે. બાકી મુદ્દલ: ₹${p.remainingPrincipal.toFixed(2)}, વિલંબ ચાર્જ: ₹${p.lateCharges.toFixed(2)}, કુલ બાકી: ₹${p.totalOutstanding.toFixed(2)}.`,
        BALANCE_FULLY_SETTLED: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}) ની સંપૂર્ણ બાકી રકમ ચૂકવાઈ ગઈ છે. દૈનિક વિલંબ ચાર્જ બંધ કરવામાં આવ્યો છે.`,
        NOTICE_WITHDRAWN_OR_RESOLVED: p =>
          `બિલ ${p.billNo} (જોડાણ ${p.consumerNo}) માટેની ઔપચારિક નોટિસ ${p.noticeId} હવે ${p.status} તરીકે બંધ કરવામાં આવી છે.`,
      },
    },
    hi: {
      sectionTitle: 'धारा 56 औपचारिक नोटिस एवं वैधानिक भुगतान समय-सीमा (DEMO)',
      noticeIdLabel: 'औपचारिक नोटिस संख्या',
      statutoryBasisLabel: 'वैधानिक आधार',
      issueDateLabel: 'नोटिस जारी तिथि',
      serviceDateLabel: 'नोटिस तामील तिथि',
      serviceMethodLabel: 'तामील माध्यम',
      serviceEvidenceLabel: 'तामील प्रमाण संदर्भ',
      paymentDeadlineLabel: 'औपचारिक नोटिस भुगतान समय-सीमा (15 स्पष्ट दिन)',
      deadlineDateLabel: '15-दिवसीय भुगतान समय-सीमा',
      daysRemainingLabel: (d: number) =>
        d > 0 ? `${d} स्पष्ट दिन शेष` : d === 0 ? 'नोटिस समय-सीमा आज' : `नोटिस समय-सीमा समाप्त (${Math.abs(d)} दिन पूर्व)`,
      snapshotAtIssuanceTitle: 'नोटिस जारी होने के समय स्थिर राशि',
      currentLiveBalanceTitle: 'वर्तमान अद्यतन बकाया राशि',
      snapshotVsLiveNote: 'जारी समय बनाम वर्तमान बकाया',
      disconnectionReviewLabel: 'संयोजन विच्छेदन समीक्षा स्थिति',
      demoSafeguardBanner:
        'DEMO सिमुलेशन सुरक्षा: विद्युत अधिनियम 2003 की धारा 56(1) के अंतर्गत 15-दिवसीय नोटिस का यह एक डेमो सिमुलेशन है। समय-सीमा समाप्त होने पर स्वतः कनेक्शन नहीं काटा जाता — केवल अधिकृत अधिकारी समीक्षा होती है।',
      demoDisclosure:
        'DEMO सिमुलेशन सुरक्षा: विद्युत अधिनियम 2003 की धारा 56(1) के अंतर्गत 15-दिवसीय नोटिस का यह एक डेमो सिमुलेशन है। समय-सीमा समाप्त होने पर स्वतः कनेक्शन नहीं काटा जाता — केवल अधिकृत अधिकारी समीक्षा होती है।',
      updatedAccountStatementBtn: 'अद्यतन खाता विवरण (Account Statement)',
      updatedAccountStatementTitle: 'अद्यतन खाता विवरण एवं अतिदेय मांग सारांश',
      holdBtn: 'नोटिस होल्ड पर रखें',
      withdrawBtn: 'नोटिस वापस लें',
      approveBtn: 'नोटिस स्वीकृत करें',
      issueAndServeBtn: 'नोटिस जारी एवं तामील करें',
      nineFields: {
        originalBillAmount: 'मूल बिल राशि',
        paymentsSuccessfullySettled: 'सफलतापूर्वक भुगतान की गई राशि',
        remainingPrincipal: 'शेष मूलधन राशि',
        accruedLatePaymentCharges: 'संचित विलंब भुगतान अधिभार (DPS)',
        chargesAlreadyPaidOrWaived: 'भुगतान या माफ किया गया अधिभार',
        totalCurrentOutstanding: 'कुल वर्तमान बकाया राशि',
        originalDueDate: 'मूल देय तिथि',
        daysOverdue: 'अतिदेय दिन',
        lastCalculationDate: 'अंतिम गणना तिथि',
      },
      statuses: {
        NOT_REQUIRED: 'आवश्यक नहीं',
        ELIGIBLE_FOR_REVIEW: 'नोटिस समीक्षा हेतु पात्र',
        DRAFT: 'ड्राफ्ट तैयार',
        PENDING_APPROVAL: 'SDO स्वीकृति लंबित',
        APPROVED: 'जारी करने हेतु स्वीकृत',
        ISSUED: 'औपचारिक नोटिस जारी',
        SERVICE_PENDING: 'तामील लंबित',
        SERVED: 'नोटिस तामील (15-दिवसीय अवधि सक्रिय)',
        DEADLINE_APPROACHING: 'नोटिस समय-सीमा निकट',
        DEADLINE_REACHED: 'नोटिस समय-सीमा पूर्ण — अधिकृत समीक्षा आवश्यक',
        ON_HOLD: 'होल्ड पर (विवाद / स्टे सक्रिय)',
        WITHDRAWN: 'नोटिस वापस लिया गया',
        RESOLVED: 'निराकृत एवं पूर्ण भुगतान',
      },
      disconnectionReviewStatuses: baseReviewHi,
      milestones: {
        ORIGINAL_BILL_DUE_DATE: 'A. मूल बिल भुगतान अंतिम तिथि',
        LATE_CHARGE_ACCRUAL_DATE: 'B. दैनिक विलंब अधिभार गणना सक्रिय',
        FORMAL_NOTICE_ISSUE_DATE: 'C. धारा 56 औपचारिक नोटिस जारी (DEMO)',
        FORMAL_NOTICE_PAYMENT_DEADLINE: 'D. औपचारिक नोटिस 15-दिवसीय भुगतान समय-सीमा',
        AUTHORIZED_DISCONNECTION_REVIEW: 'E. अधिकृत विच्छेदन-समीक्षा स्थिति',
      },
      notifTitles: {
        UPCOMING_DUE_5D: billNo => `5 दिनों में बिल भुगतान देय: ${billNo}`,
        UPCOMING_DUE_1D: billNo => `कल बिल भुगतान की अंतिम तिथि: ${billNo}`,
        DUE_TODAY: billNo => `आज बिजली बिल भुगतान की अंतिम तिथि: ${billNo}`,
        OVERDUE_DAY_1: billNo => `बिजली बिल अतिदेय (दिन 1): ${billNo}`,
        OVERDUE_SUBSEQUENT_REMINDER: (billNo, days) => `अतिदेय बिल अनुस्मारक (${days} दिन अतिदेय): ${billNo}`,
        FORMAL_NOTICE_ISSUED: noticeId => `औपचारिक भुगतान नोटिस जारी (DEMO): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: (noticeId, daysLeft) =>
          `नोटिस समय-सीमा निकट (${daysLeft} दिन शेष): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_REACHED: noticeId =>
          `नोटिस समय-सीमा समाप्त (समीक्षा आवश्यक): ${noticeId}`,
        PAYMENT_RECEIVED: billNo => `आंशिक भुगतान दर्ज: ${billNo}`,
        BALANCE_FULLY_SETTLED: billNo => `बिजली बिल बकाया पूर्णतः चुकता: ${billNo}`,
        NOTICE_WITHDRAWN_OR_RESOLVED: noticeId => `औपचारिक नोटिस बंद / निराकृत: ${noticeId}`,
      },
      notifMessages: {
        UPCOMING_DUE_5D: p =>
          `कनेक्शन ${p.consumerNo} के बिल ${p.billNo} की देय तिथि ${p.dueDate} (5 दिन शेष) है। देय राशि: ₹${p.totalOutstanding.toFixed(2)}।`,
        UPCOMING_DUE_1D: p =>
          `अनुस्मारक: कनेक्शन ${p.consumerNo} का बिल ${p.billNo} कल (${p.dueDate}) देय है। देय राशि: ₹${p.totalOutstanding.toFixed(2)}।`,
        DUE_TODAY: p =>
          `कनेक्शन ${p.consumerNo} का बिल ${p.billNo} आज (${p.dueDate}) देय है। विलंब शुल्क से बचने हेतु ₹${p.totalOutstanding.toFixed(2)} का भुगतान करें।`,
        OVERDUE_DAY_1: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}, देय तिथि: ${p.dueDate}) 1 दिन अतिदेय है। शेष मूलधन: ₹${p.remainingPrincipal.toFixed(2)}, विलंब शुल्क: ₹${p.lateCharges.toFixed(2)}, कुल बकाया: ₹${p.totalOutstanding.toFixed(2)}।`,
        OVERDUE_SUBSEQUENT_REMINDER: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}, देय तिथि: ${p.dueDate}) ${p.daysOverdue} दिन अतिदेय है। शेष मूलधन: ₹${p.remainingPrincipal.toFixed(2)}, विलंब शुल्क (DPS): ₹${p.lateCharges.toFixed(2)}, कुल वर्तमान बकाया: ₹${p.totalOutstanding.toFixed(2)}।`,
        FORMAL_NOTICE_ISSUED: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}) हेतु DEMO धारा 56 नोटिस ${p.noticeId} दिनांक ${p.issueDate} को जारी किया गया है। 15-दिवसीय भुगतान समय-सीमा: ${p.paymentDeadlineDate}। कुल बकाया: ₹${p.totalOutstanding.toFixed(2)}।`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}) के नोटिस ${p.noticeId} की समय-सीमा (${p.paymentDeadlineDate}) में ${p.daysRemaining} दिन शेष हैं। कुल बकाया: ₹${p.totalOutstanding.toFixed(2)}।`,
        FORMAL_NOTICE_DEADLINE_REACHED: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}) हेतु DEMO नोटिस ${p.noticeId} की 15-दिवसीय समय-सीमा (${p.paymentDeadlineDate}) पूर्ण हो गई है। कुल बकाया: ₹${p.totalOutstanding.toFixed(2)}। स्थिति: अधिकृत अधिकारी समीक्षा आवश्यक।`,
        PAYMENT_RECEIVED: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}) में ₹${p.paidAmount.toFixed(2)} का भुगतान प्राप्त हुआ। शेष मूलधन: ₹${p.remainingPrincipal.toFixed(2)}, विलंब शुल्क: ₹${p.lateCharges.toFixed(2)}, कुल बकाया: ₹${p.totalOutstanding.toFixed(2)}।`,
        BALANCE_FULLY_SETTLED: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}) की संपूर्ण राशि चुकता हो गई है। दैनिक विलंब शुल्क बंद कर दिया गया है।`,
        NOTICE_WITHDRAWN_OR_RESOLVED: p =>
          `बिल ${p.billNo} (कनेक्शन ${p.consumerNo}) का औपचारिक नोटिस ${p.noticeId} अब ${p.status} के रूप में बंद कर दिया गया है।`,
      },
    },
    mr: {
      sectionTitle: 'कलम ५६ औपचारिक नोटीस आणि वैधानिक देयक मुदत (DEMO)',
      noticeIdLabel: 'औपचारिक नोटीस क्रमांक',
      statutoryBasisLabel: 'वैधानिक आधार',
      issueDateLabel: 'नोटीस जारी दिनांक',
      serviceDateLabel: 'नोटीस बजावणी दिनांक',
      serviceMethodLabel: 'बजावणी पद्धत',
      serviceEvidenceLabel: 'बजावणी पुरावा संदर्भ',
      paymentDeadlineLabel: 'औपचारिक नोटीस देयक अंतिम मुदत (१५ स्पष्ट दिवस)',
      deadlineDateLabel: '१५-दिवसीय देयक मुदत',
      daysRemainingLabel: (d: number) =>
        d > 0 ? `${d} स्पष्ट दिवस शिल्लक` : d === 0 ? 'नोटीस मुदत आज' : `नोटीस मुदत संपली (${Math.abs(d)} दिवसांपूर्वी)`,
      snapshotAtIssuanceTitle: 'नोटीस जारी करतानाची स्थिर रक्कम',
      currentLiveBalanceTitle: 'सध्याची अद्ययावत थकबाकी रक्कम',
      snapshotVsLiveNote: 'नोटीस वेळची रक्कम वि. सद्य थकबाकी',
      disconnectionReviewLabel: 'जोडणी खंडित पुनरावलोकन स्थिती',
      demoSafeguardBanner:
        'DEMO सिम्युलेशन संरक्षण: वीज कायदा २००३ च्या कलम ५६(१) अंतर्गत १५ दिवसांच्या नोटिशीचे हे केवळ डेमो सिम्युलेशन आहे. मुदत संपल्यावर आपोआप वीज जोडणी तोडली जात नाही — फक्त अधिकृत अधिकारी पुनरावलोकन होते.',
      demoDisclosure:
        'DEMO सिम्युलेशन संरक्षण: वीज कायदा २००३ च्या कलम ५६(१) अंतर्गत १५ दिवसांच्या नोटिशीचे हे केवळ डेमो सिम्युलेशन आहे. मुदत संपल्यावर आपोआप वीज जोडणी तोडली जात नाही — फक्त अधिकृत अधिकारी पुनरावलोकन होते.',
      updatedAccountStatementBtn: 'अद्ययावत खाते विवरण (Account Statement)',
      updatedAccountStatementTitle: 'अद्ययावत खाते विवरण आणि थकीत मागणी सारांश',
      holdBtn: 'नोटीस होल्डवर ठेवा',
      withdrawBtn: 'नोटीस मागे घ्या',
      approveBtn: 'नोटीस मंजूर करा',
      issueAndServeBtn: 'नोटीस जारी आणि बजावणी करा',
      nineFields: {
        originalBillAmount: 'मूळ बिल रक्कम',
        paymentsSuccessfullySettled: 'यशस्वीरित्या भरलेली रक्कम',
        remainingPrincipal: 'उर्वरित मुद्दल रक्कम',
        accruedLatePaymentCharges: 'साचलेला विलंब अधिभार (DPS)',
        chargesAlreadyPaidOrWaived: 'भरलेला किंवा माफ केलेला अधिभार',
        totalCurrentOutstanding: 'एकूण सद्य थकबाकी रक्कम',
        originalDueDate: 'मूळ देय दिनांक',
        daysOverdue: 'थकीत दिवस',
        lastCalculationDate: 'शेवटचा गणना दिनांक',
      },
      statuses: {
        NOT_REQUIRED: 'आवश्यक नाही',
        ELIGIBLE_FOR_REVIEW: 'नोटीस पुनरावलोकनासाठी पात्र',
        DRAFT: 'मसुदा तयार',
        PENDING_APPROVAL: 'SDO मंजुरी प्रलंबित',
        APPROVED: 'जारी करण्यासाठी मंजूर',
        ISSUED: 'औपचारिक नोटीस जारी',
        SERVICE_PENDING: 'बजावणी प्रलंबित',
        SERVED: 'नोटीस बजावली (१५-दिवसीय मुदत सक्रिय)',
        DEADLINE_APPROACHING: 'नोटीस मुदत जवळ आली आहे',
        DEADLINE_REACHED: 'नोटीस मुदत पूर्ण — अधिकृत पुनरावलोकन आवश्यक',
        ON_HOLD: 'होल्डवर (तक्रार / स्थगिती सक्रिय)',
        WITHDRAWN: 'नोटीस मागे घेतली',
        RESOLVED: 'निराकरण आणि पूर्ण भरणा',
      },
      disconnectionReviewStatuses: baseReviewMr,
      milestones: {
        ORIGINAL_BILL_DUE_DATE: 'A. मूळ बिल भरणा अंतिम दिनांक',
        LATE_CHARGE_ACCRUAL_DATE: 'B. दैनंदिन विलंब अधिभार आकारणी सक्रिय',
        FORMAL_NOTICE_ISSUE_DATE: 'C. कलम ५६ औपचारिक नोटीस जारी (DEMO)',
        FORMAL_NOTICE_PAYMENT_DEADLINE: 'D. औपचारिक नोटीस १५-दिवसीय देयक मुदत',
        AUTHORIZED_DISCONNECTION_REVIEW: 'E. अधिकृत जोडणी-पुनरावलोकन स्थिती',
      },
      notifTitles: {
        UPCOMING_DUE_5D: billNo => `५ दिवसांत बिल भरणा मुदत: ${billNo}`,
        UPCOMING_DUE_1D: billNo => `उद्या बिल भरण्याची अंतिम तारीख: ${billNo}`,
        DUE_TODAY: billNo => `आज वीज बिल भरण्याची अंतिम तारीख: ${billNo}`,
        OVERDUE_DAY_1: billNo => `वीज बिल थकीत (दिवस १): ${billNo}`,
        OVERDUE_SUBSEQUENT_REMINDER: (billNo, days) => `थकीत बिल स्मरणपत्र (${days} दिवस थकीत): ${billNo}`,
        FORMAL_NOTICE_ISSUED: noticeId => `औपचारिक देयक नोटीस जारी (DEMO): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: (noticeId, daysLeft) =>
          `नोटीस मुदत जवळ आली आहे (${daysLeft} दिवस शिल्लक): ${noticeId}`,
        FORMAL_NOTICE_DEADLINE_REACHED: noticeId =>
          `नोटीस मुदत पूर्ण झाली (पुनरावलोकन आवश्यक): ${noticeId}`,
        PAYMENT_RECEIVED: billNo => `आंशिक भरणा नोंदवला: ${billNo}`,
        BALANCE_FULLY_SETTLED: billNo => `वीज बिल थकबाकी पूर्णपणे चुकती: ${billNo}`,
        NOTICE_WITHDRAWN_OR_RESOLVED: noticeId => `औपचारिक नोटीस बंद / निराकरण: ${noticeId}`,
      },
      notifMessages: {
        UPCOMING_DUE_5D: p =>
          `जोडणी ${p.consumerNo} साठी बिल ${p.billNo} ची देय तारीख ${p.dueDate} (५ दिवस शिल्लक) आहे. देय रक्कम: ₹${p.totalOutstanding.toFixed(2)}.`,
        UPCOMING_DUE_1D: p =>
          `स्मरणपत्र: जोडणी ${p.consumerNo} साठी बिल ${p.billNo} उद्या (${p.dueDate}) देय आहे. देय रक्कम: ₹${p.totalOutstanding.toFixed(2)}.`,
        DUE_TODAY: p =>
          `जोडणी ${p.consumerNo} साठी बिल ${p.billNo} आज (${p.dueDate}) देय आहे. विलंब आकार टाळण्यासाठी ₹${p.totalOutstanding.toFixed(2)} भरा.`,
        OVERDUE_DAY_1: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}, देय: ${p.dueDate}) १ दिवस थकीत आहे. उर्वरित मुद्दल: ₹${p.remainingPrincipal.toFixed(2)}, विलंब आकार: ₹${p.lateCharges.toFixed(2)}, एकूण थकबाकी: ₹${p.totalOutstanding.toFixed(2)}.`,
        OVERDUE_SUBSEQUENT_REMINDER: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}, देय: ${p.dueDate}) ${p.daysOverdue} दिवस थकीत आहे. उर्वरित मुद्दल: ₹${p.remainingPrincipal.toFixed(2)}, विलंब आकार (DPS): ₹${p.lateCharges.toFixed(2)}, एकूण सद्य थकबाकी: ₹${p.totalOutstanding.toFixed(2)}.`,
        FORMAL_NOTICE_ISSUED: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}) साठी DEMO कलम ५६ नोटीस ${p.noticeId} दिनांक ${p.issueDate} रोजी जारी झाली आहे. १५-दिवसीय देयक मुदत: ${p.paymentDeadlineDate}. एकूण थकबाकी: ₹${p.totalOutstanding.toFixed(2)}.`,
        FORMAL_NOTICE_DEADLINE_APPROACHING: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}) च्या नोटीस ${p.noticeId} च्या मुदतीसाठी (${p.paymentDeadlineDate}) ${p.daysRemaining} दिवस शिल्लक आहेत. एकूण थकबाकी: ₹${p.totalOutstanding.toFixed(2)}.`,
        FORMAL_NOTICE_DEADLINE_REACHED: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}) साठी DEMO नोटीस ${p.noticeId} ची १५-दिवसीय मुदत (${p.paymentDeadlineDate}) पूर्ण झाली आहे. एकूण थकबाकी: ₹${p.totalOutstanding.toFixed(2)}. स्थिती: अधिकृत अधिकारी पुनरावलोकन आवश्यक.`,
        PAYMENT_RECEIVED: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}) मध्ये ₹${p.paidAmount.toFixed(2)} चा भरणा जमा झाला आहे. उर्वरित मुद्दल: ₹${p.remainingPrincipal.toFixed(2)}, विलंब आकार: ₹${p.lateCharges.toFixed(2)}, एकूण थकबाकी: ₹${p.totalOutstanding.toFixed(2)}.`,
        BALANCE_FULLY_SETTLED: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}) ची संपूर्ण रक्कम चुकती झाली आहे. दैनंदिन विलंब आकार थांबवण्यात आला आहे.`,
        NOTICE_WITHDRAWN_OR_RESOLVED: p =>
          `बिल ${p.billNo} (जोडणी ${p.consumerNo}) साठीची औपचारिक नोटीस ${p.noticeId} आता ${p.status} म्हणून बंद करण्यात आली आहे.`,
      },
    },
  };

  return dict[lang] || dict.en;
}
