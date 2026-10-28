import React from 'react';
import {
  Building2,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Sun,
  CheckCircle2,
  PhoneCall,
  ArrowRight,
  Info,
  Leaf,
  Layers,
  Activity
} from 'lucide-react';
import { ElectricityBillEstimator } from './ElectricityBillEstimator';
import { UGVCL_CORPORATE_PROFILE } from '../../data/ugvclHistoryData';
import { useLanguage } from '../../i18n/LanguageContext';

export const ConsumerServicesSection: React.FC = () => {
  const { dict } = useLanguage();

  const districts = [
    { name: 'Mehsana', role: dict.services.districtMehsanaRole, note: dict.services.districtMehsanaNote },
    { name: 'Gandhinagar', role: dict.services.districtGandhinagarRole, note: dict.services.districtGandhinagarNote },
    { name: 'Sabarkantha', role: dict.services.districtSabarkanthaRole, note: dict.services.districtSabarkanthaNote },
    { name: 'Banaskantha', role: dict.services.districtBanaskanthaRole, note: dict.services.districtBanaskanthaNote },
    { name: 'Patan', role: dict.services.districtPatanRole, note: dict.services.districtPatanNote },
    { name: 'Aravalli', role: dict.services.districtAravalliRole, note: dict.services.districtAravalliNote }
  ];

  const distributionFlow = [
    {
      step: '01',
      voltage: '66kV / 33kV → 11kV',
      title: dict.services.flowStep1Title,
      description: dict.services.flowStep1Desc
    },
    {
      step: '02',
      voltage: '11kV Medium Tension',
      title: dict.services.flowStep2Title,
      description: dict.services.flowStep2Desc
    },
    {
      step: '03',
      voltage: '11kV → 415V / 230V',
      title: dict.services.flowStep3Title,
      description: dict.services.flowStep3Desc
    },
    {
      step: '04',
      voltage: '230V (1-Ph) / 415V (3-Ph)',
      title: dict.services.flowStep4Title,
      description: dict.services.flowStep4Desc
    }
  ];

  return (
    <section
      id="understanding-ugvcl"
      className="w-full py-16 sm:py-24 bg-slate-50 dark:bg-[#071329] border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      {/* Backwards-compatible anchor alias for old links */}
      <span id="consumer-services" className="relative -top-24 block invisible" />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 space-y-16 sm:space-y-20">
        {/* ================================================================= */}
        {/* SECTION HEADER                                                    */}
        {/* ================================================================= */}
        <div className="max-w-4xl space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
            <Building2 className="w-4 h-4" />
            <span>{dict.services.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {dict.services.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {dict.services.subtitle}
          </p>
        </div>

        {/* ================================================================= */}
        {/* 1. UGVCL SERVICE TERRITORY & JURISDICTION (Editorial Split)       */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch text-left">
          {/* Left: Territory Narrative Panel */}
          <div className="lg:col-span-5 p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
                <MapPin className="w-4 h-4" />
                <span>{dict.services.territoryMandate}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {dict.services.mandateHeading}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {dict.services.mandateP1}
              </p>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {dict.services.mandateP2}
              </p>
            </div>

            {/* Corporate Summary Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-900/60 border border-blue-200/70 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block">
                {dict.services.hqJurisdiction}
              </span>
              <p>
                {dict.services.corporateOfficeText}
              </p>
            </div>
          </div>

          {/* Right: 6 Administrative Districts Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {districts.map((d) => (
              <div
                key={d.name}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-2 text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {d.name} {dict.services.districtSuffix}
                    </h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
                      {dict.services.discomCircle}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-cyan-400 block mb-1">
                    {d.role}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {d.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. ELECTRICITY DISTRIBUTION NETWORK (Educational Visual Flow)     */}
        {/* ================================================================= */}
        <div className="space-y-8 text-left">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
              <Activity className="w-4 h-4" />
              <span>{dict.services.networkTag}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {dict.services.networkTitle}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal">
              {dict.services.networkSubtitle}
            </p>
          </div>

          {/* 4-Step Progressive Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {distributionFlow.map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4 text-left group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-blue-700 dark:text-cyan-400">
                      {item.step}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {item.voltage}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
            <span>
              {dict.services.flowDiagramFootnote}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. CONSUMER AWARENESS & ELECTRICAL SAFETY                         */}
        {/* 4. ENERGY CONSERVATION & SUSTAINABILITY                           */}
        {/* (Two Balanced Educational Panels)                                */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* Panel A: Electrical Safety & Hazard Prevention */}
          <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{dict.services.safetyTag}</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {dict.services.safetyTitle}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {dict.services.safetySubtitle}
              </p>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.safetyItem1Title} </strong>{dict.services.safetyItem1Text}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.safetyItem2Title} </strong>{dict.services.safetyItem2Text}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.safetyItem3Title} </strong>{dict.services.safetyItem3Text}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.safetyItem4Title} </strong>{dict.services.safetyItem4Text}
                </span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                  {dict.services.safetyHelplineTag}
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-400">
                  {dict.services.safetyHelplineSub}
                </span>
              </div>
              <a
                href="tel:19122"
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>19122</span>
              </a>
            </div>
          </div>

          {/* Panel B: Energy Conservation & Sustainability */}
          <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-4 h-4" />
              <span>{dict.services.conservationTag}</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {dict.services.conservationTitle}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {dict.services.conservationSubtitle}
              </p>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.conservationItem1Title} </strong>{dict.services.conservationItem1Text}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.conservationItem2Title} </strong>{dict.services.conservationItem2Text}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.conservationItem3Title} </strong>{dict.services.conservationItem3Text}
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Leaf className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>{dict.services.conservationItem4Title} </strong>{dict.services.conservationItem4Text}
                </span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  {dict.services.conservationTipTag}
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  {dict.services.conservationTipSub}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 5. GERC APPROVED TARIFF SCHEDULE & ELECTRICITY BILL ESTIMATOR      */}
        {/* ================================================================= */}
        <ElectricityBillEstimator />
      </div>
    </section>
  );
};
