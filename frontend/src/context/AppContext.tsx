import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  UserRole,
  NewConnectionApplication,
  ComplaintRecord,
  ElectricityBill,
  PaymentTransaction,
  WorkOrder,
  AppNotification,
  ElectricityConnection,
  AuditLogItem,
  ConsumerProfile,
  EmployeeRecord,
  FieldEngineerRecord
} from '../types';
import {
  INITIAL_CONNECTIONS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_WORK_ORDERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  INITIAL_CONSUMERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS,
  ROLE_PROFILES
} from '../data/mockData';
import {
  DemoSession,
  DemoUser,
  DEFAULT_DEMO_ACCOUNTS,
  getStoredDemoSession,
  setStoredDemoSession,
  getCustomDemoUsers,
  saveCustomDemoUser,
  hashDemoPassword,
  verifyDemoPassword
} from '../data/demoAuthData';
import {
  ActiveUserIdentity,
  getActiveUserIdentity,
  getInitialsFromName
} from '../utils/avatarUtils';
import {
  AuthMode,
  getStoredAuthMode,
  setStoredAuthMode,
  isDevAuthModeSwitchEnabled,
  resolveEffectiveAuthMode,
  loginWithServerApi,
  signupWithServerApi,
  verifyServerSessionApi,
  logoutServerSessionApi
} from '../utils/authClient';
import { syncBackendSession, clearBackendSession } from '../utils/backendSession';

export type { ActiveUserIdentity, AuthMode };
export { getInitialsFromName };

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage quota or sandboxed iframe restriction
  }
}

interface AppContextType {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Centralized dynamic data collections
  consumers: ConsumerProfile[];
  connections: ElectricityConnection[];
  applications: NewConnectionApplication[];
  complaints: ComplaintRecord[];
  workOrders: WorkOrder[];
  employees: EmployeeRecord[];
  fieldEngineers: FieldEngineerRecord[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  notifications: AppNotification[];
  auditLogs: AuditLogItem[];
  // Offline simulation for Field Engineer
  isOfflineSimulated: boolean;
  setIsOfflineSimulated: (v: boolean) => void;
  // Cinematic Intro & Welcome Page states
  isIntroActive: boolean;
  setIsIntroActive: (v: boolean) => void;
  hasEnteredPlatform: boolean;
  setHasEnteredPlatform: (v: boolean) => void;
  replayIntro: () => void;
  exitToWelcomeScreen: () => void;
  // Modals and Drawers
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (v: boolean) => void;
  isRoleSwitcherModalOpen: boolean;
  setIsRoleSwitcherModalOpen: (v: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (v: boolean) => void;
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (v: boolean) => void;
  isWorkflowVisualizerOpen: boolean;
  setIsWorkflowVisualizerOpen: (v: boolean) => void;
  activeCaseDrawer: { type: 'application' | 'complaint' | 'workorder'; id: string } | null;
  openCaseDrawer: (type: 'application' | 'complaint' | 'workorder', id: string) => void;
  closeCaseDrawer: () => void;
  // Shared actions
  payBillDemo: (billNo: string, paymentMethod?: PaymentTransaction['paymentMethod']) => void;
  submitApplicationDemo: (appData: Partial<NewConnectionApplication>) => string;
  submitComplaintDemo: (cmpData: Partial<ComplaintRecord>) => string;
  updateApplicationStatus: (id: string, status: NewConnectionApplication['status'], note?: string) => void;
  updateComplaintStatus: (id: string, status: ComplaintRecord['status'], remark?: string) => void;
  updateWorkOrderStatus: (id: string, status: WorkOrder['status'], report?: WorkOrder['inspectionReport']) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addAuditEvent: (action: string, resource: string, metaDetail: string, actor?: string, status?: AuditLogItem['status']) => void;
  resetDemoData: () => void;
  // Toast notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  // Demonstration & Server Authentication Session & Controls
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  isVerifyingServerSession: boolean;
  demoSession: DemoSession | null;
  userConnections: ElectricityConnection[];
  userApplications: NewConnectionApplication[];
  userBills: ElectricityBill[];
  userPayments: PaymentTransaction[];
  userComplaints: ComplaintRecord[];
  userNotifications: AppNotification[];
  linkConnectionDemo: (consumerNo: string) => { success: boolean; error?: string; connection?: ElectricityConnection };
  loginDemoUser: (email: string, password: string, targetRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  signupDemoUser: (name: string, email: string, password: string, mobileNumber?: string) => Promise<{ success: boolean; error?: string }>;
  logoutDemoSession: () => Promise<void>;
  activeUser: ActiveUserIdentity;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ROLE_DEFAULT_TABS: Record<UserRole, string> = {
  consumer: 'dashboard',
  employee: 'dashboard',
  field: 'dashboard',
  management: 'dashboard',
  admin: 'overview'
};

export const VALID_CONSUMER_TABS = new Set<string>([
  'dashboard',
  'connections',
  'new-connection',
  'bills',
  'payments',
  'complaints',
  'requests',
  'notifications',
  'profile'
]);

export function resolvePostLoginTab(
  authenticatedRole: UserRole,
  pendingConsumerTab?: string | null
): string {
  if (
    authenticatedRole === 'consumer' &&
    pendingConsumerTab &&
    VALID_CONSUMER_TABS.has(pendingConsumerTab)
  ) {
    return pendingConsumerTab;
  }
  return ROLE_DEFAULT_TABS[authenticatedRole];
}

const VALID_ROLES: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

export function isValidDemoSession(session: unknown): session is DemoSession {
  if (!session || typeof session !== 'object') return false;
  const s = session as Partial<DemoSession>;
  if (!s.role || !VALID_ROLES.includes(s.role)) return false;
  if (!s.user || typeof s.user !== 'object') return false;
  if (s.user.role !== s.role) return false;
  if (!s.sessionToken || typeof s.sessionToken !== 'string') return false;
  if (!s.user.email || typeof s.user.email !== 'string') return false;
  return true;
}

export interface ParsedRoute {
  role?: UserRole;
  tab?: string;
  entered?: boolean;
  isExplicitPortalRequest?: boolean;
}

export function parseCurrentUrl(urlHref?: string): ParsedRoute {
  if (typeof window === 'undefined' && !urlHref) {
    return { entered: false, isExplicitPortalRequest: false };
  }

  let searchStr = '';
  let hashStr = '';
  let pathnameStr = '';

  if (urlHref) {
    try {
      const u = new URL(urlHref, 'http://localhost:3000');
      searchStr = u.search;
      hashStr = u.hash;
      pathnameStr = u.pathname;
    } catch {
      if (urlHref.startsWith('#')) {
        hashStr = urlHref;
      }
    }
  } else if (typeof window !== 'undefined') {
    searchStr = window.location.search;
    hashStr = window.location.hash;
    pathnameStr = window.location.pathname;
  }

  // 1. Check query parameters: e.g. ?role=admin&tab=overview
  const searchParams = new URLSearchParams(searchStr);
  const paramRole = searchParams.get('role') as UserRole | null;
  const paramTab = searchParams.get('tab');
  if (paramRole && VALID_ROLES.includes(paramRole)) {
    return {
      role: paramRole,
      tab: paramTab || ROLE_DEFAULT_TABS[paramRole],
      entered: true,
      isExplicitPortalRequest: true,
    };
  }

  // 2. Check hash route (e.g. #/admin, #/management, #/employee/applications, #field)
  const cleanHash = hashStr.replace(/^#\/?/, '').trim();
  if (cleanHash) {
    const hashParts = cleanHash.split('/').filter(Boolean);
    const candidateRole = hashParts[0] as UserRole;
    if (candidateRole && VALID_ROLES.includes(candidateRole)) {
      return {
        role: candidateRole,
        tab: hashParts[1] || ROLE_DEFAULT_TABS[candidateRole],
        entered: true,
        isExplicitPortalRequest: true,
      };
    }
  }

  // 3. Check pathname: e.g. /admin, /employee/applications, /consumer
  const segments = pathnameStr.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] === 'welcome') {
    return { entered: false, isExplicitPortalRequest: false };
  }

  const roleCandidate = segments[0] as UserRole;
  if (VALID_ROLES.includes(roleCandidate)) {
    return {
      role: roleCandidate,
      tab: segments[1] || ROLE_DEFAULT_TABS[roleCandidate],
      entered: true,
      isExplicitPortalRequest: true,
    };
  }

  return { entered: false, isExplicitPortalRequest: false };
}

export interface RouteAccessDecision {
  authorized: boolean;
  role: UserRole;
  tab: string;
  entered: boolean;
  redirectToWelcome: boolean;
  denialReason?: string;
}

export const UNAUTHORIZED_NAVIGATION_MESSAGE =
  'Please sign in with the appropriate account to access this portal.';

export function resolveRouteAccess(
  route: ParsedRoute,
  session: DemoSession | null | undefined
): RouteAccessDecision {
  const isSessionValid = isValidDemoSession(session);

  // 1. If an explicit portal route is requested in the URL:
  if (route.isExplicitPortalRequest && route.role) {
    // If not authenticated, deny immediately
    if (!isSessionValid || !session) {
      return {
        authorized: false,
        role: 'consumer',
        tab: 'dashboard',
        entered: false,
        redirectToWelcome: true,
        denialReason: UNAUTHORIZED_NAVIGATION_MESSAGE,
      };
    }

    // If authenticated, the requested portal must match the session's role
    if (session.role !== route.role) {
      return {
        authorized: false,
        role: session.role,
        tab: ROLE_DEFAULT_TABS[session.role],
        entered: false,
        redirectToWelcome: true,
        denialReason: UNAUTHORIZED_NAVIGATION_MESSAGE,
      };
    }

    // Legitimate matching session
    return {
      authorized: true,
      role: session.role,
      tab: route.tab || ROLE_DEFAULT_TABS[session.role],
      entered: true,
      redirectToWelcome: false,
    };
  }

  // 2. If the route explicitly requests leaving the platform (e.g. / or /welcome)
  if (route.entered === false) {
    return {
      authorized: isSessionValid,
      role: isSessionValid && session ? session.role : 'consumer',
      tab: isSessionValid && session ? ROLE_DEFAULT_TABS[session.role] : 'dashboard',
      entered: false,
      redirectToWelcome: false,
    };
  }

  // 3. Normal state / refresh without explicit portal URL parameter:
  if (isSessionValid && session) {
    return {
      authorized: true,
      role: session.role,
      tab: route.tab || ROLE_DEFAULT_TABS[session.role],
      entered: route.entered ?? true,
      redirectToWelcome: false,
    };
  }

  // 4. Default unauthenticated state: stay at welcome screen
  return {
    authorized: false,
    role: 'consumer',
    tab: 'dashboard',
    entered: false,
    redirectToWelcome: false,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authMode, setAuthModeState] = useState<AuthMode>(() =>
    resolveEffectiveAuthMode(getStoredAuthMode())
  );

  // Only read localStorage session when in development client 'demo' mode; in 'server' mode
  // (and unconditionally in production), localStorage sessions are ignored (never trusted, and never overwritten/deleted).
  const initialStoredSession = authMode === 'demo' ? getStoredDemoSession() : null;
  const validInitialSession =
    authMode === 'demo' && isValidDemoSession(initialStoredSession)
      ? initialStoredSession
      : null;

  if (authMode === 'demo' && initialStoredSession && !validInitialSession) {
    setStoredDemoSession(null);
  }

  const initialRoute = parseCurrentUrl();
  const initialDecision = resolveRouteAccess(initialRoute, validInitialSession);

  // Active Authentication Session:
  // - In 'server' mode: starts null and is populated ONLY after GET /api/auth/me or POST /api/auth/login succeeds.
  // - In 'demo' mode: restored from valid localStorage demo session.
  const [demoSession, setDemoSession] = useState<DemoSession | null>(validInitialSession);
  const [isVerifyingServerSession, setIsVerifyingServerSession] = useState<boolean>(
    authMode === 'server'
  );

  const [currentRole, setCurrentRoleState] = useState<UserRole>(initialDecision.role);

  const [activeTab, setActiveTabState] = useState<string>(initialDecision.tab);

  // Standardized light theme across all pages with dark navy sidebar
  const [theme] = useState<'light' | 'dark'>('light');

  // Intro state disabled by default so the public welcome homepage loads immediately
  const [isIntroActive, setIsIntroActive] = useState<boolean>(false);

  // Welcome page vs Workspace Platform view (strictly controlled by authorization)
  const [hasEnteredPlatform, setHasEnteredPlatformState] = useState<boolean>(
    authMode === 'server' ? false : initialDecision.entered
  );

  // Centralized dynamic datasets with localStorage persistence
  const [consumers, setConsumers] = useState<ConsumerProfile[]>(() =>
    loadStorage('vidyutone_consumers', INITIAL_CONSUMERS)
  );

  const [connections, setConnections] = useState<ElectricityConnection[]>(() =>
    loadStorage('vidyutone_connections', INITIAL_CONNECTIONS)
  );

  const [applications, setApplications] = useState<NewConnectionApplication[]>(() =>
    loadStorage('vidyutone_applications', INITIAL_APPLICATIONS)
  );

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() =>
    loadStorage('vidyutone_complaints', INITIAL_COMPLAINTS)
  );

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() =>
    loadStorage('vidyutone_workorders', INITIAL_WORK_ORDERS)
  );

  const [employees, setEmployees] = useState<EmployeeRecord[]>(() =>
    loadStorage('vidyutone_employees', INITIAL_EMPLOYEES)
  );

  const [fieldEngineers, setFieldEngineers] = useState<FieldEngineerRecord[]>(() =>
    loadStorage('vidyutone_fieldengineers', INITIAL_FIELD_ENGINEERS)
  );

  const [bills, setBills] = useState<ElectricityBill[]>(() =>
    loadStorage('vidyutone_bills', INITIAL_BILLS)
  );

  const [payments, setPayments] = useState<PaymentTransaction[]>(() =>
    loadStorage('vidyutone_payments', INITIAL_PAYMENTS)
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadStorage('vidyutone_notifications', INITIAL_NOTIFICATIONS)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() =>
    loadStorage('vidyutone_auditlogs', AUDIT_LOGS)
  );

  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);

  // Modals & Drawers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isRoleSwitcherModalOpen, setIsRoleSwitcherModalOpenState] = useState(false);
  const pendingConsumerTabRef = React.useRef<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isWorkflowVisualizerOpen, setIsWorkflowVisualizerOpen] = useState(false);
  const [activeCaseDrawer, setActiveCaseDrawer] = useState<{ type: 'application' | 'complaint' | 'workorder'; id: string } | null>(null);

  // Toast feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // LocalStorage sync effects for persistent state across page refreshes
  useEffect(() => { saveStorage('vidyutone_consumers', consumers); }, [consumers]);
  useEffect(() => { saveStorage('vidyutone_connections', connections); }, [connections]);
  useEffect(() => { saveStorage('vidyutone_applications', applications); }, [applications]);
  useEffect(() => { saveStorage('vidyutone_complaints', complaints); }, [complaints]);
  useEffect(() => { saveStorage('vidyutone_workorders', workOrders); }, [workOrders]);
  useEffect(() => { saveStorage('vidyutone_employees', employees); }, [employees]);
  useEffect(() => { saveStorage('vidyutone_fieldengineers', fieldEngineers); }, [fieldEngineers]);
  useEffect(() => { saveStorage('vidyutone_bills', bills); }, [bills]);
  useEffect(() => { saveStorage('vidyutone_payments', payments); }, [payments]);
  useEffect(() => { saveStorage('vidyutone_notifications', notifications); }, [notifications]);
  useEffect(() => { saveStorage('vidyutone_auditlogs', auditLogs); }, [auditLogs]);

  // Apply dark theme class to document element and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark');
    body.classList.remove('dark');
    try {
      localStorage.setItem('vidyutone_theme', 'light');
    } catch {}
  }, []);

  const toggleTheme = () => {
    // Theme standardized to clean light theme with dark navy sidebar
  };

  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Dynamically resolve active user identity & initials from session/role
  const activeUser = useMemo<ActiveUserIdentity>(() => {
    return getActiveUserIdentity(demoSession, currentRole);
  }, [demoSession, currentRole]);

  // Account-to-Consumer multi-tenant data scoping
  const userConnections = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return connections; // utility roles have global access
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();

    // Default fictional demo consumer owns the sample connections (04281-99231, 04281-77190)
    if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
      return connections.filter(
        c => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190' || c.accountId === 'demo_consumer'
      );
    }

    // Custom registered consumers only access connections specifically linked to their account
    const storedLinks = loadStorage<Record<string, string[]>>('vidyutflow_account_connections', {})[userId] || [];
    return connections.filter(
      c =>
        (c.accountId && c.accountId === userId) ||
        (c.accountEmail && c.accountEmail.toLowerCase() === userEmail) ||
        storedLinks.includes(c.consumerNo)
    );
  }, [demoSession, connections]);

  const userApplications = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return applications;
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();

    if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
      return applications.filter(
        a => a.accountId === 'demo_consumer' || a.email.toLowerCase() === 'meenaben.patel@example.com' || a.id === 'APP-2026-0842'
      );
    }

    return applications.filter(
      a => (a.accountId && a.accountId === userId) || (a.email && a.email.toLowerCase() === userEmail)
    );
  }, [demoSession, applications]);

  const userBills = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return bills;
    const userId = demoSession.user.id;
    const connectionNos = userConnections.map(c => c.consumerNo);
    return bills.filter(b => (b.accountId && b.accountId === userId) || connectionNos.includes(b.consumerNo));
  }, [demoSession, bills, userConnections]);

  const userPayments = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return payments;
    const userId = demoSession.user.id;
    const connectionNos = userConnections.map(c => c.consumerNo);
    return payments.filter(p => (p.accountId && p.accountId === userId) || connectionNos.includes(p.consumerNo));
  }, [demoSession, payments, userConnections]);

  const userComplaints = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return complaints;
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();
    const connectionNos = userConnections.map(c => c.consumerNo);

    if (userId === 'demo_consumer' || userEmail === 'consumer@vidyutflow.demo') {
      return complaints.filter(
        c => c.consumerNo === '04281-99231' || c.consumerNo === '04281-77190' || c.accountId === 'demo_consumer'
      );
    }

    return complaints.filter(
      c =>
        (c.accountId && c.accountId === userId) ||
        (c.consumerNo && connectionNos.includes(c.consumerNo))
    );
  }, [demoSession, complaints, userConnections]);

  const userNotifications = useMemo(() => {
    if (!demoSession) return [];
    if (demoSession.role !== 'consumer') return notifications;
    const userId = demoSession.user.id;
    const userEmail = (demoSession.user.email || '').toLowerCase();
    const connectionNos = userConnections.map(c => c.consumerNo);

    return notifications.filter(n => {
      if (n.targetRole !== 'consumer' && n.targetRole !== 'all') return false;

      // Filter out demo consumer specific notifications for newly registered accounts
      if (
        n.message.includes('04281-99231') ||
        n.message.includes('04281-77190') ||
        n.message.includes('APP-2026-0842')
      ) {
        return (
          userId === 'demo_consumer' ||
          userEmail === 'consumer@vidyutflow.demo' ||
          connectionNos.includes('04281-99231') ||
          connectionNos.includes('04281-77190')
        );
      }

      return true;
    });
  }, [demoSession, notifications, userConnections]);

  const linkConnectionDemo = (consumerNo: string): { success: boolean; error?: string; connection?: ElectricityConnection } => {
    if (!demoSession) {
      return { success: false, error: 'Authentication required to link utility accounts.' };
    }
    const cleanNo = consumerNo.trim();
    if (!cleanNo) {
      return { success: false, error: 'Please enter a valid UGVCL consumer number (e.g., 04281-99231).' };
    }

    const targetConn = connections.find(c => c.consumerNo.toLowerCase() === cleanNo.toLowerCase());
    if (!targetConn) {
      return {
        success: false,
        error: `Consumer connection #${cleanNo} was not found in the UGVCL master database. Sample active accounts: 04281-99231 (Residential) or 04281-77190 (Commercial).`
      };
    }

    const userId = demoSession.user.id;
    const storedLinks = loadStorage<Record<string, string[]>>('vidyutflow_account_connections', {});
    const userLinks = storedLinks[userId] || [];
    if (!userLinks.includes(targetConn.consumerNo)) {
      userLinks.push(targetConn.consumerNo);
      storedLinks[userId] = userLinks;
      saveStorage('vidyutflow_account_connections', storedLinks);
    }

    // Update connection state to record linkage
    setConnections(prev =>
      prev.map(c =>
        c.consumerNo === targetConn.consumerNo
          ? { ...c, accountId: userId, accountEmail: demoSession.user.email }
          : c
      )
    );

    // Create linking notification
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-LNK`,
      title: 'Electricity Connection Linked',
      message: `Consumer account #${targetConn.consumerNo} (${targetConn.tariffCategory}) was linked to your profile successfully.`,
      time: 'Just now',
      targetRole: 'consumer',
      type: 'success',
      read: false,
      category: 'Billing'
    };
    setNotifications(prev => [newNotif, ...prev]);

    addAuditEvent(
      'ACCOUNT_CONNECTION_LINKED',
      `CONN#${targetConn.consumerNo}`,
      `User ${demoSession.user.email} linked consumer #${targetConn.consumerNo}`
    );

    showToast(`Consumer #${targetConn.consumerNo} (${targetConn.tariffCategory}) linked successfully!`, 'success');
    return { success: true, connection: targetConn };
  };

  // Keep refs synchronized for popstate/hashchange handlers
  const demoSessionRef = React.useRef<DemoSession | null>(demoSession);
  useEffect(() => {
    demoSessionRef.current = demoSession;
  }, [demoSession]);

  const authModeRef = React.useRef<AuthMode>(authMode);
  useEffect(() => {
    authModeRef.current = authMode;
  }, [authMode]);

  // Verify session via GET /api/auth/me before granting access to any protected portal in 'server' mode
  useEffect(() => {
    if (authMode !== 'server') {
      setIsVerifyingServerSession(false);
      return;
    }

    let cancelled = false;
    setIsVerifyingServerSession(true);

    verifyServerSessionApi().then(result => {
      if (cancelled) return;
      setIsVerifyingServerSession(false);

      const currentRoute = parseCurrentUrl();
      if (result.authenticated && result.session) {
        const decision = resolveRouteAccess(currentRoute, result.session);
        setDemoSession(result.session);
        setCurrentRoleState(result.session.role);

        if (decision.redirectToWelcome) {
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
          }
          setHasEnteredPlatformState(false);
          setActiveTabState(ROLE_DEFAULT_TABS[result.session.role]);
          showToast(decision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
          return;
        }

        setActiveTabState(decision.tab);
        setHasEnteredPlatformState(decision.entered);
      } else {
        setDemoSession(null);
        setHasEnteredPlatformState(false);
        if (currentRoute.isExplicitPortalRequest) {
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/');
          }
          showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authMode]);

  // Initial check in 'demo' mode: if unauthorized URL was accessed on load, clean the URL and alert
  useEffect(() => {
    if (authMode === 'demo' && initialDecision.redirectToWelcome) {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      showToast(initialDecision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
    }
  }, []);

  // Browser History & Popstate/Hashchange integration with Auth Guards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onLocationChange = () => {
      const route = parseCurrentUrl();

      // In 'server' mode, NEVER trust localStorage session objects; enforce against server-verified session
      // and re-verify via GET /api/auth/me
      if (authModeRef.current === 'server') {
        const currentVerified = demoSessionRef.current;
        const decision = resolveRouteAccess(route, currentVerified);

        if (decision.redirectToWelcome) {
          window.history.replaceState(null, '', '/');
          setHasEnteredPlatformState(false);
          if (currentVerified) {
            setCurrentRoleState(currentVerified.role);
            setActiveTabState(decision.tab);
          } else {
            setDemoSession(null);
          }
          showToast(decision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
          return;
        }

        setHasEnteredPlatformState(decision.entered);
        setCurrentRoleState(decision.role);
        setActiveTabState(decision.tab);

        // Re-verify active server session with GET /api/auth/me on explicit portal navigation
        if (route.isExplicitPortalRequest) {
          verifyServerSessionApi().then(res => {
            if (!res.authenticated || !res.session || (route.role && res.session.role !== route.role)) {
              window.history.replaceState(null, '', '/');
              setHasEnteredPlatformState(false);
              if (!res.authenticated) {
                setDemoSession(null);
              }
              showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
            }
          });
        }
        return;
      }

      // Client 'demo' mode fallback
      const currentStored = getStoredDemoSession();
      const validSession = isValidDemoSession(currentStored) ? currentStored : null;
      const decision = resolveRouteAccess(route, validSession);

      if (decision.redirectToWelcome) {
        window.history.replaceState(null, '', '/');
        setHasEnteredPlatformState(false);
        if (validSession) {
          setCurrentRoleState(validSession.role);
          setActiveTabState(decision.tab);
        } else {
          setDemoSession(null);
        }
        showToast(decision.denialReason || UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
        return;
      }

      setHasEnteredPlatformState(decision.entered);
      setCurrentRoleState(decision.role);
      setActiveTabState(decision.tab);
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  // Development-only authentication mode switch ('server' vs 'demo')
  // Cannot be used in production to bypass server authentication.
  // Never resets or overwrites any demo data or localStorage records when switching modes.
  const setAuthMode = (mode: AuthMode) => {
    if (!isDevAuthModeSwitchEnabled()) {
      setAuthModeState('server');
      showToast('Client demo authentication mode is disabled in production.', 'warning');
      return;
    }
    const nextMode = resolveEffectiveAuthMode(mode);
    if (nextMode === authMode) return;
    setStoredAuthMode(nextMode);
    setAuthModeState(nextMode);

    if (nextMode === 'demo') {
      const existingDemo = getStoredDemoSession();
      const validDemo = isValidDemoSession(existingDemo) ? existingDemo : null;
      setDemoSession(validDemo);
      if (validDemo) {
        setCurrentRoleState(validDemo.role);
        setActiveTabState(ROLE_DEFAULT_TABS[validDemo.role]);
      } else {
        setHasEnteredPlatformState(false);
      }
      showToast('Switched to Client Demo Authentication mode (localStorage sandbox preserved).', 'info');
    } else {
      // Switching to 'server' mode: clear unverified client state and verify via GET /api/auth/me
      setDemoSession(null);
      setHasEnteredPlatformState(false);
      showToast('Switched to Server Authentication mode (HttpOnly cookie + scrypt verification).', 'info');
    }
  };

  const setHasEnteredPlatform = (entered: boolean) => {
    if (entered) {
      // Access requires a valid session
      if (!demoSession || !isValidDemoSession(demoSession)) {
        showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
        setHasEnteredPlatformState(false);
        setIsRoleSwitcherModalOpen(true);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/');
        }
        return;
      }
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        const segs = window.location.pathname.split('/').filter(Boolean);
        if (segs.length === 0 || segs[0] === 'welcome') {
          window.history.pushState(null, '', `/${currentRole}/${activeTab}`);
        }
      }
    } else {
      setHasEnteredPlatformState(false);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const setIsRoleSwitcherModalOpen = (open: boolean) => {
    if (!open) {
      pendingConsumerTabRef.current = null;
      if (!hasEnteredPlatform) {
        setActiveTabState(ROLE_DEFAULT_TABS[currentRole]);
      }
    }
    setIsRoleSwitcherModalOpenState(open);
  };

  const setActiveTab = (tab: string) => {
    if (!demoSession || !hasEnteredPlatform) {
      if (VALID_CONSUMER_TABS.has(tab) && tab !== 'dashboard') {
        pendingConsumerTabRef.current = tab;
        setCurrentRoleState('consumer');
      } else {
        pendingConsumerTabRef.current = null;
      }
      setActiveTabState(tab);
      return;
    }
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${currentRole}/${tab}`);
    }
  };

  const setRole = (role: UserRole) => {
    pendingConsumerTabRef.current = null;
    // Unauthenticated access prevention: cannot set role without active session
    if (!demoSession || !isValidDemoSession(demoSession)) {
      showToast(UNAUTHORIZED_NAVIGATION_MESSAGE, 'warning');
      setIsRoleSwitcherModalOpenState(true);
      return;
    }
    // Role-access enforcement: An authenticated user cannot switch to another role in-session
    if (demoSession.role !== role) {
      showToast(
        `Role Restricted: Your active session is bound to ${ROLE_PROFILES[demoSession.role].label}. Sign out to access another role.`,
        'error'
      );
      return;
    }
    setCurrentRoleState(role);
    try {
      localStorage.setItem('vidyutone_role', role);
    } catch {}
    const defaultTab = ROLE_DEFAULT_TABS[role];
    setActiveTabState(defaultTab);
    setHasEnteredPlatformState(true);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${role}/${defaultTab}`);
    }
  };

  const replayIntro = () => {
    setIsIntroActive(true);
    setHasEnteredPlatformState(false);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  };

  const exitToWelcomeScreen = () => {
    setHasEnteredPlatformState(false);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
    }
  };

  const loginDemoUser = async (
    email: string,
    password: string,
    targetRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    // -------------------------------------------------------------------------
    // SERVER AUTHENTICATION MODE (POST /api/auth/login + GET /api/auth/me)
    // Never falls back to client-side authentication if server login fails.
    // -------------------------------------------------------------------------
    if (authMode === 'server') {
      const serverResult = await loginWithServerApi(email, password, targetRole);
      if (!serverResult.success || !serverResult.session) {
        return {
          success: false,
          error: serverResult.error || 'Server authentication failed.'
        };
      }

      // Confirm session via GET /api/auth/me before granting access to the protected portal
      const meCheck = await verifyServerSessionApi();
      const verifiedSession =
        meCheck.authenticated && meCheck.session ? meCheck.session : serverResult.session;

      const assignedRole = verifiedSession.role;
      const targetTab = resolvePostLoginTab(assignedRole, pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;

      setDemoSession(verifiedSession);
      // Acquire the backend JWT for live API panels (fire-and-forget; degrades silently)
      void syncBackendSession(email, password, assignedRole);
      setCurrentRoleState(assignedRole);
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/${assignedRole}/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(
        `Authenticated via Server Session as ${verifiedSession.user.name} (${ROLE_PROFILES[assignedRole].label}).`,
        'success'
      );
      addAuditEvent(
        'SERVER_AUTH_LOGIN',
        `Workspace:${assignedRole}`,
        `Server-verified scrypt login for ${verifiedSession.user.email}`,
        verifiedSession.user.name,
        'SUCCESS'
      );
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // CLIENT DEMO AUTHENTICATION MODE (Original localStorage sandbox)
    // -------------------------------------------------------------------------
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check default preconfigured demo accounts first
    const defaultAcc = Object.values(DEFAULT_DEMO_ACCOUNTS).find(
      acc => acc.email.toLowerCase() === trimmedEmail
    );

    if (defaultAcc) {
      if (defaultAcc.password !== password) {
        return { success: false, error: 'Incorrect demonstration password. (Sample accounts use Demo@12345)' };
      }
      if (defaultAcc.role !== targetRole) {
        return {
          success: false,
          error: `This demonstration account is authorized for ${DEFAULT_DEMO_ACCOUNTS[defaultAcc.role].roleLabel}. Please switch target role to ${DEFAULT_DEMO_ACCOUNTS[defaultAcc.role].roleLabel}.`
        };
      }

      const newSession: DemoSession = {
        user: {
          id: defaultAcc.role === 'consumer' ? 'demo_consumer' : `demo_${defaultAcc.role}`,
          email: defaultAcc.email,
          name: defaultAcc.name,
          role: defaultAcc.role,
          designation: defaultAcc.designation
        },
        role: defaultAcc.role,
        loginTime: new Date().toISOString(),
        sessionToken: `vidyutflow_demo_${Date.now()}`
      };

      setStoredDemoSession(newSession);
      setDemoSession(newSession);
      setCurrentRoleState(defaultAcc.role);
      void syncBackendSession(email, password, defaultAcc.role);
      try {
        localStorage.setItem('vidyutone_role', defaultAcc.role);
      } catch {}
      const targetTab = resolvePostLoginTab(defaultAcc.role, pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/${defaultAcc.role}/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(`Authenticated as ${defaultAcc.name} (${defaultAcc.roleLabel}). Welcome to VidyutFlow!`, 'success');
      addAuditEvent('DEMO_AUTH_LOGIN', `Workspace:${defaultAcc.role}`, `Logged in as ${defaultAcc.email}`, defaultAcc.name, 'SUCCESS');
      return { success: true };
    }

    // 2. Check custom registered demo consumers
    const customUsers = getCustomDemoUsers();
    const customUser = customUsers.find(u => u.email.toLowerCase() === trimmedEmail);

    if (customUser) {
      if (!verifyDemoPassword(password, customUser.passwordHash)) {
        return { success: false, error: 'Incorrect password for custom consumer account.' };
      }
      if (targetRole !== 'consumer') {
        return {
          success: false,
          error: 'Registered accounts are granted the Consumer role only. Please select Consumer Portal.'
        };
      }

      const newSession: DemoSession = {
        user: {
          id: customUser.id,
          email: customUser.email,
          name: customUser.name,
          role: 'consumer',
          mobileNumber: customUser.mobileNumber,
          isCustomSignup: true
        },
        role: 'consumer',
        loginTime: new Date().toISOString(),
        sessionToken: `vidyutflow_demo_${Date.now()}`
      };

      setStoredDemoSession(newSession);
      setDemoSession(newSession);
      setCurrentRoleState('consumer');
      try {
        localStorage.setItem('vidyutone_role', 'consumer');
      } catch {}
      const targetTab = resolvePostLoginTab('consumer', pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/consumer/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      void syncBackendSession(email, password, 'consumer');
      showToast(`Welcome back, ${customUser.name}! Consumer Portal loaded.`, 'success');
      addAuditEvent('DEMO_AUTH_LOGIN', 'Workspace:consumer', `Custom user login: ${customUser.email}`, customUser.name, 'SUCCESS');
      return { success: true };
    }

    return {
      success: false,
      error: 'Demonstration account not found. Please click a "Use Demo Account" quick chip or register as a consumer.'
    };
  };

  const signupDemoUser = async (
    name: string,
    email: string,
    password: string,
    mobileNumber?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // -------------------------------------------------------------------------
    // SERVER AUTHENTICATION MODE (POST /api/auth/signup + GET /api/auth/me)
    // Never falls back to client-side signup if server registration fails.
    // -------------------------------------------------------------------------
    if (authMode === 'server') {
      const serverResult = await signupWithServerApi(name, email, password, mobileNumber);
      if (!serverResult.success || !serverResult.session) {
        return {
          success: false,
          error: serverResult.error || 'Consumer registration failed on server.'
        };
      }

      const meCheck = await verifyServerSessionApi();
      const verifiedSession =
        meCheck.authenticated && meCheck.session ? meCheck.session : serverResult.session;

      const targetTab = resolvePostLoginTab('consumer', pendingConsumerTabRef.current);
      pendingConsumerTabRef.current = null;
      setDemoSession(verifiedSession);
      setCurrentRoleState('consumer');
      setActiveTabState(targetTab);
      setHasEnteredPlatformState(true);
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', `/consumer/${targetTab}`);
      }
      setIsRoleSwitcherModalOpenState(false);
      showToast(
        `Consumer registration successful! Welcome, ${verifiedSession.user.name}.`,
        'success'
      );
      addAuditEvent(
        'SERVER_AUTH_SIGNUP',
        'Consumer Account Registered',
        `Server-registered consumer: ${verifiedSession.user.email}`,
        verifiedSession.user.name,
        'SUCCESS'
      );
      return { success: true };
    }

    // -------------------------------------------------------------------------
    // CLIENT DEMO AUTHENTICATION MODE (Original localStorage sandbox)
    // -------------------------------------------------------------------------
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // Check duplicate with default accounts
    const isDefault = Object.values(DEFAULT_DEMO_ACCOUNTS).some(
      a => a.email.toLowerCase() === trimmedEmail
    );
    if (isDefault) {
      return { success: false, error: 'This email is already registered as a default demonstration account. Please use Sign In directly.' };
    }

    // Check duplicate with custom accounts
    const customUsers = getCustomDemoUsers();
    if (customUsers.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'An account with this email already exists in local demo storage. Please sign in.' };
    }

    const newUser: DemoUser = {
      id: `usr_${Date.now()}`,
      email: trimmedEmail,
      name: trimmedName,
      role: 'consumer',
      mobileNumber: mobileNumber?.trim(),
      passwordHash: hashDemoPassword(password),
      createdAt: new Date().toISOString(),
      isCustomSignup: true
    };

    saveCustomDemoUser(newUser);

    // Auto-login the newly created consumer
    const newSession: DemoSession = {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: 'consumer',
        mobileNumber: newUser.mobileNumber,
        isCustomSignup: true
      },
      role: 'consumer',
      loginTime: new Date().toISOString(),
      sessionToken: `vidyutflow_demo_${Date.now()}`
    };

    setStoredDemoSession(newSession);
    setDemoSession(newSession);
    setCurrentRoleState('consumer');
    try {
      localStorage.setItem('vidyutone_role', 'consumer');
    } catch {}
    const targetTab = resolvePostLoginTab('consumer', pendingConsumerTabRef.current);
    pendingConsumerTabRef.current = null;
    setActiveTabState(targetTab);
    setHasEnteredPlatformState(true);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/consumer/${targetTab}`);
    }
    setIsRoleSwitcherModalOpenState(false);
    void syncBackendSession(email, password, 'consumer');
    showToast(`Consumer registration successful! Welcome, ${newUser.name}.`, 'success');
    addAuditEvent('DEMO_AUTH_SIGNUP', 'Consumer Account Registered', `New consumer created: ${newUser.email}`, newUser.name, 'SUCCESS');
    return { success: true };
  };

  const logoutDemoSession = async (): Promise<void> => {
    pendingConsumerTabRef.current = null;
    clearBackendSession();
    if (authMode === 'server') {
      await logoutServerSessionApi();
      setDemoSession(null);
      setCurrentRoleState('consumer');
      setActiveTabState('dashboard');
      setHasEnteredPlatformState(false);
      setIsRoleSwitcherModalOpenState(false);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      showToast('Server session revoked and logged out. Returned to public homepage.', 'info');
      return;
    }

    setStoredDemoSession(null);
    setDemoSession(null);
    setCurrentRoleState('consumer');
    setActiveTabState('dashboard');
    setHasEnteredPlatformState(false);
    setIsRoleSwitcherModalOpenState(false);
    try {
      localStorage.removeItem('vidyutone_role');
    } catch {}
    if (typeof window !== 'undefined') {
      // Use replaceState to overwrite the current history entry so Back button cannot reopen protected portal
      window.history.replaceState(null, '', '/');
    }
    showToast('Logged out of demo session. Returned to public homepage.', 'info');
  };

  const openCaseDrawer = (type: 'application' | 'complaint' | 'workorder', id: string) => {
    setActiveCaseDrawer({ type, id });
  };

  const closeCaseDrawer = () => {
    setActiveCaseDrawer(null);
  };

  const addAuditEvent = (
    action: string,
    resource: string,
    metaDetail: string,
    actor?: string,
    status: AuditLogItem['status'] = 'SUCCESS'
  ) => {
    const profile = ROLE_PROFILES[currentRole];
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newEvent: AuditLogItem = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: `15-Oct ${ts}`,
      actor: actor || profile.personaName,
      role: profile.badge,
      action,
      resource,
      ipAddress: '10.42.8.114 (UGVCL VPN)',
      status,
      metaDetail
    };
    setAuditLogs(prev => [newEvent, ...prev]);
  };

  // Keyboard shortcut for Cmd+K command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Demo Actions
  const payBillDemo = (billNo: string, paymentMethod: PaymentTransaction['paymentMethod'] = 'UPI / BHIM') => {
    const targetBill = bills.find(b => b.billNo === billNo);
    if (!targetBill) return;

    const txId = `TXN-UPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}-Oct-2026 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Mark bill paid
    setBills(prev =>
      prev.map(b => (b.billNo === billNo ? { ...b, status: 'Paid', paidDate: formattedDate, transactionRef: txId } : b))
    );

    // Add payment entry
    const newPayment: PaymentTransaction = {
      txId,
      consumerNo: targetBill.consumerNo,
      billNo: targetBill.billNo,
      date: formattedDate,
      amount: targetBill.totalAmount,
      paymentMethod,
      status: 'Successful',
      bankReference: `SBI/BBPS/${Math.floor(1000000000 + Math.random() * 9000000000)}`
    };
    setPayments(prev => [newPayment, ...prev]);

    // Add notification
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      title: 'Payment Successful',
      message: `₹${targetBill.totalAmount.toLocaleString()} paid for Bill #${targetBill.billNo}. Reference: ${txId}`,
      time: 'Just now',
      targetRole: 'consumer',
      type: 'success',
      read: false,
      category: 'Billing'
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Record audit event
    addAuditEvent(
      'BILL_PAYMENT_COLLECTED',
      `BILL#${targetBill.billNo}`,
      `₹${targetBill.totalAmount.toLocaleString()} paid via ${paymentMethod} (Ref: ${txId})`
    );

    showToast(`Payment of ₹${targetBill.totalAmount.toLocaleString()} completed successfully! Receipt generated.`, 'success');
  };

  const submitApplicationDemo = (data: Partial<NewConnectionApplication>) => {
    const newIndex = applications.length + 1;
    const newId = `APP-2026-084${newIndex}`;
    const kw = data.requestedLoadKw || 5;
    const estCost = data.estimatedSanctionCost || (kw * 1150 + 2100);

    const currentUserId = demoSession?.user.id || 'anonymous';
    const currentUserEmail = demoSession?.user.email || data.email || 'applicant@example.com';
    const currentUserName = demoSession?.user.name || data.applicantName || 'Applicant Name';

    const newApp: NewConnectionApplication = {
      id: newId,
      applicantName: data.applicantName || currentUserName,
      phone: data.phone || demoSession?.user.mobileNumber || '+91 98250 00000',
      email: data.email || currentUserEmail,
      address: data.address || '14 Anand Nagar, Mehsana',
      subdivision: data.subdivision || 'Mehsana City North',
      category: data.category || 'Residential (RGPU)',
      requestedLoadKw: kw,
      phase: data.phase || (kw > 5 ? '3-Phase' : '1-Phase'),
      premisesType: data.premisesType || 'Owned',
      status: 'Submitted',
      appliedDate: '15-Oct-2026',
      targetCompletionDate: '30-Oct-2026',
      assignedOfficer: 'Rajesh V. Trivedi (AE Ops)',
      assignedEngineer: 'Vikramaditya Solanki (JE Field)',
      estimatedSanctionCost: estCost,
      documentsSubmitted: data.documentsSubmitted && data.documentsSubmitted.length > 0
        ? data.documentsSubmitted
        : ['Identity Proof (Aadhaar / PAN)', 'Premises Ownership Deed / Index-II', 'Wiring Test Certificate'],
      workflowStep: 1,
      accountId: currentUserId,
      notesHistory: [
        {
          timestamp: '15-Oct 06:19',
          author: 'Citizen Self-Service Portal',
          note: `New LT connection application registered for ${kw} kW ${data.category || 'Residential'} supply at ${data.subdivision || 'Mehsana'}.`
        }
      ]
    };

    setApplications(prev => [newApp, ...prev]);

    // Notify employee role
    const employeeNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-EMP`,
      title: `New Sanction File: ${newId}`,
      message: `${newApp.applicantName} filed application for ${newApp.requestedLoadKw}kW ${newApp.category} in ${newApp.subdivision}.`,
      time: 'Just now',
      targetRole: 'employee',
      type: 'info',
      read: false,
      category: 'Approval'
    };

    // Notify consumer
    const consumerNotif: AppNotification = {
      id: `NOTIF-${Date.now()}-CNS`,
      title: `Application Registered: ${newId}`,
      message: `Your application has been received. Estimated sanction cost: ₹${estCost.toLocaleString()}. Tracking enabled.`,
      time: 'Just now',
      targetRole: 'consumer',
      type: 'success',
      read: false,
      category: 'Approval'
    };

    setNotifications(prev => [employeeNotif, consumerNotif, ...prev]);

    // Record audit event
    addAuditEvent(
      'NEW_CONNECTION_APPLICATION_SUBMITTED',
      newId,
      `Applicant: ${newApp.applicantName}, Load: ${kw}kW, Subdiv: ${newApp.subdivision}`
    );

    showToast(`Application ${newId} submitted successfully! Available across portals.`, 'success');
    return newId;
  };

  const submitComplaintDemo = (data: Partial<ComplaintRecord>) => {
    const newIndex = complaints.length + 1;
    const newId = `CMP-882${newIndex}`;
    const prio = data.priority || 'High';
    const slaHours = prio === 'Critical' ? 4 : prio === 'High' ? 12 : 24;

    const currentUserId = demoSession?.user.id || 'anonymous';
    const currentUserName = demoSession?.user.name || data.consumerName || 'Citizen Consumer';
    const currentUserPhone = demoSession?.user.mobileNumber || data.phone || '+91 98000 00000';

    const newCmp: ComplaintRecord = {
      id: newId,
      consumerNo: data.consumerNo || 'UNLINKED',
      consumerName: data.consumerName || currentUserName,
      phone: data.phone || currentUserPhone,
      category: data.category || 'Power Outage',
      description: data.description || 'Power supply issue reported.',
      priority: prio,
      status: 'Registered',
      subdivision: data.subdivision || 'Mehsana City North',
      feederName: data.feederName || 'Local Feeder',
      filedAt: '15-Oct-2026 06:19',
      slaTargetHours: slaHours,
      slaDueTime: '15-Oct-2026 18:19',
      slaBreached: false,
      accountId: currentUserId,
      timeline: [
        {
          time: '15-Oct 06:19',
          stage: 'Registered',
          actor: 'Consumer Portal',
          remark: 'Grievance ticket created. Sent to automated triage queue.'
        }
      ]
    };

    setComplaints(prev => [newCmp, ...prev]);

    // Auto-create a field work order if high or critical
    if (newCmp.priority === 'High' || newCmp.priority === 'Critical') {
      const woId = `WO-440${workOrders.length + 1}`;
      const newWo: WorkOrder = {
        id: woId,
        title: `Grievance Rectification: ${newCmp.category} (${newId})`,
        type: 'Feeder Patrol & Maintenance',
        subdivision: newCmp.subdivision,
        feederName: newCmp.feederName,
        location: `${newCmp.consumerName}, ${newCmp.consumerNo}`,
        gpsCoordinates: { lat: 23.6028, lng: 72.3984 },
        consumerNo: newCmp.consumerNo,
        consumerName: newCmp.consumerName,
        priority: newCmp.priority === 'Critical' ? 'Emergency' : 'High',
        scheduledDate: '15-Oct-2026',
        status: 'Pending',
        assignedTo: 'Vikramaditya Solanki (JE Field)',
        materialsNeeded: ['Safety Gear', 'Digital Clamp Meter', 'Insulated Tool Kit']
      };
      setWorkOrders(prev => [newWo, ...prev]);

      const fieldNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-FLD`,
        title: `Urgent Field Dispatch: ${woId}`,
        message: `${newCmp.category} reported at ${newCmp.subdivision}. Assigned to JE Field.`,
        time: 'Just now',
        targetRole: 'field',
        type: 'alert',
        read: false,
        category: 'Outage'
      };
      setNotifications(prev => [fieldNotif, ...prev]);
    }

    addAuditEvent(
      'GRIEVANCE_REGISTERED',
      newId,
      `Category: ${newCmp.category}, Consumer: ${newCmp.consumerNo}, Priority: ${prio}`
    );

    showToast(`Complaint ${newId} registered successfully! Assigned SLA: ${slaHours}h.`, 'success');
    return newId;
  };

  const updateApplicationStatus = (id: string, status: NewConnectionApplication['status'], note?: string) => {
    const stepMap: Record<NewConnectionApplication['status'], number> = {
      'Submitted': 1,
      'Document Verification': 2,
      'Site Inspection': 3,
      'Sanction Approval': 4,
      'Meter Installed': 5,
      'Rejected': 0
    };

    let updatedTargetApp: NewConnectionApplication | null = null;

    setApplications(prev =>
      prev.map(app => {
        if (app.id !== id) return app;
        const newHistory = note
          ? [...app.notesHistory, { timestamp: '15-Oct 06:19', author: 'Rajesh V. Trivedi (AE)', note }]
          : app.notesHistory;
        const updated: NewConnectionApplication = {
          ...app,
          status,
          workflowStep: stepMap[status],
          notesHistory: newHistory
        };
        updatedTargetApp = updated;
        return updated;
      })
    );

    // If moved to Site Inspection, automatically dispatch a Work Order for the Field Engineer
    if (status === 'Site Inspection' && updatedTargetApp) {
      const targetApp = updatedTargetApp as NewConnectionApplication;
      const woId = `WO-INS-${targetApp.id.replace('APP-', '')}`;
      const existingWo = workOrders.find(w => w.id === woId);
      if (!existingWo) {
        const newWo: WorkOrder = {
          id: woId,
          title: `Site Feasibility & Meter Load Inspection (${targetApp.id})`,
          type: 'New Connection Verification',
          subdivision: targetApp.subdivision,
          feederName: '11kV Visnagar Road Feeder',
          location: `${targetApp.applicantName}, ${targetApp.address}`,
          gpsCoordinates: { lat: 23.6042, lng: 72.3995 },
          consumerName: targetApp.applicantName,
          priority: 'High',
          scheduledDate: '15-Oct-2026',
          status: 'Pending',
          assignedTo: 'Vikramaditya Solanki (JE Field)',
          materialsNeeded: ['Earthing Resistance Meter', 'GPS Geotag Camera', 'Digital Clamp Meter']
        };
        setWorkOrders(prev => [newWo, ...prev]);

        // Field Notification
        const fieldNotif: AppNotification = {
          id: `NOTIF-${Date.now()}-FLD-INS`,
          title: `New Site Inspection Order: ${woId}`,
          message: `Feasibility check scheduled for ${targetApp.applicantName} (${targetApp.requestedLoadKw}kW) in ${targetApp.subdivision}.`,
          time: 'Just now',
          targetRole: 'field',
          type: 'info',
          read: false,
          category: 'Inspection'
        };
        setNotifications(prev => [fieldNotif, ...prev]);
      }
    }

    // If moved to Meter Installed, automatically provision a new active Electricity Connection!
    if (status === 'Meter Installed' && updatedTargetApp) {
      const targetApp = updatedTargetApp as NewConnectionApplication;
      const newConsumerNo = `04281-${Math.floor(10000 + Math.random() * 90000)}`;
      const newMeterNo = `MTR-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      const newConn: ElectricityConnection = {
        consumerNo: newConsumerNo,
        connectionId: `CONN-${targetApp.id.replace('APP-', '')}`,
        consumerName: targetApp.applicantName,
        meterNo: newMeterNo,
        sanctionedLoadKw: targetApp.requestedLoadKw,
        phase: targetApp.phase,
        tariffCategory: targetApp.category,
        address: targetApp.address,
        subdivision: targetApp.subdivision,
        feederName: '11kV Visnagar Road Feeder',
        status: 'Active',
        connectedDate: '15-Oct-2026',
        lastReadingDate: '15-Oct-2026',
        currentReadingKwh: 12,
        previousReadingKwh: 0,
        averageMonthlyKwh: targetApp.requestedLoadKw * 60,
        securityDeposit: targetApp.estimatedSanctionCost * 0.4
      };

      setConnections(prev => [newConn, ...prev]);

      const connNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-MTR`,
        title: `Service Energized: ${newConsumerNo}`,
        message: `Smart meter #${newMeterNo} installed and energized for ${targetApp.applicantName}.`,
        time: 'Just now',
        targetRole: 'consumer',
        type: 'success',
        read: false,
        category: 'Approval'
      };
      setNotifications(prev => [connNotif, ...prev]);
    }

    addAuditEvent(
      'APPLICATION_STATUS_UPDATED',
      id,
      `New status: ${status} (Stage ${stepMap[status]}/5). ${note || ''}`
    );

    showToast(`Application ${id} status updated to "${status}"`, 'info');
  };

  const updateComplaintStatus = (id: string, status: ComplaintRecord['status'], remark?: string) => {
    setComplaints(prev =>
      prev.map(cmp => {
        if (cmp.id !== id) return cmp;
        const newTimeline = [
          ...cmp.timeline,
          {
            time: '15-Oct 06:19',
            stage: status,
            actor: 'UGVCL Operations Desk',
            remark: remark || `Status progressed to ${status}`
          }
        ];
        return {
          ...cmp,
          status,
          timeline: newTimeline,
          ...(status === 'Resolved' ? { resolvedAt: '15-Oct-2026 06:19', resolutionRemarks: remark } : {})
        };
      })
    );

    addAuditEvent(
      'GRIEVANCE_STATUS_UPDATED',
      id,
      `New status: ${status}. Remarks: ${remark || 'None'}`
    );

    showToast(`Complaint ${id} marked as "${status}"`, 'info');
  };

  const updateWorkOrderStatus = (id: string, status: WorkOrder['status'], report?: WorkOrder['inspectionReport']) => {
    setWorkOrders(prev =>
      prev.map(wo => {
        if (wo.id !== id) return wo;
        return {
          ...wo,
          status,
          ...(report ? { inspectionReport: report } : {})
        };
      })
    );

    // If site inspection completed for an application, advance application to Sanction Approval
    if (status === 'Completed' && id.startsWith('WO-INS-')) {
      const appId = id.replace('WO-INS-', 'APP-');
      setApplications(prev =>
        prev.map(app => {
          if (app.id !== appId) return app;
          return {
            ...app,
            status: 'Sanction Approval',
            workflowStep: 4,
            notesHistory: [
              ...app.notesHistory,
              {
                timestamp: '15-Oct 06:19',
                author: 'Vikramaditya Solanki (JE Field)',
                note: `Site Feasibility verified. Meter #${report?.meterSerialScanned || 'Verified'}, voltage normal (${report?.testedPhaseVoltage.r || 230}V). Clearance passed for sanction release.`
              }
            ]
          };
        })
      );

      // Notify employee
      const employeeNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-EMP-SANCTION`,
        title: `Site Feasibility Passed: ${appId}`,
        message: `Field Engineer completed site inspection for ${appId}. File is now at Sanction Approval step.`,
        time: 'Just now',
        targetRole: 'employee',
        type: 'success',
        read: false,
        category: 'Approval'
      };

      // Notify consumer
      const consumerNotif: AppNotification = {
        id: `NOTIF-${Date.now()}-CNS-SANCTION`,
        title: `Technical Feasibility Cleared: ${appId}`,
        message: 'Field engineer verified electrical load and earthing clearance. Ready for final sanction approval.',
        time: 'Just now',
        targetRole: 'consumer',
        type: 'info',
        read: false,
        category: 'Inspection'
      };

      setNotifications(prev => [employeeNotif, consumerNotif, ...prev]);
    }

    // If emergency complaint rectification work order completed
    if (status === 'Completed') {
      const targetCmpId = id === 'WO-4401' ? 'CMP-8821' : null;
      if (targetCmpId) {
        setComplaints(prev =>
          prev.map(c => {
            if (c.id !== targetCmpId) return c;
            return {
              ...c,
              status: 'Resolved',
              resolvedAt: '15-Oct-2026 06:19',
              resolutionRemarks: report?.technicianRemarks || 'Fault rectified on-site by JE Field inspection team.'
            };
          })
        );
      }
    }

    addAuditEvent(
      'WORK_ORDER_STATUS_UPDATED',
      id,
      `Field Status: ${status}. ${report ? `Report filed (Serial: ${report.meterSerialScanned})` : ''}`
    );

    showToast(`Work Order ${id} updated to "${status}"`, 'success');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const resetDemoData = () => {
    clearBackendSession();
    try {
      localStorage.removeItem('vidyutone_consumers');
      localStorage.removeItem('vidyutone_connections');
      localStorage.removeItem('vidyutone_applications');
      localStorage.removeItem('vidyutone_complaints');
      localStorage.removeItem('vidyutone_workorders');
      localStorage.removeItem('vidyutone_employees');
      localStorage.removeItem('vidyutone_fieldengineers');
      localStorage.removeItem('vidyutone_bills');
      localStorage.removeItem('vidyutone_payments');
      localStorage.removeItem('vidyutone_notifications');
      localStorage.removeItem('vidyutone_auditlogs');
      localStorage.removeItem('vidyutflow_account_connections');
    } catch (e) {}

    setConsumers(INITIAL_CONSUMERS);
    setConnections(INITIAL_CONNECTIONS);
    setApplications(INITIAL_APPLICATIONS);
    setComplaints(INITIAL_COMPLAINTS);
    setWorkOrders(INITIAL_WORK_ORDERS);
    setEmployees(INITIAL_EMPLOYEES);
    setFieldEngineers(INITIAL_FIELD_ENGINEERS);
    setBills(INITIAL_BILLS);
    setPayments(INITIAL_PAYMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(AUDIT_LOGS);

    showToast('Demo dataset reset to initial state!', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setRole,
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        consumers,
        connections,
        applications,
        complaints,
        workOrders,
        employees,
        fieldEngineers,
        bills,
        payments,
        notifications,
        auditLogs,
        isOfflineSimulated,
        setIsOfflineSimulated,
        isIntroActive,
        setIsIntroActive,
        hasEnteredPlatform,
        setHasEnteredPlatform,
        replayIntro,
        exitToWelcomeScreen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isRoleSwitcherModalOpen,
        setIsRoleSwitcherModalOpen,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        isAIAssistantOpen,
        setIsAIAssistantOpen,
        isWorkflowVisualizerOpen,
        setIsWorkflowVisualizerOpen,
        activeCaseDrawer,
        openCaseDrawer,
        closeCaseDrawer,
        payBillDemo,
        submitApplicationDemo,
        submitComplaintDemo,
        updateApplicationStatus,
        updateComplaintStatus,
        updateWorkOrderStatus,
        markNotificationRead,
        markAllNotificationsRead,
        addAuditEvent,
        resetDemoData,
        toasts,
        showToast,
        dismissToast,
        authMode,
        setAuthMode,
        isVerifyingServerSession,
        demoSession,
        userConnections,
        userApplications,
        userBills,
        userPayments,
        userComplaints,
        userNotifications,
        linkConnectionDemo,
        loginDemoUser,
        signupDemoUser,
        logoutDemoSession,
        activeUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
