import type { IncomingMessage, ServerResponse } from 'http';
import { AuthSecurityError, parseSessionCookieHeader } from './authService';
import { defaultServerDataStore } from './dataStore';
import type { MeterReadingSubmission, AnomalyReviewStatus, MeterReadingRecord } from '../services/meterReading';
import { validateExistingBill } from '../services/billingValidation';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage, maxBytes = 7_500_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > maxBytes) throw new AuthSecurityError(400, 'PAYLOAD_TOO_LARGE', 'Request exceeds the 7.5 MiB limit.');
    chunks.push(data);
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AuthSecurityError(400, 'INVALID_BODY', 'A JSON object is required.');
  return parsed as Record<string, unknown>;
}

function validCsrf(req: IncomingMessage): boolean {
  const header = req.headers['x-vidyutflow-csrf'];
  if (!(header === '1' || header === 'true' || req.headers['x-requested-with'] === 'VidyutFlow-ERP')) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().split(':')[0].toLowerCase();
    const originHost = new URL(origin).hostname.toLowerCase();
    const local = ['localhost', '127.0.0.1'].includes(originHost) && ['localhost', '127.0.0.1'].includes(host);
    return local || !host || originHost === host;
  } catch {
    return false;
  }
}

export const METER_READING_ROUTE_PREFIXES = [
  '/api/meter-readings',
  '/api/meter-anomalies',
  '/api/billing-reviews',
  '/api/financial-adjustments',
  '/api/meter-metrics',
  '/api/meter-thresholds',
  '/api/meter-config',
  '/api/meter-ocr-health',
  '/api/bills/validate'
];

export function isMeterReadingRoutePath(pathname: string): boolean {
  return METER_READING_ROUTE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function normalizeMeterPathname(pathname: string): string {
  if (pathname === '/api/meter-anomalies' || pathname === '/api/meter-anomalies/') {
    return '/api/meter-readings/anomalies';
  }
  if (pathname.startsWith('/api/meter-anomalies/')) {
    return pathname.replace(/^\/api\/meter-anomalies\//, '/api/meter-readings/anomalies/');
  }
  if (pathname === '/api/billing-reviews' || pathname === '/api/billing-reviews/') {
    return '/api/meter-readings/billing-reviews';
  }
  if (pathname.startsWith('/api/billing-reviews/')) {
    return pathname.replace(/^\/api\/billing-reviews\//, '/api/meter-readings/billing-reviews/');
  }
  if (pathname === '/api/financial-adjustments' || pathname === '/api/financial-adjustments/') {
    return '/api/meter-readings/adjustments';
  }
  if (pathname.startsWith('/api/financial-adjustments/')) {
    return pathname.replace(/^\/api\/financial-adjustments\//, '/api/meter-readings/adjustments/');
  }
  if (pathname === '/api/meter-metrics' || pathname === '/api/meter-metrics/') {
    return '/api/meter-readings/metrics';
  }
  if (pathname === '/api/meter-thresholds' || pathname === '/api/meter-thresholds/') {
    return '/api/meter-readings/thresholds';
  }
  if (pathname === '/api/meter-config' || pathname === '/api/meter-config/') {
    return '/api/meter-readings/config';
  }
  if (pathname === '/api/meter-ocr-health' || pathname === '/api/meter-ocr-health/') {
    return '/api/meter-readings/ocr-health';
  }
  if (pathname === '/api/bills/validate' || pathname === '/api/bills/validate/') {
    return '/api/meter-readings/validate-bill';
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export async function handleMeterReadingRoute(
  req: IncomingMessage,
  res: ServerResponse,
  store = defaultServerDataStore
): Promise<boolean> {
  const requestUrl = (req as IncomingMessage & { originalUrl?: string }).originalUrl || req.url || '/';
  const rawUrl =
    requestUrl.startsWith('/api/')
      ? requestUrl
      : `/api/meter-readings${requestUrl.startsWith('/') ? '' : '/'}${requestUrl}`;
  const url = new URL(rawUrl, 'http://localhost');
  if (!isMeterReadingRoutePath(url.pathname)) return false;

  const pathname = normalizeMeterPathname(url.pathname);
  const token = parseSessionCookieHeader(req.headers.cookie);
  if (!token) {
    json(res, 401, { error: 'Authentication required.', code: 'AUTH_REQUIRED' });
    return true;
  }
  if (req.method !== 'GET' && !validCsrf(req)) {
    json(res, 403, { error: 'CSRF validation failed.', code: 'CSRF_INVALID' });
    return true;
  }
  try {
    const fastApiBase = process.env.FASTAPI_BACKEND_URL?.trim();
    if (fastApiBase && store === defaultServerDataStore) {
      const targetPath = pathname.replace(/^\/api\/meter-readings/, '/v1/meter-readings');
      const targetUrl = `${fastApiBase.replace(/\/$/, '')}${targetPath}${url.search}`;
      const bodyPayload = req.method !== 'GET' && req.method !== 'HEAD' ? await readJson(req) : undefined;
      const upstreamRes = await fetch(targetUrl, {
        method: req.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}),
          ...(req.headers.authorization ? { Authorization: String(req.headers.authorization) } : {}),
          'X-VidyutFlow-CSRF': '1'
        },
        ...(bodyPayload ? { body: JSON.stringify(bodyPayload) } : {})
      });
      const responseJson = await upstreamRes.json().catch(() => ({}));
      json(res, upstreamRes.status, responseJson);
      return true;
    }

    if (pathname === '/api/meter-readings' && req.method === 'GET') {
      json(res, 200, { readings: store.getMeterReadings(token) });
      return true;
    }
    if (pathname === '/api/meter-readings/photos' && req.method === 'POST') {
      const body = await readJson(req);
      json(res, 201, { photo: store.uploadMeterPhoto(token, body as never) });
      return true;
    }
    if (pathname === '/api/meter-readings/notifications' && req.method === 'GET') {
      json(res, 200, { notifications: store.getMeterNotifications(token) });
      return true;
    }
    if (pathname === '/api/meter-readings' && req.method === 'POST') {
      const body = await readJson(req) as unknown as MeterReadingSubmission;
      json(res, 201, { reading: store.submitMeterReading(token, body) });
      return true;
    }
    if (pathname === '/api/meter-readings/metrics' && req.method === 'GET') {
      json(res, 200, store.getMeterMetrics(token));
      return true;
    }
    if (pathname === '/api/meter-readings/ocr-health' && req.method === 'GET') {
      json(res, 200, { health: store.getOcrIntegrationHealth(token) });
      return true;
    }
    if (pathname === '/api/meter-readings/thresholds' && req.method === 'GET') {
      json(res, 200, { thresholds: store.getMeterThresholds(token) });
      return true;
    }
    if (pathname === '/api/meter-readings/config' && req.method === 'GET') {
      const consumerNo = url.searchParams.get('consumerNo') || '';
      if (!consumerNo) throw new AuthSecurityError(400, 'CONNECTION_REQUIRED', 'Choose a connection to read its meter configuration.');
      json(res, 200, { configuration: store.getMeterConfiguration(token, consumerNo) });
      return true;
    }
    if (pathname === '/api/meter-readings/config' && (req.method === 'PATCH' || req.method === 'POST')) {
      const body = await readJson(req);
      json(res, 200, { configuration: store.setMeterConfiguration(token, body as never) });
      return true;
    }
    if (pathname === '/api/meter-readings/thresholds' && (req.method === 'PATCH' || req.method === 'POST')) {
      const body = await readJson(req);
      json(res, 200, { thresholds: store.setMeterThresholds(token, body as never) });
      return true;
    }

    // --- Phase 11C/11E: Read-Only Bill Validation ---
    if (pathname === '/api/meter-readings/validate-bill' && (req.method === 'GET' || req.method === 'POST')) {
      let billNo = url.searchParams.get('billNo') || '';
      if (!billNo && req.method === 'POST') {
        const body = await readJson(req);
        if (typeof body.billNo === 'string') billNo = body.billNo;
      }
      if (!billNo) throw new AuthSecurityError(400, 'BILL_NUMBER_REQUIRED', 'Specify a valid bill number.');
      const bill = store.getBillByNumber(token, billNo);
      const connection = store.getConnectionByNumber(token, bill.consumerNo);
      const allBills = store.getBills(token);
      const payments = store.getPayments(token);
      let readings: MeterReadingRecord[] = [];
      try { readings = store.getMeterReadings(token); } catch {}
      const validation = validateExistingBill({ bill, connection, allBills, payments, meterReadings: readings });
      json(res, 200, { validation });
      return true;
    }

    // --- Phase 11C/11E: Anomaly Case Management ---
    if (pathname === '/api/meter-readings/anomalies' && req.method === 'GET') {
      const consumerNo = url.searchParams.get('consumerNo') || undefined;
      const status = (url.searchParams.get('status') as AnomalyReviewStatus) || undefined;
      json(res, 200, { anomalies: store.getAnomalyCases(token, { consumerNo, status }) });
      return true;
    }

    const anomalyMatch = pathname.match(/^\/api\/meter-readings\/anomalies\/([A-Za-z0-9_-]+)(\/transition)?$/);
    if (anomalyMatch) {
      const id = anomalyMatch[1];
      const isTransition = anomalyMatch[2] === '/transition';
      if (!isTransition && req.method === 'GET') {
        json(res, 200, { anomaly: store.getAnomalyCaseById(token, id) });
        return true;
      }
      if (isTransition && (req.method === 'PATCH' || req.method === 'POST')) {
        const body = await readJson(req);
        const nextStatus = (body.nextStatus || body.status) as AnomalyReviewStatus;
        const note = typeof body.note === 'string' ? body.note : '';
        json(res, 200, { anomaly: store.transitionAnomalyStatus(token, id, nextStatus, note) });
        return true;
      }
    }

    // --- Phase 11C/11E: Consumer Billing Review Requests ---
    if (pathname === '/api/meter-readings/billing-reviews' && req.method === 'POST') {
      const body = await readJson(req);
      json(res, 201, { review: store.createConsumerBillingReview(token, body as never) });
      return true;
    }
    if (pathname === '/api/meter-readings/billing-reviews' && req.method === 'GET') {
      const billNo = url.searchParams.get('billNo') || undefined;
      json(res, 200, { reviews: store.getConsumerBillingReviews(token, billNo) });
      return true;
    }

    const reviewMatch = pathname.match(/^\/api\/meter-readings\/billing-reviews\/([A-Za-z0-9_-]+)(\/transition|\/photo)?$/);
    if (reviewMatch) {
      const id = reviewMatch[1];
      const isTransition = reviewMatch[2] === '/transition';
      const isPhoto = reviewMatch[2] === '/photo';
      if (!isTransition && !isPhoto && req.method === 'GET') {
        json(res, 200, { review: store.getConsumerBillingReviewById(token, id) });
        return true;
      }
      if (isPhoto && req.method === 'GET') {
        json(res, 200, { photo: store.getBillingReviewPhoto(token, id) });
        return true;
      }
      if (isTransition && (req.method === 'PATCH' || req.method === 'POST')) {
        const body = await readJson(req);
        const nextStatus = (body.nextStatus || body.status) as AnomalyReviewStatus;
        const staffNote =
          typeof body.staffNote === 'string'
            ? body.staffNote
            : typeof body.note === 'string'
            ? body.note
            : '';
        const publicNote = typeof body.publicNote === 'string' ? body.publicNote : undefined;
        const adjustmentId = typeof body.adjustmentId === 'string' ? body.adjustmentId : undefined;
        json(res, 200, { review: store.transitionBillingReview(token, id, nextStatus, staffNote, publicNote, adjustmentId) });
        return true;
      }
    }

    // --- Phase 11C/11E: Financial Adjustments (Append-Only) ---
    if (pathname === '/api/meter-readings/adjustments' && req.method === 'POST') {
      const body = await readJson(req);
      json(res, 201, { adjustment: store.proposeFinancialAdjustment(token, body as never) });
      return true;
    }
    if (pathname === '/api/meter-readings/adjustments' && req.method === 'GET') {
      const billNo = url.searchParams.get('billNo') || undefined;
      json(res, 200, { adjustments: store.getFinancialAdjustments(token, billNo) });
      return true;
    }

    if (pathname === '/api/meter-readings/issue-bill' && req.method === 'POST') {
      const body = await readJson(req);
      const readingId = typeof body.readingId === 'string' ? body.readingId : '';
      if (!readingId) throw new AuthSecurityError(400, 'READING_ID_REQUIRED', 'Specify an approved meter reading ID.');
      json(res, 201, store.issueBillFromApprovedReading(token, readingId));
      return true;
    }

    const adjMatch = pathname.match(/^\/api\/meter-readings\/adjustments\/([A-Za-z0-9_-]+)(\/review|\/apply)?$/);
    if (adjMatch) {
      const id = adjMatch[1];
      const isReview = adjMatch[2] === '/review';
      const isApply = adjMatch[2] === '/apply';
      if (!isReview && !isApply && req.method === 'GET') {
        json(res, 200, { adjustment: store.getFinancialAdjustmentById(token, id) });
        return true;
      }
      if (isReview && (req.method === 'PATCH' || req.method === 'POST')) {
        const body = await readJson(req);
        const action = body.action as 'APPROVE' | 'REJECT';
        if (action !== 'APPROVE' && action !== 'REJECT') {
          throw new AuthSecurityError(400, 'INVALID_ACTION', 'Action must be APPROVE or REJECT.');
        }
        const note = typeof body.note === 'string' ? body.note : '';
        json(res, 200, { adjustment: store.reviewFinancialAdjustment(token, id, action, note) });
        return true;
      }
      if (isApply && (req.method === 'PATCH' || req.method === 'POST')) {
        const body = await readJson(req);
        const note = typeof body.note === 'string' ? body.note : '';
        json(res, 200, { adjustment: store.applyFinancialAdjustmentToLedger(token, id, note) });
        return true;
      }
    }

    const match = pathname.match(/^\/api\/meter-readings\/([A-Za-z0-9_-]+)\/(review|photo)$/);
    if (match?.[2] === 'review' && (req.method === 'PATCH' || req.method === 'POST')) {
      const body = await readJson(req);
      const action = body.action;
      if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'REREAD') throw new AuthSecurityError(400, 'INVALID_REVIEW_ACTION', 'Choose approve, reject, or request re-reading.');
      const correctedReading = typeof body.correctedReading === 'number' ? body.correctedReading : undefined;
      json(res, 200, { reading: store.reviewMeterReading(token, match[1], action, typeof body.note === 'string' ? body.note : '', correctedReading) });
      return true;
    }
    if (match?.[2] === 'photo' && req.method === 'GET') {
      json(res, 200, { photo: store.getMeterPhoto(token, match[1]) });
      return true;
    }

    const isKnownEndpoint =
      pathname === '/api/meter-readings' ||
      pathname === '/api/meter-readings/photos' ||
      pathname === '/api/meter-readings/notifications' ||
      pathname === '/api/meter-readings/metrics' ||
      pathname === '/api/meter-readings/ocr-health' ||
      pathname === '/api/meter-readings/thresholds' ||
      pathname === '/api/meter-readings/config' ||
      pathname === '/api/meter-readings/validate-bill' ||
      pathname === '/api/meter-readings/anomalies' ||
      pathname === '/api/meter-readings/billing-reviews' ||
      pathname === '/api/meter-readings/adjustments' ||
      pathname === '/api/meter-readings/issue-bill' ||
      Boolean(anomalyMatch) ||
      Boolean(reviewMatch) ||
      Boolean(adjMatch) ||
      Boolean(match);

    if (isKnownEndpoint) {
      json(res, 405, { error: 'HTTP method not allowed for this endpoint.', code: 'METHOD_NOT_ALLOWED' });
      return true;
    }

    json(res, 404, { error: 'Meter-reading endpoint not found.', code: 'NOT_FOUND' });
  } catch (error) {
    const status = error instanceof AuthSecurityError ? error.statusCode : error instanceof SyntaxError ? 400 : 500;
    const code = error instanceof AuthSecurityError ? error.code : status === 400 ? 'INVALID_JSON' : 'METER_READING_ERROR';
    json(res, status, { error: error instanceof Error ? error.message : 'Meter-reading request failed.', code });
  }
  return true;
}
