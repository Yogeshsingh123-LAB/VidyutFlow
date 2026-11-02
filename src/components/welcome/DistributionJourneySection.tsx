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

import { useLanguage } from '../../i18n/LanguageContext';

export const DistributionJourneySection: React.FC = () => {
  const { dict } = useLanguage();
  const [activeStep, setActiveStep] = useState<number>(2);

  const steps = [
    {
      id: 0,
      voltage: '400kV / 220kV',
      stage: dict.journey.step0Stage,
      title: dict.journey.step0Title,
      entity: dict.journey.step0Entity,
      description: dict.journey.step0Desc,
      details: [
        dict.journey.step0Detail1,
        dict.journey.step0Detail2,
        dict.journey.step0Detail3
      ]
    },
    {
      id: 1,
      voltage: '220kV / 66kV',
      stage: dict.journey.step1Stage,
      title: dict.journey.step1Title,
      entity: dict.journey.step1Entity,
      description: dict.journey.step1Desc,
      details: [
        dict.journey.step1Detail1,
        dict.journey.step1Detail2,
        dict.journey.step1Detail3
      ]
    },
    {
      id: 2,
      voltage: '66kV to 11kV',
      stage: dict.journey.step2Stage,
      title: dict.journey.step2Title,
      entity: dict.journey.step2Entity,
      description: dict.journey.step2Desc,
      details: [
        dict.journey.step2Detail1,
        dict.journey.step2Detail2,
        dict.journey.step2Detail3
      ]
    },
    {
      id: 3,
      voltage: '11kV Medium Tension',
      stage: dict.journey.step3Stage,
      title: dict.journey.step3Title,
      entity: dict.journey.step3Entity,
      description: dict.journey.step3Desc,
      details: [
        dict.journey.step3Detail1,
        dict.journey.step3Detail2,
        dict.journey.step3Detail3
      ]
    },
    {
      id: 4,
      voltage: '11kV to 415V / 230V',
      stage: dict.journey.step4Stage,
      title: dict.journey.step4Title,
      entity: dict.journey.step4Entity,
      description: dict.journey.step4Desc,
      details: [
        dict.journey.step4Detail1,
        dict.journey.step4Detail2,
        dict.journey.step4Detail3
      ]
    },
    {
      id: 5,
      voltage: '415V / 230V',
      stage: dict.journey.step5Stage,
      title: dict.journey.step5Title,
      entity: dict.journey.step5Entity,
      description: dict.journey.step5Desc,
      details: [
        dict.journey.step5Detail1,
        dict.journey.step5Detail2,
        dict.journey.step5Detail3
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
            <span>{dict.journey.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {dict.journey.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {dict.journey.subtitle}
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
                  {dict.journey.stageLabel} 0{st.id + 1}
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
                  {dict.journey.keyParams}
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
                <span>{dict.journey.archNoteTitle}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {dict.journey.archNoteDesc}
              </p>
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-cyan-300 leading-relaxed">
                <strong>{dict.journey.engPrincipleTitle} </strong>{dict.journey.engPrincipleDesc}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
