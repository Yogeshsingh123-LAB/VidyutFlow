import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ROLE_PROFILES } from '../../data/mockData';
import {
  AlertTriangle,
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
  ShieldCheck,
  Users,
  KeyRound,
  FileSearch,
  Activity,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import { UgvclBrandIdentity } from '../common/UgvclBrandIdentity';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    applications,
    complaints,
    workOrders,
    roleIncidents,
    userConnections,
    userApplications,
    userBills,
    userComplaints,
    userNotifications,
    setIsAIAssistantOpen,
    exitToWelcomeScreen,
    activeUser
  } = useApp();
  const { t } = useLanguage();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Global counts for staff/admin roles
  const pendingApps = applications.filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected').length;
  const activeCmps = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const pendingWos = workOrders.filter(w => w.status !== 'Completed').length;
  const activeEmployeeIncidents = roleIncidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;

  // Scoped counts derived strictly from the active consumer account's authorized records
  const consumerConnectionCount = (userConnections || []).length;
  const unpaidConsumerBills = (userBills || []).filter(b => b.status === 'Unpaid').length;
  const activeConsumerCmps = (userComplaints || []).filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const activeConsumerApps = (userApplications || []).filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected').length;
  const unreadConsumerNotifs = (userNotifications || []).filter(n => !n.read).length;

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'consumer':
        return [
          { id: 'dashboard', label: t.erp.navDashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
          {
            id: 'connections',
            label: t.erp.navMyConnections,
            icon: <Plug className="w-4 h-4" />,
            badge: consumerConnectionCount > 0 ? consumerConnectionCount : undefined
          },
          { id: 'new-connection', label: t.erp.navNewConnection, icon: <PlusCircle className="w-4 h-4" /> },
          {
            id: 'bills',
            label: t.erp.navElectricityBills,
            icon: <Receipt className="w-4 h-4" />,
            badge: unpaidConsumerBills > 0 ? `${unpaidConsumerBills} ${t.erp.dueSuffix}` : undefined
          },
          { id: 'payments', label: t.erp.navPaymentHistory, icon: <CreditCard className="w-4 h-4" /> },
          {
            id: 'complaints',
            label: t.erp.navComplaintDesk,
            icon: <MessageSquareWarning className="w-4 h-4" />,
            badge: activeConsumerCmps > 0 ? activeConsumerCmps : undefined
          },
          {
            id: 'requests',
            label: t.erp.navServiceRequests,
            icon: <FileText className="w-4 h-4" />,
            badge: activeConsumerApps > 0 ? activeConsumerApps : undefined
          },
          {
            id: 'notifications',
            label: t.erp.navNotifications,
            icon: <Bell className="w-4 h-4" />,
            badge: unreadConsumerNotifs > 0 ? unreadConsumerNotifs : undefined
          },
          { id: 'profile', label: t.erp.navAccountProfile, icon: <User className="w-4 h-4" /> }
        ];

      case 'employee':
        return [
          { id: 'dashboard', label: t.erp.navErpOverview, icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'incidents', label: t.erp.navIncidentControlDesk, icon: <AlertTriangle className="w-4 h-4" />, badge: activeEmployeeIncidents > 0 ? activeEmployeeIncidents : undefined },
          { id: 'applications', label: t.erp.navApplicationQueue, icon: <Inbox className="w-4 h-4" />, badge: pendingApps > 0 ? pendingApps : undefined },
          { id: 'consumers', label: t.erp.navConsumerLedger, icon: <Database className="w-4 h-4" /> },
          { id: 'complaints', label: t.erp.navComplaintQueue, icon: <MessageSquareWarning className="w-4 h-4" />, badge: activeCmps > 0 ? activeCmps : undefined },
          { id: 'approvals', label: t.erp.navApprovalCenter, icon: <CheckSquare className="w-4 h-4" />, badge: pendingApps > 0 ? pendingApps : undefined },
          { id: 'coordination', label: t.erp.navDeptCoordination, icon: <Network className="w-4 h-4" /> },
          { id: 'reports', label: t.erp.navRevenueReports, icon: <BarChart3 className="w-4 h-4" /> }
        ];

      case 'field':
        return [
          { id: 'dashboard', label: t.erp.navFieldConsole, icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'workorders', label: t.erp.navWorkOrders, icon: <Wrench className="w-4 h-4" />, badge: pendingWos > 0 ? pendingWos : undefined },
          { id: 'inspections', label: t.erp.navSiteFeasibility, icon: <ClipboardCheck className="w-4 h-4" /> },
          { id: 'maintenance', label: t.erp.navFeederPatrol, icon: <HardHat className="w-4 h-4" /> },
          { id: 'offline', label: t.erp.navOfflineQueue, icon: <WifiOff className="w-4 h-4" /> },
          { id: 'history', label: t.erp.navCompletedJobs, icon: <History className="w-4 h-4" /> }
        ];

      case 'management':
        return [
          { id: 'dashboard', label: t.erp.navExecutiveCockpit, icon: <LineChart className="w-4 h-4" /> },
          { id: 'analytics', label: t.erp.navRevenueDemand, icon: <PieChart className="w-4 h-4" /> },
          { id: 'sla', label: t.erp.navSlaRedressal, icon: <Clock className="w-4 h-4" /> },
          { id: 'feeders', label: t.erp.navFeederOverloads, icon: <Cpu className="w-4 h-4" />, badge: `1 ${t.erp.alertSuffix}` },
          { id: 'ai-insights', label: t.erp.navAiInsights, icon: <Sparkles className="w-4 h-4" /> },
          { id: 'reports', label: t.erp.navExecutiveExport, icon: <BarChart3 className="w-4 h-4" /> }
        ];

      case 'admin':
        return [
          { id: 'overview', label: t.erp.navSystemOverview, icon: <Activity className="w-4 h-4" /> },
          { id: 'users', label: t.erp.navUsersRoles, icon: <Users className="w-4 h-4" />, badge: 12 },
          { id: 'access', label: t.erp.navAccessMatrix, icon: <KeyRound className="w-4 h-4" /> },
          { id: 'audit', label: t.erp.navAuditTrail, icon: <FileSearch className="w-4 h-4" /> },
          { id: 'integrations', label: t.erp.navApiIntegrations, icon: <Server className="w-4 h-4" /> },
          { id: 'infra', label: t.erp.navInfraDb, icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'settings', label: t.erp.navSystemSettings, icon: <Settings className="w-4 h-4" /> }
        ];
    }
  };

  const navItems = getNavItems();
  const profile = ROLE_PROFILES[currentRole];
  const roleLabelMap: Record<string, string> = {
    consumer: t.erp.roleConsumer,
    employee: t.erp.roleEmployee,
    field: t.erp.roleField,
    management: t.erp.roleManagement,
    admin: t.erp.roleAdmin
  };
  const roleBadgeMap: Record<string, string> = {
    consumer: t.erp.badgeConsumer,
    employee: t.erp.badgeEmployee,
    field: t.erp.badgeField,
    management: t.erp.badgeManagement,
    admin: t.erp.badgeAdmin
  };
  const localizedRoleLabel = roleLabelMap[currentRole] || profile.label;
  const localizedRoleBadge = roleBadgeMap[currentRole] || profile.badge;

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#0E1A32] text-slate-300 border-r border-slate-800/90 transition-all duration-200 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
        <UgvclBrandIdentity variant="sidebar" isCollapsed={isCollapsed} />

        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          title={isCollapsed ? t.erp.expandSidebar : t.erp.collapseSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Active Portal Identity Panel */}
      {!isCollapsed ? (
        <div className="p-3.5 mx-3 mt-3.5 mb-2 rounded-xl bg-[#132240]/90 border border-slate-800/90 shadow-xs">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              {t.erp.activePortal}
            </span>
            <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
              {currentRole}
            </span>
          </div>
          <div className="text-[13px] font-bold text-white truncate">
            {localizedRoleLabel}
          </div>
          <div className="flex items-center gap-2.5 mt-2.5 pt-2.5 border-t border-slate-800/90 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
              {activeUser.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-100 font-semibold truncate" title={activeUser.name}>
                {activeUser.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {activeUser.isCustomUser ? t.erp.registeredCitizen : localizedRoleBadge}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-2 my-3 flex justify-center">
          <div
            className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer"
            title={`${localizedRoleLabel} · ${activeUser.name} (${activeUser.initials})`}
          >
            {activeUser.initials}
          </div>
        </div>
      )}

      {/* Navigation Section Label */}
      {!isCollapsed && (
        <div className="px-5 pt-2 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {currentRole === 'consumer' ? t.erp.consumerServices : t.erp.workspaceModules}
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav aria-label="Main Portal Navigation" className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300/90 hover:text-white hover:bg-slate-800/70'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {item.icon}
              </div>
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800/90 text-slate-300 border border-slate-700/80'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Utility Bottom Actions */}
      <div className="p-3 border-t border-slate-800/80 space-y-1.5">
        <button
          type="button"
          onClick={exitToWelcomeScreen}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={t.erp.welcomeHub}
        >
          <Home className="w-4 h-4 text-cyan-400 shrink-0" />
          {!isCollapsed && <span className="truncate font-medium">{t.erp.welcomeHub}</span>}
        </button>

        <button
          type="button"
          onClick={() => setIsAIAssistantOpen(true)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-teal-300 hover:text-white bg-teal-950/40 hover:bg-teal-900/40 border border-teal-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title={t.erp.vidyutMitraAiAssistant}
        >
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          {!isCollapsed && <span className="truncate font-medium">{t.erp.vidyutMitraAi}</span>}
        </button>
      </div>
    </aside>
  );
};

