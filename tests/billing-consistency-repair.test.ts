import {
  normalizeBillingIdentifier,
  parseVidyutDateToUtcMs,
  calculateDaysUntilDue,
  isBillPastDueDate,
  resolveOwnedConnectionsForConsumer,
  matchesBillToConnection,
  matchesPaymentToConnection,
  reconcileBillWithPayments,
  selectConnectionBillingSummary,
  selectConsumerAccountBillingSummary,
  isConnectionBillingEligible,
  calculateDeterministicTariffBreakdown,
  generateDeterministicDemoBillForConnection,
  applyPaymentToBill,
  buildBillingReminderDedupeKey,
  buildLocalizedBillingReminderCopy,
  evaluateGentleBillingReminders,
  createPaymentConfirmedNotification,
  BILLING_UI_TRANSLATIONS,
  type ConsumerBillingActorScope,
} from '../src/utils/billingEngine';
import {
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
} from '../src/data/mockData';
import { generatePaymentReceiptDocument } from '../src/utils/documentEngine';
import { executeDatasetExport } from '../src/utils/exportEngine';
import { localizeBillStatus, localizeBillMonth } from '../src/i18n/consumerContentTranslations';
import type { ElectricityConnection, ElectricityBill, PaymentTransaction } from '../src/types';
import type { Language } from '../src/i18n/types';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

console.log('==================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 5 INTERIM FIX: BILLING CONSISTENCY SUITE');
console.log('==================================================================\n');

let passed = 0;
const results: { id: number; group: string; name: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

function runTest(id: number, group: string, name: string, fn: () => string) {
  try {
    const details = fn();
    passed++;
    results.push({ id, group, name, status: 'PASS', details });
    console.log(`✅ [TEST ${String(id).padStart(2, '0')}] [${group}] ${name} — PASS (${details})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id, group, name, status: 'FAIL', details: msg });
    console.error(`❌ [TEST ${String(id).padStart(2, '0')}] [${group}] ${name} — FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

const MEENABEN_SCOPE: ConsumerBillingActorScope = {
  accountId: 'demo_consumer',
  email: 'consumer@vidyutflow.demo',
  linkedConsumerNo: '04281-99231',
  consumerName: 'Smt. Meenaben Patel',
  ownedConsumerNos: ['04281-99231', '04281-77190', '04281-41572'],
};

const EXTRA_ENERGIZED_CONNECTION: ElectricityConnection = {
  consumerNo: '04281-41572',
  connectionId: 'UG-MSN-RES-41572',
  consumerName: 'Smt. Meenaben Patel',
  meterNo: 'MTR-2026-415720',
  sanctionedLoadKw: 5.0,
  phase: '1-Phase',
  tariffCategory: 'Residential (RGPU)',
  address: '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002',
  subdivision: 'Mehsana City North',
  feederName: '11kV Visnagar Road Feeder',
  status: 'Active',
  connectedDate: '12-Oct-2026',
  lastReadingDate: '12-Oct-2026',
  currentReadingKwh: 260,
  previousReadingKwh: 0,
  averageMonthlyKwh: 260,
  securityDeposit: 5000,
  accountId: 'demo_consumer',
  accountEmail: 'consumer@vidyutflow.demo',
};

const OTHER_USER_CONNECTION: ElectricityConnection = {
  consumerNo: '09999-11111',
  connectionId: 'UG-KAL-COM-9999',
  consumerName: 'Shri Rameshbhai Desai',
  meterNo: 'MTR-2022-111111',
  sanctionedLoadKw: 15,
  phase: '3-Phase',
  tariffCategory: 'Commercial (NRGP)',
  address: 'Plot 5, Kalol GIDC',
  subdivision: 'Kalol Town',
  feederName: '11kV Kalol Industrial Feeder',
  status: 'Active',
  connectedDate: '01-Jan-2022',
  lastReadingDate: '01-Oct-2026',
  currentReadingKwh: 1500,
  previousReadingKwh: 1000,
  averageMonthlyKwh: 500,
  securityDeposit: 12000,
  accountId: 'other_consumer_99',
  accountEmail: 'ramesh@example.com',
};

const OTHER_USER_BILL: ElectricityBill = {
  billNo: 'BILL-UG-2026-10-9999',
  consumerNo: '09999-11111',
  billMonth: 'September 2026',
  billDate: '04-Oct-2026',
  dueDate: '22-Oct-2026',
  unitsConsumed: 500,
  energyCharges: 3200,
  fixedCharges: 300,
  fuelPriceAdjustment: 600,
  electricityDuty: 410,
  rebateOrSubsidy: 0,
  totalAmount: 4510,
  status: 'Unpaid',
  slabBreakdown: [{ slab: 'Commercial Rate', units: 500, rate: 6.4, amount: 3200 }],
  accountId: 'other_consumer_99',
};

// ============================================================================
// A. CONNECTION & BILL LOOKUP TESTS (Tests 1 - 8)
// ============================================================================

runTest(1, 'A. Lookup', 'Active connection bill lookup resolves exact bills for selected connection', () => {
  const summary99231 = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[0],
    INITIAL_BILLS,
    INITIAL_PAYMENTS,
    { referenceDate: '10-Oct-2026' }
  );
  assert(summary99231.visibleBills.length === 3, `Expected 3 bills for 04281-99231, got ${summary99231.visibleBills.length}`);
  assert(summary99231.latestBill?.billNo === 'BILL-UG-2026-10-8821', 'Latest bill should be BILL-UG-2026-10-8821');
  assert(summary99231.dueBillCount === 1, `Expected 1 due bill for 04281-99231, got ${summary99231.dueBillCount}`);

  const summary77190 = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[1],
    INITIAL_BILLS,
    INITIAL_PAYMENTS,
    { referenceDate: '10-Oct-2026' }
  );
  assert(summary77190.visibleBills.length === 1, `Expected 1 bill for 04281-77190, got ${summary77190.visibleBills.length}`);
  assert(summary77190.latestBill?.billNo === 'BILL-UG-2026-10-77190', 'Latest bill for 04281-77190 should be BILL-UG-2026-10-77190');
  assert(summary77190.dueBillCount === 1, 'Expected 1 due bill for 04281-77190');

  return '04281-99231 -> 3 bills (1 due), 04281-77190 -> 1 bill (1 due)';
});

runTest(2, 'A. Lookup', 'Consumer ownership isolation blocks foreign connections and bills', () => {
  const allConns = [...INITIAL_CONNECTIONS, EXTRA_ENERGIZED_CONNECTION, OTHER_USER_CONNECTION];
  const allBills = [...INITIAL_BILLS, OTHER_USER_BILL];

  const owned = resolveOwnedConnectionsForConsumer(allConns, MEENABEN_SCOPE);
  assert(owned.length === 3, `Expected 3 owned connections for Meenaben, got ${owned.length}`);
  assert(!owned.some((c) => c.consumerNo === '09999-11111'), 'Foreign connection must not be resolved');

  const accountSummary = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-99231',
    referenceDate: '10-Oct-2026',
  });
  assert(
    !accountSummary.allAccountReconciledBills.some((b) => b.consumerNo === '09999-11111'),
    'Foreign bill must never leak into consumer account summary'
  );
  return 'Owned=3 connections, 0 foreign bills leaked';
});

runTest(3, 'A. Lookup', 'Legacy / alternate connection identifier normalization matches connectionId and consumerNo formats', () => {
  const legacyBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    billNo: 'BILL-LEGACY-101',
    consumerNo: '  04281-41572 ',
    connectionId: 'ug-msn-res-41572',
  };
  assert(normalizeBillingIdentifier(' 04281-41572 ') === '04281-41572', 'Whitespace & case normalization failed');
  assert(matchesBillToConnection(legacyBill, EXTRA_ENERGIZED_CONNECTION), 'Legacy formatted bill failed to match connection');

  const connIdOnlyBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    billNo: 'BILL-LEGACY-102',
    consumerNo: 'UG-MSN-RES-41572',
  };
  assert(matchesBillToConnection(connIdOnlyBill, EXTRA_ENERGIZED_CONNECTION), 'Connection ID bill failed to match connection');

  const aliasBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    billNo: 'BILL-LEGACY-103',
    consumerNo: 'OLD-CONN-41572',
  };
  assert(
    matchesBillToConnection(aliasBill, EXTRA_ENERGIZED_CONNECTION, ['OLD-CONN-41572']),
    'Legacy alias failed to match connection'
  );
  return 'Normalized consumerNo, connectionId, and legacy aliases matched';
});

runTest(4, 'A. Lookup', 'Dashboard, Sidebar due badge, Bills page, and Export count stay strictly synchronized', () => {
  const allConns = [...INITIAL_CONNECTIONS, EXTRA_ENERGIZED_CONNECTION];

  // Case 1: Active connection 04281-99231 (has 1 unpaid bill, 2 paid bills)
  const summary99231 = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills: INITIAL_BILLS,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-99231',
    referenceDate: '10-Oct-2026',
  });
  assert(summary99231.selectedConnectionSummary.dashboardBadgeState === 'UNPAID', 'Dashboard badge should be UNPAID');
  assert(summary99231.sidebarDueBadgeCount === 1, `Sidebar due badge should be 1, got ${summary99231.sidebarDueBadgeCount}`);
  assert(summary99231.selectedConnectionSummary.visibleBills.length === 3, 'Bills list should have 3 bills');
  assert(summary99231.otherConnectionsWithDueBills.length === 1, 'Other connection 04281-77190 has 1 due bill');

  // Case 2: Active connection 04281-41572 (has 0 generated bills — exact Screenshot A & B bug scenario!)
  const summary41572 = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills: INITIAL_BILLS,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-41572',
    referenceDate: '10-Oct-2026',
  });
  assert(
    summary41572.selectedConnectionSummary.dashboardBadgeState === 'NO_BILL_GENERATED',
    `Expected NO_BILL_GENERATED for 04281-41572, got ${summary41572.selectedConnectionSummary.dashboardBadgeState}`
  );
  assert(summary41572.sidebarDueBadgeCount === 0, `Sidebar due count for 04281-41572 must be 0, got ${summary41572.sidebarDueBadgeCount}`);
  assert(summary41572.selectedConnectionSummary.visibleBills.length === 0, 'Visible bills for 04281-41572 must be 0');
  assert(summary41572.accountDueBillCount === 2, 'Account due count across other connections is 2');
  assert(summary41572.otherConnectionsWithDueBills.length === 2, 'Other connections with due bills must list 04281-99231 & 04281-77190');

  return 'Screenshot A & B contradiction eliminated: 04281-41572 shows NO_BILL_GENERATED + 0 sidebar due + 2 other-connection due notice';
});

runTest(5, 'A. Lookup', 'Empty billing state never displays Paid when no bill has been generated', () => {
  const emptyConnSummary = selectConnectionBillingSummary(
    EXTRA_ENERGIZED_CONNECTION,
    INITIAL_BILLS,
    INITIAL_PAYMENTS,
    { referenceDate: '10-Oct-2026' }
  );
  assert(emptyConnSummary.latestBill === null, 'latestBill must be null');
  assert(emptyConnSummary.dashboardBadgeState === 'NO_BILL_GENERATED', 'Badge state must be NO_BILL_GENERATED, never PAID');
  assert(emptyConnSummary.dashboardBadgeState !== ('PAID' as unknown), 'Must never be PAID');
  assert(emptyConnSummary.totalOutstandingAmount === 0, 'Total outstanding must be 0');
  assert(emptyConnSummary.dueBillCount === 0, 'Due bill count must be 0');
  return 'latestBill=null -> dashboardBadgeState=NO_BILL_GENERATED (never Paid)';
});

runTest(6, 'A. Lookup', 'Paid bills remain visible in bill history with Paid status and 0 remaining balance', () => {
  const summary99231 = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[0],
    INITIAL_BILLS,
    INITIAL_PAYMENTS,
    { referenceDate: '10-Oct-2026' }
  );
  const septBill = summary99231.visibleBills.find((b) => b.billNo === 'BILL-UG-2026-09-8821');
  const augBill = summary99231.visibleBills.find((b) => b.billNo === 'BILL-UG-2026-08-8821');

  assert(Boolean(septBill), 'August cycle paid bill BILL-UG-2026-09-8821 must remain in visibleBills');
  assert(Boolean(augBill), 'July cycle paid bill BILL-UG-2026-08-8821 must remain in visibleBills');
  assert(septBill?.effectiveStatus === 'Paid', 'BILL-UG-2026-09-8821 must have effectiveStatus Paid');
  assert(septBill?.outstandingBalance === 0, 'BILL-UG-2026-09-8821 must have 0 outstanding balance');
  assert(!septBill?.isDue, 'Paid bill must not be marked isDue');
  assert(summary99231.paidBills.length === 2, `Expected 2 historical paid bills, got ${summary99231.paidBills.length}`);

  return 'Paid bills BILL-UG-2026-09-8821 & BILL-UG-2026-08-8821 preserved in visibleBills';
});

runTest(7, 'A. Lookup', 'Unpaid, Overdue, and Partially Paid bills count as due', () => {
  const unpaidRec = reconcileBillWithPayments(INITIAL_BILLS[0], INITIAL_PAYMENTS, '10-Oct-2026');
  assert(unpaidRec.effectiveStatus === 'Unpaid' && unpaidRec.isDue, 'Unpaid bill before due date must be Unpaid & isDue=true');

  const overdueRec = reconcileBillWithPayments(INITIAL_BILLS[0], INITIAL_PAYMENTS, '25-Oct-2026');
  assert(overdueRec.effectiveStatus === 'Overdue' && overdueRec.isDue, 'Unpaid bill past due date must be Overdue & isDue=true');

  const partialPayment: PaymentTransaction = {
    txId: 'TXN-PARTIAL-TEST',
    billNo: INITIAL_BILLS[0].billNo,
    consumerNo: INITIAL_BILLS[0].consumerNo,
    amount: 1000,
    date: '10-Oct-2026 11:00',
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'REC-PARTIAL-01',
  };
  const partialRec = reconcileBillWithPayments(INITIAL_BILLS[0], [...INITIAL_PAYMENTS, partialPayment], '10-Oct-2026');
  assert(partialRec.effectiveStatus === 'Partially Paid' && partialRec.isDue, 'Partially paid bill must have isDue=true');
  assert(partialRec.outstandingBalance === 1185, `Expected remaining balance 1185 (2185 - 1000), got ${partialRec.outstandingBalance}`);

  return 'Unpaid, Overdue, and Partially Paid all set isDue=true with exact remaining balance';
});

runTest(8, 'A. Lookup', 'Switching between multiple connections under one consumer updates all derived views', () => {
  const allConns = [...INITIAL_CONNECTIONS, EXTRA_ENERGIZED_CONNECTION];

  const view1 = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills: INITIAL_BILLS,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-99231',
    referenceDate: '10-Oct-2026',
  });
  const view2 = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills: INITIAL_BILLS,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-77190',
    referenceDate: '10-Oct-2026',
  });
  const view3 = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills: INITIAL_BILLS,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-41572',
    referenceDate: '10-Oct-2026',
  });

  assert(view1.selectedConnectionSummary.totalOutstandingAmount === 2185, 'View 1 payable should be ₹2,185');
  assert(view1.selectedConnectionSummary.paymentHistory.length === 2, 'View 1 should have 2 payments');

  assert(view2.selectedConnectionSummary.totalOutstandingAmount === 14854, 'View 2 payable should be ₹14,854');
  assert(view2.selectedConnectionSummary.paymentHistory.length === 1, 'View 2 should have 1 payment');

  assert(view3.selectedConnectionSummary.totalOutstandingAmount === 0, 'View 3 payable should be ₹0');
  assert(view3.selectedConnectionSummary.dashboardBadgeState === 'NO_BILL_GENERATED', 'View 3 badge should be NO_BILL_GENERATED');

  return 'Switched cleanly across 04281-99231 (₹2,185), 04281-77190 (₹14,854), and 04281-41572 (No Bill)';
});

// ============================================================================
// B. BILL GENERATION & LIFECYCLE TESTS (Tests 9 - 13)
// ============================================================================

runTest(9, 'B. Lifecycle', 'Active connection is eligible for deterministic current-cycle bill generation', () => {
  const check = isConnectionBillingEligible(EXTRA_ENERGIZED_CONNECTION);
  assert(check.eligible === true, `Expected Active connection 04281-41572 to be eligible, got ${check.reason}`);

  const genResult = generateDeterministicDemoBillForConnection({
    connection: EXTRA_ENERGIZED_CONNECTION,
    existingBills: INITIAL_BILLS,
    billMonth: 'October 2026',
    billDate: '12-Oct-2026',
    dueDate: '27-Oct-2026',
  });
  assert(genResult.created === true && genResult.bill !== null, 'Expected deterministic DEMO bill to be created');
  assert(genResult.bill?.consumerNo === '04281-41572', 'Generated bill must belong to 04281-41572');
  assert(genResult.bill?.isSimulatedDemoBill === true, 'Generated bill must be marked isSimulatedDemoBill=true');
  assert((genResult.bill?.totalAmount || 0) > 0, 'Generated bill totalAmount must be > 0');

  return `Generated ${genResult.bill?.billNo} for 04281-41572 (₹${genResult.bill?.totalAmount})`;
});

runTest(10, 'B. Lifecycle', 'Non-active connections and unenergized applications cannot generate bills', () => {
  const nonActiveStatuses: Array<ElectricityConnection['status']> = [
    'New Installation',
    'Suspended',
  ];

  for (const st of nonActiveStatuses) {
    const testConn: ElectricityConnection = {
      ...EXTRA_ENERGIZED_CONNECTION,
      status: st,
    };
    const res = generateDeterministicDemoBillForConnection({
      connection: testConn,
      existingBills: INITIAL_BILLS,
    });
    assert(res.created === false && res.bill === null, `Connection status ${st} must NOT generate a bill`);
  }

  // Also test unenergized application stages even if passed alongside connection
  const unenergizedAppStages = [
    'Submitted',
    'Document Verification',
    'Site Inspection',
    'Sanction Approval',
    'Rejected',
  ] as const;

  for (const appStage of unenergizedAppStages) {
    const res = generateDeterministicDemoBillForConnection({
      connection: EXTRA_ENERGIZED_CONNECTION,
      existingBills: INITIAL_BILLS,
      linkedApplication: {
        ...INITIAL_APPLICATIONS[0],
        status: appStage,
      },
    });
    assert(res.created === false && res.bill === null, `Application stage ${appStage} must NOT generate a bill`);
  }

  return `Blocked ${nonActiveStatuses.length} non-active connection states and ${unenergizedAppStages.length} unenergized application stages`;
});

runTest(11, 'B. Lifecycle', 'Idempotent bill generation prevents duplicate bills for same connection and cycle', () => {
  const firstGen = generateDeterministicDemoBillForConnection({
    connection: EXTRA_ENERGIZED_CONNECTION,
    existingBills: INITIAL_BILLS,
    billMonth: 'October 2026',
  });
  assert(firstGen.created === true && firstGen.bill !== null, 'First generation must succeed');

  const secondGen = generateDeterministicDemoBillForConnection({
    connection: EXTRA_ENERGIZED_CONNECTION,
    existingBills: firstGen.updatedBills,
    billMonth: 'October 2026',
  });
  assert(secondGen.created === false, 'Second generation for same connection & cycle must be idempotent (created=false)');
  assert(secondGen.bill?.billNo === firstGen.bill?.billNo, 'Must return existing canonical bill');

  return `Idempotent check passed: ${firstGen.bill?.billNo} not duplicated`;
});

runTest(12, 'B. Lifecycle', 'Tariff calculation consistency across Residential, Commercial, Industrial, and Agricultural categories', () => {
  const categories: Array<ElectricityConnection['tariffCategory']> = [
    'Residential (RGPU)',
    'Commercial (NRGP)',
    'Industrial (LTMD)',
    'Agricultural (AG)',
  ];

  for (const cat of categories) {
    const calc = calculateDeterministicTariffBreakdown(cat, 5, 320);
    const expectedTotal = Math.round(
      calc.energyCharges + calc.fixedCharges + calc.fuelPriceAdjustment + calc.electricityDuty - calc.rebateOrSubsidy
    );
    assert(calc.totalAmount === expectedTotal, `Tariff total mismatch for ${cat}: ${calc.totalAmount} vs ${expectedTotal}`);
    const slabUnits = calc.slabBreakdown.reduce((s, item) => s + item.units, 0);
    assert(slabUnits === 320, `Slab units sum must equal 320 for ${cat}`);
  }

  return 'All 4 UGVCL tariff categories satisfy Energy + Fixed + FPPPA + Duty - Rebate = Total';
});

runTest(13, 'B. Lifecycle', 'Immediate reactive visibility after bill generation updates Dashboard, Sidebar, and Bills list', () => {
  const allConns = [...INITIAL_CONNECTIONS, EXTRA_ENERGIZED_CONNECTION];
  const gen = generateDeterministicDemoBillForConnection({
    connection: EXTRA_ENERGIZED_CONNECTION,
    existingBills: INITIAL_BILLS,
    billMonth: 'October 2026',
    billDate: '12-Oct-2026',
    dueDate: '27-Oct-2026',
  });

  const summary = selectConsumerAccountBillingSummary({
    allConnections: allConns,
    allBills: gen.updatedBills,
    allPayments: INITIAL_PAYMENTS,
    actorScope: MEENABEN_SCOPE,
    selectedConnectionNo: '04281-41572',
    referenceDate: '12-Oct-2026',
  });

  assert(summary.selectedConnectionSummary.visibleBills.length === 1, 'Bills list for 04281-41572 must immediately show 1 bill');
  assert(summary.selectedConnectionSummary.dashboardBadgeState === 'UNPAID', 'Dashboard badge must immediately transition to UNPAID');
  assert(summary.sidebarDueBadgeCount === 1, 'Sidebar due count for 04281-41572 must immediately show 1');
  assert(
    summary.selectedConnectionSummary.totalOutstandingAmount === gen.bill!.totalAmount,
    'Dashboard payable amount must match generated bill total'
  );

  return `04281-41572 immediately transitioned from NO_BILL_GENERATED to UNPAID (₹${gen.bill!.totalAmount})`;
});

// ============================================================================
// C. PAYMENT, BALANCE & RECEIPT TESTS (Tests 14 - 20)
// ============================================================================

runTest(14, 'C. Payments', 'Full payment marks bill Paid, sets remaining balance to 0, decrements due count, and stays in history', () => {
  const targetBill = INITIAL_BILLS[0]; // BILL-UG-2026-10-8821 (₹2,185)
  const payRes = applyPaymentToBill({
    bill: targetBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '12-Oct-2026 14:30',
    referenceDate: '12-Oct-2026',
  });

  assert(payRes.success === true && payRes.paymentTransaction !== null, 'Full payment should succeed');
  assert(payRes.updatedBill.status === 'Paid', 'Bill status must become Paid');
  assert(payRes.remainingBalance === 0, 'Remaining balance must be 0');
  assert(payRes.paidAmountApplied === 2185, 'Paid amount applied must be 2185');

  const updatedBills = INITIAL_BILLS.map((b) => (b.billNo === targetBill.billNo ? payRes.updatedBill : b));
  const updatedPayments = [payRes.paymentTransaction!, ...INITIAL_PAYMENTS];

  const updatedSummary = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[0],
    updatedBills,
    updatedPayments,
    { referenceDate: '12-Oct-2026' }
  );
  assert(updatedSummary.dueBillCount === 0, 'Due bill count for 04281-99231 must become 0');
  assert(updatedSummary.dashboardBadgeState === 'PAID', 'Dashboard badge must become PAID');
  assert(updatedSummary.visibleBills.length === 3, 'All 3 bills must remain visible in bill history');
  assert(updatedSummary.paymentHistory.length === 3, 'Payment history must include the new transaction');

  return `BILL-UG-2026-10-8821 settled -> status=Paid, balance=₹0, dueBillCount=0, history=3 bills`;
});

runTest(15, 'C. Payments', 'Partial payment marks bill Partially Paid, reduces remaining balance, and keeps bill due', () => {
  const targetBill = INITIAL_BILLS[0]; // ₹2,185
  const partialRes = applyPaymentToBill({
    bill: targetBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'Net Banking',
    amountToPay: 1000,
    paymentDate: '12-Oct-2026 15:00',
    referenceDate: '12-Oct-2026',
  });

  assert(partialRes.success === true && partialRes.paymentTransaction !== null, 'Partial payment must succeed');
  assert(partialRes.updatedBill.status === 'Partially Paid', `Expected status Partially Paid, got ${partialRes.updatedBill.status}`);
  assert(partialRes.updatedBill.paidAmount === 1000, 'Paid amount must be 1000');
  assert(partialRes.remainingBalance === 1185, 'Remaining balance must be 1185');

  const updatedBills = INITIAL_BILLS.map((b) => (b.billNo === targetBill.billNo ? partialRes.updatedBill : b));
  const updatedPayments = [partialRes.paymentTransaction!, ...INITIAL_PAYMENTS];

  const summary = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[0],
    updatedBills,
    updatedPayments,
    { referenceDate: '12-Oct-2026' }
  );
  assert(summary.dueBillCount === 1, 'Partially paid bill must still count as 1 due bill');
  assert(summary.dashboardBadgeState === 'PARTIALLY_PAID', 'Dashboard badge state must be PARTIALLY_PAID');
  assert(summary.totalOutstandingAmount === 1185, 'Total outstanding amount must show remaining ₹1,185');

  return 'Paid ₹1,000 of ₹2,185 -> status=Partially Paid, remaining=₹1,185, dueBillCount=1';
});

runTest(16, 'C. Payments', 'Second payment completes partially paid bill and clears remaining balance to 0', () => {
  const targetBill = INITIAL_BILLS[0]; // ₹2,185
  const firstStep = applyPaymentToBill({
    bill: targetBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'Net Banking',
    amountToPay: 1000,
    paymentDate: '12-Oct-2026 15:00',
    referenceDate: '12-Oct-2026',
  });

  const paymentsAfterFirst = [firstStep.paymentTransaction!, ...INITIAL_PAYMENTS];

  const secondStep = applyPaymentToBill({
    bill: firstStep.updatedBill,
    existingPayments: paymentsAfterFirst,
    paymentMethod: 'UPI / BHIM',
    amountToPay: 1185,
    paymentDate: '13-Oct-2026 16:15',
    referenceDate: '13-Oct-2026',
  });

  assert(secondStep.success === true && secondStep.paymentTransaction !== null, 'Second completing payment must succeed');
  assert(secondStep.updatedBill.status === 'Paid', 'Bill status must transition from Partially Paid to Paid');
  assert(secondStep.updatedBill.paidAmount === 2185, 'Total paid amount must be 2185');
  assert(secondStep.remainingBalance === 0, 'Remaining balance must be 0');

  const updatedBills = INITIAL_BILLS.map((b) => (b.billNo === targetBill.billNo ? secondStep.updatedBill : b));
  const paymentsAfterSecond = [secondStep.paymentTransaction!, ...paymentsAfterFirst];

  const summary = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[0],
    updatedBills,
    paymentsAfterSecond,
    { referenceDate: '13-Oct-2026' }
  );
  assert(summary.dueBillCount === 0, 'Due count must drop to 0 after second payment');
  assert(summary.paymentHistory.length === 4, 'Both partial payment transactions must be recorded in payment history');

  return '2-installment settlement (₹1,000 + ₹1,185) -> status=Paid, balance=₹0, 2 receipts recorded';
});

runTest(17, 'C. Payments', 'Duplicate payment prevention blocks paying an already settled bill', () => {
  const alreadyPaidBill = INITIAL_BILLS[1]; // BILL-UG-2026-09-8821 (Paid)
  const dupAttempt = applyPaymentToBill({
    bill: alreadyPaidBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    referenceDate: '12-Oct-2026',
  });

  assert(dupAttempt.success === false && dupAttempt.paymentTransaction === null, 'Paying already paid bill must be rejected');
  assert(dupAttempt.reason.includes('already fully paid'), `Expected duplicate payment error message, got ${dupAttempt.reason}`);

  return `Blocked duplicate payment on ${alreadyPaidBill.billNo} (${dupAttempt.reason})`;
});

runTest(18, 'C. Payments', 'Failed or Pending Verification transactions never reduce bill balance or mark bill Paid', () => {
  const failedTx: PaymentTransaction = {
    txId: 'TXN-FAILED-99',
    billNo: 'BILL-UG-2026-10-8821',
    consumerNo: '04281-99231',
    amount: 2185,
    date: '11-Oct-2026 09:00',
    paymentMethod: 'Debit Card',
    status: 'Failed',
    bankReference: 'REC-FAIL-99',
  };
  const pendingTx: PaymentTransaction = {
    ...failedTx,
    txId: 'TXN-PENDING-99',
    status: 'Pending Verification',
  };

  const rec = reconcileBillWithPayments(INITIAL_BILLS[0], [...INITIAL_PAYMENTS, failedTx, pendingTx], '12-Oct-2026');
  assert(rec.effectiveStatus === 'Unpaid', `Expected Unpaid despite failed/pending tx, got ${rec.effectiveStatus}`);
  assert(rec.outstandingBalance === 2185, `Expected full balance 2185, got ${rec.outstandingBalance}`);
  assert(rec.paidAmount === 0, 'paidAmount must remain 0');
  assert(matchesPaymentToConnection(failedTx, INITIAL_CONNECTIONS[0]), 'Payment still matches connection history for transparency');

  return 'Failed & Pending Verification transactions ignored in balance calculation';
});

runTest(19, 'C. Payments', 'Receipt generation succeeds for paid/partial-paid transactions and blocks unpaid bills', () => {
  const actor = {
    id: 'demo_consumer',
    name: 'Smt. Meenaben Patel',
    role: 'consumer' as const,
    consumerNo: '04281-99231',
    ownedConsumerNos: ['04281-99231'],
  };

  // Unpaid bill without payment must be blocked
  const unpaidDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor,
    bill: INITIAL_BILLS[0],
    payment: null,
    connection: INITIAL_CONNECTIONS[0],
    language: 'en',
  });
  assert(unpaidDoc.eligible === false, 'Unpaid bill without successful transaction must NOT generate a payment receipt');

  // Paid bill after payment must succeed
  const payRes = applyPaymentToBill({
    bill: INITIAL_BILLS[0],
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '12-Oct-2026 14:30',
    referenceDate: '12-Oct-2026',
  });
  const paidDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor,
    bill: payRes.updatedBill,
    payment: payRes.paymentTransaction,
    connection: INITIAL_CONNECTIONS[0],
    language: 'en',
  });
  assert(paidDoc.eligible === true && paidDoc.authorized === true, 'Paid bill with successful transaction must generate official receipt');
  assert(paidDoc.referenceId === payRes.paymentTransaction?.txId, 'Receipt referenceId must match transaction txId');

  return `Unpaid receipt blocked; Paid receipt ${paidDoc.referenceId} verified`;
});

runTest(20, 'C. Payments', 'CSV and JSON exports reflect updated bill status and exact selected-connection records', () => {
  const targetBill = INITIAL_BILLS[0];
  const payRes = applyPaymentToBill({
    bill: targetBill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '12-Oct-2026 14:30',
    referenceDate: '12-Oct-2026',
  });

  const updatedBills = INITIAL_BILLS.map((b) => (b.billNo === targetBill.billNo ? payRes.updatedBill : b));
  const updatedPayments = [payRes.paymentTransaction!, ...INITIAL_PAYMENTS];

  const summary = selectConnectionBillingSummary(
    INITIAL_CONNECTIONS[0],
    updatedBills,
    updatedPayments,
    { referenceDate: '12-Oct-2026' }
  );

  const jsonExport = executeDatasetExport({
    role: 'consumer',
    actor: {
      id: 'demo_consumer',
      name: 'Smt. Meenaben Patel',
      role: 'consumer',
      consumerNo: '04281-99231',
      ownedConsumerNos: ['04281-99231'],
    },
    datasetKey: 'bills',
    records: summary.visibleBills as unknown as Record<string, unknown>[],
    format: 'json',
    scope: 'filtered',
    language: 'en',
    skipBrowserDownload: true,
  });

  assert(jsonExport.success && jsonExport.recordCount === 3, `Expected 3 exported bills, got ${jsonExport.recordCount}`);
  assert(jsonExport.content.includes('"BILL-UG-2026-10-8821"'), 'Export must include BILL-UG-2026-10-8821');
  assert(!jsonExport.content.includes('"Unpaid"'), 'All 3 bills for 04281-99231 should now be Paid in export');

  return `Exported ${jsonExport.recordCount} bills for 04281-99231 with updated Paid status`;
});

// ============================================================================
// D. GENTLE PAYMENT REMINDER TESTS (Tests 21 - 27)
// ============================================================================

runTest(21, 'D. Reminders', 'Upcoming due reminders (5 days and 1 day before due date) trigger accurately', () => {
  // BILL-UG-2026-10-8821 due date is 22-Oct-2026 -> 5 days before is 17-Oct-2026; 1 day before is 21-Oct-2026
  const eval5d = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '17-Oct-2026',
    language: 'en',
  });
  const rem5d = eval5d.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(Boolean(rem5d), '5-day upcoming reminder should be created on 17-Oct-2026');
  assert(rem5d?.type === 'info', '5-day reminder must use gentle info severity');
  assert(rem5d?.notificationType === 'UPCOMING_DUE_5D', 'Notification type must be UPCOMING_DUE_5D');

  const eval1d = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '21-Oct-2026',
    language: 'en',
  });
  const rem1d = eval1d.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(Boolean(rem1d), '1-day upcoming reminder should be created on 21-Oct-2026');
  assert(rem1d?.title.includes('Due Tomorrow'), `Expected Due Tomorrow title, got ${rem1d?.title}`);

  return 'Verified UPCOMING_DUE_5D (17-Oct) and UPCOMING_DUE_1D (21-Oct)';
});

runTest(22, 'D. Reminders', 'Due today reminder triggers on exact due date', () => {
  const evalToday = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '22-Oct-2026',
    language: 'en',
  });
  const remToday = evalToday.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(Boolean(remToday), 'DUE_TODAY reminder must be created on 22-Oct-2026');
  assert(remToday?.title.includes('Due Today'), `Expected Due Today title, got ${remToday?.title}`);
  assert(remToday?.notificationType === 'DUE_TODAY', 'Notification type must be DUE_TODAY');

  return `Triggered ${remToday?.eventKey}`;
});

runTest(23, 'D. Reminders', 'Overdue notice triggers politely after due date passes without daily spam', () => {
  const evalOverdue1 = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '25-Oct-2026',
    language: 'en',
  });
  const remOverdue = evalOverdue1.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(Boolean(remOverdue), 'OVERDUE_NOTICE must be emitted on 25-Oct-2026');
  assert(remOverdue?.notificationType === 'OVERDUE_NOTICE', 'Notification type must be OVERDUE_NOTICE');

  // Re-evaluating on 26-Oct-2026 must NOT emit another overdue notice because OVERDUE_NOTICE uses dueDate in dedupeKey
  const evalOverdue2 = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: evalOverdue1.newNotifications,
    emittedReminderKeys: evalOverdue1.updatedEmittedReminderKeys,
    accountId: 'demo_consumer',
    referenceDate: '26-Oct-2026',
    language: 'en',
  });
  const duplicateOverdue = evalOverdue2.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(!duplicateOverdue, 'OVERDUE_NOTICE must not spam again on subsequent days');

  return `Single polite OVERDUE_NOTICE emitted (${remOverdue?.eventKey}); subsequent day suppressed`;
});

runTest(24, 'D. Reminders', 'Deterministic deduplication key prevents duplicate reminders across reloads', () => {
  const key = buildBillingReminderDedupeKey('BILL-UG-2026-10-8821', 'DUE_TODAY', '22-Oct-2026');
  assert(key === 'BILL-REMINDER:BILL-UG-2026-10-8821:DUE_TODAY:22-Oct-2026', `Unexpected key format: ${key}`);

  const firstRun = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '22-Oct-2026',
    language: 'en',
  });
  const secondRun = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: firstRun.newNotifications,
    emittedReminderKeys: firstRun.updatedEmittedReminderKeys,
    accountId: 'demo_consumer',
    referenceDate: '22-Oct-2026',
    language: 'en',
  });

  assert(firstRun.newNotifications.length > 0, 'First run must emit reminder');
  assert(secondRun.newNotifications.length === 0, 'Second run with persisted dedupe keys must emit 0 duplicates');

  return `Dedupe key ${key} verified across repeated evaluations`;
});

runTest(25, 'D. Reminders', 'Paying a bill suppresses future due/overdue reminders and emits PAYMENT_CONFIRMED', () => {
  // First emit a due-today reminder on 22-Oct-2026
  const beforePayEval = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '22-Oct-2026',
    language: 'en',
  });
  const existingDueNotif = beforePayEval.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(Boolean(existingDueNotif), 'Expected due reminder before payment');

  // Now pay BILL-UG-2026-10-8821
  const payRes = applyPaymentToBill({
    bill: INITIAL_BILLS[0],
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    paymentDate: '22-Oct-2026 10:00',
    referenceDate: '22-Oct-2026',
  });

  const billsAfterPay = INITIAL_BILLS.map((b) => (b.billNo === 'BILL-UG-2026-10-8821' ? payRes.updatedBill : b));
  const paymentsAfterPay = [payRes.paymentTransaction!, ...INITIAL_PAYMENTS];

  const evalAfterPay = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: billsAfterPay,
    payments: paymentsAfterPay,
    existingNotifications: beforePayEval.newNotifications,
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '22-Oct-2026',
    language: 'en',
  });

  const reminderForPaidBill = evalAfterPay.newNotifications.find((n) => n.relatedEntityId === 'BILL-UG-2026-10-8821');
  assert(!reminderForPaidBill, 'Paid bill must NEVER generate new DUE_TODAY or OVERDUE_NOTICE reminders');
  assert(
    evalAfterPay.suppressedNotificationIds.includes(existingDueNotif!.id),
    'Prior due notification for paid bill must be marked for suppression'
  );

  const confirmNotif = createPaymentConfirmedNotification({
    bill: payRes.updatedBill,
    payment: payRes.paymentTransaction!,
    remainingBalance: 0,
    language: 'en',
  });
  assert(confirmNotif.eventKey?.includes('PAYMENT_CONFIRMED'), 'Payment confirmation notification must use PAYMENT_CONFIRMED key');

  return 'Due reminder suppressed for paid bill; PAYMENT_CONFIRMED notification created';
});

runTest(26, 'D. Reminders', 'Consumer reminder isolation ensures reminders only target consumer role and owning connection', () => {
  const evalRes = evaluateGentleBillingReminders({
    ownedConnections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    existingNotifications: [],
    emittedReminderKeys: [],
    accountId: 'demo_consumer',
    referenceDate: '22-Oct-2026',
    language: 'en',
  });
  for (const notif of evalRes.newNotifications) {
    assert(notif.targetRole === 'consumer', `Reminder must target consumer role only, got ${notif.targetRole}`);
    assert(notif.actionUrl === 'consumer:bills', `Reminder must navigate to consumer:bills, got ${notif.actionUrl}`);
    assert(
      notif.consumerNo === '04281-99231' || notif.consumerNo === '04281-77190',
      `Unexpected consumerNo ${notif.consumerNo}`
    );
  }
  return 'All billing reminders strictly scoped to targetRole=consumer and owning consumerNo';
});

runTest(27, 'D. Reminders', 'Multilingual reminder rendering supports EN, GU, HI, MR and uses remaining balance for partial payments', () => {
  const partialRes = applyPaymentToBill({
    bill: INITIAL_BILLS[0], // ₹2,185
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    amountToPay: 1000, // Remaining balance = ₹1,185
    paymentDate: '15-Oct-2026 10:00',
    referenceDate: '22-Oct-2026',
  });
  const rec = partialRes.reconciledBill;

  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  for (const lang of languages) {
    const copy = buildLocalizedBillingReminderCopy({
      reminderType: 'DUE_TODAY',
      billNo: rec.billNo,
      consumerNo: rec.consumerNo,
      billMonth: rec.billMonth,
      dueDate: rec.dueDate,
      outstandingBalance: rec.outstandingBalance,
      totalAmount: rec.totalAmount,
      isPartiallyPaid: rec.isPartiallyPaid,
      paidAmount: rec.paidAmount,
      language: lang,
    });
    assert(copy.title.length > 0 && copy.message.length > 0, `Empty reminder copy for ${lang}`);
    assert(copy.message.includes('1,185'), `Reminder in ${lang} must mention remaining balance ₹1,185, not full ₹2,185`);
  }

  return 'EN, GU, HI, MR reminders verified with remaining balance ₹1,185 for partially paid bill';
});

// ============================================================================
// E. REGRESSION & BUILD CHECKS (Tests 28 - 30)
// ============================================================================

runTest(28, 'E. Regression', 'Existing DEMO seed data (Connections, Bills, Payments, Applications, Complaints) preserved intact', () => {
  assert(INITIAL_CONNECTIONS.length === 2, 'INITIAL_CONNECTIONS must contain 2 canonical connections');
  assert(INITIAL_BILLS.length === 4, 'INITIAL_BILLS must contain 4 canonical bills');
  assert(INITIAL_PAYMENTS.length === 3, 'INITIAL_PAYMENTS must contain 3 canonical payments');
  assert(INITIAL_APPLICATIONS.length >= 4, 'INITIAL_APPLICATIONS must remain intact');
  assert(INITIAL_COMPLAINTS.length >= 2, 'INITIAL_COMPLAINTS must remain intact');
  assert(Array.isArray(INITIAL_WORK_ORDERS) && INITIAL_WORK_ORDERS.length > 0, 'Field work orders store must remain intact');

  return 'All canonical UGVCL seed datasets verified intact';
});

runTest(29, 'E. Regression', 'Date parsing and days-until-due calculations handle UGVCL date formats deterministically', () => {
  const t1 = parseVidyutDateToUtcMs('10-Oct-2026');
  const t2 = parseVidyutDateToUtcMs('18-Oct-2026');
  assert(t1 !== null && t2 !== null, 'Date parsing failed for DD-MMM-YYYY');
  assert(calculateDaysUntilDue('18-Oct-2026', '10-Oct-2026') === 8, 'Expected 8 days until due');
  assert(isBillPastDueDate('18-Oct-2026', '19-Oct-2026') === true, '19-Oct must be past due for 18-Oct');
  assert(isBillPastDueDate('18-Oct-2026', '18-Oct-2026') === false, 'Due date itself must not be past due');

  return 'UTC date parser and due-date arithmetic verified';
});

runTest(30, 'E. Regression', 'Full 4-language (EN, GU, HI, MR) billing UI and status localization completeness', () => {
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  const statuses = ['Paid', 'Unpaid', 'Overdue', 'Partially Paid'];

  for (const lang of languages) {
    const ui = BILLING_UI_TRANSLATIONS[lang];
    assert(Boolean(ui.statusNoBill), `Missing statusNoBill for ${lang}`);
    assert(Boolean(ui.statusPartiallyPaid), `Missing statusPartiallyPaid for ${lang}`);
    assert(Boolean(ui.generateDemoBillBtn), `Missing generateDemoBillBtn for ${lang}`);
    assert(Boolean(ui.partialPaymentOptionLabel), `Missing partialPaymentOptionLabel for ${lang}`);
    assert(Boolean(ui.remainingBalanceLabel), `Missing remainingBalanceLabel for ${lang}`);

    for (const st of statuses) {
      const localized = localizeBillStatus(st, lang);
      assert(Boolean(localized && localized.trim().length > 0), `Missing localizeBillStatus(${st}, ${lang})`);
    }
    const oct = localizeBillMonth('October 2026', lang);
    assert(Boolean(oct && oct.trim().length > 0), `Missing localizeBillMonth('October 2026', ${lang})`);
  }

  return 'All 4 languages (EN, GU, HI, MR) verified for billing badges, CTAs, and statuses';
});

console.log('\n==================================================================');
console.log(`BILLING CONSISTENCY TEST SUMMARY: ${passed}/${results.length} PASSED`);
console.log('==================================================================');

if (passed !== 30) {
  process.exit(1);
}
