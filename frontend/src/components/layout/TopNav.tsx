import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isDevAuthModeSwitchEnabled } from '../../utils/authClient';
import { ROLE_PROFILES } from '../../data/mockData';
import {
  Search,
  Bell,
  Menu,
  LogOut,
  RotateCcw,
  RefreshCw,
  Home,
  Info,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { PresentationAboutModal } from '../common/PresentationAboutModal';

interface TopNavProps {
  onToggleMobileNav: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleMobileNav }) => {
  const {
    currentRole,
    activeTab,
    notifications,
    userNotifications,
    setIsNotificationDrawerOpen,
    setIsCommandPaletteOpen,
    setIsAIAssistantOpen,
    replayIntro,
    exitToWelcomeScreen,
    resetDemoData,
    logoutDemoSession,
    authMode,
    setAuthMode,
    activeUser
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  const profile = ROLE_PROFILES[currentRole];
  const scopedNotifications = currentRole === 'consumer' ? userNotifications : notifications;
  const unreadNotifications = scopedNotifications.filter(n => !n.read).length;

  // Format breadcrumb / active section title
  const formatTabName = (tab: string) => {
    const labelMap: Record<string, string> = {
      'dashboard': currentRole === 'employee' ? 'ERP Overview' : currentRole === 'field' ? 'Field Console' : currentRole === 'management' ? 'Executive Cockpit' : 'Dashboard',
      'connections': 'My Connections',
      'new-connection': 'New Connection',
      'bills': 'Electricity Bills',
      'payments': 'Payment History',
      'complaints': currentRole === 'employee' ? 'Complaint Queue' : 'Complaint Desk',
      'requests': 'Service Requests',
      'notifications': 'Notifications',
      'profile': 'Account Profile',
      'applications': 'Application Queue',
      'consumers': 'Consumer Ledger',
      'approvals': 'Approval Center',
      'coordination': 'Dept Coordination',
      'reports': currentRole === 'management' ? 'Executive Export' : 'Revenue Reports',
      'workorders': 'Work Orders',
      'inspections': 'Site Feasibility',
      'maintenance': 'Feeder Patrol',
      'offline': 'Offline Queue',
      'history': 'Completed Jobs',
      'analytics': 'Revenue & Demand',
      'sla': 'SLA Redressal',
      'feeders': 'Feeder Overloads',
      'ai-insights': 'UGVCL AI Insights',
      'overview': 'System Overview',
      'users': 'Users & Roles',
      'access': 'Access Matrix',
      'audit': 'Audit Trail',
      'integrations': 'API Integrations',
      'infra': 'Infrastructure & DB',
      'settings': 'System Settings'
    };
    if (labelMap[tab]) return labelMap[tab];
    return tab
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setIsHelpMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <span className="text-xs font-bold tracking-tight text-slate-800">Menu</span>
        </button>

        {/* Concise Mobile Portal Identity (< 640px) — Single clean line to avoid duplicating section switcher below */}
        <div className="sm:hidden flex items-center gap-1.5 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 truncate">
            {profile.label}
          </span>
        </div>

        {/* Tablet & Desktop Breadcrumbs (>= 640px) */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs min-w-0">
          <button
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
            {profile.label}
          </span>
          <span className="text-slate-300 select-none" aria-hidden="true">/</span>
          <span className="font-semibold text-blue-600 truncate">
            {formatTabName(activeTab)}
          </span>
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Record Search Button (Ctrl+K) — Visible on sm+ in header, accessible via Mobile Menu & Profile menu on xs */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden sm:flex h-9 items-center gap-2 px-3 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          title="Search utility records, consumer IDs & applications (Cmd+K)"
          aria-label="Search records"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="hidden md:inline font-medium">Search records...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded border border-slate-200">
            ⌘K
          </kbd>
        </button>

        {/* Non-interactive Role Indicator — Visible on md+ to prevent mobile header crowding */}
        <div
          className="hidden md:flex h-9 items-center gap-2 px-3 rounded-lg border border-blue-200/80 bg-blue-50/70 text-xs text-slate-800 shadow-2xs select-none"
          title={`Authenticated Session: ${profile.label} (${profile.personaName})`}
          aria-label={`Current Role: ${profile.label}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <span className="font-semibold text-blue-950">{profile.label}</span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white text-blue-700 border border-blue-200 uppercase">
            {currentRole}
          </span>
        </div>

        {/* Compact Help / Information Menu — Visible on sm+ in header, available inside Profile Menu & MobileNav on xs */}
        <div className="relative hidden sm:block" ref={helpMenuRef}>
          <button
            onClick={() => {
              setIsHelpMenuOpen(prev => !prev);
              setIsUserMenuOpen(false);
            }}
            className="h-9 flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            title="Help, Platform Brief & Information"
            aria-label="Help and Information Menu"
            aria-expanded={isHelpMenuOpen}
            aria-haspopup="true"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span className="hidden lg:inline">Help & Info</span>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>

          {isHelpMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Platform Resources
                </span>
                <span className="text-[11px] text-slate-500">
                  UGVCL-Inspired Utility ERP Prototype
                </span>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    setIsAboutModalOpen(true);
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Platform Brief</div>
                    <div className="text-[11px] text-slate-500">Architecture & system overview</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    exitToWelcomeScreen();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Welcome Hub</div>
                    <div className="text-[11px] text-slate-500">Return to public portal homepage</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    replayIntro();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Replay Intro</div>
                    <div className="text-[11px] text-slate-500">Smart-grid animation showcase</div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setIsHelpMenuOpen(false);
                    resetDemoData();
                  }}
                  className="w-full flex items-start gap-2.5 px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Reset Demo Data</div>
                    <div className="text-[11px] text-amber-600">Restore initial sample records</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="relative h-9 w-9 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
          title="Notifications & Alerts"
          aria-label={`Open notifications (${unreadNotifications} unread)`}
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs">
              {unreadNotifications}
            </span>
          )}
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative shrink-0" ref={userMenuRef}>
          <button
            onClick={() => {
              setIsUserMenuOpen(prev => !prev);
              setIsHelpMenuOpen(false);
            }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            title={`Active Session: ${activeUser.name} (${activeUser.initials})`}
            aria-label="User Profile Menu"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {activeUser.initials}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-mono">
                    {activeUser.isCustomUser ? 'Registered Account' : 'Authenticated Session'}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                    {currentRole}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                    {activeUser.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 break-words">
                      {activeUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {activeUser.email}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-blue-600 mt-2 font-medium flex items-start gap-1 leading-snug">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="break-words">{activeUser.designation}</span>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                {/* Mobile-accessible tools moved out of the <640px header */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsCommandPaletteOpen(true);
                  }}
                  className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left cursor-pointer"
                >
                  <Search className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Search Records</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsAIAssistantOpen(true);
                  }}
                  className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 text-teal-700 hover:bg-teal-50 rounded-lg text-left font-medium cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Vidyut Mitra AI</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsAboutModalOpen(true);
                  }}
                  className="sm:hidden w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left cursor-pointer"
                >
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Platform Brief & Info</span>
                </button>

                <button
                  onClick={() => {
                    exitToWelcomeScreen();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left cursor-pointer"
                >
                  <Home className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Welcome Portal Homepage</span>
                </button>

                <button
                  onClick={() => {
                    resetDemoData();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-lg text-left font-medium cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Reset Demo Records</span>
                </button>

                {/* Secure Sign Out - Required to switch role or account */}
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logoutDemoSession();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-left font-semibold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Sign Out (Switch Role)</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 px-3 border-t border-slate-100 space-y-1.5">
                {isDevAuthModeSwitchEnabled() && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono uppercase text-slate-400">Dev Auth Mode:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setAuthMode(authMode === 'server' ? 'demo' : 'server');
                      }}
                      className={`font-semibold px-2 py-0.5 rounded border cursor-pointer ${
                        authMode === 'server'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {authMode === 'server' ? 'Server (/api/auth)' : 'Client Demo'}
                    </button>
                  </div>
                )}
                <div className="py-0.5 text-[10px] text-slate-400 text-center leading-tight">
                  VidyutFlow · Independent UGVCL-Inspired ERP Prototype
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
