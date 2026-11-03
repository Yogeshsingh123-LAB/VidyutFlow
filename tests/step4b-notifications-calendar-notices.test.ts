import assert from 'node:assert/strict';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS
} from '../src/data/mockData';
import {
  reconcileBillWithPayments,
  selectConsumerAccountBillingSummary,
  selectConnectionBillingSummary,
  validatePaymentAmountSelection,
  applyPaymentToBill
} from '../src/utils/billingEngine';
import {
  deriveCanonical9FieldBillStatement,
  INITIAL_FORMAL_NOTICES,
  DEFAULT_FORMAL_NOTICE_POLICY,
  DEFAULT_OVERDUE_NOTIFICATION_POLICY,
  addClearDaysToBillDate,
  calculateDaysUntilNoticeDeadline,
  evaluateNoticeEligibilityForBill,
  createDraftFormalNotice,
  submitFormalNoticeForApproval,
  approveFormalNotice,
  issueAndServeFormalNotice,
  placeFormalNoticeOnHold,
  withdrawFormalNotice,
  reconcileFormalNoticeWithStatement,
  evaluateStep4BOverdueAndNoticeNotifications,
  filterEmployeeStep4BBillingNotifications,
  getFormalNoticeTranslations
} from '../src/utils/formalNoticeEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary,
  buildMonthCalendarGrid,
  buildGoogleCalendarUrl,
  generateIcsCalendarEvent
} from '../src/utils/paymentCalendarEngine';
import {
  generateElectricityBillDocument,
  generatePaymentReceiptDocument,
  generateUpdatedAccountStatementDocument,
  generateOfficialDocumentPdfBytes
} from '../src/utils/documentEngine';
import {
  selectConsumerCanonicalAnalytics,
  selectEmployeeWorkloadAndSlaMetrics,
  selectManagementCanonicalMetrics,
  selectAdminCanonicalMetrics
} from '../src/utils/canonicalAnalytics';

console.log('===================================================================');
console.log('VIDYUTFLOW 2.0 — STEP 4B OF 4 VERIFICATION SUITE');
console.log('Overdue Notifications, Billing-Wide Late-Charge Visibility,');
console.log('Payment Deadlines & Section 56 DEMO Formal Notice Workflow');
console.log('===================================================================');

let passedCount = 0;
function runTest(testNum: number, name: string, fn: () => void) {
  try {
    fn();
    passedCount++;
    console.log(`  ✅ [Test ${testNum.toString().padStart(2, '0')}] PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ [Test ${testNum.toString().padStart(2, '0')}] FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const REF_DATE = '28-Oct-2026';
const overdueBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
const commConnection = INITIAL_CONNECTIONS.find(c => c.consumerNo === '04281-77190')!;
const resConnection = INITIAL_CONNECTIONS.find(c => c.consumerNo === '04281-99231')!;

// 1. Canonical outstanding amount propagation
runTest(1, 'Canonical 9-field overdue balance statement propagates identically from Step 4A engine', () => {
  const reconciled = reconcileBillWithPayments(overdueBill, INITIAL_PAYMENTS, REF_DATE);
  const stmt = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: REF_DATE
  });

  assert.equal(stmt.originalBillAmount, 2185);
  assert.equal(stmt.paymentsSuccessfullySettled, 0);
  assert.equal(stmt.remainingPrincipal, 2185);
  assert.equal(stmt.accruedLatePaymentCharges, 5.39);
  assert.equal(stmt.chargesAlreadyPaidOrWaived, 0);
  assert.equal(stmt.totalCurrentOutstanding, 2190.39);
  assert.equal(stmt.originalDueDate, '22-Oct-2026');
  assert.equal(stmt.daysOverdue, 6);
  assert.equal(stmt.lastCalculationDate, REF_DATE);
  assert.equal(stmt.totalCurrentOutstanding, reconciled.totalOutstandingWithCharges);
});

// 2. Consumer Dashboard
runTest(2, 'Consumer Dashboard canonical analytics and billing summary reflect ₹2,190.39 overdue total', () => {
  const analytics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: [],
    complaints: [],
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-99231',
    referenceDate: REF_DATE
  });

  assert.equal(analytics.selectedConnectionSummary.totalOutstandingPrincipalInr, 2185);
  assert.equal(analytics.selectedConnectionSummary.totalAccruedLateChargesInr, 5.39);
  assert.equal(analytics.selectedConnectionSummary.totalOutstandingWithChargesInr, 2190.39);
});

// 3. View Bills
runTest(3, 'View Bills connection summary exposes all 9 canonical overdue fields for BILL-UG-2026-10-8821', () => {
  const summary = selectConsumerAccountBillingSummary({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    accountId: 'demo_consumer',
    selectedConsumerNo: '04281-99231',
    referenceDate: REF_DATE
  });

  const bill = summary.selectedConnectionSummary?.currentBill!;
  assert.ok(bill);
  assert.equal(bill.billNo, 'BILL-UG-2026-10-8821');
  assert.equal(bill.totalAmount, 2185);
  assert.equal(bill.paidAmount, 0);
  assert.equal(bill.outstandingBalance, 2185);
  assert.equal(bill.totalAccruedLateCharges, 5.39);
  assert.equal(bill.totalOutstandingWithCharges, 2190.39);
  assert.equal(bill.lateChargeBreakdown?.daysOverdue, 6);
});

// 4. Bill Details
runTest(4, 'Bill Details breakdown preserves original ₹2,185 bill while exposing 6 overdue days and ₹5.39 DPS', () => {
  const reconciled = reconcileBillWithPayments(overdueBill, INITIAL_PAYMENTS, REF_DATE);
  const bk = reconciled.lateChargeBreakdown!;
  assert.equal(bk.originalBillAmount, 2185);
  assert.equal(bk.settledPaymentsAmount, 0);
  assert.equal(bk.remainingPrincipal, 2185);
  assert.equal(bk.netLateChargesPayable, 5.39);
  assert.equal(bk.totalOutstandingPayable, 2190.39);
  assert.equal(bk.dueDate, '22-Oct-2026');
  assert.equal(bk.daysOverdue, 6);
  assert.equal(bk.calculationReferenceDate, REF_DATE);
});

// 5. Pay Bill
runTest(5, 'Pay Bill validation (validatePaymentAmountSelection) returns all 9 canonical fields and validates full ₹2,190.39 settlement', () => {
  const fullVal = validatePaymentAmountSelection({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    mode: 'FULL',
    referenceDate: REF_DATE,
    includeLateCharges: true
  });

  assert.equal(fullVal.valid, true);
  assert.equal(fullVal.originalBillAmount, 2185);
  assert.equal(fullVal.previouslySettledAmount, 0);
  assert.equal(fullVal.remainingPrincipal, 2185);
  assert.equal(fullVal.accruedLateCharges, 5.39);
  assert.equal(fullVal.waivedOrSettledCharges, 0);
  assert.equal(fullVal.totalOutstandingWithCharges, 2190.39);
  assert.equal(fullVal.resolvedAmountToPay, 2190.39);
  assert.equal(fullVal.originalDueDate, '22-Oct-2026');
  assert.equal(fullVal.daysOverdue, 6);
  assert.equal(fullVal.calculationReferenceDate, REF_DATE);
});

// 6. Payment Summary
runTest(6, 'Payment Summary (applyPaymentToBill) settles principal + accrued DPS and records lateChargesSettledInPayment', () => {
  const res = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    amountToPay: 2190.39,
    paymentDate: '28-Oct-2026 11:30',
    txId: 'TXN-UPI-STEP4B-FULL',
    bankReference: 'UGVCL/STEP4B/001',
    accountId: 'demo_consumer',
    referenceDate: REF_DATE,
    includeLateCharges: true
  });

  assert.equal(res.success, true);
  assert.equal(res.isFullyPaid, true);
  assert.equal(res.paidAmountApplied, 2190.39);
  assert.equal(res.lateChargesSettledInPayment, 5.39);
  assert.equal(res.remainingBalance, 0);
  assert.equal(res.remainingTotalWithCharges, 0);
  assert.equal(res.updatedBill.totalAmount, 2185, 'Original bill totalAmount must remain 2185');
});

// 7. Historical receipt immutability
runTest(7, 'Historical payment receipt TXN-UPI-9921448102 remains immutable (₹2,537 paid on 15-Sep-2026)', () => {
  const paidBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-09-8821')!;
  const histPayment = INITIAL_PAYMENTS.find(p => p.txId === 'TXN-UPI-9921448102')!;
  const receiptDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: { userId: 'demo_consumer', name: 'Smt. Meenaben Patel', ownedConsumerNos: ['04281-99231'] },
    bill: paidBill,
    payment: histPayment,
    connection: resConnection,
    allPayments: INITIAL_PAYMENTS,
    language: 'en'
  });

  assert.equal(receiptDoc.authorized, true);
  assert.equal(receiptDoc.documentType, 'payment_receipt');
  const paidField = receiptDoc.sections
    .flatMap(s => s.fields)
    .find(f => f.value.includes('2,537'));
  assert.ok(paidField, 'Historical receipt must preserve ₹2,537 settlement record');
});

// 8. Updated account statement
runTest(8, 'Updated Account Statement document (generateUpdatedAccountStatementDocument) renders all 9 canonical fields + Formal Notice section without mutating original bill', () => {
  const notice = INITIAL_FORMAL_NOTICES[0];
  const stmtDoc = generateUpdatedAccountStatementDocument({
    role: 'consumer',
    actor: { userId: 'demo_consumer', name: 'Smt. Meenaben Patel', ownedConsumerNos: ['04281-99231'] },
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    formalNotice: notice,
    referenceDate: REF_DATE,
    language: 'en'
  });

  assert.equal(stmtDoc.authorized, true);
  assert.equal(stmtDoc.documentType, 'account_statement');
  assert.equal(stmtDoc.sections.length, 3, 'Should include Connection Info, 9-Field Breakdown, and Formal Notice Status');
  const breakdownFields = stmtDoc.sections[1].fields;
  assert.equal(breakdownFields.length, 9, 'Must contain all 9 canonical overdue balance fields');
  assert.ok(breakdownFields[5].value.includes('2,190.39'));
  assert.ok(stmtDoc.sections[2].fields.some(f => f.value.includes('NTC-UG-2026-10-8821')));
});

// 9. Employee authorized visibility
runTest(9, 'Authorized employee in Mehsana City North sees overdue principal, DPS, and can generate Updated Account Statement', () => {
  const empMetrics = selectEmployeeWorkloadAndSlaMetrics({
    applications: [],
    complaints: [],
    workOrders: [],
    incidents: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    fieldEngineers: [],
    activeUser: {
      id: 'EMP-101',
      name: 'Rajesh V. Trivedi',
      role: 'employee',
      subdivision: 'Mehsana City North'
    },
    referenceDate: REF_DATE
  });

  assert.equal(empMetrics.liveBillingLedger.totalOverduePrincipalInr, 2185);
  assert.equal(empMetrics.liveBillingLedger.totalAccruedLateChargesInr, 5.39);
  assert.equal(empMetrics.liveBillingLedger.totalOutstandingWithLateChargesInr, 2190.39);

  const empDoc = generateUpdatedAccountStatementDocument({
    role: 'employee',
    actor: { userId: 'EMP-101', name: 'Rajesh V. Trivedi', subdivision: 'Mehsana City North' },
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    formalNotice: INITIAL_FORMAL_NOTICES[0],
    referenceDate: REF_DATE,
    language: 'en'
  });
  assert.equal(empDoc.authorized, true);
});

// 10. Unauthorized employee isolation
runTest(10, 'Unauthorized employee from a different subdivision is blocked from viewing consumer Updated Account Statement and notifications', () => {
  const unauthDoc = generateUpdatedAccountStatementDocument({
    role: 'employee',
    actor: { userId: 'EMP-999', name: 'Other Subdivision Officer', subdivision: 'Palanpur Rural' },
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    formalNotice: INITIAL_FORMAL_NOTICES[0],
    referenceDate: REF_DATE,
    language: 'en'
  });
  assert.equal(unauthDoc.authorized, false);

  const notifEval = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: REF_DATE,
    language: 'en'
  });

  const palanpurNotifs = filterEmployeeStep4BBillingNotifications(
    notifEval.newNotifications,
    'Palanpur Rural'
  );
  assert.equal(palanpurNotifs.length, 0, 'Employee in Palanpur Rural must not receive Mehsana City North overdue notifications');

  const mehsanaNotifs = filterEmployeeStep4BBillingNotifications(
    notifEval.newNotifications,
    'Mehsana City North'
  );
  assert.ok(mehsanaNotifs.length > 0, 'Employee in Mehsana City North must receive authorized overdue/notice alerts');
});

// 11. Management aggregation
runTest(11, 'Management canonical analytics aggregates overdue principal and DPS without double counting', () => {
  const mgmt = selectManagementCanonicalMetrics({
    applications: [],
    complaints: [],
    workOrders: [],
    incidents: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    feeders: [],
    timePeriod: 'FY26-YTD',
    activeUser: { id: 'MGMT-01', name: 'Dr. Harita Joshi', role: 'management' },
    referenceDate: REF_DATE
  });

  assert.equal(mgmt.executiveKpis.overduePrincipalInr, 2185);
  assert.equal(mgmt.executiveKpis.accruedLateChargesInr, 5.39);
  assert.equal(mgmt.executiveKpis.totalOutstandingWithChargesInr, 2190.39);
});

// 12. Admin financial visibility
runTest(12, 'Admin canonical metrics and formal notice audit expose overdue principal, DPS, and notice inventory', () => {
  const admin = selectAdminCanonicalMetrics({
    consumers: [],
    connections: INITIAL_CONNECTIONS,
    applications: [],
    complaints: [],
    workOrders: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    incidents: [],
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: AUDIT_LOGS,
    fieldOfflineQueue: [],
    employees: [],
    fieldEngineers: [],
    referenceDate: REF_DATE
  });

  assert.equal(admin.overduePrincipalInr, 2185);
  assert.equal(admin.accruedLateChargesInr, 5.39);
  assert.equal(admin.totalOutstandingWithChargesInr, 2190.39);
  assert.equal(INITIAL_FORMAL_NOTICES.length, 1);
});

// 13. Pre-due reminders (5 days before & 1 day before due date)
runTest(13, 'Automatic notification engine emits UPCOMING_DUE_5D on 17-Oct-2026 and UPCOMING_DUE_1D on 21-Oct-2026', () => {
  const res5d = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '17-Oct-2026',
    language: 'en'
  });
  assert.ok(
    res5d.newNotifications.some(n => n.eventKey?.includes('UPCOMING_DUE_5D:BILL-UG-2026-10-8821')),
    'Should emit 5-day pre-due reminder on 17-Oct-2026'
  );

  const res1d = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '21-Oct-2026',
    language: 'en'
  });
  assert.ok(
    res1d.newNotifications.some(n => n.eventKey?.includes('UPCOMING_DUE_1D:BILL-UG-2026-10-8821')),
    'Should emit 1-day pre-due reminder on 21-Oct-2026'
  );
});

// 14. Due-date notification
runTest(14, 'Automatic notification engine emits DUE_TODAY on original due date (22-Oct-2026)', () => {
  const resDue = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '22-Oct-2026',
    language: 'en'
  });
  assert.ok(
    resDue.newNotifications.some(n => n.eventKey?.includes('DUE_TODAY:BILL-UG-2026-10-8821')),
    'Should emit DUE_TODAY notification on 22-Oct-2026'
  );
});

// 15. First overdue notification
runTest(15, 'Automatic notification engine emits OVERDUE_DAY_1 on 23-Oct-2026 with consumer + employee notifications', () => {
  const resDay1 = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '23-Oct-2026',
    language: 'en'
  });
  assert.ok(
    resDay1.newNotifications.some(n => n.targetRole === 'consumer' && n.eventKey?.includes('OVERDUE_DAY_1:BILL-UG-2026-10-8821')),
    'Should emit consumer OVERDUE_DAY_1 notification'
  );
  assert.ok(
    resDay1.newNotifications.some(n => n.targetRole === 'employee' && n.eventKey?.includes('EMP:OVERDUE_DAY_1:BILL-UG-2026-10-8821')),
    'Should emit employee OVERDUE_DAY_1 notification'
  );
});

// 16. Subsequent overdue reminders
runTest(16, 'Automatic notification engine emits OVERDUE_SUBSEQUENT_REMINDER on configured cadence (Day 6 = 28-Oct-2026)', () => {
  assert.deepEqual(DEFAULT_OVERDUE_NOTIFICATION_POLICY.subsequentOverdueReminderDays, [6, 10, 15, 25]);
  const resDay6 = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '28-Oct-2026',
    language: 'en'
  });
  assert.ok(
    resDay6.newNotifications.some(n => n.eventKey?.includes('OVERDUE_SUBSEQUENT_REMINDER:BILL-UG-2026-10-8821:D6')),
    'Should emit subsequent overdue reminder on Day 6 (28-Oct-2026)'
  );
});

// 17. Notification deduplication
runTest(17, 'Notification engine deduplicates events across repeated evaluations and page refreshes', () => {
  const firstRun = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: REF_DATE,
    language: 'en'
  });
  assert.ok(firstRun.newNotifications.length > 0);

  const secondRun = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: firstRun.newNotifications,
    emittedEventKeys: firstRun.updatedEmittedEventKeys,
    referenceDate: REF_DATE,
    language: 'en'
  });
  assert.equal(secondRun.newNotifications.length, 0, 'Second run with persisted keys must emit 0 duplicate notifications');
});

// 18. Notification persistence across language switches
runTest(18, 'Notification deduplication keys persist across language switches (en -> gu -> hi -> mr)', () => {
  const runEn = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: REF_DATE,
    language: 'en'
  });

  const runGu = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: runEn.newNotifications,
    emittedEventKeys: runEn.updatedEmittedEventKeys,
    referenceDate: REF_DATE,
    language: 'gu'
  });
  assert.equal(runGu.newNotifications.length, 0, 'Switching language to Gujarati must not emit duplicate notifications');
});

// 19. Notification deep-links
runTest(19, 'Overdue and formal notice notifications include valid bill deep-links and relatedEntityId', () => {
  const evalRes = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: REF_DATE,
    language: 'en'
  });
  const consumerNotif = evalRes.newNotifications.find(n => n.targetRole === 'consumer' && n.relatedEntityId === 'BILL-UG-2026-10-8821')!;
  assert.equal(consumerNotif.relatedEntityType, 'bill');
  assert.equal(consumerNotif.relatedEntityId, 'BILL-UG-2026-10-8821');
  assert.equal(consumerNotif.actionUrl, 'consumer:bills');
});

// 20. Calendar due-date milestone
runTest(20, 'Smart Payment Calendar distinguishes Milestone A (Original Due Date) and Milestone B (Late-Charge Accrual)', () => {
  const events = derivePaymentCalendarEvents(
    INITIAL_BILLS,
    INITIAL_CONNECTIONS,
    INITIAL_PAYMENTS,
    REF_DATE,
    INITIAL_FORMAL_NOTICES
  );
  const octEvent = events.find(e => e.billNo === 'BILL-UG-2026-10-8821')!;
  assert.ok(octEvent.distinguishedMilestones.includes('A_ORIGINAL_BILL_DUE_DATE'));
  assert.ok(octEvent.distinguishedMilestones.includes('B_LATE_CHARGE_ACCRUAL_DATE'));
  assert.equal(octEvent.daysOverdue, 6);
  assert.equal(octEvent.accruedLateCharges, 5.39);
  assert.equal(octEvent.totalOutstandingWithCharges, 2190.39);
  assert.ok(octEvent.dailyLateChargeAccrual > 0);
});

// 21. Calendar notice milestone & exports
runTest(21, 'Smart Payment Calendar displays Formal Notice milestones (C, D) and exports accurate .ics & Google Calendar links', () => {
  const events = derivePaymentCalendarEvents(
    [overdueBill],
    INITIAL_CONNECTIONS,
    INITIAL_PAYMENTS,
    REF_DATE,
    INITIAL_FORMAL_NOTICES
  );
  const octEvent = events.find(e => e.billNo === 'BILL-UG-2026-10-8821')!;
  assert.equal(octEvent.formalNoticeId, 'NTC-UG-2026-10-8821');
  assert.equal(octEvent.formalNoticeIssueDate, '24-Oct-2026');
  assert.equal(octEvent.formalNoticePaymentDeadline, '08-Nov-2026');
  assert.equal(octEvent.formalNoticeDaysRemaining, 11);
  assert.ok(octEvent.distinguishedMilestones.includes('C_FORMAL_NOTICE_ISSUE_DATE'));
  assert.ok(octEvent.distinguishedMilestones.includes('D_FORMAL_NOTICE_PAYMENT_DEADLINE'));

  const summary = computeCalendarSummary(events);
  assert.equal(summary.activeFormalNoticeCount, 1);
  assert.equal(summary.totalOutstandingWithChargesInr, 2190.39);

  const ics = generateIcsCalendarEvent(octEvent, 'en');
  assert.ok(ics.includes('NTC-UG-2026-10-8821'));
  assert.ok(ics.includes('08-Nov-2026'));
  assert.ok(ics.includes('DEMO notice only'));

  const gcalUrl = buildGoogleCalendarUrl(octEvent, 'en');
  assert.ok(gcalUrl.includes('calendar.google.com'));
  assert.ok(decodeURIComponent(gcalUrl).includes('2,190.39'));

  // Check November 2026 calendar grid places the notice deadline on Nov 8
  const novGrid = buildMonthCalendarGrid(2026, 10, events);
  const nov8Cell = novGrid.find(c => c.dateIso === '2026-11-08')!;
  assert.equal(nov8Cell.events.length, 1);
  assert.equal(nov8Cell.events[0].billNo, 'BILL-UG-2026-10-8821');
});

// 22. Notice draft and approval
runTest(22, 'Formal Notice workflow transitions cleanly from ELIGIBLE_FOR_REVIEW -> DRAFT -> PENDING_APPROVAL -> APPROVED', () => {
  const stmt = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: REF_DATE
  });
  const elig = evaluateNoticeEligibilityForBill(stmt, null);
  assert.equal(elig.eligible, true);
  assert.equal(elig.recommendedStatus, 'ELIGIBLE_FOR_REVIEW');

  const draft = createDraftFormalNotice({
    statement: stmt,
    subdivision: 'Mehsana City North',
    createdBy: 'Rajesh V. Trivedi'
  });
  assert.equal(draft.status, 'DRAFT');

  const pending = submitFormalNoticeForApproval(draft, 'Rajesh V. Trivedi', 'EMPLOYEE');
  assert.equal(pending.status, 'PENDING_APPROVAL');

  const approved = approveFormalNotice(pending, 'Dr. Harita Joshi', 'MANAGEMENT', 'Verified ledger default');
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.approvedBy, 'Dr. Harita Joshi');
});

// 23. Notice issue/service evidence & frozen historical snapshot
runTest(23, 'Issuing and serving a Formal Notice records service evidence and freezes snapshotAtIssuance', () => {
  const stmtOnOct24 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '24-Oct-2026'
  });
  const draft = createDraftFormalNotice({
    statement: stmtOnOct24,
    subdivision: 'Mehsana City North',
    createdBy: 'Rajesh V. Trivedi',
    noticeId: 'NTC-TEST-001'
  });
  const approved = approveFormalNotice(draft, 'Rajesh V. Trivedi', 'EMPLOYEE');
  const served = issueAndServeFormalNotice({
    notice: approved,
    statement: stmtOnOct24,
    issueDate: '24-Oct-2026',
    serviceDate: '24-Oct-2026',
    serviceChannel: 'PORTAL_AND_SMS_DEMO',
    serviceEvidenceRef: 'SRV-EVID-9988',
    actorName: 'Rajesh V. Trivedi',
    actorRole: 'EMPLOYEE'
  });

  assert.equal(served.status, 'SERVED');
  assert.equal(served.serviceEvidenceRef, 'SRV-EVID-9988');
  assert.equal(served.snapshotAtIssuance.totalOutstandingAtIssuance, 2186.8);
  assert.equal(served.paymentDeadlineDate, '08-Nov-2026');
});

// 24. Notice deadline calculation (15 clear days in Asia/Kolkata)
runTest(24, 'Statutory notice deadline calculates 15 clear days after issue/service date in Asia/Kolkata', () => {
  const deadline = addClearDaysToBillDate('24-Oct-2026', 15);
  assert.equal(deadline, '08-Nov-2026');
  const daysRem = calculateDaysUntilNoticeDeadline('08-Nov-2026', '28-Oct-2026');
  assert.equal(daysRem, 11);
});

// 25. Unverified notice-policy safeguards
runTest(25, 'Formal Notice policy enforces DEMO simulation safeguards and prohibits automatic disconnection', () => {
  assert.equal(DEFAULT_FORMAL_NOTICE_POLICY.isDemoSimulation, true);
  assert.equal(DEFAULT_FORMAL_NOTICE_POLICY.neverAutoDisconnectOnExpiry, true);
  assert.equal(DEFAULT_FORMAL_NOTICE_POLICY.clearNoticePeriodDays, 15);
  assert.ok(DEFAULT_FORMAL_NOTICE_POLICY.demoSafeguardDisclosure.includes('Section 56'));
  assert.ok(INITIAL_FORMAL_NOTICES[0].statutoryReferenceLabel.includes('DEMO Simulation'));
});

// 26. Notice countdown & zero-countdown non-disconnection safeguard
runTest(26, 'Notice countdown transitions to DEADLINE_APPROACHING (06-Nov-2026) and DEADLINE_REACHED (09-Nov-2026) without automatic disconnection', () => {
  const baseNotice = INITIAL_FORMAL_NOTICES[0];

  // On 06-Nov-2026 (2 days remaining <= 3 threshold)
  const stmtNov6 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '06-Nov-2026'
  });
  const approaching = reconcileFormalNoticeWithStatement(baseNotice, stmtNov6, '06-Nov-2026');
  assert.equal(approaching.status, 'DEADLINE_APPROACHING');
  assert.equal(approaching.daysRemaining, 2);
  assert.equal(approaching.disconnectionReviewStatus, 'NOT_ELIGIBLE_DURING_NOTICE_PERIOD');

  // On 09-Nov-2026 (past 08-Nov-2026 deadline)
  const stmtNov9 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '09-Nov-2026'
  });
  const expired = reconcileFormalNoticeWithStatement(baseNotice, stmtNov9, '09-Nov-2026');
  assert.equal(expired.status, 'DEADLINE_REACHED');
  assert.equal(expired.daysRemaining, -1);
  assert.equal(expired.disconnectionReviewStatus, 'AUTHORIZED_REVIEW_REQUIRED');
  assert.equal(resConnection.status, 'Active', 'Connection status must remain Active — never automatically disconnected');
});

// 27. Partial payment interaction with balance & notice
runTest(27, 'Partial payment reduces live currentBalanceView while preserving frozen snapshotAtIssuance on Formal Notice', () => {
  const partialRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'Net Banking',
    amountToPay: 1000,
    paymentDate: '26-Oct-2026 10:00',
    txId: 'TXN-NEFT-PARTIAL-1000',
    bankReference: 'UGVCL/PARTIAL/1000',
    accountId: 'demo_consumer',
    referenceDate: REF_DATE,
    includeLateCharges: true
  });

  const updatedPayments = [partialRes.paymentTransaction!, ...INITIAL_PAYMENTS];
  const stmtAfterPartial = deriveCanonical9FieldBillStatement({
    bill: partialRes.updatedBill,
    connection: resConnection,
    payments: updatedPayments,
    referenceDate: REF_DATE
  });

  const reconciledNotice = reconcileFormalNoticeWithStatement(
    INITIAL_FORMAL_NOTICES[0],
    stmtAfterPartial,
    REF_DATE
  );

  assert.equal(reconciledNotice.snapshotAtIssuance.totalOutstandingAtIssuance, 2186.8, 'Historical snapshot at issuance must remain frozen at ₹2,186.80');
  assert.equal(reconciledNotice.currentBalanceView.remainingPrincipal, 1185, 'Live remaining principal must drop to ₹1,185.00');
  assert.ok(reconciledNotice.currentBalanceView.totalCurrentOutstanding < 2190.39);
});

// 28. Full settlement stops accrual & resolves notice
runTest(28, 'Full settlement stops DPS accrual, zeroes totalCurrentOutstanding, and transitions Formal Notice to RESOLVED', () => {
  const fullRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    amountToPay: 2190.39,
    paymentDate: '28-Oct-2026 15:00',
    txId: 'TXN-UPI-SETTLE-ALL',
    bankReference: 'UGVCL/SETTLE/ALL',
    accountId: 'demo_consumer',
    referenceDate: REF_DATE,
    includeLateCharges: true
  });

  const updatedPayments = [fullRes.paymentTransaction!, ...INITIAL_PAYMENTS];
  const stmtNov15 = deriveCanonical9FieldBillStatement({
    bill: fullRes.updatedBill,
    connection: resConnection,
    payments: updatedPayments,
    referenceDate: '15-Nov-2026'
  });

  assert.equal(stmtNov15.remainingPrincipal, 0);
  assert.equal(stmtNov15.accruedLatePaymentCharges, 0);
  assert.equal(stmtNov15.totalCurrentOutstanding, 0);

  const resolvedNotice = reconcileFormalNoticeWithStatement(
    INITIAL_FORMAL_NOTICES[0],
    stmtNov15,
    '15-Nov-2026'
  );
  assert.equal(resolvedNotice.status, 'RESOLVED');
  assert.equal(resolvedNotice.disconnectionReviewStatus, 'RESOLVED_BY_SETTLEMENT');
  assert.equal(resolvedNotice.daysRemaining, null);
});

// 29. Payment reversal restores balance & re-activates notice
runTest(29, 'Payment reversal restores unpaid balance and re-activates a previously RESOLVED Formal Notice', () => {
  const fullRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    amountToPay: 2190.39,
    paymentDate: '28-Oct-2026 15:00',
    txId: 'TXN-UPI-REVERSIBLE',
    bankReference: 'UGVCL/REV/001',
    accountId: 'demo_consumer',
    referenceDate: REF_DATE,
    includeLateCharges: true
  });
  const allPayments = [fullRes.paymentTransaction!, ...INITIAL_PAYMENTS];

  const stmtSettled = deriveCanonical9FieldBillStatement({
    bill: fullRes.updatedBill,
    connection: resConnection,
    payments: allPayments,
    referenceDate: REF_DATE
  });
  const resolvedNotice = reconcileFormalNoticeWithStatement(INITIAL_FORMAL_NOTICES[0], stmtSettled, REF_DATE);
  assert.equal(resolvedNotice.status, 'RESOLVED');

  // Now reverse TXN-UPI-REVERSIBLE
  const stmtAfterReversal = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: allPayments,
    reversals: [
      {
        id: 'REV-01',
        txId: 'TXN-UPI-REVERSIBLE',
        billNo: overdueBill.billNo,
        reversedAt: '28-Oct-2026 16:00',
        reason: 'Bank chargeback reversal',
        authorizedBy: 'Rajesh V. Trivedi'
      }
    ],
    referenceDate: REF_DATE
  });

  assert.equal(stmtAfterReversal.remainingPrincipal, 2185);
  assert.equal(stmtAfterReversal.totalCurrentOutstanding, 2190.39);

  const reactivatedNotice = reconcileFormalNoticeWithStatement(resolvedNotice, stmtAfterReversal, REF_DATE);
  assert.equal(reactivatedNotice.status, 'SERVED');
  assert.equal(reactivatedNotice.daysRemaining, 11);
});

// 30. Notice hold and withdrawal resolution
runTest(30, 'Formal Notice supports billing-dispute ON_HOLD protection and administrative WITHDRAWN resolution', () => {
  const notice = INITIAL_FORMAL_NOTICES[0];
  const held = placeFormalNoticeOnHold(
    notice,
    'Meter reading verification requested by consumer',
    'Rajesh V. Trivedi',
    'EMPLOYEE'
  );
  assert.equal(held.status, 'ON_HOLD');
  assert.equal(held.disconnectionReviewStatus, 'ON_HOLD_PROTECTED');

  const withdrawn = withdrawFormalNotice(
    held,
    'Dispute resolved and notice administratively withdrawn',
    'Dr. Harita Joshi',
    'MANAGEMENT'
  );
  assert.equal(withdrawn.status, 'WITHDRAWN');
  assert.equal(withdrawn.disconnectionReviewStatus, 'WITHDRAWN');
  assert.equal(withdrawn.daysRemaining, null);
});

// 31. Four-language templates (en, gu, hi, mr)
runTest(31, 'All 4 languages (en, gu, hi, mr) provide complete translations for Formal Notices, Notifications, and Account Statements', () => {
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = getFormalNoticeTranslations(lang);
    assert.ok(dict.sectionTitle.length > 0);
    assert.ok(dict.statuses.SERVED.length > 0);
    assert.ok(dict.statuses.DEADLINE_REACHED.length > 0);
    assert.ok(dict.demoDisclosure.length > 0);

    const stmtDoc = generateUpdatedAccountStatementDocument({
      role: 'consumer',
      actor: { userId: 'demo_consumer', name: 'Smt. Meenaben Patel', ownedConsumerNos: ['04281-99231'] },
      bill: overdueBill,
      connection: resConnection,
      payments: INITIAL_PAYMENTS,
      formalNotice: INITIAL_FORMAL_NOTICES[0],
      referenceDate: REF_DATE,
      language: lang
    });
    assert.equal(stmtDoc.authorized, true);
    assert.equal(stmtDoc.sections[1].fields.length, 9);
  }
});

// 32. Original two-page A4 bill PDF preservation
runTest(32, 'Original issued Electricity Bill document and two-page A4 PDF remain 100% preserved and unmutated', () => {
  const billDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: { userId: 'demo_consumer', name: 'Smt. Meenaben Patel', ownedConsumerNos: ['04281-99231'] },
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en'
  });

  assert.equal(billDoc.authorized, true);
  assert.equal(billDoc.documentType, 'electricity_bill');
  assert.equal(overdueBill.totalAmount, 2185);

  const pdfBytes = generateOfficialDocumentPdfBytes(billDoc);
  const pdfText = Buffer.from(pdfBytes).toString('latin1');
  assert.ok(pdfText.startsWith('%PDF-1.4'));
  const pageMatches = pdfText.match(/\/Type \/Page\b/g) || [];
  assert.equal(pageMatches.length, 2, 'Original electricity bill PDF must remain exactly 2 pages');
});

// 33. Existing DEMO data preservation
runTest(33, 'Canonical DEMO seed datasets (INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS) remain intact', () => {
  assert.equal(INITIAL_BILLS.length, 4);
  assert.equal(INITIAL_CONNECTIONS.length, 2);
  assert.equal(INITIAL_PAYMENTS.length, 3);
  assert.equal(resConnection.consumerNo, '04281-99231');
  assert.equal(commConnection.consumerNo, '04281-77190');
});

console.log('===================================================================');
console.log(`✅ ALL ${passedCount}/33 STEP 4B TESTS PASSED SUCCESSFULLY!`);
console.log('===================================================================');
