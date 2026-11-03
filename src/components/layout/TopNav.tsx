import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ROLE_PROFILES } from '../../data/mockData';
import {
  Search,
  Bell,
  Menu,
  RotateCcw,
  RefreshCw,
  Home,
  Info,
  HelpCircle,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { PresentationAboutModal } from '../common/PresentationAboutModal';
import { LanguageSelector } from '../common/LanguageSelector';
import { EnterpriseAccountMenu, getAccountMenuLabels } from '../common/EnterpriseAccountMenu';

interface TopNavProps {
  onToggleMobileNav: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleMobileNav }) => {
  const {
    currentRole,
    activeTab,
    scopedNotifications,
    setIsNotificationDrawerOpen,
    setIsCommandPaletteOpen,
    replayIntro,
    exitToWelcomeScreen,
    resetDemoData,
    activeUser,
    unreadIncidentsCount,
    criticalIncidentsCount
  } = useApp();
  const { t, language } = useLanguage();
  const accountLabels = getAccountMenuLabels(language);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isConfirmingHelpReset, setIsConfirmingHelpReset] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const helpMenuRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);

  const profile = ROLE_PROFILES[currentRole];
  const unreadNotifications = scopedNotifications.filter(n => !n.read).length;

  const roleLabelMap: Record<string, string> = {
    consumer: t.erp.roleConsumer,
    employee: t.erp.roleEmployee,
    field: t.erp.roleField,
    management: t.erp.roleManagement,
    admin: t.erp.roleAdmin
  };
  const localizedRoleLabel = roleLabelMap[currentRole] || profile.label;

  // Format breadcrumb / active section title
  const formatTabName = (tab: string) => {
    const labelMap: Record<string, string> = {
      'dashboard':
        currentRole === 'employee'
          ? t.erp.navErpOverview
          : currentRole === 'field'
          ? t.erp.navFieldConsole
          : currentRole === 'management'
          ? t.erp.navExecutiveCockpit
          : t.erp.navDashboard,
      'incidents': t.erp.navIncidentControlDesk,
      'connections': t.erp.navMyConnections,
      'new-connection': t.erp.navNewConnection,
      'bills': t.erp.navElectricityBills,
      'payments': t.erp.navPaymentHistory,
      'complaints': currentRole === 'employee' ? t.erp.navComplaintQueue : t.erp.navComplaintDesk,
      'requests': t.erp.navServiceRequests,
      'notifications': t.erp.navNotifications,
      'profile': t.erp.navAccountProfile,
      'applications': t.erp.navApplicationQueue,
      'consumers': t.erp.navConsumerLedger,
      'approvals': t.erp.navApprovalCenter,
      'coordination': t.erp.navDeptCoordination,
      'reports': currentRole === 'management' ? t.erp.navExecutiveExport : t.erp.navRevenueReports,
      'workorders': t.erp.navWorkOrders,
      'inspections': t.erp.navSiteFeasibility,
      'maintenance': t.erp.navFeederPatrol,
      'offline': t.erp.navOfflineQueue,
      'history': t.erp.navCompletedJobs,
      'analytics': t.erp.navRevenueDemand,
      'sla': t.erp.navSlaRedressal,
      'feeders': t.erp.navFeederOverloads,
      'ai-insights': t.erp.navAiInsights,
      'overview': t.erp.navSystemOverview,
      'users': t.erp.navUsersRoles,
      'access': t.erp.navAccessMatrix,
      'audit': t.erp.navAuditTrail,
      'integrations': t.erp.navApiIntegrations,
      'infra': t.erp.navInfraDb,
      'settings': t.erp.navSystemSettings,
      'directory': (t.erp as any).navUgvclDirectory || 'UGVCL Directory',
      'outage-map': (t.erp as any).navOutageMap || 'Live Outage Map'
    };
    if (labelMap[tab]) return labelMap[tab];
    return tab
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (!isHelpMenuOpen) {
      setIsConfirmingHelpReset(false);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setIsHelpMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsHelpMenuOpen(false);
        helpButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHelpMenuOpen]);

  return (
    <header className="h-12 sm:h-16 bg-white border-b border-slate-200 px-3 min-[375px]:px-4 md:px-6 flex items-center justify-between gap-2 sticky top-0 z-30 select-none">
      <PresentationAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Left: Prominent Mobile Menu Button, Mobile Portal Title & Desktop Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="md:hidden h-9 px-2.5 text-slate-800 hover:text-blue-700 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 rounded-lg flex items-center gap-1.5 shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
          title="Open portal navigation menu"
        >
          <Menu className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold tracking-tight text-slate-800">{t.erp.menu}</span>
        </button>

        {/* Concise Mobile Portal Identity (< 640px) — Single clean line to avoid duplicating section switcher below */}
        <div className="sm:hidden flex items-center gap-1.5 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 truncate">
            {localizedRoleLabel}
          </span>
        </div>

        {/* Tablet & Desktop Breadcrumbs (>= 640px) */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs min-w-0">
          <button
            type="button"
            onClick={exitToWelcomeScreen}
            className="font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
            title="Return to Welcome Screen (UGVCL Portal)"
          >
            <div className="w-5 h-5 rounded bg-white p-0.5 border border-slate-200 flex items-center justify-center shrink-0">
              <img src="/assets/ugvcl-logo.png" alt="UGVCL" className="w-full h-full object-contain" />
            </div>
            <span>UGVCL</span>
          </button>
          <span className="text-slate-300 select-none" aria-hidden="true">/</span>
          <span className="font-medium text-slate-600 truncate">
            {localizedRoleLabel}
          </span>
          <span className="text-slate-300 select-none" aria-hidden="true">/</span>
          <span className="font-semibold text-blue-600 truncate">
            {formatTabName(activeTab)}
          </span>
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Record Search Button (Ctrl+K) — Visible on sm+ in header, accessible via Mobile Menu & Profile menu on xs */}
        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden sm:flex h-9 items-center gap-2 px-3 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          title="Search utility records, consumer IDs & applications (Cmd+K)"
          aria-label="Search records"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="hidden md:inline font-medium">{t.erp.searchRecords}</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded border border-slate-200">
            ⌘K
          </kbd>
        </button>

        {/* Non-interactive Role Indicator — Visible on md+ to prevent mobile header crowding */}
        <div
          className="hidden lg:flex h-9 items-center gap-2 px-3 rounded-lg border border-blue-200/80 bg-blue-50/70 text-xs text-slate-800 shadow-2xs select-none"
          title={`${t.erp.authenticatedSession}: ${localizedRoleLabel} (${activeUser.name} · ${activeUser.id})`}
          aria-label={`Current Role: ${localizedRoleLabel}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span className="font-semibold text-blue-950">{localizedRoleLabel}</span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white text-blue-700 border border-blue-200 uppercase">
            {currentRole}
          </span>
        </div>

        {/* Shared ERP Language Selector (English, Gujarati, Hindi, Marathi) */}
        <LanguageSelector variant="erp" />

        {/* Compact Help / Information Menu — Visible on sm+ in header, available inside Profile Menu & MobileNav on xs */}
        <div className="relative hidden sm:block" ref={helpMenuRef}>
          <button
            ref={helpButtonRef}
            type="button"
            onClick={() => {
              setIsHelpMenuOpen(prev => !prev);
              setIsUserMenuOpen(false);
            }}
            className="h-9 flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            title={t.erp.helpAndInfo}
            aria-label="Help and Information Menu"
            aria-expanded={isHelpMenuOpen}
            aria-haspopup="true"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span className="hidden xl:inline">{t.erp.helpAndInfo}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>

          {isHelpMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {t.erp.platformResources}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t.erp.platformResourcesSub}
                </span>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    setIsAboutModalOpen(true);
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{t.erp.platformBrief}</div>
                    <div className="text-[11px] text-slate-500">{t.erp.platformBriefSub}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    exitToWelcomeScreen();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{t.erp.welcomeHub}</div>
                    <div className="text-[11px] text-slate-500">{t.erp.welcomeHubSub}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    replayIntro();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{t.erp.replayIntro}</div>
                    <div className="text-[11px] text-slate-500">{t.erp.replayIntroSub}</div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100" />

                {!isConfirmingHelpReset ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingHelpReset(true)}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold">{t.erp.resetDemoData}</div>
                      <div className="text-[11px] text-amber-600">{t.erp.resetDemoDataSub}</div>
                    </div>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-start gap-2 text-[11px] text-amber-900 font-medium leading-snug">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{accountLabels.resetConfirmPrompt}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingHelpReset(false)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {accountLabels.resetCancelAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfirmingHelpReset(false);
                          setIsHelpMenuOpen(false);
                          resetDemoData();
                        }}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        {accountLabels.resetConfirmAction}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => setIsNotificationDrawerOpen(true)}
          className={`relative h-9 w-9 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 ${
            criticalIncidentsCount > 0
              ? 'border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100 ring-2 ring-rose-400/40'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
          title={
            criticalIncidentsCount > 0
              ? `ALERT: ${criticalIncidentsCount} critical utility incident(s) detected!`
              : `${t.erp.notifications} (${unreadNotifications + unreadIncidentsCount})`
          }
          aria-label={`Open notifications (${unreadNotifications + unreadIncidentsCount} unread)`}
        >
          <Bell className={`w-4 h-4 ${criticalIncidentsCount > 0 ? 'animate-bounce text-rose-600' : ''}`} />
          {criticalIncidentsCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
              {unreadNotifications + unreadIncidentsCount}
            </span>
          ) : unreadNotifications + unreadIncidentsCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs">
              {unreadNotifications + unreadIncidentsCount}
            </span>
          ) : null}
        </button>

        {/* Enterprise Account & Session Menu */}
        <EnterpriseAccountMenu
          isOpen={isUserMenuOpen}
          onToggle={() => {
            setIsUserMenuOpen(prev => !prev);
            setIsHelpMenuOpen(false);
          }}
          onClose={() => setIsUserMenuOpen(false)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
        />
      </div>
    </header>
  );
};

