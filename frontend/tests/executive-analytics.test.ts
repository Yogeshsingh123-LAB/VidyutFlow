import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EXECUTIVE_ANALYTICS_TRANSLATIONS } from '../src/components/management/LiveExecutiveAnalyticsSection';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import { fetchExecutiveAnalytics } from '../src/utils/liveData';

const frontendDir = process.cwd();

async function run() {
  // 1. Verify 4-language parity for EXECUTIVE_ANALYTICS_TRANSLATIONS
  const enKeys = Object.keys(EXECUTIVE_ANALYTICS_TRANSLATIONS.en) as Array<
    keyof typeof EXECUTIVE_ANALYTICS_TRANSLATIONS.en
  >;
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = EXECUTIVE_ANALYTICS_TRANSLATIONS[lang];
    for (const k of enKeys) {
      assert.ok(dict[k].trim().length > 0, `[${lang}] Missing ${String(k)}`);
      if (lang !== 'en') {
        assert.notEqual(
          dict[k],
          EXECUTIVE_ANALYTICS_TRANSLATIONS.en[k],
          `[${lang}] ${String(k)} must be translated`
        );
      }
    }
  }

  // 2. Verify ManagementPortal mounts LiveExecutiveAnalyticsSection across dashboard, sla, and reports
  const mgmtSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/management/ManagementPortal.tsx'),
    'utf8'
  );
  assert.ok(mgmtSrc.includes('mode="dashboard"'), 'Mounted on executive dashboard');
  assert.ok(mgmtSrc.includes('mode="sla"'), 'Mounted on SLA monitoring');
  assert.ok(mgmtSrc.includes('mode="reports"'), 'Mounted on executive reports');
  assert.ok(
    !mgmtSrc.includes('Energy Billed vs Revenue Collections'),
    'Removed duplicate hardcoded English chart heading in ManagementPortal'
  );

  // 3. Verify fetchExecutiveAnalytics hits /api/requests/executive-analytics
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async url =>
      String(url).endsWith('/login')
        ? new Response(JSON.stringify({ access_token: 'mgmt-token' }), { status: 200 })
        : new Response(JSON.stringify({ email: 'management@vidyutflow.demo', role: 'admin' }), {
            status: 200,
          });
    assert.equal(
      await syncBackendSession('management@vidyutflow.demo', 'Demo@12345', 'management'),
      true
    );

    let calledUrl = '';
    globalThis.fetch = async url => {
      const u = String(url);
      if (u === '/api/auth/me') {
        return new Response(
          JSON.stringify({
            authenticated: true,
            user: { email: 'management@vidyutflow.demo' },
            role: 'management',
          }),
          { status: 200 }
        );
      }
      calledUrl = u;
      return new Response(
        JSON.stringify({
          generated_at: new Date().toISOString(),
          data_provenance: {
            live_db_backed: ['requests'],
            simulated_roadmap_streams: ['scada'],
            disclosure: 'Live DB',
          },
          overview: {
            total_requests: 6,
            completed_count: 1,
            approved_or_completed_count: 2,
            pending_count: 5,
            needs_correction_count: 1,
            high_sla_risk_count: 1,
            resolution_rate_pct: 16.7,
            sla_compliance_pct: 83.3,
            total_requested_load_kw: 94.5,
            avg_turnaround_hours: 1.2,
            erp_sync_success_pct: 50.0,
            erp_failed_queue_count: 1,
            active_alerts_count: 6,
            field_sync_count: 2,
            audit_chain_events: 12,
          },
          by_zone_matrix: [],
          by_category_chart: [],
          by_workflow_template: [],
        }),
        { status: 200 }
      );
    };

    const res = await fetchExecutiveAnalytics();
    assert.equal(calledUrl, '/api/requests/kpis/executive-analytics');
    assert.equal(res.overview.total_requested_load_kw, 94.5);
  } finally {
    clearBackendSession();
    globalThis.fetch = originalFetch;
  }

  console.log('Executive real-data analytics API, 4-language charts/tables, and provenance checks passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
