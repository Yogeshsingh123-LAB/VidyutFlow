import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  FileText,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Calendar,
  Send,
  Building,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { NewConnectionApplication, ComplaintRecord, WorkOrder } from '../../types';

export const CaseDetailDrawer: React.FC = () => {
  const {
    activeCaseDrawer,
    closeCaseDrawer,
    applications,
    complaints,
    workOrders,
    updateApplicationStatus,
    updateComplaintStatus,
    updateWorkOrderStatus,
    showToast
  } = useApp();

  const [newNote, setNewNote] = useState('');

  if (!activeCaseDrawer) return null;

  const { type, id } = activeCaseDrawer;

  // Find relevant entity
  const appItem = type === 'application' ? applications.find(a => a.id === id) : null;
  const cmpItem = type === 'complaint' ? complaints.find(c => c.id === id) : null;
  const woItem = type === 'workorder' ? workOrders.find(w => w.id === id) : null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    if (type === 'application' && appItem) {
      updateApplicationStatus(appItem.id, appItem.status, newNote.trim());
      setNewNote('');
    } else if (type === 'complaint' && cmpItem) {
      updateComplaintStatus(cmpItem.id, cmpItem.status, newNote.trim());
      setNewNote('');
    } else if (type === 'workorder' && woItem) {
      showToast(`Field note attached to ${woItem.id}`, 'info');
      setNewNote('');
    }
  };

  return (
    <div
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
                  {type}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                {type === 'application' && (appItem?.category || 'Connection Request')}
                {type === 'complaint' && (cmpItem?.category || 'Grievance')}
                {type === 'workorder' && (woItem?.type || 'Field Work Order')}
              </p>
            </div>
          </div>

          <button
            onClick={closeCaseDrawer}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 sm:space-y-6">
          {/* APPLICATION DETAILS */}
          {type === 'application' && appItem && (
            <>
              {/* Status Banner */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Current Lifecycle Stage</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Step {appItem.workflowStep} of 5: {appItem.status}
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 block mb-0.5">Target Completion</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {appItem.targetCompletionDate}
                  </span>
                </div>
              </div>

              {/* Workflow Stepper */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Workflow Progression
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center text-[10px]">
                  {['Submitted', 'Document Verification', 'Site Inspection', 'Sanction Approval', 'Meter Installed'].map(
                    (stepName, idx) => {
                      const stepNum = idx + 1;
                      const isCompleted = stepNum < appItem.workflowStep;
                      const isCurrent = stepNum === appItem.workflowStep;
                      return (
                        <div
                          key={stepName}
                          className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] border border-current shrink-0">
                            {isCompleted ? '✓' : stepNum}
                          </span>
                          <span className="w-full leading-tight break-words">{stepName}</span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Applicant & Technical Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Applicant</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{appItem.applicantName}</div>
                  <div className="text-xs text-slate-500">{appItem.phone}</div>
                  <div className="text-xs text-slate-500">{appItem.email}</div>
                  <div className="text-xs text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{appItem.address}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Sanction Specs</span>
                  <div className="text-xs flex justify-between">
                    <span className="text-slate-400">Load:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{appItem.requestedLoadKw} kW ({appItem.phase})</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{appItem.category}</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-slate-400">Est. Sanction:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">₹{appItem.estimatedSanctionCost.toLocaleString()}</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-slate-400">Subdivision:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{appItem.subdivision}</span>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Verified Documents ({appItem.documentsSubmitted.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {appItem.documentsSubmitted.map(doc => (
                    <span
                      key={doc}
                      className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Lifecycle Demo */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
                  Simulate ERP Lifecycle Action
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateApplicationStatus(appItem.id, 'Document Verification', 'Scrutiny passed by subdivision.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Approve Docs
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(appItem.id, 'Site Inspection', 'Assigned site visit to JE field.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Dispatch Inspection
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(appItem.id, 'Sanction Approval', 'Technical feasibility cleared. Ready for payment.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sanction Approval
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(appItem.id, 'Meter Installed', 'Smart meter energized.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Energize & Install
                  </button>
                </div>
              </div>

              {/* Notes Stream */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Audit & Notes Trail
                </h4>
                <div className="space-y-2.5">
                  {appItem.notesHistory.map((nh, i) => (
                    <div key={i} className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{nh.author}</span>
                        <span className="text-[10px]">{nh.timestamp}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{nh.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* COMPLAINT DETAILS */}
          {type === 'complaint' && cmpItem && (
            <>
              {/* Priority & Status */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Status & Category</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {cmpItem.category}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                      {cmpItem.status}
                    </span>
                  </div>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 block mb-0.5">SLA Target</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {cmpItem.slaTargetHours} Hours ({cmpItem.slaDueTime})
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Grievance Description</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {cmpItem.description}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Consumer:</span>{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cmpItem.consumerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Consumer No:</span>{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">{cmpItem.consumerNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Feeder:</span>{' '}
                    <span className="text-slate-700 dark:text-slate-300">{cmpItem.feederName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Assigned Tech:</span>{' '}
                    <span className="text-blue-600 dark:text-blue-400">{cmpItem.assignedTechnician || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Resolution Timeline
                </h4>
                <div className="relative border-l-2 border-blue-500/30 ml-3 pl-4 space-y-4 text-xs">
                  {cmpItem.timeline.map((t, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-[#101C35]" />
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{t.stage} ({t.actor})</span>
                        <span>{t.time}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{t.remark}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                  Update Redressal Status
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateComplaintStatus(cmpItem.id, 'Dispatched', 'Technician squad dispatched to location.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Dispatch Squad
                  </button>
                  <button
                    onClick={() => updateComplaintStatus(cmpItem.id, 'In Progress', 'Field work underway on site.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => updateComplaintStatus(cmpItem.id, 'Resolved', 'Neutral connection restored. Voltage verified at 230V.')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </>
          )}

          {/* WORK ORDER DETAILS */}
          {type === 'workorder' && woItem && (
            <>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Task Status</span>
                  <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                    {woItem.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block mb-0.5">Scheduled</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {woItem.scheduledDate}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Work Details</span>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{woItem.title}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{woItem.location}</span>
                </div>
                <div className="text-xs text-slate-500">Subdivision: {woItem.subdivision} · Feeder: {woItem.feederName}</div>
                <div className="text-xs text-slate-500">Assigned To: {woItem.assignedTo}</div>
              </div>

              {/* Materials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Materials Required
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {woItem.materialsNeeded.map(m => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      • {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status Actions */}
              <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-2">
                <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                  Field Progress Action
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateWorkOrderStatus(woItem.id, 'En Route')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Start Trip (En Route)
                  </button>
                  <button
                    onClick={() => updateWorkOrderStatus(woItem.id, 'On Site')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Arrived On Site
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
                    Submit Inspection & Complete
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Quick Note Input */}
          <form onSubmit={handleAddNote} className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Append Official Note / Remark
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Type case remark or inspection update..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
