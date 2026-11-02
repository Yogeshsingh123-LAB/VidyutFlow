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
  const { dict } = useLanguage();

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
    <section className="relative w-full bg-[#081225] text-white overflow-hidden border-b border-slate-800">
      {/* Background Substation Switchyard Canvas with calm photographic scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/ugvcl/distribution_substation_switchyard.jpg"
          alt="33kV/11kV Distribution Substation Switchyard"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-center filter brightness-60 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071329] via-[#071329]/90 to-[#071329]/40" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 py-14 sm:py-20 lg:py-24 flex flex-col justify-between">
        <div className="max-w-3xl space-y-5">
          {/* Quiet Institutional Identification */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
            <span className="bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2.5 py-0.5 rounded text-xs font-medium">
              {dict.hero.badgeDistribution}
            </span>
            <span className="text-slate-500">·</span>
            <span>{dict.hero.badgeIncorporated}</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-400 font-medium inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>{dict.hero.badgeRating}</span>
            </span>
          </div>

          {/* Authoritative, Grounded Headline (weight 600, no gradient text) */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-white leading-tight">
            {dict.hero.title}
          </h1>

          {/* Editorial Lead Paragraph */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
            {dict.hero.description}
          </p>

          {/* Two Clear Primary/Secondary Actions + Quiet Secondary Links */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleGoToConsumerTab('dashboard')}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>{dict.hero.ctaConsumer}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLaunchStaffERP}
              className="px-5 py-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-slate-100 font-medium text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[1.5]" />
              <span>{dict.hero.ctaStaff}</span>
            </button>

            <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-slate-700/60 text-xs text-slate-400">
              <button
                onClick={onOpenAboutModal}
                className="hover:text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="About VidyutFlow Platform Architecture & System Design"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>{dict.hero.ctaArchitecture}</span>
              </button>

              <span className="text-slate-600">·</span>

              <a
                href="#consumer-services"
                className="hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
                title="View & Download Official Electricity Tariff Schedule"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{dict.hero.ctaTariff}</span>
              </a>
            </div>
          </div>

          {/* Verified Institutional Strip with Tabular Figures and Sentence Case */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-slate-800 text-slate-200">
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-normal block truncate">{dict.hero.statJurisdictionLabel}</span>
              <span className="text-xl sm:text-2xl font-semibold text-white font-mono tabular-nums block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statJurisdictionVal} />
              </span>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dict.hero.statJurisdictionSub}</p>
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-normal block truncate">{dict.hero.statConsumerBaseLabel}</span>
              <span className="text-xl sm:text-2xl font-semibold text-white font-mono tabular-nums block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statConsumerBaseVal} />
              </span>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dict.hero.statConsumerBaseSub}</p>
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-normal block truncate">{dict.hero.statRuralPowerLabel}</span>
              <span className="text-xl sm:text-2xl font-semibold text-white font-mono tabular-nums block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statRuralPowerVal} />
              </span>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dict.hero.statRuralPowerSub}</p>
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-normal block truncate">{dict.hero.statNationalRatingLabel}</span>
              <span className="text-xl sm:text-2xl font-semibold text-amber-400 font-mono tabular-nums block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statNationalRatingVal} />
              </span>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{dict.hero.statNationalRatingSub}</p>
            </div>
          </div>
        </div>

        {/* Quick-Access Services Bar at Hero Base (Quiet hairline cards, no neon hover scale) */}
        <div className="mt-10 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => handleGoToConsumerTab('bills')}
            className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                <CreditCard className="w-4 h-4 stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover:text-blue-400 flex items-center gap-1 transition-colors">
                <span>{dict.hero.cardPayBadge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{dict.hero.cardPayTitle}</p>
            <p className="text-xs text-slate-400 mt-1">{dict.hero.cardPaySub}</p>
          </button>

          <button
            onClick={() => handleGoToConsumerTab('new-connection')}
            className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                <FilePlus2 className="w-4 h-4 stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-400 flex items-center gap-1 transition-colors">
                <span>{dict.hero.cardApplyBadge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">{dict.hero.cardApplyTitle}</p>
            <p className="text-xs text-slate-400 mt-1">{dict.hero.cardApplySub}</p>
          </button>

          <button
            onClick={() => handleGoToConsumerTab('complaints')}
            className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 stroke-[1.5]" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                <span>{dict.hero.cardGrievanceBadge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">{dict.hero.cardGrievanceTitle}</p>
            <p className="text-xs text-slate-400 mt-1">{dict.hero.cardGrievanceSub}</p>
          </button>
        </div>
      </div>
    </section>
  );
};
