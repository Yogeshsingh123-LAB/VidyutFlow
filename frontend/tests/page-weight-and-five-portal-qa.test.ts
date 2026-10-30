import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LIVE_KPIS_TRANSLATIONS } from '../src/components/common/LiveWorkflowKpis';
import { LIVE_QUEUE_TRANSLATIONS } from '../src/components/common/LiveRequestQueue';
import { LIVE_WATCHLIST_TRANSLATIONS } from '../src/components/common/LiveSlaRiskWatchlist';
import { AI_GOVERNANCE_TRANSLATIONS } from '../src/components/common/LiveAiGovernancePanel';
import { ALERT_ENGINE_TRANSLATIONS } from '../src/components/common/LiveAlertEnginePanel';
import { PERFORMANCE_TELEMETRY_TRANSLATIONS } from '../src/components/admin/LivePerformanceTelemetryPanel';
import { WORKFLOW_TEMPLATE_TRANSLATIONS } from '../src/components/admin/LiveWorkflowTemplatesPanel';
import { EXECUTIVE_ANALYTICS_TRANSLATIONS } from '../src/components/management/LiveExecutiveAnalyticsSection';

const frontendDir = process.cwd();

function verifyFourLanguageDict<T extends object>(
  name: string,
  dictByLang: Record<'en' | 'gu' | 'hi' | 'mr', T>,
  allowIdenticalKeys: string[] = []
) {
  const enObj = dictByLang.en as Record<string, string>;
  const keys = Object.keys(enObj);
  assert.ok(keys.length > 0, `${name} must define keys`);
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const d = dictByLang[lang] as Record<string, string>;
    for (const k of keys) {
      assert.ok(
        typeof d[k] === 'string' && d[k].trim().length > 0,
        `[${name}:${lang}] missing key ${k}`
      );
      if (lang !== 'en' && !allowIdenticalKeys.includes(k)) {
        assert.notEqual(
          d[k],
          enObj[k],
          `[${name}:${lang}] key ${k} must be translated from English`
        );
      }
    }
  }
}

function run() {
  // 1. Item #31 — Public image asset weight budget (< 350 KB per image)
  const ugvclAssetDir = path.join(frontendDir, 'public/assets/ugvcl');
  const imageFiles = fs
    .readdirSync(ugvclAssetDir)
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  assert.ok(imageFiles.length >= 6, 'Expected UGVCL gallery assets in public/assets/ugvcl');
  for (const file of imageFiles) {
    const stat = fs.statSync(path.join(ugvclAssetDir, file));
    const sizeKb = stat.size / 1024;
    assert.ok(
      sizeKb < 350,
      `Asset ${file} is ${sizeKb.toFixed(1)} KB; must stay under 350 KB budget`
    );
  }

  // 2. Item #31 — Route-level code splitting & Vite chunk size guard
  const appSrc = fs.readFileSync(path.join(frontendDir, 'src/App.tsx'), 'utf8');
  assert.ok(appSrc.includes('lazy(') && appSrc.includes('<Suspense'), 'App.tsx must lazy-load portals');
  for (const portal of [
    'WelcomePortalPage',
    'AppShell',
    'ConsumerPortal',
    'EmployeePortal',
    'FieldPortal',
    'ManagementPortal',
    'AdminPortal',
  ]) {
    assert.ok(appSrc.includes(portal), `App.tsx must split ${portal}`);
  }

  const viteSrc = fs.readFileSync(path.join(frontendDir, 'vite.config.ts'), 'utf8');
  assert.ok(
    viteSrc.includes('chunkSizeWarningLimit: 500'),
    'vite.config.ts must enforce 500 kB chunk warning threshold'
  );

  const distAssetsDir = path.join(frontendDir, 'dist/assets');
  if (fs.existsSync(distAssetsDir)) {
    const jsChunks = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));
    assert.ok(jsChunks.length >= 10, 'Expected code-split JS chunks in dist/assets');
    for (const chunk of jsChunks) {
      const kb = fs.statSync(path.join(distAssetsDir, chunk)).size / 1024;
      assert.ok(kb < 500, `Built JS chunk ${chunk} (${kb.toFixed(1)} KB) exceeds 500 KB budget`);
      if (chunk.startsWith('index-')) {
        assert.ok(kb < 300, `Main entry chunk ${chunk} (${kb.toFixed(1)} KB) must stay under 300 KB`);
      }
    }
  }

  // 3. Item #32 — 4-language parity across all shared & portal live panels
  verifyFourLanguageDict('LIVE_KPIS_TRANSLATIONS', LIVE_KPIS_TRANSLATIONS);
  verifyFourLanguageDict('LIVE_QUEUE_TRANSLATIONS', LIVE_QUEUE_TRANSLATIONS);
  verifyFourLanguageDict('LIVE_WATCHLIST_TRANSLATIONS', LIVE_WATCHLIST_TRANSLATIONS);
  verifyFourLanguageDict('AI_GOVERNANCE_TRANSLATIONS', AI_GOVERNANCE_TRANSLATIONS);
  verifyFourLanguageDict('ALERT_ENGINE_TRANSLATIONS', ALERT_ENGINE_TRANSLATIONS);
  verifyFourLanguageDict('PERFORMANCE_TELEMETRY_TRANSLATIONS', PERFORMANCE_TELEMETRY_TRANSLATIONS, [
    'p50Label',
    'p95Label',
    'colP50',
    'colP95',
    'colP99',
  ]);
  verifyFourLanguageDict('WORKFLOW_TEMPLATE_TRANSLATIONS', WORKFLOW_TEMPLATE_TRANSLATIONS, [
    'codePlaceholder',
  ]);
  verifyFourLanguageDict('EXECUTIVE_ANALYTICS_TRANSLATIONS', EXECUTIVE_ANALYTICS_TRANSLATIONS);

  // Guard against stale "Random Forest" claim in LiveSlaRiskWatchlist
  const watchlistSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/common/LiveSlaRiskWatchlist.tsx'),
    'utf8'
  );
  assert.ok(
    !watchlistSrc.includes('Random Forest'),
    'LiveSlaRiskWatchlist must accurately describe Logistic Regression, not Random Forest'
  );

  // 4. Item #32 — Accessibility & mobile responsiveness across all 5 portals + admin forms
  const portals = [
    'src/components/consumer/ConsumerPortal.tsx',
    'src/components/employee/EmployeePortal.tsx',
    'src/components/field/FieldPortal.tsx',
    'src/components/management/ManagementPortal.tsx',
    'src/components/admin/AdminPortal.tsx',
  ];
  for (const rel of portals) {
    const src = fs.readFileSync(path.join(frontendDir, rel), 'utf8');
    assert.ok(
      src.includes('leading-snug') && src.includes('break-words'),
      `${rel} must preserve Indic script line-height and word-break guards`
    );
  }

  const erpPanelSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/LiveErpAdapterPanel.tsx'),
    'utf8'
  );
  const tplPanelSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/LiveWorkflowTemplatesPanel.tsx'),
    'utf8'
  );
  assert.ok(erpPanelSrc.includes('aria-label='), 'LiveErpAdapterPanel inputs/selects must provide aria-label');
  assert.ok(tplPanelSrc.includes('aria-label='), 'LiveWorkflowTemplatesPanel inputs must provide aria-label');

  console.log('Page weight (#31) & 5-portal accessibility, mobile, and 4-language QA (#32) passed.');
}

run();
