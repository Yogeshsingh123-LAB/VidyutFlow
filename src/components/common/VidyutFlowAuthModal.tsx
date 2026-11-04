import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import {
  X,
  LogIn,
  UserPlus,
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
  Phone,
  Home,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  KeyRound
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { sendConsumerLoginOtp, verifyConsumerLoginOtp, fetchCaptcha } from '../../utils/authClient';
import { UserRole } from '../../types';

interface VidyutFlowAuthModalProps {
  initialRole?: UserRole;
  initialTab?: 'login' | 'signup';
}

type AccountType = 'consumer' | 'field' | 'employee' | 'admin';

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
    icon: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  },
  {
    type: 'field',
    role: 'field',
    title: 'Field Engineer',
    badge: 'Operations',
    description: 'Substation workorders, 11kV radial feeders & DTC',
    icon: <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
  },
  {
    type: 'employee',
    role: 'employee',
    title: 'Officer',
    badge: 'ERP & Revenue',
    description: 'Billing audits, service triage & sanction review',
    icon: <Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-400" />
  },
  {
    type: 'admin',
    role: 'admin',
    title: 'Administrator',
    badge: 'Governance',
    description: 'Ledger integrity, user RBAC & GERC compliance',
    icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
  }
];

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
    signupDemoUser
  } = useApp();
  const { language } = useLanguage();

  // Top tabs: Sign In vs New Consumer Sign Up
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  // Selected account type among the 4 user categories
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>(() => {
    if (initialRole === 'field') return 'field';
    if (initialRole === 'employee' || initialRole === 'management') return 'employee';
    if (initialRole === 'admin') return 'admin';
    return 'consumer';
  });

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

  // Automatically load security CAPTCHA when Consumer login tab is active
  useEffect(() => {
    if (activeTab === 'login' && selectedAccountType === 'consumer' && !isOtpSent && !captchaToken) {
      loadCaptcha();
    }
  }, [activeTab, selectedAccountType, isOtpSent, captchaToken, loadCaptcha]);

  // Staff State (Field Engineer, Officer, Admin)
  const [staffIdentifier, setStaffIdentifier] = useState<string>('');
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
      else if (initialRole === 'employee' || initialRole === 'management') setSelectedAccountType('employee');
      else if (initialRole === 'admin') setSelectedAccountType('admin');
      else setSelectedAccountType('consumer');
    }
  }, [isRoleSwitcherModalOpen, initialRole]);

  if (!isRoleSwitcherModalOpen) return null;

  // Handle switching account type
  const handleSelectAccountType = (type: AccountType) => {
    setSelectedAccountType(type);
    setErrorMessage(null);
    setSuccessMessage(null);
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
        staffMfaCode.trim() || undefined
      );
      if (!result.success && result.error) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#0E1A33] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[620px] max-h-[92vh] overflow-y-auto flex flex-col text-left">
        
        {/* =============================================================== */}
        {/* OFFICIAL INSTITUTIONAL HEADER                                  */}
        {/* =============================================================== */}
        <div className="px-6 py-5 sm:px-8 sm:py-5.5 bg-[#0B172E] text-white flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Crisp UGVCL Crest Container */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white p-1.5 shadow-xs border border-white/20 flex items-center justify-center shrink-0">
              <img
                src="/assets/ugvcl-logo.png"
                alt="UGVCL Official Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2
                id="auth-modal-title"
                className="text-[17px] sm:text-[19px] font-bold text-white tracking-tight leading-snug truncate"
              >
                Sign in to VidyutFlow
              </h2>
              <span className="text-[12px] sm:text-[13px] text-slate-300 block font-normal leading-normal mt-0.5">
                Uttar Gujarat Vij Company Limited · Utility Access Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => setIsRoleSwitcherModalOpen(false)}
              className="text-[13px] font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Return to Public Portal"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRoleSwitcherModalOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* BODY WORKSPACE                                                 */}
        {/* =============================================================== */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Segmented Top Control: Sign In | New Consumer Registration */}
          <div className="w-full max-w-md mx-auto p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl grid grid-cols-2 gap-1.5 border border-slate-200/90 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`h-10 text-[14px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-[#101C35] text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700/80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`h-10 text-[14px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'signup'
                  ? 'bg-white dark:bg-[#101C35] text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700/80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>New Consumer Sign Up</span>
            </button>
          </div>

          {/* Structured Feedback Banners */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-[13px] flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[13px] flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 1: UNIFIED SIGN IN FORM                                    */}
          {/* ============================================================= */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              
              {/* Four Account Type Selection Cards */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ACCOUNT_TYPES.map((acc) => {
                    const isSelected = selectedAccountType === acc.type;
                    return (
                      <button
                        key={acc.type}
                        type="button"
                        onClick={() => handleSelectAccountType(acc.type)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-600/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white dark:bg-blue-900/60 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {acc.icon}
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight">
                            {acc.title}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {acc.badge}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Authentication Form According to Account Type */}
              {selectedAccountType === 'consumer' ? (
                /* --- CONSUMER OTP AUTHENTICATION --- */
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-4">
                  <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Consumer Authentication via Registered Mobile</span>
                    </h3>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Verify account ownership using single-use OTP sent to your registered mobile number.
                    </p>
                  </div>

                  {!isOtpSent ? (
                    <form onSubmit={handleSendConsumerOtp} className="space-y-4">
                      {/* Registered Mobile Number Input */}
                      <div className="space-y-1.5">
                        <label htmlFor={consumerMobileId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                          Registered Mobile Number
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-400">
                            +91
                          </span>
                          <input
                            id={consumerMobileId}
                            type="tel"
                            required
                            maxLength={10}
                            value={consumerMobile}
                            onChange={(e) => setConsumerMobile(e.target.value.replace(/\D/g, ''))}
                            placeholder="98250 14820"
                            className="w-full h-11 pl-12 pr-3.5 text-[14px] font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Enter your 10-digit mobile number registered with your electricity connection.
                        </span>
                      </div>

                      {/* Anti-Bot Security CAPTCHA Verification */}
                      <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label htmlFor={captchaInputId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                            Security Verification
                          </label>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Anti-bot protection</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Uncopyable SVG CAPTCHA container */}
                          <div
                            className="relative select-none rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1"
                            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                          >
                            {captchaSvg ? (
                              <div
                                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                                className="pointer-events-none select-none"
                              />
                            ) : (
                              <div className="w-[180px] h-[50px] flex items-center justify-center text-[12px] text-slate-400">
                                {isCaptchaLoading ? 'Generating...' : 'Loading CAPTCHA...'}
                              </div>
                            )}
                          </div>

                          {/* Reload CAPTCHA Button */}
                          <button
                            type="button"
                            onClick={loadCaptcha}
                            disabled={isCaptchaLoading}
                            title="Reload CAPTCHA"
                            className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className={`w-4 h-4 ${isCaptchaLoading ? 'animate-spin' : ''}`} />
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
                          placeholder="Enter characters shown above"
                          className="w-full h-11 px-3.5 text-[14px] font-mono tracking-widest uppercase rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          Case-insensitive. Type the 5 characters shown in the graphic image above.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingOtp || consumerMobile.length < 10 || !captchaAnswer.trim()}
                        className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-[14px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {isSendingOtp ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Send Verification OTP</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step 2: OTP Verification Form */
                    <form onSubmit={handleVerifyConsumerOtp} className="space-y-4 animate-in fade-in">
                      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[12px] text-blue-900 dark:text-blue-200 flex items-center justify-between">
                        <div>
                          OTP dispatched to registered mobile <strong className="font-mono">{maskedMobile}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOtpSent(false);
                            setConsumerOtp('');
                            setErrorMessage(null);
                            loadCaptcha();
                          }}
                          className="text-[11px] text-blue-700 dark:text-blue-400 underline font-semibold ml-2 cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label htmlFor={consumerOtpId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                            Enter 6-Digit OTP
                          </label>
                          <span className="text-[11px] font-medium text-slate-500">
                            Valid for 5 minutes
                          </span>
                        </div>
                        <input
                          id={consumerOtpId}
                          type="text"
                          required
                          maxLength={6}
                          autoFocus
                          value={consumerOtp}
                          onChange={(e) => setConsumerOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className="w-full h-12 text-center tracking-[0.5em] text-[20px] font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[12px] pt-1">
                        <span className="text-slate-500">Didn't receive code?</span>
                        {cooldownSeconds > 0 ? (
                          <span className="text-slate-400 font-medium">
                            Resend in {cooldownSeconds}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendConsumerOtp()}
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Resend OTP</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifyingOtp || consumerOtp.length !== 6}
                        className="w-full h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-[14px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isVerifyingOtp ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Verify & Access Consumer Portal</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
                    <span>New applicant without a consumer number?</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('signup')}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              ) : (
                /* --- STAFF AUTHENTICATION (Field Engineer, Officer, Admin) --- */
                <form onSubmit={handleStaffLogin} className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 space-y-4">
                  <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {activeAccountConfig.icon}
                      <span>{activeAccountConfig.title} Authentication</span>
                    </h3>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeAccountConfig.description}. Authorized DISCOM credentials required.
                    </p>
                  </div>

                  {/* Employee ID / Official Email */}
                  <div className="space-y-1.5">
                    <label htmlFor={staffIdentifierId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                      {selectedAccountType === 'admin'
                        ? 'Privileged Account ID / Email'
                        : 'Employee ID / Official Email'}
                    </label>
                    <div className="relative">
                      <input
                        id={staffIdentifierId}
                        type="text"
                        required
                        value={staffIdentifier}
                        onChange={(e) => setStaffIdentifier(e.target.value)}
                        placeholder={
                          selectedAccountType === 'admin'
                            ? 'e.g. adm-ugvcl-01 or admin@vidyutflow.demo'
                            : selectedAccountType === 'field'
                            ? 'e.g. ugvcl-eng-01 or field@vidyutflow.demo'
                            : 'e.g. emp-ugvcl-001 or employee@vidyutflow.demo'
                        }
                        className="w-full h-11 pl-3.5 pr-10 text-[14px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor={staffPasswordId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id={staffPasswordId}
                        type={showStaffPassword ? 'text' : 'password'}
                        required
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-11 pl-3.5 pr-10 text-[14px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        aria-label={showStaffPassword ? 'Hide password' : 'Show password'}
                      >
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* MFA Verification Code */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor={staffMfaId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                        MFA Verification Code
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        TOTP / Security Token
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id={staffMfaId}
                        type="text"
                        maxLength={8}
                        value={staffMfaCode}
                        onChange={(e) => setStaffMfaCode(e.target.value.replace(/\s/g, ''))}
                        placeholder="e.g. 123456 (if enabled)"
                        className="w-full h-11 pl-3.5 pr-10 text-[14px] font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <KeyRound className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingStaff}
                    className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-[14px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSubmittingStaff ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In as {activeAccountConfig.title}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-normal pt-1">
                    Permissions and organizational jurisdiction are strictly determined from authoritative backend records.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 2: NEW CONSUMER SIGN UP                                    */}
          {/* ============================================================= */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[12px] text-blue-950 dark:text-blue-200">
                <strong>Citizen Self-Service Registration:</strong> Register a consumer account to apply for a new connection, track service requests, and manage electricity accounts.
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor={signupNameId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Full Name (as per ID Proof)
                </label>
                <div className="relative">
                  <input
                    id={signupNameId}
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Smt. Meenaben Patel"
                    className="w-full h-11 pl-3.5 pr-10 text-[14px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label htmlFor={signupEmailId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id={signupEmailId}
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="e.g. citizen@example.com"
                    className="w-full h-11 pl-3.5 pr-10 text-[14px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label htmlFor={signupMobileId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-400">
                    +91
                  </span>
                  <input
                    id={signupMobileId}
                    type="tel"
                    required
                    maxLength={10}
                    value={signupMobile}
                    onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="98250 14820"
                    className="w-full h-11 pl-12 pr-3.5 text-[14px] font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor={signupPasswordId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id={signupPasswordId}
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-11 pl-3.5 pr-10 text-[14px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={signupConfirmPasswordId} className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block">
                    Confirm Password
                  </label>
                  <input
                    id={signupConfirmPasswordId}
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-11 px-3.5 text-[14px] rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingSignup}
                className="w-full h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-[14px] shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmittingSignup ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Consumer Account</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-[13px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}

          {/* Institutional Compliance Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>UGVCL VidyutFlow Security · 256-Bit TLS</span>
            <span>GERC Regulated Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
