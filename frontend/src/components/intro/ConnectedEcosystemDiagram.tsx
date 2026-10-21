import React, { useState } from 'react';
import {
  Users,
  Briefcase,
  Wrench,
  LineChart,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  Layers,
  Network,
  GitBranch
} from 'lucide-react';

export const ConnectedEcosystemDiagram: React.FC<{
  onLaunchRole?: (role: 'consumer' | 'employee' | 'field' | 'management' | 'admin') => void;
}> = ({ onLaunchRole }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'lifecycle'>('network');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('consumer');

  const nodes = [
    {
      id: 'consumer',
      role: 'consumer' as const,
      title: 'Citizen Consumer Portal',
      subtitle: '3.6M+ Consumers (Residential, Agri, Commercial, Industrial)',
      icon: Users,
      color: 'blue',
      metrics: '4-Step Sanctions · UPI QuickPay · Real-Time Grievance Tracking',
      description:
        'Citizens apply for new connections, pay electricity bills in seconds, monitor live smart meter consumption, and track grievance resolution with SLA countdowns.',
      exchanges: [
        { to: 'Employee ERP', label: 'E-filed application & document index' },
        { to: 'SCADA Cockpit', label: '15-min interval smart meter telemetry' }
      ]
    },
    {
      id: 'employee',
      role: 'employee' as const,
      title: 'Subdivision ERP Workspace',
      subtitle: 'Assistant Engineers (AE) & Clerical Operations Desk',
      icon: Briefcase,
      color: 'teal',
      metrics: 'Unified Queue · Digital Document Audit · Automated Dispatch',
      description:
        'Subdivision staff process consumer requests from a single queue, verify land title deeds, and auto-dispatch site inspection tasks directly to field linemen.',
      exchanges: [
        { to: 'Field Engineer', label: 'GPS-tagged site feasibility work order' },
        { to: 'Citizen Consumer', label: 'Demand notice & sanction approval status' }
      ]
    },
    {
      id: 'field',
      role: 'field' as const,
      title: 'Field Lineman & JE Console',
      subtitle: 'Sub-Station Junior Engineers & Distribution Linemen',
      icon: Wrench,
      color: 'amber',
      metrics: 'Mobile GPS Tasks · Digital Inspection Checklist · Offline Sync',
      description:
        'Field staff receive work orders on mobile tablets, perform digital earthing resistance tests, record scanned meter barcodes, and upload geo-tagged site reports.',
      exchanges: [
        { to: 'Employee ERP', label: 'Completed feasibility findings & meter serial' },
        { to: 'SCADA Cockpit', label: 'Feeder patrol & equipment condition log' }
      ]
    },
    {
      id: 'management',
      role: 'management' as const,
      title: 'Executive SCADA Command Cockpit',
      subtitle: 'Chief General Managers, Superintending Engineers, GUVNL',
      icon: LineChart,
      color: 'indigo',
      metrics: 'AT&C Loss Radar · 11kV Feeder Overloads · GERC SLA Audit',
      description:
        'High-level leadership monitors circle-wide energy balances, commercial losses, feeder overloading, and day-ahead wholesale procurement forecasts.',
      exchanges: [
        { to: 'All Portals', label: 'SLA benchmarks & regulatory policy directives' },
        { to: 'IT Admin', label: 'Feeder telemetry & anomaly thresholds' }
      ]
    },
    {
      id: 'admin',
      role: 'admin' as const,
      title: 'IT Infrastructure & Security Console',
      subtitle: 'State Data Center Operations & Security Architects',
      icon: ShieldCheck,
      color: 'emerald',
      metrics: 'Role-Based Access (RBAC) · Immutable Audit Trail · API Bus',
      description:
        'Provides enterprise security governance, cryptographic audit logging for every tariff alteration, API health monitoring, and system telemetry backups.',
      exchanges: [
        { to: 'All Portals', label: 'Authentication tokens & permission enforcement' },
        { to: 'Audit Registry', label: 'Tamper-proof event logs' }
      ]
    }
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[0];

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            The VidyutOne Connected Ecosystem Architecture
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Eliminating fragmented silos with an interconnected real-time utility data pipeline
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'network'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Stakeholder Network
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'lifecycle'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Enter-Once Lifecycle
          </button>
        </div>
      </div>

      {activeTab === 'network' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: 5-Node Interactive Grid Cards */}
          <div className="lg:col-span-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nodes.map(node => {
                const Icon = node.icon;
                const isSelected = selectedNodeId === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-md ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C35] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-cyan-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Portal #{node.id}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {node.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {node.subtitle}
                    </p>

                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {node.metrics.split('·')[0]}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-cyan-400 flex items-center gap-0.5">
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Deep Node Detail + Direct Launch Button */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                  <selectedNode.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedNode.title}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {selectedNode.subtitle}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedNode.description}
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Data Handshakes
                </span>
                {selectedNode.exchanges.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      → {ex.to}
                    </span>
                    <span className="text-[11px] text-slate-500 text-right truncate max-w-[150px]">
                      {ex.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onLaunchRole && onLaunchRole(selectedNode.role)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Launch {selectedNode.title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Lifecycle Pipeline Flow */
        <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              The “Enter Once, Synchronize Everywhere” Paradigm
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tracing an LT Agricultural / Domestic connection from digital submission to physical energization with zero manual data re-entry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
            {[
              {
                step: '01',
                title: 'Consumer Submits',
                desc: 'Applicant fills Aadhaar KYC, premises deed, and load (kW) in 4-step wizard. Instant demonstration application ID generated.'
              },
              {
                step: '02',
                title: 'ERP Triage',
                desc: 'Subdivision AE reviews verified documents in unified application queue. One-click dispatch creates linked field work order.'
              },
              {
                step: '03',
                title: 'Field Inspection',
                desc: 'Lineman receives GPS task on tablet, records earthing resistance & voltage test, and submits technical clearance report.'
              },
              {
                step: '04',
                title: 'Sanction Release',
                desc: 'Auto-updated application reaches Sanction Approval step. Demand notice generated; fee schedule reconciled.'
              },
              {
                step: '05',
                title: 'Meter Energized',
                desc: 'Smart meter installed; connection auto-provisions in consumer ledger. Live 15-minute AMR telemetry begins streaming.'
              }
            ].map(s => (
              <div
                key={s.step}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2 relative"
              >
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-cyan-400 block">
                  Step {s.step}
                </span>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                  {s.title}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
