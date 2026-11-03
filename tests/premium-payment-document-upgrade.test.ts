import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyPaymentToBill,
  validatePaymentAmountSelection,
  computeTransactionSettlementBreakdown,
  selectConnectionBillingSummary,
  reconcileBillWithPayments,
} from '../src/utils/billingEngine';
import {
  generateElectricityBillDocument,
  generatePaymentReceiptDocument,
  generateApplicationAcknowledgmentDocument,
  generateComplaintAcknowledgmentDocument,
  generateInspectionSummaryDocument,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  triggerOfficialDocumentPdfDownload,
  paginateOfficialDocumentForA4,
  buildDocumentFilename,
} from '../src/utils/documentEngine';
import { executeDatasetExport } from '../src/utils/exportEngine';
import {
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
} from '../src/components/common/UgvclBrandIdentity';
import {
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_CONNECTIONS,
} from '../src/data/mockData';
import {
  ElectricityBill,
  PaymentTransaction,
  NewConnectionApplication,
  WorkOrder,
} from '../src/types';

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
console.log('VIDYUTFLOW 2.0 — PHASE 5 STEP 5.2 PREMIUM PAYMENT & DOCUMENT UPGRADE');
console.log('37-Test Automated Verification Suite (Payment Modal, Receipts & PDFs)');
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
  email: 'ae.mehsana@ugvcl.demo',
  subdivision: 'Mehsana City North',
};

const fieldVikram = {
  id: 'FLD-UG-201',
  name: 'Vikramaditya Solanki (JE Field)',
  role: 'field' as const,
  subdivision: 'Mehsana City North',
};

const fieldHarshad = {
  id: 'FLD-UG-204',
  name: 'Harshadkumar Parmar (Sr. Lineman)',
  role: 'field' as const,
  subdivision: 'Mehsana Industrial GIDC',
};

const sampleUnpaidBill: ElectricityBill = {
  billNo: 'BILL-UG-2026-10-8821',
  consumerNo: '04281-99231',
  connectionId: '04281-99231',
  accountId: 'demo_consumer',
  billMonth: 'September 2026',
  billDate: '01-Oct-2026',
  dueDate: '20-Oct-2026',
  unitsConsumed: 310,
  energyCharges: 1480,
  fixedCharges: 70,
  fuelPriceAdjustment: 372,
  electricityDuty: 263,
  rebateOrSubsidy: 0,
  totalAmount: 2185,
  paidAmount: 0,
  outstandingBalance: 2185,
  status: 'Unpaid',
  slabBreakdown: [
    { slab: 'First 50 Units', units: 50, rate: 3.2, amount: 160 },
    { slab: 'Next 150 Units (51-200)', units: 150, rate: 4.9, amount: 735 },
    { slab: 'Above 200 Units (201-310)', units: 110, rate: 5.32, amount: 585 },
  ],
};

// ============================================================================
// PAYMENT MODAL & FLOW (Tests 1–16)
// ============================================================================

// Test 1: Redesigned payment modal shows official UGVCL logo, company name, Gujarati name and tagline
runTest(
  1,
  'Redesigned payment modal shows official UGVCL logo, company name, Gujarati name, and tagline',
  () => {
    const modalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/EnterprisePaymentModal.tsx'),
      'utf-8'
    );
    assert.ok(modalSource.includes('UGVCL_LOGO_ASSET_PATH'));
    assert.ok(modalSource.includes('UGVCL_COMPANY_NAME_EN'));
    assert.ok(modalSource.includes('UGVCL_COMPANY_NAME_GU'));
    assert.ok(modalSource.includes('UGVCL_TAGLINE_EN'));
    assert.equal(UGVCL_LOGO_ASSET_PATH, '/assets/ugvcl-logo.png');
    assert.equal(UGVCL_COMPANY_NAME_EN, 'Uttar Gujarat Vij Company Limited');
    assert.equal(UGVCL_COMPANY_NAME_GU, 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ');
    assert.equal(UGVCL_TAGLINE_EN, 'Consumer Satisfaction through Service Excellence');
  }
);

// Test 2: Payment modal displays all 11 mandatory Payment Summary Panel fields
runTest(
  2,
  'Payment modal displays Consumer Name, Consumer Number, Connection ID, Bill Number, Billing Period, Subdivision, Bill Total, Previously Paid Amount, Remaining Balance, Due Date, and Selected Payment Amount',
  () => {
    const modalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/EnterprisePaymentModal.tsx'),
      'utf-8'
    );
    const requiredTestIds = [
      'payment-summary-panel',
      'summary-consumer-name',
      'summary-consumer-number',
      'summary-connection-id',
      'summary-bill-number',
      'summary-billing-period',
      'summary-subdivision',
      'summary-total-bill-amount',
      'summary-previously-paid-amount',
      'summary-outstanding-balance',
      'summary-due-date',
      'summary-selected-payment-amount',
    ];
    for (const tid of requiredTestIds) {
      assert.ok(
        modalSource.includes(`data-testid="${tid}"`),
        `EnterprisePaymentModal must render ${tid}`
      );
    }
  }
);

// Test 3: Full Payment selects exact remaining balance
runTest(3, 'Full Payment selects exact remaining balance', () => {
  const fullValidation = validatePaymentAmountSelection({
    bill: sampleUnpaidBill,
    existingPayments: [],
    mode: 'FULL',
  });
  assert.equal(fullValidation.isValid, true);
  assert.equal(fullValidation.currentOutstandingAmount, 2185);
  assert.equal(fullValidation.selectedPaymentAmount, 2185);
  assert.equal(fullValidation.remainingBalanceAfterPayment, 0);
  assert.equal(fullValidation.isFullSettlement, true);
});

// Test 4: Partial Payment validates custom amount against remaining balance
runTest(4, 'Partial Payment validates custom amount against remaining balance', () => {
  const partialValidation = validatePaymentAmountSelection({
    bill: sampleUnpaidBill,
    existingPayments: [],
    mode: 'PARTIAL',
    customAmountInput: '1000',
  });
  assert.equal(partialValidation.isValid, true);
  assert.equal(partialValidation.selectedPaymentAmount, 1000);
  assert.equal(partialValidation.remainingBalanceAfterPayment, 1185);
  assert.equal(partialValidation.isFullSettlement, false);
});

// Test 5: Invalid partial payment amounts (0, negative, > remainingBalance, non-numeric) are rejected
runTest(
  5,
  'Invalid partial payment amounts (0, negative, > remainingBalance, non-numeric) are rejected',
  () => {
    const zeroRes = validatePaymentAmountSelection({
      bill: sampleUnpaidBill,
      existingPayments: [],
      mode: 'PARTIAL',
      customAmountInput: '0',
    });
    assert.equal(zeroRes.isValid, false);
    assert.ok(zeroRes.validationError?.includes('greater than ₹0'));

    const negRes = validatePaymentAmountSelection({
      bill: sampleUnpaidBill,
      existingPayments: [],
      mode: 'PARTIAL',
      customAmountInput: '-250',
    });
    assert.equal(negRes.isValid, false);
    assert.ok(negRes.validationError?.includes('greater than ₹0'));

    const exceedRes = validatePaymentAmountSelection({
      bill: sampleUnpaidBill,
      existingPayments: [],
      mode: 'PARTIAL',
      customAmountInput: '2500',
    });
    assert.equal(exceedRes.isValid, false);
    assert.ok(exceedRes.validationError?.includes('exceeds'));

    const nonNumRes = validatePaymentAmountSelection({
      bill: sampleUnpaidBill,
      existingPayments: [],
      mode: 'PARTIAL',
      customAmountInput: 'abc',
    });
    assert.equal(nonNumRes.isValid, false);
    assert.ok(nonNumRes.validationError?.includes('valid number'));

    const emptyRes = validatePaymentAmountSelection({
      bill: sampleUnpaidBill,
      existingPayments: [],
      mode: 'PARTIAL',
      customAmountInput: '',
    });
    assert.equal(emptyRes.isValid, false);
    assert.ok(emptyRes.validationError?.includes('valid payment amount'));
  }
);

// Test 6: Partial payment shows live remaining balance after payment
runTest(6, 'Partial payment shows live remaining balance after payment', () => {
  const check850 = validatePaymentAmountSelection({
    bill: sampleUnpaidBill,
    existingPayments: [],
    mode: 'PARTIAL',
    customAmountInput: '850',
  });
  assert.equal(check850.isValid, true);
  assert.equal(check850.selectedPaymentAmount, 850);
  assert.equal(check850.remainingBalanceAfterPayment, 1335);

  const modalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/EnterprisePaymentModal.tsx'),
    'utf-8'
  );
  assert.ok(modalSource.includes('data-testid="partial-live-remaining-balance"'));
});

// Test 7: Payment method selection works for UPI / BHIM, Net Banking, Debit Card, RTGS/NEFT
runTest(
  7,
  'Payment method selection works for UPI / BHIM, Net Banking, Debit Card, and RTGS/NEFT',
  () => {
    const methods = ['UPI / BHIM', 'Net Banking', 'Debit Card', 'RTGS/NEFT'] as const;
    for (const method of methods) {
      const res = applyPaymentToBill({
        bill: sampleUnpaidBill,
        existingPayments: [],
        paymentMethod: method,
        amountToPay: 2185,
        accountId: 'demo_consumer',
      });
      assert.equal(res.success, true);
      assert.equal(res.outcome, 'SUCCESS');
      assert.equal(res.paymentTransaction?.paymentMethod, method);
    }
  }
);

// Test 8: Clicking Authorize & Pay Now enters PROCESSING state and prevents duplicate submission
runTest(
  8,
  'Clicking Authorize & Pay Now enters PROCESSING state and prevents duplicate submission',
  () => {
    const modalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/EnterprisePaymentModal.tsx'),
      'utf-8'
    );
    assert.ok(modalSource.includes("setStepState('PROCESSING')"));
    assert.ok(modalSource.includes('data-testid="payment-processing-state"'));
    assert.ok(modalSource.includes('submitLockRef.current'));

    // In-flight locking in billing engine prevents duplicate submission
    const duplicateLockRes = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 2185,
      inFlightBillNos: new Set([sampleUnpaidBill.billNo.toUpperCase()]),
    });
    assert.equal(duplicateLockRes.success, false);
    assert.ok(duplicateLockRes.reason.includes('already in progress'));
  }
);

// Test 9: Successful full payment transitions to Payment Successful state inside the modal
runTest(
  9,
  'Successful full payment transitions to Payment Successful state inside the modal',
  () => {
    const res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 2185,
      accountId: 'demo_consumer',
      simulatedOutcome: 'SUCCESS',
    });

    assert.equal(res.success, true);
    assert.equal(res.outcome, 'SUCCESS');
    assert.equal(res.settlementClassification, 'FULL_SETTLEMENT');
    assert.equal(res.paidAmountApplied, 2185);
    assert.equal(res.previouslySettledAmount, 0);
    assert.equal(res.remainingBalance, 0);
    assert.equal(res.updatedBill?.status, 'Paid');
    assert.ok(res.paymentTransaction?.txId.startsWith('TXN-UG-'));

    const modalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/EnterprisePaymentModal.tsx'),
      'utf-8'
    );
    assert.ok(modalSource.includes("setStepState('SUCCESS')"));
    assert.ok(modalSource.includes('data-testid="payment-success-state"'));
  }
);

// Test 10: Successful partial payment transitions to Payment Successful with Partial Payment status and accurate remaining balance
runTest(
  10,
  'Successful partial payment transitions to Payment Successful with Partial Payment status and accurate remaining balance',
  () => {
    const res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'Net Banking',
      amountToPay: 1000,
      accountId: 'demo_consumer',
      simulatedOutcome: 'SUCCESS',
    });

    assert.equal(res.success, true);
    assert.equal(res.outcome, 'SUCCESS');
    assert.equal(res.settlementClassification, 'PARTIAL_SETTLEMENT');
    assert.equal(res.paidAmountApplied, 1000);
    assert.equal(res.previouslySettledAmount, 0);
    assert.equal(res.remainingBalance, 1185);
    assert.equal(res.updatedBill?.status, 'Partially Paid');
    assert.equal(res.updatedBill?.paidAmount, 1000);
    assert.equal(res.updatedBill?.outstandingBalance, 1185);
  }
);

// Test 11: Controlled failed payment transitions to Payment Failed, generates no receipt, and does not reduce bill balance
runTest(
  11,
  'Controlled failed payment transitions to Payment Failed, generates no receipt, and does not reduce bill balance',
  () => {
    const res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'Debit Card',
      amountToPay: 2185,
      accountId: 'demo_consumer',
      simulatedOutcome: 'FAILED',
      simulatedFailureReason: 'Simulated bank authorization decline.',
    });

    assert.equal(res.success, false);
    assert.equal(res.outcome, 'FAILED');
    assert.equal(res.paidAmountApplied, 0);
    assert.equal(res.remainingBalance, 2185);
    assert.equal(res.updatedBill.status, 'Unpaid');
    assert.equal(res.updatedBill.outstandingBalance, 2185);
    assert.equal(res.paymentTransaction?.status, 'Failed');

    const receiptAttempt = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: res.updatedBill,
      payment: res.paymentTransaction,
      language: 'en',
    });
    assert.equal(receiptAttempt.eligible, false);
  }
);

// Test 12: Controlled pending payment transitions to Payment Pending, generates no receipt, and does not reduce bill balance
runTest(
  12,
  'Controlled pending payment transitions to Payment Pending, generates no receipt, and does not reduce bill balance',
  () => {
    const res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'RTGS/NEFT',
      amountToPay: 2185,
      accountId: 'demo_consumer',
      simulatedOutcome: 'PENDING',
    });

    assert.equal(res.success, false);
    assert.equal(res.outcome, 'PENDING');
    assert.equal(res.paidAmountApplied, 0);
    assert.equal(res.remainingBalance, 2185);
    assert.equal(res.updatedBill.status, 'Unpaid');
    assert.equal(res.updatedBill.outstandingBalance, 2185);
    assert.equal(res.paymentTransaction?.status, 'Pending Verification');

    const receiptAttempt = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: res.updatedBill,
      payment: res.paymentTransaction,
      language: 'en',
    });
    assert.equal(receiptAttempt.eligible, false);
  }
);

// Test 13: Payment success screen allows View Receipt and Download Receipt PDF
runTest(13, 'Payment success screen allows View Receipt and Download Receipt PDF', () => {
  const modalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/EnterprisePaymentModal.tsx'),
    'utf-8'
  );
  assert.ok(modalSource.includes('data-testid="payment-success-view-receipt-btn"'));
  assert.ok(modalSource.includes('data-testid="payment-success-download-receipt-pdf-btn"'));
  assert.ok(modalSource.includes('onViewReceipt(paymentResult.createdPayment, updatedBillForReceipt)'));
  assert.ok(
    modalSource.includes(
      'onDownloadReceiptPdf(paymentResult.createdPayment, updatedBillForReceipt)'
    )
  );
});

// Test 14: Full payment updates bill to Paid, remaining balance to ₹0, and reduces due count
runTest(
  14,
  'Full payment updates bill to Paid, remaining balance to ₹0, and reduces due count',
  () => {
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-99231') || null;
    const summaryBefore = selectConnectionBillingSummary(
      conn,
      [sampleUnpaidBill],
      []
    );
    assert.equal(summaryBefore.dueBillCount, 1);
    assert.equal(summaryBefore.totalOutstandingAmount, 2185);

    const res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 2185,
      accountId: 'demo_consumer',
    });

    const summaryAfter = selectConnectionBillingSummary(
      conn,
      [res.updatedBill],
      [res.paymentTransaction!]
    );
    assert.equal(summaryAfter.dueBillCount, 0);
    assert.equal(summaryAfter.totalOutstandingAmount, 0);
    assert.equal(summaryAfter.paidBillCount, 1);
  }
);

// Test 15: Partial payment updates bill to Partially Paid, reduces remaining balance, and keeps bill due
runTest(
  15,
  'Partial payment updates bill to Partially Paid, reduces remaining balance, and keeps bill due',
  () => {
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === '04281-99231') || null;
    const res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 1000,
      accountId: 'demo_consumer',
    });

    const summaryAfter = selectConnectionBillingSummary(
      conn,
      [res.updatedBill],
      [res.paymentTransaction!]
    );
    assert.equal(res.updatedBill?.status, 'Partially Paid');
    assert.equal(summaryAfter.dueBillCount, 1);
    assert.equal(summaryAfter.dueBills[0]?.effectiveStatus, 'Partially Paid');
    assert.equal(summaryAfter.totalOutstandingAmount, 1185);
  }
);

// Test 16: Second payment on a partially paid bill can settle remaining balance to ₹0
runTest(
  16,
  'Second payment on a partially paid bill settles remaining balance to ₹0 and marks bill Paid',
  () => {
    const firstPayment = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 1000,
      accountId: 'demo_consumer',
    });

    const secondPayment = applyPaymentToBill({
      bill: firstPayment.updatedBill,
      existingPayments: [firstPayment.paymentTransaction!],
      paymentMethod: 'Net Banking',
      amountToPay: 1185,
      accountId: 'demo_consumer',
    });

    assert.equal(secondPayment.success, true);
    assert.equal(secondPayment.previouslySettledAmount, 1000);
    assert.equal(secondPayment.paidAmountApplied, 1185);
    assert.equal(secondPayment.remainingBalance, 0);
    assert.equal(secondPayment.settlementClassification, 'FULL_SETTLEMENT');
    assert.equal(secondPayment.updatedBill?.status, 'Paid');
    assert.equal(secondPayment.updatedBill?.paidAmount, 2185);
    assert.equal(secondPayment.updatedBill?.outstandingBalance, 0);
  }
);

// ============================================================================
// RECEIPTS & BILLS (Tests 17–23)
// ============================================================================

// Test 17: Payment receipt includes consumer details, connection details, bill details, payment reference, payment method, payment date/time, amount paid, previously paid amount, remaining balance, and DEMO disclosure
runTest(
  17,
  'Payment receipt includes consumer details, connection details, bill details, payment reference, payment method, payment date/time, amount paid, previously paid amount, remaining balance, and DEMO disclosure',
  () => {
    const paidRes = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 2185,
      accountId: 'demo_consumer',
    });
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;

    const receiptDoc = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: paidRes.updatedBill,
      payment: paidRes.paymentTransaction,
      connection: conn,
      allPayments: [paidRes.paymentTransaction!],
      language: 'en',
      dataSource: 'DEMO',
    });

    assert.equal(receiptDoc.eligible, true);
    assert.equal(receiptDoc.authorized, true);
    const fields = receiptDoc.sections.flatMap((s) => s.fields);
    const byKey = new Map(fields.map((f) => [f.key, f.value]));

    assert.equal(byKey.get('receiptReference'), paidRes.paymentTransaction?.txId);
    assert.equal(byKey.get('bankReference'), paidRes.paymentTransaction?.bankReference);
    assert.equal(byKey.get('billReference'), sampleUnpaidBill.billNo);
    assert.equal(byKey.get('consumerNumber'), sampleUnpaidBill.consumerNo);
    assert.equal(byKey.get('consumerName'), conn?.consumerName);
    assert.equal(byKey.get('paymentMethod'), 'UPI / BHIM');
    assert.equal(byKey.get('totalBillAmount'), '₹2,185');
    assert.equal(byKey.get('previouslySettledAmount'), '₹0');
    assert.equal(byKey.get('amountPaid'), '₹2,185');
    assert.equal(byKey.get('remainingBalanceAfterPayment'), '₹0');
    assert.ok(receiptDoc.demoDisclosureBanner.includes('DEMO PAYMENT RECEIPT'));
  }
);

// Test 18: Partial payment receipt shows only the partial amount paid in that transaction and the remaining balance
runTest(
  18,
  'Partial payment receipt shows only the partial amount paid in that transaction (₹1,000) and remaining balance (₹1,185)',
  () => {
    const partialRes = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 1000,
      accountId: 'demo_consumer',
    });
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;

    const receiptDoc = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: partialRes.updatedBill,
      payment: partialRes.paymentTransaction,
      connection: conn,
      allPayments: [partialRes.paymentTransaction!],
      language: 'en',
    });

    assert.equal(receiptDoc.eligible, true);
    assert.equal(receiptDoc.settlementClassification, 'PARTIAL_SETTLEMENT');
    assert.equal(receiptDoc.statusTone, 'amber');

    const fields = receiptDoc.sections.flatMap((s) => s.fields);
    const byKey = new Map(fields.map((f) => [f.key, f.value]));
    assert.equal(byKey.get('totalBillAmount'), '₹2,185');
    assert.equal(byKey.get('previouslySettledAmount'), '₹0');
    assert.equal(byKey.get('amountPaid'), '₹1,000');
    assert.equal(byKey.get('remainingBalanceAfterPayment'), '₹1,185');
    assert.ok(
      byKey.get('settlementClassification')?.includes('Partial Settlement'),
      'Must clearly classify receipt as Partial Settlement'
    );
  }
);

// Test 19: Subsequent partial/full payment generates its own receipt with updated previously settled and remaining amounts, while preserving Receipt #1
runTest(
  19,
  'Subsequent completion payment generates its own receipt with ₹1,000 previously settled, ₹1,185 paid in transaction, and ₹0 remaining, while Receipt #1 still shows ₹1,000 paid and ₹1,185 remaining',
  () => {
    const tx1Res = applyPaymentToBill({
      bill: sampleUnpaidBill,
      existingPayments: [],
      paymentMethod: 'UPI / BHIM',
      amountToPay: 1000,
      accountId: 'demo_consumer',
      paymentDate: '15-Oct-2026 10:00',
    });

    const tx2Res = applyPaymentToBill({
      bill: tx1Res.updatedBill,
      existingPayments: [tx1Res.paymentTransaction!],
      paymentMethod: 'Net Banking',
      amountToPay: 1185,
      accountId: 'demo_consumer',
      paymentDate: '16-Oct-2026 14:30',
    });

    const allPaymentsReverseChronological = [
      tx2Res.paymentTransaction!,
      tx1Res.paymentTransaction!,
    ];

    // Check Receipt #2 (Completion payment of ₹1,185)
    const receipt2 = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: tx2Res.updatedBill,
      payment: tx2Res.paymentTransaction,
      allPayments: allPaymentsReverseChronological,
      language: 'en',
    });
    const fields2 = new Map(
      receipt2.sections.flatMap((s) => s.fields).map((f) => [f.key, f.value])
    );
    assert.equal(receipt2.settlementClassification, 'FULL_SETTLEMENT');
    assert.equal(fields2.get('totalBillAmount'), '₹2,185');
    assert.equal(fields2.get('previouslySettledAmount'), '₹1,000');
    assert.equal(fields2.get('amountPaid'), '₹1,185');
    assert.equal(fields2.get('remainingBalanceAfterPayment'), '₹0');

    // Check Receipt #1 (Initial partial payment of ₹1,000) viewed even after bill is fully paid
    const receipt1 = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: tx2Res.updatedBill,
      payment: tx1Res.paymentTransaction,
      allPayments: allPaymentsReverseChronological,
      language: 'en',
    });
    const fields1 = new Map(
      receipt1.sections.flatMap((s) => s.fields).map((f) => [f.key, f.value])
    );
    assert.equal(receipt1.settlementClassification, 'PARTIAL_SETTLEMENT');
    assert.equal(fields1.get('totalBillAmount'), '₹2,185');
    assert.equal(fields1.get('previouslySettledAmount'), '₹0');
    assert.equal(fields1.get('amountPaid'), '₹1,000');
    assert.equal(fields1.get('remainingBalanceAfterPayment'), '₹1,185');
  }
);

// Test 20: Unpaid bill cannot generate a payment receipt
runTest(20, 'Unpaid bill cannot generate a payment receipt', () => {
  const unpaidDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    payment: null,
    language: 'en',
  });
  assert.equal(unpaidDoc.eligible, false);
  assert.equal(unpaidDoc.displayMode, 'payment_summary');
});

// Test 21: Full Electricity Bill document can be viewed and downloaded as PDF
runTest(21, 'Full Electricity Bill document can be viewed and downloaded as PDF', () => {
  const conn =
    INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
  const billDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    connection: conn,
    payments: [],
    language: 'en',
  });

  assert.equal(billDoc.eligible, true);
  assert.equal(billDoc.authorized, true);
  assert.equal(billDoc.documentType, 'electricity_bill');
  assert.equal(billDoc.filename, 'vidyutflow-electricity-bill-bill-ug-2026-10-8821.pdf');

  const downloadRes = triggerOfficialDocumentPdfDownload(billDoc, {
    skipBrowserDownload: true,
  });
  assert.equal(downloadRes.downloaded, true);
  assert.ok(downloadRes.byteLength > 1500);
});

// Test 22: Electricity Bill PDF includes UGVCL identity, consumer details, connection/meter details, billing period, issue/due dates, consumption, tariff breakdown, status, and DEMO disclosure
runTest(
  22,
  'Electricity Bill includes Sections A–G (UGVCL identity, consumer/meter details, billing period & dates, consumption, tariff breakdown, status, and DEMO disclosure)',
  () => {
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
    const billDoc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: sampleUnpaidBill,
      connection: conn,
      payments: [],
      language: 'en',
    });

    const sectionIds = billDoc.sections.map((s) => s.id);
    assert.deepEqual(sectionIds, [
      'ugvcl-identity',
      'consumer-details',
      'billing-details',
      'electricity-consumption',
      'tariff-calculation',
      'bill-status',
      'source-disclosure',
    ]);

    const allFields = new Map(
      billDoc.sections.flatMap((s) => s.fields).map((f) => [f.key, f.value])
    );
    assert.equal(allFields.get('companyName'), UGVCL_COMPANY_NAME_EN);
    assert.equal(allFields.get('gujaratiTitle'), UGVCL_COMPANY_NAME_GU);
    assert.equal(allFields.get('missionTagline'), UGVCL_TAGLINE_EN);
    assert.equal(allFields.get('consumerNo'), '04281-99231');
    assert.equal(allFields.get('billNo'), 'BILL-UG-2026-10-8821');
    assert.equal(allFields.get('unitsConsumed'), '310 kWh');
    assert.equal(allFields.get('totalBillAmount'), '₹2,185');
    assert.ok(billDoc.demoDisclosureBanner.includes('DEMO ELECTRICITY BILL'));
  }
);

// Test 23: Electricity Bill tariff components reconcile with total bill amount
runTest(
  23,
  'Electricity Bill tariff components reconcile with total bill amount and flag integrity warning if mismatched',
  () => {
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;

    // 1480 + 70 + 372 + 263 - 0 = 2185 (Exact match)
    const validBillDoc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: sampleUnpaidBill,
      connection: conn,
      language: 'en',
    });
    assert.equal(validBillDoc.reconciliationVerified, true);
    assert.equal(validBillDoc.integrityWarnings, undefined);

    // Mismatched bill test: components sum to 2185, but totalAmount says 2900
    const mismatchedBill: ElectricityBill = {
      ...sampleUnpaidBill,
      totalAmount: 2900,
    };
    const mismatchDoc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: mismatchedBill,
      connection: conn,
      language: 'en',
    });
    assert.equal(mismatchDoc.reconciliationVerified, false);
    assert.ok(
      Array.isArray(mismatchDoc.integrityWarnings) &&
        mismatchDoc.integrityWarnings.length > 0,
      'Must emit integrity warning when component sum does not match canonical bill total'
    );
  }
);

// ============================================================================
// PDF DOWNLOADS & MULTI-PAGE PAGINATION (Tests 24–30)
// ============================================================================

// Test 24: Payment Receipt can be downloaded as a real .pdf file
runTest(24, 'Payment Receipt can be downloaded as a real .pdf file (%PDF-1.4)', () => {
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const payment = INITIAL_PAYMENTS.find((p) => p.billNo === paidBill.billNo) || null;
  const conn = INITIAL_CONNECTIONS.find((c) => c.consumerNo === paidBill.consumerNo) || null;

  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    payment,
    connection: conn,
    language: 'en',
  });

  const res = triggerOfficialDocumentPdfDownload(doc, { skipBrowserDownload: true });
  assert.equal(res.downloaded, true);
  assert.ok(res.filename.endsWith('.pdf'));

  const bytes = generateOfficialDocumentPdfBytes(doc);
  const inspection = inspectGeneratedPdfBytes(bytes);
  assert.equal(inspection.isValidPdfHeader, true);
  assert.equal(inspection.hasEofMarker, true);
  assert.ok(inspection.byteLength > 1500);
});

// Test 25: Application Acknowledgment can be downloaded as a real .pdf file
runTest(25, 'Application Acknowledgment can be downloaded as a real .pdf file', () => {
  const app = INITIAL_APPLICATIONS[0];
  const doc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: app,
    language: 'en',
  });

  const res = triggerOfficialDocumentPdfDownload(doc, { skipBrowserDownload: true });
  assert.equal(res.downloaded, true);
  assert.equal(res.filename, buildDocumentFilename('application_acknowledgment', app.id));
  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(doc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.equal(inspection.hasEofMarker, true);
});

// Test 26: Service Request Acknowledgment can be downloaded as a real .pdf file
runTest(26, 'Service Request Acknowledgment can be downloaded as a real .pdf file', () => {
  const srApp: NewConnectionApplication = {
    ...INITIAL_APPLICATIONS[0],
    id: 'APP-2026-0899',
    serviceRequestType: 'SOLAR_NET_METERING',
    linkedConsumerNo: '04281-99231',
    accountId: 'demo_consumer',
  };
  const doc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: srApp,
    language: 'en',
  });

  assert.equal(doc.documentType, 'service_request_acknowledgment');
  const res = triggerOfficialDocumentPdfDownload(doc, { skipBrowserDownload: true });
  assert.equal(res.downloaded, true);
  assert.equal(
    res.filename,
    'vidyutflow-service-request-acknowledgment-app-2026-0899.pdf'
  );
  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(doc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.equal(inspection.hasEofMarker, true);
});

// Test 27: Complaint Acknowledgment can be downloaded as a real .pdf file
runTest(27, 'Complaint Acknowledgment can be downloaded as a real .pdf file', () => {
  const cmp = INITIAL_COMPLAINTS[0];
  const doc = generateComplaintAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    complaint: cmp,
    language: 'en',
  });

  const res = triggerOfficialDocumentPdfDownload(doc, { skipBrowserDownload: true });
  assert.equal(res.downloaded, true);
  assert.equal(res.filename, buildDocumentFilename('complaint_acknowledgment', cmp.id));
  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(doc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.equal(inspection.hasEofMarker, true);
});

// Test 28: Authorized Inspection Summary can be downloaded as a real .pdf file
runTest(28, 'Authorized Inspection Summary can be downloaded as a real .pdf file', () => {
  const completedWo: WorkOrder = {
    ...INITIAL_WORK_ORDERS[0],
    id: 'WO-2026-301',
    assignedTo: 'Vikramaditya Solanki (JE Field)',
    status: 'Completed',
    inspectionReport: {
      meterSerialScanned: 'GEN-SM-2026-9921',
      readingKwh: 14820,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 232, y: 231, b: 234 },
      technicianRemarks: 'Inspected neutral crimp and restored phase balance.',
      photoUploaded: true,
    },
  };

  const doc = generateInspectionSummaryDocument({
    role: 'field',
    actor: fieldVikram,
    workOrder: completedWo,
    language: 'en',
  });

  const res = triggerOfficialDocumentPdfDownload(doc, { skipBrowserDownload: true });
  assert.equal(res.downloaded, true);
  assert.equal(res.filename, 'vidyutflow-inspection-summary-wo-2026-301.pdf');
  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(doc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.equal(inspection.hasEofMarker, true);
});

// Test 29: Multi-page PDF documents paginate cleanly without clipping tables or footers
runTest(
  29,
  'Multi-page PDF documents paginate cleanly across A4 pages ([0, 0, 595.28, 841.89]) without clipping tables or footers',
  () => {
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
    const billDoc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: sampleUnpaidBill,
      connection: conn,
      language: 'en',
    });

    const pages = paginateOfficialDocumentForA4(billDoc);
    assert.ok(pages.length >= 2, 'Comprehensive 7-section + 2-table Electricity Bill must paginate across >= 2 A4 pages');

    const bytes = generateOfficialDocumentPdfBytes(billDoc);
    const inspection = inspectGeneratedPdfBytes(bytes);
    assert.equal(inspection.pageCount, pages.length);
    assert.deepEqual(inspection.mediaBox, [0, 0, 595.28, 841.89]);
    assert.ok(inspection.extractedStrings.some((s) => s.includes('Page 1 of')));
    assert.ok(
      inspection.extractedStrings.some((s) => s.includes(`Page ${pages.length} of ${pages.length}`))
    );
  }
);

// Test 30: Generated PDFs have no blank trailing pages
runTest(30, 'Generated PDFs have no blank trailing pages', () => {
  const conn =
    INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
  const billDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    connection: conn,
    language: 'en',
  });
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const receiptDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'en',
  });

  const billInspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(billDoc));
  const receiptInspection = inspectGeneratedPdfBytes(
    generateOfficialDocumentPdfBytes(receiptDoc)
  );

  assert.equal(billInspection.hasBlankTrailingPage, false);
  assert.equal(receiptInspection.hasBlankTrailingPage, false);
});

// ============================================================================
// MULTILINGUAL & BRANDING (Tests 31–35)
// ============================================================================

// Test 31: English PDFs render cleanly
runTest(31, 'English PDFs render and inspect cleanly with complete section strings', () => {
  const conn =
    INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
  const enDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    connection: conn,
    language: 'en',
  });

  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(enDoc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.ok(
    inspection.extractedStrings.some((s) => s.includes('Electricity Bill & Tariff Statement'))
  );
  assert.ok(
    inspection.extractedStrings.some((s) =>
      s.includes('A. UGVCL Corporate Identity & Distribution Licensee')
    )
  );
});

// Test 32: Gujarati PDFs render cleanly without broken Indic text
runTest(32, 'Gujarati PDFs preserve Gujarati script without broken Indic text', () => {
  const conn =
    INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
  const guDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    connection: conn,
    language: 'gu',
  });

  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(guDoc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.ok(
    inspection.extractedStrings.some((s) => s.includes('ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ'))
  );
  assert.ok(
    inspection.extractedStrings.some((s) => s.includes('વીજ વપરાશ બિલ અને ટેરિફ પત્રક'))
  );
});

// Test 33: Hindi PDFs render cleanly without broken Devanagari text
runTest(33, 'Hindi PDFs preserve Devanagari script without broken text', () => {
  const conn =
    INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
  const hiDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    connection: conn,
    language: 'hi',
  });

  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(hiDoc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.ok(
    inspection.extractedStrings.some((s) => s.includes('विद्युत खपत बिल एवं टैरिफ विवरण'))
  );
});

// Test 34: Marathi PDFs render cleanly without broken Devanagari text
runTest(34, 'Marathi PDFs preserve Devanagari script without broken text', () => {
  const conn =
    INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
  const mrDoc = generateElectricityBillDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: sampleUnpaidBill,
    connection: conn,
    language: 'mr',
  });

  const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(mrDoc));
  assert.equal(inspection.isValidPdfHeader, true);
  assert.ok(
    inspection.extractedStrings.some((s) => s.includes('वीज वापर बिल आणि टॅरिफ विवरणपत्र'))
  );
});

// Test 35: Rupee symbol (₹) and UGVCL logo are preserved in generated PDFs
runTest(
  35,
  'Rupee symbol (₹) and UGVCL logo (/assets/ugvcl-logo.png) are preserved in generated PDFs',
  () => {
    const conn =
      INITIAL_CONNECTIONS.find((c) => c.consumerNo === sampleUnpaidBill.consumerNo) || null;
    const billDoc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      bill: sampleUnpaidBill,
      connection: conn,
      language: 'en',
    });

    const inspection = inspectGeneratedPdfBytes(generateOfficialDocumentPdfBytes(billDoc));
    assert.equal(inspection.containsRupeeSymbol, true);
    assert.equal(inspection.containsUgvclIdentity, true);
    assert.ok(
      inspection.extractedStrings.some((s) => s.includes('/assets/ugvcl-logo.png'))
    );
  }
);

// ============================================================================
// SECURITY & REGRESSION (Tests 36–37)
// ============================================================================

// Test 36: Role and ownership restrictions prevent unauthorized document downloads
runTest(
  36,
  'Role and ownership restrictions prevent unauthorized document generation and PDF downloads',
  () => {
    // 1. Consumer Arvind cannot view or download Consumer Meenaben's electricity bill
    const unauthorizedBillDoc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerArvind,
      bill: sampleUnpaidBill,
      language: 'en',
    });
    assert.equal(unauthorizedBillDoc.authorized, false);
    assert.equal(unauthorizedBillDoc.eligible, false);
    const blockedBillDownload = triggerOfficialDocumentPdfDownload(unauthorizedBillDoc, {
      skipBrowserDownload: true,
    });
    assert.equal(blockedBillDownload.downloaded, false);

    // 2. Consumer Meenaben cannot access Field Engineer inspection summary
    const completedWo: WorkOrder = {
      ...INITIAL_WORK_ORDERS[0],
      id: 'WO-2026-301',
      assignedTo: 'Vikramaditya Solanki (JE Field)',
      status: 'Completed',
      inspectionReport: {
        meterSerialScanned: 'GEN-SM-2026-9921',
        readingKwh: 14820,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 232, y: 231, b: 234 },
        technicianRemarks: 'Verified.',
        photoUploaded: true,
      },
    };
    const consumerInspectionDoc = generateInspectionSummaryDocument({
      role: 'consumer',
      actor: consumerMeenaben,
      workOrder: completedWo,
      language: 'en',
    });
    assert.equal(consumerInspectionDoc.authorized, false);

    // 3. Field Engineer Harshad cannot download Vikram's inspection summary
    const unassignedFieldDoc = generateInspectionSummaryDocument({
      role: 'field',
      actor: fieldHarshad,
      workOrder: completedWo,
      language: 'en',
    });
    assert.equal(unassignedFieldDoc.authorized, false);

    // 4. Field Engineer cannot access consumer electricity bill
    const fieldBillAttempt = generateElectricityBillDocument({
      role: 'field',
      actor: fieldVikram,
      bill: sampleUnpaidBill,
      language: 'en',
    });
    assert.equal(fieldBillAttempt.authorized, false);
  }
);

// Test 37: Existing billing consistency, notifications, exports and offline field sync remain intact
runTest(
  37,
  'Existing billing consistency, reconciliation, CSV/JSON exports, and ConsumerPortal wiring remain intact',
  () => {
    const reconciled = reconcileBillWithPayments(sampleUnpaidBill, []);
    assert.equal(reconciled.effectiveStatus, 'Unpaid');
    assert.equal(reconciled.outstandingBalance, 2185);

    const csvExport = executeDatasetExport({
      role: 'consumer',
      actor: consumerMeenaben,
      datasetKey: 'bills',
      format: 'csv',
      records: INITIAL_BILLS,
      language: 'en',
      skipBrowserDownload: true,
    });
    assert.equal(csvExport.success, true);

    const jsonExport = executeDatasetExport({
      role: 'employee',
      actor: employeeMehsana,
      datasetKey: 'bills',
      format: 'json',
      records: INITIAL_BILLS,
      language: 'en',
      skipBrowserDownload: true,
    });
    assert.equal(jsonExport.success, true);

    const consumerPortalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
      'utf-8'
    );
    assert.ok(consumerPortalSource.includes('<EnterprisePaymentModal'));
    assert.ok(consumerPortalSource.includes('handleViewElectricityBill'));
    assert.ok(consumerPortalSource.includes('handleDownloadElectricityBillPdf'));
    assert.ok(consumerPortalSource.includes('handleDownloadPaymentReceiptPdf'));
  }
);

console.log('------------------------------------------------------------------------');
const passedCount = results.filter((r) => r.passed).length;
const failedCount = results.filter((r) => !r.passed).length;
console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('========================================================================');

if (failedCount > 0) {
  process.exit(1);
}
