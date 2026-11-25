import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  CheckCircle2,
  MapPin,
  Users,
  Zap,
  ShieldCheck,
  Phone,
  Globe,
  Award,
  Home,
  ArrowRight,
  Handshake,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export type AboutModalSection = 'overview' | 'network';

interface PresentationAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: AboutModalSection;
}

const UGVCL_CIRCLES = [
  {
    name: 'Mehsana Circle',
    hq: 'Mehsana',
    divisions: 'Mehsana, Visnagar, Kadi, Vijapur, Unjha',
    focus: 'Urban, Industrial GIDC & Agricultural Feeders',
  },
  {
    name: 'Gandhinagar Circle',
    hq: 'Gandhinagar',
    divisions: 'Gandhinagar, Kalol, Dehgam, Mansa',
    focus: 'State Capital Smart Grid & Underground Cabling',
  },
  {
    name: 'Sabarkantha (Himatnagar) Circle',
    hq: 'Himatnagar',
    divisions: 'Himatnagar, Modasa, Idar, Prantij',
    focus: 'Rural 24×7 Jyotigram & Solar Net-Metering',
  },
  {
    name: 'Palanpur (Banaskantha) Circle',
    hq: 'Palanpur',
    divisions: 'Palanpur, Deesa, Tharad, Dhanera',
    focus: 'High-Capacity Agro & Renewable Integration',
  },
  {
    name: 'Patan Circle',
    hq: 'Patan',
    divisions: 'Patan, Sidhpur, Chanasma, Radhanpur',
    focus: 'Heritage Town Reliability & Feeder Automation',
  },
];

export const PresentationAboutModal: React.FC<PresentationAboutModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'overview',
}) => {
  const { dict } = useLanguage();
  const [activeSection, setActiveSection] = useState<AboutModalSection>(initialSection);

  useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dict.modals.aboutModalTitle}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#F4F7FB] border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* UGVCL Homepage-Matched Clean White Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* UGVCL Pylon Logo (Matches TargetHomePage Navbar) */}
            <div className="flex items-center gap-2.5 bg-[#F4F7FB] border border-slate-200/90 rounded-xl px-3 py-1.5 shrink-0">
              <div className="flex flex-col items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-[#0B2545]" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                  <path d="M24 4 L14 44 M24 4 L34 44" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 16 L36 16 M10 26 L38 26 M7 36 L41 36" strokeWidth="2" />
                  <path d="M16 16 L32 26 M32 16 L16 26" strokeWidth="1.5" />
                  <path d="M14 26 L34 36 M34 26 L14 36" strokeWidth="1.5" />
                  <path d="M26 12 L20 22 L27 22 L21 34" stroke="#FF6B00" strokeWidth="2.5" fill="#FF6B00" strokeLinejoin="round" />
                </svg>
                <span className="text-[9px] font-black tracking-widest text-[#0B2545] leading-none mt-0.5">
                  UGVCL
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="leading-tight hidden sm:block">
                <div className="text-sm font-black tracking-tight text-[#0A2540]">UGVCL</div>
                <div className="text-[10px] text-slate-500 font-medium">Powering a Smarter Gujarat</div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-[#0A2540] font-sans truncate">
                  About UGVCL
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0A2540] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                  Govt. of Gujarat Undertaking
                </span>
              </div>
              <p className="text-xs text-slate-500 font-gujarati truncate mt-0.5">
                ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ · Uttar Gujarat Vij Company Limited
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-[#0A2540] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label={dict.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Homepage-Matched Section Switcher */}
        <div className="bg-white/90 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 bg-[#F4F7FB] p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'overview'
                  ? 'bg-[#0A1C3E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0A2540] hover:bg-white'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Corporate Overview &amp; Vision</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('network')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSection === 'network'
                  ? 'bg-[#0A1C3E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0A2540] hover:bg-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Distribution Network &amp; Circles</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            North Gujarat Power Distribution Utility
          </span>
        </div>

        {/* Content Body (Homepage #F4F7FB Surface + White Rounded-2xl Cards) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          {activeSection === 'overview' ? (
            <>
              {/* Vision & Commitment Visual Card (Matches Homepage Card 2) */}
              <div className="relative rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden bg-gradient-to-r from-[#F4F7FB] via-[#EFF4FA] to-[#E6EEF6] p-5 sm:p-6 flex flex-col justify-between min-h-[164px]">
                <div className="relative z-20 max-w-[66%] space-y-2">
                  <div className="inline-flex items-center gap-2 text-[#0A2540]">
                    <Handshake className="w-5 h-5 text-[#FF6B00]" />
                    <span className="text-base sm:text-lg font-black tracking-tight">
                      Corporate Vision &amp; Commitment
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#0A2540]/85 font-medium leading-relaxed">
                    Reliable, customer-centric and technology-driven power distribution across North Gujarat —
                    empowering homes, agriculture, and industry with 24×7 quality electricity.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSection('network')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#042147] hover:bg-[#0A2E58] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <span>Explore Distribution Circles</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-[44%] pointer-events-none select-none hidden sm:block">
                  <img
                    src="/assets/ugvcl/bulb_card_bg.png?v=2"
                    alt="UGVCL Clean Energy Vision"
                    className="w-full h-full object-cover object-center rounded-r-2xl"
                  />
                  <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#EFF4FA] via-[#EFF4FA]/80 to-transparent" />
                </div>
              </div>

              {/* Key UGVCL Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {[
                  { icon: Users, label: 'Consumers Served', value: '89L+' },
                  { icon: MapPin, label: 'Operational Circles', value: '4 Circles' },
                  { icon: Zap, label: 'Power Reliability', value: '24×7 Supply' },
                  { icon: Award, label: 'Digital Billing', value: '99.2% Online' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#0B2545]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-[#0A2540] leading-tight">{stat.value}</div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Institutional Statement */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <span className="font-extrabold text-[#0A2540] text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Building className="w-4 h-4 text-[#FF6B00]" />
                  <span>{dict.modals.aboutStatementTitle}</span>
                </span>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {dict.modals.aboutStatementDesc}
                </p>
              </div>

              {/* Digital Platform Pillars */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0A2540] flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{dict.modals.aboutGovernanceTitle}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  {[
                    { title: dict.modals.aboutScadaTitle, desc: dict.modals.aboutScadaDesc },
                    { title: dict.modals.aboutPaymentsTitle, desc: dict.modals.aboutPaymentsDesc },
                    { title: dict.modals.aboutAiTitle, desc: dict.modals.aboutAiDesc },
                    { title: dict.modals.aboutStorageTitle, desc: dict.modals.aboutStorageDesc },
                  ].map((card, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#F4F7FB]/80 border border-slate-200/80 space-y-1">
                      <span className="font-bold text-[#0A2540] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{card.title}</span>
                      </span>
                      <p className="text-slate-600 leading-relaxed">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Distribution Coverage Hero Card (Matches Homepage Card 3 + Map) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <MapPin className="w-4 h-4 text-[#FF6B00]" />
                    <div>
                      <h4 className="text-sm font-black text-[#0A2540] tracking-tight leading-tight">
                        UGVCL Distribution Network &amp; Circles
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {dict.modals.aboutContextTitle} — Serving North Gujarat with 24×7 reliability
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {dict.modals.aboutContextDesc}
                  </p>

                  <div className="flex flex-wrap items-center gap-5 pt-1">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-[#0A2540] shrink-0" />
                      <div className="leading-tight">
                        <div className="font-extrabold text-[#0A2540] text-sm">4 Circles</div>
                        <div className="text-slate-500 text-[10px] font-medium">22 Divisions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0A2540] shrink-0" />
                      <div className="leading-tight">
                        <div className="font-extrabold text-[#0A2540] text-sm">89L+</div>
                        <div className="text-slate-500 text-[10px] font-medium">Consumers</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#0A2540] shrink-0" />
                      <div className="leading-tight">
                        <div className="font-extrabold text-[#0A2540] text-sm">24×7</div>
                        <div className="text-slate-500 text-[10px] font-medium">Grid Service</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-[130px] sm:w-[150px] shrink-0 flex items-center justify-center bg-[#F4F7FB] rounded-2xl p-3 border border-slate-200/80">
                  <img
                    src="/assets/ugvcl/gujarat_map_exact.png"
                    alt="Gujarat State Coverage Map"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>

              {/* Operational Circles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {UGVCL_CIRCLES.map((circle) => (
                  <div
                    key={circle.name}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#0A2540] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                        <span>{circle.name}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0A2540] text-[10px] font-bold border border-blue-100">
                        HQ: {circle.hq}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      <strong className="text-slate-700">Divisions:</strong> {circle.divisions}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">{circle.focus}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Homepage-Matched Helpline & Notice Strip */}
          <div className="rounded-2xl bg-[#082444] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#FF6B00]" /> 24×7 Toll-Free: 19124 / 1912 / 1800 233 155335
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Globe className="w-3.5 h-3.5 text-sky-400" /> www.ugvcl.com
                </span>
              </div>
              <p className="text-[11px] text-slate-300">{dict.modals.aboutNotice}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-semibold">
            UGVCL · VidyutFlow Digital Utility Portal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#082444] hover:bg-[#0A2E58] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {dict.modals.aboutAcknowledge}
          </button>
        </div>
      </div>
    </div>
  );
};
