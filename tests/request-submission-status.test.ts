import assert from 'node:assert/strict';
import { submissionNoticeFromResponse, submissionNoticeText } from '../src/utils/requestSubmissionStatus';

const correction = submissionNoticeFromResponse({
  id: 'request-123', status: 'NEEDS_CORRECTION',
  validation_notes: 'Requested load exceeds the demo review threshold; manual review required',
  validation_issues: [{ code: 'DEMO_LOAD_REVIEW', message: 'fallback', threshold_kw: 100 }],
});
assert.equal(correction.kind, 'correction');
if (correction.kind !== 'correction') throw new Error('Expected correction notice');
assert.equal(correction.reference, 'request-123');
assert.match(correction.notes, /manual review/);
assert.equal(correction.issues[0].threshold_kw, 100);

const recorded = submissionNoticeFromResponse({ id: 'request-456', status: 'ASSIGNED', validation_notes: 'Validated automatically' });
assert.equal(recorded.kind, 'received');
if (recorded.kind !== 'received') throw new Error('Expected recorded notice');
assert.equal(recorded.status, 'ASSIGNED');
assert.equal(recorded.notes, '');

const missingReason = submissionNoticeFromResponse({ id: 'request-789', status: 'NEEDS_CORRECTION' });
assert.equal(missingReason.kind, 'correction');
if (missingReason.kind === 'correction') assert.equal(missingReason.notes, '');

for (const language of ['en', 'gu', 'hi', 'mr'] as const) {
  for (const key of ['pending', 'received', 'correction', 'unknown', 'separate'] as const) {
    assert.ok(submissionNoticeText[language][key].length > 0, `${language}.${key} must exist`);
  }
}
console.log('Request submission status checks passed.');
