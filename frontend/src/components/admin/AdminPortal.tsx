import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  SYSTEM_SERVICES
} from '../../data/mockData';
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
  const { activeTab, auditLogs, resetDemoData, showToast, activeUser } = useApp();
  const [users, setUsers] = useState<MockUser[]>(INITIAL_USERS);
  const [permissions, setPermissions] = useState<PermissionRow[]>(INITIAL_PERMISSIONS);
  const [isBackupRunning, setIsBackupRunning] = useState(false);

  const toggleUserStatus = (id: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, status: u.status === 'Active' ? 'Locked' : 'Active' } : u))
    );
    showToast(`User ${id} access state toggled (Demo)`, 'info');
  };

  const togglePermission = (rowIndex: number, role: keyof Omit<PermissionRow, 'module'>) => {
    setPermissions(prev => {
      const copy = [...prev];
      copy[rowIndex] = { ...copy[rowIndex], [role]: !copy[rowIndex][role] };
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
            <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                IT Infrastructure &amp; Cyber Resilience Console
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Simulated Control Plane
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>UGVCL State Data Center · Admin:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{activeUser.name}</span>
              <span>({activeUser.designation})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            onClick={() => showToast('Simulated zero-downtime certificate renewal', 'success')}
            className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Check SSL Certificates
          </button>
        </div>
      </div>

      {/* VIEW 1: SYSTEM OVERVIEW & INTEGRATIONS */}
      {(activeTab === 'overview' || activeTab === 'integrations') && (
        <div className="space-y-4 sm:space-y-6">
          {/* Bento Health Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Core Microservices Health
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                6 / 6 Operational
              </div>
              <span className="text-xs text-slate-500">99.98% Composite Uptime</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                API Gateway Throughput
              </span>
              <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
                2,480 req/min
              </div>
              <span className="text-xs text-slate-500">Median Latency: 28 ms</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Smart Meter Ingestion (AMR)
              </span>
              <div className="text-2xl font-extrabold text-teal-600 tabular-nums">
                98.8% Sync Rate
              </div>
              <span className="text-xs text-slate-500">15-minute interval telemetry</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Security Threat Level
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                Defcon 5 (Nominal)
              </div>
              <span className="text-xs text-emerald-600 font-medium">0 active intrusion alerts</span>
            </div>
          </div>

          {/* Microservices Status Table */}
          <div className="space-y-3 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Enterprise Integration Health & Microservices (Demo Telemetry)
            </h3>

            <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Service Name</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Category</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Latency</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">90-Day Uptime</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Last Incident Note</th>
                      <th className="p-3.5 font-semibold text-center whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {SYSTEM_SERVICES.map(svc => (
                      <tr key={svc.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{svc.name}</td>
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">{svc.category}</td>
                        <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{svc.latencyMs} ms</td>
                        <td className="p-3.5 font-mono font-semibold text-emerald-600 tabular-nums whitespace-nowrap">{svc.uptime90d}%</td>
                        <td className="p-3.5 text-slate-500 text-[11px]">{svc.lastIncident}</td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                            {svc.status}
                          </span>
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

      {/* VIEW 2: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Enterprise User Management
              </h2>
              <p className="text-xs text-slate-500">
                Manage accounts, circle subdivisions, and security locks
              </p>
            </div>
            <button
              onClick={() => showToast('New enterprise user onboarding dialog (Demo)', 'info')}
              className="w-full sm:w-auto min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer"
            >
              Add Staff User
            </button>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">User ID</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Name & Email</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Role Profile</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Sub-Division</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Last Login</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Status</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">Actions</th>
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
                      <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{u.role}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{u.subdivision}</td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">{u.lastLogin}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          u.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                        >
                          {u.status === 'Active' ? 'Lock Account' : 'Unlock'}
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
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Role-Based Access Control (RBAC) Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Interactive permission toggles governing the 5 VidyutOne ecosystem personas
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Enterprise Module / Action</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Consumer</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Office Employee</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Field Engineer</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Management</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">System Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {permissions.map((p, idx) => (
                    <tr key={p.module} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{p.module}</td>
                      {(['consumer', 'employee', 'field', 'management', 'admin'] as const).map(role => (
                        <td key={role} className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => togglePermission(idx, role)}
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

      {/* VIEW 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4 min-w-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Cryptographic Audit Stream & Security Events
            </h2>
            <p className="text-xs text-slate-500">
              Immutable log of all application approvals, status changes, and authentication queries
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Audit Event ID</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Timestamp</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Actor & Role</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Action</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Target Resource</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Origin IP</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">{log.id}</td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{log.actor}</div>
                        <div className="text-[10px] text-slate-400">{log.role}</div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">{log.action}</td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">{log.resource}</td>
                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{log.ipAddress}</td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {log.status}
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

      {/* VIEW 5: INFRASTRUCTURE & BACKUP */}
      {activeTab === 'infra' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600 shrink-0" />
              <span>PostgreSQL Enterprise Cluster Backup</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automated physical snapshots running nightly at 04:30 AM with write-ahead log (WAL) archiving to Gujarat State Data Center.
            </p>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex flex-col min-[380px]:flex-row min-[380px]:justify-between gap-0.5">
                <span className="text-slate-400">Last Snapshot:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">15-Oct-2026 04:30 AM (184.2 GB)</span>
              </div>
              <div className="flex flex-col min-[380px]:flex-row min-[380px]:justify-between gap-0.5">
                <span className="text-slate-400">RPO / RTO Target:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">&lt; 5 mins / &lt; 15 mins</span>
              </div>
            </div>
            <button
              onClick={handleTriggerBackup}
              disabled={isBackupRunning}
              className="w-full min-h-11 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isBackupRunning ? 'animate-spin' : ''}`} />
              <span>{isBackupRunning ? 'Executing Backup...' : 'Trigger Manual Backup Snapshot'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Cyber Resilience &amp; Data Protection</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                <span>TLS 1.3 Strict Cipher Suites</span>
                <span className="text-emerald-600 font-bold shrink-0">Enforced</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                <span>Aadhaar Masking (UIDAI Compliant)</span>
                <span className="text-emerald-600 font-bold shrink-0">Active</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
                <span>SCADA Air-Gap VPN Firewall</span>
                <span className="text-emerald-600 font-bold shrink-0">Optimal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 6: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            System Configuration &amp; Maintenance Windows
          </h2>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Portal Idle Session Timeout
              </label>
              <input
                type="text"
                defaultValue="30 Minutes (Auto-lock)"
                className="w-full min-h-11 sm:min-h-9 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Weekly Patch Maintenance Schedule
              </label>
              <input
                type="text"
                defaultValue="Every Sunday 02:00 AM - 04:00 AM IST"
                className="w-full min-h-11 sm:min-h-9 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <button
              onClick={() => showToast('Settings saved to volatile session (Demo)', 'success')}
              className="w-full sm:w-auto min-h-11 sm:min-h-9 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
