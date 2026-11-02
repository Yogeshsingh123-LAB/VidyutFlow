import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  MAX_DOCUMENT_FILENAME_LENGTH,
  sanitizeUploadFilename,
  uploadPolicyText,
  validateDocumentUpload,
} from '../src/utils/documentUpload';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import { submitLiveRequestWithDocument } from '../src/utils/liveData';

// 1. Filename sanitization & allowlist checks
assert.equal(sanitizeUploadFilename('../../id_proof.pdf'), 'id_proof.pdf');
assert.equal(
  sanitizeUploadFilename('C:\\Users\\Meena\\Documents\\My Ownership Deed (2026)!.PDF'),
  'My_Ownership_Deed_2026.pdf'
);
assert.equal(sanitizeUploadFilename('.hidden_id.JPEG'), 'hidden_id.jpeg');
assert.equal(sanitizeUploadFilename('scan.v1.2.PNG'), 'scan_v1_2.png');
assert.equal(sanitizeUploadFilename('tricky.exe.pdf'), 'tricky_exe.pdf');
assert.equal(sanitizeUploadFilename('=formula-name.txt'), 'formula-name.txt');

const longResult = sanitizeUploadFilename(`${'a'.repeat(240)}.PDF`);
assert.ok(longResult);
assert.equal(longResult.length, MAX_DOCUMENT_FILENAME_LENGTH);
assert.ok(longResult.endsWith('.pdf'));

for (const bad of [
  '',
  '   ',
  '../../etc/passwd',
  'payload.exe',
  'script.html',
  'vector.svg',
  'invoice.pdf.exe',
  'id\x00.pdf',
  'id%00.pdf',
  'spoof\u202eexe.pdf',
  '.pdf',
  '..',
  '___---.pdf',
]) {
  assert.equal(sanitizeUploadFilename(bad), null, `Expected null for ${JSON.stringify(bad)}`);
}

// 2. Size boundary validation
assert.deepEqual(validateDocumentUpload({ name: 'empty.pdf', size: 0 }), {
  valid: false,
  reason: 'empty',
  maxBytes: DEFAULT_MAX_UPLOAD_BYTES,
});
assert.deepEqual(validateDocumentUpload({ name: 'ok.pdf', size: 1024 }, 1024), {
  valid: true,
  sanitizedName: 'ok.pdf',
});
assert.deepEqual(validateDocumentUpload({ name: 'big.pdf', size: 1025 }, 1024), {
  valid: false,
  reason: 'too_large',
  maxBytes: 1024,
});
assert.deepEqual(validateDocumentUpload({ name: 'bad.exe', size: 100 }, 1024), {
  valid: false,
  reason: 'invalid_name_or_type',
  maxBytes: 1024,
});

// 3. Four-language copy parity
const enKeys = Object.keys(uploadPolicyText.en).sort();
for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
  assert.deepEqual(Object.keys(uploadPolicyText[lang]).sort(), enKeys);
  for (const val of Object.values(uploadPolicyText[lang])) {
    assert.ok(typeof val === 'string' && val.trim().length > 0);
  }
}

// 4. Multipart submission sends sanitized filename to /api/requests/with-document
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? new Response(JSON.stringify({ access_token: 'consumer-token' }), { status: 200 })
      : new Response(JSON.stringify({ email: 'alice@example.com', role: 'consumer' }), { status: 200 });
  assert.equal(await syncBackendSession('alice@example.com', 'pass123', 'consumer'), true);

  let postedUrl = '';
  let uploadedPartName = '';
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === '/api/auth/me') {
      return new Response(
        JSON.stringify({ authenticated: true, user: { email: 'alice@example.com' }, role: 'consumer' }),
        { status: 200 }
      );
    }
    postedUrl = u;
    const form = init?.body as FormData;
    const doc = form.get('document') as File;
    uploadedPartName = doc.name;
    return new Response(
      JSON.stringify({
        id: 'req-1',
        applicant_name: 'Alice',
        zone: 'North',
        status: 'ASSIGNED',
        validation_notes: 'Validated automatically',
        validation_issues: [],
        category: 'NEW_CONNECTION',
        severity: 'LOW',
        sla_breach_risk: 0.1,
        sla_risk_reasons: [],
        requested_load_kw: 3,
        updated_at: '2026-10-30T00:00:00Z',
      }),
      { status: 201 }
    );
  };

  const file = new File([new Uint8Array([1, 2, 3, 4])], '../../Unsafe Name!.PDF', {
    type: 'application/pdf',
  });
  const checked = validateDocumentUpload(file);
  assert.equal(checked.valid, true);
  if (checked.valid) {
    const created = await submitLiveRequestWithDocument(
      { applicant_name: 'Alice', phone: '9876543210', address: 'Mehsana', requested_load_kw: 3 },
      file,
      checked.sanitizedName
    );
    assert.equal(created.id, 'req-1');
  }
  assert.equal(postedUrl, '/api/requests/with-document');
  assert.equal(uploadedPartName, 'Unsafe_Name.pdf');
} finally {
  clearBackendSession();
  globalThis.fetch = originalFetch;
}

console.log('Document upload validation and sanitising checks passed.');
