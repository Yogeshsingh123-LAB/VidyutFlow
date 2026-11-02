import type {
  ComplaintRecord,
  CriticalIncident,
  ElectricityConnection,
  FeederHealth,
  IncidentLifecycleEvent,
  UserRole,
  WorkOrder,
} from '../types';
import {
  filterIncidentsForSession,
  normalizeAndHealIncidentRouting,
} from '../utils/anomalyDetector';
import { parseDateSafe } from '../utils/dateUtils';
import type { OfflineFieldQueueItem } from '../utils/offlineFieldSync';
import {
  SIMULATED_FEEDER_POLYGONS,
  SUBDIVISION_DEMO_CENTROIDS,
  normalizeGeoPoint,
  sanitizeMapText,
  validateGeoJsonPolygon,
} from './geoValidation';
import type {
  EstimateConfidence,
  ManagementOutageSummary,
  OperationsTimelineEvent,
  OutageChange,
  OutageFilters,
  OutageLifecycleStatus,
  OutageMapDataSource,
  OutageMapRecord,
  OutageSeverity,
  TimelineEventType,
  TimelineVisibility,
  TransportConnectionState,
} from './types';

export interface OutageSessionActor {
  id?: string;
  name?: string;
  email?: string;
  subdivision?: string;
}

export interface CanonicalOutageDatasetSnapshot {
  role: UserRole;
  actor?: OutageSessionActor | null;
  incidents: readonly CriticalIncident[];
  complaints: readonly ComplaintRecord[];
  workOrders: readonly WorkOrder[];
  feeders?: readonly FeederHealth[];
  userConnections?: readonly ElectricityConnection[];
  userComplaints?: readonly ComplaintRecord[];
  offlineQueue?: readonly OfflineFieldQueueItem[];
  isBrowserOffline?: boolean;
}

const OUTAGE_RELEVANT_COMPLAINT_CATEGORIES = new Set<ComplaintRecord['category']>([
  'Power Outage',
  'Sparking / Hazardous Wire',
  'Voltage Fluctuation',
  'Streetlight Failure',
]);

const NON_OUTAGE_INCIDENT_MODULES = new Set<CriticalIncident['module']>([
  'Billing & Revenue',
  'Security & Access',
]);

const EVENT_STAGE_RANK: Record<TimelineEventType, number> = {
  COMPLAINT_SUBMITTED: 10,
  INCIDENT_CREATED: 20,
  INCIDENT_CLASSIFIED: 30,
  OUTAGE_CONFIRMED: 40,
  EMPLOYEE_ASSIGNMENT: 50,
  EMPLOYEE_ESCALATION: 55,
  ENGINEER_ACCEPTED_ASSIGNMENT: 60,
  ENGINEER_EN_ROUTE: 70,
  REPAIR_STARTED: 80,
  ENGINEER_UPDATE_RECEIVED: 90,
  OFFLINE_UPDATE_SYNCHRONIZED: 95,
  RESTORATION_REPORTED: 100,
  RESTORATION_CONFIRMED: 110,
  INCIDENT_CLOSED: 120,
  INCIDENT_REOPENED: 130,
};

function toSortableEpochMs(rawTimestamp: string): number {
  const parsed = parseDateSafe(rawTimestamp);
  if (parsed) return parsed.getTime();
  const direct = Date.parse(rawTimestamp);
  return Number.isFinite(direct) ? direct : 0;
}

export function mapIncidentToOutageStatus(
  inc: CriticalIncident,
  linkedWorkOrder?: WorkOrder,
): OutageLifecycleStatus {
  if (inc.status === 'CLOSED') return 'RESOLVED_CLOSED';
  if (inc.status === 'RESOLVED') return 'RESOLVED_CLOSED';
  if (inc.resolutionReportSubmittedAt) return 'RESTORATION_REPORTED';

  if (linkedWorkOrder) {
    if (linkedWorkOrder.status === 'Completed') return 'RESTORATION_REPORTED';
    if (linkedWorkOrder.status === 'On Site') return 'WORK_IN_PROGRESS';
    if (linkedWorkOrder.status === 'En Route') return 'ENGINEER_EN_ROUTE';
  }

  if (inc.status === 'IN_PROGRESS' || inc.assignmentStatus === 'IN_PROGRESS') {
    return 'WORK_IN_PROGRESS';
  }
  if (inc.assignmentStatus === 'ACCEPTED') {
    return 'ENGINEER_EN_ROUTE';
  }
  if (inc.status === 'ASSIGNED' || inc.assignmentStatus === 'ASSIGNED') {
    return 'ASSIGNED';
  }
  if (inc.status === 'ESCALATED') {
    return 'CONFIRMED_OUTAGE';
  }
  if (inc.status === 'ACKNOWLEDGED') {
    return 'UNDER_EMPLOYEE_REVIEW';
  }
  return 'REPORTED';
}

export function mapComplaintToOutageStatus(
  cmp: ComplaintRecord,
  linkedWorkOrder?: WorkOrder,
): OutageLifecycleStatus {
  if (cmp.status === 'Closed' || cmp.status === 'Resolved') {
    return 'RESOLVED_CLOSED';
  }
  if (linkedWorkOrder) {
    if (linkedWorkOrder.status === 'Completed') return 'RESTORATION_REPORTED';
    if (linkedWorkOrder.status === 'On Site') return 'WORK_IN_PROGRESS';
    if (linkedWorkOrder.status === 'En Route') return 'ENGINEER_EN_ROUTE';
  }
  if (cmp.status === 'In Progress') return 'WORK_IN_PROGRESS';
  if (cmp.status === 'Dispatched') return 'ASSIGNED';
  if (cmp.status === 'In Review') return 'UNDER_EMPLOYEE_REVIEW';
  return 'REPORTED';
}

function mapIncidentSeverity(sev: CriticalIncident['severity']): OutageSeverity {
  if (sev === 'CRITICAL') return 'CRITICAL';
  if (sev === 'WARNING') return 'HIGH';
  return 'MEDIUM';
}

function mapComplaintPriority(p: ComplaintRecord['priority']): OutageSeverity {
  if (p === 'Critical') return 'CRITICAL';
  if (p === 'High') return 'HIGH';
  if (p === 'Medium') return 'MEDIUM';
  return 'LOW';
}

function resolveSubdivisionCentroid(subdivision?: string): { latitude: number; longitude: number } | undefined {
  if (!subdivision) return SUBDIVISION_DEMO_CENTROIDS['Mehsana City North'];
  const exact = SUBDIVISION_DEMO_CENTROIDS[subdivision];
  if (exact) return { ...exact };
  const lower = subdivision.toLowerCase();
  for (const [key, pt] of Object.entries(SUBDIVISION_DEMO_CENTROIDS)) {
    if (lower.includes(key.toLowerCase().split(' ')[0])) {
      return { ...pt };
    }
  }
  return SUBDIVISION_DEMO_CENTROIDS['Mehsana City North'];
}

function resolveFeederPolygon(feederName?: string) {
  if (!feederName) return undefined;
  const candidate = SIMULATED_FEEDER_POLYGONS[feederName];
  if (!candidate) return undefined;
  const validGeom = validateGeoJsonPolygon(candidate.geometry);
  if (!validGeom) return undefined;
  return {
    geometry: validGeom,
    isSimulated: true,
    labelKey: candidate.labelKey,
  };
}

function deriveCredibleEtr(
  status: OutageLifecycleStatus,
  slaDueTime?: string,
): { estimatedRestorationAt?: string; estimateConfidence?: EstimateConfidence } {
  if (
    status === 'REPORTED' ||
    status === 'UNDER_EMPLOYEE_REVIEW' ||
    status === 'RESOLVED_CLOSED' ||
    status === 'CANCELLED_FALSE_ALARM'
  ) {
    return {};
  }
  if (!slaDueTime) return {};
  const confidence: EstimateConfidence =
    status === 'WORK_IN_PROGRESS' || status === 'RESTORATION_REPORTED'
      ? 'confirmed'
      : 'provisional';
  return {
    estimatedRestorationAt: sanitizeMapText(slaDueTime, 64),
    estimateConfidence: confidence,
  };
}

/**
 * Redacts operational fields when returning an OutageMapRecord to a `consumer` session,
 * and strips raw citizen PII for all roles (Sections C2, C6, E).
 */
export function scopeRecordForRole(
  rawRecord: OutageMapRecord,
  role: UserRole,
): OutageMapRecord {
  if (role === 'consumer') {
    return {
      id: rawRecord.id,
      incidentId: rawRecord.incidentId,
      complaintId: rawRecord.isConsumerOwnReport ? rawRecord.complaintId : undefined,
      feederId: rawRecord.feederId,
      feederName: rawRecord.feederName,
      subdivisionId: rawRecord.subdivisionId,
      affectedAreaLabel: rawRecord.affectedAreaLabel,
      publicTitle: rawRecord.publicTitle,
      // Strict privacy rule: NEVER expose exact operational/residential `location`,
      // `internalTitle`, `severity`, `assignedTeam`, or `assignedEngineerId` to consumers.
      location: undefined,
      publicLocation: rawRecord.publicLocation ? { ...rawRecord.publicLocation } : undefined,
      impactAreaGeoJSON: rawRecord.impactAreaGeoJSON,
      status: rawRecord.status,
      isConfirmedOutage: rawRecord.isConfirmedOutage,
      severity: undefined,
      reportedAt: rawRecord.reportedAt,
      updatedAt: rawRecord.updatedAt,
      estimatedRestorationAt: rawRecord.estimatedRestorationAt,
      estimateConfidence: rawRecord.estimateConfidence,
      assignedTeam: undefined,
      assignedEngineerId: undefined,
      isConsumerOwnReport: rawRecord.isConsumerOwnReport,
      source: rawRecord.source,
      sourceLabel: rawRecord.sourceLabel,
      freshnessLabel: rawRecord.freshnessLabel,
      isSimulated: rawRecord.isSimulated,
      versionSeq: rawRecord.versionSeq,
    };
  }

  return {
    ...rawRecord,
    location: rawRecord.location ? { ...rawRecord.location } : undefined,
    publicLocation: rawRecord.publicLocation ? { ...rawRecord.publicLocation } : undefined,
  };
}

/**
 * Rejects stale outage updates whose `versionSeq` (or timestamp when versionSeq matches)
 * is older than the already-known record (Section M.10).
 */
export function acceptNewerOutageRecord(
  current: OutageMapRecord | undefined,
  incoming: OutageMapRecord,
): OutageMapRecord {
  if (!current) return incoming;
  if (incoming.versionSeq < current.versionSeq) {
    return current;
  }
  if (
    incoming.versionSeq === current.versionSeq &&
    toSortableEpochMs(incoming.updatedAt) < toSortableEpochMs(current.updatedAt)
  ) {
    return current;
  }
  return incoming;
}

/**
 * Builds role-authorized `OutageMapRecord[]` from VidyutFlow's canonical incidents,
 * complaints, and work orders without mutating any input array.
 */
export function buildAuthorizedOutageRecords(
  snapshot: CanonicalOutageDatasetSnapshot,
): OutageMapRecord[] {
  const {
    role,
    actor,
    incidents,
    complaints,
    workOrders,
    feeders = [],
    userConnections = [],
    userComplaints = [],
  } = snapshot;

  const feederById = new Map(feeders.map((f) => [f.id, f]));
  const feederByName = new Map(feeders.map((f) => [f.name, f]));
  const workOrderByComplaint = new Map<string, WorkOrder>();
  const workOrderById = new Map<string, WorkOrder>();

  for (const wo of workOrders) {
    workOrderById.set(wo.id, wo);
    if (wo.complaintId) {
      workOrderByComplaint.set(wo.complaintId, wo);
    }
    const cmpMatch = wo.title.match(/\(CMP-[A-Z0-9-]+\)/i);
    if (cmpMatch) {
      const extracted = cmpMatch[0].slice(1, -1);
      if (!workOrderByComplaint.has(extracted)) {
        workOrderByComplaint.set(extracted, wo);
      }
    }
  }

  const recordMap = new Map<string, OutageMapRecord>();
  const coveredComplaintIds = new Set<string>();

  // 1. Operational roles consume canonical incidents filtered strictly through
  //    existing `normalizeAndHealIncidentRouting` + `filterIncidentsForSession`
  //    (enforcing Employee-first critical rules and safe defaults on partial records).
  if (role !== 'consumer') {
    const normalizedIncidents = incidents.map((inc) =>
      normalizeAndHealIncidentRouting({
        ...inc,
        responsibleRoles: inc.responsibleRoles || ['employee'],
      }),
    );
    const authorizedIncidents = filterIncidentsForSession(
      normalizedIncidents,
      role,
      actor
        ? {
            id: actor.id,
            name: actor.name,
            subdivision: actor.subdivision,
          }
        : undefined,
    );

    for (const inc of authorizedIncidents) {
      if (NON_OUTAGE_INCIDENT_MODULES.has(inc.module)) continue;

      const linkedComplaintId =
        inc.entityType === 'complaint'
          ? inc.entityId
          : inc.id.startsWith('INC-CMP-')
          ? inc.id.replace(/^INC-/, '')
          : undefined;
      if (linkedComplaintId) coveredComplaintIds.add(linkedComplaintId);

      const linkedWo =
        inc.entityType === 'work_order'
          ? workOrderById.get(inc.entityId)
          : linkedComplaintId
          ? workOrderByComplaint.get(linkedComplaintId)
          : undefined;

      const linkedFeeder =
        inc.entityType === 'feeder' ? feederById.get(inc.entityId) : undefined;
      const feederName = linkedFeeder?.name || linkedWo?.feederName;
      const subdivision =
        inc.subdivision || linkedFeeder?.subdivision || linkedWo?.subdivision || 'Mehsana City North';

      const status = mapIncidentToOutageStatus(inc, linkedWo);
      const isConfirmed =
        status !== 'REPORTED' &&
        status !== 'UNDER_EMPLOYEE_REVIEW' &&
        status !== 'CANCELLED_FALSE_ALARM';

      const publicPt = resolveSubdivisionCentroid(subdivision);
      const exactPt = linkedWo?.gpsCoordinates
        ? normalizeGeoPoint(linkedWo.gpsCoordinates.lat, linkedWo.gpsCoordinates.lng)
        : publicPt;

      const lastHistoryTs =
        inc.history && inc.history.length > 0
          ? inc.history[inc.history.length - 1].timestamp
          : inc.timestamp;

      const outId = `OUT-${inc.id}`;
      const candidate: OutageMapRecord = {
        id: outId,
        incidentId: inc.id,
        complaintId: linkedComplaintId,
        workOrderId: linkedWo?.id,
        feederId: linkedFeeder?.id,
        feederName,
        subdivisionId: subdivision,
        affectedAreaLabel: sanitizeMapText(
          feederName ? `${subdivision} · ${feederName}` : subdivision,
          120,
        ),
        publicTitle: sanitizeMapText(
          isConfirmed
            ? `Power Service Disruption — ${subdivision}`
            : `Reported Supply Issue — ${subdivision}`,
          120,
        ),
        internalTitle: sanitizeMapText(inc.title, 160),
        location: exactPt,
        publicLocation: publicPt,
        impactAreaGeoJSON: resolveFeederPolygon(feederName),
        status,
        isConfirmedOutage: isConfirmed,
        severity: mapIncidentSeverity(inc.severity),
        reportedAt: inc.timestamp,
        updatedAt: inc.resolvedAt || lastHistoryTs || inc.timestamp,
        ...deriveCredibleEtr(status),
        assignedTeam: sanitizeMapText(inc.assignedEngineerName || linkedWo?.assignedTo || '', 96) || undefined,
        assignedEngineerId: inc.assignedToUserId,
        source: 'demo',
        sourceLabel: 'DEMO Canonical Incident Adapter (Simulated)',
        freshnessLabel: snapshot.isBrowserOffline ? 'Cached Offline Snapshot' : 'Reactive Local State',
        isSimulated: true,
        versionSeq: Math.max(1, inc.history?.length || 1),
      };

      recordMap.set(
        outId,
        acceptNewerOutageRecord(recordMap.get(outId), scopeRecordForRole(candidate, role)),
      );
    }
  }

  // 2. Map outage-related complaints according to role visibility:
  //    - Consumer: own outage complaints + confirmed area outages in consumer's linked subdivisions/feeders
  //    - Employee: subdivision-scoped complaints
  //    - Field: ONLY complaints linked to work orders assigned to this field engineer
  //    - Admin: all outage complaints (with consumer personal address/phone stripped)
  //    - Management: ONLY complaints that have been escalated via authorized incidents above
  const consumerSubdivisions = new Set(
    userConnections.map((c) => c.subdivision.toLowerCase()),
  );
  const consumerFeeders = new Set(
    userConnections.map((c) => c.feederName.toLowerCase()),
  );
  const ownComplaintIds = new Set(userComplaints.map((c) => c.id));

  for (const cmp of complaints) {
    if (!OUTAGE_RELEVANT_COMPLAINT_CATEGORIES.has(cmp.category)) continue;
    if (coveredComplaintIds.has(cmp.id)) continue;

    const linkedWo =
      (cmp.assignedWorkOrderId ? workOrderById.get(cmp.assignedWorkOrderId) : undefined) ||
      workOrderByComplaint.get(cmp.id);

    const isOwnReport = ownComplaintIds.has(cmp.id);
    const status = mapComplaintToOutageStatus(cmp, linkedWo);
    const isConfirmed =
      status !== 'REPORTED' &&
      status !== 'UNDER_EMPLOYEE_REVIEW' &&
      status !== 'CANCELLED_FALSE_ALARM';

    if (role === 'management') {
      // Management sees aggregate summaries + escalated incidents only (Section E)
      continue;
    }

    if (role === 'field') {
      // Field engineers only see work orders/complaints explicitly assigned to them
      const assignedTarget = (linkedWo?.assignedTo || cmp.assignedTechnician || '').toLowerCase();
      const actorName = (actor?.name || '').trim().toLowerCase();
      if (!actorName || !assignedTarget.includes(actorName.split(' ')[0])) {
        continue;
      }
    }

    if (role === 'employee' && actor?.subdivision) {
      const empSub = actor.subdivision.toLowerCase();
      if (
        empSub !== 'all' &&
        empSub !== 'central office' &&
        empSub !== 'mehsana corporate circle' &&
        !cmp.subdivision.toLowerCase().includes(empSub) &&
        !empSub.includes(cmp.subdivision.toLowerCase())
      ) {
        continue;
      }
    }

    if (role === 'consumer') {
      const inConsumerArea =
        consumerSubdivisions.has(cmp.subdivision.toLowerCase()) ||
        consumerFeeders.has(cmp.feederName.toLowerCase());
      if (!isOwnReport && (!inConsumerArea || !isConfirmed)) {
        continue;
      }
    }

    const feederMeta = feederByName.get(cmp.feederName);
    const publicPt = resolveSubdivisionCentroid(cmp.subdivision);
    const operationalPt = linkedWo?.gpsCoordinates
      ? normalizeGeoPoint(linkedWo.gpsCoordinates.lat, linkedWo.gpsCoordinates.lng)
      : publicPt;

    const lastTl =
      cmp.timeline && cmp.timeline.length > 0
        ? cmp.timeline[cmp.timeline.length - 1].time
        : cmp.filedAt;

    const outId = `OUT-${cmp.id}`;
    const candidate: OutageMapRecord = {
      id: outId,
      incidentId: `INC-${cmp.id}`,
      complaintId: cmp.id,
      workOrderId: linkedWo?.id,
      feederId: feederMeta?.id,
      feederName: cmp.feederName,
      subdivisionId: cmp.subdivision,
      // Never include cmp.consumerName, cmp.phone, or exact residential street address!
      affectedAreaLabel: sanitizeMapText(`${cmp.subdivision} · ${cmp.feederName}`, 120),
      publicTitle: sanitizeMapText(
        isConfirmed
          ? `Confirmed Area Outage — ${cmp.subdivision}`
          : `Outage Report Under Review — ${cmp.subdivision}`,
        120,
      ),
      internalTitle: sanitizeMapText(`${cmp.category} (${cmp.id}) — ${cmp.feederName}`, 160),
      location: operationalPt,
      publicLocation: publicPt,
      impactAreaGeoJSON: resolveFeederPolygon(cmp.feederName),
      status,
      isConfirmedOutage: isConfirmed,
      severity: mapComplaintPriority(cmp.priority),
      reportedAt: cmp.filedAt,
      updatedAt: cmp.resolvedAt || lastTl || cmp.filedAt,
      ...deriveCredibleEtr(status, cmp.slaDueTime),
      assignedTeam: sanitizeMapText(linkedWo?.assignedTo || cmp.assignedTechnician || '', 96) || undefined,
      isConsumerOwnReport: isOwnReport,
      source: 'demo',
      sourceLabel: 'DEMO Complaint & Work-Order Adapter (Simulated)',
      freshnessLabel: snapshot.isBrowserOffline ? 'Cached Offline Snapshot' : 'Reactive Local State',
      isSimulated: true,
      versionSeq: Math.max(1, cmp.timeline?.length || 1),
    };

    recordMap.set(
      outId,
      acceptNewerOutageRecord(recordMap.get(outId), scopeRecordForRole(candidate, role)),
    );
  }

  return Array.from(recordMap.values());
}

/**
 * Non-destructive filter & search selector over `OutageMapRecord[]`.
 * Never mutates input records or arrays.
 */
export function applyOutageFilters(
  records: readonly OutageMapRecord[],
  filters?: OutageFilters,
): OutageMapRecord[] {
  if (!filters) return [...records];

  const q = (filters.searchQuery || '').trim().toLowerCase();
  const fromMs = filters.dateFromIso ? toSortableEpochMs(filters.dateFromIso) : null;
  const toMs = filters.dateToIso ? toSortableEpochMs(filters.dateToIso) : null;

  return records.filter((rec) => {
    if (filters.scopeMode === 'ACTIVE_ONLY') {
      if (rec.status === 'RESOLVED_CLOSED' || rec.status === 'CANCELLED_FALSE_ALARM') {
        return false;
      }
    } else if (filters.scopeMode === 'RESOLVED_ONLY') {
      if (rec.status !== 'RESOLVED_CLOSED' && rec.status !== 'CANCELLED_FALSE_ALARM') {
        return false;
      }
    }

    if (filters.status && filters.status !== 'ALL' && rec.status !== filters.status) {
      return false;
    }
    if (filters.severity && filters.severity !== 'ALL' && rec.severity !== filters.severity) {
      return false;
    }
    if (
      filters.subdivision &&
      filters.subdivision !== 'ALL' &&
      rec.subdivisionId !== filters.subdivision
    ) {
      return false;
    }
    if (
      filters.feeder &&
      filters.feeder !== 'ALL' &&
      rec.feederName !== filters.feeder &&
      rec.feederId !== filters.feeder
    ) {
      return false;
    }
    if (
      filters.assignedTeam &&
      filters.assignedTeam !== 'ALL' &&
      rec.assignedTeam !== filters.assignedTeam
    ) {
      return false;
    }

    if (fromMs !== null && fromMs > 0) {
      const repMs = toSortableEpochMs(rec.reportedAt);
      if (repMs > 0 && repMs < fromMs) return false;
    }
    if (toMs !== null && toMs > 0) {
      const repMs = toSortableEpochMs(rec.reportedAt);
      if (repMs > 0 && repMs > toMs) return false;
    }

    if (q) {
      const haystacks = [
        rec.id,
        rec.incidentId,
        rec.complaintId || '',
        rec.workOrderId || '',
        rec.feederId || '',
        rec.feederName || '',
        rec.subdivisionId || '',
        rec.affectedAreaLabel,
        rec.publicTitle,
        rec.internalTitle || '',
      ];
      const matched = haystacks.some((h) => h.toLowerCase().includes(q));
      if (!matched) return false;
    }

    return true;
  });
}

function mapIncidentStageToEventType(ev: IncidentLifecycleEvent): TimelineEventType {
  const stage = ev.eventType || ev.stage;
  switch (stage) {
    case 'DETECTED':
      return 'INCIDENT_CREATED';
    case 'ACKNOWLEDGED':
      return 'INCIDENT_CLASSIFIED';
    case 'ASSIGNED':
    case 'REASSIGNED':
      return 'EMPLOYEE_ASSIGNMENT';
    case 'ESCALATED':
      return 'EMPLOYEE_ESCALATION';
    case 'ASSIGNMENT_ACCEPTED':
      return 'ENGINEER_ACCEPTED_ASSIGNMENT';
    case 'INSPECTION_STARTED':
    case 'IN_PROGRESS':
      return 'REPAIR_STARTED';
    case 'FINDINGS_SUBMITTED':
    case 'ASSISTANCE_REQUESTED':
      return 'ENGINEER_UPDATE_RECEIVED';
    case 'RESOLUTION_SUBMITTED':
      return 'RESTORATION_REPORTED';
    case 'APPROVED':
      return 'RESTORATION_CONFIRMED';
    case 'RESOLVED':
    case 'CLOSED':
      return 'INCIDENT_CLOSED';
    default:
      return 'OUTAGE_CONFIRMED';
  }
}

function mapComplaintStageToEventType(stage: string): TimelineEventType {
  const s = stage.toLowerCase();
  if (s.includes('register')) return 'COMPLAINT_SUBMITTED';
  if (s.includes('review')) return 'INCIDENT_CLASSIFIED';
  if (s.includes('dispatch')) return 'EMPLOYEE_ASSIGNMENT';
  if (s.includes('progress')) return 'REPAIR_STARTED';
  if (s.includes('resolv') || s.includes('close')) return 'INCIDENT_CLOSED';
  return 'OUTAGE_CONFIRMED';
}

function isPublicSafeEventType(type: TimelineEventType): boolean {
  return (
    type === 'COMPLAINT_SUBMITTED' ||
    type === 'OUTAGE_CONFIRMED' ||
    type === 'ENGINEER_EN_ROUTE' ||
    type === 'REPAIR_STARTED' ||
    type === 'RESTORATION_REPORTED' ||
    type === 'RESTORATION_CONFIRMED' ||
    type === 'INCIDENT_CLOSED'
  );
}

/**
 * Deduplicates by `correlationId` / `id`, rejects stale lower-version duplicates,
 * and orders events chronologically by `occurredAt` with deterministic secondary
 * ordering (`EVENT_STAGE_RANK` + lexicographic `id`).
 */
export function reconcileAndOrderTimelineEvents(
  rawEvents: readonly OperationsTimelineEvent[],
): OperationsTimelineEvent[] {
  const byCorrelation = new Map<string, OperationsTimelineEvent>();

  for (const ev of rawEvents) {
    const key = ev.correlationId || ev.id;
    const prev = byCorrelation.get(key);
    if (!prev) {
      byCorrelation.set(key, { ...ev });
      continue;
    }
    const prevVer = prev.versionSeq ?? 1;
    const nextVer = ev.versionSeq ?? 1;
    if (nextVer > prevVer || (!prev.receivedAt && ev.receivedAt)) {
      byCorrelation.set(key, { ...ev });
    }
  }

  return Array.from(byCorrelation.values()).sort((a, b) => {
    const tA = toSortableEpochMs(a.occurredAt);
    const tB = toSortableEpochMs(b.occurredAt);
    if (tA !== tB) return tA - tB;

    const rA = EVENT_STAGE_RANK[a.type] ?? 50;
    const rB = EVENT_STAGE_RANK[b.type] ?? 50;
    if (rA !== rB) return rA - rB;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Builds role-authorized `OperationsTimelineEvent[]` strictly from real DEMO records
 * and synchronized offline field queue entries (never fabricates fake animation events).
 */
export function buildAuthorizedTimelineEvents(
  snapshot: CanonicalOutageDatasetSnapshot,
  visibleOutages: readonly OutageMapRecord[],
  filterOutageOrIncidentId?: string,
): OperationsTimelineEvent[] {
  const { role, incidents, complaints, offlineQueue = [] } = snapshot;
  const visibleByIncident = new Map<string, OutageMapRecord>();
  const visibleByComplaint = new Map<string, OutageMapRecord>();
  const visibleById = new Map<string, OutageMapRecord>();

  for (const rec of visibleOutages) {
    visibleById.set(rec.id, rec);
    visibleByIncident.set(rec.incidentId, rec);
    if (rec.complaintId) {
      visibleByComplaint.set(rec.complaintId, rec);
    }
  }

  const matchesTarget = (rec: OutageMapRecord): boolean => {
    if (!filterOutageOrIncidentId) return true;
    return (
      rec.id === filterOutageOrIncidentId ||
      rec.incidentId === filterOutageOrIncidentId ||
      rec.complaintId === filterOutageOrIncidentId
    );
  };

  const rawEvents: OperationsTimelineEvent[] = [];

  // 1. Canonical incident history events (only for incidents already visible to this role)
  if (role !== 'consumer') {
    for (const inc of incidents) {
      const parent = visibleByIncident.get(inc.id);
      if (!parent || !matchesTarget(parent)) continue;

      inc.history.forEach((h, idx) => {
        const type = mapIncidentStageToEventType(h);
        const visibility: TimelineVisibility = isPublicSafeEventType(type) ? 'public' : 'employee';
        const correlationId = h.id || `inc-ev-${inc.id}-${type}-${h.timestamp}-${idx}`;
        rawEvents.push({
          id: correlationId,
          incidentId: inc.id,
          outageId: parent.id,
          workOrderId: parent.workOrderId,
          complaintId: parent.complaintId,
          type,
          occurredAt: h.timestamp,
          actorRole: h.actorRole || 'employee',
          actorDisplayName: sanitizeMapText(h.actor || 'UGVCL Control Desk', 80),
          visibility,
          sourceSystem: 'DEMO_LOCAL_STATE',
          correlationId,
          descriptionKey: type,
          descriptionParams: {
            ref: inc.id,
            area: parent.affectedAreaLabel,
            team: parent.assignedTeam || h.newEngineerName || 'Field Squad',
          },
          note: sanitizeMapText(h.notes || h.remarks || h.reason || '', 220) || undefined,
          versionSeq: idx + 1,
        });
      });
    }
  }

  // 2. Canonical complaint timeline events (scoped & privacy-redacted for consumers)
  for (const cmp of complaints) {
    const parent = visibleByComplaint.get(cmp.id);
    if (!parent || !matchesTarget(parent)) continue;

    cmp.timeline.forEach((entry, idx) => {
      const type = mapComplaintStageToEventType(entry.stage);
      const isPublic = isPublicSafeEventType(type);
      if (role === 'consumer' && !isPublic && !parent.isConsumerOwnReport) {
        return;
      }
      const correlationId = `cmp-ev-${cmp.id}-${type}-${entry.time}`;
      rawEvents.push({
        id: correlationId,
        incidentId: parent.incidentId,
        outageId: parent.id,
        workOrderId: parent.workOrderId,
        complaintId: cmp.id,
        type,
        occurredAt: entry.time,
        actorRole: role === 'consumer' ? 'system' : 'employee',
        // Redact internal employee/engineer personal names on public consumer view
        actorDisplayName:
          role === 'consumer'
            ? 'UGVCL Service Desk'
            : sanitizeMapText(entry.actor, 80),
        visibility: isPublic ? 'public' : 'employee',
        sourceSystem: 'DEMO_LOCAL_STATE',
        correlationId,
        descriptionKey: type,
        descriptionParams: {
          ref: cmp.id,
          area: parent.affectedAreaLabel,
          team: role === 'consumer' ? 'Field Team' : parent.assignedTeam || 'Field Squad',
        },
        note:
          role === 'consumer'
            ? undefined
            : sanitizeMapText(entry.remark, 220) || undefined,
        versionSeq: idx + 1,
      });
    });
  }

  // 3. Offline field engineer queue updates (retaining original offline `occurredAt`
  //    separately from `receivedAt` synchronization timestamp, deduplicated by `client_uuid`)
  if (role === 'field' || role === 'employee' || role === 'admin') {
    for (const item of offlineQueue) {
      const parent =
        visibleById.get(`OUT-${item.request_id}`) ||
        visibleByIncident.get(item.request_id) ||
        visibleByComplaint.get(item.request_id) ||
        visibleOutages.find((v) => v.workOrderId === item.request_id) ||
        visibleOutages[0];
      if (!parent || !matchesTarget(parent)) continue;

      const isSynced = item.sync_state === 'SYNCED' || item.sync_state === 'DUPLICATE';
      const type: TimelineEventType = isSynced
        ? 'OFFLINE_UPDATE_SYNCHRONIZED'
        : item.task_status === 'COMPLETED'
        ? 'RESTORATION_REPORTED'
        : 'ENGINEER_UPDATE_RECEIVED';

      rawEvents.push({
        id: `offline-${item.client_uuid}`,
        incidentId: parent.incidentId,
        outageId: parent.id,
        workOrderId: parent.workOrderId,
        type,
        occurredAt: item.created_offline_at,
        receivedAt: isSynced
          ? item.synced_at || item.last_attempt_at || item.created_offline_at
          : undefined,
        actorRole: 'field',
        actorDisplayName: 'Field Engineer (Offline Queue)',
        visibility: 'field',
        sourceSystem: 'OFFLINE_FIELD_QUEUE',
        correlationId: item.client_uuid,
        descriptionKey: type,
        descriptionParams: {
          ref: parent.incidentId,
          area: parent.affectedAreaLabel,
        },
        note: sanitizeMapText(item.notes || `Outcome: ${item.task_status}`, 180),
        versionSeq: isSynced ? 2 : 1,
      });
    }
  }

  return reconcileAndOrderTimelineEvents(rawEvents);
}

/**
 * Computes authorized aggregate metrics for Management / Admin views without
 * exposing un-escalated critical incident dossiers (Section E).
 */
export function computeManagementOutageSummary(
  snapshot: CanonicalOutageDatasetSnapshot,
): ManagementOutageSummary | null {
  if (snapshot.role !== 'management' && snapshot.role !== 'admin') {
    return null;
  }

  const adminViewSnapshot: CanonicalOutageDatasetSnapshot = {
    ...snapshot,
    role: 'admin',
  };
  const allAuthorized = buildAuthorizedOutageRecords(adminViewSnapshot);
  const bySubdivision: Record<string, number> = {};
  let activeOutages = 0;
  let resolvedOutages = 0;
  let confirmedOutages = 0;

  for (const r of allAuthorized) {
    const sub = r.subdivisionId || 'Unspecified';
    bySubdivision[sub] = (bySubdivision[sub] || 0) + 1;
    if (r.status === 'RESOLVED_CLOSED' || r.status === 'CANCELLED_FALSE_ALARM') {
      resolvedOutages += 1;
    } else {
      activeOutages += 1;
    }
    if (r.isConfirmedOutage) {
      confirmedOutages += 1;
    }
  }

  const escalatedCount = snapshot.incidents.filter(
    (i) => i.status === 'ESCALATED' || i.escalatedTo === 'management',
  ).length;

  return {
    totalVisibleOutages: allAuthorized.length,
    activeOutages,
    resolvedOutages,
    escalatedCount,
    confirmedOutages,
    bySubdivision,
  };
}

/**
 * Reactive DEMO data source backed by existing canonical VidyutFlow state.
 * Cleanly tracks and removes listeners on `unsubscribe()`.
 */
export class DemoOutageMapAdapter implements OutageMapDataSource {
  private readonly listeners = new Set<(change: OutageChange) => void>();
  private readonly getSnapshot: () => CanonicalOutageDatasetSnapshot;

  constructor(getSnapshot: () => CanonicalOutageDatasetSnapshot) {
    this.getSnapshot = getSnapshot;
  }

  get transportState(): TransportConnectionState {
    const snap = this.getSnapshot();
    return snap.isBrowserOffline ? 'OFFLINE' : 'DEMO_SIMULATED';
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }

  notifyChange(change: OutageChange): void {
    for (const listener of Array.from(this.listeners)) {
      listener(change);
    }
  }

  async listVisibleOutages(filters?: OutageFilters): Promise<OutageMapRecord[]> {
    const records = buildAuthorizedOutageRecords(this.getSnapshot());
    return applyOutageFilters(records, filters);
  }

  async getVisibleOutage(id: string): Promise<OutageMapRecord | null> {
    const records = buildAuthorizedOutageRecords(this.getSnapshot());
    return (
      records.find(
        (r) => r.id === id || r.incidentId === id || r.complaintId === id,
      ) || null
    );
  }

  async listVisibleEvents(incidentIdOrOutageId?: string): Promise<OperationsTimelineEvent[]> {
    const snap = this.getSnapshot();
    const visible = buildAuthorizedOutageRecords(snap);
    return buildAuthorizedTimelineEvents(snap, visible, incidentIdOrOutageId);
  }

  async getManagementSummary(): Promise<ManagementOutageSummary | null> {
    return computeManagementOutageSummary(this.getSnapshot());
  }

  subscribeToChanges(callback: (change: OutageChange) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

/**
 * Typed Backend Outage Map Adapter Contract (ready for `/api/v1/outages/*` endpoints).
 * Supports `AbortController` cancellation of stale requests and clean SSE teardown.
 */
export class BackendOutageMapAdapter implements OutageMapDataSource {
  private state: TransportConnectionState = 'RECONNECTING';
  private readonly baseUrl: string;
  private readonly listeners = new Set<(change: OutageChange) => void>();
  private activeAbortController: AbortController | null = null;
  private eventSource: EventSource | null = null;

  constructor(baseUrl = '/api/v1/outages') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  get transportState(): TransportConnectionState {
    return this.state;
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }

  async listVisibleOutages(filters?: OutageFilters): Promise<OutageMapRecord[]> {
    this.activeAbortController?.abort();
    const controller = new AbortController();
    this.activeAbortController = controller;

    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.severity && filters.severity !== 'ALL') params.set('severity', filters.severity);
    if (filters?.subdivision && filters.subdivision !== 'ALL') {
      params.set('subdivision', filters.subdivision);
    }
    if (filters?.feeder && filters.feeder !== 'ALL') params.set('feeder', filters.feeder);
    if (filters?.searchQuery) params.set('q', filters.searchQuery);

    const qs = params.toString();
    const res = await fetch(`${this.baseUrl}${qs ? `?${qs}` : ''}`, {
      credentials: 'include',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Outage API HTTP ${res.status}`);
    }
    this.state = 'LIVE_CONNECTED';
    return (await res.json()) as OutageMapRecord[];
  }

  async getVisibleOutage(id: string): Promise<OutageMapRecord | null> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      credentials: 'include',
    });
    if (res.status === 404 || res.status === 403) return null;
    if (!res.ok) throw new Error(`Outage detail HTTP ${res.status}`);
    this.state = 'LIVE_CONNECTED';
    return (await res.json()) as OutageMapRecord;
  }

  async listVisibleEvents(incidentIdOrOutageId?: string): Promise<OperationsTimelineEvent[]> {
    const path = incidentIdOrOutageId
      ? `${this.baseUrl}/${encodeURIComponent(incidentIdOrOutageId)}/events`
      : `${this.baseUrl}/events`;
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) throw new Error(`Outage events HTTP ${res.status}`);
    this.state = 'LIVE_CONNECTED';
    const raw = (await res.json()) as OperationsTimelineEvent[];
    return reconcileAndOrderTimelineEvents(raw);
  }

  async getManagementSummary(): Promise<ManagementOutageSummary | null> {
    const res = await fetch(`${this.baseUrl}/summary`, { credentials: 'include' });
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) throw new Error(`Outage summary HTTP ${res.status}`);
    return (await res.json()) as ManagementOutageSummary;
  }

  subscribeToChanges(callback: (change: OutageChange) => void): () => void {
    this.listeners.add(callback);

    if (typeof EventSource !== 'undefined' && !this.eventSource) {
      try {
        const es = new EventSource(`${this.baseUrl}/stream`, { withCredentials: true });
        this.eventSource = es;
        es.onopen = () => {
          this.state = 'LIVE_CONNECTED';
          this.emit({ reason: 'TRANSPORT_STATUS', timestamp: new Date().toISOString() });
        };
        es.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(msg.data) as Partial<OutageChange>;
            this.emit({
              reason: parsed.reason || 'STATE_UPDATED',
              timestamp: parsed.timestamp || new Date().toISOString(),
              incidentId: parsed.incidentId,
            });
          } catch {
            this.emit({ reason: 'STATE_UPDATED', timestamp: new Date().toISOString() });
          }
        };
        es.onerror = () => {
          this.state = 'RECONNECTING';
          this.emit({ reason: 'TRANSPORT_STATUS', timestamp: new Date().toISOString() });
        };
      } catch {
        this.state = 'OFFLINE';
      }
    }

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.listeners.size === 0 && this.activeAbortController) {
        this.activeAbortController.abort();
        this.activeAbortController = null;
      }
    };
  }

  private emit(change: OutageChange): void {
    for (const listener of Array.from(this.listeners)) {
      listener(change);
    }
  }
}
