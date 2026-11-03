/**
 * VIDYUTFLOW 2.0 — PHASE 7 ENTERPRISE SAFE STORAGE UTILITY
 *
 * Provides a resilient, quota-aware storage layer for browser localStorage and sessionStorage:
 * 1. Safe JSON serialization / deserialization with fallback defaults.
 * 2. Automatic QuotaExceededError detection and non-critical LRU cache/log eviction.
 * 3. Transparent memory fallback when localStorage is blocked (e.g. sandboxed iframe or private browsing).
 * 4. Corrupted data self-healing and validation.
 * 5. Strict preservation of critical business records (bills, connections, demo sessions).
 */

class MemoryStorageFallback implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorageFallback();

/**
 * Checks if a storage instance is usable (not restricted or throwing SecurityError)
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
  try {
    if (typeof window === 'undefined' || typeof globalThis === 'undefined') {
      return false;
    }
    const storage = (globalThis as any)[type] as Storage | undefined;
    if (!storage) return false;

    const testKey = '__vidyutflow_test_storage__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the active underlying Storage provider, falling back to memory storage if unavailable.
 */
export function getUnderlyingStorage(type: 'localStorage' | 'sessionStorage' = 'localStorage'): Storage {
  if (isStorageAvailable(type)) {
    return (globalThis as any)[type];
  }
  return memoryStorage;
}

/**
 * List of non-critical storage keys that can be trimmed or evicted during a quota emergency
 * in order of eviction priority (least critical first).
 * NOTE: Critical business keys (bills, payments, connections, demo session) are NEVER evicted!
 */
export const NON_CRITICAL_EVICTION_KEYS = [
  'vidyut_ai_cache_',
  'vidyutflow_dismissed_modals',
  'vidyutone_auditlogs',
  'vidyutflow_sla_emitted_event_keys'
];

/**
 * Attempts to free up storage space when a QuotaExceededError is detected.
 * Returns the number of items or characters freed.
 */
export function evictNonCriticalStorage(storage: Storage): boolean {
  try {
    let freed = false;

    // 1. Evict temporary AI caches first
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && (key.startsWith('vidyut_ai_') || key.startsWith('vidyut_cache_'))) {
        storage.removeItem(key);
        freed = true;
      }
    }

    if (freed) return true;

    // 2. Trim audit logs to the most recent 25 entries if oversized
    const auditLogsRaw = storage.getItem('vidyutone_auditlogs');
    if (auditLogsRaw) {
      try {
        const logs = JSON.parse(auditLogsRaw);
        if (Array.isArray(logs) && logs.length > 25) {
          const trimmed = logs.slice(0, 25);
          storage.setItem('vidyutone_auditlogs', JSON.stringify(trimmed));
          freed = true;
          return true;
        }
      } catch {
        storage.removeItem('vidyutone_auditlogs');
        return true;
      }
    }

    // 3. Clear dismissed modal history if needed
    if (storage.getItem('vidyutflow_dismissed_modals')) {
      storage.removeItem('vidyutflow_dismissed_modals');
      return true;
    }

    return freed;
  } catch {
    return false;
  }
}

/**
 * Safely writes a value to storage with quota protection, corruption safeguards, and memory fallback.
 */
export function safeStorageSet<T>(
  key: string,
  value: T,
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
): boolean {
  const storage = getUnderlyingStorage(storageType);

  try {
    const serialized = JSON.stringify(value);
    storage.setItem(key, serialized);
    return true;
  } catch (error: any) {
    // Check if error is a QuotaExceededError
    const isQuotaError =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014;

    if (isQuotaError) {
      console.warn(`[VidyutFlow SafeStorage] Storage quota reached for key "${key}". Initiating safe LRU eviction.`);
      const evicted = evictNonCriticalStorage(storage);
      if (evicted) {
        try {
          storage.setItem(key, JSON.stringify(value));
          return true;
        } catch {
          // If still failing, write to fallback memory store
          memoryStorage.setItem(key, JSON.stringify(value));
          return false;
        }
      } else {
        // Fall back to memory storage so the application does not crash
        memoryStorage.setItem(key, JSON.stringify(value));
        return false;
      }
    }

    // In case of security error or unavailable storage, save to in-memory fallback
    memoryStorage.setItem(key, JSON.stringify(value));
    return false;
  }
}

/**
 * Safely reads and parses a value from storage with corrupted JSON self-healing.
 */
export function safeStorageGet<T>(
  key: string,
  fallbackValue: T,
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
): T {
  const storage = getUnderlyingStorage(storageType);

  try {
    let raw = storage.getItem(key);

    // If not found in primary storage, check in-memory fallback
    if (raw === null && storage !== memoryStorage) {
      raw = memoryStorage.getItem(key);
    }

    if (raw === null || raw === undefined) {
      return fallbackValue;
    }

    // Try parsing
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (error) {
    console.warn(`[VidyutFlow SafeStorage] Detected corrupt JSON for key "${key}". Self-healing with fallback and preserving raw payload in "${key}__corrupt_raw_backup".`);
    // Preserve original raw value in non-destructive recovery key before removing corrupted entry
    try {
      const rawCorrupt = storage.getItem(key);
      if (rawCorrupt !== null) {
        storage.setItem(`${key}__corrupt_raw_backup`, rawCorrupt);
      }
      storage.removeItem(key);
    } catch {
      // Ignore
    }
    return fallbackValue;
  }
}

/**
 * Safely removes a key from storage and memory fallback.
 */
export function safeStorageRemove(
  key: string,
  storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
): void {
  try {
    const storage = getUnderlyingStorage(storageType);
    storage.removeItem(key);
  } catch {
    // Ignore
  }
  memoryStorage.removeItem(key);
}

/**
 * Estimates the current storage usage in bytes.
 */
export function getStorageUsageEstimate(storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): {
  totalBytes: number;
  keyCount: number;
  isMemoryFallback: boolean;
} {
  const storage = getUnderlyingStorage(storageType);
  let totalBytes = 0;
  const count = storage.length;

  try {
    for (let i = 0; i < count; i++) {
      const k = storage.key(i);
      if (k) {
        const val = storage.getItem(k) || '';
        totalBytes += (k.length + val.length) * 2; // Approximate UTF-16 bytes
      }
    }
  } catch {
    // Ignore
  }

  return {
    totalBytes,
    keyCount: count,
    isMemoryFallback: storage === memoryStorage
  };
}
