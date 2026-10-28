import React, { useState } from 'react';
import { LiveRequestQueue } from '../common/LiveRequestQueue';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeIncident,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentAuditStage,
  localizeIncidentSopAction,
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeAuditTrailNote
} from '../../i18n/incidentLocalization';
import {
  localizeSubdivision,
  localizeTariffCategory,
  localizePhase,
  localizeApplicationStatus,
  localizeConnectionStatus,
  localizeComplaintCategory,
  localizeComplaintDescription,
  localizeComplaintStatus
} from '../../i18n/consumerContentTranslations';
import {
  localizeEmployeeDesignation,
  localizeFieldEngineerStatus,
  localizePriorityLevel,
  localizeSlaDuration,
  localizeApplicationStatusMeta,
  localizeAIRecommendation
} from '../../i18n/employeeContentTranslations';
import {
  SUBDIVISION_PERFORMANCE
} from '../../data/mockData';
import {
  getApplicationStatusDisplayMeta,
  canArchiveApplication
} from '../../services/erpAdapter';
import {
  Inbox,
  CheckSquare,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  FileText,
  User,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Building2,
  HardHat,
  ShieldCheck,
  Send,
  Archive,
  RotateCcw,
  ShieldAlert,
  ArrowUpRight,
  Eye,
  Check,
  Flame,
  Zap,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { CriticalIncident } from '../../types';
import { formatErpDateTime } from '../../utils/dateUtils';

export const EmployeePortal: React.FC = () => {
  const { t, language } = useLanguage();
  const te = t.employee;
  const {
    activeTab,
    setActiveTab,
    connections,
    applications,
    complaints,
    recommendations,
    roleIncidents,
    fieldEngineers,
    acknowledgeIncident,
    assignIncidentToField,
    reassignIncidentToField,
    escalateIncident,
    resolveIncident,
    openApprovalModal,
    openIncidentModal,
    updateApplicationStatus,
    archiveApplication,
    restoreApplication,
    updateComplaintStatus,
    openCaseDrawer,
    showToast,
    activeUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [subdivisionFilter, setSubdivisionFilter] = useState<string>('All');
  const [approvalFilter, setApprovalFilter] = useState<string>('All');
  const [confirmArchiveAppId, setConfirmArchiveAppId] = useState<string | null>(null);
  const [archiveReasonInput, setArchiveReasonInput] = useState<string>('');

  // Incident Control Desk State
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('All');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState<string>('');
  const [assignModalIncident, setAssignModalIncident] = useState<CriticalIncident | null>(null);
  const [targetEngineerId, setTargetEngineerId] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState<string>('');
  const [escalateModalIncident, setEscalateModalIncident] = useState<CriticalIncident | null>(null);
  const [escalateReasonInput, setEscalateReasonInput] = useState<string>('');
  const [targetManagerId, setTargetManagerId] = useState<string>('usr_mgmt_01');
  const [detailsIncident, setDetailsIncident] = useState<CriticalIncident | null>(null);

  const activeApplications = applications.filter(a => !a.isArchived);
  const archivedApplications = applications.filter(a => Boolean(a.isArchived));

  // Filtered applications
  const filteredApps = applications.filter(app => {
    const matchesSearch =
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubdiv = subdivisionFilter === 'All' || app.subdivision === subdivisionFilter;
    if (!matchesSearch || !matchesSubdiv) return false;

    if (statusFilter === 'Archived') {
      return Boolean(app.isArchived);
    }

    // All non-Archived filters exclude archived items from the active queue
    if (app.isArchived) return false;

    if (statusFilter === 'All') return true;
    if (statusFilter === 'Action Required') {
      return getApplicationStatusDisplayMeta(app).requiresEmployeeAction;
    }
    return app.status === statusFilter;
  });

  // Filtered complaints
  const filteredCmps = complaints.filter(cmp => {
    return (
      cmp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmp.consumerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmp.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const pendingCount = activeApplications.filter(a => a.status === 'Submitted' || a.status === 'Document Verification').length;
  const inspectionCount = activeApplications.filter(a => a.status === 'Site Inspection').length;
  const sanctionCount = activeApplications.filter(a => a.status === 'Sanction Approval').length;
  const actionRequiredCount = activeApplications.filter(a => getApplicationStatusDisplayMeta(a).requiresEmployeeAction).length;

  const handleConfirmArchive = (id: string) => {
    const ok = archiveApplication(id, archiveReasonInput.trim() || undefined);
    if (ok) {
      setConfirmArchiveAppId(null);
      setArchiveReasonInput('');
    }
  };

  // Incident Control Desk Filtering
  const filteredEmployeeIncidents = roleIncidents.filter(inc => {
    const matchesSearch =
      incidentSearchQuery === '' ||
      inc.id.toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
      inc.title.toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
      Boolean(inc.entityId && inc.entityId.toLowerCase().includes(incidentSearchQuery.toLowerCase())) ||
      Boolean(inc.subdivision && inc.subdivision.toLowerCase().includes(incidentSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (incidentStatusFilter === 'All') return true;
    if (incidentStatusFilter === 'New') return inc.status === 'DETECTED';
    if (incidentStatusFilter === 'Acknowledged') return inc.status === 'ACKNOWLEDGED';
    if (incidentStatusFilter === 'Assigned') return inc.status === 'ASSIGNED';
    if (incidentStatusFilter === 'Escalated') return inc.status === 'ESCALATED';
    if (incidentStatusFilter === 'Resolved') return inc.status === 'RESOLVED';
    return inc.status === incidentStatusFilter;
  });

  const newIncidentsCount = roleIncidents.filter(i => i.status === 'DETECTED').length;
  const acknowledgedIncidentsCount = roleIncidents.filter(i => i.status === 'ACKNOWLEDGED').length;
  const assignedIncidentsCount = roleIncidents.filter(i => i.status === 'ASSIGNED').length;
  const escalatedIncidentsCount = roleIncidents.filter(i => i.status === 'ESCALATED').length;
  const resolvedIncidentsCount = roleIncidents.filter(i => i.status === 'RESOLVED').length;
  const criticalIncidentsCount = roleIncidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

  const handleOpenAssignModal = (inc: CriticalIncident) => {
    setAssignModalIncident(inc);
    const matchingSubdivisionEng = fieldEngineers.find(
      f =>
        inc.subdivision &&
        f.subdivision.toLowerCase() === inc.subdivision.toLowerCase() &&
        f.id !== inc.assignedToUserId
    );
    const defaultEng =
      matchingSubdivisionEng ||
      fieldEngineers.find(f => f.id !== inc.assignedToUserId) ||
      fieldEngineers[0];
    setTargetEngineerId(defaultEng?.id || 'FLD-UG-201');
    setAssignNotes('');
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalIncident || !targetEngineerId) return;
    const isReassignment = Boolean(
      assignModalIncident.assignedToUserId &&
        assignModalIncident.assignedToUserId !== targetEngineerId
    );
    if (isReassignment && !assignNotes.trim()) {
      showToast(t.incident.modalReasonReassignLabel, 'warning');
      return;
    }
    const selectedEng = fieldEngineers.find(f => f.id === targetEngineerId) || {
      id: targetEngineerId,
      name: 'Vikramaditya Solanki'
    };
    if (isReassignment) {
      reassignIncidentToField(
        assignModalIncident.id,
        selectedEng.id,
        selectedEng.name,
        assignNotes.trim()
      );
    } else {
      assignIncidentToField(
        assignModalIncident.id,
        selectedEng.id,
        selectedEng.name,
        assignNotes.trim()
      );
    }
    setAssignModalIncident(null);
  };

  const handleOpenEscalateModal = (inc: CriticalIncident) => {
    setEscalateModalIncident(inc);
    setTargetManagerId('usr_mgmt_01');
    setEscalateReasonInput('');
  };

  const handleConfirmEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateModalIncident || !escalateReasonInput.trim()) {
      showToast(t.incident.modalJustificationLabel, 'warning');
      return;
    }
    const managerName =
      targetManagerId === 'usr_mgmt_02'
        ? 'Pooja Shah'
        : targetManagerId === 'usr_mgmt_03'
        ? 'Dr. Harita Joshi'
        : 'Rajesh Solanki';
    escalateIncident(escalateModalIncident.id, 'management', escalateReasonInput.trim(), targetManagerId, managerName);
    setEscalateModalIncident(null);
    setEscalateReasonInput('');
  };

  const localizedSubdivisionChartData = SUBDIVISION_PERFORMANCE.map(item => ({
    ...item,
    name: localizeSubdivision(item.name, language)
  }));

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* ERP Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
            <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                {te.topBarTitle}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {te.topBarCircleBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>{te.topBarCorporateOfficerPrefix}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{activeUser.name}</span>
              <span>({localizeEmployeeDesignation(activeUser.designation, language)})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            onClick={() => showToast(te.refreshedStreamToast, 'info')}
            className="w-full sm:w-auto min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {te.refreshWorklistBtn}
          </button>
        </div>
      </div>

      {/* VIEW 1: ERP DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Active Operational Incidents Alert Banner */}
          {roleIncidents.filter(i => i.status !== 'RESOLVED').length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
                    <span>
                      {roleIncidents.filter(i => i.status !== 'RESOLVED').length}{' '}
                      {te.activeIncidentsBannerPrefix}
                    </span>
                    {criticalIncidentsCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-600 text-white font-black animate-pulse">
                        {criticalIncidentsCount} {te.criticalCountSuffix}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                    {t.incident.controlDeskDescription}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>{t.incident.controlDeskTitle}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* KPI Bento Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {te.kpiPendingScrutinyTitle}
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {pendingCount} {te.kpiFilesUnit}
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{te.kpiPendingScrutinySub}</span>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {te.kpiFieldFeasibilityTitle}
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {inspectionCount} {te.kpiSitesUnit}
              </div>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">{te.kpiFieldFeasibilitySub}</span>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {te.kpiSanctionApprovalsTitle}
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {sanctionCount} {te.kpiReadyUnit}
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{te.kpiSanctionApprovalsSub}</span>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {te.kpiActiveGrievancesTitle}
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {complaints.filter(c => c.status !== 'Resolved').length} {te.kpiTicketsUnit}
              </div>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">{te.kpiZeroBreachedSlas}</span>
            </div>
          </div>

          {/* TAT Analytics & Smart Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {te.tatChartTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {te.tatChartSubtitle}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localizedSubdivisionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
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
                    <Bar dataKey="avgTatHours" name={te.tatChartLegendAvgHours} fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {te.smartSuggestionsTitle}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-1">
                  <div className="font-semibold text-teal-950 dark:text-teal-200 flex items-center justify-between">
                    <span>{te.suggestion1Title}</span>
                    <span className="text-[10px] text-teal-600 font-mono">45 kW</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {te.suggestion1Body}
                  </p>
                  <button
                    onClick={() => updateApplicationStatus('APP-2026-0844', 'Sanction Approval', te.suggestion1Note)}
                    className="text-xs text-teal-700 dark:text-teal-300 font-bold hover:underline pt-1 block"
                  >
                    {te.suggestion1Btn}
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                  <div className="font-semibold text-amber-950 dark:text-amber-200 flex items-center justify-between">
                    <span>{te.suggestion2Title}</span>
                    <span className="text-[10px] text-amber-600">{te.suggestion2SlaBadge}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {te.suggestion2Body}
                  </p>
                  <button
                    onClick={() => openCaseDrawer('complaint', 'CMP-8821')}
                    className="text-xs text-amber-700 dark:text-amber-300 font-bold hover:underline pt-1 block"
                  >
                    {te.suggestion2Btn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: APPLICATION QUEUE */}
      {(activeTab === 'applications' || activeTab === 'approvals') && (
        <div className="space-y-4 min-w-0">
          {/* Live Request Queue — wired to VidyutFlow FastAPI backend */}
          <LiveRequestQueue />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {te.appQueueTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {te.appQueueSubtitle}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={te.searchAppPlaceholder}
                  aria-label={te.searchAppAriaLabel}
                  className="w-full sm:w-56 min-h-11 sm:min-h-[38px] pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                aria-label={te.filterStatusAriaLabel}
                className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="All">{te.optAllActive} ({activeApplications.length})</option>
                <option value="Action Required">{te.optActionRequired} ({actionRequiredCount})</option>
                <option value="Submitted">{te.optSubmittedNew}</option>
                <option value="Document Verification">{te.optDocVerification}</option>
                <option value="Site Inspection">{te.optSiteInspection}</option>
                <option value="Sanction Approval">{te.optSanctionApproval}</option>
                <option value="Meter Installed">{te.optMeterInstalled}</option>
                <option value="Rejected">{te.optRejected}</option>
                <option value="Archived">{te.optArchived} ({archivedApplications.length})</option>
              </select>
            </div>
          </div>

          {/* Quick Status Filter Pills & Color Legend */}
          <div className="flex items-center justify-between gap-2 flex-wrap p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { value: 'All', label: `${te.pillAllActive} (${activeApplications.length})`, dot: 'bg-slate-500' },
                { value: 'Action Required', label: `${te.pillNeedsReview} (${actionRequiredCount})`, dot: 'bg-amber-500' },
                { value: 'Submitted', label: te.pillSubmitted, dot: 'bg-blue-500' },
                { value: 'Document Verification', label: te.pillDocScrutiny, dot: 'bg-amber-500' },
                { value: 'Site Inspection', label: te.pillSiteInspection, dot: 'bg-amber-500' },
                { value: 'Sanction Approval', label: te.pillAwaitingApproval, dot: 'bg-purple-500' },
                { value: 'Meter Installed', label: te.pillApprovedEnergized, dot: 'bg-emerald-500' },
                { value: 'Rejected', label: te.pillRejected, dot: 'bg-rose-500' },
                { value: 'Archived', label: `${te.pillArchived} (${archivedApplications.length})`, dot: 'bg-slate-400' }
              ].map(pill => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStatusFilter(pill.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === pill.value
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${pill.dot}`} />
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Inline Confirmation Banner for Safe Application Archiving */}
          {confirmArchiveAppId && (
            <div
              role="region"
              aria-label={te.archiveConfirmTitlePrefix}
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{te.archiveConfirmTitlePrefix} {confirmArchiveAppId}</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  {te.archiveConfirmBody}
                </p>
                <input
                  type="text"
                  value={archiveReasonInput}
                  onChange={e => setArchiveReasonInput(e.target.value)}
                  placeholder={te.archiveRemarkPlaceholder}
                  className="w-full sm:w-96 mt-1 px-2.5 py-1.5 text-xs rounded border border-amber-300 bg-white text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmArchiveAppId(null);
                    setArchiveReasonInput('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmArchive(confirmArchiveAppId)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  {te.archiveConfirmBtn}
                </button>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colAppRef}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colApplicantContact}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colCategoryLoad}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colSubdivision}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colEstSanction}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colLifecycleStatus}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{te.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                        {te.noAppsMatchEmpty}
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map(app => {
                      const rawMeta = getApplicationStatusDisplayMeta(app);
                      const meta = localizeApplicationStatusMeta(rawMeta, language);
                      const archivable = canArchiveApplication(app);

                      return (
                        <tr
                          key={app.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${meta.rowAccentClasses}`}
                        >
                          <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            <div>{app.id}</div>
                            <div className="text-[10px] font-sans font-medium text-slate-400">
                              {te.filedDatePrefix} {app.appliedDate}
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white">{app.applicantName}</div>
                            <div className="text-[11px] text-slate-400">{app.phone}</div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{localizeTariffCategory(app.category, language)}</div>
                            <div className="text-[11px] text-slate-400">{app.requestedLoadKw} kW · {localizePhase(app.phase, language)}</div>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {localizeSubdivision(app.subdivision, language)}
                          </td>
                          <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                            ₹{app.estimatedSanctionCost.toLocaleString()}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${meta.badgeClasses}`}
                                >
                                  {meta.colorTone === 'green' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                                  {meta.colorTone === 'red' && <XCircle className="w-3 h-3 shrink-0" />}
                                  {meta.colorTone === 'amber' && <Clock className="w-3 h-3 shrink-0" />}
                                  {meta.colorTone === 'purple' && <ShieldCheck className="w-3 h-3 shrink-0" />}
                                  {meta.colorTone === 'blue' && <Inbox className="w-3 h-3 shrink-0" />}
                                  <span>{localizeApplicationStatus(app.status, language)}</span>
                                  <span className="opacity-75">· {meta.stageSummaryLabel}</span>
                                </span>

                                {app.assignedWorkOrderId && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                    {app.assignedWorkOrderId}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                    meta.requiresEmployeeAction
                                      ? 'bg-amber-100/80 text-amber-900 font-bold'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {meta.reviewStateLabel}
                                </span>
                                {app.clarificationRequested && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    {te.clarificationRequestedBadge}
                                  </span>
                                )}
                                {app.isArchived && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                    {te.pillArchived} {app.archivedBy ? `${te.archivedByPrefix} ${app.archivedBy}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openCaseDrawer('application', app.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                            >
                              {te.inspectCaseBtn}
                            </button>

                            {!app.isArchived && archivable && (
                              <button
                                type="button"
                                onClick={() => setConfirmArchiveAppId(app.id)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                title={te.archiveBtnTitle}
                              >
                                <Archive className="w-3 h-3" />
                                <span>{te.archiveBtn}</span>
                              </button>
                            )}

                            {app.isArchived && (
                              <button
                                type="button"
                                onClick={() => restoreApplication(app.id)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                title={te.restoreBtnTitle}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{te.restoreBtn}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CONSUMER LEDGER */}
      {activeTab === 'consumers' && (
        <div className="space-y-4 min-w-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {te.consumerLedgerTitle}
            </h2>
            <p className="text-xs text-slate-500">
              {te.consumerLedgerSubtitle}
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colConsumerNo}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colNameAddress}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colTariffCategory}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colConnectedFeeder}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colMeterSerial}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{te.colCurrentReading}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{te.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {connections.map(conn => (
                    <tr key={conn.consumerNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {conn.consumerNo}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{conn.consumerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{conn.address}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {localizeTariffCategory(conn.tariffCategory, language)}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {conn.feederName}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {conn.meterNo}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {conn.currentReadingKwh} kWh
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          {localizeConnectionStatus(conn.status, language)}
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

      {/* VIEW 4: COMPLAINT MANAGEMENT */}
      {activeTab === 'complaints' && (
        <div className="space-y-4 min-w-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {te.complaintMatrixTitle}
            </h2>
            <p className="text-xs text-slate-500">
              {te.complaintMatrixSubtitle}
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colTicketId}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colConsumer}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colCategoryDesc}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colPriority}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colSlaWindow}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{te.colStatus}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{te.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredCmps.map(cmp => (
                    <tr key={cmp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {cmp.id}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{cmp.consumerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cmp.consumerNo}</div>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{localizeComplaintCategory(cmp.category, language)}</div>
                        <div className="text-[11px] text-slate-400 truncate">{localizeComplaintDescription(cmp.id, cmp.description, language)}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          cmp.priority === 'Critical'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {localizePriorityLevel(cmp.priority, language)}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {localizeSlaDuration(cmp.slaTargetHours, language)} ({cmp.slaDueTime})
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                            {localizeComplaintStatus(cmp.status, language)}
                          </span>
                          {cmp.assignedWorkOrderId && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                              {cmp.assignedWorkOrderId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openCaseDrawer('complaint', cmp.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-600 hover:text-white whitespace-nowrap"
                        >
                          {te.actionTicketBtn}
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

      {/* VIEW 5: HUMAN-IN-THE-LOOP APPROVAL CENTER */}
      {activeTab === 'approvals' && (
        <div className="space-y-4 sm:space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{te.approvalCenterTitle}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {te.approvalCenterSubtitle}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
              {te.rbacGuardActiveBadge}
            </span>
          </div>

          {/* Quick Metrics */}
          {(() => {
            const employeeRecs = recommendations.filter(
              r => r.requiredApprovingRole === 'employee' || r.agentRole === 'employee' || r.requiredApprovingRole === 'management'
            );
            const pending = employeeRecs.filter(r => r.status === 'PENDING_APPROVAL');
            const executed = employeeRecs.filter(r => r.status === 'EXECUTED');
            const rejected = employeeRecs.filter(r => r.status === 'REJECTED');

            const displayedRecs = employeeRecs.filter(r => {
              if (approvalFilter === 'All') return true;
              return r.status === approvalFilter;
            });

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      {te.metricTotalProposals}
                    </span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {employeeRecs.length}
                    </div>
                    <span className="text-xs text-slate-500">{te.metricGroundedInErp}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                      {te.metricAwaitingDecision}
                    </span>
                    <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
                      {pending.length}
                    </div>
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{te.metricPendingReview}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-1">
                      {te.metricApprovedExecuted}
                    </span>
                    <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                      {executed.length}
                    </div>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{te.metricCommittedToErp}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
                      {te.metricRejectedProposals}
                    </span>
                    <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
                      {rejected.length}
                    </div>
                    <span className="text-xs text-slate-500">{te.metricCancelledByHuman}</span>
                  </div>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['All', 'PENDING_APPROVAL', 'EXECUTED', 'REJECTED'].map(f => (
                    <button
                      key={f}
                      onClick={() => setApprovalFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                        approvalFilter === f
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-[#101C35] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f === 'PENDING_APPROVAL'
                        ? te.filterPendingReview
                        : f === 'EXECUTED'
                        ? te.filterApprovedExecuted
                        : f === 'REJECTED'
                        ? te.filterRejected
                        : te.filterAllProposals}
                    </button>
                  ))}
                </div>

                {/* Recommendations Table */}
                <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3.5 font-semibold whitespace-nowrap">{te.colIdAgent}</th>
                          <th className="p-3.5 font-semibold whitespace-nowrap">{te.colActionTarget}</th>
                          <th className="p-3.5 font-semibold whitespace-nowrap">{te.colStateDiff}</th>
                          <th className="p-3.5 font-semibold whitespace-nowrap">{te.colRiskLevel}</th>
                          <th className="p-3.5 font-semibold whitespace-nowrap">{te.colRequiredRole}</th>
                          <th className="p-3.5 font-semibold whitespace-nowrap">{te.colStatus}</th>
                          <th className="p-3.5 font-semibold text-right whitespace-nowrap">{te.colOperatorReview}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {displayedRecs.map(rawRec => {
                          const rec = localizeAIRecommendation(rawRec, language);
                          return (
                            <tr key={rawRec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="p-3.5 whitespace-nowrap">
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                                  {rawRec.id}
                                </span>
                                <span className="text-[11px] text-slate-500">{rec.agentPersonaName}</span>
                              </td>
                              <td className="p-3.5 max-w-xs">
                                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                                  {rec.title}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {rec.entityTypeLabel}: {rawRec.affectedRecord.id}
                                </div>
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <span className="line-through text-slate-400">{rec.previousValueLabel}</span>
                                  <span>→</span>
                                  <span className="font-bold text-emerald-600">{rec.proposedValueLabel}</span>
                                </div>
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                    rawRec.riskLevel === 'CRITICAL'
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                      : rawRec.riskLevel === 'HIGH'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  }`}
                                >
                                  {rec.riskLevelLabel}
                                </span>
                              </td>
                              <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap uppercase text-[11px]">
                                {rec.requiredRoleLabel}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                                    rawRec.status === 'EXECUTED'
                                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                      : rawRec.status === 'REJECTED'
                                      ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                      : rawRec.status === 'FAILED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {rec.statusLabel}
                                </span>
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                {rawRec.status === 'PENDING_APPROVAL' ? (
                                  <button
                                    onClick={() => openApprovalModal(rawRec)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-3xs cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <span>{te.reviewAndDecideBtn}</span>
                                  </button>
                                ) : (
                                  <div className="text-[11px] text-slate-500">
                                    <span>{te.reviewedByPrefix} {rawRec.reviewedBy || 'Operator'}</span>
                                    {rawRec.decisionRemarks && (
                                      <div className="italic text-[10px] truncate max-w-xs">&quot;{rawRec.decisionRemarks}&quot;</div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* VIEW 6: DEPARTMENT COORDINATION */}
      {activeTab === 'coordination' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{te.interDeptRequisitionsTitle}</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{te.req1Dept}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{te.req1Desc}</div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0">{te.req1StatusDispatched}</span>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{te.req2Dept}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{te.req2Desc}</div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 shrink-0">{te.req2StatusInReview}</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardHat className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{te.lineSquadMobilizationTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {te.lineSquadMobilizationDesc}
            </p>
            <div className="p-3.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
              {te.emergencyChannelStatus}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 6: REVENUE REPORTS */}
      {activeTab === 'reports' && (
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {te.revenueReportTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {te.revenueReportSubtitle}
              </p>
            </div>
            <button
              onClick={() => showToast(te.exportedCsvToast, 'success')}
              className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              {te.exportCsvBtn}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">{te.revTotalEnergyBilled}</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">161.9 MU</span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">{te.revCollectedTitle}</span>
              <span className="text-xl font-bold font-mono text-emerald-600">{te.revCollectedValue}</span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">{te.revEfficiencyTitle}</span>
              <span className="text-xl font-bold font-mono text-blue-600">98.4%</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: INCIDENT CONTROL DESK */}
      {activeTab === 'incidents' && (
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t.incident.controlDeskTitle}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {t.incident.employeeFirstTriageBadge}
                </span>
                {activeUser.subdivision && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {t.incident.jurisdictionPrefix} {localizeSubdivision(activeUser.subdivision, language)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t.incident.controlDeskDescription}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {roleIncidents.length} {t.incident.scopedIncidentsSuffix}
              </span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => setIncidentStatusFilter('New')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                incidentStatusFilter === 'New'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-2xs'
                  : 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-0.5">
                {t.incident.metricNewDetected}
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {newIncidentsCount}
              </div>
              <span className="text-[11px] text-slate-500">{t.incident.metricUnacknowledged}</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentStatusFilter('Acknowledged')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                incidentStatusFilter === 'Acknowledged'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-2xs'
                  : 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-0.5">
                {t.incident.metricAcknowledged}
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {acknowledgedIncidentsCount}
              </div>
              <span className="text-[11px] text-slate-500">{t.incident.metricInTriage}</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentStatusFilter('Assigned')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                incidentStatusFilter === 'Assigned'
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 shadow-2xs'
                  : 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 block mb-0.5">
                {t.incident.metricAssigned}
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {assignedIncidentsCount}
              </div>
              <span className="text-[11px] text-slate-500">{t.incident.metricDispatchedToField}</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentStatusFilter('Escalated')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                incidentStatusFilter === 'Escalated'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-2xs'
                  : 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-0.5">
                {t.incident.metricEscalated}
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {escalatedIncidentsCount}
              </div>
              <span className="text-[11px] text-slate-500">{t.incident.metricWithManagement}</span>
            </button>

            <button
              type="button"
              onClick={() => setIncidentStatusFilter('Resolved')}
              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                incidentStatusFilter === 'Resolved'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                  : 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block mb-0.5">
                {t.incident.metricResolved}
              </span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {resolvedIncidentsCount}
              </div>
              <span className="text-[11px] text-slate-500">{t.incident.metricRestored}</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800">
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { value: 'All', label: `${t.incident.filterAll} (${roleIncidents.length})` },
                { value: 'New', label: `${t.incident.filterNew} (${newIncidentsCount})` },
                { value: 'Acknowledged', label: `${t.incident.filterAcknowledged} (${acknowledgedIncidentsCount})` },
                { value: 'Assigned', label: `${t.incident.filterAssigned} (${assignedIncidentsCount})` },
                { value: 'Escalated', label: `${t.incident.filterEscalated} (${escalatedIncidentsCount})` },
                { value: 'Resolved', label: `${t.incident.filterResolved} (${resolvedIncidentsCount})` }
              ].map(pill => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setIncidentStatusFilter(pill.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    incidentStatusFilter === pill.value
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={incidentSearchQuery}
                onChange={e => setIncidentSearchQuery(e.target.value)}
                placeholder={t.incident.searchPlaceholder}
                aria-label={t.incident.searchAriaLabel}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Incidents List / Table */}
          {filteredEmployeeIncidents.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t.incident.noIncidentsTitle}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t.incident.noIncidentsDescPrefix} &quot;
                {incidentStatusFilter === 'All'
                  ? t.incident.filterAll
                  : incidentStatusFilter === 'New'
                  ? t.incident.filterNew
                  : incidentStatusFilter === 'Acknowledged'
                  ? t.incident.filterAcknowledged
                  : incidentStatusFilter === 'Assigned'
                  ? t.incident.filterAssigned
                  : incidentStatusFilter === 'Escalated'
                  ? t.incident.filterEscalated
                  : incidentStatusFilter === 'Resolved'
                  ? t.incident.filterResolved
                  : incidentStatusFilter}
                &quot; {t.incident.noIncidentsDescSuffix}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployeeIncidents.map(rawInc => {
                const inc = localizeIncident(rawInc, language);
                const isCritical = rawInc.severity === 'CRITICAL';
                const isLifeThreat = Boolean(rawInc.isEmergencyOverride);

                return (
                  <div
                    key={inc.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-all ${
                      isLifeThreat
                        ? 'border-rose-400 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                        : isCritical
                        ? 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-[#101C35]'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C35]'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {inc.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : inc.severity === 'WARNING'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {inc.severityLabel}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              inc.status === 'DETECTED'
                                ? 'bg-rose-600 text-white'
                                : inc.status === 'ACKNOWLEDGED'
                                ? 'bg-blue-600 text-white'
                                : inc.status === 'ASSIGNED'
                                ? 'bg-teal-600 text-white'
                                : inc.status === 'ESCALATED'
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {inc.statusLabel}
                          </span>

                          {(inc.assignmentStatus === 'DECLINED' ||
                            (inc.lastDeclinedReason && !inc.assignedToUserId)) && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white border border-rose-700">
                              {t.incident.assignmentDeclinedBanner}
                            </span>
                          )}

                          {isLifeThreat && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1 animate-pulse">
                              <Flame className="w-3 h-3" />
                              <span>{t.incident.emergencyOverrideBadge}</span>
                            </span>
                          )}

                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatErpDateTime(inc.timestamp)}</span>
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {inc.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {inc.description}
                        </p>

                        {(inc.assignmentStatus === 'DECLINED' ||
                          (inc.lastDeclinedReason && !inc.assignedToUserId)) && (
                          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                            <div className="font-bold flex items-center justify-between gap-2 flex-wrap">
                              <span>
                                {t.incident.assignmentDeclinedByPrefix} {inc.lastDeclinedByName || inc.previousEngineerName || t.erp.roleField}
                                {inc.lastDeclinedByUserId || inc.previousEngineerId
                                  ? ` (${inc.lastDeclinedByUserId || inc.previousEngineerId})`
                                  : ''}
                              </span>
                              {inc.lastDeclinedAt && (
                                <span className="text-[11px] font-mono text-rose-700 dark:text-rose-300">
                                  {formatErpDateTime(inc.lastDeclinedAt)}
                                </span>
                              )}
                            </div>
                            {inc.lastDeclinedReason && (
                              <p className="mt-1 text-rose-800 dark:text-rose-300">
                                <strong>{t.incident.declineReasonPrefix}</strong> &quot;{inc.lastDeclinedReason}&quot;
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t.incident.feederAssetLabel} <strong className="font-mono text-slate-700 dark:text-slate-300">{inc.entityId || t.incident.defaultAssetGrid}</strong></span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.incident.jurisdictionLabel} <strong className="text-slate-700 dark:text-slate-300">{localizeSubdivision(inc.subdivision, language) || t.incident.defaultJurisdiction}</strong></span>
                          </span>
                          {inc.assignedEngineerName && (
                            <span className="flex items-center gap-1 text-teal-700 dark:text-teal-300 font-semibold">
                              <HardHat className="w-3.5 h-3.5" />
                              <span>
                                {t.incident.assignedEngineerLabel} {inc.assignedEngineerName}
                                {inc.assignedToUserId ? ` (${inc.assignedToUserId})` : ''}
                                {inc.previousEngineerName
                                  ? ` ${t.incident.reassignedFromPrefix} ${inc.previousEngineerName}`
                                  : ''}
                              </span>
                            </span>
                          )}
                          {inc.escalatedToUserName && (
                            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>{t.incident.escalatedToLabel} {inc.escalatedToUserName}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => openIncidentModal(inc.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.incident.btnViewIssue}</span>
                        </button>

                        {inc.status === 'DETECTED' && (
                          <button
                            type="button"
                            onClick={() => acknowledgeIncident(inc.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t.incident.btnAcknowledge}</span>
                          </button>
                        )}

                        {inc.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(inc)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <HardHat className="w-3.5 h-3.5" />
                            <span>
                              {rawInc.assignedToUserId || rawInc.assignmentStatus === 'DECLINED' || rawInc.lastDeclinedReason
                                ? t.incident.btnReassignFieldEngineer
                                : t.incident.btnAssignFieldEngineer}
                            </span>
                          </button>
                        )}

                        {inc.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenEscalateModal(inc)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>{t.incident.btnEscalateToManagement}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ASSIGN / REASSIGN FIELD ENGINEER */}
      {assignModalIncident && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            assignModalIncident.assignedToUserId
              ? t.incident.modalReassignTitle
              : t.incident.modalAssignTitle
          }
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setAssignModalIncident(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {assignModalIncident.assignedToUserId
                    ? t.incident.modalReassignTitle
                    : t.incident.modalAssignTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalIncident(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {assignModalIncident.id}: {localizeIncidentTitle(assignModalIncident.title, language)}
                </div>
                <div className="text-slate-500">
                  {t.incident.feederAssetLabel} {assignModalIncident.entityId} · {t.incident.jurisdictionLabel} {localizeSubdivision(assignModalIncident.subdivision, language)}
                </div>
                {assignModalIncident.assignedEngineerName && (
                  <div className="text-amber-700 dark:text-amber-300 font-semibold pt-0.5">
                    {t.incident.modalCurrentlyAssignedPrefix} {assignModalIncident.assignedEngineerName} ({assignModalIncident.assignedToUserId})
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmAssignment} className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.incident.modalSelectEligibleEngineer} *
                  </label>
                  <select
                    value={targetEngineerId}
                    onChange={e => setTargetEngineerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    {fieldEngineers.map(fe => {
                      const isJurisdictionMatch =
                        Boolean(assignModalIncident.subdivision) &&
                        fe.subdivision.toLowerCase() === assignModalIncident.subdivision!.toLowerCase();
                      return (
                        <option key={fe.id} value={fe.id}>
                          {fe.name} ({fe.id}) — {localizeSubdivision(fe.subdivision, language)} [{localizeFieldEngineerStatus(fe.status, language)}]
                          {isJurisdictionMatch ? ` ★ ${t.incident.modalJurisdictionMatchBadge}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t.incident.modalAssignHelpNotice}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {assignModalIncident.assignedToUserId
                      ? t.incident.modalReasonReassignLabel
                      : t.incident.modalInstructionsAssignLabel}
                  </label>
                  <textarea
                    value={assignNotes}
                    onChange={e => setAssignNotes(e.target.value)}
                    required={Boolean(assignModalIncident.assignedToUserId)}
                    rows={3}
                    placeholder={
                      assignModalIncident.assignedToUserId
                        ? t.incident.modalPlaceholderReassign
                        : t.incident.modalPlaceholderAssign
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAssignModalIncident(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {t.incident.modalBtnCancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {assignModalIncident.assignedToUserId
                        ? t.incident.modalBtnConfirmReassign
                        : t.incident.modalBtnConfirmAssign}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESCALATE TO MANAGEMENT */}
      {escalateModalIncident && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.incident.modalEscalateTitle}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEscalateModalIncident(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.incident.modalEscalateTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModalIncident(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1">
                <div className="font-bold text-amber-950 dark:text-amber-200">
                  {escalateModalIncident.id}: {localizeIncidentTitle(escalateModalIncident.title, language)}
                </div>
                <div className="text-amber-800 dark:text-amber-300">
                  {t.incident.modalSeveritySubdivPrefix} {localizeIncidentSeverity(escalateModalIncident.severity, language)} · {localizeSubdivision(escalateModalIncident.subdivision, language)}
                </div>
              </div>

              <form onSubmit={handleConfirmEscalation} className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.incident.modalSelectTargetAuthority} *
                  </label>
                  <select
                    value={targetManagerId}
                    onChange={e => setTargetManagerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="usr_mgmt_01">{t.incident.modalAuthoritySolanki}</option>
                    <option value="usr_mgmt_02">{t.incident.modalAuthorityShah}</option>
                    <option value="usr_mgmt_03">{t.incident.modalAuthorityJoshi}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t.incident.modalJustificationLabel}
                  </label>
                  <textarea
                    value={escalateReasonInput}
                    onChange={e => setEscalateReasonInput(e.target.value)}
                    required
                    rows={3}
                    placeholder={t.incident.modalJustificationPlaceholder}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t.incident.modalEscalateHelpNotice}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEscalateModalIncident(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {t.incident.modalBtnCancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{t.incident.modalBtnConfirmEscalation}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ISSUE & AUDIT TRAIL */}
      {detailsIncident && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.incident.dossierTitlePrefix}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDetailsIncident(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.incident.dossierTitlePrefix}: {detailsIncident.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsIncident(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.dossierSeverityLabel}</span>
                  <span className="font-bold text-rose-600">{localizeIncidentSeverity(detailsIncident.severity, language)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.dossierStatusLabel}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{localizeIncidentStatus(detailsIncident.status, language)}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.dossierAssetFeederLabel}</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{detailsIncident.entityId || t.incident.defaultAssetGrid}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.dossierJurisdictionLabel}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{localizeSubdivision(detailsIncident.subdivision, language) || t.incident.defaultJurisdiction}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{t.incident.dossierSummaryHeading}</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {localizeIncidentDescription(detailsIncident.description, language)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">
                  {t.incident.dossierSopHeading}:
                </span>
                <span className="text-amber-800 dark:text-amber-300">
                  {localizeIncidentSopAction(detailsIncident.recommendedAction, language)}
                </span>
              </div>

              {/* Assignment / Escalation Detail if present */}
              {(detailsIncident.assignedEngineerName || detailsIncident.escalatedToUserName) && (
                <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-1">
                  <div className="font-bold text-teal-900 dark:text-teal-200">
                    {t.incident.dossierRoutingStatusHeading}
                  </div>
                  {detailsIncident.assignedEngineerName && (
                    <div className="text-teal-800 dark:text-teal-300">
                      {t.incident.dossierAssignedEngineerPrefix} <strong>{detailsIncident.assignedEngineerName}</strong> ({detailsIncident.assignedToUserId}) {t.incident.dossierAtTimePrefix} {detailsIncident.assignedAt ? new Date(detailsIncident.assignedAt).toLocaleTimeString() : 'N/A'}.
                      {detailsIncident.assignmentNotes && (
                        <div className="italic mt-0.5">&quot;{detailsIncident.assignmentNotes}&quot;</div>
                      )}
                    </div>
                  )}
                  {detailsIncident.escalatedToUserName && (
                    <div className="text-amber-800 dark:text-amber-300">
                      {t.incident.dossierEscalatedToPrefix} <strong>{detailsIncident.escalatedToUserName}</strong> ({detailsIncident.escalatedToUserId}). {t.incident.dossierReasonPrefix} &quot;{detailsIncident.escalatedReason}&quot;
                    </div>
                  )}
                </div>
              )}

              {/* Audit History Timeline */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.incident.dossierAuditTrailHeading} ({detailsIncident.history.length})</span>
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 ml-1.5">
                  {detailsIncident.history.map((hist, idx) => (
                    <div key={idx} className="space-y-0.5 relative">
                      <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute -left-[16px] top-1.5" />
                        <span>{localizeIncidentAuditStage(hist.stage, language)}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{t.incident.dossierByActorPrefix} {hist.actor}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">{new Date(hist.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{localizeAuditTrailNote(hist.notes, language)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailsIncident(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 cursor-pointer"
              >
                {t.incident.dossierBtnClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
