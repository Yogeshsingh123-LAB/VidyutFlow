import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  RefreshCw,
  Search,
  Calculator,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizePhase11Status,
  localizePhase11Category,
  localizePhase11Severity
} from '../../i18n/meterPhase11Translations';
import type {
  MeterReadingRecord,
  StructuredAnomalyCase,
  ConsumerBillingReviewRequest,
  FinancialAdjustmentProposal,
  AnomalyReviewStatus,
  BillCheckResult
} from '../../services/meterReading';
import { EmployeeReadingApproval } from './EmployeeReadingApproval';
import { AnomalyDashboard } from '../common/AnomalyDashboard';

export const EmployeeMeterReviewWorkspace: React.FC = () => {
  const { showToast, activeUser } = useApp();
  const { language, t } = useLanguage();
  const mp = t.meterPhase11;

  const [activeQueueTab, setActiveQueueTab] = useState<'readings' | 'anomalies' | 'reviews' | 'adjustments'>('readings');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Raw datasets from authoritative server endpoints
  const [readings, setReadings] = useState<MeterReadingRecord[]>([]);
  const [anomalies, setAnomalies] = useState<StructuredAnomalyCase[]>([]);
  const [reviews, setReviews] = useState<ConsumerBillingReviewRequest[]>([]);
  const [adjustments, setAdjustments] = useState<FinancialAdjustmentProposal[]>([]);

  // Detailed Modal State
  const [selectedReading, setSelectedReading] = useState<MeterReadingRecord | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<StructuredAnomalyCase | null>(null);
  const [selectedReview, setSelectedReview] = useState<ConsumerBillingReviewRequest | null>(null);
  const [readingPhoto, setReadingPhoto] = useState<string | null>(null);
  const [reviewEvidencePhoto, setReviewEvidencePhoto] = useState<string | null>(null);

  // Bill Validation Result
  const [billValidation, setBillValidation] = useState<BillCheckResult | null>(null);
  const [isValidatingBill, setIsValidatingBill] = useState(false);

  // Review Action Form State
  const [actionNote, setActionNote] = useState('');
  const [publicResolutionNote, setPublicResolutionNote] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Financial Adjustment Proposal Modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentBillNo, setAdjustmentBillNo] = useState('');
  const [adjustmentProposedAmount, setAdjustmentProposedAmount] = useState('');
  const [adjustmentRevisedUnits, setAdjustmentRevisedUnits] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'CREDIT_CONCESSION' | 'SLAB_CORRECTION' | 'METER_ERROR_REBATE' | 'SUPPLEMENTARY_CHARGE'>('SLAB_CORRECTION');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedReading) setSelectedReading(null);
        else if (selectedAnomaly) setSelectedAnomaly(null);
        else if (selectedReview) setSelectedReview(null);
        else if (isAdjustmentModalOpen) setIsAdjustmentModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReading, selectedAnomaly, selectedReview, isAdjustmentModalOpen]);

  // Fetch private consumer evidence photo when selectedReview is opened
  useEffect(() => {
    setReviewEvidencePhoto(null);
    setBillValidation(null);
    if (!selectedReview) return;
    if (selectedReview.billNo) {
      void handleValidateBill(selectedReview.billNo);
    }
    if (!selectedReview.evidencePhotoId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/meter-readings/billing-reviews/${encodeURIComponent(selectedReview.id)}/photo`, {
          credentials: 'same-origin'
        });
        if (res.ok && !cancelled) {
          const payload = await res.json();
          if (payload.photo) setReviewEvidencePhoto(payload.photo);
        }
      } catch {
        // Ignore evidence photo retrieval failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedReview]);

  const fetchQueueData = useCallback(async () => {
    setLoading(true);
    try {
      const [readingsRes, anomaliesRes, reviewsRes, adjustmentsRes] = await Promise.all([
        fetch('/api/meter-readings', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/anomalies', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/billing-reviews', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/adjustments', { credentials: 'same-origin' })
      ]);

      if (readingsRes.ok) {
        const d = await readingsRes.json();
        setReadings(d.readings || []);
      }
      if (anomaliesRes.ok) {
        const d = await anomaliesRes.json();
        setAnomalies(d.anomalies || []);
      }
      if (reviewsRes.ok) {
        const d = await reviewsRes.json();
        setReviews(d.reviews || []);
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
    void fetchQueueData();
  }, [fetchQueueData]);

  // Fetch photo when inspecting a reading
  const inspectReadingWithPhoto = async (r: MeterReadingRecord) => {
    setSelectedReading(r);
    setActionNote('');
    setReadingPhoto(null);
    setBillValidation(null);
    if (r.photoId) {
      try {
        const res = await fetch(`/api/meter-readings/${r.id}/photo`, { credentials: 'same-origin' });
        if (res.ok) {
          const payload = await res.json();
          setReadingPhoto(payload.photo);
        }
      } catch {
        // photo fetch error
      }
    }
  };

  // Perform Bill Validation for a given bill
  const handleValidateBill = async (billNo: string) => {
    setIsValidatingBill(true);
    try {
      const res = await fetch(`/api/meter-readings/validate-bill?billNo=${encodeURIComponent(billNo)}`, {
        credentials: 'same-origin'
      });
      if (res.ok) {
        const payload = await res.json();
        setBillValidation(payload.validation);
      } else {
        showToast(mp.statusDiscrepancy, 'error');
      }
    } catch {
      showToast(mp.statusDiscrepancy, 'error');
    } finally {
      setIsValidatingBill(false);
    }
  };

  // Apply an APPROVED Financial Adjustment to the Billing Ledger
  const handleApplyAdjustmentToLedger = async (adjustmentId: string) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/meter-readings/adjustments/${encodeURIComponent(adjustmentId)}/apply`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        }
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to apply adjustment to ledger.');
      showToast(`${adjustmentId}: ${localizePhase11Status('APPLIED_TO_LEDGER', language)}`, 'success');
      await fetchQueueData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ledger application failed', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Submit Reading Action (Approve / Reject / Reread)
  const handleReviewReading = async (action: 'APPROVE' | 'REJECT' | 'REREAD') => {
    if (!selectedReading) return;
    if ((action === 'REJECT' || action === 'REREAD') && !actionNote.trim()) {
      showToast(mp.wsReviewNotesPlaceholder, 'warning');
      return;
    }
    if (action === 'APPROVE' && selectedReading.anomalies.length > 0 && !actionNote.trim()) {
      showToast(mp.wsReviewNotesPlaceholder, 'warning');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/meter-readings/${selectedReading.id}/review`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          action,
          note: actionNote.trim()
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Review action failed.');

      showToast(`${selectedReading.id}: ${localizePhase11Status(payload.reading?.status || action, language)}`, 'success');
      setSelectedReading(null);
      await fetchQueueData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Review action failed', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Transition Anomaly Status
  const handleTransitionAnomaly = async (nextStatus: AnomalyReviewStatus) => {
    if (!selectedAnomaly) return;
    if (['UNDER_INVESTIGATION', 'REJECTED', 'CLOSED'].includes(nextStatus) && !actionNote.trim()) {
      showToast(mp.empAuditNoteLabel, 'warning');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/meter-readings/anomalies/${selectedAnomaly.id}/transition`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          nextStatus,
          note: actionNote.trim()
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Transition failed.');

      showToast(`${selectedAnomaly.id}: ${localizePhase11Status(nextStatus, language)}`, 'success');
      setSelectedAnomaly(null);
      await fetchQueueData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Transition failed', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Transition Billing Review
  const handleTransitionBillingReview = async (nextStatus: AnomalyReviewStatus) => {
    if (!selectedReview) return;
    if (!actionNote.trim()) {
      showToast(mp.empAuditNoteLabel, 'warning');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/meter-readings/billing-reviews/${selectedReview.id}/transition`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          nextStatus,
          staffNote: actionNote.trim(),
          publicNote: publicResolutionNote.trim() || `${mp.cnsPublicResolutionNote}: ${localizePhase11Status(nextStatus, language)}`
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Review transition failed.');

      showToast(`${selectedReview.id}: ${localizePhase11Status(nextStatus, language)}`, 'success');
      setSelectedReview(null);
      setPublicResolutionNote('');
      await fetchQueueData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Transition failed', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Submit Financial Adjustment Proposal
  const handleProposeAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentBillNo || !adjustmentReason.trim()) {
      showToast(mp.empAdjustmentReasonLabel, 'warning');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/meter-readings/adjustments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          billNo: adjustmentBillNo,
          proposedAdjustmentAmount: adjustmentProposedAmount ? Number(adjustmentProposedAmount) : undefined,
          revisedUnits: adjustmentRevisedUnits ? Number(adjustmentRevisedUnits) : undefined,
          adjustmentType,
          reason: adjustmentReason.trim()
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Adjustment proposal failed.');

      showToast(mp.empSeparationOfDutiesNotice, 'success');
      setIsAdjustmentModalOpen(false);
      setAdjustmentBillNo('');
      setAdjustmentProposedAmount('');
      setAdjustmentRevisedUnits('');
      setAdjustmentReason('');
      await fetchQueueData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Adjustment proposal failed', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'APPLIED_TO_LEDGER':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'PENDING_REVIEW':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'UNDER_INVESTIGATION':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'CORRECTED_THROUGH_ADJUSTMENT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      case 'REREAD_REQUESTED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    }
  };

  // Filtered Queues
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchesSearch =
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.consumerNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.meterNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [readings, searchQuery, statusFilter]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      const matchesSearch =
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.consumerNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.meterNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [anomalies, searchQuery, statusFilter]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(rev => {
      const matchesSearch =
        rev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rev.consumerNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || rev.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reviews, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* QUEUE HEADER & METRICS */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                {mp.empHeaderBadge}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mp.empHeaderTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mp.empHeaderSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{mp.empProposeAdjustmentTitle}</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchQueueData()}
              disabled={loading}
              aria-label={mp.empRefreshBtn}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">{mp.empSubtabReadings}</span>
            <div className="text-lg font-bold text-amber-600 mt-0.5 font-mono">
              {readings.filter(r => r.status === 'PENDING_REVIEW').length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">{mp.empSubtabAnomalies}</span>
            <div className="text-lg font-bold text-rose-600 mt-0.5 font-mono">
              {anomalies.filter(a => ['DETECTED', 'PENDING_REVIEW'].includes(a.status)).length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">{mp.empSubtabBillingReviews}</span>
            <div className="text-lg font-bold text-blue-600 mt-0.5 font-mono">
              {reviews.filter(r => ['DETECTED', 'PENDING_REVIEW', 'UNDER_INVESTIGATION'].includes(r.status)).length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">{mp.empSubtabAdjustments}</span>
            <div className="text-lg font-bold text-purple-600 mt-0.5 font-mono">
              {adjustments.length}
            </div>
          </div>
        </div>
      </div>

      {/* QUEUE TABS & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => { setActiveQueueTab('readings'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeQueueTab === 'readings'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {mp.empSubtabReadings} ({readings.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveQueueTab('anomalies'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeQueueTab === 'anomalies'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {mp.empSubtabAnomalies} ({anomalies.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveQueueTab('reviews'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeQueueTab === 'reviews'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {mp.empSubtabBillingReviews} ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveQueueTab('adjustments'); setStatusFilter('ALL'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeQueueTab === 'adjustments'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {mp.empSubtabAdjustments} ({adjustments.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={mp.empSearchPlaceholder}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-48 text-slate-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">{mp.empFilterAllStatuses}</option>
            <option value="PENDING_REVIEW">{mp.statusPendingReview}</option>
            <option value="UNDER_INVESTIGATION">{mp.statusUnderInvestigation}</option>
            <option value="APPROVED">{mp.statusApproved}</option>
            <option value="REJECTED">{mp.statusRejected}</option>
            <option value="CORRECTED_THROUGH_ADJUSTMENT">{mp.statusCorrectedThroughAdjustment}</option>
            <option value="CLOSED">{mp.statusClosed}</option>
          </select>
        </div>
      </div>

      {/* QUEUE 1: METER READINGS */}
      {activeQueueTab === 'readings' && (
        <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">{mp.empReadingId}</th>
                  <th className="p-3.5 font-semibold">{mp.empConsumerNo} / {mp.empMeterNo}</th>
                  <th className="p-3.5 font-semibold">{mp.empSubmittedReading}</th>
                  <th className="p-3.5 font-semibold">{mp.empConsumedUnits}</th>
                  <th className="p-3.5 font-semibold">{mp.empSubmittedBy}</th>
                  <th className="p-3.5 font-semibold">{mp.empOcrSummary}</th>
                  <th className="p-3.5 font-semibold text-center">{mp.cnsStatusCol}</th>
                  <th className="p-3.5 font-semibold text-right">{mp.empApproveCase}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredReadings.length > 0 ? (
                  filteredReadings.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {r.id}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{r.consumerNo}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.meterNo}</div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-900 dark:text-white">
                        {r.displayedReading} kWh
                      </td>
                      <td className="p-3.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                        {r.consumedUnits !== undefined ? `${r.consumedUnits} kWh` : '—'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <div>{r.submittedBy}</div>
                        <div className="text-[10px] text-slate-400 uppercase">({r.submittedRole})</div>
                      </td>
                      <td className="p-3.5">
                        {r.anomalies.length > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            {r.anomalies.length} {mp.sevReview}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">{mp.statusClear}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(r.status)}`}>
                          {localizePhase11Status(r.status, language)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void inspectReadingWithPhoto(r)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-colors"
                        >
                          {mp.empApproveCase}
                        </button>
                      </td>
                    </tr>
                  ))
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
      )}

      {/* QUEUE 2: ANOMALIES (Phase 11D Anomaly Dashboard) */}
      {activeQueueTab === 'anomalies' && (
        <AnomalyDashboard
          onSelectReading={(readingId) => {
            const found = readings.find(r => r.id === readingId);
            if (found) {
              void inspectReadingWithPhoto(found);
            }
          }}
          userRole="employee"
        />
      )}

      {/* QUEUE 3: BILLING REVIEWS */}
      {activeQueueTab === 'reviews' && (
        <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">ID</th>
                  <th className="p-3.5 font-semibold">{mp.cnsSelectBill}</th>
                  <th className="p-3.5 font-semibold">{mp.empConsumerNo}</th>
                  <th className="p-3.5 font-semibold">{mp.cnsReviewCategoryLabel}</th>
                  <th className="p-3.5 font-semibold">{mp.wsReadingDate}</th>
                  <th className="p-3.5 font-semibold text-center">{mp.cnsStatusCol}</th>
                  <th className="p-3.5 font-semibold text-right">{mp.empStartInvestigation}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredReviews.length > 0 ? (
                  filteredReviews.map(rev => (
                    <tr key={rev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {rev.id}
                      </td>
                      <td className="p-3.5 font-mono text-slate-800 dark:text-slate-200">
                        {rev.billNo}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {rev.consumerNo}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {localizePhase11Category(rev.category, language)}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(rev.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(rev.status)}`}>
                          {localizePhase11Status(rev.status, language)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => { setSelectedReview(rev); setActionNote(''); setPublicResolutionNote(rev.consumerVisibleNote || ''); }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs"
                        >
                          {mp.empStartInvestigation}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {mp.empNoRecordsFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUEUE 4: FINANCIAL ADJUSTMENTS */}
      {activeQueueTab === 'adjustments' && (
        <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">ID</th>
                  <th className="p-3.5 font-semibold">{mp.cnsSelectBill}</th>
                  <th className="p-3.5 font-semibold">{mp.empConsumerNo}</th>
                  <th className="p-3.5 font-semibold">{mp.cnsBilledCol} → {mp.cnsCanonicalCol}</th>
                  <th className="p-3.5 font-semibold">{mp.empProposedAmountLabel}</th>
                  <th className="p-3.5 font-semibold">{mp.empSubmittedBy}</th>
                  <th className="p-3.5 font-semibold text-center">{mp.cnsStatusCol}</th>
                  <th className="p-3.5 font-semibold text-right">{mp.empMarkAdjusted}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {adjustments.length > 0 ? (
                  adjustments.map(adj => (
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
                        {adj.proposedBy} ({adj.proposedByRole})
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(adj.status)}`}>
                          {localizePhase11Status(adj.status, language)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {adj.status === 'APPROVED' ? (
                          <button
                            type="button"
                            disabled={isSubmittingAction}
                            onClick={() => void handleApplyAdjustmentToLedger(adj.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs disabled:opacity-50"
                          >
                            {mp.empMarkAdjusted}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {localizePhase11Status(adj.status, language)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
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
      )}

      {/* MODAL 1: INSPECT & VERIFY METER READING (EMPLOYEE READING APPROVAL) */}
      {selectedReading && (
        <EmployeeReadingApproval
          reading={selectedReading}
          photoUrl={readingPhoto}
          connectionMeta={{
            consumerName: undefined,
            subdivision: 'Mehsana City North',
            meterSerial: selectedReading.meterNo
          }}
          currentUser={{
            id: activeUser.id || 'USR-EMP-001',
            name: activeUser.name,
            role: 'employee',
            subdivision: activeUser.subdivision || 'Mehsana City North'
          }}
          onApprove={async (id, note, correctedReading) => {
            setIsSubmittingAction(true);
            try {
              const res = await fetch(`/api/meter-readings/${id}/review`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                  'Content-Type': 'application/json',
                  'X-VidyutFlow-CSRF': '1'
                },
                body: JSON.stringify({
                  action: 'APPROVE',
                  note: note.trim(),
                  correctedReading
                })
              });
              const payload = await res.json();
              if (!res.ok) throw new Error(payload.error || 'Approval failed.');
              showToast(`${id}: ${localizePhase11Status('APPROVED', language)}`, 'success');
              setSelectedReading(null);
              await fetchQueueData();
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
            } finally {
              setIsSubmittingAction(false);
            }
          }}
          onReject={async (id, note) => {
            setIsSubmittingAction(true);
            try {
              const res = await fetch(`/api/meter-readings/${id}/review`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                  'Content-Type': 'application/json',
                  'X-VidyutFlow-CSRF': '1'
                },
                body: JSON.stringify({
                  action: 'REJECT',
                  note: note.trim()
                })
              });
              const payload = await res.json();
              if (!res.ok) throw new Error(payload.error || 'Rejection failed.');
              showToast(`${id}: ${localizePhase11Status('REJECTED', language)}`, 'success');
              setSelectedReading(null);
              await fetchQueueData();
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Rejection failed', 'error');
            } finally {
              setIsSubmittingAction(false);
            }
          }}
          onRequestReread={async (id, note) => {
            setIsSubmittingAction(true);
            try {
              const res = await fetch(`/api/meter-readings/${id}/review`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                  'Content-Type': 'application/json',
                  'X-VidyutFlow-CSRF': '1'
                },
                body: JSON.stringify({
                  action: 'REREAD',
                  note: note.trim()
                })
              });
              const payload = await res.json();
              if (!res.ok) throw new Error(payload.error || 'Re-reading request failed.');
              showToast(`${id}: ${localizePhase11Status('REREAD_REQUESTED', language)}`, 'success');
              setSelectedReading(null);
              await fetchQueueData();
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Re-reading request failed', 'error');
            } finally {
              setIsSubmittingAction(false);
            }
          }}
          onClose={() => setSelectedReading(null)}
          isLoading={isSubmittingAction}
        />
      )}

      {/* MODAL 2: MANAGE ANOMALY CASE */}
      {selectedAnomaly && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-anomaly-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 id="emp-anomaly-modal-title" className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {selectedAnomaly.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {localizePhase11Category(selectedAnomaly.category, language)} · {localizePhase11Severity(selectedAnomaly.severity, language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnomaly(null)}
                aria-label={t.common.close}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.cnsReviewDescriptionLabel}</span>
                <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedAnomaly.explanation}</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.empAuditNoteLabel}
                </label>
                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  rows={3}
                  placeholder={mp.empAuditNotePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedAnomaly.status !== 'UNDER_INVESTIGATION' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionAnomaly('UNDER_INVESTIGATION')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {mp.empStartInvestigation}
                  </button>
                )}
                {selectedAnomaly.status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionAnomaly('APPROVED')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {mp.empApproveCase}
                  </button>
                )}
                {selectedAnomaly.status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionAnomaly('REJECTED')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  >
                    {mp.empRejectCase}
                  </button>
                )}
                {selectedAnomaly.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionAnomaly('CLOSED')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold"
                  >
                    {mp.empCloseCase}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE BILLING REVIEW (WITH PRIVATE EVIDENCE PHOTO & PHASE 9 BILL VALIDATION) */}
      {selectedReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-billing-review-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-xl w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 id="emp-billing-review-modal-title" className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {selectedReview.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReview.billNo} · {localizePhase11Category(selectedReview.category, language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                aria-label={t.common.close}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.cnsReviewDescriptionLabel}</span>
                <p className="text-slate-800 dark:text-slate-200 mt-1">{selectedReview.description}</p>
              </div>

              {reviewEvidencePhoto && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{mp.wsLoadPhoto}</span>
                  <img
                    src={reviewEvidencePhoto}
                    alt={selectedReview.id}
                    className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-800 object-contain bg-slate-950"
                  />
                </div>
              )}

              {/* Phase 9 Calculation Evidence */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {mp.cnsCanonicalCol} ({selectedReview.billNo})
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleValidateBill(selectedReview.billNo)}
                    disabled={isValidatingBill}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isValidatingBill ? mp.cnsValidating : mp.cnsValidateBillBtn}
                  </button>
                </div>

                {billValidation && (
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-400 block">{mp.cnsBilledCol}</span>
                      <strong className="font-mono">₹{billValidation.recordedAmount}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-400 block">{mp.cnsCanonicalCol}</span>
                      <strong className="font-mono text-emerald-600">₹{billValidation.expectedAmount}</strong>
                    </div>
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-400 block">{mp.cnsStatusCol}</span>
                      <strong className="font-mono">{localizePhase11Status(billValidation.status, language)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.empAuditNoteLabel}
                </label>
                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  rows={2}
                  placeholder={mp.empAuditNotePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.empPublicNoteLabel}
                </label>
                <input
                  type="text"
                  value={publicResolutionNote}
                  onChange={e => setPublicResolutionNote(e.target.value)}
                  placeholder={mp.empPublicNotePlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {selectedReview.status !== 'UNDER_INVESTIGATION' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionBillingReview('UNDER_INVESTIGATION')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {mp.empStartInvestigation}
                  </button>
                )}
                {selectedReview.status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionBillingReview('APPROVED')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {mp.empApproveCase}
                  </button>
                )}
                {selectedReview.status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionBillingReview('REJECTED')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  >
                    {mp.empRejectCase}
                  </button>
                )}
                {selectedReview.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => handleTransitionBillingReview('CLOSED')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold"
                  >
                    {mp.empCloseCase}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PROPOSE FINANCIAL ADJUSTMENT */}
      {isAdjustmentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {mp.empProposeAdjustmentTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {mp.empSeparationOfDutiesNotice}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposeAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.cnsSelectBill}
                </label>
                <input
                  type="text"
                  value={adjustmentBillNo}
                  onChange={e => setAdjustmentBillNo(e.target.value)}
                  placeholder="e.g. BILL-UG-2026-10-8821"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.empAdjustmentTypeLabel}
                </label>
                <select
                  value={adjustmentType}
                  onChange={e => setAdjustmentType(e.target.value as 'CREDIT_CONCESSION' | 'SLAB_CORRECTION' | 'METER_ERROR_REBATE' | 'SUPPLEMENTARY_CHARGE')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="SLAB_CORRECTION">{mp.adjSlabCorrection}</option>
                  <option value="CREDIT_CONCESSION">{mp.adjCreditConcession}</option>
                  <option value="METER_ERROR_REBATE">{mp.adjMeterErrorRebate}</option>
                  <option value="SUPPLEMENTARY_CHARGE">{mp.adjSupplementaryCharge}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {mp.empProposedAmountLabel}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={adjustmentProposedAmount}
                    onChange={e => setAdjustmentProposedAmount(e.target.value)}
                    placeholder="e.g. 185.50"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {mp.empRevisedUnitsLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustmentRevisedUnits}
                    onChange={e => setAdjustmentRevisedUnits(e.target.value)}
                    placeholder="e.g. 260"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.empAdjustmentReasonLabel}
                </label>
                <textarea
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  rows={3}
                  required
                  placeholder={mp.empAdjustmentReasonPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmittingAction ? mp.wsSubmitting : mp.empSubmitProposalBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
