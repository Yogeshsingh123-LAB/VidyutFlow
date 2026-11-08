import React, { useState } from 'react';
import { TargetHomePage } from './TargetHomePage';
import { SourceManifestModal } from '../welcome/SourceManifestModal';
import { PresentationAboutModal } from '../common/PresentationAboutModal';
import { RoleWelcomeModal } from '../common/RoleWelcomeModal';
import { ToastContainer } from '../common/ToastContainer';

export const WelcomePortalPage: React.FC = () => {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* 1:1 Pixel-Perfect VidyutFlow Institutional Homepage */}
      <TargetHomePage onOpenAboutModal={() => setIsAboutModalOpen(true)} />

      {/* Institutional Modals & Role Access */}
      <SourceManifestModal
        isOpen={isManifestModalOpen}
        onClose={() => setIsManifestModalOpen(false)}
      />

      <PresentationAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Role Switcher & Unified Institutional Login View */}
      <RoleWelcomeModal />

      <ToastContainer />
    </div>
  );
};

export default WelcomePortalPage;
