import React from 'react';
import { X, ExternalLink, ShieldCheck, MapPin, Award, CheckCircle2 } from 'lucide-react';
import { UgvclPhotoAsset } from '../../data/ugvclHistoryData';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedPhoto } from '../../i18n/contentTranslations';

interface MediaLightboxModalProps {
  photo: UgvclPhotoAsset | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ photo, onClose }) => {
  const { dict, language } = useLanguage();

  if (!photo) return null;

  const localized = getLocalizedPhoto(photo, language);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-white dark:bg-[#0F1C36] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1528]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              {localized.category}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {dict.modals.verifiedManifest}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close photo preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Display */}
        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden max-h-[55vh]">
          {photo.localPath ? (
            <img
              src={photo.localPath}
              alt={localized.title}
              className="w-full h-full object-contain max-h-[55vh]"
              onError={(e) => {
                // Fallback to original url if localPath has issues
                (e.currentTarget as HTMLImageElement).src = photo.fallbackUrl;
              }}
            />
          ) : (
            <div className="py-20 px-6 text-center text-slate-300 max-w-md">
              <ShieldCheck className="w-12 h-12 mx-auto text-amber-400 mb-3" />
              <p className="font-semibold text-white text-base mb-1">{localized.title}</p>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {localized.statusNotes || photo.statusNotes}
              </p>
              <span className="inline-block px-3 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-amber-300">
                {dict.modals.verifiedAddress}
              </span>
            </div>
          )}
        </div>

        {/* Description & Source Attribution */}
        <div className="p-6 overflow-y-auto space-y-4 text-left">
          <div>
            <h3 id="lightbox-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {localized.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {localized.caption}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                {dict.modals.subjectInfra}
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{localized.subject}</p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                {dict.modals.geoLoc}
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{localized.location}</span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                {dict.modals.legalLicense}
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {photo.attribution} ({photo.license})
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">
                {dict.modals.sourceVerification}
              </span>
              {photo.originalSourceUrl ? (
                <a
                  href={photo.originalSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{dict.modals.openArchival}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="font-medium text-slate-500">Official UGVCL Corporate Archive</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
