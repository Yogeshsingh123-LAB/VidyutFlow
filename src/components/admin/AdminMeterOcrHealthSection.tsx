import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  DollarSign,
  RotateCw,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizePhase11Status,
  localizePhase11Category
} from '../../i18n/meterPhase11Translations';
import type {
  MeterThresholds,
  FinancialAdjustmentProposal
} from '../../services/meterReading';

interface ThresholdPayload extends MeterThresholds {
  history?: Array<{
    version: number;
    changedAt: string;
    changedBy: string;
    reason: string;
    thresholds: MeterThresholds;
  }>;
}

export const AdminMeterOcrHealthSection: React.FC = () => {
  const { showToast, activeUser } = useApp();
  const { language, t } = useLanguage();
  const mp = t.meterPhase11;

  const [loading, setLoading] = useState(false);
  const [thresholds, setThresholds] = useState<ThresholdPayload | null>(null);
  const [adjustments, setAdjustments] = useState<FinancialAdjustmentProposal[]>([]);

  // Threshold form edit state
  const [editMinHistory, setEditMinHistory] = useState(2);
  const [editHighRatio, setEditHighRatio] = useState(2.5);
  const [editLowRatio, setEditLowRatio] = useState(0.35);
  const [editHighUnits, setEditHighUnits] = useState(80);
  const [thresholdReason, setThresholdReason] = useState('');
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  // Financial Adjustment Review Modal State
  const [reviewingAdjustment, setReviewingAdjustment] = useState<FinancialAdjustmentProposal | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [thresholdsRes, adjustmentsRes] = await Promise.all([
        fetch('/api/meter-readings/thresholds', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/adjustments', { credentials: 'same-origin' })
      ]);

      if (thresholdsRes.ok) {
        const d = await thresholdsRes.json();
        const th = d.thresholds as ThresholdPayload;
        setThresholds(th);
        setEditMinHistory(th.minimumHistory);
        setEditHighRatio(th.highDailyRatio);
        setEditLowRatio(th.lowDailyRatio);
        setEditHighUnits(th.highDailyUnits);
      }
      if (adjustmentsRes.ok) {
        const d = await adjustmentsRes.json();
        setAdjustments(d.adjustments || []);
      }
    } catch {
      showToast(mp.empNoRecordsFound, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, mp.empNoRecordsFound]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Handle Threshold Policy Update
  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdReason.trim()) {
      showToast(mp.admThresholdReasonLabel, 'warning');
      return;
    }

    setIsSavingThresholds(true);
    try {
      const res = await fetch('/api/meter-readings/thresholds', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          minimumHistory: Number(editMinHistory),
          highDailyRatio: Number(editHighRatio),
          lowDailyRatio: Number(editLowRatio),
          highDailyUnits: Number(editHighUnits),
          reason: thresholdReason.trim()
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update thresholds.');

      showToast(`${mp.mgtThresholdVersionLabel}: v${payload.thresholds.version}`, 'success');
      setThresholdReason('');
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  // Handle Adjustment Approval/Rejection (Separation of Duties enforced)
  const handleResolveAdjustment = async (action: 'APPROVE' | 'REJECT') => {
    if (!reviewingAdjustment) return;
    if (!approvalNote.trim()) {
      showToast(mp.admApprovalNotePlaceholder, 'warning');
      return;
    }

    // Client-side guard check for separation of duties
    if (reviewingAdjustment.proposedBy.toLowerCase() === activeUser.name.toLowerCase()) {
      showToast(mp.admSeparationBlockedBadge, 'error');
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const res = await fetch(`/api/meter-readings/adjustments/${reviewingAdjustment.id}/review`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          action,
          note: approvalNote.trim()
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Review resolution failed.');

      showToast(`${reviewingAdjustment.id}: ${localizePhase11Status(action === 'APPROVE' ? 'APPROVED' : 'REJECTED', language)}`, 'success');
      setReviewingAdjustment(null);
      setApprovalNote('');
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mp.admSectionTitle}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {mp.admSectionBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mp.admSectionSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchData()}
          disabled={loading}
          aria-label={mp.empRefreshBtn}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors self-start sm:self-center"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* OCR ENGINE & WORKER TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">{mp.admOcrEngineTitle}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            Tesseract.js v7.0.0
          </div>
          <p className="text-[11px] text-slate-500">
            {mp.admOcrWorkerMode}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">{mp.admWasmCoreStatus}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-emerald-600 font-mono">
            WASM Core Ready
          </div>
          <p className="text-[11px] text-slate-500">
            {mp.admMetadataStripping}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">{mp.admMaxUploadLimit}</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            100% SLA
          </div>
          <p className="text-[11px] text-slate-500">
            {mp.wsOcrAmbiguousTitle}
          </p>
        </div>
      </div>

      {/* SECTION 2: ANOMALY THRESHOLD POLICY MANAGEMENT */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {mp.admThresholdConfigTitle} (v{thresholds?.version ?? 1})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {mp.mgtThresholdVersionLabel}: v{thresholds?.version ?? 1}
          </span>
        </div>

        <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {mp.admZeroConsumptionMinPrev}
              </label>
              <input
                type="number"
                min={2}
                max={12}
                value={editMinHistory}
                onChange={e => setEditMinHistory(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {mp.admSpikeMultiplier}
              </label>
              <input
                type="number"
                step="0.1"
                min={1.1}
                max={10.0}
                value={editHighRatio}
                onChange={e => setEditHighRatio(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {mp.admDropRatio}
              </label>
              <input
                type="number"
                step="0.05"
                min={0.05}
                max={0.95}
                value={editLowRatio}
                onChange={e => setEditLowRatio(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {mp.admSpikeMinUnits}
              </label>
              <input
                type="number"
                min={10}
                max={1000}
                value={editHighUnits}
                onChange={e => setEditHighUnits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {mp.admThresholdReasonLabel}
            </label>
            <input
              type="text"
              value={thresholdReason}
              onChange={e => setThresholdReason(e.target.value)}
              placeholder={mp.admThresholdReasonPlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingThresholds}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition-colors"
            >
              {isSavingThresholds ? mp.admSavingThresholds : mp.admSaveThresholdsBtn}
            </button>
          </div>
        </form>

        {/* THRESHOLD CHANGE AUDIT HISTORY */}
        {thresholds?.history && thresholds.history.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {mp.admThresholdHistoryTitle}
            </span>
            <div className="space-y-1.5 text-xs max-h-40 overflow-y-auto">
              {thresholds.history.map(item => (
                <div
                  key={item.version}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      v{item.version}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {item.reason}
                    </span>
                  </div>
                  <div className="text-slate-400 shrink-0">
                    {item.changedBy} · {new Date(item.changedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: FINANCIAL ADJUSTMENT AUTHORIZATION DESK */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {mp.admFinancialApprovalsTitle}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {mp.statusPendingApproval}: {adjustments.filter(a => a.status === 'PENDING_APPROVAL').length}
          </span>
        </div>

        <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">ID</th>
                  <th className="p-3.5 font-semibold">{mp.cnsSelectBill}</th>
                  <th className="p-3.5 font-semibold">{mp.empConsumerNo}</th>
                  <th className="p-3.5 font-semibold">{mp.cnsBilledCol} → {mp.cnsCanonicalCol}</th>
                  <th className="p-3.5 font-semibold">{mp.empProposedAmountLabel}</th>
                  <th className="p-3.5 font-semibold">{mp.empSubmittedBy}</th>
                  <th className="p-3.5 font-semibold text-center">{mp.cnsStatusCol}</th>
                  <th className="p-3.5 font-semibold text-right">{mp.admApproveAdjustmentBtn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {adjustments.length > 0 ? (
                  adjustments.map(adj => {
                    const isOwnProposal = adj.proposedBy.toLowerCase() === activeUser.name.toLowerCase();
                    return (
                      <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {adj.id}
                        </td>
                        <td className="p-3.5 font-mono text-slate-800 dark:text-slate-200">
                          {adj.billNo}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {adj.consumerNo}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          ₹{adj.originalBilledAmount} → ₹{adj.proposedRevisedAmount}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-600">
                          ₹{adj.proposedAdjustmentAmount}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          <div>{adj.proposedBy}</div>
                          <div className="text-[10px] text-slate-400 uppercase">({adj.proposedByRole})</div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            adj.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : adj.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-purple-100 text-purple-800 border-purple-300'
                          }`}>
                            {localizePhase11Status(adj.status, language)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {adj.status === 'PENDING_APPROVAL' ? (
                            isOwnProposal ? (
                              <span className="text-[10px] text-rose-600 font-semibold" title={mp.empSeparationOfDutiesNotice}>
                                {mp.admSeparationBlockedBadge}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setReviewingAdjustment(adj); setApprovalNote(''); }}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
                              >
                                {mp.admApproveAdjustmentBtn}
                              </button>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px]">{localizePhase11Status(adj.status, language)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {mp.empNoRecordsFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: ADMIN FINANCIAL ADJUSTMENT AUTHORIZATION */}
      {reviewingAdjustment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {reviewingAdjustment.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {reviewingAdjustment.billNo} · {reviewingAdjustment.proposedBy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingAdjustment(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.cnsBilledAmount}</span>
                  <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    ₹{reviewingAdjustment.originalBilledAmount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.cnsExpectedCanonical}</span>
                  <span className="font-mono text-sm font-bold text-purple-600">
                    ₹{reviewingAdjustment.proposedRevisedAmount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.empProposedAmountLabel}</span>
                  <span className="font-mono text-sm font-bold text-emerald-600">
                    ₹{reviewingAdjustment.proposedAdjustmentAmount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.empAdjustmentTypeLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {localizePhase11Category(reviewingAdjustment.adjustmentType, language)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.empAdjustmentReasonLabel}</span>
                <p className="text-slate-800 dark:text-slate-200 mt-1">{reviewingAdjustment.reason}</p>
                <p className="text-slate-400 text-[10px] mt-1 font-mono">{reviewingAdjustment.calculationBasis}</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.empAuditNoteLabel}
                </label>
                <textarea
                  value={approvalNote}
                  onChange={e => setApprovalNote(e.target.value)}
                  rows={3}
                  placeholder={mp.admApprovalNotePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleResolveAdjustment('REJECT')}
                  disabled={isSubmittingApproval}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
                >
                  {mp.admRejectAdjustmentBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveAdjustment('APPROVE')}
                  disabled={isSubmittingApproval}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                >
                  {mp.admApproveAdjustmentBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
