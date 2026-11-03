import {
  ElectricityConnection,
  ElectricityBill,
  PaymentTransaction,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  CriticalIncident,
  AppNotification,
  AuditLogItem,
  ConsumerProfile,
  EmployeeRecord,
  FieldEngineerRecord,
  FeederHealth,
  SystemServiceStatus,
  UserRole
} from '../types';
import { LanguageCode } from '../i18n/types';
import {
  CONSUMPTION_HISTORY,
  EXECUTIVE_MONTHLY_METRICS,
  SUBDIVISION_PERFORMANCE,
  FEEDER_METRICS,
  SYSTEM_SERVICES
} from '../data/mockData';
import {
  selectConsumerAccountBillingSummary,
  reconcileBillWithPayments,
  ConsumerAccountBillingSummary,
  ReconciledElectricityBill,
  ConsumerBillingActorScope
} from './billingEngine';
import {
  evaluateComplaintSla,
  evaluateApplicationSla,
  SlaEvaluationResult
} from './slaEngine';
import {
  filterIncidentsForSession,
  isConfirmedEmergencyHazard,
  IncidentSessionUserContext
} from './anomalyDetector';
import { FieldOfflineQueueItem } from './fieldOfflineQueue';

// ============================================================================
// SHARED TYPES FOR PHASE 6 CANONICAL ANALYTICS & KPI SELECTORS
// ============================================================================

export type ManagementTimePeriod = 'Q2-2026' | 'FY26-YTD';

export interface HistoricalBillSlabIntegrityWarning {
  billNo: string;
  consumerNo: string;
  billMonth: string;
  recordedEnergyCharges: number;
  computedSlabSum: number;
  varianceInr: number;
  preserveNote: string;
}

export interface ConnectionConsumptionTrendPoint {
  month: string;
  rawMonthKey: string;
  units: number;
  amount: number;
  avgTempC: number;
  isHistoricalSeed: boolean;
  isEstimated: boolean;
  billNo?: string;
}

export interface ConsumerCanonicalAnalytics {
  selectedConnectionNo: string | null;
  selectedConnection: ElectricityConnection | null;
  ownedConnectionsCount: number;
  billingSummary: ConsumerAccountBillingSummary;
  // Connection-scoped billing metrics
  connectionBillsCount: number;
  connectionDueBillsCount: number;
  connectionPaidBillsCount: number;
  connectionTotalBilledInr: number;
  connectionTotalPaidInr: number;
  connectionOutstandingBalanceInr: number;
  // Account-wide billing metrics
  accountBillsCount: number;
  accountDueBillsCount: number;
  accountTotalBilledInr: number;
  accountTotalPaidInr: number;
  accountOutstandingBalanceInr: number;
  // Connection-scoped consumption & trend analytics
  consumptionTrendSeries: ConnectionConsumptionTrendPoint[];
  averageMonthlyKwh: number;
  averageMonthlyBillInr: number;
  peakMonthlyKwh: number;
  latestBillUnitsKwh: number;
  isInsufficientTrendHistory: boolean;
  trendDataSourceScope: 'PRIMARY_DEMO_HYBRID_HISTORY' | 'CONNECTION_RECONCILED_BILLS' | 'CONNECTION_BASELINE_ONLY' | 'NO_CONNECTION';
  // Historical DEMO slab discrepancy warnings (preserved, never silently rewritten)
  slabIntegrityWarnings: HistoricalBillSlabIntegrityWarning[];
  // Applications & Service Requests
  totalApplicationsCount: number;
  activeApplicationsCount: number;
  archivedApplicationsCount: number;
  inProgressApplicationsCount: number;
  completedApplicationsCount: number;
  rejectedApplicationsCount: number;
  // Complaints & Grievances
  totalComplaintsCount: number;
  openComplaintsCount: number;
  resolvedComplaintsCount: number;
  connectionOpenComplaintsCount: number;
  // Notifications
  totalNotificationsCount: number;
  unreadNotificationsCount: number;
}

export interface ApplicationCanonicalMetrics {
  totalRecordsCount: number;
  activeApplications: NewConnectionApplication[];
  archivedApplications: NewConnectionApplication[];
  activeCount: number;
  archivedCount: number;
  inProgressCount: number;
  pendingScrutinyCount: number;
  siteInspectionCount: number;
  awaitingSanctionCount: number;
  completedEnergizedCount: number;
  rejectedCount: number;
  actionRequiredCount: number;
  highRiskSanctionsCount: number;
  totalEstimatedSanctionValueInr: number;
  approvalCompletionRatePct: number;
  statusDistribution: {
    Submitted: number;
    'Document Verification': number;
    'Site Inspection': number;
    'Sanction Approval': number;
    'Meter Installed': number;
    Rejected: number;
  };
  slaSummary: {
    onTrackCount: number;
    approachingCount: number;
    breachedCount: number;
    completedCount: number;
    evaluationsById: Record<string, SlaEvaluationResult>;
  };
}

export interface ComplaintCanonicalMetrics {
  scopedComplaints: ComplaintRecord[];
  totalCount: number;
  activeOpenCount: number;
  resolvedClosedCount: number;
  resolutionRatePct: number;
  statusBreakdown: {
    Registered: number;
    'In Review': number;
    Dispatched: number;
    'In Progress': number;
    Resolved: number;
    Closed: number;
  };
  priorityBreakdown: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  slaSummary: {
    onTrackCount: number;
    approachingCount: number;
    breachedCount: number;
    resolvedCount: number;
    complianceRatePct: number;
    evaluationsById: Record<string, SlaEvaluationResult>;
  };
}

export interface EngineerWorkloadSummary {
  engineerId: string;
  engineerName: string;
  subdivision: string;
  assignedTotalWorkOrders: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  emergencyActiveWorkOrders: number;
  assignedActiveIncidents: number;
}

export interface WorkOrderAndFieldCanonicalMetrics {
  scopedWorkOrders: WorkOrder[];
  totalWorkOrders: number;
  activeWorkOrdersCount: number;
  pendingDispatchCount: number;
  enRouteCount: number;
  onSiteCount: number;
  inProgressFieldCount: number;
  completedCount: number;
  deferredCount: number;
  emergencyWorkOrdersActiveCount: number;
  assignedActiveCriticalIncidentsCount: number;
  totalActiveEmergencyCallouts: number;
  withInspectionReportCount: number;
  completionRatePct: number;
  engineerWorkloads: EngineerWorkloadSummary[];
}

export interface OfflineQueueCanonicalMetrics {
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  conflictCount: number;
  actionableQueueCount: number;
  byActionType: {
    SITE_INSPECTION_SUBMIT: number;
    WORK_ORDER_STATUS_UPDATE: number;
  };
  syncHealthState: 'IDLE_CLEAN' | 'PENDING_SYNC' | 'SYNCING' | 'ATTENTION_REQUIRED';
}

export interface IncidentCanonicalMetrics {
  authorizedIncidents: CriticalIncident[];
  totalAuthorizedCount: number;
  activeCount: number;
  unreadDetectedCount: number;
  criticalActiveCount: number;
  criticalDetectedCount: number;
  warningActiveCount: number;
  escalatedActiveCount: number;
  assignedToFieldActiveCount: number;
  resolvedClosedCount: number;
  pendingManagementConcurrenceCount: number;
  byStatus: {
    DETECTED: number;
    ACKNOWLEDGED: number;
    ASSIGNED: number;
    IN_PROGRESS: number;
    ESCALATED: number;
    RESOLVED: number;
    CLOSED: number;
  };
  bySeverity: {
    CRITICAL: number;
    WARNING: number;
    INFO: number;
  };
}

export interface SubdivisionCanonicalPerformanceRow {
  name: string;
  baselineComplaints: number;
  liveCanonicalComplaints: number;
  liveOpenComplaints: number;
  liveResolvedComplaints: number;
  totalComplaintsCombined: number;
  resolvedPct: number;
  avgTatHours: number;
  atcLossPct: number;
  activeApplicationsCount: number;
  activeWorkOrdersCount: number;
}

export interface EmployeeWorkloadAndSlaMetrics {
  applications: ApplicationCanonicalMetrics;
  complaints: ComplaintCanonicalMetrics;
  incidents: IncidentCanonicalMetrics;
  workOrders: WorkOrderAndFieldCanonicalMetrics;
  subdivisionPerformanceSeries: SubdivisionCanonicalPerformanceRow[];
  liveBillingLedger: {
    totalBillsCount: number;
    paidBillsCount: number;
    unpaidBillsCount: number;
    partiallyPaidBillsCount: number;
    totalBilledAmountInr: number;
    totalCollectedAmountInr: number;
    totalOutstandingAmountInr: number;
    liveCollectionEfficiencyPct: number;
    slabIntegrityWarnings: HistoricalBillSlabIntegrityWarning[];
  };
}

export interface ExecutiveMonthlyTrajectoryPoint {
  month: string;
  billedMUs: number;
  collectedCr: number;
  atcLossPct: number;
  liveCanonicalBilledInr: number;
  liveCanonicalCollectedInr: number;
}

export interface ManagementCanonicalMetrics {
  timePeriod: ManagementTimePeriod;
  periodLabel: string;
  monthsIncluded: number;
  erpPulse: {
    pendingApplications: number;
    completedApplications: number;
    archivedApplications: number;
    openComplaints: number;
    resolvedComplaints: number;
    activeWorkOrders: number;
    completedWorkOrders: number;
    activeSystemIncidents: number;
    escalatedToManagementIncidents: number;
  };
  executiveKpis: {
    weightedAtcLossPct: number;
    atcLossTargetVariancePct: number;
    billingEfficiencyPct: number;
    collectionEfficiencyPct: number;
    totalBilledMUs: number;
    totalCollectedCr: number;
    latestMonthBilledMUs: number;
    latestMonthCollectedCr: number;
    liveErpCollectionRatePct: number;
    liveErpTotalBilledInr: number;
    liveErpTotalCollectedInr: number;
    liveErpTotalOutstandingInr: number;
  };
  monthlyTrajectorySeries: ExecutiveMonthlyTrajectoryPoint[];
  feederSummary: {
    totalFeeders: number;
    criticalOverloadCount: number;
    warningCount: number;
    optimalCount: number;
    averageUtilizationPct: number;
    totalTrippingEvents30d: number;
    totalConsumersConnected: number;
  };
  subdivisionPerformanceSeries: SubdivisionCanonicalPerformanceRow[];
}

export interface AdminCanonicalMetrics {
  serviceHealth: {
    totalServices: number;
    operationalCount: number;
    degradedCount: number;
    downCount: number;
    averageLatencyMs: number;
    averageUptime90dPct: number;
  };
  staffDirectory: {
    totalStaff: number;
    activeStaffCount: number;
    lockedStaffCount: number;
    erpEmployeesCount: number;
    fieldEngineersCount: number;
  };
  auditSummary: {
    totalLogs: number;
    successCount: number;
    warningCount: number;
    failedCount: number;
    securityEventsCount: number;
  };
  demoRepositoryStats: {
    totalConsumers: number;
    totalConnections: number;
    activeApplications: number;
    archivedApplications: number;
    totalComplaints: number;
    openComplaints: number;
    resolvedComplaints: number;
    totalWorkOrders: number;
    activeWorkOrders: number;
    completedWorkOrders: number;
    totalBills: number;
    unpaidBills: number;
    paidBills: number;
    totalPayments: number;
    totalBilledInr: number;
    totalCollectedInr: number;
    totalOutstandingInr: number;
    activeIncidents: number;
    totalIncidents: number;
    totalNotifications: number;
    unreadNotifications: number;
    offlineQueueTotal: number;
    offlineQueuePending: number;
    offlineQueueCompleted: number;
    offlineQueueFailed: number;
    totalCanonicalRecords: number;
  };
}

export interface NotificationCanonicalMetrics {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  urgentUnreadCount: number;
  byCategory: {
    Billing: number;
    Approval: number;
    Outage: number;
    Inspection: number;
    Security: number;
    Other: number;
  };
  byType: {
    info: number;
    warning: number;
    alert: number;
    success: number;
  };
}

// ============================================================================
// HELPER UTILITIES (SAFE MATH, SUBDIVISION MATCHING & SLAB INTEGRITY)
// ============================================================================

export function safePercentage(numerator: number, denominator: number, fallbackWhenZero: number = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return fallbackWhenZero;
  }
  const pct = (numerator / denominator) * 100;
  return Number(Math.max(0, Math.min(100, pct)).toFixed(1));
}

export function matchesSubdivisionScope(recordSubdivision?: string, scopeFilter?: string): boolean {
  if (!scopeFilter || scopeFilter === 'All' || scopeFilter === 'Central Office' || scopeFilter === 'Mehsana Corporate Circle' || scopeFilter === 'Mehsana Circle') {
    return true;
  }
  if (!recordSubdivision) return true;
  const a = recordSubdivision.trim().toLowerCase();
  const b = scopeFilter.trim().toLowerCase();
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // Normalize common abbreviations ("Gandhinagar Sub-Div 2" vs "Gandhinagar Sub-Division 2", "Kadi Rural (Ag)" vs "Kadi Division")
  if (a.includes('gandhinagar') && b.includes('gandhinagar')) return true;
  if (a.includes('kadi') && b.includes('kadi')) return true;
  if (a.includes('patan') && b.includes('patan')) return true;
  if (a.includes('kalol') && b.includes('kalol')) return true;
  if (a.includes('visnagar') && b.includes('visnagar')) return true;
  if (a.includes('gidc') && b.includes('gidc')) return true;
  if (a.includes('mehsana city') && b.includes('mehsana city')) return true;
  return false;
}

/**
 * Inspects canonical bills for historical DEMO slab-sum vs energy-charge discrepancies
 * without rewriting or mutating historical bill totals.
 */
export function inspectHistoricalBillSlabIntegrity(bills: ElectricityBill[]): HistoricalBillSlabIntegrityWarning[] {
  const warnings: HistoricalBillSlabIntegrityWarning[] = [];
  for (const bill of bills) {
    if (!Array.isArray(bill.slabBreakdown) || bill.slabBreakdown.length === 0) continue;
    const slabSum = Number(
      bill.slabBreakdown.reduce((acc, row) => acc + (Number(row.amount) || 0), 0).toFixed(2)
    );
    const recordedEnergy = Number((Number(bill.energyCharges) || 0).toFixed(2));
    const variance = Number(Math.abs(slabSum - recordedEnergy).toFixed(2));
    if (variance >= 1) {
      warnings.push({
        billNo: bill.billNo,
        consumerNo: bill.consumerNo,
        billMonth: bill.billMonth,
        recordedEnergyCharges: recordedEnergy,
        computedSlabSum: slabSum,
        varianceInr: variance,
        preserveNote: `Canonical historical DEMO bill ${bill.billNo} has recorded energyCharges ₹${recordedEnergy} vs slab sum ₹${slabSum}. Preserved as-is without silent mutation.`
      });
    }
  }
  return warnings;
}

const SHORT_MONTH_MAP: Record<string, string> = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec'
};

function formatShortBillMonthLabel(billMonth: string): string {
  const trimmed = (billMonth || '').trim();
  if (!trimmed) return 'Current';

  // Cross-year two-month label: "December 2026–January 2027"
  const crossYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})\s*[–-]\s*([A-Za-z]+)\s+(\d{4})$/);
  if (crossYearMatch) {
    const m1 = SHORT_MONTH_MAP[crossYearMatch[1].toLowerCase()] || crossYearMatch[1].slice(0, 3);
    const m2 = SHORT_MONTH_MAP[crossYearMatch[3].toLowerCase()] || crossYearMatch[3].slice(0, 3);
    return `${m1}–${m2} ${crossYearMatch[4]}`;
  }

  // Same-year two-month label: "September–October 2026"
  const biMonthlyMatch = trimmed.match(/^([A-Za-z]+)\s*[–-]\s*([A-Za-z]+)\s+(\d{4})$/);
  if (biMonthlyMatch) {
    const m1 = SHORT_MONTH_MAP[biMonthlyMatch[1].toLowerCase()] || biMonthlyMatch[1].slice(0, 3);
    const m2 = SHORT_MONTH_MAP[biMonthlyMatch[2].toLowerCase()] || biMonthlyMatch[2].slice(0, 3);
    return `${m1}–${m2} ${biMonthlyMatch[3]}`;
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const mLower = parts[0].toLowerCase();
    const shortM = SHORT_MONTH_MAP[mLower] || parts[0].slice(0, 3);
    return `${shortM} ${parts[1]}`;
  }
  return trimmed;
}

/**
 * Resolves the single closing short month ('Jan'..'Dec') for executive trajectory mapping
 * so a two-month bill (e.g., 'August–September 2026') is attributed once to its closing month ('Sep')
 * and never double-counted across both months.
 */
function resolveClosingShortMonthForTrajectory(billMonth: string): string {
  const trimmed = (billMonth || '').trim();
  if (!trimmed) return 'Current';

  const crossYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})\s*[–-]\s*([A-Za-z]+)\s+(\d{4})$/);
  if (crossYearMatch) {
    return SHORT_MONTH_MAP[crossYearMatch[3].toLowerCase()] || crossYearMatch[3].slice(0, 3);
  }

  const biMonthlyMatch = trimmed.match(/^([A-Za-z]+)\s*[–-]\s*([A-Za-z]+)\s+(\d{4})$/);
  if (biMonthlyMatch) {
    return SHORT_MONTH_MAP[biMonthlyMatch[2].toLowerCase()] || biMonthlyMatch[2].slice(0, 3);
  }

  return formatShortBillMonthLabel(trimmed).split(' ')[0];
}

// ============================================================================
// 1. CONSUMER CANONICAL ANALYTICS SELECTOR
// ============================================================================

export function selectConsumerCanonicalAnalytics(params: {
  connections: ElectricityConnection[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  notifications: AppNotification[];
  actorScope: ConsumerBillingActorScope;
  selectedConnectionNo?: string | null;
  referenceDate?: string;
}): ConsumerCanonicalAnalytics {
  const {
    connections,
    bills,
    payments,
    applications,
    complaints,
    notifications,
    actorScope,
    selectedConnectionNo,
    referenceDate = '15-Oct-2026'
  } = params;

  const billingSummary = selectConsumerAccountBillingSummary({
    allConnections: connections,
    allBills: bills,
    allPayments: payments,
    actorScope,
    selectedConnectionNo,
    referenceDate
  });

  const resolvedSelectedConnNo = billingSummary.selectedConnectionNo || null;
  const selectedConnection =
    connections.find(c => c.consumerNo === resolvedSelectedConnNo) ||
    connections[0] ||
    null;

  const selectedConnSummary = billingSummary.selectedConnectionSummary;
  const connectionReconciledBills: ReconciledElectricityBill[] =
    selectedConnSummary?.visibleBills || [];

  const connectionBillsCount = connectionReconciledBills.length;
  const connectionDueBillsCount = selectedConnSummary?.dueBillCount || 0;
  const connectionPaidBillsCount = selectedConnSummary?.paidBillCount || 0;

  const connectionTotalBilledInr = Math.max(
    0,
    connectionReconciledBills.reduce((sum, r) => sum + Math.max(0, Number(r.totalAmount) || 0), 0)
  );
  const connectionOutstandingBalanceInr = Math.max(
    0,
    selectedConnSummary?.totalOutstandingAmount || 0
  );
  const connectionTotalPaidInr = Math.max(
    0,
    connectionReconciledBills.reduce((sum, r) => sum + Math.max(0, Number(r.paidAmount) || 0), 0)
  );

  // Account-wide reconciled billing totals (never negative, no double-counting)
  const accountReconciledBills = billingSummary.allAccountReconciledBills;
  const accountBillsCount = accountReconciledBills.length;
  const accountDueBillsCount = billingSummary.accountDueBillCount;
  const accountTotalBilledInr = Math.max(
    0,
    accountReconciledBills.reduce((sum, b) => sum + Math.max(0, Number(b.totalAmount) || 0), 0)
  );
  const accountOutstandingBalanceInr = Math.max(0, billingSummary.accountTotalOutstandingAmount);

  // Total paid across account includes reconciled bill payments plus any historical archived payments (e.g. TXN-DEB-1192837462)
  const reconciledBillNoSet = new Set(accountReconciledBills.map(b => b.billNo));
  const reconciledPaidInr = Math.max(0, accountTotalBilledInr - accountOutstandingBalanceInr);
  const archivedSuccessfulPaymentsInr = billingSummary.allAccountPayments
    .filter(p => p.status === 'Successful' && !reconciledBillNoSet.has(p.billNo))
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0);
  const accountTotalPaidInr = reconciledPaidInr + archivedSuccessfulPaymentsInr;

  // Build connection-scoped consumption & billing trend series
  let consumptionTrendSeries: ConnectionConsumptionTrendPoint[] = [];
  let trendDataSourceScope: ConsumerCanonicalAnalytics['trendDataSourceScope'] = 'NO_CONNECTION';

  if (selectedConnection) {
    if (selectedConnection.consumerNo === '04281-99231') {
      trendDataSourceScope = 'PRIMARY_DEMO_HYBRID_HISTORY';
      // Start with the 6-month historical reference trajectory for 04281-99231 and synchronize with live canonical bills
      const billByShortMonth = new Map<string, ReconciledElectricityBill>();
      for (const rec of connectionReconciledBills) {
        const shortLabel = formatShortBillMonthLabel(rec.billMonth);
        billByShortMonth.set(shortLabel.toLowerCase(), rec);
      }

      const baseSeries: ConnectionConsumptionTrendPoint[] = CONSUMPTION_HISTORY.map(pt => {
        const normalizedKey = pt.month.replace(/\s*\(Est\)/i, '').trim().toLowerCase();
        const liveMatch = billByShortMonth.get(normalizedKey);
        if (liveMatch) {
          billByShortMonth.delete(normalizedKey);
          return {
            month: pt.month,
            rawMonthKey: pt.month,
            units: Math.max(0, Number(liveMatch.unitsConsumed) || 0),
            amount: Math.max(0, Number(liveMatch.totalAmount) || 0),
            avgTempC: pt.avgTempC,
            isHistoricalSeed: false,
            isEstimated: pt.month.includes('(Est)'),
            billNo: liveMatch.billNo
          };
        }
        return {
          month: pt.month,
          rawMonthKey: pt.month,
          units: Math.max(0, Number(pt.units) || 0),
          amount: Math.max(0, Number(pt.amount) || 0),
          avgTempC: pt.avgTempC,
          isHistoricalSeed: true,
          isEstimated: pt.month.includes('(Est)')
        };
      });

      // Append any newly generated canonical bills for 04281-99231 that aren't in the 6-month seed window
      for (const [, unmatchedRec] of billByShortMonth.entries()) {
        const shortMonth = formatShortBillMonthLabel(unmatchedRec.billMonth);
        baseSeries.push({
          month: shortMonth,
          rawMonthKey: shortMonth,
          units: Math.max(0, Number(unmatchedRec.unitsConsumed) || 0),
          amount: Math.max(0, Number(unmatchedRec.totalAmount) || 0),
          avgTempC: 32,
          isHistoricalSeed: false,
          isEstimated: false,
          billNo: unmatchedRec.billNo
        });
      }

      consumptionTrendSeries = baseSeries;
    } else if (connectionReconciledBills.length > 0) {
      trendDataSourceScope = 'CONNECTION_RECONCILED_BILLS';
      // Strictly use this connection's own reconciled bills in chronological order (oldest -> newest)
      const chronological = [...connectionReconciledBills].reverse();
      consumptionTrendSeries = chronological.map(rec => {
        const shortMonth = formatShortBillMonthLabel(rec.billMonth);
        return {
          month: shortMonth,
          rawMonthKey: shortMonth,
          units: Math.max(0, Number(rec.unitsConsumed) || 0),
          amount: Math.max(0, Number(rec.totalAmount) || 0),
          avgTempC: 33,
          isHistoricalSeed: false,
          isEstimated: false,
          billNo: rec.billNo
        };
      });
    } else {
      trendDataSourceScope = 'CONNECTION_BASELINE_ONLY';
      const deltaUnits = Math.max(
        0,
        (Number(selectedConnection.currentReadingKwh) || 0) -
          (Number(selectedConnection.previousReadingKwh) || 0)
      );
      if (deltaUnits > 0 || (Number(selectedConnection.averageMonthlyKwh) || 0) > 0) {
        consumptionTrendSeries = [
          {
            month: 'Current Cycle',
            rawMonthKey: 'Current Cycle',
            units: deltaUnits || Math.max(0, Number(selectedConnection.averageMonthlyKwh) || 0),
            amount: 0,
            avgTempC: 32,
            isHistoricalSeed: false,
            isEstimated: true
          }
        ];
      }
    }
  }

  const isInsufficientTrendHistory = consumptionTrendSeries.length < 2;

  const averageMonthlyKwh =
    consumptionTrendSeries.length > 0
      ? Math.round(
          consumptionTrendSeries.reduce((sum, pt) => sum + pt.units, 0) /
            consumptionTrendSeries.length
        )
      : Math.max(0, Number(selectedConnection?.averageMonthlyKwh) || 0);

  const averageMonthlyBillInr =
    consumptionTrendSeries.length > 0
      ? Math.round(
          consumptionTrendSeries.reduce((sum, pt) => sum + pt.amount, 0) /
            consumptionTrendSeries.length
        )
      : 0;

  const peakMonthlyKwh =
    consumptionTrendSeries.length > 0
      ? Math.max(...consumptionTrendSeries.map(pt => pt.units))
      : averageMonthlyKwh;

  const latestBillUnitsKwh =
    connectionReconciledBills[0]?.unitsConsumed ??
    (consumptionTrendSeries.length > 0
      ? consumptionTrendSeries[consumptionTrendSeries.length - 1].units
      : 0);

  const slabIntegrityWarnings = inspectHistoricalBillSlabIntegrity(accountReconciledBills);

  // Consumer applications & complaints
  const activeApps = applications.filter(a => !a.isArchived);
  const archivedApps = applications.filter(a => Boolean(a.isArchived));
  const inProgressApps = activeApps.filter(
    a => a.status !== 'Meter Installed' && a.status !== 'Rejected'
  );
  const completedApps = activeApps.filter(a => a.status === 'Meter Installed');
  const rejectedApps = activeApps.filter(a => a.status === 'Rejected');

  const openComplaints = complaints.filter(
    c => c.status !== 'Resolved' && c.status !== 'Closed'
  );
  const resolvedComplaints = complaints.filter(
    c => c.status === 'Resolved' || c.status === 'Closed'
  );
  const connectionOpenComplaints = resolvedSelectedConnNo
    ? openComplaints.filter(c => c.consumerNo === resolvedSelectedConnNo)
    : openComplaints;

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return {
    selectedConnectionNo: resolvedSelectedConnNo,
    selectedConnection,
    ownedConnectionsCount: connections.length,
    billingSummary,
    connectionBillsCount,
    connectionDueBillsCount,
    connectionPaidBillsCount,
    connectionTotalBilledInr,
    connectionTotalPaidInr,
    connectionOutstandingBalanceInr,
    accountBillsCount,
    accountDueBillsCount,
    accountTotalBilledInr,
    accountTotalPaidInr,
    accountOutstandingBalanceInr,
    consumptionTrendSeries,
    averageMonthlyKwh,
    averageMonthlyBillInr,
    peakMonthlyKwh,
    latestBillUnitsKwh,
    isInsufficientTrendHistory,
    trendDataSourceScope,
    slabIntegrityWarnings,
    totalApplicationsCount: applications.length,
    activeApplicationsCount: activeApps.length,
    archivedApplicationsCount: archivedApps.length,
    inProgressApplicationsCount: inProgressApps.length,
    completedApplicationsCount: completedApps.length,
    rejectedApplicationsCount: rejectedApps.length,
    totalComplaintsCount: complaints.length,
    openComplaintsCount: openComplaints.length,
    resolvedComplaintsCount: resolvedComplaints.length,
    connectionOpenComplaintsCount: connectionOpenComplaints.length,
    totalNotificationsCount: notifications.length,
    unreadNotificationsCount
  };
}

// ============================================================================
// 2. APPLICATION CANONICAL METRICS SELECTOR
// ============================================================================

export function selectApplicationCanonicalMetrics(params: {
  applications: NewConnectionApplication[];
  subdivisionScope?: string;
  assignedOfficerName?: string;
  assignedEngineerName?: string;
  consumerAccountId?: string;
  consumerEmail?: string;
  referenceNow?: Date | string | number;
}): ApplicationCanonicalMetrics {
  const {
    applications,
    subdivisionScope,
    assignedOfficerName,
    assignedEngineerName,
    consumerAccountId,
    consumerEmail,
    referenceNow = '2026-10-15T12:00:00.000Z'
  } = params;

  const scoped = applications.filter(app => {
    if (subdivisionScope && !matchesSubdivisionScope(app.subdivision, subdivisionScope)) {
      return false;
    }
    if (assignedOfficerName) {
      const target = assignedOfficerName.trim().toLowerCase();
      const actual = (app.assignedOfficer || '').trim().toLowerCase();
      if (!actual.includes(target) && !target.includes(actual)) return false;
    }
    if (assignedEngineerName) {
      const target = assignedEngineerName.trim().toLowerCase();
      const actual = (app.assignedEngineer || '').trim().toLowerCase();
      if (!actual.includes(target) && !target.includes(actual)) return false;
    }
    if (consumerAccountId || consumerEmail) {
      const emailLower = (consumerEmail || '').toLowerCase();
      if (consumerAccountId === 'demo_consumer' || emailLower === 'consumer@vidyutflow.demo') {
        const isDemoOwned =
          app.accountId === 'demo_consumer' ||
          (app.email && app.email.toLowerCase() === 'meenaben.patel@example.com') ||
          app.id === 'APP-2026-0842';
        if (!isDemoOwned) return false;
      } else {
        const matchesId = Boolean(consumerAccountId && app.accountId === consumerAccountId);
        const matchesEmail = Boolean(emailLower && app.email && app.email.toLowerCase() === emailLower);
        if (!matchesId && !matchesEmail) return false;
      }
    }
    return true;
  });

  const activeApplications = scoped.filter(a => !a.isArchived);
  const archivedApplications = scoped.filter(a => Boolean(a.isArchived));

  const statusDistribution: ApplicationCanonicalMetrics['statusDistribution'] = {
    Submitted: 0,
    'Document Verification': 0,
    'Site Inspection': 0,
    'Sanction Approval': 0,
    'Meter Installed': 0,
    Rejected: 0
  };

  for (const app of activeApplications) {
    if (app.status in statusDistribution) {
      statusDistribution[app.status] += 1;
    }
  }

  const pendingScrutinyCount =
    statusDistribution.Submitted + statusDistribution['Document Verification'];
  const siteInspectionCount = statusDistribution['Site Inspection'];
  const awaitingSanctionCount = statusDistribution['Sanction Approval'];
  const completedEnergizedCount = statusDistribution['Meter Installed'];
  const rejectedCount = statusDistribution.Rejected;
  const inProgressCount =
    pendingScrutinyCount + siteInspectionCount + awaitingSanctionCount;

  const actionRequiredCount = activeApplications.filter(
    a => Boolean(a.clarificationRequested) && a.status !== 'Rejected' && a.status !== 'Meter Installed'
  ).length;

  const highRiskSanctionsCount = activeApplications.filter(
    a => a.requestedLoadKw >= 15 && a.status !== 'Meter Installed' && a.status !== 'Rejected'
  ).length;

  const totalEstimatedSanctionValueInr = activeApplications.reduce(
    (sum, a) => sum + Math.max(0, Number(a.estimatedSanctionCost) || 0),
    0
  );

  const nonRejectedActiveCount = activeApplications.length - rejectedCount;
  const approvalCompletionRatePct = safePercentage(
    completedEnergizedCount,
    nonRejectedActiveCount,
    0
  );

  const evaluationsById: Record<string, SlaEvaluationResult> = {};
  let onTrackCount = 0;
  let approachingCount = 0;
  let breachedCount = 0;
  let completedCount = 0;

  for (const app of activeApplications) {
    const ev = evaluateApplicationSla(app, referenceNow);
    evaluationsById[app.id] = ev;
    if (ev.state === 'RESOLVED') completedCount += 1;
    else if (ev.state === 'BREACHED') breachedCount += 1;
    else if (ev.state === 'APPROACHING_DEADLINE') approachingCount += 1;
    else onTrackCount += 1;
  }

  return {
    totalRecordsCount: scoped.length,
    activeApplications,
    archivedApplications,
    activeCount: activeApplications.length,
    archivedCount: archivedApplications.length,
    inProgressCount,
    pendingScrutinyCount,
    siteInspectionCount,
    awaitingSanctionCount,
    completedEnergizedCount,
    rejectedCount,
    actionRequiredCount,
    highRiskSanctionsCount,
    totalEstimatedSanctionValueInr,
    approvalCompletionRatePct,
    statusDistribution,
    slaSummary: {
      onTrackCount,
      approachingCount,
      breachedCount,
      completedCount,
      evaluationsById
    }
  };
}

// ============================================================================
// 3. COMPLAINT & GRIEVANCE CANONICAL METRICS SELECTOR
// ============================================================================

export function selectComplaintCanonicalMetrics(params: {
  complaints: ComplaintRecord[];
  subdivisionScope?: string;
  assignedTechnicianName?: string;
  consumerAccountId?: string;
  consumerEmail?: string;
  ownedConsumerNos?: string[];
  priorityFilter?: string;
  referenceNow?: Date | string | number;
}): ComplaintCanonicalMetrics {
  const {
    complaints,
    subdivisionScope,
    assignedTechnicianName,
    consumerAccountId,
    consumerEmail,
    ownedConsumerNos,
    priorityFilter,
    referenceNow = '2026-10-15T12:00:00.000Z'
  } = params;

  const ownedSet = ownedConsumerNos ? new Set(ownedConsumerNos) : null;

  const scopedComplaints = complaints.filter(c => {
    if (subdivisionScope && !matchesSubdivisionScope(c.subdivision, subdivisionScope)) {
      return false;
    }
    if (assignedTechnicianName) {
      const target = assignedTechnicianName.trim().toLowerCase();
      const actual = (c.assignedTechnician || '').trim().toLowerCase();
      if (!actual.includes(target) && !target.includes(actual)) return false;
    }
    if (priorityFilter && priorityFilter !== 'All' && c.priority !== priorityFilter) {
      return false;
    }
    if (consumerAccountId || consumerEmail || ownedSet) {
      const emailLower = (consumerEmail || '').toLowerCase();
      if (consumerAccountId === 'demo_consumer' || emailLower === 'consumer@vidyutflow.demo') {
        const isDemoOwned =
          c.consumerNo === '04281-99231' ||
          c.consumerNo === '04281-77190' ||
          c.accountId === 'demo_consumer' ||
          Boolean(ownedSet && ownedSet.has(c.consumerNo));
        if (!isDemoOwned) return false;
      } else {
        const matchesAccount = Boolean(consumerAccountId && c.accountId === consumerAccountId);
        const matchesConn = Boolean(ownedSet && c.consumerNo && ownedSet.has(c.consumerNo));
        if (!matchesAccount && !matchesConn) return false;
      }
    }
    return true;
  });

  const statusBreakdown: ComplaintCanonicalMetrics['statusBreakdown'] = {
    Registered: 0,
    'In Review': 0,
    Dispatched: 0,
    'In Progress': 0,
    Resolved: 0,
    Closed: 0
  };

  const priorityBreakdown: ComplaintCanonicalMetrics['priorityBreakdown'] = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0
  };

  const evaluationsById: Record<string, SlaEvaluationResult> = {};
  let onTrackCount = 0;
  let approachingCount = 0;
  let breachedCount = 0;
  let resolvedCount = 0;

  for (const c of scopedComplaints) {
    if (c.status in statusBreakdown) {
      statusBreakdown[c.status] += 1;
    }
    if (c.priority in priorityBreakdown) {
      priorityBreakdown[c.priority] += 1;
    }
    const ev = evaluateComplaintSla(c, referenceNow);
    evaluationsById[c.id] = ev;
    if (ev.state === 'RESOLVED') {
      resolvedCount += 1;
    } else if (ev.state === 'BREACHED' || c.slaBreached) {
      breachedCount += 1;
    } else if (ev.state === 'APPROACHING_DEADLINE') {
      approachingCount += 1;
    } else {
      onTrackCount += 1;
    }
  }

  const totalCount = scopedComplaints.length;
  const resolvedClosedCount = statusBreakdown.Resolved + statusBreakdown.Closed;
  const activeOpenCount = totalCount - resolvedClosedCount;
  const resolutionRatePct = safePercentage(resolvedClosedCount, totalCount, 100);
  const complianceRatePct = safePercentage(
    totalCount - breachedCount,
    totalCount,
    100
  );

  return {
    scopedComplaints,
    totalCount,
    activeOpenCount,
    resolvedClosedCount,
    resolutionRatePct,
    statusBreakdown,
    priorityBreakdown,
    slaSummary: {
      onTrackCount,
      approachingCount,
      breachedCount,
      resolvedCount,
      complianceRatePct,
      evaluationsById
    }
  };
}

// ============================================================================
// 4. WORK ORDERS & FIELD ENGINEER ASSIGNMENTS SELECTOR
// ============================================================================

export function selectWorkOrderAndFieldMetrics(params: {
  workOrders: WorkOrder[];
  fieldEngineers?: FieldEngineerRecord[];
  incidents?: CriticalIncident[];
  engineerId?: string;
  engineerName?: string;
  subdivisionScope?: string;
  priorityFilter?: string;
  statusFilter?: string;
}): WorkOrderAndFieldCanonicalMetrics {
  const {
    workOrders,
    fieldEngineers = [],
    incidents = [],
    engineerId,
    engineerName,
    subdivisionScope,
    priorityFilter,
    statusFilter
  } = params;

  const matchesEngineer = (assignedTo?: string, targetName?: string): boolean => {
    if (!targetName) return true;
    if (!assignedTo) return false;
    const a = assignedTo.trim().toLowerCase();
    const b = targetName.trim().toLowerCase();
    if (a === b || a.includes(b) || b.includes(a)) return true;
    const firstToken = b.split(/\s+/)[0];
    if (firstToken && firstToken.length >= 4 && a.includes(firstToken)) return true;
    return false;
  };

  const scopedWorkOrders = workOrders.filter(wo => {
    if (subdivisionScope && !matchesSubdivisionScope(wo.subdivision, subdivisionScope)) {
      return false;
    }
    if (engineerName && !matchesEngineer(wo.assignedTo, engineerName)) {
      return false;
    }
    if (priorityFilter && priorityFilter !== 'All' && wo.priority !== priorityFilter) {
      return false;
    }
    if (statusFilter && statusFilter !== 'All' && wo.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const totalWorkOrders = scopedWorkOrders.length;
  const pendingDispatchCount = scopedWorkOrders.filter(w => w.status === 'Pending').length;
  const enRouteCount = scopedWorkOrders.filter(w => w.status === 'En Route').length;
  const onSiteCount = scopedWorkOrders.filter(w => w.status === 'On Site').length;
  const completedCount = scopedWorkOrders.filter(w => w.status === 'Completed').length;
  const deferredCount = scopedWorkOrders.filter(w => w.status === 'Deferred').length;
  const activeWorkOrdersCount = totalWorkOrders - completedCount;
  const inProgressFieldCount = enRouteCount + onSiteCount;

  const emergencyWorkOrdersActiveCount = scopedWorkOrders.filter(
    w => w.priority === 'Emergency' && w.status !== 'Completed'
  ).length;

  // Count active CRITICAL incidents assigned to this field engineer (or authorized emergency hazards)
  const fieldAuthorizedIncidents = filterIncidentsForSession(
    incidents,
    'field',
    engineerId || engineerName
      ? { id: engineerId, name: engineerName, role: 'field' }
      : undefined
  );
  const assignedActiveCriticalIncidentsCount = fieldAuthorizedIncidents.filter(
    inc =>
      inc.status !== 'RESOLVED' &&
      inc.status !== 'CLOSED' &&
      inc.severity === 'CRITICAL' &&
      // Avoid double-counting if the incident was generated directly from an Emergency work order already in scopedWorkOrders
      !scopedWorkOrders.some(wo => inc.entityType === 'work_order' && inc.entityId === wo.id)
  ).length;

  const totalActiveEmergencyCallouts =
    emergencyWorkOrdersActiveCount + assignedActiveCriticalIncidentsCount;

  const withInspectionReportCount = scopedWorkOrders.filter(w =>
    Boolean(w.inspectionReport)
  ).length;

  const completionRatePct = safePercentage(completedCount, totalWorkOrders, 100);

  const engineerWorkloads: EngineerWorkloadSummary[] = fieldEngineers.map(eng => {
    const engOrders = workOrders.filter(wo => matchesEngineer(wo.assignedTo, eng.name));
    const engActiveOrders = engOrders.filter(wo => wo.status !== 'Completed');
    const engCompletedOrders = engOrders.filter(wo => wo.status === 'Completed');
    const engEmergencyActive = engActiveOrders.filter(wo => wo.priority === 'Emergency');
    const engIncidents = filterIncidentsForSession(incidents, 'field', {
      id: eng.id,
      name: eng.name,
      role: 'field'
    }).filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED');

    return {
      engineerId: eng.id,
      engineerName: eng.name,
      subdivision: eng.subdivision,
      assignedTotalWorkOrders: engOrders.length,
      activeWorkOrders: engActiveOrders.length,
      completedWorkOrders: engCompletedOrders.length,
      emergencyActiveWorkOrders: engEmergencyActive.length,
      assignedActiveIncidents: engIncidents.length
    };
  });

  return {
    scopedWorkOrders,
    totalWorkOrders,
    activeWorkOrdersCount,
    pendingDispatchCount,
    enRouteCount,
    onSiteCount,
    inProgressFieldCount,
    completedCount,
    deferredCount,
    emergencyWorkOrdersActiveCount,
    assignedActiveCriticalIncidentsCount,
    totalActiveEmergencyCallouts,
    withInspectionReportCount,
    completionRatePct,
    engineerWorkloads
  };
}

// ============================================================================
// 5. OFFLINE QUEUE CANONICAL METRICS SELECTOR
// ============================================================================

export function selectOfflineQueueCanonicalMetrics(
  queue: FieldOfflineQueueItem[],
  isFieldSyncing: boolean = false
): OfflineQueueCanonicalMetrics {
  let pendingCount = 0;
  let processingCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let conflictCount = 0;
  let inspectionCount = 0;
  let statusCount = 0;

  for (const item of queue) {
    if (item.status === 'PENDING') pendingCount += 1;
    else if (item.status === 'PROCESSING') processingCount += 1;
    else if (item.status === 'COMPLETED') completedCount += 1;
    else if (item.status === 'FAILED') failedCount += 1;

    if (item.conflictDetected) conflictCount += 1;
    if (item.actionType === 'SITE_INSPECTION_SUBMIT') inspectionCount += 1;
    else if (item.actionType === 'WORK_ORDER_STATUS_UPDATE') statusCount += 1;
  }

  const actionableQueueCount = pendingCount + processingCount + failedCount;

  let syncHealthState: OfflineQueueCanonicalMetrics['syncHealthState'] = 'IDLE_CLEAN';
  if (isFieldSyncing || processingCount > 0) {
    syncHealthState = 'SYNCING';
  } else if (failedCount > 0 || conflictCount > 0) {
    syncHealthState = 'ATTENTION_REQUIRED';
  } else if (pendingCount > 0) {
    syncHealthState = 'PENDING_SYNC';
  }

  return {
    totalCount: queue.length,
    pendingCount,
    processingCount,
    completedCount,
    failedCount,
    conflictCount,
    actionableQueueCount,
    byActionType: {
      SITE_INSPECTION_SUBMIT: inspectionCount,
      WORK_ORDER_STATUS_UPDATE: statusCount
    },
    syncHealthState
  };
}

// ============================================================================
// 6. INCIDENT CANONICAL METRICS SELECTOR (WITH EMPLOYEE-FIRST TRIAGE & RBAC)
// ============================================================================

export function selectIncidentCanonicalMetrics(params: {
  incidents: CriticalIncident[];
  role: UserRole;
  user?: IncidentSessionUserContext | null;
}): IncidentCanonicalMetrics {
  const { incidents, role, user } = params;

  const authorizedIncidents = filterIncidentsForSession(incidents, role, user);

  const byStatus: IncidentCanonicalMetrics['byStatus'] = {
    DETECTED: 0,
    ACKNOWLEDGED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    ESCALATED: 0,
    RESOLVED: 0,
    CLOSED: 0
  };

  const bySeverity: IncidentCanonicalMetrics['bySeverity'] = {
    CRITICAL: 0,
    WARNING: 0,
    INFO: 0
  };

  let activeCount = 0;
  let unreadDetectedCount = 0;
  let criticalActiveCount = 0;
  let criticalDetectedCount = 0;
  let warningActiveCount = 0;
  let escalatedActiveCount = 0;
  let assignedToFieldActiveCount = 0;
  let resolvedClosedCount = 0;
  let pendingManagementConcurrenceCount = 0;

  for (const inc of authorizedIncidents) {
    if (inc.status in byStatus) {
      byStatus[inc.status] += 1;
    }
    if (inc.severity in bySeverity) {
      bySeverity[inc.severity] += 1;
    }

    const isClosedOrResolved = inc.status === 'RESOLVED' || inc.status === 'CLOSED';
    if (isClosedOrResolved) {
      resolvedClosedCount += 1;
    } else {
      activeCount += 1;
      if (inc.severity === 'CRITICAL') criticalActiveCount += 1;
      if (inc.severity === 'WARNING') warningActiveCount += 1;
      if (inc.status === 'ESCALATED' || inc.escalatedTo === 'management') {
        escalatedActiveCount += 1;
      }
      if (inc.assignedToUserId || inc.assignedEngineerName) {
        assignedToFieldActiveCount += 1;
      }
      if (inc.approvalStatus === 'PENDING_APPROVAL') {
        pendingManagementConcurrenceCount += 1;
      }
    }

    if (inc.status === 'DETECTED') {
      unreadDetectedCount += 1;
      if (inc.severity === 'CRITICAL') {
        criticalDetectedCount += 1;
      }
    }
  }

  return {
    authorizedIncidents,
    totalAuthorizedCount: authorizedIncidents.length,
    activeCount,
    unreadDetectedCount,
    criticalActiveCount,
    criticalDetectedCount,
    warningActiveCount,
    escalatedActiveCount,
    assignedToFieldActiveCount,
    resolvedClosedCount,
    pendingManagementConcurrenceCount,
    byStatus,
    bySeverity
  };
}

// ============================================================================
// 7. SUBDIVISION DYNAMIC PERFORMANCE & EMPLOYEE WORKLOAD SELECTOR
// ============================================================================

export function buildDynamicSubdivisionPerformanceSeries(params: {
  complaints: ComplaintRecord[];
  applications: NewConnectionApplication[];
  workOrders: WorkOrder[];
}): SubdivisionCanonicalPerformanceRow[] {
  const { complaints, applications, workOrders } = params;
  const seedComplaintIds = new Set(['CMP-8821', 'CMP-8822', 'CMP-8819', 'CMP-8815']);

  return SUBDIVISION_PERFORMANCE.map(baseRow => {
    const subdivComplaints = complaints.filter(c =>
      matchesSubdivisionScope(c.subdivision, baseRow.name)
    );
    const liveOpen = subdivComplaints.filter(
      c => c.status !== 'Resolved' && c.status !== 'Closed'
    ).length;
    const liveResolved = subdivComplaints.filter(
      c => c.status === 'Resolved' || c.status === 'Closed'
    ).length;

    // Count newly added complaints beyond seed or status changes on seed complaints
    const newlyAddedCount = subdivComplaints.filter(c => !seedComplaintIds.has(c.id)).length;
    const totalComplaintsCombined = baseRow.complaints + newlyAddedCount;

    // Compute baseline resolved count from baseline percentage, then adjust by live canonical resolutions
    const seedSubdivComplaints = subdivComplaints.filter(c => seedComplaintIds.has(c.id));
    const seedInitiallyResolved = seedSubdivComplaints.filter(c => c.id === 'CMP-8815').length;
    const seedNowResolved = seedSubdivComplaints.filter(
      c => c.status === 'Resolved' || c.status === 'Closed'
    ).length;
    const newlyAddedResolved = subdivComplaints.filter(
      c => !seedComplaintIds.has(c.id) && (c.status === 'Resolved' || c.status === 'Closed')
    ).length;

    const baselineResolvedCount = Math.round((baseRow.complaints * baseRow.resolvedPct) / 100);
    const netAdditionalResolved =
      Math.max(0, seedNowResolved - seedInitiallyResolved) + newlyAddedResolved;
    const adjustedResolvedCount = Math.min(
      totalComplaintsCombined,
      baselineResolvedCount + netAdditionalResolved
    );

    const resolvedPct = safePercentage(
      adjustedResolvedCount,
      totalComplaintsCombined,
      baseRow.resolvedPct
    );

    const activeApplicationsCount = applications.filter(
      a =>
        !a.isArchived &&
        a.status !== 'Meter Installed' &&
        a.status !== 'Rejected' &&
        matchesSubdivisionScope(a.subdivision, baseRow.name)
    ).length;

    const activeWorkOrdersCount = workOrders.filter(
      w => w.status !== 'Completed' && matchesSubdivisionScope(w.subdivision, baseRow.name)
    ).length;

    return {
      name: baseRow.name,
      baselineComplaints: baseRow.complaints,
      liveCanonicalComplaints: subdivComplaints.length,
      liveOpenComplaints: liveOpen,
      liveResolvedComplaints: liveResolved,
      totalComplaintsCombined,
      resolvedPct,
      avgTatHours: baseRow.avgTatHours,
      atcLossPct: baseRow.atcLossPct,
      activeApplicationsCount,
      activeWorkOrdersCount
    };
  });
}

export function selectEmployeeWorkloadAndSlaMetrics(params: {
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  incidents: CriticalIncident[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  fieldEngineers?: FieldEngineerRecord[];
  subdivisionScope?: string;
  activeUser?: IncidentSessionUserContext | null;
  referenceNow?: Date | string | number;
}): EmployeeWorkloadAndSlaMetrics {
  const {
    applications,
    complaints,
    workOrders,
    incidents,
    bills,
    payments,
    fieldEngineers = [],
    subdivisionScope,
    activeUser,
    referenceNow = '2026-10-15T12:00:00.000Z'
  } = params;

  const appMetrics = selectApplicationCanonicalMetrics({
    applications,
    subdivisionScope,
    referenceNow
  });

  const complaintMetrics = selectComplaintCanonicalMetrics({
    complaints,
    subdivisionScope,
    referenceNow
  });

  const incidentMetrics = selectIncidentCanonicalMetrics({
    incidents,
    role: 'employee',
    user: activeUser
  });

  const workOrderMetrics = selectWorkOrderAndFieldMetrics({
    workOrders,
    fieldEngineers,
    incidents,
    subdivisionScope
  });

  const subdivisionPerformanceSeries = buildDynamicSubdivisionPerformanceSeries({
    complaints,
    applications,
    workOrders
  });

  const reconciledLedger = bills.map(b => reconcileBillWithPayments(b, payments, '15-Oct-2026'));
  let paidBillsCount = 0;
  let unpaidBillsCount = 0;
  let partiallyPaidBillsCount = 0;
  let totalBilledAmountInr = 0;
  let totalPaidAgainstBillsInr = 0;
  let totalOutstandingAmountInr = 0;

  const billNoSet = new Set<string>();
  for (const rec of reconciledLedger) {
    billNoSet.add(rec.billNo);
    totalBilledAmountInr += Math.max(0, Number(rec.totalAmount) || 0);
    totalPaidAgainstBillsInr += Math.max(0, Number(rec.paidAmount) || 0);
    totalOutstandingAmountInr += Math.max(0, Number(rec.remainingBalance) || 0);
    if (rec.effectiveStatus === 'Paid') paidBillsCount += 1;
    else if (rec.effectiveStatus === 'Partially Paid') {
      partiallyPaidBillsCount += 1;
      unpaidBillsCount += 1;
    } else {
      unpaidBillsCount += 1;
    }
  }

  // Include archived historical payment records safely without double-counting
  const archivedPaidInr = payments
    .filter(p => p.status === 'Successful' && !billNoSet.has(p.billNo))
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0);

  const totalCollectedAmountInr = totalPaidAgainstBillsInr + archivedPaidInr;
  const totalBilledWithArchivedInr = totalBilledAmountInr + archivedPaidInr;
  const liveCollectionEfficiencyPct = safePercentage(
    totalCollectedAmountInr,
    totalBilledWithArchivedInr,
    100
  );

  const slabIntegrityWarnings = inspectHistoricalBillSlabIntegrity(bills);

  return {
    applications: appMetrics,
    complaints: complaintMetrics,
    incidents: incidentMetrics,
    workOrders: workOrderMetrics,
    subdivisionPerformanceSeries,
    liveBillingLedger: {
      totalBillsCount: reconciledLedger.length,
      paidBillsCount,
      unpaidBillsCount,
      partiallyPaidBillsCount,
      totalBilledAmountInr,
      totalCollectedAmountInr,
      totalOutstandingAmountInr,
      liveCollectionEfficiencyPct,
      slabIntegrityWarnings
    }
  };
}

// ============================================================================
// 8. MANAGEMENT OPERATIONAL PERFORMANCE & DATE-RANGE SELECTOR
// ============================================================================

export function selectManagementCanonicalMetrics(params: {
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  incidents: CriticalIncident[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  feeders?: FeederHealth[];
  timePeriod?: ManagementTimePeriod;
  activeUser?: IncidentSessionUserContext | null;
}): ManagementCanonicalMetrics {
  const {
    applications,
    complaints,
    workOrders,
    incidents,
    bills,
    payments,
    feeders = FEEDER_METRICS,
    timePeriod = 'Q2-2026',
    activeUser
  } = params;

  const appMetrics = selectApplicationCanonicalMetrics({ applications });
  const complaintMetrics = selectComplaintCanonicalMetrics({ complaints });
  const workOrderMetrics = selectWorkOrderAndFieldMetrics({ workOrders, incidents });
  const mgmtIncidentMetrics = selectIncidentCanonicalMetrics({
    incidents,
    role: 'management',
    user: activeUser
  });

  // System-wide active operational incidents (excluding RESOLVED and CLOSED)
  const activeSystemIncidents = incidents.filter(
    i => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  ).length;

  // Reconcile live ERP billing and payment ledger
  const reconciledLedger = bills.map(b => reconcileBillWithPayments(b, payments, '15-Oct-2026'));
  const billNoSet = new Set(reconciledLedger.map(r => r.billNo));
  const liveBilledActiveInr = reconciledLedger.reduce(
    (sum, r) => sum + Math.max(0, Number(r.totalAmount) || 0),
    0
  );
  const liveCollectedActiveInr = reconciledLedger.reduce(
    (sum, r) => sum + Math.max(0, Number(r.paidAmount) || 0),
    0
  );
  const liveOutstandingInr = reconciledLedger.reduce(
    (sum, r) => sum + Math.max(0, Number(r.remainingBalance) || 0),
    0
  );
  const archivedPaymentsInr = payments
    .filter(p => p.status === 'Successful' && !billNoSet.has(p.billNo))
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0);

  const liveErpTotalBilledInr = liveBilledActiveInr + archivedPaymentsInr;
  const liveErpTotalCollectedInr = liveCollectedActiveInr + archivedPaymentsInr;
  const liveErpCollectionRatePct = safePercentage(
    liveErpTotalCollectedInr,
    liveErpTotalBilledInr,
    100
  );

  // Filter EXECUTIVE_MONTHLY_METRICS by selected timePeriod:
  // 'Q2-2026' -> Q2 months (Jul, Aug, Sep)
  // 'FY26-YTD' -> Full 6-month YTD trajectory (Apr, May, Jun, Jul, Aug, Sep)
  const rawPeriodSlice =
    timePeriod === 'Q2-2026'
      ? EXECUTIVE_MONTHLY_METRICS.slice(3) // Jul, Aug, Sep
      : EXECUTIVE_MONTHLY_METRICS;         // Apr, May, Jun, Jul, Aug, Sep

  // Map live canonical billing/payment totals by short month so new bills or payments reflect in the series
  const liveByShortMonth = new Map<string, { billedInr: number; collectedInr: number }>();
  for (const rec of reconciledLedger) {
    const shortM = resolveClosingShortMonthForTrajectory(rec.billMonth);
    const current = liveByShortMonth.get(shortM) || { billedInr: 0, collectedInr: 0 };
    current.billedInr += Math.max(0, Number(rec.totalAmount) || 0);
    current.collectedInr += Math.max(0, Number(rec.paidAmount) || 0);
    liveByShortMonth.set(shortM, current);
  }

  const monthlyTrajectorySeries: ExecutiveMonthlyTrajectoryPoint[] = rawPeriodSlice.map(pt => {
    const liveDelta = liveByShortMonth.get(pt.month) || { billedInr: 0, collectedInr: 0 };
    return {
      month: pt.month,
      billedMUs: pt.billedMUs,
      collectedCr: pt.collectedCr,
      atcLossPct: pt.atcLossPct,
      liveCanonicalBilledInr: liveDelta.billedInr,
      liveCanonicalCollectedInr: liveDelta.collectedInr
    };
  });

  const monthsIncluded = monthlyTrajectorySeries.length;
  const totalBilledMUs = Number(
    monthlyTrajectorySeries.reduce((sum, m) => sum + m.billedMUs, 0).toFixed(1)
  );
  const totalCollectedCr = Number(
    monthlyTrajectorySeries.reduce((sum, m) => sum + m.collectedCr, 0).toFixed(1)
  );

  // Weighted AT&C Loss % across the selected period (latest month for Q2 snapshot or weighted average for YTD)
  const weightedAtcLossPct =
    timePeriod === 'Q2-2026'
      ? monthlyTrajectorySeries[monthlyTrajectorySeries.length - 1]?.atcLossPct ?? 12.4
      : monthsIncluded > 0
      ? Number(
          (
            monthlyTrajectorySeries.reduce((sum, m) => sum + m.atcLossPct, 0) /
            monthsIncluded
          ).toFixed(1)
        )
      : 12.4;

  const atcLossTargetVariancePct = Number((weightedAtcLossPct - 11.5).toFixed(1));

  const billingEfficiencyPct = timePeriod === 'Q2-2026' ? 91.6 : 90.9;

  // Collection efficiency incorporates live canonical collection updates relative to baseline
  const baselineCollectionPct = timePeriod === 'Q2-2026' ? 98.4 : 97.9;
  const seedCollectedBaselineInr = 2537 + 2435 + 15210; // ₹20,182 initial seed paid
  const additionalLiveCollectedInr = Math.max(0, liveErpTotalCollectedInr - seedCollectedBaselineInr);
  const collectionBoostPct =
    additionalLiveCollectedInr > 0
      ? Math.min(1.5, Number(((additionalLiveCollectedInr / 17039) * 0.8).toFixed(1)))
      : 0;
  const collectionEfficiencyPct = Number(
    Math.min(99.9, baselineCollectionPct + collectionBoostPct).toFixed(1)
  );

  const latestPoint = monthlyTrajectorySeries[monthlyTrajectorySeries.length - 1] || {
    billedMUs: 161.9,
    collectedCr: 79.6
  };

  // Feeder health aggregation
  const totalFeeders = feeders.length;
  const criticalOverloadCount = feeders.filter(f => f.status === 'Critical Overload').length;
  const warningCount = feeders.filter(f => f.status === 'Warning').length;
  const optimalCount = feeders.filter(f => f.status === 'Optimal').length;
  const averageUtilizationPct =
    totalFeeders > 0
      ? Number(
          (
            feeders.reduce((sum, f) => sum + (Number(f.utilizationPct) || 0), 0) /
            totalFeeders
          ).toFixed(1)
        )
      : 0;
  const totalTrippingEvents30d = feeders.reduce(
    (sum, f) => sum + Math.max(0, Number(f.trippingEventsPast30d) || 0),
    0
  );
  const totalConsumersConnected = feeders.reduce(
    (sum, f) => sum + Math.max(0, Number(f.consumersConnected) || 0),
    0
  );

  const subdivisionPerformanceSeries = buildDynamicSubdivisionPerformanceSeries({
    complaints,
    applications,
    workOrders
  });

  return {
    timePeriod,
    periodLabel: timePeriod === 'Q2-2026' ? 'Q2 FY26 (Jul–Sep)' : 'FY 2025-26 YTD (Apr–Sep)',
    monthsIncluded,
    erpPulse: {
      pendingApplications: appMetrics.inProgressCount,
      completedApplications: appMetrics.completedEnergizedCount,
      archivedApplications: appMetrics.archivedCount,
      openComplaints: complaintMetrics.activeOpenCount,
      resolvedComplaints: complaintMetrics.resolvedClosedCount,
      activeWorkOrders: workOrderMetrics.activeWorkOrdersCount,
      completedWorkOrders: workOrderMetrics.completedCount,
      activeSystemIncidents,
      escalatedToManagementIncidents: mgmtIncidentMetrics.activeCount
    },
    executiveKpis: {
      weightedAtcLossPct,
      atcLossTargetVariancePct,
      billingEfficiencyPct,
      collectionEfficiencyPct,
      totalBilledMUs,
      totalCollectedCr,
      latestMonthBilledMUs: latestPoint.billedMUs,
      latestMonthCollectedCr: latestPoint.collectedCr,
      liveErpCollectionRatePct,
      liveErpTotalBilledInr,
      liveErpTotalCollectedInr,
      liveErpTotalOutstandingInr: liveOutstandingInr
    },
    monthlyTrajectorySeries,
    feederSummary: {
      totalFeeders,
      criticalOverloadCount,
      warningCount,
      optimalCount,
      averageUtilizationPct,
      totalTrippingEvents30d,
      totalConsumersConnected
    },
    subdivisionPerformanceSeries
  };
}

// ============================================================================
// 9. ADMIN SYSTEM & DEMO OPERATIONAL STATISTICS SELECTOR
// ============================================================================

export function selectAdminCanonicalMetrics(params: {
  consumers: ConsumerProfile[];
  connections: ElectricityConnection[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  incidents: CriticalIncident[];
  notifications: AppNotification[];
  auditLogs: AuditLogItem[];
  fieldOfflineQueue: FieldOfflineQueueItem[];
  employees: EmployeeRecord[];
  fieldEngineers: FieldEngineerRecord[];
  systemServices?: SystemServiceStatus[];
  staffUsers?: Array<{ id: string; status: 'Active' | 'Locked' }>;
}): AdminCanonicalMetrics {
  const {
    consumers,
    connections,
    applications,
    complaints,
    workOrders,
    bills,
    payments,
    incidents,
    notifications,
    auditLogs,
    fieldOfflineQueue,
    employees,
    fieldEngineers,
    systemServices = SYSTEM_SERVICES,
    staffUsers = []
  } = params;

  const totalServices = systemServices.length;
  const operationalCount = systemServices.filter(s => s.status === 'Operational').length;
  const degradedCount = systemServices.filter(s => s.status === 'Degraded').length;
  const downCount = systemServices.filter(s => s.status === 'Down').length;
  const averageLatencyMs =
    totalServices > 0
      ? Math.round(
          systemServices.reduce((sum, s) => sum + (Number(s.latencyMs) || 0), 0) /
            totalServices
        )
      : 0;
  const averageUptime90dPct =
    totalServices > 0
      ? Number(
          (
            systemServices.reduce((sum, s) => sum + (Number(s.uptime90d) || 0), 0) /
            totalServices
          ).toFixed(2)
        )
      : 100;

  const activeStaffCount =
    staffUsers.length > 0
      ? staffUsers.filter(u => u.status === 'Active').length
      : employees.length + fieldEngineers.length;
  const lockedStaffCount =
    staffUsers.length > 0 ? staffUsers.filter(u => u.status === 'Locked').length : 0;

  const successCount = auditLogs.filter(l => l.status === 'SUCCESS').length;
  const warningCount = auditLogs.filter(l => l.status === 'WARNING').length;
  const failedCount = auditLogs.filter(l => l.status === 'FAILED').length;
  const securityEventsCount = auditLogs.filter(
    l =>
      l.status === 'WARNING' ||
      l.status === 'FAILED' ||
      l.action.includes('ACCESS_DENIED') ||
      l.action.includes('LOGIN') ||
      l.action.includes('BACKUP') ||
      l.action.includes('RESTORE')
  ).length;

  const reconciledBills = bills.map(b => reconcileBillWithPayments(b, payments, '15-Oct-2026'));
  const billNoSet = new Set(reconciledBills.map(r => r.billNo));
  const unpaidBills = reconciledBills.filter(r => r.effectiveStatus !== 'Paid').length;
  const paidBills = reconciledBills.filter(r => r.effectiveStatus === 'Paid').length;
  const totalBilledInr = reconciledBills.reduce(
    (sum, r) => sum + Math.max(0, Number(r.totalAmount) || 0),
    0
  );
  const totalPaidAgainstBillsInr = reconciledBills.reduce(
    (sum, r) => sum + Math.max(0, Number(r.paidAmount) || 0),
    0
  );
  const archivedPaidInr = payments
    .filter(p => p.status === 'Successful' && !billNoSet.has(p.billNo))
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0);
  const totalCollectedInr = totalPaidAgainstBillsInr + archivedPaidInr;
  const totalOutstandingInr = reconciledBills.reduce(
    (sum, r) => sum + Math.max(0, Number(r.remainingBalance) || 0),
    0
  );

  const activeApplications = applications.filter(
    a => !a.isArchived && a.status !== 'Meter Installed' && a.status !== 'Rejected'
  ).length;
  const archivedApplications = applications.filter(a => Boolean(a.isArchived)).length;
  const openComplaints = complaints.filter(
    c => c.status !== 'Resolved' && c.status !== 'Closed'
  ).length;
  const resolvedComplaints = complaints.length - openComplaints;
  const activeWorkOrders = workOrders.filter(w => w.status !== 'Completed').length;
  const completedWorkOrders = workOrders.filter(w => w.status === 'Completed').length;
  const activeIncidents = incidents.filter(
    i => i.status !== 'RESOLVED' && i.status !== 'CLOSED'
  ).length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const queueMetrics = selectOfflineQueueCanonicalMetrics(fieldOfflineQueue);

  const totalCanonicalRecords =
    consumers.length +
    connections.length +
    applications.length +
    complaints.length +
    workOrders.length +
    bills.length +
    payments.length +
    incidents.length +
    notifications.length +
    auditLogs.length +
    fieldOfflineQueue.length +
    employees.length +
    fieldEngineers.length;

  return {
    serviceHealth: {
      totalServices,
      operationalCount,
      degradedCount,
      downCount,
      averageLatencyMs,
      averageUptime90dPct
    },
    staffDirectory: {
      totalStaff: staffUsers.length > 0 ? staffUsers.length : employees.length + fieldEngineers.length,
      activeStaffCount,
      lockedStaffCount,
      erpEmployeesCount: employees.length,
      fieldEngineersCount: fieldEngineers.length
    },
    auditSummary: {
      totalLogs: auditLogs.length,
      successCount,
      warningCount,
      failedCount,
      securityEventsCount
    },
    demoRepositoryStats: {
      totalConsumers: consumers.length,
      totalConnections: connections.length,
      activeApplications,
      archivedApplications,
      totalComplaints: complaints.length,
      openComplaints,
      resolvedComplaints,
      totalWorkOrders: workOrders.length,
      activeWorkOrders,
      completedWorkOrders,
      totalBills: bills.length,
      unpaidBills,
      paidBills,
      totalPayments: payments.length,
      totalBilledInr,
      totalCollectedInr,
      totalOutstandingInr,
      activeIncidents,
      totalIncidents: incidents.length,
      totalNotifications: notifications.length,
      unreadNotifications,
      offlineQueueTotal: queueMetrics.totalCount,
      offlineQueuePending: queueMetrics.pendingCount,
      offlineQueueCompleted: queueMetrics.completedCount,
      offlineQueueFailed: queueMetrics.failedCount,
      totalCanonicalRecords
    }
  };
}

// ============================================================================
// 10. NOTIFICATION CANONICAL METRICS SELECTOR
// ============================================================================

export function selectNotificationCanonicalMetrics(
  scopedNotifications: AppNotification[]
): NotificationCanonicalMetrics {
  const byCategory: NotificationCanonicalMetrics['byCategory'] = {
    Billing: 0,
    Approval: 0,
    Outage: 0,
    Inspection: 0,
    Security: 0,
    Other: 0
  };

  const byType: NotificationCanonicalMetrics['byType'] = {
    info: 0,
    warning: 0,
    alert: 0,
    success: 0
  };

  let unreadCount = 0;
  let readCount = 0;
  let urgentUnreadCount = 0;

  for (const n of scopedNotifications) {
    if (n.read) readCount += 1;
    else {
      unreadCount += 1;
      if (n.type === 'alert' || n.type === 'warning') {
        urgentUnreadCount += 1;
      }
    }

    if (n.category in byCategory) {
      byCategory[n.category as keyof typeof byCategory] += 1;
    } else {
      byCategory.Other += 1;
    }

    if (n.type in byType) {
      byType[n.type] += 1;
    }
  }

  return {
    totalCount: scopedNotifications.length,
    unreadCount,
    readCount,
    urgentUnreadCount,
    byCategory,
    byType
  };
}

// ============================================================================
// 11. MULTILINGUAL LABELS & TOOLTIPS FOR PHASE 6 CANONICAL ANALYTICS
// ============================================================================

export interface CanonicalAnalyticsTranslations {
  avgMonthlyKwhLabel: string;
  avgMonthlyBillLabel: string;
  insufficientTrendHistoryNote: string;
  connectionScopedSeriesBadge: string;
  liveErpCollectionLedgerTitle: string;
  liveErpBilledLabel: string;
  liveErpCollectedLabel: string;
  liveErpOutstandingLabel: string;
  liveErpCollectionEfficiencyLabel: string;
  periodSummaryBadgeQ2: string;
  periodSummaryBadgeYtd: string;
  adminLiveDemoRepoTitle: string;
  adminLiveDemoRepoSub: string;
  adminTotalCanonicalRecordsLabel: string;
  adminActiveConnectionsLabel: string;
  adminReconciledCollectionLabel: string;
  adminOpenWorkflowsLabel: string;
  processingQueueLabel: string;
}

const CANONICAL_ANALYTICS_TRANSLATIONS: Record<LanguageCode, CanonicalAnalyticsTranslations> = {
  en: {
    avgMonthlyKwhLabel: 'Avg Consumption',
    avgMonthlyBillLabel: 'Avg Monthly Bill',
    insufficientTrendHistoryNote: 'Showing verified billing cycles for this connection. Full 6-month trend builds as new bills are issued.',
    connectionScopedSeriesBadge: 'Connection-Scoped Ledger',
    liveErpCollectionLedgerTitle: 'Live Canonical ERP Billing & Collection Ledger',
    liveErpBilledLabel: 'Canonical Billed (Active)',
    liveErpCollectedLabel: 'Reconciled Collected',
    liveErpOutstandingLabel: 'Net Outstanding Due',
    liveErpCollectionEfficiencyLabel: 'Live Ledger Realization',
    periodSummaryBadgeQ2: 'Q2 FY26 Window (Jul–Sep)',
    periodSummaryBadgeYtd: 'FY26 YTD Window (Apr–Sep)',
    adminLiveDemoRepoTitle: 'Live Canonical DEMO Repository State',
    adminLiveDemoRepoSub: 'Real-time record counts derived from active browser state (updates immediately on mutations & backup restores)',
    adminTotalCanonicalRecordsLabel: 'Total Canonical Records',
    adminActiveConnectionsLabel: 'Connections & Bills',
    adminReconciledCollectionLabel: 'Reconciled Collections',
    adminOpenWorkflowsLabel: 'Active Workflows & Queue',
    processingQueueLabel: 'Processing'
  },
  gu: {
    avgMonthlyKwhLabel: 'સરેરાશ વપરાશ',
    avgMonthlyBillLabel: 'સરેરાશ માસિક બિલ',
    insufficientTrendHistoryNote: 'આ કનેક્શન માટે પ્રમાણિત બિલિંગ ચક્ર દર્શાવેલ છે. નવા બિલ જનરેટ થતાં ૬-મહિનાનો ટ્રેન્ડ બનશે.',
    connectionScopedSeriesBadge: 'કનેક્શન-આધારિત ખાતાવહી',
    liveErpCollectionLedgerTitle: 'લાઇવ કેનોનિકલ ERP બિલિંગ અને વસૂલાત ખાતાવહી',
    liveErpBilledLabel: 'કુલ બિલ રકમ (સક્રિય)',
    liveErpCollectedLabel: 'સમાયોજિત વસૂલાત',
    liveErpOutstandingLabel: 'ચોખ્ખી બાકી રકમ',
    liveErpCollectionEfficiencyLabel: 'લાઇવ વસૂલાત દર',
    periodSummaryBadgeQ2: 'Q2 FY26 સમયગાળો (જુલાઈ–સપ્ટે)',
    periodSummaryBadgeYtd: 'FY26 YTD સમયગાળો (એપ્રિલ–સપ્ટે)',
    adminLiveDemoRepoTitle: 'લાઇવ કેનોનિકલ DEMO રિપોઝિટરી સ્થિતિ',
    adminLiveDemoRepoSub: 'સક્રિય બ્રાઉઝર સ્ટેટમાંથી મેળવેલ વાસ્તવિક રેકોર્ડ ગણતરી (ફેરફારો અને બેકઅપ રિસ્ટોર પર તરત અપડેટ થાય છે)',
    adminTotalCanonicalRecordsLabel: 'કુલ કેનોનિકલ રેકોર્ડ્સ',
    adminActiveConnectionsLabel: 'કનેક્શન્સ અને બિલ્સ',
    adminReconciledCollectionLabel: 'સમાયોજિત વસૂલાત',
    adminOpenWorkflowsLabel: 'સક્રિય વર્કફ્લો અને કતાર',
    processingQueueLabel: 'પ્રક્રિયા હેઠળ'
  },
  hi: {
    avgMonthlyKwhLabel: 'औसत खपत',
    avgMonthlyBillLabel: 'औसत मासिक बिल',
    insufficientTrendHistoryNote: 'इस कनेक्शन के सत्यापित बिलिंग चक्र दिखाए गए हैं। नए बिल जारी होने पर 6-माह का रुझान बनेगा।',
    connectionScopedSeriesBadge: 'कनेक्शन-आधारित लेजर',
    liveErpCollectionLedgerTitle: 'लाइव कैननिकल ERP बिलिंग एवं संग्रह लेजर',
    liveErpBilledLabel: 'कुल बिल राशि (सक्रिय)',
    liveErpCollectedLabel: 'समायोजित संग्रह',
    liveErpOutstandingLabel: 'शुद्ध बकाया राशि',
    liveErpCollectionEfficiencyLabel: 'लाइव संग्रह दक्षता',
    periodSummaryBadgeQ2: 'Q2 FY26 अवधि (जुलाई–सितंबर)',
    periodSummaryBadgeYtd: 'FY26 YTD अवधि (अप्रैल–सितंबर)',
    adminLiveDemoRepoTitle: 'लाइव कैननिकल DEMO रिपॉजिटरी स्थिति',
    adminLiveDemoRepoSub: 'सक्रिय ब्राउज़र स्टेट से प्राप्त वास्तविक रिकॉर्ड संख्या (बदलाव और बैकअप रिस्टोर पर तुरंत अपडेट)',
    adminTotalCanonicalRecordsLabel: 'कुल कैननिकल रिकॉर्ड्स',
    adminActiveConnectionsLabel: 'कनेक्शन और बिल',
    adminReconciledCollectionLabel: 'समायोजित संग्रह',
    adminOpenWorkflowsLabel: 'सक्रिय वर्कफ़्लो और कतार',
    processingQueueLabel: 'प्रक्रियाधीन'
  },
  mr: {
    avgMonthlyKwhLabel: 'सरासरी वापर',
    avgMonthlyBillLabel: 'सरासरी मासिक देयक',
    insufficientTrendHistoryNote: 'या कनेक्शनसाठी सत्यापित देयक चक्रे दर्शविली आहेत. नवीन देयके जारी झाल्यावर ६-महिन्यांचा कल तयार होईल.',
    connectionScopedSeriesBadge: 'कनेक्शन-आधारित खातेवही',
    liveErpCollectionLedgerTitle: 'लाईव्ह कॅनॉनिकल ERP बिलिंग आणि वसुली खातेवही',
    liveErpBilledLabel: 'एकूण देयक रक्कम (सक्रिय)',
    liveErpCollectedLabel: 'समायोजित वसुली',
    liveErpOutstandingLabel: 'निव्वळ थकबाकी',
    liveErpCollectionEfficiencyLabel: 'लाईव्ह वसुली कार्यक्षमता',
    periodSummaryBadgeQ2: 'Q2 FY26 कालावधी (जुलै–सप्टें)',
    periodSummaryBadgeYtd: 'FY26 YTD कालावधी (एप्रिल–सप्टें)',
    adminLiveDemoRepoTitle: 'लाईव्ह कॅनॉनिकल DEMO रिपॉझिटरी स्थिती',
    adminLiveDemoRepoSub: 'सक्रिय ब्राउझर स्टेटमधून मिळालेली वास्तविक रेकॉर्ड संख्या (बदल आणि बॅकअप रिस्टोरवर त्वरित अपडेट)',
    adminTotalCanonicalRecordsLabel: 'एकूण कॅनॉनिकल रेकॉर्ड्स',
    adminActiveConnectionsLabel: 'कनेक्शन्स आणि देयके',
    adminReconciledCollectionLabel: 'समायोजित वसुली',
    adminOpenWorkflowsLabel: 'सक्रिय वर्कफ्लो आणि रांग',
    processingQueueLabel: 'प्रक्रियेत'
  }
};

export function getCanonicalAnalyticsTranslations(
  language: LanguageCode = 'en'
): CanonicalAnalyticsTranslations {
  return CANONICAL_ANALYTICS_TRANSLATIONS[language] || CANONICAL_ANALYTICS_TRANSLATIONS.en;
}
