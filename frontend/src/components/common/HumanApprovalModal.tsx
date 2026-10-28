import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeAIRecommendation,
  localizeApprovalPermissionReason,
  localizeEmployeeDesignation
} from '../../i18n/employeeContentTranslations';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  UserCheck,
  Lock,
  FileText,
  Sparkles
} from 'lucide-react';
import { AIActionRecommendation } from '../../types';
import { validateApprovalPermission } from '../../utils/aiRecommendationEngine';

interface HumanApprovalModalProps {
  recommendation: AIActionRecommendation | null;
  onClose: () => void;
  onApprove: (id: string, remarks: string) => void;
  onReject: (id: string, remarks: string) => void;
}

export const HumanApprovalModal: React.FC<HumanApprovalModalProps> = ({
  recommendation,
  onClose,
  onApprove,
  onReject
}) => {
  const { currentRole, activeUser } = useApp();
  const { t, language } = useLanguage();
  const te = t.employee;
  const [remarks, setRemarks] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRemarks('');
    setValidationError(null);
    setIsSubmitting(false);
  }, [recommendation?.id]);

  useEffect(() => {
    if (!recommendation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recommendation, onClose]);

  if (!recommendation) return null;

  const locRec = localizeAIRecommendation(recommendation, language);
  const authCheck = validateApprovalPermission(recommendation, currentRole);
  const isAuthorized = authCheck.allowed;
  const isHighOrCritical = recommendation.riskLevel === 'HIGH' || recommendation.riskLevel === 'CRITICAL';

  const handleApprove = () => {
    if (!isAuthorized) {
      setValidationError(
        authCheck.reason
          ? localizeApprovalPermissionReason(authCheck.reason, language)
          : te.approvalModalAuthRestrictedPrefix
      );
      return;
    }

    if (isHighOrCritical && (!remarks || remarks.trim().length < 8)) {
      setValidationError(te.approvalModalErrorMandatory);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    onApprove(recommendation.id, remarks.trim() || t.incident.decisionApproved);
  };

  const handleReject = () => {
    if (!remarks || remarks.trim().length < 5) {
      setValidationError(te.approvalModalErrorRejectionReason);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    onReject(recommendation.id, remarks.trim());
  };

  const riskBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
    CRITICAL: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' },
    HIGH: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' },
    MEDIUM: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
    LOW: { bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' }
  };

  const currentBadge = riskBadgeStyles[recommendation.riskLevel] || riskBadgeStyles.MEDIUM;

  const activeRoleLabel =
    currentRole === 'employee'
      ? t.erp.roleEmployee
      : currentRole === 'field'
      ? t.erp.roleField
      : currentRole === 'management'
      ? t.erp.roleManagement
      : currentRole === 'admin'
      ? t.erp.roleAdmin
      : t.erp.roleConsumer;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="human-approval-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {recommendation.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${currentBadge.bg} ${currentBadge.text} ${currentBadge.border}`}>
                  {locRec.riskLevelLabel}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {te.approvalModalRequiredApproverPrefix} {locRec.requiredRoleLabel}
                </span>
              </div>
              <h2 id="human-approval-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                {locRec.title}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span>
                  {te.approvalModalRecommendedByPrefix} <strong>{locRec.agentPersonaName}</strong> ({t.erp.roleEmployee})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={te.approvalModalCloseAria}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Diff: Previous vs Proposed Values */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            {te.approvalModalStateTransitionHeading}
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 block">{te.approvalModalAffectedEntityLabel}</span>
              <strong className="font-mono text-slate-900 dark:text-white">
                {locRec.entityTypeLabel}: {recommendation.affectedRecord.id}
              </strong>
              <div className="text-[11px] text-slate-500">{locRec.affectedRecordLabel}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs line-through opacity-75">
                {locRec.previousValueLabel}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800">
                {locRec.proposedValueLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Grounded Evidence & Reasoning */}
        <div className="space-y-2.5 text-xs">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              {te.approvalModalAiReasoningLabel}
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
              {locRec.reasoningSummary}
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              {te.approvalModalSupportingRefsLabel}
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {locRec.supportingRecordReferences.map((ref, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{ref}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Approver Identity & Authorization Status */}
        <div className="p-3.5 rounded-xl border transition-colors text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {te.approvalModalActiveIdentityLabel}
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {activeUser.name} ({localizeEmployeeDesignation(activeUser.designation, language)})
              </span>
            </div>
            <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
              {te.approvalModalActiveRoleLabel} {activeRoleLabel}
            </span>
          </div>

          {isAuthorized ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold pt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{te.approvalModalIdentityVerifiedMsg}</span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800 pt-1.5">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <strong>{te.approvalModalAuthRestrictedPrefix}</strong>{' '}
                {authCheck.reason ? localizeApprovalPermissionReason(authCheck.reason, language) : ''}
              </div>
            </div>
          )}
        </div>

        {/* Reviewer Remarks Input */}
        <div className="space-y-1 text-xs">
          <label htmlFor="human-approval-remarks" className="font-semibold text-slate-700 dark:text-slate-300 block">
            {te.approvalModalRemarksLabel}{' '}
            {isHighOrCritical && (
              <span className="text-rose-500 font-bold">
                ({locRec.riskLevelLabel} {te.approvalModalMandatoryRiskSuffix})
              </span>
            )}
          </label>
          <textarea
            id="human-approval-remarks"
            value={remarks}
            onChange={e => {
              setRemarks(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder={
              isAuthorized
                ? te.approvalModalPlaceholderAuthorized
                : te.approvalModalPlaceholderRestricted
            }
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
          />
        </div>

        {/* Validation / Error Banner */}
        {validationError && (
          <div
            role="alert"
            className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>{validationError}</div>
          </div>
        )}

        {/* Decision Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-400">
            {te.approvalModalGovernanceFooter}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{te.approvalModalRejectBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={!isAuthorized || isSubmitting}
              className={`px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                isAuthorized
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{te.approvalModalApproveExecuteBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
