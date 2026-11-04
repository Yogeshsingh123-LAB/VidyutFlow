import assert from 'node:assert/strict';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
} from '../src/data/mockData';
import {
  DEFAULT_LATE_CHARGE_POLICY,
  calculateOverdueDays,
  calculateLatePaymentCharges,
  calculateBatchOverdueSummary,
  getLateChargeLocalization,
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from '../src/utils/lateChargeEngine';
import {
  reconcileBillWithPayments,
  selectConnectionBillingSummary,
  selectConsumerAccountBillingSummary,
} from '../src/utils/billingEngine';
import {
  selectConsumerCanonicalAnalytics,
  selectEmployeeWorkloadAndSlaMetrics,
  selectManagementCanonicalMetrics,
} from '../src/utils/canonicalAnalytics';
import {
  ElectricityBill,
  PaymentTransaction,
} from '../src/types';
import { Language } from '../src/i18n/types';

console.log('================================================================================');
console.log('VIDYUTFLOW 2.0 — STEP 4A OF 4: AUTOMATIC OVERDUE BILLS & LATE CHARGES TEST SUITE');
console.log('================================================================================');

let passedTests = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [TEST ${passedTests.toString().padStart(2, '0')}] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Existing Unpaid Bill Identification
// -----------------------------------------------------------------------------
runTest('1. Existing unpaid bill identification (BILL-UG-2026-10-8821 with past due date)', () => {
  const unpaidBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821');
  assert.ok(unpaidBill, 'Target unpaid bill BILL-UG-2026-10-8821 must exist in INITIAL_BILLS');
  assert.equal(unpaidBill.consumerNo, '04281-99231', 'Consumer number must match');
  assert.equal(unpaidBill.status, 'Unpaid', 'Initial bill status must be Unpaid');
  assert.equal(unpaidBill.totalAmount, 2185, 'Original bill amount must be ₹2,185');
  assert.equal(unpaidBill.dueDate, '22-Oct-2026', 'Due date must be 22-Oct-2026');

  // Verify connection exists for this consumer
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === unpaidBill.consumerNo);
  assert.ok(conn, 'Consumer connection must exist for 04281-99231');

  // Verify no conflicting settled transaction exists for this bill
  const settled = INITIAL_PAYMENTS.find(
    p => p.billNo === unpaidBill.billNo && p.status === 'Successful'
  );
  assert.equal(settled, undefined, 'There must be no conflicting settled payment for BILL-UG-2026-10-8821');
});

// -----------------------------------------------------------------------------
// TEST 2: Non-destructive Example Bill Creation / Compatibility
// -----------------------------------------------------------------------------
runTest('2. Non-destructive example bill creation and compatibility with existing dataset', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  assert.ok(targetBill.billMonth, 'Bill must have valid billMonth');
  assert.ok(targetBill.billDate, 'Bill must have valid billDate');
  assert.ok(targetBill.unitsConsumed > 0, 'Bill must have positive consumption units');
  assert.ok(Array.isArray(targetBill.slabBreakdown) && targetBill.slabBreakdown.length > 0, 'Slab breakdown integrity');

  const rec = reconcileBillWithPayments(targetBill, [], '22-Oct-2026');
  assert.equal(rec.totalAmount, 2185);
  assert.equal(rec.remainingBalance, 2185);
});

// -----------------------------------------------------------------------------
// TEST 3: Correct Overdue Day Count (Asia/Kolkata Business Date)
// -----------------------------------------------------------------------------
runTest('3. Correct overdue day count in Asia/Kolkata timezone', () => {
  const dueDate = '22-Oct-2026';
  assert.equal(calculateOverdueDays(dueDate, '22-Oct-2026').daysOverdue, 0, 'On due date = 0 days overdue');
  assert.equal(calculateOverdueDays(dueDate, '22-Oct-2026').isOverdue, false);
  assert.equal(calculateOverdueDays(dueDate, '21-Oct-2026').daysOverdue, 0, 'Before due date = 0 days overdue');
  assert.equal(calculateOverdueDays(dueDate, '23-Oct-2026').daysOverdue, 1, '1 day after due date = 1 day overdue');
  assert.equal(calculateOverdueDays(dueDate, '23-Oct-2026').isOverdue, true);
  assert.equal(calculateOverdueDays(dueDate, '28-Oct-2026').daysOverdue, 6, '6 days after due date = 6 days overdue');
  assert.equal(calculateOverdueDays(dueDate, '31-Oct-2026').daysOverdue, 9, 'End of month = 9 days overdue');
  assert.equal(calculateOverdueDays(dueDate, '01-Nov-2026').daysOverdue, 10, 'Month transition = 10 days overdue');
});

// -----------------------------------------------------------------------------
// TEST 4: Daily Charge Accrual Formula
// -----------------------------------------------------------------------------
runTest('4. Daily charge accrual formula (P * (R / 100 / 365) * D)', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  // Principal = 2185, Rate = 15% p.a., Days = 6
  // Expected = 2185 * (0.15 / 365) * 6 = 5.3856... -> rounded to 5.39
  const breakdown = calculateLatePaymentCharges({
    bill: targetBill,
    referenceDate: '28-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });

  assert.equal(breakdown.chargeableDays, 6, 'Chargeable days must be 6');
  assert.equal(breakdown.remainingPrincipal, 2185, 'Remaining principal must be 2185');
  assert.equal(breakdown.lateChargesAccrued, 5.39, 'Late charges accrued must be 5.39');
  assert.equal(breakdown.netLateChargesPayable, 5.39, 'Net late charges payable must be 5.39');
  assert.equal(breakdown.totalOutstandingPayable, 2190.39, 'Total outstanding must be 2190.39');
});

// -----------------------------------------------------------------------------
// TEST 5: No Charges Before Applicable Date
// -----------------------------------------------------------------------------
runTest('5. No charges before the applicable due date', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const onDue = calculateLatePaymentCharges({
    bill: targetBill,
    referenceDate: '22-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(onDue.chargeableDays, 0);
  assert.equal(onDue.lateChargesAccrued, 0);
  assert.equal(onDue.totalOutstandingPayable, 2185);

  const beforeDue = calculateLatePaymentCharges({
    bill: targetBill,
    referenceDate: '15-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(beforeDue.chargeableDays, 0);
  assert.equal(beforeDue.lateChargesAccrued, 0);
  assert.equal(beforeDue.totalOutstandingPayable, 2185);
});

// -----------------------------------------------------------------------------
// TEST 6: Grace-Period Boundaries
// -----------------------------------------------------------------------------
runTest('6. Grace-period boundaries (Agricultural (AG) 7-day grace rule)', () => {
  const agriBill: ElectricityBill = {
    billNo: 'BILL-AGRI-TEST-001',
    consumerNo: '99999-00001',
    billMonth: 'September 2026',
    billDate: '01-Oct-2026',
    dueDate: '20-Oct-2026',
    previousReadingKwh: 100,
    currentReadingKwh: 500,
    unitsConsumed: 400,
    energyCharges: 1000,
    fixedCharges: 100,
    fuelPriceAdjustment: 200,
    electricityDuty: 50,
    rebateOrSubsidy: 0,
    totalAmount: 1350,
    status: 'Unpaid',
    slabBreakdown: [],
  };

  // Agricultural (AG) category has 7-day grace in policy
  const withinGrace = calculateLatePaymentCharges({
    bill: agriBill,
    tariffCategory: 'Agricultural (AG)',
    referenceDate: '25-Oct-2026', // 5 days overdue <= 7
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(withinGrace.daysOverdue, 5);
  assert.equal(withinGrace.chargeableDays, 0, 'Within grace period -> 0 chargeable days');
  assert.equal(withinGrace.lateChargesAccrued, 0);

  const atGraceBoundary = calculateLatePaymentCharges({
    bill: agriBill,
    tariffCategory: 'Agricultural (AG)',
    referenceDate: '27-Oct-2026', // 7 days overdue
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(atGraceBoundary.chargeableDays, 0);
  assert.equal(atGraceBoundary.lateChargesAccrued, 0);

  // Day 8 overdue (28-Oct): exceeds grace period -> charges accrue for chargeable days beyond grace
  const pastGrace = calculateLatePaymentCharges({
    bill: agriBill,
    tariffCategory: 'Agricultural (AG)',
    referenceDate: '28-Oct-2026', // 8 days overdue > 7
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(pastGrace.daysOverdue, 8);
  assert.ok(pastGrace.chargeableDays > 0);
  assert.ok(pastGrace.lateChargesAccrued > 0);
});

// -----------------------------------------------------------------------------
// TEST 7: Monthly Billing Compatibility
// -----------------------------------------------------------------------------
runTest('7. Monthly billing compatibility', () => {
  const monthlyBill: ElectricityBill = {
    billNo: 'BILL-MONTHLY-TEST-01',
    consumerNo: '04281-99231',
    billMonth: 'September 2026',
    billDate: '01-Oct-2026',
    dueDate: '16-Oct-2026',
    billingCycleType: 'MONTHLY',
    previousReadingKwh: 1000,
    currentReadingKwh: 1250,
    unitsConsumed: 250,
    energyCharges: 1100,
    fixedCharges: 100,
    fuelPriceAdjustment: 150,
    electricityDuty: 80,
    rebateOrSubsidy: 0,
    totalAmount: 1430,
    status: 'Unpaid',
    slabBreakdown: [],
  };

  const rec = reconcileBillWithPayments(monthlyBill, [], '26-Oct-2026');
  assert.equal(rec.isOverdue, true);
  assert.equal(rec.lateChargeBreakdown?.chargeableDays, 10);
  // 1430 * (0.15 / 365) * 10 = 5.8767 -> 5.88
  assert.equal(rec.lateChargeBreakdown?.netLateChargesPayable, 5.88);
  assert.equal(rec.lateChargeBreakdown?.totalOutstandingPayable, 1435.88);
});

// -----------------------------------------------------------------------------
// TEST 8: Bi-Monthly Billing Compatibility
// -----------------------------------------------------------------------------
runTest('8. Bi-monthly billing compatibility', () => {
  const bimonthlyBill: ElectricityBill = {
    billNo: 'BILL-BIMONTHLY-TEST-01',
    consumerNo: '04281-99231',
    billMonth: 'August–September 2026',
    billDate: '05-Oct-2026',
    dueDate: '20-Oct-2026',
    billingCycleType: 'BI_MONTHLY',
    periodStartDate: '01-Aug-2026',
    periodEndDate: '30-Sep-2026',
    billingPeriodLabel: '01-Aug-2026 to 30-Sep-2026',
    previousReadingKwh: 1000,
    currentReadingKwh: 1500,
    unitsConsumed: 500,
    energyCharges: 2500,
    fixedCharges: 200,
    fuelPriceAdjustment: 300,
    electricityDuty: 200,
    rebateOrSubsidy: 0,
    totalAmount: 3200,
    status: 'Unpaid',
    slabBreakdown: [],
  };

  const rec = reconcileBillWithPayments(bimonthlyBill, [], '28-Oct-2026');
  assert.equal(rec.isOverdue, true);
  assert.equal(rec.lateChargeBreakdown?.billingCycleType, 'BI_MONTHLY');
  assert.equal(rec.lateChargeBreakdown?.chargeableDays, 8);
  // 3200 * (0.15 / 365) * 8 = 10.5205 -> 10.52
  assert.equal(rec.lateChargeBreakdown?.netLateChargesPayable, 10.52);
  assert.equal(rec.lateChargeBreakdown?.totalOutstandingPayable, 3210.52);
});

// -----------------------------------------------------------------------------
// TEST 9: Partial Payment Reduces Principal and Accrues on Remainder
// -----------------------------------------------------------------------------
runTest('9. Partial payment reduces principal and accrues on remainder', () => {
  const testBill: ElectricityBill = {
    billNo: 'BILL-PARTIAL-001',
    consumerNo: '04281-99231',
    billMonth: 'September 2026',
    billDate: '01-Oct-2026',
    dueDate: '15-Oct-2026',
    previousReadingKwh: 0,
    currentReadingKwh: 200,
    unitsConsumed: 200,
    energyCharges: 1000,
    fixedCharges: 0,
    fuelPriceAdjustment: 0,
    electricityDuty: 0,
    rebateOrSubsidy: 0,
    totalAmount: 1000,
    status: 'Partially Paid',
    slabBreakdown: [],
  };

  // Payment of ₹400 made on 20-Oct-2026 (5 days after due date)
  const partialPayment: PaymentTransaction = {
    txId: 'PAY-PARTIAL-01',
    consumerNo: testBill.consumerNo,
    billNo: testBill.billNo,
    amount: 400,
    date: '20-Oct-2026 11:00',
    paymentMethod: 'UPI / BHIM',
    bankReference: 'UPI-PART-001',
    status: 'Successful',
  };

  const rec = reconcileBillWithPayments(testBill, [partialPayment], '25-Oct-2026');
  assert.equal(rec.paidAmount, 400);
  assert.equal(rec.remainingBalance, 600);
  assert.equal(rec.lateChargeBreakdown?.remainingPrincipal, 600);
  assert.equal(rec.lateChargeBreakdown?.lateChargesAccrued, 3.28);
  assert.equal(rec.lateChargeBreakdown?.totalOutstandingPayable, 603.28);
});

// -----------------------------------------------------------------------------
// TEST 10: Multiple Partial Payments (Chronological Tranches)
// -----------------------------------------------------------------------------
runTest('10. Multiple partial payments (chronological tranches)', () => {
  const testBill: ElectricityBill = {
    billNo: 'BILL-MULTI-PART-01',
    consumerNo: '04281-99231',
    billMonth: 'September 2026',
    billDate: '01-Oct-2026',
    dueDate: '10-Oct-2026',
    previousReadingKwh: 0,
    currentReadingKwh: 300,
    unitsConsumed: 300,
    energyCharges: 2000,
    fixedCharges: 0,
    fuelPriceAdjustment: 0,
    electricityDuty: 0,
    rebateOrSubsidy: 0,
    totalAmount: 2000,
    status: 'Partially Paid',
    slabBreakdown: [],
  };

  const pay1: PaymentTransaction = {
    txId: 'PAY-MULTI-01',
    consumerNo: testBill.consumerNo,
    billNo: testBill.billNo,
    amount: 500,
    date: '15-Oct-2026 10:00',
    paymentMethod: 'Debit Card',
    bankReference: 'REF-01',
    status: 'Successful',
  };

  const pay2: PaymentTransaction = {
    txId: 'PAY-MULTI-02',
    consumerNo: testBill.consumerNo,
    billNo: testBill.billNo,
    amount: 700,
    date: '20-Oct-2026 14:00',
    paymentMethod: 'UPI / BHIM',
    bankReference: 'REF-02',
    status: 'Successful',
  };

  const rec = reconcileBillWithPayments(testBill, [pay1, pay2], '25-Oct-2026');
  assert.equal(rec.paidAmount, 1200);
  assert.equal(rec.remainingBalance, 800);
  assert.equal(rec.lateChargeBreakdown?.remainingPrincipal, 800);
  assert.ok((rec.lateChargeBreakdown?.lateChargesAccrued || 0) > 0);
  assert.equal(rec.lateChargeBreakdown?.auditTrail.tranches.length, 3, 'Audit trail should document 3 tranches');
});

// -----------------------------------------------------------------------------
// TEST 11: Full Settlement (Zero Accrual After Full Payment)
// -----------------------------------------------------------------------------
runTest('11. Full settlement (zero charges accrue after full settlement, status becomes Paid)', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const fullPayment: PaymentTransaction = {
    txId: 'PAY-SETTLE-FULL-01',
    consumerNo: targetBill.consumerNo,
    billNo: targetBill.billNo,
    amount: 2185,
    date: '24-Oct-2026 15:00',
    paymentMethod: 'Net Banking',
    bankReference: 'NET-FULL-8821',
    status: 'Successful',
  };

  const rec = reconcileBillWithPayments(targetBill, [fullPayment], '30-Oct-2026');
  assert.equal(rec.status, 'Paid');
  assert.equal(rec.remainingBalance, 0);
  assert.equal(rec.lateChargeBreakdown?.remainingPrincipal, 0);
  assert.equal(rec.lateChargeBreakdown?.status, 'Paid');
});

// -----------------------------------------------------------------------------
// TEST 12: Failed Payment Does Not Reduce Balance or Stop Accrual
// -----------------------------------------------------------------------------
runTest('12. Failed payment does not reduce balance or stop accrual', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const failedPay: PaymentTransaction = {
    txId: 'PAY-FAILED-01',
    consumerNo: targetBill.consumerNo,
    billNo: targetBill.billNo,
    amount: 2185,
    date: '23-Oct-2026 12:00',
    paymentMethod: 'UPI / BHIM',
    bankReference: 'UPI-FAIL-01',
    status: 'Failed',
  };

  const rec = reconcileBillWithPayments(targetBill, [failedPay], '28-Oct-2026');
  assert.equal(rec.paidAmount, 0, 'Failed payment must not be counted in paid amount');
  assert.equal(rec.remainingBalance, 2185, 'Remaining principal unchanged');
  assert.equal(rec.lateChargeBreakdown?.lateChargesAccrued, 5.39, 'Charges continue accruing on full principal');
});

// -----------------------------------------------------------------------------
// TEST 13: Pending Payment Does Not Reduce Balance or Stop Accrual
// -----------------------------------------------------------------------------
runTest('13. Pending payment does not reduce balance or stop accrual', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const pendingPay: PaymentTransaction = {
    txId: 'PAY-PENDING-01',
    consumerNo: targetBill.consumerNo,
    billNo: targetBill.billNo,
    amount: 2185,
    date: '25-Oct-2026 13:00',
    paymentMethod: 'Debit Card',
    bankReference: 'DC-PEND-01',
    status: 'Pending Verification',
  };

  const rec = reconcileBillWithPayments(targetBill, [pendingPay], '28-Oct-2026');
  assert.equal(rec.paidAmount, 0, 'Pending payment must not reduce balance');
  assert.equal(rec.lateChargeBreakdown?.remainingPrincipal, 2185);
  assert.equal(rec.lateChargeBreakdown?.lateChargesAccrued, 5.39);
});

// -----------------------------------------------------------------------------
// TEST 14: Payment Reversal Restores Principal and Resumes Accrual
// -----------------------------------------------------------------------------
runTest('14. Payment reversal restores principal and resumes accrual', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const payToReverse: PaymentTransaction = {
    txId: 'PAY-REV-01',
    consumerNo: targetBill.consumerNo,
    billNo: targetBill.billNo,
    amount: 1000,
    date: '23-Oct-2026 10:00',
    paymentMethod: 'UPI / BHIM',
    bankReference: 'UPI-REV-01',
    status: 'Successful',
  };
  const reversal: PaymentReversalRecord = {
    reversalId: 'REV-001',
    txId: 'PAY-REV-01',
    billNo: targetBill.billNo,
    amount: 1000,
    reversedDate: '25-Oct-2026',
    reason: 'Bank chargeback reversal',
  };

  const bd = calculateLatePaymentCharges({
    bill: targetBill,
    payments: [payToReverse],
    reversals: [reversal],
    referenceDate: '28-Oct-2026',
  });
  assert.equal(bd.successfulPayments, 0, 'Reversed payment yields 0 settled amount');
  assert.equal(bd.remainingPrincipal, 2185);
  assert.equal(bd.lateChargesAccrued, 5.39);
});

// -----------------------------------------------------------------------------
// TEST 15: Waiver Reduces Net Late Charges
// -----------------------------------------------------------------------------
runTest('15. Waiver reduces net late charges payable', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const waiver: LateChargeWaiverRecord = {
    waiverId: 'WAV-001',
    billNo: targetBill.billNo,
    amount: 2.00,
    waivedDate: '27-Oct-2026',
    authorizedBy: 'SDO Mehsana',
    reason: 'Goodwill waiver',
  };

  const breakdown = calculateLatePaymentCharges({
    bill: targetBill,
    referenceDate: '28-Oct-2026',
    waivers: [waiver],
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });

  assert.equal(breakdown.lateChargesAccrued, 5.39);
  assert.equal(breakdown.lateChargesWaived, 2.00);
  assert.equal(breakdown.netLateChargesPayable, 3.39);
  assert.equal(breakdown.totalOutstandingPayable, 2188.39);

  // Waiver cannot exceed accrued late charges
  const excessiveWaiver: LateChargeWaiverRecord = {
    waiverId: 'WAV-002',
    billNo: targetBill.billNo,
    amount: 100.00,
    waivedDate: '27-Oct-2026',
    authorizedBy: 'SDO Mehsana',
    reason: 'Full DPS waiver',
  };
  const excessiveResult = calculateLatePaymentCharges({
    bill: targetBill,
    referenceDate: '28-Oct-2026',
    waivers: [excessiveWaiver],
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(excessiveResult.lateChargesWaived, 5.39, 'Waiver capped at accrued late charges');
  assert.equal(excessiveResult.netLateChargesPayable, 0.00);
  assert.equal(excessiveResult.totalOutstandingPayable, 2185.00);
});

// -----------------------------------------------------------------------------
// TEST 16: Duplicate Charge Prevention
// -----------------------------------------------------------------------------
runTest('16. Duplicate charge prevention across multiple calls and evaluations', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const res1 = calculateLatePaymentCharges({ bill: targetBill, referenceDate: '28-Oct-2026' });
  const res2 = calculateLatePaymentCharges({ bill: targetBill, referenceDate: '28-Oct-2026' });
  const res3 = calculateLatePaymentCharges({ bill: targetBill, referenceDate: '28-Oct-2026' });

  assert.equal(res1.lateChargesAccrued, res2.lateChargesAccrued);
  assert.equal(res2.totalOutstandingPayable, res3.totalOutstandingPayable);
  assert.equal(targetBill.totalAmount, 2185, 'Original bill amount is never mutated');
});

// -----------------------------------------------------------------------------
// TEST 17: Refresh Consistency (Deterministic Reference Clock)
// -----------------------------------------------------------------------------
runTest('17. Refresh consistency via deterministic reference clock', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const refClock = '28-Oct-2026';
  const recA = reconcileBillWithPayments(targetBill, [], refClock);
  const recB = reconcileBillWithPayments(targetBill, [], refClock);

  assert.equal(recA.lateChargeBreakdown?.totalOutstandingPayable, recB.lateChargeBreakdown?.totalOutstandingPayable);
  assert.equal(recA.lateChargeBreakdown?.chargeableDays, recB.lateChargeBreakdown?.chargeableDays);
});

// -----------------------------------------------------------------------------
// TEST 18: Midnight Date Boundary
// -----------------------------------------------------------------------------
runTest('18. Midnight date boundary (day count increments cleanly at 00:00 Asia/Kolkata)', () => {
  const dueDate = '22-Oct-2026';
  assert.equal(calculateOverdueDays(dueDate, '22-Oct-2026').daysOverdue, 0);
  assert.equal(calculateOverdueDays(dueDate, '23-Oct-2026').daysOverdue, 1);
  assert.equal(calculateOverdueDays(dueDate, '24-Oct-2026').daysOverdue, 2);
});

// -----------------------------------------------------------------------------
// TEST 19: Cross-Year Transition
// -----------------------------------------------------------------------------
runTest('19. Cross-year transition (Dec 31 to Jan 1)', () => {
  const decBillDueDate = '25-Dec-2026';
  assert.equal(calculateOverdueDays(decBillDueDate, '31-Dec-2026').daysOverdue, 6);
  assert.equal(calculateOverdueDays(decBillDueDate, '01-Jan-2027').daysOverdue, 7);
  assert.equal(calculateOverdueDays(decBillDueDate, '10-Jan-2027').daysOverdue, 16);
});

// -----------------------------------------------------------------------------
// TEST 20: Correct Currency Rounding (Paise Half-Up)
// -----------------------------------------------------------------------------
runTest('20. Correct currency rounding (2 decimal places / half-up paise)', () => {
  const targetBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const b = calculateLatePaymentCharges({
    bill: targetBill,
    referenceDate: '28-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });

  const chargesStr = b.netLateChargesPayable.toFixed(2);
  assert.equal(chargesStr, '5.39');
  assert.equal(b.totalOutstandingPayable.toFixed(2), '2190.39');
});

// -----------------------------------------------------------------------------
// TEST 21: Consumer Overdue Display Contract
// -----------------------------------------------------------------------------
runTest('21. Consumer overdue display contract', () => {
  const consumerNo = '04281-99231';
  const accountSum = selectConsumerAccountBillingSummary({
    allConnections: INITIAL_CONNECTIONS,
    allBills: INITIAL_BILLS,
    allPayments: INITIAL_PAYMENTS,
    actorScope: { linkedConsumerNo: consumerNo, ownedConsumerNos: [consumerNo] },
    selectedConnectionNo: consumerNo,
    referenceDate: '28-Oct-2026',
  });

  assert.equal(accountSum.selectedConnectionNo, consumerNo);
  assert.equal(accountSum.selectedConnectionDueCount, 1);
  assert.equal(accountSum.selectedConnectionSummary.totalOutstandingAmount, 2185);
  assert.equal(accountSum.selectedConnectionSummary.totalAccruedLateCharges, 5.39);
  assert.equal(accountSum.selectedConnectionSummary.totalOutstandingWithCharges, 2190.39);

  // Check canonical analytics
  const consumerAnalytics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS.filter(c => c.consumerNo === consumerNo),
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: { linkedConsumerNo: consumerNo, ownedConsumerNos: [consumerNo] },
    selectedConnectionNo: consumerNo,
    referenceDate: '28-Oct-2026',
  });

  assert.equal(consumerAnalytics.connectionOverduePrincipalInr, 2185);
  assert.equal(consumerAnalytics.connectionAccruedLateChargesInr, 5.39);
  assert.equal(consumerAnalytics.connectionTotalOutstandingWithChargesInr, 2190.39);
  assert.ok(consumerAnalytics.activeOverdueBreakdown, 'Active overdue breakdown must be populated');
});

// -----------------------------------------------------------------------------
// TEST 22: Employee Subdivision Visibility (Principal vs DPS Separation)
// -----------------------------------------------------------------------------
runTest('22. Employee subdivision visibility (separation of principal and DPS)', () => {
  const employeeMetrics = selectEmployeeWorkloadAndSlaMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
  });

  assert.ok((employeeMetrics.liveBillingLedger.overdueBillsCount || 0) >= 1);
  assert.ok((employeeMetrics.liveBillingLedger.totalOverduePrincipalInr || 0) >= 2185);
  assert.ok((employeeMetrics.liveBillingLedger.totalAccruedLateChargesInr || 0) >= 5.39);
  assert.equal(
    employeeMetrics.liveBillingLedger.totalOutstandingWithLateChargesInr,
    Number(
      (
        employeeMetrics.liveBillingLedger.totalOutstandingAmountInr +
        (employeeMetrics.liveBillingLedger.totalAccruedLateChargesInr || 0)
      ).toFixed(2)
    )
  );
});

// -----------------------------------------------------------------------------
// TEST 23: Management Aggregation Without Double Counting
// -----------------------------------------------------------------------------
runTest('23. Management aggregation without double counting', () => {
  const mgmtMetrics = selectManagementCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
  });

  assert.ok((mgmtMetrics.executiveKpis.overduePrincipalInr || 0) >= 2185);
  assert.ok((mgmtMetrics.executiveKpis.accruedLateChargesInr || 0) >= 5.39);
  assert.equal(
    mgmtMetrics.executiveKpis.totalOutstandingWithChargesInr,
    Number(
      (
        mgmtMetrics.executiveKpis.liveErpTotalOutstandingInr +
        (mgmtMetrics.executiveKpis.accruedLateChargesInr || 0)
      ).toFixed(2)
    )
  );

  // Batch summary check
  const batchSum = calculateBatchOverdueSummary({
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    referenceDate: '28-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.ok(batchSum.overdueBillsCount >= 1);
  assert.equal(batchSum.totalOverduePrincipalInr, mgmtMetrics.executiveKpis.overduePrincipalInr);
  assert.equal(batchSum.totalAccruedLateChargesInr, mgmtMetrics.executiveKpis.accruedLateChargesInr);
});

// -----------------------------------------------------------------------------
// TEST 24: Admin Policy Visibility & Audit Information
// -----------------------------------------------------------------------------
runTest('24. Admin policy visibility and audit information', () => {
  assert.equal(DEFAULT_LATE_CHARGE_POLICY.policyId, 'POL-UGVCL-DPS-DEMO-2026.1');
  assert.equal(DEFAULT_LATE_CHARGE_POLICY.version, '2026.1-DEMO');
  assert.equal(DEFAULT_LATE_CHARGE_POLICY.annualRatePercent, 15.0);
  assert.equal(DEFAULT_LATE_CHARGE_POLICY.calculationMethod, 'DAILY_SIMPLE');
  assert.equal(DEFAULT_LATE_CHARGE_POLICY.gracePeriodDays, 0);
  assert.equal(DEFAULT_LATE_CHARGE_POLICY.isDemoSimulation, true);
  assert.ok(DEFAULT_LATE_CHARGE_POLICY.categoryOverrides?.['Residential (RGPU)']);
  assert.ok(DEFAULT_LATE_CHARGE_POLICY.categoryOverrides?.['Commercial (NRGP)']);
  assert.ok(DEFAULT_LATE_CHARGE_POLICY.categoryOverrides?.['Industrial (LTMD)']);
  assert.ok(DEFAULT_LATE_CHARGE_POLICY.categoryOverrides?.['Agricultural (AG)']);
});

// -----------------------------------------------------------------------------
// TEST 25: All Four Languages Coverage
// -----------------------------------------------------------------------------
runTest('25. All four languages coverage (English, Gujarati, Hindi, Marathi)', () => {
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  const expectedKeys = [
    'overdue',
    'lateCharges',
    'originalAmount',
    'remainingPrincipal',
    'totalOutstanding',
    'paymentReceived',
    'chargeCalculationDate',
    'gracePeriod',
    'dailyAccrualRate',
    'annualRate',
    'demoTariffBadge',
    'payTotalOutstandingBtn',
    'waivedChargesBadge',
    'dueOn',
    'statusOverdueBadge',
    'overdueBreakdownTitle',
  ];

  for (const lang of languages) {
    const dict = getLateChargeLocalization(lang);
    assert.ok(dict, `Localization dictionary for ${lang} must exist`);
    assert.equal(typeof dict.daysOverdue, 'function', `daysOverdue in ${lang} must be a formatting function`);
    assert.ok(dict.daysOverdue(6).length > 0, `daysOverdue(6) in ${lang} must return non-empty text`);
    for (const key of expectedKeys) {
      assert.ok(
        (dict as any)[key] && typeof (dict as any)[key] === 'string' && (dict as any)[key].length > 0,
        `Key ${key} in ${lang} dictionary must be non-empty`
      );
    }
  }
});

// -----------------------------------------------------------------------------
// TEST 26: Preservation of Historical Records
// -----------------------------------------------------------------------------
runTest('26. Preservation of historical records (INITIAL_BILLS, CONNECTIONS, PAYMENTS)', () => {
  assert.equal(INITIAL_BILLS.length, 4, 'All 4 initial bills preserved');
  assert.equal(INITIAL_CONNECTIONS.length, 2, 'All 2 initial connections preserved');
  assert.equal(INITIAL_PAYMENTS.length, 3, 'All 3 initial payments preserved');
  assert.ok(INITIAL_APPLICATIONS.length >= 3, 'All initial applications preserved');
  assert.ok(INITIAL_COMPLAINTS.length >= 3, 'All initial complaints preserved');
  assert.ok(INITIAL_WORK_ORDERS.length >= 3, 'All initial work orders preserved');
  assert.ok(AUDIT_LOGS.length >= 5, 'All initial audit logs preserved');

  // Specific check that historical settled bills are NOT overdue
  const settledBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-09-8821')!;
  const recSettled = reconcileBillWithPayments(settledBill, INITIAL_PAYMENTS, '28-Oct-2026');
  assert.equal(recSettled.status, 'Paid');
  assert.equal(recSettled.remainingBalance, 0);
  assert.equal(recSettled.lateChargeBreakdown?.netLateChargesPayable, 0);
});

console.log('--------------------------------------------------------------------------------');
console.log(`ALL 26/26 STEP 4A TESTS PASSED SUCCESSFULLY! (100% SUCCESS RATE)`);
console.log('================================================================================');
