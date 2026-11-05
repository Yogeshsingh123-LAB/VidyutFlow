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
  QrCode
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

  const handleNewConnectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

          {/* Primary KPI Cards Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch" data-testid="consumer-kpi-cards-grid">
            {/* Card 1: Current Electricity Bill */}
            <div className="h-full p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2.5 min-h-[36px] mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] uppercase tracking-wider leading-snug break-words">
                        {tc.currentElectricityBill}
                      </span>
                    </div>
                    <span
                      data-testid="dashboard-bill-status-badge"
                      className={`text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-md ${
                        dashboardBadgeState === 'NO_ACTIVE_CONNECTION' ||
                        dashboardBadgeState === 'NO_BILL_GENERATED'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                          : dashboardBadgeState === 'OVERDUE'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
                          : dashboardBadgeState === 'PARTIALLY_PAID' ||
                            dashboardBadgeState === 'UNPAID'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          dashboardBadgeState === 'NO_ACTIVE_CONNECTION' ||
                          dashboardBadgeState === 'NO_BILL_GENERATED'
                            ? 'bg-slate-400'
                            : dashboardBadgeState === 'OVERDUE'
                            ? 'bg-rose-500'
                            : dashboardBadgeState === 'PARTIALLY_PAID' ||
                              dashboardBadgeState === 'UNPAID'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      {dashboardBadgeState === 'NO_ACTIVE_CONNECTION'
                        ? tc.noActiveConnection
                        : dashboardBadgeState === 'NO_BILL_GENERATED'
                        ? bUi.statusNoBill
                        : dashboardBadgeState === 'OVERDUE'
                        ? bUi.statusOverdue
                        : dashboardBadgeState === 'PARTIALLY_PAID'
                        ? bUi.statusPartiallyPaid
                        : dashboardBadgeState === 'UNPAID'
                        ? tc.paymentDue
                        : tc.paid}
                    </span>
                  </div>

                  <div className="min-h-[56px] flex flex-col justify-center my-1.5">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <div className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight">
                        {hasConnections && currentBill
                          ? `₹${(currentBill.isPartiallyPaid
                              ? currentBill.outstandingBalance
                              : currentBill.totalAmount
                            ).toLocaleString('en-IN')}`
                          : '₹0'}
                      </div>
                      {hasConnections && currentBill && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug inline-flex items-center gap-1.5 flex-wrap">
                          <span>{tc.forMonthPrefix} {localizeBillMonth(currentBill.billMonth, language)}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {localizeBillingCycleShortBadge(currentBill.billingCycleType, language)}
                          </span>
                        </span>
                      )}
                    </div>
                    {hasConnections && currentBill?.isPartiallyPaid && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                        {bUi.paidAmountLabel}: ₹{currentBill.paidAmount.toLocaleString('en-IN')} ·{' '}
                        {bUi.totalBillAmountLabel}: ₹{currentBill.totalAmount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>

                {hasConnections && currentBill ? (
                  <div className="grid grid-cols-2 gap-3 pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs min-h-[76px] items-start">
                    <div className="min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium leading-snug mb-1">{tc.billedConsumption}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-xs sm:text-[13px] leading-snug block">
                        {currentBill.unitsConsumed} kWh
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium leading-snug mb-1">{tc.invoiceNumber}</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px] leading-snug break-all block">
                        {currentBill.billNo}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 min-h-[76px] leading-relaxed">
                    {tc.noBillsGeneratedDesc}
                  </p>
                )}
              </div>

              <div className="pt-3.5 mt-4 border-t border-slate-100 dark:border-slate-800/80 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {hasConnections && currentBill?.dueDate ? (
                    <>{tc.dueDateLabel} <strong className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">{currentBill.dueDate}</strong></>
                  ) : (
                    tc.dueNonePending
                  )}
                </span>
                {hasConnections && currentBill && currentBill.isDue ? (
                  <button
                    onClick={() => handlePayClick(currentBill.billNo)}
                    className="min-h-[34px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    <span>{tc.payOnlineBtn}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                ) : hasConnections && currentBill ? (
                  <button
                    onClick={() => handleViewReceipt(currentBill)}
                    className="min-h-[34px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                  >
                    {tc.viewReceiptBtn}
                  </button>
                ) : hasConnections && selectedConnection?.status === 'Active' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('bills')}
                    className="min-h-[34px] px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                  >
                    {language === 'gu'
                      ? 'દ્વિ-માસિક બિલિંગ શેડ્યૂલ જુઓ'
                      : language === 'hi'
                      ? 'द्वि-मासिक बिलिंग अनुसूची देखें'
                      : language === 'mr'
                      ? 'द्वि-मासिक बिलिंग वेळापत्रक पहा'
                      : 'View Bi-Monthly Billing Schedule'}
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
            <div className="h-full p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2.5 min-h-[36px] mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] uppercase tracking-wider leading-snug break-words">
                        {tc.connectedFeeder}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                        {consumerFeederTelemetrySource.badgeLabel}
                      </span>
                      <span className={`text-[11px] font-semibold inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${
                        hasConnections
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasConnections ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {hasConnections ? tc.normalSupply : tc.unassigned}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-[56px] flex flex-col justify-center my-1.5">
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                      {hasConnections && selectedConnection ? localizeFeederName(selectedConnection.feederName, language) : tc.noFeederAssigned}
                    </div>
                  </div>
                </div>

                {hasConnections && selectedConnection ? (
                  <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 min-h-[76px] flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-3 text-xs items-start">
                      <div className="min-w-0">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium leading-snug mb-1">{tc.lineVoltageLabel} ({at.simulatedValue})</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-xs sm:text-[13px] leading-snug block">
                          {tc.voltageStableValue}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium leading-snug mb-1">{tc.gridFrequencyLabel} ({at.simulatedValue})</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-xs sm:text-[13px] leading-snug block">
                          50.02 Hz
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-snug">
                      {at.consumerFeederTelemetryNote}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 min-h-[76px] leading-relaxed">
                    {tc.noFeederTelemetryDesc}
                  </p>
                )}
              </div>

              <div className="pt-3.5 mt-4 border-t border-slate-100 dark:border-slate-800/80 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs leading-snug">
                  <span className="text-slate-500 dark:text-slate-400">{tc.scheduledOutagesLabel} </span>
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
            <div className="h-full p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2.5 min-h-[36px] mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] uppercase tracking-wider leading-snug break-words">
                        {tc.serviceTracking}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      {tc.liveStatus}
                    </span>
                  </div>

                  <div className="min-h-[56px] flex flex-col justify-center my-1.5">
                    <div className="flex items-baseline gap-2.5">
                      <div className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-tight">
                        {consumerCanonicalAnalytics.activeApplicationsCount}{' '}
                        {consumerCanonicalAnalytics.activeApplicationsCount === 1
                          ? tc.activeFileSingular
                          : tc.activeFilePlural}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs min-h-[76px] items-start">
                  <div className="min-w-0">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium leading-snug mb-1">{tc.openGrievances}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-xs sm:text-[13px] leading-snug block">
                      {consumerCanonicalAnalytics.openComplaintsCount} {tc.inTriageSuffix}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium leading-snug mb-1">{tc.latestApplication}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 break-words text-xs sm:text-[13px] leading-snug block">
                      {consumerApplications[0] ? localizeApplicationStatus(consumerApplications[0].status, language) : tc.noneSubmitted}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3.5 mt-4 border-t border-slate-100 dark:border-slate-800/80 min-h-[44px] flex items-center justify-between gap-2 flex-wrap">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
              <button
                type="button"
                onClick={() => initializeServiceRequestWizard('NEW_CONNECTION')}
                className="group h-full min-h-[84px] p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
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
                className="group h-full min-h-[84px] p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
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
                className="group h-full min-h-[84px] p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
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
                className="group h-full min-h-[84px] p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200/90 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-xs transition-all text-left flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {serviceRequestType === 'SOLAR_NET_METERING'
                        ? srUi.modeSolarNetMetering
                        : serviceRequestType === 'LOAD_CHANGE'
                        ? srUi.modeLoadChange
                        : tc.newConnFormTitle}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    {tc.newConnFormSub}
                  </p>
                </div>

                {/* Service Request Mode Switcher */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { mode: 'NEW_CONNECTION', label: srUi.modeNewConnection },
                      { mode: 'SOLAR_NET_METERING', label: srUi.modeSolarNetMetering },
                      { mode: 'LOAD_CHANGE', label: srUi.modeLoadChange }
                    ] as const
                  ).map(item => (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => initializeServiceRequestWizard(item.mode, selectedConnection?.consumerNo)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        serviceRequestType === item.mode
                          ? item.mode === 'SOLAR_NET_METERING'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
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
                        onChange={e => {
                          setApplicantName(e.target.value);
                          markFieldEdited('applicantName');
                        }}
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
                        onChange={e => {
                          setApplicantPhone(e.target.value);
                          markFieldEdited('applicantPhone');
                        }}
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
                        onChange={e => {
                          setApplicantEmail(e.target.value);
                          markFieldEdited('applicantEmail');
                        }}
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
                        onChange={e => {
                          setSubdivision(e.target.value);
                          markFieldEdited('subdivision');
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Mehsana City North">{tc.subdivMehsanaNorthHq}</option>
                        <option value="Mehsana Industrial GIDC">{localizeSubdivision('Mehsana Industrial GIDC', language)}</option>
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
                        onChange={e => {
                          setPremisesType(e.target.value as any);
                          markFieldEdited('premisesType');
                        }}
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
                      onChange={e => {
                        setAddress(e.target.value);
                        markFieldEdited('address');
                      }}
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
                        onChange={e => {
                          setPincode(e.target.value);
                          markFieldEdited('pincode');
                        }}
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
                        onChange={e => {
                          setCategory(e.target.value as TariffCategory);
                          markFieldEdited('category');
                        }}
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
                        onChange={e => {
                          setPurpose(e.target.value);
                          markFieldEdited('purpose');
                        }}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="Domestic / Residential Lighting & Power">{tc.purposeDomesticOption}</option>
                        <option value="Commercial Shop / Office / Retail">{tc.purposeCommercialOption}</option>
                        <option value="Small Scale Workshop / MSME Unit">{tc.purposeMsmeOption}</option>
                        <option value="Agricultural Borewell & Farmhouse">{tc.purposeAgriculturalOption}</option>
                      </select>
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
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {serviceRequestType === 'LOAD_CHANGE'
                          ? srUi.requestedNewLoadLabel
                          : tc.requestedSanctionLoadLabel}
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
                            onChange={() => {
                              setPhase('1-Phase');
                              markFieldEdited('phase');
                            }}
                          />
                          <span>{tc.phase1Option}</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="phase"
                            checked={phase === '3-Phase'}
                            onChange={() => {
                              setPhase('3-Phase');
                              markFieldEdited('phase');
                            }}
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
                          onChange={e => {
                            setSolarInterest(e.target.checked);
                            markFieldEdited('solarInterest');
                          }}
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