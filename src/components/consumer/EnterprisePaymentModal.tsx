import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  Landmark,
  CreditCard,
  Building2,
  FileDown,
  Receipt,
  ArrowLeft,
  RefreshCw,
  Loader2,
  FlaskConical,
} from 'lucide-react';
import {
  ElectricityConnection,
  PaymentTransaction,
} from '../../types';
import { Language } from '../../i18n/types';
import {
  ReconciledElectricityBill,
  ApplyPaymentToBillResult,
  SimulatedPaymentOutcome,
  validatePaymentAmountSelection,
} from '../../utils/billingEngine';
import {
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_TAGLINE_EN,
} from '../common/UgvclBrandIdentity';
import {
  localizeSubdivision,
  localizeBillMonth,
  localizePaymentMethod,
} from '../../i18n/consumerContentTranslations';
import { FONT_STACKS } from '../../utils/typographyTokens';

export type PaymentModalLifecycleState =
  | 'READY'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING';

interface PaymentModalTranslationSet {
  modalTitle: string;
  demoPaymentBadge: string;
  paymentSummaryTitle: string;
  consumerNameLabel: string;
  consumerNumberLabel: string;
  connectionIdLabel: string;
  billNumberLabel: string;
  billingPeriodLabel: string;
  subdivisionLabel: string;
  billTotalLabel: string;
  previouslyPaidLabel: string;
  currentOutstandingLabel: string;
  dueDateLabel: string;
  selectedPaymentAmountLabel: string;
  selectSettlementModeTitle: string;
  fullPaymentTitle: string;
  fullPaymentDesc: string;
  partialPaymentTitle: string;
  partialPaymentDesc: string;
  enterPartialAmountLabel: string;
  remainingBalanceAfterPaymentLabel: string;
  partialPaymentDueNotice: string;
  selectPaymentMethodTitle: string;
  methodUpiDesc: string;
  methodNetBankingDesc: string;
  methodDebitCardDesc: string;
  methodRtgsDesc: string;
  demoSimulationControlsLabel: string;
  outcomeSuccessLabel: string;
  outcomeFailedLabel: string;
  outcomePendingLabel: string;
  demoDisclosureText: string;
  cancelBtn: string;
  authorizeAndPayBtn: string;
  processingTitle: string;
  processingSubtitle: string;
  doNotCloseNotice: string;
  successTitle: string;
  successSubtitleFull: string;
  successSubtitlePartial: string;
  fullPaymentBadge: string;
  partialPaymentBadge: string;
  paymentRefLabel: string;
  bankRefLabel: string;
  paymentDateTimeLabel: string;
  paymentMethodUsedLabel: string;
  amountPaidNowLabel: string;
  remainingBalanceNowLabel: string;
  viewReceiptBtn: string;
  downloadReceiptPdfBtn: string;
  returnToBillsBtn: string;
  closeBtn: string;
  failedTitle: string;
  failedNoReceiptNotice: string;
  retryPaymentBtn: string;
  backToBillsBtn: string;
  pendingTitle: string;
  pendingExplanation: string;
  pendingNoReceiptNotice: string;
}

export const PAYMENT_MODAL_TRANSLATIONS: Record<
  Language,
  PaymentModalTranslationSet
> = {
  en: {
    modalTitle: 'Electricity Bill Payment',
    demoPaymentBadge: 'DEMO PAYMENT',
    paymentSummaryTitle: 'Bill & Connection Payment Summary',
    consumerNameLabel: 'Consumer Name',
    consumerNumberLabel: 'Consumer Number',
    connectionIdLabel: 'Connection ID',
    billNumberLabel: 'Bill Number',
    billingPeriodLabel: 'Billing Period',
    subdivisionLabel: 'Subdivision / Branch',
    billTotalLabel: 'Total Bill Amount',
    previouslyPaidLabel: 'Previously Paid Amount',
    currentOutstandingLabel: 'Current Outstanding Balance',
    dueDateLabel: 'Due Date',
    selectedPaymentAmountLabel: 'Selected Payment Amount',
    selectSettlementModeTitle: 'Select Payment Amount Option',
    fullPaymentTitle: 'Full Outstanding Balance',
    fullPaymentDesc: 'Settles the entire remaining balance of this bill to ₹0.',
    partialPaymentTitle: 'Partial Payment',
    partialPaymentDesc: 'Pay a custom amount now; remaining balance stays due.',
    enterPartialAmountLabel: 'Enter Partial Payment Amount (₹)',
    remainingBalanceAfterPaymentLabel: 'Remaining Balance After This Payment',
    partialPaymentDueNotice:
      'Note: Partial payment reduces your outstanding balance, but the remaining unpaid balance continues to be due on the original bill due date.',
    selectPaymentMethodTitle: 'Select Payment Method',
    methodUpiDesc: 'Instant VPA / QR authorization (BHIM, GPay, PhonePe, Paytm)',
    methodNetBankingDesc: 'Retail & Corporate Internet Banking (All Major Banks)',
    methodDebitCardDesc: 'RuPay, Visa & Mastercard Domestic Debit Cards',
    methodRtgsDesc: 'NEFT / RTGS Electronic Enterprise Remittance',
    demoSimulationControlsLabel: 'DEMO Verification Outcome Mode',
    outcomeSuccessLabel: 'Standard Success',
    outcomeFailedLabel: 'Simulate Failed',
    outcomePendingLabel: 'Simulate Pending',
    demoDisclosureText:
      'DEMO PAYMENT DISCLOSURE: This transaction is simulated inside VidyutFlow 2.0 for utility workflow demonstration. No real bank account or payment gateway is charged.',
    cancelBtn: 'Cancel',
    authorizeAndPayBtn: 'Authorize & Pay Now',
    processingTitle: 'Processing DEMO Bill Payment...',
    processingSubtitle:
      'Verifying payment instruction and updating UGVCL billing ledger.',
    doNotCloseNotice: 'Duplicate submissions are locked while authorization is in progress.',
    successTitle: 'Payment Successful',
    successSubtitleFull:
      'Your electricity bill has been settled in full and your official receipt is ready.',
    successSubtitlePartial:
      'Your partial payment has been recorded and your updated balance is reflected below.',
    fullPaymentBadge: 'Full Payment',
    partialPaymentBadge: 'Partial Payment',
    paymentRefLabel: 'Payment Transaction ID',
    bankRefLabel: 'Settlement Reference',
    paymentDateTimeLabel: 'Payment Date & Time',
    paymentMethodUsedLabel: 'Payment Method',
    amountPaidNowLabel: 'Amount Paid in This Transaction',
    remainingBalanceNowLabel: 'Remaining Outstanding Balance',
    viewReceiptBtn: 'View Receipt',
    downloadReceiptPdfBtn: 'Download Receipt PDF',
    returnToBillsBtn: 'Return to Bills',
    closeBtn: 'Close',
    failedTitle: 'Payment Failed',
    failedNoReceiptNotice:
      'No payment receipt was generated and your bill outstanding balance remains unchanged.',
    retryPaymentBtn: 'Retry Payment',
    backToBillsBtn: 'Back to Bills',
    pendingTitle: 'Payment Pending Verification',
    pendingExplanation:
      'Your payment instruction is awaiting settlement confirmation. The bill balance will only be reduced once settlement is verified.',
    pendingNoReceiptNotice:
      'No payment receipt is issued for unverified pending transactions.',
  },
  gu: {
    modalTitle: 'વીજ બિલ ચુકવણી',
    demoPaymentBadge: 'DEMO ચુકવણી',
    paymentSummaryTitle: 'બિલ અને વીજ જોડાણ ચુકવણી સારાંશ',
    consumerNameLabel: 'ગ્રાહકનું નામ',
    consumerNumberLabel: 'ગ્રાહક નંબર',
    connectionIdLabel: 'કનેક્શન ID',
    billNumberLabel: 'બિલ નંબર',
    billingPeriodLabel: 'બિલિંગ ગાળો',
    subdivisionLabel: 'સબડિવિઝન / શાખા',
    billTotalLabel: 'કુલ બિલ રકમ',
    previouslyPaidLabel: 'અગાઉ ચૂકવેલ રકમ',
    currentOutstandingLabel: 'હાલની બાકી ચૂકવવાપાત્ર રકમ',
    dueDateLabel: 'ચુકવણી છેલ્લી તારીખ',
    selectedPaymentAmountLabel: 'પસંદ કરેલ ચુકવણી રકમ',
    selectSettlementModeTitle: 'ચુકવણી રકમ વિકલ્પ પસંદ કરો',
    fullPaymentTitle: 'સંપૂર્ણ બાકી રકમ ચુકવણી',
    fullPaymentDesc: 'આ બિલની સંપૂર્ણ બાકી રકમ ચૂકવી બાકી રકમ ₹0 કરે છે.',
    partialPaymentTitle: 'આંશિક ચુકવણી (Partial Payment)',
    partialPaymentDesc: 'હાલમાં આંશિક રકમ ચૂકવો; બાકી રકમ ચૂકવવાપાત્ર રહેશે.',
    enterPartialAmountLabel: 'આંશિક ચુકવણી રકમ દાખલ કરો (₹)',
    remainingBalanceAfterPaymentLabel: 'આ ચુકવણી પછી બાકી રહેતી રકમ',
    partialPaymentDueNotice:
      'નોંધ: આંશિક ચુકવણીથી બાકી રકમ ઘટે છે, પરંતુ બાકી રહેલી રકમ મૂળ ડ્યુ ડેટ મુજબ ચૂકવવાપાત્ર રહે છે.',
    selectPaymentMethodTitle: 'ચુકવણી પદ્ધતિ પસંદ કરો',
    methodUpiDesc: 'તાત્કાલિક UPI / BHIM QR અને VPA ચુકવણી',
    methodNetBankingDesc: 'નેટ બેન્કિંગ (તમામ મુખ્ય બેન્કો)',
    methodDebitCardDesc: 'RuPay, Visa અને Mastercard ડેબિટ કાર્ડ',
    methodRtgsDesc: 'NEFT / RTGS ઇલેક્ટ્રોનિક ચુકવણી',
    demoSimulationControlsLabel: 'DEMO પરિણામ પરીક્ષણ મોડ',
    outcomeSuccessLabel: 'સફળ ચુકવણી (Success)',
    outcomeFailedLabel: 'નિષ્ફળ સિમ્યુલેશન (Failed)',
    outcomePendingLabel: 'પેન્ડિંગ સિમ્યુલેશન (Pending)',
    demoDisclosureText:
      'DEMO ચુકવણી સૂચના: આ વ્યવહાર VidyutFlow 2.0 માં માત્ર નિદર્શન માટે સિમ્યુલેટેડ છે. કોઈ વાસ્તવિક બેંક ખાતામાંથી રકમ કપાતી નથી.',
    cancelBtn: 'રદ કરો',
    authorizeAndPayBtn: 'મંજૂર કરો અને ચૂકવો',
    processingTitle: 'DEMO બિલ ચુકવણી પ્રક્રિયામાં છે...',
    processingSubtitle: 'ચુકવણી વિગતોની ચકાસણી અને UGVCL ખાતાવહી અપડેટ થઈ રહી છે.',
    doNotCloseNotice: 'પ્રક્રિયા દરમિયાન ડુપ્લિકેટ ચુકવણી લોક કરવામાં આવી છે.',
    successTitle: 'ચુકવણી સફળ (Payment Successful)',
    successSubtitleFull:
      'તમારું વીજ બિલ સંપૂર્ણપણે ચૂકવાઈ ગયું છે અને સત્તાવાર રસીદ તૈયાર છે.',
    successSubtitlePartial:
      'તમારી આંશિક ચુકવણી નોંધાઈ ગઈ છે અને અપડેટ થયેલ બાકી રકમ નીચે દર્શાવેલ છે.',
    fullPaymentBadge: 'સંપૂર્ણ ચુકવણી',
    partialPaymentBadge: 'આંશિક ચુકવણી',
    paymentRefLabel: 'ટ્રાન્ઝેક્શન ID',
    bankRefLabel: 'સેટલમેન્ટ રેફરન્સ',
    paymentDateTimeLabel: 'ચુકવણી તારીખ અને સમય',
    paymentMethodUsedLabel: 'ચુકવણી પદ્ધતિ',
    amountPaidNowLabel: 'આ વ્યવહારમાં ચૂકવેલ રકમ',
    remainingBalanceNowLabel: 'હવે બાકી રહેતી રકમ',
    viewReceiptBtn: 'રસીદ જુઓ',
    downloadReceiptPdfBtn: 'રસીદ PDF ડાઉનલોડ કરો',
    returnToBillsBtn: 'બિલ પૃષ્ઠ પર પાછા ફરો',
    closeBtn: 'બંધ કરો',
    failedTitle: 'ચુકવણી નિષ્ફળ (Payment Failed)',
    failedNoReceiptNotice:
      'કોઈ રસીદ જનરેટ કરવામાં આવી નથી અને તમારા બિલની બાકી રકમ યથાવત છે.',
    retryPaymentBtn: 'ફરી પ્રયાસ કરો',
    backToBillsBtn: 'બિલ પૃષ્ઠ પર પાછા ફરો',
    pendingTitle: 'ચુકવણી ચકાસણી હેઠળ (Payment Pending)',
    pendingExplanation:
      'તમારી ચુકવણી સેટલમેન્ટ ચકાસણીની રાહ જોઈ રહી છે. ચકાસણી પૂર્ણ થયા પછી જ બિલની બાકી રકમ ઘટાડવામાં આવશે.',
    pendingNoReceiptNotice: 'પેન્ડિંગ વ્યવહાર માટે સફળ ચુકવણી રસીદ જારી કરવામાં આવતી નથી.',
  },
  hi: {
    modalTitle: 'विद्युत बिल भुगतान',
    demoPaymentBadge: 'DEMO भुगतान',
    paymentSummaryTitle: 'बिल एवं कनेक्शन भुगतान सारांश',
    consumerNameLabel: 'उपभोक्ता का नाम',
    consumerNumberLabel: 'उपभोक्ता संख्या',
    connectionIdLabel: 'कनेक्शन ID',
    billNumberLabel: 'बिल संख्या',
    billingPeriodLabel: 'बिलिंग अवधि',
    subdivisionLabel: 'सबडिवीजन / शाखा',
    billTotalLabel: 'कुल बिल राशि',
    previouslyPaidLabel: 'पूर्व में भुगतान की गई राशि',
    currentOutstandingLabel: 'वर्तमान शेष देय राशि',
    dueDateLabel: 'देय तिथि (Due Date)',
    selectedPaymentAmountLabel: 'चयनित भुगतान राशि',
    selectSettlementModeTitle: 'भुगतान राशि विकल्प चुनें',
    fullPaymentTitle: 'संपूर्ण शेष राशि भुगतान',
    fullPaymentDesc: 'इस बिल की पूरी शेष राशि का निपटान कर बकाया ₹0 करता है।',
    partialPaymentTitle: 'आंशिक भुगतान (Partial Payment)',
    partialPaymentDesc: 'अभी आंशिक राशि का भुगतान करें; शेष राशि देय रहेगी।',
    enterPartialAmountLabel: 'आंशिक भुगतान राशि दर्ज करें (₹)',
    remainingBalanceAfterPaymentLabel: 'इस भुगतान के बाद शेष राशि',
    partialPaymentDueNotice:
      'नोट: आंशिक भुगतान से आपकी बकाया राशि कम हो जाती है, किंतु शेष राशि मूल देय तिथि पर देय रहेगी।',
    selectPaymentMethodTitle: 'भुगतान माध्यम चुनें',
    methodUpiDesc: 'तत्काल UPI / BHIM QR एवं VPA भुगतान',
    methodNetBankingDesc: 'नेट बैंकिंग (सभी प्रमुख भारतीय बैंक)',
    methodDebitCardDesc: 'RuPay, Visa एवं Mastercard डेबिट कार्ड',
    methodRtgsDesc: 'NEFT / RTGS इलेक्ट्रॉनिक भुगतान',
    demoSimulationControlsLabel: 'DEMO परिणाम परीक्षण मोड',
    outcomeSuccessLabel: 'सफल भुगतान (Success)',
    outcomeFailedLabel: 'विफल सिम्युलेशन (Failed)',
    outcomePendingLabel: 'लंबित सिम्युलेशन (Pending)',
    demoDisclosureText:
      'DEMO भुगतान सूचना: यह लेनदेन VidyutFlow 2.0 में केवल प्रदर्शन के लिए सिम्युलेटेड है। किसी वास्तविक बैंक खाते से राशि नहीं काटी जाती है।',
    cancelBtn: 'रद्द करें',
    authorizeAndPayBtn: 'अधिकृत करें और अभी भुगतान करें',
    processingTitle: 'DEMO बिल भुगतान प्रक्रिया में है...',
    processingSubtitle: 'भुगतान निर्देशों का सत्यापन और UGVCL लेजर अपडेट किया जा रहा है।',
    doNotCloseNotice: 'प्रक्रिया के दौरान डुप्लिकेट सबमिशन लॉक किया गया है।',
    successTitle: 'भुगतान सफल (Payment Successful)',
    successSubtitleFull:
      'आपका बिजली बिल पूरी तरह से जमा हो गया है और आपकी आधिकारिक रसीद तैयार है।',
    successSubtitlePartial:
      'आपका आंशिक भुगतान दर्ज कर लिया गया है और अद्यतन शेष राशि नीचे दिखाई गई है।',
    fullPaymentBadge: 'पूर्ण भुगतान',
    partialPaymentBadge: 'आंशिक भुगतान',
    paymentRefLabel: 'भुगतान लेनदेन ID',
    bankRefLabel: 'निपटान संदर्भ',
    paymentDateTimeLabel: 'भुगतान तिथि एवं समय',
    paymentMethodUsedLabel: 'भुगतान माध्यम',
    amountPaidNowLabel: 'इस लेनदेन में भुगतान की गई राशि',
    remainingBalanceNowLabel: 'शेष बकाया राशि',
    viewReceiptBtn: 'रसीद देखें',
    downloadReceiptPdfBtn: 'रसीद PDF डाउनलोड करें',
    returnToBillsBtn: 'बिल पृष्ठ पर लौटें',
    closeBtn: 'बंद करें',
    failedTitle: 'भुगतान विफल (Payment Failed)',
    failedNoReceiptNotice:
      'कोई भुगतान रसीद जनरेट नहीं की गई है और आपके बिल की बकाया राशि अपरिवर्तित है।',
    retryPaymentBtn: 'पुनः प्रयास करें',
    backToBillsBtn: 'बिल पृष्ठ पर लौटें',
    pendingTitle: 'भुगतान सत्यापन लंबित (Payment Pending)',
    pendingExplanation:
      'आपका भुगतान निपटान पुष्टि की प्रतीक्षा में है। सत्यापन पूर्ण होने के बाद ही बिल की शेष राशि कम की जाएगी।',
    pendingNoReceiptNotice: 'लंबित लेनदेन के लिए भुगतान रसीद जारी नहीं की जाती है।',
  },
  mr: {
    modalTitle: 'वीज बिल पेमेंट',
    demoPaymentBadge: 'DEMO पेमेंट',
    paymentSummaryTitle: 'बिल आणि कनेक्शन पेमेंट सारांश',
    consumerNameLabel: 'ग्राहकाचे नाव',
    consumerNumberLabel: 'ग्राहक क्रमांक',
    connectionIdLabel: 'कनेक्शन ID',
    billNumberLabel: 'बिल क्रमांक',
    billingPeriodLabel: 'बिलिंग कालावधी',
    subdivisionLabel: 'सबडिव्हिजन / शाखा',
    billTotalLabel: 'एकूण बिल रक्कम',
    previouslyPaidLabel: 'पूर्वी भरलेली रक्कम',
    currentOutstandingLabel: 'सध्याची उर्वरित देय रक्कम',
    dueDateLabel: 'देय तारीख (Due Date)',
    selectedPaymentAmountLabel: 'निवडलेली पेमेंट रक्कम',
    selectSettlementModeTitle: 'पेमेंट रक्कम पर्याय निवडा',
    fullPaymentTitle: 'संपूर्ण थकीत रक्कम पेमेंट',
    fullPaymentDesc: 'या बिलाची संपूर्ण उर्वरित रक्कम भरून शिल्लक ₹0 करते.',
    partialPaymentTitle: 'अंशतः पेमेंट (Partial Payment)',
    partialPaymentDesc: 'आता ठराविक रक्कम भरा; उर्वरित रक्कम देय राहील.',
    enterPartialAmountLabel: 'अंशतः पेमेंट रक्कम प्रविष्ट करा (₹)',
    remainingBalanceAfterPaymentLabel: 'या पेमेंटनंतर उर्वरित रक्कम',
    partialPaymentDueNotice:
      'टीप: अंशतः पेमेंटमुळे तुमची थकीत रक्कम कमी होते, परंतु उर्वरित रक्कम मूळ देय तारखेनुसार देय राहते.',
    selectPaymentMethodTitle: 'पेमेंट पद्धत निवडा',
    methodUpiDesc: 'त्वरित UPI / BHIM QR आणि VPA पेमेंट',
    methodNetBankingDesc: 'नेट बँकिंग (सर्व प्रमुख भारतीय बँका)',
    methodDebitCardDesc: 'RuPay, Visa आणि Mastercard डेबिट कार्ड',
    methodRtgsDesc: 'NEFT / RTGS इलेक्ट्रॉनिक पेमेंट',
    demoSimulationControlsLabel: 'DEMO परिणाम चाचणी मोड',
    outcomeSuccessLabel: 'यशस्वी पेमेंट (Success)',
    outcomeFailedLabel: 'अयशस्वी सिम्युलेशन (Failed)',
    outcomePendingLabel: 'प्रलंबित सिम्युलेशन (Pending)',
    demoDisclosureText:
      'DEMO पेमेंट सूचना: हा व्यवहार VidyutFlow 2.0 मध्ये केवळ प्रात्यक्षिकासाठी सिम्युलेटेड आहे. कोणत्याही प्रत्यक्ष बँक खात्यातून रक्कम वजा केली जात नाही.',
    cancelBtn: 'रद्द करा',
    authorizeAndPayBtn: 'मंजूर करा आणि आता भरा',
    processingTitle: 'DEMO बिल पेमेंट सुरू आहे...',
    processingSubtitle: 'पेमेंट तपशीलांची पडताळणी आणि UGVCL लेजर अपडेट होत आहे.',
    doNotCloseNotice: 'प्रक्रिया सुरू असताना दुहेरी पेमेंट लॉक केले आहे.',
    successTitle: 'पेमेंट यशस्वी (Payment Successful)',
    successSubtitleFull:
      'तुमचे वीज बिल पूर्णपणे भरले गेले आहे आणि अधिकृत पावती तयार आहे.',
    successSubtitlePartial:
      'तुमचे अंशतः पेमेंट नोंदवले गेले आहे आणि अद्ययावत शिल्लक रक्कम खाली दर्शवली आहे.',
    fullPaymentBadge: 'पूर्ण पेमेंट',
    partialPaymentBadge: 'अंशतः पेमेंट',
    paymentRefLabel: 'पेमेंट व्यवहार ID',
    bankRefLabel: 'सेटलमेंट संदर्भ',
    paymentDateTimeLabel: 'पेमेंट तारीख आणि वेळ',
    paymentMethodUsedLabel: 'पेमेंट पद्धत',
    amountPaidNowLabel: 'या व्यवहारात भरलेली रक्कम',
    remainingBalanceNowLabel: 'उर्वरित थकीत रक्कम',
    viewReceiptBtn: 'पावती पहा',
    downloadReceiptPdfBtn: 'पावती PDF डाउनलोड करा',
    returnToBillsBtn: 'बिल पृष्ठावर परत जा',
    closeBtn: 'बंद करा',
    failedTitle: 'पेमेंट अयशस्वी (Payment Failed)',
    failedNoReceiptNotice:
      'कोणतीही पेमेंट पावती तयार केलेली नाही आणि तुमच्या बिलाची थकीत रक्कम बदललेली नाही.',
    retryPaymentBtn: 'पुन्हा प्रयत्न करा',
    backToBillsBtn: 'बिल पृष्ठावर परत जा',
    pendingTitle: 'पेमेंट पडताळणी प्रलंबित (Payment Pending)',
    pendingExplanation:
      'तुमचे पेमेंट सेटलमेंट पडताळणीच्या प्रतीक्षेत आहे. पडताळणी पूर्ण झाल्यावरच बिलाची शिल्लक रक्कम कमी केली जाईल.',
    pendingNoReceiptNotice: 'प्रलंबित व्यवहारासाठी पेमेंट पावती दिली जात नाही.',
  },
};

export interface EnterprisePaymentModalProps {
  isOpen: boolean;
  bill: ReconciledElectricityBill | null;
  connection: ElectricityConnection | null;
  existingPayments: PaymentTransaction[];
  language: Language;
  referenceDate?: string;
  onClose: () => void;
  onExecutePayment: (params: {
    billNo: string;
    paymentMethod: PaymentTransaction['paymentMethod'];
    amountToPay?: number;
    simulatedOutcome: SimulatedPaymentOutcome;
  }) => ApplyPaymentToBillResult;
  onViewReceipt: (
    arg1: any,
    arg2: any
  ) => void;
  onDownloadReceiptPdf: (
    arg1: any,
    arg2: any
  ) => void;
}

export const EnterprisePaymentModal: React.FC<EnterprisePaymentModalProps> = ({
  isOpen,
  bill,
  connection,
  existingPayments,
  language,
  referenceDate = '28-Oct-2026',
  onClose,
  onExecutePayment,
  onViewReceipt,
  onDownloadReceiptPdf,
}) => {
  const submitLockRef = React.useRef(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [lifecycleState, setLifecycleState] =
    useState<PaymentModalLifecycleState>('READY');
  const setStepState = setLifecycleState;
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [selectedGateway, setSelectedGateway] =
    useState<PaymentTransaction['paymentMethod']>('UPI / BHIM');
  const [simulatedOutcome, setSimulatedOutcome] =
    useState<SimulatedPaymentOutcome>('SUCCESS');
  const [lastPaymentResult, setLastPaymentResult] =
    useState<ApplyPaymentToBillResult | null>(null);
  const [snapshotBillBeforePay, setSnapshotBillBeforePay] =
    useState<ReconciledElectricityBill | null>(null);

  const pm =
    PAYMENT_MODAL_TRANSLATIONS[language] || PAYMENT_MODAL_TRANSLATIONS.en;

  // Reset modal state cleanly whenever opened for a bill
  useEffect(() => {
    if (isOpen && bill) {
      setLifecycleState('READY');
      setPaymentMode('FULL');
      const suggestedPartial = Math.max(
        1,
        Math.round((bill.outstandingBalance || bill.totalAmount || 200) / 2)
      );
      setCustomAmountStr(String(suggestedPartial));
      setSelectedGateway('UPI / BHIM');
      setSimulatedOutcome('SUCCESS');
      setLastPaymentResult(null);
      setSnapshotBillBeforePay(bill);
    }
  }, [isOpen, bill?.billNo]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lifecycleState !== 'PROCESSING') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lifecycleState, onClose]);

  const activeBill = snapshotBillBeforePay || bill;

  const amountValidation = useMemo(() => {
    if (!activeBill) {
      return {
        isValid: false,
        mode: paymentMode,
        billTotalAmount: 0,
        previouslyPaidAmount: 0,
        currentOutstandingAmount: 0,
        remainingPrincipal: 0,
        accruedLateCharges: 0,
        waivedOrSettledCharges: 0,
        totalOutstandingWithCharges: 0,
        originalDueDate: '—',
        daysOverdue: 0,
        calculationReferenceDate: referenceDate,
        selectedPaymentAmount: 0,
        remainingBalanceAfterPayment: 0,
        remainingTotalWithChargesAfterPayment: 0,
        isFullSettlement: false,
        validationError: 'No bill selected.',
      };
    }
    return validatePaymentAmountSelection({
      bill: activeBill,
      existingPayments,
      mode: paymentMode,
      customAmountInput: customAmountStr,
      referenceDate,
      includeLateCharges: true,
    });
  }, [activeBill, existingPayments, paymentMode, customAmountStr, referenceDate]);

  if (!isOpen || !activeBill) return null;

  const consumerName =
    connection?.consumerName || 'Registered UGVCL Consumer';
  const consumerNo = activeBill.consumerNo || connection?.consumerNo || '—';
  const connectionId =
    activeBill.connectionId || connection?.connectionId || consumerNo;
  const subdivisionDisplay = localizeSubdivision(
    connection?.subdivision || 'Mehsana City North',
    language
  );
  const billingPeriodDisplay = localizeBillMonth(activeBill.billMonth, language);

  const handleAuthorizePayment = () => {
    if (submitLockRef.current || lifecycleState === 'PROCESSING' || !amountValidation.isValid) return;

    submitLockRef.current = true;
    setStepState('PROCESSING');
    const amountToPay =
      paymentMode === 'PARTIAL'
        ? amountValidation.selectedPaymentAmount
        : undefined;

    // Brief, deterministic processing step so the user sees the PROCESSING state before result transition
    setTimeout(() => {
      try {
        const result = onExecutePayment({
          billNo: activeBill.billNo,
          paymentMethod: selectedGateway,
          amountToPay,
          simulatedOutcome,
        });
        setLastPaymentResult(result);

        if (result.outcome === 'SUCCESS' && result.success) {
          setStepState('SUCCESS');
        } else if (result.outcome === 'PENDING') {
          setStepState('PENDING');
        } else {
          setStepState('FAILED');
        }
      } finally {
        submitLockRef.current = false;
      }
    }, 280);
  };

  const paymentMethods: Array<{
    id: PaymentTransaction['paymentMethod'];
    icon: React.ReactNode;
    desc: string;
  }> = [
    {
      id: 'UPI / BHIM',
      icon: <Smartphone className="w-4 h-4" />,
      desc: pm.methodUpiDesc,
    },
    {
      id: 'Net Banking',
      icon: <Landmark className="w-4 h-4" />,
      desc: pm.methodNetBankingDesc,
    },
    {
      id: 'Debit Card',
      icon: <CreditCard className="w-4 h-4" />,
      desc: pm.methodDebitCardDesc,
    },
    {
      id: 'RTGS/NEFT',
      icon: <Building2 className="w-4 h-4" />,
      desc: pm.methodRtgsDesc,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-payment-modal-title"
      data-testid="enterprise-payment-modal"
      data-lifecycle-state={lifecycleState}
      style={{ fontFamily: FONT_STACKS[language] }}
    >
      <div className="relative w-full max-w-2xl my-auto bg-white dark:bg-[#0F1B33] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Official UGVCL Corporate Header */}
        <div className="bg-slate-900 text-white px-5 py-4 border-b-4 border-amber-500 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
              {!logoFailed ? (
                <img
                  src={UGVCL_LOGO_ASSET_PATH}
                  alt="UGVCL Official Logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Building2 className="w-6 h-6 text-blue-700" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="enterprise-payment-modal-title"
                  className="text-sm sm:text-base font-extrabold text-white tracking-tight"
                >
                  {pm.modalTitle}
                </h2>
                <span
                  className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  data-testid="payment-modal-demo-badge"
                >
                  {pm.demoPaymentBadge}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200 truncate mt-0.5">
                {UGVCL_COMPANY_NAME_EN} ({UGVCL_COMPANY_NAME_GU})
              </p>
              <p className="text-[11px] text-amber-300/90 font-medium truncate">
                {UGVCL_TAGLINE_EN}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={lifecycleState === 'PROCESSING'}
            aria-label={pm.closeBtn}
            data-testid="payment-modal-header-close-btn"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* STATE 1: READY */}
          {lifecycleState === 'READY' && (
            <>
              {/* Comprehensive 11-Field Payment Summary Panel */}
              <div
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 overflow-hidden"
                data-testid="payment-summary-panel"
              >
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {pm.paymentSummaryTitle}
                  </span>
                  <span
                    className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400"
                    data-testid="summary-bill-number"
                  >
                    {activeBill.billNo}
                  </span>
                </div>

                {/* Primary Financial Highlight Strip (Canonical 9-Field Breakdown) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <div className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      1. {pm.billTotalLabel}
                    </span>
                    <span
                      className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-100"
                      data-testid="summary-total-bill-amount"
                    >
                      ₹{amountValidation.billTotalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      2. {pm.previouslyPaidLabel}
                    </span>
                    <span
                      className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400"
                      data-testid="summary-previously-paid-amount"
                    >
                      ₹{amountValidation.previouslyPaidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      3. Remaining Principal
                    </span>
                    <span
                      className="text-sm font-extrabold font-mono text-amber-700 dark:text-amber-400"
                      data-testid="summary-remaining-principal"
                    >
                      ₹{amountValidation.remainingPrincipal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 block">
                      4. Accrued Late Charges (DPS)
                    </span>
                    <span
                      className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400"
                      data-testid="summary-accrued-late-charges"
                    >
                      +₹{amountValidation.accruedLateCharges.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      5. Waived / Settled Charges
                    </span>
                    <span
                      className="text-sm font-extrabold font-mono text-slate-700 dark:text-slate-300"
                      data-testid="summary-waived-charges"
                    >
                      ₹{amountValidation.waivedOrSettledCharges.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                      6. {pm.currentOutstandingLabel}
                    </span>
                    <span
                      className="text-base font-extrabold font-mono text-blue-700 dark:text-blue-400"
                      data-testid="summary-outstanding-balance"
                    >
                      ₹{amountValidation.totalOutstandingWithCharges.toLocaleString('en-IN')}
                    </span>
                    <span
                      className="text-[11px] font-mono text-blue-600 dark:text-blue-300 block"
                      data-testid="summary-selected-payment-amount"
                    >
                      {pm.selectedPaymentAmountLabel}: ₹{amountValidation.selectedPaymentAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Consumer & Connection Metadata Grid + Fields 7, 8, 9 */}
                <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {pm.consumerNameLabel}
                    </span>
                    <span
                      className="font-semibold text-slate-800 dark:text-slate-200 break-words"
                      data-testid="summary-consumer-name"
                    >
                      {consumerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {pm.consumerNumberLabel}
                    </span>
                    <span
                      className="font-mono font-semibold text-slate-800 dark:text-slate-200"
                      data-testid="summary-consumer-number"
                    >
                      {consumerNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {pm.connectionIdLabel}
                    </span>
                    <span
                      className="font-mono font-semibold text-slate-800 dark:text-slate-200"
                      data-testid="summary-connection-id"
                    >
                      {connectionId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {pm.billingPeriodLabel} · {pm.subdivisionLabel}
                    </span>
                    <span
                      className="font-semibold text-slate-800 dark:text-slate-200"
                      data-testid="summary-billing-period"
                    >
                      {billingPeriodDisplay} (<span data-testid="summary-subdivision">{subdivisionDisplay}</span>)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      7. {pm.dueDateLabel} & 8. Days Overdue
                    </span>
                    <span
                      className="font-mono font-semibold text-slate-800 dark:text-slate-200"
                      data-testid="summary-due-date"
                    >
                      {activeBill.dueDate} ({amountValidation.daysOverdue}d overdue)
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      9. Last Calculation Date
                    </span>
                    <span
                      className="font-mono font-semibold text-slate-800 dark:text-slate-200"
                      data-testid="summary-calculation-date"
                    >
                      {amountValidation.calculationReferenceDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full vs Partial Payment Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  {pm.selectSettlementModeTitle}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('FULL')}
                    data-testid="payment-mode-full-btn"
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMode === 'FULL'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {pm.fullPaymentTitle}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-blue-700 dark:text-blue-400">
                        ₹{amountValidation.currentOutstandingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {pm.fullPaymentDesc}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('PARTIAL')}
                    data-testid="payment-mode-partial-btn"
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentMode === 'PARTIAL'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {pm.partialPaymentTitle}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                        Custom ₹
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {pm.partialPaymentDesc}
                    </p>
                  </button>
                </div>

                {paymentMode === 'PARTIAL' && (
                  <div
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3"
                    data-testid="partial-payment-input-panel"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <label
                          htmlFor="partial-payment-amount-input"
                          className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                        >
                          {pm.enterPartialAmountLabel}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                            ₹
                          </span>
                          <input
                            id="partial-payment-amount-input"
                            data-testid="partial-payment-amount-input"
                            type="number"
                            min={1}
                            max={amountValidation.currentOutstandingAmount}
                            step="1"
                            value={customAmountStr}
                            onChange={(e) => setCustomAmountStr(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                          {pm.remainingBalanceAfterPaymentLabel}
                        </span>
                        <span
                          className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-400"
                          data-testid="partial-live-remaining-balance"
                        >
                          ₹
                          {amountValidation.remainingBalanceAfterPayment.toLocaleString(
                            'en-IN'
                          )}
                        </span>
                      </div>
                    </div>

                    {amountValidation.validationError && (
                      <div
                        className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2"
                        data-testid="payment-amount-validation-error"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{amountValidation.validationError}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {pm.partialPaymentDueNotice}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Method Cards */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                  {pm.selectPaymentMethodTitle}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {paymentMethods.map((m) => {
                    const isSelected = selectedGateway === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedGateway(m.id)}
                        data-testid={`payment-method-${m.id
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')}`}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500/40'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {m.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {localizePaymentMethod(m.id, language)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                            {m.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controlled DEMO Outcome Verification Selector (Clearly Separated for QA/Testing) */}
              <div
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                data-testid="demo-outcome-selector-bar"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <FlaskConical className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{pm.demoSimulationControlsLabel}:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'SUCCESS', label: pm.outcomeSuccessLabel },
                      { id: 'FAILED', label: pm.outcomeFailedLabel },
                      { id: 'PENDING', label: pm.outcomePendingLabel },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSimulatedOutcome(opt.id)}
                      data-testid={`simulate-outcome-${opt.id.toLowerCase()}-btn`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                        simulatedOutcome === opt.id
                          ? opt.id === 'SUCCESS'
                            ? 'bg-emerald-600 text-white'
                            : opt.id === 'FAILED'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Honest DEMO Disclosure */}
              <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{pm.demoDisclosureText}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="payment-modal-cancel-btn"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {pm.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizePayment}
                  disabled={!amountValidation.isValid}
                  data-testid="payment-modal-authorize-btn"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {pm.authorizeAndPayBtn} (₹
                    {amountValidation.selectedPaymentAmount.toLocaleString('en-IN')})
                  </span>
                </button>
              </div>
            </>
          )}

          {/* STATE 2: PROCESSING */}
          {lifecycleState === 'PROCESSING' && (
            <div
              className="py-10 px-4 text-center space-y-4"
              data-testid="payment-processing-state"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {pm.processingTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {pm.processingSubtitle}
                </p>
              </div>
              <div className="max-w-sm mx-auto p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{pm.selectedPaymentAmountLabel}:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{amountValidation.selectedPaymentAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{pm.paymentMethodUsedLabel}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {localizePaymentMethod(selectedGateway, language)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {pm.doNotCloseNotice}
              </p>
            </div>
          )}

          {/* STATE 3: SUCCESS */}
          {lifecycleState === 'SUCCESS' && lastPaymentResult?.paymentTransaction && (
            <div
              className="space-y-5"
              data-testid="payment-success-state"
            >
              <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className="text-base font-extrabold text-emerald-950 dark:text-emerald-200"
                      data-testid="payment-success-heading"
                    >
                      {pm.successTitle}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        lastPaymentResult.isFullyPaid
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700'
                          : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700'
                      }`}
                      data-testid="payment-success-settlement-badge"
                    >
                      {lastPaymentResult.isFullyPaid
                        ? pm.fullPaymentBadge
                        : pm.partialPaymentBadge}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/90 dark:text-emerald-300 mt-1 leading-relaxed">
                    {lastPaymentResult.isFullyPaid
                      ? pm.successSubtitleFull
                      : pm.successSubtitlePartial}
                  </p>
                </div>
              </div>

              {/* Recorded Transaction Details Grid */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.amountPaidNowLabel}
                  </span>
                  <span
                    className="text-lg font-extrabold font-mono text-emerald-700 dark:text-emerald-400"
                    data-testid="payment-success-amount-paid"
                  >
                    ₹{lastPaymentResult.paidAmountApplied.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.remainingBalanceNowLabel}
                  </span>
                  <span
                    className={`text-lg font-extrabold font-mono ${
                      lastPaymentResult.remainingBalance === 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                    data-testid="payment-success-remaining-balance"
                  >
                    ₹{lastPaymentResult.remainingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.paymentRefLabel}
                  </span>
                  <span
                    className="font-mono font-bold text-slate-900 dark:text-white"
                    data-testid="payment-success-tx-id"
                  >
                    {lastPaymentResult.paymentTransaction.txId}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.bankRefLabel}
                  </span>
                  <span
                    className="font-mono font-semibold text-slate-700 dark:text-slate-300"
                    data-testid="payment-success-bank-ref"
                  >
                    {lastPaymentResult.paymentTransaction.bankReference}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.consumerNameLabel}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {consumerName} ({consumerNo})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.billNumberLabel}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {activeBill.billNo} ({billingPeriodDisplay})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.paymentDateTimeLabel}
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {lastPaymentResult.paymentTransaction.date}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.paymentMethodUsedLabel}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {localizePaymentMethod(
                      lastPaymentResult.paymentTransaction.paymentMethod,
                      language
                    )}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{pm.demoDisclosureText}</span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const paymentResult = {
                      createdPayment: lastPaymentResult.paymentTransaction!,
                    };
                    const updatedBillForReceipt = lastPaymentResult.reconciledBill;
                    onViewReceipt(paymentResult.createdPayment, updatedBillForReceipt);
                  }}
                  data-testid="payment-success-view-receipt-btn"
                  className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{pm.viewReceiptBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const paymentResult = {
                      createdPayment: lastPaymentResult.paymentTransaction!,
                    };
                    const updatedBillForReceipt = lastPaymentResult.reconciledBill;
                    onDownloadReceiptPdf(paymentResult.createdPayment, updatedBillForReceipt);
                  }}
                  data-testid="payment-success-download-receipt-pdf-btn"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{pm.downloadReceiptPdfBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="payment-modal-return-to-bills-btn"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  {pm.returnToBillsBtn}
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: FAILED */}
          {lifecycleState === 'FAILED' && (
            <div
              className="space-y-5"
              data-testid="payment-modal-failed-view"
            >
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3
                    className="text-base font-extrabold text-rose-950 dark:text-rose-200"
                    data-testid="payment-failed-heading"
                  >
                    {pm.failedTitle}
                  </h3>
                  <p
                    className="text-xs font-semibold text-rose-900 dark:text-rose-300 leading-relaxed"
                    data-testid="payment-failed-reason"
                  >
                    {lastPaymentResult?.reason ||
                      'Payment authorization could not be completed.'}
                  </p>
                  <p className="text-[11px] text-rose-800/90 dark:text-rose-300/80 pt-1">
                    {pm.failedNoReceiptNotice}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.billNumberLabel}
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {activeBill.billNo}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.currentOutstandingLabel}
                  </span>
                  <span
                    className="font-mono font-extrabold text-amber-700 dark:text-amber-400"
                    data-testid="payment-failed-unchanged-balance"
                  >
                    ₹
                    {(
                      lastPaymentResult?.remainingBalance ??
                      activeBill.outstandingBalance
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="payment-modal-back-to-bills-btn"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{pm.backToBillsBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedOutcome('SUCCESS');
                    setLifecycleState('READY');
                  }}
                  data-testid="payment-modal-retry-btn"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{pm.retryPaymentBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 5: PENDING */}
          {lifecycleState === 'PENDING' && (
            <div
              className="space-y-5"
              data-testid="payment-modal-pending-view"
            >
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3
                    className="text-base font-extrabold text-amber-950 dark:text-amber-200"
                    data-testid="payment-pending-heading"
                  >
                    {pm.pendingTitle}
                  </h3>
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 leading-relaxed">
                    {lastPaymentResult?.reason || pm.pendingExplanation}
                  </p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 pt-1">
                    {pm.pendingNoReceiptNotice}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.paymentRefLabel}
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {lastPaymentResult?.paymentTransaction?.txId || 'PENDING-REF'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {pm.currentOutstandingLabel}
                  </span>
                  <span
                    className="font-mono font-extrabold text-amber-700 dark:text-amber-400"
                    data-testid="payment-pending-unchanged-balance"
                  >
                    ₹
                    {(
                      lastPaymentResult?.remainingBalance ??
                      activeBill.outstandingBalance
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="payment-modal-pending-close-btn"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  {pm.returnToBillsBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
