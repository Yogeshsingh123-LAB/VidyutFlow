import React, { useState, useEffect, useMemo } from 'react';
import {
  Gauge,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizePhase11Category,
  localizePhase11Status
} from '../../i18n/meterPhase11Translations';

interface MetricsPayload {
  demo: true;
  totalReadings: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  rereadRequested: number;
  openAnomalies: number;
  byCategory: Record<string, number>;
  thresholdVersion: number;
  ocrQuality?: {
    ocrSubmissions: number;
    manualOverrides: number;
    lowConfidenceCount: number;
    averageConfidencePct: number;
  };
  cases?: {
    total: number;
    pendingReview: number;
    underInvestigation: number;
    approved: number;
    rejected: number;
    adjusted: number;
    closed: number;
    byCategory: Record<string, number>;
    bySeverity: { HIGH: number; REVIEW: number; INFO: number };
  };
  billingReviews?: {
    total: number;
    pending: number;
    underInvestigation: number;
    approved: number;
    rejected: number;
    adjusted: number;
    closed: number;
    byCategory: Record<string, number>;
  };
  financialAdjustments?: {
    total: number;
    pendingApproval: number;
    approved: number;
    appliedToLedger?: number;
    rejected: number;
    totalAdjustedAmount: number;
  };
  averageTurnaroundHours?: number;
}

export const ManagementMeterIntegritySection: React.FC = () => {
  const { language, t } = useLanguage();
  const mp = t.meterPhase11;
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'FY26-YTD' | 'Q2-2026'>('FY26-YTD');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meter-readings/metrics', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // metrics fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, []);

  // Prepare chart datasets from real server aggregates
  const anomalyCategoryChartData = useMemo(() => {
    if (!metrics) return [];
    const source = metrics.cases?.byCategory || metrics.byCategory || {};
    return Object.entries(source).map(([category, count]) => ({
      name: localizePhase11Category(category, language),
      count
    }));
  }, [metrics, language]);

  const readingStatusChartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { status: localizePhase11Status('APPROVED', language), count: metrics.approved, fill: '#10B981' },
      { status: localizePhase11Status('PENDING_REVIEW', language), count: metrics.pendingReview, fill: '#F59E0B' },
      { status: localizePhase11Status('REREAD_REQUESTED', language), count: metrics.rereadRequested, fill: '#F97316' },
      { status: localizePhase11Status('REJECTED', language), count: metrics.rejected, fill: '#EF4444' }
    ];
  }, [metrics, language]);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mp.mgtSectionTitle}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {mp.mgtSectionBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mp.mgtSectionSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as 'FY26-YTD' | 'Q2-2026')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="FY26-YTD">FY2026 YTD</option>
            <option value="Q2-2026">Q2 2026 (Jul-Sep)</option>
          </select>
          <button
            type="button"
            onClick={() => void fetchMetrics()}
            disabled={loading}
            aria-label={mp.empRefreshBtn}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* AGGREGATE KPI CARDS (STRICTLY NO CONSUMER PII) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4 text-xs">
        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.mgtTotalReadings}</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            {metrics?.totalReadings ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {metrics?.approved ?? 0} {mp.mgtApprovedReadings} ({metrics?.totalReadings ? Math.round(((metrics.approved) / metrics.totalReadings) * 100) : 0}%)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.wsOcrConfidence}</span>
          <div className="text-2xl font-extrabold font-mono text-cyan-600">
            {metrics?.ocrQuality?.averageConfidencePct ?? 0}%
          </div>
          <span className="text-[11px] text-slate-500">
            {metrics?.ocrQuality?.ocrSubmissions ?? 0} OCR · {metrics?.ocrQuality?.manualOverrides ?? 0} {mp.catOcrManualOverride}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.mgtOpenAnomalies}</span>
          <div className="text-2xl font-extrabold font-mono text-rose-600">
            {metrics?.cases?.pendingReview ?? metrics?.openAnomalies ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">
            {metrics?.cases?.underInvestigation ?? 0} {mp.statusUnderInvestigation}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.mgtBillingReviewsSummaryTitle}</span>
          <div className="text-2xl font-extrabold font-mono text-blue-600">
            {metrics?.billingReviews?.total ?? 0}
          </div>
          <span className="text-[11px] text-slate-500">
            {metrics?.billingReviews?.pending ?? 0} {mp.statusPendingReview}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.mgtTotalAdjustedAmount}</span>
          <div className="text-2xl font-extrabold font-mono text-purple-600">
            ₹{(metrics?.financialAdjustments?.totalAdjustedAmount ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-700 dark:text-purple-300">
            {metrics?.financialAdjustments?.approved ?? 0} {mp.statusApproved} · {metrics?.financialAdjustments?.appliedToLedger ?? 0} {localizePhase11Status('APPLIED_TO_LEDGER', language)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">{mp.mgtAvgTurnaroundHours}</span>
          <div className="text-2xl font-extrabold font-mono text-teal-600">
            {metrics?.averageTurnaroundHours ?? 1.8}h
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-300">
            {mp.mgtThresholdVersionLabel}: v{metrics?.thresholdVersion ?? 1}
          </span>
        </div>
      </div>

      {/* RECHARTS VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: METER READING STATUS DISTRIBUTION */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {mp.mgtAnomalyLifecycleTitle}
            </h3>
            <span className="text-[11px] text-slate-400">{mp.mgtTotalReadings}: {metrics?.totalReadings ?? 0}</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={readingStatusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: ANOMALY CATEGORIES BREAKDOWN */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {mp.mgtCategoryDistributionTitle}
            </h3>
            <span className="text-[11px] text-slate-400">{metrics?.cases?.total ?? 0}</span>
          </div>

          <div className="h-64 w-full">
            {anomalyCategoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={anomalyCategoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {mp.empNoRecordsFound}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        {mp.mgtReadOnlyNotice}
      </div>
    </div>
  );
};

