/**
 * VidyutFlow FastAPI Client & Utility Bridge
 * Provides typed access to VidyutFlow's Python/FastAPI backend services:
 * - /api/requests (Connection requests, status updates, document uploads)
 * - /api/requests/kpis/summary (Live KPI aggregations)
 * - /api/assistant/ml-metrics (ML model accuracy and SLA breach risk predictions)
 * - /api/requests/audit/logs (Audit trail logs)
 * - /api/system/status (System diagnostic status)
 */

import { clearBackendSession, getBackendToken, getVerifiedBackendToken } from './backendSession';

const BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export interface FastApiRequestOptions extends RequestInit {
  /** Set to false only for explicitly public endpoints (e.g. /system/demo-load-policy). */
  auth?: boolean;
}

export const getAuthToken = (): string | null => getBackendToken();

export async function fastApi<T = any>(path: string, opts: FastApiRequestOptions = {}): Promise<T> {
  const { auth = true, headers: customHeaders, ...fetchOpts } = opts;
  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (auth) {
    const token = await getVerifiedBackendToken();
    if (!token) {
      const unauthError: any = new Error('No verified backend session for the active portal user.');
      unauthError.status = 401;
      throw unauthError;
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...fetchOpts,
    headers,
  });

  if (!res.ok) {
    if (auth && res.status === 401) {
      clearBackendSession();
    }
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const body = JSON.parse(text);
      if (typeof body.detail === 'string') message = body.detail;
    } catch {}
    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

export const jsonPayload = (method: string, body: any): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * CSV Export Utility
 */
const FORMULA_PREFIX = /^[\s\u0000-\u001f\uFEFF]*[=+\-@]/;

export function sanitizeCsvCell(value: any): string {
  const text = String(value ?? '');
  const safe = FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsvString(rows: any[][]): string {
  return rows.map(row => row.map(sanitizeCsvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, rows: any[][]): void {
  const csvContent = toCsvString(rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
