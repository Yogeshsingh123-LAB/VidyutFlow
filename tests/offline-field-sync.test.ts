import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  OFFLINE_FIELD_QUEUE_KEY,
  clearOfflineFieldQueue,
  dismissFieldQueueConflict,
  enqueueFieldInspection,
  flushOfflineFieldQueue,
  getVisibleFieldQueue,
  loadFieldQueue,
  requeueSameUuidForIdempotencyCheck,
  resolveConflictWithUpdatedOutcome,
  setManualOfflineOverride,
} from '../src/utils/offlineFieldSync';
import {
  getServiceWorkerState,
  registerFieldServiceWorker,
} from '../src/utils/serviceWorkerRegistration';

const frontendDir = process.cwd();

// Minimal localStorage polyfill for Node/tsx execution
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

const hadLocalStorage = typeof globalThis.localStorage !== 'undefined';
if (!hadLocalStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

async function run() {
  // 1. Service Worker registration & sw.js invariants
  const mainSrc = fs.readFileSync(path.join(frontendDir, 'src/main.tsx'), 'utf8');
  assert.ok(mainSrc.includes('setupFieldServiceWorker()'), 'main.tsx must register /sw.js via setupFieldServiceWorker()');

  const swSrc = fs.readFileSync(path.join(frontendDir, 'public/sw.js'), 'utf8');
  assert.ok(swSrc.includes("caches.delete('vidyutos-v1')"), 'sw.js must preserve vidyutos-v1 cache cleanup');
  assert.ok(swSrc.includes("e.request.url.includes('/api/')"), 'sw.js must bypass /api/ requests');
  assert.ok(swSrc.includes("e.request.mode === 'navigate'"), 'sw.js must fall back to app shell on offline navigation');

  let registeredUrl = '';
  const okReg = await registerFieldServiceWorker({
    serviceWorker: {
      register: async (scriptURL: string) => {
        registeredUrl = scriptURL;
        return {};
      },
    },
  });
  assert.equal(okReg, true);
  assert.equal(registeredUrl, '/sw.js');
  assert.equal(getServiceWorkerState(), 'registered');

  assert.equal(await registerFieldServiceWorker(undefined), false);
  assert.equal(getServiceWorkerState(), 'unsupported');

  // 2. Persistent queue, actor isolation, offline skip, chronological replay, UUID dedup, and 409 conflict UI
  clearOfflineFieldQueue();

  const item1 = enqueueFieldInspection({
    target_kind: 'backend_request',
    request_id: 'req-alpha-001',
    title: 'Patel Kirana Store (North · 12 kW)',
    task_status: 'FIELD_VERIFIED',
    notes: 'Feasibility verified offline',
    meter_serial: 'MTR-ALPHA-1',
    created_offline_at: '2026-10-30T09:00:00.000Z',
    actor_email: 'field@vidyutflow.demo',
  });
  const item2 = enqueueFieldInspection({
    target_kind: 'backend_request',
    request_id: 'req-beta-002',
    title: 'Shakti Textiles Unit 2 (North · 45 kW)',
    task_status: 'COMPLETED',
    notes: 'Installed smart meter while offline',
    meter_serial: 'MTR-BETA-2',
    created_offline_at: '2026-10-30T09:05:00.000Z',
    actor_email: 'field@vidyutflow.demo',
  });
  enqueueFieldInspection({
    target_kind: 'backend_request',
    request_id: 'req-other-999',
    title: 'Other Engineer Task',
    task_status: 'COMPLETED',
    notes: 'Different engineer',
    meter_serial: 'MTR-OTHER-9',
    created_offline_at: '2026-10-30T09:06:00.000Z',
    actor_email: 'other.engineer@vidyutflow.demo',
  });

  // Verify JSON persisted under canonical key & actor scoping hides other engineer's items
  const rawStored = localStorage.getItem(OFFLINE_FIELD_QUEUE_KEY);
  assert.ok(rawStored && JSON.parse(rawStored).length === 3, 'Queue must persist in localStorage');
  assert.equal(getVisibleFieldQueue('field@vidyutflow.demo').length, 2, 'Actor scoping must isolate engineers');

  // While offline, flush skips network calls
  setManualOfflineOverride(true);
  let networkCalls = 0;
  const skipped = await flushOfflineFieldQueue({
    actorEmail: 'field@vidyutflow.demo',
    hasSessionFn: () => true,
    syncFn: async () => {
      networkCalls += 1;
      return { duplicate: false, synced: true, field_update_id: 'fu-1' };
    },
  });
  assert.equal(skipped.skippedOffline, true);
  assert.equal(networkCalls, 0);
  assert.equal(skipped.remainingPending, 2);

  // Reconnect online: item1 succeeds, item2 hits HTTP 409 conflict (e.g. officer already rejected request)
  setManualOfflineOverride(false);
  const replayedOrder: string[] = [];
  const flushed = await flushOfflineFieldQueue({
    actorEmail: 'field@vidyutflow.demo',
    hasSessionFn: () => true,
    syncFn: async payload => {
      replayedOrder.push(payload.request_id);
      if (payload.request_id === 'req-alpha-001') {
        return {
          duplicate: false,
          synced: true,
          field_update_id: 'fu-alpha',
          request_status: 'FIELD_VERIFIED',
        };
      }
      const conflictErr = new Error('Illegal status transition: REJECTED -> COMPLETED') as Error & {
        status?: number;
      };
      conflictErr.status = 409;
      throw conflictErr;
    },
  });

  assert.deepEqual(replayedOrder, ['req-alpha-001', 'req-beta-002'], 'Queue must replay oldest-first');
  assert.equal(flushed.syncedCount, 1);
  assert.equal(flushed.conflictCount, 1);
  assert.equal(flushed.remainingPending, 0);

  // Other engineer's item was NEVER touched
  const otherQueue = getVisibleFieldQueue('other.engineer@vidyutflow.demo');
  assert.equal(otherQueue.length, 1);
  assert.equal(otherQueue[0].sync_state, 'PENDING');

  // Verify UUID de-duplication path when re-sending same client_uuid
  const requeuedSame = requeueSameUuidForIdempotencyCheck(item1.client_uuid);
  assert.ok(requeuedSame && requeuedSame.client_uuid === item1.client_uuid);
  const dedupSummary = await flushOfflineFieldQueue({
    actorEmail: 'field@vidyutflow.demo',
    hasSessionFn: () => true,
    syncFn: async payload => {
      assert.equal(payload.client_uuid, item1.client_uuid);
      return {
        duplicate: true,
        synced: false,
        field_update_id: 'fu-alpha',
        message: 'Already synced — duplicate ignored',
      };
    },
  });
  assert.equal(dedupSummary.duplicateCount, 1);
  assert.equal(
    loadFieldQueue().find(i => i.client_uuid === item1.client_uuid)?.sync_state,
    'DUPLICATE'
  );

  // Verify conflict state does NOT re-attempt automatically and supports resolution / dismissal
  const conflicted = loadFieldQueue().find(i => i.client_uuid === item2.client_uuid)!;
  assert.equal(conflicted.sync_state, 'CONFLICT');
  assert.equal(conflicted.conflict_code, 409);
  assert.ok(conflicted.conflict_reason?.includes('REJECTED -> COMPLETED'));

  const resolvedRetry = resolveConflictWithUpdatedOutcome(
    item2.client_uuid,
    'FIELD_VERIFIED',
    'Updated after supervisor check'
  );
  assert.ok(resolvedRetry && resolvedRetry.client_uuid !== item2.client_uuid);
  assert.equal(resolvedRetry.sync_state, 'PENDING');
  assert.equal(resolvedRetry.task_status, 'FIELD_VERIFIED');

  dismissFieldQueueConflict(resolvedRetry.client_uuid);
  assert.equal(
    loadFieldQueue().some(i => i.client_uuid === resolvedRetry.client_uuid),
    false
  );

  // 3. Verify FieldPortal.tsx and AppContext.tsx wiring
  const fieldPortalSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/field/FieldPortal.tsx'),
    'utf8'
  );
  assert.ok(fieldPortalSrc.includes('useLivePoll(fetchLiveRequests)'), 'FieldPortal must poll assigned FastAPI requests');
  assert.ok(fieldPortalSrc.includes("window.addEventListener('online'"), 'FieldPortal must auto-sync on browser online event');
  assert.ok(fieldPortalSrc.includes('role="alert"'), 'FieldPortal must surface an accessible conflict alert banner');

  const appContextSrc = fs.readFileSync(
    path.join(frontendDir, 'src/context/AppContext.tsx'),
    'utf8'
  );
  assert.ok(appContextSrc.includes('clearOfflineFieldQueue()'), 'resetDemoData must clear persistent offline queue');

  clearOfflineFieldQueue();
  console.log('Offline Field Portal service worker, persistent UUID queue, auto-sync, and conflict checks passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
