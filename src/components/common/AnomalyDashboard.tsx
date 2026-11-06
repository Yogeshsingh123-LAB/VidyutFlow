import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Search,
  Filter,
  FileText,
  Clock,
  Eye,
  Zap,
  ArrowRight,
  Shield,
  Activity,
  Calendar,
  X,
  PlusCircle,
  Send,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizePhase11Category,
  localizePhase11Severity,
  localizePhase11Status
} from '../../i18n/meterPhase11Translations';
import type {
  Anomaly,
  AnomalySeverity,
  AnomalyReviewStatus,
  StructuredAnomalyCase,
  BillLineComparisonItem
} from '../../types/meterReading';
import {
  fetchAnomalies,
  updateAnomalyStatus,
  issueBillFromReading,
  proposeFinancialAdjustment
} from '../../services/anomalyService';

interface AnomalyDashboardProps {
  onSelectReading?: (readingId: string) => void;
  onSelectBill?: (billNo: string) => void;
  userRole?: string;
  defaultConsumerNo?: string;
}

export const AnomalyDashboard: React.FC<AnomalyDashboardProps> = ({
  onSelectReading,
  onSelectBill,
  userRole = 'employee',
  defaultConsumerNo
}) => {
  const { language } = useLanguage();

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [cases, setCases] = useState<StructuredAnomalyCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AnomalySeverity>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AnomalyReviewStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(defaultConsumerNo || '');

  // Selected Anomaly Drawer
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [statusNote, setStatusNote] = useState<string>('');
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [issuingBill, setIssuingBill] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Financial Adjustment Proposal Modal State
  const [showAdjModal, setShowAdjModal] = useState<boolean>(false);
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjType, setAdjType] = useState<'CREDIT_CONCESSION' | 'SLAB_CORRECTION' | 'METER_ERROR_REBATE' | 'SUPPLEMENTARY_CHARGE'>('SLAB_CORRECTION');
  const [adjReason, setAdjReason] = useState<string>('');
  const [submittingAdj, setSubmittingAdj] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnomalies(defaultConsumerNo);
      setAnomalies(res.anomalies);
      setCases(res.cases);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load anomalies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [defaultConsumerNo]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = cases.length || anomalies.length;
    const high = cases.filter(c => c.severity === 'HIGH' && c.status !== 'CLOSED').length;
    const review = cases.filter(c => c.severity === 'REVIEW' && c.status !== 'CLOSED').length;
    const closed = cases.filter(c => c.status === 'CLOSED' || c.status === 'APPROVED').length;
    return { total, high, review, closed };
  }, [cases, anomalies]);

  // Filtered anomalies
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchConsumer = c.consumerNo.toLowerCase().includes(q);
        const matchMeter = c.meterNo.toLowerCase().includes(q);
        const matchId = c.id.toLowerCase().includes(q);
        const matchReading = c.readingId?.toLowerCase().includes(q);
        if (!matchConsumer && !matchMeter && !matchId && !matchReading) return false;
      }
      return true;
    });
  }, [cases, severityFilter, statusFilter, searchQuery]);

  // Handle Status Transition
  const handleTransitionStatus = async (nextStatus: AnomalyReviewStatus) => {
    if (!selectedAnomaly) return;
    if (['UNDER_INVESTIGATION', 'REJECTED', 'CORRECTED_THROUGH_ADJUSTMENT', 'CLOSED'].includes(nextStatus) && !statusNote.trim()) {
      alert('An audit note is required to transition this anomaly status.');
      return;
    }

    try {
      setTransitioning(true);
      await updateAnomalyStatus({
        anomalyId: selectedAnomaly.anomalyId,
        status: nextStatus,
        note: statusNote.trim() || `Status updated to ${nextStatus}`
      });
      setActionSuccessMsg(`Status updated to ${nextStatus} successfully.`);
      setStatusNote('');
      await loadData();
      // Update local selected anomaly
      setSelectedAnomaly(prev => (prev ? { ...prev, status: nextStatus } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Status transition failed.');
    } finally {
      setTransitioning(false);
    }
  };

  // Handle Bill Issuance from Approved Reading
  const handleIssueBill = async (readingId: string) => {
    try {
      setIssuingBill(true);
      const res = await issueBillFromReading(readingId);
      setActionSuccessMsg(res.message);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bill issuance failed.');
    } finally {
      setIssuingBill(false);
    }
  };

  // Handle Financial Adjustment Submission
  const handleProposeAdjustment = async () => {
    if (!selectedAnomaly) return;
    if (adjAmount <= 0) {
      alert('Adjustment amount must be greater than zero.');
      return;
    }
    if (!adjReason.trim()) {
      alert('A valid reason is required.');
      return;
    }

    try {
      setSubmittingAdj(true);
      await proposeFinancialAdjustment({
        billNo: selectedAnomaly.relatedId,
        anomalyId: selectedAnomaly.anomalyId,
        adjustmentType: adjType,
        proposedAdjustmentAmount: adjAmount,
        reason: adjReason.trim()
      });
      setActionSuccessMsg('Financial adjustment proposal submitted for administrative review.');
      setShowAdjModal(false);
      setAdjAmount(0);
      setAdjReason('');
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Adjustment proposal failed.');
    } finally {
      setSubmittingAdj(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Consumption & Billing Anomaly Dashboard
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Read-only anomaly inspection, verified Phase 9 bill discrepancy evidence, and human review workflows.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.total}</p>
          </div>

          <div className="p-4 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>High Severity</span>
            </span>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{metrics.high}</p>
          </div>

          <div className="p-4 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Review Required</span>
            </span>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{metrics.review}</p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Resolved / Closed</span>
            </span>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.closed}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search consumer, meter, or anomaly ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Severity Filter */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-500 mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Severity:
            </span>
            {(['ALL', 'HIGH', 'REVIEW', 'INFO'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                  severityFilter === sev
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as never)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CORRECTED_THROUGH_ADJUSTMENT">Adjusted</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Main Anomaly Table / List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Activity className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            <p className="text-sm">Loading anomaly intelligence...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold">No anomalies found matching current filters.</p>
            <p className="text-xs text-slate-400 mt-1">All meter readings and billing ledger records are consistent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Severity & ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Consumer & Meter</th>
                  <th className="py-3 px-4">Observed vs Expected</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCases.map(item => {
                  const isHigh = item.severity === 'HIGH';
                  const isReview = item.severity === 'REVIEW';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAnomaly({
                          anomalyId: item.id,
                          relatedId: item.readingId || item.consumerNo,
                          consumerNo: item.consumerNo,
                          category: item.category,
                          severity: item.severity,
                          evidence: item.explanation,
                          expectedValue: item.expectedValue || null,
                          recordedValue: item.observedValue || null,
                          reviewAction: 'Review discrepancy evidence',
                          status: item.status,
                          createdAt: item.detectedAt
                        });
                      }}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isHigh
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                                : isReview
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {localizePhase11Severity(item.severity, language)}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">{item.id}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {localizePhase11Category(item.category, language)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-medium text-slate-900 dark:text-white">
                          {item.consumerNo}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Meter: {item.meterNo}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                          {item.observedValue || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Exp: {item.expectedValue || 'Consistent baseline'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {localizePhase11Status(item.status, language)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedAnomaly({
                              anomalyId: item.id,
                              relatedId: item.readingId || item.consumerNo,
                              consumerNo: item.consumerNo,
                              category: item.category,
                              severity: item.severity,
                              evidence: item.explanation,
                              expectedValue: item.expectedValue || null,
                              recordedValue: item.observedValue || null,
                              reviewAction: 'Review discrepancy evidence',
                              status: item.status,
                              createdAt: item.detectedAt
                            });
                          }}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md font-medium text-xs transition-colors inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Anomaly Detail Drawer Modal */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedAnomaly.severity === 'HIGH'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {selectedAnomaly.severity}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Anomaly Investigation: {selectedAnomaly.anomalyId}
                </h3>
              </div>

              <button
                onClick={() => {
                  setSelectedAnomaly(null);
                  setActionSuccessMsg(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
              {actionSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Anomaly Overview Card */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Category</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {localizePhase11Category(selectedAnomaly.category, language)}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Current Status</span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {localizePhase11Status(selectedAnomaly.status, language)}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Consumer No</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedAnomaly.consumerNo}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Related Reference</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                    {selectedAnomaly.relatedId}
                  </p>
                </div>
              </div>

              {/* Discrepancy Evidence Box */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Discrepancy Evidence & Regulatory Findings</span>
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                  {typeof selectedAnomaly.evidence === 'string'
                    ? selectedAnomaly.evidence
                    : Array.isArray(selectedAnomaly.evidence)
                    ? selectedAnomaly.evidence.join(' ')
                    : selectedAnomaly.evidence?.reasons?.join(' ') || 'Evidence details available in audit log.'}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[11px] text-slate-400 block">Observed Value</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedAnomaly.recordedValue || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <span className="text-[11px] text-slate-400 block">Expected Value</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedAnomaly.expectedValue || 'Consistent baseline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review & Transition Controls */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Audit Trail & Human Review Transition</span>
                </div>

                <textarea
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Enter audit investigation note (required for Investigation, Rejection, or Closure)..."
                  rows={2}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-xs"
                />

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleTransitionStatus('UNDER_INVESTIGATION')}
                    disabled={transitioning}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Mark Investigating
                  </button>

                  <button
                    onClick={() => handleTransitionStatus('APPROVED')}
                    disabled={transitioning || selectedAnomaly.severity === 'HIGH'}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedAnomaly.severity === 'HIGH'
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    Approve Reading
                  </button>

                  <button
                    onClick={() => handleTransitionStatus('REJECTED')}
                    disabled={transitioning}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => handleTransitionStatus('CLOSED')}
                    disabled={transitioning}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                  >
                    Close Case
                  </button>
                </div>
              </div>

              {/* Phase 9 Bill Issuance & Adjustment Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {selectedAnomaly.relatedId.startsWith('MR-') && (
                  <button
                    onClick={() => handleIssueBill(selectedAnomaly.relatedId)}
                    disabled={issuingBill}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-1.5 text-xs shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Issue Phase 9 Bill</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAdjModal(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-lg transition-colors flex items-center space-x-1.5 text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Propose Ledger Adjustment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Adjustment Proposal Modal */}
      {showAdjModal && selectedAnomaly && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Propose Financial Ledger Adjustment
              </h3>
              <button
                onClick={() => setShowAdjModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Adjustment Type</label>
                <select
                  value={adjType}
                  onChange={e => setAdjType(e.target.value as never)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="SLAB_CORRECTION">Slab Tier Correction</option>
                  <option value="CREDIT_CONCESSION">Credit Concession</option>
                  <option value="METER_ERROR_REBATE">Meter Accuracy Error Rebate</option>
                  <option value="SUPPLEMENTARY_CHARGE">Supplementary Ledger Debit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Proposed Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjAmount || ''}
                  onChange={e => setAdjAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter adjustment amount..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Justification & Regulatory Authority</label>
                <textarea
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  placeholder="Explain why this adjustment is required with test bench or tariff references..."
                  rows={3}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowAdjModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProposeAdjustment}
                disabled={submittingAdj}
                className="px-4 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
