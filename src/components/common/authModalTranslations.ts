import { LanguageCode } from '../../i18n/types';

export interface AuthModalCopy {
  returnToHome: string;
  tagline: string;
  heroTitleLine1: string;
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  indReliable1: string;
  indReliable2: string;
  indSecure1: string;
  indSecure2: string;
  indSupport1: string;
  indSupport2: string;
  whySignIn: string;
  whyPay1: string;
  whyPay2: string;
  whyTrack1: string;
  whyTrack2: string;
  whyManage1: string;
  whyManage2: string;
  whyRaise1: string;
  whyRaise2: string;
  signInTitle: string;
  signUpTitle: string;
  signInSubtitle: string;
  signUpSubtitle: string;
  loginUserType: string;
  selectRole: string;
  roles: {
    consumer: { title: string; badge: string; desc: string };
    field: { title: string; badge: string; desc: string };
    employee: { title: string; badge: string; desc: string };
    management: { title: string; badge: string; desc: string };
    admin: { title: string; badge: string; desc: string };
  };
  usernamePlaceholder: string;
  usernameHint: string;
  passwordPlaceholder: string;
  rememberMe: string;
  forgotPassword: string;
  signInBtn: string;
  orOtpLink: string;
  registeredMobileLabel: string;
  mobilePlaceholder: string;
  securityVerification: string;
  antiBotLabel: string;
  captchaPlaceholder: string;
  sendOtpBtn: string;
  backToPasswordLogin: string;
  otpDispatchedTo: string;
  changeNumber: string;
  enterOtpLabel: string;
  didntReceiveCode: string;
  resendIn: string;
  resendOtp: string;
  verifyAccessPortal: string;
  staffAdminPlaceholder: string;
  staffFieldPlaceholder: string;
  staffManagementPlaceholder: string;
  staffOfficerPlaceholder: string;
  mfaPlaceholder: string;
  newToVidyutFlow: string;
  registerNow: string;
  citizenRegBanner: string;
  fullNamePlaceholder: string;
  emailPlaceholder: string;
  mobileSignupPlaceholder: string;
  passwordMinPlaceholder: string;
  confirmPlaceholder: string;
  createAccountBtn: string;
  alreadyHaveAccount: string;
  footerSecurity: string;
  footerRegulated: string;
}

export const AUTH_MODAL_COPY: Record<LanguageCode, AuthModalCopy> = {
  en: {
    returnToHome: 'Return to Home',
    tagline: 'Powering a Smarter Gujarat',
    heroTitleLine1: 'Smart Electricity Services',
    heroTitlePrefix: 'for a ',
    heroTitleHighlight: 'Better Tomorrow',
    indReliable1: 'Reliable',
    indReliable2: 'Power',
    indSecure1: 'Secure',
    indSecure2: 'Services',
    indSupport1: '24x7',
    indSupport2: 'Support',
    whySignIn: 'Why Sign In?',
    whyPay1: 'Pay Bills',
    whyPay2: 'Online',
    whyTrack1: 'Track',
    whyTrack2: 'Usage',
    whyManage1: 'Manage',
    whyManage2: 'Connections',
    whyRaise1: 'Raise',
    whyRaise2: 'Requests',
    signInTitle: 'Sign In to Your Account',
    signUpTitle: 'Create Consumer Account',
    signInSubtitle: 'Access your UGVCL services, manage connections, pay bills and more.',
    signUpSubtitle: 'Register for domestic electricity services, track connections and billing.',
    loginUserType: 'Login User Type',
    selectRole: 'Select Role',
    roles: {
      consumer: { title: 'Consumer', badge: 'Citizen Portal', desc: 'Domestic billing, payment & solar net-metering' },
      field: { title: 'Field Engineer', badge: 'Operations', desc: 'Substation workorders, 11kV radial feeders & DTC' },
      employee: { title: 'Employee', badge: 'ERP & Revenue', desc: 'Billing audits, service triage & sanction review' },
      management: { title: 'Management Cockpit', badge: 'Executive / HOD', desc: 'SCADA power flow, AT&C losses, grid stability & revenue KPIs' },
      admin: { title: 'Administrator', badge: 'Governance', desc: 'Ledger integrity, user RBAC & GERC compliance' },
    },
    usernamePlaceholder: 'Username / Registered Mobile / Email',
    usernameHint: 'Enter your username, email, or registered mobile number.',
    passwordPlaceholder: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password?',
    signInBtn: 'Sign In',
    orOtpLink: 'Or sign in via Single-Use Mobile OTP',
    registeredMobileLabel: 'Registered Mobile Number',
    mobilePlaceholder: '10-digit mobile number',
    securityVerification: 'Security Verification',
    antiBotLabel: 'Anti-bot protection',
    captchaPlaceholder: 'Enter characters shown above',
    sendOtpBtn: 'Send Verification OTP',
    backToPasswordLogin: '← Back to Password Login',
    otpDispatchedTo: 'OTP dispatched to',
    changeNumber: 'Change Number',
    enterOtpLabel: 'Enter 6-Digit OTP Code',
    didntReceiveCode: "Didn't receive code?",
    resendIn: 'Resend in',
    resendOtp: 'Resend OTP',
    verifyAccessPortal: 'Verify & Access Portal',
    staffAdminPlaceholder: 'Privileged Account ID / Email',
    staffFieldPlaceholder: 'Field Engineer ID (e.g. ugvcl-eng-01)',
    staffManagementPlaceholder: 'Executive ID (e.g. ugvcl-mgt-01)',
    staffOfficerPlaceholder: 'Employee ID (e.g. emp-ugvcl-001)',
    mfaPlaceholder: 'MFA Token / TOTP Code (Optional)',
    newToVidyutFlow: 'New to VidyutFlow?',
    registerNow: 'Register Now',
    citizenRegBanner: 'Citizen Registration: Apply for new connections and digital power management.',
    fullNamePlaceholder: 'Full Name (as per ID Proof)',
    emailPlaceholder: 'Email Address',
    mobileSignupPlaceholder: 'Mobile Number',
    passwordMinPlaceholder: 'Password (Min 8)',
    confirmPlaceholder: 'Confirm',
    createAccountBtn: 'Create Account',
    alreadyHaveAccount: 'Already have an account? Sign In',
    footerSecurity: 'UGVCL VidyutFlow Security',
    footerRegulated: 'GERC Regulated Access',
  },
  gu: {
    returnToHome: 'હોમ પેજ પર જાઓ',
    tagline: 'સ્માર્ટ ગુજરાતને ઊર્જાવાન બનાવતું પોર્ટલ',
    heroTitleLine1: 'સ્માર્ટ વીજળી સેવાઓ',
    heroTitlePrefix: '',
    heroTitleHighlight: 'ઉજ્જવળ આવતીકાલ માટે',
    indReliable1: 'વિશ્વસનીય',
    indReliable2: 'વીજ પુરવઠો',
    indSecure1: 'સુરક્ષિત',
    indSecure2: 'સેવાઓ',
    indSupport1: '24x7',
    indSupport2: 'સહાય',
    whySignIn: 'સાઇન ઇન શા માટે?',
    whyPay1: 'બિલ ભરો',
    whyPay2: 'ઓનલાઇન',
    whyTrack1: 'વપરાશ',
    whyTrack2: 'તપાસો',
    whyManage1: 'જોડાણ',
    whyManage2: 'મેનેજ કરો',
    whyRaise1: 'વિનંતી',
    whyRaise2: 'નોંધાવો',
    signInTitle: 'તમારા એકાઉન્ટમાં સાઇન ઇન કરો',
    signUpTitle: 'નવું ગ્રાહક એકાઉન્ટ બનાવો',
    signInSubtitle: 'તમારી UGVCL સેવાઓ મેળવો, જોડાણ મેનેજ કરો અને બિલ ભરો.',
    signUpSubtitle: 'ઘરેલુ વીજળી સેવાઓ, જોડાણ અને બિલિંગ માટે નોંધણી કરો.',
    loginUserType: 'લોગિન વપરાશકર્તા પ્રકાર',
    selectRole: 'ભૂમિકા પસંદ કરો',
    roles: {
      consumer: { title: 'ગ્રાહક', badge: 'નાગરિક પોર્ટલ', desc: 'ઘરેલુ બિલિંગ, ચુકવણી અને સોલર નેટ-મીટરિંગ' },
      field: { title: 'ફિલ્ડ એન્જિનિયર', badge: 'ઓપરેશન્સ', desc: 'સબસ્ટેશન વર્કઓર્ડર, 11kV ફીડર અને DTC' },
      employee: { title: 'કર્મચારી', badge: 'ERP અને મહેસૂલ', desc: 'બિલિંગ ઓડિટ, સેવા સમીક્ષા અને મંજૂરી' },
      management: { title: 'મેનેજમેન્ટ કોકપિટ', badge: 'એક્ઝિક્યુટિવ / HOD', desc: 'SCADA પાવર ફ્લો, AT&C નુકસાન અને ગ્રીડ KPI' },
      admin: { title: 'એડમિનિસ્ટ્રેટર', badge: 'શાસન', desc: 'લેજર અખંડિતતા, RBAC અને GERC અનુપાલન' },
    },
    usernamePlaceholder: 'વપરાશકર્તા નામ / નોંધાયેલ મોબાઇલ / ઇમેઇલ',
    usernameHint: 'તમારું વપરાશકર્તા નામ, ઇમેઇલ અથવા નોંધાયેલ મોબાઇલ નંબર દાખલ કરો.',
    passwordPlaceholder: 'પાસવર્ડ',
    rememberMe: 'મને યાદ રાખો',
    forgotPassword: 'પાસવર્ડ ભૂલી ગયા છો?',
    signInBtn: 'સાઇન ઇન',
    orOtpLink: 'અથવા સિંગલ-યુઝ મોબાઇલ OTP દ્વારા સાઇન ઇન કરો',
    registeredMobileLabel: 'નોંધાયેલ મોબાઇલ નંબર',
    mobilePlaceholder: '10-અંકનો મોબાઇલ નંબર',
    securityVerification: 'સુરક્ષા ચકાસણી',
    antiBotLabel: 'એન્ટિ-બોટ સુરક્ષા',
    captchaPlaceholder: 'ઉપર દર્શાવેલ અક્ષરો દાખલ કરો',
    sendOtpBtn: 'ચકાસણી OTP મોકલો',
    backToPasswordLogin: '← પાસવર્ડ લોગિન પર પાછા જાઓ',
    otpDispatchedTo: 'OTP મોકલવામાં આવ્યો:',
    changeNumber: 'નંબર બદલો',
    enterOtpLabel: '6-અંકનો OTP કોડ દાખલ કરો',
    didntReceiveCode: 'કોડ મળ્યો નથી?',
    resendIn: 'ફરીથી મોકલો',
    resendOtp: 'OTP ફરીથી મોકલો',
    verifyAccessPortal: 'ચકાસો અને પોર્ટલ ખોલો',
    staffAdminPlaceholder: 'એડમિન એકાઉન્ટ ID / ઇમેઇલ',
    staffFieldPlaceholder: 'ફિલ્ડ એન્જિનિયર ID (દા.ત. ugvcl-eng-01)',
    staffManagementPlaceholder: 'એક્ઝિક્યુટિવ ID (દા.ત. ugvcl-mgt-01)',
    staffOfficerPlaceholder: 'કર્મચારી ID (દા.ત. emp-ugvcl-001)',
    mfaPlaceholder: 'MFA ટોકન / TOTP કોડ (વૈકલ્પિક)',
    newToVidyutFlow: 'VidyutFlow માં નવા છો?',
    registerNow: 'હવે નોંધણી કરો',
    citizenRegBanner: 'નાગરિક નોંધણી: નવા જોડાણ અને ડિજિટલ વીજ વ્યવસ્થાપન માટે અરજી કરો.',
    fullNamePlaceholder: 'પૂરું નામ (ઓળખ પુરાવા મુજબ)',
    emailPlaceholder: 'ઇમેઇલ સરનામું',
    mobileSignupPlaceholder: 'મોબાઇલ નંબર',
    passwordMinPlaceholder: 'પાસવર્ડ (ઓછામાં ઓછા 8)',
    confirmPlaceholder: 'પુષ્ટિ કરો',
    createAccountBtn: 'એકાઉન્ટ બનાવો',
    alreadyHaveAccount: 'પહેલેથી એકાઉન્ટ છે? સાઇન ઇન કરો',
    footerSecurity: 'UGVCL VidyutFlow સુરક્ષા',
    footerRegulated: 'GERC નિયંત્રિત ઍક્સેસ',
  },
  hi: {
    returnToHome: 'होम पेज पर लौटें',
    tagline: 'स्मार्ट गुजरात को ऊर्जावान बनाना',
    heroTitleLine1: 'स्मार्ट बिजली सेवाएँ',
    heroTitlePrefix: 'एक ',
    heroTitleHighlight: 'बेहतर कल के लिए',
    indReliable1: 'विश्वसनीय',
    indReliable2: 'बिजली',
    indSecure1: 'सुरक्षित',
    indSecure2: 'सेवाएँ',
    indSupport1: '24x7',
    indSupport2: 'सहायता',
    whySignIn: 'साइन इन क्यों करें?',
    whyPay1: 'बिल भरें',
    whyPay2: 'ऑनलाइन',
    whyTrack1: 'खपत',
    whyTrack2: 'देखें',
    whyManage1: 'कनेक्शन',
    whyManage2: 'प्रबंधित करें',
    whyRaise1: 'अनुरोध',
    whyRaise2: 'दर्ज करें',
    signInTitle: 'अपने खाते में साइन इन करें',
    signUpTitle: 'उपभोक्ता खाता बनाएँ',
    signInSubtitle: 'अपनी UGVCL सेवाएँ प्राप्त करें, कनेक्शन प्रबंधित करें और बिल भरें।',
    signUpSubtitle: 'घरेलू बिजली सेवाओं, कनेक्शन और बिलिंग के लिए पंजीकरण करें।',
    loginUserType: 'लॉगिन उपयोगकर्ता प्रकार',
    selectRole: 'भूमिका चुनें',
    roles: {
      consumer: { title: 'उपभोक्ता', badge: 'नागरिक पोर्टल', desc: 'घरेलू बिलिंग, भुगतान और सोलर नेट-मीटरिंग' },
      field: { title: 'फील्ड इंजीनियर', badge: 'संचालन', desc: 'सबस्टेशन कार्यआदेश, 11kV फीडर और DTC' },
      employee: { title: 'कर्मचारी', badge: 'ERP और राजस्व', desc: 'बिलिंग ऑडिट, सेवा समीक्षा और स्वीकृति' },
      management: { title: 'मैनेजमेंट कॉकपिट', badge: 'कार्यकारी / HOD', desc: 'SCADA पावर फ्लो, AT&C हानि और ग्रिड KPI' },
      admin: { title: 'प्रशासक', badge: 'शासन', desc: 'लेजर अखंडता, RBAC और GERC अनुपालन' },
    },
    usernamePlaceholder: 'यूज़रनेम / पंजीकृत मोबाइल / ईमेल',
    usernameHint: 'अपना यूज़रनेम, ईमेल या पंजीकृत मोबाइल नंबर दर्ज करें।',
    passwordPlaceholder: 'पासवर्ड',
    rememberMe: 'मुझे याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInBtn: 'साइन इन',
    orOtpLink: 'या सिंगल-यूज़ मोबाइल OTP से साइन इन करें',
    registeredMobileLabel: 'पंजीकृत मोबाइल नंबर',
    mobilePlaceholder: '10-अंकीय मोबाइल नंबर',
    securityVerification: 'सुरक्षा सत्यापन',
    antiBotLabel: 'एंटी-बॉट सुरक्षा',
    captchaPlaceholder: 'ऊपर दिखाए गए अक्षर दर्ज करें',
    sendOtpBtn: 'सत्यापन OTP भेजें',
    backToPasswordLogin: '← पासवर्ड लॉगिन पर वापस जाएँ',
    otpDispatchedTo: 'OTP भेजा गया:',
    changeNumber: 'नंबर बदलें',
    enterOtpLabel: '6-अंकीय OTP कोड दर्ज करें',
    didntReceiveCode: 'कोड नहीं मिला?',
    resendIn: 'पुनः भेजें',
    resendOtp: 'OTP पुनः भेजें',
    verifyAccessPortal: 'सत्यापित करें और पोर्टल खोलें',
    staffAdminPlaceholder: 'एडमिन खाता ID / ईमेल',
    staffFieldPlaceholder: 'फील्ड इंजीनियर ID (जैसे ugvcl-eng-01)',
    staffManagementPlaceholder: 'कार्यकारी ID (जैसे ugvcl-mgt-01)',
    staffOfficerPlaceholder: 'कर्मचारी ID (जैसे emp-ugvcl-001)',
    mfaPlaceholder: 'MFA टोकन / TOTP कोड (वैकल्पिक)',
    newToVidyutFlow: 'VidyutFlow पर नए हैं?',
    registerNow: 'अभी पंजीकरण करें',
    citizenRegBanner: 'नागरिक पंजीकरण: नए कनेक्शन और डिजिटल बिजली प्रबंधन के लिए आवेदन करें।',
    fullNamePlaceholder: 'पूरा नाम (पहचान प्रमाण के अनुसार)',
    emailPlaceholder: 'ईमेल पता',
    mobileSignupPlaceholder: 'मोबाइल नंबर',
    passwordMinPlaceholder: 'पासवर्ड (न्यूनतम 8)',
    confirmPlaceholder: 'पुष्टि करें',
    createAccountBtn: 'खाता बनाएँ',
    alreadyHaveAccount: 'पहले से खाता है? साइन इन करें',
    footerSecurity: 'UGVCL VidyutFlow सुरक्षा',
    footerRegulated: 'GERC विनियमित पहुँच',
  },
  mr: {
    returnToHome: 'होम पेजवर परत जा',
    tagline: 'स्मार्ट गुजरातला ऊर्जा देणारे पोर्टल',
    heroTitleLine1: 'स्मार्ट वीज सेवा',
    heroTitlePrefix: '',
    heroTitleHighlight: 'उज्ज्वल उद्यासाठी',
    indReliable1: 'विश्वसनीय',
    indReliable2: 'वीज पुरवठा',
    indSecure1: 'सुरक्षित',
    indSecure2: 'सेवा',
    indSupport1: '24x7',
    indSupport2: 'मदत',
    whySignIn: 'साइन इन का करावे?',
    whyPay1: 'बिले भरा',
    whyPay2: 'ऑनलाइन',
    whyTrack1: 'वापर',
    whyTrack2: 'तपासा',
    whyManage1: 'जोडणी',
    whyManage2: 'व्यवस्थापन',
    whyRaise1: 'विनंती',
    whyRaise2: 'नोंदवा',
    signInTitle: 'तुमच्या खात्यात साइन इन करा',
    signUpTitle: 'ग्राहक खाते तयार करा',
    signInSubtitle: 'तुमच्या UGVCL सेवा मिळवा, जोडणी व्यवस्थापित करा आणि बिले भरा.',
    signUpSubtitle: 'घरगुती वीज सेवा, जोडणी आणि बिलिंगसाठी नोंदणी करा.',
    loginUserType: 'लॉगिन वापरकर्ता प्रकार',
    selectRole: 'भूमिका निवडा',
    roles: {
      consumer: { title: 'ग्राहक', badge: 'नागरिक पोर्टल', desc: 'घरगुती बिलिंग, पेमेंट आणि सोलर नेट-मीटरिंग' },
      field: { title: 'फील्ड अभियंता', badge: 'ऑपरेशन्स', desc: 'सबस्टेशन कामे, 11kV फीडर आणि DTC' },
      employee: { title: 'कर्मचारी', badge: 'ERP आणि महसूल', desc: 'बिलिंग ऑडिट, सेवा तपासणी आणि मंजुरी' },
      management: { title: 'मॅनेजमेंट कॉकपिट', badge: 'कार्यकारी / HOD', desc: 'SCADA पॉवर फ्लो, AT&C नुकसान आणि ग्रिड KPI' },
      admin: { title: 'प्रशासक', badge: 'प्रशासन', desc: 'लेजर अखंडता, RBAC आणि GERC अनुपालन' },
    },
    usernamePlaceholder: 'वापरकर्ता नाव / नोंदणीकृत मोबाईल / ईमेल',
    usernameHint: 'तुमचे वापरकर्ता नाव, ईमेल किंवा नोंदणीकृत मोबाईल नंबर प्रविष्ट करा.',
    passwordPlaceholder: 'पासवर्ड',
    rememberMe: 'मला लक्षात ठेवा',
    forgotPassword: 'पासवर्ड विसरलात?',
    signInBtn: 'साइन इन',
    orOtpLink: 'किंवा सिंगल-यूज मोबाईल OTP द्वारे साइन इन करा',
    registeredMobileLabel: 'नोंदणीकृत मोबाईल नंबर',
    mobilePlaceholder: '10-अंकी मोबाईल नंबर',
    securityVerification: 'सुरक्षा पडताळणी',
    antiBotLabel: 'अँटी-बॉट संरक्षण',
    captchaPlaceholder: 'वर दाखवलेली अक्षरे प्रविष्ट करा',
    sendOtpBtn: 'पडताळणी OTP पाठवा',
    backToPasswordLogin: '← पासवर्ड लॉगिनवर परत जा',
    otpDispatchedTo: 'OTP पाठवला:',
    changeNumber: 'नंबर बदला',
    enterOtpLabel: '6-अंकी OTP कोड प्रविष्ट करा',
    didntReceiveCode: 'कोड मिळाला नाही?',
    resendIn: 'पुन्हा पाठवा',
    resendOtp: 'OTP पुन्हा पाठवा',
    verifyAccessPortal: 'पडताळणी करा आणि पोर्टल उघडा',
    staffAdminPlaceholder: 'प्रशासक खाते ID / ईमेल',
    staffFieldPlaceholder: 'फील्ड अभियंता ID (उदा. ugvcl-eng-01)',
    staffManagementPlaceholder: 'कार्यकारी ID (उदा. ugvcl-mgt-01)',
    staffOfficerPlaceholder: 'कर्मचारी ID (उदा. emp-ugvcl-001)',
    mfaPlaceholder: 'MFA टोकन / TOTP कोड (ऐच्छिक)',
    newToVidyutFlow: 'VidyutFlow वर नवीन आहात?',
    registerNow: 'आता नोंदणी करा',
    citizenRegBanner: 'नागरिक नोंदणी: नवीन वीज जोडणी आणि डिजिटल व्यवस्थापनासाठी अर्ज करा.',
    fullNamePlaceholder: 'पूर्ण नाव (ओळख पुराव्यानुसार)',
    emailPlaceholder: 'ईमेल पत्ता',
    mobileSignupPlaceholder: 'मोबाईल नंबर',
    passwordMinPlaceholder: 'पासवर्ड (किमान 8)',
    confirmPlaceholder: 'पुष्टी करा',
    createAccountBtn: 'खाते तयार करा',
    alreadyHaveAccount: 'आधीच खाते आहे? साइन इन करा',
    footerSecurity: 'UGVCL VidyutFlow सुरक्षा',
    footerRegulated: 'GERC नियंत्रित प्रवेश',
  },
};

