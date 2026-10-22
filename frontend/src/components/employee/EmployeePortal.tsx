import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LiveRequestQueue } from '../common/LiveRequestQueue';
import {
  SUBDIVISION_PERFORMANCE
} from '../../data/mockData';
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
  Send
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

export const EmployeePortal: React.FC = () => {
  const {
    activeTab,
    connections,
    applications,
    complaints,
    updateApplicationStatus,
    updateComplaintStatus,
    openCaseDrawer,
    showToast,
    activeUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [subdivisionFilter, setSubdivisionFilter] = useState<string>('All');

  // Filtered applications
  const filteredApps = applications.filter(app => {
    const matchesSearch =
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesSubdiv = subdivisionFilter === 'All' || app.subdivision === subdivisionFilter;
    return matchesSearch && matchesStatus && matchesSubdiv;
  });

  // Filtered complaints
  const filteredCmps = complaints.filter(cmp => {
    return (
      cmp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmp.consumerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmp.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const pendingCount = applications.filter(a => a.status === 'Submitted' || a.status === 'Document Verification').length;
  const inspectionCount = applications.filter(a => a.status === 'Site Inspection').length;
  const sanctionCount = applications.filter(a => a.status === 'Sanction Approval').length;

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
                Sub-Divisional Operations &amp; Sanction Desk
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Gandhinagar &amp; Mehsana Circle
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>UGVCL Corporate · Officer:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{activeUser.name}</span>
              <span>({activeUser.designation})</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            onClick={() => showToast('Refreshed real-time ERP event stream', 'info')}
            className="w-full sm:w-auto min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Refresh Worklist
          </button>
        </div>
      </div>

      {/* VIEW 1: ERP DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-6">
          {/* KPI Bento Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Pending Scrutiny
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {pendingCount} Files
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Awaiting document sign-off</span>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Under Field Feasibility
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {inspectionCount} Sites
              </div>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Assigned to JE Solanki</span>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Sanction Approvals
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {sanctionCount} Ready
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Estimate clearance pending</span>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Active Grievances
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {complaints.filter(c => c.status !== 'Resolved').length} Tickets
              </div>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">0 Breached SLAs</span>
            </div>
          </div>

          {/* TAT Analytics & Smart Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sub-Divisional TAT (Turnaround Time in Hours)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Average grievance resolution vs SLA baseline by Sub-Division
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SUBDIVISION_PERFORMANCE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Bar dataKey="avgTatHours" name="Avg TAT (Hours)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  UGVCL Smart Suggestions
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-1">
                  <div className="font-semibold text-teal-950 dark:text-teal-200 flex items-center justify-between">
                    <span>APP-2026-0844 Sanction Ready</span>
                    <span className="text-[10px] text-teal-600 font-mono">45 kW</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Site report received from JE Solanki with 0% overload risk. 1-click approve to generate demand note.
                  </p>
                  <button
                    onClick={() => updateApplicationStatus('APP-2026-0844', 'Sanction Approval', 'Approved via quick suggestion')}
                    className="text-xs text-teal-700 dark:text-teal-300 font-bold hover:underline pt-1 block"
                  >
                    Authorize Sanction Now →
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                  <div className="font-semibold text-amber-950 dark:text-amber-200 flex items-center justify-between">
                    <span>CMP-8821 Voltage Drop</span>
                    <span className="text-[10px] text-amber-600">SLA: 12h</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Consumer Meenaben Patel filed voltage drop. Feeder SCADA reports 184A load on 11kV line.
                  </p>
                  <button
                    onClick={() => openCaseDrawer('complaint', 'CMP-8821')}
                    className="text-xs text-amber-700 dark:text-amber-300 font-bold hover:underline pt-1 block"
                  >
                    Open Case Drawer →
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
          {/* Live Request Queue — wired to the VidyutFlow FastAPI backend (auto-refresh 45s) */}
          <LiveRequestQueue />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                New Connection Applications Queue
              </h2>
              <p className="text-xs text-slate-500">
                Manage document scrutiny, site inspections, and sanction approvals
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
                  placeholder="Filter name or ID..."
                  className="w-full sm:w-52 min-h-11 sm:min-h-[38px] pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Document Verification">Document Verification</option>
                <option value="Site Inspection">Site Inspection</option>
                <option value="Sanction Approval">Sanction Approval</option>
                <option value="Meter Installed">Meter Installed</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Application Ref</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Applicant & Contact</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Category & Load</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Subdivision</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Est. Sanction</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Lifecycle Stage</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredApps.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {app.id}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{app.applicantName}</div>
                        <div className="text-[11px] text-slate-400">{app.phone}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{app.category}</div>
                        <div className="text-[11px] text-slate-400">{app.requestedLoadKw} kW · {app.phase}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {app.subdivision}
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                        ₹{app.estimatedSanctionCost.toLocaleString()}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openCaseDrawer('application', app.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-colors whitespace-nowrap"
                        >
                          Inspect Case
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

      {/* VIEW 3: CONSUMER LEDGER */}
      {activeTab === 'consumers' && (
        <div className="space-y-4 min-w-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Consumer Records & Energy Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Master connection database with meter serials and security deposits
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Consumer No</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Name & Address</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Tariff Category</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Connected Feeder</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Meter Serial</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">Current Reading</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Status</th>
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
                        {conn.tariffCategory}
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
                          {conn.status}
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
              Sub-Divisional Grievance Management Matrix
            </h2>
            <p className="text-xs text-slate-500">
              SLA monitoring, technician dispatch, and resolution sign-offs
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Ticket ID</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Consumer</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Category & Description</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Priority</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">SLA Window</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Status</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">Actions</th>
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
                        <div className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{cmp.category}</div>
                        <div className="text-[11px] text-slate-400 truncate">{cmp.description}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          cmp.priority === 'Critical'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {cmp.priority}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {cmp.slaTargetHours}h ({cmp.slaDueTime})
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                          {cmp.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openCaseDrawer('complaint', cmp.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-600 hover:text-white whitespace-nowrap"
                        >
                          Action Ticket
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

      {/* VIEW 5: DEPARTMENT COORDINATION */}
      {activeTab === 'coordination' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Inter-Departmental Requisitions</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Metering &amp; Testing Squad</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Requisition for 4G AMR Smart Meter for APP-2026-0842</div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0">Dispatched</span>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Civil &amp; Pole Erection Wing</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Road crossing permission for Dediyasan GIDC plot 48</div>
                </div>
                <span className="self-start sm:self-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 shrink-0">In Review</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardHat className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Line Squad Emergency Mobilization</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Active line patrol squads on standby for gusty wind contingencies. 3 patrol vans connected with GPS telemetry.
            </p>
            <div className="p-3.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
              Sub-Division Emergency Channel 4: Ready · Hot-line permit protocols active.
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
                Sub-Division Revenue &amp; Collection Reconciliation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly billing demand vs collections for Gandhinagar Sub-Division 2
              </p>
            </div>
            <button
              onClick={() => showToast('Exported revenue statement as CSV (Demo)', 'success')}
              className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Total Energy Billed</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">161.9 MU</span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Revenue Collected</span>
              <span className="text-xl font-bold font-mono text-emerald-600">₹79.6 Crores</span>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Collection Efficiency</span>
              <span className="text-xl font-bold font-mono text-blue-600">98.4%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
