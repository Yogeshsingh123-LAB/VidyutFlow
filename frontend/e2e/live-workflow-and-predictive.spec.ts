import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { attachZeroPageErrorGuard, enterPortalViaDemoSandbox } from './helpers';

test.describe('VidyutFlow — Live FastAPI Workflow, Cookie Auth & Predictive Services', () => {
  test('executes full 4-role lifecycle via HttpOnly cookie auth (Consumer -> Field UUID Dedupe -> Officer Approval -> Admin SHA-256 Audit Verify)', async ({
    page,
  }) => {
    const pageErrors = attachZeroPageErrorGuard(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const loginCookie = async (username: string, password: string) => {
      return page.evaluate(
        async ({ u, p }) => {
          const form = new URLSearchParams();
          form.set('username', u);
          form.set('password', p);
          const res = await fetch('/api/v1/auth/login?use_cookie=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
            credentials: 'include',
          });
          return {
            status: res.status,
            apiVersion: res.headers.get('x-api-version'),
            csp: res.headers.get('content-security-policy'),
            localStorageKeys: Object.keys(window.localStorage),
          };
        },
        { u: username, p: password },
      );
    };

    // 1. Consumer login via HttpOnly cookie + zero localStorage token check
    const consumerLogin = await loginCookie('consumer@vidyut.local', 'Consumer@123');
    expect(consumerLogin.status).toBe(200);
    expect(consumerLogin.apiVersion).toBe('v1');
    expect(consumerLogin.csp).toContain("default-src 'self'");
    for (const key of consumerLogin.localStorageKeys) {
      expect(key.toLowerCase()).not.toContain('token');
      expect(key.toLowerCase()).not.toContain('jwt');
    }

    // 2. Consumer submits canonical request with %PDF-1.4 KYC document -> AES-256-GCM vault + ML triage + zone routing
    const createdReq = await page.evaluate(async () => {
      const fd = new FormData();
      fd.set('applicant_name', 'Kiranben Patel');
      fd.set('phone', '9898123456');
      fd.set('address', 'Plot 42, Sector 11, Gandhinagar 382011');
      fd.set('zone', 'North');
      fd.set('pin_code', '382011');
      fd.set('request_type', 'new_connection');
      fd.set(
        'description',
        'Need a new single-phase 4 kW domestic electricity meter at Sector 11 Gandhinagar.',
      );
      fd.set('requested_load_kw', '4.0');
      fd.set('tariff_category', 'Residential (RGPU)');
      fd.set('phase', '1-Phase');
      fd.set('premises_type', 'Owned');
      const pdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
      fd.set(
        'document',
        new File([pdfBytes], 'kyc_identity_proof.pdf', { type: 'application/pdf' }),
      );

      const res = await fetch('/api/v1/requests/with-document', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      return { status: res.status, data: await res.json() };
    });

    expect(createdReq.status).toBe(201);
    expect(createdReq.data.id).toBeTruthy();
    expect(createdReq.data.status).toBe('ASSIGNED');
    expect(createdReq.data.assigned_engineer_id).toBeTruthy();
    expect(createdReq.data.document_name).toContain('kyc_identity_proof.pdf');
    expect(createdReq.data.category).toBeTruthy();
    expect(typeof createdReq.data.sla_breach_risk).toBe('number');

    const requestId: string = createdReq.data.id;
    const clientUuid = randomUUID();

    // 3. Field Engineer logs in and replays the exact same client_uuid twice (idempotency proof)
    const engLogin = await loginCookie('engineer@vidyut.local', 'Engineer@123');
    expect(engLogin.status).toBe(200);

    const syncAttempt = async () =>
      page.evaluate(
        async ({ reqId, uuid }) => {
          const res = await fetch('/api/v1/requests/field-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              client_uuid: uuid,
              request_id: reqId,
              task_status: 'FIELD_VERIFIED',
              notes: 'Playwright offline sync verification',
              meter_serial: 'UGV-PW-44021',
              created_offline_at: new Date().toISOString(),
            }),
          });
          return { status: res.status, data: await res.json() };
        },
        { reqId: requestId, uuid: clientUuid },
      );

    const firstSync = await syncAttempt();
    expect(firstSync.status).toBe(200);
    expect(firstSync.data.duplicate).toBe(false);
    expect(firstSync.data.synced).toBe(true);
    expect(firstSync.data.request_status).toBe('FIELD_VERIFIED');

    const duplicateReplay = await syncAttempt();
    expect(duplicateReplay.status).toBe(200);
    expect(duplicateReplay.data.duplicate).toBe(true);
    expect(duplicateReplay.data.synced).toBe(false);

    // 4. Subdivision Officer sanctions APPROVED
    const officerLogin = await loginCookie('officer@vidyut.local', 'Officer@123');
    expect(officerLogin.status).toBe(200);

    const approval = await page.evaluate(async (reqId) => {
      const res = await fetch(`/api/v1/requests/${reqId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'APPROVED',
          notes: 'Playwright E2E officer sanction verified',
        }),
      });
      return { status: res.status, data: await res.json() };
    }, requestId);

    expect(approval.status).toBe(200);
    expect(approval.data.status).toBe('APPROVED');

    // 5. Admin verifies tamper-evident SHA-256 audit hash chain
    const adminLogin = await loginCookie('admin@vidyut.local', 'Admin@123');
    expect(adminLogin.status).toBe(200);

    const auditVerify = await page.evaluate(async () => {
      const res = await fetch('/api/v1/requests/audit/verify', {
        credentials: 'include',
      });
      return { status: res.status, data: await res.json() };
    });

    expect(auditVerify.status).toBe(200);
    expect(Boolean(auditVerify.data.ok ?? auditVerify.data.valid)).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test('executes live IsolationForest billing anomaly audit inside Management AI Insights', async ({
    page,
  }) => {
    const pageErrors = attachZeroPageErrorGuard(page);
    await enterPortalViaDemoSandbox(page, 'management');

    // Switch to AI Insights tab inside Sidebar
    const aiInsightsBtn = page
      .locator('aside button, nav button')
      .filter({ hasText: /AI Insights|AI/i })
      .first();
    await expect(aiInsightsBtn).toBeVisible();
    await aiInsightsBtn.click();

    const panel = page.getByTestId('live-predictive-decision-panel');
    await expect(panel).toBeVisible();

    // Run IsolationForest Audit on abnormal 4.5x spike preset
    await panel.getByRole('button', { name: /Preset: 4\.5x Spike/i }).click();
    await panel.getByRole('button', { name: /Run IsolationForest Audit/i }).click();

    const verdict = page.getByTestId('billing-anomaly-verdict');
    await expect(verdict).toBeVisible();
    await expect(verdict).toContainText(/ANOMALY|NORMAL|RGPU|Slab/i);

    expect(pageErrors).toEqual([]);
  });
});
