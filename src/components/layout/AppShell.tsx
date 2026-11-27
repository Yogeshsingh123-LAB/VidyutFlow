import React, { lazy, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../common/ToastContainer';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';

// Dynamic lazy imports for modal drawers and secondary utilities to optimize main bundle
const CommandPalette = lazy(() =>
  import('../common/CommandPalette').then(m => ({ default: m.CommandPalette }))
);
const NotificationDrawer = lazy(() =>
  import('../common/NotificationDrawer').then(m => ({ default: m.NotificationDrawer }))
);
const CaseDetailDrawer = lazy(() =>
  import('../common/CaseDetailDrawer').then(m => ({ default: m.CaseDetailDrawer }))
);
const WorkflowVisualizerModal = lazy(() =>
  import('../common/WorkflowVisualizerModal').then(m => ({ default: m.WorkflowVisualizerModal }))
);
const RoleWelcomeModal = lazy(() =>
  import('../common/RoleWelcomeModal').then(m => ({ default: m.RoleWelcomeModal }))
);
const AIAssistantDrawer = lazy(() =>
  import('../common/AIAssistantDrawer').then(m => ({ default: m.AIAssistantDrawer }))
);
const CriticalIncidentModal = lazy(() =>
  import('../common/CriticalIncidentModal').then(m => ({ default: m.CriticalIncidentModal }))
);
const HumanApprovalModal = lazy(() =>
  import('../common/HumanApprovalModal').then(m => ({ default: m.HumanApprovalModal }))
);
const IncidentActionModal = lazy(() =>
  import('../common/IncidentActionModal').then(m => ({ default: m.IncidentActionModal }))
);

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentRole,
    activeApprovalRecommendation,
    closeApprovalModal,
    approveRecommendation,
    rejectRecommendation,
    activeIncidentModalId,
    closeIncidentModal,
    dataMode,
    setDataMode,
    backendStatus,
    syncWithBackend
  } = useApp();
  const { t } = useLanguage();

  // Unified clean portal layout (consumer, employee, admin, management & field): full-width header at top, sidebar docked underneath
  if (currentRole === 'consumer' || currentRole === 'employee' || currentRole === 'admin' || currentRole === 'field' || currentRole === 'management') {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
        {/* Keyboard Accessibility Skip Link */}
        <a href="#main-workspace-content" className="skip-to-main-link">
          {t.erp.skipToMain}
        </a>

        {/* Screen Reader Polite Status Region */}
        <div role="status" aria-live="polite" className="sr-only">
          {`Active operating data mode: ${dataMode}.`}
        </div>

        {/* Full-width Portal Header */}
        <TopNav />

        <div className="flex-1 flex min-w-0 overflow-hidden">
          {/* Light Theme Sidebar */}
          <Sidebar />

          {/* Main Content Workspace */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
            <MobileNav />

            <main
              id="main-workspace-content"
              tabIndex={-1}
              className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-[1600px] w-full mx-auto min-w-0 animate-in fade-in duration-150 focus:outline-none"
            >
              {children}
            </main>
          </div>
        </div>

        {/* Lightweight Toasts */}
        <ToastContainer />

        {/* Code-split Overlays & Drawers wrapped in ErrorBoundary and Suspense */}
        <ErrorBoundary scope="drawer">
          <Suspense fallback={null}>
            <CommandPalette />
            <NotificationDrawer />
            <CaseDetailDrawer />
            <WorkflowVisualizerModal />
            <RoleWelcomeModal />
            {currentRole === 'consumer' && <AIAssistantDrawer />}
            <CriticalIncidentModal />
            <HumanApprovalModal
              recommendation={activeApprovalRecommendation}
              onClose={closeApprovalModal}
              onApprove={approveRecommendation}
              onReject={rejectRecommendation}
            />
            <IncidentActionModal
              isOpen={Boolean(activeIncidentModalId)}
              incidentId={activeIncidentModalId}
              onClose={closeIncidentModal}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-slate-900 overflow-x-hidden">
      {/* Keyboard Accessibility Skip Link */}
      <a href="#main-workspace-content" className="skip-to-main-link">
        {t.erp.skipToMain}
      </a>

      {/* Screen Reader Polite Status Region */}
      <div role="status" aria-live="polite" className="sr-only">
        {`Active operating data mode: ${dataMode}.`}
      </div>

      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
          <TopNav />
          {/* Mobile Top Navigation Strip */}
          <MobileNav />

          <main
            id="main-workspace-content"
            tabIndex={-1}
            className="flex-1 px-3 py-3.5 min-[375px]:p-4 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0 animate-in fade-in duration-150 focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Lightweight Toasts */}
      <ToastContainer />

      {/* Code-split Overlays & Drawers wrapped in ErrorBoundary and Suspense */}
      <ErrorBoundary scope="drawer">
        <Suspense fallback={null}>
          <CommandPalette />
          <NotificationDrawer />
          <CaseDetailDrawer />
          <WorkflowVisualizerModal />
          <RoleWelcomeModal />
          {currentRole === 'consumer' && <AIAssistantDrawer />}
          <CriticalIncidentModal />
          <HumanApprovalModal
            recommendation={activeApprovalRecommendation}
            onClose={closeApprovalModal}
            onApprove={approveRecommendation}
            onReject={rejectRecommendation}
          />
          <IncidentActionModal
            isOpen={Boolean(activeIncidentModalId)}
            incidentId={activeIncidentModalId}
            onClose={closeIncidentModal}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

