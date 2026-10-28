import React from 'react';
import { AppProvider, useApp, isValidDemoSession } from './context/AppContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { AppShell } from './components/layout/AppShell';
import { WelcomePortalPage } from './components/intro/WelcomePortalPage';
import { ConsumerPortal } from './components/consumer/ConsumerPortal';
import { EmployeePortal } from './components/employee/EmployeePortal';
import { FieldPortal } from './components/field/FieldPortal';
import { ManagementPortal } from './components/management/ManagementPortal';
import { AdminPortal } from './components/admin/AdminPortal';

const PortalRouter: React.FC = () => {
  const { currentRole, demoSession } = useApp();

  // Multi-tier authorization protection:
  // Access to portal components is strictly forbidden unless there is a valid demoSession matching currentRole
  if (!demoSession || !isValidDemoSession(demoSession) || demoSession.role !== currentRole) {
    return null;
  }

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
    <WelcomePortalPage />
  ) : (
    /* Full Workspace Platform Shell */
    <AppShell>
      <PortalRouter />
    </AppShell>
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
