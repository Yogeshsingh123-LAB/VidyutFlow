import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PWA_APP_SHELL_CACHE_NAME,
  PWA_APP_SHELL_CACHE_PREFIX,
  PWA_APP_SHELL_CACHE_VERSION,
  PWA_CORE_PRECACHE_URLS,
  PWA_MANIFEST_URL,
  PWA_SERVICE_WORKER_URL,
  applyPendingServiceWorkerUpdateIfSafe,
  canRegisterServiceWorker,
  evaluateInstallabilityCapability,
  getOutdatedCacheNames,
  isUserEnteringFormOrInspectionData,
  registerVidyutFlowServiceWorker,
  shouldCacheResponse,
  shouldInterceptRequest,
  validateOrEvictCachedResponse,
} from '../src/utils/pwaServiceWorker';
import {
  FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  enqueueFieldInspectionAction,
  loadFieldOfflineQueue,
  replayFieldOfflineQueue,
} from '../src/utils/fieldOfflineQueue';
import { INITIAL_WORK_ORDERS } from '../src/data/mockData';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

async function runPwaOfflineShellTests() {
  console.log('Running Phase 2, Step 2: PWA & Offline Application Shell Test Suite...\n');

  const rootDir = process.cwd();
  const manifestPath = path.resolve(rootDir, 'public/manifest.webmanifest');
  const swPath = path.resolve(rootDir, 'public/sw.js');
  const indexHtmlPath = path.resolve(rootDir, 'index.html');
  const mainTsxPath = path.resolve(rootDir, 'src/main.tsx');
  const ugvclLogoPngPath = path.resolve(rootDir, 'public/assets/ugvcl-logo.png');

  // ==========================================================================
  // 1. PWA MANIFEST & OFFICIAL UGVCL ASSET PRESERVATION
  // ==========================================================================
  console.log('1. Verifying manifest.webmanifest configuration and official UGVCL logo preservation...');
  assert.ok(fs.existsSync(manifestPath), 'public/manifest.webmanifest must exist');
  const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestRaw);

  assert.ok(
    manifest.name.includes('VidyutFlow') && manifest.name.includes('UGVCL'),
    'Manifest name must include VidyutFlow and UGVCL branding'
  );
  assert.equal(manifest.short_name, 'VidyutFlow');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#1E3A8A');
  assert.equal(manifest.background_color, '#F5F7FB');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 1, 'Manifest must define icons');

  const pngIcon = manifest.icons.find((i: any) => i.src === '/assets/ugvcl-logo.png');
  assert.ok(pngIcon, 'Manifest must reuse /assets/ugvcl-logo.png');
  assert.equal(pngIcon.sizes, '1000x1000');
  assert.equal(pngIcon.type, 'image/png');
  assert.equal(pngIcon.purpose, 'any', 'Must not falsely claim maskable purpose on unmodified official logo');

  // Verify official UGVCL logo file was not altered
  assert.ok(fs.existsSync(ugvclLogoPngPath), 'public/assets/ugvcl-logo.png must exist');
  const logoBuffer = fs.readFileSync(ugvclLogoPngPath);
  assert.equal(logoBuffer.length, 11305, 'Official UGVCL logo PNG byte size (11,305 bytes) must remain unaltered');
  assert.equal(logoBuffer.readUInt32BE(16), 1000, 'Official UGVCL logo width must remain 1000px');
  assert.equal(logoBuffer.readUInt32BE(20), 1000, 'Official UGVCL logo height must remain 1000px');

  // Verify honest installability assessment
  const installability = evaluateInstallabilityCapability(manifest, {
    hasWindow: true,
    hasServiceWorkerSupport: true,
    protocol: 'https:',
    hostname: 'vidyutflow.example.com',
    isSecureContext: true,
    isIframe: true,
  });
  assert.equal(installability.isStandaloneCapableShell, true);
  assert.equal(
    installability.claimsFullPromptInstallability,
    false,
    'Must not claim full browser installability when dedicated 192/512 icons or top-level context are missing'
  );
  assert.ok(installability.reasons.length >= 2);

  // Verify index.html links manifest.webmanifest and UGVCL logo
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  assert.ok(
    indexHtml.includes('<link rel="manifest" href="/manifest.webmanifest" />'),
    'index.html must link /manifest.webmanifest'
  );
  assert.ok(
    indexHtml.includes('<meta name="theme-color" content="#1E3A8A" />'),
    'index.html must include theme-color meta tag'
  );
  console.log('   ✓ Manifest configuration, index.html links, and official UGVCL logo integrity verified.');

  // ==========================================================================
  // 2. SERVICE WORKER REGISTRATION ENVIRONMENT COMPATIBILITY
  // ==========================================================================
  console.log('2. Verifying Service Worker registration environment compatibility & error safety...');

  // 2a. Non-browser Node.js environment
  const nodeEnv = canRegisterServiceWorker({ hasWindow: false });
  assert.equal(nodeEnv.canRegister, false, 'Must not attempt registration when window is unavailable');
  assert.equal(nodeEnv.requiresPriorOnlineLoadForOfflineAccess, true);
  assert.equal(nodeEnv.offlineActionQueueStorageKey, FIELD_OFFLINE_QUEUE_STORAGE_KEY);

  // 2b. Browser without serviceWorker API
  const noSwBrowser = canRegisterServiceWorker({
    hasWindow: true,
    hasServiceWorkerSupport: false,
    protocol: 'https:',
    hostname: 'example.com',
    isSecureContext: true,
  });
  assert.equal(noSwBrowser.canRegister, false);

  // 2c. Unsupported file: or chrome-extension: protocol
  const fileProtocolEnv = canRegisterServiceWorker({
    hasWindow: true,
    hasServiceWorkerSupport: true,
    protocol: 'file:',
    hostname: '',
    isSecureContext: false,
  });
  assert.equal(fileProtocolEnv.canRegister, false);

  // 2d. Insecure HTTP on non-localhost domain
  const insecureHttpEnv = canRegisterServiceWorker({
    hasWindow: true,
    hasServiceWorkerSupport: true,
    protocol: 'http:',
    hostname: 'ugvcl-erp.example.com',
    isSecureContext: false,
  });
  assert.equal(insecureHttpEnv.canRegister, false);

  // 2e. Localhost HTTP development server
  const localhostEnv = canRegisterServiceWorker({
    hasWindow: true,
    hasServiceWorkerSupport: true,
    protocol: 'http:',
    hostname: 'localhost',
    isSecureContext: false,
    isIframe: false,
  });
  assert.equal(localhostEnv.canRegister, true, 'Localhost HTTP must be allowed for local development');
  assert.equal(localhostEnv.isPreviewIframe, false);

  // 2f. HTTPS inside AI Studio preview iframe
  const previewIframeEnv = canRegisterServiceWorker({
    hasWindow: true,
    hasServiceWorkerSupport: true,
    protocol: 'https:',
    hostname: 'preview.aistudio.google.com',
    isSecureContext: true,
    isIframe: true,
  });
  assert.equal(previewIframeEnv.canRegister, true);
  assert.equal(previewIframeEnv.isPreviewIframe, true);

  // 2g. Calling registerVidyutFlowServiceWorker() in Node.js test runner must never throw
  const nodeRegStatus = await registerVidyutFlowServiceWorker();
  assert.equal(nodeRegStatus.attempted, false);
  assert.equal(nodeRegStatus.registered, false);
  assert.equal(nodeRegStatus.scriptUrl, PWA_SERVICE_WORKER_URL);

  // Verify src/main.tsx wires registerVidyutFlowServiceWorker safely
  const mainTsx = fs.readFileSync(mainTsxPath, 'utf-8');
  assert.ok(
    mainTsx.includes('registerVidyutFlowServiceWorker'),
    'src/main.tsx must invoke registerVidyutFlowServiceWorker'
  );
  console.log('   ✓ Service Worker registration guards and Node/iframe resilience verified.');

  // ==========================================================================
  // 3. STRICT CACHE EXCLUSIONS & HTTP METHOD GUARDS
  // ==========================================================================
  console.log('3. Verifying strict cache exclusions (Auth, API, AI, ERP records, POST/PUT/PATCH/DELETE)...');

  // 3a. Non-GET methods must NEVER be intercepted
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    assert.equal(
      shouldInterceptRequest({
        method,
        url: 'https://vidyutflow.local/index.html',
        currentOrigin: 'https://vidyutflow.local',
      }),
      false,
      `${method} request must NEVER be intercepted by service worker`
    );
    assert.equal(
      shouldInterceptRequest({
        method,
        url: 'https://vidyutflow.local/api/work-orders/WO-4402',
        currentOrigin: 'https://vidyutflow.local',
      }),
      false,
      `${method} mutation request must NEVER be intercepted or queued by service worker`
    );
  }

  // 3b. API, Authentication, AI Assistant, and Health routes must NEVER be intercepted
  const excludedApiUrls = [
    'https://vidyutflow.local/api/auth/login',
    'https://vidyutflow.local/api/auth/session',
    'https://vidyutflow.local/api/ai-chat',
    'https://vidyutflow.local/api/health',
    'https://vidyutflow.local/api/consumers/04281-99231',
    'https://vidyutflow.local/api/work-orders',
    'https://vidyutflow.local/auth/callback',
    'https://vidyutflow.local/oauth/token',
    'https://vidyutflow.local/sw.js',
  ];
  for (const url of excludedApiUrls) {
    assert.equal(
      shouldInterceptRequest({
        method: 'GET',
        url,
        currentOrigin: 'https://vidyutflow.local',
      }),
      false,
      `Sensitive or dynamic endpoint ${url} must NEVER be intercepted`
    );
    assert.equal(
      shouldCacheResponse({
        url,
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      false,
      `Response from ${url} must NEVER be cached`
    );
  }

  // 3c. Requests with Authorization header or Cache-Control: no-store must NEVER be intercepted
  assert.equal(
    shouldInterceptRequest({
      method: 'GET',
      url: 'https://vidyutflow.local/assets/ugvcl-logo.png',
      currentOrigin: 'https://vidyutflow.local',
      headers: { Authorization: 'Bearer secret-jwt-token' },
    }),
    false,
    'Authenticated requests with Authorization header must not be intercepted'
  );
  assert.equal(
    shouldInterceptRequest({
      method: 'GET',
      url: 'https://vidyutflow.local/index.html',
      currentOrigin: 'https://vidyutflow.local',
      headers: { 'Cache-Control': 'no-store, no-cache' },
    }),
    false,
    'Requests with Cache-Control: no-store must not be intercepted'
  );

  // 3d. Responses with no-store, private, Set-Cookie, non-200 status, or JSON data must NEVER be cached
  assert.equal(
    shouldCacheResponse({
      url: 'https://vidyutflow.local/index.html',
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=60' },
    }),
    false,
    'Private responses must never be cached'
  );
  assert.equal(
    shouldCacheResponse({
      url: 'https://vidyutflow.local/index.html',
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }),
    false,
    'no-store responses must never be cached'
  );
  assert.equal(
    shouldCacheResponse({
      url: 'https://vidyutflow.local/index.html',
      status: 200,
      headers: { 'Set-Cookie': 'session=abc123; HttpOnly' },
    }),
    false,
    'Responses setting cookies must never be cached'
  );
  assert.equal(
    shouldCacheResponse({
      url: 'https://vidyutflow.local/assets/app.js',
      status: 500,
      headers: { 'Content-Type': 'application/javascript' },
    }),
    false,
    'Non-200 error responses must never be cached'
  );

  // 3e. Static application-shell resources MUST be allowed
  const allowedStaticUrls = [
    'https://vidyutflow.local/',
    'https://vidyutflow.local/index.html',
    'https://vidyutflow.local/manifest.webmanifest',
    'https://vidyutflow.local/assets/ugvcl-logo.png',
    'https://vidyutflow.local/assets/ugvcl-logo.svg',
    'https://vidyutflow.local/assets/index-D8f9a1.js',
    'https://vidyutflow.local/assets/index-B7c2e4.css',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans',
    'https://fonts.gstatic.com/s/plusjakartasans/v8/font.woff2',
  ];
  for (const url of allowedStaticUrls) {
    assert.equal(
      shouldInterceptRequest({
        method: 'GET',
        url,
        currentOrigin: 'https://vidyutflow.local',
      }),
      true,
      `Static application-shell asset ${url} must be interceptable for offline availability`
    );
  }
  console.log('   ✓ Strict cache exclusions and static app-shell allowlist verified.');

  // ==========================================================================
  // 4. SAFE UPDATE HANDLING, FORM PROTECTION & CORRUPTED CACHE RECOVERY
  // ==========================================================================
  console.log('4. Verifying versioned cache cleanup, form-safe updates, and corrupted cache recovery...');

  // 4a. Outdated cache cleanup preserves current cache and unrelated caches
  const existingCaches = [
    'vidyutflow-app-shell-v1.0.0',
    'vidyutflow-app-shell-v2.1.0',
    PWA_APP_SHELL_CACHE_NAME,
    'other-third-party-cache',
  ];
  const outdated = getOutdatedCacheNames(
    existingCaches,
    PWA_APP_SHELL_CACHE_NAME,
    PWA_APP_SHELL_CACHE_PREFIX
  );
  assert.deepEqual(outdated, ['vidyutflow-app-shell-v1.0.0', 'vidyutflow-app-shell-v2.1.0']);

  // 4b. Form/inspection entry detection prevents forced reload or mid-entry disruption
  const mockDocWithOpenModal = {
    querySelector: (sel: string) => (sel.includes('[role="dialog"]') ? { id: 'inspection-modal' } : null),
    activeElement: null,
  } as unknown as Document;
  assert.equal(
    isUserEnteringFormOrInspectionData(mockDocWithOpenModal),
    true,
    'Open inspection dialog must be detected as active form entry'
  );

  const mockDocWithFocusedInput = {
    querySelector: () => null,
    activeElement: { tagName: 'INPUT', getAttribute: () => null },
  } as unknown as Document;
  assert.equal(
    isUserEnteringFormOrInspectionData(mockDocWithFocusedInput),
    true,
    'Focused input element must be detected as active form entry'
  );

  const mockIdleDoc = {
    querySelector: () => null,
    activeElement: { tagName: 'BODY', getAttribute: () => null },
  } as unknown as Document;
  assert.equal(
    isUserEnteringFormOrInspectionData(mockIdleDoc),
    false,
    'Idle document body must not block safe update activation'
  );

  // Verify neither sw.js nor pwaServiceWorker.ts calls window.location.reload()
  const swSource = fs.readFileSync(swPath, 'utf-8');
  const helperSource = fs.readFileSync(
    path.resolve(rootDir, 'src/utils/pwaServiceWorker.ts'),
    'utf-8'
  );
  assert.ok(
    !swSource.includes('location.reload') && !helperSource.includes('location.reload('),
    'Service worker and helper must never force window.location.reload() while an engineer may be entering data'
  );

  // 4c. Corrupted cache entry recovery evicts bad entries safely
  const mockCacheMap = new Map<string, any>();
  mockCacheMap.set('https://vidyutflow.local/assets/corrupted.js', {
    url: 'https://vidyutflow.local/assets/corrupted.js',
    status: 500,
    headers: { 'content-type': 'application/javascript' },
  });
  mockCacheMap.set('https://vidyutflow.local/assets/valid.js', {
    url: 'https://vidyutflow.local/assets/valid.js',
    status: 200,
    headers: { 'content-type': 'application/javascript' },
  });

  const mockCache = {
    async match(req: string) {
      return mockCacheMap.get(req) ?? null;
    },
    async delete(req: string) {
      return mockCacheMap.delete(req);
    },
  };

  const corruptedCheck = await validateOrEvictCachedResponse({
    cache: mockCache,
    requestUrl: 'https://vidyutflow.local/assets/corrupted.js',
  });
  assert.equal(corruptedCheck.usable, false);
  assert.equal(corruptedCheck.evicted, true, 'Corrupted/non-200 cache entry must be evicted');
  assert.equal(mockCacheMap.has('https://vidyutflow.local/assets/corrupted.js'), false);

  const validCheck = await validateOrEvictCachedResponse({
    cache: mockCache,
    requestUrl: 'https://vidyutflow.local/assets/valid.js',
  });
  assert.equal(validCheck.usable, true);
  assert.equal(validCheck.evicted, false);
  console.log('   ✓ Versioned cache cleanup, form-entry protection, and corrupted cache eviction verified.');

  // ==========================================================================
  // 5. PRESERVATION OF EXISTING FIELD ENGINEER OFFLINE QUEUE & NO DUPLICATE SW
  // ==========================================================================
  console.log('5. Verifying zero conflicting background sync and preservation of Field Engineer offline queue...');

  // Verify only one service worker exists in the repository
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');
  assert.ok(
    !fs.existsSync(path.resolve(rootDir, 'public/service-worker.js')) &&
      !fs.existsSync(path.resolve(rootDir, 'src/sw.ts')) &&
      !fs.existsSync(path.resolve(rootDir, 'src/service-worker.ts')),
    'Must not create duplicate service worker files'
  );

  // Verify public/sw.js does NOT register background sync or intercept POST mutations
  assert.ok(
    !swSource.includes("addEventListener('sync'") &&
      !swSource.includes('backgroundSync'),
    'public/sw.js must not create a conflicting background sync system'
  );
  assert.ok(
    swSource.includes(PWA_APP_SHELL_CACHE_VERSION),
    'public/sw.js must use the canonical versioned cache identifier'
  );
  for (const coreUrl of PWA_CORE_PRECACHE_URLS) {
    assert.ok(
      swSource.includes(coreUrl),
      `public/sw.js must include core application-shell asset ${coreUrl}`
    );
  }

  // Verify Field Engineer offline queue still captures, persists, and replays alongside cache recovery
  const storage = new MemoryStorage();
  const { item } = enqueueFieldInspectionAction(
    {
      woId: 'WO-4402',
      canonicalWorkOrders: INITIAL_WORK_ORDERS,
      inspectionReport: {
        meterSerialScanned: 'UGVCL-SM-2026-998877',
        readingKwh: 1420,
        sealIntact: true,
        terminalCondition: 'Normal',
        tamperDetected: false,
        testedPhaseVoltage: { r: 238, y: 239, b: 237 },
        technicianRemarks: 'Verified while app shell served offline.',
        photoUploaded: true,
      },
      submittedBy: 'Vikramaditya Solanki (JE Field)',
    },
    storage
  );

  // Evicting a corrupted cache entry must NEVER affect the Field Engineer offline queue in storage
  await validateOrEvictCachedResponse({
    cache: mockCache,
    requestUrl: 'https://vidyutflow.local/assets/missing.js',
  });

  const persistedQueue = loadFieldOfflineQueue(storage);
  assert.equal(persistedQueue.length, 1);
  assert.equal(persistedQueue[0].client_uuid, item.client_uuid);
  assert.equal(persistedQueue[0].status, 'PENDING');

  const workOrdersState = structuredClone(INITIAL_WORK_ORDERS);
  const processedUuids = new Set<string>();
  const replaySummary = replayFieldOfflineQueue({
    isOnline: true,
    dataMode: 'DEMO',
    processedUuids,
    storage,
    getWorkOrder: (woId) => workOrdersState.find((w) => w.id === woId),
    executeWorkflowUpdate: (queuedItem) => {
      const idx = workOrdersState.findIndex((w) => w.id === queuedItem.targetRecordId);
      if (idx === -1) return { success: false, error: 'Missing WO' };
      workOrdersState[idx] = {
        ...workOrdersState[idx],
        status: queuedItem.payload.targetStatus,
        inspectionReport: queuedItem.payload.inspectionReport,
      };
      return { success: true };
    },
  });

  assert.equal(replaySummary.syncedCount, 1);
  assert.equal(replaySummary.failedCount, 0);
  assert.equal(
    workOrdersState.find((w) => w.id === 'WO-4402')?.status,
    'Completed',
    'Field Engineer offline queue DEMO replay must remain 100% functional'
  );

  console.log('   ✓ Field Engineer offline queue preservation and single service worker verified.');
  console.log('\nALL PHASE 2, STEP 2 PWA & OFFLINE APPLICATION SHELL TESTS PASSED! ✅');
}

runPwaOfflineShellTests().catch((err) => {
  console.error('PWA Offline Shell Test Suite failed:', err);
  process.exit(1);
});
