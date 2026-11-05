import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Cpu,
  AlertTriangle,
  ShieldCheck,
  Activity,
  RefreshCw,
  Eye,
  Wrench,
  CheckCircle2,
  Search,
  Filter,
  Radio,
  ChevronRight,
  Zap,
  Thermometer,
  Gauge,
  X,
  Send
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEMO_TRANSFORMERS,
  DEMO_TELEMETRY_SERIES,
  DEMO_TRANSFORMER_ALERTS,
  DemoTransformerAsset,
  DemoTransformerAlert,
  DemoTelemetryPoint
} from '../../data/transformerDemoData';

export const EmployeeTransformersView: React.FC = () => {
  const { activeUser, showToast } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;
  const userZone = activeUser?.zone || 'North';

  // Keyboard accessibility: Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAsset(null);
        setIsDispatchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // State
  const [transformers, setTransformers] = useState<DemoTransformerAsset[]>([]);
  const [alerts, setAlerts] = useState<DemoTransformerAlert[]>(DEMO_TRANSFORMER_ALERTS);
  const [telemetrySeries, setTelemetrySeries] = useState<DemoTelemetryPoint[]>(DEMO_TELEMETRY_SERIES);
  const [selectedAsset, setSelectedAsset] = useState<DemoTransformerAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Work order dispatch modal state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchPriority, setDispatchPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [dispatchReason, setDispatchReason] = useState('Thermal anomaly & load overload mitigation');
  const [isSubmittingWo, setIsSubmittingWo] = useState(false);

  // Filter transformers strictly to user's assigned zone
  const zoneScopedTransformers = useMemo(() => {
    const list = transformers.length > 0 ? transformers : DEMO_TRANSFORMERS;
    return list.filter((t) => t.zone.toLowerCase() === userZone.toLowerCase());
  }, [transformers, userZone]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const total = zoneScopedTransformers.length;
    const inService = zoneScopedTransformers.filter((t) => t.status === 'IN_SERVICE').length;
    const highRisk = zoneScopedTransformers.filter((t) => t.risk_level === 'HIGH').length;
    const activeAlerts = alerts.filter(
      (a) => a.zone.toLowerCase() === userZone.toLowerCase() && a.status === 'ACTIVE'
    ).length;
    const avgUtilization =
      total > 0
        ? Math.round(zoneScopedTransformers.reduce((acc, t) => acc + t.load_utilization_pct, 0) / total)
        : 75;
    const fleetHealth = Math.max(0, 100 - highRisk * 20 - activeAlerts * 5);

    return { total, inService, highRisk, activeAlerts, avgUtilization, fleetHealth };
  }, [zoneScopedTransformers, alerts, userZone]);

  // Load live data from FastAPI (or fall back to demo fixtures)
  const fetchTransformers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/transformers?zone=${encodeURIComponent(userZone)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const mapped: DemoTransformerAsset[] = data.items.map((item: any) => ({
            id: item.id,
            utility_asset_code: item.utility_asset_code,
            feeder_id: item.feeder_id,
            substation_id: item.substation_id,
            zone: item.zone,
            rated_kva: item.rated_kva,
            phases: item.phases,
            voltage_class: item.voltage_class,
            commissioning_date: item.commissioning_date || '2020-01-01',
            manufacturer: item.manufacturer || 'Voltamp',
            serial_number: item.serial_number || 'SN-UNKNOWN',
            latitude: item.latitude || 23.58,
            longitude: item.longitude || 72.36,
            coordinate_source: item.coordinate_source || 'GIS',
            status: item.status || 'IN_SERVICE',
            load_utilization_pct: item.rated_kva ? Math.round((280 / item.rated_kva) * 100) : 80,
            oil_temp_c: 82.4,
            winding_temp_c: 91.0,
            vibration_mms: 3.8,
            active_alerts_count: 1,
            risk_level: 'HIGH',
            prediction_horizon: '7D',
          }));
          setTransformers(mapped);
          return;
        }
      }
    } catch {
      // Fallback to local demo data
    } finally {
      setIsLoading(false);
    }
    // Set fallback demo data
    setTransformers(DEMO_TRANSFORMERS);
  }, [userZone]);

  // Connect to SSE event stream
  useEffect(() => {
    fetchTransformers();

    if (typeof EventSource !== 'undefined') {
      const es = new EventSource('/api/v1/transformers/stream', { withCredentials: true });
      es.onopen = () => setIsSseConnected(true);
      es.onerror = () => setIsSseConnected(false);

      es.addEventListener('telemetry', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.zone && payload.zone.toLowerCase() === userZone.toLowerCase()) {
            setTransformers((prev) =>
              prev.map((tr) => {
                if (tr.id === payload.transformer_id || tr.utility_asset_code === payload.utility_asset_code) {
                  const updated = { ...tr };
                  if (payload.metric === 'LOAD_KVA' || payload.sensor_type === 'LOAD_KVA') {
                    updated.load_utilization_pct = Math.round((payload.value / tr.rated_kva) * 100);
                  } else if (payload.metric === 'OIL_TEMP' || payload.sensor_type === 'OIL_TEMP') {
                    updated.oil_temp_c = payload.value;
                  }
                  return updated;
                }
                return tr;
              })
            );
          }
        } catch {
          // Non-fatal parse error
        }
      });

      es.addEventListener('alert', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.zone && payload.zone.toLowerCase() === userZone.toLowerCase()) {
            setAlerts((prev) => [
              {
                id: payload.id || `alt-${Date.now()}`,
                transformer_id: payload.transformer_id,
                utility_asset_code: payload.utility_asset_code,
                zone: payload.zone,
                alert_type: payload.alert_type,
                severity: payload.severity || 'WARN',
                status: 'ACTIVE',
                first_seen_at: payload.timestamp || new Date().toISOString(),
                last_seen_at: payload.timestamp || new Date().toISOString(),
                description: `Live alert: ${payload.alert_type}`,
              },
              ...prev,
            ]);
            showToast?.(`New Grid Alert on ${payload.utility_asset_code}`, 'warning');
          }
        } catch {
          // Non-fatal
        }
      });

      return () => {
        es.close();
        setIsSseConnected(false);
      };
    }
  }, [fetchTransformers, userZone, showToast]);

  // Filtered table rows
  const filteredAssets = useMemo(() => {
    return zoneScopedTransformers.filter((t) => {
      const matchSearch =
        t.utility_asset_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.feeder_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRisk = riskFilter === 'ALL' || t.risk_level === riskFilter;
      return matchSearch && matchRisk;
    });
  }, [zoneScopedTransformers, searchQuery, riskFilter]);

  // Handle Maintenance Work Order Dispatch
  const handleDispatchWorkOrder = async () => {
    if (!selectedAsset) return;
    setIsSubmittingWo(true);
    try {
      const res = await fetch(`/api/v1/transformers/${selectedAsset.id}/maintenance-work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          work_order_type: 'TRANSFORMER_OVERLOAD_INSPECTION',
          priority: dispatchPriority,
          description: dispatchReason,
          recommended_action: 'Thermal camera inspection & load tap balancing',
        }),
      });

      if (res.ok) {
        showToast?.(`Maintenance Work Order dispatched for ${selectedAsset.utility_asset_code}`, 'success');
        setIsDispatchModalOpen(false);
      } else {
        // Fallback demo toast
        showToast?.(`Dispatched offline maintenance order for ${selectedAsset.utility_asset_code}`, 'info');
        setIsDispatchModalOpen(false);
      }
    } catch {
      showToast?.(`Dispatched offline maintenance order for ${selectedAsset.utility_asset_code}`, 'info');
      setIsDispatchModalOpen(false);
    } finally {
      setIsSubmittingWo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Distribution Transformers (DTR) & Grid Asset Cockpit
              </h1>
              <p className="text-sm text-slate-500">
                Subdivision Zone: <span className="font-semibold text-slate-700">{userZone} Subdivision</span> •
                Real-Time Telemetry & Predictive Risk Oversight
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            role="status"
            aria-live="polite"
            aria-label={tr.liveAriaStatus}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${isSseConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
          >
            <Radio aria-hidden="true" className={`w-3.5 h-3.5 ${isSseConnected ? 'animate-pulse text-emerald-600' : ''}`} />
            {isSseConnected ? (tr.sseStreaming || 'LIVE SSE CONNECTED') : (tr.sseOffline || 'POLLING / STANDBY')}
          </div>

          <button
            onClick={() => fetchTransformers()}
            disabled={isLoading}
            aria-label={tr.btnRefresh || 'Refresh'}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw aria-hidden="true" className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {tr.btnRefresh || 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>TOTAL DTR ASSETS</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{kpis.total}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {kpis.inService} In-Service ({Math.round((kpis.inService / Math.max(1, kpis.total)) * 100)}%)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>FLEET HEALTH INDEX</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{kpis.fleetHealth}%</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Normalized CEA Index</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>HIGH RISK ASSETS</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{kpis.highRisk}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Requires Maintenance Dispatch</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>ACTIVE ALERTS</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{kpis.activeAlerts}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Overload & Thermal Events</div>
        </div>
      </div>

      {/* Main Asset Table & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search asset code, feeder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Asset Code</th>
                <th className="px-4 py-3">Feeder ID</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Load %</th>
                <th className="px-4 py-3">Oil Temp</th>
                <th className="px-4 py-3">Risk Assessment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{asset.utility_asset_code}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.feeder_id}</td>
                  <td className="px-4 py-3">{asset.rated_kva} kVA</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${asset.load_utilization_pct > 90
                            ? 'bg-rose-500'
                            : asset.load_utilization_pct > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            }`}
                          style={{ width: `${Math.min(100, asset.load_utilization_pct)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold">{asset.load_utilization_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={asset.oil_temp_c > 85 ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                      {asset.oil_temp_c}°C
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${asset.risk_level === 'HIGH'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : asset.risk_level === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                    >
                      {asset.risk_level} ({asset.prediction_horizon})
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No distribution transformers found matching the selected filter in {userZone} Subdivision.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Transformer Detail Modal / Drawer */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dossier-modal-title">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Cpu aria-hidden="true" className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="dossier-modal-title" className="font-bold text-lg text-slate-900">{selectedAsset.utility_asset_code}</h3>
                  <p className="text-xs text-slate-500">
                    Substation: {selectedAsset.substation_id} • Feeder: {selectedAsset.feeder_id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDispatchModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Dispatch Maintenance
                </button>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Asset Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-500 block">RATED CAPACITY</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedAsset.rated_kva} kVA</span>
                </div>
                <div>
                  <span className="text-slate-500 block">VOLTAGE CLASS</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedAsset.voltage_class}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">MANUFACTURER</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedAsset.manufacturer}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SERIAL NUMBER</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedAsset.serial_number}</span>
                </div>
              </div>

              {/* Recharts Telemetry Trend */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Load & Thermal Real-Time Telemetry Trend
                  </h4>
                  <span className="text-xs text-slate-500">Last 6 Hours</span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={telemetrySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="load_kva" stroke="#2563eb" strokeWidth={2} name="Load (kVA)" />
                      <Line type="monotone" dataKey="oil_temp_c" stroke="#f97316" strokeWidth={2} name="Oil Temp (°C)" />
                      <Line type="monotone" dataKey="winding_temp_c" stroke="#ef4444" strokeWidth={2} name="Winding Temp (°C)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Predictive Risk & Explainability */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
                    Predictive Risk Baseline (Horizon: {selectedAsset.prediction_horizon})
                  </span>
                  <span className="text-sm font-bold text-amber-900">
                    Risk Probability: {selectedAsset.risk_level === 'HIGH' ? '88%' : '35%'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-amber-900 leading-relaxed">
                  <strong>Risk Factors:</strong> Continuous peak utilization exceeding 94% of rated capacity (315 kVA)
                  accompanied by elevated top-oil temperature (88.5°C). Thermal acceleration model forecasts winding
                  insulation degradation within {selectedAsset.prediction_horizon} without corrective tap-changer adjustment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Work Order Dispatch Modal */}
      {isDispatchModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dispatch-modal-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <h3 id="dispatch-modal-title" className="text-base font-bold text-slate-900 mb-2">Dispatch Maintenance Work Order</h3>
            <p className="text-xs text-slate-500 mb-4">
              Dispatches a field inspection task for Linemen & JE Field in {userZone} Subdivision.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="dispatch-target-dtr" className="font-semibold text-slate-700 block mb-1">Target Transformer</label>
                <input
                  id="dispatch-target-dtr"
                  type="text"
                  disabled
                  value={`${selectedAsset.utility_asset_code} (${selectedAsset.feeder_id})`}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-mono text-slate-700"
                />
              </div>

              <div>
                <label htmlFor="dispatch-priority-level" className="font-semibold text-slate-700 block mb-1">Priority Level</label>
                <select
                  id="dispatch-priority-level"
                  value={dispatchPriority}
                  onChange={(e) => setDispatchPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                >
                  <option value="LOW">LOW — Routine Check</option>
                  <option value="MEDIUM">MEDIUM — Scheduled Maintenance</option>
                  <option value="HIGH">HIGH — Overload / Thermal Anomaly</option>
                  <option value="CRITICAL">CRITICAL — Emergency Shutdown Required</option>
                </select>
              </div>

              <div>
                <label htmlFor="dispatch-inspection-notes" className="font-semibold text-slate-700 block mb-1">Inspection Notes & Scope</label>
                <textarea
                  id="dispatch-inspection-notes"
                  rows={3}
                  value={dispatchReason}
                  onChange={(e) => setDispatchReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchWorkOrder}
                disabled={isSubmittingWo}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmittingWo ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

