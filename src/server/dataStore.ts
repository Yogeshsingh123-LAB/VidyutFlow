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
  type MeterReadingRecord,
  type MeterReadingSubmission,
  type MeterConfiguration,
  type MeterThresholds
} from '../services/meterReading';
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
  private meterConfigurations = new Map<string, MeterConfiguration>();
  private accountLinkedConnections = new Map<string, Set<string>>();

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
  }

  /**
   * Returns the set of consumer connection numbers owned by a specific consumer `userId`.
   */
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

  public getMeterReadings(signedToken: string, nowMs?: number): MeterReadingRecord[] {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'employee', 'field', 'admin'], nowMs);
    if (session.role === 'consumer') {
      const owned = this.getOwnedConsumerNumbers(session.userId);
      return deepClone(this.meterReadings.filter(r => owned.has(r.consumerNo)));
    }
    if (session.role === 'field') {
      const assigned = new Set(this.workOrders
        .filter(w => w.assignedTo.toLowerCase().includes(session.user.name.toLowerCase()) || w.assignedTo.toLowerCase().includes(session.user.email.toLowerCase()))
        .map(w => w.consumerNo).filter((no): no is string => Boolean(no)));
      return deepClone(this.meterReadings.filter(r => assigned.has(r.consumerNo)));
    }
    return deepClone(this.meterReadings);
  }

  public getMeterNotifications(signedToken: string, nowMs?: number): AppNotification[] {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'employee', 'field', 'management', 'admin'], nowMs);
    const owned = session.role === 'consumer' ? this.getOwnedConsumerNumbers(session.userId) : null;
    return deepClone(this.notifications.filter(item => {
      if (!item.id.startsWith('NOT-MR-')) return false;
      const roleAllowed = item.targetRole === session.role || (session.role === 'admin' && item.targetRole === 'employee');
      return roleAllowed && (!owned || (item.consumerNo ? owned.has(item.consumerNo) : false));
    }).slice(0, 20));
  }

  public getMeterThresholds(signedToken: string, nowMs?: number): MeterThresholds {
    requireServerRole(this.authService, signedToken, ['employee', 'admin'], nowMs);
    return { ...this.meterThresholds };
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

  public setMeterThresholds(signedToken: string, input: Omit<MeterThresholds, 'version'>, nowMs?: number): MeterThresholds {
    const session = requireServerRole(this.authService, signedToken, ['admin'], nowMs);
    if (!input || typeof input !== 'object') {
      throw new AuthSecurityError(400, 'INVALID_THRESHOLDS', 'Thresholds must be positive, bounded and use at least two history periods.');
    }
    const values = [input.minimumHistory, input.highDailyRatio, input.lowDailyRatio, input.highDailyUnits];
    if (values.some(v => !Number.isFinite(v) || v <= 0) || input.minimumHistory < 2 || input.minimumHistory > 12 || input.highDailyRatio <= 1 || input.lowDailyRatio >= 1) {
      throw new AuthSecurityError(400, 'INVALID_THRESHOLDS', 'Thresholds must be positive, bounded and use at least two history periods.');
    }
    this.meterThresholds = {
      minimumHistory: input.minimumHistory,
      highDailyRatio: input.highDailyRatio,
      lowDailyRatio: input.lowDailyRatio,
      highDailyUnits: input.highDailyUnits,
      version: this.meterThresholds.version + 1
    };
    this.appendServerAuditLog(session, 'METER_THRESHOLDS_UPDATED', 'meter-reading-policy', `threshold_version=${this.meterThresholds.version}`);
    return { ...this.meterThresholds };
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
      const assigned = this.workOrders.some(w => w.consumerNo === conn.consumerNo && (w.assignedTo.toLowerCase().includes(session.user.name.toLowerCase()) || w.assignedTo.toLowerCase().includes(session.user.email.toLowerCase())));
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
    this.appendServerAuditLog(session, 'METER_READING_SUBMITTED', id, `consumer=${conn.consumerNo} meter=${input.meterNo} status=PENDING_REVIEW`);
    this.notifications.unshift({ id: `NOT-MR-${crypto.randomUUID()}`, title: 'Meter reading submitted', message: `Reading ${id} is awaiting employee review.`, time: new Date().toISOString(), targetRole: 'employee', type: 'info', read: false, category: 'Inspection', consumerNo: conn.consumerNo });
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
    this.appendServerAuditLog(session, `METER_READING_${action}`, record.id, `status=${record.status}; note=${note.slice(0, 300)}`);
    this.notifications.unshift({ id: `NOT-MR-${crypto.randomUUID()}`, title: action === 'APPROVE' ? 'Meter reading approved' : action === 'REJECT' ? 'Meter reading rejected' : 'Re-reading requested', message: `Meter reading ${record.id} was ${record.status.toLowerCase().replace('_', ' ')}.`, time: new Date().toISOString(), targetRole: 'consumer', type: action === 'APPROVE' ? 'success' : 'warning', read: false, category: 'Inspection', consumerNo: record.consumerNo });
    return deepClone(record);
  }

  public getMeterPhoto(signedToken: string, readingId: string, nowMs?: number): string {
    const session = requireServerRole(this.authService, signedToken, ['consumer', 'employee', 'field', 'admin'], nowMs);
    const record = this.meterReadings.find(r => r.id === readingId);
    if (!record) throw new AuthSecurityError(400, 'METER_READING_NOT_FOUND', 'Meter reading was not found.');
    if (session.role === 'field') {
      const assigned = this.workOrders.some(w => w.consumerNo === record.consumerNo && (w.assignedTo.toLowerCase().includes(session.user.name.toLowerCase()) || w.assignedTo.toLowerCase().includes(session.user.email.toLowerCase())));
      if (!assigned) throw new AuthSecurityError(403, 'METER_ASSIGNMENT_REQUIRED', 'Field engineers may view photos only for readings on their assigned connections.');
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
    return { demo: true as const, totalReadings: readings.length, pendingReview: readings.filter(r => r.status === 'PENDING_REVIEW').length, approved: readings.filter(r => r.status === 'APPROVED').length, rejected: readings.filter(r => r.status === 'REJECTED').length, rereadRequested: readings.filter(r => r.status === 'REREAD_REQUESTED').length, openAnomalies: anomalies.length, byCategory: Object.fromEntries([...new Set(anomalies.map(a => a.category))].map(category => [category, anomalies.filter(a => a.category === category).length])), thresholdVersion: this.meterThresholds.version };
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
