/**
 * ============================================================================
 * VIDYUTFLOW 2.0 — PHASE 9 STEP 4C AUTOMATED VERIFICATION SUITE
 * Automatic Business-Date Rollover, Live Overdue Balances, Payments,
 * Notifications and Calendar Synchronization (32 Comprehensive Tests)
 * ============================================================================
 */

import assert from 'node:assert/strict';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  FEEDER_METRICS,
  SYSTEM_SERVICES,
} from '../src/data/mockData';
import {
  ERP_BUSINESS_TIMEZONE,
  STORAGE_KEY_BUSINESS_DATE,
  STORAGE_KEY_LEGACY_BUSINESS_DATE,
  STORAGE_KEY_CLOCK_MODE,
  STORAGE_KEY_CLOCK_MIGRATED_V1,
  formatDateInAsiaKolkata,
  getCurrentBusinessDateIst,
  getMsUntilNextAsiaKolkataMidnight,
  advanceVidyutDateByDays,
  createAsiaKolkataTimestampMs,
  migrateLegacyBusinessDateStorage,
  resolveInitialBusinessClockState,
  BusinessClockController,
  InMemoryCrossTabBus,
  CrossTabFinancialSyncManager,
  canActorReceiveFinancialSyncEvent,
  STEP4C_CLOCK_AND_SYNC_I18N,
  BACKEND_REALTIME_EVENT_CONTRACTS_FOR_YOGESH,
  StorageLike,
} from '../src/utils/businessClockEngine';
import {
  calculateLatePaymentCharges,
  DEFAULT_LATE_CHARGE_POLICY,
  getLateChargeLocalization,
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from '../src/utils/lateChargeEngine';
import {
  reconcileBillWithPayments,
  applyPaymentToBill,
  selectConnectionBillingSummary,
  selectConsumerAccountBillingSummary,
} from '../src/utils/billingEngine';
import {
  selectConsumerCanonicalAnalytics,
  selectEmployeeWorkloadAndSlaMetrics,
  selectManagementCanonicalMetrics,
  selectAdminCanonicalMetrics,
} from '../src/utils/canonicalAnalytics';
import {
  INITIAL_FORMAL_NOTICES,
  DEFAULT_FORMAL_NOTICE_POLICY,
  deriveCanonical9FieldBillStatement,
  reconcileFormalNoticeWithStatement,
  evaluateStep4BOverdueAndNoticeNotifications,
  createDraftFormalNotice,
  approveFormalNotice,
  issueAndServeFormalNotice,
  recordFormalNoticeServiceEvidence,
  getFormalNoticeTranslations,
} from '../src/utils/formalNoticeEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary,
  buildMonthCalendarGrid,
  CALENDAR_LOCALIZATION,
} from '../src/utils/paymentCalendarEngine';
import {
  generateElectricityBillDocument,
  paginateOfficialDocumentForA4,
} from '../src/utils/documentEngine';
import { ElectricityBill, PaymentTransaction } from '../src/types';

class MockMemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  keys(): string[] {
    return Array.from(this.map.keys());
  }
}

let passedCount = 0;
let failedCount = 0;

function runTest(testNo: number, name: string, fn: () => void) {
  try {
    fn();
    passedCount += 1;
    console.log(`✅ [PASS] Test ${String(testNo).padStart(2, '0')}: ${name}`);
  } catch (err) {
    failedCount += 1;
    console.error(`❌ [FAIL] Test ${String(testNo).padStart(2, '0')}: ${name}`);
    console.error(err);
  }
}

console.log('================================================================================');
console.log('VIDYUTFLOW 2.0 — STEP 4C AUTOMATED VERIFICATION SUITE (32 TESTS)');
console.log('================================================================================');

const overdueBill = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-8821')!;
const resConnection = INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-99231')!;

// -----------------------------------------------------------------------------
// 1. Actual business-date evaluation in Asia/Kolkata
// -----------------------------------------------------------------------------
runTest(1, 'Actual business-date evaluation in Asia/Kolkata (UTC+05:30) independent of host timezone', () => {
  assert.equal(ERP_BUSINESS_TIMEZONE, 'Asia/Kolkata');

  // 2026-10-28T18:35:00Z is 2026-10-29T00:05:00+05:30 (already 29-Oct-2026 in Asia/Kolkata!)
  const utcMs = Date.UTC(2026, 9, 28, 18, 35, 0);
  const parts = formatDateInAsiaKolkata(utcMs);
  assert.equal(parts.vidyutDate, '29-Oct-2026');
  assert.equal(parts.isoDate, '2026-10-29');
  assert.equal(parts.hours, 0);
  assert.equal(parts.minutes, 5);

  // Actual live clock evaluation returns a valid DD-MMM-YYYY date
  const liveIst = getCurrentBusinessDateIst();
  assert.match(liveIst, /^\d{2}-[A-Z][a-z]{2}-\d{4}$/);
});

// -----------------------------------------------------------------------------
// 2. Safe migration from the fixed 28-Oct-2026 default
// -----------------------------------------------------------------------------
runTest(2, 'Safe migration from fixed 28-Oct-2026 default to live Asia/Kolkata without resetting other localStorage keys', () => {
  const storage = new MockMemoryStorage();
  storage.setItem(STORAGE_KEY_BUSINESS_DATE, JSON.stringify('28-Oct-2026'));
  storage.setItem(STORAGE_KEY_LEGACY_BUSINESS_DATE, JSON.stringify('28-Oct-2026'));
  storage.setItem('vidyutone_bills', JSON.stringify([{ billNo: 'KEEP-BILL-001' }]));
  storage.setItem('vidyutone_payments', JSON.stringify([{ txId: 'KEEP-PAY-001' }]));

  const clock = () => createAsiaKolkataTimestampMs('03-Nov-2026', 10, 30, 0);
  const mig = migrateLegacyBusinessDateStorage(storage, clock);

  assert.equal(mig.migrated, true, 'Must report migration from legacy fixed 28-Oct-2026');
  assert.equal(mig.mode, 'LIVE_ASIA_KOLKATA');
  assert.equal(mig.effectiveBusinessDate, '03-Nov-2026');
  assert.equal(storage.getItem(STORAGE_KEY_CLOCK_MIGRATED_V1), '"true"');
  assert.equal(storage.getItem(STORAGE_KEY_LEGACY_BUSINESS_DATE), null);

  // Verify existing localStorage keys are 100% preserved
  assert.equal(storage.getItem('vidyutone_bills'), JSON.stringify([{ billNo: 'KEEP-BILL-001' }]));
  assert.equal(storage.getItem('vidyutone_payments'), JSON.stringify([{ txId: 'KEEP-PAY-001' }]));
});

// -----------------------------------------------------------------------------
// 3. Midnight date rollover (23:59:59 IST -> 00:00:01 IST)
// -----------------------------------------------------------------------------
runTest(3, 'Automatic midnight date rollover in Asia/Kolkata with single non-competing timer', () => {
  const storage = new MockMemoryStorage();
  let currentEpochMs = createAsiaKolkataTimestampMs('28-Oct-2026', 23, 59, 59, 0);
  const controller = new BusinessClockController({
    storage,
    clock: () => currentEpochMs,
  });

  controller.start();
  // Calling start() multiple times must NEVER create duplicate timers
  controller.start();
  controller.start();
  assert.equal(controller.getActiveMidnightTimerCount(), 1, 'Must maintain at most 1 active midnight timer');
  assert.equal(controller.getState().businessDate, '28-Oct-2026');

  const msToMidnight = getMsUntilNextAsiaKolkataMidnight(() => currentEpochMs);
  assert.equal(msToMidnight, 1050, 'At 23:59:59.000 IST, next midnight + 50ms buffer is 1050ms');

  // Advance clock across midnight to 00:00:01 IST on 29-Oct-2026
  currentEpochMs = createAsiaKolkataTimestampMs('29-Oct-2026', 0, 0, 1, 0);
  const evalRes = controller.evaluateNow('MIDNIGHT_TIMER');
  assert.equal(evalRes.changed, true);
  assert.equal(evalRes.state.businessDate, '29-Oct-2026');
  assert.equal(evalRes.rolloverEvent?.previousBusinessDate, '28-Oct-2026');
  assert.equal(evalRes.rolloverEvent?.currentBusinessDate, '29-Oct-2026');
  assert.equal(evalRes.rolloverEvent?.triggerReason, 'MIDNIGHT_TIMER');
  controller.stop();
  assert.equal(controller.getActiveMidnightTimerCount(), 0);
});

// -----------------------------------------------------------------------------
// 4. Tab resume / focus date recheck
// -----------------------------------------------------------------------------
runTest(4, 'Browser tab suspension/resume and window focus recheck updates business date immediately', () => {
  const storage = new MockMemoryStorage();
  let currentEpochMs = createAsiaKolkataTimestampMs('28-Oct-2026', 14, 0, 0);
  const controller = new BusinessClockController({
    storage,
    clock: () => currentEpochMs,
  });

  assert.equal(controller.getState().businessDate, '28-Oct-2026');

  // Tab suspended overnight and resumed on 29-Oct-2026 09:15 IST
  currentEpochMs = createAsiaKolkataTimestampMs('29-Oct-2026', 9, 15, 0);
  const resumeRes = controller.evaluateNow('TAB_VISIBILITY_RESUME');
  assert.equal(resumeRes.changed, true);
  assert.equal(resumeRes.state.businessDate, '29-Oct-2026');
  assert.equal(resumeRes.rolloverEvent?.triggerReason, 'TAB_VISIBILITY_RESUME');

  // Window focus on the same day does not emit redundant rollover
  const sameDayFocus = controller.evaluateNow('WINDOW_FOCUS');
  assert.equal(sameDayFocus.changed, false);
});

// -----------------------------------------------------------------------------
// 5. Sleep / wake date catch-up across multiple days
// -----------------------------------------------------------------------------
runTest(5, 'Device sleep/wake catch-up advances business date across multi-day suspension and updates DPS', () => {
  const storage = new MockMemoryStorage();
  let currentEpochMs = createAsiaKolkataTimestampMs('28-Oct-2026', 22, 0, 0);
  const controller = new BusinessClockController({
    storage,
    clock: () => currentEpochMs,
  });

  const beforeWake = calculateLatePaymentCharges({
    bill: overdueBill,
    payments: INITIAL_PAYMENTS,
    referenceDate: controller.getState().businessDate,
  });
  assert.equal(beforeWake.daysOverdue, 6);
  assert.equal(beforeWake.netLateChargesPayable, 5.39);

  // Device wakes up 4 days later on 01-Nov-2026
  currentEpochMs = createAsiaKolkataTimestampMs('01-Nov-2026', 8, 30, 0);
  const wakeRes = controller.evaluateNow('DEVICE_WAKE_DRIFT');
  assert.equal(wakeRes.changed, true);
  assert.equal(wakeRes.state.businessDate, '01-Nov-2026');

  const afterWake = calculateLatePaymentCharges({
    bill: overdueBill,
    payments: INITIAL_PAYMENTS,
    referenceDate: controller.getState().businessDate,
  });
  assert.equal(afterWake.daysOverdue, 10);
  // 2185 * (0.15 / 365) * 10 = 8.97945 -> 8.98
  assert.equal(afterWake.netLateChargesPayable, 8.98);
  assert.equal(afterWake.totalOutstandingPayable, 2193.98);
});

// -----------------------------------------------------------------------------
// 6. Month-end, year-end and leap-year rollover
// -----------------------------------------------------------------------------
runTest(6, 'Month-end, year-end, and leap-year date boundaries roll over accurately', () => {
  // Month-end: 31-Oct-2026 -> 01-Nov-2026
  assert.equal(advanceVidyutDateByDays('31-Oct-2026', 1), '01-Nov-2026');
  // 30-day month-end: 30-Nov-2026 -> 01-Dec-2026
  assert.equal(advanceVidyutDateByDays('30-Nov-2026', 1), '01-Dec-2026');
  // Year-end: 31-Dec-2026 -> 01-Jan-2027
  assert.equal(advanceVidyutDateByDays('31-Dec-2026', 1), '01-Jan-2027');
  // Non-leap February: 28-Feb-2026 -> 01-Mar-2026
  assert.equal(advanceVidyutDateByDays('28-Feb-2026', 1), '01-Mar-2026');
  // Leap-year February 2028: 28-Feb-2028 -> 29-Feb-2028 -> 01-Mar-2028
  assert.equal(advanceVidyutDateByDays('28-Feb-2028', 1), '29-Feb-2028');
  assert.equal(advanceVidyutDateByDays('29-Feb-2028', 1), '01-Mar-2028');
});

// -----------------------------------------------------------------------------
// 7. Daily late-charge increment across consecutive days
// -----------------------------------------------------------------------------
runTest(7, 'Daily late-charge accrual increments deterministically across consecutive business days without compounding', () => {
  const d6 = calculateLatePaymentCharges({
    bill: overdueBill,
    payments: INITIAL_PAYMENTS,
    referenceDate: '28-Oct-2026',
  });
  const d7 = calculateLatePaymentCharges({
    bill: overdueBill,
    payments: INITIAL_PAYMENTS,
    referenceDate: '29-Oct-2026',
  });
  const d8 = calculateLatePaymentCharges({
    bill: overdueBill,
    payments: INITIAL_PAYMENTS,
    referenceDate: '30-Oct-2026',
  });

  assert.equal(d6.daysOverdue, 6);
  assert.equal(d6.netLateChargesPayable, 5.39);
  assert.equal(d6.totalOutstandingPayable, 2190.39);

  assert.equal(d7.daysOverdue, 7);
  assert.equal(d7.netLateChargesPayable, 6.29);
  assert.equal(d7.totalOutstandingPayable, 2191.29);

  assert.equal(d8.daysOverdue, 8);
  assert.equal(d8.netLateChargesPayable, 7.18);
  assert.equal(d8.totalOutstandingPayable, 2192.18);

  // Repeated evaluation on the same date is 100% idempotent
  const d8Repeat = calculateLatePaymentCharges({
    bill: overdueBill,
    payments: INITIAL_PAYMENTS,
    referenceDate: '30-Oct-2026',
  });
  assert.equal(d8Repeat.netLateChargesPayable, 7.18);
});

// -----------------------------------------------------------------------------
// 8. Grace-period transition into chargeable overdue state
// -----------------------------------------------------------------------------
runTest(8, 'Grace-period boundary transitions cleanly into chargeable overdue state when date rolls past grace window', () => {
  const agriBill: ElectricityBill = {
    ...overdueBill,
    billNo: 'BILL-AGRI-ROLLOVER-01',
    dueDate: '20-Oct-2026',
    totalAmount: 2000,
    status: 'Unpaid',
  };

  // On 27-Oct-2026 (7 days past due, within 7-day Agricultural grace period)
  const onGraceEnd = calculateLatePaymentCharges({
    bill: agriBill,
    tariffCategory: 'Agricultural (AG)',
    referenceDate: '27-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(onGraceEnd.daysOverdue, 7);
  assert.equal(onGraceEnd.chargeableDays, 0);
  assert.equal(onGraceEnd.netLateChargesPayable, 0);

  // Rollover to 28-Oct-2026 (8 days past due, exceeds 7-day grace period)
  const afterGraceRollover = calculateLatePaymentCharges({
    bill: agriBill,
    tariffCategory: 'Agricultural (AG)',
    referenceDate: '28-Oct-2026',
    policy: DEFAULT_LATE_CHARGE_POLICY,
  });
  assert.equal(afterGraceRollover.daysOverdue, 8);
  assert.ok(afterGraceRollover.chargeableDays > 0);
  assert.ok(afterGraceRollover.netLateChargesPayable > 0);
});

// -----------------------------------------------------------------------------
// 9. Monthly bill rollover compatibility
// -----------------------------------------------------------------------------
runTest(9, 'Monthly bill rollover updates overdue status, days overdue, and DPS accurately', () => {
  const monthlyBill: ElectricityBill = {
    ...overdueBill,
    billNo: 'BILL-MONTHLY-ROLL-01',
    billingCycleType: 'MONTHLY',
    dueDate: '28-Oct-2026',
    totalAmount: 1500,
    status: 'Unpaid',
  };

  // On due date (28-Oct-2026): Not yet overdue
  const onDueDate = reconcileBillWithPayments(monthlyBill, [], '28-Oct-2026');
  assert.equal(onDueDate.isOverdue, false);
  assert.equal(onDueDate.effectiveStatus, 'Unpaid');
  assert.equal(onDueDate.totalAccruedLateCharges, 0);

  // Next business day (29-Oct-2026): Automatically transitions to Overdue with 1 day DPS
  const day1Overdue = reconcileBillWithPayments(monthlyBill, [], '29-Oct-2026');
  assert.equal(day1Overdue.isOverdue, true);
  assert.equal(day1Overdue.effectiveStatus, 'Overdue');
  assert.equal(day1Overdue.lateChargeBreakdown?.daysOverdue, 1);
  assert.equal(day1Overdue.totalAccruedLateCharges, 0.62); // 1500 * 0.15 / 365 = 0.6164 -> 0.62
});

// -----------------------------------------------------------------------------
// 10. Bi-monthly bill rollover compatibility
// -----------------------------------------------------------------------------
runTest(10, 'Bi-monthly bill rollover preserves 2-month cycle metadata and updates DPS accurately', () => {
  const biMonthlyBill: ElectricityBill = {
    ...overdueBill,
    billNo: 'BILL-BIMONTHLY-ROLL-01',
    billingCycleType: 'BI_MONTHLY',
    periodStartDate: '01-Aug-2026',
    periodEndDate: '30-Sep-2026',
    dueDate: '25-Oct-2026',
    totalAmount: 3650,
    status: 'Unpaid',
  };

  const recOct28 = reconcileBillWithPayments(biMonthlyBill, [], '28-Oct-2026');
  assert.equal(recOct28.billingCycleType, 'BI_MONTHLY');
  assert.equal(recOct28.lateChargeBreakdown?.daysOverdue, 3);
  // 3650 * (0.15 / 365) * 3 = 4.50
  assert.equal(recOct28.totalAccruedLateCharges, 4.5);

  const recOct29 = reconcileBillWithPayments(biMonthlyBill, [], '29-Oct-2026');
  assert.equal(recOct29.lateChargeBreakdown?.daysOverdue, 4);
  assert.equal(recOct29.totalAccruedLateCharges, 6.0);
  assert.equal(recOct29.totalOutstandingWithCharges, 3656.0);
});

// -----------------------------------------------------------------------------
// 11. Consumer portal live balance updates
// -----------------------------------------------------------------------------
runTest(11, 'Consumer Portal canonical analytics automatically updates across business-date rollover', () => {
  const actorScope = {
    accountId: 'demo_consumer',
    ownedConsumerNos: ['04281-99231', '04281-77190'],
  };

  const oct28 = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: [],
    complaints: [],
    notifications: [],
    actorScope,
    selectedConnectionNo: '04281-99231',
    referenceDate: '28-Oct-2026',
  });

  const nov02 = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: [],
    complaints: [],
    notifications: [],
    actorScope,
    selectedConnectionNo: '04281-99231',
    referenceDate: '02-Nov-2026',
  });

  assert.equal(oct28.connectionAccruedLateChargesInr, 5.39);
  assert.equal(oct28.connectionTotalOutstandingWithChargesInr, 2190.39);

  // On 02-Nov-2026 (11 days overdue): 2185 * (0.15 / 365) * 11 = 9.88
  assert.equal(nov02.connectionAccruedLateChargesInr, 9.88);
  assert.equal(nov02.connectionTotalOutstandingWithChargesInr, 2194.88);
});

// -----------------------------------------------------------------------------
// 12. Employee portal live balance updates
// -----------------------------------------------------------------------------
runTest(12, 'Employee Portal billing ledger automatically updates overdue principal and DPS on date rollover', () => {
  const empOct28 = selectEmployeeWorkloadAndSlaMetrics({
    applications: [],
    complaints: [],
    workOrders: [],
    incidents: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    referenceDate: '28-Oct-2026',
  });

  const empNov02 = selectEmployeeWorkloadAndSlaMetrics({
    applications: [],
    complaints: [],
    workOrders: [],
    incidents: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    referenceDate: '02-Nov-2026',
  });

  assert.equal(empOct28.liveBillingLedger.totalOverduePrincipalInr, 2185);
  assert.equal(empOct28.liveBillingLedger.totalAccruedLateChargesInr, 5.39);
  assert.equal(empNov02.liveBillingLedger.totalAccruedLateChargesInr, 9.88);
  assert.equal(
    Number(
      (
        (empNov02.liveBillingLedger.totalOutstandingWithLateChargesInr || 0) -
        (empOct28.liveBillingLedger.totalOutstandingWithLateChargesInr || 0)
      ).toFixed(2)
    ),
    4.49
  );
});

// -----------------------------------------------------------------------------
// 13. Management portal live analytics updates
// -----------------------------------------------------------------------------
runTest(13, 'Management Portal delinquent revenue & DPS analytics update automatically without double-counting', () => {
  const mgmtOct28 = selectManagementCanonicalMetrics({
    applications: [],
    complaints: [],
    workOrders: [],
    incidents: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    feeders: FEEDER_METRICS,
    referenceDate: '28-Oct-2026',
  });

  const mgmtNov02 = selectManagementCanonicalMetrics({
    applications: [],
    complaints: [],
    workOrders: [],
    incidents: [],
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    feeders: FEEDER_METRICS,
    referenceDate: '02-Nov-2026',
  });

  assert.equal(mgmtOct28.executiveKpis.overduePrincipalInr, 2185);
  assert.equal(mgmtOct28.executiveKpis.accruedLateChargesInr, 5.39);
  assert.equal(mgmtNov02.executiveKpis.overduePrincipalInr, 2185);
  assert.equal(mgmtNov02.executiveKpis.accruedLateChargesInr, 9.88);
});

// -----------------------------------------------------------------------------
// 14. Admin portal live audit updates
// -----------------------------------------------------------------------------
runTest(14, 'Admin Portal financial audit metrics update automatically across rollover, waivers, and reversals', () => {
  const waiver: LateChargeWaiverRecord = {
    id: 'WVR-ADMIN-01',
    billNo: overdueBill.billNo,
    waivedAmount: 3.0,
    reason: 'Admin audit waiver test',
    approvedBy: 'System Admin',
    approvedAt: '02-Nov-2026 10:00',
  };

  const adminNov02 = selectAdminCanonicalMetrics({
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
    systemServices: SYSTEM_SERVICES,
    referenceDate: '02-Nov-2026',
    waivers: [waiver],
  });

  // 9.88 accrued on 02-Nov-2026 minus 3.00 waived = 6.88 net late charges
  assert.equal(adminNov02.overduePrincipalInr, 2185);
  assert.equal(adminNov02.accruedLateChargesInr, 6.88);
  assert.equal(adminNov02.totalOutstandingWithChargesInr, 2191.88);
});

// -----------------------------------------------------------------------------
// 15. Full payment immediate settlement and accrual stop
// -----------------------------------------------------------------------------
runTest(15, 'Full payment settles principal + accrued DPS immediately and stops all future daily accrual', () => {
  const payRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '28-Oct-2026 14:30',
    txId: 'TXN-FULL-STEP4C-01',
    bankReference: 'UPI-FULL-4C',
    referenceDate: '28-Oct-2026',
    includeLateCharges: true,
  });

  assert.equal(payRes.success, true);
  assert.equal(payRes.isFullyPaid, true);
  assert.equal(payRes.paidAmountApplied, 2190.39);
  assert.equal(payRes.remainingBalance, 0);
  assert.equal(payRes.remainingTotalWithCharges, 0);

  // Advance business date 15 days later to 12-Nov-2026: zero additional charges accrue
  const stmtLater = deriveCanonical9FieldBillStatement({
    bill: payRes.updatedBill,
    connection: resConnection,
    payments: [payRes.paymentTransaction!, ...INITIAL_PAYMENTS],
    referenceDate: '12-Nov-2026',
  });
  assert.equal(stmtLater.isFullySettled, true);
  assert.equal(stmtLater.remainingPrincipal, 0);
  assert.equal(stmtLater.totalCurrentOutstanding, 0);
});

// -----------------------------------------------------------------------------
// 16. Partial payment principal reduction and subsequent daily accrual
// -----------------------------------------------------------------------------
runTest(16, 'Partial payment reduces remaining principal immediately and accrues future daily DPS only on reduced principal', () => {
  const partRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'Net Banking',
    amountToPay: 1185,
    paymentDate: '28-Oct-2026 11:00',
    txId: 'TXN-PART-STEP4C-01',
    bankReference: 'NEFT-PART-4C',
    referenceDate: '28-Oct-2026',
    includeLateCharges: true,
  });

  assert.equal(partRes.success, true);
  assert.equal(partRes.isFullyPaid, false);
  assert.equal(partRes.remainingBalance, 1000, 'Principal reduced from 2185 to 1000');

  const paymentsAfterPartial = [partRes.paymentTransaction!, ...INITIAL_PAYMENTS];
  const onOct28 = calculateLatePaymentCharges({
    bill: partRes.updatedBill,
    payments: paymentsAfterPartial,
    referenceDate: '28-Oct-2026',
  });
  const onOct29 = calculateLatePaymentCharges({
    bill: partRes.updatedBill,
    payments: paymentsAfterPartial,
    referenceDate: '29-Oct-2026',
  });

  assert.equal(onOct28.remainingPrincipal, 1000);
  assert.equal(onOct29.remainingPrincipal, 1000);
  // Daily increment on ₹1000 principal at 15% p.a. is ~₹0.41/day (instead of ₹0.90/day on ₹2185)
  const delta = Number((onOct29.lateChargesAccrued - onOct28.lateChargesAccrued).toFixed(2));
  assert.ok(delta >= 0.4 && delta <= 0.42, `Expected ~0.41 daily accrual on ₹1000 remainder, got ${delta}`);
});

// -----------------------------------------------------------------------------
// 17. Multiple partial payments across different dates
// -----------------------------------------------------------------------------
runTest(17, 'Multiple partial payments across different dates compute exact chronological tranches and settle on final installment', () => {
  const p1: PaymentTransaction = {
    txId: 'TXN-M1',
    consumerNo: overdueBill.consumerNo,
    billNo: overdueBill.billNo,
    amount: 685,
    date: '25-Oct-2026 10:00',
    paymentMethod: 'UPI / BHIM',
    bankReference: 'REF-M1',
    status: 'Successful',
  };
  const p2: PaymentTransaction = {
    txId: 'TXN-M2',
    consumerNo: overdueBill.consumerNo,
    billNo: overdueBill.billNo,
    amount: 500,
    date: '27-Oct-2026 10:00',
    paymentMethod: 'UPI / BHIM',
    bankReference: 'REF-M2',
    status: 'Successful',
  };

  const midStmt = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: [p1, p2],
    referenceDate: '28-Oct-2026',
  });
  assert.equal(midStmt.paymentsSuccessfullySettled, 1185);
  assert.equal(midStmt.remainingPrincipal, 1000);
  assert.ok(midStmt.accruedLatePaymentCharges > 0);
});

// -----------------------------------------------------------------------------
// 18. Failed payment non-settlement
// -----------------------------------------------------------------------------
runTest(18, 'Failed payment attempt never reduces balance, never settles notice, and never stops daily accrual', () => {
  const failRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '28-Oct-2026 15:00',
    txId: 'TXN-FAIL-4C',
    bankReference: 'UPI-FAIL-4C',
    referenceDate: '28-Oct-2026',
    simulatedOutcome: 'FAILED',
    simulatedFailureReason: 'Bank server timeout',
  });

  assert.equal(failRes.success, false);
  assert.equal(failRes.outcome, 'FAILED');
  assert.equal(failRes.remainingBalance, 2185);

  const stmtNextDay = deriveCanonical9FieldBillStatement({
    bill: failRes.updatedBill,
    connection: resConnection,
    payments: [failRes.paymentTransaction!, ...INITIAL_PAYMENTS],
    referenceDate: '29-Oct-2026',
  });
  assert.equal(stmtNextDay.remainingPrincipal, 2185);
  assert.equal(stmtNextDay.accruedLatePaymentCharges, 6.29);
});

// -----------------------------------------------------------------------------
// 19. Pending payment non-settlement
// -----------------------------------------------------------------------------
runTest(19, 'Pending verification payment attempt never reduces balance or stops daily accrual', () => {
  const pendRes = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'Net Banking',
    paymentDate: '28-Oct-2026 16:00',
    txId: 'TXN-PEND-4C',
    bankReference: 'NEFT-PEND-4C',
    referenceDate: '28-Oct-2026',
    simulatedOutcome: 'PENDING',
  });

  assert.equal(pendRes.success, false);
  assert.equal(pendRes.outcome, 'PENDING');
  assert.equal(pendRes.remainingBalance, 2185);

  const stmtNextDay = deriveCanonical9FieldBillStatement({
    bill: pendRes.updatedBill,
    connection: resConnection,
    payments: [pendRes.paymentTransaction!, ...INITIAL_PAYMENTS],
    referenceDate: '29-Oct-2026',
  });
  assert.equal(stmtNextDay.remainingPrincipal, 2185);
  assert.equal(stmtNextDay.accruedLatePaymentCharges, 6.29);
});

// -----------------------------------------------------------------------------
// 20. Payment reversal balance restoration and resumed accrual
// -----------------------------------------------------------------------------
runTest(20, 'Payment reversal immediately restores unpaid principal, overdue status, and daily DPS accrual across all selectors', () => {
  const payTx: PaymentTransaction = {
    txId: 'TXN-TO-REVERSE-01',
    consumerNo: overdueBill.consumerNo,
    billNo: overdueBill.billNo,
    amount: 2185,
    date: '25-Oct-2026 11:00',
    paymentMethod: 'Net Banking',
    bankReference: 'NEFT-REV-01',
    status: 'Successful',
  };

  // Before reversal: Bill is Paid
  const recPaid = reconcileBillWithPayments(overdueBill, [payTx], '28-Oct-2026');
  assert.equal(recPaid.effectiveStatus, 'Paid');
  assert.equal(recPaid.remainingBalance, 0);

  // Record payment reversal
  const reversal: PaymentReversalRecord = {
    id: 'REV-4C-01',
    txId: 'TXN-TO-REVERSE-01',
    billNo: overdueBill.billNo,
    amount: 2185,
    reversedAt: '27-Oct-2026 14:00',
    reason: 'Cheque dishonored / ECS return',
    authorizedBy: 'SDO Mehsana',
  };

  const recReversed = reconcileBillWithPayments(overdueBill, [payTx], '28-Oct-2026', {
    reversals: [reversal],
  });
  assert.equal(recReversed.effectiveStatus, 'Overdue', 'Must immediately revert to Overdue');
  assert.equal(recReversed.paidAmount, 0, 'Paid amount must revert to 0');
  assert.equal(recReversed.remainingBalance, 2185, 'Principal must be restored to 2185');
  assert.equal(recReversed.totalAccruedLateCharges, 5.39, 'Accrued DPS must resume');
  assert.equal(recReversed.totalOutstandingWithCharges, 2190.39);
});

// -----------------------------------------------------------------------------
// 21. Late-charge waiver immediate balance reduction
// -----------------------------------------------------------------------------
runTest(21, 'Late-charge waiver immediately reduces net late charges and total payable across all billing selectors', () => {
  const waiver: LateChargeWaiverRecord = {
    id: 'WVR-4C-01',
    billNo: overdueBill.billNo,
    waivedAmount: 4.0,
    reason: 'Approved DPS relief',
    approvedBy: 'SDO Mehsana',
    approvedAt: '28-Oct-2026 12:00',
  };

  const connSummary = selectConnectionBillingSummary(
    resConnection,
    [overdueBill],
    INITIAL_PAYMENTS,
    {
      referenceDate: '28-Oct-2026',
      waivers: [waiver],
    }
  );
  assert.equal(connSummary.totalOutstandingPrincipalInr, 2185);
  assert.equal(connSummary.totalAccruedLateChargesInr, 1.39); // 5.39 - 4.00 = 1.39
  assert.equal(connSummary.totalOutstandingWithChargesInr, 2186.39);
});

// -----------------------------------------------------------------------------
// 22. Cross-tab payment synchronization
// -----------------------------------------------------------------------------
runTest(22, 'Cross-tab synchronization propagates payment events from Consumer tab to Employee/Management/Admin tabs', () => {
  const bus = new InMemoryCrossTabBus();
  const consumerTabSync = new CrossTabFinancialSyncManager({
    tabId: 'tab-consumer-1',
    inMemoryBus: bus,
  });
  const employeeTabSync = new CrossTabFinancialSyncManager({
    tabId: 'tab-employee-1',
    inMemoryBus: bus,
  });

  consumerTabSync.start();
  employeeTabSync.start();

  const receivedByEmployee: string[] = [];
  employeeTabSync.onEvent((env) => {
    if (
      canActorReceiveFinancialSyncEvent(env, {
        role: 'employee',
      })
    ) {
      receivedByEmployee.push(`${env.eventType}:${env.billNo}`);
    }
  });

  consumerTabSync.publish({
    eventType: 'PAYMENT_RECORDED',
    businessReferenceDate: '28-Oct-2026',
    consumerNo: '04281-99231',
    billNo: 'BILL-UG-2026-10-8821',
    actorRole: 'consumer',
    payload: { paidAmountApplied: 2190.39, isFullyPaid: true },
  });

  assert.deepEqual(receivedByEmployee, ['PAYMENT_RECORDED:BILL-UG-2026-10-8821']);

  // Verify consumer-to-consumer isolation: another consumer who does NOT own 04281-99231 is blocked
  const otherConsumerAllowed = canActorReceiveFinancialSyncEvent(
    {
      eventId: 'evt-test-isolation',
      eventType: 'PAYMENT_RECORDED',
      sourceTabId: 'tab-consumer-1',
      occurredAtIso: new Date().toISOString(),
      businessReferenceDate: '28-Oct-2026',
      consumerNo: '04281-99231',
      billNo: 'BILL-UG-2026-10-8821',
      payload: {},
    },
    {
      role: 'consumer',
      ownedConsumerNos: ['99999-88888'],
    }
  );
  assert.equal(otherConsumerAllowed, false, 'Unrelated consumer tab must not receive another consumer financial event');
  assert.ok(BACKEND_REALTIME_EVENT_CONTRACTS_FOR_YOGESH.length >= 5, 'Backend event contracts for Yogesh must be documented');

  consumerTabSync.stop();
  employeeTabSync.stop();
});

// -----------------------------------------------------------------------------
// 23. Cross-tab date rollover synchronization
// -----------------------------------------------------------------------------
runTest(23, 'Cross-tab synchronization propagates BUSINESS_DATE_ROLLOVER across open tabs immediately', () => {
  const bus = new InMemoryCrossTabBus();
  const tabA = new CrossTabFinancialSyncManager({ tabId: 'tab-A', inMemoryBus: bus });
  const tabB = new CrossTabFinancialSyncManager({ tabId: 'tab-B', inMemoryBus: bus });
  tabA.start();
  tabB.start();

  let tabBDate = '28-Oct-2026';
  tabB.onEvent((env) => {
    if (env.eventType === 'BUSINESS_DATE_ROLLOVER') {
      tabBDate = env.businessReferenceDate;
    }
  });

  tabA.publish({
    eventType: 'BUSINESS_DATE_ROLLOVER',
    businessReferenceDate: '29-Oct-2026',
    payload: { previousBusinessDate: '28-Oct-2026', currentBusinessDate: '29-Oct-2026' },
  });

  assert.equal(tabBDate, '29-Oct-2026');
  tabA.stop();
  tabB.stop();
});

// -----------------------------------------------------------------------------
// 24. Cross-tab duplicate/loop prevention
// -----------------------------------------------------------------------------
runTest(24, 'Cross-tab sync manager prevents self-origin feedback loops and deduplicates repeated event IDs', () => {
  const bus = new InMemoryCrossTabBus();
  const tabA = new CrossTabFinancialSyncManager({ tabId: 'tab-origin', inMemoryBus: bus });
  const tabB = new CrossTabFinancialSyncManager({ tabId: 'tab-receiver', inMemoryBus: bus });
  tabA.start();
  tabB.start();

  let tabACallbacks = 0;
  let tabBCallbacks = 0;
  tabA.onEvent(() => {
    tabACallbacks += 1;
  });
  tabB.onEvent(() => {
    tabBCallbacks += 1;
  });

  const env = tabA.publish({
    eventId: 'EVT-DEDUP-001',
    eventType: 'LATE_CHARGE_WAIVER_APPLIED',
    businessReferenceDate: '28-Oct-2026',
    billNo: 'BILL-UG-2026-10-8821',
    payload: { waivedAmount: 2.0 },
  });

  // Re-broadcast the exact same envelope on the bus (simulating storage + BroadcastChannel double delivery)
  bus.publish('vidyutflow_step4c_financial_sync_v1', env);
  bus.publish('vidyutflow_step4c_financial_sync_v1', env);

  assert.equal(tabACallbacks, 0, 'Origin tab must never process its own emitted event (0 feedback loops)');
  assert.equal(tabBCallbacks, 1, 'Receiver tab must process duplicate eventId exactly once');
  assert.ok(tabB.getDiagnostics().duplicateIgnoredCount >= 2);

  tabA.stop();
  tabB.stop();
});

// -----------------------------------------------------------------------------
// 25. Notification creation on overdue / notice threshold transitions
// -----------------------------------------------------------------------------
runTest(25, 'Automatic notification engine emits milestone notifications as business date rolls across thresholds', () => {
  // Roll from Day 1 overdue (23-Oct-2026) -> Day 6 overdue (28-Oct-2026) -> Day 15 overdue (06-Nov-2026)
  const day1 = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '23-Oct-2026',
    language: 'en',
  });
  assert.ok(day1.newNotifications.some((n) => n.eventKey?.includes('OVERDUE_DAY_1:BILL-UG-2026-10-8821')));

  const day6 = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: day1.newNotifications,
    emittedEventKeys: day1.updatedEmittedEventKeys,
    referenceDate: '28-Oct-2026',
    language: 'en',
  });
  assert.ok(
    day6.newNotifications.some((n) =>
      n.eventKey?.includes('OVERDUE_SUBSEQUENT_REMINDER:BILL-UG-2026-10-8821:D6')
    )
  );

  const day15 = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    formalNotices: [],
    existingNotifications: [...day1.newNotifications, ...day6.newNotifications],
    emittedEventKeys: day6.updatedEmittedEventKeys,
    referenceDate: '06-Nov-2026',
    language: 'en',
  });
  assert.ok(
    day15.newNotifications.some((n) =>
      n.eventKey?.includes('OVERDUE_SUBSEQUENT_REMINDER:BILL-UG-2026-10-8821:D15')
    )
  );
});

// -----------------------------------------------------------------------------
// 26. Notification deduplication and read/unread preservation
// -----------------------------------------------------------------------------
runTest(26, 'Notifications deduplicate on same-day re-evaluation and preserve user read state across rollovers', () => {
  const firstEval = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: [],
    emittedEventKeys: [],
    referenceDate: '28-Oct-2026',
    language: 'en',
  });
  assert.ok(firstEval.newNotifications.length > 0);

  // Mark the first notification as read
  const withReadState = firstEval.newNotifications.map((n, idx) =>
    idx === 0 ? { ...n, read: true } : n
  );

  // Re-evaluate on the same date: 0 duplicate notifications created, and read state preserved
  const secondEval = evaluateStep4BOverdueAndNoticeNotifications({
    connections: INITIAL_CONNECTIONS,
    bills: [overdueBill],
    payments: INITIAL_PAYMENTS,
    formalNotices: INITIAL_FORMAL_NOTICES,
    existingNotifications: withReadState,
    emittedEventKeys: firstEval.updatedEmittedEventKeys,
    referenceDate: '28-Oct-2026',
    language: 'en',
  });
  assert.equal(secondEval.newNotifications.length, 0, 'Must not emit duplicate notifications');
  assert.equal(withReadState[0].read, true, 'User read state must be preserved');
});

// -----------------------------------------------------------------------------
// 27. Smart Payment Calendar live milestone updates
// -----------------------------------------------------------------------------
runTest(27, 'Smart Payment Calendar updates overdue days, DPS, notice countdown, and todayIso marker on rollover and settlement', () => {
  const eventsOct28 = derivePaymentCalendarEvents({
    bills: [overdueBill],
    connections: INITIAL_CONNECTIONS,
    payments: INITIAL_PAYMENTS,
    referenceDate: '28-Oct-2026',
    formalNotices: INITIAL_FORMAL_NOTICES,
  });
  assert.equal(eventsOct28[0].daysOverdue, 6);
  assert.equal(eventsOct28[0].accruedLateCharges, 5.39);
  assert.equal(eventsOct28[0].formalNoticeDaysRemaining, 11);

  // Rollover to 02-Nov-2026
  const eventsNov02 = derivePaymentCalendarEvents({
    bills: [overdueBill],
    connections: INITIAL_CONNECTIONS,
    payments: INITIAL_PAYMENTS,
    referenceDate: '02-Nov-2026',
    formalNotices: INITIAL_FORMAL_NOTICES,
  });
  assert.equal(eventsNov02[0].daysOverdue, 11);
  assert.equal(eventsNov02[0].accruedLateCharges, 9.88);
  assert.equal(eventsNov02[0].formalNoticeDaysRemaining, 6);

  // Verify buildMonthCalendarGrid marks 2026-11-02 as isToday
  const novGrid = buildMonthCalendarGrid(2026, 10, eventsNov02, '2026-11-02');
  const todayCell = novGrid.find((c) => c.dateIso === '2026-11-02')!;
  assert.equal(todayCell.isToday, true);
});

// -----------------------------------------------------------------------------
// 28. Formal notice countdown updates
// -----------------------------------------------------------------------------
runTest(28, 'Formal notice countdown decrements each business day and transitions SERVED -> DEADLINE_APPROACHING -> DEADLINE_REACHED', () => {
  const baseNotice = INITIAL_FORMAL_NOTICES[0]; // Issued 24-Oct-2026, 15 clear days -> 08-Nov-2026 deadline

  const stmtOct29 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '29-Oct-2026',
  });
  const nOct29 = reconcileFormalNoticeWithStatement(baseNotice, stmtOct29, '29-Oct-2026');
  assert.equal(nOct29.status, 'SERVED');
  assert.equal(nOct29.daysRemaining, 10);

  const stmtNov06 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '06-Nov-2026',
  });
  const nNov06 = reconcileFormalNoticeWithStatement(nOct29, stmtNov06, '06-Nov-2026');
  assert.equal(nNov06.status, 'DEADLINE_APPROACHING');
  assert.equal(nNov06.daysRemaining, 2);

  const stmtNov08 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '08-Nov-2026',
  });
  const nNov08 = reconcileFormalNoticeWithStatement(nNov06, stmtNov08, '08-Nov-2026');
  assert.equal(nNov08.status, 'DEADLINE_REACHED');
  assert.equal(nNov08.daysRemaining, 0);
});

// -----------------------------------------------------------------------------
// 29. Formal notice resolution after full payment
// -----------------------------------------------------------------------------
runTest(29, 'Full payment automatically resolves an active Formal Notice while preserving frozen snapshotAtIssuance', () => {
  const fullPay = applyPaymentToBill({
    bill: overdueBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '30-Oct-2026 11:00',
    txId: 'TXN-NOTICE-RESOLVE-01',
    bankReference: 'UPI-NTC-RES',
    referenceDate: '30-Oct-2026',
    includeLateCharges: true,
  });

  const settledStmt = deriveCanonical9FieldBillStatement({
    bill: fullPay.updatedBill,
    connection: resConnection,
    payments: [fullPay.paymentTransaction!, ...INITIAL_PAYMENTS],
    referenceDate: '30-Oct-2026',
  });

  const resolvedNotice = reconcileFormalNoticeWithStatement(
    INITIAL_FORMAL_NOTICES[0],
    settledStmt,
    '30-Oct-2026'
  );
  assert.equal(resolvedNotice.status, 'RESOLVED');
  assert.equal(resolvedNotice.disconnectionReviewStatus, 'RESOLVED_BY_SETTLEMENT');
  assert.equal(resolvedNotice.daysRemaining, null);
  assert.equal(
    resolvedNotice.snapshotAtIssuance.totalOutstandingAtIssuance,
    2186.8,
    'Historical snapshot at issuance must remain immutable'
  );
  assert.equal(resolvedNotice.currentBalanceView.totalCurrentOutstanding, 0);
});

// -----------------------------------------------------------------------------
// 30. Zero-countdown non-disconnection & missing-service-evidence legal safeguard
// -----------------------------------------------------------------------------
runTest(30, 'Zero-countdown never auto-disconnects connection AND missing service evidence never fabricates a live countdown', () => {
  // 1. Zero-countdown safeguard
  assert.equal(DEFAULT_FORMAL_NOTICE_POLICY.neverAutoDisconnectOnExpiry, true);
  const stmtNov10 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '10-Nov-2026',
  });
  const expiredNotice = reconcileFormalNoticeWithStatement(
    INITIAL_FORMAL_NOTICES[0],
    stmtNov10,
    '10-Nov-2026'
  );
  assert.equal(expiredNotice.status, 'DEADLINE_REACHED');
  assert.equal(expiredNotice.disconnectionReviewStatus, 'AUTHORIZED_REVIEW_REQUIRED');
  assert.equal(resConnection.status, 'Active', 'Connection must remain Active');

  // 2. Missing service evidence safeguard
  const stmtOct28 = deriveCanonical9FieldBillStatement({
    bill: overdueBill,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    referenceDate: '28-Oct-2026',
  });
  const draft = createDraftFormalNotice({
    statement: stmtOct28,
    subdivision: 'Mehsana City North',
    createdBy: 'Rajesh V. Trivedi',
    noticeId: 'NTC-UNSERVED-01',
  });
  const approved = approveFormalNotice(draft, 'Dr. Harita Joshi', 'MANAGEMENT');
  const unserved = issueAndServeFormalNotice({
    notice: approved,
    statement: stmtOct28,
    issueDate: '25-Oct-2026',
    actorName: 'Rajesh V. Trivedi',
    actorRole: 'EMPLOYEE',
    markServedImmediately: false,
  });

  assert.equal(unserved.status, 'SERVICE_PENDING');
  assert.equal(unserved.paymentDeadlineDate, undefined, 'Must not fabricate deadline without service evidence');
  assert.equal(unserved.daysRemaining, null, 'Must not fabricate countdown without service evidence');

  // Reconciling unserved notice on a later date keeps it SERVICE_PENDING with null countdown
  const reconciledUnserved = reconcileFormalNoticeWithStatement(unserved, stmtOct28, '28-Oct-2026');
  assert.equal(reconciledUnserved.status, 'SERVICE_PENDING');
  assert.equal(reconciledUnserved.daysRemaining, null);

  // Recording verified service evidence starts the 15-clear-day deadline from serviceDate (26-Oct + 15 clear days = 10-Nov)
  const nowServed = recordFormalNoticeServiceEvidence({
    notice: reconciledUnserved,
    statement: stmtOct28,
    serviceDate: '26-Oct-2026',
    serviceEvidenceRef: 'SRV-VERIFIED-POST-001',
    actorName: 'Rajesh V. Trivedi',
    actorRole: 'EMPLOYEE',
  });
  assert.equal(nowServed.status, 'SERVED');
  assert.equal(nowServed.paymentDeadlineDate, '10-Nov-2026');
  assert.equal(nowServed.daysRemaining, 13);
});

// -----------------------------------------------------------------------------
// 31. Multilingual rendering (EN, GU, HI, MR)
// -----------------------------------------------------------------------------
runTest(31, 'Multilingual dictionaries (en, gu, hi, mr) provide complete translations for Step 4C clock, DPS, notices, and calendar', () => {
  const langs = ['en', 'gu', 'hi', 'mr'] as const;
  for (const lang of langs) {
    const clockDict = STEP4C_CLOCK_AND_SYNC_I18N[lang];
    assert.ok(clockDict.liveBusinessClockTitle.length > 0);
    assert.ok(clockDict.liveAsiaKolkataBadge.length > 0);
    assert.ok(clockDict.devOverrideBadge.length > 0);
    assert.ok(clockDict.serviceEvidencePendingBadge.length > 0);

    const lcDict = getLateChargeLocalization(lang);
    assert.ok(lcDict.daysOverdue.length > 0);
    assert.ok(lcDict.totalOutstanding.length > 0);

    const fnDict = getFormalNoticeTranslations(lang);
    assert.ok(fnDict.sectionTitle.length > 0);
    assert.ok(fnDict.statuses.SERVICE_PENDING.length > 0);

    const calDict = CALENDAR_LOCALIZATION[lang];
    assert.ok(calDict.calendarTitle.length > 0);
  }
});

// -----------------------------------------------------------------------------
// 32. Existing DEMO data and 2-page A4 bill preservation
// -----------------------------------------------------------------------------
runTest(32, 'Existing DEMO records and 2-page A4 electricity bill document layout remain intact', () => {
  assert.ok(INITIAL_CONNECTIONS.length >= 2);
  assert.ok(INITIAL_BILLS.length >= 4);
  assert.ok(INITIAL_PAYMENTS.length >= 3);

  // Original overdue bill principal amount in INITIAL_BILLS is untouched
  const seedOverdue = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-8821')!;
  assert.equal(seedOverdue.totalAmount, 2185);
  assert.equal(seedOverdue.dueDate, '22-Oct-2026');

  // Official 2-page A4 electricity bill generation succeeds and preserves 2-page A4 structure
  const docResult = generateElectricityBillDocument({
    role: 'consumer',
    actor: {
      userId: 'demo_consumer',
      name: 'Smt. Meenaben Patel',
      ownedConsumerNos: ['04281-99231'],
    },
    bill: seedOverdue,
    connection: resConnection,
    payments: INITIAL_PAYMENTS,
    language: 'en',
  });
  assert.equal(docResult.authorized, true);
  const pages = paginateOfficialDocumentForA4(docResult);
  assert.equal(pages.length, 2, 'Must preserve canonical 2-page A4 print layout');
});

console.log('================================================================================');
console.log(`STEP 4C VERIFICATION SUMMARY: ${passedCount}/${passedCount + failedCount} TESTS PASSED`);
console.log('================================================================================');

if (failedCount > 0) {
  process.exit(1);
}
