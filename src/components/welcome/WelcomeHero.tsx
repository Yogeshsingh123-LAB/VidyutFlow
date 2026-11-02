import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  FilePlus2,
  AlertTriangle,
  LogIn,
  CheckCircle2,
  Award,
  Sparkles,
  MapPin,
  FileText,
  Info
} from 'lucide-react';
import { UGVCL_CORPORATE_PROFILE } from '../../data/ugvclHistoryData';
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
    <section className="relative w-full bg-slate-900 text-white overflow-hidden border-b border-slate-800">
      {/* Background Authentic Photo Canvas with Balanced Scrim for maximum photograph visibility */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/ugvcl/distribution_substation_switchyard.jpg"
          alt="33kV/11kV Distribution Substation Switchyard"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-center scale-102 transform filter brightness-70 contrast-105"
        />
        {/* Editorial Gradients: Darker on the left for text readability, clear and vivid on the right to showcase the substation */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071329] via-[#0A1C3E]/80 to-[#071329]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071329] via-transparent to-[#071329]/40" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 py-16 sm:py-24 lg:py-28 flex flex-col justify-between">
        <div className="max-w-4xl space-y-6">
          {/* Unboxed Metadata & Institutional Identification */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-cyan-300">
            <span className="bg-blue-900/80 text-cyan-200 border border-blue-600/60 px-3.5 py-1 rounded-md text-xs uppercase tracking-wider font-bold shadow-xs">
              {dict.hero.badgeDistribution}
            </span>
            <span className="text-slate-400">·</span>
            <span>{dict.hero.badgeIncorporated}</span>
            <span className="text-slate-400">·</span>
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 inline" />
              <span>{dict.hero.badgeRating}</span>
            </span>
          </div>

          {/* Powerful, Concise Heading with refined line breaks */}
          <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-white leading-[1.12]">
            {dict.hero.title}
          </h1>

          {/* Editorial Lead Paragraph */}
          <p className="text-base sm:text-lg text-slate-100 leading-relaxed max-w-3xl font-normal">
            {dict.hero.description}
          </p>

          {/* Primary Call-to-Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => handleGoToConsumerTab('dashboard')}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 flex items-center gap-2.5 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{dict.hero.ctaConsumer}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLaunchStaffERP}
              className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-amber-500/25 flex items-center gap-2.5 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>{dict.hero.ctaStaff}</span>
            </button>

            <button
              onClick={onOpenAboutModal}
              className="px-4.5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/15 border border-white/25 text-slate-100 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer"
              title="About VidyutOne Platform Architecture & System Design"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              <span>{dict.hero.ctaArchitecture}</span>
            </button>

            <a
              href="#consumer-services"
              className="px-4.5 py-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer"
              title="View & Download Official Electricity Tariff Schedule"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{dict.hero.ctaTariff}</span>
            </a>
          </div>

          {/* Verified Institutional Strip */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-white/20 text-slate-200">
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block truncate">{dict.hero.statJurisdictionLabel}</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statJurisdictionVal} />
              </span>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{dict.hero.statJurisdictionSub}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block truncate">{dict.hero.statConsumerBaseLabel}</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statConsumerBaseVal} />
              </span>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{dict.hero.statConsumerBaseSub}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block truncate">{dict.hero.statRuralPowerLabel}</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-mono block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statRuralPowerVal} />
              </span>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{dict.hero.statRuralPowerSub}</p>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs text-slate-400 uppercase font-bold tracking-wider block truncate">{dict.hero.statNationalRatingLabel}</span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-amber-400 font-mono block mt-0.5 truncate">
                <CountUpNumber value={dict.hero.statNationalRatingVal} />
              </span>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{dict.hero.statNationalRatingSub}</p>
            </div>
          </div>
        </div>

        {/* Quick-Access Services Bar at Hero Base */}
        <div className="mt-14 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <button
            onClick={() => handleGoToConsumerTab('bills')}
            className="p-6 rounded-2xl bg-slate-950/65 hover:bg-slate-950/85 backdrop-blur-md border border-white/20 hover:border-blue-400 text-left transition-all hover:-translate-y-1 group cursor-pointer shadow-lg hover:shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{dict.hero.cardPayBadge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">{dict.hero.cardPayTitle}</p>
            <p className="text-sm text-slate-300 mt-1">{dict.hero.cardPaySub}</p>
          </button>

          <button
            onClick={() => handleGoToConsumerTab('new-connection')}
            className="p-6 rounded-2xl bg-slate-950/65 hover:bg-slate-950/85 backdrop-blur-md border border-white/20 hover:border-emerald-400 text-left transition-all hover:-translate-y-1 group cursor-pointer shadow-lg hover:shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/40 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                <FilePlus2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{dict.hero.cardApplyBadge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-200 transition-colors">{dict.hero.cardApplyTitle}</p>
            <p className="text-sm text-slate-300 mt-1">{dict.hero.cardApplySub}</p>
          </button>

          <button
            onClick={() => handleGoToConsumerTab('complaints')}
            className="p-6 rounded-2xl bg-slate-950/65 hover:bg-slate-950/85 backdrop-blur-md border border-white/20 hover:border-amber-400 text-left transition-all hover:-translate-y-1 group cursor-pointer shadow-lg hover:shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-600/40 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{dict.hero.cardGrievanceBadge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-white group-hover:text-amber-200 transition-colors">{dict.hero.cardGrievanceTitle}</p>
            <p className="text-sm text-slate-300 mt-1">{dict.hero.cardGrievanceSub}</p>
          </button>
        </div>
      </div>
    </section>
  );
};
