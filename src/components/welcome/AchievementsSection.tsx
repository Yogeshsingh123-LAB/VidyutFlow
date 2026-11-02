import React, { useState } from 'react';
import {
  Award,
  Zap,
  Sun,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UGVCL_AWARDS } from '../../data/ugvclHistoryData';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedAward } from '../../i18n/contentTranslations';

export const AchievementsSection: React.FC = () => {
  const { dict, language } = useLanguage();
  const [expandedAwards, setExpandedAwards] = useState<Record<string, boolean>>({});

  const toggleAwardExpand = (id: string) => {
    setExpandedAwards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section id="achievements" className="w-full py-16 sm:py-24 bg-slate-50 dark:bg-[#071329] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 space-y-16 sm:space-y-20">
        {/* Section Header */}
        <div className="max-w-4xl space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Award className="w-4 h-4" />
            <span>{dict.achievements.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[38px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {dict.achievements.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {dict.achievements.subtitle}
          </p>
        </div>

        {/* 1. Redesigned National Discom Ratings & Achievements Grid (Up to 3 columns Desktop, 2 Tablet, 1 Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {UGVCL_AWARDS.map((award) => {
            const localized = getLocalizedAward(award, language);
            const isExpanded = !!expandedAwards[award.id];
            const needsReadMore = localized.significance.length > 120;
            const displayText = isExpanded || !needsReadMore
              ? localized.significance
              : `${localized.significance.slice(0, 115)}...`;

            return (
              <div
                key={award.id}
                className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-amber-400 dark:hover:border-amber-500/60 transition-all duration-300 hover:-translate-y-1 text-left flex flex-col justify-between min-h-[340px] group"
              >
                <div className="space-y-4">
                  {/* LEVEL 1: YEAR / CATEGORY */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold font-mono text-amber-800 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/70 px-3 py-1 rounded-md border border-amber-300/60 dark:border-amber-800/80">
                      {award.year}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Award className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  {/* LEVEL 2: ACHIEVEMENT TITLE (19–22px) */}
                  <h3 className="text-lg sm:text-[20px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors break-words">
                    {localized.title}
                  </h3>

                  {/* LEVEL 3: IMPORTANT RATING OR RECOGNITION */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 text-xs sm:text-sm font-extrabold tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{localized.gradeOrRank}</span>
                  </div>

                  {/* LEVEL 4: SHORT DESCRIPTION (15–16px with comfortable line height and Read More) */}
                  <div className="space-y-1 pt-1">
                    <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal break-words">
                      {displayText}
                    </p>
                    {needsReadMore && (
                      <button
                        type="button"
                        onClick={() => toggleAwardExpand(award.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 transition-colors cursor-pointer pt-1 focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? dict.common.showLess : dict.common.readMore}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* LEVEL 5: SOURCE / PUBLICATION */}
                <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
                    <span>{dict.achievements.officialCitation}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-normal break-words">
                    {localized.officialReport}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                    {dict.achievements.awardedBy} {localized.awardingBody}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Flagship Service Initiatives Storytelling */}
        <div className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-left">
          <div className="space-y-1.5">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {dict.achievements.flagshipTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {dict.achievements.flagshipSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 text-left">
            {/* Jyotigram Yojana */}
            <div className="p-7 sm:p-8 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-5 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                      {dict.achievements.jyotigramTitle}
                    </h4>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 block mt-0.5">
                      {dict.achievements.jyotigramSub}
                    </span>
                  </div>
                </div>
                <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {dict.achievements.jyotigramDesc}
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-bold text-blue-700 dark:text-cyan-400 pt-4 border-t border-slate-100 dark:border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{dict.achievements.jyotigramBadge}</span>
              </div>
            </div>

            {/* Kisan Suryodaya Yojana */}
            <div className="p-7 sm:p-8 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 space-y-5 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                      {dict.achievements.ksyTitle}
                    </h4>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 block mt-0.5">
                      {dict.achievements.ksySub}
                    </span>
                  </div>
                </div>
                <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {dict.achievements.ksyDesc}
                </p>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-bold text-amber-700 dark:text-amber-300 pt-4 border-t border-slate-100 dark:border-slate-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{dict.achievements.ksyBadge}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
