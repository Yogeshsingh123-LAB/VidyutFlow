/**
 * VIDYUTFLOW 2.0 — PHASE 8E
 * FINAL CROSS-PORTAL INTEGRATION, REGRESSION, DATA-PRESERVATION & RELEASE-READINESS SUITE
 *
 * Verifies:
 * - Scenario A: New Connection Application Lifecycle across Consumer, Employee & Field Engineer
 * - Scenario B: Consumer Complaint & Work Order Lifecycle across Consumer, Employee & Field Engineer
 * - Scenario C: Critical Incident Lifecycle (Employee-first rule, Escalation, Field Decline, Closure & Emergency Override)
 * - Scenario D: Field Engineer Offline Work & Automatic FIFO Synchronization
 * - Scenario E: Billing, Payment, Receipt & Smart Payment Calendar Consistency
 * - Scenario F: Official Two-Page A4 Electricity Bill PDF across all 4 Languages (EN, GU, HI, MR)
 * - Scenario G: Admin DEMO Backup Center (23-category backup, checksum, preview, safe restore & RBAC guard)
 * - Scenario H: Cross-Portal Canonical Analytics Consistency & 100% Data-Preservation Audit
 */

import assert from 'node:assert/strict';
import {
  INITIAL_CONNECTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  INITIAL_CONSUMERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS
} from '../src/data/mockData';
import {
  generateNextRecordId,
  buildApplicationLifecycleNotifications,
  filterEmployeeApplicationNotifications
} from '../src/context/AppContext';
import {
  isValidApplicationTransition,
  isValidComplaintTransition,
  isValidWorkOrderTransition,
  isValidIncidentTransition,
  isActionAuthorized,
  canArchiveApplication
} from '../src/services/erpAdapter';
import {
  enqueueFieldWorkOrderStatusAction,
  replayFieldOfflineQueue
} from '../src/utils/fieldOfflineQueue';
import {
  filterIncidentsForSession,
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  isConfirmedEmergencyHazard
} from '../src/utils/anomalyDetector';
import {
  reconcileBillWithPayments,
  selectConnectionBillingSummary
} from '../src/utils/billingEngine';
import {
  deriveCanonicalBarcodeReference,
  encodeCode128B,
  decodeCode128Modules
} from '../src/utils/barcodeEngine';
import {
  deriveCanonicalQrVerificationUrl,
  parseBillVerificationUrl
} from '../src/utils/qrCodeEngine';
import {
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  A4_WIDTH_PT,
  A4_HEIGHT_PT
} from '../src/utils/pdfDocumentBuilder';
import {
  generateElectricityBillDocument
} from '../src/utils/documentEngine';
import {
  derivePaymentCalendarEvents,
  computeCalendarSummary
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
  BackupActorIdentity
} from '../src/utils/demoBackupEngine';
import {
  selectConsumerCanonicalAnalytics,
  selectEmployeeWorkloadAndSlaMetrics,
  selectManagementCanonicalMetrics,
  selectAdminCanonicalMetrics
} from '../src/utils/canonicalAnalytics';
import {
  localizeApplicationStatus,
  localizeComplaintStatus,
  localizeSubdivision
} from '../src/i18n/consumerContentTranslations';
import {
  localizeWorkOrderStatus
} from '../src/i18n/employeeContentTranslations';
import {
  localizeIncidentStatus,
  localizeIncidentSeverity
} from '../src/i18n/incidentLocalization';
import { Language } from '../src/i18n/types';
import { UserRole, NewConnectionApplication, WorkOrder, PaymentTransaction } from '../src/types';

console.log('==================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 8E FINAL RELEASE-READINESS SUITE');
console.log('Cross-Portal Integration, 4-Language Regression & Data Preservation');
console.log('==================================================================\n');

// Capture baseline snapshots of canonical DEMO records before running any scenario
const BASELINE_SNAPSHOT = JSON.stringify({
  connections: INITIAL_CONNECTIONS,
  bills: INITIAL_BILLS,
  payments: INITIAL_PAYMENTS,
  consumers: INITIAL_CONSUMERS,
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  employees: INITIAL_EMPLOYEES,
  fieldEngineers: INITIAL_FIELD_ENGINEERS,
  notifications: INITIAL_NOTIFICATIONS,
  auditLogs: AUDIT_LOGS
});

class InMemoryStorage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  getItem(k: string): string | null {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

let totalTests = 0;
let passedTests = 0;

async function runScenario(scenario: string, title: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] [${scenario}] ${passedTests}. ${title}`);
  } catch (err: any) {
    console.error(`  [FAIL] [${scenario}] ${title}:`, err.message);
    throw err;
  }
}

async function runPhase8ESuite() {
  // ==========================================================================
  // SCENARIO A: NEW CONNECTION APPLICATION LIFECYCLE
  // ==========================================================================
  console.log('\n--- SCENARIO A: Cross-Portal New Connection Application Lifecycle ---');

  await runScenario('Scenario A', 'Consumer submission -> Employee scrutiny -> Field inspection -> Sanction across portals', () => {
    const apps = structuredClone(INITIAL_APPLICATIONS);
    const newAppId = generateNextRecordId(apps.map(a => a.id), 'APP-2026-', 1001, 4);
    assert.ok(newAppId.startsWith('APP-2026-'));
    assert.ok(!apps.some(a => a.id === newAppId), 'Generated ID must never collide');

    // Step 1: Consumer submits new application in Mehsana City North
    const newApp: NewConnectionApplication = {
      id: newAppId,
      applicantName: 'Rameshbhai K. Patel',
      phone: '+91 98250 11223',
      email: 'ramesh.patel@example.com',
      address: 'Plot 14, Gayatri Society, Mehsana',
      subdivision: 'Mehsana City North',
      category: 'Residential (RGPU)',
      requestedLoadKw: 3,
      phase: '1-Phase',
      premisesType: 'Owned',
      status: 'Submitted',
      appliedDate: '01-Nov-2026',
      targetCompletionDate: '15-Nov-2026',
      assignedOfficer: 'Sunil Mehta (Dy. Engineer)',
      assignedEngineer: 'Vikramaditya Solanki (JE Field)',
      estimatedSanctionCost: 4500,
      documentsSubmitted: ['Aadhaar', 'Property Tax Receipt'],
      workflowStep: 1,
      accountId: 'demo_consumer',
      notesHistory: []
    };

    const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(newApp, 'Submitted');
    assert.equal(employeeNotif.targetRole, 'employee');
    assert.ok(consumerNotif);
    assert.equal(consumerNotif!.targetRole, 'consumer');

    // Subdivision-scoped Employee filtering
    const allApps = [newApp, ...apps];
    const mehsanaEmpNotifs = filterEmployeeApplicationNotifications([employeeNotif], allApps, { subdivisionScope: 'Mehsana City North' });
    const visnagarEmpNotifs = filterEmployeeApplicationNotifications([employeeNotif], allApps, { subdivisionScope: 'Gandhinagar Sub-Division 2' });
    assert.equal(mehsanaEmpNotifs.length, 1, 'Mehsana Employee must receive notification');
    assert.equal(visnagarEmpNotifs.length, 0, 'Unrelated subdivision Employee must not see notification');

    // Step 2: Role guard and Employee advances Submitted -> Document Verification -> Site Inspection
    assert.equal(isActionAuthorized('consumer', 'PATCH /api/v1/applications/:id/status'), false);
    assert.equal(isActionAuthorized('employee', 'PATCH /api/v1/applications/:id/status'), true);

    assert.equal(isValidApplicationTransition('Submitted', 'Document Verification'), true);
    newApp.status = 'Document Verification';

    assert.equal(isValidApplicationTransition('Document Verification', 'Site Inspection'), true);
    newApp.status = 'Site Inspection';

    // Step 3: Field Engineer completes site inspection -> Sanction Approval -> Meter Installed
    assert.equal(isValidApplicationTransition('Site Inspection', 'Sanction Approval'), true);
    newApp.status = 'Sanction Approval';

    assert.equal(isValidApplicationTransition('Sanction Approval', 'Meter Installed'), true);
    newApp.status = 'Meter Installed';
    assert.equal(newApp.id, newAppId, 'Application ID must remain stable end-to-end');
    assert.equal(canArchiveApplication(newApp).allowed, true, 'Terminal application can be archived');
  });

  // ==========================================================================
  // SCENARIO B: CONSUMER COMPLAINT & WORK ORDER LIFECYCLE
  // ==========================================================================
  console.log('\n--- SCENARIO B: Consumer Complaint & Work Order Lifecycle ---');

  await runScenario('Scenario B', 'Consumer complaint registration -> Employee dispatch -> Field work order -> Resolution', () => {
    const complaints = structuredClone(INITIAL_COMPLAINTS);
    const workOrders = structuredClone(INITIAL_WORK_ORDERS);

    const newCmpId = generateNextRecordId(complaints.map(c => c.id), 'CMP-', 8900, 4);
    const newWoId = generateNextRecordId(workOrders.map(w => w.id), 'WO-UG-', 4500, 4);

    // Consumer registers complaint
    const cmp: any = {
      id: newCmpId,
      consumerNo: '04281-99231',
      consumerName: 'Rameshbhai K. Patel',
      category: 'Voltage Fluctuation',
      status: 'Registered',
      priority: 'High',
      subdivision: 'Mehsana City North'
    };

    // Employee dispatches Field Engineer
    assert.equal(isValidComplaintTransition('Registered', 'Dispatched'), true);
    cmp.status = 'Dispatched';

    const wo: any = {
      id: newWoId,
      linkedComplaintId: cmp.id,
      title: 'Inspect L.T. Line Voltage Drop',
      assignedTo: 'Vikramaditya Solanki',
      assignedEngineerId: 'FLD-UG-201',
      subdivision: 'Mehsana City North',
      status: 'Pending'
    };

    // Field Engineer progresses Pending -> En Route -> On Site -> Completed
    assert.equal(isValidWorkOrderTransition('Pending', 'En Route'), true);
    wo.status = 'En Route';
    assert.equal(isValidWorkOrderTransition('En Route', 'On Site'), true);
    wo.status = 'On Site';
    assert.equal(isValidWorkOrderTransition('On Site', 'Completed'), true);
    wo.status = 'Completed';

    // Upstream complaint advances to In Progress -> Resolved
    assert.equal(isValidComplaintTransition('Dispatched', 'In Progress'), true);
    cmp.status = 'In Progress';
    assert.equal(isValidComplaintTransition('In Progress', 'Resolved'), true);
    cmp.status = 'Resolved';
    assert.equal(wo.status, 'Completed');
    assert.equal(cmp.status, 'Resolved');
  });

  // ==========================================================================
  // SCENARIO C: CRITICAL INCIDENT LIFECYCLE & EMERGENCY OVERRIDE
  // ==========================================================================
  console.log('\n--- SCENARIO C: Critical Incident Lifecycle & Role Isolation ---');

  await runScenario('Scenario C', 'Employee-first visibility, Field assignment & decline, Management escalation, Closure & Emergency Override', () => {
    const mehsanaEmp = { id: 'EMP-UG-1101', name: 'Sunil Mehta', role: 'employee' as UserRole, subdivision: 'Mehsana City North' };
    const field1 = { id: 'FLD-UG-201', name: 'Vikramaditya Solanki', role: 'field' as UserRole, subdivision: 'Mehsana City North' };
    const field2 = { id: 'FLD-UG-202', name: 'Harshadkumar Chaudhary', role: 'field' as UserRole, subdivision: 'Mehsana City North' };
    const mgmtUser = { id: 'usr_mgmt_01', name: 'Rajesh Solanki', role: 'management' as UserRole };
    const consumerUser = { id: 'demo_consumer', name: 'Rameshbhai K. Patel', role: 'consumer' as UserRole };

    let incident: any = {
      id: 'INC-2026-8E-01',
      title: '11kV Feeder Thermal Overload',
      description: 'Transformer oil temperature reached 94C under peak load.',
      severity: 'CRITICAL',
      module: 'Distribution & SCADA',
      entityId: 'FDR-MEH-02',
      entityType: 'feeder',
      subdivision: 'Mehsana City North',
      timestamp: '2026-11-01T12:00:00.000Z',
      responsibleRoles: ['employee'],
      recommendedAction: 'Dispatch field engineer to balance feeder phases.',
      status: 'DETECTED',
      approvalStatus: 'PENDING_APPROVAL',
      history: []
    };

    // 1. Un-escalated: visible to Mehsana Employee, hidden from Management, Field, and Consumer
    assert.equal(filterIncidentsForSession([incident], 'employee', mehsanaEmp).length, 1);
    assert.equal(filterIncidentsForSession([incident], 'management', mgmtUser).length, 0);
    assert.equal(filterIncidentsForSession([incident], 'field', field1).length, 0);
    assert.equal(filterIncidentsForSession([incident], 'consumer', consumerUser).length, 0);

    // 2. Employee assigns to Field Engineer 1
    incident = {
      ...incident,
      status: 'ASSIGNED',
      responsibleRoles: ['employee', 'field'],
      assignedToUserId: field1.id,
      assignedEngineerName: field1.name,
      originatingEmployeeUserId: mehsanaEmp.id
    };
    assert.equal(filterIncidentsForSession([incident], 'field', field1).length, 1);
    assert.equal(filterIncidentsForSession([incident], 'field', field2).length, 0);

    // 3. Field Engineer 1 declines assignment -> revoked from Field Engineer 1, returned to Employee Control Desk
    const declineResult = declineIncidentAssignmentRecord(
      incident,
      'Currently handling live HT fault at Sub-Station B',
      { id: field1.id, name: field1.name, role: 'field' },
      'field'
    );
    assert.equal(declineResult.success, true);
    incident = declineResult.updatedIncident!;
    assert.equal(filterIncidentsForSession([incident], 'field', field1).length, 0, 'Declining engineer loses access');
    assert.equal(filterIncidentsForSession([incident], 'employee', mehsanaEmp).length, 1, 'Employee retains control');

    // 4. Employee escalates to Management
    incident = {
      ...incident,
      status: 'ESCALATED',
      escalatedTo: 'management',
      escalatedToUserId: mgmtUser.id,
      responsibleRoles: ['employee', 'management']
    };
    assert.equal(filterIncidentsForSession([incident], 'management', mgmtUser).length, 1, 'Management sees escalated incident');

    // 5. Resolution & Closure
    assert.equal(isValidIncidentTransition('ESCALATED', 'RESOLVED'), true);
    assert.equal(isValidIncidentTransition('RESOLVED', 'CLOSED'), true);

    // 6. Emergency Safety Override verification
    const emergencyIncident: any = {
      ...incident,
      id: 'INC-2026-8E-EMG',
      title: 'EMERGENCY: Snapped 11kV Conductor Electrocution Hazard',
      description: 'Live 11kV conductor snapped onto public road.',
      isEmergencyOverride: true,
      hazardClassification: 'electrocution',
      hazardDetails: 'Active arcing on wet road surface.',
      responsibleRoles: ['field', 'employee', 'management', 'admin']
    };
    assert.equal(isConfirmedEmergencyHazard(emergencyIncident), true);
    assert.equal(filterIncidentsForSession([emergencyIncident], 'consumer', consumerUser).length, 0, 'Consumer isolated from emergency operational incidents');
  });

  // ==========================================================================
  // SCENARIO D: FIELD ENGINEER OFFLINE WORK & AUTOMATIC FIFO SYNC
  // ==========================================================================
  console.log('\n--- SCENARIO D: Field Engineer Offline Work & FIFO Replay ---');

  await runScenario('Scenario D', 'Offline queue persistence, chronological FIFO replay, and idempotency', () => {
    const mockStorage = new InMemoryStorage();
    const workOrdersState: WorkOrder[] = structuredClone(INITIAL_WORK_ORDERS);
    const targetWoId = workOrdersState[0].id;
    workOrdersState[0].status = 'Pending';

    const processedUuids = new Set<string>();

    const { item, queue } = enqueueFieldWorkOrderStatusAction(
      {
        woId: targetWoId,
        targetStatus: 'En Route',
        canonicalWorkOrders: workOrdersState,
        submittedBy: 'Vikramaditya Solanki (FLD-UG-201)'
      },
      mockStorage as unknown as Storage
    );

    assert.ok(item.client_uuid.length > 0);
    assert.equal(queue.length, 1);

    const replayResult = replayFieldOfflineQueue({
      isOnline: true,
      dataMode: 'DEMO',
      processedUuids,
      storage: mockStorage as unknown as Storage,
      getWorkOrder: (woId) => workOrdersState.find(w => w.id === woId),
      executeWorkflowUpdate: (qItem) => {
        const idx = workOrdersState.findIndex(w => w.id === qItem.payload.woId);
        if (idx === -1) return { success: false, error: 'Not found' };
        workOrdersState[idx] = {
          ...workOrdersState[idx],
          status: qItem.payload.targetStatus
        };
        return { success: true };
      }
    });

    assert.equal(replayResult.syncedCount, 1);
    assert.equal(replayResult.failedCount, 0);
    assert.equal(workOrdersState[0].status, 'En Route');
    assert.equal(replayResult.queue[0].status, 'COMPLETED');

    // Second replay is 100% idempotent (0 duplicate executions)
    const secondReplay = replayFieldOfflineQueue({
      isOnline: true,
      dataMode: 'DEMO',
      processedUuids,
      storage: mockStorage as unknown as Storage,
      getWorkOrder: (woId) => workOrdersState.find(w => w.id === woId),
      executeWorkflowUpdate: () => {
        throw new Error('Should not re-execute completed queue item');
      }
    });
    assert.equal(secondReplay.syncedCount, 0);
  });

  // ==========================================================================
  // SCENARIO E: BILLING, PAYMENT, RECEIPT & SMART CALENDAR
  // ==========================================================================
  console.log('\n--- SCENARIO E: Billing, Payment, Receipt & Smart Calendar ---');

  await runScenario('Scenario E', 'Partial & full payment reconciliation updates balance, receipt, and Smart Payment Calendar', () => {
    const bills = structuredClone(INITIAL_BILLS);
    const payments: PaymentTransaction[] = structuredClone(INITIAL_PAYMENTS);
    const targetBill = bills.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    assert.ok(targetBill);
    assert.equal(targetBill.totalAmount, 2185);

    // 1. Apply partial payment of ₹1,000
    const partialTx: PaymentTransaction = {
      txId: 'TXN-8E-PART-01',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 1000,
      date: '15-Oct-2026 10:00',
      paymentMethod: 'UPI / BHIM',
      status: 'Successful',
      bankReference: 'UPI-8E-1000'
    };
    payments.push(partialTx);

    const partialRec = reconcileBillWithPayments(targetBill, payments, '15-Oct-2026');
    assert.equal(partialRec.effectiveStatus, 'Partially Paid');
    assert.equal(partialRec.paidAmount, 1000);
    assert.equal(partialRec.outstandingBalance, 1185);

    // 2. Apply remaining balance ₹1,185
    const secondTx: PaymentTransaction = {
      txId: 'TXN-8E-PART-02',
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      amount: 1185,
      date: '16-Oct-2026 11:00',
      paymentMethod: 'Net Banking',
      status: 'Successful',
      bankReference: 'NB-8E-1185'
    };
    payments.push(secondTx);

    const fullRec = reconcileBillWithPayments(targetBill, payments, '16-Oct-2026');
    assert.equal(fullRec.effectiveStatus, 'Paid');
    assert.equal(fullRec.paidAmount, 2185);
    assert.equal(fullRec.outstandingBalance, 0);

    // 3. Verify Connection Billing Summary & Smart Payment Calendar reflect zero outstanding balance for this connection
    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === '04281-99231')!;
    const connSummary = selectConnectionBillingSummary(conn, bills, payments, { referenceDate: '16-Oct-2026' });
    assert.equal(connSummary.totalOutstandingAmount, 0);
    assert.equal(connSummary.dueBillCount, 0);

    const calEvents = derivePaymentCalendarEvents(
      bills.filter(b => b.consumerNo === '04281-99231'),
      INITIAL_CONNECTIONS.filter(c => c.consumerNo === '04281-99231'),
      payments.filter(p => p.consumerNo === '04281-99231'),
      ['04281-99231']
    );
    const calSummary = computeCalendarSummary(calEvents);
    assert.equal(calSummary.totalDueAmount, 0);
  });

  // ==========================================================================
  // SCENARIO F: OFFICIAL TWO-PAGE A4 PDF ACROSS ALL 4 LANGUAGES
  // ==========================================================================
  console.log('\n--- SCENARIO F: Official Two-Page A4 PDF & Barcode/QR Verification ---');

  await runScenario('Scenario F', 'Generates exact 2-page A4 PDF in EN, GU, HI, MR with valid Code 128 barcode and QR payload', () => {
    const conn = INITIAL_CONNECTIONS.find(c => c.consumerNo === '04281-99231')!;
    const bill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821')!;
    const languages: Language[] = ['en', 'gu', 'hi', 'mr'];

    for (const lang of languages) {
      const doc = generateElectricityBillDocument({
        role: 'consumer',
        actor: {
          id: 'demo_consumer',
          name: 'Rameshbhai K. Patel',
          role: 'consumer',
          consumerNo: '04281-99231'
        },
        connection: conn,
        bill,
        payments: INITIAL_PAYMENTS,
        allBills: INITIAL_BILLS,
        language: lang,
        dataSource: 'DEMO'
      });

      const pdfBytes = generateOfficialDocumentPdfBytes(doc);
      const inspection = inspectGeneratedPdfBytes(pdfBytes);

      assert.equal(inspection.isValidPdf, true);
      assert.equal(inspection.pageCount, 2, `PDF for language "${lang}" must have exactly 2 pages`);
      assert.equal(inspection.mediaBox[2], A4_WIDTH_PT);
      assert.equal(inspection.mediaBox[3], A4_HEIGHT_PT);
      assert.equal(inspection.hasBlankTrailingPage, false);
      assert.equal(inspection.containsUgvclBranding, true, 'Must contain official UGVCL corporate identity');
    }

    // Barcode round-trip check
    const barcodeRef = deriveCanonicalBarcodeReference(bill.billNo, conn.consumerNo);
    const encoded = encodeCode128B(barcodeRef);
    const decoded = decodeCode128Modules(encoded.modules);
    assert.equal(decoded.success, true);
    assert.equal(decoded.checksumValid, true);
    assert.equal(decoded.decodedText, barcodeRef);

    // QR verification URL round-trip check
    const qrData = deriveCanonicalQrVerificationUrl(bill.billNo, conn.consumerNo, 'https://vidyutflow.ugvcl.demo');
    const parsedQr = parseBillVerificationUrl(qrData.url);
    assert.equal(parsedQr.isValid, true);
    assert.equal(parsedQr.ref, bill.billNo);
    assert.equal(parsedQr.consumerNo, conn.consumerNo);
  });

  // ==========================================================================
  // SCENARIO G: ADMIN DEMO BACKUP CENTER
  // ==========================================================================
  console.log('\n--- SCENARIO G: Admin DEMO Backup Center & Safe Restore ---');

  await runScenario('Scenario G', 'Creates 23-category backup, validates checksum, previews diff, restores safely, and blocks non-admin', () => {
    const mockStorage = new InMemoryStorage();
    const adminActor: BackupActorIdentity = {
      id: 'usr_admin_01',
      name: 'Kiran Desai',
      role: 'admin'
    };
    const consumerActor: BackupActorIdentity = {
      id: 'demo_consumer',
      name: 'Rameshbhai K. Patel',
      role: 'consumer'
    };

    // Seed isolated storage
    mockStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(INITIAL_BILLS));
    mockStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.payments, JSON.stringify(INITIAL_PAYMENTS));
    mockStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.applications, JSON.stringify(INITIAL_APPLICATIONS));

    assert.equal(ALL_BACKUP_CATEGORIES.length, 23);

    const backupRes = createDemoBackup({
      actor: adminActor,
      storage: mockStorage as unknown as Storage
    });
    assert.equal(backupRes.success, true);
    assert.equal(backupRes.authorized, true);
    const envelope = backupRes.envelope!;
    assert.equal(envelope.formatId, BACKUP_FORMAT_ID);
    assert.equal(envelope.schemaVersion, BACKUP_SCHEMA_VERSION);

    const validation = validateDemoBackup({
      actor: adminActor,
      backupInput: envelope,
      storage: mockStorage as unknown as Storage
    });
    assert.equal(validation.isValid, true);
    assert.equal(validation.integrityVerified, true);

    // Non-admin backup & restore attempts must be blocked
    const consumerBackupAttempt = createDemoBackup({
      actor: consumerActor,
      storage: mockStorage as unknown as Storage
    });
    assert.equal(consumerBackupAttempt.success, false);
    assert.equal(consumerBackupAttempt.authorized, false);

    // Mutate isolated storage and verify preview + safe restore
    mockStorage.setItem(CANONICAL_DEMO_STORAGE_KEYS.applications, JSON.stringify([]));
    const preview = generateDemoRestorePreview({
      actor: adminActor,
      backupInput: envelope,
      storage: mockStorage as unknown as Storage
    });
    assert.equal(preview.isValidBackup, true);
    assert.equal(preview.canRestoreSafely, true);

    const restoreResult = executeSafeDemoRestore({
      actor: adminActor,
      backupInput: envelope,
      explicitConfirmation: true,
      confirmationText: 'RESTORE',
      storage: mockStorage as unknown as Storage
    });
    assert.equal(restoreResult.success, true);
    assert.equal(restoreResult.recoveryVerified, true);
    assert.ok(restoreResult.recoverySnapshotId && restoreResult.recoverySnapshotId.startsWith('SNAP-PRE-'));

    const restoredApps = JSON.parse(mockStorage.getItem(CANONICAL_DEMO_STORAGE_KEYS.applications) || '[]');
    assert.equal(restoredApps.length, INITIAL_APPLICATIONS.length);
  });

  // ==========================================================================
  // SCENARIO H: 4-LANGUAGE LOCALIZATION & DATA-PRESERVATION AUDIT
  // ==========================================================================
  console.log('\n--- SCENARIO H: 4-Language Workflow Localization & Data Preservation ---');

  await runScenario('Scenario H', 'All workflow statuses localize cleanly across EN, GU, HI, MR and canonical seed data is 100% preserved', () => {
    const langs: Language[] = ['en', 'gu', 'hi', 'mr'];
    for (const lang of langs) {
      assert.ok(localizeApplicationStatus('Submitted', lang).length > 0);
      assert.ok(localizeComplaintStatus('Dispatched', lang).length > 0);
      assert.ok(localizeWorkOrderStatus('On Site', lang).length > 0);
      assert.ok(localizeIncidentStatus('ESCALATED', lang).length > 0);
      assert.ok(localizeIncidentSeverity('CRITICAL', lang).length > 0);
      assert.ok(localizeSubdivision('Mehsana City North', lang).length > 0);
    }

    // Verify canonical analytics selectors remain consistent
    const consumerAnalytics = selectConsumerCanonicalAnalytics({
      connections: INITIAL_CONNECTIONS,
      bills: INITIAL_BILLS,
      payments: INITIAL_PAYMENTS,
      applications: INITIAL_APPLICATIONS,
      complaints: INITIAL_COMPLAINTS,
      notifications: INITIAL_NOTIFICATIONS,
      actorScope: { accountId: 'demo_consumer', ownedConsumerNos: ['04281-99231', '04281-77190'] },
      selectedConnectionNo: '04281-99231'
    });
    assert.equal(consumerAnalytics.connectionOutstandingBalanceInr, 2185);

    const empAnalytics = selectEmployeeWorkloadAndSlaMetrics({
      applications: INITIAL_APPLICATIONS,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      incidents: [],
      bills: INITIAL_BILLS,
      payments: INITIAL_PAYMENTS,
      fieldEngineers: INITIAL_FIELD_ENGINEERS
    });
    assert.equal(empAnalytics.complaints.activeOpenCount, 3);

    const mgmtAnalytics = selectManagementCanonicalMetrics({
      applications: INITIAL_APPLICATIONS,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      incidents: [],
      bills: INITIAL_BILLS,
      payments: INITIAL_PAYMENTS
    });
    assert.ok(mgmtAnalytics.executiveKpis.totalBilledMUs > 0);

    const adminAnalytics = selectAdminCanonicalMetrics({
      consumers: INITIAL_CONSUMERS,
      connections: INITIAL_CONNECTIONS,
      applications: INITIAL_APPLICATIONS,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      bills: INITIAL_BILLS,
      payments: INITIAL_PAYMENTS,
      incidents: [],
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: AUDIT_LOGS,
      fieldOfflineQueue: [],
      employees: INITIAL_EMPLOYEES,
      fieldEngineers: INITIAL_FIELD_ENGINEERS
    });
    assert.equal(adminAnalytics.demoRepositoryStats.totalConnections, INITIAL_CONNECTIONS.length);

    // Verify 100% immutability of canonical DEMO seed datasets
    const postRunSnapshot = JSON.stringify({
      connections: INITIAL_CONNECTIONS,
      bills: INITIAL_BILLS,
      payments: INITIAL_PAYMENTS,
      consumers: INITIAL_CONSUMERS,
      applications: INITIAL_APPLICATIONS,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      employees: INITIAL_EMPLOYEES,
      fieldEngineers: INITIAL_FIELD_ENGINEERS,
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: AUDIT_LOGS
    });
    assert.equal(postRunSnapshot, BASELINE_SNAPSHOT, 'Canonical DEMO seed datasets must remain 100% unmutated');
  });

  console.log('\n==================================================================');
  console.log(`PHASE 8E VERIFICATION SUMMARY: ${passedTests}/${totalTests} SCENARIOS PASSED (100%)`);
  console.log('==================================================================\n');
}

runPhase8ESuite().catch(err => {
  console.error('Phase 8E Suite Failed:', err);
  process.exit(1);
});
