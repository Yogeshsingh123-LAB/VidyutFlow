import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ROLE_PROFILES } from '../../data/mockData';
import {
  Search,
  Bell,
  RotateCcw,
  RefreshCw,
  Home,
  Info,
  HelpCircle,
  ChevronDown,
  AlertTriangle,
  Zap,
  Phone,
  PlusCircle,
  Receipt,
  FileText,
  User,
  Inbox,
  MessageSquareWarning,
  CheckSquare,
  MapPin,
  Cpu,
  Database,
  BarChart3,
  Users,
  KeyRound,
  FileSearch,
  ShieldCheck,
  Settings,
  Server,
  Network,
  Wrench,
  ClipboardCheck,
  HardHat,
  WifiOff,
  History,
  LogOut,
  Activity
} from 'lucide-react';
import { PresentationAboutModal } from '../common/PresentationAboutModal';
import { LanguageSelector } from '../common/LanguageSelector';
import { EnterpriseAccountMenu, getAccountMenuLabels } from '../common/EnterpriseAccountMenu';

interface TopNavProps {
  onToggleMobileNav?: () => void;
}

export const TopNav: React.FC<TopNavProps> = () => {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    scopedNotifications,
    setIsNotificationDrawerOpen,
    setIsCommandPaletteOpen,
    replayIntro,
    exitToWelcomeScreen,
    logoutDemoSession,
    resetDemoData,
    activeUser,
    unreadIncidentsCount,
    criticalIncidentsCount,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsAIAssistantOpen
  } = useApp();
  const { t, language } = useLanguage();
  const accountLabels = getAccountMenuLabels(language);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isConfirmingHelpReset, setIsConfirmingHelpReset] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Dedicated Consumer Dropdowns
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
  const [isConsumerUserMenuOpen, setIsConsumerUserMenuOpen] = useState(false);

  const helpMenuRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);
  const consumerUserMenuRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setIsHelpMenuOpen(false);
      }
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(e.target as Node)) {
        setIsServicesMenuOpen(false);
      }
      if (supportMenuRef.current && !supportMenuRef.current.contains(e.target as Node)) {
        setIsSupportMenuOpen(false);
      }
      if (consumerUserMenuRef.current && !consumerUserMenuRef.current.contains(e.target as Node)) {
        setIsConsumerUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHelpMenuOpen(false);
        setIsServicesMenuOpen(false);
        setIsSupportMenuOpen(false);
        setIsConsumerUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // =========================================================================
  // CONSUMER, EMPLOYEE, ADMIN, MANAGEMENT & FIELD DEDICATED HEADER (1:1 with reference design)
  // =========================================================================
  if (currentRole === 'consumer' || currentRole === 'employee' || currentRole === 'admin' || currentRole === 'field' || currentRole === 'management') {
    return (
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 select-none">
        <PresentationAboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />

        {/* Left: UGVCL | VidyutFlow Brand + Home / Services / Support Tabs */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <div
            onClick={exitToWelcomeScreen}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            title="Return to VidyutFlow Homepage"
          >
            <img
              src="/assets/vidyutflow-logo.png"
              alt="UGVCL VidyutFlow"
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
            />
            <div className="h-5 w-px bg-slate-300 hidden sm:block" />
            <div className="hidden sm:block leading-tight">
              <div className="text-[10px] text-slate-600 font-bold tracking-wider uppercase">
                {currentRole === 'admin'
                  ? 'Admin Portal'
                  : currentRole === 'management'
                  ? 'Management Cockpit'
                  : currentRole === 'employee'
                  ? 'Employee Portal'
                  : currentRole === 'field'
                  ? 'Field Engineer Portal'
                  : 'Consumer Portal'}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (Home, Services/System/Field Ops, Support/Operations/Grid Assets) */}
          <div className="hidden lg:flex items-center gap-2 ml-2">
            {/* Home / Overview / Console Pill */}
            <button
              type="button"
              onClick={() => setActiveTab(currentRole === 'admin' ? 'overview' : 'dashboard')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' || (currentRole === 'admin' && activeTab === 'overview')
                  ? 'bg-[#EBF3FF] text-[#1E40AF]'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100'
              }`}
            >
              {currentRole === 'field' ? 'Console' : currentRole === 'admin' || currentRole === 'management' ? 'Overview' : 'Home'}
            </button>

            {/* Dropdown 1: System (Admin) / Executive (Management) / Field Ops (Field) / Services (Consumer & Employee) */}
            <div className="relative" ref={servicesMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsServicesMenuOpen(!isServicesMenuOpen);
                  setIsSupportMenuOpen(false);
                  setIsConsumerUserMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{currentRole === 'admin' ? 'System' : currentRole === 'management' ? 'Executive' : currentRole === 'field' ? 'Field Ops' : 'Services'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isServicesMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in">
                  {currentRole === 'admin' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('users');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>User Management</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('access');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-amber-600" />
                        <span>Access Matrix</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('audit');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <FileSearch className="w-4 h-4 text-purple-600" />
                        <span>Audit Trail & Forensic Logs</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('integrations');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Server className="w-4 h-4 text-emerald-600" />
                        <span>API Integrations & Keys</span>
                      </button>
                    </>
                  ) : currentRole === 'field' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('workorders');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span>Work Orders Queue</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('inspections');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                        <span>Site Feasibility & Meter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('maintenance');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <HardHat className="w-4 h-4 text-amber-600" />
                        <span>Feeder Patrol & Maintenance</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('offline');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <WifiOff className="w-4 h-4 text-purple-600" />
                        <span>Offline Field Sync Queue</span>
                      </button>
                    </>
                  ) : currentRole === 'employee' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('applications');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Inbox className="w-4 h-4 text-blue-600" />
                        <span>Application Queue</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('complaints');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquareWarning className="w-4 h-4 text-amber-600" />
                        <span>Complaint Queue</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('approvals');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>Approval Center</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('outage-map');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-purple-600" />
                        <span>Live Outage Map</span>
                      </button>
                    </>
                  ) : currentRole === 'management' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('analytics');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span>Revenue & Demand</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('feeders');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-amber-600" />
                        <span>Feeder Overloads</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('ai-insights');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <span>AI Executive Insights</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('outage-map');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-purple-600" />
                        <span>Live Outage Map</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('new-connection');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-blue-600" />
                        <span>Apply New Connection</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('bills');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <span>Electricity Bills & Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('requests');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>Solar Net-Metering & Requests</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('outage-map');
                          setIsServicesMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Live Outage Map</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Dropdown 2: Operations (Admin) / Grid Assets (Field) / Support (Consumer & Employee) */}
            <div className="relative" ref={supportMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSupportMenuOpen(!isSupportMenuOpen);
                  setIsServicesMenuOpen(false);
                  setIsConsumerUserMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{currentRole === 'admin' ? 'Operations' : currentRole === 'management' ? 'Governance' : currentRole === 'field' ? 'Grid Assets' : 'Support'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isSupportMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in">
                  {currentRole === 'admin' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('transformers');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Cpu className="w-4 h-4 text-blue-600" />
                        <span>Distribution Transformers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('directory');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Network className="w-4 h-4 text-indigo-600" />
                        <span>UGVCL Directory</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('outage-map');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <span>Outage Map & Timeline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('infra');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span>Infrastructure & Database</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('settings');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-slate-600" />
                        <span>System Settings</span>
                      </button>
                    </>
                  ) : currentRole === 'field' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('transformers');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Cpu className="w-4 h-4 text-blue-600" />
                        <span>Distribution Transformers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('outage-map');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <span>Outage Map & Timeline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('history');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <History className="w-4 h-4 text-emerald-600" />
                        <span>Completed Jobs History</span>
                      </button>
                    </>
                  ) : currentRole === 'employee' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('incidents');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Incident Control Desk</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('transformers');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Cpu className="w-4 h-4 text-blue-600" />
                        <span>Distribution Transformers</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('consumers');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Database className="w-4 h-4 text-emerald-600" />
                        <span>Consumer Ledger</span>
                      </button>
                    </>
                  ) : currentRole === 'management' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('sla');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>SLA & Redressal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('transformers');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Cpu className="w-4 h-4 text-emerald-600" />
                        <span>Transformer Fleet Health</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('reports');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4 text-amber-600" />
                        <span>Executive Reports</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href="tel:19124"
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span>24x7 Helpline: 19124</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('complaints');
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Report Complaint / Outage</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAboutModalOpen(true);
                          setIsSupportMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-cyan-600" />
                        <span>About UGVCL Platform</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 max-w-xs md:max-w-md mx-2 sm:mx-4 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            readOnly
            onClick={() => setIsCommandPaletteOpen(true)}
            placeholder={
              currentRole === 'admin'
                ? 'Search users, logs, or system records...'
                : currentRole === 'management'
                ? 'Search executive metrics, feeders, or SLA...'
                : currentRole === 'field'
                ? 'Search work orders, poles, or feeders...'
                : currentRole === 'employee'
                ? 'Search records...'
                : 'Search services, bills, or complaints...'
            }
            className="w-full h-9 pl-9 pr-4 rounded-full bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
          />
        </div>

        {/* Right Actions: Mobile Search + Vidyut Mitra (Consumer Only) + LanguageSelector + Bell + User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="sm:hidden p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Search utility records, bills & complaints"
            aria-label="Search records"
          >
            <Search className="w-4 h-4" />
          </button>
          {currentRole === 'consumer' && (
            <button
              type="button"
              onClick={() => setIsAIAssistantOpen(true)}
              data-testid="consumer-vidyut-mitra-btn"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
              title={t.erp.vidyutMitraAiAssistant}
            >
              <Cpu className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>{t.erp.vidyutMitraAi}</span>
            </button>
          )}
          {/* Shared Language Selector */}
          <LanguageSelector variant="erp" />

          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {currentRole === 'employee' ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                {unreadNotifications > 0 ? unreadNotifications : 1}
              </span>
            ) : currentRole === 'admin' ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                {unreadNotifications > 0 ? unreadNotifications : 2}
              </span>
            ) : (
              unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B00] ring-2 ring-white" />
              )
            )}
          </button>

          {/* User Profile Capsule Menu */}
          <div className="relative" ref={consumerUserMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsConsumerUserMenuOpen(!isConsumerUserMenuOpen);
                setIsServicesMenuOpen(false);
                setIsSupportMenuOpen(false);
              }}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#0A2540] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {activeUser.initials || (currentRole === 'field' ? 'VS' : currentRole === 'admin' ? 'AP' : currentRole === 'management' ? 'RS' : currentRole === 'employee' ? 'PR' : 'MP')}
              </div>
              <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[150px] truncate">
                {activeUser.name || (currentRole === 'field' ? 'Vikramaditya Solanki' : currentRole === 'admin' ? 'Anand Patel' : currentRole === 'management' ? 'Rajesh Solanki' : currentRole === 'employee' ? 'Priya Rathod' : 'Smt. Meenaben Patel')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isConsumerUserMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {activeUser.name || (currentRole === 'field' ? 'Vikramaditya Solanki' : currentRole === 'admin' ? 'Anand Patel' : currentRole === 'management' ? 'Rajesh Solanki' : currentRole === 'employee' ? 'Priya Rathod' : 'Smt. Meenaben Patel')}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {activeUser.id}
                  </div>
                </div>
                {currentRole !== 'employee' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(currentRole === 'admin' ? 'settings' : currentRole === 'field' || currentRole === 'management' ? 'dashboard' : 'profile');
                      setIsConsumerUserMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{currentRole === 'admin' ? 'System Settings' : currentRole === 'management' ? 'Management Cockpit' : currentRole === 'field' ? 'Field Console' : 'Account Profile'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void logoutDemoSession();
                    setIsConsumerUserMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="h-12 sm:h-16 bg-white border-b border-slate-200 px-3 min-[375px]:px-4 md:px-6 flex items-center justify-between gap-2 sticky top-0 z-30 select-none">
      <PresentationAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Left: Mobile Portal Title & Desktop Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Concise Mobile Portal Identity (< 640px) */}
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

