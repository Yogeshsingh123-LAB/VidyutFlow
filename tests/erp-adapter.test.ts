import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_UI_TRANSLATIONS } from '../src/i18n/adminContentTranslations';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import {
  CANONICAL_ERP_FIELD_MAPPINGS,
  fetchErpMappings,
  fetchErpSyncLogs,
  retryLiveErpSyncLog,
  triggerLiveErpSync,
} from '../src/utils/liveData';

const frontendDir = process.cwd();

async function run() {
  // 1. Proxy & AdminPortal wiring checks
  const viteSrc = fs.readFileSync(path.join(frontendDir, 'vite.config.ts'), 'utf8');
  assert.ok(viteSrc.includes("'/api/erp':"), 'vite.config.ts must proxy /api/erp to FastAPI');

  const adminSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/AdminPortal.tsx'),
    'utf8'
  );
  assert.ok(
    adminSrc.includes('LiveErpAdapterPanel'),
    'AdminPortal.tsx must mount LiveErpAdapterPanel on integrations and overview views'
  );

  // 2. Canonical mapping completeness & 4-language parity
  assert.equal(CANONICAL_ERP_FIELD_MAPPINGS.length, 10);
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = ADMIN_UI_TRANSLATIONS[lang];
    assert.ok(dict.erpAdapterTitle.trim().length > 0, `[${lang}] erpAdapterTitle non-empty`);
    assert.ok(dict.erpDisclosureBanner.trim().length > 0, `[${lang}] erpDisclosureBanner non-empty`);
    assert.ok(dict.erpMappingHeading.trim().length > 0, `[${lang}] erpMappingHeading non-empty`);
    assert.ok(dict.erpSyncLogHeading.trim().length > 0, `[${lang}] erpSyncLogHeading non-empty`);
    if (lang !== 'en') {
      assert.notEqual(dict.erpAdapterTitle, ADMIN_UI_TRANSLATIONS.en.erpAdapterTitle);
      assert.notEqual(dict.erpDisclosureBanner, ADMIN_UI_TRANSLATIONS.en.erpDisclosureBanner);
    }
  }

  // 3. API client integration checks
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async url =>
      String(url).endsWith('/login')
        ? new Response(JSON.stringify({ access_token: 'admin-token' }), { status: 200 })
        : new Response(JSON.stringify({ email: 'admin@vidyutflow.demo', role: 'admin' }), {
            status: 200,
          });
    assert.equal(await syncBackendSession('admin@vidyutflow.demo', 'Demo@12345', 'admin'), true);

    const calledUrls: string[] = [];
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u === '/api/auth/me') {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: { email: 'admin@vidyutflow.demo' },
            role: 'admin',
          }),
          { status: 200 }
        );
      }
      calledUrls.push(`${init?.method || 'GET'} ${u}`);
      if (u.endsWith('/erp/mappings')) {
        return new Response(
          JSON.stringify({
            adapter_mode: 'simulated_webhook',
            is_simulated: true,
            target_system: 'Simulated Discom ERP',
            disclosure: 'Simulated only',
            mappings: CANONICAL_ERP_FIELD_MAPPINGS,
          }),
          { status: 200 }
        );
      }
      if (u.includes('/erp/logs?status=FAILED')) {
        return new Response(
          JSON.stringify({
            is_simulated: true,
            disclosure: 'Simulated only',
            summary: { total: 2, synced: 1, failed_queue: 1 },
            items: [
              {
                id: 'log-fail-1',
                request_id: 'req-123',
                applicant_name: 'Patel Kirana Store',
                zone: 'North',
                request_status: 'ASSIGNED',
                event_type: 'MANUAL_SYNC',
                status: 'FAILED',
                attempt_count: 1,
                erp_reference_id: '',
                mapped_payload: {},
                error_message: 'Simulated 503',
                last_attempt_at: '2026-10-30T10:00:00Z',
                synced_at: null,
                created_at: '2026-10-30T10:00:00Z',
                is_simulated: true,
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (u.endsWith('/erp/sync/req-123')) {
        return new Response(
          JSON.stringify({
            id: 'log-fail-2',
            request_id: 'req-123',
            status: 'FAILED',
            attempt_count: 1,
            erp_reference_id: '',
            error_message: 'Simulated 503',
            is_simulated: true,
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: 'log-fail-1',
          request_id: 'req-123',
          status: 'SYNCED',
          attempt_count: 2,
          erp_reference_id: 'SIM-ERP-N01-REQ123-2',
          error_message: '',
          is_simulated: true,
        }),
        { status: 200 }
      );
    };

    const m = await fetchErpMappings();
    assert.equal(m.is_simulated, true);
    assert.equal(m.mappings.length, 10);

    const logs = await fetchErpSyncLogs('FAILED');
    assert.equal(logs.summary.failed_queue, 1);

    const triggered = await triggerLiveErpSync('req-123', true);
    assert.equal(triggered.status, 'FAILED');

    const retried = await retryLiveErpSyncLog('log-fail-1', 'UGVCL-MTR-1');
    assert.equal(retried.status, 'SYNCED');
    assert.equal(retried.attempt_count, 2);

    assert.deepEqual(calledUrls, [
      'GET /api/erp/mappings',
      'GET /api/erp/logs?status=FAILED',
      'POST /api/erp/sync/req-123',
      'POST /api/erp/logs/log-fail-1/retry',
    ]);
  } finally {
    clearBackendSession();
    globalThis.fetch = originalFetch;
  }

  console.log('ERP adapter mappings, sync log, failed queue, retry, and 4-language checks passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
