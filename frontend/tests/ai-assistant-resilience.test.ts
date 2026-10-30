import { EventEmitter } from 'events';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { generateUtilityGroundedResponse, UtilityEngineContext } from '../src/utils/utilityAiEngine';
import { INITIAL_CONNECTIONS, INITIAL_BILLS, INITIAL_PAYMENTS, INITIAL_COMPLAINTS } from '../src/data/mockData';
import {
  vidyutMitraAiPlugin,
  resetAiMiddlewareStateForTests,
  setCustomGeminiGeneratorForTests,
  SERVER_GEMINI_TIMEOUT_MS
} from '../vite.config';
import { defaultServerAuthService } from '../src/server/authRoutes';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { SESSION_COOKIE_NAME } from '../src/server/authService';

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

// Build realistic Consumer context for Smt. Meenaben Patel from preserved mockData
const demoConsumerContext: UtilityEngineContext = {
  consumerName: 'Smt. Meenaben Patel',
  hasLinkedConnections: true,
  selectedConnectionNo: '04281-99231',
  connections: INITIAL_CONNECTIONS.filter(c => c.consumerName.includes('Meenaben')).map(c => ({
    consumerNo: c.consumerNo,
    connectionId: c.connectionId,
    consumerName: c.consumerName,
    category: c.tariffCategory,
    tariffCategory: c.tariffCategory,
    sanctionedLoadKw: c.sanctionedLoadKw,
    phase: c.phase,
    meterNo: c.meterNo,
    subdivision: c.subdivision,
    feederName: c.feederName,
    status: c.status,
    lastReadingDate: c.lastReadingDate,
    currentReadingKwh: c.currentReadingKwh,
    previousReadingKwh: c.previousReadingKwh,
    averageMonthlyKwh: c.averageMonthlyKwh,
    bills: INITIAL_BILLS.filter(b => b.consumerNo === c.consumerNo)
  })),
  payments: INITIAL_PAYMENTS.filter(p => p.consumerNo === '04281-99231'),
  complaints: INITIAL_COMPLAINTS.filter(cmp => cmp.consumerNo === '04281-99231')
};

// Helper to invoke the Vite /api/ai-chat middleware in-process
async function invokeAiChatMiddleware(
  payload: any,
  method = 'POST',
  clientIp = '127.0.0.1'
): Promise<{ statusCode: number; headers: Record<string, string>; body: any; elapsedMs: number }> {
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

  const roleKey = (payload?.role || 'consumer') as keyof typeof DEFAULT_DEMO_ACCOUNTS;
  const acct = DEFAULT_DEMO_ACCOUNTS[roleKey] || DEFAULT_DEMO_ACCOUNTS.consumer;
  const auth = defaultServerAuthService.login({ email: acct.email, password: acct.password });
  const sessionCookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(auth.session.signedToken)}`;

  const req = new EventEmitter() as any;
  req.method = method;
  req.headers = {
    'x-forwarded-for': clientIp,
    'content-type': 'application/json',
    cookie: sessionCookie
  };
  req.socket = { remoteAddress: clientIp };

  const headers: Record<string, string> = {};
  let rawOut = '';
  const start = Date.now();

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
          // keep raw string
        }
        resolve({
          statusCode: this.statusCode,
          headers,
          body: parsed,
          elapsedMs: Date.now() - start
        });
      }
    };

    registeredHandler(req, res);

    if (method === 'POST') {
      const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
      req.emit('data', Buffer.from(str, 'utf8'));
      req.emit('end');
    }
  });
}

async function runTests() {
  console.log('\n================================================================');
  console.log('VIDYUTFLOW STEP 4.1 & 4.2 — VIDYUT MITRA AI & BILLING ACCURACY SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Utility Grounded Engine Core Query & Billing Accuracy Verification
  // -------------------------------------------------------------------------
  console.log('--- 1. Utility Grounded Engine Core Query & Billing Accuracy Verification ---');

  const septBillReply = generateUtilityGroundedResponse(
    'What is my September 2026 electricity bill amount?',
    'consumer',
    demoConsumerContext
  );
  assert(
    septBillReply.includes('₹2,185.00') && septBillReply.includes('04281-99231') && septBillReply.includes('360 kWh'),
    'Consumer query "What is my September 2026 electricity bill amount?" returns exact ₹2,185.00 demo bill summary for 04281-99231'
  );
  assert(
    septBillReply.includes('₹1,420.00') && septBillReply.includes('BILL-UG-2026-10-8821'),
    'September 2026 bill reply includes stored energyCharges ₹1,420.00 and demo bill ID BILL-UG-2026-10-8821'
  );
  assert(
    septBillReply.includes('₹1,522.00') && !septBillReply.includes('1,522.50') && !septBillReply.includes('1522.50'),
    'September 2026 bill reply dynamically calculates slab sum as ₹1,522.00 (never ₹1,522.50)'
  );
  assert(
    septBillReply.includes('₹102.00') &&
      !septBillReply.includes('102.50') &&
      septBillReply.toLowerCase().includes('unexplained demo-data discrepancy'),
    'September 2026 bill reply explicitly reports the ₹102.00 difference as an unexplained demo-data discrepancy'
  );
  assert(
    septBillReply.includes('Stored Demo Bill Record Values') &&
      septBillReply.includes('Dynamically Calculated Slab Breakdown'),
    'September 2026 bill reply clearly distinguishes stored demo bill values from calculated slab totals'
  );
  assert(
    septBillReply.includes('SIMULATED DEMO BILL RECORD') &&
      septBillReply.includes('not an official UGVCL invoice') &&
      !septBillReply.toLowerCase().includes('official invoice') &&
      !septBillReply.toLowerCase().includes('authorized invoice'),
    'September 2026 bill reply labels the bill as a simulated demo record and never as an official UGVCL invoice'
  );
  assert(
    !septBillReply.toLowerCase().includes('promotional credit') &&
      !septBillReply.toLowerCase().includes('timely digital payment') &&
      !septBillReply.toLowerCase().includes('urban adjustment') &&
      !septBillReply.toLowerCase().includes('utility billing schedule'),
    'September 2026 bill reply does not invent subsidy reasons, tariff adjustments, or payment incentives'
  );

  // Verify dynamic slab calculation across other stored bills (August 2026 & July 2026)
  const augBillReply = generateUtilityGroundedResponse(
    'Explain my August 2026 bill',
    'consumer',
    demoConsumerContext
  );
  assert(
    augBillReply.includes('BILL-UG-2026-09-8821') &&
      augBillReply.includes('₹1,782.00') &&
      augBillReply.includes('₹1,680.00') &&
      augBillReply.includes('₹102.00') &&
      augBillReply.toLowerCase().includes('unexplained demo-data discrepancy'),
    'August 2026 bill reply dynamically computes ₹1,782.00 slab total vs ₹1,680.00 stored energyCharges (₹102.00 unexplained discrepancy)'
  );

  const julBillReply = generateUtilityGroundedResponse(
    'Explain my July 2026 bill',
    'consumer',
    demoConsumerContext
  );
  assert(
    julBillReply.includes('BILL-UG-2026-08-8821') &&
      julBillReply.includes('₹1,704.00') &&
      julBillReply.includes('₹1,605.00') &&
      julBillReply.includes('₹99.00') &&
      julBillReply.toLowerCase().includes('unexplained demo-data discrepancy'),
    'July 2026 bill reply dynamically computes ₹1,704.00 slab total vs ₹1,605.00 stored energyCharges (₹99.00 unexplained discrepancy)'
  );

  // Verify dynamic calculation with arbitrary runtime slab values (proving zero hardcoding)
  const customDynamicContext: UtilityEngineContext = {
    consumerName: 'Dynamic Test Consumer',
    hasLinkedConnections: true,
    connections: [
      {
        consumerNo: '04281-00001',
        tariffCategory: 'Residential (RGPU)',
        bills: [
          {
            billNo: 'BILL-DYN-001',
            billMonth: 'September 2026',
            billDate: '04-Oct-2026',
            dueDate: '22-Oct-2026',
            unitsConsumed: 120,
            energyCharges: 400,
            fixedCharges: 100,
            fuelPriceAdjustment: 50,
            electricityDuty: 60,
            rebateOrSubsidy: 10,
            totalAmount: 600,
            status: 'Unpaid',
            slabBreakdown: [
              { slab: 'Tier A', units: 50, rate: 3.0, amount: 150 },
              { slab: 'Tier B', units: 70, rate: 4.0, amount: 280 }
            ]
          }
        ]
      }
    ]
  };
  const customDynamicReply = generateUtilityGroundedResponse(
    'Explain my September 2026 bill',
    'consumer',
    customDynamicContext
  );
  assert(
    customDynamicReply.includes('₹430.00') &&
      customDynamicReply.includes('₹400.00') &&
      customDynamicReply.includes('₹30.00') &&
      customDynamicReply.toLowerCase().includes('unexplained demo-data discrepancy'),
    'Dynamic slab calculator computes arbitrary runtime slabs (150 + 280 = ₹430.00 vs ₹400.00 stored = ₹30.00 discrepancy) without hardcoding'
  );

  const hiReply = generateUtilityGroundedResponse('Hi', 'consumer', demoConsumerContext);
  assert(
    hiReply.includes('Smt. Meenaben Patel') && hiReply.includes('04281-99231') && hiReply.includes('2,185'),
    'Consumer greeting "Hi" returns immediate personalized response with active connection and bill snapshot'
  );

  const unlinkedContext: UtilityEngineContext = {
    consumerName: 'Rameshbhai Desai',
    hasLinkedConnections: false,
    connections: []
  };
  const unlinkedReply = generateUtilityGroundedResponse(
    'What is my September 2026 electricity bill amount?',
    'consumer',
    unlinkedContext
  );
  assert(
    unlinkedReply.includes('No Linked Electricity Connections') &&
      unlinkedReply.includes('Rameshbhai Desai') &&
      !unlinkedReply.includes('Meenaben'),
    'Newly registered consumer with 0 linked connections receives linking instructions without leaking demo consumer data'
  );

  // -------------------------------------------------------------------------
  // 2. Staff Portal Grounded Engine & Navigation Guard Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Staff Portal Grounded Engine & Navigation Guard Verification ---');

  const roleAllowedTabs: Record<string, string[]> = {
    consumer: ['dashboard', 'connections', 'new-connection', 'bills', 'payments', 'complaints', 'requests', 'notifications', 'profile'],
    employee: ['dashboard', 'applications', 'consumers', 'complaints', 'approvals', 'coordination', 'reports'],
    field: ['dashboard', 'workorders', 'inspections', 'maintenance', 'offline', 'history'],
    management: ['dashboard', 'analytics', 'sla', 'feeders', 'ai-insights', 'reports'],
    admin: ['overview', 'users', 'access', 'audit', 'integrations', 'infra', 'settings']
  };

  for (const role of ['consumer', 'employee', 'field', 'management', 'admin']) {
    const sampleQueries = [
      'Hi',
      'Standard Operating Procedure for burnt smart meter replacement',
      'Feeder tail-end voltage compensation guidelines',
      'GERC aggregate technical & commercial (AT&C) loss benchmark targets'
    ];
    for (const q of sampleQueries) {
      const reply = generateUtilityGroundedResponse(q, role, {
        consumerName: `Staff ${role}`,
        role,
        hasLinkedConnections: true,
        connections: role === 'consumer' ? demoConsumerContext.connections : []
      });
      const actions = Array.from(reply.matchAll(/\(action:([a-z-]+)\)/g)).map(m => m[1]);
      const allValid = actions.every(a => roleAllowedTabs[role].includes(a));
      assert(
        allValid && actions.length > 0,
        `Role "${role}" query "${q.slice(0, 32)}..." emits only authorized role navigation links (${actions.join(', ')})`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. /api/ai-chat Middleware Lifecycle: Gemini Available, Quota 429, & Timeout
  // -------------------------------------------------------------------------
  console.log('\n--- 3. /api/ai-chat Middleware Lifecycle & Fallback Verification ---');

  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key-for-middleware-verification';

  try {
    // 3a. Normal Gemini API availability & systemInstruction verification
    resetAiMiddlewareStateForTests();
    let capturedSystemInstruction = '';
    setCustomGeminiGeneratorForTests(async ({ systemInstruction }) => {
      capturedSystemInstruction = systemInstruction;
      return '### Simulated Demo Bill Response\nYour September 2026 demo bill for `04281-99231` has stored total **₹2,185.00** (calculated slab sum **₹1,522.00** vs stored `energyCharges` **₹1,420.00**, an **unexplained demo-data discrepancy** of **₹102.00**).';
    });

    const normalRes = await invokeAiChatMiddleware({
      message: 'What is my September 2026 electricity bill amount?',
      role: 'consumer',
      accountContext: demoConsumerContext
    });
    assert(
      normalRes.statusCode === 200 &&
        normalRes.body.isFallback === false &&
        normalRes.body.reply.includes('₹1,522.00'),
      'When Gemini API is available, /api/ai-chat returns live Gemini response with isFallback: false'
    );
    assert(
      capturedSystemInstruction.includes('₹1,522.00') &&
        capturedSystemInstruction.includes('unexplained demo-data discrepancy') &&
        capturedSystemInstruction.includes('not an official UGVCL invoice') &&
        !capturedSystemInstruction.includes('billed after RGPU urban adjustment'),
      'Gemini systemInstruction enforces ₹1,522.00 slab sum, unexplained demo-data discrepancy labeling, and prohibits unsupported adjustment claims'
    );

    // 3b. Gemini API Quota Exhausted (429 RESOURCE_EXHAUSTED)
    resetAiMiddlewareStateForTests();
    setCustomGeminiGeneratorForTests(async () => {
      throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for gemini-3.8-flash');
    });

    const quotaRes = await invokeAiChatMiddleware({
      message: 'What is my September 2026 electricity bill amount?',
      role: 'consumer',
      accountContext: demoConsumerContext
    });
    assert(
      quotaRes.statusCode === 200 &&
        quotaRes.body.isFallback === true &&
        quotaRes.body.fallbackReason === 'QUOTA_EXHAUSTED' &&
        quotaRes.body.reply.includes('₹2,185.00') &&
        quotaRes.body.reply.includes('₹1,522.00'),
      'When Gemini reaches quota limit (429), /api/ai-chat automatically switches to Utility Grounded Engine with accurate ₹1,522.00 slab total'
    );

    // 3c. Gemini API Slow / Unresponsive -> Finite Timeout & AbortSignal
    resetAiMiddlewareStateForTests();
    let abortSignalTriggered = false;
    setCustomGeminiGeneratorForTests(async ({ abortSignal }) => {
      return new Promise<string>((_resolve, reject) => {
        abortSignal.addEventListener('abort', () => {
          abortSignalTriggered = true;
          reject(new Error('AbortError'));
        });
      });
    });

    const timeoutRes = await invokeAiChatMiddleware({
      message: 'Hi',
      role: 'consumer',
      accountContext: demoConsumerContext
    });
    assert(
      timeoutRes.statusCode === 200 &&
        timeoutRes.body.isFallback === true &&
        timeoutRes.body.fallbackReason === 'TIMEOUT' &&
        abortSignalTriggered &&
        timeoutRes.elapsedMs < SERVER_GEMINI_TIMEOUT_MS + 1000 &&
        timeoutRes.body.reply.includes('Smt. Meenaben Patel'),
      `When Gemini hangs, /api/ai-chat aborts at ${SERVER_GEMINI_TIMEOUT_MS}ms and returns Utility Grounded Engine response (${timeoutRes.elapsedMs}ms)`
    );

    // 3d. Circuit-breaker cooldown ensures immediate response on next message
    setCustomGeminiGeneratorForTests(null);
    const cooldownRes = await invokeAiChatMiddleware({
      message: 'Hi',
      role: 'consumer',
      accountContext: demoConsumerContext
    });
    assert(
      cooldownRes.statusCode === 200 &&
        cooldownRes.body.isFallback === true &&
        cooldownRes.elapsedMs < 100 &&
        cooldownRes.body.reply.includes('Smt. Meenaben Patel'),
      `Subsequent query during cooldown responds immediately in ${cooldownRes.elapsedMs}ms (< 100ms) without re-hanging`
    );

    // 3e. Unconfigured API Key fallback
    resetAiMiddlewareStateForTests();
    delete process.env.GEMINI_API_KEY;
    const noKeyRes = await invokeAiChatMiddleware({
      message: 'What is my September 2026 electricity bill amount?',
      role: 'consumer',
      accountContext: demoConsumerContext
    });
    assert(
      noKeyRes.statusCode === 200 &&
        noKeyRes.body.isFallback === true &&
        noKeyRes.body.fallbackReason === 'UNCONFIGURED_KEY' &&
        noKeyRes.body.configured === false &&
        noKeyRes.body.reply.includes('₹2,185.00'),
      'When GEMINI_API_KEY is absent, /api/ai-chat immediately returns Utility Grounded Engine response'
    );
  } finally {
    setCustomGeminiGeneratorForTests(null);
    resetAiMiddlewareStateForTests();
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  }

  // -------------------------------------------------------------------------
  // 4. Frontend AIAssistantDrawer Loading-State & Timeout Safeguards
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Frontend AIAssistantDrawer Safeguard Inspection ---');

  const drawerPath = fileURLToPath(new URL('../src/components/common/AIAssistantDrawer.tsx', import.meta.url));
  const drawerCode = fs.readFileSync(drawerPath, 'utf8');

  assert(
    drawerCode.includes('new AbortController()') && drawerCode.includes('signal: abortController.signal'),
    'AIAssistantDrawer enforces finite client-side fetch timeout via AbortController'
  );
  assert(
    drawerCode.includes('finally {') &&
      drawerCode.includes('isSubmittingRef.current = false;') &&
      drawerCode.includes('setIsLoading(false);'),
    'AIAssistantDrawer guarantees isLoading and isSubmittingRef are cleared in finally block on all paths'
  );
  assert(
    drawerCode.includes('generateUtilityGroundedResponse(text, currentRole, accountContext)'),
    'AIAssistantDrawer falls back to generateUtilityGroundedResponse on network or timeout errors'
  );

  console.log('\n================================================================');
  console.log(`AI & BILLING ACCURACY SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
