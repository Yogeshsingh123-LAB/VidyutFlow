/**
 * VidyutFlow UGVCL ERP — Centralized Date & Time Utilities
 * Standardizes visible date & time across all 5 portals to:
 * Date: DD/MM/YYYY
 * Time: hh:mm AM/PM
 * Example: 25/10/2026, 02:35 PM
 * Timezone: Asia/Kolkata
 */

export const ERP_TIMEZONE = 'Asia/Kolkata';

// Formatter for full Date & Time: DD/MM/YYYY, hh:mm AM/PM
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ERP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

// Formatter for Date only: DD/MM/YYYY
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ERP_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

// Formatter for Time only: hh:mm AM/PM
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ERP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

/**
 * Safely parses various date inputs into a valid Date object.
 * Returns null if input is invalid or missing.
 */
export function parseDateSafe(input?: string | number | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Handle DD/MM/YYYY or DD/MM/YYYY, hh:mm AM/PM (Asia/Kolkata +05:30)
    const slashDmyMatch = trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?$/
    );
    if (slashDmyMatch) {
      const day = Number(slashDmyMatch[1]);
      const monthIndex = Number(slashDmyMatch[2]) - 1;
      const year = Number(slashDmyMatch[3]);
      let hour = slashDmyMatch[4] !== undefined ? Number(slashDmyMatch[4]) : 12;
      const min = slashDmyMatch[5] !== undefined ? Number(slashDmyMatch[5]) : 0;
      const sec = slashDmyMatch[6] !== undefined ? Number(slashDmyMatch[6]) : 0;
      const meridiem = slashDmyMatch[7]?.toUpperCase();
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      // Convert Asia/Kolkata (UTC+05:30) wall-clock time to UTC epoch
      const utcMs = Date.UTC(year, monthIndex, day, hour, min, sec) - (5 * 60 + 30) * 60 * 1000;
      const d = new Date(utcMs);
      if (!isNaN(d.getTime())) return d;
    }

    // ISO 8601 or standard date format
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Handle DD-MMM-YYYY (e.g. "15-Oct-2026" or "15-Oct-2026 06:19")
    const dmyMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (dmyMatch) {
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const monthIndex = monthMap[dmyMatch[2].toLowerCase()];
      if (monthIndex !== undefined) {
        const year = Number(dmyMatch[3]);
        const day = Number(dmyMatch[1]);
        const hour = dmyMatch[4] ? Number(dmyMatch[4]) : 12;
        const min = dmyMatch[5] ? Number(dmyMatch[5]) : 0;
        const utcMs = Date.UTC(year, monthIndex, day, hour, min, 0) - (5 * 60 + 30) * 60 * 1000;
        return new Date(utcMs);
      }
    }

    // Handle DD-MMM (e.g. "15-Oct 06:19")
    const dmMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (dmMatch) {
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const monthIndex = monthMap[dmMatch[2].toLowerCase()];
      if (monthIndex !== undefined) {
        const year = 2026;
        const day = Number(dmMatch[1]);
        const hour = dmMatch[3] ? Number(dmMatch[3]) : 12;
        const min = dmMatch[4] ? Number(dmMatch[4]) : 0;
        const utcMs = Date.UTC(year, monthIndex, day, hour, min, 0) - (5 * 60 + 30) * 60 * 1000;
        return new Date(utcMs);
      }
    }
  }

  return null;
}

/**
 * Formats a timestamp into standard DD/MM/YYYY, hh:mm AM/PM (Asia/Kolkata).
 * e.g. "25/10/2026, 02:35 PM"
 */
export function formatErpDateTime(
  input?: string | number | Date | null,
  fallback: string = '—'
): string {
  const d = parseDateSafe(input);
  if (!d) {
    return fallback;
  }
  try {
    const formatted = dateTimeFormatter.format(d);
    // Intl 'en-GB' produces e.g. "25/10/2026, 02:35 pm", uppercase to PM
    return formatted.toUpperCase();
  } catch {
    return fallback;
  }
}

/**
 * Formats a date into standard DD/MM/YYYY (Asia/Kolkata).
 * e.g. "25/10/2026"
 */
export function formatErpDateOnly(
  input?: string | number | Date | null,
  fallback: string = '—'
): string {
  const d = parseDateSafe(input);
  if (!d) {
    return fallback;
  }
  try {
    return dateFormatter.format(d);
  } catch {
    return fallback;
  }
}

/**
 * Formats a time into standard hh:mm AM/PM (Asia/Kolkata).
 * e.g. "02:35 PM"
 */
export function formatErpTimeOnly(
  input?: string | number | Date | null,
  fallback: string = '—'
): string {
  const d = parseDateSafe(input);
  if (!d) {
    return fallback;
  }
  try {
    return timeFormatter.format(d).toUpperCase();
  } catch {
    return fallback;
  }
}

export type NotificationDateBucketKey = 'TODAY' | 'YESTERDAY' | 'UNDATED' | string;

export interface NotificationTimestampLike {
  id?: string;
  createdAt?: string | number | Date | null;
  timestamp?: string | number | Date | null;
  formattedTimestamp?: string | null;
  time?: string | null;
}

/**
 * Extracts a verified stored Date from a notification record without inventing dates
 * for missing or relative-only legacy timestamps.
 */
export function parseNotificationStoredDate(notif?: NotificationTimestampLike | null): Date | null {
  if (!notif) return null;
  const candidates = [
    notif.createdAt,
    notif.timestamp,
    notif.formattedTimestamp,
    notif.time
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = parseDateSafe(candidate);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Computes a numeric sort key for newest-first ordering.
 * Notifications with real stored timestamps sort by exact epoch milliseconds.
 * Legacy notifications with only relative labels (e.g. "Just now", "15 mins ago")
 * sort deterministically below dated notifications without fabricating calendar dates.
 */
export function getNotificationSortEpoch(notif?: NotificationTimestampLike | null): number {
  if (!notif) return 0;
  const parsed = parseNotificationStoredDate(notif);
  if (parsed) {
    return parsed.getTime();
  }
  const rawTime = typeof notif.time === 'string' ? notif.time.trim() : '';
  if (!rawTime) return 0;
  if (/^just now$/i.test(rawTime)) return 100_000;
  if (/^recent$/i.test(rawTime)) return 90_000;
  const minsMatch = rawTime.match(/^(\d+)\s+mins?\s+ago$/i);
  if (minsMatch) {
    return Math.max(1, 80_000 - Number(minsMatch[1]) * 60);
  }
  const hoursMatch = rawTime.match(/^(\d+)\s+hours?\s+ago$/i);
  if (hoursMatch) {
    return Math.max(1, 80_000 - Number(hoursMatch[1]) * 3600);
  }
  const daysMatch = rawTime.match(/^(\d+)\s+days?\s+ago$/i);
  if (daysMatch) {
    return Math.max(1, 80_000 - Number(daysMatch[1]) * 86400);
  }
  return 0;
}

/**
 * Returns a new array of notifications sorted newest-first.
 */
export function sortNotificationsNewestFirst<T extends NotificationTimestampLike>(
  notifications: T[]
): T[] {
  return [...notifications].sort((a, b) => {
    const diff = getNotificationSortEpoch(b) - getNotificationSortEpoch(a);
    if (diff !== 0) return diff;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

/**
 * Determines the calendar date bucket in Asia/Kolkata timezone:
 * - 'TODAY' if same calendar date in Asia/Kolkata as referenceDate
 * - 'YESTERDAY' if previous calendar date in Asia/Kolkata
 * - 'DD/MM/YYYY' for earlier calendar dates
 * - 'UNDATED' if timestamp is missing or unparseable
 */
export function getErpDateBucketKey(
  input?: string | number | Date | null,
  referenceNow?: string | number | Date | null
): NotificationDateBucketKey {
  const targetDate = parseDateSafe(input);
  if (!targetDate) return 'UNDATED';

  const nowDate = parseDateSafe(referenceNow) || new Date();
  const targetDayStr = formatErpDateOnly(targetDate, '');
  if (!targetDayStr) return 'UNDATED';

  const todayStr = formatErpDateOnly(nowDate, '');
  if (targetDayStr === todayStr) {
    return 'TODAY';
  }

  // Calculate yesterday's calendar date in Asia/Kolkata safely using noon IST
  const todayParts = todayStr.split('/');
  if (todayParts.length === 3) {
    const d = Number(todayParts[0]);
    const m = Number(todayParts[1]) - 1;
    const y = Number(todayParts[2]);
    const yesterdayNoonUtc = new Date(Date.UTC(y, m, d - 1, 12, 0, 0) - (5 * 60 + 30) * 60 * 1000);
    const yesterdayStr = formatErpDateOnly(yesterdayNoonUtc, '');
    if (targetDayStr === yesterdayStr) {
      return 'YESTERDAY';
    }
  }

  return targetDayStr;
}

export interface NotificationDateGroup<T> {
  bucketKey: NotificationDateBucketKey;
  calendarDate: string; // DD/MM/YYYY when known, or '' for UNDATED
  items: T[];
}

/**
 * Sorts notifications newest-first and groups them into date-wise sections:
 * Today, Yesterday, earlier calendar dates (DD/MM/YYYY), and Undated (if any legacy items lack timestamps).
 */
export function groupNotificationsByDate<T extends NotificationTimestampLike>(
  notifications: T[],
  referenceNow?: string | number | Date | null
): NotificationDateGroup<T>[] {
  const sorted = sortNotificationsNewestFirst(notifications);
  const groupsMap = new Map<NotificationDateBucketKey, NotificationDateGroup<T>>();

  for (const item of sorted) {
    const parsedDate = parseNotificationStoredDate(item);
    const bucketKey = parsedDate ? getErpDateBucketKey(parsedDate, referenceNow) : 'UNDATED';
    const calendarDate = parsedDate ? formatErpDateOnly(parsedDate, '') : '';

    const existing = groupsMap.get(bucketKey);
    if (existing) {
      existing.items.push(item);
    } else {
      groupsMap.set(bucketKey, {
        bucketKey,
        calendarDate,
        items: [item]
      });
    }
  }

  return Array.from(groupsMap.values());
}

