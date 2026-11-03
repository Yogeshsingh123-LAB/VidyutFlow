import { Language } from './types';
import { UserRole } from '../types';

export interface AssistantUiDictionary {
  // Header & Window
  assistantHeaderTitle: string;
  closeAssistantAria: string;
  closeAssistantTitle: string;
  resetConversationAria: string;
  resetConversationTitle: string;

  // Security & Grounding Bar
  authorizedForPrefix: string;
  accountGroundedBadge: string;
  connectionCountSingle: string;
  connectionCountPlural: string;
  groundedEngineBadge: string;

  // Stream States
  inspectingRecordsLoading: string;
  errorEncounteredBanner: string;
  retryBtn: string;

  // Suggested Inquiries
  suggestedInquiriesPrefix: string;
  suggestedInquiriesSuffix: string;

  // Input Controls
  inputPlaceholderConsumer: string;
  inputPlaceholderEmployee: string;
  inputPlaceholderField: string;
  inputPlaceholderManagement: string;
  inputPlaceholderAdmin: string;
  inputAriaLabelPrefix: string;
  sendButtonAria: string;
  sendButtonTitle: string;
  keyboardHintEnter: string;
  keyboardHintShiftEnter: string;
  keyboardHintToSend: string;
  keyboardHintForLineBreak: string;
  groundedComplianceFooter: string;

  // Human Concurrence
  humanConcurrenceTitle: string;
  humanConcurrencePendingSuffix: string;
  humanConcurrenceReviewBtn: string;
  humanConcurrenceDiffPrefix: string;
  humanConcurrenceApproverPrefix: string;
  humanConcurrenceDisclaimer: string;

  // Toasts & Errors
  toastNavigatedToPrefix: string;
  toastNavigationUnavailable: string;
  serviceInterruptionFallback: string;
  temporaryFallbackNotice: string;
}

export interface LocalizedPersonaMeta {
  name: string;
  title: string;
  badge: string;
  welcomeMessage: (userName: string) => string;
}

export const ASSISTANT_UI_TRANSLATIONS: Record<Language, AssistantUiDictionary> = {
  en: {
    assistantHeaderTitle: 'Vidyut Mitra AI',
    closeAssistantAria: 'Close assistant',
    closeAssistantTitle: 'Close assistant',
    resetConversationAria: 'Reset conversation',
    resetConversationTitle: 'Reset conversation',
    authorizedForPrefix: 'Authorized for:',
    accountGroundedBadge: 'Account-Grounded',
    connectionCountSingle: 'connection',
    connectionCountPlural: 'connections',
    groundedEngineBadge: 'Grounded Engine',
    inspectingRecordsLoading: 'is inspecting authorized ERP records & telemetry...',
    errorEncounteredBanner: 'The previous inquiry encountered an issue.',
    retryBtn: 'Retry',
    suggestedInquiriesPrefix: 'Suggested',
    suggestedInquiriesSuffix: 'inquiries:',
    inputPlaceholderConsumer: 'Ask Vidyut Mitra about bills, tariff slabs, solar, or outages... (Enter to send)',
    inputPlaceholderEmployee: 'Ask Operations Co-Pilot about applications, approvals, or SLA risks... (Enter to send)',
    inputPlaceholderField: 'Ask Field Assistant about work orders, 11kV feeders, or safety norms... (Enter to send)',
    inputPlaceholderManagement: 'Ask Executive Co-Pilot about AT&C loss, demand peaks, or revenue... (Enter to send)',
    inputPlaceholderAdmin: 'Ask System Co-Pilot about system telemetry, audit logs, or RBAC... (Enter to send)',
    inputAriaLabelPrefix: 'Ask',
    sendButtonAria: 'Send inquiry',
    sendButtonTitle: 'Send inquiry (Enter)',
    keyboardHintEnter: 'Enter',
    keyboardHintShiftEnter: 'Shift+Enter',
    keyboardHintToSend: 'to send',
    keyboardHintForLineBreak: 'for line break',
    groundedComplianceFooter: 'Grounded in GERC Regulations',
    humanConcurrenceTitle: 'AI Action Recommendations (Human Concurrence Required)',
    humanConcurrencePendingSuffix: 'Pending',
    humanConcurrenceReviewBtn: 'Review & Authorize',
    humanConcurrenceDiffPrefix: 'Diff:',
    humanConcurrenceApproverPrefix: 'Approver:',
    humanConcurrenceDisclaimer: 'AI recommendations remain unexecuted until authorized by an authenticated human operator.',
    toastNavigatedToPrefix: 'Navigated to',
    toastNavigationUnavailable: 'Navigation target "{tab}" is not available in the {role} portal.',
    serviceInterruptionFallback: 'Vidyut Mitra is currently experiencing a temporary service interruption. For urgent assistance with your electricity connection, billing, or power grievances, please contact the UGVCL 24x7 Toll-Free Helpline at 19122 or 1800 233 155335.',
    temporaryFallbackNotice: 'Operating under local utility grounded engine while live telemetry is synchronizing.',
  },

  gu: {
    assistantHeaderTitle: 'વિદ્યુત મિત્ર AI',
    closeAssistantAria: 'સહાયક બંધ કરો',
    closeAssistantTitle: 'સહાયક બંધ કરો',
    resetConversationAria: 'વાતચીત ફરી શરૂ કરો',
    resetConversationTitle: 'વાતચીત ફરી શરૂ કરો',
    authorizedForPrefix: 'અધિકૃત યુઝર:',
    accountGroundedBadge: 'ખાતા-આધારિત પુષ્ટિ',
    connectionCountSingle: 'કનેક્શન',
    connectionCountPlural: 'કનેક્શનો',
    groundedEngineBadge: 'ગ્રાઉન્ડેડ એન્જિન',
    inspectingRecordsLoading: 'અધિકૃત ERP રેકોર્ડ્સ અને ટેલિમેટ્રીની ચકાસણી કરી રહ્યા છે...',
    errorEncounteredBanner: 'ગત પૂછપરછમાં ક્ષતિ આવી હતી.',
    retryBtn: 'ફરી પ્રયાસ કરો',
    suggestedInquiriesPrefix: 'સૂચવેલા',
    suggestedInquiriesSuffix: 'પ્રશ્નો:',
    inputPlaceholderConsumer: 'બિલ, ટેરિફ સ્લેબ, સોલાર અથવા વીજ પુરવઠા અંગે વિદ્યુત મિત્રને પૂછો... (મોકલવા Enter દબાવો)',
    inputPlaceholderEmployee: 'અરજીઓ, મંજૂરીઓ અથવા SLA જોખમો વિશે ઑપરેશન્સ કો-પાઇલટને પૂછો... (મોકલવા Enter દબાવો)',
    inputPlaceholderField: 'વર્ક ઑર્ડર, 11kV ફીડર અથવા સલામતી નિયમો અંગે ફીલ્ડ આસિસ્ટન્ટને પૂછો... (મોકલવા Enter દબાવો)',
    inputPlaceholderManagement: 'AT&C નુકસાન, પીક ડિમાન્ડ અથવા મહેસૂલ વિશે એક્ઝિક્યુટિવ કો-પાઇલટને પૂછો... (મોકલવા Enter દબાવો)',
    inputPlaceholderAdmin: 'સિસ્ટમ ટેલિમેટ્રી, ઑડિટ લૉગ્સ અથવા RBAC વિશે સિસ્ટમ કો-પાઇલટને પૂછો... (મોકલવા Enter દબાવો)',
    inputAriaLabelPrefix: 'પૂછો',
    sendButtonAria: 'પ્રશ્ન મોકલો',
    sendButtonTitle: 'પ્રશ્ન મોકલો (Enter)',
    keyboardHintEnter: 'Enter',
    keyboardHintShiftEnter: 'Shift+Enter',
    keyboardHintToSend: 'મોકલવા માટે',
    keyboardHintForLineBreak: 'નવી લાઇન માટે',
    groundedComplianceFooter: 'GERC નિયમો અનુસાર આધારિત',
    humanConcurrenceTitle: 'AI ક્રિયા ભલામણો (માનવ સંમતિ અનિવાર્ય)',
    humanConcurrencePendingSuffix: 'બાકી',
    humanConcurrenceReviewBtn: 'સમીક્ષા અને મંજૂરી',
    humanConcurrenceDiffPrefix: 'તફાવત:',
    humanConcurrenceApproverPrefix: 'મંજૂરકર્તા:',
    humanConcurrenceDisclaimer: 'અધિકૃત માનવ ઓપરેટર દ્વારા મંજૂર ન થાય ત્યાં સુધી AI ભલામણો અમલમાં આવતી નથી.',
    toastNavigatedToPrefix: 'પર ગયા',
    toastNavigationUnavailable: 'નેવિગેશન લક્ષ્ય "{tab}" {role} પોર્ટલમાં ઉપલબ્ધ નથી.',
    serviceInterruptionFallback: 'વિદ્યુત મિત્ર હાલ અસ્થાયી સેવામાં વિલંબ અનુભવી રહ્યું છે. વીજ કનેક્શન, બિલિંગ અથવા વીજ પુરવઠાની ફરિયાદો માટે કૃપા કરીને UGVCL 24x7 ટોલ-ફ્રી હેલ્પલાઇન 19122 અથવા 1800 233 155335 પર સંપર્ક કરો.',
    temporaryFallbackNotice: 'લાઇવ ટેલિમેટ્રી સિંક્રનાઇઝ થતી વખતે સ્થાનિક યુટિલિટી ગ્રાઉન્ડેડ એન્જિન કાર્યરત છે.',
  },

  hi: {
    assistantHeaderTitle: 'विद्युत मित्र AI',
    closeAssistantAria: 'सहायक बंद करें',
    closeAssistantTitle: 'सहायक बंद करें',
    resetConversationAria: 'बातचीत रीसेट करें',
    resetConversationTitle: 'बातचीत रीसेट करें',
    authorizedForPrefix: 'अधिकृत उपभोक्ता:',
    accountGroundedBadge: 'खाता-आधारित सत्यापन',
    connectionCountSingle: 'कनेक्शन',
    connectionCountPlural: 'कनेक्शन',
    groundedEngineBadge: 'ग्राउंडेड इंजन',
    inspectingRecordsLoading: 'अधिकृत ERP रिकॉर्ड्स और टेलीमेट्री की जांच कर रहे हैं...',
    errorEncounteredBanner: 'पिछली पूछताछ में समस्या उत्पन्न हुई।',
    retryBtn: 'पुनः प्रयास करें',
    suggestedInquiriesPrefix: 'सुझाए गए',
    suggestedInquiriesSuffix: 'प्रश्न:',
    inputPlaceholderConsumer: 'बिल, टैरिफ स्लैब, सोलर या बिजली शिकायतों के बारे में विद्युत मित्र से पूछें... (भेजने के लिए Enter दबाएं)',
    inputPlaceholderEmployee: 'आवेदनों, स्वीकृतियों या SLA जोखिमों के बारे में ऑपरेशन्स को-पायलट से पूछें... (भेजने के लिए Enter दबाएं)',
    inputPlaceholderField: 'वर्क ऑर्डर, 11kV फीडर या सुरक्षा मानकों के बारे में फील्ड सहायक से पूछें... (भेजने के लिए Enter दबाएं)',
    inputPlaceholderManagement: 'AT&C हानि, पीक डिमांड या राजस्व के बारे में एक्जीक्यूटिव को-पायलट से पूछें... (भेजने के लिए Enter दबाएं)',
    inputPlaceholderAdmin: 'सिस्टम टेलीमेट्री, ऑडिट लॉग या RBAC के बारे में सिस्टम को-पायलट से पूछें... (भेजने के लिए Enter दबाएं)',
    inputAriaLabelPrefix: 'पूछें',
    sendButtonAria: 'प्रश्न भेजें',
    sendButtonTitle: 'प्रश्न भेजें (Enter)',
    keyboardHintEnter: 'Enter',
    keyboardHintShiftEnter: 'Shift+Enter',
    keyboardHintToSend: 'भेजने के लिए',
    keyboardHintForLineBreak: 'नई पंक्ति के लिए',
    groundedComplianceFooter: 'GERC विनियमों पर आधारित',
    humanConcurrenceTitle: 'AI कार्य सिफारिशें (मानव सहमति अनिवार्य)',
    humanConcurrencePendingSuffix: 'लंबित',
    humanConcurrenceReviewBtn: 'समीक्षा एवं स्वीकृति',
    humanConcurrenceDiffPrefix: 'अंतर:',
    humanConcurrenceApproverPrefix: 'स्वीकर्ता:',
    humanConcurrenceDisclaimer: 'अधिकृत मानव ऑपरेटर द्वारा स्वीकृत होने तक AI सिफारिशें निष्पादित नहीं होती हैं।',
    toastNavigatedToPrefix: 'पर नेविगेट किया गया',
    toastNavigationUnavailable: 'नेविगेशन लक्ष्य "{tab}" {role} पोर्टल में उपलब्ध नहीं है।',
    serviceInterruptionFallback: 'विद्युत मित्र में वर्तमान में अस्थायी सेवा बाधा आ रही है। तत्काल सहायता, बिलिंग या बिजली शिकायतों के लिए UGVCL 24x7 टोल-फ्री हेल्पलाइन 19122 या 1800 233 155335 पर संपर्क करें।',
    temporaryFallbackNotice: 'लाइव टेलीमेट्री सिंक्रनाइज़ होते समय स्थानीय यूटिलिटी ग्राउंडेड इंजन कार्यरत है।',
  },

  mr: {
    assistantHeaderTitle: 'विद्युत मित्र AI',
    closeAssistantAria: 'सहाय्यक बंद करा',
    closeAssistantTitle: 'सहाय्यक बंद करा',
    resetConversationAria: 'संभाषण रीसेट करा',
    resetConversationTitle: 'संभाषण रीसेट करा',
    authorizedForPrefix: 'अधिकृत वापरकर्ता:',
    accountGroundedBadge: 'खाते-आधारित पडताळणी',
    connectionCountSingle: 'जोडणी',
    connectionCountPlural: 'जोडण्या',
    groundedEngineBadge: 'ग्राउंडेड इंजिन',
    inspectingRecordsLoading: 'अधिकृत ERP नोंदी आणि टेलीमेट्री तपासत आहे...',
    errorEncounteredBanner: 'मागील विचारणेत त्रुटी आली.',
    retryBtn: 'पुन्हा प्रयत्न करा',
    suggestedInquiriesPrefix: 'सुचवलेले',
    suggestedInquiriesSuffix: 'प्रश्न:',
    inputPlaceholderConsumer: 'बिल, टॅरिफ स्लॅब, सौर किंवा वीज तक्रारींबद्दल विद्युत मित्राला विचारा... (पाठवण्यासाठी Enter दाबा)',
    inputPlaceholderEmployee: 'अर्जांवर, मंजुऱ्यांवर किंवा SLA जोखमींवर ऑपरेशन्स सह-वैमानिकाला विचारा... (पाठवण्यासाठी Enter दाबा)',
    inputPlaceholderField: 'वर्क ऑर्डर, 11kV फीडर किंवा सुरक्षा नियमांवर फील्ड सहाय्यकाला विचारा... (पाठवण्यासाठी Enter दाबा)',
    inputPlaceholderManagement: 'AT&C तोटा, कमाल मागणी किंवा महसुलावर एक्झिक्युटिव्ह सह-वैमानिकाला विचारा... (पाठवण्यासाठी Enter दाबा)',
    inputPlaceholderAdmin: 'सिस्टम टेलीमेट्री, ऑडिट लॉग किंवा RBAC वर सिस्टम सह-वैमानिकाला विचारा... (पाठवण्यासाठी Enter दाबा)',
    inputAriaLabelPrefix: 'विचारा',
    sendButtonAria: 'प्रश्न पाठवा',
    sendButtonTitle: 'प्रश्न पाठवा (Enter)',
    keyboardHintEnter: 'Enter',
    keyboardHintShiftEnter: 'Shift+Enter',
    keyboardHintToSend: 'पाठवण्यासाठी',
    keyboardHintForLineBreak: 'नवीन ओळीसाठी',
    groundedComplianceFooter: 'GERC नियमावलीवर आधारित',
    humanConcurrenceTitle: 'AI कृती शिफारसी (मानव संमती आवश्यक)',
    humanConcurrencePendingSuffix: 'प्रलंबित',
    humanConcurrenceReviewBtn: 'पुनरावलोकन व मंजुरी',
    humanConcurrenceDiffPrefix: 'फरक:',
    humanConcurrenceApproverPrefix: 'मंजूरकर्ता:',
    humanConcurrenceDisclaimer: 'अधिकृत मानवी ऑपरेटरने मंजूर करेपर्यंत AI शिफारसी लागू केल्या जात नाहीत.',
    toastNavigatedToPrefix: 'वर नेव्हिगेट केले',
    toastNavigationUnavailable: 'नेव्हिगेशन लक्ष्य "{tab}" {role} पोर्टलवर उपलब्ध नाही.',
    serviceInterruptionFallback: 'विद्युत मित्र सेवेमध्ये तात्पुरती अडचण येत आहे. तात्काळ वीज जोडणी, बिल किंवा तक्रारींसाठी कृपया UGVCL 24x7 टोल-फ्री हेल्पलाइन 19122 किंवा 1800 233 155335 वर संपर्क साधा.',
    temporaryFallbackNotice: 'थेट टेलीमेट्री सिंक्रोनाइझ होत असताना स्थानिक युटिलिटी ग्राउंडेड इंजिन कार्यरत आहे.',
  },
};

export const LOCALIZED_PERSONAS: Record<Language, Record<UserRole, LocalizedPersonaMeta>> = {
  en: {
    consumer: {
      name: 'Vidyut Mitra',
      title: 'Citizen Utility & Billing Advisor',
      badge: 'Consumer Co-Pilot',
      welcomeMessage: (name: string) =>
        `Namaste ${name.split(' ')[0]}! I am **Vidyut Mitra**, your dedicated Citizen Utility & Billing Advisor for UGVCL.\n\nI can:\n* Explain your **electricity bills**, slab breakdowns, and meter readings.\n* Check your **payment history** and outstanding balances.\n* Track **power supply complaints** and new connection applications.\n* Guide you on **rooftop solar net-metering** under Surya Gujarat.\n\n*All responses are strictly grounded in your authorized account records and GERC regulations.*`,
    },
    employee: {
      name: 'Operations Co-Pilot',
      title: 'Sub-Divisional Operations & Sanction Desk Intelligence',
      badge: 'Operations Co-Pilot',
      welcomeMessage: (name: string) =>
        `Namaste ${name}! I am your **Operations Co-Pilot**, supporting UGVCL sub-divisional staff.\n\nI can:\n* Highlight **SLA breach risks** across consumer grievance tickets.\n* Audit **new connection sanction dossiers** and commercial load extensions.\n* Review **transformer loading** and maintenance work orders.\n\n*All guidance complies with GERC Standards of Performance and UGVCL SOPs.*`,
    },
    field: {
      name: 'Field Assistant',
      title: 'Field Operations & Lineman Safety Co-Pilot',
      badge: 'Field Co-Pilot',
      welcomeMessage: (name: string) =>
        `Namaste ${name}! I am your **Field Operations Co-Pilot**, supporting UGVCL linemen and junior engineers.\n\nI can:\n* Prioritize **assigned work orders** and site inspection queues.\n* Guide you on **Permit to Work (PTW)** and transformer grounding safety.\n* Help verify **offline inspection submissions** queued on your mobile terminal.`,
    },
    management: {
      name: 'Executive Co-Pilot',
      title: 'Corporate Executive Intelligence & Discom Cockpit',
      badge: 'Executive Co-Pilot',
      welcomeMessage: (name: string) =>
        `Namaste ${name}! Welcome to the **Executive Intelligence Co-Pilot**.\n\nI can:\n* Track **circle AT&C loss targets** and billing efficiency under RDSS.\n* Analyze **11kV feeder peak demands** and SLDC roster coordination.\n* Synthesize **revenue realization** and high-risk commercial sanctions.`,
    },
    admin: {
      name: 'System Co-Pilot',
      title: 'Enterprise Architecture & Platform Security Intelligence',
      badge: 'System Co-Pilot',
      welcomeMessage: (name: string) =>
        `Namaste ${name}! Welcome to the **System Architecture Co-Pilot**.\n\nI can:\n* Audit **RBAC access matrices** and user session boundaries.\n* Inspect **immutable CEA audit logs** and security telemetry.\n* Monitor **Smart Meter HES gateway latency** and microservice health.`,
    },
  },

  gu: {
    consumer: {
      name: 'વિદ્યુત મિત્ર',
      title: 'નાગરિક વીજ સેવા અને બિલિંગ સલાહકાર',
      badge: 'ગ્રાહક સહાયક',
      welcomeMessage: (name: string) =>
        `નમસ્તે ${name.split(' ')[0]}! હું **વિદ્યુત મિત્ર** છું, UGVCL માટે આપનો સમર્પિત નાગરિક વીજ સેવા અને બિલિંગ સલાહકાર.\n\nહું આપને નીચેની બાબતોમાં સહાય કરી શકું છું:\n* આપના **વીજ બિલ**, સ્લેબ વિભાજન અને મીટર રીડિંગ સમજાવવા.\n* આપનો **ચુકવણી ઇતિહાસ** અને બાકી રકમ તપાસવા.\n* **વીજ પુરવઠાની ફરિયાદો** અને નવી કનેક્શન અરજીઓ ટ્રેક કરવા.\n* સૂર્ય ગુજરાત હેઠળ **રૂફટોપ સોલાર નેટ-મીટરિંગ** અંગે માર્ગદર્શન આપવા.\n\n*બધા જવાબો આપના અધિકૃત ખાતાના રેકોર્ડ્સ અને GERC નિયમો પર આધારિત છે.*`,
    },
    employee: {
      name: 'ઑપરેશન્સ કો-પાઇલટ',
      title: 'પેટા-વિભાગીય કામગીરી અને મંજૂરી ડેસ્ક સહાયક',
      badge: 'ઑપરેશન્સ કો-પાઇલટ',
      welcomeMessage: (name: string) =>
        `નમસ્તે ${name}! હું આપનો **ઑપરેશન્સ કો-પાઇલટ** છું, UGVCL પેટા-વિભાગીય સ્ટાફની સહાય માટે.\n\nહું આપને નીચેની બાબતોમાં સહાય કરી શકું છું:\n* ગ્રાહક ફરિયાદોમાં **SLA ઉલ્લંઘન જોખમો** ચકાસવા.\n* **નવા કનેક્શન મંજૂરી દસ્તાવેજો** અને કોમર્શિયલ લોડ વધારાનું ઑડિટ કરવા.\n* **ટ્રાન્સફોર્મર લોડિંગ** અને જાળવણી વર્ક ઑર્ડરની સમીક્ષા કરવા.\n\n*તમામ માર્ગદર્શન GERC પરફોર્મન્સ સ્ટાન્ડર્ડ્સ અને UGVCL SOP અનુસાર છે.*`,
    },
    field: {
      name: 'ફીલ્ડ આસિસ્ટન્ટ',
      title: 'ફીલ્ડ કામગીરી અને લાઇનમેન સુરક્ષા સહાયક',
      badge: 'ફીલ્ડ કો-પાઇલટ',
      welcomeMessage: (name: string) =>
        `નમસ્તે ${name}! હું આપનો **ફીલ્ડ ઑપરેશન્સ કો-પાઇલટ** છું, UGVCL લાઇનમેન અને જુનિયર એન્જિનિયર્સની સહાય માટે.\n\nહું આપને નીચેની બાબતોમાં સહાય કરી શકું છું:\n* **સોંપાયેલા વર્ક ઑર્ડર્સ** અને સાઇટ નિરીક્ષણ કતારને પ્રાથમિકતા આપવા.\n* **પરમિટ ટુ વર્ક (PTW)** અને ટ્રાન્સફોર્મર અર્થિંગ સુરક્ષા નિયમોનું માર્ગદર્શન કરવા.\n* મોબાઇલ ટર્મિનલ પર ઑફલાઇન કતારબદ્ધ **નિરીક્ષણ સબમિશન** ચકાસવામાં સહાય કરવા.`,
    },
    management: {
      name: 'એક્ઝિક્યુટિવ કો-પાઇલટ',
      title: 'કોર્પોરેટ એક્ઝિક્યુટિવ ઇન્ટેલિજન્સ અને ડિસ્કોમ કૉકપિટ',
      badge: 'એક્ઝિક્યુટિવ કો-પાઇલટ',
      welcomeMessage: (name: string) =>
        `નમસ્તે ${name}! **એક્ઝિક્યુટિવ ઇન્ટેલિજન્સ કો-પાઇલટ** માં આપનું સ્વાગત છે.\n\nહું આપને નીચેની બાબતોમાં સહાય કરી શકું છું:\n* RDSS હેઠળ **સર્કલ AT&C નુકસાન લક્ષ્યાંક** અને બિલિંગ કાર્યક્ષમતા ટ્રેક કરવા.\n* **11kV ફીડર પીક ડિમાન્ડ** અને SLDC રોસ્ટર સંકલનનું વિશ્લેષણ કરવા.\n* **મહેસૂલ પ્રાપ્તિ** અને ઉચ્ચ-જોખમવાળી વાણિજ્યિક મંજૂરીઓનું સંકલન કરવા.`,
    },
    admin: {
      name: 'સિસ્ટમ કો-પાઇલટ',
      title: 'એન્ટરપ્રાઇઝ આર્કિટેક્ચર અને પ્લેટફોર્મ સુરક્ષા ઇન્ટેલિજન્સ',
      badge: 'સિસ્ટમ કો-પાઇલટ',
      welcomeMessage: (name: string) =>
        `નમસ્તે ${name}! **સિસ્ટમ આર્કિટેક્ચર કો-પાઇલટ** માં આપનું સ્વાગત છે.\n\nહું આપને નીચેની બાબતોમાં સહાય કરી શકું છું:\n* **RBAC ઍક્સેસ મેટ્રિક્સ** અને યુઝર સત્ર સીમાઓનું ઑડિટ કરવા.\n* અપરિવર્તનીય **CEA ઑડિટ લૉગ્સ** અને સુરક્ષા ટેલિમેટ્રીનું નિરીક્ષણ કરવા.\n* **સ્માર્ટ મીટર HES ગેટવે લેટન્સી** અને માઇક્રોસર્વિસ સ્વાસ્થ્યનું મોનિટરિંગ કરવા.`,
    },
  },

  hi: {
    consumer: {
      name: 'विद्युत मित्र',
      title: 'नागरिक उपयोगिता एवं बिलिंग सलाहकार',
      badge: 'उपभोक्ता सहायक',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name.split(' ')[0]}! मैं **विद्युत मित्र** हूँ, UGVCL के लिए आपका समर्पित नागरिक उपयोगिता एवं बिलिंग सलाहकार।\n\nमैं आपकी सहायता कर सकता हूँ:\n* आपके **बिजली बिल**, स्लैब विवरण और मीटर रीडिंग को समझने में।\n* आपके **भुगतान इतिहास** और बकाया राशि की जांच करने में।\n* **बिजली आपूर्ति शिकायतों** और नए कनेक्शन आवेदनों को ट्रैक करने में।\n* सूर्य गुजरात के तहत **रूफटॉप सोलर नेट-मीटरिंग** पर मार्गदर्शन प्राप्त करने में।\n\n*सभी उत्तर आपके अधिकृत खाता रिकॉर्ड और GERC नियमों पर कड़ाई से आधारित हैं।*`,
    },
    employee: {
      name: 'ऑपरेशन्स को-पायलट',
      title: 'उप-प्रभागीय संचालन एवं स्वीकृति डेस्क सहायक',
      badge: 'ऑपरेशन्स को-पायलट',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! मैं आपका **ऑपरेशन्स को-पायलट** हूँ, UGVCL उप-प्रभागीय कर्मचारियों की सहायता के लिए।\n\nमैं आपकी सहायता कर सकता हूँ:\n* उपभोक्ता शिकायतों में **SLA उल्लंघन जोखिमों** की पहचान करने में।\n* **नए कनेक्शन स्वीकृति डॉसियर** और वाणिज्यिक लोड विस्तार का ऑडिट करने में।\n* **ट्रांसफार्मर लोडिंग** और रखरखाव वर्क ऑर्डर की समीक्षा करने में।\n\n*सभी मार्गदर्शन GERC प्रदर्शन मानकों और UGVCL SOPs के अनुरूप हैं।*`,
    },
    field: {
      name: 'फील्ड सहायक',
      title: 'फील्ड संचालन एवं लाइनमैन सुरक्षा को-पायलट',
      badge: 'फील्ड को-पायलट',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! मैं आपका **फील्ड ऑपरेशन्स को-पायलट** हूँ, UGVCL लाइनमैन और कनिष्ठ अभियंताओं के सहयोग के लिए।\n\nमैं आपकी सहायता कर सकता हूँ:\n* **आवंटित वर्क ऑर्डर** और साइट निरीक्षण कतार को प्राथमिकता देने में।\n* **परमिट टू वर्क (PTW)** और ट्रांसफार्मर न्यूट्रल अर्थिंग सुरक्षा नियमों के मार्गदर्शन में।\n* मोबाइल टर्मिनल पर कतारबद्ध **ऑफ़लाइन निरीक्षण सबमिशन** को सत्यापित करने में।`,
    },
    management: {
      name: 'एक्जीक्यूटिव को-पायलट',
      title: 'कॉर्पोरेट एक्जीक्यूटिव इंटेलिजेंस एवं डिस्कोम कॉकपिट',
      badge: 'एक्जीक्यूटिव को-पायलट',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! **एक्जीक्यूटिव इंटेलिजेंस को-पायलट** में आपका स्वागत है।\n\nमैं आपकी सहायता कर सकता हूँ:\n* RDSS के तहत **सर्कल AT&C हानि लक्ष्यों** और बिलिंग दक्षता को ट्रैक करने में।\n* **11kV फीडर पीक लोड** और SLDC रोस्टर समन्वय का विश्लेषण करने में।\n* **राजस्व वसूली** और उच्च-जोखिम वाले वाणिज्यिक स्वीकृतियों का विश्लेषण करने में।`,
    },
    admin: {
      name: 'सिस्टम को-पायलट',
      title: 'एंटरप्राइज आर्किटेक्चर एवं प्लेटफॉर्म सुरक्षा सहायक',
      badge: 'सिस्टम को-पायलट',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! **सिस्टम आर्किटेक्चर को-पायलट** में आपका स्वागत है।\n\nमैं आपकी सहायता कर सकता हूँ:\n* **RBAC एक्सेस मैट्रिक्स** और उपयोगकर्ता सत्र सीमाओं का ऑडिट करने में।\n* अपरिवर्तनीय **CEA ऑडिट लॉग** और सुरक्षा टेलीमेट्री का निरीक्षण करने में।\n* **स्मार्ट मीटर HES गेटवे लेटेंसी** और माइक्रोसर्विस स्वास्थ्य की निगरानी करने में।`,
    },
  },

  mr: {
    consumer: {
      name: 'विद्युत मित्र',
      title: 'नागरिक वीज सेवा आणि बिलिंग सल्लागार',
      badge: 'ग्राहक सहाय्यक',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name.split(' ')[0]}! मी **विद्युत मित्र** आहे, UGVCL साठी आपला समर्पित नागरिक वीज सेवा आणि बिलिंग सल्लागार.\n\nमी आपल्याला पुढील बाबींमध्ये मदत करू शकतो:\n* आपले **वीज बिल**, स्लॅब विभाजन आणि मीटर वाचन समजून घेणे.\n* आपला **पेमेंट इतिहास** आणि थकबाकी तपासणे.\n* **वीज पुरवठा तक्रारी** आणि नवीन जोडणी अर्ज ट्रॅक करणे.\n* सूर्य गुजरात अंतर्गत **रूफटॉप सोलर नेट-मीटरिंग** विषयी मार्गदर्शन मिळवणे.\n\n*सर्व उत्तरे आपल्या अधिकृत खात्याच्या नोंदींवर आणि GERC नियमांवर आधारित आहेत.*`,
    },
    employee: {
      name: 'ऑपरेशन्स सह-वैमानिक',
      title: 'उप-विभागीय कामकाज आणि मंजुरी डेस्क बुद्धिमत्ता',
      badge: 'ऑपरेशन्स सह-वैमानिक',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! मी आपला **ऑपरेशन्स सह-वैमानिक** आहे, UGVCL उप-विभागीय कर्मचाऱ्यांच्या सहाय्यासाठी.\n\nमी मदत करू शकतो:\n* ग्राहक तक्रारींमधील **SLA उल्लंघन जोखीम** ओळखणे.\n* **नवीन जोडणी मंजुरी दस्तऐवज** आणि व्यावसायिक भार वाढीचे लेखापरीक्षण करणे.\n* **ट्रान्सफॉर्मर भार** आणि देखभाल वर्क ऑर्डरचे पुनरावलोकन करणे.\n\n*सर्व मार्गदर्शन GERC कार्यप्रदर्शन मानकांनुसार आणि UGVCL SOP नुसार आहे.*`,
    },
    field: {
      name: 'फील्ड सहाय्यक',
      title: 'फील्ड कामकाज आणि लाईनमन सुरक्षा सह-वैमानिक',
      badge: 'फील्ड सह-वैमानिक',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! मी आपला **फील्ड ऑपरेशन्स सह-वैमानिक** आहे, UGVCL लाईनमन आणि कनिष्ठ अभियंत्यांच्या सहाय्यासाठी.\n\nमी मदत करू शकतो:\n* **नियुक्त केलेल्या वर्क ऑर्डर्स** आणि साइट तपासणी रांगेला प्राधान्य देणे.\n* **परमिट टू वर्क (PTW)** आणि ट्रान्सफॉर्मर अर्थिंग सुरक्षा नियमांचे मार्गदर्शन करणे.\n* मोबाईल टर्मिनलवर रांगेत असलेल्या **ऑफलाइन तपासणी नोंदी** पडताळण्यात मदत करणे.`,
    },
    management: {
      name: 'एक्झिक्युटिव्ह सह-वैमानिक',
      title: 'कॉर्पोरेट एक्झिक्युटिव्ह इंटेलिजेंस आणि डिस्कोम कॉकपिट',
      badge: 'एक्झिक्युटिव्ह सह-वैमानिक',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! **एक्झिक्युटिव्ह इंटेलिजेंस सह-वैमानिक** मध्ये आपले स्वागत आहे.\n\nमी मदत करू शकतो:\n* RDSS अंतर्गत **सर्कल AT&C नुकसान उद्दिष्टे** आणि बिलिंग कार्यक्षमता ट्रॅक करणे.\n* **11kV फीडर पीक मागणी** आणि SLDC रोस्टर समन्वयाचे विश्लेषण करणे.\n* **महसूल प्राप्ती** आणि उच्च-जोखीम व्यावसायिक मंजुऱ्यांचे विश्लेषण करणे.`,
    },
    admin: {
      name: 'सिस्टम सह-वैमानिक',
      title: 'एंटरप्राइज आर्किटेक्चर आणि प्लॅटफॉर्म सुरक्षा बुद्धिमत्ता',
      badge: 'सिस्टम सह-वैमानिक',
      welcomeMessage: (name: string) =>
        `नमस्ते ${name}! **सिस्टम आर्किटेक्चर सह-वैमानिक** मध्ये आपले स्वागत आहे.\n\nमी मदत करू शकतो:\n* **RBAC ऍक्सेस मॅट्रिक्स** आणि वापरकर्ता सत्र सीमांचे ऑडिट करणे.\n* अपरिवर्तनीय **CEA ऑडिट नोंदी** आणि सुरक्षा टेलीमेट्री तपासणे.\n* **स्मार्ट मीटर HES गेटवे लेटन्सी** आणि मायक्रोसर्व्हिस आरोग्याची देखरेख करणे.`,
    },
  },
};

export const LOCALIZED_SUGGESTED_PROMPTS: Record<Language, Record<UserRole, string[]>> = {
  en: {
    consumer: [
      'Explain my latest electricity bill and slab breakdown',
      'Calculate tariff estimate for 350 units under RGPU residential slab',
      'Check status of my recent complaints and service requests',
      'What are the requirements for 5kW rooftop solar net-metering?',
    ],
    employee: [
      'Identify applications and complaints with high SLA breach risk',
      'Show pending commercial load extension sanctions',
      'SOP for burnt or defective smart meter replacement',
      'Check consumer billing grievance escalations in Mehsana',
    ],
    field: [
      'Show high-priority work orders scheduled today',
      '11kV feeder line safety protocols and PTW requirements',
      'How to submit offline inspection in Offline Queue',
      'Distribution transformer neutral grounding norms',
    ],
    management: [
      'Current circle AT&C loss against RDSS benchmark',
      'Overloaded 11kV feeder peak mitigation strategy',
      'Monthly revenue collection efficiency trends',
      'GERC SLA compliance rates across subdivisions',
    ],
    admin: [
      'System audit log integrity and retention status',
      'Review RBAC access matrix across the 5 portals',
      'Smart meter HES head-end telemetry gateway status',
      'Authentication security events in the last 24 hours',
    ],
  },

  gu: {
    consumer: [
      'મારું તાજેતરનું વીજ બિલ અને સ્લેબ વિભાજન સમજાવો',
      'RGPU રહેણાંક સ્લેબ હેઠળ 350 યુનિટ માટે ટેરિફ અંદાજ ગણો',
      'મારી તાજેતરની ફરિયાદો અને સેવા વિનંતીઓની સ્થિતિ તપાસો',
      '5kW રૂફટોપ સોલાર નેટ-મીટરિંગ માટે શું આવશ્યકતાઓ છે?',
    ],
    employee: [
      'ઉચ્ચ SLA ઉલ્લંઘન જોખમ ધરાવતી અરજીઓ અને ફરિયાદો દર્શાવો',
      'બાકી રહેલી કોમર્શિયલ લોડ વધારાની મંજૂરીઓ બતાવો',
      'બળી ગયેલા અથવા ક્ષતિગ્રસ્ત સ્માર્ટ મીટર બદલવા માટેની SOP',
      'મહેસાણામાં ગ્રાહક બિલિંગ ફરિયાદ એસ્કેલેશન તપાસો',
    ],
    field: [
      'આજે નિર્ધારિત ઉચ્ચ પ્રાથમિકતાવાળા વર્ક ઑર્ડર દર્શાવો',
      '11kV ફીડર લાઇન સલામતી નિયમો અને PTW આવશ્યકતાઓ',
      'ઑફલાઇન કતારમાં સાઇટ નિરીક્ષણ કેવી રીતે સબમિટ કરવું',
      'ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર ન્યુટ્રલ અર્થિંગના નિયમો',
    ],
    management: [
      'RDSS માપદંડ સામે વર્તમાન સર્કલ AT&C નુકસાનની સ્થિતિ',
      'ઓવરલોડ થયેલા 11kV ફીડર પીક લોડ ઘટાડવાની વ્યૂહરચના',
      'માસિક મહેસૂલ વસૂલાત કાર્યક્ષમતાના વલણો',
      'પેટા-વિભાગોમાં GERC SLA પાલન દરો',
    ],
    admin: [
      'સિસ્ટમ ઑડિટ લૉગ અખંડિતતા અને સંગ્રહ સ્થિતિ',
      '5 પોર્ટલ વચ્ચે RBAC ઍક્સેસ મેટ્રિક્સની સમીક્ષા કરો',
      'સ્માર્ટ મીટર HES હેડ-એન્ડ ટેલિમેટ્રી ગેટવે સ્થિતિ',
      'છેલ્લા 24 કલાકમાં પ્રમાણીકરણ સુરક્ષા ઇવેન્ટ્સ',
    ],
  },

  hi: {
    consumer: [
      'मेरा नवीनतम बिजली बिल और स्लैब विवरण समझाएं',
      'RGPU आवासीय स्लैब के तहत 350 यूनिट के लिए टैरिफ अनुमान की गणना करें',
      'मेरी हालिया शिकायतों और सेवा अनुरोधों की स्थिति जांचें',
      '5kW रूफटॉप सोलर नेट-मीटरिंग के लिए क्या आवश्यकताएं हैं?',
    ],
    employee: [
      'उच्च SLA उल्लंघन जोखिम वाले आवेदनों और शिकायतों की पहचान करें',
      'लंबित वाणिज्यिक लोड विस्तार स्वीकृतियां दिखाएं',
      'जले या खराब स्मार्ट मीटर को बदलने के लिए SOP',
      'मेहसाणा में उपभोक्ता बिलिंग शिकायत वृद्धि की जांच करें',
    ],
    field: [
      'आज निर्धारित उच्च-प्राथमिकता वाले वर्क ऑर्डर दिखाएं',
      '11kV फीडर लाइन सुरक्षा प्रोटोकॉल और PTW आवश्यकताएं',
      'ऑफ़लाइन कतार में निरीक्षण कैसे सबमिट करें',
      'वितरण ट्रांसफार्मर न्यूट्रल अर्थिंग के मानक',
    ],
    management: [
      'RDSS बेंचमार्क के मुकाबले वर्तमान सर्कल AT&C हानि',
      'ओवरलोडेड 11kV फीडर पीक लोड शमन रणनीति',
      'मासिक राजस्व वसूली दक्षता के रुझान',
      'उप-प्रभागों में GERC SLA अनुपालन दरें',
    ],
    admin: [
      'सिस्टम ऑडिट लॉग अखंडता और प्रतिधारण स्थिति',
      '5 पोर्टलों में RBAC एक्सेस मैट्रिक्स की समीक्षा करें',
      'स्मार्ट मीटर HES हेड-एंड टेलीमेट्री गेटवे स्थिति',
      'पिछले 24 घंटों में प्रमाणीकरण सुरक्षा घटनाएं',
    ],
  },

  mr: {
    consumer: [
      'माझे नवीनतम वीज बिल आणि स्लॅब तपशील स्पष्ट करा',
      'RGPU निवासी स्लॅब अंतर्गत 350 युनिट्ससाठी टॅरिफ अंदाजाची गणना करा',
      'माझ्या अलीकडील तक्रारी आणि सेवा विनंत्यांची स्थिती तपासा',
      '5kW रूफटॉप सोलर नेट-मीटरिंगसाठी काय आवश्यकता आहेत?',
    ],
    employee: [
      'उच्च SLA उल्लंघन जोखीम असलेले अर्ज आणि तक्रारी ओळखा',
      'प्रलंबित व्यावसायिक भार वाढ मंजुऱ्या दाखवा',
      'जळालेले किंवा सदोष स्मार्ट मीटर बदलण्यासाठी SOP',
      'मेहसाणामधील ग्राहक बिलिंग तक्रार निवारण तपासा',
    ],
    field: [
      'आज नियोजित उच्च-प्राधान्य वर्क ऑर्डर्स दाखवा',
      '11kV फीडर लाईन सुरक्षा नियम आणि PTW आवश्यकता',
      'ऑफलाइन रांगेत साइट तपासणी कशी सबमिट करावी',
      'वितरण ट्रान्सफॉर्मर न्यूट्रल अर्थिंगचे निकष',
    ],
    management: [
      'RDSS मानकांच्या तुलनेत सध्याचा सर्कल AT&C तोटा',
      'ओव्हरलोड 11kV फीडर पीक मागणी नियंत्रण धोरण',
      'मासिक महसूल संकलन कार्यक्षमता कल',
      'उपविभागांमधील GERC SLA अनुपालन दर',
    ],
    admin: [
      'सिस्टम ऑडिट लॉग अखंडता आणि धारणा स्थिती',
      '5 पोर्टलमधील RBAC ऍक्सेस मॅट्रिक्सचे पुनरावलोकन करा',
      'स्मार्ट मीटर HES हेड-एंड टेलीमेट्री गेटवे स्थिती',
      'मागील 24 तासांतील प्रमाणीकरण सुरक्षा घटना',
    ],
  },
};

export const LOCALIZED_TOOL_CHIP_NAMES: Record<Language, Record<string, string>> = {
  en: {
    getConsumerBillDetails: 'Checked Billing Ledgers',
    calculateTariffEstimate: 'Calculated GERC Slabs',
    getConsumerConnectionDetails: 'Verified Connection Technicals',
    getConsumerPaymentHistory: 'Queried Payment Transactions',
    getConsumerComplaints: 'Inspected Grievance Tickets',
    getConsumerApplications: 'Tracked Connection Applications',
    listPendingApplications: 'Scanned Application Queue',
    getComplaintSlaRisks: 'Evaluated SLA Breach Risks',
    getConsumerLedgerSummary: 'Summarized Consumer Ledger',
    listPendingApprovals: 'Checked Approval Queue',
    getAssignedWorkOrders: 'Retrieved Assigned Work Orders',
    getFeederAndTransformerStatus: 'Queried 11kV Feeder Telemetry',
    getSiteFeasibilityQueue: 'Checked Site Feasibility Queue',
    getSafetyProtocolGuidelines: 'Loaded CEA Safety Protocols',
    getExecutiveKpiSummary: 'Synthesized Discom KPIs',
    getFeederOverloadAnalytics: 'Analyzed Overloaded Feeders',
    getRevenueRealizationLedger: 'Inspected Revenue Ledger',
    getDiscomComplaintTrends: 'Computed Grievance Trends',
    querySystemAuditLogs: 'Scrutinized Security Audit Trail',
    getSecurityAccessMatrix: 'Audited RBAC Access Matrix',
    getSystemTelemetryStatus: 'Polled Infrastructure Telemetry',
    getRecentAuthEvents: 'Checked Authentication Events',
  },
  gu: {
    getConsumerBillDetails: 'બિલિંગ ખાતાવહી ચકાસી',
    calculateTariffEstimate: 'GERC સ્લેબની ગણતરી કરી',
    getConsumerConnectionDetails: 'કનેક્શન ટેકનિકલ વિગતો ચકાસી',
    getConsumerPaymentHistory: 'ચુકવણી વ્યવહારો તપાસ્યા',
    getConsumerComplaints: 'ફરિયાદ ટિકિટોનું નિરીક્ષણ કર્યું',
    getConsumerApplications: 'કનેક્શન અરજીઓ ટ્રેક કરી',
    listPendingApplications: 'અરજી કતાર સ્કેન કરી',
    getComplaintSlaRisks: 'SLA ઉલ્લંઘન જોખમોનું મૂલ્યાંકન કર્યું',
    getConsumerLedgerSummary: 'ગ્રાહક ખાતાવહીનો સારાંશ તૈયાર કર્યો',
    listPendingApprovals: 'મંજૂરી કતાર તપાસી',
    getAssignedWorkOrders: 'સોંપાયેલા વર્ક ઑર્ડર્સ મેળવ્યા',
    getFeederAndTransformerStatus: '11kV ફીડર ટેલિમેટ્રી તપાસી',
    getSiteFeasibilityQueue: 'સાઇટ શક્યતા કતાર ચકાસી',
    getSafetyProtocolGuidelines: 'CEA સલામતી પ્રોટોકોલ લોડ કર્યા',
    getExecutiveKpiSummary: 'ડિસ્કોમ KPI નું વિશ્લેષણ કર્યું',
    getFeederOverloadAnalytics: 'ઓવરલોડ ફીડર્સનું વિશ્લેષણ કર્યું',
    getRevenueRealizationLedger: 'મહેસૂલ ખાતાવહી તપાસી',
    getDiscomComplaintTrends: 'ફરિયાદ વલણોની ગણતરી કરી',
    querySystemAuditLogs: 'સુરક્ષા ઑડિટ ટ્રેલની ચકાસણી કરી',
    getSecurityAccessMatrix: 'RBAC ઍક્સેસ મેટ્રિક્સનું ઑડિટ કર્યું',
    getSystemTelemetryStatus: 'ઇન્ફ્રાસ્ટ્રક્ચર ટેલિમેટ્રી પોલ કરી',
    getRecentAuthEvents: 'પ્રમાણીકરણ ઇવેન્ટ્સ તપાસી',
  },
  hi: {
    getConsumerBillDetails: 'बिलिंग बहीखाता जांचा गया',
    calculateTariffEstimate: 'GERC स्लैब की गणना की गई',
    getConsumerConnectionDetails: 'कनेक्शन तकनीकी विवरण सत्यापित',
    getConsumerPaymentHistory: 'भुगतान लेनदेन की जांच की',
    getConsumerComplaints: 'शिकायत टिकटों का निरीक्षण किया',
    getConsumerApplications: 'कनेक्शन आवेदनों को ट्रैक किया',
    listPendingApplications: 'आवेदन कतार को स्कैन किया',
    getComplaintSlaRisks: 'SLA उल्लंघन जोखिमों का मूल्यांकन किया',
    getConsumerLedgerSummary: 'उपभोक्ता बहीखाते का सारांश निकाला',
    listPendingApprovals: 'स्वीकृति कतार की जांच की',
    getAssignedWorkOrders: 'आवंटित कार्य आदेश प्राप्त किए',
    getFeederAndTransformerStatus: '11kV फीडर टेलीमेट्री क्वेरी की',
    getSiteFeasibilityQueue: 'साइट व्यवहार्यता कतार जांची',
    getSafetyProtocolGuidelines: 'CEA सुरक्षा प्रोटोकॉल लोड किए',
    getExecutiveKpiSummary: 'डिस्कॉम KPI का संश्लेषण किया',
    getFeederOverloadAnalytics: 'ओवरलोडेड फीडरों का विश्लेषण किया',
    getRevenueRealizationLedger: 'राजस्व बहीखाते का निरीक्षण किया',
    getDiscomComplaintTrends: 'शिकायत प्रवृत्तियों की गणना की',
    querySystemAuditLogs: 'सुरक्षा ऑडिट ट्रेल की जांच की',
    getSecurityAccessMatrix: 'RBAC एक्सेस मैट्रिक्स का ऑडिट किया',
    getSystemTelemetryStatus: 'इन्फ्रास्ट्रक्चर टेलीमेट्री जांची',
    getRecentAuthEvents: 'प्रमाणीकरण घटनाओं की जांच की',
  },
  mr: {
    getConsumerBillDetails: 'बिलिंग खातेवही तपासली',
    calculateTariffEstimate: 'GERC स्लॅबची गणना केली',
    getConsumerConnectionDetails: 'जोडणी तांत्रिक तपशील पडताळले',
    getConsumerPaymentHistory: 'पेमेंट व्यवहार तपासले',
    getConsumerComplaints: 'तक्रार तिकिटांची पाहणी केली',
    getConsumerApplications: 'जोडणी अर्ज ट्रॅक केले',
    listPendingApplications: 'अर्ज रांग स्कॅन केली',
    getComplaintSlaRisks: 'SLA उल्लंघन जोखमींचे मूल्यांकन केले',
    getConsumerLedgerSummary: 'ग्राहक खातेवहीचा सारांश काढला',
    listPendingApprovals: 'मंजुरी रांग तपासली',
    getAssignedWorkOrders: 'नियुक्त कार्य आदेश मिळवले',
    getFeederAndTransformerStatus: '11kV फीडर टेलीमेट्री तपासली',
    getSiteFeasibilityQueue: 'साइट व्यवहार्यता रांग तपासली',
    getSafetyProtocolGuidelines: 'CEA सुरक्षा नियम लोड केले',
    getExecutiveKpiSummary: 'डिस्कॉम KPI चे विश्लेषण केले',
    getFeederOverloadAnalytics: 'ओव्हरलोड फीडर्सचे विश्लेषण केले',
    getRevenueRealizationLedger: 'महसूल खातेवही तपासली',
    getDiscomComplaintTrends: 'तक्रार प्रवृत्तींची गणना केली',
    querySystemAuditLogs: 'सुरक्षा ऑडिट ट्रेल तपासली',
    getSecurityAccessMatrix: 'RBAC ऍक्सेस मॅट्रिक्सचे ऑडिट केले',
    getSystemTelemetryStatus: 'इन्फ्रास्ट्रक्चर टेलीमेट्री तपासली',
    getRecentAuthEvents: 'प्रमाणीकरण घटना तपासल्या',
  },
};

export const formatLocalizedToolChip = (toolName: string, lang: Language): string => {
  const dict = LOCALIZED_TOOL_CHIP_NAMES[lang] || LOCALIZED_TOOL_CHIP_NAMES.en;
  if (dict[toolName]) return dict[toolName];
  if (LOCALIZED_TOOL_CHIP_NAMES.en[toolName]) return LOCALIZED_TOOL_CHIP_NAMES.en[toolName];

  // Convert snake_case or kebab-case to camelCase
  const camelName = toolName.replace(/[-_]([a-z])/g, (_, g) => g.toUpperCase());
  if (dict[camelName]) return dict[camelName];
  if (LOCALIZED_TOOL_CHIP_NAMES.en[camelName]) return LOCALIZED_TOOL_CHIP_NAMES.en[camelName];

  // Map known tool patterns (case-insensitive without underscores)
  const normalized = toolName.toLowerCase().replace(/[-_]/g, '');
  for (const [key, val] of Object.entries(dict)) {
    if (key.toLowerCase() === normalized) return val;
  }
  for (const [key, val] of Object.entries(LOCALIZED_TOOL_CHIP_NAMES.en)) {
    if (key.toLowerCase() === normalized) return val;
  }

  // Fallback to formatted title case
  return toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
};

export const getAssistantTranslation = (lang: Language): AssistantUiDictionary => {
  return ASSISTANT_UI_TRANSLATIONS[lang] || ASSISTANT_UI_TRANSLATIONS.en;
};
