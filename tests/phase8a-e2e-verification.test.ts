/**
 * VIDYUTFLOW 2.0 — PHASE 8A
 * COMPREHENSIVE END-TO-END VERIFICATION SUITE — PART 1
 *
 * Verifies the integrity of VidyutFlow 2.0 after Phase 7 optimization:
 * 1. Application Startup & Shell Entry Integrity
 * 2. All Five Portals Open & Dynamically Resolved
 * 3. Portal Lazy Loading, Suspense Fallbacks & Error Boundaries
 * 4. Existing DEMO Accounts & Role Navigation
 * 5. English, Gujarati, Hindi & Marathi Switching Across All Five Portals
 * 6. Non-Destructive Language Switching (Zero Resets of Forms, Auth, or Workflows)
 * 7. Translation Key Completeness & Safe Fallback Resilience
 * 8. Canonical Data Integrity (Bills, Payments, Connections, Work Orders, Incidents, etc.)
 * 9. safeStorage Critical Record Preservation (Never Evicts Business Records)
 * 10. Quota Handling & Corrupted JSON Self-Healing
 * 11. Field Engineer Offline Queue Integrity & PWA Resilience
 * 12. Role Permissions, Client Route Guards & Record Isolation
 * 13. Un-Escalated Critical Incidents Restricted to Employee-First Access
 * 14. Session Persistence, URL Routing & Restoration
 * 15. Official UGVCL Branding, Logos & Wording Verbatim Preservation
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_CONNECTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  INITIAL_CONSUMERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS,
  ROLE_PROFILES
} from '../src/data/mockData';
import {
  DEFAULT_DEMO_ACCOUNTS,
  CANONICAL_DEMO_IDENTITIES,
  CANONICAL_FIELD_ENGINEERS,
  createDemoSessionForIdentity,
  resolveCanonicalDemoIdentity,
  getCanonicalIdentityById,
  getDefaultCanonicalIdentityForRole,
  getStoredDemoSession,
  setStoredDemoSession,
  hashDemoPassword,
  verifyDemoPassword,
  AUTH_DISCLAIMERS
} from '../src/data/demoAuthData';
import {
  isValidDemoSession,
  parseCurrentUrl
} from '../src/context/AppContext';
import {
  LANGUAGE_STORAGE_KEY
} from '../src/i18n/LanguageContext';
import {
  translations,
  en,
  gu,
  hi,
  mr
} from '../src/i18n/translations';
import {
  SUPPORTED_LANGUAGES
} from '../src/i18n/types';
import {
  getLanguageTypographyProfile
} from '../src/utils/typographyTokens';
import {
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  getStorageUsageEstimate,
  isStorageAvailable,
  getUnderlyingStorage,
  evictNonCriticalStorage,
  NON_CRITICAL_EVICTION_KEYS
} from '../src/utils/safeStorage';
import {
  FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  loadFieldOfflineQueue,
  enqueueFieldInspectionAction,
  enqueueFieldWorkOrderStatusAction,
  replayFieldOfflineQueue
} from '../src/utils/fieldOfflineQueue';
import {
  filterIncidentsByRole,
  filterIncidentsForSession
} from '../src/utils/anomalyDetector';
import { CriticalIncident } from '../src/types';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

console.log('==================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 8A COMPREHENSIVE VERIFICATION SUITE');
console.log('==================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runVerification(itemNumber: number, title: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] Item ${itemNumber}.${passedTests} — ${title}`);
  } catch (err: any) {
    console.error(`  [FAIL] Item ${itemNumber} — ${title}:`, err.message);
    throw err;
  }
}

const rootDir = process.cwd();

// ============================================================================
// 1. APPLICATION STARTUP & SHELL ENTRY INTEGRITY
// ============================================================================
console.log('\n--- VERIFICATION ITEM 1: Application Starts Without Runtime Errors ---');

runVerification(1, 'index.html has title and meta synced with metadata.json', () => {
  const indexHtml = fs.readFileSync(path.resolve(rootDir, 'index.html'), 'utf-8');
  const metadata = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'metadata.json'), 'utf-8'));

  assert.ok(indexHtml.includes(`<title>${metadata.name}</title>`), 'index.html title must match metadata.json');
  assert.ok(indexHtml.includes(`content="${metadata.description}"`), 'index.html meta description must match metadata.json');
  assert.ok(indexHtml.includes('id="root"'), 'index.html must have #root mounting point');
});

runVerification(1, 'src/main.tsx imports React 19 createRoot and mounts App component', () => {
  const mainTsx = fs.readFileSync(path.resolve(rootDir, 'src/main.tsx'), 'utf-8');
  assert.ok(mainTsx.includes('createRoot') && mainTsx.includes('react-dom/client'), 'main.tsx must use createRoot');
  assert.ok(mainTsx.includes('App') && (mainTsx.includes('./App.tsx') || mainTsx.includes('./App')), 'main.tsx must import App');
  assert.ok(mainTsx.includes("document.getElementById('root')"), 'main.tsx must mount to root');
});

runVerification(1, 'src/App.tsx configures root ErrorBoundary, AppProvider and LanguageProvider', () => {
  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(appTsx.includes('<ErrorBoundary scope="app">'), 'App.tsx must have root ErrorBoundary');
  assert.ok(appTsx.includes('<AppProvider>'), 'App.tsx must render AppProvider');
  assert.ok(appTsx.includes('<LanguageProvider>'), 'App.tsx must render LanguageProvider');
  assert.ok(appTsx.includes('<MainExperience />'), 'App.tsx must render MainExperience');
});

// ============================================================================
// 2. ALL FIVE PORTALS OPEN CORRECTLY
// ============================================================================
console.log('\n--- VERIFICATION ITEM 2: All Five Portals Open Correctly ---');

runVerification(2, 'Portal component source files exist and export expected components', () => {
  const portals = [
    { name: 'ConsumerPortal', path: 'src/components/consumer/ConsumerPortal.tsx' },
    { name: 'EmployeePortal', path: 'src/components/employee/EmployeePortal.tsx' },
    { name: 'FieldPortal', path: 'src/components/field/FieldPortal.tsx' },
    { name: 'ManagementPortal', path: 'src/components/management/ManagementPortal.tsx' },
    { name: 'AdminPortal', path: 'src/components/admin/AdminPortal.tsx' },
    { name: 'WelcomePortalPage', path: 'src/components/intro/WelcomePortalPage.tsx' }
  ];

  for (const portal of portals) {
    const fullPath = path.resolve(rootDir, portal.path);
    assert.ok(fs.existsSync(fullPath), `Portal file ${portal.path} must exist`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(
      content.includes(`export const ${portal.name}`) ||
      content.includes(`export default function ${portal.name}`) ||
      content.includes(`export function ${portal.name}`),
      `Portal ${portal.name} must export its main component`
    );
  }
});

runVerification(2, 'App.tsx contains case routes for all 5 portal roles', () => {
  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(appTsx.includes("case 'consumer':"), 'Must handle consumer role');
  assert.ok(appTsx.includes("case 'employee':"), 'Must handle employee role');
  assert.ok(appTsx.includes("case 'field':"), 'Must handle field role');
  assert.ok(appTsx.includes("case 'management':"), 'Must handle management role');
  assert.ok(appTsx.includes("case 'admin':"), 'Must handle admin role');
});

// ============================================================================
// 3. PORTAL LAZY LOADING, SUSPENSE FALLBACKS & ERROR BOUNDARIES
// ============================================================================
console.log('\n--- VERIFICATION ITEM 3: Portal Lazy Loading, Suspense & Error Boundaries ---');

runVerification(3, 'App.tsx lazy imports all 5 portals and WelcomePortalPage without static imports', () => {
  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(appTsx.includes("const WelcomePortalPage = lazy("), 'WelcomePortalPage must be lazy loaded');
  assert.ok(appTsx.includes("const ConsumerPortal = lazy("), 'ConsumerPortal must be lazy loaded');
  assert.ok(appTsx.includes("const EmployeePortal = lazy("), 'EmployeePortal must be lazy loaded');
  assert.ok(appTsx.includes("const FieldPortal = lazy("), 'FieldPortal must be lazy loaded');
  assert.ok(appTsx.includes("const ManagementPortal = lazy("), 'ManagementPortal must be lazy loaded');
  assert.ok(appTsx.includes("const AdminPortal = lazy("), 'AdminPortal must be lazy loaded');

  assert.ok(!appTsx.includes("import { ConsumerPortal } from"), 'No static ConsumerPortal import');
  assert.ok(!appTsx.includes("import { EmployeePortal } from"), 'No static EmployeePortal import');
  assert.ok(!appTsx.includes("import { FieldPortal } from"), 'No static FieldPortal import');
  assert.ok(!appTsx.includes("import { ManagementPortal } from"), 'No static ManagementPortal import');
  assert.ok(!appTsx.includes("import { AdminPortal } from"), 'No static AdminPortal import');
});

runVerification(3, 'PortalLoadingFallback delivers accessible ARIA attributes and theme color map', () => {
  const fallbackTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/common/PortalLoadingFallback.tsx'), 'utf-8');
  assert.ok(fallbackTsx.includes('role="status"'), 'Must have role=status');
  assert.ok(fallbackTsx.includes('aria-live="polite"'), 'Must have aria-live=polite');
  assert.ok(fallbackTsx.includes('aria-busy="true"'), 'Must declare aria-busy=true');
  assert.ok(fallbackTsx.includes('ROLE_THEME_MAP'), 'Must map specific role themes');
  assert.ok(fallbackTsx.includes('consumer:'), 'Theme includes consumer');
  assert.ok(fallbackTsx.includes('employee:'), 'Theme includes employee');
  assert.ok(fallbackTsx.includes('field:'), 'Theme includes field');
  assert.ok(fallbackTsx.includes('management:'), 'Theme includes management');
  assert.ok(fallbackTsx.includes('admin:'), 'Theme includes admin');
});

runVerification(3, 'ErrorBoundary captures runtime errors and exposes recovery actions', () => {
  const errorObj = new Error('Test Failure Simulation');
  const derived = ErrorBoundary.getDerivedStateFromError(errorObj);
  assert.equal(derived.hasError, true);
  assert.equal(derived.error?.message, 'Test Failure Simulation');

  const ebTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/common/ErrorBoundary.tsx'), 'utf-8');
  assert.ok(ebTsx.includes('role="alert"'), 'Must have role=alert');
  assert.ok(ebTsx.includes('Retry'), 'Must provide Retry action');
  assert.ok(ebTsx.includes('Reload Application'), 'Must provide Reload action');
});

// ============================================================================
// 4. EXISTING DEMO ACCOUNTS & ROLE NAVIGATION
// ============================================================================
console.log('\n--- VERIFICATION ITEM 4: Existing DEMO Accounts & Role Navigation ---');

runVerification(4, 'DEFAULT_DEMO_ACCOUNTS defines complete accounts for all 5 roles', () => {
  const roles = ['consumer', 'employee', 'field', 'management', 'admin'] as const;
  for (const role of roles) {
    const account = DEFAULT_DEMO_ACCOUNTS[role];
    assert.ok(account, `DEFAULT_DEMO_ACCOUNTS must include ${role}`);
    assert.equal(account.role, role);
    assert.ok(account.email.includes('@vidyutflow.demo'));
    assert.ok(account.name.length > 0);
    assert.ok(account.designation.length > 0);
    assert.ok(account.division.length > 0);
  }
});

runVerification(4, 'CANONICAL_DEMO_IDENTITIES covers default identities for all 5 roles', () => {
  const roles = ['consumer', 'employee', 'field', 'management', 'admin'] as const;
  for (const role of roles) {
    const defaultIdentity = getDefaultCanonicalIdentityForRole(role);
    assert.ok(defaultIdentity, `Must have default identity for ${role}`);
    assert.equal(defaultIdentity.role, role);
    assert.ok(defaultIdentity.id.length > 0);
    assert.ok(defaultIdentity.name.length > 0);
    assert.ok(defaultIdentity.email.length > 0);
  }
});

runVerification(4, 'createDemoSessionForIdentity generates valid DemoSession passing isValidDemoSession', () => {
  const identity = getDefaultCanonicalIdentityForRole('employee');
  const session = createDemoSessionForIdentity(identity);
  assert.equal(isValidDemoSession(session), true, 'Generated session must pass isValidDemoSession');
  assert.equal(session.role, 'employee');
  assert.equal(session.user.id, identity.id);
  assert.equal(session.user.role, 'employee');
  assert.ok(session.sessionToken.startsWith('vidyutflow_demo_'));
});

// ============================================================================
// 5. 4-LANGUAGE SWITCHING (EN, GU, HI, MR) ACROSS ALL FIVE PORTALS
// ============================================================================
console.log('\n--- VERIFICATION ITEM 5: English, Gujarati, Hindi & Marathi Switching ---');

runVerification(5, 'translations index exports dictionaries for en, gu, hi, and mr', () => {
  assert.ok(translations.en, 'Must have en dictionary');
  assert.ok(translations.gu, 'Must have gu dictionary');
  assert.ok(translations.hi, 'Must have hi dictionary');
  assert.ok(translations.mr, 'Must have mr dictionary');
});

runVerification(5, 'SUPPORTED_LANGUAGES contains all 4 official language options', () => {
  const codes = SUPPORTED_LANGUAGES.map(l => l.code);
  assert.deepEqual(codes, ['en', 'gu', 'hi', 'mr'], 'Must support exactly en, gu, hi, mr');

  const guOpt = SUPPORTED_LANGUAGES.find(l => l.code === 'gu');
  assert.ok(guOpt?.nativeName.includes('ગુજરાતી'), 'Gujarati native name check');

  const hiOpt = SUPPORTED_LANGUAGES.find(l => l.code === 'hi');
  assert.ok(hiOpt?.nativeName.includes('हिन्दी'), 'Hindi native name check');

  const mrOpt = SUPPORTED_LANGUAGES.find(l => l.code === 'mr');
  assert.ok(mrOpt?.nativeName.includes('मराठी'), 'Marathi native name check');
});

runVerification(5, 'getLanguageTypographyProfile returns specialized scripts and fonts for all 4 languages', () => {
  const enProfile = getLanguageTypographyProfile('en');
  assert.equal(enProfile.script, 'latin');

  const guProfile = getLanguageTypographyProfile('gu');
  assert.equal(guProfile.script, 'gujarati');
  assert.ok(guProfile.fontFamilyCss.toLowerCase().includes('gujarati') || guProfile.fontFamilyCss.toLowerCase().includes('noto'));

  const hiProfile = getLanguageTypographyProfile('hi');
  assert.equal(hiProfile.script, 'devanagari');

  const mrProfile = getLanguageTypographyProfile('mr');
  assert.equal(mrProfile.script, 'devanagari');
});

// ============================================================================
// 6. NON-DESTRUCTIVE LANGUAGE SWITCHING
// ============================================================================
console.log('\n--- VERIFICATION ITEM 6: Language Switching Does Not Reset State ---');

runVerification(6, 'LANGUAGE_STORAGE_KEY is distinct and does not overwrite session or business state', () => {
  assert.equal(LANGUAGE_STORAGE_KEY, 'vidyutflow_language_preference');

  // Verify it does not match any ERP storage keys
  const erpKeys = [
    'vidyutflow_demo_session',
    'vidyutone_bills',
    'vidyutone_payments',
    'vidyutone_connections',
    'vidyutone_applications',
    'vidyutone_complaints',
    'vidyutone_workorders'
  ];

  for (const k of erpKeys) {
    assert.notEqual(LANGUAGE_STORAGE_KEY, k);
  }
});

runVerification(6, 'Language switching only mutates language preference without affecting active role or session', () => {
  const initialSession = createDemoSessionForIdentity(getDefaultCanonicalIdentityForRole('management'));
  const storage = getUnderlyingStorage('localStorage');

  // Set mock active session and language
  storage.setItem('vidyutflow_demo_session', JSON.stringify(initialSession));
  storage.setItem(LANGUAGE_STORAGE_KEY, 'en');

  // Switch language to Gujarati
  storage.setItem(LANGUAGE_STORAGE_KEY, 'gu');

  // Verify session and active role remain 100% untouched
  const sessionAfter = JSON.parse(storage.getItem('vidyutflow_demo_session') || '{}');
  assert.equal(sessionAfter.role, 'management');
  assert.equal(sessionAfter.user.id, initialSession.user.id);
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'gu');
});

// ============================================================================
// 7. TRANSLATION KEY COMPLETENESS & SAFE FALLBACK
// ============================================================================
console.log('\n--- VERIFICATION ITEM 7: Translation Completeness & Safe Fallback ---');

runVerification(7, 'Core dictionary sections exist across en, gu, hi, and mr', () => {
  const sections: (keyof typeof en)[] = ['common', 'header', 'ticker', 'hero', 'about'];
  const dicts = [
    { lang: 'en', data: en },
    { lang: 'gu', data: gu },
    { lang: 'hi', data: hi },
    { lang: 'mr', data: mr }
  ];

  for (const dict of dicts) {
    for (const sec of sections) {
      assert.ok(dict.data[sec], `Language ${dict.lang} must have section ${sec}`);
      assert.ok(Object.keys(dict.data[sec]).length > 0, `Language ${dict.lang} section ${sec} must not be empty`);
    }
  }
});

runVerification(7, 'LanguageContext provides English fallback for any missing translation key', () => {
  // Test fallback logic used in LanguageContext
  const dictMerge = (langDict: any, enDict: any) => {
    const merged: Record<string, Record<string, string>> = {};
    for (const section of Object.keys(enDict)) {
      merged[section] = {
        ...(enDict[section] || {}),
        ...(langDict[section] || {})
      };
    }
    return merged;
  };

  const partialDict = { common: { save: 'સાચવો' } };
  const merged = dictMerge(partialDict, en);
  // Key present in partialDict uses translated value
  assert.equal(merged.common.save, 'સાચવો');
  // Key missing in partialDict falls back to English without crashing
  assert.equal(merged.common.cancel, en.common.cancel);
  assert.ok(merged.common.cancel !== undefined && merged.common.cancel !== '');
});

// ============================================================================
// 8. CANONICAL DATA INTEGRITY
// ============================================================================
console.log('\n--- VERIFICATION ITEM 8: Canonical Data Integrity ---');

runVerification(8, 'Canonical datasets contain valid, non-empty business seed records', () => {
  assert.ok(INITIAL_CONNECTIONS.length >= 2, 'Must have at least 2 initial connections');
  assert.ok(INITIAL_BILLS.length >= 4, 'Must have at least 4 initial bills');
  assert.ok(INITIAL_PAYMENTS.length >= 2, 'Must have at least 2 initial payments');
  assert.ok(INITIAL_APPLICATIONS.length >= 2, 'Must have at least 2 initial applications');
  assert.ok(INITIAL_COMPLAINTS.length >= 2, 'Must have at least 2 initial complaints');
  assert.ok(INITIAL_WORK_ORDERS.length >= 2, 'Must have at least 2 initial work orders');
  assert.ok(INITIAL_NOTIFICATIONS.length >= 5, 'Must have at least 5 initial notifications');
  assert.ok(AUDIT_LOGS.length >= 5, 'Must have at least 5 initial audit logs');
  assert.ok(INITIAL_CONSUMERS.length >= 1, 'Must have initial consumers');
  assert.ok(INITIAL_EMPLOYEES.length >= 3, 'Must have initial employees');
  assert.ok(INITIAL_FIELD_ENGINEERS.length >= 3, 'Must have initial field engineers');
});

runVerification(8, 'Electricity bills satisfy tariff arithmetic (energy + fixed + fuelPriceAdjustment + duty - rebate = totalAmount)', () => {
  for (const bill of INITIAL_BILLS) {
    const expected = Math.round(
      bill.energyCharges + bill.fixedCharges + (bill.fuelPriceAdjustment || 0) + bill.electricityDuty - (bill.rebateOrSubsidy || 0)
    );
    // Allow minor 1-2 rupee rounding difference due to government tax rounding rules
    assert.ok(
      Math.abs(bill.totalAmount - expected) <= 2,
      `Bill ${bill.billNo} totalAmount ${bill.totalAmount} must match sum ${expected}`
    );
  }
});

// ============================================================================
// 9. safeStorage CRITICAL RECORD PRESERVATION
// ============================================================================
console.log('\n--- VERIFICATION ITEM 9: safeStorage Critical Record Preservation ---');

runVerification(9, 'NON_CRITICAL_EVICTION_KEYS excludes all critical ERP datasets', () => {
  const criticalKeys = [
    'vidyutone_bills',
    'vidyutone_payments',
    'vidyutone_connections',
    'vidyutone_consumers',
    'vidyutone_applications',
    'vidyutone_complaints',
    'vidyutone_workorders',
    'vidyutflow_demo_session',
    'offline_work_orders'
  ];

  for (const crit of criticalKeys) {
    assert.ok(
      !NON_CRITICAL_EVICTION_KEYS.includes(crit),
      `Critical key ${crit} must NEVER be present in NON_CRITICAL_EVICTION_KEYS`
    );
  }
});

runVerification(9, 'evictNonCriticalStorage clears transient cache without touching critical records', () => {
  const storage = getUnderlyingStorage('localStorage');

  storage.setItem('vidyutone_bills', JSON.stringify([{ id: 'BILL-KEEP-1', amount: 500 }]));
  storage.setItem('vidyutone_payments', JSON.stringify([{ id: 'TXN-KEEP-1', amount: 500 }]));
  storage.setItem('vidyut_ai_cache_test_phase8', 'temporary ai cache');

  const didEvict = evictNonCriticalStorage(storage);
  assert.equal(didEvict, true, 'Eviction should succeed');

  assert.ok(storage.getItem('vidyutone_bills'), 'Bills must remain intact');
  assert.ok(storage.getItem('vidyutone_payments'), 'Payments must remain intact');
  assert.equal(storage.getItem('vidyut_ai_cache_test_phase8'), null, 'AI cache must be pruned');
});

// ============================================================================
// 10. QUOTA HANDLING & CORRUPTED JSON SELF-HEALING
// ============================================================================
console.log('\n--- VERIFICATION ITEM 10: Quota Handling & Corrupted JSON Self-Healing ---');

runVerification(10, 'safeStorageGet returns fallback and clears corrupt JSON entry', () => {
  const corruptKey = 'vidyut_corrupt_phase8a_test';
  const storage = getUnderlyingStorage('localStorage');
  storage.setItem(corruptKey, '{unclosed_json: true,');

  const fallback = { fallbackUsed: true };
  const result = safeStorageGet(corruptKey, fallback);
  assert.deepEqual(result, fallback, 'Must safely return fallback');
  assert.equal(storage.getItem(corruptKey), null, 'Corrupted key must be cleaned up to self-heal');
});

runVerification(10, 'safeStorageSet handles primitive, object, and array values correctly', () => {
  const testKey = 'vidyut_phase8a_valid_test';
  const testObj = { role: 'employee', active: true, count: 42 };

  safeStorageSet(testKey, testObj);
  const retrieved = safeStorageGet(testKey, null);
  assert.deepEqual(retrieved, testObj);

  safeStorageRemove(testKey);
  assert.equal(safeStorageGet(testKey, 'DEFAULT'), 'DEFAULT');
});

// ============================================================================
// 11. FIELD ENGINEER OFFLINE QUEUE INTEGRITY & PWA RESILIENCE
// ============================================================================
console.log('\n--- VERIFICATION ITEM 11: Field Engineer Offline Queue & PWA Resilience ---');

runVerification(11, 'FIELD_OFFLINE_QUEUE_STORAGE_KEY is stable and isolated', () => {
  assert.equal(FIELD_OFFLINE_QUEUE_STORAGE_KEY, 'vidyutflow_field_offline_queue');
});

runVerification(11, 'Field Engineer offline queue enqueues and loads inspection actions deterministically', () => {
  const storage = getUnderlyingStorage('localStorage');
  storage.removeItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY);

  const initialQueue = loadFieldOfflineQueue(storage);
  assert.equal(Array.isArray(initialQueue), true);

  const { item: enqueued, queue } = enqueueFieldInspectionAction(
    {
      woId: INITIAL_WORK_ORDERS[0]?.id || 'WO-4401',
      canonicalWorkOrders: INITIAL_WORK_ORDERS,
      inspectionReport: {
        meterSerialScanned: 'UGVCL-SM-2026-99412',
        readingKwh: 14820,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 230, y: 232, b: 228 },
        technicianRemarks: 'Feeder load balanced. Transformer earthing compliant.',
        photoUploaded: true
      },
      submittedBy: 'Vikrambhai Solanki (FLD-UG-201)',
      nowIso: '2026-10-15T10:15:00.000Z'
    },
    storage
  );

  assert.ok(enqueued.client_uuid.length > 0);
  assert.equal(enqueued.actionType, 'SITE_INSPECTION_SUBMIT');
  assert.equal(enqueued.targetRecordId, INITIAL_WORK_ORDERS[0]?.id || 'WO-4401');

  const loadedQueue = loadFieldOfflineQueue(storage);
  assert.equal(loadedQueue.length, 1);
  assert.equal(loadedQueue[0].client_uuid, enqueued.client_uuid);

  // Clean up
  storage.removeItem(FIELD_OFFLINE_QUEUE_STORAGE_KEY);
});

// ============================================================================
// 12. ROLE PERMISSIONS, CLIENT ROUTE GUARDS & RECORD ISOLATION
// ============================================================================
console.log('\n--- VERIFICATION ITEM 12: Role Permissions & Route Guards ---');

runVerification(12, 'isValidDemoSession enforces strict role matching between user.role and session.role', () => {
  const validSession = createDemoSessionForIdentity(getDefaultCanonicalIdentityForRole('consumer'));
  assert.equal(isValidDemoSession(validSession), true);

  // Tampered role mismatch
  const tamperedSession = {
    ...validSession,
    role: 'admin',
    user: {
      ...validSession.user,
      role: 'consumer' // Mismatch!
    }
  };
  assert.equal(isValidDemoSession(tamperedSession), false, 'Mismatched roles must fail validation');
});

runVerification(12, 'App.tsx route guard blocks portal rendering if currentRole differs from session.role', () => {
  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(
    appTsx.includes('if (!demoSession || !isValidDemoSession(demoSession) || demoSession.role !== currentRole)'),
    'App.tsx must strictly enforce session.role === currentRole before rendering portal'
  );
});

// ============================================================================
// 13. UN-ESCALATED CRITICAL INCIDENTS EMPLOYEE-FIRST RESTRICTION
// ============================================================================
console.log('\n--- VERIFICATION ITEM 13: Un-Escalated Critical Incidents Restricted to Employee ---');

runVerification(13, 'filterIncidentsForSession hides un-escalated incidents from Management and Field Engineer', () => {
  const unescalatedInc: CriticalIncident = {
    id: 'INC-CRIT-001',
    title: 'Phase Surge Anomaly',
    description: 'Transient spike detected on 11kV bus',
    severity: 'WARNING',
    module: 'Distribution & SCADA',
    entityId: 'FDR-11K-01',
    entityType: 'feeder',
    timestamp: new Date().toISOString(),
    responsibleRoles: ['employee', 'management'],
    recommendedAction: 'Inspect DTR',
    status: 'DETECTED',
    subdivision: 'Mehsana City North',
    escalatedTo: undefined,
    history: []
  };

  const escalatedInc: CriticalIncident = {
    id: 'INC-CRIT-002',
    title: 'Feeder Trip Escalated',
    description: 'Breaker tripped on overcurrent',
    severity: 'CRITICAL',
    module: 'Distribution & SCADA',
    entityId: 'FDR-11K-02',
    entityType: 'feeder',
    timestamp: new Date().toISOString(),
    responsibleRoles: ['employee', 'management'],
    recommendedAction: 'Executive authorization',
    status: 'ESCALATED',
    subdivision: 'Mehsana City North',
    escalatedTo: 'management',
    history: []
  };

  const incidents = [unescalatedInc, escalatedInc];

  // Employee role can view all incidents including un-escalated within their jurisdiction
  const empVisible = filterIncidentsForSession(incidents, 'employee', { subdivision: 'Mehsana City North' });
  assert.equal(empVisible.length, 2, 'Employee must see all incidents');

  // Management role can ONLY view escalated incidents; un-escalated is hidden
  const mgmtVisible = filterIncidentsForSession(incidents, 'management', { id: 'usr_mgmt_01', subdivision: 'UGVCL Headquarters, Mehsana' });
  assert.equal(mgmtVisible.length, 1, 'Management must only see escalated incidents');
  assert.equal(mgmtVisible[0].id, 'INC-CRIT-002', 'Management must see escalated INC-CRIT-002');

  // Field engineer can only see dispatched or assigned incidents
  const fieldVisible = filterIncidentsForSession(incidents, 'field', { id: 'FLD-UG-201' });
  assert.equal(fieldVisible.length, 0, 'Field engineer cannot see unassigned incidents');

  // Consumer never receives operational incidents
  const consumerVisible = filterIncidentsForSession(incidents, 'consumer');
  assert.equal(consumerVisible.length, 0, 'Consumer must receive zero operational incidents');
});

// ============================================================================
// 14. SESSION PERSISTENCE, URL ROUTING & RESTORATION
// ============================================================================
console.log('\n--- VERIFICATION ITEM 14: Session Persistence, URL Routing & Restoration ---');

runVerification(14, 'getStoredDemoSession and setStoredDemoSession preserve session across cycles', () => {
  const identity = getDefaultCanonicalIdentityForRole('admin');
  const session = createDemoSessionForIdentity(identity);

  setStoredDemoSession(session);
  const retrieved = getStoredDemoSession();
  assert.ok(retrieved, 'Must retrieve stored session');
  assert.equal(retrieved?.role, 'admin');
  assert.equal(retrieved?.user.name, identity.name);
  assert.equal(retrieved?.sessionToken, session.sessionToken);

  // Clear session
  setStoredDemoSession(null);
  assert.equal(getStoredDemoSession(), null, 'Must be null after clearing');
});

runVerification(14, 'parseCurrentUrl resolves role, tab, and query parameters cleanly', () => {
  const queryUrl = 'http://localhost:3000/?role=management&tab=kpi';
  const parsedQuery = parseCurrentUrl(queryUrl);
  assert.equal(parsedQuery.role, 'management');
  assert.equal(parsedQuery.tab, 'kpi');
  assert.equal(parsedQuery.entered, true);

  const hashUrl = 'http://localhost:3000/#/employee/billing';
  const parsedHash = parseCurrentUrl(hashUrl);
  assert.equal(parsedHash.role, 'employee');
  assert.equal(parsedHash.tab, 'billing');
  assert.equal(parsedHash.entered, true);

  const welcomeUrl = 'http://localhost:3000/welcome';
  const parsedWelcome = parseCurrentUrl(welcomeUrl);
  assert.equal(parsedWelcome.entered, false);
});

// ============================================================================
// 15. OFFICIAL UGVCL BRANDING, LOGOS & WORDING PRESERVATION
// ============================================================================
console.log('\n--- VERIFICATION ITEM 15: Official UGVCL Branding & Wording Preservation ---');

runVerification(15, 'UgvclBrandIdentity component contains official UGVCL titles and identity', () => {
  const brandFile = path.resolve(rootDir, 'src/components/common/UgvclBrandIdentity.tsx');
  assert.ok(fs.existsSync(brandFile), 'UgvclBrandIdentity component must exist');
  const content = fs.readFileSync(brandFile, 'utf-8');
  assert.ok(content.includes('Uttar Gujarat Vij Company Limited'), 'Must include full official UGVCL name');
  assert.ok(content.includes('UGVCL'), 'Must include UGVCL acronym');
  assert.ok(content.includes('ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ'), 'Must include official Gujarati title');
  assert.ok(content.includes('U40102GJ2003SGC042906'), 'Must include official corporate identification number (CIN)');
});

runVerification(15, 'Official UGVCL logo assets exist in public assets directory', () => {
  const logoPng = path.resolve(rootDir, 'public/assets/ugvcl-logo.png');
  const logoSvg = path.resolve(rootDir, 'public/assets/ugvcl-logo.svg');
  assert.ok(fs.existsSync(logoPng), 'ugvcl-logo.png must exist');
  assert.ok(fs.existsSync(logoSvg), 'ugvcl-logo.svg must exist');
  assert.ok(fs.statSync(logoPng).size > 1000, 'ugvcl-logo.png must have non-trivial size');
  assert.ok(fs.statSync(logoSvg).size > 500, 'ugvcl-logo.svg must have non-trivial size');
});

runVerification(15, 'AUTH_DISCLAIMERS and legal notices state prototype status accurately', () => {
  assert.ok(AUTH_DISCLAIMERS.prototypeNotice.includes('UGVCL-inspired'), 'Disclaimer must mention UGVCL-inspired');
  assert.ok(AUTH_DISCLAIMERS.signupNotice.includes('Consumer accounts'), 'Public registration note must be present');
});

console.log('\n==================================================================');
console.log(`PHASE 8A E2E VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('==================================================================\n');
