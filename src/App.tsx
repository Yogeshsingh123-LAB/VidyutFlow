import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp, isValidDemoSession } from './context/AppContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PortalLoadingFallback } from './components/common/PortalLoadingFallback';

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
const MeterReadingWorkspace = lazy(() =>
  import('./components/common/MeterReadingWorkspace').then(m => ({ default: m.MeterReadingWorkspace }))
);

const PortalRouter: React.FC = () => {
  const { currentRole, demoSession } = useApp();

  // Multi-tier authorization protection:
  // Access to portal components is strictly forbidden unless there is a valid demoSession matching currentRole
  if (!demoSession || !isValidDemoSession(demoSession) || demoSession.role !== currentRole) {
    return null;
  }

  const renderActivePortal = () => {
    switch (currentRole) {
      case 'consumer':
        return <ConsumerPortal />;
      case 'employee':
        return <EmployeePortal />;
      case 'field':
        return <FieldPortal />;
      case 'management':
        return <ManagementPortal />;
      case 'admin':
        return <AdminPortal />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary scope="portal">
      <Suspense fallback={<PortalLoadingFallback role={currentRole} />}>
        {renderActivePortal()}
      </Suspense>
    </ErrorBoundary>
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

  return !isAuthorized ? (
    <ErrorBoundary scope="app">
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="min-h-screen flex items-center justify-center bg-slate-900 text-white"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-300 font-medium">
                Initializing UGVCL VidyutFlow 2.0...
              </span>
            </div>
          </div>
        }
      >
        <WelcomePortalPage />
      </Suspense>
    </ErrorBoundary>
  ) : (
    /* Full Workspace Platform Shell */
    <ErrorBoundary scope="app">
      <Suspense fallback={<PortalLoadingFallback role={currentRole} />}>
        <AppShell>
          <MeterReadingWorkspace />
          <PortalRouter />
        </AppShell>
      </Suspense>
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <ErrorBoundary scope="app">
      <AppProvider>
        <LanguageProvider>
          <MainExperience />
        </LanguageProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
