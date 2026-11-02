import {
  UserRole,
  TariffCategory,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  ElectricityConnection,
  ElectricityBill,
  PaymentTransaction,
  CriticalIncident,
  IncidentSeverity,
  IncidentStatus,
  AIActionRecommendation,
  AuditLogItem
} from '../types';

/**
 * ============================================================================
 * UGVCL VIDYUTFLOW ERP — BACKEND REST API CONTRACTS & INTEGRATION SPECIFICATION
 * ============================================================================
 * Document Version: 5.0.0 (PS000125 Phase 5 — Persistent Backend & DB Readiness)
 * Target Backend: Enterprise Node.js / Go / Java Microservice Cluster
 * Database: PostgreSQL / Cloud SQL Relational Engine
 *
 * NOTE FOR BACKEND DEVELOPERS:
 * This specification outlines the exact API contracts, HTTP endpoints, payload
 * schemas, optimistic concurrency headers, idempotency keys, and role
 * authorizations expected by the VidyutFlow Frontend Application.
 *
 * All privileged mutations MUST enforce RBAC via the authenticated server session
 * (`HttpOnly` cookie) and write append-only audit log records to `audit_logs`.
 * ============================================================================
 */

export type OperatingDataMode = 'DEMO' | 'LIVE';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED_ROLE'
  | 'CSRF_VIOLATION'
  | 'INVALID_STATUS_TRANSITION'
  | 'RECORD_NOT_FOUND'
  | 'DUPLICATE_ENTITY'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CONFLICT_VERSION_MISMATCH'
  | 'VALIDATION_FAILED'
  | 'SLA_BREACH_RESTRICTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'REQUEST_TIMEOUT'
  | 'BACKEND_UNAVAILABLE'
  | 'INTERNAL_FAULT';

export interface VersionedEntityMeta {
  version: number;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ApiErrorCode | string;
  statusCode?: number;
  timestamp: string;
  requestId: string;
  meta?: {
    source: 'backend-live' | 'demo-adapter-simulated';
    mode?: OperatingDataMode;
    version?: number;
    serverVersion?: string;
    processingTimeMs?: number;
    retriedCount?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ApiErrorCode;
  statusCode?: number;
  details?: string[];
  timestamp: string;
  requestId: string;
}

export interface OptimisticMutationOptions {
  expectedVersion?: number;
  idempotencyKey?: string;
}

/**
 * ----------------------------------------------------------------------------
 * 1. CONSUMERS & ELECTRICITY CONNECTIONS: /api/v1/connections
 * ----------------------------------------------------------------------------
 */
export interface LinkConnectionDto {
  consumerNo: string;
}

/**
 * ----------------------------------------------------------------------------
 * 2. APPLICATIONS MODULE: /api/v1/applications
 * ----------------------------------------------------------------------------
 */
export interface SubmitApplicationDto {
  applicantName: string;
  phone: string;
  email: string;
  address: string;
  subdivision: string;
  category: TariffCategory;
  requestedLoadKw: number;
  phase: '1-Phase' | '3-Phase';
  premisesType: 'Owned' | 'Rented' | 'Government Leased';
  documentsSubmitted?: string[];
}

export interface UpdateApplicationStatusDto {
  status: NewConnectionApplication['status'];
  note?: string;
  assignedEngineer?: string;
  meterSerial?: string;
  clarificationRequested?: boolean;
  expectedVersion?: number;
}

export interface ArchiveApplicationDto {
  reason?: string;
  expectedVersion?: number;
}

/**
 * ----------------------------------------------------------------------------
 * 3. COMPLAINTS & GRIEVANCE REDRESSAL: /api/v1/complaints
 * ----------------------------------------------------------------------------
 */
export interface SubmitComplaintDto {
  consumerNo: string;
  consumerName: string;
  phone: string;
  category: ComplaintRecord['category'];
  description: string;
  priority?: ComplaintRecord['priority'];
  subdivision: string;
  feederName?: string;
}

export interface AssignComplaintDto {
  engineerName: string;
  priority?: 'Emergency' | 'High' | 'Routine';
  instructions?: string;
  expectedVersion?: number;
}

export interface UpdateComplaintStatusDto {
  status: ComplaintRecord['status'];
  remark?: string;
  resolutionRemarks?: string;
  expectedVersion?: number;
}

/**
 * ----------------------------------------------------------------------------
 * 4. FIELD OPERATIONS & WORK ORDERS: /api/v1/workorders
 * ----------------------------------------------------------------------------
 */
export interface UpdateWorkOrderStatusDto {
  status: WorkOrder['status'];
  report?: WorkOrder['inspectionReport'];
  notes?: string;
  expectedVersion?: number;
}

export interface ReportFeederFaultDto {
  feederId: string;
  faultType: string;
  remarks: string;
  severity?: IncidentSeverity;
  subdivision?: string;
}

/**
 * ----------------------------------------------------------------------------
 * 5. BILLING & PAYMENTS: /api/v1/billing
 * ----------------------------------------------------------------------------
 */
export interface ProcessBillPaymentDto {
  billNo: string;
  consumerNo: string;
  amount: number;
  paymentMethod: PaymentTransaction['paymentMethod'];
  gatewayRef?: string;
  idempotencyKey?: string;
}

/**
 * ----------------------------------------------------------------------------
 * 6. CRITICAL INCIDENTS & ESCALATION: /api/v1/incidents
 * ----------------------------------------------------------------------------
 */
export interface AcknowledgeIncidentDto {
  notes?: string;
  expectedVersion?: number;
}

export interface AssignIncidentDto {
  engineerId: string;
  engineerName: string;
  notes?: string;
  expectedVersion?: number;
}

export interface EscalateIncidentDto {
  targetRole: UserRole;
  reason: string;
  targetUserId?: string;
  targetUserName?: string;
  expectedVersion?: number;
}

export interface ResolveIncidentDto {
  resolutionNotes: string;
  expectedVersion?: number;
}

export interface AcceptAssignmentDto {
  expectedVersion?: number;
}

export interface DeclineAssignmentDto {
  reason: string;
  expectedVersion?: number;
}

export interface StartInspectionDto {
  notes?: string;
  expectedVersion?: number;
}

export interface SubmitFindingsDto {
  findings: string;
  expectedVersion?: number;
}

export interface RequestAssistanceDto {
  assistanceNotes: string;
  expectedVersion?: number;
}

export interface SubmitResolutionReportDto {
  resolutionReport: string;
  expectedVersion?: number;
}

export interface ApproveEscalationDto {
  remarks?: string;
  expectedVersion?: number;
}

export interface RejectEscalationDto {
  reason: string;
  expectedVersion?: number;
}

export interface RequestMoreInfoDto {
  question: string;
  expectedVersion?: number;
}

/**
 * ----------------------------------------------------------------------------
 * 7. HUMAN-IN-THE-LOOP AI RECOMMENDATIONS & APPROVALS: /api/v1/approvals
 * ----------------------------------------------------------------------------
 */
export type ProposeRecommendationDto = Omit<
  AIActionRecommendation,
  'id' | 'createdAt' | 'status' | 'idempotencyKey'
>;

export interface ReviewRecommendationDto {
  decision: 'APPROVED' | 'REJECTED';
  decisionRemarks: string;
  expectedVersion?: number;
}

export interface ExecuteRecommendationDto {
  idempotencyKey: string;
  expectedVersion?: number;
}

/**
 * ----------------------------------------------------------------------------
 * 8. SYSTEM AUDIT LOGS & NOTIFICATIONS: /api/v1/audit-logs, /api/v1/notifications
 * ----------------------------------------------------------------------------
 */
export interface CreateAuditEventDto {
  action: string;
  resource: string;
  metaDetail: string;
  status?: AuditLogItem['status'];
}

export interface MarkNotificationReadDto {
  notificationId?: string;
  notificationIds?: string[];
  markAll?: boolean;
}

export interface DismissNotificationsDto {
  notificationIds?: string[];
  clearAll?: boolean;
}

/**
 * ----------------------------------------------------------------------------
 * ROLE-BASED ACCESS CONTROL (RBAC) AUTHORIZATION MATRIX FOR ERP BACKEND
 * ----------------------------------------------------------------------------
 * IMPORTANT: The backend MUST derive `UserRole` exclusively from the verified
 * server-side session (`HttpOnly` cookie) and NEVER trust any client-supplied
 * role field or header.
 */
export const BACKEND_RBAC_RULES: Record<string, UserRole[]> = {
  // Consumer & Connection Read/Link Operations
  'GET /api/v1/consumers': ['employee', 'management', 'admin'],
  'GET /api/v1/connections': ['consumer', 'employee', 'field', 'management', 'admin'],
  'GET /api/v1/connections/:consumerNo': ['consumer', 'employee', 'field', 'management', 'admin'],
  'POST /api/v1/connections/link': ['consumer', 'employee', 'admin'],

  // Applications Module
  'GET /api/v1/applications': ['consumer', 'employee', 'field', 'management', 'admin'],
  'GET /api/v1/applications/:id': ['consumer', 'employee', 'field', 'management', 'admin'],
  'POST /api/v1/applications': ['consumer', 'employee', 'admin'],
  'PATCH /api/v1/applications/:id/status': ['employee', 'management', 'admin'],
  'PATCH /api/v1/applications/:id/archive': ['employee', 'management', 'admin'],
  'PATCH /api/v1/applications/:id/restore': ['employee', 'management', 'admin'],

  // Complaints Module
  'GET /api/v1/complaints': ['consumer', 'employee', 'field', 'management', 'admin'],
  'GET /api/v1/complaints/:id': ['consumer', 'employee', 'field', 'management', 'admin'],
  'POST /api/v1/complaints': ['consumer', 'employee', 'admin'],
  'POST /api/v1/complaints/:id/assign': ['employee', 'management', 'admin'],
  'PATCH /api/v1/complaints/:id/status': ['employee', 'field', 'management', 'admin'],

  // Field Operations & Work Orders
  'GET /api/v1/workorders': ['field', 'employee', 'management', 'admin'],
  'GET /api/v1/workorders/:id': ['field', 'employee', 'management', 'admin'],
  'PATCH /api/v1/workorders/:id/status': ['field', 'employee', 'admin'],
  'PATCH /api/v1/work-orders/:id/status': ['field', 'employee', 'admin'],
  'POST /api/v1/telemetry/faults': ['field', 'employee', 'management', 'admin'],
  'POST /api/v1/feeders/:id/fault-report': ['field', 'employee', 'management', 'admin'],

  // Billing & Payments
  'GET /api/v1/consumer/bills': ['consumer', 'employee', 'management', 'admin'],
  'GET /api/v1/billing/bills': ['consumer', 'employee', 'management', 'admin'],
  'GET /api/v1/billing/payments': ['consumer', 'employee', 'management', 'admin'],
  'POST /api/v1/billing/pay': ['consumer', 'employee', 'admin'],

  // Critical Incidents (Phase 2) - Strictly restricted to authorized utility staff
  'GET /api/v1/incidents': ['employee', 'field', 'management', 'admin'],
  'PATCH /api/v1/incidents/:id/acknowledge': ['employee', 'field', 'management', 'admin'],
  'POST /api/v1/incidents/:id/assign': ['employee', 'admin'],
  'POST /api/v1/incidents/:id/escalate': ['employee', 'field', 'management', 'admin'],
  'PATCH /api/v1/incidents/:id/resolve': ['employee', 'field', 'management', 'admin'],
  'POST /api/v1/incidents/:id/accept-assignment': ['field', 'admin'],
  'POST /api/v1/incidents/:id/decline-assignment': ['field', 'admin'],
  'POST /api/v1/incidents/:id/start-inspection': ['field', 'admin'],
  'POST /api/v1/incidents/:id/submit-findings': ['field', 'admin'],
  'POST /api/v1/incidents/:id/request-assistance': ['field', 'admin'],
  'POST /api/v1/incidents/:id/submit-resolution-report': ['field', 'admin'],
  'POST /api/v1/incidents/:id/approve-escalation': ['management', 'admin'],
  'POST /api/v1/incidents/:id/reject-escalation': ['management', 'admin'],
  'POST /api/v1/incidents/:id/request-more-info': ['management', 'admin'],

  // Human-in-the-Loop AI Approvals (Phase 4)
  'GET /api/v1/approvals': ['employee', 'field', 'management', 'admin'],
  'POST /api/v1/approvals': ['employee', 'field', 'management', 'admin'],
  'POST /api/v1/approvals/high-risk': ['management', 'admin'],
  'POST /api/v1/approvals/:id/review': ['employee', 'field', 'management', 'admin'],
  'POST /api/v1/approvals/:id/execute': ['employee', 'field', 'management', 'admin'],

  // Notifications
  'GET /api/v1/notifications': ['consumer', 'employee', 'field', 'management', 'admin'],
  'PATCH /api/v1/notifications/:id/read': ['consumer', 'employee', 'field', 'management', 'admin'],
  'POST /api/v1/notifications/read-batch': ['consumer', 'employee', 'field', 'management', 'admin'],
  'POST /api/v1/notifications/read-all': ['consumer', 'employee', 'field', 'management', 'admin'],
  'DELETE /api/v1/notifications/:id': ['consumer', 'employee', 'field', 'management', 'admin'],
  'POST /api/v1/notifications/delete-batch': ['consumer', 'employee', 'field', 'management', 'admin'],
  'DELETE /api/v1/notifications/clear-all': ['consumer', 'employee', 'field', 'management', 'admin'],

  // Management Executive Cockpit
  'GET /api/v1/analytics/executive': ['management', 'admin'],
  'GET /api/v1/management/operational-metrics': ['management', 'admin'],

  // System Administration & Security
  'GET /api/v1/admin/audit-logs': ['admin'],
  'POST /api/v1/admin/audit-logs': ['consumer', 'employee', 'field', 'management', 'admin'],
  'PATCH /api/v1/admin/users/:id/status': ['admin'],
  'PATCH /api/v1/admin/permissions': ['admin']
};

/**
 * Helper to check if a user role is authorized for internal critical incident viewing or actions.
 * Consumers are strictly prohibited from accessing internal operational incidents.
 */
export function isIncidentRoleAuthorized(role: UserRole): boolean {
  return role === 'employee' || role === 'field' || role === 'management' || role === 'admin';
}

export const ERP_RBAC_RULES = BACKEND_RBAC_RULES;

/**
 * Validates whether a user role is permitted to perform a given API action according to the canonical ERP RBAC matrix.
 */
export function isActionAuthorized(role: UserRole, action: string): boolean {
  const allowed = BACKEND_RBAC_RULES[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
