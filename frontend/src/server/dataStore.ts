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
}
