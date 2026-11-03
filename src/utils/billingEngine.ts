import {
  AppNotification,
  BillAuditMetadata,
  BillingCycleType,
  ElectricityBill,
  ElectricityConnection,
  MeterReadingProvenance,
  NewConnectionApplication,
  PaymentTransaction,
  TariffCategory,
  TariffCyclePolicyMode,
  UserRole,
} from '../types';
import { Language } from '../i18n/types';
import {
  calculateLatePaymentCharges,
  DEFAULT_LATE_CHARGE_POLICY,
  OverdueFinancialBreakdown,
  LateChargePolicy,
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from './lateChargeEngine';

// ============================================================================
// CANONICAL BILLING & RECONCILIATION TYPES
// ============================================================================

export type CanonicalBillStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';

export type DashboardBillBadgeState =
  | 'NO_ACTIVE_CONNECTION'
  | 'NO_BILL_GENERATED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'UNPAID'
  | 'OVERDUE';

export type BillingReminderType =
  | 'BILL_GENERATED'
  | 'UPCOMING_DUE_5D'
  | 'UPCOMING_DUE_1D'
  | 'DUE_TODAY'
  | 'OVERDUE_NOTICE'
  | 'PAYMENT_CONFIRMED';

export interface ReconciledElectricityBill extends ElectricityBill {
  /** Original raw status stored on the bill record */
  rawStatus: ElectricityBill['status'];
  /** Reconciled canonical status after applying successful payments & due-date rules */
  effectiveStatus: CanonicalBillStatus;
  /** Reconciled canonical status alias */
  derivedStatus: CanonicalBillStatus;
  /** Total amount settled via verified Successful payments or Paid status */
  paidAmount: number;
  /** Remaining payable balance: max(0, totalAmount - paidAmount) */
  outstandingBalance: number;
  /** Remaining balance alias for UI & export compatibility */
  remainingBalance: number;
  /** Net accrued late charges payable on this bill */
  totalAccruedLateCharges: number;
  /** Total outstanding payable including remaining principal and net accrued late charges */
  totalOutstandingWithCharges: number;
  /** True if and only if outstandingBalance > 0 */
  isDue: boolean;
  /** True if outstandingBalance > 0 and dueDate < referenceDate (or raw status is Overdue) */
  isOverdue: boolean;
  /** True if 0 < paidAmount < totalAmount */
  isPartiallyPaid: boolean;
  /** True if outstandingBalance === 0 */
  isPaid: boolean;
  /** Successful payment transactions applied to this bill */
  appliedPayments: PaymentTransaction[];
  /** Pending or failed payment attempts linked to this bill */
  unappliedPaymentAttempts: PaymentTransaction[];
  /** True if raw storage had contradictory status vs payment records */
  hasConflict: boolean;
  /** Explanation of any detected conflict */
  conflictReason?: string;
  /** Resolved canonical billing cycle type ('MONTHLY' for legacy bills without explicit field, or 'BI_MONTHLY') */
  billingCycleType: BillingCycleType;
  /** Resolved inclusive billing period start date (e.g. '01-Sep-2026') */
  periodStartDate: string;
  /** Resolved inclusive billing period end date (e.g. '30-Sep-2026' or '31-Oct-2026') */
  periodEndDate: string;
  /** Resolved human-readable billing period label */
  billingPeriodLabel: string;
  /** Step 4A: Delayed payment surcharge and overdue financial breakdown */
  lateChargeBreakdown: OverdueFinancialBreakdown;
}

export type ReconciledBillSummary = ReconciledElectricityBill;

export interface ConnectionBillingSummary {
  connection: ElectricityConnection | null;
  consumerNo: string;
  connectionId: string;
  /** All bills belonging to this connection (Paid, Unpaid, Overdue, Partially Paid), newest first */
  visibleBills: ReconciledElectricityBill[];
  /** Bills with outstandingBalance > 0 */
  dueBills: ReconciledElectricityBill[];
  /** Bills with outstandingBalance === 0 */
  paidBills: ReconciledElectricityBill[];
  /** Count of due bills (Unpaid, Overdue, Partially Paid) for this connection */
  dueBillCount: number;
  /** Count of paid bills for this connection */
  paidBillCount: number;
  /** Total count of generated bills for this connection */
  totalBillCount: number;
  /** Total outstanding payable balance across all due bills for this connection */
  totalOutstandingAmount: number;
  /** Step 4A/4B alias: Total outstanding principal in INR */
  totalOutstandingPrincipalInr: number;
  /** Step 4A: Total accrued late charges across due bills */
  totalAccruedLateCharges?: number;
  /** Step 4A/4B alias: Total accrued late charges in INR */
  totalAccruedLateChargesInr: number;
  /** Step 4A: Total outstanding payable including accrued late charges */
  totalOutstandingWithCharges?: number;
  /** Step 4A/4B alias: Total outstanding payable with late charges in INR */
  totalOutstandingWithChargesInr: number;
  /** Primary bill to display on Dashboard (prioritizes current due bill, else latest generated bill, or null if none) */
  latestBill: ReconciledElectricityBill | null;
  /** Alias for latestBill for Step 4B consumers/tests */
  currentBill: ReconciledElectricityBill | null;
  /** Most recent generated bill by billing period regardless of status */
  mostRecentGeneratedBill: ReconciledElectricityBill | null;
  /** Explicit Dashboard KPI card badge state — never 'PAID' when latestBill is null */
  dashboardBadgeState: DashboardBillBadgeState;
  /** All payment transactions belonging to this connection, newest first */
  paymentHistory: PaymentTransaction[];
  /** Whether this connection is eligible for billing (Active / Meter Installed) */
  billingEligibility: {
    eligible: boolean;
    reason: string;
  };
}

export interface ConnectionDueBreakdownItem {
  consumerNo: string;
  connectionId: string;
  consumerName: string;
  subdivision: string;
  tariffCategory: TariffCategory;
  status: ElectricityConnection['status'];
  dueBillCount: number;
  totalBillCount: number;
  totalOutstandingAmount: number;
  totalAccruedLateCharges?: number;
  totalOutstandingWithCharges?: number;
}

export interface ConsumerAccountBillingSummary {
  ownedConnections: ElectricityConnection[];
  selectedConnection: ElectricityConnection | null;
  selectedConnectionNo: string;
  /** Canonical summary for the currently active/selected connection */
  selectedConnectionSummary: ConnectionBillingSummary;
  /** Map of consumerNo -> ConnectionBillingSummary for all owned connections */
  summariesByConnectionNo: Record<string, ConnectionBillingSummary>;
  /** Due bill count for the currently selected connection */
  selectedConnectionDueCount: number;
  /** Due bill count across ALL connections owned by this consumer account */
  accountDueBillCount: number;
  /** Total generated bills across ALL connections owned by this consumer account */
  accountTotalBillCount: number;
  /** Total outstanding amount across ALL connections owned by this consumer account */
  accountTotalOutstandingAmount: number;
  /** Step 4A: Account-wide total accrued late charges */
  accountTotalAccruedLateCharges?: number;
  /** Step 4A: Account-wide total outstanding payable including accrued late charges */
  accountTotalOutstandingWithCharges?: number;
  /** All reconciled bills across all connections owned by this consumer account */
  allAccountReconciledBills: ReconciledElectricityBill[];
  /** All payment transactions across all connections owned by this consumer account */
  allAccountPayments: PaymentTransaction[];
  /** Breakdown of due counts per connection */
  connectionBreakdown: ConnectionDueBreakdownItem[];
  /** Owned connections that currently have dueBillCount > 0 */
  connectionsWithDueBills: ConnectionDueBreakdownItem[];
  /** Owned connections OTHER than selectedConnection that have dueBillCount > 0 */
  otherConnectionsWithDueBills: ConnectionDueBreakdownItem[];
  /** Canonical count to show in Sidebar / MobileNav badge (matches selected connection) */
  sidebarDueBadgeCount: number;
}

export interface ConsumerBillingActorScope {
  accountId?: string;
  email?: string;
  linkedConsumerNo?: string;
  consumerName?: string;
  ownedConsumerNos?: string[];
  legacyIdentifierMap?: Record<string, string[]>;
}

// ============================================================================
// MULTILINGUAL UI & REMINDER TRANSLATIONS (EN, GU, HI, MR)
// ============================================================================

export interface BillingUiTranslationSet {
  noBillGeneratedYet: string;
  noBillGeneratedDesc: string;
  noBillsForConnectionTitle: string;
  noBillsForConnectionDesc: string;
  statusPaid: string;
  statusUnpaid: string;
  statusOverdue: string;
  statusPartiallyPaid: string;
  statusNoBill: string;
  statusNoActiveConnection: string;
  remainingBalanceLabel: string;
  paidAmountLabel: string;
  totalBillAmountLabel: string;
  dueBillsCountBadge: (count: number) => string;
  otherConnectionsDueBanner: (dueCount: number, connCount: number) => string;
  switchToConnectionWithDueBtn: (consumerNo: string, dueCount: number) => string;
  generateDemoBillBtn: string;
  generateDemoBiMonthlyBillBtn: string;
  demoBillGeneratedToast: (billNo: string, consumerNo: string) => string;
  demoBillDisclosureBadge: string;
  partialPaymentOptionLabel: string;
  fullPaymentOptionLabel: string;
  enterCustomAmountLabel: string;
  gentleRemindersTitle: string;
  reminderBadgeLabel: string;
  monthlyCycleBadge: string;
  biMonthlyCycleBadge: string;
  billingPeriodRangeLabel: string;
  demoTariffPolicyDisclosure: string;
}

export const BILLING_UI_TRANSLATIONS: Record<Language, BillingUiTranslationSet> = {
  en: {
    noBillGeneratedYet: 'No bill generated yet',
    noBillGeneratedDesc:
      'No electricity bill has been issued for this connection yet. A connection without a generated bill has ₹0 payable and is not marked as Paid.',
    noBillsForConnectionTitle: 'No bills generated yet for this connection',
    noBillsForConnectionDesc:
      'There are currently no generated electricity bills for the selected connection. If this connection was recently energized, the first bill will appear upon billing cycle generation.',
    statusPaid: 'Paid',
    statusUnpaid: 'Payment Due',
    statusOverdue: 'Overdue',
    statusPartiallyPaid: 'Partially Paid',
    statusNoBill: 'No Bill Generated',
    statusNoActiveConnection: 'No Active Connection',
    remainingBalanceLabel: 'Remaining Balance',
    paidAmountLabel: 'Paid Amount',
    totalBillAmountLabel: 'Total Bill Amount',
    dueBillsCountBadge: (count: number) => `${count} Due`,
    otherConnectionsDueBanner: (dueCount: number, connCount: number) =>
      `You have ${dueCount} unpaid bill${dueCount === 1 ? '' : 's'} across ${connCount} other linked connection${connCount === 1 ? '' : 's'} under your account.`,
    switchToConnectionWithDueBtn: (consumerNo: string, dueCount: number) =>
      `Switch to ${consumerNo} (${dueCount} Due)`,
    generateDemoBillBtn: 'Generate Current Cycle DEMO Bill',
    generateDemoBiMonthlyBillBtn: 'Generate Bi-Monthly (2-Month) DEMO Bill',
    demoBillGeneratedToast: (billNo: string, consumerNo: string) =>
      `DEMO Bill ${billNo} generated for active connection ${consumerNo}.`,
    demoBillDisclosureBadge: 'SIMULATED DEMO BILL',
    partialPaymentOptionLabel: 'Partial Payment',
    fullPaymentOptionLabel: 'Full Outstanding Balance',
    enterCustomAmountLabel: 'Enter Partial Payment Amount (₹)',
    gentleRemindersTitle: 'Billing & Due Date Reminders',
    reminderBadgeLabel: 'Gentle Reminder',
    monthlyCycleBadge: 'Monthly (1M)',
    biMonthlyCycleBadge: 'Bi-Monthly (2M)',
    billingPeriodRangeLabel: 'Billing Period:',
    demoTariffPolicyDisclosure:
      'Configurable DEMO Bi-Monthly Tariff Policy active (proportional 2-month slab & fixed-charge scaling).',
  },
  gu: {
    noBillGeneratedYet: 'હજુ સુધી કોઈ બિલ જનરેટ થયું નથી',
    noBillGeneratedDesc:
      'આ જોડાણ માટે હજુ સુધી કોઈ વીજળી બિલ જારી કરવામાં આવ્યું નથી. જનરેટ થયેલા બિલ વિનાના જોડાણમાં ₹0 ચૂકવવાપાત્ર છે અને તેને ચૂકવેલ (Paid) તરીકે દર્શાવવામાં આવતું નથી.',
    noBillsForConnectionTitle: 'આ જોડાણ માટે હજુ સુધી કોઈ બિલ જનરેટ થયું નથી',
    noBillsForConnectionDesc:
      'પસંદ કરેલા જોડાણ માટે હાલમાં કોઈ વીજળી બિલ ઉપલબ્ધ નથી. જો આ જોડાણ તાજેતરમાં સક્રિય થયું હોય, તો પ્રથમ બિલ બિલિંગ સાયકલ જનરેટ થતાં દેખાશે.',
    statusPaid: 'ચૂકવાઈ ગયું',
    statusUnpaid: 'ચૂકવણી બાકી',
    statusOverdue: 'મુદત વીતી ગઈ (Overdue)',
    statusPartiallyPaid: 'આંશિક ચૂકવેલ',
    statusNoBill: 'કોઈ બિલ જનરેટ નથી',
    statusNoActiveConnection: 'કોઈ સક્રિય જોડાણ નથી',
    remainingBalanceLabel: 'બાકી ચૂકવવાપાત્ર રકમ',
    paidAmountLabel: 'ચૂકવેલ રકમ',
    totalBillAmountLabel: 'કુલ બિલ રકમ',
    dueBillsCountBadge: (count: number) => `${count} બાકી`,
    otherConnectionsDueBanner: (dueCount: number, connCount: number) =>
      `તમારા ખાતા હેઠળના અન્ય ${connCount} જોડાણમાં ${dueCount} બિલ ચૂકવવાના બાકી છે.`,
    switchToConnectionWithDueBtn: (consumerNo: string, dueCount: number) =>
      `${consumerNo} પર સ્વિચ કરો (${dueCount} બાકી)`,
    generateDemoBillBtn: 'વર્તમાન સાયકલ DEMO બિલ જનરેટ કરો',
    generateDemoBiMonthlyBillBtn: 'દ્વિ-માસિક (૨-મહિના) DEMO બિલ જનરેટ કરો',
    demoBillGeneratedToast: (billNo: string, consumerNo: string) =>
      `સક્રિય જોડાણ ${consumerNo} માટે DEMO બિલ ${billNo} જનરેટ કરવામાં આવ્યું.`,
    demoBillDisclosureBadge: 'સિમ્યુલેટેડ DEMO બિલ',
    partialPaymentOptionLabel: 'આંશિક ચૂકવણી (Partial Payment)',
    fullPaymentOptionLabel: 'સંપૂર્ણ બાકી રકમ',
    enterCustomAmountLabel: 'આંશિક ચૂકવણીની રકમ દાખલ કરો (₹)',
    gentleRemindersTitle: 'બિલિંગ અને નિયત તારીખ રીમાઇન્ડર્સ',
    reminderBadgeLabel: 'સૌમ્ય રીમાઇન્ડર',
    monthlyCycleBadge: 'માસિક (૧-મહિનો)',
    biMonthlyCycleBadge: 'દ્વિ-માસિક (૨-મહિના)',
    billingPeriodRangeLabel: 'બિલિંગ સમયગાળો:',
    demoTariffPolicyDisclosure:
      'રૂપરેખાંકિત DEMO દ્વિ-માસિક ટેરિફ નીતિ સક્રિય (પ્રમાણસર ૨-મહિના સ્લેબ અને સ્થિર ચાર્જ ગણતરી).',
  },
  hi: {
    noBillGeneratedYet: 'अभी तक कोई बिल जनरेट नहीं हुआ है',
    noBillGeneratedDesc:
      'इस कनेक्शन के लिए अभी तक कोई बिजली बिल जारी नहीं किया गया है। बिना बिल वाले कनेक्शन में देय राशि ₹0 है और इसे भुगतान किया गया (Paid) नहीं माना जाता है।',
    noBillsForConnectionTitle: 'इस कनेक्शन के लिए अभी तक कोई बिल जनरेट नहीं हुआ है',
    noBillsForConnectionDesc:
      'चयनित कनेक्शन के लिए वर्तमान में कोई जनरेट किया गया बिजली बिल नहीं है। यदि यह कनेक्शन हाल ही में सक्रिय हुआ है, तो पहला बिल बिलिंग चक्र के बाद दिखाई देगा।',
    statusPaid: 'भुगतान किया गया',
    statusUnpaid: 'भुगतान देय',
    statusOverdue: 'अतिदेय (Overdue)',
    statusPartiallyPaid: 'आंशिक भुगतान',
    statusNoBill: 'कोई बिल जनरेट नहीं',
    statusNoActiveConnection: 'कोई सक्रिय कनेक्शन नहीं',
    remainingBalanceLabel: 'शेष देय राशि',
    paidAmountLabel: 'भुगतान की गई राशि',
    totalBillAmountLabel: 'कुल बिल राशि',
    dueBillsCountBadge: (count: number) => `${count} देय`,
    otherConnectionsDueBanner: (dueCount: number, connCount: number) =>
      `आपके खाते के अंतर्गत ${connCount} अन्य लिंक किए गए कनेक्शनों में ${dueCount} बिल देय हैं।`,
    switchToConnectionWithDueBtn: (consumerNo: string, dueCount: number) =>
      `${consumerNo} पर जाएं (${dueCount} देय)`,
    generateDemoBillBtn: 'वर्तमान चक्र DEMO बिल जनरेट करें',
    generateDemoBiMonthlyBillBtn: 'द्वैमासिक (२-माह) DEMO बिल जनरेट करें',
    demoBillGeneratedToast: (billNo: string, consumerNo: string) =>
      `सक्रिय कनेक्शन ${consumerNo} के लिए DEMO बिल ${billNo} जनरेट किया गया।`,
    demoBillDisclosureBadge: 'सिम्युलेटेड DEMO बिल',
    partialPaymentOptionLabel: 'आंशिक भुगतान (Partial Payment)',
    fullPaymentOptionLabel: 'पूर्ण बकाया राशि',
    enterCustomAmountLabel: 'आंशिक भुगतान राशि दर्ज करें (₹)',
    gentleRemindersTitle: 'बिलिंग और देय तिथि अनुस्मारक',
    reminderBadgeLabel: 'विनम्र अनुस्मारक',
    monthlyCycleBadge: 'मासिक (१-माह)',
    biMonthlyCycleBadge: 'द्वैमासिक (२-माह)',
    billingPeriodRangeLabel: 'बिलिंग अवधि:',
    demoTariffPolicyDisclosure:
      'कॉन्फ़िगर करने योग्य DEMO द्वैमासिक टैरिफ नीति सक्रिय (आनुपातिक २-माह स्लैब एवं स्थिर शुल्क)।',
  },
  mr: {
    noBillGeneratedYet: 'अद्याप कोणतेही बिल जनरेट झालेले नाही',
    noBillGeneratedDesc:
      'या जोडणीसाठी अद्याप कोणतेही वीज बिल जारी करण्यात आलेले नाही. बिल जनरेट न झालेल्या जोडणीची देय रक्कम ₹0 आहे आणि ती भरलेली (Paid) मानली जात नाही.',
    noBillsForConnectionTitle: 'या जोडणीसाठी अद्याप कोणतेही बिल जनरेट झालेले नाही',
    noBillsForConnectionDesc:
      'निवडलेल्या जोडणीसाठी सध्या कोणतेही वीज बिल उपलब्ध नाही. ही जोडणी नुकतीच कार्यान्वित झाली असल्यास, पहिले बिल बिलिंग चक्रानंतर दिसेल.',
    statusPaid: 'भरलेले (Paid)',
    statusUnpaid: 'देय बाकी',
    statusOverdue: 'मुदतबाह्य (Overdue)',
    statusPartiallyPaid: 'अंशतः भरलेले',
    statusNoBill: 'कोणतेही बिल जनरेट नाही',
    statusNoActiveConnection: 'कोणतीही सक्रिय जोडणी नाही',
    remainingBalanceLabel: 'शिल्लक देय रक्कम',
    paidAmountLabel: 'भरलेली रक्कम',
    totalBillAmountLabel: 'एकूण बिल रक्कम',
    dueBillsCountBadge: (count: number) => `${count} देय`,
    otherConnectionsDueBanner: (dueCount: number, connCount: number) =>
      `तुमच्या खात्यांतर्गत इतर ${connCount} जोडण्यांवर ${dueCount} बिले भरणे बाकी आहे.`,
    switchToConnectionWithDueBtn: (consumerNo: string, dueCount: number) =>
      `${consumerNo} निवड करा (${dueCount} देय)`,
    generateDemoBillBtn: 'चालू चक्र DEMO बिल जनरेट करा',
    generateDemoBiMonthlyBillBtn: 'द्वैमासिक (२-महिने) DEMO बिल जनरेट करा',
    demoBillGeneratedToast: (billNo: string, consumerNo: string) =>
      `सक्रिय जोडणी ${consumerNo} साठी DEMO बिल ${billNo} जनरेट करण्यात आले.`,
    demoBillDisclosureBadge: 'सिम्युलेटेड DEMO बिल',
    partialPaymentOptionLabel: 'अंशतः भरणा (Partial Payment)',
    fullPaymentOptionLabel: 'संपूर्ण थकीत रक्कम',
    enterCustomAmountLabel: 'अंशतः भरणा रक्कम प्रविष्ट करा (₹)',
    gentleRemindersTitle: 'बिलिंग आणि देय तारीख आठवण',
    reminderBadgeLabel: 'सौम्य आठवण',
    monthlyCycleBadge: 'मासिक (१-महिना)',
    biMonthlyCycleBadge: 'द्वैमासिक (२-महिने)',
    billingPeriodRangeLabel: 'बिलिंग कालावधी:',
    demoTariffPolicyDisclosure:
      'कॉन्फिगर करण्यायोग्य DEMO द्वैमासिक टॅरिफ धोरण सक्रिय (प्रमाणात २-महिने स्लॅब आणि स्थिर आकार).',
  },
};

export function getBillingUiTranslations(language: Language = 'en'): BillingUiTranslationSet {
  return BILLING_UI_TRANSLATIONS[language] || BILLING_UI_TRANSLATIONS.en;
}

// ============================================================================
// IDENTIFIER & DATE NORMALIZATION HELPERS
// ============================================================================

/**
 * Normalizes a consumerNo, connectionId, or accountId for canonical comparison.
 * Trims whitespace and converts to uppercase without mutating stored IDs.
 */
export function normalizeBillingIdentifier(id: string | null | undefined): string {
  if (!id || typeof id !== 'string') return '';
  return id.trim().toUpperCase();
}

/**
 * Parses common VidyutFlow date formats ('15-Oct-2026', '2026-10-15', '04-Oct-2026 14:22',
 * 'October 2026', 'September–October 2026', 'December 2026–January 2027')
 * into a UTC midnight timestamp (ms) for deterministic due-date and period comparison.
 */
const MONTH_MAP: Record<string, number> = {
  JAN: 0,
  JANUARY: 0,
  FEB: 1,
  FEBRUARY: 1,
  MAR: 2,
  MARCH: 2,
  APR: 3,
  APRIL: 3,
  MAY: 4,
  JUN: 5,
  JUNE: 5,
  JUL: 6,
  JULY: 6,
  AUG: 7,
  AUGUST: 7,
  SEP: 8,
  SEPT: 8,
  SEPTEMBER: 8,
  OCT: 9,
  OCTOBER: 9,
  NOV: 10,
  NOVEMBER: 10,
  DEC: 11,
  DECEMBER: 11,
};

export const FULL_MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const SHORT_MONTH_NAMES_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function parseVidyutDateToUtcMs(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Format 1: DD-MMM-YYYY (with optional time suffix, e.g. '18-Oct-2026' or '04-Oct-2026 14:22')
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthIdx = MONTH_MAP[dmyMatch[2].toUpperCase()];
    const year = parseInt(dmyMatch[3], 10);
    if (!Number.isNaN(day) && monthIdx !== undefined && !Number.isNaN(year)) {
      return Date.UTC(year, monthIdx, day);
    }
  }

  // Format 2: YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const monthIdx = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (!Number.isNaN(year) && !Number.isNaN(monthIdx) && !Number.isNaN(day)) {
      return Date.UTC(year, monthIdx, day);
    }
  }

  // Format 3: Month Year (e.g. 'October 2026')
  const myMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (myMatch) {
    const monthIdx = MONTH_MAP[myMatch[1].toUpperCase()];
    const year = parseInt(myMatch[2], 10);
    if (monthIdx !== undefined && !Number.isNaN(year)) {
      return Date.UTC(year, monthIdx, 1);
    }
  }

  // Format 4: Same-year Bi-Monthly (e.g. 'September–October 2026' or 'Sep-Oct 2026')
  const biMonthlySameYear = trimmed.match(/^([A-Za-z]{3,9})\s*[–-]\s*([A-Za-z]{3,9})\s+(\d{4})$/);
  if (biMonthlySameYear) {
    const endMonthIdx = MONTH_MAP[biMonthlySameYear[2].toUpperCase()];
    const year = parseInt(biMonthlySameYear[3], 10);
    if (endMonthIdx !== undefined && !Number.isNaN(year)) {
      return Date.UTC(year, endMonthIdx, 1);
    }
  }

  // Format 5: Cross-year Bi-Monthly (e.g. 'December 2026–January 2027')
  const biMonthlyCrossYear = trimmed.match(
    /^([A-Za-z]{3,9})\s+(\d{4})\s*[–-]\s*([A-Za-z]{3,9})\s+(\d{4})$/
  );
  if (biMonthlyCrossYear) {
    const endMonthIdx = MONTH_MAP[biMonthlyCrossYear[3].toUpperCase()];
    const endYear = parseInt(biMonthlyCrossYear[4], 10);
    if (endMonthIdx !== undefined && !Number.isNaN(endYear)) {
      return Date.UTC(endYear, endMonthIdx, 1);
    }
  }

  const fallback = Date.parse(trimmed);
  if (!Number.isNaN(fallback)) {
    const d = new Date(fallback);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  return null;
}

/**
 * Calculates calendar days from referenceDate to targetDueDate:
 * - Positive (e.g. +5): due date is 5 days in the future
 * - Zero (0): due today
 * - Negative (e.g. -2): 2 days past due (overdue)
 */
export function calculateDaysUntilDue(
  dueDateStr: string | null | undefined,
  referenceDateStr: string = '15-Oct-2026'
): number | null {
  const dueMs = parseVidyutDateToUtcMs(dueDateStr);
  const refMs = parseVidyutDateToUtcMs(referenceDateStr);
  if (dueMs === null || refMs === null) return null;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((dueMs - refMs) / MS_PER_DAY);
}

export function isBillPastDueDate(
  dueDateStr: string | null | undefined,
  referenceDateStr: string = '15-Oct-2026'
): boolean {
  const days = calculateDaysUntilDue(dueDateStr, referenceDateStr);
  return days !== null && days < 0;
}

// ============================================================================
// CONNECTION OWNERSHIP & LEGACY IDENTIFIER RESOLUTION
// ============================================================================

/**
 * Checks whether a connection belongs to the given consumer actor scope.
 */
export function isConnectionOwnedByConsumerScope(
  connection: ElectricityConnection | null | undefined,
  scope: ConsumerBillingActorScope
): boolean {
  if (!connection) return false;
  const connNo = normalizeBillingIdentifier(connection.consumerNo);
  const connId = normalizeBillingIdentifier(connection.connectionId);
  const connAccId = normalizeBillingIdentifier(connection.accountId);
  const connEmail = normalizeBillingIdentifier(connection.accountEmail);

  const actorAccId = normalizeBillingIdentifier(scope.accountId);
  const actorEmail = normalizeBillingIdentifier(scope.email);
  const actorLinkedNo = normalizeBillingIdentifier(scope.linkedConsumerNo);
  const ownedSet = new Set(
    (scope.ownedConsumerNos || []).map((id) => normalizeBillingIdentifier(id)).filter(Boolean)
  );

  if (actorAccId && connAccId && actorAccId === connAccId) return true;
  if (actorEmail && connEmail && actorEmail === connEmail) return true;
  if (actorLinkedNo && (connNo === actorLinkedNo || connId === actorLinkedNo)) return true;
  if (ownedSet.has(connNo) || (connId && ownedSet.has(connId))) return true;

  return false;
}

/**
 * Resolves all connections owned by the active consumer in a deterministic order.
 * Primary seed connections (e.g. '04281-99231', '04281-77190' or linkedConsumerNo)
 * are ordered first so newly created connections do not unexpectedly hijack the default selection,
 * while preserving every connection in localStorage.
 */
export function resolveOwnedConnectionsForConsumer(
  allConnections: ElectricityConnection[],
  scope: ConsumerBillingActorScope
): ElectricityConnection[] {
  if (!Array.isArray(allConnections) || allConnections.length === 0) return [];

  const matched = allConnections.filter((conn) => isConnectionOwnedByConsumerScope(conn, scope));

  // Deduplicate by normalized consumerNo while preserving all fields
  const seen = new Set<string>();
  const unique: ElectricityConnection[] = [];
  for (const conn of matched) {
    const key = normalizeBillingIdentifier(conn.consumerNo) || normalizeBillingIdentifier(conn.connectionId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(conn);
  }

  const primaryLinked = normalizeBillingIdentifier(scope.linkedConsumerNo);
  const canonicalSeedOrder = ['04281-99231', '04281-77190'];

  return [...unique].sort((a, b) => {
    const aNo = normalizeBillingIdentifier(a.consumerNo);
    const bNo = normalizeBillingIdentifier(b.consumerNo);

    if (primaryLinked) {
      if (aNo === primaryLinked && bNo !== primaryLinked) return -1;
      if (bNo === primaryLinked && aNo !== primaryLinked) return 1;
    }

    const aSeedIdx = canonicalSeedOrder.indexOf(aNo);
    const bSeedIdx = canonicalSeedOrder.indexOf(bNo);
    if (aSeedIdx !== -1 && bSeedIdx !== -1) return aSeedIdx - bSeedIdx;
    if (aSeedIdx !== -1) return -1;
    if (bSeedIdx !== -1) return 1;

    return 0;
  });
}

/**
 * Matches a bill record to a connection, supporting canonical consumerNo, connectionId,
 * and any non-destructive legacy/linked identifiers for that connection.
 */
export function matchesBillToConnection(
  bill: ElectricityBill | null | undefined,
  connection: ElectricityConnection | null | undefined,
  legacyAliasesForConnection?: string[]
): boolean {
  if (!bill || !connection) return false;

  const billConsumerNo = normalizeBillingIdentifier(bill.consumerNo);
  const billConnId = normalizeBillingIdentifier(bill.connectionId);

  const validConnectionIds = new Set<string>();
  const connNo = normalizeBillingIdentifier(connection.consumerNo);
  const connId = normalizeBillingIdentifier(connection.connectionId);
  if (connNo) validConnectionIds.add(connNo);
  if (connId) validConnectionIds.add(connId);

  if (Array.isArray(legacyAliasesForConnection)) {
    for (const alias of legacyAliasesForConnection) {
      const norm = normalizeBillingIdentifier(alias);
      if (norm) validConnectionIds.add(norm);
    }
  }

  if (billConsumerNo && validConnectionIds.has(billConsumerNo)) return true;
  if (billConnId && validConnectionIds.has(billConnId)) return true;

  return false;
}

/**
 * Matches a payment record to a connection, supporting canonical consumerNo, connectionId,
 * or matching any billNo belonging to that connection.
 */
export function matchesPaymentToConnection(
  payment: PaymentTransaction | null | undefined,
  connection: ElectricityConnection | null | undefined,
  connectionBillNos?: Set<string>,
  legacyAliasesForConnection?: string[]
): boolean {
  if (!payment || !connection) return false;

  const payBillNo = normalizeBillingIdentifier(payment.billNo);
  if (payBillNo && connectionBillNos && connectionBillNos.has(payBillNo)) {
    return true;
  }

  const payConsumerNo = normalizeBillingIdentifier(payment.consumerNo);
  const connNo = normalizeBillingIdentifier(connection.consumerNo);
  const connId = normalizeBillingIdentifier(connection.connectionId);

  if (payConsumerNo && (payConsumerNo === connNo || payConsumerNo === connId)) {
    return true;
  }

  if (Array.isArray(legacyAliasesForConnection)) {
    for (const alias of legacyAliasesForConnection) {
      if (payConsumerNo && payConsumerNo === normalizeBillingIdentifier(alias)) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// PAYMENT-TO-BILL RECONCILIATION ENGINE
// ============================================================================

/**
 * Reconciles a single ElectricityBill against PaymentTransaction records and reference date.
 * Enforces mandatory billing invariants:
 * - Remaining balance is max(0, totalAmount - appliedSuccessfulPayments), never negative.
 * - A bill with 0 remaining balance is ALWAYS 'Paid' and NEVER due.
 * - A bill with 0 < paidAmount < totalAmount is 'Partially Paid' and IS due (for remainingBalance).
 * - Unpaid bills past their dueDate are marked 'Overdue'.
 * - Failed or Pending Verification payments never reduce outstandingBalance.
 */
export interface ReconcileBillOptions {
  policy?: LateChargePolicy;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  lateChargesSettled?: number;
  tariffCategory?: TariffCategory;
  language?: Language;
}

export function reconcileBillWithPayments(
  bill: ElectricityBill,
  allPayments: PaymentTransaction[] = [],
  referenceDate: string = '15-Oct-2026',
  options?: ReconcileBillOptions
): ReconciledElectricityBill {
  const normBillNo = normalizeBillingIdentifier(bill.billNo);
  const totalAmount = Math.max(0, Number(bill.totalAmount ?? 0));

  const matchingPayments = (allPayments || []).filter(
    (p) => p && normalizeBillingIdentifier(p.billNo) === normBillNo
  );

  const reversedTxIds = new Set<string>(
    (options?.reversals || [])
      .filter((r) => !r.billNo || normalizeBillingIdentifier(r.billNo) === normBillNo)
      .map((r) => normalizeBillingIdentifier(r.txId))
      .filter(Boolean)
  );
  const reversedTotalForBill = (options?.reversals || [])
    .filter((r) => !r.billNo || normalizeBillingIdentifier(r.billNo) === normBillNo)
    .reduce((acc, r) => acc + Math.max(0, Number(r.amount ?? 0)), 0);

  // Deduplicate successful non-reversed payments by txId / bankReference
  const appliedPayments: PaymentTransaction[] = [];
  const unappliedPaymentAttempts: PaymentTransaction[] = [];
  const seenTxKeys = new Set<string>();

  for (const p of matchingPayments) {
    const normTxId = normalizeBillingIdentifier(p.txId);
    const txKey =
      normTxId ||
      `${normalizeBillingIdentifier(p.billNo)}:${p.amount}:${p.date}`;
    const isReversed = Boolean(normTxId && reversedTxIds.has(normTxId));
    if (p.status === 'Successful' && !isReversed) {
      if (!seenTxKeys.has(txKey)) {
        seenTxKeys.add(txKey);
        appliedPayments.push(p);
      }
    } else {
      unappliedPaymentAttempts.push(p);
    }
  }

  const sumFromTransactions = appliedPayments.reduce(
    (acc, p) => acc + Math.max(0, Number(p.amount ?? 0)),
    0
  );

  let paidAmount = 0;
  let hasConflict = false;
  let conflictReason: string | undefined;

  const explicitBillPaidAmount =
    typeof bill.paidAmount === 'number' && !Number.isNaN(bill.paidAmount)
      ? Math.max(0, bill.paidAmount)
      : undefined;

  if (appliedPayments.length > 0) {
    // If successful payment transactions exist, reconcile from them
    paidAmount = Math.min(totalAmount, Number(sumFromTransactions.toFixed(2)));
    if (bill.status === 'Paid' && paidAmount < totalAmount) {
      hasConflict = true;
      conflictReason = `Bill ${bill.billNo} was marked Paid in storage, but verified successful payment transactions total ₹${paidAmount} against bill total ₹${totalAmount}.`;
    }
  } else if (reversedTxIds.size > 0) {
    // All matching payments were reversed (or explicit paidAmount reduced by reversal)
    const fallbackAfterReversal =
      explicitBillPaidAmount !== undefined
        ? Math.max(0, Number((explicitBillPaidAmount - reversedTotalForBill).toFixed(2)))
        : 0;
    paidAmount = Math.min(totalAmount, fallbackAfterReversal);
  } else if (explicitBillPaidAmount !== undefined) {
    paidAmount = Math.min(totalAmount, Number(explicitBillPaidAmount.toFixed(2)));
    if (bill.status === 'Paid' && paidAmount < totalAmount) {
      hasConflict = true;
      conflictReason = `Bill ${bill.billNo} has status Paid but explicit paidAmount (₹${paidAmount}) is less than totalAmount (₹${totalAmount}).`;
    }
  } else if (bill.status === 'Paid') {
    // Check if there are only failed/pending payment attempts and no transactionRef
    if (unappliedPaymentAttempts.length > 0 && !bill.transactionRef && !bill.paidDate) {
      hasConflict = true;
      conflictReason = `Bill ${bill.billNo} had status Paid without a transaction reference while only non-successful payment attempts exist.`;
      paidAmount = 0;
    } else {
      paidAmount = totalAmount;
    }
  } else {
    paidAmount = 0;
  }

  const outstandingBalance = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));
  const isPaid = totalAmount === 0 || outstandingBalance === 0;
  const isPartiallyPaid = !isPaid && paidAmount > 0 && outstandingBalance > 0;
  const pastDue = isBillPastDueDate(bill.dueDate, referenceDate);
  const isOverdue = !isPaid && (bill.status === 'Overdue' || pastDue);
  const isDue = !isPaid && outstandingBalance > 0;

  let effectiveStatus: CanonicalBillStatus;
  if (isPaid) {
    effectiveStatus = 'Paid';
  } else if (isPartiallyPaid) {
    effectiveStatus = 'Partially Paid';
  } else if (isOverdue) {
    effectiveStatus = 'Overdue';
  } else {
    effectiveStatus = 'Unpaid';
  }

  const latestAppliedPayment = appliedPayments[0];
  const resolvedPaidDate = isPaid
    ? bill.paidDate || latestAppliedPayment?.date
    : bill.paidDate || latestAppliedPayment?.date;
  const resolvedTxRef = bill.transactionRef || latestAppliedPayment?.txId;
  const cycleMeta = resolveBillCycleMetadata(bill);
  const lateChargeBreakdown = calculateLatePaymentCharges({
    bill,
    payments: appliedPayments,
    referenceDate,
    policy: options?.policy,
    waivers: options?.waivers,
    reversals: options?.reversals,
    lateChargesSettled: options?.lateChargesSettled,
    tariffCategory: options?.tariffCategory,
  });

  const totalAccruedLateCharges = lateChargeBreakdown.netLateChargesPayable;
  const totalOutstandingWithCharges = isPaid
    ? 0
    : Math.max(outstandingBalance, lateChargeBreakdown.totalOutstandingPayable);

  return {
    ...bill,
    rawStatus: bill.status,
    status: effectiveStatus,
    effectiveStatus,
    derivedStatus: effectiveStatus,
    paidAmount,
    outstandingBalance,
    remainingBalance: outstandingBalance,
    totalAccruedLateCharges,
    totalOutstandingWithCharges,
    isDue,
    isOverdue,
    isPartiallyPaid,
    isPaid,
    paidDate: resolvedPaidDate,
    transactionRef: resolvedTxRef,
    appliedPayments,
    unappliedPaymentAttempts,
    hasConflict,
    conflictReason,
    billingCycleType: cycleMeta.billingCycleType,
    periodStartDate: cycleMeta.periodStartDate,
    periodEndDate: cycleMeta.periodEndDate,
    billingPeriodLabel: cycleMeta.billingPeriodLabel,
    lateChargeBreakdown,
  };
}

// ============================================================================
// PHASE 9 STEP 1: BI-MONTHLY BILLING PERIOD, READING & TARIFF ENGINE
// ============================================================================

export function getLastDayOfMonthUtc(year: number, monthIdx0: number): number {
  return new Date(Date.UTC(year, monthIdx0 + 1, 0)).getUTCDate();
}

export function formatVidyutDayMonthYear(year: number, monthIdx0: number, day: number): string {
  const safeMonthIdx = ((monthIdx0 % 12) + 12) % 12;
  const monthShort = SHORT_MONTH_NAMES_EN[safeMonthIdx];
  return `${String(day).padStart(2, '0')}-${monthShort}-${year}`;
}

export interface BillingPeriodDescriptor {
  billingCycleType: BillingCycleType;
  billMonth: string; // e.g. 'September 2026' or 'September–October 2026' or 'December 2026–January 2027'
  shortCycleLabel: string; // e.g. 'Sep 2026' or 'Sep–Oct 2026' or 'Dec 2026–Jan 2027'
  periodStartDate: string; // e.g. '01-Sep-2026'
  periodEndDate: string; // e.g. '31-Oct-2026'
  billingPeriodLabel: string; // e.g. '01-Sep-2026 to 31-Oct-2026'
  billDate: string; // e.g. '05-Nov-2026'
  dueDate: string; // e.g. '20-Nov-2026'
  startYear: number;
  startMonth1To12: number;
  endYear: number;
  endMonth1To12: number;
  startUtcMs: number;
  endUtcMs: number;
  standardCycleDaysCount: number;
  billedDaysCount: number;
  isPartialPeriod: boolean;
}

export interface BuildBillingPeriodOptions {
  billIssueDay?: number;
  dueDaysAfterIssue?: number;
  connectedDate?: string;
}

/**
 * Builds a deterministic single-month ('MONTHLY') billing period descriptor.
 */
export function buildMonthlyBillingPeriod(
  year: number,
  month1To12: number,
  options?: BuildBillingPeriodOptions
): BillingPeriodDescriptor {
  const safeMonthIdx = Math.min(11, Math.max(0, Math.round(month1To12) - 1));
  const lastDay = getLastDayOfMonthUtc(year, safeMonthIdx);
  const baseStartDate = formatVidyutDayMonthYear(year, safeMonthIdx, 1);
  const periodEndDate = formatVidyutDayMonthYear(year, safeMonthIdx, lastDay);

  const baseStartMs = Date.UTC(year, safeMonthIdx, 1);
  const endUtcMs = Date.UTC(year, safeMonthIdx, lastDay);
  const standardCycleDaysCount = lastDay;

  let periodStartDate = baseStartDate;
  let startUtcMs = baseStartMs;
  let billedDaysCount = standardCycleDaysCount;
  let isPartialPeriod = false;

  if (options?.connectedDate) {
    const connMs = parseVidyutDateToUtcMs(options.connectedDate);
    if (connMs !== null && connMs > baseStartMs && connMs <= endUtcMs) {
      const connDateObj = new Date(connMs);
      periodStartDate = formatVidyutDayMonthYear(
        connDateObj.getUTCFullYear(),
        connDateObj.getUTCMonth(),
        connDateObj.getUTCDate()
      );
      startUtcMs = connMs;
      billedDaysCount = Math.max(1, Math.round((endUtcMs - connMs) / (24 * 60 * 60 * 1000)) + 1);
      isPartialPeriod = billedDaysCount < standardCycleDaysCount;
    }
  }

  const issueMonthIdx = (safeMonthIdx + 1) % 12;
  const issueYear = safeMonthIdx === 11 ? year + 1 : year;
  const issueDay = Math.min(25, Math.max(1, options?.billIssueDay ?? 4));
  const dueOffset = Math.max(5, options?.dueDaysAfterIssue ?? 18);

  const billDateUtc = new Date(Date.UTC(issueYear, issueMonthIdx, issueDay));
  const dueDateUtc = new Date(Date.UTC(issueYear, issueMonthIdx, issueDay + dueOffset));

  const billDate = formatVidyutDayMonthYear(
    billDateUtc.getUTCFullYear(),
    billDateUtc.getUTCMonth(),
    billDateUtc.getUTCDate()
  );
  const dueDate = formatVidyutDayMonthYear(
    dueDateUtc.getUTCFullYear(),
    dueDateUtc.getUTCMonth(),
    dueDateUtc.getUTCDate()
  );

  const billMonth = `${FULL_MONTH_NAMES_EN[safeMonthIdx]} ${year}`;
  const shortCycleLabel = `${SHORT_MONTH_NAMES_EN[safeMonthIdx]} ${year}`;
  const billingPeriodLabel = `${periodStartDate} to ${periodEndDate}`;

  return {
    billingCycleType: 'MONTHLY',
    billMonth,
    shortCycleLabel,
    periodStartDate,
    periodEndDate,
    billingPeriodLabel,
    billDate,
    dueDate,
    startYear: year,
    startMonth1To12: safeMonthIdx + 1,
    endYear: year,
    endMonth1To12: safeMonthIdx + 1,
    startUtcMs,
    endUtcMs,
    standardCycleDaysCount,
    billedDaysCount,
    isPartialPeriod,
  };
}

/**
 * Builds a deterministic two-month ('BI_MONTHLY') billing period descriptor.
 * Supports same-year cycles (e.g. Sep–Oct 2026, Nov–Dec 2026) and cross-year cycles
 * (e.g. Dec 2026–Jan 2027, Jan–Feb 2027), plus partial-period pro-rata when newly energized.
 */
export function buildBiMonthlyBillingPeriod(
  startYear: number,
  startMonth1To12: number,
  options?: BuildBillingPeriodOptions
): BillingPeriodDescriptor {
  const startMonthIdx = Math.min(11, Math.max(0, Math.round(startMonth1To12) - 1));
  const endMonthIdx = (startMonthIdx + 1) % 12;
  const endYear = startMonthIdx === 11 ? startYear + 1 : startYear;

  const daysInMonth1 = getLastDayOfMonthUtc(startYear, startMonthIdx);
  const daysInMonth2 = getLastDayOfMonthUtc(endYear, endMonthIdx);
  const standardCycleDaysCount = daysInMonth1 + daysInMonth2;

  const baseStartDate = formatVidyutDayMonthYear(startYear, startMonthIdx, 1);
  const periodEndDate = formatVidyutDayMonthYear(endYear, endMonthIdx, daysInMonth2);

  const baseStartMs = Date.UTC(startYear, startMonthIdx, 1);
  const endUtcMs = Date.UTC(endYear, endMonthIdx, daysInMonth2);

  let periodStartDate = baseStartDate;
  let startUtcMs = baseStartMs;
  let billedDaysCount = standardCycleDaysCount;
  let isPartialPeriod = false;

  if (options?.connectedDate) {
    const connMs = parseVidyutDateToUtcMs(options.connectedDate);
    if (connMs !== null && connMs > baseStartMs && connMs <= endUtcMs) {
      const connDateObj = new Date(connMs);
      periodStartDate = formatVidyutDayMonthYear(
        connDateObj.getUTCFullYear(),
        connDateObj.getUTCMonth(),
        connDateObj.getUTCDate()
      );
      startUtcMs = connMs;
      billedDaysCount = Math.max(1, Math.round((endUtcMs - connMs) / (24 * 60 * 60 * 1000)) + 1);
      isPartialPeriod = billedDaysCount < standardCycleDaysCount;
    }
  }

  const issueMonthIdx = (endMonthIdx + 1) % 12;
  const issueYear = endMonthIdx === 11 ? endYear + 1 : endYear;
  const issueDay = Math.min(25, Math.max(1, options?.billIssueDay ?? 5));
  const dueOffset = Math.max(5, options?.dueDaysAfterIssue ?? 15);

  const billDateUtc = new Date(Date.UTC(issueYear, issueMonthIdx, issueDay));
  const dueDateUtc = new Date(Date.UTC(issueYear, issueMonthIdx, issueDay + dueOffset));

  const billDate = formatVidyutDayMonthYear(
    billDateUtc.getUTCFullYear(),
    billDateUtc.getUTCMonth(),
    billDateUtc.getUTCDate()
  );
  const dueDate = formatVidyutDayMonthYear(
    dueDateUtc.getUTCFullYear(),
    dueDateUtc.getUTCMonth(),
    dueDateUtc.getUTCDate()
  );

  const startMonthFull = FULL_MONTH_NAMES_EN[startMonthIdx];
  const endMonthFull = FULL_MONTH_NAMES_EN[endMonthIdx];
  const startMonthShort = SHORT_MONTH_NAMES_EN[startMonthIdx];
  const endMonthShort = SHORT_MONTH_NAMES_EN[endMonthIdx];

  const billMonth =
    startYear === endYear
      ? `${startMonthFull}–${endMonthFull} ${endYear}`
      : `${startMonthFull} ${startYear}–${endMonthFull} ${endYear}`;

  const shortCycleLabel =
    startYear === endYear
      ? `${startMonthShort}–${endMonthShort} ${endYear}`
      : `${startMonthShort} ${startYear}–${endMonthShort} ${endYear}`;

  const billingPeriodLabel = `${periodStartDate} to ${periodEndDate}`;

  return {
    billingCycleType: 'BI_MONTHLY',
    billMonth,
    shortCycleLabel,
    periodStartDate,
    periodEndDate,
    billingPeriodLabel,
    billDate,
    dueDate,
    startYear,
    startMonth1To12: startMonthIdx + 1,
    endYear,
    endMonth1To12: endMonthIdx + 1,
    startUtcMs,
    endUtcMs,
    standardCycleDaysCount,
    billedDaysCount,
    isPartialPeriod,
  };
}

/**
 * Parses a `billMonth` string ('September 2026', 'September–October 2026', 'December 2026–January 2027')
 * into a BillingPeriodDescriptor when explicit periodStartDate / periodEndDate are not stored.
 */
export function parseBillMonthToPeriodDescriptor(
  billMonthStr: string | null | undefined,
  explicitCycleType?: BillingCycleType
): BillingPeriodDescriptor | null {
  if (!billMonthStr || typeof billMonthStr !== 'string') return null;
  const trimmed = billMonthStr.trim();

  // Case 1: Cross-year bi-monthly ('December 2026–January 2027')
  const crossMatch = trimmed.match(
    /^([A-Za-z]{3,9})\s+(\d{4})\s*[–-]\s*([A-Za-z]{3,9})\s+(\d{4})$/
  );
  if (crossMatch) {
    const startMonthIdx = MONTH_MAP[crossMatch[1].toUpperCase()];
    const startYear = parseInt(crossMatch[2], 10);
    if (startMonthIdx !== undefined && !Number.isNaN(startYear)) {
      return buildBiMonthlyBillingPeriod(startYear, startMonthIdx + 1);
    }
  }

  // Case 2: Same-year bi-monthly ('September–October 2026' or 'Sep-Oct 2026')
  const sameYearMatch = trimmed.match(/^([A-Za-z]{3,9})\s*[–-]\s*([A-Za-z]{3,9})\s+(\d{4})$/);
  if (sameYearMatch) {
    const startMonthIdx = MONTH_MAP[sameYearMatch[1].toUpperCase()];
    const endMonthIdx = MONTH_MAP[sameYearMatch[2].toUpperCase()];
    const endYear = parseInt(sameYearMatch[3], 10);
    if (startMonthIdx !== undefined && endMonthIdx !== undefined && !Number.isNaN(endYear)) {
      const startYear = startMonthIdx === 11 && endMonthIdx === 0 ? endYear - 1 : endYear;
      return buildBiMonthlyBillingPeriod(startYear, startMonthIdx + 1);
    }
  }

  // Case 3: Single-month label ('September 2026')
  const singleMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (singleMatch) {
    const monthIdx = MONTH_MAP[singleMatch[1].toUpperCase()];
    const year = parseInt(singleMatch[2], 10);
    if (monthIdx !== undefined && !Number.isNaN(year)) {
      if (explicitCycleType === 'BI_MONTHLY') {
        const startMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
        const startYear = monthIdx === 0 ? year - 1 : year;
        return buildBiMonthlyBillingPeriod(startYear, startMonthIdx + 1);
      }
      return buildMonthlyBillingPeriod(year, monthIdx + 1);
    }
  }

  return null;
}

export interface ResolvedBillCycleMetadata {
  billingCycleType: BillingCycleType;
  periodStartDate: string;
  periodEndDate: string;
  billingPeriodLabel: string;
  startUtcMs: number;
  endUtcMs: number;
  previousReadingKwh: number;
  currentReadingKwh: number;
  readingProvenance: MeterReadingProvenance;
  meterMultiplier: number;
  tariffConfigVersion: string;
  tariffCyclePolicyMode: TariffCyclePolicyMode;
  isPartialPeriod: boolean;
  billedDaysCount: number;
  standardCycleDaysCount: number;
}

/**
 * Non-destructively resolves full cycle metadata for any ElectricityBill
 * (including legacy monthly bills in INITIAL_BILLS or localStorage).
 */
export function resolveBillCycleMetadata(
  bill: ElectricityBill,
  connection?: ElectricityConnection | null
): ResolvedBillCycleMetadata {
  const parsedFromLabel = parseBillMonthToPeriodDescriptor(
    bill.billMonth,
    bill.billingCycleType
  );

  const isBiMonthlyLabel = /[–-]/.test((bill.billMonth || '').trim());
  const billingCycleType: BillingCycleType =
    bill.billingCycleType === 'BI_MONTHLY' || isBiMonthlyLabel ? 'BI_MONTHLY' : 'MONTHLY';

  const periodStartDate =
    bill.periodStartDate ||
    parsedFromLabel?.periodStartDate ||
    (billingCycleType === 'BI_MONTHLY' ? '01-Sep-2026' : '01-Sep-2026');
  const periodEndDate =
    bill.periodEndDate ||
    parsedFromLabel?.periodEndDate ||
    (billingCycleType === 'BI_MONTHLY' ? '31-Oct-2026' : '30-Sep-2026');

  const startUtcMs =
    parseVidyutDateToUtcMs(periodStartDate) ??
    parsedFromLabel?.startUtcMs ??
    Date.UTC(2026, 8, 1);
  const endUtcMs =
    parseVidyutDateToUtcMs(periodEndDate) ??
    parsedFromLabel?.endUtcMs ??
    Date.UTC(2026, 8, 30);

  const billingPeriodLabel =
    bill.billingPeriodLabel || `${periodStartDate} to ${periodEndDate}`;

  const units = Math.max(0, Math.round(Number(bill.unitsConsumed || 0)));
  const connCurrent =
    connection && typeof connection.currentReadingKwh === 'number'
      ? connection.currentReadingKwh
      : undefined;
  const connPrev =
    connection && typeof connection.previousReadingKwh === 'number'
      ? connection.previousReadingKwh
      : undefined;

  const previousReadingKwh =
    typeof bill.previousReadingKwh === 'number' && !Number.isNaN(bill.previousReadingKwh)
      ? bill.previousReadingKwh
      : connPrev !== undefined && connCurrent !== undefined && connCurrent - connPrev === units
      ? connPrev
      : connCurrent !== undefined && connCurrent >= units
      ? connCurrent - units
      : 1000;

  const currentReadingKwh =
    typeof bill.currentReadingKwh === 'number' && !Number.isNaN(bill.currentReadingKwh)
      ? bill.currentReadingKwh
      : previousReadingKwh + units;

  const readingProvenance: MeterReadingProvenance =
    bill.readingProvenance ||
    (bill.isSimulatedDemoBill ? 'SIMULATED_DEMO' : 'RECORDED');

  const meterMultiplier =
    typeof bill.meterMultiplier === 'number' && bill.meterMultiplier > 0
      ? bill.meterMultiplier
      : 1;

  const tariffConfigVersion =
    bill.tariffConfigVersion ||
    (billingCycleType === 'BI_MONTHLY'
      ? 'UGVCL-DEMO-TARIFF-2026-V2-BIMONTHLY-CONFIGURABLE'
      : 'UGVCL-DEMO-TARIFF-2026-V1-MONTHLY');

  const tariffCyclePolicyMode: TariffCyclePolicyMode =
    bill.tariffCyclePolicyMode ||
    (billingCycleType === 'BI_MONTHLY'
      ? 'BI_MONTHLY_PROPORTIONAL_2X_DEMO'
      : 'MONTHLY_STANDARD');

  const standardCycleDaysCount =
    bill.standardCycleDaysCount ||
    parsedFromLabel?.standardCycleDaysCount ||
    (billingCycleType === 'BI_MONTHLY' ? 61 : 30);
  const billedDaysCount =
    bill.billedDaysCount ||
    Math.max(1, Math.round((endUtcMs - startUtcMs) / (24 * 60 * 60 * 1000)) + 1);
  const isPartialPeriod = Boolean(
    bill.isPartialPeriod ?? billedDaysCount < standardCycleDaysCount
  );

  return {
    billingCycleType,
    periodStartDate,
    periodEndDate,
    billingPeriodLabel,
    startUtcMs,
    endUtcMs,
    previousReadingKwh,
    currentReadingKwh,
    readingProvenance,
    meterMultiplier,
    tariffConfigVersion,
    tariffCyclePolicyMode,
    isPartialPeriod,
    billedDaysCount,
    standardCycleDaysCount,
  };
}

export interface BillingPeriodConflictCheckResult {
  hasConflict: boolean;
  conflictType: 'NONE' | 'DUPLICATE_PERIOD' | 'OVERLAPPING_PERIOD';
  conflictingBill: ElectricityBill | null;
  reason: string;
}

/**
 * Checks whether a candidate billing period for a connection duplicates or overlaps
 * any existing bill (monthly or bi-monthly) already stored for that connection.
 */
export function checkBillingPeriodConflict(
  connection: ElectricityConnection | null | undefined,
  candidate: {
    billMonth: string;
    periodStartDate?: string;
    periodEndDate?: string;
    billingCycleType?: BillingCycleType;
  },
  existingBills: ElectricityBill[] = []
): BillingPeriodConflictCheckResult {
  if (!connection) {
    return {
      hasConflict: false,
      conflictType: 'NONE',
      conflictingBill: null,
      reason: 'No connection provided.',
    };
  }

  const candidateLabelNorm = (candidate.billMonth || '').trim().toUpperCase();
  const parsedCandidate = parseBillMonthToPeriodDescriptor(
    candidate.billMonth,
    candidate.billingCycleType
  );
  const candStartStr = candidate.periodStartDate || parsedCandidate?.periodStartDate;
  const candEndStr = candidate.periodEndDate || parsedCandidate?.periodEndDate;
  const candStartMs = parseVidyutDateToUtcMs(candStartStr) ?? parsedCandidate?.startUtcMs ?? null;
  const candEndMs = parseVidyutDateToUtcMs(candEndStr) ?? parsedCandidate?.endUtcMs ?? null;

  for (const existing of existingBills) {
    if (!matchesBillToConnection(existing, connection)) continue;

    const existingLabelNorm = (existing.billMonth || '').trim().toUpperCase();
    const existingMeta = resolveBillCycleMetadata(existing, connection);

    if (
      existingLabelNorm === candidateLabelNorm ||
      (candStartStr &&
        candEndStr &&
        existingMeta.periodStartDate === candStartStr &&
        existingMeta.periodEndDate === candEndStr)
    ) {
      return {
        hasConflict: true,
        conflictType: 'DUPLICATE_PERIOD',
        conflictingBill: existing,
        reason: `Bill ${existing.billNo} already exists for connection ${connection.consumerNo} and billing period ${existing.billMonth} (${existingMeta.periodStartDate} to ${existingMeta.periodEndDate}).`,
      };
    }

    if (
      candStartMs !== null &&
      candEndMs !== null &&
      candStartMs <= existingMeta.endUtcMs &&
      candEndMs >= existingMeta.startUtcMs
    ) {
      return {
        hasConflict: true,
        conflictType: 'OVERLAPPING_PERIOD',
        conflictingBill: existing,
        reason: `Candidate period ${candidate.billMonth} (${candStartStr} to ${candEndStr}) overlaps existing ${existingMeta.billingCycleType} bill ${existing.billNo} (${existing.billMonth}: ${existingMeta.periodStartDate} to ${existingMeta.periodEndDate}) for connection ${connection.consumerNo}.`,
      };
    }
  }

  return {
    hasConflict: false,
    conflictType: 'NONE',
    conflictingBill: null,
    reason: 'No duplicate or overlapping billing period found.',
  };
}

/**
 * Resolves the next non-overlapping two-month ('BI_MONTHLY') billing period for a connection.
 * If the preferred cycle (defaulting to Sep–Oct 2026) overlaps an existing historical monthly bill
 * (e.g. 'September 2026' or 'October 2026'), it advances to the next clean 2-month window
 * immediately following the latest billed period End Date (e.g. Oct–Nov 2026 or Nov–Dec 2026).
 */
export function resolveNextNonOverlappingBiMonthlyPeriod(
  connection: ElectricityConnection,
  existingBills: ElectricityBill[] = [],
  preferredStartYear: number = 2026,
  preferredStartMonth1To12: number = 9
): BillingPeriodDescriptor {
  const preferred = buildBiMonthlyBillingPeriod(
    preferredStartYear,
    preferredStartMonth1To12,
    { connectedDate: connection.connectedDate }
  );

  const initialConflict = checkBillingPeriodConflict(connection, preferred, existingBills);
  if (!initialConflict.hasConflict) {
    return preferred;
  }

  // Find the latest periodEndDate among existing bills for this connection
  const connectionBills = existingBills.filter((b) => matchesBillToConnection(b, connection));
  let maxEndMs = -1;
  let latestEndYear = preferredStartYear;
  let latestEndMonth1To12 = preferredStartMonth1To12;

  for (const b of connectionBills) {
    const meta = resolveBillCycleMetadata(b, connection);
    if (meta.endUtcMs > maxEndMs) {
      maxEndMs = meta.endUtcMs;
      const d = new Date(meta.endUtcMs);
      latestEndYear = d.getUTCFullYear();
      latestEndMonth1To12 = d.getUTCMonth() + 1;
    }
  }

  const nextStartMonth1To12 = latestEndMonth1To12 === 12 ? 1 : latestEndMonth1To12 + 1;
  const nextStartYear = latestEndMonth1To12 === 12 ? latestEndYear + 1 : latestEndYear;

  return buildBiMonthlyBillingPeriod(nextStartYear, nextStartMonth1To12, {
    connectedDate: connection.connectedDate,
  });
}

// ============================================================================
// METER READING & CONSUMPTION VALIDATION ENGINE (PART 4)
// ============================================================================

export interface MeterResetOrReplacementRecord {
  oldMeterNo?: string;
  newMeterNo?: string;
  oldMeterPreviousReadingKwh: number;
  oldMeterFinalReadingKwh: number;
  newMeterInitialReadingKwh: number;
  newMeterCurrentReadingKwh: number;
  replacementDate?: string;
  reason?: string;
}

export interface ComputeValidatedMeterConsumptionInput {
  previousReadingKwh?: number | null;
  currentReadingKwh?: number | null;
  meterMultiplier?: number;
  meterReplacementAdjustmentKwh?: number;
  meterResetOrReplacement?: MeterResetOrReplacementRecord | null;
  readingProvenance?: MeterReadingProvenance;
  allowEstimatedFallback?: boolean;
  estimatedUnitsKwh?: number;
}

export interface ComputeValidatedMeterConsumptionResult {
  valid: boolean;
  errorCode?:
    | 'MISSING_METER_READING'
    | 'NEGATIVE_READING_VALUE'
    | 'NEGATIVE_CONSUMPTION_INVALID'
    | 'INVALID_METER_REPLACEMENT_RECORD';
  errorMessage?: string;
  unitsConsumed: number;
  previousReadingKwh: number;
  currentReadingKwh: number;
  meterMultiplier: number;
  meterReplacementAdjustmentKwh: number;
  readingProvenance: MeterReadingProvenance;
  isZeroConsumption: boolean;
  calculationNotes: string;
}

/**
 * Validates previous and current kWh readings and computes net billed consumption.
 * - Rejects missing readings unless `allowEstimatedFallback` is explicitly enabled.
 * - Rejects negative consumption (`currentReadingKwh < previousReadingKwh`) unless a valid
 *   `meterResetOrReplacement` record is supplied.
 * - Supports zero consumption (`currentReadingKwh === previousReadingKwh` -> 0 kWh).
 */
export function computeValidatedMeterConsumption(
  input: ComputeValidatedMeterConsumptionInput
): ComputeValidatedMeterConsumptionResult {
  const multiplier =
    typeof input.meterMultiplier === 'number' && input.meterMultiplier > 0
      ? input.meterMultiplier
      : 1;
  const extraAdjustment =
    typeof input.meterReplacementAdjustmentKwh === 'number' &&
    !Number.isNaN(input.meterReplacementAdjustmentKwh)
      ? Math.round(input.meterReplacementAdjustmentKwh)
      : 0;

  // Case 1: Explicit meter replacement / reset rollover record
  if (input.meterResetOrReplacement) {
    const rep = input.meterResetOrReplacement;
    if (
      rep.oldMeterPreviousReadingKwh < 0 ||
      rep.oldMeterFinalReadingKwh < rep.oldMeterPreviousReadingKwh ||
      rep.newMeterInitialReadingKwh < 0 ||
      rep.newMeterCurrentReadingKwh < rep.newMeterInitialReadingKwh
    ) {
      return {
        valid: false,
        errorCode: 'INVALID_METER_REPLACEMENT_RECORD',
        errorMessage:
          'Meter replacement/reset readings are invalid: final reading on old meter and current reading on new meter must not be less than their respective start readings.',
        unitsConsumed: 0,
        previousReadingKwh: rep.oldMeterPreviousReadingKwh || 0,
        currentReadingKwh: rep.newMeterCurrentReadingKwh || 0,
        meterMultiplier: multiplier,
        meterReplacementAdjustmentKwh: 0,
        readingProvenance: 'METER_RESET_OR_REPLACED',
        isZeroConsumption: false,
        calculationNotes: 'Rejected invalid meter replacement record.',
      };
    }

    const oldMeterUnits = Math.round(
      (rep.oldMeterFinalReadingKwh - rep.oldMeterPreviousReadingKwh) * multiplier
    );
    const newMeterUnits = Math.round(
      (rep.newMeterCurrentReadingKwh - rep.newMeterInitialReadingKwh) * multiplier
    );
    const totalUnits = Math.max(0, oldMeterUnits + newMeterUnits + extraAdjustment);

    return {
      valid: true,
      unitsConsumed: totalUnits,
      previousReadingKwh: rep.oldMeterPreviousReadingKwh,
      currentReadingKwh: rep.newMeterCurrentReadingKwh,
      meterMultiplier: multiplier,
      meterReplacementAdjustmentKwh: oldMeterUnits + extraAdjustment,
      readingProvenance: 'METER_RESET_OR_REPLACED',
      isZeroConsumption: totalUnits === 0,
      calculationNotes: `Meter replacement/reset applied: Old meter (${rep.oldMeterPreviousReadingKwh} -> ${rep.oldMeterFinalReadingKwh} = ${oldMeterUnits} kWh) + New meter (${rep.newMeterInitialReadingKwh} -> ${rep.newMeterCurrentReadingKwh} = ${newMeterUnits} kWh) = ${totalUnits} kWh.`,
    };
  }

  const hasPrev =
    typeof input.previousReadingKwh === 'number' && !Number.isNaN(input.previousReadingKwh);
  const hasCurr =
    typeof input.currentReadingKwh === 'number' && !Number.isNaN(input.currentReadingKwh);

  if (!hasPrev || !hasCurr) {
    if (input.allowEstimatedFallback && typeof input.estimatedUnitsKwh === 'number' && input.estimatedUnitsKwh >= 0) {
      const estUnits = Math.round(input.estimatedUnitsKwh);
      const basePrev = hasPrev ? Math.max(0, Math.round(input.previousReadingKwh!)) : 1000;
      const derivedCurr = basePrev + estUnits;
      const provenance = input.readingProvenance || 'ESTIMATED_AVERAGE';
      return {
        valid: true,
        unitsConsumed: estUnits,
        previousReadingKwh: basePrev,
        currentReadingKwh: derivedCurr,
        meterMultiplier: multiplier,
        meterReplacementAdjustmentKwh: extraAdjustment,
        readingProvenance: provenance,
        isZeroConsumption: estUnits === 0,
        calculationNotes: `Estimated/Simulated reading fallback applied (${estUnits} kWh, provenance: ${provenance}).`,
      };
    }

    return {
      valid: false,
      errorCode: 'MISSING_METER_READING',
      errorMessage:
        'Both previous and current meter readings (kWh) are required to calculate billed consumption unless provisional estimation is explicitly authorized.',
      unitsConsumed: 0,
      previousReadingKwh: hasPrev ? input.previousReadingKwh! : 0,
      currentReadingKwh: hasCurr ? input.currentReadingKwh! : 0,
      meterMultiplier: multiplier,
      meterReplacementAdjustmentKwh: 0,
      readingProvenance: input.readingProvenance || 'RECORDED',
      isZeroConsumption: false,
      calculationNotes: 'Rejected due to missing meter reading.',
    };
  }

  const prev = Number(input.previousReadingKwh);
  const curr = Number(input.currentReadingKwh);

  if (prev < 0 || curr < 0) {
    return {
      valid: false,
      errorCode: 'NEGATIVE_READING_VALUE',
      errorMessage: 'Meter readings cannot be negative kWh values.',
      unitsConsumed: 0,
      previousReadingKwh: prev,
      currentReadingKwh: curr,
      meterMultiplier: multiplier,
      meterReplacementAdjustmentKwh: 0,
      readingProvenance: input.readingProvenance || 'RECORDED',
      isZeroConsumption: false,
      calculationNotes: 'Rejected negative meter reading.',
    };
  }

  if (curr < prev) {
    return {
      valid: false,
      errorCode: 'NEGATIVE_CONSUMPTION_INVALID',
      errorMessage: `Current meter reading (${curr} kWh) is less than previous meter reading (${prev} kWh). Negative consumption is blocked unless a verified meter replacement/reset record is provided.`,
      unitsConsumed: 0,
      previousReadingKwh: prev,
      currentReadingKwh: curr,
      meterMultiplier: multiplier,
      meterReplacementAdjustmentKwh: 0,
      readingProvenance: input.readingProvenance || 'RECORDED',
      isZeroConsumption: false,
      calculationNotes: 'Rejected negative consumption delta without meter replacement record.',
    };
  }

  const rawUnits = Math.round((curr - prev) * multiplier) + extraAdjustment;
  const unitsConsumed = Math.max(0, rawUnits);
  const provenance = input.readingProvenance || 'RECORDED';

  return {
    valid: true,
    unitsConsumed,
    previousReadingKwh: prev,
    currentReadingKwh: curr,
    meterMultiplier: multiplier,
    meterReplacementAdjustmentKwh: extraAdjustment,
    readingProvenance: provenance,
    isZeroConsumption: unitsConsumed === 0,
    calculationNotes:
      unitsConsumed === 0
        ? `Zero consumption verified (${prev} kWh -> ${curr} kWh). Fixed charges and statutory duty apply.`
        : `Recorded consumption: (${curr} - ${prev}) × ${multiplier}${extraAdjustment ? ` + ${extraAdjustment}` : ''} = ${unitsConsumed} kWh.`,
  };
}

// ============================================================================
// CONFIGURABLE CYCLE TARIFF & CHARGE ENGINE (PART 5)
// ============================================================================

export interface TariffCycleCalculationOptions {
  billingCycleType?: BillingCycleType;
  policyMode?: TariffCyclePolicyMode;
  tariffConfigVersion?: string;
  rebateOrSubsidyInr?: number;
  otherAdjustmentsInr?: number;
  isPartialPeriod?: boolean;
  billedDaysCount?: number;
  standardCycleDaysCount?: number;
}

export interface TariffCycleCalculationResult {
  slabBreakdown: { slab: string; units: number; rate: number; amount: number }[];
  energyCharges: number;
  fixedCharges: number;
  fuelPriceAdjustment: number;
  electricityDuty: number;
  rebateOrSubsidy: number;
  otherAdjustmentsInr: number;
  grossBeforeRounding: number;
  roundingAdjustmentInr: number;
  totalAmount: number;
  billingCycleType: BillingCycleType;
  policyMode: TariffCyclePolicyMode;
  tariffConfigVersion: string;
  isDemoTariffAssumption: boolean;
}

/**
 * Calculates UGVCL tariff slab breakdown and statutory charges for both
 * 1-month ('MONTHLY') and 2-month ('BI_MONTHLY') billing cycles.
 *
 * Tariff Policy Governance:
 * - 'MONTHLY_STANDARD': Standard single-month UGVCL DEMO schedule (RGPU: 0-50, 51-100, 101-250, >250; 1x monthly fixed charge).
 * - 'BI_MONTHLY_PROPORTIONAL_2X_DEMO' (default for BI_MONTHLY): Proportional 2-month DEMO schedule
 *   (RGPU: 0-100, 101-200, 201-500, >500; NRGP: 0-200, >200; 2x monthly fixed charge per kW for the 2-month period,
 *   pro-rated if `isPartialPeriod` is true). Explicitly flagged with `isDemoTariffAssumption: true`.
 * - 'BI_MONTHLY_UNSCALED_SLABS_DEMO': Configurable alternative where slab thresholds remain unscaled while fixed charges
 *   cover the 2-month cycle.
 */
export function calculateConfigurableCycleTariffBreakdown(
  tariffCategory: TariffCategory,
  sanctionedLoadKw: number,
  unitsConsumed: number,
  options?: TariffCycleCalculationOptions
): TariffCycleCalculationResult {
  const units = Math.max(0, Math.round(unitsConsumed));
  const loadKw = Math.max(1, Number(sanctionedLoadKw || 2));
  const cycleType: BillingCycleType =
    options?.billingCycleType === 'BI_MONTHLY' ? 'BI_MONTHLY' : 'MONTHLY';

  const policyMode: TariffCyclePolicyMode =
    options?.policyMode ||
    (cycleType === 'BI_MONTHLY'
      ? 'BI_MONTHLY_PROPORTIONAL_2X_DEMO'
      : 'MONTHLY_STANDARD');

  const tariffConfigVersion =
    options?.tariffConfigVersion ||
    (cycleType === 'BI_MONTHLY'
      ? 'UGVCL-DEMO-TARIFF-2026-V2-BIMONTHLY-CONFIGURABLE'
      : 'UGVCL-DEMO-TARIFF-2026-V1-MONTHLY');

  const scaleSlabs2x =
    cycleType === 'BI_MONTHLY' && policyMode === 'BI_MONTHLY_PROPORTIONAL_2X_DEMO';
  const slabMultiplier = scaleSlabs2x ? 2 : 1;

  const slabBreakdown: { slab: string; units: number; rate: number; amount: number }[] = [];

  if (tariffCategory === 'Commercial (NRGP)') {
    const t1Limit = 100 * slabMultiplier;
    const tier1 = Math.min(units, t1Limit);
    const tier2 = Math.max(0, units - t1Limit);
    if (tier1 > 0 || units === 0) {
      if (tier1 > 0) {
        slabBreakdown.push({
          slab: scaleSlabs2x
            ? `0 - ${t1Limit} Units (NRGP Bi-Monthly Tier 1)`
            : '0 - 100 Units (NRGP Tier 1)',
          units: tier1,
          rate: 4.75,
          amount: Number((tier1 * 4.75).toFixed(2)),
        });
      }
    }
    if (tier2 > 0) {
      slabBreakdown.push({
        slab: scaleSlabs2x
          ? `Above ${t1Limit} Units (NRGP Bi-Monthly Tier 2)`
          : 'Above 100 Units (NRGP Tier 2)',
        units: tier2,
        rate: 5.35,
        amount: Number((tier2 * 5.35).toFixed(2)),
      });
    }
  } else if (tariffCategory === 'Industrial (LTMD)') {
    if (units > 0) {
      slabBreakdown.push({
        slab:
          cycleType === 'BI_MONTHLY'
            ? 'All Units (LTMD Industrial Bi-Monthly Rate)'
            : 'All Units (LTMD Industrial Rate)',
        units,
        rate: 5.2,
        amount: Number((units * 5.2).toFixed(2)),
      });
    }
  } else if (tariffCategory === 'Agricultural (AG)') {
    if (units > 0) {
      slabBreakdown.push({
        slab:
          cycleType === 'BI_MONTHLY'
            ? 'Agricultural Subsidized Tariff (AG Bi-Monthly)'
            : 'Agricultural Subsidized Tariff (AG)',
        units,
        rate: 0.6,
        amount: Number((units * 0.6).toFixed(2)),
      });
    }
  } else {
    // Residential (RGPU)
    const w1 = 50 * slabMultiplier; // 50 (monthly) or 100 (bi-monthly)
    const w2 = 50 * slabMultiplier; // 50 (monthly) or 100 (bi-monthly)
    const w3 = 150 * slabMultiplier; // 150 (monthly) or 300 (bi-monthly)

    const s1 = Math.min(units, w1);
    const s2 = Math.min(Math.max(0, units - w1), w2);
    const s3 = Math.min(Math.max(0, units - (w1 + w2)), w3);
    const s4 = Math.max(0, units - (w1 + w2 + w3));

    if (s1 > 0) {
      slabBreakdown.push({
        slab: scaleSlabs2x ? 'First 100 Units (0 - 100)' : 'First 50 Units (0 - 50)',
        units: s1,
        rate: 3.05,
        amount: Number((s1 * 3.05).toFixed(2)),
      });
    }
    if (s2 > 0) {
      slabBreakdown.push({
        slab: scaleSlabs2x ? 'Next 100 Units (101 - 200)' : 'Next 50 Units (51 - 100)',
        units: s2,
        rate: 3.5,
        amount: Number((s2 * 3.5).toFixed(2)),
      });
    }
    if (s3 > 0) {
      slabBreakdown.push({
        slab: scaleSlabs2x ? 'Next 300 Units (201 - 500)' : 'Next 150 Units (101 - 250)',
        units: s3,
        rate: 4.15,
        amount: Number((s3 * 4.15).toFixed(2)),
      });
    }
    if (s4 > 0) {
      slabBreakdown.push({
        slab: scaleSlabs2x ? 'Above 500 Units' : 'Above 250 Units',
        units: s4,
        rate: 5.2,
        amount: Number((s4 * 5.2).toFixed(2)),
      });
    }
  }

  if (units === 0 && slabBreakdown.length === 0) {
    slabBreakdown.push({
      slab:
        cycleType === 'BI_MONTHLY'
          ? 'Zero Consumption Bi-Monthly Cycle (0 Units)'
          : 'Zero Consumption Cycle (0 Units)',
      units: 0,
      rate: 0,
      amount: 0,
    });
  }

  const energyCharges = Number(
    slabBreakdown.reduce((sum, s) => sum + s.amount, 0).toFixed(2)
  );

  const monthlyFixedRatePerKw =
    tariffCategory === 'Commercial (NRGP)'
      ? 70
      : tariffCategory === 'Industrial (LTMD)'
      ? 90
      : tariffCategory === 'Agricultural (AG)'
      ? 20
      : 25;

  const cycleMonthsMultiplier = cycleType === 'BI_MONTHLY' ? 2 : 1;
  let proRataFactor = 1;
  if (
    options?.isPartialPeriod &&
    typeof options.billedDaysCount === 'number' &&
    typeof options.standardCycleDaysCount === 'number' &&
    options.standardCycleDaysCount > 0 &&
    options.billedDaysCount < options.standardCycleDaysCount
  ) {
    proRataFactor = Math.max(
      0.1,
      Math.min(1, options.billedDaysCount / options.standardCycleDaysCount)
    );
  }

  const fixedCharges = Number(
    (loadKw * monthlyFixedRatePerKw * cycleMonthsMultiplier * proRataFactor).toFixed(2)
  );

  const fuelPriceAdjustment = Number((units * 2.5).toFixed(2));
  const dutyRate =
    tariffCategory === 'Commercial (NRGP)'
      ? 0.2
      : tariffCategory === 'Agricultural (AG)'
      ? 0.05
      : 0.15;

  const electricityDuty = Math.round(
    (energyCharges + fixedCharges + fuelPriceAdjustment) * dutyRate
  );

  const rebateOrSubsidy = Math.max(
    0,
    Number((options?.rebateOrSubsidyInr ?? 0).toFixed(2))
  );
  const otherAdjustmentsInr = Number(
    (options?.otherAdjustmentsInr ?? 0).toFixed(2)
  );

  const grossBeforeRounding = Number(
    (
      energyCharges +
      fixedCharges +
      fuelPriceAdjustment +
      electricityDuty +
      otherAdjustmentsInr -
      rebateOrSubsidy
    ).toFixed(2)
  );
  const totalAmount = Math.max(0, Math.round(grossBeforeRounding));
  const roundingAdjustmentInr = Number((totalAmount - grossBeforeRounding).toFixed(2));

  return {
    slabBreakdown,
    energyCharges,
    fixedCharges,
    fuelPriceAdjustment,
    electricityDuty,
    rebateOrSubsidy,
    otherAdjustmentsInr,
    grossBeforeRounding,
    roundingAdjustmentInr,
    totalAmount,
    billingCycleType: cycleType,
    policyMode,
    tariffConfigVersion,
    isDemoTariffAssumption: cycleType === 'BI_MONTHLY',
  };
}

/**
 * Calculates UGVCL tariff slab breakdown and bill charges deterministically from connection attributes.
 * Preserves 100% backward compatibility with all existing 3-argument callers while supporting optional cycle config.
 */
export function calculateDeterministicTariffBreakdown(
  tariffCategory: TariffCategory,
  sanctionedLoadKw: number,
  unitsConsumed: number,
  options?: TariffCycleCalculationOptions
): {
  slabBreakdown: { slab: string; units: number; rate: number; amount: number }[];
  energyCharges: number;
  fixedCharges: number;
  fuelPriceAdjustment: number;
  electricityDuty: number;
  rebateOrSubsidy: number;
  totalAmount: number;
} {
  const res = calculateConfigurableCycleTariffBreakdown(
    tariffCategory,
    sanctionedLoadKw,
    unitsConsumed,
    options
  );
  return {
    slabBreakdown: res.slabBreakdown,
    energyCharges: res.energyCharges,
    fixedCharges: res.fixedCharges,
    fuelPriceAdjustment: res.fuelPriceAdjustment,
    electricityDuty: res.electricityDuty,
    rebateOrSubsidy: res.rebateOrSubsidy,
    totalAmount: res.totalAmount,
  };
}

// ============================================================================
// CONNECTION BILLING ELIGIBILITY & DETERMINISTIC DEMO BILL GENERATION (PART 4)
// ============================================================================

/**
 * Determines whether a connection is eligible for electricity bill generation.
 * Only Active connections (or applications that have reached 'Meter Installed') are billing-eligible.
 * Draft, Submitted, Document Verification, Site Inspection, Sanction Approval, Rejected,
 * Suspended, or New Installation connections awaiting meter commissioning are NOT eligible.
 */
export function isConnectionBillingEligible(
  connection: ElectricityConnection | null | undefined,
  linkedApplication?: NewConnectionApplication | null
): { eligible: boolean; reason: string } {
  if (!connection) {
    return {
      eligible: false,
      reason: 'No connection record exists.',
    };
  }

  const consumerNo = normalizeBillingIdentifier(connection.consumerNo);
  const meterNo = normalizeBillingIdentifier(connection.meterNo);

  if (!consumerNo) {
    return {
      eligible: false,
      reason: 'Connection is missing a valid consumer number.',
    };
  }

  if (linkedApplication) {
    const appStatus = linkedApplication.status;
    if (
      appStatus === 'Submitted' ||
      appStatus === 'Document Verification' ||
      appStatus === 'Site Inspection' ||
      appStatus === 'Sanction Approval' ||
      appStatus === 'Rejected'
    ) {
      return {
        eligible: false,
        reason: `Application ${linkedApplication.id} is in '${appStatus}' stage and has not had a meter installed/energized yet.`,
      };
    }
  }

  if (connection.status !== 'Active') {
    return {
      eligible: false,
      reason: `Connection ${connection.consumerNo} has status '${connection.status}'. Only 'Active' energized connections are eligible for billing.`,
    };
  }

  if (!meterNo || meterNo === 'PENDING' || meterNo === 'UNASSIGNED') {
    return {
      eligible: false,
      reason: `Connection ${connection.consumerNo} does not have an active commissioned meter serial number.`,
    };
  }

  return {
    eligible: true,
    reason: `Connection ${connection.consumerNo} is Active with meter ${connection.meterNo}.`,
  };
}

export interface GenerateDeterministicDemoBillInput {
  connection: ElectricityConnection | null | undefined;
  existingBills: ElectricityBill[];
  linkedApplication?: NewConnectionApplication | null;
  billMonth?: string;
  billDate?: string;
  dueDate?: string;
  simulatedUnitsKwh?: number;
  billingCycleType?: BillingCycleType;
  periodStartDate?: string;
  periodEndDate?: string;
  previousReadingKwh?: number;
  currentReadingKwh?: number;
  meterMultiplier?: number;
  meterResetOrReplacement?: MeterResetOrReplacementRecord | null;
  policyMode?: TariffCyclePolicyMode;
  rebateOrSubsidyInr?: number;
  otherAdjustmentsInr?: number;
  enforceStrictOverlapCheck?: boolean;
  createdByRole?: UserRole;
  createdByActor?: string;
}

export interface GenerateDeterministicDemoBillResult {
  created: boolean;
  bill: ElectricityBill | null;
  updatedBills: ElectricityBill[];
  reason: string;
  conflictType?: 'NONE' | 'DUPLICATE_PERIOD' | 'OVERLAPPING_PERIOD';
  errorCode?: string;
}

/**
 * Deterministically and idempotently generates a DEMO bill (Monthly or Bi-Monthly) for an eligible Active connection.
 * - Never generates a bill for non-Active connections or unenergized applications.
 * - Never creates duplicate bills for the same connection and billing period on refresh/re-render.
 * - Supports both legacy 1-month ('MONTHLY') and 2-month ('BI_MONTHLY') billing cycles.
 */
export function generateDeterministicDemoBillForConnection(
  input: GenerateDeterministicDemoBillInput
): GenerateDeterministicDemoBillResult {
  const { connection, existingBills = [], linkedApplication } = input;
  const eligibility = isConnectionBillingEligible(connection, linkedApplication);

  if (!eligibility.eligible || !connection) {
    return {
      created: false,
      bill: null,
      updatedBills: existingBills,
      reason: eligibility.reason,
    };
  }

  const targetMonth = (input.billMonth || 'October 2026').trim();
  const normMonth = targetMonth.toUpperCase();
  const isBiMonthlyTarget =
    input.billingCycleType === 'BI_MONTHLY' || /[–-]/.test(targetMonth);
  const effectiveCycleType: BillingCycleType = isBiMonthlyTarget ? 'BI_MONTHLY' : 'MONTHLY';

  // Check exact duplicate first
  const duplicateBill = existingBills.find(
    (b) =>
      matchesBillToConnection(b, connection) &&
      (b.billMonth || '').trim().toUpperCase() === normMonth
  );

  if (duplicateBill) {
    return {
      created: false,
      bill: duplicateBill,
      updatedBills: existingBills,
      reason: `Bill ${duplicateBill.billNo} already exists for connection ${connection.consumerNo} and cycle ${targetMonth}.`,
      conflictType: 'DUPLICATE_PERIOD',
    };
  }

  const parsedPeriod = parseBillMonthToPeriodDescriptor(targetMonth, effectiveCycleType);
  const periodStartDate =
    input.periodStartDate ||
    parsedPeriod?.periodStartDate ||
    (effectiveCycleType === 'BI_MONTHLY' ? '01-Sep-2026' : '01-Oct-2026');
  const periodEndDate =
    input.periodEndDate ||
    parsedPeriod?.periodEndDate ||
    (effectiveCycleType === 'BI_MONTHLY' ? '31-Oct-2026' : '31-Oct-2026');

  // If bi-monthly or strict overlap check is requested, prevent overlapping periods
  if (effectiveCycleType === 'BI_MONTHLY' || input.enforceStrictOverlapCheck) {
    const conflictCheck = checkBillingPeriodConflict(
      connection,
      {
        billMonth: targetMonth,
        periodStartDate,
        periodEndDate,
        billingCycleType: effectiveCycleType,
      },
      existingBills
    );
    if (conflictCheck.hasConflict) {
      return {
        created: false,
        bill: conflictCheck.conflictingBill,
        updatedBills: existingBills,
        reason: conflictCheck.reason,
        conflictType: conflictCheck.conflictType,
      };
    }
  }

  // If explicit previous/current readings or meter replacement record are provided, validate them strictly
  let unitsConsumed = 0;
  let prevReading = connection.previousReadingKwh || 0;
  let currReading = connection.currentReadingKwh || 0;
  let readingProvenance: MeterReadingProvenance = 'SIMULATED_DEMO';
  let calculationNotes = '';

  if (
    input.previousReadingKwh !== undefined ||
    input.currentReadingKwh !== undefined ||
    input.meterResetOrReplacement
  ) {
    const readingCheck = computeValidatedMeterConsumption({
      previousReadingKwh: input.previousReadingKwh,
      currentReadingKwh: input.currentReadingKwh,
      meterMultiplier: input.meterMultiplier,
      meterResetOrReplacement: input.meterResetOrReplacement,
      readingProvenance: 'RECORDED',
    });
    if (!readingCheck.valid) {
      return {
        created: false,
        bill: null,
        updatedBills: existingBills,
        reason: readingCheck.errorMessage || 'Invalid meter readings.',
        errorCode: readingCheck.errorCode,
      };
    }
    unitsConsumed = readingCheck.unitsConsumed;
    prevReading = readingCheck.previousReadingKwh;
    currReading = readingCheck.currentReadingKwh;
    readingProvenance = readingCheck.readingProvenance;
    calculationNotes = readingCheck.calculationNotes;
  } else {
    const readingDelta = Math.max(
      0,
      Math.round((connection.currentReadingKwh || 0) - (connection.previousReadingKwh || 0))
    );
    const defaultCycleMultiplier = effectiveCycleType === 'BI_MONTHLY' ? 2 : 1;
    unitsConsumed =
      typeof input.simulatedUnitsKwh === 'number' && input.simulatedUnitsKwh >= 0
        ? Math.round(input.simulatedUnitsKwh)
        : readingDelta > 0
        ? readingDelta * (effectiveCycleType === 'BI_MONTHLY' && readingDelta < 400 ? 2 : 1)
        : connection.averageMonthlyKwh > 0
        ? Math.round(connection.averageMonthlyKwh * defaultCycleMultiplier)
        : Math.max(90 * defaultCycleMultiplier, Math.round((connection.sanctionedLoadKw || 2) * 60 * defaultCycleMultiplier));

    prevReading = connection.currentReadingKwh || 1000;
    currReading = prevReading + unitsConsumed;
    readingProvenance = 'SIMULATED_DEMO';
    calculationNotes = `Simulated DEMO ${effectiveCycleType} cycle consumption (${unitsConsumed} kWh).`;
  }

  const tariffCalc = calculateConfigurableCycleTariffBreakdown(
    connection.tariffCategory || 'Residential (RGPU)',
    connection.sanctionedLoadKw || 2,
    unitsConsumed,
    {
      billingCycleType: effectiveCycleType,
      policyMode: input.policyMode,
      rebateOrSubsidyInr: input.rebateOrSubsidyInr,
      otherAdjustmentsInr: input.otherAdjustmentsInr,
      isPartialPeriod: parsedPeriod?.isPartialPeriod,
      billedDaysCount: parsedPeriod?.billedDaysCount,
      standardCycleDaysCount: parsedPeriod?.standardCycleDaysCount,
    }
  );

  const safeConnCode = connection.consumerNo.replace(/[^A-Za-z0-9]/g, '').slice(-5) || '00001';
  const monthCode = normMonth
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const cyclePrefix = effectiveCycleType === 'BI_MONTHLY' ? 'BILL-UG-BM' : 'BILL-UG-DEMO';
  const deterministicBillNo = `${cyclePrefix}-${monthCode}-${safeConnCode}`;

  const defaultBillDate =
    input.billDate || parsedPeriod?.billDate || '05-Oct-2026';
  const defaultDueDate =
    input.dueDate || parsedPeriod?.dueDate || '20-Oct-2026';

  const newBill: ElectricityBill = {
    billNo: deterministicBillNo,
    consumerNo: connection.consumerNo,
    connectionId: connection.connectionId,
    billMonth: targetMonth,
    billDate: defaultBillDate,
    dueDate: defaultDueDate,
    unitsConsumed,
    energyCharges: tariffCalc.energyCharges,
    fixedCharges: tariffCalc.fixedCharges,
    fuelPriceAdjustment: tariffCalc.fuelPriceAdjustment,
    electricityDuty: tariffCalc.electricityDuty,
    rebateOrSubsidy: tariffCalc.rebateOrSubsidy,
    otherAdjustmentsInr: tariffCalc.otherAdjustmentsInr,
    totalAmount: tariffCalc.totalAmount,
    status: 'Unpaid',
    slabBreakdown: tariffCalc.slabBreakdown,
    accountId: connection.accountId,
    paidAmount: 0,
    remainingBalance: tariffCalc.totalAmount,
    outstandingBalance: tariffCalc.totalAmount,
    isSimulatedDemoBill: true,
    generatedAt: defaultBillDate,
    billingCycleType: effectiveCycleType,
    periodStartDate,
    periodEndDate,
    billingPeriodLabel: `${periodStartDate} to ${periodEndDate}`,
    previousReadingKwh: prevReading,
    currentReadingKwh: currReading,
    previousReadingDate: periodStartDate,
    currentReadingDate: periodEndDate,
    readingProvenance,
    meterMultiplier: input.meterMultiplier || 1,
    tariffConfigVersion: tariffCalc.tariffConfigVersion,
    tariffCyclePolicyMode: tariffCalc.policyMode,
    isPartialPeriod: parsedPeriod?.isPartialPeriod || false,
    billedDaysCount: parsedPeriod?.billedDaysCount,
    standardCycleDaysCount: parsedPeriod?.standardCycleDaysCount,
    auditMetadata: {
      createdByRole: input.createdByRole || 'consumer',
      createdByActor: input.createdByActor || 'VidyutFlow Billing Engine',
      calculationNotes,
      isDemoTariffAssumption: tariffCalc.isDemoTariffAssumption,
    },
  };

  return {
    created: true,
    bill: newBill,
    updatedBills: [newBill, ...existingBills],
    reason: `Generated deterministic ${effectiveCycleType} DEMO bill ${newBill.billNo} (${targetMonth}: ${periodStartDate} to ${periodEndDate}) for active connection ${connection.consumerNo}.`,
    conflictType: 'NONE',
  };
}

export interface GenerateDeterministicBiMonthlyBillInput {
  connection: ElectricityConnection | null | undefined;
  existingBills: ElectricityBill[];
  linkedApplication?: NewConnectionApplication | null;
  startYear?: number;
  startMonth1To12?: number;
  autoResolveNonOverlappingPeriod?: boolean;
  previousReadingKwh?: number;
  currentReadingKwh?: number;
  simulatedUnitsKwh?: number;
  meterMultiplier?: number;
  meterResetOrReplacement?: MeterResetOrReplacementRecord | null;
  policyMode?: TariffCyclePolicyMode;
  rebateOrSubsidyInr?: number;
  otherAdjustmentsInr?: number;
  createdByRole?: UserRole;
  createdByActor?: string;
}

/**
 * Dedicated helper for generating a validated two-month ('BI_MONTHLY') electricity bill.
 * Supports explicit two-month window (`startYear`, `startMonth1To12`) or automatic non-overlapping
 * period selection (`autoResolveNonOverlappingPeriod: true`).
 */
export function generateDeterministicBiMonthlyBillForConnection(
  input: GenerateDeterministicBiMonthlyBillInput
): GenerateDeterministicDemoBillResult {
  const { connection, existingBills = [], linkedApplication } = input;
  const eligibility = isConnectionBillingEligible(connection, linkedApplication);
  if (!eligibility.eligible || !connection) {
    return {
      created: false,
      bill: null,
      updatedBills: existingBills,
      reason: eligibility.reason,
    };
  }

  const targetDescriptor = input.autoResolveNonOverlappingPeriod
    ? resolveNextNonOverlappingBiMonthlyPeriod(
        connection,
        existingBills,
        input.startYear ?? 2026,
        input.startMonth1To12 ?? 9
      )
    : buildBiMonthlyBillingPeriod(
        input.startYear ?? 2026,
        input.startMonth1To12 ?? 9,
        { connectedDate: connection.connectedDate }
      );

  return generateDeterministicDemoBillForConnection({
    connection,
    existingBills,
    linkedApplication,
    billMonth: targetDescriptor.billMonth,
    billDate: targetDescriptor.billDate,
    dueDate: targetDescriptor.dueDate,
    billingCycleType: 'BI_MONTHLY',
    periodStartDate: targetDescriptor.periodStartDate,
    periodEndDate: targetDescriptor.periodEndDate,
    previousReadingKwh: input.previousReadingKwh,
    currentReadingKwh: input.currentReadingKwh,
    simulatedUnitsKwh: input.simulatedUnitsKwh,
    meterMultiplier: input.meterMultiplier,
    meterResetOrReplacement: input.meterResetOrReplacement,
    policyMode: input.policyMode || 'BI_MONTHLY_PROPORTIONAL_2X_DEMO',
    rebateOrSubsidyInr: input.rebateOrSubsidyInr,
    otherAdjustmentsInr: input.otherAdjustmentsInr,
    enforceStrictOverlapCheck: true,
    createdByRole: input.createdByRole,
    createdByActor: input.createdByActor,
  });
}

// ============================================================================
// CANONICAL CONNECTION & ACCOUNT BILLING SELECTORS (PART 2)
// ============================================================================

/**
 * Sorts bills newest-first by billDate (fallback to billMonth, then billNo).
 */
export function sortBillsNewestFirst<T extends ElectricityBill>(bills: T[]): T[] {
  return [...bills].sort((a, b) => {
    const aDate = parseVidyutDateToUtcMs(a.billDate) ?? parseVidyutDateToUtcMs(a.billMonth) ?? 0;
    const bDate = parseVidyutDateToUtcMs(b.billDate) ?? parseVidyutDateToUtcMs(b.billMonth) ?? 0;
    if (bDate !== aDate) return bDate - aDate;
    return String(b.billNo).localeCompare(String(a.billNo));
  });
}

/**
 * Sorts payment transactions newest-first by date (fallback to txId).
 */
export function sortPaymentsNewestFirst(payments: PaymentTransaction[]): PaymentTransaction[] {
  return [...payments].sort((a, b) => {
    const aDate = parseVidyutDateToUtcMs(a.date) ?? 0;
    const bDate = parseVidyutDateToUtcMs(b.date) ?? 0;
    if (bDate !== aDate) return bDate - aDate;
    return String(b.txId).localeCompare(String(a.txId));
  });
}

/**
 * Selects the complete reconciled billing summary for a single connection.
 * Guarantees:
 * - All bills belonging to the connection (Paid, Unpaid, Overdue, Partially Paid) are preserved in visibleBills.
 * - A connection with 0 generated bills has latestBill = null, dueBillCount = 0, and dashboardBadgeState = 'NO_BILL_GENERATED' (NEVER 'PAID').
 * - A bill with 0 remaining balance is never counted in dueBillCount.
 */
export function selectConnectionBillingSummary(
  connection: ElectricityConnection | null | undefined,
  allBills: ElectricityBill[],
  allPayments: PaymentTransaction[],
  options?: {
    referenceDate?: string;
    legacyAliases?: string[];
    linkedApplication?: NewConnectionApplication | null;
    waivers?: LateChargeWaiverRecord[];
    reversals?: PaymentReversalRecord[];
    policy?: LateChargePolicy;
  }
): ConnectionBillingSummary {
  const referenceDate = options?.referenceDate || '15-Oct-2026';
  const legacyAliases = options?.legacyAliases || [];

  if (!connection) {
    return {
      connection: null,
      consumerNo: '',
      connectionId: '',
      visibleBills: [],
      dueBills: [],
      paidBills: [],
      dueBillCount: 0,
      paidBillCount: 0,
      totalBillCount: 0,
      totalOutstandingAmount: 0,
      totalOutstandingPrincipalInr: 0,
      totalAccruedLateCharges: 0,
      totalAccruedLateChargesInr: 0,
      totalOutstandingWithCharges: 0,
      totalOutstandingWithChargesInr: 0,
      latestBill: null,
      currentBill: null,
      mostRecentGeneratedBill: null,
      dashboardBadgeState: 'NO_ACTIVE_CONNECTION',
      paymentHistory: [],
      billingEligibility: {
        eligible: false,
        reason: 'No active connection selected.',
      },
    };
  }

  // Match all bills for this connection (including legacy identifier aliases)
  const matchedRawBills = (allBills || []).filter((bill) =>
    matchesBillToConnection(bill, connection, legacyAliases)
  );

  // Deduplicate by billNo
  const uniqueRawBills: ElectricityBill[] = [];
  const seenBillNos = new Set<string>();
  for (const b of matchedRawBills) {
    const key = normalizeBillingIdentifier(b.billNo);
    if (!key || seenBillNos.has(key)) continue;
    seenBillNos.add(key);
    uniqueRawBills.push(b);
  }

  // Reconcile every bill against all payments, waivers, and reversals
  const reconciledBills = sortBillsNewestFirst(
    uniqueRawBills.map((bill) =>
      reconcileBillWithPayments(bill, allPayments, referenceDate, {
        waivers: options?.waivers,
        reversals: options?.reversals,
        policy: options?.policy,
        tariffCategory: connection.tariffCategory,
      })
    )
  );

  const dueBills = reconciledBills.filter((b) => b.isDue && b.outstandingBalance > 0);
  const paidBills = reconciledBills.filter((b) => b.isPaid && b.outstandingBalance === 0);

  const totalOutstandingAmount = Number(
    dueBills.reduce((sum, b) => sum + b.outstandingBalance, 0).toFixed(2)
  );

  const totalAccruedLateCharges = Number(
    dueBills.reduce((sum, b) => sum + (b.lateChargeBreakdown?.netLateChargesPayable || 0), 0).toFixed(2)
  );

  const totalOutstandingWithCharges = Number(
    (totalOutstandingAmount + totalAccruedLateCharges).toFixed(2)
  );

  const mostRecentGeneratedBill = reconciledBills.length > 0 ? reconciledBills[0] : null;

  // Primary bill for the Dashboard KPI card:
  // If any bill is due (Unpaid / Overdue / Partially Paid), surface the most recent due bill
  // so an unpaid balance is never masked by a newer bill or vice versa; otherwise surface the most recent generated bill.
  const latestBill =
    dueBills.length > 0
      ? dueBills[0]
      : mostRecentGeneratedBill;

  let dashboardBadgeState: DashboardBillBadgeState;
  if (!latestBill) {
    // CRITICAL INVARIANT: A connection with no generated bill must NEVER be marked Paid!
    dashboardBadgeState = 'NO_BILL_GENERATED';
  } else if (latestBill.effectiveStatus === 'Overdue' || latestBill.isOverdue) {
    dashboardBadgeState = 'OVERDUE';
  } else if (latestBill.effectiveStatus === 'Partially Paid' || latestBill.isPartiallyPaid) {
    dashboardBadgeState = 'PARTIALLY_PAID';
  } else if (latestBill.effectiveStatus === 'Unpaid' || latestBill.isDue) {
    dashboardBadgeState = 'UNPAID';
  } else {
    dashboardBadgeState = 'PAID';
  }

  const matchedPayments = sortPaymentsNewestFirst(
    (allPayments || []).filter((p) =>
      matchesPaymentToConnection(p, connection, seenBillNos, legacyAliases)
    )
  );

  // Deduplicate matched payments by txId
  const uniquePayments: PaymentTransaction[] = [];
  const seenTxIds = new Set<string>();
  for (const p of matchedPayments) {
    const k = normalizeBillingIdentifier(p.txId);
    if (!k || seenTxIds.has(k)) continue;
    seenTxIds.add(k);
    uniquePayments.push(p);
  }

  const billingEligibility = isConnectionBillingEligible(
    connection,
    options?.linkedApplication
  );

  return {
    connection,
    consumerNo: connection.consumerNo,
    connectionId: connection.connectionId,
    visibleBills: reconciledBills,
    dueBills,
    paidBills,
    dueBillCount: dueBills.length,
    paidBillCount: paidBills.length,
    totalBillCount: reconciledBills.length,
    totalOutstandingAmount,
    totalOutstandingPrincipalInr: totalOutstandingAmount,
    totalAccruedLateCharges,
    totalAccruedLateChargesInr: totalAccruedLateCharges,
    totalOutstandingWithCharges,
    totalOutstandingWithChargesInr: totalOutstandingWithCharges,
    latestBill,
    currentBill: latestBill,
    mostRecentGeneratedBill,
    dashboardBadgeState,
    paymentHistory: uniquePayments,
    billingEligibility,
  };
}

/**
 * Selects the complete account-wide and active-connection billing summary for a consumer.
 * Used as the single source of truth by ConsumerPortal (Dashboard, Bills, Payments, Receipts, Exports),
 * Sidebar, and MobileNav.
 */
export function selectConsumerAccountBillingSummary(input: {
  allConnections?: ElectricityConnection[];
  ownedConnections?: ElectricityConnection[];
  allBills?: ElectricityBill[];
  bills?: ElectricityBill[];
  allPayments?: PaymentTransaction[];
  payments?: PaymentTransaction[];
  actorScope?: ConsumerBillingActorScope;
  accountId?: string;
  selectedConnectionNo?: string | null;
  selectedConsumerNo?: string | null;
  referenceDate?: string;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  policy?: LateChargePolicy;
}): ConsumerAccountBillingSummary {
  const referenceDate = input.referenceDate || '15-Oct-2026';
  const rawConnections = input.allConnections || input.ownedConnections || [];
  const rawBills = input.allBills || input.bills || [];
  const rawPayments = input.allPayments || input.payments || [];
  const actorScope: ConsumerBillingActorScope = input.actorScope || {
    accountId: input.accountId || 'demo_consumer',
    ownedConsumerNos: rawConnections.map((c) => c.consumerNo),
  };
  const requestedConnNo = input.selectedConnectionNo ?? input.selectedConsumerNo ?? null;

  const ownedConnections = resolveOwnedConnectionsForConsumer(
    rawConnections,
    actorScope
  );

  const summariesByConnectionNo: Record<string, ConnectionBillingSummary> = {};
  const connectionBreakdown: ConnectionDueBreakdownItem[] = [];

  for (const conn of ownedConnections) {
    const aliases = actorScope.legacyIdentifierMap?.[conn.consumerNo] || [];
    const summary = selectConnectionBillingSummary(conn, rawBills, rawPayments, {
      referenceDate,
      legacyAliases: aliases,
      waivers: input.waivers,
      reversals: input.reversals,
      policy: input.policy,
    });
    summariesByConnectionNo[conn.consumerNo] = summary;
    connectionBreakdown.push({
      consumerNo: conn.consumerNo,
      connectionId: conn.connectionId,
      consumerName: conn.consumerName,
      subdivision: conn.subdivision,
      tariffCategory: conn.tariffCategory,
      status: conn.status,
      dueBillCount: summary.dueBillCount,
      totalBillCount: summary.totalBillCount,
      totalOutstandingAmount: summary.totalOutstandingAmount,
      totalAccruedLateCharges: summary.totalAccruedLateCharges,
      totalOutstandingWithCharges: summary.totalOutstandingWithCharges,
    });
  }

  // Resolve selectedConnection:
  // 1. Explicit selectedConnectionNo if it matches an owned connection
  // 2. Else the first owned connection that has generated bills (e.g. '04281-99231')
  // 3. Else the first owned connection
  const requestedNorm = normalizeBillingIdentifier(requestedConnNo);
  let selectedConnection: ElectricityConnection | null = null;

  if (requestedNorm) {
    selectedConnection =
      ownedConnections.find(
        (c) =>
          normalizeBillingIdentifier(c.consumerNo) === requestedNorm ||
          normalizeBillingIdentifier(c.connectionId) === requestedNorm
      ) || null;
  }

  if (!selectedConnection && ownedConnections.length > 0) {
    const firstWithBills = ownedConnections.find(
      (c) => (summariesByConnectionNo[c.consumerNo]?.totalBillCount || 0) > 0
    );
    selectedConnection = firstWithBills || ownedConnections[0];
  }

  const selectedConnectionSummary = selectedConnection
    ? summariesByConnectionNo[selectedConnection.consumerNo] ||
      selectConnectionBillingSummary(selectedConnection, rawBills, rawPayments, {
        referenceDate,
        waivers: input.waivers,
        reversals: input.reversals,
        policy: input.policy,
      })
    : selectConnectionBillingSummary(null, rawBills, rawPayments, {
        referenceDate,
        waivers: input.waivers,
        reversals: input.reversals,
        policy: input.policy,
      });

  // Aggregate across all owned connections (deduplicating bills and payments by ID)
  const seenAccountBillNos = new Set<string>();
  const allAccountReconciledBills: ReconciledElectricityBill[] = [];
  const seenAccountTxIds = new Set<string>();
  const allAccountPayments: PaymentTransaction[] = [];

  for (const conn of ownedConnections) {
    const summary = summariesByConnectionNo[conn.consumerNo];
    if (!summary) continue;
    for (const b of summary.visibleBills) {
      const k = normalizeBillingIdentifier(b.billNo);
      if (k && !seenAccountBillNos.has(k)) {
        seenAccountBillNos.add(k);
        allAccountReconciledBills.push(b);
      }
    }
    for (const p of summary.paymentHistory) {
      const k = normalizeBillingIdentifier(p.txId);
      if (k && !seenAccountTxIds.has(k)) {
        seenAccountTxIds.add(k);
        allAccountPayments.push(p);
      }
    }
  }

  const sortedAccountBills = sortBillsNewestFirst(allAccountReconciledBills);
  const sortedAccountPayments = sortPaymentsNewestFirst(allAccountPayments);
  const accountDueBills = sortedAccountBills.filter((b) => b.isDue && b.outstandingBalance > 0);
  const accountTotalOutstandingAmount = Number(
    accountDueBills.reduce((sum, b) => sum + b.outstandingBalance, 0).toFixed(2)
  );

  const accountTotalAccruedLateCharges = Number(
    accountDueBills.reduce((sum, b) => sum + (b.lateChargeBreakdown?.netLateChargesPayable || 0), 0).toFixed(2)
  );

  const accountTotalOutstandingWithCharges = Number(
    (accountTotalOutstandingAmount + accountTotalAccruedLateCharges).toFixed(2)
  );

  const connectionsWithDueBills = connectionBreakdown.filter((item) => item.dueBillCount > 0);
  const selectedNorm = normalizeBillingIdentifier(selectedConnection?.consumerNo);
  const otherConnectionsWithDueBills = connectionsWithDueBills.filter(
    (item) => normalizeBillingIdentifier(item.consumerNo) !== selectedNorm
  );

  return {
    ownedConnections,
    selectedConnection,
    selectedConnectionNo: selectedConnection?.consumerNo || '',
    selectedConnectionSummary,
    summariesByConnectionNo,
    selectedConnectionDueCount: selectedConnectionSummary.dueBillCount,
    accountDueBillCount: accountDueBills.length,
    accountTotalBillCount: sortedAccountBills.length,
    accountTotalOutstandingAmount,
    accountTotalAccruedLateCharges,
    accountTotalOutstandingWithCharges,
    allAccountReconciledBills: sortedAccountBills,
    allAccountPayments: sortedAccountPayments,
    connectionBreakdown,
    connectionsWithDueBills,
    otherConnectionsWithDueBills,
    sidebarDueBadgeCount: selectedConnectionSummary.dueBillCount,
  };
}

// ============================================================================
// PAYMENT SETTLEMENT & PARTIAL PAYMENT ENGINE (PART 5 & PART 7)
// ============================================================================

export type SimulatedPaymentOutcome = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface ApplyPaymentToBillInput {
  bill: ElectricityBill;
  existingPayments: PaymentTransaction[];
  paymentMethod: PaymentTransaction['paymentMethod'];
  amountToPay?: number;
  paymentDate?: string;
  txId?: string;
  bankReference?: string;
  accountId?: string;
  referenceDate?: string;
  includeLateCharges?: boolean;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  simulatedOutcome?: SimulatedPaymentOutcome;
  simulatedFailureReason?: string;
  inFlightBillNos?: Set<string>;
}

export interface ApplyPaymentToBillResult {
  success: boolean;
  outcome: SimulatedPaymentOutcome;
  reason: string;
  updatedBill: ElectricityBill;
  reconciledBill: ReconciledElectricityBill;
  paymentTransaction: PaymentTransaction | null;
  previouslySettledAmount: number;
  paidAmountApplied: number;
  lateChargesSettledInPayment: number;
  remainingBalance: number;
  remainingTotalWithCharges: number;
  isFullyPaid: boolean;
  settlementClassification: 'FULL_SETTLEMENT' | 'PARTIAL_SETTLEMENT' | 'NONE';
}

export interface PaymentAmountValidationResult {
  isValid: boolean;
  valid: boolean;
  mode: 'FULL' | 'PARTIAL';
  billTotalAmount: number;
  originalBillAmount: number;
  previouslyPaidAmount: number;
  previouslySettledAmount: number;
  currentOutstandingAmount: number;
  // Step 4B Canonical 9-field extensions:
  remainingPrincipal: number;
  accruedLateCharges: number;
  waivedOrSettledCharges: number;
  totalOutstandingWithCharges: number;
  originalDueDate: string;
  daysOverdue: number;
  calculationReferenceDate: string;
  selectedPaymentAmount: number;
  resolvedAmountToPay: number;
  remainingBalanceAfterPayment: number;
  remainingTotalWithChargesAfterPayment: number;
  isFullSettlement: boolean;
  validationError: string | null;
}

/**
 * Validates a full or partial payment selection against the canonical reconciled bill balance.
 * Exposes all 9 canonical financial fields for overdue & current bills.
 */
export function validatePaymentAmountSelection(params: {
  bill: ElectricityBill;
  existingPayments: PaymentTransaction[];
  mode: 'FULL' | 'PARTIAL';
  customAmountInput?: string | number;
  referenceDate?: string;
  includeLateCharges?: boolean;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
}): PaymentAmountValidationResult {
  const referenceDate = params.referenceDate || '15-Oct-2026';
  const reconciled = reconcileBillWithPayments(
    params.bill,
    params.existingPayments,
    referenceDate,
    {
      waivers: params.waivers,
      reversals: params.reversals,
    }
  );

  const lc = reconciled.lateChargeBreakdown;
  const billTotalAmount = reconciled.totalAmount;
  const previouslyPaidAmount = reconciled.paidAmount;
  const remainingPrincipal = reconciled.outstandingBalance;
  const accruedLateCharges = reconciled.totalAccruedLateCharges;
  const waivedOrSettledCharges = Number(
    (lc.lateChargesWaived + lc.lateChargesSettled).toFixed(2)
  );
  const totalOutstandingWithCharges = reconciled.totalOutstandingWithCharges;
  const maxPayableCeiling = Math.max(remainingPrincipal, totalOutstandingWithCharges);
  const currentOutstandingAmount = params.includeLateCharges
    ? totalOutstandingWithCharges
    : remainingPrincipal;

  const baseNineFields = {
    billTotalAmount,
    originalBillAmount: billTotalAmount,
    previouslyPaidAmount,
    previouslySettledAmount: previouslyPaidAmount,
    currentOutstandingAmount,
    remainingPrincipal,
    accruedLateCharges,
    waivedOrSettledCharges,
    totalOutstandingWithCharges,
    originalDueDate: params.bill.dueDate,
    daysOverdue: lc.daysOverdue,
    calculationReferenceDate: lc.referenceDate,
  };

  if (reconciled.isPaid || maxPayableCeiling <= 0) {
    return {
      isValid: false,
      valid: false,
      mode: params.mode,
      ...baseNineFields,
      currentOutstandingAmount: 0,
      selectedPaymentAmount: 0,
      resolvedAmountToPay: 0,
      remainingBalanceAfterPayment: 0,
      remainingTotalWithChargesAfterPayment: 0,
      isFullSettlement: true,
      validationError: `Bill ${params.bill.billNo} is already fully paid (remaining balance ₹0).`,
    };
  }

  if (params.mode === 'FULL') {
    return {
      isValid: true,
      valid: true,
      mode: 'FULL',
      ...baseNineFields,
      selectedPaymentAmount: currentOutstandingAmount,
      resolvedAmountToPay: currentOutstandingAmount,
      remainingBalanceAfterPayment: 0,
      remainingTotalWithChargesAfterPayment: 0,
      isFullSettlement: true,
      validationError: null,
    };
  }

  const rawStr =
    params.customAmountInput === undefined || params.customAmountInput === null
      ? ''
      : String(params.customAmountInput).trim();

  if (!rawStr) {
    return {
      isValid: false,
      valid: false,
      mode: 'PARTIAL',
      ...baseNineFields,
      selectedPaymentAmount: 0,
      resolvedAmountToPay: 0,
      remainingBalanceAfterPayment: currentOutstandingAmount,
      remainingTotalWithChargesAfterPayment: totalOutstandingWithCharges,
      isFullSettlement: false,
      validationError: 'Please enter a valid payment amount greater than ₹0.',
    };
  }

  const parsed = Number(rawStr);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return {
      isValid: false,
      valid: false,
      mode: 'PARTIAL',
      ...baseNineFields,
      selectedPaymentAmount: 0,
      resolvedAmountToPay: 0,
      remainingBalanceAfterPayment: currentOutstandingAmount,
      remainingTotalWithChargesAfterPayment: totalOutstandingWithCharges,
      isFullSettlement: false,
      validationError: 'Payment amount must be a valid number.',
    };
  }

  const rounded = Number(parsed.toFixed(2));
  if (rounded <= 0) {
    return {
      isValid: false,
      valid: false,
      mode: 'PARTIAL',
      ...baseNineFields,
      selectedPaymentAmount: 0,
      resolvedAmountToPay: 0,
      remainingBalanceAfterPayment: currentOutstandingAmount,
      remainingTotalWithChargesAfterPayment: totalOutstandingWithCharges,
      isFullSettlement: false,
      validationError: 'Payment amount must be greater than ₹0.',
    };
  }

  if (rounded > maxPayableCeiling) {
    return {
      isValid: false,
      valid: false,
      mode: 'PARTIAL',
      ...baseNineFields,
      selectedPaymentAmount: rounded,
      resolvedAmountToPay: rounded,
      remainingBalanceAfterPayment: 0,
      remainingTotalWithChargesAfterPayment: 0,
      isFullSettlement: false,
      validationError: `Amount ₹${rounded.toLocaleString('en-IN')} exceeds remaining payable balance ₹${maxPayableCeiling.toLocaleString('en-IN')}.`,
    };
  }

  const remainingAfter = Math.max(0, Number((remainingPrincipal - rounded).toFixed(2)));
  const remainingTotalAfter = Math.max(
    0,
    Number((totalOutstandingWithCharges - rounded).toFixed(2))
  );
  return {
    isValid: true,
    valid: true,
    mode: 'PARTIAL',
    ...baseNineFields,
    selectedPaymentAmount: rounded,
    resolvedAmountToPay: rounded,
    remainingBalanceAfterPayment: remainingAfter,
    remainingTotalWithChargesAfterPayment: remainingTotalAfter,
    isFullSettlement: remainingAfter === 0,
    validationError: null,
  };
}

export interface TransactionSettlementBreakdown {
  billNo: string;
  txId: string;
  billTotalAmount: number;
  previouslySettledAmount: number;
  amountPaidInThisTransaction: number;
  cumulativeSettledAfterTransaction: number;
  remainingBalanceAfterTransaction: number;
  settlementClassification: 'FULL_SETTLEMENT' | 'PARTIAL_SETTLEMENT';
  resultingBillStatusAfterTransaction: 'Paid' | 'Partially Paid';
  transactionIndex: number;
  totalSuccessfulTransactionsForBill: number;
}

/**
 * Computes the exact historical settlement breakdown for a specific PaymentTransaction on a bill.
 */
export function computeTransactionSettlementBreakdown(params: {
  bill: ElectricityBill | null | undefined;
  payment: PaymentTransaction;
  allPayments?: PaymentTransaction[];
}): TransactionSettlementBreakdown {
  const { bill, payment, allPayments = [] } = params;
  const txAmount = Math.max(0, Number((payment.amount ?? 0).toFixed(2)));
  const billNo = bill?.billNo || payment.billNo;
  const normBillNo = normalizeBillingIdentifier(billNo);
  const targetTxId = normalizeBillingIdentifier(payment.txId);

  // Collect all successful transactions for this bill in chronological order (oldest first)
  const matchingSuccessful: PaymentTransaction[] = [];
  const seenKeys = new Set<string>();

  const candidateList = [...(allPayments || [])];
  if (
    payment.status === 'Successful' &&
    !candidateList.some((p) => normalizeBillingIdentifier(p.txId) === targetTxId)
  ) {
    candidateList.push(payment);
  }

  for (const p of candidateList) {
    if (!p || p.status !== 'Successful') continue;
    if (normalizeBillingIdentifier(p.billNo) !== normBillNo) continue;
    const k = normalizeBillingIdentifier(p.txId) || `${normBillNo}:${p.amount}:${p.date}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    matchingSuccessful.push(p);
  }

  const indexed = matchingSuccessful.map((item, idx) => ({
    item,
    idx,
    ms: parseVidyutDateToUtcMs(item.date) ?? 0,
  }));

  indexed.sort((a, b) => {
    if (a.ms !== b.ms) return a.ms - b.ms;
    return b.idx - a.idx;
  });

  const chronological = indexed.map((entry) => entry.item);
  const sumAllSuccessful = Number(
    chronological.reduce((acc, p) => acc + Math.max(0, Number(p.amount ?? 0)), 0).toFixed(2)
  );

  const billTotalAmount = Math.max(
    txAmount,
    Number((bill?.totalAmount ?? Math.max(txAmount, sumAllSuccessful)).toFixed(2))
  );

  let previouslySettled = 0;
  let foundIndex = -1;

  for (let i = 0; i < chronological.length; i++) {
    const p = chronological[i];
    if (normalizeBillingIdentifier(p.txId) === targetTxId) {
      foundIndex = i;
      break;
    }
    previouslySettled = Number((previouslySettled + Math.max(0, Number(p.amount ?? 0))).toFixed(2));
  }

  if (foundIndex === -1) {
    const explicitBillPaid =
      typeof bill?.paidAmount === 'number' && bill.paidAmount >= txAmount
        ? Number((bill.paidAmount - txAmount).toFixed(2))
        : 0;
    previouslySettled = Math.max(0, explicitBillPaid);
    foundIndex = 0;
  }

  const cumulativeSettledAfterTransaction = Math.min(
    billTotalAmount,
    Number((previouslySettled + txAmount).toFixed(2))
  );
  const remainingBalanceAfterTransaction = Math.max(
    0,
    Number((billTotalAmount - cumulativeSettledAfterTransaction).toFixed(2))
  );
  const isFullSettlement = remainingBalanceAfterTransaction === 0;

  return {
    billNo,
    txId: payment.txId,
    billTotalAmount,
    previouslySettledAmount: previouslySettled,
    amountPaidInThisTransaction: txAmount,
    cumulativeSettledAfterTransaction,
    remainingBalanceAfterTransaction,
    settlementClassification: isFullSettlement ? 'FULL_SETTLEMENT' : 'PARTIAL_SETTLEMENT',
    resultingBillStatusAfterTransaction: isFullSettlement ? 'Paid' : 'Partially Paid',
    transactionIndex: foundIndex + 1,
    totalSuccessfulTransactionsForBill: Math.max(1, chronological.length),
  };
}

/**
 * Applies a full or partial payment to a bill deterministically.
 * - Supports controlled DEMO outcomes: 'SUCCESS' (default), 'FAILED', and 'PENDING'.
 * - Supports settling either principal or total outstanding with overdue late charges (DPS).
 * - Never mutates original bill `totalAmount`.
 */
export function applyPaymentToBill(input: ApplyPaymentToBillInput): ApplyPaymentToBillResult {
  const referenceDate = input.referenceDate || '15-Oct-2026';
  const simulatedOutcome: SimulatedPaymentOutcome = input.simulatedOutcome || 'SUCCESS';
  const normBillNo = normalizeBillingIdentifier(input.bill.billNo);

  const priorReconciled = reconcileBillWithPayments(
    input.bill,
    input.existingPayments,
    referenceDate,
    {
      waivers: input.waivers,
      reversals: input.reversals,
    }
  );

  const maxPayableCeiling = Math.max(
    priorReconciled.outstandingBalance,
    priorReconciled.totalOutstandingWithCharges
  );

  // Guard against duplicate in-flight submission
  if (input.inFlightBillNos && input.inFlightBillNos.has(normBillNo)) {
    return {
      success: false,
      outcome: 'FAILED',
      reason: `A payment authorization for bill ${input.bill.billNo} is already in progress. Duplicate submission prevented.`,
      updatedBill: input.bill,
      reconciledBill: priorReconciled,
      paymentTransaction: null,
      previouslySettledAmount: priorReconciled.paidAmount,
      paidAmountApplied: 0,
      lateChargesSettledInPayment: 0,
      remainingBalance: priorReconciled.outstandingBalance,
      remainingTotalWithCharges: priorReconciled.totalOutstandingWithCharges,
      isFullyPaid: priorReconciled.isPaid,
      settlementClassification: 'NONE',
    };
  }

  if (priorReconciled.isPaid || maxPayableCeiling <= 0) {
    return {
      success: false,
      outcome: 'FAILED',
      reason: `Bill ${input.bill.billNo} is already fully paid (remaining balance ₹0). Duplicate payment prevented.`,
      updatedBill: {
        ...input.bill,
        status: 'Paid',
        paidAmount: priorReconciled.paidAmount,
        remainingBalance: 0,
        outstandingBalance: 0,
      },
      reconciledBill: priorReconciled,
      paymentTransaction: null,
      previouslySettledAmount: priorReconciled.paidAmount,
      paidAmountApplied: 0,
      lateChargesSettledInPayment: 0,
      remainingBalance: 0,
      remainingTotalWithCharges: 0,
      isFullyPaid: true,
      settlementClassification: 'NONE',
    };
  }

  const defaultFullTarget = input.includeLateCharges
    ? priorReconciled.totalOutstandingWithCharges
    : priorReconciled.outstandingBalance;

  const requestedAmount =
    input.amountToPay !== undefined
      ? Number(Number(input.amountToPay).toFixed(2))
      : defaultFullTarget;

  if (Number.isNaN(requestedAmount) || requestedAmount <= 0) {
    return {
      success: false,
      outcome: 'FAILED',
      reason: 'Payment amount must be greater than ₹0.',
      updatedBill: input.bill,
      reconciledBill: priorReconciled,
      paymentTransaction: null,
      previouslySettledAmount: priorReconciled.paidAmount,
      paidAmountApplied: 0,
      lateChargesSettledInPayment: 0,
      remainingBalance: priorReconciled.outstandingBalance,
      remainingTotalWithCharges: priorReconciled.totalOutstandingWithCharges,
      isFullyPaid: false,
      settlementClassification: 'NONE',
    };
  }

  if (requestedAmount > maxPayableCeiling) {
    return {
      success: false,
      outcome: 'FAILED',
      reason: `Payment amount ₹${requestedAmount} exceeds remaining payable balance ₹${maxPayableCeiling}.`,
      updatedBill: input.bill,
      reconciledBill: priorReconciled,
      paymentTransaction: null,
      previouslySettledAmount: priorReconciled.paidAmount,
      paidAmountApplied: 0,
      lateChargesSettledInPayment: 0,
      remainingBalance: priorReconciled.outstandingBalance,
      remainingTotalWithCharges: priorReconciled.totalOutstandingWithCharges,
      isFullyPaid: false,
      settlementClassification: 'NONE',
    };
  }

  const attemptIndex =
    (priorReconciled.appliedPayments?.length || 0) +
    (priorReconciled.unappliedPaymentAttempts?.length || 0) +
    1;
  const txId =
    input.txId ||
    `TXN-UG-${input.bill.billNo.replace(/[^A-Za-z0-9]/g, '').slice(-8)}-${attemptIndex}`;
  const bankRef =
    input.bankReference ||
    `UGVCL-DEMO-${input.bill.billNo.replace(/[^A-Za-z0-9]/g, '').slice(-6)}-${attemptIndex}`;
  const paymentDate = input.paymentDate || `${referenceDate} 14:30`;

  if (simulatedOutcome === 'FAILED') {
    const failedTx: PaymentTransaction = {
      txId,
      consumerNo: input.bill.consumerNo,
      billNo: input.bill.billNo,
      date: paymentDate,
      amount: requestedAmount,
      paymentMethod: input.paymentMethod,
      status: 'Failed',
      bankReference: bankRef,
      accountId: input.accountId || input.bill.accountId,
    };
    const updatedPayments = [failedTx, ...(input.existingPayments || [])];
    const postReconciled = reconcileBillWithPayments(
      input.bill,
      updatedPayments,
      referenceDate,
      {
        waivers: input.waivers,
        reversals: input.reversals,
      }
    );
    return {
      success: false,
      outcome: 'FAILED',
      reason:
        input.simulatedFailureReason ||
        `DEMO payment authorization declined for ${input.paymentMethod}. Bill balance remains unchanged at ₹${priorReconciled.outstandingBalance.toLocaleString('en-IN')}.`,
      updatedBill: input.bill,
      reconciledBill: postReconciled,
      paymentTransaction: failedTx,
      previouslySettledAmount: priorReconciled.paidAmount,
      paidAmountApplied: 0,
      lateChargesSettledInPayment: 0,
      remainingBalance: priorReconciled.outstandingBalance,
      remainingTotalWithCharges: priorReconciled.totalOutstandingWithCharges,
      isFullyPaid: false,
      settlementClassification: 'NONE',
    };
  }

  if (simulatedOutcome === 'PENDING') {
    const pendingTx: PaymentTransaction = {
      txId,
      consumerNo: input.bill.consumerNo,
      billNo: input.bill.billNo,
      date: paymentDate,
      amount: requestedAmount,
      paymentMethod: input.paymentMethod,
      status: 'Pending Verification',
      bankReference: bankRef,
      accountId: input.accountId || input.bill.accountId,
    };
    const updatedPayments = [pendingTx, ...(input.existingPayments || [])];
    const postReconciled = reconcileBillWithPayments(
      input.bill,
      updatedPayments,
      referenceDate,
      {
        waivers: input.waivers,
        reversals: input.reversals,
      }
    );
    return {
      success: false,
      outcome: 'PENDING',
      reason: `Payment of ₹${requestedAmount.toLocaleString('en-IN')} via ${input.paymentMethod} is awaiting settlement confirmation (Ref: ${txId}). Outstanding balance ₹${priorReconciled.outstandingBalance.toLocaleString('en-IN')} is unchanged until verified.`,
      updatedBill: input.bill,
      reconciledBill: postReconciled,
      paymentTransaction: pendingTx,
      previouslySettledAmount: priorReconciled.paidAmount,
      paidAmountApplied: 0,
      lateChargesSettledInPayment: 0,
      remainingBalance: priorReconciled.outstandingBalance,
      remainingTotalWithCharges: priorReconciled.totalOutstandingWithCharges,
      isFullyPaid: false,
      settlementClassification: 'NONE',
    };
  }

  const newTx: PaymentTransaction = {
    txId,
    consumerNo: input.bill.consumerNo,
    billNo: input.bill.billNo,
    date: paymentDate,
    amount: requestedAmount,
    paymentMethod: input.paymentMethod,
    status: 'Successful',
    bankReference: bankRef,
    accountId: input.accountId || input.bill.accountId,
  };

  const updatedPayments = [newTx, ...(input.existingPayments || [])];
  const principalApplied = Math.min(priorReconciled.outstandingBalance, requestedAmount);
  const lateChargesSettledInPayment = Math.max(
    0,
    Number((requestedAmount - principalApplied).toFixed(2))
  );
  const newPaidTotal = Number((priorReconciled.paidAmount + principalApplied).toFixed(2));
  const newRemaining = Math.max(0, Number((input.bill.totalAmount - newPaidTotal).toFixed(2)));
  const isFullyPaid = newRemaining === 0;

  const updatedBill: ElectricityBill = {
    ...input.bill,
    status: isFullyPaid ? 'Paid' : 'Partially Paid',
    paidDate: paymentDate.split(' ')[0],
    transactionRef: txId,
    paidAmount: newPaidTotal,
    remainingBalance: newRemaining,
    outstandingBalance: newRemaining,
  };

  const postReconciled = reconcileBillWithPayments(
    updatedBill,
    updatedPayments,
    referenceDate,
    {
      waivers: input.waivers,
      reversals: input.reversals,
      lateChargesSettled: lateChargesSettledInPayment,
    }
  );

  return {
    success: true,
    outcome: 'SUCCESS',
    reason: isFullyPaid
      ? `Full payment of ₹${requestedAmount} applied to bill ${input.bill.billNo}. Remaining balance is ₹0.`
      : `Partial payment of ₹${requestedAmount} applied to bill ${input.bill.billNo}. Remaining balance is ₹${newRemaining}.`,
    updatedBill,
    reconciledBill: postReconciled,
    paymentTransaction: newTx,
    previouslySettledAmount: priorReconciled.paidAmount,
    paidAmountApplied: requestedAmount,
    lateChargesSettledInPayment,
    remainingBalance: newRemaining,
    remainingTotalWithCharges: postReconciled.totalOutstandingWithCharges,
    isFullyPaid,
    settlementClassification: isFullyPaid ? 'FULL_SETTLEMENT' : 'PARTIAL_SETTLEMENT',
  };
}

// ============================================================================
// GENTLE, NON-SPAMMY PAYMENT REMINDER ENGINE (PART 6)
// ============================================================================

/**
 * Builds the canonical deterministic deduplication key for a billing reminder:
 * BILL-REMINDER:{billNo}:{reminderType}:{scheduledDate}
 */
export function buildBillingReminderDedupeKey(
  billNo: string,
  reminderType: BillingReminderType,
  scheduledDate: string
): string {
  const cleanBill = String(billNo || '').trim().toUpperCase();
  const cleanDate = String(scheduledDate || '').trim();
  return `BILL-REMINDER:${cleanBill}:${reminderType}:${cleanDate}`;
}

export interface LocalizedBillingReminderCopy {
  title: string;
  message: string;
  statusBadge: string;
}

/**
 * Generates polite, professional, non-threatening localized reminder copy in EN, GU, HI, MR.
 * Mentions only the remaining balance for partially paid bills.
 */
export function buildLocalizedBillingReminderCopy(params: {
  reminderType: BillingReminderType;
  billNo: string;
  consumerNo: string;
  billMonth: string;
  dueDate: string;
  outstandingBalance: number;
  totalAmount: number;
  isPartiallyPaid: boolean;
  paidAmount?: number;
  txId?: string;
  language?: Language;
}): LocalizedBillingReminderCopy {
  const {
    reminderType,
    billNo,
    consumerNo,
    billMonth,
    dueDate,
    outstandingBalance,
    isPartiallyPaid,
    paidAmount = 0,
    txId,
    language = 'en',
  } = params;

  const amtFormatted = `₹${outstandingBalance.toLocaleString('en-IN')}`;
  const paidFormatted = `₹${paidAmount.toLocaleString('en-IN')}`;

  if (language === 'gu') {
    switch (reminderType) {
      case 'BILL_GENERATED':
        return {
          title: `નવું વીજળી બિલ જનરેટ થયું (${billMonth})`,
          message: `જોડાણ ${consumerNo} માટે બિલ ${billNo} (${billMonth}) જારી કરવામાં આવ્યું છે. ચૂકવવાપાત્ર રકમ: ${amtFormatted}, નિયત તારીખ: ${dueDate}.`,
          statusBadge: 'બિલ જનરેટ',
        };
      case 'UPCOMING_DUE_5D':
        return {
          title: `સૌમ્ય રીમાઇન્ડર: બિલ ચૂકવણીની તારીખ નજીક છે (5 દિવસ બાકી)`,
          message: isPartiallyPaid
            ? `જોડાણ ${consumerNo} ના બિલ ${billNo} માટે બાકી રકમ ${amtFormatted} ની નિયત તારીખ ${dueDate} છે (5 દિવસ બાકી).`
            : `જોડાણ ${consumerNo} ના બિલ ${billNo} (${amtFormatted}) ની નિયત તારીખ ${dueDate} છે (5 દિવસ બાકી). સમયસર ચૂકવણી કરવા વિનંતી.`,
          statusBadge: '5 દિવસમાં નિયત',
        };
      case 'UPCOMING_DUE_1D':
        return {
          title: `સૌમ્ય રીમાઇન્ડર: બિલ ચૂકવણી આવતીકાલે નિયત છે`,
          message: isPartiallyPaid
            ? `જોડાણ ${consumerNo} ના બિલ ${billNo} ની બાકી રકમ ${amtFormatted} આવતીકાલે (${dueDate}) નિયત છે.`
            : `જોડાણ ${consumerNo} ના બિલ ${billNo} (${amtFormatted}) ની ચૂકવણી આવતીકાલે (${dueDate}) નિયત છે.`,
          statusBadge: 'આવતીકાલે નિયત',
        };
      case 'DUE_TODAY':
        return {
          title: `બિલ ચૂકવણી આજે નિયત છે (${dueDate})`,
          message: isPartiallyPaid
            ? `જોડાણ ${consumerNo} ના બિલ ${billNo} ની બાકી રકમ ${amtFormatted} આજે (${dueDate}) ચૂકવવાપાત્ર છે.`
            : `જોડાણ ${consumerNo} ના બિલ ${billNo} (${amtFormatted}) ની ચૂકવણી આજે (${dueDate}) નિયત છે.`,
          statusBadge: 'આજે નિયત',
        };
      case 'OVERDUE_NOTICE':
        return {
          title: `મુદત વીતી ગયેલ બિલ સૂચના — ${billNo}`,
          message: isPartiallyPaid
            ? `જોડાણ ${consumerNo} ના બિલ ${billNo} ની નિયત તારીખ ${dueDate} વીતી ગઈ છે. કૃપા કરીને બાકી રકમ ${amtFormatted} ની ચૂકવણી કરો.`
            : `જોડાણ ${consumerNo} ના બિલ ${billNo} (${amtFormatted}) ની નિયત તારીખ ${dueDate} વીતી ગઈ છે. કૃપા કરીને તમારી અનુકૂળતાએ ચૂકવણી પૂર્ણ કરો.`,
          statusBadge: 'મુદત વીતી ગઈ',
        };
      case 'PAYMENT_CONFIRMED':
        return {
          title:
            outstandingBalance === 0
              ? `બિલ ચૂકવણીની પુષ્ટિ — ${billNo}`
              : `આંશિક ચૂકવણી નોંધાઈ — ${billNo}`,
          message:
            outstandingBalance === 0
              ? `જોડાણ ${consumerNo} ના બિલ ${billNo} માટે ${paidFormatted} ની ચૂકવણી સફળતાપૂર્વક નોંધાઈ ગઈ છે${txId ? ` (સંદર્ભ: ${txId})` : ''}. બાકી રકમ: ₹0.`
              : `જોડાણ ${consumerNo} ના બિલ ${billNo} માટે ${paidFormatted} ની આંશિક ચૂકવણી નોંધાઈ છે. બાકી ચૂકવવાપાત્ર રકમ: ${amtFormatted}.`,
          statusBadge: outstandingBalance === 0 ? 'ચૂકવાઈ ગયું' : 'આંશિક ચૂકવેલ',
        };
    }
  }

  if (language === 'hi') {
    switch (reminderType) {
      case 'BILL_GENERATED':
        return {
          title: `नया बिजली बिल जनरेट हुआ (${billMonth})`,
          message: `कनेक्शन ${consumerNo} के लिए बिल ${billNo} (${billMonth}) जारी किया गया है। देय राशि: ${amtFormatted}, देय तिथि: ${dueDate}।`,
          statusBadge: 'बिल जारी',
        };
      case 'UPCOMING_DUE_5D':
        return {
          title: `विनम्र अनुस्मारक: बिल देय तिथि नजदीक है (5 दिन शेष)`,
          message: isPartiallyPaid
            ? `कनेक्शन ${consumerNo} के बिल ${billNo} की शेष देय राशि ${amtFormatted} की अंतिम तिथि ${dueDate} है (5 दिन शेष)।`
            : `कनेक्शन ${consumerNo} के बिल ${billNo} (${amtFormatted}) की देय तिथि ${dueDate} है (5 दिन शेष)।`,
          statusBadge: '5 दिन शेष',
        };
      case 'UPCOMING_DUE_1D':
        return {
          title: `विनम्र अनुस्मारक: बिल भुगतान कल देय है`,
          message: isPartiallyPaid
            ? `कनेक्शन ${consumerNo} के बिल ${billNo} की शेष देय राशि ${amtFormatted} कल (${dueDate}) देय है।`
            : `कनेक्शन ${consumerNo} के बिल ${billNo} (${amtFormatted}) का भुगतान कल (${dueDate}) देय है।`,
          statusBadge: 'कल देय',
        };
      case 'DUE_TODAY':
        return {
          title: `बिल भुगतान आज देय है (${dueDate})`,
          message: isPartiallyPaid
            ? `कनेक्शन ${consumerNo} के बिल ${billNo} की शेष देय राशि ${amtFormatted} आज (${dueDate}) देय है।`
            : `कनेक्शन ${consumerNo} के बिल ${billNo} (${amtFormatted}) का भुगतान आज (${dueDate}) देय है।`,
          statusBadge: 'आज देय',
        };
      case 'OVERDUE_NOTICE':
        return {
          title: `अतिदेय बिल सूचना — ${billNo}`,
          message: isPartiallyPaid
            ? `कनेक्शन ${consumerNo} के बिल ${billNo} की देय तिथि ${dueDate} बीत चुकी है। कृपया शेष राशि ${amtFormatted} का भुगतान करें।`
            : `कनेक्शन ${consumerNo} के बिल ${billNo} (${amtFormatted}) की देय तिथि ${dueDate} बीत चुकी है। कृपया सुविधाजनक समय पर भुगतान करें।`,
          statusBadge: 'अतिदेय',
        };
      case 'PAYMENT_CONFIRMED':
        return {
          title:
            outstandingBalance === 0
              ? `भुगतान की पुष्टि — ${billNo}`
              : `आंशिक भुगतान दर्ज — ${billNo}`,
          message:
            outstandingBalance === 0
              ? `कनेक्शन ${consumerNo} के बिल ${billNo} के लिए ${paidFormatted} का भुगतान सफलतापूर्वक दर्ज किया गया है${txId ? ` (संदर्भ: ${txId})` : ''}। शेष राशि: ₹0।`
              : `कनेक्शन ${consumerNo} के बिल ${billNo} के लिए ${paidFormatted} का आंशिक भुगतान दर्ज किया गया है। शेष देय राशि: ${amtFormatted}।`,
          statusBadge: outstandingBalance === 0 ? 'भुगतान पूर्ण' : 'आंशिक भुगतान',
        };
    }
  }

  if (language === 'mr') {
    switch (reminderType) {
      case 'BILL_GENERATED':
        return {
          title: `नवीन वीज बिल जनरेट झाले (${billMonth})`,
          message: `जोडणी ${consumerNo} साठी बिल ${billNo} (${billMonth}) जारी करण्यात आले आहे. देय रक्कम: ${amtFormatted}, देय तारीख: ${dueDate}.`,
          statusBadge: 'बिल जारी',
        };
      case 'UPCOMING_DUE_5D':
        return {
          title: `सौम्य आठवण: बिल देय तारीख जवळ आली आहे (5 दिवस बाकी)`,
          message: isPartiallyPaid
            ? `जोडणी ${consumerNo} च्या बिल ${billNo} ची शिल्लक देय रक्कम ${amtFormatted} दि. ${dueDate} रोजी देय आहे (5 दिवस बाकी).`
            : `जोडणी ${consumerNo} च्या बिल ${billNo} (${amtFormatted}) ची देय तारीख ${dueDate} आहे (5 दिवस बाकी).`,
          statusBadge: '5 दिवस बाकी',
        };
      case 'UPCOMING_DUE_1D':
        return {
          title: `सौम्य आठवण: बिल भरणा उद्या देय आहे`,
          message: isPartiallyPaid
            ? `जोडणी ${consumerNo} च्या बिल ${billNo} ची शिल्लक रक्कम ${amtFormatted} उद्या (${dueDate}) देय आहे.`
            : `जोडणी ${consumerNo} च्या बिल ${billNo} (${amtFormatted}) चा भरणा उद्या (${dueDate}) देय आहे.`,
          statusBadge: 'उद्या देय',
        };
      case 'DUE_TODAY':
        return {
          title: `बिल भरणा आज देय आहे (${dueDate})`,
          message: isPartiallyPaid
            ? `जोडणी ${consumerNo} च्या बिल ${billNo} ची शिल्लक देय रक्कम ${amtFormatted} आज (${dueDate}) देय आहे.`
            : `जोडणी ${consumerNo} च्या बिल ${billNo} (${amtFormatted}) चा भरणा आज (${dueDate}) देय आहे.`,
          statusBadge: 'आज देय',
        };
      case 'OVERDUE_NOTICE':
        return {
          title: `मुदतबाह्य बिल सूचना — ${billNo}`,
          message: isPartiallyPaid
            ? `जोडणी ${consumerNo} च्या बिल ${billNo} ची देय तारीख ${dueDate} उलटून गेली आहे. कृपया शिल्लक रक्कम ${amtFormatted} चा भरणा करा.`
            : `जोडणी ${consumerNo} च्या बिल ${billNo} (${amtFormatted}) ची देय तारीख ${dueDate} उलटून गेली आहे. कृपया लवकरात लवकर भरणा करा.`,
          statusBadge: 'मुदतबाह्य',
        };
      case 'PAYMENT_CONFIRMED':
        return {
          title:
            outstandingBalance === 0
              ? `पेमेंट पुष्टी — ${billNo}`
              : `अंशतः भरणा नोंदवला — ${billNo}`,
          message:
            outstandingBalance === 0
              ? `जोडणी ${consumerNo} च्या बिल ${billNo} साठी ${paidFormatted} चा भरणा यशस्वीरित्या नोंदवला गेला आहे${txId ? ` (संदर्भ: ${txId})` : ''}. शिल्लक देय: ₹0.`
              : `जोडणी ${consumerNo} च्या बिल ${billNo} साठी ${paidFormatted} चा अंशतः भरणा नोंदवला आहे. शिल्लक देय रक्कम: ${amtFormatted}.`,
          statusBadge: outstandingBalance === 0 ? 'भरलेले' : 'अंशतः भरलेले',
        };
    }
  }

  // Default English ('en')
  switch (reminderType) {
    case 'BILL_GENERATED':
      return {
        title: `New Electricity Bill Generated (${billMonth})`,
        message: `Bill ${billNo} for connection ${consumerNo} (${billMonth}) has been issued. Payable amount: ${amtFormatted}, Due date: ${dueDate}.`,
        statusBadge: 'Bill Issued',
      };
    case 'UPCOMING_DUE_5D':
      return {
        title: `Gentle Reminder: Bill Due in 5 Days (${dueDate})`,
        message: isPartiallyPaid
          ? `Your remaining balance of ${amtFormatted} for bill ${billNo} (connection ${consumerNo}) is due on ${dueDate} (5 days remaining).`
          : `Your electricity bill ${billNo} of ${amtFormatted} for connection ${consumerNo} is due on ${dueDate} (5 days remaining).`,
        statusBadge: 'Due in 5 Days',
      };
    case 'UPCOMING_DUE_1D':
      return {
        title: `Gentle Reminder: Bill Due Tomorrow (${dueDate})`,
        message: isPartiallyPaid
          ? `Your remaining balance of ${amtFormatted} for bill ${billNo} (connection ${consumerNo}) is due tomorrow (${dueDate}).`
          : `Your electricity bill ${billNo} of ${amtFormatted} for connection ${consumerNo} is due tomorrow (${dueDate}).`,
        statusBadge: 'Due Tomorrow',
      };
    case 'DUE_TODAY':
      return {
        title: `Gentle Reminder: Electricity Bill Due Today (${dueDate})`,
        message: isPartiallyPaid
          ? `Your remaining balance of ${amtFormatted} for bill ${billNo} (connection ${consumerNo}) is due today (${dueDate}).`
          : `Your electricity bill ${billNo} of ${amtFormatted} for connection ${consumerNo} is due today (${dueDate}).`,
        statusBadge: 'Due Today',
      };
    case 'OVERDUE_NOTICE':
      return {
        title: `Gentle Overdue Notice — Bill ${billNo}`,
        message: isPartiallyPaid
          ? `Bill ${billNo} for connection ${consumerNo} passed its due date (${dueDate}). Remaining balance payable: ${amtFormatted}.`
          : `Bill ${billNo} (${amtFormatted}) for connection ${consumerNo} passed its due date (${dueDate}). Please complete payment at your convenience.`,
        statusBadge: 'Overdue',
      };
    case 'PAYMENT_CONFIRMED':
      return {
        title:
          outstandingBalance === 0
            ? `Payment Confirmed — Bill ${billNo}`
            : `Partial Payment Recorded — Bill ${billNo}`,
        message:
          outstandingBalance === 0
            ? `Payment of ${paidFormatted} for bill ${billNo} (connection ${consumerNo}) is confirmed${txId ? ` (Ref: ${txId})` : ''}. Remaining balance: ₹0.`
            : `Partial payment of ${paidFormatted} recorded for bill ${billNo} (connection ${consumerNo}). Remaining balance due: ${amtFormatted}.`,
        statusBadge: outstandingBalance === 0 ? 'Paid' : 'Partially Paid',
      };
  }
}

export interface EvaluateGentleBillingRemindersInput {
  ownedConnections: ElectricityConnection[];
  bills: ElectricityBill[];
  payments: PaymentTransaction[];
  existingNotifications: AppNotification[];
  emittedReminderKeys?: string[];
  accountId?: string;
  referenceDate?: string;
  language?: Language;
  includeBillGeneratedNotice?: boolean;
}

export interface EvaluateGentleBillingRemindersResult {
  newNotifications: AppNotification[];
  newReminderKeys: string[];
  suppressedNotificationIds: string[];
  updatedEmittedReminderKeys: string[];
}

/**
 * Evaluates gentle, non-spammy in-app billing reminders for a consumer's connections.
 * - Strictly scoped to the owning consumer (targetRole: 'consumer', targetConsumerNo, accountId).
 * - Never sends reminders to Employees, Field Engineers, Management, or Admin.
 * - Uses deterministic deduplication key: BILL-REMINDER:{billNo}:{reminderType}:{scheduledDate}.
 * - Suppresses due/overdue reminders for any bill that is already Paid (outstandingBalance === 0).
 * - Mentions only the remaining balance for partially paid bills.
 */
export function evaluateGentleBillingReminders(
  input: EvaluateGentleBillingRemindersInput
): EvaluateGentleBillingRemindersResult {
  const referenceDate = input.referenceDate || '15-Oct-2026';
  const language = input.language || 'en';
  const existingKeys = new Set<string>(input.emittedReminderKeys || []);

  for (const n of input.existingNotifications || []) {
    if (n.eventKey && n.eventKey.startsWith('BILL-REMINDER:')) {
      existingKeys.add(n.eventKey);
    }
  }

  const newNotifications: AppNotification[] = [];
  const newReminderKeys: string[] = [];
  const suppressedNotificationIds: string[] = [];

  const paidBillNos = new Set<string>();

  for (const conn of input.ownedConnections || []) {
    const summary = selectConnectionBillingSummary(conn, input.bills, input.payments, {
      referenceDate,
    });

    for (const paidBill of summary.paidBills) {
      paidBillNos.add(normalizeBillingIdentifier(paidBill.billNo));
    }

    for (const dueBill of summary.dueBills) {
      if (dueBill.outstandingBalance <= 0 || dueBill.isPaid) {
        paidBillNos.add(normalizeBillingIdentifier(dueBill.billNo));
        continue;
      }

      const ownerAccountId = dueBill.accountId || conn.accountId || input.accountId;

      // Optional BILL_GENERATED informational notice
      if (input.includeBillGeneratedNotice) {
        const genKey = buildBillingReminderDedupeKey(
          dueBill.billNo,
          'BILL_GENERATED',
          dueBill.billDate
        );
        if (!existingKeys.has(genKey)) {
          existingKeys.add(genKey);
          newReminderKeys.push(genKey);
          const copy = buildLocalizedBillingReminderCopy({
            reminderType: 'BILL_GENERATED',
            billNo: dueBill.billNo,
            consumerNo: conn.consumerNo,
            billMonth: dueBill.billMonth,
            dueDate: dueBill.dueDate,
            outstandingBalance: dueBill.outstandingBalance,
            totalAmount: dueBill.totalAmount,
            isPartiallyPaid: dueBill.isPartiallyPaid,
            paidAmount: dueBill.paidAmount,
            language,
          });
          newNotifications.push({
            id: `NOTIF-${genKey}`,
            title: copy.title,
            message: copy.message,
            time: referenceDate,
            targetRole: 'consumer',
            type: 'info',
            read: false,
            category: 'Billing',
            actionUrl: 'consumer:bills',
            consumerNo: conn.consumerNo,
            targetConsumerNo: conn.consumerNo,
            accountId: ownerAccountId,
            targetConsumerAccountId: ownerAccountId,
            subdivision: conn.subdivision,
            relatedEntityType: 'bill',
            relatedEntityId: dueBill.billNo,
            notificationType: 'BILL_GENERATED',
            statusBadge: copy.statusBadge,
            eventKey: genKey,
          });
        }
      }

      // Evaluate due-date window
      const daysUntilDue = calculateDaysUntilDue(dueBill.dueDate, referenceDate);
      let dueReminderType: BillingReminderType | null = null;
      let scheduledDateForKey = referenceDate;

      if (daysUntilDue !== null) {
        if (daysUntilDue < 0 || dueBill.isOverdue) {
          dueReminderType = 'OVERDUE_NOTICE';
          // Keyed by dueDate so OVERDUE_NOTICE is emitted once after the bill becomes overdue
          scheduledDateForKey = dueBill.dueDate;
        } else if (daysUntilDue === 0) {
          dueReminderType = 'DUE_TODAY';
          scheduledDateForKey = dueBill.dueDate;
        } else if (daysUntilDue === 1) {
          dueReminderType = 'UPCOMING_DUE_1D';
          scheduledDateForKey = referenceDate;
        } else if (daysUntilDue > 1 && daysUntilDue <= 5) {
          dueReminderType = 'UPCOMING_DUE_5D';
          // Keyed by dueDate so the 5-day window emits at most 1 gentle upcoming reminder
          scheduledDateForKey = dueBill.dueDate;
        }
      } else if (dueBill.isOverdue) {
        dueReminderType = 'OVERDUE_NOTICE';
        scheduledDateForKey = dueBill.dueDate;
      }

      if (dueReminderType) {
        const dedupeKey = buildBillingReminderDedupeKey(
          dueBill.billNo,
          dueReminderType,
          scheduledDateForKey
        );

        if (!existingKeys.has(dedupeKey)) {
          existingKeys.add(dedupeKey);
          newReminderKeys.push(dedupeKey);

          const copy = buildLocalizedBillingReminderCopy({
            reminderType: dueReminderType,
            billNo: dueBill.billNo,
            consumerNo: conn.consumerNo,
            billMonth: dueBill.billMonth,
            dueDate: dueBill.dueDate,
            outstandingBalance: dueBill.outstandingBalance,
            totalAmount: dueBill.totalAmount,
            isPartiallyPaid: dueBill.isPartiallyPaid,
            paidAmount: dueBill.paidAmount,
            language,
          });

          newNotifications.push({
            id: `NOTIF-${dedupeKey}`,
            title: copy.title,
            message: copy.message,
            time: referenceDate,
            targetRole: 'consumer',
            type: dueReminderType === 'OVERDUE_NOTICE' ? 'warning' : 'info',
            read: false,
            category: 'Billing',
            actionUrl: 'consumer:bills',
            consumerNo: conn.consumerNo,
            targetConsumerNo: conn.consumerNo,
            accountId: ownerAccountId,
            targetConsumerAccountId: ownerAccountId,
            subdivision: conn.subdivision,
            relatedEntityType: 'bill',
            relatedEntityId: dueBill.billNo,
            notificationType: dueReminderType,
            statusBadge: copy.statusBadge,
            eventKey: dedupeKey,
          });
        }
      }
    }
  }

  // Suppress any existing unread due/overdue reminder notifications for bills that are now Paid
  for (const n of input.existingNotifications || []) {
    if (
      n.category === 'Billing' &&
      n.relatedEntityType === 'bill' &&
      n.relatedEntityId &&
      paidBillNos.has(normalizeBillingIdentifier(n.relatedEntityId)) &&
      n.notificationType !== 'PAYMENT_CONFIRMED'
    ) {
      suppressedNotificationIds.push(n.id);
    }
  }

  return {
    newNotifications,
    newReminderKeys,
    suppressedNotificationIds,
    updatedEmittedReminderKeys: Array.from(existingKeys),
  };
}

/**
 * Creates a deterministic, consumer-scoped PAYMENT_CONFIRMED notification upon full or partial settlement.
 */
export function createPaymentConfirmedNotification(params: {
  bill: ElectricityBill;
  payment: PaymentTransaction;
  remainingBalance: number;
  subdivision?: string;
  accountId?: string;
  language?: Language;
}): AppNotification {
  const { bill, payment, remainingBalance, subdivision, accountId, language = 'en' } = params;
  const dedupeKey = buildBillingReminderDedupeKey(
    bill.billNo,
    'PAYMENT_CONFIRMED',
    payment.txId || payment.date
  );
  const copy = buildLocalizedBillingReminderCopy({
    reminderType: 'PAYMENT_CONFIRMED',
    billNo: bill.billNo,
    consumerNo: bill.consumerNo,
    billMonth: bill.billMonth,
    dueDate: bill.dueDate,
    outstandingBalance: remainingBalance,
    totalAmount: bill.totalAmount,
    isPartiallyPaid: remainingBalance > 0,
    paidAmount: payment.amount,
    txId: payment.txId,
    language,
  });

  const resolvedAccountId = accountId || payment.accountId || bill.accountId;

  return {
    id: `NOTIF-${dedupeKey}`,
    title: copy.title,
    message: copy.message,
    time: payment.date || 'Just now',
    targetRole: 'consumer',
    type: 'success',
    read: false,
    category: 'Billing',
    actionUrl: 'consumer:bills',
    consumerNo: bill.consumerNo,
    targetConsumerNo: bill.consumerNo,
    accountId: resolvedAccountId,
    targetConsumerAccountId: resolvedAccountId,
    subdivision,
    relatedEntityType: 'bill',
    relatedEntityId: bill.billNo,
    notificationType: 'PAYMENT_CONFIRMED',
    statusBadge: copy.statusBadge,
    eventKey: dedupeKey,
  };
}
