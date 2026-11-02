import React from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const TheChallengeSection: React.FC = () => {
  const challenges = [
    {
      code: 'CH-01',
      title: 'Fragmented Legacy IT Silos',
      problem:
        'Disparate legacy software platforms for consumer billing, online applications, field inventories, and grievance logging operate in isolated silos. Clerks manually copy data across screens, leading to reconciliation errors.',
      solution:
        'Single Source of Truth: A centralized reactive data store synchronizes citizen applications, sub-divisional approvals, and mobile field work orders in real-time with zero redundant entry.'
    },
    {
      code: 'CH-02',
      title: 'Lengthy Paper-Driven Sanctions (28-Day TAT)',
      problem:
        'New LT Agricultural and Residential connection files move through physical folders, requiring consumers to make multiple physical sub-division visits with no tracking visibility or estimated cost schedules.',
      solution:
        '7-Day Digital Turnaround: 4-step online KYC registration with instant unique application IDs, digital document auditing, and automatic feasibility inspection dispatch.'
    },
    {
      code: 'CH-03',
      title: 'Disconnected Field Lineman Operations',
      problem:
        'Sub-station Junior Engineers assign maintenance callouts via phone calls or printed slips. Linemen have no mobile access to consumer meter histories, GPS coordinates, or standardized testing checklists.',
      solution:
        'Connected Field Console: Linemen receive work orders with GPS location, digital earthing test inputs, and barcode scanning with offline sync capabilities for remote rural feeders.'
    },
    {
      code: 'CH-04',
      title: 'Reactive Outage Management & AT&C Losses',
      problem:
        'Distribution transformer (DTR) overloads and 11kV feeder faults are identified only after angry consumer calls flood the sub-division desk, compounding commercial losses and equipment damage.',
      solution:
        'SCADA Digital Twin & AI Forecasting: Real-time telemetry monitoring conductor amp capacity, transformer thermal alarms, and Day-Ahead peak load prediction to prevent outages before they occur.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <AlertOctagon className="w-4 h-4" />
          <span>UGVCL Grid Operations & Distribution Context</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Overcoming Operational Bottlenecks in Modern Power Distribution
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          How VidyutOne bridges the gap between legacy administrative friction and a high-velocity, citizen-centric electricity ERP.
        </p>
      </div>

      {/* 4 Contrast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {challenges.map(item => (
          <div
            key={item.code}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-400">
                  {item.code}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
                  Utility Priority
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {item.title}
              </h4>

              {/* Legacy Friction Box */}
              <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs space-y-1">
                <span className="font-semibold text-rose-800 dark:text-rose-300 block text-[11px] uppercase tracking-wide">
                  The Legacy Challenge:
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {item.problem}
                </p>
              </div>

              {/* VidyutOne Modernization Box */}
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[11px] uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>VidyutOne Architecture:</span>
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {item.solution}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Proposed Operational Impact Summary */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 via-cyan-900/10 to-teal-900/20 border border-blue-200 dark:border-blue-900/50 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Target Operational Metrics (Demonstration Model)
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Sanction Turnaround (TAT)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-cyan-400 font-mono">
              7 Days
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              ↓ Reduced from 28 days
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Paperless Workflow
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              100% Digital
            </div>
            <span className="text-[11px] text-slate-500">
              Zero physical document routing
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              AT&C Loss Reduction Target
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
              11.8%
            </div>
            <span className="text-[11px] text-slate-500">
              Down from 13.8% through AMR
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              GERC SLA Redressal
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              98.6%
            </div>
            <span className="text-[11px] text-blue-600 font-medium">
              Compliant within statutory hours
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
