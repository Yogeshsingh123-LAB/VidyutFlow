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
} from 'lucide-react';

interface OverdueBillBreakdownCardProps {
  breakdown: OverdueFinancialBreakdown;
  formalNotice?: FormalNoticeRecord | null;
  onPay?: (billNo: string, amountToPay?: number) => void;
  onViewAccountStatement?: (billNo: string) => void;
  className?: string;
  compact?: boolean;
}

export const OverdueBillBreakdownCard: React.FC<OverdueBillBreakdownCardProps> = ({
  breakdown,
  formalNotice,
  onPay,
  onViewAccountStatement,
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
      className={`rounded-xl border border-rose-200/90 dark:border-rose-900/70 bg-linear-to-b from-rose-50/70 via-white to-amber-50/40 dark:from-rose-950/20 dark:via-slate-900 dark:to-amber-950/10 p-4 sm:p-5 shadow-2xs space-y-4 ${className}`}
    >
      {/* Header bar with Days Overdue Badge (8), Original Due Date (7), and Last Calculation Date (9) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-rose-100 dark:border-rose-900/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span data-testid="overdue-days-badge">
              {fnT.nineFields.daysOverdue}: {breakdown.daysOverdue} ({t.daysOverdue(breakdown.daysOverdue)})
            </span>
          </span>
          <span
            data-testid="overdue-original-due-date"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200"
          >
            <Clock className="w-3 h-3" />
            <span>
              {fnT.nineFields.originalDueDate}: {breakdown.dueDate}
            </span>
          </span>
          <span
            data-testid="overdue-last-calculation-date"
            className="text-xs text-slate-500 dark:text-slate-400 font-mono"
          >
            {fnT.nineFields.lastCalculationDate}: {breakdown.referenceDate}
          </span>
        </div>

        <div className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>
            {t.overdue} · {breakdown.policyVersion}
          </span>
        </div>
      </div>

      {/* Canonical 9-Field Financial Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Field 1: Original Bill Amount */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            1. {fnT.nineFields.originalBillAmount}
          </span>
          <span
            data-testid="overdue-original-amount"
            className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white"
          >
            {formatCurrency(breakdown.originalBillAmount)}
          </span>
        </div>

        {/* Field 2: Payments Successfully Settled */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            2. {fnT.nineFields.paymentsSuccessfullySettled}
          </span>
          <span
            data-testid="overdue-payment-received"
            className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400"
          >
            {formatCurrency(breakdown.successfulPayments)}
          </span>
        </div>

        {/* Field 3: Remaining Principal */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            3. {fnT.nineFields.remainingPrincipal}
          </span>
          <span
            data-testid="overdue-remaining-principal"
            className="text-base sm:text-lg font-bold font-mono text-amber-700 dark:text-amber-300"
          >
            {formatCurrency(breakdown.remainingPrincipal)}
          </span>
        </div>

        {/* Field 4: Accrued Late-Payment Charges (DPS) */}
        <div className="p-3 rounded-lg bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
              4. {t.lateCharges}
            </span>
            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400">
              {breakdown.effectiveAnnualRatePercent}% p.a.
            </span>
          </div>
          <span
            data-testid="overdue-late-charges"
            className="text-base sm:text-lg font-extrabold font-mono text-rose-700 dark:text-rose-300"
          >
            +{formatCurrency(breakdown.netLateChargesPayable)}
          </span>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5">
            ≈ ₹{breakdown.dailyChargeRate.toFixed(3)}/day ({breakdown.chargeableDays}d accrued)
          </span>
        </div>

        {/* Field 5: Charges Already Paid or Waived */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
            5. {fnT.nineFields.chargesAlreadyPaidOrWaived}
          </span>
          <span
            data-testid="overdue-waived-or-settled-charges"
            className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300"
          >
            {formatCurrency(waivedOrSettledCharges)}
          </span>
        </div>
      </div>

      {/* Formal Notice Banner (Section 56 DEMO Workflow) */}
      {formalNotice && formalNotice.status !== 'NOT_REQUIRED' && (
        <div
          data-testid={`formal-notice-banner-${formalNotice.noticeId}`}
          className={`p-3.5 rounded-xl border ${
            formalNotice.status === 'RESOLVED' || formalNotice.status === 'WITHDRAWN'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
              : formalNotice.status === 'ON_HOLD'
              ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60'
              : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/70'
          } space-y-2`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {fnT.sectionTitle} · <span className="font-mono">{formalNotice.noticeId}</span>
              </span>
            </div>
            <span
              data-testid="formal-notice-status-badge"
              className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-600 text-white"
            >
              {fnT.statuses[formalNotice.status]}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                {fnT.issueDateLabel} / {fnT.serviceDateLabel}
              </span>
              <span className="font-mono font-semibold">
                {formalNotice.issueDate || 'Pending'} ({formalNotice.serviceEvidenceRef || 'DEMO'})
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                {fnT.paymentDeadlineLabel}
              </span>
              <span
                data-testid="formal-notice-deadline"
                className="font-mono font-bold text-rose-700 dark:text-rose-300"
              >
                {formalNotice.paymentDeadlineDate || 'N/A'}
                {formalNotice.daysRemainingUntilDeadline !== null && (
                  <span className="ml-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                    ({fnT.daysRemainingLabel(formalNotice.daysRemainingUntilDeadline)})
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                {fnT.snapshotAtIssuanceTitle}
              </span>
              <span className="font-mono font-semibold">
                {formatCurrency(formalNotice.snapshotAtIssuance.totalOutstandingAtIssuance)} (as of{' '}
                {formalNotice.snapshotAtIssuance.snapshotReferenceDate})
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between flex-wrap gap-2">
            <span>
              <strong>{fnT.disconnectionReviewLabel}:</strong>{' '}
              {fnT.disconnectionReviewStatuses[formalNotice.disconnectionReviewStatus]}
            </span>
            <span className="font-mono text-[10px] text-amber-800 dark:text-amber-300">
              {formalNotice.statutoryCitation}
            </span>
          </div>
        </div>
      )}

      {/* Field 6: Total Current Outstanding Payable Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-white shadow-xs">
        <div>
          <span className="text-xs text-slate-300 block font-medium">
            6. {fnT.nineFields.totalCurrentOutstanding} ({t.remainingPrincipal} + {t.lateCharges})
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span
              data-testid="overdue-total-outstanding"
              className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight"
            >
              {formatCurrency(breakdown.totalOutstandingPayable)}
            </span>
            <span className="text-xs text-amber-300 font-medium">
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
