import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { localizeToastMessage } from '../../i18n/employeeContentTranslations';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  const { language, t } = useLanguage();

  if (toasts.length === 0) return null;

  // Limit visible stack to at most 3 recent notifications so the UI is never overwhelmed
  const visibleToasts = toasts.slice(-3);

  return (
    <div
      role="region"
      aria-label={t.erp.notifications}
      aria-live="polite"
      className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-xs sm:max-w-sm w-full pointer-events-none"
    >
      {visibleToasts.map(toast => {
        const iconMap = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />,
          error: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />,
          info: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
        };

        const styleMap = {
          success: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-100 border-l-4 border-l-emerald-600',
          error: 'border-rose-300 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/90 text-rose-950 dark:text-rose-100 border-l-4 border-l-rose-600',
          warning: 'border-amber-300 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/90 text-amber-950 dark:text-amber-100 border-l-4 border-l-amber-500',
          info: 'border-blue-300 dark:border-blue-800 bg-blue-50/95 dark:bg-[#131D31]/95 text-slate-900 dark:text-slate-100 border-l-4 border-l-blue-600'
        };

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 rounded-lg border shadow-md backdrop-blur-xs transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${styleMap[toast.type]}`}
          >
            {iconMap[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-snug break-words">
                {localizeToastMessage(toast.message, language)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition-colors shrink-0 cursor-pointer"
              aria-label={t.common.close}
              title={t.common.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
