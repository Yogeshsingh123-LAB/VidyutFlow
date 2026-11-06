import type { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../types';
import {
  calculateConfigurableCycleTariffBreakdown
} from '../utils/billingEngine';
import {
  type BillCheckResult,
  type BillValidationFinding,
  type BillLineComparisonItem,
  type MeterReadingRecord
} from './meterReading';

/**
 * Authoritative Read-Only Bill Verification against Phase 9's canonical calculations.
 * Checks slabs, fixed charges, FPPPA, duty, subsidies, adjustments, payments,
 * approved reading linkage, and period consistency without mutating any ledger records.
 */
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

  // 1. Inconsistent / negative units check
  if (!Number.isFinite(bill.unitsConsumed) || bill.unitsConsumed < 0) {
    const msg = `Inconsistent units consumed (${bill.unitsConsumed}); must be a non-negative number.`;
    evidence.push(msg);
    addFinding('INCONSISTENT_INPUTS', 'HIGH', msg, String(bill.unitsConsumed), 'Review original meter readings and interval calculation.', '>= 0');
  }

  // 2. Duplicate bill & period overlap checks
  const duplicatePeriods = allBills.filter(
    item => item.consumerNo === bill.consumerNo && item.billMonth === bill.billMonth
  );
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

  // Overlapping period check
  if (bill.periodStartDate && bill.periodEndDate) {
    const billStart = new Date(bill.periodStartDate).getTime();
    const billEnd = new Date(bill.periodEndDate).getTime();
    for (const other of allBills) {
      if (other.billNo === bill.billNo || other.consumerNo !== bill.consumerNo) continue;
      if (!other.periodStartDate || !other.periodEndDate) continue;
      const otherStart = new Date(other.periodStartDate).getTime();
      const otherEnd = new Date(other.periodEndDate).getTime();
      if (!isNaN(billStart) && !isNaN(billEnd) && !isNaN(otherStart) && !isNaN(otherEnd)) {
        // Strict overlap: start < otherEnd && end > otherStart
        if (billStart < otherEnd && billEnd > otherStart) {
          const msg = `Billing period (${bill.periodStartDate} to ${bill.periodEndDate}) overlaps with bill ${other.billNo} (${other.periodStartDate} to ${other.periodEndDate}).`;
          evidence.push(msg);
          addFinding('DUPLICATE_BILL', 'HIGH', msg, `${bill.billNo} overlaps ${other.billNo}`, 'Verify billing cycle schedule to prevent double-charging.', 'Non-overlapping periods');
          break;
        }
      }
    }
  }

  // 3. Approved meter reading linkage check
  if (meterReadings.length > 0) {
    let linkedReading = meterReadings.find(r => r.id === bill.readingId);
    if (!linkedReading) {
      // Fallback search by consumer number and approved status
      linkedReading = meterReadings.find(r => r.consumerNo === bill.consumerNo && r.status === 'APPROVED');
    }
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

  // 4. Payment reconciliation & split/partial payments check (Phase 9 payment reconciliation)
  const billPayments = payments.filter(item => item.billNo === bill.billNo);
  const successfulPayments = billPayments.filter(item => item.status === 'Successful');
  const totalPaidThroughPayments = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

  if (bill.status === 'Paid') {
    if (successfulPayments.length === 0) {
      const msg = `Bill is marked 'Paid' but has 0 verified successful payment transaction records.`;
      evidence.push(msg);
      addFinding('PAYMENT_LINKAGE_MISMATCH', 'HIGH', msg, '0 payment records', 'Verify payment gateway settlement receipts.', '>= 1 payment record');
    } else if (Math.abs(totalPaidThroughPayments - bill.totalAmount) > 1.0) {
      const msg = `Successful payment total (₹${totalPaidThroughPayments.toFixed(2)}) differs from stored bill total (₹${bill.totalAmount.toFixed(2)}).`;
      evidence.push(msg);
      addFinding('PAYMENT_LINKAGE_MISMATCH', 'HIGH', msg, `₹${totalPaidThroughPayments.toFixed(2)}`, 'Reconcile partial payments and update remaining ledger balance.', `₹${bill.totalAmount.toFixed(2)}`);
    }
  }

  if (bill.status !== 'Paid' && totalPaidThroughPayments >= bill.totalAmount && bill.totalAmount > 0) {
    const msg = `An unpaid or overdue bill has full settlement payments recorded (₹${totalPaidThroughPayments.toFixed(2)}).`;
    evidence.push(msg);
    addFinding('PAYMENT_LINKAGE_MISMATCH', 'HIGH', msg, `Status: ${bill.status}, Paid: ₹${totalPaidThroughPayments.toFixed(2)}`, 'Transition bill status to Paid upon verified settlement.', 'Status: Paid');
  }

  if (bill.transactionRef && successfulPayments.length === 1 && successfulPayments[0].bankReference !== bill.transactionRef) {
    const msg = 'Bill transaction reference does not match its successful payment bank reference.';
    evidence.push(msg);
    addFinding('PAYMENT_LINKAGE_MISMATCH', 'REVIEW', msg, bill.transactionRef, 'Cross-check bank UTR/transaction reference against gateway records.', successfulPayments[0].bankReference);
  }

  // 5. Authoritative Phase 9 Tariff Recalculation
  const cycleType = bill.billingCycleType === 'MONTHLY' ? 'MONTHLY' : 'BI_MONTHLY';
  const canonical = calculateConfigurableCycleTariffBreakdown(
    connection.tariffCategory,
    connection.sanctionedLoadKw,
    bill.unitsConsumed,
    {
      billingCycleType: cycleType,
      policyMode: bill.tariffCyclePolicyMode || (cycleType === 'BI_MONTHLY' ? 'BI_MONTHLY_PROPORTIONAL_2X_DEMO' : 'MONTHLY_STANDARD'),
      isPartialPeriod: bill.isPartialPeriod,
      billedDaysCount: bill.billedDaysCount,
      standardCycleDaysCount: bill.standardCycleDaysCount,
      rebateOrSubsidyInr: bill.rebateOrSubsidy,
      otherAdjustmentsInr: bill.otherAdjustmentsInr
    }
  );

  const lineChecks: Array<{
    label: string;
    expected: number;
    recorded: number;
    category: BillValidationFinding['category'];
  }> = [
    { label: 'Energy charges', expected: canonical.energyCharges, recorded: bill.energyCharges, category: 'TARIFF_SLAB_MISMATCH' },
    { label: 'Fixed charges', expected: canonical.fixedCharges, recorded: bill.fixedCharges, category: 'FIXED_CHARGE_MISMATCH' },
    { label: 'FPPPA', expected: canonical.fuelPriceAdjustment, recorded: bill.fuelPriceAdjustment, category: 'FPPPA_MISMATCH' },
    { label: 'Electricity duty', expected: canonical.electricityDuty, recorded: bill.electricityDuty, category: 'ELECTRICITY_DUTY_MISMATCH' }
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
      const msg = `${item.label} differs from Phase 9 canonical tariff calculation by ₹${diff.toFixed(2)}.`;
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

  // Final payable check
  const expectedPayable = canonical.totalAmount;
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
    const msg = `Stored final payable differs from Phase 9 canonical calculations by ₹${Math.abs(difference).toFixed(2)}; authorized ledger adjustments may explain this.`;
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
    evidence: evidence.length ? evidence : ['Bill line items, final amount and payment linkage match Phase 9 canonical calculations.'],
    billNo: bill.billNo,
    findings,
    comparison
  };
}
