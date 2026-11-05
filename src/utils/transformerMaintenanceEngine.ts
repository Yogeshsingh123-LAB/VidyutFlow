/**
 * Transformer Maintenance Assignment & Tracking Engine
 *
 * Implements the complete, deterministic, auditable state machine for
 * Distribution Transformer (DTR) maintenance work orders across Employee,
 * Field Engineer, and Management portals:
 *
 * Lifecycle:
 *   NOT_ASSIGNED
 *     → AWAITING_ACCEPTANCE (Dispatched by Employee/Management)
 *     → ACCEPTED (Accepted by Assigned Field Engineer)
 *     → IN_PROGRESS (Started by Assigned Field Engineer)
 *     → PENDING_REVIEW (Inspection Submitted by Field Engineer)
 *     → COMPLETED (Completed & Verified)
 *
 * Rejection & Reassignment Path:
 *   AWAITING_ACCEPTANCE
 *     → REJECTED (Rejected by Assigned Field Engineer with mandatory reason)
 *     → AWAITING_ACCEPTANCE (Reassigned by Employee to another eligible engineer, preserving WO ID & history)
 */

import {
  WorkOrder,
  TransformerMaintenanceStatus,
  deriveTransformerMaintenanceStatus,
  AppNotification,
  FieldEngineerRecord,
  UserRole,
  ActiveUserIdentity
} from '../types';
import { resolveCanonicalFieldEngineerIdentity } from './fieldNotificationEngine';
import { formatErpDateTime } from './dateUtils';
import { DemoTransformerAsset } from '../data/transformerDemoData';

/**
 * Checks whether a field engineer is eligible for assignment in the given transformer zone.
 * North Zone (Mehsana Circle) covers Mehsana City North (FLD-UG-201), Mehsana Industrial GIDC (FLD-UG-209),
 * and North Circle Radial Ops (FLD-UG-212). Out-of-zone subdivisions (e.g. Kadi Division, South, Central)
 * are blocked for North Zone assignments.
 */
export function isEngineerEligibleForTransformerZone(
  engineerSubdivision: string | undefined,
  engineerId: string | undefined,
  transformerZone: string
): boolean {
  const zoneLower = (transformerZone || 'North').trim().toLowerCase();
  const subdivLower = (engineerSubdivision || '').trim().toLowerCase();
  const idUpper = (engineerId || '').trim().toUpperCase();

  if (!subdivLower) return true;
  if (subdivLower.includes(zoneLower)) return true;

  if (zoneLower === 'north') {
    // In UGVCL Mehsana North subdivision/circle, FLD-UG-201 (Mehsana City North),
    // FLD-UG-209 (Mehsana Industrial GIDC), and FLD-UG-212 (Vikram Zala) are authorized North crew.
    // FLD-UG-204 (Dharmesh P. Chaudhari - Kadi Division) is outside North Subdivision.
    if (
      idUpper === 'FLD-UG-201' ||
      idUpper === 'FLD-UG-209' ||
      idUpper === 'FLD-UG-212' ||
      subdivLower.includes('mehsana city north') ||
      subdivLower.includes('mehsana industrial gidc')
    ) {
      return true;
    }
    return false;
  }

  return subdivLower.includes(zoneLower);
}

/**
 * Checks whether the current active user is the assigned engineer for the given work order.
 */
export function isAssignedEngineerForWorkOrder(
  wo: WorkOrder,
  actorUser: { id?: string; name?: string },
  fieldEngineers?: FieldEngineerRecord[]
): boolean {
  const assignedResolved = resolveCanonicalFieldEngineerIdentity(
    wo.assignedEngineerId || wo.assignedTo,
    fieldEngineers
  );
  const actorResolved = resolveCanonicalFieldEngineerIdentity(
    actorUser.id || actorUser.name,
    fieldEngineers
  );

  // If the actor was previously reassigned away from this work order, strictly deny access
  if (
    wo.previousAssignees &&
    wo.previousAssignees.some(
      prev =>
        prev.toLowerCase() === (actorUser.id || '').toLowerCase() ||
        prev.toLowerCase() === (actorUser.name || '').toLowerCase() ||
        prev.toLowerCase() === actorResolved.id.toLowerCase() ||
        prev.toLowerCase() === actorResolved.name.toLowerCase()
    ) &&
    assignedResolved.id !== actorResolved.id
  ) {
    return false;
  }

  if (wo.assignedEngineerId && actorUser.id) {
    if (wo.assignedEngineerId.toUpperCase() === actorUser.id.toUpperCase()) {
      return true;
    }
  }

  if (assignedResolved.id === actorResolved.id) {
    return true;
  }

  const assignedNameLower = (wo.assignedTo || '').toLowerCase();
  const actorNameLower = (actorUser.name || '').toLowerCase();
  if (actorNameLower && (assignedNameLower.includes(actorNameLower) || actorNameLower.includes(assignedNameLower))) {
    return true;
  }

  return false;
}

/**
 * Finds all work orders belonging to a specific distribution transformer.
 */
export function getWorkOrdersForTransformer(
  asset: Pick<DemoTransformerAsset, 'id' | 'utility_asset_code' | 'feeder_id'>,
  workOrders: WorkOrder[]
): WorkOrder[] {
  return workOrders.filter(
    w =>
      w.transformerId === asset.id ||
      w.utilityAssetCode === asset.utility_asset_code ||
      (w.type === 'Transformer Overload Inspection' && w.title.includes(asset.utility_asset_code))
  );
}

/**
 * Returns the latest relevant maintenance work order for a transformer.
 * Prioritizes active/attention states over completed/cancelled historical orders,
 * and sorts by most recently updated timestamp.
 */
export function getLatestTransformerWorkOrder(
  asset: Pick<DemoTransformerAsset, 'id' | 'utility_asset_code' | 'feeder_id'>,
  workOrders: WorkOrder[]
): WorkOrder | undefined {
  const matching = getWorkOrdersForTransformer(asset, workOrders);
  if (matching.length === 0) return undefined;

  const statusRank = (wo: WorkOrder): number => {
    const st = deriveTransformerMaintenanceStatus(wo);
    switch (st) {
      case 'REJECTED':
        return 1;
      case 'AWAITING_ACCEPTANCE':
        return 2;
      case 'ACCEPTED':
      case 'IN_PROGRESS':
        return 3;
      case 'PENDING_REVIEW':
        return 4;
      case 'COMPLETED':
        return 5;
      case 'CANCELLED':
      case 'NOT_ASSIGNED':
      default:
        return 6;
    }
  };

  const getTimestampMs = (wo: WorkOrder): number => {
    const ts =
      wo.updatedAt ||
      (wo.actionHistory && wo.actionHistory.length > 0
        ? wo.actionHistory[wo.actionHistory.length - 1].timestamp
        : wo.dispatchedAt);
    if (!ts) return 0;
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  return [...matching].sort((a, b) => {
    const rankDiff = statusRank(a) - statusRank(b);
    if (rankDiff !== 0) return rankDiff;
    return getTimestampMs(b) - getTimestampMs(a);
  })[0];
}

/**
 * Priority rank for sorting transformer rows in the Employee & Management tables:
 *   1. REJECTED / REASSIGNMENT_REQUIRED
 *   2. AWAITING_ACCEPTANCE
 *   3. ACCEPTED / IN_PROGRESS
 *   4. PENDING_REVIEW (INSPECTION SUBMITTED)
 *   5. COMPLETED
 *   6. NOT_ASSIGNED
 */
export function getMaintenanceStatusPriorityRank(status: TransformerMaintenanceStatus): number {
  switch (status) {
    case 'REJECTED':
      return 1;
    case 'AWAITING_ACCEPTANCE':
      return 2;
    case 'ACCEPTED':
    case 'IN_PROGRESS':
      return 3;
    case 'PENDING_REVIEW':
      return 4;
    case 'COMPLETED':
      return 5;
    case 'NOT_ASSIGNED':
    case 'CANCELLED':
    default:
      return 6;
  }
}

export function getRiskLevelPriorityRank(riskLevel: string): number {
  switch ((riskLevel || '').toUpperCase()) {
    case 'HIGH':
    case 'SEVERE':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'LOW':
    default:
      return 3;
  }
}

/**
 * Deterministic sorting of transformers by:
 *   1. Maintenance Status priority rank (Rejected -> Awaiting Acceptance -> Accepted/In Progress -> Pending Review -> Completed -> Not Assigned)
 *   2. Risk severity (HIGH > MEDIUM > LOW)
 *   3. Most recent work-order / telemetry timestamp descending
 *   4. Asset code ascending
 */
export function sortTransformersByMaintenancePriority<T extends DemoTransformerAsset>(
  transformers: T[],
  workOrders: WorkOrder[]
): T[] {
  return [...transformers].sort((a, b) => {
    const woA = getLatestTransformerWorkOrder(a, workOrders);
    const woB = getLatestTransformerWorkOrder(b, workOrders);
    const statusA = deriveTransformerMaintenanceStatus(woA);
    const statusB = deriveTransformerMaintenanceStatus(woB);

    const maintDiff = getMaintenanceStatusPriorityRank(statusA) - getMaintenanceStatusPriorityRank(statusB);
    if (maintDiff !== 0) return maintDiff;

    const riskDiff = getRiskLevelPriorityRank(a.risk_level) - getRiskLevelPriorityRank(b.risk_level);
    if (riskDiff !== 0) return riskDiff;

    const tsA = Date.parse(woA?.updatedAt || a.last_updated_at || '') || 0;
    const tsB = Date.parse(woB?.updatedAt || b.last_updated_at || '') || 0;
    if (tsB !== tsA) return tsB - tsA;

    return a.utility_asset_code.localeCompare(b.utility_asset_code);
  });
}

/**
 * Summary counters for the Employee & Management transformer maintenance header.
 */
export interface TransformerMaintenanceSummaryCounts {
  awaitingAcceptance: number;
  inProgress: number; // includes ACCEPTED, IN_PROGRESS, PENDING_REVIEW
  reassignmentRequired: number; // REJECTED
  completed: number;
  notAssigned: number;
}

export function computeTransformerMaintenanceCounts(
  transformers: DemoTransformerAsset[],
  workOrders: WorkOrder[]
): TransformerMaintenanceSummaryCounts {
  const counts: TransformerMaintenanceSummaryCounts = {
    awaitingAcceptance: 0,
    inProgress: 0,
    reassignmentRequired: 0,
    completed: 0,
    notAssigned: 0
  };

  for (const asset of transformers) {
    const latestWo = getLatestTransformerWorkOrder(asset, workOrders);
    const status = deriveTransformerMaintenanceStatus(latestWo);
    if (status === 'AWAITING_ACCEPTANCE') {
      counts.awaitingAcceptance += 1;
    } else if (status === 'ACCEPTED' || status === 'IN_PROGRESS' || status === 'PENDING_REVIEW') {
      counts.inProgress += 1;
    } else if (status === 'REJECTED') {
      counts.reassignmentRequired += 1;
    } else if (status === 'COMPLETED') {
      counts.completed += 1;
    } else {
      counts.notAssigned += 1;
    }
  }

  return counts;
}

/**
 * Step 1: Employee / Management Dispatches a Transformer Maintenance Work Order.
 * Initial status is AWAITING_ACCEPTANCE.
 */
export function dispatchTransformerMaintenanceOrder(params: {
  transformerId: string;
  utilityAssetCode: string;
  feederId: string;
  zone: string;
  priority: 'Emergency' | 'High' | 'Routine';
  reason: string;
  recommendedAction?: string;
  assignedEngineerIdOrName?: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nextWoId: string;
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
  auditAction?: string;
  auditDetails?: string;
} {
  const {
    transformerId,
    utilityAssetCode,
    feederId,
    zone,
    priority,
    reason,
    recommendedAction,
    assignedEngineerIdOrName,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nextWoId,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole === 'consumer' || effectiveRole === 'field') {
    return {
      success: false,
      error: `Access Denied: ${effectiveRole.toUpperCase()} role cannot dispatch transformer maintenance work orders.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications,
      auditAction: 'ACCESS_DENIED',
      auditDetails: `Unauthorized dispatch attempt by ${actorUser.name} (${effectiveRole})`
    };
  }

  if (effectiveRole === 'employee' && actorUser.zone && zone.toLowerCase() !== actorUser.zone.toLowerCase()) {
    return {
      success: false,
      error: `Access Denied: Cannot dispatch work order for ${zone} zone outside assigned ${actorUser.zone} zone.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications,
      auditAction: 'ZONE_RESTRICTION_BLOCKED',
      auditDetails: `Cross-zone dispatch blocked for ${utilityAssetCode} (${zone})`
    };
  }

  const engineerTarget = assignedEngineerIdOrName || 'Vikramaditya Solanki (JE Field)';
  const assignedEng = resolveCanonicalFieldEngineerIdentity(engineerTarget, fieldEngineers);
  const matchedEng = fieldEngineers.find(
    f => f.id === assignedEng.id || f.name.toLowerCase() === assignedEng.name.toLowerCase()
  );

  if (
    matchedEng &&
    !isEngineerEligibleForTransformerZone(matchedEng.subdivision, matchedEng.id, zone)
  ) {
    return {
      success: false,
      error: `Unauthorized Assignment: ${matchedEng.name} is stationed in ${matchedEng.subdivision} and cannot be assigned to ${zone} Subdivision.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications,
      auditAction: 'UNAUTHORIZED_ASSIGNMENT_BLOCKED',
      auditDetails: `Blocked assigning ${matchedEng.name} (${matchedEng.subdivision}) to ${zone}`
    };
  }

  // Prevent duplicate active dispatch for the same transformer
  const existingActive = workOrders.find(w => {
    const matchesAsset =
      w.transformerId === transformerId ||
      w.utilityAssetCode === utilityAssetCode ||
      (w.type === 'Transformer Overload Inspection' && w.title.includes(utilityAssetCode));
    if (!matchesAsset) return false;
    const st = deriveTransformerMaintenanceStatus(w);
    return (
      st === 'AWAITING_ACCEPTANCE' ||
      st === 'ACCEPTED' ||
      st === 'IN_PROGRESS' ||
      st === 'PENDING_REVIEW' ||
      st === 'REJECTED'
    );
  });

  if (existingActive) {
    const st = deriveTransformerMaintenanceStatus(existingActive);
    return {
      success: false,
      error: `Active work order #${existingActive.id} already exists for ${utilityAssetCode} (Status: ${st}).`,
      workOrder: existingActive,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const newWo: WorkOrder = {
    id: nextWoId,
    title: `Transformer Overload & Thermal Inspection (${utilityAssetCode})`,
    type: 'Transformer Overload Inspection',
    subdivision: `${zone} Subdivision`,
    feederName: feederId,
    location: `Substation Yard / Feeder Pillar — ${feederId}, ${zone}`,
    gpsCoordinates: { lat: 23.588, lng: 72.3693 },
    priority,
    scheduledDate,
    status: 'Assigned',
    maintenanceStatus: 'AWAITING_ACCEPTANCE',
    transformerId,
    utilityAssetCode,
    assignedTo: assignedEng.name,
    assignedEngineerId: assignedEng.id,
    dispatchedBy: actorUser.name,
    dispatchedByUserId: actorUser.id || 'EMP-UG-1101',
    dispatchedAt: nowIso,
    updatedAt: nowIso,
    scopeDescription: reason,
    recommendedAction: recommendedAction || 'Thermal camera scan & tap changer adjustment',
    materialsNeeded: [
      'Infrared Thermography Camera',
      'Digital Clamp Meter (1000A)',
      'Insulated Torque Wrench',
      'BDV Dielectric Oil Sample Kit',
      'Silica Gel Breather Cartridge'
    ],
    actionHistory: [
      {
        timestamp: nowIso,
        stage: 'Awaiting Acceptance',
        actor: `${actorUser.name} (${effectiveRole.toUpperCase()})`,
        notes: `Dispatched to ${assignedEng.name} (${assignedEng.id}) — Awaiting Field Engineer acceptance. Scope: ${reason}. Action: ${recommendedAction || 'Thermal & load scan'}.`
      }
    ]
  };

  const updatedWorkOrders = [newWo, ...workOrders];

  const fieldNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-FLD-TR-${nextWoId}`,
    notificationType: 'WORK_ORDER_ASSIGNED',
    title: `DTR Maintenance Assignment: ${nextWoId}`,
    message: `${priority} maintenance dispatched for ${utilityAssetCode} (${feederId}, ${zone} Subdivision) by ${actorUser.name}. Scope: ${reason}. Please accept or reject assignment.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: assignedEng.id,
    type: priority === 'Emergency' ? 'alert' : 'info',
    read: false,
    category: 'Inspection',
    statusBadge: 'Awaiting Acceptance',
    workOrderId: nextWoId,
    subdivision: `${zone} Subdivision`,
    actorName: actorUser.name,
    eventKey: `FLD:TR:${nextWoId}:ASSIGNED:${assignedEng.id}`
  };

  return {
    success: true,
    workOrder: newWo,
    updatedWorkOrders,
    updatedNotifications: [fieldNotif, ...notifications],
    auditAction: 'TRANSFORMER_WORK_ORDER_DISPATCHED',
    auditDetails: `Dispatched ${nextWoId} for ${utilityAssetCode} (${priority}) to ${assignedEng.name} [AWAITING_ACCEPTANCE]`
  };
}

/**
 * Step 2A: Assigned Field Engineer Accepts the Maintenance Work Order.
 * Transitions AWAITING_ACCEPTANCE → ACCEPTED.
 */
export function acceptTransformerMaintenanceOrder(params: {
  woId: string;
  notes?: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
} {
  const {
    woId,
    notes,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole !== 'field' && effectiveRole !== 'admin') {
    return {
      success: false,
      error: 'Access Denied: Only the assigned Field Engineer can accept a maintenance assignment.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work Order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  if (effectiveRole === 'field' && !isAssignedEngineerForWorkOrder(targetWo, actorUser, fieldEngineers)) {
    return {
      success: false,
      error: `Access Denied: Work Order #${woId} is assigned to ${targetWo.assignedTo}, not ${actorUser.name}.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const currentMaintStatus = deriveTransformerMaintenanceStatus(targetWo);
  if (currentMaintStatus !== 'AWAITING_ACCEPTANCE') {
    return {
      success: false,
      error: `Invalid transition: Work Order #${woId} is currently ${currentMaintStatus} and cannot be accepted again.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const assetCode = targetWo.utilityAssetCode || targetWo.title;
  const updatedWo: WorkOrder = {
    ...targetWo,
    status: 'On Site',
    maintenanceStatus: 'ACCEPTED',
    updatedAt: nowIso,
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: 'Accepted',
        actor: `${actorUser.name} (Field Engineer)`,
        notes: notes || `Assignment accepted by ${actorUser.name}. Preparing tools & safety clearance.`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  const empNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-EMP-TR-ACC-${woId}`,
    notificationType: 'WORK_ORDER_ACCEPTED',
    title: `Assignment Accepted: ${woId} (${assetCode})`,
    message: `Field Engineer ${actorUser.name} accepted maintenance work order ${woId} for ${assetCode}.${notes ? ` Note: ${notes}` : ''}`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'employee',
    role: 'employee',
    type: 'info',
    read: false,
    category: 'Inspection',
    statusBadge: 'Accepted',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    eventKey: `EMP:TR:${woId}:ACCEPTED:${Date.now()}`
  };

  return {
    success: true,
    workOrder: updatedWo,
    updatedWorkOrders,
    updatedNotifications: [empNotif, ...notifications]
  };
}

/**
 * Step 2B: Assigned Field Engineer Rejects the Maintenance Work Order with a mandatory reason.
 * Transitions AWAITING_ACCEPTANCE → REJECTED (Reassignment Required).
 */
export function rejectTransformerMaintenanceOrder(params: {
  woId: string;
  reason: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
} {
  const {
    woId,
    reason,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole !== 'field' && effectiveRole !== 'admin') {
    return {
      success: false,
      error: 'Access Denied: Only the assigned Field Engineer can reject a maintenance assignment.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const cleanReason = (reason || '').trim();
  if (!cleanReason) {
    return {
      success: false,
      error: 'Rejection reason is required before rejecting a maintenance assignment.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work Order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  if (effectiveRole === 'field' && !isAssignedEngineerForWorkOrder(targetWo, actorUser, fieldEngineers)) {
    return {
      success: false,
      error: `Access Denied: Work Order #${woId} is assigned to ${targetWo.assignedTo}, not ${actorUser.name}.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const currentMaintStatus = deriveTransformerMaintenanceStatus(targetWo);
  if (currentMaintStatus !== 'AWAITING_ACCEPTANCE' && currentMaintStatus !== 'ACCEPTED') {
    return {
      success: false,
      error: `Invalid transition: Cannot reject Work Order #${woId} from state ${currentMaintStatus}.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const assetCode = targetWo.utilityAssetCode || targetWo.title;
  const updatedWo: WorkOrder = {
    ...targetWo,
    status: 'Deferred',
    maintenanceStatus: 'REJECTED',
    rejectionReason: cleanReason,
    rejectedBy: actorUser.name,
    rejectedAt: nowIso,
    updatedAt: nowIso,
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: 'Rejected',
        actor: `${actorUser.name} (Field Engineer)`,
        notes: `Assignment rejected by ${actorUser.name}. Reason: "${cleanReason}". Reassignment required.`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  const empNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-EMP-TR-REJ-${woId}`,
    notificationType: 'WORK_ORDER_REJECTED',
    title: `Assignment Rejected — Reassign Required: ${woId}`,
    message: `Field Engineer ${actorUser.name} rejected ${woId} for ${assetCode}. Reason: "${cleanReason}". Click to reassign to another engineer.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'employee',
    role: 'employee',
    type: 'alert',
    read: false,
    category: 'Inspection',
    statusBadge: 'Reassignment Required',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    decisionAction: 'Assignment Rejected',
    decisionReason: cleanReason,
    eventKey: `EMP:TR:${woId}:REJECTED:${Date.now()}`
  };

  return {
    success: true,
    workOrder: updatedWo,
    updatedWorkOrders,
    updatedNotifications: [empNotif, ...notifications]
  };
}

/**
 * Step 3: Employee Reassigns a Rejected (or Awaiting) Work Order to another eligible Field Engineer.
 * Preserves the original WO ID and full action history, revokes old engineer ownership,
 * notifies the new engineer, and returns status to AWAITING_ACCEPTANCE.
 */
export function reassignTransformerMaintenanceOrder(params: {
  woId: string;
  newEngineerIdOrName: string;
  notes?: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
} {
  const {
    woId,
    newEngineerIdOrName,
    notes,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole !== 'employee' && effectiveRole !== 'management' && effectiveRole !== 'admin') {
    return {
      success: false,
      error: 'Access Denied: Only authorized Employee, Management, or Admin users can reassign work orders.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work Order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const prevEngineer = resolveCanonicalFieldEngineerIdentity(
    targetWo.assignedEngineerId || targetWo.assignedTo,
    fieldEngineers
  );
  const newEngineer = resolveCanonicalFieldEngineerIdentity(newEngineerIdOrName, fieldEngineers);

  if (prevEngineer.id === newEngineer.id) {
    return {
      success: false,
      error: `Work Order #${woId} was already assigned to ${newEngineer.name}. Select a different eligible engineer.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const zone = (targetWo.subdivision || 'North').replace(/\s*Subdivision$/i, '').trim() || 'North';
  const matchedEng = fieldEngineers.find(
    f => f.id === newEngineer.id || f.name.toLowerCase() === newEngineer.name.toLowerCase()
  );

  if (
    matchedEng &&
    !isEngineerEligibleForTransformerZone(matchedEng.subdivision, matchedEng.id, zone)
  ) {
    return {
      success: false,
      error: `Unauthorized Reassignment: ${matchedEng.name} (${matchedEng.subdivision}) is not eligible for ${zone} Subdivision.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const reasonNote =
    notes?.trim() ||
    (targetWo.rejectionReason
      ? `Reassigned following rejection by ${prevEngineer.name} ("${targetWo.rejectionReason}")`
      : 'Operational crew reallocation');

  const prevAssigneesList = Array.from(
    new Set([...(targetWo.previousAssignees || []), prevEngineer.id, prevEngineer.name])
  );

  const updatedWo: WorkOrder = {
    ...targetWo,
    status: 'Assigned',
    maintenanceStatus: 'AWAITING_ACCEPTANCE',
    assignedTo: newEngineer.name,
    assignedEngineerId: newEngineer.id,
    updatedAt: nowIso,
    previousAssignees: prevAssigneesList,
    reassignmentHistory: [
      ...(targetWo.reassignmentHistory || []),
      {
        timestamp: nowIso,
        previousAssignee: `${prevEngineer.name} (${prevEngineer.id})`,
        newAssignee: `${newEngineer.name} (${newEngineer.id})`,
        reason: reasonNote,
        reassignedBy: actorUser.name
      }
    ],
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: 'Reassigned • Awaiting Acceptance',
        actor: `${actorUser.name} (${effectiveRole.toUpperCase()})`,
        notes: `Reassigned from ${prevEngineer.name} to ${newEngineer.name} (${newEngineer.id}). ${reasonNote}. Status reset to Awaiting Acceptance.`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  // Deactivate/remove previous engineer's active assignment notifications for this WO
  const cleanedNotifications = notifications.filter(
    n => !(n.workOrderId === woId && n.targetRole === 'field' && n.targetUserId === prevEngineer.id)
  );

  const assetCode = targetWo.utilityAssetCode || targetWo.title;
  const newFieldNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-FLD-TR-REASSIGN-${woId}-${newEngineer.id}`,
    notificationType: 'WORK_ORDER_REASSIGNED',
    title: `Reassigned DTR Maintenance: ${woId}`,
    message: `Work order ${woId} for ${assetCode} (${targetWo.subdivision}) has been reassigned to ${newEngineer.name} by ${actorUser.name}. ${reasonNote}. Please accept or reject.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: newEngineer.id,
    type: 'warning',
    read: false,
    category: 'Inspection',
    statusBadge: 'Awaiting Acceptance',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    decisionAction: 'Work Order Reassigned',
    decisionReason: reasonNote,
    eventKey: `FLD:TR:${woId}:REASSIGNED:${newEngineer.id}:${Date.now()}`
  };

  return {
    success: true,
    workOrder: updatedWo,
    updatedWorkOrders,
    updatedNotifications: [newFieldNotif, ...cleanedNotifications]
  };
}

/**
 * Step 4: Assigned Field Engineer Starts Maintenance Work.
 * Transitions ACCEPTED → IN_PROGRESS.
 */
export function startTransformerMaintenanceWorkOrder(params: {
  woId: string;
  notes?: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
} {
  const {
    woId,
    notes,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole !== 'field' && effectiveRole !== 'admin') {
    return {
      success: false,
      error: 'Access Denied: Only the assigned Field Engineer can start maintenance work.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work Order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  if (effectiveRole === 'field' && !isAssignedEngineerForWorkOrder(targetWo, actorUser, fieldEngineers)) {
    return {
      success: false,
      error: `Access Denied: Work Order #${woId} is assigned to ${targetWo.assignedTo}, not ${actorUser.name}.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const currentMaintStatus = deriveTransformerMaintenanceStatus(targetWo);
  if (currentMaintStatus !== 'ACCEPTED') {
    return {
      success: false,
      error: `Invalid transition: Work Order #${woId} must be ACCEPTED before starting work (current state: ${currentMaintStatus}).`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const assetCode = targetWo.utilityAssetCode || targetWo.title;
  const updatedWo: WorkOrder = {
    ...targetWo,
    status: 'In Progress',
    maintenanceStatus: 'IN_PROGRESS',
    updatedAt: nowIso,
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: 'In Progress',
        actor: `${actorUser.name} (Field Engineer)`,
        notes: notes || `On-site transformer diagnostic & maintenance started by ${actorUser.name}.`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  const empNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-EMP-TR-PROG-${woId}`,
    notificationType: 'WORK_ORDER_IN_PROGRESS',
    title: `Maintenance In Progress: ${woId} (${assetCode})`,
    message: `Field Engineer ${actorUser.name} started on-site maintenance work on ${assetCode} (${woId}).`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'employee',
    role: 'employee',
    type: 'info',
    read: false,
    category: 'Inspection',
    statusBadge: 'In Progress',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    eventKey: `EMP:TR:${woId}:IN_PROGRESS:${Date.now()}`
  };

  return {
    success: true,
    workOrder: updatedWo,
    updatedWorkOrders,
    updatedNotifications: [empNotif, ...notifications]
  };
}

/**
 * Step 5: Assigned Field Engineer Submits Inspection Findings for Review.
 * Transitions IN_PROGRESS → PENDING_REVIEW (INSPECTION SUBMITTED / PENDING REVIEW).
 * Does NOT auto-complete the work order to COMPLETED.
 */
export function submitTransformerInspectionOrderForReview(params: {
  woId: string;
  report: NonNullable<WorkOrder['inspectionReport']>;
  checklist?: Record<string, string>;
  photoRefs?: string[];
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
} {
  const {
    woId,
    report,
    checklist,
    photoRefs,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole !== 'field' && effectiveRole !== 'admin') {
    return {
      success: false,
      error: 'Access Denied: Only the assigned Field Engineer can submit field inspection evidence.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work Order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  if (effectiveRole === 'field' && !isAssignedEngineerForWorkOrder(targetWo, actorUser, fieldEngineers)) {
    return {
      success: false,
      error: `Access Denied: Work Order #${woId} is assigned to ${targetWo.assignedTo}, not ${actorUser.name}.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const currentMaintStatus = deriveTransformerMaintenanceStatus(targetWo);
  if (currentMaintStatus !== 'IN_PROGRESS' && currentMaintStatus !== 'ACCEPTED') {
    return {
      success: false,
      error: `Invalid transition: Work Order #${woId} must be IN_PROGRESS or ACCEPTED to submit inspection (current state: ${currentMaintStatus}).`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const assetCode = targetWo.utilityAssetCode || targetWo.title;
  const updatedWo: WorkOrder = {
    ...targetWo,
    status: 'In Progress',
    maintenanceStatus: 'PENDING_REVIEW',
    verificationStatus: 'pending_verification',
    inspectionReport: report,
    inspectionChecklist: checklist,
    inspectionPhotoRefs: photoRefs,
    updatedAt: nowIso,
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: 'Inspection Submitted',
        actor: `${actorUser.name} (Field Engineer)`,
        notes: `Field inspection report submitted for review: ${report.technicianRemarks}`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  const empNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-EMP-TR-REV-${woId}`,
    notificationType: 'WORK_ORDER_PENDING_REVIEW',
    title: `Inspection Submitted for Review: ${woId}`,
    message: `Field Engineer ${actorUser.name} submitted DTR inspection findings for ${assetCode} (${woId}). Remarks: "${report.technicianRemarks}". Ready for completion verification.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'employee',
    role: 'employee',
    type: 'info',
    read: false,
    category: 'Inspection',
    statusBadge: 'Inspection Submitted',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    eventKey: `EMP:TR:${woId}:PENDING_REVIEW:${Date.now()}`
  };

  return {
    success: true,
    workOrder: updatedWo,
    updatedWorkOrders,
    updatedNotifications: [empNotif, ...notifications]
  };
}

/**
 * Step 6: Complete Maintenance Work Order.
 * Transitions PENDING_REVIEW → COMPLETED.
 */
export function completeTransformerMaintenanceOrder(params: {
  woId: string;
  completionNotes?: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  workOrder?: WorkOrder;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
} {
  const {
    woId,
    completionNotes,
    actorUser,
    effectiveRole,
    workOrders,
    fieldEngineers,
    notifications,
    nowIso = new Date().toISOString()
  } = params;

  if (effectiveRole === 'consumer') {
    return {
      success: false,
      error: 'Access Denied: Consumers cannot complete transformer maintenance work orders.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work Order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  if (effectiveRole === 'field' && !isAssignedEngineerForWorkOrder(targetWo, actorUser, fieldEngineers)) {
    return {
      success: false,
      error: `Access Denied: Work Order #${woId} is assigned to ${targetWo.assignedTo}, not ${actorUser.name}.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const currentMaintStatus = deriveTransformerMaintenanceStatus(targetWo);
  if (currentMaintStatus !== 'PENDING_REVIEW' && currentMaintStatus !== 'IN_PROGRESS') {
    return {
      success: false,
      error: `Invalid transition: Work Order #${woId} must have a submitted inspection (PENDING_REVIEW) before completion (current state: ${currentMaintStatus}).`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const assetCode = targetWo.utilityAssetCode || targetWo.title;
  const assignedEng = resolveCanonicalFieldEngineerIdentity(
    targetWo.assignedEngineerId || targetWo.assignedTo,
    fieldEngineers
  );

  const updatedWo: WorkOrder = {
    ...targetWo,
    status: 'Completed',
    maintenanceStatus: 'COMPLETED',
    verificationStatus: 'approved',
    updatedAt: nowIso,
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: 'Completed',
        actor: `${actorUser.name} (${effectiveRole.toUpperCase()})`,
        notes:
          completionNotes ||
          `Maintenance work order ${woId} verified and completed for ${assetCode}. Asset returned to nominal monitoring.`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  const empNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-EMP-TR-DONE-${woId}`,
    notificationType: 'WORK_ORDER_COMPLETED',
    title: `DTR Maintenance Completed: ${woId} (${assetCode})`,
    message: `Maintenance work order ${woId} for ${assetCode} (${targetWo.subdivision}) has been completed and verified by ${actorUser.name}.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'employee',
    role: 'employee',
    type: 'success',
    read: false,
    category: 'Inspection',
    statusBadge: 'Completed',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    eventKey: `EMP:TR:${woId}:COMPLETED:${Date.now()}`
  };

  const fieldNotif: AppNotification = {
    id: `NOTIF-${Date.now()}-FLD-TR-DONE-${woId}`,
    notificationType: 'WORK_ORDER_COMPLETED',
    title: `Maintenance Order Closed: ${woId}`,
    message: `Work order ${woId} for ${assetCode} is marked Completed.${completionNotes ? ` Note: ${completionNotes}` : ''}`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: assignedEng.id,
    type: 'success',
    read: false,
    category: 'Inspection',
    statusBadge: 'Completed',
    workOrderId: woId,
    subdivision: targetWo.subdivision,
    actorName: actorUser.name,
    eventKey: `FLD:TR:${woId}:COMPLETED:${Date.now()}`
  };

  return {
    success: true,
    workOrder: updatedWo,
    updatedWorkOrders,
    updatedNotifications: [empNotif, fieldNotif, ...notifications]
  };
}
