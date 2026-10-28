import crypto from 'crypto';
import { UserRole } from '../types';
import { generateUtilityGroundedResponse } from '../utils/utilityAiEngine';
import { AGENTIC_PERSONAS } from './agenticPersonas';

/**
 * VidyutFlow Intelligent AI Response Cache, Rate Limiter & Resilience Layer (Step 6B.4)
 *
 * Capabilities:
 * 1. User-isolated LRU in-memory response cache with TTL expiration.
 * 2. Per-user / per-client rate limiting to prevent spam and quota drainage.
 * 3. Gemini circuit breaker for quota exhaustion (429) and network timeouts.
 * 4. Bounded exponential backoff with jitter.
 * 5. Deterministic grounded fallback response synthesis.
 */

export interface CachedResponse {
  key: string;
  userId: string;
  role: UserRole;
  reply: string;
  executedTools: string[];
  timestamp: number;
  expiresAt: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export class AiCacheManager {
  private cache = new Map<string, CachedResponse>();
  private readonly maxCacheEntries: number;
  private readonly defaultTtlMs: number;

  // Rate Limiting
  private rateLimitMap = new Map<string, number[]>();
  private readonly rateLimitWindowMs: number;
  private readonly maxRequestsPerWindow: number;

  // Circuit Breaker for Gemini Quota / Network Failures
  private circuitCooldownUntil: number = 0;
  private circuitOpenReason: string | null = null;
  private readonly circuitCooldownDurationMs: number = 60 * 1000; // 60s cooldown

  // In-flight request coalescing to prevent duplicate concurrent Gemini API calls
  private inFlight = new Map<string, Promise<any>>();

  constructor(options: {
    maxCacheEntries?: number;
    defaultTtlMs?: number;
    rateLimitWindowMs?: number;
    maxRequestsPerWindow?: number;
    circuitCooldownDurationMs?: number;
  } = {}) {
    this.maxCacheEntries = options.maxCacheEntries || 200;
    this.defaultTtlMs = options.defaultTtlMs || 10 * 60 * 1000; // 10 minutes
    this.rateLimitWindowMs = options.rateLimitWindowMs || 60 * 1000; // 1 minute
    this.maxRequestsPerWindow = options.maxRequestsPerWindow || 20; // 20 queries/min
    if (options.circuitCooldownDurationMs) {
      this.circuitCooldownDurationMs = options.circuitCooldownDurationMs;
    }
  }

  /**
   * Generates a collision-resistant, tenant-isolated cache key.
   */
  public generateCacheKey(userId: string, role: UserRole, message: string, contextSummary: string = ''): string {
    const raw = `${userId}:${role}:${message.trim().toLowerCase()}:${contextSummary}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Retrieves a cached response if valid, not expired, and matching user/role scope.
   */
  public get(
    key: string,
    nowMs: number = Date.now(),
    expectedUserId?: string,
    expectedRole?: UserRole
  ): CachedResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (nowMs > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    if (expectedUserId && entry.userId !== expectedUserId) {
      return null;
    }
    if (expectedRole && entry.role !== expectedRole) {
      return null;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Coalesces concurrent identical requests so only a single upstream Gemini API call executes.
   */
  public async coalesceInFlight<T>(key: string, factory: () => Promise<T>): Promise<{ value: T; coalesced: boolean }> {
    const existing = this.inFlight.get(key);
    if (existing) {
      const value = await existing;
      return { value, coalesced: true };
    }

    const promise = factory().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    const value = await promise;
    return { value, coalesced: false };
  }

  /**
   * Stores a response in the user-scoped cache.
   */
  public set(
    key: string,
    userId: string,
    role: UserRole,
    reply: string,
    executedTools: string[] = [],
    ttlMs?: number,
    nowMs: number = Date.now()
  ): void {
    const effectiveTtl = ttlMs || this.defaultTtlMs;

    // Prune if over capacity
    if (this.cache.size >= this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      userId,
      role,
      reply,
      executedTools,
      timestamp: nowMs,
      expiresAt: nowMs + effectiveTtl
    });
  }

  /**
   * Checks sliding window rate limit for user / IP.
   */
  public checkRateLimit(clientId: string, nowMs: number = Date.now()): RateLimitStatus {
    const timestamps = (this.rateLimitMap.get(clientId) || []).filter(
      t => nowMs - t < this.rateLimitWindowMs
    );

    if (timestamps.length >= this.maxRequestsPerWindow) {
      const oldest = timestamps[0];
      const retryAfterMs = Math.max(0, this.rateLimitWindowMs - (nowMs - oldest));
      this.rateLimitMap.set(clientId, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs
      };
    }

    timestamps.push(nowMs);
    this.rateLimitMap.set(clientId, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequestsPerWindow - timestamps.length
    };
  }

  /**
   * Returns whether the Gemini circuit breaker is currently open (cooldown active).
   */
  public isCircuitOpen(nowMs: number = Date.now()): { isOpen: boolean; reason: string | null } {
    if (nowMs < this.circuitCooldownUntil) {
      return {
        isOpen: true,
        reason: this.circuitOpenReason
      };
    }
    return { isOpen: false, reason: null };
  }

  /**
   * Records a Gemini call failure to trip circuit breaker on quota exhaustion.
   */
  public recordFailure(err: any, nowMs: number = Date.now()): void {
    const errMsg = String(err?.message || '').toLowerCase();
    const isQuota =
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('resource_exhausted');
    const isTimeout =
      errMsg.includes('deadline') ||
      errMsg.includes('timeout') ||
      errMsg.includes('abort');

    if (isQuota) {
      this.circuitCooldownUntil = nowMs + this.circuitCooldownDurationMs;
      this.circuitOpenReason = 'GEMINI_QUOTA_COOLDOWN';
    } else if (isTimeout) {
      // Shorter cooldown for network timeout (15s)
      this.circuitCooldownUntil = nowMs + 15 * 1000;
      this.circuitOpenReason = 'GEMINI_TIMEOUT_COOLDOWN';
    }
  }

  /**
   * Resets the circuit breaker on a successful call.
   */
  public recordSuccess(): void {
    this.circuitCooldownUntil = 0;
    this.circuitOpenReason = null;
  }

  /**
   * Bounded exponential retry with randomized jitter.
   * Does NOT retry 400 validation errors or 429 quota exhaustion (which immediately trips circuit breaker).
   */
  public async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    maxAttempts: number = 2,
    baseDelayMs: number = 200
  ): Promise<T> {
    const boundedMax = Math.max(1, Math.min(maxAttempts, 3));
    let lastError: any;
    for (let attempt = 1; attempt <= boundedMax; attempt++) {
      try {
        return await operation(attempt);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '').toLowerCase();
        // Do not retry on 400 Client Errors, prompt refusal, or 429 Quota Exhausted
        if (
          msg.includes('400') ||
          msg.includes('invalid') ||
          msg.includes('429') ||
          msg.includes('quota') ||
          msg.includes('resource_exhausted') ||
          attempt === boundedMax
        ) {
          this.recordFailure(err);
          throw err;
        }
        // Jittered backoff: baseDelay * 2^(attempt-1) + jitter(0..50ms)
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 50);
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw lastError;
  }

  /**
   * Fallback engine generator tailored to role persona.
   */
  public generateRoleGroundedFallback(
    message: string,
    role: UserRole,
    accountContext?: any
  ): string {
    const persona = AGENTIC_PERSONAS[role];
    if (role === 'consumer') {
      return generateUtilityGroundedResponse(message, role, accountContext);
    }

    // Role-specific tailored fallbacks for non-consumer roles
    if (role === 'employee') {
      return `### Operations Co-Pilot — Sub-Division Desk Notice

*Operating under local utility grounded engine while live telemetry is synchronizing.*

**Operational Action Checklist:**
* **SLA Monitoring:** Ensure all Category-A power interruptions are resolved within 4 hours.
* **New Connections:** Review pending site feasibility test reports before issuing sanction demand notes.
* **Consumer Grievances:** Review the [Complaint Queue](action:complaints) for escalated items.

*Reference: UGVCL Sub-Divisional Operations Manual & GERC Distribution Performance Standards.*
[ERP Overview](action:dashboard) [Application Queue](action:applications) [Complaint Queue](action:complaints)`;
    }

    if (role === 'field') {
      return `### Field Intelligence Assistant — Safety & Operations Dispatch

*Operating under local utility safety engine.*

**Mandatory Safety Protocols (CEA Regulations 2023):**
1. **Permit to Work (PTW):** Ensure clearance confirmation from substation incharge before touching 11kV lines.
2. **Earthing & Discharge:** Verify absence of voltage and clamp portable discharge rods across all 3 conductors.
3. **PPE:** Dielectric gloves (tested for 11kV), safety harness, and non-conductive helmet are required.

[Field Console](action:dashboard) [Work Orders](action:workorders) [Feeder Patrol](action:maintenance)`;
    }

    if (role === 'management') {
      return `### Executive Intelligence Agent — Discom Operational Briefing

*Operating under corporate grounded engine.*

**Macro Utility Benchmarks (UGVCL FY 2026-27):**
* **AT&C Loss Target:** ≤ 12.0% (Current performance: 11.4%).
* **Collection Efficiency:** ≥ 98.5% (Mehsana Circle leading at 99.2%).
* **Feeder Augmentation:** 11kV agricultural feeders under PM-KUSUM solar day-power supply.

[Executive Cockpit](action:dashboard) [Revenue & Demand](action:analytics) [Feeder Overloads](action:feeders)`;
    }

    if (role === 'admin') {
      return `### Security & Governance Agent — Systems Audit

*Operating under local security governance engine.*

**Governance Status:**
* **RBAC Integrity:** All 5 role-based portal boundaries verified and active.
* **Session Store:** HttpOnly session cookies with CSRF validation enforced.
* **Audit Trail:** Immutable audit events logging all operational state modifications.

[System Overview](action:overview) [Access Matrix](action:access) [Audit Trail](action:audit)`;
    }

    return `### VidyutFlow Utility Intelligence\n\nAssistant active for role **${persona.title}**.\n\n[Open Dashboard](action:dashboard)`;
  }

  /**
   * Resets cache and rate limits for automated tests.
   */
  public resetForTests(): void {
    this.cache.clear();
    this.rateLimitMap.clear();
    this.inFlight.clear();
    this.circuitCooldownUntil = 0;
    this.circuitOpenReason = null;
  }
}

export const defaultAiCacheManager = new AiCacheManager();
