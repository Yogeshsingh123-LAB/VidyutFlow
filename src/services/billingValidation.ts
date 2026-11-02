import type { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../types';
import { calculateDetailedUgvclBill } from '../data/ugvclTariffSchedule';
import { tariffCategoryId, type BillCheckResult } from './meterReading';

/** Read-only comparison against the project's existing tariff calculator. It never changes bills or payment records. */
export function validateExistingBill(input: {
  bill: ElectricityBill;
  connection: ElectricityConnection;
  allBills: ElectricityBill[];
  payments: PaymentTransaction[];
}): BillCheckResult {
  const { bill, connection, allBills, payments } = input;
  const evidence: string[] = [];
  const duplicatePeriods = allBills.filter(item => item.consumerNo === bill.consumerNo && item.billMonth === bill.billMonth);
  if (duplicatePeriods.length > 1) evidence.push(`More than one bill exists for ${bill.billMonth} (${duplicatePeriods.map(item => item.billNo).join(', ')}).`);
  const sameBillIds = allBills.filter(item => item.billNo === bill.billNo);
  if (sameBillIds.length > 1) evidence.push(`Bill number ${bill.billNo} is duplicated.`);
  const billPayments = payments.filter(item => item.billNo === bill.billNo);
  const successfulPayments = billPayments.filter(item => item.status === 'Successful');
  if (bill.status === 'Paid' && successfulPayments.length !== 1) evidence.push(`Paid bill has ${successfulPayments.length} successful payment records; expected exactly one.`);
  if (successfulPayments.some(payment => Math.abs(payment.amount - bill.totalAmount) > 0.01)) evidence.push('Successful payment amount does not match the stored bill total.');
  if (bill.transactionRef && successfulPayments.length === 1 && successfulPayments[0].bankReference !== bill.transactionRef) evidence.push('Bill transaction reference does not match its successful payment.');
  if (bill.status !== 'Paid' && successfulPayments.length > 0) evidence.push('An unpaid bill has a successful payment record.');

  const supported = connection.tariffCategory.includes('Residential') || connection.tariffCategory.includes('Commercial');
  if (!supported) {
    evidence.push(`Tariff category ${connection.tariffCategory} is not covered by the current educational tariff calculator.`);
    return { status: 'REVIEW', expectedAmount: 0, recordedAmount: bill.totalAmount, difference: 0, evidence, billNo: bill.billNo };
  }
  const expected = calculateDetailedUgvclBill(
    bill.unitsConsumed,
    tariffCategoryId(connection.tariffCategory),
    'bimonthly',
    connection.sanctionedLoadKw,
    connection.phase
  );
  const lineChecks: Array<[string, number, number]> = [
    ['Energy charges', expected.totalEnergyCharges, bill.energyCharges],
    ['Fixed charges', expected.fixedCharges.amount, bill.fixedCharges],
    ['FPPPA', expected.fpppaCharges.amount, bill.fuelPriceAdjustment],
    ['Electricity duty', expected.electricityDuty.amount, bill.electricityDuty]
  ];
  for (const [label, expectedValue, recordedValue] of lineChecks) {
    if (Math.abs(expectedValue - recordedValue) > 1) evidence.push(`${label} differs from the tariff calculator by ₹${Math.abs(expectedValue - recordedValue).toFixed(2)}.`);
  }
  const expectedPayable = Math.max(0, expected.netPayableAmount - bill.rebateOrSubsidy);
  const difference = bill.totalAmount - expectedPayable;
  if (Math.abs(difference) > 1) evidence.push(`Stored final payable differs from the tariff calculator by ₹${Math.abs(difference).toFixed(2)}; ledger adjustments may explain this.`);
  return {
    status: evidence.length ? 'REVIEW' : 'CLEAR',
    expectedAmount: expectedPayable,
    recordedAmount: bill.totalAmount,
    difference,
    evidence: evidence.length ? evidence : ['Bill line items, final amount and payment linkage match this read-only demo check.'],
    billNo: bill.billNo
  };
}
