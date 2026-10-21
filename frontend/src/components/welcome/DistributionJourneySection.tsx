import React, { useState } from 'react';
import {
  Zap,
  Radio,
  Sun,
  Home,
  Factory,
  Tractor,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';

export const DistributionJourneySection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(2);

  const steps = [
    {
      id: 0,
      voltage: '400kV / 220kV',
      stage: 'Generation & Evacuation',
      title: 'Power Generation & Green Solar Parks',
      entity: 'GSECL & Charanka Solar Park (Patan)',
      description:
        'Electrical energy is produced at state generating stations and landmark solar parks (such as Charanka Solar Park-1 in Patan district, situated within UGVCL’s geographical territory) stepped up to ultra-high voltages for transmission efficiency.',
      details: [
        'Evacuation via Charanka 400kV/220kV Pooling Station',
        'State Thermal & Renewable Feeders',
        'Interstate & Intrastate Grid Synchronization'
      ]
    },
    {
      id: 1,
      voltage: '220kV / 66kV',
      stage: 'Transmission Grid',
      title: 'High-Voltage Transmission Network',
      entity: 'GETCO (Gujarat Energy Transmission Corp.)',
      description:
        'Bulk power is transported across Northern Gujarat through high-voltage transmission corridors and stepped down at 66kV grid substations to interface with UGVCL distribution boundaries.',
      details: [
        '66kV Transmission Corridors',
        'Overhead Steel Lattice Pylons',
        'Inter-substation Ring Bus Protection'
      ]
    },
    {
      id: 2,
      voltage: '66kV to 11kV',
      stage: 'Primary Substation',
      title: 'UGVCL Primary Distribution Substations',
      entity: 'UGVCL 66kV/11kV Switchyards',
      description:
        'The heart of local electricity supply. 66kV transmission voltage is stepped down to 11kV through 15MVA/20MVA power transformers, monitored by substation engineers with vacuum circuit breakers and lightning arresters.',
      details: [
        '450+ 66kV/11kV Substation Interconnects',
        'Supervisory Feeder Panels & CT/PT Metering',
        'Automated Feeder Breaker Tripping'
      ]
    },
    {
      id: 3,
      voltage: '11kV Medium Tension',
      stage: 'Feeder Segregation',
      title: 'Jyotigram & Agricultural 11kV Feeders',
      entity: '2,400+ Dedicated Feeders',
      description:
        'UGVCL’s celebrated feeder segregation network routes power separately: Jyotigram lines supply 24×7 3-phase domestic electricity to villages, while dedicated AG feeders deliver scheduled daytime power for agricultural tubewells under Kisan Suryodaya Yojana.',
      details: [
        '65,000+ ckt km of 11kV Lines',
        'RDSS Covered Conductors (MVCC) in Forest Corridors',
        'Feeder-Level Energy Accounting'
      ]
    },
    {
      id: 4,
      voltage: '11kV to 415V / 230V',
      stage: 'Step-Down Transformation',
      title: 'Distribution Transformers (DTCs)',
      entity: '1,20,000+ Pole & Plinth Transformers',
      description:
        'Mounted on DP structures across village outskirts, farmlands, and urban neighborhoods, these transformers step down 11kV to 415V (3-phase) and 230V (1-phase) safe consumer voltages.',
      details: [
        '25kVA, 63kVA, 100kVA & 200kVA Ratings',
        'Drop-Out (DO) Fuses & Horn Gap Protection',
        'Continuous Neutral Grounding'
      ]
    },
    {
      id: 5,
      voltage: '415V / 230V',
      stage: 'Consumer Energization',
      title: 'Smart Metering & Consumer Delivery',
      entity: '3.8+ Million Citizens & Enterprises',
      description:
        'Electricity reaches homes (RGPU), commercial establishments (NRGP), agricultural pumps (AG), and industrial consumers with bi-directional smart meters enabling tamper detection and solar net-metering.',
      details: [
        'Residential (230V Single Phase)',
        'Agricultural & Industrial (415V 3-Phase)',
        'Bi-directional Net-Meters for Solar Rooftops'
      ]
    }
  ];

  const currentStep = steps[activeStep];

  return (
    <section id="distribution-journey" className="w-full py-16 sm:py-24 bg-slate-50 dark:bg-[#071329] border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-10 space-y-16 sm:space-y-20">
        {/* Header */}
        <div className="max-w-4xl space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-cyan-400">
            <Radio className="w-4 h-4" />
            <span>Educational Power Grid Engineering</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            The North Gujarat Electricity Journey
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Understand how electrical energy travels from regional generation facilities through high-voltage
            transmission into UGVCL’s 11kV feeders, pole transformers, and into 3.8 million consumer meters.
          </p>
        </div>

        {/* Stepped Interactive Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {steps.map((st) => (
            <button
              key={st.id}
              onClick={() => setActiveStep(st.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                activeStep === st.id
                  ? 'bg-blue-700 text-white border-blue-600 shadow-xl shadow-blue-700/25 scale-102'
                  : 'bg-white dark:bg-[#0E1A33] border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-cyan-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase font-mono ${activeStep === st.id ? 'text-cyan-200' : 'text-slate-400'}`}>
                  Stage 0{st.id + 1}
                </span>
                <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md ${
                  activeStep === st.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {st.voltage.split(' ')[0]}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold line-clamp-1">{st.stage}</p>
            </button>
          ))}
        </div>

        {/* Active Stage Detail Card */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0E1A33] border border-slate-200/90 dark:border-slate-800 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center text-left">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                <span className="px-3 py-1 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-cyan-300 font-mono font-bold border border-blue-200 dark:border-blue-800">
                  {currentStep.voltage}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {currentStep.entity}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentStep.title}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {currentStep.description}
              </p>

              <div className="pt-2 space-y-3">
                <span className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-wider">
                  Key Technical Characteristics & Asset Parameters:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
                  {currentStep.details.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-7 sm:p-8 rounded-2xl bg-slate-50 dark:bg-[#071329] border border-slate-200 dark:border-slate-800 text-left space-y-5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Electrical Architecture Note</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Step-down transformation from 66kV to 11kV occurs within UGVCL substation yards, where power is channeled
                into distinct Jyotigram (domestic) and agriculture feeders to maintain 24x7 rural reliability without
                overloading transformers.
              </p>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-cyan-300 leading-relaxed">
                <strong>Engineering Principle:</strong> Ultra-high voltage transmission minimizes I²R resistive heating losses over expansive geographical distances before primary substation step-down.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
