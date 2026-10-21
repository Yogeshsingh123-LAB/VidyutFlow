import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Users,
  Briefcase,
  Wrench,
  ShieldCheck,
  Bell,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { UserRole } from '../../types';

interface WorkflowStep {
  stepNumber: number;
  title: string;
  role: UserRole;
  actor: string;
  portalView: string;
  description: string;
  actionSummary: string;
  dataTouched: string;
  aiEnhancement: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepNumber: 1,
    title: 'Consumer Request Filed',
    role: 'consumer',
    actor: 'Smt. Meenaben Patel (Citizen)',
    portalView: 'Consumer Portal > New Connection / Service Request',
    description: 'Consumer submits online application APP-2026-0842 for 8kW 3-Phase load extension and rooftop solar net-metering. Uploads digital Aadhaar and ownership documents with instant validation.',
    actionSummary: 'Generates instant tracking reference, auto-populates GIS coordinates, and alerts Sub-divisional desk.',
    dataTouched: 'Application #APP-2026-0842 created with Status: Submitted',
    aiEnhancement: 'Vidyut Mitra auto-checks neighborhood transformer spare capacity before citizen submits.'
  },
  {
    stepNumber: 2,
    title: 'Employee ERP Scrutiny & Triage',
    role: 'employee',
    actor: 'Rajesh V. Trivedi (Assistant Engineer - Ops)',
    portalView: 'Office Employee ERP > Application Queue',
    description: 'Sub-divisional officer verifies land records, checks outstanding arrears on adjoining properties, and issues electronic requisition for physical site feasibility visit.',
    actionSummary: 'Approves document packet with 1-click and generates automated field task WO-4402.',
    dataTouched: 'Application updated to Status: Site Inspection Scheduled; Work Order #WO-4402 dispatched',
    aiEnhancement: 'AI flags high-voltage corridor proximity and calculates estimated estimate charges (₹7,850).'
  },
  {
    stepNumber: 3,
    title: 'Field Engineer Site Inspection',
    role: 'field',
    actor: 'Vikramaditya Solanki (Junior Engineer - Field)',
    portalView: 'Field Engineer App > Assigned Work Orders',
    description: 'Field engineer navigates to 14 Anand Nagar, conducts load audit on 11kV Visnagar Road Feeder, scans existing meter bar-code, and uploads photo evidence directly from mobile.',
    actionSummary: 'Verifies DT capacity, records phase voltages (232V/231V/234V), and digitally signs report.',
    dataTouched: 'Work Order #WO-4402 updated to Completed with technical parameters',
    aiEnhancement: 'Smart inspection checklist detects 0% tamper risk and verifies transformer headroom.'
  },
  {
    stepNumber: 4,
    title: 'Executive Sanction & Billing Sync',
    role: 'employee',
    actor: 'Sub-Divisional Officer / Executive Engineer',
    portalView: 'Office Employee ERP > Approval Center',
    description: 'With positive field inspection on record, ERP automatically generates the official Sanction Demand Note and pushes tariff parameters into the billing engine.',
    actionSummary: 'Digital sanction signed. Work order closed, meter testing squad notified.',
    dataTouched: 'Application updated to Status: Sanction Approved; Demand note issued',
    aiEnhancement: 'Automated audit trail logged with cryptographic timestamp in system audit ledger.'
  },
  {
    stepNumber: 5,
    title: 'Consumer Notification & Energization',
    role: 'consumer',
    actor: 'Citizen & Automated Notification System',
    portalView: 'Consumer Portal > My Connections & Tracking',
    description: 'Consumer receives real-time SMS and in-portal alert with instant payment link for demand note. Once settled, smart meter is energized and consumer sees new load on live dashboard.',
    actionSummary: 'Complete turnaround time under 7 days compared to 28 days in legacy manual paper workflows.',
    dataTouched: 'Connection #04281-99231 load updated to 8kW 3-Phase; Lifecycle closed',
    aiEnhancement: 'Automated welcome packet sent with recommended off-peak solar tariff schedule.'
  }
];

export const WorkflowVisualizerModal: React.FC = () => {
  const { isWorkflowVisualizerOpen, setIsWorkflowVisualizerOpen, setRole, setActiveTab } = useApp();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  if (!isWorkflowVisualizerOpen) return null;

  const currentStep = WORKFLOW_STEPS[activeStepIndex];

  const handleJumpToRolePortal = (role: UserRole) => {
    setRole(role);
    setIsWorkflowVisualizerOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in"
      onClick={() => setIsWorkflowVisualizerOpen(false)}
    >
      <div
        className="bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  VidyutOne Cross-Portal Workflow Engine
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  Automated Journey
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consumer Request → Employee Review → Field Inspection → Approval → Consumer Update
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsWorkflowVisualizerOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#0D1527] border-b border-slate-200 dark:border-slate-800/80">
          <div className="grid grid-cols-5 gap-2">
            {WORKFLOW_STEPS.map((s, idx) => {
              const isCurrent = idx === activeStepIndex;
              const isPast = idx < activeStepIndex;
              return (
                <button
                  key={s.stepNumber}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isPast
                      ? 'bg-white dark:bg-slate-800/80 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200'
                      : 'bg-white/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Stage 0{s.stepNumber}
                    </span>
                    {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-xs font-semibold truncate leading-tight">
                    {s.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Deep Dive View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                Step {currentStep.stepNumber} of 5
              </span>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                {currentStep.title}
              </h4>
            </div>

            <button
              onClick={() => handleJumpToRolePortal(currentStep.role)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 flex items-center gap-1.5 transition-opacity"
            >
              <span>Switch to this Role ({currentStep.actor.split(' ')[0]})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131D31] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-400">Primary Actor:</span>{' '}
                <strong className="text-slate-800 dark:text-slate-200">{currentStep.actor}</strong>
              </div>
              <div>
                <span className="text-slate-400">Portal View:</span>{' '}
                <span className="font-mono text-blue-600 dark:text-blue-400">{currentStep.portalView}</span>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {currentStep.description}
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  System Data Mutated
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{currentStep.dataTouched}</span>
              </div>

              <div className="p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
                <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-teal-500" />
                  AI & Automation Assist
                </span>
                <span className="text-teal-900 dark:text-teal-200">{currentStep.aiEnhancement}</span>
              </div>
            </div>
          </div>

          {/* Interactive Walkthrough Control */}
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex(prev => prev - 1)}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Stage</span>
            </button>

            <div className="text-xs text-slate-400">
              Interactive End-to-End Workflow · Step {activeStepIndex + 1} / 5
            </div>

            <button
              disabled={activeStepIndex === WORKFLOW_STEPS.length - 1}
              onClick={() => setActiveStepIndex(prev => prev + 1)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 flex items-center gap-1.5"
            >
              <span>Next Stage</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
