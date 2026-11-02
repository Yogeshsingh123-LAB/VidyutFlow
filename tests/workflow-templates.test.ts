import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FALLBACK_WORKFLOW_TEMPLATES,
  WORKFLOW_TEMPLATE_TRANSLATIONS,
} from '../src/components/admin/LiveWorkflowTemplatesPanel';
import { CONSUMER_WORKFLOW_INTAKE_TEXT } from '../src/components/consumer/ConsumerPortal';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import {
  createWorkflowTemplate,
  fetchWorkflowTemplates,
  updateWorkflowTemplate,
} from '../src/utils/liveData';

const frontendDir = process.cwd();

async function run() {
  // 1. Verify 4-language parity for Admin & Consumer workflow template dictionaries
  for (const dictGroup of [WORKFLOW_TEMPLATE_TRANSLATIONS, CONSUMER_WORKFLOW_INTAKE_TEXT]) {
    const enKeys = Object.keys(dictGroup.en);
    for (const lang of ['en', 'gu', 'hi', 'mr'] as const) {
      const langDict = dictGroup[lang] as Record<string, string>;
      const enDict = dictGroup.en as Record<string, string>;
      for (const k of enKeys) {
        assert.ok(langDict[k] && langDict[k].trim().length > 0, `[${lang}] Missing ${k}`);
        if (lang !== 'en') {
          assert.notEqual(langDict[k], enDict[k], `[${lang}] ${k} must be translated`);
        }
      }
    }
  }

  // 2. Verify all 5 canonical workflow templates exist in fallback
  const codes = new Set(FALLBACK_WORKFLOW_TEMPLATES.map(t => t.template_code));
  for (const expected of [
    'new_connection',
    'load_extension',
    'meter_replacement',
    'billing_dispute',
    'outage_safety',
  ]) {
    assert.ok(codes.has(expected), `Missing fallback template ${expected}`);
  }

  // 3. Verify Vite proxy + AdminPortal + ConsumerPortal wiring
  const viteSrc = fs.readFileSync(path.join(frontendDir, 'vite.config.ts'), 'utf8');
  assert.ok(viteSrc.includes("'/api/workflows'"), 'vite.config.ts proxies /api/workflows');

  const adminSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/admin/AdminPortal.tsx'),
    'utf8'
  );
  assert.ok(adminSrc.includes('LiveWorkflowTemplatesPanel'), 'AdminPortal mounts LiveWorkflowTemplatesPanel');

  const consumerSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/consumer/ConsumerPortal.tsx'),
    'utf8'
  );
  assert.ok(
    consumerSrc.includes('request_type: selectedTemplateCode'),
    'ConsumerPortal submits selectedTemplateCode as request_type'
  );

  // 4. Verify live API helpers hit /api/workflows/templates*
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
      if ((init?.method || 'GET') === 'GET') {
        return new Response(
          JSON.stringify({ engine: 'Rule-based', items: FALLBACK_WORKFLOW_TEMPLATES }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify(FALLBACK_WORKFLOW_TEMPLATES[0]), { status: 200 });
    };

    const listRes = await fetchWorkflowTemplates(true);
    assert.equal(listRes.items.length, 5);
    await createWorkflowTemplate({
      template_code: 'solar_net_metering',
      name: 'Solar',
      sla_hours: 60,
      require_document: true,
      require_field_visit: true,
      max_auto_load_kw: 100,
      steps: ['SUBMITTED', 'COMPLETED'],
    });
    await updateWorkflowTemplate('load_extension', { sla_hours: 36 });

    assert.deepEqual(calls, [
      'GET /api/workflows/templates?include_inactive=true',
      'POST /api/workflows/templates',
      'PATCH /api/workflows/templates/load_extension',
    ]);
  } finally {
    clearBackendSession();
    globalThis.fetch = originalFetch;
  }

  console.log('Configurable workflow templates API, Consumer selector, Admin designer & 4-language checks passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
