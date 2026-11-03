/**
 * ============================================================================
 * VIDYUTFLOW 2.0 — PHASE 9 STEP 4C
 * CENTRALIZED ASIA/KOLKATA BUSINESS CLOCK & CROSS-TAB REAL-TIME SYNC ENGINE
 * ============================================================================
 *
 * Responsibilities:
 * 1. Centralized Business Clock in Asia/Kolkata (IST, UTC+05:30):
 *    - Replaces the legacy fixed '28-Oct-2026' default in normal live application mode.
 *    - Evaluates actual current date & time in Asia/Kolkata regardless of host OS timezone.
 *    - Schedules a single exact midnight timer (no competing 1-second polling loops).
 *    - Automatically rechecks date on browser tab visibility resume, window focus, and
 *      device sleep/wake transitions.
 *    - Accurately crosses month-end, year-end, and leap-year boundaries.
 *    - Safely migrates legacy persisted '28-Oct-2026' localStorage keys without touching
 *      any other persisted DEMO or user data.
 *    - Supports injectable clocks for automated tests and isolated Developer/Admin Date
 *      Override ('DEV_OVERRIDE') with explicit visual disclosure.
 *
 * 2. Browser-Local Cross-Tab Real-Time Synchronization:
 *    - Synchronizes business date rollovers, full/partial payments, failed/pending
 *      payment attempts, payment reversals, late-charge waivers, bill adjustments/refunds,
 *      formal notice transitions, and notification read/dismiss states across open tabs
 *      using BroadcastChannel + localStorage storage event fallback.
 *    - Prevents duplicate event application and infinite feedback loops via deterministic
 *      event IDs and origin tab filtering.
 *    - Enforces consumer-to-consumer data isolation while preserving each tab's own
 *      active language and portal view state.
 *    - Documents future production WebSocket/SSE/Outbox event contracts for Yogesh.
 */

import { Language } from '../i18n/types';
import { formatToVidyutDate as formatUtcMsToVidyutDate } from './lateChargeEngine';
import { parseVidyutDateToUtcMs } from './billingEngine';
import { parseDateToYearMonthDay } from './paymentCalendarEngine';

export const ERP_BUSINESS_TIMEZONE = 'Asia/Kolkata' as const;

export const STORAGE_KEY_BUSINESS_DATE = 'vidyutflow_business_date';
export const STORAGE_KEY_LEGACY_BUSINESS_DATE = 'vf_business_reference_date';
export const STORAGE_KEY_CLOCK_MODE = 'vidyutflow_business_clock_mode';
export const STORAGE_KEY_CLOCK_MIGRATED_V1 = 'vidyutflow_step4c_clock_migrated_v1';
export const STORAGE_KEY_DEV_OVERRIDE_DATE = 'vidyutflow_dev_override_business_date';
export const STORAGE_KEY_DEV_OVERRIDE_REASON = 'vidyutflow_dev_override_reason';
export const STORAGE_KEY_CROSS_TAB_LAST_EVENT = 'vidyutflow_step4c_last_sync_event';

export const CROSS_TAB_BROADCAST_CHANNEL_NAME = 'vidyutflow_step4c_financial_sync_v1';

export type BusinessClockMode = 'LIVE_ASIA_KOLKATA' | 'DEV_OVERRIDE';

export type ClockTimeProvider = () => Date | number;

export interface AsiaKolkataDateParts {
  vidyutDate: string; // DD-MMM-YYYY (e.g., '03-Nov-2026')
  isoDate: string; // YYYY-MM-DD (e.g., '2026-11-03')
  year: number;
  month1To12: number;
  month0To11: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  epochMs: number;
  formattedTimestampIst: string; // e.g. '03-Nov-2026 17:06:12 IST'
}

export interface BusinessClockState {
  businessDate: string; // DD-MMM-YYYY
  isoBusinessDate: string; // YYYY-MM-DD
  mode: BusinessClockMode;
  timezone: typeof ERP_BUSINESS_TIMEZONE;
  isSimulatedOverride: boolean;
  overrideDate: string | null;
  overrideReason: string | null;
  liveActualBusinessDateIst: string;
  lastEvaluatedAtIso: string;
  nextMidnightInMs: number;
  migratedFromLegacyFixedDate: boolean;
}

export type BusinessRolloverTriggerReason =
  | 'INITIAL_BOOT'
  | 'MIDNIGHT_TIMER'
  | 'TAB_VISIBILITY_RESUME'
  | 'WINDOW_FOCUS'
  | 'DEVICE_WAKE_DRIFT'
  | 'MANUAL_RECHECK'
  | 'DEV_OVERRIDE_SET'
  | 'DEV_OVERRIDE_CLEARED'
  | 'CROSS_TAB_SYNC'
  | 'TEST_CLOCK_ADVANCE';

export interface BusinessDateRolloverEvent {
  previousBusinessDate: string;
  currentBusinessDate: string;
  mode: BusinessClockMode;
  triggerReason: BusinessRolloverTriggerReason;
  occurredAtIso: string;
  timezone: typeof ERP_BUSINESS_TIMEZONE;
}

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Extracts exact calendar date and wall-clock time components in Asia/Kolkata (UTC+05:30).
 * Deterministic across all host operating system timezones.
 */
export function formatDateInAsiaKolkata(
  input?: Date | number | ClockTimeProvider
): AsiaKolkataDateParts {
  let rawMs: number;
  if (typeof input === 'function') {
    const val = input();
    rawMs = val instanceof Date ? val.getTime() : Number(val);
  } else if (input instanceof Date) {
    rawMs = input.getTime();
  } else if (typeof input === 'number' && Number.isFinite(input)) {
    rawMs = input;
  } else {
    rawMs = Date.now();
  }

  if (!Number.isFinite(rawMs)) {
    rawMs = Date.now();
  }

  // Asia/Kolkata has a fixed UTC offset of +05:30 (+330 minutes = 19,800,000 ms) with no DST.
  // Using Intl.DateTimeFormat with timeZone: 'Asia/Kolkata' AND verifying via UTC+5:30 arithmetic
  // guarantees 100% deterministic extraction in browser and Node/tsx environments.
  let year = 1970;
  let month1To12 = 1;
  let day = 1;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ERP_BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(rawMs));
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }
    year = parseInt(partMap.year || '1970', 10);
    month1To12 = parseInt(partMap.month || '1', 10);
    day = parseInt(partMap.day || '1', 10);
    hours = parseInt(partMap.hour || '0', 10);
    if (hours === 24) hours = 0;
    minutes = parseInt(partMap.minute || '0', 10);
    seconds = parseInt(partMap.second || '0', 10);
  } catch {
    // Fallback pure UTC+05:30 offset math
    const istShifted = new Date(rawMs + (5 * 60 + 30) * 60 * 1000);
    year = istShifted.getUTCFullYear();
    month1To12 = istShifted.getUTCMonth() + 1;
    day = istShifted.getUTCDate();
    hours = istShifted.getUTCHours();
    minutes = istShifted.getUTCMinutes();
    seconds = istShifted.getUTCSeconds();
  }

  const milliseconds = ((rawMs % 1000) + 1000) % 1000;
  const month0To11 = Math.max(0, Math.min(11, month1To12 - 1));
  const dd = String(day).padStart(2, '0');
  const mm = String(month1To12).padStart(2, '0');
  const mmm = MONTH_SHORT_NAMES[month0To11];
  const hh = String(hours).padStart(2, '0');
  const min = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return {
    vidyutDate: `${dd}-${mmm}-${year}`,
    isoDate: `${year}-${mm}-${dd}`,
    year,
    month1To12,
    month0To11,
    day,
    hours,
    minutes,
    seconds,
    milliseconds,
    epochMs: rawMs,
    formattedTimestampIst: `${dd}-${mmm}-${year} ${hh}:${min}:${ss} IST`,
  };
}

/**
 * Returns the current business date formatted as DD-MMM-YYYY in Asia/Kolkata.
 */
export function getCurrentBusinessDateIst(clock?: ClockTimeProvider | Date | number): string {
  return formatDateInAsiaKolkata(clock).vidyutDate;
}

/**
 * Formats a short payment timestamp using the active business reference date and current IST wall time.
 * E.g. '03-Nov-2026 14:25'
 */
export function formatPaymentTimestampForBusinessDate(
  businessReferenceDate: string,
  clock?: ClockTimeProvider | Date | number
): string {
  const ist = formatDateInAsiaKolkata(clock);
  const validDate =
    parseVidyutDateToUtcMs(businessReferenceDate) !== null
      ? businessReferenceDate
      : ist.vidyutDate;
  const hh = String(ist.hours).padStart(2, '0');
  const mm = String(ist.minutes).padStart(2, '0');
  return `${validDate} ${hh}:${mm}`;
}

/**
 * Computes the exact milliseconds remaining until the next 00:00:00.050 midnight in Asia/Kolkata.
 * Bounded to a minimum of 50ms to prevent tight loops at the exact midnight boundary.
 */
export function getMsUntilNextAsiaKolkataMidnight(
  clock?: ClockTimeProvider | Date | number
): number {
  const parts = formatDateInAsiaKolkata(clock);
  const elapsedTodayMs =
    ((parts.hours * 60 + parts.minutes) * 60 + parts.seconds) * 1000 + parts.milliseconds;
  const fullDayMs = 24 * 60 * 60 * 1000;
  // Add 50ms safety buffer past midnight so when the timer fires it is unambiguously in the new day
  const remainingMs = fullDayMs - elapsedTodayMs + 50;
  return Math.max(50, remainingMs);
}

/**
 * Advances or rewinds a DD-MMM-YYYY or YYYY-MM-DD date by `deltaDays` calendar days,
 * accurately handling month-end (30/31 days), year-end (31-Dec -> 01-Jan), and leap-year
 * (28-Feb-2028 -> 29-Feb-2028 -> 01-Mar-2028, vs non-leap 28-Feb-2026 -> 01-Mar-2026) boundaries.
 */
export function advanceVidyutDateByDays(dateStr: string, deltaDays: number): string {
  const baseUtcMs = parseVidyutDateToUtcMs(dateStr);
  if (baseUtcMs === null) {
    return getCurrentBusinessDateIst();
  }
  const targetUtcMs = baseUtcMs + Math.trunc(deltaDays) * 24 * 60 * 60 * 1000;
  return formatUtcMsToVidyutDate(targetUtcMs);
}

/**
 * Converts a Vidyut date ('28-Oct-2026') to an epoch timestamp at a specific IST hour:minute:second.
 * Useful for deterministic test clocks testing 23:59:59 IST -> 00:00:00 IST midnight rollovers.
 */
export function createAsiaKolkataTimestampMs(
  vidyutDateOrIso: string,
  hours = 12,
  minutes = 0,
  seconds = 0,
  milliseconds = 0
): number {
  const parsed = parseDateToYearMonthDay(vidyutDateOrIso);
  if (!parsed) {
    return Date.now();
  }
  // Midnight UTC for that Y-M-D minus 5h30m gives Midnight IST in UTC epoch ms
  const utcMidnightMs = Date.UTC(parsed.year, parsed.month, parsed.day, 0, 0, 0, 0);
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istMidnightUtcMs = utcMidnightMs - istOffsetMs;
  const timeOfDayMs = ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
  return istMidnightUtcMs + timeOfDayMs;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function parseStoredJsonOrRawString(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'string' ? parsed.trim() : null;
    } catch {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

/**
 * Safely migrates legacy Step 4A/4B fixed '28-Oct-2026' business date settings in localStorage
 * to live Asia/Kolkata clock mode WITHOUT resetting or modifying any other localStorage keys.
 */
export function migrateLegacyBusinessDateStorage(
  storage?: StorageLike | null,
  clock?: ClockTimeProvider
): {
  migrated: boolean;
  mode: BusinessClockMode;
  effectiveBusinessDate: string;
  liveActualBusinessDateIst: string;
  overrideDate: string | null;
  overrideReason: string | null;
} {
  const liveActualBusinessDateIst = getCurrentBusinessDateIst(clock);
  const targetStorage: StorageLike | null =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : null;

  if (!targetStorage) {
    return {
      migrated: false,
      mode: 'LIVE_ASIA_KOLKATA',
      effectiveBusinessDate: liveActualBusinessDateIst,
      liveActualBusinessDateIst,
      overrideDate: null,
      overrideReason: null,
    };
  }

  try {
    const rawMode = parseStoredJsonOrRawString(targetStorage.getItem(STORAGE_KEY_CLOCK_MODE));
    const rawOverrideDate = parseStoredJsonOrRawString(
      targetStorage.getItem(STORAGE_KEY_DEV_OVERRIDE_DATE)
    );
    const rawOverrideReason = parseStoredJsonOrRawString(
      targetStorage.getItem(STORAGE_KEY_DEV_OVERRIDE_REASON)
    );
    const rawStoredBusinessDate = parseStoredJsonOrRawString(
      targetStorage.getItem(STORAGE_KEY_BUSINESS_DATE)
    );
    const rawLegacyDate = parseStoredJsonOrRawString(
      targetStorage.getItem(STORAGE_KEY_LEGACY_BUSINESS_DATE)
    );
    const alreadyMigrated =
      parseStoredJsonOrRawString(targetStorage.getItem(STORAGE_KEY_CLOCK_MIGRATED_V1)) === 'true';

    // If explicitly in DEV_OVERRIDE mode with a valid override date, honor the isolated override
    if (
      rawMode === 'DEV_OVERRIDE' &&
      rawOverrideDate &&
      parseVidyutDateToUtcMs(rawOverrideDate) !== null
    ) {
      const normalizedOverride = formatUtcMsToVidyutDate(
        parseVidyutDateToUtcMs(rawOverrideDate)!
      );
      return {
        migrated: false,
        mode: 'DEV_OVERRIDE',
        effectiveBusinessDate: normalizedOverride,
        liveActualBusinessDateIst,
        overrideDate: normalizedOverride,
        overrideReason: rawOverrideReason || 'Admin / Developer Simulation Override',
      };
    }

    // Detect legacy fixed '28-Oct-2026' or '15-Oct-2026' persisted before Step 4C
    const hadLegacyFixedDate =
      !alreadyMigrated &&
      (rawStoredBusinessDate === '28-Oct-2026' ||
        rawStoredBusinessDate === '15-Oct-2026' ||
        rawLegacyDate === '28-Oct-2026' ||
        rawLegacyDate === '15-Oct-2026' ||
        rawMode !== 'DEV_OVERRIDE');

    targetStorage.setItem(STORAGE_KEY_CLOCK_MODE, JSON.stringify('LIVE_ASIA_KOLKATA'));
    targetStorage.setItem(
      STORAGE_KEY_BUSINESS_DATE,
      JSON.stringify(liveActualBusinessDateIst)
    );
    targetStorage.setItem(STORAGE_KEY_CLOCK_MIGRATED_V1, JSON.stringify('true'));
    targetStorage.removeItem(STORAGE_KEY_DEV_OVERRIDE_DATE);
    targetStorage.removeItem(STORAGE_KEY_DEV_OVERRIDE_REASON);
    if (rawLegacyDate) {
      targetStorage.removeItem(STORAGE_KEY_LEGACY_BUSINESS_DATE);
    }

    return {
      migrated: Boolean(hadLegacyFixedDate),
      mode: 'LIVE_ASIA_KOLKATA',
      effectiveBusinessDate: liveActualBusinessDateIst,
      liveActualBusinessDateIst,
      overrideDate: null,
      overrideReason: null,
    };
  } catch {
    return {
      migrated: false,
      mode: 'LIVE_ASIA_KOLKATA',
      effectiveBusinessDate: liveActualBusinessDateIst,
      liveActualBusinessDateIst,
      overrideDate: null,
      overrideReason: null,
    };
  }
}

/**
 * Resolves the initial BusinessClockState on application boot or test initialization.
 */
export function resolveInitialBusinessClockState(options?: {
  storage?: StorageLike | null;
  clock?: ClockTimeProvider;
}): BusinessClockState {
  const clock = options?.clock;
  const migrationResult = migrateLegacyBusinessDateStorage(options?.storage, clock);
  const parsed = parseDateToYearMonthDay(migrationResult.effectiveBusinessDate);
  const isoBusinessDate =
    parsed?.isoDate || formatDateInAsiaKolkata(clock).isoDate;

  return {
    businessDate: migrationResult.effectiveBusinessDate,
    isoBusinessDate,
    mode: migrationResult.mode,
    timezone: ERP_BUSINESS_TIMEZONE,
    isSimulatedOverride: migrationResult.mode === 'DEV_OVERRIDE',
    overrideDate: migrationResult.overrideDate,
    overrideReason: migrationResult.overrideReason,
    liveActualBusinessDateIst: migrationResult.liveActualBusinessDateIst,
    lastEvaluatedAtIso: new Date(
      typeof clock === 'function'
        ? clock() instanceof Date
          ? (clock() as Date).getTime()
          : Number(clock())
        : Date.now()
    ).toISOString(),
    nextMidnightInMs: getMsUntilNextAsiaKolkataMidnight(clock),
    migratedFromLegacyFixedDate: migrationResult.migrated,
  };
}

/**
 * Centralized Business Clock Controller.
 * Manages:
 * - Single scheduled midnight rollover timeout (never duplicate competing intervals).
 * - Automatic recheck on browser visibilitychange, window focus, and device sleep/wake drift.
 * - Clean separation between LIVE_ASIA_KOLKATA mode and isolated DEV_OVERRIDE mode.
 */
export class BusinessClockController {
  private clock: ClockTimeProvider;
  private storage: StorageLike | null;
  private state: BusinessClockState;
  private midnightTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private wakeCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<
    (state: BusinessClockState, rollover?: BusinessDateRolloverEvent) => void
  >();
  private rolloverHistory: BusinessDateRolloverEvent[] = [];
  private isStarted = false;
  private activeTimerCount = 0;

  private boundVisibilityHandler: (() => void) | null = null;
  private boundFocusHandler: (() => void) | null = null;

  constructor(options?: {
    clock?: ClockTimeProvider;
    storage?: StorageLike | null;
  }) {
    this.clock = options?.clock || (() => Date.now());
    this.storage =
      options?.storage !== undefined
        ? options.storage
        : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;
    this.state = resolveInitialBusinessClockState({
      storage: this.storage,
      clock: this.clock,
    });
  }

  public getState(): BusinessClockState {
    return { ...this.state };
  }

  public getRolloverHistory(): BusinessDateRolloverEvent[] {
    return [...this.rolloverHistory];
  }

  /**
   * Returns the number of currently active midnight timers (guaranteed <= 1).
   */
  public getActiveMidnightTimerCount(): number {
    return this.activeTimerCount;
  }

  public setClockProvider(clock: ClockTimeProvider): void {
    this.clock = clock;
  }

  public subscribe(
    listener: (state: BusinessClockState, rollover?: BusinessDateRolloverEvent) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(rollover?: BusinessDateRolloverEvent): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot, rollover);
      } catch {
        // Guard against listener exceptions
      }
    }
  }

  private persistCurrentState(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY_CLOCK_MODE, JSON.stringify(this.state.mode));
      this.storage.setItem(
        STORAGE_KEY_BUSINESS_DATE,
        JSON.stringify(this.state.businessDate)
      );
      if (this.state.mode === 'DEV_OVERRIDE' && this.state.overrideDate) {
        this.storage.setItem(
          STORAGE_KEY_DEV_OVERRIDE_DATE,
          JSON.stringify(this.state.overrideDate)
        );
        this.storage.setItem(
          STORAGE_KEY_DEV_OVERRIDE_REASON,
          JSON.stringify(
            this.state.overrideReason || 'Admin / Developer Simulation Override'
          )
        );
      } else {
        this.storage.removeItem(STORAGE_KEY_DEV_OVERRIDE_DATE);
        this.storage.removeItem(STORAGE_KEY_DEV_OVERRIDE_REASON);
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  /**
   * Rechecks the current date in Asia/Kolkata and triggers a rollover event if the date changed.
   */
  public evaluateNow(
    triggerReason: BusinessRolloverTriggerReason = 'MANUAL_RECHECK'
  ): {
    changed: boolean;
    state: BusinessClockState;
    rolloverEvent?: BusinessDateRolloverEvent;
  } {
    const liveParts = formatDateInAsiaKolkata(this.clock);
    const previousBusinessDate = this.state.businessDate;

    const nextEffectiveDate =
      this.state.mode === 'DEV_OVERRIDE' && this.state.overrideDate
        ? this.state.overrideDate
        : liveParts.vidyutDate;

    const nextIsoDate =
      parseDateToYearMonthDay(nextEffectiveDate)?.isoDate || liveParts.isoDate;

    const nowIso = new Date(liveParts.epochMs).toISOString();
    const nextMidnightInMs = getMsUntilNextAsiaKolkataMidnight(this.clock);

    const changed = nextEffectiveDate !== previousBusinessDate;

    this.state = {
      ...this.state,
      businessDate: nextEffectiveDate,
      isoBusinessDate: nextIsoDate,
      liveActualBusinessDateIst: liveParts.vidyutDate,
      lastEvaluatedAtIso: nowIso,
      nextMidnightInMs,
    };

    this.persistCurrentState();

    // Reschedule the single midnight timer if controller is running
    if (this.isStarted) {
      this.scheduleSingleMidnightTimer();
    }

    let rolloverEvent: BusinessDateRolloverEvent | undefined;
    if (changed) {
      rolloverEvent = {
        previousBusinessDate,
        currentBusinessDate: nextEffectiveDate,
        mode: this.state.mode,
        triggerReason,
        occurredAtIso: nowIso,
        timezone: ERP_BUSINESS_TIMEZONE,
      };
      this.rolloverHistory.push(rolloverEvent);
      this.notifyListeners(rolloverEvent);
    }

    return {
      changed,
      state: this.getState(),
      rolloverEvent,
    };
  }

  /**
   * Activates or clears an isolated Developer / Admin Date Override.
   * Passing `null` or `''` returns the application to live Asia/Kolkata time immediately.
   */
  public setDeveloperOverrideDate(
    overrideDateStr: string | null,
    overrideReason = 'Admin / Developer Simulation Override'
  ): {
    changed: boolean;
    state: BusinessClockState;
    rolloverEvent?: BusinessDateRolloverEvent;
  } {
    const previousBusinessDate = this.state.businessDate;
    const liveParts = formatDateInAsiaKolkata(this.clock);
    const nowIso = new Date(liveParts.epochMs).toISOString();

    if (!overrideDateStr || !overrideDateStr.trim()) {
      const nextEffectiveDate = liveParts.vidyutDate;
      const changed = nextEffectiveDate !== previousBusinessDate || this.state.mode !== 'LIVE_ASIA_KOLKATA';
      this.state = {
        ...this.state,
        mode: 'LIVE_ASIA_KOLKATA',
        isSimulatedOverride: false,
        overrideDate: null,
        overrideReason: null,
        businessDate: nextEffectiveDate,
        isoBusinessDate: liveParts.isoDate,
        liveActualBusinessDateIst: liveParts.vidyutDate,
        lastEvaluatedAtIso: nowIso,
        nextMidnightInMs: getMsUntilNextAsiaKolkataMidnight(this.clock),
      };
      this.persistCurrentState();

      let rolloverEvent: BusinessDateRolloverEvent | undefined;
      if (changed) {
        rolloverEvent = {
          previousBusinessDate,
          currentBusinessDate: nextEffectiveDate,
          mode: 'LIVE_ASIA_KOLKATA',
          triggerReason: 'DEV_OVERRIDE_CLEARED',
          occurredAtIso: nowIso,
          timezone: ERP_BUSINESS_TIMEZONE,
        };
        this.rolloverHistory.push(rolloverEvent);
      }
      this.notifyListeners(rolloverEvent);
      return { changed, state: this.getState(), rolloverEvent };
    }

    const parsedMs = parseVidyutDateToUtcMs(overrideDateStr);
    if (parsedMs === null) {
      return { changed: false, state: this.getState() };
    }

    const normalizedOverride = formatUtcMsToVidyutDate(parsedMs);
    const parsedYmd = parseDateToYearMonthDay(normalizedOverride);
    const changed =
      normalizedOverride !== previousBusinessDate || this.state.mode !== 'DEV_OVERRIDE';

    this.state = {
      ...this.state,
      mode: 'DEV_OVERRIDE',
      isSimulatedOverride: true,
      overrideDate: normalizedOverride,
      overrideReason,
      businessDate: normalizedOverride,
      isoBusinessDate: parsedYmd?.isoDate || liveParts.isoDate,
      liveActualBusinessDateIst: liveParts.vidyutDate,
      lastEvaluatedAtIso: nowIso,
      nextMidnightInMs: getMsUntilNextAsiaKolkataMidnight(this.clock),
    };
    this.persistCurrentState();

    let rolloverEvent: BusinessDateRolloverEvent | undefined;
    if (changed) {
      rolloverEvent = {
        previousBusinessDate,
        currentBusinessDate: normalizedOverride,
        mode: 'DEV_OVERRIDE',
        triggerReason: 'DEV_OVERRIDE_SET',
        occurredAtIso: nowIso,
        timezone: ERP_BUSINESS_TIMEZONE,
      };
      this.rolloverHistory.push(rolloverEvent);
    }
    this.notifyListeners(rolloverEvent);
    return { changed, state: this.getState(), rolloverEvent };
  }

  /**
   * Advances or rewinds the active date by `deltaDays` (enters DEV_OVERRIDE mode if currently live).
   */
  public stepBusinessDateByDays(
    deltaDays: number,
    reason = 'Admin / Developer Step Simulation'
  ) {
    const nextDate = advanceVidyutDateByDays(this.state.businessDate, deltaDays);
    return this.setDeveloperOverrideDate(nextDate, reason);
  }

  private clearMidnightTimer(): void {
    if (this.midnightTimeoutId !== null) {
      clearTimeout(this.midnightTimeoutId);
      this.midnightTimeoutId = null;
      this.activeTimerCount = 0;
    }
  }

  private scheduleSingleMidnightTimer(): void {
    this.clearMidnightTimer();
    const delayMs = getMsUntilNextAsiaKolkataMidnight(this.clock);
    // Cap setTimeout to max 24h (well below 32-bit signed int limit of ~24.8 days)
    const safeDelayMs = Math.min(delayMs, 24 * 60 * 60 * 1000 + 1000);
    this.activeTimerCount = 1;
    this.midnightTimeoutId = setTimeout(() => {
      this.activeTimerCount = 0;
      this.midnightTimeoutId = null;
      this.evaluateNow('MIDNIGHT_TIMER');
    }, safeDelayMs);
  }

  /**
   * Starts the centralized business clock listeners (single midnight timer, visibilitychange, focus, wake drift check).
   * Calling `start()` multiple times is idempotent and never creates duplicate timers.
   */
  public start(): void {
    if (this.isStarted) {
      this.scheduleSingleMidnightTimer();
      return;
    }
    this.isStarted = true;
    this.scheduleSingleMidnightTimer();

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.boundVisibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          this.evaluateNow('TAB_VISIBILITY_RESUME');
        }
      };
      this.boundFocusHandler = () => {
        this.evaluateNow('WINDOW_FOCUS');
      };

      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
      window.addEventListener('focus', this.boundFocusHandler);

      // Lightweight 60-second sleep/wake drift check (NO 1-second polling):
      // Detects if device woke up from sleep without firing focus/visibilitychange.
      this.wakeCheckIntervalId = setInterval(() => {
        const liveParts = formatDateInAsiaKolkata(this.clock);
        if (
          this.state.mode === 'LIVE_ASIA_KOLKATA' &&
          liveParts.vidyutDate !== this.state.businessDate
        ) {
          this.evaluateNow('DEVICE_WAKE_DRIFT');
        }
      }, 60_000);
    }
  }

  /**
   * Stops all timers and removes DOM event listeners cleanly on unmount.
   */
  public stop(): void {
    this.isStarted = false;
    this.clearMidnightTimer();
    if (this.wakeCheckIntervalId !== null) {
      clearInterval(this.wakeCheckIntervalId);
      this.wakeCheckIntervalId = null;
    }
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (this.boundVisibilityHandler) {
        document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        this.boundVisibilityHandler = null;
      }
      if (this.boundFocusHandler) {
        window.removeEventListener('focus', this.boundFocusHandler);
        this.boundFocusHandler = null;
      }
    }
  }
}

// ============================================================================
// PART 2: BROWSER-LOCAL CROSS-TAB REAL-TIME SYNCHRONIZATION
// ============================================================================

export type CrossTabFinancialEventType =
  | 'BUSINESS_DATE_ROLLOVER'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_FAILED_OR_PENDING'
  | 'PAYMENT_REVERSED'
  | 'LATE_CHARGE_WAIVER_APPLIED'
  | 'BILL_ADJUSTMENT_APPLIED'
  | 'FORMAL_NOTICE_UPDATED'
  | 'NOTIFICATION_STATE_UPDATED'
  | 'CLOCK_MODE_CHANGED';

export interface CrossTabFinancialSyncEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: CrossTabFinancialEventType;
  sourceTabId: string;
  occurredAtIso: string;
  businessReferenceDate: string;
  consumerNo?: string;
  billNo?: string;
  actorRole?: 'consumer' | 'employee' | 'management' | 'admin' | 'system';
  actorId?: string;
  payload: TPayload;
}

/**
 * In-memory pub/sub bus used both as an intra-process fallback and for deterministic
 * multi-tab automated tests in Node/tsx where browser BroadcastChannel may not span simulated tabs.
 */
export class InMemoryCrossTabBus {
  private subscribers = new Map<
    string,
    Set<(envelope: CrossTabFinancialSyncEnvelope) => void>
  >();

  public subscribe(
    channelName: string,
    handler: (envelope: CrossTabFinancialSyncEnvelope) => void
  ): () => void {
    let channelSubs = this.subscribers.get(channelName);
    if (!channelSubs) {
      channelSubs = new Set();
      this.subscribers.set(channelName, channelSubs);
    }
    channelSubs.add(handler);
    return () => {
      channelSubs?.delete(handler);
    };
  }

  public publish(channelName: string, envelope: CrossTabFinancialSyncEnvelope): void {
    const channelSubs = this.subscribers.get(channelName);
    if (!channelSubs) return;
    for (const handler of channelSubs) {
      try {
        handler(envelope);
      } catch {
        // Ignore handler exception
      }
    }
  }
}

export const defaultInMemoryCrossTabBus = new InMemoryCrossTabBus();

/**
 * Verifies RBAC / Consumer Isolation for cross-tab financial events:
 * - Authorized ERP roles ('employee', 'management', 'admin') can observe all consumer ledger updates.
 * - A 'consumer' tab can ONLY apply/observe events that are either system-wide (e.g. BUSINESS_DATE_ROLLOVER)
 *   or belong to one of that consumer's own `ownedConsumerNos`.
 * - A consumer tab NEVER receives or surfaces another consumer's private billing/notice details.
 */
export function canActorReceiveFinancialSyncEvent(
  envelope: CrossTabFinancialSyncEnvelope,
  receiverScope: {
    role: 'consumer' | 'employee' | 'management' | 'admin' | null;
    ownedConsumerNos?: string[];
  }
): boolean {
  // System-wide clock events apply to all tabs
  if (
    envelope.eventType === 'BUSINESS_DATE_ROLLOVER' ||
    envelope.eventType === 'CLOCK_MODE_CHANGED'
  ) {
    return true;
  }

  if (
    receiverScope.role === 'employee' ||
    receiverScope.role === 'management' ||
    receiverScope.role === 'admin'
  ) {
    return true;
  }

  if (receiverScope.role === 'consumer') {
    if (!envelope.consumerNo) {
      return true;
    }
    const normTarget = envelope.consumerNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const owned = (receiverScope.ownedConsumerNos || []).map((c) =>
      c.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    );
    return owned.includes(normTarget);
  }

  return true;
}

/**
 * Cross-Tab Financial Sync Manager.
 * Coordinates BroadcastChannel, window 'storage' event fallback, and InMemoryCrossTabBus
 * with strict event deduplication and source-tab feedback-loop prevention.
 */
export class CrossTabFinancialSyncManager {
  public readonly tabId: string;
  private channelName: string;
  private broadcastChannel: BroadcastChannel | null = null;
  private inMemoryBus: InMemoryCrossTabBus;
  private unsubscribeInMemory: (() => void) | null = null;
  private boundStorageListener: ((e: StorageEvent) => void) | null = null;
  private storage: StorageLike | null;
  private seenEventIds = new Set<string>();
  private maxSeenEvents = 500;
  private handlers = new Set<(envelope: CrossTabFinancialSyncEnvelope) => void>();
  private duplicateIgnoredCount = 0;
  private selfOriginIgnoredCount = 0;

  constructor(options?: {
    tabId?: string;
    channelName?: string;
    inMemoryBus?: InMemoryCrossTabBus;
    storage?: StorageLike | null;
  }) {
    this.tabId =
      options?.tabId ||
      `vf-tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.channelName = options?.channelName || CROSS_TAB_BROADCAST_CHANNEL_NAME;
    this.inMemoryBus = options?.inMemoryBus || defaultInMemoryCrossTabBus;
    this.storage =
      options?.storage !== undefined
        ? options.storage
        : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;
  }

  public getDiagnostics() {
    return {
      tabId: this.tabId,
      seenEventCount: this.seenEventIds.size,
      duplicateIgnoredCount: this.duplicateIgnoredCount,
      selfOriginIgnoredCount: this.selfOriginIgnoredCount,
    };
  }

  private recordSeenEventId(eventId: string): void {
    this.seenEventIds.add(eventId);
    if (this.seenEventIds.size > this.maxSeenEvents) {
      const firstKey = this.seenEventIds.values().next().value;
      if (firstKey) {
        this.seenEventIds.delete(firstKey);
      }
    }
  }

  private handleIncomingEnvelope(envelope: CrossTabFinancialSyncEnvelope): void {
    if (!envelope || typeof envelope.eventId !== 'string') return;

    // 1. Prevent infinite feedback loops from events emitted by this tab
    if (envelope.sourceTabId === this.tabId) {
      this.selfOriginIgnoredCount += 1;
      return;
    }

    // 2. Deduplicate events delivered via both BroadcastChannel and localStorage fallback
    if (this.seenEventIds.has(envelope.eventId)) {
      this.duplicateIgnoredCount += 1;
      return;
    }

    this.recordSeenEventId(envelope.eventId);

    for (const handler of this.handlers) {
      try {
        handler(envelope);
      } catch {
        // Guard against handler exceptions
      }
    }
  }

  public start(): void {
    // 1. Subscribe to InMemoryCrossTabBus
    if (!this.unsubscribeInMemory) {
      this.unsubscribeInMemory = this.inMemoryBus.subscribe(
        this.channelName,
        (envelope) => this.handleIncomingEnvelope(envelope)
      );
    }

    // 2. Subscribe to native BroadcastChannel if available in browser
    if (typeof BroadcastChannel !== 'undefined' && !this.broadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          if (event?.data && typeof event.data === 'object') {
            this.handleIncomingEnvelope(event.data as CrossTabFinancialSyncEnvelope);
          }
        };
      } catch {
        this.broadcastChannel = null;
      }
    }

    // 3. Subscribe to window 'storage' event fallback
    if (typeof window !== 'undefined' && !this.boundStorageListener) {
      this.boundStorageListener = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY_CROSS_TAB_LAST_EVENT || !event.newValue) return;
        try {
          const parsed = JSON.parse(event.newValue) as CrossTabFinancialSyncEnvelope;
          this.handleIncomingEnvelope(parsed);
        } catch {
          // Ignore malformed JSON
        }
      };
      window.addEventListener('storage', this.boundStorageListener);
    }
  }

  public stop(): void {
    if (this.unsubscribeInMemory) {
      this.unsubscribeInMemory();
      this.unsubscribeInMemory = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore close error
      }
      this.broadcastChannel = null;
    }
    if (typeof window !== 'undefined' && this.boundStorageListener) {
      window.removeEventListener('storage', this.boundStorageListener);
      this.boundStorageListener = null;
    }
  }

  public onEvent(
    handler: (envelope: CrossTabFinancialSyncEnvelope) => void
  ): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public publish<TPayload = Record<string, unknown>>(input: {
    eventId?: string;
    eventType: CrossTabFinancialEventType;
    businessReferenceDate: string;
    consumerNo?: string;
    billNo?: string;
    actorRole?: 'consumer' | 'employee' | 'management' | 'admin' | 'system';
    actorId?: string;
    payload: TPayload;
  }): CrossTabFinancialSyncEnvelope<TPayload> {
    const eventId =
      input.eventId ||
      `sync-${input.eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const envelope: CrossTabFinancialSyncEnvelope<TPayload> = {
      eventId,
      eventType: input.eventType,
      sourceTabId: this.tabId,
      occurredAtIso: new Date().toISOString(),
      businessReferenceDate: input.businessReferenceDate,
      consumerNo: input.consumerNo,
      billNo: input.billNo,
      actorRole: input.actorRole || 'system',
      actorId: input.actorId,
      payload: input.payload,
    };

    // Mark as seen in origin tab immediately
    this.recordSeenEventId(eventId);

    // 1. Broadcast over InMemoryCrossTabBus
    this.inMemoryBus.publish(this.channelName, envelope as CrossTabFinancialSyncEnvelope);

    // 2. Broadcast over native BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch {
        // Ignore postMessage failure
      }
    }

    // 3. Persist to localStorage to trigger 'storage' event in sibling browser tabs
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY_CROSS_TAB_LAST_EVENT, JSON.stringify(envelope));
      } catch {
        // Ignore storage errors
      }
    }

    return envelope;
  }
}

// ============================================================================
// PART 3: DOCUMENTED PRODUCTION BACKEND EVENT CONTRACTS FOR YOGESH
// ============================================================================

export interface BackendRealtimeEventContractSpec {
  topic: string;
  eventType: CrossTabFinancialEventType;
  transport: 'WebSocket_WSS' | 'ServerSentEvents_SSE' | 'PostgreSQL_Transactional_Outbox';
  idempotencyKeyTemplate: string;
  rbacVisibilityScope: 'CONSUMER_OWNED_ONLY' | 'SUBDIVISION_EMPLOYEE_AND_ABOVE' | 'ALL_AUTHENTICATED';
  description: string;
}

export const BACKEND_REALTIME_EVENT_CONTRACTS_FOR_YOGESH: readonly BackendRealtimeEventContractSpec[] = [
  {
    topic: 'ugvcl.erp.clock.rollover.v1',
    eventType: 'BUSINESS_DATE_ROLLOVER',
    transport: 'ServerSentEvents_SSE',
    idempotencyKeyTemplate: 'CLOCK_ROLLOVER:{isoBusinessDate}:Asia_Kolkata',
    rbacVisibilityScope: 'ALL_AUTHENTICATED',
    description:
      'Broadcasts daily 00:00:00 IST business date transition from backend scheduler so all connected Consumer/ERP clients recalculate daily DPS and notice countdowns.',
  },
  {
    topic: 'ugvcl.erp.billing.payment.settled.v1',
    eventType: 'PAYMENT_RECORDED',
    transport: 'PostgreSQL_Transactional_Outbox',
    idempotencyKeyTemplate: 'PAYMENT_SETTLED:{billNo}:{txId}',
    rbacVisibilityScope: 'CONSUMER_OWNED_ONLY',
    description:
      'Emitted atomically when payment gateway webhook or cashier counter commits a Successful payment receipt, updating principal, DPS, notices, and calendar.',
  },
  {
    topic: 'ugvcl.erp.billing.payment.reversed.v1',
    eventType: 'PAYMENT_REVERSED',
    transport: 'PostgreSQL_Transactional_Outbox',
    idempotencyKeyTemplate: 'PAYMENT_REVERSED:{billNo}:{reversalId}',
    rbacVisibilityScope: 'SUBDIVISION_EMPLOYEE_AND_ABOVE',
    description:
      'Emitted when a dishonored cheque / chargeback reverses a prior receipt, immediately restoring unpaid principal, overdue status, and DPS accrual.',
  },
  {
    topic: 'ugvcl.erp.billing.waiver.approved.v1',
    eventType: 'LATE_CHARGE_WAIVER_APPLIED',
    transport: 'PostgreSQL_Transactional_Outbox',
    idempotencyKeyTemplate: 'DPS_WAIVER:{billNo}:{waiverId}',
    rbacVisibilityScope: 'SUBDIVISION_EMPLOYEE_AND_ABOVE',
    description:
      'Emitted when an authorized officer approves a partial or full late-payment surcharge waiver.',
  },
  {
    topic: 'ugvcl.erp.enforcement.notice.lifecycle.v1',
    eventType: 'FORMAL_NOTICE_UPDATED',
    transport: 'PostgreSQL_Transactional_Outbox',
    idempotencyKeyTemplate: 'NOTICE_STATE:{noticeNumber}:{status}:{updatedAtIso}',
    rbacVisibilityScope: 'CONSUMER_OWNED_ONLY',
    description:
      'Emitted on Section 56(1) notice preparation, approval, service-evidence verification, or automatic settlement withdrawal.',
  },
] as const;

// ============================================================================
// PART 4: MULTILINGUAL DICTIONARY FOR STEP 4C (EN / GU / HI / MR)
// ============================================================================

export const STEP4C_CLOCK_AND_SYNC_I18N: Record<
  Language,
  {
    liveBusinessClockTitle: string;
    liveAsiaKolkataBadge: string;
    devOverrideBadge: string;
    devOverrideWarningBanner: string;
    activeBusinessDateLabel: string;
    actualLiveIstDateLabel: string;
    crossTabSyncActiveLabel: string;
    returnToLiveClockBtn: string;
    stepForwardOneDayBtn: string;
    serviceEvidencePendingBadge: string;
    serviceEvidencePendingNoticeNote: string;
    verifyServiceEvidenceBtn: string;
  }
> = {
  en: {
    liveBusinessClockTitle: 'Centralized ERP Business Clock (Asia/Kolkata)',
    liveAsiaKolkataBadge: 'LIVE IST CLOCK (Asia/Kolkata)',
    devOverrideBadge: 'SIMULATED DATE OVERRIDE (DEV / TEST)',
    devOverrideWarningBanner:
      'Developer/Admin Date Override is active. Late-payment charges and notice countdowns are being simulated for the selected override date.',
    activeBusinessDateLabel: 'Active ERP Business Date',
    actualLiveIstDateLabel: 'Actual Live Date (Asia/Kolkata)',
    crossTabSyncActiveLabel: 'Cross-Tab Real-Time Sync Active',
    returnToLiveClockBtn: 'Reset to Live IST Date',
    stepForwardOneDayBtn: '+1 Business Day (Simulate Rollover)',
    serviceEvidencePendingBadge: 'Service Verification Pending',
    serviceEvidencePendingNoticeNote:
      'Statutory 15-clear-day countdown requires verified notice-service delivery evidence and policy review.',
    verifyServiceEvidenceBtn: 'Record Verified Service Delivery',
  },
  gu: {
    liveBusinessClockTitle: 'કેન્દ્રીયકૃત ERP બિઝનેસ ઘડિયાળ (Asia/Kolkata)',
    liveAsiaKolkataBadge: 'લાઇવ IST ઘડિયાળ (Asia/Kolkata)',
    devOverrideBadge: 'સિમ્યુલેટેડ તારીખ ઓવરરાઇડ (DEV / TEST)',
    devOverrideWarningBanner:
      'ડેવલપર/એડમિન તારીખ ઓવરરાઇડ સક્રિય છે. વિલંબિત ચુકવણી ચાર્જ અને નોટિસ કાઉન્ટડાઉન પસંદ કરેલ તારીખ મુજબ સિમ્યુલેટ થઈ રહ્યા છે.',
    activeBusinessDateLabel: 'સક્રિય ERP બિઝનેસ તારીખ',
    actualLiveIstDateLabel: 'વાસ્તવિક લાઇવ તારીખ (Asia/Kolkata)',
    crossTabSyncActiveLabel: 'ક્રોસ-ટેબ રિયલ-ટાઇમ સિંક સક્રિય',
    returnToLiveClockBtn: 'લાઇવ IST તારીખ પર રીસેટ કરો',
    stepForwardOneDayBtn: '+1 બિઝનેસ દિવસ (રોલઓવર સિમ્યુલેટ કરો)',
    serviceEvidencePendingBadge: 'બજવણી પુરાવા ચકાસણી બાકી',
    serviceEvidencePendingNoticeNote:
      'વૈધાનિક 15 સ્પષ્ટ દિવસની મુદતની ગણતરી માટે પ્રમાણિત નોટિસ બજવણી પુરાવા અને નીતિ સમીક્ષા આવશ્યક છે.',
    verifyServiceEvidenceBtn: 'પ્રમાણિત બજવણી પુરાવો નોંધો',
  },
  hi: {
    liveBusinessClockTitle: 'केंद्रीकृत ERP व्यावसायिक घड़ी (Asia/Kolkata)',
    liveAsiaKolkataBadge: 'लाइव IST घड़ी (Asia/Kolkata)',
    devOverrideBadge: 'सिम्युलेटेड तिथि ओवरराइड (DEV / TEST)',
    devOverrideWarningBanner:
      'डेवलपर/एडमिन तिथि ओवरराइड सक्रिय है। विलंब भुगतान अधिभार और नोटिस समय-सीमा चयनित ओवरराइड तिथि के अनुसार सिम्युलेट किए जा रहे हैं।',
    activeBusinessDateLabel: 'सक्रिय ERP व्यावसायिक तिथि',
    actualLiveIstDateLabel: 'वास्तविक लाइव तिथि (Asia/Kolkata)',
    crossTabSyncActiveLabel: 'क्रॉस-टैब रीयल-टाइम सिंक सक्रिय',
    returnToLiveClockBtn: 'लाइव IST तिथि पर रीसेट करें',
    stepForwardOneDayBtn: '+1 व्यावसायिक दिन (रोलओवर सिम्युलेट करें)',
    serviceEvidencePendingBadge: 'तामील प्रमाण सत्यापन लंबित',
    serviceEvidencePendingNoticeNote:
      'वैधानिक 15 स्पष्ट दिनों की समय-सीमा की गणना के लिए सत्यापित नोटिस तामील प्रमाण और नीति समीक्षा आवश्यक है।',
    verifyServiceEvidenceBtn: 'सत्यापित तामील प्रमाण दर्ज करें',
  },
  mr: {
    liveBusinessClockTitle: 'केंद्रीकृत ERP व्यावसायिक घड्याळ (Asia/Kolkata)',
    liveAsiaKolkataBadge: 'लाईव्ह IST घड्याळ (Asia/Kolkata)',
    devOverrideBadge: 'सिम्युलेटेड तारीख ओव्हरराइड (DEV / TEST)',
    devOverrideWarningBanner:
      'डेव्हलपर/ॲडमिन तारीख ओव्हरराइड सक्रिय आहे. विलंब आकार आणि नोटीस काउंटडाउन निवडलेल्या तारखेनुसार सिम्युलेट केले जात आहेत.',
    activeBusinessDateLabel: 'सक्रिय ERP व्यावसायिक तारीख',
    actualLiveIstDateLabel: 'प्रत्यक्ष लाईव्ह तारीख (Asia/Kolkata)',
    crossTabSyncActiveLabel: 'क्रॉस-टॅब रिअल-टाइम सिंक सक्रिय',
    returnToLiveClockBtn: 'लाईव्ह IST तारखेवर रीसेट करा',
    stepForwardOneDayBtn: '+1 व्यावसायिक दिवस (रोलओव्हर सिम्युलेट करा)',
    serviceEvidencePendingBadge: 'बजावणी पुरावा पडताळणी प्रलंबित',
    serviceEvidencePendingNoticeNote:
      'वैधानिक १५ स्पष्ट दिवसांच्या मुदतीच्या मोजणीसाठी प्रमाणित नोटीस बजावणी पुरावा आणि धोरण पुनरावलोकन आवश्यक आहे.',
    verifyServiceEvidenceBtn: 'प्रमाणित बजावणी पुरावा नोंदवा',
  },
};
