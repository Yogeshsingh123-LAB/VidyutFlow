import {
  ServerAuthService,
  AuthSecurityError,
  DEFAULT_SESSION_TTL_MS,
  SESSION_COOKIE_NAME,
  hashPasswordScrypt,
  verifyPasswordScrypt,
  serializeSessionCookie,
  serializeClearSessionCookie,
  parseSessionCookieHeader,
  requireServerRole,
  assertConsumerRecordOwnership
} from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import {
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_WORK_ORDERS,
  INITIAL_COMPLAINTS,
  INITIAL_CONNECTIONS
} from '../src/data/mockData';
import { UserRole } from '../src/types';

let passed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  passed++;
  console.log(`  ✓ ${message}`);
}

function assertThrowsSecurityError(
  fn: () => unknown,
  expectedStatus: 400 | 401 | 403,
  expectedCode: string,
  description: string
) {
  let caught: unknown = null;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  assert(caught instanceof AuthSecurityError, `${description} throws AuthSecurityError`);
  const secErr = caught as AuthSecurityError;
  assert(
    secErr.statusCode === expectedStatus,
    `${description} returns HTTP ${expectedStatus} (got ${secErr.statusCode})`
  );
  assert(
    secErr.code === expectedCode,
    `${description} returns code "${expectedCode}" (got "${secErr.code}")`
  );
}

console.log('==================================================================');
console.log('VidyutFlow Step 5B.1: Server Authentication & RBAC Foundation Suite');
console.log('==================================================================\n');

// ---------------------------------------------------------------------------
// 1. Salted crypto.scrypt Hashing & Timing-Safe Verification
// ---------------------------------------------------------------------------
console.log('1. Testing Node.js crypto.scrypt Salted Hashing & Timing-Safe Verification...');
{
  const h1 = hashPasswordScrypt('Demo@12345');
  const h2 = hashPasswordScrypt('Demo@12345');

  assert(Buffer.from(h1.salt, 'hex').length === 16, 'Generated salt is 16 random bytes (128-bit)');
  assert(Buffer.from(h1.hash, 'hex').length === 64, 'Derived scrypt key is 64 bytes (512-bit)');
  assert(h1.salt !== h2.salt, 'Identical passwords receive distinct random per-user salts');
  assert(h1.hash !== h2.hash, 'Identical passwords produce distinct salted scrypt hashes');
  assert(
    verifyPasswordScrypt('Demo@12345', h1.salt, h1.hash) === true,
    'Timing-safe verification succeeds for matching password'
  );
  assert(
    verifyPasswordScrypt('WrongPassword!', h1.salt, h1.hash) === false,
    'Timing-safe verification rejects wrong password'
  );
  assert(
    verifyPasswordScrypt('Demo@12345', h2.salt, h1.hash) === false,
    'Timing-safe verification rejects mismatched salt'
  );
  assert(
    verifyPasswordScrypt('', h1.salt, h1.hash) === false,
    'Timing-safe verification safely rejects empty password'
  );
}

// ---------------------------------------------------------------------------
// 2. All 5 Preconfigured Demo Accounts & Per-User Salt Uniqueness
// ---------------------------------------------------------------------------
console.log('\n2. Testing All 5 Official Demo Accounts (Demo@12345) & Hash Isolation...');
const authService = new ServerAuthService({
  sessionSecret: 'test_server_hmac_secret_32_bytes_minimum_length_2026'
});

const roles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];
const observedSalts = new Set<string>();
const observedHashes = new Set<string>();

for (const role of roles) {
  const demoAcc = DEFAULT_DEMO_ACCOUNTS[role];
  const audit = authService.getStoredHashMetadataForAudit(demoAcc.email);
  assert(audit !== null && audit.exists, `Seeded server user record exists for ${demoAcc.email}`);
  assert(audit!.saltLengthBytes === 16, `${role} account uses 16-byte random salt`);
  assert(audit!.hashLengthBytes === 64, `${role} account uses 64-byte scrypt key`);
  assert(!audit!.hashHex.includes('Demo@12345'), `${role} stored hash does not contain plaintext password`);
  observedSalts.add(audit!.saltHex);
  observedHashes.add(audit!.hashHex);

  const loginResult = authService.login({
    email: demoAcc.email,
    password: demoAcc.password,
    targetRole: role
  });

  assert(loginResult.user.email === demoAcc.email, `${role} login returns matching email (${demoAcc.email})`);
  assert(loginResult.user.role === role, `${role} login enforces role "${role}"`);
  assert(loginResult.user.name === demoAcc.name, `${role} login preserves identity name "${demoAcc.name}"`);
  assert(loginResult.session.role === role, `${role} session binds to role "${role}"`);

  // Verify no sensitive fields leak in public user or session payloads
  const serializedUser = JSON.stringify(loginResult.user);
  const serializedSession = JSON.stringify(loginResult.session);
  assert(
    !serializedUser.includes('password') &&
      !serializedUser.includes('Salt') &&
      !serializedUser.includes('Hash'),
    `${role} public user object never leaks password, salt, or hash fields`
  );
  assert(
    !serializedSession.includes('passwordHash') &&
      !serializedSession.includes('passwordSalt') &&
      !serializedSession.includes('test_server_hmac_secret'),
    `${role} session object never leaks password hashes or HMAC signing secret`
  );
}

assert(observedSalts.size === 5, 'All 5 demo accounts have unique random per-user salts');
assert(observedHashes.size === 5, 'All 5 demo accounts have unique scrypt password hashes');

// ---------------------------------------------------------------------------
// 3. Invalid Credentials & Portal Role Mismatch Rejection
// ---------------------------------------------------------------------------
console.log('\n3. Testing Invalid Credentials & Portal Role Mismatch Rejection...');
{
  assertThrowsSecurityError(
    () =>
      authService.login({
        email: 'consumer@vidyutflow.demo',
        password: 'InvalidPassword123'
      }),
    401,
    'INVALID_CREDENTIALS',
    'Login with wrong password'
  );

  assertThrowsSecurityError(
    () =>
      authService.login({
        email: 'nonexistent@vidyutflow.demo',
        password: 'Demo@12345'
      }),
    401,
    'INVALID_CREDENTIALS',
    'Login with unknown email'
  );

  assertThrowsSecurityError(
    () =>
      authService.login({
        email: 'consumer@vidyutflow.demo',
        password: 'Demo@12345',
        targetRole: 'admin'
      }),
    403,
    'ROLE_MISMATCH',
    'Consumer account attempting to log into Admin portal'
  );
}

// ---------------------------------------------------------------------------
// 4. Session Lifecycle: Random IDs, 8-Hour Expiration, Tamper Check & Logout Revocation
// ---------------------------------------------------------------------------
console.log('\n4. Testing Server Session Lifecycle, 8h TTL, Signature Integrity & Logout Revocation...');
{
  const loginTimeMs = 1_700_000_000_000;
  const { session, cookieHeader } = authService.login({
    email: 'admin@vidyutflow.demo',
    password: 'Demo@12345',
    nowMs: loginTimeMs
  });

  assert(session.sessionId.length === 64, 'Session ID is 64 hex chars (256 bits of CSPRNG entropy)');
  assert(
    session.expiresAt - session.createdAt === DEFAULT_SESSION_TTL_MS,
    'Session default expiration is exactly 8 hours (28,800,000 ms)'
  );

  // Cookie security verification
  assert(cookieHeader.includes(`${SESSION_COOKIE_NAME}=`), 'Session cookie contains cookie name');
  assert(cookieHeader.includes('HttpOnly'), 'Session cookie enforces HttpOnly flag');
  assert(cookieHeader.includes('SameSite=Lax'), 'Session cookie enforces SameSite=Lax');
  assert(cookieHeader.includes('Max-Age=28800'), 'Session cookie sets Max-Age=28800 (8 hours)');

  const prodCookie = serializeSessionCookie(session.signedToken, {
    isProduction: true,
    sameSite: 'Strict'
  });
  assert(prodCookie.includes('Secure'), 'Production session cookie enforces Secure attribute');
  assert(prodCookie.includes('SameSite=Strict'), 'Cookie helper supports SameSite=Strict');

  const clearCookie = serializeClearSessionCookie({ isProduction: true });
  assert(
    clearCookie.includes('Max-Age=0') && clearCookie.includes('Secure'),
    'serializeClearSessionCookie generates Max-Age=0 Secure header'
  );

  const parsedToken = parseSessionCookieHeader(`theme=dark; ${cookieHeader.split(';')[0]}; lang=en`);
  assert(parsedToken === session.signedToken, 'Cookie parser extracts signed token from HTTP header');

  // Valid before expiration (7 hours 59 minutes later)
  const validSession = authService.validateSession(
    session.signedToken,
    loginTimeMs + DEFAULT_SESSION_TTL_MS - 60_000
  );
  assert(validSession.userId === 'demo_admin', 'Session validates before 8-hour TTL');

  // Tampered HMAC signature rejected
  const tamperedToken = `${session.sessionId}.${'a'.repeat(64)}`;
  assertThrowsSecurityError(
    () => authService.validateSession(tamperedToken, loginTimeMs + 1000),
    401,
    'INVALID_SESSION_SIGNATURE',
    'Tampered session token signature'
  );

  // Expired session rejected at 8-hour boundary
  const shortSession = authService.login({
    email: 'employee@vidyutflow.demo',
    password: 'Demo@12345',
    nowMs: loginTimeMs
  }).session;

  assertThrowsSecurityError(
    () =>
      authService.validateSession(
        shortSession.signedToken,
        loginTimeMs + DEFAULT_SESSION_TTL_MS
      ),
    401,
    'SESSION_EXPIRED',
    'Session validation after 8-hour expiration'
  );

  // Logout revocation
  const revokeResult = authService.revokeSession(session.signedToken);
  assert(revokeResult.revoked === true, 'Active session is revoked on logout');
  assert(
    revokeResult.clearCookieHeader.includes('Max-Age=0') &&
      revokeResult.clearCookieHeader.includes('HttpOnly'),
    'Logout returns Max-Age=0 HttpOnly clearing cookie header'
  );

  assertThrowsSecurityError(
    () => authService.validateSession(session.signedToken, loginTimeMs + 5000),
    401,
    'SESSION_NOT_FOUND',
    'Reusing token after logout revocation'
  );
}

// ---------------------------------------------------------------------------
// 5. Public Consumer Registration & Self-Registration Role Escalation Block
// ---------------------------------------------------------------------------
console.log('\n5. Testing Consumer Registration & Privilege Escalation Prevention...');
const newConsumerReg = authService.registerConsumer({
  name: 'Kiranben Desai',
  email: 'kiran.desai@example.com',
  password: 'SecurePass#2026',
  mobileNumber: '+91 98980 11223'
});
assert(newConsumerReg.user.role === 'consumer', 'Registered user is assigned consumer role');
assert(newConsumerReg.user.isDemoAccount === false, 'Registered user is marked as non-demo account');

assertThrowsSecurityError(
  () =>
    authService.registerConsumer({
      name: 'Attacker Admin',
      email: 'attacker@example.com',
      password: 'SecurePass#2026',
      requestedRole: 'admin'
    }),
  403,
  'ROLE_ESCALATION_FORBIDDEN',
  'Public registration requesting admin role'
);

assertThrowsSecurityError(
  () =>
    authService.registerConsumer({
      name: 'Duplicate User',
      email: 'kiran.desai@example.com',
      password: 'SecurePass#2026'
    }),
  400,
  'EMAIL_ALREADY_REGISTERED',
  'Duplicate email registration'
);

// ---------------------------------------------------------------------------
// 6. Server-Side RBAC Helpers & Portal Data-Access Matrix
// ---------------------------------------------------------------------------
console.log('\n6. Testing Server-Side RBAC Enforcement Across All 5 Roles...');
const dataStore = new ServerDataStore(authService);

const consumerToken = authService.login({
  email: 'consumer@vidyutflow.demo',
  password: 'Demo@12345'
}).session.signedToken;

const employeeToken = authService.login({
  email: 'employee@vidyutflow.demo',
  password: 'Demo@12345'
}).session.signedToken;

const fieldToken = authService.login({
  email: 'field@vidyutflow.demo',
  password: 'Demo@12345'
}).session.signedToken;

const managementToken = authService.login({
  email: 'management@vidyutflow.demo',
  password: 'Demo@12345'
}).session.signedToken;

const adminToken = authService.login({
  email: 'admin@vidyutflow.demo',
  password: 'Demo@12345'
}).session.signedToken;

// Direct RBAC helper test
const checkedManagementSession = requireServerRole(authService, managementToken, ['management', 'admin']);
assert(checkedManagementSession.role === 'management', 'requireServerRole authorizes matching role');

// Admin audit logs: only admin allowed
const auditLogs = dataStore.getAuditLogs(adminToken);
assert(auditLogs.length > 0, 'System Administrator can read server audit logs');

for (const [roleName, token] of [
  ['consumer', consumerToken],
  ['employee', employeeToken],
  ['field', fieldToken],
  ['management', managementToken]
] as const) {
  assertThrowsSecurityError(
    () => dataStore.getAuditLogs(token),
    403,
    'FORBIDDEN_ROLE',
    `Role "${roleName}" blocked from reading System Administrator audit logs`
  );
}

// Application status updates: only employee & admin allowed
const updatedApp = dataStore.updateApplicationStatus(
  employeeToken,
  'APP-2026-0843',
  'Site Inspection',
  'Verified KYC documents on server'
);
assert(
  updatedApp.status === 'Site Inspection',
  'Office Employee can update application status'
);

assertThrowsSecurityError(
  () =>
    dataStore.updateApplicationStatus(
      consumerToken,
      'APP-2026-0843',
      'Sanction Approval'
    ),
  403,
  'FORBIDDEN_ROLE',
  'Consumer blocked from approving applications'
);

assertThrowsSecurityError(
  () =>
    dataStore.updateApplicationStatus(
      fieldToken,
      'APP-2026-0843',
      'Sanction Approval'
    ),
  403,
  'FORBIDDEN_ROLE',
  'Field Engineer blocked from approving commercial applications'
);

// Work order updates: field, employee, admin allowed; consumer & management blocked
const updatedWo = dataStore.updateWorkOrderStatus(
  fieldToken,
  'WO-4401',
  'Completed'
);
assert(updatedWo.status === 'Completed', 'Field Engineer can update work order status');

assertThrowsSecurityError(
  () => dataStore.updateWorkOrderStatus(consumerToken, 'WO-4401', 'Completed'),
  403,
  'FORBIDDEN_ROLE',
  'Consumer blocked from updating field work orders'
);

// Field engineer blocked from full billing ledger
assertThrowsSecurityError(
  () => dataStore.getBills(fieldToken),
  403,
  'FORBIDDEN_ROLE',
  'Field Engineer blocked from accessing billing ledger'
);

// ---------------------------------------------------------------------------
// 7. Consumer Ownership Isolation (Preventing Cross-Consumer Data Access)
// ---------------------------------------------------------------------------
console.log('\n7. Testing Consumer Record Ownership Isolation (Bills, Connections, Payments, Complaints)...');
{
  // Default demo consumer (Smt. Meenaben Patel) owns 04281-99231 and 04281-77190
  const meenaConnections = dataStore.getConnections(consumerToken);
  assert(
    meenaConnections.length === 2 &&
      meenaConnections.every(
        c => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190'
      ),
    'Demo consumer receives her 2 linked connections (04281-99231 & 04281-77190)'
  );

  const meenaBills = dataStore.getBills(consumerToken);
  assert(
    meenaBills.length === 4 &&
      meenaBills.every(
        b => b.consumerNo === '04281-99231' || b.consumerNo === '04281-77190'
      ),
    'Demo consumer receives only bills for her own connections (4 bills)'
  );

  const meenaBill = dataStore.getBillByNumber(consumerToken, 'BILL-UG-2026-10-8821');
  assert(meenaBill.totalAmount === 2185, 'Demo consumer can view her own September 2026 bill');

  const meenaComplaints = dataStore.getComplaints(consumerToken);
  assert(
    meenaComplaints.length === 2 &&
      meenaComplaints.every(c => c.id === 'CMP-8821' || c.id === 'CMP-8822'),
    'Demo consumer receives only her own 2 complaints (out of 4 total complaints in dataset)'
  );

  // Demo consumer attempting to access another consumer's complaint (CMP-8819 belongs to 04281-33104) -> 403
  assertThrowsSecurityError(
    () => dataStore.getComplaintById(consumerToken, 'CMP-8819'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Demo consumer blocked from reading another consumer complaint (CMP-8819 / 04281-33104)'
  );

  assertThrowsSecurityError(
    () => dataStore.getComplaintById(consumerToken, 'CMP-8815'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Demo consumer blocked from reading another consumer complaint (CMP-8815 / 04281-55829)'
  );

  // Newly registered consumer (Kiranben Desai) has zero linked connections and cannot read or pay Meenaben's records
  const newConsumerToken = newConsumerReg.session.signedToken;
  assert(
    dataStore.getConnections(newConsumerToken).length === 0,
    'Newly registered consumer has 0 linked connections by default'
  );
  assert(
    dataStore.getBills(newConsumerToken).length === 0,
    'Newly registered consumer sees 0 bills'
  );
  assert(
    dataStore.getPayments(newConsumerToken).length === 0,
    'Newly registered consumer sees 0 payments'
  );
  assert(
    dataStore.getComplaints(newConsumerToken).length === 0,
    'Newly registered consumer sees 0 complaints'
  );

  assertThrowsSecurityError(
    () => dataStore.getConnectionByNumber(newConsumerToken, '04281-99231'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Newly registered consumer blocked from accessing Smt. Meenaben Patel connection (04281-99231)'
  );

  assertThrowsSecurityError(
    () => dataStore.getBillByNumber(newConsumerToken, 'BILL-UG-2026-10-8821'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Newly registered consumer blocked from accessing Smt. Meenaben Patel bill (BILL-UG-2026-10-8821)'
  );

  assertThrowsSecurityError(
    () => dataStore.payBill(newConsumerToken, 'BILL-UG-2026-10-8821'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Newly registered consumer blocked from paying Smt. Meenaben Patel bill (BILL-UG-2026-10-8821)'
  );

  assertThrowsSecurityError(
    () => dataStore.getPaymentByTxId(newConsumerToken, 'TXN-UPI-9921448102'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Newly registered consumer blocked from reading Smt. Meenaben Patel payment (TXN-UPI-9921448102)'
  );

  assertThrowsSecurityError(
    () => dataStore.getComplaintById(newConsumerToken, 'CMP-8821'),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'Newly registered consumer blocked from reading Smt. Meenaben Patel complaint (CMP-8821)'
  );

  // Direct unit test of assertConsumerRecordOwnership helper
  assertThrowsSecurityError(
    () =>
      assertConsumerRecordOwnership({
        session: newConsumerReg.session,
        recordOwnerAccountId: 'demo_consumer',
        recordConsumerNo: '04281-99231',
        ownedConsumerNos: new Set()
      }),
    403,
    'CROSS_CONSUMER_ACCESS_DENIED',
    'assertConsumerRecordOwnership rejects mismatched consumer account and connection number'
  );
}

// ---------------------------------------------------------------------------
// 8. Canonical Demo Data Preservation Check (Zero Mutation of Source Exports)
// ---------------------------------------------------------------------------
console.log('\n8. Verifying Zero Mutation of Canonical Source Datasets...');
{
  // Pay Meenaben's bill inside the isolated ServerDataStore
  const payRes = dataStore.payBill(consumerToken, 'BILL-UG-2026-10-8821');
  assert(payRes.bill.status === 'Paid', 'Isolated ServerDataStore marks bill as Paid');

  // Verify INITIAL_BILLS in mockData.ts is still Unpaid!
  const canonicalSepBill = INITIAL_BILLS.find(b => b.billNo === 'BILL-UG-2026-10-8821');
  assert(
    canonicalSepBill?.status === 'Unpaid',
    'Canonical INITIAL_BILLS in src/data/mockData.ts remains untouched (status = Unpaid)'
  );

  const canonicalApp = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0843');
  assert(
    canonicalApp?.status === 'Document Verification',
    'Canonical INITIAL_APPLICATIONS in src/data/mockData.ts remains untouched'
  );

  const canonicalWo = INITIAL_WORK_ORDERS.find(w => w.id === 'WO-4401');
  assert(
    canonicalWo?.status === 'On Site',
    'Canonical INITIAL_WORK_ORDERS in src/data/mockData.ts remains untouched'
  );

  assert(INITIAL_CONNECTIONS.length === 2, 'Canonical INITIAL_CONNECTIONS count unchanged (2)');
  assert(INITIAL_PAYMENTS.length === 3, 'Canonical INITIAL_PAYMENTS count unchanged (3)');
  assert(INITIAL_COMPLAINTS.length === 4, 'Canonical INITIAL_COMPLAINTS count unchanged (4)');
}

console.log('\n==================================================================');
console.log(`ALL ${passed} SERVER AUTHENTICATION & RBAC FOUNDATION TESTS PASSED!`);
console.log('==================================================================');
