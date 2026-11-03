import {
  syncBackendSession,
  syncBackendSsoSession,
  registerBackendConsumerSession,
  clearBackendSession,
  logoutBackendCookieSession,
  notifyPortalIdentityChanged,
} from '../utils/backendSession';
import { clearOfflineFieldQueue } from '../utils/offlineFieldSync';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  NewConnectionApplication,
  ComplaintRecord,
  ElectricityBill,
  PaymentTransaction,
  WorkOrder,
  AppNotification,
  ElectricityConnection,
  AuditLogItem,
  ConsumerProfile,
  EmployeeRecord,
  FieldEngineerRecord,
  CriticalIncident,
  IncidentSeverity,
  IncidentStatus,
  EmergencyHazardClassification,
  AIActionRecommendation,
  WorkOrderCompletionReport,
  WorkOrderVerificationReview,
  ComplaintFeedback,
  LoadChangeDirection
} from '../types';
import {
  validateApprovalPermission,
  validateCurrentRecordState,
  generateGroundedRecommendations
} from '../utils/aiRecommendationEngine';
import {
  INITIAL_CONNECTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  INITIAL_CONSUMERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS,
  ROLE_PROFILES
} from '../data/mockData';
import {
  DemoSession,
  DemoUser,
  DEFAULT_DEMO_ACCOUNTS,
  CanonicalDemoIdentity,
  CANONICAL_DEMO_IDENTITIES,
  CANONICAL_FIELD_ENGINEERS,
  getCanonicalDemoAccountsByRole,
  getCanonicalIdentityById,
  resolveCanonicalDemoIdentity,
  getDefaultCanonicalIdentityForRole,
  createDemoSessionForIdentity,
  getStoredDemoSession,
  setStoredDemoSession,
  getCustomDemoUsers,
  saveCustomDemoUser,
  hashDemoPassword,
  verifyDemoPassword
} from '../data/demoAuthData';
import {
  ActiveUserIdentity,
  getActiveUserIdentity,
  getInitialsFromName
} from '../utils/avatarUtils';
import {
  AuthMode,
  SERVER_SESSION_MARKER,
  getStoredAuthMode,
  setStoredAuthMode,
  isDevAuthModeSwitchEnabled,
  resolveEffectiveAuthMode,
  loginWithServerApi,
  loginWithSimulatedSsoApi,
  signupWithServerApi,
  verifyServerSessionApi,
  logoutServerSessionApi
} from '../utils/authClient';
import {
  detectAnomalies,
  filterIncidentsByRole,
  filterIncidentsForSession,
  isConfirmedEmergencyHazard,
  normalizeAndHealIncidentRouting,
  authorizeEmployeeAction,
  authorizeManagementAction,
  authorizeFieldEngineerAction,
  resolveCanonicalEmployeeId,
  resolveIncidentOriginatingEmployee,
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  sanitizeAndScopeIncidentNotifications
} from '../utils/anomalyDetector';
import {
  formatErpDateTime,
  formatErpDateOnly,
  parseDateSafe,
  sortNotificationsNewestFirst
} from '../utils/dateUtils';
import {
  normalizeCanonicalSubdivision,
  normalizeCanonicalTariffCategory
} from '../i18n/consumerContentTranslations';
import {
  buildProactiveSlaNotifications,
  computeDynamicApplicationSlaFields,
  computeDynamicComplaintSlaFields,
  filterProactiveSlaNotificationsForRole
} from '../utils/slaEngine';
import {
  isAudioAlertsEnabled,
  toggleAudioAlerts,
  playIncidentSound
} from '../utils/audioAlerts';
import {
  isValidApplicationTransition,
  isValidComplaintTransition,
  isValidWorkOrderTransition,
  isActionAuthorized,
  canArchiveApplication,
  ensureSiteInspectionWorkOrderForApplication,
  reconcileApplicationWorkOrderLinks,
  SiteInspectionWorkOrderResolution
} from '../services/erpAdapter';
import { OperatingDataMode, isIncidentRoleAuthorized } from '../services/erpApiContracts';
import {
  defaultErpApiClient,
  getStoredDataMode,
  setStoredDataMode
} from '../services/apiClient';
import {
  ErpRepositoryBundle,
  createErpRepositoryBundle
} from '../services/repositories';
import {
  safeLoadStorage,
  redactSensitiveData,
  DuplicateSubmissionGuard
} from '../utils/securityHardening';
import {
  safeStorageSet
} from '../utils/safeStorage';
import {
  FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  FieldOfflineQueueItem,
  FieldOfflineReplaySummary,
  loadFieldOfflineQueue,
  enqueueFieldInspectionAction,
  enqueueFieldWorkOrderStatusAction,
  replayFieldOfflineQueue
} from '../utils/fieldOfflineQueue';
import {
  resolveCanonicalFieldEngineerIdentity,
  buildWorkOrderAssignedNotification,
  buildWorkOrderReassignedNotification,
  buildWorkOrderUpdatedNotification,
  buildSiteInspectionDispatchNotification,
  buildOfflineSyncOutcomeNotification,
  reassignWorkOrderRecord,
  updateWorkOrderPriorityAndScheduleRecord,
  filterFieldEngineerNotifications
} from '../utils/fieldNotificationEngine';
import {
  ConsumerAccountBillingSummary,
  ApplyPaymentToBillResult,
  SimulatedPaymentOutcome,
  selectConsumerAccountBillingSummary,
  applyPaymentToBill,
  generateDeterministicDemoBillForConnection,
  generateDeterministicBiMonthlyBillForConnection,
  resolveNextNonOverlappingBiMonthlyPeriod,
  evaluateGentleBillingReminders,
  createPaymentConfirmedNotification,
  normalizeBillingIdentifier
} from '../utils/billingEngine';
import type { RestoredLiveRuntimeState } from '../utils/demoBackupEngine';

export type { ActiveUserIdentity, AuthMode, OperatingDataMode, FieldOfflineQueueItem, FieldOfflineReplaySummary, ConsumerAccountBillingSummary, ApplyPaymentToBillResult, SimulatedPaymentOutcome, RestoredLiveRuntimeState };
export { getInitialsFromName };

export interface BackendSyncStatus {
  state: 'DEMO_ACTIVE' | 'LIVE_CONNECTED' | 'LIVE_UNAVAILABLE' | 'SYNCING';
  lastError?: string;
  lastRequestId?: string;
  lastCheckedAt?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

function loadStorage<T>(key: string, fallback: T): T {
  return safeLoadStorage<T>(key, fallback);
}

export function generateNextRecordId(
  existingIds: string[],
  prefix: string,
  minStartNumber: number,
  padDigits: number
): string {
  const existingSet = new Set(existingIds);
  let maxNum = minStartNumber - 1;
  for (const id of existingIds) {
    if (typeof id === 'string' && id.startsWith(prefix)) {
      const numericPart = parseInt(id.slice(prefix.length), 10);
      if (!Number.isNaN(numericPart) && numericPart > maxNum) {
        maxNum = numericPart;
      }
    }
  }
  let candidateNum = maxNum + 1;
  let candidate = `${prefix}${candidateNum.toString().padStart(padDigits, '0')}`;
  while (existingSet.has(candidate)) {
    candidateNum += 1;
    candidate = `${prefix}${candidateNum.toString().padStart(padDigits, '0')}`;
  }
  return candidate;
}

export function ensureUniqueRecordIds<T extends { id: string }>(
  records: T[],
  prefix: string,
  minStartNumber: number,
  padDigits: number
): T[] {
  if (!Array.isArray(records) || records.length <= 1) return records;
  const seenIds = new Set<string>();
  const allIds = records.map(r => r.id).filter(Boolean);
  const result = new Array<T>(records.length);

  // Traverse from end to start so canonical initial records at the tail keep their original IDs
  // and any earlier prepended duplicate entry gets reassigned a fresh collision-free ID.
  for (let i = records.length - 1; i >= 0; i--) {
    const item = records[i];
    if (!item || typeof item.id !== 'string') {
      result[i] = item;
      continue;
    }
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      result[i] = item;
    } else {
      const replacementId = generateNextRecordId(
        Array.from(new Set([...allIds, ...Array.from(seenIds)])),
        prefix,
        minStartNumber,
        padDigits
      );
      seenIds.add(replacementId);
      allIds.push(replacementId);
      result[i] = { ...item, id: replacementId };
    }
  }
  return result;
}

export interface NotificationInboxScopeState {
  readIds: string[];
  dismissedIds: string[];
  deliveredToastEventKeys: string[];
}

export function getNotificationInboxScopeKey(
  role: UserRole,
  session: DemoSession | null | undefined
): string {
  if (role === 'consumer') {
    const uid = session?.user?.id || 'demo_consumer';
    return `consumer:${uid}`;
  }
  const uid = session?.user?.id;
  if (uid) {
    return `role:${role}:${uid}`;
  }
  return `role:${role}`;
}

export function upsertNotificationList(
  existing: AppNotification[],
  incoming: AppNotification[]
): AppNotification[] {
  if (!incoming || incoming.length === 0) return existing;
  const result = [...existing];

  for (const notif of incoming) {
    if (!notif) continue;
    // Check if an identical eventKey or id already exists
    const dupIndex = result.findIndex(
      e => e.id === notif.id || (notif.eventKey && e.eventKey === notif.eventKey)
    );
    if (dupIndex !== -1) {
      // Update existing entry and move to top of inbox without creating a duplicate
      const updatedEntry = { ...result[dupIndex], ...notif };
      result.splice(dupIndex, 1);
      result.unshift(updatedEntry);
      continue;
    }

    // If this is an application lifecycle notification for a specific (applicationId, targetRole),
    // supersede any older stage notification for that same application & targetRole to prevent stale duplicates.
    const targetAppId = notif.applicationId || (notif.relatedEntityType === 'application' ? notif.relatedEntityId : undefined);
    if (targetAppId && (notif.targetRole === 'employee' || notif.targetRole === 'consumer')) {
      const priorIdx = result.findIndex(
        e =>
          (e.applicationId === targetAppId ||
            (e.relatedEntityType === 'application' && e.relatedEntityId === targetAppId)) &&
          e.targetRole === notif.targetRole
      );
      if (priorIdx !== -1) {
        result.splice(priorIdx, 1);
      }
    }

    result.unshift(notif);
  }

  return result;
}

/**
 * Determines whether an employee with a given subdivision / circle jurisdiction
 * is authorized to receive and review application notifications for `targetSubdivision`.
 */
export function isEmployeeAuthorizedForSubdivision(
  employeeSubdivision?: string | null,
  targetSubdivision?: string | null
): boolean {
  if (!employeeSubdivision || employeeSubdivision === 'All') {
    return true;
  }
  const empCanonical = normalizeCanonicalSubdivision(employeeSubdivision).toLowerCase();
  const targetCanonical = normalizeCanonicalSubdivision(targetSubdivision || 'Mehsana City North').toLowerCase();

  if (empCanonical === targetCanonical) {
    return true;
  }

  // Corporate Headquarters / Mehsana Corporate Circle oversees all UGVCL operational subdivisions
  if (
    empCanonical === 'mehsana corporate circle' ||
    empCanonical === 'central office' ||
    empCanonical.includes('corporate')
  ) {
    return true;
  }

  // Mehsana Circle covers Mehsana, Visnagar, and Kadi subdivisions
  if (empCanonical === 'mehsana circle') {
    return (
      targetCanonical.startsWith('mehsana') ||
      targetCanonical.startsWith('visnagar') ||
      targetCanonical.startsWith('kadi')
    );
  }

  // Gandhinagar Circle covers Gandhinagar and Kalol subdivisions
  if (empCanonical === 'gandhinagar circle') {
    return (
      targetCanonical.startsWith('gandhinagar') ||
      targetCanonical.startsWith('kalol')
    );
  }

  return false;
}

export function resolveAssignedOfficerForSubdivision(subdivision?: string | null): string {
  const canonical = normalizeCanonicalSubdivision(subdivision || 'Mehsana City North');
  if (
    canonical === 'Gandhinagar Sub-Division 2' ||
    canonical === 'Gandhinagar Circle' ||
    canonical === 'Kalol Sub-Division' ||
    canonical === 'Kalol Industrial Division'
  ) {
    return 'Pooja Shah (DEE Ops)';
  }
  if (
    canonical === 'Mehsana City North' ||
    canonical === 'Mehsana City South' ||
    canonical === 'Mehsana Industrial GIDC'
  ) {
    return 'Rajesh V. Trivedi (AE Ops)';
  }
  return 'Priya Rathod (EE Ops)';
}

export function buildApplicationLifecycleNotifications(
  app: NewConnectionApplication,
  stageOrEvent: NewConnectionApplication['status'] | 'Clarification Requested',
  note?: string,
  extra?: { newConsumerNo?: string; newMeterNo?: string },
  eventTimestamp?: string | number | Date | null
): { employeeNotif: AppNotification; consumerNotif: AppNotification | null } {
  const appId = app.id;
  const subdiv = normalizeCanonicalSubdivision(app.subdivision || 'Mehsana City North');
  const canonicalCategory = normalizeCanonicalTariffCategory(app.category || 'Residential (RGPU)');
  const loadLabel = `${app.requestedLoadKw}kW ${canonicalCategory}`;
  const resolvedDate = parseDateSafe(eventTimestamp) || new Date();
  const createdAtIso = resolvedDate.toISOString();
  const formattedTs = formatErpDateTime(resolvedDate);

  if (stageOrEvent === 'Submitted') {
    const employeeNotif: AppNotification = {
      id: `NOTIF-EMP-${appId}-SUBMITTED`,
      title: `New Application Submitted: ${appId}`,
      message: `${app.applicantName} submitted a ${loadLabel} application in ${subdiv}. Documents awaiting scrutiny.`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'employee',
      type: 'info',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Submitted',
      statusBadge: 'New Submission',
      eventType: 'APPLICATION_SUBMITTED',
      subdivision: subdiv,
      eventKey: `EVT-EMP-APP-${appId}-Submitted`
    };
    const consumerNotif: AppNotification = {
      id: `NOTIF-CNS-${appId}-SUBMITTED`,
      title: `Application Submitted: ${appId}`,
      message: `Your ${loadLabel} connection application has been registered. Estimated sanction cost: ₹${app.estimatedSanctionCost.toLocaleString()}.`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'consumer',
      type: 'info',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Submitted',
      statusBadge: 'New Submission',
      eventType: 'APPLICATION_SUBMITTED',
      accountId: app.accountId,
      targetConsumerAccountId: app.accountId,
      subdivision: subdiv,
      eventKey: `EVT-CNS-APP-${appId}-Submitted`
    };
    return { employeeNotif, consumerNotif };
  }

  if (stageOrEvent === 'Clarification Requested') {
    const reasonText = note || app.clarificationNote || 'Please verify and re-upload your supporting KYC or ownership documents.';
    const employeeNotif: AppNotification = {
      id: `NOTIF-EMP-${appId}-CLARIFICATION`,
      title: `Clarification Requested: ${appId}`,
      message: `Clarification requested from ${app.applicantName} (${loadLabel}): ${reasonText}`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'employee',
      type: 'warning',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Clarification Requested',
      statusBadge: 'Clarification Requested',
      eventType: 'CLARIFICATION_REQUESTED',
      subdivision: subdiv,
      eventKey: `EVT-EMP-APP-${appId}-Clarification`
    };
    const consumerNotif: AppNotification = {
      id: `NOTIF-CNS-${appId}-CLARIFICATION`,
      title: `Clarification Required: ${appId}`,
      message: `Action needed on application #${appId}: ${reasonText}`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'consumer',
      type: 'warning',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Clarification Requested',
      statusBadge: 'Clarification Required',
      eventType: 'CLARIFICATION_REQUESTED',
      accountId: app.accountId,
      targetConsumerAccountId: app.accountId,
      subdivision: subdiv,
      eventKey: `EVT-CNS-APP-${appId}-Clarification`
    };
    return { employeeNotif, consumerNotif };
  }

  if (stageOrEvent === 'Document Verification') {
    const employeeNotif: AppNotification = {
      id: `NOTIF-EMP-${appId}-DOCVER`,
      title: `Documents Awaiting Review: ${appId}`,
      message: `${app.applicantName} (${loadLabel}, ${subdiv}) is in Document Verification stage. Ready for site inspection dispatch.`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'employee',
      type: 'warning',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Document Verification',
      statusBadge: 'Document Verification',
      eventType: 'DOCUMENTS_AWAITING_REVIEW',
      subdivision: subdiv,
      eventKey: `EVT-EMP-APP-${appId}-Document Verification`
    };
    // Avoid repetitive intermediate consumer notification for internal document scrutiny
    return { employeeNotif, consumerNotif: null };
  }

  if (stageOrEvent === 'Site Inspection') {
    const employeeNotif: AppNotification = {
      id: `NOTIF-EMP-${appId}-SITEINSP`,
      title: `Inspection Dispatched: ${appId}`,
      message: `Field feasibility check assigned for ${app.applicantName} (${loadLabel}) in ${subdiv}.`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'employee',
      type: 'info',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Site Inspection',
      statusBadge: 'Site Inspection',
      eventType: 'INSPECTION_COMPLETED',
      subdivision: subdiv,
      eventKey: `EVT-EMP-APP-${appId}-Site Inspection`
    };
    return { employeeNotif, consumerNotif: null };
  }

  if (stageOrEvent === 'Sanction Approval') {
    const employeeNotif: AppNotification = {
      id: `NOTIF-EMP-${appId}-SANCTION`,
      title: `Sanction Approval Required: ${appId}`,
      message: `Inspection completed for ${app.applicantName} (${loadLabel}, ${subdiv}). Ready for final sanction release.`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'employee',
      type: 'warning',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Sanction Approval',
      statusBadge: 'Awaiting Approval',
      eventType: 'SANCTION_APPROVAL_REQUIRED',
      subdivision: subdiv,
      eventKey: `EVT-EMP-APP-${appId}-Sanction Approval`
    };
    const consumerNotif: AppNotification = {
      id: `NOTIF-CNS-${appId}-SANCTION`,
      title: `Application Approved for Sanction: ${appId}`,
      message: `Your ${loadLabel} application passed technical verification and load sanction is approved.`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'consumer',
      type: 'success',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Sanction Approval',
      statusBadge: 'Awaiting Approval',
      eventType: 'APPLICATION_APPROVED',
      accountId: app.accountId,
      targetConsumerAccountId: app.accountId,
      subdivision: subdiv,
      eventKey: `EVT-CNS-APP-${appId}-Sanction Approval`
    };
    return { employeeNotif, consumerNotif };
  }

  if (stageOrEvent === 'Meter Installed') {
    const connDetail = extra?.newConsumerNo
      ? ` Consumer No: ${extra.newConsumerNo} (Meter #${extra.newMeterNo || 'Smart Meter'}).`
      : '';
    const employeeNotif: AppNotification = {
      id: `NOTIF-EMP-${appId}-APPROVED`,
      title: `Application Approved & Energized: ${appId}`,
      message: `${app.applicantName} (${loadLabel}, ${subdiv}) connection approved and meter installed.${connDetail}`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'employee',
      type: 'success',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Meter Installed',
      statusBadge: 'Approved',
      eventType: 'APPLICATION_APPROVED',
      subdivision: subdiv,
      eventKey: `EVT-EMP-APP-${appId}-Meter Installed`
    };
    const consumerNotif: AppNotification = {
      id: `NOTIF-CNS-${appId}-APPROVED`,
      title: `Application Approved: ${appId}`,
      message: `Your ${loadLabel} connection application has been approved and smart meter installed.${connDetail}`,
      time: 'Just now',
      createdAt: createdAtIso,
      formattedTimestamp: formattedTs,
      targetRole: 'consumer',
      type: 'success',
      read: false,
      category: 'Approval',
      applicationId: appId,
      relatedEntityType: 'application',
      relatedEntityId: appId,
      applicationStatus: 'Meter Installed',
      statusBadge: 'Approved',
      eventType: 'APPLICATION_APPROVED',
      accountId: app.accountId,
      targetConsumerAccountId: app.accountId,
      subdivision: subdiv,
      eventKey: `EVT-CNS-APP-${appId}-Meter Installed`
    };
    return { employeeNotif, consumerNotif };
  }

  // Rejected
  const rejectionReason = note || 'Document or technical feasibility requirements were not met.';
  const employeeNotif: AppNotification = {
    id: `NOTIF-EMP-${appId}-REJECTED`,
    title: `Application Rejected: ${appId}`,
    message: `${app.applicantName} (${loadLabel}, ${subdiv}) marked Rejected. Reason: ${rejectionReason}`,
    time: 'Just now',
    createdAt: createdAtIso,
    formattedTimestamp: formattedTs,
    targetRole: 'employee',
    type: 'alert',
    read: false,
    category: 'Approval',
    applicationId: appId,
    relatedEntityType: 'application',
    relatedEntityId: appId,
    applicationStatus: 'Rejected',
    statusBadge: 'Rejected',
    eventType: 'APPLICATION_REJECTED',
    subdivision: subdiv,
    eventKey: `EVT-EMP-APP-${appId}-Rejected`
  };
  const consumerNotif: AppNotification = {
    id: `NOTIF-CNS-${appId}-REJECTED`,
    title: `Application Rejected: ${appId}`,
    message: `Your application #${appId} was rejected. Reason: ${rejectionReason}`,
    time: 'Just now',
    createdAt: createdAtIso,
    formattedTimestamp: formattedTs,
    targetRole: 'consumer',
    type: 'alert',
    read: false,
    category: 'Approval',
    applicationId: appId,
    relatedEntityType: 'application',
    relatedEntityId: appId,
    applicationStatus: 'Rejected',
    statusBadge: 'Rejected',
    eventType: 'APPLICATION_REJECTED',
    accountId: app.accountId,
    targetConsumerAccountId: app.accountId,
    subdivision: subdiv,
    eventKey: `EVT-CNS-APP-${appId}-Rejected`
  };
  return { employeeNotif, consumerNotif };
}

/**
 * Filters and enriches stored notifications for the Employee "Application Notifications" Center.
 * Strictly reads real stored notification records (never manufacturing notifications from queue entries)
 * and enforces subdivision / circle jurisdiction and deduplication.
 */
export function filterEmployeeApplicationNotifications(
  notifications: AppNotification[],
  applications: NewConnectionApplication[],
  options?: {
    subdivisionScope?: string | null;
    assignedOfficerName?: string | null;
    dismissedIds?: ReadonlySet<string>;
    readIds?: ReadonlySet<string>;
  }
): AppNotification[] {
  const dismissed = options?.dismissedIds;
  const readSet = options?.readIds;
  const subdivFilter = options?.subdivisionScope;
  const officerName = (options?.assignedOfficerName || '').toLowerCase();

  const appMap = new Map<string, NewConnectionApplication>(
    applications.map(a => [a.id, a])
  );
  const seenAppKeys = new Set<string>();
  const result: AppNotification[] = [];

  const sortedNotifications = sortNotificationsNewestFirst(notifications);

  for (const n of sortedNotifications) {
    if (!n || n.targetRole !== 'employee') continue;
    if (dismissed && dismissed.has(n.id)) continue;

    // Exclude non-application categories (Outage, Security, Billing) and proactive SLA notifications (which are combined separately in employeeNotifications)
    if (
      n.category === 'Security' ||
      n.category === 'Outage' ||
      n.category === 'Billing' ||
      n.notificationType === 'SLA_APPROACHING' ||
      n.notificationType === 'SLA_BREACHED' ||
      (n.eventKey && n.eventKey.startsWith('EVT-SLA-'))
    ) {
      continue;
    }

    const combinedText = `${n.title} ${n.message}`;
    const extractedAppId =
      n.applicationId ||
      (n.relatedEntityType === 'application' ? n.relatedEntityId : undefined) ||
      combinedText.match(/APP-\d{4}-\d+/)?.[0];
    if (!extractedAppId) continue;

    const canonicalApp = appMap.get(extractedAppId);
    if (canonicalApp?.isArchived) continue;

    const resolvedSubdiv = normalizeCanonicalSubdivision(
      n.subdivision || canonicalApp?.subdivision || 'Mehsana City North'
    );

    // Filter by employee subdivision / circle jurisdiction
    if (subdivFilter && subdivFilter !== 'All') {
      const matchesSubdiv = isEmployeeAuthorizedForSubdivision(subdivFilter, resolvedSubdiv);
      const matchesAssignedOfficer = Boolean(
        officerName &&
          canonicalApp?.assignedOfficer &&
          canonicalApp.assignedOfficer.toLowerCase().includes(officerName.split(' ')[0]) &&
          isEmployeeAuthorizedForSubdivision(subdivFilter, resolvedSubdiv)
      );
      if (!matchesSubdiv && !matchesAssignedOfficer) {
        continue;
      }
    }

    // Deduplicate per application so stale duplicate events are never displayed
    const dedupKey = n.eventKey || `${extractedAppId}:${n.applicationStatus || canonicalApp?.status || 'Submitted'}`;
    if (seenAppKeys.has(extractedAppId) || seenAppKeys.has(dedupKey)) {
      continue;
    }
    seenAppKeys.add(extractedAppId);
    seenAppKeys.add(dedupKey);

    const resolvedStatus: NewConnectionApplication['status'] | 'Clarification Requested' =
      n.applicationStatus ||
      (canonicalApp?.clarificationRequested ? 'Clarification Requested' : canonicalApp?.status) ||
      'Submitted';

    const resolvedBadge =
      n.statusBadge ||
      (resolvedStatus === 'Submitted'
        ? 'New Submission'
        : resolvedStatus === 'Meter Installed'
        ? 'Approved'
        : resolvedStatus === 'Sanction Approval'
        ? 'Awaiting Approval'
        : resolvedStatus);

    result.push({
      ...n,
      applicationId: extractedAppId,
      relatedEntityType: 'application',
      relatedEntityId: extractedAppId,
      applicationStatus: resolvedStatus,
      statusBadge: resolvedBadge,
      subdivision: resolvedSubdiv,
      read: Boolean(n.read || (readSet && readSet.has(n.id)))
    });
  }

  return sortNotificationsNewestFirst(result);
}

function saveStorage<T>(key: string, value: T): void {
  safeStorageSet(key, value);
}

interface AppContextType {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Centralized dynamic data collections
  consumers: ConsumerProfile[];
  connections: ElectricityConnection[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  employees: EmployeeRecord[];
  fieldEngineers: FieldEngineerRecord[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  notifications: AppNotification[];
  auditLogs: AuditLogItem[];
  // Offline simulation & persistent queue for Field Engineer
  isOfflineSimulated: boolean;
  setIsOfflineSimulated: (v: boolean) => void;
  isBrowserOffline: boolean;
  isFieldOfflineActive: boolean;
  isFieldSyncing: boolean;
  fieldOfflineQueue: FieldOfflineQueueItem[];
  enqueueFieldInspectionOffline: (
    woId: string,
    report: NonNullable<WorkOrder['inspectionReport']>,
    submittedBy: string
  ) => FieldOfflineQueueItem;
  enqueueFieldStatusOffline: (
    woId: string,
    status: WorkOrder['status'],
    report?: WorkOrder['inspectionReport']
  ) => FieldOfflineQueueItem;
  syncFieldOfflineQueue: (options?: {
    restoreOnline?: boolean;
    targetClientUuid?: string;
  }) => FieldOfflineReplaySummary;
  refreshFieldOfflineQueueFromStorage: () => FieldOfflineQueueItem[];
  // Cinematic Intro & Welcome Page states
  isIntroActive: boolean;
  setIsIntroActive: (v: boolean) => void;
  hasEnteredPlatform: boolean;
  setHasEnteredPlatform: (v: boolean) => void;
  replayIntro: () => void;
  exitToWelcomeScreen: () => void;
  // Modals and Drawers
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (v: boolean) => void;
  isRoleSwitcherModalOpen: boolean;
  setIsRoleSwitcherModalOpen: (v: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (v: boolean) => void;
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (v: boolean) => void;
  isWorkflowVisualizerOpen: boolean;
  setIsWorkflowVisualizerOpen: (v: boolean) => void;
  activeCaseDrawer: { type: 'application' | 'complaint' | 'workorder'; id: string } | null;
  openCaseDrawer: (type: 'application' | 'complaint' | 'workorder', id: string) => void;
  closeCaseDrawer: () => void;
  // Shared actions
  payBillDemo: (
    billNo: string,
    paymentMethod?: PaymentTransaction['paymentMethod'],
    customAmount?: number,
    options?: {
      simulatedOutcome?: SimulatedPaymentOutcome;
      simulatedFailureReason?: string;
    }
  ) => boolean;
  payBillDemoDetailed: (
    billNo: string,
    paymentMethod?: PaymentTransaction['paymentMethod'],
    customAmount?: number,
    options?: {
      simulatedOutcome?: SimulatedPaymentOutcome;
      simulatedFailureReason?: string;
    }
  ) => ApplyPaymentToBillResult;
  generateDemoBillForActiveConnection: (
    consumerNo: string,
    billMonth?: string,
    options?: {
      billingCycleType?: 'MONTHLY' | 'BI_MONTHLY';
    }
  ) => { created: boolean; bill: ElectricityBill | null; reason: string };
  submitApplicationDemo: (appData: Partial<NewConnectionApplication>) => string;
  submitComplaintDemo: (cmpData: Partial<ComplaintRecord>) => string;
  updateApplicationStatus: (id: string, status: NewConnectionApplication['status'], note?: string) => void;
  requestApplicationClarification: (id: string, clarificationNote: string) => void;
  archiveApplication: (id: string, reason?: string) => boolean;
  restoreApplication: (id: string) => boolean;
  updateComplaintStatus: (id: string, status: ComplaintRecord['status'], remark?: string) => void;
  updateWorkOrderStatus: (
    id: string,
    status: WorkOrder['status'],
    report?: WorkOrder['inspectionReport'],
    options?: { bypassOfflineQueue?: boolean; silentToast?: boolean }
  ) => { success: boolean; error?: string; conflict?: boolean };
  assignComplaintToField: (complaintId: string, engineerName: string, priority?: string, notes?: string) => boolean;
  assignWorkOrder: (woId: string, engineerIdOrName: string, notes?: string) => boolean;
  reassignWorkOrder: (woId: string, newEngineerIdOrName: string, reason?: string) => boolean;
  updateWorkOrderPriorityAndSchedule: (woId: string, priority?: WorkOrder['priority'], scheduledDate?: string, notes?: string) => boolean;
  reportFeederFault: (feederId: string, faultType: string, remarks: string, severity?: IncidentSeverity, emergencyClassification?: EmergencyHazardClassification) => void;
  markNotificationRead: (id: string) => void;
  markSelectedNotificationsRead: (ids: string[]) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteSelectedNotifications: (ids: string[]) => void;
  clearAllNotifications: () => void;
  addAuditEvent: (action: string, resource: string, metaDetail: string, actor?: string, status?: AuditLogItem['status']) => void;
  evaluateSlaDeadlinesNow: (referenceNow?: Date | string | number) => AppNotification[];
  resetDemoData: () => void;
  applyRestoredDemoBackupState: (restoredState: RestoredLiveRuntimeState) => void;
  // Toast notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  // Demonstration & Server Authentication Session & Controls
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  isVerifyingServerSession: boolean;
  demoSession: DemoSession | null;
  userConnections: ElectricityConnection[];
  selectedConsumerConnectionNo: string;
  setSelectedConsumerConnectionNo: (consumerNo: string) => void;
  consumerBillingSummary: ConsumerAccountBillingSummary;
  userApplications: NewConnectionApplication[];
  userBills: ElectricityBill[];
  userPayments: PaymentTransaction[];
  userComplaints: ComplaintRecord[];
  userNotifications: AppNotification[];
  employeeNotifications: AppNotification[];
  scopedNotifications: AppNotification[];
  linkConnectionDemo: (consumerNo: string) => { success: boolean; error?: string; connection?: ElectricityConnection };
  loginDemoUser: (email: string, password: string, targetRole: UserRole, selectedUserId?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsCanonicalDemoAccount: (accountId: string, targetRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  switchDemoUserAccount: (accountId: string) => { success: boolean; error?: string };
  canonicalDemoAccounts: CanonicalDemoIdentity[];
  signupDemoUser: (name: string, email: string, password: string, mobileNumber?: string) => Promise<{ success: boolean; error?: string }>;
  logoutDemoSession: () => Promise<void>;
  activeUser: ActiveUserIdentity;
  // Critical Incidents & Anomaly Management (Phase 2)
  incidents: CriticalIncident[];
  roleIncidents: CriticalIncident[];
  activeCriticalModalIncident: CriticalIncident | null;
  dismissCriticalModal: () => void;
  activeIncidentModalId: string | null;
  openIncidentModal: (incidentId: string) => void;
  closeIncidentModal: () => void;
  acknowledgeIncident: (id: string, notes?: string) => void;
  assignIncidentToField: (incidentId: string, engineerId: string, engineerName: string, notes?: string) => boolean;
  reassignIncidentToField: (incidentId: string, newEngineerId: string, newEngineerName: string, reason: string) => boolean;
  escalateIncident: (id: string, targetRole: UserRole, reason: string, targetUserId?: string, targetUserName?: string) => void;
  resolveIncident: (id: string, resolutionNotes: string) => void;
  updateIncidentSeverity: (id: string, newSeverity: IncidentSeverity, reason: string) => boolean;
  acceptFieldAssignment: (incidentId: string) => boolean;
  declineFieldAssignment: (incidentId: string, reason: string) => boolean;
  startFieldInspection: (incidentId: string, notes?: string) => boolean;
  submitFieldFindings: (incidentId: string, findings: string) => boolean;
  requestFieldAssistance: (incidentId: string, notes: string) => boolean;
  submitFieldResolutionReport: (incidentId: string, report: string) => boolean;
  approveEscalation: (incidentId: string, remarks?: string) => boolean;
  rejectEscalation: (incidentId: string, reason: string) => boolean;
  requestMoreInfo: (incidentId: string, question: string) => boolean;
  triggerDemoSimulatedIncident: () => void;
  audioAlertsEnabled: boolean;
  toggleAudio: () => void;
  unreadIncidentsCount: number;
  criticalIncidentsCount: number;
  // Phase 4: Human-in-the-Loop AI Recommendations & Approval Governance
  recommendations: AIActionRecommendation[];
  activeApprovalRecommendation: AIActionRecommendation | null;
  openApprovalModal: (rec: AIActionRecommendation) => void;
  closeApprovalModal: () => void;
  approveRecommendation: (id: string, decisionRemarks: string) => { success: boolean; error?: string };
  rejectRecommendation: (id: string, decisionRemarks: string) => { success: boolean; error?: string };
  executeRecommendation: (id: string) => { success: boolean; error?: string };
  proposeRecommendation: (rec: Omit<AIActionRecommendation, 'id' | 'createdAt' | 'status' | 'idempotencyKey'>) => string;
  // Phase 5: Persistent Backend Integration & Database Readiness
  dataMode: OperatingDataMode;
  setDataMode: (mode: OperatingDataMode) => void;
  backendStatus: BackendSyncStatus;
  syncWithBackend: () => Promise<{ success: boolean; error?: string; requestId?: string }>;
  repositories: ErpRepositoryBundle;
  // Phase 13 Field Completion Evidence & Complaint Feedback
  submitWorkOrderCompletionEvidence: (woId: string, report: WorkOrderCompletionReport) => boolean;
  reviewWorkOrderCompletion: (woId: string, review: WorkOrderVerificationReview) => boolean;
  submitComplaintFeedback: (complaintId: string, feedback: ComplaintFeedback) => boolean;
  reopenComplaint: (complaintId: string, reason: string) => ComplaintRecord | null;
  loginViaSimulatedSso: (
    email: string,
    targetRole: UserRole,
    providerId?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ROLE_DEFAULT_TABS: Record<UserRole, string> = {
  consumer: 'dashboard',
  employee: 'dashboard',
  field: 'dashboard',
  management: 'dashboard',
  admin: 'overview'
};

export const VALID_CONSUMER_TABS = new Set<string>([
  'dashboard',
  'connections',
  'new-connection',
  'bills',
  'payments',
  'complaints',
  'requests',
  'notifications',
  'profile'
]);

export function resolvePostLoginTab(
  authenticatedRole: UserRole,
  pendingConsumerTab?: string | null
): string {
  if (
    authenticatedRole === 'consumer' &&
    pendingConsumerTab &&
    VALID_CONSUMER_TABS.has(pendingConsumerTab)
  ) {
    return pendingConsumerTab;
  }
  return ROLE_DEFAULT_TABS[authenticatedRole];
}

const VALID_ROLES: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

export function isValidDemoSession(session: unknown): session is DemoSession {
  if (!session || typeof session !== 'object') return false;
  const s = session as Partial<DemoSession>;
  if (!s.role || !VALID_ROLES.includes(s.role)) return false;
  if (!s.user || typeof s.user !== 'object') return false;
  if (s.user.role !== s.role) return false;
  if (!s.sessionToken || typeof s.sessionToken !== 'string') return false;
  if (!s.user.email || typeof s.user.email !== 'string') return false;
  return true;
}

export interface ParsedRoute {
  role?: UserRole;
  tab?: string;
  entered?: boolean;
  isExplicitPortalRequest?: boolean;
}

export function parseCurrentUrl(urlHref?: string): ParsedRoute {
  if (typeof window === 'undefined' && !urlHref) {
    return { entered: false, isExplicitPortalRequest: false };
  }

  let searchStr = '';
  let hashStr = '';
  let pathnameStr = '';

  if (urlHref) {
    try {
      const u = new URL(urlHref, 'http://localhost:3000');
      searchStr = u.search;
      hashStr = u.hash;
      pathnameStr = u.pathname;
    } catch {
      if (urlHref.startsWith('#')) {
        hashStr = urlHref;
      }
    }
  } else if (typeof window !== 'undefined') {
    searchStr = window.location.search;
    hashStr = window.location.hash;
    pathnameStr = window.location.pathname;
  }

  // 1. Check query parameters: e.g. ?role=admin&tab=overview
  const searchParams = new URLSearchParams(searchStr);
  const paramRole = searchParams.get('role') as UserRole | null;
  const paramTab = searchParams.get('tab');
  if (paramRole && VALID_ROLES.includes(paramRole)) {
    return {
      role: paramRole,
      tab: paramTab || ROLE_DEFAULT_TABS[paramRole],
      entered: true,
      isExplicitPortalRequest: true,
    };
  }

  // 2. Check hash route (e.g. #/admin, #/management, #/employee/applications, #field)
  const cleanHash = hashStr.replace(/^#\/?/, '').trim();
  if (cleanHash) {
    const hashParts = cleanHash.split('/').filter(Boolean);
    const candidateRole = hashParts[0] as UserRole;
    if (candidateRole && VALID_ROLES.includes(candidateRole)) {
      return {
        role: candidateRole,
        tab: hashParts[1] || ROLE_DEFAULT_TABS[candidateRole],
        entered: true,
        isExplicitPortalRequest: true,
      };
    }
  }

  // 3. Check pathname: e.g. /admin, /employee/applications, /consumer
  const segments = pathnameStr.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] === 'welcome') {
    return { entered: false, isExplicitPortalRequest: false };
  }

  const roleCandidate = segments[0] as UserRole;
  if (VALID_ROLES.includes(roleCandidate)) {
    return {
      role: roleCandidate,
      tab: segments[1] || ROLE_DEFAULT_TABS[roleCandidate],
      entered: true,
      isExplicitPortalRequest: true,
    };
  }

  return { entered: false, isExplicitPortalRequest: false };
}

export interface RouteAccessDecision {
  authorized: boolean;
  role: UserRole;
  tab: string;
  entered: boolean;
  redirectToWelcome: boolean;
  denialReason?: string;
}

export const UNAUTHORIZED_NAVIGATION_MESSAGE =
  'Please sign in with the appropriate account to access this portal.';

export function resolveRouteAccess(
  route: ParsedRoute,
  session: DemoSession | null | undefined
): RouteAccessDecision {
  const isSessionValid = isValidDemoSession(session);

  // 1. If an explicit portal route is requested in the URL:
  if (route.isExplicitPortalRequest && route.role) {
    // If not authenticated, deny immediately
    if (!isSessionValid || !session) {
      return {
        authorized: false,
        role: 'consumer',
        tab: 'dashboard',
        entered: false,
        redirectToWelcome: true,
        denialReason: UNAUTHORIZED_NAVIGATION_MESSAGE,
      };
    }

    // If authenticated, the requested portal must match the session's role
    if (session.role !== route.role) {
      return {
        authorized: false,
        role: session.role,
        tab: ROLE_DEFAULT_TABS[session.role],
        entered: false,
        redirectToWelcome: true,
        denialReason: UNAUTHORIZED_NAVIGATION_MESSAGE,
      };
    }

    // Legitimate matching session
    return {
      authorized: true,
      role: session.role,
      tab: route.tab || ROLE_DEFAULT_TABS[session.role],
      entered: true,
      redirectToWelcome: false,
    };
  }

  // 2. If the route explicitly requests leaving the platform (e.g. / or /welcome)
  if (route.entered === false) {
    return {
      authorized: isSessionValid,
      role: isSessionValid && session ? session.role : 'consumer',
      tab: isSessionValid && session ? ROLE_DEFAULT_TABS[session.role] : 'dashboard',
      entered: false,
      redirectToWelcome: false,
    };
  }

  // 3. Normal state / refresh without explicit portal URL parameter:
  if (isSessionValid && session) {
    return {
      authorized: true,
      role: session.role,
      tab: route.tab || ROLE_DEFAULT_TABS[session.role],
      entered: route.entered ?? true,
      redirectToWelcome: false,
    };
  }

  // 4. Default unauthenticated state: stay at welcome screen
  return {
    authorized: false,
    role: 'consumer',
    tab: 'dashboard',
    entered: false,
    redirectToWelcome: false,
  };
}

interface ActivePortalRuntimeState {
  session: DemoSession;
  role: UserRole;
  tab: string;
  entered: boolean;
  authMode: AuthMode;
}

const ACTIVE_PORTAL_RUNTIME_KEY = 'vidyutflow_active_portal_runtime';

function getStoredActivePortalRuntime(): ActivePortalRuntimeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_PORTAL_RUNTIME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActivePortalRuntimeState>;
    if (
      !parsed ||
      !parsed.session ||
      !isValidDemoSession(parsed.session) ||
      !parsed.role ||
      !VALID_ROLES.includes(parsed.role) ||
      parsed.session.role !== parsed.role
    ) {
      return null;
    }
    return {
      session: parsed.session,
      role: parsed.role,
      tab: typeof parsed.tab === 'string' && parsed.tab ? parsed.tab : ROLE_DEFAULT_TABS[parsed.role],
      entered: Boolean(parsed.entered),
      authMode: parsed.authMode === 'demo' ? 'demo' : 'server',
    };
  } catch {
    return null;
  }
}

function setStoredActivePortalRuntime(state: ActivePortalRuntimeState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!state) {
      window.sessionStorage.removeItem(ACTIVE_PORTAL_RUNTIME_KEY);
    } else {
      window.sessionStorage.setItem(ACTIVE_PORTAL_RUNTIME_KEY, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota / security errors
  }
}

function isExplicitWelcomeLocation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const pathname = window.location.pathname || '';
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] === 'welcome') return true;
    const params = new URLSearchParams(search);
    if (params.get('welcome') === '1' || params.get('welcome') === 'true') return true;
    if (hash.replace(/^#\/?/, '').trim().startsWith('welcome')) return true;
    return false;
  } catch {
    return false;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authMode, setAuthModeState] = useState<AuthMode>(() =>
    resolveEffectiveAuthMode(getStoredAuthMode())
  );
  const [dataMode, setDataModeState] = useState<OperatingDataMode>(() => getStoredDataMode());
  const [backendStatus, setBackendStatus] = useState<BackendSyncStatus>(() => ({
    state: getStoredDataMode() === 'LIVE' ? 'SYNCING' : 'DEMO_ACTIVE'
  }));

  const initialRuntime = getStoredActivePortalRuntime();

  // Only read localStorage session when in development client 'demo' mode; in 'server' mode
  // (and unconditionally in production), localStorage sessions are ignored (never trusted, and never overwritten/deleted).
  const initialStoredSession = authMode === 'demo' ? getStoredDemoSession() : null;
  const validInitialSession =
    authMode === 'demo' && isValidDemoSession(initialStoredSession)
      ? initialStoredSession
      : authMode === 'server' &&
        initialRuntime &&
        initialRuntime.session.sessionToken === SERVER_SESSION_MARKER &&
        isValidDemoSession(initialRuntime.session)
      ? initialRuntime.session
      : null;

  if (authMode === 'demo' && initialStoredSession && !isValidDemoSession(initialStoredSession)) {
    setStoredDemoSession(null);
  }

  const initialRoute = parseCurrentUrl();
  const rawInitialDecision = resolveRouteAccess(initialRoute, validInitialSession);
  const shouldRestorePortalFromRuntime = Boolean(
    validInitialSession &&
      initialRuntime &&
      initialRuntime.entered &&
      initialRuntime.role === validInitialSession.role &&
      !initialRoute.isExplicitPortalRequest &&
      !rawInitialDecision.redirectToWelcome &&
      !isExplicitWelcomeLocation()
  );

  const initialDecision: RouteAccessDecision = shouldRestorePortalFromRuntime
    ? {
        ...rawInitialDecision,
        authorized: true,
        role: validInitialSession!.role,
        tab: initialRuntime!.tab || ROLE_DEFAULT_TABS[validInitialSession!.role],
        entered: true,
        redirectToWelcome: false,
      }
    : rawInitialDecision;

  // Active Authentication Session:
  // - In 'server' mode: starts null (or restored from active tab runtime) and is verified via GET /api/auth/me or POST /api/auth/login.
  // - In 'demo' mode: restored from valid localStorage demo session.
  const [demoSession, setDemoSession] = useState<DemoSession | null>(validInitialSession);
  const [isVerifyingServerSession, setIsVerifyingServerSession] = useState<boolean>(
    authMode === 'server' && !validInitialSession
  );

  const [currentRole, setCurrentRoleState] = useState<UserRole>(initialDecision.role);

  const [activeTab, setActiveTabState] = useState<string>(initialDecision.tab);

  // Standardized light theme across all pages with dark navy sidebar
  const [theme] = useState<'light' | 'dark'>('light');

  // Intro state disabled by default so the public welcome homepage loads immediately
  const [isIntroActive, setIsIntroActive] = useState<boolean>(false);

  // Welcome page vs Workspace Platform view (strictly controlled by authorization)
  const [hasEnteredPlatform, setHasEnteredPlatformState] = useState<boolean>(
    initialDecision.entered
  );

  // Centralized dynamic datasets with localStorage persistence
  const [consumers, setConsumers] = useState<ConsumerProfile[]>(() =>
    loadStorage('vidyutone_consumers', INITIAL_CONSUMERS)
  );

  const [connections, setConnections] = useState<ElectricityConnection[]>(() =>
    loadStorage('vidyutone_connections', INITIAL_CONNECTIONS)
  );

  const initialAppWoLinks = useMemo(() => {
    const rawApps = ensureUniqueRecordIds(
      loadStorage('vidyutone_applications', INITIAL_APPLICATIONS),
      'APP-2026-',
      846,
      4
    );
    const rawWos = ensureUniqueRecordIds(
      loadStorage('vidyutone_workorders', INITIAL_WORK_ORDERS),
      'WO-',
      4405,
      4
    );
    return reconcileApplicationWorkOrderLinks(rawApps, rawWos);
  }, []);

  const [applications, setApplications] = useState<NewConnectionApplication[]>(
    () => initialAppWoLinks.applications
  );

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() =>
    ensureUniqueRecordIds(
      loadStorage('vidyutone_complaints', INITIAL_COMPLAINTS),
      'CMP-',
      8831,
      4
    )
  );

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(
    () => initialAppWoLinks.workOrders
  );

  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    const stored = loadStorage('vidyutone_employees', INITIAL_EMPLOYEES);
    const mergedMap = new Map<string, EmployeeRecord>();
    for (const item of INITIAL_EMPLOYEES) {
      mergedMap.set(item.id, item);
    }
    for (const s of stored) {
      if (s && s.id) {
        mergedMap.set(s.id, { ...(mergedMap.get(s.id) || {}), ...s });
      }
    }
    return Array.from(mergedMap.values());
  });

  const [fieldEngineers, setFieldEngineers] = useState<FieldEngineerRecord[]>(() => {
    const stored = loadStorage('vidyutone_fieldengineers', CANONICAL_FIELD_ENGINEERS);
    const mergedMap = new Map<string, FieldEngineerRecord>();
    for (const item of CANONICAL_FIELD_ENGINEERS) {
      mergedMap.set(item.id, item);
    }
    for (const s of stored) {
      if (s && s.id) {
        mergedMap.set(s.id, { ...(mergedMap.get(s.id) || {}), ...s });
      }
    }
    return Array.from(mergedMap.values());
  });

  const [bills, setBills] = useState<ElectricityBill[]>(() =>
    loadStorage('vidyutone_bills', INITIAL_BILLS)
  );

  const [payments, setPayments] = useState<PaymentTransaction[]>(() =>
    loadStorage('vidyutone_payments', INITIAL_PAYMENTS)
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const stored = loadStorage('vidyutone_notifications', INITIAL_NOTIFICATIONS);
    const canonicalSeedById = new Map<string, AppNotification>(
      INITIAL_NOTIFICATIONS.map(n => [n.id, n])
    );
    const enriched = stored.map(n => {
      const seed = canonicalSeedById.get(n.id);
      if (!seed) return n;
      return {
        ...seed,
        ...n,
        createdAt: n.createdAt || seed.createdAt,
        formattedTimestamp: n.formattedTimestamp || seed.formattedTimestamp,
        applicationId: n.applicationId || seed.applicationId || (seed.relatedEntityType === 'application' ? seed.relatedEntityId : undefined),
        relatedEntityType: n.relatedEntityType || seed.relatedEntityType,
        relatedEntityId: n.relatedEntityId || seed.relatedEntityId,
        subdivision: n.subdivision || seed.subdivision,
        statusBadge: n.statusBadge || seed.statusBadge
      };
    });

    // Ensure any application already persisted in localStorage before this fix has a stored employee notification
    const storedApps = loadStorage('vidyutone_applications', INITIAL_APPLICATIONS);
    const hasEmpNotifForApp = new Set<string>();
    for (const n of enriched) {
      if (n && n.targetRole === 'employee') {
        const appId =
          n.applicationId ||
          (n.relatedEntityType === 'application' ? n.relatedEntityId : undefined) ||
          `${n.title} ${n.message}`.match(/APP-\d{4}-\d+/)?.[0];
        if (appId) hasEmpNotifForApp.add(appId);
      }
    }

    const backfilled: AppNotification[] = [];
    for (const app of storedApps) {
      if (!app || app.isArchived || hasEmpNotifForApp.has(app.id)) continue;
      const seedMatch = INITIAL_NOTIFICATIONS.find(
        sn => sn.targetRole === 'employee' && (sn.applicationId === app.id || sn.relatedEntityId === app.id)
      );
      if (seedMatch) {
        backfilled.push(seedMatch);
      } else {
        const stageOrEvent: NewConnectionApplication['status'] | 'Clarification Requested' =
          app.clarificationRequested ? 'Clarification Requested' : app.status;
        const lastNoteTs = app.notesHistory?.[app.notesHistory.length - 1]?.timestamp;
        const { employeeNotif } = buildApplicationLifecycleNotifications(
          app,
          stageOrEvent,
          app.clarificationNote,
          undefined,
          lastNoteTs || app.appliedDate
        );
        backfilled.push({
          ...employeeNotif,
          read: Boolean(app.status === 'Meter Installed' || app.status === 'Rejected')
        });
      }
      hasEmpNotifForApp.add(app.id);
    }

    return ensureUniqueRecordIds(
      [...backfilled, ...enriched],
      'NOTIF-',
      1000,
      4
    );
  });

  const [inboxStateMap, setInboxStateMap] = useState<Record<string, NotificationInboxScopeState>>(() =>
    loadStorage('vidyutflow_notification_inbox_state', {})
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() =>
    ensureUniqueRecordIds(
      loadStorage('vidyutone_auditlogs', AUDIT_LOGS),
      'AUD-',
      9930,
      4
    )
  );

  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [isBrowserOffline, setIsBrowserOffline] = useState<boolean>(
    () => typeof navigator !== 'undefined' && navigator.onLine === false
  );
  const isFieldOfflineActive = isOfflineSimulated || isBrowserOffline;
  const [fieldOfflineQueue, setFieldOfflineQueue] = useState<FieldOfflineQueueItem[]>(() =>
    loadFieldOfflineQueue()
  );
  const [isFieldSyncing, setIsFieldSyncing] = useState<boolean>(false);
  const fieldOfflineQueueRef = React.useRef<FieldOfflineQueueItem[]>(fieldOfflineQueue);
  const applicationsRef = React.useRef<NewConnectionApplication[]>(applications);
  const workOrdersRef = React.useRef<WorkOrder[]>(workOrders);
  const processedOfflineUuidsRef = React.useRef<Set<string>>(new Set());
  const isReplayingOfflineQueueRef = React.useRef<boolean>(false);

  // Modals & Drawers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRoleSwitcherModalOpen, setIsRoleSwitcherModalOpenState] = useState(false);
  const pendingConsumerTabRef = React.useRef<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isWorkflowVisualizerOpen, setIsWorkflowVisualizerOpen] = useState(false);
  const [activeCaseDrawer, setActiveCaseDrawer] = useState<{ type: 'application' | 'complaint' | 'workorder'; id: string } | null>(null);

  // Toast feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Critical Incidents & Warning Alarms (Phase 2)
  const [incidents, setIncidents] = useState<CriticalIncident[]>(() =>
    loadStorage<CriticalIncident[]>('vidyutflow_incidents', []).map(inc =>
      normalizeAndHealIncidentRouting(inc, INITIAL_FIELD_ENGINEERS)
    )
  );
  const [audioAlertsEnabled, setAudioAlertsEnabledState] = useState<boolean>(() =>
    isAudioAlertsEnabled()
  );
  const [activeCriticalModalIncident, setActiveCriticalModalIncident] = useState<CriticalIncident | null>(null);
  const dismissedCriticalModalIdsRef = React.useRef<Set<string>>(
    new Set(loadStorage<string[]>('vidyutflow_dismissed_modals', []))
  );
  const executedRecommendationIdsRef = React.useRef<Set<string>>(new Set());
  const submissionGuardRef = React.useRef<DuplicateSubmissionGuard>(new DuplicateSubmissionGuard(1500));

  // Human-in-the-Loop AI Action Recommendations (Phase 4)
  const [recommendations, setRecommendations] = useState<AIActionRecommendation[]>(() =>
    loadStorage('vidyut_ai_recommendations', [])
  );
  const [activeApprovalRecommendation, setActiveApprovalRecommendation] = useState<AIActionRecommendation | null>(null);

  // LocalStorage sync effects for persistent state across page refreshes
  useEffect(() => { saveStorage('vidyutone_consumers', consumers); }, [consumers]);
  useEffect(() => { saveStorage('vidyutone_connections', connections); }, [connections]);
  useEffect(() => { saveStorage('vidyutone_applications', applications); }, [applications]);
  useEffect(() => { saveStorage('vidyutone_complaints', complaints); }, [complaints]);
  useEffect(() => { saveStorage('vidyutone_workorders', workOrders); }, [workOrders]);
  useEffect(() => { saveStorage('vidyutone_employees', employees); }, [employees]);
  useEffect(() => { saveStorage('vidyutone_fieldengineers', fieldEngineers); }, [fieldEngineers]);
  useEffect(() => { saveStorage('vidyutone_bills', bills); }, [bills]);
  useEffect(() => { saveStorage('vidyutone_payments', payments); }, [payments]);
  useEffect(() => { saveStorage('vidyutone_notifications', notifications); }, [notifications]);
  useEffect(() => { saveStorage('vidyutflow_notification_inbox_state', inboxStateMap); }, [inboxStateMap]);
  useEffect(() => { saveStorage('vidyutone_auditlogs', auditLogs); }, [auditLogs]);
  useEffect(() => { saveStorage('vidyutflow_incidents', incidents); }, [incidents]);
  useEffect(() => { saveStorage('vidyut_ai_recommendations', recommendations); }, [recommendations]);

  useEffect(() => {
    fieldOfflineQueueRef.current = fieldOfflineQueue;
  }, [fieldOfflineQueue]);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  useEffect(() => {
    workOrdersRef.current = workOrders;
  }, [workOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsBrowserOffline(false);
    const handleOffline = () => setIsBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cross-tab synchronization for applications, notifications, inbox state, and offline queue
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      try {
        if (e.key === 'vidyutone_applications') {
          setApplications(loadStorage('vidyutone_applications', INITIAL_APPLICATIONS));
        } else if (e.key === 'vidyutone_notifications') {
          setNotifications(loadStorage('vidyutone_notifications', INITIAL_NOTIFICATIONS));
        } else if (e.key === 'vidyutflow_notification_inbox_state') {
          setInboxStateMap(loadStorage('vidyutflow_notification_inbox_state', {}));
        } else if (e.key === FIELD_OFFLINE_QUEUE_STORAGE_KEY) {
          const loaded = loadFieldOfflineQueue();
          fieldOfflineQueueRef.current = loaded;
          setFieldOfflineQueue(loaded);
        }
      } catch {
        // Ignore storage sync parse errors
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Apply dark theme class to document element and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark');
    body.classList.remove('dark');
    try {
      localStorage.setItem('vidyutone_theme', 'light');
    } catch {}
  }, []);

  const toggleTheme = () => {
    // Theme standardized to clean light theme with dark navy sidebar
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      const deduplicated = prev.filter(t => t.message !== message);
      return [...deduplicated.slice(-2), { id, message, type }];
    });
    setTimeout(() => {
      dismissToast(id);
    }, 3500);
  };

  // Authenticated session role is the authorization source of truth
  const effectiveRole: UserRole = demoSession ? demoSession.role : currentRole;

  // Dynamically resolve active user identity & initials from session/role
  const activeUser = useMemo<ActiveUserIdentity>(() => {
    return getActiveUserIdentity(demoSession, effectiveRole);
  }, [demoSession, effectiveRole]);

  // Selected active connection state for Consumer Portal (persisted per user account)
  const [selectedConsumerConnMap, setSelectedConsumerConnMap] = useState<Record<string, string>>(
    () => loadStorage<Record<string, string>>('vidyutflow_selected_consumer_connection', {})
  );

  useEffect(() => {
    saveStorage('vidyutflow_selected_consumer_connection', selectedConsumerConnMap);
  }, [selectedConsumerConnMap]);

  // Account-to-Consumer multi-tenant data scoping
  const userConnections = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return connections; // utility roles have global access
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();

    // Default fictional demo consumer owns the sample connections (04281-99231, 04281-77190) plus any demo_consumer connections
    if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
      const rawOwned = connections.filter(
        c => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190' || c.accountId === 'demo_consumer'
      );
      const canonicalOrder = ['04281-99231', '04281-77190'];
      return [...rawOwned].sort((a, b) => {
        const aIdx = canonicalOrder.indexOf(a.consumerNo);
        const bIdx = canonicalOrder.indexOf(b.consumerNo);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return 0;
      });
    }

    // Custom registered consumers only access connections specifically linked to their account
    const storedLinks = loadStorage<Record<string, string[]>>('vidyutflow_account_connections', {})[userId] || [];
    return connections.filter(
      c =>
        (c.accountId && c.accountId === userId) ||
        (c.accountEmail && c.accountEmail.toLowerCase() === userEmail) ||
        storedLinks.includes(c.consumerNo)
    );
  }, [demoSession, connections]);

  const consumerScopeUserId = demoSession?.user?.id || 'demo_consumer';

  // Build legacy/application connection alias map so bills linked by CONN- ID or application linkedConsumerNo resolve cleanly
  const legacyIdentifierMap = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const conn of userConnections) {
      const aliases: string[] = [];
      if (conn.connectionId) aliases.push(conn.connectionId);
      map[conn.consumerNo] = aliases;
    }
    return map;
  }, [userConnections]);

  const consumerBillingSummary = useMemo<ConsumerAccountBillingSummary>(() => {
    const storedLinks =
      loadStorage<Record<string, string[]>>('vidyutflow_account_connections', {})[
        consumerScopeUserId
      ] || [];
    const ownedNos = Array.from(
      new Set([
        ...userConnections.map(c => c.consumerNo),
        ...storedLinks
      ])
    );
    const explicitSelectedNo = selectedConsumerConnMap[consumerScopeUserId] || null;
    return selectConsumerAccountBillingSummary({
      allConnections: userConnections,
      allBills: bills,
      allPayments: payments,
      actorScope: {
        accountId: consumerScopeUserId,
        email: demoSession?.user?.email,
        linkedConsumerNo: userConnections[0]?.consumerNo,
        consumerName: demoSession?.user?.name,
        ownedConsumerNos: ownedNos,
        legacyIdentifierMap
      },
      selectedConnectionNo: explicitSelectedNo,
      referenceDate: '15-Oct-2026'
    });
  }, [
    userConnections,
    bills,
    payments,
    consumerScopeUserId,
    demoSession,
    selectedConsumerConnMap,
    legacyIdentifierMap
  ]);

  const selectedConsumerConnectionNo = consumerBillingSummary.selectedConnectionNo;

  const setSelectedConsumerConnectionNo = React.useCallback(
    (consumerNo: string) => {
      if (!consumerNo) return;
      setSelectedConsumerConnMap(prev => ({
        ...prev,
        [consumerScopeUserId]: consumerNo
      }));
    },
    [consumerScopeUserId]
  );

  const userApplications = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return applications;
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();

    if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
      return applications.filter(
        a => a.accountId === 'demo_consumer' || a.email.toLowerCase() === 'meenaben.patel@example.com' || a.id === 'APP-2026-0842'
      );
    }

    return applications.filter(
      a => (a.accountId && a.accountId === userId) || (a.email && a.email.toLowerCase() === userEmail)
    );
  }, [demoSession, applications]);

  const userBills = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return bills;
    return consumerBillingSummary.allAccountReconciledBills;
  }, [demoSession, bills, consumerBillingSummary]);

  const userPayments = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return payments;
    return consumerBillingSummary.allAccountPayments;
  }, [demoSession, payments, consumerBillingSummary]);

  const userComplaints = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return complaints;
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();
    const connectionNos = userConnections.map(c => c.consumerNo);

    if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
      return complaints.filter(
        c => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190' || c.accountId === 'demo_consumer'
      );
    }

    return complaints.filter(
      c =>
        (c.accountId && c.accountId === userId) ||
        (c.consumerNo && connectionNos.includes(c.consumerNo))
    );
  }, [demoSession, complaints, userConnections]);

  const inboxScopeKey = useMemo(
    () => getNotificationInboxScopeKey(effectiveRole, demoSession),
    [effectiveRole, demoSession]
  );

  const currentInboxScopeState = useMemo<NotificationInboxScopeState>(() => {
    return (
      inboxStateMap[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      }
    );
  }, [inboxStateMap, inboxScopeKey]);

  const userNotifications = useMemo(() => {
    if (!demoSession) return [];
    const readSet = new Set(currentInboxScopeState.readIds);
    const dismissedSet = new Set(currentInboxScopeState.dismissedIds);

    if (demoSession.role !== 'consumer') {
      return sortNotificationsNewestFirst(
        notifications
          .filter(n => !dismissedSet.has(n.id))
          .map(n => (readSet.has(n.id) ? { ...n, read: true } : n))
      );
    }

    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();
    const connectionNos = userConnections.map(c => c.consumerNo);
    const appIds = userApplications.map(a => a.id);
    const cmpIds = userComplaints.map(c => c.id);
    const billNos = userBills.map(b => b.billNo);

    const filtered = notifications
      .filter(n => {
        if (dismissedSet.has(n.id)) return false;
        if (n.targetRole !== 'consumer' && n.targetRole !== 'all') return false;

        // Never expose internal operational or SCADA/SLA diagnostics in consumer notifications
        if (
          n.notificationType === 'SLA_APPROACHING' ||
          n.notificationType === 'SLA_BREACHED' ||
          (n.eventKey && n.eventKey.startsWith('EVT-SLA-'))
        ) {
          return false;
        }
        const lowerText = `${n.title} ${n.message}`.toLowerCase();
        if (
          lowerText.includes('gerc sla breach') ||
          lowerText.includes('sub-divisional officer') ||
          lowerText.includes('scada') ||
          lowerText.includes('work order closed') ||
          lowerText.includes('new sanction file')
        ) {
          return false;
        }

        // Check explicit accountId match if provided
        if (n.accountId && n.accountId !== 'anonymous') {
          if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
            if (n.accountId !== 'demo_consumer' && !appIds.includes(n.applicationId || '')) {
              return false;
            }
          } else if (n.accountId !== userId) {
            return false;
          }
        }

        // Filter out demo consumer specific notifications for newly registered accounts
        if (
          n.message.includes('04281-99231') ||
          n.message.includes('04281-77190') ||
          n.message.includes('APP-2026-0842')
        ) {
          return (
            userId === 'demo_consumer' ||
            userEmail === 'consumer@vidyutflow.demo' ||
            connectionNos.includes('04281-99231') ||
            connectionNos.includes('04281-77190')
          );
        }

        // Verify ownership if notification explicitly references an APP-, CMP-, or BILL- ID
        const appMatch = `${n.title} ${n.message}`.match(/APP-\d{4}-\d+/);
        if (appMatch && !appIds.includes(appMatch[0])) {
          return false;
        }
        const cmpMatch = `${n.title} ${n.message}`.match(/CMP-\d+/);
        if (cmpMatch && !cmpIds.includes(cmpMatch[0])) {
          return false;
        }
        const billMatch = `${n.title} ${n.message}`.match(/BILL-[A-Z0-9-]+/);
        if (billMatch && !billNos.includes(billMatch[0])) {
          return false;
        }

        return true;
      })
      .map(n => (readSet.has(n.id) ? { ...n, read: true } : n));

    return sortNotificationsNewestFirst(filtered);
  }, [demoSession, notifications, userConnections, userApplications, userComplaints, userBills, currentInboxScopeState]);

  const employeeNotifications = useMemo(() => {
    const activeEmpRecord = employees.find(
      e =>
        e.id === activeUser.id ||
        e.name.toLowerCase() === activeUser.name.toLowerCase() ||
        e.email.toLowerCase() === (demoSession?.user.email || '').toLowerCase()
    );
    const effectiveSubdivisionScope =
      activeEmpRecord?.subdivision || activeUser.subdivision || 'Mehsana Corporate Circle';
    const dismissedSet = new Set(currentInboxScopeState.dismissedIds);
    const readSet = new Set(currentInboxScopeState.readIds);

    const appNotifs = filterEmployeeApplicationNotifications(
      notifications,
      applications,
      {
        subdivisionScope: effectiveSubdivisionScope,
        assignedOfficerName: activeUser.name,
        dismissedIds: dismissedSet,
        readIds: readSet
      }
    );

    const canonicalActiveEmpId = resolveCanonicalEmployeeId(activeUser.id, activeUser.name);

    const incidentDecisionNotifs = notifications
      .filter(n => {
        if (dismissedSet.has(n.id)) return false;
        if (n.targetRole !== 'employee') return false;
        if (!n.incidentId) return false;
        if (n.targetUserId) {
          const canonicalTargetEmpId = resolveCanonicalEmployeeId(n.targetUserId);
          if (canonicalActiveEmpId && canonicalTargetEmpId !== canonicalActiveEmpId) return false;
        } else {
          const linkedInc = incidents.find(inc => inc.id === n.incidentId);
          if (linkedInc) {
            const origEmp = resolveIncidentOriginatingEmployee(linkedInc);
            if (canonicalActiveEmpId && origEmp.id !== canonicalActiveEmpId) return false;
          }
        }
        return true;
      })
      .map(n => (readSet.has(n.id) ? { ...n, read: true } : n));

    const complaintAndWorkOrderNotifs = notifications
      .filter(n => {
        if (dismissedSet.has(n.id)) return false;
        if (n.targetRole !== 'employee') return false;
        if (n.incidentId || n.applicationId || n.relatedEntityType === 'application') return false;
        const hasCmpOrWo =
          Boolean(n.complaintId || n.workOrderId) ||
          /CMP-\d+|WO-[A-Z0-9-]+/.test(`${n.title} ${n.message}`);
        if (!hasCmpOrWo) return false;
        if (
          effectiveSubdivisionScope &&
          n.subdivision &&
          !isEmployeeAuthorizedForSubdivision(effectiveSubdivisionScope, n.subdivision)
        ) {
          return false;
        }
        return true;
      })
      .map(n => (readSet.has(n.id) ? { ...n, read: true } : n));

    const slaProactiveNotifs = filterProactiveSlaNotificationsForRole(
      notifications,
      'employee',
      {
        subdivisionScope: effectiveSubdivisionScope,
        dismissedIds: dismissedSet,
        readIds: readSet
      }
    );

    const seenIds = new Set<string>();
    const combined: AppNotification[] = [];
    for (const item of [
      ...appNotifs,
      ...incidentDecisionNotifs,
      ...complaintAndWorkOrderNotifs,
      ...slaProactiveNotifs
    ]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }
    return sortNotificationsNewestFirst(combined);
  }, [notifications, applications, employees, incidents, activeUser.id, activeUser.name, activeUser.subdivision, demoSession, currentInboxScopeState]);

  const scopedNotifications = useMemo(() => {
    if (effectiveRole === 'consumer') return userNotifications;
    if (effectiveRole === 'employee') return employeeNotifications;

    const readSet = new Set(currentInboxScopeState.readIds);
    const dismissedSet = new Set(currentInboxScopeState.dismissedIds);

    if (effectiveRole === 'field') {
      const fieldScoped = filterFieldEngineerNotifications({
        notifications,
        workOrders: workOrdersRef.current,
        incidents,
        activeUser: { id: activeUser.id, name: activeUser.name },
        readIds: readSet,
        dismissedIds: dismissedSet
      });
      return sortNotificationsNewestFirst(fieldScoped);
    }

    return sortNotificationsNewestFirst(
      sanitizeAndScopeIncidentNotifications(
        notifications,
        incidents,
        effectiveRole,
        activeUser,
        readSet,
        dismissedSet
      )
    );
  }, [effectiveRole, userNotifications, employeeNotifications, notifications, incidents, workOrders, activeUser, currentInboxScopeState]);

  // Deliver non-blocking auto-dismissing toast when a new actionable application notification arrives in scope
  useEffect(() => {
    if (!hasEnteredPlatform || !demoSession) return;
    const deliveredSet = new Set(currentInboxScopeState.deliveredToastEventKeys);
    const newCandidates = scopedNotifications.filter(
      n =>
        !n.read &&
        n.eventKey &&
        !deliveredSet.has(n.eventKey) &&
        n.time === 'Just now'
    );
    if (newCandidates.length === 0) return;

    const nextKeys = new Set(currentInboxScopeState.deliveredToastEventKeys);
    for (const candidate of newCandidates.slice(0, 2)) {
      if (candidate.eventKey) {
        nextKeys.add(candidate.eventKey);
      }
      const toastType: ToastMessage['type'] =
        candidate.type === 'success'
          ? 'success'
          : candidate.type === 'alert'
          ? 'error'
          : candidate.type === 'warning'
          ? 'warning'
          : 'info';
      showToast(`${candidate.title} — ${candidate.message}`, toastType);
    }

    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          deliveredToastEventKeys: Array.from(nextKeys)
        }
      };
    });
  }, [hasEnteredPlatform, demoSession, scopedNotifications, inboxScopeKey, currentInboxScopeState.deliveredToastEventKeys]);

  // Consumer-owned connection numbers for scoped anomaly detection
  const ownedConsumerNos = useMemo(() => {
    return new Set(userConnections.map(c => c.consumerNo));
  }, [userConnections]);

  // Persistent deduplication set for proactive SLA notifications
  const emittedSlaEventKeysRef = React.useRef<Set<string>>(
    new Set(loadStorage<string[]>('vidyutflow_sla_emitted_event_keys', []))
  );

  const evaluateSlaDeadlinesNow = React.useCallback(
    (referenceNow?: Date | string | number): AppNotification[] => {
      // Only evaluate non-seed newly created records OR records explicitly evaluated,
      // while preserving INITIAL_COMPLAINTS and INITIAL_APPLICATIONS seed dates untouched.
      const seedComplaintIds = new Set(INITIAL_COMPLAINTS.map(c => c.id));
      const seedApplicationIds = new Set(INITIAL_APPLICATIONS.map(a => a.id));

      const dynamicComplaints = complaints.filter(c => !seedComplaintIds.has(c.id));
      const dynamicApplications = applications.filter(a => !seedApplicationIds.has(a.id));

      const result = buildProactiveSlaNotifications({
        complaints: dynamicComplaints,
        applications: dynamicApplications,
        existingNotifications: notifications,
        emittedEventKeys: emittedSlaEventKeysRef.current,
        referenceNow
      });

      if (result.newNotifications.length > 0) {
        emittedSlaEventKeysRef.current = result.emittedEventKeys;
        saveStorage(
          'vidyutflow_sla_emitted_event_keys',
          Array.from(result.emittedEventKeys)
        );
        setNotifications(prev => upsertNotificationList(prev, result.newNotifications));
      }

      // Synchronize slaBreached flag on dynamically created complaints if their deadline passed
      setComplaints(prev => {
        let changed = false;
        const next = prev.map(c => {
          if (seedComplaintIds.has(c.id)) return c;
          const evalItem = result.evaluations.complaints[c.id];
          if (evalItem && evalItem.isBreached && !c.slaBreached) {
            changed = true;
            return { ...c, slaBreached: true };
          }
          if (evalItem && evalItem.isResolved && c.slaBreached) {
            changed = true;
            return { ...c, slaBreached: false };
          }
          return c;
        });
        return changed ? next : prev;
      });

      return result.newNotifications;
    },
    [complaints, applications, notifications]
  );

  // Bounded periodic SLA evaluation (every 60 seconds with clean teardown on unmount)
  useEffect(() => {
    if (!hasEnteredPlatform) return;
    evaluateSlaDeadlinesNow();
    const timerId = window.setInterval(() => {
      evaluateSlaDeadlinesNow();
    }, 60000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [hasEnteredPlatform, evaluateSlaDeadlinesNow]);

  // Persistent deduplication set for gentle billing reminders (Phase 5 Interim Fix)
  const emittedBillingReminderKeysRef = React.useRef<Set<string>>(
    new Set(loadStorage<string[]>('vidyutflow_billing_reminder_keys', []))
  );

  // Reactive gentle billing reminder evaluation for the active consumer's connections
  useEffect(() => {
    if (!demoSession || demoSession.role !== 'consumer' || userConnections.length === 0) return;

    const evalResult = evaluateGentleBillingReminders({
      ownedConnections: userConnections,
      bills,
      payments,
      existingNotifications: notifications,
      emittedReminderKeys: Array.from(emittedBillingReminderKeysRef.current),
      accountId: demoSession.user.id,
      referenceDate: '15-Oct-2026',
      language: 'en'
    });

    if (evalResult.newReminderKeys.length > 0) {
      emittedBillingReminderKeysRef.current = new Set(evalResult.updatedEmittedReminderKeys);
      saveStorage('vidyutflow_billing_reminder_keys', evalResult.updatedEmittedReminderKeys);
    }

    if (evalResult.newNotifications.length > 0 || evalResult.suppressedNotificationIds.length > 0) {
      const suppressSet = new Set(evalResult.suppressedNotificationIds);
      setNotifications(prev => {
        const cleaned = suppressSet.size > 0
          ? prev.map(n => (suppressSet.has(n.id) ? { ...n, read: true } : n))
          : prev;
        return upsertNotificationList(cleaned, evalResult.newNotifications);
      });
    }
  }, [demoSession, userConnections, bills, payments]);

  // Synchronize deterministic anomaly detection across ERP datasets (Phase 2)
  useEffect(() => {
    const detected = detectAnomalies({
      complaints,
      workOrders,
      auditLogs,
      bills,
      consumerOwnedNumbers: ownedConsumerNos
    });

    setIncidents(prevIncidents => {
      const existingMap = new Map<string, CriticalIncident>();
      for (const inc of prevIncidents) {
        existingMap.set(inc.id, inc);
      }

      const merged: CriticalIncident[] = [];
      const seenIds = new Set<string>();

      // Merge current detected anomalies while strictly preserving user lifecycle state & escalated roles
      for (const d of detected) {
        seenIds.add(d.id);
        const rawExisting = existingMap.get(d.id);
        if (rawExisting) {
          const existing = normalizeAndHealIncidentRouting(rawExisting, fieldEngineers);
          const mergedRoles = Array.from(
            new Set<UserRole>([
              ...d.responsibleRoles,
              ...(existing.responsibleRoles || []),
              ...(existing.escalatedTo ? [existing.escalatedTo as UserRole] : [])
            ])
          ).filter(r => r !== 'consumer');
          merged.push({
            ...d,
            ...existing,
            responsibleRoles: mergedRoles,
            status: existing.status,
            assignmentStatus: existing.assignmentStatus,
            history: existing.history,
            assignedToUserId: existing.assignedToUserId,
            assignedEngineerName: existing.assignedEngineerName,
            assignedAt: existing.assignedAt,
            assignedBy: existing.assignedBy,
            assignmentNotes: existing.assignmentNotes,
            previousEngineerId: existing.previousEngineerId,
            previousEngineerName: existing.previousEngineerName,
            lastDeclinedByUserId: existing.lastDeclinedByUserId,
            lastDeclinedByName: existing.lastDeclinedByName,
            lastDeclinedReason: existing.lastDeclinedReason,
            lastDeclinedAt: existing.lastDeclinedAt,
            escalatedTo: existing.escalatedTo,
            escalatedToUserId: existing.escalatedToUserId,
            escalatedToUserName: existing.escalatedToUserName,
            escalatedAt: existing.escalatedAt,
            escalatedBy: existing.escalatedBy,
            escalatedReason: existing.escalatedReason,
            approvalStatus: existing.approvalStatus,
            approvalDecisionBy: existing.approvalDecisionBy,
            approvalDecisionByUserId: existing.approvalDecisionByUserId,
            approvalDecisionAt: existing.approvalDecisionAt,
            approvalDecisionReason: existing.approvalDecisionReason,
            approvalDecisionRemarks: existing.approvalDecisionRemarks,
            inspectionStartedAt: existing.inspectionStartedAt,
            inspectionFindings: existing.inspectionFindings,
            assistanceRequestedNotes: existing.assistanceRequestedNotes,
            resolutionReport: existing.resolutionReport,
            resolutionReportSubmittedAt: existing.resolutionReportSubmittedAt,
            originatingEmployeeName: existing.originatingEmployeeName,
            originatingEmployeeUserId: existing.originatingEmployeeUserId,
            isEmergencyOverride: d.isEmergencyOverride ? true : undefined,
            emergencyClassification: d.emergencyClassification ?? 'NONE',
            emergencyBroadcastAt: d.emergencyBroadcastAt,
            acknowledgedBy: existing.acknowledgedBy,
            acknowledgedAt: existing.acknowledgedAt,
            resolvedBy: existing.resolvedBy,
            resolvedAt: existing.resolvedAt,
            resolutionNotes: existing.resolutionNotes
          });
        } else {
          merged.push(d);
        }
      }

      // Preserve simulated, feeder-fault, emergency, or progressed incidents not produced by static scan
      for (const rawInc of prevIncidents) {
        if (
          !seenIds.has(rawInc.id) &&
          (rawInc.isSimulated ||
            rawInc.id.startsWith('INC-FLT-') ||
            isConfirmedEmergencyHazard(rawInc) ||
            rawInc.status !== 'DETECTED')
        ) {
          const inc = normalizeAndHealIncidentRouting(rawInc, fieldEngineers);
          merged.push({
            ...inc,
            responsibleRoles: (inc.responsibleRoles || []).filter(r => r !== 'consumer')
          });
        }
      }

      // Performance optimization: avoid new array reference if incident state is unchanged
      if (
        merged.length === prevIncidents.length &&
        merged.every((m, idx) => {
          const p = prevIncidents[idx];
          return (
            p &&
            p.id === m.id &&
            p.status === m.status &&
            p.assignmentStatus === m.assignmentStatus &&
            p.lastDeclinedAt === m.lastDeclinedAt &&
            p.severity === m.severity &&
            p.escalatedTo === m.escalatedTo &&
            p.assignedToUserId === m.assignedToUserId &&
            p.approvalStatus === m.approvalStatus &&
            p.responsibleRoles.length === m.responsibleRoles.length &&
            p.history.length === m.history.length
          );
        })
      ) {
        return prevIncidents;
      }

      return merged;
    });
  }, [complaints, workOrders, auditLogs, bills, ownedConsumerNos]);

  // Automatically trigger modal and warning sound for new critical incidents for authorized operational roles ONLY
  useEffect(() => {
    if (!hasEnteredPlatform) return;
    // Consumers must NEVER receive internal critical incident modals or emergency audio alarms
    if (effectiveRole === 'consumer' || !isIncidentRoleAuthorized(effectiveRole)) {
      if (activeCriticalModalIncident) {
        setActiveCriticalModalIncident(null);
      }
      return;
    }

    const sessionAuthorizedIncidents = filterIncidentsForSession(incidents, effectiveRole, activeUser);
    const activeCritical = sessionAuthorizedIncidents.find(
      inc =>
        inc.severity === 'CRITICAL' &&
        inc.status === 'DETECTED' &&
        !dismissedCriticalModalIdsRef.current.has(inc.id)
    );

    if (activeCritical && (!activeCriticalModalIncident || activeCriticalModalIncident.id !== activeCritical.id)) {
      setActiveCriticalModalIncident(activeCritical);
      playIncidentSound('CRITICAL');
    }
  }, [incidents, effectiveRole, activeUser, hasEnteredPlatform, activeCriticalModalIncident]);

  const persistDismissedModalId = (id: string) => {
    dismissedCriticalModalIdsRef.current.add(id);
    saveStorage('vidyutflow_dismissed_modals', Array.from(dismissedCriticalModalIdsRef.current));
  };

  const dismissCriticalModal = () => {
    if (activeCriticalModalIncident) {
      persistDismissedModalId(activeCriticalModalIncident.id);
    }
    setActiveCriticalModalIncident(null);
  };

  const acknowledgeIncident = (id: string, notes?: string) => {
    if (!isIncidentRoleAuthorized(effectiveRole) || !isActionAuthorized(effectiveRole, 'PATCH /api/v1/incidents/:id/acknowledge')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to acknowledge operational incidents.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${id}`, `Unauthorized attempt to acknowledge incident by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }

    const targetInc = incidents.find(i => i.id === id);
    if (!targetInc) {
      showToast(`Incident #${id} not found.`, 'error');
      return;
    }

    const empAuth = authorizeEmployeeAction(targetInc, effectiveRole, activeUser);
    if (!empAuth.isAuthorized) {
      showToast(empAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${id}`, `Unauthorized attempt to acknowledge incident by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return;
    }

    const actor = activeUser.name || effectiveRole.toUpperCase();
    const nowIso = new Date().toISOString();
    persistDismissedModalId(id);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== id) return inc;
        const nextStatus = inc.status === 'DETECTED' ? ('ACKNOWLEDGED' as const) : inc.status;
        const newEvent = {
          timestamp: nowIso,
          stage: 'ACKNOWLEDGED' as const,
          actor,
          notes: notes || 'Incident acknowledged in Operations Dashboard.'
        };
        return {
          ...inc,
          status: nextStatus,
          acknowledgedBy: actor,
          acknowledgedAt: nowIso,
          history: [...inc.history, newEvent]
        };
      })
    );

    if (activeCriticalModalIncident?.id === id) {
      setActiveCriticalModalIncident(null);
    }

    const ackNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-ACK-${id}`,
      notificationType: 'ACKNOWLEDGED',
      title: `Incident Acknowledged: ${id}`,
      message: `Incident ${id} has been acknowledged by ${actor}. Initial triage underway.`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: activeUser.id,
      incidentId: id,
      actionUrl: `/employee/incidents?incident=${id}`,
      type: 'info',
      read: false,
      category: 'Outage',
      statusBadge: 'Acknowledged',
      subdivision: targetInc.subdivision,
      actorName: actor,
      actorRole: effectiveRole,
      eventKey: `EVT-INC-${id}-ACK`
    };
    setNotifications(prev => upsertNotificationList(prev, [ackNotif]));

    addAuditEvent('INCIDENT_ACKNOWLEDGED', id, `Incident acknowledged by ${actor}. ${notes || ''}`, actor);
    showToast(`Incident ${id} acknowledged.`, 'info');
  };

  const [activeIncidentModalId, setActiveIncidentModalId] = useState<string | null>(null);
  const openIncidentModal = (id: string) => {
    setActiveIncidentModalId(id);
  };
  const closeIncidentModal = () => {
    setActiveIncidentModalId(null);
  };

  const assignIncidentToField = (
    incidentId: string,
    engineerId: string,
    engineerName: string,
    notes?: string
  ): boolean => {
    if (!isIncidentRoleAuthorized(effectiveRole) || !isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/assign')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot assign incidents to field crews.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized attempt to assign incident by ${effectiveRole}`, activeUser.name, 'WARNING');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident #${incidentId} not found.`, 'error');
      return false;
    }

    const empAuth = authorizeEmployeeAction(targetInc, effectiveRole, activeUser);
    if (!empAuth.isAuthorized) {
      showToast(empAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized attempt to assign incident by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const canonicalEngineer =
      fieldEngineers.find(f => f.id === engineerId) ||
      getCanonicalIdentityById(engineerId);
    const resolvedEngineerId = canonicalEngineer?.id || engineerId;
    const resolvedEngineerName = canonicalEngineer?.name || engineerName;

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || effectiveRole.toUpperCase();
    const prevEngineerId = targetInc.assignedToUserId || targetInc.lastDeclinedByUserId;
    const prevEngineerName = targetInc.assignedEngineerName || targetInc.lastDeclinedByName;
    const isReassignment = Boolean(prevEngineerId && prevEngineerId !== resolvedEngineerId);

    const recordResult = reassignIncidentRecord(
      targetInc,
      resolvedEngineerId,
      resolvedEngineerName,
      notes,
      actor,
      activeUser.id,
      effectiveRole,
      [],
      nowIso,
      activeUser.subdivision
    );

    if (!recordResult.success) {
      showToast(recordResult.denialReason || 'Access Denied: Cannot assign or reassign incident.', 'error');
      addAuditEvent(
        'ACCESS_DENIED',
        `Incident:${incidentId}`,
        `Unauthorized attempt to assign/reassign incident by ${activeUser.name} (${activeUser.id})`,
        activeUser.name,
        'WARNING'
      );
      return false;
    }

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const { updatedIncident } = reassignIncidentRecord(
          inc,
          resolvedEngineerId,
          resolvedEngineerName,
          notes,
          actor,
          activeUser.id,
          effectiveRole,
          [],
          nowIso,
          activeUser.subdivision
        );
        return updatedIncident;
      })
    );

    setNotifications(prev => {
      const { updatedNotifications } = reassignIncidentRecord(
        targetInc,
        resolvedEngineerId,
        resolvedEngineerName,
        notes,
        actor,
        activeUser.id,
        effectiveRole,
        prev,
        nowIso,
        activeUser.subdivision
      );
      return updatedNotifications;
    });

    if (isReassignment) {
      addAuditEvent(
        'INCIDENT_REASSIGNED_TO_FIELD',
        incidentId,
        `Reassigned from ${prevEngineerName || prevEngineerId} (${prevEngineerId}) to ${resolvedEngineerName} (${resolvedEngineerId}) by ${actor}. Reason: ${notes || 'Operational reassignment'}`,
        actor
      );
      showToast(
        `Incident ${incidentId} reassigned from ${prevEngineerName || prevEngineerId} to ${resolvedEngineerName} (${resolvedEngineerId}).`,
        'info'
      );
    } else {
      addAuditEvent(
        'INCIDENT_ASSIGNED_TO_FIELD',
        incidentId,
        `Assigned to ${resolvedEngineerName} (${resolvedEngineerId}) by ${actor}. ${notes || ''}`,
        actor
      );
      showToast(`Incident ${incidentId} assigned to ${resolvedEngineerName} (${resolvedEngineerId}). Field dispatch alerted.`, 'info');
    }
    return true;
  };

  const reassignIncidentToField = (
    incidentId: string,
    newEngineerId: string,
    newEngineerName: string,
    reason: string
  ): boolean => {
    if (!isIncidentRoleAuthorized(effectiveRole) || !isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/assign')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot reassign incidents to field crews.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized attempt to reassign incident by ${effectiveRole}`, activeUser.name, 'WARNING');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident #${incidentId} not found.`, 'error');
      return false;
    }

    const empAuth = authorizeEmployeeAction(targetInc, effectiveRole, activeUser);
    if (!empAuth.isAuthorized) {
      showToast(empAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized attempt to reassign incident by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      showToast('Mandatory reassignment reason is required.', 'warning');
      return false;
    }
    return assignIncidentToField(incidentId, newEngineerId, newEngineerName, cleanReason);
  };

  const escalateIncident = (
    id: string,
    targetRole: UserRole,
    reason: string,
    targetUserId?: string,
    targetUserName?: string
  ) => {
    if (!isIncidentRoleAuthorized(effectiveRole) || !isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/escalate')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to escalate operational incidents.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${id}`, `Unauthorized attempt to escalate incident by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }

    const targetInc = incidents.find(i => i.id === id);
    if (!targetInc) {
      showToast(`Incident #${id} not found.`, 'error');
      return;
    }

    const empAuth = authorizeEmployeeAction(targetInc, effectiveRole, activeUser);
    if (!empAuth.isAuthorized) {
      showToast(empAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${id}`, `Unauthorized attempt to escalate incident by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return;
    }

    const safeTargetRole: UserRole = targetRole === 'consumer' ? 'management' : targetRole;
    persistDismissedModalId(id);

    // Fix: When an employee selects "Field Engineer (Substation JE)" (targetRole === 'field'),
    // resolve the target Field Engineer account and create a canonical targeted engineer assignment
    // rather than an untargeted generic escalation.
    if (safeTargetRole === 'field') {
      const matchedEngineer =
        (targetUserId && fieldEngineers.find(f => f.id === targetUserId)) ||
        (targetUserName &&
          fieldEngineers.find(f => f.name.toLowerCase() === targetUserName.toLowerCase())) ||
        (targetInc?.subdivision &&
          fieldEngineers.find(
            f =>
              f.subdivision.toLowerCase().includes(targetInc.subdivision!.toLowerCase()) ||
              targetInc.subdivision!.toLowerCase().includes(f.subdivision.toLowerCase())
          )) ||
        fieldEngineers[0];

      const resolvedEngineerId = targetUserId || matchedEngineer?.id || 'FLD-UG-201';
      const resolvedEngineerName = targetUserName || matchedEngineer?.name || 'Vikramaditya Solanki';

      assignIncidentToField(id, resolvedEngineerId, resolvedEngineerName, reason);
      return;
    }

    const actor = activeUser.name || effectiveRole.toUpperCase();
    const nowIso = new Date().toISOString();

    const prevStatus = targetInc?.status || 'DETECTED';

    const resolvedTargetUserId =
      targetUserId || (safeTargetRole === 'management' ? 'usr_mgmt_01' : undefined);
    const resolvedTargetUserName =
      targetUserName || (safeTargetRole === 'management' ? 'Rajesh Solanki' : undefined);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== id) return inc;
        const newEvent = {
          id: `EVT-INC-${id}-ESC-${Date.now()}`,
          incidentId: id,
          timestamp: nowIso,
          stage: 'ESCALATED' as const,
          eventType: 'ESCALATED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: resolvedTargetUserName || safeTargetRole,
          targetUserId: resolvedTargetUserId,
          targetRole: safeTargetRole,
          notes: `Escalated to ${safeTargetRole.toUpperCase()}${resolvedTargetUserName ? ` (${resolvedTargetUserName})` : ''}: ${reason}`,
          reason,
          previousStatus: prevStatus,
          newStatus: 'ESCALATED' as const,
          approvalStatus: 'PENDING_APPROVAL' as const
        };
        const updatedRoles = Array.from(new Set<UserRole>([...inc.responsibleRoles, safeTargetRole])).filter(
          r => r !== 'consumer'
        );
        return {
          ...inc,
          responsibleRoles: updatedRoles,
          status: 'ESCALATED' as const,
          escalatedTo: safeTargetRole,
          escalatedToUserId: resolvedTargetUserId,
          escalatedToUserName: resolvedTargetUserName,
          escalatedAt: nowIso,
          escalatedBy: actor,
          escalatedReason: reason,
          approvalStatus: 'PENDING_APPROVAL' as const,
          originatingEmployeeName: inc.originatingEmployeeName || actor,
          originatingEmployeeUserId:
            effectiveRole === 'employee'
              ? resolveCanonicalEmployeeId(activeUser.id, actor)
              : resolveCanonicalEmployeeId(inc.originatingEmployeeUserId, inc.originatingEmployeeName),
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify targeted management/supervisory recipient (deduplicated via eventKey)
    const mgmtNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-MGMT-ESC`,
      title: `Escalated Incident: ${id}`,
      message: `Escalated to ${safeTargetRole === 'management' ? 'Management' : safeTargetRole.toUpperCase()}${resolvedTargetUserName ? ` (${resolvedTargetUserName})` : ''} by ${actor}: ${reason}`,
      time: 'Just now',
      createdAt: nowIso,
      targetRole: safeTargetRole,
      targetUserId: resolvedTargetUserId,
      incidentId: id,
      type: 'warning',
      read: false,
      category: 'Approval',
      subdivision: targetInc?.subdivision,
      actorName: actor,
      actorRole: effectiveRole,
      eventKey: `EVT-MGMT-ESC-${id}-${resolvedTargetUserId || safeTargetRole}`
    };
    setNotifications(prev => upsertNotificationList(prev, [mgmtNotif]));

    addAuditEvent('INCIDENT_ESCALATED', id, `Escalated to ${safeTargetRole}${resolvedTargetUserName ? ` (${resolvedTargetUserName})` : ''}: ${reason}`, actor);
    showToast(`Incident ${id} escalated to ${safeTargetRole.toUpperCase()}${resolvedTargetUserName ? ` (${resolvedTargetUserName})` : ''}.`, 'warning');
  };

  const resolveIncident = (id: string, resolutionNotes: string) => {
    if (!isIncidentRoleAuthorized(effectiveRole) || !isActionAuthorized(effectiveRole, 'PATCH /api/v1/incidents/:id/resolve')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to resolve operational incidents.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${id}`, `Unauthorized attempt to resolve incident by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }

    const targetInc = incidents.find(i => i.id === id);
    if (!targetInc) {
      showToast(`Incident #${id} not found.`, 'error');
      return;
    }

    const empAuth = authorizeEmployeeAction(targetInc, effectiveRole, activeUser);
    if (!empAuth.isAuthorized) {
      showToast(empAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${id}`, `Unauthorized attempt to resolve incident by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return;
    }

    const actor = activeUser.name || effectiveRole.toUpperCase();
    const nowIso = new Date().toISOString();
    dismissedCriticalModalIdsRef.current.add(id);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== id) return inc;
        const newEvent = {
          id: `EVT-INC-${id}-RES-${Date.now()}`,
          incidentId: id,
          timestamp: nowIso,
          stage: 'RESOLVED' as const,
          eventType: 'RESOLVED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          notes: resolutionNotes || 'Incident verified and marked resolved.',
          previousStatus: inc.status,
          newStatus: 'RESOLVED' as const
        };
        return {
          ...inc,
          status: 'RESOLVED' as const,
          resolvedBy: actor,
          resolvedAt: nowIso,
          resolutionNotes,
          history: [...inc.history, newEvent]
        };
      })
    );

    if (activeCriticalModalIncident?.id === id) {
      setActiveCriticalModalIncident(null);
    }

    const origEmp = resolveIncidentOriginatingEmployee(targetInc);
    const empResNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-RES-${id}`,
      notificationType: 'RESOLVED',
      title: `Incident Resolved: ${id}`,
      message: `Incident ${id} resolved by ${actor}. Resolution: ${resolutionNotes || 'Incident verified and marked resolved.'}`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: origEmp.id,
      incidentId: id,
      actionUrl: `/employee/incidents?incident=${id}`,
      type: 'success',
      read: false,
      category: 'Outage',
      statusBadge: 'Resolved',
      subdivision: targetInc.subdivision,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-INC-${id}-RESOLVED-EMP`
    };

    const resNotifs: AppNotification[] = [empResNotif];

    // Notify assigned Field Engineer if one was assigned
    if (targetInc.assignedToUserId) {
      resNotifs.push({
        id: `NOTIF-${Date.now()}-FLD-RES-${id}`,
        notificationType: 'RESOLVED',
        title: `Incident Resolved: ${id}`,
        message: `Incident ${id} resolved by ${actor}. Resolution: ${resolutionNotes || 'Incident verified and marked resolved.'}`,
        time: 'Just now',
        createdAt: nowIso,
        formattedTimestamp: formatErpDateTime(nowIso),
        targetRole: 'field',
        role: 'field',
        targetUserId: targetInc.assignedToUserId,
        incidentId: id,
        actionUrl: `/field/incidents?incident=${id}`,
        type: 'success',
        read: false,
        category: 'Outage',
        statusBadge: 'Resolved',
        subdivision: targetInc.subdivision,
        actorName: actor,
        actorRole: effectiveRole,
        eventKey: `EVT-INC-${id}-RESOLVED-FIELD`
      });
    }

    // Notify Management if incident was escalated
    if (targetInc.status === 'ESCALATED' || targetInc.escalatedTo === 'management') {
      resNotifs.push({
        id: `NOTIF-${Date.now()}-MGMT-RES-${id}`,
        notificationType: 'RESOLVED',
        title: `Incident Resolved: ${id}`,
        message: `Escalated incident ${id} resolved by ${actor}. Resolution: ${resolutionNotes || 'Incident verified and marked resolved.'}`,
        time: 'Just now',
        createdAt: nowIso,
        formattedTimestamp: formatErpDateTime(nowIso),
        targetRole: 'management',
        role: 'management',
        targetUserId: targetInc.escalatedToUserId,
        incidentId: id,
        type: 'success',
        read: false,
        category: 'Approval',
        statusBadge: 'Resolved',
        subdivision: targetInc.subdivision,
        actorName: actor,
        actorRole: effectiveRole,
        eventKey: `EVT-INC-${id}-RESOLVED-MGMT`
      });
    }

    setNotifications(prev => upsertNotificationList(prev, resNotifs));

    // Consumer Protection: If linked to a consumer complaint, update consumer-facing complaint status safely
    if (targetInc.entityType === 'complaint' && targetInc.entityId) {
      setComplaints(prev =>
        prev.map(c =>
          c.id === targetInc.entityId && c.status !== 'Resolved' && c.status !== 'Closed'
            ? {
                ...c,
                status: 'Resolved',
                resolvedAt: nowIso,
                remarks: `Resolved by ${actor}. Substation repairs completed.`
              }
            : c
        )
      );
    }

    addAuditEvent('INCIDENT_RESOLVED', id, `Incident resolved by ${actor}: ${resolutionNotes}`, actor);
    showToast(`Incident ${id} resolved successfully.`, 'success');
  };

  const updateIncidentSeverity = (
    id: string,
    newSeverity: IncidentSeverity,
    reason: string
  ): boolean => {
    if (!isIncidentRoleAuthorized(effectiveRole)) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot update incident severity.`, 'error');
      return false;
    }

    const targetInc = incidents.find(i => i.id === id);
    if (!targetInc) {
      showToast(`Incident #${id} not found.`, 'error');
      return false;
    }

    const empAuth = authorizeEmployeeAction(targetInc, effectiveRole, activeUser);
    if (!empAuth.isAuthorized) {
      showToast(empAuth.denialReason, 'error');
      return false;
    }

    // Suppress duplicate notification if severity is unchanged
    if (targetInc.severity === newSeverity) {
      return false;
    }

    const prevSeverity = targetInc.severity;
    const actor = activeUser.name || effectiveRole.toUpperCase();
    const nowIso = new Date().toISOString();
    const cleanReason = reason.trim() || 'Severity reassessed in operational dashboard.';

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== id) return inc;
        const newEvent = {
          id: `EVT-INC-${id}-SEV-${Date.now()}`,
          incidentId: id,
          timestamp: nowIso,
          stage: inc.status,
          eventType: 'SEVERITY_CHANGED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          previousSeverity: prevSeverity,
          newSeverity,
          notes: `Severity changed from ${prevSeverity} to ${newSeverity}. Reason: ${cleanReason}`
        };
        return {
          ...inc,
          severity: newSeverity,
          history: [...inc.history, newEvent]
        };
      })
    );

    const origEmp = resolveIncidentOriginatingEmployee(targetInc);
    const sevNotifs: AppNotification[] = [
      {
        id: `NOTIF-${Date.now()}-EMP-SEV-${id}`,
        notificationType: 'SEVERITY_CHANGED',
        title: `Incident Severity Changed: #${id}`,
        message: `Incident ${id} severity changed from ${prevSeverity} to ${newSeverity} by ${actor}. Reason: ${cleanReason}`,
        time: 'Just now',
        createdAt: nowIso,
        formattedTimestamp: formatErpDateTime(nowIso),
        targetRole: 'employee',
        role: 'employee',
        targetUserId: origEmp.id,
        incidentId: id,
        actionUrl: `/employee/incidents?incident=${id}`,
        type: newSeverity === 'CRITICAL' ? 'alert' : 'warning',
        read: false,
        category: 'Outage',
        subdivision: targetInc.subdivision,
        actorName: actor,
        actorRole: effectiveRole,
        eventKey: `EVT-INC-${id}-SEV-${newSeverity}`
      }
    ];

    if (targetInc.assignedToUserId) {
      sevNotifs.push({
        id: `NOTIF-${Date.now()}-FLD-SEV-${id}`,
        notificationType: 'SEVERITY_CHANGED',
        title: `Incident Severity Changed: #${id}`,
        message: `Incident ${id} severity changed from ${prevSeverity} to ${newSeverity} by ${actor}. Reason: ${cleanReason}`,
        time: 'Just now',
        createdAt: nowIso,
        formattedTimestamp: formatErpDateTime(nowIso),
        targetRole: 'field',
        role: 'field',
        targetUserId: targetInc.assignedToUserId,
        incidentId: id,
        actionUrl: `/field/incidents?incident=${id}`,
        type: newSeverity === 'CRITICAL' ? 'alert' : 'warning',
        read: false,
        category: 'Outage',
        subdivision: targetInc.subdivision,
        actorName: actor,
        actorRole: effectiveRole,
        eventKey: `EVT-INC-${id}-SEV-FLD-${newSeverity}`
      });
    }

    setNotifications(prev => upsertNotificationList(prev, sevNotifs));
    addAuditEvent('INCIDENT_SEVERITY_CHANGED', id, `Severity updated ${prevSeverity} -> ${newSeverity} by ${actor}: ${cleanReason}`, actor);
    showToast(`Incident ${id} severity updated to ${newSeverity}.`, newSeverity === 'CRITICAL' ? 'warning' : 'info');
    return true;
  };

  // --------------------------------------------------------------------------
  // FIELD ENGINEER WORKFLOW ACTIONS (Fix 4, Fix 5, Fix 6)
  // --------------------------------------------------------------------------

  const acceptFieldAssignment = (incidentId: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/accept-assignment')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot accept field assignments.`, 'error');
      return false;
    }
    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }
    const fieldAuth = authorizeFieldEngineerAction(targetInc, effectiveRole, activeUser);
    if (!fieldAuth.isAuthorized) {
      showToast(fieldAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized field action by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Field Engineer';
    const prevStatus = targetInc.status;
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-ACC-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: 'IN_PROGRESS' as const,
          eventType: 'ASSIGNMENT_ACCEPTED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          previousStatus: prevStatus,
          newStatus: 'IN_PROGRESS' as const,
          notes: `Field Engineer ${actor} (${activeUser.id}) accepted assignment and mobilized to site.`
        };
        return {
          ...inc,
          status: 'IN_PROGRESS' as const,
          assignmentStatus: 'ACCEPTED' as const,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (GREEN)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-ACC`,
      notificationType: 'ASSIGNMENT_ACCEPTED',
      title: `Assignment Accepted: #${incidentId}`,
      message: `Field Engineer ${actor} (${activeUser.id}) accepted assignment and mobilized to site for ${targetInc.entityId}.`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'success',
      read: false,
      category: 'Outage',
      subdivision: targetInc.subdivision,
      decisionAction: 'Assignment Accepted',
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-ACCEPTED`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('FIELD_ASSIGNMENT_ACCEPTED', incidentId, `Accepted by ${actor} (${activeUser.id}). Mobilized to site.`, actor);
    showToast(`Assignment accepted for ${incidentId}. Mobilized to site.`, 'success');
    return true;
  };

  const declineFieldAssignment = (incidentId: string, reason: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/decline-assignment')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot decline field assignments.`, 'error');
      return false;
    }
    if (dataMode === 'LIVE') {
      showToast(
        'LIVE Backend Unavailable: Cannot decline assignment or fabricate notification in LIVE mode without /api/v1/incidents/:id/decline-assignment.',
        'error'
      );
      return false;
    }

    const cleanReason = reason.trim();
    if (!cleanReason) {
      showToast('Mandatory reason required to decline assignment.', 'warning');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Field Engineer';
    const prevStatus = targetInc.status;

    const declineResult = declineIncidentAssignmentRecord(
      targetInc,
      cleanReason,
      activeUser,
      effectiveRole,
      [],
      nowIso
    );

    if (!declineResult.success || !declineResult.updatedIncident || !declineResult.declineNotification) {
      showToast(declineResult.denialReason || 'Failed to decline assignment.', 'error');
      addAuditEvent(
        'ACCESS_DENIED',
        `Incident:${incidentId}`,
        `Unauthorized field decline attempt by ${activeUser.name} (${activeUser.id})`,
        activeUser.name,
        'WARNING'
      );
      return false;
    }

    const updatedInc = declineResult.updatedIncident;
    const empNotif = declineResult.declineNotification;
    const originatingEmp = declineResult.originatingEmployee || resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => (inc.id === incidentId ? updatedInc : inc))
    );

    // Notify originating employee (RED) and remove stale assignment notification for the declining engineer
    setNotifications(prev =>
      upsertNotificationList(
        prev.filter(n => !(n.incidentId === incidentId && n.targetRole === 'field')),
        [empNotif]
      )
    );

    if (activeCriticalModalIncident?.id === incidentId) {
      setActiveCriticalModalIncident(null);
    }

    addAuditEvent(
      'FIELD_ASSIGNMENT_DECLINED',
      incidentId,
      `Actor: ${actor} (${activeUser.id}) | Recipient: ${originatingEmp.name} (${originatingEmp.id}) | Incident: ${incidentId} | Transition: ${prevStatus} -> ACKNOWLEDGED [DECLINED] | Timestamp: ${formatErpDateTime(nowIso)} | Reason: ${cleanReason}`,
      actor,
      'WARNING'
    );
    showToast(
      `Assignment Declined: #${incidentId} — Returned to ${originatingEmp.name} (${originatingEmp.id}). Reason: "${cleanReason}"`,
      'error'
    );
    return true;
  };

  const startFieldInspection = (incidentId: string, notes?: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/start-inspection')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot start inspections.`, 'error');
      return false;
    }
    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }
    const fieldAuth = authorizeFieldEngineerAction(targetInc, effectiveRole, activeUser);
    if (!fieldAuth.isAuthorized) {
      showToast(fieldAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized start inspection attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Field Engineer';
    const prevStatus = targetInc.status;
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-INSP-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: 'IN_PROGRESS' as const,
          eventType: 'INSPECTION_STARTED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          previousStatus: prevStatus,
          newStatus: 'IN_PROGRESS' as const,
          notes: notes || 'Physical inspection and telemetry tests started on site.'
        };
        return {
          ...inc,
          status: 'IN_PROGRESS' as const,
          assignmentStatus: 'IN_PROGRESS' as const,
          inspectionStartedAt: nowIso,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (BLUE)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-INSP`,
      notificationType: 'INSPECTION_STARTED',
      title: `Inspection Started: #${incidentId}`,
      message: `Field Engineer ${actor} (${activeUser.id}) commenced physical on-site inspection for ${targetInc.entityId}.${notes ? ` Notes: "${notes}"` : ''}`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'info',
      read: false,
      category: 'Inspection',
      subdivision: targetInc.subdivision,
      decisionAction: 'Inspection Started',
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-INSPECTION`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('FIELD_INSPECTION_STARTED', incidentId, `Started by ${actor} (${activeUser.id}) on ${targetInc.entityId}. ${notes || ''}`, actor);
    showToast(`On-site inspection started for ${incidentId}.`, 'info');
    return true;
  };

  const submitFieldFindings = (incidentId: string, findings: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/submit-findings')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot submit findings.`, 'error');
      return false;
    }
    const cleanFindings = findings.trim();
    if (!cleanFindings) {
      showToast('Technical observations/findings are required.', 'warning');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }
    const fieldAuth = authorizeFieldEngineerAction(targetInc, effectiveRole, activeUser);
    if (!fieldAuth.isAuthorized) {
      showToast(fieldAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized submit findings attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Field Engineer';
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-FIND-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: inc.status,
          eventType: 'FINDINGS_SUBMITTED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          notes: `Technical findings recorded: ${cleanFindings}`,
          remarks: cleanFindings
        };
        return {
          ...inc,
          inspectionFindings: cleanFindings,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (BLUE)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-FIND`,
      notificationType: 'FINDINGS_SUBMITTED',
      title: `Field Findings Submitted: #${incidentId}`,
      message: `Field Engineer ${actor} (${activeUser.id}) filed technical observations for ${incidentId}: "${cleanFindings}".`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'info',
      read: false,
      category: 'Inspection',
      subdivision: targetInc.subdivision,
      decisionAction: 'Findings Submitted',
      decisionReason: cleanFindings,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-FINDINGS`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('FIELD_FINDINGS_SUBMITTED', incidentId, `Filed by ${actor} (${activeUser.id}): ${cleanFindings}`, actor);
    showToast(`Technical findings filed for ${incidentId}.`, 'info');
    return true;
  };

  const requestFieldAssistance = (incidentId: string, notes: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/request-assistance')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot request assistance.`, 'error');
      return false;
    }
    const cleanNotes = notes.trim();
    if (!cleanNotes) {
      showToast('Assistance specifications required.', 'warning');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }
    const fieldAuth = authorizeFieldEngineerAction(targetInc, effectiveRole, activeUser);
    if (!fieldAuth.isAuthorized) {
      showToast(fieldAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized request assistance attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Field Engineer';
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-ASST-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: inc.status,
          eventType: 'ASSISTANCE_REQUESTED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          notes: `Assistance requested: ${cleanNotes}`,
          reason: cleanNotes
        };
        return {
          ...inc,
          assistanceRequestedNotes: cleanNotes,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (AMBER)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-ASST`,
      notificationType: 'ASSISTANCE_REQUESTED',
      title: `Field Assistance Requested: #${incidentId}`,
      message: `Field Engineer ${actor} (${activeUser.id}) requested assistance for ${incidentId}: "${cleanNotes}".`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'warning',
      read: false,
      category: 'Outage',
      subdivision: targetInc.subdivision,
      decisionAction: 'Assistance Requested',
      decisionReason: cleanNotes,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-ASSISTANCE`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('FIELD_ASSISTANCE_REQUESTED', incidentId, `Requested by ${actor} (${activeUser.id}): ${cleanNotes}`, actor, 'WARNING');
    showToast(`Assistance request transmitted for ${incidentId}.`, 'warning');
    return true;
  };

  const submitFieldResolutionReport = (incidentId: string, report: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/submit-resolution-report')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot submit resolution reports.`, 'error');
      return false;
    }
    const cleanReport = report.trim();
    if (!cleanReport) {
      showToast('Resolution report is required.', 'warning');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }
    const fieldAuth = authorizeFieldEngineerAction(targetInc, effectiveRole, activeUser);
    if (!fieldAuth.isAuthorized) {
      showToast(fieldAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized resolution report attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Field Engineer';
    const prevStatus = targetInc.status;
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-RES-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: 'RESOLVED' as const,
          eventType: 'RESOLUTION_SUBMITTED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          previousStatus: prevStatus,
          newStatus: 'RESOLVED' as const,
          notes: `Resolution Report: ${cleanReport}`,
          remarks: cleanReport
        };
        return {
          ...inc,
          status: 'RESOLVED' as const,
          assignmentStatus: 'COMPLETED' as const,
          resolvedBy: actor,
          resolvedAt: nowIso,
          resolutionReport: cleanReport,
          resolutionReportSubmittedAt: nowIso,
          resolutionNotes: cleanReport,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (GREEN)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-RES`,
      notificationType: 'RESOLUTION_SUBMITTED',
      title: `Resolution Filed: #${incidentId}`,
      message: `Field Engineer ${actor} (${activeUser.id}) submitted final resolution report for ${incidentId}: "${cleanReport}".`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'success',
      read: false,
      category: 'Outage',
      subdivision: targetInc.subdivision,
      decisionAction: 'Resolution Report Submitted',
      decisionReason: cleanReport,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-RESOLVED`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('FIELD_RESOLUTION_REPORT_SUBMITTED', incidentId, `Submitted by ${actor} (${activeUser.id}): ${cleanReport}`, actor);
    showToast(`Resolution report filed for ${incidentId}. Incident cleared on site.`, 'success');
    return true;
  };

  // --------------------------------------------------------------------------
  // MANAGEMENT EXECUTIVE ACTIONS (Fix 4, Fix 5, Fix 6)
  // --------------------------------------------------------------------------

  const approveEscalation = (incidentId: string, remarks?: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/approve-escalation')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot grant management concurrence.`, 'error');
      return false;
    }
    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }

    const mgmtAuth = authorizeManagementAction(targetInc, effectiveRole, activeUser);
    if (!mgmtAuth.isAuthorized) {
      showToast(mgmtAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized management approval attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Executive Management';
    const cleanRemarks = remarks?.trim() || 'Executive Concurrence Approved.';
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-APPR-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: inc.status,
          eventType: 'APPROVED' as const,
          approvalStatus: 'APPROVED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          remarks: cleanRemarks,
          notes: `Executive Concurrence Granted by Management: ${cleanRemarks}`
        };
        // Preserves incident lifecycle separate from approval decision per Fix 6!
        return {
          ...inc,
          approvalStatus: 'APPROVED' as const,
          approvalDecisionAt: nowIso,
          approvalDecisionBy: actor,
          approvalDecisionByUserId: activeUser.id,
          approvalDecisionRemarks: cleanRemarks,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (GREEN)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-APPR`,
      notificationType: 'APPROVED',
      title: `Escalation Approved: #${incidentId}`,
      message: `Executive concurrence approved by ${actor} (${activeUser.designation || 'Management'}). Remarks: "${cleanRemarks}".`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'success',
      read: false,
      category: 'Approval',
      subdivision: targetInc.subdivision,
      decisionAction: 'Approved',
      decisionReason: cleanRemarks,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-APPROVED`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('MANAGEMENT_ESCALATION_APPROVED', incidentId, `Approved by ${actor}: ${cleanRemarks}`, actor);
    showToast(`Escalation ${incidentId} Approved. Operations desk notified.`, 'success');
    return true;
  };

  const rejectEscalation = (incidentId: string, reason: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/reject-escalation')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot reject escalations.`, 'error');
      return false;
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      showToast('Mandatory rejection reason required.', 'warning');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }

    const mgmtAuth = authorizeManagementAction(targetInc, effectiveRole, activeUser);
    if (!mgmtAuth.isAuthorized) {
      showToast(mgmtAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized management rejection attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Executive Management';
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-REJ-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: inc.status,
          eventType: 'REJECTED' as const,
          approvalStatus: 'REJECTED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          reason: cleanReason,
          notes: `Escalation Rejected by Management: ${cleanReason}`
        };
        return {
          ...inc,
          approvalStatus: 'REJECTED' as const,
          approvalDecisionAt: nowIso,
          approvalDecisionBy: actor,
          approvalDecisionByUserId: activeUser.id,
          approvalDecisionReason: cleanReason,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (RED)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-REJ`,
      notificationType: 'REJECTED',
      title: `Escalation Rejected: #${incidentId}`,
      message: `Executive concurrence rejected by ${actor} (${activeUser.designation || 'Management'}). Reason: "${cleanReason}".`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'alert',
      read: false,
      category: 'Approval',
      subdivision: targetInc.subdivision,
      decisionAction: 'Rejected',
      decisionReason: cleanReason,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-REJECTED`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('MANAGEMENT_ESCALATION_REJECTED', incidentId, `Rejected by ${actor}. Reason: ${cleanReason}`, actor, 'WARNING');
    showToast(`Escalation ${incidentId} Rejected. Reason: "${cleanReason}".`, 'error');
    return true;
  };

  const requestMoreInfo = (incidentId: string, question: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/incidents/:id/request-more-info')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot request incident information.`, 'error');
      return false;
    }
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      showToast('Specific clarification question required.', 'warning');
      return false;
    }

    const targetInc = incidents.find(i => i.id === incidentId);
    if (!targetInc) {
      showToast(`Incident ${incidentId} not found.`, 'error');
      return false;
    }

    const mgmtAuth = authorizeManagementAction(targetInc, effectiveRole, activeUser);
    if (!mgmtAuth.isAuthorized) {
      showToast(mgmtAuth.denialReason, 'error');
      addAuditEvent('ACCESS_DENIED', `Incident:${incidentId}`, `Unauthorized management info request attempt by ${activeUser.name} (${activeUser.id})`, activeUser.name, 'WARNING');
      return false;
    }

    const nowIso = new Date().toISOString();
    const actor = activeUser.name || 'Executive Management';
    const originatingEmp = resolveIncidentOriginatingEmployee(targetInc);

    setIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        const newEvent = {
          id: `EVT-INC-${incidentId}-INFO-${Date.now()}`,
          incidentId,
          timestamp: nowIso,
          stage: inc.status,
          eventType: 'MORE_INFO_REQUESTED' as const,
          approvalStatus: 'MORE_INFO_REQUIRED' as const,
          actor,
          actorUserId: activeUser.id,
          actorRole: effectiveRole,
          recipient: originatingEmp.name,
          targetUserId: originatingEmp.id,
          targetRole: 'employee' as const,
          reason: cleanQuestion,
          notes: `More Information Requested by Management: ${cleanQuestion}`
        };
        return {
          ...inc,
          approvalStatus: 'MORE_INFO_REQUIRED' as const,
          approvalDecisionAt: nowIso,
          approvalDecisionBy: actor,
          approvalDecisionByUserId: activeUser.id,
          approvalDecisionRemarks: cleanQuestion,
          originatingEmployeeUserId: originatingEmp.id,
          originatingEmployeeName: originatingEmp.name,
          history: [...inc.history, newEvent]
        };
      })
    );

    // Notify originating employee (AMBER)
    const empNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-INFO`,
      notificationType: 'MORE_INFO_REQUESTED',
      title: `Clarification Requested: #${incidentId}`,
      message: `Management requested more information for ${incidentId}: "${cleanQuestion}".`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: originatingEmp.id,
      incidentId,
      actionUrl: `/employee/incidents?incident=${incidentId}`,
      type: 'warning',
      read: false,
      category: 'Approval',
      subdivision: targetInc.subdivision,
      decisionAction: 'More Information Required',
      decisionReason: cleanQuestion,
      actorName: actor,
      actorUserId: activeUser.id,
      actorRole: effectiveRole,
      eventKey: `EVT-DECISION-${incidentId}-MORE_INFO`
    };
    setNotifications(prev => upsertNotificationList(prev, [empNotif]));

    addAuditEvent('MANAGEMENT_INFO_REQUESTED', incidentId, `Clarification requested by ${actor}: ${cleanQuestion}`, actor);
    showToast(`Clarification requested for ${incidentId}. Operations desk alerted.`, 'warning');
    return true;
  };

  const triggerDemoSimulatedIncident = () => {
    if (!isIncidentRoleAuthorized(effectiveRole)) {
      showToast(`Access Denied: Operational incident simulation is restricted to utility staff roles.`, 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const simId = `INC-SIM-${Date.now().toString().slice(-4)}`;
    const simIncident: CriticalIncident = {
      id: simId,
      title: '[DEMO SIMULATION] Feeder Overheat & Gas Surge: Kalol North 11kV',
      description: 'Simulated SCADA emergency alert: Feeder F-KL04 has exceeded 108% capacity with abnormal Buchholz relay gas surge. Immediate feeder inspection required.',
      severity: 'CRITICAL',
      module: 'Distribution & SCADA',
      entityId: 'F-KL04',
      entityType: 'feeder',
      timestamp: nowIso,
      responsibleRoles: ['field', 'management', 'employee', 'admin'],
      recommendedAction: 'Despatch emergency breakdown crew to Kalol 66/11kV Substation. Switch auxiliary feeder bus.',
      status: 'DETECTED',
      isSimulated: true,
      actionTab: 'maintenance',
      history: [
        {
          timestamp: nowIso,
          stage: 'DETECTED',
          actor: 'Simulation Controller (Demo Only)',
          notes: 'Simulated incident triggered for hackathon demonstration. Not live SCADA telemetry.'
        }
      ]
    };

    setIncidents(prev => [simIncident, ...prev]);
    setActiveCriticalModalIncident(simIncident);
    playIncidentSound('CRITICAL');
    showToast('[DEMO SIMULATION] Feeder Overheat Alert Triggered', 'warning');
  };

  const toggleAudio = () => {
    if (effectiveRole === 'consumer') return;
    const next = toggleAudioAlerts();
    setAudioAlertsEnabledState(next);
    showToast(next ? 'Warning sounds enabled' : 'Warning sounds muted', 'info');
  };

  const roleIncidents = useMemo(() => {
    return filterIncidentsForSession(incidents, effectiveRole, activeUser);
  }, [incidents, effectiveRole, activeUser]);

  const unreadIncidentsCount = useMemo(() => {
    if (effectiveRole === 'consumer') return 0;
    return roleIncidents.filter(i => i.status === 'DETECTED').length;
  }, [roleIncidents, effectiveRole]);

  const criticalIncidentsCount = useMemo(() => {
    if (effectiveRole === 'consumer') return 0;
    return roleIncidents.filter(i => i.status === 'DETECTED' && i.severity === 'CRITICAL').length;
  }, [roleIncidents, effectiveRole]);

  // Grounded AI Action Recommendation Synthesis (Phase 4)
  useEffect(() => {
    const grounded = generateGroundedRecommendations({
      applications,
      complaints,
      workOrders,
      incidents,
      auditLogs,
      existingRecommendations: recommendations
    });
    if (grounded.length > 0) {
      setRecommendations(prev => {
        const existingMap = new Map(prev.map(r => [r.id, r]));
        let changed = false;
        for (const g of grounded) {
          if (!existingMap.has(g.id)) {
            existingMap.set(g.id, g);
            changed = true;
          }
        }
        return changed ? Array.from(existingMap.values()) : prev;
      });
    }
  }, [applications, complaints, workOrders, incidents]);

  const openApprovalModal = (rec: AIActionRecommendation) => {
    setActiveApprovalRecommendation(rec);
  };

  const closeApprovalModal = () => {
    setActiveApprovalRecommendation(null);
  };

  const proposeRecommendation = (recData: Omit<AIActionRecommendation, 'id' | 'createdAt' | 'status' | 'idempotencyKey'>): string => {
    const id = `REC-PROP-${Date.now()}`;
    const newRec: AIActionRecommendation = {
      ...recData,
      id,
      createdAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
      idempotencyKey: `IDEM-${id}-${Date.now()}`
    };
    setRecommendations(prev => [newRec, ...prev]);
    addAuditEvent(
      'AI_RECOMMENDATION_PROPOSED',
      newRec.affectedRecord.id,
      `AI Agent "${newRec.agentPersonaName}" proposed action: ${newRec.title} [Demo Client Audit Trail]`,
      newRec.agentPersonaName,
      'SUCCESS'
    );
    showToast(`AI proposed action: ${newRec.title}. Human approval required.`, 'info');
    return id;
  };

  const approveRecommendation = (id: string, decisionRemarks: string): { success: boolean; error?: string } => {
    const rec = recommendations.find(r => r.id === id);
    if (!rec) {
      return { success: false, error: 'Recommendation not found.' };
    }

    // 1. Role-based approval authority check
    const authCheck = validateApprovalPermission(rec, currentRole);
    if (!authCheck.allowed) {
      addAuditEvent(
        'AI_APPROVAL_UNAUTHORIZED_ATTEMPT',
        rec.affectedRecord.id,
        `Role "${currentRole}" attempted unauthorized approval for ${rec.id}: ${authCheck.reason}`,
        activeUser.name,
        'FAILED'
      );
      showToast(authCheck.reason || 'Unauthorized approval attempt.', 'error');
      return { success: false, error: authCheck.reason };
    }

    // 2. Idempotency protection: reject already executed or rejected (including synchronous ref guard)
    if (rec.status === 'EXECUTED' || executedRecommendationIdsRef.current.has(rec.id)) {
      return { success: false, error: 'This recommendation has already been executed into ERP canonical records.' };
    }
    if (rec.status === 'REJECTED') {
      return { success: false, error: 'Cannot approve a recommendation that has previously been rejected.' };
    }

    // 3. Current-state revalidation: check for state drift
    const stateCheck = validateCurrentRecordState(rec, { applications, complaints, workOrders, incidents });
    if (!stateCheck.valid) {
      setRecommendations(prev =>
        prev.map(r => r.id === id ? { ...r, status: 'FAILED', decisionRemarks: `Execution blocked: ${stateCheck.reason}` } : r)
      );
      addAuditEvent(
        'AI_APPROVAL_STATE_DRIFT_BLOCKED',
        rec.affectedRecord.id,
        `Execution blocked due to state drift: ${stateCheck.reason}`,
        activeUser.name,
        'WARNING'
      );
      showToast(stateCheck.reason || 'ERP state drift detected. Execution cancelled.', 'error');
      return { success: false, error: stateCheck.reason };
    }

    // 4. Secure Execution through existing validated ERP workflow functions
    try {
      if (rec.proposedAction === 'APPROVE_HIGH_RISK_SANCTION') {
        updateApplicationStatus(rec.affectedRecord.id, 'Meter Installed', rec.proposedPatch?.notes || decisionRemarks);
      } else if (rec.proposedAction === 'APPROVE_CONNECTION_APPLICATION') {
        const targetStatus = (rec.proposedPatch?.targetStatus as any) || 'Sanction Approval';
        updateApplicationStatus(rec.affectedRecord.id, targetStatus, rec.proposedPatch?.notes || decisionRemarks);
      } else if (rec.proposedAction === 'ASSIGN_COMPLAINT_TO_FIELD') {
        assignComplaintToField(
          rec.affectedRecord.id,
          rec.proposedPatch?.assignedTo || 'Rajesh V. Solanki (Lineman)',
          rec.proposedPatch?.priority,
          rec.proposedPatch?.instructions || decisionRemarks
        );
      } else if (rec.proposedAction === 'RESOLVE_SLA_COMPLAINT') {
        updateComplaintStatus(rec.affectedRecord.id, 'Resolved', rec.proposedPatch?.remarks || decisionRemarks);
      } else if (rec.proposedAction === 'ESCALATE_CRITICAL_INCIDENT') {
        escalateIncident(rec.affectedRecord.id, 'management', rec.proposedPatch?.remarks || decisionRemarks);
      } else if (rec.proposedAction === 'REVOKE_SUSPICIOUS_SESSION') {
        addAuditEvent('SECURITY_REVOKE_SESSION', rec.affectedRecord.id, `Session revoked by ${activeUser.name}: ${decisionRemarks}`, activeUser.name, 'SUCCESS');
      }

      // 5. Update recommendation state to APPROVED -> EXECUTED
      executedRecommendationIdsRef.current.add(id);
      const nowIso = new Date().toISOString();
      setRecommendations(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                status: 'EXECUTED',
                reviewedBy: activeUser.name,
                reviewerRole: currentRole,
                reviewedAt: nowIso,
                decisionRemarks,
                executionResult: {
                  success: true,
                  executedAt: nowIso,
                  message: `Action executed successfully by ${activeUser.name} (${currentRole}). [Demo Client Simulation]`
                }
              }
            : r
        )
      );

      addAuditEvent(
        'AI_ACTION_APPROVED_AND_EXECUTED',
        rec.affectedRecord.id,
        `Approved by ${activeUser.name} (${currentRole}). Diff: ${rec.previousValue} -> ${rec.proposedValue}. Remarks: ${decisionRemarks} [Demo Client Audit Trail]`,
        activeUser.name,
        'SUCCESS'
      );

      showToast(`Action ${rec.id} approved & executed successfully!`, 'success');
      closeApprovalModal();
      return { success: true };
    } catch (err: any) {
      setRecommendations(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                status: 'FAILED',
                reviewedBy: activeUser.name,
                reviewerRole: currentRole,
                reviewedAt: new Date().toISOString(),
                decisionRemarks,
                executionResult: {
                  success: false,
                  executedAt: new Date().toISOString(),
                  message: err?.message || 'Execution error during ERP mutation.'
                }
              }
            : r
        )
      );
      addAuditEvent(
        'AI_ACTION_EXECUTION_FAILED',
        rec.affectedRecord.id,
        `Execution failed for ${rec.id}: ${err?.message || 'Unknown error'}`,
        activeUser.name,
        'FAILED'
      );
      showToast(`Execution error: ${err?.message || 'Operation failed'}`, 'error');
      return { success: false, error: err?.message || 'Operation failed' };
    }
  };

  const rejectRecommendation = (id: string, decisionRemarks: string): { success: boolean; error?: string } => {
    const rec = recommendations.find(r => r.id === id);
    if (!rec) {
      return { success: false, error: 'Recommendation not found.' };
    }

    const authCheck = validateApprovalPermission(rec, currentRole);
    if (!authCheck.allowed) {
      addAuditEvent(
        'AI_REJECTION_UNAUTHORIZED_ATTEMPT',
        rec.affectedRecord.id,
        `Role "${currentRole}" attempted unauthorized rejection for ${rec.id}: ${authCheck.reason}`,
        activeUser.name,
        'FAILED'
      );
      showToast(authCheck.reason || 'Unauthorized rejection attempt.', 'error');
      return { success: false, error: authCheck.reason };
    }

    if (rec.status === 'EXECUTED' || executedRecommendationIdsRef.current.has(rec.id)) {
      return { success: false, error: 'Cannot reject an action that has already been executed.' };
    }
    if (rec.status === 'REJECTED') {
      return { success: false, error: 'This recommendation has already been rejected.' };
    }

    const nowIso = new Date().toISOString();
    setRecommendations(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'REJECTED',
              reviewedBy: activeUser.name,
              reviewerRole: currentRole,
              reviewedAt: nowIso,
              decisionRemarks
            }
          : r
      )
    );

    addAuditEvent(
      'AI_ACTION_REJECTED',
      rec.affectedRecord.id,
      `AI recommendation ${rec.id} rejected by operator ${activeUser.name} (${currentRole}). Justification: ${decisionRemarks} [Demo Client Audit Trail]`,
      activeUser.name,
      'WARNING'
    );

    showToast(`Recommendation ${rec.id} rejected by operator. Action cancelled.`, 'info');
    closeApprovalModal();
    return { success: true };
  };

  const executeRecommendation = (id: string): { success: boolean; error?: string } => {
    return approveRecommendation(id, 'Direct operator execution.');
  };

  const linkConnectionDemo = (consumerNo: string): { success: boolean; error?: string; connection?: ElectricityConnection } => {
    if (!demoSession) {
      return { success: false, error: 'Authentication required to link utility accounts.' };
    }
    const cleanNo = consumerNo.trim();
    if (!cleanNo) {
      return { success: false, error: 'Please enter a valid UGVCL consumer number (e.g., 04281-99231).' };
    }

    const targetConn = connections.find(c => c.consumerNo.toLowerCase() === cleanNo.toLowerCase());
    if (!targetConn) {
      return {
        success: false,
        error: `Consumer connection #${cleanNo} was not found in the UGVCL master database. Sample active accounts: 04281-99231 (Residential) or 04281-77190 (Commercial).`
      };
    }

    const userId = demoSession.user.id;
    const storedLinks = loadStorage<Record<string, string[]>>('vidyutflow_account_connections', {});
    const userLinks = storedLinks[userId] || [];
    if (!userLinks.includes(targetConn.consumerNo)) {
      userLinks.push(targetConn.consumerNo);
      storedLinks[userId] = userLinks;
      saveStorage('vidyutflow_account_connections', storedLinks);
    }

    // Update connection state to record linkage
    setConnections(prev =>
      prev.map(c =>
        c.consumerNo === targetConn.consumerNo
          ? { ...c, accountId: userId, accountEmail: demoSession.user.email }
          : c
      )
    );

    // Create linking notification
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-LNK`,
      title: 'Electricity Connection Linked',
      message: `Consumer account #${targetConn.consumerNo} (${targetConn.tariffCategory}) was linked to your profile successfully.`,
      time: 'Just now',
      targetRole: 'consumer',
      type: 'success',
      read: false,
      category: 'Billing'
    };
    setNotifications(prev => [newNotif, ...prev]);

    addAuditEvent(
      'ACCOUNT_CONNECTION_LINKED',
      `CONN#${targetConn.consumerNo}`,
      `User ${demoSession.user.email} linked consumer #${targetConn.consumerNo}`
    );

    showToast(`Consumer #${targetConn.consumerNo} (${targetConn.tariffCategory}) linked successfully!`, 'success');
    return { success: true, connection: targetConn };
  };

  // Keep refs synchronized for popstate/hashchange handlers and async session checks
  const demoSessionRef = React.useRef<DemoSession | null>(demoSession);
  useEffect(() => {
    demoSessionRef.current = demoSession;
  }, [demoSession]);

  const authModeRef = React.useRef<AuthMode>(authMode);
  useEffect(() => {
    authModeRef.current = authMode;
  }, [authMode]);

  const hasEnteredPlatformRef = React.useRef<boolean>(hasEnteredPlatform);
  useEffect(() => {
    hasEnteredPlatformRef.current = hasEnteredPlatform;
  }, [hasEnteredPlatform]);

  const currentRoleRef = React.useRef<UserRole>(currentRole);
  useEffect(() => {
    currentRoleRef.current = currentRole;
  }, [currentRole]);

  const activeTabRef = React.useRef<string>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Keep sessionStorage active portal runtime synchronized whenever authenticated state updates
  useEffect(() => {
    if (demoSession && isValidDemoSession(demoSession)) {
      setStoredActivePortalRuntime({
        session: demoSession,
        role: demoSession.role,
        tab: activeTab,
        entered: hasEnteredPlatform,
        authMode,
      });
    } else {
      setStoredActivePortalRuntime(null);
    }
  }, [demoSession, currentRole, activeTab, hasEnteredPlatform, authMode]);

  // Verify session via GET /api/auth/me before granting access to any protected portal in 'server' mode
  useEffect(() => {
    if (authMode !== 'server') {
      setIsVerifyingServerSession(false);
      return;
    }

    let cancelled = false;
    if (!demoSessionRef.current) {
      setIsVerifyingServerSession(true);
    }

    verifyServerSessionApi().then(result => {
      if (cancelled) return;
      setIsVerifyingServerSession(false);

      const currentRoute = parseCurrentUrl();
      if (result.authenticated && result.session) {
        const decision = resolveRouteAccess(currentRoute, result.session);
        setDemoSession(result.session);
        setCurrentRoleState(result.session.role);

        if (decision.redirectToWelcome) {
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
          }
          setHasEnteredPlatformState(false);
          setActiveTabState(ROLE_DEFAULT_TABS[result.session.role]);
          showToast(decision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
          return;
        }

        // Preserve active portal if user is already inside the portal for this role and URL is not explicit /welcome
        const preserveEntered =
          decision.entered ||
          (hasEnteredPlatformRef.current &&
            currentRoleRef.current === result.session.role &&
            !isExplicitWelcomeLocation());
        const targetTab =
          decision.entered
            ? decision.tab
            : preserveEntered
            ? activeTabRef.current || ROLE_DEFAULT_TABS[result.session.role]
            : decision.tab;

        setActiveTabState(targetTab);
        setHasEnteredPlatformState(preserveEntered);
      } else {
        // If an in-memory session is already active (e.g., cross-origin preview iframe blocked SameSite=Lax cookie)
        // and the server did not explicitly report SESSION_EXPIRED, preserve the active session and portal state.
        const existingSession = demoSessionRef.current;
        if (existingSession && isValidDemoSession(existingSession) && result.code !== 'SESSION_EXPIRED') {
          if (currentRoute.isExplicitPortalRequest && currentRoute.role && currentRoute.role !== existingSession.role) {
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '/');
            }
            setHasEnteredPlatformState(false);
            showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
          }
          return;
        }

        setDemoSession(null);
        setHasEnteredPlatformState(false);
        if (currentRoute.isExplicitPortalRequest) {
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
          }
          showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authMode]);

  // Initial check in 'demo' mode: if unauthorized URL was accessed on load, clean the URL and alert
  useEffect(() => {
    if (authMode === 'demo' && initialDecision.redirectToWelcome) {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      showToast(initialDecision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
    }
  }, []);

  // Browser History & Popstate/Hashchange integration with Auth Guards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLocationChange = () => {
      const route = parseCurrentUrl();

      // In 'server' mode, NEVER trust localStorage session objects; enforce against server-verified session
      // and re-verify via GET /api/auth/me
      if (authModeRef.current === 'server') {
        const currentVerified = demoSessionRef.current;
        const decision = resolveRouteAccess(route, currentVerified);

        if (decision.redirectToWelcome) {
          window.history.replaceState(null, '', '/');
          setHasEnteredPlatformState(false);
          if (currentVerified) {
            setCurrentRoleState(currentVerified.role);
            setActiveTabState(decision.tab);
          } else {
            setDemoSession(null);
          }
          showToast(decision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
          return;
        }

        setHasEnteredPlatformState(decision.entered);
        setCurrentRoleState(decision.role);
        setActiveTabState(decision.tab);

        // Re-verify active server session with GET /api/auth/me on explicit portal navigation
        if (route.isExplicitPortalRequest) {
          verifyServerSessionApi().then(res => {
            if (res.authenticated && res.session) {
              if (route.role && res.session.role !== route.role) {
                window.history.replaceState(null, '', '/');
                setHasEnteredPlatformState(false);
                showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
              }
              return;
            }
            // If cookie was blocked by cross-origin preview iframe, preserve valid in-memory session matching route.role
            const activeInMem = demoSessionRef.current;
            if (
              activeInMem &&
              isValidDemoSession(activeInMem) &&
              res.code !== 'SESSION_EXPIRED' &&
              (!route.role || activeInMem.role === route.role)
            ) {
              return;
            }
            window.history.replaceState(null, '', '/');
            setHasEnteredPlatformState(false);
            if (!res.authenticated) {
              setDemoSession(null);
            }
            showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
          });
        }
        return;
      }

      // Client 'demo' mode fallback
      const currentStored = getStoredDemoSession();
      const validSession = isValidDemoSession(currentStored) ? currentStored : null;
      const decision = resolveRouteAccess(route, validSession);

      if (decision.redirectToWelcome) {
        window.history.replaceState(null, '', '/');
        setHasEnteredPlatformState(false);
        if (validSession) {
          setCurrentRoleState(validSession.role);
          setActiveTabState(decision.tab);
        } else {
          setDemoSession(null);
        }
        showToast(decision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
        return;
      }

      setHasEnteredPlatformState(decision.entered);
      setCurrentRoleState(decision.role);
      setActiveTabState(decision.tab);
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  // Development-only authentication mode switch ('server' vs 'demo')
  // Cannot be used in production to bypass server authentication.
  // Never resets or overwrites any demo data or localStorage records when switching modes.
  const setAuthMode = (mode: AuthMode) => {
    if (!isDevAuthModeSwitchEnabled()) {
      setAuthModeState('server');
      showToast('Client demo authentication mode is disabled in production.', 'warning');
      return;
    }
    const nextMode = resolveEffectiveAuthMode(mode);
    if (nextMode === authMode) return;
    setStoredAuthMode(nextMode);
    setAuthModeState(nextMode);

    if (nextMode === 'demo') {
      const existingDemo = getStoredDemoSession();
      const validDemo = isValidDemoSession(existingDemo) ? existingDemo : null;
      setDemoSession(validDemo);
      if (validDemo) {
        setCurrentRoleState(validDemo.role);
        setActiveTabState(ROLE_DEFAULT_TABS[validDemo.role]);
      } else {
        setHasEnteredPlatformState(false);
      }
      showToast('Switched to Client Demo Authentication mode (localStorage sandbox preserved).', 'info');
    } else {
      // Switching to 'server' mode: clear unverified client state and verify via GET /api/auth/me
      setDemoSession(null);
      setHasEnteredPlatformState(false);
      showToast('Switched to Server Authentication mode (HttpOnly cookie + scrypt verification).', 'info');
    }
  };

  const setHasEnteredPlatform = (entered: boolean) => {
    if (entered) {
      // Access requires a valid session
      if (!demoSession || !isValidDemoSession(demoSession)) {
        showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
        setHasEnteredPlatformState(false);
        setIsRoleSwitcherModalOpen(true);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/');
        }
        return;
      }
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        const segs = window.location.pathname.split('/').filter(Boolean);
        if (segs.length === 0 || segs[0] === 'welcome') {
          window.history.pushState(null, '', `/${currentRole}/${activeTab}`);
        }
      }
    } else {
      setHasEnteredPlatformState(false);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const setIsRoleSwitcherModalOpen = (open: boolean) => {
    if (!open) {
      pendingConsumerTabRef.current = null;
      if (!hasEnteredPlatform) {
        setActiveTabState(ROLE_DEFAULT_TABS[currentRole]);
      }
    }
    setIsRoleSwitcherModalOpenState(open);
  };

  const setActiveTab = (tab: string) => {
    if (!demoSession || !hasEnteredPlatform) {
      if (VALID_CONSUMER_TABS.has(tab) && tab !== 'dashboard') {
        pendingConsumerTabRef.current = tab;
        setCurrentRoleState('consumer');
      } else {
        pendingConsumerTabRef.current = null;
      }
      setActiveTabState(tab);
      return;
    }
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${currentRole}/${tab}`);
    }
  };

  const setRole = (role: UserRole) => {
    pendingConsumerTabRef.current = null;
    // Unauthenticated access prevention: cannot set role without active session
    if (!demoSession || !isValidDemoSession(demoSession)) {
      showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
      setIsRoleSwitcherModalOpenState(true);
      return;
    }
    // Role-access enforcement: An authenticated user cannot switch to another role in-session
    if (demoSession.role !== role) {
      showToast(
        `Role Restricted: Your active session is bound to ${ROLE_PROFILES[demoSession.role].label}. Sign out to access another role.`,
        'error'
      );
      return;
    }
    setCurrentRoleState(role);
    try {
      localStorage.setItem('vidyutone_role', role);
    } catch {}
    const defaultTab = ROLE_DEFAULT_TABS[role];
    setActiveTabState(defaultTab);
    setHasEnteredPlatformState(true);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${role}/${defaultTab}`);
    }
  };

  const replayIntro = () => {
    hasEnteredPlatformRef.current = false;
    setIsIntroActive(true);
    setHasEnteredPlatformState(false);
    if (demoSessionRef.current) {
      setStoredActivePortalRuntime({
        session: demoSessionRef.current,
        role: currentRoleRef.current,
        tab: activeTabRef.current,
        entered: false,
        authMode: authModeRef.current,
      });
    }
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  };

  const exitToWelcomeScreen = () => {
    hasEnteredPlatformRef.current = false;
    setHasEnteredPlatformState(false);
    if (demoSessionRef.current) {
      setStoredActivePortalRuntime({
        session: demoSessionRef.current,
        role: currentRoleRef.current,
        tab: activeTabRef.current,
        entered: false,
        authMode: authModeRef.current,
      });
    }
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  };

  const clearTransientUserModals = () => {
    setActiveIncidentModalId(null);
    setActiveCriticalModalIncident(null);
    setIsNotificationDrawerOpen(false);
    setActiveCaseDrawer(null);
    setActiveApprovalRecommendation(null);
  };

  const applyCanonicalDemoIdentitySession = (
    identity: CanonicalDemoIdentity,
    preserveCurrentTab: boolean = false
  ): DemoSession => {
    const baseSession = createDemoSessionForIdentity(identity);
    const activeModeSession: DemoSession =
      authMode === 'server'
        ? { ...baseSession, sessionToken: SERVER_SESSION_MARKER }
        : baseSession;
    clearTransientUserModals();
    setStoredDemoSession(baseSession);
    const targetTab =
      preserveCurrentTab && demoSession?.role === identity.role
        ? activeTab
        : resolvePostLoginTab(identity.role, pendingConsumerTabRef.current);
    pendingConsumerTabRef.current = null;
    demoSessionRef.current = activeModeSession;
    currentRoleRef.current = identity.role;
    activeTabRef.current = targetTab;
    hasEnteredPlatformRef.current = true;
    setStoredActivePortalRuntime({
      session: activeModeSession,
      role: identity.role,
      tab: targetTab,
      entered: true,
      authMode,
    });
    setDemoSession(activeModeSession);
    setCurrentRoleState(identity.role);
    try {
      localStorage.setItem('vidyutone_role', identity.role);
    } catch {}
    setActiveTabState(targetTab);
    setHasEnteredPlatformState(true);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${identity.role}/${targetTab}`);
    }
    setIsRoleSwitcherModalOpenState(false);
    return activeModeSession;
  };

  const loginAsCanonicalDemoAccount = async (
    accountId: string,
    targetRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (dataMode === 'LIVE') {
      return {
        success: false,
        error:
          'DEMO quick-select login is disabled in LIVE operating mode. Please sign in with verified server credentials.'
      };
    }

    const identity = getCanonicalIdentityById(accountId);
    if (!identity) {
      return {
        success: false,
        error: `Canonical demonstration account "${accountId}" was not found.`
      };
    }
    if (targetRole && identity.role !== targetRole) {
      return {
        success: false,
        error: `Account ${identity.name} (${identity.id}) belongs to ${identity.roleLabel}, not ${ROLE_PROFILES[targetRole].label}.`
      };
    }

    if (authMode === 'server') {
      await loginWithServerApi(identity.email, identity.password, identity.role).catch(() => null);
    }

    applyCanonicalDemoIdentitySession(identity, false);
    showToast(
      `Entered DEMO as ${identity.name} (${identity.id} · ${identity.subdivision}).`,
      'success'
    );
    addAuditEvent(
      'DEMO_AUTH_LOGIN',
      `Workspace:${identity.role}`,
      `Entered DEMO session as ${identity.name} (${identity.id}) — ${identity.email}`,
      identity.name,
      'SUCCESS'
    );
    return { success: true };
  };

  const switchDemoUserAccount = (
    accountId: string
  ): { success: boolean; error?: string } => {
    if (dataMode === 'LIVE') {
      showToast('Account switching without credentials is only available in DEMO mode.', 'warning');
      return {
        success: false,
        error: 'Account switching without credentials is only available in DEMO mode.'
      };
    }

    const identity = getCanonicalIdentityById(accountId);
    if (!identity) {
      showToast(`Demo account "${accountId}" not found.`, 'error');
      return {
        success: false,
        error: `Demo account "${accountId}" not found.`
      };
    }

    const previousActor = activeUser.name || 'Previous User';
    const previousId = activeUser.id || 'N/A';
    applyCanonicalDemoIdentitySession(identity, demoSession?.role === identity.role);
    if (authMode === 'server') {
      void loginWithServerApi(identity.email, identity.password, identity.role).catch(() => null);
    }
    showToast(
      `Switched active DEMO account to ${identity.name} (${identity.id} · ${identity.subdivision}).`,
      'info'
    );
    addAuditEvent(
      'DEMO_ACCOUNT_SWITCHED',
      `Workspace:${identity.role}`,
      `Switched simulated session from ${previousActor} (${previousId}) to ${identity.name} (${identity.id})`,
      identity.name,
      'SUCCESS'
    );
    return { success: true };
  };

  const loginDemoUser = async (
    email: string,
    password: string,
    targetRole: UserRole,
    selectedUserId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // -------------------------------------------------------------------------
    // SERVER AUTHENTICATION MODE (POST /api/auth/login + GET /api/auth/me)
    // Never falls back to client-side authentication if server login fails.
    // -------------------------------------------------------------------------
    if (authMode === 'server') {
      const serverResult = await loginWithServerApi(email, password, targetRole);
      if (!serverResult.success || !serverResult.session) {
        return {
          success: false,
          error: serverResult.error || 'Server authentication failed.'
        };
      }

      // Confirm session via GET /api/auth/me before granting access to the protected portal
      const meCheck = await verifyServerSessionApi();
      const verifiedSession =
        meCheck.authenticated && meCheck.session ? meCheck.session : serverResult.session;

      const assignedRole = verifiedSession.role;
      const targetTab = resolvePostLoginTab(assignedRole, pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;

      clearTransientUserModals();
      demoSessionRef.current = verifiedSession;
      currentRoleRef.current = assignedRole;
      activeTabRef.current = targetTab;
      hasEnteredPlatformRef.current = true;
      setStoredActivePortalRuntime({
        session: verifiedSession,
        role: assignedRole,
        tab: targetTab,
        entered: true,
        authMode,
      });
      setDemoSession(verifiedSession);
      if (verifiedSession.user.email.trim().toLowerCase() === email.trim().toLowerCase()) {
        void syncBackendSession(verifiedSession.user.email, password, assignedRole, {
          portalCookieVerified: meCheck.authenticated,
        });
      } else {
        clearBackendSession();
      }
      setCurrentRoleState(assignedRole);
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/${assignedRole}/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(
        `Authenticated via Server Session as ${verifiedSession.user.name} (${ROLE_PROFILES[assignedRole].label}).`,
        'success'
      );
      addAuditEvent(
        'SERVER_AUTH_LOGIN',
        `Workspace:${assignedRole}`,
        `Server-verified scrypt login for ${verifiedSession.user.email}`,
        verifiedSession.user.name,
        'SUCCESS'
      );
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // CLIENT DEMO AUTHENTICATION MODE (Original localStorage sandbox)
    // -------------------------------------------------------------------------
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check canonical demo identities first (by explicit selectedUserId or email)
    const canonicalBySelected = selectedUserId ? getCanonicalIdentityById(selectedUserId) : undefined;
    const canonicalByEmail = CANONICAL_DEMO_IDENTITIES.find(
      item => item.email.toLowerCase() === trimmedEmail
    );
    const matchedCanonical =
      canonicalBySelected && (!trimmedEmail || canonicalBySelected.email.toLowerCase() === trimmedEmail)
        ? canonicalBySelected
        : canonicalByEmail;

    if (matchedCanonical) {
      if (matchedCanonical.password !== password) {
        return {
          success: false,
          error: 'Incorrect demonstration password. (Sample accounts use Demo@12345)'
        };
      }
      if (matchedCanonical.role !== targetRole) {
        return {
          success: false,
          error: `This demonstration account is authorized for ${DEFAULT_DEMO_ACCOUNTS[matchedCanonical.role].roleLabel}. Please switch target role to ${DEFAULT_DEMO_ACCOUNTS[matchedCanonical.role].roleLabel}.`
        };
      }

      applyCanonicalDemoIdentitySession(matchedCanonical, false);
      showToast(
        `Authenticated as ${matchedCanonical.name} (${matchedCanonical.id} · ${matchedCanonical.roleLabel}). Welcome to VidyutFlow!`,
        'success'
      );
      addAuditEvent(
        'DEMO_AUTH_LOGIN',
        `Workspace:${matchedCanonical.role}`,
        `Logged in as ${matchedCanonical.name} (${matchedCanonical.id}) — ${matchedCanonical.email}`,
        matchedCanonical.name,
        'SUCCESS'
      );
      return { success: true };
    }

    // 2. Fallback check against default preconfigured demo accounts
    const defaultAcc = Object.values(DEFAULT_DEMO_ACCOUNTS).find(
      acc => acc.email.toLowerCase() === trimmedEmail
    );

    if (defaultAcc) {
      if (defaultAcc.password !== password) {
        return { success: false, error: 'Incorrect demonstration password. (Sample accounts use Demo@12345)' };
      }
      if (defaultAcc.role !== targetRole) {
        return {
          success: false,
          error: `This demonstration account is authorized for ${DEFAULT_DEMO_ACCOUNTS[defaultAcc.role].roleLabel}. Please switch target role to ${DEFAULT_DEMO_ACCOUNTS[defaultAcc.role].roleLabel}.`
        };
      }

      const fallbackIdentity =
        resolveCanonicalDemoIdentity({ email: defaultAcc.email, name: defaultAcc.name, role: defaultAcc.role }) ||
        getDefaultCanonicalIdentityForRole(defaultAcc.role);

      applyCanonicalDemoIdentitySession(fallbackIdentity, false);
      showToast(`Authenticated as ${fallbackIdentity.name} (${defaultAcc.roleLabel}). Welcome to VidyutFlow!`, 'success');
      addAuditEvent('DEMO_AUTH_LOGIN', `Workspace:${defaultAcc.role}`, `Logged in as ${defaultAcc.email}`, fallbackIdentity.name, 'SUCCESS');
      return { success: true };
    }

    // 2. Check custom registered demo consumers
    const customUsers = getCustomDemoUsers();
    const customUser = customUsers.find(u => u.email.toLowerCase() === trimmedEmail);

    if (customUser) {
      if (!verifyDemoPassword(password, customUser.passwordHash)) {
        return { success: false, error: 'Incorrect password for custom consumer account.' };
      }
      if (targetRole !== 'consumer') {
        return {
          success: false,
          error: 'Registered accounts are granted the Consumer role only. Please select Consumer Portal.'
        };
      }

      const newSession: DemoSession = {
        user: {
          id: customUser.id,
          email: customUser.email,
          name: customUser.name,
          role: 'consumer',
          mobileNumber: customUser.mobileNumber,
          isCustomSignup: true
        },
        role: 'consumer',
        loginTime: new Date().toISOString(),
        sessionToken: `vidyutflow_demo_${Date.now()}`
      };

      setStoredDemoSession(newSession);
      setDemoSession(newSession);
      setCurrentRoleState('consumer');
      try {
        localStorage.setItem('vidyutone_role', 'consumer');
      } catch {}
      const targetTab = resolvePostLoginTab('consumer', pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/consumer/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(`Welcome back, ${customUser.name}! Consumer Portal loaded.`, 'success');
      addAuditEvent('DEMO_AUTH_LOGIN', 'Workspace:consumer', `Custom user login: ${customUser.email}`, customUser.name, 'SUCCESS');
      return { success: true };
    }

    return {
      success: false,
      error: 'Demonstration account not found. Please click a "Use Demo Account" quick chip or register as a consumer.'
    };
  };

  const signupDemoUser = async (
    name: string,
    email: string,
    password: string,
    mobileNumber?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // -------------------------------------------------------------------------
    // SERVER AUTHENTICATION MODE (POST /api/auth/signup + GET /api/auth/me)
    // Never falls back to client-side signup if server registration fails.
    // -------------------------------------------------------------------------
    if (authMode === 'server') {
      const serverResult = await signupWithServerApi(name, email, password, mobileNumber);
      if (!serverResult.success || !serverResult.session) {
        return {
          success: false,
          error: serverResult.error || 'Consumer registration failed on server.'
        };
      }

      const meCheck = await verifyServerSessionApi();
      const verifiedSession =
        meCheck.authenticated && meCheck.session ? meCheck.session : serverResult.session;

      const targetTab = resolvePostLoginTab('consumer', pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;
      demoSessionRef.current = verifiedSession;
      currentRoleRef.current = 'consumer';
      activeTabRef.current = targetTab;
      hasEnteredPlatformRef.current = true;
      setStoredActivePortalRuntime({
        session: verifiedSession,
        role: 'consumer',
        tab: targetTab,
        entered: true,
        authMode,
      });
      setDemoSession(verifiedSession);
      if (verifiedSession.user.email.trim().toLowerCase() === email.trim().toLowerCase()) {
        void registerBackendConsumerSession(name, verifiedSession.user.email, password, {
          portalCookieVerified: meCheck.authenticated,
        });
      } else {
        clearBackendSession();
      }
      setCurrentRoleState('consumer');
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/consumer/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(
        `Consumer registration successful! Welcome, ${verifiedSession.user.name}.`,
        'success'
      );
      addAuditEvent(
        'SERVER_AUTH_SIGNUP',
        'Consumer Account Registered',
        `Server-registered consumer: ${verifiedSession.user.email}`,
        verifiedSession.user.name,
        'SUCCESS'
      );
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // CLIENT DEMO AUTHENTICATION MODE (Original localStorage sandbox)
    // -------------------------------------------------------------------------
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // Check duplicate with default accounts
    const isDefault = Object.values(DEFAULT_DEMO_ACCOUNTS).some(
      a => a.email.toLowerCase() === trimmedEmail
    );
    if (isDefault) {
      return { success: false, error: 'This email is already registered as a default demonstration account. Please use Sign In directly.' };
    }

    // Check duplicate with custom accounts
    const customUsers = getCustomDemoUsers();
    if (customUsers.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'An account with this email already exists in local demo storage. Please sign in.' };
    }

    const newUser: DemoUser = {
      id: `usr_${Date.now()}`,
      email: trimmedEmail,
      name: trimmedName,
      role: 'consumer',
      mobileNumber: mobileNumber?.trim(),
      passwordHash: hashDemoPassword(password),
      createdAt: new Date().toISOString(),
      isCustomSignup: true
    };

    saveCustomDemoUser(newUser);

    // Auto-login the newly created consumer
    const newSession: DemoSession = {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'consumer',
        mobileNumber: newUser.mobileNumber,
        isCustomSignup: true
      },
      role: 'consumer',
      loginTime: new Date().toISOString(),
      sessionToken: `vidyutflow_demo_${Date.now()}`
    };

    setStoredDemoSession(newSession);
    const targetTab = resolvePostLoginTab('consumer', pendingConsumerTabRef.current);
    pendingConsumerTabRef.current = null;
    demoSessionRef.current = newSession;
    currentRoleRef.current = 'consumer';
    activeTabRef.current = targetTab;
    hasEnteredPlatformRef.current = true;
    setStoredActivePortalRuntime({
      session: newSession,
      role: 'consumer',
      tab: targetTab,
      entered: true,
      authMode,
    });
    setDemoSession(newSession);
    setCurrentRoleState('consumer');
    try {
      localStorage.setItem('vidyutone_role', 'consumer');
    } catch {}
    setActiveTabState(targetTab);
    setHasEnteredPlatformState(true);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/consumer/${targetTab}`);
    }
    setIsRoleSwitcherModalOpenState(false);
    showToast(`Consumer registration successful! Welcome, ${newUser.name}.`, 'success');
    addAuditEvent('DEMO_AUTH_SIGNUP', 'Consumer Account Registered', `New consumer created: ${newUser.email}`, newUser.name, 'SUCCESS');
    return { success: true };
  };

  const logoutDemoSession = async (): Promise<void> => {
    clearBackendSession();
    pendingConsumerTabRef.current = null;
    demoSessionRef.current = null;
    hasEnteredPlatformRef.current = false;
    setStoredActivePortalRuntime(null);
    if (authMode === 'server') {
      await logoutServerSessionApi();
      setDemoSession(null);
      setCurrentRoleState('consumer');
      setActiveTabState('dashboard');
      setHasEnteredPlatformState(false);
      setIsRoleSwitcherModalOpenState(false);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      showToast('Server session revoked and logged out. Returned to public homepage.', 'info');
      return;
    }

    setStoredDemoSession(null);
    setDemoSession(null);
    setCurrentRoleState('consumer');
    setActiveTabState('dashboard');
    setHasEnteredPlatformState(false);
    setIsRoleSwitcherModalOpenState(false);
    try {
      localStorage.removeItem('vidyutone_role');
    } catch {}
    if (typeof window !== 'undefined') {
      // Use replaceState to overwrite the current history entry so Back button cannot reopen protected portal
      window.history.replaceState(null, '', '/');
    }
    showToast('Logged out of demo session. Returned to public homepage.', 'info');
  };

  const openCaseDrawer = (type: 'application' | 'complaint' | 'workorder', id: string) => {
    if (effectiveRole === 'consumer') {
      if (type === 'workorder') {
        showToast('Access Denied: Internal field work orders are restricted to authorized utility personnel.', 'error');
        addAuditEvent('ACCESS_DENIED', `WorkOrder:${id}`, 'Consumer blocked from opening internal work order drawer', activeUser.name, 'WARNING');
        return;
      }
      if (type === 'application' && !userApplications.some(a => a.id === id)) {
        showToast('Access Denied: You can only view applications associated with your consumer account.', 'error');
        addAuditEvent('ACCESS_DENIED', `Application:${id}`, 'Consumer blocked from viewing unowned application', activeUser.name, 'WARNING');
        return;
      }
      if (type === 'complaint' && !userComplaints.some(c => c.id === id)) {
        showToast('Access Denied: You can only view complaints associated with your consumer account.', 'error');
        addAuditEvent('ACCESS_DENIED', `Complaint:${id}`, 'Consumer blocked from viewing unowned complaint', activeUser.name, 'WARNING');
        return;
      }
    }
    setActiveCaseDrawer({ type, id });
  };

  const closeCaseDrawer = () => {
    setActiveCaseDrawer(null);
  };

  const addAuditEvent = (
    action: string,
    resource: string,
    metaDetail: string,
    actor?: string,
    status: AuditLogItem['status'] = 'SUCCESS'
  ) => {
    const profile = ROLE_PROFILES[effectiveRole];
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newEvent: AuditLogItem = {
      id: `AUD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      timestamp: `15-Oct ${ts}`,
      actor: redactSensitiveData(actor || profile.personaName),
      role: profile.badge,
      action,
      resource: redactSensitiveData(resource),
      ipAddress: '10.42.8.114 (UGVCL VPN)',
      status,
      metaDetail: redactSensitiveData(metaDetail)
    };
    setAuditLogs(prev => [newEvent, ...prev]);
  };

  // Keyboard shortcut for Cmd+K command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Demo Actions
  const payBillDemoDetailed = (
    billNo: string,
    paymentMethod: PaymentTransaction['paymentMethod'] = 'UPI / BHIM',
    customAmount?: number,
    options?: {
      simulatedOutcome?: SimulatedPaymentOutcome;
      simulatedFailureReason?: string;
    }
  ): ApplyPaymentToBillResult => {
    const targetBill = bills.find(b => b.billNo === billNo);
    const makeRejection = (reason: string): ApplyPaymentToBillResult => {
      const dummyBill: ElectricityBill = targetBill || {
        billNo,
        consumerNo: '',
        billMonth: 'October 2026',
        billDate: '05-Oct-2026',
        dueDate: '20-Oct-2026',
        unitsConsumed: 0,
        energyCharges: 0,
        fixedCharges: 0,
        fuelPriceAdjustment: 0,
        electricityDuty: 0,
        rebateOrSubsidy: 0,
        totalAmount: 0,
        status: 'Unpaid',
        slabBreakdown: [],
      };
      return {
        success: false,
        outcome: 'FAILED',
        reason,
        updatedBill: dummyBill,
        reconciledBill: {
          ...dummyBill,
          rawStatus: dummyBill.status,
          effectiveStatus: 'Unpaid',
          paidAmount: dummyBill.paidAmount || 0,
          outstandingBalance: dummyBill.remainingBalance ?? dummyBill.totalAmount,
          remainingBalance: dummyBill.remainingBalance ?? dummyBill.totalAmount,
          isDue: true,
          isOverdue: false,
          isPartiallyPaid: false,
          isPaid: false,
          appliedPayments: [],
          unappliedPaymentAttempts: [],
          hasConflict: false,
          billingCycleType: dummyBill.billingCycleType || 'MONTHLY',
          periodStartDate: dummyBill.periodStartDate || '01-Sep-2026',
          periodEndDate: dummyBill.periodEndDate || '30-Sep-2026',
          billingPeriodLabel: dummyBill.billingPeriodLabel || '01-Sep-2026 to 30-Sep-2026'
        },
        paymentTransaction: null,
        previouslySettledAmount: dummyBill.paidAmount || 0,
        paidAmountApplied: 0,
        remainingBalance: dummyBill.remainingBalance ?? dummyBill.totalAmount,
        isFullyPaid: false,
        settlementClassification: 'NONE'
      };
    };

    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/billing/pay')) {
      const msg = `Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to pay bills.`;
      showToast(msg, 'error');
      return makeRejection(msg);
    }
    if (effectiveRole === 'consumer' && !userBills.some(b => b.billNo === billNo)) {
      const msg = 'Access Denied: You can only pay bills belonging to your linked consumer accounts.';
      showToast(msg, 'error');
      addAuditEvent('ACCESS_DENIED', `Bill:${billNo}`, 'Consumer attempted to pay bill for unowned connection', activeUser.name, 'WARNING');
      return makeRejection(msg);
    }
    if (!targetBill) {
      return makeRejection(`Bill ${billNo} not found.`);
    }

    const txPrefix =
      paymentMethod === 'UPI / BHIM'
        ? 'TXN-UPI'
        : paymentMethod === 'Net Banking'
        ? 'TXN-NEFT'
        : paymentMethod === 'Debit Card'
        ? 'TXN-CARD'
        : 'TXN-RTGS';
    const txId = `${txPrefix}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}-Oct-2026 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const settlementResult = applyPaymentToBill({
      bill: targetBill,
      existingPayments: payments,
      paymentMethod,
      amountToPay: customAmount,
      paymentDate: formattedDate,
      txId,
      bankReference: `UGVCL/DEMO/${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      accountId: demoSession?.user.id || targetBill.accountId,
      referenceDate: '15-Oct-2026',
      simulatedOutcome: options?.simulatedOutcome || 'SUCCESS',
      simulatedFailureReason: options?.simulatedFailureReason
    });

    if (settlementResult.outcome === 'FAILED') {
      if (settlementResult.paymentTransaction) {
        setPayments(prev => [settlementResult.paymentTransaction!, ...prev]);
        addAuditEvent(
          'BILL_PAYMENT_FAILED',
          `BILL#${targetBill.billNo}`,
          `Payment attempt of ₹${settlementResult.paymentTransaction.amount.toLocaleString('en-IN')} via ${paymentMethod} failed (Ref: ${settlementResult.paymentTransaction.txId}). Balance unchanged: ₹${settlementResult.remainingBalance.toLocaleString('en-IN')}.`,
          activeUser.name,
          'WARNING'
        );
      }
      showToast(settlementResult.reason, 'error');
      return settlementResult;
    }

    if (settlementResult.outcome === 'PENDING') {
      if (settlementResult.paymentTransaction) {
        setPayments(prev => [settlementResult.paymentTransaction!, ...prev]);
        addAuditEvent(
          'BILL_PAYMENT_PENDING_VERIFICATION',
          `BILL#${targetBill.billNo}`,
          `Payment of ₹${settlementResult.paymentTransaction.amount.toLocaleString('en-IN')} via ${paymentMethod} marked Pending Verification (Ref: ${settlementResult.paymentTransaction.txId}). Balance unchanged until settled.`,
          activeUser.name,
          'WARNING'
        );
      }
      showToast(settlementResult.reason, 'warning');
      return settlementResult;
    }

    if (!settlementResult.success || !settlementResult.paymentTransaction) {
      showToast(settlementResult.reason, 'warning');
      return settlementResult;
    }

    const { updatedBill, paymentTransaction, paidAmountApplied, remainingBalance, isFullyPaid } =
      settlementResult;

    // Update bill status & balance in state
    setBills(prev => prev.map(b => (b.billNo === billNo ? updatedBill : b)));

    // Prepend payment transaction
    setPayments(prev => [paymentTransaction, ...prev]);

    // Emit payment confirmation notification and mark any prior due/overdue reminders for this bill as read if fully paid
    const nowIso = now.toISOString();
    const confirmNotif = createPaymentConfirmedNotification({
      bill: updatedBill,
      payment: paymentTransaction,
      remainingBalance,
      accountId: demoSession?.user.id || targetBill.accountId,
      language: 'en'
    });
    const enrichedNotif: AppNotification = {
      ...confirmNotif,
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso)
    };

    setNotifications(prev => {
      const normalizedBillNo = normalizeBillingIdentifier(billNo);
      const updatedExisting = isFullyPaid
        ? prev.map(n =>
            n.category === 'Billing' &&
            n.relatedEntityType === 'bill' &&
            normalizeBillingIdentifier(n.relatedEntityId) === normalizedBillNo
              ? { ...n, read: true }
              : n
          )
        : prev;
      return upsertNotificationList(updatedExisting, [enrichedNotif]);
    });

    // Record audit event
    addAuditEvent(
      isFullyPaid ? 'BILL_PAYMENT_COLLECTED' : 'BILL_PARTIAL_PAYMENT_COLLECTED',
      `BILL#${targetBill.billNo}`,
      `₹${paidAmountApplied.toLocaleString()} paid via ${paymentMethod} (Ref: ${txId}). Remaining balance: ₹${remainingBalance.toLocaleString()}`
    );

    showToast(
      isFullyPaid
        ? `Payment of ₹${paidAmountApplied.toLocaleString()} completed successfully! Receipt generated.`
        : `Partial payment of ₹${paidAmountApplied.toLocaleString()} recorded! Remaining balance: ₹${remainingBalance.toLocaleString()}.`,
      'success'
    );
    return settlementResult;
  };

  const payBillDemo = (
    billNo: string,
    paymentMethod: PaymentTransaction['paymentMethod'] = 'UPI / BHIM',
    customAmount?: number,
    options?: {
      simulatedOutcome?: SimulatedPaymentOutcome;
      simulatedFailureReason?: string;
    }
  ): boolean => {
    const res = payBillDemoDetailed(billNo, paymentMethod, customAmount, options);
    return res.success;
  };

  const generateDemoBillForActiveConnection = (
    consumerNo: string,
    billMonth: string = 'October 2026',
    options?: {
      billingCycleType?: 'MONTHLY' | 'BI_MONTHLY';
    }
  ): { created: boolean; bill: ElectricityBill | null; reason: string } => {
    const cleanNo = normalizeBillingIdentifier(consumerNo);
    const targetConn = connections.find(
      c =>
        normalizeBillingIdentifier(c.consumerNo) === cleanNo ||
        normalizeBillingIdentifier(c.connectionId) === cleanNo
    );
    if (!targetConn) {
      showToast(`Connection ${consumerNo} not found.`, 'error');
      return { created: false, bill: null, reason: `Connection ${consumerNo} not found.` };
    }

    if (
      effectiveRole === 'consumer' &&
      !userConnections.some(
        c => normalizeBillingIdentifier(c.consumerNo) === normalizeBillingIdentifier(targetConn.consumerNo)
      )
    ) {
      showToast('Access Denied: You can only generate DEMO cycle bills for your own active connections.', 'error');
      return { created: false, bill: null, reason: 'Unauthorized connection.' };
    }

    const requestedCycleType =
      options?.billingCycleType ||
      (targetConn.billingCycleType === 'BI_MONTHLY' ? 'BI_MONTHLY' : 'MONTHLY');

    if (requestedCycleType === 'BI_MONTHLY') {
      const biMonthlyGenResult = generateDeterministicBiMonthlyBillForConnection({
        connection: targetConn,
        existingBills: bills,
        startYear: 2026,
        startMonth1To12: 9,
        autoResolveNonOverlappingPeriod: true,
        createdByRole: effectiveRole,
        createdByActor: activeUser.name || 'VidyutFlow Billing Engine'
      });

      if (!biMonthlyGenResult.created || !biMonthlyGenResult.bill) {
        showToast(biMonthlyGenResult.reason, 'info');
        return {
          created: false,
          bill: biMonthlyGenResult.bill,
          reason: biMonthlyGenResult.reason
        };
      }

      setBills(biMonthlyGenResult.updatedBills);
      addAuditEvent(
        'DEMO_BIMONTHLY_BILL_GENERATED',
        `BILL#${biMonthlyGenResult.bill.billNo}`,
        `Deterministic BI_MONTHLY DEMO cycle bill generated for connection ${targetConn.consumerNo} (${biMonthlyGenResult.bill.billMonth}, ${biMonthlyGenResult.bill.periodStartDate} to ${biMonthlyGenResult.bill.periodEndDate}): ₹${biMonthlyGenResult.bill.totalAmount.toLocaleString()}`
      );
      showToast(
        `Bi-Monthly DEMO Bill ${biMonthlyGenResult.bill.billNo} (${biMonthlyGenResult.bill.billMonth}, ₹${biMonthlyGenResult.bill.totalAmount.toLocaleString('en-IN')}) generated for connection ${targetConn.consumerNo}.`,
        'success'
      );
      return {
        created: true,
        bill: biMonthlyGenResult.bill,
        reason: biMonthlyGenResult.reason
      };
    }

    const genResult = generateDeterministicDemoBillForConnection({
      connection: targetConn,
      existingBills: bills,
      billMonth
    });

    if (!genResult.created || !genResult.bill) {
      showToast(genResult.reason, 'info');
      return { created: false, bill: genResult.bill, reason: genResult.reason };
    }

    setBills(genResult.updatedBills);
    addAuditEvent(
      'DEMO_BILL_GENERATED',
      `BILL#${genResult.bill.billNo}`,
      `Deterministic DEMO cycle bill generated for connection ${targetConn.consumerNo} (${billMonth}): ₹${genResult.bill.totalAmount.toLocaleString()}`
    );
    showToast(
      `DEMO Bill ${genResult.bill.billNo} (₹${genResult.bill.totalAmount.toLocaleString('en-IN')}) generated for connection ${targetConn.consumerNo}.`,
      'success'
    );
    return { created: true, bill: genResult.bill, reason: genResult.reason };
  };

  const submitApplicationDemo = (data: Partial<NewConnectionApplication>) => {
    const newId = generateNextRecordId(
      applications.map(a => a.id),
      'APP-2026-',
      846,
      4
    );
    const kw = data.requestedLoadKw || 5;
    const estCost = data.estimatedSanctionCost || (kw * 1150 + 2100);

    const currentUserId = demoSession?.user.id || 'anonymous';
    const currentUserEmail = demoSession?.user.email || data.email || 'applicant@example.com';
    const currentUserName = demoSession?.user.name || data.applicantName || 'Applicant Name';

    const canonicalSubdivision = normalizeCanonicalSubdivision(
      data.subdivision || 'Mehsana City North'
    );
    const canonicalCategory = normalizeCanonicalTariffCategory(
      data.category || 'Residential (RGPU)'
    ) as NewConnectionApplication['category'];

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const dynamicAppSla = computeDynamicApplicationSlaFields({
      submittedAt: data.appliedDate || nowDate
    });
    const appliedDateStr = data.appliedDate || dynamicAppSla.appliedDate;
    const targetDateStr = data.targetCompletionDate || dynamicAppSla.targetCompletionDate;
    const noteTimestampStr = formatErpDateTime(nowDate, '15-Oct 06:19');

    // Verify consumer ownership of linkedConsumerNo if provided
    let verifiedLinkedConsumerNo = data.linkedConsumerNo?.trim() || undefined;
    let verifiedLinkedMeterNo = data.linkedMeterNo?.trim() || undefined;
    let verifiedCurrentLoadKw =
      typeof data.currentSanctionedLoadKw === 'number' &&
      Number.isFinite(data.currentSanctionedLoadKw) &&
      data.currentSanctionedLoadKw > 0
        ? data.currentSanctionedLoadKw
        : undefined;

    if (effectiveRole === 'consumer' && verifiedLinkedConsumerNo) {
      const ownedConn = userConnections.find(
        c => c.consumerNo === verifiedLinkedConsumerNo
      );
      if (!ownedConn) {
        showToast(
          'Access Denied: You can only submit service requests for your own linked consumer numbers.',
          'error'
        );
        addAuditEvent(
          'ACCESS_DENIED',
          `Connection:${verifiedLinkedConsumerNo}`,
          'Consumer blocked from submitting service request on unowned connection',
          activeUser.name,
          'WARNING'
        );
        return '';
      }
      verifiedLinkedMeterNo = verifiedLinkedMeterNo || ownedConn.meterNo;
      if (verifiedCurrentLoadKw === undefined && ownedConn.sanctionedLoadKw > 0) {
        verifiedCurrentLoadKw = ownedConn.sanctionedLoadKw;
      }
    }

    const effectiveRequestType =
      data.serviceRequestType ||
      (data.solarInterest ? 'SOLAR_NET_METERING' : 'NEW_CONNECTION');
    const effectiveSolarInterest = Boolean(
      data.solarInterest || effectiveRequestType === 'SOLAR_NET_METERING'
    );
    const effectiveLoadDirection: LoadChangeDirection | undefined =
      effectiveRequestType === 'LOAD_CHANGE'
        ? data.loadChangeDirection ||
          (verifiedCurrentLoadKw !== undefined && kw < verifiedCurrentLoadKw
            ? 'REDUCTION'
            : 'EXTENSION')
        : undefined;

    const initialNoteText =
      effectiveRequestType === 'SOLAR_NET_METERING'
        ? verifiedLinkedConsumerNo
          ? `Rooftop Solar Net-Metering (Surya Gujarat) request registered for existing connection #${verifiedLinkedConsumerNo} (${kw} kW ${canonicalCategory}) at ${canonicalSubdivision}.`
          : `Rooftop Solar Net-Metering (Surya Gujarat) application registered for ${kw} kW ${canonicalCategory} supply at ${canonicalSubdivision}.`
        : effectiveRequestType === 'LOAD_CHANGE'
        ? `${effectiveLoadDirection === 'REDUCTION' ? 'Load Reduction' : 'Load Extension'} request registered for connection #${verifiedLinkedConsumerNo || 'UNLINKED'}: current sanctioned load ${verifiedCurrentLoadKw ?? kw} kW to requested load ${kw} kW (${canonicalCategory}) at ${canonicalSubdivision}.`
        : `New LT connection application registered for ${kw} kW ${canonicalCategory} supply at ${canonicalSubdivision}.`;

    const newApp: NewConnectionApplication = {
      id: newId,
      applicantName: data.applicantName || currentUserName,
      phone: data.phone || demoSession?.user.mobileNumber || '+91 98250 00000',
      email: data.email || currentUserEmail,
      address: data.address || '14 Anand Nagar, Mehsana',
      subdivision: canonicalSubdivision,
      category: canonicalCategory,
      requestedLoadKw: kw,
      phase: data.phase || (kw > 5 ? '3-Phase' : '1-Phase'),
      premisesType: data.premisesType || 'Owned',
      status: 'Submitted',
      appliedDate: appliedDateStr,
      targetCompletionDate: targetDateStr,
      assignedOfficer: resolveAssignedOfficerForSubdivision(canonicalSubdivision),
      assignedEngineer: 'Vikramaditya Solanki (JE Field)',
      estimatedSanctionCost: estCost,
      documentsSubmitted: data.documentsSubmitted && data.documentsSubmitted.length > 0
        ? data.documentsSubmitted
        : ['Identity Proof (Aadhaar / PAN)', 'Premises Ownership Deed / Index-II', 'Wiring Test Certificate'],
      workflowStep: 1,
      accountId: currentUserId,
      serviceRequestType: effectiveRequestType,
      linkedConsumerNo: verifiedLinkedConsumerNo,
      linkedMeterNo: verifiedLinkedMeterNo,
      currentSanctionedLoadKw: verifiedCurrentLoadKw,
      loadChangeDirection: effectiveLoadDirection,
      loadChangeConfirmed:
        effectiveRequestType === 'LOAD_CHANGE'
          ? Boolean(data.loadChangeConfirmed ?? true)
          : undefined,
      solarInterest: effectiveSolarInterest,
      purpose: data.purpose,
      notesHistory: [
        {
          timestamp: noteTimestampStr,
          author: 'Citizen Self-Service Portal',
          note: initialNoteText
        }
      ]
    };

    setApplications(prev => [newApp, ...prev]);

    const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(
      newApp,
      'Submitted',
      undefined,
      undefined,
      nowIso
    );
    const lifecycleNotifications = [
      employeeNotif,
      ...(consumerNotif ? [consumerNotif] : [])
    ];

    const submissionScopeKey = getNotificationInboxScopeKey(effectiveRole, demoSession);
    setInboxStateMap(prev => {
      const existing = prev[submissionScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const updatedKeys = new Set(existing.deliveredToastEventKeys);
      for (const item of lifecycleNotifications) {
        if (item.eventKey && item.targetRole === effectiveRole) {
          updatedKeys.add(item.eventKey);
        }
      }
      return {
        ...prev,
        [submissionScopeKey]: {
          ...existing,
          deliveredToastEventKeys: Array.from(updatedKeys)
        }
      };
    });

    setNotifications(prev => upsertNotificationList(prev, lifecycleNotifications));

    // Record audit event
    addAuditEvent(
      effectiveRequestType === 'SOLAR_NET_METERING'
        ? 'SOLAR_NET_METERING_REQUEST_SUBMITTED'
        : effectiveRequestType === 'LOAD_CHANGE'
        ? 'LOAD_CHANGE_REQUEST_SUBMITTED'
        : 'NEW_CONNECTION_APPLICATION_SUBMITTED',
      newId,
      `Type: ${effectiveRequestType}, Applicant: ${newApp.applicantName}, Load: ${kw}kW, Subdiv: ${newApp.subdivision}`
    );

    showToast(`Application ${newId} submitted! Confirmation and tracking enabled.`, 'info');
    return newId;
  };

  const submitComplaintDemo = (data: Partial<ComplaintRecord>) => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/complaints')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot file complaints.`, 'error');
      return '';
    }
    if (
      effectiveRole === 'consumer' &&
      data.consumerNo &&
      data.consumerNo !== 'UNLINKED' &&
      userConnections.length > 0 &&
      !userConnections.some(c => c.consumerNo === data.consumerNo)
    ) {
      showToast('Access Denied: You can only file complaints for your own linked consumer numbers.', 'error');
      addAuditEvent('ACCESS_DENIED', `Connection:${data.consumerNo}`, 'Consumer blocked from filing complaint on unowned connection', activeUser.name, 'WARNING');
      return '';
    }

    const newId = generateNextRecordId(
      complaints.map(c => c.id),
      'CMP-',
      8831,
      4
    );
    const prio = data.priority || 'High';
    const dynamicSla = computeDynamicComplaintSlaFields({
      priority: prio,
      slaTargetHours: data.slaTargetHours,
      submittedAt: data.filedAt
    });

    const currentUserId = demoSession?.user.id || 'anonymous';
    const currentUserName = demoSession?.user.name || data.consumerName || 'Citizen Consumer';
    const currentUserPhone = demoSession?.user.mobileNumber || data.phone || '+91 98000 00000';

    const newCmp: ComplaintRecord = {
      id: newId,
      consumerNo: data.consumerNo || 'UNLINKED',
      consumerName: data.consumerName || currentUserName,
      phone: data.phone || currentUserPhone,
      category: data.category || 'Power Outage',
      description: data.description || 'Power supply issue reported.',
      priority: prio,
      status: 'Registered',
      subdivision: data.subdivision || 'Mehsana City North',
      feederName: data.feederName || 'Local Feeder',
      filedAt: data.filedAt || dynamicSla.filedAt,
      slaTargetHours: dynamicSla.slaTargetHours,
      slaDueTime: data.slaDueTime || dynamicSla.slaDueTime,
      slaBreached: false,
      accountId: currentUserId,
      timeline: [
        {
          time: dynamicSla.timelineTimeLabel,
          stage: 'Registered',
          actor: 'Consumer Portal',
          remark: 'Grievance ticket registered. Assigned to sub-divisional service desk.'
        }
      ]
    };

    setComplaints(prev => [newCmp, ...prev]);

    const empCmpNotif: AppNotification = {
      id: `NOTIF-EMP-${newId}-REGISTERED`,
      title: `New Grievance Registered: #${newId}`,
      message: `${newCmp.consumerName} filed a ${newCmp.category} grievance (${newCmp.priority}) in ${newCmp.subdivision}.`,
      time: 'Just now',
      targetRole: 'employee',
      type: newCmp.priority === 'Critical' ? 'alert' : 'warning',
      read: false,
      category: 'Outage',
      complaintId: newId,
      subdivision: newCmp.subdivision,
      eventKey: `EVT-EMP-CMP-${newId}-Registered`
    };
    const cmpNotifsToInsert: AppNotification[] = [empCmpNotif];

    // Auto-create a field work order if high or critical
    if (newCmp.priority === 'High' || newCmp.priority === 'Critical') {
      const woId = generateNextRecordId(
        workOrders.map(w => w.id),
        'WO-',
        4405,
        4
      );
      newCmp.assignedWorkOrderId = woId;
      newCmp.assignedTechnician = 'Vikramaditya Solanki (JE Field)';

      const newWo: WorkOrder = {
        id: woId,
        title: `Grievance Rectification: ${newCmp.category} (${newId})`,
        type: 'Feeder Patrol & Maintenance',
        subdivision: newCmp.subdivision,
        feederName: newCmp.feederName,
        location: `${newCmp.consumerName}, ${newCmp.consumerNo}`,
        gpsCoordinates: { lat: 23.6028, lng: 72.3984 },
        consumerNo: newCmp.consumerNo,
        consumerName: newCmp.consumerName,
        priority: newCmp.priority === 'Critical' ? 'Emergency' : 'High',
        scheduledDate: dynamicSla.scheduledWorkOrderDate,
        status: 'Pending',
        assignedTo: 'Vikramaditya Solanki (JE Field)',
        materialsNeeded: ['Safety Gear', 'Digital Clamp Meter', 'Insulated Tool Kit'],
        complaintId: newId,
        actionHistory: [
          {
            timestamp: new Date().toISOString(),
            stage: 'Pending',
            actor: 'System Automated Triage',
            notes: 'Emergency priority work order generated for line squad dispatch.'
          }
        ]
      };
      setWorkOrders(prev => [newWo, ...prev]);

      const fieldNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-FLD`,
        notificationType: 'WORK_ORDER_ASSIGNED',
        title: `Urgent Field Dispatch: ${woId}`,
        message: `${newCmp.category} reported at ${newCmp.subdivision}. Assigned to JE Field.`,
        time: 'Just now',
        targetRole: 'field',
        targetUserId: 'FLD-UG-201',
        type: 'alert',
        read: false,
        category: 'Outage',
        statusBadge: 'Emergency Dispatch',
        complaintId: newId,
        workOrderId: woId,
        subdivision: newCmp.subdivision,
        eventKey: `EVT-FLD-CMP-${newId}-${woId}`
      };
      cmpNotifsToInsert.unshift(fieldNotif);
    }

    setNotifications(prev => upsertNotificationList(prev, cmpNotifsToInsert));

    addAuditEvent(
      'GRIEVANCE_REGISTERED',
      newId,
      `Category: ${newCmp.category}, Consumer: ${newCmp.consumerNo}, Priority: ${prio}`
    );

    showToast(`Complaint ${newId} registered successfully! Assigned SLA: ${dynamicSla.slaTargetHours}h.`, 'success');
    return newId;
  };

  const updateApplicationStatus = (id: string, status: NewConnectionApplication['status'], note?: string) => {
    // Role-based privilege enforcement using authenticated session role
    if (!isActionAuthorized(effectiveRole, 'PATCH /api/v1/applications/:id/status')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to sanction applications.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Application:${id}`, `Unauthorized attempt to update application status by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }

    const targetApp =
      applicationsRef.current.find(a => a.id === id) ||
      applications.find(a => a.id === id);
    if (!targetApp) {
      showToast(`Application #${id} was not found in the ERP database.`, 'error');
      return;
    }

    // Business transition validation
    if (!isValidApplicationTransition(targetApp.status, status)) {
      showToast(`Invalid lifecycle progression: cannot advance from "${targetApp.status}" directly to "${status}".`, 'error');
      return;
    }

    const isStatusChange = targetApp.status !== status;

    const stepMap: Record<NewConnectionApplication['status'], number> = {
      'Submitted': 1,
      'Document Verification': 2,
      'Site Inspection': 3,
      'Sanction Approval': 4,
      'Meter Installed': 5,
      'Rejected': 0
    };

    const newHistory = note
      ? [...targetApp.notesHistory, { timestamp: '15-Oct 06:19', author: `${activeUser.name} (${effectiveRole.toUpperCase()})`, note }]
      : targetApp.notesHistory;

    // If entering or updating in Site Inspection, ensure a linked site-inspection WorkOrder exists before committing state
    let siteInspectionWoResolution: SiteInspectionWorkOrderResolution | undefined;
    if (status === 'Site Inspection') {
      siteInspectionWoResolution = ensureSiteInspectionWorkOrderForApplication({
        app: targetApp,
        workOrders: workOrdersRef.current,
        actorLabel: activeUser.name,
        timestamp: new Date().toISOString()
      });
      workOrdersRef.current = siteInspectionWoResolution.updatedWorkOrders;
      setWorkOrders(siteInspectionWoResolution.updatedWorkOrders);
    }

    const updatedTargetApp: NewConnectionApplication = {
      ...targetApp,
      status,
      workflowStep: stepMap[status],
      clarificationRequested: false,
      clarificationNote: undefined,
      ...(siteInspectionWoResolution
        ? {
            assignedWorkOrderId: siteInspectionWoResolution.assignedWorkOrderId,
            ...(siteInspectionWoResolution.assignedEngineer
              ? { assignedEngineer: siteInspectionWoResolution.assignedEngineer }
              : {})
          }
        : {}),
      notesHistory: newHistory
    };

    const nextApplications = applicationsRef.current.map(app =>
      app.id === id ? updatedTargetApp : app
    );
    applicationsRef.current = nextApplications;
    setApplications(nextApplications);

    // Emit Field Engineer inspection dispatch notification only when work order is newly created or stage just transitioned
    if (status === 'Site Inspection' && siteInspectionWoResolution && (siteInspectionWoResolution.created || isStatusChange)) {
      const app = updatedTargetApp;
      const woId = siteInspectionWoResolution.assignedWorkOrderId;
      const assignedEng = resolveCanonicalFieldEngineerIdentity(
        siteInspectionWoResolution.assignedEngineer || app.assignedEngineer,
        fieldEngineers
      );
      const fieldNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-FLD-INS`,
        notificationType: 'SITE_INSPECTION_ASSIGNED',
        title: `New Site Inspection Order: ${woId}`,
        message: `Feasibility check scheduled for ${app.applicantName} (${app.requestedLoadKw}kW) in ${app.subdivision}.`,
        time: 'Just now',
        targetRole: 'field',
        targetUserId: assignedEng.id,
        type: 'info',
        read: false,
        category: 'Inspection',
        statusBadge: 'Site Inspection',
        applicationId: app.id,
        workOrderId: woId,
        subdivision: app.subdivision,
        eventKey: `FLD:${woId}:SITE_INSPECTION_ASSIGNED`
      };
      setNotifications(prev => upsertNotificationList(prev, [fieldNotif]));
    }

    // If moved to Meter Installed, provision or update the active Electricity Connection deterministically!
    let provisionedConnMeta: { newConsumerNo: string; newMeterNo: string } | undefined;
    if (status === 'Meter Installed') {
      const app = updatedTargetApp;
      const isLinkedServiceModification =
        (app.serviceRequestType === 'SOLAR_NET_METERING' ||
          app.serviceRequestType === 'LOAD_CHANGE') &&
        Boolean(app.linkedConsumerNo);
      const existingLinkedConn = isLinkedServiceModification
        ? connections.find(
            c =>
              normalizeBillingIdentifier(c.consumerNo) ===
              normalizeBillingIdentifier(app.linkedConsumerNo)
          )
        : undefined;

      if (existingLinkedConn) {
        // Update the existing connection's sanctioned load / attributes without creating a duplicate connection
        provisionedConnMeta = {
          newConsumerNo: existingLinkedConn.consumerNo,
          newMeterNo: existingLinkedConn.meterNo
        };
        setConnections(prev =>
          prev.map(c =>
            c.consumerNo === existingLinkedConn.consumerNo
              ? {
                  ...c,
                  sanctionedLoadKw:
                    app.serviceRequestType === 'LOAD_CHANGE'
                      ? app.requestedLoadKw
                      : c.sanctionedLoadKw,
                  phase: app.phase || c.phase,
                  status: 'Active'
                }
              : c
          )
        );
      } else {
        const expectedConnId = `CONN-${app.id.replace('APP-', '')}`;
        const existingAppConn = connections.find(c => c.connectionId === expectedConnId);
        if (existingAppConn) {
          provisionedConnMeta = {
            newConsumerNo: existingAppConn.consumerNo,
            newMeterNo: existingAppConn.meterNo
          };
        } else {
          const deterministicSuffix = app.id.replace(/[^0-9]/g, '').slice(-5).padStart(5, '4');
          const newConsumerNo = `04281-${deterministicSuffix}`;
          const newMeterNo = `MTR-2026-${deterministicSuffix}`;
          provisionedConnMeta = { newConsumerNo, newMeterNo };

          const newConn: ElectricityConnection = {
            consumerNo: newConsumerNo,
            connectionId: expectedConnId,
            consumerName: app.applicantName,
            meterNo: newMeterNo,
            sanctionedLoadKw: app.requestedLoadKw,
            phase: app.phase,
            tariffCategory: app.category,
            address: app.address,
            subdivision: app.subdivision,
            feederName: '11kV Visnagar Road Feeder',
            status: 'Active',
            connectedDate: '15-Oct-2026',
            lastReadingDate: '15-Oct-2026',
            currentReadingKwh: Math.max(85, Math.round(app.requestedLoadKw * 55)),
            previousReadingKwh: 0,
            averageMonthlyKwh: app.requestedLoadKw * 60,
            securityDeposit: app.estimatedSanctionCost * 0.4,
            accountId: app.accountId,
            accountEmail: app.email
          };

          // Append new connection so existing primary selection is preserved
          setConnections(prev => [...prev, newConn]);
        }
      }
    }

    const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(
      updatedTargetApp,
      status,
      note,
      provisionedConnMeta
    );
    const lifecycleNotifications = [
      employeeNotif,
      ...(consumerNotif ? [consumerNotif] : [])
    ];

    // Mark current scope's own toast as already delivered so we don't fire a duplicate toast on top of the direct action toast
    const actorScopeKey = getNotificationInboxScopeKey(effectiveRole, demoSession);
    setInboxStateMap(prev => {
      const existing = prev[actorScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const updatedKeys = new Set(existing.deliveredToastEventKeys);
      for (const item of lifecycleNotifications) {
        if (item.eventKey && item.targetRole === effectiveRole) {
          updatedKeys.add(item.eventKey);
        }
      }
      return {
        ...prev,
        [actorScopeKey]: {
          ...existing,
          deliveredToastEventKeys: Array.from(updatedKeys)
        }
      };
    });

    setNotifications(prev => upsertNotificationList(prev, lifecycleNotifications));

    addAuditEvent(
      'APPLICATION_STATUS_UPDATED',
      id,
      `New status: ${status} (Stage ${stepMap[status]}/5). ${note || ''}`,
      activeUser.name
    );

    const toastTone: ToastMessage['type'] =
      status === 'Meter Installed'
        ? 'success'
        : status === 'Rejected'
        ? 'error'
        : status === 'Document Verification' || status === 'Sanction Approval'
        ? 'warning'
        : 'info';

    showToast(
      status === 'Meter Installed'
        ? `Application ${id} Approved & Energized!`
        : status === 'Rejected'
        ? `Application ${id} Rejected${note ? `: ${note}` : ''}`
        : `Application ${id} advanced to "${status}"`,
      toastTone
    );
  };

  const requestApplicationClarification = (id: string, note: string) => {
    if (!isActionAuthorized(effectiveRole, 'PATCH /api/v1/applications/:id/status')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot request application clarifications.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Application:${id}`, `Unauthorized attempt to request clarification by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }

    const targetApp = applications.find(a => a.id === id);
    if (!targetApp) {
      showToast(`Application #${id} was not found in the ERP database.`, 'error');
      return;
    }

    const cleanNote = note.trim() || 'Additional document or load details required for verification.';
    const updatedApp: NewConnectionApplication = {
      ...targetApp,
      clarificationRequested: true,
      clarificationNote: cleanNote,
      notesHistory: [
        ...targetApp.notesHistory,
        {
          timestamp: '15-Oct 06:19',
          author: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
          note: `Clarification Requested: ${cleanNote}`
        }
      ]
    };

    setApplications(prev => prev.map(a => (a.id === id ? updatedApp : a)));

    const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(
      updatedApp,
      'Clarification Requested',
      cleanNote
    );
    const clarificationNotifs = [
      employeeNotif,
      ...(consumerNotif ? [consumerNotif] : [])
    ];

    const actorScopeKey = getNotificationInboxScopeKey(effectiveRole, demoSession);
    setInboxStateMap(prev => {
      const existing = prev[actorScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const updatedKeys = new Set(existing.deliveredToastEventKeys);
      for (const item of clarificationNotifs) {
        if (item.eventKey && item.targetRole === effectiveRole) {
          updatedKeys.add(item.eventKey);
        }
      }
      return {
        ...prev,
        [actorScopeKey]: {
          ...existing,
          deliveredToastEventKeys: Array.from(updatedKeys)
        }
      };
    });

    setNotifications(prev => upsertNotificationList(prev, clarificationNotifs));

    addAuditEvent(
      'APPLICATION_CLARIFICATION_REQUESTED',
      id,
      `Clarification requested from applicant ${targetApp.applicantName}: ${cleanNote}`,
      activeUser.name
    );

    showToast(`Clarification requested for ${id}. Consumer notified.`, 'warning');
  };

  const archiveApplication = (id: string, reason?: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'PATCH /api/v1/applications/:id/archive')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to archive applications.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Application:${id}`, `Unauthorized attempt to archive application by ${effectiveRole}`, activeUser.name, 'WARNING');
      return false;
    }

    const targetApp = applications.find(a => a.id === id);
    if (!targetApp) {
      showToast(`Application #${id} was not found.`, 'error');
      return false;
    }

    const archiveEligibility = canArchiveApplication(targetApp);
    if (!archiveEligibility.allowed) {
      showToast(
        archiveEligibility.reason || `Cannot archive ${id}: Only completed (Meter Installed) or Rejected applications can be archived from the active queue.`,
        'warning'
      );
      return false;
    }

    const nowIso = new Date().toISOString();
    const archiveNote = reason?.trim() || `Archived from active employee queue after ${targetApp.status} completion.`;

    setApplications(prev =>
      prev.map(app =>
        app.id === id
          ? {
              ...app,
              isArchived: true,
              archivedAt: nowIso,
              archivedBy: activeUser.name,
              archiveReason: archiveNote,
              notesHistory: [
                ...app.notesHistory,
                {
                  timestamp: '15-Oct 06:19',
                  author: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
                  note: `Queue Archive: ${archiveNote}`
                }
              ]
            }
          : app
      )
    );

    addAuditEvent(
      'APPLICATION_ARCHIVED_FROM_QUEUE',
      id,
      `Archived completed/rejected application (${targetApp.status}) by ${activeUser.name}. Reason: ${archiveNote}`,
      activeUser.name
    );

    showToast(`Application ${id} archived from active queue. Audit trail & consumer record preserved.`, 'info');
    return true;
  };

  const restoreApplication = (id: string): boolean => {
    if (!isActionAuthorized(effectiveRole, 'PATCH /api/v1/applications/:id/restore')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to restore archived applications.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Application:${id}`, `Unauthorized attempt to restore archived application by ${effectiveRole}`, activeUser.name, 'WARNING');
      return false;
    }

    const targetApp = applications.find(a => a.id === id);
    if (!targetApp || !targetApp.isArchived) {
      showToast(`Archived application #${id} not found.`, 'error');
      return false;
    }

    setApplications(prev =>
      prev.map(app =>
        app.id === id
          ? {
              ...app,
              isArchived: false,
              archivedAt: undefined,
              archivedBy: undefined,
              archiveReason: undefined,
              notesHistory: [
                ...app.notesHistory,
                {
                  timestamp: '15-Oct 06:19',
                  author: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
                  note: 'Restored to active employee application queue.'
                }
              ]
            }
          : app
      )
    );

    addAuditEvent(
      'APPLICATION_RESTORED_TO_QUEUE',
      id,
      `Restored application ${id} to active queue by ${activeUser.name}`,
      activeUser.name
    );

    showToast(`Application ${id} restored to active queue.`, 'success');
    return true;
  };

  const updateComplaintStatus = (id: string, status: ComplaintRecord['status'], remark?: string) => {
    if (!isActionAuthorized(effectiveRole, 'PATCH /api/v1/complaints/:id/status')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot modify complaint status.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Complaint:${id}`, `Unauthorized attempt to update complaint status by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }

    const targetCmp = complaints.find(c => c.id === id);
    if (!targetCmp) {
      showToast(`Complaint #${id} was not found in the ERP records.`, 'error');
      return;
    }

    if (!isValidComplaintTransition(targetCmp.status, status)) {
      showToast(`Invalid status transition from "${targetCmp.status}" to "${status}".`, 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setComplaints(prev =>
      prev.map(cmp => {
        if (cmp.id !== id) return cmp;
        const newTimeline = [
          ...cmp.timeline,
          {
            time: `15-Oct ${timeStr}`,
            stage: status,
            actor: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
            remark: remark || `Status progressed to ${status}`
          }
        ];
        return {
          ...cmp,
          status,
          timeline: newTimeline,
          ...(status === 'Resolved' ? { resolvedAt: nowIso, resolutionRemarks: remark || 'Resolved by operations team.' } : {})
        };
      })
    );

    if (status === 'Resolved') {
      const cnsNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-CMP-RESOLVED`,
        title: `Grievance #${id} Resolved`,
        message: `Your grievance has been resolved: ${remark || 'Rectified on site.'}`,
        time: 'Just now',
        targetRole: 'consumer',
        type: 'success',
        read: false,
        category: 'Outage',
        complaintId: id,
        accountId: targetCmp.accountId,
        subdivision: targetCmp.subdivision,
        eventKey: `EVT-CNS-CMP-${id}-Resolved`
      };
      setNotifications(prev => upsertNotificationList(prev, [cnsNotif]));
    }

    addAuditEvent(
      'GRIEVANCE_STATUS_UPDATED',
      id,
      `New status: ${status}. Remarks: ${remark || 'None'}`,
      activeUser.name
    );

    showToast(`Complaint ${id} marked as "${status}"`, 'info');
  };

  const assignComplaintToField = (
    complaintId: string,
    engineerName: string,
    priority?: string,
    notes?: string
  ): boolean => {
    if (!isActionAuthorized(effectiveRole, 'POST /api/v1/complaints/:id/assign')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" cannot dispatch field crews.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Complaint:${complaintId}`, `Unauthorized attempt to dispatch field crew by ${effectiveRole}`, activeUser.name, 'WARNING');
      return false;
    }

    const targetCmp = complaints.find(c => c.id === complaintId);
    if (!targetCmp) {
      showToast(`Complaint #${complaintId} not found.`, 'error');
      return false;
    }

    const woId = targetCmp.assignedWorkOrderId || `WO-CMP-${complaintId.replace('CMP-', '')}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update complaint record
    setComplaints(prev =>
      prev.map(c => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          status: 'Dispatched',
          assignedTechnician: engineerName,
          assignedWorkOrderId: woId,
          timeline: [
            ...c.timeline,
            {
              time: `15-Oct ${timeStr}`,
              stage: 'Dispatched',
              actor: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
              remark: `Assigned to field engineer ${engineerName}. Work Order: ${woId}. ${notes || ''}`
            }
          ]
        };
      })
    );

    // Create or synchronize WorkOrder
    const newWo: WorkOrder = {
      id: woId,
      title: `Grievance Rectification: ${targetCmp.category} (${complaintId})`,
      type: 'Feeder Patrol & Maintenance',
      subdivision: targetCmp.subdivision,
      feederName: targetCmp.feederName,
      location: `${targetCmp.consumerName}, ${targetCmp.consumerNo}`,
      gpsCoordinates: { lat: 23.6028, lng: 72.3984 },
      consumerNo: targetCmp.consumerNo,
      consumerName: targetCmp.consumerName,
      priority: (priority as WorkOrder['priority']) || (targetCmp.priority === 'Critical' ? 'Emergency' : 'High'),
      scheduledDate: 'Today',
      status: 'Pending',
      assignedTo: engineerName,
      materialsNeeded: ['Safety Harness', 'Digital Clamp Meter', 'Insulated Tool Kit'],
      complaintId: complaintId,
      actionHistory: [
        {
          timestamp: new Date().toISOString(),
          stage: 'Pending',
          actor: activeUser.name,
          notes: notes || 'Assigned from complaint triage desk.'
        }
      ]
    };

    setWorkOrders(prev => {
      const filtered = prev.filter(w => w.id !== woId);
      return [newWo, ...filtered];
    });

    // Notify field engineer
    const assignedEng = resolveCanonicalFieldEngineerIdentity(engineerName, fieldEngineers);
    const isEmergency = (priority as WorkOrder['priority']) === 'Emergency' || targetCmp.priority === 'Critical';
    const fieldNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-FLD-CMP`,
      notificationType: 'WORK_ORDER_ASSIGNED',
      title: `New Dispatch: ${woId}`,
      message: `${targetCmp.category} assigned at ${targetCmp.subdivision} for ${targetCmp.consumerName}.`,
      time: 'Just now',
      targetRole: 'field',
      targetUserId: assignedEng.id,
      type: 'alert',
      read: false,
      category: 'Outage',
      statusBadge: isEmergency ? 'Emergency Dispatch' : 'Field Assignment',
      complaintId: complaintId,
      workOrderId: woId,
      subdivision: targetCmp.subdivision,
      eventKey: `EVT-FLD-CMP-${complaintId}-Dispatched`
    };

    // Notify consumer with clean, consumer-appropriate message
    const consumerNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-CNS-DISP`,
      title: `Field Team Dispatched: #${complaintId}`,
      message: `A field engineering team has been dispatched to inspect and rectify your grievance.`,
      time: 'Just now',
      targetRole: 'consumer',
      type: 'info',
      read: false,
      category: 'Outage',
      complaintId: complaintId,
      accountId: targetCmp.accountId,
      subdivision: targetCmp.subdivision,
      eventKey: `EVT-CNS-CMP-${complaintId}-Dispatched`
    };

    setNotifications(prev => upsertNotificationList(prev, [fieldNotif, consumerNotif]));

    addAuditEvent(
      'COMPLAINT_ASSIGNED_TO_FIELD',
      complaintId,
      `Assigned to ${engineerName}. Generated Work Order: ${woId}.`,
      activeUser.name
    );

    showToast(`Complaint ${complaintId} dispatched to ${engineerName} (Work Order: ${woId})`, 'success');
    return true;
  };

  const assignWorkOrder = (
    woId: string,
    engineerIdOrName: string,
    notes?: string
  ): boolean => {
    if (effectiveRole === 'consumer') {
      showToast('Access Denied: Consumers cannot assign work orders.', 'error');
      addAuditEvent('ACCESS_DENIED', `WorkOrder:${woId}`, 'Unauthorized work order assignment attempt by consumer', activeUser.name, 'WARNING');
      return false;
    }

    const targetWo = workOrdersRef.current.find(w => w.id === woId);
    if (!targetWo) {
      showToast(`Work Order #${woId} was not found.`, 'error');
      return false;
    }

    const assignedEng = resolveCanonicalFieldEngineerIdentity(engineerIdOrName, fieldEngineers);
    const nowIso = new Date().toISOString();

    const updatedWo: WorkOrder = {
      ...targetWo,
      assignedTo: assignedEng.name,
      actionHistory: [
        ...(targetWo.actionHistory || []),
        {
          timestamp: nowIso,
          stage: targetWo.status,
          actor: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
          notes: `Assigned to ${assignedEng.name} (${assignedEng.id}).${notes ? ` ${notes}` : ''}`
        }
      ]
    };

    const nextWorkOrders = workOrdersRef.current.map(w => (w.id === woId ? updatedWo : w));
    workOrdersRef.current = nextWorkOrders;
    setWorkOrders(nextWorkOrders);

    const notif = buildWorkOrderAssignedNotification({
      wo: updatedWo,
      targetEngineer: assignedEng,
      actorLabel: activeUser.name,
      notes,
      nowIso
    });
    setNotifications(prev => upsertNotificationList(prev, [notif]));

    addAuditEvent(
      'WORK_ORDER_ASSIGNED',
      woId,
      `Assigned to ${assignedEng.name} (${assignedEng.id}) by ${activeUser.name}`,
      activeUser.name
    );

    showToast(`Work Order ${woId} assigned to ${assignedEng.name}`, 'success');
    return true;
  };

  const reassignWorkOrder = (
    woId: string,
    newEngineerIdOrName: string,
    reason?: string
  ): boolean => {
    const res = reassignWorkOrderRecord({
      woId,
      newEngineerIdOrName,
      reason,
      actorUser: activeUser,
      effectiveRole,
      workOrders: workOrdersRef.current,
      fieldEngineers,
      notifications,
      nowIso: new Date().toISOString()
    });

    if (!res.success) {
      showToast(res.error || 'Failed to reassign work order.', 'error');
      return false;
    }

    workOrdersRef.current = res.updatedWorkOrders;
    setWorkOrders(res.updatedWorkOrders);
    setNotifications(res.updatedNotifications);

    addAuditEvent(
      'WORK_ORDER_REASSIGNED',
      woId,
      `Reassigned: ${reason || 'Task re-allocation'} by ${activeUser.name}`,
      activeUser.name
    );

    showToast(`Work Order ${woId} reassigned successfully.`, 'success');
    return true;
  };

  const updateWorkOrderPriorityAndSchedule = (
    woId: string,
    priority?: WorkOrder['priority'],
    scheduledDate?: string,
    notes?: string
  ): boolean => {
    const res = updateWorkOrderPriorityAndScheduleRecord({
      woId,
      newPriority: priority,
      newScheduledDate: scheduledDate,
      notes,
      actorUser: activeUser,
      effectiveRole,
      workOrders: workOrdersRef.current,
      fieldEngineers,
      notifications,
      nowIso: new Date().toISOString()
    });

    if (!res.success) {
      showToast(res.error || 'Failed to update work order parameters.', 'error');
      return false;
    }

    workOrdersRef.current = res.updatedWorkOrders;
    setWorkOrders(res.updatedWorkOrders);
    setNotifications(res.updatedNotifications);

    addAuditEvent(
      'WORK_ORDER_UPDATED',
      woId,
      `Priority: ${priority || 'unchanged'}, Scheduled: ${scheduledDate || 'unchanged'} by ${activeUser.name}`,
      activeUser.name
    );

    showToast(`Work Order ${woId} parameters updated.`, 'info');
    return true;
  };

  const refreshFieldOfflineQueueFromStorage = (): FieldOfflineQueueItem[] => {
    const loaded = loadFieldOfflineQueue();
    fieldOfflineQueueRef.current = loaded;
    setFieldOfflineQueue(loaded);
    return loaded;
  };

  const enqueueFieldInspectionOffline = (
    woId: string,
    report: NonNullable<WorkOrder['inspectionReport']>,
    submittedBy: string
  ): FieldOfflineQueueItem => {
    const { item, queue } = enqueueFieldInspectionAction({
      woId,
      canonicalWorkOrders: workOrdersRef.current,
      existingQueue: fieldOfflineQueueRef.current,
      inspectionReport: report,
      submittedBy
    });
    fieldOfflineQueueRef.current = queue;
    setFieldOfflineQueue(queue);
    addAuditEvent(
      'FIELD_OFFLINE_ACTION_QUEUED',
      woId,
      `Offline site inspection queued (UUID: ${item.client_uuid}, Meter: ${report.meterSerialScanned})`,
      activeUser.name
    );
    showToast(
      `Inspection report for ${woId} queued locally (Offline Queue). Canonical ERP state will update after DEMO replay.`,
      'info'
    );
    return item;
  };

  const enqueueFieldStatusOffline = (
    woId: string,
    status: WorkOrder['status'],
    report?: WorkOrder['inspectionReport']
  ): FieldOfflineQueueItem => {
    const { item, queue } = enqueueFieldWorkOrderStatusAction({
      woId,
      targetStatus: status,
      canonicalWorkOrders: workOrdersRef.current,
      existingQueue: fieldOfflineQueueRef.current,
      inspectionReport: report,
      submittedBy: `${activeUser.name} (${activeUser.id})`
    });
    fieldOfflineQueueRef.current = queue;
    setFieldOfflineQueue(queue);
    addAuditEvent(
      'FIELD_OFFLINE_ACTION_QUEUED',
      woId,
      `Offline work order status update -> "${status}" queued (UUID: ${item.client_uuid})`,
      activeUser.name
    );
    showToast(
      `Work Order #${woId} status change to "${status}" queued locally (Offline Queue).`,
      'info'
    );
    return item;
  };

  const updateWorkOrderStatus = (
    id: string,
    status: WorkOrder['status'],
    report?: WorkOrder['inspectionReport'],
    options?: { bypassOfflineQueue?: boolean; silentToast?: boolean }
  ): { success: boolean; error?: string; conflict?: boolean } => {
    if (!isActionAuthorized(effectiveRole, 'PATCH /api/v1/workorders/:id/status')) {
      const errMsg = `Access Denied: Role "${effectiveRole.toUpperCase()}" cannot update work order status.`;
      showToast(errMsg, 'error');
      addAuditEvent('ACCESS_DENIED', `WorkOrder:${id}`, `Unauthorized attempt to update work order status by ${effectiveRole}`, activeUser.name, 'WARNING');
      return { success: false, error: errMsg };
    }

    // Intercept Field Engineer actions when offline mode (simulated or browser offline) is active
    if (effectiveRole === 'field' && isFieldOfflineActive && !options?.bypassOfflineQueue) {
      if (status === 'Completed' && report && report.meterSerialScanned) {
        enqueueFieldInspectionOffline(
          id,
          report,
          `${activeUser.name} (${activeUser.id})`
        );
      } else {
        enqueueFieldStatusOffline(id, status, report);
      }
      return { success: true };
    }

    const targetWo = workOrdersRef.current.find(w => w.id === id);
    if (!targetWo) {
      const errMsg = `Work Order #${id} was not found.`;
      if (!options?.silentToast) showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }

    const isSignedInspectionCompletion =
      status === 'Completed' &&
      Boolean(report && report.meterSerialScanned) &&
      (targetWo.status === 'Pending' || targetWo.status === 'En Route' || targetWo.status === 'On Site');

    if (!isSignedInspectionCompletion && !isValidWorkOrderTransition(targetWo.status, status)) {
      const errMsg = `Invalid progression from "${targetWo.status}" to "${status}".`;
      if (!options?.silentToast) showToast(errMsg, 'error');
      return {
        success: false,
        error: errMsg,
        conflict: targetWo.status === 'Completed' || targetWo.status === 'Deferred'
      };
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const nextWorkOrders = workOrdersRef.current.map(wo => {
      if (wo.id !== id) return wo;
      const newHistory = [
        ...(wo.actionHistory || []),
        {
          timestamp: nowIso,
          stage: status,
          actor: `${activeUser.name} (${currentRole.toUpperCase()})`,
          notes: report?.technicianRemarks || `Work Order status progressed to ${status}`
        }
      ];
      return {
        ...wo,
        status,
        ...(report ? { inspectionReport: report } : {}),
        actionHistory: newHistory
      };
    });

    workOrdersRef.current = nextWorkOrders;
    setWorkOrders(nextWorkOrders);

    // Cross-portal completion sync
    if (status === 'Completed') {
      // 1. Linked application site feasibility inspection
      const titleAppMatch = targetWo.title?.match(/\b(APP-\d{4}-\d+)\b/)?.[1];
      const byAssignedWoApp = applicationsRef.current.find(a => a.assignedWorkOrderId === id);
      const targetAppId =
        targetWo.applicationId ||
        byAssignedWoApp?.id ||
        titleAppMatch ||
        (id === 'WO-4402' ? 'APP-2026-0842' : id.startsWith('WO-INS-') ? id.replace('WO-INS-', 'APP-') : null);
      if (targetAppId) {
        const currentApp =
          applicationsRef.current.find(a => a.id === targetAppId) ||
          applications.find(a => a.id === targetAppId);
        const updatedApp: NewConnectionApplication | null = currentApp
          ? {
              ...currentApp,
              status: 'Sanction Approval',
              workflowStep: 4,
              assignedWorkOrderId: currentApp.assignedWorkOrderId || id,
              notesHistory: [
                ...currentApp.notesHistory,
                {
                  timestamp: `15-Oct ${timeStr}`,
                  author: `${activeUser.name} (JE Field)`,
                  note: `Site Feasibility verified. Meter #${report?.meterSerialScanned || 'Verified'}, voltage normal (${report?.testedPhaseVoltage?.r || 230}V). Clearance passed for sanction release.`
                }
              ]
            }
          : null;

        if (updatedApp) {
          const nextApps = applicationsRef.current.map(app =>
            app.id === targetAppId ? updatedApp : app
          );
          applicationsRef.current = nextApps;
          setApplications(nextApps);
        }

        if (updatedApp) {
          const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(
            updatedApp,
            'Sanction Approval'
          );
          const sanctionNotifs = [
            employeeNotif,
            ...(consumerNotif ? [consumerNotif] : [])
          ];
          setNotifications(prev => upsertNotificationList(prev, sanctionNotifs));
        }
      }

      // 2. Linked consumer grievance rectification
      const targetCmpId = targetWo.complaintId || (id === 'WO-4401' ? 'CMP-8821' : id.startsWith('WO-CMP-') ? id.replace('WO-CMP-', 'CMP-') : null);
      if (targetCmpId) {
        const resolutionMsg = report?.technicianRemarks || 'On-site rectification completed by field engineering crew.';
        setComplaints(prev =>
          prev.map(c => {
            if (c.id !== targetCmpId) return c;
            return {
              ...c,
              status: 'Resolved',
              resolvedAt: nowIso,
              resolutionRemarks: resolutionMsg,
              timeline: [
                ...c.timeline,
                {
                  time: `15-Oct ${timeStr}`,
                  stage: 'Resolved',
                  actor: `${activeUser.name} (Field JE)`,
                  remark: resolutionMsg
                }
              ]
            };
          })
        );

        // Notify consumer
        const linkedCmp = complaints.find(c => c.id === targetCmpId);
        const consumerCmpNotif: AppNotification = {
          id: `NOTIF-${Date.now()}-CNS-RESOLVED`,
          title: `Grievance #${targetCmpId} Resolved`,
          message: `Your grievance has been resolved on site by ${activeUser.name}. Resolution remarks: ${resolutionMsg}`,
          time: 'Just now',
          targetRole: 'consumer',
          type: 'success',
          read: false,
          category: 'Outage',
          complaintId: targetCmpId,
          accountId: linkedCmp?.accountId,
          subdivision: targetWo.subdivision,
          eventKey: `EVT-CNS-CMP-${targetCmpId}-Resolved`
        };

        // Notify employee operations desk
        const employeeCmpNotif: AppNotification = {
          id: `NOTIF-${Date.now()}-EMP-RESOLVED`,
          title: `Work Order Closed: ${id}`,
          message: `Field crew resolved complaint #${targetCmpId} (${targetWo.subdivision}). Remarks: ${resolutionMsg}`,
          time: 'Just now',
          targetRole: 'employee',
          type: 'info',
          read: false,
          category: 'Outage',
          complaintId: targetCmpId,
          workOrderId: id,
          subdivision: targetWo.subdivision,
          eventKey: `EVT-EMP-WO-${id}-Completed`
        };

        setNotifications(prev => upsertNotificationList(prev, [consumerCmpNotif, employeeCmpNotif]));
      }
    }

    addAuditEvent(
      'WORK_ORDER_STATUS_UPDATED',
      id,
      `Field Status: ${status}. ${report ? `Report filed (Serial: ${report.meterSerialScanned})` : ''}`,
      activeUser.name
    );

    if (!options?.silentToast) {
      showToast(`Work Order ${id} updated to "${status}"`, 'success');
    }

    return { success: true };
  };

  const syncFieldOfflineQueue = (options?: {
    restoreOnline?: boolean;
    targetClientUuid?: string;
  }): FieldOfflineReplaySummary => {
    if (isReplayingOfflineQueueRef.current) {
      return {
        queue: fieldOfflineQueueRef.current,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 0,
        skippedCount: 0,
        blockedOffline: false,
        error: 'Offline queue replay is already in progress.'
      };
    }

    if (isBrowserOffline) {
      showToast('Cannot replay queued actions while browser network is offline.', 'warning');
      return {
        queue: fieldOfflineQueueRef.current,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 0,
        skippedCount: fieldOfflineQueueRef.current.filter(i => i.status === 'PENDING').length,
        blockedOffline: true,
        error: 'Cannot replay queued actions while browser network is offline.'
      };
    }

    if (options?.restoreOnline && isOfflineSimulated) {
      setIsOfflineSimulated(false);
    }

    const effectiveOnline = options?.restoreOnline ? !isBrowserOffline : !isFieldOfflineActive;
    if (!effectiveOnline) {
      return {
        queue: fieldOfflineQueueRef.current,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 0,
        skippedCount: fieldOfflineQueueRef.current.filter(i => i.status === 'PENDING').length,
        blockedOffline: true,
        error: 'Cannot replay queued actions while offline mode is active.'
      };
    }

    isReplayingOfflineQueueRef.current = true;
    setIsFieldSyncing(true);
    try {
      const currentQueue = loadFieldOfflineQueue();
      const summary = replayFieldOfflineQueue({
        queue: currentQueue,
        isOnline: true,
        dataMode,
        isLiveBackendConnected: backendStatus.state === 'LIVE_CONNECTED',
        processedUuids: processedOfflineUuidsRef.current,
        targetClientUuid: options?.targetClientUuid,
        getWorkOrder: (woId: string) => workOrdersRef.current.find(w => w.id === woId),
        executeWorkflowUpdate: (item: FieldOfflineQueueItem) => {
          return updateWorkOrderStatus(
            item.payload.woId,
            item.payload.targetStatus,
            item.payload.inspectionReport,
            { bypassOfflineQueue: true, silentToast: true }
          );
        }
      });

      fieldOfflineQueueRef.current = summary.queue;
      setFieldOfflineQueue(summary.queue);

      if (summary.blockedLiveBackendUnavailable && summary.error) {
        showToast(summary.error, 'warning');
      } else if (summary.syncedCount > 0 && summary.failedCount === 0) {
        addAuditEvent(
          'FIELD_OFFLINE_QUEUE_REPLAYED',
          `Items:${summary.syncedCount}`,
          `Replayed ${summary.syncedCount} queued field action(s) into local DEMO ERP state`,
          activeUser.name
        );
        showToast(
          `DEMO Replay Complete: ${summary.syncedCount} queued action(s) applied to local ERP state.`,
          'success'
        );
        const syncNotif = buildOfflineSyncOutcomeNotification({
          summary,
          activeEngineerId: activeUser.id || 'FLD-UG-201'
        });
        if (syncNotif) {
          setNotifications(prev => upsertNotificationList(prev, [syncNotif]));
        }
      } else if (summary.failedCount > 0) {
        addAuditEvent(
          'FIELD_OFFLINE_QUEUE_CONFLICT',
          `Failed:${summary.failedCount}`,
          `DEMO replay completed with ${summary.syncedCount} applied and ${summary.failedCount} failed/conflicted item(s)`,
          activeUser.name,
          'WARNING'
        );
        showToast(
          `DEMO Replay: ${summary.syncedCount} applied, ${summary.failedCount} failed/conflicted. Review failed items in Offline Queue.`,
          'warning'
        );
        const syncNotif = buildOfflineSyncOutcomeNotification({
          summary,
          activeEngineerId: activeUser.id || 'FLD-UG-201'
        });
        if (syncNotif) {
          setNotifications(prev => upsertNotificationList(prev, [syncNotif]));
        }
      } else {
        showToast('No pending offline actions to replay.', 'info');
      }

      return summary;
    } finally {
      isReplayingOfflineQueueRef.current = false;
      setIsFieldSyncing(false);
    }
  };

  // Automatically replay pending offline queue actions when real or simulated connectivity is restored
  useEffect(() => {
    if (!isFieldOfflineActive) {
      const hasPending = fieldOfflineQueueRef.current.some(item => item.status === 'PENDING');
      if (hasPending && !isReplayingOfflineQueueRef.current) {
        syncFieldOfflineQueue({ restoreOnline: false });
      }
    }
  }, [isFieldOfflineActive]);

  const reportFeederFault = (
    feederId: string,
    faultType: string,
    remarks: string,
    severity: IncidentSeverity = 'CRITICAL',
    emergencyClassification: EmergencyHazardClassification = 'NONE'
  ) => {
    if (!isIncidentRoleAuthorized(effectiveRole) || !isActionAuthorized(effectiveRole, 'POST /api/v1/telemetry/faults')) {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to report operational feeder faults.`, 'error');
      addAuditEvent('ACCESS_DENIED', `Feeder:${feederId}`, `Unauthorized attempt to report feeder fault by ${effectiveRole}`, activeUser.name, 'WARNING');
      return;
    }
    const incId = `INC-FLT-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const lowerRemarks = `${faultType} ${remarks}`.toLowerCase();
    const isLifeThreatening =
      emergencyClassification !== 'NONE' ||
      lowerRemarks.includes('electrocution') ||
      lowerRemarks.includes('fire') ||
      lowerRemarks.includes('conductor snap') ||
      lowerRemarks.includes('fallen conductor') ||
      lowerRemarks.includes('explosion');

    const effectiveEmergencyClassification: EmergencyHazardClassification =
      emergencyClassification !== 'NONE'
        ? emergencyClassification
        : lowerRemarks.includes('electrocution')
        ? 'ELECTROCUTION_RISK'
        : lowerRemarks.includes('fire')
        ? 'FIRE_HAZARD'
        : lowerRemarks.includes('conductor')
        ? 'CONDUCTOR_SNAP'
        : lowerRemarks.includes('explosion')
        ? 'SUBSTATION_EXPLOSION'
        : 'NONE';

    const effectiveSeverity: IncidentSeverity = isLifeThreatening ? 'CRITICAL' : severity;

    const newInc: CriticalIncident = {
      id: incId,
      title: `${isLifeThreatening ? 'EMERGENCY LIFE HAZARD' : 'Field Hazard Alert'}: ${faultType} on ${feederId}`,
      description: `${remarks} Reported on site by ${activeUser.name} (${effectiveRole.toUpperCase()}).`,
      severity: effectiveSeverity,
      module: 'Distribution & SCADA',
      entityId: feederId,
      entityType: 'feeder',
      subdivision: 'Mehsana City North',
      timestamp: nowIso,
      responsibleRoles: isLifeThreatening
        ? ['field', 'employee', 'management', 'admin']
        : ['employee'], // Normal routing is Employee-first!
      recommendedAction: isLifeThreatening
        ? 'URGENT: Isolate feeder immediately at substation breaker. Mobilize emergency squad and notify fire/medical authorities.'
        : 'Verify substation bus breaker isolation and mobilize line squad.',
      status: 'DETECTED',
      isEmergencyOverride: isLifeThreatening,
      emergencyClassification: effectiveEmergencyClassification,
      emergencyBroadcastAt: isLifeThreatening ? nowIso : undefined,
      actionTab: 'maintenance',
      history: [
        {
          timestamp: nowIso,
          stage: 'DETECTED',
          actor: `${activeUser.name} (${effectiveRole.toUpperCase()})`,
          notes: `${isLifeThreatening ? '[EMERGENCY OVERRIDE BROADCAST] ' : ''}${remarks}`
        }
      ]
    };

    setIncidents(prev => [newInc, ...prev]);

    if (severity === 'CRITICAL' && isLifeThreatening) {
      setActiveCriticalModalIncident(newInc);
      playIncidentSound('CRITICAL');
      addAuditEvent(
        'EMERGENCY_SAFETY_OVERRIDE_BROADCAST',
        incId,
        `Emergency hazard broadcasted: ${faultType} on ${feederId}. Classification: ${effectiveEmergencyClassification}. ${remarks}`,
        activeUser.name
      );
    } else {
      playIncidentSound('WARNING');
    }

    // Employee-First Critical Incident Rule: Newly detected incidents notify authorized Employee desk
    const empDetectedNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-INC-${incId}`,
      notificationType: 'CRITICAL_INCIDENT_DETECTED',
      title: `Critical Incident Detected: ${incId}`,
      message: `${newInc.title}. Feeder: ${feederId}. Subdivision: ${newInc.subdivision}. Immediate operational review required.`,
      time: 'Just now',
      createdAt: nowIso,
      formattedTimestamp: formatErpDateTime(nowIso),
      targetRole: 'employee',
      role: 'employee',
      targetUserId: 'EMP-UG-1101',
      incidentId: incId,
      actionUrl: `/employee/incidents?incident=${incId}`,
      type: 'alert',
      read: false,
      category: 'Outage',
      subdivision: newInc.subdivision,
      statusBadge: 'Critical Incident',
      eventKey: `EVT-INC-${incId}-DETECTED`
    };

    const newFaultNotifs = [empDetectedNotif];

    // If life threatening emergency, broadcast alert to management immediately
    if (isLifeThreatening) {
      newFaultNotifs.push({
        id: `NOTIF-${Date.now()}-MGMT-FAULT`,
        title: `EMERGENCY SAFETY OVERRIDE: ${feederId}`,
        message: `${faultType} (${effectiveEmergencyClassification}) reported by field engineer: ${remarks}`,
        time: 'Just now',
        createdAt: nowIso,
        formattedTimestamp: formatErpDateTime(nowIso),
        targetRole: 'management',
        role: 'management',
        type: 'alert',
        read: false,
        category: 'Outage',
        subdivision: 'Mehsana City North',
        eventKey: `EVT-INC-${incId}-EMERG-MGMT`
      });
    }

    setNotifications(prev => upsertNotificationList(prev, newFaultNotifs));

    addAuditEvent(
      'FEEDER_FAULT_REPORTED_FROM_FIELD',
      feederId,
      `Fault: ${faultType}. Severity: ${severity}. ${remarks}`,
      activeUser.name
    );

    showToast(
      isLifeThreatening
        ? `EMERGENCY SAFETY OVERRIDE broadcasted for ${feederId}!`
        : `Feeder hazard reported on ${feederId}. Routed to Employee Incident Control Desk.`,
      isLifeThreatening ? 'error' : 'warning'
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      if (existing.readIds.includes(id)) return prev;
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          readIds: [...existing.readIds, id]
        }
      };
    });
  };

  const markSelectedNotificationsRead = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setNotifications(prev => prev.map(n => (idSet.has(n.id) ? { ...n, read: true } : n)));
    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const merged = Array.from(new Set([...existing.readIds, ...ids]));
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          readIds: merged
        }
      };
    });
    showToast(`${ids.length} notification${ids.length === 1 ? '' : 's'} marked as read.`, 'info');
  };

  const markAllNotificationsRead = () => {
    const visibleIds = scopedNotifications.map(n => n.id);
    if (visibleIds.length === 0) return;
    const idSet = new Set(visibleIds);
    setNotifications(prev => prev.map(n => (idSet.has(n.id) ? { ...n, read: true } : n)));
    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const merged = Array.from(new Set([...existing.readIds, ...visibleIds]));
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          readIds: merged
        }
      };
    });
    showToast('All visible notifications marked as read.', 'info');
  };

  const deleteNotification = (id: string) => {
    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      if (existing.dismissedIds.includes(id)) return prev;
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          dismissedIds: [...existing.dismissedIds, id]
        }
      };
    });
    showToast('Notification removed.', 'info');
  };

  const deleteSelectedNotifications = (ids: string[]) => {
    if (ids.length === 0) return;
    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const merged = Array.from(new Set([...existing.dismissedIds, ...ids]));
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          dismissedIds: merged
        }
      };
    });
    showToast(`${ids.length} notification${ids.length === 1 ? '' : 's'} deleted.`, 'info');
  };

  const clearAllNotifications = () => {
    const visibleIds = scopedNotifications.map(n => n.id);
    if (visibleIds.length === 0) return;
    setInboxStateMap(prev => {
      const existing = prev[inboxScopeKey] || {
        readIds: [],
        dismissedIds: [],
        deliveredToastEventKeys: []
      };
      const merged = Array.from(new Set([...existing.dismissedIds, ...visibleIds]));
      return {
        ...prev,
        [inboxScopeKey]: {
          ...existing,
          dismissedIds: merged
        }
      };
    });
    showToast('Notification list cleared.', 'info');
  };

  const resetDemoData = () => {
    clearBackendSession();
    clearOfflineFieldQueue();
    try {
      localStorage.removeItem('vidyutone_consumers');
      localStorage.removeItem('vidyutone_connections');
      localStorage.removeItem('vidyutone_applications');
      localStorage.removeItem('vidyutone_complaints');
      localStorage.removeItem('vidyutone_workorders');
      localStorage.removeItem('vidyutone_employees');
      localStorage.removeItem('vidyutone_fieldengineers');
      localStorage.removeItem('vidyutone_bills');
      localStorage.removeItem('vidyutone_payments');
      localStorage.removeItem('vidyutone_notifications');
      localStorage.removeItem('vidyutflow_notification_inbox_state');
      localStorage.removeItem('vidyutone_auditlogs');
      localStorage.removeItem('vidyutflow_account_connections');
      localStorage.removeItem('vidyutflow_incidents');
      localStorage.removeItem('vidyut_ai_recommendations');
      localStorage.removeItem('vidyutflow_dismissed_modals');
      localStorage.removeItem('vidyutflow_field_offline_queue');
      localStorage.removeItem('vidyutflow_sla_emitted_event_keys');
    } catch (e) {}

    dismissedCriticalModalIdsRef.current.clear();
    executedRecommendationIdsRef.current.clear();
    emittedSlaEventKeysRef.current.clear();

    const initialDetected = detectAnomalies({
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      auditLogs: AUDIT_LOGS,
      bills: INITIAL_BILLS,
      consumerOwnedNumbers: new Set(INITIAL_CONNECTIONS.map(c => c.consumerNo))
    });

    const initialRecommendations = generateGroundedRecommendations({
      applications: INITIAL_APPLICATIONS,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      incidents: initialDetected,
      auditLogs: AUDIT_LOGS,
      existingRecommendations: []
    });

    const reconciledReset = reconcileApplicationWorkOrderLinks(
      INITIAL_APPLICATIONS,
      INITIAL_WORK_ORDERS
    );
    setConsumers(INITIAL_CONSUMERS);
    setConnections(INITIAL_CONNECTIONS);
    applicationsRef.current = reconciledReset.applications;
    setApplications(reconciledReset.applications);
    setComplaints(INITIAL_COMPLAINTS);
    workOrdersRef.current = reconciledReset.workOrders;
    setWorkOrders(reconciledReset.workOrders);
    setEmployees(INITIAL_EMPLOYEES);
    setFieldEngineers(CANONICAL_FIELD_ENGINEERS);
    setBills(INITIAL_BILLS);
    setPayments(INITIAL_PAYMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setInboxStateMap({});
    setAuditLogs(AUDIT_LOGS);
    setIncidents(initialDetected);
    setRecommendations(initialRecommendations);
    setActiveCriticalModalIncident(null);
    setActiveApprovalRecommendation(null);
    setActiveIncidentModalId(null);

    showToast('Demo dataset reset to initial state!', 'success');
  };

  const applyRestoredDemoBackupState = React.useCallback((restoredState: RestoredLiveRuntimeState) => {
    const reconciled = reconcileApplicationWorkOrderLinks(
      restoredState.applications,
      restoredState.workOrders
    );
    setConsumers(restoredState.consumers);
    setConnections(restoredState.connections);
    applicationsRef.current = reconciled.applications;
    setApplications(reconciled.applications);
    setComplaints(restoredState.complaints);
    workOrdersRef.current = reconciled.workOrders;
    setWorkOrders(reconciled.workOrders);
    setEmployees(restoredState.employees);
    setFieldEngineers(restoredState.fieldEngineers);
    setBills(restoredState.bills);
    setPayments(restoredState.payments);
    setNotifications(restoredState.notifications);
    setInboxStateMap(restoredState.notificationInboxState);
    setAuditLogs(restoredState.auditLogs);
    setIncidents(restoredState.incidents);
    setRecommendations(restoredState.aiRecommendations);
    fieldOfflineQueueRef.current = restoredState.fieldOfflineQueue;
    setFieldOfflineQueue(restoredState.fieldOfflineQueue);
    setSelectedConsumerConnMap(restoredState.selectedConsumerConnections);

    emittedBillingReminderKeysRef.current = new Set(restoredState.billingReminderKeys);
    emittedSlaEventKeysRef.current = new Set(restoredState.slaEmittedEventKeys);
    dismissedCriticalModalIdsRef.current = new Set(restoredState.dismissedModalIds);

    setActiveCriticalModalIncident(null);
    setActiveApprovalRecommendation(null);
    setActiveIncidentModalId(null);
  }, []);

  // ==========================================================================
  // PHASE 5: PERSISTENT BACKEND INTEGRATION & LIVE/DEMO MODE SEPARATION
  // ==========================================================================

  const repositories = useMemo<ErpRepositoryBundle>(() => {
    defaultErpApiClient.setMode(dataMode);
    return createErpRepositoryBundle(dataMode, defaultErpApiClient);
  }, [dataMode]);

  const syncWithBackend = async (): Promise<{ success: boolean; error?: string; requestId?: string }> => {
    if (dataMode === 'DEMO') {
      setBackendStatus({
        state: 'DEMO_ACTIVE',
        lastCheckedAt: new Date().toISOString()
      });
      return { success: true };
    }

    setBackendStatus(prev => ({
      ...prev,
      state: 'SYNCING'
    }));

    const liveRepo = createErpRepositoryBundle('LIVE', defaultErpApiClient);
    const connRes = await liveRepo.consumersConnections.getConnections(currentRole);

    if (!connRes.success || !connRes.data) {
      const errMessage =
        connRes.error ||
        'Persistent ERP backend (/api/v1/connections) is unavailable. LIVE mode does not silently fall back to demo data.';
      setBackendStatus({
        state: 'LIVE_UNAVAILABLE',
        lastError: errMessage,
        lastRequestId: connRes.requestId,
        lastCheckedAt: new Date().toISOString()
      });
      return {
        success: false,
        error: errMessage,
        requestId: connRes.requestId
      };
    }

    setConnections(connRes.data);
    setBackendStatus({
      state: 'LIVE_CONNECTED',
      lastRequestId: connRes.requestId,
      lastCheckedAt: new Date().toISOString()
    });
    return {
      success: true,
      requestId: connRes.requestId
    };
  };

  const setDataMode = (nextMode: OperatingDataMode) => {
    const persisted = setStoredDataMode(nextMode);
    setDataModeState(persisted);
    if (persisted === 'DEMO') {
      setBackendStatus({
        state: 'DEMO_ACTIVE',
        lastCheckedAt: new Date().toISOString()
      });
      showToast('Operating Mode set to DEMO (Simulated Browser Persistence)', 'info');
    } else {
      showToast('Operating Mode set to LIVE (/api/v1 Persistent Backend — No Silent Demo Fallback)', 'warning');
    }
  };

  useEffect(() => {
    if (dataMode === 'LIVE') {
      void syncWithBackend();
    } else {
      setBackendStatus({
        state: 'DEMO_ACTIVE',
        lastCheckedAt: new Date().toISOString()
      });
    }
  }, [dataMode, currentRole]);


  // ---------------------------------------------------------------------------
  // Work Order Completion Evidence & Verification Governance (Phase 13)
  // ---------------------------------------------------------------------------
  const submitWorkOrderCompletionEvidence = (woId: string, report: WorkOrderCompletionReport): boolean => {
    if (effectiveRole === 'consumer') {
      showToast('Access Denied: Consumers cannot submit work order completion evidence.', 'error');
      addAuditEvent('ACCESS_DENIED', `WorkOrder:${woId}`, `Unauthorized attempt to submit completion evidence by ${effectiveRole}`, activeUser.name, 'WARNING');
      return false;
    }

    const targetWo = workOrders.find(w => w.id === woId);
    if (!targetWo) {
      showToast(`Work Order #${woId} was not found.`, 'error');
      return false;
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setWorkOrders(prev =>
      prev.map(wo => {
        if (wo.id !== woId) return wo;
        const newHistory = [
          ...(wo.actionHistory || []),
          {
            timestamp: nowIso,
            stage: 'Completed',
            actor: `${activeUser.name} (Field JE)`,
            notes: `Work completed with field evidence: ${report.completionRemarks || report.repairAction || 'Site restoration complete.'}`
          }
        ];
        return {
          ...wo,
          status: 'Completed',
          verificationStatus: 'pending_verification',
          completionReport: report,
          actionHistory: newHistory
        };
      })
    );

    const targetCmpId = targetWo.complaintId || (woId === 'WO-4401' ? 'CMP-8821' : woId.startsWith('WO-CMP-') ? woId.replace('WO-CMP-', 'CMP-') : null);
    if (targetCmpId) {
      setComplaints(prev =>
        prev.map(c => {
          if (c.id !== targetCmpId) return c;
          return {
            ...c,
            verificationStatus: 'pending_verification',
            timeline: [
              ...c.timeline,
              {
                time: `15-Oct ${timeStr}`,
                stage: 'Under Verification',
                actor: `${activeUser.name} (Field JE)`,
                remark: 'Restoration completed on site. Evidence and checklist submitted for authorized employee review.'
              }
            ]
          };
        })
      );
    }

    const employeeNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP-EVIDENCE-SUBMITTED`,
      title: `Completion Evidence Submitted: ${woId}`,
      message: `Field Engineer ${activeUser.name} submitted completion evidence for ${targetWo.title}. Verification required before closure.`,
      time: 'Just now',
      targetRole: 'employee',
      type: 'info',
      read: false,
      category: 'Outage',
      complaintId: targetCmpId || undefined,
      workOrderId: woId,
      subdivision: targetWo.subdivision,
      eventKey: `EVT-EMP-WO-${woId}-Evidence-Submitted`
    };
    setNotifications(prev => upsertNotificationList(prev, [employeeNotif]));

    addAuditEvent(
      'SUBMIT_COMPLETION_EVIDENCE',
      `WorkOrder:${woId}`,
      `Field completion evidence submitted with ${report.evidenceItems?.length || 0} photos by ${activeUser.name}`,
      activeUser.name,
      'SUCCESS'
    );

    showToast(`Work Order ${woId} completion submitted for employee verification`, 'success');
    return true;
  };

  const reviewWorkOrderCompletion = (woId: string, review: WorkOrderVerificationReview): boolean => {
    if (effectiveRole !== 'employee' && effectiveRole !== 'admin') {
      showToast(`Access Denied: Role "${effectiveRole.toUpperCase()}" is not authorized to verify field completion evidence.`, 'error');
      addAuditEvent('ACCESS_DENIED', `WorkOrder:${woId}`, `Unauthorized verification attempt by ${effectiveRole} (${activeUser.name})`, activeUser.name, 'WARNING');
      return false;
    }

    const targetWo = workOrders.find(w => w.id === woId);
    if (!targetWo) {
      showToast(`Work Order #${woId} was not found.`, 'error');
      return false;
    }

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const targetCmpId = targetWo.complaintId || (woId === 'WO-4401' ? 'CMP-8821' : woId.startsWith('WO-CMP-') ? woId.replace('WO-CMP-', 'CMP-') : null);

    if (review.action === 'approve') {
      setWorkOrders(prev =>
        prev.map(wo => {
          if (wo.id !== woId) return wo;
          return {
            ...wo,
            verificationStatus: 'approved',
            verificationReview: review,
            actionHistory: [
              ...(wo.actionHistory || []),
              {
                timestamp: nowIso,
                stage: 'Verified',
                actor: `${activeUser.name} (${review.reviewedByRole})`,
                notes: `Evidence approved: ${review.reason || 'Restoration verified.'}`
              }
            ]
          };
        })
      );

      if (targetCmpId) {
        setComplaints(prev =>
          prev.map(c => {
            if (c.id !== targetCmpId) return c;
            return {
              ...c,
              status: 'Closed',
              verificationStatus: 'approved',
              resolvedBy: activeUser.name,
              resolvedAt: nowIso,
              resolutionRemarks: review.reason || 'Field restoration evidence reviewed and verified.',
              timeline: [
                ...c.timeline,
                {
                  time: `15-Oct ${timeStr}`,
                  stage: 'Resolved',
                  actor: `${activeUser.name} (Desk Officer)`,
                  remark: `Verification accepted: ${review.reason || 'Restoration verified and complaint resolved.'}`
                }
              ]
            };
          })
        );
      }
      showToast(`Work Order ${woId} completion verified and approved.`, 'success');
      return true;
    }

    if (review.action === 'request_more_info') {
      setWorkOrders(prev =>
        prev.map(wo => {
          if (wo.id !== woId) return wo;
          return {
            ...wo,
            verificationStatus: 'more_info_needed',
            verificationReview: review,
            status: 'In Progress'
          };
        })
      );
      showToast(`Returned Work Order ${woId} to field engineer for clarification.`, 'warning');
      return true;
    }

    if (review.action === 'reject') {
      setWorkOrders(prev =>
        prev.map(wo => {
          if (wo.id !== woId) return wo;
          return {
            ...wo,
            verificationStatus: 'rejected',
            verificationReview: review,
            status: 'Assigned'
          };
        })
      );
      showToast(`Work Order ${woId} completion rejected. Re-inspection required.`, 'error');
      return true;
    }

    return false;
  };

  const submitComplaintFeedback = (complaintId: string, feedback: ComplaintFeedback): boolean => {
    const target = complaints.find(c => c.id === complaintId);
    if (!target) {
      showToast(`Complaint ${complaintId} not found.`, 'error');
      return false;
    }

    setComplaints(prev =>
      prev.map(c => {
        if (c.id !== complaintId) return c;
        return {
          ...c,
          feedback,
          timeline: [
            ...c.timeline,
            {
              time: 'Just now',
              stage: 'Feedback Submitted',
              actor: `${activeUser.name} (Consumer)`,
              remark: `Rating: ${feedback.rating}/5 stars. ${feedback.comments || ''}`
            }
          ]
        };
      })
    );
    showToast('Thank you for rating our restoration service!', 'success');
    return true;
  };

  const reopenComplaint = (complaintId: string, reason: string): ComplaintRecord | null => {
    const original = complaints.find(c => c.id === complaintId);
    if (!original) {
      showToast(`Complaint ${complaintId} was not found.`, 'error');
      return null;
    }

    const cleanReason = (reason || '').trim() || 'Consumer reported unresolved grievance.';
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newComplaintId = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newComplaint: ComplaintRecord = {
      id: newComplaintId,
      consumerNo: original.consumerNo,
      consumerName: original.consumerName,
      phone: original.phone,
      category: original.category,
      description: `[Reopened from ${original.id}] ${cleanReason}`,
      priority: original.priority === 'Low' ? 'Medium' : original.priority,
      status: 'Registered',
      subdivision: original.subdivision,
      feederName: original.feederName,
      filedAt: nowIso,
      slaTargetHours: original.slaTargetHours,
      slaDueTime: new Date(Date.now() + original.slaTargetHours * 3600 * 1000).toISOString(),
      slaBreached: false,
      accountId: original.accountId,
      reopenedFromComplaintId: original.id,
      reopenReason: cleanReason,
      timeline: [
        {
          time: `15-Oct ${timeStr}`,
          stage: 'Reopened',
          actor: `${activeUser.name} (Consumer)`,
          remark: `Reopened follow-up referencing #${original.id}: ${cleanReason}`
        }
      ]
    };

    setComplaints(prev => [
      newComplaint,
      ...prev.map(c => (c.id === complaintId ? { ...c, followUpComplaintId: newComplaintId } : c))
    ]);

    showToast(`Complaint reopened as #${newComplaintId}. Our operations desk has been alerted.`, 'success');
    return newComplaint;
  };

  const loginViaSimulatedSso = async (
    email: string,
    targetRole: UserRole,
    providerId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const resolvedProvider =
      providerId ||
      (targetRole === 'consumer' ? 'parichay-gujarat-demo' : 'ugvcl-workforce-oidc-demo');
    const stateToken = `oidc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const fallbackIdentity = getDefaultCanonicalIdentityForRole(targetRole);
    const chosenEmail = (email || fallbackIdentity.email).trim().toLowerCase();

    if (authMode === 'server') {
      const ssoRes = await loginWithSimulatedSsoApi({
        email: chosenEmail,
        providerId: resolvedProvider,
        state: stateToken,
        targetRole
      });
      if (!ssoRes.success || !ssoRes.session) {
        return { success: false, error: ssoRes.error || 'Simulated SSO login failed.' };
      }
      const meCheck = await verifyServerSessionApi();
      const verifiedSession = meCheck.authenticated && meCheck.session ? meCheck.session : ssoRes.session;
      const assignedRole = verifiedSession.role;
      const targetTab = 'dashboard';
      clearTransientUserModals();
      setStoredActivePortalRuntime({
        session: verifiedSession,
        role: assignedRole,
        tab: targetTab,
        entered: true,
        authMode
      });
      setDemoSession(verifiedSession);
      void syncBackendSsoSession(resolvedProvider, verifiedSession.user.email, assignedRole, stateToken, {
        portalCookieVerified: meCheck.authenticated
      });
      setCurrentRoleState(assignedRole);
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/${assignedRole}/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(
        `Signed in via Simulated SSO (${resolvedProvider}) as ${verifiedSession.user.name}.`,
        'success'
      );
      return { success: true };
    }

    return loginAsCanonicalDemoAccount(fallbackIdentity.id, targetRole);
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setRole,
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        consumers,
        connections,
        applications,
        complaints,
        workOrders,
        employees,
        fieldEngineers,
        bills,
        payments,
        notifications,
        auditLogs,
        isOfflineSimulated,
        setIsOfflineSimulated,
        isBrowserOffline,
        isFieldOfflineActive,
        isFieldSyncing,
        fieldOfflineQueue,
        enqueueFieldInspectionOffline,
        enqueueFieldStatusOffline,
        syncFieldOfflineQueue,
        refreshFieldOfflineQueueFromStorage,
        isIntroActive,
        setIsIntroActive,
        hasEnteredPlatform,
        setHasEnteredPlatform,
        replayIntro,
        exitToWelcomeScreen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isRoleSwitcherModalOpen,
        setIsRoleSwitcherModalOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        isAIAssistantOpen,
        setIsAIAssistantOpen,
        isWorkflowVisualizerOpen,
        setIsWorkflowVisualizerOpen,
        activeCaseDrawer,
        openCaseDrawer,
        closeCaseDrawer,
        payBillDemo,
        payBillDemoDetailed,
        generateDemoBillForActiveConnection,
        submitApplicationDemo,
        submitComplaintDemo,
        updateApplicationStatus,
        requestApplicationClarification,
        archiveApplication,
        restoreApplication,
        updateComplaintStatus,
        updateWorkOrderStatus,
        assignComplaintToField,
        assignWorkOrder,
        reassignWorkOrder,
        updateWorkOrderPriorityAndSchedule,
        reportFeederFault,
        markNotificationRead,
        markSelectedNotificationsRead,
        markAllNotificationsRead,
        deleteNotification,
        deleteSelectedNotifications,
        clearAllNotifications,
        addAuditEvent,
        evaluateSlaDeadlinesNow,
        resetDemoData,
        applyRestoredDemoBackupState,
        toasts,
        showToast,
        dismissToast,
        authMode,
        setAuthMode,
        isVerifyingServerSession,
        demoSession,
        userConnections,
        selectedConsumerConnectionNo,
        setSelectedConsumerConnectionNo,
        consumerBillingSummary,
        userApplications,
        userBills,
        userPayments,
        userComplaints,
        userNotifications,
        employeeNotifications,
        scopedNotifications,
        linkConnectionDemo,
        loginDemoUser,
        loginAsCanonicalDemoAccount,
        switchDemoUserAccount,
        canonicalDemoAccounts: CANONICAL_DEMO_IDENTITIES,
        signupDemoUser,
        logoutDemoSession,
        activeUser,
        // Critical Incidents & Warning Alarms (Phase 2)
        incidents,
        roleIncidents,
        activeCriticalModalIncident,
        dismissCriticalModal,
        activeIncidentModalId,
        openIncidentModal,
        closeIncidentModal,
        acknowledgeIncident,
        assignIncidentToField,
        reassignIncidentToField,
        escalateIncident,
        resolveIncident,
        updateIncidentSeverity,
        acceptFieldAssignment,
        declineFieldAssignment,
        startFieldInspection,
        submitFieldFindings,
        requestFieldAssistance,
        submitFieldResolutionReport,
        approveEscalation,
        rejectEscalation,
        requestMoreInfo,
        triggerDemoSimulatedIncident,
        audioAlertsEnabled,
        toggleAudio,
        unreadIncidentsCount,
        criticalIncidentsCount,
        // Phase 4: Human-in-the-Loop AI Recommendations & Approval Governance
        recommendations,
        activeApprovalRecommendation,
        openApprovalModal,
        closeApprovalModal,
        approveRecommendation,
        rejectRecommendation,
        executeRecommendation,
        proposeRecommendation,
        // Phase 5: Persistent Backend Integration & Database Readiness
        dataMode,
        setDataMode,
        backendStatus,
        syncWithBackend,
        repositories,
        submitWorkOrderCompletionEvidence,
        reviewWorkOrderCompletion,
        submitComplaintFeedback,
        reopenComplaint,
        loginViaSimulatedSso
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
