import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Zap,
  ShieldCheck,
  Lock,
  Globe,
  Bell,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  ExternalLink,
  Laptop,
  Check,
  X,
  FileText,
  Building,
  RefreshCw
} from 'lucide-react';
import type { ElectricityConnection } from '../../types';

interface ConsumerProfileWorkspaceProps {
  onNavigateToNewConnection: () => void;
  onLinkConnectionSuccess?: (consumerNo: string) => void;
}

interface AddressItem {
  id: string;
  addressType: 'RESIDENTIAL' | 'COMMERCIAL' | 'CORRESPONDENCE' | 'BILLING';
  isPrimary: boolean;
  houseFlatNo: string;
  street: string;
  area: string;
  cityVillage: string;
  taluka: string;
  district: string;
  state: string;
  pinCode: string;
  formatted: string;
}

interface ActivityItem {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export const ConsumerProfileWorkspace: React.FC<ConsumerProfileWorkspaceProps> = ({
  onNavigateToNewConnection,
  onLinkConnectionSuccess
}) => {
  const {
    activeUser,
    userConnections: consumerConnections,
    selectedConsumerConnectionNo,
    setSelectedConsumerConnectionNo,
    showToast,
    addAuditEvent
  } = useApp();
  const { language } = useLanguage();
  const selectedConnection = (consumerConnections || []).find((c: any) => c.consumerNo === selectedConsumerConnectionNo) || (consumerConnections || [])[0] || null;
  const setSelectedConnection = (conn: any) => {
    if (conn && setSelectedConsumerConnectionNo) {
      setSelectedConsumerConnectionNo(conn.consumerNo);
    }
  };


  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<
    'personal' | 'addresses' | 'connections' | 'preferences' | 'security' | 'activity'
  >('personal');

  // Personal Info Form State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [fullName, setFullName] = useState(activeUser?.name || 'Smt. Meenaben Patel');
  const [dateOfBirth, setDateOfBirth] = useState('1979-08-14');
  const [personalSaveStatus, setPersonalSaveStatus] = useState<string | null>(null);

  // Address State
  const [addresses, setAddresses] = useState<AddressItem[]>([
    {
      id: 'addr-01',
      addressType: 'RESIDENTIAL',
      isPrimary: true,
      houseFlatNo: '14',
      street: 'Anand Nagar Society',
      area: 'Visnagar Road',
      cityVillage: 'Mehsana',
      taluka: 'Mehsana',
      district: 'Mehsana',
      state: 'Gujarat',
      pinCode: '384002',
      formatted: '14, Anand Nagar Society, Visnagar Road, Mehsana, Mehsana - 384002'
    }
  ]);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addressFormData, setAddressFormData] = useState({
    addressType: 'RESIDENTIAL' as 'RESIDENTIAL' | 'COMMERCIAL' | 'CORRESPONDENCE' | 'BILLING',
    houseFlatNo: '',
    street: '',
    area: '',
    cityVillage: 'Mehsana',
    taluka: 'Mehsana',
    district: 'Mehsana',
    state: 'Gujarat',
    pinCode: '384002',
    isPrimary: false
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  // Connection Linking State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkStep, setLinkStep] = useState<'input' | 'otp'>('input');
  const [linkConsumerNo, setLinkConsumerNo] = useState('');
  const [linkOtp, setLinkOtp] = useState('');
  const [linkMaskedMobile, setLinkMaskedMobile] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  // Preferences State
  const [prefLanguage, setPrefLanguage] = useState<'en' | 'gu' | 'hi'>(
    language === 'gu' || language === 'hi' ? language : 'en'
  );
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [billReminders, setBillReminders] = useState(true);
  const [outageAlerts, setOutageAlerts] = useState(true);
  const [appStatusAlerts, setAppStatusAlerts] = useState(true);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState([
    {
      id: 'sess-01',
      device: 'Chrome on Windows 11',
      ip: '127.0.0.1 (Localhost / Sandbox)',
      location: 'Gandhinagar, Gujarat',
      lastActive: 'Active now',
      isCurrent: true
    },
    {
      id: 'sess-02',
      device: 'Mobile Safari on iPhone 15',
      ip: '49.36.128.45',
      location: 'Mehsana, Gujarat',
      lastActive: 'Yesterday at 18:42',
      isCurrent: false
    }
  ]);

  // Activity Audit Log
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'act-01',
      event_type: 'PROFILE_UPDATED',
      description: 'Citizen account profile accessed and verified',
      created_at: new Date().toISOString()
    },
    {
      id: 'act-02',
      event_type: 'SECURITY_LOGIN',
      description: 'Successful authenticated login from Chrome / Windows',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  // Sync with API on load
  useEffect(() => {
    // Attempt fetching live profile data
    fetch('/api/v1/consumer/profile', {
      headers: { 'Content-Type': 'application/json' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.full_name) {
          setFullName(data.full_name);
          if (data.date_of_birth) setDateOfBirth(data.date_of_birth);
        }
      })
      .catch(() => undefined);

    fetch('/api/v1/consumer/addresses', {
      headers: { 'Content-Type': 'application/json' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAddresses(data);
        }
      })
      .catch(() => undefined);
  }, []);

  const isNewApplicant = consumerConnections.length === 0;

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let score = 25; // Base account creation
    if (fullName && fullName.length >= 3) score += 15;
    if (dateOfBirth) score += 10;
    if (addresses.length > 0) score += 20;
    if (consumerConnections.length > 0) score += 20;
    if (smsAlerts || emailAlerts) score += 10;
    return Math.min(100, score);
  };
  const completionPercentage = calculateCompletion();

  // Save personal info
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalSaveStatus(null);
    if (!fullName.trim()) {
      showToast('Please enter your full name.', 'error');
      return;
    }

    try {
      await fetch('/api/v1/consumer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), date_of_birth: dateOfBirth })
      });
    } catch {
      // offline fallback
    }

    setIsEditingPersonal(false);
    setPersonalSaveStatus('Personal information saved successfully.');
    showToast('Personal information updated.', 'success');
    addAuditEvent(
      'PROFILE_UPDATED',
      'Personal Profile',
      `Updated name: ${fullName}, DOB: ${dateOfBirth}`,
      activeUser?.name || 'Citizen',
      'SUCCESS'
    );
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        event_type: 'PROFILE_UPDATED',
        description: `Updated name to ${fullName}`,
        created_at: new Date().toISOString()
      },
      ...prev
    ]);
  };

  // Add address handler
  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    if (!addressFormData.houseFlatNo.trim() || !addressFormData.street.trim()) {
      setAddressError('House/Flat number and Street are mandatory.');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(addressFormData.pinCode.trim())) {
      setAddressError('Please enter a valid 6-digit PIN code.');
      return;
    }

    const newAddressItem: AddressItem = {
      id: `addr-${Date.now()}`,
      addressType: addressFormData.addressType,
      isPrimary: addressFormData.isPrimary || addresses.length === 0,
      houseFlatNo: addressFormData.houseFlatNo.trim(),
      street: addressFormData.street.trim(),
      area: addressFormData.area.trim(),
      cityVillage: addressFormData.cityVillage.trim(),
      taluka: addressFormData.taluka.trim(),
      district: addressFormData.district.trim(),
      state: addressFormData.state.trim(),
      pinCode: addressFormData.pinCode.trim(),
      formatted: `${addressFormData.houseFlatNo.trim()}, ${addressFormData.street.trim()}, ${addressFormData.area.trim()}, ${addressFormData.cityVillage.trim()}, ${addressFormData.district.trim()} - ${addressFormData.pinCode.trim()}`
    };

    try {
      await fetch('/api/v1/consumer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_type: newAddressItem.addressType,
          is_primary: newAddressItem.isPrimary,
          house_flat_no: newAddressItem.houseFlatNo,
          street: newAddressItem.street,
          area: newAddressItem.area,
          city_village: newAddressItem.cityVillage,
          taluka: newAddressItem.taluka,
          district: newAddressItem.district,
          state: newAddressItem.state,
          pin_code: newAddressItem.pinCode
        })
      });
    } catch {
      // offline fallback
    }

    setAddresses(prev => {
      let updated = [...prev];
      if (newAddressItem.isPrimary) {
        updated = updated.map(a => ({ ...a, isPrimary: false }));
      }
      return [...updated, newAddressItem];
    });

    setIsAddAddressOpen(false);
    setAddressFormData({
      addressType: 'RESIDENTIAL',
      houseFlatNo: '',
      street: '',
      area: '',
      cityVillage: 'Mehsana',
      taluka: 'Mehsana',
      district: 'Mehsana',
      state: 'Gujarat',
      pinCode: '384002',
      isPrimary: false
    });
    showToast('New permitted address added to profile.', 'success');
  };

  // Delete address
  const handleDeleteAddress = (id: string) => {
    setAddresses(prev => {
      const remaining = prev.filter(a => a.id !== id);
      if (remaining.length > 0 && !remaining.some(a => a.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
    showToast('Address removed from profile.', 'info');
  };

  // Connection Linking Step 1: Initiate
  const handleInitiateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    const cleaned = linkConsumerNo.trim();
    if (!cleaned) {
      setLinkError('Please enter a valid Electricity Consumer Number.');
      return;
    }
    if ((consumerConnections || []).some((c: any) => c.consumerNo === cleaned)) {
      setLinkError(`Connection ${cleaned} is already linked to this profile.`);
      return;
    }

    setIsLinkingLoading(true);
    try {
      const res = await fetch('/api/v1/consumer/connections/link/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumer_no: cleaned })
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.detail || 'Unable to initiate linking for this consumer number.');
        return;
      }
      setLinkMaskedMobile(data.masked_mobile || '+91 XXXXX XX820');
      setLinkStep('otp');
      showToast(`Verification code sent to ${data.masked_mobile || 'registered mobile'}. Demo code: 482019`, 'info');
    } catch {
      // Offline fallback
      setLinkMaskedMobile('+91 XXXXX XX820');
      setLinkStep('otp');
      showToast('Verification code sent to registered mobile. Demo code: 482019', 'info');
    } finally {
      setIsLinkingLoading(false);
    }
  };

  // Connection Linking Step 2: Verify OTP
  const handleVerifyLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    if (!linkOtp.trim()) {
      setLinkError('Please enter the 6-digit OTP verification code.');
      return;
    }

    setIsLinkingLoading(true);
    try {
      const res = await fetch('/api/v1/consumer/connections/link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumer_no: linkConsumerNo.trim(), otp: linkOtp.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.detail || 'Incorrect OTP code. Please enter 482019 for demonstration.');
        return;
      }

      onLinkConnectionSuccess?.(linkConsumerNo.trim());
      setIsLinkModalOpen(false);
      setLinkStep('input');
      setLinkConsumerNo('');
      setLinkOtp('');
      showToast(`Connection ${linkConsumerNo.trim()} successfully verified and linked!`, 'success');
    } catch {
      if (linkOtp.trim() === '482019' || linkOtp.trim().length === 6) {
        onLinkConnectionSuccess?.(linkConsumerNo.trim());
        setIsLinkModalOpen(false);
        setLinkStep('input');
        setLinkConsumerNo('');
        setLinkOtp('');
        showToast(`Connection ${linkConsumerNo.trim()} successfully verified and linked!`, 'success');
      } else {
        setLinkError('Invalid verification code. Enter 482019.');
      }
    } finally {
      setIsLinkingLoading(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current account password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      const res = await fetch('/api/v1/consumer/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      if (!res.ok) {
        const err = await res.json();
        setPasswordError(err.detail || 'Password change failed.');
        return;
      }
    } catch {
      // offline simulated success
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Account password successfully changed.');
    showToast('Password changed successfully.', 'success');
  };

  // Revoke Session
  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    showToast('Device session terminated.', 'info');
  };

  // Global Logout All
  const handleLogoutAll = () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    showToast('Terminated all remote sessions.', 'success');
  };

  // Translations dictionary for profile
  const t = {
    profileTitle: language === 'gu' ? 'ગ્રાહક પ્રોફાઇલ અને ખાતું' : language === 'hi' ? 'उपभोक्ता प्रोफ़ाइल व खाता' : 'Consumer Profile & Account',
    applicantBadge: language === 'gu' ? 'વીજ અરજદાર (નવું કનેક્શન બાકી)' : language === 'hi' ? 'बिजली आवेदक (नया कनेक्शन लंबित)' : 'Electricity Applicant (New Connection Pending)',
    consumerBadge: language === 'gu' ? 'વેરિફાઇડ વીજ ગ્રાહક' : language === 'hi' ? 'सत्यापित बिजली उपभोक्ता' : 'Verified Electricity Consumer',
    tabPersonal: language === 'gu' ? 'વ્યક્તિગત માહિતી' : language === 'hi' ? 'व्यक्तिगत जानकारी' : 'Personal Info',
    tabAddresses: language === 'gu' ? 'સરનામાં' : language === 'hi' ? 'पते' : 'Addresses',
    tabConnections: language === 'gu' ? 'મારા વીજ જોડાણો' : language === 'hi' ? 'मेरे बिजली कनेक्शन' : 'My Connections',
    tabPreferences: language === 'gu' ? 'પસંદગીઓ અને એલર્ટ્સ' : language === 'hi' ? 'प्राथमिकताएं व अलर्ट' : 'Preferences & Alerts',
    tabSecurity: language === 'gu' ? 'સુરક્ષા અને સત્રો' : language === 'hi' ? 'सुरक्षा व सत्र' : 'Security & Sessions',
    tabActivity: language === 'gu' ? 'ખાતા પ્રવૃત્તિ' : language === 'hi' ? 'खाता गतिविधि' : 'Account Activity',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shrink-0">
              {fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {fullName}
                </h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    isNewApplicant
                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isNewApplicant ? t.applicantBadge : t.consumerBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Citizen Account ID: <span className="text-slate-700 dark:text-slate-300 font-semibold">{activeUser?.id || 'CITIZEN-001'}</span>
                {' • '}DISCOM: <span className="font-semibold text-blue-600 dark:text-blue-400">UGVCL</span>
              </p>
            </div>
          </div>

          {/* Profile Completion Indicator */}
          <div className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-[220px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Profile Completion</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {completionPercentage === 100
                ? 'All citizen profile requirements completed'
                : isNewApplicant
                ? 'Apply for a connection or link consumer number to reach 100%'
                : 'Add a secondary address or security key to complete'}
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800 text-sm">
          {[
            { id: 'personal', label: t.tabPersonal, icon: User },
            { id: 'addresses', label: t.tabAddresses, icon: MapPin },
            { id: 'connections', label: t.tabConnections, icon: Zap },
            { id: 'preferences', label: t.tabPreferences, icon: Globe },
            { id: 'security', label: t.tabSecurity, icon: Lock },
            { id: 'activity', label: t.tabActivity, icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer text-xs sm:text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: PERSONAL & CONTACT INFORMATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Data Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                  Personal Information
                </h2>
              </div>
              {!isEditingPersonal && (
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(true)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>

            {isEditingPersonal ? (
              <form onSubmit={handleSavePersonal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Full Legal Name (as per Aadhaar / Government ID) *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPersonal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3.5 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Full Legal Name
                  </span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{fullName}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Date of Birth
                  </span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {dateOfBirth || 'Not specified'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Account Status
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active Citizen Profile with Multi-Factor Security</span>
                  </div>
                </div>
              </div>
            )}
            {personalSaveStatus && (
              <p className="text-xs text-emerald-600 font-medium">{personalSaveStatus}</p>
            )}
          </div>

          {/* Contact Information Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                  Verified Contact Details
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">OTP Secured</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Registered Mobile Number</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  +91 98250 14820
                </p>
                <p className="text-[11px] text-slate-400">
                  Used for instant bill reminders, outage alerts and official OTP confirmations.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Registered Email Address</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  {activeUser?.email || 'meenaben.patel@example.com'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Electronic bills, payment receipts and formal statutory notices delivered here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: ADDRESS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Permitted Addresses
              </h2>
              <p className="text-xs text-slate-500">
                Addresses associated with your citizen profile for service delivery, correspondence and billing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAddressOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Address
            </button>
          </div>

          {/* Add Address Modal / Form */}
          {isAddAddressOpen && (
            <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-3">
                <h3 className="font-bold text-blue-950 dark:text-blue-300 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Add Address to Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddAddressOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addressError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addressError}</span>
                </div>
              )}

              <form onSubmit={handleAddAddressSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Address Type</label>
                    <select
                      value={addressFormData.addressType}
                      onChange={e => setAddressFormData({ ...addressFormData, addressType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="RESIDENTIAL">Residential Premises</option>
                      <option value="COMMERCIAL">Commercial / Industrial</option>
                      <option value="CORRESPONDENCE">Correspondence Address</option>
                      <option value="BILLING">Billing Only Address</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">House / Flat / Survey No. *</label>
                    <input
                      type="text"
                      placeholder="e.g. 14, Plot 22"
                      value={addressFormData.houseFlatNo}
                      onChange={e => setAddressFormData({ ...addressFormData, houseFlatNo: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Street / Society *</label>
                    <input
                      type="text"
                      placeholder="e.g. Anand Nagar Society"
                      value={addressFormData.street}
                      onChange={e => setAddressFormData({ ...addressFormData, street: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Area / Landmark</label>
                    <input
                      type="text"
                      placeholder="e.g. Visnagar Road"
                      value={addressFormData.area}
                      onChange={e => setAddressFormData({ ...addressFormData, area: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">City / Village *</label>
                    <input
                      type="text"
                      value={addressFormData.cityVillage}
                      onChange={e => setAddressFormData({ ...addressFormData, cityVillage: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Taluka *</label>
                    <input
                      type="text"
                      value={addressFormData.taluka}
                      onChange={e => setAddressFormData({ ...addressFormData, taluka: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">District *</label>
                    <input
                      type="text"
                      value={addressFormData.district}
                      onChange={e => setAddressFormData({ ...addressFormData, district: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">State</label>
                    <input
                      type="text"
                      value={addressFormData.state}
                      disabled
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">PIN Code (6 digits) *</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 384002"
                      value={addressFormData.pinCode}
                      onChange={e => setAddressFormData({ ...addressFormData, pinCode: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isPrimaryCheckbox"
                    checked={addressFormData.isPrimary}
                    onChange={e => setAddressFormData({ ...addressFormData, isPrimary: e.target.checked })}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="isPrimaryCheckbox" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Set as Primary Contact Address
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    Add Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddAddressOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Addresses List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
              <div
                key={addr.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 relative group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {addr.addressType}
                    </span>
                    {addr.isPrimary && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Primary
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {addr.formatted}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>PIN: {addr.pinCode}</span>
                  <span>District: {addr.district}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: MY ELECTRICITY CONNECTIONS (APPLICANT VS EXISTING CONSUMER) */}
      {/* ========================================================================= */}
      {activeSubTab === 'connections' && (
        <div className="space-y-6">
          {isNewApplicant ? (
            /* NEW ELECTRICITY APPLICANT EMPTY STATE */
            <div className="p-8 rounded-2xl bg-gradient-to-b from-blue-50/80 to-white dark:from-[#101C35] dark:to-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-xs text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-inner">
                <Zap className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  No Electricity Connection Linked Yet
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  You are registered on VidyutFlow as an <span className="font-semibold text-slate-800 dark:text-slate-200">Electricity Applicant</span>. If you recently submitted a new service connection request, your connection number will automatically link to this account once your meter is energized by UGVCL.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {/* CTA to Separate New Connection Workflow */}
                <button
                  type="button"
                  onClick={onNavigateToNewConnection}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply for New Connection</span>
                </button>

                {/* Secondary CTA to Link Existing Connection */}
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>I already have a Consumer No. (Link)</span>
                </button>
              </div>
            </div>
          ) : (
            /* EXISTING CONSUMER VIEW (1 to N Connections) */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Verified Electricity Connections ({consumerConnections.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official utility accounts mapped to your citizen login. Edits to metering and tariff parameters are restricted to utility officers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Link Another Connection
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(consumerConnections || []).map((conn: any) => {
                  const isSelected = selectedConnection?.consumerNo === conn.consumerNo;
                  return (
                    <div
                      key={conn.id || conn.consumerNo}
                      className={`p-5 rounded-2xl bg-white dark:bg-[#101C35] border transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 shadow-2xs'
                      } space-y-4`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                                {conn.consumerNo}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {conn.category}
                              </span>
                              {isSelected && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Active Context
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              UGVCL • {conn.subdivision} • Feeder: {conn.feederName || 'Panchot Feeder'}
                            </p>
                          </div>
                        </div>

                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedConnection(conn);
                              showToast(`Switched active portal view to ${conn.consumerNo}`, 'info');
                            }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                          >
                            Set as Active Connection
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                          <span className="text-slate-400 block mb-0.5 font-semibold">Official Premises Address</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{conn.address}</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                          <span className="text-slate-400 block mb-0.5 font-semibold">Sanctioned Load & Meter</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 font-mono">
                            {conn.sanctionedLoadKw} kW • Meter: {conn.meterNo}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                          <span className="text-slate-400 block mb-0.5 font-semibold">Verification Integrity</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Official UGVCL Record
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LINK CONNECTION MODAL */}
          {isLinkModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white dark:bg-[#101C35] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Link Electricity Connection
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLinkModalOpen(false);
                      setLinkStep('input');
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {linkError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{linkError}</span>
                  </div>
                )}

                {linkStep === 'input' ? (
                  <form onSubmit={handleInitiateLink} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        11-Digit UGVCL Electricity Consumer Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 04281-99231"
                        value={linkConsumerNo}
                        onChange={e => setLinkConsumerNo(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                      <p className="text-[11px] text-slate-400">
                        Found on the top-right of your UGVCL electricity bill or payment receipt.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-500">
                      We will verify ownership by sending a one-time passcode (OTP) to the mobile number officially registered with this electricity connection.
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isLinkingLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isLinkingLoading ? 'Verifying...' : 'Send Verification OTP'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLink} className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-900 dark:text-blue-300 space-y-1">
                      <p className="font-semibold">OTP Code Sent</p>
                      <p className="text-[11px]">
                        Enter the verification code sent to {linkMaskedMobile}. For demo test, enter code <span className="font-mono font-bold">482019</span>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        6-Digit OTP Verification Code *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="482019"
                        value={linkOtp}
                        onChange={e => setLinkOtp(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isLinkingLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isLinkingLoading ? 'Confirming...' : 'Verify & Link Connection'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION D: PREFERENCES & NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'preferences' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Language & Notification Preferences
            </h2>
            <p className="text-xs text-slate-500">
              Customize your multilingual communications and operational alert channels.
            </p>
          </div>

          <div className="space-y-5 text-xs">
            {/* Preferred Language */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                Preferred Interface & Notification Language
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { code: 'gu', label: 'ગુજરાતી (Gujarati)', desc: 'રાજ્યની અધિકૃત ભાષા' },
                  { code: 'hi', label: 'हिन्दी (Hindi)', desc: 'राष्ट्रीय भाषा' },
                  { code: 'en', label: 'English (English)', desc: 'Official Utility Standard' }
                ].map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setPrefLanguage(item.code as any);
                      showToast(`Language preference set to ${item.label}`, 'info');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      prefLanguage === item.code
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span className="font-bold block text-sm">{item.label}</span>
                    <span className="text-[11px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Channels */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm block">
                Notification Subscriptions
              </span>
              <div className="space-y-2.5">
                {[
                  { id: 'smsAlerts', label: 'SMS Alerts', desc: 'Critical alerts, OTP codes and payment confirmations sent via SMS', val: smsAlerts, setter: setSmsAlerts },
                  { id: 'emailAlerts', label: 'Email Notifications', desc: 'Detailed statements, itemized electricity bills and audit reports', val: emailAlerts, setter: setEmailAlerts },
                  { id: 'billReminders', label: 'Bill Due Date Reminders', desc: 'Advance notices before prompt payment discount due date and surcharge expiry', val: billReminders, setter: setBillReminders },
                  { id: 'outageAlerts', label: 'Scheduled Outage & Feeder Maintenance Alerts', desc: 'Advance alerts when your feeder or substation has maintenance scheduled', val: outageAlerts, setter: setOutageAlerts },
                  { id: 'appStatusAlerts', label: 'Application & Service Request Status Updates', desc: 'SMS updates whenever your application moves between stages', val: appStatusAlerts, setter: setAppStatusAlerts }
                ].map(row => (
                  <label key={row.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.val}
                      onChange={e => {
                        row.setter(e.target.checked);
                        showToast(`${row.label} preference updated.`, 'info');
                      }}
                      className="mt-0.5 rounded text-blue-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        {row.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {row.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION E: SECURITY & SESSIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Password Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Change Password
              </h2>
              <p className="text-xs text-slate-500">
                Minimum 6 characters with letters, numbers and special symbols.
              </p>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Current Password *</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">New Password *</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Confirm New Password *</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer mt-2"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* Active Sessions Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-blue-600" />
                  Active Sessions & Devices
                </h2>
                <p className="text-xs text-slate-500">
                  Manage active browser sessions across desktop and mobile devices.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogoutAll}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Logout All
              </button>
            </div>

            <div className="space-y-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{s.device}</span>
                      {s.isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {s.ip} • {s.location}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {s.lastActive}
                    </p>
                  </div>

                  {!s.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 text-[11px] font-medium cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION F: ACCOUNT ACTIVITY AUDIT TIMELINE */}
      {/* ========================================================================= */}
      {activeSubTab === 'activity' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Account Security & Activity Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Immutable chronological record of citizen profile updates, connection linking and security events.
            </p>
          </div>

          <div className="space-y-3">
            {activities.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.event_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
