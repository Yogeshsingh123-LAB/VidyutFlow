import {
  AppNotification,
  ComplaintRecord,
  NewConnectionApplication,
  UserRole
} from '../types';
import { LanguageCode } from '../i18n/types';
import {
  ERP_TIMEZONE,
  formatErpDateOnly,
  formatErpDateTime,
  parseDateSafe
} from './dateUtils';
import { normalizeCanonicalSubdivision } from '../i18n/consumerContentTranslations';

function isEmployeeAuthorizedForSubdivision(
  employeeSubdivision?: string | null,
  targetSubdivision?: string | null
): boolean {
  if (!employeeSubdivision || employeeSubdivision === 'All') {
    return true;
  }
  const empCanonical = normalizeCanonicalSubdivision(employeeSubdivision).toLowerCase();
  const targetCanonical = normalizeCanonicalSubdivision(
    targetSubdivision || 'Mehsana City North'
  ).toLowerCase();

  if (empCanonical === targetCanonical) {
    return true;
  }
  if (
    empCanonical === 'mehsana corporate circle' ||
    empCanonical === 'central office' ||
    empCanonical.includes('corporate')
  ) {
    return true;
  }
  if (empCanonical === 'mehsana circle') {
    return (
      targetCanonical.startsWith('mehsana') ||
      targetCanonical.startsWith('visnagar') ||
      targetCanonical.startsWith('kadi')
    );
  }
  if (empCanonical === 'gandhinagar circle') {
    return (
      targetCanonical.startsWith('gandhinagar') ||
      targetCanonical.startsWith('kalol')
    );
  }
  return false;
}

export type SlaRiskState =
  | 'ON_TRACK'
  | 'APPROACHING_DEADLINE'
  | 'BREACHED'
  | 'RESOLVED'
  | 'UNKNOWN';

export type SlaNotificationType = 'SLA_APPROACHING' | 'SLA_BREACHED';

/**
 * Canonical complaint SLA target hours by priority level.
 * Uses existing VidyutFlow complaint priority durations without inventing regulatory rules.
 */
export const COMPLAINT_SLA_HOURS_BY_PRIORITY: Readonly<
  Record<ComplaintRecord['priority'], number>
> = {
  Critical: 4,
  High: 12,
  Medium: 24,
  Low: 24
};

/**
 * Illustrative DEMO target completion window (in calendar days) for new-connection applications
 * when no explicit targetCompletionDate is provided.
 */
export const DEFAULT_APPLICATION_DEMO_SLA_DAYS = 15;

/**
 * Proactive approaching-deadline threshold: 2 hours in milliseconds.
 * Applied only when the record's configured SLA window is strictly greater than 2 hours.
 */
export const APPROACHING_DEADLINE_THRESHOLD_MS = 2 * 60 * 60 * 1000;
export const APPROACHING_DEADLINE_MIN_SLA_HOURS = 2;

export interface SlaEvaluationResult {
  recordId: string;
  recordType: 'complaint' | 'application';
  state: SlaRiskState;
  remainingMs: number | null;
  remainingHours: number | null;
  slaTargetHours: number;
  isBreached: boolean;
  isApproaching: boolean;
  isResolved: boolean;
  isValidTimestamp: boolean;
  isDemoIllustrativeTarget: boolean;
  filedOrAppliedDate: Date | null;
  dueDate: Date | null;
  formattedDueTime: string;
}

export interface DynamicComplaintSlaFields {
  filedAt: string;
  slaTargetHours: number;
  slaDueTime: string;
  slaBreached: boolean;
  timelineTimeLabel: string;
  scheduledWorkOrderDate: string;
}

export interface DynamicApplicationSlaFields {
  appliedDate: string;
  targetCompletionDate: string;
  slaTargetHours: number;
  isDemoIllustrativeTarget: boolean;
}

/**
 * Parses a timestamp string or Date in Asia/Kolkata (+05:30) timezone.
 * Prioritizes explicit DD-MMM-YYYY HH:mm and YYYY-MM-DD IST parsing before V8's local timezone fallback.
 */
export function parseSlaTimestampSafe(input?: string | number | Date | null): Date | null {
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

    // 1. Handle DD-MMM-YYYY (e.g. "30-Oct-2026" or "30-Oct-2026 09:30") in Asia/Kolkata (+05:30)
    const dmyMatch = trimmed.match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
    );
    if (dmyMatch) {
      const monthMap: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11
      };
      const monthIndex = monthMap[dmyMatch[2].toLowerCase()];
      if (monthIndex !== undefined) {
        const day = Number(dmyMatch[1]);
        const year = Number(dmyMatch[3]);
        const hour = dmyMatch[4] !== undefined ? Number(dmyMatch[4]) : 12;
        const min = dmyMatch[5] !== undefined ? Number(dmyMatch[5]) : 0;
        const utcMs =
          Date.UTC(year, monthIndex, day, hour, min, 0) - (5 * 60 + 30) * 60 * 1000;
        const d = new Date(utcMs);
        if (!isNaN(d.getTime())) return d;
      }
    }

    // 2. Delegate to parseDateSafe for DD/MM/YYYY, hh:mm AM/PM and ISO 8601
    return parseDateSafe(trimmed);
  }
  return null;
}

/**
 * Formats a Date into canonical complaint timestamp ("DD-MMM-YYYY HH:mm") in Asia/Kolkata timezone.
 */
export function formatComplaintSlaDateTime(dateInput: Date | number = new Date()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ERP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('day')}-${get('month')}-${get('year')} ${hour}:${get('minute')}`;
}

/**
 * Formats a Date into canonical application date ("YYYY-MM-DD") in Asia/Kolkata timezone.
 */
export function formatApplicationIsoDate(dateInput: Date | number = new Date()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ERP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Formats a Date into short timeline stamp ("DD-MMM HH:mm") in Asia/Kolkata timezone.
 */
export function formatErpTimelineShortStamp(dateInput: Date | number = new Date()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Just now';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ERP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('day')}-${get('month')} ${hour}:${get('minute')}`;
}

/**
 * Formats a Date into "DD-MMM-YYYY" in Asia/Kolkata timezone.
 */
export function formatErpShortDate(dateInput: Date | number = new Date()): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ERP_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${get('day')}-${get('month')}-${get('year')}`;
}

/**
 * Resolves the configured SLA duration in hours for a complaint priority or explicit override.
 */
export function resolveComplaintSlaHours(
  priority?: ComplaintRecord['priority'],
  explicitSlaTargetHours?: number
): number {
  if (
    typeof explicitSlaTargetHours === 'number' &&
    Number.isFinite(explicitSlaTargetHours) &&
    explicitSlaTargetHours > 0
  ) {
    return explicitSlaTargetHours;
  }
  const resolvedPriority: ComplaintRecord['priority'] = priority || 'High';
  return COMPLAINT_SLA_HOURS_BY_PRIORITY[resolvedPriority] ?? 12;
}

/**
 * Computes dynamic, timezone-aware SLA timestamps for a newly submitted complaint.
 * Never mutates existing DEMO seed records.
 */
export function computeDynamicComplaintSlaFields(params?: {
  priority?: ComplaintRecord['priority'];
  slaTargetHours?: number;
  submittedAt?: Date | string | number;
}): DynamicComplaintSlaFields {
  const parsedNow =
    params?.submittedAt !== undefined
      ? parseSlaTimestampSafe(params.submittedAt)
      : new Date();

  const effectiveSubmissionDate =
    parsedNow && !isNaN(parsedNow.getTime()) ? parsedNow : new Date();

  const slaTargetHours = resolveComplaintSlaHours(
    params?.priority,
    params?.slaTargetHours
  );
  const dueDate = new Date(
    effectiveSubmissionDate.getTime() + slaTargetHours * 60 * 60 * 1000
  );

  return {
    filedAt: formatComplaintSlaDateTime(effectiveSubmissionDate),
    slaTargetHours,
    slaDueTime: formatComplaintSlaDateTime(dueDate),
    slaBreached: false,
    timelineTimeLabel: formatErpTimelineShortStamp(effectiveSubmissionDate),
    scheduledWorkOrderDate: formatErpShortDate(effectiveSubmissionDate)
  };
}

/**
 * Computes dynamic illustrative DEMO target completion fields for a newly submitted application.
 */
export function computeDynamicApplicationSlaFields(params?: {
  submittedAt?: Date | string | number;
  targetDays?: number;
}): DynamicApplicationSlaFields {
  const parsedNow =
    params?.submittedAt !== undefined
      ? parseSlaTimestampSafe(params.submittedAt)
      : new Date();

  const effectiveSubmissionDate =
    parsedNow && !isNaN(parsedNow.getTime()) ? parsedNow : new Date();

  const days =
    typeof params?.targetDays === 'number' && params.targetDays > 0
      ? params.targetDays
      : DEFAULT_APPLICATION_DEMO_SLA_DAYS;

  const targetDate = new Date(
    effectiveSubmissionDate.getTime() + days * 24 * 60 * 60 * 1000
  );

  return {
    appliedDate: formatApplicationIsoDate(effectiveSubmissionDate),
    targetCompletionDate: formatApplicationIsoDate(targetDate),
    slaTargetHours: days * 24,
    isDemoIllustrativeTarget: true
  };
}

/**
 * Parses an application target date string.
 * When the target date is date-only ("YYYY-MM-DD" or "DD-MMM-YYYY"), treats the deadline as
 * the end of that calendar day (23:59:59) in Asia/Kolkata (+05:30) so applications are not
 * prematurely marked breached at midnight at the start of their target date.
 */
export function parseApplicationDueDateSafe(
  targetCompletionDate?: string | null,
  appliedDate?: string | null
): Date | null {
  const rawTarget = (targetCompletionDate || '').trim();
  if (rawTarget) {
    const isoDateOnlyMatch = rawTarget.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
      const d = new Date(
        `${isoDateOnlyMatch[1]}-${isoDateOnlyMatch[2]}-${isoDateOnlyMatch[3]}T23:59:59+05:30`
      );
      if (!isNaN(d.getTime())) return d;
    }
    const parsedTarget = parseSlaTimestampSafe(rawTarget);
    if (parsedTarget) {
      // If no explicit time component was supplied in DD-MMM-YYYY, set to end of day in IST
      if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(rawTarget)) {
        return new Date(parsedTarget.getTime() + (11 * 3600 + 59 * 60 + 59) * 1000);
      }
      return parsedTarget;
    }
  }

  const rawApplied = (appliedDate || '').trim();
  if (rawApplied) {
    const parsedApplied = parseSlaTimestampSafe(rawApplied);
    if (parsedApplied) {
      return new Date(
        parsedApplied.getTime() +
          DEFAULT_APPLICATION_DEMO_SLA_DAYS * 24 * 60 * 60 * 1000
      );
    }
  }

  return null;
}

/**
 * Evaluates a ComplaintRecord's SLA risk state deterministically.
 * - Resolved or Closed complaints are always classified as RESOLVED (never breached).
 * - Missing or invalid timestamps return UNKNOWN safely without crashing.
 */
export function evaluateComplaintSla(
  complaint: Pick<
    ComplaintRecord,
    'id' | 'status' | 'priority' | 'filedAt' | 'slaTargetHours' | 'slaDueTime' | 'slaBreached'
  >,
  referenceNow: Date | string | number = new Date()
): SlaEvaluationResult {
  const slaTargetHours = resolveComplaintSlaHours(
    complaint.priority,
    complaint.slaTargetHours
  );
  const isTerminal =
    complaint.status === 'Resolved' || complaint.status === 'Closed';

  const filedDate = parseSlaTimestampSafe(complaint.filedAt);
  const explicitDueDate = parseSlaTimestampSafe(complaint.slaDueTime);
  const computedDueDate =
    explicitDueDate ||
    (filedDate
      ? new Date(filedDate.getTime() + slaTargetHours * 60 * 60 * 1000)
      : null);

  if (isTerminal) {
    return {
      recordId: complaint.id,
      recordType: 'complaint',
      state: 'RESOLVED',
      remainingMs: null,
      remainingHours: null,
      slaTargetHours,
      isBreached: false,
      isApproaching: false,
      isResolved: true,
      isValidTimestamp: Boolean(computedDueDate),
      isDemoIllustrativeTarget: false,
      filedOrAppliedDate: filedDate,
      dueDate: computedDueDate,
      formattedDueTime:
        complaint.slaDueTime ||
        (computedDueDate ? formatComplaintSlaDateTime(computedDueDate) : '—')
    };
  }

  const nowDate = parseSlaTimestampSafe(referenceNow);

  if (!computedDueDate || !nowDate || isNaN(nowDate.getTime())) {
    return {
      recordId: complaint.id,
      recordType: 'complaint',
      state: 'UNKNOWN',
      remainingMs: null,
      remainingHours: null,
      slaTargetHours,
      isBreached: false,
      isApproaching: false,
      isResolved: false,
      isValidTimestamp: false,
      isDemoIllustrativeTarget: false,
      filedOrAppliedDate: filedDate,
      dueDate: null,
      formattedDueTime: complaint.slaDueTime || '—'
    };
  }

  const remainingMs = computedDueDate.getTime() - nowDate.getTime();
  const remainingHours = Number((remainingMs / (60 * 60 * 1000)).toFixed(2));

  if (remainingMs <= 0) {
    return {
      recordId: complaint.id,
      recordType: 'complaint',
      state: 'BREACHED',
      remainingMs,
      remainingHours,
      slaTargetHours,
      isBreached: true,
      isApproaching: false,
      isResolved: false,
      isValidTimestamp: true,
      isDemoIllustrativeTarget: false,
      filedOrAppliedDate: filedDate,
      dueDate: computedDueDate,
      formattedDueTime:
        complaint.slaDueTime || formatComplaintSlaDateTime(computedDueDate)
    };
  }

  const isApproaching =
    slaTargetHours > APPROACHING_DEADLINE_MIN_SLA_HOURS &&
    remainingMs > 0 &&
    remainingMs <= APPROACHING_DEADLINE_THRESHOLD_MS;

  return {
    recordId: complaint.id,
    recordType: 'complaint',
    state: isApproaching ? 'APPROACHING_DEADLINE' : 'ON_TRACK',
    remainingMs,
    remainingHours,
    slaTargetHours,
    isBreached: false,
    isApproaching,
    isResolved: false,
    isValidTimestamp: true,
    isDemoIllustrativeTarget: false,
    filedOrAppliedDate: filedDate,
    dueDate: computedDueDate,
    formattedDueTime:
      complaint.slaDueTime || formatComplaintSlaDateTime(computedDueDate)
  };
}

/**
 * Evaluates a NewConnectionApplication's illustrative DEMO target completion SLA state deterministically.
 * - Completed (Meter Installed), Rejected, or Archived applications are always classified as RESOLVED.
 * - Missing or invalid dates return UNKNOWN safely without crashing.
 */
export function evaluateApplicationSla(
  application: Pick<
    NewConnectionApplication,
    'id' | 'status' | 'appliedDate' | 'targetCompletionDate' | 'isArchived'
  >,
  referenceNow: Date | string | number = new Date()
): SlaEvaluationResult {
  const slaTargetHours = DEFAULT_APPLICATION_DEMO_SLA_DAYS * 24;
  const isTerminal =
    application.status === 'Meter Installed' ||
    application.status === 'Rejected' ||
    Boolean(application.isArchived);

  const appliedDate = parseSlaTimestampSafe(application.appliedDate);
  const dueDate = parseApplicationDueDateSafe(
    application.targetCompletionDate,
    application.appliedDate
  );

  if (isTerminal) {
    return {
      recordId: application.id,
      recordType: 'application',
      state: 'RESOLVED',
      remainingMs: null,
      remainingHours: null,
      slaTargetHours,
      isBreached: false,
      isApproaching: false,
      isResolved: true,
      isValidTimestamp: Boolean(dueDate),
      isDemoIllustrativeTarget: true,
      filedOrAppliedDate: appliedDate,
      dueDate,
      formattedDueTime:
        application.targetCompletionDate ||
        (dueDate ? formatApplicationIsoDate(dueDate) : '—')
    };
  }

  const nowDate = parseSlaTimestampSafe(referenceNow);

  if (!dueDate || !nowDate || isNaN(nowDate.getTime())) {
    return {
      recordId: application.id,
      recordType: 'application',
      state: 'UNKNOWN',
      remainingMs: null,
      remainingHours: null,
      slaTargetHours,
      isBreached: false,
      isApproaching: false,
      isResolved: false,
      isValidTimestamp: false,
      isDemoIllustrativeTarget: true,
      filedOrAppliedDate: appliedDate,
      dueDate: null,
      formattedDueTime: application.targetCompletionDate || '—'
    };
  }

  const remainingMs = dueDate.getTime() - nowDate.getTime();
  const remainingHours = Number((remainingMs / (60 * 60 * 1000)).toFixed(2));

  if (remainingMs <= 0) {
    return {
      recordId: application.id,
      recordType: 'application',
      state: 'BREACHED',
      remainingMs,
      remainingHours,
      slaTargetHours,
      isBreached: true,
      isApproaching: false,
      isResolved: false,
      isValidTimestamp: true,
      isDemoIllustrativeTarget: true,
      filedOrAppliedDate: appliedDate,
      dueDate,
      formattedDueTime: application.targetCompletionDate || formatErpDateOnly(dueDate)
    };
  }

  const isApproaching =
    remainingMs > 0 && remainingMs <= APPROACHING_DEADLINE_THRESHOLD_MS;

  return {
    recordId: application.id,
    recordType: 'application',
    state: isApproaching ? 'APPROACHING_DEADLINE' : 'ON_TRACK',
    remainingMs,
    remainingHours,
    slaTargetHours,
    isBreached: false,
    isApproaching,
    isResolved: false,
    isValidTimestamp: true,
    isDemoIllustrativeTarget: true,
    filedOrAppliedDate: appliedDate,
    dueDate,
    formattedDueTime: application.targetCompletionDate || formatErpDateOnly(dueDate)
  };
}

/**
 * Formats remaining or overdue duration into a localized human-readable label across en, gu, hi, mr.
 */
export function formatLocalizedSlaRemainingTime(
  evaluation: SlaEvaluationResult,
  lang: LanguageCode = 'en'
): string {
  if (evaluation.state === 'RESOLVED') {
    return {
      en: evaluation.recordType === 'application' ? 'Completed' : 'Resolved within workflow',
      gu: evaluation.recordType === 'application' ? 'પૂર્ણ થયેલ' : 'કાર્યપ્રણાલી હેઠળ નિવારણ થયું',
      hi: evaluation.recordType === 'application' ? 'पूर्ण' : 'कार्यप्रवाह के अंतर्गत समाधान',
      mr: evaluation.recordType === 'application' ? 'पूर्ण झाले' : 'कार्यप्रणाली अंतर्गत निवारण'
    }[lang];
  }

  if (evaluation.state === 'UNKNOWN' || evaluation.remainingMs === null) {
    return {
      en: 'Schedule unavailable',
      gu: 'સમયપત્રક અનુપલબ્ધ',
      hi: 'समय-सारणी अनुपलब्ध',
      mr: 'वेळापत्रक अनुपलब्ध'
    }[lang];
  }

  const absMinutes = Math.max(1, Math.round(Math.abs(evaluation.remainingMs) / (60 * 1000)));
  const days = Math.floor(absMinutes / (24 * 60));
  const hours = Math.floor((absMinutes % (24 * 60)) / 60);
  const mins = absMinutes % 60;

  const formatDurationParts = (): string => {
    if (days > 0) {
      return {
        en: `${days}d ${hours}h`,
        gu: `${days} દિ ${hours} કલાક`,
        hi: `${days} दि ${hours} घं`,
        mr: `${days} दि ${hours} तास`
      }[lang];
    }
    if (hours > 0) {
      return {
        en: `${hours}h ${mins}m`,
        gu: `${hours} કલાક ${mins} મિનિટ`,
        hi: `${hours} घं ${mins} मि`,
        mr: `${hours} तास ${mins} मि`
      }[lang];
    }
    return {
      en: `${mins}m`,
      gu: `${mins} મિનિટ`,
      hi: `${mins} मि`,
      mr: `${mins} मि`
    }[lang];
  };

  const dur = formatDurationParts();

  if (evaluation.state === 'BREACHED') {
    return {
      en: `Overdue by ${dur}`,
      gu: `${dur} થી સમયમર્યાદા વીતી ગઈ`,
      hi: `${dur} से समय-सीमा समाप्त`,
      mr: `${dur} ने मुदत उलटली`
    }[lang];
  }

  return {
    en: `${dur} remaining`,
    gu: `${dur} બાકી`,
    hi: `${dur} शेष`,
    mr: `${dur} शिल्लक`
  }[lang];
}

/**
 * Returns localized label and badge styling for an SLA risk state across en, gu, hi, mr.
 */
export function localizeSlaRiskStateBadge(
  state: SlaRiskState,
  lang: LanguageCode = 'en',
  recordType: 'complaint' | 'application' = 'complaint'
): {
  label: string;
  badgeClasses: string;
} {
  switch (state) {
    case 'ON_TRACK':
      return {
        label: {
          en: 'On Track',
          gu: 'સમયસર (On Track)',
          hi: 'समय पर (On Track)',
          mr: 'वेळेवर (On Track)'
        }[lang],
        badgeClasses:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
      };
    case 'APPROACHING_DEADLINE':
      return {
        label: {
          en: 'Approaching Deadline',
          gu: 'સમયમર્યાદા નજીક',
          hi: 'समय-सीमा निकट',
          mr: 'मुदत जवळ आली'
        }[lang],
        badgeClasses:
          'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
      };
    case 'BREACHED':
      return {
        label: {
          en: 'SLA Breached',
          gu: 'SLA સમયમર્યાદા ભંગ',
          hi: 'SLA समय-सीमा उल्लंघन',
          mr: 'SLA मुदत भंग'
        }[lang],
        badgeClasses:
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
      };
    case 'RESOLVED':
      return {
        label:
          recordType === 'application'
            ? {
                en: 'Completed',
                gu: 'પૂર્ણ થયેલ',
                hi: 'पूर्ण',
                mr: 'पूर्ण झाले'
              }[lang]
            : {
                en: 'Resolved',
                gu: 'નિવારણ થયું',
                hi: 'समाधान हो गया',
                mr: 'निवारण झाले'
              }[lang],
        badgeClasses:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
      };
    case 'UNKNOWN':
    default:
      return {
        label: {
          en: 'Schedule Pending',
          gu: 'સમયપત્રક બાકી',
          hi: 'समय-सारणी लंबित',
          mr: 'वेळापत्रक प्रलंबित'
        }[lang],
        badgeClasses:
          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
      };
  }
}

/**
 * Localized label clarifying that application SLA targets are illustrative DEMO targets.
 */
export function localizeDemoSlaTargetDisclaimer(lang: LanguageCode = 'en'): string {
  return {
    en: '15-Day Illustrative DEMO Target',
    gu: '૧૫-દિવસનો નિદર્શનાત્મક DEMO લક્ષ્યાંક',
    hi: '१५-दिवसीय उदाहरणात्मक DEMO लक्ष्य',
    mr: '१५-दिवसांचे प्रातिनिधिक DEMO उद्दिष्ट'
  }[lang];
}

export interface BuildProactiveSlaNotificationsParams {
  complaints: ComplaintRecord[];
  applications: NewConnectionApplication[];
  existingNotifications: AppNotification[];
  emittedEventKeys?: Iterable<string>;
  referenceNow?: Date | string | number;
}

export interface BuildProactiveSlaNotificationsResult {
  newNotifications: AppNotification[];
  allNotifications: AppNotification[];
  emittedEventKeys: Set<string>;
  evaluations: {
    complaints: Record<string, SlaEvaluationResult>;
    applications: Record<string, SlaEvaluationResult>;
  };
}

/**
 * Generates deterministic, deduplicated, role-scoped proactive SLA notifications
 * for active complaints and applications that are Approaching Deadline (< 2h remaining)
 * or Breached (past due time).
 *
 * Role & Subdivision Scoping Rules:
 * - Employee notifications (`targetRole: 'employee'`) are scoped to the record's canonical `subdivision`.
 * - Management notifications (`targetRole: 'management'`) are generated for breached SLAs for executive oversight.
 * - Consumer and Field roles NEVER receive internal SLA approaching/breach notifications.
 * - Resolved, Closed, Meter Installed, Rejected, or Archived records NEVER generate SLA alerts.
 */
export function buildProactiveSlaNotifications(
  params: BuildProactiveSlaNotificationsParams
): BuildProactiveSlaNotificationsResult {
  const {
    complaints,
    applications,
    existingNotifications,
    emittedEventKeys,
    referenceNow = new Date()
  } = params;

  const nowDate = parseSlaTimestampSafe(referenceNow) || new Date(referenceNow);
  const validNow = nowDate && !isNaN(nowDate.getTime()) ? nowDate : new Date();
  const nowIso = validNow.toISOString();
  const formattedNow = formatComplaintSlaDateTime(validNow);

  const seenEventKeys = new Set<string>(emittedEventKeys ? Array.from(emittedEventKeys) : []);
  const seenIds = new Set<string>();

  for (const existing of existingNotifications) {
    if (existing.eventKey) seenEventKeys.add(existing.eventKey);
    if (existing.id) seenIds.add(existing.id);
  }

  const newNotifications: AppNotification[] = [];
  const complaintEvaluations: Record<string, SlaEvaluationResult> = {};
  const applicationEvaluations: Record<string, SlaEvaluationResult> = {};

  // 1. Evaluate Complaints
  for (const cmp of complaints) {
    const evalResult = evaluateComplaintSla(cmp, validNow);
    complaintEvaluations[cmp.id] = evalResult;

    if (evalResult.isResolved || !evalResult.isValidTimestamp) {
      continue;
    }

    const subdiv = normalizeCanonicalSubdivision(cmp.subdivision || 'Mehsana City North');

    if (evalResult.state === 'APPROACHING_DEADLINE') {
      const minsLeft = Math.max(1, Math.round((evalResult.remainingMs || 0) / 60000));
      const empEventKey = `EVT-SLA-EMP-CMP-${cmp.id}-APPROACHING`;
      const empNotifId = `NOTIF-SLA-EMP-CMP-${cmp.id}-APPROACHING`;

      if (!seenEventKeys.has(empEventKey) && !seenIds.has(empNotifId)) {
        seenEventKeys.add(empEventKey);
        seenIds.add(empNotifId);
        newNotifications.push({
          id: empNotifId,
          notificationType: 'SLA_APPROACHING',
          title: `SLA Deadline Approaching: #${cmp.id}`,
          message: `Grievance #${cmp.id} (${cmp.category}) in ${subdiv} has ${minsLeft} mins remaining before its ${evalResult.slaTargetHours}h SLA deadline (${evalResult.formattedDueTime}).`,
          time: formattedNow,
          createdAt: nowIso,
          formattedTimestamp: formattedNow,
          targetRole: 'employee',
          role: 'employee',
          type: 'warning',
          read: false,
          category: 'Outage',
          complaintId: cmp.id,
          relatedEntityType: 'complaint',
          relatedEntityId: cmp.id,
          subdivision: subdiv,
          statusBadge: 'Approaching Deadline',
          actionUrl: `/employee/complaints?complaint=${cmp.id}`,
          eventKey: empEventKey
        });
      }
    } else if (evalResult.state === 'BREACHED') {
      const empEventKey = `EVT-SLA-EMP-CMP-${cmp.id}-BREACHED`;
      const empNotifId = `NOTIF-SLA-EMP-CMP-${cmp.id}-BREACHED`;

      if (!seenEventKeys.has(empEventKey) && !seenIds.has(empNotifId)) {
        seenEventKeys.add(empEventKey);
        seenIds.add(empNotifId);
        newNotifications.push({
          id: empNotifId,
          notificationType: 'SLA_BREACHED',
          title: `SLA Breached: #${cmp.id}`,
          message: `Grievance #${cmp.id} (${cmp.category}) in ${subdiv} has breached its ${evalResult.slaTargetHours}h SLA deadline (${evalResult.formattedDueTime}). Immediate resolution required.`,
          time: formattedNow,
          createdAt: nowIso,
          formattedTimestamp: formattedNow,
          targetRole: 'employee',
          role: 'employee',
          type: 'alert',
          read: false,
          category: 'Outage',
          complaintId: cmp.id,
          relatedEntityType: 'complaint',
          relatedEntityId: cmp.id,
          subdivision: subdiv,
          statusBadge: 'SLA Breached',
          actionUrl: `/employee/complaints?complaint=${cmp.id}`,
          eventKey: empEventKey
        });
      }

      const mgmtEventKey = `EVT-SLA-MGMT-CMP-${cmp.id}-BREACHED`;
      const mgmtNotifId = `NOTIF-SLA-MGMT-CMP-${cmp.id}-BREACHED`;

      if (!seenEventKeys.has(mgmtEventKey) && !seenIds.has(mgmtNotifId)) {
        seenEventKeys.add(mgmtEventKey);
        seenIds.add(mgmtNotifId);
        newNotifications.push({
          id: mgmtNotifId,
          notificationType: 'SLA_BREACHED',
          title: `SLA Breached: #${cmp.id}`,
          message: `Grievance #${cmp.id} (${cmp.category}) in ${subdiv} has breached its ${evalResult.slaTargetHours}h SLA deadline (${evalResult.formattedDueTime}). Immediate resolution required.`,
          time: formattedNow,
          createdAt: nowIso,
          formattedTimestamp: formattedNow,
          targetRole: 'management',
          role: 'management',
          type: 'alert',
          read: false,
          category: 'Outage',
          complaintId: cmp.id,
          relatedEntityType: 'complaint',
          relatedEntityId: cmp.id,
          subdivision: subdiv,
          statusBadge: 'SLA Breached',
          actionUrl: `/management/sla?complaint=${cmp.id}`,
          eventKey: mgmtEventKey
        });
      }
    }
  }

  // 2. Evaluate Applications (15-day illustrative DEMO target window)
  for (const app of applications) {
    const evalResult = evaluateApplicationSla(app, validNow);
    applicationEvaluations[app.id] = evalResult;

    if (evalResult.isResolved || !evalResult.isValidTimestamp) {
      continue;
    }

    const subdiv = normalizeCanonicalSubdivision(app.subdivision || 'Mehsana City North');

    if (evalResult.state === 'APPROACHING_DEADLINE') {
      const minsLeft = Math.max(1, Math.round((evalResult.remainingMs || 0) / 60000));
      const empEventKey = `EVT-SLA-EMP-APP-${app.id}-APPROACHING`;
      const empNotifId = `NOTIF-SLA-EMP-APP-${app.id}-APPROACHING`;

      if (!seenEventKeys.has(empEventKey) && !seenIds.has(empNotifId)) {
        seenEventKeys.add(empEventKey);
        seenIds.add(empNotifId);
        newNotifications.push({
          id: empNotifId,
          notificationType: 'SLA_APPROACHING',
          title: `Application SLA Approaching: ${app.id}`,
          message: `Application ${app.id} (${app.applicantName}) in ${subdiv} has ${minsLeft} mins remaining before its DEMO target completion window (${evalResult.formattedDueTime}).`,
          time: formattedNow,
          createdAt: nowIso,
          formattedTimestamp: formattedNow,
          targetRole: 'employee',
          role: 'employee',
          type: 'warning',
          read: false,
          category: 'Approval',
          applicationId: app.id,
          relatedEntityType: 'application',
          relatedEntityId: app.id,
          subdivision: subdiv,
          statusBadge: 'Approaching Deadline',
          actionUrl: `/employee/applications?application=${app.id}`,
          eventKey: empEventKey
        });
      }
    } else if (evalResult.state === 'BREACHED') {
      const empEventKey = `EVT-SLA-EMP-APP-${app.id}-BREACHED`;
      const empNotifId = `NOTIF-SLA-EMP-APP-${app.id}-BREACHED`;

      if (!seenEventKeys.has(empEventKey) && !seenIds.has(empNotifId)) {
        seenEventKeys.add(empEventKey);
        seenIds.add(empNotifId);
        newNotifications.push({
          id: empNotifId,
          notificationType: 'SLA_BREACHED',
          title: `Application Target Overdue: ${app.id}`,
          message: `Application ${app.id} (${app.applicantName}) in ${subdiv} has passed its DEMO target completion date (${evalResult.formattedDueTime}) at stage ${app.status}.`,
          time: formattedNow,
          createdAt: nowIso,
          formattedTimestamp: formattedNow,
          targetRole: 'employee',
          role: 'employee',
          type: 'alert',
          read: false,
          category: 'Approval',
          applicationId: app.id,
          relatedEntityType: 'application',
          relatedEntityId: app.id,
          subdivision: subdiv,
          statusBadge: 'SLA Breached',
          actionUrl: `/employee/applications?application=${app.id}`,
          eventKey: empEventKey
        });
      }

      const mgmtEventKey = `EVT-SLA-MGMT-APP-${app.id}-BREACHED`;
      const mgmtNotifId = `NOTIF-SLA-MGMT-APP-${app.id}-BREACHED`;

      if (!seenEventKeys.has(mgmtEventKey) && !seenIds.has(mgmtNotifId)) {
        seenEventKeys.add(mgmtEventKey);
        seenIds.add(mgmtNotifId);
        newNotifications.push({
          id: mgmtNotifId,
          notificationType: 'SLA_BREACHED',
          title: `Application Target Overdue: ${app.id}`,
          message: `Application ${app.id} (${app.applicantName}) in ${subdiv} has passed its DEMO target completion date (${evalResult.formattedDueTime}) at stage ${app.status}.`,
          time: formattedNow,
          createdAt: nowIso,
          formattedTimestamp: formattedNow,
          targetRole: 'management',
          role: 'management',
          type: 'alert',
          read: false,
          category: 'Approval',
          applicationId: app.id,
          relatedEntityType: 'application',
          relatedEntityId: app.id,
          subdivision: subdiv,
          statusBadge: 'SLA Breached',
          actionUrl: `/management/sla?application=${app.id}`,
          eventKey: mgmtEventKey
        });
      }
    }
  }

  return {
    newNotifications,
    allNotifications: [...newNotifications, ...existingNotifications],
    emittedEventKeys: seenEventKeys,
    evaluations: {
      complaints: complaintEvaluations,
      applications: applicationEvaluations
    }
  };
}

/**
 * Filters proactive SLA notifications for a given user role and subdivision scope.
 * Ensures unrelated staff in other subdivisions and consumers never receive unauthorized SLA notifications.
 */
export function filterProactiveSlaNotificationsForRole(
  notifications: AppNotification[],
  role: UserRole,
  options?: {
    subdivisionScope?: string | null;
    dismissedIds?: ReadonlySet<string>;
    readIds?: ReadonlySet<string>;
  }
): AppNotification[] {
  // Consumers and Field Engineers never receive internal SLA approaching/breach alerts
  if (role === 'consumer' || role === 'field') {
    return [];
  }

  const dismissed = options?.dismissedIds;
  const readSet = options?.readIds;
  const subdivScope = options?.subdivisionScope;

  return notifications
    .filter(n => {
      if (!n) return false;
      const isSlaNotif =
        n.notificationType === 'SLA_APPROACHING' ||
        n.notificationType === 'SLA_BREACHED' ||
        Boolean(n.eventKey && n.eventKey.startsWith('EVT-SLA-'));
      if (!isSlaNotif) return false;
      if (dismissed && dismissed.has(n.id)) return false;
      if (n.targetRole !== role) return false;

      if (role === 'employee' && subdivScope && subdivScope !== 'All' && n.subdivision) {
        if (!isEmployeeAuthorizedForSubdivision(subdivScope, n.subdivision)) {
          return false;
        }
      }
      return true;
    })
    .map(n => (readSet && readSet.has(n.id) ? { ...n, read: true } : n));
}

export interface SlaDashboardUiStrings {
  liveSlaMonitorTitle: string;
  liveSlaMonitorSubtitle: string;
  demoDerivedSlaBadge: string;
  colCaseRef: string;
  colRecordType: string;
  colSubdivision: string;
  colConfiguredSla: string;
  colDueTimestamp: string;
  colRiskStatus: string;
  colRemainingWindow: string;
  typeComplaint: string;
  typeApplication: string;
  kpiBreachedCountPattern: string;
  kpiApproachingCountPattern: string;
  drawerSlaStatusLabel: string;
}

export const SLA_DASHBOARD_UI_STRINGS: Record<LanguageCode, SlaDashboardUiStrings> = {
  en: {
    liveSlaMonitorTitle: 'Deterministic SLA Deadline & Risk Monitor (DEMO)',
    liveSlaMonitorSubtitle:
      'Rule-based SLA classification calculated from canonical submission timestamps and configured priority windows.',
    demoDerivedSlaBadge: 'DEMO-Derived Deterministic SLA Rules',
    colCaseRef: 'Case Reference',
    colRecordType: 'Record Type',
    colSubdivision: 'Sub-Division',
    colConfiguredSla: 'Configured Window',
    colDueTimestamp: 'Target Deadline (IST)',
    colRiskStatus: 'SLA Classification',
    colRemainingWindow: 'Remaining / Overdue',
    typeComplaint: 'Grievance Ticket',
    typeApplication: 'New Connection (15d DEMO Target)',
    kpiBreachedCountPattern: '{breached} Breached · {approaching} Approaching (<2h)',
    kpiApproachingCountPattern: '{approaching} Approaching Deadline (<2h)',
    drawerSlaStatusLabel: 'Deterministic SLA Risk Status'
  },
  gu: {
    liveSlaMonitorTitle: 'નિર્ણાયક SLA સમયમર્યાદા અને જોખમ મોનિટર (DEMO)',
    liveSlaMonitorSubtitle:
      'સત્તાવાર સબમિશન સમય અને નિર્ધારિત અગ્રતા સમયગાળા પર આધારિત નિયમ-આધારિત SLA વર્ગીકરણ.',
    demoDerivedSlaBadge: 'DEMO-આધારિત નિર્ણાયક SLA નિયમો',
    colCaseRef: 'કેસ સંદર્ભ',
    colRecordType: 'રેકોર્ડ પ્રકાર',
    colSubdivision: 'પેટા-વિભાગ',
    colConfiguredSla: 'નિર્ધારિત સમયગાળો',
    colDueTimestamp: 'લક્ષ્યાંક સમયમર્યાદા (IST)',
    colRiskStatus: 'SLA વર્ગીકરણ',
    colRemainingWindow: 'બાકી / સમયમર્યાદા વીતી',
    typeComplaint: 'ફરિયાદ ટિકિટ',
    typeApplication: 'નવું જોડાણ (૧૫-દિવસ DEMO લક્ષ્યાંક)',
    kpiBreachedCountPattern: '{breached} SLA ભંગ · {approaching} સમયમર્યાદા નજીક (<2h)',
    kpiApproachingCountPattern: '{approaching} સમયમર્યાદા નજીક (<2h)',
    drawerSlaStatusLabel: 'નિર્ણાયક SLA જોખમ સ્થિતિ'
  },
  hi: {
    liveSlaMonitorTitle: 'नियतात्मक SLA समय-सीमा एवं जोखिम मॉनिटर (DEMO)',
    liveSlaMonitorSubtitle:
      'आधिकारिक सबमिशन समय और निर्धारित प्राथमिकता अवधि पर आधारित नियम-आधारित SLA वर्गीकरण।',
    demoDerivedSlaBadge: 'DEMO-आधारित नियतात्मक SLA नियम',
    colCaseRef: 'केस संदर्भ',
    colRecordType: 'रिकॉर्ड प्रकार',
    colSubdivision: 'उप-मंडल',
    colConfiguredSla: 'निर्धारित अवधि',
    colDueTimestamp: 'लक्ष्य समय-सीमा (IST)',
    colRiskStatus: 'SLA वर्गीकरण',
    colRemainingWindow: 'शेष / समय-सीमा समाप्त',
    typeComplaint: 'शिकायत टिकट',
    typeApplication: 'नया कनेक्शन (१५-दिवसीय DEMO लक्ष्य)',
    kpiBreachedCountPattern: '{breached} SLA उल्लंघन · {approaching} समय-सीमा निकट (<2h)',
    kpiApproachingCountPattern: '{approaching} समय-सीमा निकट (<2h)',
    drawerSlaStatusLabel: 'नियतात्मक SLA जोखिम स्थिति'
  },
  mr: {
    liveSlaMonitorTitle: 'निश्चित SLA मुदत आणि जोखीम मॉनिटर (DEMO)',
    liveSlaMonitorSubtitle:
      'अधिकृत सादरीकरण वेळ आणि निर्धारित प्राधान्य कालावधीवर आधारित नियम-आधारित SLA वर्गीकरण.',
    demoDerivedSlaBadge: 'DEMO-आधारित निश्चित SLA नियम',
    colCaseRef: 'केस संदर्भ',
    colRecordType: 'नोंद प्रकार',
    colSubdivision: 'उपविभाग',
    colConfiguredSla: 'निर्धारित कालावधी',
    colDueTimestamp: 'उद्दिष्ट मुदत (IST)',
    colRiskStatus: 'SLA वर्गीकरण',
    colRemainingWindow: 'शिल्लक / मुदत उलटली',
    typeComplaint: 'तक्रार तिकीट',
    typeApplication: 'नवीन जोडणी (१५-दिवस DEMO उद्दिष्ट)',
    kpiBreachedCountPattern: '{breached} SLA भंग · {approaching} मुदत जवळ (<2h)',
    kpiApproachingCountPattern: '{approaching} मुदत जवळ (<2h)',
    drawerSlaStatusLabel: 'निश्चित SLA जोखीम स्थिती'
  }
};

export function getSlaDashboardUiStrings(lang: LanguageCode = 'en'): SlaDashboardUiStrings {
  return SLA_DASHBOARD_UI_STRINGS[lang] || SLA_DASHBOARD_UI_STRINGS.en;
}

