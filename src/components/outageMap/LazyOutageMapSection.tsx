import React, { Suspense, lazy } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { OUTAGE_MAP_TRANSLATIONS } from '../../i18n/outageMapTranslations';

const SmartOutageMapWorkspace = lazy(() => import('./SmartOutageMapWorkspace'));

export const LazyOutageMapSection: React.FC = () => {
  const { language } = useLanguage();
  const t = OUTAGE_MAP_TRANSLATIONS[language] || OUTAGE_MAP_TRANSLATIONS.en;

  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
        >
          {t.loadingOutages}
        </div>
      }
    >
      <SmartOutageMapWorkspace />
    </Suspense>
  );
};
