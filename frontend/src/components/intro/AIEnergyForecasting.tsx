import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Thermometer,
  Percent,
  Sliders,
  Zap,
  Info,
  Clock,
  ArrowRight,
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
  CartesianGrid,
  Legend
} from 'recharts';

export const AIEnergyForecasting: React.FC = () => {
  const [temperatureC, setTemperatureC] = useState<number>(36);
  const [growthPct, setGrowthPct] = useState<number>(6);
  const [solarPenetration, setSolarPenetration] = useState<boolean>(true);

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
      const adjustedPredicted = Math.round(
        (pt.baseMw * tempMultiplier * growthMultiplier - solarDeduction) * 10
      ) / 10;

      // Confidence upper and lower bounds (±4.5%)
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
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                AI Energy Demand & Load Forecasting Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Machine-learning load projection for Day-Ahead Power Scheduling (DAPS). Adjust ambient meteorological conditions and industrial load growth to view real-time grid curve recalculation.
            </p>
          </div>

          <button
            onClick={() => {
              setTemperatureC(36);
              setGrowthPct(6);
              setSolarPenetration(true);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors self-start md:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-500" />
            <span>Reset Baseline</span>
          </button>
        </div>

        {/* Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                <span>Ambient Temperature</span>
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
              onChange={e => setTemperatureC(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>24°C (Mild Monsoon)</span>
              <span>36°C (Normal)</span>
              <span>45°C (Heatwave)</span>
            </div>
          </div>

          {/* Regional Growth Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-blue-500" />
                <span>Annual Load Trend Factor</span>
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
              onChange={e => setGrowthPct(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>-10% (Industrial Shutdown)</span>
              <span>+6% (Standard)</span>
              <span>+25% (Peak Festive)</span>
            </div>
          </div>

          {/* Rooftop Solar Duck-Curve Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Rooftop Solar Offset (Duck Curve)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Simulates 7.4 MW midday solar shaving
              </span>
            </div>
            <button
              onClick={() => setSolarPenetration(!solarPenetration)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Predicted 24h Peak Demand
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 dark:text-cyan-400 font-mono tabular-nums">
                {peakForecastMw} MW
              </span>
              <span className="text-xs text-slate-500 font-mono">
                at {peakItem?.hour || '21:00'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Baseline was 68.2 MW (+{(peakForecastMw - 68.2).toFixed(1)} MW variance)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Estimated Energy Requirement
            </span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {totalMUs} MUs
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Day-Ahead Procurement Schedule
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Day-Ahead Power Purchase Budget
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              ₹{estimatedCostCr} Cr
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Calculated at ₹5.42/kWh base tariff
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-teal-900/20 border border-teal-500/30 text-xs space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Dispatcher Recommendation</span>
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              {temperatureC >= 40
                ? 'Severe heatwave alert. Pre-book 15 MW day-ahead reserve from Sardar Sarovar hydro peaking station for 20:00 - 23:00 window.'
                : solarPenetration
                ? 'Midday solar injection shaves 7.4 MW off substation peak. Ramp thermal units down by 11% between 11:00 - 15:00 to avoid curtailment.'
                : 'Demand profile normal. Contracted GUVNL base thermal PPA satisfies 94% of scheduled draw without spot market exposure.'}
            </p>
          </div>
        </div>

        {/* Main Forecast Chart */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Next 24-Hour Load Curve: Historical Actual vs AI Forecast
              </h4>
              <p className="text-xs text-slate-500">
                Shaded envelope displays 95% statistical confidence interval (±4.5%)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-400" /> Historical Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-600" /> AI Forecast (MW)
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
                  name="Upper Bound (95%)"
                />
                <Area
                  type="monotone"
                  dataKey="predictedMw"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fill="url(#forecastGrad)"
                  name="Forecast Load (MW)"
                />
                <Line
                  type="monotone"
                  dataKey="actualHistorical"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Historical Baseline (MW)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Model Type:</strong> Gradient Boosted Regression Tree (GBRT) + Temperature Decomposition
            </span>
            <span>
              Deterministic simulation for operational evaluation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
