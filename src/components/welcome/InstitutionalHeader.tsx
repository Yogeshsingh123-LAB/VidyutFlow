import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  PhoneCall,
  FileText,
  Sun,
  Moon,
  Menu,
  X,
  LogIn
} from 'lucide-react';
import { UgvclBrandIdentity } from '../common/UgvclBrandIdentity';
import { LanguageSelector } from '../common/LanguageSelector';

interface InstitutionalHeaderProps {
  onOpenAboutModal: () => void;
  onOpenManifestModal: () => void;
}

export const InstitutionalHeader: React.FC<InstitutionalHeaderProps> = ({
  onOpenAboutModal,
  onOpenManifestModal
}) => {
  const { theme, toggleTheme, setIsRoleSwitcherModalOpen } = useApp();
  const { dict } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLaunchERP = () => {
    setIsRoleSwitcherModalOpen(true);
  };

  const navLinks = [
    { label: dict.header.navHome, href: '#' },
    { label: dict.header.navAbout, href: '#about-ugvcl' },
    { label: dict.header.navUnderstanding, href: '#understanding-ugvcl' },
    { label: dict.header.navAchievements, href: '#achievements' },
    { label: dict.header.navNotices, href: '#notices' },
    { label: dict.header.navGallery, href: '#gallery' },
    { label: dict.header.navJourney, href: '#distribution-journey' }
  ];

  return (
    <header className="w-full flex flex-col z-30 transition-colors shadow-xs">
      {/* ================================================================= */}
      {/* LEVEL 1 — SLIM UTILITY BAR (Dark Navy)                           */}
      {/* ================================================================= */}
      <div className="bg-[#071329] text-slate-300 text-xs px-4 sm:px-8 lg:px-10 py-1.5 border-b border-blue-950/80">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4">
          {/* Government of Gujarat / GUVNL Institutional Relationship */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs min-w-0">
            <span className="font-semibold text-slate-100 tracking-wide shrink-0">
              {dict.header.govGujarat}
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-slate-300 truncate">
              {dict.header.guvnlSub}
            </span>
            <span className="text-slate-600 hidden xl:inline">|</span>
            <span className="hidden xl:inline text-slate-400 text-[11px] font-normal truncate">
              {dict.header.platformDemo}
            </span>
          </div>

          {/* Right Utility Controls: Customer Care, Tariff PDF, Theme */}
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs shrink-0">
            <a
              href="tel:19122"
              className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
              title="24x7 Customer Care Helpline"
            >
              <PhoneCall className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{dict.common.helpline}</span>
            </a>

            <span className="text-slate-600 hidden md:inline">|</span>

            <a
              href="#consumer-services"
              className="hidden md:flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-medium transition-colors cursor-pointer"
              title="Download GERC Approved Electricity Tariff Schedule"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{dict.common.tariffPdf}</span>
            </a>

            <span className="text-slate-600">|</span>

            {/* Color Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle color theme"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* LEVEL 2 — MAIN CORPORATE BRANDING (Clean White Background)        */}
      {/* ================================================================= */}
      <div className="bg-white dark:bg-[#0B1528] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 lg:px-10 py-4 sm:py-5 transition-colors">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* LEFT: Authentic UGVCL Branding (Standardized Component) */}
          <UgvclBrandIdentity variant="header" showMission showGujarati className="flex-1" />

          {/* RIGHT: Verified 24x7 Customer Care Contact & Subtle Platform Note */}
          <div className="hidden lg:flex items-center text-right shrink-0">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                {dict.common.tollFree}
              </span>
              <a
                href="tel:19122"
                className="text-base font-black text-blue-700 dark:text-cyan-400 font-mono hover:text-blue-800 dark:hover:text-cyan-300 transition-colors flex items-center justify-end gap-1.5"
                title="Call 19122 / 1800 233 155335 UGVCL Customer Helpline"
              >
                <PhoneCall className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                <span>{dict.header.tollFreeNumber}</span>
              </a>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 tracking-tight">
                {dict.header.platformDemo}
              </p>
            </div>
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* LEVEL 3 — PRIMARY NAVIGATION (Dark Navy, Symmetrical, Modern)     */}
      {/* ================================================================= */}
      <nav className="sticky top-0 z-40 bg-[#0A1C3E] text-white border-b border-blue-900 shadow-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between h-12 sm:h-13">
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-xs xl:text-sm font-semibold tracking-normal">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 xl:px-3.5 py-3 text-slate-200 hover:bg-blue-800/60 hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile view institutional title */}
          <div className="lg:hidden text-xs font-semibold text-slate-300 truncate pr-2">
            {dict.header.powerPortal}
          </div>

          {/* Top-Right Navigation Controls: Language Selector + Primary Call-To-Action Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <LanguageSelector variant="header" />
            <button
              onClick={handleLaunchERP}
              className="px-3.5 sm:px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-102 cursor-pointer"
              title="Access Consumer Services, Employee ERP, Field Operations, SCADA Cockpit, or IT Admin"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>{dict.common.erpLogin}</span>
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0A1C3E] border-t border-blue-900 px-4 py-4 space-y-2 text-sm animate-in slide-in-from-top-2 duration-200 text-left">
            {/* Language Selector embedded directly in mobile menu */}
            <LanguageSelector variant="mobile" />

            <div className="pt-2 border-t border-blue-900/60 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-slate-200 hover:bg-blue-800/60 hover:text-cyan-300 transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-blue-900/60 flex flex-col gap-2.5">
              <a
                href="#consumer-services"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-xs text-amber-300 hover:text-amber-200 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{dict.common.tariffPdf}</span>
              </a>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLaunchERP();
                }}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>{dict.common.erpLogin}</span>
              </button>

              <div className="pt-2 flex items-center justify-between px-3 text-xs text-slate-300">
                <button
                  onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAboutModal();
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {dict.header.platformOverview}
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenManifestModal();
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {dict.header.assetManifest}
              </button>
            </div>

            <div className="px-3 pt-2 text-[11px] text-slate-400 border-t border-blue-900/40">
              <p>{dict.header.platformDemo}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{dict.header.independentDisclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </nav>
  </header>
);
};
