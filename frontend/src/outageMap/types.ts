import type { UserRole } from '../types';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type OutageLifecycleStatus =
  | 'REPORTED'
  | 'UNDER_EMPLOYEE_REVIEW'
  | 'CONFIRMED_OUTAGE'
  | 'ASSIGNED'
  | 'ENGINEER_EN_ROUTE'
  | 'WORK_IN_PROGRESS'
  | 'RESTORATION_REPORTED'
  | 'RESOLVED_CLOSED'
  | 'CANCELLED_FALSE_ALARM';

export type OutageSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EstimateConfidence = 'confirmed' | 'provisional';

export type OutageDataSourceKind = 'demo' | 'backend';

export type TransportConnectionState =
  | 'DEMO_SIMULATED'
  | 'LIVE_CONNECTED'
  | 'RECONNECTING'
  | 'OFFLINE';

export type TimelineVisibility = 'public' | 'employee' | 'field' | 'management' | 'admin';

export type TimelineEventType =
  | 'COMPLAINT_SUBMITTED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_CLASSIFIED'
  | 'OUTAGE_CONFIRMED'
  | 'EMPLOYEE_ASSIGNMENT'
  | 'EMPLOYEE_ESCALATION'
  | 'ENGINEER_ACCEPTED_ASSIGNMENT'
  | 'ENGINEER_EN_ROUTE'
  | 'REPAIR_STARTED'
  | 'ENGINEER_UPDATE_RECEIVED'
  | 'OFFLINE_UPDATE_SYNCHRONIZED'
  | 'RESTORATION_REPORTED'
  | 'RESTORATION_CONFIRMED'
  | 'INCIDENT_CLOSED'
  | 'INCIDENT_REOPENED';

export interface GeoJsonPolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ValidatedServicePolygon {
  geometry: GeoJsonPolygonGeometry;
  isSimulated: boolean;
  labelKey: string;
}

export interface OutageMapRecord {
  id: string;
  incidentId: string;
  complaintId?: string;
  workOrderId?: string;
  feederId?: string;
  feederName?: string;
  subdivisionId?: string;
  affectedAreaLabel: string;
  publicTitle: string;
  internalTitle?: string;
  /** Exact operational coordinate — ONLY populated for authorized operational roles; NEVER exposed to consumer/public views. */
  location?: GeoPoint;
  /** Coarse feeder/subdivision DEMO centroid safe for public display (never an exact residential coordinate). */
  publicLocation?: GeoPoint;
  impactAreaGeoJSON?: ValidatedServicePolygon;
  status: OutageLifecycleStatus;
  isConfirmedOutage: boolean;
  /** Populated only for authorized operational roles. */
  severity?: OutageSeverity;
  reportedAt: string;
  updatedAt: string;
  estimatedRestorationAt?: string;
  estimateConfidence?: EstimateConfidence;
  /** Populated only for authorized operational roles. */
  assignedTeam?: string;
  assignedEngineerId?: string;
  isConsumerOwnReport?: boolean;
  source: OutageDataSourceKind;
  sourceLabel: string;
  freshnessLabel: string;
  isSimulated: boolean;
  versionSeq: number;
}

export interface OperationsTimelineEvent {
  id: string;
  incidentId: string;
  outageId: string;
  workOrderId?: string;
  complaintId?: string;
  type: TimelineEventType;
  occurredAt: string;
  /** Populated when an offline engineer action is synchronized later so both timestamps remain distinct. */
  receivedAt?: string;
  actorRole?: UserRole | 'system';
  actorDisplayName: string;
  visibility: TimelineVisibility;
  previousStatus?: OutageLifecycleStatus;
  nextStatus?: OutageLifecycleStatus;
  sourceSystem: 'DEMO_LOCAL_STATE' | 'OFFLINE_FIELD_QUEUE' | 'BACKEND_API';
  correlationId: string;
  descriptionKey: TimelineEventType;
  descriptionParams?: Record<string, string>;
  note?: string;
  versionSeq?: number;
}

export interface OutageFilters {
  searchQuery?: string;
  status?: OutageLifecycleStatus | 'ALL';
  severity?: OutageSeverity | 'ALL';
  subdivision?: string | 'ALL';
  feeder?: string | 'ALL';
  assignedTeam?: string | 'ALL';
  scopeMode?: 'ACTIVE_ONLY' | 'RESOLVED_ONLY' | 'ALL';
  dateFromIso?: string;
  dateToIso?: string;
}

export interface OutageCluster {
  clusterId: string;
  center: GeoPoint;
  records: OutageMapRecord[];
  highestSeverity?: OutageSeverity;
  hasActiveOutage: boolean;
}

export interface ManagementOutageSummary {
  totalVisibleOutages: number;
  activeOutages: number;
  resolvedOutages: number;
  escalatedCount: number;
  confirmedOutages: number;
  bySubdivision: Record<string, number>;
}

export interface OutageChange {
  reason: 'STATE_UPDATED' | 'OFFLINE_SYNCED' | 'TRANSPORT_STATUS';
  timestamp: string;
  incidentId?: string;
}

export interface OutageMapDataSource {
  readonly transportState: TransportConnectionState;
  listVisibleOutages(filters?: OutageFilters): Promise<OutageMapRecord[]>;
  getVisibleOutage(id: string): Promise<OutageMapRecord | null>;
  listVisibleEvents(incidentIdOrOutageId?: string): Promise<OperationsTimelineEvent[]>;
  getManagementSummary(): Promise<ManagementOutageSummary | null>;
  subscribeToChanges(callback: (change: OutageChange) => void): () => void;
}
