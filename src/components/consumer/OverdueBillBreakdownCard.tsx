import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  OverdueFinancialBreakdown,
  getLateChargeTranslations,
} from '../../utils/lateChargeEngine';
import {
  FormalNoticeRecord,
  getFormalNoticeTranslations,
} from '../../utils/formalNoticeEngine';
import {
  AlertCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  CreditCard,
  FileText,
  Scale,
  CheckCircle2,
  Download,
} from 'lucide-react';

interface OverdueBillBreakdownCardProps {
  breakdown: OverdueFinancialBreakdown;
  formalNotice?: FormalNoticeRecord | null;
  onPay?: (billNo: string, amountToPay?: number) => void;
  onViewAccountStatement?: (billNo: string) => void;
  onDownloadStatementPdf?: (billNo: string) => void;
  onDownloadStatementCsv?: (billNo: string, breakdown: OverdueFinancialBreakdown) => void;
  className?: string;
  compact?: boolean;
}

export const OverdueBillBreakdownCard: React.FC<OverdueBillBreakdownCardProps> = ({
  breakdown,
  formalNotice,
  onPay,
  onViewAccountStatement,
  onDownloadStatementPdf,
  onDownloadStatementCsv,
  className = '',
  compact = false,
}) => {
  const { language } = useLanguage();
  const t = getLateChargeTranslations(language);
  const fnT = getFormalNoticeTranslations(language);

  const formatCurrency = (amt: number) => {
    return `₹${amt.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const waivedOrSettledCharges = Number(
    ((breakdown.lateChargesWaived || 0) + (breakdown.lateChargesSettled || 0)).toFixed(2)
  );

  return (
    <div
      data-testid={`overdue-breakdown-${breakdown.billNo}`}
      className={`rounded-2xl border border-slate-200/90 dark:border-rose-900/70 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Header bar with Days Overdue Badge (8), Original Due Date (7), and Last Calculation Date (9) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-rose-900/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span data-testid="overdue-days-badge">
              {t.daysOverdue(breakdown.daysOverdue)}
            </span>
          </span>
          <span
            data-testid="overdue-original-due-date"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border border-rose-200/70 dark:border-rose-800/60"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {fnT.nineFields.originalDueDate}: {breakdown.dueDate}
            </span>
          </span>
          <span
            data-testid="overdue-last-calculation-date"
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums"
          >
            {fnT.nineFields.lastCalculationDate}: {breakdown.referenceDate}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50/70 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 self-start sm:self-auto">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>
            {t.overdue} · {breakdown.policyVersion}
          </span>
        </div>
      </div>

      {/* Canonical 9-Field Financial Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-stretch">
        {/* Field 1: Original Bill Amount */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between h-full">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 leading-snug">
            1. {fnT.nineFields.originalBillAmount}
          </span>
          <span
            data-testid="overdue-original-amount"
            className="text-lg sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white tracking-tight"
          >
            {formatCurrency(breakdown.originalBillAmount)}
          </span>
        </div>

        {/* Field 2: Payments Successfully Settled */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between h-full">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 leading-snug">
            2. {fnT.nineFields.paymentsSuccessfullySettled}
          </span>
          <span
            data-testid="overdue-payment-received"
            className="text-lg sm:text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight"
          >
            {formatCurrency(breakdown.successfulPayments)}
          </span>
        </div>

        {/* Field 3: Remaining Principal */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between h-full">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 leading-snug">
            3. {fnT.nineFields.remainingPrincipal}
          </span>
          <span
            data-testid="overdue-remaining-principal"
            className="text-lg sm:text-xl font-extrabold tabular-nums text-amber-700 dark:text-amber-300 tracking-tight"
          >
            {formatCurrency(breakdown.remainingPrincipal)}
          </span>
        </div>

        {/* Field 4: Accrued Late-Payment Charges (DPS) */}
        <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-1.5 mb-1.5">
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 leading-snug">
              4. {t.lateCharges}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0 tabular-nums">
              {breakdown.effectiveAnnualRatePercent}% p.a.
            </span>
          </div>
          <div>
            <span
              data-testid="overdue-late-charges"
              className="text-lg sm:text-xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300 tracking-tight block"
            >
              +{formatCurrency(breakdown.netLateChargesPayable)}
            </span>
            <span className="text-[11px] font-medium text-rose-600/90 dark:text-rose-400/80 block mt-0.5 tabular-nums">
              ≈ ₹{breakdown.dailyChargeRate.toFixed(3)}/day ({breakdown.chargeableDays}d)
            </span>
          </div>
        </div>

        {/* Field 5: Charges Already Paid or Waived */}
        <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 col-span-2 lg:col-span-1 flex flex-col justify-between h-full">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 leading-snug">
            5. {fnT.nineFields.chargesAlreadyPaidOrWaived}
          </span>
          <span
            data-testid="overdue-waived-or-settled-charges"
            className="text-lg sm:text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300 tracking-tight"
          >
            {formatCurrency(waivedOrSettledCharges)}
          </span>
        </div>
      </div>

      {/* Formal Notice Banner (Section 56 DEMO Workflow) */}
      {formalNotice && formalNotice.status !== 'NOT_REQUIRED' && (
        <div
          data-testid={`formal-notice-banner-${formalNotice.noticeId}`}
          className={`p-4 rounded-xl border ${
            formalNotice.status === 'RESOLVED' || formalNotice.status === 'WITHDRAWN'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
              : formalNotice.status === 'ON_HOLD'
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60'
              : 'bg-amber-50/75 dark:bg-amber-950/30 border-amber-200/90 dark:border-amber-800/70'
          } space-y-3`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-200/60 dark:border-amber-800/40">
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {fnT.sectionTitle}
                <span className="ml-2 inline-block px-2 py-0.5 rounded bg-white/80 dark:bg-slate-800 border border-amber-200/80 dark:border-amber-700 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  {formalNotice.noticeId}
                </span>
              </span>
            </div>
            <span
              data-testid="formal-notice-status-badge"
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 text-white shadow-2xs shrink-0"
            >
              {fnT.statuses[formalNotice.status]}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="min-w-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium mb-0.5">
                {fnT.issueDateLabel} / {fnT.serviceDateLabel}
              </span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums block">
                {formalNotice.issueDate || 'Pending'}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                {formalNotice.serviceEvidenceRef || 'DEMO'}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium mb-0.5">
                {fnT.paymentDeadlineLabel}
              </span>
              <div
                data-testid="formal-notice-deadline"
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                  {formalNotice.paymentDeadlineDate || 'N/A'}
                </span>
                {formalNotice.daysRemainingUntilDeadline !== null && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-100/80 dark:bg-rose-900/50 text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                    {fnT.daysRemainingLabel(formalNotice.daysRemainingUntilDeadline)}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium mb-0.5">
                {fnT.snapshotAtIssuanceTitle}
              </span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums block">
                {formatCurrency(formalNotice.snapshotAtIssuance.totalOutstandingAtIssuance)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                as of {formalNotice.snapshotAtIssuance.snapshotReferenceDate}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span>
              <strong className="text-slate-700 dark:text-slate-200">{fnT.disconnectionReviewLabel}:</strong>{' '}
              {fnT.disconnectionReviewStatuses[formalNotice.disconnectionReviewStatus]}
            </span>
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
              {formalNotice.statutoryCitation}
            </span>
          </div>
        </div>
      )}

      {/* Field 6: Total Current Outstanding Payable Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 sm:p-5 rounded-xl bg-[#0A2540] dark:bg-slate-950 text-white shadow-sm">
        <div>
          <span className="text-xs text-slate-300 block font-medium">
            6. {fnT.nineFields.totalCurrentOutstanding} ({t.remainingPrincipal} + {t.lateCharges})
          </span>
          <div className="flex flex-wrap items-baseline gap-2.5 mt-1">
            <span
              data-testid="overdue-total-outstanding"
              className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white tracking-tight"
            >
              {formatCurrency(breakdown.totalOutstandingPayable)}
            </span>
            <span className="text-xs text-amber-300 font-semibold">
              ({breakdown.chargeableDays}{' '}
              {language === 'gu'
                ? 'દિવસ ચાર્જ'
                : language === 'hi'
                ? 'दिन शुल्क'
                : language === 'mr'
                ? 'दिवस आकारणी'
                : 'days chargeable'}
              )
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onViewAccountStatement && (
            <button
              type="button"
              onClick={() => onViewAccountStatement(breakdown.billNo)}
              data-testid={`view-account-statement-btn-${breakdown.billNo}`}
              className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{fnT.updatedAccountStatementBtn}</span>
            </button>
          )}
          {onDownloadStatementPdf && (
            <button
              type="button"
              onClick={() => onDownloadStatementPdf(breakdown.billNo)}
              data-testid={`download-statement-pdf-btn-${breakdown.billNo}`}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download Overdue Breakdown & Account Statement PDF"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>PDF</span>
            </button>
          )}
          {onDownloadStatementCsv && (
            <button
              type="button"
              onClick={() => onDownloadStatementCsv(breakdown.billNo, breakdown)}
              data-testid={`download-statement-csv-btn-${breakdown.billNo}`}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download Overdue Financial Breakdown CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          )}
          {onPay && breakdown.totalOutstandingPayable > 0 && (
            <button
              type="button"
              onClick={() => onPay(breakdown.billNo, breakdown.totalOutstandingPayable)}
              data-testid="pay-overdue-total-btn"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.payTotalOutstandingBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Restrained Statutory / DEMO Policy Disclosure */}
      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
        <span data-testid="overdue-policy-disclaimer">{breakdown.policyDisclaimer}</span>
      </div>
    </div>
  );
};
