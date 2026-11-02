import React from 'react';
import {
  X,
  ShieldCheck,
  Info,
  Building,
  CheckCircle2,
  AlertTriangle,
  Server,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface PresentationAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationAboutModal: React.FC<PresentationAboutModalProps> = ({
  isOpen,
  onClose
}) => {
  const { dict } = useLanguage();
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dict.modals.aboutModalTitle}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
              <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {dict.modals.aboutModalTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-gujarati truncate">
                ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ · {dict.modals.aboutModalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={dict.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Institutional Statement */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
            <span className="font-bold text-blue-900 dark:text-blue-300 text-xs flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              <span>{dict.modals.aboutStatementTitle}</span>
            </span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {dict.modals.aboutStatementDesc}
            </p>
          </div>

          {/* UGVCL Jurisdictional Scope */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {dict.modals.aboutContextTitle}
            </h4>
            <p>
              {dict.modals.aboutContextDesc}
            </p>
          </div>

          {/* Prototype Simulation Disclosures */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {dict.modals.aboutGovernanceTitle}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {dict.modals.aboutScadaTitle}
                </span>
                <p className="text-slate-500">
                  {dict.modals.aboutScadaDesc}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {dict.modals.aboutPaymentsTitle}
                </span>
                <p className="text-slate-500">
                  {dict.modals.aboutPaymentsDesc}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {dict.modals.aboutAiTitle}
                </span>
                <p className="text-slate-500">
                  {dict.modals.aboutAiDesc}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {dict.modals.aboutStorageTitle}
                </span>
                <p className="text-slate-500">
                  {dict.modals.aboutStorageDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200">
            {dict.modals.aboutNotice}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            VidyutOne · Unified Utility ERP Demonstration Platform
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            {dict.modals.aboutAcknowledge}
          </button>
        </div>
      </div>
    </div>
  );
};
