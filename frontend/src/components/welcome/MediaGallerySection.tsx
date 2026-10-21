import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Play,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Film,
  Camera,
  MapPin,
  X
} from 'lucide-react';
import { UGVCL_PHOTO_MANIFEST, UgvclPhotoAsset } from '../../data/ugvclHistoryData';

interface MediaGallerySectionProps {
  onOpenPhoto: (id: string) => void;
  onOpenManifest: () => void;
}

export const MediaGallerySection: React.FC<MediaGallerySectionProps> = ({
  onOpenPhoto,
  onOpenManifest
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const categories = ['All', 'Substations', 'Solar & Green Energy', 'Distribution Assets', 'Official Jurisdiction'];

  const filteredPhotos =
    selectedCategory === 'All'
      ? UGVCL_PHOTO_MANIFEST
      : UGVCL_PHOTO_MANIFEST.filter((p) => p.category === selectedCategory);

  return (
    <section id="gallery" className="w-full py-16 sm:py-24 bg-white dark:bg-[#0B1528] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 space-y-16 sm:space-y-20">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-3 text-left">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              <Camera className="w-4 h-4" />
              <span>Authentic Visual Documentation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              UGVCL Infrastructure & Operations Gallery
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Photographic documentation of substations, solar evacuation, distribution transformers,
              and the North Gujarat service network with complete attribution manifests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onOpenManifest}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Source & License Manifest</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-[#101C35] text-blue-700 dark:text-cyan-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => onOpenPhoto(photo.id)}
              className="group cursor-pointer rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col text-left"
            >
              {/* Media Thumbnail Container */}
              <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                {photo.localPath ? (
                  <img
                    src={photo.localPath}
                    alt={photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = photo.fallbackUrl;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-300">
                    <ShieldCheck className="w-8 h-8 text-amber-400 mb-2" />
                    <span className="text-xs font-semibold text-white">Location Verified</span>
                    <span className="text-[10px] text-slate-400 mt-1">Mehsana Corporate HQ</span>
                  </div>
                )}

                {/* Overlay Badge */}
                <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-md bg-slate-950/75 backdrop-blur-md text-[11px] font-bold text-white uppercase tracking-wider shadow-sm">
                  {photo.category}
                </div>

                <div className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="p-2 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                    <Maximize2 className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Text Information */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors leading-snug">
                    {photo.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {photo.caption}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate font-medium">{photo.location}</span>
                  </span>
                  <span className="font-mono text-xs text-slate-400 shrink-0">
                    {photo.license.split('/')[0]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Featured Video Presentation Card (No sound autoplay) */}
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left max-w-2xl">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Film className="w-4 h-4" />
              <span>Gujarat Power Sector Revolution · Video Presentation</span>
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Watch: The Gujarat Power Transformation & Jyotigram Milestone
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Educational documentary review of Gujarat's rural feeder segregation, high-voltage distribution networks,
              and 24×7 village power architecture that transformed the agrarian economy of North Gujarat.
            </p>
          </div>

          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="px-7 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold flex items-center gap-2.5 shadow-xl shadow-blue-600/30 transition-all hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Open Video Presentation</span>
          </button>
        </div>

        {/* Video Player Modal */}
        {isVideoModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <div
              className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
                <span className="text-xs font-bold text-white">
                  Gujarat Power Sector & Jyotigram Educational Archive
                </span>
                <button
                  onClick={() => setIsVideoModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video w-full bg-black flex items-center justify-center">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube-nocookie.com/embed/gHjTz9d2B1I?autoplay=0&rel=0"
                  title="Gujarat Power Distribution & Solar Infrastructure"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-4 text-left text-xs text-slate-400 bg-slate-950">
                Documentary archive preserved for educational and research evaluation under Section 107 Fair Use.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
