import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import { HOME_PAGE_COPY } from './homePageTranslations';
import {
  Phone,
  Mail,
  Home,
  ChevronDown,
  User,
  Zap,
  ShieldCheck,
  Clock,
  FileText,
  CreditCard,
  Gauge,
  MessageSquare,
  MapPin,
  Headphones,
  ArrowRight,
  Megaphone,
  Handshake,
  Users,
  Building,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Check,
  X,
  CheckCircle2,
  Calendar,
  HelpCircle,
  Search
} from 'lucide-react';

interface TargetHomePageProps {
  onOpenAboutModal: (section?: 'overview' | 'network') => void;
}

export const TargetHomePage: React.FC<TargetHomePageProps> = ({ onOpenAboutModal }) => {
  const {
    setRole,
    setActiveTab,
    setHasEnteredPlatform,
    setIsRoleSwitcherModalOpen,
    showToast,
    demoSession
  } = useApp();
  const { language, setLanguage } = useLanguage();
  const copy = HOME_PAGE_COPY[language] || HOME_PAGE_COPY.en;

  // Accessibility Font Scaling: 'sm' | 'normal' | 'lg'
  const [fontSizeScale, setFontSizeScale] = useState<'sm' | 'normal' | 'lg'>('normal');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isAboutMenuOpen, setIsAboutMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [qaSearch, setQaSearch] = useState('');
  const [qaCategory, setQaCategory] = useState<'All' | 'New Connection' | 'Billing & UPI' | 'Meter Reading' | 'Outages & Support'>('All');
  const [openQaIndex, setOpenQaIndex] = useState<number | null>(0);

  // Live dynamic clock state
  const [timeString, setTimeString] = useState('Monday, 27 Oct 2025 | 08:15 AM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const optionsDate: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      };
      const optionsTime: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const dStr = now.toLocaleDateString('en-GB', optionsDate);
      const tStr = now.toLocaleTimeString('en-US', optionsTime);
      setTimeString(`${dStr} | ${tStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const goToConsumer = (tab: string) => {
    if (demoSession && demoSession.role === 'consumer') {
      setRole('consumer');
      setActiveTab(tab);
      setHasEnteredPlatform(true);
    } else {
      setActiveTab(tab);
      setIsRoleSwitcherModalOpen(true);
      showToast('Please sign in to access electricity self-service features.', 'info');
    }
  };

  const openSignInModal = () => {
    setIsRoleSwitcherModalOpen(true);
  };

  const languages: { code: LanguageCode; name: string; native: string }[] = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' }
  ];

  const currentLangLabel = languages.find(l => l.code === language)?.native || 'English';

  return (
    <div
      className={`min-h-screen bg-[#F4F7FB] text-slate-800 flex flex-col antialiased selection:bg-[#FF6B00] selection:text-white ${
        fontSizeScale === 'sm' ? 'text-[13px]' : fontSizeScale === 'lg' ? 'text-[15px]' : 'text-sm'
      }`}
    >
      {/* =========================================================================
          1. TOP UTILITY BAR (Deep Navy)
         ========================================================================= */}
      <div className="bg-[#07162C] text-slate-300 text-xs px-4 sm:px-6 lg:px-10 py-1.5 border-b border-blue-950/60">
        <div className="max-w-[1580px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Left contact & identity info */}
          <div className="flex items-center gap-3 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 fill-cyan-400" />
              <span>{copy.topUtilityOrg}</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href="tel:19124"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{copy.helplineTop}</span>
            </a>
            <span className="text-slate-600 hidden md:inline">|</span>
            <a
              href="mailto:support@ugvcl.com"
              className="hidden md:flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span>support@ugvcl.com</span>
            </a>
          </div>

          {/* Right dynamic time & font controls */}
          <div className="flex items-center gap-3 text-[11px] sm:text-xs shrink-0">
            <span className="text-slate-300 font-medium tabular-nums hidden sm:inline">
              {timeString}
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300" aria-label="Font Resizing">
              <button
                type="button"
                onClick={() => setFontSizeScale('lg')}
                title="Increase font size"
                className={`px-1 rounded hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
                  fontSizeScale === 'lg' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale('normal')}
                title="Reset font size"
                className={`px-1 rounded hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
                  fontSizeScale === 'normal' ? 'text-white font-bold' : ''
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale('sm')}
                title="Decrease font size"
                className={`px-1 rounded hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
                  fontSizeScale === 'sm' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                A-
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MAIN HEADER & NAVBAR (White background)
         ========================================================================= */}
      <header className="bg-white border-b border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] sticky top-0 z-40">
        <div className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex items-center justify-between gap-4">
          {/* Logo Tab: Exact VidyutFlow + UGVCL branding block */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center text-left cursor-pointer group shrink-0"
          >
            <div className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-xl px-3.5 py-1.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all">
              {/* UGVCL Pylon Logo */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-[#0B2545]" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                  {/* Transmission Pylon */}
                  <path d="M24 4 L14 44 M24 4 L34 44" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M12 16 L36 16 M10 26 L38 26 M7 36 L41 36" strokeWidth="2" />
                  <path d="M16 16 L32 26 M32 16 L16 26" strokeWidth="1.5" />
                  <path d="M14 26 L34 36 M34 26 L14 36" strokeWidth="1.5" />
                  {/* Lightning Bolt Spark in Orange */}
                  <path d="M26 12 L20 22 L27 22 L21 34" stroke="#FF6B00" strokeWidth="2.5" fill="#FF6B00" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-black tracking-widest text-[#0B2545] leading-none mt-0.5">
                  UGVCL
                </span>
              </div>

              {/* Vertical divider */}
              <div className="h-9 w-px bg-slate-200" />

              {/* Wordmark: UGVCL */}
              <div className="leading-tight">
                <div className="text-xl sm:text-2xl font-black tracking-tight text-[#0A2540]">
                  <span>UGVCL</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium tracking-wide">
                  {copy.brandTagline}
                </div>
              </div>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
            {/* Active Home Pill */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1C3E] text-white shadow-xs font-semibold hover:bg-[#07162C] transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{copy.navHome}</span>
            </button>

            {/* Services Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsServicesMenuOpen(!isServicesMenuOpen);
                  setIsAboutMenuOpen(false);
                  setIsHelpMenuOpen(false);
                }}
                className="flex items-center gap-1 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span>{copy.navServices}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isServicesMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <button
                    type="button"
                    onClick={() => { goToConsumer('new-connection'); setIsServicesMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-[#FF6B00] flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span>{copy.navNewConnection}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { goToConsumer('bills'); setIsServicesMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <span>{copy.navPayBill}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { goToConsumer('complaints'); setIsServicesMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>{copy.navRegisterComplaint}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { goToConsumer('requests'); setIsServicesMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{copy.navTrackApplication}</span>
                  </button>
                </div>
              )}
            </div>

            {/* About UGVCL Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAboutMenuOpen(!isAboutMenuOpen);
                  setIsServicesMenuOpen(false);
                  setIsHelpMenuOpen(false);
                }}
                className="flex items-center gap-1 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span>{copy.navAboutUgvcl}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isAboutMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <button
                    type="button"
                    onClick={() => { onOpenAboutModal('overview'); setIsAboutMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-[#0A2540] flex items-center gap-2 cursor-pointer"
                  >
                    <Building className="w-4 h-4 text-cyan-600" />
                    <span>{copy.navCorporateOverview}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { onOpenAboutModal('network'); setIsAboutMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-[#0A2540] flex items-center gap-2 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>{copy.navDistributionNetwork}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Help & Support Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsHelpMenuOpen(!isHelpMenuOpen);
                  setIsServicesMenuOpen(false);
                  setIsAboutMenuOpen(false);
                }}
                className="flex items-center gap-1 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span>{copy.navHelpSupport}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isHelpMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <a
                    href="tel:19124"
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2 block"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>{copy.navHelpline24x7}</span>
                  </a>
                  <a
                    href="mailto:support@ugvcl.com"
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2 block"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>{copy.navEmailSupport}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => { setIsQaModalOpen(true); setIsHelpMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 hover:text-[#FF6B00] flex items-center gap-2 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-[#FF6B00]" />
                    <span>{copy.navQaFull}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Q&A Page Button */}
            <button
              type="button"
              onClick={() => setIsQaModalOpen(true)}
              className="px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {copy.navQaShort}
            </button>

            {/* Contact Us */}
            <a
              href="#contact"
              className="px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {copy.navContactUs}
            </a>
          </nav>

          {/* Right Action: Language Selector & Sign In Button */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentLangLabel}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors ${
                        language === l.code ? 'bg-orange-50 text-[#FF6B00]' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{l.native}</span>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-[#FF6B00]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vertical Separator */}
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Exact Orange Sign In Button */}
            <button
              type="button"
              onClick={openSignInModal}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF6B00] to-[#EA580C] hover:from-[#FF6B00] hover:to-[#D94F04] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <User className="w-4 h-4 fill-white" />
              <span>{copy.signIn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. HERO BANNER (Panoramic UGVCL Building & Sweeping Energy Curve)
         ========================================================================= */}
      <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#C2DCF9] via-[#D5E7FA] to-[#E9F2FC]">
        {/* Banner container with aspect ratio preserving the full panoramic building & curve */}
        <div className="relative w-full min-h-[250px] sm:min-h-[290px] md:min-h-[330px] lg:min-h-[380px] xl:min-h-[400px] flex items-start">
          <img
            src="/assets/ugvcl/home_hero_bg.png?v=6"
            alt="UGVCL Headquarters - Smart Electricity Services"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          />

          {/* Left Text & Badges Overlay - Positioned cleanly in the upper sky region with zero overlap */}
          <div className="relative z-10 max-w-[1580px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-7 sm:pt-9 lg:pt-11 pb-8">
            <div className="max-w-md sm:max-w-lg lg:max-w-xl">
              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-black tracking-tight text-[#0A2540] leading-tight">
                {copy.heroTitleLine1} <br />
                <span className="text-[#0A2540]">{copy.heroTitlePrefix}</span>
                <span className="text-[#FF6B00]">{copy.heroTitleHighlight}</span>
              </h1>

              {/* Subtitle Description */}
              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm lg:text-[14px] font-bold text-[#0C2B4E] leading-relaxed">
                {copy.heroSubtitleLine1} <br />
                {copy.heroSubtitleLine2}
              </p>

              {/* Short Orange Accent Underline */}
              <div className="w-12 h-0.5 bg-[#FF6B00] rounded-full my-3 sm:my-3.5" />

              {/* 3 Feature Indicators Row */}
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-5">
                {/* Indicator 1: Reliable Power */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0 border border-slate-100">
                    <Zap className="w-5 h-5 text-[#FF6B00] fill-[#FF6B00]" />
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A2540] leading-tight">
                    <div>{copy.indReliable1}</div>
                    <div>{copy.indReliable2}</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-7 w-px bg-slate-300/80 hidden sm:block" />

                {/* Indicator 2: Secure Services */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0 border border-slate-100">
                    <svg className="w-5 h-5 text-[#0B3A75]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 15l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z" />
                    </svg>
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A2540] leading-tight">
                    <div>{copy.indSecure1}</div>
                    <div>{copy.indSecure2}</div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-7 w-px bg-slate-300/80 hidden sm:block" />

                {/* Indicator 3: 24x7 Support */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0 border border-slate-100">
                    <Clock className="w-5 h-5 text-[#0B3A75]" />
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A2540] leading-tight">
                    <div>{copy.indSupport1}</div>
                    <div>{copy.indSupport2}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FLOATING QUICK SERVICES BAR (Anchored cleanly at bottom seam, not middle)
         ========================================================================= */}
      <section className="relative z-20 max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 -mt-6 sm:-mt-7 lg:-mt-8 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Quick Services Title Column */}
            <div className="px-3 sm:px-4 text-center lg:text-left shrink-0">
              <h2 className="text-base sm:text-lg font-black text-[#0A2540] tracking-tight">
                {copy.quickServicesTitle}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {copy.quickServicesSubtitle}
              </p>
            </div>

            <div className="hidden lg:block h-12 w-px bg-slate-200" />

            {/* 6 Quick Action Cards with dividers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 w-full lg:w-auto flex-1 md:divide-x md:divide-slate-200/80">
              {/* 1. New Connection */}
              <button
                type="button"
                onClick={() => goToConsumer('new-connection')}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-orange-50/70 border border-transparent hover:border-orange-200 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-[#0A2540] mt-1.5 leading-tight">
                  {copy.qaNewConn1}
                </span>
                <span className="text-[11px] font-semibold text-[#FF6B00]">
                  {copy.qaNewConn2}
                </span>
              </button>

              {/* 2. Pay Bill */}
              <button
                type="button"
                onClick={() => goToConsumer('bills')}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-sky-50/70 border border-transparent hover:border-sky-200 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <CreditCard className="w-5 h-5 text-[#0284C7]" />
                </div>
                <span className="text-xs font-bold text-[#0A2540] mt-1.5 leading-tight">
                  {copy.qaPayBill1}
                </span>
                <span className="text-[11px] font-semibold text-[#0284C7]">
                  {copy.qaPayBill2}
                </span>
              </button>

              {/* 3. Submit Meter Reading */}
              <button
                type="button"
                onClick={() => goToConsumer('bills')}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <Gauge className="w-5 h-5 text-[#0B2545]" />
                </div>
                <span className="text-xs font-bold text-[#0A2540] mt-1.5 leading-tight">
                  {copy.qaMeter1}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {copy.qaMeter2}
                </span>
              </button>

              {/* 4. Register Complaint */}
              <button
                type="button"
                onClick={() => goToConsumer('complaints')}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <MessageSquare className="w-5 h-5 text-[#0B2545]" />
                </div>
                <span className="text-xs font-bold text-[#0A2540] mt-1.5 leading-tight">
                  {copy.qaComplaint1}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {copy.qaComplaint2}
                </span>
              </button>

              {/* 5. Track Application */}
              <button
                type="button"
                onClick={() => goToConsumer('requests')}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <MapPin className="w-5 h-5 text-[#0B2545]" />
                </div>
                <span className="text-xs font-bold text-[#0A2540] mt-1.5 leading-tight">
                  {copy.qaTrack1}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {copy.qaTrack2}
                </span>
              </button>

              {/* 6. Need Help? */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('contact');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else goToConsumer('contact');
                }}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B2545] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <Headphones className="w-5 h-5 text-[#0B2545]" />
                </div>
                <span className="text-xs font-bold text-[#0A2540] mt-1.5 leading-tight">
                  {copy.qaHelp1}
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {copy.qaHelp2}
                </span>
              </button>
            </div>

            <div className="hidden lg:block h-12 w-px bg-slate-200" />

            {/* Helpline Dark Navy Card (19124 Toll Free) */}
            <a
              href="tel:19124"
              className="group w-full lg:w-auto px-5 py-3 rounded-2xl bg-[#082444] hover:bg-[#0A2E58] text-white flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="text-xl font-extrabold tracking-wide font-mono text-white">
                    19124
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    {copy.tollFree}
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center group-hover:translate-x-0.5 group-hover:border-white transition-all shrink-0">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. THREE INFORMATION CARDS ROW
             (Latest Updates | Our Commitment | UGVCL Coverage)
         ========================================================================= */}
      <section className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 pb-12 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {/* CARD 1: LATEST UPDATES */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-[#0A2540]" />
                  <h3 className="text-sm font-bold text-[#0A2540] tracking-tight">
                    {copy.latestUpdatesTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpdatesModalOpen(true)}
                  className="text-xs font-bold text-[#0A2540] hover:text-[#FF6B00] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{copy.viewAll}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 shrink-0" />
                    <span className="text-slate-700 leading-snug">
                      {copy.update1}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 shrink-0 tabular-nums">
                    27 Oct 2025
                  </span>
                </li>

                <li className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 shrink-0" />
                    <span className="text-slate-700 leading-snug">
                      {copy.update2}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 shrink-0 tabular-nums">
                    25 Oct 2025
                  </span>
                </li>

                <li className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 shrink-0" />
                    <span className="text-slate-700 leading-snug">
                      {copy.update3}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 shrink-0 tabular-nums">
                    20 Oct 2025
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* CARD 2: OUR COMMITMENT (With glowing bulb & plant visual) */}
          <div className="relative rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden bg-gradient-to-r from-[#F4F7FB] via-[#EFF4FA] to-[#E6EEF6] p-5 flex flex-col justify-between min-h-[168px]">
            {/* Left Content */}
            <div className="relative z-20 max-w-[58%] flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-[#0A2540]" />
                  <h3 className="text-base sm:text-[17px] font-black text-[#0A2540] tracking-tight">
                    {copy.commitmentTitle}
                  </h3>
                </div>

                <p className="text-xs text-[#0A2540]/85 font-medium leading-relaxed pt-2">
                  {copy.commitmentDesc1} <br />
                  {copy.commitmentDesc2}
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setIsCommitmentModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#042147] hover:bg-[#0A2E58] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <span>{copy.knowMore}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Glowing Lightbulb & Sprout Visual with seamless left fade */}
            <div className="absolute right-0 top-0 bottom-0 w-[56%] pointer-events-none select-none">
              <img
                src="/assets/ugvcl/bulb_card_bg.png?v=2"
                alt="Our Commitment to Green Energy"
                className="w-full h-full object-cover object-center rounded-r-2xl"
              />
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#EFF4FA] via-[#EFF4FA]/75 to-transparent" />
            </div>
          </div>

          {/* CARD 3: UGVCL COVERAGE (With Gujarat Map) */}
          <div id="coverage" className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                <MapPin className="w-4 h-4 text-[#0A2540]" />
                <div>
                  <h3 className="text-sm font-bold text-[#0A2540] tracking-tight leading-tight">
                    {copy.coverageTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {copy.coverageSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {/* 3 Metric Points horizontally aligned */}
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#0A2540] shrink-0" />
                    <div className="leading-tight">
                      <div className="font-extrabold text-[#0A2540] text-sm">4</div>
                      <div className="text-slate-500 text-[10px] font-medium">{copy.discomsLabel}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0A2540] shrink-0" />
                    <div className="leading-tight">
                      <div className="font-extrabold text-[#0A2540] text-sm">89L+</div>
                      <div className="text-slate-500 text-[10px] font-medium">{copy.consumersLabel}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#0A2540] shrink-0" />
                    <div className="leading-tight">
                      <div className="font-extrabold text-[#0A2540] text-sm">24x7</div>
                      <div className="text-slate-500 text-[10px] font-medium">{copy.serviceLabel}</div>
                    </div>
                  </div>
                </div>

                {/* Gujarat State Map Silhouette */}
                <div className="w-[95px] sm:w-[105px] shrink-0 flex items-center justify-center">
                  <img
                    src="/assets/ugvcl/gujarat_map_exact.png"
                    alt="Gujarat State Coverage Map"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. FOOTER BAR (Deep Navy - Pure Code & Scalable Vector Artwork)
         ========================================================================= */}
      <footer id="contact" className="relative bg-[#021833] text-slate-300 border-t border-blue-950/80 mt-auto overflow-hidden">
        {/* Scalable Vector Transmission Pylon & Power Line Skyline Pattern */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20 select-none"
          preserveAspectRatio="none"
          viewBox="0 0 1200 60"
          fill="none"
        >
          {/* High-voltage electrical power lines */}
          <path d="M0 24 Q300 38 600 24 T1200 24" stroke="#38BDF8" strokeWidth="0.75" />
          <path d="M0 32 Q300 46 600 32 T1200 32" stroke="#38BDF8" strokeWidth="0.75" />
          {/* Pylon Tower 1 */}
          <g transform="translate(180, 4) scale(0.65)" stroke="#60A5FA" strokeWidth="1.5">
            <path d="M20 0 L5 60 M20 0 L35 60" />
            <path d="M8 20 L32 20 M5 38 L35 38" />
            <path d="M12 20 L28 38 M28 20 L12 38" />
          </g>
          {/* Pylon Tower 2 */}
          <g transform="translate(480, 2) scale(0.7)" stroke="#60A5FA" strokeWidth="1.5">
            <path d="M20 0 L5 60 M20 0 L35 60" />
            <path d="M8 20 L32 20 M5 38 L35 38" />
            <path d="M12 20 L28 38 M28 20 L12 38" />
          </g>
          {/* Pylon Tower 3 */}
          <g transform="translate(780, 5) scale(0.65)" stroke="#60A5FA" strokeWidth="1.5">
            <path d="M20 0 L5 60 M20 0 L35 60" />
            <path d="M8 20 L32 20 M5 38 L35 38" />
            <path d="M12 20 L28 38 M28 20 L12 38" />
          </g>
          {/* Pylon Tower 4 */}
          <g transform="translate(1020, 7) scale(0.6)" stroke="#60A5FA" strokeWidth="1.5">
            <path d="M20 0 L5 60 M20 0 L35 60" />
            <path d="M8 20 L32 20 M5 38 L35 38" />
            <path d="M12 20 L28 38 M28 20 L12 38" />
          </g>
        </svg>

        <div className="relative z-10 max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left UGVCL Transmission Pylon & Logo */}
          <div className="flex items-center gap-2.5">
            <svg className="w-6 h-6 text-white" viewBox="0 0 48 48" fill="none" stroke="currentColor">
              <path d="M24 4 L14 44 M24 4 L34 44" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M12 16 L36 16 M10 26 L38 26 M7 36 L41 36" strokeWidth="2" />
              <path d="M26 12 L20 22 L27 22 L21 34" stroke="#FF6B00" strokeWidth="2.5" fill="#FF6B00" strokeLinejoin="round" />
            </svg>
            <span className="text-base font-black tracking-wider text-white">
              UGVCL
            </span>
          </div>

          {/* Center Legal / Statutory Navigation Links */}
          <div className="flex items-center flex-wrap justify-center gap-2 text-[11px] text-slate-300">
            <button
              type="button"
              onClick={() => onOpenAboutModal('overview')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {copy.privacyPolicy}
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => onOpenAboutModal('overview')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {copy.termsConditions}
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => onOpenAboutModal('overview')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {copy.sitemap}
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => onOpenAboutModal('overview')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {copy.accessibility}
            </button>
          </div>

          {/* Right Social Media & Copyright */}
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400 font-medium">{copy.followUs}</span>
            <div className="flex items-center gap-2 text-white">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <Youtube className="w-3.5 h-3.5 fill-current" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
              >
                <Facebook className="w-3.5 h-3.5 fill-current" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter / X"
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-black flex items-center justify-center transition-colors"
              >
                {/* Modern X vector icon */}
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-blue-700 flex items-center justify-center transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 fill-current" />
              </a>
            </div>

            <span className="text-slate-400 ml-2">
              {copy.copyright}
            </span>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          LATEST UPDATES & PUBLIC NOTICES MODAL
         ========================================================================= */}
      {isUpdatesModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ugvcl-latest-updates-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#0A2540] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#FF6B00]">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <h3 id="ugvcl-latest-updates-title" className="text-base font-extrabold tracking-tight">
                    UGVCL Latest Updates &amp; Public Notices
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Uttar Gujarat Vij Company Limited · Official Consumer Announcements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdatesModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close Latest Updates"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
              {[
                {
                  date: '27 Oct 2025',
                  tag: 'Digital Billing',
                  title: 'Online UPI & BBPS Payment Facility Active Across All Circles',
                  desc: 'All UGVCL LT & HT consumers can now pay bills instantly via UPI QR codes on e-bills with automatic receipt generation.',
                },
                {
                  date: '25 Oct 2025',
                  tag: 'Smart Metering',
                  title: 'Self-Service Meter Reading Submission via VidyutFlow',
                  desc: 'Submit your meter photograph directly through the Consumer Portal for automated OCR verification and transparent billing.',
                },
                {
                  date: '20 Oct 2025',
                  tag: 'Green Initiative',
                  title: 'Digital India Initiative – Go Paperless e-Bill Rebate',
                  desc: 'Opt for paperless digital electricity bills and instant SMS/email alerts for due-date reminders and outage schedules.',
                },
                {
                  date: '14 Oct 2025',
                  tag: 'Solar Net-Metering',
                  title: 'Fast-Track PM Surya Ghar Rooftop Solar Sanctions',
                  desc: 'Online 4-step sanction workflow for residential and commercial rooftop solar net-metering connections across Mehsana, Gandhinagar & Patan.',
                },
                {
                  date: '08 Oct 2025',
                  tag: 'Grid Reliability',
                  title: '24×7 Preventive Transformer Health Telemetry Active',
                  desc: 'Real-time feeder load balancing and predictive maintenance alerts deployed across 11 kV & 33 kV distribution substations.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-colors space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-orange-100 text-[#FF6B00] text-[10px] font-bold uppercase tracking-wider">
                      {item.tag}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0A2540]">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsUpdatesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0A2540] hover:bg-[#07162C] text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          OUR COMMITMENT & VISION MODAL
         ========================================================================= */}
      {isCommitmentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ugvcl-commitment-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#0A2540] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#FF6B00]">
              <div className="flex items-center gap-2.5">
                <Handshake className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <h3 id="ugvcl-commitment-title" className="text-base font-extrabold tracking-tight">
                    Our Commitment to Gujarat
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Reliable, Customer-Centric &amp; Technology-Driven Power Distribution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCommitmentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close Our Commitment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Uttar Gujarat Vij Company Limited (UGVCL) serves over <strong>89 Lakh+ consumers</strong> across
                North Gujarat with a commitment to uninterrupted power supply, transparent digital billing,
                and clean renewable energy integration.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: '24×7 Uninterrupted Supply',
                    desc: 'Automated feeder monitoring, proactive transformer health tracking, and rapid field fault restoration.',
                  },
                  {
                    title: 'Transparent Digital Billing',
                    desc: 'Progressive slab tariffs, verified meter reading proofs, and instant UPI QR settlement with official receipts.',
                  },
                  {
                    title: 'Clean & Green Energy',
                    desc: 'Streamlined solar net-metering approvals and paperless e-billing supporting Gujarat’s renewable transition.',
                  },
                  {
                    title: 'Time-Bound Consumer SLA',
                    desc: '24-hour grievance resolution tracking and real-time status updates across every sub-division.',
                  },
                ].map((pillar, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A2540]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{pillar.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{pillar.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCommitmentModalOpen(false);
                  onOpenAboutModal();
                }}
                className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
              >
                View Full Institutional Profile →
              </button>
              <button
                type="button"
                onClick={() => setIsCommitmentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#0A2540] hover:bg-[#07162C] text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Q&A (FREQUENTLY ASKED QUESTIONS) PAGE MODAL
         ========================================================================= */}
      {isQaModalOpen && (() => {
        const qaItems: Array<{
          category: 'New Connection' | 'Billing & UPI' | 'Meter Reading' | 'Outages & Support';
          q: string;
          a: string;
        }> = [
          {
            category: 'New Connection',
            q: 'How do I apply for a new UGVCL electricity connection online?',
            a: 'Sign in to the Consumer Portal and open "New Connection". Complete all 4 mandatory steps: (1) Applicant Details, (2) Premises & Grid Details, (3) Load & Tariff Specifications, and (4) Documents & Sanction Review. Once submitted, you can track progress in My Connections.',
          },
          {
            category: 'New Connection',
            q: 'Which documents are required for a new LT or HT connection?',
            a: 'Keep your Aadhaar / PAN Card, property ownership or rent/lease proof, and passport-size photo / site test report ready. All required details in each step must be completed before submission.',
          },
          {
            category: 'Billing & UPI',
            q: 'How do I pay my electricity bill using the UPI QR code?',
            a: 'Open your bill or click "Pay Bill" and select UPI / BHIM. Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) — it automatically fills the exact payable amount to UGVCL UPI ID kushwsand@naviaxis. Once paid, the QR code deactivates and your receipt is generated.',
          },
          {
            category: 'Billing & UPI',
            q: 'What happens to the QR code if I miss the due date?',
            a: 'Unpaid bills never leave you stuck: if the due date passes, the old pre-due QR expires and a fresh updated QR is automatically generated with the recalculated payable amount (including late charges) until payment is completed.',
          },
          {
            category: 'Meter Reading',
            q: 'How can I submit my meter reading from home?',
            a: 'Go to Usage Analytics / Meter Reading in the Consumer Portal, upload a clear photograph of your digital meter display, verify the OCR-detected kWh reading, and submit. An officer reviews any flagged anomalies before billing.',
          },
          {
            category: 'Outages & Support',
            q: 'How do I report a power outage or voltage fluctuation?',
            a: 'Use "Register Complaint" under Services or "Outage & Alerts" in the Consumer Portal to log a feeder or transformer complaint, or call the 24×7 UGVCL Helpline at 1912 / 1800 233 155335.',
          },
        ];
        const filteredQa = qaItems.filter(item => {
          const catOk = qaCategory === 'All' || item.category === qaCategory;
          const qLower = qaSearch.trim().toLowerCase();
          const textOk = !qLower || item.q.toLowerCase().includes(qLower) || item.a.toLowerCase().includes(qLower);
          return catOk && textOk;
        });

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ugvcl-qa-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsQaModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-[#0A2540] text-white px-6 py-4 flex items-center justify-between border-b-4 border-[#FF6B00]">
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-5 h-5 text-[#FF6B00]" />
                  <div>
                    <h3 id="ugvcl-qa-modal-title" className="text-base font-extrabold tracking-tight">
                      UGVCL Consumer Q&amp;A Center
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Frequently Asked Questions on Connections, UPI QR Billing, Metering &amp; Support
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQaModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  aria-label="Close Q&A"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={qaSearch}
                      onChange={e => setQaSearch(e.target.value)}
                      placeholder="Search questions (e.g. QR, UPI, new connection, meter reading)..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(['All', 'New Connection', 'Billing & UPI', 'Meter Reading', 'Outages & Support'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setQaCategory(cat);
                        setOpenQaIndex(0);
                      }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                        qaCategory === cat
                          ? 'bg-[#0A2540] text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  {filteredQa.map((item, idx) => {
                    const isOpen = openQaIndex === idx;
                    return (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenQaIndex(isOpen ? null : idx)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] block">
                              {item.category}
                            </span>
                            <span className="text-xs font-bold text-[#0A2540]">{item.q}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredQa.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                      No matching questions found. Try a different keyword or call 19124.
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  24×7 Toll-Free Helpline: <strong>1912 / 1800 233 155335</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsQaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0A2540] hover:bg-[#07162C] text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
