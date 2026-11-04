/**
 * ============================================================================
 * VIDYUTFLOW 2.0 — PHASE 9 STEP 4D AUTOMATED VERIFICATION SUITE
 * Settlement Receipts, Executive Delinquency Aging, Billing/Calendar Separation,
 * and Live Financial Status Corrections (14 Comprehensive Verification Criteria)
 * ============================================================================
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
} from '../src/data/mockData';
import {
  calculateLatePaymentCharges,
  DEFAULT_LATE_CHARGE_POLICY,
  OverdueFinancialBreakdown,
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from '../src/utils/lateChargeEngine';
import {
  INITIAL_FORMAL_NOTICES,
  deriveCanonical9FieldBillStatement,
  Canonical9FieldBillStatement,
} from '../src/utils/formalNoticeEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary,
  sortCalendarObligationsByPriority,
  CALENDAR_LOCALIZATION,
  PaymentCalendarEvent,
  PaymentCalendarSummary,
} from '../src/utils/paymentCalendarEngine';
import {
  reconcileBillWithPayments,
  computeTransactionSettlementBreakdown,
  TransactionSettlementBreakdown,
  deriveCanonical15FieldBillBreakdown,
  formatCanonicalBillStatusAndCountdown,
  deriveBillPaymentAndNoticeTimeline,
  ensureConsumerBiMonthlyBillingSchedule,
  selectConnectionBillingSummary,
  buildUpcomingBiMonthlyScheduleForConnection,
  validatePaymentAmountSelection,
  applyPaymentToBill,
  isBillScheduledNotIssued,
} from '../src/utils/billingEngine';
import {
  generatePaymentReceiptDocument,
  generateElectricityBillDocument,
  generateOfficialDocumentPdfBytes,
  paginateOfficialDocumentForA4,
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  SETTLEMENT_RECEIPT_11_FIELD_LABELS,
} from '../src/utils/documentEngine';
import {
  computeExecutiveDelinquencyAging,
  ExecutiveDelinquencyAgingResult,
  DelinquencyAgingBucketKey,
} from '../src/utils/canonicalAnalytics';
import { DELINQUENCY_AGING_I18N } from '../src/components/management/ExecutiveDelinquencyAgingSection';
import { ElectricityBill, PaymentTransaction } from '../src/types';

const REFERENCE_DATE_NOV_4_2026 = '2026-11-04';

describe('VidyutFlow 2.0 — Phase 9 Step 4D: Settlement Receipts, Aging, Separation & Status Corrections', () => {

  // ==========================================================================
  // Criterion 1: Electricity Bills view is separated from Smart Payment Calendar
  // ==========================================================================
  test('Criterion 1: ConsumerPortal separates Electricity Bills into dedicated bill-history & current-billing view', () => {
    const consumerPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );

    // Dedicated Electricity Bills view with billStatusFilter
    assert.ok(
      consumerPortalSrc.includes("activeTab === 'bills' || activeTab === 'quick-pay'"),
      'Electricity Bills must render on activeTab === "bills"'
    );
    assert.ok(
      consumerPortalSrc.includes('billStatusFilter'),
      'Electricity Bills must provide status filter state'
    );
    assert.ok(
      consumerPortalSrc.includes("'ALL'") &&
      consumerPortalSrc.includes("'UNPAID'") &&
      consumerPortalSrc.includes("'OVERDUE'") &&
      consumerPortalSrc.includes("'PAID'") &&
      consumerPortalSrc.includes("'PARTIALLY_PAID'"),
      'Electricity Bills must support ALL, UNPAID, OVERDUE, PAID, and PARTIALLY_PAID filters'
    );

    // Shows 9-field canonical info and document download actions
    assert.ok(
      consumerPortalSrc.includes('data-testid="consumer-electricity-bills-view"'),
      'Dedicated Electricity Bills container with test id must exist'
    );
    assert.ok(
      consumerPortalSrc.includes('download-bill-pdf-btn-') && consumerPortalSrc.includes('view-bill-btn-'),
      'Electricity Bills must include Bill PDF view/download'
    );
    assert.ok(
      consumerPortalSrc.includes('view-receipt-btn-') && consumerPortalSrc.includes('download-receipt-pdf-btn-'),
      'Electricity Bills must include Receipt view/download for settled bills'
    );
    assert.ok(
      consumerPortalSrc.includes('handlePayClick') &&
      consumerPortalSrc.includes('!bill.isPaid && canonicalCurrentPayable > 0 && bill.isDue'),
      'Pay Online must only trigger for bills with positive outstanding balance'
    );
  });

  // ==========================================================================
  // Criterion 2: Smart Payment Calendar is a dedicated monthly calendar view
  // ==========================================================================
  test('Criterion 2: Smart Payment Calendar is a dedicated monthly calendar view with month navigation and export', () => {
    const calendarSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/SmartPaymentCalendar.tsx'),
      'utf-8'
    );
    const consumerPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );

    // Dedicated mounting in ConsumerPortal
    assert.ok(
      consumerPortalSrc.includes("activeTab === 'calendar'") &&
      consumerPortalSrc.includes('data-testid="consumer-payment-calendar-view"'),
      'Payment Calendar must be rendered under activeTab === "calendar" with dedicated testid'
    );

    // Grid, month navigation, Today button, export
    assert.ok(calendarSrc.includes('handlePrevMonth') && calendarSrc.includes('handleNextMonth'),
      'Calendar must provide previous/next month navigation'
    );
    assert.ok(calendarSrc.includes('handleToday'),
      'Calendar must provide Today button'
    );
    assert.ok(calendarSrc.includes('triggerIcsDownload') && calendarSrc.includes('buildGoogleCalendarUrl'),
      'Calendar must support .ics and Google Calendar export'
    );
    assert.ok(calendarSrc.includes('selectedDateEvents') && calendarSrc.includes('selectedDateIso'),
      'Calendar must provide selected date/event details without duplicating the bill list'
    );
  });

  // ==========================================================================
  // Criterion 3: Payment History remains strictly separate
  // ==========================================================================
  test('Criterion 3: Payment History remains strictly separate from Bills and Calendar views', () => {
    const consumerPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );

    assert.ok(
      consumerPortalSrc.includes("activeTab === 'payments' || activeTab === 'history'"),
      'Payment History must render on dedicated payments/history tab'
    );
    assert.ok(
      consumerPortalSrc.includes('data-testid="consumer-payment-history-view"'),
      'Payment History must have its own dedicated container'
    );
    assert.ok(
      consumerPortalSrc.includes('consumerPayments') &&
      consumerPortalSrc.includes('paymentMethod') &&
      consumerPortalSrc.includes('bankReference'),
      'Payment History must show actual transaction records, methods, and transaction references'
    );
  });

  // ==========================================================================
  // Criterion 4: Fully settled bills (BILL-UG-2026-10-8821) show Paid, ₹0.00 outstanding, no active overdue
  // ==========================================================================
  test('Criterion 4: Fully settled bills (BILL-UG-2026-10-8821) show Paid, ₹0.00 outstanding, stop DPS accrual, hide active overdue badges and Pay Now', () => {
    const rawBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    assert.ok(rawBill, 'BILL-UG-2026-10-8821 must exist in INITIAL_BILLS');
    assert.equal(rawBill.totalAmount, 2185.00, 'Original bill amount must be ₹2,185.00');

    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === rawBill.consumerNo);

    // Real settlement payment of ₹2,185.00 for BILL-UG-2026-10-8821
    const settledPayment: PaymentTransaction = {
      txId: 'TXN-2026-10-8821',
      billNo: rawBill.billNo,
      consumerNo: rawBill.consumerNo,
      amount: 2185.00,
      date: '24-Oct-2026 11:20',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'SBI/UPI/99218821',
    };
    const relatedPayments = [settledPayment];

    // 1. lateChargeEngine calculation
    const lc = calculateLatePaymentCharges({
      bill: rawBill,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
      payments: relatedPayments,
      tariffCategory: conn?.tariffCategory,
    });

    assert.equal(lc.status, 'Paid', 'Late charge status must be Paid');
    assert.equal(lc.currentPaymentStatus, 'Paid', 'currentPaymentStatus must be Paid');
    assert.equal(lc.isOverdue, false, 'isOverdue must be false for settled bill');
    assert.equal(lc.daysOverdue, 0, 'Active daysOverdue must be 0 for settled bill');
    assert.equal(lc.remainingPrincipal, 0, 'Remaining principal must be 0');
    assert.equal(lc.accruedLateCharges, 0, 'Accrued late charges must be 0');
    assert.equal(lc.totalOutstandingPayable, 0, 'Total outstanding payable must be 0');
    assert.equal(lc.historicalDaysLate, 13, 'Historical lateness is preserved as historicalDaysLate = 13');

    // 2. Canonical 9-field statement
    const stmt = deriveCanonical9FieldBillStatement({
      bill: rawBill,
      connection: conn,
      payments: relatedPayments,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    assert.equal(stmt.isFullySettled, true, 'Canonical statement isFullySettled must be true');
    assert.equal(stmt.isOverdue, false, 'Canonical statement isOverdue must be false');
    assert.equal(stmt.daysOverdue, 0, 'Canonical statement daysOverdue must be 0');
    assert.equal(stmt.remainingPrincipal, 0, 'Canonical statement remainingPrincipal must be 0');
    assert.equal(stmt.totalCurrentOutstanding, 0, 'Canonical statement totalCurrentOutstanding must be 0');
    assert.equal(stmt.effectiveStatus, 'Paid', 'Canonical statement effectiveStatus must be Paid');

    // 3. Reconciled bill
    const reconciled = reconcileBillWithPayments(rawBill, relatedPayments, REFERENCE_DATE_NOV_4_2026);
    assert.equal(reconciled.isPaid, true, 'Reconciled bill isPaid must be true');
    assert.equal(reconciled.outstandingBalance, 0, 'Reconciled outstandingBalance must be 0');
    assert.equal(reconciled.isOverdue, false, 'Reconciled isOverdue must be false for fully settled bill');

    // 4. Payment Calendar events
    const calEvents = derivePaymentCalendarEvents({
      bills: [rawBill],
      connections: conn ? [conn] : INITIAL_CONNECTIONS,
      payments: relatedPayments,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });
    assert.equal(calEvents.length, 1, 'Calendar event for settled bill must exist');
    const calEvt = calEvents[0];
    assert.equal(calEvt.isFullyPaid, true, 'Calendar event isFullyPaid must be true');
    assert.equal(calEvt.isOverdue, false, 'Calendar event isOverdue must be false');
    assert.equal(calEvt.daysOverdue, 0, 'Calendar event daysOverdue must be 0');
    assert.equal(calEvt.totalOutstandingWithCharges, 0, 'Calendar event total outstanding must be 0');

    // 5. Check UI source code for OverdueCard and Calendar Badges
    const consumerPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );
    assert.ok(
      consumerPortalSrc.includes('!currentBill.isPaid &&') &&
        consumerPortalSrc.includes('currentBill.outstandingBalance > 0.009'),
      'Overdue banner card must not render when bill is paid'
    );

    const smartCalendarSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/SmartPaymentCalendar.tsx'),
      'utf-8'
    );
    assert.ok(
      smartCalendarSrc.includes('!evt.isFullyPaid && evt.isOverdue && evt.daysOverdue > 0'),
      'Calendar overdue badge must not show for settled bills'
    );
    assert.ok(
      smartCalendarSrc.includes('evt.isFullyPaid &&') && smartCalendarSrc.includes('₹0.00 Outstanding'),
      'Calendar must show ₹0.00 Outstanding badge for settled bills'
    );
  });

  // ==========================================================================
  // Criterion 5: Unpaid bills before due date display Upcoming/Unpaid without overdue styling
  // ==========================================================================
  test('Criterion 5: Unpaid bills before due date display Upcoming/Unpaid without overdue styling', () => {
    // Bill with future due date relative to REFERENCE_DATE_NOV_4_2026
    const futureBill: ElectricityBill = {
      billNo: 'BILL-FUTURE-1',
      consumerNo: '04281-99231',
      billMonth: 'October 2026',
      billDate: '01-Nov-2026',
      dueDate: '20-Nov-2026',
      unitsConsumed: 250,
      energyCharges: 1000,
      fixedCharges: 150,
      fuelPriceAdjustment: 200,
      electricityDuty: 150,
      rebateOrSubsidy: 0,
      totalAmount: 1500,
      status: 'Unpaid',
      slabBreakdown: [],
    };

    const lc = calculateLatePaymentCharges({
      bill: futureBill,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
      payments: [],
    });

    assert.equal(lc.isOverdue, false, 'Future bill must not be overdue');
    assert.equal(lc.daysOverdue, 0, 'Future bill daysOverdue must be 0');
    assert.equal(lc.accruedLateCharges, 0, 'Future bill accruedLateCharges must be 0');
    assert.equal(lc.status, 'Unpaid', 'Future bill status is Unpaid');
    assert.equal(lc.remainingPrincipal, 1500, 'Remaining principal must equal original amount');
    assert.equal(lc.totalOutstandingPayable, 1500, 'Total payable equals principal without DPS');

    const stmt = deriveCanonical9FieldBillStatement({
      bill: futureBill,
      payments: [],
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });
    assert.equal(stmt.isOverdue, false, 'Canonical statement isOverdue must be false');
    assert.equal(stmt.daysOverdue, 0, 'Canonical statement daysOverdue must be 0');
  });

  // ==========================================================================
  // Criterion 6: Overdue bills past due date show accurate days overdue, DPS, and Pay Online
  // ==========================================================================
  test('Criterion 6: Overdue bills past due date show accurate days overdue, DPS, and Pay Online action', () => {
    // Bill with due date 2026-10-22, reference date 2026-11-04 (13 days overdue)
    const overdueBill: ElectricityBill = {
      billNo: 'BILL-OVERDUE-1',
      consumerNo: '04281-99231',
      billMonth: 'September 2026',
      billDate: '02-Oct-2026',
      dueDate: '22-Oct-2026',
      unitsConsumed: 600,
      energyCharges: 2500,
      fixedCharges: 250,
      fuelPriceAdjustment: 500,
      electricityDuty: 400,
      rebateOrSubsidy: 0,
      totalAmount: 3650.00,
      status: 'Unpaid',
      slabBreakdown: [],
    };

    const lc = calculateLatePaymentCharges({
      bill: overdueBill,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
      payments: [],
      policy: DEFAULT_LATE_CHARGE_POLICY, // 15% p.a., 365 days
    });

    assert.equal(lc.isOverdue, true, 'Unpaid past bill must be overdue');
    assert.equal(lc.daysOverdue, 13, 'Days overdue must be 13');
    assert.equal(lc.status, 'Overdue', 'Status must be Overdue');
    // Daily rate = 3650 * 0.15 / 365 = 1.50 per day; for 13 days = 19.50
    assert.equal(Math.round(lc.accruedLateCharges * 100) / 100, 19.50, 'Accrued DPS must be 19.50');
    assert.equal(Math.round(lc.totalOutstandingPayable * 100) / 100, 3669.50, 'Total payable must be 3669.50');

    const stmt = deriveCanonical9FieldBillStatement({
      bill: overdueBill,
      payments: [],
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });
    assert.equal(stmt.isOverdue, true, 'Canonical statement isOverdue must be true');
    assert.equal(stmt.daysOverdue, 13, 'Canonical statement daysOverdue must be 13');
    assert.equal(stmt.accruedLatePaymentCharges, 19.50, 'Canonical statement DPS must be 19.50');
  });

  // ==========================================================================
  // Criterion 7: Partially paid bills show Partially Paid with remaining principal and unpaid DPS
  // ==========================================================================
  test('Criterion 7: Partially paid bills show Partially Paid with remaining principal and unpaid DPS', () => {
    const partialBill: ElectricityBill = {
      billNo: 'BILL-PARTIAL-1',
      consumerNo: '04281-99231',
      billMonth: 'September 2026',
      billDate: '05-Oct-2026',
      dueDate: '25-Oct-2026',
      unitsConsumed: 800,
      energyCharges: 3500,
      fixedCharges: 350,
      fuelPriceAdjustment: 650,
      electricityDuty: 500,
      rebateOrSubsidy: 0,
      totalAmount: 5000.00,
      status: 'Unpaid',
      slabBreakdown: [],
    };

    // Partial payment of 2000 on 2026-10-28
    const partialPayment: PaymentTransaction = {
      txId: 'TXN-PARTIAL-1',
      billNo: 'BILL-PARTIAL-1',
      consumerNo: '04281-99231',
      amount: 2000.00,
      date: '28-Oct-2026 15:30',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'UPI-PARTIAL-12345',
    };

    const lc = calculateLatePaymentCharges({
      bill: partialBill,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
      payments: [partialPayment],
    });

    assert.ok(
      lc.status === 'Partially Paid' || lc.status === 'Overdue',
      'Status must reflect active partial/overdue state'
    );
    assert.equal(lc.settledPaymentsAmount, 2000.00, 'Payments settled must be 2000');
    assert.equal(lc.remainingPrincipal, 3000.00, 'Remaining principal must be 3000');
    assert.ok(lc.accruedLateCharges > 0, 'Accrued late charges on remaining principal must be positive');
    assert.ok(lc.totalOutstandingPayable > 3000.00, 'Total outstanding must include remaining principal + DPS');

    const stmt = deriveCanonical9FieldBillStatement({
      bill: partialBill,
      payments: [partialPayment],
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });
    assert.equal(stmt.effectiveStatus, 'Partially Paid');
    assert.equal(stmt.paymentsSuccessfullySettled, 2000.00);
    assert.equal(stmt.remainingPrincipal, 3000.00);
  });

  // ==========================================================================
  // Criterion 8: Next Upcoming Due Date identifies nearest future due date
  // ==========================================================================
  test('Criterion 8: Next Upcoming Due Date identifies nearest future due date (dueDateIso >= todayIso) or empty state', () => {
    const baseBill = INITIAL_BILLS[0];
    const testBills: ElectricityBill[] = [
      { ...baseBill, billNo: 'BILL-1', dueDate: '22-Oct-2026', totalAmount: 2000, status: 'Unpaid' },
      { ...baseBill, billNo: 'BILL-2', dueDate: '10-Nov-2026', totalAmount: 1500, status: 'Paid', paidAmount: 1500 },
      { ...baseBill, billNo: 'BILL-3', dueDate: '18-Nov-2026', totalAmount: 3200, status: 'Unpaid' },
      { ...baseBill, billNo: 'BILL-4', dueDate: '25-Nov-2026', totalAmount: 1800, status: 'Unpaid' },
    ];
    const testPayments: PaymentTransaction[] = [
      {
        txId: 'TXN-BILL-2',
        billNo: 'BILL-2',
        consumerNo: baseBill.consumerNo,
        amount: 1500,
        date: '02-Nov-2026 10:00',
        paymentMethod: 'UPI / BHIM',
        status: 'Successful',
        bankReference: 'UPI-BILL-2',
      },
    ];
    const testEvents = derivePaymentCalendarEvents({
      bills: testBills,
      connections: INITIAL_CONNECTIONS,
      payments: testPayments,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    const summary = computeCalendarSummary(testEvents, {
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    // Nearest future due date must be 18-Nov-2026 (NOT the past overdue 2026-10-22, and NOT settled 2026-11-10)
    assert.ok(
      summary.nextUpcomingDueDate === '18-Nov-2026' || summary.nextUpcomingDueDate === '2026-11-18',
      `Next upcoming due date must be 18-Nov-2026 or 2026-11-18 (got ${summary.nextUpcomingDueDate})`
    );

    // If no unsettled future bills exist, should return null / empty state
    const onlyPastEvents = testEvents.filter(e => e.dueDateIso < REFERENCE_DATE_NOV_4_2026 || e.isFullyPaid);
    const emptyFutureSummary = computeCalendarSummary(onlyPastEvents, {
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });
    assert.equal(
      emptyFutureSummary.nextUpcomingDueDate,
      null,
      'Next upcoming due date must be null when no future unsettled due date exists'
    );
  });

  // ==========================================================================
  // Criterion 9: Total Outstanding Payable in Calendar Summary excludes settled amounts
  // ==========================================================================
  test('Criterion 9: Total Outstanding Payable in Calendar Summary matches connection/account scope and excludes settled amounts', () => {
    const baseBill = INITIAL_BILLS[0];
    const events = derivePaymentCalendarEvents({
      bills: [
        { ...baseBill, billNo: 'BILL-SETTLED', dueDate: '22-Oct-2026', totalAmount: 2185, status: 'Paid', paidAmount: 2185 },
        { ...baseBill, billNo: 'BILL-ACTIVE', dueDate: '15-Nov-2026', totalAmount: 3525, status: 'Unpaid' },
      ],
      connections: INITIAL_CONNECTIONS,
      payments: [
        {
          txId: 'TXN-SETTLED',
          billNo: 'BILL-SETTLED',
          consumerNo: baseBill.consumerNo,
          amount: 2185,
          date: '20-Oct-2026 11:00',
          paymentMethod: 'UPI / BHIM',
          status: 'Successful',
          bankReference: 'UPI-SETTLED',
        },
      ],
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    const summary = computeCalendarSummary(events, {
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    // Total outstanding payable must be 3525 (NOT 3525 + 2185)
    assert.equal(
      summary.totalOutstandingPayable,
      3525,
      'Total outstanding payable must exclude settled bills'
    );
  });

  // ==========================================================================
  // Criterion 10: Formal Notice count excludes resolved/withdrawn/invalid notices
  // ==========================================================================
  test('Criterion 10: Formal Notice count in Calendar Summary counts only active notices', () => {
    const summary = computeCalendarSummary([], {
      referenceDate: REFERENCE_DATE_NOV_4_2026,
      formalNotices: [
        { ...INITIAL_FORMAL_NOTICES[0], status: 'ISSUED' },
        { ...INITIAL_FORMAL_NOTICES[0], noticeId: 'N-2', status: 'SERVED' },
        { ...INITIAL_FORMAL_NOTICES[0], noticeId: 'N-3', status: 'DEADLINE_APPROACHING' },
        { ...INITIAL_FORMAL_NOTICES[0], noticeId: 'N-4', status: 'DEADLINE_REACHED' },
        // Inactive notices:
        { ...INITIAL_FORMAL_NOTICES[0], noticeId: 'N-5', status: 'RESOLVED' },
        { ...INITIAL_FORMAL_NOTICES[0], noticeId: 'N-6', status: 'WITHDRAWN' },
        { ...INITIAL_FORMAL_NOTICES[0], noticeId: 'N-7', status: 'NOT_REQUIRED' },
      ],
    });

    assert.equal(
      summary.activeFormalNoticeCount,
      4,
      'activeFormalNoticeCount must count only the 4 active notices and exclude RESOLVED, WITHDRAWN, NOT_REQUIRED'
    );
  });

  // ==========================================================================
  // Criterion 11: End-to-end overdue-to-settlement receipts show all 11 fields without altering 2-page bill
  // ==========================================================================
  test('Criterion 11: Settlement receipts provide full 11-field financial trail while 2-page bill format remains intact', () => {
    const settledBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === settledBill.consumerNo)!;

    const payment: PaymentTransaction = {
      txId: 'TXN-2026-10-8821',
      billNo: settledBill.billNo,
      consumerNo: settledBill.consumerNo,
      amount: 2185.00,
      date: '24-Oct-2026 11:20',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'SBI/UPI/99218821',
    };

    // 1. computeTransactionSettlementBreakdown
    const breakdown: TransactionSettlementBreakdown = computeTransactionSettlementBreakdown(
      settledBill,
      payment,
      [payment],
      REFERENCE_DATE_NOV_4_2026
    );

    // Verify all 11 fields
    assert.equal(breakdown.originalPrincipalAmount, 2185.00, 'Field 1: Original principal');
    assert.equal(breakdown.previouslySettledPrincipal, 0, 'Field 2: Previously settled principal');
    assert.equal(breakdown.principalPaidInThisTransaction, 2185.00, 'Field 3: Principal paid in this tx');
    assert.equal(typeof breakdown.accruedLateChargesPriorToPayment, 'number', 'Field 4: Prior late charges');
    assert.equal(typeof breakdown.lateChargesPaidInThisTransaction, 'number', 'Field 5: Late charges paid');
    assert.equal(breakdown.lateChargesWaived, 0, 'Field 6: Waivers');
    assert.equal(breakdown.paymentReversalsAmount, 0, 'Field 7: Reversals');
    assert.equal(breakdown.remainingUnpaidPrincipal, 0, 'Field 8: Remaining unpaid principal');
    assert.equal(breakdown.remainingUnpaidLateCharges, 0, 'Field 9: Remaining unpaid late charges');
    assert.equal(breakdown.netTotalCurrentOutstanding, 0, 'Field 10: Net total current outstanding');
    assert.equal(breakdown.settlementClassification, 'FULL_PRINCIPAL_SETTLEMENT', 'Field 11: Settlement classification');
    assert.ok(breakdown.receiptNumber && breakdown.receiptNumber.startsWith('RCP-'), 'Field 11: Receipt number');
    assert.ok(breakdown.transactionReference, 'Field 11: Transaction reference');

    // 2. generatePaymentReceiptDocument
    const receiptDoc = generatePaymentReceiptDocument({
      payment,
      bill: settledBill,
      connection: conn,
      allPayments: [payment],
      referenceDate: REFERENCE_DATE_NOV_4_2026,
      language: 'en',
    });

    assert.ok(receiptDoc.settlement11Fields, 'Receipt document must include settlement11Fields object');
    assert.equal(receiptDoc.settlement11Fields.originalPrincipalAmount, 2185.00);
    assert.equal(receiptDoc.settlement11Fields.netTotalCurrentOutstanding, 0.00);

    const breakdownSection = receiptDoc.sections.find(s => s.id === 'settlement-breakdown');
    assert.ok(breakdownSection, 'Receipt document must have settlement-breakdown section');

    // 3. Two-page A4 electricity bill PDF generator remains functional and unmodified
    const billDoc = generateElectricityBillDocument({
      bill: settledBill,
      connection: conn,
      language: 'en',
    });
    const pagePlans = paginateOfficialDocumentForA4(billDoc);
    assert.equal(pagePlans.length, 2, 'Electricity bill document must retain exactly 2 pages');
    assert.equal(A4_WIDTH_PT, 595.28, 'Electricity bill must remain A4 width');
    assert.equal(A4_HEIGHT_PT, 841.89, 'Electricity bill must remain A4 height');
  });

  // ==========================================================================
  // Criterion 12: Executive Delinquency Aging computes 5 buckets excluding settled bills
  // ==========================================================================
  test('Criterion 12: Executive Delinquency Aging computes 5 buckets, summarizes principal, DPS, counts, excluding settled bills', () => {
    const result: ExecutiveDelinquencyAgingResult = computeExecutiveDelinquencyAging({
      bills: INITIAL_BILLS,
      connections: INITIAL_CONNECTIONS,
      payments: INITIAL_PAYMENTS,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    // Check all 5 buckets exist
    assert.ok(result.buckets.NOT_YET_DUE, 'NOT_YET_DUE bucket must exist');
    assert.ok(result.buckets['1_30_DAYS'], '1_30_DAYS bucket must exist');
    assert.ok(result.buckets['31_60_DAYS'], '31_60_DAYS bucket must exist');
    assert.ok(result.buckets['61_90_DAYS'], '61_90_DAYS bucket must exist');
    assert.ok(result.buckets.OVER_90_DAYS, 'OVER_90_DAYS bucket must exist');

    // Check settled bills are excluded from overdue buckets
    const overdueRecords = [
      ...result.buckets['1_30_DAYS'].records,
      ...result.buckets['31_60_DAYS'].records,
      ...result.buckets['61_90_DAYS'].records,
      ...result.buckets.OVER_90_DAYS.records,
    ];
    const foundSettled = overdueRecords.find(r => r.billNo === 'BILL-UG-2026-09-8821');
    assert.equal(
      foundSettled,
      undefined,
      'Settled bill BILL-UG-2026-09-8821 must NOT be in any overdue delinquency aging bucket'
    );

    // Settled bills excluded count
    assert.ok(result.settledBillsExcludedCount >= 1, 'Settled bills excluded count must be at least 1');

    // Summary totals consistency
    assert.equal(
      Math.round(result.totalOverdueAmountInr * 100) / 100,
      Math.round((result.totalOverduePrincipalInr + result.totalAccruedLateChargesInr) * 100) / 100,
      'Total overdue amount must equal overdue principal + accrued late charges'
    );

    // Percentage shares sum to ~100% among overdue buckets (if overdue exists)
    if (result.totalOverdueAmountInr > 0) {
      const overdueShareSum =
        result.buckets['1_30_DAYS'].shareOfTotalOverduePct +
        result.buckets['31_60_DAYS'].shareOfTotalOverduePct +
        result.buckets['61_90_DAYS'].shareOfTotalOverduePct +
        result.buckets.OVER_90_DAYS.shareOfTotalOverduePct;
      assert.ok(
        Math.abs(overdueShareSum - 100) < 0.5,
        `Overdue percentage shares must sum to ~100% (got ${overdueShareSum})`
      );
    }
  });

  // ==========================================================================
  // Criterion 13: Executive Delinquency Aging drill-down with interactive filters
  // ==========================================================================
  test('Criterion 13: Executive Delinquency Aging provides drill-down records with consumers, bills, subdivisions, tariff categories', () => {
    const result: ExecutiveDelinquencyAgingResult = computeExecutiveDelinquencyAging({
      bills: INITIAL_BILLS,
      connections: INITIAL_CONNECTIONS,
      payments: INITIAL_PAYMENTS,
      referenceDate: REFERENCE_DATE_NOV_4_2026,
    });

    assert.ok(result.allDrillDownRecords.length > 0, 'Drill-down records must exist');
    for (const record of result.allDrillDownRecords) {
      assert.ok(record.billNo, 'Drill-down record must have billNo');
      assert.ok(record.consumerNo, 'Drill-down record must have consumerNo');
      assert.ok(record.consumerName, 'Drill-down record must have consumerName');
      assert.ok(record.subdivision, 'Drill-down record must have subdivision');
      assert.ok(record.tariffCategory, 'Drill-down record must have tariffCategory');
      assert.ok(record.dueDate, 'Drill-down record must have dueDate');
      assert.ok(typeof record.principalOutstanding === 'number', 'Principal must be a number');
      assert.ok(typeof record.accruedLateCharges === 'number', 'DPS must be a number');
      assert.ok(typeof record.totalCurrentOutstanding === 'number', 'Total must be a number');
      assert.ok(record.bucketKey, 'Bucket key must be specified');
    }

    // Verify ExecutiveDelinquencyAgingSection component source code provides interactive filters
    const componentSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/management/ExecutiveDelinquencyAgingSection.tsx'),
      'utf-8'
    );
    assert.ok(
      componentSrc.includes('selectedBucketFilter'),
      'Component must provide selectedBucketFilter state for interactive drill-down'
    );
    assert.ok(
      componentSrc.includes('data-testid="delinquency-aging-filter-ALL"'),
      'Component must provide ALL filter button'
    );
    assert.ok(
      componentSrc.includes('data-testid="delinquency-aging-filter-1_30_DAYS"'),
      'Component must provide 1_30_DAYS filter button'
    );
  });

  // ==========================================================================
  // Criterion 14: Multilingual support in EN, GU, HI, MR
  // ==========================================================================
  test('Criterion 14: All Step 4D additions support English, Gujarati, Hindi, and Marathi', () => {
    const languages = ['en', 'gu', 'hi', 'mr'] as const;

    // 1. Receipt 11-field labels
    for (const lang of languages) {
      const labels = SETTLEMENT_RECEIPT_11_FIELD_LABELS[lang];
      assert.ok(labels, `Receipt 11-field labels must exist for ${lang}`);
      assert.ok(labels.originalPrincipal, `originalPrincipal must exist for ${lang}`);
      assert.ok(labels.previouslySettled, `previouslySettled must exist for ${lang}`);
      assert.ok(labels.principalPaidThisTx, `principalPaidThisTx must exist for ${lang}`);
      assert.ok(labels.accruedDpsPrior, `accruedDpsPrior must exist for ${lang}`);
      assert.ok(labels.dpsPaidThisTx, `dpsPaidThisTx must exist for ${lang}`);
      assert.ok(labels.dpsWaived, `dpsWaived must exist for ${lang}`);
      assert.ok(labels.reversals, `reversals must exist for ${lang}`);
      assert.ok(labels.remainingPrincipal, `remainingPrincipal must exist for ${lang}`);
      assert.ok(labels.remainingDps, `remainingDps must exist for ${lang}`);
      assert.ok(labels.netOutstanding, `netOutstanding must exist for ${lang}`);
      assert.ok(labels.settlementClass, `settlementClass must exist for ${lang}`);
    }

    // 2. Executive Delinquency Aging translations
    for (const lang of languages) {
      const i18n = DELINQUENCY_AGING_I18N[lang];
      assert.ok(i18n, `Delinquency Aging translations must exist for ${lang}`);
      assert.ok(i18n.sectionTitle, `sectionTitle must exist for ${lang}`);
      assert.ok(i18n.kpiTotalDelinquentRevenue, `kpiTotalDelinquentRevenue must exist for ${lang}`);
      assert.ok(i18n.agingDistributionTitle, `agingDistributionTitle must exist for ${lang}`);
      assert.ok(i18n.drillDownTitle, `drillDownTitle must exist for ${lang}`);
    }

    // 3. Document generation in all 4 languages with 11-field receipt table
    const settledBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === settledBill.consumerNo)!;
    const payment: PaymentTransaction = {
      txId: 'TXN-2026-10-8821',
      billNo: settledBill.billNo,
      consumerNo: settledBill.consumerNo,
      amount: 2185.00,
      date: '24-Oct-2026 11:20',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'SBI/UPI/99218821',
    };

    for (const lang of languages) {
      const receiptDoc = generatePaymentReceiptDocument({
        payment,
        bill: settledBill,
        connection: conn,
        allPayments: [payment],
        referenceDate: REFERENCE_DATE_NOV_4_2026,
        language: lang,
      });

      assert.equal(receiptDoc.language, lang, `Receipt doc language must be ${lang}`);
      const section = receiptDoc.sections.find(s => s.id === 'settlement-breakdown');
      assert.ok(section, `Settlement breakdown section must exist for ${lang}`);
      assert.ok(section.fields.length >= 1, `Section fields must exist for ${lang}`);
    }
  });

  // ==========================================================================
  // Criteria 15–17 (Part A): Bi-Monthly Billing Enforcement & No Manual Consumer Button
  // ==========================================================================
  test('Criteria 15–17: Manual "Generate Bi-Monthly (2-Month) DEMO Bill" button is removed from Consumer Electricity Bills view and automatic bi-monthly schedule prevents duplicates while preserving history', () => {
    const consumerPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );

    assert.equal(
      consumerPortalSrc.includes('data-testid="generate-bimonthly-demo-bill-btn"'),
      false,
      'Manual Generate Bi-Monthly DEMO Bill button must be removed from consumer-facing Electricity Bills screen'
    );
    assert.ok(
      consumerPortalSrc.includes('data-testid="bimonthly-automatic-schedule-badge"'),
      'Electricity Bills screen must display automatic bi-monthly schedule indicator'
    );

    // Ensure automatic bi-monthly schedule helper configures connections and is idempotent
    const firstRun = ensureConsumerBiMonthlyBillingSchedule({
      connections: INITIAL_CONNECTIONS,
      existingBills: INITIAL_BILLS,
      targetConsumerNo: '04281-99231',
      generateScheduledCycleIfMissing: { startYear: 2026, startMonth1To12: 11 }, // Nov–Dec 2026
    });
    assert.ok(firstRun.newlyScheduledBill, 'Should deterministically generate upcoming Nov–Dec 2026 bi-monthly bill when scheduled');
    assert.equal(firstRun.newlyScheduledBill?.billingCycleType, 'BI_MONTHLY');
    assert.equal(firstRun.newlyScheduledBill?.billMonth, 'November–December 2026');
    assert.equal(firstRun.newlyScheduledBill?.periodStartDate, '01-Nov-2026');
    assert.equal(firstRun.newlyScheduledBill?.periodEndDate, '31-Dec-2026');

    // Second run with the same period must prevent duplicate bills
    const secondRun = ensureConsumerBiMonthlyBillingSchedule({
      connections: INITIAL_CONNECTIONS,
      existingBills: firstRun.bills,
      targetConsumerNo: '04281-99231',
      generateScheduledCycleIfMissing: { startYear: 2026, startMonth1To12: 11 },
    });
    assert.equal(secondRun.newlyScheduledBill, null, 'Duplicate bi-monthly bill for the same connection and period must be prevented');
    assert.equal(secondRun.bills.length, firstRun.bills.length, 'Bill count must not increase on repeated run');

    // Historical bills remain intact
    assert.ok(secondRun.bills.some(b => b.billNo === 'BILL-UG-2026-10-8821'));
    assert.ok(secondRun.bills.some(b => b.billNo === 'BILL-UG-2026-09-8821'));
    assert.ok(secondRun.bills.some(b => b.billNo === 'BILL-UG-2026-08-8821'));
  });

  // ==========================================================================
  // Criteria 18–23 (Part D & E): Canonical 15-Field Real-Time Calculation & Midnight Rollover
  // ==========================================================================
  test('Criteria 18–23: Canonical 15-field real-time calculation for BILL-UG-2026-10-8821 on 04-Nov-2026 (13d overdue, ₹11.67 DPS, ₹2,196.67) and 05-Nov-2026 rollover (14d overdue, ₹12.57 DPS, ₹2,197.57)', () => {
    const billOct = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === billOct.consumerNo)!;

    // On 04-Nov-2026 (13 days after 22-Oct-2026)
    const breakdownNov04 = deriveCanonical15FieldBillBreakdown({
      bill: billOct,
      payments: INITIAL_PAYMENTS,
      referenceDate: '04-Nov-2026',
      calculationTimestampIst: '04-Nov-2026 10:30 IST',
      tariffCategory: conn.tariffCategory,
    });

    assert.equal(breakdownNov04.field1_originalBillPrincipalInr, 2185.00);
    assert.equal(breakdownNov04.field6_originalTotalBillAmountInr, 2185.00);
    assert.equal(breakdownNov04.field7_paymentsSuccessfullySettledInr, 0.00);
    assert.equal(breakdownNov04.field8_remainingPrincipalInr, 2185.00);
    assert.equal(breakdownNov04.field9_accruedLatePaymentChargesDpsInr, 11.67);
    assert.equal(breakdownNov04.field11_currentTotalOutstandingInr, 2196.67);
    assert.equal(breakdownNov04.field13_originalDueDate, '22-Oct-2026');
    assert.equal(breakdownNov04.daysOverdue, 13);
    assert.equal(breakdownNov04.field14_daysUntilDueOrDaysOverdue, -13);
    assert.equal(breakdownNov04.field15_calculationReferenceTimestampIst, '04-Nov-2026 10:30 IST');

    // On 05-Nov-2026 (midnight rollover -> 14 days overdue: 2185 * 0.15 * 14 / 365 = 12.5712 -> 12.57)
    const breakdownNov05 = deriveCanonical15FieldBillBreakdown({
      bill: billOct,
      payments: INITIAL_PAYMENTS,
      referenceDate: '05-Nov-2026',
      calculationTimestampIst: '05-Nov-2026 00:01 IST',
      tariffCategory: conn.tariffCategory,
    });
    assert.equal(breakdownNov05.daysOverdue, 14);
    assert.equal(breakdownNov05.field9_accruedLatePaymentChargesDpsInr, 12.57);
    assert.equal(breakdownNov05.field11_currentTotalOutstandingInr, 2197.57);
  });

  // ==========================================================================
  // Criteria 24–27 (Part B): Bill Card Status & Countdown Badges (Due today, Future, Overdue, Partial, Settled)
  // ==========================================================================
  test('Criteria 24–27: Bill card status and countdown badges format Unpaid future, Due today, Overdue, Partially Paid, and Paid states accurately', () => {
    const billOct = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;

    // 1. Overdue on 04-Nov-2026 (13 days overdue)
    const recOverdue = reconcileBillWithPayments(billOct, [], '04-Nov-2026');
    const badgeOverdue = formatCanonicalBillStatusAndCountdown(recOverdue, '04-Nov-2026', 'en');
    assert.equal(badgeOverdue.statusCode, 'OVERDUE');
    assert.equal(badgeOverdue.combinedStatusLabel, 'OVERDUE — 13 days overdue');
    assert.equal(badgeOverdue.currentPayableInr, 2196.67);
    assert.equal(badgeOverdue.canPayNow, true);

    // 2. Due Today on 22-Oct-2026
    const recDueToday = reconcileBillWithPayments(billOct, [], '22-Oct-2026');
    const badgeDueToday = formatCanonicalBillStatusAndCountdown(recDueToday, '22-Oct-2026', 'en');
    assert.equal(badgeDueToday.statusCode, 'DUE_TODAY');
    assert.equal(badgeDueToday.combinedStatusLabel, 'DUE TODAY — Payment due today');
    assert.equal(badgeDueToday.activeDaysOverdue, 0);
    assert.equal(badgeDueToday.currentPayableInr, 2185.00);

    // 3. Future Due Date on 15-Oct-2026 (Due in 7 days)
    const recFuture = reconcileBillWithPayments(billOct, [], '15-Oct-2026');
    const badgeFuture = formatCanonicalBillStatusAndCountdown(recFuture, '15-Oct-2026', 'en');
    assert.equal(badgeFuture.statusCode, 'UNPAID');
    assert.equal(badgeFuture.combinedStatusLabel, 'UNPAID — Due in 7 days');
    assert.equal(badgeFuture.activeDaysOverdue, 0);

    // 4. Settled late on 27-Oct-2026 (5 days after due date) viewed on 04-Nov-2026
    const latePayment: PaymentTransaction = {
      txId: 'TXN-LATE-SETTLE',
      billNo: billOct.billNo,
      consumerNo: billOct.consumerNo,
      amount: 2185.00,
      date: '27-Oct-2026',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'UPI-LATE-SETTLE-8821',
    };
    const recPaidLate = reconcileBillWithPayments(billOct, [latePayment], '04-Nov-2026');
    const badgePaidLate = formatCanonicalBillStatusAndCountdown(recPaidLate, '04-Nov-2026', 'en');
    assert.equal(badgePaidLate.statusCode, 'PAID');
    assert.equal(badgePaidLate.combinedStatusLabel, 'PAID — Settled on 27-Oct-2026');
    assert.equal(badgePaidLate.historicalLateSettlementNote, 'Paid 5 days late');
    assert.equal(badgePaidLate.activeDaysOverdue, 0);
    assert.equal(badgePaidLate.currentPayableInr, 0);
    assert.equal(badgePaidLate.canPayNow, false);
  });

  // ==========================================================================
  // Criteria 28–30 (Part F): View Bill & Download Bill PDF Real-Time Outstanding Reconciliation
  // ==========================================================================
  test('Criteria 28–30: View Bill and Download Bill PDF match real-time Current Total Outstanding (₹2,196.67 on 04-Nov-2026) and preserve 2-page A4 geometry', () => {
    const billOct = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === billOct.consumerNo)!;

    // 1. Overdue bill on 04-Nov-2026
    const overdueBillDoc = generateElectricityBillDocument({
      bill: billOct,
      connection: conn,
      payments: INITIAL_PAYMENTS,
      referenceDate: '04-Nov-2026',
      calculationTimestampIst: '04-Nov-2026 10:30 IST',
      language: 'en',
    });

    assert.ok(overdueBillDoc.billParticulars, 'billParticulars must be populated');
    assert.equal(overdueBillDoc.billParticulars!.totalBillAmount, 2185.00, 'Original bill amount must remain ₹2,185.00');
    assert.equal(overdueBillDoc.billParticulars!.remainingPrincipal, 2185.00, 'Remaining principal must be ₹2,185.00');
    assert.equal(overdueBillDoc.billParticulars!.accruedLateCharges, 11.67, 'Accrued DPS must be ₹11.67');
    assert.equal(overdueBillDoc.billParticulars!.currentTotalOutstanding, 2196.67, 'Current Total Outstanding must be ₹2,196.67');
    assert.equal(overdueBillDoc.billParticulars!.outstandingBalance, 2196.67, 'Payment slip payable must be ₹2,196.67');
    assert.ok(
      overdueBillDoc.billParticulars!.calculationAsOfLabel.includes('04-Nov-2026 10:30 IST'),
      'Calculation timestamp label must include Asia/Kolkata IST timestamp'
    );

    // Verify 2-page A4 PDF layout and generated PDF bytes contain 2196.67 and 11.67
    const pages = paginateOfficialDocumentForA4(overdueBillDoc);
    assert.equal(pages.length, 2, 'Overdue electricity bill PDF must remain strictly 2 A4 pages');
    const pdfBytes = generateOfficialDocumentPdfBytes(overdueBillDoc);
    const pdfAscii = Buffer.from(pdfBytes).toString('latin1');
    assert.ok(pdfAscii.includes('2185.00'), 'PDF must contain Original Bill Amount 2185.00');
    assert.ok(pdfAscii.includes('11.67'), 'PDF must contain Accrued Late Charges 11.67');
    assert.ok(pdfAscii.includes('2196.67'), 'PDF must contain Current Total Outstanding / Payable 2196.67');
    assert.ok(pdfAscii.includes('04-Nov-2026 10:30 IST'), 'PDF must contain Calculation As-Of IST timestamp');

    // 2. After full settlement, View Bill & Download PDF show ₹0.00 remaining
    const fullPayment: PaymentTransaction = {
      txId: 'TXN-FULL-8821',
      billNo: billOct.billNo,
      consumerNo: billOct.consumerNo,
      amount: 2185.00,
      date: '04-Nov-2026',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'UPI-FULL-8821',
    };
    const paidBillDoc = generateElectricityBillDocument({
      bill: billOct,
      connection: conn,
      payments: [fullPayment],
      referenceDate: '04-Nov-2026',
      calculationTimestampIst: '04-Nov-2026 11:00 IST',
      language: 'en',
    });
    assert.equal(paidBillDoc.billParticulars!.totalBillAmount, 2185.00);
    assert.equal(paidBillDoc.billParticulars!.paidAmount, 2185.00);
    assert.equal(paidBillDoc.billParticulars!.currentTotalOutstanding, 0);
    assert.equal(paidBillDoc.billParticulars!.outstandingBalance, 0);
    assert.equal(paginateOfficialDocumentForA4(paidBillDoc).length, 2);
  });

  // ==========================================================================
  // Criteria 31–32 (Part C): Smart Payment Calendar Priority Ordering & Settled Bills This Month
  // ==========================================================================
  test('Criteria 31–32: Smart Payment Calendar prioritizes Overdue -> Due Today -> Upcoming Unpaid and computes Settled Bills This Month by actual settlement date', () => {
    const baseBill = INITIAL_BILLS[0];
    const events = derivePaymentCalendarEvents({
      bills: [
        { ...baseBill, billNo: 'BILL-UPCOMING', dueDate: '18-Nov-2026', totalAmount: 1900, status: 'Unpaid' },
        { ...baseBill, billNo: 'BILL-DUE-TODAY', dueDate: '04-Nov-2026', totalAmount: 1400, status: 'Unpaid' },
        { ...baseBill, billNo: 'BILL-OVERDUE-OLDER', dueDate: '15-Oct-2026', totalAmount: 2500, status: 'Unpaid' },
        { ...baseBill, billNo: 'BILL-OVERDUE-NEWER', dueDate: '22-Oct-2026', totalAmount: 2185, status: 'Unpaid' },
        { ...baseBill, billNo: 'BILL-PAID-OCT', dueDate: '20-Sep-2026', totalAmount: 1850, status: 'Paid', paidDate: '16-Sep-2026' },
        { ...baseBill, billNo: 'BILL-PAID-NOV', dueDate: '25-Oct-2026', totalAmount: 1600, status: 'Paid', paidDate: '02-Nov-2026' },
      ],
      connections: INITIAL_CONNECTIONS,
      payments: [
        { txId: 'TX-SEP', billNo: 'BILL-PAID-OCT', consumerNo: baseBill.consumerNo, amount: 1850, date: '16-Sep-2026', paymentMethod: 'UPI / BHIM', status: 'Successful', bankReference: 'UPI-SEP' },
        { txId: 'TX-NOV', billNo: 'BILL-PAID-NOV', consumerNo: baseBill.consumerNo, amount: 1600, date: '02-Nov-2026', paymentMethod: 'UPI / BHIM', status: 'Successful', bankReference: 'UPI-NOV' },
      ],
      referenceDate: '04-Nov-2026',
    });

    const prioritized = sortCalendarObligationsByPriority(events, '2026-11-04');
    assert.equal(prioritized.length, 4, 'Only the 4 unsettled obligations appear in the prioritized list');
    assert.equal(prioritized[0].billNo, 'BILL-OVERDUE-OLDER', 'Priority 1: Earliest overdue bill first');
    assert.equal(prioritized[1].billNo, 'BILL-OVERDUE-NEWER', 'Priority 2: Next overdue bill second');
    assert.equal(prioritized[2].billNo, 'BILL-DUE-TODAY', 'Priority 3: Bill due today third');
    assert.equal(prioritized[3].billNo, 'BILL-UPCOMING', 'Priority 4: Upcoming unpaid bill fourth');

    // Settled Bills This Month on 04-Nov-2026 must count only BILL-PAID-NOV (settled 02-Nov-2026), not BILL-PAID-OCT (settled 16-Sep-2026)
    const summaryNov = computeCalendarSummary(events, {
      referenceDate: '04-Nov-2026',
      todayIso: '2026-11-04',
    });
    assert.equal(summaryNov.paidBillsCount, 2, 'Total paid bills count is 2');
    assert.equal(summaryNov.settledBillsThisMonthCount, 1, 'Only 1 bill was actually settled in November 2026');

    // Localized empty state label exists across all 4 languages
    for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
      assert.ok(CALENDAR_LOCALIZATION[lang].noUpcomingDueDateLabel, `noUpcomingDueDateLabel must exist for ${lang}`);
      assert.ok(CALENDAR_LOCALIZATION[lang].prioritizedObligationsTitle, `prioritizedObligationsTitle must exist for ${lang}`);
    }
  });

  // ==========================================================================
  // Criteria 33–34 (Part G): 10-Item Payment, Notice & Disconnection-Review Timeline
  // ==========================================================================
  test('Criteria 33–34: 10-item Payment, Notice & Disconnection-Review timeline never fabricates disconnection countdowns and reflects active/expired notices accurately', () => {
    const billOct = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const recOverdue = reconcileBillWithPayments(billOct, [], '04-Nov-2026');

    // 1. Without a served notice: must NOT fabricate a disconnection countdown
    const timelineNoNotice = deriveBillPaymentAndNoticeTimeline({
      bill: recOverdue,
      referenceDate: '04-Nov-2026',
      formalNotice: null,
    });
    assert.equal(timelineNoNotice.item6_formalNoticeStatus, 'ELIGIBLE_FOR_NOTICE');
    assert.equal(timelineNoNotice.noticeDeadlineSummaryBanner, undefined);
    assert.ok(timelineNoNotice.item8_noticePaymentCureDeadlineLabel.includes('Not applicable'));

    // 2. With an active served notice (deadline 12-Nov-2026, 8 days remaining on 04-Nov-2026)
    const activeNotice = INITIAL_FORMAL_NOTICES.find(n => n.billNo === 'BILL-UG-2026-10-8821')!;
    const timelineActiveNotice = deriveBillPaymentAndNoticeTimeline({
      bill: recOverdue,
      referenceDate: '04-Nov-2026',
      formalNotice: {
        ...activeNotice,
        status: 'SERVED',
        paymentDeadlineDate: '12-Nov-2026',
        daysRemainingUntilDeadline: 8,
      },
    });
    assert.equal(timelineActiveNotice.item6_formalNoticeStatus, 'SERVED');
    assert.equal(
      timelineActiveNotice.noticeDeadlineSummaryBanner,
      'Formal notice payment deadline: 8 days remaining'
    );

    // 3. When notice deadline has passed (e.g. on 15-Nov-2026): shows authorized review pending, never automatic disconnection
    const timelineExpiredNotice = deriveBillPaymentAndNoticeTimeline({
      bill: recOverdue,
      referenceDate: '15-Nov-2026',
      formalNotice: {
        ...activeNotice,
        status: 'DEADLINE_REACHED',
        paymentDeadlineDate: '12-Nov-2026',
        daysRemainingUntilDeadline: -3,
      },
    });
    assert.equal(timelineExpiredNotice.item6_formalNoticeStatus, 'DEADLINE_REACHED');
    assert.equal(
      timelineExpiredNotice.noticeDeadlineSummaryBanner,
      'Notice deadline passed — authorized review pending'
    );
    assert.ok(
      timelineExpiredNotice.item10_authorizedDisconnectionReviewStatusLabel.includes('Never auto-disconnected')
    );
  });

  // ==========================================================================
  // Section 17 Final Master Correction: SCHEDULED_NOT_ISSUED, Chronological Readings, Previous Three Bills & PDF Table Geometry
  // ==========================================================================
  test('Section 17 Final Master Correction: Future bi-monthly cycles are SCHEDULED_NOT_ISSUED (non-payable, excluded from debt/calendar/aging), chronological readings (13655->14050->14460->14820), no 2027 bills in historical PDFs, and zero text overlap in Page 2 Box 1', () => {
    const connRes = INITIAL_CONNECTIONS.find(c => c.consumerNo === '04281-99231')!;

    // 1. Future bi-monthly schedule for 04281-99231 on 04-Nov-2026: Oct–Nov 2026, Dec 2026–Jan 2027, Feb–Mar 2027
    const upcomingSchedule = buildUpcomingBiMonthlyScheduleForConnection(
      connRes,
      INITIAL_BILLS,
      '04-Nov-2026',
      3
    );
    assert.equal(upcomingSchedule.length, 3, 'Should produce 3 consecutive 2-month upcoming cycles');
    assert.equal(upcomingSchedule[0].billMonth, 'October–November 2026');
    assert.equal(upcomingSchedule[0].billDate, '05-Dec-2026');
    assert.equal(upcomingSchedule[0].dueDate, '20-Dec-2026');
    assert.equal(upcomingSchedule[1].billMonth, 'December 2026–January 2027');
    assert.equal(upcomingSchedule[1].billDate, '05-Feb-2027');
    assert.equal(upcomingSchedule[1].dueDate, '20-Feb-2027');
    assert.equal(upcomingSchedule[2].billMonth, 'February–March 2027');
    assert.equal(upcomingSchedule[2].billDate, '05-Apr-2027');
    assert.equal(upcomingSchedule[2].dueDate, '20-Apr-2027');

    // Every upcoming cycle is SCHEDULED_NOT_ISSUED with ₹0 payable and never ₹5,858
    for (const sched of upcomingSchedule) {
      assert.equal(sched.lifecycleStatus, 'SCHEDULED_NOT_ISSUED');
      assert.equal(sched.isScheduledNotIssued, true);
      assert.equal(sched.isIssued, false);
      assert.equal(sched.effectiveStatus, 'Scheduled');
      assert.equal(sched.totalAmount, 0, 'Scheduled future bill must never have fabricated ₹5,858 amount');
      assert.equal(sched.outstandingBalance, 0);
      assert.equal(sched.totalOutstandingWithCharges, 0);
      assert.equal(sched.isDue, false);
      assert.equal(sched.isOverdue, false);
      assert.equal(isBillScheduledNotIssued(sched, '04-Nov-2026'), true);

      const badge = formatCanonicalBillStatusAndCountdown(sched, '04-Nov-2026', 'en');
      assert.equal(badge.statusCode, 'SCHEDULED_NOT_ISSUED');
      assert.equal(badge.combinedStatusLabel, 'Scheduled — Not Yet Issued');
      assert.equal(badge.canPayNow, false);
      assert.equal(badge.currentPayableInr, 0);

      // Cannot be paid or settled
      const payVal = validatePaymentAmountSelection({
        bill: sched,
        existingPayments: [],
        mode: 'FULL',
        referenceDate: '04-Nov-2026',
      });
      assert.equal(payVal.valid, false, 'SCHEDULED_NOT_ISSUED bill must reject payment validation');
      const applyRes = applyPaymentToBill({
        bill: sched,
        existingPayments: [],
        paymentMethod: 'UPI / BHIM',
        paymentDate: '04-Nov-2026',
        referenceDate: '04-Nov-2026',
      });
      assert.equal(applyRes.success, false, 'SCHEDULED_NOT_ISSUED bill must reject applyPaymentToBill');

      // Cannot generate a finalized payable PDF
      const schedDoc = generateElectricityBillDocument({
        bill: sched,
        connection: connRes,
        payments: INITIAL_PAYMENTS,
        referenceDate: '04-Nov-2026',
      });
      assert.equal(schedDoc.eligible, false, 'SCHEDULED_NOT_ISSUED bill must not generate a payable PDF');
      assert.equal(schedDoc.statusLabel, 'Scheduled — Not Yet Issued');
    }

    // 2. Connection billing summary keeps issued totals accurate (All Bills = 3, Unpaid & Due = 1, Overdue = 1, Paid = 2, Scheduled = 3)
    const billsWithScheduled = [...INITIAL_BILLS, ...upcomingSchedule];
    const connSummary = selectConnectionBillingSummary(connRes, billsWithScheduled, INITIAL_PAYMENTS, {
      referenceDate: '04-Nov-2026',
    });
    assert.equal(connSummary.totalBillCount, 3, 'Issued bill count for 04281-99231 must be 3');
    assert.equal(connSummary.dueBillCount, 1, 'Unpaid & Due count must be 1 (September 2026)');
    assert.equal(connSummary.paidBillCount, 2, 'Paid count must be 2 (August 2026, July 2026)');
    assert.equal(connSummary.scheduledBillCount, 3, 'Scheduled upcoming cycles count must be 3');
    assert.equal(connSummary.totalOutstandingPrincipalInr, 2185.00);
    assert.equal(connSummary.totalAccruedLateChargesInr, 11.67);
    assert.equal(connSummary.totalOutstandingWithChargesInr, 2196.67);

    // 3. SCHEDULED_NOT_ISSUED excluded from Smart Payment Calendar and Executive Delinquency Aging
    const calEvents = derivePaymentCalendarEvents({
      bills: billsWithScheduled.filter(b => b.consumerNo === '04281-99231'),
      connections: INITIAL_CONNECTIONS,
      payments: INITIAL_PAYMENTS,
      referenceDate: '04-Nov-2026',
    });
    assert.equal(
      calEvents.some(e => e.billNo.startsWith('BILL-UG-BM-')),
      false,
      'Smart Payment Calendar must exclude SCHEDULED_NOT_ISSUED cycles from payable events'
    );
    const agingBase = computeExecutiveDelinquencyAging({
      bills: INITIAL_BILLS,
      connections: INITIAL_CONNECTIONS,
      payments: INITIAL_PAYMENTS,
      referenceDate: '04-Nov-2026',
    });
    const agingWithScheduled = computeExecutiveDelinquencyAging({
      bills: billsWithScheduled,
      connections: INITIAL_CONNECTIONS,
      payments: INITIAL_PAYMENTS,
      referenceDate: '04-Nov-2026',
    });
    assert.equal(
      agingWithScheduled.totalOverdueAmountInr,
      agingBase.totalOverdueAmountInr,
      'Executive Delinquency Aging must exclude SCHEDULED_NOT_ISSUED cycles'
    );
    assert.equal(
      agingWithScheduled.buckets.NOT_YET_DUE.billsCount,
      agingBase.buckets.NOT_YET_DUE.billsCount,
      'NOT_YET_DUE bucket must not include SCHEDULED_NOT_ISSUED cycles'
    );

    // 4. Both manual DEMO bill generation buttons removed from ConsumerPortal
    const consumerPortalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );
    assert.equal(
      consumerPortalSrc.includes('Generate Current Cycle DEMO Bill'),
      false,
      'Manual "Generate Current Cycle DEMO Bill" button must be removed from Consumer Dashboard'
    );
    assert.equal(
      consumerPortalSrc.includes('Generate Bi-Monthly (2-Month) DEMO Bill'),
      false,
      'Manual "Generate Bi-Monthly (2-Month) DEMO Bill" button must be removed from Consumer Electricity Bills'
    );

    // 5. Historical monthly bills have coherent chronological meter readings (13655 -> 14050 -> 14460 -> 14820)
    // and never include future 2027 bills in their Previous Three Billing Periods table
    const billSep = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const billAug = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-09-8821')!;
    const billJul = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-08-8821')!;

    assert.equal(billJul.previousReadingKwh, 13655);
    assert.equal(billJul.currentReadingKwh, 14050);
    assert.equal(billJul.unitsConsumed, 395);

    assert.equal(billAug.previousReadingKwh, 14050);
    assert.equal(billAug.currentReadingKwh, 14460);
    assert.equal(billAug.unitsConsumed, 410);

    assert.equal(billSep.previousReadingKwh, 14460);
    assert.equal(billSep.currentReadingKwh, 14820);
    assert.equal(billSep.unitsConsumed, 360);

    const docSep = generateElectricityBillDocument({
      bill: billSep,
      connection: connRes,
      payments: INITIAL_PAYMENTS,
      allBills: billsWithScheduled,
      referenceDate: '04-Nov-2026',
    });
    const docAug = generateElectricityBillDocument({
      bill: billAug,
      connection: connRes,
      payments: INITIAL_PAYMENTS,
      allBills: billsWithScheduled,
      referenceDate: '04-Nov-2026',
    });
    const docJul = generateElectricityBillDocument({
      bill: billJul,
      connection: connRes,
      payments: INITIAL_PAYMENTS,
      allBills: billsWithScheduled,
      referenceDate: '04-Nov-2026',
    });

    assert.equal(docSep.billParticulars!.readingIntegrityWarning, undefined, 'September 2026 readings must match billed units with zero warning');
    assert.equal(docAug.billParticulars!.readingIntegrityWarning, undefined, 'August 2026 readings must match billed units with zero warning');
    assert.equal(docJul.billParticulars!.readingIntegrityWarning, undefined, 'July 2026 readings must match billed units with zero warning');

    assert.deepEqual(
      docSep.billParticulars!.previousPeriods.map(p => p.month),
      ['August 2026', 'July 2026'],
      'September 2026 PDF Previous Periods must only contain August 2026 and July 2026 (never 2027)'
    );
    assert.deepEqual(
      docAug.billParticulars!.previousPeriods.map(p => p.month),
      ['July 2026'],
      'August 2026 PDF Previous Periods must only contain July 2026'
    );
    assert.deepEqual(
      docJul.billParticulars!.previousPeriods.map(p => p.month),
      [],
      'July 2026 PDF Previous Periods must be empty (no earlier bills in INITIAL_BILLS)'
    );

    // 6. Verify Page 2 Box 1 GERC Approved Tariff Schedule has zero collided text ("101-250 (Bi-Mo:201-500)INR 4.15/u")
    const sepPdfBytes = generateOfficialDocumentPdfBytes(docSep);
    const sepPdfText = Buffer.from(sepPdfBytes).toString('latin1');
    assert.equal(
      sepPdfText.includes('101-250 (Bi-Mo:201-500)INR 4.15/u'),
      false,
      'Page 2 Box 1 must never have collided "101-250 (Bi-Mo:201-500)INR 4.15/u" string'
    );
    assert.equal(
      sepPdfText.includes('February-March 2027') || sepPdfText.includes('February–March 2027'),
      false,
      'Historical September 2026 PDF must never include February–March 2027'
    );
    assert.equal(paginateOfficialDocumentForA4(docSep).length, 2, 'Electricity bill PDF must be strictly 2 A4 pages');
  });

});


