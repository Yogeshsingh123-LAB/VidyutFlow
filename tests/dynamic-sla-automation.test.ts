import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  APPROACHING_DEADLINE_THRESHOLD_MS,
  COMPLAINT_SLA_HOURS_BY_PRIORITY,
  DEFAULT_APPLICATION_DEMO_SLA_DAYS,
  buildProactiveSlaNotifications,
  computeDynamicApplicationSlaFields,
  computeDynamicComplaintSlaFields,
  evaluateApplicationSla,
  evaluateComplaintSla,
  filterProactiveSlaNotificationsForRole,
  formatLocalizedSlaRemainingTime,
  getSlaDashboardUiStrings,
  localizeDemoSlaTargetDisclaimer,
  localizeSlaRiskStateBadge,
  parseSlaTimestampSafe,
  resolveComplaintSlaHours
} from '../src/utils/slaEngine.js';
import {
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_WORK_ORDERS
} from '../src/data/mockData.js';
import {
  filterEmployeeApplicationNotifications,
  upsertNotificationList
} from '../src/context/AppContext.js';
import { sanitizeAndScopeIncidentNotifications } from '../src/utils/anomalyDetector.js';
import {
  localizeConsumerNotification,
  localizeNotificationStatusBadge
} from '../src/i18n/consumerContentTranslations.js';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../src/i18n/types.js';
import {
  AppNotification,
  ComplaintRecord,
  NewConnectionApplication
} from '../src/types/index.js';

function runDynamicSlaAutomationTests() {
  console.log('======================================================================');
  console.log('  VIDYUTFLOW 2.0 — PHASE 3, STEP 2: DYNAMIC SLA AUTOMATION TEST SUITE');
  console.log('======================================================================\n');

  // =========================================================================
  // 1. DYNAMIC COMPLAINT SUBMISSION TIMESTAMP AND DUE TIME CALCULATION
  // =========================================================================
  console.log('1. Verifying dynamic complaint submission timestamp & due time calculation...');
  {
    const fixedSubmissionDate = new Date('2026-10-30T04:00:00.000Z'); // 09:30 IST (Asia/Kolkata)
    const highPrioritySla = computeDynamicComplaintSlaFields({
      priority: 'High',
      submittedAt: fixedSubmissionDate
    });

    assert.equal(highPrioritySla.filedAt, '30-Oct-2026 09:30');
    assert.equal(highPrioritySla.slaTargetHours, 12);
    assert.equal(highPrioritySla.slaDueTime, '30-Oct-2026 21:30');
    assert.equal(highPrioritySla.slaBreached, false);
    assert.equal(highPrioritySla.timelineTimeLabel, '30-Oct 09:30');
    assert.equal(highPrioritySla.scheduledWorkOrderDate, '30-Oct-2026');

    const parsedFiled = parseSlaTimestampSafe(highPrioritySla.filedAt);
    const parsedDue = parseSlaTimestampSafe(highPrioritySla.slaDueTime);
    assert.ok(parsedFiled && parsedDue, 'Filed and due timestamps must be valid IST dates');
    assert.equal(
      parsedDue.getTime() - parsedFiled.getTime(),
      12 * 60 * 60 * 1000,
      'Due timestamp must equal submission timestamp + 12 hours'
    );

    // Verify AppContext.tsx submitComplaintDemo no longer hardcodes '15-Oct-2026 06:19' / '15-Oct-2026 18:19'
    const appContextSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/context/AppContext.tsx'),
      'utf8'
    );
    assert.ok(
      !appContextSource.includes("filedAt: '15-Oct-2026 06:19'"),
      'submitComplaintDemo must not use hardcoded filedAt timestamp'
    );
    assert.ok(
      !appContextSource.includes("slaDueTime: '15-Oct-2026 18:19'"),
      'submitComplaintDemo must not use hardcoded slaDueTime timestamp'
    );
    assert.ok(
      appContextSource.includes('computeDynamicComplaintSlaFields'),
      'submitComplaintDemo must compute dynamic complaint SLA fields'
    );
  }
  console.log('   ✓ Dynamic complaint submission timestamp & due time verified.\n');

  // =========================================================================
  // 2. PRIORITY-BASED SLA DURATION CALCULATION
  // =========================================================================
  console.log('2. Verifying priority-based SLA duration calculation...');
  {
    const baseTime = new Date('2026-10-30T06:00:00.000Z'); // 11:30 IST

    const criticalSla = computeDynamicComplaintSlaFields({
      priority: 'Critical',
      submittedAt: baseTime
    });
    assert.equal(criticalSla.slaTargetHours, 4);
    assert.equal(criticalSla.slaDueTime, '30-Oct-2026 15:30');

    const highSla = computeDynamicComplaintSlaFields({
      priority: 'High',
      submittedAt: baseTime
    });
    assert.equal(highSla.slaTargetHours, 12);
    assert.equal(highSla.slaDueTime, '30-Oct-2026 23:30');

    const mediumSla = computeDynamicComplaintSlaFields({
      priority: 'Medium',
      submittedAt: baseTime
    });
    assert.equal(mediumSla.slaTargetHours, 24);
    assert.equal(mediumSla.slaDueTime, '31-Oct-2026 11:30');

    const lowSla = computeDynamicComplaintSlaFields({
      priority: 'Low',
      submittedAt: baseTime
    });
    assert.equal(lowSla.slaTargetHours, 24);
    assert.equal(lowSla.slaDueTime, '31-Oct-2026 11:30');

    const customOverrideSla = computeDynamicComplaintSlaFields({
      priority: 'Medium',
      slaTargetHours: 48,
      submittedAt: baseTime
    });
    assert.equal(customOverrideSla.slaTargetHours, 48);
    assert.equal(customOverrideSla.slaDueTime, '01-Nov-2026 11:30');

    assert.equal(COMPLAINT_SLA_HOURS_BY_PRIORITY.Critical, 4);
    assert.equal(COMPLAINT_SLA_HOURS_BY_PRIORITY.High, 12);
    assert.equal(COMPLAINT_SLA_HOURS_BY_PRIORITY.Medium, 24);
    assert.equal(COMPLAINT_SLA_HOURS_BY_PRIORITY.Low, 24);
    assert.equal(resolveComplaintSlaHours('Critical'), 4);
  }
  console.log('   ✓ Priority-based SLA durations (Critical=4h, High=12h, Medium/Low=24h, custom override) verified.\n');

  // =========================================================================
  // 3. APPLICATION TARGET COMPLETION / SLA CALCULATION
  // =========================================================================
  console.log('3. Verifying application target completion / illustrative DEMO SLA calculation...');
  {
    const submittedAt = new Date('2026-10-30T05:00:00.000Z'); // 2026-10-30 in IST
    const appSla = computeDynamicApplicationSlaFields({ submittedAt });

    assert.equal(DEFAULT_APPLICATION_DEMO_SLA_DAYS, 15);
    assert.equal(appSla.appliedDate, '2026-10-30');
    assert.equal(appSla.targetCompletionDate, '2026-11-14');
    assert.equal(appSla.slaTargetHours, 15 * 24);
    assert.equal(appSla.isDemoIllustrativeTarget, true);
  }
  console.log('   ✓ Application 15-day illustrative DEMO target completion calculation verified.\n');

  // =========================================================================
  // 4. PRESERVATION OF EXISTING DEMO SEED RECORDS
  // =========================================================================
  console.log('4. Verifying preservation of existing DEMO seed records...');
  {
    assert.equal(INITIAL_COMPLAINTS.length, 4, 'Canonical 4 seed complaints preserved');
    assert.ok(INITIAL_APPLICATIONS.length >= 4, 'Canonical seed applications preserved');
    assert.equal(INITIAL_WORK_ORDERS.length, 4, 'Canonical 4 seed work orders preserved');
    assert.equal(INITIAL_NOTIFICATIONS.length, 8, 'Canonical 8 seed notifications preserved');

    const cmp8821 = INITIAL_COMPLAINTS.find(c => c.id === 'CMP-8821');
    const cmp8822 = INITIAL_COMPLAINTS.find(c => c.id === 'CMP-8822');
    const cmp8819 = INITIAL_COMPLAINTS.find(c => c.id === 'CMP-8819');
    const cmp8815 = INITIAL_COMPLAINTS.find(c => c.id === 'CMP-8815');

    assert.equal(cmp8821?.filedAt, '14-Oct-2026 18:40');
    assert.equal(cmp8821?.slaDueTime, '15-Oct-2026 18:40');
    assert.equal(cmp8821?.slaBreached, false);

    assert.equal(cmp8822?.filedAt, '13-Oct-2026 11:20');
    assert.equal(cmp8822?.slaDueTime, '15-Oct-2026 11:20');
    assert.equal(cmp8822?.slaTargetHours, 48);

    assert.equal(cmp8819?.filedAt, '15-Oct-2026 06:15');
    assert.equal(cmp8819?.slaDueTime, '15-Oct-2026 10:15');
    assert.equal(cmp8819?.slaBreached, false);

    assert.equal(cmp8815?.status, 'Resolved');
    assert.equal(cmp8815?.resolvedAt, '12-Oct-2026 06:30');

    const app0842 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0842');
    assert.equal(app0842?.appliedDate, '02-Oct-2026');
    assert.equal(app0842?.targetCompletionDate, '18-Oct-2026');
  }
  console.log('   ✓ Original DEMO seed records and historical dates are strictly preserved.\n');

  // =========================================================================
  // 5. ON_TRACK, APPROACHING_DEADLINE, BREACHED, AND RESOLVED STATES
  // =========================================================================
  console.log('5. Verifying deterministic SLA risk classification states...');
  {
    const sampleComplaint: ComplaintRecord = {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-9001',
      priority: 'High',
      status: 'Registered',
      filedAt: '30-Oct-2026 10:00',
      slaTargetHours: 12,
      slaDueTime: '30-Oct-2026 22:00',
      slaBreached: false
    };

    // 5a. ON_TRACK: 6 hours remaining (evaluated at 30-Oct-2026 16:00 IST)
    const onTrackEval = evaluateComplaintSla(sampleComplaint, '30-Oct-2026 16:00');
    assert.equal(onTrackEval.state, 'ON_TRACK');
    assert.equal(onTrackEval.isBreached, false);
    assert.equal(onTrackEval.isApproaching, false);
    assert.equal(onTrackEval.isResolved, false);
    assert.equal(onTrackEval.remainingMs, 6 * 60 * 60 * 1000);

    // 5b. APPROACHING_DEADLINE: 90 minutes remaining (< 2 hours, evaluated at 30-Oct-2026 20:30 IST)
    const approachingEval = evaluateComplaintSla(sampleComplaint, '30-Oct-2026 20:30');
    assert.equal(approachingEval.state, 'APPROACHING_DEADLINE');
    assert.equal(approachingEval.isApproaching, true);
    assert.equal(approachingEval.isBreached, false);
    assert.ok(
      approachingEval.remainingMs !== null &&
        approachingEval.remainingMs > 0 &&
        approachingEval.remainingMs <= APPROACHING_DEADLINE_THRESHOLD_MS
    );

    // 5c. BREACHED: 45 minutes past due time (evaluated at 30-Oct-2026 22:45 IST)
    const breachedEval = evaluateComplaintSla(sampleComplaint, '30-Oct-2026 22:45');
    assert.equal(breachedEval.state, 'BREACHED');
    assert.equal(breachedEval.isBreached, true);
    assert.equal(breachedEval.isApproaching, false);
    assert.ok(breachedEval.remainingMs !== null && breachedEval.remainingMs < 0);

    // 5d. Application states: ON_TRACK, APPROACHING_DEADLINE, BREACHED, RESOLVED
    const sampleApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-9001',
      status: 'Site Inspection',
      appliedDate: '2026-10-30',
      targetCompletionDate: '2026-11-14', // End of day: 2026-11-14T23:59:59+05:30
      isArchived: false
    };

    const appOnTrack = evaluateApplicationSla(sampleApp, '2026-11-05T10:00:00+05:30');
    assert.equal(appOnTrack.state, 'ON_TRACK');
    assert.equal(appOnTrack.isDemoIllustrativeTarget, true);

    const appApproaching = evaluateApplicationSla(sampleApp, '2026-11-14T22:30:00+05:30');
    assert.equal(appApproaching.state, 'APPROACHING_DEADLINE');
    assert.equal(appApproaching.isApproaching, true);

    const appBreached = evaluateApplicationSla(sampleApp, '2026-11-15T01:00:00+05:30');
    assert.equal(appBreached.state, 'BREACHED');
    assert.equal(appBreached.isBreached, true);

    // 5e. Graceful handling of missing or invalid timestamps
    const invalidTimestampComplaint: ComplaintRecord = {
      ...sampleComplaint,
      id: 'CMP-INVALID',
      filedAt: 'invalid-date-string',
      slaDueTime: ''
    };
    const invalidEval = evaluateComplaintSla(invalidTimestampComplaint, '30-Oct-2026 16:00');
    assert.equal(invalidEval.state, 'UNKNOWN');
    assert.equal(invalidEval.isValidTimestamp, false);
    assert.equal(invalidEval.isBreached, false);
    assert.equal(invalidEval.isApproaching, false);
    assert.equal(invalidEval.remainingMs, null);
  }
  console.log('   ✓ ON_TRACK, APPROACHING_DEADLINE, BREACHED, RESOLVED, and UNKNOWN fallback states verified.\n');

  // =========================================================================
  // 6 & 7. APPROACHING-DEADLINE & BREACH NOTIFICATION GENERATION AND DEDUPLICATION
  // =========================================================================
  console.log('6 & 7. Verifying proactive approaching-deadline & breach notifications and deduplication...');
  {
    const approachingComplaint: ComplaintRecord = {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-9101',
      category: 'Power Outage',
      priority: 'Critical',
      status: 'In Progress',
      subdivision: 'Mehsana City North',
      filedAt: '30-Oct-2026 10:00',
      slaTargetHours: 4,
      slaDueTime: '30-Oct-2026 14:00',
      slaBreached: false
    };

    const approachingApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-9101',
      applicantName: 'Kiranbhai Desai',
      subdivision: 'Mehsana City North',
      status: 'Document Verification',
      appliedDate: '2026-10-15',
      targetCompletionDate: '30-Oct-2026 14:00',
      isArchived: false
    };

    // Evaluate at 30-Oct-2026 12:45 IST (75 mins left -> APPROACHING_DEADLINE)
    const eval1 = buildProactiveSlaNotifications({
      complaints: [approachingComplaint],
      applications: [approachingApp],
      existingNotifications: [],
      referenceNow: '30-Oct-2026 12:45'
    });

    assert.equal(eval1.newNotifications.length, 2, 'Must generate 1 complaint approaching + 1 app approaching notification');
    const cmpApproachingNotif = eval1.newNotifications.find(n => n.complaintId === 'CMP-9101');
    const appApproachingNotif = eval1.newNotifications.find(n => n.applicationId === 'APP-2026-9101');

    assert.ok(cmpApproachingNotif);
    assert.equal(cmpApproachingNotif.notificationType, 'SLA_APPROACHING');
    assert.equal(cmpApproachingNotif.targetRole, 'employee');
    assert.equal(cmpApproachingNotif.eventKey, 'EVT-SLA-EMP-CMP-CMP-9101-APPROACHING');

    assert.ok(appApproachingNotif);
    assert.equal(appApproachingNotif.notificationType, 'SLA_APPROACHING');
    assert.equal(appApproachingNotif.targetRole, 'employee');
    assert.equal(appApproachingNotif.eventKey, 'EVT-SLA-EMP-APP-APP-2026-9101-APPROACHING');

    // Re-evaluate with existingNotifications / emittedEventKeys (simulating rerender, refresh, or timer tick)
    const evalDuplicateCheck = buildProactiveSlaNotifications({
      complaints: [approachingComplaint],
      applications: [approachingApp],
      existingNotifications: eval1.allNotifications,
      emittedEventKeys: eval1.emittedEventKeys,
      referenceNow: '30-Oct-2026 13:00'
    });
    assert.equal(
      evalDuplicateCheck.newNotifications.length,
      0,
      'Repeated evaluation must not generate duplicate approaching-deadline notifications'
    );

    // Also verify upsertNotificationList deduplicates by id and eventKey
    const upserted = upsertNotificationList(eval1.allNotifications, eval1.newNotifications);
    assert.equal(upserted.length, eval1.allNotifications.length, 'upsertNotificationList must prevent duplicate SLA notifications');

    // Now advance past deadline: 30-Oct-2026 14:30 IST (BREACHED)
    const evalBreach = buildProactiveSlaNotifications({
      complaints: [approachingComplaint],
      applications: [approachingApp],
      existingNotifications: eval1.allNotifications,
      emittedEventKeys: eval1.emittedEventKeys,
      referenceNow: '30-Oct-2026 14:30'
    });

    // Breached generates Employee + Management notifications for both complaint and application (4 total)
    assert.equal(evalBreach.newNotifications.length, 4, 'Breach must generate Employee + Management notifications for active breached cases');
    assert.ok(
      evalBreach.newNotifications.some(
        n => n.eventKey === 'EVT-SLA-EMP-CMP-CMP-9101-BREACHED' && n.targetRole === 'employee'
      )
    );
    assert.ok(
      evalBreach.newNotifications.some(
        n => n.eventKey === 'EVT-SLA-MGMT-CMP-CMP-9101-BREACHED' && n.targetRole === 'management'
      )
    );
    assert.ok(
      evalBreach.newNotifications.some(
        n => n.eventKey === 'EVT-SLA-EMP-APP-APP-2026-9101-BREACHED' && n.targetRole === 'employee'
      )
    );
    assert.ok(
      evalBreach.newNotifications.some(
        n => n.eventKey === 'EVT-SLA-MGMT-APP-APP-2026-9101-BREACHED' && n.targetRole === 'management'
      )
    );

    // Repeat breach evaluation -> 0 duplicates
    const evalBreachDuplicateCheck = buildProactiveSlaNotifications({
      complaints: [approachingComplaint],
      applications: [approachingApp],
      existingNotifications: evalBreach.allNotifications,
      emittedEventKeys: evalBreach.emittedEventKeys,
      referenceNow: '30-Oct-2026 15:00'
    });
    assert.equal(
      evalBreachDuplicateCheck.newNotifications.length,
      0,
      'Repeated breach evaluation must produce zero duplicate notifications'
    );
  }
  console.log('   ✓ Approaching-deadline & breach notifications and deduplication verified.\n');

  // =========================================================================
  // 8. COMPLETED AND RESOLVED RECORDS DO NOT TRIGGER BREACH ALERTS
  // =========================================================================
  console.log('8. Verifying completed and resolved records never trigger false breach alerts...');
  {
    const resolvedComplaint: ComplaintRecord = {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-9201',
      status: 'Resolved',
      filedAt: '10-Oct-2026 08:00',
      slaTargetHours: 4,
      slaDueTime: '10-Oct-2026 12:00',
      slaBreached: false
    };
    const closedComplaint: ComplaintRecord = {
      ...resolvedComplaint,
      id: 'CMP-9202',
      status: 'Closed'
    };
    const completedApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-9201',
      status: 'Meter Installed',
      appliedDate: '2026-09-01',
      targetCompletionDate: '2026-09-16'
    };
    const rejectedApp: NewConnectionApplication = {
      ...completedApp,
      id: 'APP-2026-9202',
      status: 'Rejected'
    };
    const archivedApp: NewConnectionApplication = {
      ...completedApp,
      id: 'APP-2026-9203',
      status: 'Document Verification',
      isArchived: true
    };

    assert.equal(evaluateComplaintSla(resolvedComplaint, '30-Oct-2026 18:00').state, 'RESOLVED');
    assert.equal(evaluateComplaintSla(resolvedComplaint, '30-Oct-2026 18:00').isBreached, false);
    assert.equal(evaluateComplaintSla(closedComplaint, '30-Oct-2026 18:00').state, 'RESOLVED');
    assert.equal(evaluateApplicationSla(completedApp, '30-Oct-2026 18:00').state, 'RESOLVED');
    assert.equal(evaluateApplicationSla(completedApp, '30-Oct-2026 18:00').isBreached, false);
    assert.equal(evaluateApplicationSla(rejectedApp, '30-Oct-2026 18:00').state, 'RESOLVED');
    assert.equal(evaluateApplicationSla(archivedApp, '30-Oct-2026 18:00').state, 'RESOLVED');

    const notifResult = buildProactiveSlaNotifications({
      complaints: [resolvedComplaint, closedComplaint],
      applications: [completedApp, rejectedApp, archivedApp],
      existingNotifications: [],
      referenceNow: '30-Oct-2026 18:00'
    });
    assert.equal(
      notifResult.newNotifications.length,
      0,
      'Completed, rejected, archived, resolved, or closed records must never emit SLA alerts'
    );
  }
  console.log('   ✓ Terminal/completed/resolved records produce zero false breach alerts.\n');

  // =========================================================================
  // 9. ROLE-SCOPED NOTIFICATION VISIBILITY & SUBDIVISION ISOLATION
  // =========================================================================
  console.log('9. Verifying role-scoped notification visibility and subdivision isolation...');
  {
    const mehsanaComplaint: ComplaintRecord = {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-9301',
      status: 'In Progress',
      subdivision: 'Mehsana City North',
      filedAt: '30-Oct-2026 08:00',
      slaTargetHours: 4,
      slaDueTime: '30-Oct-2026 12:00',
      slaBreached: false
    };

    const { newNotifications } = buildProactiveSlaNotifications({
      complaints: [mehsanaComplaint],
      applications: [],
      existingNotifications: [],
      referenceNow: '30-Oct-2026 13:00'
    });

    // Authorized Mehsana employee sees the Employee SLA notification
    const mehsanaEmpNotifs = filterProactiveSlaNotificationsForRole(
      newNotifications,
      'employee',
      { subdivisionScope: 'Mehsana City North' }
    );
    assert.equal(mehsanaEmpNotifs.length, 1);
    assert.equal(mehsanaEmpNotifs[0].targetRole, 'employee');

    // Unrelated Palanpur Rural employee does NOT see Mehsana SLA notification
    const palanpurEmpNotifs = filterProactiveSlaNotificationsForRole(
      newNotifications,
      'employee',
      { subdivisionScope: 'Palanpur Rural' }
    );
    assert.equal(
      palanpurEmpNotifs.length,
      0,
      'Employee in unrelated subdivision must not receive Mehsana SLA notifications'
    );

    // Management sees the Management breach notification via sanitizeAndScopeIncidentNotifications
    const mgmtScoped = sanitizeAndScopeIncidentNotifications(
      newNotifications,
      [],
      'management',
      { id: 'usr_mgmt_01', name: 'Rajesh Solanki', subdivision: 'Mehsana Corporate Circle' },
      new Set(),
      new Set()
    );
    assert.equal(mgmtScoped.length, 1);
    assert.equal(mgmtScoped[0].targetRole, 'management');

    // Consumer and Field Engineer never see internal SLA notifications
    const consumerNotifs = filterProactiveSlaNotificationsForRole(newNotifications, 'consumer');
    const fieldNotifs = filterProactiveSlaNotificationsForRole(newNotifications, 'field');
    assert.equal(consumerNotifs.length, 0, 'Consumers must never receive internal SLA alerts');
    assert.equal(fieldNotifs.length, 0, 'Field engineers must not receive unassigned SLA alerts');

    // Ensure filterEmployeeApplicationNotifications preserves lifecycle notifications without clobbering
    const appLifecycleNotif: AppNotification = {
      id: 'NOTIF-EMP-APP-2026-0842-SUBMITTED',
      title: 'New Application Submitted: APP-2026-0842',
      message: 'Meenaben Patel submitted a 3 kW Residential (RGPU) application in Mehsana City North.',
      time: 'Just now',
      targetRole: 'employee',
      type: 'info',
      read: false,
      category: 'Approval',
      applicationId: 'APP-2026-0842',
      subdivision: 'Mehsana City North',
      eventKey: 'EVT-EMP-APP-APP-2026-0842-Submitted'
    };
    const appSlaNotif: AppNotification = {
      id: 'NOTIF-SLA-EMP-APP-APP-2026-0842-BREACHED',
      notificationType: 'SLA_BREACHED',
      title: 'Application Target Overdue: APP-2026-0842',
      message: 'Application APP-2026-0842 (Meenaben Patel) in Mehsana City North has passed its DEMO target completion date (2026-10-18) at stage Site Inspection.',
      time: '30-Oct-2026 13:00',
      targetRole: 'employee',
      type: 'alert',
      read: false,
      category: 'Approval',
      applicationId: 'APP-2026-0842',
      subdivision: 'Mehsana City North',
      eventKey: 'EVT-SLA-EMP-APP-APP-2026-0842-BREACHED'
    };
    const filteredAppLifecycle = filterEmployeeApplicationNotifications(
      [appSlaNotif, appLifecycleNotif],
      INITIAL_APPLICATIONS,
      { subdivisionScope: 'Mehsana City North' }
    );
    assert.equal(filteredAppLifecycle.length, 1);
    assert.equal(
      filteredAppLifecycle[0].id,
      'NOTIF-EMP-APP-2026-0842-SUBMITTED',
      'Application lifecycle notification must not be clobbered by SLA notification'
    );
  }
  console.log('   ✓ Role-scoped notification visibility and subdivision isolation verified.\n');

  // =========================================================================
  // 10. FOUR-LANGUAGE (en, gu, hi, mr) SLA LABEL AND NOTIFICATION LOCALIZATION
  // =========================================================================
  console.log('10. Verifying four-language (en, gu, hi, mr) SLA label & notification localization...');
  {
    const sampleCmp: ComplaintRecord = {
      ...INITIAL_COMPLAINTS[0],
      id: 'CMP-9401',
      category: 'Power Outage',
      priority: 'Critical',
      status: 'In Progress',
      subdivision: 'Mehsana City North',
      filedAt: '30-Oct-2026 10:00',
      slaTargetHours: 4,
      slaDueTime: '30-Oct-2026 14:00',
      slaBreached: false
    };
    const sampleApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-9401',
      applicantName: 'Rameshbhai Chaudhary',
      subdivision: 'Mehsana City North',
      status: 'Site Inspection',
      appliedDate: '2026-10-15',
      targetCompletionDate: '30-Oct-2026 14:00',
      isArchived: false
    };

    const approachingBatch = buildProactiveSlaNotifications({
      complaints: [sampleCmp],
      applications: [sampleApp],
      existingNotifications: [],
      referenceNow: '30-Oct-2026 13:00'
    });
    const breachedBatch = buildProactiveSlaNotifications({
      complaints: [sampleCmp],
      applications: [sampleApp],
      existingNotifications: [],
      referenceNow: '30-Oct-2026 15:00'
    });

    const allGeneratedSlaNotifs = [
      ...approachingBatch.newNotifications,
      ...breachedBatch.newNotifications
    ];

    const langs: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];
    assert.equal(SUPPORTED_LANGUAGES.length, 4);

    for (const lang of langs) {
      // Risk badges
      for (const state of ['ON_TRACK', 'APPROACHING_DEADLINE', 'BREACHED', 'RESOLVED', 'UNKNOWN'] as const) {
        const badge = localizeSlaRiskStateBadge(state, lang, 'complaint');
        assert.ok(badge.label.trim().length > 0, `[${lang}] Missing badge label for ${state}`);
        if (lang !== 'en') {
          const enBadge = localizeSlaRiskStateBadge(state, 'en', 'complaint');
          assert.notEqual(badge.label, enBadge.label, `[${lang}] Badge ${state} must be translated`);
        }
      }

      // Remaining/overdue time labels
      for (const evalSample of [
        evaluateComplaintSla(sampleCmp, '30-Oct-2026 11:00'),
        evaluateComplaintSla(sampleCmp, '30-Oct-2026 13:15'),
        evaluateComplaintSla(sampleCmp, '30-Oct-2026 15:30'),
        evaluateComplaintSla({ ...sampleCmp, status: 'Resolved' }, '30-Oct-2026 15:30')
      ]) {
        const formatted = formatLocalizedSlaRemainingTime(evalSample, lang);
        assert.ok(formatted.trim().length > 0);
        if (lang !== 'en') {
          assert.notEqual(
            formatted,
            formatLocalizedSlaRemainingTime(evalSample, 'en'),
            `[${lang}] Remaining time string must be localized`
          );
        }
      }

      // Disclaimer & Dashboard UI strings
      const disclaimer = localizeDemoSlaTargetDisclaimer(lang);
      assert.ok(disclaimer.trim().length > 0);
      const uiStrings = getSlaDashboardUiStrings(lang);
      for (const [k, v] of Object.entries(uiStrings)) {
        assert.ok(typeof v === 'string' && v.trim().length > 0, `[${lang}] SLA UI string ${k} is empty`);
      }

      // Notification status badges & titles/messages
      for (const statusLabel of ['Approaching Deadline', 'SLA Breached', 'On Track']) {
        const locStatus = localizeNotificationStatusBadge(statusLabel, lang);
        assert.ok(locStatus.trim().length > 0);
        if (lang !== 'en') {
          assert.notEqual(locStatus, statusLabel, `[${lang}] Status badge "${statusLabel}" not localized`);
        }
      }

      for (const notif of allGeneratedSlaNotifs) {
        const localized = localizeConsumerNotification(notif, lang);
        assert.ok(localized.title.trim().length > 0);
        assert.ok(localized.message.trim().length > 0);
        if (lang !== 'en') {
          assert.notEqual(
            localized.title,
            notif.title,
            `[${lang}] SLA notification title not localized: "${notif.title}"`
          );
          assert.notEqual(
            localized.message,
            notif.message,
            `[${lang}] SLA notification message not localized: "${notif.message}"`
          );
        }
      }
    }
  }
  console.log('   ✓ Four-language (en, gu, hi, mr) SLA labels, badges, remaining time, and notifications verified.\n');

  console.log('======================================================================');
  console.log('  ✅ ALL 10 DYNAMIC SLA AUTOMATION TEST SUITES PASSED!');
  console.log('======================================================================');
}

runDynamicSlaAutomationTests();
