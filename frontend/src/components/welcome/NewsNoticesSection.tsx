import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Building2,
  ChevronRight,
  UserCheck,
  MapPin,
  PhoneCall,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { UGVCL_NOTICES, UgvclNotice } from '../../data/ugvclHistoryData';

interface NewsNoticesSectionProps {
  onSelectNotice: (notice: UgvclNotice) => void;
}

export const NewsNoticesSection: React.FC<NewsNoticesSectionProps> = ({ onSelectNotice }) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', 'Consumer Advisory', 'Policy & Tariff', 'Tender & Procurement', 'Maintenance'];

  const filteredNotices =
    filterCategory === 'All'
      ? UGVCL_NOTICES
      : UGVCL_NOTICES.filter((n) => n.category === filterCategory);

  return (
    <section id="notices" className="w-full py-16 sm:py-24 bg-white dark:bg-[#0B1528] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 space-y-12 sm:space-y-16">
        {/* Section Header */}
        <div className="max-w-4xl space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
            <FileText className="w-4 h-4" />
            <span>Public Information & Corporate Gazettes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[38px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            News, Circulars & Announcements
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Official operational circulars, planned maintenance schedules, and public advisories across UGVCL's 6 distribution circles.
          </p>
        </div>

        {/* 2-Column Split matching Institutional Reference Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 text-left">
          {/* Left Column: Categorized Notices Board */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter Tabs with Accessible Wrapping */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-500 ${
                    filterCategory === cat
                      ? 'bg-white dark:bg-[#101C35] text-blue-700 dark:text-cyan-400 shadow-xs font-bold border border-slate-200/80 dark:border-blue-900/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Notices List */}
            <div className="space-y-5">
              {filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => onSelectNotice(notice)}
                  className="group cursor-pointer p-6 sm:p-7 rounded-2xl bg-slate-50 dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3.5 flex-1 min-w-0">
                    {/* Metadata Header: Category + Reference + Date + Jurisdiction Circle */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-blue-700 dark:text-cyan-400 bg-blue-100/70 dark:bg-blue-950/80 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 uppercase tracking-wider text-[11px]">
                        {notice.category}
                      </span>
                      <span>·</span>
                      <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                        {notice.refNo}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                        <span>{notice.date}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{notice.circle}</span>
                      </span>
                    </div>

                    {/* Notice Title: 18–21px readable with natural wrapping */}
                    <h3 className="text-lg sm:text-[20px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors leading-snug break-words">
                      {notice.title}
                    </h3>

                    {/* Summary: 14–16px comfortable line height */}
                    <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal break-words">
                      {notice.summary}
                    </p>
                  </div>

                  {/* Action Row */}
                  <div className="pt-3.5 border-t border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Ref: {notice.officialRef || 'UGVCL Central Operations'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNotice(notice);
                      }}
                      className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-blue-700 dark:text-cyan-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    >
                      <span>View Notice</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Demonstration Notice Context Banner */}
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Demonstration circulars formatted from documented UGVCL operational records.</span>
              </span>
              <span className="font-mono text-xs text-slate-400 shrink-0">Archive Cycle: 2026-Q3</span>
            </div>
          </div>

          {/* Right Column: Managing Director's Leadership Desk */}
          <div className="lg:col-span-4 p-7 sm:p-8 rounded-2xl bg-white dark:bg-[#0E1A33] text-slate-900 dark:text-white border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex items-center gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="w-13 h-13 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0 shadow-xs">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Managing Director's Desk
                  </h3>
                  <p className="text-xs font-semibold text-blue-700 dark:text-cyan-400">
                    Uttar Gujarat Vij Company Limited
                  </p>
                </div>
              </div>

              <blockquote className="text-[15px] sm:text-base text-slate-700 dark:text-slate-200 italic leading-relaxed font-normal">
                "Our guiding philosophy is citizen-first electricity governance. From ensuring continuous 3-phase
                power to rural agriculture under Jyotigram and Kisan Suryodaya Yojana to adopting automated smart-meter
                telemetry, UGVCL remains committed to powering North Gujarat's industrial prowess and agrarian prosperity."
              </blockquote>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-medium">Corporate Headquarters:</span>
                <span className="font-semibold text-slate-900 dark:text-white">Mehsana - 384001</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-medium">Consumer Redressal:</span>
                <a
                  href="tel:19122"
                  className="font-bold text-blue-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>19122 (24×7 Toll-Free)</span>
                </a>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-medium">Operating Framework:</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">GUVNL Ashta Vajra</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="font-medium">Jurisdiction Network:</span>
                <span className="font-semibold text-slate-900 dark:text-white">6 Administrative Circles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
