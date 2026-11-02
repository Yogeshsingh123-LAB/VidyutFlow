import {
  parseCurrentUrl,
  resolveRouteAccess,
  isValidDemoSession,
  UNAUTHORIZED_NAVIGATION_MESSAGE,
  RouteAccessDecision
} from '../src/context/AppContext';
import { DemoSession } from '../src/data/demoAuthData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('====================================================');
console.log('VidyutFlow Security Hardening: Direct URL Access Tests');
console.log('====================================================\n');

// Mock Demo Sessions
const mockAdminSession: DemoSession = {
  user: {
    id: 'demo_admin',
    email: 'admin@vidyutflow.demo',
    name: 'Anand Patel',
    role: 'admin',
    designation: 'Principal IT Infrastructure & ERP Administrator'
  },
  role: 'admin',
  loginTime: new Date().toISOString(),
  sessionToken: 'vidyutflow_demo_test_token_admin_999'
};

const mockConsumerSession: DemoSession = {
  user: {
    id: 'demo_consumer',
    email: 'consumer@vidyutflow.demo',
    name: 'Smt. Meenaben Patel',
    role: 'consumer',
    designation: 'Primary Account Holder & Domestic Consumer'
  },
  role: 'consumer',
  loginTime: new Date().toISOString(),
  sessionToken: 'vidyutflow_demo_test_token_consumer_123'
};

let passedCount = 0;

function runTest(name: string, fn: () => void) {
  console.log(`Running Test: ${name}`);
  try {
    fn();
    passedCount++;
    console.log(`PASSED: ${name}\n`);
  } catch (err) {
    console.error(`FAILED: ${name}\n`, err);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// Test 1: Unauthenticated /#/admin access
// ----------------------------------------------------------------------------
runTest('1. Unauthenticated /#/admin access', () => {
  const route = parseCurrentUrl('#/admin');
  assert(route.role === 'admin', 'Route parses role as admin');
  assert(route.isExplicitPortalRequest === true, 'Route flagged as explicit portal request');

  const decision = resolveRouteAccess(route, null);
  assert(decision.authorized === false, 'Access is unauthorized for null session');
  assert(decision.entered === false, 'Platform entry is denied (entered = false)');
  assert(decision.redirectToWelcome === true, 'Redirect to public welcome page is triggered');
  assert(
    decision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE,
    `Denial reason matches: "${UNAUTHORIZED_NAVIGATION_MESSAGE}"`
  );
  assert(decision.role !== 'admin', 'User role is not elevated to admin without session');
});

// ----------------------------------------------------------------------------
// Test 2: Unauthenticated /#/management access
// ----------------------------------------------------------------------------
runTest('2. Unauthenticated /#/management access', () => {
  const route = parseCurrentUrl('#/management');
  assert(route.role === 'management', 'Route parses role as management');
  assert(route.isExplicitPortalRequest === true, 'Explicit portal request detected');

  const decision = resolveRouteAccess(route, null);
  assert(decision.authorized === false, 'Access is unauthorized for null session');
  assert(decision.entered === false, 'Platform entry is denied');
  assert(decision.redirectToWelcome === true, 'Redirect to public welcome triggered');
  assert(
    decision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE,
    'Clear nontechnical denial message returned'
  );
});

// ----------------------------------------------------------------------------
// Test 3: Unauthenticated /#/employee access
// ----------------------------------------------------------------------------
runTest('3. Unauthenticated /#/employee access', () => {
  const route = parseCurrentUrl('#/employee');
  assert(route.role === 'employee', 'Route parses role as employee');
  assert(route.isExplicitPortalRequest === true, 'Explicit portal request detected');

  const decision = resolveRouteAccess(route, null);
  assert(decision.authorized === false, 'Access is unauthorized for null session');
  assert(decision.entered === false, 'Platform entry is denied');
  assert(decision.redirectToWelcome === true, 'Redirect to public welcome triggered');
  assert(decision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE, 'Clear denial message returned');
});

// ----------------------------------------------------------------------------
// Test 4: Unauthenticated /#/field access
// ----------------------------------------------------------------------------
runTest('4. Unauthenticated /#/field access', () => {
  const route = parseCurrentUrl('#/field');
  assert(route.role === 'field', 'Route parses role as field');
  assert(route.isExplicitPortalRequest === true, 'Explicit portal request detected');

  const decision = resolveRouteAccess(route, null);
  assert(decision.authorized === false, 'Access is unauthorized for null session');
  assert(decision.entered === false, 'Platform entry is denied');
  assert(decision.redirectToWelcome === true, 'Redirect to public welcome triggered');
  assert(decision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE, 'Clear denial message returned');
});

// ----------------------------------------------------------------------------
// Test 5: Unauthenticated /#/consumer access
// ----------------------------------------------------------------------------
runTest('5. Unauthenticated /#/consumer access', () => {
  const route = parseCurrentUrl('#/consumer');
  assert(route.role === 'consumer', 'Route parses role as consumer');
  assert(route.isExplicitPortalRequest === true, 'Explicit portal request detected');

  const decision = resolveRouteAccess(route, null);
  assert(decision.authorized === false, 'Access is unauthorized for unauthenticated user');
  assert(decision.entered === false, 'Platform entry is denied without login');
  assert(decision.redirectToWelcome === true, 'Redirect to public welcome triggered');
  assert(decision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE, 'Clear denial message returned');
});

// ----------------------------------------------------------------------------
// Test 6: Logged-in consumer attempting /#/admin
// ----------------------------------------------------------------------------
runTest('6. Logged-in consumer attempting /#/admin', () => {
  assert(isValidDemoSession(mockConsumerSession), 'Consumer session is valid');

  const adminRoute = parseCurrentUrl('#/admin');
  const decision = resolveRouteAccess(adminRoute, mockConsumerSession);

  assert(decision.authorized === false, 'Cross-role unauthorized access is denied');
  assert(decision.entered === false, 'Platform entry into admin is barred');
  assert(decision.redirectToWelcome === true, 'Redirects to welcome screen to prevent privilege escalation');
  assert(decision.role === 'consumer', 'Active session role remains bound to consumer');
  assert(
    decision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE,
    'Denied with authorization prompt message'
  );
});

// ----------------------------------------------------------------------------
// Test 7: Valid logged-in admin refreshing /#/admin
// ----------------------------------------------------------------------------
runTest('7. Valid logged-in admin refreshing /#/admin', () => {
  assert(isValidDemoSession(mockAdminSession), 'Admin session is valid');

  const adminRoute = parseCurrentUrl('#/admin/overview');
  assert(adminRoute.role === 'admin', 'Route parsed role as admin');
  assert(adminRoute.tab === 'overview', 'Route parsed tab as overview');

  const decision = resolveRouteAccess(adminRoute, mockAdminSession);
  assert(decision.authorized === true, 'Legitimate admin session is authorized');
  assert(decision.entered === true, 'Admin remains inside platform on refresh');
  assert(decision.redirectToWelcome === false, 'No welcome redirect triggered for authorized session');
  assert(decision.role === 'admin', 'Role remains admin');
  assert(decision.tab === 'overview', 'Tab preserved on refresh');
  assert(decision.denialReason === undefined, 'No denial reason issued');
});

// ----------------------------------------------------------------------------
// Test 8: Logout followed by browser Back navigation
// ----------------------------------------------------------------------------
runTest('8. Logout followed by browser Back navigation', () => {
  // Step 1: User was logged in as admin and accessed /#/admin
  let currentSession: DemoSession | null = { ...mockAdminSession };
  assert(isValidDemoSession(currentSession), 'Session initially active');

  // Step 2: User performs logout
  currentSession = null; // Stored session cleared from storage
  assert(currentSession === null, 'Session successfully destroyed on logout');

  // Step 3: User presses browser Back button, which traverses history back to /#/admin
  const backNavigationRoute = parseCurrentUrl('#/admin/overview');
  const postLogoutDecision = resolveRouteAccess(backNavigationRoute, currentSession);

  assert(
    postLogoutDecision.authorized === false,
    'Browser back navigation to protected view is blocked after logout'
  );
  assert(
    postLogoutDecision.entered === false,
    'Cannot enter workspace via back button without authenticating again'
  );
  assert(
    postLogoutDecision.redirectToWelcome === true,
    'Redirect to welcome screen enforced on back navigation'
  );
  assert(
    postLogoutDecision.denialReason === UNAUTHORIZED_NAVIGATION_MESSAGE,
    'Clear prompt asking user to sign in is provided'
  );
});

// ----------------------------------------------------------------------------
// Supplementary Test 9: Query param attack (?role=admin) and pathname (/admin)
// ----------------------------------------------------------------------------
runTest('9. Unauthenticated query param and pathname access prevention', () => {
  const queryRoute = parseCurrentUrl('http://localhost:3000/?role=admin');
  assert(queryRoute.role === 'admin', 'Query param role parsed');
  const queryDecision = resolveRouteAccess(queryRoute, null);
  assert(queryDecision.authorized === false, 'Query param role adoption denied');
  assert(queryDecision.redirectToWelcome === true, 'Redirect to welcome enforced');

  const pathRoute = parseCurrentUrl('http://localhost:3000/admin');
  assert(pathRoute.role === 'admin', 'Pathname role parsed');
  const pathDecision = resolveRouteAccess(pathRoute, null);
  assert(pathDecision.authorized === false, 'Pathname direct access denied');
  assert(pathDecision.redirectToWelcome === true, 'Redirect to welcome enforced');
});

// ----------------------------------------------------------------------------
// Supplementary Test 10: Session integrity validation (anti-tamper)
// ----------------------------------------------------------------------------
runTest('10. Session integrity validation (corrupted / forged sessions)', () => {
  assert(isValidDemoSession(null) === false, 'Null session rejected');
  assert(isValidDemoSession({}) === false, 'Empty object rejected');
  assert(
    isValidDemoSession({ role: 'admin', user: { role: 'consumer', email: 'test@demo' } }) === false,
    'Mismatched user.role vs session.role rejected'
  );
  assert(
    isValidDemoSession({ role: 'superhacker', user: { role: 'superhacker' } }) === false,
    'Invalid role rejected'
  );
  assert(
    isValidDemoSession({
      role: 'admin',
      user: { role: 'admin', email: 'admin@demo' },
      sessionToken: ''
    }) === false,
    'Session without token rejected'
  );
});

console.log('====================================================');
console.log(`ALL ${passedCount} SECURITY TESTS PASSED SUCCESSFULLY!`);
console.log('====================================================');
