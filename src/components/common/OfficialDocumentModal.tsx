import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  FileDown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Lock,
  Building2,
  Table as TableIcon,
} from 'lucide-react';
import {
  GeneratedOfficialDocument,
  getDocumentUiTranslations,
  BILL_AND_RECEIPT_EXTRA_LABELS,
  triggerDocumentPrintOrSavePdf,
  triggerOfficialDocumentPdfDownload,
  isDocumentPrintInProgress,
} from '../../utils/documentEngine';
import {
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_CORPORATE_IDENTITY,
} from './UgvclBrandIdentity';
import { UgvclElectricityBillTwoPage } from '../consumer/UgvclElectricityBillTwoPage';
import { UgvclApplicationAcknowledgmentA4 } from '../consumer/UgvclApplicationAcknowledgmentA4';

interface OfficialDocumentModalProps {
  document: GeneratedOfficialDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onVerifyBillQr?: (billNo: string, consumerNo: string) => void;
}

export const OfficialDocumentModal: React.FC<OfficialDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onVerifyBillQr,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [printLocked, setPrintLocked] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  useEffect(() => {
    setPdfFeedback(null);
  }, [document?.referenceId, document?.documentType, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const ui = getDocumentUiTranslations(document.language);
  const extra =
    BILL_AND_RECEIPT_EXTRA_LABELS[document.language] ||
    BILL_AND_RECEIPT_EXTRA_LABELS.en;
  const canPrintOrDownload = document.eligible && document.authorized;

  const handleDownloadPdf = () => {
    if (!canPrintOrDownload) return;
    const res = triggerOfficialDocumentPdfDownload(document);
    if (res.downloaded) {
      setPdfFeedback(
        `${res.filename} (${res.pageCount} A4 ${
          res.pageCount === 1 ? 'page' : 'pages'
        })`
      );
    }
  };

  const handlePrintAction = () => {
    if (!canPrintOrDownload || printLocked || isDocumentPrintInProgress()) return;
    setPrintLocked(true);
    triggerDocumentPrintOrSavePdf(document);
    setTimeout(() => {
      setPrintLocked(false);
    }, 450);
  };

  const toneBadgeClasses: Record<
    GeneratedOfficialDocument['statusTone'],
    string
  > = {
    emerald:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    blue: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    amber:
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    rose: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    slate:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  };

  const fieldHighlightClasses: Record<
    NonNullable<
      GeneratedOfficialDocument['sections'][number]['fields'][number]['highlight']
    >,
    string
  > = {
    default: 'text-slate-900 dark:text-slate-100',
    emerald: 'text-emerald-700 dark:text-emerald-400 font-bold',
    blue: 'text-blue-700 dark:text-blue-400 font-bold',
    amber: 'text-amber-700 dark:text-amber-400 font-bold',
    rose: 'text-rose-700 dark:text-rose-400 font-bold',
  };

  const renderStatusIcon = () => {
    if (!document.authorized) {
      return <Lock className="w-5 h-5 text-rose-600 shrink-0" />;
    }
    if (!document.eligible) {
      return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
    }
    switch (document.statusTone) {
      case 'emerald':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'amber':
        return <Clock className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'rose':
        return <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto print:static print:inset-auto print:p-0 print:bg-white print:backdrop-blur-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="official-document-title"
      data-testid="official-document-modal"
      data-document-type={document.documentType}
      data-document-reference={document.referenceId}
      style={{ fontFamily: document.fontFamilyCss }}
    >
      <div className="relative w-full max-w-4xl my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none print:bg-white print:text-slate-950">
        {/* Top Action Toolbar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {document.filename}
            </span>
            <span
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 shrink-0"
              data-testid="document-datasource-badge"
            >
              {document.dataSourceBadge}
            </span>
            {pdfFeedback && (
              <span
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800"
                data-testid="document-pdf-downloaded-badge"
              >
                PDF Downloaded: {pdfFeedback}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {canPrintOrDownload && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  data-testid="document-download-pdf-btn"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{extra.downloadPdf}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintAction}
                  disabled={printLocked}
                  data-testid="document-print-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{ui.print}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintAction}
                  disabled={printLocked}
                  data-testid="document-print-save-pdf-btn"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200/80 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 hover:bg-slate-300/80 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{ui.printSaveAsPdf}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={ui.close}
              data-testid="document-close-btn"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>{ui.close}</span>
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Container */}
        <div
          className="overflow-y-auto p-5 sm:p-8 space-y-6 bg-white dark:bg-slate-900 print:overflow-visible print:p-6 print:space-y-4 print:bg-white print:text-slate-950"
          data-testid="official-document-printable-sheet"
        >
          {document.documentType === 'electricity_bill' &&
          document.billParticulars &&
          document.authorized &&
          document.eligible ? (
            <UgvclElectricityBillTwoPage
              document={document}
              particulars={document.billParticulars}
              language={document.language}
              onVerifyQrClick={
                onVerifyBillQr
                  ? () =>
                      onVerifyBillQr(
                        document.billParticulars!.billNo,
                        document.billParticulars!.consumerNo
                      )
                  : undefined
              }
            />
          ) : (document.documentType === 'application_acknowledgment' ||
              document.documentType === 'service_request_acknowledgment') &&
            document.authorized &&
            document.eligible ? (
            <UgvclApplicationAcknowledgmentA4
              document={document}
              language={document.language}
            />
          ) : (
            <>
              {/* Official UGVCL Corporate Masthead */}
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 print:border-slate-300">
            <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-4 border-amber-500">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-white p-1.5 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                  {!logoFailed ? (
                    <img
                      src={UGVCL_LOGO_ASSET_PATH || '/assets/ugvcl-logo.png'}
                      alt="UGVCL Official Logo"
                      className="w-full h-full object-contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-blue-700" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                      UGVCL Official Utility Statement
                    </span>
                    <span className="text-[11px] font-medium text-slate-300 font-mono">
                      CIN: {UGVCL_CORPORATE_IDENTITY.cin}
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-extrabold text-white mt-1 leading-snug">
                    {UGVCL_COMPANY_NAME_EN}
                  </h1>
                  <p className="text-xs font-semibold text-amber-300 leading-snug">
                    {UGVCL_COMPANY_NAME_GU} — {UGVCL_TAGLINE_EN}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {UGVCL_CORPORATE_IDENTITY.registeredOffice}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                <h2
                  id="official-document-title"
                  className="text-sm sm:text-base font-extrabold text-white tracking-tight sm:text-right"
                  data-testid="official-document-heading"
                >
                  {document.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border ${
                      toneBadgeClasses[document.statusTone]
                    }`}
                    data-testid="official-document-status-badge"
                  >
                    {document.statusLabel}
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 font-mono">
                  Ref: {document.referenceId}
                </span>
              </div>
            </div>

            {/* Summary KPI Strip (if summaryMetrics exist) */}
            {Array.isArray(document.summaryMetrics) &&
              document.summaryMetrics.length > 0 && (
                <div
                  className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50 dark:bg-slate-800/70"
                  data-testid="official-document-summary-metrics"
                >
                  {document.summaryMetrics.map((m, idx) => (
                    <div key={idx} className="px-4 py-3">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {m.label}
                      </span>
                      <span
                        className={`block text-sm sm:text-base font-extrabold font-mono mt-0.5 ${
                          m.tone === 'emerald'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : m.tone === 'amber'
                            ? 'text-amber-700 dark:text-amber-400'
                            : m.tone === 'rose'
                            ? 'text-rose-700 dark:text-rose-400'
                            : m.tone === 'blue'
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* DEMO / Simulation Disclosure Banner */}
          <div
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-200 text-xs leading-relaxed print:bg-amber-50 print:text-slate-900 print:border-amber-400"
            data-testid="official-document-demo-disclosure"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold uppercase tracking-wider text-[11px] block">
                {ui.demoDataNotice} ({document.dataSource})
              </span>
              <p>{document.demoDisclosureBanner}</p>
            </div>
          </div>

          {/* Lifecycle / Eligibility Status Callout */}
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              !document.authorized
                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : !document.eligible
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            } print:bg-slate-50 print:text-slate-900 print:border-slate-300`}
            data-testid="official-document-status-banner"
          >
            {renderStatusIcon()}
            <div className="space-y-1 min-w-0 flex-1">
              <p className="font-semibold break-words">
                {document.statusBannerNote}
              </p>
            </div>
          </div>

          {/* Data Integrity / Reconciliation Warnings */}
          {Array.isArray(document.integrityWarnings) &&
            document.integrityWarnings.length > 0 && (
              <div
                className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-400 text-amber-900 dark:text-amber-200 text-xs space-y-1"
                data-testid="official-document-integrity-warnings"
              >
                {document.integrityWarnings.map((w, idx) => (
                  <p key={idx} className="font-semibold">
                    • {w}
                  </p>
                ))}
              </div>
            )}

          {/* Structured Document Sections */}
          {document.sections.length > 0 && (
            <div className="space-y-5 print:space-y-4">
              {document.sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:border-slate-300 break-inside-avoid"
                  data-testid={`document-section-${section.id}`}
                >
                  <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 print:bg-slate-100 print:border-slate-300">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 print:text-slate-800">
                      {section.title}
                    </h3>
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 bg-white dark:bg-slate-900 print:bg-white">
                    {section.fields.map((field) => (
                      <div
                        key={field.key}
                        className="flex flex-col gap-0.5 pb-2 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 sm:last:border-b print:border-slate-200"
                        data-testid={`document-field-${field.key}`}
                      >
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
                          {field.label}
                        </span>
                        <span
                          className={`text-xs sm:text-sm break-words leading-snug ${
                            field.isMono ? 'font-mono tabular-nums' : 'font-medium'
                          } ${
                            fieldHighlightClasses[field.highlight || 'default']
                          } print:text-slate-950`}
                        >
                          {field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Structured Tariff / Settlement Tables */}
          {Array.isArray(document.tables) && document.tables.length > 0 && (
            <div className="space-y-5 print:space-y-4">
              {document.tables.map((table) => (
                <div
                  key={table.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:border-slate-300 break-inside-avoid"
                  data-testid={`document-table-${table.id}`}
                >
                  <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 print:bg-slate-100 print:border-slate-300">
                    <TableIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 print:text-slate-800">
                      {table.title}
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                          {table.columns.map((col) => (
                            <th
                              key={col.key}
                              className={`px-4 py-2.5 font-bold text-slate-600 dark:text-slate-300 ${
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                  ? 'text-center'
                                  : 'text-left'
                              }`}
                            >
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                          >
                            {table.columns.map((col) => (
                              <td
                                key={col.key}
                                className={`px-4 py-2.5 ${
                                  col.align === 'right'
                                    ? 'text-right font-mono tabular-nums font-semibold'
                                    : col.align === 'center'
                                    ? 'text-center font-mono'
                                    : 'text-left font-medium'
                                } text-slate-800 dark:text-slate-200`}
                              >
                                {row[col.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {table.footerNote && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {table.footerNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reverse-Side Statutory Tariffs & Guidelines (Sections H through M) */}
          {Array.isArray(document.reverseSideSections) &&
            document.reverseSideSections.length > 0 && (
              <div
                className="space-y-5 pt-6 border-t-2 border-dashed border-slate-300 dark:border-slate-700 print:break-before-page print:pt-4"
                data-testid="document-reverse-side-container"
              >
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs print:bg-slate-900 print:text-white">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                      UGVCL Bill Reverse Side · Statutory Consumer Directives
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                      Statutory Tariff Schedules, Calculation Principles & Grievance Directory
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white/10 border border-white/20 self-start sm:self-auto">
                    Page 2 of 2 (A4 Reverse)
                  </span>
                </div>

                <div className="space-y-5 print:space-y-4">
                  {document.reverseSideSections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:border-slate-300 break-inside-avoid"
                      data-testid={`document-reverse-section-${section.id}`}
                    >
                      <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 print:bg-slate-100 print:border-slate-300">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 print:text-slate-800">
                          {section.title}
                        </h4>
                      </div>

                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 bg-white dark:bg-slate-900 print:bg-white text-xs">
                        {section.fields.map((field) => (
                          <div
                            key={field.key}
                            className="flex flex-col gap-0.5 pb-2 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 sm:last:border-b print:border-slate-200"
                            data-testid={`document-reverse-field-${field.key}`}
                          >
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-700">
                              {field.label}
                            </span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal print:text-slate-900">
                              {field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Document Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 print:border-slate-300 print:text-slate-700">
            <p className="leading-relaxed">{document.footerNote}</p>
              <div className="flex items-center gap-3 shrink-0 font-mono">
                <span>Ref: {document.referenceId}</span>
                <span>•</span>
                <span>
                  {ui.generatedTimestampLabel}: {document.generatedAtDisplay}
                </span>
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
