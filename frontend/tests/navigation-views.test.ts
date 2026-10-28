import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_WORK_ORDERS,
  FEEDER_METRICS,
  EXECUTIVE_MONTHLY_METRICS,
  SUBDIVISION_PERFORMANCE
} from '../src/data/mockData';
import { resolvePostLoginTab } from '../src/context/AppContext';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

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

console.log('====================================================');
console.log('VidyutFlow Step 6B.1: Navigation & Portal Views Tests');
console.log('====================================================\n');

const readSrc = (relPath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8').replace(/\r\n/g, '\n');

// ----------------------------------------------------------------------------
// Test 1: Field Engineer Portal — Feeder Patrol (maintenance) & Completed Jobs (history)
// ----------------------------------------------------------------------------
runTest('1. Field Engineer Portal implements Feeder Patrol (maintenance) and Completed Jobs (history) views', () => {
  const fieldPortalSource = readSrc('src/components/field/FieldPortal.tsx');

  // Verify all 6 Field Engineer sidebar/mobile nav tabs are handled in FieldPortal.tsx
  const fieldNavTabs = ['dashboard', 'workorders', 'inspections', 'maintenance', 'offline', 'history'];
  for (const tabId of fieldNavTabs) {
    assert(
      fieldPortalSource.includes(`activeTab === '${tabId}'`),
      `FieldPortal.tsx renders a view for activeTab === '${tabId}'`
    );
  }

  // Verify Feeder Patrol uses existing FEEDER_METRICS and includes an empty state
  assert(
    fieldPortalSource.includes('FEEDER_METRICS.map'),
    'Feeder Patrol view renders existing FEEDER_METRICS records'
  );
  assert(
    fieldPortalSource.includes('No Feeder Patrol Records Available'),
    'Feeder Patrol view includes a fallback empty state'
  );

  // Verify Completed Jobs uses completedOrders and includes an empty state
  assert(
    fieldPortalSource.includes('completedOrders.map'),
    'Completed Jobs view renders existing completedOrders records'
  );
  assert(
    fieldPortalSource.includes('No Completed Work Orders Yet'),
    'Completed Jobs view includes a fallback empty state'
  );

  // Verify canonical demo data has completed work order WO-4398 untouched
  const completedDemoOrders = INITIAL_WORK_ORDERS.filter(w => w.status === 'Completed');
  assert(completedDemoOrders.length === 1, 'Canonical INITIAL_WORK_ORDERS has 1 completed work order');
  assert(completedDemoOrders[0].id === 'WO-4398', 'Completed work order is WO-4398');
  assert(FEEDER_METRICS.length === 4, 'Canonical FEEDER_METRICS has 4 feeder records');
});

// ----------------------------------------------------------------------------
// Test 2: Management Portal — Executive Export (reports)
// ----------------------------------------------------------------------------
runTest('2. Management Portal implements Executive Export (reports) view', () => {
  const managementPortalSource = readSrc('src/components/management/ManagementPortal.tsx');

  const managementNavTabs = ['dashboard', 'analytics', 'sla', 'feeders', 'ai-insights', 'reports'];
  for (const tabId of managementNavTabs) {
    assert(
      managementPortalSource.includes(`activeTab === '${tabId}'`),
      `ManagementPortal.tsx renders a view for activeTab === '${tabId}'`
    );
  }

  assert(
    managementPortalSource.includes('Executive Export &amp; Statutory Reporting Center'),
    'ManagementPortal.tsx includes Executive Export & Statutory Reporting Center heading'
  );
  assert(
    managementPortalSource.includes('Client-Side Demo Exports'),
    'ManagementPortal.tsx clearly labels exports as client-side demo actions'
  );
  assert(
    EXECUTIVE_MONTHLY_METRICS.length > 0 && SUBDIVISION_PERFORMANCE.length > 0,
    'Canonical management datasets remain intact'
  );
});

// ----------------------------------------------------------------------------
// Test 3: Welcome Page Quick Bill Pay & Consumer Portal Tab Routing
// ----------------------------------------------------------------------------
runTest('3. WelcomeHero Quick Bill Payment routes to valid Consumer Bills view', () => {
  const welcomeHeroSource = readSrc('src/components/welcome/WelcomeHero.tsx');
  const consumerPortalSource = readSrc('src/components/consumer/ConsumerPortal.tsx');
  const commandPaletteSource = readSrc('src/components/common/CommandPalette.tsx');

  assert(
    welcomeHeroSource.includes("handleGoToConsumerTab('bills')"),
    "WelcomeHero.tsx Quick Bill Payment card routes to handleGoToConsumerTab('bills')"
  );
  assert(
    !welcomeHeroSource.includes("handleGoToConsumerTab('quick-pay')"),
    "WelcomeHero.tsx no longer uses broken 'quick-pay' tab target"
  );

  // Verify all 9 Consumer sidebar/mobile nav tabs are handled in ConsumerPortal.tsx
  const consumerNavTabs = [
    'dashboard',
    'connections',
    'new-connection',
    'bills',
    'payments',
    'complaints',
    'requests',
    'notifications',
    'profile'
  ];
  for (const tabId of consumerNavTabs) {
    assert(
      consumerPortalSource.includes(`activeTab === '${tabId}'`),
      `ConsumerPortal.tsx renders a view for activeTab === '${tabId}'`
    );
  }

  // Verify legacy aliases ('quick-pay' and 'applications') are also gracefully supported
  assert(
    consumerPortalSource.includes("activeTab === 'bills' || activeTab === 'quick-pay'"),
    "ConsumerPortal.tsx supports 'quick-pay' alias on the bills view"
  );
  assert(
    consumerPortalSource.includes("activeTab === 'connections' || activeTab === 'applications'"),
    "ConsumerPortal.tsx supports 'applications' alias on the connections view"
  );
  assert(
    !commandPaletteSource.includes("setActiveTab('applications')"),
    "CommandPalette.tsx routes consumer application items to 'connections' instead of non-existent 'applications' tab"
  );
});

// ----------------------------------------------------------------------------
// Test 4: Logged-Out Quick Bill Payment -> Server Auth Consumer Login Flow
// ----------------------------------------------------------------------------
runTest('4. Quick Bill Payment preserves bills destination across Server Auth login while keeping normal logins on default tabs', () => {
  const welcomeHeroSource = readSrc('src/components/welcome/WelcomeHero.tsx');
  const appContextSource = readSrc('src/context/AppContext.tsx');

  // 1. Logged-out branch in WelcomeHero.tsx preserves tabName before opening login modal
  assert(
    welcomeHeroSource.includes('setActiveTab(tabName);\n      setIsRoleSwitcherModalOpen(true);'),
    'WelcomeHero.tsx records intended consumer tab before opening the login modal when logged out'
  );

  // 2. Successful Consumer login after Quick Bill Payment ('bills') resolves to 'bills'
  assert(
    resolvePostLoginTab('consumer', 'bills') === 'bills',
    "Consumer login initiated from Quick Bill Payment ('bills') navigates to 'bills' tab"
  );

  // 3. Normal Consumer login from Sign In button (no pending tab or 'dashboard') opens 'dashboard'
  assert(
    resolvePostLoginTab('consumer', null) === 'dashboard',
    "Normal Consumer login from Sign In button (pendingConsumerTab = null) opens 'dashboard'"
  );
  assert(
    resolvePostLoginTab('consumer', undefined) === 'dashboard',
    "Normal Consumer login with undefined pending tab opens 'dashboard'"
  );

  // 4. Non-consumer roles (Employee, Field Engineer, Management, Admin) are NEVER redirected to Consumer Bills
  assert(
    resolvePostLoginTab('employee', 'bills') === 'dashboard',
    "Employee login is never redirected to Consumer 'bills'"
  );
  assert(
    resolvePostLoginTab('field', 'bills') === 'dashboard',
    "Field Engineer login is never redirected to Consumer 'bills'"
  );
  assert(
    resolvePostLoginTab('management', 'bills') === 'dashboard',
    "Management login is never redirected to Consumer 'bills'"
  );
  assert(
    resolvePostLoginTab('admin', 'bills') === 'overview',
    "System Administrator login is never redirected to Consumer 'bills' and opens 'overview'"
  );

  // 5. Server Auth login in AppContext.tsx uses resolvePostLoginTab(assignedRole, pendingConsumerTabRef.current)
  assert(
    appContextSource.includes('const targetTab = resolvePostLoginTab(assignedRole, pendingConsumerTabRef.current);'),
    'Server Auth login in AppContext.tsx resolves targetTab from pendingConsumerTabRef'
  );
  assert(
    appContextSource.includes('window.history.pushState(null, \'\', `/${assignedRole}/${targetTab}`);'),
    'Server Auth login in AppContext.tsx navigates browser history to targetTab'
  );

  // 6. Closing/cancelling the login modal clears pendingConsumerTabRef without entering protected content
  assert(
    appContextSource.includes('if (!open) {\n      pendingConsumerTabRef.current = null;'),
    'Closing/cancelling the login modal clears pendingConsumerTabRef'
  );
});

// ----------------------------------------------------------------------------
// Test 5: Step 6B.4 — Portal Headings & Officer Metadata Wrap Without Clipping
// ----------------------------------------------------------------------------
runTest('5. All five portals stack logo/title on mobile and render full headings and officer metadata without truncation', () => {
  const employeePortal = readSrc('src/components/employee/EmployeePortal.tsx');
  const consumerPortal = readSrc('src/components/consumer/ConsumerPortal.tsx');
  const fieldPortal = readSrc('src/components/field/FieldPortal.tsx');
  const managementPortal = readSrc('src/components/management/ManagementPortal.tsx');
  const adminPortal = readSrc('src/components/admin/AdminPortal.tsx');

  // Verify Office Employee heading and officer info are not truncated
  const empHeaderMatch = employeePortal.match(/Sub-Divisional Operations &amp; Sanction Desk/);
  assert(Boolean(empHeaderMatch), 'EmployeePortal.tsx contains full Sub-Divisional Operations & Sanction Desk title');
  assert(
    !employeePortal.includes('text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate'),
    'EmployeePortal.tsx h1 heading does not use truncate class'
  );
  assert(
    employeePortal.includes('{activeUser.name}') && employeePortal.includes('({activeUser.designation})'),
    'EmployeePortal.tsx renders full Officer name and designation'
  );
  assert(
    !employeePortal.includes('truncate">UGVCL Corporate'),
    'EmployeePortal.tsx officer line is not truncated'
  );

  // Verify all 5 portals stack logo and heading vertically on narrow screens (flex flex-col sm:flex-row)
  for (const [name, src] of [
    ['ConsumerPortal.tsx', consumerPortal],
    ['EmployeePortal.tsx', employeePortal],
    ['FieldPortal.tsx', fieldPortal],
    ['ManagementPortal.tsx', managementPortal],
    ['AdminPortal.tsx', adminPortal]
  ] as const) {
    assert(
      src.includes('flex flex-col sm:flex-row'),
      `${name} stacks UGVCL emblem and portal heading vertically on mobile (<640px) and aligns horizontally on sm+`
    );
    assert(
      src.includes('leading-snug break-words'),
      `${name} portal heading uses leading-snug break-words without truncation`
    );
  }
});

// ----------------------------------------------------------------------------
// Test 6: Step 6B.4 — Consistent Mobile Spacing, Header, and Navigation Polish
// ----------------------------------------------------------------------------
runTest('6. AppShell, TopNav, and MobileNav enforce consistent mobile spacing and accessible navigation across all 5 portals', () => {
  const appShell = readSrc('src/components/layout/AppShell.tsx');
  const topNav = readSrc('src/components/layout/TopNav.tsx');
  const mobileNav = readSrc('src/components/layout/MobileNav.tsx');

  assert(
    appShell.includes('px-3 py-3.5 min-[375px]:p-4 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0'),
    'AppShell.tsx applies consistent mobile outer padding (12px at 320px, 16px at 375px+, 20px sm, 24px md) with min-w-0'
  );
  assert(
    topNav.includes('h-12 sm:h-16 bg-white'),
    'TopNav.tsx uses compact h-12 mobile header height while preserving sm:h-16 on desktop'
  );
  assert(
    topNav.includes('aria-label="Open navigation menu"'),
    'TopNav.tsx renders accessible mobile hamburger menu button'
  );
  assert(
    mobileNav.includes('aria-label="Mobile Section Navigation"') &&
      mobileNav.includes('aria-label="Mobile Portal Navigation Drawer"'),
    'MobileNav.tsx preserves both horizontal section switcher and slide-over navigation drawer'
  );
  assert(
    !mobileNav.includes('<span className="truncate">{item.label}</span>'),
    'MobileNav.tsx drawer items allow full section titles without truncation'
  );
});

// ----------------------------------------------------------------------------
// Test 7: Step 6B.4 — Responsive Data Table Scrolling Preserved
// ----------------------------------------------------------------------------
runTest('7. Wide enterprise data tables preserve horizontal scrolling containers across portals', () => {
  const consumerPortal = readSrc('src/components/consumer/ConsumerPortal.tsx');
  const employeePortal = readSrc('src/components/employee/EmployeePortal.tsx');
  const managementPortal = readSrc('src/components/management/ManagementPortal.tsx');
  const adminPortal = readSrc('src/components/admin/AdminPortal.tsx');

  assert(
    consumerPortal.includes('overflow-x-auto') && consumerPortal.includes('min-w-[720px]'),
    'ConsumerPortal.tsx preserves horizontal table scrolling container and min-width'
  );
  assert(
    employeePortal.includes('overflow-x-auto') && employeePortal.includes('min-w-['),
    'EmployeePortal.tsx preserves horizontal table scrolling across queues and ledgers'
  );
  assert(
    managementPortal.includes('overflow-x-auto') && managementPortal.includes('min-w-['),
    'ManagementPortal.tsx preserves horizontal table scrolling across SLA and feeder tables'
  );
  assert(
    adminPortal.includes('overflow-x-auto') && adminPortal.includes('min-w-['),
    'AdminPortal.tsx preserves horizontal table scrolling across user, RBAC, and audit tables'
  );
});

console.log('====================================================');
console.log(`ALL ${passedCount} NAVIGATION & MOBILE UI TESTS PASSED!`);
console.log('====================================================');


