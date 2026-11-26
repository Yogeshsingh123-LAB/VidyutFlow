import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Briefcase,
  Wrench,
  ShieldCheck,
  Users,
  ArrowRight,
  Lock,
  Mail,
  User,
  UserPlus,
  Phone,
  Home,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  KeyRound,
  BarChart3,
  Zap,
  FileText,
  Clock,
  ChevronDown,
  Share2,
  Headphones,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { AUTH_MODAL_COPY } from './authModalTranslations';
import { sendConsumerLoginOtp, verifyConsumerLoginOtp, fetchCaptcha } from '../../utils/authClient';
import { UserRole } from '../../types';

interface VidyutFlowAuthModalProps {
  initialRole?: UserRole;
  initialTab?: 'login' | 'signup';
}

type AccountType = 'consumer' | 'field' | 'employee' | 'management' | 'admin';

interface AccountTypeConfig {
  type: AccountType;
  role: UserRole;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const ACCOUNT_TYPES: AccountTypeConfig[] = [
  {
    type: 'consumer',
    role: 'consumer',
    title: 'Consumer',
    badge: 'Citizen Portal',
    description: 'Domestic billing, payment & solar net-metering',
    icon: <Users className="w-4 h-4 text-[#FF6B00]" />
  },
  {
    type: 'field',
    role: 'field',
    title: 'Field Engineer',
    badge: 'Operations',
    description: 'Substation workorders, 11kV radial feeders & DTC',
    icon: <Wrench className="w-4 h-4 text-amber-500" />
  },
  {
    type: 'employee',
    role: 'employee',
    title: 'Employee',
    badge: 'ERP & Revenue',
    description: 'Billing audits, service triage & sanction review',
    icon: <Briefcase className="w-4 h-4 text-teal-500" />
  },
  {
    type: 'management',
    role: 'management',
    title: 'Management Cockpit',
    badge: 'Executive / HOD',
    description: 'SCADA power flow, AT&C losses, grid stability & revenue KPIs',
    icon: <BarChart3 className="w-4 h-4 text-indigo-500" />
  },
  {
    type: 'admin',
    role: 'admin',
    title: 'Administrator',
    badge: 'Governance',
    description: 'Ledger integrity, user RBAC & GERC compliance',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />
  }
];

const REMEMBER_LOGIN_KEY = 'vidyutflow_remember_login';

function loadRememberedLogin(): { identifier: string; accountType: AccountType } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.identifier === 'string' && parsed.identifier.trim()) {
      return {
        identifier: parsed.identifier.trim(),
        accountType: parsed.accountType || 'consumer'
      };
    }
    return null;
  } catch {
    return null;
  }
}

function persistRememberedLogin(remember: boolean, identifier: string, accountType: AccountType): void {
  if (typeof window === 'undefined') return;
  try {
    if (remember && identifier.trim()) {
      window.localStorage.setItem(
        REMEMBER_LOGIN_KEY,
        JSON.stringify({ identifier: identifier.trim(), accountType })
      );
    } else {
      window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export const VidyutFlowAuthModal: React.FC<VidyutFlowAuthModalProps> = ({
  initialRole = 'consumer',
  initialTab = 'login'
}) => {
  const {
    isRoleSwitcherModalOpen,
    setIsRoleSwitcherModalOpen,
    currentRole,
    loginDemoUser,
    loginConsumerOtp,
    signupDemoUser,
    showToast
  } = useApp();
  const { language } = useLanguage();
  const authCopy = AUTH_MODAL_COPY[language] || AUTH_MODAL_COPY.en;

  // Top tabs: Sign In vs New Consumer Sign Up
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  // Selected account type among the user categories (managed via dropdown menu)
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>(() => {
    if (initialRole === 'field') return 'field';
    if (initialRole === 'employee') return 'employee';
    if (initialRole === 'management') return 'management';
    if (initialRole === 'admin') return 'admin';
    return 'consumer';
  });

  const [consumerAuthMode, setConsumerAuthMode] = useState<'password' | 'otp'>('password');
  const [consumerUsername, setConsumerUsername] = useState<string>(() => {
    const saved = loadRememberedLogin();
    return saved && saved.accountType === 'consumer' ? saved.identifier : '';
  });
  const [consumerPassword, setConsumerPassword] = useState<string>('');
  const [showConsumerPassword, setShowConsumerPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => Boolean(loadRememberedLogin()));
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Consumer OTP & Security CAPTCHA State
  const [consumerMobile, setConsumerMobile] = useState<string>('');
  const [consumerOtp, setConsumerOtp] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [maskedMobile, setMaskedMobile] = useState<string>('');
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [devSimulationOtp, setDevSimulationOtp] = useState<string | null>(null);

  // Bot-Resistant Security CAPTCHA State
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaSvg, setCaptchaSvg] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [isCaptchaLoading, setIsCaptchaLoading] = useState<boolean>(false);
  const captchaInputId = useId();

  const loadCaptcha = useCallback(async () => {
    setIsCaptchaLoading(true);
    try {
      const res = await fetchCaptcha();
      if (res.success && res.captchaToken && res.captchaSvg) {
        setCaptchaToken(res.captchaToken);
        setCaptchaSvg(res.captchaSvg);
        setCaptchaAnswer('');
      }
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  // Automatically load security CAPTCHA when Consumer OTP login tab is active
  useEffect(() => {
    if (activeTab === 'login' && selectedAccountType === 'consumer' && consumerAuthMode === 'otp' && !isOtpSent && !captchaToken) {
      loadCaptcha();
    }
  }, [activeTab, selectedAccountType, consumerAuthMode, isOtpSent, captchaToken, loadCaptcha]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Staff State (Field Engineer, Officer, Management Cockpit, Admin)
  const [staffIdentifier, setStaffIdentifier] = useState<string>(() => {
    const saved = loadRememberedLogin();
    return saved && saved.accountType !== 'consumer' ? saved.identifier : '';
  });
  const [staffPassword, setStaffPassword] = useState<string>('');
  const [staffMfaCode, setStaffMfaCode] = useState<string>('');
  const [showStaffPassword, setShowStaffPassword] = useState<boolean>(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);

  // Consumer Registration State
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupMobile, setSignupMobile] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState<boolean>(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form field unique IDs for accessibility
  const consumerNoId = useId();
  const consumerMobileId = useId();
  const consumerOtpId = useId();
  const staffIdentifierId = useId();
  const staffPasswordId = useId();
  const staffMfaId = useId();
  const signupNameId = useId();
  const signupEmailId = useId();
  const signupMobileId = useId();
  const signupPasswordId = useId();
  const signupConfirmPasswordId = useId();

  // Cooldown countdown timer
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [cooldownSeconds]);

  // Sync tab on modal open
  useEffect(() => {
    if (isRoleSwitcherModalOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (initialRole === 'field') setSelectedAccountType('field');
      else if (initialRole === 'employee') setSelectedAccountType('employee');
      else if (initialRole === 'management') setSelectedAccountType('management');
      else if (initialRole === 'admin') setSelectedAccountType('admin');
      else setSelectedAccountType('consumer');
    }
  }, [isRoleSwitcherModalOpen, initialRole]);

  if (!isRoleSwitcherModalOpen) return null;

  // Handle switching account type from dropdown
  const handleSelectAccountType = (type: AccountType) => {
    setSelectedAccountType(type);
    setIsRoleDropdownOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // --- Consumer Password Login ---
  const handleConsumerPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = consumerUsername.trim();
    if (!cleanUser) {
      setErrorMessage('Please enter your Username, Registered Mobile Number, or Email.');
      return;
    }
    if (!consumerPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const result = await loginDemoUser(cleanUser, consumerPassword, 'consumer', undefined, undefined, rememberMe);
      if (result.success) {
        persistRememberedLogin(rememberMe, cleanUser, 'consumer');
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // --- Consumer: Send OTP (with Security CAPTCHA verification) ---
  const handleSendConsumerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanMobile = consumerMobile.replace(/\D/g, '');

    if (cleanMobile.length < 10) {
      setErrorMessage('Please enter your 10-digit registered mobile number.');
      return;
    }
    if (!captchaAnswer.trim()) {
      setErrorMessage('Please enter the security verification characters shown in the graphic image.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await sendConsumerLoginOtp({
        mobileNumber: cleanMobile,
        captchaToken,
        captchaAnswer: captchaAnswer.trim(),
        discom: 'UGVCL'
      });
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to dispatch verification OTP.');
        loadCaptcha();
        return;
      }
      setIsOtpSent(true);
      setMaskedMobile(res.maskedMobile || `+91 XXXXX XX${cleanMobile.slice(-2)}`);
      setCooldownSeconds(res.cooldownSeconds || 45);
      setDevSimulationOtp(res.devSimulationOtp || null);
      setSuccessMessage(res.message || `One-Time Password (OTP) dispatched to ${res.maskedMobile || 'your registered mobile'}.`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // --- Consumer: Verify OTP & Sign In ---
  const handleVerifyConsumerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = consumerOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code sent to your registered mobile.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const cleanMobile = consumerMobile.replace(/\D/g, '');
      const result = await loginConsumerOtp(cleanMobile, cleanOtp);
      if (!result.success && result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // --- Staff & Admin: Sign In ---
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdent = staffIdentifier.trim();
    if (!cleanIdent) {
      setErrorMessage('Please enter your Employee ID or official email address.');
      return;
    }
    if (!staffPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    const currentConfig = ACCOUNT_TYPES.find(a => a.type === selectedAccountType) || ACCOUNT_TYPES[1];
    setIsSubmittingStaff(true);
    try {
      const result = await loginDemoUser(
        cleanIdent,
        staffPassword,
        currentConfig.role,
        staffMfaCode.trim() || undefined,
        undefined,
        rememberMe
      );
      if (result.success) {
        persistRememberedLogin(rememberMe, cleanIdent, currentConfig.type);
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // --- New Consumer Sign Up ---
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupName.trim()) {
      setErrorMessage('Please enter your full name as per identity proof.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (signupMobile.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (signupPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    setIsSubmittingSignup(true);
    try {
      const result = await signupDemoUser(
        signupName,
        signupEmail,
        signupPassword,
        signupMobile.trim()
      );
      if (!result.success && result.error) {
        setErrorMessage(result.error);
      }
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  const activeAccountConfig = ACCOUNT_TYPES.find(a => a.type === selectedAccountType) || ACCOUNT_TYPES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setIsRoleSwitcherModalOpen(false);
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900 p-0"
    >
      {/* =============================================================== */}
      {/* PROFESSIONAL LAYERED SCENE (Using user-provided pristine background) */}
      {/* =============================================================== */}
      <div className="relative w-full min-h-screen flex flex-col lg:items-center lg:justify-center overflow-x-hidden bg-gradient-to-b from-[#4A9CEB] via-[#74B3F0] to-[#E2F0FD]">

        {/* High-Resolution 1920x1071 Background Scenery (Clean sky, building, landscape and bottom waves) */}
        <img
          src="/assets/ugvcl/login_bg_hq.png"
          alt="UGVCL Headquarters Landscape"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
        />
        {/* Mobile readability scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#4A9CEB]/35 via-transparent to-[#DCEBFA]/70 lg:hidden pointer-events-none z-0" />

        {/* Mobile Top Bar: Branding on left + Return to Home on right */}
        <div className="relative z-30 w-full flex items-center justify-between px-4 pt-3.5 pb-1 lg:hidden">
          <div className="flex items-center gap-2 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/80">
            <Zap className="w-3.5 h-3.5 text-[#FF7A00] fill-[#FF7A00]" />
            <span className="text-xs font-black tracking-tight text-[#0A2540]">
              UGVCL <span className="text-[#FF6B00]">VidyutFlow</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsRoleSwitcherModalOpen(false)}
            className="px-3.5 py-1.5 min-h-[38px] rounded-full bg-white/90 hover:bg-white text-[#0A2540] text-xs font-bold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>{authCopy.returnToHome}</span>
          </button>
        </div>

        {/* Desktop Top Right Control: Return to Home (positioned cleanly in top margin) */}
        <div className="hidden lg:flex absolute top-4 right-8 z-30 items-center">
          <button
            type="button"
            onClick={() => setIsRoleSwitcherModalOpen(false)}
            className="px-4 py-2 rounded-full bg-white/90 hover:bg-white text-[#0A2540] text-xs font-bold shadow-md backdrop-blur-md border border-white/80 flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>{authCopy.returnToHome}</span>
          </button>
        </div>

        {/* Content Container: Left Branding + Right Floating Card */}
        <div className="relative z-20 w-full max-w-[1580px] lg:min-h-screen flex flex-col lg:flex-row items-center lg:items-start justify-between px-3.5 pt-2 pb-8 sm:p-6 lg:p-12 gap-5 lg:gap-8">

          {/* =============================================================== */}
          {/* LEFT COLUMN: LIVE HTML BRANDING, HEADLINE, BADGES & CAPSULE     */}
          {/* =============================================================== */}
          <div className="order-2 lg:order-1 flex flex-col justify-between w-full lg:w-[56%] py-2 lg:py-6 lg:min-h-[calc(100vh-6rem)]">

            {/* Top Section: Branding + Headline + Feature Badges (Anchored to upper sky area exactly as in reference) */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-7">
              {/* Top Branding Section (Desktop — mobile uses compact top bar + card header) */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex flex-col items-center justify-center shrink-0">
                  <svg className="w-8 h-8 text-[#0B2545]" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                    <path d="M24 4 L14 44 M24 4 L34 44" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M12 16 L36 16 M10 26 L38 26 M7 36 L41 36" strokeWidth="2" />
                    <path d="M16 16 L32 26 M32 16 L16 26" strokeWidth="1.5" />
                    <path d="M14 26 L34 36 M34 26 L14 36" strokeWidth="1.5" />
                    <path d="M26 12 L20 22 L27 22 L21 34" stroke="#FF6B00" strokeWidth="2.5" fill="#FF6B00" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] font-black tracking-widest text-[#0B2545] leading-none mt-0.5">
                    UGVCL
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-300/80" />
                <div>
                  <div className="text-[22px] font-black tracking-tight leading-none text-[#0A2540]">
                    Vidyut<span className="text-[#FF6B00]">Flow</span>
                  </div>
                  <div className="text-[11px] text-[#0A2540]/80 font-bold tracking-wide mt-1">
                    {authCopy.tagline}
                  </div>
                </div>
              </div>

              {/* Main Headline & Feature Indicators */}
              <div className="pt-1">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#0A2540] leading-[1.18]">
                  {authCopy.heroTitleLine1} <br />
                  {authCopy.heroTitlePrefix}<span className="text-[#FF6B00]">{authCopy.heroTitleHighlight}</span>
                </h1>

                {/* Orange Accent Underline */}
                <div className="w-14 h-1 bg-[#FF6B00] rounded-full my-4" />

                {/* Three Feature Badges Row */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                  {/* 1. Reliable Power */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0 border border-slate-100">
                      <Zap className="w-5 h-5 text-[#FF6B00] fill-[#FF6B00]" />
                    </div>
                    <div className="text-[12px] font-bold text-[#0A2540] leading-tight">
                      <div>{authCopy.indReliable1}</div>
                      <div>{authCopy.indReliable2}</div>
                    </div>
                  </div>

                  <div className="h-7 w-px bg-slate-300/80 hidden sm:block" />

                  {/* 2. Secure Services */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0 border border-slate-100">
                      <svg className="w-5 h-5 text-[#0B3A75]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 15l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z" />
                      </svg>
                    </div>
                    <div className="text-[12px] font-bold text-[#0A2540] leading-tight">
                      <div>{authCopy.indSecure1}</div>
                      <div>{authCopy.indSecure2}</div>
                    </div>
                  </div>

                  <div className="h-7 w-px bg-slate-300/80 hidden sm:block" />

                  {/* 3. 24x7 Support */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0 border border-slate-100">
                      <Clock className="w-5 h-5 text-[#0B3A75]" />
                    </div>
                    <div className="text-[12px] font-bold text-[#0A2540] leading-tight">
                      <div>{authCopy.indSupport1}</div>
                      <div>{authCopy.indSupport2}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 'Why Sign In?' Frosted Capsule Bar matching reference */}
            <div className="pt-4 lg:pt-0 mt-auto">
              <div className="grid grid-cols-2 sm:inline-flex sm:flex-wrap items-center gap-1.5 sm:gap-0 bg-white/85 backdrop-blur-md rounded-2xl shadow-[0_8px_28px_rgba(10,37,64,0.14)] border border-white/85 px-3 py-2.5 sm:py-2 text-slate-700 w-full lg:w-auto">
                <span className="col-span-2 sm:col-span-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[#0A2540] text-[13px] font-black border-b sm:border-b-0 border-slate-200/70">
                  {authCopy.whySignIn}
                </span>

                <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

                {/* Feature 1 */}
                <div className="flex items-center gap-2 px-2.5 py-1 text-[11.5px] font-bold text-[#0A2540]">
                  <FileText className="w-4 h-4 text-[#FF6B00]" />
                  <div className="leading-tight">
                    <span>{authCopy.whyPay1}</span>
                    <span className="text-[10px] block font-normal text-slate-500">{authCopy.whyPay2}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1.5 hidden sm:block" />

                {/* Feature 2 */}
                <div className="flex items-center gap-2 px-2.5 py-1 text-[11.5px] font-bold text-[#0A2540]">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <div className="leading-tight">
                    <span>{authCopy.whyTrack1}</span>
                    <span className="text-[10px] block font-normal text-slate-500">{authCopy.whyTrack2}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1.5 hidden sm:block" />

                {/* Feature 3 */}
                <div className="flex items-center gap-2 px-2.5 py-1 text-[11.5px] font-bold text-[#0A2540]">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <div className="leading-tight">
                    <span>{authCopy.whyManage1}</span>
                    <span className="text-[10px] block font-normal text-slate-500">{authCopy.whyManage2}</span>
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1.5 hidden sm:block" />

                {/* Feature 4 */}
                <div className="flex items-center gap-2 px-2.5 py-1 text-[11.5px] font-bold text-[#0A2540]">
                  <Headphones className="w-4 h-4 text-indigo-600" />
                  <div className="leading-tight">
                    <span>{authCopy.whyRaise1}</span>
                    <span className="text-[10px] block font-normal text-slate-500">{authCopy.whyRaise2}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* RIGHT COLUMN: FLOATING WHITE LOGIN CARD                        */}
          {/* =============================================================== */}
          <div className="order-1 lg:order-2 w-full max-w-[440px] sm:max-w-[460px] lg:mr-2 xl:mr-8 lg:my-auto">
            <div className="bg-gradient-to-b from-white via-[#F9FCFF] to-[#EEF6FF] backdrop-blur-md rounded-[24px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(10,37,64,0.18)] border border-white/95 p-5 sm:p-8 relative overflow-hidden text-left transition-all">

              {/* Subtle Transmission Pylon Watermark in Bottom-Right Inside Card */}
              <div className="absolute right-3 bottom-3 w-24 h-36 pointer-events-none opacity-15">
                <svg viewBox="0 0 120 220" fill="none" stroke="#2563EB" strokeWidth="1.5" className="w-full h-full">
                  <line x1="60" y1="10" x2="25" y2="215" />
                  <line x1="60" y1="10" x2="95" y2="215" />
                  <line x1="25" y1="215" x2="95" y2="215" />
                  <line x1="50" y1="45" x2="70" y2="45" />
                  <line x1="38" y1="85" x2="82" y2="85" />
                  <line x1="30" y1="135" x2="90" y2="135" />
                  <line x1="25" y1="185" x2="95" y2="185" />
                  <line x1="50" y1="45" x2="82" y2="85" />
                  <line x1="70" y1="45" x2="38" y2="85" />
                  <line x1="38" y1="85" x2="90" y2="135" />
                  <line x1="82" y1="85" x2="30" y2="135" />
                  <line x1="30" y1="135" x2="95" y2="185" />
                  <line x1="90" y1="135" x2="25" y2="185" />
                  <line x1="18" y1="85" x2="102" y2="85" />
                  <line x1="10" y1="135" x2="110" y2="135" />
                </svg>
              </div>

              {/* Decorative Layered Corner Swoop (Top Right) */}
              <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none overflow-hidden rounded-tr-[28px] sm:rounded-tr-[32px]">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                  <path d="M0,0 C60,0 100,40 100,100 L100,0 Z" fill="#FF7A00" />
                  <path d="M15,0 C65,0 100,35 100,85 L100,0 Z" fill="#0A2540" />
                </svg>
              </div>

              {/* Top Center Logo Header */}
              <div className="flex flex-col items-center justify-center text-center mb-4">
                <div className="flex items-center gap-3 mb-1">
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
                  <div className="text-left">
                    <div className="text-[18px] font-black tracking-tight leading-none text-[#0A2540]">
                      Vidyut<span className="text-[#FF6B00]">Flow</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold tracking-wide mt-0.5">
                      {authCopy.tagline}
                    </div>
                  </div>
                </div>

                <h2
                  id="auth-modal-title"
                  className="text-[20px] sm:text-[22px] font-black text-[#0A2540] tracking-tight mt-2 leading-tight"
                >
                  {activeTab === 'login' ? authCopy.signInTitle : authCopy.signUpTitle}
                </h2>
                <p className="text-[12px] text-slate-500 font-normal max-w-xs mt-1 leading-snug">
                  {activeTab === 'login' ? authCopy.signInSubtitle : authCopy.signUpSubtitle}
                </p>
              </div>

              {/* Feedback messages */}
              {errorMessage && (
                <div className="mb-3.5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-[12px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-snug font-medium">{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div className="mb-3.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[12px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-snug font-medium">{successMessage}</div>
                </div>
              )}

              {/* ========================================================= */}
              {/* LOGIN TAB                                                 */}
              {/* ========================================================= */}
              {activeTab === 'login' && (
                <div className="space-y-3.5">

                  {/* USER ROLE DROPDOWN SELECTOR (Requested by User) */}
                  <div className="space-y-1 relative" ref={dropdownRef}>
                    <div className="flex items-center justify-between text-[11.5px] font-bold text-slate-600">
                      <span>{authCopy.loginUserType}</span>
                      <span className="text-[#FF7A00] font-semibold text-[10.5px]">{authCopy.selectRole}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 text-left flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded-md bg-white shadow-2xs">
                          {activeAccountConfig.icon}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-[13px] text-[#0A2540]">
                            {authCopy.roles[activeAccountConfig.type].title}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1.5 font-medium">
                            ({authCopy.roles[activeAccountConfig.type].badge})
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Accessible hidden select element for programmatic & test accessibility */}
                    <select
                      aria-label="Account Type Selection"
                      value={selectedAccountType}
                      onChange={(e) => handleSelectAccountType(e.target.value as AccountType)}
                      className="sr-only"
                    >
                      {ACCOUNT_TYPES.map(acc => (
                        <option key={acc.type} value={acc.type}>
                          {authCopy.roles[acc.type].title} ({authCopy.roles[acc.type].badge})
                        </option>
                      ))}
                    </select>

                    {/* Dropdown Menu Popup */}
                    {isRoleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                        {ACCOUNT_TYPES.map((acc) => {
                          const isSelected = selectedAccountType === acc.type;
                          const localizedRole = authCopy.roles[acc.type];
                          return (
                            <button
                              key={acc.type}
                              type="button"
                              onClick={() => handleSelectAccountType(acc.type)}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-orange-50/60 transition-colors cursor-pointer ${isSelected ? 'bg-orange-50 text-[#0A2540] font-bold' : 'text-slate-700'
                                }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="p-1 rounded-md bg-slate-100">
                                  {acc.icon}
                                </div>
                                <div>
                                  <div className="text-[12.5px] font-bold leading-tight">
                                    {localizedRole.title}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {localizedRole.badge} • {localizedRole.desc.split(',')[0]}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#FF7A00]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* DYNAMIC FORM ACCORDING TO ROLE */}
                  {selectedAccountType === 'consumer' ? (
                    /* --- CONSUMER FORM (Citizens) --- */
                    consumerAuthMode === 'password' ? (
                      /* Mode A: Password Authentication (Matches exact image mockup) */
                      <form onSubmit={handleConsumerPasswordLogin} className="space-y-3">
                        {/* Input 1: Username / Registered Mobile / Email */}
                        <div className="space-y-1">
                          <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                              <User className="w-4 h-4" />
                            </div>
                            <input
                              id={consumerNoId}
                              type="text"
                              required
                              autoComplete="off"
                              value={consumerUsername}
                              onChange={(e) => setConsumerUsername(e.target.value)}
                              placeholder={authCopy.usernamePlaceholder}
                              className="w-full h-11 pl-10 pr-3.5 text-[13.5px] rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                            />
                          </div>
                          <span className="text-[10.5px] text-slate-500 block px-1">
                            {authCopy.usernameHint}
                          </span>
                        </div>

                        {/* Input 2: Password */}
                        <div className="space-y-1">
                          <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                              <Lock className="w-4 h-4" />
                            </div>
                            <input
                              type={showConsumerPassword ? 'text' : 'password'}
                              required
                              value={consumerPassword}
                              onChange={(e) => setConsumerPassword(e.target.value)}
                              placeholder={authCopy.passwordPlaceholder}
                              className="w-full h-11 pl-10 pr-10 text-[13.5px] rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConsumerPassword(!showConsumerPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              aria-label={showConsumerPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConsumerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Remember me & Forgot Password Row */}
                        <div className="flex items-center justify-between text-[12px] pt-0.5">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300 text-[#FF7A00] focus:ring-[#FF7A00]"
                            />
                            <span>{authCopy.rememberMe}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setConsumerAuthMode('otp');
                              setErrorMessage(null);
                              setSuccessMessage('Switched to OTP verification via Registered Mobile Number.');
                            }}
                            className="text-[#0A2540] hover:text-[#FF7A00] font-semibold transition-colors cursor-pointer"
                          >
                            {authCopy.forgotPassword}
                          </button>
                        </div>

                        {/* Primary Sign In Button (Rounded-xl Orange matching reference) */}
                        <button
                          type="submit"
                          disabled={isSubmittingStaff}
                          className="w-full h-11 px-5 rounded-xl bg-gradient-to-r from-[#FF7A00] via-[#F97316] to-[#EA580C] hover:from-[#F97316] hover:to-[#D94F04] disabled:opacity-60 text-white font-bold text-[14.5px] shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          {isSubmittingStaff ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4" />
                              <span>{authCopy.signInBtn}</span>
                            </>
                          )}
                        </button>

                        {/* Quick switch to OTP mode */}
                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setConsumerAuthMode('otp');
                              setErrorMessage(null);
                            }}
                            className="text-[11.5px] font-semibold text-slate-500 hover:text-[#FF7A00] transition-colors cursor-pointer"
                          >
                            {authCopy.orOtpLink}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Mode B: OTP Verification with Security CAPTCHA */
                      !isOtpSent ? (
                        <form onSubmit={handleSendConsumerOtp} className="space-y-3">
                          {/* Registered Mobile Number */}
                          <div className="space-y-1">
                            <label htmlFor={consumerMobileId} className="text-[11.5px] font-bold text-slate-700 block">
                              {authCopy.registeredMobileLabel || 'Registered Mobile Number'}
                            </label>
                            <div className="relative flex items-center">
                              <span className="absolute left-3.5 text-[12.5px] font-bold text-slate-500 select-none">
                                +91
                              </span>
                              <input
                                id={consumerMobileId}
                                type="tel"
                                required
                                maxLength={10}
                                value={consumerMobile}
                                onChange={(e) => setConsumerMobile(e.target.value.replace(/\D/g, ''))}
                                placeholder={authCopy.mobilePlaceholder}
                                className="w-full h-10 pl-12 pr-3.5 text-[13px] font-mono rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                              />
                            </div>
                          </div>

                          {/* Security Verification & Anti-bot CAPTCHA */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
                              <span>{authCopy.securityVerification || 'Security Verification'}</span>
                              <span className="text-slate-500 font-medium">{authCopy.antiBotLabel || 'Anti-bot protection'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div
                                className="relative select-none rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-0.5 shadow-2xs grow"
                                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                              >
                                {captchaSvg ? (
                                  <img
                                    src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaSvg)}`}
                                    alt="Security CAPTCHA"
                                    className="pointer-events-none select-none scale-90 origin-center"
                                  />
                                ) : (
                                  <div className="h-10 flex items-center justify-center text-[11px] text-slate-400">
                                    {isCaptchaLoading ? 'Generating...' : 'Loading CAPTCHA...'}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={loadCaptcha}
                                disabled={isCaptchaLoading}
                                title="Reload CAPTCHA"
                                className="h-10 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${isCaptchaLoading ? 'animate-spin' : ''}`} />
                              </button>
                            </div>

                            <input
                              id={captchaInputId}
                              type="text"
                              required
                              maxLength={6}
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                              value={captchaAnswer}
                              onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                              placeholder={authCopy.captchaPlaceholder}
                              className="w-full h-10 px-3.5 text-[13px] font-mono tracking-widest uppercase rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isSendingOtp || consumerMobile.length < 10 || !captchaAnswer.trim()}
                            className="w-full h-11 px-5 rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF6B00] to-[#EA580C] hover:from-[#FF6B00] hover:to-[#D94F04] disabled:opacity-60 text-white font-bold text-[14.5px] shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
                          >
                            {isSendingOtp ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <ArrowRight className="w-4 h-4" />
                                <span>{authCopy.sendOtpBtn}</span>
                              </>
                            )}
                          </button>

                          <div className="text-center pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setConsumerAuthMode('password');
                                setErrorMessage(null);
                              }}
                              className="text-[11.5px] font-semibold text-slate-500 hover:text-[#FF7A00] transition-colors cursor-pointer"
                            >
                              {authCopy.backToPasswordLogin}
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Step 2: OTP Verification */
                        <form onSubmit={handleVerifyConsumerOtp} className="space-y-3.5 animate-in fade-in">
                          <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 text-[11.5px] text-orange-950 flex items-center justify-between">
                            <div>
                              {authCopy.otpDispatchedTo} <strong className="font-mono text-[#0A2540]">{maskedMobile}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsOtpSent(false);
                                setConsumerOtp('');
                                setErrorMessage(null);
                                loadCaptcha();
                              }}
                              className="text-[11px] text-[#FF7A00] underline font-bold cursor-pointer"
                            >
                              {authCopy.changeNumber}
                            </button>
                          </div>

                          <div className="space-y-1">
                            <label htmlFor={consumerOtpId} className="text-[12px] font-bold text-slate-700 block">
                              {authCopy.enterOtpLabel}
                            </label>
                            <input
                              id={consumerOtpId}
                              type="text"
                              required
                              maxLength={6}
                              autoFocus
                              value={consumerOtp}
                              onChange={(e) => setConsumerOtp(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••••"
                              className="w-full h-11 text-center tracking-[0.5em] text-[20px] font-mono font-bold rounded-xl bg-slate-50 border border-slate-200 text-[#0A2540] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00] focus:border-[#FF7A00] transition-all shadow-2xs"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11.5px]">
                            <span className="text-slate-500">{authCopy.didntReceiveCode}</span>
                            {cooldownSeconds > 0 ? (
                              <span className="text-slate-400 font-semibold">{authCopy.resendIn} {cooldownSeconds}s</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendConsumerOtp()}
                                className="text-[#FF7A00] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{authCopy.resendOtp}</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="submit"
                            disabled={isVerifyingOtp || consumerOtp.length !== 6}
                            className="w-full h-11 px-5 rounded-full bg-[#0A2540] hover:bg-[#061C38] text-white font-bold text-[14px] shadow-md shadow-[#0A2540]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isVerifyingOtp ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span>{authCopy.verifyAccessPortal}</span>
                              </>
                            )}
                          </button>
                        </form>
                      )
                    )
                  ) : (
                    /* --- STAFF FORM (Field Engineer, Officer, Management Cockpit, Admin) --- */
                    <form onSubmit={handleStaffLogin} className="space-y-3">
                      {/* Employee ID / Email */}
                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <User className="w-4 h-4" />
                          </div>
                          <input
                            id={staffIdentifierId}
                            type="text"
                            required
                            value={staffIdentifier}
                            onChange={(e) => setStaffIdentifier(e.target.value)}
                            placeholder={
                              selectedAccountType === 'admin'
                                ? authCopy.staffAdminPlaceholder
                                : selectedAccountType === 'field'
                                  ? authCopy.staffFieldPlaceholder
                                  : selectedAccountType === 'management'
                                    ? authCopy.staffManagementPlaceholder
                                    : authCopy.staffOfficerPlaceholder
                            }
                            className="w-full h-11 pl-10 pr-3.5 text-[13.5px] rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            id={staffPasswordId}
                            type={showStaffPassword ? 'text' : 'password'}
                            required
                            value={staffPassword}
                            onChange={(e) => setStaffPassword(e.target.value)}
                            placeholder={authCopy.passwordPlaceholder}
                            className="w-full h-11 pl-10 pr-10 text-[13.5px] rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowStaffPassword(!showStaffPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                          >
                            {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* MFA Token (if enabled) */}
                      <div className="space-y-1">
                        <div className="relative">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <input
                            id={staffMfaId}
                            type="text"
                            maxLength={8}
                            value={staffMfaCode}
                            onChange={(e) => setStaffMfaCode(e.target.value.replace(/\s/g, ''))}
                            placeholder={authCopy.mfaPlaceholder}
                            className="w-full h-10 pl-10 pr-3.5 text-[13px] font-mono rounded-xl bg-slate-50/60 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Remember me & Forgot Password */}
                      <div className="flex items-center justify-between text-[12px] pt-0.5">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#FF7A00] focus:ring-[#FF7A00]"
                          />
                          <span>{authCopy.rememberMe}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => showToast('Contact UGVCL IT Cell or Substation Admin to reset credentials.', 'info')}
                          className="text-[#0A2540] hover:text-[#FF7A00] font-semibold transition-colors cursor-pointer"
                        >
                          {authCopy.forgotPassword}
                        </button>
                      </div>

                      {/* Sign In Button */}
                      <button
                        type="submit"
                        disabled={isSubmittingStaff}
                        className="w-full h-11 px-5 rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF6B00] to-[#EA580C] hover:from-[#FF6B00] hover:to-[#D94F04] disabled:opacity-60 text-white font-bold text-[14.5px] shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isSubmittingStaff ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4" />
                            <span>{authCopy.signInBtn}</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Bottom Register Now Link matching reference */}
                  <div className="text-center pt-3">
                    <span className="text-[12.5px] text-slate-600 font-medium">
                      {authCopy.newToVidyutFlow}{' '}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signup');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[12.5px] font-bold text-[#0A2540] hover:text-[#FF7A00] transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{authCopy.registerNow}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#FF7A00]" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SIGN UP TAB (New Consumer Registration)                   */}
              {/* ========================================================= */}
              {activeTab === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-3 animate-in fade-in">
                  <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[11px] text-orange-950 font-medium">
                    {authCopy.citizenRegBanner}
                  </div>

                  {/* Full Name */}
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id={signupNameId}
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder={authCopy.fullNamePlaceholder}
                      className="w-full h-10 pl-10 pr-3.5 text-[13px] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id={signupEmailId}
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder={authCopy.emailPlaceholder}
                      className="w-full h-10 pl-10 pr-3.5 text-[13px] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[12.5px] font-bold text-slate-500 select-none">
                      +91
                    </span>
                    <input
                      id={signupMobileId}
                      type="tel"
                      required
                      maxLength={10}
                      value={signupMobile}
                      onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder={authCopy.mobileSignupPlaceholder}
                      className="w-full h-10 pl-12 pr-3.5 text-[13px] font-mono rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                    />
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      id={signupPasswordId}
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder={authCopy.passwordMinPlaceholder}
                      className="w-full h-10 px-3 text-[12.5px] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                    />
                    <input
                      id={signupConfirmPasswordId}
                      type="password"
                      required
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder={authCopy.confirmPlaceholder}
                      className="w-full h-10 px-3 text-[12.5px] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/30 focus:border-[#FF7A00] transition-all shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingSignup}
                    className="w-full h-11 px-5 rounded-full bg-gradient-to-r from-[#FF7A00] via-[#FF6B00] to-[#EA580C] hover:from-[#FF6B00] hover:to-[#D94F04] disabled:opacity-60 text-white font-bold text-[14px] shadow-md shadow-orange-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSubmittingSignup ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{authCopy.createAccountBtn}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[12.5px] text-[#0A2540] font-bold hover:text-[#FF7A00] transition-colors cursor-pointer"
                    >
                      {authCopy.alreadyHaveAccount}
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom compliance tag */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400 font-medium">
                <span>{authCopy.footerSecurity}</span>
                <span>{authCopy.footerRegulated}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VidyutFlowAuthModal;
