import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  X,
  CheckCheck,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import {
  fetchLiveNotifications,
  markAllLiveNotificationsRead,
  markLiveNotificationRead,
  useLivePoll,
  type LiveNotificationItem
} from '../../utils/liveData';

const mapLiveCategory = (n: LiveNotificationItem): 'Billing' | 'Outage' | 'Approval' | 'Inspection' | 'Security' => {
  const t = `${n.title} ${n.message}`.toLowerCase();
  if (t.includes('field')) return 'Inspection';
  if (t.includes('outage') || t.includes('power')) return 'Outage';
  if (t.includes('bill') || t.includes('payment')) return 'Billing';
  if (t.includes('security') || n.kind === 'alert') return 'Security';
  return 'Approval';
};

const mapLiveType = (kind: LiveNotificationItem['kind']): 'info' | 'alert' | 'success' | 'warning' =>
  kind === 'alert' ? 'alert' : kind;

export const NotificationDrawer: React.FC = () => {
  const {
    notifications,
    userNotifications,
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    markNotificationRead,
    markAllNotificationsRead,
    currentRole
  } = useApp();

  // Live alert-centre rows from the FastAPI backend (owner-scoped). Hidden when no backend session.
  const { data: liveInbox, refresh: refreshLive } = useLivePoll(fetchLiveNotifications);
  const [hiddenLiveIds, setHiddenLiveIds] = useState<Set<string>>(new Set());

  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'unread'>('all');

  if (!isNotificationDrawerOpen) return null;

  const baseNotifications = currentRole === 'consumer' ? userNotifications : notifications;
  const liveAsAppNotifications = (liveInbox?.items ?? [])
    .filter(n => !hiddenLiveIds.has(n.id))
    .map(n => ({
      id: `live-${n.id}`,
      title: n.title,
      message: n.message,
      time: new Date(n.created_at).toLocaleString(),
      targetRole: 'all' as const,
      type: mapLiveType(n.kind),
      read: n.read,
      category: mapLiveCategory(n),
      actionUrl: undefined
    }));
  // Live rows first (server truth), then the demo/session workspace rows
  const allNotifications = [...liveAsAppNotifications, ...baseNotifications];

  const filteredNotifications = allNotifications.filter(n => {
    if (activeFilter === 'mine') return n.targetRole === currentRole || n.targetRole === 'all';
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = allNotifications.filter(n => !n.read).length;

  // Route reads: `live-<id>` rows live on the backend; everything else is workspace state.
  const handleMarkRead = (compoundId: string) => {
    if (compoundId.startsWith('live-')) {
      const backendId = compoundId.slice('live-'.length);
      void markLiveNotificationRead(backendId).then(() => refreshLive());
    } else {
      markNotificationRead(compoundId);
    }
  };
  const handleMarkAllRead = () => {
    if (liveInbox && liveInbox.unread > 0) {
      void markAllLiveNotificationsRead().then(() => refreshLive());
    }
    markAllNotificationsRead();
  };

  const iconMap = {
    alert: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#101C35] border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Utility events, SLA warnings & operational notices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 p-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all</span>
              </button>
            )}
            <button
              onClick={() => setIsNotificationDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              aria-label="Close notification drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('mine')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeFilter === 'mine'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            My Role Only
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeFilter === 'unread'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No notifications in this filter.
            </div>
          ) : (
            filteredNotifications.map(item => (
              <div
                key={item.id}
                onClick={() => handleMarkRead(item.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  !item.read
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{iconMap[item.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-1.5">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {item.category}
                      </span>
                      <span>·</span>
                      <span className="capitalize">Role: {item.targetRole}</span>
                      {!item.read && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">Unread</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-[#0D1527] border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
          Simulated push notifications via UGVCL Unified Messaging Service
        </div>
      </div>
    </div>
  );
};
