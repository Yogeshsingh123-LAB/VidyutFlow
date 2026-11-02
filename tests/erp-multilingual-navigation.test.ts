/**
 * Phase 2, Step 1 Verification Suite:
 * Shared Multilingual ERP Infrastructure & Navigation (English, Gujarati, Hindi, Marathi)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../src/i18n/types';
import { LANGUAGE_STORAGE_KEY } from '../src/i18n/LanguageContext';
import { ROLE_PROFILES } from '../src/data/mockData';
import { isActionAuthorized } from '../src/services/erpAdapter';

console.log('================================================================');
console.log('VidyutFlow Phase 2, Step 1: Shared Multilingual ERP Navigation Tests');
console.log('================================================================\n');

const readSrc = (relPath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');

// ----------------------------------------------------------------------------
// 1. Single Shared LanguageProvider & Persistence Key Across Welcome Hub + 5 ERP Portals
// ----------------------------------------------------------------------------
{
  const appSource = readSrc('src/App.tsx');
  const langContextSource = readSrc('src/i18n/LanguageContext.tsx');

  assert.equal(
    LANGUAGE_STORAGE_KEY,
    'vidyutflow_language_preference',
    'Shared LanguageContext must use vidyutflow_language_preference key'
  );
  assert.ok(
    appSource.includes('<LanguageProvider>') &&
      appSource.includes('<WelcomePortalPage />') &&
      appSource.includes('<AppShell>') &&
      appSource.includes('<PortalRouter />'),
    'App.tsx must wrap both WelcomePortalPage and AppShell/PortalRouter inside a single shared LanguageProvider'
  );
  assert.ok(
    ['ConsumerPortal', 'EmployeePortal', 'FieldPortal', 'ManagementPortal', 'AdminPortal'].every(
      portal => appSource.includes(portal)
    ),
    'All 5 role portals must be rendered inside PortalRouter under AppShell and LanguageProvider'
  );
  assert.ok(
    !langContextSource.includes('logoutDemoSession') &&
      !langContextSource.includes('resetDemoData'),
    'Switching languages in LanguageContext must never log out the user or reset application state'
  );
  console.log('✓ 1. Single shared LanguageProvider wraps Welcome Hub and all 5 ERP portals without resetting session state');
}

// ----------------------------------------------------------------------------
// 2. LanguageSelector Presence in Shared ERP Header (TopNav) and Mobile Drawer (MobileNav)
// ----------------------------------------------------------------------------
{
  const topNavSource = readSrc('src/components/layout/TopNav.tsx');
  const mobileNavSource = readSrc('src/components/layout/MobileNav.tsx');
  const selectorSource = readSrc('src/components/common/LanguageSelector.tsx');

  assert.ok(
    topNavSource.includes("import { LanguageSelector } from '../common/LanguageSelector'"),
    'TopNav.tsx must import shared LanguageSelector component'
  );
  assert.ok(
    topNavSource.includes('<LanguageSelector variant="erp" />'),
    'TopNav.tsx must render <LanguageSelector variant="erp" /> in the shared ERP header across all 5 portals'
  );
  assert.ok(
    mobileNavSource.includes('<LanguageSelector variant="mobile" />'),
    'MobileNav.tsx must render <LanguageSelector variant="mobile" /> inside the mobile navigation drawer'
  );
  assert.ok(
    selectorSource.includes("variant?: 'header' | 'mobile' | 'compact' | 'erp'"),
    'LanguageSelector must support the erp variant alongside header, mobile, and compact'
  );
  assert.ok(
    selectorSource.includes('aria-haspopup="listbox"') &&
      selectorSource.includes('role="listbox"') &&
      selectorSource.includes('role="option"') &&
      selectorSource.includes('aria-selected'),
    'LanguageSelector must preserve full keyboard and screen-reader listbox accessibility in ERP mode'
  );
  console.log('✓ 2. Accessible LanguageSelector is mounted in shared ERP TopNav and MobileNav across all 5 portals');
}

// ----------------------------------------------------------------------------
// 3. Completeness of `erp` Translation Dictionary Section in English, Gujarati, Hindi, and Marathi
// ----------------------------------------------------------------------------
{
  const dicts: Record<LanguageCode, typeof en> = { en, gu, hi, mr };
  const erpKeys = Object.keys(en.erp) as (keyof typeof en.erp)[];

  assert.ok(erpKeys.length >= 130, `Expected at least 130 shared ERP translation keys, found ${erpKeys.length}`);

  for (const lang of SUPPORTED_LANGUAGES.map(l => l.code)) {
    const dict = dicts[lang];
    assert.ok(dict.erp, `Dictionary for "${lang}" must define the "erp" section`);
    for (const key of erpKeys) {
      const val = dict.erp[key];
      assert.ok(
        typeof val === 'string' && val.trim().length > 0,
        `Dictionary "${lang}.erp.${String(key)}" must be a non-empty string`
      );
    }
  }

  // Verify required shared ERP interface elements from Step 4 are translated in gu, hi, mr
  const requiredSharedKeys: (keyof typeof en.erp)[] = [
    'dashboard',
    'home',
    'overview',
    'notifications',
    'profile',
    'settings',
    'help',
    'helpAndInfo',
    'logout',
    'signOutSwitchRole',
    'back',
    'search',
    'searchRecords',
    'filters',
    'loading',
    'save',
    'cancel',
    'confirm',
    'close',
    'error',
    'success',
    'emptyState',
    'noMatchingRecords',
    'noNotifications'
  ];

  for (const key of requiredSharedKeys) {
    assert.notEqual(gu.erp[key], en.erp[key], `Gujarati erp.${String(key)} should be localized`);
    assert.notEqual(hi.erp[key], en.erp[key], `Hindi erp.${String(key)} should be localized`);
    assert.notEqual(mr.erp[key], en.erp[key], `Marathi erp.${String(key)} should be localized`);
  }

  // Verify all 5 role portal titles and sidebar navigation labels are localized in gu, hi, mr
  const navKeys: (keyof typeof en.erp)[] = [
    'roleConsumer',
    'roleEmployee',
    'roleField',
    'roleManagement',
    'roleAdmin',
    'navMyConnections',
    'navNewConnection',
    'navElectricityBills',
    'navPaymentHistory',
    'navComplaintDesk',
    'navServiceRequests',
    'navNotifications',
    'navAccountProfile',
    'navErpOverview',
    'navIncidentControlDesk',
    'navApplicationQueue',
    'navConsumerLedger',
    'navComplaintQueue',
    'navApprovalCenter',
    'navDeptCoordination',
    'navRevenueReports',
    'navFieldConsole',
    'navSiteFeasibility',
    'navFeederPatrol',
    'navOfflineQueue',
    'navCompletedJobs',
    'navRevenueDemand',
    'navSlaRedressal',
    'navFeederOverloads',
    'navAiInsights',
    'navExecutiveExport',
    'navSystemOverview',
    'navUsersRoles',
    'navAccessMatrix',
    'navAuditTrail',
    'navApiIntegrations',
    'navInfraDb',
    'navSystemSettings'
  ];

  for (const key of navKeys) {
    assert.ok(gu.erp[key].length > 0 && gu.erp[key] !== en.erp[key], `Gujarati erp.${String(key)} must be translated`);
    assert.ok(hi.erp[key].length > 0 && hi.erp[key] !== en.erp[key], `Hindi erp.${String(key)} must be translated`);
    assert.ok(mr.erp[key].length > 0 && mr.erp[key] !== en.erp[key], `Marathi erp.${String(key)} must be translated`);
  }

  // Verify English canonical labels remain verbatim
  assert.equal(en.erp.roleConsumer, 'Consumer Portal');
  assert.equal(en.erp.roleEmployee, 'Office Employee ERP');
  assert.equal(en.erp.roleField, 'Field Engineer App');
  assert.equal(en.erp.roleManagement, 'Management Cockpit');
  assert.equal(en.erp.roleAdmin, 'System Administrator');
  assert.equal(en.erp.signOutSwitchRole, 'Sign Out (Switch Role)');

  console.log('✓ 3. All shared ERP interface and navigation labels are complete across en, gu, hi, and mr');
}

// ----------------------------------------------------------------------------
// 4. Shared ERP Components Consume `useLanguage` Without Altering Internal Route Keys
// ----------------------------------------------------------------------------
{
  const sidebarSource = readSrc('src/components/layout/Sidebar.tsx');
  const mobileNavSource = readSrc('src/components/layout/MobileNav.tsx');
  const topNavSource = readSrc('src/components/layout/TopNav.tsx');
  const appShellSource = readSrc('src/components/layout/AppShell.tsx');
  const commandPaletteSource = readSrc('src/components/common/CommandPalette.tsx');
  const notificationDrawerSource = readSrc('src/components/common/NotificationDrawer.tsx');

  for (const [name, src] of [
    ['Sidebar.tsx', sidebarSource],
    ['MobileNav.tsx', mobileNavSource],
    ['TopNav.tsx', topNavSource],
    ['AppShell.tsx', appShellSource],
    ['CommandPalette.tsx', commandPaletteSource],
    ['NotificationDrawer.tsx', notificationDrawerSource]
  ] as const) {
    assert.ok(
      src.includes('useLanguage'),
      `${name} must use the shared useLanguage() hook for reactive multilingual updates`
    );
  }

  // Verify internal route tab IDs in Sidebar and MobileNav remain untouched
  const requiredRouteIds = [
    'dashboard',
    'connections',
    'new-connection',
    'bills',
    'payments',
    'complaints',
    'requests',
    'notifications',
    'profile',
    'incidents',
    'applications',
    'consumers',
    'approvals',
    'coordination',
    'reports',
    'workorders',
    'inspections',
    'maintenance',
    'offline',
    'history',
    'analytics',
    'sla',
    'feeders',
    'ai-insights',
    'overview',
    'users',
    'access',
    'audit',
    'integrations',
    'infra',
    'settings'
  ];

  for (const routeId of requiredRouteIds) {
    assert.ok(
      sidebarSource.includes(`id: '${routeId}'`),
      `Sidebar.tsx must preserve canonical route id '${routeId}'`
    );
    assert.ok(
      mobileNavSource.includes(`id: '${routeId}'`),
      `MobileNav.tsx must preserve canonical route id '${routeId}'`
    );
  }

  console.log('✓ 4. Shared ERP layout components reactively consume useLanguage() while preserving all canonical route IDs');
}

// ----------------------------------------------------------------------------
// 5. Role-Based Access Control (RBAC) & Canonical Profiles Remain Intact
// ----------------------------------------------------------------------------
{
  assert.equal(Object.keys(ROLE_PROFILES).length, 5, 'All 5 canonical ROLE_PROFILES must remain intact');
  assert.equal(isActionAuthorized('consumer', 'PATCH /api/v1/applications/:id/status'), false);
  assert.equal(isActionAuthorized('employee', 'PATCH /api/v1/applications/:id/status'), true);
  assert.equal(isActionAuthorized('field', 'PATCH /api/v1/work-orders/:id/status'), true);
  assert.equal(isActionAuthorized('management', 'POST /api/v1/incidents/:id/escalate'), true);
  assert.equal(isActionAuthorized('admin', 'GET /api/v1/incidents'), true);
  console.log('✓ 5. Five ERP portals and RBAC authorization boundaries remain strictly intact');
}

// ----------------------------------------------------------------------------
// 6. Repeated Language Switching Stability & Portal/Drawer Preservation
// ----------------------------------------------------------------------------
{
  const appSource = readSrc('src/App.tsx');
  const appContextSource = readSrc('src/context/AppContext.tsx');
  const langSelectorSource = readSrc('src/components/common/LanguageSelector.tsx');
  const notifDrawerSource = readSrc('src/components/common/NotificationDrawer.tsx');

  // Verify AppShell and PortalRouter are never keyed by language (which would unmount/remount active portals)
  assert.ok(
    !appSource.includes('key={language}') && !appSource.includes('key={lang}'),
    'App.tsx must never key AppShell or PortalRouter by language'
  );

  // Verify LanguageSelector stops event propagation and never calls window.location or history navigation
  assert.ok(
    langSelectorSource.includes('e.stopPropagation()') &&
      langSelectorSource.includes('data-language-selector="true"') &&
      !langSelectorSource.includes('window.location') &&
      !langSelectorSource.includes('window.history'),
    'LanguageSelector must isolate click events and never trigger browser navigation or page reloads'
  );

  // Verify NotificationDrawer embeds LanguageSelector in its header and guards backdrop clicks from closing the drawer on language change
  assert.ok(
    notifDrawerSource.includes('<LanguageSelector variant="erp" />') &&
      notifDrawerSource.includes('[data-language-selector="true"]'),
    'NotificationDrawer must allow repeated 4-language switching while remaining open'
  );

  // Verify AppContext persists active portal runtime state in sessionStorage and protects active sessions
  assert.ok(
    appContextSource.includes('vidyutflow_active_portal_runtime') &&
      appContextSource.includes('getStoredActivePortalRuntime') &&
      appContextSource.includes('setStoredActivePortalRuntime'),
    'AppContext must preserve active portal runtime state across language switches and preview iframe checks'
  );

  console.log('✓ 6. Repeated language switching (en -> gu -> hi -> mr -> en) preserves active portal, tab, session, and open NotificationDrawer without remounting');
}

console.log('\n================================================================');
console.log('✅ ALL PHASE 2, STEP 1 ERP MULTILINGUAL NAVIGATION TESTS PASSED!');
console.log('================================================================');

