import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LiveWorkflowKpis } from '../common/LiveWorkflowKpis';
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

export const ManagementPortal: React.FC = () => {
  const { activeTab, setActiveTab, setIsAIAssistantOpen, showToast, activeUser } = useApp();
  const [timePeriod, setTimePeriod] = useState<'Q2-2026' | 'FY26-YTD'>('FY26-YTD');

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
                Executive Intelligence Cockpit
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Corporate Office Mehsana
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>UGVCL Corporate · Officer:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{activeUser.name}</span>
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
            <option value="Q2-2026">Q2 FY2026 (Jul - Sep)</option>
            <option value="FY26-YTD">FY2026 Year-to-Date</option>
          </select>

          <button
            onClick={() => showToast('Generated Executive Flash Report (PDF)', 'success')}
            className="flex-1 sm:flex-initial min-h-11 sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Live Workflow KPIs — wired to the VidyutFlow FastAPI backend (auto-refresh 45s) */}
          <LiveWorkflowKpis />
          {/* Executive KPI Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AT&C Loss */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                AT&C Loss Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  12.4%
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> -1.4% YoY
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Target: 11.8% (Mehsana Circle leading at 11.8%)
              </span>
            </div>

            {/* Billing Efficiency */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billing Efficiency
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  88.6%
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +0.9%
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                161.9 MUs billed of 182.7 MUs input
              </span>
            </div>

            {/* Collection Efficiency */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Collection Efficiency
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  98.4%
                </span>
                <span className="text-xs font-semibold text-blue-600">
                  ₹79.6 Cr collected
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Digital payments: 71.2% via Bharat BillPay
              </span>
            </div>

            {/* Reliability Index (SAIDI) */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                System Reliability (SAIDI)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  18.2 min
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  99.96% Uptime
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                SAIFI: 0.24 interruptions/consumer/mo
              </span>
            </div>
          </div>

          {/* AT&C Loss Trajectory & Revenue Trajectory */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    AT&C Loss Reduction Curve (%)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aggregated Technical & Commercial Losses (FY2026 Monthly Trend)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={EXECUTIVE_MONTHLY_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      name="AT&C Loss %"
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
                    Energy Billed vs Revenue Collections
                  </h3>
                  <p className="text-xs text-slate-500">
                    Billed Mega-Units (MUs) vs Net Inflow (₹ Crores)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={EXECUTIVE_MONTHLY_METRICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Bar dataKey="billedMUs" name="Billed MUs" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collectedCr" name="Revenue (₹ Cr)" fill="#0D9488" radius={[4, 4, 0, 0]} />
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
                11kV Distribution Feeder Overload & Bottleneck Radar
              </h2>
              <p className="text-xs text-slate-500">
                SCADA telemetry monitoring peak amps against rated conductor capacity
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
                    <span className="text-xs text-slate-500">{fdr.subdivision}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    fdr.status === 'Critical Overload'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : fdr.status === 'Warning'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {fdr.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Capacity Utilization</span>
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
                    <span className="text-slate-400 block text-[10px]">Peak Load</span>
                    <span className="font-mono font-semibold">{fdr.peakLoadAmps}A / {fdr.ratedCapacityAmps}A</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Transformers</span>
                    <span className="font-semibold">{fdr.transformersCount} DTs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Consumers</span>
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
          <div className="p-5 rounded-xl bg-gradient-to-r from-blue-900/20 to-teal-900/20 border border-teal-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                VidyutOne Smart Utility Insights & Anomaly Radar
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Machine-learning algorithms scan smart meter interval data, transformer heatmaps, and billing variance to predict infrastructure stress before customer outages occur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                Transformer Thermal Overload Alert
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                DT-KADI-19 at 108% Headroom
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Agricultural pump synchronization causes 40°C temperature rise between 14:00 - 18:00. Risk of winding insulation breakdown in 14 days without phase balancing.
              </p>
              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Ask Vidyut Mitra AI Co-Pilot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
                Commercial Revenue Leak Detection
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                GIDC Phase II Consumption Anomaly
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Smart meter clustering detected 3 units with uncharacteristic power factor dip (0.72) indicating potential meter bypass or heavy reactive load non-compliance.
              </p>
              <button
                onClick={() => showToast('Dispatched Vigilance Squad inspection notice (Demo)', 'info')}
                className="text-xs text-amber-600 font-semibold hover:underline"
              >
                Dispatch Vigilance Audit →
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 block">
                Solar Rooftop Net-Metering Forecast
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                +4.2 MW Solar Addition by Nov 2026
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Rapid adoption in Mehsana residential sector will offset midday peak grid load by 12.8%, lowering day-ahead spot market purchase costs.
              </p>
              <span className="text-xs text-slate-400">Policy Incentive: ₹2.25/kWh feed-in tariff</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: SLA MONITORING */}
      {activeTab === 'sla' && (
        <div className="space-y-4 min-w-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Division SLA Redressal Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Regulatory compliance against Gujarat Electricity Regulatory Commission (GERC) standards
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Sub-Division Name</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Total Complaints</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Resolution Rate (%)</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Average TAT (Hours)</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">AT&C Loss %</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">GERC Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {SUBDIVISION_PERFORMANCE.map(s => (
                    <tr key={s.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{s.name}</td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{s.complaints}</td>
                      <td className="p-3.5 font-mono font-semibold text-emerald-600 tabular-nums whitespace-nowrap">{s.resolvedPct}%</td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{s.avgTatHours}h</td>
                      <td className="p-3.5 font-mono tabular-nums whitespace-nowrap">{s.atcLossPct}%</td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          Compliant
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
                Executive Export &amp; Statutory Reporting Center
              </h2>
              <p className="text-xs text-slate-500">
                Consolidated AT&amp;C loss statements, revenue reconciliation, and GERC regulatory filings ({timePeriod})
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
              Client-Side Demo Exports
            </span>
          </div>

          {/* Exportable Report Packages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Financial &amp; Energy Audit
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    CSV / PDF
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Energy Input, Billing &amp; AT&amp;C Loss Statement
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  6-month trajectory ({EXECUTIVE_MONTHLY_METRICS[0]?.month} –{' '}
                  {EXECUTIVE_MONTHLY_METRICS[EXECUTIVE_MONTHLY_METRICS.length - 1]?.month}) covering MU input, billing efficiency, and revenue realization.
                </p>
              </div>
              <button
                onClick={() =>
                  showToast(
                    `Prepared Monthly AT&C Loss & Revenue Statement (${timePeriod}) for download (Demo)`,
                    'success'
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Monthly Statement (Demo)</span>
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Regulatory Compliance
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    GERC Standard
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sub-Division SLA &amp; Grievance Redressal Dossier
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Covers {SUBDIVISION_PERFORMANCE.length} operational subdivisions with complaint resolution rates, average TAT hours, and compliance flags.
                </p>
              </div>
              <button
                onClick={() =>
                  showToast(
                    'Prepared Sub-Division GERC SLA Compliance Dossier (Demo)',
                    'success'
                  )
                }
                className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export SLA Compliance Matrix (Demo)</span>
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Grid Infrastructure
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    SCADA Summary
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  11kV Feeder Peak Load &amp; Transformer Utilization Report
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Snapshot of {FEEDER_METRICS.length} monitored feeders including{' '}
                  {FEEDER_METRICS.filter(f => f.status !== 'Optimal').length} high-load/overload corridors and connected consumer counts.
                </p>
              </div>
              <button
                onClick={() =>
                  showToast(
                    'Prepared 11kV Feeder Load & Bottleneck Audit Report (Demo)',
                    'success'
                  )
                }
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Feeder Load Audit (Demo)</span>
              </button>
            </div>
          </div>

          {/* Monthly Performance Ledger Preview Table */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Monthly Executive Performance Ledger (Preview)
                </h3>
                <p className="text-xs text-slate-500">
                  Source dataset for executive board packs and quarterly discom filings
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Billing Month</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Energy Billed (MU)</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">Revenue Collected (₹ Cr)</th>
                      <th className="p-3.5 font-semibold whitespace-nowrap">AT&amp;C Loss %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {EXECUTIVE_MONTHLY_METRICS.map(row => (
                      <tr key={row.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">{row.month}</td>
                        <td className="p-3.5 font-mono text-blue-600 dark:text-blue-400 font-semibold tabular-nums whitespace-nowrap">
                          {row.billedMUs} MU
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
