import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Gauge,
  FileText,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  Camera,
  Bell,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizePhase11Status,
  localizePhase11Category,
  localizeMeterNotification
} from '../../i18n/meterPhase11Translations';
import { ElectricityConnection, ElectricityBill, AppNotification } from '../../types';
import type {
  MeterReadingRecord,
  StructuredAnomalyCase,
  ConsumerBillingReviewRequest,
  BillingReviewCategory
} from '../../services/meterReading';
import { validateDocumentUpload } from '../../utils/documentUpload';

interface Props {
  selectedConnection: ElectricityConnection | null;
  consumerBills: ElectricityBill[];
  onRequestSelfReading?: () => void;
  onSelectBillForReview?: (billNo: string) => void;
}

export const ConsumerMeterBillingSection: React.FC<Props> = ({
  selectedConnection,
  consumerBills,
  onRequestSelfReading
}) => {
  const { showToast } = useApp();
  const { language, t } = useLanguage();
  const mp = t.meterPhase11;

  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState<MeterReadingRecord[]>([]);
  const [anomalies, setAnomalies] = useState<StructuredAnomalyCase[]>([]);
  const [reviews, setReviews] = useState<ConsumerBillingReviewRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal State for New Billing Review Request
  const [isNewReviewModalOpen, setIsNewReviewModalOpen] = useState(false);
  const [selectedBillNo, setSelectedBillNo] = useState<string>(consumerBills[0]?.billNo || '');
  const [reviewCategory, setReviewCategory] = useState<BillingReviewCategory>('CONSUMPTION_DISPUTE');
  const [reviewDescription, setReviewDescription] = useState('');
  const [attachedPhotoDataUrl, setAttachedPhotoDataUrl] = useState<string | undefined>(undefined);
  const [attachedPhotoName, setAttachedPhotoName] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Modal State for Inspecting an Existing Review
  const [inspectedReview, setInspectedReview] = useState<ConsumerBillingReviewRequest | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [readingsRes, anomaliesRes, reviewsRes, notifRes] = await Promise.all([
        fetch('/api/meter-readings', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/anomalies', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/billing-reviews', { credentials: 'same-origin' }),
        fetch('/api/meter-readings/notifications', { credentials: 'same-origin' })
      ]);

      if (readingsRes.ok) {
        const data = await readingsRes.json();
        setReadings(data.readings || []);
      }
      if (anomaliesRes.ok) {
        const data = await anomaliesRes.json();
        setAnomalies(data.anomalies || []);
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      setError(mp.empNoRecordsFound);
    } finally {
      setLoading(false);
    }
  }, [mp.empNoRecordsFound]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Scoped readings for current selected connection
  const connectionReadings = useMemo(() => {
    if (!selectedConnection) return readings;
    return readings.filter(r => r.consumerNo === selectedConnection.consumerNo);
  }, [readings, selectedConnection]);

  const latestReading = connectionReadings[0] || null;
  const previousApprovedReading = connectionReadings.find(
    (r, idx) => idx > 0 && r.status === 'APPROVED'
  ) || null;

  // Scoped anomalies for connection
  const connectionAnomalies = useMemo(() => {
    if (!selectedConnection) return anomalies;
    return anomalies.filter(a => a.consumerNo === selectedConnection.consumerNo);
  }, [anomalies, selectedConnection]);

  // Handle Photo Attachment for Billing Review
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateDocumentUpload(file);
    if (!validation.valid) {
      showToast(validation.reason || 'Invalid file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedPhotoDataUrl(String(reader.result));
      setAttachedPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Submit Billing Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillNo) {
      showToast(mp.cnsSelectBill, 'warning');
      return;
    }
    if (!reviewDescription.trim()) {
      showToast(mp.cnsReviewDescriptionLabel, 'warning');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const clientUuid = `cbr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch('/api/meter-readings/billing-reviews', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-VidyutFlow-CSRF': '1'
        },
        body: JSON.stringify({
          billNo: selectedBillNo,
          category: reviewCategory,
          description: reviewDescription.trim(),
          clientUuid,
          photoDataUrl: attachedPhotoDataUrl
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to submit billing review.');
      }

      showToast(mp.cnsReviewSubmittedSuccess, 'success');
      setIsNewReviewModalOpen(false);
      setReviewDescription('');
      setAttachedPhotoDataUrl(undefined);
      setAttachedPhotoName(null);
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Submission failed', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'PENDING_REVIEW':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'UNDER_INVESTIGATION':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'CORRECTED_THROUGH_ADJUSTMENT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-50 via-white to-blue-50 dark:from-[#0f1f3d] dark:via-[#101c35] dark:to-[#0d1829] border border-cyan-200 dark:border-cyan-900/40 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
              {mp.cnsSectionBadge}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {mp.cnsSectionTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mp.cnsSectionSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRequestSelfReading && (
            <button
              type="button"
              onClick={onRequestSelfReading}
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{mp.cnsTabSubmitReading}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNewReviewModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{mp.cnsRequestBillingReviewTitle}</span>
          </button>

          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            aria-label={mp.empRefreshBtn}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* ANOMALY ALERTS (IF ANY FOR CURRENT CONSUMER) */}
      {connectionAnomalies.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
              {mp.cnsFindingsTitle} ({connectionAnomalies.length})
            </h3>
          </div>
          <div className="space-y-2">
            {connectionAnomalies.map(anom => (
              <div
                key={anom.id}
                className="p-3 rounded-lg bg-white dark:bg-[#101C35] border border-amber-200/80 dark:border-amber-900/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {localizePhase11Category(anom.category, language)}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(anom.status)}`}>
                      {localizePhase11Status(anom.status, language)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {anom.explanation}
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  {new Date(anom.detectedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRID: METER OVERVIEW & ACTIVE BILLING REVIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD A: LATEST METER READING OVERVIEW */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {mp.wsPreview}
              </h3>
            </div>
            {selectedConnection && (
              <span className="text-[11px] font-mono text-slate-500">
                {mp.wsMeterLabel}: {selectedConnection.meterNo}
              </span>
            )}
          </div>

          {latestReading ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.wsDisplayedReading}</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {latestReading.displayedReading} kWh
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.wsReadingDate}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {new Date(latestReading.readingAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">{mp.cnsStatusCol}</span>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${getStatusBadge(latestReading.status)}`}>
                    {localizePhase11Status(latestReading.status, language)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{mp.wsConsumptionUnits}</span>
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                    {latestReading.consumedUnits !== undefined ? `${latestReading.consumedUnits} kWh` : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{mp.wsLastVerified}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">
                    {previousApprovedReading ? `${previousApprovedReading.readingKwh} kWh` : `${selectedConnection?.previousReadingKwh ?? '—'} kWh`}
                  </span>
                </div>
              </div>

              {latestReading.reviewNote && (
                <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 text-[11px]">
                  <strong>{mp.cnsPublicResolutionNote}:</strong> {latestReading.reviewNote}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs text-slate-500">
                {mp.wsNoReadings}
              </p>
            </div>
          )}
        </div>

        {/* CARD B: BILLING REVIEW REQUESTS */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {mp.cnsMyBillingReviewsTitle} ({reviews.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsNewReviewModalOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>+ {mp.cnsRequestBillingReviewTitle}</span>
            </button>
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {reviews.map(rev => (
                <div
                  key={rev.id}
                  onClick={() => setInspectedReview(rev)}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {rev.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(rev.status)}`}>
                      {localizePhase11Status(rev.status, language)}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    {localizePhase11Category(rev.category, language)}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-medium line-clamp-2">
                    {rev.description}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>{rev.billNo}</span>
                    <span>{new Date(rev.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs text-slate-500">
                {mp.cnsNoBillingReviews}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* METER & BILLING VERIFICATION NOTIFICATIONS */}
      {notifications.length > 0 && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-600 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {mp.cnsMeterNotificationsTitle} ({notifications.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {notifications.slice(0, 6).map(item => {
              const loc = localizeMeterNotification(item.title, item.message, language);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-semibold text-slate-900 dark:text-white">{loc.title}</strong>
                    <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{loc.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT NEW BILLING REVIEW */}
      {isNewReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {mp.cnsRequestBillingReviewTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {mp.cnsSectionSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewReviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.cnsSelectBill}
                </label>
                <select
                  value={selectedBillNo}
                  onChange={e => setSelectedBillNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                >
                  {consumerBills.map(b => (
                    <option key={b.billNo} value={b.billNo}>
                      {b.billNo} — {b.billMonth} (₹{b.totalAmount}) [{b.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.cnsReviewCategoryLabel}
                </label>
                <select
                  value={reviewCategory}
                  onChange={e => setReviewCategory(e.target.value as BillingReviewCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="CONSUMPTION_DISPUTE">{mp.catConsumptionDispute}</option>
                  <option value="TARIFF_MISMATCH">{mp.catTariffMismatch}</option>
                  <option value="METER_FAULT_SUSPECTED">{mp.catMeterFaultSuspected}</option>
                  <option value="PAYMENT_NOT_REFLECTED">{mp.catPaymentNotReflected}</option>
                  <option value="DUPLICATE_BILL">{mp.catDuplicateBill}</option>
                  <option value="OTHER">{mp.catOther}</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.cnsReviewDescriptionLabel}
                </label>
                <textarea
                  value={reviewDescription}
                  onChange={e => setReviewDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder={mp.cnsReviewDescriptionPlaceholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mp.cnsAttachEvidencePhoto}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {attachedPhotoName && (
                  <p className="mt-1 text-emerald-600 font-medium">
                    {attachedPhotoName}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewReviewModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmittingReview ? mp.cnsSubmittingReview : mp.cnsSubmitReviewBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT EXISTING BILLING REVIEW */}
      {inspectedReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101C35] rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {inspectedReview.id}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(inspectedReview.status)}`}>
                    {localizePhase11Status(inspectedReview.status, language)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {inspectedReview.billNo} · {new Date(inspectedReview.submittedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedReview(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">{mp.cnsReviewDescriptionLabel}</span>
                <p className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 mt-1">
                  {inspectedReview.description}
                </p>
              </div>

              {inspectedReview.consumerVisibleNote && (
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">{mp.cnsPublicResolutionNote}</span>
                  <p className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 mt-1">
                    {inspectedReview.consumerVisibleNote}
                  </p>
                </div>
              )}

              {/* Progress Stepper */}
              <div>
                <span className="text-[10px] uppercase text-slate-400 block font-semibold mb-2">{mp.cnsStatusTimeline}</span>
                <div className="space-y-2">
                  {inspectedReview.statusHistory.map((step, idx) => (
                    <div key={step.id || idx} className="flex items-start gap-2 text-[11px]">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {localizePhase11Status(step.toStatus, language)}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {step.reason && (
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">{step.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectedReview(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
