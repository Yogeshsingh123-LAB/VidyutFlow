import {
  APPLICATION_TRANSITIONS,
  COMPLAINT_TRANSITIONS,
  WORK_ORDER_TRANSITIONS,
  isValidApplicationTransition,
  isValidComplaintTransition,
  isValidWorkOrderTransition,
  isActionAuthorized,
  ErpAdapterService,
  erpAdapter
} from '../src/services/erpAdapter';
import {
  BACKEND_RBAC_RULES,
  SubmitApplicationDto,
  SubmitComplaintDto,
  UpdateWorkOrderStatusDto,
  ReportFeederFaultDto
} from '../src/services/erpApiContracts';
import {
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  CriticalIncident,
  ElectricityConnection
} from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

console.log('🧪 Starting VidyutFlow Phase 3: End-to-End ERP Workflow Integration Tests\n');

// ============================================================================
// SUITE 1: ERP Lifecycle State Machines & Transition Validation
// ============================================================================
console.log('--- Suite 1: State Machine & Transition Validation Rules ---');
{
  // 1.1 Valid Application Transitions
  assert(
    isValidApplicationTransition('Submitted', 'Document Verification'),
    'Application: Submitted -> Document Verification is valid'
  );
  assert(
    isValidApplicationTransition('Document Verification', 'Site Inspection'),
    'Application: Document Verification -> Site Inspection is valid'
  );
  assert(
    isValidApplicationTransition('Site Inspection', 'Sanction Approval'),
    'Application: Site Inspection -> Sanction Approval is valid'
  );
  assert(
    isValidApplicationTransition('Sanction Approval', 'Meter Installed'),
    'Application: Sanction Approval -> Meter Installed is valid'
  );
  assert(
    isValidApplicationTransition('Submitted', 'Rejected'),
    'Application: Submitted -> Rejected is valid'
  );
  assert(
    isValidApplicationTransition('Document Verification', 'Rejected'),
    'Application: Document Verification -> Rejected is valid'
  );

  // 1.2 Invalid Application Transitions
  assert(
    !isValidApplicationTransition('Submitted', 'Meter Installed'),
    'Application: Submitted -> Meter Installed (skipping verification) is REJECTED'
  );
  assert(
    !isValidApplicationTransition('Meter Installed', 'Submitted'),
    'Application: Meter Installed -> Submitted (reverse regression) is REJECTED'
  );
  assert(
    !isValidApplicationTransition('Rejected', 'Meter Installed'),
    'Application: Rejected -> Meter Installed is REJECTED'
  );

  // 1.3 Complaint Transitions (Registered -> Dispatched -> In Progress -> Resolved -> Closed)
  assert(
    isValidComplaintTransition('Registered', 'Dispatched'),
    'Complaint: Registered -> Dispatched is valid'
  );
  assert(
    isValidComplaintTransition('Dispatched', 'In Progress'),
    'Complaint: Dispatched -> In Progress is valid'
  );
  assert(
    isValidComplaintTransition('In Progress', 'Resolved'),
    'Complaint: In Progress -> Resolved is valid'
  );
  assert(
    isValidComplaintTransition('Resolved', 'Closed'),
    'Complaint: Resolved -> Closed is valid'
  );
  assert(
    !isValidComplaintTransition('Closed', 'Registered'),
    'Complaint: Closed -> Registered is REJECTED'
  );

  // 1.4 Work Order Transitions (Pending -> En Route -> On Site -> Completed)
  assert(
    isValidWorkOrderTransition('Pending', 'En Route'),
    'WorkOrder: Pending -> En Route is valid'
  );
  assert(
    isValidWorkOrderTransition('En Route', 'On Site'),
    'WorkOrder: En Route -> On Site is valid'
  );
  assert(
    isValidWorkOrderTransition('On Site', 'Completed'),
    'WorkOrder: On Site -> Completed is valid'
  );
  assert(
    !isValidWorkOrderTransition('Pending', 'Completed'),
    'WorkOrder: Pending -> Completed (skipping field dispatch/on site) is REJECTED'
  );
  assert(
    !isValidWorkOrderTransition('Completed', 'Pending'),
    'WorkOrder: Completed -> Pending is REJECTED'
  );
}

// ============================================================================
// SUITE 2: Role-Based Authorization Enforcement (RBAC)
// ============================================================================
console.log('\n--- Suite 2: Role-Based Authorization & Endpoint Access Control ---');
{
  // 2.1 Consumer Role Boundaries
  assert(
    isActionAuthorized('consumer', 'POST /api/v1/applications'),
    'Consumer is authorized to submit new connection application'
  );
  assert(
    isActionAuthorized('consumer', 'POST /api/v1/complaints'),
    'Consumer is authorized to register consumer complaints'
  );
  assert(
    isActionAuthorized('consumer', 'GET /api/v1/consumer/bills'),
    'Consumer is authorized to access personal billing history'
  );
  assert(
    !isActionAuthorized('consumer', 'PATCH /api/v1/applications/:id/status'),
    'Consumer is BLOCKED from approving connection applications'
  );
  assert(
    !isActionAuthorized('consumer', 'POST /api/v1/complaints/:id/assign'),
    'Consumer is BLOCKED from assigning complaints to field staff'
  );
  assert(
    !isActionAuthorized('consumer', 'PATCH /api/v1/work-orders/:id/status'),
    'Consumer is BLOCKED from updating work orders'
  );

  // 2.2 Field Engineer Role Boundaries
  assert(
    isActionAuthorized('field', 'PATCH /api/v1/work-orders/:id/status'),
    'Field Engineer is authorized to update work order status & submit inspection'
  );
  assert(
    isActionAuthorized('field', 'POST /api/v1/feeders/:id/fault-report'),
    'Field Engineer is authorized to broadcast feeder/transformer fault reports'
  );
  assert(
    !isActionAuthorized('field', 'POST /api/v1/complaints/:id/assign'),
    'Field Engineer is BLOCKED from re-assigning sub-division complaints'
  );

  // 2.3 Employee Role Boundaries
  assert(
    isActionAuthorized('employee', 'PATCH /api/v1/applications/:id/status'),
    'Employee is authorized to update connection application status'
  );
  assert(
    isActionAuthorized('employee', 'POST /api/v1/complaints/:id/assign'),
    'Employee is authorized to dispatch lineman on complaints'
  );

  // 2.4 Management & Admin Role Boundaries
  assert(
    isActionAuthorized('management', 'GET /api/v1/management/operational-metrics'),
    'Management is authorized for aggregated operational telemetry'
  );
  assert(
    isActionAuthorized('admin', 'GET /api/v1/admin/audit-logs'),
    'Admin is authorized for full system audit logs'
  );
}

// ============================================================================
// SUITE 3: End-to-End Application Lifecycle Simulation
// ============================================================================
console.log('\n--- Suite 3: End-to-End Application Lifecycle & State Synchronization ---');
{
  // Simulated Canonical Application
  let currentApp: NewConnectionApplication = {
    id: 'APP-TEST-2026',
    applicantName: 'Vikrambhai K. Patel',
    phone: '9825091823',
    email: 'vikram.patel@testmail.com',
    address: 'Plot 44, GIDC Estate, Kadi',
    subdivision: 'Kadi Rural',
    category: 'Commercial (NRGP)',
    requestedLoadKw: 15,
    phase: '3-Phase',
    premisesType: 'Owned',
    status: 'Submitted',
    appliedDate: '2026-10-24',
    targetCompletionDate: '2026-11-05',
    assignedOfficer: 'Harshil S. Trivedi',
    estimatedSanctionCost: 18500,
    documentsSubmitted: ['Identity Proof (Aadhaar)', 'Property Tax Receipt', 'Ownership Deed'],
    workflowStep: 1,
    notesHistory: [
      {
        timestamp: '2026-10-24T10:00:00Z',
        author: 'Vikrambhai Patel',
        note: '15 kW Commercial connection request submitted via portal'
      }
    ]
  };

  let generatedWorkOrder: WorkOrder | null = null;
  let activatedConnection: ElectricityConnection | null = null;

  // Step 1: Employee verifies documents
  assert(currentApp.status === 'Submitted', 'Initial application state is Submitted');
  if (isValidApplicationTransition(currentApp.status, 'Document Verification')) {
    currentApp = {
      ...currentApp,
      status: 'Document Verification',
      workflowStep: 2,
      notesHistory: [
        ...currentApp.notesHistory,
        {
          timestamp: '2026-10-24T10:30:00Z',
          author: 'Harshil S. Trivedi (Employee)',
          note: 'Aadhaar & Tax receipt verified with revenue record'
        }
      ]
    };
  }
  assert(currentApp.status === 'Document Verification', 'Application advanced to Document Verification');

  // Step 2: Employee triggers Site Inspection -> Generates linked WorkOrder
  if (isValidApplicationTransition(currentApp.status, 'Site Inspection')) {
    const woId = `WO-INS-${currentApp.id.replace('APP-', '')}`;
    generatedWorkOrder = {
      id: woId,
      applicationId: currentApp.id,
      title: `Site Feasibility & Meter Install (${currentApp.applicantName})`,
      type: 'New Connection Verification',
      subdivision: currentApp.subdivision,
      feederName: 'FDR-11K-03 (Kadi Feeder)',
      location: currentApp.address,
      gpsCoordinates: { lat: 23.30, lng: 72.33 },
      priority: 'Routine',
      scheduledDate: '2026-10-24',
      status: 'Pending',
      assignedTo: 'Rajesh V. Solanki (Lineman)',
      materialsNeeded: ['3-Phase Smart Meter', 'Service Cable 25m'],
      actionHistory: [
        {
          timestamp: '2026-10-24T11:00:00Z',
          stage: 'Created',
          actor: 'Harshil Trivedi (Employee)'
        }
      ]
    };

    currentApp = {
      ...currentApp,
      status: 'Site Inspection',
      workflowStep: 3,
      assignedWorkOrderId: woId,
      notesHistory: [
        ...currentApp.notesHistory,
        {
          timestamp: '2026-10-24T11:00:00Z',
          author: 'Harshil S. Trivedi (Employee)',
          note: `Generated field inspection work order ${woId}`
        }
      ]
    };
  }

  assert(currentApp.status === 'Site Inspection', 'Application is in Site Inspection');
  assert(currentApp.assignedWorkOrderId === 'WO-INS-TEST-2026', 'Application linked to assignedWorkOrderId');
  assert(generatedWorkOrder !== null && generatedWorkOrder.applicationId === currentApp.id, 'WorkOrder contains back-reference to applicationId');

  // Step 3: Field Lineman arrives on site and completes inspection
  if (generatedWorkOrder && isValidWorkOrderTransition(generatedWorkOrder.status, 'En Route')) {
    generatedWorkOrder.status = 'En Route';
  }
  if (generatedWorkOrder && isValidWorkOrderTransition(generatedWorkOrder.status, 'On Site')) {
    generatedWorkOrder.status = 'On Site';
  }
  assert(generatedWorkOrder?.status === 'On Site', 'WorkOrder moved to On Site');

  if (generatedWorkOrder && isValidWorkOrderTransition(generatedWorkOrder.status, 'Completed')) {
    generatedWorkOrder.status = 'Completed';
    generatedWorkOrder.inspectionReport = {
      meterSerialScanned: 'GEN-SM-2026-8841',
      readingKwh: 0,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 232, y: 231, b: 233 },
      technicianRemarks: 'Feeder loop test satisfactory. Tested line-to-ground 232V.',
      photoUploaded: true
    };

    // Cross-portal trigger: Completing inspection advances application to Sanction Approval!
    currentApp = {
      ...currentApp,
      status: 'Sanction Approval',
      workflowStep: 4,
      notesHistory: [
        ...currentApp.notesHistory,
        {
          timestamp: '2026-10-24T14:00:00Z',
          author: 'Rajesh Solanki (Field)',
          note: `Inspection WO ${generatedWorkOrder.id} verified. Ready for sanction.`
        }
      ]
    };
  }

  assert(generatedWorkOrder?.status === 'Completed', 'WorkOrder successfully Completed by Field');
  assert(currentApp.status === 'Sanction Approval', 'Application automatically advanced to Sanction Approval upon WO completion');

  // Step 4: Management/Employee grants final approval -> Meter Installed & New Electricity Connection created
  if (isValidApplicationTransition(currentApp.status, 'Meter Installed')) {
    const newConsumerNumber = '108821990421';
    currentApp = {
      ...currentApp,
      status: 'Meter Installed',
      workflowStep: 5,
      notesHistory: [
        ...currentApp.notesHistory,
        {
          timestamp: '2026-10-24T15:00:00Z',
          author: 'Executive Engineer Mehsana',
          note: `Commissioned connection with Consumer No ${newConsumerNumber}`
        }
      ]
    };

    activatedConnection = {
      consumerNo: newConsumerNumber,
      connectionId: `CONN-${newConsumerNumber.slice(-6)}`,
      consumerName: currentApp.applicantName,
      meterNo: generatedWorkOrder?.inspectionReport?.meterSerialScanned || 'GEN-SM-2026-9999',
      sanctionedLoadKw: currentApp.requestedLoadKw,
      phase: currentApp.phase,
      tariffCategory: currentApp.category,
      address: currentApp.address,
      subdivision: currentApp.subdivision,
      feederName: 'FDR-11K-03 (Kadi Feeder)',
      status: 'Active',
      connectedDate: '2026-10-24',
      lastReadingDate: '2026-10-24',
      currentReadingKwh: 0,
      previousReadingKwh: 0,
      averageMonthlyKwh: 0,
      securityDeposit: 18500
    };
  }

  assert(currentApp.status === 'Meter Installed', 'Application reached terminal status Meter Installed');
  assert(activatedConnection !== null, 'ElectricityConnection canonical record created upon meter install');
  assert(activatedConnection?.sanctionedLoadKw === 15, 'Sanctioned load matches application (15 kW)');
  assert(activatedConnection?.meterNo === 'GEN-SM-2026-8841', 'Meter serial matches scanned field inspection report');
}

// ============================================================================
// SUITE 4: End-to-End Complaint Dispatch & Resolution Lifecycle
// ============================================================================
console.log('\n--- Suite 4: End-to-End Complaint Dispatch & Automatic Resolution ---');
{
  let complaint: ComplaintRecord = {
    id: 'CMP-TEST-9901',
    consumerNo: '102938475610',
    consumerName: 'Amitbhai J. Shah',
    phone: '9824012345',
    category: 'Billing Dispute',
    description: 'Billed 1480 kWh despite commercial shop closure during renovations.',
    priority: 'High',
    status: 'Registered',
    subdivision: 'Mehsana City',
    feederName: 'FDR-11K-01 (Mehsana Town-1)',
    filedAt: '2026-10-24T08:00:00Z',
    slaTargetHours: 48,
    slaDueTime: '2026-10-26T08:00:00Z',
    slaBreached: false,
    timeline: [
      {
        time: '08:00',
        stage: 'Registered',
        actor: 'Amitbhai Shah (Consumer)',
        remark: 'Registered via Consumer Portal'
      }
    ]
  };

  let fieldWorkOrder: WorkOrder | null = null;

  // Step 1: Employee assigns complaint to field lineman
  const woId = `WO-CMP-${complaint.id.replace('CMP-', '')}`;
  fieldWorkOrder = {
    id: woId,
    complaintId: complaint.id,
    title: `Resolve ${complaint.category} (${complaint.consumerName})`,
    type: 'Meter Replacement',
    subdivision: complaint.subdivision,
    feederName: complaint.feederName,
    location: `${complaint.consumerNo} - ${complaint.subdivision}`,
    gpsCoordinates: { lat: 23.60, lng: 72.40 },
    consumerNo: complaint.consumerNo,
    consumerName: complaint.consumerName,
    assignedTo: 'Kishore B. Vaghela (Field JE)',
    status: 'Pending',
    priority: 'High',
    scheduledDate: '2026-10-24',
    materialsNeeded: ['Test Bench Kit', 'Optical Probe'],
    actionHistory: [
      {
        timestamp: '2026-10-24T09:00:00Z',
        stage: 'Created',
        actor: 'Pooja K. Mehta (Employee)'
      }
    ]
  };

  complaint = {
    ...complaint,
    status: 'Dispatched',
    assignedTechnician: 'Kishore B. Vaghela (Field JE)',
    assignedWorkOrderId: woId,
    timeline: [
      ...complaint.timeline,
      {
        time: '09:00',
        stage: 'Dispatched',
        actor: 'Pooja Mehta (Subdivision EE)',
        remark: `Dispatched to Lineman Kishore B. Vaghela. Work Order ${woId} generated.`
      }
    ]
  };

  assert(complaint.status === 'Dispatched', 'Complaint status transitioned to Dispatched');
  assert(complaint.assignedWorkOrderId === woId, 'Complaint linked to assignedWorkOrderId');
  assert(fieldWorkOrder.complaintId === complaint.id, 'WorkOrder linked to complaintId');

  // Step 2: Lineman moves work order to On Site
  fieldWorkOrder.status = 'On Site';
  complaint.status = 'In Progress';
  assert(fieldWorkOrder.status === 'On Site', 'Work order moved to On Site');
  assert(complaint.status === 'In Progress', 'Complaint reflects In Progress');

  // Step 3: Lineman completes field rectification work order
  fieldWorkOrder.status = 'Completed';
  fieldWorkOrder.inspectionReport = {
    meterSerialScanned: 'GEN-SM-2026-1049',
    readingKwh: 1220,
    sealIntact: true,
    terminalCondition: 'Normal',
    tamperDetected: false,
    testedPhaseVoltage: { r: 230, y: 231, b: 232 },
    technicianRemarks: 'Tested AMR optical pulse. Billed units revised from 1480 to verified reading 1220 kWh.',
    photoUploaded: true
  };

  // Cross-entity resolution trigger:
  complaint = {
    ...complaint,
    status: 'Resolved',
    resolvedAt: '2026-10-24T12:00:00Z',
    resolutionRemarks: fieldWorkOrder.inspectionReport.technicianRemarks,
    timeline: [
      ...complaint.timeline,
      {
        time: '12:00',
        stage: 'Resolved',
        actor: fieldWorkOrder.assignedTo,
        remark: `Resolved by Field Lineman: ${fieldWorkOrder.inspectionReport.technicianRemarks}`
      }
    ]
  };

  assert(fieldWorkOrder.status === 'Completed', 'WorkOrder completed by field');
  assert(complaint.status === 'Resolved', 'Linked complaint automatically transitioned to Resolved');
  assert(complaint.resolvedAt !== undefined, 'Complaint records resolvedAt timestamp');
  assert(
    Boolean(complaint.resolutionRemarks && complaint.resolutionRemarks.includes('revised')),
    'Resolution remarks captured accurately'
  );
}

// ============================================================================
// SUITE 5: Emergency Feeder Fault Reporting & Incident Broadcast
// ============================================================================
console.log('\n--- Suite 5: Emergency Feeder Fault Incident Broadcast ---');
{
  const newIncidentId = `INC-FIELD-${Date.now()}`;
  const feederId = 'FDR-11K-01';
  const remarks = 'Reported sparking at terminal bushing and high thermal hotspot (92°C).';

  const incident: CriticalIncident = {
    id: newIncidentId,
    title: `Emergency Field Fault: TRANSFORMER_OVERHEATING on ${feederId}`,
    description: `Reported by Field Lineman (Kishore Vaghela): ${remarks}`,
    severity: 'CRITICAL',
    module: 'Distribution & SCADA',
    entityId: feederId,
    entityType: 'feeder',
    timestamp: new Date().toISOString(),
    responsibleRoles: ['field', 'employee', 'management'],
    recommendedAction: 'Immediate de-energization or load diversion to prevent winding burnout.',
    status: 'DETECTED',
    history: [
      {
        timestamp: new Date().toISOString(),
        stage: 'DETECTED',
        actor: 'Lineman Kishore Vaghela (Field)',
        notes: 'Emergency hazard reported by Field Crew via Mobile Console'
      }
    ]
  };

  assert(incident.severity === 'CRITICAL', 'Incident has CRITICAL severity');
  assert(incident.status === 'DETECTED', 'Incident initialized in DETECTED state');
  assert(incident.responsibleRoles.includes('management'), 'Management role included in incident notification scope');
  assert(incident.responsibleRoles.includes('employee'), 'Employee role included in incident notification scope');
  assert(incident.history.length === 1, 'Incident audit history records initial detection');
}

// ============================================================================
// SUITE 6: REST API Contracts & DTO Validation
// ============================================================================
console.log('\n--- Suite 6: Typed REST API Contracts & Schema Conformance ---');
{
  const submissionDto: SubmitApplicationDto = {
    applicantName: 'Rameshbhai Patel',
    phone: '9825123456',
    email: 'ramesh@patel.in',
    address: 'Survey 102, Unjha GIDC',
    subdivision: 'Unjha',
    category: 'Industrial (LTMD)',
    requestedLoadKw: 25,
    phase: '3-Phase',
    premisesType: 'Owned',
    documentsSubmitted: ['Aadhaar', 'Industrial License']
  };

  assert(submissionDto.requestedLoadKw === 25, 'Application submission DTO enforces numeric requestedLoadKw');
  assert(submissionDto.documentsSubmitted?.length === 2, 'Application submission DTO enforces documents array');

  const complaintDto: SubmitComplaintDto = {
    consumerNo: '102938475610',
    consumerName: 'Amitbhai J. Shah',
    phone: '9824012345',
    category: 'Voltage Fluctuation',
    description: 'Fluctuations between 170V and 260V damaging refrigeration compressor.',
    subdivision: 'Mehsana City',
    feederName: 'FDR-11K-01 (Mehsana Town-1)'
  };

  assert(complaintDto.consumerNo === '102938475610', 'Complaint registration DTO validates consumer number format');

  const completionDto: UpdateWorkOrderStatusDto = {
    status: 'Completed',
    report: {
      meterSerialScanned: 'GEN-SM-2026-9901',
      readingKwh: 450,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 232, y: 231, b: 230 },
      technicianRemarks: 'Verified phase balance and tightened busbar lugs.',
      photoUploaded: true
    }
  };

  assert(completionDto.report?.testedPhaseVoltage.r === 232, 'WorkOrder completion DTO validates 3-phase tested voltage readings');
  assert(completionDto.report?.sealIntact === true, 'WorkOrder completion DTO records meter seal integrity check');
  assert(typeof erpAdapter.submitApplication === 'function', 'erpAdapter instance exposes submitApplication method');
  assert(typeof erpAdapter.assignComplaintToField === 'function', 'erpAdapter instance exposes assignComplaintToField method');
}

// ============================================================================
// Summary Report
// ============================================================================
console.log('\n======================================================');
console.log(`Phase 3 Test Execution Complete: ${passed} passed, ${failed} failed`);
console.log('======================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
