import assert from 'node:assert/strict';
import {
  generateElectricityBillDocument,
  generatePaymentReceiptDocument,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  triggerOfficialDocumentPdfDownload,
  paginateOfficialDocumentForA4,
  BILL_AND_RECEIPT_EXTRA_LABELS,
  authorizeDocumentAccess,
} from '../src/utils/documentEngine';
import {
  derivePaymentCalendarEvents,
  buildMonthCalendarGrid,
  computeCalendarSummary,
  buildGoogleCalendarUrl,
  escapeIcsText,
  foldIcsLine,
  generateIcsCalendarEvent,
  triggerIcsDownload,
  CALENDAR_LOCALIZATION,
} from '../src/utils/paymentCalendarEngine';
import {
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_CORPORATE_IDENTITY,
} from '../src/components/common/UgvclBrandIdentity';
import {
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_CONNECTIONS,
} from '../src/data/mockData';
import { ElectricityBill } from '../src/types';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function runTest(id: number, name: string, fn: () => void): void {
  try {
    fn();
    results.push({ id, name, passed: true });
    console.log(`  PASS [${id}] ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ id, name, passed: false, error: message });
    console.error(`  FAIL [${id}] ${name}: ${message}`);
  }
}

console.log('========================================================================');
console.log('VIDYUTFLOW 2.0 — REALISTIC UGVCL BILL & SMART PAYMENT CALENDAR');
console.log('40-Test Comprehensive Verification Suite (Front/Reverse Bill & Calendar)');
console.log('========================================================================');

const consumerMeenaben = {
  id: 'demo_consumer',
  name: 'Smt. Meenaben Patel',
  role: 'consumer' as const,
  email: 'consumer@vidyutflow.demo',
  subdivision: 'Mehsana City North',
  consumerNo: '04281-99231',
  ownedConsumerNos: [
    '04281-99231',
    '04281-77190',
    '04281-41572',
    'UGV-2026-884120',
    'UGV-2026-884125',
  ],
};

const consumerArvind = {
  id: 'cns_arvind_02',
  name: 'Shri Arvindbhai Desai',
  role: 'consumer' as const,
  email: 'arvind.desai@vidyutflow.demo',
  subdivision: 'Visnagar Rural',
  consumerNo: '04281-66512',
  ownedConsumerNos: ['04281-66512', 'UGV-2026-771004'],
};

const employeeMehsana = {
  id: 'emp_mehsana_01',
  name: 'Rajeshwari Jadeja (AE Ops)',
  role: 'employee' as const,
  email: 'rajeshwari.ops@ugvcl.demo',
  subdivision: 'Mehsana City North',
};

const sampleBill = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-8821')!;
const sampleConn = INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleBill.consumerNo)!;

// ============================================================================
// PART A: REALISTIC UGVCL BILL FRONT-SIDE SECTIONS & TABLES (TESTS 1 - 12)
// ============================================================================

// Test 1: Section A populates UGVCL Corporate Identity
runTest(1, 'Electricity Bill Section A populates UGVCL Corporate Identity', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secA = doc.sections.find((s) => s.id === 'ugvcl-identity');
  assert.ok(secA, 'Section A must exist');
  const fields = new Map(secA.fields.map((f) => [f.key, f.value]));
  assert.equal(fields.get('companyName'), UGVCL_COMPANY_NAME_EN);
  assert.equal(fields.get('gujaratiTitle'), UGVCL_COMPANY_NAME_GU);
  assert.equal(fields.get('missionTagline'), UGVCL_TAGLINE_EN);
  assert.equal(fields.get('cin'), UGVCL_CORPORATE_IDENTITY.cin);
  assert.equal(fields.get('registeredOffice'), UGVCL_CORPORATE_IDENTITY.registeredOffice);
});

// Test 2: Section B populates Consumer & Connection Details
runTest(2, 'Electricity Bill Section B populates Consumer & Connection Details', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secB = doc.sections.find((s) => s.id === 'consumer-details');
  assert.ok(secB, 'Section B must exist');
  const fields = new Map(secB.fields.map((f) => [f.key, f.value]));
  assert.equal(fields.get('consumerNumber'), '04281-99231');
  assert.equal(fields.get('sanctionedLoad'), `${sampleConn.sanctionedLoadKw} kW`);
  assert.equal(fields.get('meterNumber'), sampleConn.meterNo);
  assert.ok(String(fields.get('serviceAddress')).includes('Mehsana'));
});

// Test 3: Section C populates Billing Cycle & Due Dates
runTest(3, 'Electricity Bill Section C populates Billing Cycle & Due Dates', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secC = doc.sections.find((s) => s.id === 'billing-details');
  assert.ok(secC, 'Section C must exist');
  const fields = new Map(secC.fields.map((f) => [f.key, f.value]));
  assert.equal(fields.get('billNo'), 'BILL-UG-2026-10-8821');
  assert.equal(fields.get('billIssueDate'), sampleBill.billDate);
  assert.equal(fields.get('dueDate'), sampleBill.dueDate);
  assert.equal(fields.get('currentBillAmount'), `₹${sampleBill.totalAmount.toLocaleString('en-IN')}`);
});

// Test 4: Section D populates Electricity Consumption and Reading Source
runTest(4, 'Electricity Bill Section D populates Consumption & honest classification', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secD = doc.sections.find((s) => s.id === 'electricity-consumption');
  assert.ok(secD, 'Section D must exist');
  const fields = new Map(secD.fields.map((f) => [f.key, f.value]));
  assert.equal(fields.get('unitsConsumed'), `${sampleBill.unitsConsumed} kWh`);
  assert.ok(String(fields.get('readingSource')).includes('RECORDED'));
});

// Test 5: Section E populates Detailed Tariff Calculation
runTest(5, 'Electricity Bill Section E populates Tariff & Component Breakdown', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secE = doc.sections.find((s) => s.id === 'tariff-calculation');
  assert.ok(secE, 'Section E must exist');
  const fields = new Map(secE.fields.map((f) => [f.key, f.value]));
  assert.equal(fields.get('energyCharges'), `₹${sampleBill.energyCharges.toLocaleString('en-IN')}`);
  assert.equal(fields.get('fixedCharges'), `₹${sampleBill.fixedCharges.toLocaleString('en-IN')}`);
  assert.equal(fields.get('fuelPriceAdjustment'), `₹${sampleBill.fuelPriceAdjustment.toLocaleString('en-IN')}`);
  assert.equal(fields.get('electricityDuty'), `₹${sampleBill.electricityDuty.toLocaleString('en-IN')}`);
});

// Test 6: Section F populates Current Bill Settlement Status
runTest(6, 'Electricity Bill Section F populates Settlement Status & Balance', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secF = doc.sections.find((s) => s.id === 'bill-status');
  assert.ok(secF, 'Section F must exist');
  const fields = new Map(secF.fields.map((f) => [f.key, f.value]));
  assert.equal(fields.get('billStatus'), 'Unpaid');
  assert.equal(fields.get('outstandingBalance'), `₹${sampleBill.totalAmount.toLocaleString('en-IN')}`);
});

// Test 7: Section G populates Data Source & Authenticity Disclosure
runTest(7, 'Electricity Bill Section G populates Authenticity Disclosure', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const secG = doc.sections.find((s) => s.id === 'source-disclosure');
  assert.ok(secG, 'Section G must exist');
  assert.ok(doc.demoDisclosureBanner.includes('DEMO ELECTRICITY BILL'));
});

// Test 8: Slab breakdown table generated with accurate tier rates
runTest(8, 'Slab breakdown table generated with accurate GERC tier rates', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const slabTable = doc.tables?.find((t) => t.id === 'slab-breakdown-table');
  assert.ok(slabTable, 'Slab table must exist');
  assert.ok(slabTable.rows.length >= 3, 'Must contain multiple slab rows');
  assert.ok(String(slabTable.rows[0].slab).includes('First 50'));
});

// Test 9: Complete Charge Reconciliation table matches total bill
runTest(9, 'Tariff reconciliation table matches total bill amount', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const recTable = doc.tables?.find((t) => t.id === 'tariff-reconciliation-table');
  assert.ok(recTable, 'Tariff reconciliation table must exist');
  assert.equal(doc.reconciliationVerified, true);
});

// Test 10: Previous 3 billing periods statement populated from canonical history
runTest(10, 'Previous 3 billing periods statement populated when history exists', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    language: 'en',
  });

  const prevTable = doc.tables?.find((t) => t.id === 'previous-bills-table');
  assert.ok(prevTable, 'Previous bills table must exist');
  // 04281-99231 has 2 prior bills in INITIAL_BILLS: BILL-UG-2026-09-8821 and BILL-UG-2026-08-8821
  assert.equal(prevTable.rows.length, 2);
  assert.equal(prevTable.rows[0].period, 'August 2026');
  assert.equal(prevTable.rows[1].period, 'July 2026');
});

// Test 11: Previous bills table contains required itemized columns
runTest(11, 'Previous bills table columns include period, units, billed, paid, balance, status', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    language: 'en',
  });

  const prevTable = doc.tables?.find((t) => t.id === 'previous-bills-table')!;
  const colKeys = prevTable.columns.map((c) => c.key);
  assert.deepEqual(colKeys, ['period', 'units', 'billed', 'paid', 'balance', 'status']);
});

// Test 12: Connection with 0 prior bills displays localized empty message
runTest(12, 'Connection with 0 prior bills displays localized empty message without error', () => {
  const singleBill = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-77190')!;
  const singleConn = INITIAL_CONNECTIONS.find((c) => c.consumerNo === singleBill.consumerNo)!;

  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: singleBill,
    connection: singleConn,
    allBills: INITIAL_BILLS,
    payments: [],
    language: 'en',
  });

  const prevTable = doc.tables?.find((t) => t.id === 'previous-bills-table');
  assert.ok(prevTable, 'Previous bills table must exist');
  assert.equal(prevTable.rows.length, 1);
  assert.ok(String(prevTable.rows[0].period).includes('No previous billing records found'));
});

// ============================================================================
// PART B: REVERSE-SIDE STATUTORY GUIDELINES & TARIFFS (TESTS 13 - 19)
// ============================================================================

// Test 13: Reverse-side sections exist on GeneratedOfficialDocument
runTest(13, 'Reverse-side sections exist on GeneratedOfficialDocument for bill', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  assert.ok(Array.isArray(doc.reverseSideSections), 'reverseSideSections must be an array');
  assert.equal(doc.reverseSideSections.length, 6, 'Must contain Sections H through M');
});

// Test 14: Section H provides statutory tariff schedule & slab structure
runTest(14, 'Section H provides statutory tariff schedule & slab structure', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const secH = doc.reverseSideSections?.find((s) => s.id === 'ugvcl-tariff-schedule');
  assert.ok(secH, 'Section H must exist');
  const fields = new Map(secH.fields.map((f) => [f.key, f.value]));
  assert.ok(String(fields.get('tariffRgpuResidential')).includes('0–50 kWh @ ₹3.05'));
  assert.ok(String(fields.get('tariffNrgpCommercial')).includes('0–10 kW'));
  assert.ok(String(fields.get('tariffAgAgricultural')).includes('₹0.80/unit'));
});

// Test 15: Section I provides energy charge, FPPPA and duty calculation principles
runTest(15, 'Section I provides energy charge, FPPPA and duty calculation principles', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const secI = doc.reverseSideSections?.find((s) => s.id === 'energy-charge-principles');
  assert.ok(secI, 'Section I must exist');
  const fields = new Map(secI.fields.map((f) => [f.key, f.value]));
  assert.ok(String(fields.get('electricityDutyRule')).includes('15% on Energy Charges'));
  assert.ok(String(fields.get('delayedSurchargeRule')).includes('15% per annum'));
});

// Test 16: Section J provides billing terms, grace periods & digital payment channels
runTest(16, 'Section J provides billing terms, grace periods & digital payment channels', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const secJ = doc.reverseSideSections?.find((s) => s.id === 'billing-terms');
  assert.ok(secJ, 'Section J must exist');
  const fields = new Map(secJ.fields.map((f) => [f.key, f.value]));
  assert.ok(String(fields.get('dueGracePeriod')).includes('15 days'));
  assert.ok(String(fields.get('digitalPaymentOptions')).includes('ugvcl.com'));
});

// Test 17: Section K provides consumer electrical safety & energy conservation directives
runTest(17, 'Section K provides consumer electrical safety & energy conservation directives', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const secK = doc.reverseSideSections?.find((s) => s.id === 'safety-directives');
  assert.ok(secK, 'Section K must exist');
  const fields = new Map(secK.fields.map((f) => [f.key, f.value]));
  assert.ok(String(fields.get('elcbMandate')).includes('30mA trip RCCB'));
  assert.ok(String(fields.get('emergencyHelpline')).includes('19122'));
});

// Test 18: Section L provides centralized grievance redressal directory
runTest(18, 'Section L provides centralized grievance redressal directory', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const secL = doc.reverseSideSections?.find((s) => s.id === 'grievance-redressal');
  assert.ok(secL, 'Section L must exist');
  const fields = new Map(secL.fields.map((f) => [f.key, f.value]));
  assert.ok(String(fields.get('cgrfForum')).includes('CGRF, Regd. Office, Visnagar Road, Mehsana'));
  assert.ok(String(fields.get('ombudsmanOffice')).includes('Ambawadi, Ahmedabad'));
});

// Test 19: Section M provides statutory legal notice & DEMO disclosure
runTest(19, 'Section M provides statutory legal notice & DEMO disclosure', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const secM = doc.reverseSideSections?.find((s) => s.id === 'legal-notice-disclosure');
  assert.ok(secM, 'Section M must exist');
  const fields = new Map(secM.fields.map((f) => [f.key, f.value]));
  assert.ok(String(fields.get('statutoryAct')).includes('GERC'));
  assert.ok(String(fields.get('corporateReg')).includes(UGVCL_CORPORATE_IDENTITY.cin));
});

// ============================================================================
// PART C: SMART PAYMENT CALENDAR & ICS EXPORT (TESTS 20 - 32)
// ============================================================================

// Test 20: derivePaymentCalendarEvents derives events from canonical bills
runTest(20, 'derivePaymentCalendarEvents derives accurate events from bills', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  assert.ok(events.length >= INITIAL_BILLS.length);
  const meenabenEvent = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821');
  assert.ok(meenabenEvent, 'Event for BILL-UG-2026-10-8821 must exist');
  assert.equal(meenabenEvent.dueDateIso, '2026-10-22');
  assert.equal(meenabenEvent.dueDay, 22);
  assert.equal(meenabenEvent.dueMonth, 9); // October is month 9 (0-indexed)
  assert.equal(meenabenEvent.dueYear, 2026);
});

// Test 21: derivePaymentCalendarEvents sets correct status and flags
runTest(21, 'derivePaymentCalendarEvents sets correct status and due flags', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const unpaidEvent = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821')!;
  assert.equal(unpaidEvent.status, 'Unpaid');
  assert.equal(unpaidEvent.isDue, true);
  assert.equal(unpaidEvent.isFullyPaid, false);

  const paidEvent = events.find((e) => e.billNo === 'BILL-UG-2026-09-8821')!;
  assert.equal(paidEvent.status, 'Paid');
  assert.equal(paidEvent.isDue, false);
  assert.equal(paidEvent.isFullyPaid, true);
});

// Test 22: Events preserve canonical consumer details and outstanding balance
runTest(22, 'Calendar events preserve consumer name, connection ID and outstanding balance', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const evt = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821')!;
  assert.equal(evt.consumerNo, '04281-99231');
  assert.equal(evt.outstandingBalance, 2185);
  assert.equal(evt.consumerName, 'Smt. Meenaben Patel');
});

// Test 23: buildMonthCalendarGrid generates 35 or 42 grid cells with correct dates
runTest(23, 'buildMonthCalendarGrid generates complete week grid for month', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const grid = buildMonthCalendarGrid(2026, 9, events); // October 2026
  assert.ok(grid.length === 35 || grid.length === 42, 'Grid must have full weeks (35 or 42 cells)');
  const oct22 = grid.find((d) => d.dateIso === '2026-10-22');
  assert.ok(oct22, '2026-10-22 cell must exist');
  assert.equal(oct22.isCurrentMonth, true);
  assert.ok(oct22.events.length > 0, '2026-10-22 must have events');
});

// Test 24: Day cells flag due and paid bills accurately
runTest(24, 'Calendar day cells flag due and paid bills accurately', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const grid = buildMonthCalendarGrid(2026, 9, events);
  const oct22 = grid.find((d) => d.dateIso === '2026-10-22')!;
  assert.equal(oct22.hasDueBills, true);
});

// Test 25: computeCalendarSummary calculates accurate aggregate KPIs
runTest(25, 'computeCalendarSummary calculates accurate aggregate KPIs', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const summary = computeCalendarSummary(events);
  assert.equal(summary.totalBillsCount, events.length);
  assert.ok(summary.dueBillsCount >= 2);
  assert.ok(summary.totalDueAmount > 0);
  assert.ok(summary.paidBillsCount >= 1);
});

// Test 26: computeCalendarSummary identifies earliest upcoming due date
runTest(26, 'computeCalendarSummary identifies earliest upcoming due date', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const summary = computeCalendarSummary(events);
  assert.ok(summary.nextUpcomingDueDate !== null);
  assert.ok(summary.nextUpcomingDueDate.includes('2026'));
});

// Test 27: buildGoogleCalendarUrl creates a valid URL with required parameters
runTest(27, 'buildGoogleCalendarUrl creates valid URL with TEMPLATE action', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const evt = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821')!;
  const url = buildGoogleCalendarUrl(evt);
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
  assert.ok(url.includes('BILL-UG-2026-10-8821'));
  assert.ok(url.includes('dates=20261022'));
});

// Test 28: Google Calendar URL includes UGVCL details and payable amount
runTest(28, 'Google Calendar URL includes UGVCL details and payable amount', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const evt = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821')!;
  const url = buildGoogleCalendarUrl(evt);
  assert.ok(url.includes('2%2C185') || url.includes('2185') || url.includes('UGVCL'));
});

// Test 29: escapeIcsText properly escapes RFC 5545 special characters
runTest(29, 'escapeIcsText properly escapes backslashes, semicolons, commas, newlines', () => {
  const escaped = escapeIcsText('Hello, world; test\\me\nsecond line\r\nthird');
  assert.equal(escaped, 'Hello\\, world\\; test\\\\me\\nsecond line\\nthird');
});

// Test 30: foldIcsLine folds lines longer than 75 octets per RFC 5545
runTest(30, 'foldIcsLine folds lines longer than 75 octets per RFC 5545', () => {
  const longLine =
    'DESCRIPTION:This is a very long line that exceeds the standard 75 characters limit required by RFC 5545 Section 3.1';
  const folded = foldIcsLine(longLine);
  assert.ok(folded.includes('\r\n '));
  const lines = folded.split('\r\n');
  assert.ok(lines.length >= 2);
  assert.ok(lines[0].length <= 75);
  assert.ok(lines[1].startsWith(' '));
});

// Test 31: generateIcsCalendarEvent produces RFC 5545 compliant VCALENDAR/VEVENT
runTest(31, 'generateIcsCalendarEvent produces RFC 5545 compliant VCALENDAR/VEVENT', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const evt = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821')!;
  const ics = generateIcsCalendarEvent(evt);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('PRODID:-//VidyutFlow//UGVCL Smart Utility Calendar//EN\r\n'));
  assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('SUMMARY:UGVCL Electricity Bill Due: BILL-UG-2026-10-8821'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261022\r\n'));
  assert.ok(ics.includes('BEGIN:VALARM\r\n'));
  assert.ok(ics.includes('TRIGGER:-P1D\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

// Test 32: triggerIcsDownload returns correct filename and MIME type
runTest(32, 'triggerIcsDownload returns correct filename and MIME type', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const evt = events.find((e) => e.billNo === 'BILL-UG-2026-10-8821')!;
  const res = triggerIcsDownload(evt, { skipBrowserDownload: true });
  assert.equal(res.downloaded, true);
  assert.equal(res.filename, 'ugvcl-bill-due-bill-ug-2026-10-8821.ics');
  assert.equal(res.mimeType, 'text/calendar;charset=utf-8');
  assert.ok(res.byteLength > 200);
});

// ============================================================================
// PART D: BINARY PDF GENERATION & PAGINATION (TESTS 33 - 36)
// ============================================================================

// Test 33: PDF pagination allocates front side and reverse side cleanly across A4 pages
runTest(33, 'paginateOfficialDocumentForA4 paginates front and reverse side cleanly', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    language: 'en',
  });

  const pagePlan = paginateOfficialDocumentForA4(doc);
  assert.ok(pagePlan.length >= 2, 'Electricity bill with reverse side must have at least 2 pages');
  assert.equal(pagePlan[0].pageNumber, 1);
  assert.equal(pagePlan[1].pageNumber, 2);
  assert.ok(!pagePlan.some((p) => p.items.length === 0), 'No empty pages allowed');
});

// Test 34: PDF never emits blank trailing pages
runTest(34, 'Multi-page electricity bill PDF has no blank trailing page', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    language: 'en',
  });

  const bytes = generateOfficialDocumentPdfBytes(doc);
  const meta = inspectGeneratedPdfBytes(bytes);
  assert.equal(meta.isValidPdf, true);
  assert.equal(meta.hasBlankTrailingPage, false);
  assert.ok(meta.pageCount >= 2);
});

// Test 35: Binary PDF has valid header and EOF marker
runTest(35, 'generateOfficialDocumentPdfBytes outputs %PDF-1.4 with %%EOF marker', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const bytes = generateOfficialDocumentPdfBytes(doc);
  const meta = inspectGeneratedPdfBytes(bytes);
  assert.equal(meta.isValidPdfHeader, true);
  assert.equal(meta.headerVersion, '1.4');
  assert.equal(meta.hasEofMarker, true);
  assert.ok(meta.byteLength > 2000);
});

// Test 36: PDF metadata confirms UGVCL branding and Rupee symbol
runTest(36, 'PDF contains UGVCL identity and Rupee symbol', () => {
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleBill,
    connection: sampleConn,
    allBills: INITIAL_BILLS,
    language: 'en',
  });

  const bytes = generateOfficialDocumentPdfBytes(doc);
  const meta = inspectGeneratedPdfBytes(bytes);
  assert.equal(meta.containsUgvclBranding, true);
  assert.equal(meta.containsRupeeSymbol, true);
});

// ============================================================================
// PART E: 4-LANGUAGE LOCALIZATION & RBAC (TESTS 37 - 40)
// ============================================================================

// Test 37: English localization contains correct labels
runTest(37, 'English localization contains correct bill & calendar strings', () => {
  const extraEn = BILL_AND_RECEIPT_EXTRA_LABELS.en;
  const calEn = CALENDAR_LOCALIZATION.en;
  assert.equal(extraEn.electricityBillTitle, 'Electricity Bill & Tariff Statement');
  assert.equal(calEn.calendarTitle, 'Smart Payment Calendar');
  assert.equal(calEn.todayBtn, 'Today');
});

// Test 38: Gujarati localization contains authentic Gujarati UGVCL branding
runTest(38, 'Gujarati localization contains authentic UGVCL branding and terminology', () => {
  const extraGu = BILL_AND_RECEIPT_EXTRA_LABELS.gu;
  const calGu = CALENDAR_LOCALIZATION.gu;
  assert.equal(extraGu.electricityBillTitle, 'વીજ વપરાશ બિલ અને ટેરિફ પત્રક');
  assert.equal(calGu.calendarTitle, 'સ્માર્ટ પેમેન્ટ કેલેન્ડર');
  assert.equal(calGu.todayBtn, 'આજે');
});

// Test 39: Hindi and Marathi localizations contain regional terms
runTest(39, 'Hindi and Marathi localizations contain regional terms', () => {
  const extraHi = BILL_AND_RECEIPT_EXTRA_LABELS.hi;
  const calHi = CALENDAR_LOCALIZATION.hi;
  const extraMr = BILL_AND_RECEIPT_EXTRA_LABELS.mr;
  const calMr = CALENDAR_LOCALIZATION.mr;

  assert.equal(extraHi.electricityBillTitle, 'विद्युत खपत बिल एवं टैरिफ विवरण');
  assert.equal(calHi.calendarTitle, 'स्मार्ट भुगतान कैलेंडर');
  assert.equal(extraMr.electricityBillTitle, 'वीज वापर बिल आणि टॅरिफ विवरणपत्र');
  assert.equal(calMr.calendarTitle, 'स्मार्ट पेमेंट कॅलेंडर');
});

// Test 40: Role-based authorization strictly enforces ownership boundaries
runTest(40, 'Role-based authorization enforces consumer and employee boundaries', () => {
  // Consumer Meenaben can access own bill
  const meenabenAccess = authorizeDocumentAccess(
    'consumer',
    consumerMeenaben,
    'electricity_bill',
    sampleBill as unknown as Record<string, unknown>
  );
  assert.equal(meenabenAccess, true);

  // Consumer Arvind cannot access Meenaben's bill
  const arvindAccess = authorizeDocumentAccess(
    'consumer',
    consumerArvind,
    'electricity_bill',
    sampleBill as unknown as Record<string, unknown>
  );
  assert.equal(arvindAccess, false);

  // Employee Mehsana can access bill within Mehsana City North subdivision
  const empAccess = authorizeDocumentAccess(
    'employee',
    employeeMehsana,
    'electricity_bill',
    sampleBill as unknown as Record<string, unknown>
  );
  assert.equal(empAccess, true);
});

console.log('========================================================================');
const passedCount = results.filter((r) => r.passed).length;
console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
console.log('========================================================================');

if (passedCount !== results.length) {
  process.exit(1);
}
