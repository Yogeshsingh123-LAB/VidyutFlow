import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { submitLiveRequest } from '../../utils/liveData';
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
  Gauge
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
    markAllNotificationsRead,
    payBillDemo,
    submitApplicationDemo,
    submitComplaintDemo,
    openCaseDrawer,
    showToast,
    activeUser
  } = useApp();

  // Logged-in consumer identity (Single source of truth)
  const currentUserName = activeUser.name;
  const currentUserEmail = activeUser.email;
  const currentUserId = demoSession?.user.id || 'anonymous';
  const currentConsumerInitials = activeUser.initials;
  const isDefaultDemoConsumer = currentUserId === 'demo_consumer' || currentUserEmail.toLowerCase() === 'consumer@vidyutflow.demo';

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
  }, [demoSession, isDefaultDemoConsumer, selectedConnection]);

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
      showToast('Please fill all mandatory application fields', 'error');
      return;
    }

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

    // Also submit to the live VidyutFlow API (fire-and-forget): the backend runs the real
    // workflow — validation, ML classification, SLA-risk scoring, zone routing — and the
    // toast reports what the live models returned. Demo workspace stays usable if API is down.
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
      .then(r => {
        showToast(
          `Live API recorded the request (ref ${r.id.slice(0, 8)}) — ML: ${r.category}/${r.severity} · SLA risk ${Math.round((r.sla_breach_risk ?? 0) * 100)}%`,
          'success'
        );
      })
      .catch(() => {
        showToast('Live API unreachable — application recorded in the demo workspace only', 'info');
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
      showToast('Please provide a description of the issue', 'error');
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
                  <span>UGVCL {selectedConnection.subdivision}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedConnection.tariffCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {selectedConnection.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                    {selectedConnection.consumerName}
                  </h1>
                  <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200/80 dark:border-blue-800/80">
                    Consumer No: {selectedConnection.consumerNo}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start sm:items-center gap-2 flex-wrap leading-relaxed">
                  <span className="inline-flex items-start sm:items-center gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="break-words">{selectedConnection.address}</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">|</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    Meter: {selectedConnection.meterNo} ({selectedConnection.sanctionedLoadKw} kW · {selectedConnection.phase})
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 flex-wrap">
                  <span>UGVCL Consumer Self-Service Portal</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    No Connection Linked
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                    Consumer Account: {currentUserName}
                  </h1>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    ID: {currentUserId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start sm:items-center gap-1.5 flex-wrap leading-relaxed">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="break-words">{currentUserEmail || 'Registered Citizen Account'} · Independent Utility ERP Demonstration</span>
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
                <span>Active Meter:</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
                <select
                  id="active-meter-select"
                  value={selectedConnection?.consumerNo}
                  onChange={e => {
                    setSelectedConnectionNo(e.target.value);
                  }}
                  aria-label="Select active electricity connection meter"
                  className="min-h-11 sm:min-h-9 min-w-0 w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors cursor-pointer"
                >
                  {consumerConnections.map(c => (
                    <option key={c.consumerNo} value={c.consumerNo}>
                      {c.consumerNo} — {c.tariffCategory} ({c.sanctionedLoadKw} kW)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveTab('connections')}
                  className="min-h-11 sm:min-h-9 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
                  title="Manage all linked electricity connections"
                >
                  Manage ({consumerConnections.length})
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
                <span>Apply for Connection</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className="flex-1 sm:flex-initial min-h-11 sm:min-h-9 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Link Existing</span>
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
                    Consumer Portal Onboarding
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    No Electricity Connection Linked
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Welcome, {currentUserName}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your account has been created. Apply for a new electricity connection or link an existing connection to access bills, meter information, and service history.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('new-connection')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Apply for New Connection</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <span>Link Existing Connection</span>
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
                      Current Electricity Bill
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
                    {!hasConnections ? 'No Active Connection' : currentBill?.status === 'Unpaid' ? 'Payment Due' : 'Paid'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 my-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {hasConnections && currentBill ? `₹${currentBill.totalAmount.toLocaleString()}` : '₹0'}
                  </div>
                  {hasConnections && currentBill && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      for {currentBill.billMonth}
                    </span>
                  )}
                </div>

                {hasConnections && currentBill ? (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Billed Consumption</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {currentBill.unitsConsumed} kWh
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Invoice Number</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                        {currentBill.billNo}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    No bills generated yet. Monthly billing statements and tariff breakdowns appear once a service connection is linked.
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {hasConnections && currentBill?.dueDate ? (
                    <>Due Date: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentBill.dueDate}</strong></>
                  ) : (
                    'Due: None pending'
                  )}
                </span>
                {hasConnections && currentBill?.status === 'Unpaid' ? (
                  <button
                    onClick={() => handlePayClick(currentBill.billNo)}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    <span>Pay Online</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                ) : hasConnections && currentBill ? (
                  <button
                    onClick={() => handleViewReceipt(currentBill)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    View Receipt
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('new-connection')}
                    className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                  >
                    Apply Connection →
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
                      Connected Feeder
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold inline-flex items-center gap-1.5 ${
                    hasConnections
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasConnections ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {hasConnections ? 'Normal Supply' : 'Unassigned'}
                  </span>
                </div>

                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-1">
                  {hasConnections && selectedConnection ? selectedConnection.feederName : 'No Feeder Assigned'}
                </div>

                {hasConnections && selectedConnection ? (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Line Voltage (Nominal 230V)</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        232 V · Stable
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Grid Frequency</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        50.02 Hz
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    11kV radial feeder line and distribution transformer telemetry will display here once a service connection is linked.
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="text-slate-400">Scheduled Outages: </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {hasConnections ? 'None in next 48h' : 'N/A'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  Report Issue →
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
                      Service Tracking
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Live Status
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 my-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {consumerApplications.length} Active File{consumerApplications.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Open Grievances</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {consumerComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length} in triage
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Latest Application</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 break-words leading-snug block">
                      {consumerApplications[0]?.status || 'None submitted'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveTab('connections')}
                  className="text-xs text-blue-600 dark:text-cyan-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  Track Applications →
                </button>
                <button
                  onClick={() => setActiveTab('complaints')}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer"
                >
                  Grievance Desk →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Consumer Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Consumer Services
              </h2>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Direct self-service workflows
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
                      Apply New Connection
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      LT / HT Service Sanction
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!hasConnections) {
                    showToast('No active bill pending. Apply for a connection or link an existing account.', 'info');
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
                      Pay Electricity Bill
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      UPI / NetBanking / BBPS
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
                      Report Power Outage
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      12h SLA Fault Redressal
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
                      Solar Net-Metering
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words mt-0.5">
                      Surya Gujarat Rooftop
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
                  Monthly Electricity Consumption Trend (kWh Units)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {hasConnections && selectedConnection
                    ? `Data sourced from Smart AMR Automated Meter Reading System · Meter ${selectedConnection.meterNo}`
                    : 'Automated Meter Reading (AMR) monthly consumption analytics'}
                </p>
              </div>
              {hasConnections && selectedConnection && (
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">6-Month Average</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">418 kWh / Month</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Latest Meter Reading</span>
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
                  <AreaChart data={CONSUMPTION_HISTORY} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.18} />
                    <XAxis
                      dataKey="month"
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
                        const extra = payload?.amount ? ` · Billed: ₹${payload.amount.toLocaleString()}` : '';
                        return [`${value ?? 0} kWh${extra}`, String(name ?? 'Consumed Energy')];
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
                      name="Consumed Energy"
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
                  No Consumption Telemetry Recorded
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                  Automated Meter Reading (AMR) energy trends will display here once your electricity connection is sanctioned and a smart digital meter is energized at your premises.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-connection')}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Apply for New Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Link Existing Connection
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
                <strong>Independent Utility ERP Demonstration:</strong> VidyutFlow is an educational software prototype inspired by UGVCL workflows and is not affiliated with official UGVCL consumer billing systems.
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">
              Tariff Reference: FY 2026-27 LT/HT Schedule
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
                  My Registered Electricity Connections
                </h2>
                <p className="text-xs text-slate-500">
                  Consumer accounts linked to your verified Aadhaar & Mobile ({applicantPhone})
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-connection')}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Apply for New Connection</span>
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
                          {conn.tariffCategory}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {conn.consumerName}
                        </h3>
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          Consumer No: {conn.consumerNo}
                        </span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {conn.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Sanctioned Load</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{conn.sanctionedLoadKw} kW ({conn.phase})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Meter Serial</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{conn.meterNo}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Current Reading</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{conn.currentReadingKwh} kWh</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Security Deposit</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">₹{conn.securityDeposit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">{conn.address}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedConnectionNo(conn.consumerNo);
                          setActiveTab('bills');
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        View Invoices →
                      </button>
                      <button
                        onClick={() => {
                          setSelectedConnectionNo(conn.consumerNo);
                          showToast(`Activated ${conn.consumerNo} for active portal operations`, 'info');
                        }}
                        className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 font-medium"
                      >
                        Select Active Account
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
                  No Electricity Connections Linked
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Your registered account ({currentUserEmail}) does not have any active electricity service connections associated with it yet. You can apply for a new connection or link an existing UGVCL consumer number.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-connection')}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Apply for New Connection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-slate-500" />
                    <span>Link Existing Connection</span>
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
                  <span>My Connection Applications & Sanctions</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time end-to-end tracking from document scrutiny to smart meter energization
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {consumerApplications.length} Active Application{consumerApplications.length !== 1 ? 's' : ''}
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
                              Step {app.workflowStep}/5: {app.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            Applicant: <strong>{app.applicantName}</strong> · Requested Load: <strong>{app.requestedLoadKw} kW ({app.phase})</strong> · {app.category}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openCaseDrawer('application', app.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <span>Inspect File</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Stepper */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                          <span>Workflow Progress</span>
                          <span>{progressPct}% Completed</span>
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
                                {sName}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Details Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Sub-Division</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{app.subdivision}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Applied Date</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{app.appliedDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Target Date</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{app.targetCompletionDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Est. Sanction Fee</span>
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
                  No Active Connection Applications
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You have not submitted any new LT or HT electricity connection applications.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new-connection')}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Start New Application</span>
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
                  Application for New Electricity Connection (LT/HT Sanction)
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Uttar Gujarat Vij Company Limited (UGVCL) Unified Citizen Self-Service Portal
              </p>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              {[
                { step: 1, title: '1. Applicant Details' },
                { step: 2, title: '2. Premises & Grid' },
                { step: 3, title: '3. Load & Tariff' },
                { step: 4, title: '4. Documents & Sanction' }
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
                        Full Name of Applicant (as per Aadhaar / PAN) *
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
                        Father / Husband Name *
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
                        Mobile Number (for SMS & OTP updates) *
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
                        Email Address (for e-bills and demand notice)
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
                        Identity Verification Document *
                      </label>
                      <select
                        value={identityProofType}
                        onChange={e => setIdentityProofType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                        <option value="PAN Card">PAN Card (Income Tax Dept)</option>
                        <option value="Voter ID Card">Voter ID / EPIC Card</option>
                        <option value="Passport">Passport</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Identity Document Number *
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
                      <span>Proceed to Premises</span>
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
                        UGVCL Operational Sub-Division *
                      </label>
                      <select
                        value={subdivision}
                        onChange={e => setSubdivision(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Mehsana City North">Mehsana City North (Circle HQ)</option>
                        <option value="Gandhinagar Sub-Division 2">Gandhinagar Sub-Division 2</option>
                        <option value="Visnagar Division">Visnagar Division</option>
                        <option value="Kalol Sub-Division">Kalol Sub-Division</option>
                        <option value="Kadi Division">Kadi Division (Jyotigram & Rural)</option>
                        <option value="Patan Urban Zone">Patan Urban Zone</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Premises Ownership Type *
                      </label>
                      <select
                        value={premisesType}
                        onChange={e => setPremisesType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Owned">Owned (Registered Sale Deed / Index-II)</option>
                        <option value="Rented">Rented (Registered Notarized Lease Agreement)</option>
                        <option value="Government Leased">Government / GIDC Allotment</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Full Premises Street Address *
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
                        Postal PIN Code *
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
                        Nearest Landmark / Pole Number (if known)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Near DP-14 / Opposite Shivalik School"
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
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStep(3)}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>Proceed to Technical Specs</span>
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
                        Tariff Category *
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as TariffCategory)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Residential (RGPU)">Residential (RGPU - Domestic)</option>
                        <option value="Commercial (NRGP)">Commercial (NRGP - Non-Residential)</option>
                        <option value="Industrial (LTMD)">Industrial (LTMD - Low Tension Max Demand)</option>
                        <option value="Agricultural (AG)">Agricultural (AG - Tube well / Irrigation)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Purpose of Supply
                      </label>
                      <select
                        value={purpose}
                        onChange={e => setPurpose(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Domestic / Residential Lighting & Power">Domestic / Residential Lighting & Power</option>
                        <option value="Commercial Shop / Office / Retail">Commercial Shop / Office / Retail</option>
                        <option value="Small Scale Workshop / MSME Unit">Small Scale Workshop / MSME Unit</option>
                        <option value="Agricultural Borewell & Farmhouse">Agricultural Borewell & Farmhouse</option>
                      </select>
                    </div>
                  </div>

                  {/* Load kW selector with quick buttons and slider */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Requested Sanction Load (kW):
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
                      <span>Minimum: 1 kW</span>
                      <span>Above 5kW requires 3-Phase standard metering</span>
                      <span>Maximum LT: 50 kW</span>
                    </div>
                  </div>

                  {/* Phase Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Supply Phase *
                      </label>
                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="phase"
                            checked={phase === '1-Phase'}
                            onChange={() => setPhase('1-Phase')}
                          />
                          <span>1-Phase (Standard for ≤ 5kW)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="phase"
                            checked={phase === '3-Phase'}
                            onChange={() => setPhase('3-Phase')}
                          />
                          <span>3-Phase (Required for &gt; 5kW)</span>
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
                          Enable Rooftop Solar Net-Metering Feasibility (Surya Gujarat)
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 pl-5 mt-0.5">
                        Will automatically schedule bidirectional smart meter allocation during site feasibility check.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(2)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStep(4)}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <span>Review & Cost Estimate</span>
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
                        Mandatory Verification Documents
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All 3 Attached (Simulated)
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
                            <span className="font-medium text-slate-800 dark:text-slate-200">{doc}</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Cost Estimate Breakdown Card */}
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-slate-900 border border-blue-200 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800/40 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        UGVCL Sanction Fee Schedule (Live Breakdown)
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        Load: {loadKw} kW ({phase})
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Service Line Charges ({loadKw} kW × ₹1,150)</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{serviceCharge.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Standard Security Deposit ({category})</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{securityDeposit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Smart Meter Testing & Terminal Seal Fee</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{meterTestingFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800/60 text-sm font-extrabold text-blue-700 dark:text-blue-300">
                        <span>Total Estimated Sanction Payable:</span>
                        <span className="font-mono text-base">₹{totalSanctionEstimate.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      * Payable upon document clearance and site feasibility approval by AE Operations.
                    </p>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep(3)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Submit New Connection Application</span>
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
                Electricity Bills & Tariff Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                {selectedConnection ? (
                  <>Connection: {selectedConnection.consumerName} ({selectedConnection.consumerNo})</>
                ) : (
                  <>Account: {currentUserName} · No Active Connection</>
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
                            {bill.status}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          Month: {bill.billMonth} · Bill Date: {bill.billDate} · Due Date: {bill.dueDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block text-[11px]">Payable Amount</span>
                          <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                            ₹{bill.totalAmount.toLocaleString()}
                          </span>
                        </div>

                        {bill.status === 'Unpaid' ? (
                          <button
                            onClick={() => handlePayClick(bill.billNo)}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                          >
                            Pay Online
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewReceipt(bill)}
                            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>View Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tariff Details */}
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        UGVCL Tariff Itemization
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Energy Charges</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.energyCharges}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Fixed Charges</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.fixedCharges}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Fuel Price Adj (FPA)</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">₹{bill.fuelPriceAdjustment}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Electricity Duty (15%)</span>
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
                  No Electricity Bills Found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {hasConnections
                    ? 'All monthly bills for this consumer connection have been settled or no invoices have been generated for this cycle.'
                    : 'Invoices and tariff breakdowns appear here once an electricity service connection is linked to your account.'}
                </p>
                {!hasConnections && (
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Link Consumer Number</span>
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
              Transaction History & Receipts
            </h2>
            <p className="text-xs text-slate-500">
              Complete digital payments log for consumer account ({currentUserName})
            </p>
          </div>

          <div className="bg-white dark:bg-[#101C35] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Transaction ID</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Bill No</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Date & Time</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Method</th>
                    <th className="p-3.5 font-semibold whitespace-nowrap">Bank Ref</th>
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">Amount</th>
                    <th className="p-3.5 font-semibold text-center whitespace-nowrap">Status</th>
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
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{p.paymentMethod}</td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">{p.bankReference}</td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          ₹{p.amount.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No payment transactions recorded for this account.
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
                Register Fault or Grievance
              </h3>
              <p className="text-xs text-slate-500">
                Direct integration with Sub-divisional dispatch & line squad
              </p>
            </div>

            <form onSubmit={handleComplaintSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Issue Category
                </label>
                <select
                  value={cmpCategory}
                  onChange={e => setCmpCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Voltage Fluctuation">Voltage Fluctuation (High / Low)</option>
                  <option value="Power Outage">Complete Power Outage</option>
                  <option value="Meter Fault">Smart Meter Display / Burn Error</option>
                  <option value="Billing Dispute">Billing Dispute / Arrears</option>
                  <option value="Sparking / Hazardous Wire">Sparking / Hazardous Overhead Wire</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Urgency Level
                </label>
                <select
                  value={cmpPriority}
                  onChange={e => setCmpPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="High">High (Resolution in 12 Hours)</option>
                  <option value="Critical">Critical (Immediate Line Safety - 4h)</option>
                  <option value="Medium">Medium (Routine - 24 Hours)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description of Grievance
                </label>
                <textarea
                  value={cmpDesc}
                  onChange={e => setCmpDesc(e.target.value)}
                  placeholder="Mention location specifics, nearby landmark, or fault details..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Submit Grievance
              </button>
            </form>
          </div>

          {/* Active Grievances List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Grievance Tracking & Redressal History
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
                            {cmp.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {cmp.description}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {cmp.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>Filed: {cmp.filedAt}</span>
                      <span>SLA: {cmp.slaTargetHours} Hours</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        Assigned: {cmp.assignedTechnician || 'Auto-Triage Queue'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Active Grievances Registered
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  No service tickets or power complaints logged for this account. Use the form on the left to submit a report if you experience supply anomalies.
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
              Self-Service Citizen Requests
            </h2>
            <p className="text-xs text-slate-500">
              Apply for modifications to your existing connection without visiting UGVCL office
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
                    Solar Rooftop Net-Metering (Surya Gujarat)
                  </h3>
                  <span className="text-[11px] text-slate-400">Up to 40% government subsidy</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Install on-grid solar photovoltaic panels and get bi-directional smart meter to export excess power to UGVCL grid.
              </p>
              <button
                onClick={() => {
                  showToast('Solar Rooftop Application form initialized', 'info');
                  setActiveTab('new-connection');
                }}
                className="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                Apply for Solar Net-Metering
              </button>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Load Enhancement / Reduction
                  </h3>
                  <span className="text-[11px] text-slate-400">Upgrade connected load kW</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Increase your sanctioned load (e.g., for installing AC or EV charger) from 5kW 1-Phase to 8kW 3-Phase.
              </p>
              <button
                onClick={() => {
                  showToast(`Load Enhancement Request initiated for #${selectedConnection?.consumerNo || 'account'}`, 'info');
                  setActiveTab('new-connection');
                }}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Request Load Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 8: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Account Notifications & Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Official alerts on bill generations, sanctions, outages, and meter status
              </p>
            </div>
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-blue-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {consumerNotifications.length > 0 ? (
              consumerNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    n.read
                      ? 'bg-white dark:bg-[#101C35] border-slate-200 dark:border-slate-800'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {n.title}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {n.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                          {n.time}
                        </span>
                      </div>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Bell className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Notifications
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your account is up to date. Official service alerts and notices will appear here.
                </p>
              </div>
            )}
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
                  {isDefaultDemoConsumer ? 'KYC Verified (Demo Persona)' : 'Registered Citizen Account'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">
                Account ID: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{currentUserId}</span>
                {selectedConnection ? ` · Primary Connection: ${selectedConnection.consumerNo}` : ' · No Connection Linked'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Contact Phone</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
                {demoSession?.user.mobileNumber || (isDefaultDemoConsumer ? '+91 98250 14820' : 'Not Provided')}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Registered Email</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200 break-words">
                {currentUserEmail || 'Not specified'}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1 md:col-span-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Registered Premises / Billing Address</span>
              <div className="font-medium text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                {selectedConnection ? selectedConnection.address : (isDefaultDemoConsumer ? '14, Anand Nagar Society, Visnagar Road, Mehsana - 384002' : 'No service address registered yet. Link an existing connection or submit a new connection application.')}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Linked Connections</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {consumerConnections.length} Active Meter{consumerConnections.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Sub-Division Jurisdiction</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedConnection ? selectedConnection.subdivision : 'Pending Allocation'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Citizen profile synchronization managed via UGVCL Unified Consumer Information System (CIS).
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
                <span>Simulated Bill Payment</span>
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-center">
              <span className="text-xs text-slate-400 block mb-0.5">Amount Payable</span>
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                ₹{currentBill?.totalAmount.toLocaleString()}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Bill Ref: {selectedBillToPay} · Consumer: {selectedConnection?.consumerNo}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-400 font-semibold block">Select Payment Gateway:</span>
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
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-200 dark:border-amber-800">
              * Demo Mode: Instant reconciliation without real bank deduction. Centralized state updates in real time.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
              >
                Authorize & Pay Now
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
                UGVCL Official Payment Receipt
              </h3>
              <p className="text-xs text-slate-400">Uttar Gujarat Vij Company Limited</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Receipt Ref:</span>
                <span className="font-mono font-semibold">{selectedReceipt.transactionRef || 'TXN-UPI-9921448102'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Bill Number:</span>
                <span className="font-mono font-semibold">{selectedReceipt.billNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Consumer No:</span>
                <span className="font-mono font-semibold">{selectedReceipt.consumerNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Paid Date:</span>
                <span>{selectedReceipt.paidDate || '15-Oct-2026'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Amount Settled:</span>
                <span className="font-bold text-emerald-600 text-sm">₹{selectedReceipt.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  showToast('Receipt printed / downloaded as PDF', 'success');
                  setIsReceiptModalOpen(false);
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Download</span>
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer"
              >
                Done
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
                    Link Electricity Connection
                  </h3>
                  <p className="text-[11px] text-slate-500">Associate an existing UGVCL consumer number</p>
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
                <span>{linkError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLinkError(null);

                if (!linkConsumerNo.trim()) {
                  setLinkError('Please enter an 11-digit UGVCL consumer number.');
                  return;
                }

                if (!isLinkOtpSent) {
                  // Step 1: Simulate sending OTP to registered mobile
                  setIsLinkOtpSent(true);
                  setLinkOtp('123456');
                  showToast('Verification OTP sent to registered mobile number: 123456 (demo code auto-filled)', 'info');
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
                  11-Digit Consumer Number
                </label>
                <input
                  type="text"
                  value={linkConsumerNo}
                  onChange={(e) => setLinkConsumerNo(e.target.value)}
                  placeholder="e.g. 04281-99231"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
                
                {/* Sample demonstration account quick autofill */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-slate-400">Sample accounts:</span>
                  <button
                    type="button"
                    onClick={() => setLinkConsumerNo('04281-99231')}
                    className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-800 font-mono text-[10px] hover:bg-blue-100 cursor-pointer"
                  >
                    04281-99231 (Residential)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkConsumerNo('04281-77190')}
                    className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-800 font-mono text-[10px] hover:bg-blue-100 cursor-pointer"
                  >
                    04281-77190 (Commercial)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Sub-Division Office
                </label>
                <select
                  value={linkSubdivision}
                  onChange={(e) => setLinkSubdivision(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Mehsana City North">Mehsana City North</option>
                  <option value="Mehsana City South">Mehsana City South</option>
                  <option value="Mehsana Industrial GIDC">Mehsana Industrial GIDC</option>
                  <option value="Visnagar Rural">Visnagar Rural</option>
                  <option value="Kadi Sub-Division">Kadi Sub-Division</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Registered Mobile Number
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
                      Enter 6-Digit Verification OTP
                    </span>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-400">
                      Demo Code: 123456
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
                    OTP sent to registered phone ending in {linkPhone.slice(-4) || 'XXXX'}.
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking}
                  className="flex-1 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isLinking ? (
                    <span>Linking...</span>
                  ) : !isLinkOtpSent ? (
                    <span>Verify & Send OTP</span>
                  ) : (
                    <span>Confirm & Link Connection</span>
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
