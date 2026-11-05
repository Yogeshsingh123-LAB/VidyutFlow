import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Activity,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  Wrench,
  UserCheck,
  FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEMO_TRANSFORMERS,
  DEMO_TRANSFORMER_ALERTS,
  DemoTransformerAsset
} from '../../data/transformerDemoData';
import { deriveTransformerMaintenanceStatus, TransformerMaintenanceStatus } from '../../types';
import {
  getLatestTransformerWorkOrder,
  sortTransformersByMaintenancePriority,
  computeTransformerMaintenanceCounts
} from '../../utils/transformerMaintenanceEngine';

interface ZoneMetrics {
  zone: string;
  total: number;
  inService: number;
  highRisk: number;
  activeAlerts: number;
  healthIndex: number;
}

export const ManagementTransformerHealthView: React.FC = () => {
  const { showToast, workOrders } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;

  const [transformers] = useState<DemoTransformerAsset[]>(DEMO_TRANSFORMERS);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch('/api/v1/transformer-analytics/summary', { credentials: 'include' });
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const visibleTransformers = useMemo(() => {
    if (selectedZone === 'ALL') return transformers;
    return transformers.filter((t) => t.zone.toLowerCase() === selectedZone.toLowerCase());
  }, [transformers, selectedZone]);

  // Maintenance summary counts across visible fleet
  const maintenanceCounts = useMemo(() => {
    return computeTransformerMaintenanceCounts(visibleTransformers, workOrders);
  }, [visibleTransformers, workOrders]);

  const zoneBreakdown = useMemo<ZoneMetrics[]>(() => {
    const zones = ['North', 'South', 'Central'];
    return zones.map((z) => {
      const trs = transformers.filter((t) => t.zone.toLowerCase() === z.toLowerCase());
      const total = trs.length;
      const inService = trs.filter((t) => t.status === 'IN_SERVICE').length;
      const highRisk = trs.filter((t) => t.risk_level === 'HIGH').length;
      const activeAlerts = DEMO_TRANSFORMER_ALERTS.filter(
        (a) => a.zone.toLowerCase() === z.toLowerCase() && a.status === 'ACTIVE'
      ).length;
      const healthIndex = Math.max(0, 100 - highRisk * 25 - activeAlerts * 5);
      return { zone: z, total, inService, highRisk, activeAlerts, healthIndex };
    });
  }, [transformers]);

  const fleetTotals = useMemo(() => {
    const total = visibleTransformers.length;
    const inService = visibleTransformers.filter((t) => t.status === 'IN_SERVICE').length;
    const highRisk = visibleTransformers.filter((t) => t.risk_level === 'HIGH').length;
    const mediumRisk = visibleTransformers.filter((t) => t.risk_level === 'MEDIUM').length;
    const lowRisk = visibleTransformers.filter((t) => t.risk_level === 'LOW').length;
    const activeAlerts = DEMO_TRANSFORMER_ALERTS.filter((a) => a.status === 'ACTIVE').length;
    const fleetHealth = Math.round(
      zoneBreakdown.reduce((acc, z) => acc + z.healthIndex, 0) / Math.max(1, zoneBreakdown.length)
    );

    return { total, inService, highRisk, mediumRisk, lowRisk, activeAlerts, fleetHealth };
  }, [visibleTransformers, zoneBreakdown]);

  const riskPieData = useMemo(() => [
    { name: 'Low Risk', value: fleetTotals.lowRisk, color: '#10b981' },
    { name: 'Medium Risk', value: fleetTotals.mediumRisk, color: '#f59e0b' },
    { name: 'High Risk (Action Needed)', value: fleetTotals.highRisk, color: '#ef4444' },
  ], [fleetTotals]);

  // Prioritize transformers by Maintenance Action Priority & Risk Severity
  const prioritizedTransformers = useMemo(() => {
    return sortTransformersByMaintenancePriority(visibleTransformers, workOrders);
  }, [visibleTransformers, workOrders]);

  const renderMaintenanceBadge = (status: TransformerMaintenanceStatus) => {
    switch (status) {
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {tr.maintRejected || 'Rejected • Reassign'}
          </span>
        );
      case 'AWAITING_ACCEPTANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            {tr.maintAwaitingAcceptance || 'Awaiting Acceptance'}
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <UserCheck className="w-3 h-3 text-cyan-600" />
            {tr.maintAccepted || 'Accepted'}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench className="w-3 h-3 text-blue-600" />
            {tr.maintInProgress || 'In Progress'}
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileText className="w-3 h-3 text-indigo-600" />
            {tr.maintPendingReview || 'Inspection Submitted'}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {tr.maintCompleted || 'Completed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {tr.maintNotAssigned || 'Not Assigned'}
          </span>
        );
    }
  };

  const handleExportReport = () => {
    showToast?.('Executive DTR Fleet Summary exported (PDF/CSV ready)', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Distribution Transformer Fleet Health & Risk Analytics
              </h1>
              <p className="text-sm text-slate-500">
                Executive Cockpit • Cross-Subdivision Grid Asset Reliability & Maintenance Oversight
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter aria-hidden="true" className="w-4 h-4 text-slate-400" />
            <label htmlFor="mgmt-zone-filter" className="sr-only">Filter by Subdivision</label>
            <select
              id="mgmt-zone-filter"
              aria-label="Filter by Subdivision"
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Subdivisions</option>
              <option value="North">North Subdivision</option>
              <option value="South">South Subdivision</option>
              <option value="Central">Central Subdivision</option>
            </select>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export Executive Report
          </button>
        </div>
      </div>

      {/* Fleet Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>FLEET HEALTH INDEX</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{fleetTotals.fleetHealth}%</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            CEA Composite Reliability Target: &gt;90%
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TOTAL DTR ASSETS</span>
            <Cpu className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">{fleetTotals.total}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {fleetTotals.inService} In-Service Across Subdivisions
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>PREDICTED FAILURES (7D/30D)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-rose-600">{fleetTotals.highRisk}</div>
          <div className="mt-1 text-xs text-rose-600 font-medium">
            Overload & Thermal Acceleration Watchlist
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>ACTIVE MAINTENANCE ORDERS</span>
            <Wrench className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-indigo-600">
            {maintenanceCounts.awaitingAcceptance + maintenanceCounts.inProgress + maintenanceCounts.reassignmentRequired}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {maintenanceCounts.reassignmentRequired} Reassign • {maintenanceCounts.completed} Completed
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Subdivision Reliability & In-Service Comparison
          </h3>
          <p className="text-xs text-slate-500 mb-4">Total Assets vs High-Risk Units per Subdivision</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="zone" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#6366f1" name="Total Assets" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inService" fill="#10b981" name="In-Service" radius={[4, 4, 0, 0]} />
                <Bar dataKey="highRisk" fill="#ef4444" name="High Risk" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Fleet Predictive Risk Tiering
          </h3>
          <p className="text-xs text-slate-500 mb-4">ML Thermal & Utilization Hazard Classification</p>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${(((percent ?? 0)) * 100).toFixed(0)}%)`}
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Prioritized Fleet Asset & Maintenance Tracking Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Prioritized Transformer Fleet & Maintenance Assignment Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Automatically ordered by Maintenance Action Priority (Rejected → Awaiting Acceptance → In Progress → Completed) & Risk Severity
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            Executive Live Ledger
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Asset Code</th>
                <th className="px-4 py-3">Subdivision</th>
                <th className="px-4 py-3">Load %</th>
                <th className="px-4 py-3">Top Oil Temp</th>
                <th className="px-4 py-3">Risk Tier</th>
                <th className="px-4 py-3">{tr.colOperationalStatus || 'Operational Status'}</th>
                <th className="px-4 py-3">{tr.colMaintenanceStatus || 'Maintenance Status'}</th>
                <th className="px-4 py-3">Assigned Crew & WO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prioritizedTransformers.map((t) => {
                const latestWo = getLatestTransformerWorkOrder(t, workOrders);
                const maintStatus = deriveTransformerMaintenanceStatus(latestWo);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.utility_asset_code}</td>
                    <td className="px-4 py-3">{t.zone} Subdivision</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={t.load_utilization_pct > 90 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                        {t.load_utilization_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium font-mono">{t.oil_temp_c}°C</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          t.risk_level === 'HIGH'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : t.risk_level === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {t.risk_level} ({t.prediction_horizon})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-700">{t.status}</span>
                    </td>
                    <td className="px-4 py-3">{renderMaintenanceBadge(maintStatus)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {latestWo ? (
                        <div>
                          <span className="font-mono font-bold text-slate-900">{latestWo.id}</span> •{' '}
                          <span className="font-medium">{latestWo.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No active dispatch</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
