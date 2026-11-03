import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
} from '../src/data/mockData';
import {
  generateElectricityBillDocument,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  paginateOfficialDocumentForA4,
} from '../src/utils/documentEngine';
import {
  UGVCL_PDF_DESIGN_TOKENS,
} from '../src/utils/pdfDocumentBuilder';
import {
  deriveCanonicalBarcodeReference,
  encodeCode128B,
  decodeCode128Modules,
  generateCode128Svg,
  calculateCode128PdfBars,
} from '../src/utils/barcodeEngine';
import {
  deriveCanonicalQrVerificationUrl,
  generateQrCodeMatrix,
  generateQrCodeSvg,
  calculateQrCodePdfRects,
  parseBillVerificationUrl,
} from '../src/utils/qrCodeEngine';
import {
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_LOGO_ASSET_PATH,
} from '../src/components/common/UgvclBrandIdentity';
import {
  reconcileBillWithPayments,
  selectConsumerAccountBillingSummary,
} from '../src/utils/billingEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary,
} from '../src/utils/paymentCalendarEngine';
import { Language } from '../src/i18n/types';

console.log('=== VIDYUTFLOW 2.0: TWO-PAGE UGVCL BILL, BARCODE & QR VERIFICATION SUITE ===');

const consumerActor = {
  id: 'demo_consumer',
  name: 'Smt. Meenaben Patel',
  role: 'consumer' as const,
  email: 'consumer@vidyutflow.demo',
  subdivision: 'Mehsana City North',
  consumerNo: '04281-99231',
  ownedConsumerNos: ['04281-99231', '04281-77190'],
};

const residentialConn = INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-99231')!;
const commercialConn = INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-77190')!;
const billSepResidential = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-8821')!;
const billAugResidential = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-09-8821')!;
const billSepCommercial = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-77190')!;

// 1-2. Exact Two-Page A4 Layout & Shared Design System Tokens
{
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billSepResidential,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO',
  });

  const pages = paginateOfficialDocumentForA4(doc);
  assert.equal(pages.length, 2, 'Electricity bill must paginate to deterministic 2 A4 pages');
  assert.equal(pages[0].items[0].kind, 'bill_front', 'Page 1 must be bill_front');
  assert.equal(pages[1].items[0].kind, 'bill_reverse', 'Page 2 must be bill_reverse');

  const pdfBytes = generateOfficialDocumentPdfBytes(doc);
  const inspection = inspectGeneratedPdfBytes(pdfBytes);
  assert.equal(inspection.isValidPdf, true);
  assert.equal(inspection.isValidPdfHeader, true);
  assert.equal(inspection.hasEofMarker, true);
  assert.equal(inspection.pageCount, 2, 'Binary PDF must contain exactly 2 /Type /Page objects');
  assert.equal(inspection.hasBlankTrailingPage, false, 'Neither Page 1 nor Page 2 may be blank');

  // Verify shared design tokens
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.fontFamilyRegular, '/F1');
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.fontFamilyBold, '/F2');
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.marginX, 36);
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.contentWidth, 595.28 - 72);
  console.log('✓ Test 1-2: Exact 2-page A4 PDF pagination and shared front/reverse design tokens verified');
}

// 3-4. Protected UGVCL Branding & Zero PGVCL/Torrent Leakage
{
  const doc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billSepResidential,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const pdfBytes = generateOfficialDocumentPdfBytes(doc);
  const inspection = inspectGeneratedPdfBytes(pdfBytes);

  assert.equal(inspection.containsUgvclBranding, true, 'Must contain Uttar Gujarat Vij Company Limited branding');
  assert.equal(inspection.containsRupeeSymbol, true, 'Must contain Rupee symbol');
  assert.equal(UGVCL_COMPANY_NAME_EN, 'Uttar Gujarat Vij Company Limited');
  assert.equal(UGVCL_COMPANY_NAME_GU, 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ');
  assert.equal(UGVCL_TAGLINE_EN, 'Consumer Satisfaction through Service Excellence');
  assert.equal(UGVCL_LOGO_ASSET_PATH, '/assets/ugvcl-logo.png');

  const rawText = new TextDecoder('latin1').decode(pdfBytes);
  assert.equal(rawText.includes('Paschim Gujarat'), false, 'Must NOT contain PGVCL company name');
  assert.equal(rawText.includes('pgvcl.com'), false, 'Must NOT contain PGVCL website');
  assert.equal(rawText.includes('Torrent Power'), false, 'Must NOT contain Torrent Power company name');
  assert.equal(rawText.includes('torrentpower.com'), false, 'Must NOT contain Torrent Power website');
  console.log('✓ Test 3-4: Protected UGVCL corporate branding & zero PGVCL/Torrent leakage verified');
}

// 5-6. Consumer, Connection, Meter Reading & Discrepancy Investigation
{
  const docSep = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billSepResidential,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const pSep = docSep.billParticulars!;
  assert.ok(pSep, 'billParticulars must be populated');
  assert.equal(pSep.consumerName, 'Smt. Meenaben Patel');
  assert.equal(pSep.consumerNo, '04281-99231');
  assert.equal(pSep.connectionId, residentialConn.connectionId);
  assert.equal(pSep.meterNo, residentialConn.meterNo);
  assert.equal(pSep.subdivision, 'Mehsana City North');
  assert.equal(pSep.previousReadingKwh, 14460);
  assert.equal(pSep.currentReadingKwh, 14820);
  assert.equal(pSep.readingDifference, 360);
  assert.equal(pSep.billedUnits, 360);
  assert.equal(pSep.readingIntegrityWarning, undefined, 'Sep 2026 bill reading difference (360) matches billed units (360)');
  assert.ok(pSep.slabIntegrityWarning, 'Sep 2026 bill must surface slabIntegrityWarning (1522 vs 1420)');
  assert.equal(docSep.integrityWarnings, undefined, 'Total component sum (2185) matches totalAmount (2185)');

  // Check August 2026 historical bill where unitsConsumed=410 vs connection register diff=360
  const docAug = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billAugResidential,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const pAug = docAug.billParticulars!;
  assert.equal(pAug.billedUnits, 410);
  assert.ok(
    pAug.readingIntegrityWarning && pAug.readingIntegrityWarning.includes('410 kWh'),
    'Historical bill BILL-UG-2026-09-8821 must surface readingIntegrityWarning without altering source record'
  );
  assert.ok(
    pAug.slabIntegrityWarning && pAug.slabIntegrityWarning.includes('1782.00'),
    'Historical bill BILL-UG-2026-09-8821 must surface slabIntegrityWarning'
  );

  // Commercial connection bill check
  const docComm = generateElectricityBillDocument({
    role: 'consumer',
    actor: {
      ...consumerActor,
      name: commercialConn.consumerName,
      consumerNo: commercialConn.consumerNo,
    },
    bill: billSepCommercial,
    connection: commercialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const pComm = docComm.billParticulars!;
  assert.equal(pComm.consumerNo, '04281-77190');
  assert.equal(pComm.meterNo, commercialConn.meterNo);
  assert.equal(pComm.tariffCategory, 'Commercial (NRGP)');
  assert.equal(pComm.sanctionedLoadKw, 18);
  assert.equal(pComm.previousReadingKwh, 47210);
  assert.equal(pComm.currentReadingKwh, 48920);
  assert.equal(pComm.readingDifference, 1710);
  assert.equal(pComm.billedUnits, 1710);
  assert.equal(pComm.readingIntegrityWarning, undefined);
  console.log('✓ Test 5-6: Consumer particulars, meter reading arithmetic, and discrepancy notices verified');
}

// 7-8. Previous Three Billing Periods Table Accuracy
{
  const docSep = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billSepResidential,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const prev = docSep.billParticulars!.previousPeriods;
  assert.equal(prev.length, 2, 'Residential Sep 2026 bill must show the 2 historical billing periods from INITIAL_BILLS');
  assert.equal(prev[0].month, 'August 2026');
  assert.equal(prev[0].units, 410);
  assert.equal(prev[0].billAmount, 2537);
  assert.equal(prev[0].status, 'Paid');
  assert.equal(prev[1].month, 'July 2026');
  assert.equal(prev[1].units, 395);
  assert.equal(prev[1].billAmount, 2435);
  assert.equal(prev[1].status, 'Paid');
  console.log('✓ Test 7-8: Previous billing periods table accuracy verified');
}

// 9-14. Unique Code 128 Barcode Generation, Uniqueness, Stability & Independent Decoding
{
  const barcodeSet = new Set<string>();
  for (const bill of INITIAL_BILLS) {
    const ref = deriveCanonicalBarcodeReference(bill.billNo, bill.consumerNo);
    assert.ok(!barcodeSet.has(ref), `Barcode reference ${ref} must be unique per bill`);
    barcodeSet.add(ref);

    const encoded = encodeCode128B(ref);
    assert.ok(encoded.modules.length > 60, 'Code 128 module pattern must include start, data, checksum, stop, and quiet zones');

    // Independent decoder verification
    const decoded = decodeCode128Modules(encoded.modules);
    assert.equal(decoded.success, true);
    assert.equal(decoded.checksumValid, true);
    assert.equal(decoded.decodedText, ref, `Independent Code 128 decoder must recover exact payload "${ref}", got "${decoded.decodedText}"`);

    const barcodeGen = generateCode128Svg(ref);
    assert.ok(barcodeGen.svg.startsWith('<svg') && barcodeGen.svg.includes('<rect'), 'Barcode SVG must render vector bars');

    const pdfBars = calculateCode128PdfBars(ref, 395, 65, 165, 22);
    assert.ok(pdfBars.bars.length > 15, 'PDF vector barcode must contain bar rectangles');
  }

  // Verify barcode stability across regenerations, languages, and payment updates
  const docEnUnpaid = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billSepResidential,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const docGuPaid = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: { ...billSepResidential, status: 'Paid', paidAmount: 2185 },
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'gu',
  });
  assert.equal(
    docEnUnpaid.barcode?.canonicalReference,
    docGuPaid.barcode?.canonicalReference,
    'Barcode reference must remain immutable across language switches and payment status updates'
  );
  console.log('✓ Test 9-14: Unique Code 128 barcode generation, stability, and independent decoding verified');
}

// 15-20. Unique QR Code Generation, Safe Payload, Vector Rects & URL Parsing
{
  const qrUrlSet = new Set<string>();
  for (const bill of INITIAL_BILLS) {
    const { url } = deriveCanonicalQrVerificationUrl(bill.billNo, bill.consumerNo, 'https://vidyutflow.ugvcl.demo');
    assert.ok(!qrUrlSet.has(url), `QR verification URL ${url} must be unique per bill`);
    qrUrlSet.add(url);

    // Ensure no sensitive PII leaks in QR payload
    assert.equal(url.includes('Meenaben'), false, 'QR URL must not expose consumer name');
    assert.equal(url.includes('98250'), false, 'QR URL must not expose phone number');
    assert.equal(url.includes('Anand Nagar'), false, 'QR URL must not expose street address');

    const parsed = parseBillVerificationUrl(url);
    assert.equal(parsed.isValid, true, `QR URL ${url} must parse cleanly`);
    assert.equal(parsed.ref, bill.billNo);
    assert.equal(parsed.consumerNo, bill.consumerNo);

    const matrix = generateQrCodeMatrix(url);
    assert.ok(matrix.length >= 21, 'QR matrix must be at least 21x21 modules (Version 1+)');
    assert.equal(matrix[0].length, matrix.length);

    const svg = generateQrCodeSvg(url, { sizePx: 88 });
    assert.ok(svg.startsWith('<svg') && svg.includes('<rect'), 'QR SVG must contain vector module rects');

    const rects = calculateQrCodePdfRects(url, 300, 584, 52);
    assert.ok(rects.length > 50, 'PDF QR code must produce dark module rectangles');
  }
  console.log('✓ Test 15-20: Unique scannable QR code generation, zero PII leakage, and URL parser verified');
}

// 21-25. Four-Language Support (en, gu, hi, mr) & Exact 2-Page PDF Verification
{
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  for (const lang of languages) {
    const doc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerActor,
      bill: billSepResidential,
      connection: residentialConn,
      payments: INITIAL_PAYMENTS,
      allBills: INITIAL_BILLS,
      language: lang,
    });
    const pdfBytes = generateOfficialDocumentPdfBytes(doc);
    const inspection = inspectGeneratedPdfBytes(pdfBytes);
    assert.equal(inspection.pageCount, 2, `Language "${lang}" bill PDF must be exactly 2 A4 pages`);
    assert.equal(inspection.hasBlankTrailingPage, false);
    assert.equal(inspection.containsUgvclBranding, true);
    assert.equal(inspection.containsRupeeSymbol, true);
  }
  console.log('✓ Test 21-25: Four-language (en, gu, hi, mr) 2-page PDF generation verified');
}

// 26-30. Real-Time Billing, Partial/Full Payment Updates, Smart Calendar & Component Wiring
{
  // Partial payment simulation
  const partialPayment = {
    txId: 'TXN-UG-TEST-PARTIAL',
    billNo: billSepResidential.billNo,
    consumerNo: billSepResidential.consumerNo,
    amount: 1000,
    date: '2026-10-12 10:30 AM',
    paymentMethod: 'UPI / BHIM' as const,
    status: 'Successful' as const,
    bankReference: 'UPI6281992011',
  };
  const paymentsWithPartial = [...INITIAL_PAYMENTS, partialPayment];
  const reconciledPartial = reconcileBillWithPayments(
    billSepResidential,
    paymentsWithPartial
  );
  assert.equal(reconciledPartial.paidAmount, 1000);
  assert.equal(reconciledPartial.outstandingBalance, 1185);
  assert.equal(reconciledPartial.effectiveStatus, 'Partially Paid');
  assert.equal(reconciledPartial.isDue, true);

  const docPartial = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: billSepResidential,
    connection: residentialConn,
    payments: paymentsWithPartial,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  assert.equal(docPartial.billParticulars!.paidAmount, 1000);
  assert.equal(docPartial.billParticulars!.outstandingBalance, 1185);

  // Full payment simulation
  const fullPayment = {
    ...partialPayment,
    txId: 'TXN-UG-TEST-FULL',
    amount: 1185,
  };
  const paymentsWithFull = [...paymentsWithPartial, fullPayment];
  const reconciledFull = reconcileBillWithPayments(
    billSepResidential,
    paymentsWithFull
  );
  assert.equal(reconciledFull.paidAmount, 2185);
  assert.equal(reconciledFull.outstandingBalance, 0);
  assert.equal(reconciledFull.effectiveStatus, 'Paid');
  assert.equal(reconciledFull.isDue, false);

  // Smart Payment Calendar & Gentle Reminders check
  const summaryAfterFull = selectConsumerAccountBillingSummary({
    allConnections: [residentialConn, commercialConn],
    allBills: INITIAL_BILLS,
    allPayments: paymentsWithFull,
    actorScope: {
      ownedConsumerNos: ['04281-99231', '04281-77190'],
    },
    selectedConnectionNo: '04281-99231',
  });
  assert.equal(
    summaryAfterFull.selectedConnectionSummary.dueBillCount,
    0,
    'Residential connection should have 0 due bills after full settlement'
  );
  assert.equal(
    summaryAfterFull.accountDueBillCount,
    1,
    'Commercial connection still has 1 due bill'
  );

  const calEvents = derivePaymentCalendarEvents(
    summaryAfterFull.allAccountReconciledBills,
    [residentialConn, commercialConn],
    paymentsWithFull
  );
  const calSummary = computeCalendarSummary(calEvents);
  assert.equal(calSummary.paidBillsCount, 3, 'Calendar reflects all 3 residential cycles paid');
  assert.equal(calSummary.dueBillsCount, 1, 'Calendar reflects 1 remaining due commercial bill');

  // Verify UI component wiring
  const modalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/OfficialDocumentModal.tsx'),
    'utf8'
  );
  assert.ok(modalSource.includes('UgvclElectricityBillTwoPage'), 'OfficialDocumentModal must render UgvclElectricityBillTwoPage');

  const portalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
    'utf8'
  );
  assert.ok(portalSource.includes('BillVerificationModal'), 'ConsumerPortal must integrate BillVerificationModal');
  assert.ok(portalSource.includes('parseBillVerificationUrl'), 'ConsumerPortal must parse #verify-bill QR URLs');

  console.log('✓ Test 26-30: Real-time partial/full payment reconciliation, Smart Calendar, and UI wiring verified');
}

console.log('=== ALL 30 TWO-PAGE UGVCL BILL, BARCODE & QR VERIFICATION CHECKS PASSED ===');
