import React from 'react';

export type UgvclBrandVariant =
  | 'header'
  | 'compact'
  | 'sidebar'
  | 'footer'
  | 'modal'
  | 'portal-banner';

interface UgvclBrandIdentityProps {
  variant?: UgvclBrandVariant;
  showGujarati?: boolean;
  showMission?: boolean;
  showDemoBadge?: boolean;
  isCollapsed?: boolean; // For sidebar
  className?: string;
}

export const UGVCL_BRAND_NAMES = {
  primary: 'Uttar Gujarat Vij Company Limited',
  acronym: 'UGVCL',
  gujarati: 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ',
  mission: 'Consumer Satisfaction through Service Excellence',
  demoNote: 'VidyutOne · Independent Demonstration Platform',
  cin: 'CIN: U40102GJ2003SGC042906'
};

export const UgvclBrandIdentity: React.FC<UgvclBrandIdentityProps> = ({
  variant = 'compact',
  showGujarati = true,
  showMission = false,
  showDemoBadge = false,
  isCollapsed = false,
  className = ''
}) => {
  const logoSrc = '/assets/ugvcl-logo.png';
  const logoAlt = 'Uttar Gujarat Vij Company Limited (UGVCL) Official Logo';

  // 1. SIDEBAR VARIANT (for ERP workspace left navigation)
  if (variant === 'sidebar') {
    if (isCollapsed) {
      return (
        <div className={`flex items-center justify-center w-full ${className}`} title={UGVCL_BRAND_NAMES.primary}>
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm border border-slate-200/40 dark:border-slate-700/60 flex items-center justify-center shrink-0">
            <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain" />
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-3 overflow-hidden text-left ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm border border-slate-200/40 dark:border-slate-700/60 flex items-center justify-center shrink-0">
          <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold text-white tracking-tight block truncate">
            {UGVCL_BRAND_NAMES.acronym}
          </span>
          <span className="text-[11px] font-semibold text-slate-300 block truncate font-gujarati">
            {UGVCL_BRAND_NAMES.gujarati}
          </span>
          <span className="text-[9px] font-mono text-cyan-400 block truncate">
            VidyutOne ERP Demo
          </span>
        </div>
      </div>
    );
  }

  // 2. COMPACT VARIANT (for top nav, mobile drawer, small headers)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 sm:gap-3 text-left min-w-0 ${className}`}>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white p-0.5 shadow-2xs border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
          <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight block truncate">
            {UGVCL_BRAND_NAMES.primary}
          </span>
          {showGujarati && (
            <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-gujarati block truncate">
              {UGVCL_BRAND_NAMES.gujarati}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. PORTAL BANNER VARIANT (for top of consumer/employee/field/management/admin dashboards)
  if (variant === 'portal-banner') {
    return (
      <div className={`flex items-center gap-3 text-left min-w-0 ${className}`}>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
          <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {UGVCL_BRAND_NAMES.primary}
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
              {UGVCL_BRAND_NAMES.acronym}
            </span>
          </div>
          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-gujarati block truncate">
            {UGVCL_BRAND_NAMES.gujarati}
          </span>
        </div>
      </div>
    );
  }

  // 4. MODAL / DIALOG MASTHEAD VARIANT (for NoticeDetailModal, RoleWelcomeModal, etc.)
  if (variant === 'modal') {
    return (
      <div className={`flex items-center gap-3 sm:gap-4 text-left min-w-0 ${className}`}>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white p-1 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
          <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {UGVCL_BRAND_NAMES.primary}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300/60 dark:border-amber-800/80">
              Demo
            </span>
          </div>
          {showGujarati && (
            <p className="text-xs text-slate-600 dark:text-slate-300 font-gujarati truncate">
              {UGVCL_BRAND_NAMES.gujarati} · {UGVCL_BRAND_NAMES.cin}
            </p>
          )}
          {showMission && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
              {UGVCL_BRAND_NAMES.mission}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 5. FOOTER VARIANT
  if (variant === 'footer') {
    return (
      <div className={`space-y-4 text-left ${className}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md border border-slate-700/60 flex items-center justify-center shrink-0">
            <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white block tracking-tight">
              {UGVCL_BRAND_NAMES.primary}
            </h3>
            <p className="text-xs text-slate-300 font-semibold font-gujarati block">
              {UGVCL_BRAND_NAMES.gujarati}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 italic">
          "{UGVCL_BRAND_NAMES.mission}"
        </p>
        {showDemoBadge && (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-800 text-[11px] text-cyan-300 font-mono">
            <span>{UGVCL_BRAND_NAMES.demoNote}</span>
          </div>
        )}
      </div>
    );
  }

  // 6. DEFAULT FULL HEADER VARIANT
  return (
    <div className={`flex items-center gap-3.5 sm:gap-5 lg:gap-6 text-left min-w-0 ${className}`}>
      <div className="w-16 sm:w-20 md:w-[92px] lg:w-[100px] shrink-0">
        <img
          src={logoSrc}
          alt={logoAlt}
          className="w-full h-auto object-contain"
          loading="eager"
        />
      </div>

      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex flex-col justify-center">
        <h1 className="text-lg sm:text-2xl md:text-[26px] lg:text-[30px] font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-full break-words">
          {UGVCL_BRAND_NAMES.primary}
        </h1>
        {showGujarati && (
          <p className="text-xs sm:text-base lg:text-[18px] font-semibold text-slate-700 dark:text-slate-300 font-gujarati leading-snug tracking-normal">
            {UGVCL_BRAND_NAMES.gujarati}
          </p>
        )}
        {showMission && (
          <p className="text-[11px] sm:text-xs lg:text-sm font-medium italic text-slate-500 dark:text-slate-400 tracking-normal leading-tight">
            {UGVCL_BRAND_NAMES.mission}
          </p>
        )}
      </div>
    </div>
  );
};
