import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../common/ToastContainer';
import { CommandPalette } from '../common/CommandPalette';
import { NotificationDrawer } from '../common/NotificationDrawer';
import { CaseDetailDrawer } from '../common/CaseDetailDrawer';
import { WorkflowVisualizerModal } from '../common/WorkflowVisualizerModal';
import { RoleWelcomeModal } from '../common/RoleWelcomeModal';
import { AIAssistantDrawer } from '../common/AIAssistantDrawer';
import { CriticalIncidentModal } from '../common/CriticalIncidentModal';
import { HumanApprovalModal } from '../common/HumanApprovalModal';
import { IncidentActionModal } from '../common/IncidentActionModal';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-slate-900 overflow-x-hidden">
      {/* Keyboard Accessibility Skip Link */}
      <a href="#main-workspace-content" className="skip-to-main-link">
        {t.erp.skipToMain}
      </a>

      {/* Screen Reader Polite Status Region */}
      <div role="status" aria-live="polite" className="sr-only">
        {`Active operating data mode: ${dataMode}. Backend status: ${backendStatus.state}.`}
      </div>

      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
          <TopNav onToggleMobileNav={() => setIsMobileNavOpen(true)} />
          {/* Mobile Section Switcher & Slide-Over Navigation Drawer */}
          <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

          {/* Phase 5: Explicit LIVE Mode Backend Unavailable Banner (No Silent Fallback) */}
          {dataMode === 'LIVE' && backendStatus.state === 'LIVE_UNAVAILABLE' && (
            <div
              role="alert"
              aria-live="assertive"
              className="mx-3 mt-3 min-[375px]:mx-4 sm:mx-5 md:mx-6 p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                      {t.erp.liveBackendUnavailable || '▲ LIVE Mode — Backend Unavailable'}
                    </span>
                    {backendStatus.lastRequestId && (
                      <span className="text-[11px] font-mono text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        Trace: {backendStatus.lastRequestId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">
                    {backendStatus.lastError ||
                      'The persistent REST backend (/api/v1/*) is not reachable. Per LIVE mode safety rules, VidyutFlow has NOT silently fallen back to simulated demo data.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => void syncWithBackend()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-red-700 border border-red-300 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.erp.retryLiveSync}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode('DEMO')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-800 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.erp.switchToDemoMode}</span>
                </button>
              </div>
            </div>
          )}

          <main
            id="main-workspace-content"
            tabIndex={-1}
            className="flex-1 px-3 py-3.5 min-[375px]:p-4 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0 animate-in fade-in duration-150 focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Overlays & Drawers */}
      <ToastContainer />
      <CommandPalette />
      <NotificationDrawer />
      <CaseDetailDrawer />
      <WorkflowVisualizerModal />
      <RoleWelcomeModal />
      <AIAssistantDrawer />
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
    </div>
  );
};
