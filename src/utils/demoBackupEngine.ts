import {
  UserRole,
  ConsumerProfile,
  ElectricityConnection,
  ElectricityBill,
  PaymentTransaction,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  EmployeeRecord,
  FieldEngineerRecord,
  CriticalIncident,
  AppNotification,
  AuditLogItem,
  AIActionRecommendation,
} from '../types';
import { LanguageCode } from '../i18n/types';
import {
  INITIAL_CONSUMERS,
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_EMPLOYEES,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
} from '../data/mockData';
import { CANONICAL_FIELD_ENGINEERS } from '../data/demoAuthData';
import {
  FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  FieldOfflineQueueItem,
  StorageLike,
  isValidOfflineQueueItem,
  loadFieldOfflineQueue,
} from './fieldOfflineQueue';
import {
  reconcileBillWithPayments,
  evaluateGentleBillingReminders,
  normalizeBillingIdentifier,
} from './billingEngine';
import { deriveCanonicalBarcodeReference } from './barcodeEngine';
import { deriveCanonicalQrVerificationUrl } from './qrCodeEngine';
import {
  PaymentCalendarEvent,
  derivePaymentCalendarEvents,
} from './paymentCalendarEngine';
import {
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
} from '../components/common/UgvclBrandIdentity';

// ============================================================================
// CONSTANTS & VERSIONED BACKUP ENVELOPE IDENTIFIERS
// ============================================================================

export const BACKUP_FORMAT_ID = 'VIDYUTFLOW_DEMO_BACKUP_V1' as const;
export const BACKUP_FORMAT_VERSION = '1.0.0' as const;
export const BACKUP_APPLICATION_VERSION = '2.0.0' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;

export const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024; // 5 MB browser safety limit
export const MAX_RECORDS_PER_CATEGORY = 10000;

export const BACKUP_AUDIT_HISTORY_STORAGE_KEY = 'vidyutflow_backup_audit_history';
export const PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY =
  'vidyutflow_pre_restore_recovery_snapshot';
export const ADMIN_STAFF_USERS_STORAGE_KEY = 'vidyutflow_admin_users';
export const ADMIN_RBAC_PERMISSIONS_STORAGE_KEY = 'vidyutflow_rbac_permissions';

export const DEMO_BACKUP_DISCLOSURE_EN =
  `Browser-Local DEMO Data Protection Facility (${UGVCL_COMPANY_NAME_EN} — "${UGVCL_TAGLINE_EN}"): ` +
  'This backup contains simulated browser-persisted demonstration records only. It is NOT a production database disaster-recovery system and does not contain passwords, session tokens, or cryptographic secrets.';

export const CHECKSUM_AUTHENTICATION_DISCLOSURE_EN =
  'Unkeyed Integrity Checksum Notice: The deterministic checksum verifies file completeness and detects accidental corruption or modification, but it is NOT cryptographic authentication and does not prove who created the backup file.';

export const FRONTEND_RBAC_DISCLOSURE_EN =
  'Frontend DEMO Authorization Notice: Role checks in this browser-local facility enforce Admin-only access at the client operation boundary for demonstration governance, and are not a substitute for server-enforced backend authorization.';

// ============================================================================
// CANONICAL STORAGE KEYS INVENTORY
// ============================================================================

export const CANONICAL_DEMO_STORAGE_KEYS = {
  consumers: 'vidyutone_consumers',
  connections: 'vidyutone_connections',
  bills: 'vidyutone_bills',
  payments: 'vidyutone_payments',
  applications: 'vidyutone_applications',
  complaints: 'vidyutone_complaints',
  workOrders: 'vidyutone_workorders',
  employees: 'vidyutone_employees',
  fieldEngineers: 'vidyutone_fieldengineers',
  incidents: 'vidyutflow_incidents',
  notifications: 'vidyutone_notifications',
  auditLogs: 'vidyutone_auditlogs',
  aiRecommendations: 'vidyut_ai_recommendations',
  fieldOfflineQueue: FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  notificationInboxState: 'vidyutflow_notification_inbox_state',
  accountConnections: 'vidyutflow_account_connections',
  selectedConsumerConnections: 'vidyutflow_selected_consumer_connection',
  billingReminderKeys: 'vidyutflow_billing_reminder_keys',
  slaEmittedEventKeys: 'vidyutflow_sla_emitted_event_keys',
  dismissedModalIds: 'vidyutflow_dismissed_modals',
  adminStaffUsers: ADMIN_STAFF_USERS_STORAGE_KEY,
  adminRbacPermissions: ADMIN_RBAC_PERMISSIONS_STORAGE_KEY,
} as const;

export const EXCLUDED_SENSITIVE_OR_PREFERENCE_STORAGE_KEYS = [
  {
    key: 'vidyutflow_demo_session',
    reason: 'Active authentication session token — excluded to prevent session hijacking or token leakage.',
  },
  {
    key: 'vidyutflow_active_portal_runtime',
    reason: 'Volatile sessionStorage tab/session runtime — excluded for session isolation.',
  },
  {
    key: 'vidyutflow_custom_users',
    reason: 'Contains custom user password hashes — excluded to guarantee zero credential or password hash export.',
  },
  {
    key: 'vidyutflow_auth_mode',
    reason: 'Local client authentication mode switch — preserved per browser environment.',
  },
  {
    key: 'vidyutflow_operating_data_mode',
    reason: 'Local DEMO vs LIVE mode switch — preserved per browser environment.',
  },
  {
    key: 'vidyutflow_language_preference',
    reason: 'Operator UI language preference — preserved so restoring data does not unexpectedly change the UI language.',
  },
  {
    key: 'vidyutflow_audio_alerts_enabled',
    reason: 'Operator browser audio preference — excluded from business data overwrite.',
  },
  {
    key: 'vidyutone_theme',
    reason: 'Display theme preference — excluded from business data overwrite.',
  },
] as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type BackupCategoryKey =
  | 'consumers'
  | 'connections'
  | 'bills'
  | 'payments'
  | 'applications'
  | 'complaints'
  | 'workOrders'
  | 'employees'
  | 'fieldEngineers'
  | 'incidents'
  | 'notifications'
  | 'auditLogs'
  | 'aiRecommendations'
  | 'fieldOfflineQueue'
  | 'notificationInboxState'
  | 'accountConnections'
  | 'selectedConsumerConnections'
  | 'billingReminderKeys'
  | 'slaEmittedEventKeys'
  | 'dismissedModalIds'
  | 'adminRbacState'
  | 'receiptAndDocumentMetadata'
  | 'smartPaymentCalendar';

export const ALL_BACKUP_CATEGORIES: readonly BackupCategoryKey[] = [
  'consumers',
  'connections',
  'bills',
  'payments',
  'applications',
  'complaints',
  'workOrders',
  'employees',
  'fieldEngineers',
  'incidents',
  'notifications',
  'auditLogs',
  'aiRecommendations',
  'fieldOfflineQueue',
  'notificationInboxState',
  'accountConnections',
  'selectedConsumerConnections',
  'billingReminderKeys',
  'slaEmittedEventKeys',
  'dismissedModalIds',
  'adminRbacState',
  'receiptAndDocumentMetadata',
  'smartPaymentCalendar',
] as const;

export interface NotificationInboxScopeSnapshot {
  readIds: string[];
  dismissedIds: string[];
  deliveredToastEventKeys: string[];
}

export interface AdminStaffUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  subdivision: string;
  status: 'Active' | 'Locked';
  lastLogin: string;
}

export interface AdminPermissionRowRecord {
  module: string;
  consumer: boolean;
  employee: boolean;
  field: boolean;
  management: boolean;
  admin: boolean;
}

export interface AdminRbacStateSnapshot {
  users: AdminStaffUserRecord[];
  permissions: AdminPermissionRowRecord[];
}

export interface BackupReceiptDocumentMetadataItem {
  documentId: string;
  documentType:
    | 'electricity_bill'
    | 'payment_receipt'
    | 'application_acknowledgment'
    | 'complaint_acknowledgment'
    | 'inspection_summary';
  sourceRecordId: string;
  consumerNo?: string;
  barcodeReference?: string;
  qrVerificationUrl?: string;
  amount?: number;
  status: string;
  hasHistoricalSlabDiscrepancy?: boolean;
}

export interface DemoBackupPayload {
  consumers: ConsumerProfile[];
  connections: ElectricityConnection[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  employees: EmployeeRecord[];
  fieldEngineers: FieldEngineerRecord[];
  incidents: CriticalIncident[];
  notifications: AppNotification[];
  auditLogs: AuditLogItem[];
  aiRecommendations: AIActionRecommendation[];
  fieldOfflineQueue: FieldOfflineQueueItem[];
  notificationInboxState: Record<string, NotificationInboxScopeSnapshot>;
  accountConnections: Record<string, string[]>;
  selectedConsumerConnections: Record<string, string>;
  billingReminderKeys: string[];
  slaEmittedEventKeys: string[];
  dismissedModalIds: string[];
  adminRbacState: AdminRbacStateSnapshot;
  receiptAndDocumentMetadata: BackupReceiptDocumentMetadataItem[];
  smartPaymentCalendar: PaymentCalendarEvent[];
}

export interface BackupCategoryManifestItem {
  category: BackupCategoryKey;
  storageKey: string;
  recordCount: number;
  classification: 'CANONICAL_PERSISTENT' | 'DERIVED_VERIFICATION_MANIFEST';
  checksum: string;
}

export interface BackupIntegrityMetadata {
  algorithm: 'DETERMINISTIC-CANONICAL-FNV256-HEX';
  checksum: string;
  categoryChecksums: Record<BackupCategoryKey, string>;
  isCryptographicallyAuthenticated: false;
  authenticationDisclosure: string;
  credentialSanitizationVerified: true;
}

export interface BackupActorIdentity {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  subdivision?: string;
}

export interface DemoBackupEnvelope {
  formatId: typeof BACKUP_FORMAT_ID;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  applicationVersion: typeof BACKUP_APPLICATION_VERSION;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  backupId: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    role: UserRole;
    subdivision: string;
  };
  ugvclBrandProtected: {
    companyNameEn: string;
    companyNameGu: string;
    taglineEn: string;
  };
  demoDisclosure: string;
  categoryManifest: BackupCategoryManifestItem[];
  recordCounts: Record<BackupCategoryKey, number>;
  payload: DemoBackupPayload;
  integrity: BackupIntegrityMetadata;
}

export interface HistoricalDemoIntegrityNote {
  recordId: string;
  category: 'bills' | 'connections' | 'payments';
  code: 'HISTORICAL_SLAB_SUM_DISCREPANCY' | 'HISTORICAL_METER_READING_REGISTER_DIFF';
  description: string;
}

export interface BackupValidationIssue {
  code:
    | 'UNAUTHORIZED_ROLE'
    | 'FILE_TOO_LARGE'
    | 'EMPTY_INPUT'
    | 'MALFORMED_JSON'
    | 'UNSAFE_CODE_DETECTED'
    | 'CREDENTIAL_LEAK_DETECTED'
    | 'INVALID_FORMAT_ID'
    | 'UNSUPPORTED_SCHEMA_VERSION'
    | 'UNSUPPORTED_FORMAT_VERSION'
    | 'MISSING_CATEGORY'
    | 'INCOMPATIBLE_CATEGORY_TYPE'
    | 'RECORD_COUNT_MISMATCH'
    | 'CHECKSUM_MISMATCH'
    | 'CATEGORY_CHECKSUM_MISMATCH'
    | 'DUPLICATE_RECORD_ID'
    | 'BROKEN_BILL_CONNECTION_REF'
    | 'BROKEN_PAYMENT_REF'
    | 'BARCODE_QR_MISMATCH'
    | 'INVALID_OFFLINE_QUEUE_ITEM';
  severity: 'ERROR' | 'WARNING';
  category?: BackupCategoryKey;
  message: string;
}

export interface BackupValidationResult {
  isValid: boolean;
  authorized: boolean;
  schemaCompatible: boolean;
  integrityVerified: boolean;
  fileSizeBytes: number;
  backupId?: string;
  createdAt?: string;
  schemaVersion?: number;
  formatVersion?: string;
  applicationVersion?: string;
  missingCategories: BackupCategoryKey[];
  incompatibleCategories: BackupCategoryKey[];
  tamperedCategories: BackupCategoryKey[];
  recordCounts: Partial<Record<BackupCategoryKey, number>>;
  totalRecordsCount: number;
  issues: BackupValidationIssue[];
  historicalDemoNotes: HistoricalDemoIntegrityNote[];
  parsedEnvelope?: DemoBackupEnvelope;
}

export interface CategoryRestoreDiff {
  category: BackupCategoryKey;
  currentCount: number;
  backupCount: number;
  addedCount: number;
  replacedCount: number;
  removedCount: number;
  unchangedCount: number;
  addedIds: string[];
  replacedIds: string[];
  removedIds: string[];
}

export interface OfflineQueueConflictSummary {
  hasPendingLiveActions: boolean;
  pendingLiveCount: number;
  processingLiveCount: number;
  pendingLiveClientUuids: string[];
  affectedWorkOrderIds: string[];
  duplicateReplayRiskDetected: boolean;
  canReconcileByPreservingLiveQueue: boolean;
  warningMessage: string;
}

export type OfflineQueueRestorePolicy =
  | 'BLOCK_IF_PENDING'
  | 'PRESERVE_LIVE_PENDING';

export interface DemoRestorePreview {
  authorized: boolean;
  isValidBackup: boolean;
  canRestoreSafely: boolean;
  backupId: string;
  backupCreatedAt: string;
  schemaVersion: number;
  formatVersion: string;
  applicationVersion: string;
  categoryDiffs: CategoryRestoreDiff[];
  totalAdded: number;
  totalReplaced: number;
  totalRemoved: number;
  totalUnchanged: number;
  offlineQueueConflict: OfflineQueueConflictSummary;
  blockingReasons: string[];
  warnings: string[];
  historicalDemoNotes: HistoricalDemoIntegrityNote[];
}

export interface RecoverySnapshotEnvelope {
  snapshotId: string;
  capturedAt: string;
  capturedForBackupId: string;
  capturedBy: BackupActorIdentity;
  backupEnvelope: DemoBackupEnvelope;
  isUsable: boolean;
}

export type BackupAuditOperationType =
  | 'BACKUP_CREATED'
  | 'BACKUP_DOWNLOADED'
  | 'BACKUP_VALIDATED'
  | 'RESTORE_PREVIEWED'
  | 'RESTORE_COMPLETED'
  | 'RESTORE_FAILED_ROLLED_BACK'
  | 'RESTORE_BLOCKED'
  | 'RECOVERY_SNAPSHOT_RESTORED'
  | 'UNAUTHORIZED_ACCESS_BLOCKED';

export interface BackupAuditRecord {
  id: string;
  timestamp: string;
  operationType: BackupAuditOperationType;
  outcome: 'SUCCESS' | 'WARNING' | 'FAILED';
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  backupId?: string;
  schemaVersion?: number;
  summary: string;
  details: string;
}

export interface ExecuteSafeRestoreOptions {
  actor: BackupActorIdentity;
  backupInput: string | DemoBackupEnvelope;
  currentState?: Partial<DemoBackupLiveStateInput>;
  storage?: StorageLike | null;
  explicitConfirmation: boolean;
  confirmationText?: string;
  offlineQueuePolicy?: OfflineQueueRestorePolicy;
  /**
   * Deterministic fault injection hook for automated tests to simulate a storage write failure
   * midway through restoration and verify automatic rollback to the pre-restore recovery snapshot.
   */
  simulateFailureAtStep?: 'AFTER_PARTIAL_STORAGE_WRITE' | 'DURING_POST_RESTORE_VALIDATION';
  onApplyRestoredState?: (restoredState: RestoredLiveRuntimeState) => void;
  nowIso?: string;
}

export interface RestoredLiveRuntimeState {
  consumers: ConsumerProfile[];
  connections: ElectricityConnection[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  employees: EmployeeRecord[];
  fieldEngineers: FieldEngineerRecord[];
  incidents: CriticalIncident[];
  notifications: AppNotification[];
  auditLogs: AuditLogItem[];
  aiRecommendations: AIActionRecommendation[];
  fieldOfflineQueue: FieldOfflineQueueItem[];
  notificationInboxState: Record<string, NotificationInboxScopeSnapshot>;
  accountConnections: Record<string, string[]>;
  selectedConsumerConnections: Record<string, string>;
  billingReminderKeys: string[];
  slaEmittedEventKeys: string[];
  dismissedModalIds: string[];
  adminRbacState: AdminRbacStateSnapshot;
  recomputedCalendarEvents: PaymentCalendarEvent[];
  recomputedReceiptsAndDocs: BackupReceiptDocumentMetadataItem[];
}

export interface ExecuteSafeRestoreResult {
  success: boolean;
  authorized: boolean;
  status:
    | 'RESTORED'
    | 'BLOCKED_UNAUTHORIZED'
    | 'BLOCKED_CONFIRMATION_REQUIRED'
    | 'BLOCKED_CONCURRENT_RESTORE'
    | 'BLOCKED_INVALID_BACKUP'
    | 'BLOCKED_OFFLINE_QUEUE_CONFLICT'
    | 'BLOCKED_SNAPSHOT_UNUSABLE'
    | 'FAILED_AND_ROLLED_BACK'
    | 'FAILED_UNRECOVERABLE';
  backupId?: string;
  recoverySnapshotId?: string;
  rolledBackToSnapshot: boolean;
  recoveryVerified: boolean;
  preservedPendingOfflineCount: number;
  message: string;
  errorDetails?: string;
  restoredState?: RestoredLiveRuntimeState;
  auditRecord: BackupAuditRecord;
}

export interface DemoBackupLiveStateInput {
  consumers?: ConsumerProfile[];
  connections?: ElectricityConnection[];
  bills?: ElectricityBill[];
  payments?: PaymentTransaction[];
  applications?: NewConnectionApplication[];
  complaints?: ComplaintRecord[];
  workOrders?: WorkOrder[];
  employees?: EmployeeRecord[];
  fieldEngineers?: FieldEngineerRecord[];
  incidents?: CriticalIncident[];
  notifications?: AppNotification[];
  auditLogs?: AuditLogItem[];
  aiRecommendations?: AIActionRecommendation[];
  fieldOfflineQueue?: FieldOfflineQueueItem[];
  notificationInboxState?: Record<string, NotificationInboxScopeSnapshot>;
  accountConnections?: Record<string, string[]>;
  selectedConsumerConnections?: Record<string, string>;
  billingReminderKeys?: string[];
  slaEmittedEventKeys?: string[];
  dismissedModalIds?: string[];
  adminRbacState?: AdminRbacStateSnapshot;
}

// ============================================================================
// DEFAULT ADMIN USERS & RBAC MATRIX
// ============================================================================

export const DEFAULT_ADMIN_STAFF_USERS: AdminStaffUserRecord[] = [
  { id: 'USR-101', name: 'Rajesh V. Trivedi', email: 'rajesh.trivedi@ugvcl.gov.in', role: 'Office Employee ERP', subdivision: 'Gandhinagar Sub-Div 2', status: 'Active', lastLogin: '15-Oct 06:12' },
  { id: 'USR-102', name: 'Vikramaditya Solanki', email: 'vikram.solanki@ugvcl.gov.in', role: 'Field Engineer', subdivision: 'Mehsana Rural Feeder Wing', status: 'Active', lastLogin: '15-Oct 05:45' },
  { id: 'USR-103', name: 'Dr. Harita Joshi', email: 'harita.joshi@ugvcl.gov.in', role: 'Management', subdivision: 'UGVCL Corporate Mehsana', status: 'Active', lastLogin: '14-Oct 19:20' },
  { id: 'USR-104', name: 'K. V. Sharma', email: 'kv.sharma@ugvcl.gov.in', role: 'System Administrator', subdivision: 'State Data Center / IT Cell', status: 'Active', lastLogin: '15-Oct 06:01' },
  { id: 'USR-105', name: 'Ramesh Barot', email: 'ramesh.barot@ugvcl.gov.in', role: 'Office Employee ERP', subdivision: 'Mehsana Industrial GIDC', status: 'Active', lastLogin: '14-Oct 17:30' },
  { id: 'USR-106', name: 'Dinesh Vaghela', email: 'dinesh.vaghela@ugvcl.gov.in', role: 'Field Engineer', subdivision: 'Gandhinagar Sub-Div 2', status: 'Locked', lastLogin: '11-Oct 09:15' },
];

export const DEFAULT_ADMIN_RBAC_PERMISSIONS: AdminPermissionRowRecord[] = [
  { module: 'New Connection Sanction Approval', consumer: false, employee: true, field: false, management: true, admin: true },
  { module: 'Field Feasibility & Meter Audit Submission', consumer: false, employee: false, field: true, management: false, admin: true },
  { module: 'Electricity Bill Adjustment & Tariff Modification', consumer: false, employee: true, field: false, management: true, admin: true },
  { module: 'Grievance Redressal Dispatch & Closure', consumer: false, employee: true, field: true, management: false, admin: true },
  { module: 'Citizen Bill Payment & Self Service Portal', consumer: true, employee: false, field: false, management: false, admin: true },
  { module: 'SCADA Feeder Telemetry & AT&C Loss Dashboard', consumer: false, employee: true, field: false, management: true, admin: true },
  { module: 'RBAC Security Matrix & System Audit Logs', consumer: false, employee: false, field: false, management: false, admin: true },
];

// ============================================================================
// CREDENTIAL & SECRET SANITIZATION + DETERMINISTIC SERIALIZATION
// ============================================================================

const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  'password',
  'passwordhash',
  'rawpassword',
  'sessiontoken',
  'signedtoken',
  'accesstoken',
  'refreshtoken',
  'privatekey',
  'secretkey',
  'session_secret',
  'gemini_api_key',
  'apikey',
  'clientsecret',
]);

export function containsForbiddenCredentialKey(obj: unknown, depth = 0): string | null {
  if (depth > 25 || !obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = containsForbiddenCredentialKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const normalized = k.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (FORBIDDEN_CREDENTIAL_KEYS.has(normalized)) {
      return k;
    }
    const nested = containsForbiddenCredentialKey(v, depth + 1);
    if (nested) return nested;
  }
  return null;
}

export function sanitizeBackupValue<T>(value: T, depth = 0): T {
  if (depth > 25 || value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeBackupValue(item, depth + 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      const normKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (FORBIDDEN_CREDENTIAL_KEYS.has(normKey)) {
        continue;
      }
      const childVal = (value as Record<string, unknown>)[key];
      if (typeof childVal === 'function' || typeof childVal === 'symbol') {
        continue;
      }
      result[key] = sanitizeBackupValue(childVal, depth + 1);
    }
    return result as T;
  }
  return value;
}

/**
 * Produces a deterministic, canonical JSON string with recursively sorted object keys
 * so that identical datasets always produce the exact same serialized string and checksum.
 */
export function stableStringify(value: unknown, pretty = false): string {
  const sanitized = sanitizeBackupValue(value);
  return JSON.stringify(sanitized, null, pretty ? 2 : undefined);
}

/**
 * Computes a deterministic 256-bit (64 hex character) unkeyed integrity digest
 * using 8 independent 32-bit FNV-1a lanes with prime salt Mixing.
 * Works synchronously in all browser and Node/Vitest/tsx environments without async WebCrypto latency.
 */
export function computeDeterministicHexDigest(input: string): string {
  const seeds = [
    0x811c9dc5,
    0x9e3779b9,
    0x85ebca6b,
    0xc2b2ae35,
    0x27d4eb2f,
    0x165667b1,
    0xd3a2646c,
    0xfd7046c5,
  ];
  const primes = [
    0x01000193,
    0x01000193,
    0x1000193,
    0x01000193,
    0x01000193,
    0x01000193,
    0x01000193,
    0x01000193,
  ];

  const hashes = [...seeds];
  const len = input.length;

  for (let i = 0; i < len; i++) {
    const code = input.charCodeAt(i);
    for (let lane = 0; lane < 8; lane++) {
      let h = hashes[lane];
      h ^= code ^ ((i + lane * 31) & 0xff);
      h = Math.imul(h, primes[lane]);
      h ^= h >>> 13;
      hashes[lane] = h >>> 0;
    }
  }

  // Final avalanche mix across lanes
  for (let lane = 0; lane < 8; lane++) {
    let h = hashes[lane] ^ (len >>> 0);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h = (h ^ (h >>> 16)) >>> 0;
    hashes[lane] = h;
  }

  return hashes.map((h) => h.toString(16).padStart(8, '0')).join('');
}

export function computeCategoryChecksum(category: BackupCategoryKey, data: unknown): string {
  const canonical = stableStringify({ category, data }, false);
  return computeDeterministicHexDigest(canonical);
}

export function computeEnvelopeIntegrityChecksum(params: {
  formatId: string;
  formatVersion: string;
  schemaVersion: number;
  recordCounts: Record<BackupCategoryKey, number>;
  categoryChecksums: Record<BackupCategoryKey, string>;
}): string {
  const canonical = stableStringify(params, false);
  return computeDeterministicHexDigest(canonical);
}

// ============================================================================
// STORAGE ACCESS & AUTHORIZATION HELPERS
// ============================================================================

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Sandboxed environment
  }
  return null;
}

function readStorageJson<T>(storage: StorageLike | null, key: string, fallback: T): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function assertAdminBackupAuthorization(
  actor: BackupActorIdentity | null | undefined
): { authorized: boolean; denialReason?: string } {
  if (!actor || typeof actor !== 'object') {
    return {
      authorized: false,
      denialReason:
        'Access Denied: Authentication identity is required for Admin DEMO Data Protection operations.',
    };
  }
  if (actor.role !== 'admin') {
    return {
      authorized: false,
      denialReason: `Access Denied: Role "${String(actor.role).toUpperCase()}" is not authorized. Only System Administrators (role: "admin") may create, validate, preview, or restore DEMO backups.`,
    };
  }
  return { authorized: true };
}

// ============================================================================
// AUDIT LOGGING FOR BACKUP & RESTORE OPERATIONS
// ============================================================================

export function getBackupAuditHistory(
  storage: StorageLike | null = getDefaultStorage()
): BackupAuditRecord[] {
  const raw = readStorageJson<BackupAuditRecord[]>(storage, BACKUP_AUDIT_HISTORY_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === 'object' && typeof item.id === 'string');
}

export function recordBackupAuditEvent(
  event: Omit<BackupAuditRecord, 'id' | 'timestamp'> & { timestamp?: string },
  storage: StorageLike | null = getDefaultStorage()
): BackupAuditRecord {
  const nowIso = event.timestamp || new Date().toISOString();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const newRecord: BackupAuditRecord = {
    id: `BKP-AUD-${Date.now().toString().slice(-5)}-${rand}`,
    timestamp: nowIso,
    operationType: event.operationType,
    outcome: event.outcome,
    actorId: event.actorId || 'unknown',
    actorName: event.actorName || 'Unknown Actor',
    actorRole: event.actorRole,
    backupId: event.backupId,
    schemaVersion: event.schemaVersion,
    summary: event.summary,
    details: event.details,
  };

  if (storage) {
    try {
      const existing = getBackupAuditHistory(storage);
      const updated = [newRecord, ...existing].slice(0, 100);
      storage.setItem(BACKUP_AUDIT_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }

  return newRecord;
}

// ============================================================================
// DERIVED DOCUMENT, RECEIPT, BARCODE, QR & SMART CALENDAR MANIFEST BUILDERS
// ============================================================================

export function deriveReceiptAndDocumentManifest(params: {
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
}): BackupReceiptDocumentMetadataItem[] {
  const manifest: BackupReceiptDocumentMetadataItem[] = [];

  for (const bill of params.bills) {
    if (!bill || !bill.billNo) continue;
    const reconciled = reconcileBillWithPayments(bill, params.payments, '15-Oct-2026');
    const barcodeRef = deriveCanonicalBarcodeReference(bill.billNo, bill.consumerNo);
    const qrUrl = deriveCanonicalQrVerificationUrl(bill.billNo, bill.consumerNo).url;
    const slabSum = Array.isArray(bill.slabBreakdown)
      ? Math.round(bill.slabBreakdown.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100
      : bill.energyCharges;
    const hasSlabDiff = Math.abs(slabSum - bill.energyCharges) > 0.5;

    manifest.push({
      documentId: `DOC-BILL-${bill.billNo}`,
      documentType: 'electricity_bill',
      sourceRecordId: bill.billNo,
      consumerNo: bill.consumerNo,
      barcodeReference: barcodeRef,
      qrVerificationUrl: qrUrl,
      amount: reconciled.totalAmount,
      status: reconciled.effectiveStatus,
      hasHistoricalSlabDiscrepancy: hasSlabDiff,
    });
  }

  for (const tx of params.payments) {
    if (!tx || !tx.txId) continue;
    if (tx.status === 'Successful') {
      manifest.push({
        documentId: `REC-${tx.txId}`,
        documentType: 'payment_receipt',
        sourceRecordId: tx.txId,
        consumerNo: tx.consumerNo,
        amount: tx.amount,
        status: tx.status,
      });
    }
  }

  for (const app of params.applications) {
    if (!app || !app.id) continue;
    manifest.push({
      documentId: `ACK-APP-${app.id}`,
      documentType: 'application_acknowledgment',
      sourceRecordId: app.id,
      consumerNo: app.linkedConsumerNo,
      amount: app.estimatedSanctionCost,
      status: app.status,
    });
  }

  for (const cmp of params.complaints) {
    if (!cmp || !cmp.id) continue;
    manifest.push({
      documentId: `ACK-CMP-${cmp.id}`,
      documentType: 'complaint_acknowledgment',
      sourceRecordId: cmp.id,
      consumerNo: cmp.consumerNo,
      status: cmp.status,
    });
  }

  for (const wo of params.workOrders) {
    if (!wo || !wo.id) continue;
    if (wo.inspectionReport) {
      manifest.push({
        documentId: `INSP-${wo.id}`,
        documentType: 'inspection_summary',
        sourceRecordId: wo.id,
        consumerNo: wo.consumerNo,
        status: wo.status,
      });
    }
  }

  return manifest;
}

export function detectHistoricalDemoNotes(params: {
  bills: ElectricityBill[];
  connections: ElectricityConnection[];
}): HistoricalDemoIntegrityNote[] {
  const notes: HistoricalDemoIntegrityNote[] = [];
  const connByNo = new Map<string, ElectricityConnection>();
  for (const conn of params.connections) {
    if (conn && conn.consumerNo) {
      connByNo.set(normalizeBillingIdentifier(conn.consumerNo), conn);
    }
  }

  for (const bill of params.bills) {
    if (!bill || !bill.billNo) continue;
    if (Array.isArray(bill.slabBreakdown) && bill.slabBreakdown.length > 0) {
      const slabSum =
        Math.round(bill.slabBreakdown.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) * 100) /
        100;
      if (Math.abs(slabSum - bill.energyCharges) > 0.5) {
        notes.push({
          recordId: bill.billNo,
          category: 'bills',
          code: 'HISTORICAL_SLAB_SUM_DISCREPANCY',
          description: `Bill ${bill.billNo} preserves canonical DEMO energyCharges (₹${bill.energyCharges}) alongside itemized slab sum (₹${slabSum}) without fabricating or altering source figures.`,
        });
      }
    }

    const conn = connByNo.get(normalizeBillingIdentifier(bill.consumerNo));
    if (conn) {
      const registerDiff = Math.max(0, conn.currentReadingKwh - conn.previousReadingKwh);
      if (registerDiff !== bill.unitsConsumed) {
        notes.push({
          recordId: bill.billNo,
          category: 'bills',
          code: 'HISTORICAL_METER_READING_REGISTER_DIFF',
          description: `Historical bill ${bill.billNo} (${bill.billMonth}: ${bill.unitsConsumed} kWh) differs from latest connection meter register delta (${registerDiff} kWh on ${conn.meterNo}); preserved as historical period record.`,
        });
      }
    }
  }

  return notes;
}

// ============================================================================
// SNAPSHOT COLLECTION FROM LIVE STATE OR STORAGE
// ============================================================================

export function collectLiveDemoStatePayload(
  liveState?: Partial<DemoBackupLiveStateInput>,
  storage: StorageLike | null = getDefaultStorage()
): DemoBackupPayload {
  const consumers = sanitizeBackupValue(
    liveState?.consumers ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.consumers, INITIAL_CONSUMERS)
  );
  const connections = sanitizeBackupValue(
    liveState?.connections ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.connections, INITIAL_CONNECTIONS)
  );
  const bills = sanitizeBackupValue(
    liveState?.bills ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.bills, INITIAL_BILLS)
  );
  const payments = sanitizeBackupValue(
    liveState?.payments ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.payments, INITIAL_PAYMENTS)
  );
  const applications = sanitizeBackupValue(
    liveState?.applications ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.applications, INITIAL_APPLICATIONS)
  );
  const complaints = sanitizeBackupValue(
    liveState?.complaints ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.complaints, INITIAL_COMPLAINTS)
  );
  const workOrders = sanitizeBackupValue(
    liveState?.workOrders ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.workOrders, INITIAL_WORK_ORDERS)
  );
  const employees = sanitizeBackupValue(
    liveState?.employees ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.employees, INITIAL_EMPLOYEES)
  );
  const fieldEngineers = sanitizeBackupValue(
    liveState?.fieldEngineers ??
      readStorageJson(
        storage,
        CANONICAL_DEMO_STORAGE_KEYS.fieldEngineers,
        CANONICAL_FIELD_ENGINEERS
      )
  );
  const incidents = sanitizeBackupValue(
    liveState?.incidents ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.incidents, [])
  );
  const notifications = sanitizeBackupValue(
    liveState?.notifications ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.notifications, INITIAL_NOTIFICATIONS)
  );
  const auditLogs = sanitizeBackupValue(
    liveState?.auditLogs ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.auditLogs, AUDIT_LOGS)
  );
  const aiRecommendations = sanitizeBackupValue(
    liveState?.aiRecommendations ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.aiRecommendations, [])
  );
  const fieldOfflineQueue = sanitizeBackupValue(
    liveState?.fieldOfflineQueue ?? loadFieldOfflineQueue(storage)
  );
  const notificationInboxState = sanitizeBackupValue(
    liveState?.notificationInboxState ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.notificationInboxState, {})
  );
  const accountConnections = sanitizeBackupValue(
    liveState?.accountConnections ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.accountConnections, {})
  );
  const selectedConsumerConnections = sanitizeBackupValue(
    liveState?.selectedConsumerConnections ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.selectedConsumerConnections, {})
  );
  const billingReminderKeys = sanitizeBackupValue(
    liveState?.billingReminderKeys ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.billingReminderKeys, [])
  );
  const slaEmittedEventKeys = sanitizeBackupValue(
    liveState?.slaEmittedEventKeys ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.slaEmittedEventKeys, [])
  );
  const dismissedModalIds = sanitizeBackupValue(
    liveState?.dismissedModalIds ??
      readStorageJson(storage, CANONICAL_DEMO_STORAGE_KEYS.dismissedModalIds, [])
  );
  const adminRbacState: AdminRbacStateSnapshot = sanitizeBackupValue(
    liveState?.adminRbacState ?? {
      users: readStorageJson(
        storage,
        CANONICAL_DEMO_STORAGE_KEYS.adminStaffUsers,
        DEFAULT_ADMIN_STAFF_USERS
      ),
      permissions: readStorageJson(
        storage,
        CANONICAL_DEMO_STORAGE_KEYS.adminRbacPermissions,
        DEFAULT_ADMIN_RBAC_PERMISSIONS
      ),
    }
  );

  const receiptAndDocumentMetadata = sanitizeBackupValue(
    deriveReceiptAndDocumentManifest({
      bills,
      payments,
      applications,
      complaints,
      workOrders,
    })
  );

  const smartPaymentCalendar = sanitizeBackupValue(
    derivePaymentCalendarEvents({
      bills,
      connections,
      payments,
      referenceDate: '15-Oct-2026',
    })
  );

  return {
    consumers,
    connections,
    bills,
    payments,
    applications,
    complaints,
    workOrders,
    employees,
    fieldEngineers,
    incidents,
    notifications,
    auditLogs,
    aiRecommendations,
    fieldOfflineQueue,
    notificationInboxState,
    accountConnections,
    selectedConsumerConnections,
    billingReminderKeys,
    slaEmittedEventKeys,
    dismissedModalIds,
    adminRbacState,
    receiptAndDocumentMetadata,
    smartPaymentCalendar,
  };
}

export function getCategoryRecordCount(
  category: BackupCategoryKey,
  payload: DemoBackupPayload
): number {
  const val = payload[category];
  if (Array.isArray(val)) return val.length;
  if (category === 'adminRbacState' && val && typeof val === 'object') {
    const rbac = val as AdminRbacStateSnapshot;
    return (Array.isArray(rbac.users) ? rbac.users.length : 0) +
      (Array.isArray(rbac.permissions) ? rbac.permissions.length : 0);
  }
  if (val && typeof val === 'object') {
    return Object.keys(val).length;
  }
  return 0;
}

const CATEGORY_STORAGE_KEY_MAP: Record<BackupCategoryKey, string> = {
  consumers: CANONICAL_DEMO_STORAGE_KEYS.consumers,
  connections: CANONICAL_DEMO_STORAGE_KEYS.connections,
  bills: CANONICAL_DEMO_STORAGE_KEYS.bills,
  payments: CANONICAL_DEMO_STORAGE_KEYS.payments,
  applications: CANONICAL_DEMO_STORAGE_KEYS.applications,
  complaints: CANONICAL_DEMO_STORAGE_KEYS.complaints,
  workOrders: CANONICAL_DEMO_STORAGE_KEYS.workOrders,
  employees: CANONICAL_DEMO_STORAGE_KEYS.employees,
  fieldEngineers: CANONICAL_DEMO_STORAGE_KEYS.fieldEngineers,
  incidents: CANONICAL_DEMO_STORAGE_KEYS.incidents,
  notifications: CANONICAL_DEMO_STORAGE_KEYS.notifications,
  auditLogs: CANONICAL_DEMO_STORAGE_KEYS.auditLogs,
  aiRecommendations: CANONICAL_DEMO_STORAGE_KEYS.aiRecommendations,
  fieldOfflineQueue: CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue,
  notificationInboxState: CANONICAL_DEMO_STORAGE_KEYS.notificationInboxState,
  accountConnections: CANONICAL_DEMO_STORAGE_KEYS.accountConnections,
  selectedConsumerConnections: CANONICAL_DEMO_STORAGE_KEYS.selectedConsumerConnections,
  billingReminderKeys: CANONICAL_DEMO_STORAGE_KEYS.billingReminderKeys,
  slaEmittedEventKeys: CANONICAL_DEMO_STORAGE_KEYS.slaEmittedEventKeys,
  dismissedModalIds: CANONICAL_DEMO_STORAGE_KEYS.dismissedModalIds,
  adminRbacState: `${CANONICAL_DEMO_STORAGE_KEYS.adminStaffUsers} + ${CANONICAL_DEMO_STORAGE_KEYS.adminRbacPermissions}`,
  receiptAndDocumentMetadata: 'derived:documentEngine+barcodeEngine+qrCodeEngine',
  smartPaymentCalendar: 'derived:paymentCalendarEngine',
};

// ============================================================================
// 1. CREATE BACKUP & SERIALIZE PORTABLE JSON
// ============================================================================

export interface CreateDemoBackupResult {
  success: boolean;
  authorized: boolean;
  error?: string;
  envelope?: DemoBackupEnvelope;
  serializedJson?: string;
  filename?: string;
  byteSize?: number;
  auditRecord: BackupAuditRecord;
}

export function createDemoBackup(params: {
  actor: BackupActorIdentity;
  liveState?: Partial<DemoBackupLiveStateInput>;
  storage?: StorageLike | null;
  nowIso?: string;
  backupIdOverride?: string;
}): CreateDemoBackupResult {
  const storage = params.storage === undefined ? getDefaultStorage() : params.storage;
  const auth = assertAdminBackupAuthorization(params.actor);
  const nowIso = params.nowIso || new Date().toISOString();

  if (!auth.authorized) {
    const auditRecord = recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'UNAUTHORIZED_ACCESS_BLOCKED',
        outcome: 'FAILED',
        actorId: params.actor?.id || 'anonymous',
        actorName: params.actor?.name || 'Unauthorized User',
        actorRole: params.actor?.role || 'consumer',
        summary: 'Unauthorized attempt to create Admin DEMO backup blocked.',
        details: auth.denialReason || 'Non-admin role rejected.',
      },
      storage
    );
    return {
      success: false,
      authorized: false,
      error: auth.denialReason,
      auditRecord,
    };
  }

  const payload = collectLiveDemoStatePayload(params.liveState, storage);

  const recordCounts = {} as Record<BackupCategoryKey, number>;
  const categoryChecksums = {} as Record<BackupCategoryKey, string>;
  const categoryManifest: BackupCategoryManifestItem[] = [];

  for (const cat of ALL_BACKUP_CATEGORIES) {
    const count = getCategoryRecordCount(cat, payload);
    const catChecksum = computeCategoryChecksum(cat, payload[cat]);
    recordCounts[cat] = count;
    categoryChecksums[cat] = catChecksum;
    categoryManifest.push({
      category: cat,
      storageKey: CATEGORY_STORAGE_KEY_MAP[cat],
      recordCount: count,
      classification:
        cat === 'receiptAndDocumentMetadata' || cat === 'smartPaymentCalendar'
          ? 'DERIVED_VERIFICATION_MANIFEST'
          : 'CANONICAL_PERSISTENT',
      checksum: catChecksum,
    });
  }

  const rootChecksum = computeEnvelopeIntegrityChecksum({
    formatId: BACKUP_FORMAT_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    recordCounts,
    categoryChecksums,
  });

  const dateCompact = nowIso.slice(0, 10).replace(/-/g, '');
  const shortDigest = rootChecksum.slice(0, 8).toUpperCase();
  const backupId = params.backupIdOverride || `BKP-UG-${dateCompact}-${shortDigest}`;

  const envelope: DemoBackupEnvelope = {
    formatId: BACKUP_FORMAT_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    applicationVersion: BACKUP_APPLICATION_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    backupId,
    createdAt: nowIso,
    createdBy: {
      id: params.actor.id,
      name: params.actor.name,
      role: params.actor.role,
      subdivision: params.actor.subdivision || 'Gujarat State Data Center',
    },
    ugvclBrandProtected: {
      companyNameEn: UGVCL_COMPANY_NAME_EN,
      companyNameGu: UGVCL_COMPANY_NAME_GU,
      taglineEn: UGVCL_TAGLINE_EN,
    },
    demoDisclosure: DEMO_BACKUP_DISCLOSURE_EN,
    categoryManifest,
    recordCounts,
    payload,
    integrity: {
      algorithm: 'DETERMINISTIC-CANONICAL-FNV256-HEX',
      checksum: rootChecksum,
      categoryChecksums,
      isCryptographicallyAuthenticated: false,
      authenticationDisclosure: CHECKSUM_AUTHENTICATION_DISCLOSURE_EN,
      credentialSanitizationVerified: true,
    },
  };

  const serializedJson = stableStringify(envelope, true);
  const byteSize = new TextEncoder().encode(serializedJson).byteLength;
  const filename = `vidyutflow-ugvcl-demo-backup-${dateCompact}-${shortDigest.toLowerCase()}.json`;

  const totalRecords = Object.values(recordCounts).reduce((a, b) => a + b, 0);
  const auditRecord = recordBackupAuditEvent(
    {
      timestamp: nowIso,
      operationType: 'BACKUP_CREATED',
      outcome: 'SUCCESS',
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      backupId,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      summary: `Created DEMO backup ${backupId} (${ALL_BACKUP_CATEGORIES.length} categories, ${totalRecords} total records).`,
      details: `Format: ${BACKUP_FORMAT_ID} v${BACKUP_FORMAT_VERSION}, Checksum: ${rootChecksum.slice(0, 16)}...`,
    },
    storage
  );

  return {
    success: true,
    authorized: true,
    envelope,
    serializedJson,
    filename,
    byteSize,
    auditRecord,
  };
}

export function triggerBackupJsonDownload(
  serializedJson: string,
  filename: string
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const blob = new Blob([serializedJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// 2. VALIDATE BACKUP (READ-ONLY — ZERO STATE MUTATION)
// ============================================================================

const ARRAY_CATEGORIES: readonly BackupCategoryKey[] = [
  'consumers',
  'connections',
  'bills',
  'payments',
  'applications',
  'complaints',
  'workOrders',
  'employees',
  'fieldEngineers',
  'incidents',
  'notifications',
  'auditLogs',
  'aiRecommendations',
  'fieldOfflineQueue',
  'billingReminderKeys',
  'slaEmittedEventKeys',
  'dismissedModalIds',
  'receiptAndDocumentMetadata',
  'smartPaymentCalendar',
];

const OBJECT_MAP_CATEGORIES: readonly BackupCategoryKey[] = [
  'notificationInboxState',
  'accountConnections',
  'selectedConsumerConnections',
  'adminRbacState',
];

export function validateDemoBackup(params: {
  actor: BackupActorIdentity;
  backupInput: string | unknown;
  maxBytes?: number;
  recordAudit?: boolean;
  storage?: StorageLike | null;
  nowIso?: string;
}): BackupValidationResult {
  const storage = params.storage === undefined ? getDefaultStorage() : params.storage;
  const maxBytes = params.maxBytes ?? MAX_BACKUP_FILE_BYTES;
  const nowIso = params.nowIso || new Date().toISOString();
  const auth = assertAdminBackupAuthorization(params.actor);

  if (!auth.authorized) {
    if (params.recordAudit !== false) {
      recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'UNAUTHORIZED_ACCESS_BLOCKED',
          outcome: 'FAILED',
          actorId: params.actor?.id || 'anonymous',
          actorName: params.actor?.name || 'Unauthorized User',
          actorRole: params.actor?.role || 'consumer',
          summary: 'Unauthorized attempt to validate DEMO backup blocked.',
          details: auth.denialReason || 'Non-admin role rejected.',
        },
        storage
      );
    }
    return {
      isValid: false,
      authorized: false,
      schemaCompatible: false,
      integrityVerified: false,
      fileSizeBytes: 0,
      missingCategories: [],
      incompatibleCategories: [],
      tamperedCategories: [],
      recordCounts: {},
      totalRecordsCount: 0,
      issues: [
        {
          code: 'UNAUTHORIZED_ROLE',
          severity: 'ERROR',
          message: auth.denialReason || 'Admin role required.',
        },
      ],
      historicalDemoNotes: [],
    };
  }

  const issues: BackupValidationIssue[] = [];
  let rawString = '';
  let parsedObj: unknown = null;

  if (typeof params.backupInput === 'string') {
    rawString = params.backupInput;
    const byteLength = new TextEncoder().encode(rawString).byteLength;
    if (byteLength === 0 || rawString.trim().length === 0) {
      return {
        isValid: false,
        authorized: true,
        schemaCompatible: false,
        integrityVerified: false,
        fileSizeBytes: byteLength,
        missingCategories: [],
        incompatibleCategories: [],
        tamperedCategories: [],
        recordCounts: {},
        totalRecordsCount: 0,
        issues: [
          {
            code: 'EMPTY_INPUT',
            severity: 'ERROR',
            message: 'Backup file is empty.',
          },
        ],
        historicalDemoNotes: [],
      };
    }

    if (byteLength > maxBytes) {
      return {
        isValid: false,
        authorized: true,
        schemaCompatible: false,
        integrityVerified: false,
        fileSizeBytes: byteLength,
        missingCategories: [],
        incompatibleCategories: [],
        tamperedCategories: [],
        recordCounts: {},
        totalRecordsCount: 0,
        issues: [
          {
            code: 'FILE_TOO_LARGE',
            severity: 'ERROR',
            message: `Backup file size (${byteLength.toLocaleString()} bytes) exceeds maximum allowed limit (${maxBytes.toLocaleString()} bytes).`,
          },
        ],
        historicalDemoNotes: [],
      };
    }

    // Check for executable script tags or prototype pollution payloads in raw JSON
    if (
      /<script\b/i.test(rawString) ||
      /javascript\s*:/i.test(rawString) ||
      /"__proto__"\s*:/.test(rawString) ||
      /"constructor"\s*:\s*\{/.test(rawString)
    ) {
      issues.push({
        code: 'UNSAFE_CODE_DETECTED',
        severity: 'ERROR',
        message:
          'Security violation: Backup file contains executable script patterns or prototype-pollution keys.',
      });
    }

    try {
      parsedObj = JSON.parse(rawString);
    } catch (err) {
      return {
        isValid: false,
        authorized: true,
        schemaCompatible: false,
        integrityVerified: false,
        fileSizeBytes: byteLength,
        missingCategories: [],
        incompatibleCategories: [],
        tamperedCategories: [],
        recordCounts: {},
        totalRecordsCount: 0,
        issues: [
          {
            code: 'MALFORMED_JSON',
            severity: 'ERROR',
            message: `Malformed JSON file: ${(err as Error)?.message || 'Unable to parse JSON.'}`,
          },
        ],
        historicalDemoNotes: [],
      };
    }
  } else if (params.backupInput && typeof params.backupInput === 'object') {
    parsedObj = params.backupInput;
    rawString = JSON.stringify(parsedObj);
    const byteLength = new TextEncoder().encode(rawString).byteLength;
    if (byteLength > maxBytes) {
      issues.push({
        code: 'FILE_TOO_LARGE',
        severity: 'ERROR',
        message: `Backup payload (${byteLength.toLocaleString()} bytes) exceeds maximum allowed limit (${maxBytes.toLocaleString()} bytes).`,
      });
    }
  } else {
    return {
      isValid: false,
      authorized: true,
      schemaCompatible: false,
      integrityVerified: false,
      fileSizeBytes: 0,
      missingCategories: [],
      incompatibleCategories: [],
      tamperedCategories: [],
      recordCounts: {},
      totalRecordsCount: 0,
      issues: [
        {
          code: 'MALFORMED_JSON',
          severity: 'ERROR',
          message: 'Backup input must be a JSON string or backup envelope object.',
        },
      ],
      historicalDemoNotes: [],
    };
  }

  const fileSizeBytes = new TextEncoder().encode(rawString).byteLength;

  if (!parsedObj || typeof parsedObj !== 'object' || Array.isArray(parsedObj)) {
    return {
      isValid: false,
      authorized: true,
      schemaCompatible: false,
      integrityVerified: false,
      fileSizeBytes,
      missingCategories: [],
      incompatibleCategories: [],
      tamperedCategories: [],
      recordCounts: {},
      totalRecordsCount: 0,
      issues: [
        {
          code: 'MALFORMED_JSON',
          severity: 'ERROR',
          message: 'Backup root must be a JSON object.',
        },
      ],
      historicalDemoNotes: [],
    };
  }

  // Check for credential leakage anywhere in the backup envelope
  const leakedCredentialKey = containsForbiddenCredentialKey(parsedObj);
  if (leakedCredentialKey) {
    issues.push({
      code: 'CREDENTIAL_LEAK_DETECTED',
      severity: 'ERROR',
      message: `Security violation: Backup contains forbidden credential or token field "${leakedCredentialKey}".`,
    });
  }

  const candidate = parsedObj as Partial<DemoBackupEnvelope>;

  // 1. Format & Schema Version Compatibility
  let schemaCompatible = true;
  if (candidate.formatId !== BACKUP_FORMAT_ID) {
    schemaCompatible = false;
    issues.push({
      code: 'INVALID_FORMAT_ID',
      severity: 'ERROR',
      message: `Unsupported backup format identifier "${String(candidate.formatId)}". Expected "${BACKUP_FORMAT_ID}".`,
    });
  }

  if (candidate.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    schemaCompatible = false;
    issues.push({
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      severity: 'ERROR',
      message: `Unsupported backup schemaVersion "${String(candidate.schemaVersion)}". Expected version ${BACKUP_SCHEMA_VERSION}.`,
    });
  }

  if (candidate.formatVersion !== BACKUP_FORMAT_VERSION) {
    schemaCompatible = false;
    issues.push({
      code: 'UNSUPPORTED_FORMAT_VERSION',
      severity: 'ERROR',
      message: `Unsupported backup formatVersion "${String(candidate.formatVersion)}". Expected "${BACKUP_FORMAT_VERSION}".`,
    });
  }

  const payload = (candidate.payload || {}) as Partial<DemoBackupPayload>;
  const missingCategories: BackupCategoryKey[] = [];
  const incompatibleCategories: BackupCategoryKey[] = [];
  const tamperedCategories: BackupCategoryKey[] = [];
  const actualRecordCounts: Partial<Record<BackupCategoryKey, number>> = {};

  // 2. Category Presence & Structural Compatibility
  for (const cat of ALL_BACKUP_CATEGORIES) {
    if (!(cat in payload) || payload[cat] === undefined || payload[cat] === null) {
      missingCategories.push(cat);
      issues.push({
        code: 'MISSING_CATEGORY',
        severity: 'ERROR',
        category: cat,
        message: `Missing required backup data category "${cat}".`,
      });
      continue;
    }

    const catValue = payload[cat];
    if (ARRAY_CATEGORIES.includes(cat)) {
      if (!Array.isArray(catValue)) {
        incompatibleCategories.push(cat);
        issues.push({
          code: 'INCOMPATIBLE_CATEGORY_TYPE',
          severity: 'ERROR',
          category: cat,
          message: `Category "${cat}" must be an Array, but received ${typeof catValue}.`,
        });
        continue;
      }
      if (catValue.length > MAX_RECORDS_PER_CATEGORY) {
        incompatibleCategories.push(cat);
        issues.push({
          code: 'FILE_TOO_LARGE',
          severity: 'ERROR',
          category: cat,
          message: `Category "${cat}" contains ${catValue.length} items, exceeding safety limit (${MAX_RECORDS_PER_CATEGORY}).`,
        });
      }
    } else if (OBJECT_MAP_CATEGORIES.includes(cat)) {
      if (typeof catValue !== 'object' || Array.isArray(catValue)) {
        incompatibleCategories.push(cat);
        issues.push({
          code: 'INCOMPATIBLE_CATEGORY_TYPE',
          severity: 'ERROR',
          category: cat,
          message: `Category "${cat}" must be a non-null Object map.`,
        });
        continue;
      }
      if (cat === 'adminRbacState') {
        const rbac = catValue as Partial<AdminRbacStateSnapshot>;
        if (!Array.isArray(rbac.users) || !Array.isArray(rbac.permissions)) {
          incompatibleCategories.push(cat);
          issues.push({
            code: 'INCOMPATIBLE_CATEGORY_TYPE',
            severity: 'ERROR',
            category: cat,
            message: 'Category "adminRbacState" must contain "users" and "permissions" arrays.',
          });
          continue;
        }
      }
    }

    const actualCount = getCategoryRecordCount(cat, payload as DemoBackupPayload);
    actualRecordCounts[cat] = actualCount;

    const declaredCount = candidate.recordCounts?.[cat];
    if (typeof declaredCount !== 'number' || declaredCount !== actualCount) {
      issues.push({
        code: 'RECORD_COUNT_MISMATCH',
        severity: 'ERROR',
        category: cat,
        message: `Record count mismatch in "${cat}": manifest declares ${String(declaredCount)}, payload contains ${actualCount}.`,
      });
    }
  }

  // 3. Integrity Checksum Verification
  let integrityVerified = true;
  if (
    !candidate.integrity ||
    typeof candidate.integrity.checksum !== 'string' ||
    !candidate.integrity.categoryChecksums
  ) {
    integrityVerified = false;
    issues.push({
      code: 'CHECKSUM_MISMATCH',
      severity: 'ERROR',
      message: 'Backup integrity metadata or checksum is missing.',
    });
  } else if (missingCategories.length === 0 && incompatibleCategories.length === 0) {
    const recomputedCategoryChecksums = {} as Record<BackupCategoryKey, string>;
    for (const cat of ALL_BACKUP_CATEGORIES) {
      const expectedCatSum = candidate.integrity.categoryChecksums[cat];
      const actualCatSum = computeCategoryChecksum(cat, payload[cat]);
      recomputedCategoryChecksums[cat] = actualCatSum;
      if (expectedCatSum !== actualCatSum) {
        integrityVerified = false;
        tamperedCategories.push(cat);
        issues.push({
          code: 'CATEGORY_CHECKSUM_MISMATCH',
          severity: 'ERROR',
          category: cat,
          message: `Integrity check failed for category "${cat}": data was modified or corrupted after backup creation.`,
        });
      }
    }

    const expectedRootChecksum = computeEnvelopeIntegrityChecksum({
      formatId: String(candidate.formatId),
      formatVersion: String(candidate.formatVersion),
      schemaVersion: Number(candidate.schemaVersion),
      recordCounts: (candidate.recordCounts || {}) as Record<BackupCategoryKey, number>,
      categoryChecksums: recomputedCategoryChecksums,
    });

    if (candidate.integrity.checksum !== expectedRootChecksum) {
      integrityVerified = false;
      issues.push({
        code: 'CHECKSUM_MISMATCH',
        severity: 'ERROR',
        message: 'Root backup integrity checksum mismatch: file has been corrupted or tampered with.',
      });
    }
  } else {
    integrityVerified = false;
  }

  // 4. Domain Invariants & Referential Integrity Checks
  const historicalDemoNotes: HistoricalDemoIntegrityNote[] = [];

  if (missingCategories.length === 0 && incompatibleCategories.length === 0) {
    const fullPayload = payload as DemoBackupPayload;

    // 4a. Check unique record IDs across entity collections
    const checkUniqueKey = <T>(
      items: T[],
      cat: BackupCategoryKey,
      extractor: (item: T) => string | undefined,
      keyLabel: string
    ) => {
      const seen = new Set<string>();
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          issues.push({
            code: 'INCOMPATIBLE_CATEGORY_TYPE',
            severity: 'ERROR',
            category: cat,
            message: `Invalid non-object record in "${cat}".`,
          });
          continue;
        }
        const id = extractor(item);
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
          issues.push({
            code: 'INCOMPATIBLE_CATEGORY_TYPE',
            severity: 'ERROR',
            category: cat,
            message: `Record in "${cat}" is missing required identifier "${keyLabel}".`,
          });
          continue;
        }
        const norm = id.trim().toUpperCase();
        if (seen.has(norm)) {
          issues.push({
            code: 'DUPLICATE_RECORD_ID',
            severity: 'ERROR',
            category: cat,
            message: `Duplicate ${keyLabel} "${id}" detected in category "${cat}".`,
          });
        }
        seen.add(norm);
      }
    };

    checkUniqueKey(fullPayload.consumers, 'consumers', (c) => c.consumerNo, 'consumerNo');
    checkUniqueKey(fullPayload.connections, 'connections', (c) => c.consumerNo, 'consumerNo');
    checkUniqueKey(fullPayload.bills, 'bills', (b) => b.billNo, 'billNo');
    checkUniqueKey(fullPayload.payments, 'payments', (p) => p.txId, 'txId');
    checkUniqueKey(fullPayload.applications, 'applications', (a) => a.id, 'id');
    checkUniqueKey(fullPayload.complaints, 'complaints', (c) => c.id, 'id');
    checkUniqueKey(fullPayload.workOrders, 'workOrders', (w) => w.id, 'id');
    checkUniqueKey(fullPayload.employees, 'employees', (e) => e.id, 'id');
    checkUniqueKey(fullPayload.fieldEngineers, 'fieldEngineers', (f) => f.id, 'id');
    checkUniqueKey(fullPayload.incidents, 'incidents', (i) => i.id, 'id');
    checkUniqueKey(fullPayload.notifications, 'notifications', (n) => n.id, 'id');
    checkUniqueKey(fullPayload.auditLogs, 'auditLogs', (a) => a.id, 'id');
    checkUniqueKey(
      fullPayload.fieldOfflineQueue,
      'fieldOfflineQueue',
      (q) => q.client_uuid,
      'client_uuid'
    );

    // 4b. Validate Field Offline Queue item structure
    for (const qItem of fullPayload.fieldOfflineQueue) {
      if (!isValidOfflineQueueItem(qItem)) {
        issues.push({
          code: 'INVALID_OFFLINE_QUEUE_ITEM',
          severity: 'ERROR',
          category: 'fieldOfflineQueue',
          message: `Offline queue item "${String((qItem as Partial<FieldOfflineQueueItem>)?.client_uuid)}" has an invalid structure or status.`,
        });
      }
    }

    // 4c. Referential relationship validation: Bills <-> Connections & Consumers
    const validConsumerNos = new Set<string>();
    const validConnectionIds = new Set<string>();
    for (const conn of fullPayload.connections) {
      if (conn?.consumerNo) validConsumerNos.add(normalizeBillingIdentifier(conn.consumerNo));
      if (conn?.connectionId) validConnectionIds.add(normalizeBillingIdentifier(conn.connectionId));
    }
    for (const cons of fullPayload.consumers) {
      if (cons?.consumerNo) validConsumerNos.add(normalizeBillingIdentifier(cons.consumerNo));
    }

    const validBillNos = new Set<string>();
    for (const bill of fullPayload.bills) {
      if (!bill?.billNo) continue;
      validBillNos.add(normalizeBillingIdentifier(bill.billNo));
      const normBillConsumer = normalizeBillingIdentifier(bill.consumerNo);
      const normBillConnId = normalizeBillingIdentifier(bill.connectionId);
      if (
        !validConsumerNos.has(normBillConsumer) &&
        (!normBillConnId || !validConnectionIds.has(normBillConnId))
      ) {
        issues.push({
          code: 'BROKEN_BILL_CONNECTION_REF',
          severity: 'ERROR',
          category: 'bills',
          message: `Bill "${bill.billNo}" references unknown consumerNo "${bill.consumerNo}" with no matching connection.`,
        });
      }
    }

    // 4d. Referential relationship validation: Payments <-> Bills & Connections
    for (const pay of fullPayload.payments) {
      if (!pay?.txId) continue;
      const normPayConsumer = normalizeBillingIdentifier(pay.consumerNo);
      const normPayBill = normalizeBillingIdentifier(pay.billNo);
      if (!validConsumerNos.has(normPayConsumer)) {
        issues.push({
          code: 'BROKEN_PAYMENT_REF',
          severity: 'ERROR',
          category: 'payments',
          message: `Payment "${pay.txId}" references unknown consumerNo "${pay.consumerNo}".`,
        });
      }
      const isCanonicalHistoricalArchivedBillPayment =
        pay.txId === 'TXN-DEB-1192837462' &&
        normPayBill === normalizeBillingIdentifier('BILL-UG-2026-08-77190') &&
        normPayConsumer === normalizeBillingIdentifier('04281-77190');

      if (normPayBill && !validBillNos.has(normPayBill)) {
        if (isCanonicalHistoricalArchivedBillPayment) {
          historicalDemoNotes.push({
            recordId: pay.txId,
            category: 'payments',
            code: 'HISTORICAL_METER_READING_REGISTER_DIFF',
            description: `Historical DEMO payment ${pay.txId} references archived prior-cycle bill ${pay.billNo} for active commercial connection ${pay.consumerNo}; preserved without fabricating archived bill records.`,
          });
        } else {
          issues.push({
            code: 'BROKEN_PAYMENT_REF',
            severity: 'ERROR',
            category: 'payments',
            message: `Payment "${pay.txId}" references non-existent billNo "${pay.billNo}".`,
          });
        }
      }
    }

    // 4e. Verify Barcode & QR references in receiptAndDocumentMetadata match canonical derivation
    const billDocEntries = fullPayload.receiptAndDocumentMetadata.filter(
      (d) => d.documentType === 'electricity_bill'
    );
    for (const docEntry of billDocEntries) {
      const matchingBill = fullPayload.bills.find((b) => b.billNo === docEntry.sourceRecordId);
      if (!matchingBill) {
        issues.push({
          code: 'BARCODE_QR_MISMATCH',
          severity: 'ERROR',
          category: 'receiptAndDocumentMetadata',
          message: `Document metadata "${docEntry.documentId}" references missing bill "${docEntry.sourceRecordId}".`,
        });
        continue;
      }
      const expectedBarcode = deriveCanonicalBarcodeReference(
        matchingBill.billNo,
        matchingBill.consumerNo
      );
      const expectedQr = deriveCanonicalQrVerificationUrl(
        matchingBill.billNo,
        matchingBill.consumerNo
      ).url;
      if (docEntry.barcodeReference !== expectedBarcode || docEntry.qrVerificationUrl !== expectedQr) {
        issues.push({
          code: 'BARCODE_QR_MISMATCH',
          severity: 'ERROR',
          category: 'receiptAndDocumentMetadata',
          message: `Bill "${matchingBill.billNo}" barcode or QR verification reference in manifest does not match canonical identity.`,
        });
      }
    }

    // 4f. Detect and preserve historical DEMO inconsistencies as informational notes
    historicalDemoNotes.push(
      ...detectHistoricalDemoNotes({
        bills: fullPayload.bills,
        connections: fullPayload.connections,
      })
    );
  }

  const hasError = issues.some((i) => i.severity === 'ERROR');
  const isValid = schemaCompatible && integrityVerified && !hasError;
  const totalRecordsCount = Object.values(actualRecordCounts).reduce(
    (sum, n) => sum + (n || 0),
    0
  );

  if (params.recordAudit !== false) {
    recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'BACKUP_VALIDATED',
        outcome: isValid ? 'SUCCESS' : 'FAILED',
        actorId: params.actor.id,
        actorName: params.actor.name,
        actorRole: params.actor.role,
        backupId: candidate.backupId,
        schemaVersion: candidate.schemaVersion,
        summary: isValid
          ? `Validated backup ${candidate.backupId || 'unknown'} (${totalRecordsCount} records, checksum verified).`
          : `Backup validation failed with ${issues.length} issue(s).`,
        details: isValid
          ? `Schema v${candidate.schemaVersion} compatible. Zero live state changes made during validation.`
          : issues.map((i) => `[${i.code}] ${i.message}`).join(' | '),
      },
      storage
    );
  }

  return {
    isValid,
    authorized: true,
    schemaCompatible,
    integrityVerified,
    fileSizeBytes,
    backupId: candidate.backupId,
    createdAt: candidate.createdAt,
    schemaVersion: candidate.schemaVersion,
    formatVersion: candidate.formatVersion,
    applicationVersion: candidate.applicationVersion,
    missingCategories,
    incompatibleCategories,
    tamperedCategories,
    recordCounts: actualRecordCounts,
    totalRecordsCount,
    issues,
    historicalDemoNotes,
    parsedEnvelope: isValid ? (candidate as DemoBackupEnvelope) : undefined,
  };
}

// ============================================================================
// 3. RESTORE PREVIEW & OFFLINE QUEUE SAFETY ANALYSIS
// ============================================================================

function computeEntityArrayDiff<T>(
  category: BackupCategoryKey,
  currentItems: T[],
  backupItems: T[],
  idExtractor: (item: T) => string
): CategoryRestoreDiff {
  const currentMap = new Map<string, string>();
  for (const item of currentItems) {
    if (!item) continue;
    const id = idExtractor(item);
    if (id) currentMap.set(id, stableStringify(item));
  }

  const backupMap = new Map<string, string>();
  for (const item of backupItems) {
    if (!item) continue;
    const id = idExtractor(item);
    if (id) backupMap.set(id, stableStringify(item));
  }

  const addedIds: string[] = [];
  const replacedIds: string[] = [];
  const removedIds: string[] = [];
  let unchangedCount = 0;

  for (const [id, bSerialized] of backupMap.entries()) {
    if (!currentMap.has(id)) {
      addedIds.push(id);
    } else if (currentMap.get(id) !== bSerialized) {
      replacedIds.push(id);
    } else {
      unchangedCount++;
    }
  }

  for (const id of currentMap.keys()) {
    if (!backupMap.has(id)) {
      removedIds.push(id);
    }
  }

  return {
    category,
    currentCount: currentItems.length,
    backupCount: backupItems.length,
    addedCount: addedIds.length,
    replacedCount: replacedIds.length,
    removedCount: removedIds.length,
    unchangedCount,
    addedIds,
    replacedIds,
    removedIds,
  };
}

function computeKeyMapDiff(
  category: BackupCategoryKey,
  currentMapObj: Record<string, unknown>,
  backupMapObj: Record<string, unknown>
): CategoryRestoreDiff {
  const currentKeys = Object.keys(currentMapObj || {});
  const backupKeys = Object.keys(backupMapObj || {});
  const currentSet = new Set(currentKeys);
  const backupSet = new Set(backupKeys);

  const addedIds: string[] = [];
  const replacedIds: string[] = [];
  const removedIds: string[] = [];
  let unchangedCount = 0;

  for (const k of backupKeys) {
    if (!currentSet.has(k)) {
      addedIds.push(k);
    } else if (stableStringify(currentMapObj[k]) !== stableStringify(backupMapObj[k])) {
      replacedIds.push(k);
    } else {
      unchangedCount++;
    }
  }

  for (const k of currentKeys) {
    if (!backupSet.has(k)) {
      removedIds.push(k);
    }
  }

  return {
    category,
    currentCount: currentKeys.length,
    backupCount: backupKeys.length,
    addedCount: addedIds.length,
    replacedCount: replacedIds.length,
    removedCount: removedIds.length,
    unchangedCount,
    addedIds,
    replacedIds,
    removedIds,
  };
}

export function analyzeOfflineQueueConflict(
  currentQueue: FieldOfflineQueueItem[],
  backupQueue: FieldOfflineQueueItem[]
): OfflineQueueConflictSummary {
  const pendingLive = currentQueue.filter(
    (q) => q.status === 'PENDING' || q.status === 'PROCESSING'
  );
  const backupByUuid = new Map<string, FieldOfflineQueueItem>();
  for (const bq of backupQueue) {
    if (bq?.client_uuid) backupByUuid.set(bq.client_uuid, bq);
  }

  const currentCompletedUuids = new Set(
    currentQueue.filter((q) => q.status === 'COMPLETED').map((q) => q.client_uuid)
  );

  // Detect if backup has an item marked PENDING that was already COMPLETED in live state (duplicate replay risk)
  let duplicateReplayRiskDetected = false;
  for (const bq of backupQueue) {
    if (
      (bq.status === 'PENDING' || bq.status === 'PROCESSING') &&
      currentCompletedUuids.has(bq.client_uuid)
    ) {
      duplicateReplayRiskDetected = true;
    }
  }

  // Detect live pending items that are not identically preserved in the backup
  const unsavedLivePending = pendingLive.filter((lq) => {
    const match = backupByUuid.get(lq.client_uuid);
    return !match || match.status !== lq.status;
  });

  const hasPendingLiveActions = unsavedLivePending.length > 0;
  const pendingLiveClientUuids = unsavedLivePending.map((q) => q.client_uuid);
  const affectedWorkOrderIds = Array.from(
    new Set(unsavedLivePending.map((q) => q.targetRecordId))
  );

  let warningMessage =
    'No unsynchronized Field Engineer offline queue actions detected. Safe to proceed.';
  if (hasPendingLiveActions) {
    warningMessage =
      `Critical Offline Queue Warning: ${unsavedLivePending.length} unsynchronized Field Engineer action(s) ` +
      `(Work Orders: ${affectedWorkOrderIds.join(', ')}) are currently queued in local storage. ` +
      'Standard restore is blocked to prevent discarding unsynchronized field work. Synchronize the Field Offline Queue first, or explicitly select "Preserve Live Pending Offline Queue" to keep queued field actions.';
  } else if (duplicateReplayRiskDetected) {
    warningMessage =
      'Idempotency Notice: One or more offline queue actions marked PENDING in this older backup were already COMPLETED in live state; their completed idempotency status will be preserved so they are never replayed twice.';
  }

  return {
    hasPendingLiveActions,
    pendingLiveCount: unsavedLivePending.filter((q) => q.status === 'PENDING').length,
    processingLiveCount: unsavedLivePending.filter((q) => q.status === 'PROCESSING').length,
    pendingLiveClientUuids,
    affectedWorkOrderIds,
    duplicateReplayRiskDetected,
    canReconcileByPreservingLiveQueue: true,
    warningMessage,
  };
}

export function generateDemoRestorePreview(params: {
  actor: BackupActorIdentity;
  backupInput: string | unknown;
  currentState?: Partial<DemoBackupLiveStateInput>;
  storage?: StorageLike | null;
  offlineQueuePolicy?: OfflineQueueRestorePolicy;
  recordAudit?: boolean;
  nowIso?: string;
}): DemoRestorePreview {
  const storage = params.storage === undefined ? getDefaultStorage() : params.storage;
  const nowIso = params.nowIso || new Date().toISOString();
  const auth = assertAdminBackupAuthorization(params.actor);

  if (!auth.authorized) {
    if (params.recordAudit !== false) {
      recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'UNAUTHORIZED_ACCESS_BLOCKED',
          outcome: 'FAILED',
          actorId: params.actor?.id || 'anonymous',
          actorName: params.actor?.name || 'Unauthorized User',
          actorRole: params.actor?.role || 'consumer',
          summary: 'Unauthorized attempt to preview DEMO restore blocked.',
          details: auth.denialReason || 'Non-admin role rejected.',
        },
        storage
      );
    }
    return {
      authorized: false,
      isValidBackup: false,
      canRestoreSafely: false,
      backupId: '',
      backupCreatedAt: '',
      schemaVersion: 0,
      formatVersion: '',
      applicationVersion: '',
      categoryDiffs: [],
      totalAdded: 0,
      totalReplaced: 0,
      totalRemoved: 0,
      totalUnchanged: 0,
      offlineQueueConflict: {
        hasPendingLiveActions: false,
        pendingLiveCount: 0,
        processingLiveCount: 0,
        pendingLiveClientUuids: [],
        affectedWorkOrderIds: [],
        duplicateReplayRiskDetected: false,
        canReconcileByPreservingLiveQueue: false,
        warningMessage: auth.denialReason || 'Unauthorized',
      },
      blockingReasons: [auth.denialReason || 'Unauthorized role'],
      warnings: [],
      historicalDemoNotes: [],
    };
  }

  const validation = validateDemoBackup({
    actor: params.actor,
    backupInput: params.backupInput,
    recordAudit: false,
    storage,
    nowIso,
  });

  if (!validation.isValid || !validation.parsedEnvelope) {
    return {
      authorized: true,
      isValidBackup: false,
      canRestoreSafely: false,
      backupId: validation.backupId || '',
      backupCreatedAt: validation.createdAt || '',
      schemaVersion: validation.schemaVersion || 0,
      formatVersion: validation.formatVersion || '',
      applicationVersion: validation.applicationVersion || '',
      categoryDiffs: [],
      totalAdded: 0,
      totalReplaced: 0,
      totalRemoved: 0,
      totalUnchanged: 0,
      offlineQueueConflict: {
        hasPendingLiveActions: false,
        pendingLiveCount: 0,
        processingLiveCount: 0,
        pendingLiveClientUuids: [],
        affectedWorkOrderIds: [],
        duplicateReplayRiskDetected: false,
        canReconcileByPreservingLiveQueue: false,
        warningMessage: 'Backup validation failed; cannot generate restore preview.',
      },
      blockingReasons: validation.issues.map((i) => i.message),
      warnings: [],
      historicalDemoNotes: validation.historicalDemoNotes,
    };
  }

  const currentPayload = collectLiveDemoStatePayload(params.currentState, storage);
  const backupPayload = validation.parsedEnvelope.payload;

  const categoryDiffs: CategoryRestoreDiff[] = [
    computeEntityArrayDiff('consumers', currentPayload.consumers, backupPayload.consumers, (x) => x.consumerNo),
    computeEntityArrayDiff('connections', currentPayload.connections, backupPayload.connections, (x) => x.consumerNo),
    computeEntityArrayDiff('bills', currentPayload.bills, backupPayload.bills, (x) => x.billNo),
    computeEntityArrayDiff('payments', currentPayload.payments, backupPayload.payments, (x) => x.txId),
    computeEntityArrayDiff('applications', currentPayload.applications, backupPayload.applications, (x) => x.id),
    computeEntityArrayDiff('complaints', currentPayload.complaints, backupPayload.complaints, (x) => x.id),
    computeEntityArrayDiff('workOrders', currentPayload.workOrders, backupPayload.workOrders, (x) => x.id),
    computeEntityArrayDiff('employees', currentPayload.employees, backupPayload.employees, (x) => x.id),
    computeEntityArrayDiff('fieldEngineers', currentPayload.fieldEngineers, backupPayload.fieldEngineers, (x) => x.id),
    computeEntityArrayDiff('incidents', currentPayload.incidents, backupPayload.incidents, (x) => x.id),
    computeEntityArrayDiff('notifications', currentPayload.notifications, backupPayload.notifications, (x) => x.id),
    computeEntityArrayDiff('auditLogs', currentPayload.auditLogs, backupPayload.auditLogs, (x) => x.id),
    computeEntityArrayDiff('aiRecommendations', currentPayload.aiRecommendations, backupPayload.aiRecommendations, (x) => x.id),
    computeEntityArrayDiff('fieldOfflineQueue', currentPayload.fieldOfflineQueue, backupPayload.fieldOfflineQueue, (x) => x.client_uuid),
    computeKeyMapDiff('notificationInboxState', currentPayload.notificationInboxState, backupPayload.notificationInboxState),
    computeKeyMapDiff('accountConnections', currentPayload.accountConnections, backupPayload.accountConnections),
    computeKeyMapDiff('selectedConsumerConnections', currentPayload.selectedConsumerConnections, backupPayload.selectedConsumerConnections),
    computeEntityArrayDiff('billingReminderKeys', currentPayload.billingReminderKeys, backupPayload.billingReminderKeys, (x) => x),
    computeEntityArrayDiff('slaEmittedEventKeys', currentPayload.slaEmittedEventKeys, backupPayload.slaEmittedEventKeys, (x) => x),
    computeEntityArrayDiff('dismissedModalIds', currentPayload.dismissedModalIds, backupPayload.dismissedModalIds, (x) => x),
    computeKeyMapDiff(
      'adminRbacState',
      {
        users: currentPayload.adminRbacState.users,
        permissions: currentPayload.adminRbacState.permissions,
      },
      {
        users: backupPayload.adminRbacState.users,
        permissions: backupPayload.adminRbacState.permissions,
      }
    ),
    computeEntityArrayDiff(
      'receiptAndDocumentMetadata',
      currentPayload.receiptAndDocumentMetadata,
      backupPayload.receiptAndDocumentMetadata,
      (x) => x.documentId
    ),
    computeEntityArrayDiff(
      'smartPaymentCalendar',
      currentPayload.smartPaymentCalendar,
      backupPayload.smartPaymentCalendar,
      (x) => x.id
    ),
  ];

  const totalAdded = categoryDiffs.reduce((s, d) => s + d.addedCount, 0);
  const totalReplaced = categoryDiffs.reduce((s, d) => s + d.replacedCount, 0);
  const totalRemoved = categoryDiffs.reduce((s, d) => s + d.removedCount, 0);
  const totalUnchanged = categoryDiffs.reduce((s, d) => s + d.unchangedCount, 0);

  const offlineQueueConflict = analyzeOfflineQueueConflict(
    currentPayload.fieldOfflineQueue,
    backupPayload.fieldOfflineQueue
  );

  const policy = params.offlineQueuePolicy || 'BLOCK_IF_PENDING';
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  if (offlineQueueConflict.hasPendingLiveActions) {
    warnings.push(offlineQueueConflict.warningMessage);
    if (policy === 'BLOCK_IF_PENDING') {
      blockingReasons.push(offlineQueueConflict.warningMessage);
    }
  } else if (offlineQueueConflict.duplicateReplayRiskDetected) {
    warnings.push(offlineQueueConflict.warningMessage);
  }

  if (totalRemoved > 0) {
    warnings.push(
      `Restoring this backup will replace current state and remove ${totalRemoved} record(s) that were created after the backup timestamp (${validation.parsedEnvelope.createdAt}).`
    );
  }

  const canRestoreSafely = blockingReasons.length === 0;

  if (params.recordAudit !== false) {
    recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'RESTORE_PREVIEWED',
        outcome: canRestoreSafely ? 'SUCCESS' : 'WARNING',
        actorId: params.actor.id,
        actorName: params.actor.name,
        actorRole: params.actor.role,
        backupId: validation.parsedEnvelope.backupId,
        schemaVersion: validation.parsedEnvelope.schemaVersion,
        summary: `Generated restore preview for ${validation.parsedEnvelope.backupId}: +${totalAdded} added, ~${totalReplaced} replaced, -${totalRemoved} removed.`,
        details: canRestoreSafely
          ? 'Restore can be performed safely after explicit administrator confirmation.'
          : `Blocked: ${blockingReasons.join(' | ')}`,
      },
      storage
    );
  }

  return {
    authorized: true,
    isValidBackup: true,
    canRestoreSafely,
    backupId: validation.parsedEnvelope.backupId,
    backupCreatedAt: validation.parsedEnvelope.createdAt,
    schemaVersion: validation.parsedEnvelope.schemaVersion,
    formatVersion: validation.parsedEnvelope.formatVersion,
    applicationVersion: validation.parsedEnvelope.applicationVersion,
    categoryDiffs,
    totalAdded,
    totalReplaced,
    totalRemoved,
    totalUnchanged,
    offlineQueueConflict,
    blockingReasons,
    warnings,
    historicalDemoNotes: validation.historicalDemoNotes,
  };
}

// ============================================================================
// 4. PRE-RESTORE RECOVERY SNAPSHOT & SAFE RESTORE EXECUTION WITH ROLLBACK
// ============================================================================

let activeRestoreMutex = false;

export function isRestoreInProgress(): boolean {
  return activeRestoreMutex;
}

export function setRestoreMutexForTesting(locked: boolean): void {
  activeRestoreMutex = locked;
}

export function getStoredPreRestoreRecoverySnapshot(
  storage: StorageLike | null = getDefaultStorage()
): RecoverySnapshotEnvelope | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RecoverySnapshotEnvelope;
    if (!parsed || !parsed.backupEnvelope || !parsed.snapshotId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function preparePreRestoreRecoverySnapshot(params: {
  actor: BackupActorIdentity;
  targetBackupId: string;
  currentState?: Partial<DemoBackupLiveStateInput>;
  storage?: StorageLike | null;
  nowIso?: string;
}): { usable: boolean; snapshot?: RecoverySnapshotEnvelope; error?: string } {
  const storage = params.storage === undefined ? getDefaultStorage() : params.storage;
  const nowIso = params.nowIso || new Date().toISOString();

  const backupRes = createDemoBackup({
    actor: params.actor,
    liveState: params.currentState,
    storage,
    nowIso,
    backupIdOverride: `SNAP-PRE-${params.targetBackupId}-${Date.now().toString().slice(-4)}`,
  });

  if (!backupRes.success || !backupRes.envelope) {
    return {
      usable: false,
      error: backupRes.error || 'Failed to generate pre-restore recovery snapshot.',
    };
  }

  // Verify the recovery snapshot itself passes full integrity & schema validation
  const verifySnap = validateDemoBackup({
    actor: params.actor,
    backupInput: backupRes.envelope,
    recordAudit: false,
    storage,
    nowIso,
  });

  if (!verifySnap.isValid) {
    return {
      usable: false,
      error: 'Pre-restore recovery snapshot failed self-validation; aborting restore to prevent data loss.',
    };
  }

  const snapshot: RecoverySnapshotEnvelope = {
    snapshotId: backupRes.envelope.backupId,
    capturedAt: nowIso,
    capturedForBackupId: params.targetBackupId,
    capturedBy: params.actor,
    backupEnvelope: backupRes.envelope,
    isUsable: true,
  };

  if (storage) {
    try {
      const serialized = JSON.stringify(snapshot);
      storage.setItem(PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY, serialized);
      const readBack = storage.getItem(PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY);
      if (!readBack || readBack !== serialized) {
        return {
          usable: false,
          error: 'Could not verify pre-restore recovery snapshot in browser storage.',
        };
      }
    } catch (err) {
      return {
        usable: false,
        error: `Storage quota or write error while saving recovery snapshot: ${(err as Error)?.message || 'Unknown error'}`,
      };
    }
  }

  return { usable: true, snapshot };
}

/**
 * Reconciles offline queue items during restore so that:
 * 1. If `PRESERVE_LIVE_PENDING` is active, any unsynchronized `PENDING` or `PROCESSING` items from live state
 *    are preserved with their original `client_uuid` and idempotency metadata.
 * 2. Any queue item that was already `COMPLETED` in live state is never downgraded back to `PENDING`,
 *    preventing duplicate replay of already-executed field actions.
 */
export function reconcileRestoredOfflineQueue(
  currentQueue: FieldOfflineQueueItem[],
  backupQueue: FieldOfflineQueueItem[],
  policy: OfflineQueueRestorePolicy
): { mergedQueue: FieldOfflineQueueItem[]; preservedPendingCount: number } {
  const currentCompletedMap = new Map<string, FieldOfflineQueueItem>();
  for (const item of currentQueue) {
    if (item.status === 'COMPLETED') {
      currentCompletedMap.set(item.client_uuid, item);
    }
  }

  const resultMap = new Map<string, FieldOfflineQueueItem>();

  for (const bItem of backupQueue) {
    if (!bItem?.client_uuid) continue;
    // Never revert an already-completed action back to PENDING (prevents duplicate replay!)
    if (
      (bItem.status === 'PENDING' || bItem.status === 'PROCESSING') &&
      currentCompletedMap.has(bItem.client_uuid)
    ) {
      resultMap.set(bItem.client_uuid, structuredClone(currentCompletedMap.get(bItem.client_uuid)!));
    } else {
      resultMap.set(bItem.client_uuid, structuredClone(bItem));
    }
  }

  let preservedPendingCount = 0;
  if (policy === 'PRESERVE_LIVE_PENDING') {
    for (const lItem of currentQueue) {
      if (lItem.status === 'PENDING' || lItem.status === 'PROCESSING') {
        const existingInBackup = resultMap.get(lItem.client_uuid);
        if (!existingInBackup || existingInBackup.status !== lItem.status) {
          preservedPendingCount++;
        }
        resultMap.set(lItem.client_uuid, structuredClone(lItem));
      }
    }
  }

  return {
    mergedQueue: Array.from(resultMap.values()),
    preservedPendingCount,
  };
}

function buildRestoredRuntimeStateFromPayload(
  payload: DemoBackupPayload,
  mergedOfflineQueue: FieldOfflineQueueItem[]
): RestoredLiveRuntimeState {
  // Recompute gentle reminder suppression for paid bills so paid bills never re-trigger reminders
  const reminderEval = evaluateGentleBillingReminders({
    ownedConnections: payload.connections,
    bills: payload.bills,
    payments: payload.payments,
    existingNotifications: payload.notifications,
    emittedReminderKeys: payload.billingReminderKeys,
    accountId: 'demo_consumer',
    referenceDate: '15-Oct-2026',
    language: 'en',
  });

  const suppressNotifIds = new Set(reminderEval.suppressedNotificationIds);
  const reconciledNotifications = payload.notifications.map((n) =>
    suppressNotifIds.has(n.id) ? { ...n, read: true } : n
  );

  // Paid bills must also have their reminder keys recorded so gentle reminders stay suppressed
  const paidBillReminderKeys = new Set<string>(reminderEval.updatedEmittedReminderKeys);
  for (const bill of payload.bills) {
    const rec = reconcileBillWithPayments(bill, payload.payments, '15-Oct-2026');
    if (rec.isPaid) {
      paidBillReminderKeys.add(`REMIND-PAID-SUPPRESSED-${bill.billNo}`);
    }
  }

  const recomputedCalendarEvents = derivePaymentCalendarEvents({
    bills: payload.bills,
    connections: payload.connections,
    payments: payload.payments,
    referenceDate: '15-Oct-2026',
  });

  const recomputedReceiptsAndDocs = deriveReceiptAndDocumentManifest({
    bills: payload.bills,
    payments: payload.payments,
    applications: payload.applications,
    complaints: payload.complaints,
    workOrders: payload.workOrders,
  });

  return {
    consumers: structuredClone(payload.consumers),
    connections: structuredClone(payload.connections),
    bills: structuredClone(payload.bills),
    payments: structuredClone(payload.payments),
    applications: structuredClone(payload.applications),
    complaints: structuredClone(payload.complaints),
    workOrders: structuredClone(payload.workOrders),
    employees: structuredClone(payload.employees),
    fieldEngineers: structuredClone(payload.fieldEngineers),
    incidents: structuredClone(payload.incidents),
    notifications: structuredClone(reconciledNotifications),
    auditLogs: structuredClone(payload.auditLogs),
    aiRecommendations: structuredClone(payload.aiRecommendations),
    fieldOfflineQueue: structuredClone(mergedOfflineQueue),
    notificationInboxState: structuredClone(payload.notificationInboxState),
    accountConnections: structuredClone(payload.accountConnections),
    selectedConsumerConnections: structuredClone(payload.selectedConsumerConnections),
    billingReminderKeys: Array.from(paidBillReminderKeys),
    slaEmittedEventKeys: structuredClone(payload.slaEmittedEventKeys),
    dismissedModalIds: structuredClone(payload.dismissedModalIds),
    adminRbacState: structuredClone(payload.adminRbacState),
    recomputedCalendarEvents,
    recomputedReceiptsAndDocs,
  };
}

function writeRuntimeStateToStorage(
  state: RestoredLiveRuntimeState,
  storage: StorageLike | null,
  simulateFailureAtStep?: ExecuteSafeRestoreOptions['simulateFailureAtStep']
): void {
  if (!storage) return;

  const stagedWrites: Array<[string, string]> = [
    [CANONICAL_DEMO_STORAGE_KEYS.consumers, JSON.stringify(state.consumers)],
    [CANONICAL_DEMO_STORAGE_KEYS.connections, JSON.stringify(state.connections)],
    [CANONICAL_DEMO_STORAGE_KEYS.bills, JSON.stringify(state.bills)],
    [CANONICAL_DEMO_STORAGE_KEYS.payments, JSON.stringify(state.payments)],
    [CANONICAL_DEMO_STORAGE_KEYS.applications, JSON.stringify(state.applications)],
    [CANONICAL_DEMO_STORAGE_KEYS.complaints, JSON.stringify(state.complaints)],
    [CANONICAL_DEMO_STORAGE_KEYS.workOrders, JSON.stringify(state.workOrders)],
    [CANONICAL_DEMO_STORAGE_KEYS.employees, JSON.stringify(state.employees)],
    [CANONICAL_DEMO_STORAGE_KEYS.fieldEngineers, JSON.stringify(state.fieldEngineers)],
    [CANONICAL_DEMO_STORAGE_KEYS.incidents, JSON.stringify(state.incidents)],
    [CANONICAL_DEMO_STORAGE_KEYS.notifications, JSON.stringify(state.notifications)],
    [CANONICAL_DEMO_STORAGE_KEYS.auditLogs, JSON.stringify(state.auditLogs)],
    [CANONICAL_DEMO_STORAGE_KEYS.aiRecommendations, JSON.stringify(state.aiRecommendations)],
    [CANONICAL_DEMO_STORAGE_KEYS.fieldOfflineQueue, JSON.stringify(state.fieldOfflineQueue)],
    [
      CANONICAL_DEMO_STORAGE_KEYS.notificationInboxState,
      JSON.stringify(state.notificationInboxState),
    ],
    [CANONICAL_DEMO_STORAGE_KEYS.accountConnections, JSON.stringify(state.accountConnections)],
    [
      CANONICAL_DEMO_STORAGE_KEYS.selectedConsumerConnections,
      JSON.stringify(state.selectedConsumerConnections),
    ],
    [CANONICAL_DEMO_STORAGE_KEYS.billingReminderKeys, JSON.stringify(state.billingReminderKeys)],
    [CANONICAL_DEMO_STORAGE_KEYS.slaEmittedEventKeys, JSON.stringify(state.slaEmittedEventKeys)],
    [CANONICAL_DEMO_STORAGE_KEYS.dismissedModalIds, JSON.stringify(state.dismissedModalIds)],
    [CANONICAL_DEMO_STORAGE_KEYS.adminStaffUsers, JSON.stringify(state.adminRbacState.users)],
    [
      CANONICAL_DEMO_STORAGE_KEYS.adminRbacPermissions,
      JSON.stringify(state.adminRbacState.permissions),
    ],
  ];

  const midpoint = Math.floor(stagedWrites.length / 2);

  for (let i = 0; i < stagedWrites.length; i++) {
    const [key, val] = stagedWrites[i];
    storage.setItem(key, val);

    if (simulateFailureAtStep === 'AFTER_PARTIAL_STORAGE_WRITE' && i === midpoint) {
      throw new Error(
        'Simulated storage write interruption after partial key update (fault-injection test).'
      );
    }
  }
}

export function executeSafeDemoRestore(
  options: ExecuteSafeRestoreOptions
): ExecuteSafeRestoreResult {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const nowIso = options.nowIso || new Date().toISOString();
  const auth = assertAdminBackupAuthorization(options.actor);

  // 1. Enforce Admin-only authorization at the operation boundary
  if (!auth.authorized) {
    const auditRecord = recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'UNAUTHORIZED_ACCESS_BLOCKED',
        outcome: 'FAILED',
        actorId: options.actor?.id || 'anonymous',
        actorName: options.actor?.name || 'Unauthorized User',
        actorRole: options.actor?.role || 'consumer',
        summary: 'Unauthorized restore attempt blocked.',
        details: auth.denialReason || 'Non-admin role rejected.',
      },
      storage
    );
    return {
      success: false,
      authorized: false,
      status: 'BLOCKED_UNAUTHORIZED',
      rolledBackToSnapshot: false,
      recoveryVerified: false,
      preservedPendingOfflineCount: 0,
      message: auth.denialReason || 'Unauthorized role.',
      auditRecord,
    };
  }

  // 2. Enforce explicit administrator confirmation
  if (
    options.explicitConfirmation !== true ||
    (options.confirmationText !== undefined &&
      options.confirmationText.trim().toUpperCase() !== 'RESTORE')
  ) {
    const auditRecord = recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'RESTORE_BLOCKED',
        outcome: 'WARNING',
        actorId: options.actor.id,
        actorName: options.actor.name,
        actorRole: options.actor.role,
        summary: 'Restore blocked: Explicit administrator confirmation was not provided.',
        details: 'Restore requires explicitConfirmation=true (and confirmation keyword when prompted).',
      },
      storage
    );
    return {
      success: false,
      authorized: true,
      status: 'BLOCKED_CONFIRMATION_REQUIRED',
      rolledBackToSnapshot: false,
      recoveryVerified: false,
      preservedPendingOfflineCount: 0,
      message:
        'Restore aborted: Explicit administrator confirmation is required before modifying DEMO state.',
      auditRecord,
    };
  }

  // 3. Prevent concurrent mutations during critical restore section
  if (activeRestoreMutex) {
    const auditRecord = recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'RESTORE_BLOCKED',
        outcome: 'WARNING',
        actorId: options.actor.id,
        actorName: options.actor.name,
        actorRole: options.actor.role,
        summary: 'Concurrent restore operation blocked while another restore is in progress.',
        details: 'Restore mutex active.',
      },
      storage
    );
    return {
      success: false,
      authorized: true,
      status: 'BLOCKED_CONCURRENT_RESTORE',
      rolledBackToSnapshot: false,
      recoveryVerified: false,
      preservedPendingOfflineCount: 0,
      message: 'Another restore operation is already in progress. Please wait for it to finish.',
      auditRecord,
    };
  }

  activeRestoreMutex = true;

  try {
    // 4. Full validation of backup envelope, checksums, and domain relationships
    const validation = validateDemoBackup({
      actor: options.actor,
      backupInput: options.backupInput,
      recordAudit: false,
      storage,
      nowIso,
    });

    if (!validation.isValid || !validation.parsedEnvelope) {
      const errSummary = validation.issues.map((i) => i.message).join('; ');
      const auditRecord = recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'RESTORE_BLOCKED',
          outcome: 'FAILED',
          actorId: options.actor.id,
          actorName: options.actor.name,
          actorRole: options.actor.role,
          backupId: validation.backupId,
          schemaVersion: validation.schemaVersion,
          summary: 'Restore blocked: Backup failed validation.',
          details: errSummary,
        },
        storage
      );
      return {
        success: false,
        authorized: true,
        status: 'BLOCKED_INVALID_BACKUP',
        backupId: validation.backupId,
        rolledBackToSnapshot: false,
        recoveryVerified: false,
        preservedPendingOfflineCount: 0,
        message: `Restore blocked: Backup validation failed (${errSummary})`,
        errorDetails: errSummary,
        auditRecord,
      };
    }

    const targetEnvelope = validation.parsedEnvelope;
    const currentLivePayload = collectLiveDemoStatePayload(options.currentState, storage);
    const policy = options.offlineQueuePolicy || 'BLOCK_IF_PENDING';

    // 5. Offline Queue Conflict Check
    const queueConflict = analyzeOfflineQueueConflict(
      currentLivePayload.fieldOfflineQueue,
      targetEnvelope.payload.fieldOfflineQueue
    );

    if (queueConflict.hasPendingLiveActions && policy === 'BLOCK_IF_PENDING') {
      const auditRecord = recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'RESTORE_BLOCKED',
          outcome: 'WARNING',
          actorId: options.actor.id,
          actorName: options.actor.name,
          actorRole: options.actor.role,
          backupId: targetEnvelope.backupId,
          schemaVersion: targetEnvelope.schemaVersion,
          summary: `Restore blocked to protect ${queueConflict.pendingLiveCount + queueConflict.processingLiveCount} unsynchronized Field Engineer offline action(s).`,
          details: queueConflict.warningMessage,
        },
        storage
      );
      return {
        success: false,
        authorized: true,
        status: 'BLOCKED_OFFLINE_QUEUE_CONFLICT',
        backupId: targetEnvelope.backupId,
        rolledBackToSnapshot: false,
        recoveryVerified: false,
        preservedPendingOfflineCount: 0,
        message: queueConflict.warningMessage,
        auditRecord,
      };
    }

    // 6. Prepare & Verify Usable Pre-Restore Recovery Snapshot BEFORE mutating any state
    const snapshotPrep = preparePreRestoreRecoverySnapshot({
      actor: options.actor,
      targetBackupId: targetEnvelope.backupId,
      currentState: currentLivePayload,
      storage,
      nowIso,
    });

    if (!snapshotPrep.usable || !snapshotPrep.snapshot) {
      const auditRecord = recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'RESTORE_BLOCKED',
          outcome: 'FAILED',
          actorId: options.actor.id,
          actorName: options.actor.name,
          actorRole: options.actor.role,
          backupId: targetEnvelope.backupId,
          schemaVersion: targetEnvelope.schemaVersion,
          summary: 'Restore aborted: Could not verify usable pre-restore recovery snapshot.',
          details: snapshotPrep.error || 'Snapshot preparation failed.',
        },
        storage
      );
      return {
        success: false,
        authorized: true,
        status: 'BLOCKED_SNAPSHOT_UNUSABLE',
        backupId: targetEnvelope.backupId,
        rolledBackToSnapshot: false,
        recoveryVerified: false,
        preservedPendingOfflineCount: 0,
        message:
          snapshotPrep.error ||
          'Restore aborted because a usable pre-restore recovery snapshot could not be prepared.',
        auditRecord,
      };
    }

    const recoverySnapshot = snapshotPrep.snapshot;

    // 7. Execute Staged Restoration with Automatic Rollback on Any Error
    try {
      const { mergedQueue, preservedPendingCount } = reconcileRestoredOfflineQueue(
        currentLivePayload.fieldOfflineQueue,
        targetEnvelope.payload.fieldOfflineQueue,
        policy
      );

      const candidateRuntimeState = buildRestoredRuntimeStateFromPayload(
        targetEnvelope.payload,
        mergedQueue
      );

      // Write to storage (may throw if storage fails or fault injection is active)
      writeRuntimeStateToStorage(
        candidateRuntimeState,
        storage,
        options.simulateFailureAtStep
      );

      if (options.simulateFailureAtStep === 'DURING_POST_RESTORE_VALIDATION') {
        throw new Error(
          'Simulated post-restore invariant verification failure (fault-injection test).'
        );
      }

      // Verify post-restore state read-back from storage when storage is present
      if (storage) {
        const postWritePayload = collectLiveDemoStatePayload(undefined, storage);
        if (
          postWritePayload.bills.length !== candidateRuntimeState.bills.length ||
          postWritePayload.connections.length !== candidateRuntimeState.connections.length ||
          postWritePayload.payments.length !== candidateRuntimeState.payments.length
        ) {
          throw new Error(
            'Post-restore storage read-back verification failed: record counts in storage do not match restored payload.'
          );
        }
      }

      // Append restore completion to audit logs in restored state and storage
      const erpAuditEntry: AuditLogItem = {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: '15-Oct 06:45',
        actor: options.actor.name,
        role: 'System Administrator',
        action: 'DEMO_BACKUP_RESTORED',
        resource: targetEnvelope.backupId,
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        metaDetail: `Restored backup ${targetEnvelope.backupId} (Recovery Snapshot: ${recoverySnapshot.snapshotId}). Preserved pending offline items: ${preservedPendingCount}.`,
      };

      const finalRuntimeState: RestoredLiveRuntimeState = {
        ...candidateRuntimeState,
        auditLogs: [erpAuditEntry, ...candidateRuntimeState.auditLogs],
      };

      if (storage) {
        storage.setItem(
          CANONICAL_DEMO_STORAGE_KEYS.auditLogs,
          JSON.stringify(finalRuntimeState.auditLogs)
        );
      }

      // Apply to live React context state
      if (options.onApplyRestoredState) {
        options.onApplyRestoredState(finalRuntimeState);
      }

      const auditRecord = recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'RESTORE_COMPLETED',
          outcome: 'SUCCESS',
          actorId: options.actor.id,
          actorName: options.actor.name,
          actorRole: options.actor.role,
          backupId: targetEnvelope.backupId,
          schemaVersion: targetEnvelope.schemaVersion,
          summary: `Successfully restored DEMO backup ${targetEnvelope.backupId}.`,
          details: `Pre-restore snapshot ${recoverySnapshot.snapshotId} verified. Preserved ${preservedPendingCount} live pending offline action(s).`,
        },
        storage
      );

      return {
        success: true,
        authorized: true,
        status: 'RESTORED',
        backupId: targetEnvelope.backupId,
        recoverySnapshotId: recoverySnapshot.snapshotId,
        rolledBackToSnapshot: false,
        recoveryVerified: true,
        preservedPendingOfflineCount: preservedPendingCount,
        message: `Backup ${targetEnvelope.backupId} restored safely. Pre-restore recovery snapshot (${recoverySnapshot.snapshotId}) is preserved.`,
        restoredState: finalRuntimeState,
        auditRecord,
      };
    } catch (restoreErr) {
      // AUTOMATIC ROLLBACK TO PRE-RESTORE RECOVERY SNAPSHOT
      const errMessage =
        (restoreErr as Error)?.message || 'Unexpected error during restore execution.';
      let rollbackSucceeded = false;

      try {
        const snapPayload = recoverySnapshot.backupEnvelope.payload;
        const rollbackRuntimeState = buildRestoredRuntimeStateFromPayload(
          snapPayload,
          snapPayload.fieldOfflineQueue
        );
        writeRuntimeStateToStorage(rollbackRuntimeState, storage, undefined);
        if (options.onApplyRestoredState) {
          options.onApplyRestoredState(rollbackRuntimeState);
        }
        rollbackSucceeded = true;
      } catch {
        rollbackSucceeded = false;
      }

      const auditRecord = recordBackupAuditEvent(
        {
          timestamp: nowIso,
          operationType: 'RESTORE_FAILED_ROLLED_BACK',
          outcome: 'FAILED',
          actorId: options.actor.id,
          actorName: options.actor.name,
          actorRole: options.actor.role,
          backupId: targetEnvelope.backupId,
          schemaVersion: targetEnvelope.schemaVersion,
          summary: rollbackSucceeded
            ? `Restore of ${targetEnvelope.backupId} failed and was automatically rolled back to snapshot ${recoverySnapshot.snapshotId}.`
            : `Restore of ${targetEnvelope.backupId} failed and automatic rollback encountered an error.`,
          details: `Failure cause: ${errMessage}`,
        },
        storage
      );

      return {
        success: false,
        authorized: true,
        status: rollbackSucceeded ? 'FAILED_AND_ROLLED_BACK' : 'FAILED_UNRECOVERABLE',
        backupId: targetEnvelope.backupId,
        recoverySnapshotId: recoverySnapshot.snapshotId,
        rolledBackToSnapshot: rollbackSucceeded,
        recoveryVerified: rollbackSucceeded,
        preservedPendingOfflineCount: 0,
        message: rollbackSucceeded
          ? `Restore failed (${errMessage}). Automatically rolled back to pre-restore recovery snapshot ${recoverySnapshot.snapshotId} with zero data loss.`
          : `Restore failed (${errMessage}) and automatic rollback could not be verified.`,
        errorDetails: errMessage,
        auditRecord,
      };
    }
  } finally {
    activeRestoreMutex = false;
  }
}

/**
 * Allows an authorized administrator to explicitly recover the most recent
 * pre-restore recovery snapshot on demand.
 */
export function recoverFromPreRestoreSnapshot(params: {
  actor: BackupActorIdentity;
  storage?: StorageLike | null;
  onApplyRestoredState?: (restoredState: RestoredLiveRuntimeState) => void;
  nowIso?: string;
}): ExecuteSafeRestoreResult {
  const storage = params.storage === undefined ? getDefaultStorage() : params.storage;
  const nowIso = params.nowIso || new Date().toISOString();
  const auth = assertAdminBackupAuthorization(params.actor);

  if (!auth.authorized) {
    const auditRecord = recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'UNAUTHORIZED_ACCESS_BLOCKED',
        outcome: 'FAILED',
        actorId: params.actor?.id || 'anonymous',
        actorName: params.actor?.name || 'Unauthorized User',
        actorRole: params.actor?.role || 'consumer',
        summary: 'Unauthorized attempt to recover from pre-restore snapshot blocked.',
        details: auth.denialReason || 'Non-admin role rejected.',
      },
      storage
    );
    return {
      success: false,
      authorized: false,
      status: 'BLOCKED_UNAUTHORIZED',
      rolledBackToSnapshot: false,
      recoveryVerified: false,
      preservedPendingOfflineCount: 0,
      message: auth.denialReason || 'Unauthorized role.',
      auditRecord,
    };
  }

  const snapshot = getStoredPreRestoreRecoverySnapshot(storage);
  if (!snapshot || !snapshot.backupEnvelope) {
    const auditRecord = recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'RESTORE_BLOCKED',
        outcome: 'WARNING',
        actorId: params.actor.id,
        actorName: params.actor.name,
        actorRole: params.actor.role,
        summary: 'No stored pre-restore recovery snapshot found to recover.',
        details: 'PRE_RESTORE_RECOVERY_SNAPSHOT_STORAGE_KEY is empty.',
      },
      storage
    );
    return {
      success: false,
      authorized: true,
      status: 'BLOCKED_SNAPSHOT_UNUSABLE',
      rolledBackToSnapshot: false,
      recoveryVerified: false,
      preservedPendingOfflineCount: 0,
      message: 'No pre-restore recovery snapshot is currently stored in browser storage.',
      auditRecord,
    };
  }

  const res = executeSafeDemoRestore({
    actor: params.actor,
    backupInput: snapshot.backupEnvelope,
    storage,
    explicitConfirmation: true,
    confirmationText: 'RESTORE',
    offlineQueuePolicy: 'PRESERVE_LIVE_PENDING',
    onApplyRestoredState: params.onApplyRestoredState,
    nowIso,
  });

  if (res.success) {
    recordBackupAuditEvent(
      {
        timestamp: nowIso,
        operationType: 'RECOVERY_SNAPSHOT_RESTORED',
        outcome: 'SUCCESS',
        actorId: params.actor.id,
        actorName: params.actor.name,
        actorRole: params.actor.role,
        backupId: snapshot.snapshotId,
        schemaVersion: snapshot.backupEnvelope.schemaVersion,
        summary: `Recovered application state from pre-restore recovery snapshot ${snapshot.snapshotId}.`,
        details: `Originally captured at ${snapshot.capturedAt} prior to backup ${snapshot.capturedForBackupId}.`,
      },
      storage
    );
  }

  return res;
}

// ============================================================================
// 5. FOUR-LANGUAGE LOCALIZATION DICTIONARY (EN, GU, HI, MR)
// ============================================================================

export interface DemoBackupUiDictionary {
  sectionTitle: string;
  sectionSubtitle: string;
  demoScopeBadge: string;
  demoLimitationsNotice: string;
  checksumDisclosureNotice: string;
  rbacFrontendNotice: string;

  // Tabs / Sub-sections
  tabCreateBackup: string;
  tabValidateBackup: string;
  tabRestorePreview: string;
  tabExecuteRestore: string;
  tabAuditHistory: string;

  // Create Backup
  createBackupTitle: string;
  createBackupDesc: string;
  backupScopeTitle: string;
  schemaVersionLabel: string;
  formatIdLabel: string;
  totalCategoriesLabel: string;
  totalRecordsLabel: string;
  lastGeneratedAtLabel: string;
  generateBackupBtn: string;
  downloadBackupJsonBtn: string;
  includedCategoriesHeading: string;
  excludedStoresHeading: string;
  colCategoryName: string;
  colStorageKey: string;
  colClassification: string;
  colRecordCount: string;
  colChecksumPrefix: string;
  classCanonical: string;
  classDerived: string;

  // Validate Backup
  validateBackupTitle: string;
  validateBackupDesc: string;
  selectBackupFileBtn: string;
  validateLoadedSampleBtn: string;
  readOnlyValidationBadge: string;
  validationStatusValid: string;
  validationStatusInvalid: string;
  schemaCompatibleYes: string;
  schemaCompatibleNo: string;
  integrityVerifiedYes: string;
  integrityVerifiedNo: string;
  noIssuesFound: string;
  historicalNotesHeading: string;

  // Restore Preview
  restorePreviewTitle: string;
  restorePreviewDesc: string;
  canRestoreSafelyYes: string;
  canRestoreSafelyNo: string;
  diffAddedLabel: string;
  diffReplacedLabel: string;
  diffRemovedLabel: string;
  diffUnchangedLabel: string;
  offlineQueueSafetyTitle: string;
  offlinePolicyBlockLabel: string;
  offlinePolicyPreserveLabel: string;
  colCurrentCount: string;
  colBackupCount: string;
  colAdded: string;
  colReplaced: string;
  colRemoved: string;

  // Execute Restore & Recovery
  restoreSectionTitle: string;
  restoreSectionDesc: string;
  preRestoreWarningBanner: string;
  explicitConfirmCheckboxLabel: string;
  confirmKeywordPrompt: string;
  executeSafeRestoreBtn: string;
  recoverFromSnapshotBtn: string;
  recoverySnapshotAvailableLabel: string;
  noRecoverySnapshotLabel: string;

  // Audit History
  auditHistoryTitle: string;
  auditHistoryDesc: string;
  colAuditId: string;
  colAuditTimestamp: string;
  colAuditOperation: string;
  colAuditActor: string;
  colAuditOutcome: string;
  colAuditSummary: string;
  noBackupAuditRecords: string;

  // Category Names
  categoryLabels: Record<BackupCategoryKey, string>;
}

export const DEMO_BACKUP_UI_TRANSLATIONS: Record<LanguageCode, DemoBackupUiDictionary> = {
  en: {
    sectionTitle: 'DEMO Data Backup, Validation & Safe Recovery Center',
    sectionSubtitle:
      'Browser-local DEMO state snapshot export, read-only schema & checksum verification, diff preview, and transactional rollback recovery',
    demoScopeBadge: 'Browser-Local DEMO Facility',
    demoLimitationsNotice:
      'DEMO Limitation Notice: This facility backs up and restores browser-persisted DEMO state (localStorage) only. It is NOT a production database disaster-recovery system and never exports passwords, session tokens, or private keys.',
    checksumDisclosureNotice:
      'Integrity Checksum Disclosure: The deterministic 256-bit checksum detects accidental file corruption or modification, but an unkeyed checksum is NOT cryptographic authentication and does not prove who created the backup.',
    rbacFrontendNotice:
      'Authorization Notice: Admin-only role checks are enforced at the client operation boundary for DEMO governance; production deployments require server-side authorization.',

    tabCreateBackup: '1. Create & Export Backup',
    tabValidateBackup: '2. Inspect & Validate',
    tabRestorePreview: '3. Restore Impact Preview',
    tabExecuteRestore: '4. Safe Restore & Recovery',
    tabAuditHistory: '5. Backup Audit History',

    createBackupTitle: 'Create Portable DEMO Backup',
    createBackupDesc:
      'Generate a versioned, checksum-verified JSON snapshot of all 23 supported DEMO business categories and derived document/calendar manifests.',
    backupScopeTitle: 'Backup Scope & Version Envelope',
    schemaVersionLabel: 'Schema / Format Version',
    formatIdLabel: 'Format Identifier',
    totalCategoriesLabel: 'Included Categories',
    totalRecordsLabel: 'Total Backed-Up Records',
    lastGeneratedAtLabel: 'Snapshot Timestamp',
    generateBackupBtn: 'Create Fresh DEMO Backup Snapshot',
    downloadBackupJsonBtn: 'Download Portable Backup (.json)',
    includedCategoriesHeading: 'Included DEMO Data Categories & Record Counts',
    excludedStoresHeading: 'Excluded Security & Client Preference Keys (Never Exported)',
    colCategoryName: 'Data Category',
    colStorageKey: 'Persistence / Source Key',
    colClassification: 'Classification',
    colRecordCount: 'Records',
    colChecksumPrefix: 'Integrity Hash',
    classCanonical: 'Canonical Store',
    classDerived: 'Derived Verification Manifest',

    validateBackupTitle: 'Read-Only Backup Inspector & Validator',
    validateBackupDesc:
      'Select a local JSON backup file to verify schema compatibility, deterministic checksums, and referential relationships without changing live application state.',
    selectBackupFileBtn: 'Upload Local Backup JSON File',
    validateLoadedSampleBtn: 'Validate Current Generated Snapshot',
    readOnlyValidationBadge: 'Zero Live State Changes During Validation',
    validationStatusValid: 'VALIDATED — Schema & Integrity Verified',
    validationStatusInvalid: 'INVALID — Backup Rejected',
    schemaCompatibleYes: 'Compatible (v1 / 1.0.0)',
    schemaCompatibleNo: 'Incompatible Schema',
    integrityVerifiedYes: 'Checksum Verified (Unmodified)',
    integrityVerifiedNo: 'Checksum Mismatch / Corrupted',
    noIssuesFound: 'All 23 data categories, record counts, checksums, and referential links verified.',
    historicalNotesHeading: 'Preserved Historical DEMO Billing Notes (Non-Blocking)',

    restorePreviewTitle: 'Restore Impact Comparison & Offline Queue Check',
    restorePreviewDesc:
      'Compare current live DEMO state against the validated backup before making any changes.',
    canRestoreSafelyYes: 'Ready for Safe Restore (After Confirmation)',
    canRestoreSafelyNo: 'Restore Blocked by Safety Check',
    diffAddedLabel: 'Records to Add',
    diffReplacedLabel: 'Records to Replace',
    diffRemovedLabel: 'Records to Remove',
    diffUnchangedLabel: 'Unchanged Records',
    offlineQueueSafetyTitle: 'Field Engineer Offline Queue Protection',
    offlinePolicyBlockLabel: 'Strict Safety (Block restore if pending offline actions exist)',
    offlinePolicyPreserveLabel: 'Preserve & Merge Live Pending Offline Actions (Safe Idempotent Merge)',
    colCurrentCount: 'Live Count',
    colBackupCount: 'Backup Count',
    colAdded: '+ Added',
    colReplaced: '~ Replaced',
    colRemoved: '- Removed',

    restoreSectionTitle: 'Controlled Safe Restore & Pre-Restore Recovery',
    restoreSectionDesc:
      'Automatically captures and verifies a pre-restore recovery snapshot before applying changes. Automatically rolls back if any step fails.',
    preRestoreWarningBanner:
      'Warning: Restoring a backup will replace live browser DEMO records across all five portals. A verified pre-restore recovery snapshot will be saved automatically before any state change.',
    explicitConfirmCheckboxLabel:
      'I confirm that I am an authorized DEMO Administrator and understand that live DEMO records will be replaced by the validated backup.',
    confirmKeywordPrompt: 'Type RESTORE to authorize execution:',
    executeSafeRestoreBtn: 'Confirm & Execute Safe Restore',
    recoverFromSnapshotBtn: 'Recover Pre-Restore Snapshot',
    recoverySnapshotAvailableLabel: 'Verified Pre-Restore Recovery Snapshot Available:',
    noRecoverySnapshotLabel: 'No pre-restore recovery snapshot recorded in this session yet.',

    auditHistoryTitle: 'Backup, Validation & Restore Audit Trail',
    auditHistoryDesc:
      'Immutable browser-local log of all backup creation, validation, preview, restore, and rollback operations.',
    colAuditId: 'Audit ID',
    colAuditTimestamp: 'Timestamp',
    colAuditOperation: 'Operation',
    colAuditActor: 'Administrator',
    colAuditOutcome: 'Outcome',
    colAuditSummary: 'Summary & Details',
    noBackupAuditRecords: 'No backup or restore operations recorded yet.',

    categoryLabels: {
      consumers: 'Consumer Master Records',
      connections: 'Electricity Connections & Meters',
      bills: 'Electricity Bills & Tariff Slabs',
      payments: 'Payment Transactions & Ledger',
      applications: 'New Connection & Solar Applications',
      complaints: 'Consumer Complaints & SLA Ledger',
      workOrders: 'Field Work Orders & Inspections',
      employees: 'Office Employee Records & Assignments',
      fieldEngineers: 'Field Engineer Roster & Feeders',
      incidents: 'Critical Incidents & Escalations',
      notifications: 'Role-Scoped Notifications',
      auditLogs: 'System Operational Audit Logs',
      aiRecommendations: 'Human-in-the-Loop AI Governance Queue',
      fieldOfflineQueue: 'Field Engineer Offline Queue & Sync Metadata',
      notificationInboxState: 'Notification Read/Dismissed Inbox State',
      accountConnections: 'Consumer Account Connection Linkages',
      selectedConsumerConnections: 'Selected Active Consumer Connections',
      billingReminderKeys: 'Gentle Billing Reminder Suppression Keys',
      slaEmittedEventKeys: 'Proactive SLA Notification Deduplication Keys',
      dismissedModalIds: 'Dismissed Critical Alert Modal IDs',
      adminRbacState: 'Admin Staff Directory & RBAC Matrix State',
      receiptAndDocumentMetadata: 'Official Receipts, Barcodes & QR Verification Manifest',
      smartPaymentCalendar: 'Smart Payment Calendar Events & Schedules',
    },
  },

  gu: {
    sectionTitle: 'DEMO ડેટા બેકઅપ, ચકાસણી અને સુરક્ષિત પુનઃસ્થાપના કેન્દ્ર',
    sectionSubtitle:
      'બ્રાઉઝર-સ્થાનિક DEMO સ્ટેટ સ્નેપશોટ નિકાસ, રીડ-ઓન્લી સ્કીમા અને ચેકસમ ચકાસણી, તફાવત પૂર્વાવલોકન અને સુરક્ષિત રોલબેક રિકવરી',
    demoScopeBadge: 'બ્રાઉઝર-સ્થાનિક DEMO સુવિધા',
    demoLimitationsNotice:
      'DEMO મર્યાદા સૂચના: આ સુવિધા ફક્ત બ્રાઉઝરમાં સંગ્રહિત DEMO ડેટા (localStorage) નું બેકઅપ અને પુનઃસ્થાપન કરે છે. આ પ્રોડક્શન ડેટાબેઝ ડિઝાસ્ટર-રિકવરી સિસ્ટમ નથી અને તેમાં પાસવર્ડ્સ, સેશન ટોકન્સ કે ખાનગી કી સામેલ હોતી નથી.',
    checksumDisclosureNotice:
      'ચેકસમ સ્પષ્ટતા: ડિટર્મિનિસ્ટિક 256-બિટ ચેકસમ ફાઇલના આકસ્મિક બગાડ અથવા ફેરફારને શોધે છે, પરંતુ અનકીડ ચેકસમ ક્રિપ્ટોગ્રાફિક પ્રમાણીકરણ નથી અને બેકઅપ કોણે બનાવ્યું તે સાબિત કરતું નથી.',
    rbacFrontendNotice:
      'અધિકૃતતા સૂચના: DEMO ગવર્નન્સ માટે ક્લાયન્ટ ઓપરેશન સીમા પર ફક્ત-એડમિન રોલ ચકાસણી લાગુ કરવામાં આવે છે; પ્રોડક્શન સિસ્ટમમાં સર્વર-સાઇડ અધિકૃતતા ફરજિયાત છે.',

    tabCreateBackup: '1. બેકઅપ બનાવો અને નિકાસ કરો',
    tabValidateBackup: '2. બેકઅપ તપાસો અને પ્રમાણિત કરો',
    tabRestorePreview: '3. પુનઃસ્થાપના અસર પૂર્વાવલોકન',
    tabExecuteRestore: '4. સુરક્ષિત પુનઃસ્થાપના અને રિકવરી',
    tabAuditHistory: '5. બેકઅપ ઑડિટ ઇતિહાસ',

    createBackupTitle: 'પોર્ટેબલ DEMO બેકઅપ બનાવો',
    createBackupDesc:
      'તમામ 23 સમર્થિત DEMO બિઝનેસ ડેટા શ્રેણીઓ અને દસ્તાવેજ/કેલેન્ડર મેનિફેસ્ટનો ચેકસમ-ચકાસાયેલ JSON સ્નેપશોટ બનાવો.',
    backupScopeTitle: 'બેકઅપ વ્યાપ અને વર્ઝન વિગતો',
    schemaVersionLabel: 'સ્કીમા / ફોર્મેટ વર્ઝન',
    formatIdLabel: 'ફોર્મેટ ઓળખકર્તા',
    totalCategoriesLabel: 'સમાવિષ્ટ શ્રેણીઓ',
    totalRecordsLabel: 'કુલ બેકઅપ રેકોર્ડ્સ',
    lastGeneratedAtLabel: 'સ્નેપશોટ સમયનોંધ',
    generateBackupBtn: 'નવો DEMO બેકઅપ સ્નેપશોટ બનાવો',
    downloadBackupJsonBtn: 'પોર્ટેબલ બેકઅપ ડાઉનલોડ કરો (.json)',
    includedCategoriesHeading: 'સમાવિષ્ટ DEMO ડેટા શ્રેણીઓ અને રેકોર્ડ સંખ્યા',
    excludedStoresHeading: 'બાકાત સુરક્ષા અને ક્લાયન્ટ પસંદગી કી (ક્યારેય નિકાસ થતી નથી)',
    colCategoryName: 'ડેટા શ્રેણી',
    colStorageKey: 'સ્ટોરેજ / સ્ત્રોત કી',
    colClassification: 'વર્ગીકરણ',
    colRecordCount: 'રેકોર્ડ્સ',
    colChecksumPrefix: 'ઇન્ટિગ્રિટી હેશ',
    classCanonical: 'કેનોનિકલ સ્ટોર',
    classDerived: 'ડિરાઇવ્ડ ચકાસણી મેનિફેસ્ટ',

    validateBackupTitle: 'રીડ-ઓન્લી બેકઅપ નિરીક્ષક અને ચકાસણીકર્તા',
    validateBackupDesc:
      'લાઇવ એપ્લિકેશન સ્ટેટમાં કોઈ ફેરફાર કર્યા વિના સ્કીમા સુસંગતતા, ચેકસમ અને રેકોર્ડ સંબંધો ચકાસવા માટે સ્થાનિક JSON બેકઅપ ફાઇલ પસંદ કરો.',
    selectBackupFileBtn: 'સ્થાનિક બેકઅપ JSON ફાઇલ અપલોડ કરો',
    validateLoadedSampleBtn: 'વર્તમાન જનરેટ કરેલ સ્નેપશોટ ચકાસો',
    readOnlyValidationBadge: 'ચકાસણી દરમિયાન લાઇવ સ્ટેટમાં શૂન્ય ફેરફાર',
    validationStatusValid: 'માન્ય — સ્કીમા અને અખંડિતતા ચકાસાયેલ',
    validationStatusInvalid: 'અમાન્ય — બેકઅપ નકારવામાં આવ્યું',
    schemaCompatibleYes: 'સુસંગત (v1 / 1.0.0)',
    schemaCompatibleNo: 'અસુસંગત સ્કીમા',
    integrityVerifiedYes: 'ચેકસમ ચકાસાયેલ (અપરિવર્તિત)',
    integrityVerifiedNo: 'ચેકસમ વિસંગતતા / ક્ષતિગ્રસ્ત',
    noIssuesFound: 'તમામ 23 ડેટા શ્રેણીઓ, રેકોર્ડ સંખ્યા, ચેકસમ અને સંદર્ભ કડીઓ સફળતાપૂર્વક ચકાસાઈ.',
    historicalNotesHeading: 'જાળવી રાખેલ ઐતિહાસિક DEMO બિલિંગ નોંધો (બિન-અવરોધક)',

    restorePreviewTitle: 'પુનઃસ્થાપના અસર તુલના અને ઓફલાઇન કતાર ચકાસણી',
    restorePreviewDesc:
      'કોઈપણ ફેરફાર કરતા પહેલા વર્તમાન લાઇવ DEMO સ્ટેટની ચકાસાયેલ બેકઅપ સાથે તુલના કરો.',
    canRestoreSafelyYes: 'સુરક્ષિત પુનઃસ્થાપના માટે તૈયાર (પુષ્ટિ પછી)',
    canRestoreSafelyNo: 'સુરક્ષા ચકાસણી દ્વારા પુનઃસ્થાપના અવરોધિત',
    diffAddedLabel: 'ઉમેરાતા રેકોર્ડ્સ',
    diffReplacedLabel: 'બદલાતા રેકોર્ડ્સ',
    diffRemovedLabel: 'દૂર થતા રેકોર્ડ્સ',
    diffUnchangedLabel: 'અપરિવર્તિત રેકોર્ડ્સ',
    offlineQueueSafetyTitle: 'ફિલ્ડ ઇજનેર ઓફલાઇન કતાર સુરક્ષા',
    offlinePolicyBlockLabel: 'કડક સુરક્ષા (જો બાકી ઓફલાઇન કાર્ય હોય તો પુનઃસ્થાપના અટકાવો)',
    offlinePolicyPreserveLabel: 'લાઇવ બાકી ઓફલાઇન કાર્યો જાળવી રાખો અને મર્જ કરો (સુરક્ષિત મર્જ)',
    colCurrentCount: 'વર્તમાન સંખ્યા',
    colBackupCount: 'બેકઅપ સંખ્યા',
    colAdded: '+ ઉમેરાશે',
    colReplaced: '~ બદલાશે',
    colRemoved: '- દૂર થશે',

    restoreSectionTitle: 'નિયંત્રિત સુરક્ષિત પુનઃસ્થાપના અને પ્રી-રિસ્ટોર રિકવરી',
    restoreSectionDesc:
      'ફેરફારો લાગુ કરતા પહેલા આપમેળે પ્રી-રિસ્ટોર રિકવરી સ્નેપશોટ સાચવે છે અને ચકાસે છે. જો કોઈ પગલું નિષ્ફળ જાય તો આપમેળે રોલબેક થાય છે.',
    preRestoreWarningBanner:
      'ચેતવણી: બેકઅપ પુનઃસ્થાપિત કરવાથી તમામ પાંચ પોર્ટલ પરના લાઇવ બ્રાઉઝર DEMO રેકોર્ડ્સ બદલાઈ જશે. કોઈપણ ફેરફાર પહેલાં ચકાસાયેલ પ્રી-રિસ્ટોર રિકવરી સ્નેપશોટ આપમેળે સાચવવામાં આવશે.',
    explicitConfirmCheckboxLabel:
      'હું પુષ્ટિ કરું છું કે હું અધિકૃત DEMO એડમિનિસ્ટ્રેટર છું અને સમજું છું કે લાઇવ DEMO રેકોર્ડ્સ ચકાસાયેલ બેકઅપથી બદલાઈ જશે.',
    confirmKeywordPrompt: 'અમલ અધિકૃત કરવા માટે RESTORE ટાઇપ કરો:',
    executeSafeRestoreBtn: 'પુષ્ટિ કરો અને સુરક્ષિત પુનઃસ્થાપના કરો',
    recoverFromSnapshotBtn: 'પ્રી-રિસ્ટોર સ્નેપશોટ પુનઃપ્રાપ્ત કરો',
    recoverySnapshotAvailableLabel: 'ચકાસાયેલ પ્રી-રિસ્ટોર રિકવરી સ્નેપશોટ ઉપલબ્ધ છે:',
    noRecoverySnapshotLabel: 'આ સત્રમાં હજુ સુધી કોઈ પ્રી-રિસ્ટોર રિકવરી સ્નેપશોટ નોંધાયેલ નથી.',

    auditHistoryTitle: 'બેકઅપ, ચકાસણી અને પુનઃસ્થાપના ઑડિટ ટ્રેલ',
    auditHistoryDesc:
      'તમામ બેકઅપ નિર્માણ, ચકાસણી, પૂર્વાવલોકન, પુનઃસ્થાપના અને રોલબેક કામગીરીનો બ્રાઉઝર-સ્થાનિક લોગ.',
    colAuditId: 'ઑડિટ ID',
    colAuditTimestamp: 'સમયનોંધ',
    colAuditOperation: 'કામગીરી',
    colAuditActor: 'એડમિનિસ્ટ્રેટર',
    colAuditOutcome: 'પરિણામ',
    colAuditSummary: 'સારાંશ અને વિગતો',
    noBackupAuditRecords: 'હજુ સુધી કોઈ બેકઅપ અથવા પુનઃસ્થાપના કામગીરી નોંધાઈ નથી.',

    categoryLabels: {
      consumers: 'ગ્રાહક માસ્ટર રેકોર્ડ્સ',
      connections: 'વીજ જોડાણો અને મીટર્સ',
      bills: 'વીજળી બિલ અને ટેરિફ સ્લેબ',
      payments: 'ચુકવણી વ્યવહારો અને ખાતાવહી',
      applications: 'નવા જોડાણ અને સોલાર અરજીઓ',
      complaints: 'ગ્રાહક ફરિયાદો અને SLA ખાતાવહી',
      workOrders: 'ફિલ્ડ વર્ક ઓર્ડર અને નિરીક્ષણો',
      employees: 'કચેરી કર્મચારી રેકોર્ડ્સ અને સોંપણીઓ',
      fieldEngineers: 'ફિલ્ડ ઇજનેર યાદી અને ફીડર્સ',
      incidents: 'ગંભીર ઘટનાઓ અને એસ્કેલેશન',
      notifications: 'ભૂમિકા-આધારિત સૂચનાઓ',
      auditLogs: 'સિસ્ટમ ઓપરેશનલ ઑડિટ લોગ્સ',
      aiRecommendations: 'માનવ-નિયંત્રિત AI ગવર્નન્સ કતાર',
      fieldOfflineQueue: 'ફિલ્ડ ઇજનેર ઓફલાઇન કતાર અને સિંક મેટાડેટા',
      notificationInboxState: 'સૂચના રીડ/ડિસમિસ ઇનબોક્સ સ્થિતિ',
      accountConnections: 'ગ્રાહક ખાતા જોડાણ લિંક્સ',
      selectedConsumerConnections: 'પસંદ કરેલ સક્રિય ગ્રાહક જોડાણો',
      billingReminderKeys: 'બિલિંગ રિમાઇન્ડર સપ્રેશન કી',
      slaEmittedEventKeys: 'SLA સૂચના ડુપ્લિકેશન નિવારણ કી',
      dismissedModalIds: 'ડિસમિસ કરેલ ક્રિટિકલ એલર્ટ મોડલ IDs',
      adminRbacState: 'એડમિન સ્ટાફ ડિરેક્ટરી અને RBAC મેટ્રિક્સ',
      receiptAndDocumentMetadata: 'સત્તાવાર રસીદો, બારકોડ અને QR ચકાસણી મેનિફેસ્ટ',
      smartPaymentCalendar: 'સ્માર્ટ પેમેન્ટ કેલેન્ડર ઇવેન્ટ્સ અને શેડ્યૂલ',
    },
  },

  hi: {
    sectionTitle: 'DEMO डेटा बैकअप, सत्यापन एवं सुरक्षित पुनर्स्थापना केंद्र',
    sectionSubtitle:
      'ब्राउज़र-स्थानीय DEMO स्टेट स्नैपशॉट निर्यात, रीड-ओनली स्कीमा व चेकसम सत्यापन, अंतर पूर्वावलोकन और सुरक्षित रोलबैक रिकवरी',
    demoScopeBadge: 'ब्राउज़र-स्थानीय DEMO सुविधा',
    demoLimitationsNotice:
      'DEMO सीमा सूचना: यह सुविधा केवल ब्राउज़र में सहेजे गए DEMO डेटा (localStorage) का बैकअप और पुनर्स्थापना करती है। यह प्रोडक्शन डेटाबेस डिज़ास्टर-रिकवरी सिस्टम नहीं है और इसमें पासवर्ड, सेशन टोकन या निजी कुंजियाँ शामिल नहीं होती हैं।',
    checksumDisclosureNotice:
      'चेकसम प्रकटीकरण: नियतात्मक 256-बिट चेकसम फ़ाइल की आकस्मिक खराबी या छेड़छाड़ का पता लगाता है, किंतु बिना कुंजी वाला चेकसम क्रिप्टोग्राफ़िक प्रमाणीकरण नहीं है और यह सिद्ध नहीं करता कि बैकअप किसने बनाया है।',
    rbacFrontendNotice:
      'प्राधिकरण सूचना: DEMO गवर्नेंस के लिए क्लाइंट ऑपरेशन सीमा पर केवल-एडमिन रोल जांच लागू की गई है; प्रोडक्शन सिस्टम में सर्वर-साइड प्राधिकरण आवश्यक है।',

    tabCreateBackup: '1. बैकअप बनाएं और निर्यात करें',
    tabValidateBackup: '2. बैकअप जांचें और सत्यापित करें',
    tabRestorePreview: '3. पुनर्स्थापना प्रभाव पूर्वावलोकन',
    tabExecuteRestore: '4. सुरक्षित पुनर्स्थापना व रिकवरी',
    tabAuditHistory: '5. बैकअप ऑडिट इतिहास',

    createBackupTitle: 'पोर्टेबल DEMO बैकअप बनाएं',
    createBackupDesc:
      'सभी 23 समर्थित DEMO व्यावसायिक श्रेणियों और दस्तावेज़/कैलेंडर मैनिफ़ेस्ट का चेकसम-सत्यापित JSON स्नैपशॉट तैयार करें।',
    backupScopeTitle: 'बैकअप दायरा और संस्करण विवरण',
    schemaVersionLabel: 'स्कीमा / फ़ॉर्मेट संस्करण',
    formatIdLabel: 'फ़ॉर्मेट पहचानकर्ता',
    totalCategoriesLabel: 'शामिल श्रेणियाँ',
    totalRecordsLabel: 'कुल बैकअप रिकॉर्ड',
    lastGeneratedAtLabel: 'स्नैपशॉट समय',
    generateBackupBtn: 'नया DEMO बैकअप स्नैपशॉट बनाएं',
    downloadBackupJsonBtn: 'पोर्टेबल बैकअप डाउनलोड करें (.json)',
    includedCategoriesHeading: 'शामिल DEMO डेटा श्रेणियाँ और रिकॉर्ड संख्या',
    excludedStoresHeading: 'बहिष्कृत सुरक्षा और क्लाइंट प्राथमिकता कुंजियाँ (कभी निर्यात नहीं की जातीं)',
    colCategoryName: 'डेटा श्रेणी',
    colStorageKey: 'स्टोरेज / स्रोत कुंजी',
    colClassification: 'वर्गीकरण',
    colRecordCount: 'रिकॉर्ड',
    colChecksumPrefix: 'इंटीग्रिटी हैश',
    classCanonical: 'कैननिकल स्टोर',
    classDerived: 'व्युत्पन्न सत्यापन मैनिफ़ेस्ट',

    validateBackupTitle: 'रीड-ओनली बैकअप निरीक्षक और सत्यापनकर्ता',
    validateBackupDesc:
      'लाइव एप्लिकेशन स्टेट में कोई बदलाव किए बिना स्कीमा संगतता, चेकसम और रिकॉर्ड संबंधों को सत्यापित करने के लिए स्थानीय JSON बैकअप फ़ाइल चुनें।',
    selectBackupFileBtn: 'स्थानीय बैकअप JSON फ़ाइल अपलोड करें',
    validateLoadedSampleBtn: 'वर्तमान जनरेट किए गए स्नैपशॉट को सत्यापित करें',
    readOnlyValidationBadge: 'सत्यापन के दौरान लाइव स्टेट में शून्य परिवर्तन',
    validationStatusValid: 'सत्यापित — स्कीमा और अखंडता प्रमाणित',
    validationStatusInvalid: 'अमान्य — बैकअप अस्वीकृत',
    schemaCompatibleYes: 'संगत (v1 / 1.0.0)',
    schemaCompatibleNo: 'असंगत स्कीमा',
    integrityVerifiedYes: 'चेकसम सत्यापित (अपरिवर्तित)',
    integrityVerifiedNo: 'चेकसम विसंगति / क्षतिग्रस्त',
    noIssuesFound: 'सभी 23 डेटा श्रेणियाँ, रिकॉर्ड संख्या, चेकसम और संदर्भ संबंध सफलतापूर्वक सत्यापित।',
    historicalNotesHeading: 'संरक्षित ऐतिहासिक DEMO बिलिंग टिप्पणियाँ (गैर-अवरोधक)',

    restorePreviewTitle: 'पुनर्स्थापना प्रभाव तुलना और ऑफ़लाइन कतार जांच',
    restorePreviewDesc:
      'कोई भी बदलाव करने से पहले वर्तमान लाइव DEMO स्टेट की सत्यापित बैकअप से तुलना करें।',
    canRestoreSafelyYes: 'सुरक्षित पुनर्स्थापना के लिए तैयार (पुष्टि के बाद)',
    canRestoreSafelyNo: 'सुरक्षा जांच द्वारा पुनर्स्थापना अवरुद्ध',
    diffAddedLabel: 'जोड़े जाने वाले रिकॉर्ड',
    diffReplacedLabel: 'बदले जाने वाले रिकॉर्ड',
    diffRemovedLabel: 'हटाए जाने वाले रिकॉर्ड',
    diffUnchangedLabel: 'अपरिवर्तित रिकॉर्ड',
    offlineQueueSafetyTitle: 'फ़ील्ड इंजीनियर ऑफ़लाइन कतार सुरक्षा',
    offlinePolicyBlockLabel: 'सख्त सुरक्षा (यदि लंबित ऑफ़लाइन कार्य हैं तो पुनर्स्थापना रोकें)',
    offlinePolicyPreserveLabel: 'लाइव लंबित ऑफ़लाइन कार्यों को सुरक्षित रखें और मर्ज करें (सुरक्षित मर्ज)',
    colCurrentCount: 'वर्तमान संख्या',
    colBackupCount: 'बैकअप संख्या',
    colAdded: '+ जुड़ेंगे',
    colReplaced: '~ बदलेंगे',
    colRemoved: '- हटेंगे',

    restoreSectionTitle: 'नियंत्रित सुरक्षित पुनर्स्थापना और प्री-रिस्टोर रिकवरी',
    restoreSectionDesc:
      'परिवर्तन लागू करने से पहले स्वचालित रूप से प्री-रिस्टोर रिकवरी स्नैपशॉट सहेजता और सत्यापित करता है। किसी भी विफलता पर स्वतः रोलबैक करता है।',
    preRestoreWarningBanner:
      'चेतावनी: बैकअप पुनर्स्थापित करने से सभी पाँच पोर्टलों में लाइव ब्राउज़र DEMO रिकॉर्ड बदल जाएंगे। किसी भी बदलाव से पहले एक सत्यापित प्री-रिस्टोर रिकवरी स्नैपशॉट स्वतः सहेजा जाएगा।',
    explicitConfirmCheckboxLabel:
      'मैं पुष्टि करता/करती हूँ कि मैं एक अधिकृत DEMO प्रशासक हूँ और समझता/समझती हूँ कि लाइव DEMO रिकॉर्ड सत्यापित बैकअप द्वारा प्रतिस्थापित किए जाएंगे।',
    confirmKeywordPrompt: 'निष्पादन अधिकृत करने के लिए RESTORE टाइप करें:',
    executeSafeRestoreBtn: 'पुष्टि करें और सुरक्षित पुनर्स्थापना निष्पादित करें',
    recoverFromSnapshotBtn: 'प्री-रिस्टोर स्नैपशॉट पुनर्प्राप्त करें',
    recoverySnapshotAvailableLabel: 'सत्यापित प्री-रिस्टोर रिकवरी स्नैपशॉट उपलब्ध है:',
    noRecoverySnapshotLabel: 'इस सत्र में अभी तक कोई प्री-रिस्टोर रिकवरी स्नैपशॉट दर्ज नहीं किया गया है।',

    auditHistoryTitle: 'बैकअप, सत्यापन और पुनर्स्थापना ऑडिट ट्रेल',
    auditHistoryDesc:
      'सभी बैकअप निर्माण, सत्यापन, पूर्वावलोकन, पुनर्स्थापना और रोलबैक कार्यों का ब्राउज़र-स्थानीय लॉग।',
    colAuditId: 'ऑडिट ID',
    colAuditTimestamp: 'समय',
    colAuditOperation: 'कार्यवाही',
    colAuditActor: 'प्रशासक',
    colAuditOutcome: 'परिणाम',
    colAuditSummary: 'सारांश और विवरण',
    noBackupAuditRecords: 'अभी तक कोई बैकअप या पुनर्स्थापना कार्यवाही दर्ज नहीं हुई है।',

    categoryLabels: {
      consumers: 'उपभोक्ता मास्टर रिकॉर्ड',
      connections: 'विद्युत कनेक्शन और मीटर',
      bills: 'विद्युत बिल और टैरिफ स्लैब',
      payments: 'भुगतान लेनदेन और खाता बही',
      applications: 'नए कनेक्शन और सोलर आवेदन',
      complaints: 'उपभोक्ता शिकायतें और SLA खाता बही',
      workOrders: 'फ़ील्ड वर्क ऑर्डर और निरीक्षण',
      employees: 'कार्यालय कर्मचारी रिकॉर्ड और कार्यभार',
      fieldEngineers: 'फ़ील्ड इंजीनियर सूची और फ़ीडर',
      incidents: 'गंभीर घटनाएँ और एस्केलेशन',
      notifications: 'भूमिका-आधारित सूचनाएँ',
      auditLogs: 'सिस्टम परिचालन ऑडिट लॉग',
      aiRecommendations: 'मानव-नियंत्रित AI गवर्नेंस कतार',
      fieldOfflineQueue: 'फ़ील्ड इंजीनियर ऑफ़लाइन कतार और सिंक मेटाडेटा',
      notificationInboxState: 'सूचना पठित/खारिज इनबॉक्स स्थिति',
      accountConnections: 'उपभोक्ता खाता कनेक्शन लिंक',
      selectedConsumerConnections: 'चयनित सक्रिय उपभोक्ता कनेक्शन',
      billingReminderKeys: 'बिलिंग रिमाइंडर दमन कुंजियाँ',
      slaEmittedEventKeys: 'SLA सूचना डुप्लिकेशन निवारण कुंजियाँ',
      dismissedModalIds: 'खारिज क्रिटिकल अलर्ट मोडल IDs',
      adminRbacState: 'एडमिन स्टाफ निर्देशिका और RBAC मैट्रिक्स',
      receiptAndDocumentMetadata: 'आधिकारिक रसीदें, बारकोड और QR सत्यापन मैनिफ़ेस्ट',
      smartPaymentCalendar: 'स्मार्ट भुगतान कैलेंडर इवेंट और समय-सारणी',
    },
  },

  mr: {
    sectionTitle: 'DEMO डेटा बॅकअप, पडताळणी आणि सुरक्षित पुनर्संचयित केंद्र',
    sectionSubtitle:
      'ब्राउझर-स्थानिक DEMO स्टेट स्नॅपशॉट निर्यात, रीड-ओन्ली स्कीमा व चेकसम पडताळणी, फरक पूर्वावलोकन आणि सुरक्षित रोलबॅक रिकव्हरी',
    demoScopeBadge: 'ब्राउझर-स्थानिक DEMO सुविधा',
    demoLimitationsNotice:
      'DEMO मर्यादा सूचना: ही सुविधा केवळ ब्राउझरमध्ये साठवलेल्या DEMO डेटाचे (localStorage) बॅकअप आणि पुनर्संचयित करते. ही प्रोडक्शन डेटाबेस डिझास्टर-रिकव्हरी प्रणाली नाही आणि यात पासवर्ड, सेशन टोकन किंवा खाजगी की समाविष्ट नसतात.',
    checksumDisclosureNotice:
      'चेकसम प्रकटीकरण: हा 256-बिट चेकसम फाईलमधील अपघाती बिघाड किंवा बदल ओळखतो, परंतु अनकीड चेकसम हे क्रिप्टोग्राफिक प्रमाणीकरण नाही आणि बॅकअप कोणी तयार केला हे सिद्ध करत नाही.',
    rbacFrontendNotice:
      'अधिकृतता सूचना: DEMO प्रशासनासाठी क्लायंट ऑपरेशन सीमेवर केवळ-ॲडमिन भूमिका तपासणी लागू केली जाते; प्रोडक्शन प्रणालीसाठी सर्व्हर-साइड अधिकृतता आवश्यक आहे.',

    tabCreateBackup: '1. बॅकअप तयार करा आणि निर्यात करा',
    tabValidateBackup: '2. बॅकअप तपासा आणि प्रमाणित करा',
    tabRestorePreview: '3. पुनर्संचयित प्रभाव पूर्वावलोकन',
    tabExecuteRestore: '4. सुरक्षित पुनर्संचयित आणि रिकव्हरी',
    tabAuditHistory: '5. बॅकअप ऑडिट इतिहास',

    createBackupTitle: 'पोर्टेबल DEMO बॅकअप तयार करा',
    createBackupDesc:
      'सर्व 23 समर्थित DEMO व्यावसायिक श्रेणी आणि दस्तऐवज/कॅलेंडर मॅनिफेस्टचा चेकसम-पडताळणी केलेला JSON स्नॅपशॉट तयार करा.',
    backupScopeTitle: 'बॅकअप व्याप्ती आणि आवृत्ती तपशील',
    schemaVersionLabel: 'स्कीमा / फॉरमॅट आवृत्ती',
    formatIdLabel: 'फॉरमॅट आयडेंटिफायर',
    totalCategoriesLabel: 'समाविष्ट श्रेणी',
    totalRecordsLabel: 'एकूण बॅकअप नोंदी',
    lastGeneratedAtLabel: 'स्नॅपशॉट वेळ',
    generateBackupBtn: 'नवीन DEMO बॅकअप स्नॅपशॉट तयार करा',
    downloadBackupJsonBtn: 'पोर्टेबल बॅकअप डाउनलोड करा (.json)',
    includedCategoriesHeading: 'समाविष्ट DEMO डेटा श्रेणी आणि नोंदींची संख्या',
    excludedStoresHeading: 'वगळलेल्या सुरक्षा आणि क्लायंट पसंती की (कधीही निर्यात केल्या जात नाहीत)',
    colCategoryName: 'डेटा श्रेणी',
    colStorageKey: 'स्टोरेज / स्रोत की',
    colClassification: 'वर्गीकरण',
    colRecordCount: 'नोंदी',
    colChecksumPrefix: 'इंटिग्रिटी हॅश',
    classCanonical: 'कॅनॉनिकल स्टोअर',
    classDerived: 'व्युत्पन्न पडताळणी मॅनिफेस्ट',

    validateBackupTitle: 'रीड-ओन्ली बॅकअप निरीक्षक आणि पडताळणीकर्ता',
    validateBackupDesc:
      'थेट ॲप्लिकेशन स्टेटमध्ये कोणताही बदल न करता स्कीमा सुसंगतता, चेकसम आणि नोंदींचे संबंध तपासण्यासाठी स्थानिक JSON बॅकअप फाईल निवडा.',
    selectBackupFileBtn: 'स्थानिक बॅकअप JSON फाईल अपलोड करा',
    validateLoadedSampleBtn: 'सध्याचा जनरेट केलेला स्नॅपशॉट तपासा',
    readOnlyValidationBadge: 'पडताळणी दरम्यान थेट स्टेटमध्ये शून्य बदल',
    validationStatusValid: 'वैध — स्कीमा आणि अखंडता प्रमाणित',
    validationStatusInvalid: 'अवैध — बॅकअप नाकारला',
    schemaCompatibleYes: 'सुसंगत (v1 / 1.0.0)',
    schemaCompatibleNo: 'असुसंगत स्कीमा',
    integrityVerifiedYes: 'चेकसम प्रमाणित (अपरिवर्तित)',
    integrityVerifiedNo: 'चेकसम तफावत / खराब फाईल',
    noIssuesFound: 'सर्व 23 डेटा श्रेणी, नोंदींची संख्या, चेकसम आणि संदर्भ दुवे यशस्वीरित्या प्रमाणित.',
    historicalNotesHeading: 'जतन केलेल्या ऐतिहासिक DEMO बिलिंग नोंदी (अडथळा नसलेल्या)',

    restorePreviewTitle: 'पुनर्संचयित प्रभाव तुलना आणि ऑफलाईन रांग तपासणी',
    restorePreviewDesc:
      'कोणतेही बदल करण्यापूर्वी सध्याच्या थेट DEMO स्टेटची प्रमाणित बॅकअपशी तुलना करा.',
    canRestoreSafelyYes: 'सुरक्षित पुनर्संचयित करण्यासाठी तयार (पुष्टीनंतर)',
    canRestoreSafelyNo: 'सुरक्षा तपासणीद्वारे पुनर्संचयित अवरोधित',
    diffAddedLabel: 'जोडल्या जाणाऱ्या नोंदी',
    diffReplacedLabel: 'बदलल्या जाणाऱ्या नोंदी',
    diffRemovedLabel: 'काढल्या जाणाऱ्या नोंदी',
    diffUnchangedLabel: 'अपरिवर्तित नोंदी',
    offlineQueueSafetyTitle: 'फील्ड अभियंता ऑफलाईन रांग सुरक्षा',
    offlinePolicyBlockLabel: 'कडक सुरक्षा (प्रलंबित ऑफलाईन कामे असल्यास पुनर्संचयित थांबवा)',
    offlinePolicyPreserveLabel: 'थेट प्रलंबित ऑफलाईन कामे जतन करा आणि विलीन करा (सुरक्षित मर्ज)',
    colCurrentCount: 'सध्याची संख्या',
    colBackupCount: 'बॅकअप संख्या',
    colAdded: '+ जोडले जातील',
    colReplaced: '~ बदलले जातील',
    colRemoved: '- काढले जातील',

    restoreSectionTitle: 'नियंत्रित सुरक्षित पुनर्संचयित आणि प्री-रिस्टोर रिकव्हरी',
    restoreSectionDesc:
      'बदल लागू करण्यापूर्वी आपोआप प्री-रिस्टोर रिकव्हरी स्नॅपशॉट जतन आणि प्रमाणित करते. कोणताही टप्पा अयशस्वी झाल्यास आपोआप रोलबॅक करते.',
    preRestoreWarningBanner:
      'इशारा: बॅकअप पुनर्संचयित केल्याने सर्व पाच पोर्टल्सवरील थेट ब्राउझर DEMO नोंदी बदलल्या जातील. कोणत्याही बदलापूर्वी प्रमाणित प्री-रिस्टोर रिकव्हरी स्नॅपशॉट आपोआप जतन केला जाईल.',
    explicitConfirmCheckboxLabel:
      'मी पुष्टी करतो/करते की मी अधिकृत DEMO प्रशासक आहे आणि मला समजते की थेट DEMO नोंदी प्रमाणित बॅकअपद्वारे बदलल्या जातील.',
    confirmKeywordPrompt: 'अंमलबजावणी अधिकृत करण्यासाठी RESTORE टाईप करा:',
    executeSafeRestoreBtn: 'पुष्टी करा आणि सुरक्षित पुनर्संचयित करा',
    recoverFromSnapshotBtn: 'प्री-रिस्टोर स्नॅपशॉट परत मिळवा',
    recoverySnapshotAvailableLabel: 'प्रमाणित प्री-रिस्टोर रिकव्हरी स्नॅपशॉट उपलब्ध आहे:',
    noRecoverySnapshotLabel: 'या सत्रात अद्याप कोणताही प्री-रिस्टोर रिकव्हरी स्नॅपशॉट नोंदवलेला नाही.',

    auditHistoryTitle: 'बॅकअप, पडताळणी आणि पुनर्संचयित ऑडिट ट्रेल',
    auditHistoryDesc:
      'सर्व बॅकअप निर्मिती, पडताळणी, पूर्वावलोकन, पुनर्संचयित आणि रोलबॅक कृतींचा ब्राउझर-स्थानिक लॉग.',
    colAuditId: 'ऑडिट ID',
    colAuditTimestamp: 'वेळ',
    colAuditOperation: 'कृती',
    colAuditActor: 'प्रशासक',
    colAuditOutcome: 'निकाल',
    colAuditSummary: 'सारांश आणि तपशील',
    noBackupAuditRecords: 'अद्याप कोणतीही बॅकअप किंवा पुनर्संचयित कृती नोंदवलेली नाही.',

    categoryLabels: {
      consumers: 'ग्राहक मास्टर नोंदी',
      connections: 'वीज जोडण्या आणि मीटर्स',
      bills: 'वीज बिले आणि टॅरिफ स्लॅब',
      payments: 'पेमेंट व्यवहार आणि खातेवही',
      applications: 'नवीन जोडणी आणि सोलर अर्ज',
      complaints: 'ग्राहक तक्रारी आणि SLA खातेवही',
      workOrders: 'फील्ड वर्क ऑर्डर आणि तपासणी',
      employees: 'कार्यालयीन कर्मचारी नोंदी आणि कार्यभार',
      fieldEngineers: 'फील्ड अभियंता यादी आणि फीडर्स',
      incidents: 'गंभीर घटना आणि एस्केलेशन',
      notifications: 'भूमिका-आधारित सूचना',
      auditLogs: 'सिस्टम ऑपरेशनल ऑडिट लॉग्स',
      aiRecommendations: 'मानव-नियंत्रित AI गव्हर्नन्स रांग',
      fieldOfflineQueue: 'फील्ड अभियंता ऑफलाईन रांग आणि सिंक मेटाडेटा',
      notificationInboxState: 'सूचना वाचलेल्या/काढून टाकलेल्या इनबॉक्स स्थिती',
      accountConnections: 'ग्राहक खाते जोडणी दुवे',
      selectedConsumerConnections: 'निवडलेल्या सक्रिय ग्राहक जोडण्या',
      billingReminderKeys: 'बिलिंग रिमाइंडर दमन की',
      slaEmittedEventKeys: 'SLA सूचना डुप्लिकेशन प्रतिबंध की',
      dismissedModalIds: 'बंद केलेले क्रिटिकल अलर्ट मोडल IDs',
      adminRbacState: 'ॲडमिन कर्मचारी निर्देशिका आणि RBAC मॅट्रिक्स',
      receiptAndDocumentMetadata: 'अधिकृत पावत्या, बारकोड आणि QR पडताळणी मॅनिफेस्ट',
      smartPaymentCalendar: 'स्मार्ट पेमेंट कॅलेंडर इव्हेंट्स आणि वेळापत्रक',
    },
  },
};

export function getDemoBackupUiDictionary(lang: LanguageCode): DemoBackupUiDictionary {
  return DEMO_BACKUP_UI_TRANSLATIONS[lang] || DEMO_BACKUP_UI_TRANSLATIONS.en;
}
