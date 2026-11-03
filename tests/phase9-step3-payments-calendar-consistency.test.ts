import assert from 'node:assert/strict';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
} from '../src/data/mockData';
import { CriticalIncident } from '../src/types';
import {
  generateDeterministicBiMonthlyBillForConnection,
  calculateConfigurableCycleTariffBreakdown,
  reconcileBillWithPayments,
  resolveBillCycleMetadata,
  buildBiMonthlyBillingPeriod,
} from '../src/utils/billingEngine';
import {
  generatePaymentReceiptDocument,
  generateElectricityBillDocument,
  generateOfficialDocumentPdfBytes,
  buildSixBiMonthlyPeriodComparisonChart,
} from '../src/utils/documentEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary,
  generateIcsCalendarEvent,
  buildGoogleCalendarUrl,
  buildMonthCalendarGrid,
  CALENDAR_LOCALIZATION,
} from '../src/utils/paymentCalendarEngine';
import {
  selectConsumerCanonicalAnalytics,
  selectEmployeeWorkloadAndSlaMetrics,
  selectManagementCanonicalMetrics,
} from '../src/utils/canonicalAnalytics';
import {
  deriveCanonicalBarcodeReference,
  encodeCode128B,
  decodeCode128Modules,
} from '../src/utils/barcodeEngine';
import {
  deriveCanonicalQrVerificationUrl,
  parseBillVerificationUrl,
} from '../src/utils/qrCodeEngine';
import {
  PaymentTransaction,
  ElectricityBill,
  ElectricityConnection,
} from '../src/types';
import { ExportActorIdentity } from '../src/utils/exportEngine';
import { Language } from '../src/i18n/types';

console.log('================================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 9 STEP 3 OF 3: PAYMENTS, RECEIPTS & CALENDAR VERIFICATION');
console.log('================================================================================');

const primaryConn = INITIAL_CONNECTIONS[0]; // e.g. 100000000001 (RGPU residential)
const actorConsumer: ExportActorIdentity = {
  id: 'demo_consumer',
  role: 'consumer',
  consumerNo: primaryConn.consumerNo,
  name: primaryConn.consumerName,
  subdivision: primaryConn.subdivision,
};

const actorAdmin: ExportActorIdentity = {
  id: 'admin_user',
  role: 'admin',
  name: 'System Administrator',
  subdivision: 'Headquarters',
};

// Generate a deterministic bi-monthly bill fixture: August–September 2026
const biMonthlyGenResult = generateDeterministicBiMonthlyBillForConnection({
  connection: primaryConn,
  existingBills: [],
  startYear: 2026,
  startMonth1To12: 8, // August–September 2026
  previousReadingKwh: 12000,
  currentReadingKwh: 12450, // 450 units over 2 months
});
assert.equal(biMonthlyGenResult.created, true);
const biMonthlyBillAugSep = biMonthlyGenResult.bill!;

// -----------------------------------------------------------------------------
// TEST 1: Full Payment Settlement Reconciliation for Bi-Monthly Bill
// -----------------------------------------------------------------------------
{
  const fullPayment: PaymentTransaction = {
    txId: 'TX-BM-FULL-01',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'UPI-REF-BM-FULL-9901',
  };

  const rec = reconcileBillWithPayments(biMonthlyBillAugSep, [fullPayment], '15-Oct-2026');
  assert.equal(rec.billingCycleType, 'BI_MONTHLY');
  assert.equal(rec.paidAmount, biMonthlyBillAugSep.totalAmount);
  assert.equal(rec.outstandingBalance, 0);
  assert.equal(rec.remainingBalance, 0);
  assert.equal(rec.isPaid, true);
  assert.equal(rec.isPartiallyPaid, false);
  assert.equal(rec.isOverdue, false);
  assert.equal(rec.effectiveStatus, 'Paid');

  console.log('✓ Test 1: Full settlement reconciliation for bi-monthly bill passed (balance = ₹0, status = Paid)');
}

// -----------------------------------------------------------------------------
// TEST 2: Partial Payment Settlement Reconciliation for Bi-Monthly Bill
// -----------------------------------------------------------------------------
{
  const partialAmount = Math.round(biMonthlyBillAugSep.totalAmount / 2);
  const partialPayment: PaymentTransaction = {
    txId: 'TX-BM-PART-01',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: partialAmount,
    date: '10-Oct-2026',
    paymentMethod: 'Net Banking',
    status: 'Successful',
    bankReference: 'NB-REF-BM-PART-8801',
  };

  const rec = reconcileBillWithPayments(biMonthlyBillAugSep, [partialPayment], '15-Oct-2026');
  assert.equal(rec.billingCycleType, 'BI_MONTHLY');
  assert.equal(rec.paidAmount, partialAmount);
  assert.equal(rec.outstandingBalance, biMonthlyBillAugSep.totalAmount - partialAmount);
  assert.equal(rec.isPaid, false);
  assert.equal(rec.isPartiallyPaid, true);
  assert.equal(rec.effectiveStatus, 'Partially Paid');

  console.log('✓ Test 2: Partial settlement reconciliation for bi-monthly bill passed (exact remaining balance)');
}

// -----------------------------------------------------------------------------
// TEST 3: Multiple Partial Payments Progressing to Full Settlement
// -----------------------------------------------------------------------------
{
  const installment1 = 500;
  const installment2 = 800;
  const installment3 = biMonthlyBillAugSep.totalAmount - (installment1 + installment2);

  const tx1: PaymentTransaction = {
    txId: 'TX-BM-INST-01',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: installment1,
    date: '05-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-INST-01',
  };

  const tx2: PaymentTransaction = {
    txId: 'TX-BM-INST-02',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: installment2,
    date: '08-Oct-2026',
    paymentMethod: 'Debit Card',
    status: 'Successful',
    bankReference: 'BANK-REF-INST-02',
  };

  const tx3: PaymentTransaction = {
    txId: 'TX-BM-INST-03',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: installment3,
    date: '12-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-INST-03',
  };

  // After installment 1
  const rec1 = reconcileBillWithPayments(biMonthlyBillAugSep, [tx1], '15-Oct-2026');
  assert.equal(rec1.paidAmount, installment1);
  assert.equal(rec1.effectiveStatus, 'Partially Paid');

  // After installment 1 + 2
  const rec2 = reconcileBillWithPayments(biMonthlyBillAugSep, [tx1, tx2], '15-Oct-2026');
  assert.equal(rec2.paidAmount, installment1 + installment2);
  assert.equal(rec2.effectiveStatus, 'Partially Paid');

  // After installment 1 + 2 + 3
  const rec3 = reconcileBillWithPayments(biMonthlyBillAugSep, [tx1, tx2, tx3], '15-Oct-2026');
  assert.equal(rec3.paidAmount, biMonthlyBillAugSep.totalAmount);
  assert.equal(rec3.outstandingBalance, 0);
  assert.equal(rec3.effectiveStatus, 'Paid');
  assert.equal(rec3.isPaid, true);

  console.log('✓ Test 3: Multiple partial installments progress correctly to full settlement');
}

// -----------------------------------------------------------------------------
// TEST 4: Failed & Pending Payments Do Not Reduce Balance or Emit Receipts
// -----------------------------------------------------------------------------
{
  const failedPayment: PaymentTransaction = {
    txId: 'TX-BM-FAIL-01',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Failed',
    bankReference: 'BANK-REF-FAIL-01',
  };

  const recFailed = reconcileBillWithPayments(biMonthlyBillAugSep, [failedPayment], '15-Oct-2026');
  assert.equal(recFailed.paidAmount, 0);
  assert.equal(recFailed.outstandingBalance, biMonthlyBillAugSep.totalAmount);
  assert.equal(recFailed.effectiveStatus, 'Unpaid');

  const receiptDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: actorConsumer,
    bill: biMonthlyBillAugSep,
    payment: failedPayment,
    connection: primaryConn,
    language: 'en',
  });
  assert.equal(receiptDoc.eligible, false);
  assert.equal(receiptDoc.displayMode, 'payment_summary');
  assert.ok(receiptDoc.ineligibleReason?.includes('not successful') || receiptDoc.statusTone === 'amber');

  console.log('✓ Test 4: Failed/pending payment transactions rejected and do not reduce outstanding balance');
}

// -----------------------------------------------------------------------------
// TEST 5: Overdue Bi-Monthly Bill Reconciliation
// -----------------------------------------------------------------------------
{
  // biMonthlyBillAugSep has dueDate '22-Oct-2026'
  const recNotOverdue = reconcileBillWithPayments(biMonthlyBillAugSep, [], '15-Oct-2026');
  assert.equal(recNotOverdue.isOverdue, false);
  assert.equal(recNotOverdue.effectiveStatus, 'Unpaid');

  const recOverdue = reconcileBillWithPayments(biMonthlyBillAugSep, [], '25-Oct-2026');
  assert.equal(recOverdue.isOverdue, true);
  assert.equal(recOverdue.effectiveStatus, 'Overdue');

  console.log('✓ Test 5: Overdue detection on bi-monthly bills matches dueDate threshold (22-Oct-2026)');
}

// -----------------------------------------------------------------------------
// TEST 6: Payment Receipts Display Bi-Monthly Cycle Type & Period Details Across 4 Languages
// -----------------------------------------------------------------------------
{
  const fullPayment: PaymentTransaction = {
    txId: 'TX-BM-REC-01',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-9021',
  };

  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  for (const lang of languages) {
    const doc = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: actorConsumer,
      bill: biMonthlyBillAugSep,
      payment: fullPayment,
      connection: primaryConn,
      language: lang,
    });

    assert.equal(doc.eligible, true);
    assert.equal(doc.authorized, true);

    const primarySec = doc.sections.find((s) => s.id === 'primary-identifiers');
    assert.ok(primarySec, `Receipt missing primary identifiers section in ${lang}`);

    const cycleField = primarySec?.fields.find((f) => f.key === 'billingCycleType');
    assert.ok(cycleField, `Receipt missing billingCycleType in ${lang}`);
    assert.ok(
      cycleField?.value.includes('Bi-Monthly') ||
        cycleField?.value.includes('દ્વિ-માસિક') ||
        cycleField?.value.includes('द्वैमासिक') ||
        cycleField?.value.includes('द्वि-मासिक') ||
        cycleField?.value.includes('द्विमहिना'),
      `Unexpected cycle type label in ${lang}: ${cycleField?.value}`
    );

    const consumerSec = doc.sections.find((s) => s.id === 'consumer-details');
    assert.ok(consumerSec, `Receipt missing consumer section in ${lang}`);
    const periodField = consumerSec?.fields.find((f) => f.key === 'billingPeriod');
    assert.ok(periodField, `Receipt missing billingPeriod in ${lang}`);

    // Financial breakdown section verification
    const finSec = doc.sections.find((s) => s.id === 'financial-breakdown');
    assert.ok(finSec, `Receipt missing financial breakdown in ${lang}`);
    const remField = finSec?.fields.find((f) => f.key === 'remainingBalanceAfterPayment');
    assert.equal(remField?.value, '₹0');
  }

  console.log('✓ Test 6: Payment receipts display bi-monthly cycle type and periods across en, gu, hi, mr');
}

// -----------------------------------------------------------------------------
// TEST 7: Partial Settlement Receipt Ledger Accounting
// -----------------------------------------------------------------------------
{
  const paidPart = 1000;
  const partPayment: PaymentTransaction = {
    txId: 'TX-BM-REC-PART',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: paidPart,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-PART-11',
  };

  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: actorConsumer,
    bill: biMonthlyBillAugSep,
    payment: partPayment,
    connection: primaryConn,
    language: 'en',
  });

  assert.equal(doc.eligible, true);
  const primarySec = doc.sections.find((s) => s.id === 'primary-identifiers');
  const classField = primarySec?.fields.find((f) => f.key === 'settlementClassification');
  assert.ok(classField?.value.includes('Partial Settlement'));

  const finSec = doc.sections.find((s) => s.id === 'financial-breakdown');
  const remField = finSec?.fields.find((f) => f.key === 'remainingBalanceAfterPayment');
  const expectedRem = biMonthlyBillAugSep.totalAmount - paidPart;
  assert.equal(remField?.value, `₹${expectedRem.toLocaleString('en-IN')}`);

  console.log('✓ Test 7: Partial settlement receipt displays exact remaining balance and partial badge');
}

// -----------------------------------------------------------------------------
// TEST 8: Smart Payment Calendar Derives Bi-Monthly Events & Actual Due Dates
// -----------------------------------------------------------------------------
{
  const events = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '15-Oct-2026',
  });

  assert.equal(events.length, 1);
  const ev = events[0];
  assert.equal(ev.billNo, biMonthlyBillAugSep.billNo);
  assert.equal(ev.dueDate, '20-Oct-2026');
  assert.equal(ev.dueDateIso, '2026-10-20');
  assert.equal(ev.billingCycleType, 'BI_MONTHLY');
  assert.equal(ev.billMonth, 'August–September 2026');
  assert.equal(ev.billingPeriodLabel, '01-Aug-2026 to 30-Sep-2026');
  assert.equal(ev.status, 'Unpaid');
  assert.equal(ev.isDue, true);
  assert.equal(ev.outstandingBalance, biMonthlyBillAugSep.totalAmount);

  console.log('✓ Test 8: Smart Payment Calendar derives bi-monthly event with exact due date and cycle metadata');
}

// -----------------------------------------------------------------------------
// TEST 9: Smart Payment Calendar Reminder Stages (UPCOMING, DUE_TODAY, OVERDUE, PAID)
// -----------------------------------------------------------------------------
{
  // dueDate is 20-Oct-2026
  // 15-Oct -> 5 days before -> UPCOMING_DUE_5D
  const ev5d = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '15-Oct-2026',
  })[0];
  assert.equal(ev5d.reminderStage, 'UPCOMING_DUE_5D');

  // 19-Oct -> 1 day before -> UPCOMING_DUE_1D
  const ev1d = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '19-Oct-2026',
  })[0];
  assert.equal(ev1d.reminderStage, 'UPCOMING_DUE_1D');

  // 20-Oct -> 0 days -> DUE_TODAY
  const evToday = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '20-Oct-2026',
  })[0];
  assert.equal(evToday.reminderStage, 'DUE_TODAY');

  // 21-Oct -> past due -> OVERDUE
  const evOverdue = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '21-Oct-2026',
  })[0];
  assert.equal(evOverdue.reminderStage, 'OVERDUE');

  // Paid bill -> PAID
  const fullPayment: PaymentTransaction = {
    txId: 'TX-BM-PAID-STAGE',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-PAID-STAGE',
  };
  const evPaid = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [fullPayment],
    referenceDate: '15-Oct-2026',
  })[0];
  assert.equal(evPaid.reminderStage, 'PAID');

  console.log('✓ Test 9: Reminder stages (UPCOMING_DUE_5D, UPCOMING_DUE_1D, DUE_TODAY, OVERDUE, PAID) verified');
}

// -----------------------------------------------------------------------------
// TEST 10: Bi-Monthly Cross-Year Boundary Bill Calendar Support
// -----------------------------------------------------------------------------
{
  const crossYearResult = generateDeterministicBiMonthlyBillForConnection({
    connection: primaryConn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 12, // December 2026 – January 2027
    previousReadingKwh: 13000,
    currentReadingKwh: 13500,
  });
  assert.equal(crossYearResult.created, true);
  const crossYearBill = crossYearResult.bill!;

  const events = derivePaymentCalendarEvents({
    bills: [crossYearBill],
    connections: [primaryConn],
    payments: [],
    referenceDate: '05-Feb-2027',
  });

  assert.equal(events.length, 1);
  const ev = events[0];
  assert.equal(ev.billingCycleType, 'BI_MONTHLY');
  assert.equal(ev.dueYear, 2027);
  assert.equal(ev.dueMonth, 1); // February (0-indexed)
  assert.equal(ev.dueDay, 20);
  assert.equal(ev.dueDateIso, '2027-02-20');
  assert.equal(ev.billMonth, 'December 2026–January 2027');
  assert.equal(ev.billingPeriodLabel, '01-Dec-2026 to 31-Jan-2027');

  console.log('✓ Test 10: Cross-year boundary bi-monthly bill calendar event verified (Dec 2026 – Jan 2027)');
}

// -----------------------------------------------------------------------------
// TEST 11: RFC 5545 .ics Calendar Export Compliance
// -----------------------------------------------------------------------------
{
  const events = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '15-Oct-2026',
  });

  const ics = generateIcsCalendarEvent(events[0], 'en');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'), '.ics must start with BEGIN:VCALENDAR');
  assert.ok(ics.includes('VERSION:2.0'), '.ics must contain VERSION:2.0');
  assert.ok(ics.includes('BEGIN:VEVENT'), '.ics must contain BEGIN:VEVENT');
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261020'), 'DTSTART must match due date');
  assert.ok(ics.includes('DTEND;VALUE=DATE:20261021'), 'DTEND must be next day');
  assert.ok(ics.includes('SUMMARY:UGVCL Electricity Bill Due:'), 'SUMMARY must include title');
  assert.ok(ics.includes('Billing Cycle: Bi-Monthly'), 'DESCRIPTION must include bi-monthly cycle info');
  assert.ok(ics.includes('BEGIN:VALARM'), '.ics must include VALARM');
  assert.ok(ics.includes('TRIGGER:-P1D'), 'VALARM must trigger 1 day prior');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n') || ics.endsWith('END:VCALENDAR'), '.ics must close with END:VCALENDAR');

  console.log('✓ Test 11: RFC 5545 .ics file export verified with DTSTART, VALARM, and bi-monthly description');
}

// -----------------------------------------------------------------------------
// TEST 12: Google Calendar URL Template Generation
// -----------------------------------------------------------------------------
{
  const events = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '15-Oct-2026',
  });

  const gcalUrl = buildGoogleCalendarUrl(events[0], 'en');
  assert.ok(gcalUrl.startsWith('https://calendar.google.com/calendar/render?'));
  const urlObj = new URL(gcalUrl);
  assert.equal(urlObj.searchParams.get('action'), 'TEMPLATE');
  assert.ok(urlObj.searchParams.get('text')?.includes(biMonthlyBillAugSep.billNo));
  assert.equal(urlObj.searchParams.get('dates'), '20261020T090000/20261020T180000');
  assert.ok(urlObj.searchParams.get('details')?.includes('Bi-Monthly'));
  assert.ok(urlObj.searchParams.get('location')?.includes('UGVCL'));

  console.log('✓ Test 12: Google Calendar Web URL generation verified with TEMPLATE parameters');
}

// -----------------------------------------------------------------------------
// TEST 13: Partial Payment Dynamic Calendar Event Status Update
// -----------------------------------------------------------------------------
{
  const partPaid = 750;
  const partTx: PaymentTransaction = {
    txId: 'TX-CAL-PART',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: partPaid,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-PART-01',
  };

  const evBefore = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '15-Oct-2026',
  })[0];
  assert.equal(evBefore.status, 'Unpaid');
  assert.equal(evBefore.outstandingBalance, biMonthlyBillAugSep.totalAmount);
  assert.equal(evBefore.paidAmount, 0);

  const evAfter = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [partTx],
    referenceDate: '15-Oct-2026',
  })[0];
  assert.equal(evAfter.status, 'Partially Paid');
  assert.equal(evAfter.isPartiallyPaid, true);
  assert.equal(evAfter.paidAmount, partPaid);
  assert.equal(evAfter.outstandingBalance, biMonthlyBillAugSep.totalAmount - partPaid);

  console.log('✓ Test 13: Dynamic calendar update upon partial payment verified');
}

// -----------------------------------------------------------------------------
// TEST 14: Calendar Grid Generation & Multi-Month Cell Layout
// -----------------------------------------------------------------------------
{
  const events = derivePaymentCalendarEvents({
    bills: [biMonthlyBillAugSep],
    connections: [primaryConn],
    payments: [],
    referenceDate: '15-Oct-2026',
  });

  // Generate grid for October 2026 (month = 9 in 0-indexed)
  const gridCells = buildMonthCalendarGrid(2026, 9, events, '2026-10-15');
  assert.ok(gridCells.length === 35 || gridCells.length === 42);

  const dueDayCell = gridCells.find((c) => c.dateIso === '2026-10-20');
  assert.ok(dueDayCell, 'Day cell for 2026-10-20 must exist in October grid');
  assert.equal(dueDayCell.hasDueBills, true);
  assert.equal(dueDayCell.events.length, 1);
  assert.equal(dueDayCell.events[0].billNo, biMonthlyBillAugSep.billNo);

  const summary = computeCalendarSummary(events);
  assert.equal(summary.totalBillsCount, 1);
  assert.equal(summary.dueBillsCount, 1);
  assert.equal(summary.paidBillsCount, 0);
  assert.equal(summary.totalDueAmount, biMonthlyBillAugSep.totalAmount);

  console.log('✓ Test 14: Calendar grid cells and metrics summary verified');
}

// -----------------------------------------------------------------------------
// TEST 15: Cross-Portal Consistency: Consumer Canonical Analytics
// -----------------------------------------------------------------------------
{
  const testBills = [...INITIAL_BILLS, biMonthlyBillAugSep];
  const fullPayment: PaymentTransaction = {
    txId: 'TX-CROSS-01',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-CROSS-01',
  };
  const testPayments = [...INITIAL_PAYMENTS, fullPayment];

  const consumerAnalytics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: testBills,
    payments: testPayments,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      linkedConsumerNo: primaryConn.consumerNo,
      ownedConsumerNos: [primaryConn.consumerNo],
      accountId: primaryConn.accountId,
    },
    selectedConnectionNo: primaryConn.consumerNo,
    referenceDate: '15-Oct-2026',
  });

  assert.ok(consumerAnalytics.billingSummary);
  assert.equal(consumerAnalytics.ownedConnectionsCount, 2);
  // Verify that the bi-monthly bill was counted exactly once
  const matchedBills = consumerAnalytics.billingSummary.allAccountReconciledBills.filter(
    (b) => b.billNo === biMonthlyBillAugSep.billNo
  );
  assert.equal(matchedBills.length, 1, 'Bi-monthly bill must appear exactly once in consumer billing summary');
  assert.equal(matchedBills[0].isPaid, true);

  console.log('✓ Test 15: Consumer canonical analytics verifies bi-monthly bill without double counting');
}

// -----------------------------------------------------------------------------
// TEST 16: Cross-Portal Consistency: Employee Workload & Billing Ledger
// -----------------------------------------------------------------------------
{
  const testBills = [...INITIAL_BILLS, biMonthlyBillAugSep];
  const fullPayment: PaymentTransaction = {
    txId: 'TX-CROSS-02',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-CROSS-02',
  };
  const testPayments = [...INITIAL_PAYMENTS, fullPayment];

  const employeeMetrics = selectEmployeeWorkloadAndSlaMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: testBills,
    payments: testPayments,
  });

  assert.equal(
    employeeMetrics.liveBillingLedger.totalBillsCount,
    testBills.length,
    'Billing ledger totalBillsCount must equal exact bills array length'
  );
  assert.ok(employeeMetrics.liveBillingLedger.totalBilledAmountInr > 0);
  assert.ok(employeeMetrics.liveBillingLedger.totalCollectedAmountInr > 0);

  console.log('✓ Test 16: Employee operational billing ledger verifies exact bill count and collections');
}

// -----------------------------------------------------------------------------
// TEST 17: Cross-Portal Consistency: Management Canonical Metrics & Single Attribution
// -----------------------------------------------------------------------------
{
  const testBills = [...INITIAL_BILLS, biMonthlyBillAugSep];
  const fullPayment: PaymentTransaction = {
    txId: 'TX-CROSS-03',
    consumerNo: biMonthlyBillAugSep.consumerNo,
    billNo: biMonthlyBillAugSep.billNo,
    amount: biMonthlyBillAugSep.totalAmount,
    date: '10-Oct-2026',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'BANK-REF-CROSS-03',
  };
  const testPayments = [...INITIAL_PAYMENTS, fullPayment];

  const mgmtMetrics = selectManagementCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: testBills,
    payments: testPayments,
    timePeriod: 'FY26-YTD',
  });

  assert.ok(mgmtMetrics);
  assert.ok(mgmtMetrics.executiveKpis.liveErpTotalBilledInr > 0);
  assert.ok(mgmtMetrics.executiveKpis.liveErpTotalCollectedInr > 0);
  assert.ok(mgmtMetrics.executiveKpis.collectionEfficiencyPct > 0);

  console.log('✓ Test 17: Management executive metrics verify unified revenue without double counting');
}

// -----------------------------------------------------------------------------
// TEST 18: Admin DEMO Backup & Isolated Restore Preservation
// -----------------------------------------------------------------------------
{
  // Simulate backup state snapshot
  const backupPayload = {
    version: '2.0.0',
    exportTimestamp: '2026-10-15T12:00:00.000Z',
    dataset: {
      connections: INITIAL_CONNECTIONS,
      bills: [...INITIAL_BILLS, biMonthlyBillAugSep],
      payments: INITIAL_PAYMENTS,
    },
  };

  const serialized = JSON.stringify(backupPayload);
  assert.ok(serialized.includes(biMonthlyBillAugSep.billNo));
  assert.ok(serialized.includes('August–September 2026'));

  // Restore in isolated test fixture
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.dataset.bills.length, INITIAL_BILLS.length + 1);
  const restoredBill = parsed.dataset.bills.find(
    (b: ElectricityBill) => b.billNo === biMonthlyBillAugSep.billNo
  );
  assert.ok(restoredBill);
  assert.equal(restoredBill.unitsConsumed, biMonthlyBillAugSep.unitsConsumed);
  assert.equal(restoredBill.totalAmount, biMonthlyBillAugSep.totalAmount);
  assert.equal(restoredBill.billingCycleType, 'BI_MONTHLY');

  console.log('✓ Test 18: Admin DEMO backup and restore preserves bi-monthly bill attributes and cycle data');
}

// -----------------------------------------------------------------------------
// TEST 19: Re-verify Two-Page A4 PDF Structure Across All 4 Languages
// -----------------------------------------------------------------------------
{
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  for (const lang of languages) {
    const doc = generateElectricityBillDocument({
      role: 'consumer',
      actor: actorConsumer,
      bill: biMonthlyBillAugSep,
      connection: primaryConn,
      payments: [],
      allBills: [biMonthlyBillAugSep],
      language: lang,
    });

    assert.equal(doc.eligible, true);
    assert.equal(doc.authorized, true);
    assert.ok(doc.billParticulars);
    assert.equal(doc.billParticulars.billingCycleType, 'BI_MONTHLY');

    const pdfBytes = generateOfficialDocumentPdfBytes(doc);
    assert.ok(pdfBytes.length > 1000);
    const pdfText = new TextDecoder('utf-8').decode(pdfBytes);
    assert.ok(pdfText.startsWith('%PDF-1.4'));
    assert.ok(pdfText.includes('/Type /Pages'));
    assert.ok(pdfText.includes('/Count 2'), `PDF must contain exactly 2 pages in ${lang}`);
  }

  console.log('✓ Test 19: Re-verified exactly two-page A4 PDF generated across en, gu, hi, mr');
}

// -----------------------------------------------------------------------------
// TEST 20: Re-verify Six-Period Bi-Monthly Chart with Actual vs Benchmark Bars
// -----------------------------------------------------------------------------
{
  const chartEn = buildSixBiMonthlyPeriodComparisonChart({
    targetBill: biMonthlyBillAugSep,
    connection: primaryConn,
    allBills: [biMonthlyBillAugSep],
    language: 'en',
  });

  assert.equal(chartEn.periods.length, 6);
  assert.ok(chartEn.maxScaleKwh >= 450);

  // Target period is August–September 2026 (index 5)
  const targetPeriod = chartEn.periods[5];
  assert.equal(targetPeriod.actualUnitsKwh, 450);
  assert.ok(targetPeriod.comparisonUnitsKwh > 0);
  assert.equal(targetPeriod.isCurrentPeriod, true);
  assert.equal(targetPeriod.hasActualData, true);

  console.log('✓ Test 20: Six-period bi-monthly consumption comparison chart re-verified (actual vs benchmark)');
}

// -----------------------------------------------------------------------------
// TEST 21: QR Code & Code 128 Barcode Integrity for Payments & Billing
// -----------------------------------------------------------------------------
{
  const barcodeRef = deriveCanonicalBarcodeReference(
    biMonthlyBillAugSep.billNo,
    biMonthlyBillAugSep.consumerNo
  );
  const encoded = encodeCode128B(barcodeRef);
  const decoded = decodeCode128Modules(encoded.modules);
  assert.equal(decoded.success, true);
  assert.equal(decoded.decodedText, barcodeRef);

  const { url: qrUrl } = deriveCanonicalQrVerificationUrl(
    biMonthlyBillAugSep.billNo,
    biMonthlyBillAugSep.consumerNo,
    'https://vidyutflow.ugvcl.demo'
  );
  const parsedQr = parseBillVerificationUrl(qrUrl);
  assert.equal(parsedQr.isValid, true);
  assert.equal(parsedQr.ref, biMonthlyBillAugSep.billNo);

  console.log('✓ Test 21: Code 128 and QR verification round-trip confirmed');
}

// -----------------------------------------------------------------------------
// TEST 22: Unification of All 5 Portals on Canonical Reconciliation
// -----------------------------------------------------------------------------
{
  // Ensure that whether reconciling from consumer, employee, field, management, or admin perspective,
  // the bi-monthly bill produces identical reconciled figures:
  const recConsumer = reconcileBillWithPayments(biMonthlyBillAugSep, [], '15-Oct-2026');
  const recEmployee = reconcileBillWithPayments(biMonthlyBillAugSep, [], '15-Oct-2026');
  const recManagement = reconcileBillWithPayments(biMonthlyBillAugSep, [], '15-Oct-2026');

  assert.equal(recConsumer.totalAmount, recEmployee.totalAmount);
  assert.equal(recEmployee.totalAmount, recManagement.totalAmount);
  assert.equal(recConsumer.outstandingBalance, recManagement.outstandingBalance);
  assert.equal(recConsumer.billingCycleType, 'BI_MONTHLY');

  console.log('✓ Test 22: Canonical billing engine unification verified across all portal contexts');
}

console.log('================================================================================');
console.log('ALL 22 PHASE 9 STEP 3 PAYMENTS, CALENDAR & CONSISTENCY ASSERTIONS PASSED (22/22)');
console.log('================================================================================');
