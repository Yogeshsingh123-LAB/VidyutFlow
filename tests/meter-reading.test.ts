import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ServerAuthService, AuthSecurityError, SESSION_COOKIE_NAME } from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { createProductionRequestHandler } from '../src/server/prodServer';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { INITIAL_CONNECTIONS, INITIAL_BILLS, INITIAL_PAYMENTS, PHASE11_DEMO_SCENARIOS } from '../src/data/mockData';
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
  verifyImageMagicBytes,
  analyzeImageQuality,
  rankOcrCandidates,
  sanitizeCropBox,
  computeCropPixelCoordinates,
  detectAmbiguousDigits,
  AMBIGUOUS_CHAR_MAP
} from '../src/services/meterOcr';
import { ImageCapture } from '../src/components/common/ImageCapture';
import { OCRExtractionViewer } from '../src/components/common/OCRExtractionViewer';
import { EmployeeReadingApproval } from '../src/components/employee/EmployeeReadingApproval';
import { AnomalyDashboard } from '../src/components/common/AnomalyDashboard';
import {
  detectConsumptionAnomalies as detectConsumptionAnomalies11D,
  detectBillingAnomalies
} from '../src/utils/anomalyDetection';
import { calculateConfigurableCycleTariffBreakdown } from '../src/utils/billingEngine';
import {
  validateMeterIdentity,
  validateReadingTimestamps,
  validateMeterReplacement,
  calculateConsumptionWithEvents,
  canApproveMeterReading
} from '../src/utils/meterValidation';
import type { AuditableMeterReplacementEvent } from '../src/types/meterReading';
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
import {
  toCanonicalAnomalyStatus,
  toDisplayAnomalyStatus,
  mapStructuredCaseToAnomaly,
  type MeterOCRResult,
  type Anomaly
} from '../src/types/meterReading';
import { uploadMeterPhoto, submitOcrResult } from '../src/services/meterReadingService';
import { fetchAnomalies, updateAnomalyStatus } from '../src/services/anomalyService';

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

  // Idempotency: same clientUuid + same actor + same payload returns the identical review
  const duplicateUuid = p11Store.createConsumerBillingReview(consumer.session.signedToken, {
    billNo: targetBill.billNo,
    category: 'CONSUMPTION_DISPUTE',
    description: 'Billed units reflect anomalous spike during our vacation period.',
    clientUuid: 'p11c-cbr-uuid-0001'
  });
  assert.equal(duplicateUuid.id, review.id);

  // Idempotency conflict: reusing the same clientUuid with a modified payload returns 409 IDEMPOTENCY_CONFLICT
  assert.throws(
    () => p11Store.createConsumerBillingReview(consumer.session.signedToken, {
      billNo: targetBill.billNo,
      category: 'CONSUMPTION_DISPUTE',
      description: 'Modified payload with same clientUuid must trigger 409 conflict',
      clientUuid: 'p11c-cbr-uuid-0001'
    }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'IDEMPOTENCY_CONFLICT'
  );

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

check('Phase 11A: encrypted photo vault, actor-scoped idempotency conflict (409), append-only histories, and typed contracts', () => {
  const store11a = new ServerDataStore(auth);
  const conn = INITIAL_CONNECTIONS[0];
  const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 1. Standalone encrypted photo upload and AES-256-GCM at-rest verification
  const uploadedPhoto = store11a.uploadMeterPhoto(consumer.session.signedToken, {
    consumerNo: conn.consumerNo,
    meterNo: conn.meterNo,
    photoDataUrl: validPng,
    clientUuid: 'p11a-photo-uuid-001'
  });
  assert.ok(uploadedPhoto.photoId.startsWith('MPH-'));
  assert.equal(uploadedPhoto.encryptionMode, 'AES-256-GCM');
  const vaultMeta = store11a.getEncryptedPhotoVaultMetadata(uploadedPhoto.photoId);
  assert.ok(vaultMeta, 'Vault metadata should exist for uploaded photo');
  assert.ok(vaultMeta!.ciphertextHex.length > 0);
  // Ciphertext must not contain the raw PNG base64 prefix
  assert.equal(vaultMeta!.ciphertextHex.includes('iVBORw0KGgo'), false);

  // Idempotent photo upload retry with identical actor + payload returns original photoId
  const retryPhoto = store11a.uploadMeterPhoto(consumer.session.signedToken, {
    consumerNo: conn.consumerNo,
    meterNo: conn.meterNo,
    photoDataUrl: validPng,
    clientUuid: 'p11a-photo-uuid-001'
  });
  assert.equal(retryPhoto.photoId, uploadedPhoto.photoId);

  // Photo upload UUID reuse by a different actor returns 409 IDEMPOTENCY_CONFLICT
  assert.throws(
    () =>
      store11a.uploadMeterPhoto(employee.session.signedToken, {
        consumerNo: conn.consumerNo,
        meterNo: conn.meterNo,
        photoDataUrl: validPng,
        clientUuid: 'p11a-photo-uuid-001'
      }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'IDEMPOTENCY_CONFLICT'
  );

  // 2. Meter reading submission idempotency conflict (409) on payload or actor mismatch
  const sub1 = store11a.submitMeterReading(consumer.session.signedToken, {
    consumerNo: conn.consumerNo,
    meterNo: conn.meterNo,
    displayedReading: '015310',
    readingKwh: 15310,
    readingAt: '2026-04-12T10:00:00.000Z',
    clientUuid: 'p11a-reading-uuid-001',
    multiplier: 1,
    photoDataUrl: validPng
  });
  assert.ok(sub1.id.startsWith('MR-'));
  assert.ok(sub1.photoId);
  const readingPhotoMeta = store11a.getEncryptedPhotoVaultMetadata(sub1.photoId!);
  assert.ok(readingPhotoMeta && readingPhotoMeta.ciphertextHex.length > 0);
  assert.equal(store11a.getMeterPhoto(consumer.session.signedToken, sub1.id), validPng);

  // Identical retry returns same reading ID
  const sub1Retry = store11a.submitMeterReading(consumer.session.signedToken, {
    consumerNo: conn.consumerNo,
    meterNo: conn.meterNo,
    displayedReading: '015310',
    readingKwh: 15310,
    readingAt: '2026-04-12T10:00:00.000Z',
    clientUuid: 'p11a-reading-uuid-001',
    multiplier: 1,
    photoDataUrl: validPng
  });
  assert.equal(sub1Retry.id, sub1.id);

  // Same clientUuid with different readingKwh returns 409 IDEMPOTENCY_CONFLICT
  assert.throws(
    () =>
      store11a.submitMeterReading(consumer.session.signedToken, {
        consumerNo: conn.consumerNo,
        meterNo: conn.meterNo,
        displayedReading: '015399',
        readingKwh: 15399,
        readingAt: '2026-04-12T10:00:00.000Z',
        clientUuid: 'p11a-reading-uuid-001',
        multiplier: 1
      }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'IDEMPOTENCY_CONFLICT'
  );

  // Same clientUuid by different actor (assigned field engineer) returns 409 IDEMPOTENCY_CONFLICT
  const fieldActor = auth.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });
  assert.throws(
    () =>
      store11a.submitMeterReading(fieldActor.session.signedToken, {
        consumerNo: conn.consumerNo,
        meterNo: conn.meterNo,
        displayedReading: '015310',
        readingKwh: 15310,
        readingAt: '2026-04-12T10:00:00.000Z',
        clientUuid: 'p11a-reading-uuid-001',
        multiplier: 1
      }),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 409 && err.code === 'IDEMPOTENCY_CONFLICT'
  );

  // 3. Append-only reading review history & meter configuration version history
  const reviewed = store11a.reviewMeterReading(
    employee.session.signedToken,
    sub1.id,
    'REREAD',
    'Requesting verification before final approval'
  );
  assert.ok(Array.isArray(reviewed.reviewHistory) && reviewed.reviewHistory.length >= 1);
  assert.equal(reviewed.reviewHistory!.at(-1)!.action, 'REREAD');

  const cfgUpdated = store11a.setMeterConfiguration(admin.session.signedToken, {
    consumerNo: conn.consumerNo,
    multiplier: 2,
    decimalPlaces: 1,
    rolloverAt: 999999
  });
  assert.equal(cfgUpdated.version, 2);
  assert.ok(Array.isArray(cfgUpdated.history) && cfgUpdated.history.length >= 2);

  // 4. Phase 11 typed contracts (types/meterReading.ts, services/meterReadingService.ts, services/anomalyService.ts)
  const sampleOcr: MeterOCRResult = {
    meterId: conn.meterNo,
    rawText: 'MTR 015310 KWH',
    candidateReading: '015310',
    normalizedReading: 15310,
    confidence: 94.5,
    requiresReview: false,
    engineVersion: 'local-tesseract-1.0',
    extractedAt: '2026-04-12T10:00:00.000Z'
  };
  assert.equal(sampleOcr.normalizedReading, 15310);
  assert.equal(toCanonicalAnomalyStatus('Pending review'), 'PENDING_REVIEW');
  assert.equal(toCanonicalAnomalyStatus('Corrected'), 'CORRECTED_THROUGH_ADJUSTMENT');
  assert.equal(toDisplayAnomalyStatus('UNDER_INVESTIGATION'), 'Under investigation');
  assert.equal(toDisplayAnomalyStatus('CORRECTED_THROUGH_ADJUSTMENT'), 'Corrected');

  const structuredCases = store11a.getAnomalyCases(employee.session.signedToken);
  assert.ok(structuredCases.length > 0);
  const mappedAnomaly: Anomaly = mapStructuredCaseToAnomaly(structuredCases[0]);
  assert.equal(mappedAnomaly.anomalyId, structuredCases[0].id);
  assert.ok(typeof mappedAnomaly.relatedId === 'string' && mappedAnomaly.relatedId.length > 0);
  assert.equal(typeof uploadMeterPhoto, 'function');
  assert.equal(typeof submitOcrResult, 'function');
  assert.equal(typeof fetchAnomalies, 'function');
  assert.equal(typeof updateAnomalyStatus, 'function');
});

check('Phase 11B: image validation, magic bytes, quality indicators, candidate ranking, bounding boxes, and offline assets', () => {
  // 1. Magic bytes verification (JPEG, PNG, WebP)
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const webpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // 'RIFF'
    0x24, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50  // 'WEBP'
  ]);
  const invalidHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

  assert.equal(verifyImageMagicBytes(jpegHeader).valid, true);
  assert.equal(verifyImageMagicBytes(jpegHeader).format, 'jpeg');
  assert.equal(verifyImageMagicBytes(pngHeader).valid, true);
  assert.equal(verifyImageMagicBytes(pngHeader).format, 'png');
  assert.equal(verifyImageMagicBytes(webpHeader).valid, true);
  assert.equal(verifyImageMagicBytes(webpHeader).format, 'webp');
  assert.equal(verifyImageMagicBytes(invalidHeader).valid, false);

  // 2. Advisory Image Quality Indicators (blur, glare, contrast, tilt)
  const mockSharpData: ImageData = {
    width: 200,
    height: 100,
    data: new Uint8ClampedArray(200 * 100 * 4),
    colorSpace: 'srgb'
  };
  // Alternate black and white vertical bars to simulate sharp high-contrast edges
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 200; x++) {
      const idx = (y * 200 + x) * 4;
      const v = x % 4 === 0 ? 255 : 10;
      mockSharpData.data[idx] = v;
      mockSharpData.data[idx + 1] = v;
      mockSharpData.data[idx + 2] = v;
      mockSharpData.data[idx + 3] = 255;
    }
  }
  const qualitySharp = analyzeImageQuality(mockSharpData);
  assert.equal(qualitySharp.isBlurry, false);
  assert.equal(qualitySharp.isLowContrast, false);

  // Glare / Overexposure check
  const mockGlareData: ImageData = {
    width: 100,
    height: 100,
    data: new Uint8ClampedArray(100 * 100 * 4),
    colorSpace: 'srgb'
  };
  // Fill 25% with full 255 white pixels
  for (let i = 0; i < 2500; i++) {
    const idx = i * 4;
    mockGlareData.data[idx] = 255;
    mockGlareData.data[idx + 1] = 255;
    mockGlareData.data[idx + 2] = 255;
    mockGlareData.data[idx + 3] = 255;
  }
  const qualityGlare = analyzeImageQuality(mockGlareData);
  assert.equal(qualityGlare.hasGlare, true);
  assert.ok(qualityGlare.warnings.some(w => w.includes('Glare')));

  // 3. Domain-specific OCR Candidate Ranking
  const wordBoxes = [
    { text: 'MTR-2024', confidence: 95, bbox: { x0: 10, y0: 10, x1: 80, y1: 30 } },
    { text: '015310', confidence: 88, bbox: { x0: 90, y0: 100, x1: 220, y1: 140 } },
    { text: '2026', confidence: 98, bbox: { x0: 10, y0: 200, x1: 60, y1: 220 } },
    { text: '12', confidence: 70, bbox: { x0: 240, y0: 100, x1: 260, y1: 140 } }
  ];
  // Configured rule: 5 digits before decimal, 1 decimal place (total 6 digits)
  const ranked = rankOcrCandidates(wordBoxes, {
    digitsBeforeDecimal: 5,
    decimalPlaces: 1
  });
  assert.ok(ranked.length >= 3);
  // '015310' (6 digits) should outrank '2026' or '12' or 'MTR-2024'
  assert.equal(ranked[0].displayedReading, '015310');
  assert.equal(ranked[0].normalizedReading, 15310);
  assert.ok(ranked[0].score > ranked[1].score);

  // 4. Offline Tesseract Vendor Asset Availability
  const vendorDir = path.resolve(process.cwd(), 'public/vendor/tesseract');
  assert.ok(fs.existsSync(path.join(vendorDir, 'worker.min.js')), 'worker.min.js must exist locally');
  assert.ok(fs.existsSync(path.join(vendorDir, 'eng.traineddata')), 'eng.traineddata must exist locally for 100% offline first-use OCR');
  assert.ok(fs.statSync(path.join(vendorDir, 'eng.traineddata')).size > 10 * 1024 * 1024, 'eng.traineddata must be a valid complete model (>10MB)');

  // 5. Component exports and localization check
  assert.equal(typeof ImageCapture, 'function');
  assert.equal(typeof OCRExtractionViewer, 'function');

  // Verify Phase 11B localization keys in meterPhase11 dictionary
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = METER_PHASE11_TRANSLATIONS[lang];
    assert.ok(dict.wsQualityGlare.length > 0);
    assert.ok(dict.wsQualityBlur.length > 0);
    assert.ok(dict.wsQualityLowContrast.length > 0);
    assert.ok(dict.wsQualityTilt.length > 0);
    assert.ok(dict.catOcrManualOverride.length > 0);
  }
});

check('Phase 11C: Meter Identity, Consumption Validation, and Employee Approval Workflow', () => {
  // 1. Meter Identity Verification
  const idMatch = validateMeterIdentity('MTR-2024-884102', 'MTR-2024-884102');
  assert.equal(idMatch.matches, true);
  assert.equal(idMatch.anomaly, undefined);

  const idMismatch = validateMeterIdentity('MTR-2024-884102', 'MTR-9999-123456');
  assert.equal(idMismatch.matches, false);
  assert.ok(idMismatch.anomaly);
  assert.equal(idMismatch.anomaly?.category, 'IDENTITY_MISMATCH');
  assert.equal(idMismatch.anomaly?.severity, 'HIGH');

  const idUnreadable = validateMeterIdentity('MTR-2024-884102', '');
  assert.equal(idUnreadable.matches, false);
  assert.equal(idUnreadable.anomaly?.category, 'IDENTITY_UNREADABLE');
  assert.equal(idUnreadable.anomaly?.severity, 'REVIEW');

  // 2. Reading Timestamp Ordering & Future Timestamp Drift
  const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const driftCheck = validateReadingTimestamps({
    currentReadingAt: futureDate,
    previousReadingAt: '2026-10-01T00:00:00Z',
    maxFutureDriftMinutes: 5
  });
  assert.equal(driftCheck.valid, false);
  assert.equal(driftCheck.code, 'FUTURE_TIMESTAMP_DRIFT');

  const outOfOrderCheck = validateReadingTimestamps({
    currentReadingAt: '2026-09-15T00:00:00Z',
    previousReadingAt: '2026-10-01T00:00:00Z'
  });
  assert.equal(outOfOrderCheck.valid, false);
  assert.equal(outOfOrderCheck.code, 'OUT_OF_ORDER');

  const validTimeCheck = validateReadingTimestamps({
    currentReadingAt: '2026-11-01T00:00:00Z',
    previousReadingAt: '2026-10-01T00:00:00Z'
  });
  assert.equal(validTimeCheck.valid, true);
  assert.equal(validTimeCheck.days, 31);

  // 3. Auditable Meter Replacement Event & Consumption
  const replacementEvent: AuditableMeterReplacementEvent = {
    oldMeterNumber: 'MTR-OLD-100',
    oldPreviousReading: 12000,
    oldFinalReading: 12450, // 450 kWh on old meter
    replacementDate: '2026-10-15',
    newMeterNumber: 'MTR-NEW-200',
    newInitialReading: 0,
    newCurrentReading: 180, // 180 kWh on new meter
    authorizedActor: 'USR-EMP-001',
    supportingEvidence: 'Field work order WO-REPL-881 signed by Vikram Zala'
  };

  const replValidation = validateMeterReplacement(replacementEvent, { multiplier: 1.0 });
  assert.equal(replValidation.valid, true);
  assert.equal(replValidation.units, 630); // 450 + 180 = 630 kWh

  // Invalid replacement checks
  const badOldRepl = validateMeterReplacement({
    ...replacementEvent,
    oldFinalReading: 11000 // less than oldPreviousReading
  });
  assert.equal(badOldRepl.valid, false);

  const badNewRepl = validateMeterReplacement({
    ...replacementEvent,
    newCurrentReading: -5 // less than newInitialReading
  });
  assert.equal(badNewRepl.valid, false);

  // 4. Consumption Calculation with Events (ordinary, rollover, replacement)
  const ordinaryCalc = calculateConsumptionWithEvents({
    current: 15300,
    previous: 14800,
    multiplier: 1,
    previousAt: '2026-10-01T00:00:00Z',
    currentAt: '2026-10-31T00:00:00Z'
  });
  assert.equal(ordinaryCalc.units, 500);
  assert.equal(ordinaryCalc.event, 'ordinary');

  // Decreasing reading without event throws
  assert.throws(
    () => calculateConsumptionWithEvents({
      current: 14000,
      previous: 14800,
      multiplier: 1,
      previousAt: '2026-10-01T00:00:00Z',
      currentAt: '2026-10-31T00:00:00Z'
    }),
    (err: unknown) => err instanceof MeterReadingError && err.code === 'DECREASING_READING'
  );

  // Configured dial rollover
  const rolloverCalc = calculateConsumptionWithEvents({
    current: 150,
    previous: 99800,
    rolloverAt: 100000,
    multiplier: 1,
    previousAt: '2026-10-01T00:00:00Z',
    currentAt: '2026-10-31T00:00:00Z'
  });
  assert.equal(rolloverCalc.units, 350); // (100000 - 99800) + 150 = 350
  assert.equal(rolloverCalc.event, 'rollover');

  // Replacement calculation
  const replCalc = calculateConsumptionWithEvents({
    current: 180,
    previous: 12000,
    multiplier: 1,
    previousAt: '2026-10-01T00:00:00Z',
    currentAt: '2026-10-31T00:00:00Z',
    replacementEvent
  });
  assert.equal(replCalc.units, 630);
  assert.equal(replCalc.event, 'replacement');
  assert.equal(replCalc.breakdown?.oldMeterUnits, 450);
  assert.equal(replCalc.breakdown?.newMeterUnits, 180);

  // 5. Aggregate Approval Gating & Maker-Checker Separation of Duties
  const baseReadingRecord = {
    id: 'MR-TEST-001',
    clientUuid: 'uuid-test-001',
    consumerNo: '04281-99231',
    connectionId: 'CONN-04281-99231',
    meterNo: 'MTR-2024-884102',
    displayedReading: '15400',
    readingKwh: 15400,
    multiplier: 1,
    readingAt: '2026-11-01T00:00:00Z',
    previousReadingKwh: 14820,
    consumedUnits: 580,
    intervalDays: 31,
    status: 'PENDING_REVIEW' as const,
    submittedById: 'USR-FLD-001',
    submittedBy: 'Vikram Zala',
    submittedRole: 'field',
    submittedAt: '2026-11-01T08:00:00Z',
    anomalies: [],
    demo: true as const
  };

  // Gate check: Consumers cannot approve
  const consumerGate = canApproveMeterReading(
    baseReadingRecord,
    { actorId: 'USR-CNS-001', name: 'Smt. Meenaben Patel', role: 'consumer' },
    { subdivision: 'Mehsana City North', meterNo: 'MTR-2024-884102' }
  );
  assert.equal(consumerGate.canApprove, false);
  assert.ok(consumerGate.blockerReasons.some(r => r.includes('forbidden')));

  // Gate check: Maker-checker submitter cannot approve own reading
  const selfReviewGate = canApproveMeterReading(
    baseReadingRecord,
    { actorId: 'USR-FLD-001', name: 'Vikram Zala', role: 'employee', subdivision: 'Mehsana City North' },
    { subdivision: 'Mehsana City North', meterNo: 'MTR-2024-884102' }
  );
  assert.equal(selfReviewGate.canApprove, false);
  assert.ok(selfReviewGate.blockerReasons.some(r => r.includes('Maker-Checker')));

  // Gate check: Employee from different subdivision cannot approve
  const crossSubdivisionGate = canApproveMeterReading(
    baseReadingRecord,
    { actorId: 'USR-EMP-GND', name: 'Other Officer', role: 'employee', subdivision: 'Gandhinagar Sub-Division 2' },
    { subdivision: 'Mehsana City North', meterNo: 'MTR-2024-884102' }
  );
  assert.equal(crossSubdivisionGate.canApprove, false);
  assert.ok(crossSubdivisionGate.blockerReasons.some(r => r.includes('Subdivision mismatch')));

  // Gate check: Unresolved HIGH anomaly blocks approval
  const readingWithHigh = {
    ...baseReadingRecord,
    anomalies: [
      {
        id: 'ANO-HIGH-1',
        category: 'IDENTITY_MISMATCH' as const,
        severity: 'HIGH' as const,
        evidence: 'Wrong meter photographed',
        recommendedAction: 'Verify',
        detectedAt: '2026-11-01T08:00:00Z',
        status: 'OPEN' as const
      }
    ]
  };
  const highAnomalyGate = canApproveMeterReading(
    readingWithHigh,
    { actorId: 'USR-EMP-001', name: 'Priya Rathod', role: 'employee', subdivision: 'Mehsana City North' },
    { subdivision: 'Mehsana City North', meterNo: 'MTR-2024-884102' }
  );
  assert.equal(highAnomalyGate.canApprove, false);
  assert.ok(highAnomalyGate.blockerReasons.some(r => r.includes('HIGH severity')));

  // Gate check: All conditions satisfied -> Approved
  const validEmployeeGate = canApproveMeterReading(
    baseReadingRecord,
    { actorId: 'USR-EMP-001', name: 'Priya Rathod', role: 'employee', subdivision: 'Mehsana City North' },
    { subdivision: 'Mehsana City North', meterNo: 'MTR-2024-884102' }
  );
  assert.equal(validEmployeeGate.canApprove, true);
  assert.equal(validEmployeeGate.blockerReasons.length, 0);

  // 6. Server DataStore End-to-End Verification
  const authService = new ServerAuthService({ sessionSecret: 'phase11c_secret_key_32_bytes_long_ok' });
  const dataStore = new ServerDataStore(authService);
  const employeeSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const fieldSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.field, targetRole: 'field' });

  // Initial reading starts with EMPTY anomaly list (defect fix test)
  const submitInput = {
    clientUuid: 'p11c-uuid-clean-anomalies-1',
    consumerNo: '04281-99231',
    meterNo: 'MTR-2024-884102',
    displayedReading: '15180',
    readingKwh: 15180,
    multiplier: 1,
    readingAt: '2026-11-04T10:00:00Z'
  };
  const subRecord = dataStore.submitMeterReading(fieldSession.session.signedToken, submitInput);
  assert.ok(subRecord.id.startsWith('MR-'));
  // Verify submittedById is stored
  assert.equal(subRecord.submittedById, fieldSession.user.id);
  // Verify it did NOT copy closed historical anomalies from previous readings
  assert.equal(subRecord.anomalies.filter(a => a.status === 'CLOSED').length, 0);

  // Approval updates canonical connection projection without deleting history
  const connBefore = dataStore.getConnectionByNumber(employeeSession.session.signedToken, '04281-99231');
  const prevReadingKwh = connBefore.currentReadingKwh;

  const approved = dataStore.reviewMeterReading(
    employeeSession.session.signedToken,
    subRecord.id,
    'APPROVE',
    'Verified clear display matching field meter reading.'
  );
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.reviewedById, employeeSession.user.id);

  const connAfter = dataStore.getConnectionByNumber(employeeSession.session.signedToken, '04281-99231');
  assert.equal(connAfter.currentReadingKwh, 15180);
  assert.equal(connAfter.lastReadingDate, '2026-11-04T10:00:00Z');
  // Historical readings preserved
  const allReadings = dataStore.getMeterReadings(employeeSession.session.signedToken);
  assert.ok(allReadings.length >= 2);

  // Role gate: Field engineer cannot review readings (FORBIDDEN_ROLE)
  assert.throws(
    () => dataStore.reviewMeterReading(fieldSession.session.signedToken, subRecord.id, 'APPROVE', 'Field trying to review'),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'FORBIDDEN_ROLE'
  );

  // Maker-checker separation of duties: Submitter cannot review their own reading
  const selfReading = {
    ...subRecord,
    id: 'MR-TEST-SELF-REVIEW',
    clientUuid: 'p11c-uuid-self-review-test',
    submittedById: employeeSession.user.id,
    submittedBy: employeeSession.user.name,
    status: 'PENDING_REVIEW' as const
  };
  (dataStore as unknown as { meterReadings: unknown[] }).meterReadings.push(selfReading);
  assert.throws(
    () => dataStore.reviewMeterReading(employeeSession.session.signedToken, selfReading.id, 'APPROVE', 'Trying self-review'),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'SELF_REVIEW_FORBIDDEN'
  );

  // 7. Component Exports Check
  assert.equal(typeof EmployeeReadingApproval, 'function');
});

check('Phase 11D: Consumption Anomalies, Bill Verification, and Approved-Reading Billing Handoff', () => {
  const authService = new ServerAuthService();
  const dataStore = new ServerDataStore(authService);
  const employeeSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const adminSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.admin, targetRole: 'admin' });
  const consumerSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.consumer, targetRole: 'consumer' });

  const conn = INITIAL_CONNECTIONS[0]; // 04281-99231, Residential (RGPU), 2 kW, 1-Phase
  assert.ok(conn);

  // 1. EQUIVALENCE TEST: calculateDetailedUgvclBill vs Phase 9 calculateConfigurableCycleTariffBreakdown
  for (const units of [0, 50, 100, 200, 300, 620, 1200]) {
    const p9 = calculateConfigurableCycleTariffBreakdown('Residential (RGPU)', 2, units, {
      billingCycleType: 'BI_MONTHLY',
      policyMode: 'BI_MONTHLY_PROPORTIONAL_2X_DEMO'
    });
    const detailed = calculateDetailedUgvclBill(units, 'RGP_URBAN', 'bimonthly', 2, '1-Phase');

    assert.equal(detailed.netPayableAmount, p9.totalAmount, `Net payable for ${units} units must match Phase 9 exactly`);
    assert.equal(detailed.totalEnergyCharges, p9.energyCharges, `Energy charges for ${units} units must match Phase 9`);
    assert.equal(detailed.fixedCharges.amount, p9.fixedCharges, `Fixed charges for ${units} units must match Phase 9`);
    assert.equal(detailed.fpppaCharges.amount, p9.fuelPriceAdjustment, `FPPPA charges for ${units} units must match Phase 9`);
    assert.equal(detailed.electricityDuty.amount, p9.electricityDuty, `Electricity duty for ${units} units must match Phase 9`);
  }

  // Also verify Commercial NRGP equivalence
  for (const units of [100, 250, 500, 800]) {
    const p9Comm = calculateConfigurableCycleTariffBreakdown('Commercial (NRGP)', 5, units, {
      billingCycleType: 'BI_MONTHLY',
      policyMode: 'BI_MONTHLY_PROPORTIONAL_2X_DEMO'
    });
    const detailedComm = calculateDetailedUgvclBill(units, 'NRGP', 'bimonthly', 5, '3-Phase');

    assert.equal(detailedComm.netPayableAmount, p9Comm.totalAmount, `NRGP payable for ${units} units must match Phase 9`);
    assert.equal(detailedComm.totalEnergyCharges, p9Comm.energyCharges, `NRGP energy for ${units} units must match Phase 9`);
    assert.equal(detailedComm.fixedCharges.amount, p9Comm.fixedCharges, `NRGP fixed for ${units} units must match Phase 9`);
    assert.equal(detailedComm.electricityDuty.amount, p9Comm.electricityDuty, `NRGP duty for ${units} units must match Phase 9`);
  }

  // 2. CONSUMPTION ANOMALY ENGINE
  // A. Normal baseline: 300 units over 60 days with baseline = 5 kWh/day (300 units in history)
  const historicalBills = INITIAL_BILLS.filter(b => b.consumerNo === conn.consumerNo);
  const normalReading = {
    id: 'MR-NORM-1',
    consumerNo: conn.consumerNo,
    connectionId: conn.connectionId,
    meterNo: conn.meterNo,
    readingKwh: 15300,
    multiplier: 1,
    readingAt: '2026-11-04T10:00:00Z',
    candidateReading: '15300'
  };

  const normalCheck = detectConsumptionAnomalies11D({
    connection: conn,
    currentReading: normalReading,
    previousReading: { ...normalReading, id: 'MR-PREV', readingKwh: 15000, readingAt: '2026-09-05T10:00:00Z' } as never,
    historicalBills
  });
  // Normal usage should not flag high/low anomalies
  assert.ok(!normalCheck.anomalies.some(a => a.category === 'HIGH_CONSUMPTION' || a.category === 'LOW_CONSUMPTION'));

  // B. High consumption spike: 1200 units over 60 days (4x normal)
  const highReading = {
    ...normalReading,
    id: 'MR-HIGH-1',
    readingKwh: 16200,
    candidateReading: '16200'
  };
  const highCheck = detectConsumptionAnomalies11D({
    connection: conn,
    currentReading: highReading,
    previousReading: { ...normalReading, id: 'MR-PREV', readingKwh: 15000, readingAt: '2026-09-05T10:00:00Z' } as never,
    historicalBills
  });
  assert.ok(highCheck.hasAnomaly);
  const highAnomaly = highCheck.anomalies.find(a => a.category === 'HIGH_CONSUMPTION');
  assert.ok(highAnomaly, 'Must detect HIGH_CONSUMPTION anomaly');
  // CRITICAL ANTI-AI SLOP / ACCUSATION GUARD: Must never call high consumption fraud or theft!
  const highJson = JSON.stringify(highCheck).toLowerCase();
  assert.ok(!highJson.includes('fraud'), 'Explanation must NEVER label consumption increase as fraud');
  assert.ok(!highJson.includes('theft'), 'Explanation must NEVER label consumption increase as theft');
  assert.ok(highAnomaly.evidence.includes('Significant consumption increase'), 'Must use respectful engineering terms');

  // C. Unexpected zero consumption on active connection
  const zeroReading = {
    ...normalReading,
    id: 'MR-ZERO-1',
    readingKwh: 15000, // same as previous => 0 units
    candidateReading: '15000'
  };
  const zeroCheck = detectConsumptionAnomalies11D({
    connection: conn,
    currentReading: zeroReading,
    previousReading: { ...normalReading, id: 'MR-PREV', readingKwh: 15000, readingAt: '2026-09-05T10:00:00Z' } as never,
    historicalBills
  });
  assert.ok(zeroCheck.anomalies.some(a => a.category === 'ZERO_CONSUMPTION'), 'Must detect ZERO_CONSUMPTION');

  // D. Implausible delta (exceeds theoretical continuous physical load capacity: 2 kW * 24h * 60d * 1.5 = 4320 kWh)
  const impossibleReading = {
    ...normalReading,
    id: 'MR-IMP-1',
    readingKwh: 25000, // 10,000 units over 60 days on a 2 kW domestic line
    candidateReading: '25000'
  };
  const impossibleCheck = detectConsumptionAnomalies11D({
    connection: conn,
    currentReading: impossibleReading,
    previousReading: { ...normalReading, id: 'MR-PREV', readingKwh: 15000, readingAt: '2026-09-05T10:00:00Z' } as never,
    historicalBills
  });
  assert.ok(
    impossibleCheck.anomalies.some(a => a.evidence.includes('physical continuous capacity')),
    'Must flag theoretical capacity breach'
  );

  // E. Phase 10 Outage evidence attachment
  const mockOutages = [
    {
      id: 'INC-OUTAGE-MEHSANA-1',
      title: '11kV Feeder Tripping & Distribution Transformer Maintenance',
      description: 'Scheduled storm recovery on Mehsana City North feeder.',
      severity: 'CRITICAL' as const,
      module: 'Distribution & SCADA' as const,
      entityId: conn.feederId || 'FDR-MEH-01',
      entityType: 'feeder' as const,
      subdivision: conn.subdivision,
      timestamp: '2026-10-15T10:00:00Z',
      responsibleRoles: ['field' as const],
      recommendedAction: 'Inspect DTR',
      status: 'RESOLVED' as const,
      history: []
    }
  ];
  const checkWithOutage = detectConsumptionAnomalies11D({
    connection: conn,
    currentReading: { ...normalReading, readingKwh: 15050 }, // Low consumption (50 units)
    previousReading: { ...normalReading, id: 'MR-PREV', readingKwh: 15000, readingAt: '2026-09-05T10:00:00Z' } as never,
    historicalBills,
    recentOutages: mockOutages
  });
  assert.ok(checkWithOutage.outageEvidence?.recorded, 'Must attach outage evidence');
  assert.equal(checkWithOutage.outageEvidence?.incidentCount, 1);
  assert.ok(checkWithOutage.outageEvidence?.summary.includes('11kV Feeder Tripping'));

  // 3. BILLING ANOMALY ENGINE
  const canonicalCalc = calculateDetailedUgvclBill(300, 'RGP_URBAN', 'bimonthly', conn.sanctionedLoadKw, conn.phase);
  const testBill = {
    billNo: 'BILL-P11D-VERIFY-001',
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

  const billCheckResult = detectBillingAnomalies({
    bill: testBill,
    connection: conn,
    allBills: [...INITIAL_BILLS, testBill],
    payments: INITIAL_PAYMENTS
  });
  assert.equal(billCheckResult.status, 'CLEAR', 'Canonical bill matching Phase 9 must have CLEAR status');
  assert.equal(billCheckResult.difference, 0, 'Zero difference expected');

  // Tampered energy charges flags discrepancy
  const tamperedBill = {
    ...testBill,
    billNo: 'BILL-TAMPERED-001',
    energyCharges: testBill.energyCharges + 500,
    totalAmount: testBill.totalAmount + 575
  };
  const tamperedCheck = detectBillingAnomalies({
    bill: tamperedBill,
    connection: conn,
    allBills: [...INITIAL_BILLS, tamperedBill],
    payments: INITIAL_PAYMENTS
  });
  assert.equal(tamperedCheck.status, 'REVIEW');
  assert.ok((tamperedCheck.findings || []).some(f => f.category === 'TARIFF_SLAB_MISMATCH'));

  // 4. APPROVED-READING BILLING HANDOFF
  // Create an approved meter reading
  const readingForBill = {
    clientUuid: 'p11d-uuid-approved-reading-billing-1',
    consumerNo: conn.consumerNo,
    meterNo: conn.meterNo,
    displayedReading: '15400',
    readingKwh: 15400,
    multiplier: 1,
    readingAt: '2026-11-04T10:00:00Z'
  };
  const pendingSubmission = dataStore.submitMeterReading(consumerSession.session.signedToken, readingForBill);
  assert.equal(pendingSubmission.status, 'PENDING_REVIEW');

  // Attempting to issue a bill from an unapproved reading MUST throw 409
  assert.throws(
    () => dataStore.issueBillFromApprovedReading(employeeSession.session.signedToken, pendingSubmission.id),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'READING_NOT_APPROVED'
  );

  // Attempting to issue bill as Consumer MUST throw 403
  assert.throws(
    () => dataStore.issueBillFromApprovedReading(consumerSession.session.signedToken, pendingSubmission.id),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'FORBIDDEN_ROLE'
  );

  // Approve the reading as admin (maker-checker compliant)
  const approvedReading = dataStore.reviewMeterReading(
    adminSession.session.signedToken,
    pendingSubmission.id,
    'APPROVE',
    'Verified field reading for official billing handoff.'
  );
  assert.equal(approvedReading.status, 'APPROVED');

  // Now employee issues the bill
  const issueResult = dataStore.issueBillFromApprovedReading(employeeSession.session.signedToken, approvedReading.id);
  assert.ok(issueResult.created, 'Must successfully create Phase 9 bill');
  assert.ok(issueResult.bill.billNo.startsWith('BILL-'));
  assert.equal(issueResult.bill.readingId, approvedReading.id);
  assert.equal(issueResult.bill.readingProvenance, 'RECORDED');
  assert.ok(issueResult.bill.totalAmount > 0);

  // Idempotency: Issuing bill a second time for the same reading MUST return existing bill without duplicate
  const secondResult = dataStore.issueBillFromApprovedReading(employeeSession.session.signedToken, approvedReading.id);
  assert.equal(secondResult.created, false, 'Idempotent call must not create duplicate');
  assert.equal(secondResult.bill.billNo, issueResult.bill.billNo);

  // 5. APPEND-ONLY FINANCIAL ADJUSTMENT LEDGER
  const targetBill = INITIAL_BILLS[0];
  const adjProposal = dataStore.proposeFinancialAdjustment(employeeSession.session.signedToken, {
    billNo: targetBill.billNo,
    adjustmentType: 'CREDIT_CONCESSION',
    proposedAdjustmentAmount: 250,
    reason: 'Goodwill concession approved by circle executive engineer.'
  });
  assert.equal(adjProposal.status, 'PENDING_APPROVAL');

  // Cannot apply adjustment before approval
  assert.throws(
    () => dataStore.applyFinancialAdjustmentToLedger(adminSession.session.signedToken, adjProposal.id),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'ADJUSTMENT_NOT_APPROVED'
  );

  // Admin approves adjustment
  const approvedAdj = dataStore.reviewFinancialAdjustment(
    adminSession.session.signedToken,
    adjProposal.id,
    'APPROVE',
    'Administrative approval granted.'
  );
  assert.equal(approvedAdj.status, 'APPROVED');

  // Apply adjustment to ledger
  const appliedAdj = dataStore.applyFinancialAdjustmentToLedger(
    adminSession.session.signedToken,
    adjProposal.id,
    'Applied to bill ledger balance.'
  );
  assert.equal(appliedAdj.status, 'APPLIED_TO_LEDGER');

  // Attempting to re-apply throws 409
  assert.throws(
    () => dataStore.applyFinancialAdjustmentToLedger(adminSession.session.signedToken, adjProposal.id),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'ADJUSTMENT_ALREADY_APPLIED'
  );

  // 6. COMPONENT EXPORTS CHECK
  assert.equal(typeof AnomalyDashboard, 'function', 'AnomalyDashboard must be exported as a React component');
});

check('Phase 11E: Private billing review evidence photo retrieval, genuine OCR health, notifications & localization', () => {
  const authService = new ServerAuthService({ sessionSecret: 'phase11e_verification_secret_32bytes_min' });
  const dataStore = new ServerDataStore(authService);
  const consumerSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.consumer, targetRole: 'consumer' });
  const consumerBSession = authService.registerConsumer({
    name: 'Smt. Meenaben Patel',
    email: 'meena.patel@consumer.ugvcl.com',
    password: 'ConsumerB@2026!',
    mobileNumber: '+91 98250 99771'
  });
  const employeeSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const adminSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.admin, targetRole: 'admin' });
  const mgmtSession = authService.login({ ...DEFAULT_DEMO_ACCOUNTS.management, targetRole: 'management' });

  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const validPngDataUrl = `data:image/png;base64,${samplePngBase64}`;

  // Submit one OCR reading so averageConfidencePct is populated in metrics
  dataStore.submitMeterReading(consumerSession.session.signedToken, {
    clientUuid: 'p11e-ocr-reading-uuid-1',
    consumerNo: INITIAL_CONNECTIONS[0].consumerNo,
    meterNo: INITIAL_CONNECTIONS[0].meterNo,
    displayedReading: '015250',
    readingKwh: 15250,
    multiplier: 1,
    readingAt: '2026-11-04T09:00:00.000Z',
    photoDataUrl: validPngDataUrl,
    ocr: {
      meterId: INITIAL_CONNECTIONS[0].meterNo,
      rawText: '015250',
      candidateReading: '015250',
      normalizedReading: 15250,
      confidence: 94.5,
      ambiguousDigits: [],
      requiresReview: false,
      engineVersion: 'Tesseract 5 / tesseract.js 7.0.0',
      extractedAt: '2026-11-04T09:00:00.000Z',
      engine: 'tesseract.js'
    }
  });

  // 1. Submit a billing review with an evidence photo as Consumer A
  const targetBill = INITIAL_BILLS[0];
  const reviewWithPhoto = dataStore.createConsumerBillingReview(consumerSession.session.signedToken, {
    clientUuid: 'p11e-review-photo-uuid-1',
    billNo: targetBill.billNo,
    category: 'CONSUMPTION_DISPUTE',
    description: 'Requesting verification of meter photo attached.',
    photoDataUrl: validPngDataUrl
  });
  assert.ok(reviewWithPhoto.evidencePhotoId, 'Evidence photo ID must be assigned in encrypted vault');

  // Owner consumer can retrieve their own billing-review evidence photo
  const ownerPhoto = dataStore.getBillingReviewPhoto(consumerSession.session.signedToken, reviewWithPhoto.id);
  assert.equal(ownerPhoto, validPngDataUrl, 'Owner consumer must retrieve decrypted evidence photo');

  // Authorized subdivision employee can retrieve the evidence photo
  const staffPhoto = dataStore.getBillingReviewPhoto(employeeSession.session.signedToken, reviewWithPhoto.id);
  assert.equal(staffPhoto, validPngDataUrl, 'Authorized employee must retrieve decrypted evidence photo');

  // Unrelated Consumer B is strictly blocked (403 CROSS_CONSUMER_ACCESS_DENIED)
  assert.throws(
    () => dataStore.getBillingReviewPhoto(consumerBSession.session.signedToken, reviewWithPhoto.id),
    (err: unknown) => err instanceof AuthSecurityError && err.statusCode === 403 && err.code === 'CROSS_CONSUMER_ACCESS_DENIED'
  );

  // Management role is strictly blocked from viewing individual evidence photos (403 FORBIDDEN_ROLE)
  assert.throws(
    () => dataStore.getBillingReviewPhoto(mgmtSession.session.signedToken, reviewWithPhoto.id),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'FORBIDDEN_ROLE'
  );

  // 2. Genuine Admin OCR Integration Health
  const ocrHealth = dataStore.getOcrIntegrationHealth(adminSession.session.signedToken);
  assert.equal(ocrHealth.allSelfHostedAssetsPresent, true, 'All 4 self-hosted Tesseract WASM/worker/traineddata assets must be present on disk');
  assert.equal(ocrHealth.assets.length, 4);
  for (const asset of ocrHealth.assets) {
    assert.equal(asset.present, true, `Asset ${asset.filename} must be present`);
    assert.ok(asset.sizeBytes > 1000, `Asset ${asset.filename} must have non-trivial byte size`);
  }
  assert.ok(ocrHealth.telemetry.encryptedVaultPhotoCount >= 1, 'Encrypted vault photo count must reflect stored photos');

  // Non-admin/non-management roles cannot access Admin OCR integration health
  assert.throws(
    () => dataStore.getOcrIntegrationHealth(consumerSession.session.signedToken),
    (err: unknown) => err instanceof AuthSecurityError && err.code === 'FORBIDDEN_ROLE'
  );

  // 3. Management metrics include aggregate ocrQuality and appliedToLedger without any PII
  const mgtMetrics = dataStore.getMeterMetrics(mgmtSession.session.signedToken);
  assert.ok(mgtMetrics.ocrQuality, 'Management metrics must include aggregate ocrQuality');
  assert.equal(typeof mgtMetrics.ocrQuality.averageConfidencePct, 'number');
  assert.equal(typeof mgtMetrics.financialAdjustments.appliedToLedger, 'number');
  const serializedMetrics = JSON.stringify(mgtMetrics);
  assert.ok(!serializedMetrics.includes('UGVCL-'), 'Management metrics must not leak consumer numbers');

  // 4. Localization of APPLIED_TO_LEDGER and Phase 11E notifications across all 4 languages
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const statusText = localizePhase11Status('APPLIED_TO_LEDGER', lang);
    assert.ok(statusText && statusText !== 'APPLIED_TO_LEDGER', `APPLIED_TO_LEDGER must be localized for ${lang}`);

    const reqRevLoc = localizeMeterNotification(
      'Meter reading requires review',
      'Reading MR-2026-999 on Connection UGVCL-2026-001458 flagged 2 anomaly check(s) for review.',
      lang
    );
    assert.ok(reqRevLoc.title.length > 0 && reqRevLoc.message.length > 0);

    const billIssuedLoc = localizeMeterNotification(
      'Electricity bill issued',
      'Bill BILL-UG-2026-11-1001 for ₹1450.5 was issued from approved reading MR-2026-999.',
      lang
    );
    assert.ok(billIssuedLoc.title.length > 0 && billIssuedLoc.message.length > 0);
  }
});

check('Phase 11F: DEMO Mode Initialization (4 Judge Scenarios + 12 Deterministic Synthetic Scenarios)', () => {
  assert.equal(PHASE11_DEMO_SCENARIOS.length, 12, 'Must define all 12 deterministic Phase 11F DEMO scenarios');
  for (const scen of PHASE11_DEMO_SCENARIOS) {
    assert.equal(scen.synthetic, true, `Scenario ${scen.id} must be marked synthetic`);
    assert.equal(scen.demo, true, `Scenario ${scen.id} must be marked demo`);
    assert.equal(scen.ocrEngine, 'local-browser-tesseract');
    assert.ok(scen.disclaimer.includes('not connected to production UGVCL systems'));
  }

  // Verify the 4 seeded judge scenarios in a fresh ServerDataStore instance
  const judgeAuth = new ServerAuthService({ sessionSecret: 'phase11f_judge_seed_secret_32bytes_min' });
  const judgeStore = new ServerDataStore(judgeAuth);
  const empSession = judgeAuth.login({ ...DEFAULT_DEMO_ACCOUNTS.employee, targetRole: 'employee' });
  const seededReadings = judgeStore.getMeterReadings(empSession.session.signedToken);

  // 1. Clear meter photo showing 015180 with successful OCR and immediate approval
  const clearApproved = seededReadings.find(r => r.id === 'MR-20261028-99231');
  assert.ok(clearApproved, 'Judge Scenario 1 (clear photo 015180 approved) must be seeded');
  assert.equal(clearApproved?.displayedReading, '015180');
  assert.equal(clearApproved?.readingKwh, 15180);
  assert.equal(clearApproved?.status, 'APPROVED');
  assert.equal(clearApproved?.ocr?.requiresReview, false);
  assert.equal(clearApproved?.demo, true);

  // 2. Blurry/glare photo requiring manual human confirmation
  const blurryManual = seededReadings.find(r => r.id === 'MR-20261102-BLUR01');
  assert.ok(blurryManual, 'Judge Scenario 2 (blurry photo requiring manual confirmation) must be seeded');
  assert.equal(blurryManual?.status, 'PENDING_REVIEW');
  assert.equal(blurryManual?.ocr?.requiresReview, true);
  assert.ok((blurryManual?.ocr?.ambiguousDigits?.length || 0) >= 2);
  assert.ok(blurryManual?.anomalies.some(a => a.category === 'OCR_LOW_CONFIDENCE'));

  // 3. Reading below the previous reading (flagging rollover/anomaly)
  const decreasingRollover = seededReadings.find(r => r.id === 'MR-20261102-ROLL01');
  assert.ok(decreasingRollover, 'Judge Scenario 3 (decreasing reading below previous verified reading) must be seeded');
  assert.equal(decreasingRollover?.status, 'PENDING_REVIEW');
  assert.ok((decreasingRollover?.readingKwh || 0) < (decreasingRollover?.previousReadingKwh || 0));
  assert.ok(decreasingRollover?.anomalies.some(a => a.category === 'DECREASING_READING' && a.severity === 'HIGH'));

  // 4. Unexpected bi-monthly consumption increase triggering Billing Anomaly review
  const unexpectedSpike = seededReadings.find(r => r.id === 'MR-20261101-77190');
  assert.ok(unexpectedSpike, 'Judge Scenario 4 (unexpected consumption increase) must be seeded');
  assert.equal(unexpectedSpike?.status, 'PENDING_REVIEW');
  assert.ok(unexpectedSpike?.anomalies.some(a => a.category === 'HIGH_CONSUMPTION' && a.severity === 'HIGH'));
});

console.log('\nAll Phase 11A, 11B, 11C, 11D, 11E, and 11F tests passed successfully.');
