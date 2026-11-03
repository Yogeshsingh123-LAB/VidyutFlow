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
  Zap,
} from 'lucide-react';
import { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../../types';
import { Language } from '../../i18n/types';
import {
  PaymentCalendarEvent,
  CALENDAR_LOCALIZATION,
  derivePaymentCalendarEvents,
  buildMonthCalendarGrid,
  computeCalendarSummary,
  buildGoogleCalendarUrl,
  triggerIcsDownload,
} from '../../utils/paymentCalendarEngine';
import { localizeBillStatus } from '../../i18n/consumerContentTranslations';

interface SmartPaymentCalendarProps {
  bills: ElectricityBill[];
  connections: ElectricityConnection[];
  payments: PaymentTransaction[];
  language: Language;
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
  selectedConnectionNo,
  onSelectConnection,
  onViewBill,
  onPayBill,
}) => {
  const loc = CALENDAR_LOCALIZATION[language] || CALENDAR_LOCALIZATION.en;

  // Active view month & year (default to October 2026 based on canonical billing records)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 15)); // Oct 2026
  const [connectionFilter, setConnectionFilter] = useState<string>(
    selectedConnectionNo || 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');
  const [selectedDateIso, setSelectedDateIso] = useState<string>('2026-10-22');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Update connection filter when selectedConnectionNo prop changes
  React.useEffect(() => {
    if (selectedConnectionNo) {
      setConnectionFilter(selectedConnectionNo);
    }
  }, [selectedConnectionNo]);

  // Derive all calendar events from canonical bills & payments
  const allEvents = useMemo(() => {
    return derivePaymentCalendarEvents(bills, connections, payments);
  }, [bills, connections, payments]);

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
    return computeCalendarSummary(filteredEvents);
  }, [filteredEvents]);

  // Build month grid for current month/year
  const monthGrid = useMemo(() => {
    return buildMonthCalendarGrid(currentYear, currentMonth, filteredEvents);
  }, [currentYear, currentMonth, filteredEvents]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((evt) => evt.dueDateIso === selectedDateIso);
  }, [filteredEvents, selectedDateIso]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    setSelectedDateIso(iso);
  };

  const monthLabel = `${loc.monthsFull[currentMonth]} ${currentYear}`;

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
                {loc.calendarSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Metric Summary Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60">
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
              {loc.nextDueCardLabel}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-blue-900 dark:text-blue-100 font-mono mt-0.5 block">
              {summary.nextUpcomingDueDate || '—'}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">
              {loc.totalOutstandingCardLabel}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-100 font-mono mt-0.5 block">
              ₹{summary.totalDueAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
              {loc.paidBillsCardLabel}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-100 font-mono mt-0.5 block">
              {summary.paidBillsCount} / {summary.totalBillsCount}
            </span>
          </div>
        </div>
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
        {/* Weekday Column Headers */}
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

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {monthGrid.map((day) => {
            const isSelected = day.dateIso === selectedDateIso;
            const hasEvents = day.events.length > 0;

            return (
              <button
                key={day.dateIso}
                type="button"
                onClick={() => setSelectedDateIso(day.dateIso)}
                data-testid={`calendar-day-cell-${day.dateIso}`}
                className={`min-h-[92px] sm:min-h-[110px] p-2 text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                  day.isCurrentMonth
                    ? 'bg-white dark:bg-[#101C35]'
                    : 'bg-slate-50/50 dark:bg-slate-900/30 opacity-40'
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-600 dark:ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20 z-10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Day Number and Today Indicator */}
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

                  {day.hasDueBills && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>

                {/* Event Pills inside Day Cell */}
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
                      title={`${evt.billNo} · ₹${evt.outstandingBalance.toLocaleString('en-IN')}`}
                    >
                      {evt.isFullyPaid ? '✓' : '•'} ₹
                      {(evt.isDue ? evt.outstandingBalance : evt.totalAmount).toLocaleString(
                        'en-IN'
                      )}
                    </div>
                  ))}
                  {day.events.length > 2 && (
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold block px-1">
                      +{day.events.length - 2} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Bill Details Panel */}
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
          <div className="space-y-3">
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
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        {evt.consumerName} ({evt.consumerNo}) · {evt.billMonth}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {evt.isDue ? loc.dueLabel : loc.paidLabel}
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                        ₹
                        {(evt.isDue
                          ? evt.outstandingBalance
                          : evt.totalAmount
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

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

                    {evt.isDue && onPayBill && (
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
                      href={buildGoogleCalendarUrl(evt)}
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
                      onClick={() => triggerIcsDownload(evt)}
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
