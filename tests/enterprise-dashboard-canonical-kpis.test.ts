import assert from 'node:assert/strict';
import {
  INITIAL_CONSUMERS,
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS,
  FEEDER_METRICS,
  SYSTEM_SERVICES
} from '../src/data/mockData';
import {
  selectConsumerCanonicalAnalytics,
  selectApplicationCanonicalMetrics,
  selectComplaintCanonicalMetrics,
  selectWorkOrderAndFieldMetrics,
  selectOfflineQueueCanonicalMetrics,
  selectIncidentCanonicalMetrics,
  selectEmployeeWorkloadAndSlaMetrics,
  selectManagementCanonicalMetrics,
  selectAdminCanonicalMetrics,
  selectNotificationCanonicalMetrics,
  inspectHistoricalBillSlabIntegrity,
  safePercentage,
  getCanonicalAnalyticsTranslations
} from '../src/utils/canonicalAnalytics';
import { detectAnomalies } from '../src/utils/anomalyDetector';
import {
  CANONICAL_DEMO_STORAGE_KEYS,
  createDemoBackup,
  validateDemoBackup,
  executeSafeDemoRestore,
  type BackupActorIdentity
} from '../src/utils/demoBackupEngine';
import { FieldOfflineQueueItem } from '../src/utils/fieldOfflineQueue';
import { CriticalIncident, ElectricityBill, PaymentTransaction } from '../src/types';

console.log('=== VIDYUTFLOW 2.0 — PHASE 6 CANONICAL KPIs & CROSS-PORTAL CONSISTENCY TEST SUITE ===');

let passed = 0;
function runTest(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    throw err;
  }
}

// 1. KPI Calculations Across All 5 Portals
runTest('1. Canonical KPI calculations match initial seed datasets across all 5 portals', () => {
  const consumerMetrics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS.filter(a => a.accountId === 'demo_consumer'),
    complaints: INITIAL_COMPLAINTS.filter(
      c => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190'
    ),
    notifications: INITIAL_NOTIFICATIONS.filter(n => n.targetRole === 'consumer'),
    actorScope: {
      accountId: 'demo_consumer',
      email: 'consumer@vidyutflow.demo',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-99231'
  });

  assert.equal(consumerMetrics.ownedConnectionsCount, 2);
  assert.equal(consumerMetrics.selectedConnectionNo, '04281-99231');
  assert.equal(consumerMetrics.connectionBillsCount, 3);
  assert.equal(consumerMetrics.connectionDueBillsCount, 1);
  assert.equal(consumerMetrics.connectionOutstandingBalanceInr, 2185);
  assert.equal(consumerMetrics.accountDueBillsCount, 2);
  assert.equal(consumerMetrics.accountOutstandingBalanceInr, 2185 + 14854);

  const detectedIncidents = detectAnomalies({
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    auditLogs: AUDIT_LOGS,
    bills: INITIAL_BILLS
  });

  const empMetrics = selectEmployeeWorkloadAndSlaMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: detectedIncidents,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    fieldEngineers: INITIAL_FIELD_ENGINEERS
  });

  assert.equal(empMetrics.applications.pendingScrutinyCount, 1); // APP-2026-0843
  assert.equal(empMetrics.applications.siteInspectionCount, 1);  // APP-2026-0842
  assert.equal(empMetrics.applications.awaitingSanctionCount, 1); // APP-2026-0844
  assert.equal(empMetrics.applications.completedEnergizedCount, 1); // APP-2026-0845
  assert.equal(empMetrics.complaints.activeOpenCount, 3); // CMP-8821, CMP-8822, CMP-8819 (CMP-8815 is Resolved)
});

// 2. Billing & Payment Reconciliation + Historical DEMO Slab Integrity Warnings
runTest('2. Billing reconciliation preserves historical DEMO slab discrepancies and reconciles archived payments without double counting', () => {
  const slabWarnings = inspectHistoricalBillSlabIntegrity(INITIAL_BILLS);
  assert.equal(slabWarnings.length, 3);
  const octWarning = slabWarnings.find(w => w.billNo === 'BILL-UG-2026-10-8821');
  const sepWarning = slabWarnings.find(w => w.billNo === 'BILL-UG-2026-09-8821');
  const augWarning = slabWarnings.find(w => w.billNo === 'BILL-UG-2026-08-8821');
  assert.ok(octWarning, 'Expected slab integrity warning for BILL-UG-2026-10-8821');
  assert.ok(sepWarning, 'Expected slab integrity warning for BILL-UG-2026-09-8821');
  assert.ok(augWarning, 'Expected slab integrity warning for BILL-UG-2026-08-8821');
  assert.equal(octWarning!.recordedEnergyCharges, 1420);
  assert.equal(octWarning!.computedSlabSum, 1522);
  // Original bill totalAmount must never be mutated
  assert.equal(INITIAL_BILLS[0].totalAmount, 2185);

  const empMetrics = selectEmployeeWorkloadAndSlaMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS
  });
  // Active bills paid: 2537 + 2435 = 4972; Archived payment TXN-DEB-1192837462: 15210; Total collected = 20182
  assert.equal(empMetrics.liveBillingLedger.totalCollectedAmountInr, 2537 + 2435 + 15210);
  assert.equal(empMetrics.liveBillingLedger.totalOutstandingAmountInr, 2185 + 14854);
});

// 3. Partial and Full Payment Updates (Non-negative Outstanding, No Double-Counting)
runTest('3. Partial, full, and overpayment updates recalculate outstanding balance accurately with non-negative floor', () => {
  const partialPayment: PaymentTransaction = {
    txId: 'TXN-PARTIAL-001',
    consumerNo: '04281-99231',
    billNo: 'BILL-UG-2026-10-8821',
    date: '15-Oct-2026 15:00',
    amount: 1000,
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'UPI/1000'
  };

  const afterPartial = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: [...INITIAL_PAYMENTS, partialPayment],
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-99231'
  });

  assert.equal(afterPartial.connectionOutstandingBalanceInr, 1185);
  assert.equal(afterPartial.connectionDueBillsCount, 1);

  // Full + overpayment test (must clamp outstanding at 0, never negative)
  const overPayment: PaymentTransaction = {
    txId: 'TXN-FULL-002',
    consumerNo: '04281-99231',
    billNo: 'BILL-UG-2026-10-8821',
    date: '15-Oct-2026 16:00',
    amount: 1500,
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: 'UPI/1500'
  };

  const afterFull = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: [...INITIAL_PAYMENTS, partialPayment, overPayment],
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-99231'
  });

  assert.equal(afterFull.connectionOutstandingBalanceInr, 0);
  assert.equal(afterFull.connectionDueBillsCount, 0);
  assert.equal(afterFull.connectionPaidBillsCount, 3);
});

// 4. Consumer Ownership & Connection Selection Filtering
runTest('4. Consumer ownership and connection selection strictly isolate connection metrics and prevent cross-connection mixing', () => {
  // Residential 04281-99231
  const resMetrics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-99231'
  });

  // Commercial 04281-77190
  const comMetrics = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-77190'
  });

  assert.equal(resMetrics.averageMonthlyKwh, 418);
  assert.equal(resMetrics.consumptionTrendSeries.length, 6);
  assert.equal(resMetrics.isInsufficientTrendHistory, false);

  // Commercial connection 04281-77190 has 1 bill of 1710 kWh — must NOT show 418 kWh!
  assert.equal(comMetrics.averageMonthlyKwh, 1710);
  assert.equal(comMetrics.consumptionTrendSeries.length, 1);
  assert.equal(comMetrics.consumptionTrendSeries[0].units, 1710);
  assert.equal(comMetrics.isInsufficientTrendHistory, true);
});

// 5. Employee Assignment & Subdivision Filtering
runTest('5. Employee assignment and subdivision filtering scopes applications and complaints accurately', () => {
  const gnApps = selectApplicationCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    subdivisionScope: 'Gandhinagar Sub-Division 2'
  });
  assert.equal(gnApps.activeCount, 1);
  assert.equal(gnApps.activeApplications[0].id, 'APP-2026-0843');

  const poojaApps = selectApplicationCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    assignedOfficerName: 'Pooja Shah'
  });
  assert.equal(poojaApps.activeCount, 2); // APP-2026-0843 and APP-2026-0844
});

// 6. Field Engineer Workload & Dynamic Emergency Callouts Calculation
runTest('6. Field Engineer workload and emergency callouts calculate dynamically from canonical work orders and assigned incidents', () => {
  const initialField = selectWorkOrderAndFieldMetrics({
    workOrders: INITIAL_WORK_ORDERS,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    incidents: [],
    engineerId: 'FLD-UG-201',
    engineerName: 'Vikramaditya Solanki'
  });

  // WO-4401 (On Site), WO-4402 (Pending), WO-4403 (Emergency, Pending), WO-4398 (Completed)
  assert.equal(initialField.activeWorkOrdersCount, 3);
  assert.equal(initialField.completedCount, 1);
  assert.equal(initialField.emergencyWorkOrdersActiveCount, 1);
  assert.equal(initialField.totalActiveEmergencyCallouts, 1);

  // Complete the emergency work order WO-4403 -> emergency callouts must drop to 0 (not stay hardcoded at 1!)
  const updatedOrders = INITIAL_WORK_ORDERS.map(wo =>
    wo.id === 'WO-4403' ? { ...wo, status: 'Completed' as const } : wo
  );
  const afterCompletion = selectWorkOrderAndFieldMetrics({
    workOrders: updatedOrders,
    fieldEngineers: INITIAL_FIELD_ENGINEERS,
    incidents: [],
    engineerId: 'FLD-UG-201',
    engineerName: 'Vikramaditya Solanki'
  });
  assert.equal(afterCompletion.totalActiveEmergencyCallouts, 0);
  assert.equal(afterCompletion.completedCount, 2);
});

// 7. Incident Visibility, Employee-First Triage & Escalation Governance
runTest('7. Incident visibility enforces Employee-first triage, prevents unassigned Field or unescalated Management leakage, and excludes CLOSED/RESOLVED', () => {
  const detected = detectAnomalies({
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    auditLogs: AUDIT_LOGS,
    bills: INITIAL_BILLS
  });

  // Consumer never sees operational incidents
  const consumerInc = selectIncidentCanonicalMetrics({
    incidents: detected,
    role: 'consumer',
    user: { id: 'demo_consumer', name: 'Smt. Meenaben Patel', role: 'consumer' }
  });
  assert.equal(consumerInc.totalAuthorizedCount, 0);

  // Field Engineer does not see unassigned incidents
  const fieldUnassigned = selectIncidentCanonicalMetrics({
    incidents: detected,
    role: 'field',
    user: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki', role: 'field' }
  });
  assert.equal(fieldUnassigned.totalAuthorizedCount, 0);

  // Management does not see unescalated ordinary incidents when session user is active
  const mgmtUnescalated = selectIncidentCanonicalMetrics({
    incidents: detected,
    role: 'management',
    user: { id: 'usr_mgmt_01', name: 'Dr. Harita Joshi', role: 'management' }
  });
  assert.equal(mgmtUnescalated.totalAuthorizedCount, 0);

  // Escalate an incident to Management and mark another as CLOSED
  const mutatedIncidents: CriticalIncident[] = detected.map((inc, idx) => {
    if (idx === 0) {
      return {
        ...inc,
        status: 'ESCALATED',
        escalatedTo: 'management',
        responsibleRoles: [...inc.responsibleRoles, 'management']
      };
    }
    if (idx === 1) {
      return {
        ...inc,
        status: 'CLOSED'
      };
    }
    return inc;
  });

  const mgmtAfterEscalation = selectIncidentCanonicalMetrics({
    incidents: mutatedIncidents,
    role: 'management',
    user: { id: 'usr_mgmt_01', name: 'Dr. Harita Joshi', role: 'management' }
  });
  assert.equal(mgmtAfterEscalation.activeCount, 1);

  const empAfterClose = selectIncidentCanonicalMetrics({
    incidents: mutatedIncidents,
    role: 'employee',
    user: { id: 'EMP-UG-1101', name: 'Priya Rathod', role: 'employee', subdivision: 'Mehsana Corporate Circle' }
  });
  assert.equal(empAfterClose.byStatus.CLOSED, 1);
  assert.equal(
    empAfterClose.activeCount,
    empAfterClose.totalAuthorizedCount - empAfterClose.resolvedClosedCount
  );
});

// 8. SLA Status Calculations & Closed Complaint Exclusion
runTest('8. SLA status calculations and active grievance counts exclude both Resolved and Closed complaints', () => {
  const complaintsWithClosed = [
    ...INITIAL_COMPLAINTS,
    {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-9900',
      status: 'Closed' as const
    }
  ];
  const cmpMetrics = selectComplaintCanonicalMetrics({
    complaints: complaintsWithClosed,
    referenceNow: '2026-10-15T09:30:00.000Z'
  });

  assert.equal(cmpMetrics.totalCount, 5);
  assert.equal(cmpMetrics.statusBreakdown.Resolved, 1);
  assert.equal(cmpMetrics.statusBreakdown.Closed, 1);
  assert.equal(cmpMetrics.resolvedClosedCount, 2);
  assert.equal(cmpMetrics.activeOpenCount, 3);
});

// 9. Notification Counts & Category Breakdown
runTest('9. Notification canonical metrics compute unread, urgent unread, and category breakdowns accurately', () => {
  const notifMetrics = selectNotificationCanonicalMetrics(INITIAL_NOTIFICATIONS);
  assert.equal(notifMetrics.totalCount, INITIAL_NOTIFICATIONS.length);
  const expectedUnread = INITIAL_NOTIFICATIONS.filter(n => !n.read).length;
  assert.equal(notifMetrics.unreadCount, expectedUnread);
  assert.equal(notifMetrics.readCount, INITIAL_NOTIFICATIONS.length - expectedUnread);
  assert.ok(notifMetrics.byCategory.Approval >= 3);
  assert.ok(notifMetrics.byCategory.Billing >= 1);
});

// 10. Offline Queue Status (PENDING, PROCESSING, COMPLETED, FAILED, Conflicts)
runTest('10. Offline queue selector tracks PENDING, PROCESSING, COMPLETED, FAILED, and conflict states', () => {
  const sampleQueue: FieldOfflineQueueItem[] = [
    {
      client_uuid: 'uuid-1',
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4401',
      timestamp: '2026-10-15T10:00:00.000Z',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      status: 'PENDING',
      attemptCount: 0,
      payload: { woId: 'WO-4401', targetStatus: 'On Site', submittedBy: 'FLD-UG-201' }
    },
    {
      client_uuid: 'uuid-2',
      actionType: 'SITE_INSPECTION_SUBMIT',
      targetRecordId: 'WO-4402',
      timestamp: '2026-10-15T10:05:00.000Z',
      createdAt: '2026-10-15T10:05:00.000Z',
      updatedAt: '2026-10-15T10:05:00.000Z',
      status: 'PROCESSING',
      attemptCount: 0,
      payload: { woId: 'WO-4402', targetStatus: 'Completed', submittedBy: 'FLD-UG-201' }
    },
    {
      client_uuid: 'uuid-3',
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4403',
      timestamp: '2026-10-15T10:10:00.000Z',
      createdAt: '2026-10-15T10:10:00.000Z',
      updatedAt: '2026-10-15T10:10:00.000Z',
      status: 'COMPLETED',
      attemptCount: 1,
      payload: { woId: 'WO-4403', targetStatus: 'Completed', submittedBy: 'FLD-UG-201' }
    },
    {
      client_uuid: 'uuid-4',
      actionType: 'WORK_ORDER_STATUS_UPDATE',
      targetRecordId: 'WO-4398',
      timestamp: '2026-10-15T10:15:00.000Z',
      createdAt: '2026-10-15T10:15:00.000Z',
      updatedAt: '2026-10-15T10:15:00.000Z',
      status: 'FAILED',
      attemptCount: 2,
      conflictDetected: true,
      failureReason: 'Already Completed',
      payload: { woId: 'WO-4398', targetStatus: 'On Site', submittedBy: 'FLD-UG-201' }
    }
  ];

  const qMetrics = selectOfflineQueueCanonicalMetrics(sampleQueue, false);
  assert.equal(qMetrics.totalCount, 4);
  assert.equal(qMetrics.pendingCount, 1);
  assert.equal(qMetrics.processingCount, 1);
  assert.equal(qMetrics.completedCount, 1);
  assert.equal(qMetrics.failedCount, 1);
  assert.equal(qMetrics.conflictCount, 1);
  assert.equal(qMetrics.actionableQueueCount, 3);
  assert.equal(qMetrics.syncHealthState, 'SYNCING');
});

// 11. Date-Range Filters in Management Portal (Q2-2026 vs FY26-YTD)
runTest('11. Management date-range filter (Q2-2026 vs FY26-YTD) deterministically updates monthly series and executive KPIs', () => {
  const q2Metrics = selectManagementCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    timePeriod: 'Q2-2026'
  });

  const ytdMetrics = selectManagementCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    timePeriod: 'FY26-YTD'
  });

  assert.equal(q2Metrics.monthsIncluded, 3); // Jul, Aug, Sep
  assert.equal(ytdMetrics.monthsIncluded, 6); // Apr, May, Jun, Jul, Aug, Sep
  assert.ok(ytdMetrics.executiveKpis.totalBilledMUs > q2Metrics.executiveKpis.totalBilledMUs);
  assert.ok(ytdMetrics.executiveKpis.totalCollectedCr > q2Metrics.executiveKpis.totalCollectedCr);
  assert.notEqual(
    q2Metrics.executiveKpis.weightedAtcLossPct,
    ytdMetrics.executiveKpis.weightedAtcLossPct
  );
});

// 12. Chart Series Accuracy & Dynamic Subdivision Updates
runTest('12. Resolving a complaint dynamically updates the Subdivision SLA performance chart and matrix', () => {
  const before = selectManagementCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS
  });

  const resolvedAll = INITIAL_COMPLAINTS.map(c => ({
    ...c,
    status: 'Resolved' as const
  }));

  const after = selectManagementCanonicalMetrics({
    applications: INITIAL_APPLICATIONS,
    complaints: resolvedAll,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS
  });

  const mehsanaBefore = before.subdivisionPerformanceSeries.find(
    s => s.name === 'Mehsana City North'
  )!;
  const mehsanaAfter = after.subdivisionPerformanceSeries.find(
    s => s.name === 'Mehsana City North'
  )!;

  assert.ok(
    mehsanaAfter.resolvedPct >= mehsanaBefore.resolvedPct,
    'Expected Mehsana City North resolution percentage to increase after resolving open complaint CMP-8821'
  );
  assert.equal(mehsanaAfter.liveOpenComplaints, 0);
});

// 13. Percentage Denominators & Division-by-Zero Protection
runTest('13. safePercentage guards against zero, negative, NaN, and Infinity denominators', () => {
  assert.equal(safePercentage(0, 0, 100), 100);
  assert.equal(safePercentage(5, 0, 0), 0);
  assert.equal(safePercentage(10, -5, 0), 0);
  assert.equal(safePercentage(Number.NaN, 10, 0), 0);
  assert.equal(safePercentage(3, 4, 0), 75);
  assert.equal(safePercentage(150, 100, 0), 100); // clamped to 100%
});

// 14. Empty Datasets Handling
runTest('14. Selectors handle completely empty datasets cleanly without NaN, null crashes, or fabricated trend points', () => {
  const emptyConsumer = selectConsumerCanonicalAnalytics({
    connections: [],
    bills: [],
    payments: [],
    applications: [],
    complaints: [],
    notifications: [],
    actorScope: { accountId: 'empty_user', ownedConsumerNos: [] }
  });
  assert.equal(emptyConsumer.ownedConnectionsCount, 0);
  assert.equal(emptyConsumer.averageMonthlyKwh, 0);
  assert.equal(emptyConsumer.consumptionTrendSeries.length, 0);
  assert.equal(emptyConsumer.accountOutstandingBalanceInr, 0);

  const emptyComplaints = selectComplaintCanonicalMetrics({ complaints: [] });
  assert.equal(emptyComplaints.totalCount, 0);
  assert.equal(emptyComplaints.activeOpenCount, 0);
  assert.equal(emptyComplaints.resolutionRatePct, 100);

  const emptyWorkOrders = selectWorkOrderAndFieldMetrics({ workOrders: [] });
  assert.equal(emptyWorkOrders.totalWorkOrders, 0);
  assert.equal(emptyWorkOrders.completionRatePct, 100);
  assert.equal(emptyWorkOrders.totalActiveEmergencyCallouts, 0);
});

// 15. Missing or Incomplete Records Handling
runTest('15. Selectors tolerate missing optional fields on newly energized connections or partial records', () => {
  const newlyEnergizedConn = {
    consumerNo: '04281-41572',
    connectionId: 'CONN-NEW-41572',
    consumerName: 'Smt. Meenaben Patel',
    meterNo: 'MTR-2026-41572',
    sanctionedLoadKw: 8,
    phase: '3-Phase' as const,
    tariffCategory: 'Residential (RGPU)' as const,
    address: '14, Anand Nagar Society, Mehsana',
    subdivision: 'Mehsana City North',
    feederName: '11kV Visnagar Road Feeder',
    status: 'Active' as const,
    connectedDate: '15-Oct-2026',
    lastReadingDate: '15-Oct-2026',
    currentReadingKwh: 0,
    previousReadingKwh: 0,
    averageMonthlyKwh: 0,
    securityDeposit: 3500,
    accountId: 'demo_consumer'
  };

  const newConnMetrics = selectConsumerCanonicalAnalytics({
    connections: [...INITIAL_CONNECTIONS, newlyEnergizedConn],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190', '04281-41572']
    },
    selectedConnectionNo: '04281-41572'
  });

  assert.equal(newConnMetrics.selectedConnectionNo, '04281-41572');
  assert.equal(newConnMetrics.connectionBillsCount, 0);
  assert.equal(newConnMetrics.connectionOutstandingBalanceInr, 0);
  assert.equal(newConnMetrics.averageMonthlyKwh, 0);
  assert.equal(newConnMetrics.isInsufficientTrendHistory, true);
});

// 16. Cross-Portal Consistency (Employee, Field, Management, Admin)
runTest('16. Cross-portal KPIs agree 100% on active non-archived applications, open complaints, active work orders, and reconciled collections', () => {
  // Archive one application APP-2026-0843 and verify Employee, Management, and Admin all agree
  const appsWithArchived = INITIAL_APPLICATIONS.map(a =>
    a.id === 'APP-2026-0843' ? { ...a, isArchived: true } : a
  );
  const detected = detectAnomalies({
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    auditLogs: AUDIT_LOGS,
    bills: INITIAL_BILLS
  });

  const emp = selectEmployeeWorkloadAndSlaMetrics({
    applications: appsWithArchived,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: detected,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS
  });

  const mgmt = selectManagementCanonicalMetrics({
    applications: appsWithArchived,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    incidents: detected,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS
  });

  const admin = selectAdminCanonicalMetrics({
    consumers: INITIAL_CONSUMERS,
    connections: INITIAL_CONNECTIONS,
    applications: appsWithArchived,
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    incidents: detected,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: AUDIT_LOGS,
    fieldOfflineQueue: [],
    employees: INITIAL_EMPLOYEES,
    fieldEngineers: INITIAL_FIELD_ENGINEERS
  });

  // Active in-progress applications: APP-2026-0842 and APP-2026-0844 (since APP-2026-0843 is archived and APP-2026-0845 is Meter Installed)
  assert.equal(emp.applications.inProgressCount, 2);
  assert.equal(mgmt.erpPulse.pendingApplications, 2);
  assert.equal(admin.demoRepositoryStats.activeApplications, 2);
  assert.equal(admin.demoRepositoryStats.archivedApplications, 1);

  // Open complaints: 3 across all portals
  assert.equal(emp.complaints.activeOpenCount, 3);
  assert.equal(mgmt.erpPulse.openComplaints, 3);
  assert.equal(admin.demoRepositoryStats.openComplaints, 3);

  // Active work orders: 3 across all portals
  assert.equal(emp.workOrders.activeWorkOrdersCount, 3);
  assert.equal(mgmt.erpPulse.activeWorkOrders, 3);
  assert.equal(admin.demoRepositoryStats.activeWorkOrders, 3);

  // Reconciled collections & outstanding balances match across Employee, Management, and Admin
  assert.equal(
    emp.liveBillingLedger.totalCollectedAmountInr,
    mgmt.executiveKpis.liveErpTotalCollectedInr
  );
  assert.equal(
    emp.liveBillingLedger.totalCollectedAmountInr,
    admin.demoRepositoryStats.totalCollectedInr
  );
  assert.equal(
    emp.liveBillingLedger.totalOutstandingAmountInr,
    mgmt.executiveKpis.liveErpTotalOutstandingInr
  );
  assert.equal(
    emp.liveBillingLedger.totalOutstandingAmountInr,
    admin.demoRepositoryStats.totalOutstandingInr
  );
});

// 17. Restore-Triggered Recalculation
runTest('17. Admin DEMO backup restore triggers immediate deterministic recalculation across all portal selectors', () => {
  const initialDetected = detectAnomalies({
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    auditLogs: AUDIT_LOGS,
    bills: INITIAL_BILLS
  });

  const map = new Map<string, string>();
  const storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    key(i: number) {
      return Array.from(map.keys())[i] ?? null;
    },
    removeItem(k: string) {
      map.delete(k);
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    }
  };

  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.consumers, JSON.stringify(INITIAL_CONSUMERS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.connections, JSON.stringify(INITIAL_CONNECTIONS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(INITIAL_BILLS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.payments, JSON.stringify(INITIAL_PAYMENTS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.applications, JSON.stringify(INITIAL_APPLICATIONS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.complaints, JSON.stringify(INITIAL_COMPLAINTS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.workOrders, JSON.stringify(INITIAL_WORK_ORDERS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.employees, JSON.stringify(INITIAL_EMPLOYEES));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.fieldEngineers, JSON.stringify(INITIAL_FIELD_ENGINEERS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.incidents, JSON.stringify(initialDetected));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.notifications, JSON.stringify(INITIAL_NOTIFICATIONS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.auditLogs, JSON.stringify(AUDIT_LOGS));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.aiRecommendations, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue, JSON.stringify([]));

  const adminActor: BackupActorIdentity = {
    id: 'USR-104',
    name: 'K. V. Sharma',
    role: 'admin',
    subdivision: 'Corporate HQ, Mehsana'
  };

  const backupRes = createDemoBackup({
    actor: adminActor,
    storage
  });
  assert.equal(backupRes.success, true);
  const backupEnvelope = backupRes.envelope!;

  const validation = validateDemoBackup({
    actor: adminActor,
    backupInput: JSON.stringify(backupEnvelope),
    storage
  });
  assert.equal(validation.isValid, true);

  // Mutate storage heavily (clear bills, complaints, applications)
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.payments, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.complaints, JSON.stringify([]));
  storage.setItem(CANONICAL_DEMO_STORAGE_KEYS.applications, JSON.stringify([]));

  const mutatedAdmin = selectAdminCanonicalMetrics({
    consumers: INITIAL_CONSUMERS,
    connections: INITIAL_CONNECTIONS,
    applications: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.applications)!),
    complaints: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.complaints)!),
    workOrders: INITIAL_WORK_ORDERS,
    bills: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.bills)!),
    payments: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.payments)!),
    incidents: [],
    notifications: [],
    auditLogs: [],
    fieldOfflineQueue: [],
    employees: INITIAL_EMPLOYEES,
    fieldEngineers: INITIAL_FIELD_ENGINEERS
  });
  assert.equal(mutatedAdmin.demoRepositoryStats.totalBills, 0);

  // Restore from backup and recalculate
  const restoreOutcome = executeSafeDemoRestore({
    actor: adminActor,
    backupInput: backupEnvelope,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    storage
  });

  assert.equal(restoreOutcome.success, true);

  const restoredAdmin = selectAdminCanonicalMetrics({
    consumers: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.consumers)!),
    connections: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.connections)!),
    applications: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.applications)!),
    complaints: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.complaints)!),
    workOrders: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.workOrders)!),
    bills: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.bills)!),
    payments: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.payments)!),
    incidents: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.incidents)!),
    notifications: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.notifications)!),
    auditLogs: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.auditLogs)!),
    fieldOfflineQueue: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue)!),
    employees: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.employees)!),
    fieldEngineers: JSON.parse(storage.getItem(CANONICAL_DEMO_STORAGE_KEYS.fieldEngineers)!)
  });

  assert.equal(restoredAdmin.demoRepositoryStats.totalBills, INITIAL_BILLS.length);
  assert.equal(restoredAdmin.demoRepositoryStats.openComplaints, 3);
  assert.equal(restoredAdmin.demoRepositoryStats.totalOutstandingInr, 2185 + 14854);
});

// 18. Four-Language Labels (en, gu, hi, mr)
runTest('18. All 4 supported languages (en, gu, hi, mr) provide complete non-empty canonical analytics labels', () => {
  const langs = ['en', 'gu', 'hi', 'mr'] as const;
  for (const lang of langs) {
    const dict = getCanonicalAnalyticsTranslations(lang);
    for (const [key, val] of Object.entries(dict)) {
      assert.ok(
        typeof val === 'string' && val.trim().length > 0,
        `Missing translation for ${key} in language ${lang}`
      );
    }
  }
});

// 19. No Unauthorized Data Leakage Across Consumers
runTest('19. Custom registered consumer cannot see Smt. Meenaben Patel bills, payments, applications, or complaints', () => {
  const isolatedConsumer = selectConsumerCanonicalAnalytics({
    connections: [],
    bills: INITIAL_BILLS,
    payments: INITIAL_PAYMENTS,
    applications: [],
    complaints: [],
    notifications: [],
    actorScope: {
      accountId: 'usr_custom_999',
      email: 'newcitizen@example.com',
      ownedConsumerNos: []
    }
  });

  assert.equal(isolatedConsumer.accountBillsCount, 0);
  assert.equal(isolatedConsumer.accountTotalBilledInr, 0);
  assert.equal(isolatedConsumer.accountOutstandingBalanceInr, 0);
  assert.equal(isolatedConsumer.totalApplicationsCount, 0);
  assert.equal(isolatedConsumer.totalComplaintsCount, 0);
});

// 20. Newly Generated Bill Live Recalculation
runTest('20. Generating a new bill for a connection updates connection trend series, average kWh, and cross-portal ledgers immediately', () => {
  const newOctBill: ElectricityBill = {
    billNo: 'BILL-UG-2026-11-77190',
    consumerNo: '04281-77190',
    billMonth: 'October 2026',
    billDate: '04-Nov-2026',
    dueDate: '22-Nov-2026',
    unitsConsumed: 1890,
    energyCharges: 10867,
    fixedCharges: 1620,
    fuelPriceAdjustment: 2268,
    electricityDuty: 1490,
    rebateOrSubsidy: 0,
    totalAmount: 16245,
    status: 'Unpaid',
    slabBreakdown: [
      { slab: 'Commercial Tariff Rate', units: 1890, rate: 5.75, amount: 10867 }
    ]
  };

  const updatedBills = [newOctBill, ...INITIAL_BILLS];
  const comAfterNewBill = selectConsumerCanonicalAnalytics({
    connections: INITIAL_CONNECTIONS,
    bills: updatedBills,
    payments: INITIAL_PAYMENTS,
    applications: INITIAL_APPLICATIONS,
    complaints: INITIAL_COMPLAINTS,
    notifications: INITIAL_NOTIFICATIONS,
    actorScope: {
      accountId: 'demo_consumer',
      ownedConsumerNos: ['04281-99231', '04281-77190']
    },
    selectedConnectionNo: '04281-77190'
  });

  assert.equal(comAfterNewBill.connectionBillsCount, 2);
  assert.equal(comAfterNewBill.consumptionTrendSeries.length, 2);
  assert.equal(comAfterNewBill.isInsufficientTrendHistory, false);
  // Average of 1710 and 1890 is 1800 kWh
  assert.equal(comAfterNewBill.averageMonthlyKwh, 1800);
  assert.equal(comAfterNewBill.connectionOutstandingBalanceInr, 14854 + 16245);
});

console.log(`\nALL ${passed}/20 PHASE 6 CANONICAL KPIs & CROSS-PORTAL CONSISTENCY TESTS PASSED!`);
