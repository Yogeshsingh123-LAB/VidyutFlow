import type { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../types';
import { calculateDetailedUgvclBill } from '../data/ugvclTariffSchedule';
import {
  tariffCategoryId,
  type BillCheckResult,
  type BillValidationFinding,
  type BillLineComparisonItem,
  type MeterReadingRecord
} from './meterReading';

/** Read-only comparison against the project's existing tariff calculator. It never changes bills or payment records. */
export function validateExistingBill(input: {
  bill: ElectricityBill;
  connection: ElectricityConnection;
  allBills: ElectricityBill[];
  payments: PaymentTransaction[];
  meterReadings?: MeterReadingRecord[];
}): BillCheckResult {
  const { bill, connection, allBills, payments, meterReadings = [] } = input;
  const evidence: string[] = [];
  const findings: BillValidationFinding[] = [];
  const comparison: BillLineComparisonItem[] = [];

  let findingCounter = 1;
  const addFinding = (
    category: BillValidationFinding['category'],
    severity: BillValidationFinding['severity'],
    explanation: string,
    actualValue: string,
    suggestedAction: string,
    expectedValue?: string,
    relatedReadingId?: string
  ) => {
    findings.push({
      findingId: `FND-${bill.billNo}-${String(findingCounter++).padStart(3, '0')}`,
      category,
      severity,
      explanation,
      actualValue,
      suggestedAction,
      expectedValue,
      relatedBillNo: bill.billNo,
      relatedReadingId
    });
  };

  // Missing or inconsistent inputs check
  if (!Number.isFinite(bill.unitsConsumed) || bill.unitsConsumed < 0) {
    const msg = `Inconsistent units consumed (${bill.unitsConsumed}); must be a non-negative number.`;
    evidence.push(msg);
    addFinding('INCONSISTENT_INPUTS', 'HIGH', msg, String(bill.unitsConsumed), 'Review original meter readings and interval calculation.', '>= 0');
  }

  // Duplicate checks
  const duplicatePeriods = allBills.filter(item => item.consumerNo === bill.consumerNo && item.billMonth === bill.billMonth);
  if (duplicatePeriods.length > 1) {
    const dupBills = duplicatePeriods.map(item => item.billNo).join(', ');
    const msg = `More than one bill exists for ${bill.billMonth} (${dupBills}).`;
    evidence.push(msg);
    addFinding('DUPLICATE_BILL', 'HIGH', msg, dupBills, 'Retain authorized original bill and review duplicate billing cycle.', '1 bill per month');
  }
  const sameBillIds = allBills.filter(item => item.billNo === bill.billNo);
  if (sameBillIds.length > 1) {
    const msg = `Bill number ${bill.billNo} is duplicated.`;
    evidence.push(msg);
    addFinding('DUPLICATE_BILL', 'HIGH', msg, `${sameBillIds.length} copies`, 'Enforce unique bill identifier constraint on billing ledger.', '1 instance');
  }

  // Reading linkage check if meterReadings are supplied
  if (meterReadings.length > 0) {
    const linkedReading = meterReadings.find(r => r.consumerNo === bill.consumerNo && r.status === 'APPROVED');
    if (linkedReading && linkedReading.consumedUnits !== undefined) {
      if (Math.abs(linkedReading.consumedUnits - bill.unitsConsumed) > 0.01) {
        const msg = `Billed units (${bill.unitsConsumed} kWh) do not match approved meter reading units (${linkedReading.consumedUnits} kWh).`;
        evidence.push(msg);
        addFinding(
          'INCORRECT_READING_LINKAGE',
          'HIGH',
          msg,
          `${bill.unitsConsumed} kWh`,
          'Align bill computation with the approved meter reading record.',
          `${linkedReading.consumedUnits} kWh`,
          linkedReading.id
        );
      }
    }
  }

  // Payment linkage checks
  const billPayments = payments.filter(item => item.billNo === bill.billNo);
  const successfulPayments = billPayments.filter(item => item.status === 'Successful');
  if (bill.status === 'Paid' && successfulPayments.length !== 1) {
    const msg = `Paid bill has ${successfulPayments.length} successful payment records; expected exactly one.`;
    evidence.push(msg);
    addFinding('PAYMENT_LINKAGE_MISMATCH', 'REVIEW', msg, `${successfulPayments.length} records`, 'Audit payment gateway settlement transaction receipts.', '1 successful payment');
  }
  if (successfulPayments.some(payment => Math.abs(payment.amount - bill.totalAmount) > 0.01)) {
    const msg = 'Successful payment amount does not match the stored bill total.';
    evidence.push(msg);
    const paidAmt = successfulPayments.map(p => `₹${p.amount}`).join(', ');
    addFinding('PAYMENT_LINKAGE_MISMATCH', 'HIGH', msg, paidAmt, 'Verify payment receipt discrepancy and adjust outstanding ledger balance.', `₹${bill.totalAmount}`);
  }
  if (bill.transactionRef && successfulPayments.length === 1 && successfulPayments[0].bankReference !== bill.transactionRef) {
    const msg = 'Bill transaction reference does not match its successful payment.';
    evidence.push(msg);
    addFinding('PAYMENT_LINKAGE_MISMATCH', 'REVIEW', msg, bill.transactionRef, 'Cross-check bank UTR/transaction reference against gateway records.', successfulPayments[0].bankReference);
  }
  if (bill.status !== 'Paid' && successfulPayments.length > 0) {
    const msg = 'An unpaid bill has a successful payment record.';
    evidence.push(msg);
    addFinding('PAYMENT_LINKAGE_MISMATCH', 'HIGH', msg, `Status: ${bill.status}`, 'Update bill status to Paid upon verified bank settlement.', 'Status: Paid');
  }

  const supported = connection.tariffCategory.includes('Residential') || connection.tariffCategory.includes('Commercial');
  if (!supported) {
    evidence.push(`Tariff category ${connection.tariffCategory} is not covered by the current educational tariff calculator.`);
    addFinding('TARIFF_SLAB_MISMATCH', 'INFO', `Tariff category ${connection.tariffCategory} requires custom industrial tariff schedule.`, connection.tariffCategory, 'Refer to industrial MYT schedule.');
    return {
      status: 'REVIEW',
      expectedAmount: 0,
      recordedAmount: bill.totalAmount,
      difference: 0,
      evidence,
      billNo: bill.billNo,
      findings,
      comparison
    };
  }

  const expected = calculateDetailedUgvclBill(
    bill.unitsConsumed,
    tariffCategoryId(connection.tariffCategory),
    'bimonthly',
    connection.sanctionedLoadKw,
    connection.phase
  );

  const lineChecks: Array<{
    label: string;
    expected: number;
    recorded: number;
    category: BillValidationFinding['category'];
  }> = [
    { label: 'Energy charges', expected: expected.totalEnergyCharges, recorded: bill.energyCharges, category: 'TARIFF_SLAB_MISMATCH' },
    { label: 'Fixed charges', expected: expected.fixedCharges.amount, recorded: bill.fixedCharges, category: 'FIXED_CHARGE_MISMATCH' },
    { label: 'FPPPA', expected: expected.fpppaCharges.amount, recorded: bill.fuelPriceAdjustment, category: 'FPPPA_MISMATCH' },
    { label: 'Electricity duty', expected: expected.electricityDuty.amount, recorded: bill.electricityDuty, category: 'ELECTRICITY_DUTY_MISMATCH' }
  ];

  for (const item of lineChecks) {
    const diff = Math.abs(item.expected - item.recorded);
    const hasDiscrepancy = diff > 1;
    comparison.push({
      lineItem: item.label,
      expected: item.expected,
      recorded: item.recorded,
      difference: diff,
      status: hasDiscrepancy ? 'DISCREPANCY' : 'MATCH'
    });
    if (hasDiscrepancy) {
      const msg = `${item.label} differs from the tariff calculator by ₹${diff.toFixed(2)}.`;
      evidence.push(msg);
      addFinding(
        item.category,
        'REVIEW',
        msg,
        `₹${item.recorded.toFixed(2)}`,
        'Verify applicable slab tier, sanctioned load, or regulatory notification.',
        `₹${item.expected.toFixed(2)}`
      );
    }
  }

  const expectedPayable = Math.max(0, expected.netPayableAmount - bill.rebateOrSubsidy);
  const difference = bill.totalAmount - expectedPayable;
  const netDiscrepancy = Math.abs(difference) > 1;

  comparison.push({
    lineItem: 'Net Payable Amount',
    expected: expectedPayable,
    recorded: bill.totalAmount,
    difference: Math.abs(difference),
    status: netDiscrepancy ? 'DISCREPANCY' : 'MATCH'
  });

  if (netDiscrepancy) {
    const msg = `Stored final payable differs from the tariff calculator by ₹${Math.abs(difference).toFixed(2)}; ledger adjustments may explain this.`;
    evidence.push(msg);
    addFinding(
      'TARIFF_SLAB_MISMATCH',
      'REVIEW',
      msg,
      `₹${bill.totalAmount.toFixed(2)}`,
      'Check whether an authorized financial adjustment or subsidy was applied to the ledger.',
      `₹${expectedPayable.toFixed(2)}`
    );
  }

  return {
    status: evidence.length ? 'REVIEW' : 'CLEAR',
    expectedAmount: expectedPayable,
    recordedAmount: bill.totalAmount,
    difference,
    evidence: evidence.length ? evidence : ['Bill line items, final amount and payment linkage match this read-only demo check.'],
    billNo: bill.billNo,
    findings,
    comparison
  };
}
