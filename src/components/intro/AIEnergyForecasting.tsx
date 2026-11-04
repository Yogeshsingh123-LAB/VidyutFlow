import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getManagementUiDictionary } from '../../i18n/managementContentTranslations';
import {
  getAnalyticsTransparencyDictionary,
  resolveAnalyticsDataSourceClassification,
  resolveAnalyticsTimestampLabel,
  resolveForecastUncertaintyDisclosure
} from '../../utils/analyticsTransparency';
import {
  Sparkles,
  Thermometer,
  Percent,
  Info,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const AIEnergyForecasting: React.FC = () => {
  const { language } = useLanguage();
  const tm = getManagementUiDictionary(language);
  const at = getAnalyticsTransparencyDictionary(language);
  const [temperatureC, setTemperatureC] = useState<number>(36);
  const [growthPct, setGrowthPct] = useState<number>(6);
  const [solarPenetration, setSolarPenetration] = useState<boolean>(true);
  const [lastRecalculatedAt, setLastRecalculatedAt] = useState<string>('Oct 2026 DAPS Baseline');

  const isModifiedFromBaseline =
    temperatureC !== 36 || growthPct !== 6 || solarPenetration !== true;

  const forecastClassification = resolveAnalyticsDataSourceClassification({
    dataMode: 'DEMO',
    isForecastView: true,
    hasInteractiveSimulationModification: isModifiedFromBaseline,
    language
  });

  const forecastTimestamp = resolveAnalyticsTimestampLabel({
    timestamp: lastRecalculatedAt,
    type: isModifiedFromBaseline ? 'simulated' : 'forecast_generated',
    language
  });

  const uncertaintyDisclosure = resolveForecastUncertaintyDisclosure({
    hasValidatedStatisticalInterval: false,
    hasDeterministicSensitivityBand: true,
    language
  });

  const updateParameterTimestamp = (label: string) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setLastRecalculatedAt(`${hh}:${mm}:${ss} IST (${label})`);
  };

  // Baseline 24-hour demand profile for North Gujarat circle (MW)
  // Reflects early morning dip, afternoon agricultural shift, and evening domestic peak
  const baselineHourlyLoads = [
    { hour: '00:00', baseMw: 34.2 },
    { hour: '02:00', baseMw: 31.8 },
    { hour: '04:00', baseMw: 32.5 },
    { hour: '06:00', baseMw: 38.0 },
    { hour: '08:00', baseMw: 44.5 },
    { hour: '10:00', baseMw: 51.2 },
    { hour: '12:00', baseMw: 54.0 },
    { hour: '14:00', baseMw: 56.8 },
    { hour: '16:00', baseMw: 55.4 },
    { hour: '18:00', baseMw: 58.6 },
    { hour: '20:00', baseMw: 66.4 },
    { hour: '21:00', baseMw: 68.2 }, // Evening Peak
    { hour: '22:00', baseMw: 62.0 },
    { hour: '23:00', baseMw: 45.8 }
  ];

  // Calculate dynamic forecast values with temperature sensitivity and growth factor
  const forecastData = useMemo(() => {
    // Temperature coefficient: every 1°C above 30°C adds ~1.8% cooling load
    const tempDelta = Math.max(0, temperatureC - 30);
    const tempMultiplier = 1 + tempDelta * 0.018;
    const growthMultiplier = 1 + growthPct / 100;

    return baselineHourlyLoads.map(pt => {
      // Midday solar offset between 10:00 and 16:00
      let solarDeduction = 0;
      if (solarPenetration) {
        if (pt.hour === '12:00') solarDeduction = 7.4;
        else if (pt.hour === '10:00' || pt.hour === '14:00') solarDeduction = 5.2;
        else if (pt.hour === '08:00' || pt.hour === '16:00') solarDeduction = 2.1;
      }

      // Predicted load
      const adjustedPredicted =
        Math.round((pt.baseMw * tempMultiplier * growthMultiplier - solarDeduction) * 10) / 10;

      // Deterministic scenario sensitivity upper and lower bounds (±4.5%)
      const upperBound = Math.round(adjustedPredicted * 1.045 * 10) / 10;
      const lowerBound = Math.round(adjustedPredicted * 0.955 * 10) / 10;

      return {
        hour: pt.hour,
        actualHistorical: pt.baseMw,
        predictedMw: adjustedPredicted,
        upperBound,
        lowerBound,
        solarOffset: solarDeduction
      };
    });
  }, [temperatureC, growthPct, solarPenetration]);

  // Derived metrics
  const peakForecastMw = Math.max(...forecastData.map(d => d.predictedMw));
  const peakItem = forecastData.find(d => d.predictedMw === peakForecastMw);
  const totalMUs = (
    forecastData.reduce((acc, curr) => acc + curr.predictedMw * 1.7, 0) / 1000
  ).toFixed(2);
  const estimatedCostCr = (Number(totalMUs) * 5.42).toFixed(2); // Avg ₹5.42/unit wholesale procurement

  return (
    <div className="space-y-6">
      {/* Forecasting Control Deck */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {tm.forecastEngineTitle}
              </h3>
              <span
                data-testid="forecast-source-badge"
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isModifiedFromBaseline
                    ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border-violet-300/80 dark:border-violet-800'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800'
                }`}
              >
                {forecastClassification.badgeLabel}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {forecastTimestamp.formattedText}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tm.forecastEngineSubtitle}
            </p>
          </div>

          <button
            onClick={() => {
              setTemperatureC(36);
              setGrowthPct(6);
              setSolarPenetration(true);
              setLastRecalculatedAt('Oct 2026 DAPS Baseline');
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors self-start md:self-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-500" />
            <span>{tm.btnResetBaseline}</span>
          </button>
        </div>

        {/* Forecast Horizon & Honest Uncertainty Banner */}
        <div
          data-testid="forecast-uncertainty-disclosure"
          className="px-3.5 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs text-indigo-950 dark:text-indigo-200"
        >
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">{at.forecastHorizonLabel}:</span>{' '}
              <span>{at.forecastHorizon24h}</span>
              <span className="mx-2 text-indigo-300 dark:text-indigo-700">|</span>
              <span className="font-medium">{uncertaintyDisclosure.disclosureText}</span>
            </div>
          </div>
          <span className="self-start lg:self-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/90 dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {uncertaintyDisclosure.badgeText}
          </span>
        </div>

        {/* Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                <span>{tm.labelAmbientTemp}</span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {temperatureC}°C
              </span>
            </div>
            <input
              type="range"
              min="24"
              max="45"
              step="1"
              value={temperatureC}
              onChange={e => {
                const val = Number(e.target.value);
                setTemperatureC(val);
                updateParameterTimestamp(`${val}°C`);
              }}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{tm.tempMildMonsoon}</span>
              <span>{tm.tempNormal}</span>
              <span>{tm.tempHeatwave}</span>
            </div>
          </div>

          {/* Regional Growth Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-500" />
                <span>{tm.labelAnnualLoadTrend}</span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {growthPct > 0 ? `+${growthPct}%` : `${growthPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="25"
              step="1"
              value={growthPct}
              onChange={e => {
                const val = Number(e.target.value);
                setGrowthPct(val);
                updateParameterTimestamp(`${val > 0 ? '+' : ''}${val}%`);
              }}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{tm.growthShutdown}</span>
              <span>{tm.growthStandard}</span>
              <span>{tm.growthFestive}</span>
            </div>
          </div>

          {/* Rooftop Solar Duck-Curve Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {tm.labelDuckCurve}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                {tm.descDuckCurve}
              </span>
            </div>
            <button
              onClick={() => {
                const next = !solarPenetration;
                setSolarPenetration(next);
                updateParameterTimestamp(next ? 'SOLAR ON' : 'SOLAR OFF');
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                solarPenetration ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  solarPenetration ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Forecast Chart & Strategic KPI Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* KPI Strip */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {tm.kpiPredictedPeakDemand}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {at.predicted}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 dark:text-cyan-400 font-mono tabular-nums">
                {peakForecastMw} MW
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {tm.peakAtHourPrefix} {peakItem?.hour || '21:00'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {tm.peakVarianceDesc.replace('{val}', (peakForecastMw - 68.2).toFixed(1))}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {tm.kpiEstimatedEnergyReq}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {at.estimated}
              </span>
            </div>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {totalMUs} MUs
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {tm.descDayAheadSchedule}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {tm.kpiDayAheadBudget}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {at.calculated}
              </span>
            </div>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              ₹{estimatedCostCr} Cr
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {tm.descBaseTariff}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-teal-900/20 border border-teal-500/30 text-xs space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>{tm.dispatcherRecHeading}</span>
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              {temperatureC >= 40
                ? tm.recHeatwave
                : solarPenetration
                ? tm.recSolarInjection
                : tm.recDemandNormal}
            </p>
          </div>
        </div>

        {/* Main Forecast Chart */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {tm.chartForecastCurveTitle}
              </h4>
              <p className="text-xs text-slate-500">
                {tm.chartConfidenceSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-400" /> {tm.legendHistoricalActual} ({at.historicalData})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-600" /> {tm.legendForecastLoad} ({at.predicted})
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={11} tickLine={false} unit=" MW" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101C35',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#FFFFFF'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="transparent"
                  fill="url(#confidenceGrad)"
                  name={tm.chartConfidenceSubtitle}
                />
                <Area
                  type="monotone"
                  dataKey="predictedMw"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fill="url(#forecastGrad)"
                  name={tm.legendForecastLoad}
                />
                <Line
                  type="monotone"
                  dataKey="actualHistorical"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name={tm.legendHistoricalActual}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{at.modelMethodLabel}:</strong> {tm.footerModelType}
              </span>
              <span>{tm.footerDeterministic}</span>
            </div>
            <div className="text-[10px] text-slate-400/90">
              <strong>{at.assumptionsLimitationsLabel}:</strong> {at.forecastAssumptionsSummary}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
