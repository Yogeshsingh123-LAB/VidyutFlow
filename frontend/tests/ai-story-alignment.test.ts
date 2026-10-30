import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { clearBackendSession, syncBackendSession } from '../src/utils/backendSession';
import { fetchBackendAssistantContext } from '../src/utils/liveData';
import { SERVER_GEMINI_TIMEOUT_MS } from '../vite.config';

const frontendDir = process.cwd();
const repoRoot = path.resolve(frontendDir, '..');

// 1. Proxy and drawer source alignment
const viteSrc = fs.readFileSync(path.join(frontendDir, 'vite.config.ts'), 'utf8');
assert.ok(
  viteSrc.includes("'/api/assistant':"),
  'vite.config.ts must proxy /api/assistant (covering /ml-metrics and /chat)'
);

const drawerSrc = fs.readFileSync(
  path.join(frontendDir, 'src/components/common/AIAssistantDrawer.tsx'),
  'utf8'
);
assert.ok(drawerSrc.includes('fetchBackendAssistantContext('), 'AIAssistantDrawer queries FastAPI /assistant/chat context');
assert.ok(drawerSrc.includes('Gemini + Read-Only Tools'), 'AIAssistantDrawer badges live Gemini responses explicitly');
assert.ok(drawerSrc.includes('Grounded Engine'), 'AIAssistantDrawer badges deterministic fallback responses explicitly');
assert.ok(drawerSrc.includes('+ TF-IDF Policy RAG'), 'AIAssistantDrawer badges cited FastAPI TF-IDF policy RAG context');

// 2. Documentation consistency across README, ARCHITECTURE, ML_REPORT, DEFENCE_QA, DEPLOYMENT_GUIDE
const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
const arch = fs.readFileSync(path.join(repoRoot, 'docs/ARCHITECTURE.md'), 'utf8');
const mlReport = fs.readFileSync(path.join(repoRoot, 'docs/ML_REPORT.md'), 'utf8');
const defenceQa = fs.readFileSync(path.join(repoRoot, 'docs/DEFENCE_QA.md'), 'utf8');
const deployGuide = fs.readFileSync(path.join(frontendDir, 'DEPLOYMENT_GUIDE.md'), 'utf8');

for (const [label, doc] of [
  ['README.md', readme],
  ['docs/ARCHITECTURE.md', arch],
  ['docs/ML_REPORT.md', mlReport],
  ['docs/DEFENCE_QA.md', defenceQa],
  ['frontend/DEPLOYMENT_GUIDE.md', deployGuide],
] as const) {
  assert.ok(doc.includes('TF-IDF'), `${label} must document local TF-IDF policy RAG`);
  assert.ok(doc.includes('Gemini'), `${label} must document optional server-side Gemini layer`);
}
assert.equal(SERVER_GEMINI_TIMEOUT_MS, 3500);
assert.ok(deployGuide.includes('3,500ms'), 'DEPLOYMENT_GUIDE.md must match 3,500ms SERVER_GEMINI_TIMEOUT_MS');

// 3. Behavioral tests for fetchBackendAssistantContext
const originalFetch = globalThis.fetch;
try {
  // Without an active backend session, returns null without hitting network
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response('{}', { status: 200 });
  };
  assert.equal(await fetchBackendAssistantContext('What is the procedure for a new connection?'), null);
  assert.equal(fetchCalled, false);

  // With verified backend session, returns cited TF-IDF policy answer & sources
  globalThis.fetch = async url =>
    String(url).endsWith('/login')
      ? new Response(JSON.stringify({ access_token: 'officer-token' }), { status: 200 })
      : new Response(JSON.stringify({ email: 'officer@vidyut.local', role: 'officer' }), { status: 200 });
  assert.equal(await syncBackendSession('officer@vidyut.local', 'Officer@123', 'employee'), true);

  globalThis.fetch = async url => {
    const u = String(url);
    if (u === '/api/auth/me') {
      return new Response(
        JSON.stringify({ authenticated: true, user: { email: 'officer@vidyut.local' }, role: 'employee' }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        answer: 'New residential connections require valid ID and ownership proof.',
        sources: ['new_connection_policy.md'],
        data: [],
      }),
      { status: 200 }
    );
  };
  const cited = await fetchBackendAssistantContext('What documents are required for a new connection?');
  assert.deepEqual(cited, {
    answer: 'New residential connections require valid ID and ownership proof.',
    sources: ['new_connection_policy.md'],
    liveDataCount: 0,
  });

  // Unmatched generic miss from /assistant/chat returns null rather than noise
  globalThis.fetch = async url => {
    if (String(url) === '/api/auth/me') {
      return new Response(
        JSON.stringify({ authenticated: true, user: { email: 'officer@vidyut.local' }, role: 'employee' }),
        { status: 200 }
      );
    }
    return new Response(
      JSON.stringify({
        answer: 'I could not find that in the policy documents. Try asking about new connections, SLA or offline field work.',
        sources: [],
        data: [],
      }),
      { status: 200 }
    );
  };
  assert.equal(await fetchBackendAssistantContext('random unrelated phrase'), null);
} finally {
  clearBackendSession();
  globalThis.fetch = originalFetch;
}

console.log('AI assistant story alignment and citation bridge checks passed.');
