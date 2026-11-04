import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getAdminUiDictionary,
  localizeSystemService,
  localizeAdminUserRole,
  localizeAdminUserStatus,
  localizeAdminSubdivision,
  localizeRbacModuleName,
  localizeRbacToggleAria,
  localizeAuditStatusFilter,
  localizeAuditLogEntry
} from '../../i18n/adminContentTranslations';
import {
  localizeEmployeeDesignation,
  localizeAIRecommendation
} from '../../i18n/employeeContentTranslations';
import { localizeNotificationTimestamp } from '../../i18n/consumerContentTranslations';
import {
  SYSTEM_SERVICES
} from '../../data/mockData';
import { ExportMenu } from '../common/ExportMenu';
import { LiveWorkflowKpis } from '../common/LiveWorkflowKpis';
import { LiveAlertEnginePanel } from '../common/LiveAlertEnginePanel';
import { LiveAiGovernancePanel } from '../common/LiveAiGovernancePanel';
import { LiveErpAdapterPanel } from './LiveErpAdapterPanel';
import { AdminMeterOcrHealthSection } from './AdminMeterOcrHealthSection';
import { LiveWorkflowTemplatesPanel } from './LiveWorkflowTemplatesPanel';
import { LiveStaffAssignmentPanel } from './LiveStaffAssignmentPanel';
import { LivePerformanceTelemetryPanel } from './LivePerformanceTelemetryPanel';
import { safeLoadStorage } from '../../utils/securityHardening';
import {
  ADMIN_STAFF_USERS_STORAGE_KEY,
  ADMIN_RBAC_PERMISSIONS_STORAGE_KEY,
  getDemoBackupUiDictionary
} from '../../utils/demoBackupEngine';
import {
  selectAdminCanonicalMetrics,
  getCanonicalAnalyticsTranslations
} from '../../utils/canonicalAnalytics';
import { STEP4C_CLOCK_AND_SYNC_I18N } from '../../utils/businessClockEngine';
import { DEFAULT_LATE_CHARGE_POLICY, getLateChargeLocalization } from '../../utils/lateChargeEngine';
import { deriveCanonical9FieldBillStatement, getFormalNoticeTranslations } from '../../utils/formalNoticeEngine';
import { reconcileBillWithPayments } from '../../utils/billingEngine';
import { AdminDemoBackupCenter } from './AdminDemoBackupCenter';
import { LazyOutageMapSection } from '../outageMap/LazyOutageMapSection';
import { OrganizationalDirectoryWorkspace } from './OrganizationalDirectoryWorkspace';
import {
  Activity,
  Users,
  KeyRound,
  FileSearch,
  Server,
  ShieldCheck,
  Settings,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Shield,
  Calculator,
  Percent,
  FileCheck,
  Layers,
  Clock
} from 'lucide-react';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  subdivision: string;
  status: 'Active' | 'Locked';
  lastLogin: string;
}

const INITIAL_USERS: MockUser[] = [
  { id: 'USR-101', name: 'Rajesh V. Trivedi', email: 'rajesh.trivedi@ugvcl.gov.in', role: 'Office Employee ERP', subdivision: 'Gandhinagar Sub-Div 2', status: 'Active', lastLogin: '15-Oct 06:12' },
  { id: 'USR-102', name: 'Vikramaditya Solanki', email: 'vikram.solanki@ugvcl.gov.in', role: 'Field Engineer', subdivision: 'Mehsana Rural Feeder Wing', status: 'Active', lastLogin: '15-Oct 05:45' },
  { id: 'USR-103', name: 'Dr. Harita Joshi', email: 'harita.joshi@ugvcl.gov.in', role: 'Management', subdivision: 'UGVCL Corporate Mehsana', status: 'Active', lastLogin: '14-Oct 19:20' },
  { id: 'USR-104', name: 'K. V. Sharma', email: 'kv.sharma@ugvcl.gov.in', role: 'System Administrator', subdivision: 'State Data Center / IT Cell', status: 'Active', lastLogin: '15-Oct 06:01' },
  { id: 'USR-105', name: 'Ramesh Barot', email: 'ramesh.barot@ugvcl.gov.in', role: 'Office Employee ERP', subdivision: 'Mehsana Industrial GIDC', status: 'Active', lastLogin: '14-Oct 17:30' },
  { id: 'USR-106', name: 'Dinesh Vaghela', email: 'dinesh.vaghela@ugvcl.gov.in', role: 'Field Engineer', subdivision: 'Gandhinagar Sub-Div 2', status: 'Locked', lastLogin: '11-Oct 09:15' }
];

interface PermissionRow {
  module: string;
  consumer: boolean;
  employee: boolean;
  field: boolean;
  management: boolean;
  admin: boolean;
}

const INITIAL_PERMISSIONS: PermissionRow[] = [
  { module: 'New Connection Sanction Approval', consumer: false, employee: true, field: false, management: true, admin: true },
  { module: 'Field Feasibility & Meter Audit Submission', consumer: false, employee: false, field: true, management: false, admin: true },
  { module: 'Electricity Bill Adjustment & Tariff Modification', consumer: false, employee: true, field: false, management: true, admin: true },
  { module: 'Grievance Redressal Dispatch & Closure', consumer: false, employee: true, field: true, management: false, admin: true },
  { module: 'Citizen Bill Payment & Self Service Portal', consumer: true, employee: false, field: false, management: false, admin: true },
  { module: 'SCADA Feeder Telemetry & AT&C Loss Dashboard', consumer: false, employee: true, field: false, management: true, admin: true },
  { module: 'RBAC Security Matrix & System Audit Logs', consumer: false, employee: false, field: false, management: false, admin: true }
];

export const AdminPortal: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
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
    showToast,
    activeUser,
    recommendations,
    openApprovalModal,
    businessReferenceDate,
    businessClockState,
    businessClockMode,
    resetBusinessClockToLiveIst,
    stepBusinessDateByDays,
    formalNotices,
    lateChargeWaivers,
    paymentReversals
  } = useApp();
  const { language, t } = useLanguage();
  const lcDict = getLateChargeLocalization(language);
  const fnDict = getFormalNoticeTranslations(language);
  const step4cDict = STEP4C_CLOCK_AND_SYNC_I18N[language] || STEP4C_CLOCK_AND_SYNC_I18N.en;
  const ad = getAdminUiDictionary(language);
  const bkpDict = getDemoBackupUiDictionary(language);
  const caTranslations = getCanonicalAnalyticsTranslations(language);
  const [users, setUsers] = useState<MockUser[]>(() =>
    safeLoadStorage(ADMIN_STAFF_USERS_STORAGE_KEY, INITIAL_USERS)
  );
  const [permissions, setPermissions] = useState<PermissionRow[]>(() =>
    safeLoadStorage(ADMIN_RBAC_PERMISSIONS_STORAGE_KEY, INITIAL_PERMISSIONS)
  );

  const overdueAuditBills = useMemo(() => {
    return bills
      .map(bill => {
        const conn = connections.find(c => c.consumerNo === bill.consumerNo);
        const reconciled = reconcileBillWithPayments(
          bill,
          payments,
          businessReferenceDate,
          {
            waivers: lateChargeWaivers,
            reversals: paymentReversals,
            tariffCategory: conn?.tariffCategory
          }
        );
        const stmt = deriveCanonical9FieldBillStatement({
          bill,
          connection: conn,
          payments,
          waivers: lateChargeWaivers,
          reversals: paymentReversals,
          referenceDate: businessReferenceDate
        });
        return { bill, conn, reconciled, stmt };
      })
      .filter(item => item.reconciled.isOverdue && item.reconciled.outstandingBalance > 0);
  }, [bills, connections, payments, lateChargeWaivers, paymentReversals, businessReferenceDate]);

  const adminCanonicalMetrics = useMemo(
    () =>
      selectAdminCanonicalMetrics({
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
        systemServices: SYSTEM_SERVICES,
        staffUsers: users
      }),
    [
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
      users
    ]
  );
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING' | 'FAILED'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 15;

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter(log => {
      const matchesStatus = auditFilter === 'ALL' || log.status === auditFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      const locLog = localizeAuditLogEntry(log, language);
      return (
        log.id.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.resource.toLowerCase().includes(q) ||
        locLog.actionLabel.toLowerCase().includes(q) ||
        locLog.role.toLowerCase().includes(q) ||
        locLog.resource.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditFilter, auditSearch, language]);

  const totalAuditPages = Math.max(1, Math.ceil(filteredAuditLogs.length / AUDIT_PAGE_SIZE));
  const safeAuditPage = Math.min(auditPage, totalAuditPages);
  const paginatedAuditLogs = useMemo(
    () =>
      filteredAuditLogs.slice(
        (safeAuditPage - 1) * AUDIT_PAGE_SIZE,
        safeAuditPage * AUDIT_PAGE_SIZE
      ),
    [filteredAuditLogs, safeAuditPage]
  );

  const toggleUserStatus = (id: string) => {
    setUsers(prev => {
      const next = prev.map(u => (u.id === id ? { ...u, status: u.status === 'Active' ? 'Locked' : 'Active' } : u)) as MockUser[];
      try {
        localStorage.setItem(ADMIN_STAFF_USERS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(`User ${id} access state toggled (Demo)`, 'info');
  };

  const togglePermission = (rowIndex: number, role: keyof Omit<PermissionRow, 'module'>) => {
    setPermissions(prev => {
      const copy = [...prev];
      copy[rowIndex] = { ...copy[rowIndex], [role]: !copy[rowIndex][role] };
      try {
        localStorage.setItem(ADMIN_RBAC_PERMISSIONS_STORAGE_KEY, JSON.stringify(copy));
      } catch {}
      return copy;
    });
    showToast('Permission matrix updated in volatile session', 'info');
  };

  const handleTriggerBackup = () => {
    setIsBackupRunning(true);
    showToast('Simulated database snapshot triggered (PostgreSQL Cluster)', 'info');
    setTimeout(() => {
      setIsBackupRunning(false);
      showToast('Simulated snapshot completed: 184.6 GB archived to GSDC cold storage', 'success');
    }, 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
            <img src="/assets/ugvcl-logo.png" alt={ad.logoAltText} className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                {ad.topBarTitle}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {ad.topBarBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>{ad.topBarSubtitlePrefix}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{activeUser.name}</span>
              <span>({localizeEmployeeDesignation(activeUser.designation, language)})</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            type="button"
            data-testid="admin-open-backup-center-btn"
            onClick={() => setActiveTab('infra')}
            className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{bkpDict.demoScopeBadge}</span>
          </button>
          <button
            onClick={() => showToast('Simulated zero-downtime certificate renewal', 'success')}
            className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {ad.checkSslBtn}
          </button>
        </div>
      </div>

      {/* VIEW 1: SYSTEM OVERVIEW & INTEGRATIONS */}
      {(activeTab === 'overview' || activeTab === 'integrations') && (
        <div className="space-y-4 sm:space-y-6">
          {activeTab === 'integrations' && (
            <>
              <LiveErpAdapterPanel />
              <AdminMeterOcrHealthSection />
            </>
          )}
          <LiveWorkflowKpis />
          {/* Bento Health Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {ad.kpiMicroservicesTitle}
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {ad.kpiMicroservicesValue}
              </div>
              <span className="text-xs text-slate-500">{ad.kpiMicroservicesSub}</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {ad.kpiGatewayTitle}
              </span>
              <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
                {ad.kpiGatewayValue}
              </div>
              <span className="text-xs text-slate-500">{ad.kpiGatewaySub}</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {ad.kpiAmrTitle}
              </span>
              <div className="text-2xl font-extrabold text-teal-600 tabular-nums">
                {ad.kpiAmrValue}
              </div>
              <span className="text-xs text-slate-500">{ad.kpiAmrSub}</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {ad.kpiThreatTitle}
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {ad.kpiThreatValue}
              </div>
              <span className="text-xs text-emerald-600 font-medium">{ad.kpiThreatSub}</span>
            </div>
          </div>

          {/* Live Canonical DEMO Repository State Strip */}
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>{caTranslations.adminLiveDemoRepoTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {caTranslations.adminLiveDemoRepoSub}
                </p>
              </div>
              <span
                data-testid="admin-total-canonical-records"
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto"
              >
                {caTranslations.adminTotalCanonicalRecordsLabel}: {adminCanonicalMetrics.demoRepositoryStats.totalCanonicalRecords}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {caTranslations.adminActiveConnectionsLabel}
                </span>
                <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                  {adminCanonicalMetrics.demoRepositoryStats.totalConnections} Conn · {adminCanonicalMetrics.demoRepositoryStats.totalBills} Bills
                </div>
                <span className="text-[11px] text-slate-500">
                  {adminCanonicalMetrics.demoRepositoryStats.paidBills} Paid / {adminCanonicalMetrics.demoRepositoryStats.unpaidBills} Unpaid
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {caTranslations.adminReconciledCollectionLabel}
                </span>
                <div
                  data-testid="admin-reconciled-collected-inr"
                  className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums"
                >
                  ₹{adminCanonicalMetrics.demoRepositoryStats.totalCollectedInr.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-500">
                  {adminCanonicalMetrics.demoRepositoryStats.totalPayments} Txns · Due ₹{adminCanonicalMetrics.demoRepositoryStats.totalOutstandingInr.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  {caTranslations.adminOpenWorkflowsLabel}
                </span>
                <div className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
                  {adminCanonicalMetrics.demoRepositoryStats.activeApplications} Apps · {adminCanonicalMetrics.demoRepositoryStats.openComplaints} Cmp · {adminCanonicalMetrics.demoRepositoryStats.activeWorkOrders} WO
                </div>
                <span className="text-[11px] text-slate-500">
                  Queue: {adminCanonicalMetrics.demoRepositoryStats.offlineQueuePending} Pending / {adminCanonicalMetrics.demoRepositoryStats.offlineQueueTotal} Total
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Audit & Staff Governance
                </span>
                <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                  {adminCanonicalMetrics.auditSummary.totalLogs} Logs ({adminCanonicalMetrics.auditSummary.warningCount + adminCanonicalMetrics.auditSummary.failedCount} Alerts)
                </div>
                <span className="text-[11px] text-slate-500">
                  Staff: {adminCanonicalMetrics.staffDirectory.activeStaffCount} Active / {adminCanonicalMetrics.staffDirectory.lockedStaffCount} Locked
                </span>
              </div>
            </div>
          </div>

          {/* Step 4A: Late Payment Surcharge (DPS) Policy & Calculation Audit Panel */}
          <div
            data-testid="admin-late-charge-policy-panel"
            className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>{language === 'gu' ? 'વિલંબિત ચુકવણી સરચાર્જ (DPS) નીતિ અને ઓડિટ' : language === 'hi' ? 'विलंबित भुगतान अधिभार (DPS) नीति एवं गणना ऑडिट' : language === 'mr' ? 'विलंबित देयक अधिभार (DPS) धोरण आणि हिशोब ऑडिट' : 'Late-Payment Surcharge (DPS) Policy & Calculation Audit'}</span>
                    <span data-testid="admin-dps-policy-id" className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {DEFAULT_LATE_CHARGE_POLICY.policyId} v{DEFAULT_LATE_CHARGE_POLICY.version}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'gu' ? 'દૈનિક સાદા વ્યાજ ગણતરી મોડેલ (સંદર્ભ તારીખ આધારિત)' : language === 'hi' ? 'दैनिक साधारण ब्याज गणना मॉडल (व्यवसायिक संदर्भ तिथि आधारित)' : language === 'mr' ? 'दैनिक सरळव्याज हिशोब मॉडेल (संदर्भ दिनांक आधारित)' : 'Daily simple accrual policy with effective-dated category overrides'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  data-testid="admin-business-clock-mode-badge"
                  className={`text-[11px] font-bold px-2 py-1 rounded border flex items-center gap-1.5 ${
                    businessClockMode === 'DEV_OVERRIDE'
                      ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                      : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {businessClockMode === 'DEV_OVERRIDE'
                      ? step4cDict.devOverrideBadge
                      : step4cDict.liveAsiaKolkataBadge}
                  </span>
                </span>
                <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {step4cDict.activeBusinessDateLabel}: <strong>{businessReferenceDate}</strong>
                </span>
                <button
                  type="button"
                  data-testid="admin-simulate-rollover-btn"
                  onClick={() => stepBusinessDateByDays(1)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  {step4cDict.stepForwardOneDayBtn}
                </button>
                {businessClockMode === 'DEV_OVERRIDE' && (
                  <button
                    type="button"
                    data-testid="admin-reset-live-clock-btn"
                    onClick={() => resetBusinessClockToLiveIst()}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  >
                    {step4cDict.returnToLiveClockBtn} ({businessClockState.liveActualBusinessDateIst})
                  </button>
                )}
                <span className="text-[11px] font-bold px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  DEMO TARIFF
                </span>
              </div>
            </div>

            {businessClockMode === 'DEV_OVERRIDE' && (
              <div
                data-testid="admin-dev-override-warning-banner"
                className="p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2 flex-wrap"
              >
                <span>{step4cDict.devOverrideWarningBanner}</span>
                <span className="font-mono text-[11px]">
                  {step4cDict.actualLiveIstDateLabel}: {businessClockState.liveActualBusinessDateIst}
                </span>
              </div>
            )}

            {/* Unverified Tariff Disclaimer */}
            <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Tariff Verification Notice: </span>
                <span>
                  The 15.0% p.a. delayed payment surcharge is configured for demonstration and testing purposes. Its statutory applicability under current GERC / UGVCL tariff regulations has not been verified. This calculation must not be represented as an approved live statutory demand.
                </span>
              </div>
            </div>

            {/* Policy Parameters Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">Base Annual Rate</span>
                <span data-testid="admin-dps-annual-rate" className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {DEFAULT_LATE_CHARGE_POLICY.annualRatePercent}% p.a.
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">0.0411% / day (365d)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">Accrual Method</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {DEFAULT_LATE_CHARGE_POLICY.calculationMethod}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Non-compounding</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">Default Grace Period</span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {DEFAULT_LATE_CHARGE_POLICY.gracePeriodDays} Days
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Immediate post-due</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">Effective Dates</span>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {DEFAULT_LATE_CHARGE_POLICY.effectiveFrom}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">to {DEFAULT_LATE_CHARGE_POLICY.effectiveTo || 'Indefinite'}</span>
              </div>
            </div>

            {/* Category Overrides Matrix */}
            <div className="text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Category Policy Matrix
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(DEFAULT_LATE_CHARGE_POLICY.categoryOverrides || {}).map(([cat, rule]) => (
                  <div key={cat} className="p-2.5 rounded-lg bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 text-[11px]">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{cat}</div>
                    <div className="text-slate-500 font-mono mt-0.5">
                      Rate: <span className="font-bold text-slate-900 dark:text-white">{rule.annualRatePercent}% p.a.</span>
                    </div>
                    <div className="text-slate-500 font-mono">
                      Grace: <span className="font-bold text-slate-900 dark:text-white">{rule.gracePeriodDays} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Overdue Audit Table */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audited Overdue Bills Under Current Reference Date ({overdueAuditBills.length})</span>
                </span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-500">
                    Principal: <strong data-testid="admin-dps-overdue-principal" className="text-amber-600 dark:text-amber-400">
                      ₹{overdueAuditBills.reduce((acc, curr) => acc + (curr.reconciled.lateChargeBreakdown?.remainingPrincipal || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                  <span className="text-slate-500">
                    DPS: <strong data-testid="admin-dps-overdue-charges" className="text-rose-600 dark:text-rose-400">
                      ₹{overdueAuditBills.reduce((acc, curr) => acc + (curr.reconciled.lateChargeBreakdown?.netLateChargesPayable || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[780px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5 font-semibold">Bill No / Consumer</th>
                      <th className="p-2.5 font-semibold text-right">1. Orig Bill</th>
                      <th className="p-2.5 font-semibold text-right">2. Settled</th>
                      <th className="p-2.5 font-semibold text-right">3. Principal</th>
                      <th className="p-2.5 font-semibold text-right">4. Accrued DPS</th>
                      <th className="p-2.5 font-semibold text-right">5. Waived/Paid DPS</th>
                      <th className="p-2.5 font-semibold text-right">6. Total Payable</th>
                      <th className="p-2.5 font-semibold">7. Due Date</th>
                      <th className="p-2.5 font-semibold text-center">8. Overdue</th>
                      <th className="p-2.5 font-semibold">9. Calc Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {overdueAuditBills.map(({ bill, conn, stmt }) => (
                      <tr key={bill.billNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white">{bill.billNo}</div>
                          <span className="text-[10px] text-slate-400">{bill.consumerNo} · {conn?.consumerName}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          ₹{stmt.originalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-600 tabular-nums">
                          ₹{stmt.paymentsSuccessfullySettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-900 dark:text-white tabular-nums">
                          ₹{stmt.remainingPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                          +₹{stmt.accruedLatePaymentCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-600 tabular-nums">
                          ₹{stmt.chargesAlreadyPaidOrWaived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                          ₹{stmt.totalCurrentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{stmt.originalDueDate}</td>
                        <td className="p-2.5 text-center">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            {stmt.daysOverdue}d
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">{stmt.lastCalculationDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 4B: Section 56 Formal Notice Tracking & Audit Table */}
            <div
              data-testid="admin-formal-notice-tracking"
              className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>{fnDict.sectionTitle} — Notice Tracking & Statutory Audit ({formalNotices.length})</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  15 Clear Days · Never Auto-Disconnects on Expiry
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[740px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5 font-semibold">Notice ID / Bill</th>
                      <th className="p-2.5 font-semibold">Consumer & Subdiv</th>
                      <th className="p-2.5 font-semibold">Status</th>
                      <th className="p-2.5 font-semibold">Issued / Deadline</th>
                      <th className="p-2.5 font-semibold text-center">Countdown</th>
                      <th className="p-2.5 font-semibold text-right">Frozen Snapshot</th>
                      <th className="p-2.5 font-semibold text-right">Live Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {formalNotices.map(notice => (
                      <tr key={notice.noticeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white">{notice.noticeId}</div>
                          <span className="text-[10px] text-slate-400">{notice.billNo}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{notice.consumerName} ({notice.consumerNo})</div>
                          <span className="text-[10px] text-slate-400">{notice.subdivision}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {fnDict.statuses[notice.status]}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {notice.issueDate || '—'} → {notice.paymentDeadlineDate || '—'}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-600">
                          {notice.daysRemaining !== null ? `${notice.daysRemaining}d` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                          ₹{notice.snapshotAtIssuance.totalOutstandingAtIssuance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          ₹{notice.currentBalanceView.totalCurrentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Microservices Status Table */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {ad.servicesTableTitle}
              </h3>
              <ExportMenu
                datasetKey="system_services"
                filteredRecords={SYSTEM_SERVICES}
                variant="compact"
              />
            </div>

            <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colServiceName}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colCategory}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colLatency}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colUptime90d}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colLastIncidentNote}</th>
                      <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {SYSTEM_SERVICES.map(svc => {
                      const locSvc = localizeSystemService(svc, language);
                      return (
                        <tr key={svc.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{locSvc.name}</td>
                          <td className="p-3.5 text-slate-500 whitespace-nowrap">{locSvc.category}</td>
                          <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{svc.latencyMs} ms</td>
                          <td className="p-3.5 font-mono font-semibold text-emerald-600 tabular-nums whitespace-nowrap">{svc.uptime90d}%</td>
                          <td className="p-3.5 text-slate-500 text-[11px]">{locSvc.lastIncident}</td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                              {locSvc.statusBadge}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {activeTab === 'overview' && <LiveErpAdapterPanel />}
        </div>
      )}

      {/* VIEW 2: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {ad.userMgmtTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {ad.userMgmtSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportMenu
                datasetKey="user_accounts"
                filteredRecords={users}
              />
              <button
                onClick={() => showToast('New enterprise user onboarding dialog (Demo)', 'info')}
                className="w-full sm:w-auto min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer"
              >
                {ad.addStaffUserBtn}
              </button>
            </div>
          </div>

          <LiveStaffAssignmentPanel
            onToast={(msg, kind) => showToast(msg, kind || 'info')}
          />

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colUserId}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colNameEmail}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colRoleProfile}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colSubdivision}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colLastLogin}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colStatus}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{ad.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{u.id}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {localizeAdminUserRole(u.role, language)}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {localizeAdminSubdivision(u.subdivision, language)}
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {localizeNotificationTimestamp(u.lastLogin, language)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          u.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}>
                          {localizeAdminUserStatus(u.status, language)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                        >
                          {u.status === 'Active' ? ad.lockAccountBtn : ad.unlockAccountBtn}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ACCESS CONTROL MATRIX */}
      {activeTab === 'access' && (
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {ad.rbacTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {ad.rbacSubtitle}
              </p>
            </div>
            <ExportMenu
              datasetKey="rbac_matrix"
              filteredRecords={permissions}
            />
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colEnterpriseModuleAction}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colRoleConsumer}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colRoleEmployee}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colRoleField}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colRoleManagement}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colRoleAdmin}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {permissions.map((p, idx) => (
                    <tr key={p.module} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {localizeRbacModuleName(p.module, language)}
                      </td>
                      {(['consumer', 'employee', 'field', 'management', 'admin'] as const).map(role => (
                        <td key={role} className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => togglePermission(idx, role)}
                            aria-label={localizeRbacToggleAria(p.module, role, language)}
                            aria-pressed={p[role]}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto text-xs font-bold transition-colors ${
                              p[role]
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {p[role] ? '✓' : '—'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: AUDIT TRAIL & SECURITY GOVERNANCE APPROVALS */}
      {activeTab === 'audit' && (
        <div className="space-y-5 min-w-0">
          <LiveAiGovernancePanel />
          <LiveAlertEnginePanel />
          {/* Security & Governance Human-in-the-Loop Approvals Queue */}
          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-600" />
                  <span>{ad.hitlQueueTitle}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {ad.hitlQueueSubtitle}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 self-start sm:self-auto">
                {recommendations.filter(r => r.status === 'PENDING_APPROVAL').length} {ad.hitlPendingBadgeSuffix}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colProposalId}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colProposedActionEntity}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colRequiredAuthority}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colRiskLevel}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colLifecycleStatus}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{ad.colGovernanceReview}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recommendations.map(rec => {
                    const locRec = localizeAIRecommendation(rec, language);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          <div>{rec.id}</div>
                          <div className="text-[10px] font-normal text-slate-400">
                            {localizeNotificationTimestamp(rec.createdAt, language)}
                          </div>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">{locRec.title}</div>
                          <div className="text-[11px] font-mono text-slate-500">{locRec.affectedRecordLabel}</div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            {language === 'en' ? rec.requiredApprovingRole : locRec.requiredRoleLabel}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rec.riskLevel === 'CRITICAL'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                              : rec.riskLevel === 'HIGH'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                          }`}>
                            {locRec.riskLevelLabel}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            rec.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : rec.status === 'EXECUTED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          }`}>
                            {language === 'en' ? rec.status : locRec.statusLabel}
                          </span>
                          {rec.reviewedBy && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {t.incident.dossierByActorPrefix} {rec.reviewedBy}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => openApprovalModal(rec)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            {rec.requiredApprovingRole === 'admin' && rec.status === 'PENDING_APPROVAL'
                              ? ad.authorizeSecurityActionBtn
                              : ad.inspectGovernanceRecordBtn}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {ad.auditStreamTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {ad.auditStreamSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={auditSearch}
                onChange={e => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                placeholder={ad.auditSearchPlaceholder}
                aria-label={ad.auditSearchAriaLabel}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-52"
              />
              {(['ALL', 'SUCCESS', 'WARNING', 'FAILED'] as const).map(statusOption => (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => {
                    setAuditFilter(statusOption);
                    setAuditPage(1);
                  }}
                  aria-pressed={auditFilter === statusOption}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                    auditFilter === statusOption
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {localizeAuditStatusFilter(statusOption, language)}
                </button>
              ))}
              <ExportMenu
                datasetKey="audit_logs"
                filteredRecords={filteredAuditLogs}
                allAuthorizedRecords={auditLogs}
                variant="compact"
              />
            </div>
          </div>

          <LiveStaffAssignmentPanel
            onToast={(msg, kind) => showToast(msg, kind || 'info')}
          />

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colAuditEventId}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colTimestamp}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colActorRole}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colAction}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colTargetResource}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{ad.colOriginIp}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{ad.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 dark:text-slate-400">
                        {ad.noAuditEventsMatchPattern.replace(
                          '{filter}',
                          localizeAuditStatusFilter(auditFilter, language)
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedAuditLogs.map(log => {
                      const locLog = localizeAuditLogEntry(log, language);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">{log.id}</td>
                          <td className="p-3.5 text-slate-500 whitespace-nowrap">{locLog.timestamp}</td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{locLog.actor}</div>
                            <div className="text-[10px] text-slate-400">{locLog.role}</div>
                          </td>
                          <td className="p-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {locLog.actionLabel}
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">{locLog.resource}</td>
                          <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{locLog.ipAddress}</td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {locLog.statusBadge}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredAuditLogs.length > AUDIT_PAGE_SIZE && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/40">
                <span>
                  {ad.auditPaginationSummaryPattern
                    .replace('{start}', String((safeAuditPage - 1) * AUDIT_PAGE_SIZE + 1))
                    .replace('{end}', String(Math.min(safeAuditPage * AUDIT_PAGE_SIZE, filteredAuditLogs.length)))
                    .replace('{total}', String(filteredAuditLogs.length))}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safeAuditPage <= 1}
                    onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                  >
                    {ad.prevPageBtn}
                  </button>
                  <span className="font-mono font-semibold">
                    {ad.pageIndicatorPattern
                      .replace('{page}', String(safeAuditPage))
                      .replace('{total}', String(totalAuditPages))}
                  </span>
                  <button
                    type="button"
                    disabled={safeAuditPage >= totalAuditPages}
                    onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                  >
                    {ad.nextPageBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 5: INFRASTRUCTURE & DEMO BACKUP / RECOVERY */}
      {(activeTab === 'infra' || activeTab === 'backup') && (
        <div className="space-y-6">
          <LivePerformanceTelemetryPanel />
          <AdminDemoBackupCenter
            adminRbacState={{ users, permissions }}
            onRestoreAdminRbacState={nextRbac => {
              setUsers(nextRbac.users);
              setPermissions(nextRbac.permissions);
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600 shrink-0" />
                <span>{ad.backupCardTitle}</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {ad.backupCardDescription}
              </p>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex flex-col min-[380px]:flex-row min-[380px]:justify-between gap-0.5">
                  <span className="text-slate-400">{ad.lastSnapshotLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{ad.lastSnapshotValue}</span>
                </div>
                <div className="flex flex-col min-[380px]:flex-row min-[380px]:justify-between gap-0.5">
                  <span className="text-slate-400">{ad.rpoRtoLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{ad.rpoRtoValue}</span>
                </div>
              </div>
              <button
                onClick={handleTriggerBackup}
                disabled={isBackupRunning}
                className="w-full min-h-11 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isBackupRunning ? 'animate-spin' : ''}`} />
                <span>{isBackupRunning ? ad.executingBackupBtn : ad.triggerBackupBtn}</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{ad.cyberResilienceTitle}</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                  <span>{ad.tlsCipherLabel}</span>
                  <span className="text-emerald-600 font-bold shrink-0">{ad.tlsCipherStatus}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                  <span>{ad.aadhaarMaskingLabel}</span>
                  <span className="text-emerald-600 font-bold shrink-0">{ad.aadhaarMaskingStatus}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                  <span>{ad.scadaFirewallLabel}</span>
                  <span className="text-emerald-600 font-bold shrink-0">{ad.scadaFirewallStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 6: SYSTEM SETTINGS */}
      {activeTab === 'outage-map' && <LazyOutageMapSection />}
      {activeTab === 'directory' && <OrganizationalDirectoryWorkspace />}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <LiveWorkflowTemplatesPanel />
          <div className="max-w-2xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {ad.settingsTitle}
          </h2>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                {ad.idleTimeoutLabel}
              </label>
              <input
                key={`timeout-${language}`}
                type="text"
                defaultValue={ad.idleTimeoutDefaultValue}
                className="w-full min-h-11 sm:min-h-9 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                {ad.patchScheduleLabel}
              </label>
              <input
                key={`schedule-${language}`}
                type="text"
                defaultValue={ad.patchScheduleDefaultValue}
                className="w-full min-h-11 sm:min-h-9 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <button
              onClick={() => showToast('Settings saved to volatile session (Demo)', 'success')}
              className="w-full sm:w-auto min-h-11 sm:min-h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              {ad.saveConfigurationBtn}
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

