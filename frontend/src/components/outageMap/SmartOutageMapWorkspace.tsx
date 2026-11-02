import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  List,
  MapPin,
  Search,
  Shield,
  SlidersHorizontal,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FEEDER_METRICS } from '../../data/mockData';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  OUTAGE_MAP_TRANSLATIONS,
  formatConfidenceLabel,
} from '../../i18n/outageMapTranslations';
import { DemoOutageMapAdapter } from '../../outageMap/permissionsAndAdapter';
import type {
  ManagementOutageSummary,
  OperationsTimelineEvent,
  OutageFilters,
  OutageLifecycleStatus,
  OutageMapDataSource,
  OutageMapRecord,
  OutageSeverity,
} from '../../outageMap/types';
import type { UserRole } from '../../types';
import {
  isFieldEffectivelyOffline,
  loadFieldQueue,
  subscribeFieldQueue,
} from '../../utils/offlineFieldSync';
import { OperationsTimelinePanel } from './OperationsTimelinePanel';
import { SmartOutageMapPanel } from './SmartOutageMapPanel';

export interface SmartOutageMapWorkspaceProps {
  roleOverride?: UserRole;
  dataSourceOverride?: OutageMapDataSource;
}

const ALL_STATUSES: OutageLifecycleStatus[] = [
  'REPORTED',
  'UNDER_EMPLOYEE_REVIEW',
  'CONFIRMED_OUTAGE',
  'ASSIGNED',
  'ENGINEER_EN_ROUTE',
  'WORK_IN_PROGRESS',
  'RESTORATION_REPORTED',
  'RESOLVED_CLOSED',
  'CANCELLED_FALSE_ALARM',
];

const ALL_SEVERITIES: OutageSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const SmartOutageMapWorkspace: React.FC<SmartOutageMapWorkspaceProps> = ({
  roleOverride,
  dataSourceOverride,
}) => {
  const {
    currentRole,
    activeUser,
    demoSession,
    incidents,
    complaints,
    workOrders,
    userConnections,
    userComplaints,
    isOfflineSimulated,
    openIncidentModal,
    openCaseDrawer,
  } = useApp();

  const { language } = useLanguage();
  const t = OUTAGE_MAP_TRANSLATIONS[language] || OUTAGE_MAP_TRANSLATIONS.en;

  const effectiveRole: UserRole = roleOverride || currentRole;
  const isConsumerView = effectiveRole === 'consumer';

  const [offlineQueueTick, setOfflineQueueTick] = useState<number>(0);
  const [browserOffline, setBrowserOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  // Listen to browser online/offline & offline field queue updates cleanly
  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubQueue = subscribeFieldQueue(() => setOfflineQueueTick((n) => n + 1));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubQueue();
    };
  }, []);

  const effectivelyOffline =
    browserOffline || isOfflineSimulated || (effectiveRole === 'field' && isFieldEffectivelyOffline());

  const latestSnapshotRef = useRef({
    role: effectiveRole,
    actor: {
      id: demoSession?.user?.id || activeUser.id,
      name: demoSession?.user?.name || activeUser.name,
      email: demoSession?.user?.email || activeUser.email,
      subdivision: demoSession?.user?.subdivision || activeUser.subdivision,
    },
    incidents,
    complaints,
    workOrders,
    feeders: FEEDER_METRICS,
    userConnections,
    userComplaints,
    offlineQueue: loadFieldQueue(),
    isBrowserOffline: effectivelyOffline,
  });

  latestSnapshotRef.current = {
    role: effectiveRole,
    actor: {
      id: demoSession?.user?.id || activeUser.id,
      name: demoSession?.user?.name || activeUser.name,
      email: demoSession?.user?.email || activeUser.email,
      subdivision: demoSession?.user?.subdivision || activeUser.subdivision,
    },
    incidents,
    complaints,
    workOrders,
    feeders: FEEDER_METRICS,
    userConnections,
    userComplaints,
    offlineQueue: loadFieldQueue(),
    isBrowserOffline: effectivelyOffline,
  };

  const defaultAdapter = useMemo(
    () => new DemoOutageMapAdapter(() => latestSnapshotRef.current),
    [],
  );

  const dataSource: OutageMapDataSource = dataSourceOverride || defaultAdapter;

  // Notify reactive DEMO adapter whenever canonical state changes
  useEffect(() => {
    if (!dataSourceOverride) {
      defaultAdapter.notifyChange({
        reason: offlineQueueTick > 0 ? 'OFFLINE_SYNCED' : 'STATE_UPDATED',
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    defaultAdapter,
    dataSourceOverride,
    effectiveRole,
    incidents,
    complaints,
    workOrders,
    userConnections,
    userComplaints,
    effectivelyOffline,
    offlineQueueTick,
  ]);

  // Filter & selection state — preserved across language switches!
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<OutageLifecycleStatus | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<OutageSeverity | 'ALL'>('ALL');
  const [subdivisionFilter, setSubdivisionFilter] = useState<string>('ALL');
  const [feederFilter, setFeederFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [scopeMode, setScopeMode] = useState<'ACTIVE_ONLY' | 'RESOLVED_ONLY' | 'ALL'>('ALL');

  const [primaryViewMode, setPrimaryViewMode] = useState<'map' | 'list' | 'timeline'>('map');
  const [selectedOutageId, setSelectedOutageId] = useState<string | null>(null);
  const [focusedTimelineOutageId, setFocusedTimelineOutageId] = useState<string | null>(null);

  const [allVisibleRecords, setAllVisibleRecords] = useState<OutageMapRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<OutageMapRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<OperationsTimelineEvent[]>([]);
  const [mgmtSummary, setMgmtSummary] = useState<ManagementOutageSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [changeCounter, setChangeCounter] = useState<number>(0);

  // Debounce text search
  useEffect(() => {
    if (!searchInput.trim()) {
      setDebouncedSearch('');
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Subscribe cleanly to dataSource changes and tear down on unmount
  useEffect(() => {
    const unsub = dataSource.subscribeToChanges(() => {
      setChangeCounter((c) => c + 1);
    });
    return () => {
      unsub();
    };
  }, [dataSource]);

  const activeFilters: OutageFilters = useMemo(
    () => ({
      searchQuery: debouncedSearch,
      status: statusFilter,
      severity: isConsumerView ? 'ALL' : severityFilter,
      subdivision: subdivisionFilter,
      feeder: feederFilter,
      assignedTeam: isConsumerView ? 'ALL' : teamFilter,
      scopeMode,
    }),
    [
      debouncedSearch,
      statusFilter,
      severityFilter,
      subdivisionFilter,
      feederFilter,
      teamFilter,
      scopeMode,
      isConsumerView,
    ],
  );

  // Load authorized records, timeline events, and management summary
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      dataSource.listVisibleOutages(),
      dataSource.listVisibleOutages(activeFilters),
      dataSource.listVisibleEvents(focusedTimelineOutageId || undefined),
      dataSource.getManagementSummary(),
    ])
      .then(([unfiltered, filtered, events, summary]) => {
        if (cancelled) return;
        setAllVisibleRecords(unfiltered);
        setFilteredRecords(filtered);
        setTimelineEvents(events);
        setMgmtSummary(summary);
        setSelectedOutageId((prev) => {
          if (prev && filtered.some((r) => r.id === prev)) return prev;
          return filtered[0]?.id || null;
        });
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Error loading outage map');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataSource, activeFilters, focusedTimelineOutageId, changeCounter, effectiveRole]);

  const subdivisionOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allVisibleRecords) {
      if (r.subdivisionId) s.add(r.subdivisionId);
    }
    return Array.from(s).sort();
  }, [allVisibleRecords]);

  const feederOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allVisibleRecords) {
      if (r.feederName) s.add(r.feederName);
    }
    return Array.from(s).sort();
  }, [allVisibleRecords]);

  const teamOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allVisibleRecords) {
      if (r.assignedTeam) s.add(r.assignedTeam);
    }
    return Array.from(s).sort();
  }, [allVisibleRecords]);

  const selectedRecord = useMemo(
    () =>
      filteredRecords.find((r) => r.id === selectedOutageId) ||
      allVisibleRecords.find((r) => r.id === selectedOutageId) ||
      null,
    [filteredRecords, allVisibleRecords, selectedOutageId],
  );

  const handleSelectOutage = (outageId: string) => {
    setSelectedOutageId(outageId);
    setFocusedTimelineOutageId(outageId);
  };

  const handleSelectFromTimeline = (outageId: string) => {
    setSelectedOutageId(outageId);
  };

  return (
    <div
      data-testid="smart-outage-map-workspace"
      className="space-y-4"
    >
      {/* Module Title & Honest DEMO Disclosure Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
              <span>{isConsumerView ? t.consumerModuleHeading : t.moduleHeading}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isConsumerView ? t.consumerModuleSubtitle : t.moduleSubtitle}
            </p>
          </div>

          {/* Accessible View Mode Segmented Switcher (Map / Accessible List / Mobile Timeline) */}
          <div
            role="tablist"
            aria-label="Outage visualization view mode"
            className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={primaryViewMode === 'map'}
              data-testid="view-mode-map-btn"
              onClick={() => setPrimaryViewMode('map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                primaryViewMode === 'map'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.tabMapView}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={primaryViewMode === 'list'}
              data-testid="view-mode-list-btn"
              onClick={() => setPrimaryViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                primaryViewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.tabListView}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={primaryViewMode === 'timeline'}
              data-testid="view-mode-timeline-btn"
              onClick={() => setPrimaryViewMode('timeline')}
              className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                primaryViewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{t.tabTimelineView}</span>
            </button>
          </div>
        </div>

        {/* Honest DEMO Simulation Disclosure */}
        <div
          data-testid="outage-demo-disclosure"
          className="flex items-start gap-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-2 text-xs text-sky-900 dark:text-sky-200"
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <span>{t.demoDisclosureBanner}</span>
        </div>

        {/* Consumer Privacy Safeguard Banner */}
        {isConsumerView && (
          <div
            data-testid="consumer-privacy-safeguard-banner"
            className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200"
          >
            <Shield className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{t.consumerPrivacyNotice}</span>
          </div>
        )}

        {/* Offline Browser / Field Simulation Notice */}
        {effectivelyOffline && (
          <div
            role="status"
            data-testid="outage-offline-banner"
            className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
          >
            <WifiOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
            <span>{t.offlineBannerText}</span>
          </div>
        )}
      </div>

      {/* Management / Admin Aggregate Summary Cards */}
      {mgmtSummary && (effectiveRole === 'management' || effectiveRole === 'admin') && (
        <div
          data-testid="management-outage-summary-strip"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.mgmtActiveCount}</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {mgmtSummary.activeOutages}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.mgmtConfirmedCount}</p>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
              {mgmtSummary.confirmedOutages}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.mgmtEscalatedCount}</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {mgmtSummary.escalatedCount}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.mgmtResolvedCount}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {mgmtSummary.resolvedOutages}
            </p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div
        data-testid="outage-filters-bar"
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 shadow-sm space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              data-testid="outage-search-input"
              aria-label={t.searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Scope Mode */}
          <div>
            <label className="sr-only" htmlFor="outage-filter-scope">
              {t.filterScopeLabel}
            </label>
            <select
              id="outage-filter-scope"
              data-testid="outage-filter-scope"
              value={scopeMode}
              onChange={(e) =>
                setScopeMode(e.target.value as 'ACTIVE_ONLY' | 'RESOLVED_ONLY' | 'ALL')
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">{t.scopeAllIncidents}</option>
              <option value="ACTIVE_ONLY">{t.scopeActiveOnly}</option>
              <option value="RESOLVED_ONLY">{t.scopeResolvedOnly}</option>
            </select>
          </div>

          {/* Lifecycle Status Filter */}
          <div>
            <label className="sr-only" htmlFor="outage-filter-status">
              {t.filterStatusLabel}
            </label>
            <select
              id="outage-filter-status"
              data-testid="outage-filter-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OutageLifecycleStatus | 'ALL')
              }
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">
                {t.filterStatusLabel}: {t.filterAll}
              </option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {t.statuses[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Subdivision Filter */}
          <div>
            <label className="sr-only" htmlFor="outage-filter-subdivision">
              {t.filterSubdivisionLabel}
            </label>
            <select
              id="outage-filter-subdivision"
              data-testid="outage-filter-subdivision"
              value={subdivisionFilter}
              onChange={(e) => setSubdivisionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">
                {t.filterSubdivisionLabel}: {t.filterAll}
              </option>
              {subdivisionOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Feeder Filter */}
          <div>
            <label className="sr-only" htmlFor="outage-filter-feeder">
              {t.filterFeederLabel}
            </label>
            <select
              id="outage-filter-feeder"
              data-testid="outage-filter-feeder"
              value={feederFilter}
              onChange={(e) => setFeederFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">
                {t.filterFeederLabel}: {t.filterAll}
              </option>
              {feederOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operational-only secondary filters (Severity & Assigned Team — hidden from Consumer) */}
        {!isConsumerView && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Operational Filters:
            </span>
            <label className="sr-only" htmlFor="outage-filter-severity">
              {t.filterSeverityLabel}
            </label>
            <select
              id="outage-filter-severity"
              data-testid="outage-filter-severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as OutageSeverity | 'ALL')}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">
                {t.filterSeverityLabel}: {t.filterAll}
              </option>
              {ALL_SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {t.severities[sev]}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="outage-filter-team">
              {t.filterTeamLabel}
            </label>
            <select
              id="outage-filter-team"
              data-testid="outage-filter-team"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">
                {t.filterTeamLabel}: {t.filterAll}
              </option>
              {teamOptions.map((tm) => (
                <option key={tm} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading & Error Banners */}
      {isLoading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {t.loadingOutages}
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200"
        >
          {t.errorLoadingOutages} ({loadError})
        </div>
      )}

      {/* Main Split Workspace (Desktop: Map/List + Detail & Timeline; Mobile: Tabbed) */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Interactive Map OR Accessible Incident List */}
          <div
            className={`lg:col-span-7 space-y-4 ${
              primaryViewMode === 'timeline' ? 'hidden lg:block' : ''
            }`}
          >
            {filteredRecords.length === 0 ? (
              <div
                data-testid="outage-empty-state"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-1.5"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t.emptyOutagesTitle}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.emptyOutagesSubtitle}
                </p>
              </div>
            ) : primaryViewMode === 'list' ? (
              /* Accessible Incident List View Alternative (Keyboard & Screen-Reader Friendly) */
              <div
                data-testid="accessible-outage-list-view"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th scope="col" className="px-3.5 py-2.5 text-left font-semibold">
                          {t.labelReference}
                        </th>
                        <th scope="col" className="px-3.5 py-2.5 text-left font-semibold">
                          {t.labelArea}
                        </th>
                        <th scope="col" className="px-3.5 py-2.5 text-left font-semibold">
                          {t.labelStatus}
                        </th>
                        {!isConsumerView && (
                          <th scope="col" className="px-3.5 py-2.5 text-left font-semibold">
                            {t.labelSeverity}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRecords.map((rec) => {
                        const isSelected = rec.id === selectedOutageId;
                        return (
                          <tr
                            key={rec.id}
                            className={
                              isSelected
                                ? 'bg-sky-50/90 dark:bg-sky-950/40'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }
                          >
                            <td className="px-3.5 py-2.5 font-mono">
                              <button
                                type="button"
                                data-testid={`list-row-btn-${rec.id}`}
                                onClick={() => handleSelectOutage(rec.id)}
                                className="font-semibold text-sky-700 dark:text-sky-400 underline-offset-2 hover:underline text-left"
                              >
                                {rec.complaintId || rec.incidentId}
                              </button>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-800 dark:text-slate-200">
                              {rec.affectedAreaLabel}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                                {rec.isConfirmedOutage ? '●' : '?'} {t.statuses[rec.status]}
                              </span>
                            </td>
                            {!isConsumerView && (
                              <td className="px-3.5 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                                {rec.severity ? t.severities[rec.severity] : '—'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <SmartOutageMapPanel
                records={filteredRecords}
                selectedOutageId={selectedOutageId}
                onSelectOutage={handleSelectOutage}
                language={language}
                isOffline={effectivelyOffline}
                isConsumerView={isConsumerView}
              />
            )}

            {/* Selected Outage Detail Inspector Card */}
            {selectedRecord && (
              <section
                aria-label={t.detailHeading}
                data-testid="selected-outage-detail-card"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                        {selectedRecord.id}
                      </span>

                      {selectedRecord.isConfirmedOutage ? (
                        <span
                          data-testid="detail-confirmed-badge"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200"
                        >
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          <span>{t.confirmedOutageBadge}</span>
                        </span>
                      ) : (
                        <span
                          data-testid="detail-unverified-badge"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                        >
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                          <span>{t.unverifiedReportBadge}</span>
                        </span>
                      )}

                      {!isConsumerView && selectedRecord.severity && (
                        <span
                          data-testid="detail-severity-badge"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
                        >
                          ▲ {t.severities[selectedRecord.severity]}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                      {isConsumerView
                        ? selectedRecord.publicTitle
                        : selectedRecord.internalTitle || selectedRecord.publicTitle}
                    </h3>
                  </div>

                  {/* Canonical Deep-Link Action (reuses existing Portal Modals/Drawers) */}
                  {!isConsumerView && selectedRecord.incidentId && (
                    <button
                      type="button"
                      data-testid="open-canonical-incident-btn"
                      onClick={() => openIncidentModal(selectedRecord.incidentId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
                    >
                      <span>{t.btnOpenIncidentRecord}</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}

                  {isConsumerView &&
                    selectedRecord.isConsumerOwnReport &&
                    selectedRecord.complaintId && (
                      <button
                        type="button"
                        data-testid="open-own-complaint-btn"
                        onClick={() =>
                          openCaseDrawer('complaint', selectedRecord.complaintId as string)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <span>{t.btnOpenOwnComplaint}</span>
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">{t.labelArea}</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {selectedRecord.affectedAreaLabel}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">{t.labelStatus}</dt>
                    <dd
                      data-testid="detail-status-value"
                      className="font-semibold text-slate-900 dark:text-slate-100"
                    >
                      {t.statuses[selectedRecord.status]}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">{t.labelReportedAt}</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {selectedRecord.reportedAt}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">{t.labelEtr}</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {selectedRecord.estimatedRestorationAt ? (
                        <span>
                          {selectedRecord.estimatedRestorationAt} (
                          {formatConfidenceLabel(selectedRecord.estimateConfidence, language)})
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          {t.etrUnavailable}
                        </span>
                      )}
                    </dd>
                  </div>

                  {!isConsumerView && selectedRecord.assignedTeam && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">{t.labelAssignedTeam}</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">
                        {selectedRecord.assignedTeam}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">{t.labelSource}</dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedRecord.sourceLabel} · {selectedRecord.freshnessLabel}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </div>

          {/* Right Column: Live Utility Operations Timeline */}
          <div className="lg:col-span-5">
            <OperationsTimelinePanel
              events={timelineEvents}
              selectedOutageId={selectedOutageId}
              focusedOutageId={focusedTimelineOutageId}
              onSelectOutageFromEvent={handleSelectFromTimeline}
              onClearFocus={() => setFocusedTimelineOutageId(null)}
              transportState={dataSource.transportState}
              language={language}
              isConsumerView={isConsumerView}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartOutageMapWorkspace;
