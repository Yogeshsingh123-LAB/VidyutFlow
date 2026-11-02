import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { InstitutionalHeader } from '../welcome/InstitutionalHeader';
import { NoticeTicker } from '../welcome/NoticeTicker';
import { WelcomeHero } from '../welcome/WelcomeHero';
import { AboutUgvclSection } from '../welcome/AboutUgvclSection';
import { AchievementsSection } from '../welcome/AchievementsSection';
import { ConsumerServicesSection } from '../welcome/ConsumerServicesSection';
import { NewsNoticesSection } from '../welcome/NewsNoticesSection';
import { MediaGallerySection } from '../welcome/MediaGallerySection';
import { DistributionJourneySection } from '../welcome/DistributionJourneySection';
import { InstitutionalFooter } from '../welcome/InstitutionalFooter';
import { MediaLightboxModal } from '../welcome/MediaLightboxModal';
import { NoticeDetailModal } from '../welcome/NoticeDetailModal';
import { SourceManifestModal } from '../welcome/SourceManifestModal';
import { PresentationAboutModal } from '../common/PresentationAboutModal';
import { RoleWelcomeModal } from '../common/RoleWelcomeModal';
import { ToastContainer } from '../common/ToastContainer';
import { UGVCL_PHOTO_MANIFEST, UgvclNotice, UgvclPhotoAsset } from '../../data/ugvclHistoryData';

export const WelcomePortalPage: React.FC = () => {
  const [selectedPhoto, setSelectedPhoto] = useState<UgvclPhotoAsset | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<UgvclNotice | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isManifestModalOpen, setIsManifestModalOpen] = useState<boolean>(false);

  const handleOpenPhotoById = (id: string) => {
    const found = UGVCL_PHOTO_MANIFEST.find((p) => p.id === id);
    if (found) {
      setSelectedPhoto(found);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#081225] text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-blue-600 selection:text-white antialiased">
      {/* 1. INSTITUTIONAL HEADER & UTILITY NAVIGATION */}
      <InstitutionalHeader
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onOpenManifestModal={() => setIsManifestModalOpen(true)}
      />

      {/* 2. LIVE NOTICES & CIRCULAR TICKER */}
      <NoticeTicker onSelectNotice={(notice) => setSelectedNotice(notice)} />

      {/* 3. MAIN EDITORIAL CONTENT FLOW */}
      <main className="flex-1 w-full flex flex-col">
        {/* Section B: Welcome Hero */}
        <WelcomeHero onOpenAboutModal={() => setIsAboutModalOpen(true)} />

        {/* Section C: About UGVCL (History, Corporate Profile & Milestones) */}
        <AboutUgvclSection onOpenPhoto={handleOpenPhotoById} />

        {/* Section D: UGVCL Achievements & Verified Ratings */}
        <AchievementsSection />

        {/* Section F: Consumer Services & Tariff Calculator */}
        <ConsumerServicesSection />

        {/* Section G: News, Circulars & Leadership Desk */}
        <NewsNoticesSection onSelectNotice={(notice) => setSelectedNotice(notice)} />

        {/* Section E: Photo & Video Gallery */}
        <MediaGallerySection
          onOpenPhoto={handleOpenPhotoById}
          onOpenManifest={() => setIsManifestModalOpen(true)}
        />

        {/* Section H: Electricity Distribution Journey */}
        <DistributionJourneySection />
      </main>

      {/* 4. INSTITUTIONAL MULTI-COLUMN FOOTER */}
      <InstitutionalFooter
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onOpenManifest={() => setIsManifestModalOpen(true)}
      />

      {/* MODALS & DRAWERS */}
      <MediaLightboxModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      <NoticeDetailModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />

      <SourceManifestModal
        isOpen={isManifestModalOpen}
        onClose={() => setIsManifestModalOpen(false)}
      />

      <PresentationAboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <RoleWelcomeModal />

      <ToastContainer />
    </div>
  );
};
