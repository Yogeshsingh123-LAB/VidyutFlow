import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../../types';
import { Language } from '../../i18n/types';
import {
  PaymentCalendarEvent,
  CALENDAR_LOCALIZATION,
  derivePaymentCalendarEvents,
  buildMonthCalendarGrid,
  computeCalendarSummary,
  sortCalendarObligationsByPriority,
  buildGoogleCalendarUrl,
  triggerIcsDownload,
  parseDateToYearMonthDay,
} from '../../utils/paymentCalendarEngine';
import {
  FormalNoticeRecord,
  getFormalNoticeTranslations,
  INITIAL_FORMAL_NOTICES,
} from '../../utils/formalNoticeEngine';
import {
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from '../../utils/lateChargeEngine';
import { localizeBillStatus } from '../../i18n/consumerContentTranslations';

interface SmartPaymentCalendarProps {
  bills: ElectricityBill[];
  connections: ElectricityConnection[];
  payments: PaymentTransaction[];
  language: Language;
  referenceDate?: string;
  formalNotices?: FormalNoticeRecord[];
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  selectedConnectionNo?: string | null;
  onSelectConnection?: (consumerNo: string) => void;
  onViewBill?: (bill: ElectricityBill) => void;
  onPayBill?: (billNo: string) => void;
}

export const SmartPaymentCalendar: React.FC<SmartPaymentCalendarProps> = ({
  bills,
  connections,
  payments,
  language,
  referenceDate = '28-Oct-2026',
  formalNotices = INITIAL_FORMAL_NOTICES,
  waivers = [],
  reversals = [],
  selectedConnectionNo,
  onSelectConnection,
  onViewBill,
  onPayBill,
}) => {
  const loc = CALENDAR_LOCALIZATION[language] || CALENDAR_LOCALIZATION.en;
  const fnT = getFormalNoticeTranslations(language);

  const parsedRefDate = useMemo(
    () => parseDateToYearMonthDay(referenceDate),
    [referenceDate]
  );
  const referenceIsoDate = parsedRefDate?.isoDate || '2026-10-28';

  // Active view month & year (default to October 2026 based on canonical billing records so overdue due dates are immediately visible)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 15)); // Oct 2026
  const [connectionFilter, setConnectionFilter] = useState<string>(
    selectedConnectionNo || 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');
  const [selectedDateIso, setSelectedDateIso] = useState<string>('2026-10-22');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  React.useEffect(() => {
    if (selectedConnectionNo) {
      setConnectionFilter(selectedConnectionNo);
    }
  }, [selectedConnectionNo]);

  // Derive all calendar events from canonical bills, payments, referenceDate, and formalNotices
  const allEvents = useMemo(() => {
    return derivePaymentCalendarEvents({
      bills,
      connections,
      payments,
      referenceDate,
      formalNotices,
      waivers,
      reversals,
    });
  }, [bills, connections, payments, referenceDate, formalNotices, waivers, reversals]);

  // Filter events according to connection and status filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      if (connectionFilter !== 'ALL' && evt.consumerNo !== connectionFilter) {
        return false;
      }
      if (statusFilter === 'DUE' && !evt.isDue) {
        return false;
      }
      if (statusFilter === 'PAID' && !evt.isFullyPaid) {
        return false;
      }
      return true;
    });
  }, [allEvents, connectionFilter, statusFilter]);

  // Calendar summary metrics
  const summary = useMemo(() => {
    return computeCalendarSummary(filteredEvents, {
      referenceDate,
      todayIso: referenceIsoDate,
    });
  }, [filteredEvents, referenceDate, referenceIsoDate]);

  // Prioritized unsettled obligations list (1. Overdue -> 2. Due Today -> 3. Upcoming Unpaid)
  const prioritizedObligations = useMemo(() => {
    return sortCalendarObligationsByPriority(filteredEvents, referenceIsoDate);
  }, [filteredEvents, referenceIsoDate]);

  // Build month grid for current month/year using active referenceDate ISO
  const monthGrid = useMemo(() => {
    return buildMonthCalendarGrid(
      currentYear,
      currentMonth,
      filteredEvents,
      referenceIsoDate
    );
  }, [currentYear, currentMonth, filteredEvents, referenceIsoDate]);

  // Selected date events (including due date OR formal notice issue/deadline date)
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(
      (evt) =>
        evt.dueDateIso === selectedDateIso ||
        evt.formalNoticeIssueDateIso === selectedDateIso ||
        evt.formalNoticePaymentDeadlineIso === selectedDateIso
    );
  }, [filteredEvents, selectedDateIso]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    if (parsedRefDate) {
      setCurrentDate(new Date(parsedRefDate.year, parsedRefDate.month, 1));
      setSelectedDateIso(parsedRefDate.isoDate);
    } else {
      setCurrentDate(new Date(2026, 9, 1));
      setSelectedDateIso('2026-10-22');
    }
  };

  const monthLabel = `${loc.monthsFull[currentMonth]} ${currentYear}`;
  const formatInr = (val: number) =>
    `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div
      className="space-y-6"
      data-testid="smart-payment-calendar"
      role="region"
      aria-label={loc.calendarTitle}
    >
      {/* Calendar Header & KPI Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {loc.calendarTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {loc.calendarSubtitle} · Ref: {referenceDate} · Scope:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300" data-testid="calendar-active-scope-label">
                  {connectionFilter === 'ALL'
                    ? loc.allConnectionsLabel
                    : `${connections.find(c => c.consumerNo === connectionFilter)?.consumerName || connectionFilter} (${connectionFilter})`}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 4 Metric Summary Badges (including Late Charges & Formal Notice Milestone) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
              {loc.nextDueCardLabel}
            </span>
            <span
              data-testid="calendar-summary-next-due-date"
              className="text-xs sm:text-sm font-extrabold text-blue-900 dark:text-blue-100 font-mono mt-0.5 block"
            >
              {summary.nextUpcomingDueDate || loc.noUpcomingDueDateLabel}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60">
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-300 block">
              {loc.totalOutstandingCardLabel}
            </span>
            <span
              data-testid="calendar-summary-total-outstanding"
              className="text-xs sm:text-sm font-extrabold text-rose-900 dark:text-rose-100 font-mono mt-0.5 block"
            >
              {formatInr(summary.totalDueAmountWithCharges)}
            </span>
            {summary.totalLateChargesAmount > 0 && (
              <span className="text-[10px] text-rose-600 dark:text-rose-300 font-mono block">
                (incl. +{formatInr(summary.totalLateChargesAmount)} DPS)
              </span>
            )}
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">
              {fnT.noticeIdLabel}
            </span>
            <span
              data-testid="calendar-summary-active-notices"
              className="text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-100 font-mono mt-0.5 block"
            >
              {summary.activeFormalNoticesCount} Active
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
              {loc.paidBillsCardLabel}
            </span>
            <span
              data-testid="calendar-summary-settled-this-month"
              className="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-100 font-mono mt-0.5 block"
            >
              {summary.settledBillsThisMonthCount ?? 0} / {summary.paidBillsCount}
            </span>
            <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-sans block">
              ({summary.paidBillsCount} total settled of {summary.totalBillsCount})
            </span>
          </div>
        </div>
      </div>

      {/* Distinguished Milestones Legend (A–E) */}
      <div
        data-testid="calendar-milestone-legend"
        className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c162c] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px]"
      >
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {language === 'gu'
            ? 'કેલેન્ડર સીમાચિહ્નો (Milestones A–E):'
            : language === 'hi'
            ? 'कैलेंडर चरण (Milestones A–E):'
            : language === 'mr'
            ? 'कॅलेंडर टप्पे (Milestones A–E):'
            : 'Calendar Milestones (A–E):'}
        </span>
        <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium">
          {fnT.milestones.ORIGINAL_BILL_DUE_DATE}
        </span>
        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-medium">
          {fnT.milestones.LATE_CHARGE_ACCRUAL_DATE}
        </span>
        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-medium">
          {fnT.milestones.FORMAL_NOTICE_ISSUE_DATE}
        </span>
        <span className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-medium">
          {fnT.milestones.FORMAL_NOTICE_PAYMENT_DEADLINE}
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
          {fnT.milestones.AUTHORIZED_DISCONNECTION_REVIEW}
        </span>
      </div>

      {/* Control Bar: Filters & Month Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#0c162c] border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Connection Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <label
              htmlFor="calendar-connection-filter"
              className="text-slate-600 dark:text-slate-400 font-semibold"
            >
              {loc.filterByConnectionLabel}:
            </label>
            <select
              id="calendar-connection-filter"
              value={connectionFilter}
              onChange={(e) => {
                const val = e.target.value;
                setConnectionFilter(val);
                if (val !== 'ALL' && onSelectConnection) {
                  onSelectConnection(val);
                }
              }}
              data-testid="calendar-connection-filter"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{loc.allConnectionsLabel}</option>
              {connections.map((c) => (
                <option key={c.consumerNo} value={c.consumerNo}>
                  {c.consumerNo} — {c.consumerName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <label
              htmlFor="calendar-status-filter"
              className="text-slate-600 dark:text-slate-400 font-semibold"
            >
              {loc.filterStatusLabel}:
            </label>
            <select
              id="calendar-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              data-testid="calendar-status-filter"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">{loc.statusAll}</option>
              <option value="DUE">{loc.statusDueOnly}</option>
              <option value="PAID">{loc.statusPaidOnly}</option>
            </select>
          </div>
        </div>

        {/* Month Stepper & Today Shortcut */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={handleToday}
            data-testid="calendar-today-btn"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {loc.todayBtn}
          </button>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={loc.prevMonthAria}
              data-testid="calendar-prev-month-btn"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono min-w-[120px] text-center"
              data-testid="calendar-current-month-heading"
            >
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={loc.nextMonthAria}
              data-testid="calendar-next-month-btn"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-center">
          {loc.weekdaysShort.map((day, idx) => (
            <div
              key={idx}
              className="py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {monthGrid.map((day) => {
            const isSelected = day.dateIso === selectedDateIso;
            const noticeList = day.noticeEvents || [];

            return (
              <button
                key={day.dateIso}
                type="button"
                onClick={() => setSelectedDateIso(day.dateIso)}
                data-testid={`calendar-day-cell-${day.dateIso}`}
                className={`min-h-[96px] sm:min-h-[114px] p-2 text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-[#101C35]'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 opacity-40'
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-600 dark:ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20 z-10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold font-mono rounded-full w-6 h-6 ${
                      day.isToday
                        ? 'bg-blue-600 text-white'
                        : isSelected
                        ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  <div className="flex items-center gap-1">
                    {day.hasFormalNoticeMilestone && (
                      <span
                        title="Formal Notice Milestone"
                        className="w-2 h-2 rounded-full bg-purple-600"
                      />
                    )}
                    {day.hasDueBills && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Event & Notice Milestone Badges inside Day Cell */}
                <div className="space-y-1 mt-1">
                  {day.events.slice(0, 2).map((evt) => (
                    <div
                      key={evt.id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono truncate border ${
                        evt.isFullyPaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : evt.isOverdue
                          ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      }`}
                      title={`${evt.billNo} · ${formatInr(
                        evt.isDue ? evt.totalOutstandingWithCharges : evt.totalAmount
                      )}`}
                    >
                      {evt.isFullyPaid ? '✓' : '•'}{' '}
                      {formatInr(evt.isDue ? evt.totalOutstandingWithCharges : evt.totalAmount)}
                    </div>
                  ))}
                  {noticeList
                    .filter((ne) => !day.events.some((de) => de.billNo === ne.billNo))
                    .slice(0, 1)
                    .map((ne) => (
                      <div
                        key={`ntc-${ne.id}-${day.dateIso}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono truncate border bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                        title={`${ne.formalNoticeId}`}
                      >
                        §56 {ne.formalNoticeId}
                      </div>
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prioritized Outstanding Obligations List (Part C: 1. Overdue -> 2. Due Today -> 3. Upcoming Unpaid) */}
      <div
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
        data-testid="calendar-prioritized-obligations-list"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>{loc.prioritizedObligationsTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {loc.prioritizedObligationsSubtitle}
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 self-start sm:self-auto">
            {prioritizedObligations.length} Unsettled · {formatInr(summary.totalDueAmountWithCharges)}
          </span>
        </div>

        {prioritizedObligations.length > 0 ? (
          <div className="space-y-2.5">
            {prioritizedObligations.map((ob, idx) => {
              const matchingBill = bills.find((b) => b.billNo === ob.billNo);
              const isOverdueOb = ob.isOverdue || ob.dueDateIso < referenceIsoDate || (ob.daysOverdue ?? 0) > 0;
              const isDueTodayOb = !isOverdueOb && ob.dueDateIso === referenceIsoDate;
              const urgencyLabel = isOverdueOb
                ? `OVERDUE — ${ob.daysOverdue} ${ob.daysOverdue === 1 ? 'day' : 'days'} overdue`
                : isDueTodayOb
                ? 'DUE TODAY — Payment due today'
                : `UNPAID — Due in ${Math.max(1, ob.daysUntilDue ?? 1)} ${(ob.daysUntilDue ?? 1) === 1 ? 'day' : 'days'}`;

              return (
                <div
                  key={`prio-${ob.id}`}
                  data-testid={`calendar-prioritized-item-${ob.billNo}`}
                  data-priority-index={idx}
                  className={`p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    isOverdueOb
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : isDueTodayOb
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                      : 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold font-mono bg-slate-900 text-white dark:bg-slate-700">
                        #{idx + 1}
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {ob.billNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isOverdueOb
                            ? 'bg-rose-600 text-white'
                            : isDueTodayOb
                            ? 'bg-amber-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {urgencyLabel}
                      </span>
                      {ob.isPartiallyPaid && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                          PARTIALLY PAID — {formatInr(ob.totalOutstandingWithCharges)} remaining
                        </span>
                      )}
                      {ob.formalNoticeId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          §56 Notice: {ob.formalNoticeId} (Deadline: {ob.formalNoticePaymentDeadline || 'N/A'})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {ob.consumerName} (<span className="font-mono">{ob.consumerNo}</span>) · Period: {ob.billMonth} · Due Date: <span className="font-mono font-semibold">{ob.dueDate}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Original: {formatInr(ob.totalAmount)}</span>
                      <span>Remaining Principal: {formatInr(ob.remainingPrincipal)}</span>
                      <span>Accrued DPS: +{formatInr(ob.accruedLateCharges)}</span>
                      <span className="font-bold text-rose-700 dark:text-rose-300">
                        Current Total Outstanding: {formatInr(ob.totalOutstandingWithCharges)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateIso(ob.dueDateIso);
                        setCurrentDate(new Date(ob.dueYear, ob.dueMonth, 1));
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Focus Date
                    </button>
                    {matchingBill && onViewBill && (
                      <button
                        type="button"
                        onClick={() => onViewBill(matchingBill)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{loc.viewBillBtn}</span>
                      </button>
                    )}
                    {onPayBill && (
                      <button
                        type="button"
                        onClick={() => onPayBill(ob.billNo)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{loc.payNowBtn}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {loc.noOutstandingObligationsMessage}
          </div>
        )}
      </div>

      {/* Selected Date Bill Details & 9-Field Breakdown Panel */}
      <div
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
        data-testid="calendar-selected-date-panel"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              {loc.selectedDateDetailsTitle}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
              {selectedDateIso}
            </h3>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
            {loc.billsDueCountBadge(selectedDateEvents.length)}
          </span>
        </div>

        {selectedDateEvents.length > 0 ? (
          <div className="space-y-4">
            {selectedDateEvents.map((evt) => {
              const matchingBill = bills.find((b) => b.billNo === evt.billNo);

              return (
                <div
                  key={evt.id}
                  data-testid={`calendar-event-card-${evt.billNo}`}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {evt.billNo}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            evt.isFullyPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : evt.isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {localizeBillStatus(evt.status, language)}
                        </span>
                        {!evt.isFullyPaid && evt.isOverdue && evt.daysOverdue > 0 && (
                          <span
                            data-testid={`calendar-overdue-badge-${evt.billNo}`}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white"
                          >
                            {evt.daysOverdue}d Overdue (₹{evt.dailyLateChargeAccrual.toFixed(3)}/day DPS)
                          </span>
                        )}
                        {evt.isFullyPaid && (
                          <span
                            data-testid={`calendar-paid-badge-${evt.billNo}`}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            ₹0.00 Outstanding
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        {evt.consumerName} ({evt.consumerNo}) · {evt.billMonth}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {evt.isDue ? fnT.nineFields.totalCurrentOutstanding : loc.paidLabel}
                      </span>
                      <span
                        data-testid={`calendar-event-total-${evt.billNo}`}
                        className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono"
                      >
                        {formatInr(
                          evt.isDue ? evt.totalOutstandingWithCharges : evt.totalAmount
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Canonical 9-Field Financial Summary inside Calendar Event */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">1. {fnT.nineFields.originalBillAmount}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatInr(evt.totalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">2. {fnT.nineFields.paymentsSuccessfullySettled}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatInr(evt.paidAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">3. {fnT.nineFields.remainingPrincipal}</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                        {formatInr(evt.remainingPrincipal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">4. {fnT.nineFields.accruedLatePaymentCharges}</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        +{formatInr(evt.accruedLateCharges)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">5. {fnT.nineFields.chargesAlreadyPaidOrWaived}</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatInr(evt.waivedOrSettledCharges)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">6. {fnT.nineFields.totalCurrentOutstanding}</span>
                      <span className="font-mono font-extrabold text-rose-700 dark:text-rose-300">
                        {formatInr(evt.totalOutstandingWithCharges)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">7. {fnT.nineFields.originalDueDate}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {evt.dueDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">8. {fnT.nineFields.daysOverdue}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {evt.daysOverdue}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">9. {fnT.nineFields.lastCalculationDate}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {evt.calculationReferenceDate}
                      </span>
                    </div>
                  </div>

                  {/* Formal Notice Milestone Strip if applicable */}
                  {evt.formalNoticeId && (
                    <div
                      data-testid={`calendar-notice-strip-${evt.formalNoticeId}`}
                      className="p-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Scale className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                        <span>
                          <strong>{evt.formalNoticeId}</strong> · Issued:{' '}
                          <span className="font-mono">{evt.formalNoticeIssueDate || 'N/A'}</span> ·
                          15-Day Deadline:{' '}
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                            {evt.formalNoticePaymentDeadline || 'N/A'}
                          </span>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                        {evt.formalNoticeStatus
                          ? fnT.statuses[evt.formalNoticeStatus]
                          : 'Notice Active'}
                        {evt.formalNoticeDaysRemaining !== null &&
                          evt.formalNoticeDaysRemaining !== undefined &&
                          ` (${fnT.daysRemainingLabel(evt.formalNoticeDaysRemaining)})`}
                      </span>
                    </div>
                  )}

                  {/* Actions for this Event */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    {matchingBill && onViewBill && (
                      <button
                        type="button"
                        onClick={() => onViewBill(matchingBill)}
                        data-testid={`calendar-view-bill-${evt.billNo}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{loc.viewBillBtn}</span>
                      </button>
                    )}

                    {!evt.isFullyPaid && evt.isDue && evt.totalOutstandingWithCharges > 0 && onPayBill && (
                      <button
                        type="button"
                        onClick={() => onPayBill(evt.billNo)}
                        data-testid={`calendar-pay-now-${evt.billNo}`}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{loc.payNowBtn}</span>
                      </button>
                    )}

                    <a
                      href={buildGoogleCalendarUrl(evt, language)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`calendar-add-gcal-${evt.billNo}`}
                      className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{loc.addToGoogleCalendarBtn}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => triggerIcsDownload(evt, language)}
                      data-testid={`calendar-download-ics-${evt.billNo}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{loc.downloadIcsBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
            {loc.noBillsOnDate}
          </div>
        )}

        <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          {loc.demoCalendarNotice}
        </div>
      </div>
    </div>
  );
};
