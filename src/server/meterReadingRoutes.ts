import type { IncomingMessage, ServerResponse } from 'http';
import { AuthSecurityError, parseSessionCookieHeader } from './authService';
import { defaultServerDataStore } from './dataStore';
import type { MeterReadingSubmission } from '../services/meterReading';

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

export async function handleMeterReadingRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const requestUrl = (req as IncomingMessage & { originalUrl?: string }).originalUrl || req.url || '/';
  const normalizedUrl = requestUrl.startsWith('/api/meter-readings') ? requestUrl : `/api/meter-readings${requestUrl}`;
  const url = new URL(normalizedUrl, 'http://localhost');
  if (!url.pathname.startsWith('/api/meter-readings')) return false;
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
    if (url.pathname === '/api/meter-readings' && req.method === 'GET') {
      json(res, 200, { readings: defaultServerDataStore.getMeterReadings(token) });
      return true;
    }
    if (url.pathname === '/api/meter-readings/notifications' && req.method === 'GET') {
      json(res, 200, { notifications: defaultServerDataStore.getMeterNotifications(token) });
      return true;
    }
    if (url.pathname === '/api/meter-readings' && req.method === 'POST') {
      const body = await readJson(req) as unknown as MeterReadingSubmission;
      json(res, 201, { reading: defaultServerDataStore.submitMeterReading(token, body) });
      return true;
    }
    if (url.pathname === '/api/meter-readings/metrics' && req.method === 'GET') {
      json(res, 200, defaultServerDataStore.getMeterMetrics(token));
      return true;
    }
    if (url.pathname === '/api/meter-readings/thresholds' && req.method === 'GET') {
      json(res, 200, { thresholds: defaultServerDataStore.getMeterThresholds(token) });
      return true;
    }
    if (url.pathname === '/api/meter-readings/config' && req.method === 'GET') {
      const consumerNo = url.searchParams.get('consumerNo') || '';
      if (!consumerNo) throw new AuthSecurityError(400, 'CONNECTION_REQUIRED', 'Choose a connection to read its meter configuration.');
      json(res, 200, { configuration: defaultServerDataStore.getMeterConfiguration(token, consumerNo) });
      return true;
    }
    if (url.pathname === '/api/meter-readings/config' && req.method === 'PATCH') {
      const body = await readJson(req);
      json(res, 200, { configuration: defaultServerDataStore.setMeterConfiguration(token, body as never) });
      return true;
    }
    if (url.pathname === '/api/meter-readings/thresholds' && req.method === 'PATCH') {
      const body = await readJson(req);
      json(res, 200, { thresholds: defaultServerDataStore.setMeterThresholds(token, body as never) });
      return true;
    }
    const match = url.pathname.match(/^\/api\/meter-readings\/([A-Za-z0-9_-]+)\/(review|photo)$/);
    if (match?.[2] === 'review' && req.method === 'PATCH') {
      const body = await readJson(req);
      const action = body.action;
      if (action !== 'APPROVE' && action !== 'REJECT' && action !== 'REREAD') throw new AuthSecurityError(400, 'INVALID_REVIEW_ACTION', 'Choose approve, reject, or request re-reading.');
      json(res, 200, { reading: defaultServerDataStore.reviewMeterReading(token, match[1], action, typeof body.note === 'string' ? body.note : '') });
      return true;
    }
    if (match?.[2] === 'photo' && req.method === 'GET') {
      json(res, 200, { photo: defaultServerDataStore.getMeterPhoto(token, match[1]) });
      return true;
    }
    json(res, 404, { error: 'Meter-reading endpoint not found.' });
  } catch (error) {
    const status = error instanceof AuthSecurityError ? error.statusCode : error instanceof SyntaxError ? 400 : 500;
    const code = error instanceof AuthSecurityError ? error.code : status === 400 ? 'INVALID_JSON' : 'METER_READING_ERROR';
    json(res, status, { error: error instanceof Error ? error.message : 'Meter-reading request failed.', code });
  }
  return true;
}
