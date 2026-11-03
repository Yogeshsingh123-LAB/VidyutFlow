import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DOCUMENT_UI_TRANSLATIONS,
  getDocumentUiTranslations,
  buildDocumentFilename,
  authorizeDocumentAccess,
  classifyApplicationLifecycleStage,
  generatePaymentReceiptDocument,
  generateApplicationAcknowledgmentDocument,
  generateComplaintAcknowledgmentDocument,
  generateInspectionSummaryDocument,
  triggerDocumentPrintOrSavePdf,
  resetDocumentPrintLockForTesting,
} from '../src/utils/documentEngine';
import { executeDatasetExport } from '../src/utils/exportEngine';
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
  ComplaintRecord,
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

console.log('================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 5, STEP 5.2 VERIFICATION SUITE');
console.log('Professional Receipts, Printable Acknowledgments & Integrity');
console.log('================================================================');

const consumerMeenaben = {
  id: 'demo_consumer',
  name: 'Smt. Meenaben Patel',
  role: 'consumer' as const,
  email: 'consumer@vidyutflow.demo',
  subdivision: 'Mehsana City North',
  consumerNo: '04281-99231',
  ownedConsumerNos: ['04281-99231', '04281-77190', 'UGV-2026-884120', 'UGV-2026-884125'],
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

// ============================================================================
// PAYMENT RECEIPTS (Tests 1–8)
// ============================================================================

// Test 1: Paid bill / completed payment generates a valid receipt
runTest(1, 'Paid bill / completed payment generates a valid receipt', () => {
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const matchingPayment = INITIAL_PAYMENTS.find(
    (p) => p.billNo === paidBill.billNo && p.status === 'Successful'
  );
  const conn = INITIAL_CONNECTIONS.find((c) => c.consumerNo === paidBill.consumerNo) || null;

  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    payment: matchingPayment || null,
    connection: conn,
    language: 'en',
    dataSource: 'DEMO',
  });

  assert.equal(doc.eligible, true);
  assert.equal(doc.authorized, true);
  assert.equal(doc.documentType, 'payment_receipt');
  assert.equal(doc.displayMode, 'official_document');
  assert.equal(doc.title, 'Payment Receipt');
  assert.ok(doc.sections.length >= 2);
});

// Test 2: Unpaid bill does NOT generate a paid receipt
runTest(2, 'Unpaid bill does NOT generate a paid receipt', () => {
  const unpaidBill = INITIAL_BILLS.find((b) => b.status === 'Unpaid')!;

  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: unpaidBill,
    payment: null,
    language: 'en',
    dataSource: 'DEMO',
  });

  assert.equal(doc.eligible, false);
  assert.equal(doc.displayMode, 'payment_summary');
  assert.ok(
    doc.ineligibleReason?.includes('Receipt not available for unpaid bill'),
    'Must explain why receipt is unavailable for unpaid bill'
  );
});

// Test 3: Pending or failed payment does NOT generate a paid receipt
runTest(3, 'Pending or failed payment does NOT generate a paid receipt', () => {
  const pendingTx: PaymentTransaction = {
    txId: 'TXN-PENDING-901',
    consumerNo: '04281-99231',
    billNo: 'BILL-OCT26-99104',
    date: '15-Oct-2026 11:00 AM',
    amount: 3420,
    paymentMethod: 'Net Banking',
    status: 'Pending Verification',
    bankReference: 'BNK-PEND-001',
    accountId: 'demo_consumer',
  };

  const failedTx: PaymentTransaction = {
    ...pendingTx,
    txId: 'TXN-FAILED-902',
    status: 'Failed',
  };

  const pendingDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    payment: pendingTx,
    language: 'en',
  });
  const failedDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    payment: failedTx,
    language: 'en',
  });

  assert.equal(pendingDoc.eligible, false);
  assert.equal(failedDoc.eligible, false);
  assert.ok(pendingDoc.ineligibleReason?.includes('pending or failed'));
  assert.ok(failedDoc.ineligibleReason?.includes('pending or failed'));
});

// Test 4: Receipt preserves canonical bill/payment IDs
runTest(4, 'Receipt preserves canonical bill and payment IDs', () => {
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const payment = INITIAL_PAYMENTS.find((p) => p.billNo === paidBill.billNo) || null;

  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    payment,
    language: 'en',
  });

  const allFields = doc.sections.flatMap((s) => s.fields);
  const billField = allFields.find((f) => f.key === 'billReference');
  const refField = allFields.find((f) => f.key === 'receiptReference');

  assert.equal(billField?.value, paidBill.billNo);
  assert.equal(refField?.value, payment?.txId || paidBill.transactionRef || paidBill.billNo);
});

// Test 5: Receipt shows correct amount and payment status
runTest(5, 'Receipt shows correct amount and payment status', () => {
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'en',
  });

  const allFields = doc.sections.flatMap((s) => s.fields);
  const amountField = allFields.find((f) => f.key === 'amountPaid');
  const statusField = allFields.find((f) => f.key === 'paymentStatus');

  assert.equal(amountField?.value, `₹${paidBill.totalAmount.toLocaleString('en-IN')}`);
  assert.equal(statusField?.value, 'Paid');
});

// Test 6: Receipt includes DEMO payment disclosure when source is DEMO
runTest(6, 'Receipt includes exact DEMO payment disclosure when source is DEMO', () => {
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'en',
    dataSource: 'DEMO',
  });

  assert.equal(
    doc.demoDisclosureBanner,
    'DEMO PAYMENT RECEIPT — This document reflects a simulated payment recorded within VidyutFlow. It is not proof of settlement with UGVCL or a payment gateway.'
  );
  assert.equal(doc.dataSource, 'DEMO');
});

// Test 7: Receipt does not fabricate bank/gateway references
runTest(7, 'Receipt does not fabricate bank or payment gateway references when absent', () => {
  const paidBillWithoutGateway: ElectricityBill = {
    billNo: 'BILL-SEP26-88120',
    consumerNo: '04281-99231',
    billMonth: 'September 2026',
    billDate: '01-Sep-2026',
    dueDate: '15-Sep-2026',
    unitsConsumed: 390,
    energyCharges: 2100,
    fixedCharges: 120,
    fuelPriceAdjustment: 310,
    electricityDuty: 290,
    rebateOrSubsidy: 0,
    totalAmount: 2820,
    status: 'Paid',
    paidDate: '10-Sep-2026',
    slabBreakdown: [],
    accountId: 'demo_consumer',
  };

  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBillWithoutGateway,
    payment: null,
    language: 'en',
  });

  const allFields = doc.sections.flatMap((s) => s.fields);
  const bankRefField = allFields.find((f) => f.key === 'bankReference');
  const methodField = allFields.find((f) => f.key === 'paymentMethod');

  // Neither bankReference nor paymentMethod should be fabricated when no PaymentTransaction exists
  assert.equal(bankRefField, undefined);
  assert.equal(methodField, undefined);
  // Reference falls back to canonical billNo rather than a fake random UPI ID
  assert.equal(doc.referenceId, 'BILL-SEP26-88120');
});

// Test 8: Consumer cannot generate receipt for another consumer's bill
runTest(8, "Consumer cannot generate receipt for another consumer's bill", () => {
  const meenabenBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;

  const unauthorizedDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerArvind,
    bill: meenabenBill,
    language: 'en',
  });

  assert.equal(unauthorizedDoc.authorized, false);
  assert.equal(unauthorizedDoc.eligible, false);
  assert.equal(unauthorizedDoc.displayMode, 'unauthorized');
  assert.equal(unauthorizedDoc.sections.length, 0);
});

// ============================================================================
// APPLICATION ACKNOWLEDGMENTS (Tests 9–12)
// ============================================================================

// Test 9: Submitted application generates valid acknowledgment
runTest(9, 'Submitted application generates valid acknowledgment', () => {
  const submittedApp = INITIAL_APPLICATIONS[0];
  const doc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: submittedApp,
    language: 'en',
  });

  assert.equal(doc.eligible, true);
  assert.equal(doc.authorized, true);
  assert.equal(doc.displayMode, 'official_document');
  assert.ok(doc.sections.length === 3);
});

// Test 10: Application acknowledgment preserves canonical APP-* ID
runTest(10, 'Application acknowledgment preserves canonical APP-* ID', () => {
  const app = INITIAL_APPLICATIONS[0];
  const doc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: app,
    language: 'en',
  });

  assert.equal(doc.referenceId, app.id);
  assert.match(doc.referenceId, /^APP-\d{4}-\d+$/);
  const idField = doc.sections
    .flatMap((s) => s.fields)
    .find((f) => f.key === 'applicationId');
  assert.equal(idField?.value, app.id);
});

// Test 11: Application acknowledgment distinguishes submitted vs approved vs rejected
runTest(11, 'Application acknowledgment distinguishes submitted vs under review vs approved vs rejected', () => {
  const baseApp: NewConnectionApplication = {
    ...INITIAL_APPLICATIONS[0],
    accountId: 'demo_consumer',
  };

  const submittedDoc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: { ...baseApp, status: 'Submitted', workflowStep: 1 },
    language: 'en',
  });
  const reviewDoc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: { ...baseApp, status: 'Site Inspection', workflowStep: 3 },
    language: 'en',
  });
  const approvedDoc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: { ...baseApp, status: 'Sanction Approval', workflowStep: 4 },
    language: 'en',
  });
  const rejectedDoc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: { ...baseApp, status: 'Rejected', workflowStep: 2 },
    language: 'en',
  });

  assert.equal(submittedDoc.lifecycleClassification, 'SUBMITTED_PENDING_REVIEW');
  assert.ok(submittedDoc.statusBannerNote.includes('Submission is not sanction approval'));

  assert.equal(reviewDoc.lifecycleClassification, 'UNDER_TECHNICAL_REVIEW');
  assert.ok(reviewDoc.statusBannerNote.includes('Not yet sanctioned'));

  assert.equal(approvedDoc.lifecycleClassification, 'SANCTIONED_OR_APPROVED');
  assert.equal(approvedDoc.statusTone, 'emerald');

  assert.equal(rejectedDoc.lifecycleClassification, 'REJECTED');
  assert.equal(rejectedDoc.statusTone, 'rose');

  // Unsaved draft without id or appliedDate is rejected
  const draftDoc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: { applicantName: 'Draft User' },
    language: 'en',
  });
  assert.equal(draftDoc.eligible, false);
});

// Test 12: Consumer cannot view another consumer's application acknowledgment
runTest(12, "Consumer cannot view another consumer's application acknowledgment", () => {
  const meenabenApp = {
    ...INITIAL_APPLICATIONS[0],
    accountId: 'demo_consumer',
    linkedConsumerNo: '04281-99231',
  };

  const unauthorizedDoc = generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerArvind,
    application: meenabenApp,
    language: 'en',
  });

  assert.equal(unauthorizedDoc.authorized, false);
  assert.equal(unauthorizedDoc.eligible, false);
  assert.equal(unauthorizedDoc.displayMode, 'unauthorized');
});

// ============================================================================
// COMPLAINT ACKNOWLEDGMENTS (Tests 13–16)
// ============================================================================

// Test 13: Registered complaint generates valid acknowledgment
runTest(13, 'Registered complaint generates valid acknowledgment', () => {
  const cmp = INITIAL_COMPLAINTS[0];
  const doc = generateComplaintAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    complaint: cmp,
    language: 'en',
  });

  assert.equal(doc.eligible, true);
  assert.equal(doc.authorized, true);
  assert.equal(doc.documentType, 'complaint_acknowledgment');
  assert.equal(doc.displayMode, 'official_document');
});

// Test 14: Complaint acknowledgment preserves canonical CMP-* ID
runTest(14, 'Complaint acknowledgment preserves canonical CMP-* ID', () => {
  const cmp = INITIAL_COMPLAINTS[0];
  const doc = generateComplaintAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    complaint: cmp,
    language: 'en',
  });

  assert.equal(doc.referenceId, cmp.id);
  assert.match(doc.referenceId, /^CMP-\d+$/);
  const idField = doc.sections
    .flatMap((s) => s.fields)
    .find((f) => f.key === 'complaintId');
  assert.equal(idField?.value, cmp.id);
});

// Test 15: Complaint acknowledgment does not expose internal incident data
runTest(15, 'Complaint acknowledgment does not expose internal work orders, technicians, or incident dossiers', () => {
  const cmpWithInternals: ComplaintRecord = {
    ...INITIAL_COMPLAINTS[0],
    assignedTechnician: 'Vikramaditya Solanki (JE Field)',
    assignedWorkOrderId: 'WO-2026-301',
    accountId: 'demo_consumer',
  };

  const doc = generateComplaintAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    complaint: cmpWithInternals,
    language: 'en',
  });

  const serialized = JSON.stringify(doc.sections);
  assert.ok(!serialized.includes('WO-2026-301'), 'Must not leak internal work order ID');
  assert.ok(
    !serialized.includes('Vikramaditya Solanki'),
    'Must not leak internal field technician assignment to consumer acknowledgment'
  );
});

// Test 16: Consumer cannot view another consumer's complaint acknowledgment
runTest(16, "Consumer cannot view another consumer's complaint acknowledgment", () => {
  const meenabenCmp: ComplaintRecord = {
    ...INITIAL_COMPLAINTS[0],
    consumerNo: '04281-99231',
    accountId: 'demo_consumer',
  };

  const unauthorizedDoc = generateComplaintAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerArvind,
    complaint: meenabenCmp,
    language: 'en',
  });

  assert.equal(unauthorizedDoc.authorized, false);
  assert.equal(unauthorizedDoc.eligible, false);
  assert.equal(unauthorizedDoc.displayMode, 'unauthorized');
});

// ============================================================================
// INSPECTION DOCUMENTS (Tests 17–20)
// ============================================================================

// Test 17: Assigned Field Engineer can generate inspection summary for assigned inspection
runTest(17, 'Assigned Field Engineer can generate inspection summary for assigned inspection', () => {
  const completedWoWithReport: WorkOrder = {
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
    workOrder: completedWoWithReport,
    language: 'en',
  });

  assert.equal(doc.eligible, true);
  assert.equal(doc.authorized, true);
  assert.equal(doc.documentType, 'inspection_summary');
  assert.equal(doc.displayMode, 'official_document');
});

// Test 18: Unassigned Field Engineer cannot generate inspection summary for another engineer's inspection
runTest(
  18,
  "Unassigned Field Engineer cannot generate inspection summary for another engineer's inspection",
  () => {
    const vikramWo: WorkOrder = {
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
        technicianRemarks: 'Verified load parameters.',
        photoUploaded: true,
      },
    };

    const unauthorizedDoc = generateInspectionSummaryDocument({
      role: 'field',
      actor: fieldHarshad,
      workOrder: vikramWo,
      language: 'en',
    });

    assert.equal(unauthorizedDoc.authorized, false);
    assert.equal(unauthorizedDoc.eligible, false);
    assert.equal(unauthorizedDoc.displayMode, 'unauthorized');
  }
);

// Test 19: Inspection summary preserves canonical work order / application IDs
runTest(19, 'Inspection summary preserves canonical work order and linked application IDs', () => {
  const woWithApp: WorkOrder = {
    ...INITIAL_WORK_ORDERS[0],
    id: 'WO-2026-305',
    applicationId: 'APP-2026-4410',
    assignedTo: 'Vikramaditya Solanki (JE Field)',
    status: 'Completed',
    inspectionReport: {
      meterSerialScanned: 'GEN-SM-2026-8810',
      readingKwh: 420,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 234, y: 233, b: 235 },
      technicianRemarks: 'Site feasibility verified.',
      photoUploaded: true,
    },
  };

  const doc = generateInspectionSummaryDocument({
    role: 'field',
    actor: fieldVikram,
    workOrder: woWithApp,
    language: 'en',
  });

  assert.equal(doc.referenceId, woWithApp.id);
  const allFields = doc.sections.flatMap((s) => s.fields);
  const woField = allFields.find((f) => f.key === 'inspectionOrderId');
  const appField = allFields.find((f) => f.key === 'applicationId');

  assert.equal(woField?.value, woWithApp.id);
  assert.equal(appField?.value, woWithApp.applicationId);
});

// Test 20: Inspection summary does not fabricate unrecorded findings
runTest(20, 'Inspection summary rejects work orders with no recorded inspection findings', () => {
  const uninspectedWo: WorkOrder = {
    ...INITIAL_WORK_ORDERS[0],
    assignedTo: 'Vikramaditya Solanki (JE Field)',
    status: 'Pending',
    inspectionReport: undefined,
  };

  const doc = generateInspectionSummaryDocument({
    role: 'field',
    actor: fieldVikram,
    workOrder: uninspectedWo,
    language: 'en',
  });

  assert.equal(doc.eligible, false);
  assert.equal(doc.displayMode, 'unavailable');
  assert.equal(doc.sections.length, 0);
});

// ============================================================================
// DOCUMENT GENERATION, MULTILINGUAL, PRINT & REGRESSION (Tests 21–30)
// ============================================================================

// Test 21: Document filenames follow safe convention
runTest(21, 'Document filenames follow safe lowercase convention without personal names', () => {
  assert.equal(
    buildDocumentFilename('payment_receipt', 'TXN-UPI-9921448102'),
    'vidyutflow-payment-receipt-txn-upi-9921448102.pdf'
  );
  assert.equal(
    buildDocumentFilename('application_acknowledgment', 'APP-2026-0841'),
    'vidyutflow-application-acknowledgment-app-2026-0841.pdf'
  );
  assert.equal(
    buildDocumentFilename('complaint_acknowledgment', 'CMP-8821'),
    'vidyutflow-complaint-acknowledgment-cmp-8821.pdf'
  );
  assert.equal(
    buildDocumentFilename('service_request_acknowledgment', 'APP-2026-0845'),
    'vidyutflow-service-request-acknowledgment-app-2026-0845.pdf'
  );
  assert.equal(
    buildDocumentFilename('inspection_summary', 'WO-2026-301'),
    'vidyutflow-inspection-summary-wo-2026-301.pdf'
  );
});

// Test 22: Document UI labels exist in English, Gujarati, Hindi, and Marathi
runTest(22, 'Document UI labels exist in English, Gujarati, Hindi, and Marathi', () => {
  const languages = ['en', 'gu', 'hi', 'mr'] as const;
  const enKeys = Object.keys(DOCUMENT_UI_TRANSLATIONS.en);

  for (const lang of languages) {
    const dict = getDocumentUiTranslations(lang);
    assert.equal(Object.keys(dict).length, enKeys.length, `Key count mismatch for ${lang}`);
    for (const key of enKeys) {
      const val = (dict as unknown as Record<string, string>)[key];
      assert.ok(typeof val === 'string' && val.trim().length > 0, `Missing ${lang}.${key}`);
    }
  }
});

// Test 23: Gujarati, Hindi, and Marathi documents use appropriate Indic font families
runTest(23, 'Gujarati, Hindi, and Marathi documents use appropriate Indic font families', () => {
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;

  const enDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'en',
  });
  const guDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'gu',
  });
  const hiDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'hi',
  });
  const mrDoc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'mr',
  });

  assert.ok(enDoc.fontFamilyCss.includes('Plus Jakarta Sans'));
  assert.equal(enDoc.isIndic, false);

  assert.ok(guDoc.fontFamilyCss.includes('Noto Sans Gujarati'));
  assert.equal(guDoc.isIndic, true);

  assert.ok(hiDoc.fontFamilyCss.includes('Noto Sans Devanagari'));
  assert.equal(hiDoc.isIndic, true);

  assert.ok(mrDoc.fontFamilyCss.includes('Noto Sans Devanagari'));
  assert.equal(mrDoc.isIndic, true);
});

// Test 24: Print view hides non-document navigation chrome
runTest(24, 'Print view hides non-document action bars and navigation chrome via print:hidden', () => {
  const modalPath = path.resolve(
    process.cwd(),
    'src/components/common/OfficialDocumentModal.tsx'
  );
  const modalSource = fs.readFileSync(modalPath, 'utf-8');

  assert.ok(modalSource.includes('print:hidden'), 'Action bars must use print:hidden');
  assert.ok(
    modalSource.includes('data-testid="official-document-printable-sheet"'),
    'Printable sheet container must exist'
  );
  assert.ok(
    modalSource.includes('/assets/ugvcl-logo.png'),
    'Official UGVCL logo must be included in document header'
  );
});

// Test 25: Print / Save as PDF action works without runtime error
runTest(25, 'Print / Save as PDF action executes cleanly without runtime error', () => {
  resetDocumentPrintLockForTesting();
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'en',
  });

  const result = triggerDocumentPrintOrSavePdf(doc, { skipBrowserPrint: true });
  assert.equal(result.triggered, true);
  assert.equal(result.filename, doc.filename);
});

// Test 26: Document generation does not mutate source records in state/localStorage
runTest(26, 'Document generation does not mutate source records in state or localStorage', () => {
  const billClone = JSON.parse(JSON.stringify(INITIAL_BILLS[0])) as ElectricityBill;
  const appClone = JSON.parse(JSON.stringify(INITIAL_APPLICATIONS[0])) as NewConnectionApplication;
  const cmpClone = JSON.parse(JSON.stringify(INITIAL_COMPLAINTS[0])) as ComplaintRecord;
  const beforeSnapshot = JSON.stringify({ billClone, appClone, cmpClone });

  Object.freeze(billClone);
  Object.freeze(appClone);
  Object.freeze(cmpClone);

  generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: billClone,
    language: 'gu',
  });
  generateApplicationAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    application: appClone,
    language: 'hi',
  });
  generateComplaintAcknowledgmentDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    complaint: cmpClone,
    language: 'mr',
  });

  const afterSnapshot = JSON.stringify({ billClone, appClone, cmpClone });
  assert.equal(afterSnapshot, beforeSnapshot);
});

// Test 27: Rapid clicks do not trigger duplicate print/document generation actions
runTest(27, 'Rapid clicks do not trigger duplicate print or document generation actions', () => {
  resetDocumentPrintLockForTesting();
  const paidBill = INITIAL_BILLS.find((b) => b.status === 'Paid')!;
  const doc = generatePaymentReceiptDocument({
    role: 'consumer',
    actor: consumerMeenaben,
    bill: paidBill,
    language: 'en',
  });

  // Simulate browser print without skipBrowserPrint so lock remains active during cooldown
  const firstClick = triggerDocumentPrintOrSavePdf(doc);
  const secondRapidClick = triggerDocumentPrintOrSavePdf(doc);

  assert.equal(firstClick.triggered, true);
  assert.equal(secondRapidClick.triggered, false);
  assert.ok(secondRapidClick.reason?.includes('already in progress'));
  resetDocumentPrintLockForTesting();
});

// Test 28: Button labels accurately describe Print vs Save as PDF vs Download PDF
runTest(28, 'Button labels accurately describe Print, Print / Save as PDF, and real Download PDF', () => {
  const enUi = getDocumentUiTranslations('en');
  assert.equal(enUi.print, 'Print');
  assert.equal(enUi.printSaveAsPdf, 'Print / Save as PDF');

  const modalPath = path.resolve(
    process.cwd(),
    'src/components/common/OfficialDocumentModal.tsx'
  );
  const modalSource = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(modalSource.includes('{ui.print}'));
  assert.ok(modalSource.includes('{ui.printSaveAsPdf}'));
  assert.ok(
    modalSource.includes('triggerOfficialDocumentPdfDownload'),
    'Download PDF button must invoke real binary PDF generator triggerOfficialDocumentPdfDownload'
  );
});

// Test 29: Existing bill receipt viewing continues to work
runTest(29, 'Existing bill receipt viewing in ConsumerPortal continues to work', () => {
  const consumerPortalPath = path.resolve(
    process.cwd(),
    'src/components/consumer/ConsumerPortal.tsx'
  );
  const consumerPortalSource = fs.readFileSync(consumerPortalPath, 'utf-8');

  assert.ok(consumerPortalSource.includes('handleViewReceipt'));
  assert.ok(consumerPortalSource.includes('isReceiptModalOpen'));
  assert.ok(consumerPortalSource.includes('selectedReceipt'));
  assert.ok(consumerPortalSource.includes('<OfficialDocumentModal'));
});

// Test 30: Existing CSV/JSON exports from Phase 5 Step 5.1 continue to work
runTest(30, 'Existing CSV/JSON exports from Phase 5 Step 5.1 continue to work without regression', () => {
  const csvExport = executeDatasetExport({
    role: 'consumer',
    actor: consumerMeenaben,
    datasetKey: 'bills',
    format: 'csv',
    records: INITIAL_BILLS,
    language: 'en',
    skipBrowserDownload: true,
  });

  const jsonExport = executeDatasetExport({
    role: 'employee',
    actor: employeeMehsana,
    datasetKey: 'applications',
    format: 'json',
    records: INITIAL_APPLICATIONS,
    language: 'en',
    skipBrowserDownload: true,
  });

  assert.equal(csvExport.success, true);
  assert.ok(csvExport.recordCount > 0);
  assert.equal(jsonExport.success, true);
  assert.ok(jsonExport.recordCount > 0);
});

console.log('----------------------------------------------------------------');
const passedCount = results.filter((r) => r.passed).length;
const failedCount = results.filter((r) => !r.passed).length;
console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('================================================================');

if (failedCount > 0) {
  process.exit(1);
}
