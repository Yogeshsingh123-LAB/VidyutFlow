import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowRight,
  CreditCard,
  FilePlus2,
  AlertTriangle,
  LogIn,
  Award,
  FileText,
  Info
} from 'lucide-react';
import { CountUpNumber } from './CountUpNumber';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTypographyRoleClasses, isIndicScriptLanguage } from '../../utils/typographyTokens';

interface WelcomeHeroProps {
  onOpenAboutModal: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onOpenAboutModal }) => {
  const {
    setRole,
    setActiveTab,
    setHasEnteredPlatform,
    setIsRoleSwitcherModalOpen,
    showToast,
    demoSession
  } = useApp();
  const { dict, language } = useLanguage();
  const isIndic = isIndicScriptLanguage(language);

  const handleGoToConsumerTab = (tabName: string) => {
    if (demoSession && demoSession.role === 'consumer') {
      setRole('consumer');
      setActiveTab(tabName);
      setHasEnteredPlatform(true);
    } else {
      setActiveTab(tabName);
      setIsRoleSwitcherModalOpen(true);
      showToast('Please sign in with your consumer account to access self-service.', 'info');
    }
  };

  const handleLaunchStaffERP = () => {
    setActiveTab('dashboard');
    setIsRoleSwitcherModalOpen(true);
  };

  return (
    <section
      data-testid="welcome-hero-section"
      className="relative w-full bg-slate-900 text-white overflow-hidden border-b border-slate-800"
    >
      {/* Background Authentic Photo Canvas with Balanced Scrim for maximum photograph visibility */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/ugvcl/distribution_substation_switchyard.jpg"
          alt="33kV/11kV Distribution Substation Switchyard"
          className="w-full h-full object-cover object-center scale-102 transform filter brightness-70 contrast-105"
        />
        {/* Editorial Gradients: Darker on the left for text readability, clear and vivid on the right to showcase the substation */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071329] via-[#0A1C3E]/85 to-[#071329]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071329] via-transparent to-[#071329]/40" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 py-14 sm:py-20 lg:py-24 flex flex-col justify-between">
        <div className="max-w-4xl space-y-6 text-left">
          {/* Unboxed Metadata & Institutional Identification */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-cyan-300 leading-snug">
            <span
              className={`bg-blue-900/85 text-cyan-200 border border-blue-600/60 px-3.5 py-1 rounded-md text-xs font-bold shadow-xs ${
                isIndic ? 'tracking-normal' : 'uppercase tracking-wider'
              }`}
            >
              {dict.hero.badgeDistribution}
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="leading-snug">{dict.hero.badgeIncorporated}</span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-amber-400 font-bold inline-flex items-center gap-1.5 leading-snug">
              <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{dict.hero.badgeRating}</span>
            </span>
          </div>

          {/* Script-Aware Hero Headline with Balanced Line Height & Wrapping */}
          <h1
            data-testid="welcome-hero-heading"
            className={`${getTypographyRoleClasses('heroHeading', language)} text-white max-w-[26ch] break-words`}
          >
            {dict.hero.title}
          </h1>

          {/* Editorial Lead Paragraph */}
          <p
            data-testid="welcome-hero-description"
            className={`${getTypographyRoleClasses('bodyText', language)} text-slate-100 max-w-[66ch]`}
          >
            {dict.hero.description}
          </p>

          {/* Primary Call-to-Actions — Uniform Height & Baseline Alignment Across Languages */}
          <div className="pt-2 flex flex-wrap items-stretch gap-3 sm:gap-3.5">
            <button
              type="button"
              onClick={() => handleGoToConsumerTab('dashboard')}
              className="min-h-[46px] px-5 sm:px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/30 inline-flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{dict.hero.ctaConsumer}</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleLaunchStaffERP}
              className="min-h-[46px] px-5 sm:px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-500/25 inline-flex items-center justify-center gap-2.5 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[2.5] shrink-0" aria-hidden="true" />
              <span>{dict.hero.ctaStaff}</span>
            </button>

            <button
              type="button"
              onClick={onOpenAboutModal}
              className="min-h-[46px] px-4.5 py-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/15 border border-white/25 text-slate-100 hover:text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer"
              title="About VidyutOne Platform Architecture & System Design"
            >
              <Info className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
              <span>{dict.hero.ctaArchitecture}</span>
            </button>

            <a
              href="#consumer-services"
              className="min-h-[46px] px-4.5 py-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 hover:text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer"
              title="View & Download Official Electricity Tariff Schedule"
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{dict.hero.ctaTariff}</span>
            </a>
          </div>

          {/* Verified Institutional Strip — Non-Truncated Labels & Balanced Columns */}
          <div className="pt-8 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 border-t border-white/20 text-slate-200 items-start">
            <div className="min-w-0 flex flex-col justify-between space-y-1">
              <span
                className={`text-xs text-slate-300 font-bold block leading-snug break-words ${
                  isIndic ? 'tracking-normal' : 'uppercase tracking-wider'
                }`}
              >
                {dict.hero.statJurisdictionLabel}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono block leading-tight">
                <CountUpNumber value={dict.hero.statJurisdictionVal} />
              </span>
              <p className="text-xs text-slate-300 leading-snug break-words">
                {dict.hero.statJurisdictionSub}
              </p>
            </div>

            <div className="min-w-0 flex flex-col justify-between space-y-1">
              <span
                className={`text-xs text-slate-300 font-bold block leading-snug break-words ${
                  isIndic ? 'tracking-normal' : 'uppercase tracking-wider'
                }`}
              >
                {dict.hero.statConsumerBaseLabel}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono block leading-tight">
                <CountUpNumber value={dict.hero.statConsumerBaseVal} />
              </span>
              <p className="text-xs text-slate-300 leading-snug break-words">
                {dict.hero.statConsumerBaseSub}
              </p>
            </div>

            <div className="min-w-0 flex flex-col justify-between space-y-1">
              <span
                className={`text-xs text-slate-300 font-bold block leading-snug break-words ${
                  isIndic ? 'tracking-normal' : 'uppercase tracking-wider'
                }`}
              >
                {dict.hero.statRuralPowerLabel}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono block leading-tight">
                <CountUpNumber value={dict.hero.statRuralPowerVal} />
              </span>
              <p className="text-xs text-slate-300 leading-snug break-words">
                {dict.hero.statRuralPowerSub}
              </p>
            </div>

            <div className="min-w-0 flex flex-col justify-between space-y-1">
              <span
                className={`text-xs text-slate-300 font-bold block leading-snug break-words ${
                  isIndic ? 'tracking-normal' : 'uppercase tracking-wider'
                }`}
              >
                {dict.hero.statNationalRatingLabel}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-400 font-mono block leading-tight">
                <CountUpNumber value={dict.hero.statNationalRatingVal} />
              </span>
              <p className="text-xs text-slate-300 leading-snug break-words">
                {dict.hero.statNationalRatingSub}
              </p>
            </div>
          </div>
        </div>

        {/* Quick-Access Services Bar at Hero Base — Equal-Height Cards */}
        <div className="mt-12 sm:mt-14 pt-6 grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          <button
            type="button"
            onClick={() => handleGoToConsumerTab('bills')}
            className="p-6 rounded-2xl bg-slate-950/70 hover:bg-slate-950/90 backdrop-blur-md border border-white/20 hover:border-blue-400 text-left transition-all hover:-translate-y-1 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between min-h-[164px]"
          >
            <div className="w-full">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform shrink-0">
                  <CreditCard className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-cyan-300 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{dict.hero.cardPayBadge}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </span>
              </div>
              <p className={`${getTypographyRoleClasses('cardHeading', language)} text-white group-hover:text-cyan-200 transition-colors break-words`}>
                {dict.hero.cardPayTitle}
              </p>
            </div>
            <p className={`${getTypographyRoleClasses('supportingText', language)} text-slate-300 mt-2 break-words`}>
              {dict.hero.cardPaySub}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleGoToConsumerTab('new-connection')}
            className="p-6 rounded-2xl bg-slate-950/70 hover:bg-slate-950/90 backdrop-blur-md border border-white/20 hover:border-emerald-400 text-left transition-all hover:-translate-y-1 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between min-h-[164px]"
          >
            <div className="w-full">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-600/40 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform shrink-0">
                  <FilePlus2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{dict.hero.cardApplyBadge}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </span>
              </div>
              <p className={`${getTypographyRoleClasses('cardHeading', language)} text-white group-hover:text-emerald-200 transition-colors break-words`}>
                {dict.hero.cardApplyTitle}
              </p>
            </div>
            <p className={`${getTypographyRoleClasses('supportingText', language)} text-slate-300 mt-2 break-words`}>
              {dict.hero.cardApplySub}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleGoToConsumerTab('complaints')}
            className="p-6 rounded-2xl bg-slate-950/70 hover:bg-slate-950/90 backdrop-blur-md border border-white/20 hover:border-amber-400 text-left transition-all hover:-translate-y-1 group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col justify-between min-h-[164px]"
          >
            <div className="w-full">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-600/40 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs font-bold text-amber-300 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>{dict.hero.cardGrievanceBadge}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </span>
              </div>
              <p className={`${getTypographyRoleClasses('cardHeading', language)} text-white group-hover:text-amber-200 transition-colors break-words`}>
                {dict.hero.cardGrievanceTitle}
              </p>
            </div>
            <p className={`${getTypographyRoleClasses('supportingText', language)} text-slate-300 mt-2 break-words`}>
              {dict.hero.cardGrievanceSub}
            </p>
          </button>
        </div>
      </div>
    </section>
  );
};
