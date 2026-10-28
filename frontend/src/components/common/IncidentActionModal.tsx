import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSopAction,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentAuditStage,
  localizeIncidentApprovalDecision,
  localizeEmergencyClassification,
  localizeAuditTrailNote
} from '../../i18n/incidentLocalization';
import { localizeSubdivision } from '../../i18n/consumerContentTranslations';
import { localizeIncidentAccessDenialReason } from '../../i18n/employeeContentTranslations';
import { CriticalIncident, IncidentSeverity, IncidentStatus, IncidentApprovalDecision } from '../../types';
import { formatErpDateTime } from '../../utils/dateUtils';
import {
  isConfirmedEmergencyHazard,
  normalizeAndHealIncidentRouting,
  authorizeIncidentModalAccess
} from '../../utils/anomalyDetector';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Send,
  Wrench,
  HelpCircle,
  FileText,
  User,
  MapPin,
  Flame,
  Check,
  X
} from 'lucide-react';

interface IncidentActionModalProps {
  isOpen: boolean;
  incidentId: string | null;
  onClose: () => void;
}

export const IncidentActionModal: React.FC<IncidentActionModalProps> = ({
  isOpen,
  incidentId,
  onClose
}) => {
  const {
    incidents,
    currentRole,
    demoSession,
    activeUser,
    acceptFieldAssignment,
    declineFieldAssignment,
    startFieldInspection,
    submitFieldFindings,
    requestFieldAssistance,
    submitFieldResolutionReport,
    approveEscalation,
    rejectEscalation,
    requestMoreInfo,
    showToast
  } = useApp();

  const { t, language } = useLanguage();
  const te = t.employee;
  const tf = t.field;
  const effectiveRole = demoSession ? demoSession.role : currentRole;

  // Action form states
  const [activeActionTab, setActiveActionTab] = useState<'overview' | 'action' | 'history'>('overview');
  const [declineReason, setDeclineReason] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [findingsInput, setFindingsInput] = useState('');
  const [assistanceInput, setAssistanceInput] = useState('');
  const [resolutionReportInput, setResolutionReportInput] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [moreInfoQuestion, setMoreInfoQuestion] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showMoreInfoForm, setShowMoreInfoForm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveActionTab('overview');
      setDeclineReason('');
      setInspectionNotes('');
      setFindingsInput('');
      setAssistanceInput('');
      setResolutionReportInput('');
      setApprovalRemarks('');
      setRejectionReason('');
      setMoreInfoQuestion('');
      setShowDeclineForm(false);
      setShowRejectForm(false);
      setShowMoreInfoForm(false);
    }
  }, [isOpen]);

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !incidentId) return null;

  const rawIncident = incidents.find(i => i.id === incidentId);

  // Missing record state
  if (!rawIncident) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-not-found-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-3"
          onClick={e => e.stopPropagation()}
        >
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 id="incident-not-found-title" className="text-base font-bold text-slate-900 dark:text-white">
            {t.incident.dossierRecordNotFoundTitle}
          </h3>
          <p className="text-xs text-slate-500">
            {t.incident.dossierRecordNotFoundDesc} (<strong className="font-mono text-slate-700 dark:text-slate-300">{incidentId}</strong>)
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
          >
            {t.incident.dossierBtnClose}
          </button>
        </div>
      </div>
    );
  }

  const incident = normalizeAndHealIncidentRouting(rawIncident);
  const isEmergency = isConfirmedEmergencyHazard(incident);
  const { isAuthorized, denialReason } = authorizeIncidentModalAccess(incident, effectiveRole, activeUser);

  const effectiveRoleLabel =
    effectiveRole === 'employee'
      ? t.erp.roleEmployee
      : effectiveRole === 'field'
      ? t.erp.roleField
      : effectiveRole === 'management'
      ? t.erp.roleManagement
      : effectiveRole === 'admin'
      ? t.erp.roleAdmin
      : t.erp.roleConsumer;

  if (!isAuthorized) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-denied-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white dark:bg-[#101C35] border border-rose-200 dark:border-rose-900/50 shadow-2xl p-6 text-center space-y-3"
          onClick={e => e.stopPropagation()}
        >
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 id="incident-denied-title" className="text-base font-bold text-slate-900 dark:text-white">
            {t.incident.dossierAccessDeniedTitle}
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {denialReason ? localizeIncidentAccessDenialReason(denialReason, language) : ''}
          </p>
          <p className="text-[11px] text-slate-400">
            {t.incident.dossierTitlePrefix}: <strong className="font-mono">{incident.id}</strong> · {t.incident.dossierCurrentRolePrefix} <strong>{effectiveRoleLabel}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
          >
            {t.incident.alertBtnDismiss}
          </button>
        </div>
      </div>
    );
  }

  // Helper status color classes
  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'WARNING':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300';
      case 'IN_PROGRESS':
      case 'ASSIGNED':
      case 'ESCALATED':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300';
    }
  };

  const getApprovalBadge = (appStatus?: IncidentApprovalDecision) => {
    switch (appStatus) {
      case 'APPROVED':
        return { label: 'Concurrence Approved', class: 'bg-emerald-600 text-white' };
      case 'REJECTED':
        return { label: 'Escalation Rejected', class: 'bg-rose-600 text-white' };
      case 'MORE_INFO_REQUIRED':
        return { label: 'More Information Required', class: 'bg-amber-500 text-white' };
      case 'PENDING_APPROVAL':
        return { label: 'Pending Management Concurrence', class: 'bg-purple-600 text-white' };
      default:
        return null;
    }
  };

  const approvalBadge = getApprovalBadge(incident.approvalStatus);

  // Field Engineer action handlers
  const handleAcceptAssignment = () => {
    acceptFieldAssignment(incident.id);
    onClose();
  };

  const handleDeclineAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      showToast('Decline reason is mandatory.', 'warning');
      return;
    }
    declineFieldAssignment(incident.id, declineReason.trim());
    onClose();
  };

  const handleStartInspection = () => {
    startFieldInspection(incident.id, inspectionNotes.trim() || undefined);
    setActiveActionTab('overview');
  };

  const handleSubmitFindings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingsInput.trim()) {
      showToast('Technical observations/findings are required.', 'warning');
      return;
    }
    submitFieldFindings(incident.id, findingsInput.trim());
    setFindingsInput('');
    setActiveActionTab('overview');
  };

  const handleRequestAssistance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistanceInput.trim()) {
      showToast('Assistance specifications are required.', 'warning');
      return;
    }
    requestFieldAssistance(incident.id, assistanceInput.trim());
    setAssistanceInput('');
    setActiveActionTab('overview');
  };

  const handleSubmitResolutionReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionReportInput.trim()) {
      showToast('Resolution summary report is required.', 'warning');
      return;
    }
    submitFieldResolutionReport(incident.id, resolutionReportInput.trim());
    onClose();
  };

  // Management action handlers
  const handleApproveEscalation = () => {
    approveEscalation(incident.id, approvalRemarks.trim() || undefined);
    onClose();
  };

  const handleRejectEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showToast('Mandatory rejection reason required.', 'warning');
      return;
    }
    rejectEscalation(incident.id, rejectionReason.trim());
    onClose();
  };

  const handleRequestMoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moreInfoQuestion.trim()) {
      showToast('Specific question/information required.', 'warning');
      return;
    }
    requestMoreInfo(incident.id, moreInfoQuestion.trim());
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="incident-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {t.incident.dossierTitlePrefix}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {incident.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {te.incidentModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={t.incident.dossierBtnClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Banner if Active */}
        {incident.isEmergencyOverride && (
          <div className="p-3 rounded-xl bg-red-600 text-white flex items-center gap-2.5">
            <Flame className="w-5 h-5 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <strong className="block text-xs uppercase tracking-wide">{t.incident.dossierEmergencyActiveTitle}</strong>
              <span className="text-[11px] text-red-100">
                {t.incident.dossierClassificationPrefix} {localizeEmergencyClassification(incident.emergencyClassification, language)}. {te.incidentModalStandbyAlerts}
              </span>
            </div>
          </div>
        )}

        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${getSeverityBadge(incident.severity)}`}>
            {localizeIncidentSeverity(incident.severity, language)}
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${getStatusBadge(incident.status)}`}>
            {localizeIncidentStatus(incident.status, language)}
          </span>
          {approvalBadge && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${approvalBadge.class}`}>
              {t.incident.decisionStatusPrefix} {localizeIncidentApprovalDecision(incident.approvalStatus, language)}
            </span>
          )}
          <span className="text-slate-400 ml-auto font-mono text-[11px]">
            {t.incident.dossierDetectedPrefix} {formatErpDateTime(incident.timestamp)}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveActionTab('overview')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeActionTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.incident.dossierTabDetails}
          </button>
          <button
            type="button"
            onClick={() => setActiveActionTab('action')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeActionTab === 'action'
                ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.incident.dossierTabActionDeskPrefix} ({effectiveRoleLabel})
          </button>
          <button
            type="button"
            onClick={() => setActiveActionTab('history')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeActionTab === 'history'
                ? 'border-b-2 border-blue-600 text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.incident.dossierTabAuditTrail} ({incident.history?.length || 0})
          </button>
        </div>

        {/* TAB 1: OVERVIEW & TELEMETRY */}
        {activeActionTab === 'overview' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.feederAssetLabel}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{incident.entityId}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.jurisdictionLabel}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{localizeSubdivision(incident.subdivision, language) || t.incident.defaultJurisdiction}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">{t.incident.dossierOriginatingStaffLabel}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{incident.originatingEmployeeName || incident.assignedBy || 'SCADA Sentinel'}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{t.incident.dossierSummaryHeading}</h4>
              <p className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                {localizeIncidentDescription(incident.description, language)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <span className="font-bold text-amber-900 dark:text-amber-200 block mb-0.5">{t.incident.dossierSopHeading}</span>
              <p className="text-amber-800 dark:text-amber-300">
                {localizeIncidentSopAction(incident.recommendedAction, language)}
              </p>
            </div>

            {/* Field Assignment Metadata */}
            {incident.assignedToUserId && (
              <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 dark:text-teal-200">
                    {te.incidentModalFieldAssignmentLabel} {incident.assignedEngineerName} ({incident.assignedToUserId})
                  </span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-mono">
                    {te.incidentModalAssignedLabel} {formatErpDateTime(incident.assignedAt)}
                  </span>
                </div>
                {incident.assignmentNotes && (
                  <p className="text-teal-800 dark:text-teal-300 italic">
                    {te.incidentModalInstructionsLabel} &quot;{localizeAuditTrailNote(incident.assignmentNotes, language)}&quot;
                  </p>
                )}
              </div>
            )}

            {/* Declined Assignment Metadata */}
            {(incident.assignmentStatus === 'DECLINED' ||
              (incident.lastDeclinedReason && !incident.assignedToUserId)) && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 dark:text-rose-200">
                    {te.incidentModalDeclinedTitle} {incident.lastDeclinedByName || incident.previousEngineerName || t.erp.roleField}
                    {incident.lastDeclinedByUserId || incident.previousEngineerId
                      ? ` (${incident.lastDeclinedByUserId || incident.previousEngineerId})`
                      : ''}
                  </span>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono">
                    {te.incidentModalDeclinedAtLabel} {formatErpDateTime(incident.lastDeclinedAt)}
                  </span>
                </div>
                {incident.lastDeclinedReason && (
                  <p className="text-rose-800 dark:text-rose-300">
                    {te.incidentModalMandatoryDeclineReasonLabel} &quot;{localizeAuditTrailNote(incident.lastDeclinedReason, language)}&quot;
                  </p>
                )}
              </div>
            )}

            {/* Management Escalation Metadata */}
            {incident.escalatedReason && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 dark:text-purple-200">
                    {te.incidentModalManagementEscalationLabel} {incident.escalatedToUserName || incident.escalatedToUserId || t.erp.roleManagement}
                  </span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-mono">
                    {te.incidentModalEscalatedAtLabel} {formatErpDateTime(incident.escalatedAt)}
                  </span>
                </div>
                <p className="text-purple-800 dark:text-purple-300">
                  {te.incidentModalJustificationLabel} &quot;{localizeAuditTrailNote(incident.escalatedReason, language)}&quot;
                </p>
                {incident.approvalStatus && (
                  <p className="text-[11px] font-semibold text-purple-900 dark:text-purple-200 pt-1">
                    {t.incident.decisionStatusPrefix} {localizeIncidentApprovalDecision(incident.approvalStatus, language)}{' '}
                    {incident.approvalDecisionRemarks ? `— "${localizeAuditTrailNote(incident.approvalDecisionRemarks, language)}"` : ''}{' '}
                    {incident.approvalDecisionReason ? `— ${t.incident.dossierReasonPrefix} "${localizeAuditTrailNote(incident.approvalDecisionReason, language)}"` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Findings & Evidence where recorded */}
            {incident.inspectionFindings && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                <span className="font-bold text-blue-900 dark:text-blue-200 block mb-0.5">{te.incidentModalOnSiteFindingsHeading}</span>
                <p className="text-blue-800 dark:text-blue-300">
                  {localizeAuditTrailNote(incident.inspectionFindings, language)}
                </p>
              </div>
            )}

            {/* Final Resolution Report */}
            {incident.resolutionReport && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-0.5">{te.incidentModalFinalRectificationHeading}</span>
                <p className="text-emerald-800 dark:text-emerald-300">
                  {localizeAuditTrailNote(incident.resolutionReport, language)}
                </p>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1">
                  {te.incidentModalFiledByPrefix} {incident.resolvedBy} {te.incidentModalFiledOnPrefix} {formatErpDateTime(incident.resolvedAt)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTION DESK */}
        {activeActionTab === 'action' && (
          <div className="space-y-4">
            {/* FIELD ENGINEER ACTION DESK */}
            {effectiveRole === 'field' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
                    {tf.modalFieldDispatchControlsPrefix} {activeUser.name}
                  </h4>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    {tf.modalFieldDispatchControlsDesc}
                  </p>
                </div>

                {/* 1. Pending Assignment Acceptance */}
                {(incident.status === 'ASSIGNED' ||
                  (incident.status === 'ACKNOWLEDGED' && incident.assignedToUserId === activeUser.id)) && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {tf.modalStep1Acceptance}
                    </span>
                    {!showDeclineForm ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAcceptAssignment}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{tf.modalBtnAcceptMobilize}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeclineForm(true)}
                          className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>{tf.modalBtnDeclineAssignment}</span>
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleDeclineAssignment} className="space-y-2 pt-2 border-t border-slate-200">
                        <label className="font-semibold text-rose-800 block">
                          {tf.modalLabelDeclineReason}
                        </label>
                        <textarea
                          value={declineReason}
                          onChange={e => setDeclineReason(e.target.value)}
                          required
                          rows={2}
                          placeholder={tf.modalPlaceholderDeclineReason}
                          className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDeclineForm(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                          >
                            {tf.btnCancel}
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                          >
                            {tf.modalBtnConfirmDecline}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* 2. On-Site Inspection & Findings */}
                {(incident.status === 'IN_PROGRESS' || incident.status === 'ASSIGNED') && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {tf.modalStep2InspectionFindings}
                    </span>
                    {!incident.inspectionStartedAt ? (
                      <button
                        type="button"
                        onClick={handleStartInspection}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Wrench className="w-4 h-4" />
                        <span>{tf.modalBtnStartOnSiteInspection}</span>
                      </button>
                    ) : (
                      <div className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold mb-2">
                        {tf.modalInspectionCommencedPrefix} {formatErpDateTime(incident.inspectionStartedAt)}.
                      </div>
                    )}

                    <form onSubmit={handleSubmitFindings} className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                        {tf.modalLabelRecordTechnicalFindings}
                      </label>
                      <textarea
                        value={findingsInput}
                        onChange={e => setFindingsInput(e.target.value)}
                        required
                        rows={2}
                        placeholder={tf.modalPlaceholderTechnicalFindings}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{tf.modalBtnTransmitFindings}</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. Assistance Request */}
                {incident.status === 'IN_PROGRESS' && (
                  <form onSubmit={handleRequestAssistance} className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                      {tf.modalLabelRequestAdditionalCrew}
                    </span>
                    <textarea
                      value={assistanceInput}
                      onChange={e => setAssistanceInput(e.target.value)}
                      required
                      rows={2}
                      placeholder={tf.modalPlaceholderAssistanceNote}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{tf.modalBtnRequestSpecializedAssistance}</span>
                    </button>
                  </form>
                )}

                {/* 4. Final Resolution Report Submission */}
                {incident.status === 'IN_PROGRESS' && (
                  <form onSubmit={handleSubmitResolutionReport} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                      {tf.modalHeadingSubmitFinalResolution}
                    </span>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      {tf.modalDescSubmitFinalResolution}
                    </p>
                    <textarea
                      value={resolutionReportInput}
                      onChange={e => setResolutionReportInput(e.target.value)}
                      required
                      rows={2}
                      placeholder={tf.modalPlaceholderResolutionSummary}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{tf.modalBtnSubmitResolutionClearFault}</span>
                    </button>
                  </form>
                )}

                {incident.status === 'RESOLVED' && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <strong>{tf.modalIncidentAlreadyResolvedTitle}</strong>
                    <p className="text-[11px]">{tf.modalIncidentAlreadyResolvedDesc}</p>
                  </div>
                )}
              </div>
            )}

            {/* MANAGEMENT ACTION DESK */}
            {effectiveRole === 'management' && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-1">
                    {tf.modalMgmtConcurrenceTitle}
                  </h4>
                  <p className="text-[11px] text-purple-800 dark:text-purple-300">
                    {tf.modalMgmtConcurrenceDesc}
                  </p>
                </div>

                {/* Primary Decision Controls */}
                {incident.approvalStatus !== 'APPROVED' && incident.approvalStatus !== 'REJECTED' ? (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {tf.modalMgmtDecisionHeading}
                    </span>

                    {!showRejectForm && !showMoreInfoForm && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-slate-600 dark:text-slate-400 block mb-1">
                            {tf.modalMgmtRemarksLabel}
                          </label>
                          <input
                            type="text"
                            value={approvalRemarks}
                            onChange={e => setApprovalRemarks(e.target.value)}
                            placeholder={tf.modalMgmtRemarksPlaceholder}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={handleApproveEscalation}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{tf.modalMgmtApproveBtn}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowRejectForm(true)}
                            className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{tf.modalMgmtRejectBtn}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowMoreInfoForm(true)}
                            className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span>{tf.modalMgmtMoreInfoBtn}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reject Form */}
                    {showRejectForm && (
                      <form onSubmit={handleRejectEscalation} className="space-y-2 pt-2 border-t border-rose-200">
                        <label className="font-semibold text-rose-800 block">
                          {tf.modalMgmtMandatoryRejectLabel}
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          required
                          rows={2}
                          placeholder={tf.modalMgmtMandatoryRejectPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-rose-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowRejectForm(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                          >
                            {tf.btnCancel}
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                          >
                            {tf.modalMgmtConfirmRejectBtn}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* More Info Form */}
                    {showMoreInfoForm && (
                      <form onSubmit={handleRequestMoreInfo} className="space-y-2 pt-2 border-t border-amber-200">
                        <label className="font-semibold text-amber-800 block">
                          {tf.modalMgmtClarificationLabel}
                        </label>
                        <textarea
                          value={moreInfoQuestion}
                          onChange={e => setMoreInfoQuestion(e.target.value)}
                          required
                          rows={2}
                          placeholder={tf.modalMgmtClarificationPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowMoreInfoForm(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                          >
                            {tf.btnCancel}
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                          >
                            {tf.modalMgmtSendInfoRequestBtn}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl border text-center space-y-1 ${
                    incident.approvalStatus === 'APPROVED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 text-rose-900 dark:text-rose-200'
                  }`}>
                    <CheckCircle2 className="w-6 h-6 mx-auto" />
                    <strong>
                      {tf.modalMgmtDecisionRecordedPrefix} {localizeIncidentApprovalDecision(incident.approvalStatus, language)}
                    </strong>
                    <p className="text-[11px]">
                      {tf.modalMgmtByPrefix} {incident.approvalDecisionBy} {tf.modalMgmtOnPrefix} {formatErpDateTime(incident.approvalDecisionAt)}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* EMPLOYEE ACTION DESK */}
            {effectiveRole === 'employee' && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {te.incidentModalEmployeeDeskOptionsHeading}
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {te.incidentModalCurrentStatusLabel} <strong className="text-blue-600">{localizeIncidentStatus(incident.status, language)}</strong>.
                  {incident.approvalStatus && (
                    <span> {te.incidentModalExecutiveDecisionLabel} <strong className="text-purple-600">{localizeIncidentApprovalDecision(incident.approvalStatus, language)}</strong>.</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  {te.incidentModalEmployeeDeskHint}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUDIT HISTORY */}
        {activeActionTab === 'history' && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t.incident.dossierAuditTrailHeading}
            </div>
            {incident.history?.map((h, idx) => (
              <div
                key={h.id || idx}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      [{localizeIncidentAuditStage(h.eventType || h.stage, language)}]
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {h.actor}
                    </span>
                    {h.actorRole && (
                      <span className="text-[10px] text-slate-400">
                        (
                        {h.actorRole === 'employee'
                          ? t.erp.roleEmployee
                          : h.actorRole === 'field'
                          ? t.erp.roleField
                          : h.actorRole === 'management'
                          ? t.erp.roleManagement
                          : h.actorRole === 'admin'
                          ? t.erp.roleAdmin
                          : h.actorRole}
                        )
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {formatErpDateTime(h.timestamp)}
                  </span>
                </div>
                {h.notes && (
                  <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                    {localizeAuditTrailNote(h.notes, language)}
                  </p>
                )}
                {h.reason && h.reason !== h.notes && (
                  <p className="text-amber-800 dark:text-amber-300 italic text-[10px]">
                    {t.incident.declineReasonPrefix} &quot;{localizeAuditTrailNote(h.reason, language)}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono">
            {te.incidentModalTimezoneFooter}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {t.incident.dossierBtnClose}
          </button>
        </div>
      </div>
    </div>
  );
};
