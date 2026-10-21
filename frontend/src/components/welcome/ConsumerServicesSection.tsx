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

export const ConsumerServicesSection: React.FC = () => {

  const districts = [
    { name: 'Mehsana', role: 'Corporate HQ & Operating Circle', note: 'Central distribution hub, testing laboratories, and centralized consumer grievance desk' },
    { name: 'Gandhinagar', role: 'Capital & Administrative Circle', note: 'Government secretariats, educational institutions, and smart grid pilot installations' },
    { name: 'Sabarkantha', role: 'Himatnagar Circle', note: 'Agricultural feeder clusters, small and medium enterprises, and rural cottage cooperatives' },
    { name: 'Banaskantha', role: 'Palanpur Circle', note: 'Expansive agro-feeder network, desert border electrification, and dairy processing loads' },
    { name: 'Patan', role: 'Heritage & Solar Circle', note: 'Charanka solar evacuation interface, agricultural tubewells, and cultural landmarks' },
    { name: 'Aravalli', role: 'Tribal & Forest Border Circle', note: 'Sub-transmission lines in undulating terrain and dedicated rural domestic electrification' }
  ];

  const distributionFlow = [
    {
      step: '01',
      voltage: '66kV / 33kV → 11kV',
      title: 'Grid Substation Interconnect',
      description: 'Bulk electrical power stepped down from Gujarat Energy Transmission Corporation (GETCO) transmission network via 15MVA/20MVA power transformers with automated breaker protection.'
    },
    {
      step: '02',
      voltage: '11kV Medium Tension',
      title: 'Segregated Feeder Network',
      description: 'Dedicated 11kV radial feeders route electricity separately: Jyotigram feeders provide 24×7 3-phase power to villages, while agricultural feeders operate scheduled irrigation rosters.'
    },
    {
      step: '03',
      voltage: '11kV → 415V / 230V',
      title: 'Distribution Transformers (DTC)',
      description: 'Over 1.20 lakh pole-mounted and plinth-mounted step-down transformers convert 11kV medium tension to 415V (3-phase) and 230V (1-phase) safe voltages for local neighborhoods.'
    },
    {
      step: '04',
      voltage: '230V (1-Ph) / 415V (3-Ph)',
      title: 'Consumer Delivery & Metering',
      description: 'Low-tension service conductors deliver electricity to domestic, commercial, and agricultural meters, protected by miniature circuit breakers (MCBs) and tamper-evident polycarbonate seals.'
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
            <span>Public Information & Operational Understanding</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Understanding UGVCL
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Powering communities through reliable electricity distribution, consumer awareness, and responsible energy management across Northern Gujarat.
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
                <span>Territory & Distribution Mandate</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Northern Gujarat Distribution Mandate
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                As a wholly-owned operating subsidiary of <strong>Gujarat Urja Vikas Nigam Limited (GUVNL)</strong>,
                Uttar Gujarat Vij Company Limited holds the statutory responsibility for retail electricity distribution
                across 6 northern districts of Gujarat, encompassing over <strong>50,000 square kilometers</strong>.
              </p>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Operating under the regulatory oversight of the <strong>Gujarat Electricity Regulatory Commission (GERC)</strong>,
                UGVCL distributes continuous power to over <strong>3.8 million metered consumers</strong> ranging from
                remote rural homesteads to high-capacity industrial corridors.
              </p>
            </div>

            {/* Corporate Summary Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-900/60 border border-blue-200/70 dark:border-slate-800 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white block">
                Corporate Headquarters & Jurisdiction
              </span>
              <p>
                Corporate Office: Visnagar Road, Mehsana - 384001, Gujarat · CIN: {UGVCL_CORPORATE_PROFILE.cin}
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
                      {d.name} District
                    </h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 dark:bg-blue-950/80 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
                      Discom Circle
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
              <span>Network Engineering Principles</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              How Electricity Travels from Substation to Meter
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal">
              An educational overview illustrating the voltage transformation journey across the North Gujarat distribution grid.
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
              Conceptual educational diagram for consumer understanding. This graphic does not depict real-time operational status or live telemetry.
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
              <span>Public Safety Guidelines</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Consumer Awareness & Electrical Safety
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Vital safety precautions for residential neighborhoods, farmlands, and commercial premises to prevent electrical hazards.
              </p>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Snapped or Sagging Conductors:</strong> Maintain at least a 10-meter clearance from any fallen or low-hanging overhead power line. Keep cattle and children away and notify emergency responders immediately.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Monsoon & Waterlogged Precaution:</strong> Avoid touching metal utility poles, stay wires, or wet meter enclosures during rains. Ensure domestic earthing circuits are tested before monsoon season.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Earth Leakage Protection:</strong> Install residual current devices (RCCB / ELCB) in premise distribution boards to provide automatic tripping during human contact with live wires or internal insulation failure.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Anti-Tampering Compliance:</strong> Unauthorized opening of distribution transformers, meter boxes, or service cables is dangerous and prohibited under Section 135 of the Electricity Act 2003.
                </span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                  24×7 Emergency Hazard Helpline
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-400">
                  Report sparked poles, snapped wires, or transformer fires immediately
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
              <span>Resource Conservation & Solar</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Energy Conservation & Sustainability
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Practical demand-side efficiency measures and clean energy adoption supporting Gujarat’s green grid transition.
              </p>
            </div>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Star-Rated Appliance Efficiency:</strong> Upgrading agricultural pumps and household cooling appliances to BEE 5-Star rated models reduces energy consumption by 20–30% with corresponding bill savings.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Rooftop Solar & Net-Metering:</strong> Under Gujarat’s solar policy framework, consumers can install grid-synchronous rooftop solar photovoltaic systems with bi-directional net-metering to offset electricity bills.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Power Factor Optimization:</strong> Commercial and industrial installations benefit from maintaining power factors near unity (0.95–1.00) using automatic capacitor banks, preventing grid penalties.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <Leaf className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Daytime Agriculture Irrigation:</strong> Aligning agricultural pumping with peak solar hours (under Kisan Suryodaya Yojana) utilizes daytime clean energy and supports overall grid balance.
                </span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Energy Efficiency Tip
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  Switching to LED lighting and variable-speed fan motors lowers domestic lighting load by up to 60%.
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
