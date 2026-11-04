import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Filter,
  Users,
  FileText,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ElectricityBill, ElectricityConnection, PaymentTransaction } from '../../types';
import { LanguageCode } from '../../i18n/types';
import {
  computeExecutiveDelinquencyAging,
  DelinquencyAgingBucketKey,
  DelinquencyAgingBucketSummary,
} from '../../utils/canonicalAnalytics';
import { LateChargeWaiverRecord, PaymentReversalRecord } from '../../utils/lateChargeEngine';

export interface ExecutiveDelinquencyAgingSectionProps {
  bills: ElectricityBill[];
  connections: ElectricityConnection[];
  payments: PaymentTransaction[];
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  referenceDate?: string;
  language?: LanguageCode;
}

export const DELINQUENCY_AGING_I18N: Record<
  LanguageCode,
  {
    sectionTitle: string;
    sectionSubtitle: string;
    kpiTotalDelinquentRevenue: string;
    kpiOverduePrincipal: string;
    kpiAccruedDps: string;
    kpiDelinquentVolume: string;
    kpiSettledExcluded: string;
    agingDistributionTitle: string;
    agingDistributionSubtitle: string;
    drillDownTitle: string;
    drillDownSubtitle: string;
    filterAll: string;
    colBillNo: string;
    colConsumer: string;
    colSubdivision: string;
    colTariff: string;
    colDueDate: string;
    colDaysOverdue: string;
    colPrincipal: string;
    colDps: string;
    colTotal: string;
    colStatus: string;
    noRecordsInBucket: string;
    shareOfDelinquency: string;
    billsUnit: string;
    consumersUnit: string;
  }
> = {
  en: {
    sectionTitle: 'Executive Delinquency Aging & Arrears Analysis',
    sectionSubtitle:
      '5-bucket aging distribution, overdue principal vs. accrued DPS surcharge, and customer-level drill-down ledger',
    kpiTotalDelinquentRevenue: 'Total Delinquent Balance',
    kpiOverduePrincipal: 'Overdue Principal',
    kpiAccruedDps: 'Accrued Unpaid DPS',
    kpiDelinquentVolume: 'Delinquent Accounts',
    kpiSettledExcluded: 'Settled Excluded (₹0 Bal)',
    agingDistributionTitle: 'Delinquency Aging Buckets (5 Categories)',
    agingDistributionSubtitle:
      'Categorized by elapsed calendar days post-due boundary. Settled bills are strictly excluded.',
    drillDownTitle: 'Executive Customer-Level Arrears Drill-Down',
    drillDownSubtitle:
      'Itemized ledger of all accounts with unpaid principal or delayed payment surcharges',
    filterAll: 'All Delinquent Records',
    colBillNo: 'Bill Number',
    colConsumer: 'Consumer & Account',
    colSubdivision: 'Subdivision',
    colTariff: 'Tariff',
    colDueDate: 'Due Date',
    colDaysOverdue: 'Days Overdue',
    colPrincipal: 'Principal (₹)',
    colDps: 'Unpaid DPS (₹)',
    colTotal: 'Total Balance (₹)',
    colStatus: 'Status',
    noRecordsInBucket: 'No delinquent electricity bills in this aging bucket.',
    shareOfDelinquency: 'of total delinquency',
    billsUnit: 'bills',
    consumersUnit: 'consumers',
  },
  gu: {
    sectionTitle: 'એક્ઝિક્યુટિવ બાકી રકમ ઉંમર વિશ્લેષણ (Delinquency Aging)',
    sectionSubtitle:
      '૫-કેટેગરી એજિંગ વિતરણ, મુદતવીતી મુદ્દલ વિરુદ્ધ સંચિત DPS સરચાર્જ અને ગ્રાહક સ્તરનું ડ્રિલ-ડાઉન ખાતાવહી',
    kpiTotalDelinquentRevenue: 'કુલ મુદતવીતી બાકી રકમ',
    kpiOverduePrincipal: 'મુદતવીતી મુદ્દલ',
    kpiAccruedDps: 'સંચિત અવેતન DPS',
    kpiDelinquentVolume: 'મુદતવીતી ખાતાઓ',
    kpiSettledExcluded: 'ચૂકવેલ બાકાત (₹૦ બાકી)',
    agingDistributionTitle: 'મુદતવીતી એજિંગ બકેટ્સ (૫ શ્રેણીઓ)',
    agingDistributionSubtitle:
      'છેલ્લી તારીખ પછીના દિવસો મુજબ વર્ગીકૃત. સંપૂર્ણ ચૂકવેલા બિલ સખત રીતે બાકાત છે.',
    drillDownTitle: 'એક્ઝિક્યુટિવ ગ્રાહક સ્તરનું બાકી રકમ ડ્રિલ-ડાઉન',
    drillDownSubtitle:
      'બાકી મુદ્દલ અથવા વિલંબિત સરચાર્જ ધરાવતા તમામ ખાતાઓની વિગતવાર ખાતાવહી',
    filterAll: 'બધા મુદતવીતી રેકોર્ડ્સ',
    colBillNo: 'બિલ નંબર',
    colConsumer: 'ગ્રાહક અને ખાતું',
    colSubdivision: 'સબડિવિઝન',
    colTariff: 'ટેરિફ',
    colDueDate: 'છેલ્લી તારીખ',
    colDaysOverdue: 'મુદતવીતી દિવસો',
    colPrincipal: 'મુદ્દલ (₹)',
    colDps: 'અવેતન DPS (₹)',
    colTotal: 'કુલ બાકી (₹)',
    colStatus: 'સ્થિતિ',
    noRecordsInBucket: 'આ એજિંગ બકેટમાં કોઈ મુદતવીતી વીજળી બિલ નથી.',
    shareOfDelinquency: 'કુલ મુદતવીતી રકમનું',
    billsUnit: 'બિલ',
    consumersUnit: 'ગ્રાહકો',
  },
  hi: {
    sectionTitle: 'कार्यकारी अतिदेय आयु-विश्लेषण (Executive Delinquency Aging)',
    sectionSubtitle:
      '5-श्रेणी अतिदेय आयु-वर्ग वितरण, मूलधन बनाम संचित DPS विलंब अधिभार एवं ग्राहक-स्तरीय विस्तृत विवरण',
    kpiTotalDelinquentRevenue: 'कुल अतिदेय बकाया राशि',
    kpiOverduePrincipal: 'अतिदेय मूलधन',
    kpiAccruedDps: 'संचित अदत्त DPS',
    kpiDelinquentVolume: 'अतिदेय खाते एवं बिल',
    kpiSettledExcluded: 'निपटान सुरक्षित (₹0 बकाया)',
    agingDistributionTitle: 'अतिदेय आयु-वर्ग श्रेणियां (5 श्रेणियां)',
    agingDistributionSubtitle:
      'देय तिथि उपरांत बीते दिनों के आधार पर वर्गीकृत। पूर्ण भुगतान वाले बिल सुरक्षित रूप से बाहर रखे गए हैं।',
    drillDownTitle: 'कार्यकारी ग्राहक-स्तरीय बकाया विवरण (ड्रिल-डाउन)',
    drillDownSubtitle:
      'अदत्त मूलधन या विलंब शुल्क वाले सभी खातों का मद-वार बहीखाता',
    filterAll: 'सभी अतिदेय रिकॉर्ड्स',
    colBillNo: 'बिल संख्या',
    colConsumer: 'उपभोक्ता एवं खाता',
    colSubdivision: 'सबडिवीजन',
    colTariff: 'टैरिफ श्रेणी',
    colDueDate: 'देय तिथि',
    colDaysOverdue: 'अतिदेय दिन',
    colPrincipal: 'मूलधन (₹)',
    colDps: 'अदत्त DPS (₹)',
    colTotal: 'कुल बकाया (₹)',
    colStatus: 'स्थिति',
    noRecordsInBucket: 'इस आयु-वर्ग श्रेणी में कोई अतिदेय बिजली बिल नहीं है।',
    shareOfDelinquency: 'कुल अतिदेय का',
    billsUnit: 'बिल',
    consumersUnit: 'उपभोक्ता',
  },
  mr: {
    sectionTitle: 'कार्यकारी थकबाकी कालावधी विश्लेषण (Executive Delinquency Aging)',
    sectionSubtitle:
      '५-गट कालावधी वितरण, थकीत मुद्दल विरूद्ध संचित DPS विलंब आकार आणि ग्राहक-स्तरीय सविस्तर खातेवही',
    kpiTotalDelinquentRevenue: 'एकूण थकीत देय रक्कम',
    kpiOverduePrincipal: 'थकीत मुद्दल',
    kpiAccruedDps: 'संचित अदत्त DPS',
    kpiDelinquentVolume: 'थकीत खाती व बिले',
    kpiSettledExcluded: 'भरलेली वगळली (₹० बाकी)',
    agingDistributionTitle: 'थकबाकी कालावधी गट (५ श्रेणी)',
    agingDistributionSubtitle:
      'देय तारखेनंतरच्या दिवसांनुसार वर्गीकरण. पूर्ण भरलेली बिले काटेकोरपणे वगळली आहेत.',
    drillDownTitle: 'कार्यकारी ग्राहक-स्तरीय थकबाकी तपशील (ड्रिल-डाउन)',
    drillDownSubtitle:
      'अदत्त मुद्दल किंवा विलंब आकार असलेल्या सर्व खात्यांची सविस्तर खातेवही',
    filterAll: 'सर्व थकीत नोंदी',
    colBillNo: 'बिल क्रमांक',
    colConsumer: 'ग्राहक व खाते',
    colSubdivision: 'सबडिव्हिजन',
    colTariff: 'टॅरिफ श्रेणी',
    colDueDate: 'देय तारीख',
    colDaysOverdue: 'थकीत दिवस',
    colPrincipal: 'मुद्दल (₹)',
    colDps: 'अदत्त DPS (₹)',
    colTotal: 'एकूण बाकी (₹)',
    colStatus: 'स्थिती',
    noRecordsInBucket: 'या कालावधी गटामध्ये कोणतेही थकीत बिल नाही.',
    shareOfDelinquency: 'एकूण थकबाकीपैकी',
    billsUnit: 'बिले',
    consumersUnit: 'ग्राहक',
  },
};

export const ExecutiveDelinquencyAgingSection: React.FC<ExecutiveDelinquencyAgingSectionProps> = ({
  bills,
  connections,
  payments,
  waivers = [],
  reversals = [],
  referenceDate = '04-Nov-2026',
  language = 'en',
}) => {
  const t = DELINQUENCY_AGING_I18N[language] || DELINQUENCY_AGING_I18N.en;
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<DelinquencyAgingBucketKey | 'ALL'>('ALL');
  const selectedBucket = selectedBucketFilter;
  const setSelectedBucket = setSelectedBucketFilter;

  const agingResult = useMemo(() => {
    return computeExecutiveDelinquencyAging({
      bills,
      connections,
      payments,
      waivers,
      reversals,
      referenceDate,
      language,
    });
  }, [bills, connections, payments, waivers, reversals, referenceDate, language]);

  const bucketKeys: DelinquencyAgingBucketKey[] = [
    'NOT_YET_DUE',
    '1_30_DAYS',
    '31_60_DAYS',
    '61_90_DAYS',
    'OVER_90_DAYS',
  ];

  const bucketColorMap: Record<DelinquencyAgingBucketKey, {
    bg: string;
    border: string;
    badge: string;
    bar: string;
    text: string;
  }> = {
    NOT_YET_DUE: {
      bg: 'bg-blue-50/70 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900/50',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
      bar: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
    },
    '1_30_DAYS': {
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-900/50',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
      bar: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-300',
    },
    '31_60_DAYS': {
      bg: 'bg-orange-50/70 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-900/50',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
      bar: 'bg-orange-500',
      text: 'text-orange-700 dark:text-orange-300',
    },
    '61_90_DAYS': {
      bg: 'bg-rose-50/70 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-900/50',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
      bar: 'bg-rose-500',
      text: 'text-rose-700 dark:text-rose-300',
    },
    OVER_90_DAYS: {
      bg: 'bg-red-50/80 dark:bg-red-950/40',
      border: 'border-red-300 dark:border-red-900/70',
      badge: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100',
      bar: 'bg-red-600',
      text: 'text-red-700 dark:text-red-300',
    },
  };

  const filteredDrillDown = useMemo(() => {
    if (selectedBucket === 'ALL') {
      return agingResult.allDrillDownRecords;
    }
    return agingResult.buckets[selectedBucket]?.drillDownRecords || [];
  }, [agingResult, selectedBucket]);

  const formatInr = (num: number) =>
    `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className="space-y-6"
      data-testid="executive-delinquency-aging-section"
      role="region"
      aria-label={t.sectionTitle}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.sectionTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.sectionSubtitle} · Ref: <span className="font-mono font-bold">{referenceDate}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {agingResult.totalEvaluatedBillsCount} Bills Evaluated
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-semibold border border-emerald-200 dark:border-emerald-800">
            {agingResult.totalSettledBillsExcludedCount} Settled Excluded
          </span>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/90 dark:border-rose-900/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
            {t.kpiTotalDelinquentRevenue}
          </span>
          <div
            data-testid="aging-kpi-total-overdue"
            className="text-lg sm:text-xl font-extrabold font-mono text-rose-900 dark:text-rose-100"
          >
            {formatInr(agingResult.totalOverdueBalanceInr)}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-mono">
            {agingResult.totalDelinquentBillsCount} overdue bills
          </span>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
            {t.kpiOverduePrincipal}
          </span>
          <div
            data-testid="aging-kpi-overdue-principal"
            className="text-lg sm:text-xl font-extrabold font-mono text-amber-900 dark:text-amber-100"
          >
            {formatInr(agingResult.totalOverduePrincipalInr)}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-mono">
            Unpaid principal component
          </span>
        </div>

        <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/90 dark:border-orange-900/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 block">
            {t.kpiAccruedDps}
          </span>
          <div
            data-testid="aging-kpi-accrued-dps"
            className="text-lg sm:text-xl font-extrabold font-mono text-orange-900 dark:text-orange-100"
          >
            +{formatInr(agingResult.totalOverdueDpsInr)}
          </div>
          <span className="text-[10px] text-orange-600 dark:text-orange-400 block font-mono">
            Accrued @ 15% p.a.
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {t.kpiDelinquentVolume}
          </span>
          <div
            data-testid="aging-kpi-delinquent-consumers"
            className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white"
          >
            {agingResult.totalDelinquentConsumersCount}
          </div>
          <span className="text-[10px] text-slate-500 block font-mono">
            {agingResult.totalDelinquentBillsCount} bills across consumers
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-900/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
            {t.kpiSettledExcluded}
          </span>
          <div
            data-testid="aging-kpi-settled-excluded"
            className="text-lg sm:text-xl font-extrabold font-mono text-emerald-900 dark:text-emerald-100"
          >
            {agingResult.totalSettledBillsExcludedCount}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
            Fully paid (₹0.00 outstanding)
          </span>
        </div>
      </div>

      {/* 5 Aging Bucket Cards */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.agingDistributionTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.agingDistributionSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {bucketKeys.map((bKey) => {
            const bucket = agingResult.buckets[bKey];
            const colors = bucketColorMap[bKey];
            const isSelected = selectedBucket === bKey;

            return (
              <button
                key={bKey}
                type="button"
                onClick={() => setSelectedBucket(isSelected ? 'ALL' : bKey)}
                data-testid={`aging-bucket-card-${bKey.toLowerCase()}`}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer space-y-2.5 ${colors.bg} ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-400 shadow-md'
                    : colors.border
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${colors.badge}`}
                  >
                    {bucket.rangeDays}
                  </span>
                  {bKey !== 'NOT_YET_DUE' && (
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                      {bucket.percentageOfTotalDelinquency}%
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {bucket.bucketLabel}
                  </h4>
                  <div className="text-base sm:text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                    {formatInr(bucket.totalOverdueBalanceInr)}
                  </div>
                </div>

                <div className="text-[11px] space-y-0.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 font-mono">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Principal:</span>
                    <span className="font-semibold">{formatInr(bucket.unpaidPrincipalInr)}</span>
                  </div>
                  {bucket.unpaidDpsInr > 0 && (
                    <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                      <span>DPS:</span>
                      <span className="font-semibold">+{formatInr(bucket.unpaidDpsInr)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-500 pt-1">
                    <span>Volume:</span>
                    <span>
                      {bucket.billsCount} bills ({bucket.consumersCount} consumers)
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Visual Share of Delinquency Bar */}
        {agingResult.totalOverdueBalanceInr > 0 && (
          <div className="p-3 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Overdue Proportion by Aging Horizon
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                100% = {formatInr(agingResult.totalOverdueBalanceInr)}
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {(['1_30_DAYS', '31_60_DAYS', '61_90_DAYS', 'OVER_90_DAYS'] as DelinquencyAgingBucketKey[]).map(
                (bKey) => {
                  const b = agingResult.buckets[bKey];
                  const pct = b.percentageOfTotalDelinquency;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={bKey}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${bucketColorMap[bKey].bar} transition-all`}
                      title={`${b.bucketLabel}: ${pct}% (${formatInr(b.totalOverdueBalanceInr)})`}
                    />
                  );
                }
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              {(['1_30_DAYS', '31_60_DAYS', '61_90_DAYS', 'OVER_90_DAYS'] as DelinquencyAgingBucketKey[]).map(
                (bKey) => {
                  const b = agingResult.buckets[bKey];
                  return (
                    <div key={bKey} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${bucketColorMap[bKey].bar}`} />
                      <span>
                        {b.bucketLabel}: <strong>{b.percentageOfTotalDelinquency}%</strong>
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer-Level Drill-Down Table */}
      <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-3 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.drillDownTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.drillDownSubtitle} ({filteredDrillDown.length} matching records)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedBucket('ALL')}
              data-testid="delinquency-aging-filter-ALL"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                selectedBucket === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {t.filterAll} ({agingResult.allDrillDownRecords.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedBucket('NOT_YET_DUE')}
              data-testid="delinquency-aging-filter-NOT_YET_DUE"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                selectedBucket === 'NOT_YET_DUE'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {agingResult.buckets.NOT_YET_DUE.rangeDays} ({agingResult.buckets.NOT_YET_DUE.billsCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedBucket('1_30_DAYS')}
              data-testid="delinquency-aging-filter-1_30_DAYS"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                selectedBucket === '1_30_DAYS'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {agingResult.buckets['1_30_DAYS'].rangeDays} ({agingResult.buckets['1_30_DAYS'].billsCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedBucket('31_60_DAYS')}
              data-testid="delinquency-aging-filter-31_60_DAYS"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                selectedBucket === '31_60_DAYS'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {agingResult.buckets['31_60_DAYS'].rangeDays} ({agingResult.buckets['31_60_DAYS'].billsCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedBucket('61_90_DAYS')}
              data-testid="delinquency-aging-filter-61_90_DAYS"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                selectedBucket === '61_90_DAYS'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {agingResult.buckets['61_90_DAYS'].rangeDays} ({agingResult.buckets['61_90_DAYS'].billsCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedBucket('OVER_90_DAYS')}
              data-testid="delinquency-aging-filter-OVER_90_DAYS"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                selectedBucket === 'OVER_90_DAYS'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              {agingResult.buckets.OVER_90_DAYS.rangeDays} ({agingResult.buckets.OVER_90_DAYS.billsCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 font-semibold">{t.colBillNo}</th>
                <th className="p-3 font-semibold">{t.colConsumer}</th>
                <th className="p-3 font-semibold">{t.colSubdivision}</th>
                <th className="p-3 font-semibold">{t.colTariff}</th>
                <th className="p-3 font-semibold">{t.colDueDate}</th>
                <th className="p-3 font-semibold text-center">{t.colDaysOverdue}</th>
                <th className="p-3 font-semibold text-right">{t.colPrincipal}</th>
                <th className="p-3 font-semibold text-right">{t.colDps}</th>
                <th className="p-3 font-semibold text-right">{t.colTotal}</th>
                <th className="p-3 font-semibold text-center">{t.colStatus}</th>
              </tr>
            </thead>
            {filteredDrillDown.length > 0 ? (
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDrillDown.map((rec) => (
                  <tr
                    key={rec.billNo}
                    data-testid={`aging-drilldown-row-${rec.billNo}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {rec.billNo}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {rec.consumerName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 block">
                        {rec.consumerNo}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {rec.subdivision}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {rec.tariffCategory}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {rec.dueDate}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {rec.daysOverdue > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 font-mono font-bold text-[10px]">
                          {rec.daysOverdue}d Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 font-mono text-[10px]">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900 dark:text-white">
                      {formatInr(rec.unpaidPrincipalInr)}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {rec.unpaidDpsInr > 0 ? `+${formatInr(rec.unpaidDpsInr)}` : '₹0.00'}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                      {formatInr(rec.totalOutstandingInr)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          rec.status === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : rec.status === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    {t.noRecordsInBucket}
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
