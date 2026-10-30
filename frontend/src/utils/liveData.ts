/**
 * Live API data layer — typed access to the FastAPI backend for the wired screens
 * (KPI panel, officer queue, wizard submit, alert centre).
 *
 * Every hook degrades gracefully: with no backend session (or an unreachable API)
 * `data` stays null and the UI keeps showing its demo workspace. Polling is the
 * honest "live on refresh" behaviour (45s) — real-time streaming is roadmap.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasBackendSession, getBackendSessionGeneration, subscribeBackendSession } from './backendSession';
import { fastApi, jsonPayload } from './fastApiClient';

export interface LiveKpiSummary {
  total_requests: number;
  completed: number;
  pending: number;
  high_sla_risk: number;
  needs_correction: number;
  avg_sla_risk: number;
  risk_buckets: Record<string, number>;
  by_status: Record<string, number>;
  by_zone: Record<string, number>;
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface LiveRequestRow {
  id: string;
  applicant_name: string;
  phone?: string;
  address?: string;
  description?: string;
  meter_serial?: string;
  assigned_engineer_id?: string;
  zone: string;
  status: string;
  validation_notes: string;
  validation_issues?: Array<{ code: string; message: string; threshold_kw?: number }> | null;
  category: string;
  severity: string;
  sla_breach_risk: number;
  sla_risk_reasons: string[];
  requested_load_kw: number;
  updated_at: string;
}

export interface FieldSyncPayload {
  client_uuid: string;
  request_id: string;
  task_status: 'FIELD_VERIFIED' | 'COMPLETED' | 'BLOCKED';
  notes?: string;
  meter_serial?: string;
  created_offline_at?: string;
}

export interface FieldSyncResponse {
  duplicate: boolean;
  synced: boolean;
  field_update_id: string;
  request_status?: string;
  message?: string;
}

export interface LiveNotificationItem {
  id: string;
  title: string;
  message: string;
  kind: 'info' | 'warning' | 'success' | 'alert';
  request_id: string;
  read: boolean;
  created_at: string;
}

export const LIVE_POLL_MS = 45_000;

export interface ErpFieldMapping {
  source_field: string;
  erp_field: string;
  transform_rule: string;
  required_on: string;
}

export interface ErpMappingsResponse {
  adapter_mode: string;
  is_simulated: boolean;
  target_system: string;
  disclosure: string;
  mappings: ErpFieldMapping[];
}

export interface ErpSyncLogItem {
  id: string;
  request_id: string;
  applicant_name: string;
  zone: string;
  request_status: string;
  event_type: string;
  status: 'SYNCED' | 'FAILED';
  attempt_count: number;
  erp_reference_id: string;
  mapped_payload: Record<string, unknown>;
  error_message: string;
  last_attempt_at: string;
  synced_at: string | null;
  created_at: string;
  is_simulated: boolean;
}

export interface ErpSyncLogsResponse {
  is_simulated: boolean;
  disclosure: string;
  summary: {
    total: number;
    synced: number;
    failed_queue: number;
  };
  items: ErpSyncLogItem[];
}

export const CANONICAL_ERP_FIELD_MAPPINGS: ErpFieldMapping[] = [
  {
    source_field: 'id',
    erp_field: 'EXT_SERVICE_ORDER_ID',
    transform_rule: 'UUIDv4 string preserved verbatim as external idempotency key',
    required_on: 'ALL',
  },
  {
    source_field: 'applicant_name',
    erp_field: 'BP_PARTNER_FULL_NAME',
    transform_rule: 'Trimmed UTF-8 consumer / entity legal name',
    required_on: 'ALL',
  },
  {
    source_field: 'phone',
    erp_field: 'BP_PRIMARY_MOBILE_IN',
    transform_rule: '10 ASCII digits formatted as +91-<digits>',
    required_on: 'ALL',
  },
  {
    source_field: 'zone',
    erp_field: 'DISCOM_CIRCLE_CODE',
    transform_rule: 'North -> UGVCL-CIR-N01 · South -> UGVCL-CIR-S02 · else UGVCL-CIR-GEN',
    required_on: 'ALL',
  },
  {
    source_field: 'tariff_category',
    erp_field: 'ISU_RATE_CATEGORY',
    transform_rule: 'RGPU -> LT_DOM_RGPU · NRGP -> LT_COM_NRGP · else LT_GEN_TARIFF',
    required_on: 'ALL',
  },
  {
    source_field: 'phase',
    erp_field: 'SUPPLY_PHASE_CODE',
    transform_rule: '3-Phase -> 3P_415V_AC · else 1P_230V_AC',
    required_on: 'ALL',
  },
  {
    source_field: 'requested_load_kw',
    erp_field: 'CONTRACTED_LOAD_KW',
    transform_rule: 'Finite positive float rounded to 2 decimal places',
    required_on: 'ALL',
  },
  {
    source_field: 'status',
    erp_field: 'ISU_WORKFLOW_STAGE',
    transform_rule: 'APPROVED -> SANCTION_RELEASED · COMPLETED -> METER_COMMISSIONED · else IN_REVIEW',
    required_on: 'ALL',
  },
  {
    source_field: 'meter_serial',
    erp_field: 'ISU_DEVICE_SERIAL_NO',
    transform_rule: 'Installed smart-meter serial; mandatory when status == COMPLETED',
    required_on: 'COMPLETED',
  },
  {
    source_field: 'updated_at',
    erp_field: 'EVENT_UTC_TIMESTAMP',
    transform_rule: 'ISO-8601 UTC timestamp',
    required_on: 'ALL',
  },
];

export const fetchErpMappings = (): Promise<ErpMappingsResponse> =>
  fastApi<ErpMappingsResponse>('/erp/mappings');

export const fetchErpSyncLogs = (status: 'ALL' | 'SYNCED' | 'FAILED' = 'ALL'): Promise<ErpSyncLogsResponse> =>
  fastApi<ErpSyncLogsResponse>(`/erp/logs?status=${encodeURIComponent(status)}`);

export const triggerLiveErpSync = async (
  requestId: string,
  simulateFailure = false
): Promise<ErpSyncLogItem> => {
  const row = await fastApi<ErpSyncLogItem>(
    `/erp/sync/${encodeURIComponent(requestId)}`,
    jsonPayload('POST', { simulate_failure: simulateFailure })
  );
  notifyLiveDataChanged();
  return row;
};

export const retryLiveErpSyncLog = async (
  logId: string,
  meterSerial = ''
): Promise<ErpSyncLogItem> => {
  const row = await fastApi<ErpSyncLogItem>(
    `/erp/logs/${encodeURIComponent(logId)}/retry`,
    jsonPayload('POST', { meter_serial: meterSerial })
  );
  notifyLiveDataChanged();
  return row;
};

export interface AlertDispatchItem {
  id: string;
  rule_code: 'SLA_BREACH_RISK' | 'UNASSIGNED_STALE' | 'REPEATED_ZONE_FAILURES';
  severity: 'warning' | 'critical';
  zone: string;
  request_id: string;
  dedup_key: string;
  channel: 'IN_APP' | 'SIMULATED_SMS' | 'SIMULATED_EMAIL';
  recipient: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  is_simulated: boolean;
}

export interface AlertDispatchesResponse {
  is_simulated: boolean;
  disclosure: string;
  thresholds: {
    sla_risk_threshold: number;
    unassigned_hours: number;
    zone_failure_threshold: number;
  };
  summary: {
    total: number;
    simulated_sms: number;
    simulated_email: number;
    in_app: number;
    by_rule: Record<string, number>;
  };
  items: AlertDispatchItem[];
}

export interface AlertEvaluateResponse {
  is_simulated: boolean;
  disclosure: string;
  newly_dispatched: number;
  by_rule: Record<string, number>;
  items: AlertDispatchItem[];
}

export const fetchAlertDispatches = (
  channel: 'ALL' | 'SIMULATED_SMS' | 'SIMULATED_EMAIL' | 'IN_APP' = 'ALL',
  ruleCode = 'ALL'
): Promise<AlertDispatchesResponse> =>
  fastApi<AlertDispatchesResponse>(
    `/notifications/alerts/dispatches?channel=${encodeURIComponent(channel)}&rule_code=${encodeURIComponent(ruleCode)}`
  );

export const evaluateLiveAlerts = async (
  overrides: {
    sla_risk_threshold?: number;
    unassigned_hours?: number;
    zone_failure_threshold?: number;
  } = {}
): Promise<AlertEvaluateResponse> => {
  const res = await fastApi<AlertEvaluateResponse>(
    '/notifications/alerts/evaluate',
    jsonPayload('POST', overrides)
  );
  notifyLiveDataChanged();
  return res;
};

export const fetchLiveKpis = (): Promise<LiveKpiSummary> =>
  fastApi<LiveKpiSummary>('/requests/kpis/summary');

export const fetchLiveRequests = (): Promise<LiveRequestRow[]> =>
  fastApi<LiveRequestRow[]>('/requests');

export const fetchLiveNotifications = (): Promise<{
  unread: number;
  items: LiveNotificationItem[];
}> => fastApi<{ unread: number; items: LiveNotificationItem[] }>('/notifications');

export const markLiveNotificationRead = (id: string): Promise<unknown> =>
  fastApi(`/notifications/${id}/read`, { method: 'POST' });

export const markAllLiveNotificationsRead = (): Promise<unknown> =>
  fastApi('/notifications/read-all', { method: 'POST' });

const liveDataListeners = new Set<() => void>();
const notifyLiveDataChanged = (): void => {
  for (const listener of liveDataListeners) listener();
};

export const submitLiveRequest = async (payload: Record<string, unknown>): Promise<LiveRequestRow> => {
  const row = await fastApi<LiveRequestRow>('/requests', jsonPayload('POST', payload));
  notifyLiveDataChanged();
  return row;
};

export const syncLiveFieldUpdate = async (payload: FieldSyncPayload): Promise<FieldSyncResponse> => {
  const res = await fastApi<FieldSyncResponse>('/requests/field-sync', jsonPayload('POST', payload));
  notifyLiveDataChanged();
  return res;
};

export const submitLiveRequestWithDocument = async (
  fields: Record<string, string | number>,
  file: File,
  sanitizedFilename: string
): Promise<LiveRequestRow> => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  form.append('document', file, sanitizedFilename);
  const row = await fastApi<LiveRequestRow>('/requests/with-document', {
    method: 'POST',
    body: form,
  });
  notifyLiveDataChanged();
  return row;
};

export interface LiveResource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

/** Poll a live endpoint (default 45s). Idle when there is no backend session. */
export function useLivePoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = LIVE_POLL_MS
): LiveResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const mounted = useRef(false);
  const load = useCallback(async (showSpinner: boolean) => {
    if (!hasBackendSession()) {
      setData(null);
      setError(null);
      setLastUpdated(null);
      setLoading(false);
      return;
    }
    const sessionGeneration = getBackendSessionGeneration();
    if (showSpinner) setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (!mounted.current || sessionGeneration !== getBackendSessionGeneration() || !hasBackendSession()) return;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      if (!mounted.current || sessionGeneration !== getBackendSessionGeneration() || !hasBackendSession()) return;
      setError(e instanceof Error ? e.message : 'Live API unavailable');
    } finally {
      if (mounted.current && sessionGeneration === getBackendSessionGeneration() && showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const unsubscribeSession = subscribeBackendSession(() => {
      setData(null);
      setError(null);
      setLastUpdated(null);
      setLoading(false);
      if (hasBackendSession()) void load(true);
    });
    const onDataMutated = () => {
      if (hasBackendSession()) void load(false);
    };
    liveDataListeners.add(onDataMutated);
    void load(true);
    const timer = setInterval(() => {
      void load(true);
    }, intervalMs);
    return () => {
      mounted.current = false;
      unsubscribeSession();
      liveDataListeners.delete(onDataMutated);
      clearInterval(timer);
    };
  }, [load, intervalMs]);

  return {
    data,
    error,
    loading,
    lastUpdated,
    refresh: () => load(true)
  };
}

export interface DemoLoadPolicy {
  review_threshold_kw: number;
  is_demo: true;
}

export async function fetchDemoLoadPolicy(): Promise<DemoLoadPolicy> {
  const policy = await fastApi<DemoLoadPolicy>('/system/demo-load-policy', { auth: false });
  if (policy.is_demo !== true || !Number.isFinite(policy.review_threshold_kw) || policy.review_threshold_kw <= 0) {
    throw new Error('Invalid demo load policy response');
  }
  return policy;
}

export interface WorkflowTemplateItem {
  id: string;
  template_code: string;
  name: string;
  description: string;
  default_category: string;
  default_severity: string;
  sla_hours: number;
  require_document: boolean;
  require_field_visit: boolean;
  max_auto_load_kw: number;
  steps: string[];
  is_active: boolean;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface WorkflowTemplatesResponse {
  engine: string;
  items: WorkflowTemplateItem[];
}

export const fetchWorkflowTemplates = (
  includeInactive = false
): Promise<WorkflowTemplatesResponse> =>
  fastApi<WorkflowTemplatesResponse>(
    `/workflows/templates${includeInactive ? '?include_inactive=true' : ''}`
  );

export const createWorkflowTemplate = (payload: {
  template_code: string;
  name: string;
  description?: string;
  default_category?: string;
  default_severity?: string;
  sla_hours: number;
  require_document: boolean;
  require_field_visit: boolean;
  max_auto_load_kw: number;
  steps: string[];
  is_active?: boolean;
}): Promise<WorkflowTemplateItem> =>
  fastApi<WorkflowTemplateItem>('/workflows/templates', jsonPayload('POST', payload));

export const updateWorkflowTemplate = (
  templateCode: string,
  payload: Partial<{
    name: string;
    description: string;
    default_category: string;
    default_severity: string;
    sla_hours: number;
    require_document: boolean;
    require_field_visit: boolean;
    max_auto_load_kw: number;
    steps: string[];
    is_active: boolean;
  }>
): Promise<WorkflowTemplateItem> =>
  fastApi<WorkflowTemplateItem>(
    `/workflows/templates/${encodeURIComponent(templateCode)}`,
    jsonPayload('PATCH', payload)
  );

export interface SystemPerformanceResponse {
  is_synthetic_or_local: boolean;
  disclosure: string;
  latency: {
    window_capacity: number;
    sample_count: number;
    server_error_count: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    mean_ms: number;
    max_ms: number;
    per_route: Array<{
      route: string;
      count: number;
      p50_ms: number;
      p95_ms: number;
      mean_ms: number;
    }>;
  };
  caches: {
    ttl_seconds: number;
    kpi_summary: {
      name: string;
      epoch: number;
      hits: number;
      misses: number;
      hit_rate_pct: number;
      invalidations: number;
      entries: number;
    };
    workflow_templates: {
      name: string;
      epoch: number;
      hits: number;
      misses: number;
      hit_rate_pct: number;
      invalidations: number;
      entries: number;
    };
  };
  indexes: {
    expected: number;
    present: number;
    items: Array<{
      table: string;
      index: string;
      columns: string[];
      present: boolean;
    }>;
  };
}

export const fetchSystemPerformance = (): Promise<SystemPerformanceResponse> =>
  fastApi<SystemPerformanceResponse>('/system/performance');

export interface ExecutiveAnalyticsResponse {
  generated_at: string;
  data_provenance: {
    live_db_backed: string[];
    simulated_roadmap_streams: string[];
    disclosure: string;
  };
  overview: {
    total_requests: number;
    completed_count: number;
    approved_or_completed_count: number;
    pending_count: number;
    needs_correction_count: number;
    high_sla_risk_count: number;
    resolution_rate_pct: number;
    sla_compliance_pct: number;
    total_requested_load_kw: number;
    avg_turnaround_hours: number;
    erp_sync_success_pct: number;
    erp_failed_queue_count: number;
    active_alerts_count: number;
    field_sync_count: number;
    audit_chain_events: number;
  };
  by_zone_matrix: Array<{
    zone: string;
    total_requests: number;
    completed: number;
    pending: number;
    high_sla_risk: number;
    needs_correction: number;
    resolution_pct: number;
    sla_compliant_pct: number;
    avg_tat_hours: number;
    total_load_kw: number;
    compliance_status: 'COMPLIANT' | 'AT_RISK';
  }>;
  by_category_chart: Array<{
    category: string;
    count: number;
    high_risk: number;
    total_load_kw: number;
  }>;
  by_workflow_template: Array<{
    template_code: string;
    count: number;
    total_load_kw: number;
  }>;
}

export const fetchExecutiveAnalytics = (): Promise<ExecutiveAnalyticsResponse> =>
  fastApi<ExecutiveAnalyticsResponse>('/requests/kpis/executive-analytics');

export interface AiGovernanceResponse {
  api_version: string;
  supported_version_prefixes: string[];
  disclosure: string;
  advisory_governance: {
    ai_mode: string;
    models_can_approve_or_reject: boolean;
    ai_auto_approvals_or_rejections: number;
    verified_human_officer_decisions: number;
    unexplained_risk_scores: number;
    every_score_has_reasons: boolean;
    training_data_provenance: string;
    real_ugvcl_retraining_gate: string;
  };
  model_registry: Array<{
    model_id: string;
    task: string;
    algorithm: string;
    dataset: string;
    held_out_accuracy: number | null;
    roc_auc?: number | null;
    majority_baseline: number | null;
    test_samples: number | null;
  }>;
  monitoring: {
    scoped_total_requests: number;
    open_queue_distribution: {
      low_lt_0_4: number;
      watch_0_4_to_0_7: number;
      high_gte_0_7: number;
      high_risk_share_pct: number;
    };
    runtime_counters: {
      classification_inferences: number;
      sla_risk_inferences: number;
      safety_deterministic_overrides: number;
      ood_capped_load_inputs: number;
      runtime_category_counts: Record<string, number>;
    };
    monitoring_alerts: string[];
  };
}

export const fetchAiGovernance = (): Promise<AiGovernanceResponse> =>
  fastApi<AiGovernanceResponse>('/v1/assistant/ai-governance');

// ── Saved Consumer Premises (Item #29: Enter Once, Reuse Everywhere) ──────────

export interface SavedPremiseRecord {
  id: string;
  label: string;
  applicant_name: string;
  phone: string;
  address: string;
  zone: string;
  subdivision: string;
  pin_code: string;
  premises_type: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  updated_at?: string;
}

export interface SavedPremisesResponse {
  profile: {
    user_id: string;
    name: string;
    email: string;
    default_zone: string;
  };
  items: SavedPremiseRecord[];
}

export const fetchSavedPremises = (): Promise<SavedPremisesResponse> =>
  fastApi<SavedPremisesResponse>('/v1/auth/premises');

export const createSavedPremise = (payload: {
  label: string;
  applicant_name: string;
  phone: string;
  address: string;
  zone: string;
  subdivision: string;
  pin_code: string;
  premises_type: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}): Promise<SavedPremiseRecord> =>
  fastApi<SavedPremiseRecord>('/v1/auth/premises', jsonPayload('POST', payload));

export const deleteSavedPremise = (premiseId: string): Promise<{ deleted: boolean; id: string }> =>
  fastApi<{ deleted: boolean; id: string }>(`/v1/auth/premises/${encodeURIComponent(premiseId)}`, {
    method: 'DELETE',
  });

// ── Admin Staff & Subdivision Zones (Items #1 & #30) ─────────────────────────

export interface SubdivisionZoneItem {
  code: string;
  display_name: string;
  circle_name: string;
  pin_prefix: string;
  center_lat: number;
  center_lng: number;
  is_active: boolean;
  officer_count: number;
  engineer_count: number;
}

export interface StaffMemberItem {
  id: string;
  name: string;
  email: string;
  role: 'officer' | 'engineer' | 'admin';
  zone: string;
  is_active: boolean;
  active_workload: number;
  created_at: string | null;
}

export const fetchSubdivisionZones = (): Promise<{ items: SubdivisionZoneItem[] }> =>
  fastApi<{ items: SubdivisionZoneItem[] }>('/v1/staff/zones');

export const upsertSubdivisionZone = (payload: {
  code: string;
  display_name: string;
  circle_name?: string;
  pin_prefix?: string;
  center_lat?: number;
  center_lng?: number;
  is_active?: boolean;
}): Promise<SubdivisionZoneItem> =>
  fastApi<SubdivisionZoneItem>('/v1/staff/zones', jsonPayload('POST', payload));

export const fetchStaffMembers = (): Promise<{ items: StaffMemberItem[] }> =>
  fastApi<{ items: StaffMemberItem[] }>('/v1/staff/members');

export const createStaffMember = (payload: {
  name: string;
  email: string;
  password: string;
  role: 'officer' | 'engineer';
  zone: string;
}): Promise<StaffMemberItem & { claimed_unassigned_requests: number }> =>
  fastApi<StaffMemberItem & { claimed_unassigned_requests: number }>(
    '/v1/staff/members',
    jsonPayload('POST', payload)
  );

export const updateStaffMember = (
  userId: string,
  payload: { zone?: string; is_active?: boolean; name?: string }
): Promise<StaffMemberItem & { claimed_unassigned_requests: number }> =>
  fastApi<StaffMemberItem & { claimed_unassigned_requests: number }>(
    `/v1/staff/members/${encodeURIComponent(userId)}`,
    jsonPayload('PATCH', payload)
  );

export interface BackendAssistantContext {
  answer: string;
  sources: string[];
  liveDataCount: number;
}

/**
 * Query FastAPI `POST /assistant/chat` (local scikit-learn TF-IDF policy retrieval +
 * role/zone-scoped live DB SLA/pending counts) when a verified backend session is active.
 * Never throws; returns null when inactive, unmatched, or unreachable.
 */
export async function fetchBackendAssistantContext(
  question: string
): Promise<BackendAssistantContext | null> {
  const trimmed = question.trim();
  if (!trimmed || !hasBackendSession()) return null;
  try {
    const res = await fastApi<{
      answer?: unknown;
      sources?: unknown;
      data?: unknown;
    }>('/assistant/chat', jsonPayload('POST', { question: trimmed }));
    const answer = typeof res?.answer === 'string' ? res.answer.trim() : '';
    if (!answer || answer.startsWith('I could not find that in the policy documents')) {
      return null;
    }
    const sources = Array.isArray(res?.sources)
      ? res.sources.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
    const liveDataCount = Array.isArray(res?.data) ? res.data.length : 0;
    const isLiveQueueAnswer =
      liveDataCount > 0 ||
      answer.includes('SLA-breach risk') ||
      answer.includes('at SLA risk') ||
      answer.includes('pending of');
    if (sources.length === 0 && !isLiveQueueAnswer) {
      return null;
    }
    return { answer, sources, liveDataCount };
  } catch {
    return null;
  }
}
