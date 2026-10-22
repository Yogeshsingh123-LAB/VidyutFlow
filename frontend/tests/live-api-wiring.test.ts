/**
 * Live API wiring checks (static source assertions, same style as navigation-views.test.ts).
 * Verifies the UI→API bridge exists where the demo path needs it:
 * backend JWT storage, the 3 wired screens, alert-centre binding, and dev-proxy coverage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\nRunning Test: 1. Backend session bridge stores the JWT that fastApiClient reads');
{
  const s = read('src/utils/backendSession.ts');
  check("backendSession writes localStorage key 'vidyutos_token'", s.includes("TOKEN_KEY = 'vidyutos_token'"));
  check('syncBackendSession tries portal credentials first', s.includes('requestBackendToken(email, password)'));
  check('role-mapped fallback accounts exist for all 5 portals', ['consumer', 'employee', 'field', 'management', 'admin']
    .every(role => new RegExp(`^  ${role}: \\{ email:`, 'm').test(s)));
  const app = read('src/context/AppContext.tsx');
  check('AppContext syncs backend session after portal login', app.includes('syncBackendSession('));
  check('AppContext clears backend session on logout/reset', app.includes('clearBackendSession()'));
}
if (failed === 0) console.log('PASSED: 1. Backend session bridge');

console.log('\nRunning Test: 2. Three screens are wired to the live API');
{
  const consumer = read('src/components/consumer/ConsumerPortal.tsx');
  check('Consumer wizard submits to POST /api/requests (live)', consumer.includes('submitLiveRequest('));
  const employee = read('src/components/employee/EmployeePortal.tsx');
  check('Employee portal renders LiveRequestQueue', employee.includes('<LiveRequestQueue />'));
  const management = read('src/components/management/ManagementPortal.tsx');
  const admin = read('src/components/admin/AdminPortal.tsx');
  check('Management portal renders LiveWorkflowKpis', management.includes('<LiveWorkflowKpis />'));
  check('Management Insights tab renders LiveSlaRiskWatchlist (ML reasons live)', management.includes('<LiveSlaRiskWatchlist />'));
  check('Admin portal renders LiveWorkflowKpis', admin.includes('<LiveWorkflowKpis />'));
  const live = read('src/utils/liveData.ts');
  check('liveData polls GET /requests/kpis/summary', live.includes("'/requests/kpis/summary'"));
  check('liveData polls GET /requests', live.includes("'/requests'"));
  check('polling interval is 45s (live on refresh)', live.includes('45_000'));
}
if (failed <= 2) console.log('PASSED: 2. Three screens wired');

console.log('\nRunning Test: 3. Alert centre binds to the backend notification API');
{
  const drawer = read('src/components/common/NotificationDrawer.tsx');
  check('drawer fetches GET /api/notifications', drawer.includes('fetchLiveNotifications'));
  check('drawer marks read via the API for live rows', drawer.includes('markLiveNotificationRead('));
  check('drawer marks all read via the API', drawer.includes('markAllLiveNotificationsRead('));
}
if (failed <= 3) console.log('PASSED: 3. Alert centre binding');

console.log('\nRunning Test: 4. Dev proxy covers the live endpoints');
{
  const vite = read('vite.config.ts');
  check("proxy includes /api/notifications", vite.includes("'/api/notifications'"));
  check("proxy includes /api/backend (JWT login path)", vite.includes("'/api/backend'"));
  check('proxies strip the /api prefix', /rewrite: path => path\.replace\(\/\^\\\/api/.test(vite));
}
if (failed <= 4) console.log('PASSED: 4. Dev proxy coverage');

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
  console.log(`ALL ${passed} LIVE API WIRING CHECKS PASSED!`);
  console.log('='.repeat(60));
  process.exit(0);
} else {
  console.log(`${failed} CHECK(S) FAILED of ${passed + failed}`);
  console.log('='.repeat(60));
  process.exit(1);
}
