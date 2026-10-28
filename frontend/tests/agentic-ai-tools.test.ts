import { EventEmitter } from 'events';
import { AGENTIC_PERSONAS } from '../src/server/agenticPersonas';
import {
  AGENTIC_TOOL_DECLARATIONS,
  getRoleToolDeclarations,
  executeAgenticTool
} from '../src/server/agenticTools';
import { AiCacheManager } from '../src/server/aiCache';
import { ServerAuthService } from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { UserRole } from '../src/types';
import {
  vidyutMitraAiPlugin,
  resetAiMiddlewareStateForTests,
  setCustomGeminiGeneratorForTests
} from '../vite.config';

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

async function invokeAiChat(
  payload: any,
  cookies?: string
): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  let registeredHandler: any = null;
  const plugin = vidyutMitraAiPlugin();
  const configureServer =
    typeof plugin.configureServer === 'function'
      ? plugin.configureServer
      : (plugin.configureServer as any)?.handler;

  configureServer({
    middlewares: {
      use(route: string, handler: any) {
        if (route === '/api/ai-chat') {
          registeredHandler = handler;
        }
      }
    }
  });

  const req = new EventEmitter() as any;
  req.method = 'POST';
  req.headers = {
    'content-type': 'application/json',
    cookie: cookies || ''
  };
  req.socket = { remoteAddress: '127.0.0.1' };

  const headers: Record<string, string> = {};
  let rawOut = '';

  return new Promise(resolve => {
    const res: any = {
      statusCode: 200,
      writableEnded: false,
      setHeader(k: string, v: string) {
        headers[k.toLowerCase()] = v;
      },
      end(chunk?: string) {
        this.writableEnded = true;
        if (chunk) rawOut += chunk;
        let parsed: any = rawOut;
        try {
          parsed = JSON.parse(rawOut);
        } catch {
          // keep raw
        }
        resolve({ statusCode: this.statusCode, headers, body: parsed });
      }
    };

    registeredHandler(req, res);
    req.emit('data', Buffer.from(JSON.stringify(payload)));
    req.emit('end');
  });
}

async function runAgenticAiTestSuite() {
  console.log('\n======================================================');
  console.log('VidyutFlow Step 6B.4 / Phase 1: Role-Specific Agentic AI Tests');
  console.log('======================================================\n');

  const authService = new ServerAuthService();
  const dataStore = new ServerDataStore(authService);

  // -------------------------------------------------------------------------
  // Test Suite 1: Five Role Personas Definition & Boundaries
  // -------------------------------------------------------------------------
  console.log('Test Suite 1: Five Role-Specific Agentic Personas');
  const roles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

  for (const r of roles) {
    const persona = AGENTIC_PERSONAS[r];
    assert(Boolean(persona), `Persona defined for role "${r}"`);
    assert(Boolean(persona.name && persona.name.length > 0), `Persona "${r}" has name: "${persona?.name}"`);
    assert(Boolean(persona.title && persona.title.length > 0), `Persona "${r}" has title: "${persona?.title}"`);
    assert(Boolean(persona.badge && persona.badge.length > 0), `Persona "${r}" has badge: "${persona?.badge}"`);
    assert(Array.isArray(persona.allowedTools) && persona.allowedTools.length > 0, `Persona "${r}" defines allowedTools (${persona?.allowedTools.length})`);
    assert(Array.isArray(persona.capabilities) && persona.capabilities.length > 0, `Persona "${r}" defines capabilities (${persona?.capabilities.length})`);
    assert(Array.isArray(persona.suggestedPrompts) && persona.suggestedPrompts.length > 0, `Persona "${r}" defines suggestedPrompts (${persona?.suggestedPrompts.length})`);
    const welcome = persona.welcomeMessage('Tester');
    assert(welcome.includes('Tester') || welcome.includes('Namaste'), `Persona "${r}" welcome message grounds caller identity`);
  }

  // -------------------------------------------------------------------------
  // Test Suite 2: Tool Declarations & Role-Based Filtering
  // -------------------------------------------------------------------------
  console.log('\nTest Suite 2: Gemini Tool Declarations & Authorization Filtering');
  const consumerTools = getRoleToolDeclarations('consumer');
  const adminTools = getRoleToolDeclarations('admin');
  const fieldTools = getRoleToolDeclarations('field');

  assert(consumerTools.some(t => t.name === 'getConsumerBillDetails'), 'Consumer toolset includes getConsumerBillDetails');
  assert(!consumerTools.some(t => t.name === 'querySystemAuditLogs'), 'Consumer toolset strictly excludes querySystemAuditLogs');
  assert(adminTools.some(t => t.name === 'querySystemAuditLogs'), 'Admin toolset includes querySystemAuditLogs');
  assert(fieldTools.some(t => t.name === 'getAssignedWorkOrders'), 'Field toolset includes getAssignedWorkOrders');
  assert(!fieldTools.some(t => t.name === 'getConsumerBillDetails'), 'Field toolset strictly excludes getConsumerBillDetails (RBAC segregation)');

  // -------------------------------------------------------------------------
  // Test Suite 3: Tool Execution Authorization & Tenant Isolation
  // -------------------------------------------------------------------------
  console.log('\nTest Suite 3: Tool Execution RBAC Enforcement & Privacy Guardrails');

  // Consumer attempts to execute an Admin tool
  const unauthorizedExecution = await executeAgenticTool({
    name: 'querySystemAuditLogs',
    args: {},
    role: 'consumer',
    dataStore
  });
  assert(!unauthorizedExecution.success, 'Consumer executing querySystemAuditLogs is rejected');
  assert(Boolean(unauthorizedExecution.error?.includes('not authorized')), 'Rejection error states unauthorized role');

  // Field engineer attempts to query consumer billing details
  const fieldBillAttempt = await executeAgenticTool({
    name: 'getConsumerBillDetails',
    args: { consumerNo: '04281-99231' },
    role: 'field',
    dataStore
  });
  assert(!fieldBillAttempt.success, 'Field role querying getConsumerBillDetails is rejected');

  // Consumer calculates official GERC tariff estimate
  const tariffCalc = await executeAgenticTool({
    name: 'calculateTariffEstimate',
    args: { units: 300, category: 'RGPU', sanctionedLoadKw: 2 },
    role: 'consumer',
    dataStore
  });
  assert(tariffCalc.success, 'calculateTariffEstimate executes successfully');
  assert(Boolean(tariffCalc.data?.slabBreakdown?.length === 4), 'calculateTariffEstimate returns 4 GERC residential slabs');
  assert(Boolean(tariffCalc.data?.billedUnits === 300), 'calculateTariffEstimate verifies 300 kWh consumption');

  // Employee scans application queue
  const empAppQueue = await executeAgenticTool({
    name: 'listPendingApplications',
    args: {},
    role: 'employee',
    dataStore
  });
  assert(empAppQueue.success, 'Employee listPendingApplications executes successfully');
  assert(Array.isArray(empAppQueue.data?.applications), 'listPendingApplications returns applications array');

  // Field engineer queries feeder and transformer telemetry
  const fieldFeederStatus = await executeAgenticTool({
    name: 'getFeederAndTransformerStatus',
    args: { minLoadPercent: 80 },
    role: 'field',
    dataStore
  });
  assert(fieldFeederStatus.success, 'Field getFeederAndTransformerStatus executes successfully');
  assert(fieldFeederStatus.data?.monitoredFeeders?.length > 0, 'Returns overloaded feeders above 80% capacity');

  // Management executive queries Discom KPI summary
  const mgmtKpis = await executeAgenticTool({
    name: 'getExecutiveKpiSummary',
    args: {},
    role: 'management',
    dataStore
  });
  assert(mgmtKpis.success, 'Management getExecutiveKpiSummary executes successfully');
  assert(mgmtKpis.data?.discomAggregateLossPct === 11.4, 'Management KPI summary contains Discom loss figure (11.4%)');

  // Admin queries security access matrix
  const adminRbac = await executeAgenticTool({
    name: 'getSecurityAccessMatrix',
    args: {},
    role: 'admin',
    dataStore
  });
  assert(adminRbac.success, 'Admin getSecurityAccessMatrix executes successfully');
  assert(adminRbac.data?.rolesConfigured?.length === 5, 'Security access matrix audits all 5 enterprise roles');

  // -------------------------------------------------------------------------
  // Test Suite 4: In-Memory LRU Cache, Rate Limiter & Circuit Breaker
  // -------------------------------------------------------------------------
  console.log('\nTest Suite 4: AI Response Cache, Rate Limiter & Circuit Breaker Isolation');
  const cacheMgr = new AiCacheManager({
    maxCacheEntries: 5,
    defaultTtlMs: 500, // 500ms TTL for testing
    maxRequestsPerWindow: 3,
    rateLimitWindowMs: 1000
  });

  // Cross-user cache isolation test
  const user1Key = cacheMgr.generateCacheKey('user_1', 'consumer', 'Explain my bill', '04281-99231');
  const user2Key = cacheMgr.generateCacheKey('user_2', 'consumer', 'Explain my bill', '04281-99231');
  assert(user1Key !== user2Key, 'Cache keys for different users are strictly isolated and unique');

  cacheMgr.set(user1Key, 'user_1', 'consumer', 'Bill explanation for user 1', ['getConsumerBillDetails']);
  assert(cacheMgr.get(user1Key) !== null, 'User 1 cached response is retrievable');
  assert(cacheMgr.get(user2Key) === null, 'User 2 cannot retrieve or collide with User 1 cached entry');

  // Rate Limiting test
  const clientKey = 'client_test_ip';
  const r1 = cacheMgr.checkRateLimit(clientKey);
  const r2 = cacheMgr.checkRateLimit(clientKey);
  const r3 = cacheMgr.checkRateLimit(clientKey);
  const r4 = cacheMgr.checkRateLimit(clientKey);
  assert(r1.allowed && r2.allowed && r3.allowed, 'First 3 requests within window are allowed');
  assert(!r4.allowed, '4th request exceeds maxRequestsPerWindow and is throttled (429)');

  // Circuit breaker test
  cacheMgr.recordFailure(new Error('429 RESOURCE_EXHAUSTED Quota exceeded'));
  const circuitState = cacheMgr.isCircuitOpen();
  assert(circuitState.isOpen, 'Circuit breaker trips into OPEN state after 429 quota exhaustion');
  assert(circuitState.reason === 'GEMINI_QUOTA_COOLDOWN', 'Circuit records GEMINI_QUOTA_COOLDOWN reason');
  cacheMgr.recordSuccess();
  assert(!cacheMgr.isCircuitOpen().isOpen, 'Circuit breaker resets to CLOSED on recordSuccess()');

  // -------------------------------------------------------------------------
  // Test Suite 5: /api/ai-chat Middleware Integration
  // -------------------------------------------------------------------------
  console.log('\nTest Suite 5: /api/ai-chat Server Endpoint & Multi-Role Responses');
  resetAiMiddlewareStateForTests();

  // Test Consumer query with Custom Generator override
  setCustomGeminiGeneratorForTests(async params => {
    return `### Vidyut Mitra Response\nVerified bill: ₹2,185.00 for connection 04281-99231.\n\n[Open Electricity Bills](action:bills)`;
  });

  const consumerRes = await invokeAiChat({
    message: 'Explain my latest electricity bill',
    role: 'consumer'
  });

  assert(consumerRes.statusCode === 200, 'Consumer /api/ai-chat responds with HTTP 200');
  assert(consumerRes.body.persona?.name === 'Vidyut Mitra', 'Response identifies persona as "Vidyut Mitra"');
  assert(consumerRes.body.persona?.role === 'consumer', 'Response confirms role is "consumer"');
  assert(consumerRes.body.reply.includes('₹2,185.00'), 'Response includes grounded bill value');

  // Test Employee query
  setCustomGeminiGeneratorForTests(async params => {
    return `### Operations Co-Pilot Analysis\nScreened 4 pending applications in Gandhinagar Sub-Division.\n\n[Application Queue](action:applications)`;
  });

  const employeeRes = await invokeAiChat({
    message: 'Review pending applications awaiting sanction',
    role: 'employee'
  });
  assert(employeeRes.statusCode === 200, 'Employee /api/ai-chat responds with HTTP 200');
  assert(employeeRes.body.persona?.name === 'Operations Co-Pilot', 'Response identifies persona as "Operations Co-Pilot"');
  assert(employeeRes.body.persona?.role === 'employee', 'Response confirms role is "employee"');

  // Test Field Engineer query
  setCustomGeminiGeneratorForTests(async params => {
    return `### Field Intelligence Assistant\nChecked 11kV Visnagar Road Feeder (108.2% overload).\n\n[Feeder Patrol](action:maintenance)`;
  });

  const fieldRes = await invokeAiChat({
    message: 'Check 11kV feeder overload status',
    role: 'field'
  });
  assert(fieldRes.statusCode === 200, 'Field /api/ai-chat responds with HTTP 200');
  assert(fieldRes.body.persona?.name === 'Field Intelligence Assistant', 'Response identifies persona as "Field Intelligence Assistant"');

  // Test Management query
  setCustomGeminiGeneratorForTests(async params => {
    return `### Executive Intelligence Briefing\nDiscom AT&C loss is 11.4% against GERC target of 12.0%.\n\n[Executive Cockpit](action:dashboard)`;
  });

  const mgmtRes = await invokeAiChat({
    message: 'Summarize Discom AT&C loss',
    role: 'management'
  });
  assert(mgmtRes.statusCode === 200, 'Management /api/ai-chat responds with HTTP 200');
  assert(mgmtRes.body.persona?.name === 'Executive Intelligence Agent', 'Response identifies persona as "Executive Intelligence Agent"');

  // Test Admin query
  setCustomGeminiGeneratorForTests(async params => {
    return `### Security & Governance Audit\nRBAC rules verified across all 5 roles with 0 privilege violations.\n\n[Audit Trail](action:audit)`;
  });

  const adminRes = await invokeAiChat({
    message: 'Audit RBAC matrix and system telemetry',
    role: 'admin'
  });
  assert(adminRes.statusCode === 200, 'Admin /api/ai-chat responds with HTTP 200');
  assert(adminRes.body.persona?.name === 'Security & Governance Agent', 'Response identifies persona as "Security & Governance Agent"');

  // Cleanup test override
  setCustomGeminiGeneratorForTests(null);
  resetAiMiddlewareStateForTests();

  console.log('\n======================================================');
  console.log(`AGENTIC AI TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAgenticAiTestSuite().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
