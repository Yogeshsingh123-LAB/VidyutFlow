import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  INITIAL_BILLS,
  INITIAL_CONNECTIONS,
  INITIAL_PAYMENTS,
} from '../src/data/mockData';
import {
  generateDeterministicBiMonthlyBillForConnection,
  calculateConfigurableCycleTariffBreakdown,
  reconcileBillWithPayments,
} from '../src/utils/billingEngine';
import {
  generateElectricityBillDocument,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  paginateOfficialDocumentForA4,
  buildSixBiMonthlyPeriodComparisonChart,
  localizeSlabDescription,
} from '../src/utils/documentEngine';
import {
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  UGVCL_PDF_DESIGN_TOKENS,
} from '../src/utils/pdfDocumentBuilder';
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
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_CORPORATE_IDENTITY,
} from '../src/components/common/UgvclBrandIdentity';
import { UgvclElectricityBillTwoPage } from '../src/components/consumer/UgvclElectricityBillTwoPage';
import { Language } from '../src/i18n/types';

console.log('================================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 9 STEP 2 DEDICATED VERIFICATION SUITE');
console.log('Complete Four-Language, Two-Page A4 Electricity Bill & Six-Period Chart');
console.log('================================================================================');

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
const historicalSepMonthlyBill = INITIAL_BILLS.find((b) => b.billNo === 'BILL-UG-2026-10-8821')!;

// Create a canonical bi-monthly bill using Phase 9 Step 1 engine (Oct–Nov 2026, 720 kWh)
const biMonthlyGenResult = generateDeterministicBiMonthlyBillForConnection({
  connection: residentialConn,
  existingBills: INITIAL_BILLS,
  startYear: 2026,
  startMonth1To12: 10, // Oct–Nov 2026
  previousReadingKwh: 14820,
  currentReadingKwh: 14820 + 720,
  policyMode: 'BI_MONTHLY_PROPORTIONAL_2X_DEMO',
});

assert.equal(biMonthlyGenResult.created, true, 'Precondition: Step 1 bi-monthly bill must generate cleanly');
const biMonthlyOctNovBill = biMonthlyGenResult.bill!;
const allBillsWithBiMonthly = [biMonthlyOctNovBill, ...INITIAL_BILLS];

// -----------------------------------------------------------------------------
// TEST 1: English (en) Bi-Monthly Bill Generation
// -----------------------------------------------------------------------------
const docEn = generateElectricityBillDocument({
  role: 'consumer',
  actor: consumerActor,
  bill: biMonthlyOctNovBill,
  connection: residentialConn,
  payments: INITIAL_PAYMENTS,
  allBills: allBillsWithBiMonthly,
  language: 'en',
  dataSource: 'DEMO',
});
{
  assert.equal(docEn.eligible, true);
  assert.equal(docEn.authorized, true);
  assert.equal(docEn.language, 'en');
  assert.ok(docEn.title.includes('Electricity Bill'));
  assert.ok(docEn.billParticulars);
  const htmlEn = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docEn,
      particulars: docEn.billParticulars!,
      language: 'en',
    })
  );
  assert.ok(htmlEn.includes('E-ELECTRICITY BILL'));
  assert.ok(htmlEn.includes('1. GERC APPROVED TARIFF SCHEDULE'));
  assert.ok(htmlEn.includes('5. SIX BI-MONTHLY PERIOD CONSUMPTION COMPARISON CHART (kWh)'));
  console.log('✓ Test 1: English (en) bi-monthly two-page bill generation & markup verified');
}

// -----------------------------------------------------------------------------
// TEST 2: Gujarati (gu) Bi-Monthly Bill Generation
// -----------------------------------------------------------------------------
const docGu = generateElectricityBillDocument({
  role: 'consumer',
  actor: consumerActor,
  bill: biMonthlyOctNovBill,
  connection: residentialConn,
  payments: INITIAL_PAYMENTS,
  allBills: allBillsWithBiMonthly,
  language: 'gu',
  dataSource: 'DEMO',
});
{
  assert.equal(docGu.eligible, true);
  assert.equal(docGu.language, 'gu');
  assert.ok(docGu.title.includes('વીજ વપરાશ બિલ'));
  assert.ok(docGu.fontFamilyCss.includes('Noto Sans Gujarati'));
  const htmlGu = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docGu,
      particulars: docGu.billParticulars!,
      language: 'gu',
    })
  );
  assert.ok(htmlGu.includes('ઈ-વીજળી બિલ'));
  assert.ok(htmlGu.includes('1. GERC માન્ય ટેરિફ દર પત્રક'));
  assert.ok(htmlGu.includes('5. છ દ્વિ-માસિક ગાળાનો વીજ વપરાશ તુલનાત્મક ચાર્ટ (kWh)'));
  assert.ok(htmlGu.includes('વીજ અધિનિયમ ૨૦૦૩ ની કલમ ૫૬(૧)'));
  console.log('✓ Test 2: Gujarati (gu) bi-monthly two-page bill generation & markup verified');
}

// -----------------------------------------------------------------------------
// TEST 3: Hindi (hi) Bi-Monthly Bill Generation
// -----------------------------------------------------------------------------
const docHi = generateElectricityBillDocument({
  role: 'consumer',
  actor: consumerActor,
  bill: biMonthlyOctNovBill,
  connection: residentialConn,
  payments: INITIAL_PAYMENTS,
  allBills: allBillsWithBiMonthly,
  language: 'hi',
  dataSource: 'DEMO',
});
{
  assert.equal(docHi.eligible, true);
  assert.equal(docHi.language, 'hi');
  assert.ok(docHi.title.includes('विद्युत खपत बिल'));
  assert.ok(docHi.fontFamilyCss.includes('Noto Sans Devanagari'));
  const htmlHi = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docHi,
      particulars: docHi.billParticulars!,
      language: 'hi',
    })
  );
  assert.ok(htmlHi.includes('ई-विद्युत बिल'));
  assert.ok(htmlHi.includes('1. GERC अनुमोदित टैरिफ तालिका'));
  assert.ok(htmlHi.includes('5. छह द्वि-मासिक चक्र उपभोग तुलनात्मक चार्ट (kWh)'));
  assert.ok(htmlHi.includes('विद्युत अधिनियम 2003 की धारा 56(1)'));
  console.log('✓ Test 3: Hindi (hi) bi-monthly two-page bill generation & markup verified');
}

// -----------------------------------------------------------------------------
// TEST 4: Marathi (mr) Bi-Monthly Bill Generation
// -----------------------------------------------------------------------------
const docMr = generateElectricityBillDocument({
  role: 'consumer',
  actor: consumerActor,
  bill: biMonthlyOctNovBill,
  connection: residentialConn,
  payments: INITIAL_PAYMENTS,
  allBills: allBillsWithBiMonthly,
  language: 'mr',
  dataSource: 'DEMO',
});
{
  assert.equal(docMr.eligible, true);
  assert.equal(docMr.language, 'mr');
  assert.ok(docMr.title.includes('वीज वापर बिल'));
  assert.ok(docMr.fontFamilyCss.includes('Noto Sans Devanagari'));
  const htmlMr = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docMr,
      particulars: docMr.billParticulars!,
      language: 'mr',
    })
  );
  assert.ok(htmlMr.includes('ई-वीज बिल'));
  assert.ok(htmlMr.includes('1. GERC मान्यताप्राप्त टॅरिफ तक्ता'));
  assert.ok(htmlMr.includes('5. सहा द्वि-मासिक कालावधी वीज वापर तुलनात्मक आलेख (kWh)'));
  assert.ok(htmlMr.includes('विद्युत कायदा २००३ च्या कलम ५६(१)'));
  console.log('✓ Test 4: Marathi (mr) bi-monthly two-page bill generation & markup verified');
}

// -----------------------------------------------------------------------------
// TEST 5 & 6: Exact Two-Page A4 Output & Zero Blank/Third Page in All 4 Languages
// -----------------------------------------------------------------------------
{
  const docsByLang: Record<Language, typeof docEn> = {
    en: docEn,
    gu: docGu,
    hi: docHi,
    mr: docMr,
  };

  for (const lang of ['en', 'gu', 'hi', 'mr'] as Language[]) {
    const d = docsByLang[lang];
    const pages = paginateOfficialDocumentForA4(d);
    assert.equal(pages.length, 2, `[${lang}] Pagination must return exactly 2 pages`);
    assert.equal(pages[0].pageNumber, 1);
    assert.equal(pages[0].totalPages, 2);
    assert.equal(pages[0].items[0].kind, 'bill_front');
    assert.equal(pages[1].pageNumber, 2);
    assert.equal(pages[1].totalPages, 2);
    assert.equal(pages[1].items[0].kind, 'bill_reverse');

    const pdfBytes = generateOfficialDocumentPdfBytes(d);
    const inspection = inspectGeneratedPdfBytes(pdfBytes, d);
    assert.equal(inspection.isValidPdf, true, `[${lang}] Must produce valid PDF 1.4 binary`);
    assert.equal(inspection.pageCount, 2, `[${lang}] Binary PDF must have exactly 2 /Type /Page objects`);
    assert.equal(inspection.hasBlankTrailingPage, false, `[${lang}] Must have zero blank trailing page`);
    assert.deepEqual(
      inspection.mediaBox,
      [0, 0, A4_WIDTH_PT, A4_HEIGHT_PT],
      `[${lang}] MediaBox must match exact A4 dimensions (595.28 x 841.89 pt)`
    );

    const rawPdfText = new TextDecoder('utf-8').decode(pdfBytes);
    assert.ok(rawPdfText.includes('/Count 2'), `[${lang}] Pages catalog must declare /Count 2`);
    assert.equal(rawPdfText.includes('VIDYUTFLOW-PAGE-3'), false, `[${lang}] Must never emit a 3rd page`);
  }
  console.log('✓ Test 5 & 6: Exact 2-page A4 output and zero 3rd/blank pages verified across en, gu, hi, mr');
}

// -----------------------------------------------------------------------------
// TEST 7 & 8: Bi-Monthly Period Display, Meter Readings & Reading Dates
// -----------------------------------------------------------------------------
{
  const p = docEn.billParticulars!;
  assert.equal(p.billingCycleType, 'BI_MONTHLY');
  assert.equal(p.periodStartDate, '01-Oct-2026');
  assert.equal(p.periodEndDate, '30-Nov-2026');
  assert.ok(p.billingPeriodLabel.includes('01-Oct-2026') && p.billingPeriodLabel.includes('30-Nov-2026'));
  assert.equal(p.billingCycleLabel, 'Bi-Monthly Cycle (2-Month)');
  assert.equal(p.billingCycleShortBadge, 'Bi-Monthly');
  assert.equal(p.previousReadingKwh, 14820);
  assert.equal(p.currentReadingKwh, 15540);
  assert.equal(p.readingDifference, 720);
  assert.equal(p.billedUnits, 720);
  assert.equal(p.previousReadingDate, '01-Oct-2026');
  assert.equal(p.currentReadingDate, '30-Nov-2026');
  assert.equal(p.readingDates, '01-Oct-2026 – 30-Nov-2026');
  assert.equal(p.readingProvenance, 'RECORDED');

  // Verify Gujarati, Hindi, Marathi localized period & cycle labels
  assert.equal(docGu.billParticulars!.billingCycleLabel, 'દ્વિ-માસિક બિલિંગ ચક્ર (૨-મહિના)');
  assert.equal(docGu.billParticulars!.billMonth, 'ઓક્ટોબર–નવેમ્બર 2026');
  assert.equal(docHi.billParticulars!.billingCycleLabel, 'द्वैमासिक बिलिंग चक्र (२-माह)');
  assert.equal(docHi.billParticulars!.billMonth, 'अक्टूबर–नवंबर 2026');
  assert.equal(docMr.billParticulars!.billingCycleLabel, 'द्वैमासिक बिलिंग चक्र (२-महिने)');
  assert.equal(docMr.billParticulars!.billMonth, 'ऑक्टोबर–नोव्हेंबर 2026');
  console.log('✓ Test 7 & 8: Bi-monthly period start/end dates, meter readings, and reading dates verified');
}

// -----------------------------------------------------------------------------
// TEST 9: Consumption and Tariff Breakdown Consistency with Step 1 Billing Engine
// -----------------------------------------------------------------------------
{
  const p = docEn.billParticulars!;
  const step1Breakdown = calculateConfigurableCycleTariffBreakdown(
    residentialConn.tariffCategory,
    residentialConn.sanctionedLoadKw,
    720,
    {
      billingCycleType: 'BI_MONTHLY',
      policyMode: 'BI_MONTHLY_PROPORTIONAL_2X_DEMO',
    }
  );

  assert.equal(p.billedUnits, 720);
  assert.equal(p.energyCharges, step1Breakdown.energyCharges);
  assert.equal(p.fixedCharges, step1Breakdown.fixedCharges);
  assert.equal(p.fuelPriceAdjustment, step1Breakdown.fuelPriceAdjustment);
  assert.equal(p.electricityDuty, step1Breakdown.electricityDuty);
  assert.equal(p.rebateOrSubsidy, step1Breakdown.rebateOrSubsidy);
  assert.equal(p.totalBillAmount, step1Breakdown.totalAmount);
  assert.equal(p.slabBreakdown.length, step1Breakdown.slabBreakdown.length);
  assert.equal(p.slabIntegrityWarning, undefined, 'Bi-monthly bill generated by Step 1 engine has 0 slab discrepancy');
  console.log('✓ Test 9: Document & PDF values match Phase 9 Step 1 billing engine with zero separate calculator drift');
}

// -----------------------------------------------------------------------------
// TEST 10 & 11: Page 1 and Page 2 Translation Completeness Across All 4 Languages
// -----------------------------------------------------------------------------
{
  // Verify slab descriptions localize in gu, hi, mr while preserving en
  assert.equal(localizeSlabDescription('First 100 Units (0-100)', 'en'), 'First 100 Units (0-100)');
  assert.ok(localizeSlabDescription('First 100 Units (0-100)', 'gu').includes('પ્રથમ 100 યુનિટ'));
  assert.ok(localizeSlabDescription('First 100 Units (0-100)', 'hi').includes('प्रथम 100 यूनिट'));
  assert.ok(localizeSlabDescription('First 100 Units (0-100)', 'mr').includes('पहिले 100 युनिट'));

  // Verify reverseSideSections in documentEngine are localized in gu, hi, mr
  for (const [lang, expectedToken, expectedFieldToken] of [
    ['en', 'H. UGVCL Statutory Tariff Schedule', 'RGPU Residential Slabs'],
    ['gu', 'H. UGVCL વૈધાનિક ટેરિફ સમયપત્રક', 'RGPU રહેણાંક ટેરિફ સ્લેબ'],
    ['hi', 'H. UGVCL वैधानिक टैरिफ अनुसूची', 'RGPU आवासीय टैरिफ स्लैब'],
    ['mr', 'H. UGVCL', 'RGPU निवासी टॅरिफ स्लॅब'],
  ] as Array<[Language, string, string]>) {
    const d = lang === 'en' ? docEn : lang === 'gu' ? docGu : lang === 'hi' ? docHi : docMr;
    assert.equal(d.reverseSideSections?.length, 6);
    assert.ok(
      d.reverseSideSections![0].title.includes(expectedToken),
      `[${lang}] Reverse Section 1 title must include "${expectedToken}"`
    );
    assert.ok(
      d.reverseSideSections![0].fields[0].label.includes(expectedFieldToken),
      `[${lang}] Reverse Section 1 field 0 label must include "${expectedFieldToken}"`
    );
  }

  // Verify Page 2 sections 1, 2, 4, 5, 6, 7, 8, 9 in rendered UgvclElectricityBillTwoPage markup for gu, hi, mr
  const markupGu = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docGu,
      particulars: docGu.billParticulars!,
      language: 'gu',
    })
  );
  assert.ok(markupGu.includes('RGP (રહેણાંક)'), 'Gujarati Page 2 Section 1 category localized');
  assert.ok(markupGu.includes('દ્વિ-માસિક (2-માસ) બિલિંગ નિયમ'), 'Gujarati Page 2 Section 2 calculation notes localized');
  assert.ok(markupGu.includes('ગ્રાહક ફરિયાદ નિવારણ ફોરમ, UGVCL'), 'Gujarati Page 2 Section 4 CGRF localized');
  assert.ok(markupGu.includes('રહેણાંક અને શૈક્ષણિક પરિસર'), 'Gujarati Page 2 Section 5 Electricity Duty localized');
  assert.ok(markupGu.includes('BBPS અને UPI:'), 'Gujarati Page 2 Section 7 Payment instructions localized');
  assert.ok(markupGu.includes('RCCB / ELCB ફરજિયાત:'), 'Gujarati Page 2 Section 8 Safety instructions localized');
  assert.ok(markupGu.includes('15 દિવસની નોટિસ બાદ પરિસરનો વીજ પુરવઠો'), 'Gujarati Page 2 Section 9 Disconnection notice localized');

  const markupHi = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docHi,
      particulars: docHi.billParticulars!,
      language: 'hi',
    })
  );
  assert.ok(markupHi.includes('RGP (आवासीय)'), 'Hindi Page 2 Section 1 category localized');
  assert.ok(markupHi.includes('द्वि-मासिक (2-माह) चक्र नियम'), 'Hindi Page 2 Section 2 calculation notes localized');
  assert.ok(markupHi.includes('उपभोक्ता शिकायत निवारण फोरम, UGVCL'), 'Hindi Page 2 Section 4 CGRF localized');
  assert.ok(markupHi.includes('आवासीय एवं शैक्षणिक परिसर'), 'Hindi Page 2 Section 5 Electricity Duty localized');
  assert.ok(markupHi.includes('BBPS एवं UPI:'), 'Hindi Page 2 Section 7 Payment instructions localized');
  assert.ok(markupHi.includes('RCCB / ELCB अनिवार्यता:'), 'Hindi Page 2 Section 8 Safety instructions localized');
  assert.ok(markupHi.includes('15 स्पष्ट दिनों की नोटिस अवधि'), 'Hindi Page 2 Section 9 Disconnection notice localized');

  const markupMr = renderToStaticMarkup(
    React.createElement(UgvclElectricityBillTwoPage, {
      document: docMr,
      particulars: docMr.billParticulars!,
      language: 'mr',
    })
  );
  assert.ok(markupMr.includes('RGP (निवासी)'), 'Marathi Page 2 Section 1 category localized');
  assert.ok(markupMr.includes('द्वि-मासिक (2-महिने) चक्र नियम'), 'Marathi Page 2 Section 2 calculation notes localized');
  assert.ok(markupMr.includes('ग्राहक तक्रार निवारण मंच, UGVCL'), 'Marathi Page 2 Section 4 CGRF localized');
  assert.ok(markupMr.includes('निवासी आणि शैक्षणिक परिसर'), 'Marathi Page 2 Section 5 Electricity Duty localized');
  assert.ok(markupMr.includes('BBPS आणि UPI:'), 'Marathi Page 2 Section 7 Payment instructions localized');
  assert.ok(markupMr.includes('RCCB / ELCB अनिवार्य:'), 'Marathi Page 2 Section 8 Safety instructions localized');
  assert.ok(markupMr.includes('15 दिवसांच्या नोटीस कालावधीनंतर'), 'Marathi Page 2 Section 9 Disconnection notice localized');

  console.log('✓ Test 10 & 11: Page 1 and Page 2 complete 4-language localization verified');
}

// -----------------------------------------------------------------------------
// TEST 12 & 13: Protected UGVCL Identity & Untranslated Technical IDs / QR / Barcode
// -----------------------------------------------------------------------------
{
  for (const d of [docEn, docGu, docHi, docMr]) {
    const p = d.billParticulars!;
    assert.equal(d.subtitle, `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`);
    assert.equal(
      d.sections[0].fields.find((f) => f.key === 'companyName')?.value,
      'Uttar Gujarat Vij Company Limited'
    );
    assert.equal(
      d.sections[0].fields.find((f) => f.key === 'gujaratiCompanyName')?.value,
      'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ'
    );
    assert.equal(
      d.sections[0].fields.find((f) => f.key === 'missionTagline')?.value,
      'Consumer Satisfaction through Service Excellence'
    );
    assert.equal(UGVCL_LOGO_ASSET_PATH, '/assets/ugvcl-logo.png');
    assert.equal(p.cin, UGVCL_CORPORATE_IDENTITY.cin);
    assert.equal(p.gstin, '24AABCU4494L1ZV');
    assert.equal(p.billNo, biMonthlyOctNovBill.billNo);
    assert.equal(p.consumerNo, residentialConn.consumerNo);
    assert.equal(p.connectionId, residentialConn.connectionId);
    assert.equal(p.meterNo, residentialConn.meterNo);
    assert.equal(p.barcodeRef, docEn.billParticulars!.barcodeRef);
    assert.equal(p.qrUrl, docEn.billParticulars!.qrUrl);

    const html = renderToStaticMarkup(
      React.createElement(UgvclElectricityBillTwoPage, {
        document: d,
        particulars: p,
        language: d.language,
      })
    );
    // Statutory & technical references preserved across all languages
    assert.ok(html.includes('42(5)'), `[${d.language}] Must preserve Section 42(5) statutory reference`);
    assert.ok(html.includes('42(6)'), `[${d.language}] Must preserve Section 42(6) statutory reference`);
    assert.ok(html.includes('56(1)'), `[${d.language}] Must preserve Section 56(1) statutory reference`);
    assert.ok(html.includes('02762-222080'), `[${d.language}] Must preserve CGRF phone number`);
    assert.ok(html.includes('cgrf@ugvcl.com'), `[${d.language}] Must preserve CGRF email`);
    assert.ok(html.includes('1912 / 1800 233 155335'), `[${d.language}] Must preserve UGVCL helpline`);
  }
  console.log('✓ Test 12 & 13: Protected UGVCL corporate identity and untranslated technical IDs verified');
}

// -----------------------------------------------------------------------------
// TEST 14: Indic Font Registration & Script Rendering in PDF Binary
// -----------------------------------------------------------------------------
{
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.fontFamilyRegular, '/F1');
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.fontFamilyBold, '/F2');
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.fontFamilyGujarati, '/F3');
  assert.equal(UGVCL_PDF_DESIGN_TOKENS.fontFamilyDevanagari, '/F4');

  const pdfGu = generateOfficialDocumentPdfBytes(docGu);
  const inspGu = inspectGeneratedPdfBytes(pdfGu, docGu);
  assert.equal(inspGu.indicFontSupport.activeScript, 'gujarati');
  assert.equal(inspGu.indicFontSupport.activeFontResource, '/F3');
  assert.equal(inspGu.indicFontSupport.activeFontFamilyName, 'NotoSansGujarati-Regular');
  assert.equal(inspGu.indicFontSupport.unicodeHexEncoded, true);
  assert.equal(inspGu.indicFontSupport.hasToUnicodeCMap, true);

  const pdfHi = generateOfficialDocumentPdfBytes(docHi);
  const inspHi = inspectGeneratedPdfBytes(pdfHi, docHi);
  assert.equal(inspHi.indicFontSupport.activeScript, 'devanagari');
  assert.equal(inspHi.indicFontSupport.activeFontResource, '/F4');
  assert.equal(inspHi.indicFontSupport.activeFontFamilyName, 'NotoSansDevanagari-Regular');
  assert.equal(inspHi.indicFontSupport.unicodeHexEncoded, true);
  assert.equal(inspHi.indicFontSupport.hasToUnicodeCMap, true);

  const pdfMr = generateOfficialDocumentPdfBytes(docMr);
  const inspMr = inspectGeneratedPdfBytes(pdfMr, docMr);
  assert.equal(inspMr.indicFontSupport.activeScript, 'devanagari');
  assert.equal(inspMr.indicFontSupport.activeFontResource, '/F4');
  assert.equal(inspMr.indicFontSupport.unicodeHexEncoded, true);
  assert.equal(inspMr.indicFontSupport.hasToUnicodeCMap, true);

  console.log('✓ Test 14: Indic font registration (/F3 NotoSansGujarati, /F4 NotoSansDevanagari + ToUnicode CMap) verified');
}

// -----------------------------------------------------------------------------
// TEST 15, 16, 17, 18, 19: Six Bi-Monthly Period Chart, Two Bars/Period, Real Data,
// Missing History Handling (No Fabrication), No Double Counting & Cross-Year Labels
// -----------------------------------------------------------------------------
{
  const chart = docEn.billParticulars!.sixPeriodComparisonChart;
  assert.ok(chart, 'sixPeriodComparisonChart must be populated');
  assert.equal(chart.periods.length, 6, 'Chart must cover exactly 6 chronological bi-monthly periods');

  // Verify chronological 2-month progression ending at 2026-11 (Oct-Nov 2026)
  // Slot 0: Dec 2025–Jan 2026 (2026-01) -> Cross-year boundary!
  // Slot 1: Feb–Mar 2026 (2026-03)
  // Slot 2: Apr–May 2026 (2026-05)
  // Slot 3: Jun–Jul 2026 (2026-07)
  // Slot 4: Aug–Sep 2026 (2026-09)
  // Slot 5: Oct–Nov 2026 (2026-11)
  assert.equal(chart.periods[0].canonicalPeriodMonth, '2026-01');
  assert.equal(chart.periods[0].startYearMonth, '2025-12');
  assert.equal(chart.periods[0].endYearMonth, '2026-01');
  assert.equal(chart.periods[0].periodRangeLabel, 'December 2025–January 2026');
  assert.equal(chart.periods[0].shortLabel, 'Dec 25-Jan 26');

  assert.equal(chart.periods[1].canonicalPeriodMonth, '2026-03');
  assert.equal(chart.periods[2].canonicalPeriodMonth, '2026-05');
  assert.equal(chart.periods[3].canonicalPeriodMonth, '2026-07');
  assert.equal(chart.periods[4].canonicalPeriodMonth, '2026-09');
  assert.equal(chart.periods[5].canonicalPeriodMonth, '2026-11');
  assert.equal(chart.periods[5].isCurrentPeriod, true);

  // Verify no fabricated history for Dec 2025–Jan 2026 and Feb–Mar 2026 where no records exist
  assert.equal(chart.periods[0].hasActualData, false, 'Dec 2025-Jan 2026 has no recorded data; must not fabricate');
  assert.equal(chart.periods[0].actualUnitsKwh, null, 'Missing period actualUnitsKwh must be null');
  assert.equal(chart.periods[0].source, 'MISSING_DATA');
  assert.equal(chart.periods[1].hasActualData, false, 'Feb-Mar 2026 has no recorded data; must not fabricate');
  assert.equal(chart.periods[1].actualUnitsKwh, null);

  // Verify real consumption values for available periods:
  // Slot 2 (Apr-May 2026): CONSUMPTION_HISTORY May (480 kWh) = 480 kWh
  assert.equal(chart.periods[2].hasActualData, true);
  assert.equal(chart.periods[2].actualUnitsKwh, 480);

  // Slot 3 (Jun-Jul 2026): CONSUMPTION_HISTORY Jun (520) + INITIAL_BILLS Jul (395) = 915 kWh
  assert.equal(chart.periods[3].hasActualData, true);
  assert.equal(chart.periods[3].actualUnitsKwh, 915, 'Jun-Jul 2026 bi-monthly total must be 520 + 395 = 915 kWh');

  // Slot 4 (Aug-Sep 2026): INITIAL_BILLS Aug (410) + Sep (360) = 770 kWh
  assert.equal(chart.periods[4].hasActualData, true);
  assert.equal(chart.periods[4].actualUnitsKwh, 770, 'Aug-Sep 2026 bi-monthly total must be 410 + 360 = 770 kWh');

  // Slot 5 (Oct-Nov 2026): Current bi-monthly bill (720 kWh)
  assert.equal(chart.periods[5].hasActualData, true);
  assert.equal(chart.periods[5].actualUnitsKwh, 720);
  assert.equal(chart.periods[5].source, 'CURRENT_BILL');

  // Verify two comparison bars per period (actualUnitsKwh + comparisonUnitsKwh)
  for (const slot of chart.periods) {
    assert.ok(slot.comparisonUnitsKwh > 0, 'Every period must have a positive Bar 2 comparisonUnitsKwh');
  }

  // Verify NO double counting when both a historical bi-monthly bill and monthly bills exist in the same 2-month window
  const overlappingBiMonthlyAugSepBill = {
    ...biMonthlyOctNovBill,
    billNo: 'UGVCL-BM-202609-14029384751',
    billMonth: 'August–September 2026',
    billingCycleType: 'BI_MONTHLY' as const,
    periodStartDate: '01-Aug-2026',
    periodEndDate: '30-Sep-2026',
    billingPeriodLabel: '01-Aug-2026 to 30-Sep-2026 (Bi-Monthly — 2 Months)',
    unitsConsumed: 770,
  };
  const dedupedChart = buildSixBiMonthlyPeriodComparisonChart({
    currentBill: biMonthlyOctNovBill,
    connection: residentialConn,
    allBills: [...allBillsWithBiMonthly, overlappingBiMonthlyAugSepBill],
    language: 'en',
  });
  assert.equal(
    dedupedChart.periods[4].actualUnitsKwh,
    770,
    'Aug-Sep 2026 must use canonical bi-monthly bill (770 kWh) without double-counting monthly Aug (410) + Sep (360) bills'
  );
  assert.equal(dedupedChart.periods[4].source, 'HISTORICAL_BI_MONTHLY_BILL');

  console.log('✓ Test 15-19: Six bi-monthly periods, 2 bars/period, real data, zero fabrication, no double-counting & cross-year labels verified');
}

// -----------------------------------------------------------------------------
// TEST 20: Historical MONTHLY Bill Backward Compatibility
// -----------------------------------------------------------------------------
{
  const docMonthly = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: historicalSepMonthlyBill,
    connection: residentialConn,
    payments: INITIAL_PAYMENTS,
    allBills: INITIAL_BILLS,
    language: 'en',
  });
  const pm = docMonthly.billParticulars!;
  assert.equal(pm.billingCycleType, 'MONTHLY');
  assert.equal(pm.billingCycleLabel, 'Monthly Cycle (1-Month)');
  assert.equal(pm.billingCycleShortBadge, 'Monthly');
  assert.equal(pm.billMonth, 'September 2026');
  assert.equal(pm.billedUnits, 360);
  assert.equal(pm.totalBillAmount, 2185);
  assert.equal(pm.previousPeriods.length, 2);
  assert.equal(pm.previousPeriods[0].month, 'August 2026');
  assert.equal(pm.previousPeriods[1].month, 'July 2026');

  const pdfMonthly = generateOfficialDocumentPdfBytes(docMonthly);
  const inspMonthly = inspectGeneratedPdfBytes(pdfMonthly, docMonthly);
  assert.equal(inspMonthly.pageCount, 2);
  assert.equal(inspMonthly.hasBlankTrailingPage, false);
  console.log('✓ Test 20: Historical MONTHLY bill backward compatibility verified');
}

// -----------------------------------------------------------------------------
// TEST 21: Paid, Unpaid, and Partially Paid Bi-Monthly Bill Rendering
// -----------------------------------------------------------------------------
{
  // 1. Unpaid
  assert.equal(docEn.billParticulars!.paidAmount, 0);
  assert.equal(docEn.billParticulars!.outstandingBalance, biMonthlyOctNovBill.totalAmount);
  assert.equal(docEn.billParticulars!.canonicalBillStatus, 'Unpaid');

  // 2. Partially Paid
  const partialPayment = {
    txId: 'TXN-P9S2-PARTIAL',
    billNo: biMonthlyOctNovBill.billNo,
    consumerNo: biMonthlyOctNovBill.consumerNo,
    amount: 1500,
    date: '2026-12-05 11:00 AM',
    paymentMethod: 'UPI / BHIM' as const,
    bankReference: 'UPI-P9S2-REF-001',
    status: 'Successful' as const,
  };
  const docPartialGu = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: biMonthlyOctNovBill,
    connection: residentialConn,
    payments: [...INITIAL_PAYMENTS, partialPayment],
    allBills: allBillsWithBiMonthly,
    language: 'gu',
  });
  assert.equal(docPartialGu.billParticulars!.paidAmount, 1500);
  assert.equal(
    docPartialGu.billParticulars!.outstandingBalance,
    Number((biMonthlyOctNovBill.totalAmount - 1500).toFixed(2))
  );
  assert.equal(docPartialGu.billParticulars!.canonicalBillStatus, 'Partially Paid');
  assert.equal(docPartialGu.billParticulars!.billStatus, 'આંશિક ચૂકવાયેલ');

  // 3. Fully Paid
  const fullPayment = {
    ...partialPayment,
    txId: 'TXN-P9S2-FULL',
    amount: Number((biMonthlyOctNovBill.totalAmount - 1500).toFixed(2)),
  };
  const docFullHi = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerActor,
    bill: biMonthlyOctNovBill,
    connection: residentialConn,
    payments: [...INITIAL_PAYMENTS, partialPayment, fullPayment],
    allBills: allBillsWithBiMonthly,
    language: 'hi',
  });
  assert.equal(docFullHi.billParticulars!.paidAmount, biMonthlyOctNovBill.totalAmount);
  assert.equal(docFullHi.billParticulars!.outstandingBalance, 0);
  assert.equal(docFullHi.billParticulars!.canonicalBillStatus, 'Paid');
  assert.equal(docFullHi.billParticulars!.billStatus, 'भुगतान किया गया');

  console.log('✓ Test 21: Paid, Unpaid, and Partially Paid bi-monthly bill states verified across languages');
}

// -----------------------------------------------------------------------------
// TEST 22: QR Code & Code 128 Barcode Round-Trip Verification
// -----------------------------------------------------------------------------
{
  const barcodeRef = deriveCanonicalBarcodeReference(
    biMonthlyOctNovBill.billNo,
    biMonthlyOctNovBill.consumerNo
  );
  const encoded = encodeCode128B(barcodeRef);
  const decoded = decodeCode128Modules(encoded.modules);
  assert.equal(decoded.success, true);
  assert.equal(decoded.checksumValid, true);
  assert.equal(decoded.decodedText, barcodeRef);

  const { url: qrUrl } = deriveCanonicalQrVerificationUrl(
    biMonthlyOctNovBill.billNo,
    biMonthlyOctNovBill.consumerNo,
    'https://vidyutflow.ugvcl.demo'
  );
  const parsedQr = parseBillVerificationUrl(qrUrl);
  assert.equal(parsedQr.isValid, true);
  assert.equal(parsedQr.ref, biMonthlyOctNovBill.billNo);
  assert.equal(parsedQr.consumerNo, biMonthlyOctNovBill.consumerNo);

  // Verify identical QR and barcode payload in all 4 languages' PDF streams
  for (const d of [docEn, docGu, docHi, docMr]) {
    const pdfText = new TextDecoder('utf-8').decode(generateOfficialDocumentPdfBytes(d));
    assert.ok(pdfText.includes(`% BARCODE_CODE128_REF: ${barcodeRef}`));
    assert.ok(pdfText.includes(`% QRCODE_VERIFY_URL: ${qrUrl}`));
    assert.ok(pdfText.includes(`*${barcodeRef}*`));
  }
  console.log('✓ Test 22: Code 128 barcode and QR verification URL round-trip verified across all 4 languages');
}

console.log('================================================================================');
console.log('ALL 22 PHASE 9 STEP 2 MULTILINGUAL BI-MONTHLY PDF & CHART CHECKS PASSED (22/22)');
console.log('================================================================================');

