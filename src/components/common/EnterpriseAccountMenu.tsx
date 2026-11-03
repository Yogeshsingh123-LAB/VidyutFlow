import React, { useState, useRef, useEffect, useId } from 'react';
import {
  LogOut,
  RefreshCw,
  Home,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Check,
  ChevronDown,
  AlertTriangle,
  Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';
import { ROLE_PROFILES } from '../../data/mockData';
import { getCanonicalDemoAccountsByRole, CanonicalDemoIdentity } from '../../data/demoAuthData';
import { isDevAuthModeSwitchEnabled } from '../../utils/authClient';
import { UserRole } from '../../types';

export interface AccountMenuLabels {
  triggerAriaLabel: string;
  menuAriaLabel: string;
  currentSessionHeader: string;
  canonicalIdLabel: string;
  unitLabel: string;
  demoSwitcherHeader: string;
  activeAccountBadge: string;
  sessionActionsHeader: string;
  cautionZoneHeader: string;
  resetConfirmPrompt: string;
  resetConfirmAction: string;
  resetCancelAction: string;
}

const ACCOUNT_MENU_LOCALIZED_LABELS: Record<LanguageCode, AccountMenuLabels> = {
  en: {
    triggerAriaLabel: 'User Account & Session Menu',
    menuAriaLabel: 'Enterprise Account and Session Menu',
    currentSessionHeader: 'Authenticated Session',
    canonicalIdLabel: 'ID',
    unitLabel: 'Unit / Circle',
    demoSwitcherHeader: 'Switch Permitted Demo Account',
    activeAccountBadge: 'Current',
    sessionActionsHeader: 'Navigation & Workspace',
    cautionZoneHeader: 'Demo Data Controls',
    resetConfirmPrompt: 'Restore all demo records to factory state?',
    resetConfirmAction: 'Confirm Reset',
    resetCancelAction: 'Cancel'
  },
  gu: {
    triggerAriaLabel: 'વપરાશકર્તા ખાતું અને સત્ર મેનુ',
    menuAriaLabel: 'એન્ટરપ્રાઇઝ ખાતું અને સત્ર મેનુ',
    currentSessionHeader: 'પ્રમાણિત સત્ર',
    canonicalIdLabel: 'ઓળખ ID',
    unitLabel: 'સબ-ડિવિઝન / સર્કલ',
    demoSwitcherHeader: 'ડેમો ખાતું બદલો',
    activeAccountBadge: 'સક્રિય',
    sessionActionsHeader: 'નેવિગેશન અને પોર્ટલ',
    cautionZoneHeader: 'ડેમો ડેટા નિયંત્રણ',
    resetConfirmPrompt: 'શું તમામ ડેમો રેકોર્ડ્સ મૂળ સ્થિતિમાં રીસેટ કરવા છે?',
    resetConfirmAction: 'હા, રીસેટ કરો',
    resetCancelAction: 'રદ કરો'
  },
  hi: {
    triggerAriaLabel: 'उपयोगकर्ता खाता और सत्र मेनू',
    menuAriaLabel: 'एंटरप्राइज़ खाता और सत्र मेनू',
    currentSessionHeader: 'प्रमाणित सत्र',
    canonicalIdLabel: 'आईडी',
    unitLabel: 'सब-डिवीजन / सर्कल',
    demoSwitcherHeader: 'डेमो खाता बदलें',
    activeAccountBadge: 'सक्रिय',
    sessionActionsHeader: 'नेविगेशन और पोर्टल',
    cautionZoneHeader: 'डेमो डेटा नियंत्रण',
    resetConfirmPrompt: 'क्या सभी डेमो रिकॉर्ड्स को प्रारंभिक स्थिति में रीसेट करें?',
    resetConfirmAction: 'रीसेट की पुष्टि करें',
    resetCancelAction: 'रद्द करें'
  },
  mr: {
    triggerAriaLabel: 'वापरकर्ता खाते आणि सत्र मेनू',
    menuAriaLabel: 'एंटरप्राइझ खाते आणि सत्र मेनू',
    currentSessionHeader: 'प्रमाणित सत्र',
    canonicalIdLabel: 'आयडी',
    unitLabel: 'सब-डिव्हिजन / सर्कल',
    demoSwitcherHeader: 'डेमो खाते बदला',
    activeAccountBadge: 'सक्रिय',
    sessionActionsHeader: 'नेव्हिगेशन आणि पोर्टल',
    cautionZoneHeader: 'डेमो डेटा नियंत्रण',
    resetConfirmPrompt: 'सर्व डेमो रेकॉर्ड मूळ स्थितीत रीसेट करायचे का?',
    resetConfirmAction: 'रीसेट निश्चित करा',
    resetCancelAction: 'रद्द करा'
  }
};

export function getAccountMenuLabels(language: LanguageCode): AccountMenuLabels {
  return ACCOUNT_MENU_LOCALIZED_LABELS[language] || ACCOUNT_MENU_LOCALIZED_LABELS.en;
}

export interface EnterpriseAccountMenuViewModel {
  sectionA: {
    initials: string;
    fullName: string;
    email: string;
    role: UserRole;
    roleLabel: string;
    canonicalId: string;
    designation: string;
    subdivision: string;
    isCustomUser: boolean;
  };
  sectionB: {
    visible: boolean;
    accounts: Array<{
      id: string;
      name: string;
      initials: string;
      designation: string;
      subdivision: string;
      isCurrent: boolean;
    }>;
  };
  sectionC: {
    hasWelcomePortalAction: boolean;
    hasResetDemoAction: boolean;
    hasSignOutAction: boolean;
    requiresResetConfirmation: boolean;
  };
}

export function buildEnterpriseAccountMenuViewModel(params: {
  currentRole: UserRole;
  localizedRoleLabel: string;
  activeUser: {
    id?: string;
    name: string;
    email?: string;
    initials?: string;
    designation?: string;
    subdivision?: string;
    isCustomUser?: boolean;
  };
  dataMode: 'DEMO' | 'LIVE';
  roleDemoAccounts?: CanonicalDemoIdentity[];
}): EnterpriseAccountMenuViewModel {
  const accounts = params.roleDemoAccounts ?? getCanonicalDemoAccountsByRole(params.currentRole);
  const canonicalId = params.activeUser.id || accounts[0]?.id || 'USR-DEMO';
  return {
    sectionA: {
      initials: params.activeUser.initials || accounts[0]?.avatarInitials || 'UF',
      fullName: params.activeUser.name,
      email: params.activeUser.email || accounts[0]?.email || '',
      role: params.currentRole,
      roleLabel: params.localizedRoleLabel,
      canonicalId,
      designation: params.activeUser.designation || accounts[0]?.designation || params.localizedRoleLabel,
      subdivision: params.activeUser.subdivision || 'UGVCL Corporate Jurisdiction',
      isCustomUser: Boolean(params.activeUser.isCustomUser)
    },
    sectionB: {
      visible: params.dataMode === 'DEMO' && accounts.length > 1,
      accounts: accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        initials: acc.avatarInitials,
        designation: acc.designation,
        subdivision: acc.subdivision,
        isCurrent: acc.id === canonicalId
      }))
    },
    sectionC: {
      hasWelcomePortalAction: true,
      hasResetDemoAction: true,
      hasSignOutAction: true,
      requiresResetConfirmation: true
    }
  };
}

interface EnterpriseAccountMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenAboutModal: () => void;
}

export const EnterpriseAccountMenu: React.FC<EnterpriseAccountMenuProps> = ({
  isOpen,
  onToggle,
  onClose,
  onOpenAboutModal
}) => {
  const {
    currentRole,
    setIsCommandPaletteOpen,
    setIsAIAssistantOpen,
    exitToWelcomeScreen,
    resetDemoData,
    logoutDemoSession,
    switchDemoUserAccount,
    authMode,
    setAuthMode,
    dataMode,
    setDataMode,
    activeUser
  } = useApp();
  const { t, language } = useLanguage();

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const profile = ROLE_PROFILES[currentRole];
  const roleLabelMap: Record<string, string> = {
    consumer: t.erp.roleConsumer,
    employee: t.erp.roleEmployee,
    field: t.erp.roleField,
    management: t.erp.roleManagement,
    admin: t.erp.roleAdmin
  };
  const localizedRoleLabel = roleLabelMap[currentRole] || profile.label;
  const roleDemoAccounts = getCanonicalDemoAccountsByRole(currentRole);
  const labels = getAccountMenuLabels(language);

  const viewModel = buildEnterpriseAccountMenuViewModel({
    currentRole,
    localizedRoleLabel,
    activeUser,
    dataMode,
    roleDemoAccounts
  });

  // Reset confirmation prompt whenever menu closes
  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingReset(false);
    }
  }, [isOpen]);

  // Outside click and Escape key handling with focus restoration
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Keyboard arrow navigation inside the open menu
  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!menuPanelRef.current) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') {
      return;
    }

    const focusableButtons = Array.from(
      menuPanelRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    );
    if (focusableButtons.length === 0) return;

    event.preventDefault();
    const currentIndex = focusableButtons.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'Home') {
      focusableButtons[0]?.focus();
    } else if (event.key === 'End') {
      focusableButtons[focusableButtons.length - 1]?.focus();
    } else if (event.key === 'ArrowDown') {
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % focusableButtons.length;
      focusableButtons[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      const prevIndex =
        currentIndex <= 0 ? focusableButtons.length - 1 : currentIndex - 1;
      focusableButtons[prevIndex]?.focus();
    }
  };

  return (
    <div className="relative shrink-0" ref={containerRef} data-testid="enterprise-account-menu">
      {/* Compact Enterprise Profile Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        data-testid="account-menu-trigger"
        className={`h-9 pl-1.5 pr-2 rounded-lg border transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${
          isOpen
            ? 'bg-slate-100 border-blue-300 text-slate-900 shadow-2xs'
            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
        }`}
        title={`${viewModel.sectionA.fullName} (${viewModel.sectionA.canonicalId} · ${viewModel.sectionA.roleLabel})`}
        aria-label={`${labels.triggerAriaLabel}: ${viewModel.sectionA.fullName}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
      >
        <div className="w-6.5 h-6.5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-2xs shrink-0">
          {viewModel.sectionA.initials}
        </div>
        <span className="hidden lg:inline-block text-xs font-semibold text-slate-800 max-w-[128px] truncate">
          {viewModel.sectionA.fullName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Panel — Viewport-Safe, Structured 3-Section Enterprise Layout */}
      {isOpen && (
        <div
          ref={menuPanelRef}
          id={menuId}
          role="menu"
          aria-label={labels.menuAriaLabel}
          onKeyDown={handleMenuKeyDown}
          data-testid="account-menu-dropdown"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-4.25rem)] overflow-y-auto bg-white rounded-xl border border-slate-200/95 shadow-xl z-50 divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          {/* ================================================================= */}
          {/* SECTION A — CURRENT AUTHENTICATED SESSION                         */}
          {/* ================================================================= */}
          <div className="p-3.5 bg-slate-50/60" data-testid="account-menu-section-session">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  {viewModel.sectionA.isCustomUser
                    ? t.erp.registeredAccount
                    : t.erp.authenticatedSession}
                </span>
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
                {viewModel.sectionA.canonicalId}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
                {viewModel.sectionA.initials}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug break-words">
                  {viewModel.sectionA.fullName}
                </div>
                <div className="text-[11px] text-slate-600 font-medium leading-snug break-words">
                  {viewModel.sectionA.roleLabel}
                </div>
                <div className="text-[11px] text-slate-500 font-mono break-all leading-tight">
                  {viewModel.sectionA.email}
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1 text-[11px] text-slate-600">
              <div className="flex items-start gap-1.5 leading-snug">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-medium text-slate-700 break-words">
                  {viewModel.sectionA.designation}
                </span>
              </div>
              {viewModel.sectionA.subdivision && (
                <div className="flex items-start gap-1.5 leading-snug">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-slate-600 break-words">
                    {viewModel.sectionA.subdivision}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* SECTION B — DEMO ACCOUNT SWITCHING                                */}
          {/* ================================================================= */}
          {viewModel.sectionB.visible && (
            <div className="p-3 space-y-2" data-testid="account-menu-section-switcher">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                  <span>
                    {currentRole === 'field'
                      ? t.erp.switchDemoEngineer || labels.demoSwitcherHeader
                      : t.erp.switchDemoAccount || labels.demoSwitcherHeader}
                  </span>
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0">
                  {t.erp.simulated}
                </span>
              </div>

              <div
                className="space-y-1 max-h-48 overflow-y-auto pr-0.5"
                role="group"
                aria-label={labels.demoSwitcherHeader}
              >
                {viewModel.sectionB.accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    role="menuitem"
                    aria-current={acc.isCurrent ? 'true' : undefined}
                    data-testid={`account-switch-option-${acc.id}`}
                    onClick={() => {
                      onClose();
                      if (!acc.isCurrent) {
                        switchDemoUserAccount(acc.id);
                      }
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer border ${
                      acc.isCurrent
                        ? 'bg-blue-50/90 border-blue-200 text-slate-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200/70 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          acc.isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {acc.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 leading-snug break-words">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono leading-tight break-words mt-0.5">
                          {acc.id} · {acc.subdivision}
                        </div>
                      </div>
                    </div>

                    {acc.isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-700 border border-blue-200/80 shrink-0">
                        <Check className="w-3 h-3 text-blue-600" aria-hidden="true" />
                        <span>{t.erp.active || labels.activeAccountBadge}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECTION C — NAVIGATION & SESSION ACTIONS                          */}
          {/* ================================================================= */}
          <div className="p-2 space-y-1 text-xs" data-testid="account-menu-section-actions">
            {/* Mobile-accessible tools moved out of the <640px header */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                setIsCommandPaletteOpen(true);
              }}
              className="sm:hidden w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left font-medium transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span>{t.erp.searchRecordsShort}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                setIsAIAssistantOpen(true);
              }}
              className="sm:hidden w-full flex items-center gap-2.5 px-2.5 py-2 text-teal-700 hover:bg-teal-50 rounded-lg text-left font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
              <span>{t.erp.vidyutMitraAi}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onOpenAboutModal();
              }}
              className="sm:hidden w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left font-medium transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span>{t.erp.platformBriefAndInfo}</span>
            </button>

            {/* Primary Navigation: Welcome Portal Homepage */}
            <button
              type="button"
              role="menuitem"
              data-testid="account-menu-welcome-home"
              onClick={() => {
                exitToWelcomeScreen();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-left font-medium transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span>{t.erp.welcomePortalHomepage}</span>
            </button>

            {/* Visually Separated Caution Area: Reset Demo Records with Confirmation Safeguard */}
            <div className="pt-1.5 mt-1.5 border-t border-slate-100">
              {!isConfirmingReset ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="account-menu-reset-trigger"
                  onClick={() => setIsConfirmingReset(true)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-amber-800 hover:bg-amber-50/90 rounded-lg text-left font-medium transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                    <span>{t.erp.resetDemoRecords}</span>
                  </span>
                </button>
              ) : (
                <div
                  role="group"
                  aria-label={labels.cautionZoneHeader}
                  data-testid="account-menu-reset-confirm-box"
                  className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 space-y-2"
                >
                  <div className="flex items-start gap-2 text-[11px] text-amber-900 font-medium leading-snug">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{labels.resetConfirmPrompt}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      data-testid="account-menu-reset-cancel"
                      onClick={() => setIsConfirmingReset(false)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {labels.resetCancelAction}
                    </button>
                    <button
                      type="button"
                      data-testid="account-menu-reset-confirm"
                      onClick={() => {
                        setIsConfirmingReset(false);
                        onClose();
                        resetDemoData();
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      {labels.resetConfirmAction}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Secure Sign Out / Switch Role */}
            <div className="pt-1.5 mt-1 border-t border-slate-100">
              <button
                type="button"
                role="menuitem"
                data-testid="account-menu-signout"
                onClick={() => {
                  onClose();
                  logoutDemoSession();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-rose-700 hover:bg-rose-50 rounded-lg text-left font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                <span>{t.erp.signOutSwitchRole}</span>
              </button>
            </div>
          </div>

          {/* Optional Dev Mode Controls & Subtle Platform Attribution */}
          <div className="px-3 py-2 bg-slate-50/70 space-y-1.5">
            {isDevAuthModeSwitchEnabled() && (
              <div className="space-y-1.5 pb-1 border-b border-slate-200/60">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono uppercase text-slate-400">Dev Auth Mode:</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setAuthMode(authMode === 'server' ? 'demo' : 'server');
                    }}
                    className={`font-semibold px-2 py-0.5 rounded border cursor-pointer ${
                      authMode === 'server'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {authMode === 'server' ? 'Server (/api/auth)' : 'Client Demo'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono uppercase text-slate-400">ERP Data Mode:</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setDataMode(dataMode === 'DEMO' ? 'LIVE' : 'DEMO');
                    }}
                    className={`font-semibold px-2 py-0.5 rounded border cursor-pointer ${
                      dataMode === 'LIVE'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {dataMode === 'LIVE' ? 'LIVE (/api/v1 DB)' : 'DEMO (Simulated)'}
                  </button>
                </div>
              </div>
            )}
            <div className="text-[10px] text-slate-400 text-center leading-tight">
              VidyutFlow · Independent UGVCL-Inspired ERP Prototype
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
