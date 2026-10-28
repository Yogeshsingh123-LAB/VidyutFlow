export type UserRole = 'consumer' | 'employee' | 'field' | 'management' | 'admin';

export interface RoleConfig {
  id: UserRole;
  label: string;
  badge: string;
  personaName: string;
  personaDesignation: string;
  personaAvatar: string;
  description: string;
  division: string;
  primaryFocus: string;
}

export type TariffCategory = 'Residential (RGPU)' | 'Commercial (NRGP)' | 'Industrial (LTMD)' | 'Agricultural (AG)';

export interface ElectricityConnection {
  consumerNo: string;
  connectionId: string;
  consumerName: string;
  meterNo: string;
  sanctionedLoadKw: number;
  phase: '1-Phase' | '3-Phase';
  tariffCategory: TariffCategory;
  address: string;
  subdivision: string;
  feederName: string;
  status: 'Active' | 'Disconnection Notice' | 'Suspended' | 'New Installation';
  connectedDate: string;
  lastReadingDate: string;
  currentReadingKwh: number;
  previousReadingKwh: number;
  averageMonthlyKwh: number;
  securityDeposit: number;
  accountId?: string;
  accountEmail?: string;
}

export interface ElectricityBill {
  billNo: string;
  consumerNo: string;
  billMonth: string;
  billDate: string;
  dueDate: string;
  unitsConsumed: number;
  energyCharges: number;
  fixedCharges: number;
  fuelPriceAdjustment: number;
  electricityDuty: number;
  rebateOrSubsidy: number;
  totalAmount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  paidDate?: string;
  transactionRef?: string;
  slabBreakdown: { slab: string; units: number; rate: number; amount: number }[];
  accountId?: string;
}

export interface PaymentTransaction {
  txId: string;
  consumerNo: string;
  billNo: string;
  date: string;
  amount: number;
  paymentMethod: 'UPI / BHIM' | 'Net Banking' | 'Debit Card' | 'RTGS/NEFT' | 'Bill Desk Counter';
  status: 'Successful' | 'Pending Verification' | 'Failed';
  bankReference: string;
  accountId?: string;
}

export interface NewConnectionApplication {
  id: string;
  applicantName: string;
  phone: string;
  email: string;
  address: string;
  subdivision: string;
  category: TariffCategory;
  requestedLoadKw: number;
  phase: '1-Phase' | '3-Phase';
  premisesType: 'Owned' | 'Rented' | 'Government Leased';
  status: 'Submitted' | 'Document Verification' | 'Site Inspection' | 'Sanction Approval' | 'Meter Installed' | 'Rejected';
  appliedDate: string;
  targetCompletionDate: string;
  assignedOfficer: string;
  assignedEngineer?: string;
  estimatedSanctionCost: number;
  documentsSubmitted: string[];
  workflowStep: number; // 1 to 5
  notesHistory: { timestamp: string; author: string; note: string }[];
  accountId?: string;
  assignedWorkOrderId?: string;
  clarificationRequested?: boolean;
  clarificationNote?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
}

export interface ComplaintRecord {
  id: string;
  consumerNo: string;
  consumerName: string;
  phone: string;
  category: 'Power Outage' | 'Voltage Fluctuation' | 'Meter Fault' | 'Billing Dispute' | 'Sparking / Hazardous Wire' | 'Streetlight Failure';
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Registered' | 'In Review' | 'Dispatched' | 'In Progress' | 'Resolved' | 'Closed';
  subdivision: string;
  feederName: string;
  filedAt: string;
  slaTargetHours: number;
  slaDueTime: string;
  slaBreached: boolean;
  assignedTechnician?: string;
  assignedWorkOrderId?: string;
  resolutionRemarks?: string;
  resolvedAt?: string;
  timeline: { time: string; stage: string; actor: string; remark: string }[];
  accountId?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  type: 'New Connection Verification' | 'Meter Replacement' | 'Feeder Patrol & Maintenance' | 'Transformer Overload Inspection' | 'Disconnection Order';
  subdivision: string;
  feederName: string;
  location: string;
  gpsCoordinates: { lat: number; lng: number };
  consumerNo?: string;
  consumerName?: string;
  priority: 'Emergency' | 'High' | 'Routine';
  scheduledDate: string;
  status: 'Pending' | 'En Route' | 'On Site' | 'Completed' | 'Deferred';
  assignedTo: string;
  materialsNeeded: string[];
  complaintId?: string;
  applicationId?: string;
  actionHistory?: { timestamp: string; stage: string; actor: string; notes?: string }[];
  inspectionReport?: {
    meterSerialScanned: string;
    readingKwh: number;
    sealIntact: boolean;
    terminalCondition: 'Normal' | 'Burnt' | 'Loose';
    tamperDetected: boolean;
    testedPhaseVoltage: { r: number; y: number; b: number };
    technicianRemarks: string;
    photoUploaded: boolean;
  };
}

export interface FeederHealth {
  id: string;
  name: string;
  subdivision: string;
  voltageKv: number;
  peakLoadAmps: number;
  ratedCapacityAmps: number;
  utilizationPct: number;
  status: 'Optimal' | 'Warning' | 'Critical Overload';
  transformersCount: number;
  consumersConnected: number;
  trippingEventsPast30d: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  metaDetail: string;
}

export interface SystemServiceStatus {
  name: string;
  category: 'Core ERP' | 'Metering & AMR' | 'Billing & Rev' | 'Citizen Portals' | 'Security';
  status: 'Operational' | 'Degraded' | 'Maintenance' | 'Down';
  latencyMs: number;
  uptime90d: number;
  lastIncident: string;
}

export type ApplicationNotificationEventType =
  | 'APPLICATION_SUBMITTED'
  | 'DOCUMENTS_AWAITING_REVIEW'
  | 'SITE_INSPECTION_SCHEDULED'
  | 'INSPECTION_COMPLETED'
  | 'SANCTION_APPROVAL_REQUIRED'
  | 'AWAITING_FINAL_APPROVAL'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'CLARIFICATION_REQUESTED';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  targetRole: UserRole | 'all';
  type: 'info' | 'alert' | 'success' | 'warning';
  read: boolean;
  category: 'Billing' | 'Outage' | 'Approval' | 'Inspection' | 'Security';
  actionUrl?: string;
  applicationId?: string;
  complaintId?: string;
  workOrderId?: string;
  subdivision?: string;
  accountId?: string;
  consumerNo?: string;
  targetConsumerNo?: string;
  targetConsumerAccountId?: string;
  applicationStatus?: NewConnectionApplication['status'] | 'Clarification Requested';
  statusBadge?: string;
  relatedEntityType?: 'application' | 'complaint' | 'work_order' | 'bill' | 'incident' | string;
  relatedEntityId?: string;
  eventType?: ApplicationNotificationEventType;
  eventKey?: string;
  incidentId?: string;
  targetUserId?: string;
  notificationType?: IncidentEventType | string;
  decisionAction?: string;
  decisionReason?: string;
  actorName?: string;
  actorUserId?: string;
  actorRole?: UserRole;
  role?: UserRole;
  createdAt?: string;
  formattedTimestamp?: string;
}

export interface ConsumerProfile {
  consumerNo: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  subdivision: string;
  aadhaarMasked?: string;
  panMasked?: string;
  totalConnections: number;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  designation: string;
  department: string;
  subdivision: string;
  email: string;
  phone: string;
  activeCases: number;
}

export interface FieldEngineerRecord {
  id: string;
  name: string;
  designation: string;
  assignedFeeder: string;
  subdivision: string;
  phone: string;
  status: 'Available' | 'On Site' | 'Offline';
  activeWorkOrders: number;
  completedToday: number;
}

export type IncidentSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type IncidentStatus =
  | 'DETECTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'ESCALATED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentApprovalDecision =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'MORE_INFO_REQUIRED';

export type IncidentEventType =
  | 'DETECTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_DECLINED'
  | 'INSPECTION_STARTED'
  | 'FINDINGS_SUBMITTED'
  | 'ESCALATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'MORE_INFO_REQUESTED'
  | 'ASSISTANCE_REQUESTED'
  | 'RESOLUTION_SUBMITTED'
  | 'RESOLVED'
  | 'CLOSED';

export type EmergencyHazardClassification =
  | 'ELECTROCUTION_RISK'
  | 'FIRE_HAZARD'
  | 'CONDUCTOR_SNAP'
  | 'SUBSTATION_EXPLOSION'
  | 'LIFE_THREATENING_HAZARD'
  | 'NONE';

export type IncidentModule =
  | 'Distribution & SCADA'
  | 'Metering & SLA'
  | 'Billing & Revenue'
  | 'Field Operations'
  | 'Security & Access';

export interface IncidentLifecycleEvent {
  id?: string;
  incidentId?: string;
  timestamp: string;
  stage: IncidentStatus | IncidentEventType;
  eventType?: IncidentEventType;
  actor: string;
  actorUserId?: string;
  actorRole?: UserRole;
  recipient?: string;
  targetUserId?: string;
  targetRole?: UserRole;
  previousEngineerId?: string;
  previousEngineerName?: string;
  newEngineerId?: string;
  newEngineerName?: string;
  notes?: string;
  remarks?: string;
  reason?: string;
  previousStatus?: IncidentStatus;
  newStatus?: IncidentStatus;
  approvalStatus?: IncidentApprovalDecision;
}

export interface CriticalIncident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  module: IncidentModule;
  entityId: string;
  entityType: 'feeder' | 'transformer' | 'complaint' | 'work_order' | 'billing' | 'security' | 'service';
  timestamp: string;
  responsibleRoles: UserRole[];
  recommendedAction: string;
  status: IncidentStatus;
  subdivision?: string;
  // Field engineer assignment fields
  assignmentStatus?: 'UNASSIGNED' | 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedToUserId?: string;
  assignedEngineerName?: string;
  assignedAt?: string;
  assignedBy?: string;
  assignmentNotes?: string;
  previousEngineerId?: string;
  previousEngineerName?: string;
  lastDeclinedByUserId?: string;
  lastDeclinedByName?: string;
  lastDeclinedReason?: string;
  lastDeclinedAt?: string;
  // Management escalation fields
  escalatedTo?: UserRole | string;
  escalatedToUserId?: string;
  escalatedToUserName?: string;
  escalatedAt?: string;
  escalatedBy?: string;
  escalatedReason?: string;
  // Separate Approval Governance (Fix 6)
  approvalStatus?: IncidentApprovalDecision;
  approvalDecisionBy?: string;
  approvalDecisionByUserId?: string;
  approvalDecisionAt?: string;
  approvalDecisionReason?: string;
  approvalDecisionRemarks?: string;
  // Inspection & Field resolution progress
  inspectionStartedAt?: string;
  inspectionFindings?: string;
  assistanceRequestedNotes?: string;
  resolutionReport?: string;
  resolutionReportSubmittedAt?: string;
  // Originating staff linkage
  originatingEmployeeName?: string;
  originatingEmployeeUserId?: string;
  // Emergency safety override fields
  isEmergencyOverride?: boolean;
  emergencyClassification?: EmergencyHazardClassification;
  hazardClassification?: EmergencyHazardClassification | string;
  hazardDetails?: string;
  emergencyBroadcastAt?: string;
  // Decline status flag
  isDeclined?: boolean;
  // Resolution fields
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  history: IncidentLifecycleEvent[];
  isSimulated?: boolean;
  actionTab?: string;
}

// ============================================================================
// PHASE 4: HUMAN-IN-THE-LOOP AI RECOMMENDATION & APPROVAL GOVERNANCE TYPES
// ============================================================================

export type RecommendationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendationStatus =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED';

export type RecommendationActionType =
  | 'APPROVE_CONNECTION_APPLICATION'
  | 'DISPATCH_INSPECTION_WORK_ORDER'
  | 'ASSIGN_COMPLAINT_TO_FIELD'
  | 'ESCALATE_CRITICAL_INCIDENT'
  | 'RESOLVE_SLA_COMPLAINT'
  | 'APPROVE_HIGH_RISK_SANCTION'
  | 'REVOKE_SUSPICIOUS_SESSION';

export interface AIActionRecommendation {
  id: string;
  agentRole: UserRole;
  agentPersonaName: string;
  proposedAction: RecommendationActionType;
  title: string;
  description: string;
  affectedRecord: {
    type: 'application' | 'complaint' | 'workorder' | 'incident' | 'security';
    id: string;
    label: string;
    currentStatus: string;
  };
  reasoningSummary: string;
  supportingRecordReferences: string[];
  riskLevel: RecommendationRiskLevel;
  requiredApprovingRole: UserRole;
  createdAt: string;
  status: RecommendationStatus;
  previousValue: string;
  proposedValue: string;
  proposedPatch?: {
    targetStatus?: string;
    notes?: string;
    remarks?: string;
    assignedTo?: string;
    priority?: string;
    [key: string]: any;
  };
  // Human Review & Decision Audit Trail
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerRole?: UserRole;
  decisionRemarks?: string;
  // Execution State & Idempotency Key
  executionResult?: {
    success: boolean;
    executedAt: string;
    message: string;
  };
  idempotencyKey: string;
}

export type { ActiveUserIdentity } from '../utils/avatarUtils';
