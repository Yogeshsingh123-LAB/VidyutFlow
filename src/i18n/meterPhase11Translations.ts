import type { LanguageCode } from './types';

export interface MeterPhase11Dictionary {
  // Common Status Labels (7-status lifecycle + reading & adjustment statuses)
  statusDetected: string;
  statusPendingReview: string;
  statusUnderInvestigation: string;
  statusApproved: string;
  statusRejected: string;
  statusRereadRequested: string;
  statusCorrectedThroughAdjustment: string;
  statusClosed: string;
  statusPendingApproval: string;
  statusClear: string;
  statusReview: string;
  statusMatch: string;
  statusDiscrepancy: string;

  // Anomaly & Billing Review Categories
  catNegativeOrRollback: string;
  catZeroOrStalled: string;
  catHighSpike: string;
  catSuddenDrop: string;
  catDuplicateSubmission: string;
  catRapidResubmission: string;
  catIdentityMismatch: string;
  catOcrManualOverride: string;
  catLowOcrConfidence: string;
  catTariffSlabMismatch: string;
  catBillDiscrepancy: string;
  catConsumptionDispute: string;
  catTariffMismatch: string;
  catMeterFaultSuspected: string;
  catPaymentNotReflected: string;
  catDuplicateBill: string;
  catOther: string;

  // Adjustment Types
  adjSlabCorrection: string;
  adjCreditConcession: string;
  adjMeterErrorRebate: string;
  adjSupplementaryCharge: string;

  // Severity Labels
  sevHigh: string;
  sevReview: string;
  sevInfo: string;

  // MeterReadingWorkspace (Phase 11B + 11C)
  wsTitle: string;
  wsSubtitle: string;
  wsDemoBadge: string;
  wsConnectionLabel: string;
  wsMeterLabel: string;
  wsLastVerified: string;
  wsUploadPhoto: string;
  wsCapturePhoto: string;
  wsSwitchCamera: string;
  wsRetakePhoto: string;
  wsRotate90: string;
  wsCropDisplay: string;
  wsApplyCrop: string;
  wsResetCrop: string;
  wsCropHint: string;
  wsRunOcr: string;
  wsRunningOcr: string;
  wsDisplayedReading: string;
  wsReadingDate: string;
  wsMeterCondition: string;
  wsEventOrdinary: string;
  wsEventRollover: string;
  wsEventReplacement: string;
  wsQueueOffline: string;
  wsSubmitReading: string;
  wsSubmitting: string;
  wsSyncQueue: string;
  wsPreview: string;
  wsRecentSubmissions: string;
  wsNoReadings: string;
  wsReviewNotesPlaceholder: string;
  wsApprove: string;
  wsRequestReread: string;
  wsReject: string;
  wsLoadPhoto: string;
  wsOcrReady: string;
  wsOcrConfidence: string;
  wsOcrProposedReading: string;
  wsOcrRawText: string;
  wsOcrAmbiguousTitle: string;
  wsOcrAmbiguousHelp: string;
  wsOcrUseAlt: string;
  wsQualityGlare: string;
  wsQualityBlur: string;
  wsQualityLowContrast: string;
  wsQualityTilt: string;
  wsCameraAlignGuide: string;
  wsCameraClose: string;
  wsSnapPhoto: string;
  wsOfflineQueuedCount: string;
  wsDeltaKwh: string;
  wsConsumptionUnits: string;
  wsIntervalDays: string;

  // ConsumerMeterBillingSection (Phase 11D Consumer Portal)
  cnsSectionBadge: string;
  cnsSectionTitle: string;
  cnsSectionSubtitle: string;
  cnsTabSubmitReading: string;
  cnsTabBillValidation: string;
  cnsTabReviewRequests: string;
  cnsSelectConnection: string;
  cnsSelectBill: string;
  cnsValidateBillBtn: string;
  cnsValidating: string;
  cnsValidationStatus: string;
  cnsBilledAmount: string;
  cnsExpectedCanonical: string;
  cnsVariance: string;
  cnsLineItem: string;
  cnsBilledCol: string;
  cnsCanonicalCol: string;
  cnsDiffCol: string;
  cnsStatusCol: string;
  cnsFindingsTitle: string;
  cnsNoDiscrepancies: string;
  cnsRequestBillingReviewTitle: string;
  cnsReviewCategoryLabel: string;
  cnsReviewDescriptionLabel: string;
  cnsReviewDescriptionPlaceholder: string;
  cnsAttachEvidencePhoto: string;
  cnsSubmitReviewBtn: string;
  cnsSubmittingReview: string;
  cnsReviewSubmittedSuccess: string;
  cnsMyBillingReviewsTitle: string;
  cnsNoBillingReviews: string;
  cnsPublicResolutionNote: string;
  cnsStatusTimeline: string;
  cnsMeterNotificationsTitle: string;
  cnsNoMeterNotifications: string;

  // EmployeeMeterReviewWorkspace & EmployeePortal Tab (Phase 11D Employee Portal)
  empTabTitle: string;
  empHeaderBadge: string;
  empHeaderTitle: string;
  empHeaderSubtitle: string;
  empSubtabReadings: string;
  empSubtabAnomalies: string;
  empSubtabBillingReviews: string;
  empSubtabAdjustments: string;
  empFilterStatus: string;
  empFilterAllStatuses: string;
  empSearchPlaceholder: string;
  empRefreshBtn: string;
  empReadingId: string;
  empConsumerNo: string;
  empMeterNo: string;
  empSubmittedReading: string;
  empPreviousReading: string;
  empConsumedUnits: string;
  empSubmittedBy: string;
  empOcrSummary: string;
  empAuditNoteLabel: string;
  empAuditNotePlaceholder: string;
  empPublicNoteLabel: string;
  empPublicNotePlaceholder: string;
  empStartInvestigation: string;
  empApproveCase: string;
  empRejectCase: string;
  empCloseCase: string;
  empMarkAdjusted: string;
  empProposeAdjustmentTitle: string;
  empAdjustmentTypeLabel: string;
  empRevisedUnitsLabel: string;
  empProposedAmountLabel: string;
  empAdjustmentReasonLabel: string;
  empAdjustmentReasonPlaceholder: string;
  empSubmitProposalBtn: string;
  empSeparationOfDutiesNotice: string;
  empStatusHistoryTitle: string;
  empNoRecordsFound: string;

  // FieldMeterReadingModal & FieldPortal (Phase 11D Field Portal)
  fldLaunchButton: string;
  fldModalBadge: string;
  fldModalTitle: string;
  fldModalSubtitle: string;
  fldAssignedOrderBadge: string;
  fldServiceOrderRef: string;
  fldRereadAlertTitle: string;
  fldRereadAlertDesc: string;
  fldCloseModal: string;

  // ManagementMeterIntegritySection (Phase 11D Management Portal)
  mgtSectionBadge: string;
  mgtSectionTitle: string;
  mgtSectionSubtitle: string;
  mgtTotalReadings: string;
  mgtPendingReview: string;
  mgtApprovedReadings: string;
  mgtRereadRequested: string;
  mgtOpenAnomalies: string;
  mgtAvgTurnaroundHours: string;
  mgtAnomalyLifecycleTitle: string;
  mgtCategoryDistributionTitle: string;
  mgtBillingReviewsSummaryTitle: string;
  mgtFinancialAdjustmentsTitle: string;
  mgtTotalAdjustedAmount: string;
  mgtThresholdVersionLabel: string;
  mgtReadOnlyNotice: string;

  // AdminMeterOcrHealthSection (Phase 11D Admin Portal)
  admSectionBadge: string;
  admSectionTitle: string;
  admSectionSubtitle: string;
  admOcrEngineTitle: string;
  admOcrWorkerMode: string;
  admWasmCoreStatus: string;
  admMetadataStripping: string;
  admMaxUploadLimit: string;
  admThresholdConfigTitle: string;
  admSpikeMultiplier: string;
  admSpikeMinUnits: string;
  admDropRatio: string;
  admDropMinPreviousUnits: string;
  admZeroConsumptionMinPrev: string;
  admLowOcrConfidencePercent: string;
  admRapidResubmissionMinutes: string;
  admMaxFutureDriftMinutes: string;
  admThresholdReasonLabel: string;
  admThresholdReasonPlaceholder: string;
  admSaveThresholdsBtn: string;
  admSavingThresholds: string;
  admThresholdHistoryTitle: string;
  admFinancialApprovalsTitle: string;
  admApproveAdjustmentBtn: string;
  admRejectAdjustmentBtn: string;
  admApprovalNotePlaceholder: string;
  admSeparationBlockedBadge: string;
}

export const METER_PHASE11_TRANSLATIONS: Record<LanguageCode, MeterPhase11Dictionary> = {
  en: {
    statusDetected: 'Detected',
    statusPendingReview: 'Pending Review',
    statusUnderInvestigation: 'Under Investigation',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    statusRereadRequested: 'Re-Read Requested',
    statusCorrectedThroughAdjustment: 'Corrected Through Adjustment',
    statusClosed: 'Closed',
    statusPendingApproval: 'Pending Approval',
    statusClear: 'Verified Clear',
    statusReview: 'Review Recommended',
    statusMatch: 'Match',
    statusDiscrepancy: 'Discrepancy',

    catNegativeOrRollback: 'Negative Delta / Meter Rollback',
    catZeroOrStalled: 'Zero Consumption / Stalled Meter',
    catHighSpike: 'Abnormally High Consumption Spike',
    catSuddenDrop: 'Sudden Consumption Drop',
    catDuplicateSubmission: 'Duplicate Reading Submission',
    catRapidResubmission: 'Rapid Re-submission',
    catIdentityMismatch: 'Consumer / Meter Identity Mismatch',
    catOcrManualOverride: 'Manual Override of OCR Reading',
    catLowOcrConfidence: 'Low OCR Confidence Score',
    catTariffSlabMismatch: 'Tariff Slab Calculation Mismatch',
    catBillDiscrepancy: 'Billing Statement Discrepancy',
    catConsumptionDispute: 'Consumption Units Dispute',
    catTariffMismatch: 'Tariff Category / Slab Mismatch',
    catMeterFaultSuspected: 'Suspected Meter Hardware Fault',
    catPaymentNotReflected: 'Previous Payment Not Reflected',
    catDuplicateBill: 'Duplicate Bill Issued',
    catOther: 'Other Billing Inquiry',

    adjSlabCorrection: 'Phase 9 Tariff Slab Correction',
    adjCreditConcession: 'Authorized Credit Concession',
    adjMeterErrorRebate: 'Meter Calibration Error Rebate',
    adjSupplementaryCharge: 'Supplementary Energy Charge',

    sevHigh: 'High Priority',
    sevReview: 'Review Required',
    sevInfo: 'Informational',

    wsTitle: 'AI Meter Reading & Consumption Check',
    wsSubtitle: 'Capture a meter photo, run local OCR, verify kWh difference and flag unusual bi-monthly jumps before billing review.',
    wsDemoBadge: 'Demo verification workflow',
    wsConnectionLabel: 'Connection',
    wsMeterLabel: 'Meter number',
    wsLastVerified: 'Last verified reading',
    wsUploadPhoto: 'Upload meter photo',
    wsCapturePhoto: 'Capture photo',
    wsSwitchCamera: 'Switch camera',
    wsRetakePhoto: 'Retake photo',
    wsRotate90: 'Rotate 90°',
    wsCropDisplay: 'Crop display',
    wsApplyCrop: 'Apply crop',
    wsResetCrop: 'Reset crop',
    wsCropHint: 'Drag across the meter display window to frame only the kWh digits.',
    wsRunOcr: 'Extract reading with OCR',
    wsRunningOcr: 'Reading digits...',
    wsDisplayedReading: 'Displayed meter reading (kWh)',
    wsReadingDate: 'Reading date and time',
    wsMeterCondition: 'Meter reading condition',
    wsEventOrdinary: 'Normal reading',
    wsEventRollover: 'Dial rollover verified',
    wsEventReplacement: 'Meter replaced verified',
    wsQueueOffline: 'Queue offline',
    wsSubmitReading: 'Submit for verification',
    wsSubmitting: 'Submitting...',
    wsSyncQueue: 'Sync offline queue',
    wsPreview: 'Consumption & anomaly check',
    wsRecentSubmissions: 'Recent meter reading submissions',
    wsNoReadings: 'No meter readings submitted in this session yet.',
    wsReviewNotesPlaceholder: 'Add verification note (required when approving flagged readings or rejecting)',
    wsApprove: 'Approve reading',
    wsRequestReread: 'Request re-read',
    wsReject: 'Reject reading',
    wsLoadPhoto: 'View submitted photo',
    wsOcrReady: 'OCR extraction complete',
    wsOcrConfidence: 'Confidence',
    wsOcrProposedReading: 'Proposed numeric reading',
    wsOcrRawText: 'Original OCR text',
    wsOcrAmbiguousTitle: 'Uncertain digit positions detected',
    wsOcrAmbiguousHelp: 'Please inspect the highlighted characters against the meter photo before submitting.',
    wsOcrUseAlt: 'Use',
    wsQualityGlare: 'Glare detected on meter glass — angle the camera slightly.',
    wsQualityBlur: 'Image appears blurry — hold steady and refocus on the digits.',
    wsQualityLowContrast: 'Low contrast — enable torch or improve lighting on the meter register.',
    wsQualityTilt: 'Frame is narrow or tilted — center the horizontal digit window.',
    wsCameraAlignGuide: 'Align the kWh digit register inside the highlighted frame',
    wsCameraClose: 'Close camera',
    wsSnapPhoto: 'Take photo',
    wsOfflineQueuedCount: 'Offline queued readings',
    wsDeltaKwh: 'Delta kWh',
    wsConsumptionUnits: 'Billed units',
    wsIntervalDays: 'Cycle days',

    cnsSectionBadge: 'Phase 11 Smart Metering & Bill Verification',
    cnsSectionTitle: 'AI Meter Reading, Bill Validation & Dispute Resolution',
    cnsSectionSubtitle: 'Submit verified self-readings with optical character recognition, audit your bi-monthly bill against canonical UGVCL FY 2025-26 tariffs, and track billing review requests.',
    cnsTabSubmitReading: 'Smart Meter Self-Reading',
    cnsTabBillValidation: 'Bi-Monthly Bill Validator',
    cnsTabReviewRequests: 'Billing Review & Dispute Tracker',
    cnsSelectConnection: 'Select Service Connection',
    cnsSelectBill: 'Select Bi-Monthly Bill to Audit',
    cnsValidateBillBtn: 'Run Canonical Tariff Validation',
    cnsValidating: 'Validating Bill...',
    cnsValidationStatus: 'Tariff Audit Result',
    cnsBilledAmount: 'Billed Net Payable',
    cnsExpectedCanonical: 'Canonical Expected Amount',
    cnsVariance: 'Net Variance',
    cnsLineItem: 'Tariff Component',
    cnsBilledCol: 'Billed on Statement',
    cnsCanonicalCol: 'Canonical Phase 9 Calc',
    cnsDiffCol: 'Difference',
    cnsStatusCol: 'Audit Status',
    cnsFindingsTitle: 'Validation Findings & Checks',
    cnsNoDiscrepancies: 'All energy slabs, fixed charges, FPPPA, and electricity duty match the official UGVCL tariff schedule.',
    cnsRequestBillingReviewTitle: 'Request Official Subdivision Billing Review',
    cnsReviewCategoryLabel: 'Dispute / Inquiry Category',
    cnsReviewDescriptionLabel: 'Detailed Explanation of Discrepancy',
    cnsReviewDescriptionPlaceholder: 'Describe the meter reading, tariff slab, or payment issue you want the subdivision officer to verify...',
    cnsAttachEvidencePhoto: 'Attach Supporting Meter / Receipt Photo (Optional, max 5 MiB)',
    cnsSubmitReviewBtn: 'Submit Billing Review Request',
    cnsSubmittingReview: 'Submitting Request...',
    cnsReviewSubmittedSuccess: 'Billing review request registered and routed to Subdivision Operations.',
    cnsMyBillingReviewsTitle: 'My Billing Review Requests & Lifecycle Progress',
    cnsNoBillingReviews: 'No billing review requests filed for your connections.',
    cnsPublicResolutionNote: 'Subdivision Resolution Note',
    cnsStatusTimeline: 'Verification Lifecycle Timeline',
    cnsMeterNotificationsTitle: 'Metering & Billing Verification Alerts',
    cnsNoMeterNotifications: 'No recent meter or billing review alerts.',

    empTabTitle: 'Meter & Anomaly Review',
    empHeaderBadge: 'Subdivision Metering & Revenue Protection',
    empHeaderTitle: 'Meter Reading Verification, Anomaly Lifecycle & Financial Adjustments',
    empHeaderSubtitle: 'Inspect OCR meter photos, manage the 7-status anomaly lifecycle, resolve consumer billing review requests, and propose append-only Phase 9 tariff adjustments.',
    empSubtabReadings: 'Meter Readings Queue',
    empSubtabAnomalies: '7-Status Anomaly Cases',
    empSubtabBillingReviews: 'Consumer Billing Reviews',
    empSubtabAdjustments: 'Financial Adjustment Proposals',
    empFilterStatus: 'Filter by Status',
    empFilterAllStatuses: 'All Lifecycle Statuses',
    empSearchPlaceholder: 'Search consumer no, meter no, bill no, or case ID...',
    empRefreshBtn: 'Refresh Queue',
    empReadingId: 'Reading ID',
    empConsumerNo: 'Consumer No.',
    empMeterNo: 'Meter No.',
    empSubmittedReading: 'Submitted Reading',
    empPreviousReading: 'Previous Verified',
    empConsumedUnits: 'Consumed Units',
    empSubmittedBy: 'Submitted By',
    empOcrSummary: 'OCR Telemetry',
    empAuditNoteLabel: 'Mandatory Internal Staff Audit Note',
    empAuditNotePlaceholder: 'Enter structured investigation findings or verification rationale...',
    empPublicNoteLabel: 'Consumer-Visible Resolution Note (Safe Summary)',
    empPublicNotePlaceholder: 'Enter clear summary visible to the consumer on their billing portal...',
    empStartInvestigation: 'Open Investigation',
    empApproveCase: 'Approve & Verify',
    empRejectCase: 'Reject Case',
    empCloseCase: 'Close Resolved Case',
    empMarkAdjusted: 'Mark Corrected via Adjustment',
    empProposeAdjustmentTitle: 'Propose Append-Only Financial Adjustment',
    empAdjustmentTypeLabel: 'Adjustment Classification',
    empRevisedUnitsLabel: 'Revised Billed Units (Optional — triggers Phase 9 Slab Recalculation)',
    empProposedAmountLabel: 'Proposed Adjustment Amount (₹)',
    empAdjustmentReasonLabel: 'Engineering & Audit Justification',
    empAdjustmentReasonPlaceholder: 'Cite meter test report, OCR photo evidence, or tariff order clause...',
    empSubmitProposalBtn: 'Submit Adjustment for Admin Approval',
    empSeparationOfDutiesNotice: 'Separation of Duties Enforced: Proposals require independent Administrative approval. Original bills remain immutable.',
    empStatusHistoryTitle: 'Immutable Audit Trail & Status History',
    empNoRecordsFound: 'No matching records in this queue.',

    fldLaunchButton: 'Meter Reading',
    fldModalBadge: 'Field Optical Meter Verification',
    fldModalTitle: 'Field Engineer Meter Capture & Re-Read Verification',
    fldModalSubtitle: 'Capture tamper-evident meter photos, crop the kWh register, verify ambiguous OCR digits, or queue readings offline for synchronization.',
    fldAssignedOrderBadge: 'Assigned Field Connection',
    fldServiceOrderRef: 'Work Order Reference',
    fldRereadAlertTitle: 'Subdivision Re-Read Requested on Assigned Connections',
    fldRereadAlertDesc: 'Prioritize physical optical capture for connections flagged for re-verification.',
    fldCloseModal: 'Close Workspace',

    mgtSectionBadge: 'Executive Revenue Protection & Metering Analytics',
    mgtSectionTitle: 'AI Meter Reading Integrity, Anomaly Distribution & Turnaround KPIs',
    mgtSectionSubtitle: 'Read-only executive oversight of subdivision meter verification throughput, anomaly severity breakdown, consumer billing disputes, and approved financial adjustments.',
    mgtTotalReadings: 'Total Readings Logged',
    mgtPendingReview: 'Pending Officer Review',
    mgtApprovedReadings: 'Verified & Approved',
    mgtRereadRequested: 'Field Re-Reads Ordered',
    mgtOpenAnomalies: 'Active Open Anomalies',
    mgtAvgTurnaroundHours: 'Avg. Review Turnaround',
    mgtAnomalyLifecycleTitle: '7-Status Anomaly Case Pipeline',
    mgtCategoryDistributionTitle: 'Anomaly Category Breakdown',
    mgtBillingReviewsSummaryTitle: 'Consumer Billing Review Pipeline',
    mgtFinancialAdjustmentsTitle: 'Financial Adjustment Ledger Summary',
    mgtTotalAdjustedAmount: 'Total Approved Adjustment Value',
    mgtThresholdVersionLabel: 'Active Validation Policy Version',
    mgtReadOnlyNotice: 'Read-Only Executive View: Operational approvals and threshold mutations are restricted to authorized Subdivision and System Admin roles.',

    admSectionBadge: 'System Governance • OCR Runtime & Financial Controls',
    admSectionTitle: 'Local OCR Health, Validation Threshold Policy & Adjustment Approvals',
    admSectionSubtitle: 'Monitor local Tesseract WASM worker telemetry, configure versioned consumption anomaly thresholds with mandatory audit reasons, and execute independent separation-of-duties approval on financial adjustments.',
    admOcrEngineTitle: 'Local Tesseract.js v7 WASM OCR Runtime Status',
    admOcrWorkerMode: 'Local Web Worker + WASM Core (Zero External Cloud Dependency)',
    admWasmCoreStatus: 'Active • Offline-Capable Numeric Whitelist',
    admMetadataStripping: 'Canvas EXIF/GPS Metadata Sanitization Enforced',
    admMaxUploadLimit: '5 MiB Strict Magic-Byte Signature Guard',
    admThresholdConfigTitle: 'Versioned Consumption Anomaly Threshold Policy',
    admSpikeMultiplier: 'High Spike Multiplier (× Historical Avg)',
    admSpikeMinUnits: 'High Spike Minimum Units (kWh)',
    admDropRatio: 'Sudden Drop Ratio (Fraction of Avg)',
    admDropMinPreviousUnits: 'Sudden Drop Min Previous Units (kWh)',
    admZeroConsumptionMinPrev: 'Zero Consumption Min Previous Units (kWh)',
    admLowOcrConfidencePercent: 'Low OCR Confidence Alert Threshold (%)',
    admRapidResubmissionMinutes: 'Rapid Resubmission Window (Minutes)',
    admMaxFutureDriftMinutes: 'Max Clock Drift Tolerance (Minutes)',
    admThresholdReasonLabel: 'Mandatory Policy Change Audit Reason',
    admThresholdReasonPlaceholder: 'Explain why consumption validation thresholds are being updated...',
    admSaveThresholdsBtn: 'Save & Increment Policy Version',
    admSavingThresholds: 'Updating Policy...',
    admThresholdHistoryTitle: 'Threshold Policy Version Audit Log',
    admFinancialApprovalsTitle: 'Independent Administrative Approval Queue (Financial Adjustments)',
    admApproveAdjustmentBtn: 'Approve Adjustment',
    admRejectAdjustmentBtn: 'Reject Proposal',
    admApprovalNotePlaceholder: 'Enter mandatory administrative approval or rejection audit note...',
    admSeparationBlockedBadge: 'Self-Approval Blocked (Separation of Duties)'
  },

  gu: {
    statusDetected: 'શોધાયેલ',
    statusPendingReview: 'સમીક્ષા બાકી',
    statusUnderInvestigation: 'તપાસ હેઠળ',
    statusApproved: 'મંજૂર',
    statusRejected: 'નામંજૂર',
    statusRereadRequested: 'ફરીથી રીડિંગની વિનંતી',
    statusCorrectedThroughAdjustment: 'હવાલા દ્વારા સુધારેલ',
    statusClosed: 'બંધ કરેલ',
    statusPendingApproval: 'મંજૂરી બાકી',
    statusClear: 'ચકાસાયેલ સ્પષ્ટ',
    statusReview: 'સમીક્ષા ભલામણ કરેલ',
    statusMatch: 'મેળ ખાય છે',
    statusDiscrepancy: 'તફાવત',

    catNegativeOrRollback: 'નેગેટિવ તફાવત / મીટર રોલબેક',
    catZeroOrStalled: 'શૂન્ય વપરાશ / અટકેલું મીટર',
    catHighSpike: 'અસામાન્ય ઊંચો વપરાશ ઉછાળો',
    catSuddenDrop: 'વપરાશમાં અચાનક ઘટાડો',
    catDuplicateSubmission: 'ડુપ્લિકેટ રીડિંગ સબમિશન',
    catRapidResubmission: 'ઝડપી પુનઃસબમિશન',
    catIdentityMismatch: 'ગ્રાહક / મીટર ઓળખ વિસંગતતા',
    catOcrManualOverride: 'OCR રીડિંગમાં મેન્યુઅલ ફેરફાર',
    catLowOcrConfidence: 'ઓછો OCR વિશ્વાસ સ્કોર',
    catTariffSlabMismatch: 'ટેરિફ સ્લેબ ગણતરી વિસંગતતા',
    catBillDiscrepancy: 'બિલિંગ પત્રકમાં તફાવત',
    catConsumptionDispute: 'વપરાશ યુનિટ અંગે વિવાદ',
    catTariffMismatch: 'ટેરિફ કેટેગરી / સ્લેબ વિસંગતતા',
    catMeterFaultSuspected: 'મીટર ખામીની શંકા',
    catPaymentNotReflected: 'અગાઉની ચુકવણી જમા નથી થઈ',
    catDuplicateBill: 'ડુપ્લિકેટ બિલ જારી થયેલ',
    catOther: 'અન્ય બિલિંગ પૂછપરછ',

    adjSlabCorrection: 'ફેઝ 9 ટેરિફ સ્લેબ સુધારો',
    adjCreditConcession: 'અધિકૃત ક્રેડિટ રાહત',
    adjMeterErrorRebate: 'મીટર કેલિબ્રેશન ભૂલ રિબેટ',
    adjSupplementaryCharge: 'પૂરક વીજ ચાર્જ',

    sevHigh: 'ઉચ્ચ પ્રાથમિકતા',
    sevReview: 'સમીક્ષા જરૂરી',
    sevInfo: 'માહિતીપ્રદ',

    wsTitle: 'AI મીટર રીડિંગ અને વપરાશ ચકાસણી',
    wsSubtitle: 'મીટરનો ફોટો લો, સ્થાનિક OCR ચલાવો, kWh તફાવત ચકાસો અને બિલિંગ સમીક્ષા પહેલાં અસામાન્ય દ્વિ-માસિક વધારાને ચિહ્નિત કરો.',
    wsDemoBadge: 'ડેમો ચકાસણી વર્કફ્લો',
    wsConnectionLabel: 'જોડાણ',
    wsMeterLabel: 'મીટર નંબર',
    wsLastVerified: 'છેલ્લું ચકાસાયેલ રીડિંગ',
    wsUploadPhoto: 'મીટર ફોટો અપલોડ કરો',
    wsCapturePhoto: 'ફોટો લો',
    wsSwitchCamera: 'કેમેરા બદલો',
    wsRetakePhoto: 'ફરીથી ફોટો લો',
    wsRotate90: '90° ફેરવો',
    wsCropDisplay: 'ડિસ્પ્લે ક્રોપ કરો',
    wsApplyCrop: 'ક્રોપ લાગુ કરો',
    wsResetCrop: 'ક્રોપ રીસેટ કરો',
    wsCropHint: 'ફક્ત kWh અંકો પસંદ કરવા માટે મીટર ડિસ્પ્લે વિન્ડો પર ખેંચો.',
    wsRunOcr: 'OCR વડે રીડિંગ વાંચો',
    wsRunningOcr: 'અંકો વાંચી રહ્યું છે...',
    wsDisplayedReading: 'દેખાતું મીટર રીડિંગ (kWh)',
    wsReadingDate: 'રીડિંગ તારીખ અને સમય',
    wsMeterCondition: 'મીટર રીડિંગ સ્થિતિ',
    wsEventOrdinary: 'સામાન્ય રીડિંગ',
    wsEventRollover: 'ડાયલ રોલઓવર ચકાસાયેલ',
    wsEventReplacement: 'મીટર બદલી ચકાસાયેલ',
    wsQueueOffline: 'ઓફલાઇન કતારમાં મૂકો',
    wsSubmitReading: 'ચકાસણી માટે સબમિટ કરો',
    wsSubmitting: 'સબમિટ થઈ રહ્યું છે...',
    wsSyncQueue: 'ઓફલાઇન કતાર સિંક કરો',
    wsPreview: 'વપરાશ અને વિસંગતતા ચકાસણી',
    wsRecentSubmissions: 'તાજેતરના મીટર રીડિંગ સબમિશન',
    wsNoReadings: 'આ સત્રમાં હજુ સુધી કોઈ મીટર રીડિંગ સબમિટ થયું નથી.',
    wsReviewNotesPlaceholder: 'ચકાસણી નોંધ ઉમેરો (ફ્લેગ કરેલ રીડિંગ મંજૂર અથવા નામંજૂર કરતી વખતે ફરજિયાત)',
    wsApprove: 'રીડિંગ મંજૂર કરો',
    wsRequestReread: 'ફરીથી રીડિંગ મંગાવો',
    wsReject: 'રીડિંગ નામંજૂર કરો',
    wsLoadPhoto: 'સબમિટ કરેલ ફોટો જુઓ',
    wsOcrReady: 'OCR વાંચન પૂર્ણ',
    wsOcrConfidence: 'વિશ્વાસ સ્તર',
    wsOcrProposedReading: 'સૂચિત સંખ્યાત્મક રીડિંગ',
    wsOcrRawText: 'મૂળ OCR લખાણ',
    wsOcrAmbiguousTitle: 'અસ્પષ્ટ અંક સ્થાનો મળ્યા છે',
    wsOcrAmbiguousHelp: 'સબમિટ કરતા પહેલા હાઇલાઇટ કરેલા અક્ષરોને મીટર ફોટો સાથે ચકાસો.',
    wsOcrUseAlt: 'વાપરો',
    wsQualityGlare: 'મીટરના કાચ પર ચમક જણાય છે — કેમેરા થોડો ત્રાંસો રાખો.',
    wsQualityBlur: 'ફોટો ઝાંખો લાગે છે — હાથ સ્થિર રાખો અને અંકો પર ફોકસ કરો.',
    wsQualityLowContrast: 'ઓછો કોન્ટ્રાસ્ટ — ફ્લેશ ચાલુ કરો અથવા મીટર પર પ્રકાશ વધારો.',
    wsQualityTilt: 'ફ્રેમ સાંકડી અથવા ત્રાંસી છે — આડી અંક વિન્ડોને મધ્યમાં રાખો.',
    wsCameraAlignGuide: 'હાઇલાઇટ કરેલ ફ્રેમની અંદર kWh અંક રજિસ્ટર ગોઠવો',
    wsCameraClose: 'કેમેરા બંધ કરો',
    wsSnapPhoto: 'ફોટો ખેંચો',
    wsOfflineQueuedCount: 'ઓફલાઇન કતારમાં રહેલા રીડિંગ્સ',
    wsDeltaKwh: 'તફાવત kWh',
    wsConsumptionUnits: 'બિલ યુનિટ્સ',
    wsIntervalDays: 'સાયકલ દિવસો',

    cnsSectionBadge: 'ફેઝ 11 સ્માર્ટ મીટરિંગ અને બિલ ચકાસણી',
    cnsSectionTitle: 'AI મીટર રીડિંગ, બિલ ચકાસણી અને ફરિયાદ નિવારણ',
    cnsSectionSubtitle: 'OCR વડે પ્રમાણિત સેલ્ફ-રીડિંગ સબમિટ કરો, અધિકૃત UGVCL FY 2025-26 ટેરિફ મુજબ તમારા દ્વિ-માસિક બિલની ચકાસણી કરો અને બિલ સમીક્ષા વિનંતીઓ ટ્રેક કરો.',
    cnsTabSubmitReading: 'સ્માર્ટ મીટર સેલ્ફ-રીડિંગ',
    cnsTabBillValidation: 'દ્વિ-માસિક બિલ ચકાસણીકાર',
    cnsTabReviewRequests: 'બિલ સમીક્ષા અને વિવાદ ટ્રેકર',
    cnsSelectConnection: 'વીજ જોડાણ પસંદ કરો',
    cnsSelectBill: 'ઓડિટ કરવા માટે દ્વિ-માસિક બિલ પસંદ કરો',
    cnsValidateBillBtn: 'સત્તાવાર ટેરિફ ચકાસણી ચલાવો',
    cnsValidating: 'બિલ ચકાસાઈ રહ્યું છે...',
    cnsValidationStatus: 'ટેરિફ ઓડિટ પરિણામ',
    cnsBilledAmount: 'બિલ મુજબ ચૂકવવાપાત્ર રકમ',
    cnsExpectedCanonical: 'અધિકૃત અપેક્ષિત રકમ',
    cnsVariance: 'ચોખ્ખો તફાવત',
    cnsLineItem: 'ટેરિફ ઘટક',
    cnsBilledCol: 'બિલ પત્રક મુજબ',
    cnsCanonicalCol: 'ફેઝ 9 સત્તાવાર ગણતરી',
    cnsDiffCol: 'તફાવત',
    cnsStatusCol: 'ઓડિટ સ્થિતિ',
    cnsFindingsTitle: 'ચકાસણી તારણો અને નિરીક્ષણો',
    cnsNoDiscrepancies: 'તમામ એનર્જી સ્લેબ, ફિક્સ્ડ ચાર્જ, FPPPA અને વીજ શુલ્ક સત્તાવાર UGVCL ટેરિફ શેડ્યૂલ સાથે સંપૂર્ણ મેળ ખાય છે.',
    cnsRequestBillingReviewTitle: 'સત્તાવાર સબડિવિઝન બિલ સમીક્ષાની વિનંતી કરો',
    cnsReviewCategoryLabel: 'વિવાદ / પૂછપરછ પ્રકાર',
    cnsReviewDescriptionLabel: 'તફાવતની વિગતવાર સમજૂતી',
    cnsReviewDescriptionPlaceholder: 'સબડિવિઝન અધિકારી પાસે ચકાસવા માંગતા મીટર રીડિંગ, ટેરિફ સ્લેબ અથવા ચુકવણીના મુદ્દાનું વર્ણન કરો...',
    cnsAttachEvidencePhoto: 'પુરાવા તરીકે મીટર / રસીદનો ફોટો જોડો (વૈકલ્પિક, મહત્તમ 5 MiB)',
    cnsSubmitReviewBtn: 'બિલ સમીક્ષા વિનંતી સબમિટ કરો',
    cnsSubmittingReview: 'વિનંતી સબમિટ થઈ રહી છે...',
    cnsReviewSubmittedSuccess: 'બિલ સમીક્ષા વિનંતી નોંધાઈ ગઈ છે અને સબડિવિઝન ઓપરેશન્સને મોકલવામાં આવી છે.',
    cnsMyBillingReviewsTitle: 'મારી બિલ સમીક્ષા વિનંતીઓ અને પ્રગતિ સ્થિતિ',
    cnsNoBillingReviews: 'તમારા જોડાણો માટે કોઈ બિલ સમીક્ષા વિનંતી નોંધાયેલ નથી.',
    cnsPublicResolutionNote: 'સબડિવિઝન નિવારણ નોંધ',
    cnsStatusTimeline: 'ચકાસણી જીવનચક્ર ટાઇમલાઇન',
    cnsMeterNotificationsTitle: 'મીટરિંગ અને બિલ ચકાસણી સૂચનાઓ',
    cnsNoMeterNotifications: 'તાજેતરમાં કોઈ મીટર કે બિલ સમીક્ષા સૂચના નથી.',

    empTabTitle: 'મીટર અને વિસંગતતા સમીક્ષા',
    empHeaderBadge: 'સબડિવિઝન મીટરિંગ અને મહેસૂલ સુરક્ષા',
    empHeaderTitle: 'મીટર રીડિંગ ચકાસણી, વિસંગતતા જીવનચક્ર અને નાણાકીય સુધારા',
    empHeaderSubtitle: 'OCR મીટર ફોટા તપાસો, 7-સ્થિતિ વિસંગતતા જીવનચક્રનું સંચાલન કરો, ગ્રાહક બિલ સમીક્ષા વિનંતીઓ ઉકેલો અને ફેઝ 9 ટેરિફ મુજબ નાણાકીય સુધારા સૂચવો.',
    empSubtabReadings: 'મીટર રીડિંગ કતાર',
    empSubtabAnomalies: '7-સ્થિતિ વિસંગતતા કેસો',
    empSubtabBillingReviews: 'ગ્રાહક બિલ સમીક્ષાઓ',
    empSubtabAdjustments: 'નાણાકીય સુધારા દરખાસ્તો',
    empFilterStatus: 'સ્થિતિ મુજબ ફિલ્ટર કરો',
    empFilterAllStatuses: 'તમામ જીવનચક્ર સ્થિતિઓ',
    empSearchPlaceholder: 'ગ્રાહક નં., મીટર નં., બિલ નં. અથવા કેસ ID શોધો...',
    empRefreshBtn: 'કતાર રિફ્રેશ કરો',
    empReadingId: 'રીડિંગ ID',
    empConsumerNo: 'ગ્રાહક નં.',
    empMeterNo: 'મીટર નં.',
    empSubmittedReading: 'સબમિટ કરેલ રીડિંગ',
    empPreviousReading: 'અગાઉનું પ્રમાણિત',
    empConsumedUnits: 'વપરાયેલ યુનિટ્સ',
    empSubmittedBy: 'સબમિટ કરનાર',
    empOcrSummary: 'OCR ટેલિમેટ્રી',
    empAuditNoteLabel: 'ફરજિયાત આંતરિક સ્ટાફ ઓડિટ નોંધ',
    empAuditNotePlaceholder: 'તપાસના તારણો અથવા ચકાસણીનું કારણ દાખલ કરો...',
    empPublicNoteLabel: 'ગ્રાહકને દેખાતી નિવારણ નોંધ (સુરક્ષિત સારાંશ)',
    empPublicNotePlaceholder: 'ગ્રાહકને તેમના બિલિંગ પોર્ટલ પર દેખાય તેવો સ્પષ્ટ સારાંશ લખો...',
    empStartInvestigation: 'તપાસ શરૂ કરો',
    empApproveCase: 'મંજૂર અને પ્રમાણિત કરો',
    empRejectCase: 'કેસ નામંજૂર કરો',
    empCloseCase: 'ઉકેલાયેલ કેસ બંધ કરો',
    empMarkAdjusted: 'હવાલા દ્વારા સુધારેલ ચિહ્નિત કરો',
    empProposeAdjustmentTitle: 'એપેન્ડ-ઓન્લી નાણાકીય સુધારા દરખાસ્ત મૂકો',
    empAdjustmentTypeLabel: 'સુધારા વર્ગીકરણ',
    empRevisedUnitsLabel: 'સુધારેલ બિલ યુનિટ્સ (વૈકલ્પિક — ફેઝ 9 સ્લેબ પુનઃગણતરી કરે છે)',
    empProposedAmountLabel: 'સૂચિત સુધારા રકમ (₹)',
    empAdjustmentReasonLabel: 'એન્જિનિયરિંગ અને ઓડિટ સમર્થન કારણ',
    empAdjustmentReasonPlaceholder: 'મીટર ટેસ્ટ રિપોર્ટ, OCR ફોટો પુરાવા અથવા ટેરિફ નિયમનો ઉલ્લેખ કરો...',
    empSubmitProposalBtn: 'એડમિન મંજૂરી માટે દરખાસ્ત મોકલો',
    empSeparationOfDutiesNotice: 'ફરજોનું વિભાજન લાગુ: દરખાસ્તોને સ્વતંત્ર એડમિન મંજૂરીની જરૂર છે. મૂળ બિલો અફર રહે છે.',
    empStatusHistoryTitle: 'અફર ઓડિટ ટ્રેલ અને સ્થિતિ ઇતિહાસ',
    empNoRecordsFound: 'આ કતારમાં કોઈ રેકોર્ડ મળ્યો નથી.',

    fldLaunchButton: 'મીટર રીડિંગ',
    fldModalBadge: 'ફિલ્ડ ઓપ્ટિકલ મીટર ચકાસણી',
    fldModalTitle: 'ફિલ્ડ એન્જિનિયર મીટર કેપ્ચર અને પુનઃરીડિંગ ચકાસણી',
    fldModalSubtitle: 'મીટરનો સ્પષ્ટ ફોટો લો, kWh રજિસ્ટર ક્રોપ કરો, અસ્પષ્ટ OCR અંકો તપાસો અથવા ઓફલાઇન સિંક માટે રીડિંગ કતારમાં મૂકો.',
    fldAssignedOrderBadge: 'સોંપાયેલ ફિલ્ડ જોડાણ',
    fldServiceOrderRef: 'વર્ક ઓર્ડર સંદર્ભ',
    fldRereadAlertTitle: 'સોંપાયેલ જોડાણો પર સબડિવિઝન પુનઃરીડિંગ વિનંતી',
    fldRereadAlertDesc: 'ફરીથી ચકાસણી માટે ચિહ્નિત થયેલ જોડાણો માટે સ્થળ પર જઈને ફોટો રીડિંગને પ્રાથમિકતા આપો.',
    fldCloseModal: 'વર્કસ્પેસ બંધ કરો',

    mgtSectionBadge: 'એક્ઝિક્યુટિવ મહેસૂલ સુરક્ષા અને મીટરિંગ એનાલિટિક્સ',
    mgtSectionTitle: 'AI મીટર રીડિંગ ચોકસાઈ, વિસંગતતા વિતરણ અને ટર્નઅરાઉન્ડ KPIs',
    mgtSectionSubtitle: 'સબડિવિઝન મીટર ચકાસણી કામગીરી, વિસંગતતા ગંભીરતા વિભાજન, ગ્રાહક બિલ વિવાદો અને મંજૂર નાણાકીય સુધારાઓનું રીડ-ઓન્લી એક્ઝિક્યુટિવ નિરીક્ષણ.',
    mgtTotalReadings: 'કુલ નોંધાયેલ રીડિંગ્સ',
    mgtPendingReview: 'અધિકારી સમીક્ષા બાકી',
    mgtApprovedReadings: 'પ્રમાણિત અને મંજૂર',
    mgtRereadRequested: 'ફિલ્ડ પુનઃરીડિંગ આદેશો',
    mgtOpenAnomalies: 'સક્રિય ખુલ્લી વિસંગતતાઓ',
    mgtAvgTurnaroundHours: 'સરેરાશ સમીક્ષા સમય',
    mgtAnomalyLifecycleTitle: '7-સ્થિતિ વિસંગતતા કેસ પાઇપલાઇન',
    mgtCategoryDistributionTitle: 'વિસંગતતા પ્રકાર મુજબ વિભાજન',
    mgtBillingReviewsSummaryTitle: 'ગ્રાહક બિલ સમીક્ષા પાઇપલાઇન',
    mgtFinancialAdjustmentsTitle: 'નાણાકીય સુધારા ખાતાવહી સારાંશ',
    mgtTotalAdjustedAmount: 'કુલ મંજૂર સુધારા મૂલ્ય',
    mgtThresholdVersionLabel: 'સક્રિય ચકાસણી નીતિ સંસ્કરણ',
    mgtReadOnlyNotice: 'રીડ-ઓન્લી એક્ઝિક્યુટિવ વ્યૂ: કામગીરી મંજૂરીઓ અને થ્રેશોલ્ડ ફેરફારો અધિકૃત સબડિવિઝન અને સિસ્ટમ એડમિન ભૂમિકાઓ પૂરતા મર્યાદિત છે.',

    admSectionBadge: 'સિસ્ટમ ગવર્નન્સ • OCR રનટાઇમ અને નાણાકીય નિયંત્રણો',
    admSectionTitle: 'સ્થાનિક OCR સ્વાસ્થ્ય, ચકાસણી થ્રેશોલ્ડ નીતિ અને સુધારા મંજૂરીઓ',
    admSectionSubtitle: 'સ્થાનિક Tesseract WASM વર્કર ટેલિમેટ્રીનું નિરીક્ષણ કરો, ફરજિયાત ઓડિટ કારણો સાથે વપરાશ વિસંગતતા થ્રેશોલ્ડ ગોઠવો અને નાણાકીય સુધારાઓ પર સ્વતંત્ર મંજૂરી આપો.',
    admOcrEngineTitle: 'સ્થાનિક Tesseract.js v7 WASM OCR રનટાઇમ સ્થિતિ',
    admOcrWorkerMode: 'સ્થાનિક વેબ વર્કર + WASM કોર (બાહ્ય ક્લાઉડ વિના)',
    admWasmCoreStatus: 'સક્રિય • ઓફલાઇન-સક્ષમ સંખ્યાત્મક વ્હાઇટલિસ્ટ',
    admMetadataStripping: 'કેનવાસ EXIF/GPS મેટાડેટા શુદ્ધિકરણ લાગુ',
    admMaxUploadLimit: '5 MiB ચુસ્ત મેજિક-બાઇટ સિગ્નેચર સુરક્ષા',
    admThresholdConfigTitle: 'સંસ્કરણબદ્ધ વપરાશ વિસંગતતા થ્રેશોલ્ડ નીતિ',
    admSpikeMultiplier: 'ઉચ્ચ ઉછાળા ગુણાંક (× સરેરાશ વપરાશ)',
    admSpikeMinUnits: 'ઉચ્ચ ઉછાળા લઘુત્તમ યુનિટ્સ (kWh)',
    admDropRatio: 'અચાનક ઘટાડા ગુણોત્તર (સરેરાશનો ભાગ)',
    admDropMinPreviousUnits: 'અચાનક ઘટાડા લઘુત્તમ અગાઉના યુનિટ્સ (kWh)',
    admZeroConsumptionMinPrev: 'શૂન્ય વપરાશ લઘુત્તમ અગાઉના યુનિટ્સ (kWh)',
    admLowOcrConfidencePercent: 'ઓછો OCR વિશ્વાસ ચેતવણી થ્રેશોલ્ડ (%)',
    admRapidResubmissionMinutes: 'ઝડપી પુનઃસબમિશન સમયગાળો (મિનિટ)',
    admMaxFutureDriftMinutes: 'મહત્તમ સમય તફાવત મર્યાદા (મિનિટ)',
    admThresholdReasonLabel: 'ફરજિયાત નીતિ ફેરફાર ઓડિટ કારણ',
    admThresholdReasonPlaceholder: 'વપરાશ ચકાસણી થ્રેશોલ્ડ શા માટે અપડેટ કરવામાં આવી રહ્યા છે તે સમજાવો...',
    admSaveThresholdsBtn: 'નીતિ સાચવો અને સંસ્કરણ વધારો',
    admSavingThresholds: 'નીતિ અપડેટ થઈ રહી છે...',
    admThresholdHistoryTitle: 'થ્રેશોલ્ડ નીતિ સંસ્કરણ ઓડિટ લોગ',
    admFinancialApprovalsTitle: 'સ્વતંત્ર વહીવટી મંજૂરી કતાર (નાણાકીય સુધારા)',
    admApproveAdjustmentBtn: 'સુધારો મંજૂર કરો',
    admRejectAdjustmentBtn: 'દરખાસ્ત નામંજૂર કરો',
    admApprovalNotePlaceholder: 'ફરજિયાત વહીવટી મંજૂરી અથવા નામંજૂરી ઓડિટ નોંધ દાખલ કરો...',
    admSeparationBlockedBadge: 'સ્વ-મંજૂરી પ્રતિબંધિત (ફરજોનું વિભાજન)'
  },

  hi: {
    statusDetected: 'पता चला',
    statusPendingReview: 'समीक्षा लंबित',
    statusUnderInvestigation: 'जांच के अधीन',
    statusApproved: 'स्वीकृत',
    statusRejected: 'अस्वीकृत',
    statusRereadRequested: 'पुनः रीडिंग का अनुरोध',
    statusCorrectedThroughAdjustment: 'समायोजन द्वारा संशोधित',
    statusClosed: 'बंद किया गया',
    statusPendingApproval: 'अनुमोदन लंबित',
    statusClear: 'सत्यापित स्पष्ट',
    statusReview: 'समीक्षा अनुशंसित',
    statusMatch: 'मेल खाता है',
    statusDiscrepancy: 'विसंगति',

    catNegativeOrRollback: 'ऋणात्मक अंतर / मीटर रोलबैक',
    catZeroOrStalled: 'शून्य खपत / रुका हुआ मीटर',
    catHighSpike: 'असामान्य रूप से उच्च खपत उछाल',
    catSuddenDrop: 'खपत में अचानक गिरावट',
    catDuplicateSubmission: 'डुप्लिकेट रीडिंग सबमिशन',
    catRapidResubmission: 'त्वरित पुनः सबमिशन',
    catIdentityMismatch: 'उपभोक्ता / मीटर पहचान असंगति',
    catOcrManualOverride: 'OCR रीडिंग में मैनुअल बदलाव',
    catLowOcrConfidence: 'कम OCR विश्वास स्कोर',
    catTariffSlabMismatch: 'टैरिफ स्लैब गणना असंगति',
    catBillDiscrepancy: 'बिलिंग विवरण में अंतर',
    catConsumptionDispute: 'खपत यूनिट विवाद',
    catTariffMismatch: 'टैरिफ श्रेणी / स्लैब असंगति',
    catMeterFaultSuspected: 'संभावित मीटर हार्डवेयर खराबी',
    catPaymentNotReflected: 'पिछला भुगतान दर्ज नहीं हुआ',
    catDuplicateBill: 'डुप्लिकेट बिल जारी किया गया',
    catOther: 'अन्य बिलिंग पूछताछ',

    adjSlabCorrection: 'चरण 9 टैरिफ स्लैब सुधार',
    adjCreditConcession: 'अधिकृत क्रेडिट रियायत',
    adjMeterErrorRebate: 'मीटर अंशांकन त्रुटि छूट',
    adjSupplementaryCharge: 'पूरक ऊर्जा शुल्क',

    sevHigh: 'उच्च प्राथमिकता',
    sevReview: 'समीक्षा आवश्यक',
    sevInfo: 'सूचनात्मक',

    wsTitle: 'AI मीटर रीडिंग और खपत सत्यापन',
    wsSubtitle: 'मीटर फोटो लें, स्थानीय OCR चलाएं, kWh अंतर सत्यापित करें और बिलिंग समीक्षा से पहले असामान्य द्वि-मासिक उछाल को चिह्नित करें।',
    wsDemoBadge: 'डेमो सत्यापन वर्कफ़्लो',
    wsConnectionLabel: 'कनेक्शन',
    wsMeterLabel: 'मीटर संख्या',
    wsLastVerified: 'अंतिम सत्यापित रीडिंग',
    wsUploadPhoto: 'मीटर फोटो अपलोड करें',
    wsCapturePhoto: 'फोटो लें',
    wsSwitchCamera: 'कैमरा बदलें',
    wsRetakePhoto: 'दोबारा फोटो लें',
    wsRotate90: '90° घुमाएं',
    wsCropDisplay: 'डिस्प्ले क्रॉप करें',
    wsApplyCrop: 'क्रॉप लागू करें',
    wsResetCrop: 'क्रॉप रीसेट करें',
    wsCropHint: 'केवल kWh अंकों को चुनने के लिए मीटर डिस्प्ले विंडो पर खींचें।',
    wsRunOcr: 'OCR से रीडिंग निकालें',
    wsRunningOcr: 'अंक पढ़े जा रहे हैं...',
    wsDisplayedReading: 'प्रदर्शित मीटर रीडिंग (kWh)',
    wsReadingDate: 'रीडिंग दिनांक और समय',
    wsMeterCondition: 'मीटर रीडिंग स्थिति',
    wsEventOrdinary: 'सामान्य रीडिंग',
    wsEventRollover: 'डायल रोलओवर सत्यापित',
    wsEventReplacement: 'मीटर प्रतिस्थापन सत्यापित',
    wsQueueOffline: 'ऑफ़लाइन कतार में रखें',
    wsSubmitReading: 'सत्यापन हेतु सबमिट करें',
    wsSubmitting: 'सबमिट हो रहा है...',
    wsSyncQueue: 'ऑफ़लाइन कतार सिंक करें',
    wsPreview: 'खपत और विसंगति जांच',
    wsRecentSubmissions: 'हाल के मीटर रीडिंग सबमिशन',
    wsNoReadings: 'इस सत्र में अभी तक कोई मीटर रीडिंग सबमिट नहीं की गई है।',
    wsReviewNotesPlaceholder: 'सत्यापन टिप्पणी जोड़ें (चिह्नित रीडिंग को स्वीकृत या अस्वीकृत करते समय अनिवार्य)',
    wsApprove: 'रीडिंग स्वीकृत करें',
    wsRequestReread: 'पुनः रीडिंग का अनुरोध करें',
    wsReject: 'रीडिंग अस्वीकृत करें',
    wsLoadPhoto: 'सबमिट की गई फोटो देखें',
    wsOcrReady: 'OCR निष्कर्षण पूर्ण',
    wsOcrConfidence: 'विश्वास स्तर',
    wsOcrProposedReading: 'प्रस्तावित संख्यात्मक रीडिंग',
    wsOcrRawText: 'मूल OCR पाठ',
    wsOcrAmbiguousTitle: 'अस्पष्ट अंक स्थान पाए गए',
    wsOcrAmbiguousHelp: 'सबमिट करने से पहले हाइलाइट किए गए अक्षरों को मीटर फोटो से मिलाकर जांचें।',
    wsOcrUseAlt: 'उपयोग करें',
    wsQualityGlare: 'मीटर के कांच पर चमक दिख रही है — कैमरे को थोड़ा झुकाएं।',
    wsQualityBlur: 'छवि धुंधली दिख रही है — हाथ स्थिर रखें और अंकों पर फोकस करें।',
    wsQualityLowContrast: 'कम कंट्रास्ट — फ्लैश चालू करें या मीटर रजिस्टर पर रोशनी बढ़ाएं।',
    wsQualityTilt: 'फ्रेम संकीर्ण या तिरछा है — क्षैतिज अंक विंडो को केंद्र में रखें।',
    wsCameraAlignGuide: 'हाइलाइट किए गए फ्रेम के भीतर kWh अंक रजिस्टर को संरेखित करें',
    wsCameraClose: 'कैमरा बंद करें',
    wsSnapPhoto: 'फोटो खींचें',
    wsOfflineQueuedCount: 'ऑफ़लाइन कतारबद्ध रीडिंग',
    wsDeltaKwh: 'अंतर kWh',
    wsConsumptionUnits: 'बिल यूनिट्स',
    wsIntervalDays: 'चक्र दिवस',

    cnsSectionBadge: 'चरण 11 स्मार्ट मीटरिंग और बिल सत्यापन',
    cnsSectionTitle: 'AI मीटर रीडिंग, बिल सत्यापन और विवाद निवारण',
    cnsSectionSubtitle: 'OCR के साथ सत्यापित सेल्फ-रीडिंग सबमिट करें, आधिकारिक UGVCL FY 2025-26 टैरिफ के अनुसार अपने द्वि-मासिक बिल का ऑडिट करें और बिल समीक्षा अनुरोधों को ट्रैक करें।',
    cnsTabSubmitReading: 'स्मार्ट मीटर सेल्फ-रीडिंग',
    cnsTabBillValidation: 'द्वि-मासिक बिल सत्यापनकर्ता',
    cnsTabReviewRequests: 'बिल समीक्षा और विवाद ट्रैकर',
    cnsSelectConnection: 'सेवा कनेक्शन चुनें',
    cnsSelectBill: 'ऑडिट करने के लिए द्वि-मासिक बिल चुनें',
    cnsValidateBillBtn: 'आधिकारिक टैरिफ सत्यापन चलाएं',
    cnsValidating: 'बिल सत्यापित हो रहा है...',
    cnsValidationStatus: 'टैरिफ ऑडिट परिणाम',
    cnsBilledAmount: 'बिल अनुसार देय राशि',
    cnsExpectedCanonical: 'आधिकारिक अपेक्षित राशि',
    cnsVariance: 'शुद्ध अंतर',
    cnsLineItem: 'टैरिफ घटक',
    cnsBilledCol: 'विवरण में बिल किया गया',
    cnsCanonicalCol: 'चरण 9 आधिकारिक गणना',
    cnsDiffCol: 'अंतर',
    cnsStatusCol: 'ऑडिट स्थिति',
    cnsFindingsTitle: 'सत्यापन निष्कर्ष और जांच',
    cnsNoDiscrepancies: 'सभी ऊर्जा स्लैब, स्थायी शुल्क, FPPPA और विद्युत शुल्क आधिकारिक UGVCL टैरिफ अनुसूची से पूरी तरह मेल खाते हैं।',
    cnsRequestBillingReviewTitle: 'आधिकारिक सबडिवीजन बिलिंग समीक्षा का अनुरोध करें',
    cnsReviewCategoryLabel: 'विवाद / पूछताछ श्रेणी',
    cnsReviewDescriptionLabel: 'विसंगति का विस्तृत विवरण',
    cnsReviewDescriptionPlaceholder: 'उस मीटर रीडिंग, टैरिफ स्लैब या भुगतान समस्या का वर्णन करें जिसे आप सबडिवीजन अधिकारी से सत्यापित कराना चाहते हैं...',
    cnsAttachEvidencePhoto: 'सहायक मीटर / रसीद फोटो संलग्न करें (वैकल्पिक, अधिकतम 5 MiB)',
    cnsSubmitReviewBtn: 'बिलिंग समीक्षा अनुरोध सबमिट करें',
    cnsSubmittingReview: 'अनुरोध सबमिट हो रहा है...',
    cnsReviewSubmittedSuccess: 'बिलिंग समीक्षा अनुरोध दर्ज कर लिया गया है और सबडिवीजन संचालन को भेज दिया गया है।',
    cnsMyBillingReviewsTitle: 'मेरे बिलिंग समीक्षा अनुरोध और प्रगति स्थिति',
    cnsNoBillingReviews: 'आपके कनेक्शनों के लिए कोई बिलिंग समीक्षा अनुरोध दर्ज नहीं है।',
    cnsPublicResolutionNote: 'सबडिवीजन समाधान टिप्पणी',
    cnsStatusTimeline: 'सत्यापन जीवनचक्र समयरेखा',
    cnsMeterNotificationsTitle: 'मीटरिंग और बिलिंग सत्यापन अलर्ट',
    cnsNoMeterNotifications: 'हाल ही में कोई मीटर या बिलिंग समीक्षा अलर्ट नहीं है।',

    empTabTitle: 'मीटर और विसंगति समीक्षा',
    empHeaderBadge: 'सबडिवीजन मीटरिंग और राजस्व सुरक्षा',
    empHeaderTitle: 'मीटर रीडिंग सत्यापन, विसंगति जीवनचक्र और वित्तीय समायोजन',
    empHeaderSubtitle: 'OCR मीटर फोटो की जांच करें, 7-स्थिति विसंगति जीवनचक्र का प्रबंधन करें, उपभोक्ता बिल समीक्षा अनुरोधों का समाधान करें और चरण 9 टैरिफ समायोजन प्रस्तावित करें।',
    empSubtabReadings: 'मीटर रीडिंग कतार',
    empSubtabAnomalies: '7-स्थिति विसंगति मामले',
    empSubtabBillingReviews: 'उपभोक्ता बिलिंग समीक्षाएं',
    empSubtabAdjustments: 'वित्तीय समायोजन प्रस्ताव',
    empFilterStatus: 'स्थिति के अनुसार फ़िल्टर करें',
    empFilterAllStatuses: 'सभी जीवनचक्र स्थितियां',
    empSearchPlaceholder: 'उपभोक्ता सं., मीटर सं., बिल सं. या केस ID खोजें...',
    empRefreshBtn: 'कतार रिफ्रेश करें',
    empReadingId: 'रीडिंग ID',
    empConsumerNo: 'उपभोक्ता सं.',
    empMeterNo: 'मीटर सं.',
    empSubmittedReading: 'सबमिट की गई रीडिंग',
    empPreviousReading: 'पिछली सत्यापित',
    empConsumedUnits: 'खपत यूनिट्स',
    empSubmittedBy: 'सबमिट कर्ता',
    empOcrSummary: 'OCR टेलीमेट्री',
    empAuditNoteLabel: 'अनिवार्य आंतरिक स्टाफ ऑडिट टिप्पणी',
    empAuditNotePlaceholder: 'संरचित जांच निष्कर्ष या सत्यापन तर्क दर्ज करें...',
    empPublicNoteLabel: 'उपभोक्ता-दृश्य समाधान टिप्पणी (सुरक्षित सारांश)',
    empPublicNotePlaceholder: 'उपभोक्ता को उनके बिलिंग पोर्टल पर दिखने वाला स्पष्ट सारांश दर्ज करें...',
    empStartInvestigation: 'जांच शुरू करें',
    empApproveCase: 'स्वीकृत और सत्यापित करें',
    empRejectCase: 'मामला अस्वीकृत करें',
    empCloseCase: 'सुलझा मामला बंद करें',
    empMarkAdjusted: 'समायोजन द्वारा संशोधित चिह्नित करें',
    empProposeAdjustmentTitle: 'एपेंड-ओनली वित्तीय समायोजन प्रस्तावित करें',
    empAdjustmentTypeLabel: 'समायोजन वर्गीकरण',
    empRevisedUnitsLabel: 'संशोधित बिल यूनिट्स (वैकल्पिक — चरण 9 स्लैब पुनर्गणना सक्रिय करता है)',
    empProposedAmountLabel: 'प्रस्तावित समायोजन राशि (₹)',
    empAdjustmentReasonLabel: 'इंजीनियरिंग और ऑडिट औचित्य',
    empAdjustmentReasonPlaceholder: 'मीटर परीक्षण रिपोर्ट, OCR फोटो साक्ष्य या टैरिफ आदेश खंड का उल्लेख करें...',
    empSubmitProposalBtn: 'प्रशासनिक अनुमोदन हेतु प्रस्ताव सबमिट करें',
    empSeparationOfDutiesNotice: 'कर्तव्यों का पृथक्करण लागू: प्रस्तावों के लिए स्वतंत्र प्रशासनिक अनुमोदन आवश्यक है। मूल बिल अपरिवर्तनीय रहते हैं।',
    empStatusHistoryTitle: 'अपरिवर्तनीय ऑडिट ट्रेल और स्थिति इतिहास',
    empNoRecordsFound: 'इस कतार में कोई मेल खाता रिकॉर्ड नहीं मिला।',

    fldLaunchButton: 'मीटर रीडिंग',
    fldModalBadge: 'फ़ील्ड ऑप्टिकल मीटर सत्यापन',
    fldModalTitle: 'फ़ील्ड इंजीनियर मीटर कैप्चर और पुनः रीडिंग सत्यापन',
    fldModalSubtitle: 'प्रमाणिक मीटर फोटो लें, kWh रजिस्टर क्रॉप करें, अस्पष्ट OCR अंकों को सत्यापित करें या ऑफ़लाइन सिंक के लिए रीडिंग कतार में रखें।',
    fldAssignedOrderBadge: 'आवंटित फ़ील्ड कनेक्शन',
    fldServiceOrderRef: 'वर्क ऑर्डर संदर्भ',
    fldRereadAlertTitle: 'आवंटित कनेक्शनों पर सबडिवीजन पुनः रीडिंग अनुरोध',
    fldRereadAlertDesc: 'पुनः सत्यापन के लिए चिह्नित कनेक्शनों के लिए भौतिक ऑप्टिकल कैप्चर को प्राथमिकता दें।',
    fldCloseModal: 'वर्कस्पेस बंद करें',

    mgtSectionBadge: 'एग्जीक्यूटिव राजस्व सुरक्षा और मीटरिंग एनालिटिक्स',
    mgtSectionTitle: 'AI मीटर रीडिंग अखंडता, विसंगति वितरण और टर्नअराउंड KPIs',
    mgtSectionSubtitle: 'सबडिवीजन मीटर सत्यापन थ्रूपुट, विसंगति गंभीरता विश्लेषण, उपभोक्ता बिलिंग विवाद और स्वीकृत वित्तीय समायोजनों की रीड-ओनली कार्यकारी निगरानी।',
    mgtTotalReadings: 'कुल दर्ज रीडिंग',
    mgtPendingReview: 'अधिकारी समीक्षा लंबित',
    mgtApprovedReadings: 'सत्यापित और स्वीकृत',
    mgtRereadRequested: 'फ़ील्ड पुनः रीडिंग आदेश',
    mgtOpenAnomalies: 'सक्रिय खुली विसंगतियां',
    mgtAvgTurnaroundHours: 'औसत समीक्षा समय',
    mgtAnomalyLifecycleTitle: '7-स्थिति विसंगति केस पाइपलाइन',
    mgtCategoryDistributionTitle: 'विसंगति श्रेणी विश्लेषण',
    mgtBillingReviewsSummaryTitle: 'उपभोक्ता बिलिंग समीक्षा पाइपलाइन',
    mgtFinancialAdjustmentsTitle: 'वित्तीय समायोजन लेजर सारांश',
    mgtTotalAdjustedAmount: 'कुल स्वीकृत समायोजन मूल्य',
    mgtThresholdVersionLabel: 'सक्रिय सत्यापन नीति संस्करण',
    mgtReadOnlyNotice: 'रीड-ओनली एग्जीक्यूटिव व्यू: परिचालन अनुमोदन और थ्रेशोल्ड परिवर्तन अधिकृत सबडिवीजन और सिस्टम एडमिन भूमिकाओं तक सीमित हैं।',

    admSectionBadge: 'सिस्टम गवर्नेंस • OCR रनटाइम और वित्तीय नियंत्रण',
    admSectionTitle: 'स्थानीय OCR स्वास्थ्य, सत्यापन थ्रेशोल्ड नीति और समायोजन अनुमोदन',
    admSectionSubtitle: 'स्थानीय Tesseract WASM वर्कर टेलीमेट्री की निगरानी करें, अनिवार्य ऑडिट कारणों के साथ खपत विसंगति थ्रेशोल्ड कॉन्फ़िगर करें और वित्तीय समायोजनों पर स्वतंत्र अनुमोदन निष्पादित करें।',
    admOcrEngineTitle: 'स्थानीय Tesseract.js v7 WASM OCR रनटाइम स्थिति',
    admOcrWorkerMode: 'स्थानीय वेब वर्कर + WASM कोर (शून्य बाहरी क्लाउड निर्भरता)',
    admWasmCoreStatus: 'सक्रिय • ऑफ़लाइन-सक्षम संख्यात्मक श्वेतसूची',
    admMetadataStripping: 'कैनवास EXIF/GPS मेटाडेटा स्वच्छता लागू',
    admMaxUploadLimit: '5 MiB सख्त मैजिक-बाइट हस्ताक्षर सुरक्षा',
    admThresholdConfigTitle: 'संस्करणबद्ध खपत विसंगति थ्रेशोल्ड नीति',
    admSpikeMultiplier: 'उच्च उछाल गुणक (× ऐतिहासिक औसत)',
    admSpikeMinUnits: 'उच्च उछाल न्यूनतम यूनिट्स (kWh)',
    admDropRatio: 'अचानक गिरावट अनुपात (औसत का अंश)',
    admDropMinPreviousUnits: 'अचानक गिरावट न्यूनतम पिछली यूनिट्स (kWh)',
    admZeroConsumptionMinPrev: 'शून्य खपत न्यूनतम पिछली यूनिट्स (kWh)',
    admLowOcrConfidencePercent: 'कम OCR विश्वास अलर्ट थ्रेशोल्ड (%)',
    admRapidResubmissionMinutes: 'त्वरित पुनः सबमिशन समय (मिनट)',
    admMaxFutureDriftMinutes: 'अधिकतम घड़ी अंतर सहनशीलता (मिनट)',
    admThresholdReasonLabel: 'अनिवार्य नीति परिवर्तन ऑडिट कारण',
    admThresholdReasonPlaceholder: 'स्पष्ट करें कि खपत सत्यापन थ्रेशोल्ड क्यों अपडेट किए जा रहे हैं...',
    admSaveThresholdsBtn: 'सहेजें और नीति संस्करण बढ़ाएं',
    admSavingThresholds: 'नीति अपडेट हो रही है...',
    admThresholdHistoryTitle: 'थ्रेशोल्ड नीति संस्करण ऑडिट लॉग',
    admFinancialApprovalsTitle: 'स्वतंत्र प्रशासनिक अनुमोदन कतार (वित्तीय समायोजन)',
    admApproveAdjustmentBtn: 'समायोजन स्वीकृत करें',
    admRejectAdjustmentBtn: 'प्रस्ताव अस्वीकृत करें',
    admApprovalNotePlaceholder: 'अनिवार्य प्रशासनिक अनुमोदन या अस्वीकृति ऑडिट टिप्पणी दर्ज करें...',
    admSeparationBlockedBadge: 'स्व-अनुमोदन अवरुद्ध (कर्तव्यों का पृथक्करण)'
  },

  mr: {
    statusDetected: 'आढळले',
    statusPendingReview: 'पुनरावलोकन प्रलंबित',
    statusUnderInvestigation: 'तपासणीखाली',
    statusApproved: 'मंजूर',
    statusRejected: 'नामंजूर',
    statusRereadRequested: 'पुन्हा रीडिंगची विनंती',
    statusCorrectedThroughAdjustment: 'समायोजनाद्वारे सुधारित',
    statusClosed: 'बंद केले',
    statusPendingApproval: 'मंजुरी प्रलंबित',
    statusClear: 'सत्यापित स्पष्ट',
    statusReview: 'पुनरावलोकन शिफारस',
    statusMatch: 'जुळते',
    statusDiscrepancy: 'तफावत',

    catNegativeOrRollback: 'ऋण फरक / मीटर रोलबॅक',
    catZeroOrStalled: 'शून्य वापर / थांबलेले मीटर',
    catHighSpike: 'असामान्य उच्च वापर वाढ',
    catSuddenDrop: 'वापरात अचानक घट',
    catDuplicateSubmission: 'डुप्लिकेट रीडिंग सबमिशन',
    catRapidResubmission: 'जलद पुन्हा सबमिशन',
    catIdentityMismatch: 'ग्राहक / मीटर ओळख विसंगती',
    catOcrManualOverride: 'OCR रीडिंगमध्ये मॅन्युअल बदल',
    catLowOcrConfidence: 'कमी OCR विश्वास गुण',
    catTariffSlabMismatch: 'टॅरिफ स्लॅब गणना विसंगती',
    catBillDiscrepancy: 'बिलिंग विवरणपत्रातील तफावत',
    catConsumptionDispute: 'वापर युनिट्सबाबत तक्रार',
    catTariffMismatch: 'टॅरिफ श्रेणी / स्लॅब विसंगती',
    catMeterFaultSuspected: 'संभाव्य मीटर हार्डवेअर बिघाड',
    catPaymentNotReflected: 'मागील भरणा जमा झाला नाही',
    catDuplicateBill: 'डुप्लिकेट बिल जारी झाले',
    catOther: 'इतर बिलिंग चौकशी',

    adjSlabCorrection: 'टप्पा 9 टॅरिफ स्लॅब दुरुस्ती',
    adjCreditConcession: 'अधिकृत क्रेडिट सवलत',
    adjMeterErrorRebate: 'मीटर कॅलिब्रेशन त्रुटी सूट',
    adjSupplementaryCharge: 'पूरक वीज आकार',

    sevHigh: 'उच्च प्राधान्य',
    sevReview: 'पुनरावलोकन आवश्यक',
    sevInfo: 'माहितीपूर्ण',

    wsTitle: 'AI मीटर रीडिंग आणि वापर पडताळणी',
    wsSubtitle: 'मीटरचा फोटो काढा, स्थानिक OCR चालवा, kWh फरक तपासा आणि बिलिंग पुनरावलोकनापूर्वी असामान्य द्वि-मासिक वाढ चिन्हांकित करा.',
    wsDemoBadge: 'डेमो पडताळणी वर्कफ्लो',
    wsConnectionLabel: 'जोडणी',
    wsMeterLabel: 'मीटर क्रमांक',
    wsLastVerified: 'शेवटचे सत्यापित रीडिंग',
    wsUploadPhoto: 'मीटर फोटो अपलोड करा',
    wsCapturePhoto: 'फोटो काढा',
    wsSwitchCamera: 'कॅमेरा बदला',
    wsRetakePhoto: 'पुन्हा फोटो काढा',
    wsRotate90: '90° फिरवा',
    wsCropDisplay: 'डिस्प्ले क्रॉप करा',
    wsApplyCrop: 'क्रॉप लागू करा',
    wsResetCrop: 'क्रॉप रीसेट करा',
    wsCropHint: 'फक्त kWh अंक निवडण्यासाठी मीटर डिस्प्ले विंडोवर ड्रॅग करा.',
    wsRunOcr: 'OCR द्वारे रीडिंग वाचा',
    wsRunningOcr: 'अंक वाचत आहे...',
    wsDisplayedReading: 'दिसणारे मीटर रीडिंग (kWh)',
    wsReadingDate: 'रीडिंग तारीख आणि वेळ',
    wsMeterCondition: 'मीटर रीडिंग स्थिती',
    wsEventOrdinary: 'सामान्य रीडिंग',
    wsEventRollover: 'डायल रोलओव्हर सत्यापित',
    wsEventReplacement: 'मीटर बदल सत्यापित',
    wsQueueOffline: 'ऑफलाइन रांगेत ठेवा',
    wsSubmitReading: 'पडताळणीसाठी सबमिट करा',
    wsSubmitting: 'सबमिट होत आहे...',
    wsSyncQueue: 'ऑफलाइन रांग सिंक करा',
    wsPreview: 'वापर आणि विसंगती तपासणी',
    wsRecentSubmissions: 'अलीकडील मीटर रीडिंग सबमिशन',
    wsNoReadings: 'या सत्रात अद्याप कोणतेही मीटर रीडिंग सबमिट केलेले नाही.',
    wsReviewNotesPlaceholder: 'पडताळणी नोंद जोडा (फ्लॅग केलेले रीडिंग मंजूर किंवा नामंजूर करताना अनिवार्य)',
    wsApprove: 'रीडिंग मंजूर करा',
    wsRequestReread: 'पुन्हा रीडिंग मागवा',
    wsReject: 'रीडिंग नामंजूर करा',
    wsLoadPhoto: 'सबमिट केलेला फोटो पहा',
    wsOcrReady: 'OCR वाचन पूर्ण',
    wsOcrConfidence: 'विश्वास पातळी',
    wsOcrProposedReading: 'प्रस्तावित संख्यात्मक रीडिंग',
    wsOcrRawText: 'मूळ OCR मजकूर',
    wsOcrAmbiguousTitle: 'अस्पष्ट अंक स्थाने आढळली',
    wsOcrAmbiguousHelp: 'सबमिट करण्यापूर्वी हायलाइट केलेले अक्षरे मीटर फोटोशी जुळवून तपासा.',
    wsOcrUseAlt: 'वापरा',
    wsQualityGlare: 'मीटरच्या काचेवर चमक दिसत आहे — कॅमेरा थोडा तिरपा धरा.',
    wsQualityBlur: 'फोटो अस्पष्ट दिसत आहे — हात स्थिर ठेवा आणि अंकांवर फोकस करा.',
    wsQualityLowContrast: 'कमी कॉन्ट्रास्ट — फ्लॅश चालू करा किंवा मीटरवर प्रकाश वाढवा.',
    wsQualityTilt: 'फ्रेम अरुंद किंवा तिरपी आहे — आडवी अंक विंडो मध्यभागी ठेवा.',
    wsCameraAlignGuide: 'हायलाइट केलेल्या फ्रेमच्या आत kWh अंक रजिस्टर संरेखित करा',
    wsCameraClose: 'कॅमेरा बंद करा',
    wsSnapPhoto: 'फोटो काढा',
    wsOfflineQueuedCount: 'ऑफलाइन रांगेतील रीडिंग्स',
    wsDeltaKwh: 'फरक kWh',
    wsConsumptionUnits: 'बिल युनिट्स',
    wsIntervalDays: 'सायकल दिवस',

    cnsSectionBadge: 'टप्पा 11 स्मार्ट मीटरिंग आणि बिल पडताळणी',
    cnsSectionTitle: 'AI मीटर रीडिंग, बिल पडताळणी आणि तक्रार निवारण',
    cnsSectionSubtitle: 'OCR सह सत्यापित सेल्फ-रीडिंग सबमिट करा, अधिकृत UGVCL FY 2025-26 टॅरिफनुसार तुमच्या द्वि-मासिक बिलाचे ऑडिट करा आणि बिल पुनरावलोकन विनंत्या ट्रॅक करा.',
    cnsTabSubmitReading: 'स्मार्ट मीटर सेल्फ-रीडिंग',
    cnsTabBillValidation: 'द्वि-मासिक बिल पडताळणीकार',
    cnsTabReviewRequests: 'बिल पुनरावलोकन आणि तक्रार ट्रॅकर',
    cnsSelectConnection: 'सेवा जोडणी निवडा',
    cnsSelectBill: 'ऑडिट करण्यासाठी द्वि-मासिक बिल निवडा',
    cnsValidateBillBtn: 'अधिकृत टॅरिफ पडताळणी चालवा',
    cnsValidating: 'बिल तपासले जात आहे...',
    cnsValidationStatus: 'टॅरिफ ऑडिट निकाल',
    cnsBilledAmount: 'बिलानुसार देय रक्कम',
    cnsExpectedCanonical: 'अधिकृत अपेक्षित रक्कम',
    cnsVariance: 'निव्वळ फरक',
    cnsLineItem: 'टॅरिफ घटक',
    cnsBilledCol: 'विवरणानुसार बिल',
    cnsCanonicalCol: 'टप्पा 9 अधिकृत गणना',
    cnsDiffCol: 'फरक',
    cnsStatusCol: 'ऑडिट स्थिती',
    cnsFindingsTitle: 'पडताळणी निष्कर्ष आणि तपासण्या',
    cnsNoDiscrepancies: 'सर्व एनर्जी स्लॅब, स्थिर आकार, FPPPA आणि वीज शुल्क अधिकृत UGVCL टॅरिफ वेळापत्रकाशी पूर्णपणे जुळतात.',
    cnsRequestBillingReviewTitle: 'अधिकृत सबडिव्हिजन बिलिंग पुनरावलोकनाची विनंती करा',
    cnsReviewCategoryLabel: 'तक्रार / चौकशी प्रकार',
    cnsReviewDescriptionLabel: 'तफावतीचे सविस्तर स्पष्टीकरण',
    cnsReviewDescriptionPlaceholder: 'तुम्हाला सबडिव्हिजन अधिकाऱ्याकडून तपासायचे असलेले मीटर रीडिंग, टॅरिफ स्लॅब किंवा भरणा समस्येचे वर्णन करा...',
    cnsAttachEvidencePhoto: 'पुराव्यासाठी मीटर / पावतीचा फोटो जोडा (ऐच्छिक, कमाल 5 MiB)',
    cnsSubmitReviewBtn: 'बिलिंग पुनरावलोकन विनंती सबमिट करा',
    cnsSubmittingReview: 'विनंती सबमिट होत आहे...',
    cnsReviewSubmittedSuccess: 'बिलिंग पुनरावलोकन विनंती नोंदवली गेली आहे आणि सबडिव्हिजन ऑपरेशन्सकडे पाठवली आहे.',
    cnsMyBillingReviewsTitle: 'माझ्या बिलिंग पुनरावलोकन विनंत्या आणि प्रगती स्थिती',
    cnsNoBillingReviews: 'तुमच्या जोडण्यांसाठी कोणतीही बिलिंग पुनरावलोकन विनंती नोंदवलेली नाही.',
    cnsPublicResolutionNote: 'सबडिव्हिजन निवारण नोंद',
    cnsStatusTimeline: 'पडताळणी जीवनचक्र टाइमलाइन',
    cnsMeterNotificationsTitle: 'मीटरिंग आणि बिलिंग पडताळणी सूचना',
    cnsNoMeterNotifications: 'अलीकडे कोणतीही मीटर किंवा बिलिंग पुनरावलोकन सूचना नाही.',

    empTabTitle: 'मीटर आणि विसंगती पुनरावलोकन',
    empHeaderBadge: 'सबडिव्हिजन मीटरिंग आणि महसूल संरक्षण',
    empHeaderTitle: 'मीटर रीडिंग पडताळणी, विसंगती जीवनचक्र आणि आर्थिक समायोजन',
    empHeaderSubtitle: 'OCR मीटर फोटो तपासा, 7-स्थिती विसंगती जीवनचक्र व्यवस्थापित करा, ग्राहक बिल पुनरावलोकन विनंत्या सोडवा आणि टप्पा 9 टॅरिफ समायोजन प्रस्तावित करा.',
    empSubtabReadings: 'मीटर रीडिंग रांग',
    empSubtabAnomalies: '7-स्थिती विसंगती प्रकरणे',
    empSubtabBillingReviews: 'ग्राहक बिलिंग पुनरावलोकने',
    empSubtabAdjustments: 'आर्थिक समायोजन प्रस्ताव',
    empFilterStatus: 'स्थितीनुसार फिल्टर करा',
    empFilterAllStatuses: 'सर्व जीवनचक्र स्थिती',
    empSearchPlaceholder: 'ग्राहक क्र., मीटर क्र., बिल क्र. किंवा केस ID शोधा...',
    empRefreshBtn: 'रांग रिफ्रेश करा',
    empReadingId: 'रीडिंग ID',
    empConsumerNo: 'ग्राहक क्र.',
    empMeterNo: 'मीटर क्र.',
    empSubmittedReading: 'सबमिट केलेले रीडिंग',
    empPreviousReading: 'मागील सत्यापित',
    empConsumedUnits: 'वापरलेले युनिट्स',
    empSubmittedBy: 'सबमिट करणारे',
    empOcrSummary: 'OCR टेलीमेट्री',
    empAuditNoteLabel: 'अनिवार्य अंतर्गत कर्मचारी ऑडिट नोंद',
    empAuditNotePlaceholder: 'संरचित तपास निष्कर्ष किंवा पडताळणी कारण प्रविष्ट करा...',
    empPublicNoteLabel: 'ग्राहकाला दिसणारी निवारण नोंद (सुरक्षित सारांश)',
    empPublicNotePlaceholder: 'ग्राहकाला त्यांच्या बिलिंग पोर्टलवर दिसेल असा स्पष्ट सारांश लिहा...',
    empStartInvestigation: 'तपास सुरू करा',
    empApproveCase: 'मंजूर आणि सत्यापित करा',
    empRejectCase: 'प्रकरण नामंजूर करा',
    empCloseCase: 'सोडवलेले प्रकरण बंद करा',
    empMarkAdjusted: 'समायोजनाद्वारे सुधारित चिन्हांकित करा',
    empProposeAdjustmentTitle: 'अपेंड-ओन्ली आर्थिक समायोजन प्रस्तावित करा',
    empAdjustmentTypeLabel: 'समायोजन वर्गीकरण',
    empRevisedUnitsLabel: 'सुधारित बिल युनिट्स (ऐच्छिक — टप्पा 9 स्लॅब पुनर्गणना सुरू करते)',
    empProposedAmountLabel: 'प्रस्तावित समायोजन रक्कम (₹)',
    empAdjustmentReasonLabel: 'अभियांत्रिकी आणि ऑडिट समर्थन कारण',
    empAdjustmentReasonPlaceholder: 'मीटर चाचणी अहवाल, OCR फोटो पुरावा किंवा टॅरिफ आदेश कलमाचा उल्लेख करा...',
    empSubmitProposalBtn: 'प्रशासकीय मंजुरीसाठी प्रस्ताव सबमिट करा',
    empSeparationOfDutiesNotice: 'कर्तव्यांचे विभाजन लागू: प्रस्तावांना स्वतंत्र प्रशासकीय मंजुरी आवश्यक आहे. मूळ बिले अपरिवर्तनीय राहतात.',
    empStatusHistoryTitle: 'अपरिवर्तनीय ऑडिट ट्रेल आणि स्थिती इतिहास',
    empNoRecordsFound: 'या रांगेत कोणतेही जुळणारे रेकॉर्ड आढळले नाहीत.',

    fldLaunchButton: 'मीटर रीडिंग',
    fldModalBadge: 'फील्ड ऑप्टिकल मीटर पडताळणी',
    fldModalTitle: 'फील्ड इंजिनिअर मीटर कॅप्चर आणि पुन्हा रीडिंग पडताळणी',
    fldModalSubtitle: 'स्पष्ट मीटर फोटो काढा, kWh रजिस्टर क्रॉप करा, अस्पष्ट OCR अंक तपासा किंवा ऑफलाइन सिंकसाठी रीडिंग रांगेत ठेवा.',
    fldAssignedOrderBadge: 'नेमून दिलेली फील्ड जोडणी',
    fldServiceOrderRef: 'वर्क ऑर्डर संदर्भ',
    fldRereadAlertTitle: 'नेमून दिलेल्या जोडण्यांवर सबडिव्हिजन पुन्हा रीडिंग विनंती',
    fldRereadAlertDesc: 'पुन्हा पडताळणीसाठी चिन्हांकित केलेल्या जोडण्यांसाठी प्रत्यक्ष फोटो कॅप्चरला प्राधान्य द्या.',
    fldCloseModal: 'वर्कस्पेस बंद करा',

    mgtSectionBadge: 'एक्झिक्युटिव्ह महसूल संरक्षण आणि मीटरिंग ॲनालिटिक्स',
    mgtSectionTitle: 'AI मीटर रीडिंग अखंडता, विसंगती वितरण आणि टर्नअराउंड KPIs',
    mgtSectionSubtitle: 'सबडिव्हिजन मीटर पडताळणी कार्यक्षमता, विसंगती तीव्रता विभागणी, ग्राहक बिलिंग तक्रारी आणि मंजूर आर्थिक समायोजनांचे रीड-ओन्ली कार्यकारी निरीक्षण.',
    mgtTotalReadings: 'एकूण नोंदवलेली रीडिंग्स',
    mgtPendingReview: 'अधिकारी पुनरावलोकन प्रलंबित',
    mgtApprovedReadings: 'सत्यापित आणि मंजूर',
    mgtRereadRequested: 'फील्ड पुन्हा रीडिंग आदेश',
    mgtOpenAnomalies: 'सक्रिय खुल्या विसंगती',
    mgtAvgTurnaroundHours: 'सरासरी पुनरावलोकन वेळ',
    mgtAnomalyLifecycleTitle: '7-स्थिती विसंगती प्रकरण पाइपलाइन',
    mgtCategoryDistributionTitle: 'विसंगती प्रकारानुसार विभागणी',
    mgtBillingReviewsSummaryTitle: 'ग्राहक बिलिंग पुनरावलोकन पाइपलाइन',
    mgtFinancialAdjustmentsTitle: 'आर्थिक समायोजन खातेवही सारांश',
    mgtTotalAdjustedAmount: 'एकूण मंजूर समायोजन मूल्य',
    mgtThresholdVersionLabel: 'सक्रिय पडताळणी धोरण आवृत्ती',
    mgtReadOnlyNotice: 'रीड-ओन्ली एक्झिक्युटिव्ह व्ह्यू: ऑपरेशनल मंजुरी आणि थ्रेशोल्ड बदल अधिकृत सबडिव्हिजन आणि सिस्टम ॲडमिन भूमिकांपुरते मर्यादित आहेत.',

    admSectionBadge: 'सिस्टम गव्हर्नन्स • OCR रनटाइम आणि आर्थिक नियंत्रणे',
    admSectionTitle: 'स्थानिक OCR आरोग्य, पडताळणी थ्रेशोल्ड धोरण आणि समायोजन मंजुरी',
    admSectionSubtitle: 'स्थानिक Tesseract WASM वर्कर टेलीमेट्रीचे निरीक्षण करा, अनिवार्य ऑडिट कारणांसह वापर विसंगती थ्रेशोल्ड कॉन्फिगर करा आणि आर्थिक समायोजनांवर स्वतंत्र मंजुरी द्या.',
    admOcrEngineTitle: 'स्थानिक Tesseract.js v7 WASM OCR रनटाइम स्थिती',
    admOcrWorkerMode: 'स्थानिक वेब वर्कर + WASM कोअर (शून्य बाह्य क्लाउड अवलंबित्व)',
    admWasmCoreStatus: 'सक्रिय • ऑफलाइन-सक्षम संख्यात्मक व्हाइटलिस्ट',
    admMetadataStripping: 'कॅनव्हास EXIF/GPS मेटाडेटा शुद्धीकरण लागू',
    admMaxUploadLimit: '5 MiB काटेकोर मॅजिक-बाइट स्वाक्षरी संरक्षण',
    admThresholdConfigTitle: 'आवृत्तीबद्ध वापर विसंगती थ्रेशोल्ड धोरण',
    admSpikeMultiplier: 'उच्च वाढ गुणक (× ऐतिहासिक सरासरी)',
    admSpikeMinUnits: 'उच्च वाढ किमान युनिट्स (kWh)',
    admDropRatio: 'अचानक घट गुणोत्तर (सरासरीचा भाग)',
    admDropMinPreviousUnits: 'अचानक घट किमान मागील युनिट्स (kWh)',
    admZeroConsumptionMinPrev: 'शून्य वापर किमान मागील युनिट्स (kWh)',
    admLowOcrConfidencePercent: 'कमी OCR विश्वास अलर्ट थ्रेशोल्ड (%)',
    admRapidResubmissionMinutes: 'जलद पुन्हा सबमिशन कालावधी (मिनिटे)',
    admMaxFutureDriftMinutes: 'कमाल घड्याळ फरक मर्यादा (मिनिटे)',
    admThresholdReasonLabel: 'अनिवार्य धोरण बदल ऑडिट कारण',
    admThresholdReasonPlaceholder: 'वापर पडताळणी थ्रेशोल्ड का अपडेट केले जात आहेत ते स्पष्ट करा...',
    admSaveThresholdsBtn: 'जतन करा आणि धोरण आवृत्ती वाढवा',
    admSavingThresholds: 'धोरण अपडेट होत आहे...',
    admThresholdHistoryTitle: 'थ्रेशोल्ड धोरण आवृत्ती ऑडिट लॉग',
    admFinancialApprovalsTitle: 'स्वतंत्र प्रशासकीय मंजुरी रांग (आर्थिक समायोजन)',
    admApproveAdjustmentBtn: 'समायोजन मंजूर करा',
    admRejectAdjustmentBtn: 'प्रस्ताव नामंजूर करा',
    admApprovalNotePlaceholder: 'अनिवार्य प्रशासकीय मंजुरी किंवा नामंजुरी ऑडिट नोंद प्रविष्ट करा...',
    admSeparationBlockedBadge: 'स्व-मंजुरी अवरोधित (कर्तव्यांचे विभाजन)'
  }
};

export function localizePhase11Status(status: string, lang: LanguageCode): string {
  const dict = METER_PHASE11_TRANSLATIONS[lang] || METER_PHASE11_TRANSLATIONS.en;
  switch (status) {
    case 'DETECTED':
      return dict.statusDetected;
    case 'PENDING_REVIEW':
      return dict.statusPendingReview;
    case 'UNDER_INVESTIGATION':
      return dict.statusUnderInvestigation;
    case 'APPROVED':
      return dict.statusApproved;
    case 'REJECTED':
      return dict.statusRejected;
    case 'REREAD_REQUESTED':
      return dict.statusRereadRequested;
    case 'CORRECTED_THROUGH_ADJUSTMENT':
    case 'ADJUSTED':
      return dict.statusCorrectedThroughAdjustment;
    case 'CLOSED':
      return dict.statusClosed;
    case 'PENDING_APPROVAL':
      return dict.statusPendingApproval;
    case 'APPLIED_TO_LEDGER':
      return lang === 'gu'
        ? 'લેજરમાં લાગુ'
        : lang === 'hi'
          ? 'लेजर में लागू'
          : lang === 'mr'
            ? 'लेजरमध्ये लागू'
            : 'Applied to Ledger';
    case 'CLEAR':
      return dict.statusClear;
    case 'REVIEW':
      return dict.statusReview;
    case 'MATCH':
      return dict.statusMatch;
    case 'DISCREPANCY':
      return dict.statusDiscrepancy;
    default:
      return status;
  }
}

export function localizePhase11Category(category: string, lang: LanguageCode): string {
  const dict = METER_PHASE11_TRANSLATIONS[lang] || METER_PHASE11_TRANSLATIONS.en;
  switch (category) {
    case 'NEGATIVE_OR_ROLLBACK':
    case 'DECREASING_READING':
      return dict.catNegativeOrRollback;
    case 'ZERO_OR_STALLED':
    case 'ZERO_CONSUMPTION':
      return dict.catZeroOrStalled;
    case 'HIGH_SPIKE':
    case 'HIGH_CONSUMPTION':
      return dict.catHighSpike;
    case 'SUDDEN_DROP':
    case 'LOW_CONSUMPTION':
      return dict.catSuddenDrop;
    case 'DUPLICATE_SUBMISSION':
      return dict.catDuplicateSubmission;
    case 'RAPID_RESUBMISSION':
      return dict.catRapidResubmission;
    case 'IDENTITY_MISMATCH':
      return dict.catIdentityMismatch;
    case 'OCR_MANUAL_OVERRIDE':
    case 'MANUAL_OVERRIDE':
      return dict.catOcrManualOverride;
    case 'LOW_OCR_CONFIDENCE':
      return dict.catLowOcrConfidence;
    case 'TARIFF_SLAB_MISMATCH':
    case 'FIXED_CHARGE_MISMATCH':
    case 'FPPPA_MISMATCH':
    case 'ELECTRICITY_DUTY_MISMATCH':
      return dict.catTariffSlabMismatch;
    case 'BILL_DISCREPANCY':
    case 'ARREARS_MISMATCH':
    case 'NET_TOTAL_MISMATCH':
      return dict.catBillDiscrepancy;
    case 'CONSUMPTION_DISPUTE':
      return dict.catConsumptionDispute;
    case 'TARIFF_MISMATCH':
      return dict.catTariffMismatch;
    case 'METER_FAULT_SUSPECTED':
      return dict.catMeterFaultSuspected;
    case 'PAYMENT_NOT_REFLECTED':
    case 'PAYMENT_RECONCILIATION_MISMATCH':
      return dict.catPaymentNotReflected;
    case 'DUPLICATE_BILL':
      return dict.catDuplicateBill;
    case 'OTHER':
      return dict.catOther;
    case 'SLAB_CORRECTION':
      return dict.adjSlabCorrection;
    case 'CREDIT_CONCESSION':
      return dict.adjCreditConcession;
    case 'METER_ERROR_REBATE':
      return dict.adjMeterErrorRebate;
    case 'SUPPLEMENTARY_CHARGE':
      return dict.adjSupplementaryCharge;
    default:
      return category;
  }
}

export function localizePhase11Severity(severity: string, lang: LanguageCode): string {
  const dict = METER_PHASE11_TRANSLATIONS[lang] || METER_PHASE11_TRANSLATIONS.en;
  switch (severity) {
    case 'HIGH':
      return dict.sevHigh;
    case 'REVIEW':
      return dict.sevReview;
    case 'INFO':
      return dict.sevInfo;
    default:
      return severity;
  }
}

export function localizeMeterNotification(
  title: string,
  message: string,
  lang: LanguageCode
): { title: string; message: string } {
  if (lang === 'en') return { title, message };

  let localizedTitle = title;
  let localizedMsg = message;

  const titleMap: Record<string, Record<Exclude<LanguageCode, 'en'>, string>> = {
    'Meter reading submitted': {
      gu: 'મીટર રીડિંગ સબમિટ થયું',
      hi: 'मीटर रीडिंग सबमिट की गई',
      mr: 'मीटर रीडिंग सबमिट केले'
    },
    'Meter reading requires review': {
      gu: 'મીટર રીડિંગને સમીક્ષાની જરૂર છે',
      hi: 'मीटर रीडिंग की समीक्षा आवश्यक है',
      mr: 'मीटर रीडिंगच्या पुनरावलोकनाची आवश्यकता आहे'
    },
    'Anomaly detected on meter reading': {
      gu: 'મીટર રીડિંગ પર વિસંગતતા મળી',
      hi: 'मीटर रीडिंग पर विसंगति का पता चला',
      mr: 'मीटर रीडिंगवर विसंगती आढळली'
    },
    'Meter reading approved': {
      gu: 'મીટર રીડિંગ મંજૂર થયું',
      hi: 'मीटर रीडिंग स्वीकृत हुई',
      mr: 'मीटर रीडिंग मंजूर झाले'
    },
    'Meter reading rejected': {
      gu: 'મીટર રીડિંગ નામંજૂર થયું',
      hi: 'मीटर रीडिंग अस्वीकृत हुई',
      mr: 'मीटर रीडिंग नामंजूर झाले'
    },
    'Re-reading requested': {
      gu: 'ફરીથી રીડિંગની વિનંતી',
      hi: 'पुनः रीडिंग का अनुरोध',
      mr: 'पुन्हा रीडिंगची विनंती'
    },
    'Consumer billing review requested': {
      gu: 'ગ્રાહક બિલ સમીક્ષાની વિનંતી',
      hi: 'उपभोक्ता बिलिंग समीक्षा का अनुरोध',
      mr: 'ग्राहक बिलिंग पुनरावलोकनाची विनंती'
    },
    'Anomaly investigation opened': {
      gu: 'વિસંગતતા તપાસ શરૂ કરવામાં આવી',
      hi: 'विसंगति जांच शुरू की गई',
      mr: 'विसंगती तपास सुरू केला'
    },
    'Meter reading under investigation': {
      gu: 'મીટર રીડિંગ તપાસ હેઠળ છે',
      hi: 'मीटर रीडिंग जांच के अधीन है',
      mr: 'मीटर रीडिंग तपासणीखाली आहे'
    },
    'Anomaly case status updated': {
      gu: 'વિસંગતતા કેસની સ્થિતિ અપડેટ થઈ',
      hi: 'विसंगति मामले की स्थिति अपडेट हुई',
      mr: 'विसंगती प्रकरणाची स्थिती अपडेट झाली'
    },
    'Billing review investigation opened': {
      gu: 'બિલ સમીક્ષા તપાસ શરૂ કરવામાં આવી',
      hi: 'बिलिंग समीक्षा जांच शुरू की गई',
      mr: 'बिलिंग पुनरावलोकन तपास सुरू केला'
    },
    'Billing review under investigation': {
      gu: 'બિલ સમીક્ષા તપાસ હેઠળ છે',
      hi: 'बिलिंग समीक्षा जांच के अधीन है',
      mr: 'बिलिंग पुनरावलोकन तपासणीखाली आहे'
    },
    'Billing review updated': {
      gu: 'બિલ સમીક્ષા અપડેટ થઈ',
      hi: 'बिलिंग समीक्षा अपडेट हुई',
      mr: 'बिलिंग पुनरावलोकन अपडेट झाले'
    },
    'Financial adjustment proposal awaiting approval': {
      gu: 'નાણાકીય સુધારા દરખાસ્ત મંજૂરીની રાહમાં',
      hi: 'वित्तीय समायोजन प्रस्ताव अनुमोदन की प्रतीक्षा में',
      mr: 'आर्थिक समायोजन प्रस्ताव मंजुरीच्या प्रतीक्षेत'
    },
    'Financial adjustment approved': {
      gu: 'નાણાકીય સુધારો મંજૂર થયો',
      hi: 'वित्तीय समायोजन स्वीकृत हुआ',
      mr: 'आर्थिक समायोजन मंजूर झाले'
    },
    'Financial adjustment rejected': {
      gu: 'નાણાકીય સુધારો નામંજૂર થયો',
      hi: 'वित्तीय समायोजन अस्वीकृत हुआ',
      mr: 'आर्थिक समायोजन नामंजूर झाले'
    },
    'Bill adjustment approved': {
      gu: 'બિલ સુધારો મંજૂર થયો',
      hi: 'बिल समायोजन स्वीकृत हुआ',
      mr: 'बिल समायोजन मंजूर झाले'
    },
    'Bill adjustment applied': {
      gu: 'બિલ સુધારો લાગુ કરવામાં આવ્યો',
      hi: 'बिल समायोजन लागू किया गया',
      mr: 'बिल समायोजन लागू केले'
    },
    'Adjustment applied to billing ledger': {
      gu: 'બિલિંગ લેજરમાં સુધારો લાગુ કરવામાં આવ્યો',
      hi: 'बिलिंग लेजर में समायोजन लागू किया गया',
      mr: 'बिलिंग लेजरमध्ये समायोजन लागू केले'
    },
    'Bill adjustment review completed': {
      gu: 'બિલ સુધારા સમીક્ષા પૂર્ણ થઈ',
      hi: 'बिल समायोजन समीक्षा पूर्ण हुई',
      mr: 'बिल समायोजन पुनरावलोकन पूर्ण झाले'
    },
    'Electricity bill issued': {
      gu: 'વીજ બિલ જારી કરવામાં આવ્યું',
      hi: 'बिजली बिल जारी किया गया',
      mr: 'वीज बिल जारी केले गेले'
    }
  };

  if (titleMap[title]) {
    localizedTitle = titleMap[title][lang];
  }

  const subMatch = message.match(/^Reading ([A-Z0-9-]+) is awaiting employee review\.$/);
  if (subMatch) {
    localizedMsg =
      lang === 'gu'
        ? `રીડિંગ ${subMatch[1]} કર્મચારી સમીક્ષાની રાહ જોઈ રહ્યું છે.`
        : lang === 'hi'
          ? `रीडिंग ${subMatch[1]} कर्मचारी समीक्षा की प्रतीक्षा में है।`
          : `रीडिंग ${subMatch[1]} कर्मचारी पुनरावलोकनाच्या प्रतीक्षेत आहे.`;
  }

  const subCnsMatch = message.match(/^Reading ([A-Z0-9-]+) for Connection ([A-Z0-9-]+) has been submitted for verification\.$/);
  if (subCnsMatch) {
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${subCnsMatch[2]} માટે રીડિંગ ${subCnsMatch[1]} ચકાસણી માટે સબમિટ કરવામાં આવ્યું છે.`
        : lang === 'hi'
          ? `कनेक्शन ${subCnsMatch[2]} के लिए रीडिंग ${subCnsMatch[1]} सत्यापन हेतु सबमिट की गई है।`
          : `जोडणी ${subCnsMatch[2]} साठी रीडिंग ${subCnsMatch[1]} पडताळणीसाठी सबमिट केले आहे.`;
  }

  const reqRevMatch = message.match(/^Reading ([A-Z0-9-]+) on Connection ([A-Z0-9-]+) flagged (\d+) anomaly check\(s\) for review\.$/);
  if (reqRevMatch) {
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${reqRevMatch[2]} પર રીડિંગ ${reqRevMatch[1]} માં સમીક્ષા માટે ${reqRevMatch[3]} વિસંગતતા ચકાસણી ચિહ્નિત થઈ છે.`
        : lang === 'hi'
          ? `कनेक्शन ${reqRevMatch[2]} पर रीडिंग ${reqRevMatch[1]} में समीक्षा के लिए ${reqRevMatch[3]} विसंगति जांच चिह्नित की गई।`
          : `जोडणी ${reqRevMatch[2]} वरील रीडिंग ${reqRevMatch[1]} मध्ये पुनरावलोकनासाठी ${reqRevMatch[3]} विसंगती तपासण्या चिन्हांकित केल्या आहेत.`;
  }

  const anoDetCnsMatch = message.match(/^Reading ([A-Z0-9-]+) on Connection ([A-Z0-9-]+) is queued for technical review\.$/);
  if (anoDetCnsMatch) {
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${anoDetCnsMatch[2]} પર રીડિંગ ${anoDetCnsMatch[1]} તકનીકી સમીક્ષા માટે કતારમાં છે.`
        : lang === 'hi'
          ? `कनेक्शन ${anoDetCnsMatch[2]} पर रीडिंग ${anoDetCnsMatch[1]} तकनीकी समीक्षा के लिए कतार में है।`
          : `जोडणी ${anoDetCnsMatch[2]} वरील रीडिंग ${anoDetCnsMatch[1]} तांत्रिक पुनरावलोकनासाठी रांगेत आहे.`;
  }

  const revMatch = message.match(/^Meter reading ([A-Z0-9-]+) was (.+)\.$/);
  if (revMatch) {
    localizedMsg =
      lang === 'gu'
        ? `મીટર રીડિંગ ${revMatch[1]} ની સ્થિતિ: ${revMatch[2]}.`
        : lang === 'hi'
          ? `मीटर रीडिंग ${revMatch[1]} की स्थिति: ${revMatch[2]}।`
          : `मीटर रीडिंग ${revMatch[1]} ची स्थिती: ${revMatch[2]}.`;
  }

  const rereadFldMatch = message.match(/^Field re-verification requested for meter ([A-Z0-9-]+) \(Connection ([A-Z0-9-]+), Reading ([A-Z0-9-]+)\)\.$/);
  if (rereadFldMatch) {
    localizedMsg =
      lang === 'gu'
        ? `મીટર ${rereadFldMatch[1]} (જોડાણ ${rereadFldMatch[2]}, રીડિંગ ${rereadFldMatch[3]}) માટે ફિલ્ડ પુનઃચકાસણીની વિનંતી કરવામાં આવી છે.`
        : lang === 'hi'
          ? `मीटर ${rereadFldMatch[1]} (कनेक्शन ${rereadFldMatch[2]}, रीडिंग ${rereadFldMatch[3]}) के लिए फील्ड पुनः सत्यापन का अनुरोध किया गया है।`
          : `मीटर ${rereadFldMatch[1]} (जोडणी ${rereadFldMatch[2]}, रीडिंग ${rereadFldMatch[3]}) साठी क्षेत्रीय फेरपडताळणीची विनंती केली आहे.`;
  }

  const cbrReqMatch = message.match(/^Review request ([A-Z0-9-]+) filed for Connection ([A-Z0-9-]+), Bill ([A-Z0-9-]+) \((.+)\)\.$/);
  if (cbrReqMatch) {
    const cat = localizePhase11Category(cbrReqMatch[4], lang);
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${cbrReqMatch[2]}, બિલ ${cbrReqMatch[3]} (${cat}) માટે સમીક્ષા વિનંતી ${cbrReqMatch[1]} નોંધાઈ છે.`
        : lang === 'hi'
          ? `कनेक्शन ${cbrReqMatch[2]}, बिल ${cbrReqMatch[3]} (${cat}) के लिए समीक्षा अनुरोध ${cbrReqMatch[1]} दर्ज किया गया।`
          : `जोडणी ${cbrReqMatch[2]}, बिल ${cbrReqMatch[3]} (${cat}) साठी पुनरावलोकन विनंती ${cbrReqMatch[1]} नोंदवली गेली.`;
  }

  const anoInvEmp = message.match(/^Investigation opened for anomaly case ([A-Z0-9-]+) \((.+)\) on Connection ([A-Z0-9-]+)\.$/);
  if (anoInvEmp) {
    const cat = localizePhase11Category(anoInvEmp[2], lang);
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${anoInvEmp[3]} પર વિસંગતતા કેસ ${anoInvEmp[1]} (${cat}) માટે તપાસ શરૂ કરવામાં આવી છે.`
        : lang === 'hi'
          ? `कनेक्शन ${anoInvEmp[3]} पर विसंगति मामला ${anoInvEmp[1]} (${cat}) के लिए जांच शुरू की गई है।`
          : `जोडणी ${anoInvEmp[3]} वरील विसंगती प्रकरण ${anoInvEmp[1]} (${cat}) साठी तपास सुरू केला आहे.`;
  }

  const anoInvCns = message.match(/^Case ([A-Z0-9-]+) for Connection ([A-Z0-9-]+) is currently under technical verification by UGVCL operations\.$/);
  if (anoInvCns) {
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${anoInvCns[2]} માટે કેસ ${anoInvCns[1]} હાલમાં UGVCL ઓપરેશન્સ દ્વારા તકનીકી ચકાસણી હેઠળ છે.`
        : lang === 'hi'
          ? `कनेक्शन ${anoInvCns[2]} के लिए मामला ${anoInvCns[1]} वर्तमान में UGVCL संचालन द्वारा तकनीकी सत्यापन के अधीन है।`
          : `जोडणी ${anoInvCns[2]} साठी प्रकरण ${anoInvCns[1]} सध्या UGVCL ऑपरेशन्सद्वारे तांत्रिक पडताळणीखाली आहे.`;
  }

  const cbrInvEmp = message.match(/^Investigation opened for billing review ([A-Z0-9-]+) on Connection ([A-Z0-9-]+), Bill ([A-Z0-9-]+) \((.+)\)\.$/);
  if (cbrInvEmp) {
    const cat = localizePhase11Category(cbrInvEmp[4], lang);
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${cbrInvEmp[2]}, બિલ ${cbrInvEmp[3]} (${cat}) પર બિલ સમીક્ષા ${cbrInvEmp[1]} માટે તપાસ શરૂ કરવામાં આવી છે.`
        : lang === 'hi'
          ? `कनेक्शन ${cbrInvEmp[2]}, बिल ${cbrInvEmp[3]} (${cat}) पर बिलिंग समीक्षा ${cbrInvEmp[1]} के लिए जांच शुरू की गई है।`
          : `जोडणी ${cbrInvEmp[2]}, बिल ${cbrInvEmp[3]} (${cat}) वरील बिलिंग पुनरावलोकन ${cbrInvEmp[1]} साठी तपास सुरू केला आहे.`;
  }

  const cbrInvCns = message.match(/^Your billing review ([A-Z0-9-]+) for Connection ([A-Z0-9-]+) \(Bill ([A-Z0-9-]+)\) is now under investigation\.$/);
  if (cbrInvCns) {
    localizedMsg =
      lang === 'gu'
        ? `જોડાણ ${cbrInvCns[2]} (બિલ ${cbrInvCns[3]}) માટે તમારી બિલ સમીક્ષા ${cbrInvCns[1]} હવે તપાસ હેઠળ છે.`
        : lang === 'hi'
          ? `कनेक्शन ${cbrInvCns[2]} (बिल ${cbrInvCns[3]}) के लिए आपकी बिलिंग समीक्षा ${cbrInvCns[1]} अब जांच के अधीन है।`
          : `जोडणी ${cbrInvCns[2]} (बिल ${cbrInvCns[3]}) साठी तुमचे बिलिंग पुनरावलोकन ${cbrInvCns[1]} आता तपासणीखाली आहे.`;
  }

  const cbrUpd = message.match(/^Your billing review for Bill ([A-Z0-9-]+) is now (.+)\.$/);
  if (cbrUpd) {
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${cbrUpd[1]} માટે તમારી બિલ સમીક્ષાની સ્થિતિ હવે ${cbrUpd[2]} છે.`
        : lang === 'hi'
          ? `बिल ${cbrUpd[1]} के लिए आपकी बिलिंग समीक्षा की स्थिति अब ${cbrUpd[2]} है।`
          : `बिल ${cbrUpd[1]} साठी तुमच्या बिलिंग पुनरावलोकनाची स्थिती आता ${cbrUpd[2]} आहे.`;
  }

  const adjPropMatch = message.match(/^Proposal ([A-Z0-9-]+) \(₹([0-9.]+)\) for Bill ([A-Z0-9-]+), Connection ([A-Z0-9-]+) requires executive approval\.$/);
  if (adjPropMatch) {
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${adjPropMatch[3]}, જોડાણ ${adjPropMatch[4]} માટે દરખાસ્ત ${adjPropMatch[1]} (₹${adjPropMatch[2]}) ને કાર્યકારી મંજૂરીની જરૂર છે.`
        : lang === 'hi'
          ? `बिल ${adjPropMatch[3]}, कनेक्शन ${adjPropMatch[4]} के लिए प्रस्ताव ${adjPropMatch[1]} (₹${adjPropMatch[2]}) को कार्यकारी अनुमोदन की आवश्यकता है।`
          : `बिल ${adjPropMatch[3]}, जोडणी ${adjPropMatch[4]} साठी प्रस्ताव ${adjPropMatch[1]} (₹${adjPropMatch[2]}) ला कार्यकारी मंजुरी आवश्यक आहे.`;
  }

  const adjRevEmpMatch = message.match(/^Adjustment ([A-Z0-9-]+) for Bill ([A-Z0-9-]+) \(Connection ([A-Z0-9-]+)\) was (approved|rejected)\.$/);
  if (adjRevEmpMatch) {
    const statusWord = localizePhase11Status(adjRevEmpMatch[4].toUpperCase(), lang);
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${adjRevEmpMatch[2]} (જોડાણ ${adjRevEmpMatch[3]}) માટે સુધારો ${adjRevEmpMatch[1]} ${statusWord}.`
        : lang === 'hi'
          ? `बिल ${adjRevEmpMatch[2]} (कनेक्शन ${adjRevEmpMatch[3]}) के लिए समायोजन ${adjRevEmpMatch[1]} ${statusWord}।`
          : `बिल ${adjRevEmpMatch[2]} (जोडणी ${adjRevEmpMatch[3]}) साठी समायोजन ${adjRevEmpMatch[1]} ${statusWord}.`;
  }

  const adjAppQueued = message.match(/^An authorized adjustment of ₹([0-9.]+) for Bill ([A-Z0-9-]+) has been approved and is queued for ledger application\.$/);
  if (adjAppQueued) {
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${adjAppQueued[2]} માટે ₹${adjAppQueued[1]} નો અધિકૃત સુધારો મંજૂર થયો છે અને લેજર લાગુ કરવા માટે કતારમાં છે.`
        : lang === 'hi'
          ? `बिल ${adjAppQueued[2]} के लिए ₹${adjAppQueued[1]} का अधिकृत समायोजन स्वीकृत हो गया है और लेजर में लागू करने हेतु कतार में है।`
          : `बिल ${adjAppQueued[2]} साठी ₹${adjAppQueued[1]} चे अधिकृत समायोजन मंजूर झाले असून लेजरमध्ये लागू करण्यासाठी रांगेत आहे.`;
  }

  const adjApplied = message.match(/^An authorized adjustment of ₹([0-9.]+) was applied to Bill ([A-Z0-9-]+)\. Revised payable amount: ₹([0-9.]+)\.$/);
  if (adjApplied) {
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${adjApplied[2]} પર ₹${adjApplied[1]} નો અધિકૃત સુધારો લાગુ કરવામાં આવ્યો છે. સુધારેલ ચૂકવવાપાત્ર રકમ: ₹${adjApplied[3]}.`
        : lang === 'hi'
          ? `बिल ${adjApplied[2]} पर ₹${adjApplied[1]} का अधिकृत समायोजन लागू किया गया। संशोधित देय राशि: ₹${adjApplied[3]}।`
          : `बिल ${adjApplied[2]} वर ₹${adjApplied[1]} चे अधिकृत समायोजन लागू केले गेले. सुधारित देय रक्कम: ₹${adjApplied[3]}.`;
  }

  const adjLedgerEmp = message.match(/^Adjustment ([A-Z0-9-]+) for Bill ([A-Z0-9-]+) \(Connection ([A-Z0-9-]+)\) has been applied to the official billing ledger\.$/);
  if (adjLedgerEmp) {
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${adjLedgerEmp[2]} (જોડાણ ${adjLedgerEmp[3]}) માટે સુધારો ${adjLedgerEmp[1]} સત્તાવાર બિલિંગ લેજરમાં લાગુ કરવામાં આવ્યો છે.`
        : lang === 'hi'
          ? `बिल ${adjLedgerEmp[2]} (कनेक्शन ${adjLedgerEmp[3]}) के लिए समायोजन ${adjLedgerEmp[1]} आधिकारिक बिलिंग लेजर में लागू किया गया है।`
          : `बिल ${adjLedgerEmp[2]} (जोडणी ${adjLedgerEmp[3]}) साठी समायोजन ${adjLedgerEmp[1]} अधिकृत बिलिंग लेजरमध्ये लागू केले आहे.`;
  }

  const adjRejectedCns = message.match(/^The financial adjustment review for Bill ([A-Z0-9-]+) was completed with no change to the billed amount: ₹([0-9.]+)\.$/);
  if (adjRejectedCns) {
    localizedMsg =
      lang === 'gu'
        ? `બિલ ${adjRejectedCns[1]} માટે નાણાકીય સુધારા સમીક્ષા બિલની રકમમાં કોઈ ફેરફાર વિના પૂર્ણ થઈ છે: ₹${adjRejectedCns[2]}.`
        : lang === 'hi'
          ? `बिल ${adjRejectedCns[1]} के लिए वित्तीय समायोजन समीक्षा बिल राशि में बिना किसी बदलाव के पूर्ण हुई: ₹${adjRejectedCns[2]}।`
          : `बिल ${adjRejectedCns[1]} साठी आर्थिक समायोजन पुनरावलोकन बिलाच्या रकमेत कोणताही बदल न करता पूर्ण झाले: ₹${adjRejectedCns[2]}.`;
  }

  const billIssuedMatch = message.match(/^Bill ([A-Z0-9-]+) for ₹([0-9.]+) was issued from approved reading ([A-Z0-9-]+)\.$/);
  if (billIssuedMatch) {
    localizedMsg =
      lang === 'gu'
        ? `મંજૂર રીડિંગ ${billIssuedMatch[3]} પરથી ₹${billIssuedMatch[2]} નું બિલ ${billIssuedMatch[1]} જારી કરવામાં આવ્યું છે.`
        : lang === 'hi'
          ? `स्वीकृत रीडिंग ${billIssuedMatch[3]} से ₹${billIssuedMatch[2]} का बिल ${billIssuedMatch[1]} जारी किया गया है।`
          : `मंजूर रीडिंग ${billIssuedMatch[3]} वरून ₹${billIssuedMatch[2]} चे बिल ${billIssuedMatch[1]} जारी केले गेले आहे.`;
  }

  return { title: localizedTitle, message: localizedMsg };
}

