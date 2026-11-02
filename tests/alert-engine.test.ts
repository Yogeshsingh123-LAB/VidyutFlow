import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALERT_ENGINE_TRANSLATIONS } from '../src/components/common/LiveAlertEnginePanel';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import { evaluateLiveAlerts, fetchAlertDispatches } from '../src/utils/liveData';

const frontendDir = process.cwd();

async function run() {
  // 1. Verify 4-language parity for ALERT_ENGINE_TRANSLATIONS
  const enKeys = Object.keys(ALERT_ENGINE_TRANSLATIONS.en) as Array<
    keyof typeof ALERT_ENGINE_TRANSLATIONS.en
  >;
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = ALERT_ENGINE_TRANSLATIONS[lang];
    for (const k of enKeys) {
      assert.ok(dict[k].trim().length > 0, `[${lang}] Missing ${String(k)}`);
      if (lang !== 'en') {
        assert.notEqual(
          dict[k],
          ALERT_ENGINE_TRANSLATIONS.en[k],
          `[${lang}] ${String(k)} must be translated`
        );
      }
    }
  }

  // 2. Verify ManagementPortal and AdminPortal mount LiveAlertEnginePanel
  const mgmtSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/management/ManagementPortal.tsx'),
    'utf8'
  );
  const adminSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/AdminPortal.tsx'),
    'utf8'
  );
  assert.ok(mgmtSrc.includes('LiveAlertEnginePanel'), 'ManagementPortal mounts LiveAlertEnginePanel');
  assert.ok(adminSrc.includes('LiveAlertEnginePanel'), 'AdminPortal mounts LiveAlertEnginePanel');

  // 3. Verify API client helpers hit /api/notifications/alerts/*
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async url =>
      String(url).endsWith('/login')
        ? new Response(JSON.stringify({ access_token: 'admin-token' }), { status: 200 })
        : new Response(JSON.stringify({ email: 'admin@vidyutflow.demo', role: 'admin' }), {
            status: 200,
          });
    assert.equal(await syncBackendSession('admin@vidyutflow.demo', 'Demo@12345', 'admin'), true);

    const calls: string[] = [];
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
      calls.push(`${init?.method || 'GET'} ${u}`);
      if (u.includes('/notifications/alerts/dispatches')) {
        return new Response(
          JSON.stringify({
            is_simulated: true,
            disclosure: 'Simulated only',
            thresholds: { sla_risk_threshold: 0.7, unassigned_hours: 4, zone_failure_threshold: 2 },
            summary: { total: 3, simulated_sms: 1, simulated_email: 1, in_app: 1, by_rule: { SLA_BREACH_RISK: 3 } },
            items: [],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          is_simulated: true,
          disclosure: 'Simulated only',
          newly_dispatched: 3,
          by_rule: { SLA_BREACH_RISK: 3 },
          items: [],
        }),
        { status: 200 }
      );
    };

    const listRes = await fetchAlertDispatches('SIMULATED_SMS', 'SLA_BREACH_RISK');
    assert.equal(listRes.is_simulated, true);
    assert.equal(listRes.summary.simulated_sms, 1);

    const evalRes = await evaluateLiveAlerts({ unassigned_hours: 4 });
    assert.equal(evalRes.newly_dispatched, 3);

    assert.deepEqual(calls, [
      'GET /api/notifications/alerts/dispatches?channel=SIMULATED_SMS&rule_code=SLA_BREACH_RISK',
      'POST /api/notifications/alerts/evaluate',
    ]);
  } finally {
    clearBackendSession();
    globalThis.fetch = originalFetch;
  }

  console.log('Alert engine simulated SMS/Email outbox, sweep API, and 4-language UI checks passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
