/**
 * Live API data layer — typed access to the FastAPI backend for the wired screens
 * (KPI panel, officer queue, wizard submit, alert centre).
 *
 * Every hook degrades gracefully: with no backend session (or an unreachable API)
 * `data` stays null and the UI keeps showing its demo workspace. Polling is the
 * honest "live on refresh" behaviour (45s) — real-time streaming is roadmap.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { hasBackendSession } from './backendSession';
import { fastApi, jsonPayload } from './fastApiClient';

export interface LiveKpiSummary {
  total_requests: number;
  completed: number;
  pending: number;
  high_sla_risk: number;
  needs_correction: number;
  avg_sla_risk: number;
  risk_buckets: Record<string, number>;
  by_status: Record<string, number>;
  by_zone: Record<string, number>;
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface LiveRequestRow {
  id: string;
  applicant_name: string;
  zone: string;
  status: string;
  category: string;
  severity: string;
  sla_breach_risk: number;
  sla_risk_reasons: string[];
  requested_load_kw: number;
  updated_at: string;
}

export interface LiveNotificationItem {
  id: string;
  title: string;
  message: string;
  kind: 'info' | 'warning' | 'success' | 'alert';
  request_id: string;
  read: boolean;
  created_at: string;
}

export const LIVE_POLL_MS = 45_000;

export const fetchLiveKpis = (): Promise<LiveKpiSummary> =>
  fastApi<LiveKpiSummary>('/requests/kpis/summary');

export const fetchLiveRequests = (): Promise<LiveRequestRow[]> =>
  fastApi<LiveRequestRow[]>('/requests');

export const fetchLiveNotifications = (): Promise<{
  unread: number;
  items: LiveNotificationItem[];
}> => fastApi<{ unread: number; items: LiveNotificationItem[] }>('/notifications');

export const markLiveNotificationRead = (id: string): Promise<unknown> =>
  fastApi(`/notifications/${id}/read`, { method: 'POST' });

export const markAllLiveNotificationsRead = (): Promise<unknown> =>
  fastApi('/notifications/read-all', { method: 'POST' });

export const submitLiveRequest = (payload: Record<string, unknown>): Promise<LiveRequestRow> =>
  fastApi<LiveRequestRow>('/requests', jsonPayload('POST', payload));

export interface LiveResource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

/** Poll a live endpoint (default 45s). Idle when there is no backend session. */
export function useLivePoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = LIVE_POLL_MS
): LiveResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (showSpinner: boolean) => {
    if (!hasBackendSession()) return;
    if (showSpinner) setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Live API unavailable');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const timer = setInterval(() => load(true), intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);

  return {
    data,
    error,
    loading,
    lastUpdated,
    refresh: () => load(true)
  };
}
