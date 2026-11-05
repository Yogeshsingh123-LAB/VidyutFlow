import assert from 'node:assert/strict';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS
} from '../src/data/mockData';
import {
  CANONICAL_OVERDUE_BILL_DUE_DATE,
  reconcileRuntimeDemoBillsSeed,
  reconcileBillWithPayments,
  selectConnectionBillingSummary
} from '../src/utils/billingEngine';
import {
  selectConsumerCanonicalAnalytics,
  COMMERCIAL_CONSUMPTION_HISTORY_77190
} from '../src/utils/canonicalAnalytics';
import {
  generateElectricityBillDocument,
  generateUpdatedAccountStatementDocument,
  generatePaymentReceiptDocument,
  generateConsumptionReportDocument,
  generatePaymentHistoryReportDocument,
  generateComplaintAcknowledgmentDocument,
  generateOfficialDocumentPdfBytes
} from '../src/utils/documentEngine';
import { PaymentTransaction } from '../src/types';

console.log('=== VIDYUTFLOW 2.0 MASTER STEP 3/3: BILLING, CONSUMPTION CHART & DOWNLOADS VERIFICATION ===');

// ---------------------------------------------------------------------------
// PHASE 1: Overdue Bill Dates (30-Oct-2026) & Real-Time Recalculation
// ---------------------------------------------------------------------------
const runtimeBills = reconcileRuntimeDemoBillsSeed(INITIAL_BILLS, INITIAL_BILLS);

const bill8821 = runtimeBills.find((b) => b.billNo === 'BILL-UG-2026-10-8821');
const bill77190 = runtimeBills.find((b) => b.billNo === 'BILL-UG-2026-10-77190');
const futureUnpaid77190 = runtimeBills.find((b) => b.billNo === 'BILL-UG-2026-11-77190');

assert.ok(bill8821, 'Residential overdue bill BILL-UG-2026-10-8821 must exist');
assert.ok(bill77190, 'Commercial overdue bill BILL-UG-2026-10-77190 must exist');
assert.ok(futureUnpaid77190, 'Commercial unpaid (not overdue) bill BILL-UG-2026-11-77190 must exist');

assert.equal(bill8821.dueDate, CANONICAL_OVERDUE_BILL_DUE_DATE, 'BILL-UG-2026-10-8821 due date must be 30-Oct-2026');
assert.equal(bill77190.dueDate, CANONICAL_OVERDUE_BILL_DUE_DATE, 'BILL-UG-2026-10-77190 due date must be 30-Oct-2026');
assert.equal(futureUnpaid77190.dueDate, '25-Nov-2026', 'BILL-UG-2026-11-77190 due date must be 25-Nov-2026');

// Verify date progression for 30-Oct-2026 due date across calendar dates in Asia/Kolkata:
// 1. On 30-Oct-2026 (Due Date itself): 0 days overdue, ₹0.00 late charges, UNPAID (not Overdue)
const onDueDate77190 = reconcileBillWithPayments(bill77190, INITIAL_PAYMENTS, '30-Oct-2026');
assert.equal(onDueDate77190.lateChargeBreakdown.daysOverdue, 0, 'On 30-Oct-2026, daysOverdue must be 0');
assert.equal(onDueDate77190.totalAccruedLateCharges, 0, 'On 30-Oct-2026, totalAccruedLateCharges must be 0');
assert.equal(onDueDate77190.status, 'Unpaid', 'On 30-Oct-2026, bill must be Unpaid (not Overdue)');
assert.equal(onDueDate77190.lifecycleStatus, 'DUE_TODAY', 'On 30-Oct-2026, lifecycleStatus must be DUE_TODAY');

// 2. On 31-Oct-2026: 1 day overdue, status Overdue
const day1Overdue77190 = reconcileBillWithPayments(bill77190, INITIAL_PAYMENTS, '31-Oct-2026');
assert.equal(day1Overdue77190.lateChargeBreakdown.daysOverdue, 1, 'On 31-Oct-2026, daysOverdue must be 1');
assert.equal(day1Overdue77190.status, 'Overdue', 'On 31-Oct-2026, bill must transition to Overdue');
assert.ok(day1Overdue77190.totalAccruedLateCharges > 0, 'On 31-Oct-2026, totalAccruedLateCharges must be > 0');

// 3. On 05-Nov-2026 (Default business reference date): 6 days overdue
const nov5Overdue77190 = reconcileBillWithPayments(bill77190, INITIAL_PAYMENTS, '05-Nov-2026');
assert.equal(nov5Overdue77190.lateChargeBreakdown.daysOverdue, 6, 'On 05-Nov-2026, daysOverdue must be 6');
assert.equal(nov5Overdue77190.totalAmount, 14854, 'Principal for BILL-UG-2026-10-77190 must be ₹14,854.00');
assert.equal(nov5Overdue77190.totalAccruedLateCharges, 36.63, '6-day DPS for ₹14,854 at 15% p.a. must be ₹36.63');
assert.equal(nov5Overdue77190.totalOutstandingWithCharges, 14890.63, 'Total payable on 05-Nov-2026 must be ₹14,890.63');

const nov5Overdue8821 = reconcileBillWithPayments(bill8821, INITIAL_PAYMENTS, '05-Nov-2026');
assert.equal(nov5Overdue8821.lateChargeBreakdown.daysOverdue, 6, 'On 05-Nov-2026, BILL-UG-2026-10-8821 daysOverdue must be 6');
assert.equal(nov5Overdue8821.totalAmount, 2185, 'Principal for BILL-UG-2026-10-8821 must be ₹2,185.00');
assert.equal(nov5Overdue8821.totalAccruedLateCharges, 5.39, '6-day DPS for ₹2,185 at 15% p.a. must be ₹5.39');
assert.equal(nov5Overdue8821.totalOutstandingWithCharges, 2190.39, 'Total payable on 05-Nov-2026 for BILL-UG-2026-10-8821 must be ₹2,190.39');

// 4. On 06-Nov-2026: 7 days overdue
const nov6Overdue77190 = reconcileBillWithPayments(bill77190, INITIAL_PAYMENTS, '06-Nov-2026');
assert.equal(nov6Overdue77190.lateChargeBreakdown.daysOverdue, 7, 'On 06-Nov-2026, daysOverdue must be 7');
assert.equal(nov6Overdue77190.totalAccruedLateCharges, 42.73, '7-day DPS for ₹14,854 at 15% p.a. must be ₹42.73');
assert.equal(nov6Overdue77190.totalOutstandingWithCharges, 14896.73, 'Total payable on 06-Nov-2026 must be ₹14,896.73');

const nov6Overdue8821 = reconcileBillWithPayments(bill8821, INITIAL_PAYMENTS, '06-Nov-2026');
assert.equal(nov6Overdue8821.lateChargeBreakdown.daysOverdue, 7, 'On 06-Nov-2026, BILL-UG-2026-10-8821 daysOverdue must be 7');
assert.equal(nov6Overdue8821.totalAccruedLateCharges, 6.29, '7-day DPS for ₹2,185 at 15% p.a. must be ₹6.29');
assert.equal(nov6Overdue8821.totalOutstandingWithCharges, 2191.29, 'Total payable on 06-Nov-2026 for BILL-UG-2026-10-8821 must be ₹2,191.29');

// 5. On 10-Nov-2026: 11 days overdue
const nov10Overdue77190 = reconcileBillWithPayments(bill77190, INITIAL_PAYMENTS, '10-Nov-2026');
assert.equal(nov10Overdue77190.lateChargeBreakdown.daysOverdue, 11, 'On 10-Nov-2026, daysOverdue must be 11');

console.log('✓ Phase 1 passed: 30-Oct-2026 due date & multi-date overdue calculations verified.');

// ---------------------------------------------------------------------------
// PHASE 2: Correct UNPAID vs OVERDUE Bill Status & Settlement Recalculation
// ---------------------------------------------------------------------------
const futureBillOnNov5 = reconcileBillWithPayments(futureUnpaid77190, INITIAL_PAYMENTS, '05-Nov-2026');
assert.equal(futureBillOnNov5.status, 'Unpaid', 'BILL-UG-2026-11-77190 must be Unpaid on 05-Nov-2026');
assert.equal(futureBillOnNov5.isOverdue, false, 'BILL-UG-2026-11-77190 must not be overdue before 25-Nov-2026');
assert.equal(futureBillOnNov5.lateChargeBreakdown.daysOverdue, 0, 'BILL-UG-2026-11-77190 must have 0 overdue days before 25-Nov-2026');
assert.equal(futureBillOnNov5.totalAccruedLateCharges, 0, 'BILL-UG-2026-11-77190 must have ₹0.00 late charges before 25-Nov-2026');
assert.equal(futureBillOnNov5.totalOutstandingWithCharges, 14320, 'BILL-UG-2026-11-77190 totalOutstandingWithCharges must equal principal ₹14,320.00');

const futureBillOnDueDate = reconcileBillWithPayments(futureUnpaid77190, INITIAL_PAYMENTS, '25-Nov-2026');
assert.equal(futureBillOnDueDate.status, 'Unpaid', 'BILL-UG-2026-11-77190 must still be Unpaid on its due date');
assert.equal(futureBillOnDueDate.lateChargeBreakdown.daysOverdue, 0, 'Overdue days on due date must be 0');

const futureBillAfterDueDate = reconcileBillWithPayments(futureUnpaid77190, INITIAL_PAYMENTS, '26-Nov-2026');
assert.equal(futureBillAfterDueDate.status, 'Overdue', 'BILL-UG-2026-11-77190 must transition to Overdue on 26-Nov-2026');
assert.equal(futureBillAfterDueDate.lateChargeBreakdown.daysOverdue, 1, 'Overdue days on 26-Nov-2026 must be 1');
assert.ok(futureBillAfterDueDate.totalAccruedLateCharges > 0, 'Late charges on 26-Nov-2026 must be positive');

const conn99231 = INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-99231')!;
const conn77190 = INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-77190')!;

// Verify commercial meter summary on 05-Nov-2026 includes BOTH the overdue bill and the unpaid current bill,
// while surfacing the overdue bill as latestBill for the Overdue Breakdown Card
const commSummaryNov5 = selectConnectionBillingSummary(conn77190, runtimeBills, INITIAL_PAYMENTS, {
  referenceDate: '05-Nov-2026'
});
assert.equal(commSummaryNov5.dueBillCount, 2, '04281-77190 must have 2 total unsettled bills (1 Overdue + 1 Unpaid)');
assert.equal(
  commSummaryNov5.dueBills.filter((b) => b.isOverdue).length,
  1,
  '04281-77190 must have 1 Overdue bill on 05-Nov-2026'
);
assert.equal(
  commSummaryNov5.dueBills.filter((b) => !b.isOverdue).length,
  1,
  '04281-77190 must have 1 Unpaid (not overdue) bill on 05-Nov-2026'
);
assert.equal(commSummaryNov5.latestBill?.billNo, 'BILL-UG-2026-10-77190', 'Overdue bill must be prioritized for Overdue Breakdown Card');

// Verify full settlement of overdue bill clears its overdue status and leaves only the Unpaid (not overdue) bill
const settlementPayment: PaymentTransaction = {
  txId: 'UGVCL-TXN-TEST-77190',
  consumerNo: '04281-77190',
  billNo: 'BILL-UG-2026-10-77190',
  amount: 14890.63,
  date: '05-Nov-2026',
  paymentMethod: 'UPI / BHIM',
  status: 'Successful',
  bankReference: 'REF-TEST-77190'
};
const commSummaryAfterPay = selectConnectionBillingSummary(
  conn77190,
  runtimeBills,
  [...INITIAL_PAYMENTS, settlementPayment],
  { referenceDate: '05-Nov-2026' }
);
assert.equal(
  commSummaryAfterPay.dueBills.filter((b) => b.isOverdue).length,
  0,
  'After settling BILL-UG-2026-10-77190, overdue due bills count must be 0'
);
assert.equal(commSummaryAfterPay.dueBillCount, 1, 'After settling BILL-UG-2026-10-77190, 1 Unpaid (not overdue) bill remains');
assert.equal(commSummaryAfterPay.latestBill?.billNo, 'BILL-UG-2026-11-77190', 'Remaining due bill is BILL-UG-2026-11-77190');
assert.equal(commSummaryAfterPay.latestBill?.status, 'Unpaid', 'Remaining due bill status is Unpaid');

console.log('✓ Phase 2 passed: UNPAID vs OVERDUE status logic & settlement transitions verified.');

// ---------------------------------------------------------------------------
// PHASE 3: Monthly Electricity Consumption Chart (Multi-Meter 6-Month Series)
// ---------------------------------------------------------------------------
const resAnalytics = selectConsumerCanonicalAnalytics({
  connections: INITIAL_CONNECTIONS,
  bills: runtimeBills,
  payments: INITIAL_PAYMENTS,
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  notifications: INITIAL_NOTIFICATIONS,
  actorScope: {
    accountId: 'demo_consumer',
    email: 'consumer@vidyutflow.demo',
    ownedConsumerNos: ['04281-99231', '04281-77190']
  },
  selectedConnectionNo: '04281-99231',
  referenceDate: '05-Nov-2026',
  enableCommercialHybridHistory: true
});
assert.equal(resAnalytics.consumptionTrendSeries.length, 6, 'Residential meter 04281-99231 must have 6 monthly chart points');
assert.equal(resAnalytics.isInsufficientTrendHistory, false, 'Residential meter must not show insufficient trend history');
assert.equal(resAnalytics.averageMonthlyKwh, 418, 'Residential average monthly units must be 418 kWh');

const commAnalytics = selectConsumerCanonicalAnalytics({
  connections: INITIAL_CONNECTIONS,
  bills: runtimeBills,
  payments: INITIAL_PAYMENTS,
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  notifications: INITIAL_NOTIFICATIONS,
  actorScope: {
    accountId: 'demo_consumer',
    email: 'consumer@vidyutflow.demo',
    ownedConsumerNos: ['04281-99231', '04281-77190']
  },
  selectedConnectionNo: '04281-77190',
  referenceDate: '05-Nov-2026',
  enableCommercialHybridHistory: true
});
assert.equal(commAnalytics.consumptionTrendSeries.length, 6, 'Commercial meter 04281-77190 must have 6 monthly chart points');
assert.equal(commAnalytics.isInsufficientTrendHistory, false, 'Commercial meter must render full 6-month chart (not single dot)');
assert.equal(
  COMMERCIAL_CONSUMPTION_HISTORY_77190.length,
  6,
  'COMMERCIAL_CONSUMPTION_HISTORY_77190 must contain 6 monthly records'
);
assert.equal(commAnalytics.averageMonthlyKwh, 1705, 'Commercial average monthly units across May-Oct 2026 must be 1,705 kWh');
assert.equal(
  commAnalytics.consumptionTrendSeries[4].billNo,
  'BILL-UG-2026-10-77190',
  'Sep 2026 point on 04281-77190 chart must bind to live canonical bill BILL-UG-2026-10-77190'
);
assert.equal(
  commAnalytics.consumptionTrendSeries[5].billNo,
  'BILL-UG-2026-11-77190',
  'Oct 2026 point on 04281-77190 chart must bind to live canonical bill BILL-UG-2026-11-77190'
);

console.log('✓ Phase 3 passed: Both linked meters render complete 6-month consumption trajectories.');

// ---------------------------------------------------------------------------
// PHASE 4: Downloadable Billing Views & Documents (PDF & CSV Data Integrity)
// ---------------------------------------------------------------------------
const consumerActor = {
  id: 'demo_consumer',
  name: 'Rameshbhai K. Patel',
  role: 'consumer' as const,
  email: 'consumer@vidyutflow.demo',
  subdivision: 'North Subdivision',
  consumerNo: '04281-77190',
  ownedConsumerNos: ['04281-99231', '04281-77190']
};

// 1. Electricity Bill / Invoice PDF
const invoiceDoc = generateElectricityBillDocument({
  role: 'consumer',
  actor: consumerActor,
  bill: bill77190,
  connection: conn77190,
  payments: INITIAL_PAYMENTS,
  language: 'en',
  dataSource: 'DEMO',
  referenceDate: '05-Nov-2026'
});
assert.ok(invoiceDoc.authorized, 'Electricity Bill document must be authorized');
const invoicePdf = generateOfficialDocumentPdfBytes(invoiceDoc);
assert.ok(invoicePdf.byteLength > 800, 'Electricity Bill PDF must generate valid non-empty PDF bytes');

// 2. Updated Account Statement & Overdue Breakdown PDF
const statementDoc = generateUpdatedAccountStatementDocument({
  role: 'consumer',
  actor: consumerActor,
  bill: bill77190,
  connection: conn77190,
  payments: INITIAL_PAYMENTS,
  language: 'en',
  dataSource: 'DEMO',
  referenceDate: '05-Nov-2026'
});
assert.ok(statementDoc.authorized, 'Updated Account Statement document must be authorized');
const statementPdf = generateOfficialDocumentPdfBytes(statementDoc);
assert.ok(statementPdf.byteLength > 800, 'Updated Account Statement PDF must generate valid non-empty PDF bytes');

// 3. Payment Receipt PDF
const receiptDoc = generatePaymentReceiptDocument({
  role: 'consumer',
  actor: consumerActor,
  payment: INITIAL_PAYMENTS[0],
  bill: bill8821,
  connection: conn99231,
  allPayments: INITIAL_PAYMENTS,
  language: 'en',
  dataSource: 'DEMO',
  referenceDate: '05-Nov-2026'
});
assert.ok(receiptDoc.authorized, 'Payment Receipt document must be authorized');
const receiptPdf = generateOfficialDocumentPdfBytes(receiptDoc);
assert.ok(receiptPdf.byteLength > 800, 'Payment Receipt PDF must generate valid non-empty PDF bytes');

// 4. Monthly Electricity Consumption Report PDF
const consumptionReportDoc = generateConsumptionReportDocument({
  role: 'consumer',
  actor: consumerActor,
  connection: conn77190,
  consumptionSeries: commAnalytics.consumptionTrendSeries,
  language: 'en',
  dataSource: 'DEMO',
  referenceDate: '05-Nov-2026'
});
assert.ok(consumptionReportDoc.authorized, 'Consumption Report document must be authorized');
const consumptionPdf = generateOfficialDocumentPdfBytes(consumptionReportDoc);
assert.ok(consumptionPdf.byteLength > 800, 'Consumption Report PDF must generate valid non-empty PDF bytes');

// 5. Payment History Report PDF
const paymentHistoryDoc = generatePaymentHistoryReportDocument({
  role: 'consumer',
  actor: consumerActor,
  connection: conn99231,
  payments: INITIAL_PAYMENTS.filter((p) => p.consumerNo === '04281-99231'),
  language: 'en',
  dataSource: 'DEMO',
  referenceDate: '05-Nov-2026'
});
assert.ok(paymentHistoryDoc.authorized, 'Payment History Report document must be authorized');
const paymentHistoryPdf = generateOfficialDocumentPdfBytes(paymentHistoryDoc);
assert.ok(paymentHistoryPdf.byteLength > 800, 'Payment History Report PDF must generate valid non-empty PDF bytes');

// 6. Billing Review / Dispute Acknowledgment PDF
const complaintDoc = generateComplaintAcknowledgmentDocument({
  role: 'consumer',
  actor: consumerActor,
  complaint: INITIAL_COMPLAINTS[0],
  language: 'en',
  dataSource: 'DEMO'
});
assert.ok(complaintDoc.authorized, 'Complaint Acknowledgment document must be authorized');
const complaintPdf = generateOfficialDocumentPdfBytes(complaintDoc);
assert.ok(complaintPdf.byteLength > 800, 'Complaint Acknowledgment PDF must generate valid non-empty PDF bytes');

console.log('✓ Phase 4 passed: All 6 official billing & consumption PDF document generators verified.');
console.log('=== ALL MASTER STEP 3/3 AUTOMATED VERIFICATION CHECKS PASSED ===');
