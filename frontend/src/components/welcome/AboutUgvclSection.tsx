import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Zap,
  FileCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  UGVCL_CORPORATE_PROFILE,
  UGVCL_MILESTONES,
  UgvclMilestone,
  UGVCL_PHOTO_MANIFEST,
  UGVCL_INFRASTRUCTURE_FACTS
} from '../../data/ugvclHistoryData';
import { CountUpNumber } from './CountUpNumber';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  getLocalizedMilestone,
  getLocalizedInfraFact
} from '../../i18n/contentTranslations';

interface AboutUgvclSectionProps {
  onOpenPhoto: (id: string) => void;
}

export const AboutUgvclSection: React.FC<AboutUgvclSectionProps> = ({ onOpenPhoto }) => {
  const { dict, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  const toggleMilestoneExpand = (key: string) => {
    setExpandedMilestones((prev: Record<string, boolean>) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const categories = [
    { key: 'All', label: dict.about.catAll },
    { key: 'Incorporation', label: dict.about.catIncorporation },
    { key: 'Electrification', label: dict.about.catElectrification },
    { key: 'Solar & Clean Energy', label: dict.about.catSolar },
    { key: 'Infrastructure', label: dict.about.catInfra },
    { key: 'National Recognition', label: dict.about.catRecognition }
  ];

  const filteredMilestones =
    activeCategory === 'All'
      ? UGVCL_MILESTONES
      : UGVCL_MILESTONES.filter((m) => m.category === activeCategory);

  return (
    <section id="about-ugvcl" className="w-full py-16 sm:py-24 bg-white dark:bg-[#0B1528] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-4xl space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
            <Building2 className="w-4 h-4" />
            <span>{dict.about.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {dict.about.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {dict.about.subtitle}
          </p>
        </div>

        {/* Alternating Photograph-and-Text Composition: Establishment & Service Territory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left: Authentic UGVCL Area Map with Lightbox Zoom */}
          <div className="lg:col-span-5 relative group">
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-2xl transition-all duration-300">
              <img
                src="/assets/ugvcl/area_map_ugvcl.jpg"
                alt="Official Area Map of UGVCL"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <button
                type="button"
                onClick={() => onOpenPhoto('photo-area-map')}
                className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-950 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all shadow-md cursor-pointer hover:scale-105"
                title="Expand and inspect official territory boundaries"
              >
                <Maximize2 className="w-4 h-4" />
                <span>{dict.about.viewFullMap}</span>
              </button>
            </div>

            <div className="mt-2.5 text-left space-y-0.5">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {dict.about.mapCaption}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dict.about.mapSource}
              </p>
            </div>
          </div>

          {/* Right: Institutional Profile & Background */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="space-y-4 text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
              <p>{dict.about.profileP1}</p>
              <p>{dict.about.profileP2}</p>
              <p>{dict.about.profileP3}</p>
            </div>

            {/* Quick Facts Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400/50 transition-colors">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">{dict.about.quickFactIncorp}</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg block mt-1">{dict.about.quickFactIncorpVal}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">{dict.about.quickFactIncorpSub}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400/50 transition-colors">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">{dict.about.quickFactOffice}</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg block mt-1">{dict.about.quickFactOfficeVal}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">{dict.about.quickFactOfficeSub}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400/50 transition-colors col-span-2 sm:col-span-1">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">{dict.about.quickFactParent}</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg block mt-1">{dict.about.quickFactParentVal}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">{dict.about.quickFactParentSub}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* NORTH GUJARAT ELECTRICITY DISTRIBUTION IN NUMBERS                 */}
        {/* ================================================================= */}
        <div className="space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800 text-left">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              <Zap className="w-4 h-4" />
              <span>{dict.about.numbersTag}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {dict.about.numbersTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal">
              {dict.about.numbersSubtitle}
            </p>
          </div>

          {/* Responsive Statistics Grid: 3 columns Desktop, 2 columns Tablet, 1 column Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {UGVCL_INFRASTRUCTURE_FACTS.map((stat) => {
              const localizedStat = getLocalizedInfraFact(stat, language);
              const trimmed = stat.value.trim();
              const isLakh = trimmed.startsWith('1.20+ Lakh');
              const num = isLakh ? '1.20+ Lakh' : trimmed.split(' ')[0] || trimmed;
              const unit = isLakh ? trimmed.replace('1.20+ Lakh', '').trim() : trimmed.split(' ').slice(1).join(' ');

              return (
                <div
                  key={stat.label}
                  className="p-6 rounded-2xl bg-slate-50 dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[175px] group text-left"
                >
                  <div className="space-y-3">
                    {/* Readable 14–16px label without truncation */}
                    <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 block leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                      {localizedStat.label}
                    </span>

                    {/* Prominent numerical value (28–36px) with separate measurement unit */}
                    <div className="flex flex-wrap items-baseline gap-2 pt-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white font-mono tracking-tight">
                        <CountUpNumber value={num} />
                      </span>
                      {unit ? (
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-300 px-2.5 py-1 rounded-md bg-blue-100/70 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 shrink-0">
                          {unit}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Supporting text naturally wrapped */}
                  <div className="pt-3.5 mt-3.5 border-t border-slate-200 dark:border-slate-800/80">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {localizedStat.note}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* HISTORICAL TIMELINE & LANDMARK MILESTONES                         */}
        {/* ================================================================= */}
        <div className="space-y-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-left">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                <Calendar className="w-4 h-4" />
                <span>{dict.about.timelineTag}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {dict.about.timelineTitle}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal">
                {dict.about.timelineSubtitle}
              </p>
            </div>

            {/* Category Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    activeCategory === cat.key
                      ? 'bg-white dark:bg-[#101C35] text-blue-700 dark:text-cyan-400 shadow-xs font-bold border border-slate-200/80 dark:border-blue-900/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Progress Rail (Desktop & Tablet) */}
          <div className="hidden md:block relative pt-3 pb-5">
            <div className="absolute top-7 left-6 right-6 h-0.5 bg-gradient-to-r from-blue-300 via-blue-500 to-cyan-400 dark:from-blue-900 dark:via-blue-700 dark:to-cyan-600 rounded-full opacity-60" />
            <div className="relative flex justify-between items-center px-4 overflow-x-auto">
              {filteredMilestones.map((item) => {
                const localized = getLocalizedMilestone(item, language);
                return (
                  <div
                    key={`rail-${item.year}`}
                    className="flex flex-col items-center group cursor-pointer"
                    onClick={() => {
                      const el = document.getElementById(`milestone-${item.year}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    title={`Jump to ${item.year}: ${localized.title}`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-cyan-400 ring-4 ring-white dark:ring-[#0B1528] shadow-xs group-hover:scale-130 transition-transform" />
                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 mt-2">
                      {item.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Redesigned Responsive Timeline Card Grid (3 columns Desktop, 2 Tablet, 1 Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredMilestones.map((item) => {
              const localized = getLocalizedMilestone(item, language);
              const itemKey = item.year;
              const isExpanded = !!expandedMilestones[itemKey];
              const needsReadMore = localized.description.length > 130;
              const displayText = isExpanded || !needsReadMore
                ? localized.description
                : `${localized.description.slice(0, 125)}...`;

              return (
                <div
                  id={`milestone-${item.year}`}
                  key={itemKey}
                  className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-blue-500 dark:hover:border-cyan-400 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[320px] group text-left"
                >
                  <div className="space-y-4">
                    {/* LEVEL 1: YEAR & LEVEL 2: CATEGORY */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-cyan-400 ring-4 ring-blue-100 dark:ring-blue-950/80 shrink-0" />
                        <span className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-cyan-400 font-mono tracking-tight">
                          {item.year}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700/80">
                        {localized.category}
                      </span>
                    </div>

                    {/* LEVEL 3: MILESTONE TITLE (19–22px) */}
                    <h4 className="text-lg sm:text-[20px] font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors break-words">
                      {localized.title}
                    </h4>

                    {/* LEVEL 4: SHORT DESCRIPTION (15–16px with Read More / Show Less) */}
                    <div className="space-y-1.5 pt-0.5">
                      <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal break-words">
                        {displayText}
                      </p>
                      {needsReadMore && (
                        <button
                          type="button"
                          onClick={() => toggleMilestoneExpand(itemKey)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 transition-colors cursor-pointer pt-0.5 focus-visible:outline-2 focus-visible:outline-blue-500 rounded"
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

                  {/* LEVEL 5: SOURCE / CITATION */}
                  <div className="pt-4 mt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
                      <span>{dict.about.verifiedCitation}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-normal break-words">
                      {localized.verifiedSource}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
