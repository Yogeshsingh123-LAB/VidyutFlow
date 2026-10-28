import { submitLiveRequest } from '../../utils/liveData';
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  localizeTariffCategory,
  localizeConnectionStatus,
  localizePhase,
  localizeSubdivision,
  localizeFeederName,
  localizeConsumerAddress,
  localizeBillMonth,
  localizeBillStatus,
  localizePaymentMethod,
  localizePaymentStatus,
  localizeApplicationStatus,
  localizeDocumentName,
  localizeComplaintCategory,
  localizeComplaintStatus,
  localizeComplaintDescription,
  localizeConsumerNotification,
  localizeConsumptionMonth,
  localizeLinkConnectionError
} from '../../i18n/consumerContentTranslations';
import { CONSUMPTION_HISTORY } from '../../data/mockData';
import {
  Zap,
  CreditCard,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Download,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Sparkles,
  Layers,
  Phone,
  Mail,
  ChevronRight,
  Info,
  Check,
  Building,
  UploadCloud,
  FileCheck,
  User,
  Bell,
  CheckCheck,
  ExternalLink,
  Printer,
  Link2,
  Activity,
  X,
  Receipt,
  Plug,
  Gauge,
  Trash2,
  XCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { TariffCategory, ElectricityConnection, ElectricityBill, PaymentTransaction } from '../../types';

export const ConsumerPortal: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    connections,
    applications,
    bills,
    payments,
    complaints,
    notifications,
    userConnections,
    userApplications,
    userBills,
    userPayments,
    userComplaints,
    userNotifications,
    linkConnectionDemo,
    demoSession,
    markNotificationRead,
    markSelectedNotificationsRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteSelectedNotifications,
    clearAllNotifications,
    payBillDemo,
    submitApplicationDemo,
    submitComplaintDemo,
    openCaseDrawer,
    showToast,
    activeUser
  } = useApp();

  const { language, t } = useLanguage();
  const tc = t.consumer;

  const localizedConsumptionHistory = useMemo(
    () =>
      CONSUMPTION_HISTORY.map(item => ({
        ...item,
        displayMonth: localizeConsumptionMonth(item.month, language)
      })),
    [language]
  );

  const [consumerNotifFilter, setConsumerNotifFilter] = useState<'all' | 'unread' | 'applications'>('all');
  const [selectedConsumerNotifIds, setSelectedConsumerNotifIds] = useState<string[]>([]);

  // Logged-in consumer identity (Single source of truth)
  const currentUserName = activeUser.name;
  const currentUserEmail = activeUser.email;
  const currentUserId = demoSession?.user.id || 'anonymous';
  const currentConsumerInitials = activeUser.initials;
  const isDefaultDemoConsumer = currentUserId === 'demo_consumer' || (currentUserEmail ? currentUserEmail.toLowerCase() === 'consumer@vidyutflow.demo' : false);

  // Scoped datasets for the active consumer session
  const consumerConnections = userConnections || [];
  const consumerApplications = userApplications || [];
  const consumerBills = userBills || [];
  const consumerPayments = userPayments || [];
  const consumerComplaints = userComplaints || [];
  const consumerNotifications = userNotifications || [];

  const hasConnections = consumerConnections.length > 0;

  const [selectedConnectionNo, setSelectedConnectionNo] = useState<string>(
    () => consumerConnections[0]?.consumerNo || ''
  );

  // Sync selected connection when consumerConnections changes or when selected connection is no longer valid
  useEffect(() => {
    if (consumerConnections.length > 0) {
      if (!consumerConnections.some(c => c.consumerNo === selectedConnectionNo)) {
        setSelectedConnectionNo(consumerConnections[0].consumerNo);
      }
    } else {
      setSelectedConnectionNo('');
    }
  }, [consumerConnections, selectedConnectionNo]);

  const selectedConnection: ElectricityConnection | null = hasConnections
    ? (consumerConnections.find(c => c.consumerNo === selectedConnectionNo) || consumerConnections[0])
    : null;

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBillToPay, setSelectedBillToPay] = useState<string | null>(null);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<PaymentTransaction['paymentMethod']>('UPI / BHIM');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ElectricityBill | null>(null);

  // Link Existing Connection Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkConsumerNo, setLinkConsumerNo] = useState('');
  const [linkSubdivision, setLinkSubdivision] = useState('Mehsana City North');
  const [linkPhone, setLinkPhone] = useState(demoSession?.user.mobileNumber || '');
  const [linkOtp, setLinkOtp] = useState('');
  const [isLinkOtpSent, setIsLinkOtpSent] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // New connection form states (Multi-step interactive wizard)
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [applicantName, setApplicantName] = useState(
    demoSession?.user.name || (isDefaultDemoConsumer ? 'Smt. Meenaben Patel' : '')
  );
  const [applicantPhone, setApplicantPhone] = useState(
    demoSession?.user.mobileNumber || (isDefaultDemoConsumer ? '+91 98250 14820' : '')
  );
  const [applicantEmail, setApplicantEmail] = useState(
    demoSession?.user.email || (isDefaultDemoConsumer ? 'consumer@vidyutflow.demo' : '')
  );
  const [identityProofType, setIdentityProofType] = useState('Aadhaar Card');
  const [identityNumber, setIdentityNumber] = useState(
    isDefaultDemoConsumer ? 'XXXX-XXXX-8421' : ''
  );
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState(
    isDefaultDemoConsumer ? 'Late Shri Kantilal Patel' : ''
  );

  const [subdivision, setSubdivision] = useState('Mehsana City North');
  const [address, setAddress] = useState(
    isDefaultDemoConsumer ? '14, Anand Nagar Society, Visnagar Road, Mehsana' : ''
  );
  const [pincode, setPincode] = useState('384002');
  const [premisesType, setPremisesType] = useState<'Owned' | 'Rented' | 'Government Leased'>('Owned');

  // Keep applicant form synced with logged-in user session
  useEffect(() => {
    if (demoSession?.user) {
      setApplicantName(demoSession.user.name);
      setApplicantEmail(demoSession.user.email);
      if (demoSession.user.mobileNumber) {
        setApplicantPhone(demoSession.user.mobileNumber);
        setLinkPhone(demoSession.user.mobileNumber);
      }
      if (isDefaultDemoConsumer) {
        setAddress('14, Anand Nagar Society, Visnagar Road, Mehsana');
        setFatherOrHusbandName('Late Shri Kantilal Patel');
        setIdentityNumber('XXXX-XXXX-8421');
      } else {
        setAddress(selectedConnection?.address || '');
        setFatherOrHusbandName('');
        setIdentityNumber('');
      }
    }
  }, [demoSession?.user.id, isDefaultDemoConsumer]);

  const [category, setCategory] = useState<TariffCategory>('Residential (RGPU)');
  const [loadKw, setLoadKw] = useState<number>(6);
  const [phase, setPhase] = useState<'1-Phase' | '3-Phase'>('3-Phase');
  const [purpose, setPurpose] = useState('Domestic / Residential Lighting & Power');
  const [solarInterest, setSolarInterest] = useState(false);

  // Document attachments preview state
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([
    'Aadhaar Card (PDF, 420 KB)',
    'Registered Ownership Deed / Index-II (PDF, 1.2 MB)',
    'Government Licensed Electrical Contractor Test Certificate (PDF, 850 KB)'
  ]);

  // Complaint form states
  const [cmpCategory, setCmpCategory] = useState<'Power Outage' | 'Voltage Fluctuation' | 'Meter Fault' | 'Billing Dispute'>('Voltage Fluctuation');
  const [cmpPriority, setCmpPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [cmpDesc, setCmpDesc] = useState('');

  // Primary active bill for selected connection
  const currentBill: ElectricityBill | null = selectedConnection
    ? (consumerBills.find(b => b.consumerNo === selectedConnection.consumerNo && b.status === 'Unpaid') || consumerBills.find(b => b.consumerNo === selectedConnection.consumerNo) || null)
    : null;


  // Dynamic Sanction Cost Calculation Breakdown
  const serviceCharge = loadKw * 1150;
  const securityDeposit = loadKw * 800 + 1300;
  const meterTestingFee = 800;
  const totalSanctionEstimate = serviceCharge + securityDeposit + meterTestingFee;

  const handlePayClick = (billNo: string) => {
    setSelectedBillToPay(billNo);
    setIsPayModalOpen(true);
  };

  const confirmPayment = () => {
    if (selectedBillToPay) {
      payBillDemo(selectedBillToPay, selectedPaymentGateway);
      setIsPayModalOpen(false);
      const paidBill = bills.find(b => b.billNo === selectedBillToPay);
      if (paidBill) {
        setSelectedReceipt({
          ...paidBill,
          status: 'Paid',
          paidDate: '15-Oct-2026',
          transactionRef: `TXN-UPI-${Math.floor(1000000000 + Math.random() * 9000000000)}`
        });
        setIsReceiptModalOpen(true);
      }
    }
  };

  const handleViewReceipt = (bill: ElectricityBill) => {
    setSelectedReceipt(bill);
    setIsReceiptModalOpen(true);
  };

  const handleLoadPresetChange = (kw: number) => {
    setLoadKw(kw);
    // Auto select phase: <=5kW is 1-Phase, >5kW is 3-Phase
    if (kw <= 5) {
      setPhase('1-Phase');
    } else {
      setPhase('3-Phase');
    }
  };

  const handleNewConnectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantPhone || !address) {
      showToast(tc.mandatoryFieldsToast, 'error');
      return;
    }

    // Also submit to the live VidyutFlow API
    void submitLiveRequest({
      applicant_name: applicantName,
      phone: applicantPhone,
      address: `${address}, Pin - ${pincode}`,
      zone: subdivision.toLowerCase().includes('south') ? 'South' : 'North',
      pin_code: pincode,
      request_type: 'new_connection',
      description: `New ${category} connection via consumer wizard`,
      requested_load_kw: Number(loadKw),
      tariff_category: category,
      phase,
      premises_type: premisesType,
      document_name: uploadedDocs[0] || ''
    })
      .then((r: any) => {
        showToast(
          `Live API recorded the request (ref ${r.id.slice(0, 8)}) — ML: ${r.category}/${r.severity} · SLA risk ${Math.round((r.sla_breach_risk ?? 0) * 100)}%`,
          'success'
        );
      })
      .catch(() => {
        showToast('Live API unreachable — application recorded in the demo workspace only', 'info');
      });

    const newId = submitApplicationDemo({
      applicantName,
      phone: applicantPhone,
      email: applicantEmail,
      address: `${address}, Pin - ${pincode}`,
      subdivision,
      category,
      requestedLoadKw: Number(loadKw),
      phase,
      premisesType,
      estimatedSanctionCost: totalSanctionEstimate,
      documentsSubmitted: uploadedDocs
    });

    // Reset step
    setFormStep(1);
    // Switch to connections tab to track
    setActiveTab('connections');
    // Open case drawer directly for the newly created application
    setTimeout(() => {
      openCaseDrawer('application', newId);
    }, 400);
  };

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmpDesc.trim()) {
      showToast(tc.provideIssueDescToast, 'error');
      return;
    }
    const newId = submitComplaintDemo({
      consumerNo: selectedConnection?.consumerNo || 'UNLINKED',
      consumerName: selectedConnection?.consumerName || currentUserName,
      category: cmpCategory,
      priority: cmpPriority,
      description: cmpDesc.trim(),
      subdivision: selectedConnection?.subdivision || subdivision,
      feederName: selectedConnection?.feederName || 'Local Feeder'
    });
    setCmpDesc('');
    setTimeout(() => {
      openCaseDrawer('complaint', newId);
    }, 400);
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Account & Connection Summary Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white p-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0">
            <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            {hasConnections && selectedConnection ? (
              <>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex-wrap">
                  <span>{tc.ugvclPrefix} {localizeSubdivision(selectedConnection.subdivision, language)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{localizeTariffCategory(selectedConnection.tariffCategory, language)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {localizeConnectionStatus(selectedConnection.status, language)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                    {selectedConnection.consumerName}
                  </h1>
                  <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200/80 dark:border-blue-800/80">
                    {tc.consumerNoLabel} {selectedConnection.consumerNo}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start sm:items-center gap-2 flex-wrap leading-relaxed">
                  <span className="inline-flex items-start sm:items-center gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-words">{localizeConsumerAddress(selectedConnection.address, language)}</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">|</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {tc.meterLabel} {selectedConnection.meterNo} ({selectedConnection.sanctionedLoadKw} kW · {localizePhase(selectedConnection.phase, language)})
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex-wrap">
                  <span>{tc.selfServicePortal}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {tc.noConnectionLinked}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                    {tc.consumerAccountLabel} {currentUserName}
                  </h1>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {tc.idLabel} {currentUserId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start sm:items-center gap-1.5 flex-wrap leading-relaxed">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="break-words">{currentUserEmail || tc.registeredCitizenAccount} · {tc.independentErpDemo}</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right: Active Meter Selector or Onboarding Actions */}
        <div className="flex items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0 min-w-0">
          {hasConnections ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto min-w-0">
              <label
                htmlFor="active-meter-select"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 shrink-0"
              >
                <Gauge className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{tc.activeMeterLabel}</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                <select
                  id="active-meter-select"
                  value={selectedConnection?.consumerNo}
                  onChange={e => {
                    setSelectedConnectionNo(e.target.value);
                  }}
                  aria-label={tc.selectActiveMeterAria}
                  className="min-h-11 sm:min-h-9 min-w-0 w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors cursor-pointer"
                >
                  {consumerConnections.map(c => (
                    <option key={c.consumerNo} value={c.consumerNo}>
                      {c.consumerNo} — {localizeTariffCategory(c.tariffCategory, language)} ({c.sanctionedLoadKw} kW)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveTab('connections')}
                  className="min-h-11 sm:min-h-9 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
                  title={tc.manageConnectionsTitle}
                >
                  {tc.manageConnectionsBtn} ({consumerConnections.length})
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('new-connection')}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{tc.applyForConnectionBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{tc.linkExistingBtn}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUBVIEW 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 sm:space-y-6">
          {/* New Consumer Onboarding Banner (Shown when no connection is linked) */}
          {!hasConnections && (
            <div className="p-6 rounded-xl bg-gradient-to-r from-blue-50/90 via-slate-50 to-blue-50/70 dark:from-[#0f1f3d] dark:via-[#0e1a33] dark:to-[#0f1f3d] border border-blue-200/80 dark:border-blue-900/50 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 font-mono">
                    {tc.onboardingTag}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {tc.noElectricityConnectionLinked}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {tc.welcomeUser} {currentUserName}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {tc.onboardingDesc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('new-connection')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{tc.applyForNewConnectionBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <span>{tc.linkExistingConnectionBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary KPI Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Current Electricity Bill */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      {tc.currentElectricityBill}
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold inline-flex items-center gap-1.5 ${
                    !hasConnections
                      ? 'text-slate-500 dark:text-slate-400'
                      : currentBill?.status === 'Unpaid'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      !hasConnections
                        ? 'bg-slate-400'
                        : currentBill?.status === 'Unpaid'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`} />
                    {!hasConnections ? tc.noActiveConnection : currentBill?.status === 'Unpaid' ? tc.paymentDue : tc.paid}
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 my-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {hasConnections && currentBill ? `₹${currentBill.totalAmount.toLocaleString()}` : '₹0'}
                  </div>
                  {hasConnections && currentBill && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {tc.forMonthPrefix} {localizeBillMonth(currentBill.billMonth, language)}
                    </span>
                  )}
                </div>

                {hasConnections && currentBill ? (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">{tc.billedConsumption}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {currentBill.unitsConsumed} kWh
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">{tc.invoiceNumber}</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                        {currentBill.billNo}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {tc.noBillsGeneratedDesc}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {hasConnections && currentBill?.dueDate ? (
                    <>{tc.dueDateLabel} <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentBill.dueDate}</strong></>
                  ) : (
                    tc.dueNonePending
                  )}
                </span>
                {hasConnections && currentBill?.status === 'Unpaid' ? (
                  <button
                    onClick={() => handlePayClick(currentBill.billNo)}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    <span>{tc.payOnlineBtn}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                ) : hasConnections && currentBill ? (
                  <button
                    onClick={() => handleViewReceipt(currentBill)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    {tc.viewReceiptBtn}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('new-connection')}
                    className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                  >
                    {tc.applyConnectionLink}
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Connected Feeder & Supply Status */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      {tc.connectedFeeder}
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold inline-flex items-center gap-1.5 ${
                    hasConnections
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasConnections ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {hasConnections ? tc.normalSupply : tc.unassigned}
                  </span>
                </div>

                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                  {hasConnections && selectedConnection ? localizeFeederName(selectedConnection.feederName, language) : tc.noFeederAssigned}
                </div>

                {hasConnections && selectedConnection ? (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">{tc.lineVoltageLabel}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {tc.voltageStableValue}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">{tc.gridFrequencyLabel}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        50.02 Hz
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {tc.noFeederTelemetryDesc}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="text-slate-400">{tc.scheduledOutagesLabel} </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {hasConnections ? tc.noneInNext48h : tc.notApplicable}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  {tc.reportIssueLink}
                </button>
              </div>
            </div>

            {/* Card 3: Service & Grievance Tracking */}
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      {tc.serviceTracking}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {tc.liveStatus}
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 my-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {consumerApplications.length} {consumerApplications.length === 1 ? tc.activeFileSingular : tc.activeFilePlural}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">{tc.openGrievances}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {consumerComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length} {tc.inTriageSuffix}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">{tc.latestApplication}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 break-words leading-snug block">
                      {consumerApplications[0] ? localizeApplicationStatus(consumerApplications[0].status, language) : tc.noneSubmitted}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveTab('connections')}
                  className="text-xs text-blue-600 dark:text-cyan-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  {tc.trackApplicationsLink}
                </button>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  {tc.grievanceDeskLink}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Consumer Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {tc.quickConsumerServices}
              </h2>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                {tc.directSelfServiceWorkflows}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <button
                type="button"
                onClick={() => setActiveTab('new-connection')}
                className="group p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-snug break-words">
                      {tc.quickApplyTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      {tc.quickApplySub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!hasConnections) {
                    showToast(tc.noActiveBillToast, 'info');
                  } else {
                    setActiveTab('bills');
                  }
                }}
                className="group p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-snug break-words">
                      {tc.quickPayTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      {tc.quickPaySub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('complaints')}
                className="group p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-snug break-words">
                      {tc.quickOutageTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      {tc.quickOutageSub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="group p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-snug break-words">
                      {tc.quickSolarTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      {tc.quickSolarSub}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </div>

          {/* Consumption Trend & Energy Analytics */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {tc.consumptionTrendTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {hasConnections && selectedConnection
                    ? `${tc.consumptionTrendSubConnected} ${selectedConnection.meterNo}`
                    : tc.consumptionTrendSubUnlinked}
                </p>
              </div>
              {hasConnections && selectedConnection && (
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">{tc.sixMonthAverage}</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">418 kWh {tc.perMonthSuffix}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">{tc.latestMeterReading}</span>
                    <span className="font-bold text-blue-600 dark:text-cyan-400 tabular-nums">
                      {selectedConnection.currentReadingKwh.toLocaleString()} kWh
                    </span>
                  </div>
                </div>
              )}
            </div>

            {hasConnections ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={localizedConsumptionHistory} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.18} />
                    <XAxis
                      dataKey="displayMonth"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
                      dy={6}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={62}
                      tickFormatter={(val: number) => `${val} kWh`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
                        padding: '10px 14px'
                      }}
                      formatter={(value, name, props) => {
                        const payload = props?.payload as { amount?: number; avgTempC?: number } | undefined;
                        const extra = payload?.amount ? ` · ${tc.chartBilledPrefix} ₹${payload.amount.toLocaleString()}` : '';
                        return [`${value ?? 0} kWh${extra}`, String(name ?? tc.chartConsumedEnergy)];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="units"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#2563EB' }}
                      fillOpacity={1}
                      fill="url(#colorUnits)"
                      name={tc.chartConsumedEnergy}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 px-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {tc.noConsumptionTelemetryTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                  {tc.noConsumptionTelemetryDesc}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-connection')}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {tc.applyForNewConnectionBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {tc.linkExistingConnectionBtn}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Independent Demonstration Disclosure Bar */}
          <div className="px-4 py-3 rounded-xl bg-slate-100/80 dark:bg-[#0D172B] border border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>{tc.demoDisclosureTitle}</strong> {tc.demoDisclosureBody}
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">
              {tc.tariffReferenceLabel}
            </span>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: MY CONNECTIONS & SANCTION TRACKING */}
      {(activeTab === 'connections' || activeTab === 'applications') && (
        <div className="space-y-8">
          {/* Active Connections Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {tc.myRegisteredConnectionsTitle}
                </h2>
                <p className="text-xs text-slate-500">
                  {tc.myRegisteredConnectionsSub} ({applicantPhone})
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-connection')}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{tc.applyForNewConnectionBtn}</span>
              </button>
            </div>

            {consumerConnections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consumerConnections.map(conn => (
                  <div
                    key={conn.consumerNo}
                    className={`p-5 rounded-xl border transition-all duration-150 space-y-4 ${
                      selectedConnection?.consumerNo === conn.consumerNo
                        ? 'border-blue-600 dark:border-blue-500 bg-white dark:bg-[#101C35] ring-2 ring-blue-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C35] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {localizeTariffCategory(conn.tariffCategory, language)}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {conn.consumerName}
                        </h3>
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          {tc.consumerNoLabel} {conn.consumerNo}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {localizeConnectionStatus(conn.status, language)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[11px]">{tc.sanctionedLoad}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{conn.sanctionedLoadKw} kW ({localizePhase(conn.phase, language)})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">{tc.meterSerial}</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{conn.meterNo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">{tc.currentReading}</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{conn.currentReadingKwh} kWh</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">{tc.securityDeposit}</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">₹{conn.securityDeposit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">{localizeConsumerAddress(conn.address, language)}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedConnectionNo(conn.consumerNo);
                          setActiveTab('bills');
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        {tc.viewInvoicesLink}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedConnectionNo(conn.consumerNo);
                          showToast(`${tc.activatedAccountToastPrefix} ${conn.consumerNo} ${tc.activatedAccountToastSuffix}`, 'info');
                        }}
                        className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 font-medium"
                      >
                        {tc.selectActiveAccountBtn}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {tc.noConnectionsEmptyTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {tc.noConnectionsEmptyDescPrefix} ({currentUserEmail}) {tc.noConnectionsEmptyDescSuffix}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-connection')}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{tc.applyForNewConnectionBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-slate-500" />
                    <span>{tc.linkExistingConnectionBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submitted In-Progress Applications Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{tc.myApplicationsTitle}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {tc.myApplicationsSub}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {consumerApplications.length} {consumerApplications.length === 1 ? tc.activeApplicationSingular : tc.activeApplicationPlural}
              </span>
            </div>

            {consumerApplications.length > 0 ? (
              <div className="space-y-4">
                {consumerApplications.map(app => {
                  const stepNames = ['Submitted', 'Document Verification', 'Site Inspection', 'Sanction Approval', 'Meter Installed'];
                  const progressPct = Math.min(100, Math.max(20, (app.workflowStep / 5) * 100));

                  return (
                    <div
                      key={app.id}
                      className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                              {app.id}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {tc.stepPrefix} {app.workflowStep}{tc.ofFivePrefix} {localizeApplicationStatus(app.status, language)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            {tc.applicantLabel} <strong>{app.applicantName}</strong> · {tc.requestedLoadLabel} <strong>{app.requestedLoadKw} kW ({localizePhase(app.phase, language)})</strong> · {localizeTariffCategory(app.category, language)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openCaseDrawer('application', app.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <span>{tc.inspectFileBtn}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Stepper */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                          <span>{tc.workflowProgress}</span>
                          <span>{progressPct}% {tc.completedSuffix}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px] sm:text-[10px] text-center pt-1">
                          {stepNames.map((sName, idx) => {
                            const sNum = idx + 1;
                            const isDone = sNum <= app.workflowStep;
                            const isCurrent = sNum === app.workflowStep;
                            return (
                              <div
                                key={sName}
                                className={`leading-tight break-words px-2 py-1.5 rounded ${
                                  isCurrent
                                    ? 'font-bold text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/60'
                                    : isDone
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                                    : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                                }`}
                              >
                                {localizeApplicationStatus(sName, language)}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Details Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">{tc.subDivisionLabel}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{localizeSubdivision(app.subdivision, language)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{tc.appliedDateLabel}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{app.appliedDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{tc.targetDateLabel}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{app.targetCompletionDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{tc.estSanctionFeeLabel}</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">₹{app.estimatedSanctionCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {tc.noActiveApplicationsTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tc.noActiveApplicationsDesc}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new-connection')}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{tc.startNewApplicationBtn}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: NEW CONNECTION FORM (PART C WORKFLOW) */}
      {activeTab === 'new-connection' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {tc.newConnFormTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {tc.newConnFormSub}
              </p>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              {[
                { step: 1, title: tc.step1Tab },
                { step: 2, title: tc.step2Tab },
                { step: 3, title: tc.step3Tab },
                { step: 4, title: tc.step4Tab }
              ].map(s => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setFormStep(s.step as any)}
                  className={`py-2 px-2 text-center rounded-lg text-xs font-semibold transition-all ${
                    formStep === s.step
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <form onSubmit={handleNewConnectionSubmit} className="space-y-6">
              {/* STEP 1: APPLICANT IDENTITY */}
              {formStep === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.fullNameLabel}
                      </label>
                      <input
                        type="text"
                        value={applicantName}
                        onChange={e => setApplicantName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.fatherHusbandNameLabel}
                      </label>
                      <input
                        type="text"
                        value={fatherOrHusbandName}
                        onChange={e => setFatherOrHusbandName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.mobileNumberLabel}
                      </label>
                      <input
                        type="tel"
                        value={applicantPhone}
                        onChange={e => setApplicantPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.emailAddressLabel}
                      </label>
                      <input
                        type="email"
                        value={applicantEmail}
                        onChange={e => setApplicantEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.identityDocLabel}
                      </label>
                      <select
                        value={identityProofType}
                        onChange={e => setIdentityProofType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Aadhaar Card">{tc.idAadhaarOption}</option>
                        <option value="PAN Card">{tc.idPanOption}</option>
                        <option value="Voter ID Card">{tc.idVoterOption}</option>
                        <option value="Passport">{tc.idPassportOption}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.identityDocNumberLabel}
                      </label>
                      <input
                        type="text"
                        value={identityNumber}
                        onChange={e => setIdentityNumber(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>{tc.proceedToPremisesBtn}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PREMISES & SUBDIVISION */}
              {formStep === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.operationalSubDivisionLabel}
                      </label>
                      <select
                        value={subdivision}
                        onChange={e => setSubdivision(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Mehsana City North">{tc.subdivMehsanaNorthHq}</option>
                        <option value="Gandhinagar Sub-Division 2">{tc.subdivGandhinagar2}</option>
                        <option value="Visnagar Division">{tc.subdivVisnagar}</option>
                        <option value="Kalol Sub-Division">{tc.subdivKalol}</option>
                        <option value="Kadi Division">{tc.subdivKadi}</option>
                        <option value="Patan Urban Zone">{tc.subdivPatan}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.premisesOwnershipLabel}
                      </label>
                      <select
                        value={premisesType}
                        onChange={e => setPremisesType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Owned">{tc.ownershipOwnedOption}</option>
                        <option value="Rented">{tc.ownershipRentedOption}</option>
                        <option value="Government Leased">{tc.ownershipGovOption}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {tc.fullStreetAddressLabel}
                    </label>
                    <textarea
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      rows={2}
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.postalPinCodeLabel}
                      </label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={e => setPincode(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.nearestLandmarkLabel}
                      </label>
                      <input
                        type="text"
                        placeholder={tc.nearestLandmarkPlaceholder}
                        defaultValue="Opp. Radhanpur Cross Road DP"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      {tc.backBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStep(3)}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>{tc.proceedToTechSpecsBtn}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: LOAD & TECHNICAL SPECS */}
              {formStep === 3 && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.tariffCategoryLabel}
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as TariffCategory)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Residential (RGPU)">{tc.tariffResidentialOption}</option>
                        <option value="Commercial (NRGP)">{tc.tariffCommercialOption}</option>
                        <option value="Industrial (LTMD)">{tc.tariffIndustrialOption}</option>
                        <option value="Agricultural (AG)">{tc.tariffAgriculturalOption}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.purposeOfSupplyLabel}
                      </label>
                      <select
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Domestic / Residential Lighting & Power">{tc.purposeDomesticOption}</option>
                        <option value="Commercial Shop / Office / Retail">{tc.purposeCommercialOption}</option>
                        <option value="Small Scale Workshop / MSME Unit">{tc.purposeMsmeOption}</option>
                        <option value="Agricultural Borewell & Farmhouse">{tc.purposeAgriculturalOption}</option>
                      </select>
                    </div>
                  </div>

                  {/* Load kW selector with quick buttons and slider */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {tc.requestedSanctionLoadLabel}
                      </label>
                      <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                        {loadKw} kW
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[2, 4, 6, 8, 10, 15, 25].map(kwVal => (
                        <button
                          key={kwVal}
                          type="button"
                          onClick={() => handleLoadPresetChange(kwVal)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            loadKw === kwVal
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                          }`}
                        >
                          {kwVal} kW
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={loadKw}
                      onChange={e => handleLoadPresetChange(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />

                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>{tc.minLoadNote}</span>
                      <span>{tc.phaseRequirementNote}</span>
                      <span>{tc.maxLtLoadNote}</span>
                    </div>
                  </div>

                  {/* Phase Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {tc.supplyPhaseLabel}
                      </label>
                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="phase"
                            checked={phase === '1-Phase'}
                            onChange={() => setPhase('1-Phase')}
                          />
                          <span>{tc.phase1Option}</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="phase"
                            checked={phase === '3-Phase'}
                            onChange={() => setPhase('3-Phase')}
                          />
                          <span>{tc.phase3Option}</span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={solarInterest}
                          onChange={e => setSolarInterest(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold">
                          {tc.enableSolarCheckbox}
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 pl-5 mt-0.5">
                        {tc.enableSolarHint}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      {tc.backBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStep(4)}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>{tc.reviewCostEstimateBtn}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: DOCUMENTS & COST ESTIMATE SUMMARY */}
              {formStep === 4 && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Verification Documents Checklist */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {tc.mandatoryDocsTitle}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {tc.allThreeAttachedBadge}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {uploadedDocs.map(doc => (
                        <div
                          key={doc}
                          className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{localizeDocumentName(doc, language)}</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {tc.verifiedBadge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Cost Estimate Breakdown Card */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-slate-900 border border-blue-200 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800/40 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        {tc.sanctionFeeScheduleTitle}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {tc.loadSummaryPrefix} {loadKw} kW ({localizePhase(phase, language)})
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{tc.serviceLineChargesLabel} ({loadKw} kW × ₹1,150)</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{serviceCharge.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{tc.standardSecurityDepositLabel} ({localizeTariffCategory(category, language)})</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{securityDeposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{tc.smartMeterTestingFeeLabel}</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{meterTestingFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800/60 text-sm font-extrabold text-blue-700 dark:text-blue-300">
                        <span>{tc.totalEstSanctionPayableLabel}</span>
                        <span className="font-mono text-base">₹{totalSanctionEstimate.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tc.payableUponClearanceNote}
                    </p>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(3)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      {tc.backBtn}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>{tc.submitNewConnBtn}</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: ELECTRICITY BILLS & PAYMENTS */}
      {(activeTab === 'bills' || activeTab === 'quick-pay') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tc.billsTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedConnection ? (
                  <>{tc.connectionLabel} {selectedConnection.consumerName} ({selectedConnection.consumerNo})</>
                ) : (
                  <>{tc.accountLabel} {currentUserName} · {tc.noActiveConnection}</>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {consumerBills.length > 0 ? (
              consumerBills
                .filter(b => !selectedConnection || b.consumerNo === selectedConnection.consumerNo)
                .map(bill => (
                  <div
                    key={bill.billNo}
                    className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                            {bill.billNo}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            bill.status === 'Paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {localizeBillStatus(bill.status, language)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {tc.monthLabel} {localizeBillMonth(bill.billMonth, language)} · {tc.billDateLabel} {bill.billDate} · {tc.dueDateLabel} {bill.dueDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block text-[11px]">{tc.payableAmountLabel}</span>
                          <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                            ₹{bill.totalAmount.toLocaleString()}
                          </span>
                        </div>

                        {bill.status === 'Unpaid' ? (
                          <button
                            onClick={() => handlePayClick(bill.billNo)}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                          >
                            {tc.payOnlineBtn}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewReceipt(bill)}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{tc.viewReceiptBtn}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tariff Details */}
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        {tc.tariffItemizationTitle}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">{tc.energyChargesLabel}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.energyCharges}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{tc.fixedChargesLabel}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.fixedCharges}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{tc.fuelPriceAdjLabel}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.fuelPriceAdjustment}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{tc.electricityDutyLabel}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.electricityDuty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {tc.noBillsFoundTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {hasConnections
                    ? tc.noBillsFoundConnectedDesc
                    : tc.noBillsFoundUnlinkedDesc}
                </p>
                {!hasConnections && (
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{tc.linkConsumerNumberBtn}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 5: PAYMENT HISTORY */}
      {activeTab === 'payments' && (
        <div className="space-y-6 min-w-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tc.paymentHistoryTitle}
            </h2>
            <p className="text-xs text-slate-500">
              {tc.paymentHistorySub} ({currentUserName})
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tc.colTransactionId}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tc.colBillNo}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tc.colDateTime}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tc.colMethod}</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">{tc.colBankRef}</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{tc.colAmount}</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">{tc.colStatus}</th>
                  </tr>
                </thead>
                {consumerPayments.length > 0 ? (
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {consumerPayments.map(p => (
                      <tr key={p.txId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {p.txId}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {p.billNo}
                        </td>
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">{p.date}</td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {localizePaymentMethod(p.paymentMethod, language)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">{p.bankReference}</td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          ₹{p.amount.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                            {localizePaymentStatus(p.status, language)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        {tc.noPaymentsRecorded}
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 6: COMPLAINT DESK */}
      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Register Complaint Card */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {tc.registerFaultTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {tc.registerFaultSub}
              </p>
            </div>

            <form onSubmit={handleComplaintSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {tc.issueCategoryLabel}
                </label>
                <select
                  value={cmpCategory}
                  onChange={e => setCmpCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Voltage Fluctuation">{tc.cmpCatVoltageOption}</option>
                  <option value="Power Outage">{tc.cmpCatOutageOption}</option>
                  <option value="Meter Fault">{tc.cmpCatMeterOption}</option>
                  <option value="Billing Dispute">{tc.cmpCatBillingOption}</option>
                  <option value="Sparking / Hazardous Wire">{tc.cmpCatSparkingOption}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {tc.urgencyLevelLabel}
                </label>
                <select
                  value={cmpPriority}
                  onChange={e => setCmpPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="High">{tc.priorityHighOption}</option>
                  <option value="Critical">{tc.priorityCriticalOption}</option>
                  <option value="Medium">{tc.priorityMediumOption}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {tc.grievanceDescLabel}
                </label>
                <textarea
                  value={cmpDesc}
                  onChange={e => setCmpDesc(e.target.value)}
                  placeholder={tc.grievanceDescPlaceholder}
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                {tc.submitGrievanceBtn}
              </button>
            </form>
          </div>

          {/* Active Grievances List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {tc.grievanceTrackingTitle}
            </h3>

            {consumerComplaints.length > 0 ? (
              <div className="space-y-3">
                {consumerComplaints.map(cmp => (
                  <div
                    key={cmp.id}
                    onClick={() => openCaseDrawer('complaint', cmp.id)}
                    className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-400 cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {cmp.id}
                          </span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {localizeComplaintCategory(cmp.category, language)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {localizeComplaintDescription(cmp.id, cmp.description, language)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {localizeComplaintStatus(cmp.status, language)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{tc.filedLabel} {cmp.filedAt}</span>
                      <span>{tc.slaLabel} {cmp.slaTargetHours} {tc.hoursSuffix}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {tc.expectedResolutionLabel} {cmp.slaDueTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {tc.noActiveGrievancesTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {tc.noActiveGrievancesDesc}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 7: SERVICE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tc.selfServiceRequestsTitle}
            </h2>
            <p className="text-xs text-slate-500">
              {tc.selfServiceRequestsSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tc.solarNetMeteringCardTitle}
                  </h3>
                  <span className="text-[11px] text-slate-400">{tc.solarSubsidyBadge}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {tc.solarNetMeteringCardDesc}
              </p>
              <button
                onClick={() => {
                  showToast(tc.solarFormInitToast, 'info');
                  setActiveTab('new-connection');
                }}
                className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                {tc.applySolarNetMeteringBtn}
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tc.loadChangeCardTitle}
                  </h3>
                  <span className="text-[11px] text-slate-400">{tc.loadChangeBadge}</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {tc.loadChangeCardDesc}
              </p>
              <button
                onClick={() => {
                  showToast(`${tc.loadChangeInitToastPrefix}${selectedConnection?.consumerNo || 'account'}`, 'info');
                  setActiveTab('new-connection');
                }}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                {tc.requestLoadChangeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 8: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tc.notifCenterTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {tc.notifCenterSub}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {consumerNotifications.some(n => !n.read) && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs text-blue-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{tc.markAllReadBtn}</span>
                </button>
              )}
              {consumerNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearAllNotifications();
                    setSelectedConsumerNotifIds([]);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs text-rose-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{tc.clearAllBtn}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter & Batch Selection Bar */}
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {([
                { id: 'all', label: `${tc.filterAll} (${consumerNotifications.length})` },
                { id: 'unread', label: `${tc.filterUnread} (${consumerNotifications.filter(n => !n.read).length})` },
                { id: 'applications', label: tc.filterAppUpdates }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setConsumerNotifFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    consumerNotifFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {selectedConsumerNotifIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  {selectedConsumerNotifIds.length} {tc.selectedCountSuffix}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    markSelectedNotificationsRead(selectedConsumerNotifIds);
                    setSelectedConsumerNotifIds([]);
                  }}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 cursor-pointer"
                >
                  {tc.markReadBtn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteSelectedNotifications(selectedConsumerNotifIds);
                    setSelectedConsumerNotifIds([]);
                  }}
                  className="px-2 py-1 rounded bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 cursor-pointer"
                >
                  {tc.deleteSelectedBtn}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            {(() => {
              const filteredList = consumerNotifications.filter(n => {
                if (consumerNotifFilter === 'unread') return !n.read;
                if (consumerNotifFilter === 'applications') {
                  return Boolean(n.applicationId || n.category === 'Approval' || /APP-\d{4}-\d+/.test(`${n.title} ${n.message}`));
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <Bell className="w-10 h-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {tc.noNotificationsTitle}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tc.noNotificationsDesc}
                    </p>
                  </div>
                );
              }

              return filteredList.map(n => {
                const appId = n.applicationId || `${n.title} ${n.message}`.match(/APP-\d{4}-\d+/)?.[0];
                const cmpId = n.complaintId || `${n.title} ${n.message}`.match(/CMP-[A-Z0-9-]+/)?.[0];
                const isSelected = selectedConsumerNotifIds.includes(n.id);
                const isApproved = n.type === 'success' || n.eventType === 'APPLICATION_APPROVED';
                const isRejected = n.type === 'alert' || n.eventType === 'APPLICATION_REJECTED';
                const isClarification = n.type === 'warning' || n.eventType === 'CLARIFICATION_REQUESTED';

                const accentBorder = isApproved
                  ? 'border-l-4 border-l-emerald-500'
                  : isRejected
                  ? 'border-l-4 border-l-rose-500'
                  : isClarification
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-blue-500';

                const badgeClasses = isApproved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isRejected
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isClarification
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

                const localizedNotif = localizeConsumerNotification(n, language);

                return (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${accentBorder} ${
                      n.read
                        ? 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
                        : 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            e.stopPropagation();
                            setSelectedConsumerNotifIds(prev =>
                              prev.includes(n.id) ? prev.filter(item => item !== n.id) : [...prev, n.id]
                            );
                          }}
                          onClick={e => e.stopPropagation()}
                          aria-label={`${tc.selectNotifAriaPrefix} ${localizedNotif.title}`}
                          className="mt-1.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div
                          className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-600'
                              : isRejected
                              ? 'bg-rose-100 text-rose-600'
                              : isClarification
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isRejected ? (
                            <XCircle className="w-4 h-4" />
                          ) : isClarification ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {appId && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                {appId}
                              </span>
                            )}
                            {!appId && cmpId && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                                {cmpId}
                              </span>
                            )}
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {localizedNotif.title}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                              {localizedNotif.badgeLabel}
                            </span>
                            {!n.read && (
                              <span className="text-[10px] font-bold text-blue-600">{tc.unreadBadge}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {localizedNotif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {localizedNotif.time}
                            </span>
                            {appId && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  markNotificationRead(n.id);
                                  openCaseDrawer('application', appId);
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{tc.trackApplicationPrefix} {appId}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {cmpId && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  markNotificationRead(n.id);
                                  openCaseDrawer('complaint', cmpId);
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>{t.common.viewDetails} {cmpId}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        title={tc.deleteNotifTitle}
                        aria-label={`${tc.deleteNotifTitle} ${localizedNotif.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* SUBVIEW 9: PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-600 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center shadow-md shrink-0">
              {currentConsumerInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {currentUserName}
                </h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                  isDefaultDemoConsumer
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                    : 'text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  {isDefaultDemoConsumer ? tc.kycVerifiedDemoBadge : tc.registeredCitizenAccount}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">
                {tc.accountIdLabel} <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{currentUserId}</span>
                {selectedConnection ? ` · ${tc.primaryConnectionLabel} ${selectedConnection.consumerNo}` : ` · ${tc.noConnectionLinked}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{tc.contactPhoneLabel}</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
                {demoSession?.user.mobileNumber || (isDefaultDemoConsumer ? '+91 98250 14820' : tc.notProvided)}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{tc.registeredEmailLabel}</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
                {currentUserEmail || tc.notSpecified}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1 md:col-span-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{tc.registeredPremisesAddressLabel}</span>
              <div className="font-medium text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                {selectedConnection
                  ? localizeConsumerAddress(selectedConnection.address, language)
                  : isDefaultDemoConsumer
                  ? localizeConsumerAddress('14, Anand Nagar Society, Visnagar Road, Mehsana - 384002', language)
                  : tc.noServiceAddressDesc}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{tc.linkedConnectionsLabel}</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {consumerConnections.length} {consumerConnections.length === 1 ? tc.activeMeterSingular : tc.activeMeterPlural}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{tc.subDivisionJurisdictionLabel}</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedConnection ? localizeSubdivision(selectedConnection.subdivision, language) : tc.pendingAllocation}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            {tc.cisSyncFooterNote}
          </div>
        </div>
      )}

      {/* DEMO PAYMENT MODAL */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>{tc.simulatedBillPaymentTitle}</span>
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-center">
              <span className="text-xs text-slate-400 block mb-0.5">{tc.amountPayableModalLabel}</span>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                ₹{currentBill?.totalAmount.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                {tc.billRefLabel} {selectedBillToPay} · {tc.consumerLabel} {selectedConnection?.consumerNo}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-400 font-semibold block">{tc.selectPaymentGatewayLabel}</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'UPI / BHIM',
                  'Net Banking',
                  'Debit Card',
                  'RTGS/NEFT'
                ].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedPaymentGateway(method as any)}
                    className={`p-3 rounded-lg border text-left font-semibold transition-all ${
                      selectedPaymentGateway === method
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {localizePaymentMethod(method, language)}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-200 dark:border-amber-800">
              {tc.demoPaymentReconciliationNote}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {tc.cancelBtn}
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              >
                {tc.authorizeAndPayBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {isReceiptModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {tc.officialPaymentReceiptTitle}
              </h3>
              <p className="text-xs text-slate-400">{tc.ugvclFullTitle}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{tc.receiptRefLabel}</span>
                <span className="font-mono font-semibold">{selectedReceipt.transactionRef || 'TXN-UPI-9921448102'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{tc.billNumberLabel}</span>
                <span className="font-mono font-semibold">{selectedReceipt.billNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{tc.consumerNoLabel}</span>
                <span className="font-mono font-semibold">{selectedReceipt.consumerNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{tc.paidDateLabel}</span>
                <span>{selectedReceipt.paidDate || '15-Oct-2026'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{tc.amountSettledLabel}</span>
                <span className="font-bold text-emerald-600 text-sm">₹{selectedReceipt.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  showToast(tc.receiptPrintedToast, 'success');
                  setIsReceiptModalOpen(false);
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tc.printDownloadBtn}</span>
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                {tc.doneBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINK EXISTING CONNECTION MODAL */}
      {isLinkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-[#101C35] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="link-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {tc.linkConnectionModalTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500">{tc.linkConnectionModalSub}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkError(null);
                  setIsLinkOtpSent(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {linkError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{localizeLinkConnectionError(linkError, language)}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLinkError(null);

                if (!linkConsumerNo.trim()) {
                  setLinkError(tc.enterElevenDigitError);
                  return;
                }

                if (!isLinkOtpSent) {
                  // Step 1: Simulate sending OTP to registered mobile
                  setIsLinkOtpSent(true);
                  setLinkOtp('123456');
                  showToast(tc.otpSentToast, 'info');
                  return;
                }

                // Step 2: Complete linking
                setIsLinking(true);
                setTimeout(() => {
                  const result = linkConnectionDemo(linkConsumerNo);
                  setIsLinking(false);
                  if (result.success && result.connection) {
                    setSelectedConnectionNo(result.connection.consumerNo);
                    setIsLinkModalOpen(false);
                    setIsLinkOtpSent(false);
                    setLinkConsumerNo('');
                  } else if (result.error) {
                    setLinkError(result.error);
                  }
                }, 300);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {tc.elevenDigitConsumerNoLabel}
                </label>
                <input
                  type="text"
                  value={linkConsumerNo}
                  onChange={(e) => setLinkConsumerNo(e.target.value)}
                  placeholder={tc.consumerNoPlaceholder}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
                
                {/* Sample demonstration account quick autofill */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-slate-400">{tc.sampleAccountsLabel}</span>
                  <button
                    type="button"
                    onClick={() => setLinkConsumerNo('04281-99231')}
                    className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-800 font-mono text-[10px] hover:bg-blue-100 cursor-pointer"
                  >
                    {tc.sampleResidentialBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkConsumerNo('04281-77190')}
                    className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-800 font-mono text-[10px] hover:bg-blue-100 cursor-pointer"
                  >
                    {tc.sampleCommercialBtn}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {tc.subDivisionOfficeLabel}
                </label>
                <select
                  value={linkSubdivision}
                  onChange={(e) => setLinkSubdivision(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Mehsana City North">{localizeSubdivision('Mehsana City North', language)}</option>
                  <option value="Mehsana City South">{tc.subdivMehsanaSouth}</option>
                  <option value="Mehsana Industrial GIDC">{tc.subdivMehsanaGidc}</option>
                  <option value="Visnagar Rural">{tc.subdivVisnagarRural}</option>
                  <option value="Kadi Sub-Division">{tc.subdivKadiSub}</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {tc.registeredMobileLabel}
                </label>
                <input
                  type="text"
                  value={linkPhone}
                  onChange={(e) => setLinkPhone(e.target.value)}
                  placeholder="+91 98XXX XXXXX"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {isLinkOtpSent && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 dark:text-blue-300 text-xs">
                      {tc.enterSixDigitOtpLabel}
                    </span>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-400">
                      {tc.demoCodeLabel}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={linkOtp}
                    onChange={(e) => setLinkOtp(e.target.value)}
                    maxLength={6}
                    placeholder="123456"
                    className="w-full px-3 py-2 text-center text-sm font-mono tracking-widest font-bold rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-500">
                    {tc.otpSentToPhonePrefix} {linkPhone.slice(-4) || 'XXXX'}.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkModalOpen(false);
                    setLinkError(null);
                    setIsLinkOtpSent(false);
                  }}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {tc.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={isLinking}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isLinking ? (
                    <span>{tc.linkingBtn}</span>
                  ) : !isLinkOtpSent ? (
                    <span>{tc.verifyAndSendOtpBtn}</span>
                  ) : (
                    <span>{tc.confirmAndLinkBtn}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
