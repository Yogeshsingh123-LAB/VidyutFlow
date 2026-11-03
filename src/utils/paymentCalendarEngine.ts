import { ElectricityBill, ElectricityConnection, PaymentTransaction, UserRole } from '../types';
import { Language } from '../i18n/types';
import {
  ReconciledElectricityBill,
  reconcileBillWithPayments,
  parseVidyutDateToUtcMs,
} from './billingEngine';
import {
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from './lateChargeEngine';
import {
  FormalNoticeRecord,
  FormalNoticeStatus,
  reconcileFormalNoticeWithStatement,
  deriveCanonical9FieldBillStatement,
} from './formalNoticeEngine';
import {
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_CORPORATE_IDENTITY,
} from '../components/common/UgvclBrandIdentity';

export type CalendarMilestoneType =
  | 'A_ORIGINAL_BILL_DUE_DATE'
  | 'B_LATE_CHARGE_ACCRUAL_DATE'
  | 'C_FORMAL_NOTICE_ISSUE_DATE'
  | 'D_FORMAL_NOTICE_PAYMENT_DEADLINE'
  | 'E_AUTHORIZED_DISCONNECTION_REVIEW';

export interface PaymentCalendarEvent {
  id: string; // e.g. CAL-EVT-BILL-UG-2026-10-8821
  billNo: string;
  consumerNo: string;
  connectionId: string;
  consumerName: string;
  subdivision: string;
  tariffCategory: string;
  billMonth: string;
  billDate: string;
  dueDate: string; // e.g. '22-Oct-2026'
  dueDateIso: string; // e.g. '2026-10-22'
  dueDay: number;
  dueMonth: number; // 0-11
  dueYear: number;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  // Step 4B Canonical 9-Field Financial Breakdown properties:
  remainingPrincipal: number;
  accruedLateCharges: number;
  waivedOrSettledCharges: number;
  totalOutstandingWithCharges: number;
  daysOverdue: number;
  dailyLateChargeAccrual: number;
  calculationReferenceDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
  isDue: boolean;
  isOverdue: boolean;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  isSimulatedDemoBill: boolean;
  billingCycleType?: 'MONTHLY' | 'BI_MONTHLY';
  periodStartDate?: string;
  periodEndDate?: string;
  billingPeriodLabel?: string;
  reminderStage?:
    | 'UPCOMING_DUE_5D'
    | 'UPCOMING_DUE_1D'
    | 'DUE_TODAY'
    | 'OVERDUE_DAY_1'
    | 'OVERDUE'
    | 'FORMAL_NOTICE_ACTIVE'
    | 'FORMAL_NOTICE_DEADLINE_APPROACHING'
    | 'FORMAL_NOTICE_DEADLINE_REACHED'
    | 'PAID';
  // Step 4B Formal Notice & Milestone Classification (A–E):
  milestoneType: CalendarMilestoneType;
  distinguishedMilestones: {
    originalBillPaymentDeadline: string;
    lateChargeAccrualStartDate: string;
    formalNoticeIssueDate: string | null;
    formalNoticePaymentDeadline: string | null;
    authorizedDisconnectionReviewStatus: string;
    includes: (milestone: CalendarMilestoneType) => boolean;
  };
  formalNoticeId?: string;
  formalNoticeStatus?: FormalNoticeStatus;
  formalNoticeIssueDate?: string;
  formalNoticeIssueDateIso?: string;
  formalNoticeServiceDate?: string;
  formalNoticePaymentDeadline?: string;
  formalNoticePaymentDeadlineIso?: string;
  formalNoticeDaysRemaining?: number | null;
  isFormalNoticeDeadlineExpired?: boolean;
  isFormalNoticeResolved?: boolean;
  disconnectionReviewStatus?: FormalNoticeRecord['disconnectionReviewStatus'];
}

export interface CalendarMonthDay {
  dateIso: string; // YYYY-MM-DD
  dayNumber: number;
  month: number; // 0-11
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: PaymentCalendarEvent[];
  noticeEvents?: PaymentCalendarEvent[];
  hasDueBills: boolean;
  hasPaidBills: boolean;
  hasOverdueBills: boolean;
  hasFormalNoticeMilestone?: boolean;
}

export interface PaymentCalendarSummary {
  totalBillsCount: number;
  dueBillsCount: number;
  paidBillsCount: number;
  totalDueAmount: number;
  totalPrincipalDueAmount: number;
  totalLateChargesAmount: number;
  totalDueAmountWithCharges: number;
  totalOutstandingWithChargesInr: number;
  totalPaidAmount: number;
  nextUpcomingDueDate: string | null;
  activeFormalNoticesCount: number;
  activeFormalNoticeCount: number;
  approachingNoticeDeadlinesCount: number;
  expiredNoticeDeadlinesCount: number;
  eventsByConnectionNo: Record<string, PaymentCalendarEvent[]>;
}

export interface CalendarLocalizationStrings {
  calendarTitle: string;
  calendarSubtitle: string;
  allConnectionsLabel: string;
  filterByConnectionLabel: string;
  filterStatusLabel: string;
  statusAll: string;
  statusDueOnly: string;
  statusPaidOnly: string;
  todayBtn: string;
  prevMonthAria: string;
  nextMonthAria: string;
  billsDueCountBadge: (count: number) => string;
  selectedDateDetailsTitle: string;
  noBillsOnDate: string;
  viewBillBtn: string;
  payNowBtn: string;
  addToGoogleCalendarBtn: string;
  downloadIcsBtn: string;
  dueLabel: string;
  paidLabel: string;
  partiallyPaidLabel: string;
  overdueLabel: string;
  nextDueCardLabel: string;
  totalOutstandingCardLabel: string;
  paidBillsCardLabel: string;
  demoCalendarNotice: string;
  weekdaysShort: [string, string, string, string, string, string, string];
  monthsFull: [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
}

export const CALENDAR_LOCALIZATION: Record<Language, CalendarLocalizationStrings> = {
  en: {
    calendarTitle: 'Smart Payment Calendar',
    calendarSubtitle: 'Automatic billing schedules, due date indicators & personal calendar sync',
    allConnectionsLabel: 'All Owned Connections',
    filterByConnectionLabel: 'Filter Connection',
    filterStatusLabel: 'Filter Status',
    statusAll: 'All Bills',
    statusDueOnly: 'Due & Outstanding Only',
    statusPaidOnly: 'Paid Only',
    todayBtn: 'Today',
    prevMonthAria: 'Previous Month',
    nextMonthAria: 'Next Month',
    billsDueCountBadge: (count: number) => `${count} ${count === 1 ? 'Bill Due' : 'Bills Due'}`,
    selectedDateDetailsTitle: 'Billing Schedule on',
    noBillsOnDate: 'No electricity bills due on this date.',
    viewBillBtn: 'View Bill',
    payNowBtn: 'Pay Now',
    addToGoogleCalendarBtn: 'Add to Google Calendar',
    downloadIcsBtn: 'Download .ics Event',
    dueLabel: 'Due',
    paidLabel: 'Paid',
    partiallyPaidLabel: 'Partially Paid',
    overdueLabel: 'Overdue',
    nextDueCardLabel: 'Next Upcoming Due Date',
    totalOutstandingCardLabel: 'Total Outstanding Payable',
    paidBillsCardLabel: 'Settled Bills (This Month)',
    demoCalendarNotice: 'DEMO Calendar: Event schedules automatically synchronize with UGVCL billing records in real time.',
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthsFull: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
  },
  gu: {
    calendarTitle: 'સ્માર્ટ પેમેન્ટ કેલેન્ડર',
    calendarSubtitle: 'આપોઆપ બિલિંગ શેડ્યૂલ, છેલ્લી તારીખ સૂચક અને કેલેન્ડર સિંક',
    allConnectionsLabel: 'બધા માલિકીના કનેક્શન્સ',
    filterByConnectionLabel: 'કનેક્શન ફિલ્ટર',
    filterStatusLabel: 'સ્થિતિ ફિલ્ટર',
    statusAll: 'બધા બિલ',
    statusDueOnly: 'ફક્ત બાકી બિલ',
    statusPaidOnly: 'ફક્ત ચૂકવેલા બિલ',
    todayBtn: 'આજે',
    prevMonthAria: 'ગત મહિનો',
    nextMonthAria: 'આગામી મહિનો',
    billsDueCountBadge: (count: number) => `${count} બિલ બાકી`,
    selectedDateDetailsTitle: 'આ તારીખનું બિલિંગ શેડ્યૂલ',
    noBillsOnDate: 'આ તારીખે કોઈ વીજળી બિલ બાકી નથી.',
    viewBillBtn: 'બિલ જુઓ',
    payNowBtn: 'હવે ચૂકવો',
    addToGoogleCalendarBtn: 'ગૂગલ કેલેન્ડરમાં ઉમેરો',
    downloadIcsBtn: '.ics ઇવેન્ટ ડાઉનલોડ કરો',
    dueLabel: 'બાકી',
    paidLabel: 'ચૂકવેલ',
    partiallyPaidLabel: 'અંશતઃ ચૂકવેલ',
    overdueLabel: 'મુદતવીતી',
    nextDueCardLabel: 'આગામી છેલ્લી તારીખ',
    totalOutstandingCardLabel: 'કુલ બાકી રકમ',
    paidBillsCardLabel: 'ચૂકવેલા બિલ (આ મહિને)',
    demoCalendarNotice: 'DEMO કેલેન્ડર: ઇવેન્ટ શેડ્યૂલ UGVCL બિલિંગ રેકોર્ડ્સ સાથે રીઅલ-ટાઇમમાં સિંક થાય છે.',
    weekdaysShort: ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'शुक्र', 'શનિ'],
    monthsFull: [
      'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
      'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
    ],
  },
  hi: {
    calendarTitle: 'स्मार्ट भुगतान कैलेंडर',
    calendarSubtitle: 'स्वचालित बिलिंग समय सारणी, देय तिथि संकेतक एवं व्यक्तिगत कैलेंडर सिंक',
    allConnectionsLabel: 'सभी स्वामित्व वाले कनेक्शन',
    filterByConnectionLabel: 'कनेक्शन फ़िल्टर',
    filterStatusLabel: 'स्थिति फ़िल्टर',
    statusAll: 'सभी बिल',
    statusDueOnly: 'केवल बकाया बिल',
    statusPaidOnly: 'केवल भुगतान किए गए बिल',
    todayBtn: 'आज',
    prevMonthAria: 'पिछला महीना',
    nextMonthAria: 'अगला महीना',
    billsDueCountBadge: (count: number) => `${count} बिल देय`,
    selectedDateDetailsTitle: 'इस तिथि का बिलिंग विवरण',
    noBillsOnDate: 'इस तिथि पर कोई विद्युत बिल देय नहीं है।',
    viewBillBtn: 'बिल देखें',
    payNowBtn: 'अभी भुगतान करें',
    addToGoogleCalendarBtn: 'Google कैलेंडर में जोड़ें',
    downloadIcsBtn: '.ics इवेंट डाउनलोड करें',
    dueLabel: 'देय',
    paidLabel: 'भुगतान पूर्ण',
    partiallyPaidLabel: 'आंशिक भुगतान',
    overdueLabel: 'अतिदेय (Overdue)',
    nextDueCardLabel: 'अगली आगामी देय तिथि',
    totalOutstandingCardLabel: 'कुल शेष देय राशि',
    paidBillsCardLabel: 'निपटाए गए बिल (इस माह)',
    demoCalendarNotice: 'DEMO कैलेंडर: बिलिंग कार्यक्रम UGVCL रिकॉर्ड के साथ वास्तविक समय में समन्वयित होता है।',
    weekdaysShort: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    monthsFull: [
      'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
      'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
    ],
  },
  mr: {
    calendarTitle: 'स्मार्ट पेमेंट कॅलेंडर',
    calendarSubtitle: 'स्वयंचलित बिलिंग वेळापत्रक, देय तारीख निर्देशक आणि कॅलेंडर सिंक',
    allConnectionsLabel: 'सर्व मालकीच्या जोडण्या',
    filterByConnectionLabel: 'जोडणी फिल्टर',
    filterStatusLabel: 'स्थिती फिल्टर',
    statusAll: 'सर्व बिले',
    statusDueOnly: 'फक्त थकीत बिले',
    statusPaidOnly: 'फक्त भरलेली बिले',
    todayBtn: 'आज',
    prevMonthAria: 'मागील महिना',
    nextMonthAria: 'पुढील महिना',
    billsDueCountBadge: (count: number) => `${count} बिले देय`,
    selectedDateDetailsTitle: 'या तारखेचे बिलिंग वेळापत्रक',
    noBillsOnDate: 'या तारखेला कोणतेही वीज बिल देय नाही.',
    viewBillBtn: 'बिल पहा',
    payNowBtn: 'आता भरा',
    addToGoogleCalendarBtn: 'Google कॅलेंडरमध्ये जोडा',
    downloadIcsBtn: '.ics इव्हेंट डाउनलोड करा',
    dueLabel: 'देय',
    paidLabel: 'भरलेले',
    partiallyPaidLabel: 'अंशतः भरलेले',
    overdueLabel: 'मुदतबाह्य',
    nextDueCardLabel: 'पुढील देय तारीख',
    totalOutstandingCardLabel: 'एकूण शिल्लक देय रक्कम',
    paidBillsCardLabel: 'भरलेली बिले (या महिन्यात)',
    demoCalendarNotice: 'DEMO कॅलेंडर: इव्हेंट वेळापत्रक UGVCL नोंदींशी रिअल-टाइममध्ये समक्रमित होते.',
    weekdaysShort: ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
    monthsFull: [
      'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
      'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
    ],
  },
};

/**
 * Parses any VidyutFlow date string ('22-Oct-2026', '2026-10-22') into ISO 'YYYY-MM-DD'
 * and decomposed year, month, day components deterministically.
 */
export function parseDateToYearMonthDay(dateStr: string | null | undefined): {
  year: number;
  month: number;
  day: number;
  isoDate: string;
} | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Format 1: ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, isoDate };
  }

  // Format 2: DD-MMM-YYYY (e.g. '22-Oct-2026')
  const ms = parseVidyutDateToUtcMs(trimmed);
  if (ms !== null) {
    const d = new Date(ms);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, isoDate };
  }

  return null;
}

/**
 * Derives canonical PaymentCalendarEvents from recorded electricity bills,
 * ensuring strict consumer authorization, Step 4A/4B canonical 9-field overdue breakdown,
 * and Formal Notice milestone classification (Milestones A–E).
 */
export function derivePaymentCalendarEvents(
  paramsOrBills:
    | {
        bills: ElectricityBill[];
        connections?: ElectricityConnection[];
        payments?: PaymentTransaction[];
        authorizedConsumerNos?: string[];
        referenceDate?: string;
        formalNotices?: FormalNoticeRecord[];
        waivers?: LateChargeWaiverRecord[];
        reversals?: PaymentReversalRecord[];
      }
    | ElectricityBill[],
  argConnections?: ElectricityConnection[],
  argPayments?: PaymentTransaction[],
  argAuthorizedConsumerNosOrRefDate?: string[] | string,
  argReferenceDateOrNotices?: string | FormalNoticeRecord[],
  argFormalNotices?: FormalNoticeRecord[]
): PaymentCalendarEvent[] {
  let bills: ElectricityBill[] = [];
  let connections: ElectricityConnection[] = [];
  let payments: PaymentTransaction[] = [];
  let authorizedConsumerNos: string[] | undefined;
  let referenceDate = '15-Oct-2026';
  let formalNotices: FormalNoticeRecord[] = [];
  let waivers: LateChargeWaiverRecord[] = [];
  let reversals: PaymentReversalRecord[] = [];

  if (Array.isArray(paramsOrBills)) {
    bills = paramsOrBills;
    connections = argConnections || [];
    payments = argPayments || [];
    if (typeof argAuthorizedConsumerNosOrRefDate === 'string') {
      referenceDate = argAuthorizedConsumerNosOrRefDate;
      if (Array.isArray(argReferenceDateOrNotices)) {
        formalNotices = argReferenceDateOrNotices;
      }
    } else {
      authorizedConsumerNos = argAuthorizedConsumerNosOrRefDate;
      if (typeof argReferenceDateOrNotices === 'string') {
        referenceDate = argReferenceDateOrNotices;
      }
      formalNotices = argFormalNotices || [];
    }
  } else if (paramsOrBills && typeof paramsOrBills === 'object') {
    bills = paramsOrBills.bills || [];
    connections = paramsOrBills.connections || [];
    payments = paramsOrBills.payments || [];
    authorizedConsumerNos = paramsOrBills.authorizedConsumerNos;
    referenceDate = paramsOrBills.referenceDate || '15-Oct-2026';
    formalNotices = paramsOrBills.formalNotices || [];
    waivers = paramsOrBills.waivers || [];
    reversals = paramsOrBills.reversals || [];
  }

  const allowedSet = authorizedConsumerNos
    ? new Set(authorizedConsumerNos.map((c) => c.trim().toUpperCase()))
    : null;

  const connMap = new Map<string, ElectricityConnection>();
  for (const c of connections) {
    connMap.set(c.consumerNo.toUpperCase(), c);
  }

  const noticeMap = new Map<string, FormalNoticeRecord>();
  for (const n of formalNotices) {
    noticeMap.set(n.billNo.trim().toUpperCase(), n);
  }

  const events: PaymentCalendarEvent[] = [];

  for (const bill of bills) {
    const normalizedConsumerNo = bill.consumerNo ? bill.consumerNo.trim().toUpperCase() : '';
    if (allowedSet && !allowedSet.has(normalizedConsumerNo)) {
      continue;
    }

    const conn = connMap.get(normalizedConsumerNo);
    const parsedDue = parseDateToYearMonthDay(bill.dueDate);
    if (!parsedDue) continue;

    const reconciled = reconcileBillWithPayments(bill, payments, referenceDate, {
      waivers,
      reversals,
    });
    const statement = deriveCanonical9FieldBillStatement(bill, payments, {
      referenceDate,
      connection: conn,
      waivers,
      reversals,
    });

    const rawNotice = noticeMap.get(bill.billNo.trim().toUpperCase());
    const reconciledNotice = rawNotice
      ? reconcileFormalNoticeWithStatement(rawNotice, statement, referenceDate)
      : undefined;

    const refMs = parseVidyutDateToUtcMs(referenceDate) ?? Date.parse(referenceDate);
    const dueMs = Date.UTC(parsedDue.year, parsedDue.month, parsedDue.day);
    const daysUntilDue = Math.round((dueMs - refMs) / (1000 * 60 * 60 * 24));

    let reminderStage: PaymentCalendarEvent['reminderStage'];
    if (reconciled.isPaid || statement.isFullySettled) {
      reminderStage = 'PAID';
    } else if (reconciled.isOverdue || daysUntilDue < 0) {
      reminderStage = 'OVERDUE';
    } else if (daysUntilDue === 0) {
      reminderStage = 'DUE_TODAY';
    } else if (daysUntilDue === 1) {
      reminderStage = 'UPCOMING_DUE_1D';
    } else if (daysUntilDue <= 5 && daysUntilDue > 1) {
      reminderStage = 'UPCOMING_DUE_5D';
    }

    // Determine primary milestone classification (A–E)
    const isIssuedNotice =
      reconciledNotice &&
      (reconciledNotice.status === 'ISSUED' ||
        reconciledNotice.status === 'SERVED' ||
        reconciledNotice.status === 'DEADLINE_APPROACHING' ||
        reconciledNotice.status === 'DEADLINE_REACHED' ||
        reconciledNotice.status === 'ON_HOLD');

    let milestoneType: CalendarMilestoneType = 'A_ORIGINAL_BILL_DUE_DATE';
    if (reconciledNotice?.status === 'DEADLINE_REACHED') {
      milestoneType = 'E_AUTHORIZED_DISCONNECTION_REVIEW';
    } else if (isIssuedNotice && reconciledNotice?.paymentDeadlineDate) {
      milestoneType = 'D_FORMAL_NOTICE_PAYMENT_DEADLINE';
    } else if (isIssuedNotice && reconciledNotice?.issueDate) {
      milestoneType = 'C_FORMAL_NOTICE_ISSUE_DATE';
    } else if (statement.daysOverdue > 0 && !statement.isFullySettled) {
      milestoneType = 'B_LATE_CHARGE_ACCRUAL_DATE';
    }

    const parsedNoticeIssue = isIssuedNotice && reconciledNotice?.issueDate
      ? parseDateToYearMonthDay(reconciledNotice.issueDate)
      : null;
    const parsedNoticeDeadline = isIssuedNotice && reconciledNotice?.paymentDeadlineDate
      ? parseDateToYearMonthDay(reconciledNotice.paymentDeadlineDate)
      : null;

    const activeMilestoneList: CalendarMilestoneType[] = ['A_ORIGINAL_BILL_DUE_DATE'];
    if (statement.daysOverdue > 0 && !statement.isFullySettled) {
      activeMilestoneList.push('B_LATE_CHARGE_ACCRUAL_DATE');
    }
    if (isIssuedNotice && reconciledNotice?.issueDate) {
      activeMilestoneList.push('C_FORMAL_NOTICE_ISSUE_DATE');
    }
    if (isIssuedNotice && reconciledNotice?.paymentDeadlineDate) {
      activeMilestoneList.push('D_FORMAL_NOTICE_PAYMENT_DEADLINE');
    }
    if (reconciledNotice?.status === 'DEADLINE_REACHED') {
      activeMilestoneList.push('E_AUTHORIZED_DISCONNECTION_REVIEW');
    }

    events.push({
      id: `CAL-EVT-${bill.billNo}`,
      billNo: bill.billNo,
      consumerNo: bill.consumerNo,
      connectionId: bill.connectionId || conn?.connectionId || bill.consumerNo,
      consumerName: conn?.consumerName || 'Registered UGVCL Consumer',
      subdivision: conn?.subdivision || 'Mehsana City North',
      tariffCategory: conn?.tariffCategory || 'Residential (RGPU)',
      billMonth: bill.billMonth,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      dueDateIso: parsedDue.isoDate,
      dueDay: parsedDue.day,
      dueMonth: parsedDue.month,
      dueYear: parsedDue.year,
      totalAmount: reconciled.totalAmount,
      paidAmount: reconciled.paidAmount,
      outstandingBalance: reconciled.outstandingBalance,
      // Canonical Step 4A/4B 9-Field properties:
      remainingPrincipal: statement.remainingPrincipal,
      accruedLateCharges: statement.accruedLatePaymentCharges,
      waivedOrSettledCharges: statement.chargesAlreadyPaidOrWaived,
      totalOutstandingWithCharges: statement.totalCurrentOutstanding,
      daysOverdue: statement.daysOverdue,
      dailyLateChargeAccrual: statement.dailyLateChargeAccrual,
      calculationReferenceDate: statement.lastCalculationDate,
      status: reconciled.effectiveStatus,
      isDue: reconciled.isDue,
      isOverdue: reconciled.isOverdue,
      isFullyPaid: reconciled.isPaid,
      isPartiallyPaid: reconciled.isPartiallyPaid,
      isSimulatedDemoBill: Boolean(bill.isSimulatedDemoBill),
      billingCycleType: reconciled.billingCycleType,
      periodStartDate: reconciled.periodStartDate,
      periodEndDate: reconciled.periodEndDate,
      billingPeriodLabel: reconciled.billingPeriodLabel,
      reminderStage,
      milestoneType,
      distinguishedMilestones: {
        originalBillPaymentDeadline: bill.dueDate,
        lateChargeAccrualStartDate: reconciled.lateChargeBreakdown.gracePeriodEndsOn,
        formalNoticeIssueDate: isIssuedNotice ? reconciledNotice?.issueDate || null : null,
        formalNoticePaymentDeadline: isIssuedNotice
          ? reconciledNotice?.paymentDeadlineDate || null
          : null,
        authorizedDisconnectionReviewStatus: reconciledNotice
          ? reconciledNotice.disconnectionReviewStatus
          : 'NOT_APPLICABLE',
        includes: (m: CalendarMilestoneType) => activeMilestoneList.includes(m),
      },
      formalNoticeId: reconciledNotice?.noticeId,
      formalNoticeStatus: reconciledNotice?.status,
      formalNoticeIssueDate: isIssuedNotice ? reconciledNotice?.issueDate : undefined,
      formalNoticeIssueDateIso: parsedNoticeIssue?.isoDate,
      formalNoticeServiceDate: isIssuedNotice ? reconciledNotice?.serviceDate : undefined,
      formalNoticePaymentDeadline: isIssuedNotice
        ? reconciledNotice?.paymentDeadlineDate
        : undefined,
      formalNoticePaymentDeadlineIso: parsedNoticeDeadline?.isoDate,
      formalNoticeDaysRemaining: reconciledNotice?.daysRemainingUntilDeadline ?? null,
      isFormalNoticeDeadlineExpired: Boolean(reconciledNotice?.isDeadlineReached),
      isFormalNoticeResolved:
        reconciledNotice?.status === 'RESOLVED' || reconciledNotice?.status === 'WITHDRAWN',
      disconnectionReviewStatus: reconciledNotice?.disconnectionReviewStatus,
    });
  }

  // Sort chronologically by due date, then by billNo
  events.sort((a, b) => {
    if (a.dueDateIso !== b.dueDateIso) {
      return a.dueDateIso.localeCompare(b.dueDateIso);
    }
    return a.billNo.localeCompare(b.billNo);
  });

  return events;
}

/**
 * Builds the month calendar matrix (35 or 42 cells)
 * populated with genuine billing due-date events and formal notice milestones.
 */
export function buildMonthCalendarGrid(
  paramsOrYear:
    | {
        year: number;
        month: number; // 0-11
        events: PaymentCalendarEvent[];
        todayIso?: string; // default '2026-10-15'
      }
    | number,
  argMonth?: number,
  argEvents?: PaymentCalendarEvent[],
  argTodayIso?: string
): CalendarMonthDay[] {
  let year = 2026;
  let month = 9;
  let events: PaymentCalendarEvent[] = [];
  let todayIso = '2026-10-15';

  if (typeof paramsOrYear === 'number') {
    year = paramsOrYear;
    month = argMonth ?? 9;
    events = argEvents || [];
    todayIso = argTodayIso || '2026-10-15';
  } else if (paramsOrYear && typeof paramsOrYear === 'object') {
    year = paramsOrYear.year;
    month = paramsOrYear.month;
    events = paramsOrYear.events || [];
    todayIso = paramsOrYear.todayIso || '2026-10-15';
  }

  // First day of target month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const startingDayOfWeek = firstDayOfMonth.getUTCDay();

  // Number of days in target month
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Number of days in preceding month
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Map events by ISO due date for O(1) lookup, and track formal notice issue/deadline dates
  const eventsByDate = new Map<string, PaymentCalendarEvent[]>();
  const noticeEventsByDate = new Map<string, PaymentCalendarEvent[]>();

  for (const ev of events) {
    const list = eventsByDate.get(ev.dueDateIso) || [];
    list.push(ev);
    eventsByDate.set(ev.dueDateIso, list);

    if (ev.formalNoticeIssueDateIso) {
      const nList = noticeEventsByDate.get(ev.formalNoticeIssueDateIso) || [];
      if (!nList.some((x) => x.billNo === ev.billNo)) nList.push(ev);
      noticeEventsByDate.set(ev.formalNoticeIssueDateIso, nList);
    }
    if (ev.formalNoticePaymentDeadlineIso) {
      const nList = noticeEventsByDate.get(ev.formalNoticePaymentDeadlineIso) || [];
      if (!nList.some((x) => x.billNo === ev.billNo)) nList.push(ev);
      noticeEventsByDate.set(ev.formalNoticePaymentDeadlineIso, nList);
    }
  }

  const cells: CalendarMonthDay[] = [];

  const createCell = (
    dateIso: string,
    dayNumber: number,
    cellMonth: number,
    cellYear: number,
    isCurrentMonth: boolean
  ): CalendarMonthDay => {
    const dayEvents = eventsByDate.get(dateIso) || [];
    const dayNoticeEvents = noticeEventsByDate.get(dateIso) || [];
    const combinedEvents =
      dayEvents.length > 0
        ? dayEvents
        : dayNoticeEvents.filter(ne => ne.formalNoticePaymentDeadlineIso === dateIso);
    return {
      dateIso,
      dayNumber,
      month: cellMonth,
      year: cellYear,
      isCurrentMonth,
      isToday: dateIso === todayIso,
      events: combinedEvents,
      noticeEvents: dayNoticeEvents,
      hasDueBills: dayEvents.some((e) => e.isDue),
      hasPaidBills: dayEvents.some((e) => e.isFullyPaid),
      hasOverdueBills: dayEvents.some((e) => e.isOverdue),
      hasFormalNoticeMilestone: dayNoticeEvents.length > 0,
    };
  };

  // 1. Preceding month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateIso = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(createCell(dateIso, day, prevMonthIdx, prevYear, false));
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(createCell(dateIso, day, month, year, true));
  }

  // 3. Succeeding month padding days to complete standard 35 or 42 grid cells
  const remainingCells = (7 - (cells.length % 7)) % 7;
  const targetTotal = cells.length + remainingCells < 35 ? 35 : cells.length + remainingCells;
  const paddingNeeded = targetTotal - cells.length;

  for (let day = 1; day <= paddingNeeded; day++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateIso = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push(createCell(dateIso, day, nextMonthIdx, nextYear, false));
  }

  return cells;
}

/**
 * Summarizes payment calendar metrics for a filtered set of events.
 */
export function computeCalendarSummary(events: PaymentCalendarEvent[]): PaymentCalendarSummary {
  let dueBillsCount = 0;
  let paidBillsCount = 0;
  let totalPrincipalDueAmount = 0;
  let totalLateChargesAmount = 0;
  let totalDueAmountWithCharges = 0;
  let totalPaidAmount = 0;
  let nextUpcomingDueDate: string | null = null;
  let activeFormalNoticesCount = 0;
  let approachingNoticeDeadlinesCount = 0;
  let expiredNoticeDeadlinesCount = 0;
  const eventsByConnectionNo: Record<string, PaymentCalendarEvent[]> = {};

  for (const ev of events) {
    if (!eventsByConnectionNo[ev.consumerNo]) {
      eventsByConnectionNo[ev.consumerNo] = [];
    }
    eventsByConnectionNo[ev.consumerNo].push(ev);

    if (ev.isDue) {
      dueBillsCount += 1;
      totalPrincipalDueAmount += ev.outstandingBalance;
      totalLateChargesAmount += ev.accruedLateCharges || 0;
      totalDueAmountWithCharges += ev.totalOutstandingWithCharges ?? ev.outstandingBalance;
      if (!nextUpcomingDueDate || ev.dueDateIso < nextUpcomingDueDate) {
        nextUpcomingDueDate = ev.dueDate;
      }
    }

    if (
      ev.formalNoticeId &&
      ev.formalNoticeStatus &&
      ev.formalNoticeStatus !== 'RESOLVED' &&
      ev.formalNoticeStatus !== 'WITHDRAWN' &&
      ev.formalNoticeStatus !== 'NOT_REQUIRED'
    ) {
      activeFormalNoticesCount += 1;
      if (ev.formalNoticeStatus === 'DEADLINE_APPROACHING') {
        approachingNoticeDeadlinesCount += 1;
      } else if (ev.formalNoticeStatus === 'DEADLINE_REACHED') {
        expiredNoticeDeadlinesCount += 1;
      }
    }

    if (ev.isFullyPaid) {
      paidBillsCount += 1;
      totalPaidAmount += ev.totalAmount;
    } else if (ev.isPartiallyPaid) {
      totalPaidAmount += ev.paidAmount;
    }
  }

  totalPrincipalDueAmount = Number(totalPrincipalDueAmount.toFixed(2));
  totalLateChargesAmount = Number(totalLateChargesAmount.toFixed(2));
  totalDueAmountWithCharges = Number(totalDueAmountWithCharges.toFixed(2));

  return {
    totalBillsCount: events.length,
    dueBillsCount,
    paidBillsCount,
    totalDueAmount: totalDueAmountWithCharges,
    totalPrincipalDueAmount,
    totalLateChargesAmount,
    totalDueAmountWithCharges,
    totalOutstandingWithChargesInr: totalDueAmountWithCharges,
    totalPaidAmount,
    nextUpcomingDueDate,
    activeFormalNoticesCount,
    activeFormalNoticeCount: activeFormalNoticesCount,
    approachingNoticeDeadlinesCount,
    expiredNoticeDeadlinesCount,
    eventsByConnectionNo,
  };
}

/**
 * Builds a valid Google Calendar Web URL for manual template creation.
 * Includes the 9-field overdue breakdown and Formal Notice milestone if issued.
 * Never claims an official physical disconnection date.
 */
export function buildGoogleCalendarUrl(
  event: PaymentCalendarEvent,
  language: Language = 'en'
): string {
  const parsed = parseDateToYearMonthDay(event.dueDate);
  const compactDate = parsed
    ? `${parsed.year}${String(parsed.month + 1).padStart(2, '0')}${String(parsed.day).padStart(2, '0')}`
    : '20261022';

  // Set 09:00 to 18:00 local time
  const startStamp = `${compactDate}T090000`;
  const endStamp = `${compactDate}T180000`;

  const cycleLabel =
    event.billingCycleType === 'BI_MONTHLY'
      ? `Billing Cycle: Bi-Monthly (${event.billingPeriodLabel || event.billMonth})`
      : `Billing Cycle: Monthly (${event.billMonth})`;

  const effectiveTotalPayable = event.totalOutstandingWithCharges ?? event.outstandingBalance;
  const title = `UGVCL Electricity Bill Due: ${event.billNo} (₹${effectiveTotalPayable.toLocaleString('en-IN')})`;
  const detailLines = [
    `Uttar Gujarat Vij Company Limited (UGVCL)`,
    `Bill Number: ${event.billNo}`,
    `Consumer Number: ${event.consumerNo}`,
    `Consumer Name: ${event.consumerName}`,
    cycleLabel,
    `Original Bill Amount: ₹${event.totalAmount.toLocaleString('en-IN')}`,
    `Payments Settled: ₹${event.paidAmount.toLocaleString('en-IN')}`,
    `Remaining Principal: ₹${(event.remainingPrincipal ?? event.outstandingBalance).toLocaleString('en-IN')}`,
    `Accrued Late Charges (DPS): ₹${(event.accruedLateCharges ?? 0).toFixed(2)}`,
    `Total Current Outstanding: ₹${effectiveTotalPayable.toLocaleString('en-IN')}`,
    `Payment Status: ${event.status} (${event.daysOverdue || 0} days overdue)`,
    `Original Due Date: ${event.dueDate}`,
  ];

  if (event.formalNoticeId && event.formalNoticePaymentDeadline) {
    detailLines.push(
      `DEMO Section 56 Formal Notice: ${event.formalNoticeId} (Issued: ${event.formalNoticeIssueDate || 'N/A'}, 15-Day Payment Deadline: ${event.formalNoticePaymentDeadline})`
    );
    detailLines.push(
      `Notice Safeguard: Simulated DEMO milestone — expiry triggers Authorized Review only (never automatic physical disconnection).`
    );
  }

  detailLines.push(
    `Sub-Division Office: ${event.subdivision}`,
    `Official UGVCL Portal: https://www.ugvcl.com`,
    `* VidyutFlow 2.0 Demonstration ERP Platform Notification`
  );

  const details = detailLines.join('\n');
  const location = `UGVCL ${event.subdivision} Sub-Division Office, North Gujarat`;

  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStamp}/${endStamp}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

/**
 * Escapes special characters for RFC 5545 iCalendar content lines:
 * backslash, semicolon, comma, and newline.
 */
export function escapeIcsText(str: string): string {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds iCalendar lines according to RFC 5545 (max 75 octets per line).
 */
export function foldIcsLine(line: string): string {
  const MAX_LEN = 72;
  if (line.length <= MAX_LEN) return line;

  let result = '';
  let remaining = line;
  let isFirst = true;

  while (remaining.length > 0) {
    if (isFirst) {
      result += remaining.slice(0, MAX_LEN);
      remaining = remaining.slice(MAX_LEN);
      isFirst = false;
    } else {
      result += '\r\n ' + remaining.slice(0, MAX_LEN - 1);
      remaining = remaining.slice(MAX_LEN - 1);
    }
  }

  return result;
}

/**
 * Generates an RFC 5545 compliant `.ics` calendar file content string
 * for an electricity bill due date or formal notice milestone event.
 */
export function generateIcsCalendarEvent(
  event: PaymentCalendarEvent,
  language: Language = 'en'
): string {
  const parsed = parseDateToYearMonthDay(event.dueDate);
  const compactDate = parsed
    ? `${parsed.year}${String(parsed.month + 1).padStart(2, '0')}${String(parsed.day).padStart(2, '0')}`
    : '20261022';

  // Next day for full-day event boundary
  const nextDayDate = parsed
    ? new Date(Date.UTC(parsed.year, parsed.month, parsed.day + 1))
    : new Date(Date.UTC(2026, 9, 23));
  const compactNextDay = `${nextDayDate.getUTCFullYear()}${String(nextDayDate.getUTCMonth() + 1).padStart(2, '0')}${String(nextDayDate.getUTCDate()).padStart(2, '0')}`;

  const cycleLabel =
    event.billingCycleType === 'BI_MONTHLY'
      ? `Billing Cycle: Bi-Monthly (${event.billingPeriodLabel || event.billMonth})`
      : `Billing Cycle: Monthly (${event.billMonth})`;

  const effectiveTotalPayable = event.totalOutstandingWithCharges ?? event.outstandingBalance;
  const summary = `UGVCL Electricity Bill Due: ${event.billNo} (INR ${effectiveTotalPayable})`;
  const descriptionLines = [
    `Uttar Gujarat Vij Company Limited (UGVCL)`,
    `Bill Number: ${event.billNo}`,
    `Consumer Number: ${event.consumerNo}`,
    `Consumer Name: ${event.consumerName}`,
    cycleLabel,
    `Total Bill: INR ${event.totalAmount}`,
    `Previously Paid: INR ${event.paidAmount}`,
    `Remaining Principal: INR ${event.remainingPrincipal ?? event.outstandingBalance}`,
    `Accrued Late Charges (DPS): INR ${(event.accruedLateCharges ?? 0).toFixed(2)}`,
    `Total Current Outstanding: INR ${effectiveTotalPayable}`,
    `Days Overdue: ${event.daysOverdue ?? 0}`,
    `Status: ${event.status}`,
    `Due Date: ${event.dueDate}`,
    `Milestone Classification: ${event.milestoneType}`,
  ];

  if (event.formalNoticeId && event.formalNoticePaymentDeadline) {
    descriptionLines.push(
      `DEMO Formal Notice ID: ${event.formalNoticeId} (Issued: ${event.formalNoticeIssueDate || 'N/A'}, 15-Day Payment Deadline: ${event.formalNoticePaymentDeadline})`
    );
    descriptionLines.push(
      `Statutory Safeguard: DEMO notice only — simulated Section 56 workflow (no automatic physical disconnection).`
    );
  }

  descriptionLines.push(
    `Sub-Division: ${event.subdivision}`,
    `Official UGVCL Portal: https://www.ugvcl.com`,
    `CIN: ${UGVCL_CORPORATE_IDENTITY.cin}`
  );

  const description = descriptionLines.join('\n');
  const location = `UGVCL ${event.subdivision} Sub-Division Office, North Gujarat`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VidyutFlow//UGVCL Smart Utility Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:BILL-DUE-${event.billNo}-${compactDate}@vidyutflow.ugvcl.demo`,
    'DTSTAMP:20261101T000000Z',
    `DTSTART;VALUE=DATE:${compactDate}`,
    `DTEND;VALUE=DATE:${compactNextDay}`,
    foldIcsLine(`SUMMARY:${escapeIcsText(summary)}`),
    foldIcsLine(`DESCRIPTION:${escapeIcsText(description)}`),
    foldIcsLine(`LOCATION:${escapeIcsText(location)}`),
    ...(event.formalNoticeId
      ? [
          `X-UGVCL-FORMAL-NOTICE-ID:${event.formalNoticeId}`,
          `X-UGVCL-FORMAL-NOTICE-DEADLINE:${event.formalNoticePaymentDeadline || ''}`,
          'X-UGVCL-FORMAL-NOTICE-DISCLOSURE:DEMO notice only - simulated Section 56 workflow',
        ]
      : []),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'CLASS:PUBLIC',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:UGVCL Electricity Bill Due Tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n') + '\r\n';
}

/**
 * Triggers genuine `.ics` calendar event download in the browser.
 */
export function triggerIcsDownload(
  event: PaymentCalendarEvent,
  languageOrOptions: Language | { skipBrowserDownload?: boolean } = 'en',
  options?: { skipBrowserDownload?: boolean }
): { downloaded: boolean; filename: string; icsContent: string; byteLength: number; mimeType: string } {
  const language: Language = typeof languageOrOptions === 'string' ? languageOrOptions : 'en';
  const effectiveOptions = typeof languageOrOptions === 'object' && languageOrOptions !== null ? languageOrOptions : options;
  const safeBillRef = event.billNo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const filename = `ugvcl-bill-due-${safeBillRef}.ics`;
  const icsContent = generateIcsCalendarEvent(event, language);

  if (!effectiveOptions?.skipBrowserDownload && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }, 2500);
    } catch {
      // Fallback
    }
  }

  return {
    downloaded: true,
    filename,
    icsContent,
    byteLength: new TextEncoder().encode(icsContent).byteLength,
    mimeType: 'text/calendar;charset=utf-8',
  };
}
