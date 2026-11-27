import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  AlertTriangle,
  LayoutDashboard,
  Plug,
  PlusCircle,
  Receipt,
  CreditCard, Calendar,
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
  Activity,
  Users as UsersIcon,
  KeyRound,
  FileSearch,
  Server,
  ShieldCheck,
  Settings,
  MapPin
} from 'lucide-react';

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export const MobileNav: React.FC = () => {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    applications,
    complaints,
    workOrders,
    roleIncidents,
    userConnections,
    consumerBillingSummary,
    userApplications,
    userBills,
    userComplaints,
    userNotifications,
    setIsAIAssistantOpen
  } = useApp();
  const { language, t } = useLanguage();

  // Global counts for staff/admin roles
  const pendingApps = applications.filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected').length;
  const activeCmps = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const pendingWos = workOrders.filter(w => w.status !== 'Completed').length;
  const activeEmployeeIncidents = roleIncidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;

  // Scoped counts for active consumer account
  const consumerConnectionCount = (userConnections || []).length;
  const unpaidConsumerBills =
    consumerBillingSummary?.sidebarDueBadgeCount ??
    (userBills || []).filter(b => b.status === 'Unpaid' || b.status === 'Overdue' || b.status === 'Partially Paid').length;
  const activeConsumerCmps = (userComplaints || []).filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const activeConsumerApps = (userApplications || []).filter(a => a.status !== 'Meter Installed' && a.status !== 'Rejected').length;
  const unreadConsumerNotifs = (userNotifications || []).filter(n => !n.read).length;

  const getNavLinks = (): MobileNavItem[] => {
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
                    {
            id: 'calendar',
            label: language === 'gu' ? 'સ્માર્ટ કેલેન્ડર' : language === 'hi' ? 'स्मार्ट कैलेंडर' : language === 'mr' ? 'स्मार्ट दिनदर्शिका' : 'Payment Calendar',
            icon: <Calendar className="w-4 h-4" />,
            badge: unpaidConsumerBills > 0 ? unpaidConsumerBills : undefined
          },
          { id: 'payments', label: t.erp.navPaymentHistory, icon: <CreditCard className="w-4 h-4" /> },
          {
            id: 'complaints',
            label: t.erp.navComplaintDesk,
            icon: <MessageSquareWarning className="w-4 h-4" />,
            badge: activeConsumerCmps > 0 ? activeConsumerCmps : undefined
          },
          {
            id: 'outage-map',
            label: t.erp.navConsumerOutageStatus,
            icon: <MapPin className="w-4 h-4" />
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
          { id: 'transformers', label: t.erp.navTransformers, icon: <Cpu className="w-4 h-4" /> }, // Distribution Transformers
          { id: 'incidents', label: t.erp.navIncidentControlDesk, icon: <AlertTriangle className="w-4 h-4" />, badge: activeEmployeeIncidents > 0 ? activeEmployeeIncidents : undefined },
          { id: 'outage-map', label: t.erp.navOutageMap, icon: <MapPin className="w-4 h-4" /> },
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
          { id: 'transformers', label: t.erp.navTransformerInspections, icon: <Cpu className="w-4 h-4" /> }, // DTR Inspections
          { id: 'outage-map', label: t.erp.navOutageMap, icon: <MapPin className="w-4 h-4" /> },
          { id: 'workorders', label: t.erp.navWorkOrders, icon: <Wrench className="w-4 h-4" />, badge: pendingWos > 0 ? pendingWos : undefined },
          { id: 'inspections', label: t.erp.navSiteFeasibility, icon: <ClipboardCheck className="w-4 h-4" /> },
          { id: 'maintenance', label: t.erp.navFeederPatrol, icon: <HardHat className="w-4 h-4" /> },
          { id: 'offline', label: t.erp.navOfflineQueue, icon: <WifiOff className="w-4 h-4" /> },
          { id: 'history', label: t.erp.navCompletedJobs, icon: <History className="w-4 h-4" /> }
        ];
      case 'management':
        return [
          { id: 'dashboard', label: t.erp.navExecutiveCockpit, icon: <LineChart className="w-4 h-4" /> },
          { id: 'transformers', label: t.erp.navTransformerFleetHealth, icon: <Cpu className="w-4 h-4" /> }, // Transformer Fleet Health
          { id: 'outage-map', label: t.erp.navOutageMap, icon: <MapPin className="w-4 h-4" /> },
          { id: 'analytics', label: t.erp.navRevenueDemand, icon: <PieChart className="w-4 h-4" /> },
          { id: 'sla', label: t.erp.navSlaRedressal, icon: <Clock className="w-4 h-4" /> },
          { id: 'feeders', label: t.erp.navFeederOverloads, icon: <Cpu className="w-4 h-4" />, badge: `1 ${t.erp.alertSuffix}` },
          { id: 'ai-insights', label: t.erp.navAiInsights, icon: <Activity className="w-4 h-4" /> },
          { id: 'reports', label: t.erp.navExecutiveExport, icon: <BarChart3 className="w-4 h-4" /> }
        ];
      case 'admin':
        return [
          { id: 'overview', label: t.erp.navSystemOverview, icon: <Activity className="w-4 h-4" /> },
          { id: 'transformers', label: t.erp.navTransformerAssetRegistry, icon: <Cpu className="w-4 h-4" /> }, // Transformer Asset Registry
          { id: 'directory', label: t.erp.navUgvclDirectory, icon: <Network className="w-4 h-4" /> },
          { id: 'outage-map', label: t.erp.navOutageMap, icon: <MapPin className="w-4 h-4" /> },
          { id: 'users', label: t.erp.navUsersRoles, icon: <UsersIcon className="w-4 h-4" /> },
          { id: 'access', label: t.erp.navAccessMatrix, icon: <KeyRound className="w-4 h-4" /> },
          { id: 'audit', label: t.erp.navAuditTrail, icon: <FileSearch className="w-4 h-4" /> },
          { id: 'integrations', label: t.erp.navApiIntegrations, icon: <Server className="w-4 h-4" /> },
          { id: 'infra', label: t.erp.navInfraDb, icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'settings', label: t.erp.navSystemSettings, icon: <Settings className="w-4 h-4" /> }
        ];
    }
  };

  const links = getNavLinks();

  return (
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

        {currentRole === 'consumer' && (
          <button
            type="button"
            onClick={() => setIsAIAssistantOpen(true)}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>{t.erp.vidyutMitraAi}</span>
          </button>
        )}
      </nav>
  );
};

