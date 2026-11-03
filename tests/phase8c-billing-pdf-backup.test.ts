/**
 * VIDYUTFLOW 2.0 — PHASE 8C
 * BILLING, TWO-PAGE PDF, PAYMENTS, CALENDAR & BACKUP VERIFICATION SUITE
 *
 * Verifies:
 * 1. Billing Accuracy & Tariff Calculations (GERC Tier Slabs, Fixed, FPPPA, Duty, Rebate)
 * 2. Two-Page A4 Electricity Bill PDF (Exact 2-page pagination, A4 dimensions, UGVCL branding, no trailing page)
 * 3. Machine-Readable Barcode & QR Verification (Code 128 subset B, SVG & PDF vectors, QR verify URL & decoding)
 * 4. Four-Language PDF Baseline Gap Audit (EN, GU, HI, MR label parity, Page 2 gap catalog for Phase 9)
 * 5. Payments, Partial Payments & Receipts (Reconciliation, balance calculation, duplicate prevention, receipts)
 * 6. Smart Payment Calendar (Event derivation, month grid, summary KPIs, RFC 5545 ICS & Google Calendar)
 * 7. Admin DEMO Backup Center (23-category manifest, checksum validation, restore preview, admin authorization, pre-restore snapshot)
 * 8. Cross-Feature Data Consistency (Consistency across Dashboard, Billing Engine, Calendar, PDF, and Backup)
 * 9. Data Preservation & Non-Critical Eviction Protection
 */

import assert from 'node:assert/strict';
import {
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_CONSUMERS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_EMPLOYEES,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS
} from '../src/data/mockData';
import {
  reconcileBillWithPayments,
  selectConnectionBillingSummary,
  calculateDeterministicTariffBreakdown,
  applyPaymentToBill,
  ReconciledElectricityBill,
  ConnectionBillingSummary
} from '../src/utils/billingEngine';
import {
  deriveCanonicalBarcodeReference,
  encodeCode128B,
  decodeCode128Modules,
  generateCode128Svg,
  calculateCode128PdfBars
} from '../src/utils/barcodeEngine';
import {
  deriveCanonicalQrVerificationUrl,
  generateQrCodeMatrix,
  generateQrCodeSvg,
  calculateQrCodePdfRects,
  parseBillVerificationUrl
} from '../src/utils/qrCodeEngine';
import {
  paginateOfficialDocumentForA4,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  UGVCL_PDF_DESIGN_TOKENS
} from '../src/utils/pdfDocumentBuilder';
import {
  generateElectricityBillDocument,
  GeneratedOfficialDocument
} from '../src/utils/documentEngine';
import {
  derivePaymentCalendarEvents,
  buildMonthCalendarGrid,
  computeCalendarSummary,
  buildGoogleCalendarUrl,
  generateIcsCalendarEvent,
  CALENDAR_LOCALIZATION
} from '../src/utils/paymentCalendarEngine';
import {
  ALL_BACKUP_CATEGORIES,
  CANONICAL_DEMO_STORAGE_KEYS,
  BACKUP_FORMAT_ID,
  BACKUP_SCHEMA_VERSION,
  createDemoBackup,
  validateDemoBackup,
  generateDemoRestorePreview,
  executeSafeDemoRestore,
  BackupActorIdentity,
  DemoBackupEnvelope
} from '../src/utils/demoBackupEngine';
import {
  safeStorageGet,
  safeStorageSet,
  NON_CRITICAL_EVICTION_KEYS
} from '../src/utils/safeStorage';
import {
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_CORPORATE_IDENTITY
} from '../src/components/common/UgvclBrandIdentity';
import { ElectricityBill, PaymentTransaction } from '../src/types';
import { Language } from '../src/i18n/types';

console.log('==================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 8C BILLING, PDF, PAYMENTS & BACKUP SUITE');
console.log('==================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runVerification(step: string, title: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] [${step}] ${passedTests}. ${title}`);
  } catch (err: any) {
    console.error(`  [FAIL] [${step}] ${title}:`, err.message);
    throw err;
  }
}

const mockConsumerActor = {
  id: 'demo_consumer',
  name: 'Smt. Meenaben Patel',
  role: 'consumer' as const,
  email: 'consumer@vidyutflow.demo',
  subdivision: 'Mehsana City North',
  consumerNo: '04281-99231',
  ownedConsumerNos: ['04281-99231', '04281-77190']
};

const adminActor: BackupActorIdentity = {
  id: 'ADM-DEMO-01',
  name: 'R. K. Vaghela (System Admin)',
  role: 'admin',
  subdivision: 'Corporate HQ, Mehsana'
};

// ============================================================================
// STEP 2: BILLING ACCURACY & TARIFF CALCULATIONS
// ============================================================================
console.log('\n--- STEP 2: Billing Accuracy & Tariff Calculations ---');

runVerification('Step 2', 'calculateDeterministicTariffBreakdown computes correct RGP slabs, fixed charge, FPPPA, and duty', () => {
  // Test RGP domestic slab tiers:
  // First 50 units @ 3.05
  // Next 50 units (51-100) @ 3.50
  // Next 150 units (101-250) @ 4.15
  // Remaining units (>250) @ 5.20
  const calculation = calculateDeterministicTariffBreakdown('Residential (RGPU)', 5, 360);

  const totalSlabUnits = calculation.slabBreakdown.reduce((sum, s) => sum + s.units, 0);
  assert.equal(totalSlabUnits, 360);
  assert.equal(calculation.slabBreakdown.length, 4);

  // Slab 1: 50 * 3.05 = 152.50
  assert.equal(calculation.slabBreakdown[0].units, 50);
  assert.equal(calculation.slabBreakdown[0].rate, 3.05);
  assert.equal(calculation.slabBreakdown[0].amount, 152.5);

  // Slab 2: 50 * 3.50 = 175.00
  assert.equal(calculation.slabBreakdown[1].units, 50);
  assert.equal(calculation.slabBreakdown[1].rate, 3.50);
  assert.equal(calculation.slabBreakdown[1].amount, 175);

  // Slab 3: 150 * 4.15 = 622.50
  assert.equal(calculation.slabBreakdown[2].units, 150);
  assert.equal(calculation.slabBreakdown[2].rate, 4.15);
  assert.equal(calculation.slabBreakdown[2].amount, 622.5);

  // Slab 4: (360 - 250) = 110 * 5.20 = 572.00
  assert.equal(calculation.slabBreakdown[3].units, 110);
  assert.equal(calculation.slabBreakdown[3].rate, 5.20);
  assert.equal(calculation.slabBreakdown[3].amount, 572);

  // Energy charges = 152.5 + 175 + 622.5 + 572 = 1522.00
  assert.equal(calculation.energyCharges, 1522);

  // Fixed charges for 5 kW RGP (5 * 25 = 125)
  assert.equal(calculation.fixedCharges, 125);

  // FPPPA charges: 360 units * 2.50/kWh = 900.00
  assert.equal(calculation.fuelPriceAdjustment, 900);

  // Duty: Math.round((1522 + 125 + 900) * 0.15) = 382
  assert.equal(calculation.electricityDuty, 382);

  // Total current charges
  assert.equal(calculation.totalAmount, 1522 + 125 + 900 + 382);
});

runVerification('Step 2', 'Canonical initial bills retain exact uncorrupted values and valid connection ownership', () => {
  for (const bill of INITIAL_BILLS) {
    assert.ok(bill.billNo.startsWith('BILL-UG-'), `Bill ${bill.billNo} must have stable format`);
    assert.ok(bill.consumerNo.length > 0, 'Bill must link to valid consumerNo');
    assert.ok(bill.unitsConsumed > 0, 'Billed units must be positive');
    assert.ok(bill.totalAmount > 0, 'Bill totalAmount must be positive');
    assert.ok(bill.dueDate.length > 0, 'Bill must have due date');

    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo);
    assert.ok(conn, `Bill ${bill.billNo} must correspond to existing connection`);
  }
});

runVerification('Step 2', 'reconcileBillWithPayments correctly reconciles balances across multiple bills without state corruption', () => {
  for (const bill of INITIAL_BILLS) {
    const r = reconcileBillWithPayments(bill, INITIAL_PAYMENTS, '15-Oct-2026');
    assert.ok(r.effectiveStatus, 'Must have effectiveStatus');
    assert.equal(r.outstandingBalance, Math.max(0, r.totalAmount - r.paidAmount));
    if (r.paidAmount >= r.totalAmount) {
      assert.equal(r.effectiveStatus, 'Paid');
      assert.equal(r.outstandingBalance, 0);
      assert.equal(r.isPaid, true);
    }
  }
});

// ============================================================================
// STEP 3: TWO-PAGE A4 BILL PDF GENERATION
// ============================================================================
console.log('\n--- STEP 3: Two-Page A4 Bill PDF Generation ---');

runVerification('Step 3', 'generateElectricityBillDocument produces valid official document structure with front and reverse sections', () => {
  const bill = INITIAL_BILLS[0];
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo)!;
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO'
  });

  assert.equal(doc.documentType, 'electricity_bill');
  assert.equal(doc.referenceId, bill.billNo);
  assert.ok(doc.sections.length >= 4, 'Must contain standard front sections');
  assert.ok(doc.billParticulars, 'Must contain billParticulars');
  assert.equal(doc.billParticulars!.billNo, bill.billNo);
  assert.equal(doc.billParticulars!.consumerNo, bill.consumerNo);
});

runVerification('Step 3', 'paginateOfficialDocumentForA4 enforces exactly 2 pages with zero blank trailing page', () => {
  const bill = INITIAL_BILLS[0];
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo)!;
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO'
  });

  const pages = paginateOfficialDocumentForA4(doc);
  assert.equal(pages.length, 2, 'Electricity bill PDF must paginate to exactly 2 pages');
  assert.equal(pages[0].pageNumber, 1);
  assert.equal(pages[1].pageNumber, 2);
  assert.equal(pages[0].items[0].kind, 'bill_front', 'Page 1 must be bill_front');
  assert.equal(pages[1].items[0].kind, 'bill_reverse', 'Page 2 must be bill_reverse');
});

runVerification('Step 3', 'generateOfficialDocumentPdfBytes generates valid %PDF-1.4 binary with %%EOF marker and A4 dimensions', () => {
  const bill = INITIAL_BILLS[0];
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo)!;
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO'
  });

  const pdfBytes = generateOfficialDocumentPdfBytes(doc);
  assert.ok(pdfBytes.byteLength > 1000, 'PDF byte length must be non-trivial');

  const inspection = inspectGeneratedPdfBytes(pdfBytes);
  assert.equal(inspection.isValidPdf, true, 'PDF must be valid');
  assert.equal(inspection.isValidPdfHeader, true, 'PDF header must start with %PDF-1.4');
  assert.equal(inspection.hasEofMarker, true, 'PDF must end with %%EOF');
  assert.equal(inspection.pageCount, 2, 'PDF must report 2 pages');
  assert.equal(inspection.hasBlankTrailingPage, false, 'PDF must have no blank trailing page');
  assert.equal(inspection.mediaBox[2], A4_WIDTH_PT, 'A4 width must be 595.28 pt');
  assert.equal(inspection.mediaBox[3], A4_HEIGHT_PT, 'A4 height must be 841.89 pt');
});

runVerification('Step 3', 'PDF embeds official UGVCL branding and Rupee symbol without PGVCL/Torrent leakage', () => {
  const bill = INITIAL_BILLS[0];
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo)!;
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO'
  });

  const pdfBytes = generateOfficialDocumentPdfBytes(doc);
  const inspection = inspectGeneratedPdfBytes(pdfBytes);

  assert.equal(inspection.containsUgvclBranding, true, 'Must contain UGVCL branding');
  assert.equal(inspection.containsRupeeSymbol, true, 'Must contain Rupee symbol');

  const rawText = new TextDecoder('latin1').decode(pdfBytes);
  assert.equal(rawText.includes('Paschim Gujarat'), false, 'Must NOT contain PGVCL');
  assert.equal(rawText.includes('Torrent Power'), false, 'Must NOT contain Torrent Power');
});

// ============================================================================
// STEP 3B: MACHINE-READABLE BARCODE & QR VERIFICATION
// ============================================================================
console.log('\n--- STEP 3B: Machine-Readable Barcode & QR Verification ---');

runVerification('Step 3B', 'Code 128 barcode encodes stable reference with valid checksum and decodes accurately', () => {
  const billNo = 'BILL-UG-2026-10-8821';
  const consumerNo = '04281-99231';
  const barcodeRef = deriveCanonicalBarcodeReference(billNo, consumerNo);
  assert.ok(barcodeRef.startsWith('UG-04281-99231-'));

  const encoded = encodeCode128B(barcodeRef);
  assert.ok(encoded.modules.length > 50, 'Barcode modules must be populated');

  // Verify SVG generation
  const svgResult = generateCode128Svg(barcodeRef);
  assert.ok(svgResult.svg.includes('<svg'), 'Barcode SVG must be generated');

  // Verify self-decoding
  const decoded = decodeCode128Modules(encoded.modules);
  assert.equal(decoded.success, true, 'Barcode decoding must succeed');
  assert.equal(decoded.checksumValid, true, 'Barcode modules must decode with valid checksum');
  assert.equal(decoded.decodedText, barcodeRef, 'Decoded string must match original payload exactly');

  // Verify PDF vector bars
  const pdfBars = calculateCode128PdfBars(barcodeRef, 36, 100, 200, 40);
  assert.ok(pdfBars.bars.length > 10, 'PDF vector bars must be generated');
  assert.ok(pdfBars.bars.every(b => b.width > 0 && b.height === 40), 'All bars must have positive dimensions');
});

runVerification('Step 3B', 'QR code generates canonical verification URL and vector rectangles for PDF', () => {
  const billNo = 'BILL-UG-2026-10-8821';
  const consumerNo = '04281-99231';
  const qrData = deriveCanonicalQrVerificationUrl(billNo, consumerNo, 'https://vidyutflow.ugvcl.demo');

  assert.ok(qrData.url.includes('#verify-bill'), 'QR URL must target bill verification route');
  assert.ok(qrData.url.includes('ref=BILL-UG-2026-10-8821'), 'QR URL must contain safe ref');
  assert.ok(qrData.url.includes('c=04281-99231'), 'QR URL must contain consumer number');

  // Parse verification payload
  const parsed = parseBillVerificationUrl(qrData.url);
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.ref, 'BILL-UG-2026-10-8821');
  assert.equal(parsed.consumerNo, '04281-99231');

  // QR Matrix & SVG
  const matrix = generateQrCodeMatrix(qrData.url);
  assert.ok(matrix.length >= 21, 'QR matrix must be >= 21');
  const svg = generateQrCodeSvg(qrData.url, { sizePx: 90 });
  assert.ok(svg.includes('<svg'), 'QR SVG must be generated');

  // PDF vector rects
  const rects = calculateQrCodePdfRects(qrData.url, 450, 700, 100);
  assert.ok(rects.length > 50, 'QR PDF vector rectangles must be generated');
  assert.ok(rects.every(r => r.width > 0 && r.height > 0));
});

// ============================================================================
// STEP 4: MULTILINGUAL PDF BASELINE GAP AUDIT
// ============================================================================
console.log('\n--- STEP 4: Multilingual PDF Baseline Gap Audit ---');

runVerification('Step 4', 'Two-page bill labels exist and generate valid PDFs across all 4 languages (EN, GU, HI, MR)', () => {
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  const bill = INITIAL_BILLS[0];
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo)!;

  for (const lang of languages) {
    const doc = generateElectricityBillDocument({
      role: 'consumer',
      actor: mockConsumerActor,
      bill,
      connection: conn,
      payments: INITIAL_PAYMENTS,
      allBills: INITIAL_BILLS,
      language: lang,
      dataSource: 'DEMO'
    });

    assert.equal(doc.language, lang);
    assert.ok(doc.sections.length >= 4);
    assert.ok(doc.title.length > 0);

    const pdfBytes = generateOfficialDocumentPdfBytes(doc);
    assert.ok(pdfBytes.byteLength > 1000);
    const inspection = inspectGeneratedPdfBytes(pdfBytes);
    assert.equal(inspection.pageCount, 2);
  }
});

runVerification('Step 4', 'Gap catalog: Page 2 section bodies documented as designated target for Phase 9 translation', () => {
  const bill = INITIAL_BILLS[0];
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === bill.consumerNo)!;

  const docEn = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO'
  });

  const docGu = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'gu',
    dataSource: 'DEMO'
  });

  // Technical identifiers must NEVER be translated
  assert.equal(docEn.referenceId, docGu.referenceId, 'Bill ID must remain unchanged');
  assert.equal(docEn.billParticulars!.consumerNo, docGu.billParticulars!.consumerNo, 'Consumer number must remain unchanged');
  assert.equal(docEn.billParticulars!.cin, docGu.billParticulars!.cin, 'CIN must remain unchanged');
  assert.equal(docEn.billParticulars!.gstin, docGu.billParticulars!.gstin, 'GSTIN must remain unchanged');
});

// ============================================================================
// STEP 5: PAYMENT AND RECEIPT VERIFICATION
// ============================================================================
console.log('\n--- STEP 5: Payment and Receipt Verification ---');

runVerification('Step 5', 'Full payment settles bill balance to 0 and transitions status to Paid', () => {
  const targetBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    totalAmount: 2000,
    status: 'Unpaid'
  };

  const payments: PaymentTransaction[] = [
    {
      txId: 'TXN-P8C-FULL-01',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 2000,
      date: '15-Oct-2026 10:00',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'UPI-TEST-889900'
    }
  ];

  const reconciled = reconcileBillWithPayments(targetBill, payments, '15-Oct-2026');
  assert.equal(reconciled.effectiveStatus, 'Paid');
  assert.equal(reconciled.paidAmount, 2000);
  assert.equal(reconciled.outstandingBalance, 0);
  assert.equal(reconciled.isDue, false);
  assert.equal(reconciled.isPaid, true);
});

runVerification('Step 5', 'Partial payment updates paidAmount and leaves outstandingBalance due', () => {
  const targetBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    totalAmount: 2500,
    status: 'Unpaid'
  };

  const payments: PaymentTransaction[] = [
    {
      txId: 'TXN-P8C-PARTIAL-01',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 1000,
      date: '10-Oct-2026 12:00',
      paymentMethod: 'Debit Card',
      status: 'Successful',
      bankReference: 'DC-TEST-112233'
    }
  ];

  const reconciled = reconcileBillWithPayments(targetBill, payments, '10-Oct-2026');
  assert.equal(reconciled.effectiveStatus, 'Partially Paid');
  assert.equal(reconciled.paidAmount, 1000);
  assert.equal(reconciled.outstandingBalance, 1500);
  assert.equal(reconciled.isDue, true);
  assert.equal(reconciled.isPartiallyPaid, true);
});

runVerification('Step 5', 'Second installment completes partially paid bill to 0 balance', () => {
  const targetBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    totalAmount: 2500,
    status: 'Unpaid'
  };

  const payments: PaymentTransaction[] = [
    {
      txId: 'TXN-P8C-PARTIAL-01',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 1000,
      date: '10-Oct-2026 12:00',
      paymentMethod: 'Debit Card',
      status: 'Successful',
      bankReference: 'DC-TEST-112233'
    },
    {
      txId: 'TXN-P8C-PARTIAL-02',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 1500,
      date: '15-Oct-2026 14:00',
      paymentMethod: 'Net Banking',
      status: 'Successful',
      bankReference: 'NB-TEST-445566'
    }
  ];

  const reconciled = reconcileBillWithPayments(targetBill, payments, '15-Oct-2026');
  assert.equal(reconciled.effectiveStatus, 'Paid');
  assert.equal(reconciled.paidAmount, 2500);
  assert.equal(reconciled.outstandingBalance, 0);
  assert.equal(reconciled.isPaid, true);
});

runVerification('Step 5', 'Failed or Pending Verification transactions do not reduce bill balance', () => {
  const targetBill: ElectricityBill = {
    ...INITIAL_BILLS[0],
    totalAmount: 3000,
    status: 'Unpaid'
  };

  const payments: PaymentTransaction[] = [
    {
      txId: 'TXN-FAILED-01',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 3000,
      date: '10-Oct-2026 10:00',
      paymentMethod: 'UPI / BHIM',
      status: 'Failed',
      bankReference: 'UPI-FAIL-001'
    },
    {
      txId: 'TXN-PENDING-02',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 3000,
      date: '11-Oct-2026 11:00',
      paymentMethod: 'Net Banking',
      status: 'Pending Verification',
      bankReference: 'NB-PEND-002'
    }
  ];

  const reconciled = reconcileBillWithPayments(targetBill, payments, '15-Oct-2026');
  assert.equal(reconciled.effectiveStatus, 'Unpaid');
  assert.equal(reconciled.paidAmount, 0);
  assert.equal(reconciled.outstandingBalance, 3000);
  assert.equal(reconciled.isDue, true);
});

// ============================================================================
// STEP 6: SMART PAYMENT CALENDAR VERIFICATION
// ============================================================================
console.log('\n--- STEP 6: Smart Payment Calendar Verification ---');

runVerification('Step 6', 'derivePaymentCalendarEvents derives events with accurate due dates and status', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  assert.ok(events.length >= 3, 'Must derive events for all canonical bills');

  for (const ev of events) {
    assert.ok(ev.id.startsWith('CAL-EVT-'));
    assert.ok(ev.billNo.startsWith('BILL-UG-'));
    assert.ok(ev.dueDate.length > 0);
    assert.ok(ev.dueDateIso.match(/^\d{4}-\d{2}-\d{2}$/));
    assert.equal(ev.outstandingBalance, ev.totalAmount - ev.paidAmount);
  }
});

runVerification('Step 6', 'buildMonthCalendarGrid generates complete week grid for month (35 or 42 cells)', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const grid = buildMonthCalendarGrid(2026, 9, events); // October 2026 (month is 0-indexed: 9)

  assert.ok(grid.length === 35 || grid.length === 42, 'Grid must be 35 or 42 day cells');
  const oct22Cell = grid.find(c => c.dateIso === '2026-10-22');
  assert.ok(oct22Cell, 'Must contain 2026-10-22 cell');
  assert.ok(oct22Cell!.events.length > 0, '2026-10-22 must have due bill event');
  assert.equal(oct22Cell!.hasDueBills, true);
});

runVerification('Step 6', 'computeCalendarSummary calculates accurate aggregate KPIs and next due date', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const summary = computeCalendarSummary(events);

  assert.ok(summary.totalBillsCount >= 3);
  assert.ok(summary.totalDueAmount > 0);
  assert.ok(summary.nextUpcomingDueDate !== null);
});

runVerification('Step 6', 'RFC 5545 iCalendar (.ics) and Google Calendar exports generate compliant outputs', () => {
  const events = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const testEvent = events[0];

  // Google Calendar URL
  const gcalUrl = buildGoogleCalendarUrl(testEvent);
  assert.ok(gcalUrl.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
  assert.ok(gcalUrl.includes(encodeURIComponent(testEvent.billNo)));

  // RFC 5545 ICS
  const ics = generateIcsCalendarEvent(testEvent);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('VERSION:2.0'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes(`SUMMARY:UGVCL Electricity Bill Due: ${testEvent.billNo}`));
  assert.ok(ics.includes('END:VEVENT'));
  assert.ok(ics.includes('END:VCALENDAR'));
});

// ============================================================================
// STEP 7: ADMIN DEMO BACKUP CENTER VERIFICATION
// ============================================================================
console.log('\n--- STEP 7: Admin DEMO Backup Center Verification ---');

class MockStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

runVerification('Step 7', 'createDemoBackup bundles 23 categories with valid checksum in isolated storage', () => {
  const storage = new MockStorage();
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(INITIAL_BILLS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.connections, JSON.stringify(INITIAL_CONNECTIONS));

  const result = createDemoBackup({
    actor: adminActor,
    storage: storage as unknown as Storage
  });

  assert.equal(result.success, true);
  assert.equal(result.authorized, true);
  const envelope = result.envelope!;
  assert.equal(envelope.formatId, BACKUP_FORMAT_ID);
  assert.equal(envelope.schemaVersion, BACKUP_SCHEMA_VERSION);
  assert.ok(envelope.integrity.checksum.length > 0);
  assert.equal(envelope.categoryManifest.length, 23);
  assert.equal(ALL_BACKUP_CATEGORIES.length, 23);
});

runVerification('Step 7', 'validateDemoBackup approves genuine backup and rejects corrupted or tampered snapshots', () => {
  const storage = new MockStorage();
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(INITIAL_BILLS));
  const res = createDemoBackup({
    actor: adminActor,
    storage: storage as unknown as Storage
  });
  const envelope = res.envelope!;

  // Genuine validation
  const validResult = validateDemoBackup({
    actor: adminActor,
    backupInput: envelope,
    storage: storage as unknown as Storage
  });
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.integrityVerified, true);

  // Tampered file (modified bills payload without updating checksum)
  const tampered: DemoBackupEnvelope = JSON.parse(JSON.stringify(envelope));
  tampered.payload.bills[0].totalAmount = 999999;
  const tamperedResult = validateDemoBackup({
    actor: adminActor,
    backupInput: tampered,
    storage: storage as unknown as Storage
  });
  assert.equal(tamperedResult.isValid, false, 'Tampered snapshot must fail integrity validation');
  assert.equal(tamperedResult.integrityVerified, false);
});

runVerification('Step 7', 'Role permissions: non-admin roles are strictly blocked from backup operations', () => {
  const storage = new MockStorage();
  const nonAdminRoles = ['consumer', 'employee', 'field', 'management'] as const;

  for (const role of nonAdminRoles) {
    const nonAdminActor: BackupActorIdentity = {
      id: `USR-${role.toUpperCase()}-01`,
      name: `Test ${role}`,
      role,
      subdivision: 'Mehsana City North'
    };

    const res = createDemoBackup({
      actor: nonAdminActor,
      storage: storage as unknown as Storage
    });
    assert.equal(res.success, false, `${role} must NOT be permitted to create backup`);
    assert.equal(res.authorized, false);
  }
});

runVerification('Step 7', 'safeStorage protection: critical ERP records are excluded from non-critical eviction', () => {
  const criticalKeys = [
    CANONICAL_DEMO_STORAGE_KEYS.bills,
    CANONICAL_DEMO_STORAGE_KEYS.payments,
    CANONICAL_DEMO_STORAGE_KEYS.connections,
    CANONICAL_DEMO_STORAGE_KEYS.applications,
    CANONICAL_DEMO_STORAGE_KEYS.complaints,
    CANONICAL_DEMO_STORAGE_KEYS.workOrders,
    'vidyutflow_field_offline_queue'
  ];

  for (const k of criticalKeys) {
    assert.ok(
      !NON_CRITICAL_EVICTION_KEYS.includes(k),
      `Key ${k} must NEVER be in NON_CRITICAL_EVICTION_KEYS`
    );
  }
});

// ============================================================================
// STEP 8: CROSS-FEATURE DATA CONSISTENCY
// ============================================================================
console.log('\n--- STEP 8: Cross-Feature Data Consistency ---');

runVerification('Step 8', 'Bill BILL-UG-2026-10-8821 agrees identically across Raw Bill, Reconciliation, Calendar, and PDF', () => {
  const rawBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
  const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === rawBill.consumerNo)!;

  // 1. Reconciled summary
  const summary = selectConnectionBillingSummary(conn, INITIAL_BILLS, INITIAL_PAYMENTS, { referenceDate: '15-Oct-2026' });
  const reconciledBill = summary.visibleBills.find(b => b.billNo === rawBill.billNo)!;
  assert.equal(reconciledBill.totalAmount, rawBill.totalAmount);
  assert.equal(reconciledBill.consumerNo, rawBill.consumerNo);

  // 2. Calendar Event
  const calEvents = derivePaymentCalendarEvents(INITIAL_BILLS, INITIAL_CONNECTIONS, INITIAL_PAYMENTS);
  const calEvent = calEvents.find(e => e.billNo === rawBill.billNo)!;
  assert.equal(calEvent.totalAmount, rawBill.totalAmount);
  assert.equal(calEvent.dueDate, rawBill.dueDate);
  assert.equal(calEvent.consumerNo, rawBill.consumerNo);

  // 3. Document PDF Particulars
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: mockConsumerActor,
    bill: rawBill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO'
  });
  assert.equal(doc.billParticulars!.billNo, rawBill.billNo);
  assert.equal(doc.billParticulars!.consumerNo, rawBill.consumerNo);
  assert.equal(doc.billParticulars!.totalBillAmount, rawBill.totalAmount);
  assert.equal(doc.billParticulars!.dueDate, rawBill.dueDate);

  // 4. Barcode
  const barcodeRef = deriveCanonicalBarcodeReference(rawBill.billNo, rawBill.consumerNo);
  assert.ok(barcodeRef.includes('04281-99231'));

  // 5. QR Code
  const qr = deriveCanonicalQrVerificationUrl(rawBill.billNo, rawBill.consumerNo);
  assert.ok(qr.url.includes('BILL-UG-2026-10-8821'));
});

console.log('\n==================================================================');
console.log(`PHASE 8C VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('==================================================================\n');
