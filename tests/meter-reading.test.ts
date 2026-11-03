import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ServerAuthService, AuthSecurityError, SESSION_COOKIE_NAME } from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { createProductionRequestHandler } from '../src/server/prodServer';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { INITIAL_CONNECTIONS, INITIAL_BILLS, INITIAL_PAYMENTS } from '../src/data/mockData';
import {
  calculateMeterConsumption,
  detectConsumptionAnomalies,
  detectIdentityMismatch,
  normalizeDisplayedReading,
  MeterReadingError,
  canTransitionAnomalyStatus,
  validateStatusTransition,
  VALID_ANOMALY_STATUS_TRANSITIONS,
  tariffCategoryId
} from '../src/services/meterReading';
import { calculateDetailedUgvclBill } from '../src/data/ugvclTariffSchedule';
import {
  validateMeterPhoto,
  sanitizeCropBox,
  computeCropPixelCoordinates,
  detectAmbiguousDigits,
  AMBIGUOUS_CHAR_MAP
} from '../src/services/meterOcr';
import { validateExistingBill } from '../src/services/billingValidation';
import {
  clearOfflineFieldQueue,
  deleteQueuedMeterPhoto,
  enqueueOfflineMeterReading,
  flushOfflineFieldQueue,
  getQueuedMeterPhoto,
  hydrateFieldQueueFromIndexedDb,
  loadFieldQueue,
  requeueSameUuidForIdempotencyCheck,
  storeQueuedMeterPhoto
} from '../src/utils/offlineFieldSync';
import {
  METER_PHASE11_TRANSLATIONS,
  localizePhase11Status,
  localizePhase11Category,
  localizePhase11Severity,
  localizeMeterNotification
} from '../src/i18n/meterPhase11Translations';
import { translations } from '../src/i18n/translations';
import { handleMeterReadingRoute, isMeterReadingRoutePath } from '../src/server/meterReadingRoutes';

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
  assert.ok(metrics.totalReadings >= 2);
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

check('crop calculations sanitize normalized bounds and calculate pixel coordinates accurately', () => {
  const clamped = sanitizeCropBox({ x: -0.5, y: 1.5, width: 2, height: -1 });
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, 0.95);
  assert.equal(clamped.width, 1);
  assert.equal(clamped.height, 0.05);

  const coords = computeCropPixelCoordinates(1920, 1080, { x: 0.1, y: 0.25, width: 0.8, height: 0.5 });
  assert.equal(coords.x, 192);
  assert.equal(coords.y, 270);
  assert.equal(coords.width, 1536);
  assert.equal(coords.height, 540);

  // Rotation test: 90-degree rotated canvas (1080x1920)
  const rotatedCoords = computeCropPixelCoordinates(1080, 1920, { x: 0.15, y: 0.3, width: 0.7, height: 0.4 });
  assert.equal(rotatedCoords.x, 162);
  assert.equal(rotatedCoords.y, 576);
  assert.equal(rotatedCoords.width, 756);
  assert.equal(rotatedCoords.height, 768);
});

check('ambiguous digit detection identifies OCR character confusions without inventing confidence', () => {
  // '8' vs 'B'
  const noticesB = detectAmbiguousDigits('015B80', '015880');
  assert.equal(noticesB.length, 1);
  assert.equal(noticesB[0].position, 4);
  assert.equal(noticesB[0].rawChar, 'B');
  assert.equal(noticesB[0].proposedDigit, '8');
  assert.deepEqual(noticesB[0].alternatives, ['8', 'B']);

  // '0' vs 'O' or 'D'
  const noticesO = detectAmbiguousDigits('O15180', '015180');
  assert.equal(noticesO.length, 1);
  assert.equal(noticesO[0].rawChar, 'O');
  assert.equal(noticesO[0].proposedDigit, '0');

  // '5' vs 'S'
  const noticesS = detectAmbiguousDigits('01S180', '015180');
  assert.equal(noticesS[0].rawChar, 'S');
  assert.equal(noticesS[0].proposedDigit, '5');

  // '1' vs 'l' or 'I'
  const noticesL = detectAmbiguousDigits('0l5180', '015180');
  assert.equal(noticesL[0].rawChar, 'l');
  assert.equal(noticesL[0].proposedDigit, '1');

  // '6' vs 'G'
  const noticesG = detectAmbiguousDigits('01518G', '015186');
  assert.equal(noticesG[0].rawChar, 'G');
  assert.equal(noticesG[0].proposedDigit, '6');

  // Clean pure numeric text returns 0 ambiguous notices
  assert.equal(detectAmbiguousDigits('015180', '015180').length, 0);
  assert.equal(detectAmbiguousDigits('', '').length, 0);
});

check('meter workspace provides retake, replace, interactive crop controls, and 4-language crop copy', () => {
  const workspaceSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/MeterReadingWorkspace.tsx'), 'utf8');
  assert.match(workspaceSrc, /retake:\s*'Retake photo'/);
  assert.match(workspaceSrc, /retake:\s*'ફરી ફોટો લો'/);
  assert.match(workspaceSrc, /retake:\s*'दोबारा फोटो लें'/);
  assert.match(workspaceSrc, /retake:\s*'पुन्हा फोटो काढा'/);
  assert.match(workspaceSrc, /crop:\s*'Crop display'/);
  assert.match(workspaceSrc, /crop:\s*'ડિસ્પ્લે ક્રોપ કરો'/);
  assert.match(workspaceSrc, /crop:\s*'डिस्प्ले क्रॉप करें'/);
  assert.match(workspaceSrc, /crop:\s*'डिस्प्ले क्रॉप करा'/);
  assert.match(workspaceSrc, /resetImageState/);
  assert.match(workspaceSrc, /applyCrop/);
  assert.match(workspaceSrc, /resetCrop/);
  assert.match(workspaceSrc, /handleRetake/);
  assert.match(workspaceSrc, /handleReplacePhoto/);
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

// ==========================================
// PHASE 11C TEST SUITE
// ==========================================

check('seven-status anomaly review lifecycle enforces valid transitions, terminal closure and audit notes', () => {
  // Test transition matrix
  assert.equal(canTransitionAnomalyStatus('DETECTED', 'PENDING_REVIEW'), true);
  assert.equal(canTransitionAnomalyStatus('DETECTED', 'UNDER_INVESTIGATION'), true);
  assert.equal(canTransitionAnomalyStatus('PENDING_REVIEW', 'UNDER_INVESTIGATION'), true);
  assert.equal(canTransitionAnomalyStatus('PENDING_REVIEW', 'APPROVED'), true);
  assert.equal(canTransitionAnomalyStatus('PENDING_REVIEW', 'REJECTED'), true);
  assert.equal(canTransitionAnomalyStatus('PENDING_REVIEW', 'CORRECTED_THROUGH_ADJUSTMENT'), true);
  assert.equal(canTransitionAnomalyStatus('UNDER_INVESTIGATION', 'APPROVED'), true);
  assert.equal(canTransitionAnomalyStatus('UNDER_INVESTIGATION', 'REJECTED'), true);
  assert.equal(canTransitionAnomalyStatus('UNDER_INVESTIGATION', 'CORRECTED_THROUGH_ADJUSTMENT'), true);
  assert.equal(canTransitionAnomalyStatus('UNDER_INVESTIGATION', 'CLOSED'), true);
  assert.equal(canTransitionAnomalyStatus('APPROVED', 'CLOSED'), true);
  assert.equal(canTransitionAnomalyStatus('REJECTED', 'CLOSED'), true);
  assert.equal(canTransitionAnomalyStatus('CORRECTED_THROUGH_ADJUSTMENT', 'CLOSED'), true);

  // Terminal state: CLOSED cannot transition anywhere
  assert.equal(canTransitionAnomalyStatus('CLOSED', 'PENDING_REVIEW'), false);
  assert.equal(canTransitionAnomalyStatus('CLOSED', 'APPROVED'), false);

  // Invalid backward transitions
  assert.equal(canTransitionAnomalyStatus('APPROVED', 'DETECTED'), false);
  assert.equal(canTransitionAnomalyStatus('REJECTED', 'PENDING_REVIEW'), false);

  // Validation function tests
  validateStatusTransition('PENDING_REVIEW', 'APPROVED'); // OK without note
  assert.throws(
    () => validateStatusTransition('PENDING_REVIEW', 'CLOSED'),
    (err: unknown) => err instanceof MeterReadingError && err.code === 'INVALID_STATUS_TRANSITION'
  );
  assert.throws(
    () => validateStatusTransition('PENDING_REVIEW', 'UNDER_INVESTIGATION', ''),
    (err: unknown) => err instanceof MeterReadingError && err.code === 'AUDIT_NOTE_REQUIRED'
  );
  assert.throws(
    () => validateStatusTransition('UNDER_INVESTIGATION', 'REJECTED', '   '),
    (err: unknown) => err instanceof MeterReadingError && err.code === 'AUDIT_NOTE_REQUIRED'
  );
  validateStatusTransition('UNDER_INVESTIGATION', 'REJECTED', 'Photo unreadable and meter serial does not match.'); // OK
});

check('structured anomaly cases are created, isolated by consumer ownership, and transitioned by staff', () => {
  const p11Store = new ServerDataStore(auth);
  const conn = INITIAL_CONNECTIONS[0];

  // Submit a meter reading that triggers OCR and consumption anomalies
  const reading = p11Store.submitMeterReading(consumer.session.signedToken, {
    clientUuid: 'p11c-reading-anom-01',
    consumerNo: conn.consumerNo,
    meterNo: conn.meterNo,
    displayedReading: '18500',
    readingKwh: 18500,
    multiplier: 1,
    readingAt: '2026-11-02T10:00:00.000Z',
    ocr: {
      meterId: '',
      rawText: '18500',
      candidateReading: '18500',
      normalizedReading: 18500,
      confidence: 45,
      requiresReview: true,
      engineVersion: 'test-v1',
      extractedAt: '2026-11-02T10:00:00.000Z',
      engine: 'tesseract.js'
    }
  });

  assert.equal(reading.status, 'PENDING_REVIEW');
  assert.ok(reading.anomalies.length > 0);

  // Staff query sees the structured anomaly cases
  const allCases = p11Store.getAnomalyCases(employee.session.signedToken);
  assert.ok(allCases.length > 0);
  const targetCase = allCases.find(c => c.readingId === reading.id);
  assert.ok(targetCase, 'Structured anomaly case must be linked to reading');
  assert.equal(targetCase.status, 'PENDING_REVIEW');
  assert.equal(targetCase.consumerNo, conn.consumerNo);
  assert.ok(targetCase.statusHistory.length >= 1);
  assert.equal(targetCase.statusHistory[0].fromStatus, 'DETECTED');
  assert.equal(targetCase.statusHistory[0].toStatus, 'PENDING_REVIEW');

  // Consumer query sees only owned anomalies
  const consumerCases = p11Store.getAnomalyCases(consumer.session.signedToken);
  assert.ok(consumerCases.every(c => c.consumerNo === conn.consumerNo));

  // Consumer forbidden from transitioning anomaly status
  assert.throws(
    () => p11Store.transitionAnomalyStatus(consumer.session.signedToken, targetCase.id, 'UNDER_INVESTIGATION', 'Investigating myself'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );

  // Staff transitions anomaly to UNDER_INVESTIGATION
  const investigated = p11Store.transitionAnomalyStatus(
    employee.session.signedToken,
    targetCase.id,
    'UNDER_INVESTIGATION',
    'Dispatched field engineer to re-verify meter display counter.'
  );
  assert.equal(investigated.status, 'UNDER_INVESTIGATION');
  assert.equal(investigated.statusHistory.length, 2);
  assert.equal(investigated.statusHistory[1].fromStatus, 'PENDING_REVIEW');
  assert.equal(investigated.statusHistory[1].toStatus, 'UNDER_INVESTIGATION');
  assert.equal(investigated.statusHistory[1].actorRole, 'employee');

  // Staff transitions anomaly to APPROVED with note
  const approvedCase = p11Store.transitionAnomalyStatus(
    employee.session.signedToken,
    targetCase.id,
    'APPROVED',
    'Field photo counter verified genuine by junior engineer.'
  );
  assert.equal(approvedCase.status, 'APPROVED');
  assert.ok(approvedCase.resolution);
  assert.equal(approvedCase.resolution?.resolutionType, 'APPROVED');

  // Terminal transition to CLOSED
  const closedCase = p11Store.transitionAnomalyStatus(
    employee.session.signedToken,
    targetCase.id,
    'CLOSED',
    'Case successfully audited and closed.'
  );
  assert.equal(closedCase.status, 'CLOSED');

  // Cannot transition further from CLOSED
  assert.throws(
    () => p11Store.transitionAnomalyStatus(employee.session.signedToken, targetCase.id, 'PENDING_REVIEW', 'Reopening'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 400
  );
});

check('consumer billing review request enforces ownership, duplicate prevention, and internal note privacy', () => {
  const p11Store = new ServerDataStore(auth);
  const targetBill = INITIAL_BILLS[0];

  // Consumer creates a billing review request
  const review = p11Store.createConsumerBillingReview(consumer.session.signedToken, {
    billNo: targetBill.billNo,
    category: 'CONSUMPTION_DISPUTE',
    description: 'Billed units reflect anomalous spike during our vacation period.',
    clientUuid: 'p11c-cbr-uuid-0001'
  });

  assert.ok(review.id.startsWith('CBR-'));
  assert.equal(review.billNo, targetBill.billNo);
  assert.equal(review.status, 'PENDING_REVIEW');
  assert.equal(review.submittedBy, consumer.session.user.name);
  assert.ok(review.statusHistory.length >= 1);

  // Idempotency: same clientUuid returns the identical review
  const duplicateUuid = p11Store.createConsumerBillingReview(consumer.session.signedToken, {
    billNo: targetBill.billNo,
    category: 'CONSUMPTION_DISPUTE',
    description: 'Duplicate attempt',
    clientUuid: 'p11c-cbr-uuid-0001'
  });
  assert.equal(duplicateUuid.id, review.id);

  // Duplicate active review on same bill with different UUID is blocked
  assert.throws(
    () => p11Store.createConsumerBillingReview(consumer.session.signedToken, {
      billNo: targetBill.billNo,
      category: 'TARIFF_MISMATCH',
      description: 'Second complaint while first is active',
      clientUuid: 'p11c-cbr-uuid-0002'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'DUPLICATE_REVIEW_REQUEST'
  );

  // Employee transitions review to UNDER_INVESTIGATION and adds internal staff notes
  const underInvestigation = p11Store.transitionBillingReview(
    employee.session.signedToken,
    review.id,
    'UNDER_INVESTIGATION',
    'CONFIDENTIAL_STAFF_NOTE: Checking substation feeder 11kV interval meter logs for discrepancy.',
    'Your billing review has been assigned to operations engineer Shri R.K. Varma.'
  );
  assert.equal(underInvestigation.status, 'UNDER_INVESTIGATION');
  assert.equal(underInvestigation.consumerVisibleNote, 'Your billing review has been assigned to operations engineer Shri R.K. Varma.');
  assert.ok(underInvestigation.internalStaffNotes?.some(n => n.includes('CONFIDENTIAL_STAFF_NOTE')));

  // PRIVACY CONTROL: Consumer query must NEVER leak internal staff notes
  const consumerView = p11Store.getConsumerBillingReviewById(consumer.session.signedToken, review.id);
  assert.equal('internalStaffNotes' in consumerView, false, 'Internal staff notes must not leak to consumer API');
  assert.equal(consumerView.consumerVisibleNote, 'Your billing review has been assigned to operations engineer Shri R.K. Varma.');

  const consumerList = p11Store.getConsumerBillingReviews(consumer.session.signedToken, targetBill.billNo);
  assert.ok(consumerList.length >= 1);
  assert.ok(consumerList.every(r => !('internalStaffNotes' in r)));

  // Consumer cannot approve, reject or adjust their own review
  assert.throws(
    () => p11Store.transitionBillingReview(consumer.session.signedToken, review.id, 'APPROVED', 'I approve myself'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );
});

check('authorized financial adjustments enforce separation of duties, Phase 9 recalculation, and permanent record immutability', () => {
  const p11Store = new ServerDataStore(auth);
  const targetBill = INITIAL_BILLS[0];
  const originalBillSnapshot = JSON.stringify(targetBill);
  const originalReadingKwh = INITIAL_CONNECTIONS[0].currentReadingKwh;

  // Consumer cannot propose financial adjustment
  assert.throws(
    () => p11Store.proposeFinancialAdjustment(consumer.session.signedToken, {
      billNo: targetBill.billNo,
      adjustmentType: 'CREDIT_CONCESSION',
      proposedAdjustmentAmount: 200,
      reason: 'Self proposed concession'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );

  // Invalid amounts rejected
  assert.throws(
    () => p11Store.proposeFinancialAdjustment(employee.session.signedToken, {
      billNo: targetBill.billNo,
      adjustmentType: 'SLAB_CORRECTION',
      proposedAdjustmentAmount: -50,
      reason: 'Negative test'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 400 && err.code === 'INVALID_ADJUSTMENT_AMOUNT'
  );
  assert.throws(
    () => p11Store.proposeFinancialAdjustment(employee.session.signedToken, {
      billNo: targetBill.billNo,
      adjustmentType: 'SLAB_CORRECTION',
      proposedAdjustmentAmount: NaN,
      reason: 'NaN test'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 400 && err.code === 'INVALID_ADJUSTMENT_AMOUNT'
  );

  // Employee proposes valid financial adjustment with revisedUnits recalculated via Phase 9
  const proposal = p11Store.proposeFinancialAdjustment(employee.session.signedToken, {
    billNo: targetBill.billNo,
    adjustmentType: 'SLAB_CORRECTION',
    proposedAdjustmentAmount: 185.50,
    revisedUnits: 620,
    reason: 'Meter fast-forward registration detected during test bench audit; slab correction to 620 units.'
  });

  assert.ok(proposal.id.startsWith('ADJ-'));
  assert.equal(proposal.status, 'PENDING_APPROVAL');
  assert.equal(proposal.proposedBy, employee.session.user.name);
  assert.equal(proposal.proposedAdjustmentAmount, 185.50);
  assert.equal(proposal.revisedUnits, 620);
  assert.match(proposal.calculationBasis, /Phase 9 Canonical Recalculation/);

  // Phase 9 tariff verification
  const canonicalExpected = calculateDetailedUgvclBill(620, 'RGP_URBAN', 'bimonthly', INITIAL_CONNECTIONS[0].sanctionedLoadKw, INITIAL_CONNECTIONS[0].phase);
  assert.equal(proposal.proposedRevisedAmount, Math.max(0, canonicalExpected.netPayableAmount - targetBill.rebateOrSubsidy));

  // Unauthorized role: Employee cannot review adjustments (requires admin role)
  assert.throws(
    () => p11Store.reviewFinancialAdjustment(employee.session.signedToken, proposal.id, 'APPROVE', 'Employee approval attempt'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'FORBIDDEN_ROLE'
  );

  // Propose an adjustment as Admin
  const adminProposal = p11Store.proposeFinancialAdjustment(admin.session.signedToken, {
    billNo: targetBill.billNo,
    adjustmentType: 'METER_ERROR_REBATE',
    proposedAdjustmentAmount: 100,
    reason: 'Admin self-proposal test'
  });

  // MANDATORY SEPARATION OF DUTIES: Even an admin cannot approve their own proposed adjustment!
  assert.throws(
    () => p11Store.reviewFinancialAdjustment(admin.session.signedToken, adminProposal.id, 'APPROVE', 'Admin self-approval attempt'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'SEPARATION_OF_DUTIES_VIOLATION'
  );

  // Independent administrator reviews and approves employee's proposal
  const approvedProposal = p11Store.reviewFinancialAdjustment(
    admin.session.signedToken,
    proposal.id,
    'APPROVE',
    'Executive Engineer reviewed test bench calibration certificate; approved ₹185.50 adjustment.'
  );

  assert.equal(approvedProposal.status, 'APPROVED');
  assert.equal(approvedProposal.approvedBy, admin.session.user.name);
  assert.ok(approvedProposal.approvedAt);
  assert.equal(approvedProposal.approvalNote, 'Executive Engineer reviewed test bench calibration certificate; approved ₹185.50 adjustment.');
  assert.equal(approvedProposal.statusHistory.length, 2);
  assert.equal(approvedProposal.statusHistory[1].status, 'APPROVED');

  // CRITICAL IMMUTABILITY GUARANTEE: Original bill and readings are PERMANENTLY UNCHANGED
  const billAfterApproval = p11Store.getBillByNumber(admin.session.signedToken, targetBill.billNo);
  assert.equal(JSON.stringify(billAfterApproval), originalBillSnapshot, 'Original bill must NEVER be mutated or overwritten');
  assert.equal(billAfterApproval.totalAmount, targetBill.totalAmount);
  assert.equal(billAfterApproval.billNo, targetBill.billNo);
  assert.equal(p11Store.getConnectionByNumber(admin.session.signedToken, targetBill.consumerNo).currentReadingKwh, originalReadingKwh);

  // Consumers cannot access financial adjustment records (403 FORBIDDEN_ROLE)
  assert.throws(
    () => p11Store.getFinancialAdjustments(consumer.session.signedToken, targetBill.billNo),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'FORBIDDEN_ROLE'
  );
  assert.throws(
    () => p11Store.getFinancialAdjustmentById(consumer.session.signedToken, proposal.id),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'FORBIDDEN_ROLE'
  );

  // Authorized staff (employee, management, admin) can retrieve the approved adjustment
  const employeeAdjs = p11Store.getFinancialAdjustments(employee.session.signedToken, targetBill.billNo);
  assert.ok(employeeAdjs.length >= 1);
  assert.equal(employeeAdjs[0].id, proposal.id);
});

check('bill validation returns structured findings for slabs, fixed charges, FPPPA, duty, duplicates, and side-by-side comparison', () => {
  const conn = INITIAL_CONNECTIONS[0];
  const bill = INITIAL_BILLS[0];

  // Canonical bill derived from Phase 9 engine matches read-only check cleanly
  const canonicalCalc = calculateDetailedUgvclBill(300, 'RGP_URBAN', 'bimonthly', conn.sanctionedLoadKw, conn.phase);
  const canonicalBill = {
    billNo: 'BILL-CANONICAL-TEST-001',
    consumerNo: conn.consumerNo,
    billMonth: 'December 2026',
    billDate: '01-Jan-2027',
    dueDate: '20-Jan-2027',
    unitsConsumed: 300,
    energyCharges: canonicalCalc.totalEnergyCharges,
    fixedCharges: canonicalCalc.fixedCharges.amount,
    fuelPriceAdjustment: canonicalCalc.fpppaCharges.amount,
    electricityDuty: canonicalCalc.electricityDuty.amount,
    rebateOrSubsidy: 0,
    totalAmount: canonicalCalc.netPayableAmount,
    status: 'Unpaid' as const,
    slabBreakdown: canonicalCalc.slabBreakdown.map(s => ({
      slab: s.label,
      units: s.unitsInSlab,
      rate: s.ratePerUnit,
      amount: s.amount
    }))
  };

  const cleanResult = validateExistingBill({
    bill: canonicalBill,
    connection: conn,
    allBills: [...INITIAL_BILLS, canonicalBill],
    payments: INITIAL_PAYMENTS
  });

  assert.equal(cleanResult.status, 'CLEAR');
  assert.ok(cleanResult.findings);
  assert.equal(cleanResult.findings.length, 0);
  assert.ok(cleanResult.comparison);
  assert.ok(cleanResult.comparison.every(line => line.status === 'MATCH'));

  // Discrepancy injection: altered energy charges and duplicate bill
  const distortedBill = {
    ...bill,
    billNo: 'BILL-DISTORTED-001',
    energyCharges: bill.energyCharges + 500, // tariff mismatch
    electricityDuty: bill.electricityDuty - 200, // duty mismatch
    totalAmount: bill.totalAmount + 300
  };

  const reviewResult = validateExistingBill({
    bill: distortedBill,
    connection: conn,
    allBills: [...INITIAL_BILLS, distortedBill, distortedBill], // inject duplicate
    payments: INITIAL_PAYMENTS
  });

  assert.equal(reviewResult.status, 'REVIEW');
  assert.ok(reviewResult.findings && reviewResult.findings.length >= 2);

  // Verify finding categories
  const categories = reviewResult.findings.map(f => f.category);
  assert.ok(categories.includes('TARIFF_SLAB_MISMATCH'), 'Must identify tariff slab calculation mismatch');
  assert.ok(categories.includes('ELECTRICITY_DUTY_MISMATCH'), 'Must identify duty calculation mismatch');
  assert.ok(categories.includes('DUPLICATE_BILL'), 'Must identify duplicate bill record');

  // Verify structured finding properties
  const tariffFinding = reviewResult.findings.find(f => f.category === 'TARIFF_SLAB_MISMATCH')!;
  assert.ok(tariffFinding.findingId.startsWith('FND-'));
  assert.equal(tariffFinding.relatedBillNo, distortedBill.billNo);
  assert.ok(tariffFinding.suggestedAction.length > 0);
  assert.ok(tariffFinding.actualValue.includes('₹'));

  // Verify side-by-side comparison line items
  assert.ok(reviewResult.comparison);
  const energyComparison = reviewResult.comparison.find(l => l.lineItem === 'Energy charges')!;
  assert.equal(energyComparison.status, 'DISCREPANCY');
  assert.ok(energyComparison.difference > 0);

  // Verify original bills and payments were never mutated (read-only verification)
  assert.equal(INITIAL_BILLS[0].energyCharges, bill.energyCharges);
  assert.equal(INITIAL_PAYMENTS.length, 3);
});

check('Phase 11D Portal Integration: Consumer Portal billing review and privacy isolation', () => {
  const store = new ServerDataStore(auth);
  const targetBill = INITIAL_BILLS[0];

  // 1. Consumer queries existing seeded billing reviews
  const reviews = store.getConsumerBillingReviews(consumer.session.signedToken);
  assert.ok(reviews.length >= 1, 'Consumer should receive seeded review request');
  const seeded = reviews[0];
  assert.ok(seeded.id.startsWith('CBR-'));
  assert.equal('internalStaffNotes' in seeded, false, 'Consumer API response must never include internal staff notes');

  // 2. Consumer creates a new billing review request
  const newReview = store.createConsumerBillingReview(consumer.session.signedToken, {
    billNo: targetBill.billNo,
    category: 'METER_FAULT_SUSPECTED',
    description: 'Dial in photo is 14820 but bill reflects 15820. Please verify reading.',
    clientUuid: 'p11d-cbr-test-uuid-001'
  });
  assert.ok(newReview.id.startsWith('CBR-'));
  assert.equal(newReview.status, 'PENDING_REVIEW');
  assert.equal(newReview.consumerNo, targetBill.consumerNo);
  assert.equal(newReview.category, 'METER_FAULT_SUSPECTED');
  assert.equal(newReview.description, 'Dial in photo is 14820 but bill reflects 15820. Please verify reading.');

  // Verify privacy: consumer can query it without internal notes
  const fetchedReview = store.getConsumerBillingReviewById(consumer.session.signedToken, newReview.id);
  assert.equal('internalStaffNotes' in fetchedReview, false);
  assert.equal(fetchedReview.id, newReview.id);
});

check('Phase 11D Portal Integration: Employee review queue, self-review guard, and inspection', () => {
  const store = new ServerDataStore(auth);

  const fieldUser = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });

  // Field engineer submits a meter reading
  const reading = store.submitMeterReading(fieldUser.session.signedToken, {
    clientUuid: 'p11d-field-reading-uuid-001',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '014850',
    readingKwh: 14850,
    multiplier: 1,
    readingAt: '2026-11-03T10:00:00.000Z'
  });

  // Guard: Field engineer cannot review meter readings (FORBIDDEN_ROLE)
  assert.throws(
    () => store.reviewMeterReading(fieldUser.session.signedToken, reading.id, 'APPROVE', 'Field approval attempt'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );

  // Independent employee approves reading
  const approvedReading = store.reviewMeterReading(employee.session.signedToken, reading.id, 'APPROVE', 'Verified by office supervisor');
  assert.equal(approvedReading.status, 'APPROVED');
  assert.equal(approvedReading.reviewedBy, employee.session.user.name);

  // Employee queries anomaly cases
  const anomalyCases = store.getAnomalyCases(employee.session.signedToken);
  assert.ok(anomalyCases.length >= 1, 'Should list active anomaly cases');
  const targetCase = anomalyCases[0];

  // Employee transitions anomaly case to UNDER_INVESTIGATION
  const updatedCase = store.transitionAnomalyStatus(
    employee.session.signedToken,
    targetCase.id,
    'UNDER_INVESTIGATION',
    'Dispatched field engineer for test bench check'
  );
  assert.equal(updatedCase.status, 'UNDER_INVESTIGATION');
});

check('Phase 11D Portal Integration: Field Engineer work order reading and idempotency', () => {
  const store = new ServerDataStore(auth);
  const fieldUser = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });

  // Field engineer submits meter reading with unique clientUuid
  const clientUuid = 'uuid-fe-wo-reading-001';
  const reading1 = store.submitMeterReading(fieldUser.session.signedToken, {
    clientUuid,
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '014900',
    readingKwh: 14900,
    multiplier: 1,
    readingAt: '2026-11-03T11:00:00.000Z'
  });

  assert.ok(reading1.id.startsWith('MR-'));
  assert.equal(reading1.clientUuid, clientUuid);

  // Re-submission of identical clientUuid returns existing record (idempotency)
  const reading2 = store.submitMeterReading(fieldUser.session.signedToken, {
    clientUuid,
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '014900',
    readingKwh: 14900,
    multiplier: 1,
    readingAt: '2026-11-03T11:00:00.000Z'
  });

  assert.equal(reading1.id, reading2.id, 'Idempotent resubmission must return identical record');
});

check('Phase 11D Portal Integration: Executive Management aggregate telemetry without PII', () => {
  const store = new ServerDataStore(auth);
  const mgmtUser = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.management, targetRole: 'management' });

  // Executive queries macro metrics
  const metrics = store.getMeterMetrics(mgmtUser.session.signedToken);

  assert.ok(typeof metrics.totalReadings === 'number');
  assert.ok(typeof metrics.openAnomalies === 'number');
  assert.ok(typeof metrics.cases.total === 'number');
  assert.ok(typeof metrics.financialAdjustments.total === 'number');
  assert.ok(typeof metrics.averageTurnaroundHours === 'number');
  assert.ok(metrics.cases.byCategory);
  assert.ok(metrics.cases.bySeverity);

  // Privacy verification: Macro metrics MUST NOT contain consumer names, numbers, or photos
  const metricsStr = JSON.stringify(metrics);
  assert.equal(metricsStr.includes('photoBase64'), false, 'Metrics must never include meter photographs');
  assert.equal(metricsStr.includes('consumerName'), false, 'Metrics must never include consumer names');
  assert.equal(metricsStr.includes('internalStaffNotes'), false, 'Metrics must never include internal staff notes');
});

check('Phase 11D Portal Integration: System Admin OCR health, policy change tracking, and separation of duties', () => {
  const store = new ServerDataStore(auth);

  // Admin gets threshold policy and history
  const thresholds = store.getMeterThresholds(admin.session.signedToken);
  assert.ok(thresholds.highDailyRatio >= 2.0);
  assert.ok(Array.isArray(thresholds.history));

  // Admin updates threshold policy with required justification reason
  const updated = store.setMeterThresholds(admin.session.signedToken, {
    minimumHistory: 3,
    highDailyRatio: 2.8,
    lowDailyRatio: 0.25,
    highDailyUnits: 45,
    reason: 'Q3 Board Directive: Adjusted high consumption spike factor from 2.5x to 2.8x.'
  });

  assert.equal(updated.highDailyRatio, 2.8);
  assert.ok(updated.history && updated.history.length >= 1);
  const latestEntry = updated.history[updated.history.length - 1];
  assert.equal(latestEntry.changedBy, admin.session.user.name);
  assert.equal(latestEntry.reason, 'Q3 Board Directive: Adjusted high consumption spike factor from 2.5x to 2.8x.');
  assert.equal(latestEntry.thresholds.highDailyRatio, 2.8);

  // Validation: Missing reason must be rejected
  assert.throws(
    () => store.setMeterThresholds(admin.session.signedToken, {
      minimumHistory: 3,
      highDailyRatio: 2.5,
      lowDailyRatio: 0.2,
      highDailyUnits: 40,
      reason: '' // empty reason
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 400
  );
});

check('Phase 11E Localization: 100% key parity across en, gu, hi, and mr with native scripts and canonical enum preservation', () => {
  const langs = ['en', 'gu', 'hi', 'mr'] as const;
  const enKeys = Object.keys(METER_PHASE11_TRANSLATIONS.en).sort();
  assert.ok(enKeys.length >= 200, 'Phase 11 dictionary must cover all workspace and portal strings');

  for (const lang of langs) {
    assert.ok(translations[lang].meterPhase11, `translations.${lang}.meterPhase11 must be registered`);
    const langKeys = Object.keys(translations[lang].meterPhase11).sort();
    assert.deepEqual(langKeys, enKeys, `Phase 11 translation keys for ${lang} must match English 100%`);

    // Ensure no empty strings
    const values = Object.values(translations[lang].meterPhase11);
    assert.ok(values.every(v => typeof v === 'string' && v.trim().length > 0));
  }

  // Native script checks for Gujarati, Hindi, and Marathi
  assert.match(translations.gu.meterPhase11.wsTitle, /[\u0A80-\u0AFF]/, 'Gujarati must use native Gujarati script');
  assert.match(translations.hi.meterPhase11.wsTitle, /[\u0900-\u097F]/, 'Hindi must use native Devanagari script');
  assert.match(translations.mr.meterPhase11.wsTitle, /[\u0900-\u097F]/, 'Marathi must use native Devanagari script');

  // Verify status, category, and severity localization preserves canonical enum values while returning localized labels
  const canonicalStatus = 'UNDER_INVESTIGATION';
  assert.notEqual(localizePhase11Status(canonicalStatus, 'gu'), canonicalStatus);
  assert.notEqual(localizePhase11Status(canonicalStatus, 'hi'), canonicalStatus);
  assert.notEqual(localizePhase11Status(canonicalStatus, 'mr'), canonicalStatus);
  assert.equal(canonicalStatus, 'UNDER_INVESTIGATION', 'Canonical status enum value must remain unchanged');

  const canonicalCategory = 'HIGH_CONSUMPTION';
  assert.notEqual(localizePhase11Category(canonicalCategory, 'gu'), canonicalCategory);
  assert.notEqual(localizePhase11Severity('HIGH', 'hi'), 'HIGH');
});

check('Phase 11E Notifications: Billing review requested, investigation opened, re-read, and financial adjustment triggers with privacy isolation', () => {
  const store = new ServerDataStore(auth);
  const fieldUser = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });
  const targetBill = INITIAL_BILLS[0];

  // 1. Billing review requested -> emits NOT-MR-CBR-REQ-<reviewId> to employee
  const review = store.createConsumerBillingReview(consumer.session.signedToken, {
    billNo: targetBill.billNo,
    category: 'METER_FAULT_SUSPECTED',
    description: 'Consumer private explanation that should not leak in notification payload',
    clientUuid: 'p11e-cbr-notif-uuid-001'
  });

  const empNotifsAfterReq = store.getMeterNotifications(employee.session.signedToken);
  const cbrReqNotif = empNotifsAfterReq.find(n => n.id === `NOT-MR-CBR-REQ-${review.id}`);
  assert.ok(cbrReqNotif, 'Employee must receive NOT-MR-CBR-REQ notification when consumer submits billing review');
  assert.equal(cbrReqNotif.targetRole, 'employee');
  assert.ok(cbrReqNotif.message.includes(review.id), 'Must include review ID');
  assert.ok(cbrReqNotif.message.includes(review.consumerNo), 'Must include connection reference');
  assert.ok(cbrReqNotif.message.includes(review.billNo), 'Must include bill number');
  assert.ok(cbrReqNotif.message.includes(review.category), 'Must include review category');
  assert.equal(cbrReqNotif.message.includes('Consumer private explanation'), false, 'Must not expose raw evidence/description in notification');

  // 2. Billing review moved to UNDER_INVESTIGATION -> emits employee + consumer notifications without internal staff notes
  const secretStaffNote = 'CONFIDENTIAL_INTERNAL_INSPECTION_NOTE_DO_NOT_LEAK_991';
  store.transitionBillingReview(
    employee.session.signedToken,
    review.id,
    'UNDER_INVESTIGATION',
    'Your billing review is now under investigation by our subdivision team.',
    secretStaffNote
  );

  const empNotifsAfterInv = store.getMeterNotifications(employee.session.signedToken);
  const empCbrInv = empNotifsAfterInv.find(n => n.id === `NOT-MR-CBR-EMP-${review.id}-UNDER_INVESTIGATION`);
  assert.ok(empCbrInv, 'Employee must receive NOT-MR-CBR-EMP investigation notification');

  const consumerNotifsAfterInv = store.getMeterNotifications(consumer.session.signedToken);
  const cnsCbrInv = consumerNotifsAfterInv.find(n => n.id === `NOT-MR-CBR-CNS-${review.id}-UNDER_INVESTIGATION`);
  assert.ok(cnsCbrInv, 'Consumer must receive NOT-MR-CBR-CNS investigation notification');
  assert.equal(cnsCbrInv.consumerNo, review.consumerNo);
  assert.equal(cnsCbrInv.message.includes(secretStaffNote), false, 'Consumer notification must NEVER expose internal staff notes');

  // Verify localization of consumer notification across all 4 languages
  const localizedGu = localizeMeterNotification(cnsCbrInv.title, cnsCbrInv.message, 'gu');
  const localizedHi = localizeMeterNotification(cnsCbrInv.title, cnsCbrInv.message, 'hi');
  const localizedMr = localizeMeterNotification(cnsCbrInv.title, cnsCbrInv.message, 'mr');
  assert.match(localizedGu.title, /[\u0A80-\u0AFF]/);
  assert.match(localizedHi.title, /[\u0900-\u097F]/);
  assert.match(localizedMr.title, /[\u0900-\u097F]/);

  // 3. Anomaly case moved to UNDER_INVESTIGATION -> emits employee + consumer notifications without internal staff note
  const anomalyCases = store.getAnomalyCases(employee.session.signedToken);
  const openAnomaly = anomalyCases.find(c => c.status === 'PENDING_REVIEW' || c.status === 'DETECTED')!;
  const secretAnomalyNote = 'INTERNAL_BENCH_TEST_ORDER_SECRET_442';
  store.transitionAnomalyStatus(
    employee.session.signedToken,
    openAnomaly.id,
    'UNDER_INVESTIGATION',
    secretAnomalyNote
  );

  const empAnomalyNotif = store.getMeterNotifications(employee.session.signedToken)
    .find(n => n.id === `NOT-MR-ANO-EMP-${openAnomaly.id}-UNDER_INVESTIGATION`);
  assert.ok(empAnomalyNotif, 'Employee must receive NOT-MR-ANO-EMP investigation notification');

  const cnsAnomalyNotif = store.getMeterNotifications(consumer.session.signedToken)
    .find(n => n.id === `NOT-MR-ANO-CNS-${openAnomaly.id}-UNDER_INVESTIGATION`);
  assert.ok(cnsAnomalyNotif, 'Consumer must receive NOT-MR-ANO-CNS investigation notification');
  assert.equal(cnsAnomalyNotif.message.includes(secretAnomalyNote), false, 'Consumer anomaly notification must never leak internal staff note');

  // 4. Field Engineer re-read notification on REREAD decision
  const submittedReading = store.submitMeterReading(fieldUser.session.signedToken, {
    clientUuid: 'p11e-reread-test-uuid-001',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '015100',
    readingKwh: 15100,
    multiplier: 1,
    readingAt: '2026-11-03T12:00:00.000Z'
  });
  store.reviewMeterReading(employee.session.signedToken, submittedReading.id, 'REREAD', 'Dial glare obscured last digit');
  const fieldNotifs = store.getMeterNotifications(fieldUser.session.signedToken);
  const rereadNotif = fieldNotifs.find(n => n.id === `NOT-MR-REREAD-FLD-${submittedReading.id}`);
  assert.ok(rereadNotif, 'Field engineer must receive NOT-MR-REREAD-FLD notification when re-read is requested');

  // 5. Financial adjustment proposed & approved notifications
  const adjProposal = store.proposeFinancialAdjustment(employee.session.signedToken, {
    billNo: targetBill.billNo,
    adjustmentType: 'SLAB_CORRECTION',
    revisedUnits: targetBill.unitsConsumed - 30,
    reason: 'Verified reading correction after field check'
  });
  const adminNotifs = store.getMeterNotifications(admin.session.signedToken);
  assert.ok(adminNotifs.some(n => n.id === `NOT-MR-ADJ-PROP-${adjProposal.id}`), 'Admin must receive NOT-MR-ADJ-PROP notification');

  store.reviewFinancialAdjustment(admin.session.signedToken, adjProposal.id, 'APPROVE', 'Approved credit adjustment');
  const empAdjNotif = store.getMeterNotifications(employee.session.signedToken)
    .find(n => n.id === `NOT-MR-ADJ-REV-EMP-${adjProposal.id}-APPROVED`);
  const cnsAdjNotif = store.getMeterNotifications(consumer.session.signedToken)
    .find(n => n.id === `NOT-MR-ADJ-REV-CNS-${adjProposal.id}-APPROVED`);
  assert.ok(empAdjNotif, 'Employee must receive financial adjustment approval notification');
  assert.ok(cnsAdjNotif, 'Consumer must receive safe financial adjustment approval notification');

  // 6. Cross-consumer isolation & route alias checks
  assert.ok(isMeterReadingRoutePath('/api/meter-readings/anomalies'));
  assert.ok(isMeterReadingRoutePath('/api/meter-anomalies'));
  assert.ok(isMeterReadingRoutePath('/api/billing-reviews'));
  assert.ok(isMeterReadingRoutePath('/api/financial-adjustments'));
  assert.ok(isMeterReadingRoutePath('/api/meter-metrics'));
  assert.ok(isMeterReadingRoutePath('/api/meter-thresholds'));
  assert.ok(isMeterReadingRoutePath('/api/bills/validate'));
});

// ==========================================
// PHASE 11F FINAL ACCEPTANCE & SECURITY REGRESSION SUITE
// ==========================================

check('Phase 11F Security & Multi-Consumer Ownership Isolation: Consumer B cannot access Consumer A readings, photos, anomalies, reviews, or notifications', () => {
  const fAuth = new ServerAuthService({ sessionSecret: 'phase11f_security_regression_secret_32bytes' });
  const fStore = new ServerDataStore(fAuth);

  const consumerA = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.consumer, targetRole: 'consumer' });
  const consumerB = fAuth.registerConsumer({
    name: 'Smt. Kavitaben Desai',
    email: 'kavita.desai@consumer.ugvcl.com',
    password: 'ConsumerB@2026!',
    mobileNumber: '+91 98250 99881'
  });
  const emp = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const adm = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.admin, targetRole: 'admin' });
  const mgmt = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.management, targetRole: 'management' });
  const fld = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });

  // Valid minimal 1x1 JPEG data URL
  const validJpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
  const photoDataUrl = `data:image/jpeg;base64,${validJpegBase64}`;

  // Consumer A submits a reading with photo and low OCR confidence (creates anomaly case)
  const readingA = fStore.submitMeterReading(consumerA.session.signedToken, {
    clientUuid: 'p11f-cnsA-reading-001',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '015200',
    readingKwh: 15200,
    multiplier: 1,
    readingAt: '2026-11-03T09:00:00.000Z',
    photoDataUrl,
    ocr: {
      meterId: INITIAL_CONNECTIONS[0].meterNo,
      rawText: '015200',
      candidateReading: '015200',
      normalizedReading: 15200,
      confidence: 55,
      requiresReview: true,
      engineVersion: 'Tesseract 5 / tesseract.js 7.0.0',
      extractedAt: '2026-11-03T09:00:00.000Z',
      engine: 'tesseract.js'
    }
  });

  // Consumer A creates a billing review
  const reviewA = fStore.createConsumerBillingReview(consumerA.session.signedToken, {
    billNo: INITIAL_BILLS[0].billNo,
    category: 'CONSUMPTION_DISPUTE',
    description: 'Consumer A billing review request',
    clientUuid: 'p11f-cnsA-cbr-001'
  });

  // Employee transitions Consumer A review to UNDER_INVESTIGATION with confidential staff note
  fStore.transitionBillingReview(
    emp.session.signedToken,
    reviewA.id,
    'UNDER_INVESTIGATION',
    'CONFIDENTIAL_STAFF_ONLY_AUDIT_TRAIL_777',
    'Public status note for Consumer A'
  );

  // Verify Consumer B sees 0 of Consumer A's readings, anomaly cases, billing reviews, and notifications
  assert.equal(fStore.getMeterReadings(consumerB.session.signedToken).length, 0);
  assert.equal(fStore.getAnomalyCases(consumerB.session.signedToken).length, 0);
  assert.equal(fStore.getConsumerBillingReviews(consumerB.session.signedToken).length, 0);
  assert.equal(fStore.getMeterNotifications(consumerB.session.signedToken).length, 0);

  // Verify Consumer B gets 403 when attempting to access Consumer A's photo, anomaly case, billing review, or bill by ID
  assert.throws(
    () => fStore.getMeterPhoto(consumerB.session.signedToken, readingA.id),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );
  const caseA = fStore.getAnomalyCases(emp.session.signedToken).find(c => c.readingId === readingA.id)!;
  assert.throws(
    () => fStore.getAnomalyCaseById(consumerB.session.signedToken, caseA.id),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );
  assert.throws(
    () => fStore.getConsumerBillingReviewById(consumerB.session.signedToken, reviewA.id),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );
  assert.throws(
    () => fStore.getBillByNumber(consumerB.session.signedToken, INITIAL_BILLS[0].billNo),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403
  );

  // Verify Management cannot access individual readings, individual financial adjustments, or mutate records
  const adjA = fStore.proposeFinancialAdjustment(emp.session.signedToken, {
    billNo: INITIAL_BILLS[0].billNo,
    reviewRequestId: reviewA.id,
    adjustmentType: 'CREDIT_CONCESSION',
    proposedAdjustmentAmount: 120,
    reason: 'Approved concession for Consumer A'
  });
  assert.throws(
    () => fStore.getFinancialAdjustments(mgmt.session.signedToken),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'FORBIDDEN_ROLE'
  );
  assert.throws(
    () => fStore.getFinancialAdjustmentById(mgmt.session.signedToken, adjA.id),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'FORBIDDEN_ROLE'
  );
  assert.throws(
    () => fStore.getFinancialAdjustments(fld.session.signedToken),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'FORBIDDEN_ROLE'
  );

  // Verify Field Engineer cannot access unassigned connection (INITIAL_CONNECTIONS[1] is not assigned to default field engineer)
  assert.throws(
    () => fStore.submitMeterReading(fld.session.signedToken, {
      clientUuid: 'p11f-fld-unassigned-001',
      consumerNo: INITIAL_CONNECTIONS[1].consumerNo,
      meterNo: INITIAL_CONNECTIONS[1].meterNo,
      displayedReading: '029000',
      readingKwh: 29000,
      multiplier: 1,
      readingAt: '2026-11-03T10:00:00.000Z'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'METER_ASSIGNMENT_REQUIRED'
  );

  // Verify rejected financial adjustment emits safe consumer notification without internal rejection note
  const secretRejectionReason = 'INTERNAL_FINANCE_REJECTION_CODE_9981_DO_NOT_EXPOSE';
  const rejectedAdj = fStore.reviewFinancialAdjustment(
    adm.session.signedToken,
    adjA.id,
    'REJECT',
    secretRejectionReason
  );
  assert.equal(rejectedAdj.status, 'REJECTED');
  const cnsNotifsAfterReject = fStore.getMeterNotifications(consumerA.session.signedToken);
  const cnsRejectNotif = cnsNotifsAfterReject.find(n => n.id === `NOT-MR-ADJ-REV-CNS-${adjA.id}-REJECTED`);
  assert.ok(cnsRejectNotif, 'Consumer must receive safe notification when financial adjustment is rejected');
  assert.equal(cnsRejectNotif.title, 'Bill adjustment review completed');
  assert.equal(cnsRejectNotif.message.includes(secretRejectionReason), false, 'Rejected adjustment consumer notification must NEVER leak internal rejection notes');
  assert.equal(fStore.getMeterNotifications(consumerB.session.signedToken).some(n => n.id === cnsRejectNotif.id), false);

  // Verify Gujarati, Hindi, and Marathi localization of rejected adjustment consumer notification
  for (const lang of ['gu', 'hi', 'mr'] as const) {
    const loc = localizeMeterNotification(cnsRejectNotif.title, cnsRejectNotif.message, lang);
    assert.notEqual(loc.title, cnsRejectNotif.title);
    assert.notEqual(loc.message, cnsRejectNotif.message);
  }
});

check('Phase 11F All Four Financial Adjustment Types & Phase 9 Canonical Tariff Integration', () => {
  const fAuth = new ServerAuthService({ sessionSecret: 'phase11f_tariff_adjustment_secret_32bytes' });
  const fStore = new ServerDataStore(fAuth);
  const emp = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const adm = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.admin, targetRole: 'admin' });
  const bill = INITIAL_BILLS[0];
  const beforeBillsJson = JSON.stringify(INITIAL_BILLS);
  const beforePaymentsJson = JSON.stringify(INITIAL_PAYMENTS);

  const types = [
    'CREDIT_CONCESSION',
    'SLAB_CORRECTION',
    'METER_ERROR_REBATE',
    'SUPPLEMENTARY_CHARGE'
  ] as const;

  for (const adjType of types) {
    const prop = fStore.proposeFinancialAdjustment(emp.session.signedToken, {
      billNo: bill.billNo,
      adjustmentType: adjType,
      proposedAdjustmentAmount: 75.25,
      reason: `Testing ${adjType} adjustment calculation`
    });
    assert.equal(prop.adjustmentType, adjType);
    if (adjType === 'SUPPLEMENTARY_CHARGE') {
      assert.equal(prop.proposedRevisedAmount, Number((bill.totalAmount + 75.25).toFixed(2)));
    } else {
      assert.equal(prop.proposedRevisedAmount, Number((bill.totalAmount - 75.25).toFixed(2)));
    }
    const approved = fStore.reviewFinancialAdjustment(adm.session.signedToken, prop.id, 'APPROVE', `Approved ${adjType}`);
    assert.equal(approved.status, 'APPROVED');
  }

  // Historical immutability check after all 4 adjustments
  assert.equal(JSON.stringify(INITIAL_BILLS), beforeBillsJson);
  assert.equal(JSON.stringify(INITIAL_PAYMENTS), beforePaymentsJson);
});

await (async () => {
  const fAuth = new ServerAuthService({ sessionSecret: 'phase11f_routes_and_scenarios_secret_32bytes' });
  const fStore = new ServerDataStore(fAuth);
  const cns = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.consumer, targetRole: 'consumer' });
  const emp = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const fld = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });
  const mgmt = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.management, targetRole: 'management' });
  const adm = fAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.admin, targetRole: 'admin' });

  async function callRoute(options: {
    url: string;
    method?: string;
    token?: string;
    csrf?: boolean;
    body?: unknown;
  }): Promise<{ statusCode: number; payload: Record<string, unknown> }> {
    const chunks: Buffer[] = [];
    if (options.body !== undefined) {
      chunks.push(Buffer.from(typeof options.body === 'string' ? options.body : JSON.stringify(options.body), 'utf8'));
    }
    const req = {
      url: options.url,
      method: options.method || 'GET',
      headers: {
        ...(options.token ? { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(options.token)}` } : {}),
        ...(options.csrf !== false ? { 'x-vidyutflow-csrf': '1' } : {})
      },
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield chunk;
      }
    } as unknown as IncomingMessage;

    let responseBody = '';
    const res = {
      statusCode: 200,
      setHeader() {},
      writeHead(code: number) { res.statusCode = code; },
      end(data?: string) { responseBody = data || ''; }
    };

    const handled = await handleMeterReadingRoute(req, res as unknown as ServerResponse, fStore);
    assert.equal(handled, true, `Route ${options.url} must be handled by handleMeterReadingRoute`);
    return { statusCode: res.statusCode, payload: responseBody ? JSON.parse(responseBody) : {} };
  }

  // Verify unauthenticated (401), missing CSRF (403), unsupported method (405), and malformed JSON (400)
  const unauthRes = await callRoute({ url: '/api/meter-readings', method: 'GET' });
  assert.equal(unauthRes.statusCode, 401);

  const noCsrfRes = await callRoute({ url: '/api/meter-readings', method: 'POST', token: cns.session.signedToken, csrf: false, body: {} });
  assert.equal(noCsrfRes.statusCode, 403);
  assert.equal(noCsrfRes.payload.code, 'CSRF_INVALID');

  const badMethodRes = await callRoute({ url: '/api/meter-readings/metrics', method: 'DELETE', token: adm.session.signedToken });
  assert.equal(badMethodRes.statusCode, 405);
  assert.equal(badMethodRes.payload.code, 'METHOD_NOT_ALLOWED');

  const badJsonRes = await callRoute({ url: '/api/meter-readings', method: 'POST', token: cns.session.signedToken, body: '{broken-json' });
  assert.equal(badJsonRes.statusCode, 400);
  assert.equal(badJsonRes.payload.code, 'INVALID_JSON');

  // Verify Canonical vs Alias Route Equivalence
  const canonAnom = await callRoute({ url: '/api/meter-readings/anomalies', token: emp.session.signedToken });
  const aliasAnom = await callRoute({ url: '/api/meter-anomalies', token: emp.session.signedToken });
  assert.equal(canonAnom.statusCode, 200);
  assert.deepEqual(canonAnom.payload, aliasAnom.payload);

  const canonRev = await callRoute({ url: '/api/meter-readings/billing-reviews', token: emp.session.signedToken });
  const aliasRev = await callRoute({ url: '/api/billing-reviews', token: emp.session.signedToken });
  assert.equal(canonRev.statusCode, 200);
  assert.deepEqual(canonRev.payload, aliasRev.payload);

  const canonAdj = await callRoute({ url: '/api/meter-readings/adjustments', token: adm.session.signedToken });
  const aliasAdj = await callRoute({ url: '/api/financial-adjustments', token: adm.session.signedToken });
  assert.equal(canonAdj.statusCode, 200);
  assert.deepEqual(canonAdj.payload, aliasAdj.payload);

  const canonMetrics = await callRoute({ url: '/api/meter-readings/metrics', token: mgmt.session.signedToken });
  const aliasMetrics = await callRoute({ url: '/api/meter-metrics', token: mgmt.session.signedToken });
  assert.equal(canonMetrics.statusCode, 200);
  assert.deepEqual(canonMetrics.payload, aliasMetrics.payload);

  const canonThresh = await callRoute({ url: '/api/meter-readings/thresholds', token: adm.session.signedToken });
  const aliasThresh = await callRoute({ url: '/api/meter-thresholds', token: adm.session.signedToken });
  assert.equal(canonThresh.statusCode, 200);
  assert.deepEqual(canonThresh.payload, aliasThresh.payload);

  const canonVal = await callRoute({ url: `/api/meter-readings/validate-bill?billNo=${INITIAL_BILLS[0].billNo}`, token: cns.session.signedToken });
  const aliasVal = await callRoute({ url: `/api/bills/validate?billNo=${INITIAL_BILLS[0].billNo}`, token: cns.session.signedToken });
  assert.equal(canonVal.statusCode, 200);
  assert.deepEqual(canonVal.payload, aliasVal.payload);

  console.log('✓ Phase 11F API route equivalence, auth/CSRF enforcement, malformed JSON handling, and HTTP 405 method validation verified');

  // Execute all 15 Competition Demo Acceptance Scenarios end-to-end
  // Scenario 1: Consumer normal self-reading submission and employee approval
  const scen1Sub = fStore.submitMeterReading(cns.session.signedToken, {
    clientUuid: 'scen-01-normal-reading',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '015000',
    readingKwh: 15000,
    multiplier: 1,
    readingAt: '2026-10-15T10:00:00.000Z'
  });
  const scen1App = fStore.reviewMeterReading(emp.session.signedToken, scen1Sub.id, 'APPROVE', 'Scenario 1 verified normal consumption');
  assert.equal(scen1App.status, 'APPROVED');

  // Scenario 2: Blurry/ambiguous meter photo with crop, manual correction, and review note
  const ambiguousNotices = detectAmbiguousDigits('015B20', '015820');
  assert.ok(ambiguousNotices.length >= 1);
  const scen2Sub = fStore.submitMeterReading(cns.session.signedToken, {
    clientUuid: 'scen-02-ambiguous-crop',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '015120',
    readingKwh: 15120,
    multiplier: 1,
    readingAt: '2026-10-25T10:00:00.000Z',
    ocr: {
      meterId: INITIAL_CONNECTIONS[0].meterNo,
      rawText: '015B20',
      candidateReading: '015120',
      normalizedReading: 15120,
      confidence: 62,
      requiresReview: true,
      ambiguousDigits: ambiguousNotices,
      isCropped: true,
      engineVersion: 'Tesseract 5 / tesseract.js 7.0.0',
      extractedAt: '2026-10-25T10:00:00.000Z',
      engine: 'tesseract.js'
    }
  });
  assert.ok(scen2Sub.anomalies.some(a => a.category === 'OCR_LOW_CONFIDENCE'));
  const scen2App = fStore.reviewMeterReading(emp.session.signedToken, scen2Sub.id, 'APPROVE', 'Scenario 2 cropped display verified against manual correction');
  assert.equal(scen2App.status, 'APPROVED');

  // Scenario 3: High-consumption spike detection, employee investigation, and resolution
  const scen3Sub = fStore.submitMeterReading(cns.session.signedToken, {
    clientUuid: 'scen-03-high-spike',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '019500',
    readingKwh: 19500,
    multiplier: 1,
    readingAt: '2026-11-05T10:00:00.000Z'
  });
  assert.ok(scen3Sub.anomalies.some(a => a.category === 'HIGH_CONSUMPTION'));
  const scen3Case = fStore.getAnomalyCases(emp.session.signedToken).find(c => c.readingId === scen3Sub.id)!;
  const scen3Inv = fStore.transitionAnomalyStatus(emp.session.signedToken, scen3Case.id, 'UNDER_INVESTIGATION', 'Scenario 3 investigating spike');
  assert.equal(scen3Inv.status, 'UNDER_INVESTIGATION');
  const scen3Res = fStore.transitionAnomalyStatus(emp.session.signedToken, scen3Case.id, 'APPROVED', 'Scenario 3 verified seasonal wedding load');
  assert.equal(scen3Res.status, 'APPROVED');

  // Scenario 4: Decreasing reading without rollover/replacement blocked from approval
  const scen4Sub = fStore.submitMeterReading(cns.session.signedToken, {
    clientUuid: 'scen-04-decreasing-blocked',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '012000',
    readingKwh: 12000,
    multiplier: 1,
    readingAt: '2026-11-06T10:00:00.000Z'
  });
  assert.ok(scen4Sub.anomalies.some(a => a.category === 'DECREASING_READING' && a.severity === 'HIGH'));
  assert.throws(
    () => fStore.reviewMeterReading(emp.session.signedToken, scen4Sub.id, 'APPROVE', 'Attempting to approve decreasing reading'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'METER_READING_REQUIRES_REVIEW'
  );

  // Scenario 5: Valid rollover after admin rollover configuration
  fStore.setMeterConfiguration(adm.session.signedToken, {
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    multiplier: 1,
    decimalPlaces: 0,
    rolloverAt: 100000
  });
  const scen5Calc = calculateMeterConsumption({
    current: 150,
    previous: 99900,
    previousAt: '2026-09-01',
    currentAt: '2026-11-01',
    multiplier: 1,
    rolloverAt: 100000
  });
  assert.equal(scen5Calc.units, 250);
  assert.equal(scen5Calc.event, 'rollover');

  // Scenario 6: Duplicate reading submission blocked (409 DUPLICATE_READING) while idempotent retry returns original
  const scen6Retry = fStore.submitMeterReading(cns.session.signedToken, {
    clientUuid: 'scen-01-normal-reading',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '015000',
    readingKwh: 15000,
    multiplier: 1,
    readingAt: '2026-10-15T10:00:00.000Z'
  });
  assert.equal(scen6Retry.id, scen1Sub.id);
  assert.throws(
    () => fStore.submitMeterReading(cns.session.signedToken, {
      clientUuid: 'scen-06-new-uuid-same-reading',
      consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
      meterNo: INITIAL_CONNECTIONS[0].meterNo,
      displayedReading: '015000',
      readingKwh: 15000,
      multiplier: 1,
      readingAt: '2026-10-15T10:00:00.000Z'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'DUPLICATE_READING'
  );

  // Scenario 7: Field engineer offline meter reading queued and replayed idempotently
  clearOfflineFieldQueue();
  const queuedItem = await enqueueOfflineMeterReading({
    clientUuid: 'scen-07-offline-field-uuid',
    requestId: 'WO-2026-901',
    title: 'Offline Field Meter Verification',
    actorEmail: fld.session.user.email,
    meterReading: {
      consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
      meterNo: INITIAL_CONNECTIONS[0].meterNo,
      displayedReading: '015310',
      readingKwh: 15310,
      multiplier: 1,
      readingAt: '2026-11-07T10:00:00.000Z'
    }
  });
  assert.equal(queuedItem.sync_state, 'PENDING');
  assert.equal(loadFieldQueue().length, 1);
  const replayedRecord = fStore.submitMeterReading(fld.session.signedToken, {
    clientUuid: queuedItem.client_uuid,
    ...queuedItem.meter_reading!
  });
  const duplicateReplay = fStore.submitMeterReading(fld.session.signedToken, {
    clientUuid: queuedItem.client_uuid,
    ...queuedItem.meter_reading!
  });
  assert.equal(replayedRecord.id, duplicateReplay.id);
  clearOfflineFieldQueue();

  // Scenario 8: Employee requests re-read and Field Engineer receives notification
  const scen8Reread = fStore.reviewMeterReading(emp.session.signedToken, replayedRecord.id, 'REREAD', 'Scenario 8 requesting field re-read');
  assert.equal(scen8Reread.status, 'REREAD_REQUESTED');
  assert.ok(fStore.getMeterNotifications(fld.session.signedToken).some(n => n.id === `NOT-MR-REREAD-FLD-${replayedRecord.id}`));

  // Scenario 9: Read-only bill validation against Phase 9 canonical tariff engine
  const scen9Bill = fStore.getBillByNumber(cns.session.signedToken, INITIAL_BILLS[0].billNo);
  const scen9Conn = fStore.getConnectionByNumber(cns.session.signedToken, scen9Bill.consumerNo);
  const scen9Val = validateExistingBill({
    bill: scen9Bill,
    connection: scen9Conn,
    allBills: fStore.getBills(cns.session.signedToken),
    payments: fStore.getPayments(cns.session.signedToken),
    meterReadings: fStore.getMeterReadings(cns.session.signedToken)
  });
  assert.equal(scen9Val.billNo, INITIAL_BILLS[0].billNo);
  assert.ok(Array.isArray(scen9Val.comparison) && scen9Val.comparison.length >= 5);

  // Scenario 10: Consumer submits billing review request and tracks status timeline
  const scen10Rev = fStore.createConsumerBillingReview(cns.session.signedToken, {
    billNo: INITIAL_BILLS[0].billNo,
    category: 'TARIFF_MISMATCH',
    description: 'Scenario 10 tariff slab check request',
    clientUuid: 'scen-10-cbr-uuid'
  });
  assert.ok(scen10Rev.statusHistory.length >= 1);

  // Scenario 11: Employee adds internal investigation note and consumer cannot see it
  fStore.transitionBillingReview(
    emp.session.signedToken,
    scen10Rev.id,
    'UNDER_INVESTIGATION',
    'SCENARIO_11_CONFIDENTIAL_INTERNAL_NOTE_ONLY_FOR_STAFF',
    'Scenario 11 public update for consumer'
  );
  const cnsView11 = fStore.getConsumerBillingReviewById(cns.session.signedToken, scen10Rev.id);
  assert.equal('internalStaffNotes' in cnsView11, false);
  assert.equal(JSON.stringify(cnsView11).includes('SCENARIO_11_CONFIDENTIAL_INTERNAL_NOTE_ONLY_FOR_STAFF'), false);

  // Scenario 12: Employee proposes financial adjustment and Admin approves it while original bill remains unchanged
  const billBefore12 = JSON.stringify(fStore.getBillByNumber(adm.session.signedToken, INITIAL_BILLS[0].billNo));
  const scen12Prop = fStore.proposeFinancialAdjustment(emp.session.signedToken, {
    billNo: INITIAL_BILLS[0].billNo,
    reviewRequestId: scen10Rev.id,
    adjustmentType: 'SLAB_CORRECTION',
    revisedUnits: INITIAL_BILLS[0].unitsConsumed - 20,
    reason: 'Scenario 12 slab recalculation'
  });
  const scen12App = fStore.reviewFinancialAdjustment(adm.session.signedToken, scen12Prop.id, 'APPROVE', 'Scenario 12 approved by Admin');
  assert.equal(scen12App.status, 'APPROVED');
  assert.equal(JSON.stringify(fStore.getBillByNumber(adm.session.signedToken, INITIAL_BILLS[0].billNo)), billBefore12);

  // Scenario 13: Proposer attempts self-approval and is blocked
  const scen13AdminProp = fStore.proposeFinancialAdjustment(adm.session.signedToken, {
    billNo: INITIAL_BILLS[0].billNo,
    adjustmentType: 'CREDIT_CONCESSION',
    proposedAdjustmentAmount: 50,
    reason: 'Scenario 13 self-approval guard check'
  });
  assert.throws(
    () => fStore.reviewFinancialAdjustment(adm.session.signedToken, scen13AdminProp.id, 'APPROVE', 'Self-approving'),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'SEPARATION_OF_DUTIES_VIOLATION'
  );

  // Scenario 14: Management views aggregate integrity analytics without PII
  const scen14Metrics = fStore.getMeterMetrics(mgmt.session.signedToken);
  assert.ok(scen14Metrics.totalReadings >= 1);
  assert.equal(JSON.stringify(scen14Metrics).includes(INITIAL_CONNECTIONS[0].consumerNo), false);

  // Scenario 15: Language switch across English, Gujarati, Hindi, and Marathi updates Phase 11 UI and notifications cleanly
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    assert.ok(translations[lang].meterPhase11.wsTitle.length > 0);
    const statusLoc = localizePhase11Status('CORRECTED_THROUGH_ADJUSTMENT', lang);
    assert.ok(statusLoc.length > 0);
  }
  console.log('✓ All 15 Phase 11F Competition Demo Acceptance Scenarios passed deterministically');
})();

console.log('\nAll Phase 11A, 11B, 11C, 11D, 11E, and 11F tests passed successfully.');


