import { LiveWorkflowKpis } from '../common/LiveWorkflowKpis';
import { LiveSlaRiskWatchlist } from '../common/LiveSlaRiskWatchlist';
import { LiveAlertEnginePanel } from '../common/LiveAlertEnginePanel';
import { LiveAiGovernancePanel } from '../common/LiveAiGovernancePanel';
import { LivePredictiveDecisionPanel } from '../common/LivePredictiveDecisionPanel';
import { LiveExecutiveAnalyticsSection } from './LiveExecutiveAnalyticsSection';
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  EXECUTIVE_MONTHLY_METRICS,
  FEEDER_METRICS,
  SUBDIVISION_PERFORMANCE
} from '../../data/mockData';
import {
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Download,
  Filter,
  Cpu,
  Zap,
  BarChart3,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { SmartGridDigitalTwin } from '../intro/SmartGridDigitalTwin';
import { AIEnergyForecasting } from '../intro/AIEnergyForecasting';
import { formatErpDateTime } from '../../utils/dateUtils';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getManagementUiDictionary,
  localizeBillingMonth,
  localizeFeederStatus,
  localizeAiProposalRisk,
  localizeAiProposalStatus,
  localizeAiProposalTitle,
  localizeAiReasoning
} from '../../i18n/managementContentTranslations';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSeverity
} from '../../i18n/incidentLocalization';
import {
  localizeTariffCategory,
  localizeConsumerAddress,
  localizeSubdivision
} from '../../i18n/consumerContentTranslations';
import { localizeAssignedActorName as localizeActorName } from '../../i18n/employeeContentTranslations';

export const ManagementPortal: React.FC = () => {
  const { language } = useLanguage();
  const {
    activeTab,
    setActiveTab,
    applications,
    complaints,
    workOrders,
    roleIncidents,
    recommendations,
    resolveIncident,
    openApprovalModal,
    openIncidentModal,
    updateApplicationStatus,
    openCaseDrawer,
    setIsAIAssistantOpen,
    showToast,
    activeUser
  } = useApp();
  const tm = getManagementUiDictionary(language);
  const [timePeriod, setTimePeriod] = useState<'Q2-2026' | 'FY26-YTD'>('FY26-YTD');
  const [selectedEscalatedIncident, setSelectedEscalatedIncident] = useState<any | null>(null);

  // Derived Real-Time ERP Metrics from Canonical Records (Scoped by Role/Session)
  const pendingApplications = applications.filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected');
  const openComplaints = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed');
  const activeWorkOrders = workOrders.filter(w => w.status !== 'Completed');
  const activeIncidents = roleIncidents.filter(i => i.status !== 'RESOLVED');
  const criticalIncidents = activeIncidents.filter(i => i.severity === 'CRITICAL');

  // Applications requiring managerial sanction review (high load >= 10 kW or commercial/industrial)
  const highRiskApplications = applications.filter(
    a => (a.requestedLoadKw >= 10 || a.category.includes('Commercial') || a.category.includes('Industrial')) && a.status === 'Sanction Approval'
  );

  // Localized chart data
  const localizedMonthlyMetrics = useMemo(() => {
    return EXECUTIVE_MONTHLY_METRICS.map(row => ({
      ...row,
      month: localizeBillingMonth(row.month, language)
    }));
  }, [language]);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
            <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                {tm.cockpitTitle}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {tm.corporateOfficeBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>{tm.officerPrefix}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{localizeActorName(activeUser.name, language)}</span>
              <span>({activeUser.designation})</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col min-[420px]:flex-row sm:flex-nowrap items-stretch min-[420px]:items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
          <select
            value={timePeriod}
            onChange={e => setTimePeriod(e.target.value as any)}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
          >
            <option value="Q2-2026">{tm.optQ2}</option>
            <option value="FY26-YTD">{tm.optYtd}</option>
          </select>

          <button
            onClick={() => showToast(tm.flashReportToast, 'success')}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{tm.exportReportBtn}</span>
          </button>
        </div>
      </div>

      {/* Cross-Portal ERP Workflow Operations Pulse */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <h2 className="text-sm font-bold tracking-wide">
              {tm.telemetryTitle}
            </h2>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-200 self-start sm:self-auto border border-white/10">
            {tm.canonicalStateSyncActive}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-300 block uppercase font-medium">{tm.kpiPendingAppsTitle}</span>
            <div className="text-xl font-bold text-white mt-0.5 font-mono">{pendingApplications.length}</div>
            <span className="text-[10px] text-teal-300">{tm.kpiPendingAppsSub}</span>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-300 block uppercase font-medium">{tm.kpiActiveGrievancesTitle}</span>
            <div className="text-xl font-bold text-white mt-0.5 font-mono">{openComplaints.length}</div>
            <span className="text-[10px] text-amber-300">{tm.kpiActiveGrievancesSub}</span>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-300 block uppercase font-medium">{tm.kpiDispatchedFieldOrdersTitle}</span>
            <div className="text-xl font-bold text-white mt-0.5 font-mono">{activeWorkOrders.length}</div>
            <span className="text-[10px] text-sky-300">{tm.kpiDispatchedFieldOrdersSub}</span>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-300 block uppercase font-medium">{tm.kpiCriticalHazardsTitle}</span>
            <div className={`text-xl font-bold mt-0.5 font-mono ${criticalIncidents.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {criticalIncidents.length}
            </div>
            <span className="text-[10px] text-rose-300">{tm.kpiCriticalHazardsSub}</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Live Workflow KPIs — wired to VidyutFlow FastAPI backend */}
          <LiveWorkflowKpis />
          {/* Executive Escalation Inbox (Only Escalated Incidents or Emergency Safety Overrides Appear Here) */}
          {activeIncidents.length > 0 && (
            <div className="p-5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tm.escalationInboxTitle}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                  {activeIncidents.length} {tm.escalatedAwaitingSuffix}
                </span>
              </div>

              <div className="space-y-2">
                {activeIncidents.map(inc => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-lg bg-white dark:bg-[#101C35] border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{inc.id}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{localizeIncidentTitle(inc.title, language)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                          {localizeIncidentSeverity(inc.severity, language)}
                        </span>
                        {inc.isEmergencyOverride && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase">
                            {tm.emergencySafetyOverrideBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {localizeIncidentDescription(inc.description, language)}
                      </p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{tm.feederLabel} <strong>{inc.entityId || tm.fallbackGridLine}</strong></span>
                        <span>·</span>
                        <span>{tm.subdivisionLabel} <strong>{localizeSubdivision(inc.subdivision || tm.fallbackDivisionOffice, language)}</strong></span>
                        {inc.escalatedBy && (
                          <>
                            <span>·</span>
                            <span className="text-amber-700 dark:text-amber-300 font-medium">
                              {tm.escalatedByPrefix} {localizeActorName(inc.escalatedBy, language)} {inc.escalatedAt ? `(${formatErpDateTime(inc.escalatedAt)})` : ''}
                            </span>
                          </>
                        )}
                        {inc.escalatedReason && (
                          <>
                            <span>·</span>
                            <span className="italic text-slate-600 dark:text-slate-300">
                              {tm.justificationPrefix} &quot;{inc.escalatedReason}&quot;
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openIncidentModal(inc.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{tm.reviewEscalationBtn}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* High-Risk Sanctions & Escalations Card (if any pending) */}
          {highRiskApplications.length > 0 && (
            <div className="p-5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tm.highRiskSanctionsTitle}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  {highRiskApplications.length} {tm.awaitingConcurrenceSuffix}
                </span>
              </div>

              <div className="space-y-2">
                {highRiskApplications.map(app => (
                  <div
                    key={app.id}
                    className="p-3 rounded-lg bg-white dark:bg-[#101C35] border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{app.id}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{app.applicantName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px]">
                          {localizeTariffCategory(app.category, language)} · {app.requestedLoadKw} kW
                        </span>
                        {app.assignedWorkOrderId && (
                          <span className="font-mono text-[10px] text-slate-500">
                            {tm.verifiedViaWoPrefix} {app.assignedWorkOrderId}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {tm.addressLabel} {localizeConsumerAddress(app.address, language)} · {tm.subdivisionShortLabel} {localizeSubdivision(app.subdivision, language)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openCaseDrawer('application', app.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                      >
                        {tm.reviewFieldDossierBtn}
                      </button>
                      <button
                        onClick={() => {
                          updateApplicationStatus(app.id, 'Meter Installed', tm.sanctionAuditRemark);
                          showToast(tm.sanctionGrantedToast.replace('{id}', app.id), 'success');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                      >
                        {tm.grantExecutiveSanctionBtn}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Database-Backed Executive Analytics & Recharts */}
          <LiveExecutiveAnalyticsSection mode="dashboard" />

          {/* Executive KPI Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AT&C Loss */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {tm.kpiAtcLossTitle}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  12.4%
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> {tm.yoyReductionSuffix}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tm.kpiAtcLossTarget}
              </span>
            </div>

            {/* Billing Efficiency */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {tm.kpiBillingEffTitle}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  88.6%
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> {tm.trendUpSuffix}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tm.kpiBillingEffSub}
              </span>
            </div>

            {/* Collection Efficiency */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {tm.kpiCollectionEffTitle}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  98.4%
                </span>
                <span className="text-xs font-semibold text-blue-600">
                  {tm.kpiCollectionEffVal}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tm.kpiCollectionEffSub}
              </span>
            </div>

            {/* Reliability Index (SAIDI) */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {tm.kpiReliabilityTitle}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  18.2 min
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  {tm.kpiReliabilityUptime}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {tm.kpiReliabilitySub}
              </span>
            </div>
          </div>

          {/* AT&C Loss Trajectory & Revenue Trajectory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tm.chartAtcCurveTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {tm.chartAtcCurveSubtitle}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={localizedMonthlyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis domain={[11, 15]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101C35',
                        border: '1px solid #1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#FFFFFF'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="atcLossPct"
                      name={tm.chartAtcLegend}
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#F59E0B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tm.chartEnergyVsRevTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {tm.chartEnergyVsRevSubtitle}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localizedMonthlyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101C35',
                        border: '1px solid #1E293B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#FFFFFF'
                      }}
                    />
                    <Bar dataKey="billedMUs" name={tm.chartLegendBilledMus} fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collectedCr" name={tm.chartLegendRevenueCr} fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ADVANCED ANALYTICS & ENERGY FORECASTING */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <AIEnergyForecasting />
        </div>
      )}

      {/* VIEW 2: FEEDER BOTTLENECKS & SMART GRID DIGITAL TWIN */}
      {(activeTab === 'feeders' || activeTab === 'bottlenecks') && (
        <div className="space-y-6">
          <SmartGridDigitalTwin />

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tm.feederRadarTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {tm.feederRadarSubtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEEDER_METRICS.map(fdr => (
              <div
                key={fdr.id}
                className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-slate-400 font-semibold">{fdr.id}</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {fdr.name}
                    </h3>
                    <span className="text-xs text-slate-500">{localizeSubdivision(fdr.subdivision, language)}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    fdr.status === 'Critical Overload'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : fdr.status === 'Warning'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {localizeFeederStatus(fdr.status, language)}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{tm.capacityUtilizationLabel}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fdr.utilizationPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fdr.utilizationPct > 100
                          ? 'bg-rose-500'
                          : fdr.utilizationPct > 90
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(fdr.utilizationPct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{tm.colPeakLoad}</span>
                    <span className="font-mono font-semibold">{fdr.peakLoadAmps}A / {fdr.ratedCapacityAmps}A</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{tm.colTransformers}</span>
                    <span className="font-semibold">{fdr.transformersCount} {tm.unitDts}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{tm.colConsumers}</span>
                    <span className="font-semibold">{fdr.consumersConnected.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: AI EXECUTIVE INSIGHTS */}
      {activeTab === 'ai-insights' && (
        <div className="space-y-6">
          {/* Live ML SLA Risk Watchlist, Predictive Services & AI Governance */}
          <LiveAiGovernancePanel />
          <LivePredictiveDecisionPanel />
          <LiveSlaRiskWatchlist />
          <div className="p-5 rounded-xl bg-gradient-to-r from-blue-900/20 to-teal-900/20 border border-teal-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {tm.aiRadarBannerTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {tm.aiRadarBannerSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                {tm.alert1Badge}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tm.alert1Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {tm.alert1Desc}
              </p>
              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>{tm.askCopilotBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
                {tm.alert2Badge}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tm.alert2Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {tm.alert2Desc}
              </p>
              <button
                onClick={() => showToast(tm.dispatchVigilanceToast, 'info')}
                className="text-xs text-amber-600 font-semibold hover:underline"
              >
                {tm.dispatchAuditBtn}
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 block">
                {tm.alert3Badge}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tm.alert3Title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {tm.alert3Desc}
              </p>
              <span className="text-xs text-slate-400">{tm.alert3Policy}</span>
            </div>
          </div>

          {/* Executive AI Action Approvals & Concurrence Queue */}
          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>{tm.aiQueueTitle}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {tm.aiQueueSubtitle}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
                {recommendations.filter(r => r.requiredApprovingRole === 'management' && r.status === 'PENDING_APPROVAL').length} {tm.pendingConcurrenceBadge}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colProposalId}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colActionTarget}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colStateTransition}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colRiskLevel}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colStatusAudit}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{tm.colExecutiveAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recommendations
                    .filter(r => r.requiredApprovingRole === 'management' || r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL')
                    .map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          <div>{rec.id}</div>
                          <div className="text-[10px] font-normal text-slate-400">{rec.createdAt}</div>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">{localizeAiProposalTitle(rec.title, language)}</div>
                          <div className="text-[11px] font-mono text-slate-500">{rec.affectedRecord.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{localizeAiReasoning(rec.reasoningSummary, language)}</div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">
                          <span className="text-slate-500">{rec.previousValue}</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{rec.proposedValue}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rec.riskLevel === 'CRITICAL'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                          }`}>
                            {localizeAiProposalRisk(rec.riskLevel, language)}
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
                            {localizeAiProposalStatus(rec.status, language)}
                          </span>
                          {rec.reviewedBy && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{tm.reviewedByPrefix} {localizeActorName(rec.reviewedBy, language)}</div>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => openApprovalModal(rec)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              rec.status === 'PENDING_APPROVAL'
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {rec.status === 'PENDING_APPROVAL' ? tm.reviewAndSanctionBtn : tm.viewAuditRecordBtn}
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

      {/* VIEW 4: SLA MONITORING */}
      {activeTab === 'sla' && (
        <div className="space-y-4 min-w-0">
          <LiveAlertEnginePanel />
          <LiveExecutiveAnalyticsSection mode="sla" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tm.slaMatrixTitle}
            </h2>
            <p className="text-xs text-slate-500">
              {tm.slaMatrixSubtitle}
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colSubdivisionName}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colTotalComplaints}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colResolutionRate}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colAverageTat}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colAtcLossPct}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{tm.colGercCompliance}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {SUBDIVISION_PERFORMANCE.map(s => (
                    <tr key={s.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{localizeSubdivision(s.name, language)}</td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{s.complaints}</td>
                      <td className="p-3.5 font-mono font-semibold text-emerald-600 tabular-nums whitespace-nowrap">{s.resolvedPct}%</td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{s.avgTatHours}{tm.hoursSuffix}</td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{s.atcLossPct}%</td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          {tm.badgeCompliant}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: EXECUTIVE EXPORT & BOARD REPORTING */}
      {activeTab === 'reports' && (
        <div className="space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tm.exportCenterTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {tm.exportCenterSubtitle} ({timePeriod === 'Q2-2026' ? tm.optQ2 : tm.optYtd})
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
              {tm.clientSideDemoBadge}
            </span>
          </div>

          <LiveExecutiveAnalyticsSection mode="reports" />

          {/* Exportable Report Packages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {tm.pkg1Category}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {tm.pkg1Format}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {tm.pkg1Title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tm.pkg1Desc
                    .replace('{from}', localizeBillingMonth(EXECUTIVE_MONTHLY_METRICS[0]?.month, language))
                    .replace('{to}', localizeBillingMonth(EXECUTIVE_MONTHLY_METRICS[EXECUTIVE_MONTHLY_METRICS.length - 1]?.month, language))}
                </p>
              </div>
              <button
                onClick={() =>
                  showToast(
                    tm.pkg1Toast.replace('{period}', timePeriod === 'Q2-2026' ? tm.optQ2 : tm.optYtd),
                    'success'
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tm.pkg1Btn}</span>
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    {tm.pkg2Category}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {tm.pkg2Format}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {tm.pkg2Title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tm.pkg2Desc.replace('{count}', String(SUBDIVISION_PERFORMANCE.length))}
                </p>
              </div>
              <button
                onClick={() =>
                  showToast(
                    tm.pkg2Toast,
                    'success'
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tm.pkg2Btn}</span>
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {tm.pkg3Category}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {tm.pkg3Format}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {tm.pkg3Title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {tm.pkg3Desc
                    .replace('{count}', String(FEEDER_METRICS.length))
                    .replace('{highCount}', String(FEEDER_METRICS.filter(f => f.status !== 'Optimal').length))}
                </p>
              </div>
              <button
                onClick={() =>
                  showToast(
                    tm.pkg3Toast,
                    'success'
                  )
                }
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tm.pkg3Btn}</span>
              </button>
            </div>
          </div>

          {/* Monthly Performance Ledger Preview Table */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {tm.previewLedgerTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {tm.previewLedgerSubtitle}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colBillingMonth}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colEnergyBilled}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colRevenueCollected}</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">{tm.colAtcLoss}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {EXECUTIVE_MONTHLY_METRICS.map(row => (
                      <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{localizeBillingMonth(row.month, language)}</td>
                        <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400 font-semibold tabular-nums whitespace-nowrap">
                          {row.billedMUs} {tm.unitMu}
                        </td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-600 tabular-nums whitespace-nowrap">
                          ₹{row.collectedCr} Cr
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                          {row.atcLossPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
