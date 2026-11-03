import { FIELD_OFFLINE_QUEUE_STORAGE_KEY } from './fieldOfflineQueue';

export const PWA_APP_SHELL_CACHE_VERSION = 'v2.2.0';
export const PWA_APP_SHELL_CACHE_PREFIX = 'vidyutflow-app-shell-';
export const PWA_APP_SHELL_CACHE_NAME = `${PWA_APP_SHELL_CACHE_PREFIX}${PWA_APP_SHELL_CACHE_VERSION}`;
export const PWA_SERVICE_WORKER_URL = '/sw.js';
export const PWA_MANIFEST_URL = '/manifest.webmanifest';

/**
 * Core application-shell assets pre-cached when the service worker installs.
 * Note: First-time offline access requires prior successful online loading and caching
 * of the VidyutFlow application shell.
 */
export const PWA_CORE_PRECACHE_URLS: readonly string[] = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/ugvcl-logo.png',
  '/assets/ugvcl-logo.svg',
];

/**
 * Sensitive or dynamic path prefixes that must NEVER be intercepted or cached
 * by the application-shell service worker.
 */
export const PWA_EXCLUDED_PATH_PREFIXES: readonly string[] = [
  '/api/',
  '/api/auth',
  '/api/ai-chat',
  '/api/health',
  '/auth/',
  '/oauth/',
];

/**
 * Allowed external static font origins for offline typography resilience.
 */
export const PWA_ALLOWED_EXTERNAL_FONT_ORIGINS: readonly string[] = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

export interface RequestCheckInput {
  method: string;
  url: string;
  currentOrigin?: string;
  mode?: string;
  destination?: string;
  headers?: Record<string, string | undefined>;
}

export interface ResponseCheckInput {
  url: string;
  status: number;
  type?: string;
  headers?: Record<string, string | undefined>;
}

export interface ServiceWorkerEnvironmentCheckInput {
  hasWindow?: boolean;
  hasServiceWorkerSupport?: boolean;
  protocol?: string;
  hostname?: string;
  isSecureContext?: boolean;
  isIframe?: boolean;
}

export interface ServiceWorkerEnvironmentCheckResult {
  canRegister: boolean;
  reason: string;
  isPreviewIframe: boolean;
  requiresPriorOnlineLoadForOfflineAccess: true;
  offlineActionQueueStorageKey: string;
}

export interface InstallabilityAssessment {
  isStandaloneCapableShell: boolean;
  claimsFullPromptInstallability: false;
  reasons: string[];
}

export interface PwaRegistrationStatus {
  attempted: boolean;
  registered: boolean;
  scriptUrl: string;
  cacheVersion: string;
  updateAvailable: boolean;
  deferredUpdateWaiting: boolean;
  reason: string;
  error?: string;
}

let currentPwaRegistrationStatus: PwaRegistrationStatus = {
  attempted: false,
  registered: false,
  scriptUrl: PWA_SERVICE_WORKER_URL,
  cacheVersion: PWA_APP_SHELL_CACHE_VERSION,
  updateAvailable: false,
  deferredUpdateWaiting: false,
  reason: 'Not yet initialized',
};

let waitingServiceWorkerRef: ServiceWorker | null = null;

function getNormalizedHeader(
  headers: Record<string, string | undefined> | undefined,
  headerName: string
): string {
  if (!headers) return '';
  const target = headerName.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target && typeof v === 'string') {
      return v.toLowerCase();
    }
  }
  return '';
}

/**
 * Determines whether the service worker is allowed to intercept a network request.
 *
 * Strict security and data-integrity rules:
 * 1. Never intercept non-GET requests (POST, PUT, PATCH, DELETE, etc.).
 * 2. Never intercept authentication endpoints (/api/auth/*), API routes (/api/*),
 *    AI assistant responses (/api/ai-chat), or live ERP endpoints.
 * 3. Never intercept requests containing Authorization headers or Cache-Control: no-store.
 * 4. Only intercept same-origin static application-shell resources and static Google Fonts.
 */
export function shouldInterceptRequest(input: RequestCheckInput): boolean {
  const method = (input.method || '').toUpperCase().trim();
  if (method !== 'GET') {
    return false;
  }

  if (!input.url || typeof input.url !== 'string') {
    return false;
  }

  const origin = input.currentOrigin || 'https://vidyutflow.local';
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input.url, origin);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false;
  }

  const authHeader = getNormalizedHeader(input.headers, 'authorization');
  if (authHeader.length > 0) {
    return false;
  }

  const cacheControl = getNormalizedHeader(input.headers, 'cache-control');
  if (cacheControl.includes('no-store')) {
    return false;
  }

  const pathname = parsedUrl.pathname || '/';

  // Never intercept service worker script itself or Vite HMR endpoints
  if (
    pathname === '/sw.js' ||
    pathname.startsWith('/@vite') ||
    pathname.startsWith('/@fs') ||
    pathname.startsWith('/@id') ||
    pathname.startsWith('/__vite')
  ) {
    return false;
  }

  // Never intercept API, Auth, OAuth, or AI endpoints
  for (const prefix of PWA_EXCLUDED_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      return false;
    }
  }

  // Cross-origin check: only allow static Google Fonts origins
  if (parsedUrl.origin !== origin) {
    return PWA_ALLOWED_EXTERNAL_FONT_ORIGINS.includes(parsedUrl.origin);
  }

  // Allow HTML navigation requests for the SPA shell
  if (input.mode === 'navigate' || input.destination === 'document') {
    return true;
  }

  // Allow root shell and static asset paths/extensions
  if (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/assets/') ||
    /\.(?:js|mjs|css|html|webmanifest|json|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|otf)$/i.test(
      pathname
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Determines whether a response from the network may be written to the app-shell cache.
 * Never caches non-200 responses, API/Auth responses, private/no-store responses, or Set-Cookie responses.
 */
export function shouldCacheResponse(input: ResponseCheckInput): boolean {
  if (!input || input.status !== 200) {
    return false;
  }

  if (input.type && input.type !== 'basic' && input.type !== 'cors' && input.type !== 'default') {
    return false;
  }

  if (
    !shouldInterceptRequest({
      method: 'GET',
      url: input.url,
    })
  ) {
    return false;
  }

  const cacheControl = getNormalizedHeader(input.headers, 'cache-control');
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  const setCookie = getNormalizedHeader(input.headers, 'set-cookie');
  if (setCookie.length > 0) {
    return false;
  }

  const contentType = getNormalizedHeader(input.headers, 'content-type');
  // Never cache JSON responses from non-manifest routes (guards against accidental API/record caching)
  if (
    contentType.includes('application/json') &&
    !input.url.endsWith('/manifest.webmanifest')
  ) {
    return false;
  }

  return true;
}

/**
 * Returns outdated VidyutFlow app-shell cache names that should be deleted during activation.
 * Leaves non-VidyutFlow caches and the active versioned cache untouched.
 */
export function getOutdatedCacheNames(
  existingCacheNames: readonly string[],
  activeCacheName: string = PWA_APP_SHELL_CACHE_NAME,
  cachePrefix: string = PWA_APP_SHELL_CACHE_PREFIX
): string[] {
  return existingCacheNames.filter(
    (name) => name.startsWith(cachePrefix) && name !== activeCacheName
  );
}

/**
 * Checks whether a Field Engineer or portal user is actively entering form or inspection data.
 * Used to prevent disruptive automatic page reloads when a new service worker version becomes available.
 */
export function isUserEnteringFormOrInspectionData(doc?: Document | null): boolean {
  const targetDoc =
    doc !== undefined ? doc : typeof document !== 'undefined' ? document : null;
  if (!targetDoc) return false;

  try {
    // 1. Check if any modal dialog (such as the Field Inspection Modal) is currently open
    const openDialog = targetDoc.querySelector('[role="dialog"], [data-inspection-modal="open"]');
    if (openDialog) {
      return true;
    }

    // 2. Check if the currently focused element is an interactive form control
    const activeEl = targetDoc.activeElement;
    if (activeEl) {
      const tag = activeEl.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
      }
      if (activeEl.getAttribute?.('contenteditable') === 'true') {
        return true;
      }
    }
  } catch {
    // Ignore DOM access errors in headless/non-browser environments
  }

  return false;
}

/**
 * Evaluates whether the current runtime environment supports safe Service Worker registration.
 * Ensures Node.js tests, insecure origins, and unsupported browsers never crash.
 */
export function canRegisterServiceWorker(
  envInput?: ServiceWorkerEnvironmentCheckInput
): ServiceWorkerEnvironmentCheckResult {
  const hasWindow =
    envInput?.hasWindow !== undefined
      ? envInput.hasWindow
      : typeof window !== 'undefined';

  const hasServiceWorkerSupport =
    envInput?.hasServiceWorkerSupport !== undefined
      ? envInput.hasServiceWorkerSupport
      : typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  const protocol =
    envInput?.protocol !== undefined
      ? envInput.protocol
      : hasWindow && typeof window.location !== 'undefined'
        ? window.location.protocol
        : '';

  const hostname =
    envInput?.hostname !== undefined
      ? envInput.hostname
      : hasWindow && typeof window.location !== 'undefined'
        ? window.location.hostname
        : '';

  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';

  const isSecureContext =
    envInput?.isSecureContext !== undefined
      ? envInput.isSecureContext
      : hasWindow && typeof window.isSecureContext === 'boolean'
        ? window.isSecureContext
        : protocol === 'https:' || isLocalhost;

  let isIframe = false;
  if (envInput?.isIframe !== undefined) {
    isIframe = envInput.isIframe;
  } else if (hasWindow) {
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }
  }

  if (!hasWindow) {
    return {
      canRegister: false,
      reason: 'Non-browser environment (window is unavailable).',
      isPreviewIframe: false,
      requiresPriorOnlineLoadForOfflineAccess: true,
      offlineActionQueueStorageKey: FIELD_OFFLINE_QUEUE_STORAGE_KEY,
    };
  }

  if (!hasServiceWorkerSupport) {
    return {
      canRegister: false,
      reason: 'Browser does not support the Service Worker API.',
      isPreviewIframe: isIframe,
      requiresPriorOnlineLoadForOfflineAccess: true,
      offlineActionQueueStorageKey: FIELD_OFFLINE_QUEUE_STORAGE_KEY,
    };
  }

  if (protocol !== 'https:' && protocol !== 'http:') {
    return {
      canRegister: false,
      reason: `Unsupported protocol "${protocol}" for Service Worker registration.`,
      isPreviewIframe: isIframe,
      requiresPriorOnlineLoadForOfflineAccess: true,
      offlineActionQueueStorageKey: FIELD_OFFLINE_QUEUE_STORAGE_KEY,
    };
  }

  if (!isSecureContext && !isLocalhost) {
    return {
      canRegister: false,
      reason: 'Service Worker requires HTTPS or localhost secure context.',
      isPreviewIframe: isIframe,
      requiresPriorOnlineLoadForOfflineAccess: true,
      offlineActionQueueStorageKey: FIELD_OFFLINE_QUEUE_STORAGE_KEY,
    };
  }

  return {
    canRegister: true,
    reason: isIframe
      ? 'Supported browser context inside preview iframe (registration permitted if third-party storage is allowed by browser).'
      : 'Supported top-level secure browser context.',
    isPreviewIframe: isIframe,
    requiresPriorOnlineLoadForOfflineAccess: true,
    offlineActionQueueStorageKey: FIELD_OFFLINE_QUEUE_STORAGE_KEY,
  };
}

/**
 * Evaluates manifest and browser conditions honestly without claiming standalone
 * installability when required dedicated icon sizes or top-level browser prompts are absent.
 */
export function evaluateInstallabilityCapability(
  manifest: {
    name?: string;
    short_name?: string;
    start_url?: string;
    display?: string;
    icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
  },
  envInput?: ServiceWorkerEnvironmentCheckInput
): InstallabilityAssessment {
  const envCheck = canRegisterServiceWorker(envInput);
  const reasons: string[] = [];

  const hasValidShellFields = Boolean(
    manifest &&
      manifest.name &&
      manifest.short_name &&
      manifest.start_url === '/' &&
      manifest.display === 'standalone' &&
      Array.isArray(manifest.icons) &&
      manifest.icons.length > 0
  );

  if (!hasValidShellFields) {
    reasons.push('Manifest is missing required standalone application shell fields.');
  }

  const hasDedicated192 = Boolean(
    manifest.icons?.some((icon) => icon.sizes?.split(/\s+/).includes('192x192'))
  );
  const hasDedicated512 = Boolean(
    manifest.icons?.some((icon) => icon.sizes?.split(/\s+/).includes('512x512'))
  );

  if (!hasDedicated192 || !hasDedicated512) {
    reasons.push(
      'Reuses official 1000x1000 UGVCL logo asset without altering it; does not claim dedicated 192x192 and 512x512 install prompt icons.'
    );
  }

  if (envCheck.isPreviewIframe) {
    reasons.push(
      'Running inside an embedded preview iframe where browser install prompts are suppressed.'
    );
  }

  if (!envCheck.canRegister) {
    reasons.push(envCheck.reason);
  }

  return {
    isStandaloneCapableShell: hasValidShellFields,
    claimsFullPromptInstallability: false,
    reasons,
  };
}

export interface CacheLike {
  match(request: string): Promise<ResponseCheckInput | null | undefined>;
  delete(request: string): Promise<boolean>;
}

/**
 * Safely validates a cached entry and evicts it if missing or corrupted,
 * returning whether the cached entry is usable. Never touches localStorage
 * or the Field Engineer offline queue (`vidyutflow_field_offline_queue`).
 */
export async function validateOrEvictCachedResponse(params: {
  cache: CacheLike;
  requestUrl: string;
}): Promise<{ usable: boolean; evicted: boolean; response?: ResponseCheckInput }> {
  try {
    const cached = await params.cache.match(params.requestUrl);
    if (!cached) {
      return { usable: false, evicted: false };
    }

    if (!shouldCacheResponse(cached)) {
      await params.cache.delete(params.requestUrl);
      return { usable: false, evicted: true };
    }

    return { usable: true, evicted: false, response: cached };
  } catch {
    try {
      await params.cache.delete(params.requestUrl);
    } catch {
      // Ignore cache eviction error
    }
    return { usable: false, evicted: true };
  }
}

/**
 * Returns a snapshot of the current PWA service worker registration status.
 */
export function getPwaRegistrationStatus(): PwaRegistrationStatus {
  return { ...currentPwaRegistrationStatus };
}

/**
 * Requests a waiting service worker to activate only when safe (i.e., when the user
 * is not actively entering inspection or form data). Never forces an automatic browser page reload.
 */
export function applyPendingServiceWorkerUpdateIfSafe(doc?: Document | null): {
  applied: boolean;
  deferredBecauseFormActive: boolean;
} {
  if (!waitingServiceWorkerRef) {
    return { applied: false, deferredBecauseFormActive: false };
  }

  if (isUserEnteringFormOrInspectionData(doc)) {
    currentPwaRegistrationStatus = {
      ...currentPwaRegistrationStatus,
      updateAvailable: true,
      deferredUpdateWaiting: true,
      reason:
        'Service worker update deferred because user is actively entering form or inspection data.',
    };
    return { applied: false, deferredBecauseFormActive: true };
  }

  try {
    waitingServiceWorkerRef.postMessage({ type: 'SKIP_WAITING' });
    waitingServiceWorkerRef = null;
    currentPwaRegistrationStatus = {
      ...currentPwaRegistrationStatus,
      updateAvailable: false,
      deferredUpdateWaiting: false,
      reason: 'Service worker update activated cleanly without forcing page reload.',
    };
    return { applied: true, deferredBecauseFormActive: false };
  } catch {
    return { applied: false, deferredBecauseFormActive: false };
  }
}

/**
 * Safely registers the VidyutFlow application-shell service worker in supported browser contexts.
 * - Never blocks initial application rendering.
 * - Never throws in unsupported browsers, Node.js test runners, or restricted preview iframes.
 * - Never forces a browser reload while an engineer is entering inspection data.
 */
export async function registerVidyutFlowServiceWorker(): Promise<PwaRegistrationStatus> {
  const envCheck = canRegisterServiceWorker();
  if (!envCheck.canRegister) {
    currentPwaRegistrationStatus = {
      attempted: false,
      registered: false,
      scriptUrl: PWA_SERVICE_WORKER_URL,
      cacheVersion: PWA_APP_SHELL_CACHE_VERSION,
      updateAvailable: false,
      deferredUpdateWaiting: false,
      reason: envCheck.reason,
    };
    return getPwaRegistrationStatus();
  }

  currentPwaRegistrationStatus = {
    ...currentPwaRegistrationStatus,
    attempted: true,
    reason: 'Registering service worker...',
  };

  try {
    const registration = await navigator.serviceWorker.register(PWA_SERVICE_WORKER_URL, {
      scope: '/',
      updateViaCache: 'none',
    });

    if (registration.waiting) {
      waitingServiceWorkerRef = registration.waiting;
      currentPwaRegistrationStatus = {
        attempted: true,
        registered: true,
        scriptUrl: PWA_SERVICE_WORKER_URL,
        cacheVersion: PWA_APP_SHELL_CACHE_VERSION,
        updateAvailable: true,
        deferredUpdateWaiting: isUserEnteringFormOrInspectionData(),
        reason:
          'Service worker registered; new version waiting for safe activation without forced reload.',
      };
    } else {
      currentPwaRegistrationStatus = {
        attempted: true,
        registered: true,
        scriptUrl: PWA_SERVICE_WORKER_URL,
        cacheVersion: PWA_APP_SHELL_CACHE_VERSION,
        updateAvailable: false,
        deferredUpdateWaiting: false,
        reason: 'Service worker registered for offline application shell support.',
      };
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (
          installingWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          waitingServiceWorkerRef = installingWorker;
          const formActive = isUserEnteringFormOrInspectionData();
          currentPwaRegistrationStatus = {
            ...currentPwaRegistrationStatus,
            updateAvailable: true,
            deferredUpdateWaiting: formActive,
            reason: formActive
              ? 'New application shell version staged; activation deferred while inspection/form entry is active.'
              : 'New application shell version staged for next navigation without forced reload.',
          };
        }
      });
    });

    return getPwaRegistrationStatus();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    currentPwaRegistrationStatus = {
      attempted: true,
      registered: false,
      scriptUrl: PWA_SERVICE_WORKER_URL,
      cacheVersion: PWA_APP_SHELL_CACHE_VERSION,
      updateAvailable: false,
      deferredUpdateWaiting: false,
      reason:
        'Service worker registration skipped due to browser/iframe security restriction; localStorage offline queue remains active.',
      error: errorMessage,
    };
    return getPwaRegistrationStatus();
  }
}
