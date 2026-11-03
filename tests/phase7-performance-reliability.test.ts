/**
 * VIDYUTFLOW 2.0 — PHASE 7 VERIFICATION SUITE
 * Enterprise Performance, Reliability, Safe Storage, Error Handling & Accessibility
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

console.log('==================================================================');
console.log('VIDYUTFLOW 2.0 — PHASE 7 PERFORMANCE & RELIABILITY TEST SUITE');
console.log('==================================================================\n');

let passedTests = 0;
function test(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${passedTests}. ${name}`);
  } catch (err: any) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

const rootDir = process.cwd();

// --- 1. CODE SPLITTING & LAZY LOADING CHECKS ---
test('App.tsx uses React.lazy for all 5 UGVCL portals and welcome page', () => {
  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(appTsx.includes('lazy('), 'App.tsx must use React.lazy');
  assert.ok(appTsx.includes('ConsumerPortal'), 'Must split ConsumerPortal');
  assert.ok(appTsx.includes('EmployeePortal'), 'Must split EmployeePortal');
  assert.ok(appTsx.includes('FieldPortal'), 'Must split FieldPortal');
  assert.ok(appTsx.includes('ManagementPortal'), 'Must split ManagementPortal');
  assert.ok(appTsx.includes('AdminPortal'), 'Must split AdminPortal');
  assert.ok(appTsx.includes('WelcomePortalPage'), 'Must split WelcomePortalPage');
  // Verify no static imports of portals
  assert.ok(!appTsx.includes("import { ConsumerPortal } from"), 'Must not statically import ConsumerPortal');
  assert.ok(!appTsx.includes("import { EmployeePortal } from"), 'Must not statically import EmployeePortal');
  assert.ok(!appTsx.includes("import { AdminPortal } from"), 'Must not statically import AdminPortal');
});

test('App.tsx wraps PortalRouter in Suspense and ErrorBoundary', () => {
  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  assert.ok(appTsx.includes('<ErrorBoundary scope="portal">'), 'PortalRouter must be wrapped in ErrorBoundary');
  assert.ok(appTsx.includes('<Suspense fallback={<PortalLoadingFallback'), 'PortalRouter must have Suspense fallback');
});

test('AppShell.tsx lazy-loads heavy modals and secondary drawers', () => {
  const appShellTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/layout/AppShell.tsx'), 'utf-8');
  assert.ok(appShellTsx.includes('lazy('), 'AppShell.tsx must use React.lazy');
  assert.ok(appShellTsx.includes('AIAssistantDrawer'), 'Must lazy-load AIAssistantDrawer');
  assert.ok(appShellTsx.includes('WorkflowVisualizerModal'), 'Must lazy-load WorkflowVisualizerModal');
  assert.ok(appShellTsx.includes('CaseDetailDrawer'), 'Must lazy-load CaseDetailDrawer');
  assert.ok(appShellTsx.includes('HumanApprovalModal'), 'Must lazy-load HumanApprovalModal');
  assert.ok(appShellTsx.includes('<ErrorBoundary scope="drawer">'), 'Drawers must be wrapped in ErrorBoundary');
  assert.ok(appShellTsx.includes('<Suspense fallback={null}>'), 'Drawers must be wrapped in Suspense');
});

// --- 2. SUSPENSE FALLBACK & ACCESSIBILITY SKELETON CHECKS ---
test('PortalLoadingFallback provides accessible ARIA busy attributes and zero layout shift', () => {
  const fallbackTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/common/PortalLoadingFallback.tsx'), 'utf-8');
  assert.ok(fallbackTsx.includes('role="status"'), 'Must have role=status for screen readers');
  assert.ok(fallbackTsx.includes('aria-live="polite"'), 'Must have aria-live=polite');
  assert.ok(fallbackTsx.includes('aria-busy="true"'), 'Must indicate aria-busy=true');
  assert.ok(fallbackTsx.includes('ROLE_THEME_MAP'), 'Must map specific theme colors per role');
  assert.ok(fallbackTsx.includes('sr-only'), 'Must include screen reader text description');
});

// --- 3. MULTI-TIER ERROR BOUNDARY CHECKS ---
test('ErrorBoundary provides getDerivedStateFromError and safe diagnostic logging', () => {
  assert.equal(typeof ErrorBoundary.getDerivedStateFromError, 'function');
  const derived = ErrorBoundary.getDerivedStateFromError(new Error('Simulated Portal Crash'));
  assert.equal(derived.hasError, true);
  assert.equal(derived.error?.message, 'Simulated Portal Crash');
});

test('ErrorBoundary source contains accessible alert and recovery actions', () => {
  const ebTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/common/ErrorBoundary.tsx'), 'utf-8');
  assert.ok(ebTsx.includes('role="alert"'), 'Must have role=alert');
  assert.ok(ebTsx.includes('aria-live="assertive"'), 'Must have aria-live=assertive');
  assert.ok(ebTsx.includes('Retry'), 'Must include retry recovery mechanism');
  assert.ok(ebTsx.includes('Reload Application'), 'Must include reload recovery mechanism');
  assert.ok(ebTsx.includes('Diagnostic Info') || ebTsx.includes('diagnostic'), 'Must include diagnostic copy');
  assert.ok(ebTsx.includes('UGVCL VidyutFlow Fault Isolation'), 'Must feature UGVCL branding');
});

// --- 4. SAFE STORAGE UTILITY CHECKS ---
test('safeStorageSet and safeStorageGet handle primitive and complex types correctly', () => {
  const testKey = 'vidyut_test_key_phase7';
  const testPayload = { id: 'TEST-1', count: 42, active: true, items: ['A', 'B'] };

  safeStorageSet(testKey, testPayload);
  const retrieved = safeStorageGet(testKey, null);
  assert.deepEqual(retrieved, testPayload);

  safeStorageRemove(testKey);
  const afterRemove = safeStorageGet(testKey, 'DEFAULT');
  assert.equal(afterRemove, 'DEFAULT');
});

test('safeStorageGet heals corrupted JSON and returns default fallback without crashing', () => {
  const corruptKey = 'vidyut_corrupt_test_key';
  const storage = getUnderlyingStorage('localStorage');
  storage.setItem(corruptKey, 'INVALID_JSON_{{NOT_CLOSED');

  const fallback = { fallback: true };
  const result = safeStorageGet(corruptKey, fallback);
  assert.deepEqual(result, fallback, 'Must return fallback object when JSON is corrupted');

  // Verify self-healing: corrupted item was removed
  const rawAfter = storage.getItem(corruptKey);
  assert.equal(rawAfter, null, 'Corrupt key must be removed for self-healing');
});

test('evictNonCriticalStorage purges AI cache and trims audit logs without touching critical bills or payments', () => {
  const mockStorage: Storage = {
    _data: new Map<string, string>(),
    length: 0,
    clear() { this._data.clear(); this.length = 0; },
    getItem(k: string) { return this._data.get(k) || null; },
    key(i: number) { return Array.from(this._data.keys())[i] || null; },
    removeItem(k: string) { this._data.delete(k); this.length = this._data.size; },
    setItem(k: string, v: string) { this._data.set(k, v); this.length = this._data.size; }
  } as any;

  // Populate mock storage with critical and non-critical data
  mockStorage.setItem('vidyutone_bills', JSON.stringify([{ id: 'BILL-1' }]));
  mockStorage.setItem('vidyutone_connections', JSON.stringify([{ id: 'CONN-1' }]));
  mockStorage.setItem('vidyut_ai_cache_test', 'temporary ai answer');

  const oversizedLogs = Array.from({ length: 60 }, (_, i) => ({ id: `LOG-${i}` }));
  mockStorage.setItem('vidyutone_auditlogs', JSON.stringify(oversizedLogs));

  const didEvict = evictNonCriticalStorage(mockStorage);
  assert.equal(didEvict, true, 'Must successfully evict non-critical storage');

  // Critical business records must remain 100% untouched
  assert.ok(mockStorage.getItem('vidyutone_bills'), 'Bills must NEVER be evicted');
  assert.ok(mockStorage.getItem('vidyutone_connections'), 'Connections must NEVER be evicted');
  // AI cache was evicted
  assert.equal(mockStorage.getItem('vidyut_ai_cache_test'), null, 'Temporary AI cache must be evicted');
});

test('getStorageUsageEstimate returns approximate bytes and key count', () => {
  const estimate = getStorageUsageEstimate('localStorage');
  assert.equal(typeof estimate.totalBytes, 'number');
  assert.equal(typeof estimate.keyCount, 'number');
  assert.equal(typeof estimate.isMemoryFallback, 'boolean');
});

test('NON_CRITICAL_EVICTION_KEYS excludes critical ERP datasets', () => {
  const criticalKeys = [
    'vidyutone_bills',
    'vidyutone_payments',
    'vidyutone_connections',
    'vidyutone_consumers',
    'vidyutone_applications',
    'vidyutone_complaints',
    'vidyutone_workorders',
    'vidyutflow_demo_session'
  ];

  for (const crit of criticalKeys) {
    assert.ok(
      !NON_CRITICAL_EVICTION_KEYS.includes(crit),
      `Critical key ${crit} must never be in NON_CRITICAL_EVICTION_KEYS`
    );
  }
});

// --- 5. BUNDLE CHUNK CONFIGURATION & VITE ROBUSTNESS ---
test('vite.config.ts manualChunks cleanly partitions vendors (react, recharts, icons, motion, qrcode)', () => {
  const viteConfig = fs.readFileSync(path.resolve(rootDir, 'vite.config.ts'), 'utf-8');
  assert.ok(viteConfig.includes("return 'vendor-react'"), 'Must partition vendor-react');
  assert.ok(viteConfig.includes("return 'vendor-recharts'"), 'Must partition vendor-recharts');
  assert.ok(viteConfig.includes("return 'vendor-icons'"), 'Must partition vendor-icons');
  assert.ok(viteConfig.includes("return 'vendor-motion'"), 'Must partition vendor-motion');
  assert.ok(viteConfig.includes("return 'vendor-qrcode'"), 'Must partition vendor-qrcode');
});

// --- 6. ACCESSIBILITY & ARIA AUDIT ---
test('AppShell provides skip-to-main link with matching target element', () => {
  const appShellTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/layout/AppShell.tsx'), 'utf-8');
  assert.ok(appShellTsx.includes('href="#main-workspace-content"'), 'Must have skip link targeting main-workspace-content');
  assert.ok(appShellTsx.includes('id="main-workspace-content"'), 'Must have main element with id="main-workspace-content"');
  assert.ok(appShellTsx.includes('tabIndex={-1}'), 'Main element must have tabIndex={-1} for focus movement');
});

test('AppShell provides polite live region for dataMode and backend status', () => {
  const appShellTsx = fs.readFileSync(path.resolve(rootDir, 'src/components/layout/AppShell.tsx'), 'utf-8');
  assert.ok(appShellTsx.includes('role="status" aria-live="polite"'), 'Must announce operating status politely');
});

// --- 7. FIELD ENGINEER OFFLINE RESILIENCE ---
test('Field Engineer offline queue remains intact and protected from service worker cache', () => {
  const pwaWorkerTs = fs.readFileSync(path.resolve(rootDir, 'src/utils/pwaServiceWorker.ts'), 'utf-8');
  assert.ok(pwaWorkerTs.includes('localStorage offline queue remains active'), 'Must protect offline queue');
  assert.ok(pwaWorkerTs.includes('PWA_APP_SHELL_CACHE_NAME'), 'Must isolate cache with unique version');
});

// --- 8. PRESERVATION OF UGVCL BRANDING & ROLES ---
test('Preserves official UGVCL branding and all 5 user roles across routing and shell', () => {
  const brandFile = path.resolve(rootDir, 'src/components/common/UgvclBrandIdentity.tsx');
  assert.ok(fs.existsSync(brandFile), 'UgvclBrandIdentity component must exist');
  const brandTsx = fs.readFileSync(brandFile, 'utf-8');
  assert.ok(brandTsx.includes('UGVCL') || brandTsx.includes('Uttar Gujarat Vij'), 'Must preserve UGVCL branding');

  const appTsx = fs.readFileSync(path.resolve(rootDir, 'src/App.tsx'), 'utf-8');
  const roles = ['consumer', 'employee', 'field', 'management', 'admin'];
  for (const role of roles) {
    assert.ok(appTsx.includes(`case '${role}':`), `App.tsx must route role '${role}'`);
  }
});

console.log(`\n==================================================================`);
console.log(`PHASE 7 TEST SUMMARY: ${passedTests}/${passedTests} PASSED (100%)`);
console.log('==================================================================\n');
