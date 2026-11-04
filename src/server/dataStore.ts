import {
  UserRole,
  ConsumerProfile,
  ElectricityConnection,
  ElectricityBill,
  PaymentTransaction,
  ComplaintRecord,
  NewConnectionApplication,
  WorkOrder,
  EmployeeRecord,
  FieldEngineerRecord,
  AppNotification,
  AuditLogItem
} from '../types';
import {
  DEFAULT_METER_THRESHOLDS,
  MeterReadingError,
  calculateMeterConsumption,
  detectConsumptionAnomalies,
  detectDuplicateReading,
  detectIdentityMismatch,
  normalizeDisplayedReading,
  unreadableMeterIdentity,
  tariffCategoryId,
  validateStatusTransition,
  type MeterReadingRecord,
  type MeterReadingSubmission,
  type MeterConfiguration,
  type MeterThresholds,
  type AnomalyReviewStatus,
  type AnomalyStatusHistoryItem,
  type StructuredAnomalyCase,
  type BillingReviewCategory,
  type ConsumerBillingReviewRequest,
  type FinancialAdjustmentStatus,
  type FinancialAdjustmentProposal,
  type MeterAnomaly
} from '../services/meterReading';
import { calculateDetailedUgvclBill } from '../data/ugvclTariffSchedule';
import {
  INITIAL_CONSUMERS,
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_COMPLAINTS,
  INITIAL_APPLICATIONS,
  INITIAL_WORK_ORDERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS
} from '../data/mockData';
import {
  ServerAuthService,
  ServerSessionRecord,
  AuthSecurityError,
  requireServerRole,
  assertConsumerRecordOwnership
} from './authService';

/**
 * VidyutFlow Isolated Server-Side Data-Access Layer (Step 5B.1)
 *
 * Clones the canonical demo datasets from `src/data/mockData.ts` as read-only
 * templates (never mutating `mockData.ts` exports) and enforces server-side RBAC
 * and consumer record ownership on every read and mutation operation.
 */

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export class ServerDataStore {
  private readonly authService: ServerAuthService;
  private consumers: ConsumerProfile[];
  private connections: ElectricityConnection[];
  private bills: ElectricityBill[];
  private payments: PaymentTransaction[];
  private complaints: ComplaintRecord[];
  private applications: NewConnectionApplication[];
  private workOrders: WorkOrder[];
  private employees: EmployeeRecord[];
  private fieldEngineers: FieldEngineerRecord[];
  private notifications: AppNotification[];
  private auditLogs: AuditLogItem[];
  private meterReadings: MeterReadingRecord[] = [];
  private meterPhotos = new Map<string, string>();
  private meterPhotoBytes = 0;
  private meterSubmissionTimes = new Map<string, number[]>();
  private meterThresholds: MeterThresholds = { ...DEFAULT_METER_THRESHOLDS };
  private thresholdHistory: Array<{
    version: number;
    changedAt: string;
    changedBy: string;
    reason: string;
    thresholds: MeterThresholds;
  }> = [];
  private meterConfigurations = new Map<string, MeterConfiguration>();
  private accountLinkedConnections = new Map<string, Set<string>>();
  private anomalyCases = new Map<string, StructuredAnomalyCase>();
  private consumerBillingReviews = new Map<string, ConsumerBillingReviewRequest>();
  private financialAdjustments = new Map<string, FinancialAdjustmentProposal>();

  constructor(authService: ServerAuthService) {
    this.authService = authService;
    this.consumers = deepClone(INITIAL_CONSUMERS);
    this.connections = deepClone(INITIAL_CONNECTIONS);
    this.bills = deepClone(INITIAL_BILLS);
    this.payments = deepClone(INITIAL_PAYMENTS);
    this.complaints = deepClone(INITIAL_COMPLAINTS);
    this.applications = deepClone(INITIAL_APPLICATIONS);
    this.workOrders = deepClone(INITIAL_WORK_ORDERS);
    this.employees = deepClone(INITIAL_EMPLOYEES);
    this.fieldEngineers = deepClone(INITIAL_FIELD_ENGINEERS);
    this.notifications = deepClone(INITIAL_NOTIFICATIONS);
    this.auditLogs = deepClone(AUDIT_LOGS);
    for (const connection of this.connections) {
      this.meterConfigurations.set(connection.connectionId, { connectionId: connection.connectionId, meterNo: connection.meterNo, multiplier: 1, decimalPlaces: 0, version: 1, source: 'DEMO_DEFAULT' });
    }

    // Seed initial ownership mapping for the default demo consumer (Smt. Meenaben Patel)
    this.accountLinkedConnections.set(
      'demo_consumer',
      new Set(['04281-99231', '04281-77190'])
    );

    // Initial policy threshold baseline
    this.thresholdHistory.push({
      version: 1,
      changedAt: '2026-01-01T00:00:00.000Z',
      changedBy: 'System Baseline',
      reason: 'Canonical Multi-Year Tariff (MYT) baseline detection thresholds (2.5x surge, 0.35x drop)',
      thresholds: { ...DEFAULT_METER_THRESHOLDS }
    });

    // Seed realistic demo readings for cross-portal workflows
    const r1: MeterReadingRecord = {
      id: 'MR-20261028-99231',
      clientUuid: 'seed-uuid-99231-oct',
      consumerNo: '04281-99231',
      connectionId: 'CONN-04281-99231',
      meterNo: 'UGVCL-MTR-004281',
      displayedReading: '004450',
      readingKwh: 4450,
      multiplier: 1,
      meterEvent: 'ordinary',
      readingAt: '2026-10-28T09:30:00.000Z',
      previousReadingKwh: 4210,
      consumedUnits: 240,
      intervalDays: 58,
      status: 'APPROVED',
      submittedBy: 'Vikramaditya Solanki',
      submittedRole: 'field',
      submittedAt: '2026-10-28T09:32:00.000Z',
      reviewedBy: 'Rajesh V. Trivedi',
      reviewedAt: '2026-10-28T11:15:00.000Z',
      reviewNote: 'Verified display digits against optical scan photo. Normal consumption pattern.',
      anomalies: [],
      demo: true
    };
    this.meterReadings.push(r1);

    const r2Anom: MeterAnomaly = {
      id: 'ANOM-20261101-77190',
      category: 'HIGH_CONSUMPTION',
      severity: 'HIGH',
      evidence: 'Daily consumption of 15.67 units is 2.9x higher than the historical baseline of 5.40 units/day.',
      expectedValue: '324 kWh (5.40 kWh/day)',
      recordedValue: '940 kWh (15.67 kWh/day)',
      recommendedAction: 'Verify meter photo counter, check seasonal air-conditioning load, or dispatch field re-verification.',
      detectedAt: '2026-11-01T10:20:00.000Z',
      status: 'OPEN'
    };
    const r2: MeterReadingRecord = {
      id: 'MR-20261101-77190',
      clientUuid: 'seed-uuid-77190-nov',
      consumerNo: '04281-99231',
      connectionId: 'CONN-04281-99231',
      meterNo: 'UGVCL-MTR-004282',
      displayedReading: '004120',
      readingKwh: 4120,
      multiplier: 1,
      meterEvent: 'ordinary',
      readingAt: '2026-11-01T10:15:00.000Z',
      previousReadingKwh: 3180,
      consumedUnits: 940,
      intervalDays: 60,
      status: 'PENDING_REVIEW',
      submittedBy: 'Smt. Meenaben Patel',
      submittedRole: 'consumer',
      submittedAt: '2026-11-01T10:20:00.000Z',
      anomalies: [r2Anom],
      demo: true
    };
    this.meterReadings.push(r2);

    const case2: StructuredAnomalyCase = {
      id: 'ANO-20261101-77190',
      readingId: 'MR-20261101-77190',
      consumerNo: '04281-99231',
      connectionId: 'CONN-04281-99231',
      meterNo: 'UGVCL-MTR-004282',
      category: 'HIGH_CONSUMPTION',
      severity: 'HIGH',
      detectedAt: '2026-11-01T10:20:00.000Z',
      observedValue: '940 kWh (15.67 kWh/day)',
      expectedValue: '324 kWh (5.40 kWh/day)',
      explanation: 'Daily consumption of 15.67 units is 2.9x higher than historical baseline.',
      status: 'PENDING_REVIEW',
      statusHistory: [
        {
          id: 'ASH-SEED-01',
          fromStatus: 'DETECTED',
          toStatus: 'PENDING_REVIEW',
          actorId: 'demo_consumer',
          actorName: 'Smt. Meenaben Patel',
          actorRole: 'consumer',
          timestamp: '2026-11-01T10:20:00.000Z',
          action: 'ANOMALY_REGISTERED',
          reason: 'Daily consumption of 15.67 units is 2.9x higher than historical baseline.',
          referenceId: 'MR-20261101-77190'
        }
      ],
      demo: true
    };
    this.anomalyCases.set(case2.id, case2);

    // Seed initial billing review request for bill BILL-UG-2026-08-8821
    const cbr1: ConsumerBillingReviewRequest = {
      id: 'CBR-20261102-8821',
      clientUuid: 'seed-cbr-8821-uuid',
      consumerNo: '04281-99231',
      connectionId: 'CONN-04281-99231',
      billNo: 'BILL-UG-2026-08-8821',
      category: 'CONSUMPTION_DISPUTE',
      description: 'The premises was locked during Pitru Paksha; meter counter billed 360 units vs historical average of 220 units. Requesting optical check.',
      submittedBy: 'Smt. Meenaben Patel',
      submittedAt: '2026-11-02T14:30:00.000Z',
      status: 'UNDER_INVESTIGATION',
      statusHistory: [
        {
          id: 'ASH-CBR-01',
          fromStatus: 'DETECTED',
          toStatus: 'PENDING_REVIEW',
          actorId: 'demo_consumer',
          actorName: 'Smt. Meenaben Patel',
          actorRole: 'consumer',
          timestamp: '2026-11-02T14:30:00.000Z',
          action: 'BILLING_REVIEW_SUBMITTED',
          reason: 'Initial billing dispute lodged by citizen',
          referenceId: 'BILL-UG-2026-08-8821'
        },
        {
          id: 'ASH-CBR-02',
          fromStatus: 'PENDING_REVIEW',
          toStatus: 'UNDER_INVESTIGATION',
          actorId: 'emp_01',
          actorName: 'Rajesh V. Trivedi',
          actorRole: 'employee',
          timestamp: '2026-11-02T15:45:00.000Z',
          action: 'INVESTIGATION_OPENED',
          reason: 'Subdivision desk opened technical investigation for consumption audit.',
          referenceId: 'BILL-UG-2026-08-8821'
        }
      ],
      internalStaffNotes: ['Assigned to Gandhinagar Sub-Div 2 desk. Meter pulse check scheduled.'],
      consumerVisibleNote: 'Review request received and under desk investigation by subdivision officer.',
      demo: true
    };
    this.consumerBillingReviews.set(cbr1.id, cbr1);

    // Seed initial financial adjustment proposal proposed by Rajesh (employee)
    const adj1: FinancialAdjustmentProposal = {
      id: 'ADJ-20261102-001',
      billNo: 'BILL-UG-2026-08-8821',
      consumerNo: '04281-99231',
      connectionId: 'CONN-04281-99231',
      reviewRequestId: 'CBR-20261102-8821',
      originalBilledAmount: 2435,
      originalUnits: 360,
      revisedUnits: 260,
      proposedAdjustmentAmount: 560,
      adjustmentType: 'SLAB_CORRECTION',
      proposedRevisedAmount: 1625,
      calculationBasis: 'Canonical recalculation for 260 actual units based on verified physical dial photo.',
      reason: 'Meter reader transposed digit 6 for 2 on 4281-99231.',
      proposedBy: 'Rajesh V. Trivedi',
      proposedByRole: 'employee',
      proposedAt: '2026-11-02T16:00:00.000Z',
      status: 'PENDING_APPROVAL',
      statusHistory: [
        {
          status: 'PENDING_APPROVAL',
          actor: 'Rajesh V. Trivedi',
          role: 'employee',
          timestamp: '2026-11-02T16:00:00.000Z',
          note: 'Differential credit concession proposed for subdivision officer approval.'
        }
      ],
      demo: true
    };
    this.financialAdjustments.set(adj1.id, adj1);
  }

  /**
   * Returns the set of consumer connection numbers owned by a specific consumer `userId`.
   */
  public getConsumerConnectionsForUser(userId: string): ElectricityConnection[] {
    const owned = this.getOwnedConsumerNumbers(userId);
    return deepClone(
      this.connections.filter(c => c.accountId === userId || owned.has(c.consumerNo))
    );
  }

  public linkConsumerConnection(userId: string, consumerNo: string): ElectricityConnection {
    const conn = this.connections.find(c => c.consumerNo === consumerNo);
    if (!conn) {
      throw new AuthSecurityError(400, 'CONNECTION_NOT_FOUND', "Connection " + consumerNo + " not found.");
    }
    let set = this.accountLinkedConnections.get(userId);
    if (!set) {
      set = new Set();
      this.accountLinkedConnections.set(userId, set);
    }
    set.add(consumerNo);
    return deepClone(conn);
  }

  public getOwnedConsumerNumbers(userId: string): ReadonlySet<string> {
    const set = new Set<string>(this.accountLinkedConnections.get(userId) || []);
    for (const conn of this.connections) {
      if (conn.accountId === userId) {
        set.add(conn.consumerNo);
      }
    }
    return set;
  }

  private appendServerAuditLog(
    session: ServerSessionRecord,
    action: string,
    resource: string,
    metaDetail: string,
    status: AuditLogItem['status'] = 'SUCCESS'
  ): AuditLogItem {
    const entry: AuditLogItem = {
      id: `AUD-SRV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      actor: `${session.user.name} (${session.user.email})`,
      role: session.role.toUpperCase(),
      action,
      resource,
      ipAddress: '127.0.0.1',
      status,
      metaDetail
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  /**
   * Returns connections visible to the caller:
   * - `consumer`: ONLY their own linked connections.
   * - `employee`, `field`, `management`, `admin`: utility connections for operational portals.
   */
  public getConnections(signedToken: string, nowMs?: number): ElectricityConnection[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      return deepClone(
        this.connections.filter(
          c => c.accountId === session.userId || owned.has(c.consumerNo)
        )
      );
    }

    return deepClone(this.connections);
  }

  /**
   * Returns a single connection by `consumerNo` after verifying RBAC and consumer ownership.
   */
  public getConnectionByNumber(
    signedToken: string,
    consumerNo: string,
    nowMs?: number
  ): ElectricityConnection {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    const conn = this.connections.find(c => c.consumerNo === consumerNo);
    if (!conn) {
      throw new AuthSecurityError(400, 'CONNECTION_NOT_FOUND', `Connection ${consumerNo} not found.`);
    }

    assertConsumerRecordOwnership({
      session,
      recordOwnerAccountId: conn.accountId,
      recordConsumerNo: conn.consumerNo,
      ownedConsumerNos: this.getOwnedConsumerNumbers(session.userId),
      allowedStaffRoles: ['employee', 'field', 'management', 'admin']
    });

    return deepClone(conn);
  }

  /**
   * Returns bills visible to the caller:
   * - `consumer`: ONLY bills belonging to their owned connections.
   * - `employee`, `management`, `admin`: all bills.
   * - `field`: forbidden from accessing billing ledgers (`403 Forbidden`).
   */
  public getBills(signedToken: string, nowMs?: number): ElectricityBill[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'management', 'admin'],
      nowMs
    );

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      return deepClone(
        this.bills.filter(
          b => b.accountId === session.userId || owned.has(b.consumerNo)
        )
      );
    }

    return deepClone(this.bills);
  }

  /**
   * Returns a specific bill by `billNo`, strictly enforcing consumer ownership.
   */
  public getBillByNumber(
    signedToken: string,
    billNo: string,
    nowMs?: number
  ): ElectricityBill {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'management', 'admin'],
      nowMs
    );

    const bill = this.bills.find(b => b.billNo === billNo);
    if (!bill) {
      throw new AuthSecurityError(400, 'BILL_NOT_FOUND', `Bill ${billNo} not found.`);
    }

    assertConsumerRecordOwnership({
      session,
      recordOwnerAccountId: bill.accountId,
      recordConsumerNo: bill.consumerNo,
      ownedConsumerNos: this.getOwnedConsumerNumbers(session.userId),
      allowedStaffRoles: ['employee', 'management', 'admin']
    });

    return deepClone(bill);
  }

  /**
   * Pays a bill in simulation mode:
   * - Restricted to `consumer` role.
   * - Strictly verifies the consumer owns the bill's connection before marking it Paid.
   */
  public payBill(
    signedToken: string,
    billNo: string,
    paymentMethod: PaymentTransaction['paymentMethod'] = 'UPI / BHIM',
    nowMs?: number
  ): { bill: ElectricityBill; payment: PaymentTransaction } {
    const session = requireServerRole(this.authService, signedToken, ['consumer'], nowMs);

    const bill = this.bills.find(b => b.billNo === billNo);
    if (!bill) {
      throw new AuthSecurityError(400, 'BILL_NOT_FOUND', `Bill ${billNo} not found.`);
    }

    assertConsumerRecordOwnership({
      session,
      recordOwnerAccountId: bill.accountId,
      recordConsumerNo: bill.consumerNo,
      ownedConsumerNos: this.getOwnedConsumerNumbers(session.userId),
      allowedStaffRoles: []
    });

    const txId = `TXN-UPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const dateStr = new Date().toISOString();

    bill.status = 'Paid';
    bill.paidDate = dateStr;
    bill.transactionRef = txId;

    const payment: PaymentTransaction = {
      txId,
      consumerNo: bill.consumerNo,
      billNo: bill.billNo,
      date: dateStr,
      amount: bill.totalAmount,
      paymentMethod,
      status: 'Successful',
      bankReference: `DEMO/BBPS/${txId}`,
      accountId: session.userId
    };
    this.payments.unshift(payment);

    this.appendServerAuditLog(
      session,
      'DEMO_BILL_PAYMENT',
      `BILL#${bill.billNo}`,
      `Simulated payment of ₹${bill.totalAmount} for ${bill.consumerNo}`
    );

    return {
      bill: deepClone(bill),
      payment: deepClone(payment)
    };
  }

  /**
   * Returns payments visible to the caller, enforcing consumer ownership.
   */
  public getPayments(signedToken: string, nowMs?: number): PaymentTransaction[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'management', 'admin'],
      nowMs
    );

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      return deepClone(
        this.payments.filter(
          p => p.accountId === session.userId || owned.has(p.consumerNo)
        )
      );
    }

    return deepClone(this.payments);
  }

  /**
   * Returns a specific payment transaction by `txId`, strictly enforcing consumer ownership.
   */
  public getPaymentByTxId(
    signedToken: string,
    txId: string,
    nowMs?: number
  ): PaymentTransaction {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'management', 'admin'],
      nowMs
    );

    const payment = this.payments.find(p => p.txId === txId);
    if (!payment) {
      throw new AuthSecurityError(400, 'PAYMENT_NOT_FOUND', `Payment ${txId} not found.`);
    }

    assertConsumerRecordOwnership({
      session,
      recordOwnerAccountId: payment.accountId,
      recordConsumerNo: payment.consumerNo,
      ownedConsumerNos: this.getOwnedConsumerNumbers(session.userId),
      allowedStaffRoles: ['employee', 'management', 'admin']
    });

    return deepClone(payment);
  }

  /**
   * Returns complaints visible to the caller, enforcing consumer ownership.
   */
  public getComplaints(signedToken: string, nowMs?: number): ComplaintRecord[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      return deepClone(
        this.complaints.filter(
          c => c.accountId === session.userId || owned.has(c.consumerNo)
        )
      );
    }

    return deepClone(this.complaints);
  }

  /**
   * Returns a specific complaint by `complaintId`, strictly enforcing consumer ownership.
   */
  public getComplaintById(
    signedToken: string,
    complaintId: string,
    nowMs?: number
  ): ComplaintRecord {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    const complaint = this.complaints.find(c => c.id === complaintId);
    if (!complaint) {
      throw new AuthSecurityError(400, 'COMPLAINT_NOT_FOUND', `Complaint ${complaintId} not found.`);
    }

    assertConsumerRecordOwnership({
      session,
      recordOwnerAccountId: complaint.accountId,
      recordConsumerNo: complaint.consumerNo,
      ownedConsumerNos: this.getOwnedConsumerNumbers(session.userId),
      allowedStaffRoles: ['employee', 'field', 'management', 'admin']
    });

    return deepClone(complaint);
  }

  /**
   * Updates application status — restricted exclusively to `employee` and `admin` roles.
   */
  public updateApplicationStatus(
    signedToken: string,
    applicationId: string,
    status: NewConnectionApplication['status'],
    note?: string,
    nowMs?: number
  ): NewConnectionApplication {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    const app = this.applications.find(a => a.id === applicationId);
    if (!app) {
      throw new AuthSecurityError(400, 'APPLICATION_NOT_FOUND', `Application ${applicationId} not found.`);
    }

    app.status = status;
    if (note) {
      app.notesHistory.push({
        timestamp: new Date().toISOString(),
        author: session.user.name,
        note
      });
    }

    this.appendServerAuditLog(
      session,
      'APPLICATION_STATUS_UPDATED',
      applicationId,
      `Status updated to ${status}`
    );

    return deepClone(app);
  }

  /**
   * Archives a completed ('Meter Installed') or 'Rejected' application from the active employee queue.
   * Restricted exclusively to `employee` and `admin` roles.
   */
  public archiveApplication(
    signedToken: string,
    applicationId: string,
    reason?: string,
    nowMs?: number
  ): NewConnectionApplication {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    const app = this.applications.find(a => a.id === applicationId);
    if (!app) {
      throw new AuthSecurityError(400, 'APPLICATION_NOT_FOUND', `Application ${applicationId} not found.`);
    }

    if (app.status !== 'Meter Installed' && app.status !== 'Rejected') {
      throw new AuthSecurityError(
        400,
        'APPLICATION_ARCHIVE_NOT_ELIGIBLE',
        `Only completed (Meter Installed) or Rejected applications can be archived. Current status: ${app.status}.`
      );
    }

    app.isArchived = true;
    app.archivedAt = new Date().toISOString();
    app.archivedBy = session.user.name;
    app.archiveReason = reason || `Archived from active queue after ${app.status}`;

    this.appendServerAuditLog(
      session,
      'APPLICATION_ARCHIVED_FROM_QUEUE',
      applicationId,
      `Archived application (${app.status}): ${app.archiveReason}`
    );

    return deepClone(app);
  }

  /**
   * Restores an archived application back to the active employee queue.
   * Restricted exclusively to `employee` and `admin` roles.
   */
  public restoreApplication(
    signedToken: string,
    applicationId: string,
    nowMs?: number
  ): NewConnectionApplication {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    const app = this.applications.find(a => a.id === applicationId);
    if (!app) {
      throw new AuthSecurityError(400, 'APPLICATION_NOT_FOUND', `Application ${applicationId} not found.`);
    }

    app.isArchived = false;
    app.archivedAt = undefined;
    app.archivedBy = undefined;
    app.archiveReason = undefined;

    this.appendServerAuditLog(
      session,
      'APPLICATION_RESTORED_TO_QUEUE',
      applicationId,
      'Restored archived application to active queue'
    );

    return deepClone(app);
  }

  /**
   * Updates field work order status — restricted to `field`, `employee`, and `admin` roles.
   */
  public updateWorkOrderStatus(
    signedToken: string,
    workOrderId: string,
    status: WorkOrder['status'],
    nowMs?: number
  ): WorkOrder {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['field', 'employee', 'admin'],
      nowMs
    );

    const wo = this.workOrders.find(w => w.id === workOrderId);
    if (!wo) {
      throw new AuthSecurityError(400, 'WORK_ORDER_NOT_FOUND', `Work Order ${workOrderId} not found.`);
    }

    wo.status = status;
    this.appendServerAuditLog(
      session,
      'WORK_ORDER_STATUS_UPDATED',
      workOrderId,
      `Work order status set to ${status}`
    );

    return deepClone(wo);
  }

  /**
   * Returns system audit logs — strictly restricted to `admin` role (`403 Forbidden` for all other roles).
   */
  public getAuditLogs(signedToken: string, nowMs?: number): AuditLogItem[] {
    requireServerRole(this.authService, signedToken, ['admin'], nowMs);
    return deepClone(this.auditLogs);
  }

  private isFieldAssignedToConnection(
    session: { user: { name: string; email: string } },
    consumerNo?: string
  ): boolean {
    if (!consumerNo) return false;
    const fieldTokens = session.user.name.toLowerCase().split(/\s+/);
    return this.workOrders.some(w =>
      w.consumerNo === consumerNo &&
      (w.assignedTo.toLowerCase().includes(session.user.name.toLowerCase()) ||
       w.assignedTo.toLowerCase().includes(session.user.email.toLowerCase()) ||
       fieldTokens.some(token => token.length > 2 && w.assignedTo.toLowerCase().includes(token)))
    );
  }

  public getMeterReadings(signedToken: string, nowMs?: number): MeterReadingRecord[] {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'employee', 'field', 'admin'], nowMs);
    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      return deepClone(this.meterReadings.filter(r => owned.has(r.consumerNo)));
    }
    if (session.role === 'field') {
      return deepClone(this.meterReadings.filter(r => this.isFieldAssignedToConnection(session, r.consumerNo)));
    }
    return deepClone(this.meterReadings);
  }

  private emitMeterNotification(params: {
    eventKey: string;
    title: string;
    message: string;
    targetRole: UserRole;
    type: AppNotification['type'];
    category: AppNotification['category'];
    consumerNo?: string;
  }): AppNotification {
    const id = params.eventKey.startsWith('NOT-MR-') ? params.eventKey : `NOT-MR-${params.eventKey}`;
    const existing = this.notifications.find(n => n.id === id);
    if (existing) {
      return existing;
    }
    const item: AppNotification = {
      id,
      title: params.title,
      message: params.message,
      time: new Date().toISOString(),
      targetRole: params.targetRole,
      type: params.type,
      read: false,
      category: params.category,
      ...(params.consumerNo ? { consumerNo: params.consumerNo } : {})
    };
    this.notifications.unshift(item);
    return item;
  }

  public getMeterNotifications(signedToken: string, nowMs?: number): AppNotification[] {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'employee', 'field', 'management', 'admin'], nowMs);
    const owned = session.role === 'consumer' ? this.getOwnedConsumerNumbers(session.userId) : null;
    return deepClone(this.notifications.filter(item => {
      if (!item.id.startsWith('NOT-MR-')) return false;
      const roleAllowed =
        item.targetRole === session.role ||
        (session.role === 'admin' && (item.targetRole === 'employee' || item.targetRole === 'admin')) ||
        (session.role === 'management' && (item.targetRole === 'employee' || item.targetRole === 'management'));
      if (!roleAllowed) return false;
      if (owned) {
        return item.consumerNo ? owned.has(item.consumerNo) : false;
      }
      if (session.role === 'field' && item.consumerNo) {
        return this.isFieldAssignedToConnection(session, item.consumerNo);
      }
      return true;
    }).slice(0, 20));
  }

  public getMeterThresholds(
    signedToken: string,
    nowMs?: number
  ): MeterThresholds & {
    history?: Array<{
      version: number;
      changedAt: string;
      changedBy: string;
      reason: string;
      thresholds: MeterThresholds;
    }>;
  } {
    requireServerRole(this.authService, signedToken, ['employee', 'admin'], nowMs);
    return { ...this.meterThresholds, history: deepClone(this.thresholdHistory) };
  }

  public getMeterConfiguration(signedToken: string, consumerNo: string, nowMs?: number): MeterConfiguration {
    const connection = this.getConnectionByNumber(signedToken, consumerNo, nowMs);
    const config = this.meterConfigurations.get(connection.connectionId);
    if (!config) throw new AuthSecurityError(400, 'METER_CONFIG_NOT_FOUND', 'No meter configuration exists for this connection.');
    return { ...config };
  }

  public setMeterConfiguration(signedToken: string, input: { consumerNo: string; multiplier: number; decimalPlaces: number; rolloverAt?: number }, nowMs?: number): MeterConfiguration {
    const session = requireServerRole(this.authService, signedToken, ['admin'], nowMs);
    if (!input || typeof input !== 'object' || typeof input.consumerNo !== 'string' || !input.consumerNo.trim()) {
      throw new AuthSecurityError(400, 'CONNECTION_REQUIRED', 'Choose a connection to update its meter configuration.');
    }
    const connection = this.connections.find(item => item.consumerNo === input.consumerNo);
    if (!connection) throw new AuthSecurityError(400, 'CONNECTION_NOT_FOUND', 'Connection was not found.');
    if (!Number.isFinite(input.multiplier) || input.multiplier <= 0 || input.multiplier > 10000 || !Number.isInteger(input.decimalPlaces) || input.decimalPlaces < 0 || input.decimalPlaces > 2 || (input.rolloverAt !== undefined && (!Number.isFinite(input.rolloverAt) || input.rolloverAt <= 0))) {
      throw new AuthSecurityError(400, 'INVALID_METER_CONFIG', 'Multiplier, decimal precision or rollover limit is invalid.');
    }
    const old = this.meterConfigurations.get(connection.connectionId)!;
    const next: MeterConfiguration = { connectionId: connection.connectionId, meterNo: connection.meterNo, multiplier: input.multiplier, decimalPlaces: input.decimalPlaces, ...(input.rolloverAt ? { rolloverAt: input.rolloverAt } : {}), version: old.version + 1, source: 'ADMIN_CONFIGURED' };
    this.meterConfigurations.set(connection.connectionId, next);
    this.appendServerAuditLog(session, 'METER_CONFIGURATION_UPDATED', connection.connectionId, `meter=${connection.meterNo}; version=${next.version}; multiplier=${next.multiplier}; decimals=${next.decimalPlaces}`);
    return { ...next };
  }

  public setMeterThresholds(
    signedToken: string,
    input: Omit<MeterThresholds, 'version'> & { reason?: string },
    nowMs?: number
  ): MeterThresholds & {
    history?: Array<{
      version: number;
      changedAt: string;
      changedBy: string;
      reason: string;
      thresholds: MeterThresholds;
    }>;
  } {
    const session = requireServerRole(this.authService, signedToken, ['admin'], nowMs);
    if (!input || typeof input !== 'object') {
      throw new AuthSecurityError(400, 'INVALID_THRESHOLDS', 'Thresholds must be positive, bounded and use at least two history periods.');
    }
    const values = [input.minimumHistory, input.highDailyRatio, input.lowDailyRatio, input.highDailyUnits];
    if (values.some(v => !Number.isFinite(v) || v <= 0) || input.minimumHistory < 2 || input.minimumHistory > 12 || input.highDailyRatio <= 1 || input.lowDailyRatio >= 1) {
      throw new AuthSecurityError(400, 'INVALID_THRESHOLDS', 'Thresholds must be positive, bounded and use at least two history periods.');
    }
    if (!input.reason || typeof input.reason !== 'string' || !input.reason.trim()) {
      throw new AuthSecurityError(400, 'REASON_REQUIRED', 'A business justification reason is required to update meter thresholds.');
    }
    const reason = input.reason.trim();
    this.meterThresholds = {
      minimumHistory: input.minimumHistory,
      highDailyRatio: input.highDailyRatio,
      lowDailyRatio: input.lowDailyRatio,
      highDailyUnits: input.highDailyUnits,
      version: this.meterThresholds.version + 1
    };
    this.thresholdHistory.push({
      version: this.meterThresholds.version,
      changedAt: new Date().toISOString(),
      changedBy: session.user.name,
      reason,
      thresholds: { ...this.meterThresholds }
    });
    this.appendServerAuditLog(session, 'METER_THRESHOLDS_UPDATED', 'meter-reading-policy', `threshold_version=${this.meterThresholds.version} reason=${reason}`);
    return { ...this.meterThresholds, history: deepClone(this.thresholdHistory) };
  }

  public submitMeterReading(signedToken: string, input: MeterReadingSubmission, nowMs?: number): MeterReadingRecord {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'field'], nowMs);
    if (!input || typeof input !== 'object') throw new AuthSecurityError(400, 'INVALID_BODY', 'A JSON object is required.');
    if (typeof input.consumerNo !== 'string' || !input.consumerNo.trim()) throw new AuthSecurityError(400, 'CONNECTION_REQUIRED', 'Choose a valid connection.');
    if (typeof input.meterNo !== 'string' || !input.meterNo.trim()) throw new AuthSecurityError(400, 'INVALID_METER_NO', 'A valid meter number is required.');
    if (typeof input.clientUuid !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(input.clientUuid)) throw new AuthSecurityError(400, 'INVALID_CLIENT_UUID', 'A valid unique submission ID is required.');
    if (typeof input.displayedReading !== 'string' || input.displayedReading.trim().length === 0 || input.displayedReading.length > 24 || !Number.isFinite(input.readingKwh) || input.readingKwh < 0) {
      throw new AuthSecurityError(400, 'INVALID_READING', 'The meter reading is invalid.');
    }
    if (typeof input.readingAt !== 'string' || !Number.isFinite(Date.parse(input.readingAt))) {
      throw new AuthSecurityError(400, 'INVALID_READING_DATE', 'Provide a valid ISO reading date.');
    }
    if (input.photoDataUrl !== undefined && typeof input.photoDataUrl !== 'string') {
      throw new AuthSecurityError(400, 'INVALID_PHOTO', 'Photo must be a JPEG, PNG, or WebP image.');
    }
    const conn = this.getConnectionByNumber(signedToken, input.consumerNo, nowMs);
    const meterConfig = this.meterConfigurations.get(conn.connectionId);
    if (!meterConfig || input.meterNo !== meterConfig.meterNo) throw new AuthSecurityError(409, 'METER_IDENTITY_MISMATCH', 'Selected meter does not match the active meter configuration.');
    const recentSubmissions = (this.meterSubmissionTimes.get(session.userId) || []).filter(at => Date.now() - at < 60_000);
    if (recentSubmissions.length >= 10) throw new AuthSecurityError(429, 'METER_READING_RATE_LIMIT', 'Too many reading submissions. Wait a minute and retry.');
    recentSubmissions.push(Date.now());
    this.meterSubmissionTimes.set(session.userId, recentSubmissions);
    if (session.role === 'field') {
      const fieldTokens = session.user.name.toLowerCase().split(/\s+/);
      const assigned = this.workOrders.some(w =>
        w.consumerNo === conn.consumerNo &&
        (w.assignedTo.toLowerCase().includes(session.user.name.toLowerCase()) ||
         w.assignedTo.toLowerCase().includes(session.user.email.toLowerCase()) ||
         fieldTokens.some(token => token.length > 2 && w.assignedTo.toLowerCase().includes(token)))
      );
      if (!assigned) throw new AuthSecurityError(403, 'METER_ASSIGNMENT_REQUIRED', 'Field engineers may submit readings only for a meter assigned to them.');
    }
    const priorClient = this.meterReadings.find(r => r.clientUuid === input.clientUuid);
    if (priorClient) return deepClone(priorClient);
    if (input.meterEvent && !['ordinary', 'rollover', 'replacement'].includes(input.meterEvent)) throw new AuthSecurityError(400, 'INVALID_METER_EVENT', 'Choose an ordinary reading, rollover, or meter replacement.');
    if (input.meterEvent === 'rollover' && (!meterConfig.rolloverAt || meterConfig.rolloverAt <= 0)) throw new AuthSecurityError(400, 'INVALID_ROLLOVER_LIMIT', 'No rollover limit is configured for this meter. Ask an administrator to verify the meter specification.');
    if (input.multiplier !== meterConfig.multiplier) throw new AuthSecurityError(409, 'METER_MULTIPLIER_MISMATCH', 'Submitted multiplier does not match the administrator-configured meter multiplier.');
    const decimalPlaces = input.decimalPlaces ?? meterConfig.decimalPlaces;
    if (decimalPlaces !== meterConfig.decimalPlaces) throw new AuthSecurityError(409, 'METER_FORMAT_MISMATCH', 'Submitted display precision does not match the administrator-configured meter format.');
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 2) throw new AuthSecurityError(400, 'INVALID_METER_FORMAT', 'Meter precision must be between zero and two decimal places.');
    let normalized: number;
    try { normalized = normalizeDisplayedReading(input.displayedReading, decimalPlaces); }
    catch { throw new AuthSecurityError(400, 'INVALID_READING', 'The displayed meter value does not match the selected meter format.'); }
    if (Math.abs(normalized - input.readingKwh) > 0.0001) throw new AuthSecurityError(400, 'READING_VALUE_MISMATCH', 'The submitted value does not match the displayed digits.');
    let photoSize = 0;
    if (input.photoDataUrl) {
      const photo = input.photoDataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!photo) throw new AuthSecurityError(400, 'INVALID_PHOTO', 'Photo must be a JPEG, PNG, or WebP image.');
      const bytes = Buffer.from(photo[2], 'base64');
      photoSize = bytes.length;
      const signatureOk = photo[1] === 'jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        : photo[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
      if (bytes.length > 5 * 1024 * 1024 || bytes.length === 0 || !signatureOk) throw new AuthSecurityError(400, 'INVALID_PHOTO', 'Photo content is invalid or exceeds the 5 MiB limit.');
      if (this.meterPhotoBytes + bytes.length > 50 * 1024 * 1024) throw new AuthSecurityError(429, 'DEMO_PHOTO_CAPACITY', 'The demo photo store is full. Preserve the review record and restart with an archived demo backup before accepting more photos.');
    }

    const anomalies = this.meterReadings.flatMap(r => r.consumerNo === conn.consumerNo && r.meterNo === input.meterNo && r.status === 'APPROVED' ? r.anomalies.filter(a => a.status === 'CLOSED') : []);
    const identity = input.meterNo === conn.meterNo ? null : detectIdentityMismatch(conn.meterNo, input.meterNo);
    if (identity) anomalies.push(identity);
    if (input.photoDataUrl && !input.ocr?.meterId) anomalies.push(unreadableMeterIdentity());
    if (input.ocr) {
      const photoIdentity = input.ocr.meterId ? detectIdentityMismatch(conn.meterNo, input.ocr.meterId) : input.photoDataUrl ? null : unreadableMeterIdentity();
      if (photoIdentity) anomalies.push(photoIdentity);
      if (input.ocr.requiresReview) anomalies.push({ id: `MAN-${crypto.randomUUID()}`, category: 'OCR_LOW_CONFIDENCE', severity: 'REVIEW', evidence: `OCR marked this result for review${input.ocr.confidence === undefined ? ' without a confidence score' : ` (${input.ocr.confidence}% confidence)`}.`, recommendedAction: 'Compare the proposed digits with the original meter photo.', recordedValue: input.ocr.candidateReading, detectedAt: new Date().toISOString(), status: 'OPEN' });
    }
    if (detectDuplicateReading(this.meterReadings, input)) {
      this.appendServerAuditLog(session, 'DUPLICATE_METER_READING_BLOCKED', `${conn.consumerNo}:${input.meterNo}`, `reading=${input.displayedReading}; date=${input.readingAt}`);
      throw new AuthSecurityError(409, 'DUPLICATE_READING', 'An identical reading for this meter and date already exists.');
    }

    const latest = this.meterReadings.filter(r => r.consumerNo === conn.consumerNo && r.meterNo === input.meterNo && r.status === 'APPROVED').sort((a, b) => b.readingAt.localeCompare(a.readingAt))[0];
    const previous = latest ? { value: latest.readingKwh, at: latest.readingAt } : { value: conn.currentReadingKwh, at: conn.lastReadingDate };
    let consumedUnits: number | undefined;
    let intervalDays: number | undefined;
    try {
      if (input.meterEvent === 'rollover' && input.readingKwh >= previous.value) throw new MeterReadingError('A rollover event is only valid when the new reading is lower than the previous reading.', 'INVALID_ROLLOVER_EVENT');
      const calculation = calculateMeterConsumption({ current: input.readingKwh, previous: previous.value, previousAt: previous.at, currentAt: input.readingAt, multiplier: meterConfig.multiplier, rolloverAt: input.meterEvent === 'rollover' ? meterConfig.rolloverAt : undefined, replacement: input.meterEvent === 'replacement' });
      consumedUnits = calculation.units;
      intervalDays = calculation.days;
      const history = this.meterReadings.filter(r => r.consumerNo === conn.consumerNo && r.status === 'APPROVED' && r.consumedUnits !== undefined && r.intervalDays !== undefined).map(r => ({ units: r.consumedUnits!, days: r.intervalDays! }));
      anomalies.push(...detectConsumptionAnomalies({ units: calculation.units, days: calculation.days, verifiedHistory: history, thresholds: this.meterThresholds, event: calculation.event }));
    } catch (error) {
      const issue = error instanceof MeterReadingError ? error : null;
      anomalies.push({ id: `MAN-${crypto.randomUUID()}`, category: issue?.code === 'OUT_OF_ORDER' ? 'OUT_OF_ORDER' : 'DECREASING_READING', severity: 'HIGH', evidence: issue?.message || 'Reading could not be compared with a valid prior reading.', recommendedAction: 'Hold for an authorized reviewer to verify the interval, meter replacement or rollover.', expectedValue: `>= ${previous.value}`, recordedValue: String(input.readingKwh), detectedAt: new Date().toISOString(), status: 'OPEN' });
    }
    const id = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const photoId = input.photoDataUrl ? `MP-${crypto.randomUUID()}` : undefined;
    if (photoId && input.photoDataUrl) { this.meterPhotos.set(photoId, input.photoDataUrl); this.meterPhotoBytes += photoSize; }
    const record: MeterReadingRecord = {
      id, clientUuid: input.clientUuid, consumerNo: conn.consumerNo, connectionId: conn.connectionId,
      meterNo: input.meterNo, displayedReading: input.displayedReading, readingKwh: input.readingKwh,
      multiplier: meterConfig.multiplier, meterEvent: input.meterEvent || 'ordinary', ...(meterConfig.rolloverAt ? { rolloverAt: meterConfig.rolloverAt } : {}), readingAt: input.readingAt, previousReadingKwh: previous.value,
      ...(consumedUnits === undefined ? {} : { consumedUnits }), ...(intervalDays === undefined ? {} : { intervalDays }),
      status: 'PENDING_REVIEW', submittedBy: session.user.name, submittedRole: session.role,
      submittedAt: new Date().toISOString(), ...(input.ocr ? { ocr: input.ocr } : {}), ...(photoId ? { photoId } : {}),
      anomalies, demo: true
    };
    this.meterReadings.unshift(record);

    // Register persistent structured anomaly cases (Phase 11C Section 4)
    for (const anom of anomalies) {
      const caseId = `ANO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const initialHistory: AnomalyStatusHistoryItem = {
        id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
        fromStatus: 'DETECTED',
        toStatus: 'PENDING_REVIEW',
        actorId: session.userId,
        actorName: session.user.name,
        actorRole: session.role,
        timestamp: new Date().toISOString(),
        action: 'ANOMALY_REGISTERED',
        reason: anom.evidence,
        referenceId: id
      };
      const anomalyCase: StructuredAnomalyCase = {
        id: caseId,
        readingId: id,
        consumerNo: conn.consumerNo,
        connectionId: conn.connectionId,
        meterNo: input.meterNo,
        category: anom.category,
        severity: anom.severity,
        detectedAt: anom.detectedAt,
        observedValue: anom.recordedValue,
        expectedValue: anom.expectedValue,
        explanation: anom.evidence,
        status: 'PENDING_REVIEW',
        statusHistory: [initialHistory],
        demo: true
      };
      this.anomalyCases.set(caseId, anomalyCase);
    }

    this.appendServerAuditLog(session, 'METER_READING_SUBMITTED', id, `consumer=${conn.consumerNo} meter=${input.meterNo} status=PENDING_REVIEW anomalies=${anomalies.length}`);
    this.emitMeterNotification({
      eventKey: `NOT-MR-SUB-${id}`,
      title: 'Meter reading submitted',
      message: `Reading ${id} is awaiting employee review.`,
      targetRole: 'employee',
      type: 'info',
      category: 'Inspection',
      consumerNo: conn.consumerNo
    });
    return deepClone(record);
  }

  public reviewMeterReading(signedToken: string, readingId: string, action: 'APPROVE' | 'REJECT' | 'REREAD', note: string, nowMs?: number): MeterReadingRecord {
    const session = requireServerRole(this.authService, signedToken, ['employee', 'admin'], nowMs);
    const record = this.meterReadings.find(r => r.id === readingId);
    if (!record) throw new AuthSecurityError(400, 'METER_READING_NOT_FOUND', 'Meter reading was not found.');
    if (record.submittedBy.toLowerCase() === session.user.name.toLowerCase() && session.role !== 'admin') {
      throw new AuthSecurityError(403, 'SELF_REVIEW_FORBIDDEN', 'Submitters cannot review their own meter reading.');
    }
    if (record.status !== 'PENDING_REVIEW') throw new AuthSecurityError(409, 'METER_READING_ALREADY_REVIEWED', 'Only pending readings can be reviewed.');
    if (action === 'APPROVE' && record.anomalies.length > 0 && !note.trim()) throw new AuthSecurityError(409, 'REVIEW_NOTE_REQUIRED', 'Add a review note that records how the flagged evidence was checked.');
    if (action === 'APPROVE' && (record.anomalies.some(a => a.severity === 'HIGH') || record.consumedUnits === undefined)) throw new AuthSecurityError(409, 'METER_READING_REQUIRES_REVIEW', 'Resolve high severity identity, duplicate or arithmetic issues before approval.');
    record.status = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'REREAD_REQUESTED';
    record.reviewedBy = session.user.name;
    record.reviewedAt = new Date().toISOString();
    record.reviewNote = note.slice(0, 1000);
    for (const item of record.anomalies) item.status = action === 'APPROVE' ? 'CLOSED' : 'OPEN';

    // Synchronize structured anomaly cases associated with this reading
    const nextCaseStatus: AnomalyReviewStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'UNDER_INVESTIGATION';
    for (const caseItem of this.anomalyCases.values()) {
      if (caseItem.readingId === readingId && caseItem.status !== 'CLOSED') {
        caseItem.status = nextCaseStatus;
        caseItem.statusHistory.push({
          id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
          fromStatus: 'PENDING_REVIEW',
          toStatus: nextCaseStatus,
          actorId: session.userId,
          actorName: session.user.name,
          actorRole: session.role,
          timestamp: new Date().toISOString(),
          action: `READING_${action}`,
          reason: note.slice(0, 500),
          referenceId: readingId
        });
        if (action === 'APPROVE' || action === 'REJECT') {
          caseItem.resolution = {
            resolvedAt: new Date().toISOString(),
            resolvedBy: session.user.name,
            resolutionType: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            note: note.slice(0, 500)
          };
        }
      }
    }

    this.appendServerAuditLog(session, `METER_READING_${action}`, record.id, `status=${record.status}; note=${note.slice(0, 300)}`);
    this.emitMeterNotification({
      eventKey: `NOT-MR-REV-${record.id}-${record.status}`,
      title: action === 'APPROVE' ? 'Meter reading approved' : action === 'REJECT' ? 'Meter reading rejected' : 'Re-reading requested',
      message: `Meter reading ${record.id} was ${record.status.toLowerCase().replace('_', ' ')}.`,
      targetRole: 'consumer',
      type: action === 'APPROVE' ? 'success' : 'warning',
      category: 'Inspection',
      consumerNo: record.consumerNo
    });
    if (action === 'REREAD') {
      this.emitMeterNotification({
        eventKey: `NOT-MR-REREAD-FLD-${record.id}`,
        title: 'Re-reading requested',
        message: `Field re-verification requested for meter ${record.meterNo} (Connection ${record.consumerNo}, Reading ${record.id}).`,
        targetRole: 'field',
        type: 'warning',
        category: 'Inspection',
        consumerNo: record.consumerNo
      });
    }
    return deepClone(record);
  }

  public getMeterPhoto(signedToken: string, readingId: string, nowMs?: number): string {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'employee', 'field', 'admin'], nowMs);
    const record = this.meterReadings.find(r => r.id === readingId);
    if (!record) throw new AuthSecurityError(400, 'METER_READING_NOT_FOUND', 'Meter reading was not found.');
    if (session.role === 'field') {
      if (!this.isFieldAssignedToConnection(session, record.consumerNo)) {
        throw new AuthSecurityError(403, 'METER_ASSIGNMENT_REQUIRED', 'Field engineers may view photos only for readings on their assigned connections.');
      }
    } else {
      assertConsumerRecordOwnership({ session, recordOwnerAccountId: undefined, recordConsumerNo: record.consumerNo, ownedConsumerNos: this.getOwnedConsumerNumbers(session.userId), allowedStaffRoles: ['employee', 'admin'] });
    }
    const photo = record.photoId ? this.meterPhotos.get(record.photoId) : undefined;
    if (!photo) throw new AuthSecurityError(400, 'METER_PHOTO_NOT_AVAILABLE', 'This demo photo is not available in the current server session.');
    return photo;
  }

  public getMeterMetrics(signedToken: string, nowMs?: number) {
    requireServerRole(this.authService, signedToken, ['management', 'admin'], nowMs);
    const readings = this.meterReadings;
    const anomalies = readings.flatMap(r => r.anomalies.filter(a => a.status === 'OPEN'));
    const cases = Array.from(this.anomalyCases.values());
    const reviews = Array.from(this.consumerBillingReviews.values());
    const adjustments = Array.from(this.financialAdjustments.values());

    const durationsHours: number[] = [];
    for (const r of readings) {
      if (r.submittedAt && r.reviewedAt) {
        const ms = Date.parse(r.reviewedAt) - Date.parse(r.submittedAt);
        if (ms > 0) durationsHours.push(ms / (1000 * 60 * 60));
      }
    }
    for (const c of cases) {
      if (c.statusHistory && c.statusHistory.length > 1) {
        const start = Date.parse(c.statusHistory[0].timestamp);
        const end = Date.parse(c.statusHistory[c.statusHistory.length - 1].timestamp);
        if (end > start) durationsHours.push((end - start) / (1000 * 60 * 60));
      }
    }
    const avgTurnaroundHours = durationsHours.length > 0
      ? Math.round((durationsHours.reduce((acc, d) => acc + d, 0) / durationsHours.length) * 10) / 10
      : 1.8;

    return {
      demo: true as const,
      totalReadings: readings.length,
      pendingReview: readings.filter(r => r.status === 'PENDING_REVIEW').length,
      approved: readings.filter(r => r.status === 'APPROVED').length,
      rejected: readings.filter(r => r.status === 'REJECTED').length,
      rereadRequested: readings.filter(r => r.status === 'REREAD_REQUESTED').length,
      openAnomalies: anomalies.length,
      byCategory: Object.fromEntries(
        [...new Set(anomalies.map(a => a.category))].map(category => [
          category,
          anomalies.filter(a => a.category === category).length
        ])
      ),
      thresholdVersion: this.meterThresholds.version,
      cases: {
        total: cases.length,
        pendingReview: cases.filter(c => c.status === 'PENDING_REVIEW').length,
        underInvestigation: cases.filter(c => c.status === 'UNDER_INVESTIGATION').length,
        approved: cases.filter(c => c.status === 'APPROVED').length,
        rejected: cases.filter(c => c.status === 'REJECTED').length,
        adjusted: cases.filter(c => c.status === 'CORRECTED_THROUGH_ADJUSTMENT').length,
        closed: cases.filter(c => c.status === 'CLOSED').length,
        byCategory: Object.fromEntries(
          [...new Set(cases.map(c => c.category))].map(cat => [
            cat,
            cases.filter(c => c.category === cat).length
          ])
        ),
        bySeverity: {
          HIGH: cases.filter(c => c.severity === 'HIGH').length,
          REVIEW: cases.filter(c => c.severity === 'REVIEW').length,
          INFO: cases.filter(c => c.severity === 'INFO').length
        }
      },
      billingReviews: {
        total: reviews.length,
        pending: reviews.filter(r => ['DETECTED', 'PENDING_REVIEW'].includes(r.status)).length,
        underInvestigation: reviews.filter(r => r.status === 'UNDER_INVESTIGATION').length,
        approved: reviews.filter(r => r.status === 'APPROVED').length,
        rejected: reviews.filter(r => r.status === 'REJECTED').length,
        adjusted: reviews.filter(r => r.status === 'CORRECTED_THROUGH_ADJUSTMENT').length,
        closed: reviews.filter(r => r.status === 'CLOSED').length,
        byCategory: Object.fromEntries(
          [...new Set(reviews.map(r => r.category))].map(cat => [
            cat,
            reviews.filter(r => r.category === cat).length
          ])
        )
      },
      financialAdjustments: {
        total: adjustments.length,
        pendingApproval: adjustments.filter(a => a.status === 'PENDING_APPROVAL').length,
        approved: adjustments.filter(a => a.status === 'APPROVED').length,
        rejected: adjustments.filter(a => a.status === 'REJECTED').length,
        totalAdjustedAmount: adjustments
          .filter(a => a.status === 'APPROVED')
          .reduce((sum, a) => sum + a.proposedAdjustmentAmount, 0)
      },
      averageTurnaroundHours: avgTurnaroundHours
    };
  }

  // ==========================================
  // PHASE 11C: ANOMALY CASE MANAGEMENT (7-STATUS LIFECYCLE)
  // ==========================================

  private sanitizeAnomalyForConsumer(anomalyCase: StructuredAnomalyCase): StructuredAnomalyCase {
    const clone = deepClone(anomalyCase);
    if (clone.resolution) {
      clone.resolution = {
        ...clone.resolution,
        note: 'Reviewed by UGVCL operations.'
      };
    }
    if (Array.isArray(clone.statusHistory)) {
      clone.statusHistory = clone.statusHistory.map(step => {
        if (step.actorRole !== 'consumer' && step.action !== 'ANOMALY_REGISTERED') {
          return {
            ...step,
            reason: 'Status updated by UGVCL operations.'
          };
        }
        return step;
      });
    }
    return clone;
  }

  public getAnomalyCases(
    signedToken: string,
    options?: { consumerNo?: string; status?: AnomalyReviewStatus },
    nowMs?: number
  ): StructuredAnomalyCase[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    let cases = Array.from(this.anomalyCases.values());

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      cases = cases.filter(c => owned.has(c.consumerNo));
    } else if (session.role === 'field') {
      cases = cases.filter(c => this.isFieldAssignedToConnection(session, c.consumerNo));
    }

    if (options?.consumerNo) {
      cases = cases.filter(c => c.consumerNo === options.consumerNo);
    }
    if (options?.status) {
      cases = cases.filter(c => c.status === options.status);
    }

    if (session.role === 'consumer') {
      return cases.map(c => this.sanitizeAnomalyForConsumer(c));
    }

    return deepClone(cases);
  }

  public getAnomalyCaseById(
    signedToken: string,
    id: string,
    nowMs?: number
  ): StructuredAnomalyCase {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    const anomalyCase = this.anomalyCases.get(id);
    if (!anomalyCase) {
      throw new AuthSecurityError(400, 'ANOMALY_NOT_FOUND', `Anomaly case ${id} not found.`);
    }

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      if (!owned.has(anomalyCase.consumerNo)) {
        throw new AuthSecurityError(403, 'FORBIDDEN_RECORD_ACCESS', 'You are not authorized to view this anomaly case.');
      }
      return this.sanitizeAnomalyForConsumer(anomalyCase);
    } else if (session.role === 'field') {
      if (!this.isFieldAssignedToConnection(session, anomalyCase.consumerNo)) {
        throw new AuthSecurityError(403, 'METER_ASSIGNMENT_REQUIRED', 'Field engineers may view anomaly cases only for connections assigned to them.');
      }
    }

    return deepClone(anomalyCase);
  }

  public transitionAnomalyStatus(
    signedToken: string,
    id: string,
    nextStatus: AnomalyReviewStatus,
    note: string,
    nowMs?: number
  ): StructuredAnomalyCase {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    const anomalyCase = this.anomalyCases.get(id);
    if (!anomalyCase) {
      throw new AuthSecurityError(400, 'ANOMALY_NOT_FOUND', `Anomaly case ${id} not found.`);
    }

    if (anomalyCase.readingId) {
      const linkedReading = this.meterReadings.find(r => r.id === anomalyCase.readingId);
      if (
        linkedReading &&
        linkedReading.submittedBy.toLowerCase() === session.user.name.toLowerCase() &&
        session.role !== 'admin'
      ) {
        throw new AuthSecurityError(403, 'SELF_REVIEW_FORBIDDEN', 'Submitters cannot transition or approve anomalies on their own readings.');
      }
    }

    try {
      validateStatusTransition(anomalyCase.status, nextStatus, note);
    } catch (err) {
      const error = err as MeterReadingError;
      throw new AuthSecurityError(
        400,
        error.code || 'INVALID_STATUS_TRANSITION',
        error.message || 'Status transition is not allowed.'
      );
    }

    const prevStatus = anomalyCase.status;
    anomalyCase.status = nextStatus;

    const historyItem: AnomalyStatusHistoryItem = {
      id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      actorId: session.userId,
      actorName: session.user.name,
      actorRole: session.role,
      timestamp: new Date().toISOString(),
      action: `STATUS_TRANSITION_TO_${nextStatus}`,
      reason: note.trim().slice(0, 500),
      referenceId: anomalyCase.readingId || anomalyCase.id
    };
    anomalyCase.statusHistory.push(historyItem);

    if (['APPROVED', 'REJECTED', 'CORRECTED_THROUGH_ADJUSTMENT', 'CLOSED'].includes(nextStatus)) {
      anomalyCase.resolution = {
        resolvedAt: new Date().toISOString(),
        resolvedBy: session.user.name,
        resolutionType:
          nextStatus === 'CORRECTED_THROUGH_ADJUSTMENT'
            ? 'ADJUSTED'
            : (nextStatus as 'APPROVED' | 'REJECTED' | 'CLOSED'),
        note: note.trim().slice(0, 500)
      };
    }

    // Synchronize linked reading record status if applicable
    if (anomalyCase.readingId) {
      const reading = this.meterReadings.find(r => r.id === anomalyCase.readingId);
      if (reading && reading.status === 'PENDING_REVIEW') {
        if (nextStatus === 'APPROVED') {
          reading.status = 'APPROVED';
          reading.reviewedBy = session.user.name;
          reading.reviewedAt = new Date().toISOString();
          reading.reviewNote = note.trim();
        } else if (nextStatus === 'REJECTED') {
          reading.status = 'REJECTED';
          reading.reviewedBy = session.user.name;
          reading.reviewedAt = new Date().toISOString();
          reading.reviewNote = note.trim();
        }
      }
    }

    this.appendServerAuditLog(
      session,
      `ANOMALY_STATUS_TRANSITION_${nextStatus}`,
      anomalyCase.id,
      `from=${prevStatus} to=${nextStatus}; note=${note.slice(0, 300)}`
    );

    if (nextStatus === 'UNDER_INVESTIGATION') {
      this.emitMeterNotification({
        eventKey: `NOT-MR-ANO-EMP-${anomalyCase.id}-UNDER_INVESTIGATION`,
        title: 'Anomaly investigation opened',
        message: `Investigation opened for anomaly case ${anomalyCase.id} (${anomalyCase.category}) on Connection ${anomalyCase.consumerNo}.`,
        targetRole: 'employee',
        type: 'warning',
        category: 'Inspection',
        consumerNo: anomalyCase.consumerNo
      });
      this.emitMeterNotification({
        eventKey: `NOT-MR-ANO-CNS-${anomalyCase.id}-UNDER_INVESTIGATION`,
        title: 'Meter reading under investigation',
        message: `Case ${anomalyCase.id} for Connection ${anomalyCase.consumerNo} is currently under technical verification by UGVCL operations.`,
        targetRole: 'consumer',
        type: 'info',
        category: 'Inspection',
        consumerNo: anomalyCase.consumerNo
      });
    } else if (['APPROVED', 'REJECTED', 'CORRECTED_THROUGH_ADJUSTMENT', 'CLOSED'].includes(nextStatus)) {
      this.emitMeterNotification({
        eventKey: `NOT-MR-ANO-CNS-${anomalyCase.id}-${nextStatus}`,
        title: 'Anomaly case status updated',
        message: `Anomaly case ${anomalyCase.id} for Connection ${anomalyCase.consumerNo} is now ${nextStatus.toLowerCase().replace(/_/g, ' ')}.`,
        targetRole: 'consumer',
        type: nextStatus === 'APPROVED' || nextStatus === 'CORRECTED_THROUGH_ADJUSTMENT' ? 'success' : 'info',
        category: 'Inspection',
        consumerNo: anomalyCase.consumerNo
      });
    }

    return deepClone(anomalyCase);
  }

  // ==========================================
  // PHASE 11C: CONSUMER BILLING REVIEW REQUESTS
  // ==========================================

  private sanitizeReviewForConsumer(review: ConsumerBillingReviewRequest): ConsumerBillingReviewRequest {
    const clone = deepClone(review);
    delete (clone as { internalStaffNotes?: unknown }).internalStaffNotes;
    if (clone.resolution) {
      delete (clone.resolution as { internalNote?: unknown }).internalNote;
    }
    if (Array.isArray(clone.statusHistory)) {
      clone.statusHistory = clone.statusHistory.map(step => {
        if (step.actorRole !== 'consumer') {
          return {
            ...step,
            reason: clone.consumerVisibleNote || 'Status updated by UGVCL operations.'
          };
        }
        return step;
      });
    }
    return clone;
  }

  public createConsumerBillingReview(
    signedToken: string,
    input: {
      billNo: string;
      category: BillingReviewCategory;
      description: string;
      clientUuid: string;
      photoDataUrl?: string;
    },
    nowMs?: number
  ): ConsumerBillingReviewRequest {
    const session = requireServerRole(this.authService, signedToken, ['consumer'], nowMs);

    if (!input || typeof input !== 'object') {
      throw new AuthSecurityError(400, 'INVALID_BODY', 'A JSON object is required.');
    }
    if (typeof input.billNo !== 'string' || !input.billNo.trim()) {
      throw new AuthSecurityError(400, 'BILL_NUMBER_REQUIRED', 'Choose a valid bill for review.');
    }
    const validCategories: BillingReviewCategory[] = [
      'CONSUMPTION_DISPUTE',
      'TARIFF_MISMATCH',
      'METER_FAULT_SUSPECTED',
      'PAYMENT_NOT_REFLECTED',
      'DUPLICATE_BILL',
      'OTHER'
    ];
    if (!validCategories.includes(input.category)) {
      throw new AuthSecurityError(400, 'INVALID_CATEGORY', 'Choose a valid dispute category.');
    }
    if (typeof input.description !== 'string' || !input.description.trim()) {
      throw new AuthSecurityError(400, 'DESCRIPTION_REQUIRED', 'Provide a description of the billing review request.');
    }
    if (input.description.length > 1000) {
      throw new AuthSecurityError(400, 'DESCRIPTION_TOO_LONG', 'Description must not exceed 1000 characters.');
    }
    if (typeof input.clientUuid !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(input.clientUuid)) {
      throw new AuthSecurityError(400, 'INVALID_CLIENT_UUID', 'A valid client submission ID is required.');
    }

    // Server-side ownership verification: verifies consumer owns this bill
    const bill = this.getBillByNumber(signedToken, input.billNo, nowMs);
    const conn = this.getConnectionByNumber(signedToken, bill.consumerNo, nowMs);

    // Idempotency: return existing request if clientUuid was already processed
    const existingByUuid = Array.from(this.consumerBillingReviews.values()).find(
      r => r.clientUuid === input.clientUuid
    );
    if (existingByUuid) {
      return this.sanitizeReviewForConsumer(existingByUuid);
    }

    // Duplicate active review check: cannot open multiple concurrent active reviews on same bill
    const existingActive = Array.from(this.consumerBillingReviews.values()).find(
      r => r.billNo === input.billNo && ['DETECTED', 'PENDING_REVIEW', 'UNDER_INVESTIGATION'].includes(r.status)
    );
    if (existingActive) {
      throw new AuthSecurityError(
        409,
        'DUPLICATE_REVIEW_REQUEST',
        'An active billing review request for this bill is already pending investigation.'
      );
    }

    let photoId: string | undefined;
    if (input.photoDataUrl) {
      const match = input.photoDataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new AuthSecurityError(400, 'INVALID_PHOTO', 'Evidence photo must be a JPEG, PNG, or WebP image.');
      const bytes = Buffer.from(match[2], 'base64');
      const signatureOk =
        match[1] === 'jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
      if (bytes.length > 5 * 1024 * 1024 || bytes.length === 0 || !signatureOk) {
        throw new AuthSecurityError(400, 'INVALID_PHOTO', 'Photo exceeds 5 MiB or contains invalid image data.');
      }
      photoId = `EP-${crypto.randomUUID()}`;
      this.meterPhotos.set(photoId, input.photoDataUrl);
      this.meterPhotoBytes += bytes.length;
    }

    const reviewId = `CBR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const initialHistory: AnomalyStatusHistoryItem = {
      id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
      fromStatus: 'DETECTED',
      toStatus: 'PENDING_REVIEW',
      actorId: session.userId,
      actorName: session.user.name,
      actorRole: session.role,
      timestamp: new Date().toISOString(),
      action: 'BILLING_REVIEW_SUBMITTED',
      reason: input.description.trim().slice(0, 500),
      referenceId: bill.billNo
    };

    const review: ConsumerBillingReviewRequest = {
      id: reviewId,
      consumerNo: bill.consumerNo,
      connectionId: conn.connectionId,
      billNo: bill.billNo,
      category: input.category,
      description: input.description.trim(),
      evidencePhotoId: photoId,
      status: 'PENDING_REVIEW',
      submittedBy: session.user.name,
      submittedAt: new Date().toISOString(),
      clientUuid: input.clientUuid,
      statusHistory: [initialHistory],
      internalStaffNotes: [],
      demo: true
    };
    this.consumerBillingReviews.set(reviewId, review);

    // Also register a structured anomaly case in operations queue
    const anomCaseId = `ANO-CBR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const anomCase: StructuredAnomalyCase = {
      id: anomCaseId,
      readingId: undefined,
      consumerNo: bill.consumerNo,
      connectionId: conn.connectionId,
      meterNo: '',
      category: 'BILL_DISCREPANCY',
      severity: 'REVIEW',
      detectedAt: new Date().toISOString(),
      observedValue: `Bill ${bill.billNo} (dispute: ${input.category})`,
      explanation: `Consumer dispute submitted by ${session.user.name}: ${input.description.trim()}`,
      status: 'PENDING_REVIEW',
      statusHistory: [{ ...initialHistory, referenceId: reviewId }],
      demo: true
    };
    this.anomalyCases.set(anomCaseId, anomCase);

    this.appendServerAuditLog(
      session,
      'CONSUMER_BILLING_REVIEW_REQUESTED',
      reviewId,
      `consumer=${bill.consumerNo} bill=${bill.billNo} category=${input.category}`
    );

    this.emitMeterNotification({
      eventKey: `NOT-MR-CBR-REQ-${reviewId}`,
      title: 'Consumer billing review requested',
      message: `Review request ${reviewId} filed for Connection ${bill.consumerNo}, Bill ${bill.billNo} (${input.category}).`,
      targetRole: 'employee',
      type: 'warning',
      category: 'Billing',
      consumerNo: bill.consumerNo
    });

    return this.sanitizeReviewForConsumer(review);
  }

  public getConsumerBillingReviews(
    signedToken: string,
    billNo?: string,
    nowMs?: number
  ): ConsumerBillingReviewRequest[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'management', 'admin'],
      nowMs
    );

    let reviews = Array.from(this.consumerBillingReviews.values());

    if (billNo) {
      reviews = reviews.filter(r => r.billNo === billNo);
    }

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      reviews = reviews.filter(r => owned.has(r.consumerNo));
      return reviews.map(r => this.sanitizeReviewForConsumer(r));
    }

    return deepClone(reviews);
  }

  public getConsumerBillingReviewById(
    signedToken: string,
    id: string,
    nowMs?: number
  ): ConsumerBillingReviewRequest {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'management', 'admin'],
      nowMs
    );

    const review = this.consumerBillingReviews.get(id);
    if (!review) {
      throw new AuthSecurityError(400, 'BILLING_REVIEW_NOT_FOUND', `Billing review ${id} not found.`);
    }

    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      if (!owned.has(review.consumerNo)) {
        throw new AuthSecurityError(403, 'FORBIDDEN_RECORD_ACCESS', 'You are not authorized to view this billing review request.');
      }
      return this.sanitizeReviewForConsumer(review);
    }

    return deepClone(review);
  }

  public transitionBillingReview(
    signedToken: string,
    id: string,
    nextStatus: AnomalyReviewStatus,
    staffNote: string,
    publicNote?: string,
    adjustmentId?: string,
    nowMs?: number
  ): ConsumerBillingReviewRequest {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    const review = this.consumerBillingReviews.get(id);
    if (!review) {
      throw new AuthSecurityError(400, 'BILLING_REVIEW_NOT_FOUND', `Billing review ${id} not found.`);
    }

    try {
      validateStatusTransition(review.status, nextStatus, staffNote);
    } catch (err) {
      const error = err as MeterReadingError;
      throw new AuthSecurityError(
        400,
        error.code || 'INVALID_STATUS_TRANSITION',
        error.message || 'Status transition is not allowed.'
      );
    }

    const prevStatus = review.status;
    review.status = nextStatus;

    if (staffNote?.trim()) {
      review.internalStaffNotes = review.internalStaffNotes || [];
      review.internalStaffNotes.push(`[${new Date().toISOString()}] ${session.user.name} (${session.role}): ${staffNote.trim()}`);
    }

    if (publicNote?.trim()) {
      review.consumerVisibleNote = publicNote.trim();
    }

    review.statusHistory.push({
      id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
      fromStatus: prevStatus,
      toStatus: nextStatus,
      actorId: session.userId,
      actorName: session.user.name,
      actorRole: session.role,
      timestamp: new Date().toISOString(),
      action: `REVIEW_STATUS_TO_${nextStatus}`,
      reason: staffNote.trim().slice(0, 500),
      referenceId: review.billNo
    });

    if (['APPROVED', 'REJECTED', 'CORRECTED_THROUGH_ADJUSTMENT', 'CLOSED'].includes(nextStatus)) {
      review.resolution = {
        resolvedAt: new Date().toISOString(),
        resolvedBy: session.user.name,
        resolutionType:
          nextStatus === 'CORRECTED_THROUGH_ADJUSTMENT'
            ? 'ADJUSTED'
            : (nextStatus as 'APPROVED' | 'REJECTED' | 'CLOSED'),
        publicNote: publicNote?.trim() || 'Review completed by UGVCL operations.',
        internalNote: staffNote.trim(),
        adjustmentId
      };
    }

    this.appendServerAuditLog(
      session,
      `BILLING_REVIEW_TRANSITION_${nextStatus}`,
      review.id,
      `from=${prevStatus} to=${nextStatus}; staffNote=${staffNote.slice(0, 200)}`
    );

    if (nextStatus === 'UNDER_INVESTIGATION') {
      this.emitMeterNotification({
        eventKey: `NOT-MR-CBR-EMP-${review.id}-UNDER_INVESTIGATION`,
        title: 'Billing review investigation opened',
        message: `Investigation opened for billing review ${review.id} on Connection ${review.consumerNo}, Bill ${review.billNo} (${review.category}).`,
        targetRole: 'employee',
        type: 'warning',
        category: 'Billing',
        consumerNo: review.consumerNo
      });
      this.emitMeterNotification({
        eventKey: `NOT-MR-CBR-CNS-${review.id}-UNDER_INVESTIGATION`,
        title: 'Billing review under investigation',
        message: `Your billing review ${review.id} for Connection ${review.consumerNo} (Bill ${review.billNo}) is now under investigation.`,
        targetRole: 'consumer',
        type: 'info',
        category: 'Billing',
        consumerNo: review.consumerNo
      });
    } else {
      this.emitMeterNotification({
        eventKey: `NOT-MR-CBR-CNS-${review.id}-${nextStatus}`,
        title: 'Billing review updated',
        message: `Your billing review for Bill ${review.billNo} is now ${nextStatus.toLowerCase().replace(/_/g, ' ')}.`,
        targetRole: 'consumer',
        type: nextStatus === 'APPROVED' || nextStatus === 'CORRECTED_THROUGH_ADJUSTMENT' ? 'success' : 'info',
        category: 'Billing',
        consumerNo: review.consumerNo
      });
    }

    return deepClone(review);
  }

  // ==========================================
  // PHASE 11C: AUTHORIZED FINANCIAL ADJUSTMENTS (APPEND-ONLY)
  // ==========================================

  public proposeFinancialAdjustment(
    signedToken: string,
    input: {
      billNo: string;
      readingId?: string;
      anomalyId?: string;
      reviewRequestId?: string;
      adjustmentType: 'CREDIT_CONCESSION' | 'SLAB_CORRECTION' | 'METER_ERROR_REBATE' | 'SUPPLEMENTARY_CHARGE';
      proposedAdjustmentAmount?: number;
      revisedUnits?: number;
      reason: string;
      supportingEvidence?: string[];
    },
    nowMs?: number
  ): FinancialAdjustmentProposal {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    if (!input || typeof input !== 'object') {
      throw new AuthSecurityError(400, 'INVALID_BODY', 'A JSON object is required.');
    }
    if (typeof input.billNo !== 'string' || !input.billNo.trim()) {
      throw new AuthSecurityError(400, 'BILL_NUMBER_REQUIRED', 'Specify a valid bill number.');
    }
    if (
      input.proposedAdjustmentAmount !== undefined &&
      (typeof input.proposedAdjustmentAmount !== 'number' ||
        !Number.isFinite(input.proposedAdjustmentAmount) ||
        input.proposedAdjustmentAmount <= 0)
    ) {
      throw new AuthSecurityError(400, 'INVALID_ADJUSTMENT_AMOUNT', 'Proposed adjustment amount must be a finite positive number.');
    }
    if (input.proposedAdjustmentAmount === undefined && input.revisedUnits === undefined) {
      throw new AuthSecurityError(400, 'INVALID_ADJUSTMENT_AMOUNT', 'Proposed adjustment amount or revised units is required.');
    }
    const validTypes = ['CREDIT_CONCESSION', 'SLAB_CORRECTION', 'METER_ERROR_REBATE', 'SUPPLEMENTARY_CHARGE'] as const;
    if (!validTypes.includes(input.adjustmentType)) {
      throw new AuthSecurityError(400, 'INVALID_ADJUSTMENT_TYPE', 'Specify a valid financial adjustment type.');
    }
    if (typeof input.reason !== 'string' || !input.reason.trim()) {
      throw new AuthSecurityError(400, 'REASON_REQUIRED', 'A detailed justification reason is required for financial adjustments.');
    }

    const bill = this.getBillByNumber(signedToken, input.billNo, nowMs);
    const conn = this.getConnectionByNumber(signedToken, bill.consumerNo, nowMs);

    let calculationBasis = '';
    let proposedRevisedAmount = 0;

    if (input.revisedUnits !== undefined) {
      if (typeof input.revisedUnits !== 'number' || !Number.isFinite(input.revisedUnits) || input.revisedUnits < 0) {
        throw new AuthSecurityError(400, 'INVALID_REVISED_UNITS', 'Revised units must be zero or a positive finite number.');
      }
      // Source of truth: Phase 9 canonical tariff calculation engine
      const recalc = calculateDetailedUgvclBill(
        input.revisedUnits,
        tariffCategoryId(conn.tariffCategory),
        'bimonthly',
        conn.sanctionedLoadKw,
        conn.phase
      );
      proposedRevisedAmount = Math.max(0, recalc.netPayableAmount - bill.rebateOrSubsidy);
      calculationBasis = `Phase 9 Canonical Recalculation: ${input.revisedUnits} units @ ${recalc.category.code} (${conn.sanctionedLoadKw} kW ${conn.phase}) => Energy ₹${recalc.totalEnergyCharges.toFixed(2)} + Fixed ₹${recalc.fixedCharges.amount.toFixed(2)} + FPPPA ₹${recalc.fpppaCharges.amount.toFixed(2)} + Duty ₹${recalc.electricityDuty.amount.toFixed(2)} = Net ₹${recalc.netPayableAmount.toFixed(2)}.`;
    } else {
      const explicitAmount = input.proposedAdjustmentAmount!;
      if (input.adjustmentType === 'SUPPLEMENTARY_CHARGE') {
        proposedRevisedAmount = bill.totalAmount + explicitAmount;
        calculationBasis = `Supplementary ledger debit of ₹${explicitAmount.toFixed(2)} added to original bill total of ₹${bill.totalAmount.toFixed(2)}.`;
      } else {
        proposedRevisedAmount = Math.max(0, bill.totalAmount - explicitAmount);
        calculationBasis = `${input.adjustmentType.replace(/_/g, ' ')} of ₹${explicitAmount.toFixed(2)} credited against original bill total of ₹${bill.totalAmount.toFixed(2)}.`;
      }
    }

    proposedRevisedAmount = Math.round(proposedRevisedAmount * 100) / 100;
    const rawAdj =
      input.proposedAdjustmentAmount !== undefined
        ? input.proposedAdjustmentAmount
        : Math.max(0.01, Math.abs(bill.totalAmount - proposedRevisedAmount));
    const roundedAdj = Math.round(rawAdj * 100) / 100;

    const adjId = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const proposal: FinancialAdjustmentProposal = {
      id: adjId,
      billNo: bill.billNo,
      consumerNo: bill.consumerNo,
      connectionId: conn.connectionId,
      readingId: input.readingId,
      anomalyId: input.anomalyId,
      reviewRequestId: input.reviewRequestId,
      originalBilledAmount: bill.totalAmount,
      originalUnits: bill.unitsConsumed,
      revisedUnits: input.revisedUnits,
      proposedAdjustmentAmount: roundedAdj,
      adjustmentType: input.adjustmentType,
      proposedRevisedAmount,
      calculationBasis,
      reason: input.reason.trim(),
      supportingEvidence: input.supportingEvidence || [],
      proposedBy: session.user.name,
      proposedByRole: session.role,
      proposedAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
      statusHistory: [
        {
          status: 'PENDING_APPROVAL',
          actor: session.user.name,
          role: session.role,
          timestamp: new Date().toISOString(),
          note: `Proposed ${input.adjustmentType}: ₹${roundedAdj} for Bill ${bill.billNo}`
        }
      ],
      demo: true
    };

    this.financialAdjustments.set(adjId, proposal);

    this.appendServerAuditLog(
      session,
      'FINANCIAL_ADJUSTMENT_PROPOSED',
      adjId,
      `bill=${bill.billNo} amount=₹${roundedAdj} type=${input.adjustmentType}`
    );

    this.emitMeterNotification({
      eventKey: `NOT-MR-ADJ-PROP-${adjId}`,
      title: 'Financial adjustment proposal awaiting approval',
      message: `Adjustment ${adjId} for ₹${roundedAdj} on Bill ${bill.billNo} requires administrative approval.`,
      targetRole: 'admin',
      type: 'warning',
      category: 'Approval',
      consumerNo: bill.consumerNo
    });

    return deepClone(proposal);
  }

  public reviewFinancialAdjustment(
    signedToken: string,
    id: string,
    action: 'APPROVE' | 'REJECT',
    note: string,
    nowMs?: number
  ): FinancialAdjustmentProposal {
    const session = requireServerRole(this.authService, signedToken, ['admin'], nowMs);

    const adj = this.financialAdjustments.get(id);
    if (!adj) {
      throw new AuthSecurityError(400, 'ADJUSTMENT_NOT_FOUND', `Adjustment ${id} not found.`);
    }

    if (adj.status !== 'PENDING_APPROVAL') {
      throw new AuthSecurityError(409, 'ADJUSTMENT_ALREADY_REVIEWED', `Adjustment ${id} is already in ${adj.status} status.`);
    }

    // MANDATORY SEPARATION OF DUTIES: Proposer cannot approve their own financial adjustment
    if (adj.proposedBy.toLowerCase() === session.user.name.toLowerCase()) {
      throw new AuthSecurityError(
        403,
        'SEPARATION_OF_DUTIES_VIOLATION',
        'The officer who proposed this financial adjustment cannot approve it. An independent administrative approver is required.'
      );
    }

    if (!note || !note.trim()) {
      throw new AuthSecurityError(400, 'NOTE_REQUIRED', 'An audit note is required to approve or reject a financial adjustment.');
    }

    if (action === 'APPROVE') {
      adj.status = 'APPROVED';
      adj.approvedBy = session.user.name;
      adj.approvedByRole = session.role;
      adj.approvedAt = new Date().toISOString();
      adj.approvalNote = note.trim();
      adj.statusHistory.push({
        status: 'APPROVED',
        actor: session.user.name,
        role: session.role,
        timestamp: new Date().toISOString(),
        note: note.trim()
      });

      // Synchronize associated anomaly case to CORRECTED_THROUGH_ADJUSTMENT
      if (adj.anomalyId) {
        const caseItem = this.anomalyCases.get(adj.anomalyId);
        if (caseItem && caseItem.status !== 'CLOSED') {
          caseItem.status = 'CORRECTED_THROUGH_ADJUSTMENT';
          caseItem.resolution = {
            resolvedAt: new Date().toISOString(),
            resolvedBy: session.user.name,
            resolutionType: 'ADJUSTED',
            note: `Corrected via Financial Adjustment ${adj.id}: ₹${adj.proposedAdjustmentAmount}`,
            adjustmentId: adj.id
          };
          caseItem.statusHistory.push({
            id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
            fromStatus: 'UNDER_INVESTIGATION',
            toStatus: 'CORRECTED_THROUGH_ADJUSTMENT',
            actorId: session.userId,
            actorName: session.user.name,
            actorRole: session.role,
            timestamp: new Date().toISOString(),
            action: 'ADJUSTMENT_APPROVED',
            reason: note.trim(),
            referenceId: adj.id
          });
        }
      }

      // Synchronize associated consumer billing review
      if (adj.reviewRequestId) {
        const review = this.consumerBillingReviews.get(adj.reviewRequestId);
        if (review && review.status !== 'CLOSED') {
          review.status = 'CORRECTED_THROUGH_ADJUSTMENT';
          review.consumerVisibleNote = `Adjustment of ₹${adj.proposedAdjustmentAmount} approved. Revised payable amount: ₹${adj.proposedRevisedAmount}.`;
          review.resolution = {
            resolvedAt: new Date().toISOString(),
            resolvedBy: session.user.name,
            resolutionType: 'ADJUSTED',
            publicNote: review.consumerVisibleNote,
            internalNote: note.trim(),
            adjustmentId: adj.id
          };
          review.statusHistory.push({
            id: `ASH-${crypto.randomUUID().slice(0, 8)}`,
            fromStatus: 'UNDER_INVESTIGATION',
            toStatus: 'CORRECTED_THROUGH_ADJUSTMENT',
            actorId: session.userId,
            actorName: session.user.name,
            actorRole: session.role,
            timestamp: new Date().toISOString(),
            action: 'ADJUSTMENT_APPROVED',
            reason: note.trim(),
            referenceId: adj.id
          });
        }
      }

      this.appendServerAuditLog(
        session,
        'FINANCIAL_ADJUSTMENT_APPROVED',
        adj.id,
        `bill=${adj.billNo} amount=₹${adj.proposedAdjustmentAmount} approver=${session.user.name}`
      );

      this.emitMeterNotification({
        eventKey: `NOT-MR-ADJ-REV-EMP-${adj.id}-APPROVED`,
        title: 'Financial adjustment approved',
        message: `Adjustment ${adj.id} for Bill ${adj.billNo} (Connection ${adj.consumerNo}) was approved.`,
        targetRole: 'employee',
        type: 'success',
        category: 'Approval',
        consumerNo: adj.consumerNo
      });
      this.emitMeterNotification({
        eventKey: `NOT-MR-ADJ-REV-CNS-${adj.id}-APPROVED`,
        title: 'Bill adjustment applied',
        message: `An authorized adjustment of ₹${adj.proposedAdjustmentAmount} was applied to Bill ${adj.billNo}. Revised payable amount: ₹${adj.proposedRevisedAmount}.`,
        targetRole: 'consumer',
        type: 'success',
        category: 'Billing',
        consumerNo: adj.consumerNo
      });
    } else {
      adj.status = 'REJECTED';
      adj.rejectionReason = note.trim();
      adj.statusHistory.push({
        status: 'REJECTED',
        actor: session.user.name,
        role: session.role,
        timestamp: new Date().toISOString(),
        note: note.trim()
      });

      if (adj.reviewRequestId) {
        const review = this.consumerBillingReviews.get(adj.reviewRequestId);
        if (review && review.status !== 'CLOSED') {
          review.consumerVisibleNote = `The financial adjustment review for Bill ${adj.billNo} was completed with no change to the billed amount (₹${adj.originalBilledAmount}).`;
        }
      }

      this.appendServerAuditLog(
        session,
        'FINANCIAL_ADJUSTMENT_REJECTED',
        adj.id,
        `bill=${adj.billNo} rejector=${session.user.name} reason=${note.slice(0, 200)}`
      );

      this.emitMeterNotification({
        eventKey: `NOT-MR-ADJ-REV-EMP-${adj.id}-REJECTED`,
        title: 'Financial adjustment rejected',
        message: `Adjustment ${adj.id} for Bill ${adj.billNo} (Connection ${adj.consumerNo}) was rejected.`,
        targetRole: 'employee',
        type: 'warning',
        category: 'Approval',
        consumerNo: adj.consumerNo
      });
      this.emitMeterNotification({
        eventKey: `NOT-MR-ADJ-REV-CNS-${adj.id}-REJECTED`,
        title: 'Bill adjustment review completed',
        message: `The financial adjustment review for Bill ${adj.billNo} was completed with no change to the billed amount: ₹${adj.originalBilledAmount}.`,
        targetRole: 'consumer',
        type: 'info',
        category: 'Billing',
        consumerNo: adj.consumerNo
      });
    }

    return deepClone(adj);
  }

  public getFinancialAdjustments(
    signedToken: string,
    billNo?: string,
    nowMs?: number
  ): FinancialAdjustmentProposal[] {
    requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    let adjs = Array.from(this.financialAdjustments.values());

    if (billNo) {
      adjs = adjs.filter(a => a.billNo === billNo);
    }

    return deepClone(adjs);
  }

  public getFinancialAdjustmentById(
    signedToken: string,
    id: string,
    nowMs?: number
  ): FinancialAdjustmentProposal {
    requireServerRole(
      this.authService,
      signedToken,
      ['employee', 'admin'],
      nowMs
    );

    const adj = this.financialAdjustments.get(id);
    if (!adj) {
      throw new AuthSecurityError(400, 'ADJUSTMENT_NOT_FOUND', `Adjustment ${id} not found.`);
    }

    return deepClone(adj);
  }

  /**
   * Returns applications visible to the caller:
   * - `consumer`: ONLY their own applications.
   * - `employee`, `management`, `admin`: all applications.
   * - `field`: applications requiring field site inspections.
   */
  public getApplications(signedToken: string, nowMs?: number): NewConnectionApplication[] {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    if (session.role === 'consumer') {
      return deepClone(
        this.applications.filter(
          a => a.applicantName.toLowerCase() === session.user.name.toLowerCase()
        )
      );
    }

    return deepClone(this.applications);
  }

  /**
   * Returns a single application by `id` with authorization checks.
   */
  public getApplicationById(
    signedToken: string,
    id: string,
    nowMs?: number
  ): NewConnectionApplication {
    const session = requireServerRole(
      this.authService,
      signedToken,
      ['consumer', 'employee', 'field', 'management', 'admin'],
      nowMs
    );

    const app = this.applications.find(a => a.id === id);
    if (!app) {
      throw new AuthSecurityError(400, 'APPLICATION_NOT_FOUND', `Application ${id} not found.`);
    }

    if (session.role === 'consumer' && app.applicantName.toLowerCase() !== session.user.name.toLowerCase()) {
      throw new AuthSecurityError(403, 'FORBIDDEN_RECORD_ACCESS', 'You are not authorized to view this application.');
    }

    return deepClone(app);
  }

  /**
   * Returns work orders visible to the caller:
   * - `field`, `employee`, `management`, `admin`: operational work orders.
   * - `consumer`: forbidden (403).
   */
  public getWorkOrders(signedToken: string, nowMs?: number): WorkOrder[] {
    requireServerRole(
      this.authService,
      signedToken,
      ['field', 'employee', 'management', 'admin'],
      nowMs
    );

    return deepClone(this.workOrders);
  }

  /**
   * Returns a specific work order by `id`.
   */
  public getWorkOrderById(
    signedToken: string,
    id: string,
    nowMs?: number
  ): WorkOrder {
    requireServerRole(
      this.authService,
      signedToken,
      ['field', 'employee', 'management', 'admin'],
      nowMs
    );

    const wo = this.workOrders.find(w => w.id === id);
    if (!wo) {
      throw new AuthSecurityError(400, 'WORK_ORDER_NOT_FOUND', `Work Order ${id} not found.`);
    }

    return deepClone(wo);
  }
}

import { defaultServerAuthService } from './authRoutes';
export const defaultServerDataStore = new ServerDataStore(defaultServerAuthService);
