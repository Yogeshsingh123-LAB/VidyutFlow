import React from 'react';
import {
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
  UGVCL_CORPORATE_IDENTITY,
} from '../common/UgvclBrandIdentity';
import {
  GeneratedOfficialDocument,
  UgvclBillParticulars,
  BILL_AND_RECEIPT_EXTRA_LABELS,
} from '../../utils/documentEngine';
import { Language } from '../../i18n/types';
import {
  AlertTriangle,
  QrCode as QrIcon,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface UgvclElectricityBillTwoPageProps {
  document: GeneratedOfficialDocument;
  particulars: UgvclBillParticulars;
  language: Language;
  onVerifyQrClick?: () => void;
}

interface TwoPageBillLocaleConfig {
  eBillBannerPrefix: string;
  demoUtilityBadge: string;
  consumerName: string;
  servicePremisesAddress: string;
  consumerNo: string;
  connectionId: string;
  meterNo: string;
  tariffCategory: string;
  sanctionedLoad: string;
  securityDeposit: string;
  feederCode: string;
  poleNo: string;
  billNumber: string;
  billDate: string;
  billingCycleTypeLabel: string;
  billingPeriodDatesLabel: string;
  paymentDueDate: string;
  scanQrTitle: string;
  scanQrSubtitle: string;
  verifyQrBtn: string;
  meterReadingRegister: string;
  cycleDatesPrefix: string;
  classificationPrefix: string;
  colMeterSerial: string;
  colPrevReading: string;
  colCurrReading: string;
  colDifference: string;
  colMultiplier: string;
  colBilledConsumption: string;
  colReadingStatus: string;
  gercSlabBreakdown: string;
  colSlab: string;
  colUnits: string;
  colRate: string;
  colAmount: string;
  slabEnergySum: string;
  itemizedBillStatement: string;
  amountsInInr: string;
  energyChargesRow: string;
  fixedChargesRow: string;
  fpppaRow: string;
  edRow: string;
  meterRentRow: string;
  subtotalRow: string;
  rebateRow: string;
  arrearsRow: string;
  totalCurrentBillRow: string;
  paymentsReceivedRow: string;
  netAmountPayablePrefix: string;
  previousThreePeriodsTitle: string;
  connectionPrefix: string;
  colBillingCycle: string;
  colBilledUnits: string;
  colBilledAmount: string;
  colAmountPaid: string;
  colBalance: string;
  colSettlementStatus: string;
  noPreviousRecordsFound: string;
  tearOffInstruction: string;
  collectionSlipRight: string;
  paymentSlipTitle: string;
  slipConsumerLabel: string;
  slipBillNoLabel: string;
  slipDueDateLabel: string;
  amountPayableLabel: string;
  slipFullyPaidNote: string;
  slipPayBeforeDueNote: string;
  slipPaymentModeLine: string;
  slipChequeRefLine: string;
  slipCashierSignLine: string;
  page1FooterLeft: string;
  page2FooterLeft: string;
  footerHelplinePortal: string;
  reversePage2Badge: string;
  reverseBannerTitle: string;
  gercOrdersBadge: string;
  sec1TariffTitle: string;
  sec1ColCategory: string;
  sec1ColSlabs: string;
  sec1ColRate: string;
  sec1ColFixed: string;
  sec1CatRgp: string;
  sec1SlabFirst50: string;
  sec1SlabNext50: string;
  sec1SlabNext150: string;
  sec1SlabAbove250: string;
  sec1Fixed1Ph25: string;
  sec1Fixed3Ph65: string;
  sec1CatGlp: string;
  sec1SlabFirst200: string;
  sec1SlabRemaining: string;
  sec1Fixed1Ph30: string;
  sec1Fixed3Ph70: string;
  sec1CatNonRgp: string;
  sec1SlabLoad5Kw: string;
  sec1Fixed70Kw: string;
  sec1CatAg: string;
  sec1SlabMetered: string;
  sec1Fixed10Hp: string;
  sec1BiMonthlyPolicyNote: string;
  sec2CalculationTitle: string;
  sec2EcHeading: string;
  sec2EcBody: string;
  sec2BiMonthlyHeading: string;
  sec2BiMonthlyBody: string;
  sec2FpppaHeading: string;
  sec2FpppaBody: string;
  sec2FpppaFormula: string;
  sec2EdHeading: string;
  sec2EdBody: string;
  sec3HelplineTitle: string;
  sec3HelplineSubtitle: string;
  sec4CgrfTitle: string;
  sec4Intro: string;
  sec4ForumLabel: string;
  sec4ForumValue: string;
  sec4AddressLabel: string;
  sec4AddressValue: string;
  sec4PhoneLabel: string;
  sec4EmailLabel: string;
  sec4TimingsLabel: string;
  sec4TimingsValue: string;
  sec4OmbudsmanHeading: string;
  sec4OmbudsmanBody: string;
  sec5EdTitle: string;
  sec5GovtBadge: string;
  sec5ColCategory: string;
  sec5ColRate: string;
  sec5RowResidential: string;
  sec5RowCommercial: string;
  sec5RowIndustrial: string;
  sec5RowReligious: string;
  sec5RowAgri: string;
  sec5ExemptLabel: string;
  sec6TrendTitle: string;
  sec6RecordedHistoryBadge: string;
  sec6CurrentPeriodLabel: string;
  sec6AvgBiMonthlyLabel: string;
  sec6BenchmarkLabel: string;
  sec6NoRecordShort: string;
  sec7DigitalPaymentTitle: string;
  sec7Intro: string;
  sec7Item1Bold: string;
  sec7Item1Text: string;
  sec7Item2Bold: string;
  sec7Item2Text: string;
  sec7Item3Bold: string;
  sec7Item3Text: string;
  sec7Item4Bold: string;
  sec7Item4Text: string;
  sec8SafetyTitle: string;
  sec8Item1Bold: string;
  sec8Item1Text: string;
  sec8Item2Bold: string;
  sec8Item2Text: string;
  sec8Item3Bold: string;
  sec8Item3Text: string;
  sec9DisconnectionTitle: string;
  sec9DisconnectionBody: string;
  sec10DemoDisclosureTitle: string;
}

const TWO_PAGE_BILL_LABELS: Record<Language, TwoPageBillLocaleConfig> = {
  en: {
    eBillBannerPrefix: 'E-ELECTRICITY BILL',
    demoUtilityBadge: 'DEMO UTILITY RECORD',
    consumerName: 'Consumer Name:',
    servicePremisesAddress: 'Service Premises Address:',
    consumerNo: 'Consumer No:',
    connectionId: 'Connection ID:',
    meterNo: 'Meter No:',
    tariffCategory: 'Tariff Category:',
    sanctionedLoad: 'Sanctioned Load:',
    securityDeposit: 'Security Deposit:',
    feederCode: 'Feeder Code:',
    poleNo: 'Pole No:',
    billNumber: 'Bill Number:',
    billDate: 'Bill Date:',
    billingCycleTypeLabel: 'Billing Cycle Mode:',
    billingPeriodDatesLabel: 'Billing Period (Start – End):',
    paymentDueDate: 'Payment Due Date:',
    scanQrTitle: 'Scan QR Code',
    scanQrSubtitle: 'For Online Bill Verification, Digital Payment & Self-Service Portal Access.',
    verifyQrBtn: 'Verify QR Payload',
    meterReadingRegister: 'METER READING & CONSUMPTION REGISTER',
    cycleDatesPrefix: 'Period:',
    classificationPrefix: 'Classification:',
    colMeterSerial: 'Meter Serial No',
    colPrevReading: 'Previous Reading',
    colCurrReading: 'Current Reading',
    colDifference: 'Difference (Units)',
    colMultiplier: 'Multiplier (MF)',
    colBilledConsumption: 'Billed Consumption',
    colReadingStatus: 'Reading Status',
    gercSlabBreakdown: 'GERC TIER SLAB BREAKDOWN',
    colSlab: 'Consumption Slab',
    colUnits: 'Units',
    colRate: 'Rate (₹)',
    colAmount: 'Amount (₹)',
    slabEnergySum: 'Slab Energy Sum:',
    itemizedBillStatement: 'ITEMIZED BILL STATEMENT',
    amountsInInr: 'Amounts in INR (₹)',
    energyChargesRow: '1. Energy Charges',
    fixedChargesRow: '2. Fixed Charges',
    fpppaRow: '3. Fuel Price Adj. (FPPPA @ ₹1.20/unit)',
    edRow: '4. Electricity Duty (Govt. Ed Chg @ 15%)',
    meterRentRow: '5. Meter Rent / Service Line Charges',
    subtotalRow: '6. Subtotal Current Bill Charges',
    rebateRow: '7. Govt. Subsidy / Solar Generation Rebate',
    arrearsRow: '8. Past Arrears / Unsettled Dues',
    totalCurrentBillRow: '9. TOTAL CURRENT BILL AMOUNT',
    paymentsReceivedRow: '10. Payments Received & Reconciled',
    netAmountPayablePrefix: 'NET AMOUNT PAYABLE ON OR BEFORE',
    previousThreePeriodsTitle: 'PREVIOUS THREE BILLING PERIODS & PAYMENT RECONCILIATION',
    connectionPrefix: 'Connection:',
    colBillingCycle: 'Billing Cycle',
    colBilledUnits: 'Billed Units (kWh)',
    colBilledAmount: 'Billed Amount (₹)',
    colAmountPaid: 'Amount Paid (₹)',
    colBalance: 'Balance (₹)',
    colSettlementStatus: 'Settlement Status',
    noPreviousRecordsFound: 'No previous billing records found for this service connection.',
    tearOffInstruction: '✄ TEAR OFF HERE — PAYMENT SLIP FOR CASH COUNTER / BANK COLLECTION USE ONLY',
    collectionSlipRight: 'UGVCL COLLECTION SLIP',
    paymentSlipTitle: 'UGVCL Payment Slip',
    slipConsumerLabel: 'Consumer:',
    slipBillNoLabel: 'Bill No:',
    slipDueDateLabel: 'Due Date:',
    amountPayableLabel: 'Amount Payable',
    slipFullyPaidNote: 'Fully Paid & Reconciled',
    slipPayBeforeDueNote: 'Pay on or before Due Date',
    slipPaymentModeLine: 'Payment Mode: [ ] Cash [ ] Cheque [ ] Digital',
    slipChequeRefLine: 'Cheque / Ref No: ____________________',
    slipCashierSignLine: 'Cashier Signature & Seal: ____________________',
    page1FooterLeft: 'Page 1 of 2 (Front Side)',
    page2FooterLeft: 'Page 2 of 2 (Reverse Side)',
    footerHelplinePortal: 'Helpline: 1912 | UGVCL Web Portal: www.ugvcl.com',
    reversePage2Badge: 'PAGE 2 OF 2 (A4 REVERSE)',
    reverseBannerTitle: 'STATUTORY TARIFF SCHEDULES, CALCULATION PRINCIPLES & CONSUMER DIRECTIVES',
    gercOrdersBadge: 'GERC APPROVED TARIFF ORDERS',
    sec1TariffTitle: '1. GERC APPROVED TARIFF SCHEDULE',
    sec1ColCategory: 'Category',
    sec1ColSlabs: 'Consumption Slabs',
    sec1ColRate: 'Rate (₹/kWh)',
    sec1ColFixed: 'Fixed Charges (₹)',
    sec1CatRgp: 'RGP (Residential)',
    sec1SlabFirst50: 'First 50 Units (Bi-Mo: 0-100)',
    sec1SlabNext50: 'Next 50 Units (Bi-Mo: 101-200)',
    sec1SlabNext150: 'Next 150 Units (Bi-Mo: 201-500)',
    sec1SlabAbove250: 'Above 250 Units (Bi-Mo: >500)',
    sec1Fixed1Ph25: '1-Phase: ₹25.00/mo',
    sec1Fixed3Ph65: '3-Phase: ₹65.00/mo',
    sec1CatGlp: 'GLP (General Lighting)',
    sec1SlabFirst200: 'First 200 Units',
    sec1SlabRemaining: 'Remaining Units',
    sec1Fixed1Ph30: '1-Phase: ₹30.00/mo',
    sec1Fixed3Ph70: '3-Phase: ₹70.00/mo',
    sec1CatNonRgp: 'Non-RGP (Commercial)',
    sec1SlabLoad5Kw: 'Connected Load ≤ 5kW',
    sec1Fixed70Kw: '₹70.00/kW/mo',
    sec1CatAg: 'LTP-AG (Agricultural)',
    sec1SlabMetered: 'Metered Consumption',
    sec1Fixed10Hp: '₹10.00/HP/mo',
    sec1BiMonthlyPolicyNote: 'Bi-Monthly Policy (DOUBLE_SLAB_AND_FIXED): 2-month cycle scales slab unit limits (2x) and fixed charges (2 months).',
    sec2CalculationTitle: '2. BILL CALCULATION PRINCIPLES & STATUTORY FORMULAS',
    sec2EcHeading: '• Energy Charges (EC):',
    sec2EcBody: 'Computed through GERC slab rates against net consumption units recorded by smart meter register.',
    sec2BiMonthlyHeading: '• Bi-Monthly Cycle Rule:',
    sec2BiMonthlyBody: 'For 2-month bi-monthly bills, tariff slab unit blocks and monthly fixed charges are applied for 2 billing months per configured policy.',
    sec2FpppaHeading: '• Fuel Price Adjustment (FPPPA):',
    sec2FpppaBody: 'Determined per GERC quarterly formula:',
    sec2FpppaFormula: 'FPPPA (₹) = Billed Units × Approved Fuel Surcharge Rate (Current: ₹1.20/kWh)',
    sec2EdHeading: '• Electricity Duty (ED):',
    sec2EdBody: 'Levied per Gujarat Electricity Duty Act, 1958 at prescribed percentage on gross energy consumption charges.',
    sec3HelplineTitle: 'UGVCL 24x7 CENTRALIZED HELPLINE',
    sec3HelplineSubtitle: 'Toll-Free Outage Reporting, Billing Enquiries & Emergency Assistance',
    sec4CgrfTitle: '3. CONSUMER GRIEVANCE REDRESSAL FORUM (CGRF)',
    sec4Intro: 'Consumers aggrieved by billing disputes or service deficiencies may approach the CGRF constituted under Section 42(5) of the Electricity Act, 2003:',
    sec4ForumLabel: 'Forum:',
    sec4ForumValue: 'Consumer Grievance Redressal Forum, UGVCL',
    sec4AddressLabel: 'Address:',
    sec4AddressValue: 'Corporate Office, Visnagar Road, Mehsana - 384001',
    sec4PhoneLabel: 'Phone:',
    sec4EmailLabel: 'Email:',
    sec4TimingsLabel: 'Timings:',
    sec4TimingsValue: '10:30 AM to 5:30 PM (All Working Days)',
    sec4OmbudsmanHeading: 'Electricity Ombudsman:',
    sec4OmbudsmanBody: 'If grievance is not redressed within 60 days by CGRF, consumer may file representation with the Electricity Ombudsman, Barrack No. 3, Polytechnic Compound, Ambawadi, Ahmedabad - 380015 under Section 42(6) of Electricity Act, 2003.',
    sec5EdTitle: '4. GOVERNMENT ELECTRICITY DUTY (ED)',
    sec5GovtBadge: 'Govt. of Gujarat',
    sec5ColCategory: 'Consumer Category',
    sec5ColRate: 'Duty Rate (%)',
    sec5RowResidential: 'Residential & Educational Premises',
    sec5RowCommercial: 'Commercial Establishments & Offices',
    sec5RowIndustrial: 'Industrial Units (High & Low Tension)',
    sec5RowReligious: 'Religious Places & Hostels',
    sec5RowAgri: 'Agricultural Connections & Rural Water',
    sec5ExemptLabel: 'EXEMPT',
    sec6TrendTitle: '5. SIX BI-MONTHLY PERIOD CONSUMPTION COMPARISON CHART (kWh)',
    sec6RecordedHistoryBadge: '6 Bi-Monthly Periods (2 Bars / Period)',
    sec6CurrentPeriodLabel: 'Current Period:',
    sec6AvgBiMonthlyLabel: 'Avg Recorded (2-Mo):',
    sec6BenchmarkLabel: '2-Mo Benchmark:',
    sec6NoRecordShort: 'N/A',
    sec7DigitalPaymentTitle: '6. APPROVED DIGITAL PAYMENT MODES & CHANNELS',
    sec7Intro: 'Pay bills 24x7 without transaction charges through:',
    sec7Item1Bold: 'BBPS & UPI:',
    sec7Item1Text: 'Any BHIM/UPI App scanning bill QR code.',
    sec7Item2Bold: 'UGVCL Web Portal:',
    sec7Item2Text: 'Instant payment via net banking / debit cards.',
    sec7Item3Bold: 'RTGS / NEFT:',
    sec7Item3Text: 'Virtual Account transfer for commercial / industrial consumers.',
    sec7Item4Bold: 'Cash Counters:',
    sec7Item4Text: 'Authorized AnyTime Payment (ATP) kiosks at Sub-Division offices.',
    sec8SafetyTitle: '7. ELECTRICAL SAFETY & CONSERVATION DIRECTIVES',
    sec8Item1Bold: '• RCCB / ELCB Mandate:',
    sec8Item1Text: 'Install 30mA Residual Current Device to prevent fatal electric shocks and electrical fire hazards.',
    sec8Item2Bold: '• Solar Rooftop Scheme:',
    sec8Item2Text: 'Avail PM Surya Ghar Muft Bijli Yojana subsidies up to ₹78,000 for residential rooftop solar generation.',
    sec8Item3Bold: '• Energy Efficiency:',
    sec8Item3Text: 'Use BEE 5-Star rated inverter air conditioners and LED luminaires to save up to 40% on consumption.',
    sec9DisconnectionTitle: 'STATUTORY DISCONNECTION NOTICE — SECTION 56(1) ELECTRICITY ACT, 2003',
    sec9DisconnectionBody: 'Notice is hereby given that if the amount of this bill is not paid on or before the due date, the supply of electricity to the premises is liable to be disconnected after the expiry of 15 clear days notice as stipulated under Section 56(1) of the Electricity Act, 2003. Reconnection will be made only upon full settlement of dues, Delayed Payment Charges (DPC @ 1.25%/month), and applicable reconnection fees.',
    sec10DemoDisclosureTitle: 'DEMO AUTHENTICITY & DATA TRANSPARENCY DISCLOSURE',
  },
  gu: {
    eBillBannerPrefix: 'ઈ-વીજળી બિલ (E-ELECTRICITY BILL)',
    demoUtilityBadge: 'ડેમો યુટિલિટી રેકોર્ડ (DEMO)',
    consumerName: 'ગ્રાહકનું નામ (Consumer Name):',
    servicePremisesAddress: 'વીજ જોડાણનું સરનામું (Address):',
    consumerNo: 'ગ્રાહક નંબર (Consumer No):',
    connectionId: 'જોડાણ ID (Connection ID):',
    meterNo: 'મીટર નંબર (Meter No):',
    tariffCategory: 'ટેરિફ શ્રેણી (Tariff):',
    sanctionedLoad: 'મંજૂર ભાર (Sanctioned Load):',
    securityDeposit: 'સિક્યોરિટી ડિપોઝિટ (S.D.):',
    feederCode: 'ફીડર કોડ (Feeder Code):',
    poleNo: 'પોલ નંબર (Pole No):',
    billNumber: 'બિલ નંબર (Bill No):',
    billDate: 'બિલ તારીખ (Bill Date):',
    billingCycleTypeLabel: 'બિલિંગ ગાળાનો પ્રકાર:',
    billingPeriodDatesLabel: 'બિલિંગ સમયગાળો (પ્રારંભ – અંત):',
    paymentDueDate: 'ચુકવણીની છેલ્લી તારીખ (Due Date):',
    scanQrTitle: 'QR કોડ સ્કેન કરો (Scan QR)',
    scanQrSubtitle: 'ઓનલાઇન બિલ ચકાસણી અને ડિજિટલ ચુકવણી માટે સ્કેન કરો.',
    verifyQrBtn: 'QR ચકાસણી કરો',
    meterReadingRegister: 'મીટર રીડિંગ અને વપરાશ રજિસ્ટર (METER READING REGISTER)',
    cycleDatesPrefix: 'સમયગાળો:',
    classificationPrefix: 'વર્ગીકરણ:',
    colMeterSerial: 'મીટર નંબર',
    colPrevReading: 'છેલ્લું રીડિંગ',
    colCurrReading: 'હાલનું રીડિંગ',
    colDifference: 'તફાવત (યુનિટ)',
    colMultiplier: 'ગુણાંક (MF)',
    colBilledConsumption: 'બિલ કરેલ યુનિટ',
    colReadingStatus: 'રીડિંગ સ્થિતિ',
    gercSlabBreakdown: 'GERC ટેરિફ સ્લેબ વિગત (SLAB BREAKDOWN)',
    colSlab: 'વપરાશ સ્લેબ',
    colUnits: 'યુનિટ',
    colRate: 'દર (₹)',
    colAmount: 'રકમ (₹)',
    slabEnergySum: 'કુલ સ્લેબ એનર્જી રકમ:',
    itemizedBillStatement: 'બિલની વિગતવાર ગણતરી (ITEMIZED BILL STATEMENT)',
    amountsInInr: 'રકમ રૂપિયામાં (₹)',
    energyChargesRow: '1. એનર્જી ચાર્જ (Energy Charges)',
    fixedChargesRow: '2. ફિક્સ ચાર્જ (Fixed Charges)',
    fpppaRow: '3. ફ્યુઅલ સરચાર્જ (FPPPA @ ₹1.20/યુનિટ)',
    edRow: '4. સરકારી વીજળી શુલ્ક (Electricity Duty @ 15%)',
    meterRentRow: '5. મીટર ભાડું / સર્વિસ ચાર્જ',
    subtotalRow: '6. ચાલુ બિલનો પેટા સરવાળો',
    rebateRow: '7. સરકારી સબસિડી / સોલાર રિબેટ',
    arrearsRow: '8. અગાઉની બાકી રકમ (Arrears)',
    totalCurrentBillRow: '9. કુલ ચાલુ બિલ રકમ (TOTAL BILL)',
    paymentsReceivedRow: '10. જમા થયેલ ચુકવણી (Paid Amount)',
    netAmountPayablePrefix: 'ભરવાપાત્ર ચોખ્ખી રકમ (DUE DATE):',
    previousThreePeriodsTitle: 'છેલ્લા ત્રણ બિલિંગ ગાળાની વિગત (PREVIOUS THREE BILLING PERIODS)',
    connectionPrefix: 'ગ્રાહક નં:',
    colBillingCycle: 'બિલ ગાળો',
    colBilledUnits: 'યુનિટ (kWh)',
    colBilledAmount: 'બિલ રકમ (₹)',
    colAmountPaid: 'ચૂકવેલ રકમ (₹)',
    colBalance: 'બાકી રકમ (₹)',
    colSettlementStatus: 'સ્થિતિ',
    noPreviousRecordsFound: 'આ વીજ જોડાણ માટે અગાઉના કોઈ બિલ રેકોર્ડ ઉપલબ્ધ નથી.',
    tearOffInstruction: '✄ અહીંથી કાપો — કેશ કાઉન્ટર / બેંક કલેક્શન સ્લિપ (FOR OFFICE USE ONLY)',
    collectionSlipRight: 'UGVCL ચુકવણી સ્લિપ',
    paymentSlipTitle: 'UGVCL ચુકવણી સ્લિપ',
    slipConsumerLabel: 'ગ્રાહક નં:',
    slipBillNoLabel: 'બિલ નં:',
    slipDueDateLabel: 'છેલ્લી તારીખ:',
    amountPayableLabel: 'ભરવાપાત્ર રકમ',
    slipFullyPaidNote: 'સંપૂર્ણ ચૂકવાયેલ અને હિસાબ પૂર્ણ',
    slipPayBeforeDueNote: 'છેલ્લી તારીખ પહેલાં ભરવા વિનંતી',
    slipPaymentModeLine: 'ચુકવણી માધ્યમ: [ ] રોકડ [ ] ચેક [ ] ડિજિટલ',
    slipChequeRefLine: 'ચેક / રેફરન્સ નં: ____________________',
    slipCashierSignLine: 'કેશિયરની સહી અને સિક્કો: ____________________',
    page1FooterLeft: 'પૃષ્ઠ 1 / 2 (આગળનો ભાગ)',
    page2FooterLeft: 'પૃષ્ઠ 2 / 2 (પાછળનો ભાગ)',
    footerHelplinePortal: 'હેલ્પલાઇન: 1912 | UGVCL વેબ પોર્ટલ: www.ugvcl.com',
    reversePage2Badge: 'પૃષ્ઠ 2 / 2 (A4 પાછળનો ભાગ)',
    reverseBannerTitle: 'વૈધાનિક ટેરિફ દર, બિલ ગણતરીના નિયમો અને ગ્રાહક માર્ગદર્શિકા (PAGE 2 REVERSE)',
    gercOrdersBadge: 'GERC માન્ય ટેરિફ આદેશો',
    sec1TariffTitle: '1. GERC માન્ય ટેરિફ દર પત્રક (TARIFF SCHEDULE)',
    sec1ColCategory: 'શ્રેણી',
    sec1ColSlabs: 'વપરાશ સ્લેબ (યુનિટ)',
    sec1ColRate: 'દર (₹/kWh)',
    sec1ColFixed: 'ફિક્સ ચાર્જ (₹)',
    sec1CatRgp: 'RGP (રહેણાંક)',
    sec1SlabFirst50: 'પ્રથમ 50 યુનિટ (દ્વિ-માસિક: 0-100)',
    sec1SlabNext50: 'બાદના 50 યુનિટ (દ્વિ-માસિક: 101-200)',
    sec1SlabNext150: 'બાદના 150 યુનિટ (દ્વિ-માસિક: 201-500)',
    sec1SlabAbove250: '250 યુનિટથી વધુ (દ્વિ-માસિક: >500)',
    sec1Fixed1Ph25: '1-ફેઝ: ₹25.00/માસ',
    sec1Fixed3Ph65: '3-ફેઝ: ₹65.00/માસ',
    sec1CatGlp: 'GLP (સામાન્ય લાઇટિંગ)',
    sec1SlabFirst200: 'પ્રથમ 200 યુનિટ',
    sec1SlabRemaining: 'બાકીના યુનિટ',
    sec1Fixed1Ph30: '1-ફેઝ: ₹30.00/માસ',
    sec1Fixed3Ph70: '3-ફેઝ: ₹70.00/માસ',
    sec1CatNonRgp: 'Non-RGP (કોમર્શિયલ)',
    sec1SlabLoad5Kw: 'મંજૂર ભાર ≤ 5kW',
    sec1Fixed70Kw: '₹70.00/kW/માસ',
    sec1CatAg: 'LTP-AG (ખેતીવાડી)',
    sec1SlabMetered: 'મીટર આધારિત વપરાશ',
    sec1Fixed10Hp: '₹10.00/HP/માસ',
    sec1BiMonthlyPolicyNote: 'દ્વિ-માસિક નિયમ (DOUBLE_SLAB_AND_FIXED): 2-માસના બિલિંગમાં સ્લેબ યુનિટ મર્યાદા (2x) અને ફિક્સ ચાર્જ 2 માસ મુજબ ગણાય છે.',
    sec2CalculationTitle: '2. બિલ ગણતરીના સિદ્ધાંતો અને સૂત્રો',
    sec2EcHeading: '• એનર્જી ચાર્જ (EC):',
    sec2EcBody: 'સ્માર્ટ મીટર રજિસ્ટર દ્વારા નોંધાયેલા ચોખ્ખા વપરાશ યુનિટ પર GERC માન્ય સ્લેબ દર મુજબ ગણતરી.',
    sec2BiMonthlyHeading: '• દ્વિ-માસિક (2-માસ) બિલિંગ નિયમ:',
    sec2BiMonthlyBody: 'દ્વિ-માસિક બિલ માટે ટેરિફ સ્લેબ બ્લોક અને માસિક ફિક્સ ચાર્જ નિર્ધારિત પોલિસી મુજબ 2 બિલિંગ માસ માટે લાગુ પડે છે.',
    sec2FpppaHeading: '• ફ્યુઅલ પ્રાઇસ એડજસ્ટમેન્ટ (FPPPA):',
    sec2FpppaBody: 'GERC ત્રિમાસિક સૂત્ર મુજબ ગણતરી:',
    sec2FpppaFormula: 'FPPPA (₹) = બિલ યુનિટ × માન્ય ફ્યુઅલ સરચાર્જ દર (હાલનો દર: ₹1.20/kWh)',
    sec2EdHeading: '• વીજળી શુલ્ક (Electricity Duty - ED):',
    sec2EdBody: 'ગુજરાત વીજળી શુલ્ક અધિનિયમ, 1958 હેઠળ કુલ વપરાશ ચાર્જ પર નિર્ધારિત ટકાવારી મુજબ વસૂલવામાં આવે છે.',
    sec3HelplineTitle: 'UGVCL 24x7 ગ્રાહક સહાયતા હેલ્પલાઇન',
    sec3HelplineSubtitle: 'વીજ પુરવઠા ફરિયાદ, બિલ માહિતી અને તાત્કાલિક સહાય માટે ટોલ-ફ્રી નંબર',
    sec4CgrfTitle: '3. ગ્રાહક ફરિયાદ નિવારણ ફોરમ (CGRF) અને લોકપાલ',
    sec4Intro: 'બિલિંગ વિવાદ અથવા સેવા સંબંધિત ફરિયાદ માટે ગ્રાહકો વીજ અધિનિયમ, 2003 ની કલમ 42(5) હેઠળ રચાયેલ CGRF નો સંપર્ક કરી શકે છે:',
    sec4ForumLabel: 'ફોરમ:',
    sec4ForumValue: 'ગ્રાહક ફરિયાદ નિવારણ ફોરમ, UGVCL',
    sec4AddressLabel: 'સરનામું:',
    sec4AddressValue: 'કોર્પોરેટ ઓફિસ, વિસનગર રોડ, મહેસાણા - 384001',
    sec4PhoneLabel: 'ફોન:',
    sec4EmailLabel: 'ઈમેલ:',
    sec4TimingsLabel: 'સમય:',
    sec4TimingsValue: 'સવારે 10:30 થી સાંજે 5:30 (તમામ કામકાજના દિવસો)',
    sec4OmbudsmanHeading: 'વીજ લોકપાલ (Electricity Ombudsman):',
    sec4OmbudsmanBody: 'જો CGRF દ્વારા 60 દિવસમાં ફરિયાદનું નિવારણ ન થાય, તો ગ્રાહક વીજ અધિનિયમ, 2003 ની કલમ 42(6) હેઠળ વીજ લોકપાલ, બેરેક નં. 3, પોલિટેકનિક કમ્પાઉન્ડ, આંબાવાડી, અમદાવાદ - 380015 સમક્ષ રજૂઆત કરી શકે છે.',
    sec5EdTitle: '4. ગુજરાત સરકાર વીજળી શુલ્ક (ELECTRICITY DUTY)',
    sec5GovtBadge: 'ગુજરાત સરકાર',
    sec5ColCategory: 'ગ્રાહક શ્રેણી',
    sec5ColRate: 'શુલ્ક દર (%)',
    sec5RowResidential: 'રહેણાંક અને શૈક્ષણિક પરિસર',
    sec5RowCommercial: 'કોમર્શિયલ સંસ્થાઓ અને ઓફિસો',
    sec5RowIndustrial: 'ઔદ્યોગિક એકમો (HT / LT)',
    sec5RowReligious: 'ધાર્મિક સ્થળો અને હોસ્ટેલ',
    sec5RowAgri: 'ખેતીવાડી જોડાણ અને ગ્રામીણ પાણી પુરવઠો',
    sec5ExemptLabel: 'મુક્તિ (EXEMPT)',
    sec6TrendTitle: '5. છ દ્વિ-માસિક ગાળાનો વીજ વપરાશ તુલનાત્મક ચાર્ટ (kWh)',
    sec6RecordedHistoryBadge: '6 દ્વિ-માસિક ગાળા (પ્રતિ ગાળા 2 બાર)',
    sec6CurrentPeriodLabel: 'ચાલુ ગાળો:',
    sec6AvgBiMonthlyLabel: 'સરેરાશ (2-માસ):',
    sec6BenchmarkLabel: '2-માસ સંદર્ભ:',
    sec6NoRecordShort: 'ઉપલબ્ધ નથી',
    sec7DigitalPaymentTitle: '6. અધિકૃત ડિજિટલ ચુકવણી માધ્યમો',
    sec7Intro: 'કોઈપણ વધારાના ચાર્જ વિના 24x7 ઓનલાઇન બિલ ભરવાના માધ્યમો:',
    sec7Item1Bold: 'BBPS અને UPI:',
    sec7Item1Text: 'બિલ પરનો QR કોડ કોઈપણ BHIM/UPI એપથી સ્કેન કરો.',
    sec7Item2Bold: 'UGVCL વેબ પોર્ટલ:',
    sec7Item2Text: 'નેટ બેંકિંગ અથવા ડેબિટ કાર્ડ દ્વારા ત્વરિત ચુકવણી.',
    sec7Item3Bold: 'RTGS / NEFT:',
    sec7Item3Text: 'કોમર્શિયલ અને ઔદ્યોગિક ગ્રાહકો માટે વર્ચ્યુઅલ એકાઉન્ટ ટ્રાન્સફર.',
    sec7Item4Bold: 'કેશ કાઉન્ટર:',
    sec7Item4Text: 'સબ-ડિવિઝન ઓફિસ ખાતે અધિકૃત ATP કિઓસ્ક અને કેશ વિન્ડો.',
    sec8SafetyTitle: '7. વીજ સલામતી અને ઊર્જા બચત સૂચનાઓ',
    sec8Item1Bold: '• RCCB / ELCB ફરજિયાત:',
    sec8Item1Text: 'વીજ આંચકા અને શોર્ટ સર્કિટથી રક્ષણ માટે 30mA RCCB/ELCB અવશ્ય લગાવો.',
    sec8Item2Bold: '• સોલાર રૂફટોપ યોજના:',
    sec8Item2Text: 'પીએમ સૂર્ય ઘર મફત વીજળી યોજના હેઠળ રહેણાંક સોલાર પર ₹78,000 સુધીની સબસિડી મેળવો.',
    sec8Item3Bold: '• ઊર્જા કાર્યક્ષમતા:',
    sec8Item3Text: 'BEE 5-સ્ટાર રેટેડ ઇન્વર્ટર એસી અને LED ઉપકરણો વાપરી વીજ વપરાશમાં 40% સુધી બચત કરો.',
    sec9DisconnectionTitle: 'વીજ અધિનિયમ ૨૦૦૩ ની કલમ ૫૬(૧) હેઠળ કનેક્શન કાપવાની વૈધાનિક નોટિસ',
    sec9DisconnectionBody: 'આથી નોટિસ આપવામાં આવે છે કે જો આ બિલની રકમ નિર્ધારિત છેલ્લી તારીખ સુધીમાં ભરવામાં નહીં આવે, તો વીજ અધિનિયમ, 2003 ની કલમ 56(1) મુજબ 15 દિવસની નોટિસ બાદ પરિસરનો વીજ પુરવઠો કાપી નાખવામાં આવશે. બાકી રકમ, વિલંબિત ચુકવણી ચાર્જ (DPC @ 1.25%/માસ) અને પુનઃજોડાણ ફી ભર્યા બાદ જ વીજ પુરવઠો પુનઃસ્થાપિત કરવામાં આવશે.',
    sec10DemoDisclosureTitle: 'ડેમો (DEMO) પારદર્શિતા અને પ્રમાણિકતા નોંધ',
  },
  hi: {
    eBillBannerPrefix: 'ई-विद्युत बिल (E-ELECTRICITY BILL)',
    demoUtilityBadge: 'डेमो रिकॉर्ड (DEMO)',
    consumerName: 'उपभोक्ता का नाम (Consumer Name):',
    servicePremisesAddress: 'सेवा परिसर का पता (Address):',
    consumerNo: 'उपभोक्ता संख्या (Consumer No):',
    connectionId: 'कनेक्शन ID:',
    meterNo: 'मीटर संख्या (Meter No):',
    tariffCategory: 'टैरिफ श्रेणी (Tariff):',
    sanctionedLoad: 'स्वीकृत भार (Sanctioned Load):',
    securityDeposit: 'सुरक्षा जमा (Security Deposit):',
    feederCode: 'फीडर कोड (Feeder Code):',
    poleNo: 'पोल संख्या (Pole No):',
    billNumber: 'बिल संख्या (Bill No):',
    billDate: 'बिल तिथि (Bill Date):',
    billingCycleTypeLabel: 'बिलिंग चक्र प्रकार:',
    billingPeriodDatesLabel: 'बिलिंग अवधि (प्रारंभ – अंत):',
    paymentDueDate: 'भुगतान देय तिथि (Due Date):',
    scanQrTitle: 'QR कोड स्कैन करें',
    scanQrSubtitle: 'ऑनलाइन बिल सत्यापन और डिजिटल भुगतान हेतु स्कैन करें।',
    verifyQrBtn: 'QR सत्यापित करें',
    meterReadingRegister: 'मीटर रीडिंग एवं उपभोग रजिस्टर (METER READING REGISTER)',
    cycleDatesPrefix: 'अवधि:',
    classificationPrefix: 'वर्गीकरण:',
    colMeterSerial: 'मीटर क्रम संख्या',
    colPrevReading: 'पिछली रीडिंग',
    colCurrReading: 'वर्तमान रीडिंग',
    colDifference: 'अंतर (यूनिट)',
    colMultiplier: 'गुणांक (MF)',
    colBilledConsumption: 'बिल योग्य खपत',
    colReadingStatus: 'रीडिंग स्थिति',
    gercSlabBreakdown: 'GERC टैरिफ स्लैब विवरण (SLAB BREAKDOWN)',
    colSlab: 'खपत स्लैब',
    colUnits: 'यूनिट',
    colRate: 'दर (₹)',
    colAmount: 'राशि (₹)',
    slabEnergySum: 'कुल स्लैब ऊर्जा राशि:',
    itemizedBillStatement: 'मदवार बिल विवरण (ITEMIZED BILL STATEMENT)',
    amountsInInr: 'राशि भारतीय रुपये में (₹)',
    energyChargesRow: '1. ऊर्जा शुल्क (Energy Charges)',
    fixedChargesRow: '2. स्थायी शुल्क (Fixed Charges)',
    fpppaRow: '3. ईंधन अधिभार (FPPPA @ ₹1.20/यूनिट)',
    edRow: '4. विद्युत शुल्क (Electricity Duty @ 15%)',
    meterRentRow: '5. मीटर किराया / सर्विस लाइन शुल्क',
    subtotalRow: '6. वर्तमान बिल उप-योग',
    rebateRow: '7. सरकारी सब्सिडी / सोलर छूट',
    arrearsRow: '8. पिछला बकाया (Arrears)',
    totalCurrentBillRow: '9. कुल वर्तमान बिल राशि (TOTAL BILL)',
    paymentsReceivedRow: '10. प्राप्त एवं समायोजित भुगतान',
    netAmountPayablePrefix: 'देय तिथि तक कुल देय राशि:',
    previousThreePeriodsTitle: 'पिछले तीन बिलिंग चक्रों का विवरण (PREVIOUS THREE BILLING PERIODS)',
    connectionPrefix: 'उपभोक्ता क्र:',
    colBillingCycle: 'बिलिंग चक्र',
    colBilledUnits: 'यूनिट (kWh)',
    colBilledAmount: 'बिल राशि (₹)',
    colAmountPaid: 'भुगतान राशि (₹)',
    colBalance: 'शेष राशि (₹)',
    colSettlementStatus: 'स्थिति',
    noPreviousRecordsFound: 'इस सेवा कनेक्शन के लिए कोई पिछला बिल रिकॉर्ड उपलब्ध नहीं है।',
    tearOffInstruction: '✄ यहाँ से फाड़ें — कैश काउंटर / बैंक संग्रहण पर्ची (FOR OFFICE USE ONLY)',
    collectionSlipRight: 'UGVCL संग्रहण पर्ची',
    paymentSlipTitle: 'UGVCL भुगतान पर्ची',
    slipConsumerLabel: 'उपभोक्ता क्र:',
    slipBillNoLabel: 'बिल क्र:',
    slipDueDateLabel: 'देय तिथि:',
    amountPayableLabel: 'देय राशि',
    slipFullyPaidNote: 'पूर्णतः भुगतान एवं समायोजित',
    slipPayBeforeDueNote: 'देय तिथि या उससे पूर्व भुगतान करें',
    slipPaymentModeLine: 'भुगतान माध्यम: [ ] नकद [ ] चेक [ ] डिजिटल',
    slipChequeRefLine: 'चेक / संदर्भ क्र: ____________________',
    slipCashierSignLine: 'कैशियर हस्ताक्षर एवं मुहर: ____________________',
    page1FooterLeft: 'पृष्ठ 1 / 2 (अग्र भाग)',
    page2FooterLeft: 'पृष्ठ 2 / 2 (पृष्ठ भाग)',
    footerHelplinePortal: 'हेल्पलाइन: 1912 | UGVCL वेब पोर्टल: www.ugvcl.com',
    reversePage2Badge: 'पृष्ठ 2 / 2 (A4 पृष्ठ भाग)',
    reverseBannerTitle: 'वैधानिक टैरिफ अनुसूची, गणना सिद्धांत एवं उपभोक्ता निर्देश (PAGE 2 REVERSE)',
    gercOrdersBadge: 'GERC अनुमोदित टैरिफ आदेश',
    sec1TariffTitle: '1. GERC अनुमोदित टैरिफ तालिका (TARIFF SCHEDULE)',
    sec1ColCategory: 'श्रेणी',
    sec1ColSlabs: 'खपत स्लैब (यूनिट)',
    sec1ColRate: 'दर (₹/kWh)',
    sec1ColFixed: 'स्थायी शुल्क (₹)',
    sec1CatRgp: 'RGP (आवासीय)',
    sec1SlabFirst50: 'प्रथम 50 यूनिट (द्वि-मासिक: 0-100)',
    sec1SlabNext50: 'अगले 50 यूनिट (द्वि-मासिक: 101-200)',
    sec1SlabNext150: 'अगले 150 यूनिट (द्वि-मासिक: 201-500)',
    sec1SlabAbove250: '250 यूनिट से अधिक (द्वि-मासिक: >500)',
    sec1Fixed1Ph25: '1-फेज: ₹25.00/माह',
    sec1Fixed3Ph65: '3-फेज: ₹65.00/माह',
    sec1CatGlp: 'GLP (सामान्य प्रकाश)',
    sec1SlabFirst200: 'प्रथम 200 यूनिट',
    sec1SlabRemaining: 'शेष यूनिट',
    sec1Fixed1Ph30: '1-फेज: ₹30.00/माह',
    sec1Fixed3Ph70: '3-फेज: ₹70.00/माह',
    sec1CatNonRgp: 'Non-RGP (वाणिज्यिक)',
    sec1SlabLoad5Kw: 'स्वीकृत भार ≤ 5kW',
    sec1Fixed70Kw: '₹70.00/kW/माह',
    sec1CatAg: 'LTP-AG (कृषि)',
    sec1SlabMetered: 'मीटर आधारित खपत',
    sec1Fixed10Hp: '₹10.00/HP/माह',
    sec1BiMonthlyPolicyNote: 'द्वि-मासिक नीति (DOUBLE_SLAB_AND_FIXED): 2-माह चक्र में स्लैब यूनिट सीमा (2x) और स्थायी शुल्क 2 माह के अनुसार लागू होते हैं।',
    sec2CalculationTitle: '2. बिल गणना सिद्धांत एवं वैधानिक सूत्र',
    sec2EcHeading: '• ऊर्जा शुल्क (EC):',
    sec2EcBody: 'स्मार्ट मीटर रजिस्टर द्वारा दर्ज शुद्ध खपत यूनिटों पर GERC स्लैब दरों के अनुसार गणना की जाती है।',
    sec2BiMonthlyHeading: '• द्वि-मासिक (2-माह) चक्र नियम:',
    sec2BiMonthlyBody: '2-माह के द्वि-मासिक बिलों में टैरिफ स्लैब ब्लॉक और मासिक स्थायी शुल्क निर्धारित नीति के अनुसार 2 बिलिंग महीनों के लिए लागू होते हैं।',
    sec2FpppaHeading: '• ईंधन मूल्य समायोजन (FPPPA):',
    sec2FpppaBody: 'GERC त्रैमासिक सूत्र के अनुसार निर्धारित:',
    sec2FpppaFormula: 'FPPPA (₹) = बिल यूनिट × अनुमोदित ईंधन अधिभार दर (वर्तमान: ₹1.20/kWh)',
    sec2EdHeading: '• विद्युत शुल्क (Electricity Duty - ED):',
    sec2EdBody: 'गुजरात विद्युत शुल्क अधिनियम, 1958 के अंतर्गत सकल ऊर्जा खपत शुल्क पर निर्धारित प्रतिशत से देय।',
    sec3HelplineTitle: 'UGVCL 24x7 केंद्रीकृत हेल्पलाइन',
    sec3HelplineSubtitle: 'विद्युत बाधित शिकायत, बिल पूछताछ एवं आपातकालीन सहायता हेतु टोल-फ्री नंबर',
    sec4CgrfTitle: '3. उपभोक्ता शिकायत निवारण फोरम (CGRF) एवं लोकपाल',
    sec4Intro: 'बिलिंग विवाद या सेवा में कमी से पीड़ित उपभोक्ता विद्युत अधिनियम, 2003 की धारा 42(5) के तहत गठित CGRF से संपर्क कर सकते हैं:',
    sec4ForumLabel: 'फोरम:',
    sec4ForumValue: 'उपभोक्ता शिकायत निवारण फोरम, UGVCL',
    sec4AddressLabel: 'पता:',
    sec4AddressValue: 'कॉर्पोरेट कार्यालय, विसनगर रोड, मेहसाणा - 384001',
    sec4PhoneLabel: 'फोन:',
    sec4EmailLabel: 'ईमेल:',
    sec4TimingsLabel: 'समय:',
    sec4TimingsValue: 'सुबह 10:30 से शाम 5:30 (सभी कार्य दिवस)',
    sec4OmbudsmanHeading: 'विद्युत लोकपाल (Electricity Ombudsman):',
    sec4OmbudsmanBody: 'यदि 60 दिनों के भीतर CGRF द्वारा शिकायत का निवारण नहीं होता है, तो उपभोक्ता विद्युत अधिनियम, 2003 की धारा 42(6) के अंतर्गत विद्युत लोकपाल, बैरक नं. 3, पॉलिटेक्निक कंपाउंड, अंबावाड़ी, अहमदाबाद - 380015 के समक्ष अभ्यावेदन प्रस्तुत कर सकते हैं।',
    sec5EdTitle: '4. सरकारी विद्युत शुल्क (ELECTRICITY DUTY)',
    sec5GovtBadge: 'गुजरात सरकार',
    sec5ColCategory: 'उपभोक्ता श्रेणी',
    sec5ColRate: 'शुल्क दर (%)',
    sec5RowResidential: 'आवासीय एवं शैक्षणिक परिसर',
    sec5RowCommercial: 'वाणिज्यिक प्रतिष्ठान एवं कार्यालय',
    sec5RowIndustrial: 'औद्योगिक इकाइयाँ (उच्च एवं निम्न दाब)',
    sec5RowReligious: 'धार्मिक स्थल एवं छात्रावास',
    sec5RowAgri: 'कृषि कनेक्शन एवं ग्रामीण जल आपूर्ति',
    sec5ExemptLabel: 'छूट प्राप्त (EXEMPT)',
    sec6TrendTitle: '5. छह द्वि-मासिक चक्र उपभोग तुलनात्मक चार्ट (kWh)',
    sec6RecordedHistoryBadge: '6 द्वि-मासिक चक्र (2 बार / चक्र)',
    sec6CurrentPeriodLabel: 'वर्तमान चक्र:',
    sec6AvgBiMonthlyLabel: 'औसत खपत (2-माह):',
    sec6BenchmarkLabel: '2-माह मानक:',
    sec6NoRecordShort: 'अनुपलब्ध',
    sec7DigitalPaymentTitle: '6. स्वीकृत डिजिटल भुगतान माध्यम',
    sec7Intro: 'बिना किसी लेनदेन शुल्क के 24x7 बिल भुगतान के माध्यम:',
    sec7Item1Bold: 'BBPS एवं UPI:',
    sec7Item1Text: 'किसी भी BHIM/UPI ऐप से बिल का QR कोड स्कैन करें।',
    sec7Item2Bold: 'UGVCL वेब पोर्टल:',
    sec7Item2Text: 'नेट बैंकिंग / डेबिट कार्ड द्वारा त्वरित ऑनलाइन भुगतान।',
    sec7Item3Bold: 'RTGS / NEFT:',
    sec7Item3Text: 'वाणिज्यिक / औद्योगिक उपभोक्ताओं हेतु वर्चुअल खाता अंतरण।',
    sec7Item4Bold: 'कैश काउंटर:',
    sec7Item4Text: 'उप-विभाग कार्यालयों में अधिकृत एनीटाइम पेमेंट (ATP) कियोस्क।',
    sec8SafetyTitle: '7. विद्युत सुरक्षा एवं ऊर्जा संरक्षण निर्देश',
    sec8Item1Bold: '• RCCB / ELCB अनिवार्यता:',
    sec8Item1Text: 'घातक विद्युत झटके और अग्नि दुर्घटनाओं से बचाव हेतु 30mA RCCB/ELCB अवश्य लगाएँ।',
    sec8Item2Bold: '• सोलर रूफटॉप योजना:',
    sec8Item2Text: 'पीएम सूर्य घर मुफ्त बिजली योजना के तहत आवासीय रूफटॉप सोलर पर ₹78,000 तक की सब्सिडी प्राप्त करें।',
    sec8Item3Bold: '• ऊर्जा दक्षता:',
    sec8Item3Text: 'BEE 5-स्टार रेटेड इन्वर्टर एसी और LED उपकरणों का उपयोग कर खपत में 40% तक बचत करें।',
    sec9DisconnectionTitle: 'विद्युत अधिनियम 2003 की धारा 56(1) के अंतर्गत वैधानिक विच्छेदन सूचना',
    sec9DisconnectionBody: 'एतद्द्वारा सूचना दी जाती है कि यदि इस बिल की राशि का भुगतान देय तिथि या उससे पूर्व नहीं किया जाता है, तो विद्युत अधिनियम, 2003 की धारा 56(1) के अंतर्गत 15 स्पष्ट दिनों की नोटिस अवधि समाप्त होने के पश्चात परिसर की विद्युत आपूर्ति विच्छेदित की जा सकती है। बकाया राशि, विलंबित भुगतान अधिभार (DPC @ 1.25%/माह) एवं पुनः संयोजन शुल्क के पूर्ण भुगतान पर ही विद्युत आपूर्ति बहाल की जाएगी।',
    sec10DemoDisclosureTitle: 'डेमो (DEMO) प्रामाणिकता एवं डेटा पारदर्शिता प्रकटीकरण',
  },
  mr: {
    eBillBannerPrefix: 'ई-वीज बिल (E-ELECTRICITY BILL)',
    demoUtilityBadge: 'डेमो रेकॉर्ड (DEMO)',
    consumerName: 'ग्राहकाचे नाव (Consumer Name):',
    servicePremisesAddress: 'सेवा परिसराचा पत्ता (Address):',
    consumerNo: 'ग्राहक क्रमांक (Consumer No):',
    connectionId: 'जोडणी ID:',
    meterNo: 'मीटर क्रमांक (Meter No):',
    tariffCategory: 'टॅरिफ श्रेणी (Tariff):',
    sanctionedLoad: 'मंजूर भार (Sanctioned Load):',
    securityDeposit: 'सुरक्षा ठेव (Security Deposit):',
    feederCode: 'फीडर कोड (Feeder Code):',
    poleNo: 'पोल क्रमांक (Pole No):',
    billNumber: 'बिल क्रमांक (Bill No):',
    billDate: 'बिल दिनांक (Bill Date):',
    billingCycleTypeLabel: 'बिलिंग चक्र प्रकार:',
    billingPeriodDatesLabel: 'बिलिंग कालावधी (प्रारंभ – अखेर):',
    paymentDueDate: 'देय दिनांक (Due Date):',
    scanQrTitle: 'QR कोड स्कॅन करा',
    scanQrSubtitle: 'ऑनलाइन बिल पडताळणी आणि डिजिटल देयकासाठी स्कॅन करा.',
    verifyQrBtn: 'QR पडताळणी करा',
    meterReadingRegister: 'मीटर रीडिंग आणि वापर रजिस्टर (METER READING REGISTER)',
    cycleDatesPrefix: 'कालावधी:',
    classificationPrefix: 'वर्गीकरण:',
    colMeterSerial: 'मीटर क्रमांक',
    colPrevReading: 'मागील रीडिंग',
    colCurrReading: 'चालू रीडिंग',
    colDifference: 'फरक (युनिट)',
    colMultiplier: 'गुणक (MF)',
    colBilledConsumption: 'बिल केलेला वापर',
    colReadingStatus: 'रीडिंग स्थिती',
    gercSlabBreakdown: 'GERC टॅरिफ स्लॅब तपशील (SLAB BREAKDOWN)',
    colSlab: 'वापर स्लॅब',
    colUnits: 'युनिट',
    colRate: 'दर (₹)',
    colAmount: 'रक्कम (₹)',
    slabEnergySum: 'एकूण स्लॅब ऊर्जा रक्कम:',
    itemizedBillStatement: 'तपशीलवार बिल विवरण (ITEMIZED BILL STATEMENT)',
    amountsInInr: 'रक्कम रुपयांमध्ये (₹)',
    energyChargesRow: '1. ऊर्जा आकार (Energy Charges)',
    fixedChargesRow: '2. स्थिर आकार (Fixed Charges)',
    fpppaRow: '3. इंधन अधिभार (FPPPA @ ₹1.20/युनिट)',
    edRow: '4. विद्युत शुल्क (Electricity Duty @ 15%)',
    meterRentRow: '5. मीटर भाडे / सर्व्हिस लाईन आकार',
    subtotalRow: '6. चालू बिलाची उप-एकूण रक्कम',
    rebateRow: '7. सरकारी अनुदान / सोलर सवलत',
    arrearsRow: '8. मागील थकबाकी (Arrears)',
    totalCurrentBillRow: '9. एकूण चालू बिल रक्कम (TOTAL BILL)',
    paymentsReceivedRow: '10. प्राप्त व समायोजित देयक रक्कम',
    netAmountPayablePrefix: 'देय दिनांकापूर्वी भरावयाची निव्वळ रक्कम:',
    previousThreePeriodsTitle: 'मागील तीन बिलिंग कालावधीचा तपशील (PREVIOUS THREE BILLING PERIODS)',
    connectionPrefix: 'ग्राहक क्र:',
    colBillingCycle: 'बिलिंग कालावधी',
    colBilledUnits: 'युनिट (kWh)',
    colBilledAmount: 'बिल रक्कम (₹)',
    colAmountPaid: 'भरलेली रक्कम (₹)',
    colBalance: 'शिल्लक रक्कम (₹)',
    colSettlementStatus: 'स्थिती',
    noPreviousRecordsFound: 'या वीज जोडणीसाठी मागील कोणतेही बिल रेकॉर्ड आढळले नाहीत.',
    tearOffInstruction: '✄ येथून कापा — कॅश काउंटर / बँक संकलन स्लिप (FOR OFFICE USE ONLY)',
    collectionSlipRight: 'UGVCL संकलन स्लिप',
    paymentSlipTitle: 'UGVCL देयक स्लिप',
    slipConsumerLabel: 'ग्राहक क्र:',
    slipBillNoLabel: 'बिल क्र:',
    slipDueDateLabel: 'देय दिनांक:',
    amountPayableLabel: 'देय रक्कम',
    slipFullyPaidNote: 'पूर्णपणे भरलेले व समायोजित',
    slipPayBeforeDueNote: 'देय दिनांकापूर्वी किंवा त्यादिवशी भरावे',
    slipPaymentModeLine: 'देयक माध्यम: [ ] रोख [ ] धनादेश [ ] डिजिटल',
    slipChequeRefLine: 'धनादेश / संदर्भ क्र: ____________________',
    slipCashierSignLine: 'रोखपाल स्वाक्षरी व शिक्का: ____________________',
    page1FooterLeft: 'पृष्ठ 1 / 2 (पुढील बाजू)',
    page2FooterLeft: 'पृष्ठ 2 / 2 (मागील बाजू)',
    footerHelplinePortal: 'हेल्पलाईन: 1912 | UGVCL वेब पोर्टल: www.ugvcl.com',
    reversePage2Badge: 'पृष्ठ 2 / 2 (A4 मागील बाजू)',
    reverseBannerTitle: 'वैधानिक टॅरिफ वेळापत्रक, गणना तत्त्वे आणि ग्राहक मार्गदर्शक सूचना (PAGE 2 REVERSE)',
    gercOrdersBadge: 'GERC मान्यताप्राप्त टॅरिफ आदेश',
    sec1TariffTitle: '1. GERC मान्यताप्राप्त टॅरिफ तक्ता (TARIFF SCHEDULE)',
    sec1ColCategory: 'श्रेणी',
    sec1ColSlabs: 'वापर स्लॅब (युनिट)',
    sec1ColRate: 'दर (₹/kWh)',
    sec1ColFixed: 'स्थिर आकार (₹)',
    sec1CatRgp: 'RGP (निवासी)',
    sec1SlabFirst50: 'पहिले 50 युनिट (द्वि-मासिक: 0-100)',
    sec1SlabNext50: 'पुढील 50 युनिट (द्वि-मासिक: 101-200)',
    sec1SlabNext150: 'पुढील 150 युनिट (द्वि-मासिक: 201-500)',
    sec1SlabAbove250: '250 युनिटपेक्षा जास्त (द्वि-मासिक: >500)',
    sec1Fixed1Ph25: '1-फेज: ₹25.00/महिना',
    sec1Fixed3Ph65: '3-फेज: ₹65.00/महिना',
    sec1CatGlp: 'GLP (सामान्य प्रकाश व्यवस्था)',
    sec1SlabFirst200: 'पहिले 200 युनिट',
    sec1SlabRemaining: 'उर्वरित युनिट',
    sec1Fixed1Ph30: '1-फेज: ₹30.00/महिना',
    sec1Fixed3Ph70: '3-फेज: ₹70.00/महिना',
    sec1CatNonRgp: 'Non-RGP (व्यावसायिक)',
    sec1SlabLoad5Kw: 'मंजूर भार ≤ 5kW',
    sec1Fixed70Kw: '₹70.00/kW/महिना',
    sec1CatAg: 'LTP-AG (कृषी)',
    sec1SlabMetered: 'मीटर आधारित वापर',
    sec1Fixed10Hp: '₹10.00/HP/महिना',
    sec1BiMonthlyPolicyNote: 'द्वि-मासिक धोरण (DOUBLE_SLAB_AND_FIXED): 2-महिन्यांच्या चक्रात स्लॅब युनिट मर्यादा (2x) आणि स्थिर आकार 2 महिन्यांनुसार लागू होतात.',
    sec2CalculationTitle: '2. बिल गणना तत्त्वे आणि वैधानिक सूत्रे',
    sec2EcHeading: '• ऊर्जा आकार (EC):',
    sec2EcBody: 'स्मार्ट मीटर रजिस्टरद्वारे नोंदवलेल्या निव्वळ वापर युनिट्सवर GERC स्लॅब दरानुसार गणना केली जाते.',
    sec2BiMonthlyHeading: '• द्वि-मासिक (2-महिने) चक्र नियम:',
    sec2BiMonthlyBody: '2-महिन्यांच्या द्वि-मासिक बिलांसाठी टॅरिफ स्लॅब ब्लॉक आणि मासिक स्थिर आकार विहित धोरणानुसार 2 बिलिंग महिन्यांसाठी लागू होतात.',
    sec2FpppaHeading: '• इंधन मूल्य समायोजन (FPPPA):',
    sec2FpppaBody: 'GERC त्रैमासिक सूत्रानुसार निर्धारित:',
    sec2FpppaFormula: 'FPPPA (₹) = बिल युनिट × मान्यताप्राप्त इंधन अधिभार दर (सध्याचा दर: ₹1.20/kWh)',
    sec2EdHeading: '• विद्युत शुल्क (Electricity Duty - ED):',
    sec2EdBody: 'गुजरात विद्युत शुल्क अधिनियम, 1958 अंतर्गत एकूण ऊर्जा वापर आकारावर विहित टक्केवारीनुसार आकारले जाते.',
    sec3HelplineTitle: 'UGVCL 24x7 मध्यवर्ती हेल्पलाईन',
    sec3HelplineSubtitle: 'वीज खंडित तक्रार, बिल चौकशी आणि आपत्कालीन मदतीसाठी टोल-फ्री क्रमांक',
    sec4CgrfTitle: '3. ग्राहक तक्रार निवारण मंच (CGRF) आणि लोकपाल',
    sec4Intro: 'बिलिंग वाद किंवा सेवेतील त्रुटींबाबत तक्रार असल्यास ग्राहक विद्युत कायदा, 2003 च्या कलम 42(5) अंतर्गत स्थापन CGRF कडे दाद मागू शकतात:',
    sec4ForumLabel: 'मंच:',
    sec4ForumValue: 'ग्राहक तक्रार निवारण मंच, UGVCL',
    sec4AddressLabel: 'पत्ता:',
    sec4AddressValue: 'कॉर्पोरेट कार्यालय, विसनगर रोड, मेहसाणा - 384001',
    sec4PhoneLabel: 'दूरध्वनी:',
    sec4EmailLabel: 'ईमेल:',
    sec4TimingsLabel: 'वेळ:',
    sec4TimingsValue: 'सकाळी 10:30 ते संध्याकाळी 5:30 (सर्व कामकाजाचे दिवस)',
    sec4OmbudsmanHeading: 'विद्युत लोकपाल (Electricity Ombudsman):',
    sec4OmbudsmanBody: 'CGRF कडून 60 दिवसांत तक्रारीचे निवारण न झाल्यास, ग्राहक विद्युत कायदा, 2003 च्या कलम 42(6) अंतर्गत विद्युत लोकपाल, बॅरक क्र. 3, पॉलिटेक्निक कंपाउंड, आंबावाडी, अहमदाबाद - 380015 यांच्याकडे अभ्यावेदन सादर करू शकतात.',
    sec5EdTitle: '4. सरकारी विद्युत शुल्क (ELECTRICITY DUTY)',
    sec5GovtBadge: 'गुजरात सरकार',
    sec5ColCategory: 'ग्राहक श्रेणी',
    sec5ColRate: 'शुल्क दर (%)',
    sec5RowResidential: 'निवासी आणि शैक्षणिक परिसर',
    sec5RowCommercial: 'व्यावसायिक आस्थापना आणि कार्यालये',
    sec5RowIndustrial: 'औद्योगिक एकके (उच्च व लघु दाब)',
    sec5RowReligious: 'धार्मिक स्थळे आणि वसतिगृहे',
    sec5RowAgri: 'कृषी जोडणी आणि ग्रामीण पाणीपुरवठा',
    sec5ExemptLabel: 'सूट (EXEMPT)',
    sec6TrendTitle: '5. सहा द्वि-मासिक कालावधी वीज वापर तुलनात्मक आलेख (kWh)',
    sec6RecordedHistoryBadge: '6 द्वि-मासिक कालावधी (2 स्तंभ / कालावधी)',
    sec6CurrentPeriodLabel: 'चालू कालावधी:',
    sec6AvgBiMonthlyLabel: 'सरासरी वापर (2-महिने):',
    sec6BenchmarkLabel: '2-महिने संदर्भ:',
    sec6NoRecordShort: 'उपलब्ध नाही',
    sec7DigitalPaymentTitle: '6. अधिकृत डिजिटल देयक माध्यमे',
    sec7Intro: 'कोणत्याही व्यवहार शुल्काशिवाय 24x7 बिल भरण्याचे पर्याय:',
    sec7Item1Bold: 'BBPS आणि UPI:',
    sec7Item1Text: 'कोणत्याही BHIM/UPI ॲपद्वारे बिलावरील QR कोड स्कॅन करा.',
    sec7Item2Bold: 'UGVCL वेब पोर्टल:',
    sec7Item2Text: 'नेट बँकिंग / डेबिट कार्डद्वारे त्वरित ऑनलाइन देयक.',
    sec7Item3Bold: 'RTGS / NEFT:',
    sec7Item3Text: 'व्यावसायिक / औद्योगिक ग्राहकांसाठी व्हर्च्युअल खाते हस्तांतरण.',
    sec7Item4Bold: 'कॅश काउंटर:',
    sec7Item4Text: 'उपविभाग कार्यालयांमध्ये अधिकृत एनीटाइम पेमेंट (ATP) कियोस्क.',
    sec8SafetyTitle: '7. विद्युत सुरक्षा आणि ऊर्जा संवर्धन सूचना',
    sec8Item1Bold: '• RCCB / ELCB अनिवार्य:',
    sec8Item1Text: 'प्राणघातक विजेचा धक्का आणि शॉर्ट सर्किट टाळण्यासाठी 30mA RCCB/ELCB नक्की बसवा.',
    sec8Item2Bold: '• सोलर रूफटॉप योजना:',
    sec8Item2Text: 'पीएम सूर्य घर मोफत वीज योजनेअंतर्गत निवासी रूफटॉप सोलरवर ₹78,000 पर्यंत अनुदान मिळवा.',
    sec8Item3Bold: '• ऊर्जा कार्यक्षमता:',
    sec8Item3Text: 'BEE 5-स्टार रेटेड इन्व्हर्टर एसी आणि LED उपकरणांचा वापर करून वीज वापरात 40% पर्यंत बचत करा.',
    sec9DisconnectionTitle: 'विद्युत कायदा २००३ च्या कलम ५६(१) अंतर्गत वैधानिक वीज पुरवठा खंडित करण्याची नोटीस',
    sec9DisconnectionBody: 'याद्वारे नोटीस देण्यात येते की या बिलाची रक्कम देय दिनांकास किंवा त्यापूर्वी न भरल्यास, विद्युत कायदा, 2003 च्या कलम 56(1) अन्वये 15 दिवसांच्या नोटीस कालावधीनंतर परिसराचा वीज पुरवठा खंडित केला जाऊ शकतो. थकबाकी, विलंबित देयक आकार (DPC @ 1.25%/महिना) आणि पुनर्जोडणी शुल्काचा पूर्ण भरणा केल्यानंतरच वीज पुरवठा पूर्ववत केला जाईल.',
    sec10DemoDisclosureTitle: 'डेमो (DEMO) सत्यता आणि डेटा पारदर्शकता प्रकटीकरण',
  },
};

export const UgvclElectricityBillTwoPage: React.FC<UgvclElectricityBillTwoPageProps> = ({
  document,
  particulars,
  language,
  onVerifyQrClick,
}) => {
  const p = particulars;
  const isPaid = p.outstandingBalance === 0;
  const l = TWO_PAGE_BILL_LABELS[language] || TWO_PAGE_BILL_LABELS.en;
  const extra = BILL_AND_RECEIPT_EXTRA_LABELS[language] || BILL_AND_RECEIPT_EXTRA_LABELS.en;
  const chart = p.sixPeriodComparisonChart;

  return (
    <div
      className="w-full max-w-[850px] mx-auto space-y-8 text-slate-900 dark:text-slate-100 print:text-black print:max-w-none print:w-full"
      style={{ fontFamily: document.fontFamilyCss }}
    >
      {/* =========================================================================
          PAGE 1 — UGVCL ELECTRICITY BILL FRONT
          ========================================================================= */}
      <section
        className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl border-2 border-slate-800 shadow-md print:shadow-none print:border-black print:p-6 print:rounded-none relative overflow-hidden"
        style={{ minHeight: '1050px' }}
        data-testid="ugvcl-bill-page-1-front"
      >
        {/* Subtle Watermark */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none text-[80px] font-black tracking-widest text-slate-900 rotate-[-25deg]"
        >
          UGVCL DEMO BILL
        </div>

        {/* 1. Corporate Masthead (Reference A) */}
        <div className="border-2 border-slate-900 mb-3" data-testid="document-section-ugvcl-identity">
          <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-slate-900 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 shrink-0 bg-white border border-slate-300 p-1 rounded flex items-center justify-center">
                <img
                  src={UGVCL_LOGO_ASSET_PATH || '/assets/ugvcl-logo.png'}
                  alt="UGVCL Official Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/ugvcl-logo.png';
                  }}
                />
              </div>
              <div>
                <h1
                  id="official-document-title"
                  data-testid="official-document-heading"
                  className="text-base sm:text-lg font-black tracking-tight text-blue-950 leading-tight"
                >
                  {UGVCL_COMPANY_NAME_EN}
                </h1>
                <p className="text-xs font-bold text-slate-700 leading-tight">
                  {UGVCL_COMPANY_NAME_GU} — <span className="italic font-normal">{UGVCL_TAGLINE_EN}</span>
                </p>
                <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                  Regd. Office: {p.registeredOffice || UGVCL_CORPORATE_IDENTITY.registeredOffice}
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] font-mono shrink-0 space-y-0.5 sm:border-l-2 sm:border-slate-300 sm:pl-3">
              <div><span className="font-bold">CIN:</span> {p.cin || UGVCL_CORPORATE_IDENTITY.cin}</div>
              <div><span className="font-bold">GSTIN:</span> {p.gstin || '24AABCU4494L1ZV'}</div>
              <div><span className="font-bold">Web:</span> {p.website || 'www.ugvcl.com'}</div>
              <div><span className="font-bold">Helpline:</span> {p.helpline || '1912 / 1800 233 155335'}</div>
            </div>
          </div>

          {/* Subheader Ribbon */}
          <div className="bg-slate-900 text-white px-3 py-1 text-[11px] font-mono flex flex-wrap items-center justify-between font-bold gap-2">
            <span>
              {l.eBillBannerPrefix} : {p.billMonth} ({p.billingCycleShortBadge})
            </span>
            <span>SDO: {p.subdivision.toUpperCase()}</span>
            <span
              className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-sans text-[10px]"
              data-testid="official-document-status-badge"
            >
              {document.statusLabel || l.demoUtilityBadge}
            </span>
          </div>

          {/* 2. Consumer Particulars & Billing Identifiers (Split Grid) */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-900 text-xs"
            data-testid="document-section-consumer-connection"
          >
            {/* Left: Consumer Particulars */}
            <div className="p-3 space-y-1.5">
              <div className="border-b border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{l.consumerName}</span>
                <span className="font-black text-sm text-slate-950" data-testid="document-field-consumerName">
                  {p.consumerName}
                </span>
              </div>
              <div className="border-b border-slate-200 pb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">{l.servicePremisesAddress}</span>
                <span className="font-medium text-slate-800 leading-snug" data-testid="document-field-address">
                  {p.premisesAddress}
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">{p.villageTalukaDistrict}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5 font-mono text-[11px]">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.consumerNo}</span>
                  <span className="font-black text-blue-900 text-xs" data-testid="document-field-consumerNo">
                    {p.consumerNo}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.connectionId}</span>
                  <span className="font-bold text-slate-900" data-testid="document-field-connectionId">
                    {p.connectionId}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.meterNo}</span>
                  <span className="font-bold text-slate-900" data-testid="document-field-meterNo">
                    {p.meterNo}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.tariffCategory}</span>
                  <span className="font-bold text-slate-900" data-testid="document-field-tariffCategory">
                    {p.tariffCategory}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.sanctionedLoad}</span>
                  <span className="font-bold text-slate-900" data-testid="document-field-sanctionedLoad">
                    {p.sanctionedLoadKw} kW ({p.phase})
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.securityDeposit}</span>
                  <span className="font-bold text-slate-900">₹{p.securityDeposit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Right: Technical Routing, Bi-Monthly Period, Due Dates & Scannable QR Code */}
            <div className="p-3 flex flex-col justify-between space-y-2" data-testid="document-section-bill-metadata">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.feederCode}</span>
                  <span className="font-semibold text-slate-800">{p.feederCode}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.poleNo}</span>
                  <span className="font-semibold text-slate-800">{p.poleNo}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.billNumber}</span>
                  <span className="font-black text-slate-950" data-testid="document-field-billNo">
                    {p.billNo}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">{l.billDate}</span>
                  <span className="font-bold text-slate-800" data-testid="document-field-billDate">
                    {p.billDate}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">
                    {l.billingCycleTypeLabel}
                  </span>
                  <span
                    className="font-bold text-blue-900 font-sans text-[11px]"
                    data-testid="document-field-billingCycleType"
                  >
                    {p.billingCycleLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-sans">
                    {l.billingPeriodDatesLabel}
                  </span>
                  <span
                    className="font-bold text-slate-900 text-[10px]"
                    data-testid="document-field-billingPeriodDates"
                  >
                    {p.periodStartDate} – {p.periodEndDate}
                  </span>
                </div>
                <div className="col-span-2 bg-amber-50 border border-amber-300 p-1.5 rounded flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-amber-900 uppercase block font-sans">{l.paymentDueDate}</span>
                    <span className="font-black text-xs text-rose-700" data-testid="document-field-dueDate">
                      {p.dueDate}
                    </span>
                  </div>
                  <span
                    data-testid="document-field-paymentStatusBadge"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase border ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {p.billStatus}
                  </span>
                </div>
              </div>

              {/* Unique Scannable QR Code Box */}
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="w-24 h-24 shrink-0 bg-white border-2 border-slate-900 p-1 rounded flex items-center justify-center shadow-xs"
                  dangerouslySetInnerHTML={{ __html: p.qrSvg }}
                  data-testid="ugvcl-bill-qr-code"
                />
                <div className="text-[10px] text-slate-700 space-y-1 min-w-0">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <QrIcon className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                    <span>{l.scanQrTitle}</span>
                  </div>
                  <p className="leading-tight text-slate-600">
                    {l.scanQrSubtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="font-mono text-[9px] text-slate-500 truncate">
                      Ref: {p.billNo}
                    </span>
                    {onVerifyQrClick && (
                      <button
                        type="button"
                        onClick={onVerifyQrClick}
                        data-testid="ugvcl-bill-verify-qr-btn"
                        className="print:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-[9px] cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{l.verifyQrBtn}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Meter Readings & Cumulative Consumption Table (Reference A & B) */}
        <div className="border-2 border-slate-900 mb-3" data-testid="document-section-consumption-summary">
          <div className="bg-slate-100 border-b border-slate-900 px-3 py-1 font-bold text-xs flex flex-wrap justify-between items-center gap-2">
            <span>{l.meterReadingRegister}</span>
            <span className="font-mono text-[10px] font-normal text-slate-600">
              {l.cycleDatesPrefix} {p.readingDates} | {l.classificationPrefix} {p.readingProvenanceLabel || p.readingClassification}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="p-1.5 border-r border-slate-300">{l.colMeterSerial}</th>
                  <th className="p-1.5 border-r border-slate-300">{l.colPrevReading}</th>
                  <th className="p-1.5 border-r border-slate-300">{l.colCurrReading}</th>
                  <th className="p-1.5 border-r border-slate-300">{l.colDifference}</th>
                  <th className="p-1.5 border-r border-slate-300">{l.colMultiplier}</th>
                  <th className="p-1.5 border-r border-slate-300">{l.colBilledConsumption}</th>
                  <th className="p-1.5">{l.colReadingStatus}</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-bold">{p.meterNo}</td>
                  <td className="p-1.5 border-r border-slate-300" data-testid="document-field-previousReading">
                    <div>{p.previousReadingKwh.toLocaleString('en-IN')}</div>
                    <div className="text-[9px] text-slate-500" data-testid="document-field-previousReadingDate">
                      ({p.previousReadingDate})
                    </div>
                  </td>
                  <td className="p-1.5 border-r border-slate-300" data-testid="document-field-currentReading">
                    <div>{p.currentReadingKwh.toLocaleString('en-IN')}</div>
                    <div className="text-[9px] text-slate-500" data-testid="document-field-currentReadingDate">
                      ({p.currentReadingDate})
                    </div>
                  </td>
                  <td className="p-1.5 border-r border-slate-300 font-semibold">{p.readingDifference}</td>
                  <td className="p-1.5 border-r border-slate-300">{p.meterMultiplier.toFixed(2)}</td>
                  <td
                    className="p-1.5 border-r border-slate-300 font-black text-blue-950 text-sm"
                    data-testid="document-field-unitsConsumed"
                  >
                    {p.billedUnits} kWh
                  </td>
                  <td className="p-1.5 font-sans font-semibold text-[11px] text-emerald-800">
                    {p.readingProvenanceLabel || p.readingClassification}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {p.readingIntegrityWarning && (
            <div
              className="bg-amber-50 text-amber-950 border-t border-amber-300 px-3 py-1 text-[10px] flex items-center gap-1.5 font-sans"
              data-testid="ugvcl-bill-reading-integrity-warning"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{p.readingIntegrityWarning}</span>
            </div>
          )}
        </div>

        {/* 4. Side-by-Side Tariff Slabs & Itemized Charges (Reference B) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {/* Left: Slab Breakdown */}
          <div
            className="border-2 border-slate-900 flex flex-col justify-between"
            data-testid="document-table-slab-breakdown-table"
          >
            <div>
              <div className="bg-slate-100 border-b border-slate-900 px-3 py-1 font-bold text-xs flex justify-between items-center">
                <span>
                  {l.gercSlabBreakdown} ({p.tariffCategory})
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  {p.billingCycleShortBadge}
                </span>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                    <th className="p-1.5 text-left border-r border-slate-300">{l.colSlab}</th>
                    <th className="p-1.5 text-right border-r border-slate-300">{l.colUnits}</th>
                    <th className="p-1.5 text-right border-r border-slate-300">{l.colRate}</th>
                    <th className="p-1.5 text-right">{l.colAmount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {p.slabBreakdown.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-1.5 border-r border-slate-300 font-sans">{s.slab}</td>
                      <td className="p-1.5 text-right border-r border-slate-300">{s.units}</td>
                      <td className="p-1.5 text-right border-r border-slate-300">₹{s.rate.toFixed(2)}</td>
                      <td className="p-1.5 text-right font-semibold">₹{s.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-300 p-2 text-[10px] text-slate-600">
              {p.slabIntegrityWarning ? (
                <div
                  className="text-amber-900 flex items-start gap-1 font-sans"
                  data-testid="ugvcl-bill-slab-integrity-warning"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                  <span>{p.slabIntegrityWarning}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center font-mono">
                  <span>{l.slabEnergySum}</span>
                  <span className="font-bold text-slate-900">
                    ₹{p.slabBreakdown.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Itemized Utility Charges */}
          <div
            className="border-2 border-slate-900"
            data-testid="document-table-tariff-reconciliation-table"
          >
            <div className="bg-slate-100 border-b border-slate-900 px-3 py-1 font-bold text-xs flex justify-between">
              <span>{l.itemizedBillStatement}</span>
              <span className="font-mono text-[10px]">{l.amountsInInr}</span>
            </div>
            <table className="w-full text-xs border-collapse" data-testid="document-section-tariff-breakdown">
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-sans">
                    {l.energyChargesRow} ({p.billedUnits} kWh)
                  </td>
                  <td className="p-1.5 text-right font-semibold" data-testid="document-field-energyCharges">
                    ₹{p.energyCharges.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-sans">
                    {l.fixedChargesRow} ({p.sanctionedLoadKw} kW)
                  </td>
                  <td className="p-1.5 text-right" data-testid="document-field-fixedCharges">
                    ₹{p.fixedCharges.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-sans">{l.fpppaRow}</td>
                  <td className="p-1.5 text-right" data-testid="document-field-fpppa">
                    ₹{p.fuelPriceAdjustment.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-sans">{l.edRow}</td>
                  <td className="p-1.5 text-right" data-testid="document-field-electricityDuty">
                    ₹{p.electricityDuty.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-1.5 border-r border-slate-300 font-sans">{l.meterRentRow}</td>
                  <td className="p-1.5 text-right">₹{p.meterRent.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="p-1.5 border-r border-slate-300 font-sans">{l.subtotalRow}</td>
                  <td className="p-1.5 text-right">₹{p.subtotalCurrentCharges.toFixed(2)}</td>
                </tr>
                {p.rebateOrSubsidy > 0 && (
                  <tr className="text-emerald-700">
                    <td className="p-1.5 border-r border-slate-300 font-sans">{l.rebateRow}</td>
                    <td className="p-1.5 text-right font-bold" data-testid="document-field-rebate">
                      -₹{p.rebateOrSubsidy.toFixed(2)}
                    </td>
                  </tr>
                )}
                {p.arrears !== 0 && (
                  <tr className="text-amber-800">
                    <td className="p-1.5 border-r border-slate-300 font-sans">{l.arrearsRow}</td>
                    <td className="p-1.5 text-right font-bold">₹{p.arrears.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-black text-slate-950 text-xs">
                  <td className="p-1.5 border-r border-slate-300 font-sans">{l.totalCurrentBillRow}</td>
                  <td className="p-1.5 text-right text-sm text-blue-950" data-testid="document-field-totalAmount">
                    ₹{p.totalBillAmount.toFixed(2)}
                  </td>
                </tr>
                {p.paidAmount > 0 && (
                  <tr className="bg-emerald-50 text-emerald-900 font-bold">
                    <td className="p-1.5 border-r border-slate-300 font-sans">{l.paymentsReceivedRow}</td>
                    <td className="p-1.5 text-right" data-testid="document-field-paidAmount">
                      -₹{p.paidAmount.toFixed(2)}
                    </td>
                  </tr>
                )}
                <tr className="bg-amber-100 text-slate-950 font-black text-xs border-t-2 border-slate-900">
                  <td className="p-2 border-r border-slate-900 font-sans uppercase">
                    {l.netAmountPayablePrefix} {p.dueDate}
                  </td>
                  <td className="p-2 text-right text-base text-rose-800" data-testid="document-field-outstandingBalance">
                    ₹{p.outstandingBalance.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Previous Three Billing Periods (Reference B) */}
        <div
          className="border-2 border-slate-900 mb-3"
          data-testid="document-table-previous-bills-table"
        >
          <div className="bg-slate-100 border-b border-slate-900 px-3 py-1 font-bold text-xs flex justify-between">
            <span>{l.previousThreePeriodsTitle}</span>
            <span className="font-mono text-[10px] text-slate-600">
              {l.connectionPrefix} {p.consumerNo}
            </span>
          </div>
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                <th className="p-1.5 border-r border-slate-300">{l.colBillingCycle}</th>
                <th className="p-1.5 border-r border-slate-300">{l.colBilledUnits}</th>
                <th className="p-1.5 border-r border-slate-300">{l.colBilledAmount}</th>
                <th className="p-1.5 border-r border-slate-300">{l.colAmountPaid}</th>
                <th className="p-1.5 border-r border-slate-300">{l.colBalance}</th>
                <th className="p-1.5">{l.colSettlementStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {p.previousPeriods && p.previousPeriods.length > 0 ? (
                p.previousPeriods.map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-1.5 border-r border-slate-300 font-sans font-medium">{h.month}</td>
                    <td className="p-1.5 border-r border-slate-300">{h.units}</td>
                    <td className="p-1.5 border-r border-slate-300">₹{h.billAmount.toLocaleString('en-IN')}</td>
                    <td className="p-1.5 border-r border-slate-300">₹{h.paidAmount.toLocaleString('en-IN')}</td>
                    <td className="p-1.5 border-r border-slate-300">₹{h.balance.toLocaleString('en-IN')}</td>
                    <td className="p-1.5 font-sans font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          h.balance === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-3 text-slate-500 font-sans italic text-xs">
                    {l.noPreviousRecordsFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Code 128 Barcode & Office Use Payment Slip (Reference B) */}
        <div
          className="border-t-2 border-dashed border-slate-400 pt-3 mt-4"
          data-testid="document-section-billing-payment-slip"
        >
          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">
            <span>{l.tearOffInstruction}</span>
            <span>{l.collectionSlipRight}</span>
          </div>

          <div className="border-2 border-slate-900 p-2.5 bg-slate-50/60 rounded">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              {/* Slip Identifiers */}
              <div className="space-y-0.5 text-[11px]">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                  {l.paymentSlipTitle}
                </div>
                <div className="font-mono text-[10px]">
                  {l.slipConsumerLabel} <span className="font-bold" data-testid="document-field-slipConsumerNo">{p.consumerNo}</span>
                </div>
                <div className="font-mono text-[10px]">
                  {l.slipBillNoLabel} <span className="font-bold" data-testid="document-field-slipBillNo">{p.billNo}</span>
                </div>
                <div className="font-mono text-[10px]">
                  {l.slipDueDateLabel} <span className="font-bold text-rose-700" data-testid="document-field-slipDueDate">{p.dueDate}</span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-white border-2 border-slate-800 p-2 text-center rounded">
                <span className="text-[9px] font-bold uppercase text-slate-500 block">{l.amountPayableLabel}</span>
                <span
                  className="text-base font-black font-mono text-slate-950"
                  data-testid="document-field-slipAmountPayable"
                >
                  ₹{p.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] block text-slate-500 font-sans mt-0.5">
                  {isPaid ? l.slipFullyPaidNote : l.slipPayBeforeDueNote}
                </span>
              </div>

              {/* Machine-Readable Code 128 Barcode */}
              <div className="md:col-span-2 flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-2xs">
                <div
                  className="w-full max-w-[280px] overflow-hidden flex justify-center"
                  dangerouslySetInnerHTML={{ __html: p.barcodeSvg }}
                  data-testid="ugvcl-bill-barcode"
                />
                <span
                  className="text-[9px] font-mono text-slate-600 tracking-wider mt-0.5"
                  data-testid="document-field-slipBarcodeRef"
                >
                  *{p.barcodeRef}*
                </span>
              </div>
            </div>

            {/* Bank / Cashier Counter Signature Line */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-300 text-[9px] font-mono text-slate-600">
              <div>{l.slipPaymentModeLine}</div>
              <div>{l.slipChequeRefLine}</div>
              <div className="text-right">{l.slipCashierSignLine}</div>
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>{l.page1FooterLeft}</span>
          <span>{l.footerHelplinePortal}</span>
          <span>Ref: {p.billNo}</span>
        </div>
      </section>

      {/* Visual Page Break Indicator in Browser Preview */}
      <div className="print:hidden flex items-center justify-center gap-3 py-2 text-xs font-bold font-mono text-slate-400">
        <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
          {l.reversePage2Badge} — {l.reverseBannerTitle}
        </span>
        <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
      </div>

      {/* =========================================================================
          PAGE 2 — UGVCL ELECTRICITY BILL REVERSE (Reference C)
          ========================================================================= */}
      <section
        className="bg-white text-slate-950 p-6 sm:p-8 rounded-xl border-2 border-slate-800 shadow-md print:shadow-none print:border-black print:p-6 print:rounded-none relative overflow-hidden print:break-before-page"
        style={{ minHeight: '1050px' }}
        data-testid="ugvcl-bill-page-2-reverse"
      >
        <div data-testid="document-reverse-side-container">
          {/* Subtle Watermark */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none text-[80px] font-black tracking-widest text-slate-900 rotate-[-25deg]"
          >
            UGVCL REVERSE SIDE
          </div>

          {/* Shared Reverse Corporate Header (Reference C) */}
          <div className="border-2 border-slate-900 mb-3">
            <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-slate-900 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 shrink-0 bg-white border border-slate-300 p-1 rounded flex items-center justify-center">
                  <img
                    src={UGVCL_LOGO_ASSET_PATH || '/assets/ugvcl-logo.png'}
                    alt="UGVCL Official Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-blue-950 leading-tight">
                    {UGVCL_COMPANY_NAME_EN}
                  </h2>
                  <p className="text-xs font-bold text-slate-700 leading-tight">
                    {UGVCL_COMPANY_NAME_GU} — <span className="italic font-normal">{UGVCL_TAGLINE_EN}</span>
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] font-mono shrink-0">
                <span className="font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[10px]">
                  {l.reversePage2Badge}
                </span>
                <div className="text-slate-600 mt-0.5">Bill Ref: {p.billNo}</div>
              </div>
            </div>

            <div className="bg-slate-900 text-white px-3 py-1 text-[11px] font-mono flex items-center justify-between font-bold">
              <span>{l.reverseBannerTitle}</span>
              <span>{l.gercOrdersBadge}</span>
            </div>
          </div>

          {/* Dense 2-Column Professional Utility Layout (Reference C) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* ================= COLUMN 1 ================= */}
            <div className="space-y-3">
              {/* 1. GERC Tariff Structure Table */}
              <div
                className="border-2 border-slate-900 rounded overflow-hidden"
                data-testid="document-reverse-section-ugvcl-tariff-schedule"
              >
                <div className="bg-slate-100 border-b border-slate-900 px-3 py-1 font-bold text-xs text-blue-950 flex justify-between">
                  <span>{l.sec1TariffTitle}</span>
                  <span className="font-mono text-[10px]">{l.gercOrdersBadge}</span>
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                      <th className="p-1.5 text-left border-r border-slate-300">{l.sec1ColCategory}</th>
                      <th className="p-1.5 text-left border-r border-slate-300">{l.sec1ColSlabs}</th>
                      <th className="p-1.5 text-right border-r border-slate-300">{l.sec1ColRate}</th>
                      <th className="p-1.5 text-right">{l.sec1ColFixed}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                    <tr>
                      <td rowSpan={4} className="p-1.5 border-r border-slate-300 font-sans font-bold bg-slate-50/50 align-top">
                        {l.sec1CatRgp}
                      </td>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabFirst50}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹3.05</td>
                      <td rowSpan={2} className="p-1 text-right align-middle font-sans">{l.sec1Fixed1Ph25}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabNext50}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹3.50</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabNext150}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹4.15</td>
                      <td rowSpan={2} className="p-1 text-right align-middle font-sans">{l.sec1Fixed3Ph65}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabAbove250}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹5.20</td>
                    </tr>
                    <tr className="border-t border-slate-300">
                      <td rowSpan={2} className="p-1.5 border-r border-slate-300 font-sans font-bold bg-slate-50/50 align-top">
                        {l.sec1CatGlp}
                      </td>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabFirst200}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹4.10</td>
                      <td className="p-1 text-right font-sans">{l.sec1Fixed1Ph30}</td>
                    </tr>
                    <tr>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabRemaining}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹4.80</td>
                      <td className="p-1 text-right font-sans">{l.sec1Fixed3Ph70}</td>
                    </tr>
                    <tr className="border-t border-slate-300">
                      <td className="p-1.5 border-r border-slate-300 font-sans font-bold bg-slate-50/50">
                        {l.sec1CatNonRgp}
                      </td>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabLoad5Kw}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹4.50</td>
                      <td className="p-1 text-right font-sans">{l.sec1Fixed70Kw}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300 font-sans font-bold bg-slate-50/50">
                        {l.sec1CatAg}
                      </td>
                      <td className="p-1 border-r border-slate-300 font-sans">{l.sec1SlabMetered}</td>
                      <td className="p-1 text-right border-r border-slate-300">₹3.30</td>
                      <td className="p-1 text-right font-sans">{l.sec1Fixed10Hp}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="bg-blue-50/70 border-t border-slate-300 px-2.5 py-1 text-[10px] text-blue-950 font-sans">
                  {l.sec1BiMonthlyPolicyNote}
                </div>
              </div>

              {/* 2. Calculation Principles & Statutory Formulas */}
              <div
                className="border-2 border-slate-900 p-2.5 rounded bg-slate-50/40 text-[11px] space-y-1.5"
                data-testid="document-reverse-section-calculation-principles"
              >
                <div className="font-bold text-xs text-blue-950 border-b border-slate-200 pb-1">
                  {l.sec2CalculationTitle}
                </div>
                <p className="leading-snug text-slate-800">
                  <span className="font-bold">{l.sec2EcHeading}</span> {l.sec2EcBody}
                </p>
                <p className="leading-snug text-slate-800">
                  <span className="font-bold">{l.sec2BiMonthlyHeading}</span> {l.sec2BiMonthlyBody}
                </p>
                <p className="leading-snug text-slate-800">
                  <span className="font-bold">{l.sec2FpppaHeading}</span> {l.sec2FpppaBody}
                  <code className="block bg-white p-1 rounded font-mono text-[10px] my-0.5 border border-slate-200">
                    {l.sec2FpppaFormula}
                  </code>
                </p>
                <p className="leading-snug text-slate-800">
                  <span className="font-bold">{l.sec2EdHeading}</span> {l.sec2EdBody}
                </p>
              </div>

              {/* 3. 24x7 Customer Support Helpline Box (Reference C) */}
              <div className="border-2 border-amber-500 bg-amber-50/60 p-2.5 rounded text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                    {l.sec3HelplineTitle}
                  </span>
                  <span className="text-base font-black text-slate-950 font-mono">
                    1912 / 1800 233 155335
                  </span>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {l.sec3HelplineSubtitle}
                  </p>
                </div>
                <ShieldCheck className="w-8 h-8 text-amber-600 shrink-0" />
              </div>

              {/* 4. Consumer Grievance Redressal Forum (CGRF) & Ombudsman */}
              <div
                className="border-2 border-slate-900 p-2.5 rounded bg-white text-[11px] space-y-1.5"
                data-testid="document-reverse-section-helpline-grievance"
              >
                <div className="font-bold text-xs text-blue-950 border-b border-slate-200 pb-1">
                  {l.sec4CgrfTitle}
                </div>
                <p className="leading-snug text-slate-700">
                  {l.sec4Intro}
                </p>
                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[10px] font-mono space-y-0.5">
                  <div><span className="font-bold">{l.sec4ForumLabel}</span> {l.sec4ForumValue}</div>
                  <div><span className="font-bold">{l.sec4AddressLabel}</span> {l.sec4AddressValue}</div>
                  <div><span className="font-bold">{l.sec4PhoneLabel}</span> 02762-222080 to 88 | <span className="font-bold">{l.sec4EmailLabel}</span> cgrf@ugvcl.com</div>
                  <div><span className="font-bold">{l.sec4TimingsLabel}</span> {l.sec4TimingsValue}</div>
                </div>

                <div className="pt-1">
                  <span className="font-bold text-slate-900 block text-[10px] uppercase">{l.sec4OmbudsmanHeading}</span>
                  <p className="text-[10px] text-slate-700 leading-snug">
                    {l.sec4OmbudsmanBody}
                  </p>
                </div>
              </div>
            </div>

            {/* ================= COLUMN 2 ================= */}
            <div className="space-y-3">
              {/* 5. Government Electricity Duty Table (Reference C) */}
              <div
                className="border-2 border-slate-900 rounded overflow-hidden"
                data-testid="document-reverse-section-electricity-duty"
              >
                <div className="bg-slate-100 border-b border-slate-900 px-3 py-1 font-bold text-xs text-blue-950 flex justify-between">
                  <span>{l.sec5EdTitle}</span>
                  <span className="font-mono text-[10px]">{l.sec5GovtBadge}</span>
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                      <th className="p-1.5 text-left border-r border-slate-300">{l.sec5ColCategory}</th>
                      <th className="p-1.5 text-right">{l.sec5ColRate}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                    <tr>
                      <td className="p-1.5 border-r border-slate-300 font-sans">{l.sec5RowResidential}</td>
                      <td className="p-1.5 text-right font-bold text-blue-900">15.00 %</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300 font-sans">{l.sec5RowCommercial}</td>
                      <td className="p-1.5 text-right font-bold text-slate-900">25.00 %</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300 font-sans">{l.sec5RowIndustrial}</td>
                      <td className="p-1.5 text-right font-bold text-slate-900">10.00 %</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300 font-sans">{l.sec5RowReligious}</td>
                      <td className="p-1.5 text-right font-bold text-slate-900">11.25 %</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-slate-300 font-sans">{l.sec5RowAgri}</td>
                      <td className="p-1.5 text-right font-bold text-emerald-700 font-sans">{l.sec5ExemptLabel}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. Six Bi-Monthly Period Consumption Comparison Chart (Reference C) */}
              <div
                className="border-2 border-slate-900 p-2.5 rounded bg-white"
                data-testid="ugvcl-six-period-comparison-chart"
              >
                <div className="font-bold text-xs text-blue-950 border-b border-slate-200 pb-1 flex justify-between items-center gap-2">
                  <span>{chart?.chartTitle || l.sec6TrendTitle}</span>
                  <span className="font-mono text-[9px] font-normal text-slate-500 shrink-0">
                    {l.sec6RecordedHistoryBadge}
                  </span>
                </div>

                <div className="pt-2 space-y-1.5">
                  {/* Legend for the 2 bars per period */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-600 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 border border-blue-800 inline-block shrink-0" />
                      <span>{chart?.bar1LegendLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-amber-600 inline-block shrink-0" />
                      <span>{chart?.bar2LegendLabel}</span>
                    </div>
                  </div>

                  {/* Six Bi-Monthly Periods with 2 Comparison Bars per Period */}
                  <div className="grid grid-cols-6 gap-1.5 h-24 px-2 pt-2 pb-1 bg-slate-50 rounded border border-slate-200 items-end">
                    {(chart?.periods || []).map((slot) => {
                      const scaleMax = Math.max(100, chart?.maxScaleUnitsKwh || 1000);
                      const actualVal = slot.actualUnitsKwh;
                      const compVal = slot.comparisonUnitsKwh;
                      const actualHeightPct =
                        actualVal !== null
                          ? Math.max(8, Math.min(100, Math.round((actualVal / scaleMax) * 100)))
                          : 0;
                      const compHeightPct = Math.max(
                        8,
                        Math.min(100, Math.round((compVal / scaleMax) * 100))
                      );

                      return (
                        <div
                          key={slot.canonicalPeriodMonth}
                          data-testid="ugvcl-chart-period-slot"
                          data-period-month={slot.canonicalPeriodMonth}
                          data-has-actual={String(slot.hasActualData)}
                          className="flex flex-col items-center justify-end h-full min-w-0"
                        >
                          {/* Value labels above the two bars */}
                          <div className="text-[8px] font-mono leading-none mb-0.5 text-center truncate w-full">
                            {slot.hasActualData && actualVal !== null ? (
                              <span className="font-bold text-blue-950">{actualVal}</span>
                            ) : (
                              <span
                                className="text-slate-400 italic"
                                data-testid="ugvcl-chart-missing-indicator"
                              >
                                {l.sec6NoRecordShort}
                              </span>
                            )}
                            <span className="text-slate-400">/{compVal}</span>
                          </div>

                          {/* Two Side-by-Side Comparison Bars */}
                          <div className="flex items-end justify-center gap-0.5 w-full h-14">
                            {slot.hasActualData && actualVal !== null ? (
                              <div
                                data-testid="ugvcl-chart-bar-actual"
                                title={`${slot.periodRangeLabel}: ${actualVal} kWh`}
                                className={`w-2.5 rounded-t transition-all ${
                                  slot.isCurrentPeriod
                                    ? 'bg-blue-700 border border-blue-950'
                                    : 'bg-blue-500 border border-blue-700'
                                }`}
                                style={{ height: `${actualHeightPct}%` }}
                              />
                            ) : (
                              <div
                                data-testid="ugvcl-chart-bar-actual-empty"
                                title={`${slot.periodRangeLabel}: ${chart?.missingDataNote || 'No record'}`}
                                className="w-2.5 h-2 rounded-t border border-dashed border-slate-400 bg-slate-200/60"
                              />
                            )}
                            <div
                              data-testid="ugvcl-chart-bar-comparison"
                              title={`${slot.periodRangeLabel}: ${compVal} kWh`}
                              className="w-2.5 rounded-t bg-amber-400/90 border border-amber-600 transition-all"
                              style={{ height: `${compHeightPct}%` }}
                            />
                          </div>

                          {/* Period Label */}
                          <span
                            className={`text-[7.5px] font-mono tracking-tighter truncate w-full text-center mt-1 ${
                              slot.isCurrentPeriod ? 'font-bold text-blue-950' : 'text-slate-600'
                            }`}
                            title={slot.periodRangeLabel}
                          >
                            {slot.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Metrics & Missing Data Disclosure */}
                  <div className="flex flex-wrap justify-between items-center text-[9px] text-slate-600 font-mono px-1 gap-1">
                    <span>
                      {l.sec6CurrentPeriodLabel}{' '}
                      <strong className="text-blue-950">
                        {chart?.currentPeriodUnitsKwh ?? p.billedUnits} kWh
                      </strong>
                    </span>
                    <span>
                      {l.sec6AvgBiMonthlyLabel}{' '}
                      <strong>{chart?.averageAvailableUnitsKwh ?? p.billedUnits} kWh</strong>
                    </span>
                    <span>
                      {l.sec6BenchmarkLabel}{' '}
                      <strong>{chart?.benchmarkUnitsKwh ?? 800} kWh</strong>
                    </span>
                  </div>
                  <div className="text-[8.5px] text-slate-500 px-1 leading-tight">
                    {chart?.missingDataNote}
                  </div>
                </div>
              </div>

              {/* 7. Approved Digital Payment Channels */}
              <div
                className="border-2 border-slate-900 p-2.5 rounded bg-slate-50/40 text-[11px] space-y-1"
                data-testid="document-reverse-section-payment-modes"
              >
                <div className="font-bold text-xs text-blue-950 border-b border-slate-200 pb-1">
                  {l.sec7DigitalPaymentTitle}
                </div>
                <p className="leading-snug text-slate-800 text-[10px]">
                  {l.sec7Intro}
                </p>
                <ul className="list-disc list-inside text-[10px] text-slate-700 space-y-0.5">
                  <li><span className="font-bold">{l.sec7Item1Bold}</span> {l.sec7Item1Text}</li>
                  <li><span className="font-bold">{l.sec7Item2Bold}</span> {l.sec7Item2Text}</li>
                  <li><span className="font-bold">{l.sec7Item3Bold}</span> {l.sec7Item3Text}</li>
                  <li><span className="font-bold">{l.sec7Item4Bold}</span> {l.sec7Item4Text}</li>
                </ul>
              </div>

              {/* 8. Safety & Conservation Directives */}
              <div
                className="border-2 border-slate-900 p-2.5 rounded bg-white text-[10px] space-y-1"
                data-testid="document-reverse-section-safety-conservation"
              >
                <div className="font-bold text-xs text-blue-950 border-b border-slate-200 pb-1">
                  {l.sec8SafetyTitle}
                </div>
                <p className="leading-snug text-slate-700">
                  <span className="font-bold">{l.sec8Item1Bold}</span> {l.sec8Item1Text}
                </p>
                <p className="leading-snug text-slate-700">
                  <span className="font-bold">{l.sec8Item2Bold}</span> {l.sec8Item2Text}
                </p>
                <p className="leading-snug text-slate-700">
                  <span className="font-bold">{l.sec8Item3Bold}</span> {l.sec8Item3Text}
                </p>
              </div>

              {/* 9. Statutory Disconnection Notice (Section 56(1) Electricity Act 2003) */}
              <div
                className="border border-rose-300 bg-rose-50/70 p-2 rounded text-[10px] text-rose-950 space-y-0.5"
                data-testid="document-reverse-section-legal-notice-disclosure"
              >
                <span className="font-bold uppercase tracking-wider block text-[9px] text-rose-900">
                  {l.sec9DisconnectionTitle}
                </span>
                <p className="leading-snug">
                  {l.sec9DisconnectionBody}
                </p>
              </div>

              {/* 10. DEMO Authenticity Disclosure */}
              <div
                className="border border-amber-300 bg-amber-50 p-2 rounded text-[10px] text-amber-950 space-y-0.5"
                data-testid="official-document-demo-disclosure"
              >
                <span className="font-bold uppercase tracking-wider block text-[9px] text-amber-900">
                  {l.sec10DemoDisclosureTitle}
                </span>
                <p className="leading-snug">
                  {document.demoDisclosureBanner}
                </p>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>{l.page2FooterLeft}</span>
            <span>{l.footerHelplinePortal}</span>
            <span>Ref: {p.billNo}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

