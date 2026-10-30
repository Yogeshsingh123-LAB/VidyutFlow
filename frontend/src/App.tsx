import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp, isValidDemoSession } from './context/AppContext';
import { LanguageProvider } from './i18n/LanguageContext';

const AppShell = lazy(() =>
  import('./components/layout/AppShell').then(m => ({ default: m.AppShell }))
);
const WelcomePortalPage = lazy(() =>
  import('./components/intro/WelcomePortalPage').then(m => ({ default: m.WelcomePortalPage }))
);
const ConsumerPortal = lazy(() =>
  import('./components/consumer/ConsumerPortal').then(m => ({ default: m.ConsumerPortal }))
);
const EmployeePortal = lazy(() =>
  import('./components/employee/EmployeePortal').then(m => ({ default: m.EmployeePortal }))
);
const FieldPortal = lazy(() =>
  import('./components/field/FieldPortal').then(m => ({ default: m.FieldPortal }))
);
const ManagementPortal = lazy(() =>
  import('./components/management/ManagementPortal').then(m => ({ default: m.ManagementPortal }))
);
const AdminPortal = lazy(() =>
  import('./components/admin/AdminPortal').then(m => ({ default: m.AdminPortal }))
);

const WorkspaceRouteFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[45vh] flex items-center justify-center p-6 text-xs font-semibold text-slate-500"
  >
    Loading VidyutFlow workspace…
  </div>
);

const PortalRouter: React.FC = () => {
  const { currentRole, demoSession } = useApp();

  // Multi-tier authorization protection:
  // Access to portal components is strictly forbidden unless there is a valid demoSession matching currentRole
  if (!demoSession || !isValidDemoSession(demoSession) || demoSession.role !== currentRole) {
    return null;
  }

  return (
    <Suspense fallback={<WorkspaceRouteFallback />}>
      {currentRole === 'consumer' && <ConsumerPortal />}
      {currentRole === 'employee' && <EmployeePortal />}
      {currentRole === 'field' && <FieldPortal />}
      {currentRole === 'management' && <ManagementPortal />}
      {currentRole === 'admin' && <AdminPortal />}
    </Suspense>
  );
};

const MainExperience: React.FC = () => {
  const { hasEnteredPlatform, demoSession, currentRole } = useApp();

  // Multi-tier client access guard:
  // Access to privileged workspace views requires hasEnteredPlatform AND a valid demo session matching currentRole
  const isAuthorized = Boolean(
    hasEnteredPlatform &&
    demoSession &&
    isValidDemoSession(demoSession) &&
    demoSession.role === currentRole
  );

  return (
    <Suspense fallback={<WorkspaceRouteFallback />}>
      {!isAuthorized ? (
        <WelcomePortalPage />
      ) : (
        /* Full Workspace Platform Shell */
        <AppShell>
          <PortalRouter />
        </AppShell>
      )}
    </Suspense>
  );
};

export default function App() {
  return (
    <AppProvider>
      <LanguageProvider>
        <MainExperience />
      </LanguageProvider>
    </AppProvider>
  );
}
