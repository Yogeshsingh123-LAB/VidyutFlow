/**
 * Service Worker registration helper for VidyutFlow offline app-shell support.
 * Registers `/sw.js` in browser contexts that expose `navigator.serviceWorker`
 * without throwing in non-secure dev or Node/tsx test environments.
 */

export type ServiceWorkerRegistrationState = 'idle' | 'registered' | 'unsupported' | 'failed';

let registrationState: ServiceWorkerRegistrationState = 'idle';

export function getServiceWorkerState(): ServiceWorkerRegistrationState {
  return registrationState;
}

export async function registerFieldServiceWorker(
  nav: { serviceWorker?: { register: (scriptURL: string, options?: { scope?: string }) => Promise<unknown> } } | undefined =
    typeof navigator !== 'undefined' ? (navigator as unknown as { serviceWorker?: { register: (s: string, o?: { scope?: string }) => Promise<unknown> } }) : undefined
): Promise<boolean> {
  if (!nav || !nav.serviceWorker || typeof nav.serviceWorker.register !== 'function') {
    registrationState = 'unsupported';
    return false;
  }
  try {
    await nav.serviceWorker.register('/sw.js', { scope: '/' });
    registrationState = 'registered';
    return true;
  } catch {
    registrationState = 'failed';
    return false;
  }
}

export function setupFieldServiceWorker(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    registrationState = 'unsupported';
    return;
  }
  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    void registerFieldServiceWorker();
    return;
  }
  window.addEventListener(
    'load',
    () => {
      void registerFieldServiceWorker();
    },
    { once: true }
  );
}
