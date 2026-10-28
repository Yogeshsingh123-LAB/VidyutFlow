import assert from 'node:assert/strict';
import {
  buildApplicationLifecycleNotifications,
  filterEmployeeApplicationNotifications,
  getNotificationInboxScopeKey,
  upsertNotificationList,
} from '../src/context/AppContext.js';
import {
  canArchiveApplication,
  getApplicationStatusDisplayMeta,
} from '../src/services/erpAdapter.js';
import { DemoErpRepositoryBundle } from '../src/services/repositories.js';
import { ServerDataStore } from '../src/server/dataStore.js';
import { ServerAuthService, AuthSecurityError } from '../src/server/authService.js';
import { INITIAL_APPLICATIONS, INITIAL_NOTIFICATIONS } from '../src/data/mockData.js';
import { AppNotification, NewConnectionApplication } from '../src/types/index.js';

async function runNotificationAndQueueTests() {
  console.log('Running Notification & Application Queue Regression Tests...');

  // =========================================================================
  // 1. REAL APPLICATION NOTIFICATION EVENTS (Consumer Submit -> Employee + Consumer)
  // =========================================================================
  {
    const newApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-0899',
      applicantName: 'Neha Trivedi',
      category: 'Residential (RGPU)',
      requestedLoadKw: 4,
      subdivision: 'Mehsana City North',
      status: 'Submitted',
      appliedDate: '2026-03-31',
      estimatedSanctionCost: 4800,
      accountId: 'ACC-1001',
    };

    const { employeeNotif, consumerNotif } = buildApplicationLifecycleNotifications(
      newApp,
      'Submitted'
    );

    assert.ok(employeeNotif, 'Employee notification must be generated on application submission');
    assert.equal(employeeNotif.targetRole, 'employee');
    assert.equal(employeeNotif.applicationId, 'APP-2026-0899');
    assert.equal(employeeNotif.type, 'info');
    assert.equal(employeeNotif.eventType, 'APPLICATION_SUBMITTED');
    assert.ok(employeeNotif.eventKey?.includes('APP-2026-0899'));

    assert.ok(consumerNotif, 'Consumer confirmation notification must be generated on submission');
    assert.equal(consumerNotif.targetRole, 'consumer');
    assert.equal(consumerNotif.accountId, 'ACC-1001');
    assert.equal(consumerNotif.type, 'info');
  }

  // =========================================================================
  // 2. EMPLOYEE APPROVAL / REJECTION / CLARIFICATION -> CONSUMER NOTIFICATIONS
  // =========================================================================
  {
    const baseApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-0842',
      accountId: 'ACC-1001',
      subdivision: 'Mehsana City North',
    };

    // Intermediate stages (e.g. Site Inspection) only notify employees, NOT consumers (preventing duplicate progress spam)
    const siteEvents = buildApplicationLifecycleNotifications(
      { ...baseApp, status: 'Site Inspection' },
      'Site Inspection'
    );
    assert.equal(
      siteEvents.consumerNotif,
      null,
      'Intermediate internal workflow stages must not spam consumer notifications'
    );
    assert.equal(
      siteEvents.employeeNotif.targetRole,
      'employee',
      'Inspection stage must generate an actionable employee notification'
    );

    // Approval (Meter Installed) -> Green consumer notification + employee notification
    const approvedEvents = buildApplicationLifecycleNotifications(
      { ...baseApp, status: 'Meter Installed' },
      'Meter Installed',
      undefined,
      { newConsumerNo: '01402999110', newMeterNo: 'SM-UGV-99911' }
    );
    assert.ok(approvedEvents.consumerNotif, 'Consumer must receive Application Approved notification');
    assert.equal(approvedEvents.consumerNotif.type, 'success');
    assert.ok(approvedEvents.consumerNotif.title.includes('Application Approved'));
    assert.ok(approvedEvents.consumerNotif.message.includes('01402999110'));

    // Rejection -> Red consumer notification with reason + employee notification
    const rejectedEvents = buildApplicationLifecycleNotifications(
      { ...baseApp, status: 'Rejected' },
      'Rejected',
      'Transformer capacity limit reached on feeder FDR-11'
    );
    assert.ok(rejectedEvents.consumerNotif, 'Consumer must receive Application Rejected notification');
    assert.equal(rejectedEvents.consumerNotif.type, 'alert');
    assert.ok(rejectedEvents.consumerNotif.title.includes('Application Rejected'));
    assert.ok(
      rejectedEvents.consumerNotif.message.includes('Transformer capacity limit reached on feeder FDR-11')
    );

    // Clarification Requested -> Amber consumer notification + employee notification
    const clarificationEvents = buildApplicationLifecycleNotifications(
      { ...baseApp, status: 'Document Verification', clarificationRequested: true },
      'Clarification Requested',
      'Please upload a clearer copy of the property tax receipt.'
    );
    assert.ok(clarificationEvents.consumerNotif, 'Consumer must receive Clarification Required notification');
    assert.equal(clarificationEvents.consumerNotif.type, 'warning');
    assert.ok(clarificationEvents.consumerNotif.title.includes('Clarification Required'));
    assert.ok(clarificationEvents.consumerNotif.message.includes('property tax receipt'));
  }

  // =========================================================================
  // 3. EMPLOYEE APPLICATION NOTIFICATION FILTERING (Role, Scope, No Spam/SCADA)
  // =========================================================================
  {
    const mixedNotifications: AppNotification[] = [
      ...INITIAL_NOTIFICATIONS,
      {
        id: 'NOTIF-SEC-99',
        title: 'SCADA Telemetry Anomaly',
        message: 'Substation telemetry packet drop detected.',
        time: 'Just now',
        type: 'alert',
        read: false,
        targetRole: 'admin',
        category: 'Security',
      },
      {
        id: 'NOTIF-OTHER-SUB',
        title: 'New Application Submitted: APP-2026-9999',
        message: 'Application in Palanpur City-1',
        time: 'Just now',
        type: 'info',
        read: false,
        targetRole: 'employee',
        category: 'Approval',
        applicationId: 'APP-2026-9999',
        subdivision: 'Palanpur City-1',
      },
    ];

    const filteredForMehsana = filterEmployeeApplicationNotifications(
      mixedNotifications,
      INITIAL_APPLICATIONS,
      {
        subdivisionScope: 'Mehsana City North',
        assignedOfficerName: 'Kiranbhai Desai',
      }
    );

    assert.ok(filteredForMehsana.length > 0, 'Employee should see actionable application notifications in their subdivision');
    assert.ok(
      filteredForMehsana.every((n) => Boolean(n.applicationId)),
      'All employee Application Notifications must be linked to an applicationId'
    );
    assert.ok(
      !filteredForMehsana.some((n) => n.id === 'NOTIF-SEC-99' || n.id === 'NOTIF-05'),
      'Security/SCADA alerts must never appear in Employee Application Notifications'
    );
    assert.ok(
      !filteredForMehsana.some((n) => n.targetRole === 'consumer'),
      'Consumer-only notifications must not appear in Employee Application Notifications'
    );
    assert.ok(
      !filteredForMehsana.some((n) => n.id === 'NOTIF-OTHER-SUB'),
      'Applications from unrelated subdivisions should be filtered out for subdivision-scoped employees'
    );
  }

  // =========================================================================
  // 4. NOTIFICATION DEDUPLICATION, READ, DELETE, AND CLEAR-ALL MANAGEMENT
  // =========================================================================
  {
    const firstBatch = buildApplicationLifecycleNotifications(
      INITIAL_APPLICATIONS[0],
      'Sanction Approval'
    );
    const duplicateBatch = buildApplicationLifecycleNotifications(
      INITIAL_APPLICATIONS[0],
      'Sanction Approval'
    );
    duplicateBatch.employeeNotif.time = 'Updated just now';

    const combined = upsertNotificationList(
      [firstBatch.employeeNotif],
      [duplicateBatch.employeeNotif]
    );
    assert.equal(
      combined.length,
      1,
      'upsertNotificationList must deduplicate notifications with the same canonical eventKey'
    );
    assert.equal(combined[0].time, 'Updated just now', 'Deduplicated notification should update in place');

    // Verify DemoErpRepositoryBundle notification read, batch read, delete, batch delete, and clear all
    const repo = new DemoErpRepositoryBundle();

    const initialRes = await repo.notifications.getNotifications('employee');
    assert.equal(initialRes.success, true);
    const initialList = (initialRes.data || []).filter((n) => !n.read);
    const firstId = initialList[0].id;
    const secondId = initialList[1].id;
    const thirdId = initialList[2].id;

    const markedOne = await repo.notifications.markNotificationRead('employee', firstId);
    assert.equal(markedOne.data?.read, true, 'markNotificationRead should mark single notification as read');

    const batchRead = await repo.notifications.markNotificationsReadBatch('employee', [secondId, thirdId]);
    assert.equal(batchRead.data?.updatedCount, 2, 'markNotificationsReadBatch should mark multiple unread notifications as read');

    const deletedOne = await repo.notifications.deleteNotification('employee', firstId);
    assert.equal(deletedOne.data?.deletedId, firstId, 'deleteNotification should remove notification');

    const afterSingleDelete = (await repo.notifications.getNotifications('employee')).data || [];
    assert.ok(!afterSingleDelete.some((n) => n.id === firstId), 'Deleted notification must not remain in repository');

    await repo.notifications.deleteNotificationsBatch('employee', [secondId]);
    const afterBatchDelete = (await repo.notifications.getNotifications('employee')).data || [];
    assert.ok(!afterBatchDelete.some((n) => n.id === secondId), 'Batch deleted notification must not remain');

    await repo.notifications.clearAllNotifications('employee');
    const afterClearEmployee = (await repo.notifications.getNotifications('employee')).data || [];
    assert.ok(
      !afterClearEmployee.some((n) => n.targetRole === 'employee'),
      'clearAllNotifications for employee role should remove employee-targeted notifications while preserving other roles'
    );

    const scopeKeyEmp = getNotificationInboxScopeKey('employee', null);
    const scopeKeyCon = getNotificationInboxScopeKey('consumer', null);
    assert.notEqual(scopeKeyEmp, scopeKeyCon, 'Per-user/role inbox persistence keys must be isolated');
  }

  // =========================================================================
  // 5. APPLICATION QUEUE STATUS VISIBILITY & COLOR METADATA
  // =========================================================================
  {
    const submittedMeta = getApplicationStatusDisplayMeta({ status: 'Submitted' });
    assert.equal(submittedMeta.colorTone, 'blue');
    assert.equal(submittedMeta.requiresEmployeeAction, true);

    const docMeta = getApplicationStatusDisplayMeta({ status: 'Document Verification' });
    assert.equal(docMeta.colorTone, 'amber');
    assert.equal(docMeta.shortLabel, 'In Progress');
    assert.equal(docMeta.requiresEmployeeAction, true);

    const sanctionMeta = getApplicationStatusDisplayMeta({ status: 'Sanction Approval' });
    assert.equal(sanctionMeta.colorTone, 'purple');
    assert.equal(sanctionMeta.shortLabel, 'Awaiting Approval');
    assert.equal(sanctionMeta.requiresEmployeeAction, true);

    const approvedMeta = getApplicationStatusDisplayMeta({ status: 'Meter Installed' });
    assert.equal(approvedMeta.colorTone, 'green');
    assert.equal(approvedMeta.shortLabel, 'Approved / Completed');
    assert.equal(approvedMeta.requiresEmployeeAction, false);

    const rejectedMeta = getApplicationStatusDisplayMeta({ status: 'Rejected' });
    assert.equal(rejectedMeta.colorTone, 'red');
    assert.equal(rejectedMeta.shortLabel, 'Rejected');
    assert.equal(rejectedMeta.requiresEmployeeAction, false);
  }

  // =========================================================================
  // 6. SAFE APPLICATION ARCHIVE & RESTORE (Permission + Audit + Consumer Preservation)
  // =========================================================================
  {
    const activeApp = INITIAL_APPLICATIONS.find((a) => a.status === 'Document Verification')!;
    const completedApp = INITIAL_APPLICATIONS.find((a) => a.status === 'Meter Installed')!;
    const rejectedApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-0898',
      status: 'Rejected',
    };

    assert.equal(canArchiveApplication(activeApp).allowed, false, 'Active in-progress applications must not be archivable');
    assert.equal(canArchiveApplication(completedApp).allowed, true, 'Completed (Meter Installed) applications can be archived');
    assert.equal(canArchiveApplication(rejectedApp).allowed, true, 'Rejected applications can be archived');

    // Test ServerDataStore enforcement
    const authService = new ServerAuthService();
    const store = new ServerDataStore(authService);

    const consumerLogin = authService.login({
      email: 'consumer@vidyutflow.demo',
      password: 'Demo@12345',
      targetRole: 'consumer',
    });
    const employeeLogin = authService.login({
      email: 'employee@vidyutflow.demo',
      password: 'Demo@12345',
      targetRole: 'employee',
    });

    const consumerToken = consumerLogin.session.signedToken;
    const employeeToken = employeeLogin.session.signedToken;

    // Consumer attempting to archive must be rejected with 403 FORBIDDEN_ROLE
    assert.throws(
      () => store.archiveApplication(consumerToken, completedApp.id, 'Consumer trying to archive'),
      (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403,
      'Consumers must be forbidden from archiving applications'
    );

    // Employee attempting to archive an active application must be rejected with 400 APPLICATION_ARCHIVE_NOT_ELIGIBLE
    assert.throws(
      () => store.archiveApplication(employeeToken, activeApp.id, 'Trying to archive active record'),
      (err: unknown) =>
        err instanceof AuthSecurityError &&
        err.statusCode === 400 &&
        err.code === 'APPLICATION_ARCHIVE_NOT_ELIGIBLE',
      'Archiving an active application must fail'
    );

    // Employee archiving a completed application succeeds and preserves canonical record + audit trail
    const archivedData = store.archiveApplication(
      employeeToken,
      completedApp.id,
      'Routine queue cleanup after meter installation'
    );
    assert.equal(archivedData.isArchived, true);
    assert.ok(archivedData.archivedBy);
    assert.equal(archivedData.archiveReason, 'Routine queue cleanup after meter installation');

    // Verify canonical record still exists in store (not hard-deleted) and cannot be double-archived
    const canonicalApps = store.getApplications(employeeToken);
    const archivedRecord = canonicalApps.find((a) => a.id === completedApp.id);
    assert.ok(archivedRecord, 'Archived application must remain in canonical database for consumer & audit history');
    assert.equal(canArchiveApplication(archivedRecord).allowed, false, 'Already archived application cannot be archived again');

    // Restore archived application
    const restoredData = store.restoreApplication(employeeToken, completedApp.id);
    assert.equal(restoredData.isArchived, false, 'Authorized employee can restore archived application');
  }

  console.log('All Notification & Application Queue Regression Tests Passed!');
}

runNotificationAndQueueTests().catch((err) => {
  console.error('Notification & Application Queue tests failed:', err);
  process.exit(1);
});
