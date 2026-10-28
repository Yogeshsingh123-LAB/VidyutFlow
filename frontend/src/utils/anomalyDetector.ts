import {
  CriticalIncident,
  FeederHealth,
  ComplaintRecord,
  WorkOrder,
  AuditLogItem,
  SystemServiceStatus,
  ElectricityBill,
  UserRole,
  AppNotification,
  FieldEngineerRecord,
  EmergencyHazardClassification
} from '../types';
import { FEEDER_METRICS, SYSTEM_SERVICES } from '../data/mockData';
import { formatErpDateTime } from './dateUtils';
import { resolveCanonicalDemoIdentity, getCanonicalIdentityById } from '../data/demoAuthData';

export interface AnomalyDetectionConfig {
  feederWarningPct: number;        // default: 80%
  feederCriticalPct: number;       // default: 100%
  feederTripsCriticalLimit: number; // default: 5 trips
  complaintSlaBreachedOnly: boolean; // default: false
  unresolvedWorkOrderHours: number; // default: 24h
  loginAttemptsThreshold: number;  // default: 3
}

export const DEFAULT_DETECTION_CONFIG: AnomalyDetectionConfig = {
  feederWarningPct: 80,
  feederCriticalPct: 100,
  feederTripsCriticalLimit: 5,
  complaintSlaBreachedOnly: false,
  unresolvedWorkOrderHours: 24,
  loginAttemptsThreshold: 3
};

export interface AnomalyDetectionDatasets {
  feeders?: FeederHealth[];
  complaints?: ComplaintRecord[];
  workOrders?: WorkOrder[];
  auditLogs?: AuditLogItem[];
  systemServices?: SystemServiceStatus[];
  bills?: ElectricityBill[];
  consumerOwnedNumbers?: ReadonlySet<string>;
}

/**
 * Deterministic Anomaly Detection Engine (VidyutFlow Step 6B.4 / Phase 2)
 *
 * Scans available ERP datasets against configurable thresholds and generates
 * structured, role-routed CriticalIncident records with complete lifecycle history.
 */
export function detectAnomalies(
  datasets: AnomalyDetectionDatasets,
  config: Partial<AnomalyDetectionConfig> = {}
): CriticalIncident[] {
  const cfg: AnomalyDetectionConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
  const incidents: CriticalIncident[] = [];
  const feeders = datasets.feeders || FEEDER_METRICS;
  const complaints = datasets.complaints || [];
  const workOrders = datasets.workOrders || [];
  const auditLogs = datasets.auditLogs || [];
  const services = datasets.systemServices || SYSTEM_SERVICES;
  const ownedConsumerNos = datasets.consumerOwnedNumbers || new Set<string>();

  const nowIso = new Date().toISOString();

  // 1. Feeder Overload & Tripping Telemetry
  for (const f of feeders) {
    if (f.utilizationPct >= cfg.feederCriticalPct || f.trippingEventsPast30d >= cfg.feederTripsCriticalLimit) {
      incidents.push({
        id: `INC-${f.id}`,
        title: `Critical 11kV Overload: ${f.name} (${f.utilizationPct}% Capacity)`,
        description: `Feeder ${f.name} (${f.id}) is operating at ${f.utilizationPct}% rated capacity (${f.peakLoadAmps}A / ${f.ratedCapacityAmps}A) with ${f.trippingEventsPast30d} recorded tripping events. Risk of distribution transformer thermal failure.`,
        severity: 'CRITICAL',
        module: 'Distribution & SCADA',
        entityId: f.id,
        entityType: 'feeder',
        subdivision: f.subdivision || 'Mehsana City North',
        timestamp: nowIso,
        responsibleRoles: ['field', 'management', 'employee'],
        recommendedAction: `Initiate peak load shedding or re-route ${f.subdivision} agricultural load to adjacent 11kV line. Inspect DTR thermal oil levels.`,
        status: 'DETECTED',
        actionTab: 'maintenance',
        history: [
          {
            timestamp: nowIso,
            stage: 'DETECTED',
            actor: 'UGVCL SCADA Automated Telemetry Monitor',
            notes: `Utilization reached ${f.utilizationPct}% with ${f.trippingEventsPast30d} recent tripping events.`
          }
        ]
      });
    } else if (f.utilizationPct >= cfg.feederWarningPct) {
      incidents.push({
        id: `INC-${f.id}`,
        title: `Feeder High Load Warning: ${f.name} (${f.utilizationPct}%)`,
        description: `Feeder ${f.name} is approaching maximum operating threshold at ${f.utilizationPct}% rated capacity.`,
        severity: 'WARNING',
        module: 'Distribution & SCADA',
        entityId: f.id,
        entityType: 'feeder',
        subdivision: f.subdivision || 'Mehsana City North',
        timestamp: nowIso,
        responsibleRoles: ['field', 'management'],
        recommendedAction: 'Monitor tail-end bus voltage and prepare line balancing work order.',
        status: 'DETECTED',
        actionTab: 'maintenance',
        history: [
          {
            timestamp: nowIso,
            stage: 'DETECTED',
            actor: 'UGVCL SCADA Automated Telemetry Monitor',
            notes: `Feeder crossed ${cfg.feederWarningPct}% warning threshold.`
          }
        ]
      });
    }
  }

  // 2. Complaint SLA Deadlines Approaching or Breached
  for (const c of complaints) {
    const isUnresolved = c.status !== 'Resolved' && c.status !== 'Closed';
    if (!isUnresolved) continue;

    // Internal operational SLA breach and triage alerts are strictly restricted to authorized utility staff
    const rolesForComplaint: UserRole[] = ['employee', 'management'];

    if (c.slaBreached || c.priority === 'Critical') {
      incidents.push({
        id: `INC-${c.id}`,
        title: `GERC SLA Breach Risk: Complaint #${c.id} (${c.category})`,
        description: `Consumer complaint #${c.id} (${c.category} for ${c.consumerNo}) is in "${c.status}" state. Target SLA turnaround time exceeded or approaching critical limit.`,
        severity: 'CRITICAL',
        module: 'Metering & SLA',
        entityId: c.id,
        entityType: 'complaint',
        subdivision: c.subdivision || 'Mehsana City North',
        timestamp: c.filedAt || nowIso,
        responsibleRoles: rolesForComplaint,
        recommendedAction: `Escalate to Sub-Divisional Officer and dispatch on-call JE for immediate field resolution at ${c.subdivision}.`,
        status: 'DETECTED',
        actionTab: 'complaints',
        history: [
          {
            timestamp: c.filedAt || nowIso,
            stage: 'DETECTED',
            actor: 'GERC Statutory SLA Monitoring Engine',
            notes: `Complaint ${c.id} exceeded SLA resolution benchmark.`
          }
        ]
      });
    } else if (c.priority === 'High' && !cfg.complaintSlaBreachedOnly) {
      incidents.push({
        id: `INC-${c.id}`,
        title: `High Priority Grievance: #${c.id} (${c.category})`,
        description: `High priority complaint logged for connection ${c.consumerNo}: ${c.description}`,
        severity: 'WARNING',
        module: 'Metering & SLA',
        entityId: c.id,
        entityType: 'complaint',
        timestamp: c.filedAt || nowIso,
        responsibleRoles: rolesForComplaint,
        recommendedAction: 'Assign line technician and contact consumer with status update.',
        status: 'DETECTED',
        actionTab: 'complaints',
        history: [
          {
            timestamp: c.filedAt || nowIso,
            stage: 'DETECTED',
            actor: 'GERC Statutory SLA Monitoring Engine',
            notes: `High priority complaint ${c.id} flagged.`
          }
        ]
      });
    }
  }

  // 3. High-Priority Unresolved Work Orders
  for (const wo of workOrders) {
    if (wo.priority === 'Emergency' && wo.status !== 'Completed') {
      incidents.push({
        id: `INC-${wo.id}`,
        title: `Emergency Work Order Unresolved: ${wo.title} (${wo.id})`,
        description: `Work order ${wo.id} at ${wo.location} (${wo.feederName}) has emergency priority and remains in ${wo.status} status.`,
        severity: 'CRITICAL',
        module: 'Field Operations',
        entityId: wo.id,
        entityType: 'work_order',
        subdivision: wo.subdivision || 'Mehsana City North',
        timestamp: nowIso,
        responsibleRoles: ['field', 'employee'],
        recommendedAction: 'Verify line clearance PTW and ensure technician arrival on site.',
        status: 'DETECTED',
        actionTab: 'workorders',
        history: [
          {
            timestamp: nowIso,
            stage: 'DETECTED',
            actor: 'Field Operations Dispatch Supervisor',
            notes: `Emergency work order ${wo.id} requires clearance.`
          }
        ]
      });
    }
  }

  // 4. Suspicious Authentication & Security Events
  for (const log of auditLogs) {
    if (
      log.action === 'FAILED_PORTAL_LOGIN_ATTEMPT' ||
      log.status === 'WARNING' ||
      log.metaDetail.toLowerCase().includes('brute') ||
      log.metaDetail.toLowerCase().includes('throttled')
    ) {
      incidents.push({
        id: `INC-${log.id}`,
        title: `Security Anomaly: Multiple Failed Auth Attempts from ${log.ipAddress}`,
        description: `Repeated authentication failures detected by Gateway: "${log.metaDetail}". Resource: ${log.resource}.`,
        severity: 'WARNING',
        module: 'Security & Access',
        entityId: log.id,
        entityType: 'security',
        timestamp: log.timestamp || nowIso,
        responsibleRoles: ['admin'],
        recommendedAction: 'Inspect firewall drop rules, review IP reputation, and enforce session rotation.',
        status: 'DETECTED',
        actionTab: 'audit',
        history: [
          {
            timestamp: log.timestamp || nowIso,
            stage: 'DETECTED',
            actor: 'UGVCL Cybersecurity Gateway IDS',
            notes: log.metaDetail
          }
        ]
      });
    }
  }

  // 5. System Service Degradation
  for (const s of services) {
    if (s.status === 'Degraded' || s.status === 'Down') {
      incidents.push({
        id: `INC-SRV-${s.name.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)}`,
        title: `Core Service Alert: ${s.name} is ${s.status}`,
        description: `Microservice ${s.name} (${s.category}) is in ${s.status} state. Latency: ${s.latencyMs}ms. Last Incident: ${s.lastIncident}.`,
        severity: s.status === 'Down' ? 'CRITICAL' : 'WARNING',
        module: 'Security & Access',
        entityId: s.name,
        entityType: 'service',
        timestamp: nowIso,
        responsibleRoles: ['admin', 'management'],
        recommendedAction: 'Inspect container logs and initiate service cluster health check.',
        status: 'DETECTED',
        actionTab: 'infra',
        history: [
          {
            timestamp: nowIso,
            stage: 'DETECTED',
            actor: 'Infrastructure Telemetry Sentinel',
            notes: `Service status changed to ${s.status}.`
          }
        ]
      });
    }
  }

  // Deduplicate emitted incidents by canonical ID so repeated or overlapping dataset entries never create duplicate alerts
  const uniqueIncidents: CriticalIncident[] = [];
  const seenIncidentIds = new Set<string>();
  for (const inc of incidents) {
    if (!seenIncidentIds.has(inc.id)) {
      seenIncidentIds.add(inc.id);
      uniqueIncidents.push(inc);
    }
  }

  return uniqueIncidents;
}

const VALID_EMERGENCY_CLASSIFICATIONS = new Set<string>([
  'ELECTROCUTION_RISK',
  'FIRE_HAZARD',
  'CONDUCTOR_SNAP',
  'SUBSTATION_EXPLOSION',
  'electrocution',
  'fire',
  'conductor_snap',
  'explosion'
]);

/**
 * Verifies whether the incident's underlying telemetry content corroborates
 * an actual life-threatening electrical hazard (rather than an ordinary overload,
 * thermal warning, billing issue, or SLA breach with a tampered flag).
 */
export function hasConfirmedLifeHazardTelemetry(incident: CriticalIncident): boolean {
  const text = `${incident.title || ''} ${incident.description || ''} ${incident.recommendedAction || ''} ${incident.hazardDetails || ''}`.toLowerCase();
  return (
    text.includes('electrocution') ||
    text.includes('fire hazard') ||
    text.includes('substation fire') ||
    text.includes('transformer fire') ||
    text.includes('conductor snap') ||
    text.includes('fallen conductor') ||
    text.includes('snapped 11kv') ||
    text.includes('snapped conductor') ||
    text.includes('live wire') ||
    text.includes('live-wire') ||
    text.includes('substation explosion') ||
    text.includes('transformer explosion') ||
    text.includes('life-threatening') ||
    text.includes('life hazard')
  );
}

/**
 * Checks whether an incident represents a confirmed immediate life-threatening emergency hazard
 * (e.g. electrocution risk, fire hazard, conductor snap / fallen line, substation explosion)
 * which qualifies for the Emergency Safety Broadcast Override.
 *
 * Security hardening:
 * - Ordinary incidents cannot obtain emergency override permissions merely by flipping
 *   a client-editable `isEmergencyOverride: true` flag or injecting an uncorroborated classification.
 * - Requires CRITICAL severity, an operational physical entityType (not billing/security/service),
 *   no explicit override disablement (`isEmergencyOverride !== false`), valid classification code
 *   (if specified), and corroborated life-hazard telemetry evidence.
 */
export function isConfirmedEmergencyHazard(incident: CriticalIncident): boolean {
  if (!incident || incident.severity !== 'CRITICAL') {
    return false;
  }
  if (
    incident.entityType === 'billing' ||
    incident.entityType === 'security' ||
    incident.entityType === 'service'
  ) {
    return false;
  }
  if (incident.isEmergencyOverride === false) {
    return false;
  }
  const rawClass = (incident.emergencyClassification || incident.hazardClassification || '').trim();
  if (rawClass && rawClass !== 'NONE' && !VALID_EMERGENCY_CLASSIFICATIONS.has(rawClass)) {
    return false;
  }
  return hasConfirmedLifeHazardTelemetry(incident);
}

/**
 * Controlled workflow helper for classifying or escalating an operational incident
 * into a confirmed life-hazard emergency broadcast.
 * Enforces RBAC, jurisdiction/assignment boundaries, and mandatory life-hazard verification.
 */
export function reclassifyIncidentEmergencyOverride(
  incident: CriticalIncident,
  classification: EmergencyHazardClassification,
  hazardDetails: string,
  actorRole: UserRole,
  actorUser: IncidentSessionUserContext,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  denialReason?: string;
  updatedIncident: CriticalIncident;
} {
  if (actorRole === 'consumer') {
    return {
      success: false,
      denialReason: 'Access Denied — Consumers are strictly prohibited from classifying operational emergencies.',
      updatedIncident: incident
    };
  }

  if (actorRole === 'employee') {
    const empAuth = authorizeEmployeeAction(incident, actorRole, actorUser);
    if (!empAuth.isAuthorized) {
      return {
        success: false,
        denialReason: empAuth.denialReason,
        updatedIncident: incident
      };
    }
  } else if (actorRole === 'field') {
    const fieldAuth = authorizeFieldEngineerAction(incident, actorRole, actorUser);
    if (!fieldAuth.isAuthorized) {
      return {
        success: false,
        denialReason: fieldAuth.denialReason,
        updatedIncident: incident
      };
    }
  } else if (actorRole === 'management') {
    const mgmtAuth = authorizeManagementAction(incident, actorRole, actorUser);
    if (!mgmtAuth.isAuthorized) {
      return {
        success: false,
        denialReason: mgmtAuth.denialReason,
        updatedIncident: incident
      };
    }
  } else if (actorRole !== 'admin') {
    return {
      success: false,
      denialReason: `Role "${String(actorRole).toUpperCase()}" is not authorized to classify emergency hazards.`,
      updatedIncident: incident
    };
  }

  if (!classification || classification === 'NONE' || !VALID_EMERGENCY_CLASSIFICATIONS.has(classification)) {
    return {
      success: false,
      denialReason: 'Valid life-hazard emergency classification (ELECTROCUTION_RISK, FIRE_HAZARD, CONDUCTOR_SNAP, or SUBSTATION_EXPLOSION) is required.',
      updatedIncident: incident
    };
  }

  const cleanDetails = (hazardDetails || '').trim();
  const candidate: CriticalIncident = {
    ...incident,
    severity: 'CRITICAL',
    isEmergencyOverride: true,
    emergencyClassification: classification,
    hazardClassification: classification,
    hazardDetails: cleanDetails,
    emergencyBroadcastAt: nowIso,
    responsibleRoles: ['field', 'employee', 'management', 'admin']
  };

  if (!cleanDetails || !isConfirmedEmergencyHazard(candidate)) {
    return {
      success: false,
      denialReason: 'Emergency override rejected — Hazard details do not corroborate a confirmed life-threatening electrical hazard.',
      updatedIncident: incident
    };
  }

  const actorName = (actorUser?.name || actorRole.toUpperCase()).trim();
  const updatedIncident: CriticalIncident = {
    ...candidate,
    history: [
      ...(incident.history || []),
      {
        id: `EVT-INC-${incident.id}-EMG-${Date.now()}`,
        incidentId: incident.id,
        timestamp: nowIso,
        stage: incident.status,
        actor: actorName,
        actorUserId: actorUser?.id,
        actorRole,
        notes: `[EMERGENCY OVERRIDE BROADCAST] Classified as ${classification}: ${cleanDetails}`
      }
    ]
  };

  return {
    success: true,
    updatedIncident
  };
}

/**
 * Checks whether an incident contains internal operational diagnostics,
 * GERC SLA breach escalation instructions, SCADA telemetry, or security alerts
 * that must never be exposed to consumer sessions.
 */
export function isInternalOperationalIncident(incident: CriticalIncident): boolean {
  if (
    incident.module === 'Distribution & SCADA' ||
    incident.module === 'Security & Access' ||
    incident.module === 'Field Operations'
  ) {
    return true;
  }
  const text = `${incident.title} ${incident.description} ${incident.recommendedAction}`.toLowerCase();
  return (
    text.includes('gerc sla breach risk') ||
    text.includes('escalate to sub-divisional officer') ||
    text.includes('dispatch on-call je') ||
    text.includes('scada') ||
    text.includes('substation') ||
    text.includes('security anomaly')
  );
}

/**
 * Filter incidents strictly by user role.
 * Also strips internal operational incidents (SLA breach escalations, SCADA,
 * field dispatch, security investigations) from consumer role projections.
 */
export function filterIncidentsByRole(incidents: CriticalIncident[], role: UserRole): CriticalIncident[] {
  return incidents.filter(inc => {
    if (!inc.responsibleRoles.includes(role)) return false;
    if (role === 'consumer' && isInternalOperationalIncident(inc)) return false;
    return true;
  });
}

export interface IncidentSessionUserContext {
  id?: string;
  name?: string;
  role?: UserRole;
  subdivision?: string;
  designation?: string;
  badge?: string;
}

/**
 * Centralized, role-controlled session filter for operational incidents.
 *
 * Rules:
 * 1. Consumer sessions never receive internal operational incidents (returns []).
 * 2. Emergency Safety Override: Confirmed life-threatening emergencies (electrocution,
 *    fire, conductor snap) immediately reach authorized emergency responders.
 * 3. Employee Control Desk: All newly detected operational incidents enter the Employee
 *    Incident Control Desk scoped by subdivision/jurisdiction.
 * 4. Field Engineer: Unassigned incidents NEVER appear in Field Engineer Portal; only
 *    specifically assigned incidents (assignedToUserId / assignedEngineerName) appear.
 * 5. Management: Ordinary newly detected incidents NEVER appear; only explicitly
 *    escalated incidents (status === 'ESCALATED') appear.
 * 6. Admin: Retains enterprise security and system oversight.
 */
export function filterIncidentsForSession(
  incidents: CriticalIncident[],
  role: UserRole,
  user?: IncidentSessionUserContext | null
): CriticalIncident[] {
  if (role === 'consumer') {
    return [];
  }

  return incidents.filter(inc => {
    // Emergency Safety Exception: Confirmed immediate life hazards bypass normal
    // employee-first gating and reach authorized responders (field, employee, management, admin)
    const isEmergency = isConfirmedEmergencyHazard(inc);
    if (isEmergency) {
      if (role === 'field' || role === 'employee' || role === 'management' || role === 'admin') {
        return true;
      }
    }

    if (role === 'employee') {
      // Employee Incident Control Desk receives operational incidents
      if (
        !inc.responsibleRoles.includes('employee') &&
        !inc.responsibleRoles.includes('field') &&
        !inc.responsibleRoles.includes('management')
      ) {
        return false;
      }
      // If employee has a specific subdivision, filter to incidents within their work scope
      if (
        user?.subdivision &&
        user.subdivision !== 'All' &&
        user.subdivision !== 'Central Office' &&
        user.subdivision !== 'Mehsana Corporate Circle'
      ) {
        if (
          inc.subdivision &&
          !inc.subdivision.toLowerCase().includes(user.subdivision.toLowerCase()) &&
          !user.subdivision.toLowerCase().includes(inc.subdivision.toLowerCase())
        ) {
          return false;
        }
      }
      return true;
    }

    if (role === 'field') {
      // UNASSIGNED INCIDENTS MUST NOT APPEAR IN FIELD ENGINEER PORTAL
      // Management-only escalations without field assignment must never appear in field scope
      const hasAssignment = Boolean(inc.assignedToUserId || inc.assignedEngineerName);
      if (!hasAssignment) {
        return false;
      }
      // Check if assigned specifically to this field engineer by canonical user ID
      if (inc.assignedToUserId) {
        if (user?.id) {
          return inc.assignedToUserId === user.id;
        }
        return !user;
      }
      if (user?.name && inc.assignedEngineerName) {
        const uName = user.name.trim().toLowerCase();
        const aName = inc.assignedEngineerName.trim().toLowerCase();
        if (aName === uName) {
          return true;
        }
      }
      // Fallback if no specific user context is supplied: must be explicitly assigned
      return !user && hasAssignment;
    }

    if (role === 'management') {
      // UNESCALATED ORDINARY INCIDENTS MUST NOT APPEAR IN AN ACTIVE MANAGEMENT INBOX
      // Field-only assignments must never appear as management escalations
      if (user) {
        if (inc.escalatedTo && inc.escalatedTo !== 'management') {
          return false;
        }
        if (inc.status !== 'ESCALATED' && inc.escalatedTo !== 'management') {
          return false;
        }
        // Check if escalated to specific management recipient if specified
        if (user.id && inc.escalatedToUserId && inc.escalatedToUserId !== user.id) {
          return false;
        }
        return true;
      }
      // Pure role-capability check without a session user
      return inc.status === 'ESCALATED' || inc.responsibleRoles.includes('management');
    }

    if (role === 'admin') {
      return true;
    }

    return false;
  });
}

/**
 * Self-heals legacy or misrouted incident records where an employee selected
 * "Field Engineer (Substation JE)" in the escalation form and the record was
 * saved with `escalatedTo: 'field'` without `assignedToUserId`.
 * Preserves the strict separation between Field Engineer assignment and Management escalation.
 */
export function normalizeAndHealIncidentRouting(
  inc: CriticalIncident,
  fieldEngineers?: FieldEngineerRecord[]
): CriticalIncident {
  // Strip any tampered/uncorroborated client-side emergency override flags on ordinary incidents
  let baseInc = inc;
  if (
    !isConfirmedEmergencyHazard(inc) &&
    (inc.isEmergencyOverride ||
      (inc.emergencyClassification && inc.emergencyClassification !== 'NONE') ||
      inc.hazardClassification ||
      inc.emergencyBroadcastAt)
  ) {
    baseInc = {
      ...inc,
      isEmergencyOverride: false,
      emergencyClassification: 'NONE',
      hazardClassification: undefined,
      emergencyBroadcastAt: undefined
    };
  }

  if (baseInc.escalatedTo === 'field' && !baseInc.assignedToUserId) {
    const fallbackEngineer =
      (baseInc.escalatedToUserId && fieldEngineers?.find(f => f.id === baseInc.escalatedToUserId)) ||
      (baseInc.subdivision &&
        fieldEngineers?.find(
          f =>
            f.subdivision.toLowerCase().includes(baseInc.subdivision!.toLowerCase()) ||
            baseInc.subdivision!.toLowerCase().includes(f.subdivision.toLowerCase())
        )) ||
      fieldEngineers?.[0];

    const resolvedId = baseInc.escalatedToUserId || fallbackEngineer?.id || 'FLD-UG-201';
    const resolvedName = baseInc.escalatedToUserName || fallbackEngineer?.name || 'Vikramaditya Solanki';
    const updatedRoles = Array.from(new Set<UserRole>([...(baseInc.responsibleRoles || []), 'field'])).filter(
      r => r !== 'consumer'
    );

    return {
      ...baseInc,
      status: baseInc.status === 'ESCALATED' ? 'ASSIGNED' : baseInc.status,
      assignedToUserId: resolvedId,
      assignedEngineerName: resolvedName,
      assignedAt: baseInc.assignedAt || baseInc.escalatedAt || baseInc.timestamp,
      assignedBy: baseInc.assignedBy || baseInc.escalatedBy || baseInc.originatingEmployeeName || 'Operations Desk',
      assignmentNotes: baseInc.assignmentNotes || baseInc.escalatedReason,
      escalatedTo: undefined,
      escalatedToUserId: undefined,
      escalatedToUserName: undefined,
      responsibleRoles: updatedRoles
    };
  }
  return baseInc;
}

/**
 * Canonical authorization check for opening IncidentActionModal ("Review Assignment" / "Review Escalation").
 * Enforces strict RBAC and assignedToUserId / escalatedToUserId recipient verification.
 */
export function authorizeIncidentModalAccess(
  incident: CriticalIncident,
  effectiveRole: UserRole,
  activeUser: IncidentSessionUserContext
): { isAuthorized: boolean; denialReason: string } {
  const healed = normalizeAndHealIncidentRouting(incident);
  const isEmergency = isConfirmedEmergencyHazard(healed);

  if (effectiveRole === 'consumer') {
    return {
      isAuthorized: false,
      denialReason: 'Consumers are strictly prohibited from viewing internal operational incidents.'
    };
  }

  if (effectiveRole === 'admin') {
    return { isAuthorized: true, denialReason: '' };
  }

  if (effectiveRole === 'employee') {
    return authorizeEmployeeAction(healed, effectiveRole, activeUser);
  }

  if (effectiveRole === 'field') {
    if (isEmergency) {
      return { isAuthorized: true, denialReason: '' };
    }
    let assignedToMe = false;
    if (healed.assignedToUserId) {
      assignedToMe = Boolean(activeUser.id && healed.assignedToUserId === activeUser.id);
    } else if (healed.assignedEngineerName && activeUser.name) {
      const aName = healed.assignedEngineerName.trim().toLowerCase();
      const uName = activeUser.name.trim().toLowerCase();
      assignedToMe = aName === uName;
    }
    return {
      isAuthorized: assignedToMe,
      denialReason: assignedToMe ? '' : 'This incident is not assigned to your field engineering account.'
    };
  }

  if (effectiveRole === 'management') {
    if (isEmergency) {
      return { isAuthorized: true, denialReason: '' };
    }
    const isEscalatedToMgmt =
      (healed.status === 'ESCALATED' && healed.escalatedTo !== 'field') ||
      healed.escalatedTo === 'management';
    const targetedToMe = !healed.escalatedToUserId || healed.escalatedToUserId === activeUser.id;
    const isAuthorized = Boolean(isEscalatedToMgmt && targetedToMe);
    return {
      isAuthorized,
      denialReason: isAuthorized ? '' : 'This incident has not been escalated to your executive management authority.'
    };
  }

  return {
    isAuthorized: false,
    denialReason: 'Your current session role is not authorized to view this incident.'
  };
}

/**
 * Enforces that only authorized Employees within valid subdivision jurisdiction
 * (or circle/HQ supervisory roles, admin, or confirmed emergency responders)
 * can view or execute employee operational incident actions (acknowledge, assign to field,
 * reassign to field, escalate to management, or resolve).
 */
export function authorizeEmployeeAction(
  incident: CriticalIncident,
  effectiveRole: UserRole,
  activeUser: IncidentSessionUserContext
): { isAuthorized: boolean; denialReason: string } {
  if (effectiveRole === 'admin') {
    return { isAuthorized: true, denialReason: '' };
  }
  if (effectiveRole !== 'employee') {
    return {
      isAuthorized: false,
      denialReason: `Role "${effectiveRole.toUpperCase()}" cannot execute Employee operational desk actions.`
    };
  }

  const healed = normalizeAndHealIncidentRouting(incident);
  if (isConfirmedEmergencyHazard(healed)) {
    return { isAuthorized: true, denialReason: '' };
  }

  if (
    !healed.responsibleRoles.includes('employee') &&
    !healed.responsibleRoles.includes('field') &&
    !healed.responsibleRoles.includes('management')
  ) {
    return {
      isAuthorized: false,
      denialReason: 'Incident does not require operational employee intervention.'
    };
  }

  // Jurisdiction check: If employee belongs to a local subdivision, verify against incident subdivision
  const circleOffices = [
    'all',
    'central office',
    'mehsana corporate circle',
    'gandhinagar & mehsana circle',
    'corporate hq'
  ];
  const userSub = (activeUser?.subdivision || '').trim().toLowerCase();
  const isCircleOrHq = !userSub || circleOffices.includes(userSub);

  if (!isCircleOrHq && healed.subdivision) {
    const incSub = healed.subdivision.trim().toLowerCase();
    const matches = incSub.includes(userSub) || userSub.includes(incSub);
    if (!matches) {
      return {
        isAuthorized: false,
        denialReason: `Access Denied — Incident ${healed.id} belongs to subdivision "${healed.subdivision}", which is outside your jurisdiction "${activeUser?.subdivision}".`
      };
    }
  }

  return { isAuthorized: true, denialReason: '' };
}

/**
 * Enforces that only executive Management (or admin, or confirmed emergency responders)
 * can execute management actions (approve escalation, reject escalation, request more info),
 * and verifies that the incident has been escalated and targets the active authority if specified.
 */
export function authorizeManagementAction(
  incident: CriticalIncident,
  effectiveRole: UserRole,
  activeUser: IncidentSessionUserContext
): { isAuthorized: boolean; denialReason: string } {
  if (effectiveRole === 'admin') {
    return { isAuthorized: true, denialReason: '' };
  }
  if (effectiveRole !== 'management') {
    return {
      isAuthorized: false,
      denialReason: `Role "${effectiveRole.toUpperCase()}" cannot execute executive Management actions.`
    };
  }

  const healed = normalizeAndHealIncidentRouting(incident);
  if (isConfirmedEmergencyHazard(healed)) {
    return { isAuthorized: true, denialReason: '' };
  }

  // Verify incident has actually been escalated
  const isEscalated =
    (healed.status === 'ESCALATED' && healed.escalatedTo !== 'field') ||
    healed.escalatedTo === 'management';

  if (!isEscalated) {
    return {
      isAuthorized: false,
      denialReason: `Access Denied — Incident ${healed.id} has not been escalated to Management.`
    };
  }

  // If escalated to a specific management authority, verify recipient
  if (healed.escalatedToUserId && activeUser?.id && healed.escalatedToUserId !== activeUser.id) {
    return {
      isAuthorized: false,
      denialReason: `Access Denied — Incident ${healed.id} is escalated specifically to authority ${healed.escalatedToUserName || healed.escalatedToUserId}, not your account.`
    };
  }

  return { isAuthorized: true, denialReason: '' };
}

/**
 * Enforces that only the specifically assigned Field Engineer (or confirmed emergency responder)
 * can execute mutating field actions (accept, decline, start inspection, submit findings,
 * request assistance, or submit resolution report).
 */
export function authorizeFieldEngineerAction(
  incident: CriticalIncident,
  effectiveRole: UserRole,
  activeUser: IncidentSessionUserContext
): { isAuthorized: boolean; denialReason: string } {
  if (effectiveRole !== 'field') {
    return {
      isAuthorized: false,
      denialReason: `Role "${effectiveRole.toUpperCase()}" cannot execute Field Engineer actions.`
    };
  }
  const healed = normalizeAndHealIncidentRouting(incident);
  if (isConfirmedEmergencyHazard(healed)) {
    return { isAuthorized: true, denialReason: '' };
  }
  if (!healed.assignedToUserId || !activeUser.id || healed.assignedToUserId !== activeUser.id) {
    return {
      isAuthorized: false,
      denialReason: 'Access Denied — This incident is not assigned to your field engineering account.'
    };
  }
  return { isAuthorized: true, denialReason: '' };
}

/**
 * Resolves any employee user ID, legacy demo ID ('demo_employee'), or display name
 * to its authoritative canonical Employee User ID (e.g. 'EMP-UG-1101').
 */
export function resolveCanonicalEmployeeId(
  idOrName?: string | null,
  fallbackName?: string | null
): string {
  const rawId = (idOrName || '').trim();
  const rawName = (fallbackName || '').trim();

  if (rawId && /^EMP-UG-\d+$/i.test(rawId)) {
    return rawId.toUpperCase();
  }

  if (rawId === 'demo_employee') {
    return 'EMP-UG-1101';
  }

  const byId = rawId
    ? resolveCanonicalDemoIdentity({ id: rawId, name: rawId, role: 'employee' })
    : undefined;
  if (byId && byId.role === 'employee') {
    return byId.id;
  }

  const byName = rawName
    ? resolveCanonicalDemoIdentity({ name: rawName, role: 'employee' })
    : undefined;
  if (byName && byName.role === 'employee') {
    return byName.id;
  }

  return 'EMP-UG-1101';
}

/**
 * Resolves the originating Employee's canonical user ID and display name for an incident.
 * Inspects incident.originatingEmployeeUserId, originatingEmployeeName, assignedBy, and
 * historical ASSIGNED / REASSIGNED / ESCALATED events so notifications always target a
 * canonical employee user ID rather than undefined, a legacy alias, or a role-wide broadcast.
 */
export function resolveIncidentOriginatingEmployee(
  incident: CriticalIncident
): { id: string; name: string } {
  const historyAssignEvent = [...(incident.history || [])]
    .reverse()
    .find(
      h =>
        (h.eventType === 'ASSIGNED' || h.eventType === 'REASSIGNED' || h.eventType === 'ESCALATED') &&
        (!h.actorRole || h.actorRole === 'employee')
    );

  const candidateId =
    incident.originatingEmployeeUserId ||
    historyAssignEvent?.actorUserId;
  const candidateName =
    incident.originatingEmployeeName ||
    incident.assignedBy ||
    historyAssignEvent?.actor;

  const canonicalId = resolveCanonicalEmployeeId(candidateId, candidateName);
  const canonicalIdentity = resolveCanonicalDemoIdentity({ id: canonicalId, role: 'employee' });

  const resolvedName =
    (candidateName &&
    candidateName !== 'SCADA Sentinel' &&
    candidateName !== 'EMPLOYEE'
      ? candidateName.replace(/\s*\(.*?\)\s*$/, '').trim()
      : undefined) ||
    canonicalIdentity?.name ||
    'Priya Rathod';

  return {
    id: canonicalId,
    name: resolvedName
  };
}

/**
 * Assigns or reassigns an incident to a canonical Field Engineer, revoking the previous
 * engineer's actionable access and pending assignment notification while preserving
 * the full append-only audit trail.
 */
export function reassignIncidentRecord(
  incident: CriticalIncident,
  newEngineerId: string,
  newEngineerName: string,
  reason: string | undefined,
  actorName: string,
  actorUserId?: string,
  actorRole: UserRole = 'employee',
  existingNotifications: AppNotification[] = [],
  nowIso: string = new Date().toISOString(),
  actorSubdivision?: string
): {
  success: boolean;
  denialReason?: string;
  updatedIncident: CriticalIncident;
  updatedNotifications: AppNotification[];
  isReassignment: boolean;
} {
  let resolvedSubdivision = actorSubdivision;
  if (!resolvedSubdivision && actorUserId) {
    const canonicalIdentity = getCanonicalIdentityById(actorUserId);
    if (
      canonicalIdentity &&
      canonicalIdentity.role === 'employee' &&
      (!actorName || canonicalIdentity.name.toLowerCase() === actorName.trim().toLowerCase())
    ) {
      resolvedSubdivision = canonicalIdentity.subdivision;
    }
  }

  const empAuth = authorizeEmployeeAction(incident, actorRole, {
    id: actorUserId,
    name: actorName,
    role: actorRole,
    subdivision: resolvedSubdivision
  });

  if (!empAuth.isAuthorized) {
    return {
      success: false,
      denialReason: empAuth.denialReason,
      updatedIncident: incident,
      updatedNotifications: existingNotifications,
      isReassignment: false
    };
  }

  const prevEngineerId = incident.assignedToUserId || incident.lastDeclinedByUserId;
  const prevEngineerName = incident.assignedEngineerName || incident.lastDeclinedByName;
  const isReassignment = Boolean(prevEngineerId && prevEngineerId !== newEngineerId);
  const prevStatus = incident.status;
  const cleanReason = reason?.trim() || undefined;
  const canonicalActorId =
    actorRole === 'employee'
      ? resolveCanonicalEmployeeId(actorUserId, actorName)
      : actorUserId;
  const fallbackOriginating = resolveIncidentOriginatingEmployee(incident);
  const originatingEmployeeUserId =
    actorRole === 'employee' ? canonicalActorId : fallbackOriginating.id;
  const originatingEmployeeName =
    actorRole === 'employee' ? (actorName || fallbackOriginating.name) : fallbackOriginating.name;

  const newEvent = {
    id: `EVT-INC-${incident.id}-${isReassignment ? 'REASSIGN' : 'ASSIGN'}-${Date.now()}`,
    incidentId: incident.id,
    timestamp: nowIso,
    stage: 'ASSIGNED' as const,
    eventType: (isReassignment ? 'REASSIGNED' : 'ASSIGNED') as 'REASSIGNED' | 'ASSIGNED',
    actor: actorName,
    actorUserId: canonicalActorId,
    actorRole,
    recipient: newEngineerName,
    targetUserId: newEngineerId,
    targetRole: 'field' as const,
    ...(isReassignment
      ? {
          previousEngineerId: prevEngineerId,
          previousEngineerName: prevEngineerName,
          newEngineerId,
          newEngineerName
        }
      : {
          newEngineerId,
          newEngineerName
        }),
    notes: isReassignment
      ? `Reassigned from ${prevEngineerName || prevEngineerId} (${prevEngineerId}) to Field Engineer ${newEngineerName} (${newEngineerId}).${cleanReason ? ` Reason: ${cleanReason}` : ''}`
      : `Assigned to Field Engineer ${newEngineerName} (${newEngineerId}).${cleanReason ? ` ${cleanReason}` : ''}`,
    reason: cleanReason,
    previousStatus: prevStatus,
    newStatus: 'ASSIGNED' as const
  };

  const updatedRoles = Array.from(new Set<UserRole>([...incident.responsibleRoles, 'field'])).filter(
    r => r !== 'consumer'
  );

  const updatedIncident: CriticalIncident = {
    ...incident,
    status: 'ASSIGNED',
    assignmentStatus: 'ASSIGNED',
    isDeclined: false,
    assignedToUserId: newEngineerId,
    assignedEngineerName: newEngineerName,
    assignedAt: nowIso,
    assignedBy: actorName,
    assignmentNotes: cleanReason,
    ...(isReassignment
      ? {
          previousEngineerId: prevEngineerId,
          previousEngineerName: prevEngineerName
        }
      : {}),
    lastDeclinedByUserId: undefined,
    lastDeclinedByName: undefined,
    lastDeclinedReason: undefined,
    lastDeclinedAt: undefined,
    escalatedTo: incident.escalatedTo === 'field' ? undefined : incident.escalatedTo,
    escalatedToUserId: incident.escalatedTo === 'field' ? undefined : incident.escalatedToUserId,
    escalatedToUserName: incident.escalatedTo === 'field' ? undefined : incident.escalatedToUserName,
    originatingEmployeeName,
    originatingEmployeeUserId,
    responsibleRoles: updatedRoles,
    history: [...incident.history, newEvent]
  };

  // Remove/invalidate any pending field assignment notification for a previous engineer on this incident
  const filteredNotifs = existingNotifications.filter(
    n => !(n.incidentId === incident.id && n.targetRole === 'field' && n.targetUserId !== newEngineerId)
  );

  const eventKey = `EVT-FLD-INC-${incident.id}-${newEngineerId}`;
  const fieldNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-FLD-INC-${newEngineerId}`,
    title: isReassignment ? `Reassigned Incident: ${incident.id}` : `Assigned Incident: ${incident.id}`,
    message: isReassignment
      ? `Reassigned to ${newEngineerName} by ${actorName}${cleanReason ? ` (Reason: ${cleanReason})` : ''}: ${incident.title}. Feeder/Asset: ${incident.entityId}.`
      : `Assigned to ${newEngineerName} by ${actorName}: ${cleanReason ? `${cleanReason} — ` : ''}${incident.title}. Feeder/Asset: ${incident.entityId}.`,
    time: 'Just now',
    createdAt: nowIso,
    targetRole: 'field',
    targetUserId: newEngineerId,
    incidentId: incident.id,
    type: incident.severity === 'CRITICAL' ? 'alert' : 'warning',
    read: false,
    category: 'Outage',
    subdivision: incident.subdivision,
    actorName,
    actorUserId: canonicalActorId,
    actorRole,
    eventKey
  };

  const dupIdx = filteredNotifs.findIndex(
    n => n.id === fieldNotif.id || (n.eventKey && n.eventKey === eventKey)
  );
  let updatedNotifications: AppNotification[];
  if (dupIdx !== -1) {
    updatedNotifications = [...filteredNotifs];
    updatedNotifications[dupIdx] = { ...updatedNotifications[dupIdx], ...fieldNotif };
  } else {
    updatedNotifications = [fieldNotif, ...filteredNotifs];
  }

  return {
    success: true,
    updatedIncident,
    updatedNotifications,
    isReassignment
  };
}

/**
 * Declines an active Field Engineer assignment with a mandatory reason:
 * 1. Validates nonempty decline reason and verifies field engineer authorization.
 * 2. Transitions incident status to ACKNOWLEDGED (never RESOLVED or CLOSED) and assignmentStatus to DECLINED,
 *    clearing assignedToUserId / assignedEngineerName so the declining engineer loses actionable access
 *    and the incident is immediately available for Employee reassignment.
 * 3. Appends an immutable ASSIGNMENT_DECLINED event with actor, recipient, incident, reason, timestamp, and transition.
 * 4. Creates a persistent, recipient-specific red alert notification (ASSIGNMENT_DECLINED) for the originating Employee's
 *    canonical user ID with Asia/Kolkata DD/MM/YYYY 12-hour AM/PM timestamp and actionable link to the incident dossier.
 */
export function declineIncidentAssignmentRecord(
  incident: CriticalIncident,
  reason: string,
  actorUser: IncidentSessionUserContext,
  actorRole: UserRole = 'field',
  existingNotifications: AppNotification[] = [],
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  denialReason?: string;
  updatedIncident?: CriticalIncident;
  declineNotification?: AppNotification;
  updatedNotifications: AppNotification[];
  originatingEmployee?: { id: string; name: string };
} {
  const cleanReason = (reason || '').trim();
  if (!cleanReason) {
    return {
      success: false,
      denialReason: 'Mandatory reason required to decline assignment.',
      updatedNotifications: existingNotifications
    };
  }

  const fieldAuth = authorizeFieldEngineerAction(incident, actorRole, actorUser);
  if (!fieldAuth.isAuthorized) {
    return {
      success: false,
      denialReason: fieldAuth.denialReason,
      updatedNotifications: existingNotifications
    };
  }

  const actorName = (actorUser.name || 'Field Engineer').trim();
  const actorId = (actorUser.id || incident.assignedToUserId || 'FLD-UG-201').trim();
  const prevStatus = incident.status;
  const originatingEmployee = resolveIncidentOriginatingEmployee(incident);
  const formattedTime = formatErpDateTime(nowIso);

  const newEvent = {
    id: `EVT-INC-${incident.id}-DECL-${Date.now()}`,
    incidentId: incident.id,
    timestamp: nowIso,
    stage: 'ACKNOWLEDGED' as const,
    eventType: 'ASSIGNMENT_DECLINED' as const,
    actor: actorName,
    actorUserId: actorId,
    actorRole,
    recipient: originatingEmployee.name,
    targetUserId: originatingEmployee.id,
    targetRole: 'employee' as const,
    previousEngineerId: actorId,
    previousEngineerName: actorName,
    previousStatus: prevStatus,
    newStatus: 'ACKNOWLEDGED' as const,
    reason: cleanReason,
    notes: `Field Engineer ${actorName} (${actorId}) declined assignment on ${formattedTime}: "${cleanReason}". Returned to ${originatingEmployee.name} (${originatingEmployee.id}) for reassignment.`
  };

  const updatedIncident: CriticalIncident = {
    ...incident,
    status: 'ACKNOWLEDGED',
    assignmentStatus: 'DECLINED',
    isDeclined: true,
    assignedToUserId: undefined,
    assignedEngineerName: undefined,
    previousEngineerId: actorId,
    previousEngineerName: actorName,
    lastDeclinedByUserId: actorId,
    lastDeclinedByName: actorName,
    lastDeclinedReason: cleanReason,
    lastDeclinedAt: nowIso,
    originatingEmployeeName: originatingEmployee.name,
    originatingEmployeeUserId: originatingEmployee.id,
    history: [...incident.history, newEvent]
  };

  const eventKey = `EVT-DECISION-${incident.id}-DECLINED-${actorId}-${nowIso}`;
  const declineNotification: AppNotification = {
    id: `NOTIF-${Date.now()}-EMP-DECL-${actorId}`,
    notificationType: 'ASSIGNMENT_DECLINED',
    title: `Assignment Declined: #${incident.id}`,
    message: `Field Engineer ${actorName} (${actorId}) declined assignment for ${incident.id} on ${formattedTime}. Reason: "${cleanReason}". Reassignment required.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formattedTime,
    targetRole: 'employee',
    role: 'employee',
    targetUserId: originatingEmployee.id,
    incidentId: incident.id,
    actionUrl: `/employee/incidents?incident=${incident.id}`,
    type: 'alert',
    read: false,
    category: 'Outage',
    subdivision: incident.subdivision,
    decisionAction: 'Assignment Declined',
    decisionReason: cleanReason,
    actorName,
    actorUserId: actorId,
    actorRole,
    eventKey
  };

  // Remove only the declining engineer's pending field notification for this incident; preserve all employee notifications
  const cleanedNotifications = existingNotifications.filter(
    n => !(n.incidentId === incident.id && n.targetRole === 'field')
  );
  const updatedNotifications = [declineNotification, ...cleanedNotifications];

  return {
    success: true,
    updatedIncident,
    declineNotification,
    updatedNotifications,
    originatingEmployee
  };
}

/**
 * Scopes, validates, and self-heals incident notifications for Field Engineer, Management, and Admin sessions.
 * - Ensures Field Engineers only see notifications for incidents assigned to their user ID (or confirmed emergency overrides).
 * - Corrects stale "Escalated Incident:" field notifications into "Assigned Incident:" notifications when valid,
 *   or invalidates/filters them out when unassigned or assigned to a different engineer.
 * - Prevents Management-only escalations from leaking into Field Engineer notifications and vice versa.
 */
export function sanitizeAndScopeIncidentNotifications(
  notifications: AppNotification[],
  incidents: CriticalIncident[],
  effectiveRole: UserRole,
  activeUser: IncidentSessionUserContext,
  readIds: ReadonlySet<string>,
  dismissedIds: ReadonlySet<string>
): AppNotification[] {
  const incidentMap = new Map<string, CriticalIncident>();
  for (const inc of incidents) {
    incidentMap.set(inc.id, normalizeAndHealIncidentRouting(inc));
  }

  const result: AppNotification[] = [];

  for (const n of notifications) {
    if (dismissedIds.has(n.id)) continue;
    if (n.targetRole !== effectiveRole && n.targetRole !== 'all') continue;

    // Enforce targetUserId recipient isolation when specified on any notification
    if (n.targetUserId && activeUser.id && n.targetUserId !== activeUser.id) {
      continue;
    }

    if (n.incidentId) {
      const inc = incidentMap.get(n.incidentId);

      if (effectiveRole === 'field') {
        if (inc) {
          const auth = authorizeIncidentModalAccess(inc, 'field', activeUser);
          if (!auth.isAuthorized) {
            continue;
          }
          // Heal stale "Escalated Incident:" notification metadata for validly assigned field engineer
          const healedTitle = n.title.startsWith('Escalated Incident:')
            ? `Assigned Incident: ${inc.id}`
            : n.title;
          const healedMessage = n.message.startsWith('Escalated to Management')
            ? `Assigned to ${inc.assignedEngineerName || activeUser.name || 'Field Engineer'} by ${inc.assignedBy || 'Operations Desk'}: ${inc.assignmentNotes || inc.title}`
            : n.message;

          result.push({
            ...n,
            title: healedTitle,
            message: healedMessage,
            targetUserId: n.targetUserId || inc.assignedToUserId,
            category: n.category === 'Approval' ? 'Outage' : n.category,
            read: readIds.has(n.id) ? true : n.read
          });
          continue;
        } else {
          // If incident is not in state, require explicit targetUserId match so stale untargeted notifications never grant dead-end access
          if (!n.targetUserId || !activeUser.id || n.targetUserId !== activeUser.id) {
            continue;
          }
        }
      } else if (effectiveRole === 'management') {
        if (inc) {
          const auth = authorizeIncidentModalAccess(inc, 'management', activeUser);
          if (!auth.isAuthorized) {
            continue;
          }
        }
      }
    }

    result.push(readIds.has(n.id) ? { ...n, read: true } : n);
  }

  return result;
}


