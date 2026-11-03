import assert from 'node:assert/strict';
import {
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  FEEDER_METRICS,
} from '../src/data/mockData';
import {
  buildMonthlyBillingPeriod,
  buildBiMonthlyBillingPeriod,
  parseBillMonthToPeriodDescriptor,
  resolveBillCycleMetadata,
  checkBillingPeriodConflict,
  resolveNextNonOverlappingBiMonthlyPeriod,
  computeValidatedMeterConsumption,
  calculateConfigurableCycleTariffBreakdown,
  calculateDeterministicTariffBreakdown,
  generateDeterministicDemoBillForConnection,
  generateDeterministicBiMonthlyBillForConnection,
  reconcileBillWithPayments,
  applyPaymentToBill,
  selectConsumerAccountBillingSummary,
  getBillingUiTranslations,
} from '../src/utils/billingEngine';
import {
  localizeBillMonth,
  localizeBillingCycleType,
  localizeBillingCycleShortBadge,
  localizeMeterReadingProvenance,
} from '../src/i18n/consumerContentTranslations';
import {
  generateElectricityBillDocument,
  generatePaymentReceiptDocument,
} from '../src/utils/documentEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary,
} from '../src/utils/paymentCalendarEngine';
import {
  selectConsumerCanonicalAnalytics,
  selectManagementCanonicalMetrics,
} from '../src/utils/canonicalAnalytics';

console.log('===================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 9 STEP 1 BI-MONTHLY BILLING VERIFICATION');
console.log('===================================================================');

let passedCount = 0;
function verify(testNumber: number, name: string, fn: () => void) {
  try {
    fn();
    passedCount += 1;
    console.log(`✅ [PASS ${testNumber.toString().padStart(2, '0')}/24] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL ${testNumber.toString().padStart(2, '0')}/24] ${name}`);
    throw err;
  }
}

// Snapshot canonical seed arrays to prove zero silent mutation at the end
const seedConnectionsSnapshot = JSON.stringify(INITIAL_CONNECTIONS);
const seedBillsSnapshot = JSON.stringify(INITIAL_BILLS);
const seedPaymentsSnapshot = JSON.stringify(INITIAL_PAYMENTS);

// 1. Valid two-month billing period generation
verify(1, 'Valid two-month billing period generation (Jan–Feb through Nov–Dec)', () => {
  const janFeb2026 = buildBiMonthlyBillingPeriod(2026, 1);
  assert.equal(janFeb2026.billingCycleType, 'BI_MONTHLY');
  assert.equal(janFeb2026.billMonth, 'January–February 2026');
  assert.equal(janFeb2026.shortCycleLabel, 'Jan–Feb 2026');
  assert.equal(janFeb2026.periodStartDate, '01-Jan-2026');
  assert.equal(janFeb2026.periodEndDate, '28-Feb-2026');
  assert.equal(janFeb2026.billingPeriodLabel, '01-Jan-2026 to 28-Feb-2026');
  assert.equal(janFeb2026.billDate, '05-Mar-2026');
  assert.equal(janFeb2026.dueDate, '20-Mar-2026');
  assert.equal(janFeb2026.standardCycleDaysCount, 59);

  // Leap year Feb check (2028)
  const janFeb2028 = buildBiMonthlyBillingPeriod(2028, 1);
  assert.equal(janFeb2028.periodEndDate, '29-Feb-2028');
  assert.equal(janFeb2028.standardCycleDaysCount, 60);

  const sepOct2026 = buildBiMonthlyBillingPeriod(2026, 9);
  assert.equal(sepOct2026.billMonth, 'September–October 2026');
  assert.equal(sepOct2026.periodStartDate, '01-Sep-2026');
  assert.equal(sepOct2026.periodEndDate, '31-Oct-2026');
  assert.equal(sepOct2026.billDate, '05-Nov-2026');
  assert.equal(sepOct2026.dueDate, '20-Nov-2026');
  assert.equal(sepOct2026.standardCycleDaysCount, 61);
});

// 2. Cross-year two-month period generation (Nov–Dec, Dec–Jan, Jan–Feb)
verify(2, 'Cross-year two-month period generation (Nov–Dec 2026, Dec 2026–Jan 2027, Jan–Feb 2027)', () => {
  const novDec2026 = buildBiMonthlyBillingPeriod(2026, 11);
  assert.equal(novDec2026.billMonth, 'November–December 2026');
  assert.equal(novDec2026.periodStartDate, '01-Nov-2026');
  assert.equal(novDec2026.periodEndDate, '31-Dec-2026');
  assert.equal(novDec2026.billDate, '05-Jan-2027');
  assert.equal(novDec2026.dueDate, '20-Jan-2027');

  const decJanCross = buildBiMonthlyBillingPeriod(2026, 12);
  assert.equal(decJanCross.billMonth, 'December 2026–January 2027');
  assert.equal(decJanCross.shortCycleLabel, 'Dec 2026–Jan 2027');
  assert.equal(decJanCross.periodStartDate, '01-Dec-2026');
  assert.equal(decJanCross.periodEndDate, '31-Jan-2027');
  assert.equal(decJanCross.billDate, '05-Feb-2027');
  assert.equal(decJanCross.dueDate, '20-Feb-2027');
  assert.equal(decJanCross.standardCycleDaysCount, 62);

  // Verify parser round-trips cross-year and same-year periods accurately
  const parsedCross = parseBillMonthToPeriodDescriptor('December 2026–January 2027');
  assert.ok(parsedCross);
  assert.equal(parsedCross.billingCycleType, 'BI_MONTHLY');
  assert.equal(parsedCross.periodStartDate, '01-Dec-2026');
  assert.equal(parsedCross.periodEndDate, '31-Jan-2027');
});

// 3. Duplicate two-month period prevention
verify(3, 'Duplicate two-month period prevention for the same connection', () => {
  const conn = INITIAL_CONNECTIONS[0]; // 04281-99231 (has Jul, Aug, Sep 2026 monthly bills)
  const firstGen = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10, // October–November 2026
  });
  assert.equal(firstGen.created, true);
  assert.ok(firstGen.bill);
  assert.equal(firstGen.bill.billMonth, 'October–November 2026');

  // Attempt to generate identical two-month period again
  const duplicateGen = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: firstGen.updatedBills,
    startYear: 2026,
    startMonth1To12: 10,
  });
  assert.equal(duplicateGen.created, false);
  assert.equal(duplicateGen.conflictType, 'DUPLICATE_PERIOD');
});

// 4. Overlapping period prevention (monthly vs bi-monthly and bi-monthly vs bi-monthly)
verify(4, 'Overlapping period prevention between monthly and two-month bills', () => {
  const conn = INITIAL_CONNECTIONS[0]; // 04281-99231 has September 2026 monthly bill (01-Sep-2026 to 30-Sep-2026)
  const sepOctCandidate = buildBiMonthlyBillingPeriod(2026, 9); // 01-Sep-2026 to 31-Oct-2026

  const conflictWithMonthly = checkBillingPeriodConflict(
    conn,
    sepOctCandidate,
    INITIAL_BILLS
  );
  assert.equal(conflictWithMonthly.hasConflict, true);
  assert.equal(conflictWithMonthly.conflictType, 'OVERLAPPING_PERIOD');
  assert.equal(conflictWithMonthly.conflictingBill?.billNo, 'BILL-UG-2026-10-8821');

  // Verify generator rejects overlapping period and returns existing conflicting bill safely
  const rejectedOverlap = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 9, // Sep–Oct 2026 overlaps Sep 2026
  });
  assert.equal(rejectedOverlap.created, false);
  assert.equal(rejectedOverlap.conflictType, 'OVERLAPPING_PERIOD');

  // Verify resolveNextNonOverlappingBiMonthlyPeriod automatically advances past Sep 2026 to Oct–Nov 2026
  const nextValidPeriod = resolveNextNonOverlappingBiMonthlyPeriod(conn, INITIAL_BILLS, 2026, 9);
  assert.equal(nextValidPeriod.billMonth, 'October–November 2026');
  assert.equal(nextValidPeriod.periodStartDate, '01-Oct-2026');
  assert.equal(nextValidPeriod.periodEndDate, '30-Nov-2026');
});

// 5. Standard meter reading consumption calculation
verify(5, 'Standard meter reading consumption calculation with multiplier', () => {
  const stdReading = computeValidatedMeterConsumption({
    previousReadingKwh: 14820,
    currentReadingKwh: 15540,
    meterMultiplier: 1,
    readingProvenance: 'RECORDED',
  });
  assert.equal(stdReading.valid, true);
  assert.equal(stdReading.unitsConsumed, 720);
  assert.equal(stdReading.readingProvenance, 'RECORDED');

  const ctMeterReading = computeValidatedMeterConsumption({
    previousReadingKwh: 1200,
    currentReadingKwh: 1350,
    meterMultiplier: 2,
    readingProvenance: 'AMR_SMART_METER',
  });
  assert.equal(ctMeterReading.valid, true);
  assert.equal(ctMeterReading.unitsConsumed, 300);
});

// 6. Zero consumption
verify(6, 'Zero consumption (current === previous -> 0 kWh, fixed charges + duty only)', () => {
  const zeroReading = computeValidatedMeterConsumption({
    previousReadingKwh: 14820,
    currentReadingKwh: 14820,
  });
  assert.equal(zeroReading.valid, true);
  assert.equal(zeroReading.unitsConsumed, 0);
  assert.equal(zeroReading.isZeroConsumption, true);

  const zeroTariff = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    4,
    0,
    { billingCycleType: 'BI_MONTHLY' }
  );
  assert.equal(zeroTariff.energyCharges, 0);
  assert.equal(zeroTariff.fuelPriceAdjustment, 0);
  assert.equal(zeroTariff.fixedCharges, 200); // 2 months * 25/kW * 4 kW = 200
  assert.equal(zeroTariff.electricityDuty, 30); // 15% of 200 = 30
  assert.equal(zeroTariff.totalAmount, 230);
});

// 7. Negative consumption rejection without meter reset/replacement
verify(7, 'Negative consumption rejection when meter reset/replacement is not declared', () => {
  const negativeReading = computeValidatedMeterConsumption({
    previousReadingKwh: 14820,
    currentReadingKwh: 14600,
  });
  assert.equal(negativeReading.valid, false);
  assert.equal(negativeReading.errorCode, 'NEGATIVE_CONSUMPTION_INVALID');

  // Generator should also reject negative reading without meter replacement record
  const genNeg = generateDeterministicBiMonthlyBillForConnection({
    connection: INITIAL_CONNECTIONS[0],
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10,
    previousReadingKwh: 14820,
    currentReadingKwh: 14500,
  });
  assert.equal(genNeg.created, false);
  assert.equal(genNeg.errorCode, 'NEGATIVE_CONSUMPTION_INVALID');
});

// 8. Meter reset/replacement handling
verify(8, 'Meter reset and meter replacement consumption calculation', () => {
  const replacedReading = computeValidatedMeterConsumption({
    meterResetOrReplacement: {
      oldMeterPreviousReadingKwh: 14820,
      oldMeterFinalReadingKwh: 15100, // 280 kWh on old meter before swap
      newMeterInitialReadingKwh: 0,
      newMeterCurrentReadingKwh: 410, // 410 kWh on new meter after swap
    },
  });
  assert.equal(replacedReading.valid, true);
  assert.equal(replacedReading.unitsConsumed, 690); // 280 + 410 = 690 kWh
  assert.equal(replacedReading.readingProvenance, 'METER_RESET_OR_REPLACED');
});

// 9. Missing reading handling
verify(9, 'Missing reading handling (blocks when estimation disallowed; estimates when allowed)', () => {
  const missingDisallowed = computeValidatedMeterConsumption({
    previousReadingKwh: 14820,
    currentReadingKwh: null,
    allowEstimatedFallback: false,
  });
  assert.equal(missingDisallowed.valid, false);
  assert.equal(missingDisallowed.errorCode, 'MISSING_METER_READING');

  const missingAllowed = computeValidatedMeterConsumption({
    previousReadingKwh: 14820,
    currentReadingKwh: null,
    allowEstimatedFallback: true,
    estimatedUnitsKwh: 640,
  });
  assert.equal(missingAllowed.valid, true);
  assert.equal(missingAllowed.unitsConsumed, 640);
  assert.equal(missingAllowed.readingProvenance, 'ESTIMATED_AVERAGE');
  assert.equal(missingAllowed.currentReadingKwh, 15460);
});

// 10. Residential (RGPU) two-month slab calculation
verify(10, 'Residential (RGPU) two-month progressive slab calculation (proportional 2x & unscaled policies)', () => {
  // 640 kWh over 2 months under BI_MONTHLY_PROPORTIONAL_2X_DEMO:
  // 0-100: 100 * 3.05 = 305
  // 101-200: 100 * 3.50 = 350
  // 201-500: 300 * 4.15 = 1245
  // >500: 140 * 5.20 = 728
  // Total Energy = 2628
  const rgpuBiMonthly = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    4,
    640,
    {
      billingCycleType: 'BI_MONTHLY',
      policyMode: 'BI_MONTHLY_PROPORTIONAL_2X_DEMO',
    }
  );
  assert.equal(rgpuBiMonthly.slabBreakdown.length, 4);
  assert.equal(rgpuBiMonthly.slabBreakdown[0].slab, 'First 100 Units (0 - 100)');
  assert.equal(rgpuBiMonthly.slabBreakdown[0].units, 100);
  assert.equal(rgpuBiMonthly.slabBreakdown[1].units, 100);
  assert.equal(rgpuBiMonthly.slabBreakdown[2].units, 300);
  assert.equal(rgpuBiMonthly.slabBreakdown[3].units, 140);
  assert.equal(rgpuBiMonthly.energyCharges, 2628);
  assert.equal(rgpuBiMonthly.isDemoTariffAssumption, true);

  // Also verify BI_MONTHLY_UNSCALED_SLABS_DEMO policy mode works deterministically
  const rgpuUnscaled = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    4,
    640,
    {
      billingCycleType: 'BI_MONTHLY',
      policyMode: 'BI_MONTHLY_UNSCALED_SLABS_DEMO',
    }
  );
  assert.equal(rgpuUnscaled.slabBreakdown[0].units, 50);
  assert.equal(rgpuUnscaled.slabBreakdown[1].units, 50);
  assert.equal(rgpuUnscaled.slabBreakdown[2].units, 150);
  assert.equal(rgpuUnscaled.slabBreakdown[3].units, 390);
});

// 11. Commercial / Industrial / Agricultural tariff calculation
verify(11, 'Commercial (NRGP), Industrial (LTMD), and Agricultural (AG) two-month tariff calculations', () => {
  // Commercial NRGP (500 kWh over 2 months: first 200 @ 4.75 = 950, remaining 300 @ 5.35 = 1605 -> 2555)
  const nrgp = calculateConfigurableCycleTariffBreakdown(
    'Commercial (NRGP)',
    6,
    500,
    { billingCycleType: 'BI_MONTHLY' }
  );
  assert.equal(nrgp.energyCharges, 2555);
  assert.equal(nrgp.fixedCharges, 840); // 2 months * 70/kW * 6 kW = 840

  // Industrial LTMD (1000 kWh @ 5.20 = 5200, fixed 2 * 90 * 10 = 1800)
  const ltmd = calculateConfigurableCycleTariffBreakdown(
    'Industrial (LTMD)',
    10,
    1000,
    { billingCycleType: 'BI_MONTHLY' }
  );
  assert.equal(ltmd.energyCharges, 5200);
  assert.equal(ltmd.fixedCharges, 1800);

  // Agricultural AG (800 kWh @ 0.60 = 480, fixed 2 * 20 * 7.5 = 300, FPPPA 800 * 2.50 = 2000, Duty 5% of 2780 = 139)
  const ag = calculateConfigurableCycleTariffBreakdown(
    'Agricultural (AG)',
    7.5,
    800,
    { billingCycleType: 'BI_MONTHLY', rebateOrSubsidyInr: 180 }
  );
  assert.equal(ag.energyCharges, 480);
  assert.equal(ag.fixedCharges, 300);
  assert.equal(ag.fuelPriceAdjustment, 2000);
  assert.equal(ag.electricityDuty, 139);
  assert.equal(ag.rebateOrSubsidy, 180);
  assert.equal(ag.totalAmount, 2739);
});

// 12. Two-month fixed charge calculation (standard & partial-period pro-rata)
verify(12, 'Two-month fixed charge calculation (standard 2-month & partial-period pro-rata)', () => {
  const fullTwoMonth = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    4,
    200,
    { billingCycleType: 'BI_MONTHLY' }
  );
  assert.equal(fullTwoMonth.fixedCharges, 200); // 2 * 25 * 4 = 200

  const partialTwoMonth = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    4,
    200,
    {
      billingCycleType: 'BI_MONTHLY',
      isPartialPeriod: true,
      billedDaysCount: 30,
      standardCycleDaysCount: 60,
    }
  );
  assert.equal(partialTwoMonth.fixedCharges, 100); // 50% pro-rata of 200 = 100
});

// 13. FPPPA and electricity duty calculation
verify(13, 'FPPPA and electricity duty calculation accuracy', () => {
  const rgpu = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    2,
    300,
    { billingCycleType: 'BI_MONTHLY' }
  );
  // FPPPA = 300 * 2.50 = 750
  assert.equal(rgpu.fuelPriceAdjustment, 750);
  // Energy = 100*3.05 (305) + 100*3.50 (350) + 100*4.15 (415) = 1070
  // Fixed = 2 * 25 * 2 = 100
  // Duty = 15% of (1070 + 100 + 750) = 15% of 1920 = 288
  assert.equal(rgpu.electricityDuty, 288);
});

// 14. Rebate and adjustment calculation
verify(14, 'Rebate and adjustment calculation in total payable', () => {
  const withRebateAndAdjustment = calculateConfigurableCycleTariffBreakdown(
    'Residential (RGPU)',
    2,
    300,
    {
      billingCycleType: 'BI_MONTHLY',
      rebateOrSubsidyInr: 75,
      otherAdjustmentsInr: 25,
    }
  );
  assert.equal(withRebateAndAdjustment.rebateOrSubsidy, 75);
  assert.equal(withRebateAndAdjustment.otherAdjustmentsInr, 25);
  // 1070 + 100 + 750 + 288 + 25 - 75 = 2158
  assert.equal(withRebateAndAdjustment.totalAmount, 2158);
});

// 15. Rounding and total reconciliation
verify(15, 'Rounding and component sum reconciliation with totalAmount', () => {
  for (const units of [0, 47, 133, 289, 512, 875]) {
    const res = calculateConfigurableCycleTariffBreakdown(
      'Residential (RGPU)',
      3.5,
      units,
      { billingCycleType: 'BI_MONTHLY' }
    );
    const slabSum = Number(res.slabBreakdown.reduce((s, row) => s + row.amount, 0).toFixed(2));
    assert.equal(slabSum, res.energyCharges);
    const componentTotal = Math.round(
      res.energyCharges +
        res.fixedCharges +
        res.fuelPriceAdjustment +
        res.electricityDuty +
        res.otherAdjustmentsInr -
        res.rebateOrSubsidy
    );
    assert.equal(componentTotal, res.totalAmount);
  }
});

// 16. Arrears carry-forward across two-month cycles
verify(16, 'Arrears / outstanding balance aggregation across mixed monthly and two-month bills', () => {
  const conn = INITIAL_CONNECTIONS[0]; // 04281-99231 has unpaid Sep 2026 bill of ₹3,004
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10, // Oct–Nov 2026
    simulatedUnitsKwh: 680,
  });
  assert.equal(genBiMonthly.created, true);
  assert.ok(genBiMonthly.bill);

  const summary = selectConsumerAccountBillingSummary({
    allConnections: INITIAL_CONNECTIONS,
    allBills: genBiMonthly.updatedBills,
    allPayments: INITIAL_PAYMENTS,
    actorScope: {
      accountId: conn.accountId,
      ownedConsumerNos: [conn.consumerNo],
    },
    selectedConnectionNo: conn.consumerNo,
    referenceDate: '15-Nov-2026',
  });

  // Unpaid Sep 2026 (₹2,185) + unpaid Oct–Nov 2026 bi-monthly bill
  assert.equal(summary.selectedConnectionSummary?.dueBillCount, 2);
  assert.equal(
    summary.selectedConnectionSummary?.totalOutstandingAmount,
    2185 + genBiMonthly.bill.totalAmount
  );
  // Latest bill should be the newest Oct–Nov 2026 bi-monthly bill
  assert.equal(summary.selectedConnectionSummary?.latestBill?.billNo, genBiMonthly.bill.billNo);
  assert.equal(summary.selectedConnectionSummary?.latestBill?.billingCycleType, 'BI_MONTHLY');
});

// 17. Full payment reconciliation
verify(17, 'Full payment reconciliation for a two-month bill', () => {
  const conn = INITIAL_CONNECTIONS[0];
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10,
    simulatedUnitsKwh: 600,
  });
  assert.ok(genBiMonthly.bill);

  const paymentRes = applyPaymentToBill({
    bill: genBiMonthly.bill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    referenceDate: '10-Dec-2026',
  });
  assert.equal(paymentRes.success, true);
  assert.ok(paymentRes.reconciledBill);
  assert.ok(paymentRes.paymentTransaction);
  assert.equal(paymentRes.reconciledBill.effectiveStatus, 'Paid');
  assert.equal(paymentRes.reconciledBill.outstandingBalance, 0);
  assert.equal(paymentRes.reconciledBill.isDue, false);
  assert.equal(paymentRes.reconciledBill.isPaid, true);
  assert.equal(paymentRes.reconciledBill.billingCycleType, 'BI_MONTHLY');

  // Verify receipt document generation for paid bi-monthly bill
  const receiptDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: {
      id: conn.accountId || 'demo_consumer',
      name: conn.consumerName,
      role: 'consumer',
      ownedConsumerNos: [conn.consumerNo],
    },
    bill: paymentRes.reconciledBill,
    payment: paymentRes.paymentTransaction,
    connection: conn,
    allPayments: [paymentRes.paymentTransaction, ...INITIAL_PAYMENTS],
    language: 'en',
  });
  assert.ok(receiptDoc);
  assert.equal(receiptDoc.documentType, 'payment_receipt');
  assert.equal(receiptDoc.eligible, true);
  assert.equal(receiptDoc.authorized, true);
});

// 18. Partial payment reconciliation
verify(18, 'Partial payment reconciliation for a two-month bill', () => {
  const conn = INITIAL_CONNECTIONS[0];
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10,
    simulatedUnitsKwh: 600,
  });
  assert.ok(genBiMonthly.bill);

  const partialAmount = 1500;
  const partialRes = applyPaymentToBill({
    bill: genBiMonthly.bill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'Net Banking',
    amountToPay: partialAmount,
    referenceDate: '10-Dec-2026',
  });
  assert.equal(partialRes.success, true);
  assert.ok(partialRes.reconciledBill);
  assert.equal(partialRes.reconciledBill.effectiveStatus, 'Partially Paid');
  assert.equal(partialRes.reconciledBill.paidAmount, 1500);
  assert.equal(
    partialRes.reconciledBill.outstandingBalance,
    genBiMonthly.bill.totalAmount - 1500
  );
  assert.equal(partialRes.reconciledBill.isDue, true);
  assert.equal(partialRes.reconciledBill.isPartiallyPaid, true);
});

// 19. Failed/pending payment non-settlement
verify(19, 'Failed and pending payments never settle or reduce two-month bill balance', () => {
  const conn = INITIAL_CONNECTIONS[0];
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10,
    simulatedUnitsKwh: 600,
  });
  assert.ok(genBiMonthly.bill);

  const failedRes = applyPaymentToBill({
    bill: genBiMonthly.bill,
    existingPayments: INITIAL_PAYMENTS,
    paymentMethod: 'UPI / BHIM',
    simulatedOutcome: 'FAILED',
    referenceDate: '10-Dec-2026',
  });
  assert.equal(failedRes.success, false);
  assert.equal(failedRes.reconciledBill?.outstandingBalance, genBiMonthly.bill.totalAmount);
  assert.equal(failedRes.reconciledBill?.paidAmount, 0);

  const pendingRes = applyPaymentToBill({
    bill: genBiMonthly.bill,
    existingPayments: failedRes.paymentTransaction
      ? [failedRes.paymentTransaction, ...INITIAL_PAYMENTS]
      : INITIAL_PAYMENTS,
    paymentMethod: 'RTGS/NEFT',
    simulatedOutcome: 'PENDING',
    referenceDate: '10-Dec-2026',
  });
  assert.equal(pendingRes.success, false);
  assert.equal(pendingRes.reconciledBill?.outstandingBalance, genBiMonthly.bill.totalAmount);
  assert.equal(pendingRes.reconciledBill?.paidAmount, 0);
});

// 20. Overdue status calculation
verify(20, 'Overdue status calculation when referenceDate is past two-month bill dueDate', () => {
  const conn = INITIAL_CONNECTIONS[0];
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10, // Oct–Nov 2026, due 20-Dec-2026
  });
  assert.ok(genBiMonthly.bill);
  assert.equal(genBiMonthly.bill.dueDate, '20-Dec-2026');

  const beforeDue = reconcileBillWithPayments(genBiMonthly.bill, INITIAL_PAYMENTS, '15-Dec-2026');
  assert.equal(beforeDue.effectiveStatus, 'Unpaid');
  assert.equal(beforeDue.isOverdue, false);

  const afterDue = reconcileBillWithPayments(genBiMonthly.bill, INITIAL_PAYMENTS, '28-Dec-2026');
  assert.equal(afterDue.effectiveStatus, 'Overdue');
  assert.equal(afterDue.isOverdue, true);
  assert.equal(afterDue.isDue, true);
});

// 21. Legacy monthly bill compatibility & Document/Calendar integration
verify(21, 'Legacy monthly bills remain normalized as MONTHLY without mutation and coexist with BI_MONTHLY in Documents & Calendar', () => {
  for (const legacyBill of INITIAL_BILLS) {
    const meta = resolveBillCycleMetadata(legacyBill);
    assert.equal(meta.billingCycleType, 'MONTHLY');
    assert.ok(meta.periodStartDate.startsWith('01-'));
    const rec = reconcileBillWithPayments(legacyBill, INITIAL_PAYMENTS);
    assert.equal(rec.billingCycleType, 'MONTHLY');
  }

  // Generate a bi-monthly bill and verify both Document Engine and Smart Payment Calendar handle it seamlessly
  const conn = INITIAL_CONNECTIONS[0];
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 10, // Oct–Nov 2026
  });
  assert.ok(genBiMonthly.bill);

  const billDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: {
      id: conn.accountId || 'demo_consumer',
      name: conn.consumerName,
      role: 'consumer',
      ownedConsumerNos: [conn.consumerNo],
    },
    bill: genBiMonthly.bill,
    connection: conn,
    payments: INITIAL_PAYMENTS,
    allBills: genBiMonthly.updatedBills,
    language: 'en',
  });
  assert.ok(billDoc);
  assert.equal(billDoc.documentType, 'electricity_bill');
  assert.equal(billDoc.eligible, true);
  assert.equal(billDoc.authorized, true);
  assert.ok(billDoc.billParticulars);
  assert.equal(billDoc.billParticulars.billMonth, 'October–November 2026');
  assert.equal(billDoc.billParticulars.billedUnits, genBiMonthly.bill.unitsConsumed);
  assert.equal(billDoc.billParticulars.slabArithmeticReconciled, true);

  const calendarEvents = derivePaymentCalendarEvents({
    bills: genBiMonthly.updatedBills,
    connections: INITIAL_CONNECTIONS,
    payments: INITIAL_PAYMENTS,
    authorizedConsumerNos: [conn.consumerNo],
    referenceDate: '10-Dec-2026',
  });
  const biMonthlyEvent = calendarEvents.find(e => e.billNo === genBiMonthly.bill?.billNo);
  assert.ok(biMonthlyEvent);
  assert.equal(biMonthlyEvent.billingCycleType, 'BI_MONTHLY');
  assert.equal(biMonthlyEvent.periodStartDate, '01-Oct-2026');
  assert.equal(biMonthlyEvent.periodEndDate, '30-Nov-2026');
  const calSummary = computeCalendarSummary(calendarEvents);
  assert.equal(calSummary.totalBillsCount, 4); // 3 legacy monthly + 1 bi-monthly for 04281-99231
});

// 22. Management analytics non-double-counting of two-month bills
verify(22, 'Management and Consumer canonical analytics never double-count two-month bills', () => {
  const baselineMgmt = selectManagementCanonicalMetrics({
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    feeders: FEEDER_METRICS,
    timePeriod: 'FY26-YTD',
  });

  const conn = INITIAL_CONNECTIONS[1]; // 04281-77190 (has only September 2026 bill of ₹14,854)
  // Generate a Jul–Aug 2026 bi-monthly bill for 04281-77190 (non-overlapping with Sep 2026)
  const genBiMonthly = generateDeterministicBiMonthlyBillForConnection({
    connection: conn,
    existingBills: INITIAL_BILLS,
    startYear: 2026,
    startMonth1To12: 7, // July–August 2026
    simulatedUnitsKwh: 500,
  });
  assert.equal(genBiMonthly.created, true);
  assert.ok(genBiMonthly.bill);

  const updatedMgmt = selectManagementCanonicalMetrics({
    bills: genBiMonthly.updatedBills,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    feeders: FEEDER_METRICS,
    timePeriod: 'FY26-YTD',
  });

  // Total live ERP billed INR must increase by EXACTLY 1x the bi-monthly bill amount (never 2x!)
  assert.equal(
    updatedMgmt.executiveKpis.liveErpTotalBilledInr - baselineMgmt.executiveKpis.liveErpTotalBilledInr,
    genBiMonthly.bill.totalAmount
  );

  // Sum of liveCanonicalBilledInr across all trajectory points must also increase by EXACTLY 1x (attributed to closing month 'Aug')
  const baselineTrajectorySum = baselineMgmt.monthlyTrajectorySeries.reduce(
    (s, pt) => s + pt.liveCanonicalBilledInr,
    0
  );
  const updatedTrajectorySum = updatedMgmt.monthlyTrajectorySeries.reduce(
    (s, pt) => s + pt.liveCanonicalBilledInr,
    0
  );
  assert.equal(updatedTrajectorySum - baselineTrajectorySum, genBiMonthly.bill.totalAmount);

  // Consumer analytics trend chart formats the two-month period as 'Jul–Aug 2026'
  const consumerAnalytics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: genBiMonthly.updatedBills,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: { accountId: conn.accountId, ownedConsumerNos: [conn.consumerNo] },
    selectedConnectionNo: conn.consumerNo,
  });
  assert.equal(
    consumerAnalytics.connectionTotalBilledInr,
    14854 + genBiMonthly.bill.totalAmount
  );
  assert.ok(
    consumerAnalytics.consumptionTrendSeries.some(pt => pt.month === 'Jul–Aug 2026')
  );
});

// 23. Four-language billing-cycle label rendering (en, gu, hi, mr)
verify(23, 'Four-language localization of two-month periods, cycle badges, and provenance labels (en, gu, hi, mr)', () => {
  // Same-year two-month period
  assert.equal(localizeBillMonth('September–October 2026', 'en'), 'September–October 2026');
  assert.equal(localizeBillMonth('September–October 2026', 'gu'), 'સપ્ટેમ્બર–ઓક્ટોબર 2026');
  assert.equal(localizeBillMonth('September–October 2026', 'hi'), 'सितंबर–अक्टूबर 2026');
  assert.equal(localizeBillMonth('September–October 2026', 'mr'), 'सप्टेंबर–ऑक्टोबर 2026');

  // Cross-year two-month period
  assert.equal(
    localizeBillMonth('December 2026–January 2027', 'gu'),
    'ડિસેમ્બર 2026–જાન્યુઆરી 2027'
  );
  assert.equal(
    localizeBillMonth('December 2026–January 2027', 'hi'),
    'दिसंबर 2026–जनवरी 2027'
  );
  assert.equal(
    localizeBillMonth('December 2026–January 2027', 'mr'),
    'डिसेंबर 2026–जानेवारी 2027'
  );

  // Cycle type & short badges across all 4 languages
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    assert.ok(localizeBillingCycleType('MONTHLY', lang).length > 0);
    assert.ok(localizeBillingCycleType('BI_MONTHLY', lang).length > 0);
    assert.ok(localizeBillingCycleShortBadge('MONTHLY', lang).length > 0);
    assert.ok(localizeBillingCycleShortBadge('BI_MONTHLY', lang).length > 0);
    assert.ok(localizeMeterReadingProvenance('RECORDED', lang).length > 0);
    assert.ok(localizeMeterReadingProvenance('ESTIMATED_AVERAGE', lang).length > 0);
    const ui = getBillingUiTranslations(lang);
    assert.ok(ui.generateDemoBiMonthlyBillBtn.length > 0);
    assert.ok(ui.biMonthlyCycleBadge.length > 0);
  }
});

// 24. Existing DEMO data preservation
verify(24, 'Existing DEMO data preservation (zero silent mutation of INITIAL_CONNECTIONS, INITIAL_BILLS, INITIAL_PAYMENTS)', () => {
  assert.equal(JSON.stringify(INITIAL_CONNECTIONS), seedConnectionsSnapshot);
  assert.equal(JSON.stringify(INITIAL_BILLS), seedBillsSnapshot);
  assert.equal(JSON.stringify(INITIAL_PAYMENTS), seedPaymentsSnapshot);
  assert.equal(INITIAL_CONNECTIONS.length, 2);
  assert.equal(INITIAL_BILLS.length, 4);
  assert.equal(INITIAL_PAYMENTS.length, 3);
});

console.log('-------------------------------------------------------------------');
console.log(`🎉 PHASE 9 STEP 1 VERIFICATION COMPLETE: ${passedCount}/24 PASSED`);
console.log('===================================================================');
