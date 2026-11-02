import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ServerAuthService, AuthSecurityError } from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { createProductionRequestHandler } from '../src/server/prodServer';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { INITIAL_CONNECTIONS, INITIAL_BILLS, INITIAL_PAYMENTS } from '../src/data/mockData';
import { calculateMeterConsumption, detectConsumptionAnomalies, detectIdentityMismatch, normalizeDisplayedReading, MeterReadingError } from '../src/services/meterReading';
import { validateMeterPhoto } from '../src/services/meterOcr';
import { validateExistingBill } from '../src/services/billingValidation';
import { deleteQueuedMeterPhoto, getQueuedMeterPhoto, hydrateFieldQueueFromIndexedDb, storeQueuedMeterPhoto } from '../src/utils/offlineFieldSync';

function check(name: string, fn: () => void) { fn(); console.log(`✓ ${name}`); }

check('meter displays preserve leading zeroes while producing a numeric value', () => {
  assert.equal(normalizeDisplayedReading('015180'), 15180);
  assert.equal(normalizeDisplayedReading('015180.5', 1), 15180.5);
  assert.throws(() => normalizeDisplayedReading('15.8', 0), MeterReadingError);
});

check('meter photo types and file-size limits are enforced', () => {
  assert.equal(validateMeterPhoto(new File([new Uint8Array([1])], 'meter.jpg', { type: 'image/jpeg' })), null);
  assert.match(validateMeterPhoto(new File(['x'], 'meter.svg', { type: 'image/svg+xml' })) || '', /JPEG, PNG, or WebP/);
  assert.match(validateMeterPhoto(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })) || '', /5 MiB/);
});

check('consumption uses cumulative delta, multiplier and actual interval days', () => {
  assert.deepEqual(calculateMeterConsumption({ current: 15180, previous: 14460, multiplier: 1, previousAt: '2026-09-01', currentAt: '2026-10-31' }), { units: 720, days: 60, event: 'ordinary' });
  assert.equal(calculateMeterConsumption({ current: 110, previous: 100, multiplier: 3, previousAt: '2026-09-01', currentAt: '2026-10-01' }).units, 30);
});

check('decreasing readings require a valid rollover or replacement event', () => {
  assert.throws(() => calculateMeterConsumption({ current: 2, previous: 9998, multiplier: 1, previousAt: '2026-09-01', currentAt: '2026-10-01' }), (error: unknown) => error instanceof MeterReadingError && error.code === 'DECREASING_READING');
  assert.equal(calculateMeterConsumption({ current: 5, previous: 9998, multiplier: 1, rolloverAt: 10000, previousAt: '2026-09-01', currentAt: '2026-10-01' }).units, 7);
  assert.equal(calculateMeterConsumption({ current: 100, previous: 9998, multiplier: 1, replacement: true, previousAt: '2026-09-01', currentAt: '2026-10-01' }).units, 100);
});

check('anomaly detection compares normalized daily use and does not call increases fraud', () => {
  const findings = detectConsumptionAnomalies({ units: 600, days: 30, verifiedHistory: [{ units: 300, days: 60 }, { units: 320, days: 60 }] });
  assert(findings.some(item => item.category === 'HIGH_CONSUMPTION'));
  assert(findings.every(item => !/fraud/i.test(item.evidence)));
});

check('meter identity mismatch is explicit and does not infer unreadable identity', () => {
  assert.equal(detectIdentityMismatch('MTR-2024-884102', ''), null);
  assert.notEqual(detectIdentityMismatch('MTR-2024-884102', 'MTR-2024-111111'), null);
});

const auth = new ServerAuthService({ sessionSecret: 'meter_reading_test_secret_at_least_32_bytes' });
const store = new ServerDataStore(auth);
const consumer = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.consumer, targetRole: 'consumer' });
const employee = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
const admin = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.admin, targetRole: 'admin' });
const base = {
  clientUuid: 'meter-client-uuid-0001', consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
  meterNo: INITIAL_CONNECTIONS[0].meterNo, displayedReading: '15180', readingKwh: 15180,
  multiplier: 1, readingAt: '2026-10-31T12:00:00.000Z'
};

check('consumer reading creates an append-only pending review using the known connection snapshot', () => {
  const record = store.submitMeterReading(consumer.session.signedToken, base);
  assert.equal(record.status, 'PENDING_REVIEW');
  assert.equal(record.previousReadingKwh, INITIAL_CONNECTIONS[0].currentReadingKwh);
  assert.equal(record.consumedUnits, 360);
  assert.equal(record.intervalDays, 30);
  assert.equal(store.getConnectionByNumber(consumer.session.signedToken, base.consumerNo).currentReadingKwh, INITIAL_CONNECTIONS[0].currentReadingKwh);
  assert(store.getMeterNotifications(employee.session.signedToken).some(item => item.title === 'Meter reading submitted' && item.consumerNo === base.consumerNo));
  assert.equal(store.getMeterNotifications(consumer.session.signedToken).some(item => item.title === 'Meter reading submitted'), false);
});

check('stable submission ID returns the original record and an identical new submission is blocked', () => {
  const first = store.submitMeterReading(consumer.session.signedToken, base);
  assert.equal(first.id, store.submitMeterReading(consumer.session.signedToken, base).id);
  assert.throws(() => store.submitMeterReading(consumer.session.signedToken, { ...base, clientUuid: 'meter-client-uuid-0002' }), (error: unknown) => error instanceof AuthSecurityError && error.statusCode === 409 && error.code === 'DUPLICATE_READING');
});

check('only authorized staff may approve and flagged readings require an audit note', () => {
  const record = store.submitMeterReading(consumer.session.signedToken, { ...base, clientUuid: 'meter-client-uuid-0003', displayedReading: '15540', readingKwh: 15540, readingAt: '2026-11-01T12:00:00.000Z', ocr: { meterId: '', rawText: '15540', candidateReading: '15540', normalizedReading: 15540, confidence: 20, requiresReview: true, engineVersion: 'test', extractedAt: '2026-11-01T12:00:00.000Z', engine: 'tesseract.js' } });
  assert.throws(() => store.reviewMeterReading(consumer.session.signedToken, record.id, 'APPROVE', ''));
  assert.throws(() => store.reviewMeterReading(employee.session.signedToken, record.id, 'APPROVE', ''), (error: unknown) => error instanceof AuthSecurityError && error.code === 'REVIEW_NOTE_REQUIRED');
  const approved = store.reviewMeterReading(employee.session.signedToken, record.id, 'APPROVE', 'Compared against meter photo and interval history.');
  assert.equal(approved.status, 'APPROVED');
  assert(store.getMeterNotifications(consumer.session.signedToken).some(item => item.title === 'Meter reading approved' && item.consumerNo === base.consumerNo));
});

check('bill validation is read-only and detects duplicate bills and payment mismatches', () => {
  const beforeBills = JSON.stringify(INITIAL_BILLS);
  const beforePayments = JSON.stringify(INITIAL_PAYMENTS);
  const bill = INITIAL_BILLS[0];
  const result = validateExistingBill({ bill, connection: INITIAL_CONNECTIONS[0], allBills: [...INITIAL_BILLS, bill], payments: INITIAL_PAYMENTS });
  assert.equal(result.status, 'REVIEW');
  assert(result.evidence.some(line => line.includes('More than one bill')));
  assert.equal(JSON.stringify(INITIAL_BILLS), beforeBills);
  assert.equal(JSON.stringify(INITIAL_PAYMENTS), beforePayments);
});

check('management metrics expose aggregate counts without consumer identifiers', () => {
  const metrics = store.getMeterMetrics(admin.session.signedToken);
  assert.equal(metrics.totalReadings, 2);
  assert.equal('consumerNo' in metrics, false);
  assert.throws(() => store.getMeterReadings(auth.login({ ...DEFAULT_DEMO_ACCOUNTS.management, targetRole: 'management' }).session.signedToken));
});

check('missing clientUuid, malformed payloads, and employee self-submission are rejected cleanly', () => {
  assert.throws(
    () => store.submitMeterReading(consumer.session.signedToken, { ...base, clientUuid: undefined as unknown as string }),
    (error: unknown) => error instanceof AuthSecurityError && error.statusCode === 400 && error.code === 'INVALID_CLIENT_UUID'
  );
  assert.throws(
    () => store.submitMeterReading(consumer.session.signedToken, { ...base, clientUuid: 'meter-client-uuid-bad-date', readingAt: 'not-a-valid-date' }),
    (error: unknown) => error instanceof AuthSecurityError && error.statusCode === 400 && error.code === 'INVALID_READING_DATE'
  );
  assert.throws(
    () => store.submitMeterReading(consumer.session.signedToken, { ...base, clientUuid: 'meter-client-uuid-bad-disp', displayedReading: undefined as unknown as string }),
    (error: unknown) => error instanceof AuthSecurityError && error.statusCode === 400 && error.code === 'INVALID_READING'
  );
  assert.throws(
    () => store.submitMeterReading(employee.session.signedToken, { ...base, clientUuid: 'meter-client-uuid-emp-01' }),
    (error: unknown) => error instanceof AuthSecurityError && error.statusCode === 403
  );
});

check('production server CSP permits Tesseract WASM, worker, and data/blob fetches', () => {
  const handler = createProductionRequestHandler();
  const headers = new Map<string, string>();
  const req = { url: '/api/health', method: 'GET', headers: {} } as unknown as IncomingMessage;
  const mockRes = {
    statusCode: 200,
    writableEnded: false,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), String(value)); },
    end() { mockRes.writableEnded = true; }
  };
  handler(req, mockRes as unknown as ServerResponse);
  const csp = headers.get('content-security-policy') || '';
  assert.match(csp, /'wasm-unsafe-eval'/);
  assert.match(csp, /worker-src 'self' blob:/);
  assert.match(csp, /connect-src 'self' data: blob: https:\/\/tessdata\.projectnaptha\.com/);
});

check('meter workspace localizes camera controls, stops camera tracks on collapse, and deduplicates photo loads', () => {
  const workspaceSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/MeterReadingWorkspace.tsx'), 'utf8');
  assert.match(workspaceSrc, /capturePhoto:\s*'Capture photo'/);
  assert.match(workspaceSrc, /capturePhoto:\s*'ફોટો કેપ્ચર કરો'/);
  assert.match(workspaceSrc, /capturePhoto:\s*'फोटो कैप्चर करें'/);
  assert.match(workspaceSrc, /capturePhoto:\s*'फोटो टिपा'/);
  assert.match(workspaceSrc, /if \(!open \|\| \(currentRole !== 'consumer' && currentRole !== 'field'\)\)\s*\{\s*closeCamera\(\);/);
  assert.match(workspaceSrc, /requestedPhotoIds\.current\.has\(record\.id\)/);
});

await (async () => {
  const prevIdb = (globalThis as { indexedDB?: unknown }).indexedDB;
  const dbVersions = new Map<string, number>([['vidyutflow_offline_db', 3]]);
  const storesByDb = new Map<string, Map<string, Map<string, unknown>>>([
    ['vidyutflow_offline_db', new Map([
      ['field_sync_queue', new Map()],
      ['meter_reading_photos', new Map()],
      ['field_evidence_photos', new Map()]
    ])]
  ]);

  const fakeIndexedDb = {
    open(name: string, requestedVersion?: number) {
      const currentVersion = dbVersions.get(name) ?? 0;
      const targetVersion = requestedVersion ?? Math.max(currentVersion, 1);
      const req: Record<string, unknown> = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        if (requestedVersion !== undefined && requestedVersion < currentVersion) {
          (req.onerror as (() => void) | null)?.();
          return;
        }
        if (!storesByDb.has(name)) storesByDb.set(name, new Map());
        const dbStores = storesByDb.get(name)!;
        const makeStore = (storeName: string) => ({
          put(val: Record<string, unknown>) {
            const key = String(val.client_uuid ?? val.id);
            dbStores.get(storeName)!.set(key, val);
          },
          get(key: string) {
            const getReq: Record<string, unknown> = { result: dbStores.get(storeName)!.get(key), onsuccess: null, onerror: null };
            queueMicrotask(() => (getReq.onsuccess as (() => void) | null)?.());
            return getReq;
          },
          getAll() {
            const allReq: Record<string, unknown> = { result: Array.from(dbStores.get(storeName)!.values()), onsuccess: null, onerror: null };
            queueMicrotask(() => (allReq.onsuccess as (() => void) | null)?.());
            return allReq;
          },
          delete(key: string) { dbStores.get(storeName)!.delete(key); },
          clear() { dbStores.get(storeName)!.clear(); }
        });
        const db = {
          objectStoreNames: { contains: (s: string) => dbStores.has(s) },
          createObjectStore(s: string) { dbStores.set(s, new Map()); return makeStore(s); },
          transaction(_names: string | string[]) {
            const tx: Record<string, unknown> = {
              objectStore: (s: string) => makeStore(s),
              oncomplete: null,
              onerror: null
            };
            queueMicrotask(() => (tx.oncomplete as (() => void) | null)?.());
            return tx;
          },
          close() {}
        };
        req.result = db;
        if (targetVersion > currentVersion) {
          dbVersions.set(name, targetVersion);
          (req.onupgradeneeded as (() => void) | null)?.();
        }
        (req.onsuccess as (() => void) | null)?.();
      });
      return req;
    }
  };

  (globalThis as { indexedDB?: unknown }).indexedDB = fakeIndexedDb;
  try {
    const sampleBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    await storeQueuedMeterPhoto('offline-uuid-v3-check', sampleBlob);
    const loaded = await getQueuedMeterPhoto('offline-uuid-v3-check');
    assert.ok(loaded instanceof Blob && loaded.size === 3);
    await deleteQueuedMeterPhoto('offline-uuid-v3-check');
    assert.equal(await getQueuedMeterPhoto('offline-uuid-v3-check'), undefined);
    const hydrated = await hydrateFieldQueueFromIndexedDb();
    assert.ok(Array.isArray(hydrated));
    console.log('✓ offline meter photo queue operates cleanly on IndexedDB schema v3 without VersionError');
  } finally {
    if (prevIdb === undefined) delete (globalThis as { indexedDB?: unknown }).indexedDB;
    else (globalThis as { indexedDB?: unknown }).indexedDB = prevIdb;
  }
})();

console.log('\nMeter reading, privacy, review, anomaly and bill-check tests passed.');
