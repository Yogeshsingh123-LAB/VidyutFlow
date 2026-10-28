import {
  UserRole,
  ConsumerProfile,
  ElectricityConnection,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  ElectricityBill,
  PaymentTransaction,
  CriticalIncident,
  AIActionRecommendation,
  AuditLogItem,
  AppNotification
} from '../types';
import {
  ApiResponse,
  OperatingDataMode,
  OptimisticMutationOptions,
  SubmitApplicationDto,
  UpdateApplicationStatusDto,
  SubmitComplaintDto,
  AssignComplaintDto,
  UpdateComplaintStatusDto,
  UpdateWorkOrderStatusDto,
  ReportFeederFaultDto,
  ProcessBillPaymentDto,
  AcknowledgeIncidentDto,
  AssignIncidentDto,
  EscalateIncidentDto,
  ResolveIncidentDto,
  AcceptAssignmentDto,
  DeclineAssignmentDto,
  StartInspectionDto,
  SubmitFindingsDto,
  RequestAssistanceDto,
  SubmitResolutionReportDto,
  ApproveEscalationDto,
  RejectEscalationDto,
  RequestMoreInfoDto,
  ProposeRecommendationDto,
  ReviewRecommendationDto,
  ExecuteRecommendationDto,
  CreateAuditEventDto,
  ArchiveApplicationDto
} from './erpApiContracts';
import {
  isActionAuthorized,
  isValidApplicationTransition,
  isValidComplaintTransition,
  isValidWorkOrderTransition,
  canArchiveApplication
} from './erpAdapter';
import {
  validateApprovalPermission,
  validateCurrentRecordState
} from '../utils/aiRecommendationEngine';
import { ErpApiClient, generateRequestId } from './apiClient';
import {
  INITIAL_CONSUMERS,
  INITIAL_CONNECTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS
} from '../data/mockData';

/**
 * ============================================================================
 * VIDYUTFLOW DATABASE-READY REPOSITORY INTERFACES & ADAPTERS (Phase 5)
 * ============================================================================
 * Defines 9 repository interfaces covering all UGVCL ERP domain aggregates:
 * 1. Consumers & Electricity Connections (`IConsumerConnectionRepository`)
 * 2. New Connection Applications (`IApplicationRepository`)
 * 3. Consumer Complaints & Grievances (`IComplaintRepository`)
 * 4. Field Work Orders & Feeder Faults (`IWorkOrderRepository`)
 * 5. Bills & Payment Ledgers (`IBillingPaymentRepository`)
 * 6. Critical Incidents & Escalations (`IIncidentRepository`)
 * 7. AI Action Recommendations & Approvals (`IRecommendationApprovalRepository`)
 * 8. System Audit Trail (`IAuditLogRepository`)
 * 9. Portal Notifications (`INotificationRepository`)
 *
 * Provides two explicitly separated implementations:
 * - `LiveErpRepositoryBundle`: Executes authenticated HTTP requests via `ErpApiClient`
 *   to `/api/v1/*` endpoints. Never falls back to simulated data if backend fails.
 * - `DemoErpRepositoryBundle`: Explicitly labeled `[DEMO SIMULATION]` adapter with
 *   in-memory/browser state, optimistic concurrency (`expectedVersion`), idempotency
 *   deduplication (`idempotencyKey`), and full cross-portal synchronization.
 * ============================================================================
 */

export interface IConsumerConnectionRepository {
  getConsumers(callerRole: UserRole): Promise<ApiResponse<ConsumerProfile[]>>;
  getConnections(callerRole: UserRole, consumerNoFilter?: string): Promise<ApiResponse<ElectricityConnection[]>>;
  getConnectionByNumber(callerRole: UserRole, consumerNo: string): Promise<ApiResponse<ElectricityConnection>>;
  linkConnection(callerRole: UserRole, consumerNo: string, options?: OptimisticMutationOptions): Promise<ApiResponse<ElectricityConnection>>;
}

export interface IApplicationRepository {
  getApplications(callerRole: UserRole): Promise<ApiResponse<NewConnectionApplication[]>>;
  getApplicationById(callerRole: UserRole, id: string): Promise<ApiResponse<NewConnectionApplication>>;
  submitApplication(callerRole: UserRole, dto: SubmitApplicationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<NewConnectionApplication>>;
  updateApplicationStatus(callerRole: UserRole, id: string, dto: UpdateApplicationStatusDto, options?: OptimisticMutationOptions): Promise<ApiResponse<NewConnectionApplication>>;
  archiveApplication(callerRole: UserRole, id: string, dto?: ArchiveApplicationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<NewConnectionApplication>>;
  restoreApplication(callerRole: UserRole, id: string, options?: OptimisticMutationOptions): Promise<ApiResponse<NewConnectionApplication>>;
}

export interface IComplaintRepository {
  getComplaints(callerRole: UserRole): Promise<ApiResponse<ComplaintRecord[]>>;
  getComplaintById(callerRole: UserRole, id: string): Promise<ApiResponse<ComplaintRecord>>;
  submitComplaint(callerRole: UserRole, dto: SubmitComplaintDto, options?: OptimisticMutationOptions): Promise<ApiResponse<ComplaintRecord>>;
  assignComplaintToField(callerRole: UserRole, id: string, dto: AssignComplaintDto, options?: OptimisticMutationOptions): Promise<ApiResponse<{ complaint: ComplaintRecord; workOrder: WorkOrder }>>;
  updateComplaintStatus(callerRole: UserRole, id: string, dto: UpdateComplaintStatusDto, options?: OptimisticMutationOptions): Promise<ApiResponse<ComplaintRecord>>;
}

export interface IWorkOrderRepository {
  getWorkOrders(callerRole: UserRole): Promise<ApiResponse<WorkOrder[]>>;
  getWorkOrderById(callerRole: UserRole, id: string): Promise<ApiResponse<WorkOrder>>;
  updateWorkOrderStatus(callerRole: UserRole, id: string, dto: UpdateWorkOrderStatusDto, options?: OptimisticMutationOptions): Promise<ApiResponse<{ workOrder: WorkOrder; syncedApplication?: NewConnectionApplication; syncedComplaint?: ComplaintRecord }>>;
  reportFeederFault(callerRole: UserRole, dto: ReportFeederFaultDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
}

export interface IBillingPaymentRepository {
  getBills(callerRole: UserRole): Promise<ApiResponse<ElectricityBill[]>>;
  getPayments(callerRole: UserRole): Promise<ApiResponse<PaymentTransaction[]>>;
  payBill(callerRole: UserRole, dto: ProcessBillPaymentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<{ bill: ElectricityBill; payment: PaymentTransaction }>>;
}

export interface IIncidentRepository {
  getIncidents(callerRole: UserRole): Promise<ApiResponse<CriticalIncident[]>>;
  acknowledgeIncident(callerRole: UserRole, id: string, dto: AcknowledgeIncidentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  assignIncident(callerRole: UserRole, id: string, dto: AssignIncidentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  escalateIncident(callerRole: UserRole, id: string, dto: EscalateIncidentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  resolveIncident(callerRole: UserRole, id: string, dto: ResolveIncidentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  acceptAssignment(callerRole: UserRole, id: string, dto?: AcceptAssignmentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  declineAssignment(callerRole: UserRole, id: string, dto: DeclineAssignmentDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  startInspection(callerRole: UserRole, id: string, dto?: StartInspectionDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  submitFindings(callerRole: UserRole, id: string, dto: SubmitFindingsDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  requestAssistance(callerRole: UserRole, id: string, dto: RequestAssistanceDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  submitResolutionReport(callerRole: UserRole, id: string, dto: SubmitResolutionReportDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  approveEscalation(callerRole: UserRole, id: string, dto?: ApproveEscalationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  rejectEscalation(callerRole: UserRole, id: string, dto: RejectEscalationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
  requestMoreInfo(callerRole: UserRole, id: string, dto: RequestMoreInfoDto, options?: OptimisticMutationOptions): Promise<ApiResponse<CriticalIncident>>;
}

export interface IRecommendationApprovalRepository {
  getRecommendations(callerRole: UserRole): Promise<ApiResponse<AIActionRecommendation[]>>;
  proposeRecommendation(callerRole: UserRole, dto: ProposeRecommendationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<AIActionRecommendation>>;
  reviewRecommendation(callerRole: UserRole, id: string, dto: ReviewRecommendationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<AIActionRecommendation>>;
  executeRecommendation(callerRole: UserRole, id: string, dto: ExecuteRecommendationDto, options?: OptimisticMutationOptions): Promise<ApiResponse<AIActionRecommendation>>;
}

export interface IAuditLogRepository {
  getAuditLogs(callerRole: UserRole): Promise<ApiResponse<AuditLogItem[]>>;
  recordAuditEvent(callerRole: UserRole, dto: CreateAuditEventDto): Promise<ApiResponse<AuditLogItem>>;
}

export interface INotificationRepository {
  getNotifications(callerRole: UserRole): Promise<ApiResponse<AppNotification[]>>;
  markNotificationRead(callerRole: UserRole, id: string): Promise<ApiResponse<AppNotification>>;
  markNotificationsReadBatch(callerRole: UserRole, notificationIds: string[]): Promise<ApiResponse<{ updatedCount: number }>>;
  markAllNotificationsRead(callerRole: UserRole): Promise<ApiResponse<{ updatedCount: number }>>;
  deleteNotification(callerRole: UserRole, id: string): Promise<ApiResponse<{ deletedId: string }>>;
  deleteNotificationsBatch(callerRole: UserRole, notificationIds: string[]): Promise<ApiResponse<{ deletedCount: number }>>;
  clearAllNotifications(callerRole: UserRole): Promise<ApiResponse<{ clearedCount: number }>>;
}

export interface ErpRepositoryBundle {
  readonly mode: OperatingDataMode;
  readonly consumersConnections: IConsumerConnectionRepository;
  readonly applications: IApplicationRepository;
  readonly complaints: IComplaintRepository;
  readonly workOrders: IWorkOrderRepository;
  readonly billingPayments: IBillingPaymentRepository;
  readonly incidents: IIncidentRepository;
  readonly approvals: IRecommendationApprovalRepository;
  readonly auditLogs: IAuditLogRepository;
  readonly notifications: INotificationRepository;
  getRecordVersion(entityKey: string): number;
}

function buildUnauthorizedResponse<T>(
  callerRole: UserRole,
  endpoint: string,
  mode: OperatingDataMode
): ApiResponse<T> {
  return {
    success: false,
    error: `Role "${callerRole}" is not authorized to invoke "${endpoint}".`,
    code: 'UNAUTHORIZED_ROLE',
    statusCode: 403,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    meta: {
      source: mode === 'LIVE' ? 'backend-live' : 'demo-adapter-simulated',
      mode
    }
  };
}

/**
 * ============================================================================
 * 1. LIVE BACKEND API REPOSITORY IMPLEMENTATION (Database-Backed REST Client)
 * ============================================================================
 * Executes requests against `/api/v1/*` via `ErpApiClient`.
 * Never falls back to simulated demo records when an endpoint fails.
 */
export class LiveErpRepositoryBundle implements ErpRepositoryBundle {
  public readonly mode: OperatingDataMode = 'LIVE';
  private readonly client: ErpApiClient;
  private readonly versions = new Map<string, number>();

  constructor(client: ErpApiClient) {
    this.client = client;
    this.client.setMode('LIVE');
  }

  public getRecordVersion(entityKey: string): number {
    return this.versions.get(entityKey) ?? 1;
  }

  public readonly consumersConnections: IConsumerConnectionRepository = {
    getConsumers: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/consumers')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/consumers', 'LIVE');
      }
      return this.client.get<ConsumerProfile[]>('/api/v1/consumers');
    },
    getConnections: async (callerRole, consumerNoFilter) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/connections')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/connections', 'LIVE');
      }
      const query = consumerNoFilter ? `?consumerNo=${encodeURIComponent(consumerNoFilter)}` : '';
      return this.client.get<ElectricityConnection[]>(`/api/v1/connections${query}`);
    },
    getConnectionByNumber: async (callerRole, consumerNo) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/connections/:consumerNo')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/connections/:consumerNo', 'LIVE');
      }
      return this.client.get<ElectricityConnection>(`/api/v1/connections/${encodeURIComponent(consumerNo)}`);
    },
    linkConnection: async (callerRole, consumerNo, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/connections/link')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/connections/link', 'LIVE');
      }
      return this.client.post<ElectricityConnection>(
        '/api/v1/connections/link',
        { consumerNo },
        { idempotencyKey: options?.idempotencyKey, expectedVersion: options?.expectedVersion }
      );
    }
  };

  public readonly applications: IApplicationRepository = {
    getApplications: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/applications')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/applications', 'LIVE');
      }
      return this.client.get<NewConnectionApplication[]>('/api/v1/applications');
    },
    getApplicationById: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/applications/:id')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/applications/:id', 'LIVE');
      }
      return this.client.get<NewConnectionApplication>(`/api/v1/applications/${encodeURIComponent(id)}`);
    },
    submitApplication: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/applications')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/applications', 'LIVE');
      }
      return this.client.post<NewConnectionApplication>('/api/v1/applications', dto, {
        idempotencyKey: options?.idempotencyKey,
        expectedVersion: options?.expectedVersion
      });
    },
    updateApplicationStatus: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/status')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/applications/:id/status', 'LIVE');
      }
      return this.client.patch<NewConnectionApplication>(
        `/api/v1/applications/${encodeURIComponent(id)}/status`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    archiveApplication: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/archive')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/applications/:id/archive', 'LIVE');
      }
      return this.client.patch<NewConnectionApplication>(
        `/api/v1/applications/${encodeURIComponent(id)}/archive`,
        dto || {},
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto?.expectedVersion
        }
      );
    },
    restoreApplication: async (callerRole, id, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/restore')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/applications/:id/restore', 'LIVE');
      }
      return this.client.patch<NewConnectionApplication>(
        `/api/v1/applications/${encodeURIComponent(id)}/restore`,
        {},
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion
        }
      );
    }
  };

  public readonly complaints: IComplaintRepository = {
    getComplaints: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/complaints')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/complaints', 'LIVE');
      }
      return this.client.get<ComplaintRecord[]>('/api/v1/complaints');
    },
    getComplaintById: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/complaints/:id')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/complaints/:id', 'LIVE');
      }
      return this.client.get<ComplaintRecord>(`/api/v1/complaints/${encodeURIComponent(id)}`);
    },
    submitComplaint: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/complaints')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/complaints', 'LIVE');
      }
      return this.client.post<ComplaintRecord>('/api/v1/complaints', dto, {
        idempotencyKey: options?.idempotencyKey,
        expectedVersion: options?.expectedVersion
      });
    },
    assignComplaintToField: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/complaints/:id/assign')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/complaints/:id/assign', 'LIVE');
      }
      return this.client.post<{ complaint: ComplaintRecord; workOrder: WorkOrder }>(
        `/api/v1/complaints/${encodeURIComponent(id)}/assign`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    updateComplaintStatus: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/complaints/:id/status')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/complaints/:id/status', 'LIVE');
      }
      return this.client.patch<ComplaintRecord>(
        `/api/v1/complaints/${encodeURIComponent(id)}/status`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    }
  };

  public readonly workOrders: IWorkOrderRepository = {
    getWorkOrders: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/workorders')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/workorders', 'LIVE');
      }
      return this.client.get<WorkOrder[]>('/api/v1/workorders');
    },
    getWorkOrderById: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/workorders/:id')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/workorders/:id', 'LIVE');
      }
      return this.client.get<WorkOrder>(`/api/v1/workorders/${encodeURIComponent(id)}`);
    },
    updateWorkOrderStatus: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/workorders/:id/status')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/workorders/:id/status', 'LIVE');
      }
      return this.client.patch<{
        workOrder: WorkOrder;
        syncedApplication?: NewConnectionApplication;
        syncedComplaint?: ComplaintRecord;
      }>(`/api/v1/workorders/${encodeURIComponent(id)}/status`, dto, {
        idempotencyKey: options?.idempotencyKey,
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion
      });
    },
    reportFeederFault: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/telemetry/faults')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/telemetry/faults', 'LIVE');
      }
      return this.client.post<CriticalIncident>('/api/v1/telemetry/faults', dto, {
        idempotencyKey: options?.idempotencyKey
      });
    }
  };

  public readonly billingPayments: IBillingPaymentRepository = {
    getBills: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/billing/bills')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/billing/bills', 'LIVE');
      }
      return this.client.get<ElectricityBill[]>('/api/v1/billing/bills');
    },
    getPayments: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/billing/payments')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/billing/payments', 'LIVE');
      }
      return this.client.get<PaymentTransaction[]>('/api/v1/billing/payments');
    },
    payBill: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/billing/pay')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/billing/pay', 'LIVE');
      }
      return this.client.post<{ bill: ElectricityBill; payment: PaymentTransaction }>(
        '/api/v1/billing/pay',
        dto,
        {
          idempotencyKey: options?.idempotencyKey ?? dto.idempotencyKey,
          expectedVersion: options?.expectedVersion
        }
      );
    }
  };

  public readonly incidents: IIncidentRepository = {
    getIncidents: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/incidents')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/incidents', 'LIVE');
      }
      return this.client.get<CriticalIncident[]>('/api/v1/incidents');
    },
    acknowledgeIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/incidents/:id/acknowledge')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/incidents/:id/acknowledge', 'LIVE');
      }
      return this.client.patch<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/acknowledge`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    assignIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/assign')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/assign', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/assign`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    escalateIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/escalate')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/escalate', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/escalate`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    resolveIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/incidents/:id/resolve')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/incidents/:id/resolve', 'LIVE');
      }
      return this.client.patch<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/resolve`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    acceptAssignment: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/accept-assignment')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/accept-assignment', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/accept-assignment`,
        dto || {},
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto?.expectedVersion
        }
      );
    },
    declineAssignment: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/decline-assignment')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/decline-assignment', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/decline-assignment`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    startInspection: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/start-inspection')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/start-inspection', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/start-inspection`,
        dto || {},
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto?.expectedVersion
        }
      );
    },
    submitFindings: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/submit-findings')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/submit-findings', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/submit-findings`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    requestAssistance: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/request-assistance')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/request-assistance', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/request-assistance`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    submitResolutionReport: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/submit-resolution-report')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/submit-resolution-report', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/submit-resolution-report`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    approveEscalation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/approve-escalation')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/approve-escalation', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/approve-escalation`,
        dto || {},
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto?.expectedVersion
        }
      );
    },
    rejectEscalation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/reject-escalation')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/reject-escalation', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/reject-escalation`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    requestMoreInfo: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/request-more-info')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/request-more-info', 'LIVE');
      }
      return this.client.post<CriticalIncident>(
        `/api/v1/incidents/${encodeURIComponent(id)}/request-more-info`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    }
  };

  public readonly approvals: IRecommendationApprovalRepository = {
    getRecommendations: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/approvals')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/approvals', 'LIVE');
      }
      return this.client.get<AIActionRecommendation[]>('/api/v1/approvals');
    },
    proposeRecommendation: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/approvals')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/approvals', 'LIVE');
      }
      return this.client.post<AIActionRecommendation>('/api/v1/approvals', dto, {
        idempotencyKey: options?.idempotencyKey
      });
    },
    reviewRecommendation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/approvals/:id/review')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/approvals/:id/review', 'LIVE');
      }
      return this.client.post<AIActionRecommendation>(
        `/api/v1/approvals/${encodeURIComponent(id)}/review`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    },
    executeRecommendation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/approvals/:id/execute')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/approvals/:id/execute', 'LIVE');
      }
      return this.client.post<AIActionRecommendation>(
        `/api/v1/approvals/${encodeURIComponent(id)}/execute`,
        dto,
        {
          idempotencyKey: options?.idempotencyKey ?? dto.idempotencyKey,
          expectedVersion: options?.expectedVersion ?? dto.expectedVersion
        }
      );
    }
  };

  public readonly auditLogs: IAuditLogRepository = {
    getAuditLogs: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/admin/audit-logs')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/admin/audit-logs', 'LIVE');
      }
      return this.client.get<AuditLogItem[]>('/api/v1/admin/audit-logs');
    },
    recordAuditEvent: async (callerRole, dto) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/admin/audit-logs')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/admin/audit-logs', 'LIVE');
      }
      return this.client.post<AuditLogItem>('/api/v1/admin/audit-logs', dto);
    }
  };

  public readonly notifications: INotificationRepository = {
    getNotifications: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/notifications')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/notifications', 'LIVE');
      }
      return this.client.get<AppNotification[]>('/api/v1/notifications');
    },
    markNotificationRead: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/notifications/:id/read')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/notifications/:id/read', 'LIVE');
      }
      return this.client.patch<AppNotification>(
        `/api/v1/notifications/${encodeURIComponent(id)}/read`,
        {}
      );
    },
    markAllNotificationsRead: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/notifications/read-all')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/notifications/read-all', 'LIVE');
      }
      return this.client.post<{ updatedCount: number }>('/api/v1/notifications/read-all', {});
    },
    markNotificationsReadBatch: async (callerRole, notificationIds) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/notifications/read-batch')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/notifications/read-batch', 'LIVE');
      }
      return this.client.post<{ updatedCount: number }>('/api/v1/notifications/read-batch', {
        notificationIds
      });
    },
    deleteNotification: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'DELETE /api/v1/notifications/:id')) {
        return buildUnauthorizedResponse(callerRole, 'DELETE /api/v1/notifications/:id', 'LIVE');
      }
      return this.client.delete<{ deletedId: string }>(
        `/api/v1/notifications/${encodeURIComponent(id)}`
      );
    },
    deleteNotificationsBatch: async (callerRole, notificationIds) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/notifications/delete-batch')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/notifications/delete-batch', 'LIVE');
      }
      return this.client.post<{ deletedCount: number }>('/api/v1/notifications/delete-batch', {
        notificationIds
      });
    },
    clearAllNotifications: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'DELETE /api/v1/notifications/clear-all')) {
        return buildUnauthorizedResponse(callerRole, 'DELETE /api/v1/notifications/clear-all', 'LIVE');
      }
      return this.client.delete<{ clearedCount: number }>('/api/v1/notifications/clear-all');
    }
  };
}

/**
 * ============================================================================
 * 2. EXPLICITLY LABELED DEMO ADAPTER REPOSITORY IMPLEMENTATION
 * ============================================================================
 * Coordinates canonical state across all five portals in DEMO mode with:
 * - Optimistic concurrency control (`expectedVersion` checks -> `CONFLICT_VERSION_MISMATCH`)
 * - Duplicate mutation prevention (`idempotencyKey` tracking -> `IDEMPOTENCY_CONFLICT`)
 * - Strict RBAC and state transition validation
 * - Explicit `meta: { source: 'demo-adapter-simulated', mode: 'DEMO' }` tagging
 */
function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

export class DemoErpRepositoryBundle implements ErpRepositoryBundle {
  public readonly mode: OperatingDataMode = 'DEMO';
  private consumersState: ConsumerProfile[] = clone(INITIAL_CONSUMERS);
  private connectionsState: ElectricityConnection[] = clone(INITIAL_CONNECTIONS);
  private applicationsState: NewConnectionApplication[] = clone(INITIAL_APPLICATIONS);
  private complaintsState: ComplaintRecord[] = clone(INITIAL_COMPLAINTS);
  private workOrdersState: WorkOrder[] = clone(INITIAL_WORK_ORDERS);
  private billsState: ElectricityBill[] = clone(INITIAL_BILLS);
  private paymentsState: PaymentTransaction[] = clone(INITIAL_PAYMENTS);
  private incidentsState: CriticalIncident[] = [];
  private recommendationsState: AIActionRecommendation[] = [];
  private auditLogsState: AuditLogItem[] = clone(AUDIT_LOGS);
  private notificationsState: AppNotification[] = clone(INITIAL_NOTIFICATIONS);

  private readonly versions = new Map<string, number>();
  private readonly processedIdempotencyKeys = new Set<string>();

  public getRecordVersion(entityKey: string): number {
    return this.versions.get(entityKey) ?? 1;
  }

  private bumpVersion(entityKey: string): number {
    const next = this.getRecordVersion(entityKey) + 1;
    this.versions.set(entityKey, next);
    return next;
  }

  private checkConcurrencyAndIdempotency<T>(
    entityKey: string,
    options?: OptimisticMutationOptions
  ): ApiResponse<T> | null {
    if (options?.idempotencyKey) {
      if (this.processedIdempotencyKeys.has(options.idempotencyKey)) {
        return {
          success: false,
          error: `Duplicate mutation rejected: Idempotency key "${options.idempotencyKey}" has already been executed.`,
          code: 'IDEMPOTENCY_CONFLICT',
          statusCode: 409,
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          meta: { source: 'demo-adapter-simulated', mode: 'DEMO' }
        };
      }
    }

    if (options?.expectedVersion !== undefined) {
      const currentVersion = this.getRecordVersion(entityKey);
      if (options.expectedVersion !== currentVersion) {
        return {
          success: false,
          error: `Optimistic concurrency conflict on "${entityKey}": expected version v${options.expectedVersion}, but current record version is v${currentVersion}. Please refresh before retrying.`,
          code: 'CONFLICT_VERSION_MISMATCH',
          statusCode: 409,
          timestamp: new Date().toISOString(),
          requestId: generateRequestId(),
          meta: {
            source: 'demo-adapter-simulated',
            mode: 'DEMO',
            version: currentVersion
          }
        };
      }
    }

    if (options?.idempotencyKey) {
      this.processedIdempotencyKeys.add(options.idempotencyKey);
    }

    return null;
  }

  private ok<T>(data: T, version?: number): ApiResponse<T> {
    return {
      success: true,
      data: clone(data),
      statusCode: 200,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      meta: {
        source: 'demo-adapter-simulated',
        mode: 'DEMO',
        version
      }
    };
  }

  private fail<T>(
    code: ApiResponse<T>['code'],
    error: string,
    statusCode = 400
  ): ApiResponse<T> {
    return {
      success: false,
      error,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      meta: {
        source: 'demo-adapter-simulated',
        mode: 'DEMO'
      }
    };
  }

  public readonly consumersConnections: IConsumerConnectionRepository = {
    getConsumers: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/consumers')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/consumers', 'DEMO');
      }
      return this.ok(this.consumersState);
    },
    getConnections: async (callerRole, consumerNoFilter) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/connections')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/connections', 'DEMO');
      }
      const list = consumerNoFilter
        ? this.connectionsState.filter(c => c.consumerNo === consumerNoFilter)
        : this.connectionsState;
      return this.ok(list);
    },
    getConnectionByNumber: async (callerRole, consumerNo) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/connections/:consumerNo')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/connections/:consumerNo', 'DEMO');
      }
      const conn = this.connectionsState.find(c => c.consumerNo === consumerNo);
      if (!conn) return this.fail('RECORD_NOT_FOUND', `Connection ${consumerNo} not found.`, 404);
      return this.ok(conn, this.getRecordVersion(`connection:${consumerNo}`));
    },
    linkConnection: async (callerRole, consumerNo, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/connections/link')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/connections/link', 'DEMO');
      }
      const key = `connection:${consumerNo}`;
      const conflict = this.checkConcurrencyAndIdempotency<ElectricityConnection>(key, options);
      if (conflict) return conflict;

      const conn = this.connectionsState.find(c => c.consumerNo === consumerNo);
      if (!conn) return this.fail('RECORD_NOT_FOUND', `Connection ${consumerNo} not found.`, 404);
      const nextVer = this.bumpVersion(key);
      return this.ok(conn, nextVer);
    }
  };

  public readonly applications: IApplicationRepository = {
    getApplications: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/applications')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/applications', 'DEMO');
      }
      return this.ok(this.applicationsState);
    },
    getApplicationById: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/applications/:id')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/applications/:id', 'DEMO');
      }
      const app = this.applicationsState.find(a => a.id === id);
      if (!app) return this.fail('RECORD_NOT_FOUND', `Application ${id} not found.`, 404);
      return this.ok(app, this.getRecordVersion(`application:${id}`));
    },
    submitApplication: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/applications')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/applications', 'DEMO');
      }
      const id = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const conflict = this.checkConcurrencyAndIdempotency<NewConnectionApplication>(`application:${id}`, options);
      if (conflict) return conflict;

      const newApp: NewConnectionApplication = {
        id,
        applicantName: dto.applicantName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        subdivision: dto.subdivision,
        category: dto.category,
        requestedLoadKw: dto.requestedLoadKw,
        phase: dto.phase,
        premisesType: dto.premisesType,
        status: 'Submitted',
        appliedDate: new Date().toISOString().slice(0, 10),
        targetCompletionDate: '30-Oct-2026',
        assignedOfficer: 'Rajesh V. Trivedi (AE Ops)',
        estimatedSanctionCost: Math.round(dto.requestedLoadKw * 1250 + 1800),
        documentsSubmitted: dto.documentsSubmitted || ['Identity Proof', 'Ownership Deed'],
        workflowStep: 1,
        notesHistory: [
          {
            timestamp: new Date().toISOString(),
            author: `Consumer Portal (${callerRole.toUpperCase()})`,
            note: 'New connection application registered in DEMO simulation store.'
          }
        ]
      };
      this.applicationsState.unshift(newApp);
      const ver = this.bumpVersion(`application:${id}`);
      return this.ok(newApp, ver);
    },
    updateApplicationStatus: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/status')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/applications/:id/status', 'DEMO');
      }
      const key = `application:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<NewConnectionApplication>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const app = this.applicationsState.find(a => a.id === id);
      if (!app) return this.fail('RECORD_NOT_FOUND', `Application ${id} not found.`, 404);

      if (!isValidApplicationTransition(app.status, dto.status)) {
        return this.fail(
          'INVALID_STATUS_TRANSITION',
          `Invalid lifecycle transition from "${app.status}" to "${dto.status}".`,
          422
        );
      }

      const stepMap: Record<NewConnectionApplication['status'], number> = {
        Submitted: 1,
        'Document Verification': 2,
        'Site Inspection': 3,
        'Sanction Approval': 4,
        'Meter Installed': 5,
        Rejected: 0
      };

      app.status = dto.status;
      app.workflowStep = stepMap[dto.status];
      if (dto.note) {
        app.notesHistory.push({
          timestamp: new Date().toISOString(),
          author: `Officer (${callerRole.toUpperCase()})`,
          note: dto.note
        });
      }

      // Cross-portal consistency: if Meter Installed, create canonical connection
      if (dto.status === 'Meter Installed') {
        const consumerNo = `04281-${Math.floor(10000 + Math.random() * 89999)}`;
        this.connectionsState.unshift({
          consumerNo,
          connectionId: `CONN-${id.replace('APP-', '')}`,
          consumerName: app.applicantName,
          meterNo: dto.meterSerial || `UG-SM-2026-${id.slice(-4)}`,
          sanctionedLoadKw: app.requestedLoadKw,
          phase: app.phase,
          tariffCategory: app.category,
          address: app.address,
          subdivision: app.subdivision,
          feederName: '11kV Visnagar Road Feeder',
          status: 'Active',
          connectedDate: new Date().toISOString().slice(0, 10),
          lastReadingDate: new Date().toISOString().slice(0, 10),
          currentReadingKwh: 0,
          previousReadingKwh: 0,
          averageMonthlyKwh: app.requestedLoadKw * 60,
          securityDeposit: Math.round(app.estimatedSanctionCost * 0.4)
        });
      }

      const ver = this.bumpVersion(key);
      return this.ok(app, ver);
    },
    archiveApplication: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/archive')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/applications/:id/archive', 'DEMO');
      }
      const key = `application:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<NewConnectionApplication>(key, {
        expectedVersion: options?.expectedVersion ?? dto?.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const app = this.applicationsState.find(a => a.id === id);
      if (!app) return this.fail('RECORD_NOT_FOUND', `Application ${id} not found.`, 404);
      if (!canArchiveApplication(app)) {
        return this.fail(
          'INVALID_STATUS_TRANSITION',
          `Application ${id} cannot be archived while in "${app.status}" status.`,
          422
        );
      }

      app.isArchived = true;
      app.archivedAt = new Date().toISOString();
      app.archivedBy = callerRole.toUpperCase();
      app.archiveReason = dto?.reason || `Archived after ${app.status}`;
      const ver = this.bumpVersion(key);
      return this.ok(app, ver);
    },
    restoreApplication: async (callerRole, id, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/restore')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/applications/:id/restore', 'DEMO');
      }
      const key = `application:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<NewConnectionApplication>(key, options);
      if (conflict) return conflict;

      const app = this.applicationsState.find(a => a.id === id);
      if (!app) return this.fail('RECORD_NOT_FOUND', `Application ${id} not found.`, 404);
      app.isArchived = false;
      app.archivedAt = undefined;
      app.archivedBy = undefined;
      app.archiveReason = undefined;
      const ver = this.bumpVersion(key);
      return this.ok(app, ver);
    }
  };

  public readonly complaints: IComplaintRepository = {
    getComplaints: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/complaints')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/complaints', 'DEMO');
      }
      return this.ok(this.complaintsState);
    },
    getComplaintById: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/complaints/:id')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/complaints/:id', 'DEMO');
      }
      const cmp = this.complaintsState.find(c => c.id === id);
      if (!cmp) return this.fail('RECORD_NOT_FOUND', `Complaint ${id} not found.`, 404);
      return this.ok(cmp, this.getRecordVersion(`complaint:${id}`));
    },
    submitComplaint: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/complaints')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/complaints', 'DEMO');
      }
      const id = `CMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const conflict = this.checkConcurrencyAndIdempotency<ComplaintRecord>(`complaint:${id}`, options);
      if (conflict) return conflict;

      const newCmp: ComplaintRecord = {
        id,
        consumerNo: dto.consumerNo,
        consumerName: dto.consumerName,
        phone: dto.phone,
        category: dto.category,
        description: dto.description,
        priority: dto.priority || 'Medium',
        status: 'Registered',
        subdivision: dto.subdivision,
        feederName: dto.feederName || '11kV Visnagar Road Feeder',
        filedAt: new Date().toISOString(),
        slaTargetHours: 24,
        slaDueTime: 'Tomorrow 18:00',
        slaBreached: false,
        timeline: [
          {
            time: new Date().toISOString(),
            stage: 'Registered',
            actor: `Consumer (${callerRole.toUpperCase()})`,
            remark: dto.description
          }
        ]
      };
      this.complaintsState.unshift(newCmp);
      const ver = this.bumpVersion(`complaint:${id}`);
      return this.ok(newCmp, ver);
    },
    assignComplaintToField: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/complaints/:id/assign')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/complaints/:id/assign', 'DEMO');
      }
      const key = `complaint:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<{ complaint: ComplaintRecord; workOrder: WorkOrder }>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const cmp = this.complaintsState.find(c => c.id === id);
      if (!cmp) return this.fail('RECORD_NOT_FOUND', `Complaint ${id} not found.`, 404);

      const woId = `WO-CMP-${id.replace('CMP-', '')}`;
      cmp.status = 'Dispatched';
      cmp.assignedTechnician = dto.engineerName;
      cmp.assignedWorkOrderId = woId;
      cmp.timeline.push({
        time: new Date().toISOString(),
        stage: 'Dispatched',
        actor: `Sub-Division Officer (${callerRole.toUpperCase()})`,
        remark: `Assigned ${woId} to ${dto.engineerName}. ${dto.instructions || ''}`
      });

      const newWo: WorkOrder = {
        id: woId,
        title: `Grievance Rectification: ${cmp.category} (${cmp.id})`,
        type: 'Feeder Patrol & Maintenance',
        priority: dto.priority || 'High',
        status: 'Pending',
        consumerNo: cmp.consumerNo,
        consumerName: cmp.consumerName,
        location: cmp.subdivision,
        gpsCoordinates: { lat: 23.6042, lng: 72.3995 },
        subdivision: cmp.subdivision,
        feederName: cmp.feederName,
        assignedTo: dto.engineerName,
        scheduledDate: cmp.slaDueTime,
        materialsNeeded: ['Digital Multimeter', 'Service Drop Cable', 'Safety Gloves'],
        complaintId: cmp.id
      };
      this.workOrdersState.unshift(newWo);
      this.bumpVersion(`workorder:${woId}`);
      const ver = this.bumpVersion(key);
      return this.ok({ complaint: cmp, workOrder: newWo }, ver);
    },
    updateComplaintStatus: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/complaints/:id/status')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/complaints/:id/status', 'DEMO');
      }
      const key = `complaint:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<ComplaintRecord>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const cmp = this.complaintsState.find(c => c.id === id);
      if (!cmp) return this.fail('RECORD_NOT_FOUND', `Complaint ${id} not found.`, 404);

      if (!isValidComplaintTransition(cmp.status, dto.status)) {
        return this.fail(
          'INVALID_STATUS_TRANSITION',
          `Invalid complaint status transition from "${cmp.status}" to "${dto.status}".`,
          422
        );
      }

      cmp.status = dto.status;
      if (dto.resolutionRemarks) {
        cmp.resolutionRemarks = dto.resolutionRemarks;
      }
      cmp.timeline.push({
        time: new Date().toISOString(),
        stage: dto.status,
        actor: `Operator (${callerRole.toUpperCase()})`,
        remark: dto.remark || dto.resolutionRemarks || `Status updated to ${dto.status}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(cmp, ver);
    }
  };

  public readonly workOrders: IWorkOrderRepository = {
    getWorkOrders: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/workorders')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/workorders', 'DEMO');
      }
      return this.ok(this.workOrdersState);
    },
    getWorkOrderById: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/workorders/:id')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/workorders/:id', 'DEMO');
      }
      const wo = this.workOrdersState.find(w => w.id === id);
      if (!wo) return this.fail('RECORD_NOT_FOUND', `Work Order ${id} not found.`, 404);
      return this.ok(wo, this.getRecordVersion(`workorder:${id}`));
    },
    updateWorkOrderStatus: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/workorders/:id/status')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/workorders/:id/status', 'DEMO');
      }
      const key = `workorder:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<{
        workOrder: WorkOrder;
        syncedApplication?: NewConnectionApplication;
        syncedComplaint?: ComplaintRecord;
      }>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const wo = this.workOrdersState.find(w => w.id === id);
      if (!wo) return this.fail('RECORD_NOT_FOUND', `Work Order ${id} not found.`, 404);

      if (!isValidWorkOrderTransition(wo.status, dto.status)) {
        return this.fail(
          'INVALID_STATUS_TRANSITION',
          `Invalid work order transition from "${wo.status}" to "${dto.status}".`,
          422
        );
      }

      wo.status = dto.status;
      if (dto.report) {
        wo.inspectionReport = dto.report;
      }

      let syncedApplication: NewConnectionApplication | undefined;
      let syncedComplaint: ComplaintRecord | undefined;

      // Cross-portal state synchronization when work order is Completed
      if (dto.status === 'Completed') {
        if (wo.applicationId) {
          const app = this.applicationsState.find(a => a.id === wo.applicationId);
          if (app) {
            app.status = 'Sanction Approval';
            app.workflowStep = 4;
            this.bumpVersion(`application:${app.id}`);
            syncedApplication = app;
          }
        }
        if (wo.complaintId) {
          const cmp = this.complaintsState.find(c => c.id === wo.complaintId);
          if (cmp) {
            cmp.status = 'Resolved';
            cmp.resolvedAt = new Date().toISOString();
            cmp.resolutionRemarks = dto.report?.technicianRemarks || 'Resolved by field crew.';
            this.bumpVersion(`complaint:${cmp.id}`);
            syncedComplaint = cmp;
          }
        }
      }

      const ver = this.bumpVersion(key);
      return this.ok({ workOrder: wo, syncedApplication, syncedComplaint }, ver);
    },
    reportFeederFault: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/telemetry/faults')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/telemetry/faults', 'DEMO');
      }
      const incId = `INC-FLT-${Date.now().toString().slice(-4)}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(`incident:${incId}`, options);
      if (conflict) return conflict;

      const nowIso = new Date().toISOString();
      const newInc: CriticalIncident = {
        id: incId,
        title: `Field Hazard Alert: ${dto.faultType} on ${dto.feederId}`,
        description: dto.remarks,
        severity: dto.severity || 'CRITICAL',
        module: 'Distribution & SCADA',
        entityId: dto.feederId,
        entityType: 'feeder',
        timestamp: nowIso,
        responsibleRoles: ['field', 'employee', 'management', 'admin'],
        recommendedAction: 'Isolate feeder breaker and dispatch emergency patrol squad.',
        status: 'DETECTED',
        history: [
          {
            timestamp: nowIso,
            stage: 'DETECTED',
            actor: `Field Engineer (${callerRole.toUpperCase()})`,
            notes: dto.remarks
          }
        ]
      };
      this.incidentsState.unshift(newInc);
      const ver = this.bumpVersion(`incident:${incId}`);
      return this.ok(newInc, ver);
    }
  };

  public readonly billingPayments: IBillingPaymentRepository = {
    getBills: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/billing/bills')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/billing/bills', 'DEMO');
      }
      return this.ok(this.billsState);
    },
    getPayments: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/billing/payments')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/billing/payments', 'DEMO');
      }
      return this.ok(this.paymentsState);
    },
    payBill: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/billing/pay')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/billing/pay', 'DEMO');
      }
      const key = `bill:${dto.billNo}`;
      const conflict = this.checkConcurrencyAndIdempotency<{ bill: ElectricityBill; payment: PaymentTransaction }>(key, {
        expectedVersion: options?.expectedVersion,
        idempotencyKey: options?.idempotencyKey ?? dto.idempotencyKey
      });
      if (conflict) return conflict;

      const bill = this.billsState.find(b => b.billNo === dto.billNo);
      if (!bill) return this.fail('RECORD_NOT_FOUND', `Bill ${dto.billNo} not found.`, 404);
      if (bill.status === 'Paid') {
        return this.fail('DUPLICATE_ENTITY', `Bill ${dto.billNo} is already marked Paid.`, 409);
      }

      const txId = `TXN-DEMO-${Date.now()}`;
      bill.status = 'Paid';
      bill.paidDate = new Date().toISOString();
      bill.transactionRef = txId;

      const payment: PaymentTransaction = {
        txId,
        consumerNo: bill.consumerNo,
        billNo: bill.billNo,
        date: bill.paidDate,
        amount: dto.amount || bill.totalAmount,
        paymentMethod: dto.paymentMethod,
        status: 'Successful',
        bankReference: dto.gatewayRef || `DEMO/${txId}`
      };
      this.paymentsState.unshift(payment);
      const ver = this.bumpVersion(key);
      return this.ok({ bill, payment }, ver);
    }
  };

  public readonly incidents: IIncidentRepository = {
    getIncidents: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/incidents')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/incidents', 'DEMO');
      }
      return this.ok(this.incidentsState);
    },
    acknowledgeIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/incidents/:id/acknowledge')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/incidents/:id/acknowledge', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.status = 'ACKNOWLEDGED';
      inc.acknowledgedAt = nowIso;
      inc.acknowledgedBy = callerRole.toUpperCase();
      inc.history.push({
        timestamp: nowIso,
        stage: 'ACKNOWLEDGED',
        actor: callerRole.toUpperCase(),
        notes: dto.notes || 'Acknowledged by operator.'
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    assignIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/assign')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/assign', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      const prevEngineerId = inc.assignedToUserId;
      const prevEngineerName = inc.assignedEngineerName;
      const isReassignment = Boolean(prevEngineerId && prevEngineerId !== dto.engineerId);
      const prevStatus = inc.status;

      inc.status = 'ASSIGNED';
      inc.assignedToUserId = dto.engineerId;
      inc.assignedEngineerName = dto.engineerName;
      inc.assignedAt = nowIso;
      inc.assignedBy = callerRole.toUpperCase();
      inc.assignmentNotes = dto.notes;
      if (isReassignment) {
        inc.previousEngineerId = prevEngineerId;
        inc.previousEngineerName = prevEngineerName;
      }
      if (!inc.responsibleRoles.includes('field')) {
        inc.responsibleRoles.push('field');
      }
      inc.history.push({
        id: `EVT-INC-${id}-${isReassignment ? 'REASSIGN' : 'ASSIGN'}-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: 'ASSIGNED',
        eventType: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        recipient: dto.engineerName,
        targetUserId: dto.engineerId,
        targetRole: 'field',
        ...(isReassignment
          ? {
              previousEngineerId: prevEngineerId,
              previousEngineerName: prevEngineerName,
              newEngineerId: dto.engineerId,
              newEngineerName: dto.engineerName
            }
          : {
              newEngineerId: dto.engineerId,
              newEngineerName: dto.engineerName
            }),
        reason: dto.notes,
        previousStatus: prevStatus,
        newStatus: 'ASSIGNED',
        notes: isReassignment
          ? `Reassigned from ${prevEngineerName || prevEngineerId} (${prevEngineerId}) to field engineer ${dto.engineerName} (${dto.engineerId}). ${dto.notes || ''}`
          : `Assigned to field engineer ${dto.engineerName} (${dto.engineerId}). ${dto.notes || ''}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    escalateIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/escalate')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/escalate', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      const prevStatus = inc.status;

      // When targetRole === 'field', create a canonical targeted Field Engineer assignment
      if (dto.targetRole === 'field') {
        const engineerId = dto.targetUserId || 'FLD-UG-201';
        const engineerName = dto.targetUserName || 'Vikramaditya Solanki';
        inc.status = 'ASSIGNED';
        inc.assignedToUserId = engineerId;
        inc.assignedEngineerName = engineerName;
        inc.assignedAt = nowIso;
        inc.assignedBy = callerRole.toUpperCase();
        inc.assignmentNotes = dto.reason;
        if (inc.escalatedTo === 'field') {
          inc.escalatedTo = undefined;
          inc.escalatedToUserId = undefined;
          inc.escalatedToUserName = undefined;
        }
        if (!inc.responsibleRoles.includes('field')) {
          inc.responsibleRoles.push('field');
        }
        inc.history.push({
          id: `EVT-INC-${id}-ASSIGN-${Date.now()}`,
          incidentId: id,
          timestamp: nowIso,
          stage: 'ASSIGNED',
          eventType: 'ASSIGNED',
          actor: callerRole.toUpperCase(),
          actorRole: callerRole,
          recipient: engineerName,
          targetUserId: engineerId,
          targetRole: 'field',
          reason: dto.reason,
          previousStatus: prevStatus,
          newStatus: 'ASSIGNED',
          notes: `Assigned to Field Engineer ${engineerName} (${engineerId}). ${dto.reason || ''}`
        });
        const ver = this.bumpVersion(key);
        return this.ok(inc, ver);
      }

      const resolvedTargetUserId =
        dto.targetUserId || (dto.targetRole === 'management' ? 'usr_mgmt_01' : undefined);
      const resolvedTargetUserName =
        dto.targetUserName || (dto.targetRole === 'management' ? 'Rajesh Solanki' : undefined);

      inc.status = 'ESCALATED';
      inc.escalatedTo = dto.targetRole;
      inc.escalatedToUserId = resolvedTargetUserId;
      inc.escalatedToUserName = resolvedTargetUserName;
      inc.escalatedAt = nowIso;
      inc.escalatedBy = callerRole.toUpperCase();
      inc.escalatedReason = dto.reason;
      inc.approvalStatus = 'PENDING_APPROVAL';
      if (!inc.responsibleRoles.includes(dto.targetRole)) {
        inc.responsibleRoles.push(dto.targetRole);
      }
      inc.history.push({
        id: `EVT-INC-${id}-ESC-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: 'ESCALATED',
        eventType: 'ESCALATED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        recipient: resolvedTargetUserName || dto.targetRole,
        targetUserId: resolvedTargetUserId,
        targetRole: dto.targetRole,
        reason: dto.reason,
        previousStatus: prevStatus,
        newStatus: 'ESCALATED',
        approvalStatus: 'PENDING_APPROVAL',
        notes: `Escalated to ${dto.targetRole}${resolvedTargetUserName ? ` (${resolvedTargetUserName})` : ''}: ${dto.reason}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    resolveIncident: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/incidents/:id/resolve')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/incidents/:id/resolve', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.status = 'RESOLVED';
      inc.resolvedAt = nowIso;
      inc.resolvedBy = callerRole.toUpperCase();
      inc.resolutionNotes = dto.resolutionNotes;
      inc.history.push({
        timestamp: nowIso,
        stage: 'RESOLVED',
        actor: callerRole.toUpperCase(),
        notes: dto.resolutionNotes
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    acceptAssignment: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/accept-assignment')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/accept-assignment', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto?.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      const prevStatus = inc.status;
      inc.status = 'IN_PROGRESS';
      inc.history.push({
        id: `EVT-INC-${id}-ACC-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: 'IN_PROGRESS',
        eventType: 'ASSIGNMENT_ACCEPTED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        previousStatus: prevStatus,
        newStatus: 'IN_PROGRESS',
        notes: 'Field Engineer accepted assignment and mobilized to site.'
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    declineAssignment: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/decline-assignment')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/decline-assignment', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      const prevStatus = inc.status;
      const prevEngineerId = inc.assignedToUserId;
      const prevEngineerName = inc.assignedEngineerName;
      inc.status = 'ACKNOWLEDGED';
      inc.assignmentStatus = 'DECLINED';
      inc.previousEngineerId = prevEngineerId;
      inc.previousEngineerName = prevEngineerName;
      inc.lastDeclinedByUserId = prevEngineerId;
      inc.lastDeclinedByName = prevEngineerName;
      inc.lastDeclinedReason = dto.reason;
      inc.lastDeclinedAt = nowIso;
      inc.assignedToUserId = undefined;
      inc.assignedEngineerName = undefined;
      inc.history.push({
        id: `EVT-INC-${id}-DECL-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: 'ACKNOWLEDGED',
        eventType: 'ASSIGNMENT_DECLINED',
        actor: prevEngineerName || callerRole.toUpperCase(),
        actorUserId: prevEngineerId,
        actorRole: callerRole,
        recipient: inc.originatingEmployeeName || 'Priya Rathod',
        targetUserId: inc.originatingEmployeeUserId || 'EMP-UG-1101',
        targetRole: 'employee',
        previousEngineerId: prevEngineerId,
        previousEngineerName: prevEngineerName,
        previousStatus: prevStatus,
        newStatus: 'ACKNOWLEDGED',
        reason: dto.reason,
        notes: `Field Engineer ${prevEngineerName || callerRole.toUpperCase()}${prevEngineerId ? ` (${prevEngineerId})` : ''} declined assignment: ${dto.reason}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    startInspection: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/start-inspection')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/start-inspection', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto?.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      const prevStatus = inc.status;
      inc.status = 'IN_PROGRESS';
      inc.inspectionStartedAt = nowIso;
      inc.history.push({
        id: `EVT-INC-${id}-INSP-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: 'IN_PROGRESS',
        eventType: 'INSPECTION_STARTED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        previousStatus: prevStatus,
        newStatus: 'IN_PROGRESS',
        notes: dto?.notes || 'Physical inspection and instrumentation tests started on site.'
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    submitFindings: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/submit-findings')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/submit-findings', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.inspectionFindings = dto.findings;
      inc.history.push({
        id: `EVT-INC-${id}-FIND-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: inc.status,
        eventType: 'FINDINGS_SUBMITTED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        notes: `Technical findings recorded: ${dto.findings}`,
        remarks: dto.findings
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    requestAssistance: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/request-assistance')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/request-assistance', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.assistanceRequestedNotes = dto.assistanceNotes;
      inc.history.push({
        id: `EVT-INC-${id}-ASST-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: inc.status,
        eventType: 'ASSISTANCE_REQUESTED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        notes: `Assistance requested: ${dto.assistanceNotes}`,
        reason: dto.assistanceNotes
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    submitResolutionReport: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/submit-resolution-report')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/submit-resolution-report', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      const prevStatus = inc.status;
      inc.status = 'RESOLVED';
      inc.resolvedAt = nowIso;
      inc.resolvedBy = callerRole.toUpperCase();
      inc.resolutionReport = dto.resolutionReport;
      inc.resolutionReportSubmittedAt = nowIso;
      inc.resolutionNotes = dto.resolutionReport;
      inc.history.push({
        id: `EVT-INC-${id}-RES-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: 'RESOLVED',
        eventType: 'RESOLUTION_SUBMITTED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        previousStatus: prevStatus,
        newStatus: 'RESOLVED',
        notes: `Resolution Report: ${dto.resolutionReport}`,
        remarks: dto.resolutionReport
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    approveEscalation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/approve-escalation')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/approve-escalation', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto?.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.approvalStatus = 'APPROVED';
      inc.approvalDecisionAt = nowIso;
      inc.approvalDecisionBy = callerRole.toUpperCase();
      inc.approvalDecisionRemarks = dto?.remarks;
      inc.history.push({
        id: `EVT-INC-${id}-APPR-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: inc.status,
        eventType: 'APPROVED',
        approvalStatus: 'APPROVED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        remarks: dto?.remarks,
        notes: `Executive Concurrence Granted by Management: ${dto?.remarks || 'Approved'}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    rejectEscalation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/reject-escalation')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/reject-escalation', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.approvalStatus = 'REJECTED';
      inc.approvalDecisionAt = nowIso;
      inc.approvalDecisionBy = callerRole.toUpperCase();
      inc.approvalDecisionReason = dto.reason;
      inc.history.push({
        id: `EVT-INC-${id}-REJ-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: inc.status,
        eventType: 'REJECTED',
        approvalStatus: 'REJECTED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        reason: dto.reason,
        notes: `Escalation Rejected by Management: ${dto.reason}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    },
    requestMoreInfo: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/incidents/:id/request-more-info')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/incidents/:id/request-more-info', 'DEMO');
      }
      const key = `incident:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<CriticalIncident>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const inc = this.incidentsState.find(i => i.id === id);
      if (!inc) return this.fail('RECORD_NOT_FOUND', `Incident ${id} not found.`, 404);

      const nowIso = new Date().toISOString();
      inc.approvalStatus = 'MORE_INFO_REQUIRED';
      inc.approvalDecisionAt = nowIso;
      inc.approvalDecisionBy = callerRole.toUpperCase();
      inc.approvalDecisionRemarks = dto.question;
      inc.history.push({
        id: `EVT-INC-${id}-INFO-${Date.now()}`,
        incidentId: id,
        timestamp: nowIso,
        stage: inc.status,
        eventType: 'MORE_INFO_REQUESTED',
        approvalStatus: 'MORE_INFO_REQUIRED',
        actor: callerRole.toUpperCase(),
        actorRole: callerRole,
        reason: dto.question,
        notes: `More Information Requested by Management: ${dto.question}`
      });

      const ver = this.bumpVersion(key);
      return this.ok(inc, ver);
    }
  };

  public readonly approvals: IRecommendationApprovalRepository = {
    getRecommendations: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/approvals')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/approvals', 'DEMO');
      }
      return this.ok(this.recommendationsState);
    },
    proposeRecommendation: async (callerRole, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/approvals')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/approvals', 'DEMO');
      }
      const id = `REC-DEMO-${Date.now().toString().slice(-4)}`;
      const conflict = this.checkConcurrencyAndIdempotency<AIActionRecommendation>(`approval:${id}`, options);
      if (conflict) return conflict;

      const rec: AIActionRecommendation = {
        ...dto,
        id,
        createdAt: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
        idempotencyKey: options?.idempotencyKey || `IDEM-${id}`
      };
      this.recommendationsState.unshift(rec);
      const ver = this.bumpVersion(`approval:${id}`);
      return this.ok(rec, ver);
    },
    reviewRecommendation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/approvals/:id/review')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/approvals/:id/review', 'DEMO');
      }
      const key = `approval:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<AIActionRecommendation>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey
      });
      if (conflict) return conflict;

      const rec = this.recommendationsState.find(r => r.id === id);
      if (!rec) return this.fail('RECORD_NOT_FOUND', `Recommendation ${id} not found.`, 404);

      const permCheck = validateApprovalPermission(rec, callerRole);
      if (!permCheck.allowed) {
        return this.fail('UNAUTHORIZED_ROLE', permCheck.reason || 'Role not authorized for this approval.', 403);
      }

      rec.status = dto.decision;
      rec.reviewedBy = callerRole.toUpperCase();
      rec.reviewedAt = new Date().toISOString();
      rec.reviewerRole = callerRole;
      rec.decisionRemarks = dto.decisionRemarks;

      const ver = this.bumpVersion(key);
      return this.ok(rec, ver);
    },
    executeRecommendation: async (callerRole, id, dto, options) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/approvals/:id/execute')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/approvals/:id/execute', 'DEMO');
      }
      const key = `approval:${id}`;
      const conflict = this.checkConcurrencyAndIdempotency<AIActionRecommendation>(key, {
        expectedVersion: options?.expectedVersion ?? dto.expectedVersion,
        idempotencyKey: options?.idempotencyKey ?? dto.idempotencyKey
      });
      if (conflict) return conflict;

      const rec = this.recommendationsState.find(r => r.id === id);
      if (!rec) return this.fail('RECORD_NOT_FOUND', `Recommendation ${id} not found.`, 404);

      if (rec.status === 'EXECUTED') {
        return this.fail('IDEMPOTENCY_CONFLICT', `Recommendation ${id} has already been executed.`, 409);
      }
      if (rec.status === 'REJECTED') {
        return this.fail('INVALID_STATUS_TRANSITION', `Rejected recommendation ${id} cannot be executed.`, 422);
      }

      const permCheck = validateApprovalPermission(rec, callerRole);
      if (!permCheck.allowed) {
        return this.fail('UNAUTHORIZED_ROLE', permCheck.reason || 'Unauthorized execution attempt.', 403);
      }

      const driftCheck = validateCurrentRecordState(rec, {
        applications: this.applicationsState,
        complaints: this.complaintsState,
        workOrders: this.workOrdersState,
        incidents: this.incidentsState
      });
      if (!driftCheck.valid) {
        rec.status = 'FAILED';
        return this.fail('CONFLICT_VERSION_MISMATCH', driftCheck.reason || 'State drift detected.', 409);
      }

      rec.status = 'EXECUTED';
      rec.executionResult = {
        success: true,
        executedAt: new Date().toISOString(),
        message: 'Executed in DEMO simulation repository.'
      };
      const ver = this.bumpVersion(key);
      return this.ok(rec, ver);
    }
  };

  public readonly auditLogs: IAuditLogRepository = {
    getAuditLogs: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/admin/audit-logs')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/admin/audit-logs', 'DEMO');
      }
      return this.ok(this.auditLogsState);
    },
    recordAuditEvent: async (callerRole, dto) => {
      const entry: AuditLogItem = {
        id: `AUD-DEMO-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: `Operator (${callerRole.toUpperCase()})`,
        role: callerRole.toUpperCase(),
        action: dto.action,
        resource: dto.resource,
        ipAddress: '127.0.0.1 (Demo Client)',
        status: dto.status || 'SUCCESS',
        metaDetail: `${dto.metaDetail} [DEMO CLIENT SESSION LOG]`
      };
      this.auditLogsState.unshift(entry);
      return this.ok(entry);
    }
  };

  public readonly notifications: INotificationRepository = {
    getNotifications: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'GET /api/v1/notifications')) {
        return buildUnauthorizedResponse(callerRole, 'GET /api/v1/notifications', 'DEMO');
      }
      return this.ok(this.notificationsState);
    },
    markNotificationRead: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'PATCH /api/v1/notifications/:id/read')) {
        return buildUnauthorizedResponse(callerRole, 'PATCH /api/v1/notifications/:id/read', 'DEMO');
      }
      const n = this.notificationsState.find(item => item.id === id);
      if (!n) return this.fail('RECORD_NOT_FOUND', `Notification ${id} not found.`, 404);
      n.read = true;
      return this.ok(n);
    },
    markAllNotificationsRead: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/notifications/read-all')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/notifications/read-all', 'DEMO');
      }
      let updatedCount = 0;
      for (const item of this.notificationsState) {
        if (!item.read) {
          item.read = true;
          updatedCount++;
        }
      }
      return this.ok({ updatedCount });
    },
    markNotificationsReadBatch: async (callerRole, notificationIds) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/notifications/read-batch')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/notifications/read-batch', 'DEMO');
      }
      const idSet = new Set(notificationIds);
      let updatedCount = 0;
      for (const item of this.notificationsState) {
        if (idSet.has(item.id) && !item.read) {
          item.read = true;
          updatedCount++;
        }
      }
      return this.ok({ updatedCount });
    },
    deleteNotification: async (callerRole, id) => {
      if (!isActionAuthorized(callerRole, 'DELETE /api/v1/notifications/:id')) {
        return buildUnauthorizedResponse(callerRole, 'DELETE /api/v1/notifications/:id', 'DEMO');
      }
      const before = this.notificationsState.length;
      this.notificationsState = this.notificationsState.filter(n => n.id !== id);
      if (this.notificationsState.length === before) {
        return this.fail('RECORD_NOT_FOUND', `Notification ${id} not found.`, 404);
      }
      return this.ok({ deletedId: id });
    },
    deleteNotificationsBatch: async (callerRole, notificationIds) => {
      if (!isActionAuthorized(callerRole, 'POST /api/v1/notifications/delete-batch')) {
        return buildUnauthorizedResponse(callerRole, 'POST /api/v1/notifications/delete-batch', 'DEMO');
      }
      const idSet = new Set(notificationIds);
      const before = this.notificationsState.length;
      this.notificationsState = this.notificationsState.filter(n => !idSet.has(n.id));
      return this.ok({ deletedCount: before - this.notificationsState.length });
    },
    clearAllNotifications: async (callerRole) => {
      if (!isActionAuthorized(callerRole, 'DELETE /api/v1/notifications/clear-all')) {
        return buildUnauthorizedResponse(callerRole, 'DELETE /api/v1/notifications/clear-all', 'DEMO');
      }
      const clearedCount = this.notificationsState.length;
      this.notificationsState = [];
      return this.ok({ clearedCount });
    }
  };
}

export function createErpRepositoryBundle(
  mode: OperatingDataMode,
  apiClient: ErpApiClient
): ErpRepositoryBundle {
  if (mode === 'LIVE') {
    return new LiveErpRepositoryBundle(apiClient);
  }
  return new DemoErpRepositoryBundle();
}
