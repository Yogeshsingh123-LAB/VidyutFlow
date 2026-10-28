import {
  ApiResponse,
  ApiErrorCode,
  OperatingDataMode
} from './erpApiContracts';

/**
 * ============================================================================
 * VIDYUTFLOW CENTRALIZED TYPED API CLIENT (Phase 5)
 * ============================================================================
 * Features:
 * - Configurable backend base URL (`VITE_API_BASE_URL` or custom override).
 * - Authenticated requests with `HttpOnly` session cookies (`credentials: 'same-origin'`)
 *   and automatic CSRF security headers (`X-VidyutFlow-CSRF: 1`) on mutations.
 * - Request timeout enforcement via `AbortController`.
 * - Unique `X-Request-Id` header generation on every call for distributed tracing.
 * - Safe retry rules: ONLY retries idempotent requests (`GET`, `HEAD`, `OPTIONS`,
 *   or mutations carrying an explicit `idempotencyKey`) on transient network or
 *   `502`/`503`/`504` gateway errors. Never retries `4xx` or un-keyed mutations.
 * - Strict separation between `DEMO` and `LIVE` modes: `LIVE` mode never silently
 *   falls back to simulated demo data when a backend endpoint fails or is missing.
 * ============================================================================
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  mode?: OperatingDataMode;
  fetchImpl?: typeof fetch;
}

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  idempotencyKey?: string;
  expectedVersion?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

export const DATA_MODE_STORAGE_KEY = 'vidyutflow_operating_data_mode';

export function generateRequestId(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REQ-${Date.now()}-${rand}`;
}

export function getConfiguredApiBaseUrl(): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (metaEnv?.VITE_API_BASE_URL) {
      return metaEnv.VITE_API_BASE_URL.replace(/\/+$/, '');
    }
  } catch {}
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  return '';
}

export function getStoredDataMode(storage?: Pick<Storage, 'getItem'> | null): OperatingDataMode {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (!targetStorage) return 'DEMO';
  try {
    const raw = targetStorage.getItem(DATA_MODE_STORAGE_KEY);
    if (raw === 'LIVE' || raw === 'DEMO') {
      return raw;
    }
  } catch {}
  return 'DEMO';
}

export function setStoredDataMode(
  mode: OperatingDataMode,
  storage?: Pick<Storage, 'setItem'> | null
): OperatingDataMode {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.localStorage
        : null;
  if (targetStorage) {
    try {
      targetStorage.setItem(DATA_MODE_STORAGE_KEY, mode);
    } catch {}
  }
  return mode;
}

const IDEMPOTENT_METHODS = new Set<HttpMethod>(['GET']);
const TRANSIENT_STATUS_CODES = new Set<number>([502, 503, 504]);

function isSafeToRetry(method: HttpMethod, idempotencyKey?: string): boolean {
  if (IDEMPOTENT_METHODS.has(method)) return true;
  if (idempotencyKey && idempotencyKey.trim().length > 0) return true;
  return false;
}

function mapStatusToErrorCode(status: number, serverCode?: string): ApiErrorCode {
  if (serverCode) {
    return serverCode as ApiErrorCode;
  }
  switch (status) {
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'UNAUTHORIZED_ROLE';
    case 404:
      return 'BACKEND_UNAVAILABLE';
    case 408:
      return 'REQUEST_TIMEOUT';
    case 409:
      return 'CONFLICT_VERSION_MISMATCH';
    case 422:
    case 400:
      return 'VALIDATION_FAILED';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 502:
    case 503:
    case 504:
      return 'BACKEND_UNAVAILABLE';
    default:
      return 'INTERNAL_FAULT';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ErpApiClient {
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryDelayMs: number;
  private mode: OperatingDataMode;
  private fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? getConfiguredApiBaseUrl()).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 8000;
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelayMs = config.retryDelayMs ?? 150;
    this.mode = config.mode ?? getStoredDataMode();
    this.fetchImpl = config.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (() => {
      throw new Error('Global fetch is not available in this runtime.');
    }) as unknown as typeof fetch);
  }

  public getMode(): OperatingDataMode {
    return this.mode;
  }

  public setMode(mode: OperatingDataMode): void {
    this.mode = mode;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Executes an HTTP request against the configured backend in LIVE mode.
   * Note: Does NOT silently fall back to demo data if the request fails.
   */
  public async request<T>(
    path: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const method: HttpMethod = options.method || 'GET';
    const requestId = generateRequestId();
    const startTime = Date.now();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const maxRetries =
      options.maxRetries !== undefined
        ? options.maxRetries
        : isSafeToRetry(method, options.idempotencyKey)
          ? this.maxRetries
          : 0;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': requestId,
      ...(options.headers || {})
    };

    // State-changing requests always attach the CSRF protection header
    if (method !== 'GET') {
      headers['X-VidyutFlow-CSRF'] = '1';
      headers['X-Requested-With'] = 'VidyutFlow-ERP';
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    if (options.expectedVersion !== undefined) {
      headers['If-Match'] = `"v${options.expectedVersion}"`;
      headers['X-Expected-Version'] = String(options.expectedVersion);
    }

    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => {
        controller.abort(new Error('REQUEST_TIMEOUT'));
      }, timeoutMs);

      try {
        const response = await this.fetchImpl(url, {
          method,
          credentials: this.baseUrl ? 'include' : 'same-origin',
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: options.signal || controller.signal
        });

        clearTimeout(timeoutHandle);

        const contentType = response.headers?.get?.('content-type') || '';
        let parsedBody: Record<string, unknown> | null = null;
        let jsonParseFailed = false;

        if (contentType.includes('application/json') || typeof response.json === 'function') {
          try {
            parsedBody = (await response.json()) as Record<string, unknown>;
          } catch {
            parsedBody = null;
            jsonParseFailed = true;
          }
        }

        // Check if transient gateway failure should be retried
        if (
          !response.ok &&
          TRANSIENT_STATUS_CODES.has(response.status) &&
          attempt < maxRetries &&
          isSafeToRetry(method, options.idempotencyKey)
        ) {
          attempt++;
          await sleep(this.retryDelayMs * attempt);
          continue;
        }

        // If Vite dev server returns HTML fallback (200 text/html) or malformed JSON for an /api/* route,
        // treat it explicitly as BACKEND_UNAVAILABLE rather than valid JSON data!
        if (
          response.ok &&
          ((contentType.includes('text/html') && normalizedPath.startsWith('/api/')) ||
            jsonParseFailed ||
            parsedBody === null)
        ) {
          return {
            success: false,
            error: jsonParseFailed
              ? `Malformed non-JSON payload received from ${method} ${normalizedPath}.`
              : `Backend endpoint ${method} ${normalizedPath} is not yet mounted on the server (received HTML fallback).`,
            code: 'BACKEND_UNAVAILABLE',
            statusCode: 503,
            timestamp: new Date().toISOString(),
            requestId,
            meta: {
              source: 'backend-live',
              mode: this.mode,
              processingTimeMs: Date.now() - startTime,
              retriedCount: attempt
            }
          };
        }

        if (!response.ok) {
          const serverErrorMsg =
            (parsedBody?.error as string) ||
            (parsedBody?.message as string) ||
            (response.status === 404
              ? `Backend endpoint ${method} ${normalizedPath} is not implemented or reachable (HTTP 404).`
              : `Backend request failed with HTTP ${response.status}.`);
          const errorCode = mapStatusToErrorCode(
            response.status,
            parsedBody?.code as string | undefined
          );

          return {
            success: false,
            error: serverErrorMsg,
            code: errorCode,
            statusCode: response.status,
            timestamp: new Date().toISOString(),
            requestId: (parsedBody?.requestId as string) || requestId,
            meta: {
              source: 'backend-live',
              mode: this.mode,
              processingTimeMs: Date.now() - startTime,
              retriedCount: attempt
            }
          };
        }

        // Extract data envelope if backend returns { success, data } or raw payload
        const responseData =
          parsedBody && 'data' in parsedBody
            ? (parsedBody.data as T)
            : (parsedBody as unknown as T);

        return {
          success: true,
          data: responseData,
          statusCode: response.status,
          timestamp: (parsedBody?.timestamp as string) || new Date().toISOString(),
          requestId: (parsedBody?.requestId as string) || requestId,
          meta: {
            source: 'backend-live',
            mode: this.mode,
            version:
              typeof (parsedBody?.meta as { version?: number })?.version === 'number'
                ? (parsedBody?.meta as { version?: number }).version
                : undefined,
            processingTimeMs: Date.now() - startTime,
            retriedCount: attempt
          }
        };
      } catch (err: unknown) {
        clearTimeout(timeoutHandle);

        const isAbortTimeout =
          (err instanceof Error &&
            (err.name === 'AbortError' || err.message.includes('REQUEST_TIMEOUT'))) ||
          controller.signal.aborted;

        if (
          !isAbortTimeout &&
          attempt < maxRetries &&
          isSafeToRetry(method, options.idempotencyKey)
        ) {
          attempt++;
          await sleep(this.retryDelayMs * attempt);
          continue;
        }

        if (isAbortTimeout) {
          return {
            success: false,
            error: `Backend request ${method} ${normalizedPath} timed out after ${timeoutMs}ms (Request ID: ${requestId}).`,
            code: 'REQUEST_TIMEOUT',
            statusCode: 408,
            timestamp: new Date().toISOString(),
            requestId,
            meta: {
              source: 'backend-live',
              mode: this.mode,
              processingTimeMs: Date.now() - startTime,
              retriedCount: attempt
            }
          };
        }

        return {
          success: false,
          error: `Backend service unreachable for ${method} ${normalizedPath}. Live mode does not automatically fall back to demo data.`,
          code: 'BACKEND_UNAVAILABLE',
          statusCode: 503,
          timestamp: new Date().toISOString(),
          requestId,
          meta: {
            source: 'backend-live',
            mode: this.mode,
            processingTimeMs: Date.now() - startTime,
            retriedCount: attempt
          }
        };
      }
    }
  }

  public get<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  public patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  public put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  public delete<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const defaultErpApiClient = new ErpApiClient();
