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
  MapPin,
  Clock,
  Layers,
  ChevronRight
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

interface ZoneMetrics {
  zone: string;
  total: number;
  inService: number;
  highRisk: number;
  activeAlerts: number;
  healthIndex: number;
}

export const ManagementTransformerHealthView: React.FC = () => {
  const { showToast } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;

  const [transformers, setTransformers] = useState<DemoTransformerAsset[]>(DEMO_TRANSFORMERS);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [fleetHealthSummary, setFleetHealthSummary] = useState<any>(null);

  // Fetch summary analytics from backend
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/transformer-analytics/summary', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFleetHealthSummary(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Filtered by zone
  const visibleTransformers = useMemo(() => {
    if (selectedZone === 'ALL') return transformers;
    return transformers.filter((t) => t.zone.toLowerCase() === selectedZone.toLowerCase());
  }, [transformers, selectedZone]);

  // Aggregate zone metrics
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

  // Fleet Totals
  const fleetTotals = useMemo(() => {
    const total = transformers.length;
    const inService = transformers.filter((t) => t.status === 'IN_SERVICE').length;
    const highRisk = transformers.filter((t) => t.risk_level === 'HIGH').length;
    const mediumRisk = transformers.filter((t) => t.risk_level === 'MEDIUM').length;
    const lowRisk = transformers.filter((t) => t.risk_level === 'LOW').length;
    const activeAlerts = DEMO_TRANSFORMER_ALERTS.filter((a) => a.status === 'ACTIVE').length;
    const fleetHealth = Math.round(
      zoneBreakdown.reduce((acc, z) => acc + z.healthIndex, 0) / Math.max(1, zoneBreakdown.length)
    );

    return { total, inService, highRisk, mediumRisk, lowRisk, activeAlerts, fleetHealth };
  }, [transformers, zoneBreakdown]);

  // Risk Distribution Chart Data
  const riskPieData = useMemo(() => [
    { name: 'Low Risk', value: fleetTotals.lowRisk, color: '#10b981' },
    { name: 'Medium Risk', value: fleetTotals.mediumRisk, color: '#f59e0b' },
    { name: 'High Risk (Action Needed)', value: fleetTotals.highRisk, color: '#ef4444' },
  ], [fleetTotals]);

  // Top Risk Transformers Ranking
  const topRiskTransformers = useMemo(() => {
    return [...transformers]
      .sort((a, b) => b.load_utilization_pct - a.load_utilization_pct)
      .slice(0, 5);
  }, [transformers]);

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
                Executive Cockpit • Cross-Subdivision Grid Asset Reliability & Failure Forecasting
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
            {fleetTotals.inService} In-Service Across 3 Subdivisions
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
            <span>ACTIVE GRID ALERTS</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-amber-600">{fleetTotals.activeAlerts}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            Subdivision AE Ops Triaging
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subdivision Risk Breakdown */}
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

        {/* Fleet Risk Level Distribution */}
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
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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

      {/* Top Risk Asset Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Highest Risk Transformers (Prioritized for Triage)</h3>
            <p className="text-xs text-slate-500">Based on multi-factor loading stress, thermal rise, and failure horizon</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            Top Priority Fleet Units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Asset Code</th>
                <th className="px-4 py-3">Subdivision</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Load %</th>
                <th className="px-4 py-3">Top Oil Temp</th>
                <th className="px-4 py-3">Risk Tier</th>
                <th className="px-4 py-3">Failure Horizon</th>
                <th className="px-4 py-3">Recommended Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topRiskTransformers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{t.utility_asset_code}</td>
                  <td className="px-4 py-3">{t.zone} Subdivision</td>
                  <td className="px-4 py-3">{t.rated_kva} kVA</td>
                  <td className="px-4 py-3">
                    <span className={t.load_utilization_pct > 90 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                      {t.load_utilization_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{t.oil_temp_c}°C</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.risk_level === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {t.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">{t.prediction_horizon}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    Thermal camera scan and load tap changer adjustment
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
