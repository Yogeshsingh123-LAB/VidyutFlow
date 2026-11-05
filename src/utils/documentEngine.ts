import {
  UserRole,
  ElectricityBill,
  PaymentTransaction,
  NewConnectionApplication,
  ComplaintRecord,
  WorkOrder,
  ElectricityConnection,
} from '../types';
import { Language } from '../i18n/types';
import {
  ExportActorIdentity,
  ExportDataSourceClassification,
  normalizeExportDataSource,
  isRecordOwnedByConsumer,
  isEmployeeAuthorizedForExportSubdivision,
  isWorkOrderAssignedToFieldEngineer,
  stripForbiddenFieldsFromRecord,
} from './exportEngine';
import { FONT_STACKS, getLanguageTypographyProfile } from './typographyTokens';
import {
  localizeSubdivision,
  localizeTariffCategory,
  localizePhase,
  localizeConsumerAddress,
  localizeBillMonth,
  localizeBillingCycleType,
  localizeBillingCycleShortBadge,
  localizeMeterReadingProvenance,
  localizeFeederName,
  localizeBillStatus,
  localizePaymentMethod,
  localizePaymentStatus,
  localizeApplicationStatus,
  localizeComplaintCategory,
  localizeComplaintStatus,
  localizeComplaintDescription,
  localizeComplaintResolution,
  localizeDocumentName,
} from '../i18n/consumerContentTranslations';
import {
  localizeWorkOrderType,
  localizeWorkOrderStatus,
  localizeWorkOrderTitle,
  localizeWorkOrderScheduledDate,
  localizeAssignedActorName,
} from '../i18n/employeeContentTranslations';
import {
  localizeSealStatus,
  localizeTerminalCondition,
  localizeFieldTechnicianRemarks,
} from '../i18n/fieldContentTranslations';
import {
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_CORPORATE_IDENTITY,
} from '../components/common/UgvclBrandIdentity';
import {
  reconcileBillWithPayments,
  computeTransactionSettlementBreakdown,
  resolveBillCycleMetadata,
  buildBiMonthlyBillingPeriod,
  parseBillMonthToPeriodDescriptor,
  isBillScheduledNotIssued,
  parseVidyutDateToUtcMs,
} from './billingEngine';
import { CONSUMPTION_HISTORY } from '../data/mockData';
import {
  deriveCanonicalBarcodeReference,
  generateCode128Svg,
} from './barcodeEngine';
import {
  deriveCanonicalQrVerificationUrl,
  generateQrCodeSvg,
} from './qrCodeEngine';
import {
  deriveCanonical9FieldBillStatement,
  FormalNoticeRecord,
  reconcileFormalNoticeWithStatement,
  getFormalNoticeTranslations,
} from './formalNoticeEngine';
import {
  LateChargeWaiverRecord,
  PaymentReversalRecord,
} from './lateChargeEngine';
import {
  PdfDocumentTable,
  PdfTableColumn,
  PdfSummaryMetric,
  PdfPagePlan,
  GeneratedPdfInspectionMetadata,
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  paginateOfficialDocumentForA4,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  triggerOfficialDocumentPdfDownload,
} from './pdfDocumentBuilder';

export type {
  PdfDocumentTable,
  PdfTableColumn,
  PdfSummaryMetric,
  PdfPagePlan,
  GeneratedPdfInspectionMetadata,
};
export {
  A4_WIDTH_PT,
  A4_HEIGHT_PT,
  paginateOfficialDocumentForA4,
  generateOfficialDocumentPdfBytes,
  inspectGeneratedPdfBytes,
  triggerOfficialDocumentPdfDownload,
};

export type OfficialDocumentType =
  | 'electricity_bill'
  | 'payment_receipt'
  | 'account_statement'
  | 'application_acknowledgment'
  | 'complaint_acknowledgment'
  | 'service_request_acknowledgment'
  | 'inspection_summary';

export type DocumentDisplayMode =
  | 'official_document'
  | 'payment_summary'
  | 'unavailable'
  | 'unauthorized';

export type ApplicationLifecycleClassification =
  | 'SUBMITTED_PENDING_REVIEW'
  | 'UNDER_TECHNICAL_REVIEW'
  | 'SANCTIONED_OR_APPROVED'
  | 'ENERGIZED_METER_INSTALLED'
  | 'REJECTED';

export interface DocumentFieldItem {
  key: string;
  label: string;
  value: string;
  isMono?: boolean;
  highlight?: 'default' | 'emerald' | 'blue' | 'amber' | 'rose';
}

export type DocumentField = DocumentFieldItem;

export interface DocumentSection {
  id: string;
  title: string;
  fields: DocumentFieldItem[];
}

export interface BiMonthlyChartPeriodEntry {
  periodIndex: number;
  periodKey: string;
  canonicalPeriodMonth: string;
  startYearMonth: string;
  endYearMonth: string;
  canonicalLabel: string;
  localizedLabel: string;
  periodRangeLabel: string;
  shortLocalizedLabel: string;
  shortLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  hasActualData: boolean;
  dataStatus: 'COMPLETE_BIMONTHLY' | 'PARTIAL_SINGLE_MONTH' | 'MISSING_HISTORY';
  source:
    | 'CURRENT_BILL'
    | 'HISTORICAL_BI_MONTHLY_BILL'
    | 'COMBINED_MONTHLY_BILLS'
    | 'CONSUMPTION_HISTORY_FALLBACK'
    | 'MISSING_DATA';
  actualUnitsKwh: number | null;
  comparisonUnitsKwh: number;
  sourceBillNos: string[];
  isCurrentBillPeriod: boolean;
  isCurrentPeriod: boolean;
  missingDataNote?: string;
}

export interface SixBiMonthlyPeriodComparisonChart {
  chartTitle: string;
  chartSubtitle: string;
  unitLabel: 'kWh';
  seriesALabel: string;
  seriesBLabel: string;
  bar1LegendLabel: string;
  bar2LegendLabel: string;
  missingDataLegendLabel: string;
  missingDataNote: string;
  maxScaleKwh: number;
  maxScaleUnitsKwh: number;
  currentPeriodUnitsKwh: number;
  recordedPeriodsCount: number;
  missingPeriodsCount: number;
  averageRecordedBiMonthlyKwh: number;
  averageAvailableUnitsKwh: number;
  benchmarkUnitsKwh: number;
  periods: BiMonthlyChartPeriodEntry[];
}

export interface UgvclBillParticulars {
  circle: string;
  division: string;
  subdivision: string;
  sdoCode: string;
  gstin: string;
  cin: string;
  helpline: string;
  email: string;
  website: string;
  registeredOffice: string;
  consumerName: string;
  premisesAddress: string;
  villageTalukaDistrict: string;
  consumerNo: string;
  connectionId: string;
  meterNo: string;
  phase: string;
  sanctionedLoadKw: number;
  tariffCategory: string;
  tariffCode: string;
  connectedDate: string;
  securityDeposit: number;
  feederName: string;
  feederCode: string;
  poleNo: string;
  censusCode: string;
  rootCode: string;
  billNo: string;
  billMonth: string;
  canonicalBillMonth: string;
  billingCycleType: 'MONTHLY' | 'BI_MONTHLY';
  billingCycleLabel: string;
  billingCycleShortBadge: string;
  periodStartDate: string;
  periodEndDate: string;
  billingPeriodLabel: string;
  billDate: string;
  dueDate: string;
  billStatus: string;
  canonicalBillStatus: string;
  previousReadingKwh: number;
  currentReadingKwh: number;
  readingDifference: number;
  meterMultiplier: number;
  billedUnits: number;
  previousReadingDate: string;
  currentReadingDate: string;
  readingDates: string;
  readingClassification: 'Recorded' | 'Simulated';
  readingProvenance: string;
  readingProvenanceLabel: string;
  readingIntegrityWarning?: string;
  tariffCyclePolicyMode: string;
  tariffConfigVersion: string;
  billedDaysCount: number;
  standardCycleDaysCount: number;
  isPartialPeriod: boolean;
  energyCharges: number;
  fixedCharges: number;
  fuelPriceAdjustment: number;
  electricityDuty: number;
  meterRent: number;
  otherCharges: number;
  subtotalCurrentCharges: number;
  rebateOrSubsidy: number;
  arrears: number;
  totalBillAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  remainingPrincipal: number;
  accruedLateCharges: number;
  waivedOrSettledLateCharges: number;
  currentTotalOutstanding: number;
  daysOverdue: number;
  paidDate?: string;
  calculationReferenceDate: string;
  calculationTimestampIst: string;
  calculationAsOfLabel: string;
  slabBreakdown: Array<{
    slab: string;
    units: number;
    rate: number;
    amount: number;
  }>;
  slabArithmeticReconciled: boolean;
  slabIntegrityWarning?: string;
  previousPeriods: Array<{
    month: string;
    units: number;
    billAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
  }>;
  sixPeriodComparisonChart: SixBiMonthlyPeriodComparisonChart;
  barcodeRef: string;
  barcodeSvg: string;
  qrUrl: string;
  qrSvg: string;
}

export interface GeneratedOfficialDocument {
  documentType: OfficialDocumentType;
  displayMode: DocumentDisplayMode;
  eligible: boolean;
  authorized: boolean;
  referenceId: string;
  filename: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
  statusBannerNote: string;
  lifecycleClassification?: ApplicationLifecycleClassification;
  settlementClassification?: 'FULL_SETTLEMENT' | 'PARTIAL_SETTLEMENT';
  settlement11Fields?: any;
  reconciliationVerified?: boolean;
  recordedTimestamp: string;
  generatedAtDisplay: string;
  dataSource: ExportDataSourceClassification;
  dataSourceBadge: string;
  demoDisclosureBanner: string;
  footerNote: string;
  language: Language;
  fontFamilyCss: string;
  isIndic: boolean;
  sections: DocumentSection[];
  reverseSideSections?: DocumentSection[];
  tables?: PdfDocumentTable[];
  summaryMetrics?: PdfSummaryMetric[];
  integrityWarnings?: string[];
  nextSteps?: string[];
  nextStepsTitle?: string;
  ineligibleReason?: string;
  barcode?: {
    canonicalReference: string;
    svg: string;
  };
  qrCode?: {
    canonicalUrl: string;
    safeBillReference: string;
    svg: string;
  };
  billParticulars?: UgvclBillParticulars;
}

export interface DocumentUiTranslationSet {
  electricityBill?: string;
  viewElectricityBill?: string;
  downloadPdf?: string;
  downloadBillPdf?: string;
  downloadReceiptPdf?: string;
  paymentReceipt: string;
  applicationAcknowledgment: string;
  complaintAcknowledgment: string;
  serviceRequestAcknowledgment: string;
  inspectionSummary: string;
  viewReceipt: string;
  viewAcknowledgment: string;
  viewInspectionSummary: string;
  print: string;
  printSaveAsPdf: string;
  close: string;
  receiptReference: string;
  applicationId: string;
  complaintId: string;
  serviceRequestId: string;
  inspectionOrderId: string;
  billReference: string;
  consumerNumber: string;
  consumerName: string;
  applicantName: string;
  subdivision: string;
  billingPeriod: string;
  paymentStatus: string;
  paymentDate: string;
  paymentMethod: string;
  bankReference: string;
  amountPaid: string;
  amountPayable: string;
  submittedOn: string;
  registeredOn: string;
  inspectedOn: string;
  currentStatus: string;
  lifecycleStageNote: string;
  nextExpectedStep: string;
  requestType: string;
  tariffCategory: string;
  requestedLoad: string;
  currentSanctionedLoad: string;
  loadChangeDirection: string;
  supplyPhase: string;
  estimatedSanctionCost: string;
  targetCompletionDate: string;
  documentsSubmitted: string;
  complaintCategory: string;
  complaintDescription: string;
  slaTargetWindow: string;
  expectedResolutionBy: string;
  resolutionSummary: string;
  assignedFieldEngineer: string;
  siteLocation: string;
  feederName: string;
  scannedMeterSerial: string;
  verifiedReadingKwh: string;
  opticalSealStatus: string;
  terminalCondition: string;
  testedPhaseVoltages: string;
  technicianRemarks: string;
  photoEvidenceAttached: string;
  yesRecorded: string;
  noRecorded: string;
  dataSource: string;
  demoDataNotice: string;
  demoPaymentReceiptDisclosure: string;
  demoAcknowledgmentDisclosure: string;
  demoInspectionDisclosure: string;
  receiptNotAvailableForUnpaidBill: string;
  receiptNotAvailableForPendingPayment: string;
  acknowledgmentNotAvailableForDraft: string;
  inspectionSummaryNotAvailable: string;
  unauthorizedDocumentAccess: string;
  paymentSummaryTitle: string;
  paymentSummarySubtitle: string;
  statusSubmittedNote: string;
  statusUnderReviewNote: string;
  statusApprovedNote: string;
  statusMeterInstalledNote: string;
  statusRejectedNote: string;
  nextStepDocVerification: string;
  nextStepSiteInspection: string;
  nextStepSanctionApproval: string;
  nextStepMeterInstallation: string;
  nextStepCompleted: string;
  nextStepApplicantResubmission: string;
  sectionPrimaryIdentifiers: string;
  sectionConsumerAndPremises: string;
  sectionFinancialBreakdown: string;
  sectionTechnicalSpecifications: string;
  sectionGrievanceAndSlaDetails: string;
  sectionInspectionFindings: string;
  energyCharges: string;
  fixedCharges: string;
  fuelPriceAdjustment: string;
  electricityDuty: string;
  rebateOrSubsidy: string;
  unitsConsumed: string;
  generatedTimestampLabel: string;
}

export const DOCUMENT_UI_TRANSLATIONS: Record<Language, DocumentUiTranslationSet> = {
  en: {
    paymentReceipt: 'Payment Receipt',
    applicationAcknowledgment: 'Application Submission Acknowledgment',
    complaintAcknowledgment: 'Complaint Registration Acknowledgment',
    serviceRequestAcknowledgment: 'Service Request Acknowledgment',
    inspectionSummary: 'Inspection Summary',
    viewReceipt: 'View Receipt',
    viewAcknowledgment: 'View Acknowledgment',
    viewInspectionSummary: 'View Inspection Summary',
    print: 'Print',
    printSaveAsPdf: 'Print / Save as PDF',
    close: 'Close',
    receiptReference: 'Receipt Reference',
    applicationId: 'Application ID',
    complaintId: 'Complaint ID',
    serviceRequestId: 'Service Request ID',
    inspectionOrderId: 'Work Order / Inspection ID',
    billReference: 'Bill / Invoice No.',
    consumerNumber: 'Consumer Number',
    consumerName: 'Consumer Name',
    applicantName: 'Applicant Name',
    subdivision: 'Subdivision Office',
    billingPeriod: 'Billing Month',
    paymentStatus: 'Payment Status',
    paymentDate: 'Payment Date & Time',
    paymentMethod: 'Payment Method',
    bankReference: 'Bank / Transaction Reference',
    amountPaid: 'Amount Paid',
    amountPayable: 'Amount Payable',
    submittedOn: 'Submitted On',
    registeredOn: 'Registered On',
    inspectedOn: 'Inspection Date / Schedule',
    currentStatus: 'Current Status',
    lifecycleStageNote: 'Application Lifecycle Stage',
    nextExpectedStep: 'Next Expected Workflow Step',
    requestType: 'Service Request Type',
    tariffCategory: 'Tariff Category',
    requestedLoad: 'Requested Load',
    currentSanctionedLoad: 'Existing Sanctioned Load',
    loadChangeDirection: 'Modification Type',
    supplyPhase: 'Supply Phase',
    estimatedSanctionCost: 'Estimated Sanction Fee',
    targetCompletionDate: 'Target Completion Date (Recorded)',
    documentsSubmitted: 'Submitted KYC & Technical Documents',
    complaintCategory: 'Grievance Category',
    complaintDescription: 'Registered Issue Summary',
    slaTargetWindow: 'Target SLA Window',
    expectedResolutionBy: 'Expected Resolution Due',
    resolutionSummary: 'Recorded Resolution Remarks',
    assignedFieldEngineer: 'Assigned Field Engineer',
    siteLocation: 'Site / Premises Location',
    feederName: '11kV Feeder',
    scannedMeterSerial: 'Scanned Meter Serial No.',
    verifiedReadingKwh: 'Verified Reading (kWh)',
    opticalSealStatus: 'Optical Seal Status',
    terminalCondition: 'Terminal Block Condition',
    testedPhaseVoltages: 'Tested Phase Voltages (R / Y / B)',
    technicianRemarks: 'Field Engineer Observations',
    photoEvidenceAttached: 'Site Geo-Tagged Photo Recorded',
    yesRecorded: 'Yes (Recorded)',
    noRecorded: 'No',
    dataSource: 'Data Source',
    demoDataNotice: 'DEMO Data Notice',
    demoPaymentReceiptDisclosure:
      'DEMO PAYMENT RECEIPT — This document reflects a simulated payment recorded within VidyutFlow. It is not proof of settlement with UGVCL or a payment gateway.',
    demoAcknowledgmentDisclosure:
      'DEMO ACKNOWLEDGMENT — This document reflects a simulated workflow record inside VidyutFlow. It is not an official statutory acknowledgment issued by UGVCL.',
    demoInspectionDisclosure:
      'DEMO INSPECTION SUMMARY — This document summarizes simulated field inspection findings recorded in VidyutFlow. It is not a government-certified electrical inspection report.',
    receiptNotAvailableForUnpaidBill:
      'Receipt not available for unpaid bill. A payment receipt can only be generated after payment is recorded as Paid.',
    receiptNotAvailableForPendingPayment:
      'Receipt not available for pending or failed payment transaction.',
    acknowledgmentNotAvailableForDraft:
      'Acknowledgment is only available for submitted or registered records.',
    inspectionSummaryNotAvailable:
      'Inspection summary is only available after field inspection findings have been recorded on the work order.',
    unauthorizedDocumentAccess:
      'You are not authorized to view or print this document under your current role, ownership, or subdivision assignment.',
    paymentSummaryTitle: 'Unpaid Bill — Payment Summary Only',
    paymentSummarySubtitle: 'No payment receipt has been issued because this bill remains unpaid.',
    statusSubmittedNote:
      'Application Submitted — Received online for initial scrutiny. Submission is not sanction approval.',
    statusUnderReviewNote:
      'Under Review / In Progress — Currently undergoing subdivision document or site feasibility verification. Not yet sanctioned.',
    statusApprovedNote:
      'Sanction Approved — Technical feasibility cleared as recorded in workflow.',
    statusMeterInstalledNote:
      'Approved & Meter Installed — Connection energized and completed as recorded.',
    statusRejectedNote:
      'Application Rejected — This application was not approved. Please review subdivision remarks.',
    nextStepDocVerification: 'Step 2 of 5: Subdivision Document & KYC Scrutiny',
    nextStepSiteInspection: 'Step 3 of 5: Field Engineer On-Site Load & Feasibility Inspection',
    nextStepSanctionApproval: 'Step 4 of 5: Sub-Divisional Engineer Sanction Approval',
    nextStepMeterInstallation: 'Step 5 of 5: Smart Meter Installation & Energization',
    nextStepCompleted: 'Workflow Completed — Smart Meter Installed & Energized',
    nextStepApplicantResubmission: 'Applicant Clarification / Resubmission Required',
    sectionPrimaryIdentifiers: 'Document & Reference Identifiers',
    sectionConsumerAndPremises: 'Consumer & Jurisdiction Details',
    sectionFinancialBreakdown: 'Recorded Payment & Tariff Summary',
    sectionTechnicalSpecifications: 'Requested Load & Workflow Status',
    sectionGrievanceAndSlaDetails: 'Grievance Registration & SLA Tracking',
    sectionInspectionFindings: 'Recorded On-Site Technical Inspection Findings',
    energyCharges: 'Energy Charges',
    fixedCharges: 'Fixed Demand Charges',
    fuelPriceAdjustment: 'Fuel Price & Power Purchase Adjustment (FPPPA)',
    electricityDuty: 'Government Electricity Duty',
    rebateOrSubsidy: 'Rebate / Solar Subsidy',
    unitsConsumed: 'Billed Consumption',
    generatedTimestampLabel: 'Document Generated',
  },
  gu: {
    paymentReceipt: 'ચુકવણી રસીદ',
    applicationAcknowledgment: 'અરજી સબમિશન પાવતી',
    complaintAcknowledgment: 'ફરિયાદ નોંધણી પાવતી',
    serviceRequestAcknowledgment: 'સેવા વિનંતી પાવતી',
    inspectionSummary: 'નિરીક્ષણ સારાંશ',
    viewReceipt: 'રસીદ જુઓ',
    viewAcknowledgment: 'પાવતી જુઓ',
    viewInspectionSummary: 'નિરીક્ષણ સારાંશ જુઓ',
    print: 'પ્રિન્ટ કરો',
    printSaveAsPdf: 'પ્રિન્ટ / PDF તરીકે સાચવો',
    close: 'બંધ કરો',
    receiptReference: 'રસીદ સંદર્ભ નંબર',
    applicationId: 'અરજી આઈડી',
    complaintId: 'ફરિયાદ આઈડી',
    serviceRequestId: 'સેવા વિનંતી આઈડી',
    inspectionOrderId: 'વર્ક ઓર્ડર / નિરીક્ષણ આઈડી',
    billReference: 'બિલ / ઇન્વોઇસ નંબર',
    consumerNumber: 'ગ્રાહક નંબર',
    consumerName: 'ગ્રાહકનું નામ',
    applicantName: 'અરજદારનું નામ',
    subdivision: 'સબડિવિઝન કચેરી',
    billingPeriod: 'બિલિંગ મહિનો',
    paymentStatus: 'ચુકવણી સ્થિતિ',
    paymentDate: 'ચુકવણી તારીખ અને સમય',
    paymentMethod: 'ચુકવણી પદ્ધતિ',
    bankReference: 'બેંક / વ્યવહાર સંદર્ભ',
    amountPaid: 'ચૂકવેલ રકમ',
    amountPayable: 'ચૂકવવાપાત્ર રકમ',
    submittedOn: 'સબમિટ કર્યાની તારીખ',
    registeredOn: 'નોંધણી તારીખ',
    inspectedOn: 'નિરીક્ષણ તારીખ / સમયપત્રક',
    currentStatus: 'વર્તમાન સ્થિતિ',
    lifecycleStageNote: 'અરજી પ્રક્રિયા તબક્કો',
    nextExpectedStep: 'આગામી અપેક્ષિત કાર્યવાહી તબક્કો',
    requestType: 'સેવા વિનંતી પ્રકાર',
    tariffCategory: 'ટેરિફ શ્રેણી',
    requestedLoad: 'માંગેલ લોડ',
    currentSanctionedLoad: 'હાલનો મંજૂર લોડ',
    loadChangeDirection: 'ફેરફાર પ્રકાર',
    supplyPhase: 'સપ્લાય ફેઝ',
    estimatedSanctionCost: 'અંદાજિત મંજૂરી ફી',
    targetCompletionDate: 'લક્ષ્યાંક પૂર્ણતા તારીખ (નોંધાયેલ)',
    documentsSubmitted: 'સબમિટ કરેલ KYC અને દસ્તાવેજો',
    complaintCategory: 'ફરિયાદ શ્રેણી',
    complaintDescription: 'નોંધાયેલ સમસ્યાની વિગત',
    slaTargetWindow: 'લક્ષ્યાંક SLA સમયમર્યાદા',
    expectedResolutionBy: 'અપેક્ષિત નિવારણ સમય',
    resolutionSummary: 'નોંધાયેલ નિવારણ નોંધ',
    assignedFieldEngineer: 'સોંપાયેલ ફિલ્ડ એન્જિનિયર',
    siteLocation: 'સ્થળ / પરિસર સરનામું',
    feederName: '11kV ફીડર',
    scannedMeterSerial: 'સ્કેન કરેલ મીટર સીરીયલ નં.',
    verifiedReadingKwh: 'ચકાસેલ રીડિંગ (kWh)',
    opticalSealStatus: 'ઓપ્ટિકલ સીલ સ્થિતિ',
    terminalCondition: 'ટર્મિનલ બ્લોક સ્થિતિ',
    testedPhaseVoltages: 'ચકાસેલ ફેઝ વોલ્ટેજ (R / Y / B)',
    technicianRemarks: 'ફિલ્ડ એન્જિનિયરના અવલોકનો',
    photoEvidenceAttached: 'સ્થળનો જીઓ-ટેગ ફોટો નોંધાયેલ',
    yesRecorded: 'હા (નોંધાયેલ)',
    noRecorded: 'ના',
    dataSource: 'ડેટા સ્ત્રોત',
    demoDataNotice: 'DEMO ડેટા સૂચના',
    demoPaymentReceiptDisclosure:
      'DEMO ચુકવણી રસીદ — આ દસ્તાવેજ VidyutFlow માં નોંધાયેલ સિમ્યુલેટેડ (DEMO) ચુકવણી દર્શાવે છે. તે UGVCL અથવા પેમેન્ટ ગેટવે સાથેની વાસ્તવિક નાણાકીય પતાવટનો પુરાવો નથી.',
    demoAcknowledgmentDisclosure:
      'DEMO પાવતી — આ દસ્તાવેજ VidyutFlow માં નોંધાયેલ સિમ્યુલેટેડ વર્કફ્લો રેકોર્ડ દર્શાવે છે. તે UGVCL દ્વારા જારી કરાયેલ સત્તાવાર વૈધાનિક પાવતી નથી.',
    demoInspectionDisclosure:
      'DEMO નિરીક્ષણ સારાંશ — આ દસ્તાવેજ VidyutFlow માં નોંધાયેલ સિમ્યુલેટેડ ફિલ્ડ નિરીક્ષણ તારણો દર્શાવે છે. તે સરકાર-પ્રમાણિત સત્તાવાર નિરીક્ષણ અહેવાલ નથી.',
    receiptNotAvailableForUnpaidBill:
      'બાકી (Unpaid) બિલ માટે ચુકવણી રસીદ ઉપલબ્ધ નથી. બિલની ચુકવણી નોંધાયા પછી જ રસીદ જનરેટ થઈ શકે છે.',
    receiptNotAvailableForPendingPayment:
      'પેન્ડિંગ અથવા નિષ્ફળ ચુકવણી વ્યવહાર માટે રસીદ ઉપલબ્ધ નથી.',
    acknowledgmentNotAvailableForDraft:
      'પાવતી માત્ર સબમિટ કરેલ અથવા નોંધાયેલ રેકોર્ડ માટે જ ઉપલબ્ધ છે.',
    inspectionSummaryNotAvailable:
      'વર્ક ઓર્ડર પર ફિલ્ડ નિરીક્ષણ તારણો નોંધાયા પછી જ નિરીક્ષણ સારાંશ ઉપલબ્ધ થાય છે.',
    unauthorizedDocumentAccess:
      'તમારી વર્તમાન ભૂમિકા, ખાતાની માલિકી અથવા સબડિવિઝન કાર્યક્ષેત્ર હેઠળ આ દસ્તાવેજ જોવાની કે પ્રિન્ટ કરવાની પરવાનગી નથી.',
    paymentSummaryTitle: 'બાકી બિલ — માત્ર ચુકવણી સારાંશ',
    paymentSummarySubtitle: 'આ બિલ હજુ ચૂકવવાનું બાકી હોવાથી ચુકવણી રસીદ જારી કરવામાં આવી નથી.',
    statusSubmittedNote:
      'અરજી સબમિટ થયેલ — પ્રાથમિક ચકાસણી માટે ઓનલાઇન પ્રાપ્ત થઈ છે. સબમિશન એ મંજૂરી નથી.',
    statusUnderReviewNote:
      'સમીક્ષા હેઠળ / પ્રગતિમાં — હાલમાં દસ્તાવેજ અથવા સ્થળ ચકાસણી હેઠળ છે. હજુ મંજૂર થયેલ નથી.',
    statusApprovedNote:
      'મંજૂરી પ્રાપ્ત — વર્કફ્લો રેકોર્ડ મુજબ ટેકનિકલ ચકાસણી મંજૂર કરવામાં આવી છે.',
    statusMeterInstalledNote:
      'મંજૂર અને મીટર ઇન્સ્ટોલ થયેલ — રેકોર્ડ મુજબ સ્માર્ટ મીટર કાર્યરત કરવામાં આવ્યું છે.',
    statusRejectedNote:
      'અરજી નામંજૂર — આ અરજી મંજૂર કરવામાં આવી નથી. કૃપા કરીને સબડિવિઝન નોંધ તપાસો.',
    nextStepDocVerification: 'તબક્કો 2 / 5: સબડિવિઝન દસ્તાવેજ અને KYC ચકાસણી',
    nextStepSiteInspection: 'તબક્કો 3 / 5: ફિલ્ડ એન્જિનિયર સ્થળ નિરીક્ષણ',
    nextStepSanctionApproval: 'તબક્કો 4 / 5: સબ-ડિવિઝનલ એન્જિનિયર મંજૂરી',
    nextStepMeterInstallation: 'તબક્કો 5 / 5: સ્માર્ટ મીટર ઇન્સ્ટોલેશન અને વીજ પુરવઠો ચાલુ કરવો',
    nextStepCompleted: 'પ્રક્રિયા પૂર્ણ — સ્માર્ટ મીટર ઇન્સ્ટોલ અને કાર્યરત',
    nextStepApplicantResubmission: 'અરજદાર દ્વારા સ્પષ્ટતા / પુનઃસબમિશન જરૂરી',
    sectionPrimaryIdentifiers: 'દસ્તાવેજ અને સંદર્ભ ઓળખકર્તા',
    sectionConsumerAndPremises: 'ગ્રાહક અને કાર્યક્ષેત્ર વિગતો',
    sectionFinancialBreakdown: 'નોંધાયેલ ચુકવણી અને ટેરિફ સારાંશ',
    sectionTechnicalSpecifications: 'માંગેલ લોડ અને વર્કફ્લો સ્થિતિ',
    sectionGrievanceAndSlaDetails: 'ફરિયાદ નોંધણી અને SLA ટ્રેકિંગ',
    sectionInspectionFindings: 'નોંધાયેલ સ્થળ તકનીકી નિરીક્ષણ તારણો',
    energyCharges: 'એનર્જી ચાર્જ',
    fixedCharges: 'ફિક્સ્ડ ડિમાન્ડ ચાર્જ',
    fuelPriceAdjustment: 'ફ્યુઅલ પ્રાઇસ એડજસ્ટમેન્ટ (FPPPA)',
    electricityDuty: 'સરકારી વીજળી ડ્યુટી',
    rebateOrSubsidy: 'રિબેટ / સોલાર સબસિડી',
    unitsConsumed: 'બિલ કરેલ વપરાશ',
    generatedTimestampLabel: 'દસ્તાવેજ જનરેટ સમય',
  },
  hi: {
    paymentReceipt: 'भुगतान रसीद',
    applicationAcknowledgment: 'आवेदन जमा पावती',
    complaintAcknowledgment: 'शिकायत पंजीकरण पावती',
    serviceRequestAcknowledgment: 'सेवा अनुरोध पावती',
    inspectionSummary: 'निरीक्षण सारांश',
    viewReceipt: 'रसीद देखें',
    viewAcknowledgment: 'पावती देखें',
    viewInspectionSummary: 'निरीक्षण सारांश देखें',
    print: 'प्रिंट करें',
    printSaveAsPdf: 'प्रिंट / PDF के रूप में सहेजें',
    close: 'बंद करें',
    receiptReference: 'रसीद संदर्भ संख्या',
    applicationId: 'आवेदन आईडी',
    complaintId: 'शिकायत आईडी',
    serviceRequestId: 'सेवा अनुरोध आईडी',
    inspectionOrderId: 'वर्क ऑर्डर / निरीक्षण आईडी',
    billReference: 'बिल / चालान संख्या',
    consumerNumber: 'उपभोक्ता संख्या',
    consumerName: 'उपभोक्ता का नाम',
    applicantName: 'आवेदक का नाम',
    subdivision: 'सबडिवीजन कार्यालय',
    billingPeriod: 'बिलिंग माह',
    paymentStatus: 'भुगतान स्थिति',
    paymentDate: 'भुगतान तिथि और समय',
    paymentMethod: 'भुगतान माध्यम',
    bankReference: 'बैंक / लेनदेन संदर्भ',
    amountPaid: 'भुगतान की गई राशि',
    amountPayable: 'देय राशि',
    submittedOn: 'जमा करने की तिथि',
    registeredOn: 'पंजीकरण तिथि',
    inspectedOn: 'निरीक्षण तिथि / अनुसूची',
    currentStatus: 'वर्तमान स्थिति',
    lifecycleStageNote: 'आवेदन कार्यप्रवाह चरण',
    nextExpectedStep: 'अगला अपेक्षित कार्यप्रवाह चरण',
    requestType: 'सेवा अनुरोध प्रकार',
    tariffCategory: 'टैरिफ श्रेणी',
    requestedLoad: 'अनुरोधित लोड',
    currentSanctionedLoad: 'मौजूदा स्वीकृत लोड',
    loadChangeDirection: 'संशोधन प्रकार',
    supplyPhase: 'सप्लाई फेज',
    estimatedSanctionCost: 'अनुमानित स्वीकृति शुल्क',
    targetCompletionDate: 'लक्षित पूर्णता तिथि (दर्ज)',
    documentsSubmitted: 'जमा किए गए KYC और दस्तावेज़',
    complaintCategory: 'शिकायत श्रेणी',
    complaintDescription: 'दर्ज समस्या विवरण',
    slaTargetWindow: 'लक्षित SLA समय-सीमा',
    expectedResolutionBy: 'अपेक्षित समाधान समय',
    resolutionSummary: 'दर्ज समाधान टिप्पणी',
    assignedFieldEngineer: 'नामित फील्ड इंजीनियर',
    siteLocation: 'स्थल / परिसर पता',
    feederName: '11kV फीडर',
    scannedMeterSerial: 'स्कैन किया गया मीटर सीरियल नं.',
    verifiedReadingKwh: 'सत्यापित रीडिंग (kWh)',
    opticalSealStatus: 'ऑप्टिकल सील स्थिति',
    terminalCondition: 'टर्मिनल ब्लॉक स्थिति',
    testedPhaseVoltages: 'परीक्षित फेज वोल्टेज (R / Y / B)',
    technicianRemarks: 'फील्ड इंजीनियर टिप्पणियां',
    photoEvidenceAttached: 'स्थल जियो-टैग फोटो दर्ज',
    yesRecorded: 'हाँ (दर्ज)',
    noRecorded: 'नहीं',
    dataSource: 'डेटा स्रोत',
    demoDataNotice: 'DEMO डेटा सूचना',
    demoPaymentReceiptDisclosure:
      'DEMO भुगतान रसीद — यह दस्तावेज़ VidyutFlow में दर्ज एक सिम्युलेटेड (DEMO) भुगतान को दर्शाता है। यह UGVCL या किसी पेमेंट गेटवे के साथ वास्तविक वित्तीय निपटान का प्रमाण नहीं है।',
    demoAcknowledgmentDisclosure:
      'DEMO पावती — यह दस्तावेज़ VidyutFlow में दर्ज एक सिम्युलेटेड कार्यप्रवाह रिकॉर्ड को दर्शाता है। यह UGVCL द्वारा जारी आधिकारिक वैधानिक पावती नहीं है।',
    demoInspectionDisclosure:
      'DEMO निरीक्षण सारांश — यह दस्तावेज़ VidyutFlow में दर्ज सिम्युलेटेड फील्ड निरीक्षण निष्कर्षों का सारांश है। यह सरकार द्वारा प्रमाणित आधिकारिक निरीक्षण रिपोर्ट नहीं है।',
    receiptNotAvailableForUnpaidBill:
      'अदत्त (Unpaid) बिल के लिए भुगतान रसीद उपलब्ध नहीं है। भुगतान दर्ज होने के बाद ही रसीद जारी की जा सकती है।',
    receiptNotAvailableForPendingPayment:
      'लंबित या विफल भुगतान लेनदेन के लिए रसीद उपलब्ध नहीं है।',
    acknowledgmentNotAvailableForDraft:
      'पावती केवल सबमिट या पंजीकृत रिकॉर्ड के लिए ही उपलब्ध है।',
    inspectionSummaryNotAvailable:
      'वर्क ऑर्डर पर फील्ड निरीक्षण निष्कर्ष दर्ज होने के बाद ही निरीक्षण सारांश उपलब्ध होता है।',
    unauthorizedDocumentAccess:
      'आपकी वर्तमान भूमिका, खाता स्वामित्व या सबडिवीजन अधिकार क्षेत्र के अंतर्गत इस दस्तावेज़ को देखने या प्रिंट करने की अनुमति नहीं है।',
    paymentSummaryTitle: 'अदत्त बिल — केवल भुगतान सारांश',
    paymentSummarySubtitle: 'यह बिल अभी अदत्त है, इसलिए कोई भुगतान रसीद जारी नहीं की गई है।',
    statusSubmittedNote:
      'आवेदन जमा किया गया — प्रारंभिक जांच के लिए ऑनलाइन प्राप्त हुआ। आवेदन जमा होना स्वीकृति (Approval) नहीं है।',
    statusUnderReviewNote:
      'समीक्षाधीन / प्रगति पर — वर्तमान में दस्तावेज़ या स्थल व्यवहार्यता जांच चल रही है। अभी स्वीकृत नहीं है।',
    statusApprovedNote:
      'स्वीकृति प्रदान की गई — कार्यप्रवाह रिकॉर्ड के अनुसार तकनीकी व्यवहार्यता स्वीकृत।',
    statusMeterInstalledNote:
      'स्वीकृत एवं मीटर स्थापित — रिकॉर्ड के अनुसार स्मार्ट मीटर स्थापित और आपूर्ति चालू।',
    statusRejectedNote:
      'आवेदन अस्वीकृत — यह आवेदन स्वीकृत नहीं किया गया। कृपया सबडिवीजन टिप्पणी देखें।',
    nextStepDocVerification: 'चरण 2 / 5: सबडिवीजन दस्तावेज़ एवं KYC जांच',
    nextStepSiteInspection: 'चरण 3 / 5: फील्ड इंजीनियर स्थल व्यवहार्यता निरीक्षण',
    nextStepSanctionApproval: 'चरण 4 / 5: सब-डिवीजनल इंजीनियर स्वीकृति अनुमोदन',
    nextStepMeterInstallation: 'चरण 5 / 5: स्मार्ट मीटर स्थापना एवं ऊर्जाकरण',
    nextStepCompleted: 'कार्यप्रवाह पूर्ण — स्मार्ट मीटर स्थापित एवं चालू',
    nextStepApplicantResubmission: 'आवेदक द्वारा स्पष्टीकरण / पुनः सबमिशन आवश्यक',
    sectionPrimaryIdentifiers: 'दस्तावेज़ और संदर्भ पहचानकर्ता',
    sectionConsumerAndPremises: 'उपभोक्ता और अधिकार क्षेत्र विवरण',
    sectionFinancialBreakdown: 'दर्ज भुगतान और टैरिफ सारांश',
    sectionTechnicalSpecifications: 'अनुरोधित लोड और कार्यप्रवाह स्थिति',
    sectionGrievanceAndSlaDetails: 'शिकायत पंजीकरण और SLA ट्रैकिंग',
    sectionInspectionFindings: 'दर्ज स्थल तकनीकी निरीक्षण निष्कर्ष',
    energyCharges: 'ऊर्जा शुल्क',
    fixedCharges: 'स्थायी मांग शुल्क',
    fuelPriceAdjustment: 'ईंधन मूल्य समायोजन (FPPPA)',
    electricityDuty: 'सरकारी विद्युत शुल्क',
    rebateOrSubsidy: 'छूट / सोलर सब्सिडी',
    unitsConsumed: 'बिल खपत',
    generatedTimestampLabel: 'दस्तावेज़ जनरेशन समय',
  },
  mr: {
    paymentReceipt: 'पेमेंट पावती',
    applicationAcknowledgment: 'अर्ज सादरीकरण पोचपावती',
    complaintAcknowledgment: 'तक्रार नोंदणी पोचपावती',
    serviceRequestAcknowledgment: 'सेवा विनंती पोचपावती',
    inspectionSummary: 'तपासणी सारांश',
    viewReceipt: 'पावती पहा',
    viewAcknowledgment: 'पोचपावती पहा',
    viewInspectionSummary: 'तपासणी सारांश पहा',
    print: 'प्रिंट करा',
    printSaveAsPdf: 'प्रिंट / PDF म्हणून जतन करा',
    close: 'बंद करा',
    receiptReference: 'पावती संदर्भ क्रमांक',
    applicationId: 'अर्ज आयडी',
    complaintId: 'तक्रार आयडी',
    serviceRequestId: 'सेवा विनंती आयडी',
    inspectionOrderId: 'वर्क ऑर्डर / तपासणी आयडी',
    billReference: 'बिल / बीजक क्रमांक',
    consumerNumber: 'ग्राहक क्रमांक',
    consumerName: 'ग्राहकाचे नाव',
    applicantName: 'अर्जदाराचे नाव',
    subdivision: 'सबडिव्हिजन कार्यालय',
    billingPeriod: 'बिलिंग महिना',
    paymentStatus: 'पेमेंट स्थिती',
    paymentDate: 'पेमेंट तारीख आणि वेळ',
    paymentMethod: 'पेमेंट पद्धत',
    bankReference: 'बँक / व्यवहार संदर्भ',
    amountPaid: 'भरलेली रक्कम',
    amountPayable: 'देय रक्कम',
    submittedOn: 'सादर केल्याची तारीख',
    registeredOn: 'नोंदणी तारीख',
    inspectedOn: 'तपासणी तारीख / वेळापत्रक',
    currentStatus: 'सध्याची स्थिती',
    lifecycleStageNote: 'अर्ज कार्यप्रवाह टप्पा',
    nextExpectedStep: 'पुढील अपेक्षित कार्यप्रवाह टप्पा',
    requestType: 'सेवा विनंती प्रकार',
    tariffCategory: 'टॅरिफ श्रेणी',
    requestedLoad: 'मागणी केलेला लोड',
    currentSanctionedLoad: 'सध्याचा मंजूर लोड',
    loadChangeDirection: 'बदल प्रकार',
    supplyPhase: 'सप्लाय फेज',
    estimatedSanctionCost: 'अंदाजित मंजुरी शुल्क',
    targetCompletionDate: 'लक्षित पूर्णता तारीख (नोंदवलेली)',
    documentsSubmitted: 'सादर केलेले KYC आणि कागदपत्रे',
    complaintCategory: 'तक्रार श्रेणी',
    complaintDescription: 'नोंदवलेला तक्रार तपशील',
    slaTargetWindow: 'लक्षित SLA कालावधी',
    expectedResolutionBy: 'अपेक्षित निवारण वेळ',
    resolutionSummary: 'नोंदवलेला निवारण शेरा',
    assignedFieldEngineer: 'नेमून दिलेले फील्ड अभियंता',
    siteLocation: 'स्थळ / परिसर पत्ता',
    feederName: '11kV फीडर',
    scannedMeterSerial: 'स्कॅन केलेला मीटर सिरीयल क्र.',
    verifiedReadingKwh: 'तपासलेले रीडिंग (kWh)',
    opticalSealStatus: 'ऑप्टिकल सील स्थिती',
    terminalCondition: 'टर्मिनल ब्लॉक स्थिती',
    testedPhaseVoltages: 'तपासलेले फेज व्होल्टेज (R / Y / B)',
    technicianRemarks: 'फील्ड अभियंता निरीक्षणे',
    photoEvidenceAttached: 'स्थळाचा जिओ-टॅग फोटो नोंदवला',
    yesRecorded: 'होय (नोंदवलेले)',
    noRecorded: 'नाही',
    dataSource: 'डेटा स्रोत',
    demoDataNotice: 'DEMO डेटा सूचना',
    demoPaymentReceiptDisclosure:
      'DEMO पेमेंट पावती — हा दस्तऐवज VidyutFlow मध्ये नोंदवलेले सिम्युलेटेड (DEMO) पेमेंट दर्शवतो. हा UGVCL किंवा पेमेंट गेटवेसोबतच्या प्रत्यक्ष आर्थिक व्यवहाराचा पुरावा नाही.',
    demoAcknowledgmentDisclosure:
      'DEMO पोचपावती — हा दस्तऐवज VidyutFlow मधील सिम्युलेटेड वर्कफ्लो रेकॉर्ड दर्शवतो. ही UGVCL कडून जारी केलेली अधिकृत वैधानिक पोचपावती नाही.',
    demoInspectionDisclosure:
      'DEMO तपासणी सारांश — हा दस्तऐवज VidyutFlow मध्ये नोंदवलेल्या सिम्युलेटेड फील्ड तपासणी निष्कर्षांचा सारांश आहे. हा शासन-प्रमाणित अधिकृत तपासणी अहवाल नाही.',
    receiptNotAvailableForUnpaidBill:
      'थकीत (Unpaid) बिलासाठी पेमेंट पावती उपलब्ध नाही. पेमेंटची नोंद झाल्यानंतरच पावती तयार केली जाऊ शकते.',
    receiptNotAvailableForPendingPayment:
      'प्रलंबित किंवा अयशस्वी पेमेंट व्यवहारासाठी पावती उपलब्ध नाही.',
    acknowledgmentNotAvailableForDraft:
      'पोचपावती केवळ सादर केलेल्या किंवा नोंदणीकृत रेकॉर्डसाठीच उपलब्ध आहे.',
    inspectionSummaryNotAvailable:
      'वर्क ऑर्डरवर फील्ड तपासणी निष्कर्ष नोंदवल्यानंतरच तपासणी सारांश उपलब्ध होतो.',
    unauthorizedDocumentAccess:
      'तुमच्या सध्याच्या भूमिकेनुसार, खाते मालकीनुसार किंवा सबडिव्हिजन कार्यक्षेत्रानुसार हा दस्तऐवज पाहण्याची किंवा प्रिंट करण्याची परवानगी नाही.',
    paymentSummaryTitle: 'थकीत बिल — केवळ पेमेंट सारांश',
    paymentSummarySubtitle: 'हे बिल अद्याप न भरलेले असल्यामुळे कोणतीही पेमेंट पावती जारी केलेली नाही.',
    statusSubmittedNote:
      'अर्ज सादर केला — प्राथमिक छाननीसाठी ऑनलाइन प्राप्त झाला आहे. अर्ज सादरीकरण म्हणजे मंजुरी (Approval) नव्हे.',
    statusUnderReviewNote:
      'छाननी अंतर्गत / प्रगतीपथावर — सध्या कागदपत्रे किंवा स्थळ व्यवहार्यता तपासणी सुरू आहे. अद्याप मंजूर नाही.',
    statusApprovedNote:
      'मंजुरी प्राप्त — कार्यप्रवाह नोंदीनुसार तांत्रिक व्यवहार्यता मंजूर करण्यात आली आहे.',
    statusMeterInstalledNote:
      'मंजूर आणि मीटर बसवले — नोंदीनुसार स्मार्ट मीटर बसवून वीज पुरवठा सुरू केला आहे.',
    statusRejectedNote:
      'अर्ज नामंजूर — हा अर्ज मंजूर करण्यात आलेला नाही. कृपया सबडिव्हिजन शेरा पहा.',
    nextStepDocVerification: 'टप्पा 2 / 5: सबडिव्हिजन कागदपत्रे आणि KYC छाननी',
    nextStepSiteInspection: 'टप्पा 3 / 5: फील्ड अभियंता स्थळ व्यवहार्यता तपासणी',
    nextStepSanctionApproval: 'टप्पा 4 / 5: सब-डिव्हिजनल अभियंता मंजुरी',
    nextStepMeterInstallation: 'टप्पा 5 / 5: स्मार्ट मीटर बसवणे आणि वीज पुरवठा सुरू करणे',
    nextStepCompleted: 'कार्यप्रवाह पूर्ण — स्मार्ट मीटर बसवले आणि कार्यान्वित',
    nextStepApplicantResubmission: 'अर्जदाराकडून स्पष्टीकरण / पुनर्सबमिशन आवश्यक',
    sectionPrimaryIdentifiers: 'दस्तऐवज आणि संदर्भ ओळखकर्ता',
    sectionConsumerAndPremises: 'ग्राहक आणि कार्यक्षेत्र तपशील',
    sectionFinancialBreakdown: 'नोंदवलेले पेमेंट आणि टॅरिफ सारांश',
    sectionTechnicalSpecifications: 'मागणी केलेला लोड आणि कार्यप्रवाह स्थिती',
    sectionGrievanceAndSlaDetails: 'तक्रार नोंदणी आणि SLA ट्रॅकिंग',
    sectionInspectionFindings: 'नोंदवलेले स्थळ तांत्रिक तपासणी निष्कर्ष',
    energyCharges: 'ऊर्जा आकार',
    fixedCharges: 'स्थिर मागणी आकार',
    fuelPriceAdjustment: 'इंधन दर समायोजन (FPPPA)',
    electricityDuty: 'शासकीय वीज कर',
    rebateOrSubsidy: 'सवलत / सोलर अनुदान',
    unitsConsumed: 'बिल केलेला वापर',
    generatedTimestampLabel: 'दस्तऐवज तयार केल्याची वेळ',
  },
};

export function getDocumentUiTranslations(language: Language = 'en'): DocumentUiTranslationSet {
  return DOCUMENT_UI_TRANSLATIONS[language] || DOCUMENT_UI_TRANSLATIONS.en;
}

/**
 * Generates a safe, deterministic PDF filename from a document type and canonical reference ID.
 * Never includes personal names or unsafe characters.
 */
export function buildDocumentFilename(
  documentType: OfficialDocumentType,
  referenceId: string
): string {
  const safeRef =
    String(referenceId || 'record')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'record';

  switch (documentType) {
    case 'electricity_bill':
      return `vidyutflow-electricity-bill-${safeRef}.pdf`;
    case 'payment_receipt':
      return `vidyutflow-payment-receipt-${safeRef}.pdf`;
    case 'account_statement':
      return `vidyutflow-account-statement-${safeRef}.pdf`;
    case 'application_acknowledgment':
      return `vidyutflow-application-acknowledgment-${safeRef}.pdf`;
    case 'complaint_acknowledgment':
      return `vidyutflow-complaint-acknowledgment-${safeRef}.pdf`;
    case 'service_request_acknowledgment':
      return `vidyutflow-service-request-acknowledgment-${safeRef}.pdf`;
    case 'inspection_summary':
    default:
      return `vidyutflow-inspection-summary-${safeRef}.pdf`;
  }
}

/**
 * Localized labels for the new Electricity Bill and enhanced Payment Receipt sections across en, gu, hi, mr.
 */
export const BILL_AND_RECEIPT_EXTRA_LABELS: Record<
  Language,
  {
    electricityBillTitle: string;
    viewElectricityBill: string;
    downloadPdf: string;
    downloadBillPdf: string;
    downloadReceiptPdf: string;
    sectionUgvclIdentity: string;
    sectionConsumerDetails: string;
    sectionBillingDetails: string;
    sectionElectricityConsumption: string;
    sectionTariffCalculation: string;
    sectionBillStatus: string;
    sectionSourceDisclosure: string;
    sectionSettlementSummary: string;
    companyNameLabel: string;
    gujaratiTitleLabel: string;
    missionTaglineLabel: string;
    cinLabel: string;
    registeredOfficeLabel: string;
    accountIdLabel: string;
    connectionIdLabel: string;
    serviceAddressLabel: string;
    sanctionedLoadLabel: string;
    meterNumberLabel: string;
    meterPhaseLabel: string;
    billIssueDateLabel: string;
    dueDateLabel: string;
    currentBillAmountLabel: string;
    previouslyPaidAmountLabel: string;
    remainingAmountPayableLabel: string;
    previousMeterReadingLabel: string;
    currentMeterReadingLabel: string;
    readingDateLabel: string;
    readingSourceLabel: string;
    readingSourceRecorded: string;
    readingSourceSimulated: string;
    readingNotRecordedNotice: string;
    slabTableTitle: string;
    slabColDescription: string;
    slabColUnits: string;
    slabColRate: string;
    slabColAmount: string;
    chargeTableTitle: string;
    chargeColComponent: string;
    chargeColAmount: string;
    reconciliationVerifiedText: string;
    reconciliationMismatchWarning: string;
    amountPaidInThisTxLabel: string;
    totalBillAmountLabel: string;
    previouslySettledAmountLabel: string;
    remainingBalanceAfterPaymentLabel: string;
    settlementClassificationLabel: string;
    fullSettlementBadge: string;
    partialSettlementBadge: string;
    demoElectricityBillDisclosure: string;
    nextStepsTitle: string;
    previousBillsTableTitle: string;
    colPeriod: string;
    colUnits: string;
    colBilledAmount: string;
    colPaidAmount: string;
    colRemainingBalance: string;
    colStatus: string;
    noPreviousBillsMessage: string;
    sectionReverseTariffSchedule: string;
    sectionReverseCalculation: string;
    sectionReverseBillingTerms: string;
    sectionReverseSafety: string;
    sectionReverseGrievance: string;
    sectionReverseLegalNotice: string;
  }
> = {
  en: {
    electricityBillTitle: 'Electricity Bill & Tariff Statement',
    viewElectricityBill: 'View Bill',
    downloadPdf: 'Download PDF',
    downloadBillPdf: 'Download Bill PDF',
    downloadReceiptPdf: 'Download Receipt PDF',
    sectionUgvclIdentity: 'A. UGVCL Corporate Identity & Distribution Licensee',
    sectionConsumerDetails: 'B. Consumer, Connection & Meter Details',
    sectionBillingDetails: 'C. Billing Cycle & Payable Summary',
    sectionElectricityConsumption: 'D. Electricity Consumption & Meter Reading Details',
    sectionTariffCalculation: 'E. Detailed Tariff & Statutory Charge Calculation',
    sectionBillStatus: 'F. Current Bill Settlement Status',
    sectionSourceDisclosure: 'G. Data Source & Authenticity Disclosure',
    sectionSettlementSummary: 'Transaction Settlement & Balance Ledger',
    companyNameLabel: 'Issuing Electricity Utility',
    gujaratiTitleLabel: 'Official Gujarati Utility Name',
    missionTaglineLabel: 'Corporate Mission Tagline',
    cinLabel: 'Corporate Identity Number (CIN)',
    registeredOfficeLabel: 'Registered Corporate Office',
    accountIdLabel: 'Consumer Account ID',
    connectionIdLabel: 'Service Connection ID',
    serviceAddressLabel: 'Service Premises Address',
    sanctionedLoadLabel: 'Sanctioned Load',
    meterNumberLabel: 'Smart Meter Serial No.',
    meterPhaseLabel: 'Supply Phase',
    billIssueDateLabel: 'Bill Issue Date',
    dueDateLabel: 'Payment Due Date',
    currentBillAmountLabel: 'Total Bill Amount',
    previouslyPaidAmountLabel: 'Previously Paid / Adjusted Amount',
    remainingAmountPayableLabel: 'Remaining Amount Payable',
    previousMeterReadingLabel: 'Previous Meter Reading',
    currentMeterReadingLabel: 'Current Meter Reading',
    readingDateLabel: 'Meter Reading Date',
    readingSourceLabel: 'Reading Classification',
    readingSourceRecorded: 'RECORDED (Verified Connection Meter Register)',
    readingSourceSimulated: 'SIMULATED (Deterministic DEMO Cycle Consumption)',
    readingNotRecordedNotice: 'Simulated Cycle Basis (No separate physical register delta)',
    slabTableTitle: 'Slab-Wise Energy Charge Breakdown',
    slabColDescription: 'Tariff Slab',
    slabColUnits: 'Billed Units (kWh)',
    slabColRate: 'Rate (₹/kWh)',
    slabColAmount: 'Slab Amount (₹)',
    chargeTableTitle: 'Complete Bill Charge & Reconciliation Statement',
    chargeColComponent: 'Charge Component',
    chargeColAmount: 'Amount (₹)',
    reconciliationVerifiedText: 'Verified: Charge components reconcile with total bill amount.',
    reconciliationMismatchWarning:
      'Data Integrity Notice: Component sum differs from canonical bill total. Canonical bill total is preserved.',
    amountPaidInThisTxLabel: 'Amount Paid in This Transaction',
    totalBillAmountLabel: 'Total Bill Amount',
    previouslySettledAmountLabel: 'Previously Settled Amount',
    remainingBalanceAfterPaymentLabel: 'Remaining Balance After This Payment',
    settlementClassificationLabel: 'Settlement Classification',
    fullSettlementBadge: 'Full Settlement (Remaining Balance ₹0)',
    partialSettlementBadge: 'Partial Settlement (Balance Remains Due)',
    demoElectricityBillDisclosure:
      'DEMO ELECTRICITY BILL — This statement represents a simulated (DEMO) utility bill record in VidyutFlow 2.0. It is not a statutory tax invoice issued by UGVCL.',
    nextStepsTitle: 'Important Guidance & Next Steps',
    previousBillsTableTitle: 'Previous Billing History & Payment Reconciliation (Last 3 Cycles)',
    colPeriod: 'Billing Period',
    colUnits: 'Units (kWh)',
    colBilledAmount: 'Billed Amount (₹)',
    colPaidAmount: 'Paid Amount (₹)',
    colRemainingBalance: 'Remaining Balance (₹)',
    colStatus: 'Status',
    noPreviousBillsMessage: 'No previous billing records found for this service connection.',
    sectionReverseTariffSchedule: 'H. UGVCL Statutory Tariff Schedule & Slab Structure',
    sectionReverseCalculation: 'I. Energy Charge, FPPPA & Statutory Duty Calculation Principles',
    sectionReverseBillingTerms: 'J. Billing Terms, Grace Period & Digital Payment Guidelines',
    sectionReverseSafety: 'K. Consumer Electrical Safety & Energy Conservation Directives',
    sectionReverseGrievance: 'L. Centralized Grievance Redressal & Support Directory',
    sectionReverseLegalNotice: 'M. Statutory Legal Notice & DEMO Authenticity Disclosure',
  },
  gu: {
    electricityBillTitle: 'વીજ વપરાશ બિલ અને ટેરિફ પત્રક',
    viewElectricityBill: 'બિલ જુઓ',
    downloadPdf: 'PDF ડાઉનલોડ કરો',
    downloadBillPdf: 'બિલ PDF ડાઉનલોડ કરો',
    downloadReceiptPdf: 'રસીદ PDF ડાઉનલોડ કરો',
    sectionUgvclIdentity: 'A. UGVCL કોર્પોરેટ ઓળખ અને વીજ વિતરણ કંપની',
    sectionConsumerDetails: 'B. ગ્રાહક, જોડાણ અને મીટર વિગતો',
    sectionBillingDetails: 'C. બિલિંગ ગાળો અને ચૂકવવાપાત્ર સારાંશ',
    sectionElectricityConsumption: 'D. વીજ વપરાશ અને મીટર રીડિંગ વિગતો',
    sectionTariffCalculation: 'E. વિગતવાર ટેરિફ અને સરકારી ચાર્જ ગણતરી',
    sectionBillStatus: 'F. વર્તમાન બિલ ચુકવણી સ્થિતિ',
    sectionSourceDisclosure: 'G. ડેટા સ્ત્રોત અને પ્રમાણિકતા સૂચના',
    sectionSettlementSummary: 'વ્યવહાર ચુકવણી અને બાકી રકમ ખાતાવહી',
    companyNameLabel: 'વીજ વિતરણ કંપની',
    gujaratiTitleLabel: 'સત્તાવાર ગુજરાતી નામ',
    missionTaglineLabel: 'કોર્પોરેટ મિશન સૂત્ર',
    cinLabel: 'કોર્પોરેટ ઓળખ નંબર (CIN)',
    registeredOfficeLabel: 'રજિસ્ટર્ડ કોર્પોરેટ ઓફિસ',
    accountIdLabel: 'ગ્રાહક એકાઉન્ટ ID',
    connectionIdLabel: 'સર્વિસ કનેક્શન ID',
    serviceAddressLabel: 'વીજ જોડાણ સ્થળ સરનામું',
    sanctionedLoadLabel: 'મંજૂર લોડ',
    meterNumberLabel: 'સ્માર્ટ મીટર સીરીયલ નં.',
    meterPhaseLabel: 'સપ્લાય ફેઝ',
    billIssueDateLabel: 'બિલ જારી તારીખ',
    dueDateLabel: 'ચુકવણી છેલ્લી તારીખ (Due Date)',
    currentBillAmountLabel: 'કુલ બિલ રકમ',
    previouslyPaidAmountLabel: 'અગાઉ ચૂકવેલ / સમાયોજિત રકમ',
    remainingAmountPayableLabel: 'બાકી ચૂકવવાપાત્ર રકમ',
    previousMeterReadingLabel: 'અગાઉનું મીટર રીડિંગ',
    currentMeterReadingLabel: 'હાલનું મીટર રીડિંગ',
    readingDateLabel: 'મીટર રીડિંગ તારીખ',
    readingSourceLabel: 'રીડિંગ વર્ગીકરણ',
    readingSourceRecorded: 'RECORDED (નોંધાયેલ મીટર રજિસ્ટર રીડિંગ)',
    readingSourceSimulated: 'SIMULATED (સિમ્યુલેટેડ DEMO સાયકલ વપરાશ)',
    readingNotRecordedNotice: 'સિમ્યુલેટેડ DEMO સાયકલ આધારિત વપરાશ',
    slabTableTitle: 'સ્લેબ મુજબ એનર્જી ચાર્જ ગણતરી',
    slabColDescription: 'ટેરિફ સ્લેબ',
    slabColUnits: 'વપરાશ યુનિટ (kWh)',
    slabColRate: 'દર (₹/kWh)',
    slabColAmount: 'સ્લેબ રકમ (₹)',
    chargeTableTitle: 'સંપૂર્ણ બિલ ચાર્જ અને મેળવણી પત્રક',
    chargeColComponent: 'ચાર્જ વિગત',
    chargeColAmount: 'રકમ (₹)',
    reconciliationVerifiedText: 'ચકાસાયેલ: તમામ ચાર્જ કુલ બિલ રકમ સાથે મેળ ખાય છે.',
    reconciliationMismatchWarning:
      'ડેટા અખંડિતતા સૂચના: ચાર્જ સરવાળો અને મૂળ બિલ રકમમાં તફાવત છે. મૂળ બિલ રકમ જાળવી રાખવામાં આવી છે.',
    amountPaidInThisTxLabel: 'આ વ્યવહારમાં ચૂકવેલ રકમ',
    totalBillAmountLabel: 'કુલ બિલ રકમ',
    previouslySettledAmountLabel: 'અગાઉ ચૂકવેલ રકમ',
    remainingBalanceAfterPaymentLabel: 'આ ચુકવણી પછી બાકી રકમ',
    settlementClassificationLabel: 'ચુકવણી પ્રકાર',
    fullSettlementBadge: 'સંપૂર્ણ ચુકવણી (બાકી રકમ ₹0)',
    partialSettlementBadge: 'આંશિક ચુકવણી (બાકી રકમ ચૂકવવાપાત્ર)',
    demoElectricityBillDisclosure:
      'DEMO વીજ બિલ — આ દસ્તાવેજ VidyutFlow 2.0 માં સિમ્યુલેટેડ (DEMO) વીજ બિલ દર્શાવે છે. આ UGVCL દ્વારા જારી કરાયેલ વૈધાનિક ટેક્સ ઇન્વોઇસ નથી.',
    nextStepsTitle: 'મહત્વપૂર્ણ માર્ગદર્શન અને આગળના પગલાં',
    previousBillsTableTitle: 'અગાઉના બિલિંગ ઇતિહાસ અને ચુકવણી મેળવણી (છેલ્લા 3 બિલિંગ ચક્ર)',
    colPeriod: 'બિલિંગ સમયગાળો',
    colUnits: 'વપરાશ (kWh)',
    colBilledAmount: 'બિલ રકમ (₹)',
    colPaidAmount: 'ચૂકવેલ રકમ (₹)',
    colRemainingBalance: 'બાકી રકમ (₹)',
    colStatus: 'સ્થિતિ',
    noPreviousBillsMessage: 'આ વીજ જોડાણ માટે કોઈ અગાઉના બિલિંગ રેકોર્ડ મળ્યા નથી.',
    sectionReverseTariffSchedule: 'H. UGVCL વૈધાનિક ટેરિફ સમયપત્રક અને સ્લેબ માળખું',
    sectionReverseCalculation: 'I. એનર્જી ચાર્જ, FPPPA અને સરકારી વીજ કર ગણતરીના સિદ્ધાંતો',
    sectionReverseBillingTerms: 'J. બિલિંગ શરતો, ગ્રેસ પિરિયડ અને ડિજિટલ ચુકવણી માર્ગદર્શિકા',
    sectionReverseSafety: 'K. ગ્રાહક વિદ્યુત સુરક્ષા અને ઊર્જા સંરક્ષણ માર્ગદર્શિકા',
    sectionReverseGrievance: 'L. કેન્દ્રીય ફરિયાદ નિવારણ અને સહાય સંપર્ક નિર્દેશિકા',
    sectionReverseLegalNotice: 'M. વૈધાનિક કાનૂની સૂચના અને DEMO પ્રમાણિકતા જાહેરાત',
  },
  hi: {
    electricityBillTitle: 'विद्युत खपत बिल एवं टैरिफ विवरण',
    viewElectricityBill: 'बिल देखें',
    downloadPdf: 'PDF डाउनलोड करें',
    downloadBillPdf: 'बिल PDF डाउनलोड करें',
    downloadReceiptPdf: 'रसीद PDF डाउनलोड करें',
    sectionUgvclIdentity: 'A. UGVCL कॉर्पोरेट पहचान एवं वितरण कंपनी',
    sectionConsumerDetails: 'B. उपभोक्ता, कनेक्शन और मीटर विवरण',
    sectionBillingDetails: 'C. बिलिंग चक्र और देय सारांश',
    sectionElectricityConsumption: 'D. विद्युत खपत और मीटर रीडिंग विवरण',
    sectionTariffCalculation: 'E. विस्तृत टैरिफ और वैधानिक शुल्क गणना',
    sectionBillStatus: 'F. वर्तमान बिल निपटान स्थिति',
    sectionSourceDisclosure: 'G. डेटा स्रोत और प्रामाणिकता सूचना',
    sectionSettlementSummary: 'लेनदेन निपटान और शेष राशि विवरण',
    companyNameLabel: 'विद्युत वितरण कंपनी',
    gujaratiTitleLabel: 'आधिकारिक गुजराती नाम',
    missionTaglineLabel: 'कॉर्पोरेट मिशन टैगलाइन',
    cinLabel: 'कॉर्पोरेट पहचान संख्या (CIN)',
    registeredOfficeLabel: 'पंजीकृत कॉर्पोरेट कार्यालय',
    accountIdLabel: 'उपभोक्ता खाता ID',
    connectionIdLabel: 'सर्विस कनेक्शन ID',
    serviceAddressLabel: 'सेवा परिसर का पता',
    sanctionedLoadLabel: 'स्वीकृत भार (Sanctioned Load)',
    meterNumberLabel: 'स्मार्ट मीटर सीरियल नं.',
    meterPhaseLabel: 'सप्लाई फेज',
    billIssueDateLabel: 'बिल जारी तिथि',
    dueDateLabel: 'भुगतान अंतिम तिथि (Due Date)',
    currentBillAmountLabel: 'कुल बिल राशि',
    previouslyPaidAmountLabel: 'पूर्व में भुगतान / समायोजित राशि',
    remainingAmountPayableLabel: 'शेष देय राशि',
    previousMeterReadingLabel: 'पिछली मीटर रीडिंग',
    currentMeterReadingLabel: 'वर्तमान मीटर रीडिंग',
    readingDateLabel: 'मीटर रीडिंग तिथि',
    readingSourceLabel: 'रीडिंग वर्गीकरण',
    readingSourceRecorded: 'RECORDED (दर्ज मीटर रजिस्टर रीडिंग)',
    readingSourceSimulated: 'SIMULATED (सिम्युलेटेड DEMO चक्र खपत)',
    readingNotRecordedNotice: 'सिम्युलेटेड DEMO चक्र खपत आधार',
    slabTableTitle: 'स्लैब-वार ऊर्जा शुल्क विवरण',
    slabColDescription: 'टैरिफ स्लैब',
    slabColUnits: 'बिल यूनिट (kWh)',
    slabColRate: 'दर (₹/kWh)',
    slabColAmount: 'स्लैब राशि (₹)',
    chargeTableTitle: 'संपूर्ण बिल शुल्क एवं समाधान विवरण',
    chargeColComponent: 'शुल्क घटक',
    chargeColAmount: 'राशि (₹)',
    reconciliationVerifiedText: 'सत्यापित: सभी शुल्क घटक कुल बिल राशि से मेल खाते हैं।',
    reconciliationMismatchWarning:
      'डेटा अखंडता सूचना: शुल्क घटकों का योग कुल बिल राशि से भिन्न है। मूल बिल राशि सुरक्षित रखी गई है।',
    amountPaidInThisTxLabel: 'इस लेनदेन में भुगतान की गई राशि',
    totalBillAmountLabel: 'कुल बिल राशि',
    previouslySettledAmountLabel: 'पूर्व में निपटाई गई राशि',
    remainingBalanceAfterPaymentLabel: 'इस भुगतान के बाद शेष देय राशि',
    settlementClassificationLabel: 'भुगतान निपटान वर्गीकरण',
    fullSettlementBadge: 'पूर्ण निपटान (शेष राशि ₹0)',
    partialSettlementBadge: 'आंशिक निपटान (शेष राशि देय है)',
    demoElectricityBillDisclosure:
      'DEMO विद्युत बिल — यह दस्तावेज़ VidyutFlow 2.0 में सिम्युलेटेड (DEMO) बिजली बिल रिकॉर्ड दर्शाता है। यह UGVCL द्वारा जारी वैधानिक टैक्स चालान नहीं है।',
    nextStepsTitle: 'महत्वपूर्ण मार्गदर्शन और अगले चरण',
    previousBillsTableTitle: 'पिछला बिलिंग इतिहास एवं भुगतान समाधान (पिछले 3 बिलिंग चक्र)',
    colPeriod: 'बिलिंग अवधि',
    colUnits: 'इकाई (kWh)',
    colBilledAmount: 'बिल राशि (₹)',
    colPaidAmount: 'भुगतान राशि (₹)',
    colRemainingBalance: 'शेष राशि (₹)',
    colStatus: 'स्थिति',
    noPreviousBillsMessage: 'इस सर्विस कनेक्शन के लिए कोई पिछला बिलिंग रिकॉर्ड नहीं मिला।',
    sectionReverseTariffSchedule: 'H. UGVCL वैधानिक टैरिफ अनुसूची एवं स्लैब संरचना',
    sectionReverseCalculation: 'I. ऊर्जा शुल्क, FPPPA एवं वैधानिक विद्युत शुल्क गणना सिद्धांत',
    sectionReverseBillingTerms: 'J. बिलिंग शर्तें, रियायती अवधि एवं डिजिटल भुगतान दिशानिर्देश',
    sectionReverseSafety: 'K. उपभोक्ता विद्युत सुरक्षा एवं ऊर्जा संरक्षण निर्देश',
    sectionReverseGrievance: 'L. केंद्रीकृत शिकायत निवारण एवं सहायता संपर्क निर्देशिका',
    sectionReverseLegalNotice: 'M. वैधानिक कानूनी सूचना एवं DEMO प्रामाणिकता प्रकटीकरण',
  },
  mr: {
    electricityBillTitle: 'वीज वापर बिल आणि टॅरिफ विवरणपत्र',
    viewElectricityBill: 'बिल पहा',
    downloadPdf: 'PDF डाउनलोड करा',
    downloadBillPdf: 'बिल PDF डाउनलोड करा',
    downloadReceiptPdf: 'पावती PDF डाउनलोड करा',
    sectionUgvclIdentity: 'A. UGVCL कॉर्पोरेट ओळख आणि वीज वितरण कंपनी',
    sectionConsumerDetails: 'B. ग्राहक, कनेक्शन आणि मीटर तपशील',
    sectionBillingDetails: 'C. बिलिंग कालावधी आणि देय सारांश',
    sectionElectricityConsumption: 'D. वीज वापर आणि मीटर रीडिंग तपशील',
    sectionTariffCalculation: 'E. सविस्तर टॅरिफ आणि वैधानिक आकार गणना',
    sectionBillStatus: 'F. सध्याची बिल पेमेंट स्थिती',
    sectionSourceDisclosure: 'G. डेटा स्रोत आणि सत्यता सूचना',
    sectionSettlementSummary: 'व्यवहार पेमेंट आणि शिल्लक रक्कम तपशील',
    companyNameLabel: 'वीज वितरण कंपनी',
    gujaratiTitleLabel: 'अधिकृत गुजराती नाव',
    missionTaglineLabel: 'कॉर्पोरेट मिशन घोषवाक्य',
    cinLabel: 'कॉर्पोरेट ओळख क्रमांक (CIN)',
    registeredOfficeLabel: 'नोंदणीकृत कॉर्पोरेट कार्यालय',
    accountIdLabel: 'ग्राहक खाते ID',
    connectionIdLabel: 'सर्व्हिस कनेक्शन ID',
    serviceAddressLabel: 'सेवा परिसर पत्ता',
    sanctionedLoadLabel: 'मंजूर लोड (Sanctioned Load)',
    meterNumberLabel: 'स्मार्ट मीटर सिरीयल क्र.',
    meterPhaseLabel: 'सप्लाय फेज',
    billIssueDateLabel: 'बिल जारी तारीख',
    dueDateLabel: 'देय तारीख (Due Date)',
    currentBillAmountLabel: 'एकूण बिल रक्कम',
    previouslyPaidAmountLabel: 'पूर्वी भरलेली / समायोजित रक्कम',
    remainingAmountPayableLabel: 'उर्वरित देय रक्कम',
    previousMeterReadingLabel: 'मागील मीटर रीडिंग',
    currentMeterReadingLabel: 'सध्याचे मीटर रीडिंग',
    readingDateLabel: 'मीटर रीडिंग तारीख',
    readingSourceLabel: 'रीडिंग वर्गीकरण',
    readingSourceRecorded: 'RECORDED (नोंदवलेले मीटर रजिस्टर रीडिंग)',
    readingSourceSimulated: 'SIMULATED (सिम्युलेटेड DEMO सायकल वापर)',
    readingNotRecordedNotice: 'सिम्युलेटेड DEMO सायकल वापर आधार',
    slabTableTitle: 'स्लॅब-निहाय ऊर्जा आकार तपशील',
    slabColDescription: 'टॅरिफ स्लॅब',
    slabColUnits: 'युनिट्स (kWh)',
    slabColRate: 'दर (₹/kWh)',
    slabColAmount: 'स्लॅब रक्कम (₹)',
    chargeTableTitle: 'संपूर्ण बिल आकार आणि ताळमेळ विवरण',
    chargeColComponent: 'आकार घटक',
    chargeColAmount: 'रक्कम (₹)',
    reconciliationVerifiedText: 'तपासलेले: सर्व आकार घटक एकूण बिल रकमेेशी जुळतात.',
    reconciliationMismatchWarning:
      'डेटा अखंडता सूचना: आकार घटकांची बेरीज आणि मूळ बिल रकमेत फरक आहे. मूळ बिल रक्कम कायम ठेवली आहे.',
    amountPaidInThisTxLabel: 'या व्यवहारात भरलेली रक्कम',
    totalBillAmountLabel: 'एकूण बिल रक्कम',
    previouslySettledAmountLabel: 'पूर्वी भरलेली रक्कम',
    remainingBalanceAfterPaymentLabel: 'या पेमेंटनंतर उर्वरित देय रक्कम',
    settlementClassificationLabel: 'पेमेंट वर्गीकरण',
    fullSettlementBadge: 'पूर्ण पेमेंट (उर्वरित शिल्लक ₹0)',
    partialSettlementBadge: 'अंशतः पेमेंट (उर्वरित रक्कम देय आहे)',
    demoElectricityBillDisclosure:
      'DEMO वीज बिल — हा दस्तऐवज VidyutFlow 2.0 मधील सिम्युलेटेड (DEMO) वीज बिल दर्शवतो. हे UGVCL कडून जारी केलेले वैधानिक कर बीजक नाही.',
    nextStepsTitle: 'महत्त्वाचे मार्गदर्शन आणि पुढील टप्पे',
    previousBillsTableTitle: 'मागील बिलिंग इतिहास आणि देयक ताळमेळ (मागील 3 बिलिंग चक्र)',
    colPeriod: 'बिलिंग कालावधी',
    colUnits: 'वापर (kWh)',
    colBilledAmount: 'बिल रक्कम (₹)',
    colPaidAmount: 'भरलेली रक्कम (₹)',
    colRemainingBalance: 'उर्वरित रक्कम (₹)',
    colStatus: 'स्थिती',
    noPreviousBillsMessage: 'या सर्व्हिस कनेक्शनसाठी कोणतेही मागील बिलिंग रेकॉर्ड आढळले नाही.',
    sectionReverseTariffSchedule: 'H. UGVCL वैधानिक टॅरिफ अनुसूची आणि स्लॅब रचना',
    sectionReverseCalculation: 'I. ऊर्जा आकार, FPPPA आणि वैधानिक वीज कर गणना तत्त्वे',
    sectionReverseBillingTerms: 'J. बिलिंग अटी, सवलत कालावधी आणि डिजिटल पेमेंट मार्गदर्शक तत्त्वे',
    sectionReverseSafety: 'K. ग्राहक विद्युत सुरक्षा आणि ऊर्जा संवर्धन मार्गदर्शक तत्त्वे',
    sectionReverseGrievance: 'L. केंद्रीकृत तक्रार निवारण आणि ग्राहक साहाय्यता निर्देशिका',
    sectionReverseLegalNotice: 'M. वैधानिक कायदेशीर सूचना आणि DEMO सत्यता प्रकटीकरण',
  },
};

/**
 * Role and ownership access check for official documents.
 * Strictly enforces:
 * - Consumer: only own bills, payments, applications, complaints, service requests; never inspection summaries.
 * - Employee: operational acknowledgments, bills & receipts within subdivision jurisdiction.
 * - Field Engineer: only inspection summaries for work orders assigned to that Field Engineer.
 * - Management / Admin: no universal access to private consumer receipts.
 */
export function authorizeDocumentAccess(
  role: UserRole,
  actor: ExportActorIdentity,
  documentType: OfficialDocumentType,
  record: Record<string, unknown>
): boolean {
  if (!record || typeof record !== 'object') return false;

  if (role === 'consumer') {
    if (documentType === 'inspection_summary') {
      return false;
    }
    return isRecordOwnedByConsumer(record, actor);
  }

  if (role === 'employee') {
    const recSubdivision =
      typeof record.subdivision === 'string' ? record.subdivision : undefined;
    return isEmployeeAuthorizedForExportSubdivision(actor.subdivision, recSubdivision);
  }

  if (role === 'field') {
    if (documentType !== 'inspection_summary') {
      return false;
    }
    return isWorkOrderAssignedToFieldEngineer(record, actor);
  }

  // Management and Admin do not have universal access to private consumer receipts or field inspection summaries
  return false;
}

/**
 * Classifies an application's current lifecycle stage to ensure submission is never confused with approval.
 */
export function classifyApplicationLifecycleStage(
  status: NewConnectionApplication['status'] | string
): ApplicationLifecycleClassification {
  switch (status) {
    case 'Submitted':
      return 'SUBMITTED_PENDING_REVIEW';
    case 'Document Verification':
    case 'Site Inspection':
      return 'UNDER_TECHNICAL_REVIEW';
    case 'Sanction Approval':
      return 'SANCTIONED_OR_APPROVED';
    case 'Meter Installed':
      return 'ENERGIZED_METER_INSTALLED';
    case 'Rejected':
      return 'REJECTED';
    default:
      return 'SUBMITTED_PENDING_REVIEW';
  }
}

export interface GenerateElectricityBillInput {
  role?: UserRole;
  actor?: ExportActorIdentity;
  bill?: ElectricityBill | null;
  connection?: ElectricityConnection | null;
  payments?: PaymentTransaction[];
  allBills?: ElectricityBill[];
  language?: Language;
  dataSource?: string;
  referenceDate?: string;
  calculationTimestampIst?: string;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
}

export function localizeSlabDescription(slab: string, language: Language): string {
  if (language === 'en' || !slab) return slab;
  const trimmed = slab.trim();

  // Exact match map for common slab strings
  const exactMap: Record<string, Record<Language, string>> = {
    'First 50 Units (0-50 kWh)': {
      en: 'First 50 Units (0-50 kWh)',
      gu: 'પ્રથમ 50 યુનિટ (0-50 kWh)',
      hi: 'प्रथम 50 यूनिट (0-50 kWh)',
      mr: 'पहिले 50 युनिट (0-50 kWh)',
    },
    'First 50 Units': {
      en: 'First 50 Units',
      gu: 'પ્રથમ 50 યુનિટ',
      hi: 'प्रथम 50 यूनिट',
      mr: 'पहिले 50 युनिट',
    },
    'Next 50 Units (51-100 kWh)': {
      en: 'Next 50 Units (51-100 kWh)',
      gu: 'આગળના 50 યુનિટ (51-100 kWh)',
      hi: 'अगले 50 यूनिट (51-100 kWh)',
      mr: 'पुढील 50 युनिट (51-100 kWh)',
    },
    'Next 50 Units': {
      en: 'Next 50 Units',
      gu: 'આગળના 50 યુનિટ',
      hi: 'अगले 50 यूनिट',
      mr: 'पुढील 50 युनिट',
    },
    'Next 150 Units (101-250 kWh)': {
      en: 'Next 150 Units (101-250 kWh)',
      gu: 'આગળના 150 યુનિટ (101-250 kWh)',
      hi: 'अगले 150 यूनिट (101-250 kWh)',
      mr: 'पुढील 150 युनिट (101-250 kWh)',
    },
    'Next 150 Units': {
      en: 'Next 150 Units',
      gu: 'આગળના 150 યુનિટ',
      hi: 'अगले 150 यूनिट',
      mr: 'पुढील 150 युनिट',
    },
    'Above 250 Units (>250 kWh)': {
      en: 'Above 250 Units (>250 kWh)',
      gu: '250 યુનિટથી વધુ (>250 kWh)',
      hi: '250 यूनिट से अधिक (>250 kWh)',
      mr: '250 युनिटपेक्षा जास्त (>250 kWh)',
    },
    'Above 250 Units': {
      en: 'Above 250 Units',
      gu: '250 યુનિટથી વધુ',
      hi: '250 यूनिट से अधिक',
      mr: '250 युनिटपेक्षा जास्त',
    },
    'First 100 Units (0-100 kWh, 2-Month Bi-Monthly)': {
      en: 'First 100 Units (0-100 kWh, 2-Month Bi-Monthly)',
      gu: 'પ્રથમ 100 યુનિટ (0-100 kWh, ૨-મહિના દ્વિ-માસિક)',
      hi: 'प्रथम 100 यूनिट (0-100 kWh, २-माह द्वैमासिक)',
      mr: 'पहिले 100 युनिट (0-100 kWh, २-महिने द्वैमासिक)',
    },
    'Next 100 Units (101-200 kWh, 2-Month Bi-Monthly)': {
      en: 'Next 100 Units (101-200 kWh, 2-Month Bi-Monthly)',
      gu: 'આગળના 100 યુનિટ (101-200 kWh, ૨-મહિના દ્વિ-માસિક)',
      hi: 'अगले 100 यूनिट (101-200 kWh, २-माह द्वैमासिक)',
      mr: 'पुढील 100 युनिट (101-200 kWh, २-महिने द्वैमासिक)',
    },
    'Next 300 Units (201-500 kWh, 2-Month Bi-Monthly)': {
      en: 'Next 300 Units (201-500 kWh, 2-Month Bi-Monthly)',
      gu: 'આગળના 300 યુનિટ (201-500 kWh, ૨-મહિના દ્વિ-માસિક)',
      hi: 'अगले 300 यूनिट (201-500 kWh, २-माह द्वैमासिक)',
      mr: 'पुढील 300 युनिट (201-500 kWh, २-महिने द्वैमासिक)',
    },
    'Above 500 Units (>500 kWh, 2-Month Bi-Monthly)': {
      en: 'Above 500 Units (>500 kWh, 2-Month Bi-Monthly)',
      gu: '500 યુનિટથી વધુ (>500 kWh, ૨-મહિના દ્વિ-માસિક)',
      hi: '500 यूनिट से अधिक (>500 kWh, २-माह द्वैमासिक)',
      mr: '500 युनिटपेक्षा जास्त (>500 kWh, २-महिने द्वैमासिक)',
    },
    'Commercial Commercial Tariff Rate': {
      en: 'Commercial Commercial Tariff Rate',
      gu: 'વાણિજ્યિક (NRGP) ટેરિફ દર',
      hi: 'वाणिज्यिक (NRGP) टैरिफ दर',
      mr: 'व्यावसायिक (NRGP) टॅरिफ दर',
    },
    'Commercial (NRGP) Flat Energy Rate': {
      en: 'Commercial (NRGP) Flat Energy Rate',
      gu: 'વાણિજ્યિક (NRGP) સમાન એનર્જી દર',
      hi: 'वाणिज्यिक (NRGP) समान ऊर्जा दर',
      mr: 'व्यावसायिक (NRGP) समान ऊर्जा दर',
    },
    'Industrial (LTMD) Energy Rate': {
      en: 'Industrial (LTMD) Energy Rate',
      gu: 'ઔદ્યોગિક (LTMD) એનર્જી દર',
      hi: 'औद्योगिक (LTMD) ऊर्जा दर',
      mr: 'औद्योगिक (LTMD) ऊर्जा दर',
    },
    'Agricultural (AG) Subsidized Rate': {
      en: 'Agricultural (AG) Subsidized Rate',
      gu: 'કૃષિ (AG) સબસિડીયુક્ત દર',
      hi: 'कृषि (AG) सब्सिडीयुक्त दर',
      mr: 'कृषी (AG) अनुदानित दर',
    },
  };

  if (exactMap[trimmed]?.[language]) {
    return exactMap[trimmed][language];
  }

  // Pattern fallback for custom slab labels
  return trimmed
    .replace(/^First\s+(\d+)\s+Units/i, (_, n) =>
      language === 'gu'
        ? `પ્રથમ ${n} યુનિટ`
        : language === 'hi'
        ? `प्रथम ${n} यूनिट`
        : `पहिले ${n} युनिट`
    )
    .replace(/^Next\s+(\d+)\s+Units/i, (_, n) =>
      language === 'gu'
        ? `આગળના ${n} યુનિટ`
        : language === 'hi'
        ? `अगले ${n} यूनिट`
        : `पुढील ${n} युनिट`
    )
    .replace(/^Above\s+(\d+)\s+Units/i, (_, n) =>
      language === 'gu'
        ? `${n} યુનિટથી વધુ`
        : language === 'hi'
        ? `${n} यूनिट से अधिक`
        : `${n} युनिटपेक्षा जास्त`
    );
}

const CHART_I18N: Record<
  Language,
  {
    chartTitle: string;
    chartSubtitle: string;
    seriesALabel: string;
    seriesBLabel: string;
    missingDataLegendLabel: string;
    missingPeriodNote: string;
  }
> = {
  en: {
    chartTitle: '5. SIX BI-MONTHLY PERIOD CONSUMPTION COMPARISON CHART (kWh)',
    chartSubtitle: '6 Chronological 2-Month Cycles · Bar 1: Actual Billed kWh vs Bar 2: 2-Month Benchmark kWh',
    seriesALabel: 'Actual Billed (kWh)',
    seriesBLabel: '2-Month Benchmark (kWh)',
    missingDataLegendLabel: 'N/A = Prior period not in recorded history (no fabricated readings)',
    missingPeriodNote: 'No recorded consumption history for this 2-month period.',
  },
  gu: {
    chartTitle: '5. છ દ્વિ-માસિક ગાળાનો વીજ વપરાશ તુલનાત્મક ચાર્ટ (kWh)',
    chartSubtitle: '૬ કાળક્રમિક ૨-મહિનાના ચક્રો · બાર 1: વાસ્તવિક બિલ (kWh) વિ. બાર 2: ૨-મહિના બેન્ચમાર્ક (kWh)',
    seriesALabel: 'વાસ્તવિક વપરાશ (kWh)',
    seriesBLabel: '૨-મહિના બેન્ચમાર્ક (kWh)',
    missingDataLegendLabel: 'N/A = અગાઉના ગાળાનો રેકોર્ડ ઉપલબ્ધ નથી (કોઈ કાલ્પનિક રીડિંગ નથી)',
    missingPeriodNote: 'આ ૨-મહિનાના ગાળા માટે કોઈ નોંધાયેલ વપરાશ ઇતિહાસ નથી.',
  },
  hi: {
    chartTitle: '5. छह द्वि-मासिक चक्र उपभोग तुलनात्मक चार्ट (kWh)',
    chartSubtitle: '६ कालानुक्रमिक २-माह चक्र · बार 1: वास्तविक बिल (kWh) बनाम बार 2: २-माह बेंचमार्क (kWh)',
    seriesALabel: 'वास्तविक खपत (kWh)',
    seriesBLabel: '२-माह बेंचमार्क (kWh)',
    missingDataLegendLabel: 'N/A = पूर्व अवधि का दर्ज इतिहास उपलब्ध नहीं (कोई काल्पनिक रीडिंग नहीं)',
    missingPeriodNote: 'इस २-माह की अवधि के लिए कोई दर्ज उपभोग इतिहास नहीं है।',
  },
  mr: {
    chartTitle: '5. सहा द्वि-मासिक कालावधी वीज वापर तुलनात्मक आलेख (kWh)',
    chartSubtitle: '६ कालक्रमानुसार २-महिन्यांचे चक्र · बार 1: प्रत्यक्ष वापर (kWh) वि. बार 2: २-महिने बेंचमार्क (kWh)',
    seriesALabel: 'प्रत्यक्ष वापर (kWh)',
    seriesBLabel: '२-महिने बेंचमार्क (kWh)',
    missingDataLegendLabel: 'N/A = मागील कालावधीचा नोंदवलेला इतिहास उपलब्ध नाही (कोणतीही काल्पनिक नोंद नाही)',
    missingPeriodNote: 'या २-महिन्यांच्या कालावधीसाठी कोणताही नोंदवलेला वापर इतिहास नाही.',
  },
};

const REVERSE_SECTIONS_I18N: Record<
  Language,
  {
    tariffRgpuLabel: string;
    tariffRgpuValue: string;
    tariffNrgpLabel: string;
    tariffNrgpValue: string;
    tariffAgLabel: string;
    tariffAgValue: string;
    fixedDemandLabel: string;
    fixedDemandValue: string;
    energyFormulaLabel: string;
    energyFormulaValue: string;
    fpppaFormulaLabel: string;
    fpppaFormulaValue: string;
    electricityDutyRuleLabel: string;
    electricityDutyRuleValue: string;
    delayedSurchargeRuleLabel: string;
    delayedSurchargeRuleValue: string;
    dueGracePeriodLabel: string;
    dueGracePeriodValue: string;
    digitalPaymentOptionsLabel: string;
    digitalPaymentOptionsValue: string;
    advanceRebateLabel: string;
    advanceRebateValue: string;
    disconnectionWarningLabel: string;
    disconnectionWarningValue: string;
    elcbMandateLabel: string;
    elcbMandateValue: string;
    clearanceStandardsLabel: string;
    clearanceStandardsValue: string;
    wiringStandardsLabel: string;
    wiringStandardsValue: string;
    emergencyHelplineLabel: string;
    emergencyHelplineValue: string;
    subdivisionHelpLabel: string;
    subdivisionHelpValue: string;
    cgrfForumLabel: string;
    cgrfForumValue: string;
    ombudsmanOfficeLabel: string;
    ombudsmanOfficeValue: string;
    callCenterLabel: string;
    callCenterValue: string;
    statutoryActLabel: string;
    statutoryActValue: string;
    corporateRegLabel: string;
    corporateRegValue: string;
    demoDisclosureLabel: string;
    demoDisclosureValue: string;
  }
> = {
  en: {
    tariffRgpuLabel: 'RGPU Residential Slabs (GERC Tariff Order)',
    tariffRgpuValue:
      '0–50 kWh @ ₹3.05/u | 51–100 kWh @ ₹3.50/u | 101–250 kWh @ ₹4.15/u | >250 kWh @ ₹5.20/u',
    tariffNrgpLabel: 'NRGP Commercial Slabs',
    tariffNrgpValue: '0–10 kW @ ₹4.50/unit | Above 10 kW @ ₹5.50/unit',
    tariffAgLabel: 'AG Agricultural Metered',
    tariffAgValue: 'Borewell / Farm Supply @ ₹0.80/unit flat rate',
    fixedDemandLabel: 'Fixed Monthly Charges',
    fixedDemandValue:
      'Single-Phase up to 2 kW @ ₹25/mo | 2–4 kW @ ₹40/mo | 3-Phase @ ₹65/kW/mo',
    energyFormulaLabel: 'Energy Charges Principle',
    energyFormulaValue: 'Sum of (Billed Units in Slab × Applicable GERC Slab Rate).',
    fpppaFormulaLabel: 'Fuel & Power Purchase Adjustment (FPPPA)',
    fpppaFormulaValue: 'Billed kWh × GERC Approved FPPPA Rate (Quarterly fuel cost recovery).',
    electricityDutyRuleLabel: 'Government Electricity Duty',
    electricityDutyRuleValue:
      '15% on Energy Charges for Residential Premises under Gujarat Electricity Duty Act.',
    delayedSurchargeRuleLabel: 'Delayed Payment Surcharge (DPS)',
    delayedSurchargeRuleValue:
      '15% per annum on unpaid principal if paid after the specified Due Date.',
    dueGracePeriodLabel: 'Due Date & Grace Period',
    dueGracePeriodValue:
      'Payment due within 15 days of bill date. 7-day grace window prior to Section 56 notice.',
    digitalPaymentOptionsLabel: 'Authorized Payment Channels',
    digitalPaymentOptionsValue:
      'UGVCL Portal (ugvcl.com), VidyutOne App, BBPS, UPI, Net Banking, and Sub-div counters.',
    advanceRebateLabel: 'Prompt Payment Rebate',
    advanceRebateValue:
      '1% rebate on energy charges for online settlement 5 days prior to due date.',
    disconnectionWarningLabel: 'Default & Supply Notice',
    disconnectionWarningValue:
      'Non-payment after grace period renders connection liable to disconnection under EA 2003.',
    elcbMandateLabel: 'Earth Leakage Protection (ELCB / RCCB)',
    elcbMandateValue:
      'Mandatory installation of 30mA trip RCCB for domestic and commercial installations.',
    clearanceStandardsLabel: 'Overhead Line Clearance',
    clearanceStandardsValue:
      'Maintain min 2.5m vertical and 1.5m horizontal clearance from distribution lines.',
    wiringStandardsLabel: 'BIS Standard Wiring',
    wiringStandardsValue:
      'Use only ISI-marked wires, 3-pin earthed sockets, and avoid overloading circuits.',
    emergencyHelplineLabel: 'Electrical Accident / Fire Emergency',
    emergencyHelplineValue:
      'Switch off main breaker immediately. Call 19122 / 1800 233 155335 without delay.',
    subdivisionHelpLabel: 'Sub-Divisional Jurisdiction',
    subdivisionHelpValue:
      'Executive Engineer / Sub-Divisional Officer, Mehsana & Regional Circles.',
    cgrfForumLabel: 'Consumer Grievance Redressal Forum (CGRF)',
    cgrfForumValue: 'UGVCL CGRF, Regd. Office, Visnagar Road, Mehsana - 384001.',
    ombudsmanOfficeLabel: 'Electricity Ombudsman (Gujarat)',
    ombudsmanOfficeValue:
      'Barrack No. 3, Polytechnic Campus, Ambawadi, Ahmedabad - 380015.',
    callCenterLabel: '24x7 Customer Care & Helpline',
    callCenterValue: 'Toll-Free: 19122 / 1800 233 155335 | Email: support@ugvcl.com',
    statutoryActLabel: 'Statutory Distribution Authority',
    statutoryActValue:
      'Issued under Gujarat Electricity Regulatory Commission (GERC) Supply Code.',
    corporateRegLabel: 'UGVCL Registered Entity',
    corporateRegValue: `${UGVCL_COMPANY_NAME_EN} · CIN: ${UGVCL_CORPORATE_IDENTITY.cin}`,
    demoDisclosureLabel: 'Simulation & Demo Notice',
    demoDisclosureValue:
      'VidyutFlow 2.0 demonstration system. Simulated utility records for prototype purposes.',
  },
  gu: {
    tariffRgpuLabel: 'RGPU રહેણાંક ટેરિફ સ્લેબ (GERC ટેરિફ ઓર્ડર)',
    tariffRgpuValue:
      '0–50 kWh @ ₹3.05/યુનિટ | 51–100 kWh @ ₹3.50/યુનિટ | 101–250 kWh @ ₹4.15/યુનિટ | >250 kWh @ ₹5.20/યુનિટ (દ્વિ-માસિક ૨x પ્રમાણસર સ્લેબ)',
    tariffNrgpLabel: 'NRGP વાણિજ્યિક ટેરિફ સ્લેબ',
    tariffNrgpValue: '0–10 kW @ ₹4.50/યુનિટ | 10 kW થી વધુ @ ₹5.50/યુનિટ',
    tariffAgLabel: 'AG કૃષિ મીટર આધારિત જોડાણ',
    tariffAgValue: 'બોરવેલ / ખેતીવાડી વીજ પુરવઠો @ ₹0.80/યુનિટ સમાન દર',
    fixedDemandLabel: 'માસિક / દ્વિ-માસિક ફિક્સ ચાર્જ',
    fixedDemandValue:
      '૧-ફેઝ 2 kW સુધી @ ₹25/માસ | 2–4 kW @ ₹40/માસ | ૩-ફેઝ @ ₹65/kW/માસ (દ્વિ-માસિક બિલમાં ૨ મહિના મુજબ)',
    energyFormulaLabel: 'એનર્જી ચાર્જ ગણતરીનો સિદ્ધાંત',
    energyFormulaValue: 'દરેક સ્લેબના બિલ કરેલ યુનિટ × લાગુ પડતો GERC સ્લેબ દર નો સરવાળો.',
    fpppaFormulaLabel: 'ફ્યુઅલ અને પાવર પરચેઝ એડજસ્ટમેન્ટ (FPPPA)',
    fpppaFormulaValue: 'બિલ કરેલ kWh × GERC માન્ય ત્રિમાસિક FPPPA દર (ઈંધણ ખર્ચ સમાયોજન).',
    electricityDutyRuleLabel: 'ગુજરાત સરકાર વીજળી શુલ્ક (Electricity Duty)',
    electricityDutyRuleValue:
      'ગુજરાત વીજળી શુલ્ક અધિનિયમ હેઠળ રહેણાંક પરિસર માટે એનર્જી ચાર્જના 15%.',
    delayedSurchargeRuleLabel: 'વિલંબિત ચુકવણી સરચાર્જ (DPS / DPC)',
    delayedSurchargeRuleValue:
      'નિયત તારીખ (Due Date) પછી ચુકવણી કરવા પર બાકી મૂળ રકમ પર વાર્ષિક 15% લેખે સરચાર્જ.',
    dueGracePeriodLabel: 'ચુકવણીની મુદત અને ગ્રેસ પીરિયડ',
    dueGracePeriodValue:
      'બિલ તારીખથી 15 દિવસમાં ચુકવણી કરવી. કલમ 56(1) નોટિસ પહેલાં 7 દિવસનો ગ્રેસ સમયગાળો.',
    digitalPaymentOptionsLabel: 'અધિકૃત ડિજિટલ ચુકવણી માધ્યમો',
    digitalPaymentOptionsValue:
      'UGVCL પોર્ટલ (ugvcl.com), VidyutOne એપ, BBPS, UPI, નેટ બેંકિંગ અને સબ-ડિવિઝન કેશ કાઉન્ટર.',
    advanceRebateLabel: 'સમયસર ચુકવણી રિબેટ (Prompt Rebate)',
    advanceRebateValue:
      'ડ્યુ ડેટથી 5 દિવસ પહેલાં ઓનલાઇન ચુકવણી કરવા પર એનર્જી ચાર્જમાં 1% રિબેટ.',
    disconnectionWarningLabel: 'વીજ પુરવઠો સ્થગિત કરવાની વૈધાનિક સૂચના',
    disconnectionWarningValue:
      'ગ્રેસ પીરિયડ પછી બિલ ન ભરવામાં આવે તો વીજ અધિનિયમ 2003 (EA 2003) હેઠળ જોડાણ કાપવાપાત્ર રહેશે.',
    elcbMandateLabel: 'અર્થ લીકેજ પ્રોટેક્શન (ELCB / RCCB)',
    elcbMandateValue:
      'રહેણાંક અને વાણિજ્યિક જોડાણોમાં વીજ અકસ્માત નિવારવા 30mA RCCB/ELCB લગાવવું ફરજિયાત છે.',
    clearanceStandardsLabel: 'ઓવરહેડ વીજ લાઇનથી સુરક્ષિત અંતર',
    clearanceStandardsValue:
      'વીજ વિતરણ લાઇનથી ઓછામાં ઓછું 2.5m ઊભું અને 1.5m આડું સુરક્ષિત અંતર જાળવો.',
    wiringStandardsLabel: 'BIS પ્રમાણિત વાયરિંગ ધોરણો',
    wiringStandardsValue:
      'માત્ર ISI માર્કવાળા વાયર, 3-પિન અર્થિંગ સોકેટ વાપરો અને સર્કિટ પર ઓવરલોડ ટાળો.',
    emergencyHelplineLabel: 'વીજ અકસ્માત / આગ કટોકટી હેલ્પલાઇન',
    emergencyHelplineValue:
      'મુખ્ય સ્વિચ તરત જ બંધ કરો. વિલંબ કર્યા વિના 19122 / 1800 233 155335 પર સંપર્ક કરો.',
    subdivisionHelpLabel: 'સબ-ડિવિઝનલ કાર્યક્ષેત્ર કચેરી',
    subdivisionHelpValue:
      'કાર્યપાલક ઇજનેર / નાયબ ઇજનેર (SDO), મહેસાણા અને પ્રાદેશિક વર્તુળ કચેરીઓ.',
    cgrfForumLabel: 'ગ્રાહક ફરિયાદ નિવારણ ફોરમ (CGRF)',
    cgrfForumValue: 'UGVCL CGRF, રજિસ્ટર્ડ ઓફિસ, વિસનગર રોડ, મહેસાણા - 384001 (Section 42(5)).',
    ombudsmanOfficeLabel: 'વીજ લોકપાલ (Electricity Ombudsman Gujarat)',
    ombudsmanOfficeValue:
      'બેરેક નં. 3, પોલિટેકનિક કેમ્પસ, અંબાવાડી, અમદાવાદ - 380015 (Section 42(6), EA 2003).',
    callCenterLabel: '24x7 ગ્રાહક સહાયતા અને હેલ્પલાઇન',
    callCenterValue: 'ટોલ-ફ્રી: 19122 / 1800 233 155335 | ઇમેઇલ: support@ugvcl.com',
    statutoryActLabel: 'વૈધાનિક વીજ વિતરણ સત્તામંડળ',
    statutoryActValue:
      'ગુજરાત વીજળી નિયમન પંચ (GERC) સપ્લાય કોડ હેઠળ જારી કરાયેલ.',
    corporateRegLabel: 'UGVCL નોંધાયેલ કોર્પોરેટ સંસ્થા',
    corporateRegValue: `${UGVCL_COMPANY_NAME_EN} · CIN: ${UGVCL_CORPORATE_IDENTITY.cin}`,
    demoDisclosureLabel: 'સિમ્યુલેશન અને DEMO પારદર્શિતા નોંધ',
    demoDisclosureValue:
      'VidyutFlow 2.0 ડેમોન્સ્ટ્રેશન સિસ્ટમ. પ્રોટોટાઇપ હેતુ માટે સિમ્યુલેટેડ યુટિલિટી રેકોર્ડ.',
  },
  hi: {
    tariffRgpuLabel: 'RGPU आवासीय टैरिफ स्लैब (GERC टैरिफ आदेश)',
    tariffRgpuValue:
      '0–50 kWh @ ₹3.05/यूनिट | 51–100 kWh @ ₹3.50/यूनिट | 101–250 kWh @ ₹4.15/यूनिट | >250 kWh @ ₹5.20/यूनिट (द्वैमासिक २x आनुपातिक स्लैब)',
    tariffNrgpLabel: 'NRGP वाणिज्यिक टैरिफ स्लैब',
    tariffNrgpValue: '0–10 kW @ ₹4.50/यूनिट | 10 kW से अधिक @ ₹5.50/यूनिट',
    tariffAgLabel: 'AG कृषि मीटरयुक्त आपूर्ति',
    tariffAgValue: 'बोरवेल / कृषि विद्युत आपूर्ति @ ₹0.80/यूनिट समान दर',
    fixedDemandLabel: 'मासिक / द्वैमासिक स्थायी शुल्क (Fixed Charges)',
    fixedDemandValue:
      '१-फेज़ 2 kW तक @ ₹25/माह | 2–4 kW @ ₹40/माह | ३-फेज़ @ ₹65/kW/माह (द्वैमासिक बिल में २ माह अनुसार)',
    energyFormulaLabel: 'ऊर्जा शुल्क गणना सिद्धांत',
    energyFormulaValue: 'प्रत्येक स्लैब में बिल की गई यूनिट × लागू GERC स्लैब दर का योग।',
    fpppaFormulaLabel: 'ईंधन एवं विद्युत क्रय समायोजन (FPPPA)',
    fpppaFormulaValue: 'बिल किए गए kWh × GERC अनुमोदित त्रैमासिक FPPPA दर (ईंधन लागत समायोजन)।',
    electricityDutyRuleLabel: 'सरकारी विद्युत शुल्क (Electricity Duty)',
    electricityDutyRuleValue:
      'गुजरात विद्युत शुल्क अधिनियम के अंतर्गत आवासीय परिसर हेतु ऊर्जा शुल्क पर 15%।',
    delayedSurchargeRuleLabel: 'विलंबित भुगतान अधिभार (DPS / DPC)',
    delayedSurchargeRuleValue:
      'निर्धारित देय तिथि (Due Date) के बाद भुगतान करने पर बकाया मूल राशि पर 15% वार्षिक अधिभार।',
    dueGracePeriodLabel: 'देय तिथि एवं ग्रेस अवधि',
    dueGracePeriodValue:
      'बिल तिथि से 15 दिनों के भीतर भुगतान देय। धारा 56(1) नोटिस से पूर्व 7 दिन की ग्रेस अवधि।',
    digitalPaymentOptionsLabel: 'अधिकृत डिजिटल भुगतान माध्यम',
    digitalPaymentOptionsValue:
      'UGVCL पोर्टल (ugvcl.com), VidyutOne ऐप, BBPS, UPI, नेट बैंकिंग एवं सब-डिवीजन काउंटर।',
    advanceRebateLabel: 'त्वरित भुगतान छूट (Prompt Payment Rebate)',
    advanceRebateValue:
      'देय तिथि से 5 दिन पूर्व ऑनलाइन भुगतान करने पर ऊर्जा शुल्क में 1% की छूट।',
    disconnectionWarningLabel: 'डिफ़ॉल्ट एवं विद्युत विच्छेदन सूचना',
    disconnectionWarningValue:
      'ग्रेस अवधि के बाद भुगतान न करने पर विद्युत अधिनियम 2003 (EA 2003) के तहत कनेक्शन विच्छेदित किया जा सकता है।',
    elcbMandateLabel: 'अर्थ लीकेज सुरक्षा (ELCB / RCCB)',
    elcbMandateValue:
      'आवासीय एवं वाणिज्यिक परिसरों में विद्युत दुर्घटना से बचाव हेतु 30mA RCCB लगाना अनिवार्य है।',
    clearanceStandardsLabel: 'ओवरहेड लाइन से सुरक्षित दूरी',
    clearanceStandardsValue:
      'वितरण लाइनों से न्यूनतम 2.5m लंबवत और 1.5m क्षैतिज सुरक्षित दूरी बनाए रखें।',
    wiringStandardsLabel: 'BIS मानक वायरिंग निर्देश',
    wiringStandardsValue:
      'केवल ISI मार्क वाले तार और 3-पिन अर्थिंग सॉकेट का उपयोग करें तथा सर्किट ओवरलोडिंग से बचें।',
    emergencyHelplineLabel: 'विद्युत दुर्घटना / अग्नि आपातकालीन हेल्पलाइन',
    emergencyHelplineValue:
      'मुख्य ब्रेकर तुरंत बंद करें। बिना देरी किए 19122 / 1800 233 155335 पर कॉल करें।',
    subdivisionHelpLabel: 'उप-प्रभागीय (Sub-Divisional) अधिकार क्षेत्र',
    subdivisionHelpValue:
      'कार्यपालक अभियंता / उप-प्रभागीय अधिकारी (SDO), महेसाणा एवं क्षेत्रीय सर्कल।',
    cgrfForumLabel: 'उपभोक्ता शिकायत निवारण फोरम (CGRF)',
    cgrfForumValue: 'UGVCL CGRF, पंजीकृत कार्यालय, विसनगर रोड, महेसाणा - 384001 (Section 42(5))।',
    ombudsmanOfficeLabel: 'विद्युत लोकपाल (Electricity Ombudsman Gujarat)',
    ombudsmanOfficeValue:
      'बैरक नं. 3, पॉलिटेक्निक परिसर, अंबावाड़ी, अहमदाबाद - 380015 (Section 42(6), EA 2003)।',
    callCenterLabel: '24x7 उपभोक्ता सहायता एवं हेल्पलाइन',
    callCenterValue: 'टोल-फ्री: 19122 / 1800 233 155335 | ईमेल: support@ugvcl.com',
    statutoryActLabel: 'वैधानिक वितरण प्राधिकरण',
    statutoryActValue:
      'गुजरात विद्युत नियामक आयोग (GERC) सप्लाई कोड के अंतर्गत जारी।',
    corporateRegLabel: 'UGVCL पंजीकृत कॉर्पोरेट संस्था',
    corporateRegValue: `${UGVCL_COMPANY_NAME_EN} · CIN: ${UGVCL_CORPORATE_IDENTITY.cin}`,
    demoDisclosureLabel: 'सिम्युलेशन एवं DEMO पारदर्शिता सूचना',
    demoDisclosureValue:
      'VidyutFlow 2.0 प्रदर्शन प्रणाली। प्रोटोटाइप उद्देश्य हेतु सिम्युलेटेड यूटिलिटी रिकॉर्ड।',
  },
  mr: {
    tariffRgpuLabel: 'RGPU निवासी टॅरिफ स्लॅब (GERC टॅरिफ आदेश)',
    tariffRgpuValue:
      '0–50 kWh @ ₹3.05/युनिट | 51–100 kWh @ ₹3.50/युनिट | 101–250 kWh @ ₹4.15/युनिट | >250 kWh @ ₹5.20/युनिट (द्वैमासिक २x प्रमाणबद्ध स्लॅब)',
    tariffNrgpLabel: 'NRGP व्यावसायिक टॅरिफ स्लॅब',
    tariffNrgpValue: '0–10 kW @ ₹4.50/युनिट | 10 kW पेक्षा जास्त @ ₹5.50/युनिट',
    tariffAgLabel: 'AG कृषी मीटरयुक्त पुरवठा',
    tariffAgValue: 'बोअरवेल / शेती वीज पुरवठा @ ₹0.80/युनिट समान दर',
    fixedDemandLabel: 'मासिक / द्वैमासिक स्थिर आकार (Fixed Charges)',
    fixedDemandValue:
      '१-फेज 2 kW पर्यंत @ ₹25/महिना | 2–4 kW @ ₹40/महिना | ३-फेज @ ₹65/kW/महिना (द्वैमासिक बिलात २ महिन्यांनुसार)',
    energyFormulaLabel: 'ऊर्जा आकार गणना तत्त्व',
    energyFormulaValue: 'प्रत्येक स्लॅबमधील बिल केलेले युनिट × लागू GERC स्लॅब दरांची बेरीज.',
    fpppaFormulaLabel: 'इंधन व वीज खरेदी समायोजन (FPPPA)',
    fpppaFormulaValue: 'बिल केलेले kWh × GERC मान्यताप्राप्त त्रैमासिक FPPPA दर (इंधन खर्च समायोजन).',
    electricityDutyRuleLabel: 'शासकीय विद्युत शुल्क (Electricity Duty)',
    electricityDutyRuleValue:
      'गुजरात विद्युत शुल्क कायद्यांतर्गत निवासी परिसरासाठी ऊर्जा आकारावर 15%.',
    delayedSurchargeRuleLabel: 'विलंब देयक अधिभार (DPS / DPC)',
    delayedSurchargeRuleValue:
      'निर्धारित देय दिनांकाच्या (Due Date) नंतर भरणा केल्यास थकीत मुद्दल रकमेवर वार्षिक 15% अधिभार.',
    dueGracePeriodLabel: 'देय दिनांक आणि सवलत कालावधी (Grace Period)',
    dueGracePeriodValue:
      'बिल दिनांकापासून 15 दिवसांत देयक भरणे आवश्यक. कलम 56(1) नोटीसपूर्वी 7 दिवसांचा सवलत कालावधी.',
    digitalPaymentOptionsLabel: 'अधिकृत डिजिटल देयक माध्यमे',
    digitalPaymentOptionsValue:
      'UGVCL पोर्टल (ugvcl.com), VidyutOne ॲप, BBPS, UPI, नेट बँकिंग आणि सब-डिव्हिजन कॅश काउंटर.',
    advanceRebateLabel: 'त्वरित देयक सवलत (Prompt Payment Rebate)',
    advanceRebateValue:
      'देय दिनांकापूर्वी 5 दिवस आधी ऑनलाइन भरणा केल्यास ऊर्जा आकारात 1% सवलत.',
    disconnectionWarningLabel: 'थकबाकी व वीज पुरवठा खंडित करण्याची सूचना',
    disconnectionWarningValue:
      'सवलत कालावधीनंतर देयक न भरल्यास विद्युत कायदा 2003 (EA 2003) अंतर्गत जोडणी खंडित केली जाऊ शकते.',
    elcbMandateLabel: 'अर्थ लीकेज संरक्षण (ELCB / RCCB)',
    elcbMandateValue:
      'निवासी आणि व्यावसायिक जोडण्यांमध्ये वीज अपघात टाळण्यासाठी 30mA RCCB बसवणे बंधनकारक आहे.',
    clearanceStandardsLabel: 'ओव्हरहेड वीज वाहिनीपासून सुरक्षित अंतर',
    clearanceStandardsValue:
      'वितरण वाहिन्यांपासून किमान 2.5m उभे आणि 1.5m आडवे सुरक्षित अंतर राखावे.',
    wiringStandardsLabel: 'BIS मानक वायरिंग निर्देश',
    wiringStandardsValue:
      'केवळ ISI चिन्हांकित वायर, 3-पिन अर्थिंग सॉकेट वापरा आणि सर्किट ओव्हरलोडिंग टाळा.',
    emergencyHelplineLabel: 'विद्युत अपघात / आग आपत्कालीन हेल्पलाईन',
    emergencyHelplineValue:
      'मुख्य ब्रेकर तात्काळ बंद करा. विलंब न करता 19122 / 1800 233 155335 वर संपर्क साधा.',
    subdivisionHelpLabel: 'उप-विभागीय (Sub-Divisional) कार्यक्षेत्र',
    subdivisionHelpValue:
      'कार्यकारी अभियंता / उप-विभागीय अधिकारी (SDO), महेसाणा आणि प्रादेशिक मंडळे.',
    cgrfForumLabel: 'ग्राहक तक्रार निवारण मंच (CGRF)',
    cgrfForumValue: 'UGVCL CGRF, नोंदणीकृत कार्यालय, विसनगर रोड, महेसाणा - 384001 (Section 42(5)).',
    ombudsmanOfficeLabel: 'विद्युत लोकपाल (Electricity Ombudsman Gujarat)',
    ombudsmanOfficeValue:
      'बॅरेक क्र. 3, पॉलिटेक्निक कॅम्पस, अंबावाडी, अहमदाबाद - 380015 (Section 42(6), EA 2003).',
    callCenterLabel: '24x7 ग्राहक सहाय्यता व हेल्पलाईन',
    callCenterValue: 'टोल-फ्री: 19122 / 1800 233 155335 | ईमेल: support@ugvcl.com',
    statutoryActLabel: 'वैधानिक वीज वितरण प्राधिकरण',
    statutoryActValue:
      'गुजरात वीज नियामक आयोग (GERC) सप्लाय कोड अंतर्गत जारी.',
    corporateRegLabel: 'UGVCL नोंदणीकृत कॉर्पोरेट संस्था',
    corporateRegValue: `${UGVCL_COMPANY_NAME_EN} · CIN: ${UGVCL_CORPORATE_IDENTITY.cin}`,
    demoDisclosureLabel: 'सिम्युलेशन आणि DEMO पारदर्शकता सूचना',
    demoDisclosureValue:
      'VidyutFlow 2.0 प्रात्यक्षिक प्रणाली. प्रोटोटाइप उद्देशासाठी सिम्युलेटेड युटिलिटी रेकॉर्ड.',
  },
};

const SHORT_EN_MONTHS = [
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
];
const FULL_EN_MONTHS = [
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
];

/**
 * Builds the deterministic Six Bi-Monthly Period Consumption Comparison Chart
 * covering 6 chronological two-month periods with two comparison bars per period:
 * - Bar 1 (actualUnitsKwh): Actual recorded/billed kWh for that 2-month window
 *   (or null when prior historical period has no recorded data — never fabricated!).
 * - Bar 2 (comparisonUnitsKwh): 2-Month Connection Benchmark Reference in kWh
 *   (2 × connection.averageMonthlyKwh or configured override).
 * Prevents double-counting if both a BI_MONTHLY bill and MONTHLY bills exist for the same months.
 */
export function buildSixBiMonthlyPeriodComparisonChart(input: {
  targetBill?: ElectricityBill;
  currentBill?: ElectricityBill;
  connection?: ElectricityConnection | null;
  allBills?: ElectricityBill[];
  language?: Language;
  benchmarkBiMonthlyKwhOverride?: number;
}): SixBiMonthlyPeriodComparisonChart {
  const language: Language = input.language || 'en';
  const i18n = CHART_I18N[language] || CHART_I18N.en;
  const targetBill = (input.targetBill || input.currentBill)!;
  const { connection } = input;
  const consumerNo = targetBill.consumerNo || connection?.consumerNo || '';

  const targetMeta = resolveBillCycleMetadata(targetBill, connection);
  const endDateObj = new Date(targetMeta.endUtcMs);
  const endYear = endDateObj.getUTCFullYear();
  const endMonth1To12 = endDateObj.getUTCMonth() + 1;

  // Determine the 6th (latest) 2-month window's startYear & startMonth1To12
  let anchorStartYear: number;
  let anchorStartMonth1To12: number;

  if (targetMeta.billingCycleType === 'BI_MONTHLY') {
    const startDateObj = new Date(targetMeta.startUtcMs);
    anchorStartYear = startDateObj.getUTCFullYear();
    anchorStartMonth1To12 = startDateObj.getUTCMonth() + 1;
  } else {
    // Pair standard utility bi-monthly calendar windows (Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec)
    anchorStartMonth1To12 = endMonth1To12 % 2 === 1 ? endMonth1To12 : endMonth1To12 - 1;
    anchorStartYear = endYear;
  }

  // Deduplicate all bills for this connection (including targetBill)
  const billMap = new Map<string, ElectricityBill>();
  for (const b of input.allBills || []) {
    if (
      b &&
      b.consumerNo === consumerNo &&
      b.billNo &&
      b.lifecycleStatus !== 'SCHEDULED_NOT_ISSUED' &&
      !b.isScheduledNotIssued &&
      b.status !== 'Scheduled'
    ) {
      billMap.set(b.billNo, b);
    }
  }
  if (targetBill && targetBill.billNo) {
    billMap.set(targetBill.billNo, targetBill);
  }
  const connectionBills = Array.from(billMap.values());

  // Non-estimated recorded monthly history for canonical residential connection 04281-99231
  const recordedHistoryByYearMonth = new Map<string, number>();
  if (consumerNo === '04281-99231') {
    for (const h of CONSUMPTION_HISTORY) {
      if (!h.month || /est/i.test(h.month)) continue;
      const parsed = parseBillMonthToPeriodDescriptor(h.month, 'MONTHLY');
      if (parsed) {
        const ymKey = `${parsed.startYear}-${String(parsed.startMonth1To12).padStart(2, '0')}`;
        recordedHistoryByYearMonth.set(ymKey, Number(h.units || 0));
      }
    }
  }

  // Separate connection bills into BI_MONTHLY and MONTHLY
  const biMonthlyBillsWithMeta = connectionBills
    .map((b) => ({ bill: b, meta: resolveBillCycleMetadata(b, connection) }))
    .filter((x) => x.meta.billingCycleType === 'BI_MONTHLY');

  const monthlyBillsByYearMonth = new Map<string, { bill: ElectricityBill; units: number }>();
  for (const b of connectionBills) {
    const meta = resolveBillCycleMetadata(b, connection);
    if (meta.billingCycleType === 'MONTHLY') {
      const d = new Date(meta.startUtcMs);
      const ymKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyBillsByYearMonth.set(ymKey, {
        bill: b,
        units: Math.max(0, Math.round(Number(b.unitsConsumed || 0))),
      });
    }
  }

  const baseMonthlyAvg =
    connection && typeof connection.averageMonthlyKwh === 'number' && connection.averageMonthlyKwh > 0
      ? connection.averageMonthlyKwh
      : Math.max(150, Math.round((connection?.sanctionedLoadKw || 3) * 80));

  const comparisonUnitsKwh =
    typeof input.benchmarkBiMonthlyKwhOverride === 'number' &&
    input.benchmarkBiMonthlyKwhOverride > 0
      ? Math.round(input.benchmarkBiMonthlyKwhOverride)
      : Math.round(baseMonthlyAvg * 2);

  const periods: BiMonthlyChartPeriodEntry[] = [];

  for (let i = 0; i < 6; i++) {
    const offsetMonths = (i - 5) * 2; // -10, -8, -6, -4, -2, 0
    const totalMonthsFromEpoch = anchorStartYear * 12 + (anchorStartMonth1To12 - 1) + offsetMonths;
    const pStartYear = Math.floor(totalMonthsFromEpoch / 12);
    const pStartMonth0 = ((totalMonthsFromEpoch % 12) + 12) % 12;
    const pStartMonth1To12 = pStartMonth0 + 1;

    const periodDesc = buildBiMonthlyBillingPeriod(pStartYear, pStartMonth1To12);
    const pEndYear = periodDesc.endYear;
    const pEndMonth1To12 = periodDesc.endMonth1To12;

    const ym1 = `${pStartYear}-${String(pStartMonth1To12).padStart(2, '0')}`;
    const ym2 = `${pEndYear}-${String(pEndMonth1To12).padStart(2, '0')}`;
    const periodKey = `${ym1}_${ym2}`;

    const shortM1 = SHORT_EN_MONTHS[pStartMonth1To12 - 1];
    const shortM2 = SHORT_EN_MONTHS[pEndMonth1To12 - 1];
    const fullM1 = FULL_EN_MONTHS[pStartMonth1To12 - 1];
    const fullM2 = FULL_EN_MONTHS[pEndMonth1To12 - 1];

    const shortY1 = String(pStartYear).slice(-2);
    const shortY2 = String(pEndYear).slice(-2);

    const canonicalShortLabel =
      pStartYear === pEndYear
        ? `${shortM1}-${shortM2} ${shortY2}`
        : `${shortM1} ${shortY1}-${shortM2} ${shortY2}`;
    const canonicalFullLabel =
      pStartYear === pEndYear
        ? `${fullM1}–${fullM2} ${pEndYear}`
        : `${fullM1} ${pStartYear}–${fullM2} ${pEndYear}`;

    const localizedLabel = localizeBillMonth(canonicalFullLabel, language);
    const shortLocalizedLabel =
      language === 'en' ? canonicalShortLabel : localizeBillMonth(canonicalShortLabel, language);

    // 1. Check if a BI_MONTHLY bill directly covers this 2-month window
    const matchingBiMonthly = biMonthlyBillsWithMeta.find((bm) => {
      const bmStart = new Date(bm.meta.startUtcMs);
      const bmEnd = new Date(bm.meta.endUtcMs);
      return (
        bmStart.getUTCFullYear() === pStartYear &&
        bmStart.getUTCMonth() + 1 === pStartMonth1To12 &&
        bmEnd.getUTCFullYear() === pEndYear &&
        bmEnd.getUTCMonth() + 1 === pEndMonth1To12
      );
    });

    let hasActualData = false;
    let dataStatus: BiMonthlyChartPeriodEntry['dataStatus'] = 'MISSING_HISTORY';
    let source: BiMonthlyChartPeriodEntry['source'] = 'MISSING_DATA';
    let actualUnitsKwh: number | null = null;
    const sourceBillNos: string[] = [];

    if (matchingBiMonthly) {
      hasActualData = true;
      dataStatus = 'COMPLETE_BIMONTHLY';
      source =
        matchingBiMonthly.bill.billNo === targetBill.billNo
          ? 'CURRENT_BILL'
          : 'HISTORICAL_BI_MONTHLY_BILL';
      actualUnitsKwh = Math.max(0, Math.round(Number(matchingBiMonthly.bill.unitsConsumed || 0)));
      sourceBillNos.push(matchingBiMonthly.bill.billNo);
    } else {
      // Aggregate from non-overlapping monthly bills or recorded meter history for ym1 and ym2
      const m1Bill = monthlyBillsByYearMonth.get(ym1);
      const m2Bill = monthlyBillsByYearMonth.get(ym2);

      const m1Units = m1Bill
        ? m1Bill.units
        : recordedHistoryByYearMonth.has(ym1)
        ? recordedHistoryByYearMonth.get(ym1)!
        : null;
      const m2Units = m2Bill
        ? m2Bill.units
        : recordedHistoryByYearMonth.has(ym2)
        ? recordedHistoryByYearMonth.get(ym2)!
        : null;

      if (m1Bill) sourceBillNos.push(m1Bill.bill.billNo);
      if (m2Bill) sourceBillNos.push(m2Bill.bill.billNo);

      if (m1Units !== null && m2Units !== null) {
        hasActualData = true;
        dataStatus = 'COMPLETE_BIMONTHLY';
        source =
          m1Bill || m2Bill ? 'COMBINED_MONTHLY_BILLS' : 'CONSUMPTION_HISTORY_FALLBACK';
        actualUnitsKwh = m1Units + m2Units;
      } else if (m1Units !== null || m2Units !== null) {
        hasActualData = true;
        dataStatus = 'PARTIAL_SINGLE_MONTH';
        source =
          m1Bill || m2Bill ? 'COMBINED_MONTHLY_BILLS' : 'CONSUMPTION_HISTORY_FALLBACK';
        actualUnitsKwh = (m1Units ?? 0) + (m2Units ?? 0);
      } else {
        hasActualData = false;
        dataStatus = 'MISSING_HISTORY';
        source = 'MISSING_DATA';
        actualUnitsKwh = null;
      }
    }

    periods.push({
      periodIndex: i + 1,
      periodKey,
      canonicalPeriodMonth: ym2,
      startYearMonth: ym1,
      endYearMonth: ym2,
      canonicalLabel: canonicalShortLabel,
      localizedLabel,
      periodRangeLabel: localizedLabel,
      shortLocalizedLabel,
      shortLabel: shortLocalizedLabel,
      periodStartDate: periodDesc.periodStartDate,
      periodEndDate: periodDesc.periodEndDate,
      hasActualData,
      dataStatus,
      source,
      actualUnitsKwh,
      comparisonUnitsKwh,
      sourceBillNos,
      isCurrentBillPeriod: i === 5,
      isCurrentPeriod: i === 5,
      missingDataNote: hasActualData ? undefined : i18n.missingPeriodNote,
    });
  }

  const recordedEntries = periods.filter((p) => p.hasActualData && p.actualUnitsKwh !== null);
  const recordedPeriodsCount = recordedEntries.length;
  const missingPeriodsCount = periods.length - recordedPeriodsCount;
  const averageRecordedBiMonthlyKwh =
    recordedPeriodsCount > 0
      ? Math.round(
          recordedEntries.reduce((sum, p) => sum + (p.actualUnitsKwh || 0), 0) /
            recordedPeriodsCount
        )
      : 0;

  const maxObserved = Math.max(
    comparisonUnitsKwh,
    ...periods.map((p) => p.actualUnitsKwh || 0),
    100
  );
  const maxScaleKwh = Math.ceil((maxObserved * 1.1) / 50) * 50;
  const currentPeriodUnitsKwh =
    periods[5]?.actualUnitsKwh ?? Math.max(0, Math.round(Number(targetBill.unitsConsumed || 0)));

  return {
    chartTitle: i18n.chartTitle,
    chartSubtitle: i18n.chartSubtitle,
    unitLabel: 'kWh',
    seriesALabel: i18n.seriesALabel,
    seriesBLabel: i18n.seriesBLabel,
    bar1LegendLabel: i18n.seriesALabel,
    bar2LegendLabel: i18n.seriesBLabel,
    missingDataLegendLabel: i18n.missingDataLegendLabel,
    missingDataNote: i18n.missingDataLegendLabel,
    maxScaleKwh,
    maxScaleUnitsKwh: maxScaleKwh,
    currentPeriodUnitsKwh,
    recordedPeriodsCount,
    missingPeriodsCount,
    averageRecordedBiMonthlyKwh,
    averageAvailableUnitsKwh: averageRecordedBiMonthlyKwh,
    benchmarkUnitsKwh: comparisonUnitsKwh,
    periods,
  };
}

/**
 * Generates a complete, downloadable Electricity Bill document model (Part 4).
 * Covers Sections A through G:
 * - A. UGVCL Identity
 * - B. Consumer Details
 * - C. Billing Details
 * - D. Electricity Consumption (with honest RECORDED vs SIMULATED reading classification)
 * - E. Detailed Tariff Calculation (with slab-wise breakdown table & reconciliation verification)
 * - F. Bill Status
 * - G. Source Disclosure
 */
export function generateElectricityBillDocument(
  input: GenerateElectricityBillInput
): GeneratedOfficialDocument {
  const language: Language = input.language || 'en';
  const ui = getDocumentUiTranslations(language);
  const extra = BILL_AND_RECEIPT_EXTRA_LABELS[language] || BILL_AND_RECEIPT_EXTRA_LABELS.en;
  const typoProfile = getLanguageTypographyProfile(language);
  const dataSource = normalizeExportDataSource(input.dataSource);

  const rawBill = input.bill ? stripForbiddenFieldsFromRecord(input.bill) : null;
  const rawConn = input.connection ? stripForbiddenFieldsFromRecord(input.connection) : null;
  const refId = rawBill?.billNo || 'UNSPECIFIED-BILL';

  if (!rawBill || !rawBill.billNo) {
    return {
      documentType: 'electricity_bill',
      displayMode: 'unavailable',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename('electricity_bill', refId),
      title: extra.electricityBillTitle,
      subtitle: `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`,
      statusLabel: ui.receiptNotAvailableForUnpaidBill,
      statusTone: 'amber',
      statusBannerNote: 'No electricity bill record available.',
      recordedTimestamp: '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: extra.demoElectricityBillDisclosure,
      footerNote: extra.demoElectricityBillDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: 'No electricity bill record available.',
    };
  }

  const isExplicitlyScheduled =
    rawBill.lifecycleStatus === 'SCHEDULED_NOT_ISSUED' ||
    Boolean(rawBill.isScheduledNotIssued) ||
    rawBill.status === 'Scheduled' ||
    (input.referenceDate !== undefined && isBillScheduledNotIssued(rawBill, input.referenceDate));

  if (isExplicitlyScheduled) {
    const scheduledStatusLabel =
      language === 'gu'
        ? 'નિર્ધારિત — હજુ બિલ જારી થયેલ નથી'
        : language === 'hi'
        ? 'निर्धारित — अभी बिल जारी नहीं हुआ है'
        : language === 'mr'
        ? 'नियोजित — अद्याप बिल जारी झालेले नाही'
        : 'Scheduled — Not Yet Issued';
    const scheduledReason =
      language === 'gu'
        ? 'આગામી દ્વિ-માસિક બિલિંગ ચક્ર હજુ જારી થયેલ નથી. મીટર રીડિંગ અને બિલ જારી થયા પછી જ સત્તાવાર વીજ બિલ PDF ઉપલબ્ધ થશે.'
        : language === 'hi'
        ? 'आगामी द्वि-मासिक बिलिंग चक्र अभी जारी नहीं किया गया है। मीटर रीडिंग और बिल जारी होने के बाद ही आधिकारिक विद्युत बिल PDF उपलब्ध होगा।'
        : language === 'mr'
        ? 'आगामी द्वि-मासिक बिलिंग चक्र अद्याप जारी करण्यात आलेले नाही. मीटर रीडिंग आणि बिल जारी झाल्यानंतरच अधिकृत वीज बिल PDF उपलब्ध होईल.'
        : 'Scheduled future billing cycle has not yet been issued. Official payable electricity bill PDF is available only after meter reading and bill issuance.';
    return {
      documentType: 'electricity_bill',
      displayMode: 'unavailable',
      eligible: false,
      authorized: true,
      referenceId: refId,
      filename: buildDocumentFilename('electricity_bill', refId),
      title: extra.electricityBillTitle,
      subtitle: `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`,
      statusLabel: scheduledStatusLabel,
      statusTone: 'amber',
      statusBannerNote: scheduledReason,
      recordedTimestamp: rawBill.billDate || '—',
      generatedAtDisplay: input.referenceDate || '04-Nov-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: extra.demoElectricityBillDisclosure,
      footerNote: extra.demoElectricityBillDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: scheduledReason,
    };
  }

  const targetRecord = {
    ...(rawConn || {}),
    ...rawBill,
    subdivision: rawConn?.subdivision || (rawBill as unknown as Record<string, unknown>).subdivision,
  } as Record<string, unknown>;

  const isAuthorized =
    !input.role
      ? true
      : authorizeDocumentAccess(
          input.role,
          input.actor || { id: 'demo_consumer', role: input.role, name: 'Consumer' },
          'electricity_bill',
          targetRecord
        );

  if (!isAuthorized) {
    return {
      documentType: 'electricity_bill',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename('electricity_bill', refId),
      title: extra.electricityBillTitle,
      subtitle: `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`,
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: rawBill.billDate || '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: extra.demoElectricityBillDisclosure,
      footerNote: extra.demoElectricityBillDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  const effectiveRefDate = input.referenceDate || '15-Oct-2026';
  const effectiveTimestampIst =
    input.calculationTimestampIst || `${effectiveRefDate} 10:30 IST`;

  const reconciled = reconcileBillWithPayments(
    rawBill,
    input.payments || [],
    effectiveRefDate,
    {
      waivers: input.waivers,
      reversals: input.reversals,
      tariffCategory: rawConn?.tariffCategory,
    }
  );
  const remainingPrincipalInr = reconciled.isPaid ? 0 : reconciled.outstandingBalance;
  const accruedLateChargesInr = reconciled.isPaid
    ? 0
    : reconciled.lateChargeBreakdown?.netLateChargesPayable || 0;
  const waivedOrSettledLateChargesInr = Number(
    (
      (reconciled.lateChargeBreakdown?.lateChargesWaived || 0) +
      (reconciled.lateChargeBreakdown?.lateChargesSettled || 0)
    ).toFixed(2)
  );
  const currentTotalOutstandingInr = reconciled.isPaid
    ? 0
    : reconciled.totalOutstandingWithCharges;
  const activeDaysOverdue = reconciled.isPaid
    ? 0
    : reconciled.lateChargeBreakdown?.daysOverdue || 0;
  const calculationAsOfLabel =
    language === 'gu'
      ? `${effectiveTimestampIst} મુજબ બાકી રકમની ગણતરી`
      : language === 'hi'
      ? `${effectiveTimestampIst} के अनुसार बकाया गणना`
      : language === 'mr'
      ? `${effectiveTimestampIst} नुसार थकबाकी गणना`
      : `Outstanding calculated as of ${effectiveTimestampIst}`;

  // Section A — UGVCL Identity
  const sectionAFields: DocumentFieldItem[] = [
    {
      key: 'companyName',
      label: extra.companyNameLabel,
      value: UGVCL_COMPANY_NAME_EN,
      highlight: 'blue',
    },
    {
      key: 'gujaratiCompanyName',
      label: extra.gujaratiTitleLabel,
      value: UGVCL_COMPANY_NAME_GU,
    },
    {
      key: 'gujaratiTitle',
      label: extra.gujaratiTitleLabel,
      value: UGVCL_COMPANY_NAME_GU,
    },
    {
      key: 'missionTagline',
      label: extra.missionTaglineLabel,
      value: UGVCL_TAGLINE_EN,
    },
    {
      key: 'cin',
      label: extra.cinLabel,
      value: UGVCL_CORPORATE_IDENTITY.cin,
      isMono: true,
    },
    {
      key: 'registeredOffice',
      label: extra.registeredOfficeLabel,
      value: UGVCL_CORPORATE_IDENTITY.registeredOffice,
    },
    {
      key: 'dataSource',
      label: ui.dataSource,
      value: dataSource,
      isMono: true,
    },
  ];

  // Section B — Consumer Details
  const consumerNo = rawBill.consumerNo || rawConn?.consumerNo || '—';
  const connectionId = rawBill.connectionId || rawConn?.connectionId || consumerNo;
  const accountId = rawBill.accountId || rawConn?.accountId;
  const sectionBFields: DocumentFieldItem[] = [
    {
      key: 'consumerName',
      label: ui.consumerName,
      value: rawConn?.consumerName || 'Registered UGVCL Consumer',
    },
    {
      key: 'consumerNumber',
      label: ui.consumerNumber,
      value: consumerNo,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'consumerNo',
      label: ui.consumerNumber,
      value: consumerNo,
      isMono: true,
    },
    {
      key: 'connectionId',
      label: extra.connectionIdLabel,
      value: connectionId,
      isMono: true,
    },
  ];
  if (accountId) {
    sectionBFields.push({
      key: 'accountId',
      label: extra.accountIdLabel,
      value: accountId,
      isMono: true,
    });
  }
  sectionBFields.push(
    {
      key: 'serviceAddress',
      label: extra.serviceAddressLabel,
      value: localizeConsumerAddress(
        rawConn?.address || 'Mehsana Service Jurisdiction, North Gujarat',
        language
      ),
    },
    {
      key: 'subdivision',
      label: ui.subdivision,
      value: localizeSubdivision(
        rawConn?.subdivision || 'Mehsana City North',
        language
      ),
    },
    {
      key: 'tariffCategory',
      label: ui.tariffCategory,
      value: localizeTariffCategory(
        rawConn?.tariffCategory || 'Residential (RGPU)',
        language
      ),
    },
    {
      key: 'sanctionedLoad',
      label: extra.sanctionedLoadLabel,
      value: `${rawConn?.sanctionedLoadKw ?? 2} kW`,
      isMono: true,
    },
    {
      key: 'meterNumber',
      label: extra.meterNumberLabel,
      value: rawConn?.meterNo || 'UG-SM-REGISTERED',
      isMono: true,
    },
    {
      key: 'meterPhase',
      label: extra.meterPhaseLabel,
      value: localizePhase(rawConn?.phase || '1-Phase', language),
    }
  );

  // Section C — Billing Details (Including Phase 9 Bi-Monthly Period & Cycle Type)
  const cycleMeta = resolveBillCycleMetadata(rawBill, rawConn);
  const localizedCycleType = localizeBillingCycleType(cycleMeta.billingCycleType, language);
  const localizedCycleShortBadge = localizeBillingCycleShortBadge(
    cycleMeta.billingCycleType,
    language
  );
  const localizedPeriodLabel =
    language === 'en'
      ? cycleMeta.billingPeriodLabel
      : `${cycleMeta.periodStartDate} – ${cycleMeta.periodEndDate}`;

  const sectionCFields: DocumentFieldItem[] = [
    {
      key: 'billNo',
      label: ui.billReference,
      value: rawBill.billNo,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'billReference',
      label: ui.billReference,
      value: rawBill.billNo,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'billingCycleType',
      label:
        language === 'gu'
          ? 'બિલિંગ ચક્ર પ્રકાર'
          : language === 'hi'
          ? 'बिलिंग चक्र प्रकार'
          : language === 'mr'
          ? 'बिलिंग चक्र प्रकार'
          : 'Billing Cycle Type',
      value: localizedCycleType,
      highlight: cycleMeta.billingCycleType === 'BI_MONTHLY' ? 'blue' : 'default',
    },
    {
      key: 'billingPeriod',
      label: ui.billingPeriod,
      value: localizeBillMonth(rawBill.billMonth, language),
    },
    {
      key: 'billingPeriodRange',
      label:
        language === 'gu'
          ? 'બિલિંગ સમયગાળો (પ્રારંભ – અંતિમ)'
          : language === 'hi'
          ? 'बिलिंग अवधि (प्रारंभ – समाप्ति)'
          : language === 'mr'
          ? 'बिलिंग कालावधी (प्रारंभ – समाप्ती)'
          : 'Billing Period (Start – End)',
      value: localizedPeriodLabel,
      isMono: true,
    },
    {
      key: 'billIssueDate',
      label: extra.billIssueDateLabel,
      value: rawBill.billDate,
      isMono: true,
    },
    {
      key: 'dueDate',
      label: extra.dueDateLabel,
      value: rawBill.dueDate,
      isMono: true,
      highlight: reconciled.isOverdue ? 'rose' : 'default',
    },
    {
      key: 'currentBillAmount',
      label: extra.currentBillAmountLabel,
      value: `₹${reconciled.totalAmount.toLocaleString('en-IN')}`,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'previouslyPaidAmount',
      label: extra.previouslyPaidAmountLabel,
      value: `₹${reconciled.paidAmount.toLocaleString('en-IN')}`,
      isMono: true,
      highlight: reconciled.paidAmount > 0 ? 'emerald' : 'default',
    },
    {
      key: 'remainingPrincipal',
      label:
        language === 'gu'
          ? 'બાકી મૂળ રકમ (Remaining Principal)'
          : language === 'hi'
          ? 'शेष मूल राशि (Remaining Principal)'
          : language === 'mr'
          ? 'उर्वरित मुद्दल रक्कम (Remaining Principal)'
          : 'Remaining Principal',
      value: `₹${remainingPrincipalInr.toLocaleString('en-IN', { minimumFractionDigits: remainingPrincipalInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      isMono: true,
      highlight: remainingPrincipalInr === 0 ? 'emerald' : 'amber',
    },
    {
      key: 'accruedLatePaymentCharges',
      label:
        language === 'gu'
          ? 'વિલંબિત ચુકવણી સરચાર્જ (Accrued DPS)'
          : language === 'hi'
          ? 'विलंबित भुगतान अधिभार (Accrued DPS)'
          : language === 'mr'
          ? 'विलंब देयक अधिभार (Accrued DPS)'
          : 'Accrued Late Payment Charges (DPS)',
      value: `₹${accruedLateChargesInr.toLocaleString('en-IN', { minimumFractionDigits: accruedLateChargesInr > 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      isMono: true,
      highlight: accruedLateChargesInr > 0 ? 'rose' : 'default',
    },
    {
      key: 'remainingAmountPayable',
      label: extra.remainingAmountPayableLabel,
      value: `₹${currentTotalOutstandingInr.toLocaleString('en-IN', { minimumFractionDigits: currentTotalOutstandingInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      isMono: true,
      highlight: currentTotalOutstandingInr === 0 ? 'emerald' : 'amber',
    },
    {
      key: 'calculationAsOf',
      label:
        language === 'gu'
          ? 'ગણતરી સમય (IST)'
          : language === 'hi'
          ? 'गणना समय (IST)'
          : language === 'mr'
          ? 'गणना वेळ (IST)'
          : 'Calculation Timestamp (IST)',
      value: calculationAsOfLabel,
      isMono: true,
    },
  ];

  // Section D — Electricity Consumption (Never invent meter readings!)
  const hasBillLevelReadings =
    typeof rawBill.previousReadingKwh === 'number' &&
    typeof rawBill.currentReadingKwh === 'number' &&
    rawBill.currentReadingKwh >= rawBill.previousReadingKwh;

  const hasRecordedConnectionReadings =
    hasBillLevelReadings ||
    (rawConn &&
      typeof rawConn.previousReadingKwh === 'number' &&
      typeof rawConn.currentReadingKwh === 'number' &&
      rawConn.currentReadingKwh >= rawConn.previousReadingKwh &&
      !rawBill.isSimulatedDemoBill &&
      Math.round(rawConn.currentReadingKwh - rawConn.previousReadingKwh) ===
        Math.round(rawBill.unitsConsumed));

  const sectionDPrevReading = hasBillLevelReadings
    ? rawBill.previousReadingKwh
    : rawConn?.previousReadingKwh;
  const sectionDCurReading = hasBillLevelReadings
    ? rawBill.currentReadingKwh
    : rawConn?.currentReadingKwh;
  const previousReadingDate =
    rawBill.previousReadingDate || cycleMeta.periodStartDate;
  const currentReadingDate =
    rawBill.currentReadingDate || rawConn?.lastReadingDate || cycleMeta.periodEndDate || rawBill.billDate;
  const sectionDReadingDate =
    rawBill.currentReadingDate || rawConn?.lastReadingDate || rawBill.billDate;

  const sectionDFields: DocumentFieldItem[] = [
    {
      key: 'unitsConsumed',
      label: ui.unitsConsumed,
      value: `${rawBill.unitsConsumed} kWh`,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'readingSource',
      label: extra.readingSourceLabel,
      value:
        hasRecordedConnectionReadings && !rawBill.isSimulatedDemoBill
          ? extra.readingSourceRecorded
          : extra.readingSourceSimulated,
      highlight:
        hasRecordedConnectionReadings && !rawBill.isSimulatedDemoBill ? 'emerald' : 'amber',
    },
  ];

  if (
    hasRecordedConnectionReadings &&
    typeof sectionDPrevReading === 'number' &&
    typeof sectionDCurReading === 'number'
  ) {
    sectionDFields.push(
      {
        key: 'previousMeterReading',
        label: extra.previousMeterReadingLabel,
        value: `${sectionDPrevReading} kWh`,
        isMono: true,
      },
      {
        key: 'currentMeterReading',
        label: extra.currentMeterReadingLabel,
        value: `${sectionDCurReading} kWh`,
        isMono: true,
      },
      {
        key: 'readingDate',
        label: extra.readingDateLabel,
        value: sectionDReadingDate,
        isMono: true,
      }
    );
  } else {
    const connRegSuffix =
      language === 'gu'
        ? '(જોડાણ રજિસ્ટર)'
        : language === 'hi'
        ? '(कनेक्शन रजिस्टर)'
        : language === 'mr'
        ? '(जोडणी रजिस्टर)'
        : '(Connection Register)';
    sectionDFields.push(
      {
        key: 'previousMeterReading',
        label: extra.previousMeterReadingLabel,
        value:
          rawConn && typeof rawConn.previousReadingKwh === 'number'
            ? `${rawConn.previousReadingKwh} kWh ${connRegSuffix}`
            : extra.readingNotRecordedNotice,
        isMono: true,
      },
      {
        key: 'currentMeterReading',
        label: extra.currentMeterReadingLabel,
        value:
          rawConn && typeof rawConn.currentReadingKwh === 'number'
            ? `${rawConn.currentReadingKwh} kWh ${connRegSuffix}`
            : extra.readingNotRecordedNotice,
        isMono: true,
      },
      {
        key: 'readingDate',
        label: extra.readingDateLabel,
        value: rawBill.billDate,
        isMono: true,
      }
    );
  }

  // Section E — Detailed Tariff Calculation & Reconciliation Check
  const computedSum = Number(
    (
      Number(rawBill.energyCharges || 0) +
      Number(rawBill.fixedCharges || 0) +
      Number(rawBill.fuelPriceAdjustment || 0) +
      Number(rawBill.electricityDuty || 0) +
      Number(rawBill.otherAdjustmentsInr || 0) -
      Number(rawBill.rebateOrSubsidy || 0)
    ).toFixed(2)
  );
  const reconciliationDiff = Math.abs(computedSum - Number(rawBill.totalAmount || 0));
  const reconciliationVerified = reconciliationDiff <= 1;
  const integrityWarnings: string[] = [];
  if (!reconciliationVerified) {
    integrityWarnings.push(
      `${extra.reconciliationMismatchWarning} (Component sum: ₹${computedSum.toLocaleString(
        'en-IN'
      )}, Canonical Bill Total: ₹${rawBill.totalAmount.toLocaleString('en-IN')})`
    );
  }

  const sectionEFields: DocumentFieldItem[] = [
    {
      key: 'energyCharges',
      label: ui.energyCharges,
      value: `₹${rawBill.energyCharges.toLocaleString('en-IN')}`,
      isMono: true,
    },
    {
      key: 'fixedCharges',
      label: ui.fixedCharges,
      value: `₹${rawBill.fixedCharges.toLocaleString('en-IN')}`,
      isMono: true,
    },
    {
      key: 'fuelPriceAdjustment',
      label: ui.fuelPriceAdjustment,
      value: `₹${rawBill.fuelPriceAdjustment.toLocaleString('en-IN')}`,
      isMono: true,
    },
    {
      key: 'electricityDuty',
      label: ui.electricityDuty,
      value: `₹${rawBill.electricityDuty.toLocaleString('en-IN')}`,
      isMono: true,
    },
    {
      key: 'rebateOrSubsidy',
      label: ui.rebateOrSubsidy,
      value:
        rawBill.rebateOrSubsidy && rawBill.rebateOrSubsidy !== 0
          ? `-₹${Math.abs(rawBill.rebateOrSubsidy).toLocaleString('en-IN')}`
          : '₹0',
      isMono: true,
      highlight:
        rawBill.rebateOrSubsidy && rawBill.rebateOrSubsidy > 0
          ? 'emerald'
          : 'default',
    },
    {
      key: 'totalBillAmount',
      label: extra.currentBillAmountLabel,
      value: `₹${rawBill.totalAmount.toLocaleString('en-IN')}`,
      isMono: true,
      highlight: 'blue',
    },
  ];

  // Build structured tables for Slab Breakdown and Charge Summary
  const tables: PdfDocumentTable[] = [];
  if (Array.isArray(rawBill.slabBreakdown) && rawBill.slabBreakdown.length > 0) {
    tables.push({
      id: 'slab-breakdown-table',
      title: extra.slabTableTitle,
      columns: [
        { key: 'slab', header: extra.slabColDescription, align: 'left', widthRatio: 2.2 },
        { key: 'units', header: extra.slabColUnits, align: 'right', widthRatio: 1 },
        { key: 'rate', header: extra.slabColRate, align: 'right', widthRatio: 1 },
        { key: 'amount', header: extra.slabColAmount, align: 'right', widthRatio: 1.2 },
      ],
      rows: rawBill.slabBreakdown.map((s) => ({
        slab: localizeSlabDescription(s.slab, language),
        units: `${s.units} kWh`,
        rate: `₹${Number(s.rate).toFixed(2)}`,
        amount: `₹${Number(s.amount).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      })),
      footerNote: `${ui.energyCharges}: ₹${rawBill.energyCharges.toLocaleString('en-IN')}`,
    });
  }

  tables.push({
    id: 'tariff-reconciliation-table',
    title: extra.chargeTableTitle,
    columns: [
      { key: 'component', header: extra.chargeColComponent, align: 'left', widthRatio: 2.8 },
      { key: 'amount', header: extra.chargeColAmount, align: 'right', widthRatio: 1.2 },
    ],
    rows: [
      {
        component: `1. ${ui.energyCharges} (${rawBill.unitsConsumed} kWh)`,
        amount: `₹${rawBill.energyCharges.toLocaleString('en-IN')}`,
      },
      {
        component: `2. ${ui.fixedCharges}`,
        amount: `₹${rawBill.fixedCharges.toLocaleString('en-IN')}`,
      },
      {
        component: `3. ${ui.fuelPriceAdjustment}`,
        amount: `₹${rawBill.fuelPriceAdjustment.toLocaleString('en-IN')}`,
      },
      {
        component: `4. ${ui.electricityDuty}`,
        amount: `₹${rawBill.electricityDuty.toLocaleString('en-IN')}`,
      },
      {
        component: `5. ${ui.rebateOrSubsidy}`,
        amount:
          rawBill.rebateOrSubsidy && rawBill.rebateOrSubsidy !== 0
            ? `-₹${Math.abs(rawBill.rebateOrSubsidy).toLocaleString('en-IN')}`
            : '₹0',
      },
      {
        component: `${extra.currentBillAmountLabel} (1 + 2 + 3 + 4 - 5)`,
        amount: `₹${rawBill.totalAmount.toLocaleString('en-IN')}`,
      },
      {
        component: extra.previouslyPaidAmountLabel,
        amount: `₹${reconciled.paidAmount.toLocaleString('en-IN')}`,
      },
      {
        component:
          language === 'gu'
            ? 'બાકી મૂળ રકમ (Remaining Principal)'
            : language === 'hi'
            ? 'शेष मूल राशि (Remaining Principal)'
            : language === 'mr'
            ? 'उर्वरित मुद्दल रक्कम (Remaining Principal)'
            : 'Remaining Principal',
        amount: `₹${remainingPrincipalInr.toLocaleString('en-IN', { minimumFractionDigits: remainingPrincipalInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      },
      ...(accruedLateChargesInr > 0
        ? [
            {
              component:
                language === 'gu'
                  ? `વિલંબિત ચુકવણી સરચાર્જ (DPS — ${activeDaysOverdue} દિવસ)`
                  : language === 'hi'
                  ? `विलंबित भुगतान अधिभार (DPS — ${activeDaysOverdue} दिन)`
                  : language === 'mr'
                  ? `विलंब देयक अधिभार (DPS — ${activeDaysOverdue} दिवस)`
                  : `Accrued Late Payment Surcharge (DPS — ${activeDaysOverdue} days overdue)`,
              amount: `+₹${accruedLateChargesInr.toFixed(2)}`,
            },
          ]
        : []),
      {
        component: extra.remainingAmountPayableLabel,
        amount: `₹${currentTotalOutstandingInr.toLocaleString('en-IN', { minimumFractionDigits: currentTotalOutstandingInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      },
    ],
    footerNote: `${reconciliationVerified ? extra.reconciliationVerifiedText : extra.reconciliationMismatchWarning} · ${calculationAsOfLabel}`,
  });

  // Previous 3 Billing Cycles Statement Table (Strictly chronologically prior issued bills only)
  const targetBillIssueMs =
    parseVidyutDateToUtcMs(rawBill.billDate) ?? new Date(rawBill.billDate || 0).getTime();
  const connectionAllBills = (input.allBills || []).filter((b) => {
    if (!b || b.consumerNo !== rawBill.consumerNo || b.billNo === rawBill.billNo) {
      return false;
    }
    if (
      b.lifecycleStatus === 'SCHEDULED_NOT_ISSUED' ||
      b.isScheduledNotIssued ||
      b.status === 'Scheduled' ||
      isBillScheduledNotIssued(b, effectiveRefDate)
    ) {
      return false;
    }
    const candidateMs =
      parseVidyutDateToUtcMs(b.billDate) ?? new Date(b.billDate || 0).getTime();
    if (Number.isFinite(targetBillIssueMs) && Number.isFinite(candidateMs)) {
      return candidateMs < targetBillIssueMs;
    }
    return true;
  });
  connectionAllBills.sort((a, b) => {
    const timeA = parseVidyutDateToUtcMs(a.billDate) ?? new Date(a.billDate || 0).getTime();
    const timeB = parseVidyutDateToUtcMs(b.billDate) ?? new Date(b.billDate || 0).getTime();
    return timeB - timeA;
  });
  const previousThreeBills = connectionAllBills.slice(0, 3);

  const prevBillsFooterNote =
    language === 'gu'
      ? `ગ્રાહક નં. ${rawBill.consumerNo} માટે નોંધાયેલ અગાઉના બિલિંગ રેકોર્ડ્સ`
      : language === 'hi'
      ? `उपभोक्ता सं. ${rawBill.consumerNo} के लिए दर्ज पूर्व बिलिंग रिकॉर्ड`
      : language === 'mr'
      ? `ग्राहक क्र. ${rawBill.consumerNo} साठी नोंदवलेले मागील बिलिंग रेकॉर्ड`
      : `Recorded historical billing records for Consumer No. ${rawBill.consumerNo}`;

  if (previousThreeBills.length > 0) {
    tables.push({
      id: 'previous-bills-table',
      title: extra.previousBillsTableTitle,
      columns: [
        { key: 'period', header: extra.colPeriod, align: 'left', widthRatio: 2.0 },
        { key: 'units', header: extra.colUnits, align: 'right', widthRatio: 1.0 },
        { key: 'billed', header: extra.colBilledAmount, align: 'right', widthRatio: 1.2 },
        { key: 'paid', header: extra.colPaidAmount, align: 'right', widthRatio: 1.2 },
        { key: 'balance', header: extra.colRemainingBalance, align: 'right', widthRatio: 1.2 },
        { key: 'status', header: extra.colStatus, align: 'center', widthRatio: 1.2 },
      ],
      rows: previousThreeBills.map((b) => {
        const rec = reconcileBillWithPayments(b, input.payments || []);
        return {
          period: localizeBillMonth(b.billMonth, language),
          units: `${b.unitsConsumed} kWh`,
          billed: `₹${b.totalAmount.toLocaleString('en-IN')}`,
          paid: `₹${rec.paidAmount.toLocaleString('en-IN')}`,
          balance: `₹${rec.outstandingBalance.toLocaleString('en-IN')}`,
          status: localizeBillStatus(rec.effectiveStatus, language),
        };
      }),
      footerNote: prevBillsFooterNote,
    });
  } else {
    tables.push({
      id: 'previous-bills-table',
      title: extra.previousBillsTableTitle,
      columns: [
        { key: 'period', header: extra.colPeriod, align: 'left', widthRatio: 3.5 },
        { key: 'units', header: extra.colUnits, align: 'center', widthRatio: 1.0 },
        { key: 'billed', header: extra.colBilledAmount, align: 'center', widthRatio: 1.0 },
        { key: 'paid', header: extra.colPaidAmount, align: 'center', widthRatio: 1.0 },
        { key: 'balance', header: extra.colRemainingBalance, align: 'center', widthRatio: 1.0 },
        { key: 'status', header: extra.colStatus, align: 'center', widthRatio: 1.0 },
      ],
      rows: [
        {
          period: extra.noPreviousBillsMessage,
          units: '—',
          billed: '—',
          paid: '—',
          balance: '—',
          status: '—',
        },
      ],
      footerNote: extra.noPreviousBillsMessage,
    });
  }

  // Reverse-Side Sections H, I, J, K, L, M (Localized across EN, GU, HI, MR)
  const revI18n = REVERSE_SECTIONS_I18N[language] || REVERSE_SECTIONS_I18N.en;
  const reverseSideSections: DocumentSection[] = [
    {
      id: 'ugvcl-tariff-schedule',
      title: extra.sectionReverseTariffSchedule,
      fields: [
        {
          key: 'tariffRgpuResidential',
          label: revI18n.tariffRgpuLabel,
          value: revI18n.tariffRgpuValue,
        },
        {
          key: 'tariffNrgpCommercial',
          label: revI18n.tariffNrgpLabel,
          value: revI18n.tariffNrgpValue,
        },
        {
          key: 'tariffAgAgricultural',
          label: revI18n.tariffAgLabel,
          value: revI18n.tariffAgValue,
        },
        {
          key: 'fixedDemandCharges',
          label: revI18n.fixedDemandLabel,
          value: revI18n.fixedDemandValue,
        },
      ],
    },
    {
      id: 'energy-charge-principles',
      title: extra.sectionReverseCalculation,
      fields: [
        {
          key: 'energyFormula',
          label: revI18n.energyFormulaLabel,
          value: revI18n.energyFormulaValue,
        },
        {
          key: 'fpppaFormula',
          label: revI18n.fpppaFormulaLabel,
          value: revI18n.fpppaFormulaValue,
        },
        {
          key: 'electricityDutyRule',
          label: revI18n.electricityDutyRuleLabel,
          value: revI18n.electricityDutyRuleValue,
        },
        {
          key: 'delayedSurchargeRule',
          label: revI18n.delayedSurchargeRuleLabel,
          value: revI18n.delayedSurchargeRuleValue,
        },
      ],
    },
    {
      id: 'billing-terms',
      title: extra.sectionReverseBillingTerms,
      fields: [
        {
          key: 'dueGracePeriod',
          label: revI18n.dueGracePeriodLabel,
          value: revI18n.dueGracePeriodValue,
        },
        {
          key: 'digitalPaymentOptions',
          label: revI18n.digitalPaymentOptionsLabel,
          value: revI18n.digitalPaymentOptionsValue,
        },
        {
          key: 'advanceRebate',
          label: revI18n.advanceRebateLabel,
          value: revI18n.advanceRebateValue,
        },
        {
          key: 'disconnectionWarning',
          label: revI18n.disconnectionWarningLabel,
          value: revI18n.disconnectionWarningValue,
        },
      ],
    },
    {
      id: 'safety-directives',
      title: extra.sectionReverseSafety,
      fields: [
        {
          key: 'elcbMandate',
          label: revI18n.elcbMandateLabel,
          value: revI18n.elcbMandateValue,
        },
        {
          key: 'clearanceStandards',
          label: revI18n.clearanceStandardsLabel,
          value: revI18n.clearanceStandardsValue,
        },
        {
          key: 'wiringStandards',
          label: revI18n.wiringStandardsLabel,
          value: revI18n.wiringStandardsValue,
        },
        {
          key: 'emergencyHelpline',
          label: revI18n.emergencyHelplineLabel,
          value: revI18n.emergencyHelplineValue,
        },
      ],
    },
    {
      id: 'grievance-redressal',
      title: extra.sectionReverseGrievance,
      fields: [
        {
          key: 'subdivisionHelp',
          label: revI18n.subdivisionHelpLabel,
          value: revI18n.subdivisionHelpValue,
        },
        {
          key: 'cgrfForum',
          label: revI18n.cgrfForumLabel,
          value: revI18n.cgrfForumValue,
        },
        {
          key: 'ombudsmanOffice',
          label: revI18n.ombudsmanOfficeLabel,
          value: revI18n.ombudsmanOfficeValue,
        },
        {
          key: 'callCenter',
          label: revI18n.callCenterLabel,
          value: revI18n.callCenterValue,
        },
      ],
    },
    {
      id: 'legal-notice-disclosure',
      title: extra.sectionReverseLegalNotice,
      fields: [
        {
          key: 'statutoryAct',
          label: revI18n.statutoryActLabel,
          value: revI18n.statutoryActValue,
        },
        {
          key: 'corporateReg',
          label: revI18n.corporateRegLabel,
          value: revI18n.corporateRegValue,
        },
        {
          key: 'demoDisclosure',
          label: revI18n.demoDisclosureLabel,
          value: revI18n.demoDisclosureValue,
        },
      ],
    },
  ];

  // Section F — Bill Status
  const statusTone: GeneratedOfficialDocument['statusTone'] = reconciled.isPaid
    ? 'emerald'
    : reconciled.isOverdue
    ? 'rose'
    : reconciled.isPartiallyPaid
    ? 'amber'
    : 'blue';

  const sectionFFields: DocumentFieldItem[] = [
    {
      key: 'billStatus',
      label: ui.paymentStatus,
      value: localizeBillStatus(reconciled.effectiveStatus, language),
      highlight: statusTone,
    },
    {
      key: 'remainingPrincipal',
      label:
        language === 'gu'
          ? 'બાકી મૂળ રકમ'
          : language === 'hi'
          ? 'शेष मूल राशि'
          : language === 'mr'
          ? 'उर्वरित मुद्दल'
          : 'Remaining Principal',
      value: `₹${remainingPrincipalInr.toLocaleString('en-IN', { minimumFractionDigits: remainingPrincipalInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      isMono: true,
    },
    {
      key: 'accruedLateCharges',
      label:
        language === 'gu'
          ? 'વિલંબિત ચુકવણી સરચાર્જ (DPS)'
          : language === 'hi'
          ? 'विलंबित भुगतान अधिभार (DPS)'
          : language === 'mr'
          ? 'विलंब देयक अधिभार (DPS)'
          : 'Accrued Late Charges (DPS)',
      value: `₹${accruedLateChargesInr.toFixed(2)}`,
      isMono: true,
      highlight: accruedLateChargesInr > 0 ? 'rose' : 'default',
    },
    {
      key: 'outstandingBalance',
      label: extra.remainingAmountPayableLabel,
      value: `₹${currentTotalOutstandingInr.toLocaleString('en-IN', { minimumFractionDigits: currentTotalOutstandingInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
      isMono: true,
      highlight: currentTotalOutstandingInr === 0 ? 'emerald' : 'amber',
    },
    {
      key: 'calculationAsOf',
      label:
        language === 'gu'
          ? 'ગણતરી સંદર્ભ'
          : language === 'hi'
          ? 'गणना संदर्भ'
          : language === 'mr'
          ? 'गणना संदर्भ'
          : 'Calculation Reference',
      value: calculationAsOfLabel,
      isMono: true,
    },
  ];
  if (reconciled.paidDate) {
    sectionFFields.push({
      key: 'paidDate',
      label: ui.paymentDate,
      value: reconciled.paidDate,
      isMono: true,
    });
  }
  if (reconciled.transactionRef) {
    sectionFFields.push({
      key: 'transactionRef',
      label: ui.receiptReference,
      value: reconciled.transactionRef,
      isMono: true,
    });
  }

  // Section G — Source Disclosure
  const sectionGFields: DocumentFieldItem[] = [
    {
      key: 'dataSource',
      label: ui.dataSource,
      value: rawBill.isSimulatedDemoBill ? 'SIMULATED / DEMO' : dataSource,
      isMono: true,
    },
    {
      key: 'demoNotice',
      label: ui.demoDataNotice,
      value: extra.demoElectricityBillDisclosure,
    },
  ];

  // 1. Barcode calculation (Code 128)
  const barcodeRef = deriveCanonicalBarcodeReference(
    rawBill.billNo,
    consumerNo,
    rawBill.billMonth
  );
  const barcodeObj = generateCode128Svg(barcodeRef, {
    height: 38,
    moduleWidth: 1.25,
    showHumanReadable: true,
  });

  // 2. Scannable QR Code calculation
  const qrData = deriveCanonicalQrVerificationUrl(
    rawBill.billNo,
    consumerNo
  );
  const qrSvg = generateQrCodeSvg(qrData.url, {
    sizePx: 110,
    margin: 2,
  });

  // 3. Meter Readings & Classification
  const prevReading =
    typeof rawBill.previousReadingKwh === 'number'
      ? rawBill.previousReadingKwh
      : rawConn && typeof rawConn.previousReadingKwh === 'number'
      ? rawConn.previousReadingKwh
      : 14460;
  const curReading =
    typeof rawBill.currentReadingKwh === 'number'
      ? rawBill.currentReadingKwh
      : rawConn && typeof rawConn.currentReadingKwh === 'number'
      ? rawConn.currentReadingKwh
      : 14820;
  const readingDiff = curReading - prevReading;
  const meterMultiplier =
    typeof rawBill.meterMultiplier === 'number' && rawBill.meterMultiplier > 0
      ? rawBill.meterMultiplier
      : 1.0;
  const expectedUnits = Math.round(
    readingDiff * meterMultiplier + (Number(rawBill.meterReplacementAdjustmentKwh) || 0)
  );

  const readingMatchesBilled = expectedUnits === Math.round(rawBill.unitsConsumed);
  const readingClassification: 'Recorded' | 'Simulated' =
    readingMatchesBilled && !rawBill.isSimulatedDemoBill ? 'Recorded' : 'Simulated';
  let readingIntegrityWarning: string | undefined = undefined;
  if (!readingMatchesBilled) {
    readingIntegrityWarning =
      language === 'gu'
        ? `DEMO રીડિંગ નોંધ: મીટર રજિસ્ટર ચાલુ ચક્ર દર્શાવે છે (${curReading.toLocaleString('en-IN')} - ${prevReading.toLocaleString('en-IN')} = ${readingDiff} kWh). બિલ કરેલ યુનિટ: ${rawBill.unitsConsumed} kWh.`
        : language === 'hi'
        ? `DEMO रीडिंग नोट: मीटर रजिस्टर वर्तमान चक्र दर्शाता है (${curReading.toLocaleString('en-IN')} - ${prevReading.toLocaleString('en-IN')} = ${readingDiff} kWh). बिल किए गए यूनिट: ${rawBill.unitsConsumed} kWh.`
        : language === 'mr'
        ? `DEMO रीडिंग नोंद: मीटर रजिस्टर चालू चक्र दर्शवतो (${curReading.toLocaleString('en-IN')} - ${prevReading.toLocaleString('en-IN')} = ${readingDiff} kWh). बिल केलेले युनिट: ${rawBill.unitsConsumed} kWh.`
        : `DEMO Reading Note: Meter register reflects current cycle (${curReading.toLocaleString('en-IN')} - ${prevReading.toLocaleString('en-IN')} = ${readingDiff} kWh). Billed cycle units: ${rawBill.unitsConsumed} kWh.`;
  }

  // 4. Tariff slab arithmetic reconciliation
  const slabs = (rawBill.slabBreakdown || []).map((s) => ({
    slab: localizeSlabDescription(s.slab, language),
    units: s.units,
    rate: s.rate,
    amount: typeof s.amount === 'number' ? Number(s.amount.toFixed(2)) : Number((s.units * s.rate).toFixed(2)),
  }));
  const slabSum = Number(slabs.reduce((sum, s) => sum + s.amount, 0).toFixed(2));
  const slabArithmeticReconciled = Math.abs(slabSum - Number(rawBill.energyCharges || 0)) <= 1;
  let slabIntegrityWarning: string | undefined = undefined;
  if (!slabArithmeticReconciled && slabs.length > 0) {
    slabIntegrityWarning =
      language === 'gu'
        ? `DEMO ડેટા-ઇન્ટેગ્રિટી ચેતવણી: સ્લેબ ગણતરી સરવાળો (₹${slabSum.toFixed(2)}) અને નોંધાયેલ એનર્જી ચાર્જ (₹${Number(rawBill.energyCharges).toFixed(2)}) માં તફાવત છે. પ્રમાણિત રેકોર્ડ જાળવી રાખવામાં આવેલ છે.`
        : language === 'hi'
        ? `DEMO डेटा-अखंडता चेतावनी: स्लैब गणना योग (₹${slabSum.toFixed(2)}) और दर्ज ऊर्जा शुल्क (₹${Number(rawBill.energyCharges).toFixed(2)}) में अंतर है। प्रामाणिक दर्ज मान सुरक्षित रखे गए हैं।`
        : language === 'mr'
        ? `DEMO डेटा-अखंडता सूचना: स्लॅब गणना बेरीज (₹${slabSum.toFixed(2)}) आणि नोंदवलेले ऊर्जा आकार (₹${Number(rawBill.energyCharges).toFixed(2)}) यात फरक आहे. मूळ नोंदवलेली मूल्ये जतन केली आहेत.`
        : `DEMO Data-Integrity Warning: Slab computed total (₹${slabSum.toFixed(2)}) differs from recorded Energy Charges (₹${Number(rawBill.energyCharges).toFixed(2)}). Canonical recorded values are preserved.`;
  }

  // 5. Prior 3 periods mapping (localized month & status)
  const previousPeriods = previousThreeBills.map((b) => {
    const rec = reconcileBillWithPayments(b, input.payments || []);
    return {
      month: localizeBillMonth(b.billMonth, language),
      units: b.unitsConsumed,
      billAmount: b.totalAmount,
      paidAmount: rec.paidAmount,
      balance: rec.outstandingBalance,
      status: localizeBillStatus(rec.effectiveStatus, language),
    };
  });

  // 6. Six Bi-Monthly Period Consumption Comparison Chart
  const sixPeriodComparisonChart = buildSixBiMonthlyPeriodComparisonChart({
    targetBill: rawBill,
    connection: rawConn,
    allBills: input.allBills,
    language,
  });

  const isGidcSubdivision = (rawConn?.subdivision || '').toLowerCase().includes('gidc');
  const isVisnagarSubdivision = (rawConn?.subdivision || '').toLowerCase().includes('visnagar');
  const derivedTariffCode = (rawConn?.tariffCategory || '').includes('NRGP')
    ? 'NRGP'
    : (rawConn?.tariffCategory || '').includes('GLP')
    ? 'GLP'
    : (rawConn?.tariffCategory || '').includes('AG')
    ? 'LTP-AG'
    : 'RGPU';

  const localizedVillageTalukaDistrict = isVisnagarSubdivision
    ? language === 'gu'
      ? 'તાલુકો: વિસનગર | જિલ્લો: મહેસાણા'
      : language === 'hi'
      ? 'तालुका: विसनगर | जिला: महेसाणा'
      : language === 'mr'
      ? 'तालुका: विसनगर | जिल्हा: महेसाणा'
      : 'Taluka: Visnagar | District: Mehsana'
    : language === 'gu'
    ? 'તાલુકો: મહેસાણા | જિલ્લો: મહેસાણા'
    : language === 'hi'
    ? 'तालुका: महेसाणा | जिला: महेसाणा'
    : language === 'mr'
    ? 'तालुका: महेसाणा | जिल्हा: महेसाणा'
    : 'Taluka: Mehsana | District: Mehsana';

  const readingDatesFormatted =
    rawBill.previousReadingDate && rawBill.currentReadingDate
      ? `${rawBill.previousReadingDate} – ${rawBill.currentReadingDate}`
      : `${rawBill.currentReadingDate || rawConn?.lastReadingDate || rawBill.billDate}`;

  const billParticulars: UgvclBillParticulars = {
    circle: localizeSubdivision('Mehsana Circle', language),
    division: localizeSubdivision(
      isVisnagarSubdivision ? 'Visnagar Division' : 'Mehsana Circle',
      language
    ),
    subdivision: localizeSubdivision(rawConn?.subdivision || 'Mehsana City North', language),
    sdoCode: isGidcSubdivision ? 'SDO-MSN-GIDC-02' : isVisnagarSubdivision ? 'SDO-VSN-RUR-01' : 'SDO-MSN-04',
    gstin: '24AABCU4494L1ZV',
    cin: UGVCL_CORPORATE_IDENTITY.cin,
    helpline: '1912 / 1800 233 155335',
    email: 'support@ugvcl.com',
    website: 'www.ugvcl.com',
    registeredOffice: UGVCL_CORPORATE_IDENTITY.registeredOffice,
    consumerName: rawConn?.consumerName || 'Registered UGVCL Consumer',
    premisesAddress: localizeConsumerAddress(
      rawConn?.address || 'Mehsana Service Jurisdiction, North Gujarat',
      language
    ),
    villageTalukaDistrict: localizedVillageTalukaDistrict,
    consumerNo,
    connectionId,
    meterNo: rawConn?.meterNo || 'UG-SM-REGISTERED',
    phase: localizePhase(rawConn?.phase || '1-Phase', language),
    sanctionedLoadKw: rawConn?.sanctionedLoadKw ?? 2.0,
    tariffCategory: localizeTariffCategory(
      rawConn?.tariffCategory || 'Residential (RGPU)',
      language
    ),
    tariffCode: derivedTariffCode,
    connectedDate: rawConn?.connectedDate || '—',
    securityDeposit: rawConn?.securityDeposit ?? 0,
    feederName: localizeFeederName(
      rawConn?.feederName || '11kV Distribution Feeder',
      language
    ),
    feederCode: isGidcSubdivision ? '005GUJ080210' : '005GUJ050000',
    poleNo: isGidcSubdivision ? 'POL-GIDC-48B' : 'POL-0428-19',
    censusCode: '41303000',
    rootCode: isGidcSubdivision ? '4/08/02/048' : '3/02/12/117',
    billNo: rawBill.billNo,
    billMonth: localizeBillMonth(rawBill.billMonth, language),
    canonicalBillMonth: rawBill.billMonth,
    billingCycleType: cycleMeta.billingCycleType,
    billingCycleLabel: localizedCycleType,
    billingCycleShortBadge: localizedCycleShortBadge,
    periodStartDate: cycleMeta.periodStartDate,
    periodEndDate: cycleMeta.periodEndDate,
    billingPeriodLabel: localizedPeriodLabel,
    billDate: rawBill.billDate,
    dueDate: rawBill.dueDate,
    billStatus: localizeBillStatus(reconciled.effectiveStatus, language),
    canonicalBillStatus: reconciled.effectiveStatus,
    previousReadingKwh: prevReading,
    currentReadingKwh: curReading,
    readingDifference: readingDiff,
    meterMultiplier,
    billedUnits: rawBill.unitsConsumed,
    previousReadingDate,
    currentReadingDate,
    readingDates: readingDatesFormatted,
    readingClassification,
    readingProvenance: cycleMeta.readingProvenance,
    readingProvenanceLabel: localizeMeterReadingProvenance(
      cycleMeta.readingProvenance,
      language
    ),
    readingIntegrityWarning,
    tariffCyclePolicyMode: cycleMeta.tariffCyclePolicyMode,
    tariffConfigVersion: cycleMeta.tariffConfigVersion,
    billedDaysCount: cycleMeta.billedDaysCount,
    standardCycleDaysCount: cycleMeta.standardCycleDaysCount,
    isPartialPeriod: cycleMeta.isPartialPeriod,
    energyCharges: rawBill.energyCharges,
    fixedCharges: rawBill.fixedCharges,
    fuelPriceAdjustment: rawBill.fuelPriceAdjustment,
    electricityDuty: rawBill.electricityDuty,
    meterRent: 0,
    otherCharges: Number(rawBill.otherAdjustmentsInr || 0),
    subtotalCurrentCharges: Number(
      (
        Number(rawBill.energyCharges || 0) +
        Number(rawBill.fixedCharges || 0) +
        Number(rawBill.fuelPriceAdjustment || 0) +
        Number(rawBill.electricityDuty || 0) +
        Number(rawBill.otherAdjustmentsInr || 0)
      ).toFixed(2)
    ),
    rebateOrSubsidy: rawBill.rebateOrSubsidy || 0,
    arrears: 0,
    totalBillAmount: rawBill.totalAmount,
    paidAmount: reconciled.paidAmount,
    outstandingBalance: currentTotalOutstandingInr,
    remainingPrincipal: remainingPrincipalInr,
    accruedLateCharges: accruedLateChargesInr,
    waivedOrSettledLateCharges: waivedOrSettledLateChargesInr,
    currentTotalOutstanding: currentTotalOutstandingInr,
    daysOverdue: activeDaysOverdue,
    paidDate: reconciled.paidDate,
    calculationReferenceDate: effectiveRefDate,
    calculationTimestampIst: effectiveTimestampIst,
    calculationAsOfLabel,
    slabBreakdown: slabs,
    slabArithmeticReconciled,
    slabIntegrityWarning,
    previousPeriods,
    sixPeriodComparisonChart,
    barcodeRef,
    barcodeSvg: barcodeObj.svg,
    qrUrl: qrData.url,
    qrSvg,
  };

  return {
    documentType: 'electricity_bill',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: rawBill.billNo,
    filename: buildDocumentFilename('electricity_bill', rawBill.billNo),
    title: extra.electricityBillTitle,
    subtitle: `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`,
    statusLabel: localizeBillStatus(reconciled.effectiveStatus, language),
    statusTone,
    statusBannerNote: `${ui.billReference}: ${rawBill.billNo} · ${extra.currentBillAmountLabel}: ₹${reconciled.totalAmount.toLocaleString('en-IN')} · ${extra.remainingAmountPayableLabel}: ₹${currentTotalOutstandingInr.toLocaleString('en-IN', { minimumFractionDigits: currentTotalOutstandingInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })} · ${calculationAsOfLabel}`,
    reconciliationVerified,
    recordedTimestamp: rawBill.billDate,
    generatedAtDisplay: effectiveRefDate,
    dataSource,
    dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
    demoDisclosureBanner: extra.demoElectricityBillDisclosure,
    footerNote: extra.demoElectricityBillDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typoProfile.isIndic,
    sections: [
      { id: 'ugvcl-identity', title: extra.sectionUgvclIdentity, fields: sectionAFields },
      { id: 'consumer-details', title: extra.sectionConsumerDetails, fields: sectionBFields },
      { id: 'billing-details', title: extra.sectionBillingDetails, fields: sectionCFields },
      {
        id: 'electricity-consumption',
        title: extra.sectionElectricityConsumption,
        fields: sectionDFields,
      },
      {
        id: 'tariff-calculation',
        title: extra.sectionTariffCalculation,
        fields: sectionEFields,
      },
      { id: 'bill-status', title: extra.sectionBillStatus, fields: sectionFFields },
      {
        id: 'source-disclosure',
        title: extra.sectionSourceDisclosure,
        fields: sectionGFields,
      },
    ],
    reverseSideSections,
    tables,
    summaryMetrics: [
      {
        label: extra.currentBillAmountLabel,
        value: `₹${reconciled.totalAmount.toLocaleString('en-IN')}`,
        tone: 'blue',
      },
      {
        label: extra.previouslyPaidAmountLabel,
        value: `₹${reconciled.paidAmount.toLocaleString('en-IN')}`,
        tone: reconciled.paidAmount > 0 ? 'emerald' : 'default',
      },
      {
        label: extra.remainingAmountPayableLabel,
        value: `₹${currentTotalOutstandingInr.toLocaleString('en-IN', { minimumFractionDigits: currentTotalOutstandingInr % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`,
        tone: currentTotalOutstandingInr === 0 ? 'emerald' : 'amber',
      },
      {
        label: extra.dueDateLabel,
        value: rawBill.dueDate,
        tone: reconciled.isOverdue ? 'rose' : 'default',
      },
    ],
    integrityWarnings: integrityWarnings.length > 0 ? integrityWarnings : undefined,
    barcode: {
      canonicalReference: barcodeRef,
      svg: barcodeObj.svg,
    },
    qrCode: {
      canonicalUrl: qrData.url,
      safeBillReference: rawBill.billNo,
      svg: qrSvg,
    },
    billParticulars,
  };
}

export interface GeneratePaymentReceiptInput {
  role?: UserRole;
  actor?: ExportActorIdentity;
  bill?: ElectricityBill | null;
  payment?: PaymentTransaction | null;
  connection?: ElectricityConnection | null;
  allPayments?: PaymentTransaction[];
  language?: Language;
  dataSource?: string;
  referenceDate?: string;
}

export const SETTLEMENT_RECEIPT_11_FIELD_LABELS: Record<Language, {
  sectionTitle: string;
  field1_originalPrincipal: string;
  originalPrincipal: string;
  field2_previouslySettledPrincipal: string;
  previouslySettled: string;
  field3_principalPaidInThisTx: string;
  principalPaidThisTx: string;
  field4_accruedDpsPrior: string;
  accruedDpsPrior: string;
  field5_dpsPaidInThisTx: string;
  dpsPaidThisTx: string;
  field6_lateChargesWaived: string;
  dpsWaived: string;
  field7_paymentReversals: string;
  reversals: string;
  field8_remainingUnpaidPrincipal: string;
  remainingPrincipal: string;
  field9_remainingUnpaidDps: string;
  remainingDps: string;
  field10_netTotalCurrentOutstanding: string;
  netOutstanding: string;
  field11_settlementClassification: string;
  settlementClass: string;
}> = {
  en: {
    sectionTitle: 'Overdue-to-Settlement Financial Trail (11-Field Audit Reconciled)',
    field1_originalPrincipal: '1. Original Principal Amount (Bill Total)',
    originalPrincipal: '1. Original Principal Amount (Bill Total)',
    field2_previouslySettledPrincipal: '2. Previously Settled Principal',
    previouslySettled: '2. Previously Settled Principal',
    field3_principalPaidInThisTx: '3. Principal Paid in this Transaction',
    principalPaidThisTx: '3. Principal Paid in this Transaction',
    field4_accruedDpsPrior: '4. Accrued DPS Assessed Prior to Payment',
    accruedDpsPrior: '4. Accrued DPS Assessed Prior to Payment',
    field5_dpsPaidInThisTx: '5. DPS / Late Charges Paid in this Tx',
    dpsPaidThisTx: '5. DPS / Late Charges Paid in this Tx',
    field6_lateChargesWaived: '6. Late Charges Waived (Approved Waivers)',
    dpsWaived: '6. Late Charges Waived (Approved Waivers)',
    field7_paymentReversals: '7. Payment Reversals Applied',
    reversals: '7. Payment Reversals Applied',
    field8_remainingUnpaidPrincipal: '8. Remaining Unpaid Principal',
    remainingPrincipal: '8. Remaining Unpaid Principal',
    field9_remainingUnpaidDps: '9. Remaining Unpaid DPS',
    remainingDps: '9. Remaining Unpaid DPS',
    field10_netTotalCurrentOutstanding: '10. Net Total Current Outstanding',
    netOutstanding: '10. Net Total Current Outstanding',
    field11_settlementClassification: '11. Settlement Classification & Metadata',
    settlementClass: '11. Settlement Classification & Metadata',
  },
  gu: {
    sectionTitle: 'મુદતવીતીથી પતાવટ નાણાકીય ટ્રેઇલ (૧૧-ક્ષેત્ર ઓડિટ સમાધાન)',
    field1_originalPrincipal: '૧. મૂળ મુદ્દલ રકમ (કુલ બિલ)',
    originalPrincipal: '૧. મૂળ મુદ્દલ રકમ (કુલ બિલ)',
    field2_previouslySettledPrincipal: '૨. અગાઉ ચૂકવેલ મુદ્દલ',
    previouslySettled: '૨. અગાઉ ચૂકવેલ મુદ્દલ',
    field3_principalPaidInThisTx: '૩. આ વ્યવહારમાં ચૂકવેલ મુદ્દલ',
    principalPaidThisTx: '૩. આ વ્યવહારમાં ચૂકવેલ મુદ્દલ',
    field4_accruedDpsPrior: '૪. ચુકવણી પહેલાં આકારણી થયેલ સંચિત DPS',
    accruedDpsPrior: '૪. ચુકવણી પહેલાં આકારણી થયેલ સંચિત DPS',
    field5_dpsPaidInThisTx: '૫. આ વ્યવહારમાં ચૂકવેલ DPS / લેટ ચાર્જ',
    dpsPaidThisTx: '૫. આ વ્યવહારમાં ચૂકવેલ DPS / લેટ ચાર્જ',
    field6_lateChargesWaived: '૬. માફ કરેલ લેટ ચાર્જ (મંજૂર માફી)',
    dpsWaived: '૬. માફ કરેલ લેટ ચાર્જ (મંજૂર માફી)',
    field7_paymentReversals: '૭. લાગુ કરેલ ચુકવણી રિવર્સલ',
    reversals: '૭. લાગુ કરેલ ચુકવણી રિવર્સલ',
    field8_remainingUnpaidPrincipal: '૮. બાકી અવેતન મુદ્દલ',
    remainingPrincipal: '૮. બાકી અવેતન મુદ્દલ',
    field9_remainingUnpaidDps: '૯. બાકી અવેતન DPS',
    remainingDps: '૯. બાકી અવેતન DPS',
    field10_netTotalCurrentOutstanding: '૧૦. ચોખ્ખી કુલ વર્તમાન બાકી રકમ',
    netOutstanding: '૧૦. ચોખ્ખી કુલ વર્તમાન બાકી રકમ',
    field11_settlementClassification: '૧૧. પતાવટ વર્ગીકરણ અને મેટાડેટા',
    settlementClass: '૧૧. પતાવટ વર્ગીકરણ અને મેટાડેટા',
  },
  hi: {
    sectionTitle: 'अतिदेय से निपटान वित्तीय विवरण (11-क्षेत्रीय ऑडिट समाधान)',
    field1_originalPrincipal: '1. मूल मूलधन राशि (कुल बिल)',
    originalPrincipal: '1. मूल मूलधन राशि (कुल बिल)',
    field2_previouslySettledPrincipal: '2. पूर्व में निपटाया गया मूलधन',
    previouslySettled: '2. पूर्व में निपटाया गया मूलधन',
    field3_principalPaidInThisTx: '3. इस लेनदेन में चुकाया गया मूलधन',
    principalPaidThisTx: '3. इस लेनदेन में चुकाया गया मूलधन',
    field4_accruedDpsPrior: '4. भुगतान पूर्व आकलित संचित DPS',
    accruedDpsPrior: '4. भुगतान पूर्व आकलित संचित DPS',
    field5_dpsPaidInThisTx: '5. इस लेनदेन में चुकाया गया DPS / विलंब शुल्क',
    dpsPaidThisTx: '5. इस लेनदेन में चुकाया गया DPS / विलंब शुल्क',
    field6_lateChargesWaived: '6. माफ किया गया विलंब शुल्क (स्वीकृत छूट)',
    dpsWaived: '6. माफ किया गया विलंब शुल्क (स्वीकृत छूट)',
    field7_paymentReversals: '7. लागू किए गए भुगतान प्रतिवर्तन (Reversals)',
    reversals: '7. लागू किए गए भुगतान प्रतिवर्तन (Reversals)',
    field8_remainingUnpaidPrincipal: '8. शेष अदत्त मूलधन',
    remainingPrincipal: '8. शेष अदत्त मूलधन',
    field9_remainingUnpaidDps: '9. शेष अदत्त DPS',
    remainingDps: '9. शेष अदत्त DPS',
    field10_netTotalCurrentOutstanding: '10. शुद्ध कुल वर्तमान बकाया',
    netOutstanding: '10. शुद्ध कुल वर्तमान बकाया',
    field11_settlementClassification: '11. निपटान वर्गीकरण एवं मेटाडेटा',
    settlementClass: '11. निपटान वर्गीकरण एवं मेटाडेटा',
  },
  mr: {
    sectionTitle: 'थकीत ते समझोता आर्थिक तपशील (११-क्षेत्रीय ऑडिट जुळवणी)',
    field1_originalPrincipal: '१. मूळ मुद्दल रक्कम (एकूण बिल)',
    originalPrincipal: '१. मूळ मुद्दल रक्कम (एकूण बिल)',
    field2_previouslySettledPrincipal: '२. पूर्वी जमा केलेले मुद्दल',
    previouslySettled: '२. पूर्वी जमा केलेले मुद्दल',
    field3_principalPaidInThisTx: '३. या व्यवहारात भरलेले मुद्दल',
    principalPaidThisTx: '३. या व्यवहारात भरलेले मुद्दल',
    field4_accruedDpsPrior: '४. भरण्यापूर्वी आकारलेला संचित DPS',
    accruedDpsPrior: '४. भरण्यापूर्वी आकारलेला संचित DPS',
    field5_dpsPaidInThisTx: '५. या व्यवहारात भरलेला DPS / विलंब आकार',
    dpsPaidThisTx: '५. या व्यवहारात भरलेला DPS / विलंब आकार',
    field6_lateChargesWaived: '६. माफ केलेला विलंब आकार (मंजूर सूट)',
    dpsWaived: '६. माफ केलेला विलंब आकार (मंजूर सूट)',
    field7_paymentReversals: '७. लागू केलेले पेमेंट रिव्हर्सल',
    reversals: '७. लागू केलेले पेमेंट रिव्हर्सल',
    field8_remainingUnpaidPrincipal: '८. शिल्लक अदत्त मुद्दल',
    remainingPrincipal: '८. शिल्लक अदत्त मुद्दल',
    field9_remainingUnpaidDps: '९. शिल्लक अदत्त DPS',
    remainingDps: '९. शिल्लक अदत्त DPS',
    field10_netTotalCurrentOutstanding: '१०. निव्वळ एकूण चालू थकबाकी',
    netOutstanding: '१०. निव्वळ एकूण चालू थकबाकी',
    field11_settlementClassification: '१૧. समझोता वर्गीकरण आणि मेटाडेटा',
    settlementClass: '१૧. समझोता वर्गीकरण आणि मेटाडेटा',
  },
};

/**
 * Generates a verified Payment Receipt document model (Part 5) or rejects unpaid/pending/failed records.
 * Supports both Full Settlement and Partial Settlement receipts with exact per-transaction balance accounting.
 * Never mutates the input bill, payment, or connection objects.
 */
export function generatePaymentReceiptDocument(
  input: GeneratePaymentReceiptInput
): GeneratedOfficialDocument {
  const language: Language = input.language || 'en';
  const ui = getDocumentUiTranslations(language);
  const extra = BILL_AND_RECEIPT_EXTRA_LABELS[language] || BILL_AND_RECEIPT_EXTRA_LABELS.en;
  const typoProfile = getLanguageTypographyProfile(language);
  const dataSource = normalizeExportDataSource(input.dataSource);

  const rawBill = input.bill ? stripForbiddenFieldsFromRecord(input.bill) : null;
  const rawPayment = input.payment ? stripForbiddenFieldsFromRecord(input.payment) : null;
  const rawConn = input.connection ? stripForbiddenFieldsFromRecord(input.connection) : null;

  const targetRecord = (rawBill || rawPayment || {}) as Record<string, unknown>;
  const refId =
    rawPayment?.txId ||
    rawBill?.transactionRef ||
    rawBill?.billNo ||
    rawPayment?.billNo ||
    'UNSPECIFIED';

  const isAuthorized =
    !input.role
      ? true
      : authorizeDocumentAccess(
          input.role,
          input.actor || { id: 'demo_consumer', role: input.role, name: 'Consumer' },
          'payment_receipt',
          targetRecord
        );

  if (!isAuthorized) {
    return {
      documentType: 'payment_receipt',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename('payment_receipt', refId),
      title: ui.paymentReceipt,
      subtitle: `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`,
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoPaymentReceiptDisclosure,
      footerNote: ui.demoPaymentReceiptDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  // Check payment eligibility:
  // 1. If payment record is provided, its status MUST be 'Successful'.
  // 2. If only a bill record is provided without a successful payment, it must either be 'Paid'
  //    or 'Partially Paid' with paidAmount > 0.
  const paymentFailedOrPending =
    rawPayment !== null && rawPayment.status !== 'Successful';
  const hasRecordedBillPayment =
    rawBill !== null &&
    (rawBill.status === 'Paid' ||
      (rawBill.status === 'Partially Paid' &&
        typeof rawBill.paidAmount === 'number' &&
        rawBill.paidAmount > 0));
  const billUnpaid =
    rawBill !== null &&
    !hasRecordedBillPayment &&
    (!rawPayment || rawPayment.status !== 'Successful');

  if (paymentFailedOrPending || billUnpaid || (!rawBill && !rawPayment)) {
    const reason = paymentFailedOrPending
      ? ui.receiptNotAvailableForPendingPayment
      : ui.receiptNotAvailableForUnpaidBill;

    const summarySections: DocumentSection[] = [];
    if (rawBill) {
      summarySections.push({
        id: 'unpaid-bill-summary',
        title: ui.paymentSummaryTitle,
        fields: [
          { key: 'billNo', label: ui.billReference, value: rawBill.billNo, isMono: true },
          { key: 'consumerNo', label: ui.consumerNumber, value: rawBill.consumerNo, isMono: true },
          {
            key: 'billingPeriod',
            label: ui.billingPeriod,
            value: localizeBillMonth(rawBill.billMonth, language),
          },
          {
            key: 'status',
            label: ui.paymentStatus,
            value: localizeBillStatus(rawBill.status, language),
            highlight: 'amber',
          },
          {
            key: 'amountPayable',
            label: ui.amountPayable,
            value: `₹${rawBill.totalAmount.toLocaleString('en-IN')}`,
            isMono: true,
            highlight: 'amber',
          },
        ],
      });
    } else if (rawPayment) {
      summarySections.push({
        id: 'pending-payment-summary',
        title: ui.paymentSummaryTitle,
        fields: [
          { key: 'txId', label: ui.receiptReference, value: rawPayment.txId, isMono: true },
          { key: 'billNo', label: ui.billReference, value: rawPayment.billNo, isMono: true },
          {
            key: 'consumerNo',
            label: ui.consumerNumber,
            value: rawPayment.consumerNo,
            isMono: true,
          },
          {
            key: 'status',
            label: ui.paymentStatus,
            value: localizePaymentStatus(rawPayment.status, language),
            highlight: 'rose',
          },
          {
            key: 'amount',
            label: ui.amountPayable,
            value: `₹${rawPayment.amount.toLocaleString('en-IN')}`,
            isMono: true,
          },
        ],
      });
    }

    return {
      documentType: 'payment_receipt',
      displayMode: rawBill ? 'payment_summary' : 'unavailable',
      eligible: false,
      authorized: true,
      referenceId: refId,
      filename: buildDocumentFilename('payment_receipt', refId),
      title: ui.paymentSummaryTitle,
      subtitle: ui.paymentSummarySubtitle,
      statusLabel: rawBill
        ? localizeBillStatus(rawBill.status, language)
        : rawPayment
        ? localizePaymentStatus(rawPayment.status, language)
        : ui.receiptNotAvailableForUnpaidBill,
      statusTone: 'amber',
      statusBannerNote: reason,
      recordedTimestamp: rawBill?.billDate || rawPayment?.date || '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoPaymentReceiptDisclosure,
      footerNote: ui.demoPaymentReceiptDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: summarySections,
      ineligibleReason: reason,
    };
  }

  // Genuine Paid/Partially Paid Bill or Successful Payment Transaction!
  const canonicalReceiptRef =
    rawPayment?.txId || rawBill?.transactionRef || rawBill?.billNo || 'REC-UGVCL';
  const billReference = rawBill?.billNo || rawPayment?.billNo || '—';
  const consumerNo =
    rawBill?.consumerNo || rawPayment?.consumerNo || rawConn?.consumerNo || '—';
  const connectionId = rawBill?.connectionId || rawConn?.connectionId || consumerNo;
  const recordedPaidDate =
    rawPayment?.date || rawBill?.paidDate || rawBill?.billDate || '—';

  // Compute exact transaction settlement ledger (handles both Full & Partial payments accurately!)
  const syntheticOrRealPayment: PaymentTransaction = rawPayment || {
    txId: canonicalReceiptRef,
    consumerNo,
    billNo: billReference,
    date: recordedPaidDate,
    amount:
      typeof rawBill?.paidAmount === 'number' && rawBill.paidAmount > 0
        ? rawBill.paidAmount
        : rawBill?.totalAmount ?? 0,
    paymentMethod: 'UPI / BHIM',
    status: 'Successful',
    bankReference: rawBill?.transactionRef || canonicalReceiptRef,
  };

  const settlement = computeTransactionSettlementBreakdown({
    bill: rawBill,
    payment: syntheticOrRealPayment,
    allPayments: input.allPayments,
  });

  const amountPaidNum = settlement.amountPaidInThisTransaction;
  const isPartialSettlement =
    settlement.settlementClassification === 'PARTIAL_SETTLEMENT';
  const settlementBadgeText = isPartialSettlement
    ? extra.partialSettlementBadge
    : extra.fullSettlementBadge;

  const cycleMeta = rawBill ? resolveBillCycleMetadata(rawBill, rawConn) : null;

  const primaryFields: DocumentFieldItem[] = [
    {
      key: 'receiptReference',
      label: ui.receiptReference,
      value: canonicalReceiptRef,
      isMono: true,
      highlight: 'emerald',
    },
    {
      key: 'billReference',
      label: ui.billReference,
      value: billReference,
      isMono: true,
    },
    {
      key: 'consumerNumber',
      label: ui.consumerNumber,
      value: consumerNo,
      isMono: true,
    },
    {
      key: 'connectionId',
      label: extra.connectionIdLabel,
      value: connectionId,
      isMono: true,
    },
    {
      key: 'paymentStatus',
      label: ui.paymentStatus,
      value: rawPayment
        ? localizePaymentStatus(rawPayment.status, language)
        : localizeBillStatus('Paid', language),
      highlight: 'emerald',
    },
    {
      key: 'settlementClassification',
      label: extra.settlementClassificationLabel,
      value: settlementBadgeText,
      highlight: isPartialSettlement ? 'amber' : 'emerald',
    },
    {
      key: 'paymentDate',
      label: ui.paymentDate,
      value: recordedPaidDate,
      isMono: true,
    },
  ];

  if (cycleMeta) {
    const cycleTypeLabel =
      language === 'gu'
        ? 'બિલિંગ સાયકલ પ્રકાર'
        : language === 'hi'
        ? 'बिलिंग चक्र प्रकार'
        : language === 'mr'
        ? 'बिलિંગ चक्र प्रकार'
        : 'Billing Cycle Type';
    primaryFields.push({
      key: 'billingCycleType',
      label: cycleTypeLabel,
      value: localizeBillingCycleType(cycleMeta.billingCycleType, language),
      highlight: cycleMeta.billingCycleType === 'BI_MONTHLY' ? 'blue' : 'default',
    });
  }

  if (rawPayment?.paymentMethod) {
    primaryFields.push({
      key: 'paymentMethod',
      label: ui.paymentMethod,
      value: localizePaymentMethod(rawPayment.paymentMethod, language),
    });
  }
  if (rawPayment?.bankReference) {
    primaryFields.push({
      key: 'bankReference',
      label: ui.bankReference,
      value: rawPayment.bankReference,
      isMono: true,
    });
  }

  const consumerFields: DocumentFieldItem[] = [];
  if (rawConn?.consumerName) {
    consumerFields.push({
      key: 'consumerName',
      label: ui.consumerName,
      value: rawConn.consumerName,
    });
  }
  if (rawConn?.address) {
    consumerFields.push({
      key: 'serviceAddress',
      label: extra.serviceAddressLabel,
      value: localizeConsumerAddress(rawConn.address, language),
    });
  }
  if (rawConn?.subdivision) {
    consumerFields.push({
      key: 'subdivision',
      label: ui.subdivision,
      value: localizeSubdivision(rawConn.subdivision, language),
    });
  }
  if (rawBill?.billMonth) {
    const periodValue =
      cycleMeta && cycleMeta.billingCycleType === 'BI_MONTHLY'
        ? `${localizeBillMonth(rawBill.billMonth, language)} (${cycleMeta.periodStartDate} – ${cycleMeta.periodEndDate})`
        : localizeBillMonth(rawBill.billMonth, language);
    consumerFields.push({
      key: 'billingPeriod',
      label: ui.billingPeriod,
      value: periodValue,
    });
    if (cycleMeta && cycleMeta.billingCycleType === 'BI_MONTHLY') {
      const periodRangeLabel =
        language === 'gu'
          ? 'બિલિંગ સમયગાળો (પ્રારંભ – અંતિમ)'
          : language === 'hi'
          ? 'बिलिंग अवधि (प्रारंभ – समाप्ति)'
          : language === 'mr'
          ? 'बिलिंग कालावधी (प्रारंभ – समाप्ती)'
          : 'Billing Period (Start – End)';
      consumerFields.push({
        key: 'billingPeriodRange',
        label: periodRangeLabel,
        value: `${cycleMeta.periodStartDate} – ${cycleMeta.periodEndDate}`,
        isMono: true,
      });
    }
  }
  if (rawConn?.tariffCategory) {
    consumerFields.push({
      key: 'tariffCategory',
      label: ui.tariffCategory,
      value: localizeTariffCategory(rawConn.tariffCategory, language),
    });
  }
  if (rawConn?.meterNo) {
    consumerFields.push({
      key: 'meterNumber',
      label: extra.meterNumberLabel,
      value: `${rawConn.meterNo} (${localizePhase(rawConn.phase || '1-Phase', language)})`,
      isMono: true,
    });
  }

  const trailLabels =
    SETTLEMENT_RECEIPT_11_FIELD_LABELS[language] || SETTLEMENT_RECEIPT_11_FIELD_LABELS.en;

  // Full 11-Field Overdue-to-Settlement Financial Trail (Step 4D)
  const settlement11Fields: DocumentFieldItem[] = [
    {
      key: 'field1_originalPrincipal',
      label: trailLabels.field1_originalPrincipal,
      value: `₹${settlement.originalPrincipalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
    },
    {
      key: 'field2_previouslySettledPrincipal',
      label: trailLabels.field2_previouslySettledPrincipal,
      value: `₹${settlement.previouslySettledPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
    },
    {
      key: 'field3_principalPaidInThisTx',
      label: trailLabels.field3_principalPaidInThisTx,
      value: `₹${settlement.principalPaidInThisTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: 'emerald',
    },
    {
      key: 'field4_accruedDpsPrior',
      label: trailLabels.field4_accruedDpsPrior,
      value: `+₹${settlement.accruedLateChargesPriorToPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.accruedLateChargesPriorToPayment > 0 ? 'rose' : undefined,
    },
    {
      key: 'field5_dpsPaidInThisTx',
      label: trailLabels.field5_dpsPaidInThisTx,
      value: `₹${settlement.lateChargesPaidInThisTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.lateChargesPaidInThisTransaction > 0 ? 'emerald' : undefined,
    },
    {
      key: 'field6_lateChargesWaived',
      label: trailLabels.field6_lateChargesWaived,
      value: `₹${settlement.lateChargesWaived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.lateChargesWaived > 0 ? 'blue' : undefined,
    },
    {
      key: 'field7_paymentReversals',
      label: trailLabels.field7_paymentReversals,
      value: `₹${settlement.paymentReversalsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.hasReversals ? 'amber' : undefined,
    },
    {
      key: 'field8_remainingUnpaidPrincipal',
      label: trailLabels.field8_remainingUnpaidPrincipal,
      value: `₹${settlement.remainingUnpaidPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.remainingUnpaidPrincipal === 0 ? 'emerald' : 'amber',
    },
    {
      key: 'field9_remainingUnpaidDps',
      label: trailLabels.field9_remainingUnpaidDps,
      value: `₹${settlement.remainingUnpaidLateCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.remainingUnpaidLateCharges === 0 ? 'emerald' : 'rose',
    },
    {
      key: 'field10_netTotalCurrentOutstanding',
      label: trailLabels.field10_netTotalCurrentOutstanding,
      value: `₹${settlement.netTotalCurrentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      isMono: true,
      highlight: settlement.netTotalCurrentOutstanding === 0 ? 'emerald' : 'rose',
    },
    {
      key: 'field11_settlementClassification',
      label: trailLabels.field11_settlementClassification,
      value: `${settlementBadgeText} · Ref: ${settlement.transactionReference} · Method: ${settlement.paymentMethod} · Date: ${settlement.paymentTimestamp}`,
      highlight: isPartialSettlement ? 'amber' : 'emerald',
    },
  ];

  const financialFields: DocumentFieldItem[] = [
    {
      key: 'amountPaid',
      label: ui.amountPaid,
      value: `₹${amountPaidNum.toLocaleString('en-IN')}`,
      isMono: true,
      highlight: 'emerald',
    },
    {
      key: 'totalBillAmount',
      label: extra.totalBillAmountLabel,
      value: `₹${settlement.billTotalAmount.toLocaleString('en-IN')}`,
      isMono: true,
    },
    {
      key: 'previouslySettledAmount',
      label: extra.previouslySettledAmountLabel,
      value: `₹${settlement.previouslySettledAmount.toLocaleString('en-IN')}`,
      isMono: true,
    },
    {
      key: 'remainingBalanceAfterPayment',
      label: extra.remainingBalanceAfterPaymentLabel,
      value: `₹${settlement.remainingBalanceAfterTransaction.toLocaleString('en-IN')}`,
      isMono: true,
      highlight: settlement.remainingBalanceAfterTransaction === 0 ? 'emerald' : 'amber',
    },
    ...settlement11Fields,
  ];
  if (rawBill) {
    financialFields.push(
      {
        key: 'unitsConsumed',
        label: ui.unitsConsumed,
        value: `${rawBill.unitsConsumed} kWh`,
        isMono: true,
      },
      {
        key: 'energyCharges',
        label: ui.energyCharges,
        value: `₹${rawBill.energyCharges.toLocaleString('en-IN')}`,
        isMono: true,
      },
      {
        key: 'fixedCharges',
        label: ui.fixedCharges,
        value: `₹${rawBill.fixedCharges.toLocaleString('en-IN')}`,
        isMono: true,
      },
      {
        key: 'fuelPriceAdjustment',
        label: ui.fuelPriceAdjustment,
        value: `₹${rawBill.fuelPriceAdjustment.toLocaleString('en-IN')}`,
        isMono: true,
      },
      {
        key: 'electricityDuty',
        label: ui.electricityDuty,
        value: `₹${rawBill.electricityDuty.toLocaleString('en-IN')}`,
        isMono: true,
      }
    );
    if (typeof rawBill.rebateOrSubsidy === 'number' && rawBill.rebateOrSubsidy !== 0) {
      financialFields.push({
        key: 'rebateOrSubsidy',
        label: ui.rebateOrSubsidy,
        value: `-₹${Math.abs(rawBill.rebateOrSubsidy).toLocaleString('en-IN')}`,
        isMono: true,
      });
    }
  }

  const sections: DocumentSection[] = [
    {
      id: 'primary-identifiers',
      title: ui.sectionPrimaryIdentifiers,
      fields: primaryFields,
    },
  ];

  if (consumerFields.length > 0) {
    sections.push({
      id: 'consumer-details',
      title: ui.sectionConsumerAndPremises,
      fields: consumerFields,
    });
  }

  sections.push({
    id: 'settlement-breakdown',
    title: trailLabels.sectionTitle,
    fields: settlement11Fields,
  });

  sections.push({
    id: 'financial-breakdown',
    title: ui.sectionFinancialBreakdown,
    fields: financialFields,
  });

  const tables: PdfDocumentTable[] = [
    {
      id: 'receipt-settlement-table',
      title: trailLabels.sectionTitle,
      columns: [
        { key: 'item', header: extra.chargeColComponent, align: 'left', widthRatio: 2.6 },
        { key: 'amount', header: extra.chargeColAmount, align: 'right', widthRatio: 1.4 },
      ],
      rows: [
        {
          item: trailLabels.field1_originalPrincipal,
          amount: `₹${settlement.originalPrincipalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field2_previouslySettledPrincipal,
          amount: `₹${settlement.previouslySettledPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field3_principalPaidInThisTx,
          amount: `₹${settlement.principalPaidInThisTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field4_accruedDpsPrior,
          amount: `₹${settlement.accruedLateChargesPriorToPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field5_dpsPaidInThisTx,
          amount: `₹${settlement.lateChargesPaidInThisTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field6_lateChargesWaived,
          amount: `₹${settlement.lateChargesWaived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field7_paymentReversals,
          amount: `₹${settlement.paymentReversalsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field8_remainingUnpaidPrincipal,
          amount: `₹${settlement.remainingUnpaidPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field9_remainingUnpaidDps,
          amount: `₹${settlement.remainingUnpaidLateCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field10_netTotalCurrentOutstanding,
          amount: `₹${settlement.netTotalCurrentOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        },
        {
          item: trailLabels.field11_settlementClassification,
          amount: settlementBadgeText,
        },
      ],
      footerNote: `${settlementBadgeText} — ${settlement.resultingBillStatusAfterTransaction === 'Paid' ? 'Bill Fully Settled' : 'Partial Payment Acknowledged'}`,
    },
  ];

  return {
    documentType: 'payment_receipt',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: canonicalReceiptRef,
    filename: buildDocumentFilename('payment_receipt', canonicalReceiptRef),
    title: ui.paymentReceipt,
    subtitle: `${UGVCL_COMPANY_NAME_EN} (${UGVCL_COMPANY_NAME_GU})`,
    statusLabel: isPartialSettlement
      ? `${localizePaymentStatus('Successful', language)} (${localizeBillStatus('Partially Paid', language)})`
      : rawPayment
      ? localizePaymentStatus(rawPayment.status, language)
      : localizeBillStatus('Paid', language),
    statusTone: isPartialSettlement ? 'amber' : 'emerald',
    statusBannerNote: `${extra.amountPaidInThisTxLabel}: ₹${amountPaidNum.toLocaleString('en-IN')} · ${extra.remainingBalanceAfterPaymentLabel}: ₹${settlement.remainingBalanceAfterTransaction.toLocaleString('en-IN')} · ${ui.paymentDate}: ${recordedPaidDate}`,
    settlementClassification: isPartialSettlement ? 'PARTIAL_SETTLEMENT' : 'FULL_SETTLEMENT',
    settlement11Fields: settlement,
    recordedTimestamp: recordedPaidDate,
    generatedAtDisplay: recordedPaidDate,
    dataSource,
    dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
    demoDisclosureBanner: ui.demoPaymentReceiptDisclosure,
    footerNote: ui.demoPaymentReceiptDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typoProfile.isIndic,
    sections,
    tables,
    summaryMetrics: [
      {
        label: extra.amountPaidInThisTxLabel,
        value: `₹${amountPaidNum.toLocaleString('en-IN')}`,
        tone: 'emerald',
      },
      {
        label: extra.totalBillAmountLabel,
        value: `₹${settlement.billTotalAmount.toLocaleString('en-IN')}`,
        tone: 'blue',
      },
      {
        label: extra.previouslySettledAmountLabel,
        value: `₹${settlement.previouslySettledAmount.toLocaleString('en-IN')}`,
        tone: 'default',
      },
      {
        label: extra.remainingBalanceAfterPaymentLabel,
        value: `₹${settlement.remainingBalanceAfterTransaction.toLocaleString('en-IN')}`,
        tone: settlement.remainingBalanceAfterTransaction === 0 ? 'emerald' : 'amber',
      },
    ],
  };
}

export interface GenerateApplicationAcknowledgmentInput {
  role: UserRole;
  actor: ExportActorIdentity;
  application: Partial<NewConnectionApplication> | null | undefined;
  language?: Language;
  dataSource?: string;
  forceServiceRequestType?: boolean;
}

/**
 * Generates an Application Submission Acknowledgment or Service Request Acknowledgment.
 * Rejects unsaved drafts (missing canonical ID or appliedDate).
 * Explicitly distinguishes Submitted vs. Under Review vs. Approved vs. Rejected.
 */
export function generateApplicationAcknowledgmentDocument(
  input: GenerateApplicationAcknowledgmentInput
): GeneratedOfficialDocument {
  const language: Language = input.language || 'en';
  const ui = getDocumentUiTranslations(language);
  const typoProfile = getLanguageTypographyProfile(language);
  const dataSource = normalizeExportDataSource(input.dataSource);

  const rawApp = input.application
    ? stripForbiddenFieldsFromRecord(input.application)
    : null;

  const isServiceRequest =
    input.forceServiceRequestType ||
    rawApp?.serviceRequestType === 'SOLAR_NET_METERING' ||
    rawApp?.serviceRequestType === 'LOAD_CHANGE';

  const docType: OfficialDocumentType = isServiceRequest
    ? 'service_request_acknowledgment'
    : 'application_acknowledgment';

  const refId = rawApp?.id ? String(rawApp.id).trim() : 'DRAFT';
  const docTitle = isServiceRequest
    ? ui.serviceRequestAcknowledgment
    : ui.applicationAcknowledgment;

  // Check if record is an unsaved draft or missing required submission fields
  const validStatuses = new Set([
    'Submitted',
    'Document Verification',
    'Site Inspection',
    'Sanction Approval',
    'Meter Installed',
    'Rejected',
  ]);
  const isSubmittedRecord =
    Boolean(rawApp && rawApp.id && String(rawApp.id).trim()) &&
    Boolean(rawApp?.appliedDate && String(rawApp.appliedDate).trim()) &&
    Boolean(rawApp?.status && validStatuses.has(rawApp.status));

  if (!rawApp || !isSubmittedRecord) {
    return {
      documentType: docType,
      displayMode: 'unavailable',
      eligible: false,
      authorized: true,
      referenceId: refId,
      filename: buildDocumentFilename(docType, refId),
      title: docTitle,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: ui.acknowledgmentNotAvailableForDraft,
      statusTone: 'amber',
      statusBannerNote: ui.acknowledgmentNotAvailableForDraft,
      recordedTimestamp: '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
      footerNote: ui.demoAcknowledgmentDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.acknowledgmentNotAvailableForDraft,
    };
  }

  const isAuthorized = authorizeDocumentAccess(
    input.role,
    input.actor,
    docType,
    rawApp as unknown as Record<string, unknown>
  );

  if (!isAuthorized) {
    return {
      documentType: docType,
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename(docType, refId),
      title: docTitle,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: rawApp.appliedDate || '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
      footerNote: ui.demoAcknowledgmentDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  const lifecycleClass = classifyApplicationLifecycleStage(rawApp.status!);

  let statusBannerNote = ui.statusSubmittedNote;
  let statusTone: GeneratedOfficialDocument['statusTone'] = 'blue';
  let nextStepText = ui.nextStepDocVerification;

  switch (rawApp.status) {
    case 'Submitted':
      statusBannerNote = ui.statusSubmittedNote;
      statusTone = 'blue';
      nextStepText = ui.nextStepDocVerification;
      break;
    case 'Document Verification':
      statusBannerNote = ui.statusUnderReviewNote;
      statusTone = 'amber';
      nextStepText = ui.nextStepSiteInspection;
      break;
    case 'Site Inspection':
      statusBannerNote = ui.statusUnderReviewNote;
      statusTone = 'amber';
      nextStepText = ui.nextStepSanctionApproval;
      break;
    case 'Sanction Approval':
      statusBannerNote = ui.statusApprovedNote;
      statusTone = 'emerald';
      nextStepText = ui.nextStepMeterInstallation;
      break;
    case 'Meter Installed':
      statusBannerNote = ui.statusMeterInstalledNote;
      statusTone = 'emerald';
      nextStepText = ui.nextStepCompleted;
      break;
    case 'Rejected':
      statusBannerNote = ui.statusRejectedNote;
      statusTone = 'rose';
      nextStepText = ui.nextStepApplicantResubmission;
      break;
  }

  const requestTypeCode = rawApp.serviceRequestType || 'NEW_CONNECTION';
  const requestTypeDisplay =
    requestTypeCode === 'SOLAR_NET_METERING'
      ? 'Solar Rooftop Net-Metering (SOLAR_NET_METERING)'
      : requestTypeCode === 'LOAD_CHANGE'
      ? 'Load Extension / Reduction (LOAD_CHANGE)'
      : 'New Electricity Service Connection (NEW_CONNECTION)';

  const primaryFields: DocumentFieldItem[] = [
    {
      key: 'applicationId',
      label: isServiceRequest ? ui.serviceRequestId : ui.applicationId,
      value: refId,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'requestType',
      label: ui.requestType,
      value: requestTypeDisplay,
    },
    {
      key: 'submittedOn',
      label: ui.submittedOn,
      value: rawApp.appliedDate || '—',
      isMono: true,
    },
    {
      key: 'currentStatus',
      label: ui.currentStatus,
      value: localizeApplicationStatus(rawApp.status!, language),
      highlight: statusTone,
    },
    {
      key: 'nextExpectedStep',
      label: ui.nextExpectedStep,
      value: nextStepText,
    },
  ];

  const applicantFields: DocumentFieldItem[] = [
    {
      key: 'applicantName',
      label: ui.applicantName,
      value: rawApp.applicantName || '—',
    },
    {
      key: 'subdivision',
      label: ui.subdivision,
      value: localizeSubdivision(rawApp.subdivision || 'Mehsana City North', language),
    },
  ];

  if (rawApp.linkedConsumerNo) {
    applicantFields.push({
      key: 'linkedConsumerNo',
      label: ui.consumerNumber,
      value: rawApp.linkedConsumerNo,
      isMono: true,
    });
  }
  if (rawApp.address) {
    applicantFields.push({
      key: 'address',
      label: ui.siteLocation,
      value: localizeConsumerAddress(rawApp.address, language),
    });
  }

  const techFields: DocumentFieldItem[] = [
    {
      key: 'tariffCategory',
      label: ui.tariffCategory,
      value: localizeTariffCategory(rawApp.category || 'Residential (RGPU)', language),
    },
    {
      key: 'requestedLoad',
      label: ui.requestedLoad,
      value: `${rawApp.requestedLoadKw ?? 0} kW`,
      isMono: true,
    },
    {
      key: 'supplyPhase',
      label: ui.supplyPhase,
      value: localizePhase(rawApp.phase || '1-Phase', language),
    },
  ];

  if (
    rawApp.serviceRequestType === 'LOAD_CHANGE' &&
    typeof rawApp.currentSanctionedLoadKw === 'number'
  ) {
    techFields.push({
      key: 'currentSanctionedLoad',
      label: ui.currentSanctionedLoad,
      value: `${rawApp.currentSanctionedLoadKw} kW`,
      isMono: true,
    });
  }
  if (rawApp.loadChangeDirection) {
    techFields.push({
      key: 'loadChangeDirection',
      label: ui.loadChangeDirection,
      value: rawApp.loadChangeDirection,
    });
  }
  if (typeof rawApp.estimatedSanctionCost === 'number') {
    techFields.push({
      key: 'estimatedSanctionCost',
      label: ui.estimatedSanctionCost,
      value: `₹${rawApp.estimatedSanctionCost.toLocaleString('en-IN')}`,
      isMono: true,
    });
  }
  if (rawApp.targetCompletionDate) {
    techFields.push({
      key: 'targetCompletionDate',
      label: ui.targetCompletionDate,
      value: rawApp.targetCompletionDate,
      isMono: true,
    });
  }
  if (Array.isArray(rawApp.documentsSubmitted) && rawApp.documentsSubmitted.length > 0) {
    techFields.push({
      key: 'documentsSubmitted',
      label: ui.documentsSubmitted,
      value: rawApp.documentsSubmitted.map((d) => localizeDocumentName(d, language)).join(' · '),
    });
  }

  return {
    documentType: docType,
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: refId,
    filename: buildDocumentFilename(docType, refId),
    title: docTitle,
    subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
    statusLabel: localizeApplicationStatus(rawApp.status!, language),
    statusTone,
    statusBannerNote,
    lifecycleClassification: lifecycleClass,
    recordedTimestamp: rawApp.appliedDate || '—',
    generatedAtDisplay: rawApp.appliedDate || '15-Oct-2026',
    dataSource,
    dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
    demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
    footerNote: ui.demoAcknowledgmentDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typoProfile.isIndic,
    sections: [
      {
        id: 'primary-identifiers',
        title: ui.sectionPrimaryIdentifiers,
        fields: primaryFields,
      },
      {
        id: 'applicant-premises',
        title: ui.sectionConsumerAndPremises,
        fields: applicantFields,
      },
      {
        id: 'technical-specs',
        title: ui.sectionTechnicalSpecifications,
        fields: techFields,
      },
    ],
  };
}

export interface GenerateComplaintAcknowledgmentInput {
  role: UserRole;
  actor: ExportActorIdentity;
  complaint: Partial<ComplaintRecord> | null | undefined;
  language?: Language;
  dataSource?: string;
}

/**
 * Generates a Complaint Registration Acknowledgment.
 * Strips internal work-order IDs, internal technician assignments, and employee-only notes for consumer views.
 */
export function generateComplaintAcknowledgmentDocument(
  input: GenerateComplaintAcknowledgmentInput
): GeneratedOfficialDocument {
  const language: Language = input.language || 'en';
  const ui = getDocumentUiTranslations(language);
  const typoProfile = getLanguageTypographyProfile(language);
  const dataSource = normalizeExportDataSource(input.dataSource);

  const rawCmp = input.complaint
    ? stripForbiddenFieldsFromRecord(input.complaint)
    : null;

  const refId = rawCmp?.id ? String(rawCmp.id).trim() : 'UNREGISTERED';
  const isRegistered =
    Boolean(rawCmp && rawCmp.id && String(rawCmp.id).trim()) &&
    Boolean(rawCmp?.filedAt && String(rawCmp.filedAt).trim()) &&
    Boolean(rawCmp?.status);

  if (!rawCmp || !isRegistered) {
    return {
      documentType: 'complaint_acknowledgment',
      displayMode: 'unavailable',
      eligible: false,
      authorized: true,
      referenceId: refId,
      filename: buildDocumentFilename('complaint_acknowledgment', refId),
      title: ui.complaintAcknowledgment,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: ui.acknowledgmentNotAvailableForDraft,
      statusTone: 'amber',
      statusBannerNote: ui.acknowledgmentNotAvailableForDraft,
      recordedTimestamp: '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
      footerNote: ui.demoAcknowledgmentDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.acknowledgmentNotAvailableForDraft,
    };
  }

  const isAuthorized = authorizeDocumentAccess(
    input.role,
    input.actor,
    'complaint_acknowledgment',
    rawCmp as unknown as Record<string, unknown>
  );

  if (!isAuthorized) {
    return {
      documentType: 'complaint_acknowledgment',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename('complaint_acknowledgment', refId),
      title: ui.complaintAcknowledgment,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: rawCmp.filedAt || '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
      footerNote: ui.demoAcknowledgmentDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  const isResolved = rawCmp.status === 'Resolved' || rawCmp.status === 'Closed';
  const statusTone: GeneratedOfficialDocument['statusTone'] = isResolved ? 'emerald' : 'blue';

  const primaryFields: DocumentFieldItem[] = [
    {
      key: 'complaintId',
      label: ui.complaintId,
      value: refId,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'consumerNumber',
      label: ui.consumerNumber,
      value: rawCmp.consumerNo || '—',
      isMono: true,
    },
    {
      key: 'complaintCategory',
      label: ui.complaintCategory,
      value: localizeComplaintCategory(rawCmp.category || 'Power Outage', language),
      highlight: 'amber',
    },
    {
      key: 'registeredOn',
      label: ui.registeredOn,
      value: rawCmp.filedAt || '—',
      isMono: true,
    },
    {
      key: 'currentStatus',
      label: ui.currentStatus,
      value: localizeComplaintStatus(rawCmp.status!, language),
      highlight: statusTone,
    },
  ];

  const consumerFields: DocumentFieldItem[] = [
    {
      key: 'consumerName',
      label: ui.consumerName,
      value: rawCmp.consumerName || '—',
    },
    {
      key: 'subdivision',
      label: ui.subdivision,
      value: localizeSubdivision(rawCmp.subdivision || 'Mehsana City North', language),
    },
  ];

  const slaAndDetailsFields: DocumentFieldItem[] = [
    {
      key: 'complaintDescription',
      label: ui.complaintDescription,
      value: localizeComplaintDescription(refId, rawCmp.description || '', language),
    },
  ];

  if (typeof rawCmp.slaTargetHours === 'number') {
    slaAndDetailsFields.push({
      key: 'slaTargetWindow',
      label: ui.slaTargetWindow,
      value: `${rawCmp.slaTargetHours} hrs`,
      isMono: true,
    });
  }
  if (rawCmp.slaDueTime) {
    slaAndDetailsFields.push({
      key: 'expectedResolutionBy',
      label: ui.expectedResolutionBy,
      value: rawCmp.slaDueTime,
      isMono: true,
    });
  }
  if (rawCmp.resolutionRemarks) {
    slaAndDetailsFields.push({
      key: 'resolutionSummary',
      label: ui.resolutionSummary,
      value: localizeComplaintResolution(refId, rawCmp.resolutionRemarks, language) || rawCmp.resolutionRemarks,
      highlight: 'emerald',
    });
  }

  return {
    documentType: 'complaint_acknowledgment',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: refId,
    filename: buildDocumentFilename('complaint_acknowledgment', refId),
    title: ui.complaintAcknowledgment,
    subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
    statusLabel: localizeComplaintStatus(rawCmp.status!, language),
    statusTone,
    statusBannerNote: `${ui.complaintId}: ${refId} · ${ui.registeredOn}: ${rawCmp.filedAt}`,
    recordedTimestamp: rawCmp.filedAt || '—',
    generatedAtDisplay: rawCmp.filedAt || '15-Oct-2026',
    dataSource,
    dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
    demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
    footerNote: ui.demoAcknowledgmentDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typoProfile.isIndic,
    sections: [
      {
        id: 'primary-identifiers',
        title: ui.sectionPrimaryIdentifiers,
        fields: primaryFields,
      },
      {
        id: 'consumer-details',
        title: ui.sectionConsumerAndPremises,
        fields: consumerFields,
      },
      {
        id: 'grievance-sla-details',
        title: ui.sectionGrievanceAndSlaDetails,
        fields: slaAndDetailsFields,
      },
    ],
  };
}

export interface GenerateInspectionSummaryInput {
  role: UserRole;
  actor: ExportActorIdentity;
  workOrder: Partial<WorkOrder> | null | undefined;
  language?: Language;
  dataSource?: string;
}

/**
 * Generates an Inspection Summary / Acknowledgment for an authorized Field Engineer or Employee.
 * Rejects unassigned Field Engineers and work orders without recorded inspection findings.
 */
export function generateInspectionSummaryDocument(
  input: GenerateInspectionSummaryInput
): GeneratedOfficialDocument {
  const language: Language = input.language || 'en';
  const ui = getDocumentUiTranslations(language);
  const typoProfile = getLanguageTypographyProfile(language);
  const dataSource = normalizeExportDataSource(input.dataSource);

  const rawWo = input.workOrder
    ? stripForbiddenFieldsFromRecord(input.workOrder)
    : null;

  const refId = rawWo?.id ? String(rawWo.id).trim() : 'WO-UNKNOWN';

  if (!rawWo || !rawWo.id) {
    return {
      documentType: 'inspection_summary',
      displayMode: 'unavailable',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename('inspection_summary', refId),
      title: ui.inspectionSummary,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: ui.inspectionSummaryNotAvailable,
      statusTone: 'amber',
      statusBannerNote: ui.inspectionSummaryNotAvailable,
      recordedTimestamp: '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoInspectionDisclosure,
      footerNote: ui.demoInspectionDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.inspectionSummaryNotAvailable,
    };
  }

  const isAuthorized = authorizeDocumentAccess(
    input.role,
    input.actor,
    'inspection_summary',
    rawWo as unknown as Record<string, unknown>
  );

  if (!isAuthorized) {
    return {
      documentType: 'inspection_summary',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: refId,
      filename: buildDocumentFilename('inspection_summary', refId),
      title: ui.inspectionSummary,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: rawWo.scheduledDate || '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoInspectionDisclosure,
      footerNote: ui.demoInspectionDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  // Must have recorded inspectionReport findings — never invent findings!
  if (!rawWo.inspectionReport) {
    return {
      documentType: 'inspection_summary',
      displayMode: 'unavailable',
      eligible: false,
      authorized: true,
      referenceId: refId,
      filename: buildDocumentFilename('inspection_summary', refId),
      title: ui.inspectionSummary,
      subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
      statusLabel: localizeWorkOrderStatus(rawWo.status || 'Pending', language),
      statusTone: 'amber',
      statusBannerNote: ui.inspectionSummaryNotAvailable,
      recordedTimestamp: rawWo.scheduledDate || '—',
      generatedAtDisplay: '15-Oct-2026',
      dataSource,
      dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
      demoDisclosureBanner: ui.demoInspectionDisclosure,
      footerNote: ui.demoInspectionDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typoProfile.isIndic,
      sections: [],
      ineligibleReason: ui.inspectionSummaryNotAvailable,
    };
  }

  const report = rawWo.inspectionReport;
  const lastActionTime =
    Array.isArray(rawWo.actionHistory) && rawWo.actionHistory.length > 0
      ? rawWo.actionHistory[rawWo.actionHistory.length - 1]?.timestamp
      : undefined;
  const recordedTime = lastActionTime || rawWo.scheduledDate || '15-Oct-2026';

  const primaryFields: DocumentFieldItem[] = [
    {
      key: 'inspectionOrderId',
      label: ui.inspectionOrderId,
      value: refId,
      isMono: true,
      highlight: 'blue',
    },
    {
      key: 'workOrderType',
      label: ui.requestType,
      value: `${localizeWorkOrderType(rawWo.type || 'Site Inspection', language)} — ${localizeWorkOrderTitle(rawWo.title || '', language)}`,
    },
    {
      key: 'assignedFieldEngineer',
      label: ui.assignedFieldEngineer,
      value: localizeAssignedActorName(rawWo.assignedTo || '', language),
    },
    {
      key: 'inspectedOn',
      label: ui.inspectedOn,
      value: localizeWorkOrderScheduledDate(recordedTime, language),
      isMono: true,
    },
    {
      key: 'currentStatus',
      label: ui.currentStatus,
      value: localizeWorkOrderStatus(rawWo.status || 'Completed', language),
      highlight: rawWo.status === 'Completed' ? 'emerald' : 'blue',
    },
  ];

  if (rawWo.applicationId) {
    primaryFields.push({
      key: 'applicationId',
      label: ui.applicationId,
      value: rawWo.applicationId,
      isMono: true,
    });
  }
  if (rawWo.complaintId) {
    primaryFields.push({
      key: 'complaintId',
      label: ui.complaintId,
      value: rawWo.complaintId,
      isMono: true,
    });
  }

  const locationFields: DocumentFieldItem[] = [
    {
      key: 'subdivision',
      label: ui.subdivision,
      value: localizeSubdivision(rawWo.subdivision || 'Mehsana City North', language),
    },
    {
      key: 'siteLocation',
      label: ui.siteLocation,
      value: localizeConsumerAddress(rawWo.location || '', language),
    },
  ];

  if (rawWo.feederName) {
    locationFields.push({
      key: 'feederName',
      label: ui.feederName,
      value: rawWo.feederName,
    });
  }
  if (rawWo.consumerNo) {
    locationFields.push({
      key: 'consumerNumber',
      label: ui.consumerNumber,
      value: rawWo.consumerNo,
      isMono: true,
    });
  }

  const findingsFields: DocumentFieldItem[] = [
    {
      key: 'scannedMeterSerial',
      label: ui.scannedMeterSerial,
      value: report.meterSerialScanned || '—',
      isMono: true,
    },
    {
      key: 'verifiedReadingKwh',
      label: ui.verifiedReadingKwh,
      value: `${report.readingKwh} kWh`,
      isMono: true,
    },
    {
      key: 'opticalSealStatus',
      label: ui.opticalSealStatus,
      value: localizeSealStatus(report.sealIntact, language),
      highlight: report.sealIntact ? 'emerald' : 'rose',
    },
    {
      key: 'terminalCondition',
      label: ui.terminalCondition,
      value: localizeTerminalCondition(report.terminalCondition, language),
    },
  ];

  if (report.testedPhaseVoltage) {
    findingsFields.push({
      key: 'testedPhaseVoltages',
      label: ui.testedPhaseVoltages,
      value: `${report.testedPhaseVoltage.r}V / ${report.testedPhaseVoltage.y}V / ${report.testedPhaseVoltage.b}V`,
      isMono: true,
    });
  }

  findingsFields.push(
    {
      key: 'photoEvidenceAttached',
      label: ui.photoEvidenceAttached,
      value: report.photoUploaded ? ui.yesRecorded : ui.noRecorded,
    },
    {
      key: 'technicianRemarks',
      label: ui.technicianRemarks,
      value: localizeFieldTechnicianRemarks(report.technicianRemarks || '', language),
    }
  );

  return {
    documentType: 'inspection_summary',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: refId,
    filename: buildDocumentFilename('inspection_summary', refId),
    title: ui.inspectionSummary,
    subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL)',
    statusLabel: localizeWorkOrderStatus(rawWo.status || 'Completed', language),
    statusTone: rawWo.status === 'Completed' ? 'emerald' : 'blue',
    statusBannerNote: `${ui.inspectionOrderId}: ${refId} · ${ui.assignedFieldEngineer}: ${localizeAssignedActorName(rawWo.assignedTo || '', language)}`,
    recordedTimestamp: recordedTime,
    generatedAtDisplay: recordedTime,
    dataSource,
    dataSourceBadge: `${ui.dataSource}: ${dataSource}`,
    demoDisclosureBanner: ui.demoInspectionDisclosure,
    footerNote: ui.demoInspectionDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typoProfile.isIndic,
    sections: [
      {
        id: 'primary-identifiers',
        title: ui.sectionPrimaryIdentifiers,
        fields: primaryFields,
      },
      {
        id: 'location-jurisdiction',
        title: ui.sectionConsumerAndPremises,
        fields: locationFields,
      },
      {
        id: 'inspection-findings',
        title: ui.sectionInspectionFindings,
        fields: findingsFields,
      },
    ],
  };
}

// Single-flight lock to prevent duplicate print/PDF actions on rapid clicks
let activePrintLock = false;

export function isDocumentPrintInProgress(): boolean {
  return activePrintLock;
}

export function resetDocumentPrintLockForTesting(): void {
  activePrintLock = false;
}

/**
 * Triggers a clean browser print / Save-as-PDF action while temporarily setting
 * `document.title` to the canonical safe PDF filename (`vidyutflow-...-{ref}.pdf`)
 * so that browser Save-as-PDF dialogs automatically suggest the exact safe filename.
 * Guards against rapid duplicate clicks.
 */
export function triggerDocumentPrintOrSavePdf(
  doc: GeneratedOfficialDocument,
  options?: { skipBrowserPrint?: boolean }
): { triggered: boolean; filename: string; reason?: string } {
  if (!doc.eligible || !doc.authorized) {
    return {
      triggered: false,
      filename: doc.filename,
      reason: doc.ineligibleReason || 'Document is not eligible for printing.',
    };
  }

  if (activePrintLock) {
    return {
      triggered: false,
      filename: doc.filename,
      reason: 'Print action already in progress.',
    };
  }

  activePrintLock = true;

  try {
    if (
      !options?.skipBrowserPrint &&
      typeof window !== 'undefined' &&
      typeof window.print === 'function'
    ) {
      const previousTitle = typeof document !== 'undefined' ? document.title : '';
      if (typeof document !== 'undefined') {
        document.title = doc.filename.replace(/\.pdf$/i, '');
      }
      window.print();
      if (typeof document !== 'undefined') {
        setTimeout(() => {
          document.title = previousTitle;
        }, 300);
      }
    }
    return {
      triggered: true,
      filename: doc.filename,
    };
  } finally {
    if (options?.skipBrowserPrint) {
      activePrintLock = false;
    } else {
      setTimeout(() => {
        activePrintLock = false;
      }, 400);
    }
  }
}

/**
 * Generates a separate Updated Account Statement & Overdue Demand Summary document
 * (`documentType: 'account_statement'`) for current outstanding balances with
 * accrued late-payment charges (DPS) and Formal Notice snapshot comparison.
 *
 * CRITICAL GUARANTEE: This never mutates or replaces the original issued two-page A4
 * electricity bill (`generateElectricityBillDocument`) or historical payment receipts
 * (`generatePaymentReceiptDocument`).
 */
export function generateUpdatedAccountStatementDocument(params: {
  role: UserRole;
  actor: ExportActorIdentity;
  bill: ElectricityBill;
  connection?: ElectricityConnection | null;
  payments?: PaymentTransaction[];
  formalNotice?: FormalNoticeRecord | null;
  waivers?: LateChargeWaiverRecord[];
  reversals?: PaymentReversalRecord[];
  referenceDate?: string;
  language?: Language;
  dataSource?: ExportDataSourceClassification | string;
}): GeneratedOfficialDocument {
  const {
    role,
    actor,
    bill,
    connection,
    payments = [],
    formalNotice,
    waivers = [],
    reversals = [],
    referenceDate = '28-Oct-2026',
    language = 'en',
  } = params;

  const ui = getDocumentUiTranslations(language);
  const fnT = getFormalNoticeTranslations(language);
  const typo = getLanguageTypographyProfile(language);
  const normalizedDataSource = normalizeExportDataSource(params.dataSource);

  // Enforce RBAC ownership & subdivision authorization
  let isAuthorized = true;
  if (role === 'field') {
    isAuthorized = false;
  } else if (role === 'consumer') {
    const normalizedActor: ExportActorIdentity = {
      ...actor,
      id: actor.id || (actor as unknown as { userId?: string }).userId || '',
      role,
    };
    isAuthorized = isRecordOwnedByConsumer(
      {
        consumerNo: bill.consumerNo,
        accountId: connection?.accountId || 'demo_consumer',
      },
      normalizedActor
    );
  } else if (role === 'employee') {
    const subdiv = connection?.subdivision || 'Mehsana City North';
    isAuthorized = isEmployeeAuthorizedForExportSubdivision(actor.subdivision, subdiv);
  }

  const safeRef = bill.billNo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const filename = `vidyutflow-account-statement-${safeRef}-${language}.pdf`;

  if (!isAuthorized) {
    return {
      documentType: 'account_statement',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: `STMT-${bill.billNo}`,
      filename,
      title: fnT.updatedAccountStatementTitle,
      subtitle: UGVCL_COMPANY_NAME_EN,
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: referenceDate,
      generatedAtDisplay: referenceDate,
      dataSource: normalizedDataSource,
      dataSourceBadge: `${ui.dataSource}: ${normalizedDataSource}`,
      demoDisclosureBanner: fnT.demoSafeguardBanner,
      footerNote: fnT.demoSafeguardBanner,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typo.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  const statement = deriveCanonical9FieldBillStatement(bill, payments, {
    referenceDate,
    connection,
    waivers,
    reversals,
    language,
  });

  const reconciledNotice = formalNotice
    ? reconcileFormalNoticeWithStatement(formalNotice, statement, referenceDate)
    : null;

  const formatInr = (val: number) =>
    `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const nineFieldsSection: DocumentSection = {
    id: 'canonical-9-field-breakdown',
    title: fnT.currentLiveBalanceTitle,
    fields: [
      {
        key: 'originalBillAmount',
        label: `1. ${fnT.nineFields.originalBillAmount}`,
        value: formatInr(statement.originalBillAmount),
        isMono: true,
      },
      {
        key: 'paymentsSuccessfullySettled',
        label: `2. ${fnT.nineFields.paymentsSuccessfullySettled}`,
        value: formatInr(statement.paymentsSuccessfullySettled),
        isMono: true,
      },
      {
        key: 'remainingPrincipal',
        label: `3. ${fnT.nineFields.remainingPrincipal}`,
        value: formatInr(statement.remainingPrincipal),
        isMono: true,
        highlight: statement.remainingPrincipal > 0 ? 'amber' : undefined,
      },
      {
        key: 'accruedLatePaymentCharges',
        label: `4. ${fnT.nineFields.accruedLatePaymentCharges}`,
        value: formatInr(statement.accruedLatePaymentCharges),
        isMono: true,
        highlight: statement.accruedLatePaymentCharges > 0 ? 'rose' : undefined,
      },
      {
        key: 'chargesAlreadyPaidOrWaived',
        label: `5. ${fnT.nineFields.chargesAlreadyPaidOrWaived}`,
        value: formatInr(statement.chargesAlreadyPaidOrWaived),
        isMono: true,
      },
      {
        key: 'totalCurrentOutstanding',
        label: `6. ${fnT.nineFields.totalCurrentOutstanding}`,
        value: formatInr(statement.totalCurrentOutstanding),
        isMono: true,
        highlight: statement.totalCurrentOutstanding > 0 ? 'rose' : 'emerald',
      },
      {
        key: 'originalDueDate',
        label: `7. ${fnT.nineFields.originalDueDate}`,
        value: statement.originalDueDate,
        isMono: true,
      },
      {
        key: 'daysOverdue',
        label: `8. ${fnT.nineFields.daysOverdue}`,
        value: `${statement.daysOverdue}`,
        isMono: true,
      },
      {
        key: 'lastCalculationDate',
        label: `9. ${fnT.nineFields.lastCalculationDate}`,
        value: statement.lastCalculationDate,
        isMono: true,
      },
    ],
  };

  const consumerSection: DocumentSection = {
    id: 'account-consumer-identifiers',
    title: ui.sectionConsumerAndPremises,
    fields: [
      { key: 'billNo', label: ui.billReference, value: bill.billNo, isMono: true },
      { key: 'consumerNo', label: ui.consumerNumber, value: bill.consumerNo, isMono: true },
      { key: 'consumerName', label: ui.consumerName, value: statement.consumerName },
      {
        key: 'subdivision',
        label: ui.subdivision,
        value: localizeSubdivision(statement.subdivision, language),
      },
      {
        key: 'tariffCategory',
        label: ui.tariffCategory,
        value: localizeTariffCategory(statement.tariffCategory, language),
      },
      {
        key: 'billingPeriod',
        label: ui.billingPeriod,
        value: localizeBillMonth(statement.billMonth, language),
      },
      {
        key: 'policyVersion',
        label: 'DPS Policy Version',
        value: `${statement.policyId} (${statement.policyVersion} — ${statement.annualRatePercent}% p.a. DEMO)`,
        isMono: true,
      },
    ],
  };

  const sections: DocumentSection[] = [consumerSection, nineFieldsSection];

  if (reconciledNotice) {
    sections.push({
      id: 'formal-notice-status',
      title: fnT.sectionTitle,
      fields: [
        {
          key: 'noticeId',
          label: fnT.noticeIdLabel,
          value: reconciledNotice.noticeId,
          isMono: true,
        },
        {
          key: 'noticeStatus',
          label: ui.currentStatus,
          value: fnT.statuses[reconciledNotice.status],
          highlight: 'amber',
        },
        {
          key: 'issueDate',
          label: fnT.issueDateLabel,
          value: reconciledNotice.issueDate || 'Not Issued',
          isMono: true,
        },
        {
          key: 'paymentDeadlineDate',
          label: fnT.paymentDeadlineLabel,
          value: reconciledNotice.paymentDeadlineDate || 'N/A',
          isMono: true,
          highlight: 'rose',
        },
        {
          key: 'snapshotTotalAtIssuance',
          label: fnT.snapshotAtIssuanceTitle,
          value: formatInr(reconciledNotice.snapshotAtIssuance.totalOutstandingAtIssuance),
          isMono: true,
        },
        {
          key: 'disconnectionReviewStatus',
          label: fnT.disconnectionReviewLabel,
          value: fnT.disconnectionReviewStatuses[reconciledNotice.disconnectionReviewStatus],
        },
      ],
    });
  }

  return {
    documentType: 'account_statement',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: `STMT-${bill.billNo}`,
    filename,
    title: fnT.updatedAccountStatementTitle,
    subtitle: `${UGVCL_COMPANY_NAME_EN} · ${bill.billNo}`,
    statusLabel: statement.isFullySettled
      ? localizeBillStatus('Paid', language)
      : statement.isOverdue
      ? `${localizeBillStatus('Overdue', language)} (${statement.daysOverdue}d)`
      : localizeBillStatus(statement.derivedStatus, language),
    statusTone: statement.isFullySettled
      ? 'emerald'
      : statement.isOverdue
      ? 'rose'
      : 'amber',
    statusBannerNote: statement.policyDisclaimer,
    recordedTimestamp: statement.lastCalculationDate,
    generatedAtDisplay: `${statement.lastCalculationDate}, 10:30 IST`,
    dataSource: normalizedDataSource,
    dataSourceBadge: `${ui.dataSource}: ${normalizedDataSource}`,
    demoDisclosureBanner: fnT.demoSafeguardBanner,
    footerNote: fnT.demoSafeguardBanner,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typo.isIndic,
    sections,
    summaryMetrics: [
      {
        label: fnT.nineFields.originalBillAmount,
        value: formatInr(statement.originalBillAmount),
      },
      {
        label: fnT.nineFields.remainingPrincipal,
        value: formatInr(statement.remainingPrincipal),
      },
      {
        label: fnT.nineFields.accruedLatePaymentCharges,
        value: formatInr(statement.accruedLatePaymentCharges),
      },
      {
        label: fnT.nineFields.totalCurrentOutstanding,
        value: formatInr(statement.totalCurrentOutstanding),
      },
    ],
  };
}

/**
 * Generates an official printable/downloadable Monthly Electricity Consumption Report PDF
 * (`vidyutflow-consumption-report-{consumerNo}-{language}.pdf`) strictly scoped to the selected connection/meter.
 */
export function generateConsumptionReportDocument(params: {
  role: UserRole;
  actor: ExportActorIdentity;
  connection: ElectricityConnection;
  consumptionSeries: Array<{
    month: string;
    units: number;
    amount: number;
    avgTempC?: number;
    isEstimated?: boolean;
    isHistoricalSeed?: boolean;
    billNo?: string;
  }>;
  referenceDate?: string;
  language?: Language;
  dataSource?: ExportDataSourceClassification | string;
}): GeneratedOfficialDocument {
  const {
    role,
    actor,
    connection,
    consumptionSeries = [],
    referenceDate = '05-Nov-2026',
    language = 'en',
  } = params;

  const ui = getDocumentUiTranslations(language);
  const typo = getLanguageTypographyProfile(language);
  const normalizedDataSource = normalizeExportDataSource(params.dataSource);

  let isAuthorized = true;
  if (role === 'field') {
    isAuthorized = false;
  } else if (role === 'consumer') {
    const normalizedActor: ExportActorIdentity = {
      ...actor,
      id: actor.id || (actor as unknown as { userId?: string }).userId || '',
      role,
    };
    isAuthorized = isRecordOwnedByConsumer(
      {
        consumerNo: connection.consumerNo,
        accountId: connection.accountId || 'demo_consumer',
      },
      normalizedActor
    );
  } else if (role === 'employee') {
    isAuthorized = isEmployeeAuthorizedForExportSubdivision(
      actor.subdivision,
      connection.subdivision
    );
  }

  const safeRef = connection.consumerNo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const filename = `vidyutflow-consumption-report-${safeRef}-${language}.pdf`;
  const reportTitle =
    language === 'gu'
      ? 'માસિક વીજ વપરાશ અહેવાલ (Monthly Consumption Report)'
      : language === 'hi'
      ? 'मासिक विद्युत खपत रिपोर्ट (Monthly Consumption Report)'
      : language === 'mr'
      ? 'मासिक वीज वापर अहवाल (Monthly Consumption Report)'
      : 'Monthly Electricity Consumption & Meter Reading Report';

  if (!isAuthorized) {
    return {
      documentType: 'account_statement',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: `CONS-RPT-${connection.consumerNo}`,
      filename,
      title: reportTitle,
      subtitle: UGVCL_COMPANY_NAME_EN,
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: referenceDate,
      generatedAtDisplay: referenceDate,
      dataSource: normalizedDataSource,
      dataSourceBadge: `${ui.dataSource}: ${normalizedDataSource}`,
      demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
      footerNote: ui.demoAcknowledgmentDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typo.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  const totalUnits = consumptionSeries.reduce((s, p) => s + (Number(p.units) || 0), 0);
  const avgUnits =
    consumptionSeries.length > 0
      ? Math.round(totalUnits / consumptionSeries.length)
      : connection.averageMonthlyKwh || 0;
  const peakUnits =
    consumptionSeries.length > 0
      ? Math.max(...consumptionSeries.map((p) => Number(p.units) || 0))
      : avgUnits;
  const avgAmount =
    consumptionSeries.length > 0
      ? Math.round(
          consumptionSeries.reduce((s, p) => s + (Number(p.amount) || 0), 0) /
            consumptionSeries.length
        )
      : 0;

  const meterSection: DocumentSection = {
    id: 'consumption-meter-particulars',
    title: ui.sectionConsumerAndPremises,
    fields: [
      { key: 'consumerNo', label: ui.consumerNumber, value: connection.consumerNo, isMono: true },
      { key: 'meterNo', label: 'Meter Serial No.', value: connection.meterNo, isMono: true },
      { key: 'consumerName', label: ui.consumerName, value: connection.consumerName },
      {
        key: 'subdivision',
        label: ui.subdivision,
        value: localizeSubdivision(connection.subdivision, language),
      },
      {
        key: 'tariffCategory',
        label: ui.tariffCategory,
        value: `${localizeTariffCategory(connection.tariffCategory, language)} (${connection.sanctionedLoadKw} kW · ${connection.phase})`,
      },
      {
        key: 'latestMeterReading',
        label: 'Latest Cumulative Reading',
        value: `${(connection.currentReadingKwh || 0).toLocaleString('en-IN')} kWh (as of ${connection.lastReadingDate})`,
        isMono: true,
        highlight: 'blue',
      },
    ],
  };

  const monthlyFields: DocumentFieldItem[] = consumptionSeries.map((pt, idx) => {
    const provenanceLabel = pt.isEstimated
      ? 'Estimated (Est)'
      : pt.billNo
      ? `Actual Billed (${pt.billNo})`
      : 'Recorded Meter History';
    return {
      key: `month-${idx}-${pt.month}`,
      label: `${idx + 1}. ${pt.month}`,
      value: `${pt.units.toLocaleString('en-IN')} kWh · ₹${pt.amount.toLocaleString('en-IN')}${pt.avgTempC ? ` · ${pt.avgTempC}°C` : ''} · [${provenanceLabel}]`,
      isMono: true,
      highlight: pt.isEstimated ? 'amber' : 'emerald',
    };
  });

  const historySection: DocumentSection = {
    id: 'monthly-consumption-series',
    title: 'Monthly Electricity Consumption Trajectory (kWh & Billed Amount)',
    fields: monthlyFields,
  };

  return {
    documentType: 'account_statement',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: `CONS-RPT-${connection.consumerNo}`,
    filename,
    title: reportTitle,
    subtitle: `${UGVCL_COMPANY_NAME_EN} · Meter ${connection.meterNo} (${connection.consumerNo})`,
    statusLabel: `${consumptionSeries.length} Months Verified`,
    statusTone: 'blue',
    statusBannerNote: `Connection-scoped consumption trajectory for Consumer No. ${connection.consumerNo} (Meter ${connection.meterNo}). Generated on ${referenceDate}.`,
    recordedTimestamp: referenceDate,
    generatedAtDisplay: `${referenceDate}, 10:30 IST`,
    dataSource: normalizedDataSource,
    dataSourceBadge: `${ui.dataSource}: ${normalizedDataSource}`,
    demoDisclosureBanner: ui.demoAcknowledgmentDisclosure,
    footerNote: ui.demoAcknowledgmentDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typo.isIndic,
    sections: [meterSection, historySection],
    summaryMetrics: [
      { label: '6-Month Avg Consumption', value: `${avgUnits.toLocaleString('en-IN')} kWh` },
      { label: 'Peak Monthly Usage', value: `${peakUnits.toLocaleString('en-IN')} kWh` },
      { label: 'Average Monthly Bill', value: `₹${avgAmount.toLocaleString('en-IN')}` },
      {
        label: 'Latest Meter Reading',
        value: `${(connection.currentReadingKwh || 0).toLocaleString('en-IN')} kWh`,
      },
    ],
  };
}

/**
 * Generates an official printable/downloadable Payment & Settlement History Report PDF
 * (`vidyutflow-payment-history-{consumerNo}-{language}.pdf`) strictly scoped to the selected connection/meter.
 */
export function generatePaymentHistoryReportDocument(params: {
  role: UserRole;
  actor: ExportActorIdentity;
  connection: ElectricityConnection;
  payments: PaymentTransaction[];
  referenceDate?: string;
  language?: Language;
  dataSource?: ExportDataSourceClassification | string;
}): GeneratedOfficialDocument {
  const {
    role,
    actor,
    connection,
    payments = [],
    referenceDate = '05-Nov-2026',
    language = 'en',
  } = params;

  const ui = getDocumentUiTranslations(language);
  const typo = getLanguageTypographyProfile(language);
  const normalizedDataSource = normalizeExportDataSource(params.dataSource);

  let isAuthorized = true;
  if (role === 'field') {
    isAuthorized = false;
  } else if (role === 'consumer') {
    const normalizedActor: ExportActorIdentity = {
      ...actor,
      id: actor.id || (actor as unknown as { userId?: string }).userId || '',
      role,
    };
    isAuthorized = isRecordOwnedByConsumer(
      {
        consumerNo: connection.consumerNo,
        accountId: connection.accountId || 'demo_consumer',
      },
      normalizedActor
    );
  } else if (role === 'employee') {
    isAuthorized = isEmployeeAuthorizedForExportSubdivision(
      actor.subdivision,
      connection.subdivision
    );
  }

  const safeRef = connection.consumerNo.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const filename = `vidyutflow-payment-history-${safeRef}-${language}.pdf`;
  const reportTitle =
    language === 'gu'
      ? 'ચુકવણી ઇતિહાસ અહેવાલ (Payment History Report)'
      : language === 'hi'
      ? 'भुगतान इतिहास रिपोर्ट (Payment History Report)'
      : language === 'mr'
      ? 'पेमेंट इतिहास अहवाल (Payment History Report)'
      : 'Official Payment & Settlement History Report';

  if (!isAuthorized) {
    return {
      documentType: 'account_statement',
      displayMode: 'unauthorized',
      eligible: false,
      authorized: false,
      referenceId: `PAY-HIST-${connection.consumerNo}`,
      filename,
      title: reportTitle,
      subtitle: UGVCL_COMPANY_NAME_EN,
      statusLabel: ui.unauthorizedDocumentAccess,
      statusTone: 'rose',
      statusBannerNote: ui.unauthorizedDocumentAccess,
      recordedTimestamp: referenceDate,
      generatedAtDisplay: referenceDate,
      dataSource: normalizedDataSource,
      dataSourceBadge: `${ui.dataSource}: ${normalizedDataSource}`,
      demoDisclosureBanner: ui.demoPaymentReceiptDisclosure,
      footerNote: ui.demoPaymentReceiptDisclosure,
      language,
      fontFamilyCss: FONT_STACKS[language],
      isIndic: typo.isIndic,
      sections: [],
      ineligibleReason: ui.unauthorizedDocumentAccess,
    };
  }

  const successfulPayments = payments.filter((p) => p.status === 'Successful');
  const totalSettledInr = successfulPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const meterSection: DocumentSection = {
    id: 'payment-history-consumer-particulars',
    title: ui.sectionConsumerAndPremises,
    fields: [
      { key: 'consumerNo', label: ui.consumerNumber, value: connection.consumerNo, isMono: true },
      { key: 'meterNo', label: 'Meter Serial No.', value: connection.meterNo, isMono: true },
      { key: 'consumerName', label: ui.consumerName, value: connection.consumerName },
      {
        key: 'subdivision',
        label: ui.subdivision,
        value: localizeSubdivision(connection.subdivision, language),
      },
      {
        key: 'tariffCategory',
        label: ui.tariffCategory,
        value: localizeTariffCategory(connection.tariffCategory, language),
      },
    ],
  };

  const txFields: DocumentFieldItem[] =
    payments.length > 0
      ? payments.map((p, idx) => ({
          key: `tx-${idx}-${p.txId}`,
          label: `${idx + 1}. ${p.txId} (${p.date})`,
          value: `Bill: ${p.billNo} · ₹${(Number(p.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${localizePaymentMethod(p.paymentMethod, language)} · [${localizePaymentStatus(p.status, language)}]`,
          isMono: true,
          highlight:
            p.status === 'Successful'
              ? 'emerald'
              : p.status === 'Failed'
              ? 'rose'
              : 'amber',
        }))
      : [
          {
            key: 'no-transactions',
            label: 'Recorded Transactions',
            value: 'No payment transactions recorded for this connection.',
          },
        ];

  const ledgerSection: DocumentSection = {
    id: 'payment-history-ledger',
    title: 'Connection-Scoped Payment & Settlement Ledger',
    fields: txFields,
  };

  return {
    documentType: 'account_statement',
    displayMode: 'official_document',
    eligible: true,
    authorized: true,
    referenceId: `PAY-HIST-${connection.consumerNo}`,
    filename,
    title: reportTitle,
    subtitle: `${UGVCL_COMPANY_NAME_EN} · Meter ${connection.meterNo} (${connection.consumerNo})`,
    statusLabel: `${successfulPayments.length} Settled / ${payments.length} Total`,
    statusTone: 'emerald',
    statusBannerNote: `Connection-scoped payment ledger for Consumer No. ${connection.consumerNo} (Meter ${connection.meterNo}). Generated on ${referenceDate}.`,
    recordedTimestamp: referenceDate,
    generatedAtDisplay: `${referenceDate}, 10:30 IST`,
    dataSource: normalizedDataSource,
    dataSourceBadge: `${ui.dataSource}: ${normalizedDataSource}`,
    demoDisclosureBanner: ui.demoPaymentReceiptDisclosure,
    footerNote: ui.demoPaymentReceiptDisclosure,
    language,
    fontFamilyCss: FONT_STACKS[language],
    isIndic: typo.isIndic,
    sections: [meterSection, ledgerSection],
    summaryMetrics: [
      { label: 'Total Transactions', value: `${payments.length}` },
      { label: 'Settled Payments', value: `${successfulPayments.length}` },
      {
        label: 'Total Settled Amount',
        value: `₹${totalSettledInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      { label: 'Reference Date', value: referenceDate },
    ],
  };
}

