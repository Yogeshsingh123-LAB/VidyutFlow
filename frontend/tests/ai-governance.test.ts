import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AI_GOVERNANCE_TRANSLATIONS } from '../src/components/common/LiveAiGovernancePanel';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import { fetchAiGovernance } from '../src/utils/liveData';

const frontendDir = process.cwd();

async function run() {
  // 1. Verify 4-language parity for AI_GOVERNANCE_TRANSLATIONS
  const enKeys = Object.keys(AI_GOVERNANCE_TRANSLATIONS.en) as Array<
    keyof typeof AI_GOVERNANCE_TRANSLATIONS.en
  >;
  for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
    const dict = AI_GOVERNANCE_TRANSLATIONS[lang];
    for (const k of enKeys) {
      assert.ok(dict[k].trim().length > 0, `[${lang}] Missing ${String(k)}`);
      if (lang !== 'en') {
        assert.notEqual(
          dict[k],
          AI_GOVERNANCE_TRANSLATIONS.en[k],
          `[${lang}] ${String(k)} must be translated`
        );
      }
    }
  }

  // 2. Verify Vite /api/v1 proxy & Management/Admin mounting
  const viteSrc = fs.readFileSync(path.join(frontendDir, 'vite.config.ts'), 'utf8');
  assert.ok(viteSrc.includes("'/api/v1'"), 'vite.config.ts proxies /api/v1');

  const mgmtSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/management/ManagementPortal.tsx'),
    'utf8'
  );
  const adminSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/AdminPortal.tsx'),
    'utf8'
  );
  assert.ok(mgmtSrc.includes('LiveAiGovernancePanel'), 'ManagementPortal mounts LiveAiGovernancePanel');
  assert.ok(adminSrc.includes('LiveAiGovernancePanel'), 'AdminPortal mounts LiveAiGovernancePanel');

  // 3. Verify fetchAiGovernance calls versioned /api/v1/assistant/ai-governance
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
          api_version: 'v1',
          supported_version_prefixes: ['/', '/v1'],
          disclosure: 'Synthetic only',
          advisory_governance: {
            ai_mode: 'ADVISORY_DECISION_SUPPORT_ONLY',
            models_can_approve_or_reject: false,
            ai_auto_approvals_or_rejections: 0,
            verified_human_officer_decisions: 3,
            unexplained_risk_scores: 0,
            every_score_has_reasons: true,
            training_data_provenance: 'SYNTHETIC_ONLY',
            real_ugvcl_retraining_gate: 'Pilot gate',
          },
          model_registry: [],
          monitoring: {
            scoped_total_requests: 6,
            open_queue_distribution: {
              low_lt_0_4: 3,
              watch_0_4_to_0_7: 2,
              high_gte_0_7: 1,
              high_risk_share_pct: 16.7,
            },
            runtime_counters: {
              classification_inferences: 6,
              sla_risk_inferences: 6,
              safety_deterministic_overrides: 1,
              ood_capped_load_inputs: 0,
              runtime_category_counts: {},
            },
            monitoring_alerts: [],
          },
        }),
        { status: 200 }
      );
    };

    const gov = await fetchAiGovernance();
    assert.equal(calledUrl, '/api/v1/assistant/ai-governance');
    assert.equal(gov.api_version, 'v1');
    assert.equal(gov.advisory_governance.ai_auto_approvals_or_rejections, 0);
  } finally {
    clearBackendSession();
    globalThis.fetch = originalFetch;
  }

  console.log('AI governance model monitoring, /v1 API versioning, human-approval & 4-language checks passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
