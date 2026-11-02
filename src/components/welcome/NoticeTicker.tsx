import React, { useState, useEffect } from 'react';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { UGVCL_NOTICES, UgvclNotice } from '../../data/ugvclHistoryData';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedNotice } from '../../i18n/contentTranslations';

interface NoticeTickerProps {
  onSelectNotice: (notice: UgvclNotice) => void;
}

export const NoticeTicker: React.FC<NoticeTickerProps> = ({ onSelectNotice }) => {
  const { dict, language } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleNext = () => {
    setCurrentIdx((prev) => (prev + 1) % UGVCL_NOTICES.length);
  };

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev - 1 + UGVCL_NOTICES.length) % UGVCL_NOTICES.length);
  };

  // Auto-rotation with pause on hover/focus & reduced motion support
  useEffect(() => {
    if (isPaused) return;

    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) return;
    }

    const timer = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused, currentIdx]);

  const activeNotice = UGVCL_NOTICES[currentIdx];
  const localizedNotice = getLocalizedNotice(activeNotice, language);

  return (
    <div
      role="region"
      aria-label={dict.ticker.ariaLabel}
      className="bg-amber-500 text-slate-950 px-4 sm:px-8 lg:px-10 py-2 sm:py-2.5 text-xs sm:text-sm border-b border-amber-600 shadow-xs"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Badge + Clickable Notice Title with Reference & Date */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden min-w-0 flex-1">
          <span className="shrink-0 flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs bg-slate-950 text-amber-400 px-3 py-1 rounded-md shadow-xs">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">{dict.ticker.latest}</span> {dict.ticker.circular}
          </span>

          <button
            onClick={() => onSelectNotice(activeNotice)}
            className="text-left text-slate-950 hover:underline min-w-0 flex items-center gap-2 group cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-950 rounded px-1"
            title={`${dict.common.viewDetails}: ${localizedNotice.title}`}
          >
            <span className="font-bold text-slate-900 group-hover:text-blue-950 font-mono text-xs shrink-0 hidden sm:inline">
              [{activeNotice.refNo}]
            </span>
            <span className="text-sm sm:text-[15px] font-semibold text-slate-950 truncate max-w-full">
              {localizedNotice.title}
            </span>
            <span className="text-xs bg-amber-600/30 px-2 py-0.5 rounded font-mono font-medium shrink-0 hidden md:inline">
              {activeNotice.date}
            </span>
          </button>
        </div>

        {/* Right: Controls & Position Indicator */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handlePrev}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-amber-600/30 active:bg-amber-600/50 text-slate-950 font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-950"
            aria-label={dict.ticker.previous}
            title={dict.ticker.previous}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold px-1.5 tabular-nums text-slate-900">
            {currentIdx + 1} / {UGVCL_NOTICES.length}
          </span>

          <button
            onClick={handleNext}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-amber-600/30 active:bg-amber-600/50 text-slate-950 font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-950"
            aria-label={dict.ticker.next}
            title={dict.ticker.next}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
