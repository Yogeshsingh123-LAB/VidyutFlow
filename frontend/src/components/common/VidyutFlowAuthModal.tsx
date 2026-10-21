import React, { useState, useEffect, useId } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Briefcase,
  Wrench,
  LineChart,
  ShieldCheck,
  Users,
  ArrowRight,
  Info,
  AlertTriangle,
  Lock,
  Mail,
  User,
  Phone,
  Home,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isDevAuthModeSwitchEnabled } from '../../utils/authClient';
import { UserRole } from '../../types';
import {
  DEFAULT_DEMO_ACCOUNTS,
  AUTH_DISCLAIMERS
} from '../../data/demoAuthData';

interface VidyutFlowAuthModalProps {
  initialRole?: UserRole;
  initialTab?: 'login' | 'signup';
}

interface RoleOptionConfig {
  role: UserRole;
  label: string;
  subtext: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOptionConfig[] = [
  {
    role: 'consumer',
    label: 'Consumer Portal (Self-Service)',
    subtext: 'Domestic billing, payment simulation & solar net-metering',
    icon: <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
  },
  {
    role: 'employee',
    label: 'Office Employee ERP (Revenue & Billing)',
    subtext: 'Revenue audits, consumer complaints & connection triage',
    icon: <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
  },
  {
    role: 'field',
    label: 'Field Engineer App (Workorders & DTC)',
    subtext: 'Substation inspections, 11kV radial feeders & DTC logs',
    icon: <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
  },
  {
    role: 'management',
    label: 'Management Cockpit (SCADA & AT&C)',
    subtext: 'High-voltage grid telemetry, AT&C loss & APFC optimization',
    icon: <LineChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  },
  {
    role: 'admin',
    label: 'System Administrator (Governance & Audit)',
    subtext: 'Cryptographic ledger, RBAC permissions & GERC tariff rules',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
    authMode,
    setAuthMode,
    loginDemoUser,
    signupDemoUser
  } = useApp();

  // Active tab: Sign In vs New Consumer Sign Up
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginRole, setLoginRole] = useState<UserRole>(initialRole || currentRole || 'consumer');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Collapsible demo account credentials helper (collapsed by default)
  const [isDemoCredentialsOpen, setIsDemoCredentialsOpen] = useState<boolean>(false);

  // Signup form state (Consumer only)
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupMobile, setSignupMobile] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>('');
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Auto-populate credentials when role changes
  const applyRoleDefaults = (roleKey: UserRole) => {
    setLoginRole(roleKey);
    const acc = DEFAULT_DEMO_ACCOUNTS[roleKey];
    if (acc) {
      setLoginEmail(acc.email);
      setLoginPassword(acc.password);
    }
    setLoginError(null);
  };

  // Pre-load default demo account when modal opens or role changes
  useEffect(() => {
    if (isRoleSwitcherModalOpen) {
      const targetRole = currentRole || initialRole || 'consumer';
      applyRoleDefaults(targetRole);
      setLoginError(null);
      setSignupError(null);
      setIsDemoCredentialsOpen(false); // Collapsed by default
    }
  }, [isRoleSwitcherModalOpen, currentRole, initialRole]);

  // Sync initial tab when changed externally
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const emailInputId = useId();
  const passwordInputId = useId();
  const roleSelectId = useId();
  const signupNameId = useId();
  const signupEmailId = useId();
  const signupMobileId = useId();
  const signupPasswordId = useId();
  const signupConfirmPasswordId = useId();

  if (!isRoleSwitcherModalOpen) return null;

  // Handle dropdown change
  const handleRoleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    applyRoleDefaults(newRole);
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim()) {
      setLoginError('Please enter your demonstration email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your demonstration password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginDemoUser(loginEmail, loginPassword, loginRole);
      if (!result.success && result.error) {
        setLoginError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!signupName.trim()) {
      setSignupError('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim()) {
      setSignupError('Please enter a valid email address.');
      return;
    }
    if (!signupPassword) {
      setSignupError('Please provide a password (minimum 6 characters).');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Password confirmation does not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signupDemoUser(
        signupName,
        signupEmail,
        signupPassword,
        signupMobile.trim() || undefined
      );
      if (!result.success && result.error) {
        setSignupError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoleConfig = ROLE_OPTIONS.find((r) => r.role === loginRole) || ROLE_OPTIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#0E1A33] border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col text-left">
        
        {/* =============================================================== */}
        {/* 1. REFINED INSTITUTIONAL HEADER (NO PINK VIDYUTFLOW BADGE)       */}
        {/* =============================================================== */}
        <div className="px-6 py-5 sm:px-8 sm:py-5.5 bg-[#0B172E] text-white flex items-center justify-between border-b border-blue-900/40">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Authentic UGVCL Logo - Prominent, crisp container */}
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
                Uttar Gujarat Vij Company Limited
              </h2>
              <span className="text-[13px] sm:text-[14px] font-gujarati text-slate-300 block font-normal leading-normal mt-0.5">
                ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => setIsRoleSwitcherModalOpen(false)}
              className="text-[13px] font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Return to Homepage"
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

        {/* Independent Demonstration Disclosure Banner */}
        <div className="px-6 sm:px-8 py-2.5 bg-slate-100/90 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[13px] text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="leading-snug">
            Independent demonstration environment for UGVCL utility workflows. Not an official discom portal.
          </span>
        </div>

        {/* =============================================================== */}
        {/* 2. AUTHENTICATION BODY: CLEAN SINGLE-COLUMN WITH BREATHING ROOM  */}
        {/* =============================================================== */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Centered Segmented Tab Control: Sign In | New Consumer Sign Up */}
          <div className="w-full max-w-md mx-auto p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl grid grid-cols-2 gap-1.5 border border-slate-200/90 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
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
                setSignupError(null);
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

          {/* ============================================================= */}
          {/* TAB 1: SIGN IN FORM                                            */}
          {/* ============================================================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              
              {/* Single Role Dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor={roleSelectId}
                  className="text-[14px] font-medium text-slate-700 dark:text-slate-300 block"
                >
                  Select Target Workspace / Portal
                </label>
                <div className="relative">
                  <select
                    id={roleSelectId}
                    value={loginRole}
                    onChange={handleRoleDropdownChange}
                    className="w-full h-12 appearance-none pl-4 pr-11 text-[15px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer transition-colors shadow-2xs"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.role} value={opt.role}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Collapsible Demo Account Credentials Helper (Collapsed by Default) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-slate-900/40 transition-colors">
                <button
                  type="button"
                  onClick={() => setIsDemoCredentialsOpen(!isDemoCredentialsOpen)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Use Demo Credentials
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">
                      (Quick-fill test accounts)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0 ml-2">
                    <span>{isDemoCredentialsOpen ? 'Hide' : 'Show Accounts'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isDemoCredentialsOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isDemoCredentialsOpen && (
                  <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-[#0c162d]">
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-normal px-1">
                      Click any role below to autofill demonstration credentials (default password:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Demo@12345</span>):
                    </p>
                    <div className="space-y-1.5">
                      {ROLE_OPTIONS.map((item) => {
                        const acc = DEFAULT_DEMO_ACCOUNTS[item.role];
                        const isCurrent = loginRole === item.role;
                        return (
                          <button
                            key={item.role}
                            type="button"
                            onClick={() => applyRoleDefaults(item.role)}
                            className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isCurrent
                                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500/20'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 shrink-0">
                                {item.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold truncate text-slate-900 dark:text-white">
                                  {item.label}
                                </div>
                                <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                                  {acc.name} · {acc.email}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right ml-2">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  isCurrent
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {isCurrent ? 'Active' : 'Autofill'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label
                  htmlFor={emailInputId}
                  className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Demonstration Email Address</span>
                </label>
                <input
                  id={emailInputId}
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError(null);
                  }}
                  placeholder="e.g. consumer@vidyutflow.demo"
                  className="w-full h-12 px-4 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  required
                />
              </div>

              {/* Password Input (No password display next to label) */}
              <div className="space-y-2">
                <label
                  htmlFor={passwordInputId}
                  className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    id={passwordInputId}
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError(null);
                    }}
                    placeholder="Enter demonstration password"
                    className="w-full h-12 pl-4 pr-12 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Error Alert */}
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[13px] text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Primary Sign-In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[15px] shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 pt-0.5 mt-2"
              >
                {isSubmitting ? (
                  <span>Authenticating Demo Session...</span>
                ) : (
                  <>
                    <span>Sign In to {selectedRoleConfig.label.split(' (')[0]}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================= */}
          {/* TAB 2: CONSUMER REGISTRATION FORM                             */}
          {/* ============================================================= */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4.5">
              
              {/* Institutional Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[13px] text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {AUTH_DISCLAIMERS.signupNotice}
                </span>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor={signupNameId}
                  className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Consumer Full Name *</span>
                </label>
                <input
                  id={signupNameId}
                  type="text"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    setSignupError(null);
                  }}
                  placeholder="e.g. Rameshchandra Patel"
                  className="w-full h-12 px-4 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  required
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor={signupEmailId}
                  className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email Address *</span>
                </label>
                <input
                  id={signupEmailId}
                  type="email"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    setSignupError(null);
                  }}
                  placeholder="e.g. ramesh.patel@example.com"
                  className="w-full h-12 px-4 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                  required
                />
              </div>

              {/* Mobile Number (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor={signupMobileId}
                  className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Registered Mobile Number (Optional)</span>
                </label>
                <input
                  id={signupMobileId}
                  type="tel"
                  value={signupMobile}
                  onChange={(e) => setSignupMobile(e.target.value)}
                  placeholder="e.g. 9876543210 (10-digit Indian Mobile)"
                  className="w-full h-12 px-4 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                />
              </div>

              {/* Password & Confirm Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor={signupPasswordId}
                    className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Password *</span>
                  </label>
                  <div className="relative">
                    <input
                      id={signupPasswordId}
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => {
                        setSignupPassword(e.target.value);
                        setSignupError(null);
                      }}
                      placeholder="Min. 6 characters"
                      className="w-full h-12 pl-4 pr-11 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={signupConfirmPasswordId}
                    className="text-[14px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Confirm Password *</span>
                  </label>
                  <input
                    id={signupConfirmPasswordId}
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => {
                      setSignupConfirmPassword(e.target.value);
                      setSignupError(null);
                    }}
                    placeholder="Repeat password"
                    className="w-full h-12 px-4 text-[15px] font-normal rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-2xs"
                    required
                  />
                </div>
              </div>

              {/* Error Banner */}
              {signupError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[13px] text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              {/* Local Storage Disclaimer */}
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-normal">
                {AUTH_DISCLAIMERS.storageDisclaimer}
              </p>

              {/* Primary Signup Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[15px] shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 mt-2"
              >
                <UserPlus className="w-4 h-4 stroke-[2.2]" />
                <span>Register Demonstration Consumer Account</span>
              </button>
            </form>
          )}

        </div>

        {/* =============================================================== */}
        {/* 3. SIMPLIFIED INSTITUTIONAL FOOTER & DEV AUTH MODE SWITCH       */}
        {/* =============================================================== */}
        <div className="px-6 py-4 sm:px-8 sm:py-4 bg-slate-50 dark:bg-[#071329] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-500 dark:text-slate-400">
          {isDevAuthModeSwitchEnabled() ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Dev Auth Mode:
              </span>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'server' ? 'demo' : 'server')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  authMode === 'server'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
                title="Development-only switch between Server Auth (/api/auth HttpOnly cookie + scrypt) and Client Demo Sandbox without resetting browser data"
              >
                {authMode === 'server'
                  ? 'Server Auth (/api/auth · HttpOnly)'
                  : 'Client Demo Mode (Sandbox)'}
              </button>
            </div>
          ) : (
            <span className="text-[12px] text-slate-500 dark:text-slate-400">
              VidyutFlow · Independent UGVCL-Inspired ERP Prototype
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsRoleSwitcherModalOpen(false)}
            className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
          >
            Close Dialog
          </button>
        </div>

      </div>
    </div>
  );
};
