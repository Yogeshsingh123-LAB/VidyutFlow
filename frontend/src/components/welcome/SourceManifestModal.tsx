import React from 'react';
import { X, ShieldCheck, ExternalLink, MapPin, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { UGVCL_PHOTO_MANIFEST } from '../../data/ugvclHistoryData';

interface SourceManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceManifestModal: React.FC<SourceManifestModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manifest-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-white dark:bg-[#0D182E] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0A1C3E] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 id="manifest-modal-title" className="text-base font-bold text-white">
                Authentic UGVCL Photographic & Historical Manifest
              </h3>
              <p className="text-xs text-cyan-300">
                Audited against UGVCL Corporate Records, Ministry of Power filings, and verified Wikimedia Commons archives
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close manifest"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              Strict Asset Transparency & Attribution Policy:
            </p>
            <p>
              In compliance with official presentation guidelines, no artificial AI-generated photos or unrelated international stock photos are labeled as UGVCL assets. Every asset is verified, licensed for reuse, attributed with its creator, and cataloged below.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3">Asset Title</th>
                  <th className="p-3">Subject & Location</th>
                  <th className="p-3">License & Attribution</th>
                  <th className="p-3">Status / Verified Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {UGVCL_PHOTO_MANIFEST.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <div>{item.title}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{item.subject}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>{item.location}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-blue-700 dark:text-cyan-400">{item.license}</div>
                      <div className="text-[11px] text-slate-500">{item.attribution}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        {item.statusNotes}
                      </div>
                      {item.originalSourceUrl ? (
                        <a
                          href={item.originalSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <span>Original Archival Record</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Institutional Archive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Close Manifest
          </button>
        </div>
      </div>
    </div>
  );
};
