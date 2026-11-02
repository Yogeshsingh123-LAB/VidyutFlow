import assert from 'node:assert/strict';
import { validLoad, formatValidationIssue, policyText, requiresDemoReview } from '../src/utils/demoLoadPolicy';
import { fetchDemoLoadPolicy } from '../src/utils/liveData';

for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1e309', '1e307']) assert.equal(validLoad(value), false, value);
for (const value of ['0.5', '50', '100', '100.01', '1000']) assert.equal(validLoad(value), true, value);
assert.equal(requiresDemoReview(99.9, 100), false);
assert.equal(requiresDemoReview(100, 100), false);
assert.equal(requiresDemoReview(100.01, 100), true);
assert.equal(requiresDemoReview(50, 42.5), true);
const actualFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(JSON.stringify({ review_threshold_kw: 42.5, is_demo: true }), { status: 200 });
  assert.equal((await fetchDemoLoadPolicy()).review_threshold_kw, 42.5);
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });
  await assert.rejects(fetchDemoLoadPolicy());
  globalThis.fetch = async () => new Response(JSON.stringify({ review_threshold_kw: 0, is_demo: true }), { status: 200 });
  await assert.rejects(fetchDemoLoadPolicy());
} finally { globalThis.fetch = actualFetch; }
for (const language of ['en', 'gu', 'hi', 'mr'] as const) {
  assert.ok(policyText[language].threshold(100).includes('100'));
  assert.ok(policyText[language].unavailable);
  assert.ok(formatValidationIssue({ code: 'DEMO_LOAD_REVIEW', threshold_kw: 42.5, message: 'fallback' }, language).includes('42.5'));
  assert.notEqual(formatValidationIssue({ code: 'PHONE_INVALID', message: 'fallback' }, language), 'fallback');
  assert.equal(formatValidationIssue({ code: 'UNKNOWN', message: 'fallback' }, language), 'fallback');
}
console.log('Demo load policy checks passed.');
