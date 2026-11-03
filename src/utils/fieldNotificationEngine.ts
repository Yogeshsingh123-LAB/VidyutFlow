/**
 * Field Engineer Notification Engine & Work Order Lifecycle Automation
 * 
 * Provides dedicated notification generation, recipient isolation,
 * reassignment revocation, priority/schedule change tracking, offline sync notifications,
 * and 4-language reactive localization (English, Gujarati, Hindi, Marathi) for VidyutFlow 2.0.
 */

import {
  AppNotification,
  WorkOrder,
  CriticalIncident,
  FieldEngineerRecord,
  UserRole,
  ActiveUserIdentity
} from '../types';
import { FieldOfflineReplaySummary } from './fieldOfflineQueue';
import { formatErpDateTime } from './dateUtils';
import { LanguageCode } from '../i18n/types';
import {
  localizeSubdivision,
  localizeTariffCategory,
  localizeComplaintCategory,
  localizeNotificationStatusBadge
} from '../i18n/consumerContentTranslations';
import { authorizeIncidentModalAccess } from './anomalyDetector';

// Canonical directory of standard UGVCL field engineers
export const CANONICAL_FIELD_ENGINEERS = [
  { id: 'FLD-UG-201', name: 'Vikramaditya Solanki', designation: 'Junior Engineer (Field & Vigilance)' },
  { id: 'FLD-UG-204', name: 'Dharmesh P. Chaudhari', designation: 'Line Inspector & Field Feasibility Officer' },
  { id: 'FLD-UG-209', name: 'Hitesh N. Vaghela', designation: 'Substation Technician Grade-I' },
  { id: 'FLD-UG-212', name: 'Vikram Zala', designation: 'Field Testing Engineer' }
];

/**
 * Resolves an engineer ID or full/partial name into canonical Field Engineer credentials.
 */
export function resolveCanonicalFieldEngineerIdentity(
  identifier?: string | null,
  fieldEngineers?: FieldEngineerRecord[]
): { id: string; name: string } {
  if (!identifier) {
    return { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' };
  }

  const clean = identifier.trim();

  // If already an ID format
  if (/^FLD-UG-\d+$/i.test(clean)) {
    const matched = (fieldEngineers || CANONICAL_FIELD_ENGINEERS).find(
      f => f.id.toUpperCase() === clean.toUpperCase()
    );
    return {
      id: clean.toUpperCase(),
      name: matched?.name || 'Vikramaditya Solanki'
    };
  }

  // Look up in dynamic or canonical list by name or substring
  const cleanLower = clean.toLowerCase();
  const list = fieldEngineers && fieldEngineers.length > 0 ? fieldEngineers : CANONICAL_FIELD_ENGINEERS;
  
  const exact = list.find(f => f.name.toLowerCase() === cleanLower);
  if (exact) {
    return { id: exact.id, name: exact.name };
  }

  const partial = list.find(
    f => cleanLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(cleanLower)
  );
  if (partial) {
    return { id: partial.id, name: partial.name };
  }

  // Common fallbacks for mock aliases
  if (cleanLower.includes('dharmesh')) {
    return { id: 'FLD-UG-204', name: 'Dharmesh P. Chaudhari' };
  }
  if (cleanLower.includes('hitesh')) {
    return { id: 'FLD-UG-209', name: 'Hitesh N. Vaghela' };
  }
  if (cleanLower.includes('zala')) {
    return { id: 'FLD-UG-212', name: 'Vikram Zala' };
  }

  return { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' };
}

/**
 * Event A: New Work Order Assigned
 */
export function buildWorkOrderAssignedNotification(params: {
  wo: WorkOrder;
  targetEngineer: { id: string; name: string };
  actorLabel?: string;
  notes?: string;
  nowIso?: string;
}): AppNotification {
  const { wo, targetEngineer, actorLabel = 'Operations Desk', notes, nowIso = new Date().toISOString() } = params;
  const isEmergency = wo.priority === 'Emergency';
  const category = wo.complaintId || wo.type === 'Feeder Patrol & Maintenance' ? 'Outage' : 'Inspection';

  return {
    id: `NOTIF-${Date.now()}-FLD-WO-ASSIGN-${targetEngineer.id}`,
    notificationType: 'WORK_ORDER_ASSIGNED',
    title: `New Work Order Assigned: ${wo.id}`,
    message: `Work order ${wo.id} (${wo.type}) in ${wo.subdivision} assigned to ${targetEngineer.name}. Priority: ${wo.priority}. Location: ${wo.location}.${notes ? ` Note: ${notes}` : ''}`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: targetEngineer.id,
    workOrderId: wo.id,
    complaintId: wo.complaintId,
    applicationId: wo.applicationId,
    subdivision: wo.subdivision,
    type: isEmergency ? 'alert' : 'info',
    read: false,
    category,
    statusBadge: isEmergency ? 'Emergency Dispatch' : 'Field Assignment',
    actorName: actorLabel,
    eventKey: `FLD:WO:${wo.id}:ASSIGNED:${targetEngineer.id}`
  };
}

/**
 * Event B: Work Order Reassigned
 */
export function buildWorkOrderReassignedNotification(params: {
  wo: WorkOrder;
  newEngineer: { id: string; name: string };
  previousEngineer?: { id?: string; name?: string };
  actorLabel?: string;
  reason?: string;
  nowIso?: string;
}): AppNotification {
  const {
    wo,
    newEngineer,
    previousEngineer,
    actorLabel = 'Operations Supervisor',
    reason = 'Subdivision task re-allocation',
    nowIso = new Date().toISOString()
  } = params;

  const category = wo.complaintId || wo.type === 'Feeder Patrol & Maintenance' ? 'Outage' : 'Inspection';

  return {
    id: `NOTIF-${Date.now()}-FLD-WO-REASSIGN-${newEngineer.id}`,
    notificationType: 'WORK_ORDER_REASSIGNED',
    title: `Work Order Reassigned: ${wo.id}`,
    message: `Work order ${wo.id} (${wo.type}) reassigned to ${newEngineer.name}${previousEngineer?.name ? ` from ${previousEngineer.name}` : ''}. Reason: "${reason}". Priority: ${wo.priority}.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: newEngineer.id,
    workOrderId: wo.id,
    complaintId: wo.complaintId,
    applicationId: wo.applicationId,
    subdivision: wo.subdivision,
    type: 'warning',
    read: false,
    category,
    statusBadge: 'Work Order Reassigned',
    actorName: actorLabel,
    decisionAction: 'Work Order Reassigned',
    decisionReason: reason,
    eventKey: `FLD:WO:${wo.id}:REASSIGNED:${newEngineer.id}:${Date.now()}`
  };
}

/**
 * Event C: Work Order Priority or Schedule Changed
 */
export function buildWorkOrderUpdatedNotification(params: {
  wo: WorkOrder;
  assignedEngineerId: string;
  changedPriority?: WorkOrder['priority'];
  changedScheduledDate?: string;
  actorLabel?: string;
  notes?: string;
  nowIso?: string;
}): AppNotification {
  const {
    wo,
    assignedEngineerId,
    changedPriority,
    changedScheduledDate,
    actorLabel = 'Operations Desk',
    notes,
    nowIso = new Date().toISOString()
  } = params;

  const effectivePriority = changedPriority || wo.priority;
  const effectiveSchedule = changedScheduledDate || wo.scheduledDate;
  const isEmergency = effectivePriority === 'Emergency';
  const category = wo.complaintId || wo.type === 'Feeder Patrol & Maintenance' ? 'Outage' : 'Inspection';

  const changeDetails: string[] = [];
  if (changedPriority && changedPriority !== wo.priority) {
    changeDetails.push(`Priority updated to ${changedPriority}`);
  }
  if (changedScheduledDate && changedScheduledDate !== wo.scheduledDate) {
    changeDetails.push(`Scheduled date: ${changedScheduledDate}`);
  }
  const detailText = changeDetails.length > 0 ? changeDetails.join(' · ') : `Status/schedule updated to ${effectiveSchedule}`;

  return {
    id: `NOTIF-${Date.now()}-FLD-WO-UPD-${assignedEngineerId}`,
    notificationType: 'WORK_ORDER_UPDATED',
    title: `Work Order Updated: ${wo.id}`,
    message: `${detailText}.${notes ? ` Remarks: ${notes}` : ''}`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: assignedEngineerId,
    workOrderId: wo.id,
    complaintId: wo.complaintId,
    applicationId: wo.applicationId,
    subdivision: wo.subdivision,
    type: isEmergency ? 'alert' : 'info',
    read: false,
    category,
    statusBadge: 'Work Order Updated',
    actorName: actorLabel,
    eventKey: `FLD:WO:${wo.id}:UPDATED:${Date.now()}`
  };
}

/**
 * Event D: Inspection Work Order Dispatched/Scheduled
 */
export function buildSiteInspectionDispatchNotification(params: {
  woId: string;
  appId: string;
  applicantName: string;
  requestedLoadKw: number;
  subdivision: string;
  targetEngineerId: string;
  nowIso?: string;
}): AppNotification {
  const { woId, appId, applicantName, requestedLoadKw, subdivision, targetEngineerId, nowIso = new Date().toISOString() } = params;

  return {
    id: `NOTIF-${Date.now()}-FLD-INS`,
    notificationType: 'SITE_INSPECTION_ASSIGNED',
    title: `New Site Inspection Order: ${woId}`,
    message: `Feasibility check scheduled for ${applicantName} (${requestedLoadKw}kW) in ${subdivision}.`,
    time: 'Just now',
    createdAt: nowIso,
    formattedTimestamp: formatErpDateTime(nowIso),
    targetRole: 'field',
    role: 'field',
    targetUserId: targetEngineerId,
    type: 'info',
    read: false,
    category: 'Inspection',
    applicationId: appId,
    workOrderId: woId,
    subdivision,
    statusBadge: 'Site Inspection',
    eventKey: `FLD:${woId}:SITE_INSPECTION_ASSIGNED`
  };
}

/**
 * Event F: Offline Synchronization Outcome Notification
 */
export function buildOfflineSyncOutcomeNotification(params: {
  summary: FieldOfflineReplaySummary;
  activeEngineerId: string;
  nowIso?: string;
}): AppNotification | null {
  const { summary, activeEngineerId, nowIso = new Date().toISOString() } = params;

  if (summary.syncedCount > 0 && summary.failedCount === 0) {
    return {
      id: `NOTIF-${Date.now()}-FLD-SYNC-OK`,
      notificationType: 'FIELD_OFFLINE_SYNC_SUCCESS',
      title: `Offline Sync Completed: ${summary.syncedCount} Action(s)`,
      message: `Successfully synchronized ${summary.syncedCount} offline field inspection(s) and work order status update(s) to the ERP system.`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'field',
      role: 'field',
      targetUserId: activeEngineerId,
      type: 'success',
      read: false,
      category: 'Inspection',
      statusBadge: 'Sync Completed',
      eventKey: `FLD:SYNC_SUCCESS:${Date.now()}`
    };
  }

  if (summary.failedCount > 0) {
    return {
      id: `NOTIF-${Date.now()}-FLD-SYNC-CONFLICT`,
      notificationType: 'FIELD_OFFLINE_SYNC_CONFLICT',
      title: `Offline Sync Conflict: ${summary.failedCount} Item(s)`,
      message: `Offline synchronization completed with ${summary.syncedCount} item(s) applied and ${summary.failedCount} conflict/failure(s). Please review in Offline Queue.`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'field',
      role: 'field',
      targetUserId: activeEngineerId,
      type: 'warning',
      read: false,
      category: 'Inspection',
      statusBadge: 'Sync Conflict',
      eventKey: `FLD:SYNC_CONFLICT:${Date.now()}`
    };
  }

  return null;
}

/**
 * Reassigns an existing work order to a new engineer:
 * 1. Updates WorkOrder assignedTo and appends actionHistory.
 * 2. Invalidate/revokes previous engineer's pending assignment notification for this work order.
 * 3. Emits targeted notification to new engineer.
 */
export function reassignWorkOrderRecord(params: {
  woId: string;
  newEngineerIdOrName: string;
  reason?: string;
  actorUser: ActiveUserIdentity;
  effectiveRole: UserRole;
  workOrders: WorkOrder[];
  fieldEngineers: FieldEngineerRecord[];
  notifications: AppNotification[];
  nowIso?: string;
}): {
  success: boolean;
  error?: string;
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
  reassignNotification?: AppNotification;
} {
  const {
    woId,
    newEngineerIdOrName,
    reason,
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
      error: 'Consumers are strictly unauthorized to assign or reassign work orders.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const prevEngineer = resolveCanonicalFieldEngineerIdentity(targetWo.assignedTo, fieldEngineers);
  const newEngineer = resolveCanonicalFieldEngineerIdentity(newEngineerIdOrName, fieldEngineers);

  if (prevEngineer.id === newEngineer.id && targetWo.assignedTo.includes(newEngineer.name)) {
    return {
      success: false,
      error: `Work order #${woId} is already assigned to ${newEngineer.name} (${newEngineer.id}).`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const cleanReason = (reason || 'Operational re-dispatching').trim();

  // Update work order
  const updatedWo: WorkOrder = {
    ...targetWo,
    assignedTo: newEngineer.name,
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: targetWo.status,
        actor: `${actorUser.name} (${effectiveRole.toUpperCase()})`,
        notes: `Reassigned from ${prevEngineer.name} (${prevEngineer.id}) to ${newEngineer.name} (${newEngineer.id}). Reason: "${cleanReason}".`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  // Revoke former engineer's assignment notification for this work order
  const cleanedNotifications = notifications.filter(
    n => !(n.workOrderId === woId && n.targetRole === 'field' && n.targetUserId === prevEngineer.id)
  );

  const reassignNotification = buildWorkOrderReassignedNotification({
    wo: updatedWo,
    newEngineer,
    previousEngineer: prevEngineer,
    actorLabel: actorUser.name,
    reason: cleanReason,
    nowIso
  });

  const updatedNotifications = [reassignNotification, ...cleanedNotifications];

  return {
    success: true,
    updatedWorkOrders,
    updatedNotifications,
    reassignNotification
  };
}

/**
 * Updates priority and scheduled date of a work order and notifies the assigned engineer.
 */
export function updateWorkOrderPriorityAndScheduleRecord(params: {
  woId: string;
  newPriority?: WorkOrder['priority'];
  newScheduledDate?: string;
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
  updatedWorkOrders: WorkOrder[];
  updatedNotifications: AppNotification[];
  updateNotification?: AppNotification;
} {
  const {
    woId,
    newPriority,
    newScheduledDate,
    notes,
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
      error: 'Consumers cannot modify work order schedules or priorities.',
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const targetWo = workOrders.find(w => w.id === woId);
  if (!targetWo) {
    return {
      success: false,
      error: `Work order #${woId} was not found.`,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const priorityChanged = Boolean(newPriority && newPriority !== targetWo.priority);
  const scheduleChanged = Boolean(newScheduledDate && newScheduledDate !== targetWo.scheduledDate);

  if (!priorityChanged && !scheduleChanged && !notes) {
    return {
      success: true,
      updatedWorkOrders: workOrders,
      updatedNotifications: notifications
    };
  }

  const assignedEng = resolveCanonicalFieldEngineerIdentity(targetWo.assignedTo, fieldEngineers);

  const updatedWo: WorkOrder = {
    ...targetWo,
    ...(newPriority ? { priority: newPriority } : {}),
    ...(newScheduledDate ? { scheduledDate: newScheduledDate } : {}),
    actionHistory: [
      ...(targetWo.actionHistory || []),
      {
        timestamp: nowIso,
        stage: targetWo.status,
        actor: `${actorUser.name} (${effectiveRole.toUpperCase()})`,
        notes: `Work order parameters updated: Priority ${newPriority || targetWo.priority}, Scheduled: ${newScheduledDate || targetWo.scheduledDate}.${notes ? ` Notes: ${notes}` : ''}`
      }
    ]
  };

  const updatedWorkOrders = workOrders.map(w => (w.id === woId ? updatedWo : w));

  const updateNotification = buildWorkOrderUpdatedNotification({
    wo: updatedWo,
    assignedEngineerId: assignedEng.id,
    changedPriority: newPriority,
    changedScheduledDate: newScheduledDate,
    actorLabel: actorUser.name,
    notes,
    nowIso
  });

  const updatedNotifications = [updateNotification, ...notifications];

  return {
    success: true,
    updatedWorkOrders,
    updatedNotifications,
    updateNotification
  };
}

/**
 * Scopes notifications specifically for a Field Engineer session:
 * 1. Strictly filters out any notifications not intended for 'field' or 'all'.
 * 2. Enforces recipient isolation: If targetUserId is set, it MUST match activeUser.id.
 * 3. If workOrderId is present without targetUserId, matches against workOrders.assignedTo.
 * 4. If incidentId is present, enforces authorizeIncidentModalAccess.
 * 5. Applies read and dismissed state.
 */
export function filterFieldEngineerNotifications(params: {
  notifications: AppNotification[];
  workOrders: WorkOrder[];
  incidents: CriticalIncident[];
  activeUser: { id?: string; name?: string };
  readIds?: ReadonlySet<string>;
  dismissedIds?: ReadonlySet<string>;
}): AppNotification[] {
  const { notifications, workOrders, incidents, activeUser, readIds = new Set(), dismissedIds = new Set() } = params;

  const woMap = new Map<string, WorkOrder>();
  for (const w of workOrders) {
    woMap.set(w.id, w);
  }

  const result: AppNotification[] = [];
  const seenKeys = new Set<string>();

  for (const n of notifications) {
    if (!n) continue;
    if (dismissedIds.has(n.id)) continue;

    // Field engineers only receive field-targeted or system-wide notifications
    if (n.targetRole !== 'field' && n.targetRole !== 'all') {
      continue;
    }

    // 1. Strict recipient isolation when targetUserId is specified
    if (n.targetUserId && activeUser.id && n.targetUserId !== activeUser.id) {
      continue;
    }

    // 2. Incident-linked notification authorization check
    if (n.incidentId) {
      const inc = incidents.find(i => i.id === n.incidentId);
      if (inc) {
        const auth = authorizeIncidentModalAccess(inc, 'field', {
          id: activeUser.id,
          name: activeUser.name,
          role: 'field'
        });
        if (!auth.isAuthorized) {
          continue;
        }
      } else if (!n.targetUserId || !activeUser.id || n.targetUserId !== activeUser.id) {
        continue;
      }
    }

    // 3. WorkOrder-linked notification recipient check
    if (n.workOrderId && !n.targetUserId) {
      const linkedWo = woMap.get(n.workOrderId);
      if (linkedWo) {
        const assignedEng = resolveCanonicalFieldEngineerIdentity(linkedWo.assignedTo);
        if (activeUser.id && assignedEng.id !== activeUser.id) {
          continue;
        }
      }
    }

    // Deduplicate identical eventKey if present
    const dedupKey = n.eventKey || n.id;
    if (seenKeys.has(dedupKey)) {
      continue;
    }
    seenKeys.add(dedupKey);

    const healedTitle = n.title.startsWith('Escalated Incident:') && n.incidentId
      ? `Assigned Incident: ${n.incidentId}`
      : n.title;
    const healedMessage = n.message.startsWith('Escalated to Management') && n.incidentId
      ? `Assigned to ${activeUser.name || 'Field Engineer'}: ${n.message}`
      : n.message;

    result.push({
      ...n,
      title: healedTitle,
      message: healedMessage,
      read: Boolean(n.read || readIds.has(n.id))
    });
  }

  return result;
}

/**
 * Pure 4-language localization helper for Field Engineer notifications:
 * English (en), Gujarati (gu), Hindi (hi), Marathi (mr).
 */
export function localizeFieldNotification<T extends { title: string; message: string; eventType?: string; notificationType?: string }>(
  notif: T,
  lang: LanguageCode
): T {
  if (lang === 'en') {
    return notif;
  }

  let title = notif.title;
  let message = notif.message;
  let m: RegExpMatchArray | null = null;

  // --- TITLE MATCHERS ---
  if ((m = title.match(/^New Work Order Assigned:\s*([A-Za-z0-9-]+)$/i))) {
    const woId = m[1];
    title = ({
      en: title,
      gu: `નવો વર્ક ઓર્ડર સોંપાયો: ${woId}`,
      hi: `नया कार्य आदेश आवंटित: ${woId}`,
      mr: `नवीन वर्क ऑर्डर नेमले: ${woId}`
    })[lang];
  } else if ((m = title.match(/^Work Order Reassigned:\s*([A-Za-z0-9-]+)$/i))) {
    const woId = m[1];
    title = ({
      en: title,
      gu: `વર્ક ઓર્ડર પુનઃસોંપાયો: ${woId}`,
      hi: `कार्य आदेश पुनः आवंटित: ${woId}`,
      mr: `वर्क ऑर्डर पुन्हा नेमले: ${woId}`
    })[lang];
  } else if ((m = title.match(/^Work Order Updated:\s*([A-Za-z0-9-]+)$/i))) {
    const woId = m[1];
    title = ({
      en: title,
      gu: `વર્ક ઓર્ડર અપડેટ થયો: ${woId}`,
      hi: `कार्य आदेश अपडेट किया गया: ${woId}`,
      mr: `वर्क ऑर्डर अपडेट केले: ${woId}`
    })[lang];
  } else if ((m = title.match(/^New Site Inspection Order:\s*([A-Za-z0-9-]+)$/i))) {
    const woId = m[1];
    title = ({
      en: title,
      gu: `નવો સ્થળ નિરીક્ષણ ઓર્ડર: ${woId}`,
      hi: `नया स्थल निरीक्षण आदेश: ${woId}`,
      mr: `नवीन स्थळ तपासणी आदेश: ${woId}`
    })[lang];
  } else if ((m = title.match(/^New Dispatch:\s*([A-Za-z0-9-]+)$/i))) {
    const woId = m[1];
    title = ({
      en: title,
      gu: `નવું ડિસ્પેચ: ${woId}`,
      hi: `नया डिस्पैच: ${woId}`,
      mr: `नवीन डिस्पॅच: ${woId}`
    })[lang];
  } else if ((m = title.match(/^Urgent Field Dispatch:\s*([A-Za-z0-9-]+)$/i))) {
    const woId = m[1];
    title = ({
      en: title,
      gu: `તાત્કાલિક ક્ષેત્ર ડિસ્પેચ: ${woId}`,
      hi: `तत्काल फील्ड डिस्पैच: ${woId}`,
      mr: `तातडीचे फील्ड डिस्पॅच: ${woId}`
    })[lang];
  } else if ((m = title.match(/^Offline Sync Completed(?::\s*(\d+)\s*Action\(s\))?$/i))) {
    const count = m[1];
    title = ({
      en: title,
      gu: count ? `ઑફલાઇન સિંક પૂર્ણ: ${count} કામગીરી` : 'ઑફલાઇન સિંક પૂર્ણ',
      hi: count ? `ऑफ़लाइन सिंक पूर्ण: ${count} कार्रवाई` : 'ऑफ़लाइन सिंक पूर्ण',
      mr: count ? `ऑफलाइन सिंक पूर्ण: ${count} कृती` : 'ऑफलाइन सिंक पूर्ण'
    })[lang];
  } else if ((m = title.match(/^Offline Sync Conflict(?::\s*(\d+)\s*Item\(s\))?$/i))) {
    const count = m[1];
    title = ({
      en: title,
      gu: count ? `ઑફલાઇન સિંક સંઘર્ષ: ${count} બાબત` : 'ઑફલાઇન સિંક સંઘર્ષ',
      hi: count ? `ऑफ़लाइन सिंक टकराव: ${count} आइटम` : 'ऑफ़लाइन सिंक टकराव',
      mr: count ? `ऑफलाइन सिंक संघर्ष: ${count} घटक` : 'ऑफलाइन सिंक संघर्ष'
    })[lang];
  }

  // --- MESSAGE MATCHERS ---
  if (
    (m = message.match(
      /^Work order\s+([A-Za-z0-9-]+)\s+\(([^)]+)\)\s+in\s+(.+?)\s+assigned to\s+(.+?)\.\s*Priority:\s*([^.]+)\.\s*Location:\s*([^.]+)(?:\.\s*Note:\s*(.+))?$/i
    ))
  ) {
    const woId = m[1];
    const woType = m[2];
    const sub = localizeSubdivision(m[3], lang);
    const engName = m[4];
    const prio = m[5];
    const loc = m[6];
    const noteSuffix = m[7] ? ` નોંધ: ${m[7]}` : '';
    const noteSuffixHi = m[7] ? ` टिप्पणी: ${m[7]}` : '';
    const noteSuffixMr = m[7] ? ` टीप: ${m[7]}` : '';

    message = ({
      en: message,
      gu: `વર્ક ઓર્ડર ${woId} (${woType}) ${sub} માં ${engName} ને સોંપવામાં આવ્યો. અગ્રતા: ${prio}. સ્થળ: ${loc}.${noteSuffix}`,
      hi: `कार्य आदेश ${woId} (${woType}) ${sub} में ${engName} को आवंटित किया गया। प्राथमिकता: ${prio}। स्थल: ${loc}।${noteSuffixHi}`,
      mr: `वर्क ऑर्डर ${woId} (${woType}) ${sub} मध्ये ${engName} यांच्याकडे नेमले. प्राधान्य: ${prio}. ठिकाण: ${loc}.${noteSuffixMr}`
    })[lang];
  } else if (
    (m = message.match(
      /^Work order\s+([A-Za-z0-9-]+)\s+\(([^)]+)\)\s+reassigned to\s+(.+?)(?:\s+from\s+(.+?))?\.\s*Reason:\s*"([^"]+)"\.\s*Priority:\s*([^.]+)\.?$/i
    ))
  ) {
    const woId = m[1];
    const woType = m[2];
    const newEng = m[3];
    const prevEng = m[4];
    const reason = m[5];
    const prio = m[6];
    const fromSegment = prevEng ? ` (${prevEng} પાસેથી)` : '';
    const fromSegmentHi = prevEng ? ` (${prevEng} से)` : '';
    const fromSegmentMr = prevEng ? ` (${prevEng} यांच्याकडून)` : '';

    message = ({
      en: message,
      gu: `વર્ક ઓર્ડર ${woId} (${woType}) ${newEng} ને ફરીથી સોંપવામાં આવ્યો${fromSegment}. કારણ: "${reason}". અગ્રતા: ${prio}.`,
      hi: `कार्य आदेश ${woId} (${woType}) ${newEng} को पुनः आवंटित किया गया${fromSegmentHi}। कारण: "${reason}"। प्राथमिकता: ${prio}।`,
      mr: `वर्क ऑर्डर ${woId} (${woType}) ${newEng} यांच्याकडे पुन्हा नेमले${fromSegmentMr}. कारण: "${reason}". प्राधान्य: ${prio}.`
    })[lang];
  } else if (
    (m = message.match(
      /^Feasibility check scheduled for\s+(.+?)\s+\((\d+(?:\.\d+)?kW)\)\s+in\s+(.+)\.?$/i
    ))
  ) {
    const applicant = m[1];
    const load = m[2];
    const sub = localizeSubdivision(m[3], lang);
    message = ({
      en: message,
      gu: `${sub} માં ${applicant} (${load}) માટે સ્થળ શક્યતા ચકાસણી નિર્ધારિત કરાઈ.`,
      hi: `${sub} में ${applicant} (${load}) के लिए स्थल व्यवहार्यता जांच निर्धारित की गई।`,
      mr: `${sub} मध्ये ${applicant} (${load}) साठी स्थळ व्यवहार्यता तपासणी नियोजित केली.`
    })[lang];
  } else if (
    (m = message.match(
      /^Priority updated to\s+([^·]+)\s*·\s*Scheduled date:\s*([^.]+)(?:\.\s*Remarks:\s*(.+))?$/i
    ))
  ) {
    const prio = m[1].trim();
    const sched = m[2].trim();
    const rem = m[3] ? ` નોંધ: ${m[3]}` : '';
    const remHi = m[3] ? ` टिप्पणी: ${m[3]}` : '';
    const remMr = m[3] ? ` शेरा: ${m[3]}` : '';

    message = ({
      en: message,
      gu: `અગ્રતા ${prio} તરીકે અપડેટ કરાઈ · નિર્ધારિત તારીખ: ${sched}.${rem}`,
      hi: `प्राथमिकता ${prio} के रूप में अपडेट की गई · निर्धारित तिथि: ${sched}।${remHi}`,
      mr: `प्राधान्य ${prio} म्हणून अपडेट केले · नियोजित तारीख: ${sched}.${remMr}`
    })[lang];
  } else if (
    (m = message.match(
      /^Successfully synchronized\s+(\d+)\s+offline field inspection\(s\) and work order status update\(s\) to the ERP system\.$/i
    ))
  ) {
    const count = m[1];
    message = ({
      en: message,
      gu: `${count} ઑફલાઇન ક્ષેત્ર નિરીક્ષણ અને વર્ક ઓર્ડર સ્થિતિ ERP સિસ્ટમમાં સફળતાપૂર્વક સિંક થયા.`,
      hi: `${count} ऑफ़लाइन फील्ड निरीक्षण एवं कार्य आदेश स्थिति ERP प्रणाली में सफलतापूर्वक सिंक हुए।`,
      mr: `${count} ऑफलाइन फील्ड तपासण्या आणि वर्क ऑर्डर स्थिती ERP प्रणालीमध्ये यशस्वीरित्या सिंक झाल्या.`
    })[lang];
  } else if (
    (m = message.match(
      /^Offline synchronization completed with\s+(\d+)\s+item\(s\) applied and\s+(\d+)\s+conflict\/failure\(s\)\.\s*Please review in Offline Queue\.$/i
    ))
  ) {
    const applied = m[1];
    const failed = m[2];
    message = ({
      en: message,
      gu: `ઑફલાઇન સિંક પૂર્ણ: ${applied} લાગુ થયા અને ${failed} સંઘર્ષ/નિષ્ફળતા. કૃપા કરીને ઑફલાઇન કતારમાં સમીક્ષા કરો.`,
      hi: `ऑफ़लाइन सिंक पूर्ण: ${applied} लागू हुए एवं ${failed} टकराव/विफलता। कृपया ऑफ़लाइन कतार में समीक्षा करें।`,
      mr: `ऑफलाइन सिंक पूर्ण: ${applied} लागू झाले आणि ${failed} संघर्ष/अपयश. कृपया ऑफलाइन रांगेत तपासा.`
    })[lang];
  }

  return { ...notif, title, message };
}
