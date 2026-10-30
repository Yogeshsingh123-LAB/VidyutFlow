import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');

function run() {
  const infraDoc = fs.readFileSync(
    path.join(repoRoot, 'docs/INFRASTRUCTURE_ROADMAP.md'),
    'utf8'
  );
  assert.ok(infraDoc.includes('Tier 1 — Small'), 'Small tier present');
  assert.ok(infraDoc.includes('Tier 2 — Medium'), 'Medium tier present');
  assert.ok(infraDoc.includes('Tier 3 — Large'), 'Large tier present');
  assert.ok(infraDoc.includes('₹14.80 Lakh'), 'Small tier CAPEX present');
  assert.ok(infraDoc.includes('₹1.18 Crore'), 'Medium tier CAPEX present');
  assert.ok(infraDoc.includes('₹7.45 Crore'), 'Large tier CAPEX present');
  assert.ok(!infraDoc.toLowerCase().includes('no prices are quoted here'));

  const workloadDoc = fs.readFileSync(
    path.join(repoRoot, 'docs/WORKLOAD_MEASUREMENT.md'),
    'utf8'
  );
  assert.ok(workloadDoc.includes('0 fields re-typed'));
  assert.ok(workloadDoc.includes('0 manual routing handoffs'));
  assert.ok(workloadDoc.includes('3 clicks / transitions'));

  const verifyLog = fs.readFileSync(
    path.join(repoRoot, 'docs/verification/r5-workload-measurement.txt'),
    'utf8'
  );
  assert.ok(verifyLog.includes('"staff_applicant_fields_retyped": 0'));
  assert.ok(verifyLog.includes('"manual_routing_handoffs": 0'));
  assert.ok(verifyLog.includes('"staff_portal_actions_to_complete": 3'));

  console.log('Costed 3-tier infrastructure proposal (#26) & workload measurement (#27) checks passed.');
}

run();
