import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import {
  localizeTariffCategory,
  localizePhase,
  localizeSubdivision,
  localizeConsumerAddress,
  localizeApplicationStatus,
  localizeDocumentName,
  localizeApplicationNote,
  localizeComplaintCategory,
  localizeComplaintStatus,
  localizeComplaintDescription,
  localizeComplaintResolution,
  localizeConsumerTimelineStage,
  localizeConsumerTimelineActor,
  localizeConsumerTimelineRemark
} from '../../i18n/consumerContentTranslations';
import {
  localizeWorkOrderType,
  localizeWorkOrderStatus,
  localizeWorkOrderTitle,
  localizeWorkOrderScheduledDate,
  localizeWorkOrderMaterial,
  localizeAssignedActorName
} from '../../i18n/employeeContentTranslations';
import {
  X,
  FileText,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Send
} from 'lucide-react';
import { UserRole } from '../../types';
import { isActionAuthorized } from '../../services/erpAdapter';
import { ApplicationInspectFileWorkspace } from '../consumer/ApplicationInspectFileWorkspace';

export interface CaseDrawerCapabilities {
  isConsumerView: boolean;
  canViewWorkOrder: boolean;
  canMutateApplicationLifecycle: boolean;
  canMutateComplaintStatus: boolean;
  canDispatchFieldLineman: boolean;
  canMutateWorkOrderStatus: boolean;
  canAppendOfficialNote: boolean;
  canSeeInternalTechnicianAssignment: boolean;
  canSeeInternalWorkOrderLinks: boolean;
}

/**
 * Computes strict role-based UI and action capabilities for CaseDetailDrawer.
 * Consumers have strictly read-only access to their own applications and complaints.
 */
export function getCaseDrawerCapabilities(role: UserRole): CaseDrawerCapabilities {
  const isConsumer = role === 'consumer';
  if (isConsumer) {
    return {
      isConsumerView: true,
      canViewWorkOrder: false,
      canMutateApplicationLifecycle: false,
      canMutateComplaintStatus: false,
      canDispatchFieldLineman: false,
      canMutateWorkOrderStatus: false,
      canAppendOfficialNote: false,
      canSeeInternalTechnicianAssignment: false,
      canSeeInternalWorkOrderLinks: false
    };
  }

  return {
    isConsumerView: false,
    canViewWorkOrder: isActionAuthorized(role, 'GET /api/v1/workorders/:id'),
    canMutateApplicationLifecycle: isActionAuthorized(role, 'PATCH /api/v1/applications/:id/status'),
    canMutateComplaintStatus: isActionAuthorized(role, 'PATCH /api/v1/complaints/:id/status'),
    canDispatchFieldLineman: isActionAuthorized(role, 'POST /api/v1/complaints/:id/assign'),
    canMutateWorkOrderStatus: isActionAuthorized(role, 'PATCH /api/v1/workorders/:id/status'),
    canAppendOfficialNote:
      isActionAuthorized(role, 'PATCH /api/v1/applications/:id/status') ||
      isActionAuthorized(role, 'PATCH /api/v1/complaints/:id/status') ||
      isActionAuthorized(role, 'PATCH /api/v1/workorders/:id/status'),
    canSeeInternalTechnicianAssignment: true,
    canSeeInternalWorkOrderLinks: isActionAuthorized(role, 'GET /api/v1/workorders/:id')
  };
}

/**
 * Sanitizes internal timeline remarks and author labels for consumer-facing display
 * so internal work-order IDs and staff dispatch instructions are not leaked.
 */
export function sanitizeConsumerTimelineEntry(
  entry: {
    time: string;
    stage: string;
    actor: string;
    remark?: string;
    action?: string;
  },
  lang: LanguageCode = 'en'
): { time: string; stage: string; actorLabel: string; remark: string } {
  const rawText = entry.remark || entry.action || '';
  let cleanRemark = rawText
    .replace(/Work Order:\s*WO-[A-Z0-9-]+(\.)?/gi, '')
    .replace(/WO-[A-Z0-9-]+(\.)?/gi, 'field service order')
    .replace(/Dispatched .+ to replacement crew with truck [A-Z0-9-]+/gi, 'Dispatched to field technical crew for on-site resolution.')
    .replace(/Assigned to field engineer [^.]+\./gi, 'Field technical team dispatched for on-site inspection.')
    .replace(/Sent to automated triage queue\./gi, 'Assigned to sub-divisional service desk.')
    .trim();

  if (!cleanRemark) {
    cleanRemark = `Status updated to ${entry.stage}.`;
  }

  const lowerActor = entry.actor.toLowerCase();
  let actorLabel = 'UGVCL Service Desk';
  if (lowerActor.includes('consumer') || lowerActor.includes('citizen')) {
    actorLabel = 'Consumer Portal';
  } else if (lowerActor.includes('employee') || /\bae\b/.test(lowerActor) || lowerActor.includes('ops')) {
    actorLabel = 'UGVCL Sub-Divisional Office';
  } else if (lowerActor.includes('field') || /\bje\b/.test(lowerActor)) {
    actorLabel = 'UGVCL Field Engineering Team';
  }

  return {
    time: entry.time,
    stage: localizeConsumerTimelineStage(entry.stage, lang),
    actorLabel: localizeConsumerTimelineActor(actorLabel, lang),
    remark: localizeConsumerTimelineRemark(cleanRemark, lang)
  };
}

export const APPLICATION_STAGES: Array<{
  step: number;
  name: 'Submitted' | 'Document Verification' | 'Site Inspection' | 'Sanction Approval' | 'Meter Installed';
  consumerSummary: string;
}> = [
  {
    step: 1,
    name: 'Submitted',
    consumerSummary: 'Application & KYC documents received online'
  },
  {
    step: 2,
    name: 'Document Verification',
    consumerSummary: 'Identity, ownership & wiring test scrutiny'
  },
  {
    step: 3,
    name: 'Site Inspection',
    consumerSummary: 'On-site load feasibility & earthing check'
  },
  {
    step: 4,
    name: 'Sanction Approval',
    consumerSummary: 'Load sanctioned & estimate cleared'
  },
  {
    step: 5,
    name: 'Meter Installed',
    consumerSummary: 'Smart meter installed & supply energized'
  }
];

export const CaseDetailDrawer: React.FC = () => {
  const {
    activeCaseDrawer,
    openCaseDrawer,
    closeCaseDrawer,
    applications,
    complaints,
    workOrders,
    userApplications,
    userComplaints,
    updateApplicationStatus,
    requestApplicationClarification,
    updateComplaintStatus,
    updateWorkOrderStatus,
    assignComplaintToField,
    currentRole,
    demoSession,
    showToast
  } = useApp();

  const { language, t } = useLanguage();
  const tc = t.consumer;
  const te = t.employee;

  const [newNote, setNewNote] = useState('');

  if (!activeCaseDrawer) return null;

  const effectiveRole: UserRole = demoSession ? demoSession.role : currentRole;
  const capabilities = getCaseDrawerCapabilities(effectiveRole);
  const { type, id } = activeCaseDrawer;

  // Block internal work order drawer for consumer sessions
  if (type === 'workorder' && !capabilities.canViewWorkOrder) {
    return null;
  }

  // Scope record lookup to owned records for consumers
  const scopedApplications = capabilities.isConsumerView ? userApplications : applications;
  const scopedComplaints = capabilities.isConsumerView ? userComplaints : complaints;

  const appItem = type === 'application' ? scopedApplications.find(a => a.id === id) : null;
  const cmpItem = type === 'complaint' ? scopedComplaints.find(c => c.id === id) : null;
  const woItem =
    type === 'workorder' && capabilities.canViewWorkOrder ? workOrders.find(w => w.id === id) : null;

  // If record does not exist or consumer does not own it, do not render
  if ((type === 'application' && !appItem) || (type === 'complaint' && !cmpItem) || (type === 'workorder' && !woItem)) {
    return null;
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capabilities.canAppendOfficialNote || !newNote.trim()) return;

    if (type === 'application' && appItem && capabilities.canMutateApplicationLifecycle) {
      updateApplicationStatus(appItem.id, appItem.status, newNote.trim());
      setNewNote('');
    } else if (type === 'complaint' && cmpItem && capabilities.canMutateComplaintStatus) {
      updateComplaintStatus(cmpItem.id, cmpItem.status, newNote.trim());
      setNewNote('');
    } else if (type === 'workorder' && woItem && capabilities.canMutateWorkOrderStatus) {
      showToast(`${te.drawerSavedNoteToast} ${woItem.id}`, 'info');
      setNewNote('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Case Detail Drawer ${id}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') closeCaseDrawer();
      }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
      onClick={closeCaseDrawer}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#101C35] border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
              {type === 'application' && <FileText className="w-5 h-5" />}
              {type === 'complaint' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {type === 'workorder' && <Wrench className="w-5 h-5 text-teal-500" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {id}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  {type === 'application'
                    ? capabilities.isConsumerView
                      ? tc.drawerAppTrackerTitle
                      : te.drawerTypeApplication
                    : type === 'complaint'
                    ? capabilities.isConsumerView
                      ? tc.drawerGrievanceTrackerTitle
                      : te.drawerTypeComplaint
                    : te.drawerTypeWorkOrder}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                {type === 'application' &&
                  (appItem?.category
                    ? localizeTariffCategory(appItem.category, language)
                    : tc.drawerConnectionRequestFallback)}
                {type === 'complaint' &&
                  (cmpItem?.category
                    ? localizeComplaintCategory(cmpItem.category, language)
                    : tc.drawerGrievanceFallback)}
                {type === 'workorder' &&
                  (woItem?.type ? localizeWorkOrderType(woItem.type, language) : te.drawerTypeWorkOrder)}
              </p>
            </div>
          </div>

          <button
            onClick={closeCaseDrawer}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label={tc.closeDrawerAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6">
          {/* APPLICATION DETAILS — PROFESSIONAL INTERACTIVE INSPECT FILE WORKSPACE */}
          {type === 'application' && appItem && (
            <ApplicationInspectFileWorkspace
              application={appItem}
              language={language}
              isConsumerView={capabilities.isConsumerView}
              canMutateLifecycle={capabilities.canMutateApplicationLifecycle}
              onUpdateStatus={(status, note) => updateApplicationStatus(appItem.id, status as any, note || '')}
              onRequestClarification={(note) => requestApplicationClarification(appItem.id, note)}
              onOpenWorkOrder={(woId) => openCaseDrawer('workorder', woId)}
              onClose={closeCaseDrawer}
            />
          )}

          {/* COMPLAINT DETAILS */}
          {type === 'complaint' && cmpItem && (
            <>
              {/* Priority / Status & Expected Resolution SLA */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">
                    {capabilities.isConsumerView ? tc.currentStatusCategoryLabel : te.drawerCurrentStatusCategory}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {localizeComplaintCategory(cmpItem.category, language)}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {localizeComplaintStatus(cmpItem.status, language)}
                    </span>
                  </div>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 block mb-0.5">
                    {capabilities.isConsumerView ? tc.expectedResolutionSlaLabel : te.drawerExpectedResolutionSla}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {capabilities.isConsumerView
                      ? `${tc.withinHoursPrefix} ${cmpItem.slaTargetHours} ${tc.hoursSuffix} (${tc.byTimePrefix} ${cmpItem.slaDueTime})`
                      : `${te.drawerWithinHoursPrefix} ${cmpItem.slaTargetHours} ${te.drawerHoursSuffix} (${te.drawerByTimePrefix} ${cmpItem.slaDueTime})`}
                  </span>
                </div>
              </div>

              {/* Description & Registration Info */}
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  {capabilities.isConsumerView ? tc.grievanceDetailsTitle : te.drawerGrievanceDetailsHeading}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {localizeComplaintDescription(cmpItem.id, cmpItem.description, language)}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">{capabilities.isConsumerView ? tc.complaintIdLabel : te.drawerComplaintIdLabel}</span>{' '}
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{cmpItem.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{capabilities.isConsumerView ? tc.registeredOnLabel : te.drawerRegisteredOnLabel}</span>{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">{cmpItem.filedAt}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{capabilities.isConsumerView ? tc.consumerNoLabel : te.drawerConsumerNoLabel}</span>{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">{cmpItem.consumerNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{capabilities.isConsumerView ? `${tc.subDivisionLabel}:` : te.drawerSubdivisionLabel}</span>{' '}
                    <span className="text-slate-700 dark:text-slate-300">
                      {localizeSubdivision(cmpItem.subdivision, language)}
                    </span>
                  </div>
                  {capabilities.canSeeInternalTechnicianAssignment && (
                    <>
                      <div>
                        <span className="text-slate-400">{te.drawerFeederLabel}</span>{' '}
                        <span className="text-slate-700 dark:text-slate-300">{cmpItem.feederName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">{te.drawerAssignedTechLabel}</span>{' '}
                        <span className="text-blue-600 dark:text-blue-400">
                          {cmpItem.assignedTechnician
                            ? localizeAssignedActorName(cmpItem.assignedTechnician, language)
                            : te.drawerUnassigned}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Consumer-Visible Resolution Remarks */}
              {(cmpItem.status === 'Resolved' || cmpItem.resolutionRemarks) && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{capabilities.isConsumerView ? tc.resolutionSummaryTitle : te.drawerResolutionSummaryHeading}</span>
                  </div>
                  <p className="leading-relaxed">
                    {cmpItem.resolutionRemarks
                      ? localizeComplaintResolution(cmpItem.id, cmpItem.resolutionRemarks, language)
                      : capabilities.isConsumerView
                      ? tc.resolutionDefaultNote
                      : te.drawerResolutionDefaultNote}
                  </p>
                </div>
              )}

              {/* Consumer-Visible Status Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {capabilities.isConsumerView ? tc.complaintStatusTimelineTitle : te.drawerResolutionTimelineHeading}
                  </h4>
                  {capabilities.isConsumerView && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{tc.readOnlyStatusBadge}</span>
                    </span>
                  )}
                </div>
                <div className="relative border-l-2 border-blue-500/30 ml-3 pl-4 space-y-4 text-xs">
                  {cmpItem.timeline.map((t, idx) => {
                    const displayEntry = capabilities.isConsumerView
                      ? sanitizeConsumerTimelineEntry(t, language)
                      : {
                          time: t.time,
                          stage: localizeConsumerTimelineStage(t.stage, language),
                          actorLabel: localizeAssignedActorName(t.actor, language),
                          remark: localizeConsumerTimelineRemark(t.remark, language)
                        };
                    return (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-[#101C35]" />
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {displayEntry.stage} ({displayEntry.actorLabel})
                          </span>
                          <span>{displayEntry.time}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">{displayEntry.remark}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linked Work Order Badge for Grievance (Staff Only) */}
              {capabilities.canSeeInternalWorkOrderLinks && cmpItem.assignedWorkOrderId && (
                <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>
                      {te.drawerLinkedDispatchOrderLabel}{' '}
                      <strong className="font-mono">{cmpItem.assignedWorkOrderId}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => openCaseDrawer('workorder', cmpItem.assignedWorkOrderId!)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                  >
                    {te.drawerOpenFieldOrderBtn}
                  </button>
                </div>
              )}

              {/* Status Action Buttons (Authorized Utility Staff Only — Never Exposed to Consumers) */}
              {(capabilities.canMutateComplaintStatus || capabilities.canDispatchFieldLineman) && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                    {te.drawerUpdateRedressalHeading}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.canDispatchFieldLineman && (
                      <button
                        onClick={() =>
                          assignComplaintToField(
                            cmpItem.id,
                            'Vikramaditya Solanki (JE Field)',
                            cmpItem.priority === 'Critical' ? 'Emergency' : 'High',
                            'Dispatched from operations desk.'
                          )
                        }
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        {te.drawerDispatchLinemanBtn}
                      </button>
                    )}
                    {capabilities.canMutateComplaintStatus && (
                      <>
                        <button
                          onClick={() => updateComplaintStatus(cmpItem.id, 'In Progress', 'Field work underway on site.')}
                          className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          {te.drawerMarkInProgressBtn}
                        </button>
                        <button
                          onClick={() => updateComplaintStatus(cmpItem.id, 'Resolved', 'Neutral connection restored. Voltage verified at 230V.')}
                          className="px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          {te.drawerMarkResolvedBtn}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* WORK ORDER DETAILS (Staff Only) */}
          {type === 'workorder' && woItem && capabilities.canViewWorkOrder && (
            <>
              {/* Bidirectional Linkage Badges */}
              {woItem.applicationId && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>
                      {te.drawerLinkedConnAppLabel}{' '}
                      <strong className="font-mono">{woItem.applicationId}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => openCaseDrawer('application', woItem.applicationId!)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    {te.drawerViewApplicationBtn}
                  </button>
                </div>
              )}

              {woItem.complaintId && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>
                      {te.drawerLinkedGrievanceLabel}{' '}
                      <strong className="font-mono">{woItem.complaintId}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => openCaseDrawer('complaint', woItem.complaintId!)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  >
                    {te.drawerViewGrievanceBtn}
                  </button>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">{te.drawerTaskStatusLabel}</span>
                  <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                    {localizeWorkOrderStatus(woItem.status, language)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block mb-0.5">{te.drawerScheduledLabel}</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {localizeWorkOrderScheduledDate(woItem.scheduledDate, language)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">{te.drawerWorkDetailsHeading}</span>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{localizeWorkOrderTitle(woItem.title, language)}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{localizeConsumerAddress(woItem.location, language)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {te.drawerSubdivisionLabel} {localizeSubdivision(woItem.subdivision, language)} · {te.drawerFeederLabel} {woItem.feederName}
                </div>
                <div className="text-xs text-slate-500">
                  {te.drawerAssignedToLabel} {localizeAssignedActorName(woItem.assignedTo, language)}
                </div>
              </div>

              {/* Materials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {te.drawerMaterialsRequiredHeading}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {woItem.materialsNeeded.map(m => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      • {localizeWorkOrderMaterial(m, language)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status Actions */}
              {capabilities.canMutateWorkOrderStatus && (
                <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-2">
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                    {te.drawerFieldProgressActionHeading}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateWorkOrderStatus(woItem.id, 'En Route')}
                      className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      {te.drawerStartTripBtn}
                    </button>
                    <button
                      onClick={() => updateWorkOrderStatus(woItem.id, 'On Site')}
                      className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      {te.drawerArrivedOnSiteBtn}
                    </button>
                    <button
                      onClick={() =>
                        updateWorkOrderStatus(woItem.id, 'Completed', {
                          meterSerialScanned: 'GEN-SM-2026-9921',
                          readingKwh: 14820,
                          sealIntact: true,
                          terminalCondition: 'Normal',
                          tamperDetected: false,
                          testedPhaseVoltage: { r: 232, y: 231, b: 234 },
                          technicianRemarks: 'Inspected neutral crimp and restored phase balance.',
                          photoUploaded: true
                        })
                      }
                      className="px-2.5 py-1.5 rounded text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {te.drawerSubmitInspectionCompleteBtn}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick Note Input (Authorized Staff Only — Never Exposed to Consumers) */}
          {capabilities.canAppendOfficialNote && (
            <form onSubmit={handleAddNote} className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                {te.drawerAppendOfficialNoteLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder={te.drawerNoteInputPlaceholder}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{te.drawerSaveNoteBtn}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
