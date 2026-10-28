import assert from 'node:assert/strict';
import { ErpApiClient } from '../src/services/apiClient';
import {
  createErpRepositoryBundle,
  DemoErpRepositoryBundle,
  LiveErpRepositoryBundle
} from '../src/services/repositories';

console.log('🧪 Starting VidyutFlow Phase 5: Persistent Backend Integration & Database Readiness Tests...');

async function runPhase5Tests() {
  // ============================================================================
  // 1. DEMO vs LIVE Mode Separation & No Silent Fallback in LIVE Mode
  // ============================================================================
  let requestedUrls: string[] = [];
  let capturedHeaders: Record<string, string>[] = [];

  const failingBackendFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    requestedUrls.push(url);
    capturedHeaders.push((init?.headers as Record<string, string>) || {});
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Service Unavailable: PostgreSQL cluster not yet connected',
        code: 'BACKEND_UNAVAILABLE'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  };

  const liveClient = new ErpApiClient({
    baseUrl: 'https://erp-api.ugvcl.example.in',
    mode: 'LIVE',
    maxRetries: 1,
    retryDelayMs: 5,
    fetchImpl: failingBackendFetch
  });

  const liveBundle = createErpRepositoryBundle('LIVE', liveClient);
  assert.equal(liveBundle.mode, 'LIVE', 'Live bundle must report LIVE operating mode');
  assert.ok(liveBundle instanceof LiveErpRepositoryBundle);

  const liveConnResult = await liveBundle.consumersConnections.getConnections('employee');
  assert.equal(
    liveConnResult.success,
    false,
    'LIVE mode must return success: false when backend fails and MUST NOT silently return demo connections'
  );
  assert.equal(
    liveConnResult.data,
    undefined,
    'LIVE mode failure must not populate simulated fallback data'
  );
  assert.equal(liveConnResult.code, 'BACKEND_UNAVAILABLE');
  assert.equal(liveConnResult.meta?.source, 'backend-live');
  assert.equal(
    liveConnResult.meta?.retriedCount,
    1,
    'Idempotent GET request should safely retry once on 503 before failing'
  );
  console.log('✓ 1. LIVE mode strictly separated from DEMO mode — zero silent fallback on 503 failure');

  // ============================================================================
  // 2. HTML Fallback Detection (Vite Dev Server Unmounted /api/v1/* Route)
  // ============================================================================
  const htmlFallbackFetch: typeof fetch = async () => {
    return new Response('<!doctype html><html><body>SPA Fallback</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  };

  const htmlCheckClient = new ErpApiClient({
    mode: 'LIVE',
    maxRetries: 0,
    fetchImpl: htmlFallbackFetch
  });

  const htmlFallbackRes = await htmlCheckClient.get('/api/v1/applications');
  assert.equal(
    htmlFallbackRes.success,
    false,
    'Unmounted /api/v1/* route returning HTML 200 fallback must be flagged as BACKEND_UNAVAILABLE'
  );
  assert.equal(htmlFallbackRes.code, 'BACKEND_UNAVAILABLE');
  console.log('✓ 2. Unmounted /api/v1/* routes returning SPA HTML are accurately detected as BACKEND_UNAVAILABLE');

  // ============================================================================
  // 3. Authentication, CSRF Headers, Request Tracing & Non-Idempotent Retry Safety
  // ============================================================================
  requestedUrls = [];
  capturedHeaders = [];

  const postFailClient = new ErpApiClient({
    baseUrl: '',
    mode: 'LIVE',
    maxRetries: 2,
    retryDelayMs: 5,
    fetchImpl: failingBackendFetch
  });

  // Un-keyed POST mutation must NOT retry on 503 to prevent duplicate side effects
  const unkeyedPostRes = await postFailClient.post('/api/v1/applications', {
    applicantName: 'Test Consumer'
  });
  assert.equal(unkeyedPostRes.success, false);
  assert.equal(
    requestedUrls.length,
    1,
    'Non-idempotent POST without Idempotency-Key must NEVER retry automatically'
  );
  assert.equal(
    capturedHeaders[0]['X-VidyutFlow-CSRF'],
    '1',
    'State-changing POST must attach X-VidyutFlow-CSRF header'
  );
  assert.match(
    capturedHeaders[0]['X-Request-Id'] || '',
    /^REQ-\d+-[A-Z0-9]+$/,
    'Every request must attach a unique X-Request-Id tracing header'
  );
  console.log('✓ 3. CSRF headers, X-Request-Id tracing, and non-idempotent retry protection verified');

  // ============================================================================
  // 4. Request Timeout Enforcement via AbortController
  // ============================================================================
  const hangingFetch: typeof fetch = (_input, init) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted: REQUEST_TIMEOUT');
        err.name = 'AbortError';
        reject(err);
      });
    });
  };

  const timeoutClient = new ErpApiClient({
    mode: 'LIVE',
    timeoutMs: 25,
    maxRetries: 0,
    fetchImpl: hangingFetch
  });

  const timeoutRes = await timeoutClient.get('/api/v1/incidents');
  assert.equal(timeoutRes.success, false, 'Timed out request must fail cleanly');
  assert.equal(timeoutRes.code, 'REQUEST_TIMEOUT', 'Error code must be REQUEST_TIMEOUT');
  assert.equal(timeoutRes.statusCode, 408);
  console.log('✓ 4. Request timeout enforcement aborts slow calls and returns REQUEST_TIMEOUT (408)');

  // ============================================================================
  // 5. Authorization Boundaries Across Repository Interfaces
  // ============================================================================
  const demoBundle = createErpRepositoryBundle('DEMO', liveClient);
  assert.equal(demoBundle.mode, 'DEMO');
  assert.ok(demoBundle instanceof DemoErpRepositoryBundle);

  // Consumer cannot approve applications, view work orders, or view admin audit logs
  const consumerSanctionAttempt = await demoBundle.applications.updateApplicationStatus(
    'consumer',
    'APP-2026-0843',
    { status: 'Site Inspection' }
  );
  assert.equal(consumerSanctionAttempt.success, false);
  assert.equal(consumerSanctionAttempt.code, 'UNAUTHORIZED_ROLE');

  const consumerWorkOrdersAttempt = await demoBundle.workOrders.getWorkOrders('consumer');
  assert.equal(consumerWorkOrdersAttempt.success, false);
  assert.equal(consumerWorkOrdersAttempt.code, 'UNAUTHORIZED_ROLE');

  const employeeAuditAttempt = await demoBundle.auditLogs.getAuditLogs('employee');
  assert.equal(employeeAuditAttempt.success, false);
  assert.equal(employeeAuditAttempt.code, 'UNAUTHORIZED_ROLE');

  const adminAuditSuccess = await demoBundle.auditLogs.getAuditLogs('admin');
  assert.equal(adminAuditSuccess.success, true);
  assert.ok((adminAuditSuccess.data?.length || 0) > 0);
  console.log('✓ 5. Repository RBAC boundaries block unauthorized roles across Applications, WorkOrders, and AuditLogs');

  // ============================================================================
  // 6. Optimistic Concurrency Control & Duplicate Mutation Prevention (Idempotency)
  // ============================================================================
  const initialVersion = demoBundle.getRecordVersion('application:APP-2026-0843');
  assert.equal(initialVersion, 1);

  const firstUpdate = await demoBundle.applications.updateApplicationStatus(
    'employee',
    'APP-2026-0843',
    { status: 'Site Inspection', note: 'Documents verified by AE.' },
    { expectedVersion: 1, idempotencyKey: 'IDEM-APP-0843-STEP2' }
  );
  assert.equal(firstUpdate.success, true);
  assert.equal(firstUpdate.data?.status, 'Site Inspection');
  assert.equal(firstUpdate.meta?.version, 2);

  // Duplicate mutation with same idempotencyKey must be rejected with IDEMPOTENCY_CONFLICT
  const duplicateUpdate = await demoBundle.applications.updateApplicationStatus(
    'employee',
    'APP-2026-0843',
    { status: 'Sanction Approval' },
    { idempotencyKey: 'IDEM-APP-0843-STEP2' }
  );
  assert.equal(duplicateUpdate.success, false);
  assert.equal(duplicateUpdate.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(duplicateUpdate.statusCode, 409);

  // Stale expectedVersion (v1 when current is v2) must be rejected with CONFLICT_VERSION_MISMATCH
  const staleVersionUpdate = await demoBundle.applications.updateApplicationStatus(
    'employee',
    'APP-2026-0843',
    { status: 'Sanction Approval' },
    { expectedVersion: 1 }
  );
  assert.equal(staleVersionUpdate.success, false);
  assert.equal(staleVersionUpdate.code, 'CONFLICT_VERSION_MISMATCH');
  assert.equal(staleVersionUpdate.statusCode, 409);
  console.log('✓ 6. Optimistic concurrency (CONFLICT_VERSION_MISMATCH) and idempotency (IDEMPOTENCY_CONFLICT) enforced');

  // ============================================================================
  // 7. Cross-Portal Data Consistency Across Repositories
  // ============================================================================
  // Assigning a complaint in Employee portal creates a linked WorkOrder for Field portal
  // and completing the WorkOrder in Field portal resolves the Complaint in Consumer/Employee portals
  const assignRes = await demoBundle.complaints.assignComplaintToField(
    'employee',
    'CMP-8822',
    {
      engineerName: 'Vikramaditya Solanki (JE Field)',
      priority: 'High',
      instructions: 'Replace optical port sensor on industrial meter.'
    }
  );
  assert.equal(assignRes.success, true);
  assert.equal(assignRes.data?.complaint.status, 'Dispatched');
  const createdWoId = assignRes.data!.workOrder.id;

  // Field Engineer transitions Work Order: Pending -> En Route -> On Site -> Completed
  await demoBundle.workOrders.updateWorkOrderStatus('field', createdWoId, { status: 'En Route' });
  await demoBundle.workOrders.updateWorkOrderStatus('field', createdWoId, { status: 'On Site' });
  const completeWoRes = await demoBundle.workOrders.updateWorkOrderStatus('field', createdWoId, {
    status: 'Completed',
    report: {
      meterSerialScanned: 'UG-IND-77190',
      readingKwh: 14520,
      sealIntact: true,
      terminalCondition: 'Normal',
      tamperDetected: false,
      testedPhaseVoltage: { r: 239, y: 240, b: 238 },
      technicianRemarks: 'Optical port module replaced and calibrated.',
      photoUploaded: true
    }
  });
  assert.equal(completeWoRes.success, true);
  assert.equal(completeWoRes.data?.syncedComplaint?.status, 'Resolved');

  const verifyCmp = await demoBundle.complaints.getComplaintById('consumer', 'CMP-8822');
  assert.equal(verifyCmp.success, true);
  assert.equal(
    verifyCmp.data?.status,
    'Resolved',
    'Complaint status must be synchronized across Field, Employee, and Consumer views'
  );
  console.log('✓ 7. Cross-portal data consistency verified across Complaint -> WorkOrder -> Resolution lifecycle');

  console.log('======================================================');
  console.log('Phase 5 Backend Readiness Tests Complete: ALL PASSED');
  console.log('======================================================');
}

runPhase5Tests().catch(err => {
  console.error('Phase 5 test failure:', err);
  process.exit(1);
});
