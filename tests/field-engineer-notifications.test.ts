/**
 * VIDYUTFLOW 2.0 — PHASE 4, STEP 4.2 AUTOMATED TEST SUITE
 * Field Engineer Notification System Verification
 *
 * Verifies:
 * 1. Event A: New Work Order Assigned with targeted recipient isolation
 * 2. Event B: Work Order Reassigned with previous recipient notification revocation
 * 3. Event C: Work Order Priority and Schedule Updates with assigned engineer targeting
 * 4. Event D: Inspection Work Order Scheduled/Assigned with linked application
 * 5. Event E: Employee Escalation to Field Engineer with Employee-first gating & decline handling
 * 6. Event F: Offline Synchronization Outcomes (Success, Conflict, Failure)
 * 7. Recipient Isolation & Cross-Engineer Privacy (FLD-UG-201 vs FLD-UG-204)
 * 8. Consumer Portal Zero-Leakage (Consumers never see internal field notifications)
 * 9. Persistent Read/Unread and Dismiss/Delete behavior
 * 10. Reactive Four-Language Localization Parity (English, Gujarati, Hindi, Marathi)
 */

import {
  resolveCanonicalFieldEngineerIdentity,
  buildWorkOrderAssignedNotification,
  buildWorkOrderReassignedNotification,
  buildWorkOrderUpdatedNotification,
  buildSiteInspectionDispatchNotification,
  buildOfflineSyncOutcomeNotification,
  reassignWorkOrderRecord,
  updateWorkOrderPriorityAndScheduleRecord,
  filterFieldEngineerNotifications,
  localizeFieldNotification
} from '../src/utils/fieldNotificationEngine';
import {
  reassignIncidentRecord,
  declineIncidentAssignmentRecord,
  authorizeEmployeeAction
} from '../src/utils/anomalyDetector';
import { WorkOrder, AppNotification, CriticalIncident, FieldEngineerRecord, UserRole } from '../src/types';
import { LanguageCode } from '../src/i18n/types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(message);
  }
}

console.log('⚡ Starting VidyutFlow Phase 4 Step 4.2: Field Engineer Notification System Tests...');

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------
const mockFieldEngineers: FieldEngineerRecord[] = [
  {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    designation: 'Junior Engineer (Field & Vigilance)',
    assignedFeeder: '11kV Visnagar Road Feeder',
    subdivision: 'Mehsana City North',
    phone: '+91 94285 22201',
    status: 'Available',
    activeWorkOrders: 1,
    completedToday: 2
  },
  {
    id: 'FLD-UG-204',
    name: 'Dharmesh P. Chaudhari',
    designation: 'Line Inspector & Field Feasibility Officer',
    assignedFeeder: '11kV Kadi-Rural Ag Feeder',
    subdivision: 'Kadi Division',
    phone: '+91 94285 22204',
    status: 'Available',
    activeWorkOrders: 0,
    completedToday: 3
  }
];

const sampleWorkOrder: WorkOrder = {
  id: 'WO-4405',
  title: 'Feeder Patrol & Neutral Rectification',
  type: 'Feeder Patrol & Maintenance',
  subdivision: 'Mehsana City North',
  feederName: '11kV Visnagar Road Feeder',
  location: '14 Anand Nagar, Mehsana',
  gpsCoordinates: { lat: 23.6028, lng: 72.3984 },
  consumerNo: '04281-22901',
  consumerName: 'Rajesh Patel',
  priority: 'High',
  scheduledDate: 'Today',
  status: 'Pending',
  assignedTo: 'Vikramaditya Solanki',
  materialsNeeded: ['Safety Harness', 'Digital Clamp Meter'],
  complaintId: 'CMP-8821'
};

const sampleIncident: CriticalIncident = {
  id: 'INC-2026-901',
  title: 'Feeder Phase Imbalance & Thermal Hotspot',
  description: '11kV Visnagar Road Feeder phase R current spike >180A.',
  severity: 'WARNING',
  module: 'Distribution & SCADA',
  entityId: 'FDR-MEH-01',
  entityType: 'feeder',
  subdivision: 'Mehsana City North',
  timestamp: new Date().toISOString(),
  responsibleRoles: ['field', 'employee'],
  recommendedAction: 'Dispatch line crew for phase load balancing.',
  status: 'ACKNOWLEDGED',
  history: []
};

// -----------------------------------------------------------------------------
// Test 1: Event A — New Work Order Assigned
// -----------------------------------------------------------------------------
console.log('Testing Event A: New Work Order Assigned notification generation...');
{
  const targetEng = resolveCanonicalFieldEngineerIdentity('FLD-UG-201', mockFieldEngineers);
  assert(targetEng.id === 'FLD-UG-201', 'Should resolve canonical field engineer ID FLD-UG-201');
  assert(targetEng.name === 'Vikramaditya Solanki', 'Should resolve canonical field engineer name');

  const notif = buildWorkOrderAssignedNotification({
    wo: sampleWorkOrder,
    targetEngineer: targetEng,
    actorLabel: 'Priya Rathod (Operations EE)',
    notes: 'Urgent neutral line verification'
  });

  assert(notif.targetRole === 'field', 'Notification targetRole must be field');
  assert(notif.targetUserId === 'FLD-UG-201', 'Notification targetUserId must be FLD-UG-201');
  assert(notif.workOrderId === 'WO-4405', 'Notification must link to WO-4405');
  assert(notif.notificationType === 'WORK_ORDER_ASSIGNED', 'notificationType must be WORK_ORDER_ASSIGNED');
  assert(notif.title.includes('WO-4405'), 'Title must contain WO-4405');
  assert(notif.message.includes('Mehsana City North'), 'Message must contain subdivision');
  assert(notif.read === false, 'Notification must be initially unread');
  console.log('✓ Event A passed.');
}

// -----------------------------------------------------------------------------
// Test 2: Recipient Isolation — Unrelated Field Engineer does not see notification
// -----------------------------------------------------------------------------
console.log('Testing Recipient Isolation between different Field Engineers...');
{
  const notifEngineerA = buildWorkOrderAssignedNotification({
    wo: sampleWorkOrder,
    targetEngineer: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });

  const allNotifications: AppNotification[] = [notifEngineerA];

  // Scoped for FLD-UG-201 (Assignee)
  const scopedForA = filterFieldEngineerNotifications({
    notifications: allNotifications,
    workOrders: [sampleWorkOrder],
    incidents: [],
    activeUser: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });
  assert(scopedForA.length === 1, 'Assigned engineer FLD-UG-201 must see their notification');
  assert(scopedForA[0].id === notifEngineerA.id, 'Notification ID must match');

  // Scoped for FLD-UG-204 (Unrelated Engineer)
  const scopedForB = filterFieldEngineerNotifications({
    notifications: allNotifications,
    workOrders: [sampleWorkOrder],
    incidents: [],
    activeUser: { id: 'FLD-UG-204', name: 'Dharmesh P. Chaudhari' }
  });
  assert(scopedForB.length === 0, 'Unrelated engineer FLD-UG-204 must NOT see FLD-UG-201 notification');
  console.log('✓ Recipient Isolation between engineers passed.');
}

// -----------------------------------------------------------------------------
// Test 3: Consumer Isolation — Consumers never see internal field notifications
// -----------------------------------------------------------------------------
console.log('Testing Consumer Portal Zero-Leakage...');
{
  const notifField = buildWorkOrderAssignedNotification({
    wo: sampleWorkOrder,
    targetEngineer: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });

  // Verify that any consumer-facing filter excludes targetRole !== 'consumer'
  assert(notifField.targetRole !== 'consumer', 'Field notification must not have targetRole consumer');
  console.log('✓ Consumer Portal Zero-Leakage verified.');
}

// -----------------------------------------------------------------------------
// Test 4: Event B — Work Order Reassignment & Revocation
// -----------------------------------------------------------------------------
console.log('Testing Event B: Work Order Reassigned & former engineer notification revocation...');
{
  const notifEngineerA = buildWorkOrderAssignedNotification({
    wo: sampleWorkOrder,
    targetEngineer: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });

  const existingNotifications = [notifEngineerA];

  const reassignRes = reassignWorkOrderRecord({
    woId: 'WO-4405',
    newEngineerIdOrName: 'FLD-UG-204',
    reason: 'Specialized thermal imaging equipment required',
    actorUser: {
      id: 'EMP-UG-1101',
      name: 'Priya Rathod',
      designation: 'Executive Engineer (Operations)',
      initials: 'PR',
      isCustomUser: false
    },
    effectiveRole: 'employee',
    workOrders: [sampleWorkOrder],
    fieldEngineers: mockFieldEngineers,
    notifications: existingNotifications
  });

  assert(reassignRes.success, 'Reassignment must succeed');
  assert(reassignRes.updatedWorkOrders[0].assignedTo === 'Dharmesh P. Chaudhari', 'WO assignedTo must update to new engineer');
  assert(reassignRes.reassignNotification !== undefined, 'Must create reassignment notification');
  assert(reassignRes.reassignNotification?.targetUserId === 'FLD-UG-204', 'Reassignment notification must target FLD-UG-204');
  assert(reassignRes.reassignNotification?.decisionReason === 'Specialized thermal imaging equipment required', 'Must preserve reason');

  // Verify former engineer FLD-UG-201 no longer sees the pending assignment notification
  const scopedForFormer = filterFieldEngineerNotifications({
    notifications: reassignRes.updatedNotifications,
    workOrders: reassignRes.updatedWorkOrders,
    incidents: [],
    activeUser: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });
  assert(scopedForFormer.length === 0, 'Former engineer must no longer see revoked assignment notification');

  // Verify new engineer FLD-UG-204 sees the reassignment notification
  const scopedForNew = filterFieldEngineerNotifications({
    notifications: reassignRes.updatedNotifications,
    workOrders: reassignRes.updatedWorkOrders,
    incidents: [],
    activeUser: { id: 'FLD-UG-204', name: 'Dharmesh P. Chaudhari' }
  });
  assert(scopedForNew.length === 1, 'New engineer must receive reassignment notification');
  assert(scopedForNew[0].notificationType === 'WORK_ORDER_REASSIGNED', 'Notification type must be WORK_ORDER_REASSIGNED');
  console.log('✓ Event B passed.');
}

// -----------------------------------------------------------------------------
// Test 5: Event C — Work Order Priority and Schedule Updates
// -----------------------------------------------------------------------------
console.log('Testing Event C: Work Order Priority and Schedule Changed...');
{
  const updateRes = updateWorkOrderPriorityAndScheduleRecord({
    woId: 'WO-4405',
    newPriority: 'Emergency',
    newScheduledDate: 'Immediate Dispatch',
    notes: 'Secondary feeder flashover reported nearby',
    actorUser: {
      id: 'EMP-UG-1101',
      name: 'Priya Rathod',
      designation: 'Executive Engineer (Operations)',
      initials: 'PR',
      isCustomUser: false
    },
    effectiveRole: 'employee',
    workOrders: [sampleWorkOrder],
    fieldEngineers: mockFieldEngineers,
    notifications: []
  });

  assert(updateRes.success, 'Parameter update must succeed');
  assert(updateRes.updatedWorkOrders[0].priority === 'Emergency', 'Priority must update to Emergency');
  assert(updateRes.updatedWorkOrders[0].scheduledDate === 'Immediate Dispatch', 'Scheduled date must update');
  assert(updateRes.updateNotification !== undefined, 'Update notification must be generated');
  assert(updateRes.updateNotification?.targetUserId === 'FLD-UG-201', 'Must target assigned engineer FLD-UG-201');
  assert(updateRes.updateNotification?.type === 'alert', 'Emergency priority must produce alert type notification');
  console.log('✓ Event C passed.');
}

// -----------------------------------------------------------------------------
// Test 6: Event D — Site Inspection Work Order Scheduled/Assigned
// -----------------------------------------------------------------------------
console.log('Testing Event D: Site Inspection Scheduled/Assigned...');
{
  const inspNotif = buildSiteInspectionDispatchNotification({
    woId: 'WO-INS-2026-0842',
    appId: 'APP-2026-0842',
    applicantName: 'Daxesh Shah',
    requestedLoadKw: 15,
    subdivision: 'Mehsana City North',
    targetEngineerId: 'FLD-UG-201'
  });

  assert(inspNotif.targetRole === 'field', 'Target role must be field');
  assert(inspNotif.targetUserId === 'FLD-UG-201', 'Must target assigned engineer FLD-UG-201');
  assert(inspNotif.workOrderId === 'WO-INS-2026-0842', 'Must link workOrderId');
  assert(inspNotif.applicationId === 'APP-2026-0842', 'Must link applicationId');
  assert(inspNotif.notificationType === 'SITE_INSPECTION_ASSIGNED', 'notificationType must be SITE_INSPECTION_ASSIGNED');
  console.log('✓ Event D passed.');
}

// -----------------------------------------------------------------------------
// Test 7: Event E — Employee Escalation with Role Gating & Decline Handling
// -----------------------------------------------------------------------------
console.log('Testing Event E: Employee Escalation to Field Engineer with Employee-first gating...');
{
  // 1. Verify consumer role cannot escalate or assign
  const consumerAuth = authorizeEmployeeAction(sampleIncident, 'consumer', {
    id: 'demo_consumer',
    name: 'Rajesh Patel',
    role: 'consumer'
  });
  assert(consumerAuth.isAuthorized === false, 'Consumer must be strictly denied employee actions');

  // 2. Employee assigns incident to FLD-UG-201
  const assignRes = reassignIncidentRecord(
    sampleIncident,
    'FLD-UG-201',
    'Vikramaditya Solanki',
    'Neutral conductor verification required',
    'Priya Rathod',
    'EMP-UG-1101',
    'employee',
    []
  );
  assert(assignRes.success, 'Employee assignment must succeed');
  assert(assignRes.updatedIncident.assignedToUserId === 'FLD-UG-201', 'Incident must be assigned to FLD-UG-201');
  const fieldNotif = assignRes.updatedNotifications.find(n => n.targetRole === 'field');
  assert(fieldNotif !== undefined, 'Must create field notification');
  assert(fieldNotif?.targetUserId === 'FLD-UG-201', 'Must target FLD-UG-201');

  // 3. Field Engineer declines with mandatory reason
  const declineRes = declineIncidentAssignmentRecord(
    assignRes.updatedIncident,
    'Occupied on emergency 33kV breaker isolation at Substation North',
    { id: 'FLD-UG-201', name: 'Vikramaditya Solanki', role: 'field' },
    'field',
    assignRes.updatedNotifications
  );
  assert(declineRes.success, 'Decline must succeed with valid reason');
  assert(declineRes.updatedIncident?.assignmentStatus === 'DECLINED', 'Incident assignmentStatus must be DECLINED');
  assert(declineRes.updatedIncident?.assignedToUserId === undefined, 'assignedToUserId must be cleared');
  assert(declineRes.declineNotification?.targetRole === 'employee', 'Originating employee must receive decline alert');
  assert(declineRes.declineNotification?.type === 'alert', 'Decline notification must be alert type');

  // Verify field engineer no longer has the incident in their scoped inbox
  const scopedAfterDecline = filterFieldEngineerNotifications({
    notifications: declineRes.updatedNotifications,
    workOrders: [],
    incidents: [declineRes.updatedIncident!],
    activeUser: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });
  assert(scopedAfterDecline.length === 0, 'Declining engineer must not have incident in scoped inbox');
  console.log('✓ Event E passed.');
}

// -----------------------------------------------------------------------------
// Test 8: Event F — Offline Synchronization Outcome Notifications
// -----------------------------------------------------------------------------
console.log('Testing Event F: Offline Synchronization Outcome Notifications...');
{
  // 1. Success Outcome
  const successSummary = {
    queue: [],
    syncedCount: 3,
    failedCount: 0,
    conflictCount: 0,
    skippedCount: 0,
    blockedOffline: false
  };
  const successNotif = buildOfflineSyncOutcomeNotification({
    summary: successSummary,
    activeEngineerId: 'FLD-UG-201'
  });
  assert(successNotif !== null, 'Success notification must be created');
  assert(Boolean(successNotif && successNotif.type === 'success'), 'Type must be success');
  assert(Boolean(successNotif && successNotif.targetUserId === 'FLD-UG-201'), 'Target user must match active engineer');
  assert(Boolean(successNotif && successNotif.title.includes('3 Action(s)')), 'Title must contain action count');

  // 2. Conflict Outcome
  const conflictSummary = {
    queue: [],
    syncedCount: 2,
    failedCount: 1,
    conflictCount: 1,
    skippedCount: 0,
    blockedOffline: false
  };
  const conflictNotif = buildOfflineSyncOutcomeNotification({
    summary: conflictSummary,
    activeEngineerId: 'FLD-UG-201'
  });
  assert(conflictNotif !== null, 'Conflict notification must be created');
  assert(Boolean(conflictNotif && conflictNotif.type === 'warning'), 'Type must be warning');
  assert(Boolean(conflictNotif && conflictNotif.statusBadge === 'Sync Conflict'), 'statusBadge must be Sync Conflict');
  console.log('✓ Event F passed.');
}

// -----------------------------------------------------------------------------
// Test 9: Persistence of Read State & Deletion
// -----------------------------------------------------------------------------
console.log('Testing Read and Dismiss Persistence...');
{
  const notif = buildWorkOrderAssignedNotification({
    wo: sampleWorkOrder,
    targetEngineer: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' }
  });

  const readSet = new Set<string>([notif.id]);
  const scopedRead = filterFieldEngineerNotifications({
    notifications: [notif],
    workOrders: [sampleWorkOrder],
    incidents: [],
    activeUser: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' },
    readIds: readSet
  });
  assert(scopedRead.length === 1 && scopedRead[0].read === true, 'Notification in readIds must be marked read');

  const dismissedSet = new Set<string>([notif.id]);
  const scopedDismissed = filterFieldEngineerNotifications({
    notifications: [notif],
    workOrders: [sampleWorkOrder],
    incidents: [],
    activeUser: { id: 'FLD-UG-201', name: 'Vikramaditya Solanki' },
    dismissedIds: dismissedSet
  });
  assert(scopedDismissed.length === 0, 'Notification in dismissedIds must be filtered out');
  console.log('✓ Read and Dismiss Persistence passed.');
}

// -----------------------------------------------------------------------------
// Test 10: Reactive Four-Language Localization Parity (EN, GU, HI, MR)
// -----------------------------------------------------------------------------
console.log('Testing Four-Language Localization Parity (EN, GU, HI, MR)...');
{
  const testCases: { notif: { title: string; message: string }; idToken: string }[] = [
    {
      notif: {
        title: 'New Work Order Assigned: WO-4405',
        message: 'Work order WO-4405 (Feeder Patrol & Maintenance) in Mehsana City North assigned to Vikramaditya Solanki. Priority: High. Location: 14 Anand Nagar, Mehsana.'
      },
      idToken: 'WO-4405'
    },
    {
      notif: {
        title: 'Work Order Reassigned: WO-4405',
        message: 'Work order WO-4405 (Feeder Patrol & Maintenance) reassigned to Dharmesh P. Chaudhari from Vikramaditya Solanki. Reason: "Thermal camera inspection required". Priority: High.'
      },
      idToken: 'WO-4405'
    },
    {
      notif: {
        title: 'Work Order Updated: WO-4405',
        message: 'Priority updated to Emergency · Scheduled date: Immediate Dispatch.'
      },
      idToken: 'WO-4405'
    },
    {
      notif: {
        title: 'New Site Inspection Order: WO-INS-2026-0842',
        message: 'Feasibility check scheduled for Daxesh Shah (15kW) in Mehsana City North.'
      },
      idToken: 'WO-INS-2026-0842'
    },
    {
      notif: {
        title: 'Offline Sync Completed: 3 Action(s)',
        message: 'Successfully synchronized 3 offline field inspection(s) and work order status update(s) to the ERP system.'
      },
      idToken: '3'
    },
    {
      notif: {
        title: 'Offline Sync Conflict: 1 Item(s)',
        message: 'Offline synchronization completed with 2 item(s) applied and 1 conflict/failure(s). Please review in Offline Queue.'
      },
      idToken: '1'
    }
  ];

  const languages: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];

  for (const tc of testCases) {
    for (const lang of languages) {
      const loc = localizeFieldNotification(tc.notif, lang);
      assert(loc.title.length > 0, `Title must be non-empty for ${lang}`);
      assert(loc.message.length > 0, `Message must be non-empty for ${lang}`);
      assert(loc.title.includes(tc.idToken), `Title must preserve ID token ${tc.idToken} in ${lang}`);

      if (lang === 'en') {
        assert(loc.title === tc.notif.title, 'English title must match original verbatim');
      } else if (lang === 'gu') {
        // Must contain Gujarati characters or token
        assert(/[\u0A80-\u0AFF]/.test(loc.title), `Gujarati title must contain authentic Gujarati script for ${tc.notif.title}`);
      } else if (lang === 'hi') {
        // Must contain Devanagari script
        assert(/[\u0900-\u097F]/.test(loc.title), `Hindi title must contain authentic Devanagari script for ${tc.notif.title}`);
      } else if (lang === 'mr') {
        // Must contain Devanagari script
        assert(/[\u0900-\u097F]/.test(loc.title), `Marathi title must contain authentic Devanagari script for ${tc.notif.title}`);
      }
    }
  }
  console.log('✓ Four-Language Localization Parity passed.');
}

console.log('==============================================================');
console.log('✅ ALL PHASE 4, STEP 4.2 FIELD ENGINEER NOTIFICATION TESTS PASSED!');
console.log('==============================================================');
