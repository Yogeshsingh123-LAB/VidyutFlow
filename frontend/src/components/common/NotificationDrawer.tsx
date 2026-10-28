import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchLiveNotifications,
  markAllLiveNotificationsRead,
  markLiveNotificationRead,
  useLivePoll,
  type LiveNotificationItem
} from '../../utils/liveData';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSopAction,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentAuditStage,
  localizeAuditTrailNote,
  localizeIncidentNotification
} from '../../i18n/incidentLocalization';
import {
  localizeConsumerNotification,
  localizeNotificationDateGroupHeader,
  localizeNotificationStatusBadge,
  localizeSubdivision
} from '../../i18n/consumerContentTranslations';
import { localizeFieldEngineerStatus } from '../../i18n/employeeContentTranslations';
import { UserRole, IncidentSeverity, AppNotification } from '../../types';
import {
  formatErpDateTime,
  groupNotificationsByDate,
  parseDateSafe,
  parseNotificationStoredDate
} from '../../utils/dateUtils';
import { LanguageSelector } from './LanguageSelector';
import {
  Bell,
  X,
  CheckCheck,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Sparkles,
  History,
  Check,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  Calendar,
  ShieldAlert
} from 'lucide-react';

export const NotificationDrawer: React.FC = () => {
  const { data: liveInbox, refresh: refreshLive } = useLivePoll(fetchLiveNotifications);
  const {
    scopedNotifications,
    employeeNotifications,
    userNotifications,
    applications,
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    markNotificationRead,
    markSelectedNotificationsRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteSelectedNotifications,
    clearAllNotifications,
    openCaseDrawer,
    openIncidentModal,
    setActiveTab,
    currentRole,
    roleIncidents,
    acknowledgeIncident,
    assignIncidentToField,
    escalateIncident,
    resolveIncident,
    triggerDemoSimulatedIncident,
    audioAlertsEnabled,
    toggleAudio,
    unreadIncidentsCount,
    criticalIncidentsCount,
    fieldEngineers,
    demoSession
  } = useApp();
  const { language, t } = useLanguage();

  const effectiveRole = demoSession ? demoSession.role : currentRole;
  const isConsumerSession = effectiveRole === 'consumer' || currentRole === 'consumer';
  const isEmployeeSession = effectiveRole === 'employee';

  const [activeMainTab, setActiveMainTab] = useState<'incidents' | 'notifications'>(() =>
    isConsumerSession || isEmployeeSession ? 'notifications' : 'incidents'
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState<'all' | IncidentSeverity>('all');
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  // Escalate modal inline state
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [escalateTargetRole, setEscalateTargetRole] = useState<UserRole>('management');
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>(
    () => fieldEngineers[0]?.id || 'FLD-UG-201'
  );
  const [selectedManagerId, setSelectedManagerId] = useState<string>('usr_mgmt_01');
  const [escalateReason, setEscalateReason] = useState<string>('');

  // Resolve modal inline state
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState<string>('');

  useEffect(() => {
    if (isConsumerSession || isEmployeeSession) {
      setActiveMainTab('notifications');
    }
  }, [effectiveRole, isConsumerSession, isEmployeeSession]);

  useEffect(() => {
    if (isConsumerSession && activeMainTab !== 'notifications') {
      setActiveMainTab('notifications');
    }
  }, [isConsumerSession, activeMainTab]);

  useEffect(() => {
    if (!isNotificationDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationDrawerOpen, setIsNotificationDrawerOpen]);

  const baseNotifications = useMemo(() => {
    if (isConsumerSession) return userNotifications;
    if (isEmployeeSession) return employeeNotifications;
    return scopedNotifications;
  }, [isConsumerSession, isEmployeeSession, userNotifications, employeeNotifications, scopedNotifications]);

  const resolveApplicationDetails = (item: AppNotification) => {
    const appId = item.applicationId || `${item.title} ${item.message}`.match(/APP-\d{4}-\d+/)?.[0];
    const linkedApp = appId ? applications.find(a => a.id === appId) : undefined;
    const effectiveStatus = item.applicationStatus || linkedApp?.status;
    return { appId, linkedApp, effectiveStatus };
  };

  const filteredNotifications = useMemo(() => {
    return baseNotifications.filter(n => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'pending') {
        const { effectiveStatus } = resolveApplicationDetails(n);
        return (
          effectiveStatus === 'Submitted' ||
          effectiveStatus === 'Document Verification' ||
          effectiveStatus === 'Site Inspection' ||
          effectiveStatus === 'Sanction Approval' ||
          effectiveStatus === 'Clarification Requested' ||
          n.notificationType === 'ASSIGNMENT_DECLINED' ||
          n.decisionAction === 'Assignment Declined' ||
          n.type === 'warning' ||
          n.type === 'info'
        );
      }
      if (activeFilter === 'approved') {
        const { effectiveStatus } = resolveApplicationDetails(n);
        return effectiveStatus === 'Meter Installed' || n.eventType === 'APPLICATION_APPROVED' || n.type === 'success';
      }
      if (activeFilter === 'rejected') {
        const { effectiveStatus } = resolveApplicationDetails(n);
        return (
          effectiveStatus === 'Rejected' ||
          n.eventType === 'APPLICATION_REJECTED' ||
          n.notificationType === 'ASSIGNMENT_DECLINED' ||
          n.decisionAction === 'Assignment Declined' ||
          n.type === 'alert'
        );
      }
      return true;
    });
  }, [baseNotifications, activeFilter, applications]);

  const groupedNotifications = useMemo(() => {
    return groupNotificationsByDate(filteredNotifications);
  }, [filteredNotifications]);

  // Keep selectedIds synced with currently existing notifications
  useEffect(() => {
    const visibleIdSet = new Set(baseNotifications.map(n => n.id));
    setSelectedIds(prev => prev.filter(id => visibleIdSet.has(id)));
  }, [baseNotifications]);


  const handleMarkReadCompound = (id: string) => {
    if (id.startsWith('live-')) {
      const backendId = id.slice('live-'.length);
      void markLiveNotificationRead(backendId).then(() => refreshLive());
    } else {
      markNotificationRead(id);
    }
  };

  const handleMarkAllReadCompound = () => {
    if (liveInbox && liveInbox.unread > 0) {
      void markAllLiveNotificationsRead().then(() => refreshLive());
    }
    markAllNotificationsRead();
  };

  if (!isNotificationDrawerOpen) return null;

  const unreadNotifCount = baseNotifications.filter(n => !n.read).length;
  const visibleIds = filteredNotifications.map(n => n.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const toggleSelectNotification = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleMarkSelectedRead = () => {
    if (selectedIds.length === 0) return;
    markSelectedNotificationsRead(selectedIds);
    setSelectedIds([]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    deleteSelectedNotifications(selectedIds);
    setSelectedIds([]);
  };

  const handleOpenApplicationFromNotification = (item: AppNotification, appId: string) => {
    markNotificationRead(item.id);
    if (isEmployeeSession) {
      setActiveTab('applications');
    } else if (isConsumerSession) {
      setActiveTab('requests');
    }
    openCaseDrawer('application', appId);
    setIsNotificationDrawerOpen(false);
  };

  const handleOpenComplaintFromNotification = (item: AppNotification, cmpId: string) => {
    markNotificationRead(item.id);
    if (isEmployeeSession || isConsumerSession) {
      setActiveTab('complaints');
    }
    openCaseDrawer('complaint', cmpId);
    setIsNotificationDrawerOpen(false);
  };

  const handleOpenWorkOrderFromNotification = (item: AppNotification, woId: string) => {
    if (isConsumerSession) return;
    markNotificationRead(item.id);
    if (effectiveRole === 'field') {
      setActiveTab('workorders');
    }
    openCaseDrawer('workorder', woId);
    setIsNotificationDrawerOpen(false);
  };

  const getNotificationStatusBadge = (item: AppNotification) => {
    const withLocalizedLabel = (rawLabel: string, classes: string) => ({
      label: localizeNotificationStatusBadge(rawLabel, language),
      classes
    });

    if (item.incidentId) {
      if (
        item.decisionAction === 'Approved' ||
        item.decisionAction === 'Assignment Accepted' ||
        item.decisionAction === 'Resolution Report Submitted' ||
        item.type === 'success'
      ) {
        return withLocalizedLabel(
          item.decisionAction || 'Approved',
          'bg-emerald-50 text-emerald-700 border-emerald-200'
        );
      }
      if (
        item.decisionAction === 'Rejected' ||
        item.decisionAction === 'Assignment Declined'
      ) {
        return withLocalizedLabel(
          item.decisionAction,
          'bg-rose-50 text-rose-700 border-rose-200'
        );
      }
      if (
        item.decisionAction === 'More Information Required' ||
        item.decisionAction === 'Assistance Requested'
      ) {
        return withLocalizedLabel(
          item.decisionAction,
          'bg-amber-50 text-amber-800 border-amber-200'
        );
      }
      if (
        item.decisionAction === 'Inspection Started' ||
        item.decisionAction === 'Findings Submitted'
      ) {
        return withLocalizedLabel(
          item.decisionAction,
          'bg-blue-50 text-blue-700 border-blue-200'
        );
      }
      if (item.targetRole === 'field') {
        return withLocalizedLabel(
          'Field Assignment',
          'bg-amber-50 text-amber-800 border-amber-200'
        );
      }
      if (item.targetRole === 'management') {
        return withLocalizedLabel(
          'Executive Escalation',
          'bg-purple-50 text-purple-700 border-purple-200'
        );
      }
    }

    const { effectiveStatus } = resolveApplicationDetails(item);
    if (effectiveStatus === 'Meter Installed' || item.eventType === 'APPLICATION_APPROVED') {
      return withLocalizedLabel(
        'Approved',
        'bg-emerald-50 text-emerald-700 border-emerald-200'
      );
    }
    if (effectiveStatus === 'Rejected' || item.eventType === 'APPLICATION_REJECTED') {
      return withLocalizedLabel(
        'Rejected',
        'bg-rose-50 text-rose-700 border-rose-200'
      );
    }
    if (effectiveStatus === 'Clarification Requested' || item.eventType === 'CLARIFICATION_REQUESTED') {
      return withLocalizedLabel(
        'Clarification Requested',
        'bg-amber-50 text-amber-800 border-amber-200'
      );
    }
    if (effectiveStatus === 'Sanction Approval' || item.eventType === 'SANCTION_APPROVAL_REQUIRED') {
      return withLocalizedLabel(
        'Awaiting Approval',
        'bg-purple-50 text-purple-700 border-purple-200'
      );
    }
    if (
      effectiveStatus === 'Document Verification' ||
      effectiveStatus === 'Site Inspection' ||
      item.eventType === 'DOCUMENTS_AWAITING_REVIEW' ||
      item.eventType === 'INSPECTION_COMPLETED'
    ) {
      return withLocalizedLabel(
        effectiveStatus || 'In Progress',
        'bg-amber-50 text-amber-800 border-amber-200'
      );
    }
    if (effectiveStatus === 'Submitted' || item.eventType === 'APPLICATION_SUBMITTED') {
      return withLocalizedLabel(
        'New Submission',
        'bg-blue-50 text-blue-700 border-blue-200'
      );
    }
    return withLocalizedLabel(
      item.category,
      'bg-slate-100 text-slate-700 border-slate-200'
    );
  };

  const filteredIncidents = isConsumerSession
    ? []
    : roleIncidents.filter(inc => {
        if (incidentSeverityFilter === 'all') return true;
        return inc.severity === incidentSeverityFilter;
      });

  const iconMap = {
    alert: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0" />
  };

  const handleEscalateSubmit = (id: string) => {
    const cleanReason = escalateReason.trim();
    if (!cleanReason) return;

    if (escalateTargetRole === 'field') {
      const selectedEng =
        fieldEngineers.find(f => f.id === selectedEngineerId) ||
        fieldEngineers[0] || {
          id: 'FLD-UG-201',
          name: 'Vikramaditya Solanki'
        };
      assignIncidentToField(id, selectedEng.id, selectedEng.name, cleanReason);
    } else if (escalateTargetRole === 'management') {
      const managerName =
        selectedManagerId === 'usr_mgmt_02'
          ? 'Pooja Shah'
          : selectedManagerId === 'usr_mgmt_03'
          ? 'Dr. Harita Joshi'
          : 'Rajesh Solanki';
      escalateIncident(id, 'management', cleanReason, selectedManagerId, managerName);
    } else {
      escalateIncident(id, escalateTargetRole, cleanReason);
    }

    setEscalatingId(null);
    setEscalateReason('');
  };

  const handleResolveSubmit = (id: string) => {
    resolveIncident(id, resolutionRemarks.trim() || 'Incident verified and rectified by authorized operator.');
    setResolvingId(null);
    setResolutionRemarks('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Utility Notification and Incident Center"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('[data-language-selector="true"]')) return;
        setIsNotificationDrawerOpen(false);
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#101C35] border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isConsumerSession
                    ? t.erp.consumerNotifCenter
                    : isEmployeeSession
                    ? t.erp.employeeNotifCenter
                    : t.erp.utilityNotifCenter}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {isConsumerSession
                  ? t.erp.consumerNotifSub
                  : isEmployeeSession
                  ? t.erp.employeeNotifSub
                  : t.erp.utilityNotifSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSelector variant="erp" />
            {!isConsumerSession && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-1.5 rounded-lg border transition-colors ${
                  audioAlertsEnabled
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title={audioAlertsEnabled ? 'Warning sounds enabled (click to mute)' : 'Warning sounds muted (click to enable)'}
                aria-label="Toggle warning audio"
              >
                {audioAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              aria-label={t.erp.closeNotifDrawerAria}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Tab Switcher (Staff Only - Consumers see their clean Notification & Advisory view) */}
        {!isConsumerSession && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMainTab('notifications')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMainTab === 'notifications'
                  ? 'bg-white dark:bg-[#101C35] text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-blue-500" />
              <span>{isEmployeeSession ? t.erp.tabAppNotifications : t.erp.tabNoticesEvents}</span>
              {unreadNotifCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-600 text-white">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('incidents')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMainTab === 'incidents'
                  ? 'bg-white dark:bg-[#101C35] text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${criticalIncidentsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
              <span>{t.erp.tabCriticalIncidents}</span>
              {unreadIncidentsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  criticalIncidentsCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500 text-white'
                }`}>
                  {unreadIncidentsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* INCIDENTS TAB CONTENT (Authorized Staff Roles Only) */}
        {!isConsumerSession && activeMainTab === 'incidents' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Incident Controls Bar */}
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                {(['all', 'CRITICAL', 'WARNING', 'INFO'] as const).map(sev => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setIncidentSeverityFilter(sev)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                      incidentSeverityFilter === sev
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60'
                    }`}
                  >
                    {sev === 'all' ? t.erp.catAll : localizeIncidentSeverity(sev, language)}
                  </button>
                ))}
              </div>

              {/* Demo Simulation Trigger */}
              <button
                type="button"
                onClick={triggerDemoSimulatedIncident}
                className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Trigger simulated critical overload for demonstration"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{t.erp.simulateCriticalIncident}</span>
              </button>
            </div>

            {/* Incidents List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-2">
              {filteredIncidents.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.erp.noActiveIncidents}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t.erp.noActiveIncidentsSub}
                  </p>
                </div>
              ) : (
                filteredIncidents.map(inc => {
                  const isExpanded = expandedIncidentId === inc.id;
                  const isCritical = inc.severity === 'CRITICAL';
                  const isUnread = inc.status === 'DETECTED';

                  return (
                    <div
                      key={inc.id}
                      className={`rounded-xl border transition-all ${
                        isCritical && isUnread
                          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                          : inc.status === 'RESOLVED'
                          ? 'border-slate-200 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/30 opacity-80'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C35]'
                      }`}
                    >
                      <div className="p-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                inc.severity === 'CRITICAL'
                                  ? 'bg-rose-600 text-white'
                                  : inc.severity === 'WARNING'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {localizeIncidentSeverity(inc.severity, language)}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                inc.status === 'DETECTED'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-extrabold'
                                  : inc.status === 'ACKNOWLEDGED'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                  : inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS'
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                  : inc.status === 'ESCALATED'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              }`}
                            >
                              {localizeIncidentStatus(inc.status, language)}
                            </span>
                            {inc.isSimulated && (
                              <span className="text-[9px] font-bold uppercase bg-amber-200 text-slate-800 px-1 py-0.2 rounded">
                                {t.incident.alertDemoSimulationBadge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {inc.id}
                          </span>
                        </div>

                        {/* Incident Title */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {localizeIncidentTitle(inc.title, language)}
                        </h4>

                        {/* Description */}
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {localizeIncidentDescription(inc.description, language)}
                        </p>

                        {/* Recommended Action */}
                        <div className="mt-2 p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[10px] text-amber-900 dark:text-amber-200">
                          <span className="font-bold">{t.incident.sopActionLabel} </span>
                          <span>{localizeIncidentSopAction(inc.recommendedAction, language)}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {inc.status === 'DETECTED' && (
                              <button
                                type="button"
                                onClick={() => acknowledgeIncident(inc.id)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>{t.incident.btnAcknowledge}</span>
                              </button>
                            )}

                            {inc.status !== 'RESOLVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEscalatingId(escalatingId === inc.id ? null : inc.id);
                                  setResolvingId(null);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowUpRight className="w-3 h-3 text-amber-500" />
                                <span>{t.incident.btnEscalate}</span>
                              </button>
                            )}

                            {inc.status !== 'RESOLVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setResolvingId(resolvingId === inc.id ? null : inc.id);
                                  setEscalatingId(null);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>{t.incident.btnResolve}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                openIncidentModal(inc.id);
                                setIsNotificationDrawerOpen(false);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{t.incident.btnOpenDossier}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedIncidentId(isExpanded ? null : inc.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                          >
                            <History className="w-3 h-3" />
                            <span>{t.incident.dossierTabAuditTrail} ({inc.history.length})</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Inline Escalate / Assign Form */}
                        {escalatingId === inc.id && (
                          <div className="mt-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-2 animate-in fade-in">
                            <div className="font-bold text-amber-900 dark:text-amber-200">
                              {escalateTargetRole === 'field' ? t.incident.modalAssignTitle : t.incident.modalEscalateTitle}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
                                  {t.employee.notifDrawerTargetChannelLabel}
                                </label>
                                <select
                                  value={escalateTargetRole}
                                  onChange={e => setEscalateTargetRole(e.target.value as UserRole)}
                                  aria-label={t.employee.notifDrawerTargetChannelLabel}
                                  className="w-full text-xs p-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                >
                                  <option value="management">{t.employee.notifDrawerOptManagement}</option>
                                  <option value="field">{t.employee.notifDrawerOptField}</option>
                                  <option value="employee">{t.employee.notifDrawerOptEmployee}</option>
                                  <option value="admin">{t.employee.notifDrawerOptAdmin}</option>
                                </select>
                              </div>

                              {escalateTargetRole === 'field' && (
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
                                    {t.incident.modalSelectEligibleEngineer}
                                  </label>
                                  <select
                                    value={selectedEngineerId}
                                    onChange={e => setSelectedEngineerId(e.target.value)}
                                    aria-label={t.incident.modalSelectEligibleEngineer}
                                    className="w-full text-xs p-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                  >
                                    {fieldEngineers.map(fe => (
                                      <option key={fe.id} value={fe.id}>
                                        {fe.name} ({fe.id}) — {localizeSubdivision(fe.subdivision, language)} [{localizeFieldEngineerStatus(fe.status, language)}]
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {escalateTargetRole === 'management' && (
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
                                    {t.incident.modalSelectTargetAuthority}
                                  </label>
                                  <select
                                    value={selectedManagerId}
                                    onChange={e => setSelectedManagerId(e.target.value)}
                                    aria-label={t.incident.modalSelectTargetAuthority}
                                    className="w-full text-xs p-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                                  >
                                    <option value="usr_mgmt_01">{t.incident.modalAuthoritySolanki}</option>
                                    <option value="usr_mgmt_02">{t.incident.modalAuthorityShah}</option>
                                    <option value="usr_mgmt_03">{t.incident.modalAuthorityJoshi}</option>
                                  </select>
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={escalateReason}
                              onChange={e => setEscalateReason(e.target.value)}
                              placeholder={escalateTargetRole === 'field' ? t.incident.modalPlaceholderAssign : t.incident.modalJustificationPlaceholder}
                              className="w-full text-xs p-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEscalatingId(null)}
                                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                              >
                                {t.common.cancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEscalateSubmit(inc.id)}
                                className="px-3 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer"
                              >
                                {escalateTargetRole === 'field' ? t.employee.notifDrawerConfirmFieldAssignBtn : t.employee.notifDrawerConfirmEscalationBtn}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Resolve Form */}
                        {resolvingId === inc.id && (
                          <div className="mt-2.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2 animate-in fade-in">
                            <div className="font-bold text-emerald-900 dark:text-emerald-200">
                              {t.incident.btnResolve}
                            </div>
                            <input
                              type="text"
                              value={resolutionRemarks}
                              onChange={e => setResolutionRemarks(e.target.value)}
                              placeholder={t.incident.modalInstructionsAssignLabel}
                              className="w-full text-xs p-2 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setResolvingId(null)}
                                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                              >
                                {t.common.cancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResolveSubmit(inc.id)}
                                className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              >
                                {t.employee.notifDrawerConfirmResolutionBtn}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Audit Trail Collapsible Section */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] space-y-1.5 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg">
                            <div className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                              {t.incident.dossierAuditTrailHeading}
                            </div>
                            {inc.history.map((h, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                                <span className="font-mono text-slate-400 shrink-0">
                                  {formatErpDateTime(h.timestamp)}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                    [{localizeIncidentAuditStage(h.stage, language)}]
                                  </span>{' '}
                                  {t.incident.dossierByActorPrefix} <span className="font-semibold text-blue-600 dark:text-blue-400">{h.actor}</span>
                                  {h.notes && <p className="text-slate-500 dark:text-slate-400 italic mt-0.5">{localizeAuditTrailNote(h.notes, language)}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB CONTENT */}
        {(isConsumerSession || activeMainTab === 'notifications') && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Status Filter Pills */}
            <div className="flex items-center justify-between gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {([
                  { id: 'all', label: `${t.erp.catAll} (${baseNotifications.length})` },
                  { id: 'unread', label: `${t.erp.filterUnread} (${unreadNotifCount})` },
                  { id: 'pending', label: t.erp.filterPendingReview },
                  { id: 'approved', label: t.erp.filterApproved },
                  { id: 'rejected', label: t.erp.filterRejected }
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      activeFilter === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Notification Management Bar */}
            {baseNotifications.length > 0 && (
              <div className="px-3 py-2 border-b border-slate-100 bg-white flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    aria-label={t.erp.selectAllVisibleNotifsAria}
                  />
                  <span>
                    {selectedIds.length > 0 ? `${selectedIds.length} ${t.erp.selectedSuffix}` : t.erp.selectAll}
                  </span>
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedIds.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={handleMarkSelectedRead}
                        className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>{t.erp.markRead}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.erp.deleteSelected}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title={t.erp.markAllVisibleReadTitle}
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>{t.erp.markAllRead}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title={t.erp.clearAllVisibleTitle}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{t.erp.clearAll}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notification List — Grouped by Date (Today, Yesterday, Earlier Calendar Dates) & Sorted Newest First */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {groupedNotifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t.erp.noNotifications}
                </div>
              ) : (
                groupedNotifications.map(group => {
                  const groupHeaderLabel = localizeNotificationDateGroupHeader(
                    group.bucketKey,
                    group.calendarDate,
                    language
                  );

                  return (
                    <div key={group.bucketKey} className="space-y-1.5" data-date-group={group.bucketKey}>
                      <div className="sticky top-0 z-10 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-xs border border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{groupHeaderLabel}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {group.items.length}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map(item => {
                          const { appId, linkedApp } = resolveApplicationDetails(item);
                          const cmpId =
                            item.complaintId ||
                            `${item.title} ${item.message}`.match(/CMP-[A-Z0-9-]+/)?.[0];
                          const woId = !isConsumerSession
                            ? item.workOrderId ||
                              `${item.title} ${item.message}`.match(/WO-[A-Z0-9-]+/)?.[0]
                            : undefined;
                          const statusBadge = getNotificationStatusBadge(item);
                          const rawLocalizedNotif = localizeConsumerNotification(item, language);
                          const localizedNotif = localizeIncidentNotification(rawLocalizedNotif, language);
                          const isSelected = selectedIds.includes(item.id);
                          const rawSubdivision = item.subdivision || linkedApp?.subdivision;
                          const displaySubdivision = rawSubdivision
                            ? localizeSubdivision(rawSubdivision, language)
                            : undefined;
                          const storedDate = parseNotificationStoredDate(item);
                          const exactStoredDateTime = storedDate
                            ? formatErpDateTime(storedDate)
                            : item.formattedTimestamp && parseDateSafe(item.formattedTimestamp)
                            ? formatErpDateTime(item.formattedTimestamp)
                            : undefined;
                          const hasDistinctRelativePhrase =
                            Boolean(localizedNotif.time) &&
                            localizedNotif.time !== exactStoredDateTime &&
                            !parseDateSafe(item.time);
                          const displayTimestamp = exactStoredDateTime
                            ? hasDistinctRelativePhrase
                              ? `${exactStoredDateTime} · ${localizedNotif.time}`
                              : exactStoredDateTime
                            : localizedNotif.time;

                          return (
                            <div
                              key={item.id}
                              onClick={() => markNotificationRead(item.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                item.type === 'alert' && !item.read
                                  ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-50/90'
                                  : !item.read
                                  ? 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/70'
                                  : item.type === 'alert'
                                  ? 'bg-rose-50/20 border-rose-200/80 hover:bg-rose-50/40'
                                  : 'bg-white border-slate-200/70 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={e => {
                                    e.stopPropagation();
                                    toggleSelectNotification(item.id);
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  aria-label={`${t.erp.selectNotifAria} ${localizedNotif.title}`}
                                  className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                />

                                <div className="mt-0.5">{iconMap[item.type]}</div>

                                <div className="flex-1 min-w-0">
                                  {/* Top Row: Application/Incident/Complaint/WorkOrder ID + Status Badge + Time + Delete */}
                                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.incidentId && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                          <ShieldAlert className="w-2.5 h-2.5" />
                                          {item.incidentId}
                                        </span>
                                      )}
                                      {appId && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                          <FileText className="w-2.5 h-2.5" />
                                          {appId}
                                        </span>
                                      )}
                                      {cmpId && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                          <FileText className="w-2.5 h-2.5" />
                                          {cmpId}
                                        </span>
                                      )}
                                      {woId && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                          <FileText className="w-2.5 h-2.5" />
                                          {woId}
                                        </span>
                                      )}
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.classes}`}
                                      >
                                        {statusBadge.label}
                                      </span>
                                      {!item.read ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                          {t.erp.filterUnread}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">{t.erp.readBadge}</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span
                                        className="text-[10px] text-slate-500 dark:text-slate-400 font-medium inline-flex items-center gap-1"
                                        title={exactStoredDateTime ? `${t.erp.eventDateTimeLabel} ${exactStoredDateTime}` : undefined}
                                      >
                                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                                        {displayTimestamp}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          deleteNotification(item.id);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title={t.erp.deleteNotifTitle}
                                        aria-label={`${t.erp.deleteNotifTitle} ${localizedNotif.title}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                    {localizedNotif.title}
                                  </h4>

                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5 mb-2">
                                    {localizedNotif.message}
                                  </p>

                                  {(item.notificationType === 'ASSIGNMENT_DECLINED' ||
                                    item.decisionAction === 'Assignment Declined') &&
                                    item.decisionReason && (
                                      <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-rose-100/80 border border-rose-200 text-[11px] text-rose-900">
                                        <span className="font-bold">{t.erp.declinedByPrefix}</span>{' '}
                                        {item.actorName || 'Field Engineer'}
                                        {item.actorUserId ? ` (${item.actorUserId})` : ''} ·{' '}
                                        <span className="font-bold">{t.erp.reasonPrefix}</span> &quot;{item.decisionReason}&quot;
                                      </div>
                                    )}

                                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                      {displaySubdivision && (
                                        <span className="font-medium">
                                          {t.erp.subdivisionPrefix} {displaySubdivision}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      {item.incidentId && (
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            markNotificationRead(item.id);
                                            if (effectiveRole === 'employee') {
                                              setActiveTab('incidents');
                                            }
                                            openIncidentModal(item.incidentId!);
                                            setIsNotificationDrawerOpen(false);
                                          }}
                                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-xs ${
                                            item.notificationType === 'ASSIGNMENT_DECLINED' ||
                                            item.decisionAction === 'Assignment Declined'
                                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                              : effectiveRole === 'management'
                                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                              : effectiveRole === 'field'
                                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                                          }`}
                                        >
                                          <ShieldAlert className="w-3 h-3" />
                                          <span>
                                            {item.notificationType === 'ASSIGNMENT_DECLINED' ||
                                            item.decisionAction === 'Assignment Declined'
                                              ? t.erp.openIncidentReassign
                                              : effectiveRole === 'management'
                                              ? t.erp.reviewEscalation
                                              : effectiveRole === 'field'
                                              ? t.erp.reviewAssignment
                                              : t.erp.openIssue}
                                          </span>
                                        </button>
                                      )}

                                      {appId && (
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleOpenApplicationFromNotification(item, appId);
                                          }}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                        >
                                          <span>
                                            {t.erp.openApplicationPrefix} {appId}
                                          </span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}

                                      {cmpId && (
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleOpenComplaintFromNotification(item, cmpId);
                                          }}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                        >
                                          <span>
                                            {t.common.viewDetails} {cmpId}
                                          </span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}

                                      {woId && (
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleOpenWorkOrderFromNotification(item, woId);
                                          }}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                                        >
                                          <span>
                                            {t.common.viewDetails} {woId}
                                          </span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-[#0D1527] border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-between px-4">
          <span>
            {t.erp.activeSessionScopePrefix} {effectiveRole.toUpperCase()}
          </span>
          <span className="text-[10px] text-slate-400">
            {isConsumerSession ? t.erp.ugvclConsumerSelfService : t.erp.ugvclPhase2Sentinel}
          </span>
        </div>
      </div>
    </div>
  );
};

