import React, { useState, useId } from 'react';
import {
  FileText,
  Info,
  Sun,
  TrendingDown,
  Printer,
  RotateCcw,
  Home,
  Building2,
  Building,
  ShieldCheck,
  Sliders,
  Check,
  Plus,
  Minus,
  Sparkles
} from 'lucide-react';
import {
  BillingCycle,
  ConnectionPhase,
  TariffCategoryId,
  UGVCL_TARIFF_CATEGORIES,
  GERC_TARIFF_METADATA,
  calculateDetailedUgvclBill
} from '../../data/ugvclTariffSchedule';
import { useApp } from '../../context/AppContext';

export const ElectricityBillEstimator: React.FC = () => {
  const { showToast } = useApp();

  // State
  const [calcUnits, setCalcUnits] = useState<number>(220);
  const [calcCategory, setCalcCategory] = useState<TariffCategoryId>('RGP_URBAN');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('bimonthly');
  const [sanctionedLoad, setSanctionedLoad] = useState<number>(2);
  const [phase, setPhase] = useState<ConnectionPhase>('1-Phase');
  const [activeTab, setActiveTab] = useState<'slabs' | 'fpppa' | 'solar' | 'notes'>('slabs');

  const unitsInputId = useId();
  const loadInputId = useId();

  // Calculation engine (Strictly preserved)
  const calculation = calculateDetailedUgvclBill(
    calcUnits,
    calcCategory,
    billingCycle,
    sanctionedLoad,
    phase
  );

  const selectedCategoryConfig = UGVCL_TARIFF_CATEGORIES[calcCategory];

  // Quick demonstration presets
  const presets = [
    { label: 'Lifeline (60 kWh)', units: 60, cat: 'RGP_URBAN' as TariffCategoryId },
    { label: 'Small Family (180 kWh)', units: 180, cat: 'RGP_URBAN' as TariffCategoryId },
    { label: 'Standard Home (320 kWh)', units: 320, cat: 'RGP_URBAN' as TariffCategoryId },
    { label: 'High Domestic / AC (620 kWh)', units: 620, cat: 'RGP_URBAN' as TariffCategoryId },
    { label: 'Commercial Shop (350 kWh)', units: 350, cat: 'NRGP' as TariffCategoryId },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setCalcUnits(220);
    setCalcCategory('RGP_URBAN');
    setBillingCycle('bimonthly');
    setSanctionedLoad(2);
    setPhase('1-Phase');
    showToast('Tariff calculator reset to default residential parameters.', 'info');
  };

  // Stepper handlers for contracted load
  const incrementLoad = () => {
    setSanctionedLoad((prev) => Math.min(50, prev + 1));
  };

  const decrementLoad = () => {
    setSanctionedLoad((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="w-full bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden text-left transition-colors">
      
      {/* =================================================================== */}
      {/* 1. INSTITUTIONAL HEADER WITH AUTHENTIC UGVCL IDENTITY               */}
      {/* =================================================================== */}
      <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-[#071329] via-[#0d2146] to-[#071329] text-white border-b border-blue-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Authentic UGVCL Logo & Corporate Title */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Authentic Logo Asset */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-1 shadow-md border border-slate-200/40 flex items-center justify-center shrink-0">
              <img
                src="/assets/ugvcl-logo.png"
                alt="Uttar Gujarat Vij Company Limited (UGVCL) Official Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#c2185b] text-white font-mono shadow-2xs">
                  UGVCL Tariff Schedule
                </span>
                <span className="text-xs font-mono text-slate-300">
                  GERC Order Case No. 2289/2024
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden xl:inline">
                  · CIN: U40102GJ2003SGC042906
                </span>
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                  Electricity Bill Estimator & Tariff Analyzer
                </h3>
                <span className="text-xs text-slate-300 font-gujarati hidden sm:inline">
                  વીજળી બિલ ગણતરી પત્રક
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                Educational tariff awareness tool based on prevailing Gujarat Electricity Regulatory Commission directives
              </p>
            </div>
          </div>

          {/* Right: Actions (Reset, Print) & Independent Platform Note */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 shrink-0 self-start md:self-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                title="Reset inputs to defaults"
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                title="Print or Save Estimation as PDF"
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Print Estimate</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-medium block md:text-right">
              VidyutOne ERP Demo · Independent System
            </span>
          </div>

        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. MAIN TWO-COLUMN BALANCED WORKSPACE                                */}
      {/* =================================================================== */}
      <div className="p-5 sm:p-7 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================================================================= */}
        {/* LEFT COLUMN: PARAMETER SELECTION & TABS (7 COLUMNS)               */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. TARIFF CATEGORY SELECTOR */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <span>1. Select Tariff Category</span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                5 Discom Categories
              </span>
            </div>

            {/* 5 Equal-Height Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {(
                [
                  {
                    id: 'RGP_URBAN' as TariffCategoryId,
                    code: 'RGPU',
                    primaryName: 'Residential Urban',
                    gujaratiName: 'રહેણાંક શહેરી',
                    icon: Home,
                    badge: 'Standard'
                  },
                  {
                    id: 'RGP_RURAL' as TariffCategoryId,
                    code: 'RGP-R',
                    primaryName: 'Residential Rural',
                    gujaratiName: 'રહેણાંક ગ્રામ્ય',
                    icon: Home,
                    badge: 'Subsidized'
                  },
                  {
                    id: 'BPL' as TariffCategoryId,
                    code: 'BPL',
                    primaryName: 'BPL Lifeline',
                    gujaratiName: 'ગરીબી રેખા હેઠળ',
                    icon: ShieldCheck,
                    badge: '₹1.50/u'
                  },
                  {
                    id: 'NRGP' as TariffCategoryId,
                    code: 'NRGP',
                    primaryName: 'Commercial',
                    gujaratiName: 'વાણિજ્યિક હેતુ',
                    icon: Building2,
                    badge: 'Shops & Offices'
                  },
                  {
                    id: 'GLP' as TariffCategoryId,
                    code: 'GLP',
                    primaryName: 'Institutional',
                    gujaratiName: 'સામાજિક સંસ્થાઓ',
                    icon: Building,
                    badge: '₹4.05 Flat'
                  },
                ]
              ).map((cat) => {
                const isSelected = calcCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCalcCategory(cat.id)}
                    className={`h-full min-h-[102px] flex flex-col justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/90 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Code Badge & Icon */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-blue-600 text-white dark:bg-blue-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cat.code}
                      </span>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'
                        }`}
                      />
                    </div>

                    {/* Middle: Title */}
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {cat.primaryName}
                      </div>
                      <div className="text-[11px] font-gujarati text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {cat.gujaratiName}
                      </div>
                    </div>

                    {/* Bottom: Subtle Badge */}
                    <div className="pt-1.5 mt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
                        {cat.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Category Description Banner */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {selectedCategoryConfig.name} ({selectedCategoryConfig.code})
                </strong>
                : {selectedCategoryConfig.targetAudience}
              </div>
            </div>
          </div>

          {/* 2. SUPPLY PARAMETERS (CYCLE, PHASE, CONTRACTED LOAD) */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
              2. Supply Connection Parameters
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              
              {/* Billing Cycle */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Billing Cycle
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {billingCycle === 'bimonthly' ? '60 Days' : '30 Days'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl h-11 items-center">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('bimonthly')}
                    className={`h-full text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center ${
                      billingCycle === 'bimonthly'
                        ? 'bg-white dark:bg-[#0B1528] text-blue-700 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Bi-Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`h-full text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center ${
                      billingCycle === 'monthly'
                        ? 'bg-white dark:bg-[#0B1528] text-blue-700 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Supply Phase */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Supply Voltage
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {phase === '1-Phase' ? '230V' : '415V'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl h-11 items-center">
                  <button
                    type="button"
                    onClick={() => setPhase('1-Phase')}
                    className={`h-full text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center ${
                      phase === '1-Phase'
                        ? 'bg-white dark:bg-[#0B1528] text-blue-700 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    1-Phase
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('3-Phase')}
                    className={`h-full text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center ${
                      phase === '3-Phase'
                        ? 'bg-white dark:bg-[#0B1528] text-blue-700 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    3-Phase
                  </button>
                </div>
              </div>

              {/* Contracted Load with Stepper */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor={loadInputId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Contracted Load
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Sanctioned
                  </span>
                </div>
                <div className="flex items-center h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={decrementLoad}
                    aria-label="Decrease contracted load by 1 kW"
                    className="w-9 h-full rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 flex items-center justify-center px-1">
                    <input
                      id={loadInputId}
                      type="number"
                      min="1"
                      max="50"
                      value={sanctionedLoad}
                      onChange={(e) => setSanctionedLoad(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                      className="w-12 text-center font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none"
                    />
                    <span className="font-mono text-xs font-semibold text-slate-500">kW</span>
                  </div>
                  <button
                    type="button"
                    onClick={incrementLoad}
                    aria-label="Increase contracted load by 1 kW"
                    className="w-9 h-full rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 3. UNITS CONSUMPTION (SLIDER + NUMERIC INPUT + PRESETS) */}
          <div className="space-y-3.5 p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor={unitsInputId}
                  className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block"
                >
                  3. Electricity Consumption ({billingCycle === 'bimonthly' ? 'Bi-Monthly / 60 Days' : 'Monthly / 30 Days'})
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Enter or slide to your expected energy usage during the billing cycle
                </span>
              </div>

              {/* High-visibility numerical readout */}
              <div className="flex items-center gap-2 bg-white dark:bg-[#0B1528] px-4 py-2 rounded-xl border-2 border-blue-600/40 dark:border-cyan-500/40 shadow-sm shrink-0 self-start sm:self-auto">
                <input
                  id={unitsInputId}
                  type="number"
                  min="0"
                  max="3000"
                  value={calcUnits}
                  onChange={(e) => setCalcUnits(Math.max(0, Math.min(3000, Number(e.target.value) || 0)))}
                  className="w-24 text-right font-mono text-xl sm:text-2xl font-black text-blue-700 dark:text-cyan-400 bg-transparent focus:outline-none tabular-nums"
                />
                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  kWh / Units
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="0"
                max={billingCycle === 'bimonthly' ? 1200 : 600}
                step="10"
                value={calcUnits}
                onChange={(e) => setCalcUnits(Number(e.target.value))}
                aria-label="Electricity consumption units slider"
                className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>0 units</span>
                <span>{billingCycle === 'bimonthly' ? '300 units' : '150 units'}</span>
                <span>{billingCycle === 'bimonthly' ? '600 units' : '300 units'}</span>
                <span>{billingCycle === 'bimonthly' ? '1200+ units' : '600+ units'}</span>
              </div>
            </div>

            {/* Quick Demonstration Presets */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-2">
                Quick Scenario Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCalcUnits(p.units);
                      setCalcCategory(p.cat);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                      calcUnits === p.units && calcCategory === p.cat
                        ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 shadow-2xs font-semibold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-cyan-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. TARIFF SLABS & EXPLANATORY TABS */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('slabs')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'slabs'
                    ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Slab Rate Breakdown
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fpppa')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'fpppa'
                    ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                FPPPA Formula
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('solar')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'solar'
                    ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Solar Rooftop Impact
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'notes'
                    ? 'bg-blue-600 text-white dark:bg-blue-500 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Statutory Notes
              </button>
            </div>

            {/* TAB 1: SLAB RATE TABLE */}
            {activeTab === 'slabs' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span className="w-2/5">Slab Tier ({billingCycle === 'bimonthly' ? '60d' : '30d'})</span>
                  <span className="w-1/5 text-center">GERC Rate</span>
                  <span className="w-1/5 text-center">Active Units</span>
                  <span className="w-1/5 text-right">Subtotal</span>
                </div>

                <div className="space-y-1.5">
                  {calculation.slabBreakdown.map((item, index) => {
                    const isActive = item.unitsInSlab > 0;
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between py-2 px-3 rounded-xl font-mono text-xs sm:text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 font-bold text-slate-900 dark:text-white'
                            : 'text-slate-400 dark:text-slate-500 font-normal'
                        }`}
                      >
                        <span className="w-2/5 flex items-center gap-1.5 truncate">
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />}
                          <span>{item.label}</span>
                        </span>
                        <span className="w-1/5 text-center text-blue-700 dark:text-cyan-400">
                          ₹{item.ratePerUnit.toFixed(2)}/u
                        </span>
                        <span className="w-1/5 text-center tabular-nums">
                          {item.unitsInSlab} u
                        </span>
                        <span className="w-1/5 text-right tabular-nums font-bold">
                          ₹{item.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Table Summary Footer */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Total Base Energy Charge:</span>
                  <span className="font-mono text-sm text-blue-700 dark:text-cyan-400 font-bold tabular-nums">
                    ₹{calculation.totalEnergyCharges.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: FPPPA FORMULA EXPLAINER */}
            {activeTab === 'fpppa' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400 font-bold">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Fuel & Power Purchase Price Adjustment (FPPPA) Formula</span>
                </div>
                <p className="leading-relaxed">
                  FPPPA is a statutory quarterly surcharge determined by GERC under Section 62 of the Electricity Act, 2003. It reimburses DISCOMs for actual variations in global coal/gas prices and inter-state transmission tariffs incurred by Gujarat Urja Vikas Nigam Limited (GUVNL).
                </p>
                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-300/60 dark:border-amber-800/40 font-mono text-xs text-amber-950 dark:text-amber-300 space-y-1">
                  <div>
                    Applicable GERC Base Rate: <strong>₹2.45 per kWh</strong> (Relief order in force).
                  </div>
                  <div>
                    Surcharge Formula: {calcUnits} units × ₹2.45 = <strong>₹{calculation.fpppaCharges.amount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SOLAR ROOFTOP IMPACT */}
            {activeTab === 'solar' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-400 font-bold">
                    <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Surya Gujarat / PM Surya Ghar Net-Metering</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono">
                    High North Gujarat Insolation
                  </span>
                </div>
                <p className="leading-relaxed">
                  Grid-interactive solar net-metering offsets your highest consumption slab first (saving the ₹5.20/kWh tier + ₹2.45 FPPPA + Electricity Duty).
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-sans">Recommended Size</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {calculation.solarRooftopEstimate.recommendedKw} kWp
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-sans">Bi-Monthly Yield</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                      ~{calculation.solarRooftopEstimate.estimatedGenerationKwh} kWh
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-sans">Estimated Savings</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{calculation.solarRooftopEstimate.estimatedBiMonthlySavingsInr.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: STATUTORY NOTES */}
            {activeTab === 'notes' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">Official Discom Regulatory Notes:</span>
                <ul className="list-disc list-inside space-y-1.5 text-xs leading-relaxed">
                  {selectedCategoryConfig.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                  <li>
                    Tariff Schedule: {GERC_TARIFF_METADATA.tariffOrderRef}.
                  </li>
                  <li>
                    Duty Framework: {selectedCategoryConfig.electricityDutyDescription}.
                  </li>
                </ul>
              </div>
            )}
          </div>

        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: ITEMIZED BILL BREAKDOWN (5 COLUMNS, NATURAL HEIGHT) */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* CARD 1: NET ESTIMATED BILL HERO CARD (SPOTLIGHT AT TOP) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#071329] via-[#0b1b3a] to-[#071329] text-white border border-blue-900/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                Net Estimated Electricity Bill
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-600/60 text-blue-100">
                {billingCycle === 'bimonthly' ? '60-Day Billing' : '30-Day Billing'}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tabular-nums tracking-tight">
                ₹{calculation.netPayableAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-right">
                <span className="text-xs text-blue-200 block font-mono">
                  Effective ₹{calculation.averageRatePerKwh}/kWh
                </span>
                <span className="text-[11px] text-slate-300 block">
                  All Statutory Charges Included
                </span>
              </div>
            </div>

            <p className="text-[11px] text-blue-200/80 border-t border-white/10 pt-2 leading-relaxed">
              Based on {calcUnits} kWh consumption under {selectedCategoryConfig.code} tariff schedule.
            </p>
          </div>

          {/* CARD 2: STRUCTURED ITEMIZED CHARGES */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#071329] border border-slate-200/90 dark:border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Itemized Statutory Assessment
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                GERC Format
              </span>
            </div>

            {/* Line items */}
            <div className="space-y-3 text-xs sm:text-sm">
              
              {/* Energy Charges */}
              <div className="flex justify-between items-start text-slate-700 dark:text-slate-300">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Energy Charges (Slab Total)
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    {calculation.slabBreakdown.filter((s) => s.unitsInSlab > 0).length} active consumption tier(s)
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  ₹{calculation.totalEnergyCharges.toFixed(2)}
                </span>
              </div>

              {/* Fixed / Demand Charges */}
              <div className="flex justify-between items-start text-slate-700 dark:text-slate-300">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Fixed / Demand Charges
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    {calculation.fixedCharges.description}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  ₹{calculation.fixedCharges.amount.toFixed(2)}
                </span>
              </div>

              {/* FPPPA Surcharge */}
              <div className="flex justify-between items-start text-slate-700 dark:text-slate-300">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    <span>FPPPA Surcharge</span>
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                      (@ ₹{calculation.fpppaCharges.ratePerUnit.toFixed(2)}/u)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Fuel & Power Purchase Adjustment ({calcUnits} units)
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  ₹{calculation.fpppaCharges.amount.toFixed(2)}
                </span>
              </div>

              {/* Assessable Subtotal Separator */}
              <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                <span>Assessable Subtotal:</span>
                <span className="font-mono font-bold tabular-nums">
                  ₹{calculation.subtotalBeforeDuty.toFixed(2)}
                </span>
              </div>

              {/* Electricity Duty */}
              <div className="flex justify-between items-start text-slate-700 dark:text-slate-300">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                    <span>Govt. Electricity Duty</span>
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-cyan-400">
                      ({calculation.electricityDuty.percentage}%)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    Levied under Gujarat Electricity Duty Act, 1958
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  ₹{calculation.electricityDuty.amount.toFixed(2)}
                </span>
              </div>

            </div>

          </div>

          {/* CARD 3: ENERGY CONSERVATION ADVANTAGE (IF IN HIGH BRACKET) */}
          {calculation.conservationSavings && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Conservation Advantage:</span>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  {calculation.conservationSavings.tip}
                </p>
              </div>
            </div>
          )}

          {/* CARD 4: REGULATORY CITATIONS & EDUCATIONAL DISCLOSURE */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => showToast('GERC Tariff Order FY 2025-26 tariff book opened for reference.', 'info')}
                className="text-xs font-bold text-blue-700 dark:text-cyan-400 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>GERC Discom Tariff Order (PDF)</span>
              </button>

              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                FY 2025-26 / 2026-27
              </span>
            </div>

            <div className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed pt-2 border-t border-slate-200 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                Educational Information Disclosure:
              </strong>
              This calculator is an educational consumer guidance utility provided by VidyutOne based on prevailing GERC tariff regulations. Official consumer bills issued by UGVCL reflect sealed meter readings, actual power factor parameters, approved subsidies, and official ledger adjustments. To view official metered ledgers or settle active bills, please log in through the secure portal.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
