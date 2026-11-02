import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  CloudOff,
  Radio,
  RefreshCw,
  ShieldCheck,
  Truck,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { LanguageCode } from '../../i18n/types';
import {
  OUTAGE_MAP_TRANSLATIONS,
  formatTimelineEventDescription,
} from '../../i18n/outageMapTranslations';
import type {
  OperationsTimelineEvent,
  TimelineEventType,
  TransportConnectionState,
} from '../../outageMap/types';

export interface OperationsTimelinePanelProps {
  events: OperationsTimelineEvent[];
  selectedOutageId: string | null;
  focusedOutageId: string | null;
  onSelectOutageFromEvent: (outageId: string) => void;
  onClearFocus: () => void;
  transportState: TransportConnectionState;
  language: LanguageCode;
  isConsumerView?: boolean;
}

function getEventIcon(type: TimelineEventType) {
  switch (type) {
    case 'COMPLAINT_SUBMITTED':
    case 'INCIDENT_CREATED':
      return AlertCircle;
    case 'INCIDENT_CLASSIFIED':
    case 'OUTAGE_CONFIRMED':
      return ShieldCheck;
    case 'EMPLOYEE_ASSIGNMENT':
    case 'EMPLOYEE_ESCALATION':
    case 'ENGINEER_ACCEPTED_ASSIGNMENT':
    case 'ENGINEER_EN_ROUTE':
      return Truck;
    case 'REPAIR_STARTED':
    case 'ENGINEER_UPDATE_RECEIVED':
      return Wrench;
    case 'OFFLINE_UPDATE_SYNCHRONIZED':
      return RefreshCw;
    case 'RESTORATION_REPORTED':
    case 'RESTORATION_CONFIRMED':
    case 'INCIDENT_CLOSED':
      return CheckCircle2;
    default:
      return Activity;
  }
}

function getTransportBadgeStyle(state: TransportConnectionState): string {
  switch (state) {
    case 'LIVE_CONNECTED':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';
    case 'RECONNECTING':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-700';
    case 'OFFLINE':
      return 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border-rose-300 dark:border-rose-700';
    default:
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200 border-sky-300 dark:border-sky-700';
  }
}

export const OperationsTimelinePanel: React.FC<OperationsTimelinePanelProps> = ({
  events,
  selectedOutageId,
  focusedOutageId,
  onSelectOutageFromEvent,
  onClearFocus,
  transportState,
  language,
  isConsumerView = false,
}) => {
  const t = OUTAGE_MAP_TRANSLATIONS[language] || OUTAGE_MAP_TRANSLATIONS.en;

  return (
    <section
      aria-label={t.timelineHeading}
      data-testid="operations-timeline-panel"
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex flex-col"
    >
      {/* Header + Honest Transport State Indicator */}
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
            <span>{t.timelineHeading}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.timelineSubheading}
          </p>
        </div>

        <span
          data-testid="timeline-transport-badge"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getTransportBadgeStyle(
            transportState,
          )}`}
        >
          {transportState === 'OFFLINE' ? (
            <CloudOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{t.transportStates[transportState]}</span>
        </span>
      </div>

      {/* Focused Outage Filter Pill */}
      {focusedOutageId && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-800 text-xs">
          <span className="font-medium text-sky-900 dark:text-sky-200">
            {t.timelineFocusedPrefix}{' '}
            <strong className="font-mono">{focusedOutageId}</strong>
          </span>
          <button
            type="button"
            data-testid="clear-timeline-focus-btn"
            onClick={onClearFocus}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-slate-700 font-medium"
          >
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.btnClearTimelineFocus}</span>
          </button>
        </div>
      )}

      {/* Chronological Event Feed */}
      {events.length === 0 ? (
        <div
          data-testid="timeline-empty-state"
          className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400"
        >
          {t.emptyTimelineTitle}
        </div>
      ) : (
        <ol
          data-testid="operations-timeline-list"
          className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto"
        >
          {events.map((ev) => {
            const Icon = getEventIcon(ev.type);
            const isHighlighted = selectedOutageId === ev.outageId;
            const localizedDescription = formatTimelineEventDescription(ev, language);

            return (
              <li key={ev.correlationId || ev.id} className="p-0">
                <button
                  type="button"
                  data-testid={`timeline-event-${ev.correlationId || ev.id}`}
                  aria-pressed={isHighlighted}
                  onClick={() => onSelectOutageFromEvent(ev.outageId)}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                    isHighlighted
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-l-4 border-sky-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {localizedDescription}
                      </span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {ev.complaintId || ev.incidentId}
                      </span>
                    </div>

                    {!isConsumerView && ev.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {ev.note}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>
                          {t.timelineOccurredPrefix} {ev.occurredAt}
                        </span>
                      </span>

                      {ev.receivedAt && (
                        <span
                          data-testid={`timeline-synced-ts-${ev.correlationId || ev.id}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 font-medium"
                        >
                          <RefreshCw className="w-3 h-3" aria-hidden="true" />
                          <span>
                            {t.timelineSyncedPrefix} {ev.receivedAt}
                          </span>
                        </span>
                      )}

                      <span>· {ev.actorDisplayName}</span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
