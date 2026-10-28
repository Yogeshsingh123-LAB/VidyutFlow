import {
  UserRole,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  CriticalIncident,
  IncidentSeverity
} from '../types';
import {
  ApiResponse,
  SubmitApplicationDto,
  UpdateApplicationStatusDto,
  SubmitComplaintDto,
  AssignComplaintDto,
  UpdateComplaintStatusDto,
  UpdateWorkOrderStatusDto,
  ReportFeederFaultDto,
  BACKEND_RBAC_RULES
} from './erpApiContracts';

/**
 * Valid lifecycle transitions for New Connection Applications.
 */
export const APPLICATION_TRANSITIONS: Record<NewConnectionApplication['status'], NewConnectionApplication['status'][]> = {
  'Submitted': ['Document Verification', 'Rejected'],
  'Document Verification': ['Site Inspection', 'Rejected'],
  'Site Inspection': ['Sanction Approval', 'Rejected'],
  'Sanction Approval': ['Meter Installed', 'Rejected'],
  'Meter Installed': [], // Terminal energized state
  'Rejected': ['Submitted'] // Re-submission allowed
};

/**
 * Valid lifecycle transitions for Complaints.
 */
export const COMPLAINT_TRANSITIONS: Record<ComplaintRecord['status'], ComplaintRecord['status'][]> = {
  'Registered': ['In Review', 'Dispatched', 'Resolved'],
  'In Review': ['Dispatched', 'In Progress', 'Resolved'],
  'Dispatched': ['In Progress', 'Resolved'],
  'In Progress': ['Resolved'],
  'Resolved': ['Closed', 'In Progress'], // Re-open allowed if unsatisfied
  'Closed': [] // Final closure
};

/**
 * Valid lifecycle transitions for Field Work Orders.
 */
export const WORK_ORDER_TRANSITIONS: Record<WorkOrder['status'], WorkOrder['status'][]> = {
  'Pending': ['En Route', 'Deferred'],
  'En Route': ['On Site', 'Deferred'],
  'On Site': ['Completed', 'Deferred'],
  'Deferred': ['Pending', 'En Route'],
  'Completed': [] // Final
};

/**
 * Check if the active role is authorized to perform a given endpoint or operation.
 */
export function isActionAuthorized(role: UserRole, endpoint: string): boolean {
  const allowed = BACKEND_RBAC_RULES[endpoint];
  if (!allowed) {
    // If endpoint is an unmapped mutation, fail closed (deny)
    if (endpoint.startsWith('POST') || endpoint.startsWith('PATCH') || endpoint.startsWith('DELETE') || endpoint.startsWith('PUT')) {
      return false;
    }
    return true; // Unrestricted GET read operations
  }
  return allowed.includes(role);
}

/**
 * Validate status transition according to UGVCL ERP business rules.
 */
export function isValidApplicationTransition(
  current: NewConnectionApplication['status'],
  target: NewConnectionApplication['status']
): boolean {
  if (current === target) return true;
  const allowed = APPLICATION_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function isValidComplaintTransition(
  current: ComplaintRecord['status'],
  target: ComplaintRecord['status']
): boolean {
  if (current === target) return true;
  const allowed = COMPLAINT_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function isValidWorkOrderTransition(
  current: WorkOrder['status'],
  target: WorkOrder['status']
): boolean {
  if (current === target) return true;
  const allowed = WORK_ORDER_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

/**
 * Check whether an application is eligible to be archived from the active employee worklist.
 * Only completed ('Meter Installed') or rejected ('Rejected') applications may be archived.
 * Active in-progress applications cannot be archived or deleted.
 */
export function canArchiveApplication(
  application: Pick<NewConnectionApplication, 'status' | 'isArchived'>
): { allowed: boolean; reason?: string } {
  if (application.isArchived) {
    return { allowed: false, reason: 'Application is already archived.' };
  }
  if (application.status === 'Meter Installed' || application.status === 'Rejected') {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Cannot archive active application in "${application.status}" stage. Only completed (Meter Installed) or Rejected applications may be archived from the active worklist.`
  };
}

export interface ApplicationStatusDisplayMeta {
  status: NewConnectionApplication['status'];
  colorTone: 'blue' | 'amber' | 'purple' | 'green' | 'red';
  shortLabel: string;
  stageSummaryLabel: string;
  requiresEmployeeAction: boolean;
  reviewStateLabel: 'Pending Review' | 'In Field Review' | 'Awaiting Sanction' | 'Reviewed & Completed' | 'Reviewed & Rejected' | 'Clarification Requested';
  badgeClasses: string;
  rowAccentClasses: string;
}

/**
 * Returns canonical status badge colors, labels, and action-required metadata for the Employee Application Queue.
 */
export function getApplicationStatusDisplayMeta(
  app: Pick<NewConnectionApplication, 'status' | 'clarificationRequested'>
): ApplicationStatusDisplayMeta {
  if (app.clarificationRequested && app.status !== 'Meter Installed' && app.status !== 'Rejected') {
    return {
      status: app.status,
      colorTone: 'amber',
      shortLabel: 'Clarification Requested',
      stageSummaryLabel: `${app.status} (Clarification Requested)`,
      requiresEmployeeAction: true,
      reviewStateLabel: 'Clarification Requested',
      badgeClasses: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      rowAccentClasses: 'border-l-4 border-l-amber-500'
    };
  }

  switch (app.status) {
    case 'Submitted':
      return {
        status: 'Submitted',
        colorTone: 'blue',
        shortLabel: 'Submitted',
        stageSummaryLabel: 'Submitted — New Filing',
        requiresEmployeeAction: true,
        reviewStateLabel: 'Pending Review',
        badgeClasses: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        rowAccentClasses: 'border-l-4 border-l-blue-500'
      };
    case 'Document Verification':
      return {
        status: 'Document Verification',
        colorTone: 'amber',
        shortLabel: 'In Progress',
        stageSummaryLabel: 'Document Verification — In Progress',
        requiresEmployeeAction: true,
        reviewStateLabel: 'Pending Review',
        badgeClasses: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        rowAccentClasses: 'border-l-4 border-l-amber-500'
      };
    case 'Site Inspection':
      return {
        status: 'Site Inspection',
        colorTone: 'amber',
        shortLabel: 'In Progress',
        stageSummaryLabel: 'Site Inspection — In Progress',
        requiresEmployeeAction: false,
        reviewStateLabel: 'In Field Review',
        badgeClasses: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        rowAccentClasses: 'border-l-4 border-l-amber-400'
      };
    case 'Sanction Approval':
      return {
        status: 'Sanction Approval',
        colorTone: 'purple',
        shortLabel: 'Awaiting Approval',
        stageSummaryLabel: 'Sanction Approval — Awaiting Approval',
        requiresEmployeeAction: true,
        reviewStateLabel: 'Awaiting Sanction',
        badgeClasses: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        rowAccentClasses: 'border-l-4 border-l-purple-500'
      };
    case 'Meter Installed':
      return {
        status: 'Meter Installed',
        colorTone: 'green',
        shortLabel: 'Approved / Completed',
        stageSummaryLabel: 'Meter Installed — Approved / Completed',
        requiresEmployeeAction: false,
        reviewStateLabel: 'Reviewed & Completed',
        badgeClasses: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        rowAccentClasses: 'border-l-4 border-l-emerald-500'
      };
    case 'Rejected':
      return {
        status: 'Rejected',
        colorTone: 'red',
        shortLabel: 'Rejected',
        stageSummaryLabel: 'Rejected',
        requiresEmployeeAction: false,
        reviewStateLabel: 'Reviewed & Rejected',
        badgeClasses: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        rowAccentClasses: 'border-l-4 border-l-rose-500'
      };
  }
}

/**
 * UGVCL ERP Integration Adapter Layer
 *
 * Provides a clean abstraction between UI portal components and backend microservices.
 * In development / demo environments without a live microservice cluster, it coordinates
 * localized canonical state changes while outputting standard API payloads for backend developers.
 */
export class ErpAdapterService {
  private logAdapter(method: string, endpoint: string, payload: unknown, simulated = true) {
    if (typeof window !== 'undefined' && (window as unknown as { __UGVCL_DEBUG__?: boolean }).__UGVCL_DEBUG__) {
      console.info(
        `%c[UGVCL ERP Adapter] ${method} ${endpoint} (${simulated ? 'Demo Local Engine' : 'Live Microservice'})`,
        'color: #0284c7; font-weight: bold;',
        payload
      );
    }
  }

  /**
   * Submit a new consumer electricity application
   */
  async submitApplication(
    callerRole: UserRole,
    dto: SubmitApplicationDto
  ): Promise<ApiResponse<Partial<NewConnectionApplication>>> {
    if (!isActionAuthorized(callerRole, 'POST /api/v1/applications')) {
      return {
        success: false,
        error: `Role "${callerRole}" is not authorized to submit applications.`,
        code: 'UNAUTHORIZED_ROLE',
        timestamp: new Date().toISOString(),
        requestId: `REQ-${Date.now()}`
      };
    }

    this.logAdapter('POST', '/api/v1/applications', dto);

    return {
      success: true,
      data: {
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
        workflowStep: 1
      },
      timestamp: new Date().toISOString(),
      requestId: `REQ-${Date.now()}`,
      meta: { source: 'demo-adapter-simulated' }
    };
  }

  /**
   * Update an application's lifecycle status with role checking & transition validation
   */
  async updateApplicationStatus(
    callerRole: UserRole,
    application: NewConnectionApplication,
    targetStatus: NewConnectionApplication['status'],
    note?: string
  ): Promise<ApiResponse<NewConnectionApplication>> {
    if (!isActionAuthorized(callerRole, 'PATCH /api/v1/applications/:id/status')) {
      return {
        success: false,
        error: `Role "${callerRole}" does not have privilege to sanction or update applications.`,
        code: 'UNAUTHORIZED_ROLE',
        timestamp: new Date().toISOString(),
        requestId: `REQ-${Date.now()}`
      };
    }

    if (!isValidApplicationTransition(application.status, targetStatus)) {
      return {
        success: false,
        error: `Invalid lifecycle transition from "${application.status}" to "${targetStatus}".`,
        code: 'INVALID_STATUS_TRANSITION',
        timestamp: new Date().toISOString(),
        requestId: `REQ-${Date.now()}`
      };
    }

    this.logAdapter('PATCH', `/api/v1/applications/${application.id}/status`, { targetStatus, note });

    const stepMap: Record<NewConnectionApplication['status'], number> = {
      'Submitted': 1,
      'Document Verification': 2,
      'Site Inspection': 3,
      'Sanction Approval': 4,
      'Meter Installed': 5,
      'Rejected': 0
    };

    return {
      success: true,
      data: {
        ...application,
        status: targetStatus,
        workflowStep: stepMap[targetStatus],
        notesHistory: note
          ? [
              ...application.notesHistory,
              {
                timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
                author: `Authorized Officer (${callerRole.toUpperCase()})`,
                note
              }
            ]
          : application.notesHistory
      },
      timestamp: new Date().toISOString(),
      requestId: `REQ-${Date.now()}`,
      meta: { source: 'demo-adapter-simulated' }
    };
  }

  /**
   * Assign a complaint to a field engineer and generate linked work order
   */
  async assignComplaintToField(
    callerRole: UserRole,
    complaint: ComplaintRecord,
    engineerName: string,
    instructions?: string
  ): Promise<ApiResponse<{ complaint: ComplaintRecord; workOrderId: string }>> {
    if (!isActionAuthorized(callerRole, 'POST /api/v1/complaints/:id/assign')) {
      return {
        success: false,
        error: `Role "${callerRole}" cannot dispatch field squads.`,
        code: 'UNAUTHORIZED_ROLE',
        timestamp: new Date().toISOString(),
        requestId: `REQ-${Date.now()}`
      };
    }

    const woId = `WO-CMP-${complaint.id.replace('CMP-', '')}`;
    this.logAdapter('POST', `/api/v1/complaints/${complaint.id}/assign`, { engineerName, woId, instructions });

    const updatedCmp: ComplaintRecord = {
      ...complaint,
      status: 'Dispatched',
      assignedTechnician: engineerName,
      assignedWorkOrderId: woId,
      timeline: [
        ...complaint.timeline,
        {
          time: new Date().toISOString().slice(11, 16),
          stage: 'Dispatched',
          actor: `Operations Desk (${callerRole.toUpperCase()})`,
          remark: `Dispatched to JE Field ${engineerName}. Linked Work Order: ${woId}. ${instructions || ''}`
        }
      ]
    };

    return {
      success: true,
      data: {
        complaint: updatedCmp,
        workOrderId: woId
      },
      timestamp: new Date().toISOString(),
      requestId: `REQ-${Date.now()}`,
      meta: { source: 'demo-adapter-simulated' }
    };
  }
}

export const erpAdapter = new ErpAdapterService();
