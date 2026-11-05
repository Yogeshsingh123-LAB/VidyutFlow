import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Cpu,
  Plus,
  Shield,
  AlertOctagon,
  FileText,
  RefreshCw,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Send,
  Database,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEMO_TRANSFORMERS,
  DemoTransformerAsset
} from '../../data/transformerDemoData';

interface PolicyItem {
  id: string;
  transformer_class: string;
  version: string;
  thresholds: Record<string, number>;
  source_evidence: string;
  effective_from: string;
  approved_by?: string;
}

interface DeadLetterItem {
  id: string;
  ingestion_id: string;
  error_reason: string;
  received_at: string;
  raw_payload?: string;
}

export const AdminTransformerRegistryView: React.FC = () => {
  const { showToast } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;

  const [activeSubTab, setActiveSubTab] = useState<'ASSETS' | 'POLICIES' | 'DLQ'>('ASSETS');

  // Keyboard accessibility: Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewAssetModalOpen(false);
        setIsNewPolicyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [transformers, setTransformers] = useState<DemoTransformerAsset[]>(DEMO_TRANSFORMERS);
  const [policies, setPolicies] = useState<PolicyItem[]>([
    {
      id: 'pol-01',
      transformer_class: 'DISTRIBUTION_11KV_DEMO',
      version: 'v2026.11-default',
      thresholds: {
        overload_warn_pct: 85.0,
        overload_crit_pct: 100.0,
        oil_temp_warn_c: 80.0,
        oil_temp_crit_c: 90.0,
        winding_temp_warn_c: 90.0,
        winding_temp_crit_c: 105.0,
      },
      source_evidence: 'CEA_GRID_STANDARDS_2026',
      effective_from: '2026-11-01T00:00:00Z',
    },
    {
      id: 'pol-02',
      transformer_class: 'POWER_66KV_DEMO',
      version: 'v2026.11-default',
      thresholds: {
        overload_warn_pct: 90.0,
        overload_crit_pct: 110.0,
        oil_temp_warn_c: 75.0,
        oil_temp_crit_c: 85.0,
        winding_temp_warn_c: 85.0,
        winding_temp_crit_c: 98.0,
      },
      source_evidence: 'CEA_GRID_STANDARDS_2026',
      effective_from: '2026-11-01T00:00:00Z',
    },
  ]);
  const [deadLetters, setDeadLetters] = useState<DeadLetterItem[]>([
    {
      id: 'dlq-01',
      ingestion_id: 'bad-ingest-8412',
      error_reason: 'Unregistered sensor instrument ID (SENSOR-UNKNOWN-99)',
      received_at: '2026-11-04T16:22:10Z',
      raw_payload: '{"value": 450.0, "unit": "kVA"}',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Asset creation modal state
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newFeederId, setNewFeederId] = useState('11KV-NORTH-IND-01');
  const [newSubstationId, setNewSubstationId] = useState('SS-MEHSANA-66KV-01');
  const [newZone, setNewZone] = useState<'North' | 'South' | 'Central'>('North');
  const [newRatedKva, setNewRatedKva] = useState<number>(315);
  const [newVoltageClass, setNewVoltageClass] = useState('11kV/415V');
  const [newManufacturer, setNewManufacturer] = useState('Voltamp Transformers Ltd');

  // Policy creation modal state
  const [isNewPolicyModalOpen, setIsNewPolicyModalOpen] = useState(false);
  const [newPolicyClass, setNewPolicyClass] = useState('SOLAR_INVERTER_STEPUP');
  const [newPolicyVersion, setNewPolicyVersion] = useState('v2026.11-custom');
  const [newPolicyOverloadWarn, setNewPolicyOverloadWarn] = useState(90);
  const [newPolicyOverloadCrit, setNewPolicyOverloadCrit] = useState(105);
  const [newPolicyOilWarn, setNewPolicyOilWarn] = useState(80);
  const [newPolicyOilCrit, setNewPolicyOilCrit] = useState(90);

  // Fetch live backend registry data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Transformers
      const trRes = await fetch('/api/v1/transformers', { credentials: 'include' });
      if (trRes.ok) {
        const trData = await trRes.json();
        if (trData.items && trData.items.length > 0) {
          setTransformers(
            trData.items.map((t: any) => ({
              id: t.id,
              utility_asset_code: t.utility_asset_code,
              feeder_id: t.feeder_id,
              substation_id: t.substation_id,
              zone: t.zone,
              rated_kva: t.rated_kva,
              phases: t.phases,
              voltage_class: t.voltage_class,
              commissioning_date: t.commissioning_date || '2021-01-01',
              manufacturer: t.manufacturer || 'Voltamp',
              serial_number: t.serial_number || 'SN-UNKNOWN',
              latitude: t.latitude || 23.58,
              longitude: t.longitude || 72.36,
              coordinate_source: t.coordinate_source || 'GIS',
              status: t.status || 'IN_SERVICE',
              load_utilization_pct: 78,
              oil_temp_c: 76.5,
              winding_temp_c: 84.0,
              vibration_mms: 2.8,
              active_alerts_count: 0,
              risk_level: 'LOW',
              prediction_horizon: '30D',
            }))
          );
        }
      }

      // 2. Fetch Policies
      const polRes = await fetch('/api/v1/transformer-policies', { credentials: 'include' });
      if (polRes.ok) {
        const polData = await polRes.json();
        if (polData.items && polData.items.length > 0) {
          setPolicies(polData.items);
        }
      }

      // 3. Fetch DLQ
      const dlqRes = await fetch('/api/v1/transformers/telemetry/dead-letters', { credentials: 'include' });
      if (dlqRes.ok) {
        const dlqData = await dlqRes.json();
        if (dlqData.items && dlqData.items.length > 0) {
          setDeadLetters(dlqData.items);
        }
      }
    } catch {
      // Fallback to demo defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Transformer
  const handleCreateTransformer = async () => {
    if (!newAssetCode) return;
    try {
      const payload = {
        utility_asset_code: newAssetCode,
        feeder_id: newFeederId,
        substation_id: newSubstationId,
        zone: newZone,
        rated_kva: newRatedKva,
        phases: 3,
        voltage_class: newVoltageClass,
        manufacturer: newManufacturer,
        status: 'IN_SERVICE',
      };

      const res = await fetch('/api/v1/transformers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast?.(`Transformer ${newAssetCode} registered successfully`, 'success');
        fetchData();
        setIsNewAssetModalOpen(false);
        setNewAssetCode('');
        return;
      }
    } catch {
      // Offline fallback
    }

    const fallbackItem: DemoTransformerAsset = {
      id: `tr-${Date.now()}`,
      utility_asset_code: newAssetCode,
      feeder_id: newFeederId,
      substation_id: newSubstationId,
      zone: newZone,
      rated_kva: newRatedKva,
      phases: 3,
      voltage_class: newVoltageClass,
      commissioning_date: new Date().toISOString().split('T')[0],
      manufacturer: newManufacturer,
      serial_number: `SN-${Date.now()}`,
      latitude: 23.58,
      longitude: 72.36,
      coordinate_source: 'FIELD_GPS',
      status: 'IN_SERVICE',
      load_utilization_pct: 65,
      oil_temp_c: 68.0,
      winding_temp_c: 75.0,
      vibration_mms: 2.1,
      active_alerts_count: 0,
      risk_level: 'LOW',
      prediction_horizon: '30D',
    };
    setTransformers((prev) => [fallbackItem, ...prev]);
    showToast?.(`Asset ${newAssetCode} added to local demo registry`, 'success');
    setIsNewAssetModalOpen(false);
    setNewAssetCode('');
  };

  // Handle Create Policy
  const handleCreatePolicy = async () => {
    try {
      const payload = {
        transformer_class: newPolicyClass,
        version: newPolicyVersion,
        thresholds: {
          overload_warn_pct: newPolicyOverloadWarn,
          overload_crit_pct: newPolicyOverloadCrit,
          oil_temp_warn_c: newPolicyOilWarn,
          oil_temp_crit_c: newPolicyOilCrit,
        },
        source_evidence: 'CEA_RENEWABLE_GRID_CODE_2026',
      };

      const res = await fetch('/api/v1/transformer-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast?.(`Policy ${newPolicyClass} version created & audited`, 'success');
        fetchData();
        setIsNewPolicyModalOpen(false);
        return;
      }
    } catch {
      // Offline fallback
    }

    setPolicies((prev) => [
      {
        id: `pol-${Date.now()}`,
        transformer_class: newPolicyClass,
        version: newPolicyVersion,
        thresholds: {
          overload_warn_pct: newPolicyOverloadWarn,
          overload_crit_pct: newPolicyOverloadCrit,
          oil_temp_warn_c: newPolicyOilWarn,
          oil_temp_crit_c: newPolicyOilCrit,
        },
        source_evidence: 'CEA_RENEWABLE_GRID_CODE_2026',
        effective_from: new Date().toISOString(),
      },
      ...prev,
    ]);
    showToast?.(`Policy ${newPolicyClass} registered in demo catalog`, 'info');
    setIsNewPolicyModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Distribution Transformer Asset Registry & Grid Administration
            </h1>
            <p className="text-sm text-slate-500">
              Admin Portal • Asset Lifecycle, CEA Threshold Policies & Telemetry Dead-Letter Ingestion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {activeSubTab === 'ASSETS' && (
            <button
              onClick={() => setIsNewAssetModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Register New DTR Asset
            </button>
          )}

          {activeSubTab === 'POLICIES' && (
            <button
              onClick={() => setIsNewPolicyModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Policy Version
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200" role="tablist" aria-label="Transformer Management Subtabs">
        <button
          role="tab"
          id="tab-assets"
          aria-selected={activeSubTab === 'ASSETS'}
          aria-controls="panel-assets"
          onClick={() => setActiveSubTab('ASSETS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'ASSETS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database aria-hidden="true" className="w-4 h-4" />
          Asset Inventory ({transformers.length})
        </button>

        <button
          role="tab"
          id="tab-policies"
          aria-selected={activeSubTab === 'POLICIES'}
          aria-controls="panel-policies"
          onClick={() => setActiveSubTab('POLICIES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'POLICIES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders aria-hidden="true" className="w-4 h-4" />
          Alert Policies ({policies.length})
        </button>

        <button
          role="tab"
          id="tab-dlq"
          aria-selected={activeSubTab === 'DLQ'}
          aria-controls="panel-dlq"
          onClick={() => setActiveSubTab('DLQ')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'DLQ'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon aria-hidden="true" className="w-4 h-4" />
          Telemetry Dead-Letter Queue ({deadLetters.length})
        </button>
      </div>

      {/* TAB 1: ASSET INVENTORY */}
      {activeSubTab === 'ASSETS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Asset Code</th>
                  <th className="px-4 py-3">Subdivision</th>
                  <th className="px-4 py-3">Feeder ID</th>
                  <th className="px-4 py-3">Substation</th>
                  <th className="px-4 py-3">Rated kVA</th>
                  <th className="px-4 py-3">Voltage Class</th>
                  <th className="px-4 py-3">Manufacturer</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transformers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{tr.utility_asset_code}</td>
                    <td className="px-4 py-3">{tr.zone} Subdivision</td>
                    <td className="px-4 py-3 text-slate-600">{tr.feeder_id}</td>
                    <td className="px-4 py-3 text-slate-600">{tr.substation_id}</td>
                    <td className="px-4 py-3">{tr.rated_kva} kVA</td>
                    <td className="px-4 py-3">{tr.voltage_class}</td>
                    <td className="px-4 py-3">{tr.manufacturer}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {tr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALERT POLICIES */}
      {activeSubTab === 'POLICIES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((pol) => (
            <div key={pol.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{pol.transformer_class}</h3>
                  <span className="text-xs text-blue-600 font-mono">{pol.version}</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                  {pol.source_evidence}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Overload Warning</span>
                  <span className="font-bold text-slate-800">
                    {pol.thresholds?.overload_warn_pct ?? pol.thresholds?.overload_pct_warning ?? 85}%
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Overload Critical</span>
                  <span className="font-bold text-rose-600">
                    {pol.thresholds?.overload_crit_pct ?? pol.thresholds?.overload_pct_critical ?? 100}%
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Oil Temp Warning</span>
                  <span className="font-bold text-slate-800">
                    {pol.thresholds?.oil_temp_warn_c ?? pol.thresholds?.oil_temp_c_warning ?? 80}°C
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Oil Temp Critical</span>
                  <span className="font-bold text-rose-600">
                    {pol.thresholds?.oil_temp_crit_c ?? pol.thresholds?.oil_temp_c_critical ?? 90}°C
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: TELEMETRY DEAD-LETTER QUEUE */}
      {activeSubTab === 'DLQ' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Unprocessed / Rejected Telemetry Readings
            </h3>
            <span className="text-xs text-slate-500">Auto-Audited DLQ Buffer</span>
          </div>

          <div className="divide-y divide-slate-100">
            {deadLetters.map((dl) => (
              <div key={dl.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="font-mono text-xs font-bold text-slate-900">{dl.ingestion_id}</span>
                    <span className="text-xs text-slate-500 font-mono">{dl.received_at}</span>
                  </div>
                  <p className="text-xs text-rose-700 font-medium">{dl.error_reason}</p>
                  {dl.raw_payload && (
                    <pre className="text-[11px] bg-slate-100 p-2 rounded-md font-mono text-slate-800">
                      {dl.raw_payload}
                    </pre>
                  )}
                </div>
              </div>
            ))}
            {deadLetters.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                Zero dead letters. Telemetry ingestion pipeline is healthy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Register New Transformer */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-register-asset-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="modal-register-asset-title" className="font-bold text-sm text-slate-900">Register New Distribution Transformer</h3>
              <button onClick={() => setIsNewAssetModalOpen(false)} aria-label="Close dialog" className="p-1 text-slate-400 hover:text-slate-600">
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="admin-asset-code" className="font-semibold text-slate-700 block mb-1">Utility Asset Code *</label>
                <input
                  id="admin-asset-code"
                  type="text"
                  placeholder="e.g. DEMO-TR-NORTH-04"
                  value={newAssetCode}
                  onChange={(e) => setNewAssetCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subdivision Zone</label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="North">North Subdivision</option>
                    <option value="South">South Subdivision</option>
                    <option value="Central">Central Subdivision</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rated Capacity (kVA)</label>
                  <select
                    value={newRatedKva}
                    onChange={(e) => setNewRatedKva(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value={100}>100 kVA</option>
                    <option value={250}>250 kVA</option>
                    <option value={315}>315 kVA</option>
                    <option value={500}>500 kVA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Parent Feeder ID</label>
                <input
                  type="text"
                  value={newFeederId}
                  onChange={(e) => setNewFeederId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={newManufacturer}
                  onChange={(e) => setNewManufacturer(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewAssetModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTransformer}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Register Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Policy Version */}
      {isNewPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-policy-title">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="modal-policy-title" className="font-bold text-sm text-slate-900">Define CEA Threshold Policy Version</h3>
              <button onClick={() => setIsNewPolicyModalOpen(false)} aria-label="Close dialog" className="p-1 text-slate-400 hover:text-slate-600">
                <X aria-hidden="true" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="admin-policy-class" className="font-semibold text-slate-700 block mb-1">Transformer Class</label>
                <input
                  id="admin-policy-class"
                  type="text"
                  value={newPolicyClass}
                  onChange={(e) => setNewPolicyClass(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label htmlFor="admin-policy-version" className="font-semibold text-slate-700 block mb-1">Version String</label>
                <input
                  id="admin-policy-version"
                  type="text"
                  value={newPolicyVersion}
                  onChange={(e) => setNewPolicyVersion(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Overload Warn (%)</label>
                  <input
                    type="number"
                    value={newPolicyOverloadWarn}
                    onChange={(e) => setNewPolicyOverloadWarn(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Overload Crit (%)</label>
                  <input
                    type="number"
                    value={newPolicyOverloadCrit}
                    onChange={(e) => setNewPolicyOverloadCrit(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Oil Temp Warn (°C)</label>
                  <input
                    type="number"
                    value={newPolicyOilWarn}
                    onChange={(e) => setNewPolicyOilWarn(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Oil Temp Crit (°C)</label>
                  <input
                    type="number"
                    value={newPolicyOilCrit}
                    onChange={(e) => setNewPolicyOilCrit(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewPolicyModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePolicy}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Publish Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
