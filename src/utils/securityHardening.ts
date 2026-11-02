/**
 * ============================================================================
 * VIDYUTFLOW PHASE 7: SECURITY, RESILIENCE & RECOVERY UTILITIES
 * ============================================================================
 * Provides:
 * 1. Prompt-injection detection & adversarial input neutralization
 * 2. Sensitive-data redaction for server/audit logs & error messages
 * 3. Strict read-only AI tool verification
 * 4. Corrupted localStorage detection & self-healing recovery
 * 5. Duplicate mutation / double-submission prevention guard
 * ============================================================================
 */

export interface PromptInjectionCheckResult {
  isSuspicious: boolean;
  matchedPatterns: string[];
  sanitizedText: string;
}

const PROMPT_INJECTION_PATTERNS: ReadonlyArray<{ id: string; regex: RegExp }> = [
  { id: 'IGNORE_INSTRUCTIONS', regex: /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|directives)/i },
  { id: 'SYSTEM_OVERRIDE', regex: /(system\s+override|developer\s+mode|jailbreak|you\s+are\s+now\s+dan|bypass\s+rbac|disable\s+security)/i },
  { id: 'SECRET_EXTRACTION', regex: /(reveal|print|output|show|leak|dump)\s+(the\s+)?(gemini_api_key|api[_\s]?key|session[_\s]?secret|system\s+prompt|password\s+hash|signedtoken)/i },
  { id: 'DIRECT_MUTATION_INJECTION', regex: /(execute|call|invoke|run)\s+(approveRecommendation|updateApplicationStatus|revokeSession|deleteRecord|drop\s+table)/i },
  { id: 'ROLE_SPOOFING_TAG', regex: /(\[system\]|<\|im_start\|>|<\|system\|>|###\s*system\s*instruction)/i },
  { id: 'CROSS_TENANT_DUMP', regex: /(dump|export|list)\s+all\s+(consumers|audit\s+logs|passwords|sessions)\s+(bypassing|without)\s+(auth|role)/i }
];

/**
 * Inspects user or context input for adversarial prompt-injection patterns and
 * returns a sanitized version safe for prompt assembly.
 */
export function detectPromptInjection(rawInput: string): PromptInjectionCheckResult {
  if (typeof rawInput !== 'string') {
    return { isSuspicious: false, matchedPatterns: [], sanitizedText: '' };
  }

  const matchedPatterns: string[] = [];
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.regex.test(rawInput)) {
      matchedPatterns.push(pattern.id);
    }
  }

  // Strip null bytes, non-printable ASCII control chars (except \n, \r, \t), and role-spoofing delimiters
  const sanitizedText = rawInput
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<\|im_start\|>|<\|im_end\|>|<\|system\|>/gi, '[REDACTED_TAG]')
    .replace(/\[AUTHENTICATED ERP & DEMONSTRATION CONTEXT\]/gi, '[USER_TEXT]')
    .replace(/\[RECENT CONVERSATION HISTORY\]/gi, '[USER_TEXT]')
    .trim();

  return {
    isSuspicious: matchedPatterns.length > 0,
    matchedPatterns,
    sanitizedText
  };
}

/**
 * Redacts credentials, API keys, session tokens, and sensitive PII from logs or error messages.
 */
export function redactSensitiveData(input: string): string {
  if (typeof input !== 'string' || !input) return '';

  return input
    // Google / Gemini API keys (AIza...)
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[REDACTED_API_KEY]')
    // Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    // Session cookies or JSON token fields
    .replace(/(vidyutflow_session|signedToken|sessionToken|password|passwordHash|GEMINI_API_KEY|SESSION_SECRET)\s*([=:"']+)\s*([^\s"',;}\]]+)/gi, '$1$2[REDACTED_SECRET]')
    // 12-digit Aadhaar-like sequences (4-4-4 digits)
    .replace(/\b\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '[REDACTED_ID]')
    // 16-digit payment card numbers
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED_CARD]');
}

const MUTATING_TOOL_PREFIXES = [
  'approve',
  'reject',
  'execute',
  'update',
  'delete',
  'remove',
  'drop',
  'revoke',
  'assign',
  'create',
  'submit',
  'pay',
  'modify',
  'write',
  'grant'
];

/**
 * Verifies that a tool invocation requested by the AI model is strictly read-only.
 * Blocks any mutating tool name even if a hallucinated function call is emitted.
 */
export function verifyReadOnlyToolCall(
  toolName: string,
  allowedReadOnlyTools: ReadonlySet<string>
): { allowed: boolean; reason?: string } {
  if (!toolName || typeof toolName !== 'string') {
    return { allowed: false, reason: 'Invalid empty tool name.' };
  }

  const normalized = toolName.trim();
  const lower = normalized.toLowerCase();

  for (const prefix of MUTATING_TOOL_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return {
        allowed: false,
        reason: `Security Policy Violation: AI tool "${normalized}" attempts a state mutation. All AI tools are strictly read-only; mutations require Human-in-the-Loop approval.`
      };
    }
  }

  if (!allowedReadOnlyTools.has(normalized)) {
    return {
      allowed: false,
      reason: `Tool "${normalized}" is not in the verified read-only tool registry.`
    };
  }

  return { allowed: true };
}

/**
 * Validates and recovers data loaded from browser localStorage.
 * If stored JSON is malformed or its structural type does not match `fallback`
 * (e.g. a non-array stored where an array of ERP records is required), self-heals
 * the corrupted storage entry and returns `fallback`.
 */
export function safeLoadStorage<T>(
  key: string,
  fallback: T,
  requiredItemKeys?: string[],
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): T {
  const store =
    storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
  if (!store) return fallback;

  try {
    const raw = store.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);

    // 1. If fallback is an Array, parsed MUST be an Array of valid objects
    if (Array.isArray(fallback)) {
      if (!Array.isArray(parsed)) {
        try {
          store.setItem(key, JSON.stringify(fallback));
        } catch {}
        return fallback;
      }

      // Filter out null/primitive corruption inside arrays and verify required keys
      const validItems = parsed.filter(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        if (requiredItemKeys && requiredItemKeys.length > 0) {
          for (const reqKey of requiredItemKeys) {
            if (!(reqKey in (item as Record<string, unknown>))) {
              return false;
            }
          }
        }
        return true;
      });

      // If all items were corrupted in a non-empty array, restore fallback
      if (parsed.length > 0 && validItems.length === 0) {
        try {
          store.setItem(key, JSON.stringify(fallback));
        } catch {}
        return fallback;
      }

      return validItems as unknown as T;
    }

    // 2. If fallback is a non-null plain object, parsed MUST be a non-null plain object
    if (fallback && typeof fallback === 'object') {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        try {
          store.setItem(key, JSON.stringify(fallback));
        } catch {}
        return fallback;
      }
      return parsed as T;
    }

    // 3. Primitive type match check
    if (typeof parsed !== typeof fallback) {
      return fallback;
    }

    return parsed as T;
  } catch {
    // Malformed JSON — self-heal storage with fallback
    try {
      store.setItem(key, JSON.stringify(fallback));
    } catch {}
    return fallback;
  }
}

/**
 * Guards against accidental rapid duplicate form or action submissions.
 */
export class DuplicateSubmissionGuard {
  private recentFingerprints = new Map<string, number>();
  private readonly windowMs: number;

  constructor(windowMs: number = 2000) {
    this.windowMs = windowMs;
  }

  public tryAcquire(fingerprint: string, nowMs: number = Date.now()): boolean {
    // Prune expired fingerprints
    for (const [k, ts] of this.recentFingerprints.entries()) {
      if (nowMs - ts >= this.windowMs) {
        this.recentFingerprints.delete(k);
      }
    }

    const lastTs = this.recentFingerprints.get(fingerprint);
    if (lastTs !== undefined && nowMs - lastTs < this.windowMs) {
      return false;
    }

    this.recentFingerprints.set(fingerprint, nowMs);
    return true;
  }

  public clear(): void {
    this.recentFingerprints.clear();
  }
}
