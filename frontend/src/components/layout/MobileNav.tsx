import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_PROFILES } from '../../data/mockData';
import {
  X,
  LayoutDashboard,
  Plug,
  PlusCircle,
  Receipt,
  CreditCard,
  MessageSquareWarning,
  FileText,
  Bell,
  User,
  Inbox,
  Database,
  CheckSquare,
  Network,
  BarChart3,
  Wrench,
  ClipboardCheck,
  HardHat,
  WifiOff,
  History,
  LineChart,
  PieChart,
  Clock,
  Cpu,
  Sparkles,
  Activity,
  Users as UsersIcon,
  KeyRound,
  FileSearch,
  Server,
  ShieldCheck,
  Settings,
  Home,
  RotateCcw,
  LogOut,
  Search
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    applications,
    complaints,
    workOrders,
    userConnections,
    userApplications,
    userBills,
    userComplaints,
    userNotifications,
    setIsAIAssistantOpen,
    setIsCommandPaletteOpen,
    exitToWelcomeScreen,
    replayIntro,
    logoutDemoSession,
    activeUser
  } = useApp();

  // Close drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const profile = ROLE_PROFILES[currentRole];

  // Global counts for staff/admin roles
  const pendingApps = applications.filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected').length;
  const activeCmps = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const pendingWos = workOrders.filter(w => w.status !== 'Completed').length;

  // Scoped counts for active consumer account
  const consumerConnectionCount = (userConnections || []).length;
  const unpaidConsumerBills = (userBills || []).filter(b => b.status === 'Unpaid').length;
  const activeConsumerCmps = (userComplaints || []).filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const activeConsumerApps = (userApplications || []).filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected').length;
  const unreadConsumerNotifs = (userNotifications || []).filter(n => !n.read).length;

  const getNavLinks = (): MobileNavItem[] => {
    switch (currentRole) {
      case 'consumer':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          {
            id: 'connections',
            label: 'My Connections',
            icon: <Plug className="w-4 h-4" />,
            badge: consumerConnectionCount > 0 ? consumerConnectionCount : undefined
          },
          { id: 'new-connection', label: 'New Connection', icon: <PlusCircle className="w-4 h-4" /> },
          {
            id: 'bills',
            label: 'Electricity Bills',
            icon: <Receipt className="w-4 h-4" />,
            badge: unpaidConsumerBills > 0 ? `${unpaidConsumerBills} Due` : undefined
          },
          { id: 'payments', label: 'Payment History', icon: <CreditCard className="w-4 h-4" /> },
          {
            id: 'complaints',
            label: 'Complaint Desk',
            icon: <MessageSquareWarning className="w-4 h-4" />,
            badge: activeConsumerCmps > 0 ? activeConsumerCmps : undefined
          },
          {
            id: 'requests',
            label: 'Service Requests',
            icon: <FileText className="w-4 h-4" />,
            badge: activeConsumerApps > 0 ? activeConsumerApps : undefined
          },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: <Bell className="w-4 h-4" />,
            badge: unreadConsumerNotifs > 0 ? unreadConsumerNotifs : undefined
          },
          { id: 'profile', label: 'Account Profile', icon: <User className="w-4 h-4" /> }
        ];
      case 'employee':
        return [
          { id: 'dashboard', label: 'ERP Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'applications', label: 'Application Queue', icon: <Inbox className="w-4 h-4" />, badge: pendingApps > 0 ? pendingApps : undefined },
          { id: 'consumers', label: 'Consumer Ledger', icon: <Database className="w-4 h-4" /> },
          { id: 'complaints', label: 'Complaint Queue', icon: <MessageSquareWarning className="w-4 h-4" />, badge: activeCmps > 0 ? activeCmps : undefined },
          { id: 'approvals', label: 'Approval Center', icon: <CheckSquare className="w-4 h-4" />, badge: pendingApps > 0 ? pendingApps : undefined },
          { id: 'coordination', label: 'Dept Coordination', icon: <Network className="w-4 h-4" /> },
          { id: 'reports', label: 'Revenue Reports', icon: <BarChart3 className="w-4 h-4" /> }
        ];
      case 'field':
        return [
          { id: 'dashboard', label: 'Field Console', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'workorders', label: 'Work Orders', icon: <Wrench className="w-4 h-4" />, badge: pendingWos > 0 ? pendingWos : undefined },
          { id: 'inspections', label: 'Site Feasibility', icon: <ClipboardCheck className="w-4 h-4" /> },
          { id: 'maintenance', label: 'Feeder Patrol', icon: <HardHat className="w-4 h-4" /> },
          { id: 'offline', label: 'Offline Queue', icon: <WifiOff className="w-4 h-4" /> },
          { id: 'history', label: 'Completed Jobs', icon: <History className="w-4 h-4" /> }
        ];
      case 'management':
        return [
          { id: 'dashboard', label: 'Executive Cockpit', icon: <LineChart className="w-4 h-4" /> },
          { id: 'analytics', label: 'Revenue & Demand', icon: <PieChart className="w-4 h-4" /> },
          { id: 'sla', label: 'SLA Redressal', icon: <Clock className="w-4 h-4" /> },
          { id: 'feeders', label: 'Feeder Overloads', icon: <Cpu className="w-4 h-4" />, badge: '1 Alert' },
          { id: 'ai-insights', label: 'UGVCL AI Insights', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'reports', label: 'Executive Export', icon: <BarChart3 className="w-4 h-4" /> }
        ];
      case 'admin':
        return [
          { id: 'overview', label: 'System Overview', icon: <Activity className="w-4 h-4" /> },
          { id: 'users', label: 'Users & Roles', icon: <UsersIcon className="w-4 h-4" />, badge: 12 },
          { id: 'access', label: 'Access Matrix', icon: <KeyRound className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit Trail', icon: <FileSearch className="w-4 h-4" /> },
          { id: 'integrations', label: 'API Integrations', icon: <Server className="w-4 h-4" /> },
          { id: 'infra', label: 'Infrastructure & DB', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> }
        ];
    }
  };

  const links = getNavLinks();

  return (
    <>
      {/* Mobile In-Page Section Strip (md:hidden) — Makes all role sections immediately discoverable */}
      <nav
        aria-label="Mobile Section Navigation"
        className="md:hidden bg-white border-b border-slate-200 px-3 min-[375px]:px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto select-none shrink-0"
      >
        {links.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-blue-700 border border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsAIAssistantOpen(true)}
          className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Vidyut Mitra AI</span>
        </button>
      </nav>

      {/* Slide-Over Mobile Navigation Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Portal Navigation Drawer"
          className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-xs flex"
          onClick={onClose}
        >
          <div
            className="w-72 max-w-[85vw] bg-[#0E1A32] text-slate-300 h-full flex flex-col p-4 shadow-2xl border-r border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Brand Header & Accessible Close Button */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-700 flex items-center justify-center shrink-0">
                  <img src="/assets/ugvcl-logo.png" alt="UGVCL Logo" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block truncate">UGVCL VidyutFlow</span>
                  <span className="text-[10px] text-slate-300 font-gujarati block truncate">ઉત્તર ગુજરાત વીજ કંપની</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer shrink-0"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Portal & Officer Identity */}
            <div className="my-3 p-3 rounded-xl bg-[#132240]/90 border border-slate-800/90">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Active Portal</span>
                <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  {currentRole}
                </span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">{profile.label}</div>
              <div className="flex items-center gap-2.5 mt-2.5 pt-2.5 border-t border-slate-800/80 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {activeUser.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-100 font-semibold break-words leading-snug">
                    {activeUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 break-words leading-tight mt-0.5">
                    {activeUser.designation}
                  </div>
                </div>
              </div>
            </div>

            {/* Role Navigation Links */}
            <div className="px-1 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {currentRole === 'consumer' ? 'Consumer Services' : 'Workspace Modules'}
              </span>
            </div>

            <nav aria-label="Drawer Portal Navigation" className="flex-1 overflow-y-auto space-y-1 py-1">
              {links.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-[42px] flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={isActive ? 'text-white shrink-0' : 'text-slate-400 shrink-0'}>
                        {item.icon}
                      </span>
                      <span className="leading-snug break-words">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Tools & Session Footer */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsAIAssistantOpen(true);
                }}
                className="w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold text-teal-200 hover:text-white bg-teal-950/50 hover:bg-teal-900/50 border border-teal-800/50 flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Vidyut Mitra AI Assistant</span>
              </button>

              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsCommandPaletteOpen(true);
                  }}
                  className="p-2 rounded-lg bg-slate-800/90 text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-1 font-medium cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Search</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exitToWelcomeScreen();
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-slate-800/90 text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-1 font-medium cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    replayIntro();
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-200 hover:bg-blue-900 flex items-center justify-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Intro</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  logoutDemoSession();
                }}
                className="w-full min-h-[40px] py-2 px-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Sign Out (Switch Role)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
