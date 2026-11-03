import {
  UserRole,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  CriticalIncident,
  IncidentSeverity,
  IncidentStatus
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
  'Pending': ['Assigned', 'En Route', 'Deferred'],
  'Assigned': ['En Route', 'In Progress', 'Deferred'],
  'En Route': ['On Site', 'Deferred'],
  'On Site': ['In Progress', 'Completed', 'Deferred'],
  'In Progress': ['Completed', 'Deferred'],
  'Deferred': ['Pending', 'Assigned', 'En Route'],
  'Completed': [] // Final
};

/**
 * Valid lifecycle transitions for Critical Incidents (VidyutFlow Canonical ERP Model).
 * Reopening resolved or closed incidents is NOT supported in the canonical model.
 */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  'DETECTED': ['ACKNOWLEDGED', 'ASSIGNED', 'ESCALATED', 'RESOLVED'],
  'ACKNOWLEDGED': ['ASSIGNED', 'ESCALATED', 'RESOLVED'],
  'ASSIGNED': ['IN_PROGRESS', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED'],
  'IN_PROGRESS': ['RESOLVED', 'ESCALATED', 'ACKNOWLEDGED'],
  'ESCALATED': ['RESOLVED', 'ASSIGNED', 'IN_PROGRESS', 'ACKNOWLEDGED'],
  'RESOLVED': ['CLOSED'],
  'CLOSED': [] // Reopening is strictly unsupported in canonical model
};

export function isValidIncidentTransition(
  current: IncidentStatus,
  target: IncidentStatus
): boolean {
  if (current === target) return true;
  const allowed = INCIDENT_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

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

const SUBDIVISION_DEFAULT_FEEDER_MAP: Record<string, string> = {
  'Mehsana Sub-Division 1': '11kV Visnagar Road Feeder',
  'Patan Sub-Division': '11kV Patan GIDC Express Feeder',
  'Patan Sub-Division 1': '11kV Patan GIDC Express Feeder',
  'Palanpur Sub-Division': '11kV Palanpur Dairy Road Feeder',
  'Gandhinagar Sub-Division 2': '11kV Kalol Industrial Feeder',
  'Kalol Sub-Division': '11kV Kalol Industrial Feeder',
  'Himmatnagar Sub-Division': '11kV Himmatnagar Civil Feeder',
  'Visnagar Sub-Division': '11kV Visnagar Road Feeder'
};

/**
 * Discovers an existing site-inspection work order linked to an application
 * using deterministic priority rules so existing links are reused rather than duplicated.
 */
export function findExistingSiteInspectionWorkOrder(
  app: NewConnectionApplication,
  workOrders: WorkOrder[]
): WorkOrder | undefined {
  if (!app || !Array.isArray(workOrders)) return undefined;

  // 1. Explicit assignedWorkOrderId on the application
  if (app.assignedWorkOrderId) {
    const byAssignedId = workOrders.find(w => w.id === app.assignedWorkOrderId);
    if (byAssignedId) return byAssignedId;
  }

  // 2. Explicit applicationId back-reference on a work order
  const byApplicationId = workOrders.find(w => w.applicationId === app.id);
  if (byApplicationId) return byApplicationId;

  // 3. Canonical generated inspection work-order ID convention
  const canonicalWoId = `WO-INS-${app.id.replace('APP-', '')}`;
  const byCanonicalId = workOrders.find(w => w.id === canonicalWoId);
  if (byCanonicalId) return byCanonicalId;

  // 4. Existing New Connection Verification work order referencing the application ID in its title (e.g. WO-4402)
  const byTitleRef = workOrders.find(
    w => w.type === 'New Connection Verification' && w.title.includes(app.id)
  );
  if (byTitleRef) return byTitleRef;

  return undefined;
}

/**
 * Resolves the field engineer assignee for a site-inspection work order
 * strictly from existing record fields without fabricating staff assignments.
 */
export function resolveSiteInspectionAssignee(
  app: NewConnectionApplication,
  existingWo?: WorkOrder
): string {
  const existingWoAssignee = existingWo?.assignedTo?.trim();
  if (existingWoAssignee && existingWoAssignee !== 'Unassigned') {
    return existingWoAssignee;
  }
  const appEngineer = app.assignedEngineer?.trim();
  if (appEngineer && appEngineer !== 'Unassigned') {
    return appEngineer;
  }
  return 'Unassigned';
}

export interface SiteInspectionWorkOrderResolution {
  workOrder: WorkOrder;
  created: boolean;
  updatedWorkOrders: WorkOrder[];
  assignedWorkOrderId: string;
  assignedEngineer?: string;
}

/**
 * Ensures a linked site-inspection work order exists when an application enters
 * the Site Inspection stage. Reuses any existing linked work order or creates
 * a canonical pending New Connection Verification work order.
 */
export function ensureSiteInspectionWorkOrderForApplication(params: {
  app: NewConnectionApplication;
  workOrders: WorkOrder[];
  actorLabel: string;
  timestamp?: string;
}): SiteInspectionWorkOrderResolution {
  const {
    app,
    workOrders,
    actorLabel,
    timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  } = params;
  const existingWo = findExistingSiteInspectionWorkOrder(app, workOrders);

  if (existingWo) {
    const resolvedAssignee = resolveSiteInspectionAssignee(app, existingWo);
    const needsBacklinkUpdate =
      existingWo.applicationId !== app.id ||
      (existingWo.assignedTo === 'Unassigned' && resolvedAssignee !== 'Unassigned');

    const normalizedWo: WorkOrder = needsBacklinkUpdate
      ? {
          ...existingWo,
          applicationId: app.id,
          assignedTo: resolvedAssignee
        }
      : existingWo;

    const updatedWorkOrders = needsBacklinkUpdate
      ? workOrders.map(w => (w.id === existingWo.id ? normalizedWo : w))
      : workOrders;

    return {
      workOrder: normalizedWo,
      created: false,
      updatedWorkOrders,
      assignedWorkOrderId: normalizedWo.id,
      assignedEngineer: resolvedAssignee !== 'Unassigned' ? resolvedAssignee : app.assignedEngineer
    };
  }

  const preferredWoId = `WO-INS-${app.id.replace('APP-', '')}`;
  const existingIds = new Set(workOrders.map(w => w.id));
  let woId = preferredWoId;
  if (existingIds.has(woId)) {
    let suffix = 2;
    while (existingIds.has(`${preferredWoId}-${suffix}`)) {
      suffix += 1;
    }
    woId = `${preferredWoId}-${suffix}`;
  }

  const assignedTo = resolveSiteInspectionAssignee(app);
  const existingSubdivisionFeeder = workOrders.find(
    w => w.subdivision === app.subdivision && w.feederName
  )?.feederName;
  const feederName =
    existingSubdivisionFeeder ||
    SUBDIVISION_DEFAULT_FEEDER_MAP[app.subdivision] ||
    '11kV Visnagar Road Feeder';

  const newWo: WorkOrder = {
    id: woId,
    title: `Site Feasibility & Meter Load Inspection (${app.id})`,
    type: 'New Connection Verification',
    subdivision: app.subdivision,
    feederName,
    location: `${app.applicantName}, ${app.address}`,
    gpsCoordinates: { lat: 23.6042, lng: 72.3995 },
    consumerName: app.applicantName,
    priority: 'High',
    scheduledDate: '15-Oct-2026',
    status: 'Pending',
    assignedTo,
    materialsNeeded: ['Earthing Resistance Meter', 'GPS Geotag Camera', 'Digital Clamp Meter'],
    applicationId: app.id,
    actionHistory: [
      {
        timestamp,
        stage: 'Pending',
        actor: actorLabel,
        notes:
          assignedTo !== 'Unassigned'
            ? `Auto-dispatched site inspection work order for ${app.id} (${app.requestedLoadKw} kW ${app.category}) to ${assignedTo}.`
            : `Auto-created site inspection work order for ${app.id} (${app.requestedLoadKw} kW ${app.category}) pending field engineer assignment.`
      }
    ]
  };

  return {
    workOrder: newWo,
    created: true,
    updatedWorkOrders: [newWo, ...workOrders],
    assignedWorkOrderId: newWo.id,
    assignedEngineer: assignedTo !== 'Unassigned' ? assignedTo : app.assignedEngineer
  };
}

/**
 * Reconciles bidirectional links between applications and existing New Connection Verification
 * work orders without creating new records or mutating input arrays.
 */
export function reconcileApplicationWorkOrderLinks(
  applications: NewConnectionApplication[],
  workOrders: WorkOrder[]
): { applications: NewConnectionApplication[]; workOrders: WorkOrder[] } {
  let nextWorkOrders = [...workOrders];
  let woChanged = false;

  const nextApplications = applications.map(app => {
    const existingWo = findExistingSiteInspectionWorkOrder(app, nextWorkOrders);
    if (!existingWo) return app;

    if (existingWo.applicationId !== app.id) {
      nextWorkOrders = nextWorkOrders.map(w =>
        w.id === existingWo.id ? { ...w, applicationId: app.id } : w
      );
      woChanged = true;
    }

    if (app.assignedWorkOrderId !== existingWo.id) {
      return {
        ...app,
        assignedWorkOrderId: existingWo.id
      };
    }
    return app;
  });

  return {
    applications: nextApplications,
    workOrders: woChanged ? nextWorkOrders : workOrders
  };
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
   * Update an application's lifecycle status with role checking & transition validation.
   * When targetStatus is 'Site Inspection', ensures a linked site-inspection work order
   * is reused or automatically created.
   */
  async updateApplicationStatus(
    callerRole: UserRole,
    application: NewConnectionApplication,
    targetStatus: NewConnectionApplication['status'],
    note?: string,
    workOrders: WorkOrder[] = []
  ): Promise<
    ApiResponse<NewConnectionApplication> & {
      workOrder?: WorkOrder;
      workOrderCreated?: boolean;
      workOrders?: WorkOrder[];
    }
  > {
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

    const timestampStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const actorLabel = `Authorized Officer (${callerRole.toUpperCase()})`;

    let woResolution: SiteInspectionWorkOrderResolution | undefined;
    if (targetStatus === 'Site Inspection') {
      woResolution = ensureSiteInspectionWorkOrderForApplication({
        app: application,
        workOrders,
        actorLabel,
        timestamp: timestampStr
      });
    }

    const updatedApp: NewConnectionApplication = {
      ...application,
      status: targetStatus,
      workflowStep: stepMap[targetStatus],
      ...(woResolution
        ? {
            assignedWorkOrderId: woResolution.assignedWorkOrderId,
            ...(woResolution.assignedEngineer
              ? { assignedEngineer: woResolution.assignedEngineer }
              : {})
          }
        : {}),
      notesHistory: note
        ? [
            ...application.notesHistory,
            {
              timestamp: timestampStr,
              author: actorLabel,
              note
            }
          ]
        : application.notesHistory
    };

    return {
      success: true,
      data: updatedApp,
      workOrder: woResolution?.workOrder,
      workOrderCreated: woResolution?.created,
      workOrders: woResolution?.updatedWorkOrders,
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
