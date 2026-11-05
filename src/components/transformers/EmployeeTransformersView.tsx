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
  Zap,
  Thermometer,
  Gauge,
  X,
  Send,
  Clock,
  Info,
  WifiOff,
  FileText,
  Calendar,
  User,
  MapPin,
  AlertCircle,
  Table as TableIcon,
  ArrowUpDown,
  UserCheck,
  RotateCcw,
  CheckSquare,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  DEMO_TRANSFORMERS,
  DEMO_TRANSFORMER_ALERTS,
  getTransformerTelemetrySeries,
  DemoTransformerAsset,
  DemoTransformerAlert
} from '../../data/transformerDemoData';
import {
  WorkOrder,
  TransformerMaintenanceStatus,
  deriveTransformerMaintenanceStatus
} from '../../types';
import {
  getLatestTransformerWorkOrder,
  getWorkOrdersForTransformer,
  sortTransformersByMaintenancePriority,
  computeTransformerMaintenanceCounts,
  isEngineerEligibleForTransformerZone
} from '../../utils/transformerMaintenanceEngine';

export const EmployeeTransformersView: React.FC = () => {
  const {
    activeUser,
    showToast,
    workOrders,
    dispatchTransformerWorkOrder,
    reassignTransformerWorkOrder,
    completeTransformerMaintenanceWorkOrder,
    fieldEngineers,
    activeTransformerTrackingWoId,
    setActiveTransformerTrackingWoId
  } = useApp();
  const { t } = useLanguage();
  const tr = t.transformers;
  const userZone = activeUser?.zone || 'North';

  // State
  const [transformers, setTransformers] = useState<DemoTransformerAsset[]>(DEMO_TRANSFORMERS);
  const [alerts, setAlerts] = useState<DemoTransformerAlert[]>(DEMO_TRANSFORMER_ALERTS);
  const [selectedAsset, setSelectedAsset] = useState<DemoTransformerAsset | null>(null);
  const [inspectTab, setInspectTab] = useState<'OVERVIEW' | 'TELEMETRY' | 'WORK_ORDERS' | 'ALERTS'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_SERVICE' | 'OFFLINE' | 'MAINTENANCE'>('ALL');
  const [maintenanceFilter, setMaintenanceFilter] = useState<'ALL' | TransformerMaintenanceStatus | 'ACTIVE_PROGRESS'>('ALL');
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [isLoadingWorklist, setIsLoadingWorklist] = useState(false);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const [lastTelemetryRefreshTime, setLastTelemetryRefreshTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Modals state
  const [isConnectivityModalOpen, setIsConnectivityModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchPriority, setDispatchPriority] = useState<'Routine' | 'High' | 'Emergency'>('High');
  const [assignedEngineerName, setAssignedEngineerName] = useState('Vikramaditya Solanki');
  const [dispatchReason, setDispatchReason] = useState('Thermal anomaly & load overload mitigation');
  const [dispatchAction, setDispatchAction] = useState('Thermal camera scan, load tap adjustment & oil sample');
  const [isSubmittingWo, setIsSubmittingWo] = useState(false);

  // Tracking & Reassignment Modals
  const [trackingWorkOrderId, setTrackingWorkOrderId] = useState<string | null>(null);
  const [reassignTargetWoId, setReassignTargetWoId] = useState<string | null>(null);
  const [newAssigneeName, setNewAssigneeName] = useState<string>('Hitesh N. Vaghela');
  const [reassignNotes, setReassignNotes] = useState<string>('');
  const [completionReviewNotes, setCompletionReviewNotes] = useState<string>(
    'Field inspection report and thermal parameters verified. Maintenance order closed.'
  );

  // Telemetry chart options
  const [chartTimeRange, setChartTimeRange] = useState<'6H' | '24H' | '7D'>('6H');
  const [showChartDataTable, setShowChartDataTable] = useState(false);

  // Keyboard accessibility: Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reassignTargetWoId) {
          setReassignTargetWoId(null);
          return;
        }
        if (trackingWorkOrderId) {
          setTrackingWorkOrderId(null);
          return;
        }
        setSelectedAsset(null);
        setIsDispatchModalOpen(false);
        setIsConnectivityModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reassignTargetWoId, trackingWorkOrderId]);

  // Deep-link from NotificationDrawer when clicking a transformer work order notification
  useEffect(() => {
    if (activeTransformerTrackingWoId) {
      setTrackingWorkOrderId(activeTransformerTrackingWoId);
      setActiveTransformerTrackingWoId(null);
    }
  }, [activeTransformerTrackingWoId, setActiveTransformerTrackingWoId]);

  // Filter transformers strictly to user's assigned zone
  const zoneScopedTransformers = useMemo(() => {
    const list = transformers.length > 0 ? transformers : DEMO_TRANSFORMERS;
    return list.filter((item) => item.zone.toLowerCase() === userZone.toLowerCase());
  }, [transformers, userZone]);

  // Maintenance status summary counters for the top strip
  const maintenanceCounts = useMemo(() => {
    return computeTransformerMaintenanceCounts(zoneScopedTransformers, workOrders);
  }, [zoneScopedTransformers, workOrders]);

  // Eligible engineers for this zone
  const eligibleZoneEngineers = useMemo(() => {
    const list = fieldEngineers.filter((fe) =>
      isEngineerEligibleForTransformerZone(fe.subdivision, fe.id, userZone)
    );
    return list.length > 0 ? list : fieldEngineers;
  }, [fieldEngineers, userZone]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const total = zoneScopedTransformers.length;
    const inService = zoneScopedTransformers.filter((item) => item.status === 'IN_SERVICE').length;
    const offlineCount = zoneScopedTransformers.filter((item) => item.status === 'OFFLINE').length;
    const highRisk = zoneScopedTransformers.filter((item) => item.risk_level === 'HIGH').length;
    const activeAlerts = alerts.filter(
      (a) => a.zone.toLowerCase() === userZone.toLowerCase() && a.status === 'ACTIVE'
    ).length;
    const avgUtilization =
      total > 0
        ? Math.round(zoneScopedTransformers.reduce((acc, item) => acc + item.load_utilization_pct, 0) / total)
        : 75;
    const fleetHealth = Math.max(0, 100 - highRisk * 20 - offlineCount * 15 - activeAlerts * 5);

    return { total, inService, offlineCount, highRisk, activeAlerts, avgUtilization, fleetHealth };
  }, [zoneScopedTransformers, alerts, userZone]);

  // Distinct Action 1: Refresh Worklist (re-fetches catalog from backend or fallback)
  const handleRefreshWorklist = useCallback(async () => {
    setIsLoadingWorklist(true);
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
            telemetry_status: 'LIVE',
            last_updated_at: new Date().toISOString(),
          }));
          setTransformers(mapped);
          showToast?.(`Transformer worklist refreshed: ${mapped.length} assets from gateway`, 'success');
          return;
        }
      }
    } catch {
      // Fallback to local demo fixtures
    } finally {
      setIsLoadingWorklist(false);
    }
    setTransformers(DEMO_TRANSFORMERS);
    showToast?.(`Transformer worklist refreshed (${zoneScopedTransformers.length} assets in ${userZone} Subdivision)`, 'info');
  }, [userZone, showToast, zoneScopedTransformers.length]);

  // Distinct Action 2: Refresh Telemetry Data (recalculates live readings, updates timestamp)
  const handleRefreshTelemetry = useCallback(() => {
    setIsRefreshingTelemetry(true);
    const newTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setTimeout(() => {
      setTransformers((prev) =>
        prev.map((item) => {
          const deltaLoad = item.status === 'OFFLINE' ? 0 : (Math.random() * 1.2 - 0.6);
          const deltaTemp = item.status === 'OFFLINE' ? 0 : (Math.random() * 0.6 - 0.3);
          return {
            ...item,
            load_utilization_pct: Math.round(Math.min(105, Math.max(10, item.load_utilization_pct + deltaLoad)) * 10) / 10,
            oil_temp_c: Math.round((item.oil_temp_c + deltaTemp) * 10) / 10,
            winding_temp_c: Math.round((item.winding_temp_c + deltaTemp * 1.1) * 10) / 10,
            last_updated_at: item.status === 'OFFLINE' ? item.last_updated_at : new Date().toISOString(),
          };
        })
      );
      setLastTelemetryRefreshTime(newTimestamp);
      setIsRefreshingTelemetry(false);
      showToast?.(`Live telemetry readings refreshed at ${newTimestamp}`, 'success');
    }, 450);
  }, [showToast]);

  // Initial load
  useEffect(() => {
    handleRefreshWorklist();
  }, []);

  // Connect to SSE event stream
  useEffect(() => {
    if (typeof EventSource !== 'undefined') {
      const es = new EventSource('/api/v1/transformers/stream', { withCredentials: true });
      es.onopen = () => setIsSseConnected(true);
      es.onerror = () => setIsSseConnected(false);

      es.addEventListener('telemetry', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.zone && payload.zone.toLowerCase() === userZone.toLowerCase()) {
            setTransformers((prev) =>
              prev.map((item) => {
                if (item.id === payload.transformer_id || item.utility_asset_code === payload.utility_asset_code) {
                  const updated = { ...item };
                  if (payload.metric === 'LOAD_KVA' || payload.sensor_type === 'LOAD_KVA') {
                    updated.load_utilization_pct = Math.round((payload.value / item.rated_kva) * 100);
                  } else if (payload.metric === 'OIL_TEMP' || payload.sensor_type === 'OIL_TEMP') {
                    updated.oil_temp_c = payload.value;
                  }
                  updated.telemetry_status = 'LIVE';
                  updated.last_updated_at = new Date().toISOString();
                  return updated;
                }
                return item;
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
  }, [userZone, showToast]);

  // Filtered and priority-sorted table rows
  const filteredAssets = useMemo(() => {
    const matching = zoneScopedTransformers.filter((item) => {
      const latestWo = getLatestTransformerWorkOrder(item, workOrders);
      const maintStatus = deriveTransformerMaintenanceStatus(latestWo);

      const matchSearch =
        item.utility_asset_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.feeder_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.substation_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (latestWo && latestWo.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (latestWo && latestWo.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRisk = riskFilter === 'ALL' || item.risk_level === riskFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      let matchMaint = true;
      if (maintenanceFilter === 'ACTIVE_PROGRESS') {
        matchMaint =
          maintStatus === 'ACCEPTED' ||
          maintStatus === 'IN_PROGRESS' ||
          maintStatus === 'PENDING_REVIEW';
      } else if (maintenanceFilter !== 'ALL') {
        matchMaint = maintStatus === maintenanceFilter;
      }

      return matchSearch && matchRisk && matchStatus && matchMaint;
    });

    return sortTransformersByMaintenancePriority(matching, workOrders);
  }, [zoneScopedTransformers, workOrders, searchQuery, riskFilter, statusFilter, maintenanceFilter]);

  // Selected asset telemetry time series
  const activeTelemetrySeries = useMemo(() => {
    if (!selectedAsset) return [];
    const base = getTransformerTelemetrySeries(selectedAsset);
    if (chartTimeRange === '6H') return base;
    if (chartTimeRange === '24H') {
      return [
        { timestamp: '2026-11-04T12:00:00Z', timeLabel: '12:00', load_kva: Math.round(selectedAsset.rated_kva * 0.65), rated_kva: selectedAsset.rated_kva, oil_temp_c: Math.round((selectedAsset.oil_temp_c - 12) * 10) / 10, winding_temp_c: Math.round((selectedAsset.winding_temp_c - 14) * 10) / 10, vibration_mms: 2.1 },
        { timestamp: '2026-11-04T18:00:00Z', timeLabel: '18:00', load_kva: Math.round(selectedAsset.rated_kva * 0.82), rated_kva: selectedAsset.rated_kva, oil_temp_c: Math.round((selectedAsset.oil_temp_c - 6) * 10) / 10, winding_temp_c: Math.round((selectedAsset.winding_temp_c - 7) * 10) / 10, vibration_mms: 2.8 },
        { timestamp: '2026-11-05T00:00:00Z', timeLabel: '00:00', load_kva: Math.round(selectedAsset.rated_kva * 0.45), rated_kva: selectedAsset.rated_kva, oil_temp_c: Math.round((selectedAsset.oil_temp_c - 18) * 10) / 10, winding_temp_c: Math.round((selectedAsset.winding_temp_c - 20) * 10) / 10, vibration_mms: 1.5 },
        ...base
      ];
    }
    return [
      { timestamp: '2026-10-30T00:00:00Z', timeLabel: '30-Oct', load_kva: Math.round(selectedAsset.rated_kva * 0.70), rated_kva: selectedAsset.rated_kva, oil_temp_c: 68.2, winding_temp_c: 75.4, vibration_mms: 2.2 },
      { timestamp: '2026-10-31T00:00:00Z', timeLabel: '31-Oct', load_kva: Math.round(selectedAsset.rated_kva * 0.72), rated_kva: selectedAsset.rated_kva, oil_temp_c: 70.1, winding_temp_c: 78.0, vibration_mms: 2.4 },
      { timestamp: '2026-11-01T00:00:00Z', timeLabel: '01-Nov', load_kva: Math.round(selectedAsset.rated_kva * 0.75), rated_kva: selectedAsset.rated_kva, oil_temp_c: 72.8, winding_temp_c: 81.2, vibration_mms: 2.5 },
      { timestamp: '2026-11-02T00:00:00Z', timeLabel: '02-Nov', load_kva: Math.round(selectedAsset.rated_kva * 0.84), rated_kva: selectedAsset.rated_kva, oil_temp_c: 79.5, winding_temp_c: 89.0, vibration_mms: 3.1 },
      { timestamp: '2026-11-03T00:00:00Z', timeLabel: '03-Nov', load_kva: Math.round(selectedAsset.rated_kva * 0.88), rated_kva: selectedAsset.rated_kva, oil_temp_c: 83.0, winding_temp_c: 92.5, vibration_mms: 3.8 },
      { timestamp: '2026-11-04T00:00:00Z', timeLabel: '04-Nov', load_kva: Math.round(selectedAsset.rated_kva * 0.92), rated_kva: selectedAsset.rated_kva, oil_temp_c: 86.4, winding_temp_c: 96.0, vibration_mms: 4.4 },
      { timestamp: '2026-11-05T00:00:00Z', timeLabel: '05-Nov', load_kva: Math.round(selectedAsset.rated_kva * (selectedAsset.load_utilization_pct / 100)), rated_kva: selectedAsset.rated_kva, oil_temp_c: selectedAsset.oil_temp_c, winding_temp_c: selectedAsset.winding_temp_c, vibration_mms: selectedAsset.vibration_mms },
    ];
  }, [selectedAsset, chartTimeRange]);

  // Work orders associated with the selected asset
  const assetWorkOrders = useMemo(() => {
    if (!selectedAsset) return [];
    return getWorkOrdersForTransformer(selectedAsset, workOrders);
  }, [selectedAsset, workOrders]);

  // Currently tracked work order object
  const trackingWorkOrder = useMemo(() => {
    if (!trackingWorkOrderId) return null;
    return workOrders.find((w) => w.id === trackingWorkOrderId) || null;
  }, [trackingWorkOrderId, workOrders]);

  // Currently reassigning work order object
  const reassignTargetWo = useMemo(() => {
    if (!reassignTargetWoId) return null;
    return workOrders.find((w) => w.id === reassignTargetWoId) || null;
  }, [reassignTargetWoId, workOrders]);

  // Alerts associated with the selected asset
  const assetAlerts = useMemo(() => {
    if (!selectedAsset) return [];
    return alerts.filter(
      (a) => a.transformer_id === selectedAsset.id || a.utility_asset_code === selectedAsset.utility_asset_code
    );
  }, [selectedAsset, alerts]);

  // Helper to render accessible Maintenance Status Badge
  const renderMaintenanceStatusBadge = (status: TransformerMaintenanceStatus) => {
    switch (status) {
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            {tr.maintRejected || 'Rejected • Reassign'}
          </span>
        );
      case 'AWAITING_ACCEPTANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {tr.maintAwaitingAcceptance || 'Awaiting Acceptance'}
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <UserCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            {tr.maintAccepted || 'Accepted'}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            {tr.maintInProgress || 'In Progress'}
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            {tr.maintPendingReview || 'Inspection Submitted'}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {tr.maintCompleted || 'Completed'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {tr.maintCancelled || 'Cancelled'}
          </span>
        );
      case 'NOT_ASSIGNED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/80">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            {tr.maintNotAssigned || 'Not Assigned'}
          </span>
        );
    }
  };

  // Open Dispatch Modal pre-configured for asset
  const handleOpenDispatch = (asset: DemoTransformerAsset) => {
    setSelectedAsset(asset);
    setDispatchPriority(asset.risk_level === 'HIGH' ? 'High' : 'Routine');
    setDispatchReason(
      asset.risk_level === 'HIGH'
        ? `Overload & Thermal Anomaly (${asset.load_utilization_pct}% load, ${asset.oil_temp_c}°C oil temp)`
        : asset.status === 'OFFLINE'
          ? 'Telemetry Loss & Offline Verification'
          : 'Standard Preventive Diagnostic & Oil Sample'
    );
    setDispatchAction(asset.recommended_action || 'Thermal camera scan & tap changer adjustment');
    if (eligibleZoneEngineers.length > 0) {
      setAssignedEngineerName(eligibleZoneEngineers[0].name);
    }
    setIsDispatchModalOpen(true);
  };

  // Open Reassign Modal for a rejected or awaiting work order
  const handleOpenReassignModal = (wo: WorkOrder) => {
    setReassignTargetWoId(wo.id);
    const alternateEng = eligibleZoneEngineers.find(
      (fe) => !wo.assignedTo.toLowerCase().includes(fe.name.toLowerCase())
    );
    setNewAssigneeName(alternateEng ? alternateEng.name : eligibleZoneEngineers[0]?.name || 'Hitesh N. Vaghela');
    setReassignNotes(
      wo.rejectionReason
        ? `Reassigned after rejection by ${wo.assignedTo} ("${wo.rejectionReason}")`
        : 'Reallocated to available subdivision field engineer'
    );
  };

  // Execute Reassignment
  const handleConfirmReassign = () => {
    if (!reassignTargetWo) return;
    const res = reassignTransformerWorkOrder(reassignTargetWo.id, newAssigneeName, reassignNotes);
    if (res.success) {
      setReassignTargetWoId(null);
      setTrackingWorkOrderId(reassignTargetWo.id);
    }
  };

  // Execute Verify & Complete Maintenance Work Order
  const handleConfirmCompleteWorkOrder = (wo: WorkOrder) => {
    const res = completeTransformerMaintenanceWorkOrder(wo.id, completionReviewNotes);
    if (res.success) {
      // Keep tracking modal open so user sees completed timeline state
    }
  };

  // Execute Dispatch Maintenance Work Order
  const handleConfirmDispatch = async () => {
    if (!selectedAsset) return;
    setIsSubmittingWo(true);

    try {
      try {
        await fetch(`/api/v1/transformers/${selectedAsset.id}/maintenance-work-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            work_order_type: 'TRANSFORMER_OVERLOAD_INSPECTION',
            priority: dispatchPriority.toUpperCase(),
            description: dispatchReason,
            recommended_action: dispatchAction,
            assigned_engineer_name: assignedEngineerName,
          }),
        });
      } catch {
        // Handled gracefully by local store
      }

      const res = dispatchTransformerWorkOrder({
        transformerId: selectedAsset.id,
        utilityAssetCode: selectedAsset.utility_asset_code,
        feederId: selectedAsset.feeder_id,
        zone: selectedAsset.zone,
        priority: dispatchPriority,
        reason: dispatchReason,
        recommendedAction: dispatchAction,
        assignedEngineerIdOrName: assignedEngineerName,
      });

      if (res.success && res.workOrder) {
        setIsDispatchModalOpen(false);
        setInspectTab('WORK_ORDERS');
      }
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
                Real-Time Telemetry & Maintenance Assignment Tracking
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Honest Connectivity Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsConnectivityModalOpen(true)}
            role="status"
            aria-live="polite"
            aria-label={isSseConnected ? 'Live SSE Connected. Click for details' : 'Calibrated Demo Telemetry. Click for details'}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer hover:shadow-xs ${
              isSseConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
                : 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100/70'
            }`}
          >
            <Radio aria-hidden="true" className={`w-3.5 h-3.5 ${isSseConnected ? 'animate-pulse text-emerald-600' : 'text-cyan-600'}`} />
            <span>{isSseConnected ? 'LIVE SSE CONNECTED' : 'CALIBRATED DEMO TELEMETRY'}</span>
            <Info className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          <button
            onClick={handleRefreshWorklist}
            disabled={isLoadingWorklist}
            aria-label="Refresh Worklist Catalog"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${isLoadingWorklist ? 'animate-spin' : ''}`} />
            Refresh Worklist
          </button>

          <button
            onClick={handleRefreshTelemetry}
            disabled={isRefreshingTelemetry}
            aria-label="Refresh Live Telemetry Sensor Data"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Activity aria-hidden="true" className={`w-3.5 h-3.5 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />
            Refresh Telemetry ({lastTelemetryRefreshTime})
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{tr.statTotalDtrs || 'TOTAL DTR ASSETS'}</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{kpis.total}</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {kpis.inService} In-Service • {kpis.offlineCount} Offline
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{tr.statAvgHealthIndex || 'FLEET HEALTH INDEX'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{kpis.fleetHealth}%</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Normalized CEA Composite Index</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{tr.statOverloaded || 'HIGH RISK ASSETS'}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{kpis.highRisk}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Overload & Thermal Runaway Watch</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{tr.statCriticalAlerts || 'ACTIVE ALERTS'}</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{kpis.activeAlerts}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Threshold Anomaly Notifications</div>
        </div>
      </div>

      {/* Maintenance Assignment Summary Strip (Clickable Quick Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="region" aria-label="Maintenance Assignment Status Counters">
        <button
          type="button"
          onClick={() => setMaintenanceFilter((prev) => (prev === 'REJECTED' ? 'ALL' : 'REJECTED'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            maintenanceFilter === 'REJECTED'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>{tr.counterReassignmentRequired || 'Reassignment Required'}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-rose-700 font-mono">{maintenanceCounts.reassignmentRequired}</span>
            <span className="text-[11px] text-slate-500">Top Priority</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setMaintenanceFilter((prev) => (prev === 'AWAITING_ACCEPTANCE' ? 'ALL' : 'AWAITING_ACCEPTANCE'))
          }
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            maintenanceFilter === 'AWAITING_ACCEPTANCE'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>{tr.counterAwaitingAcceptance || 'Awaiting Acceptance'}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-amber-800 font-mono">{maintenanceCounts.awaitingAcceptance}</span>
            <span className="text-[11px] text-slate-500">Dispatched</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setMaintenanceFilter((prev) => (prev === 'ACTIVE_PROGRESS' ? 'ALL' : 'ACTIVE_PROGRESS'))
          }
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            maintenanceFilter === 'ACTIVE_PROGRESS'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
            <span>{tr.counterInProgress || 'In Progress'}</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-blue-700 font-mono">{maintenanceCounts.inProgress}</span>
            <span className="text-[11px] text-slate-500">Active / Review</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMaintenanceFilter((prev) => (prev === 'COMPLETED' ? 'ALL' : 'COMPLETED'))}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            maintenanceFilter === 'COMPLETED'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>{tr.counterCompleted || 'Completed'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-700 font-mono">{maintenanceCounts.completed}</span>
            <span className="text-[11px] text-slate-500">Verified Closed</span>
          </div>
        </button>
      </div>

      {/* Main Asset Table & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={tr.searchPlaceholder || 'Search asset, WO ID, engineer...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-200/80">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{tr.sortPriorityIndicator || 'Sorted by Action Priority & Risk'}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Maintenance Status Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <select
                aria-label="Filter by Maintenance Status"
                value={maintenanceFilter}
                onChange={(e) => setMaintenanceFilter(e.target.value as any)}
                className="bg-transparent focus:outline-hidden text-xs font-semibold text-slate-700"
              >
                <option value="ALL">{tr.filterAllMaintenance || 'All Maintenance States'}</option>
                <option value="REJECTED">{tr.maintRejected || 'Rejected • Reassign'}</option>
                <option value="AWAITING_ACCEPTANCE">{tr.maintAwaitingAcceptance || 'Awaiting Acceptance'}</option>
                <option value="ACCEPTED">{tr.maintAccepted || 'Accepted'}</option>
                <option value="IN_PROGRESS">{tr.maintInProgress || 'In Progress'}</option>
                <option value="PENDING_REVIEW">{tr.maintPendingReview || 'Inspection Submitted'}</option>
                <option value="COMPLETED">{tr.maintCompleted || 'Completed'}</option>
                <option value="NOT_ASSIGNED">{tr.maintNotAssigned || 'Not Assigned'}</option>
              </select>
            </div>

            {/* Risk filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Filter by Risk Level"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as any)}
                className="bg-transparent focus:outline-hidden text-xs font-medium text-slate-700"
              >
                <option value="ALL">{tr.filterAllStatuses || 'All Risk Levels'}</option>
                <option value="HIGH">{tr.riskTierHigh || 'High Risk'}</option>
                <option value="MEDIUM">{tr.riskTierMedium || 'Medium Risk'}</option>
                <option value="LOW">{tr.riskTierLow || 'Low Risk'}</option>
              </select>
            </div>

            {/* Operational Status filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <select
                aria-label="Filter by Operational Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent focus:outline-hidden text-xs font-medium text-slate-700"
              >
                <option value="ALL">{tr.filterAllStatuses || 'All Operational States'}</option>
                <option value="IN_SERVICE">{tr.statusOperational || 'In Service'}</option>
                <option value="OFFLINE">{tr.sseOffline || 'Offline / Stale'}</option>
                <option value="MAINTENANCE">{tr.statusMaintenance || 'Under Maintenance'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">{tr.colCode || 'Asset Code'}</th>
                <th className="px-4 py-3">{tr.colName || 'Feeder & Substation'}</th>
                <th className="px-4 py-3">{tr.colPeakLoad || 'Load & Rating'}</th>
                <th className="px-4 py-3">{tr.colOilTemp || 'Oil / Winding Temp'}</th>
                <th className="px-4 py-3">{tr.colRiskTier || 'Risk Tier'}</th>
                <th className="px-4 py-3">{tr.colOperationalStatus || 'Operational Status'}</th>
                <th className="px-4 py-3">{tr.colMaintenanceStatus || 'Maintenance Status'}</th>
                <th className="px-4 py-3 text-right">{tr.colActions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => {
                const latestWo = getLatestTransformerWorkOrder(asset, workOrders);
                const maintStatus = deriveTransformerMaintenanceStatus(latestWo);
                const hasActiveAssignment =
                  maintStatus === 'AWAITING_ACCEPTANCE' ||
                  maintStatus === 'ACCEPTED' ||
                  maintStatus === 'IN_PROGRESS' ||
                  maintStatus === 'PENDING_REVIEW';

                return (
                  <tr
                    key={asset.id}
                    className={`transition-colors ${
                      maintStatus === 'REJECTED'
                        ? 'bg-rose-50/35 hover:bg-rose-50/60'
                        : maintStatus === 'AWAITING_ACCEPTANCE'
                          ? 'bg-amber-50/20 hover:bg-amber-50/40'
                          : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{asset.utility_asset_code}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{asset.serial_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-xs">{asset.feeder_id}</div>
                      <div className="text-[11px] text-slate-500">{asset.substation_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              asset.load_utilization_pct > 90
                                ? 'bg-rose-500'
                                : asset.load_utilization_pct > 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, asset.load_utilization_pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold font-mono">{asset.load_utilization_pct}%</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{asset.rated_kva} kVA Rated</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold font-mono">
                        <span
                          className={
                            asset.oil_temp_c > 85
                              ? 'text-rose-600 font-bold'
                              : asset.oil_temp_c > 75
                                ? 'text-amber-600'
                                : 'text-slate-700'
                          }
                        >
                          {asset.oil_temp_c}°C Oil
                        </span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className={asset.winding_temp_c > 95 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {asset.winding_temp_c}°C Wnd
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                          asset.risk_level === 'HIGH'
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
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            asset.status === 'IN_SERVICE'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                              : asset.status === 'OFFLINE'
                                ? 'text-slate-700 bg-slate-100 border border-slate-300'
                                : 'text-blue-700 bg-blue-50 border border-blue-200'
                          }`}
                        >
                          {asset.status === 'IN_SERVICE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {asset.status === 'OFFLINE' && <WifiOff className="w-3 h-3 text-slate-500" />}
                          {asset.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Stream: {asset.telemetry_status || 'DEMO'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {renderMaintenanceStatusBadge(maintStatus)}
                        {latestWo && (
                          <div className="text-[11px] text-slate-600 space-y-0.5 mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800">{latestWo.id}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-700 truncate max-w-[140px]">
                                {latestWo.assignedTo}
                              </span>
                            </div>
                            {maintStatus === 'REJECTED' && latestWo.rejectionReason && (
                              <div className="text-[10px] text-rose-700 font-medium bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 max-w-[210px] truncate">
                                Reason: &ldquo;{latestWo.rejectionReason}&rdquo;
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setInspectTab('OVERVIEW');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {tr.btnDossier || 'Inspect'}
                        </button>

                        {maintStatus === 'REJECTED' && latestWo && (
                          <>
                            <button
                              onClick={() => handleOpenReassignModal(latestWo)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {tr.btnReassignWo || 'Reassign'}
                            </button>
                            <button
                              onClick={() => setTrackingWorkOrderId(latestWo.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                              Track
                            </button>
                          </>
                        )}

                        {hasActiveAssignment && latestWo && (
                          <button
                            onClick={() => setTrackingWorkOrderId(latestWo.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                              maintStatus === 'PENDING_REVIEW'
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                            }`}
                          >
                            <History className="w-3.5 h-3.5" />
                            {maintStatus === 'PENDING_REVIEW'
                              ? 'Review & Complete'
                              : tr.btnTrackWo || 'Track Work Order'}
                          </button>
                        )}

                        {(maintStatus === 'NOT_ASSIGNED' ||
                          maintStatus === 'COMPLETED' ||
                          maintStatus === 'CANCELLED') && (
                          <>
                            {latestWo && maintStatus === 'COMPLETED' && (
                              <button
                                onClick={() => setTrackingWorkOrderId(latestWo.id)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors border border-emerald-200"
                              >
                                <History className="w-3.5 h-3.5" />
                                History
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenDispatch(asset)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Dispatch
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Spacious Transformer-Specific Workspace Modal (INSPECT) */}
      {selectedAsset && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-workspace-title"
        >
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            {/* Workspace Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shadow-2xs">
                  <Cpu aria-hidden="true" className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="inspect-workspace-title" className="font-bold text-lg text-slate-900">
                      {selectedAsset.utility_asset_code}
                    </h2>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        selectedAsset.status === 'IN_SERVICE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedAsset.status === 'OFFLINE'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {selectedAsset.status}
                    </span>
                    {renderMaintenanceStatusBadge(
                      deriveTransformerMaintenanceStatus(getLatestTransformerWorkOrder(selectedAsset, workOrders))
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Substation: <strong className="text-slate-700">{selectedAsset.substation_id}</strong> • Feeder:{' '}
                    <strong className="text-slate-700">{selectedAsset.feeder_id}</strong> • Zone:{' '}
                    <strong className="text-slate-700">{selectedAsset.zone} Subdivision</strong>
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                {(() => {
                  const latestWo = getLatestTransformerWorkOrder(selectedAsset, workOrders);
                  const st = deriveTransformerMaintenanceStatus(latestWo);
                  if (st === 'REJECTED' && latestWo) {
                    return (
                      <button
                        onClick={() => handleOpenReassignModal(latestWo)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reassign Rejected Order
                      </button>
                    );
                  }
                  if (
                    latestWo &&
                    (st === 'AWAITING_ACCEPTANCE' ||
                      st === 'ACCEPTED' ||
                      st === 'IN_PROGRESS' ||
                      st === 'PENDING_REVIEW')
                  ) {
                    return (
                      <button
                        onClick={() => setTrackingWorkOrderId(latestWo.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                      >
                        <History className="w-3.5 h-3.5" />
                        Track Active Work Order ({latestWo.id})
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => handleOpenDispatch(selectedAsset)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Dispatch Maintenance
                    </button>
                  );
                })()}
                <button
                  onClick={() => setSelectedAsset(null)}
                  aria-label="Close Inspection Workspace"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs within Inspect Workspace */}
            <div className="flex items-center gap-1 px-5 border-b border-slate-200 bg-white shrink-0" role="tablist">
              <button
                role="tab"
                aria-selected={inspectTab === 'OVERVIEW'}
                onClick={() => setInspectTab('OVERVIEW')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  inspectTab === 'OVERVIEW'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Asset Specifications & Real-Time Health
              </button>
              <button
                role="tab"
                aria-selected={inspectTab === 'TELEMETRY'}
                onClick={() => setInspectTab('TELEMETRY')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  inspectTab === 'TELEMETRY'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Telemetry Trend & Sensors
              </button>
              <button
                role="tab"
                aria-selected={inspectTab === 'WORK_ORDERS'}
                onClick={() => setInspectTab('WORK_ORDERS')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  inspectTab === 'WORK_ORDERS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Maintenance History ({assetWorkOrders.length})
              </button>
              <button
                role="tab"
                aria-selected={inspectTab === 'ALERTS'}
                onClick={() => setInspectTab('ALERTS')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  inspectTab === 'ALERTS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Active Alerts ({assetAlerts.length})
              </button>
            </div>

            {/* Workspace Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: OVERVIEW */}
              {inspectTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>LOAD UTILIZATION</span>
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{selectedAsset.load_utilization_pct}%</span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({Math.round((selectedAsset.load_utilization_pct / 100) * selectedAsset.rated_kva)} / {selectedAsset.rated_kva} kVA)
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${selectedAsset.load_utilization_pct > 90 ? 'bg-rose-500' : selectedAsset.load_utilization_pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, selectedAsset.load_utilization_pct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>TOP-OIL TEMP</span>
                        <Thermometer className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900">{selectedAsset.oil_temp_c}°C</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {selectedAsset.oil_temp_c > 85 ? (
                          <span className="text-rose-600 font-bold">Over Limit (&gt;80°C threshold)</span>
                        ) : selectedAsset.oil_temp_c > 75 ? (
                          <span className="text-amber-600 font-bold">Warning band (75-80°C)</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Optimal thermal margin</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>WINDING TEMP</span>
                        <Thermometer className="w-4 h-4 text-rose-600" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900">{selectedAsset.winding_temp_c}°C</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        IEC 60076 Hotspot Limit: 98.0°C
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>VIBRATION VELOCITY</span>
                        <Gauge className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-slate-900">{selectedAsset.vibration_mms} mm/s</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        ISO 10816 Class II Benchmark: &lt;4.5 mm/s
                      </div>
                    </div>
                  </div>

                  {/* Explainable Predictive Risk Card */}
                  <div
                    className={`p-5 rounded-2xl border ${
                      selectedAsset.risk_level === 'HIGH'
                        ? 'bg-rose-50/70 border-rose-200'
                        : selectedAsset.risk_level === 'MEDIUM'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-emerald-50/70 border-emerald-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 mb-3 border-slate-200/50">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Predictive Risk Assessment & Failure Forecasting
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Multi-variable ML model combining thermal acceleration, load ramp rate, and vibration harmonics.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white shadow-2xs border border-slate-200">
                          Horizon: <strong>{selectedAsset.prediction_horizon}</strong>
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-md text-white ${
                            selectedAsset.risk_level === 'HIGH'
                              ? 'bg-rose-600'
                              : selectedAsset.risk_level === 'MEDIUM'
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                          }`}
                        >
                          Risk Tier: {selectedAsset.risk_level}
                        </span>
                      </div>
                    </div>

                    {selectedAsset.explainable_risk_factors && (
                      <div className="space-y-1.5 text-xs text-slate-800 mb-3">
                        <strong className="block text-slate-900 mb-1">Key Explainable Risk Factors:</strong>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedAsset.explainable_risk_factors.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedAsset.recommended_action && (
                      <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-xs">
                        <strong className="text-blue-900 block mb-0.5">UGVCL Recommended Engineering Action:</strong>
                        <span className="text-slate-700">{selectedAsset.recommended_action}</span>
                      </div>
                    )}
                  </div>

                  {/* Technical Specifications Grid */}
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      Asset Technical Dossier & Nameplate Specifications
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">RATED CAPACITY</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedAsset.rated_kva} kVA</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">VOLTAGE CLASS</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedAsset.voltage_class}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">MANUFACTURER</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedAsset.manufacturer}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">SERIAL NUMBER</span>
                        <span className="font-bold text-slate-900 text-sm font-mono">{selectedAsset.serial_number}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">COMMISSIONING DATE</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedAsset.commissioning_date}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">PHASES & VECTOR</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedAsset.phases}-Phase (Dyn11)</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">GPS FIX LOCATION</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedAsset.latitude.toFixed(4)}° N, {selectedAsset.longitude.toFixed(4)}° E
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <span className="text-slate-500 block">COORDINATE SOURCE</span>
                        <span className="font-bold text-slate-900 text-sm">{selectedAsset.coordinate_source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TELEMETRY TREND */}
              {inspectTab === 'TELEMETRY' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        Continuous Multi-Sensor Telemetry Trends
                      </h3>
                      <p className="text-xs text-slate-500">
                        Load profile (kVA), top-oil temperature (°C), and winding hotspot (°C)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-semibold">
                        <button
                          onClick={() => setChartTimeRange('6H')}
                          className={`px-3 py-1 rounded-md transition-all ${chartTimeRange === '6H' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'}`}
                        >
                          6 Hours
                        </button>
                        <button
                          onClick={() => setChartTimeRange('24H')}
                          className={`px-3 py-1 rounded-md transition-all ${chartTimeRange === '24H' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'}`}
                        >
                          24 Hours
                        </button>
                        <button
                          onClick={() => setChartTimeRange('7D')}
                          className={`px-3 py-1 rounded-md transition-all ${chartTimeRange === '7D' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'}`}
                        >
                          7 Days
                        </button>
                      </div>

                      <button
                        onClick={() => setShowChartDataTable((prev) => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        {showChartDataTable ? 'Graphical Trend' : 'Tabular View'}
                      </button>
                    </div>
                  </div>

                  {!showChartDataTable ? (
                    <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={activeTelemetrySeries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="timeLabel" stroke="#94a3b8" fontSize={11} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="load_kva"
                              stroke="#2563eb"
                              strokeWidth={2}
                              name={`Load (kVA, Rated: ${selectedAsset.rated_kva})`}
                            />
                            <Line
                              type="monotone"
                              dataKey="oil_temp_c"
                              stroke="#f97316"
                              strokeWidth={2}
                              name="Oil Temp (°C, Limit: 80°C)"
                            />
                            <Line
                              type="monotone"
                              dataKey="winding_temp_c"
                              stroke="#ef4444"
                              strokeWidth={2}
                              name="Winding Temp (°C, Limit: 98°C)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">Timestamp</th>
                            <th className="px-4 py-2.5">Load (kVA)</th>
                            <th className="px-4 py-2.5">Utilization %</th>
                            <th className="px-4 py-2.5">Top-Oil Temp (°C)</th>
                            <th className="px-4 py-2.5">Winding Temp (°C)</th>
                            <th className="px-4 py-2.5">Vibration (mm/s)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeTelemetrySeries.map((point, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70">
                              <td className="px-4 py-2 font-mono">{point.timeLabel} ({point.timestamp})</td>
                              <td className="px-4 py-2 font-bold">{point.load_kva} kVA</td>
                              <td className="px-4 py-2 font-medium">
                                {Math.round((point.load_kva / selectedAsset.rated_kva) * 100)}%
                              </td>
                              <td className="px-4 py-2">{point.oil_temp_c}°C</td>
                              <td className="px-4 py-2">{point.winding_temp_c}°C</td>
                              <td className="px-4 py-2">{point.vibration_mms} mm/s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: WORK ORDERS */}
              {inspectTab === 'WORK_ORDERS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Traceable Maintenance Work Orders & Inspection Tasks
                      </h3>
                      <p className="text-xs text-slate-500">
                        Canonical records synchronized across Employee, Field Engineer, and Management portals.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenDispatch(selectedAsset)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Dispatch New Task
                    </button>
                  </div>

                  {assetWorkOrders.length > 0 ? (
                    <div className="space-y-3">
                      {assetWorkOrders.map((wo) => {
                        const woMaintStatus = deriveTransformerMaintenanceStatus(wo);
                        return (
                          <div
                            key={wo.id}
                            className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all space-y-2.5"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 font-mono">{wo.id}</span>
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                    wo.priority === 'Emergency'
                                      ? 'bg-rose-100 text-rose-800'
                                      : wo.priority === 'High'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {wo.priority} Priority
                                </span>
                                {renderMaintenanceStatusBadge(woMaintStatus)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Scheduled: {wo.scheduledDate}
                                </span>
                                <button
                                  onClick={() => setTrackingWorkOrderId(wo.id)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                                >
                                  View Timeline
                                </button>
                                {woMaintStatus === 'REJECTED' && (
                                  <button
                                    onClick={() => handleOpenReassignModal(wo)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                                  >
                                    Reassign
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-800 font-medium">{wo.title}</p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                                Assigned: <strong className="text-slate-800">{wo.assignedTo}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {wo.subdivision} ({wo.feederName})
                              </span>
                            </div>

                            {wo.actionHistory && wo.actionHistory.length > 0 && (
                              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                                <strong className="text-slate-800">Latest Event:</strong>{' '}
                                {wo.actionHistory[wo.actionHistory.length - 1].notes} —{' '}
                                <span className="text-slate-500 italic">
                                  by {wo.actionHistory[wo.actionHistory.length - 1].actor}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                      <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-700">No Active Maintenance Orders</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          There are currently no open work orders for {selectedAsset.utility_asset_code}. You can dispatch
                          an overload inspection or routine check directly to field linemen.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenDispatch(selectedAsset)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Dispatch Maintenance Order
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ALERTS */}
              {inspectTab === 'ALERTS' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Active Grid Sensor Alarms for {selectedAsset.utility_asset_code}
                  </h3>

                  {assetAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {assetAlerts.map((alt) => (
                        <div
                          key={alt.id}
                          className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <strong className="text-amber-900 text-sm font-bold">{alt.alert_type}</strong>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200 text-amber-900">
                                {alt.severity}
                              </span>
                            </div>
                            <span className="text-slate-500 text-[11px] font-mono">{alt.first_seen_at}</span>
                          </div>
                          <p className="text-slate-800">{alt.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-slate-700">Zero Active Alarms</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        All load, thermal, and vibration sensors are operating within nominal parameters.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work-Order Tracking & Lifecycle Timeline Modal */}
      {trackingWorkOrder && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tracking-wo-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id="tracking-wo-modal-title" className="text-base font-bold text-slate-900 font-mono">
                    {trackingWorkOrder.id}
                  </h3>
                  {renderMaintenanceStatusBadge(deriveTransformerMaintenanceStatus(trackingWorkOrder))}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                    {trackingWorkOrder.priority} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  {trackingWorkOrder.title} • {trackingWorkOrder.subdivision}
                </p>
              </div>
              <button
                onClick={() => setTrackingWorkOrderId(null)}
                aria-label="Close Work Order Tracking Modal"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Visual 6-Stage Progression Stepper */}
              {(() => {
                const st = deriveTransformerMaintenanceStatus(trackingWorkOrder);
                const stages = [
                  { key: 'DISPATCHED', label: 'Dispatched' },
                  { key: 'AWAITING_ACCEPTANCE', label: 'Awaiting Acceptance' },
                  { key: 'ACCEPTED', label: 'Accepted' },
                  { key: 'IN_PROGRESS', label: 'In Progress' },
                  { key: 'PENDING_REVIEW', label: 'Inspection Submitted' },
                  { key: 'COMPLETED', label: 'Completed' }
                ];
                const activeIdx =
                  st === 'AWAITING_ACCEPTANCE'
                    ? 1
                    : st === 'ACCEPTED'
                      ? 2
                      : st === 'IN_PROGRESS'
                        ? 3
                        : st === 'PENDING_REVIEW'
                          ? 4
                          : st === 'COMPLETED'
                            ? 5
                            : 1;

                return (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Maintenance Lifecycle Progression
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {stages.map((stage, idx) => {
                        const isDone = st !== 'REJECTED' && idx <= activeIdx;
                        const isCurrent = st !== 'REJECTED' && idx === activeIdx;
                        return (
                          <div
                            key={stage.key}
                            className={`p-2 rounded-lg border text-center transition-all ${
                              isCurrent
                                ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold ring-2 ring-blue-500/20'
                                : isDone
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="text-[10px] font-mono">STEP {idx + 1}</div>
                            <div className="mt-0.5 text-[11px] leading-tight">{stage.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Rejection Banner & Direct Reassignment Trigger */}
              {deriveTransformerMaintenanceStatus(trackingWorkOrder) === 'REJECTED' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Assignment Rejected — Reassignment Required
                    </div>
                    <p className="text-rose-700">
                      Rejected by <strong>{trackingWorkOrder.rejectedBy || trackingWorkOrder.assignedTo}</strong>:{' '}
                      <span className="font-semibold">&ldquo;{trackingWorkOrder.rejectionReason}&rdquo;</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenReassignModal(trackingWorkOrder)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reassign Engineer Now
                  </button>
                </div>
              )}

              {/* Pending Review Verification Box */}
              {deriveTransformerMaintenanceStatus(trackingWorkOrder) === 'PENDING_REVIEW' && (
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      Field Inspection Submitted — Ready for Final Verification
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-semibold text-[11px]">
                      Awaiting Closure
                    </span>
                  </div>

                  {trackingWorkOrder.inspectionReport && (
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1.5 text-slate-700">
                      <div>
                        <strong>Technician Findings:</strong> {trackingWorkOrder.inspectionReport.technicianRemarks}
                      </div>
                      <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                        <span>Meter/Asset Scanned: <strong>{trackingWorkOrder.inspectionReport.meterSerialScanned}</strong></span>
                        <span>Terminal: <strong>{trackingWorkOrder.inspectionReport.terminalCondition}</strong></span>
                        <span>Photos Attached: <strong>{trackingWorkOrder.inspectionReport.photoUploaded ? 'Yes' : 'No'}</strong></span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={completionReviewNotes}
                      onChange={(e) => setCompletionReviewNotes(e.target.value)}
                      placeholder="Verification closure remarks..."
                      className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-slate-800"
                    />
                    <button
                      onClick={() => handleConfirmCompleteWorkOrder(trackingWorkOrder)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {tr.btnCompleteMaintenance || 'Verify & Complete Maintenance'}
                    </button>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Assigned Engineer</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{trackingWorkOrder.assignedTo}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Dispatched By</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{trackingWorkOrder.dispatchedBy || 'Subdivision AE Ops'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Feeder / Location</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{trackingWorkOrder.feederName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Scheduled Target</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{trackingWorkOrder.scheduledDate}</span>
                </div>
              </div>

              {/* Chronological Audit & Action Timeline */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  Chronological Work-Order Audit Timeline ({trackingWorkOrder.actionHistory?.length || 0} Events)
                </h4>
                <div className="space-y-2.5 border-l-2 border-blue-200 pl-4 ml-2">
                  {(trackingWorkOrder.actionHistory || []).map((entry, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[21px] top-4 ring-4 ring-white" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{entry.stage}</span>
                        <span className="font-mono text-[11px] text-slate-500">{entry.timestamp}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{entry.notes}</p>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Actor: <strong className="text-slate-700">{entry.actor}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setTrackingWorkOrderId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Work Order Modal */}
      {reassignTargetWo && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reassign-wo-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 id="reassign-wo-modal-title" className="text-base font-bold text-slate-900">
                  {tr.modalReassignTitle || 'Reassign Maintenance Work Order'}
                </h3>
                <p className="text-xs text-slate-500">
                  Preserves Work Order <strong className="font-mono text-slate-700">{reassignTargetWo.id}</strong> and full audit history.
                </p>
              </div>
              <button
                onClick={() => setReassignTargetWoId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reassignTargetWo.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                <div className="font-bold">Previous Rejection by {reassignTargetWo.rejectedBy || reassignTargetWo.assignedTo}:</div>
                <div>&ldquo;{reassignTargetWo.rejectionReason}&rdquo;</div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select New Eligible Field Engineer *</label>
                <select
                  aria-label="Select New Eligible Field Engineer"
                  value={newAssigneeName}
                  onChange={(e) => setNewAssigneeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800"
                >
                  {eligibleZoneEngineers.map((fe) => (
                    <option key={fe.id} value={fe.name}>
                      {fe.name} ({fe.subdivision}) — {fe.activeWorkOrders} Active Tasks
                    </option>
                  ))}
                  <option value="Vikram Zala">Vikram Zala (North Circle Radial Ops)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reassignment Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setReassignTargetWoId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Work Order Dispatch Modal */}
      {isDispatchModalOpen && selectedAsset && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispatch-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 id="dispatch-modal-title" className="text-base font-bold text-slate-900">
                  Dispatch Maintenance Work Order
                </h3>
                <p className="text-xs text-slate-500">
                  Assigns field crew in {selectedAsset.zone} Subdivision (Initial state: Awaiting Acceptance).
                </p>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Transformer</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedAsset.utility_asset_code} (${selectedAsset.feeder_id}) — ${selectedAsset.rated_kva} kVA`}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Priority Level *</label>
                <select
                  value={dispatchPriority}
                  onChange={(e) => setDispatchPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800"
                >
                  <option value="Routine">Routine (Scheduled 30-Day Check)</option>
                  <option value="High">High (Thermal & Overload Anomaly — Action in 24h)</option>
                  <option value="Emergency">Emergency (Immediate Grid Safety & Shutdown)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Field Engineer *</label>
                <select
                  value={assignedEngineerName}
                  onChange={(e) => setAssignedEngineerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800"
                >
                  {eligibleZoneEngineers.map((fe) => (
                    <option key={fe.id} value={fe.name}>
                      {fe.name} ({fe.subdivision}) — {fe.activeWorkOrders} Active Tasks
                    </option>
                  ))}
                  {eligibleZoneEngineers.length === 0 && (
                    <option value="Vikramaditya Solanki">Vikramaditya Solanki (Mehsana City North)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Inspection Notes & Scope *</label>
                <textarea
                  rows={2}
                  value={dispatchReason}
                  onChange={(e) => setDispatchReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recommended Action Protocol</label>
                <input
                  type="text"
                  value={dispatchAction}
                  onChange={(e) => setDispatchAction(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                disabled={isSubmittingWo}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmittingWo ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connectivity Status & Diagnostics Modal */}
      {isConnectivityModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connectivity-modal-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-600" />
                <h3 id="connectivity-modal-title" className="text-base font-bold text-slate-900">
                  Telemetry Channel Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setIsConnectivityModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Live SSE Stream:</span>
                  <span className="font-mono font-bold text-slate-800">/api/v1/transformers/stream</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gateway Status:</span>
                  <span className={`font-bold ${isSseConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isSseConnected ? 'Connected (Active SSE Stream)' : 'Standby / Local Calibrated Telemetry'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subdivision Scope:</span>
                  <span className="font-bold text-slate-800">{userZone} Subdivision</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Last Telemetry Refresh:</span>
                  <span className="font-mono text-slate-800">{lastTelemetryRefreshTime}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 text-blue-900 text-xs leading-relaxed">
                <strong>Deterministic Data Policy:</strong> When the FastAPI gateway (:8008) is standby, VidyutFlow
                uses calibrated mathematical models reflecting real utility engineering standards (IEC 60076, CEA Grid Code).
                Zero fake LIVE data is presented; all scenarios reflect audited baseline fixtures.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsConnectivityModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
