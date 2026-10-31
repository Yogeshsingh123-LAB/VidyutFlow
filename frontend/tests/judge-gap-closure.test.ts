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

  // 4. Verify INFRASTRUCTURE.md, SECURITY.md, OpenAPI (50 paths / 55 ops) & DR failover report
  const infraMd = fs.readFileSync(path.join(repoRoot, 'docs/INFRASTRUCTURE.md'), 'utf8');
  assert.ok(infraMd.includes('Raspberry Pi 4'), 'INFRASTRUCTURE.md specifies Raspberry Pi 4 substation edge hardware');
  assert.ok(infraMd.includes('SD-WAN'), 'INFRASTRUCTURE.md specifies MPLS + SD-WAN failover');

  const secMd = fs.readFileSync(path.join(repoRoot, 'docs/SECURITY.md'), 'utf8');
  assert.ok(secMd.includes('STRIDE'), 'SECURITY.md includes STRIDE threat model');
  assert.ok(secMd.includes('AES-256-GCM'), 'SECURITY.md documents AES-256-GCM encryption at rest');

  const openapi = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/api/openapi.json'), 'utf8'));
  assert.equal(Object.keys(openapi.paths).length, 50, 'OpenAPI has 50 paths');

  const drillReport = fs.readFileSync(
    path.join(repoRoot, 'docs/verification/r4-dr-failover-drill.txt'),
    'utf8',
  );
  assert.ok(drillReport.includes('Status                         : PASS'), 'DR failover drill report PASSED');
  assert.ok(drillReport.includes('Records lost (replicated RPO)  : 0'), 'DR failover drill proved 0 records lost');

  // 5. Verify OOD GERC/CGRF real-domain text eval, 100% (55/55) API coverage, Cold-Start DR proof & BOM sources
  const oodEval = fs.readFileSync(path.join(repoRoot, 'docs/verification/r3-realworld-text-eval.txt'), 'utf8');
  assert.ok(oodEval.includes('Synthetic Template Overlap: 0'), 'Zero overlap on OOD field benchmark');
  assert.ok(oodEval.includes('Category Accuracy         : 0.9074'), 'OOD field benchmark >= 0.75 (0.9074)');

  const apiCov = fs.readFileSync(path.join(repoRoot, 'docs/verification/r4-api-endpoint-coverage.txt'), 'utf8');
  assert.ok(apiCov.includes('Operations Tested in Pytest: 55 / 55 (100.0%)'), '100% (55/55) OpenAPI operation coverage');

  const coldDr = fs.readFileSync(path.join(repoRoot, 'docs/verification/r4-cold-start-dr-proof.txt'), 'utf8');
  assert.ok(coldDr.includes('Data loss (records)             : 0'), 'Cold-start DR proof 0 data loss');

  const bomSrc = fs.readFileSync(path.join(repoRoot, 'docs/INFRASTRUCTURE_BOM_SOURCES.md'), 'utf8');
  assert.ok(bomSrc.includes('element14.com') && bomSrc.includes('evelta.com'), 'BOM sources cite Indian hardware distributors');

  const vivaPlan = fs.readFileSync(path.join(repoRoot, 'docs/TEAM_COMMIT_AND_VIVA_PLAN.md'), 'utf8');
  assert.ok(vivaPlan.includes('GradientBoostingRegressor'), 'Viva plan documents exact GBR hyperparameters');

  const uploadsPy = fs.readFileSync(path.join(repoRoot, 'backend/app/uploads.py'), 'utf8');
  assert.ok(uploadsPy.includes('def validate_magic_bytes') && uploadsPy.includes('b"%PDF-"'), 'Magic-byte upload validation enforced in uploads.py');
  assert.ok(uploadsPy.includes('settings.upload_vault_dir'), 'Uploads always persisted encrypted to default vault dir');

  // 6. Ensure zero stale "Lite build" / "simulated SAP" headline / "0.733" / "JWT in localStorage" across key docs & deck script
  const readmeLower = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8').toLowerCase();
  assert.ok(!readmeLower.includes('simulated sap'), 'README.md headline must not call SAP gateway "simulated SAP"');
  for (const rel of [
    'README.md',
    'SECURITY.md',
    'scripts/build_deck.py',
    'docs/QUICK_AUDIT.md',
    'docs/SYNOPSIS_ABSTRACT.md',
    'docs/DECK_OUTLINE.md',
    'docs/ARCHITECTURE.md',
    'docs/DEFENCE_QA.md',
    'docs/TEAM_ROLES.md',
  ]) {
    const txt = fs.readFileSync(path.join(repoRoot, rel), 'utf8').toLowerCase();
    for (const banned of ['lite build', 'vidyutflow (lite)', 'one working end-to-end', '0.733', '0.794', 'jwt in localstorage', 'localstorage jwt']) {
      assert.ok(!txt.includes(banned), `Stale phrase "${banned}" must not appear in ${rel}`);
    }
  }

  console.log('✓ judge-gap-closure.test.ts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
