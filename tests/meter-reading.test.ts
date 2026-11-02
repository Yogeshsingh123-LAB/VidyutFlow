import assert from 'node:assert/strict';
import { ServerAuthService, AuthSecurityError } from '../src/server/authService';
import { ServerDataStore } from '../src/server/dataStore';
import { DEFAULT_DEMO_ACCOUNTS } from '../src/data/demoAuthData';
import { INITIAL_CONNECTIONS, INITIAL_BILLS, INITIAL_PAYMENTS } from '../src/data/mockData';
import { calculateMeterConsumption, detectConsumptionAnomalies, detectIdentityMismatch, normalizeDisplayedReading, MeterReadingError } from '../src/services/meterReading';
import { validateMeterPhoto } from '../src/services/meterOcr';
import { validateExistingBill } from '../src/services/billingValidation';

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

console.log('\nMeter reading, privacy, review, anomaly and bill-check tests passed.');
