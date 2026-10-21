import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Calendar,
  Building2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  Printer,
  PhoneCall,
  Info
} from 'lucide-react';
import { UgvclNotice } from '../../data/ugvclHistoryData';

interface NoticeDetailModalProps {
  notice: UgvclNotice | null;
  onClose: () => void;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({ notice, onClose }) => {
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Keyboard navigation & accessibility (Escape key, Focus management, Background scroll lock)
  useEffect(() => {
    if (!notice) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Lock background scrolling while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement.current?.focus();
    };
  }, [notice, onClose]);

  if (!notice) return null;

  const handleCopy = async () => {
    const textToCopy = `UTTAR GUJARAT VIJ COMPANY LIMITED (UGVCL)
${notice.isSampleDemo ? 'DEMONSTRATION CIRCULAR RECORD / PUBLIC ADVISORY' : 'OFFICIAL CIRCULAR / PUBLIC NOTIFICATION'}
--------------------------------------------------
Reference No : ${notice.refNo}
Date of Issue: ${notice.date}
Category     : ${notice.category}
Jurisdiction : ${notice.circle}
Subject      : ${notice.title}
--------------------------------------------------
SUMMARY & OPERATIONAL SCOPE:
${notice.summary}

ADMINISTRATIVE CONTEXT:
Corporate Office: Visnagar Road, Mehsana - 384001, Gujarat
Consumer Helpline: 19122 / 1800 233 155335
Archive Reference: ${notice.officialRef || notice.source || 'Public Discom Archive'}${notice.isSampleDemo ? '\n[Note: VidyutOne Independent Demonstration Platform Record]' : ''}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      setCopied(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Category badge styling helper
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Consumer Advisory':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700';
      case 'Maintenance':
        return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700';
      case 'Policy & Tariff':
        return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700';
      case 'Tender & Procurement':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-modal-title"
      aria-describedby="notice-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:fixed print:inset-0"
      onClick={onClose}
    >
      {/* Dialog container: Max-width 860px, max-height 88vh, responsive margins */}
      <div
        className="relative w-full max-w-[860px] max-h-[88vh] bg-white dark:bg-[#0B1528] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* INSTITUTIONAL HEADER & MASTHEAD                                   */}
        {/* ================================================================= */}
        <div className="bg-[#071329] text-white px-5 sm:px-7 py-4 sm:py-5 border-b border-blue-900/60 shrink-0 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-start justify-between gap-4">
            {/* Discom Brand & Masthead Details */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white p-1 border border-slate-200 shadow-sm flex items-center justify-center shrink-0 print:hidden">
                <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 dark:text-amber-300 font-mono print:text-black">
                    {notice.isSampleDemo ? 'Demonstration Notice Record' : 'Public Discom Circular'}
                  </span>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-400" />
                  <span className="text-[10px] sm:text-xs text-slate-300 dark:text-slate-300 font-medium print:text-black">
                    Corporate Office, Mehsana
                  </span>
                </div>

                <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate print:text-black print:text-lg">
                  Uttar Gujarat Vij Company Limited
                </h1>

                <p className="text-[11px] text-slate-400 font-gujarati hidden sm:block truncate print:block print:text-black">
                  ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ · CIN: U40102GJ2003SGC042906
                </p>
              </div>
            </div>

            {/* Close Button with accessible focus and hover states */}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              type="button"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071329] print:hidden"
              aria-label="Close circular details modal"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SCROLLABLE CIRCULAR BODY (Vertical scroll with comfortable padding)*/}
        {/* ================================================================= */}
        <div className="p-5 sm:p-7 md:p-8 space-y-6 text-left overflow-y-auto flex-1 min-h-0 print:overflow-visible print:p-4">
          {/* Key-Value Structured Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-4.5 rounded-2xl bg-slate-50 dark:bg-[#0E1A33] border border-slate-200 dark:border-slate-800 text-xs print:bg-slate-50 print:border-slate-300">
            {/* 1. Reference Number */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block print:text-slate-600">
                Circular Ref No.
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-cyan-300 text-xs sm:text-[13px] block break-all print:text-black">
                {notice.refNo}
              </span>
            </div>

            {/* 2. Notice Category */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block print:text-slate-600">
                Category
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] uppercase tracking-wide border ${getCategoryStyles(
                  notice.category
                )} print:border print:border-black print:text-black`}
              >
                {notice.category}
              </span>
            </div>

            {/* 3. Publication Date */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block print:text-slate-600">
                Issue Date
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] print:text-black">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0 print:hidden" />
                <span>{notice.date}</span>
              </div>
            </div>

            {/* 4. Jurisdiction Circle */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block print:text-slate-600">
                Jurisdiction
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] truncate print:text-black">
                <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 print:hidden" />
                <span className="truncate">{notice.circle}</span>
              </div>
            </div>
          </div>

          {/* Notice Subject / Title (Prominent, High Contrast 20–24px) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400 flex items-center gap-1.5 print:text-slate-600">
              <Info className="w-3.5 h-3.5 print:hidden" />
              <span>Subject & Operational Scope</span>
            </span>
            <h2
              id="notice-modal-title"
              className="text-xl sm:text-2xl md:text-[24px] font-black text-slate-900 dark:text-white tracking-tight leading-snug break-words print:text-black"
            >
              {notice.title}
            </h2>
          </div>

          {/* Official Notification Order / Executive Summary */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block print:text-slate-600">
              Official Notification Order Text
            </span>
            <div
              id="notice-modal-desc"
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#071329] border border-slate-200 dark:border-slate-800/90 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-normal shadow-xs break-words print:border-slate-300 print:text-black print:bg-white"
            >
              {notice.summary}
            </div>
          </div>

          {/* Operational Context & Consumer Directives */}
          <div className="space-y-3 p-5 sm:p-6 rounded-2xl bg-blue-50/70 dark:bg-slate-900/50 border border-blue-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 print:bg-white print:border-slate-300 print:text-black">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white print:text-black">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 print:hidden" />
              <span>Operational Advisory & Administrative Directives</span>
            </div>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed text-slate-600 dark:text-slate-300 print:text-black">
              <li>
                Reference Jurisdiction: Operational jurisdiction under{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">{notice.circle}</span>,
                coordinated through UGVCL Corporate Office, Visnagar Road, Mehsana, Gujarat.
              </li>
              <li>
                Service Standards: Operations conducted under Gujarat Electricity Regulatory Commission (GERC)
                distribution and consumer service guidelines.
              </li>
              <li className="flex items-center gap-1.5 flex-wrap">
                <span>Consumer Grievances & 24×7 Escalation Desk:</span>
                <a
                  href="tel:19122"
                  className="font-bold text-blue-700 dark:text-cyan-400 hover:underline flex items-center gap-1 print:text-black print:no-underline"
                >
                  <PhoneCall className="w-3 h-3 print:hidden" />
                  <span>19122 / 1800 233 155335</span>
                </a>
              </li>
              <li>
                Official Reference Record Archive:{' '}
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200 print:text-black">
                  {notice.officialRef || notice.source || 'UGVCL Corporate Gazette Records'}
                </span>
                .
              </li>
            </ul>
          </div>

          {/* Demonstration Platform Notice (if sample data) */}
          {notice.isSampleDemo && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3 print:hidden">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <span className="font-bold block">Independent Demonstration Platform Record</span>
                <span className="text-amber-800 dark:text-amber-300/90 leading-relaxed block">
                  This public circular data is structured from public UGVCL operational records for the VidyutOne demonstration system. It is provided for functional verification and does not supersede active statutory gazette orders published on the state power portal.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER ACTION CONTROLS & PDF / PRINT EXPORT                       */}
        {/* ================================================================= */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4.5 bg-slate-50 dark:bg-[#071329] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          {/* Left Actions: Copy Details, Print / PDF, External Source Link */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Copy Details */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Copy official circular details to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Copy Details</span>
                </>
              )}
            </button>

            {/* Print Official Circular / Save as PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Print or Save Official Circular as PDF"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Print / Save PDF</span>
            </button>

            {/* External Official Source Link */}
            {notice.sourceUrl && (
              <a
                href={notice.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="View original official source page on UGVCL portal"
              >
                <span>Official Source</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}
          </div>

          {/* Right Action: Close Dialog */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
