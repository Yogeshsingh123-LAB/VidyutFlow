import assert from 'node:assert/strict';
import {
  INITIAL_APPLICATIONS,
  INITIAL_WORK_ORDERS
} from '../src/data/mockData';
import {
  erpAdapter,
  isValidApplicationTransition,
  isActionAuthorized,
  findExistingSiteInspectionWorkOrder,
  resolveSiteInspectionAssignee,
  ensureSiteInspectionWorkOrderForApplication,
  reconcileApplicationWorkOrderLinks
} from '../src/services/erpAdapter';
import { getCaseDrawerCapabilities } from '../src/components/common/CaseDetailDrawer';
import {
  localizeWorkOrderTitle,
  localizeWorkOrderType,
  localizeWorkOrderStatus,
  localizeAssignedActorName
} from '../src/i18n/employeeContentTranslations';
import {
  enqueueFieldInspectionAction,
  replayFieldOfflineQueue
} from '../src/utils/fieldOfflineQueue';
import { NewConnectionApplication, WorkOrder } from '../src/types';

async function runTests() {
  console.log('Running Phase 3 Step 1: Automatic Site Inspection Work-Order Creation Tests...');

  // ---------------------------------------------------------------------------
  // 1. Canonical DEMO Data Integrity & Initial Link Reconciliation
  // ---------------------------------------------------------------------------
  {
    const initialAppCount = INITIAL_APPLICATIONS.length;
    const initialWoCount = INITIAL_WORK_ORDERS.length;

    const reconciled = reconcileApplicationWorkOrderLinks(
      INITIAL_APPLICATIONS,
      INITIAL_WORK_ORDERS
    );

    assert.equal(reconciled.applications.length, initialAppCount, 'Application count must be preserved');
    assert.equal(reconciled.workOrders.length, initialWoCount, 'WorkOrder count must be preserved (no extra records created on reconcile)');

    // APP-2026-0842 is in Site Inspection and matches existing WO-4402
    const app0842 = reconciled.applications.find(a => a.id === 'APP-2026-0842');
    const wo4402 = reconciled.workOrders.find(w => w.id === 'WO-4402');
    assert.ok(app0842, 'APP-2026-0842 must exist');
    assert.ok(wo4402, 'WO-4402 must exist');
    assert.equal(app0842.assignedWorkOrderId, 'WO-4402', 'APP-2026-0842 should link to existing WO-4402');
    assert.equal(wo4402.applicationId, 'APP-2026-0842', 'WO-4402 should back-link to APP-2026-0842');

    // Input constants must not be mutated
    const rawApp0842 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0842');
    assert.equal(rawApp0842?.assignedWorkOrderId, undefined, 'INITIAL_APPLICATIONS constant must not be mutated in place');
    console.log('  ✓ DEMO dataset integrity and initial APP-2026-0842 <-> WO-4402 reconciliation verified');
  }

  // ---------------------------------------------------------------------------
  // 2. Automatic Work-Order Creation on Document Verification -> Site Inspection
  //    & Ownership Boundary Enforcement (No Fabricated Staff Assignment)
  // ---------------------------------------------------------------------------
  {
    // APP-2026-0843 is in 'Document Verification' and has NO assignedEngineer
    const app0843 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0843');
    assert.ok(app0843, 'APP-2026-0843 must exist');
    assert.equal(app0843.status, 'Document Verification');
    assert.equal(app0843.assignedEngineer, undefined, 'APP-2026-0843 starts without assignedEngineer');

    const res = await erpAdapter.updateApplicationStatus(
      'employee',
      app0843,
      'Site Inspection',
      'Assigned site visit to JE field.',
      INITIAL_WORK_ORDERS
    );

    assert.equal(res.success, true, 'Transition from Document Verification to Site Inspection by employee must succeed');
    assert.equal(res.workOrderCreated, true, 'A new site-inspection work order must be created for APP-2026-0843');
    assert.ok(res.workOrder, 'Created workOrder object must be returned');
    assert.ok(res.data, 'Updated application object must be returned');

    const createdWo = res.workOrder;
    const updatedApp = res.data;

    assert.equal(createdWo.id, 'WO-INS-2026-0843', 'Work order ID must follow canonical WO-INS- convention');
    assert.equal(createdWo.type, 'New Connection Verification', 'Work order type must be New Connection Verification');
    assert.equal(createdWo.status, 'Pending', 'Newly created site inspection work order must start in Pending status');
    assert.equal(createdWo.applicationId, 'APP-2026-0843', 'Work order must link back to applicationId APP-2026-0843');
    assert.equal(updatedApp.status, 'Site Inspection', 'Application status must advance to Site Inspection');
    assert.equal(updatedApp.workflowStep, 3, 'Application workflowStep must be 3');
    assert.equal(updatedApp.assignedWorkOrderId, 'WO-INS-2026-0843', 'Application assignedWorkOrderId must store the created work order ID');

    // Ownership boundary: APP-2026-0843 has no assignedEngineer, so assignedTo must be 'Unassigned' (never fabricated)
    assert.equal(
      createdWo.assignedTo,
      'Unassigned',
      'When application has no existing assignedEngineer, work order must remain Unassigned without fabricating a staff assignment'
    );
    assert.equal(
      updatedApp.assignedEngineer,
      undefined,
      'Application assignedEngineer must remain undefined when no staff assignment exists'
    );
    assert.equal(
      res.workOrders?.length,
      INITIAL_WORK_ORDERS.length + 1,
      'Work orders collection should grow by exactly 1'
    );
    console.log('  ✓ Automatic work-order creation and unassigned ownership boundary verified for APP-2026-0843');
  }

  // ---------------------------------------------------------------------------
  // 3. Reusing Existing Assignment When Present on Application
  // ---------------------------------------------------------------------------
  {
    const appWithEngineer: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0843')!,
      id: 'APP-2026-0899',
      assignedEngineer: 'Vikramaditya Solanki (JE Field)'
    };

    const res = await erpAdapter.updateApplicationStatus(
      'employee',
      appWithEngineer,
      'Site Inspection',
      'Dispatched with pre-assigned engineer.',
      INITIAL_WORK_ORDERS
    );

    assert.equal(res.success, true);
    assert.equal(res.workOrderCreated, true);
    assert.equal(res.workOrder?.id, 'WO-INS-2026-0899');
    assert.equal(
      res.workOrder?.assignedTo,
      'Vikramaditya Solanki (JE Field)',
      'Must reuse existing assignedEngineer when already present on application'
    );
    assert.equal(
      res.data?.assignedEngineer,
      'Vikramaditya Solanki (JE Field)'
    );
    console.log('  ✓ Existing engineer assignment reuse verified when already present on application');
  }

  // ---------------------------------------------------------------------------
  // 4. Existing-Link Reuse & Duplicate Prevention (Repeated Transitions / Notes)
  // ---------------------------------------------------------------------------
  {
    // Case A: APP-2026-0842 already has WO-4402 in INITIAL_WORK_ORDERS
    const app0842 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0842')!;
    const resExisting = await erpAdapter.updateApplicationStatus(
      'employee',
      app0842,
      'Site Inspection',
      'Added official case note during Site Inspection.',
      INITIAL_WORK_ORDERS
    );

    assert.equal(resExisting.success, true);
    assert.equal(resExisting.workOrderCreated, false, 'Must reuse existing WO-4402 instead of creating a duplicate');
    assert.equal(resExisting.workOrder?.id, 'WO-4402');
    assert.equal(resExisting.data?.assignedWorkOrderId, 'WO-4402');
    assert.equal(
      resExisting.workOrders?.length,
      INITIAL_WORK_ORDERS.length,
      'WorkOrders count must remain unchanged when reusing WO-4402'
    );

    // Case B: Repeatedly advancing/updating APP-2026-0843 after WO-INS-2026-0843 was created
    const app0843 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0843')!;
    const firstPass = ensureSiteInspectionWorkOrderForApplication({
      app: app0843,
      workOrders: INITIAL_WORK_ORDERS,
      actorLabel: 'Pooja Shah (DEE Ops)'
    });
    assert.equal(firstPass.created, true);
    assert.equal(firstPass.updatedWorkOrders.length, INITIAL_WORK_ORDERS.length + 1);

    const updatedApp0843: NewConnectionApplication = {
      ...app0843,
      status: 'Site Inspection',
      workflowStep: 3,
      assignedWorkOrderId: firstPass.assignedWorkOrderId
    };

    const secondPass = ensureSiteInspectionWorkOrderForApplication({
      app: updatedApp0843,
      workOrders: firstPass.updatedWorkOrders,
      actorLabel: 'Pooja Shah (DEE Ops)'
    });
    assert.equal(secondPass.created, false, 'Second call for same application must not create a duplicate work order');
    assert.equal(secondPass.assignedWorkOrderId, firstPass.assignedWorkOrderId);
    assert.equal(
      secondPass.updatedWorkOrders.length,
      firstPass.updatedWorkOrders.length,
      'Work order list length must not increase on repeated Site Inspection processing'
    );
    console.log('  ✓ Existing work-order reuse and duplicate prevention verified');
  }

  // ---------------------------------------------------------------------------
  // 5. Workflow State Machine & RBAC Gate Enforcement (No Partial Updates)
  // ---------------------------------------------------------------------------
  {
    // Application in 'Submitted' stage — cannot skip 'Document Verification' directly to 'Site Inspection'
    const submittedApp: NewConnectionApplication = {
      ...INITIAL_APPLICATIONS[0],
      id: 'APP-2026-0901',
      status: 'Submitted',
      workflowStep: 1,
      assignedWorkOrderId: undefined,
      assignedEngineer: undefined
    };
    assert.equal(
      isValidApplicationTransition('Submitted', 'Site Inspection'),
      false,
      'Direct transition from Submitted to Site Inspection must be forbidden'
    );

    const invalidRes = await erpAdapter.updateApplicationStatus(
      'employee',
      submittedApp,
      'Site Inspection',
      'Attempted to bypass document verification',
      INITIAL_WORK_ORDERS
    );
    assert.equal(invalidRes.success, false, 'Skipping Document Verification must fail');
    assert.equal(invalidRes.code, 'INVALID_STATUS_TRANSITION');
    assert.equal(invalidRes.workOrder, undefined, 'No work order may be created when transition is invalid');
    assert.equal(invalidRes.workOrderCreated, undefined);

    // Also verify APP-2026-0844 ('Sanction Approval') cannot regress to 'Site Inspection'
    const sanctionApp = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0844')!;
    const backwardRes = await erpAdapter.updateApplicationStatus(
      'employee',
      sanctionApp,
      'Site Inspection',
      'Attempted invalid regression',
      INITIAL_WORK_ORDERS
    );
    assert.equal(backwardRes.success, false);
    assert.equal(backwardRes.code, 'INVALID_STATUS_TRANSITION');
    assert.equal(backwardRes.workOrder, undefined);

    // Unauthorized roles ('consumer', 'field') cannot advance applications into Site Inspection
    const app0843 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0843')!;
    for (const unauthorizedRole of ['consumer', 'field'] as const) {
      assert.equal(
        isActionAuthorized(unauthorizedRole, 'PATCH /api/v1/applications/:id/status'),
        false,
        `Role ${unauthorizedRole} must not be authorized to update application status`
      );
      const unauthRes = await erpAdapter.updateApplicationStatus(
        unauthorizedRole,
        app0843,
        'Site Inspection',
        'Unauthorized attempt',
        INITIAL_WORK_ORDERS
      );
      assert.equal(unauthRes.success, false);
      assert.equal(unauthRes.code, 'UNAUTHORIZED_ROLE');
      assert.equal(unauthRes.workOrder, undefined);
    }
    console.log('  ✓ Document Verification prerequisite and RBAC authorization gates verified');
  }

  // ---------------------------------------------------------------------------
  // 6. Cross-Portal Visibility & Consumer Privacy Boundaries
  // ---------------------------------------------------------------------------
  {
    const consumerCaps = getCaseDrawerCapabilities('consumer');
    const employeeCaps = getCaseDrawerCapabilities('employee');
    const fieldCaps = getCaseDrawerCapabilities('field');
    const managementCaps = getCaseDrawerCapabilities('management');
    const adminCaps = getCaseDrawerCapabilities('admin');

    assert.equal(
      consumerCaps.canSeeInternalWorkOrderLinks,
      false,
      'Consumer Portal must not expose internal work-order links or staff assignment badges'
    );
    assert.equal(
      consumerCaps.canViewWorkOrder,
      false,
      'Consumer Portal must not allow opening internal work-order drawers'
    );
    assert.equal(
      consumerCaps.canMutateApplicationLifecycle,
      false,
      'Consumer Portal must not expose application stage mutation controls'
    );

    assert.equal(employeeCaps.canSeeInternalWorkOrderLinks, true, 'Employee Portal must show linked work orders');
    assert.equal(employeeCaps.canViewWorkOrder, true);
    assert.equal(fieldCaps.canSeeInternalWorkOrderLinks, true, 'Field Portal must show linked work orders');
    assert.equal(fieldCaps.canViewWorkOrder, true);
    assert.equal(managementCaps.canSeeInternalWorkOrderLinks, true);
    assert.equal(adminCaps.canSeeInternalWorkOrderLinks, true);
    console.log('  ✓ Cross-portal visibility and consumer privacy boundaries verified');
  }

  // ---------------------------------------------------------------------------
  // 7. Offline Queue Compatibility with Auto-Created Site Inspection Work Order
  // ---------------------------------------------------------------------------
  {
    const app0843 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0843')!;
    const woResolution = ensureSiteInspectionWorkOrderForApplication({
      app: app0843,
      workOrders: INITIAL_WORK_ORDERS,
      actorLabel: 'Pooja Shah (DEE Ops)'
    });
    const workOrdersWithNew = woResolution.updatedWorkOrders;
    const autoWo = woResolution.workOrder;

    // Queue an offline inspection completion against the auto-created work order
    const sampleReport: NonNullable<WorkOrder['inspectionReport']> = {
      meterSerialScanned: 'UGVCL-SM-2026-0843',
      readingKwh: 0,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 232, y: 231, b: 233 },
      technicianRemarks: 'Feasibility verified for 15kW LTMD connection.',
      photoUploaded: true
    };

    const { queue } = enqueueFieldInspectionAction(
      {
        woId: autoWo.id,
        canonicalWorkOrders: workOrdersWithNew,
        existingQueue: [],
        inspectionReport: sampleReport,
        submittedBy: 'Vikramaditya Solanki (FLD-UG-201)'
      },
      null
    );

    let replayedWoStatus: WorkOrder['status'] | undefined;
    const replayResult = replayFieldOfflineQueue({
      queue,
      isOnline: true,
      processedUuids: new Set(),
      storage: null,
      getWorkOrder: (woId: string) => workOrdersWithNew.find(w => w.id === woId),
      executeWorkflowUpdate: (item) => {
        if (item.targetRecordId === autoWo.id) {
          replayedWoStatus = item.payload.targetStatus;
        }
        return { success: true };
      }
    });

    assert.equal(replayResult.syncedCount, 1, 'Offline inspection replay on auto-created work order must succeed');
    assert.equal(replayedWoStatus, 'Completed', 'Replayed work order must transition to Completed');
    assert.equal(
      workOrdersWithNew.filter(w => w.applicationId === 'APP-2026-0843').length,
      1,
      'Offline replay must not create duplicate work orders for the application'
    );
    console.log('  ✓ Phase 2 offline queue compatibility with auto-created work order verified');
  }

  // ---------------------------------------------------------------------------
  // 8. Four-Language Localization (en, gu, hi, mr) for Auto-Created Work Orders
  // ---------------------------------------------------------------------------
  {
    const autoTitle = 'Site Feasibility & Meter Load Inspection (APP-2026-0843)';
    for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
      const locTitle = localizeWorkOrderTitle(autoTitle, lang);
      const locType = localizeWorkOrderType('New Connection Verification', lang);
      const locStatus = localizeWorkOrderStatus('Pending', lang);
      const locUnassigned = localizeAssignedActorName('Unassigned', lang);

      assert.ok(locTitle.includes('APP-2026-0843'), `Localized title in ${lang} must preserve APP-2026-0843`);
      assert.ok(locType.length > 0, `Localized work order type in ${lang} must be non-empty`);
      assert.ok(locStatus.length > 0, `Localized status in ${lang} must be non-empty`);
      assert.ok(locUnassigned.length > 0, `Localized Unassigned label in ${lang} must be non-empty`);

      if (lang !== 'en') {
        assert.notEqual(locTitle, autoTitle, `Title must be translated in ${lang}`);
        assert.notEqual(locType, 'New Connection Verification', `WorkOrder type must be translated in ${lang}`);
        assert.notEqual(locStatus, 'Pending', `WorkOrder status must be translated in ${lang}`);
        assert.notEqual(locUnassigned, 'Unassigned', `Unassigned actor label must be translated in ${lang}`);
      }
    }
    console.log('  ✓ Four-language localization (en, gu, hi, mr) verified for auto-created work orders');
  }

  console.log('All Phase 3 Step 1 automatic site-inspection work-order tests PASSED!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
