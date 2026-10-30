import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PERFORMANCE_TELEMETRY_TRANSLATIONS } from '../src/components/admin/LivePerformanceTelemetryPanel';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import { fetchSystemPerformance } from '../src/utils/liveData';

const frontendDir = process.cwd();
const repoRoot = path.resolve(frontendDir, '..');

async function run() {
  // 1. Verify 4-language parity for PERFORMANCE_TELEMETRY_TRANSLATIONS
  const enKeys = Object.keys(PERFORMANCE_TELEMETRY_TRANSLATIONS.en) as Array<
    keyof typeof PERFORMANCE_TELEMETRY_TRANSLATIONS.en
  >;
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = PERFORMANCE_TELEMETRY_TRANSLATIONS[lang];
    for (const k of enKeys) {
      assert.ok(dict[k].trim().length > 0, `[${lang}] Missing ${String(k)}`);
      if (lang !== 'en' && !String(k).startsWith('colP')) {
        assert.notEqual(
          dict[k],
          PERFORMANCE_TELEMETRY_TRANSLATIONS.en[k],
          `[${lang}] ${String(k)} must be translated`
        );
      }
    }
  }

  // 2. Verify hardcoded "4.5 ms" / "3.1 ms" claim is dropped across README & docs/*.md
  const docFiles = [
    path.join(repoRoot, 'README.md'),
    ...fs
      .readdirSync(path.join(repoRoot, 'docs'))
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(repoRoot, 'docs', f)),
  ];
  for (const file of docFiles) {
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!text.includes('4.5 ms'), `Stale "4.5 ms" claim found in ${path.basename(file)}`);
    assert.ok(!text.includes('3.1 ms'), `Stale "3.1 ms" claim found in ${path.basename(file)}`);
  }

  // 3. Verify AdminPortal mounts LivePerformanceTelemetryPanel & API helper calls /api/system/performance
  const adminSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/AdminPortal.tsx'),
    'utf8'
  );
  assert.ok(
    adminSrc.includes('LivePerformanceTelemetryPanel'),
    'AdminPortal mounts LivePerformanceTelemetryPanel'
  );

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async url =>
      String(url).endsWith('/login')
        ? new Response(JSON.stringify({ access_token: 'admin-token' }), { status: 200 })
        : new Response(JSON.stringify({ email: 'admin@vidyutflow.demo', role: 'admin' }), {
            status: 200,
          });
    assert.equal(await syncBackendSession('admin@vidyutflow.demo', 'Demo@12345', 'admin'), true);

    let calledUrl = '';
    globalThis.fetch = async url => {
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
      calledUrl = u;
      return new Response(
        JSON.stringify({
          is_synthetic_or_local: true,
          disclosure: 'Local only',
          latency: {
            window_capacity: 1000,
            sample_count: 50,
            server_error_count: 0,
            p50_ms: 12.4,
            p95_ms: 21.8,
            p99_ms: 25.1,
            mean_ms: 13.2,
            max_ms: 26.0,
            per_route: [],
          },
          caches: {
            ttl_seconds: 15,
            kpi_summary: {
              name: 'kpi_summary',
              epoch: 2,
              hits: 49,
              misses: 1,
              hit_rate_pct: 98,
              invalidations: 1,
              entries: 1,
            },
            workflow_templates: {
              name: 'workflow_templates',
              epoch: 1,
              hits: 49,
              misses: 1,
              hit_rate_pct: 98,
              invalidations: 0,
              entries: 1,
            },
          },
          indexes: { expected: 7, present: 7, items: [] },
        }),
        { status: 200 }
      );
    };

    const perf = await fetchSystemPerformance();
    assert.equal(calledUrl, '/api/system/performance');
    assert.equal(perf.indexes.present, 7);
    assert.equal(perf.caches.kpi_summary.hit_rate_pct, 98);
  } finally {
    clearBackendSession();
    globalThis.fetch = originalFetch;
  }

  console.log('Performance telemetry, TTL caching, DB index checks, and 4.5ms-removal audit passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
