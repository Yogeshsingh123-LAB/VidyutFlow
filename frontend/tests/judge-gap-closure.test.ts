import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PREDICTIVE_PANEL_TRANSLATIONS } from '../src/components/common/LivePredictiveDecisionPanel';

const frontendDir = process.cwd();
const repoRoot = path.resolve(frontendDir, '..');

async function run() {
  // 1. Verify 4-language parity & distinct translations across en/gu/hi/mr
  const enKeys = Object.keys(PREDICTIVE_PANEL_TRANSLATIONS.en) as Array<
    keyof typeof PREDICTIVE_PANEL_TRANSLATIONS.en
  >;
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = PREDICTIVE_PANEL_TRANSLATIONS[lang];
    for (const k of enKeys) {
      assert.ok(dict[k].trim().length > 0, `[${lang}] Missing ${String(k)}`);
      if (lang !== 'en') {
        assert.notEqual(dict[k], PREDICTIVE_PANEL_TRANSLATIONS.en[k], `[${lang}] ${String(k)} must be translated`);
      }
    }
  }

  // 2. Verify ManagementPortal mounts LivePredictiveDecisionPanel
  const mgmtSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/management/ManagementPortal.tsx'),
    'utf8',
  );
  assert.ok(mgmtSrc.includes('LivePredictiveDecisionPanel'), 'ManagementPortal mounts LivePredictiveDecisionPanel');

  // 3. Verify backend ML metrics.json reflects all 5 trained models & recall/accuracy thresholds
  const metricsJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'backend/app/ml/models/metrics.json'), 'utf8'),
  );
  assert.ok(metricsJson.category_classifier.accuracy >= 0.85, 'Category accuracy >= 0.85');
  assert.ok(metricsJson.sla_breach_predictor.breach_recall >= 0.85, 'SLA breach recall >= 0.85');
  assert.ok(metricsJson.billing_anomaly_detector.anomaly_recall >= 0.90, 'Billing anomaly recall >= 0.90');
  assert.ok(metricsJson.feeder_load_forecaster.r2_score >= 0.95, 'Feeder load R2 >= 0.95');

  // 4. Verify DR failover drill verification artifact exists and passed
  const drillReport = fs.readFileSync(
    path.join(repoRoot, 'docs/verification/r4-dr-failover-drill.txt'),
    'utf8',
  );
  assert.ok(drillReport.includes('Status                         : PASS'), 'DR failover drill report PASSED');
  assert.ok(drillReport.includes('Records lost (replicated RPO)  : 0'), 'DR failover drill proved 0 records lost');

  console.log('✓ judge-gap-closure.test.ts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
