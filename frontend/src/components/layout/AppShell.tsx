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

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-slate-900 overflow-x-hidden">
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
          <TopNav onToggleMobileNav={() => setIsMobileNavOpen(true)} />
          {/* Mobile Section Switcher & Slide-Over Navigation Drawer */}
          <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
          <main className="flex-1 px-3 py-3.5 min-[375px]:p-4 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0 animate-in fade-in duration-150">
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
    </div>
  );
};
