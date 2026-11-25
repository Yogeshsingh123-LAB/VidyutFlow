import type { LanguageCode } from '../../i18n/types';
export const CONSUMER_WORKFLOW_INTAKE_TEXT: Record<
  LanguageCode,
  {
    selectorLabel: string;
    slaTarget: string;
    docMandatory: string;
    docOptional: string;
    fieldSurvey: string;
    deskReview: string;
    optionNewConnection: string;
    optionLoadExtension: string;
    optionMeterReplacement: string;
    optionBillingDispute: string;
    optionOutageSafety: string;
  }
> = {
  en: {
    selectorLabel: 'Service Workflow Template',
    slaTarget: 'Target SLA',
    docMandatory: 'Document required',
    docOptional: 'Document optional',
    fieldSurvey: 'Field survey dispatch',
    deskReview: 'Officer desk review',
    optionNewConnection: 'New Electricity Connection',
    optionLoadExtension: 'Load Extension / Reduction',
    optionMeterReplacement: 'Faulty / Smart Meter Replacement',
    optionBillingDispute: 'Billing & Tariff Verification',
    optionOutageSafety: 'Outage & Line Safety Escalation',
  },
  gu: {
    selectorLabel: 'સેવા વર્કફ્લો ટેમ્પ્લેટ',
    slaTarget: 'લક્ષ્યાંક SLA',
    docMandatory: 'દસ્તાવેજ ફરજિયાત',
    docOptional: 'દસ્તાવેજ વૈકલ્પિક',
    fieldSurvey: 'ફીલ્ડ સર્વે ડિસ્પેચ',
    deskReview: 'અધિકારી ડેસ્ક સમીક્ષા',
    optionNewConnection: 'નવું વીજ જોડાણ',
    optionLoadExtension: 'લોડ વધારો / ઘટાડો',
    optionMeterReplacement: 'ખામીયુક્ત / સ્માર્ટ મીટર બદલી',
    optionBillingDispute: 'બિલિંગ અને ટેરિફ ચકાસણી',
    optionOutageSafety: 'વીજ પુરવઠો અને લાઇન સુરક્ષા એસ્કેલેશન',
  },
  hi: {
    selectorLabel: 'सेवा वर्कफ़्लो टेम्पलेट',
    slaTarget: 'लक्षित SLA',
    docMandatory: 'दस्तावेज़ अनिवार्य',
    docOptional: 'दस्तावेज़ वैकल्पिक',
    fieldSurvey: 'फ़ील्ड सर्वे डिस्पैच',
    deskReview: 'अधिकारी डेस्क समीक्षा',
    optionNewConnection: 'नया बिजली कनेक्शन',
    optionLoadExtension: 'लोड विस्तार / कमी',
    optionMeterReplacement: 'ख़राब / स्मार्ट मीटर प्रतिस्थापन',
    optionBillingDispute: 'बिलिंग व टैरिफ़ सत्यापन',
    optionOutageSafety: 'आउटेज व लाइन सुरक्षा एस्केलेशन',
  },
  mr: {
    selectorLabel: 'सेवा वर्कफ्लो टेम्पलेट',
    slaTarget: 'लक्ष्य SLA',
    docMandatory: 'कागदपत्रे अनिवार्य',
    docOptional: 'कागदपत्रे ऐच्छिक',
    fieldSurvey: 'फील्ड सर्वेक्षण डिस्पॅच',
    deskReview: 'अधिकारी डेस्क पुनरावलोकन',
    optionNewConnection: 'नवीन वीज जोडणी',
    optionLoadExtension: 'लोड वाढ / कपात',
    optionMeterReplacement: 'सदोष / स्मार्ट मीटर बदलणे',
    optionBillingDispute: 'बिलिंग आणि टॅरिफ पडताळणी',
    optionOutageSafety: 'खंडित वीज आणि लाईन सुरक्षा एस्केलेशन',
  },
};

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
  localizeLinkConnectionError,
  localizeBillingCycleShortBadge
} from '../../i18n/consumerContentTranslations';
import {
  getAnalyticsTransparencyDictionary,
  resolveAnalyticsDataSourceClassification,
  resolveAnalyticsTimestampLabel,
  resolveForecastUncertaintyDisclosure
} from '../../utils/analyticsTransparency';
import { CONSUMPTION_HISTORY } from '../../data/mockData';
import {
  selectConsumerCanonicalAnalytics,
  getCanonicalAnalyticsTranslations
} from '../../utils/canonicalAnalytics';
import { ExportMenu } from '../common/ExportMenu';
import { OfficialDocumentModal } from '../common/OfficialDocumentModal';
import { BillVerificationModal } from '../common/BillVerificationModal';
import { parseBillVerificationUrl } from '../../utils/qrCodeEngine';
import { EnterprisePaymentModal } from './EnterprisePaymentModal';
import { LazyOutageMapSection } from '../outageMap/LazyOutageMapSection';
import { LiveConsumerRequests } from './LiveConsumerRequests';
import { submitLiveRequest } from '../../utils/liveData';
import { ConsumerComplaintTimelineModal } from './ConsumerComplaintTimelineModal';
import { ConsumerMeterBillingSection } from './ConsumerMeterBillingSection';
import { SmartPaymentCalendar } from './SmartPaymentCalendar';
import { OverdueBillBreakdownCard } from './OverdueBillBreakdownCard';
import { ConsumerProfileWorkspace } from './ConsumerProfileWorkspace';
import {
  GeneratedOfficialDocument,
  getDocumentUiTranslations,
  BILL_AND_RECEIPT_EXTRA_LABELS,
  generateElectricityBillDocument,
  generateUpdatedAccountStatementDocument,
  generatePaymentReceiptDocument,
  generateApplicationAcknowledgmentDocument,
  generateComplaintAcknowledgmentDocument,
  generateConsumptionReportDocument,
  generatePaymentHistoryReportDocument,
  triggerOfficialDocumentPdfDownload,
} from '../../utils/documentEngine';
import { triggerBrowserFileDownload } from '../../utils/exportEngine';
import { formatErpDateTime } from '../../utils/dateUtils';
import type { OverdueFinancialBreakdown } from '../../utils/lateChargeEngine';
import {
  BillingReminderType,
  ReconciledElectricityBill,
  getBillingUiTranslations,
  buildLocalizedBillingReminderCopy,
  formatCanonicalBillStatusAndCountdown,
  deriveBillPaymentAndNoticeTimeline,
} from '../../utils/billingEngine';
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
  XCircle,
  QrCode,
  ArrowRight,
  Sun,
  Megaphone,
  Copy,
  BarChart3,
  ChevronDown,
  Home,
  Fingerprint
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
import {
  TariffCategory,
  ElectricityConnection,
  ElectricityBill,
  PaymentTransaction,
  NewConnectionApplication,
  ComplaintRecord,
  ConsumerServiceRequestType
} from '../../types';
import {
  ConsumerServicePrefillState,
  buildConsumerServicePrefillState,
  evaluateLoadChangeRequest,
  formatSubmissionAddress,
  getServiceRequestUiStrings,
  localizeServiceRequestTypeBadge,
  mergePrefillPreservingUserEdits,
  validateServiceRequestSubmission
} from '../../utils/consumerServicePrefill';

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
    selectedConsumerConnectionNo,
    setSelectedConsumerConnectionNo,
    consumerBillingSummary,
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
    payBillDemoDetailed,
    formalNotices,
    lateChargeWaivers,
    paymentReversals,
    businessReferenceDate,
    generateDemoBillForActiveConnection,
    submitApplicationDemo,
    submitComplaintDemo,
    openCaseDrawer,
    showToast,
    activeUser,
    dataMode,
    backendStatus,
    isBrowserOffline,
    isOfflineSimulated
  } = useApp();

  const { language, t } = useLanguage();
  const tc = t.consumer;
  const docUi = getDocumentUiTranslations(language);
  const bUi = getBillingUiTranslations(language);
  const srUi = getServiceRequestUiStrings(language);
  const at = getAnalyticsTransparencyDictionary(language);
  const consumerFeederTelemetrySource = resolveAnalyticsDataSourceClassification({
    isSimulatedView: true,
    language
  });
  const consumerConsumptionSource = resolveAnalyticsDataSourceClassification({
    dataMode,
    backendStatusState: backendStatus.state,
    isBrowserOffline,
    isOfflineSimulated,
    isForecastView: true,
    language
  });
  const consumerUncertaintyMeta = resolveForecastUncertaintyDisclosure({
    hasValidatedStatisticalInterval: false,
    language
  });
  const caTranslations = getCanonicalAnalyticsTranslations(language);

  const [consumerNotifFilter, setConsumerNotifFilter] = useState<
    'all' | 'unread' | 'pending' | 'approved' | 'rejected' | 'applications'
  >('all');
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

  const selectedConnectionNo = selectedConsumerConnectionNo || consumerConnections[0]?.consumerNo || '';
  const setSelectedConnectionNo = setSelectedConsumerConnectionNo;

  const selectedConnection: ElectricityConnection | null =
    consumerBillingSummary?.selectedConnection ||
    (hasConnections
      ? consumerConnections.find(c => c.consumerNo === selectedConnectionNo) || consumerConnections[0]
      : null);

  // Canonical Consumer Analytics (connection-scoped & account-scoped single source of truth)
  const consumerCanonicalAnalytics = useMemo(
    () =>
      selectConsumerCanonicalAnalytics({
        connections: consumerConnections,
        bills: consumerBills,
        payments: consumerPayments,
        applications: consumerApplications,
        complaints: consumerComplaints,
        notifications: consumerNotifications,
        actorScope: {
          accountId: currentUserId === 'anonymous' ? 'demo_consumer' : currentUserId,
          email: currentUserEmail,
          linkedConsumerNo: consumerConnections[0]?.consumerNo,
          consumerName: currentUserName,
          ownedConsumerNos: consumerConnections.map(c => c.consumerNo)
        },
        selectedConnectionNo,
        referenceDate: businessReferenceDate,
        waivers: lateChargeWaivers,
        reversals: paymentReversals,
        enableCommercialHybridHistory: true,
      }),
    [
      consumerConnections,
      consumerBills,
      consumerPayments,
      consumerApplications,
      consumerComplaints,
      consumerNotifications,
      currentUserId,
      currentUserEmail,
      currentUserName,
      selectedConnectionNo,
      businessReferenceDate,
      lateChargeWaivers,
      paymentReversals,
    ]
  );

  const localizedConsumptionHistory = useMemo(
    () =>
      consumerCanonicalAnalytics.consumptionTrendSeries.map(item => ({
        ...item,
        displayMonth: localizeConsumptionMonth(item.month, language)
      })),
    [consumerCanonicalAnalytics.consumptionTrendSeries, language]
  );

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [showConsumptionDataTable, setShowConsumptionDataTable] = useState(false);
  const [billStatusFilter, setBillStatusFilter] = useState<'ALL' | 'UNPAID' | 'OVERDUE' | 'PAID' | 'PARTIALLY_PAID' | 'SCHEDULED'>('ALL');
  const [expandedBillTimelines, setExpandedBillTimelines] = useState<Record<string, boolean>>({});
  const [selectedBillToPay, setSelectedBillToPay] = useState<string | null>(null);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<PaymentTransaction['paymentMethod']>('UPI / BHIM');
  const [paymentModeOption, setPaymentModeOption] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [customPaymentAmount, setCustomPaymentAmount] = useState<string>('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ElectricityBill | null>(null);
  const [activeOfficialDocument, setActiveOfficialDocument] = useState<GeneratedOfficialDocument | null>(null);
  const [qrVerificationTarget, setQrVerificationTarget] = useState<{
    billNo: string;
    consumerNo: string;
  } | null>(null);

  useEffect(() => {
    const checkHashForQrVerification = () => {
      if (typeof window === 'undefined') return;
      const parsed = parseBillVerificationUrl(window.location.hash || window.location.href);
      if (parsed.isValid && parsed.ref) {
        setQrVerificationTarget({
          billNo: parsed.ref,
          consumerNo: parsed.consumerNo || '',
        });
      }
    };
    checkHashForQrVerification();
    window.addEventListener('hashchange', checkHashForQrVerification);
    return () => window.removeEventListener('hashchange', checkHashForQrVerification);
  }, []);

  const consumerDocumentActor = useMemo(
    () => ({
      id: currentUserId,
      name: currentUserName,
      role: 'consumer' as const,
      email: currentUserEmail,
      subdivision: selectedConnection?.subdivision,
      consumerNo: selectedConnection?.consumerNo,
      ownedConsumerNos: consumerConnections.map(c => c.consumerNo),
    }),
    [currentUserId, currentUserName, currentUserEmail, selectedConnection, consumerConnections]
  );

  // Link Existing Connection Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedComplaintForTimeline, setSelectedComplaintForTimeline] = useState<ComplaintRecord | null>(null);
  const activeTimelineComplaint = selectedComplaintForTimeline
    ? (consumerComplaints.find(c => c.id === selectedComplaintForTimeline.id) || selectedComplaintForTimeline)
    : null;
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

  // Service request intent & smart prefill state
  const [serviceRequestType, setServiceRequestType] = useState<ConsumerServiceRequestType>('NEW_CONNECTION');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('new_connection');
  const [linkedConsumerNo, setLinkedConsumerNo] = useState<string>('');
  const [linkedMeterNo, setLinkedMeterNo] = useState<string>('');
  const [currentSanctionedLoadKw, setCurrentSanctionedLoadKw] = useState<number | null>(null);
  const [loadChangeConfirmed, setLoadChangeConfirmed] = useState<boolean>(false);
  const [userEditedFields, setUserEditedFields] = useState<Set<keyof ConsumerServicePrefillState>>(
    () => new Set()
  );

  // Document attachments preview state
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([
    'Aadhaar Card (PDF, 420 KB)',
    'Registered Ownership Deed / Index-II (PDF, 1.2 MB)',
    'Government Licensed Electrical Contractor Test Certificate (PDF, 850 KB)'
  ]);

  const markFieldEdited = (field: keyof ConsumerServicePrefillState) => {
    setUserEditedFields(prev => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  };

  const applyPrefillStateToWizard = (prefill: ConsumerServicePrefillState) => {
    setServiceRequestType(prefill.serviceRequestType);
    setLinkedConsumerNo(prefill.linkedConsumerNo);
    setLinkedMeterNo(prefill.linkedMeterNo);
    setApplicantName(prefill.applicantName);
    setApplicantPhone(prefill.applicantPhone);
    setApplicantEmail(prefill.applicantEmail);
    setSubdivision(prefill.subdivision);
    setAddress(prefill.address);
    setPincode(prefill.pincode);
    setPremisesType(prefill.premisesType);
    setCategory(prefill.category);
    setLoadKw(prefill.loadKw);
    setCurrentSanctionedLoadKw(prefill.currentSanctionedLoadKw);
    setPhase(prefill.phase);
    setPurpose(prefill.purpose);
    setSolarInterest(prefill.solarInterest);
    setLoadChangeConfirmed(prefill.loadChangeConfirmed);
    setUploadedDocs(prefill.uploadedDocs);
  };

  const getCurrentWizardPrefillSnapshot = (): ConsumerServicePrefillState => ({
    serviceRequestType,
    linkedConsumerNo,
    linkedMeterNo,
    currentSanctionedLoadKw,
    applicantName,
    applicantPhone,
    applicantEmail,
    subdivision,
    address,
    pincode,
    premisesType,
    category,
    loadKw: Number(loadKw),
    phase,
    purpose,
    solarInterest,
    loadChangeConfirmed,
    uploadedDocs,
    prefilledFromConnection: Boolean(linkedConsumerNo)
  });

  const initializeServiceRequestWizard = (
    mode: ConsumerServiceRequestType,
    targetConnNo?: string
  ) => {
    const connNoToUse = targetConnNo ?? selectedConnection?.consumerNo ?? '';
    if (connNoToUse && connNoToUse !== selectedConnectionNo) {
      setSelectedConnectionNo(connNoToUse);
    }
    const nextPrefill = buildConsumerServicePrefillState({
      requestType: mode,
      connections: consumerConnections,
      selectedConnectionNo: connNoToUse,
      sessionUser: demoSession?.user || null,
      isDefaultDemoConsumer
    });
    setUserEditedFields(new Set());
    applyPrefillStateToWizard(nextPrefill);
    setFormStep(1);
    setActiveTab('new-connection');
  };

  const handleWizardConnectionSwitch = (nextConnNo: string) => {
    setSelectedConnectionNo(nextConnNo);
    if (serviceRequestType === 'SOLAR_NET_METERING' || serviceRequestType === 'LOAD_CHANGE') {
      const freshPrefill = buildConsumerServicePrefillState({
        requestType: serviceRequestType,
        connections: consumerConnections,
        selectedConnectionNo: nextConnNo,
        sessionUser: demoSession?.user || null,
        isDefaultDemoConsumer
      });
      const merged = mergePrefillPreservingUserEdits(
        getCurrentWizardPrefillSnapshot(),
        freshPrefill,
        userEditedFields
      );
      applyPrefillStateToWizard(merged);
    }
  };

  // Complaint form states
  const [cmpCategory, setCmpCategory] = useState<'Power Outage' | 'Voltage Fluctuation' | 'Meter Fault' | 'Billing Dispute'>('Voltage Fluctuation');
  const [cmpPriority, setCmpPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [cmpDesc, setCmpDesc] = useState('');

  // Canonical reconciled bills & primary active bill for the selected connection
  const selectedConnectionBillingSummary = consumerBillingSummary.selectedConnectionSummary;
  const selectedConnectionBills: ReconciledElectricityBill[] =
    selectedConnectionBillingSummary.visibleBills;
  const selectedConnectionScheduledBills: ReconciledElectricityBill[] =
    selectedConnectionBillingSummary.scheduledBills || [];
  const filteredConnectionBills = useMemo(() => {
    if (billStatusFilter === 'SCHEDULED') return [];
    return selectedConnectionBills.filter(bill => {
      if (billStatusFilter === 'ALL') return true;
      if (billStatusFilter === 'UNPAID') {
        return !bill.isPaid && bill.isDue && !bill.isOverdue && bill.effectiveStatus !== 'Overdue';
      }
      if (billStatusFilter === 'OVERDUE') {
        return !bill.isPaid && (bill.effectiveStatus === 'Overdue' || bill.isOverdue);
      }
      if (billStatusFilter === 'PAID') return bill.isPaid || bill.effectiveStatus === 'Paid';
      if (billStatusFilter === 'PARTIALLY_PAID') return bill.isPartiallyPaid || bill.effectiveStatus === 'Partially Paid';
      return true;
    });
  }, [selectedConnectionBills, billStatusFilter]);
  const selectedConnectionPayments: PaymentTransaction[] =
    selectedConnectionBillingSummary.paymentHistory;
  const currentBill: ReconciledElectricityBill | null =
    selectedConnectionBillingSummary.latestBill;
  const dashboardBadgeState = selectedConnectionBillingSummary.dashboardBadgeState;

  const billModalTarget: ReconciledElectricityBill | null = useMemo(() => {
    if (!selectedBillToPay) return currentBill;
    return (
      selectedConnectionBills.find(b => b.billNo === selectedBillToPay) ||
      consumerBillingSummary.allAccountReconciledBills.find(b => b.billNo === selectedBillToPay) ||
      currentBill
    );
  }, [selectedBillToPay, selectedConnectionBills, consumerBillingSummary, currentBill]);

  // Dynamic Sanction Cost Calculation Breakdown
  const serviceCharge = loadKw * 1150;
  const securityDeposit = loadKw * 800 + 1300;
  const meterTestingFee = 800;
  const totalSanctionEstimate = serviceCharge + securityDeposit + meterTestingFee;

  const docExtraUi = BILL_AND_RECEIPT_EXTRA_LABELS[language] || BILL_AND_RECEIPT_EXTRA_LABELS.en;

  const handlePayClick = (billNo: string) => {
    const target =
      selectedConnectionBills.find(b => b.billNo === billNo) ||
      consumerBillingSummary.allAccountReconciledBills.find(b => b.billNo === billNo);
    setSelectedBillToPay(billNo);
    setPaymentModeOption('FULL');
    setCustomPaymentAmount(
      target ? String(Math.max(1, Math.round(target.outstandingBalance / 2))) : ''
    );
    setIsPayModalOpen(true);
  };

  const handleViewElectricityBill = (bill: ElectricityBill) => {
    const conn =
      consumerConnections.find(c => c.consumerNo === bill.consumerNo) ||
      selectedConnection;
    const doc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill,
      connection: conn,
      payments: consumerPayments,
      allBills: bills,
      language,
      dataSource: dataMode,
      referenceDate: businessReferenceDate,
      calculationTimestampIst: `${businessReferenceDate} 10:30 IST`,
      waivers: lateChargeWaivers,
      reversals: paymentReversals,
    });
    setActiveOfficialDocument(doc);
  };

  const handleDownloadElectricityBillPdf = (bill: ElectricityBill) => {
    const conn =
      consumerConnections.find(c => c.consumerNo === bill.consumerNo) ||
      selectedConnection;
    const doc = generateElectricityBillDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill,
      connection: conn,
      payments: consumerPayments,
      allBills: bills,
      language,
      dataSource: dataMode,
      referenceDate: businessReferenceDate,
      calculationTimestampIst: `${businessReferenceDate} 10:30 IST`,
      waivers: lateChargeWaivers,
      reversals: paymentReversals,
    });
    const res = triggerOfficialDocumentPdfDownload(doc);
    if (res.downloaded) {
      showToast(`Downloaded ${res.filename}`, 'success');
    }
  };

  const handleViewAccountStatement = (targetBill: ElectricityBill | ReconciledElectricityBill | string) => {
    const resolvedBill =
      typeof targetBill === 'string'
        ? consumerBillingSummary.allAccountReconciledBills.find(b => b.billNo === targetBill) ||
          bills.find(b => b.billNo === targetBill)
        : targetBill;
    if (!resolvedBill) return;
    const conn =
      consumerConnections.find(c => c.consumerNo === resolvedBill.consumerNo) ||
      selectedConnection;
    const activeNotice =
      formalNotices.find(n => n.billNo === resolvedBill.billNo) || null;
    const doc = generateUpdatedAccountStatementDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill: resolvedBill,
      connection: conn,
      payments: consumerPayments,
      waivers: lateChargeWaivers,
      reversals: paymentReversals,
      formalNotice: activeNotice,
      referenceDate: businessReferenceDate,
      language,
      dataSource: dataMode,
    });
    setActiveOfficialDocument(doc);
  };

  const handleDownloadAccountStatementPdf = (
    targetBill: ElectricityBill | ReconciledElectricityBill | string
  ) => {
    const resolvedBill =
      typeof targetBill === 'string'
        ? consumerBillingSummary.allAccountReconciledBills.find(b => b.billNo === targetBill) ||
          bills.find(b => b.billNo === targetBill)
        : targetBill;
    if (!resolvedBill) return;
    const conn =
      consumerConnections.find(c => c.consumerNo === resolvedBill.consumerNo) ||
      selectedConnection;
    const activeNotice =
      formalNotices.find(n => n.billNo === resolvedBill.billNo) || null;
    const doc = generateUpdatedAccountStatementDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill: resolvedBill,
      connection: conn,
      payments: consumerPayments,
      waivers: lateChargeWaivers,
      reversals: paymentReversals,
      formalNotice: activeNotice,
      referenceDate: businessReferenceDate,
      language,
      dataSource: dataMode,
    });
    const res = triggerOfficialDocumentPdfDownload(doc);
    if (res.downloaded) {
      showToast(`Downloaded ${res.filename}`, 'success');
    }
  };

  const handleDownloadOverdueBreakdownCsv = (
    billNo: string,
    breakdown: OverdueFinancialBreakdown
  ) => {
    const headers = [
      'Bill No',
      'Consumer No',
      'Original Bill Amount (INR)',
      'Payments Settled (INR)',
      'Remaining Principal (INR)',
      'Accrued Late Charges DPS (INR)',
      'Waived Or Settled Charges (INR)',
      'Total Current Outstanding (INR)',
      'Original Due Date',
      'Days Overdue',
      'Chargeable Days',
      'Annual Rate (%)',
      'Daily Charge Rate (INR)',
      'Calculation Reference Date',
      'Policy Version',
    ];
    const waivedOrSettled = Number(
      ((breakdown.lateChargesWaived || 0) + (breakdown.lateChargesSettled || 0)).toFixed(2)
    );
    const row = [
      breakdown.billNo,
      breakdown.consumerNo,
      breakdown.originalBillAmount.toFixed(2),
      breakdown.successfulPayments.toFixed(2),
      breakdown.remainingPrincipal.toFixed(2),
      breakdown.netLateChargesPayable.toFixed(2),
      waivedOrSettled.toFixed(2),
      breakdown.totalOutstandingPayable.toFixed(2),
      breakdown.dueDate,
      String(breakdown.daysOverdue),
      String(breakdown.chargeableDays),
      String(breakdown.effectiveAnnualRatePercent),
      breakdown.dailyChargeRate.toFixed(3),
      breakdown.referenceDate,
      breakdown.policyVersion,
    ];
    const csvContent = `\uFEFF${headers.join(',')}\n${row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')}\n`;
    const safeBill = billNo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const filename = `vidyutflow-overdue-breakdown-${safeBill}-${businessReferenceDate}.csv`;
    triggerBrowserFileDownload(csvContent, filename, 'text/csv;charset=utf-8');
    showToast(`Downloaded ${filename}`, 'success');
  };

  const handleDownloadConsumptionReportPdf = () => {
    if (!selectedConnection) return;
    const doc = generateConsumptionReportDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      connection: selectedConnection,
      consumptionSeries: consumerCanonicalAnalytics.consumptionTrendSeries,
      referenceDate: businessReferenceDate,
      language,
      dataSource: dataMode,
    });
    const res = triggerOfficialDocumentPdfDownload(doc);
    if (res.downloaded) {
      showToast(`Downloaded ${res.filename}`, 'success');
    }
  };

  const handleDownloadConsumptionReportCsv = () => {
    if (!selectedConnection) return;
    const headers = [
      'Month',
      'Consumer No',
      'Meter Serial No',
      'Tariff Category',
      'Units Consumed (kWh)',
      'Billed Amount (INR)',
      'Ambient Temp (C)',
      'Data Provenance',
      'Bill Reference',
    ];
    const rows = consumerCanonicalAnalytics.consumptionTrendSeries.map(pt => [
      pt.month,
      selectedConnection.consumerNo,
      selectedConnection.meterNo,
      selectedConnection.tariffCategory,
      String(pt.units),
      String(pt.amount),
      String(pt.avgTempC ?? ''),
      pt.isEstimated ? 'Estimated' : pt.billNo ? 'Actual Billed' : 'Recorded Meter History',
      pt.billNo || 'N/A',
    ]);
    const csvLines = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ];
    const csvContent = `\uFEFF${csvLines.join('\n')}\n`;
    const safeConn = selectedConnection.consumerNo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    const filename = `vidyutflow-consumption-report-${safeConn}-${businessReferenceDate}.csv`;
    triggerBrowserFileDownload(csvContent, filename, 'text/csv;charset=utf-8');
    showToast(`Downloaded ${filename}`, 'success');
  };

  const handleDownloadPaymentHistoryPdf = () => {
    if (!selectedConnection) return;
    const doc = generatePaymentHistoryReportDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      connection: selectedConnection,
      payments: selectedConnectionPayments,
      referenceDate: businessReferenceDate,
      language,
      dataSource: dataMode,
    });
    const res = triggerOfficialDocumentPdfDownload(doc);
    if (res.downloaded) {
      showToast(`Downloaded ${res.filename}`, 'success');
    }
  };

  const handleDownloadComplaintAcknowledgmentPdf = (cmp: ComplaintRecord) => {
    const doc = generateComplaintAcknowledgmentDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      complaint: cmp,
      language,
      dataSource: dataMode,
    });
    const res = triggerOfficialDocumentPdfDownload(doc);
    if (res.downloaded) {
      showToast(`Downloaded ${res.filename}`, 'success');
    }
  };

  const handleViewReceipt = (bill: ElectricityBill, explicitPayment?: PaymentTransaction) => {
    setSelectedReceipt(bill);
    const conn = consumerConnections.find(c => c.consumerNo === bill.consumerNo) || selectedConnection;
    const matchingPayment =
      explicitPayment ||
      consumerPayments.find(
        p => p.billNo === bill.billNo && p.status === 'Successful'
      );
    const doc = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill,
      payment: matchingPayment || null,
      connection: conn,
      allPayments: consumerPayments,
      language,
      dataSource: dataMode,
    });
    setActiveOfficialDocument(doc);
    setIsReceiptModalOpen(true);
  };

  const handleDownloadReceiptPdf = (
    bill: ElectricityBill | null,
    payment?: PaymentTransaction | null
  ) => {
    const targetBill =
      bill ||
      (payment ? consumerBills.find(b => b.billNo === payment.billNo) || null : null);
    const targetConsumerNo = targetBill?.consumerNo || payment?.consumerNo;
    const conn =
      consumerConnections.find(c => c.consumerNo === targetConsumerNo) ||
      selectedConnection;
    const resolvedPayment =
      payment ||
      (targetBill
        ? consumerPayments.find(
            p => p.billNo === targetBill.billNo && p.status === 'Successful'
          ) || null
        : null);
    const doc = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill: targetBill,
      payment: resolvedPayment,
      connection: conn,
      allPayments: consumerPayments,
      language,
      dataSource: dataMode,
    });
    const res = triggerOfficialDocumentPdfDownload(doc);
    if (res.downloaded) {
      showToast(`Downloaded ${res.filename}`, 'success');
    }
  };

  const handleDownloadPaymentReceiptPdf = handleDownloadReceiptPdf;

  const handleViewPaymentTransactionReceipt = (payment: PaymentTransaction) => {
    const linkedBill = consumerBills.find(b => b.billNo === payment.billNo) || null;
    const conn = consumerConnections.find(c => c.consumerNo === payment.consumerNo) || selectedConnection;
    const doc = generatePaymentReceiptDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      bill: linkedBill,
      payment,
      connection: conn,
      allPayments: consumerPayments,
      language,
      dataSource: dataMode,
    });
    setActiveOfficialDocument(doc);
    setIsReceiptModalOpen(true);
  };

  const handleViewApplicationAcknowledgment = (app: NewConnectionApplication) => {
    const doc = generateApplicationAcknowledgmentDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      application: app,
      language,
      dataSource: dataMode,
    });
    setActiveOfficialDocument(doc);
  };

  const handleViewComplaintAcknowledgment = (cmp: ComplaintRecord) => {
    const doc = generateComplaintAcknowledgmentDocument({
      role: 'consumer',
      actor: consumerDocumentActor,
      complaint: cmp,
      language,
      dataSource: dataMode,
    });
    setActiveOfficialDocument(doc);
  };

  const handleLoadPresetChange = (kw: number) => {
    setLoadKw(kw);
    markFieldEdited('loadKw');
    // Auto select phase: <=5kW is 1-Phase, >5kW is 3-Phase
    if (kw <= 5) {
      setPhase('1-Phase');
    } else {
      setPhase('3-Phase');
    }
    markFieldEdited('phase');
  };

  const validateNewConnectionStep = (step: 1 | 2 | 3 | 4): string | null => {
    if (step === 1) {
      if (applicantName.trim().length < 2) {
        return 'Step 1 (Applicant Details): Please enter the full name of the applicant.';
      }
      if (fatherOrHusbandName.trim().length < 2) {
        return 'Step 1 (Applicant Details): Please enter Father / Husband Name.';
      }
      const digits = applicantPhone.replace(/\D/g, '');
      if (digits.length < 10) {
        return 'Step 1 (Applicant Details): Please enter a valid 10-digit mobile number.';
      }
      if (!identityProofType.trim() || identityNumber.trim().length < 4) {
        return 'Step 1 (Applicant Details): Please select an identity document and enter its document number.';
      }
    }
    if (step === 2) {
      if (!subdivision.trim()) {
        return 'Step 2 (Premises & Grid): Please select an operational sub-division.';
      }
      if (!premisesType.trim()) {
        return 'Step 2 (Premises & Grid): Please select premises ownership type.';
      }
      if (address.trim().length < 5) {
        return 'Step 2 (Premises & Grid): Please enter the complete street address.';
      }
      if (!/^\d{6}$/.test(pincode.trim())) {
        return 'Step 2 (Premises & Grid): Please enter a valid 6-digit PIN code.';
      }
    }
    if (step === 3) {
      if (!category.trim()) {
        return 'Step 3 (Load & Tariff): Please select a tariff category.';
      }
      if (!Number.isFinite(Number(loadKw)) || Number(loadKw) <= 0) {
        return 'Step 3 (Load & Tariff): Please specify a valid sanctioned load (kW).';
      }
      if (!phase.trim()) {
        return 'Step 3 (Load & Tariff): Please select a supply phase.';
      }
    }
    if (step === 4) {
      if (uploadedDocs.length === 0) {
        return 'Step 4 (Documents & Sanction): Please attach the required verification documents.';
      }
    }
    return null;
  };

  const handleAdvanceToStep = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep <= formStep) {
      setFormStep(targetStep);
      return;
    }
    for (let s = 1; s < targetStep; s++) {
      const err = validateNewConnectionStep(s as 1 | 2 | 3 | 4);
      if (err) {
        setFormStep(s as 1 | 2 | 3 | 4);
        showToast(err, 'error');
        return;
      }
    }
    setFormStep(targetStep);
  };

  const handleNewConnectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const s of [1, 2, 3, 4] as const) {
      const stepErr = validateNewConnectionStep(s);
      if (stepErr) {
        setFormStep(s);
        showToast(stepErr, 'error');
        return;
      }
    }
    const snapshot = getCurrentWizardPrefillSnapshot();
    const validation = validateServiceRequestSubmission(snapshot, language);
    if (!validation.valid) {
      if (
        validation.errorCode === 'LOAD_CHANGE_UNCHANGED' ||
        validation.errorCode === 'LOAD_CHANGE_CONFIRMATION_REQUIRED'
      ) {
        setFormStep(3);
      }
      showToast(validation.errorMessage || tc.mandatoryFieldsToast, 'error');
      return;
    }

    const loadEval = evaluateLoadChangeRequest(currentSanctionedLoadKw, Number(loadKw));

    submitLiveRequest({
      consumer_name: applicantName.trim(),
      mobile_number: applicantPhone.trim(),
      email: applicantEmail.trim(),
      address: formatSubmissionAddress(address, pincode),
      subdivision,
      requested_load_kw: Number(loadKw),
      tariff_category: category,
      phase,
      premises_type: premisesType,
      document_name: uploadedDocs[0] || ''
    }).catch(() => null);

    const newId = submitApplicationDemo({
      applicantName: applicantName.trim(),
      phone: applicantPhone.trim(),
      email: applicantEmail.trim(),
      address: formatSubmissionAddress(address, pincode),
      subdivision,
      category,
      requestedLoadKw: Number(loadKw),
      phase,
      premisesType,
      estimatedSanctionCost: totalSanctionEstimate,
      documentsSubmitted: uploadedDocs,
      serviceRequestType,
      request_type: selectedTemplateCode,
      linkedConsumerNo: linkedConsumerNo || undefined,
      linkedMeterNo: linkedMeterNo || undefined,
      currentSanctionedLoadKw:
        serviceRequestType === 'LOAD_CHANGE' && currentSanctionedLoadKw !== null
          ? currentSanctionedLoadKw
          : undefined,
      loadChangeDirection:
        serviceRequestType === 'LOAD_CHANGE' &&
        (loadEval.direction === 'EXTENSION' || loadEval.direction === 'REDUCTION')
          ? loadEval.direction
          : undefined,
      loadChangeConfirmed:
        serviceRequestType === 'LOAD_CHANGE' ? loadChangeConfirmed : undefined,
      solarInterest,
      purpose
    });

    // Reset step
    setFormStep(1);
    setUserEditedFields(new Set());
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
      {/* Account & Connection Summary Header (Hidden on Dashboard, New Connection and Notifications views for 1:1 clean design match) */}
      {activeTab !== 'dashboard' && activeTab !== 'new-connection' && activeTab !== 'notifications' && (
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
                      handleWizardConnectionSwitch(e.target.value);
                    }}
                    aria-label={tc.selectActiveMeterAria}
                    className="min-h-11 sm:min-h-9 min-w-0 w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#131D31] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors cursor-pointer"
                  >
                    {consumerConnections.map(c => {
                      const connDue =
                        consumerBillingSummary.summariesByConnectionNo[c.consumerNo]?.dueBillCount || 0;
                      return (
                        <option key={c.consumerNo} value={c.consumerNo}>
                          {c.consumerNo} — {localizeTariffCategory(c.tariffCategory, language)} ({c.sanctionedLoadKw} kW)
                          {connDue > 0 ? ` · ${bUi.dueBillsCountBadge(connDue)}` : ''}
                        </option>
                      );
                    })}
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
                  onClick={() => initializeServiceRequestWizard('NEW_CONNECTION')}
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
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tc.linkExistingBtn}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                  onClick={() => initializeServiceRequestWizard('NEW_CONNECTION')}
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

          {/* Multi-Connection Due Bills Transparency Banner (when other connections have due bills) */}
          {hasConnections && consumerBillingSummary.otherConnectionsWithDueBills.length > 0 && (
            <div
              className="p-3.5 sm:p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              data-testid="other-connections-due-banner"
            >
              <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  {bUi.otherConnectionsDueBanner(
                    consumerBillingSummary.otherConnectionsWithDueBills.reduce(
                      (s, item) => s + item.dueBillCount,
                      0
                    ),
                    consumerBillingSummary.otherConnectionsWithDueBills.length
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {consumerBillingSummary.otherConnectionsWithDueBills.map(item => (
                  <button
                    key={item.consumerNo}
                    type="button"
                    onClick={() => handleWizardConnectionSwitch(item.consumerNo)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    {bUi.switchToConnectionWithDueBtn(item.consumerNo, item.dueBillCount)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Financial Breakdown & Daily Charges Banner (Step 4A & 4B) */}
          {hasConnections &&
            currentBill &&
            !currentBill.isPaid &&
            currentBill.outstandingBalance > 0.009 &&
            (currentBill.isOverdue || currentBill.effectiveStatus === 'Overdue') &&
            currentBill.lateChargeBreakdown && (
            <div className="space-y-1.5" data-testid="dashboard-overdue-breakdown-section">
              <OverdueBillBreakdownCard
                breakdown={currentBill.lateChargeBreakdown}
                formalNotice={formalNotices.find(n => n.billNo === currentBill.billNo) || null}
                onPay={handlePayClick}
                onViewAccountStatement={handleViewAccountStatement}
                onDownloadStatementPdf={handleDownloadAccountStatementPdf}
                onDownloadStatementCsv={handleDownloadOverdueBreakdownCsv}
              />
            </div>
          )}

          {/* =========================================================================
              1. GREETING HERO BANNER (With UGVCL Transmission Pylon Vector Art)
             ========================================================================= */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50/30 via-amber-50/15 to-orange-100/40 border border-orange-100/70 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            {/* Left: Greeting Text & Accent Bar */}
            <div className="z-10">
              <div className="text-slate-500 text-sm font-semibold">
                Good Afternoon,
              </div>
              <h1 className="text-2xl sm:text-[28px] font-black text-[#0A2540] tracking-tight leading-tight mt-0.5">
                {currentUserName || 'Smt. Meenaben Patel'}
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
                Manage your electricity services, bills and requests at one place.
              </p>
              <div className="w-12 h-1 bg-[#FF6B00] rounded-full mt-3" />
            </div>

            {/* Right: Scalable Vector Pylons & Overhead Transmission Lines */}
            <div className="relative w-72 sm:w-80 h-28 hidden md:block shrink-0 pointer-events-none select-none">
              <svg viewBox="0 0 320 120" fill="none" className="w-full h-full">
                {/* Warm soft background hills */}
                <path d="M0,105 Q90,65 170,90 T320,55 L320,120 L0,120 Z" fill="#FDF4E7" opacity="0.9" />
                <path d="M0,112 Q100,80 190,100 T320,75 L320,120 L0,120 Z" fill="#FCE8D3" opacity="0.6" />

                {/* Catenary power lines */}
                <path d="M0,62 Q130,95 230,55" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <path d="M0,72 Q135,105 230,65" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <path d="M230,55 Q265,70 300,30" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <path d="M230,65 Q265,80 300,40" stroke="#94A3B8" strokeWidth="1.2" fill="none" />

                {/* Mid Pylon (left) */}
                <g stroke="#0F2B48" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="230" y1="35" x2="218" y2="115" />
                  <line x1="230" y1="35" x2="242" y2="115" />
                  <line x1="223" y1="55" x2="237" y2="55" />
                  <line x1="220" y1="75" x2="240" y2="75" />
                  <line x1="218" y1="95" x2="242" y2="95" />
                  <line x1="223" y1="55" x2="240" y2="75" />
                  <line x1="237" y1="55" x2="220" y2="75" />
                  <line x1="220" y1="75" x2="242" y2="95" />
                  <line x1="240" y1="75" x2="218" y2="95" />
                  <line x1="210" y1="55" x2="250" y2="55" />
                  <line x1="214" y1="65" x2="246" y2="65" />
                  <line x1="230" y1="28" x2="230" y2="35" />
                </g>

                {/* Taller Pylon (right) */}
                <g stroke="#0F2B48" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="300" y1="12" x2="282" y2="115" />
                  <line x1="300" y1="12" x2="318" y2="115" />
                  <line x1="289" y1="40" x2="311" y2="40" />
                  <line x1="285" y1="65" x2="315" y2="65" />
                  <line x1="282" y1="90" x2="318" y2="90" />
                  <line x1="289" y1="40" x2="315" y2="65" />
                  <line x1="311" y1="40" x2="285" y2="65" />
                  <line x1="285" y1="65" x2="318" y2="90" />
                  <line x1="315" y1="65" x2="282" y2="90" />
                  <line x1="272" y1="40" x2="328" y2="40" />
                  <line x1="276" y1="52" x2="324" y2="52" />
                  <line x1="300" y1="5" x2="300" y2="12" />
                </g>
              </svg>
            </div>
          </div>

          {/* =========================================================================
              2. FOUR PRIMARY KPI METRIC CARDS (Exact match to reference)
             ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch" data-testid="consumer-kpi-cards-grid">
            {/* Card 1: Current Bill */}
            <div
              onClick={() => setActiveTab('bills')}
              className="bg-[#F0F7FF] border border-[#D5E6FA] rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Current Bill
                  </div>
                  <div className="text-xl sm:text-[22px] font-black text-[#0A2540] tracking-tight tabular-nums">
                    {hasConnections && currentBill
                      ? `₹${(currentBill.isPartiallyPaid ? currentBill.outstandingBalance : currentBill.totalAmount).toLocaleString('en-IN')}`
                      : '₹2,185.00'}
                  </div>
                  <span
                    data-testid="dashboard-bill-status-badge"
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 bg-rose-100 text-rose-700"
                  >
                    {dashboardBadgeState === 'NO_ACTIVE_CONNECTION'
                      ? tc.noActiveConnection
                      : dashboardBadgeState === 'NO_BILL_GENERATED'
                      ? bUi.statusNoBill
                      : dashboardBadgeState === 'OVERDUE'
                      ? 'Overdue'
                      : dashboardBadgeState === 'PARTIALLY_PAID'
                      ? 'Partially Paid'
                      : dashboardBadgeState === 'UNPAID'
                      ? tc.paymentDue
                      : tc.paid}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Card 2: Total Outstanding */}
            <div
              onClick={() => setActiveTab('bills')}
              className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Outstanding
                  </div>
                  <div className="text-xl sm:text-[22px] font-black text-[#0A2540] tracking-tight tabular-nums">
                    ₹2,197.57
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    (14 days chargeable)
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Card 3: This Month Usage */}
            <div
              onClick={() => setActiveTab('analytics')}
              className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    This Month Usage
                  </div>
                  <div className="text-xl sm:text-[22px] font-black text-[#0A2540] tracking-tight tabular-nums">
                    {hasConnections && currentBill ? `${currentBill.unitsConsumed} kWh` : '360 kWh'}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5 bg-emerald-100 text-emerald-700">
                    <span>↓ 12% vs last month</span>
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Card 4: Due Date & Pay Bill Button */}
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Due Date
                  </div>
                  <div className="text-base sm:text-lg font-black text-[#0A2540] tracking-tight tabular-nums flex items-center gap-1">
                    <span>{hasConnections && currentBill?.dueDate ? currentBill.dueDate : '22-Oct-2026'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 inline" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePayClick(currentBill?.billNo || 'BILL-UG-2026-10-8821')}
                className="px-4 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#12365c] text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shrink-0 ml-2"
              >
                <span>Pay Bill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* =========================================================================
              3. MIDDLE ROW (Electricity Consumption, Connection Details, Quick Services)
             ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Electricity Consumption Chart (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 font-black text-sm text-[#0A2540]">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Electricity Consumption</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className="text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Last 6 Months</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Bar Chart Matching Reference */}
              <div className="pt-2">
                <div className="flex items-end gap-2.5 sm:gap-3 justify-between h-44 px-2 pt-6 pb-2 border-b border-slate-100 relative">
                  {/* Y Axis indicator on left */}
                  <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400">kWh</div>
                  
                  {/* Horizontal grid lines */}
                  <div className="absolute left-6 right-0 top-6 border-b border-dashed border-slate-100 pointer-events-none" />
                  <div className="absolute left-6 right-0 top-18 border-b border-dashed border-slate-100 pointer-events-none" />
                  <div className="absolute left-6 right-0 top-30 border-b border-dashed border-slate-100 pointer-events-none" />

                  {/* 6 Bars */}
                  {[
                    { month: 'May 2026', kwh: 420, active: false, heightPct: '70%' },
                    { month: 'Jun 2026', kwh: 480, active: true, heightPct: '80%' },
                    { month: 'Jul 2026', kwh: 360, active: false, heightPct: '60%' },
                    { month: 'Aug 2026', kwh: 410, active: false, heightPct: '68%' },
                    { month: 'Sep 2026', kwh: 370, active: false, heightPct: '62%' },
                    { month: 'Oct 2026', kwh: 340, active: false, heightPct: '57%' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end z-10">
                      <span className="text-[10px] font-bold text-slate-700 leading-none">
                        {item.kwh}
                      </span>
                      <div
                        className={`w-full max-w-[38px] rounded-t-md transition-all ${
                          item.active
                            ? 'bg-[#2563EB] shadow-xs'
                            : 'bg-[#93C5FD] hover:bg-blue-400'
                        }`}
                        style={{ height: item.heightPct }}
                      />
                      <span className="text-[9.5px] font-semibold text-slate-500 whitespace-nowrap mt-1">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center: Connection Details (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-2 font-black text-sm text-[#0A2540] mb-3">
                <Plug className="w-4 h-4 text-emerald-600" />
                <span>Connection Details</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Consumer No.</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">
                      {selectedConnection?.consumerNo || '04281-99231'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedConnection?.consumerNo || '04281-99231');
                        showToast('Consumer number copied to clipboard', 'info');
                      }}
                      className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                      title="Copy consumer number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Meter No.</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedConnection?.meterNo || 'MTR-2024-884102'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Connection Type</span>
                  <span className="font-semibold text-slate-800">
                    {selectedConnection?.tariffCategory || 'Residential (RGPU)'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Feeder</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={selectedConnection?.feederName || '11kV Visnagar Road Feeder'}>
                    {selectedConnection?.feederName || '11kV Visnagar Road Feeder'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Voltage</span>
                  <span className="font-semibold text-slate-800">
                    232 V (Stable)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Normal Supply
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Services 2x2 Grid (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
              <div className="font-black text-sm text-[#0A2540] mb-3">
                Quick Services
              </div>

              <div className="grid grid-cols-2 gap-2.5 flex-1">
                {/* 1. Apply New Connection */}
                <button
                  type="button"
                  onClick={() => initializeServiceRequestWizard('NEW_CONNECTION')}
                  className="p-3 rounded-xl bg-[#EFF6FF] hover:bg-blue-100/80 border border-[#DBEAFE] flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <PlusCircle className="w-5 h-5 text-blue-600 mb-1" />
                  <span className="text-[11px] font-bold text-[#0A2540] leading-tight">
                    Apply New<br />Connection
                  </span>
                </button>

                {/* 2. Report Power Outage */}
                <button
                  type="button"
                  onClick={() => setActiveTab('complaints')}
                  className="p-3 rounded-xl bg-[#FFF7ED] hover:bg-orange-100/80 border border-[#FFEDD5] flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
                  <span className="text-[11px] font-bold text-[#0A2540] leading-tight">
                    Report<br />Power Outage
                  </span>
                </button>

                {/* 3. Solar Net-Metering */}
                <button
                  type="button"
                  onClick={() => initializeServiceRequestWizard('SOLAR_NET_METERING')}
                  className="p-3 rounded-xl bg-[#F0FDF4] hover:bg-emerald-100/80 border border-[#DCFCE7] flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Sun className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="text-[11px] font-bold text-[#0A2540] leading-tight">
                    Solar<br />Net-Metering
                  </span>
                </button>

                {/* 4. Service Request */}
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className="p-3 rounded-xl bg-[#FAF5FF] hover:bg-purple-100/80 border border-[#F3E8FF] flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-purple-600 mb-1" />
                  <span className="text-[11px] font-bold text-[#0A2540] leading-tight">
                    Service<br />Request
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              4. BOTTOM ROW (Notices & Updates, Recent Activity)
             ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Card 1: Notices & Updates */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-black text-sm text-[#0A2540]">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                  <span>Notices & Updates</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className="text-xs font-bold text-[#0A2540] hover:text-[#FF6B00] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF6B00]" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Notice 1 */}
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF7A00] shrink-0 mt-1.5" />
                    <span className="font-semibold text-slate-800 hover:text-blue-700 transition-colors leading-snug cursor-pointer">
                      Section 56 Formal Notice & Statutory Payment Deadline – 08-Nov-2026
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    27 Oct 2025
                  </span>
                </div>

                {/* Notice 2 */}
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF7A00] shrink-0 mt-1.5" />
                    <span className="font-semibold text-slate-800 hover:text-blue-700 transition-colors leading-snug cursor-pointer">
                      Delayed Payment Surcharge (15% p.a.) – DEMO Policy v2026.1
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    25 Oct 2025
                  </span>
                </div>

                {/* Notice 3 */}
                <div className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#FF7A00] shrink-0 mt-1.5" />
                    <span className="font-semibold text-slate-800 hover:text-blue-700 transition-colors leading-snug cursor-pointer">
                      Consumer Advisory: Online Payment Facility Now Available
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    20 Oct 2025
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-black text-sm text-[#0A2540]">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Recent Activity</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="text-xs font-bold text-[#0A2540] hover:text-[#FF6B00] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#FF6B00]" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Activity 1 */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800 leading-snug">
                      Payment of ₹1,500.00 – Successful
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    10 Oct 2025
                  </span>
                </div>

                {/* Activity 2 */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-semibold text-slate-800 leading-snug">
                      Service Request #SR-48291 – Submitted
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    08 Oct 2025
                  </span>
                </div>

                {/* Activity 3 */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 leading-snug">
                      Bill Generated – ₹2,185.00
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    22 Sep 2025
                  </span>
                </div>
              </div>
            </div>
          </div>



          {/* Consumption Trend & Energy Analytics */}
          <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {tc.consumptionTrendTitle}
                  </h3>
                  <span
                    data-testid="consumer-analytics-source-badge"
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    {consumerConsumptionSource.badgeLabel}
                  </span>
                  {selectedConnection?.lastReadingDate && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {resolveAnalyticsTimestampLabel({
                        timestamp: selectedConnection.lastReadingDate,
                        type: 'measured',
                        language
                      }).formattedText}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {hasConnections && selectedConnection
                    ? `${tc.consumptionTrendSubConnected} ${selectedConnection.meterNo}`
                    : tc.consumptionTrendSubUnlinked}
                </p>
                {hasConnections && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {at.consumerConsumptionDisclosure} · <span className="font-mono text-[10px]">{consumerUncertaintyMeta.badgeText}</span>
                  </p>
                )}
              </div>
              {hasConnections && selectedConnection && (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      {tc.sixMonthAverage} ({at.calculated})
                    </span>
                    <span
                      data-testid="consumer-avg-monthly-kwh"
                      className="font-bold text-slate-900 dark:text-white tabular-nums"
                    >
                      {consumerCanonicalAnalytics.averageMonthlyKwh.toLocaleString()} kWh {tc.perMonthSuffix}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      {tc.latestMeterReading} ({at.measured})
                    </span>
                    <span className="font-bold text-blue-600 dark:text-cyan-400 tabular-nums">
                      {selectedConnection.currentReadingKwh.toLocaleString()} kWh
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowConsumptionDataTable(prev => !prev)}
                      data-testid="toggle-consumption-data-table-btn"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      {showConsumptionDataTable ? 'Hide Table' : 'Data Table'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadConsumptionReportPdf}
                      data-testid="download-consumption-report-pdf-btn"
                      className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadConsumptionReportCsv}
                      data-testid="download-consumption-report-csv-btn"
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {hasConnections && consumerCanonicalAnalytics.isInsufficientTrendHistory && (
              <div
                data-testid="consumer-insufficient-trend-note"
                className="mb-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2 flex-wrap"
              >
                <span>{caTranslations.insufficientTrendHistoryNote}</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {caTranslations.connectionScopedSeriesBadge}: {selectedConnection?.consumerNo}
                </span>
              </div>
            )}

            {hasConnections ? (
              <div className="space-y-4">
                <div className="h-72 w-full" data-testid="consumer-monthly-consumption-chart">
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
                          const payload = props?.payload as { amount?: number; avgTempC?: number; isEstimated?: boolean; billNo?: string } | undefined;
                          const extra = payload?.amount ? ` · ${tc.chartBilledPrefix} ₹${payload.amount.toLocaleString()}` : '';
                          const prov = payload?.isEstimated ? ' (Est)' : payload?.billNo ? ` (${payload.billNo})` : '';
                          return [`${value ?? 0} kWh${extra}${prov}`, String(name ?? tc.chartConsumedEnergy)];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="units"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 2, stroke: '#2563EB', fill: '#ffffff' }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: '#2563EB' }}
                        fillOpacity={1}
                        fill="url(#colorUnits)"
                        name={tc.chartConsumedEnergy}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Accessible Legend & Provenance Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                      <span>Actual Billed / Recorded Meter Reading (kWh)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span>Estimated Cycle (Est)</span>
                    </span>
                  </div>
                  <span className="font-mono text-[10px]">
                    Peak: <strong>{consumerCanonicalAnalytics.peakMonthlyKwh.toLocaleString()} kWh</strong> · Avg Bill: <strong>₹{consumerCanonicalAnalytics.averageMonthlyBillInr.toLocaleString()}</strong>
                  </span>
                </div>

                {/* Accessible Monthly Consumption Data Table */}
                {showConsumptionDataTable && (
                  <div
                    data-testid="consumption-data-table"
                    className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800"
                  >
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5 font-semibold">Billing Month</th>
                          <th className="p-2.5 font-semibold text-right">Consumption (kWh)</th>
                          <th className="p-2.5 font-semibold text-right">Billed Amount (₹)</th>
                          <th className="p-2.5 font-semibold text-center">Provenance</th>
                          <th className="p-2.5 font-semibold">Invoice Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {localizedConsumptionHistory.map(row => (
                          <tr key={row.rawMonthKey} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{row.displayMonth}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{row.units.toLocaleString()} kWh</td>
                            <td className="p-2.5 text-right font-mono text-slate-800 dark:text-slate-200">₹{row.amount.toLocaleString()}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                row.isEstimated
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : row.billNo
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              }`}>
                                {row.isEstimated ? 'Estimated' : row.billNo ? 'Actual Billed' : 'Meter History'}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">{row.billNo || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

          {/* Phase 11D: Native Meter Reading & Billing Review Section */}
            <ConsumerMeterBillingSection
              selectedConnection={selectedConnection}
              consumerBills={consumerBills}
              onRequestSelfReading={() => {
                setActiveTab('outage-map');
                showToast('Open the top-bar Meter Reading & Bill Review workspace to perform optical scan.', 'info');
              }}
            />

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
          <LiveConsumerRequests />
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
                onClick={() => initializeServiceRequestWizard('NEW_CONNECTION')}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{tc.applyForNewConnectionBtn}</span>
              </button>
            </div>

            {consumerConnections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consumerConnections.map(conn => {
                  const isSelected = selectedConnection?.consumerNo === conn.consumerNo;
                  return (
                    <div
                      key={conn.consumerNo}
                      data-testid={`connection-card-${conn.consumerNo}`}
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => {
                        if (!isSelected) {
                          setSelectedConnectionNo(conn.consumerNo);
                          showToast(`${tc.activatedAccountToastPrefix} ${conn.consumerNo} ${tc.activatedAccountToastSuffix}`, 'info');
                        }
                      }}
                      className={`p-5 rounded-xl border transition-all duration-150 space-y-4 ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500 bg-white dark:bg-[#101C35] shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C35] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs cursor-pointer'
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
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isSelected && (
                            <span
                              data-testid="selected-account-badge"
                              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-700 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>{tc.selectedAccountBadge}</span>
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {localizeConnectionStatus(conn.status, language)}
                          </span>
                        </div>
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
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConnectionNo(conn.consumerNo);
                            setActiveTab('bills');
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                        >
                          {tc.viewInvoicesLink}
                        </button>
                        {isSelected ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{tc.activeAccountStatus}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnectionNo(conn.consumerNo);
                              showToast(`${tc.activatedAccountToastPrefix} ${conn.consumerNo} ${tc.activatedAccountToastSuffix}`, 'info');
                            }}
                            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium hover:underline cursor-pointer"
                          >
                            {tc.selectActiveAccountBtn}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {consumerApplications.length} {consumerApplications.length === 1 ? tc.activeApplicationSingular : tc.activeApplicationPlural}
                </span>
                <ExportMenu
                  datasetKey="applications"
                  filteredRecords={consumerApplications}
                  variant="compact"
                />
              </div>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                              {app.id}
                            </span>
                            {(() => {
                              const reqBadge = localizeServiceRequestTypeBadge(app, language);
                              return (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${reqBadge.badgeClasses}`}
                                >
                                  {reqBadge.label}
                                </span>
                              );
                            })()}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {tc.stepPrefix} {app.workflowStep}{tc.ofFivePrefix} {localizeApplicationStatus(app.status, language)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            {tc.applicantLabel} <strong>{app.applicantName}</strong>
                            {app.linkedConsumerNo ? (
                              <> · {tc.consumerNoLabel} <strong className="font-mono">{app.linkedConsumerNo}</strong></>
                            ) : null}{' '}
                            · {tc.requestedLoadLabel} <strong>{app.requestedLoadKw} kW ({localizePhase(app.phase, language)})</strong> · {localizeTariffCategory(app.category, language)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleViewApplicationAcknowledgment(app)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{docUi.viewAcknowledgment}</span>
                          </button>
                          <button
                            onClick={() => openCaseDrawer('application', app.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
        <div className="space-y-6">
          {/* Top Breadcrumb & Hero Banner with UGVCL Desert Pylon Vector Art */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50/20 via-amber-50/10 to-orange-100/30 border border-orange-100/60 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="z-10">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <span>Services</span>
                <span className="text-slate-400">›</span>
                <span className="text-slate-900 font-bold">New Connection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0A2540] tracking-tight leading-tight">
                Apply for New Electricity Connection
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Get a new electricity connection in easy steps.
              </p>
              <div className="w-12 h-1 bg-[#FF6B00] rounded-full mt-3" />
            </div>

            {/* Right: Golden Dunes & High-Voltage Transmission Pylons Line-Art */}
            <div className="relative md:w-80 h-28 hidden md:block select-none pointer-events-none">
              <svg
                viewBox="0 0 320 120"
                className="w-full h-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Soft Golden Dunes */}
                <path
                  d="M-20 120 C 60 70, 160 110, 340 75 L 340 120 Z"
                  fill="#FDE68A"
                  fillOpacity="0.45"
                />
                <path
                  d="M20 120 C 120 85, 200 115, 340 90 L 340 120 Z"
                  fill="#FDBA74"
                  fillOpacity="0.35"
                />

                {/* Transmission Power Lines */}
                <path
                  d="M175 60 Q 235 78, 298 32"
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <path
                  d="M175 68 Q 235 86, 298 40"
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <path
                  d="M175 76 Q 235 94, 298 48"
                  stroke="#475569"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.75"
                />

                {/* Secondary Pylon */}
                <g transform="translate(162, 45) scale(0.48)" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                  <line x1="25" y1="0" x2="10" y2="140" />
                  <line x1="35" y1="0" x2="50" y2="140" />
                  <line x1="5" y1="30" x2="55" y2="30" />
                  <line x1="0" y1="60" x2="60" y2="60" />
                  <line x1="2" y1="90" x2="58" y2="90" />
                  <line x1="18" y1="30" x2="42" y2="60" />
                  <line x1="42" y1="30" x2="18" y2="60" />
                  <line x1="15" y1="60" x2="45" y2="90" />
                  <line x1="45" y1="60" x2="15" y2="90" />
                  <line x1="12" y1="90" x2="48" y2="140" />
                  <line x1="48" y1="90" x2="12" y2="140" />
                  <line x1="30" y1="0" x2="30" y2="-10" />
                </g>

                {/* Primary Transmission Pylon */}
                <g transform="translate(270, 8) scale(0.78)" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="30" y1="0" x2="12" y2="140" />
                  <line x1="40" y1="0" x2="58" y2="140" />
                  <line x1="6" y1="30" x2="64" y2="30" />
                  <line x1="0" y1="62" x2="70" y2="62" />
                  <line x1="2" y1="94" x2="68" y2="94" />
                  <line x1="20" y1="30" x2="50" y2="62" />
                  <line x1="50" y1="30" x2="20" y2="62" />
                  <line x1="16" y1="62" x2="54" y2="94" />
                  <line x1="54" y1="62" x2="16" y2="94" />
                  <line x1="13" y1="94" x2="57" y2="140" />
                  <line x1="57" y1="94" x2="13" y2="140" />
                  <line x1="35" y1="0" x2="35" y2="-12" />
                </g>
              </svg>
            </div>
          </div>

          {/* Stepper & Application Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Left: Application Service Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#0A2540] flex items-center gap-1.5">
                  <span className="text-blue-600 text-xs">✦</span>
                  <span>
                    {serviceRequestType === 'SOLAR_NET_METERING'
                      ? srUi.modeSolarNetMetering
                      : serviceRequestType === 'LOAD_CHANGE'
                      ? srUi.modeLoadChange
                      : tc.newConnFormTitle}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Uttar Gujarat Vij Company Limited (UGVCL)
                </div>
              </div>
            </div>

            {/* Right: Stepper Pills (1, 2, 3, 4) */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { step: 1, label: 'Applicant Details' },
                { step: 2, label: 'Premises & Grid' },
                { step: 3, label: 'Load & Tariff' },
                { step: 4, label: 'Documents & Sanction' }
              ].map(s => {
                const isActive = formStep === s.step;
                const isPast = formStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => handleAdvanceToStep(s.step as 1 | 2 | 3 | 4)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : isPast
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-black ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : isPast
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      {s.step}
                    </span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Prefill Banner for Solar Net-Metering and Load Change */}
          {(serviceRequestType === 'SOLAR_NET_METERING' || serviceRequestType === 'LOAD_CHANGE') && (
            hasConnections && selectedConnection ? (
              <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/70 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-200">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>
                      {srUi.prefilledFromConnectionBannerTitle}:{' '}
                      <span className="font-mono">{linkedConsumerNo || selectedConnection.consumerNo}</span>
                      {linkedMeterNo ? ` (${tc.meterLabel} ${linkedMeterNo})` : ''}
                    </span>
                  </div>

                  {consumerConnections.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="wizard-service-connection-select"
                        className="text-[11px] font-semibold text-teal-800 dark:text-teal-300 whitespace-nowrap"
                      >
                        {srUi.selectConnectionForRequestLabel}
                      </label>
                      <select
                        id="wizard-service-connection-select"
                        value={linkedConsumerNo || selectedConnection.consumerNo}
                        onChange={e => handleWizardConnectionSwitch(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 text-slate-800 dark:text-slate-200"
                      >
                        {consumerConnections.map(c => (
                          <option key={c.consumerNo} value={c.consumerNo}>
                            {c.consumerNo} — {localizeTariffCategory(c.tariffCategory, language)} ({c.sanctionedLoadKw} kW)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-teal-800 dark:text-teal-300">
                  {srUi.prefilledFromConnectionBannerDescPattern
                    .replace('{consumerNo}', linkedConsumerNo || selectedConnection.consumerNo)
                    .replace('{consumerName}', selectedConnection.consumerName)
                    .replace('{currentLoad}', String(selectedConnection.sanctionedLoadKw))
                    .replace('{subdivision}', localizeSubdivision(selectedConnection.subdivision, language))}
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{srUi.noLinkedConnectionWarningTitle}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    {serviceRequestType === 'SOLAR_NET_METERING'
                      ? srUi.noLinkedConnectionSolarDesc
                      : srUi.noLinkedConnectionLoadChangeDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {tc.linkExistingBtn}
                </button>
              </div>
            )
          )}

          {/* Two-Column Form & Information Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Columns: Form */}
            <div className="lg:col-span-8">
              <form onSubmit={handleNewConnectionSubmit} className="space-y-6">
                {/* STEP 1: APPLICANT IDENTITY */}
                {formStep === 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
                    {/* Step 1 Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0A2540]">
                          Applicant Details
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Please provide your details to proceed with the new connection request.
                        </p>
                      </div>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="space-y-4">
                      {/* Row 1: Full Name & Father/Husband Name */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            Full Name of Applicant (as per Aadhaar / PAN) *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={applicantName}
                              onChange={e => {
                                setApplicantName(e.target.value);
                                markFieldEdited('applicantName');
                              }}
                              placeholder="Enter Full Name"
                              required
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            Father / Husband Name *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={fatherOrHusbandName}
                              onChange={e => setFatherOrHusbandName(e.target.value)}
                              placeholder="Enter Father / Husband Name"
                              required
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Mobile Number & Email Address */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            Mobile Number (for SMS & OTP updates) *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="tel"
                              value={applicantPhone}
                              onChange={e => {
                                setApplicantPhone(e.target.value);
                                markFieldEdited('applicantPhone');
                              }}
                              placeholder="Enter 10 Digit Mobile Number"
                              required
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            Email Address (for e-bills and demand notice)
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="email"
                              value={applicantEmail}
                              onChange={e => {
                                setApplicantEmail(e.target.value);
                                markFieldEdited('applicantEmail');
                              }}
                              placeholder="Enter Email Address"
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Identity Verification Document & Document Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            Identity Verification Document *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              value={identityProofType}
                              onChange={e => setIdentityProofType(e.target.value)}
                              className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-800 bg-transparent rounded-xl focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Aadhaar Card">{tc.idAadhaarOption}</option>
                              <option value="PAN Card">{tc.idPanOption}</option>
                              <option value="Voter ID Card">{tc.idVoterOption}</option>
                              <option value="Passport">{tc.idPassportOption}</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            Identity Document Number *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={identityNumber}
                              onChange={e => setIdentityNumber(e.target.value)}
                              placeholder="Enter Document Number"
                              required
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proceed Button */}
                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        onClick={() => handleAdvanceToStep(2)}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <span>Proceed to Premises</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: PREMISES & SUBDIVISION */}
                {formStep === 2 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
                    {/* Step 2 Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0A2540]">
                          Premises & Grid Details
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Specify your operational subdivision, property ownership, and complete address.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.operationalSubDivisionLabel} *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              value={subdivision}
                              onChange={e => {
                                setSubdivision(e.target.value);
                                markFieldEdited('subdivision');
                              }}
                              className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-800 bg-transparent rounded-xl focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Mehsana City North">{tc.subdivMehsanaNorthHq}</option>
                              <option value="Mehsana Industrial GIDC">{localizeSubdivision('Mehsana Industrial GIDC', language)}</option>
                              <option value="Gandhinagar Sub-Division 2">{tc.subdivGandhinagar2}</option>
                              <option value="Visnagar Division">{tc.subdivVisnagar}</option>
                              <option value="Kalol Sub-Division">{tc.subdivKalol}</option>
                              <option value="Kadi Division">{tc.subdivKadi}</option>
                              <option value="Patan Urban Zone">{tc.subdivPatan}</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.premisesOwnershipLabel} *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              value={premisesType}
                              onChange={e => {
                                setPremisesType(e.target.value as any);
                                markFieldEdited('premisesType');
                              }}
                              className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-800 bg-transparent rounded-xl focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Owned">{tc.ownershipOwnedOption}</option>
                              <option value="Rented">{tc.ownershipRentedOption}</option>
                              <option value="Government Leased">{tc.ownershipGovOption}</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1.5">
                          {tc.fullStreetAddressLabel} *
                        </label>
                        <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                          <textarea
                            value={address}
                            onChange={e => {
                              setAddress(e.target.value);
                              markFieldEdited('address');
                            }}
                            rows={2}
                            placeholder="Plot / House No., Street, Locality"
                            required
                            className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.postalPinCodeLabel} *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <span className="text-slate-400 font-bold text-xs absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">#</span>
                            <input
                              type="text"
                              value={pincode}
                              onChange={e => {
                                setPincode(e.target.value);
                                markFieldEdited('pincode');
                              }}
                              placeholder="384002"
                              required
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.nearestLandmarkLabel}
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              placeholder={tc.nearestLandmarkPlaceholder}
                              defaultValue="Opp. Radhanpur Cross Road DP"
                              className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 rounded-xl focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setFormStep(1)}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                      >
                        {tc.backBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdvanceToStep(3)}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>{tc.proceedToTechSpecsBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: LOAD & TECHNICAL SPECS */}
                {formStep === 3 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
                    {/* Step 3 Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0A2540]">
                          Load & Tariff Specifications
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Select your consumer category, purpose of power supply, and load requirements.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.tariffCategoryLabel} *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              value={category}
                              onChange={e => {
                                setCategory(e.target.value as TariffCategory);
                                markFieldEdited('category');
                              }}
                              className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-800 bg-transparent rounded-xl focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Residential (RGPU)">{tc.tariffResidentialOption}</option>
                              <option value="Commercial (NRGP)">{tc.tariffCommercialOption}</option>
                              <option value="Industrial (LTMD)">{tc.tariffIndustrialOption}</option>
                              <option value="Agricultural (AG)">{tc.tariffAgriculturalOption}</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.purposeOfSupplyLabel} *
                          </label>
                          <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              value={purpose}
                              onChange={e => {
                                setPurpose(e.target.value);
                                markFieldEdited('purpose');
                              }}
                              className="w-full pl-10 pr-8 py-2.5 text-xs font-medium text-slate-800 bg-transparent rounded-xl focus:outline-none appearance-none cursor-pointer"
                            >
                              <option value="Domestic / Residential Lighting & Power">{tc.purposeDomesticOption}</option>
                              <option value="Commercial Shop / Office / Retail">{tc.purposeCommercialOption}</option>
                              <option value="Small Scale Workshop / MSME Unit">{tc.purposeMsmeOption}</option>
                              <option value="Agricultural Borewell & Farmhouse">{tc.purposeAgriculturalOption}</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Load Extension / Reduction Comparison & Confirmation Card */}
                      {serviceRequestType === 'LOAD_CHANGE' &&
                        (() => {
                          const loadEval = evaluateLoadChangeRequest(currentSanctionedLoadKw, Number(loadKw));
                          return (
                            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/70 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[11px] text-slate-500 block">
                                    {srUi.currentSanctionedLoadLabel}
                                  </span>
                                  <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                                    {currentSanctionedLoadKw !== null ? `${currentSanctionedLoadKw} kW` : tc.notApplicable}
                                  </span>
                                </div>

                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[11px] text-slate-500 block">
                                    {srUi.requestedNewLoadLabel}
                                  </span>
                                  <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">
                                    {loadKw} kW
                                  </span>
                                </div>

                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[11px] text-slate-500 block">
                                    {srUi.loadDeltaLabel}
                                  </span>
                                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                        loadEval.direction === 'EXTENSION'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                          : loadEval.direction === 'REDUCTION'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                                          : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                    >
                                      {loadEval.direction === 'EXTENSION'
                                        ? `${srUi.directionExtensionBadge} (+${loadEval.deltaKw} kW)`
                                        : loadEval.direction === 'REDUCTION'
                                        ? `${srUi.directionReductionBadge} (${loadEval.deltaKw} kW)`
                                        : srUi.directionUnchangedBadge}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {!loadEval.isValidChange && (
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{srUi.loadChangeInstructionNote}</span>
                                </p>
                              )}

                              <label className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer pt-1">
                                <input
                                  id="load-change-confirm-checkbox"
                                  type="checkbox"
                                  checked={loadChangeConfirmed}
                                  onChange={e => {
                                    setLoadChangeConfirmed(e.target.checked);
                                    markFieldEdited('loadChangeConfirmed');
                                  }}
                                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-semibold leading-snug">
                                  {srUi.loadChangeConfirmCheckboxLabel}
                                </span>
                              </label>
                            </div>
                          );
                        })()}

                      {/* Load kW selector with quick buttons and slider */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            {serviceRequestType === 'LOAD_CHANGE'
                              ? srUi.requestedNewLoadLabel
                              : tc.requestedSanctionLoadLabel}
                          </label>
                          <span className="text-base font-extrabold text-blue-600 font-mono">
                            {loadKw} kW
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[2, 4, 6, 8, 10, 15, 25].map(kwVal => (
                            <button
                              key={kwVal}
                              type="button"
                              onClick={() => handleLoadPresetChange(kwVal)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                loadKw === kwVal
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400'
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
                          className="w-full accent-blue-600 cursor-pointer"
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
                          <label className="text-xs font-bold text-slate-800 block mb-1.5">
                            {tc.supplyPhaseLabel} *
                          </label>
                          <div className="flex gap-4 pt-1">
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="phase"
                                checked={phase === '1-Phase'}
                                onChange={() => {
                                  setPhase('1-Phase');
                                  markFieldEdited('phase');
                                }}
                                className="accent-blue-600"
                              />
                              <span className="font-medium">{tc.phase1Option}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="phase"
                                checked={phase === '3-Phase'}
                                onChange={() => {
                                  setPhase('3-Phase');
                                  markFieldEdited('phase');
                                }}
                                className="accent-blue-600"
                              />
                              <span className="font-medium">{tc.phase3Option}</span>
                            </label>
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={solarInterest}
                              onChange={e => {
                                setSolarInterest(e.target.checked);
                                markFieldEdited('solarInterest');
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold text-slate-900">
                              {tc.enableSolarCheckbox}
                            </span>
                          </label>
                          <p className="text-[11px] text-slate-400 pl-5 mt-0.5">
                            {tc.enableSolarHint}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => handleAdvanceToStep(2)}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                      >
                        {tc.backBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdvanceToStep(4)}
                        className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>{tc.reviewCostEstimateBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: DOCUMENTS & COST ESTIMATE SUMMARY */}
                {formStep === 4 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in">
                    {/* Step 4 Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0A2540]">
                          Documents & Sanction Review
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Review verified documents and preliminary statutory demand charges.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Verification Documents Checklist */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 block">
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
                              className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-slate-800">{localizeDocumentName(doc, language)}</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {tc.verifiedBadge}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Cost Estimate Breakdown Card */}
                      <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                            {tc.sanctionFeeScheduleTitle}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-600">
                            {tc.loadSummaryPrefix} {loadKw} kW ({localizePhase(phase, language)})
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">{tc.serviceLineChargesLabel} ({loadKw} kW × ₹1,150)</span>
                            <span className="font-mono font-semibold text-slate-900">₹{serviceCharge.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">{tc.standardSecurityDepositLabel} ({localizeTariffCategory(category, language)})</span>
                            <span className="font-mono font-semibold text-slate-900">₹{securityDeposit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">{tc.smartMeterTestingFeeLabel}</span>
                            <span className="font-mono font-semibold text-slate-900">₹{meterTestingFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-blue-200 text-sm font-extrabold text-blue-700">
                            <span>{tc.totalEstSanctionPayableLabel}</span>
                            <span className="font-mono text-base">₹{totalSanctionEstimate.toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {tc.payableUponClearanceNote}
                        </p>
                      </div>

                      <div className="flex justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setFormStep(3)}
                          className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                        >
                          {tc.backBtn}
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{tc.submitNewConnBtn}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Right 4 Columns: Important Information Card */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-6">
              <div>
                {/* Header */}
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center text-blue-600 text-[11px] font-bold">
                    i
                  </div>
                  <h4 className="text-sm font-bold text-[#0A2540]">
                    Important Information
                  </h4>
                </div>

                {/* Bullet Points */}
                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">
                      Keep your Aadhaar / PAN and mobile number ready.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">
                      Ensure your address and premises details are correct.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">
                      You can track your application from My Connections section.
                    </span>
                  </div>
                </div>
              </div>

              {/* Vector SVG: House + Electricity Utility Pole */}
              <div className="pt-4 flex justify-center">
                <svg viewBox="0 0 280 140" className="w-full max-w-[260px] h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="140" cy="122" rx="125" ry="12" fill="#EBF5EE" />
                  <circle cx="58" cy="88" r="16" fill="#86EFAC" />
                  <circle cx="70" cy="80" r="18" fill="#4ADE80" />
                  <circle cx="82" cy="88" r="15" fill="#22C55E" />
                  <circle cx="236" cy="100" r="14" fill="#86EFAC" />
                  <circle cx="244" cy="94" r="16" fill="#4ADE80" />
                  <rect x="76" y="78" width="108" height="38" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
                  <rect x="76" y="112" width="108" height="4" fill="#0A2540" />
                  <path d="M70 78 L130 42 L190 78 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M68 78 L130 42 L192 78 L188 81 L130 46 L72 81 Z" fill="#991B1B" />
                  <rect x="156" y="46" width="12" height="18" fill="#B91C1C" rx="1" />
                  <rect x="154" y="44" width="16" height="4" fill="#7F1D1D" rx="1" />
                  <rect x="120" y="86" width="20" height="28" rx="2" fill="#2563EB" />
                  <circle cx="136" cy="101" r="1.5" fill="#FEF08A" />
                  <rect x="124" y="90" width="12" height="6" rx="1" fill="#93C5FD" opacity="0.8" />
                  <rect x="88" y="86" width="18" height="18" rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
                  <line x1="97" y1="86" x2="97" y2="104" stroke="#3B82F6" strokeWidth="1.2" />
                  <line x1="88" y1="95" x2="106" y2="95" stroke="#3B82F6" strokeWidth="1.2" />
                  <rect x="154" y="86" width="18" height="18" rx="2" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
                  <line x1="163" y1="86" x2="163" y2="104" stroke="#3B82F6" strokeWidth="1.2" />
                  <line x1="154" y1="95" x2="172" y2="95" stroke="#3B82F6" strokeWidth="1.2" />
                  <circle cx="130" cy="62" r="5" fill="#DBEAFE" stroke="#B91C1C" strokeWidth="1.5" />
                  <line x1="130" y1="57" x2="130" y2="67" stroke="#B91C1C" strokeWidth="1" />
                  <line x1="125" y1="62" x2="135" y2="62" stroke="#B91C1C" strokeWidth="1" />
                  <rect x="178" y="66" width="3" height="12" fill="#475569" />
                  <circle cx="179.5" cy="66" r="2.5" fill="#0A2540" />
                  <rect x="228" y="32" width="6" height="88" rx="1" fill="#64748B" />
                  <rect x="216" y="44" width="30" height="4" rx="1" fill="#475569" />
                  <rect x="220" y="40" width="3" height="4" fill="#0A2540" />
                  <rect x="238" y="40" width="3" height="4" fill="#0A2540" />
                  <circle cx="221.5" cy="40" r="2" fill="#F97316" />
                  <circle cx="239.5" cy="40" r="2" fill="#F97316" />
                  <rect x="223" y="56" width="8" height="14" rx="2" fill="#94A3B8" />
                  <path d="M221 40 Q 200 58, 180 66" stroke="#334155" strokeWidth="1.4" fill="none" />
                  <path d="M240 40 Q 208 62, 180 68" stroke="#334155" strokeWidth="1.4" fill="none" />
                  <path d="M221 40 Q 248 34, 275 28" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                  <path d="M240 40 Q 258 36, 275 32" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 4: ELECTRICITY BILLS & PAYMENTS & SMART PAYMENT CALENDAR */}
      {/* SUBVIEW 4A: DEDICATED ELECTRICITY BILLS & CURRENT BILLING */}
      {(activeTab === 'bills' || activeTab === 'quick-pay') && (
        <div className="space-y-6" data-testid="consumer-electricity-bills-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            <div className="flex flex-wrap items-center gap-2.5">
              <span
                data-testid="bimonthly-automatic-schedule-badge"
                className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {language === 'gu'
                    ? 'આપોઆપ દ્વિ-માસિક બિલિંગ ચક્ર (2-Month Cycle)'
                    : language === 'hi'
                    ? 'स्वचालित द्वि-मासिक बिलिंग चक्र (2-Month Cycle)'
                    : language === 'mr'
                    ? 'स्वयंचलित द्वि-मासिक बिलिंग चक्र (2-Month Cycle)'
                    : 'Automatic Bi-Monthly (2-Month) Billing Schedule'}
                </span>
              </span>

              <ExportMenu
                datasetKey="bills"
                filteredRecords={filteredConnectionBills}
                allAuthorizedRecords={consumerBillingSummary.allAccountReconciledBills}
              />
            </div>
          </div>

          {/* Useful Status Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {[
              { id: 'ALL' as const, label: language === 'gu' ? 'બધા બિલ' : language === 'hi' ? 'सभी बिल' : language === 'mr' ? 'सर्व बिले' : 'All Bills', count: selectedConnectionBills.length },
              { id: 'UNPAID' as const, label: language === 'gu' ? 'બાકી (Unpaid)' : language === 'hi' ? 'अदत्त (Unpaid)' : language === 'mr' ? 'अदत्त (Unpaid)' : 'Unpaid (Not Overdue)', count: selectedConnectionBills.filter(b => !b.isPaid && b.isDue && !b.isOverdue && b.effectiveStatus !== 'Overdue').length },
              { id: 'OVERDUE' as const, label: language === 'gu' ? 'મુદતવીતી (Overdue)' : language === 'hi' ? 'अतिदेय (Overdue)' : language === 'mr' ? 'मुदतबाह्य (Overdue)' : 'Overdue', count: selectedConnectionBills.filter(b => !b.isPaid && (b.effectiveStatus === 'Overdue' || b.isOverdue)).length },
              { id: 'PAID' as const, label: language === 'gu' ? 'ચૂકવેલ' : language === 'hi' ? 'भुगतान पूर्ण' : language === 'mr' ? 'भरलेले' : 'Paid', count: selectedConnectionBills.filter(b => b.isPaid || b.effectiveStatus === 'Paid').length },
              { id: 'PARTIALLY_PAID' as const, label: language === 'gu' ? 'અંશતઃ ચૂકવેલ' : language === 'hi' ? 'आंशिक भुगतान' : language === 'mr' ? 'अंशतः भरलेले' : 'Partially Paid', count: selectedConnectionBills.filter(b => b.isPartiallyPaid || b.effectiveStatus === 'Partially Paid').length },
              { id: 'SCHEDULED' as const, label: language === 'gu' ? 'નિર્ધારિત (Scheduled)' : language === 'hi' ? 'निर्धारित (Scheduled)' : language === 'mr' ? 'नियोजित (Scheduled)' : 'Scheduled', count: selectedConnectionScheduledBills.length },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                data-testid={`bill-filter-${tab.id.toLowerCase()}`}
                onClick={() => setBillStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billStatusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  billStatusFilter === tab.id
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {hasConnections && consumerBillingSummary.otherConnectionsWithDueBills.length > 0 && (
            <div
              className="p-3.5 sm:p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              data-testid="bills-other-connections-due-banner"
            >
              <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  {bUi.otherConnectionsDueBanner(
                    consumerBillingSummary.otherConnectionsWithDueBills.reduce(
                      (s, item) => s + item.dueBillCount,
                      0
                    ),
                    consumerBillingSummary.otherConnectionsWithDueBills.length
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {consumerBillingSummary.otherConnectionsWithDueBills.map(item => (
                  <button
                    key={item.consumerNo}
                    type="button"
                    onClick={() => handleWizardConnectionSwitch(item.consumerNo)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    {bUi.switchToConnectionWithDueBtn(item.consumerNo, item.dueBillCount)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredConnectionBills.length > 0 ? (
              filteredConnectionBills.map(bill => {
                const statusCountdown = formatCanonicalBillStatusAndCountdown(
                  bill,
                  businessReferenceDate,
                  language
                );
                const linkedFormalNotice =
                  formalNotices.find(n => n.billNo === bill.billNo) || null;
                const billTimeline = !bill.isPaid
                  ? deriveBillPaymentAndNoticeTimeline({
                      bill,
                      referenceDate: businessReferenceDate,
                      formalNotice: linkedFormalNotice,
                      language,
                    })
                  : null;
                const canonicalCurrentPayable = bill.isPaid
                  ? 0
                  : bill.lateChargeBreakdown?.totalOutstandingPayable ??
                    bill.totalOutstandingWithCharges ??
                    bill.outstandingBalance;

                return (
                <div
                  key={bill.billNo}
                  data-testid={`bill-card-${bill.billNo}`}
                  className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {bill.billNo}
                        </span>
                        <span
                          data-testid={`bill-status-badge-${bill.billNo}`}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            bill.effectiveStatus === 'Paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : bill.effectiveStatus === 'Overdue'
                              ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {localizeBillStatus(bill.effectiveStatus, language)}
                        </span>
                        <span
                          data-testid={`bill-countdown-badge-${bill.billNo}`}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            statusCountdown.statusCode === 'PAID'
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : statusCountdown.statusCode === 'OVERDUE'
                              ? 'bg-rose-50/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {statusCountdown.combinedStatusLabel}
                        </span>
                        {statusCountdown.historicalLateSettlementNote && (
                          <span
                            data-testid={`bill-historical-late-note-${bill.billNo}`}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            {statusCountdown.historicalLateSettlementNote}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            bill.billingCycleType === 'BI_MONTHLY'
                              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                          data-testid={`bill-cycle-badge-${bill.billNo}`}
                        >
                          {localizeBillingCycleShortBadge(bill.billingCycleType, language)}
                        </span>
                        {bill.isSimulatedDemoBill && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                            {bUi.demoBillDisclosureBadge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {tc.connectionLabel} {bill.consumerNo} · {tc.meterLabel} {selectedConnection?.meterNo || 'UG-SM-REGISTERED'} · {tc.monthLabel} {localizeBillMonth(bill.billMonth, language)}
                        {bill.periodStartDate && bill.periodEndDate
                          ? ` (${bill.periodStartDate} – ${bill.periodEndDate})`
                          : ''}{' '}
                        · {tc.billDateLabel} {bill.billDate} · {tc.dueDateLabel} {bill.dueDate}
                      </span>
                      {bill.isPartiallyPaid && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block mt-1">
                          {bUi.paidAmountLabel}: ₹{bill.paidAmount.toLocaleString('en-IN')} · {bUi.remainingBalanceLabel}: ₹{canonicalCurrentPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}

                      {/* Itemized Financial Trail (Step 4D) */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs mt-2 font-mono">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                            {language === 'gu' ? 'મૂળ રકમ' : language === 'hi' ? 'मूल राशि' : language === 'mr' ? 'मूळ रक्कम' : 'Original Bill'}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ₹{bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                            {language === 'gu' ? 'ચૂકવેલ' : language === 'hi' ? 'चुकाया गया' : language === 'mr' ? 'भरलेले' : 'Settled'}
                          </span>
                          <span className={`font-semibold ${bill.paidAmount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                            ₹{bill.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                            {language === 'gu' ? 'બાકી મુદ્દલ' : language === 'hi' ? 'शेष मूलधन' : language === 'mr' ? 'शिल्लक मुद्दल' : 'Remaining Principal'}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            ₹{(bill.isPaid ? 0 : (bill.lateChargeBreakdown?.remainingPrincipal ?? bill.outstandingBalance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                            {language === 'gu' ? 'વિલંબિત સરચાર્જ' : language === 'hi' ? 'विलंब अधिभार' : language === 'mr' ? 'विलंब अधिभार' : 'DPS Late Charges'}
                          </span>
                          <span className={`font-semibold ${!bill.isPaid && (bill.lateChargeBreakdown?.netLateChargesPayable ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                            +₹{(bill.isPaid ? 0 : (bill.lateChargeBreakdown?.netLateChargesPayable ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                            {language === 'gu' ? 'કુલ બાકી' : language === 'hi' ? 'कुल बकाया' : language === 'mr' ? 'एकूण बाकी' : 'Current Outstanding'}
                          </span>
                          <span
                            data-testid={`bill-current-outstanding-${bill.billNo}`}
                            className={`font-extrabold ${bill.isPaid || canonicalCurrentPayable <= 0.009 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                          >
                            ₹{canonicalCurrentPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="text-right mr-1">
                        <span className="text-xs text-slate-400 block text-[11px]">
                          {bill.isPartiallyPaid ? bUi.remainingBalanceLabel : tc.payableAmountLabel}
                        </span>
                        <span
                          data-testid={`bill-header-payable-${bill.billNo}`}
                          className="text-lg font-extrabold text-slate-900 dark:text-white font-mono"
                        >
                          ₹{canonicalCurrentPayable.toLocaleString('en-IN', { minimumFractionDigits: canonicalCurrentPayable % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewElectricityBill(bill)}
                        data-testid={`view-bill-btn-${bill.billNo}`}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{docExtraUi.viewElectricityBill}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadElectricityBillPdf(bill)}
                        data-testid={`download-bill-pdf-btn-${bill.billNo}`}
                        className="px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{docExtraUi.downloadBillPdf}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setQrVerificationTarget({
                            billNo: bill.billNo,
                            consumerNo: bill.consumerNo,
                          })
                        }
                        data-testid={`verify-bill-qr-btn-${bill.billNo}`}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{language === 'gu' ? 'QR ચકાસણી' : language === 'hi' ? 'QR सत्यापन' : language === 'mr' ? 'QR पडताळणी' : 'Verify QR'}</span>
                      </button>

                      {!bill.isPaid && canonicalCurrentPayable > 0 && bill.isDue && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleViewAccountStatement(bill)}
                            data-testid={`view-bill-statement-btn-${bill.billNo}`}
                            className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Statement</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAccountStatementPdf(bill)}
                            data-testid={`download-account-statement-pdf-btn-${bill.billNo}`}
                            className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Statement PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePayClick(bill.billNo)}
                            data-testid={`pay-online-btn-${bill.billNo}`}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                          >
                            {tc.payOnlineBtn}
                          </button>
                        </>
                      )}
                      {(bill.isPaid || bill.paidAmount > 0) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(bill)}
                            data-testid={`view-receipt-btn-${bill.billNo}`}
                            className="px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>{tc.viewReceiptBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadReceiptPdf(bill)}
                            data-testid={`download-receipt-pdf-btn-${bill.billNo}`}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{docExtraUi.downloadReceiptPdf}</span>
                          </button>
                        </>
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

                  {/* Part G: Compact & Expandable 10-Item Payment, Notice & Disconnection-Review Timeline for Unsettled Bills */}
                  {billTimeline && (
                    <div
                      data-testid={`bill-timeline-section-${bill.billNo}`}
                      className="p-3.5 rounded-lg bg-amber-50/40 dark:bg-slate-900/70 border border-amber-200/70 dark:border-slate-800 space-y-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Payment, Statutory Notice & Disconnection-Review Summary</span>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            data-testid={`bill-timeline-notice-status-${bill.billNo}`}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          >
                            Notice Status: {billTimeline.item6_formalNoticeStatus}
                          </span>
                          <button
                            type="button"
                            data-testid={`toggle-full-bill-timeline-${bill.billNo}`}
                            aria-expanded={Boolean(expandedBillTimelines[bill.billNo])}
                            onClick={() =>
                              setExpandedBillTimelines(prev => ({
                                ...prev,
                                [bill.billNo]: !prev[bill.billNo],
                              }))
                            }
                            className="px-2.5 py-1 rounded-md border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            {expandedBillTimelines[bill.billNo]
                              ? 'Hide Full Payment & Notice Timeline'
                              : 'View Full Payment & Notice Timeline'}
                          </button>
                        </div>
                      </div>

                      {billTimeline.noticeDeadlineSummaryBanner && (
                        <div
                          data-testid={`bill-timeline-notice-banner-${bill.billNo}`}
                          className="px-2.5 py-1.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold text-[11px]"
                        >
                          {billTimeline.noticeDeadlineSummaryBanner}
                        </div>
                      )}

                      {/* Compact Summary Strip (Default View) */}
                      <div
                        data-testid={`bill-timeline-compact-${bill.billNo}`}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px]"
                      >
                        <div>
                          <span className="text-slate-400 block">Payment Status</span>
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                            {billTimeline.item4_dueOrOverdueCountdownLabel}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Original Due Date</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {billTimeline.item3_originalDueDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Outstanding</span>
                          <span className="font-mono font-extrabold text-rose-700 dark:text-rose-300">
                            ₹{canonicalCurrentPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">DPS Status</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {billTimeline.item5_dpsGracePeriodStatusLabel}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Active Notice Deadline</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {billTimeline.item8_noticePaymentCureDeadlineLabel}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Full 10-Item Statutory Timeline */}
                      {expandedBillTimelines[bill.billNo] && (
                        <div
                          data-testid={`bill-timeline-full-10-items-${bill.billNo}`}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px] pt-2.5 border-t border-amber-200/60 dark:border-slate-800"
                        >
                          <div>
                            <span className="text-slate-400 block">1. Billing Period</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item1_billingPeriod}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">2. Bill Issue Date</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item2_billIssueDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">3. Original Due Date</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item3_originalDueDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">4. Due / Overdue Countdown</span>
                            <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{billTimeline.item4_dueOrOverdueCountdownLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">5. DPS / Grace Status</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item5_dpsGracePeriodStatusLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">6. Formal Notice Status</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item6_formalNoticeStatus}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">7. Notice Issue & Service</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item7_noticeIssueAndServiceDateLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">8. Notice Payment Deadline</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item8_noticePaymentCureDeadlineLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">9. Notice Cure Window</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{billTimeline.item9_noticePeriodDaysRemainingOrElapsedLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">10. Disconnection-Review Status</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{billTimeline.item10_authorizedDisconnectionReviewStatusLabel}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })
            ) : billStatusFilter !== 'SCHEDULED' ? (
              <div
                data-testid="bills-empty-state-card"
                className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-3"
              >
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {hasConnections ? bUi.noBillsForConnectionTitle : tc.noBillsFoundTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {hasConnections
                    ? bUi.noBillsForConnectionDesc
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
            ) : null}

            {/* Read-Only Upcoming Billing Schedule Section (SCHEDULED_NOT_ISSUED Bi-Monthly Cycles) */}
            {(billStatusFilter === 'ALL' || billStatusFilter === 'SCHEDULED') &&
              selectedConnectionScheduledBills.length > 0 && (
                <div
                  data-testid="upcoming-bimonthly-schedule-section"
                  className="p-5 rounded-xl bg-slate-50/90 dark:bg-[#0D172B] border border-slate-200/90 dark:border-slate-800 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {language === 'gu'
                            ? 'આગામી દ્વિ-માસિક બિલિંગ શેડ્યૂલ (માત્ર માહિતી માટે — હજુ બિલ જારી થયું નથી)'
                            : language === 'hi'
                            ? 'आगामी द्वि-मासिक बिलिंग अनुसूची (केवल सूचना — अभी बिल जारी नहीं हुआ है)'
                            : language === 'mr'
                            ? 'आगामी द्वि-मासिक बिलिंग वेळापत्रक (केवळ माहिती — अद्याप बिल जारी नाही)'
                            : 'Upcoming Billing Schedule (Bi-Monthly 2-Calendar-Month Cycles — Read-Only)'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {language === 'gu'
                          ? 'આ ભવિષ્યના બિલિંગ ચક્રો છે. સત્તાવાર બિલ જારી તારીખે મીટર રીડિંગ પછી જ રકમ નક્કી થશે અને ચૂકવવાપાત્ર બનશે.'
                          : language === 'hi'
                          ? 'ये आगामी निर्धारित बिलिंग चक्र हैं। आधिकारिक बिल जारी होने की तिथि पर मीटर रीडिंग के बाद ही देय राशि निर्धारित होगी।'
                          : language === 'mr'
                          ? 'ही आगामी नियोजित बिलिंग चक्रे आहेत. अधिकृत बिल जारी होण्याच्या तारखेला मीटर रीडिंगनंतरच देय रक्कम निश्चित केली जाईल.'
                          : 'Future bi-monthly cycles are shown for planning only. Meter readings and payable amounts are finalized on each cycle’s official issue date.'}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {selectedConnectionScheduledBills.length} Scheduled Cycles · ₹0.00 Payable Now
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {selectedConnectionScheduledBills.map(sched => {
                      const schedStatus = formatCanonicalBillStatusAndCountdown(
                        sched,
                        businessReferenceDate,
                        language
                      );
                      return (
                        <div
                          key={sched.billNo}
                          data-testid={`scheduled-bill-card-${sched.billNo}`}
                          className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span
                              data-testid={`scheduled-cycle-badge-${sched.billNo}`}
                              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700"
                            >
                              {schedStatus.combinedStatusLabel}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {localizeBillingCycleShortBadge(sched.billingCycleType, language)}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {localizeBillMonth(sched.billMonth, language)}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {sched.billingPeriodLabel}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                                Expected Issue Date
                              </span>
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {sched.billDate}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                                Expected Due Date
                              </span>
                              <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                                {sched.dueDate}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Not yet issued — Meter reading & tariff assessment pending until {sched.billDate}.
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* SUBVIEW 4B: DEDICATED SMART PAYMENT CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-6" data-testid="consumer-payment-calendar-view">
          <SmartPaymentCalendar
            bills={consumerBillingSummary.allAccountReconciledBills}
            connections={consumerConnections}
            payments={consumerPayments}
            formalNotices={formalNotices}
            waivers={lateChargeWaivers}
            reversals={paymentReversals}
            referenceDate={businessReferenceDate}
            language={language}
            selectedConnectionNo={selectedConnection?.consumerNo}
            onSelectConnection={(no) => setSelectedConnectionNo(no)}
            onViewBill={(b) => handleViewElectricityBill(b)}
            onPayBill={(bNo) => handlePayClick(bNo)}
          />
        </div>
      )}

      {/* SUBVIEW 5: PAYMENT HISTORY */}
      {(activeTab === 'payments' || activeTab === 'history') && (
        <div className="space-y-6 min-w-0" data-testid="consumer-payment-history-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tc.paymentHistoryTitle}
              </h2>
              <p className="text-xs text-slate-500">
                {tc.paymentHistorySub} ({selectedConnection ? `${selectedConnection.consumerName} · ${selectedConnection.consumerNo}` : currentUserName})
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedConnection && (
                <button
                  type="button"
                  onClick={handleDownloadPaymentHistoryPdf}
                  data-testid="download-payment-history-pdf-btn"
                  className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Payment History PDF</span>
                </button>
              )}
              <ExportMenu
                datasetKey="payments"
                filteredRecords={selectedConnection ? selectedConnectionPayments : consumerPayments}
                allAuthorizedRecords={consumerPayments}
              />
            </div>
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
                    <th className="p-3.5 font-semibold text-right whitespace-nowrap">{docUi.paymentReceipt}</th>
                  </tr>
                </thead>
                {(selectedConnection ? selectedConnectionPayments : consumerPayments).length > 0 ? (
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {(selectedConnection ? selectedConnectionPayments : consumerPayments).map(p => (
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
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                              p.status === 'Successful'
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : p.status === 'Pending Verification'
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {localizePaymentStatus(p.status, language)}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {p.status === 'Successful' ? (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewPaymentTransactionReceipt(p)}
                                data-testid={`payment-history-view-receipt-${p.txId}`}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{docUi.viewReceipt}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadReceiptPdf(null, p)}
                                data-testid={`payment-history-download-pdf-${p.txId}`}
                                className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{docExtraUi.downloadPdf}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  <tbody>
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
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
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {tc.grievanceTrackingTitle}
              </h3>
              <ExportMenu
                datasetKey="complaints"
                filteredRecords={consumerComplaints}
                variant="compact"
              />
            </div>

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

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{tc.filedLabel} {cmp.filedAt}</span>
                      <span>{tc.slaLabel} {cmp.slaTargetHours} {tc.hoursSuffix}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {tc.expectedResolutionLabel} {cmp.slaDueTime}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleViewComplaintAcknowledgment(cmp);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>{docUi.viewAcknowledgment}</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`download-complaint-ack-pdf-btn-${cmp.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            handleDownloadComplaintAcknowledgmentPdf(cmp);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </div>
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
                  initializeServiceRequestWizard('SOLAR_NET_METERING', selectedConnection?.consumerNo);
                  showToast(tc.solarFormInitToast, 'info');
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
                  initializeServiceRequestWizard('LOAD_CHANGE', selectedConnection?.consumerNo);
                  showToast(
                    selectedConnection
                      ? `${tc.loadChangeInitToastPrefix}${selectedConnection.consumerNo}`
                      : srUi.noLinkedConnectionLoadChangeDesc,
                    'info'
                  );
                }}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                {tc.requestLoadChangeBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 8: NOTIFICATIONS (1:1 Match to reference screenshot media_1793977958256_5fa6a4f9.jpg) */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-[#0A2540] transition-colors cursor-pointer"
            >
              Home
            </button>
            <span className="text-slate-400">›</span>
            <span className="text-slate-800 font-semibold">Notifications</span>
          </div>

          {/* Banner with Pylon Illustration */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs relative overflow-hidden p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight">
                Notifications
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
                Stay updated with the latest updates, alerts and important information.
              </p>
              <div className="w-12 h-1 bg-[#FF6B00] rounded-full mt-3" />
            </div>

            {/* Scalable Vector Pylons & Overhead Transmission Lines (Identical to Dashboard) */}
            <div className="relative w-72 sm:w-80 h-24 hidden md:block shrink-0 pointer-events-none select-none">
              <svg viewBox="0 0 320 120" fill="none" className="w-full h-full">
                <path d="M0,105 Q90,65 170,90 T320,55 L320,120 L0,120 Z" fill="#FDF4E7" opacity="0.9" />
                <path d="M0,112 Q100,80 190,100 T320,75 L320,120 L0,120 Z" fill="#FCE8D3" opacity="0.6" />
                <path d="M0,62 Q130,95 230,55" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <path d="M0,72 Q135,105 230,65" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <path d="M230,55 Q265,70 300,30" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <path d="M230,65 Q265,80 300,40" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
                <g stroke="#0F2B48" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="230" y1="35" x2="218" y2="115" />
                  <line x1="230" y1="35" x2="242" y2="115" />
                  <line x1="223" y1="55" x2="237" y2="55" />
                  <line x1="220" y1="75" x2="240" y2="75" />
                  <line x1="218" y1="95" x2="242" y2="95" />
                  <line x1="223" y1="55" x2="240" y2="75" />
                  <line x1="237" y1="55" x2="220" y2="75" />
                  <line x1="220" y1="75" x2="242" y2="95" />
                  <line x1="240" y1="75" x2="218" y2="95" />
                  <line x1="210" y1="55" x2="250" y2="55" />
                  <line x1="214" y1="65" x2="246" y2="65" />
                  <line x1="230" y1="28" x2="230" y2="35" />
                </g>
                <g stroke="#0F2B48" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="300" y1="12" x2="282" y2="115" />
                  <line x1="300" y1="12" x2="318" y2="115" />
                  <line x1="289" y1="40" x2="311" y2="40" />
                  <line x1="285" y1="65" x2="315" y2="65" />
                  <line x1="282" y1="90" x2="318" y2="90" />
                  <line x1="289" y1="40" x2="315" y2="65" />
                  <line x1="311" y1="40" x2="285" y2="65" />
                  <line x1="285" y1="65" x2="318" y2="90" />
                  <line x1="315" y1="65" x2="282" y2="90" />
                  <line x1="272" y1="40" x2="328" y2="40" />
                  <line x1="276" y1="52" x2="324" y2="52" />
                  <line x1="300" y1="5" x2="300" y2="12" />
                </g>
              </svg>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Filter Pills on the left */}
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { id: 'all', label: `All (${consumerNotifications.length})` },
                { id: 'unread', label: `Unread (${consumerNotifications.filter(n => !n.read).length})` },
                { id: 'pending', label: 'Pending / Review' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setConsumerNotifFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    consumerNotifFilter === tab.id
                      ? 'bg-[#0A2540] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions on the right */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Mark All Read</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAllNotifications();
                  setSelectedConsumerNotifIds([]);
                }}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200/80 text-xs font-semibold text-rose-600 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          {/* Notification Cards List */}
          <div className="space-y-3 pt-1">
            {(() => {
              const filteredList = consumerNotifications.filter(n => {
                if (consumerNotifFilter === 'unread') return !n.read;
                if (consumerNotifFilter === 'pending') {
                  return (
                    n.eventType === 'APPLICATION_SUBMITTED' ||
                    n.category === 'Approval' ||
                    n.type === 'info' ||
                    n.type === 'warning' ||
                    (n.title && (n.title.includes('Submitted') || n.title.includes('Inspection') || n.title.includes('Updated')))
                  );
                }
                if (consumerNotifFilter === 'approved') {
                  return (
                    n.eventType === 'APPLICATION_APPROVED' ||
                    n.type === 'success' ||
                    n.statusBadge === 'Payment' ||
                    (n.title && (n.title.includes('Successful') || n.title.includes('Approved')))
                  );
                }
                if (consumerNotifFilter === 'rejected') {
                  return (
                    n.eventType === 'APPLICATION_REJECTED' ||
                    n.type === 'alert' ||
                    n.statusBadge === 'Notice' ||
                    (n.title && (n.title.includes('Overdue') || n.title.includes('Notice') || n.title.includes('Outage')))
                  );
                }
                if (consumerNotifFilter === 'applications') {
                  return Boolean(n.applicationId || n.category === 'Approval' || /APP-\d{4}-\d+/.test(`${n.title} ${n.message}`));
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-200 space-y-2">
                    <Bell className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-800">
                      {tc.noNotificationsTitle}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {tc.noNotificationsDesc}
                    </p>
                  </div>
                );
              }

              return filteredList.map(n => {
                const appId = n.applicationId || `${n.title} ${n.message}`.match(/APP-\d{4}-\d+/)?.[0];
                const cmpId = n.complaintId || `${n.title} ${n.message}`.match(/CMP-[A-Z0-9-]+/)?.[0];
                const isSelected = selectedConsumerNotifIds.includes(n.id);
                const rawSubdivision = n.subdivision || selectedConnection?.subdivision;
                const displaySubdivision = rawSubdivision ? localizeSubdivision(rawSubdivision, language) : undefined;
                const isNotice = n.statusBadge === 'Notice' || n.relatedEntityType === 'notice';
                const isBilling = n.statusBadge === 'Billing' || n.relatedEntityType === 'bill';
                const isPayment = n.statusBadge === 'Payment' || n.relatedEntityType === 'payment';
                const isUpdate = n.statusBadge === 'Update';
                const isOutage = n.statusBadge === 'Alert' || n.category === 'Outage' || n.relatedEntityType === 'outage';
                const isSubmission = n.eventType === 'APPLICATION_SUBMITTED' || Boolean(appId);

                const accentBorder = isSubmission || appId
                  ? 'border-l-4 border-l-[#2563EB]'
                  : isNotice
                  ? 'border-l-4 border-l-[#8B5CF6]'
                  : isBilling
                  ? 'border-l-4 border-l-[#F59E0B]'
                  : isPayment
                  ? 'border-l-4 border-l-[#10B981]'
                  : 'border-l-4 border-l-[#2563EB]';

                const iconCircle = isPayment ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : isNotice ? (
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                ) : isBilling ? (
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                ) : isUpdate ? (
                  <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                );

                const formattedDateTime = n.formattedTimestamp || (n.createdAt ? formatErpDateTime(n.createdAt) : n.time);
                let localizedNotif = localizeConsumerNotification(n, language);

                if (
                  n.eventKey &&
                  n.eventKey.startsWith('BILL-REMINDER:') &&
                  n.relatedEntityId
                ) {
                  const matchedBill = consumerBillingSummary.allAccountReconciledBills.find(
                    b => b.billNo === n.relatedEntityId
                  );
                  if (matchedBill && n.notificationType) {
                    const reminderCopy = buildLocalizedBillingReminderCopy({
                      reminderType: n.notificationType as BillingReminderType,
                      billNo: matchedBill.billNo,
                      consumerNo: matchedBill.consumerNo,
                      billMonth: matchedBill.billMonth,
                      dueDate: matchedBill.dueDate,
                      outstandingBalance: matchedBill.outstandingBalance,
                      totalAmount: matchedBill.totalAmount,
                      isPartiallyPaid: matchedBill.isPartiallyPaid,
                      paidAmount: matchedBill.paidAmount,
                      txId: matchedBill.transactionRef,
                      language
                    });
                    localizedNotif = {
                      ...localizedNotif,
                      title: reminderCopy.title,
                      message: reminderCopy.message,
                      badgeLabel: reminderCopy.statusBadge
                    };
                  }
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${accentBorder}`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
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
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      />

                      {iconCircle}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {appId && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700">
                              {appId.replace('APP-', 'APP - ')}
                            </span>
                          )}
                          {isSubmission && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-sky-50 text-sky-700">
                              ✦ New Submission
                            </span>
                          )}
                          {!appId && isBilling && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              Billing
                            </span>
                          )}
                          {!appId && isNotice && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-purple-50 text-purple-700">
                              Notice
                            </span>
                          )}
                          {!appId && isUpdate && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              Update
                            </span>
                          )}
                          {!appId && isPayment && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              Payment
                            </span>
                          )}
                          {!appId && isOutage && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              Alert
                            </span>
                          )}

                          {!n.read && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-blue-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              • Unread
                            </span>
                          )}
                        </div>

                        <h3 className="text-[15px] sm:text-base font-bold text-[#0A2540] dark:text-white mt-1.5 leading-snug">
                          {localizedNotif.title}
                        </h3>

                        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {localizedNotif.message}
                        </p>

                        {displaySubdivision && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Subdivision: {displaySubdivision}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right cluster: Timestamp & CTA button */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDateTime}</span>
                      </div>

                      {appId ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                            const resolved = userApplications.find(a => a.id === appId)?.id || userApplications[0]?.id || 'APP-2026-0842';
                            openCaseDrawer('application', resolved);
                          }}
                          className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>Open Application</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : isBilling ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                            setActiveTab('bills');
                          }}
                          className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>View Bill</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : isNotice ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                            setActiveTab('bills');
                          }}
                          className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>View Notice</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : isPayment ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                            setActiveTab('payments');
                          }}
                          className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>View Receipt</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : isOutage ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                            setActiveTab('outages');
                          }}
                          className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>View Outage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                            setActiveTab('service-requests');
                            if (cmpId) {
                              openCaseDrawer('complaint', cmpId);
                            }
                          }}
                          className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* SUBVIEW 9: CONSUMER PROFILE WORKSPACE */}
      {activeTab === 'profile' && (
        <ConsumerProfileWorkspace
          onNavigateToNewConnection={() => setActiveTab('new-connection')}
          onLinkConnectionSuccess={(cNo) => {
            if (setSelectedConnectionNo) {
              setSelectedConnectionNo(cNo);
            }
          }}
        />
      )}

      {/* REDESIGNED ENTERPRISE PAYMENT MODAL (PHASE 5 STEP 5.2) */}
      <EnterprisePaymentModal
        isOpen={isPayModalOpen}
        bill={billModalTarget}
        connection={
          consumerConnections.find(
            c => c.consumerNo === (billModalTarget?.consumerNo || selectedConnection?.consumerNo)
          ) || selectedConnection
        }
        existingPayments={consumerPayments}
        referenceDate={businessReferenceDate}
        language={language}
        onClose={() => setIsPayModalOpen(false)}
        onExecutePayment={({
          billNo,
          paymentMethod,
          amountToPay,
          simulatedOutcome,
        }) => {
          return payBillDemoDetailed(billNo, paymentMethod, amountToPay, {
            simulatedOutcome,
          });
        }}
        onViewReceipt={(arg1: any, arg2: any) => {
          setIsPayModalOpen(false);
          const b = arg1 && 'totalAmount' in arg1 ? arg1 : arg2;
          const p = arg1 && 'txId' in arg1 ? arg1 : arg2;
          handleViewReceipt(b, p);
        }}
        onDownloadReceiptPdf={(arg1: any, arg2: any) => {
          const b = arg1 && 'totalAmount' in arg1 ? arg1 : arg2;
          const p = arg1 && 'txId' in arg1 ? arg1 : arg2;
          handleDownloadReceiptPdf(b, p);
        }}
      />

      {/* OFFICIAL DOCUMENT & RECEIPT MODAL */}
      <OfficialDocumentModal
        document={
          activeOfficialDocument ||
          (isReceiptModalOpen && selectedReceipt
            ? generatePaymentReceiptDocument({
                role: 'consumer',
                actor: consumerDocumentActor,
                bill: selectedReceipt,
                payment:
                  consumerPayments.find(
                    p => p.billNo === selectedReceipt.billNo && p.status === 'Successful'
                  ) || null,
                connection:
                  consumerConnections.find(c => c.consumerNo === selectedReceipt.consumerNo) ||
                  selectedConnection,
                allPayments: consumerPayments,
                language,
                dataSource: dataMode,
              })
            : null)
        }
        isOpen={Boolean(activeOfficialDocument) || (isReceiptModalOpen && Boolean(selectedReceipt))}
        onClose={() => {
          setActiveOfficialDocument(null);
          setIsReceiptModalOpen(false);
        }}
        onVerifyBillQr={(billNo, consumerNo) => {
          setActiveOfficialDocument(null);
          setQrVerificationTarget({ billNo, consumerNo });
        }}
      />

      {/* QR CODE BILL VERIFICATION & DIGITAL PAYMENT ENTRY MODAL */}
      <BillVerificationModal
        isOpen={Boolean(qrVerificationTarget)}
        rawReference={qrVerificationTarget?.billNo || ''}
        bill={
          qrVerificationTarget
            ? bills.find(b => b.billNo === qrVerificationTarget.billNo) || null
            : null
        }
        connection={
          qrVerificationTarget
            ? connections.find(c => c.consumerNo === qrVerificationTarget.consumerNo) || null
            : null
        }
        isAuthorized={
          qrVerificationTarget
            ? consumerConnections.some(c => c.consumerNo === qrVerificationTarget.consumerNo)
            : false
        }
        language={language}
        onClose={() => {
          setQrVerificationTarget(null);
          if (typeof window !== 'undefined' && window.location.hash.includes('verify-bill')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        onViewBill={(bill: ElectricityBill) => {
          setQrVerificationTarget(null);
          handleViewElectricityBill(bill);
        }}
        onDownloadPdf={(bill: ElectricityBill) => {
          handleDownloadElectricityBillPdf(bill);
        }}
        onPayBill={(billNo: string) => {
          setQrVerificationTarget(null);
          handlePayClick(billNo);
        }}
      />

      {activeTab === 'outage-map' && <LazyOutageMapSection />}

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
    
      {activeTimelineComplaint && (
        <ConsumerComplaintTimelineModal
          complaint={activeTimelineComplaint}
          isOpen={Boolean(activeTimelineComplaint)}
          onClose={() => setSelectedComplaintForTimeline(null)}
          onReopened={(newCmp) => {
            setSelectedComplaintForTimeline(newCmp);
          }}
        />
      )}
    </div>
  );
};