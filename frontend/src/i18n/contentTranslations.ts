/**
 * UGVCL Localized Content Presentation Layer
 *
 * Provides typed, high-fidelity translations in Gujarati, Hindi, and Marathi
 * for all cards, categories, summaries, descriptions, badges, and modals
 * in the Welcome Hub.
 *
 * Architectural Principles:
 * 1. The canonical records in `ugvclHistoryData.ts` remain unaltered and authoritative.
 * 2. Every translation is mapped by stable record ID / Year / Key.
 * 3. English returns the exact canonical text verbatim.
 * 4. Missing translations fall back safely to canonical English without crashes.
 * 5. Official references, legal citations, case numbers, URLs, and measurements
 *    are strictly preserved.
 */

import {
  UgvclMilestone,
  UgvclAward,
  UgvclNotice,
  UgvclPhotoAsset
} from '../data/ugvclHistoryData';
import { LanguageCode } from './types';

export interface LocalizedMilestoneContent {
  title: string;
  category: string;
  description: string;
  verifiedSource?: string;
}

export interface LocalizedAwardContent {
  title: string;
  gradeOrRank: string;
  significance: string;
  officialReport?: string;
  awardingBody?: string;
}

export interface LocalizedNoticeContent {
  title: string;
  summary: string;
  category: string;
  circle: string;
  officialRef?: string;
}

export interface LocalizedPhotoContent {
  title: string;
  caption: string;
  category: string;
  subject: string;
  location: string;
  statusNotes?: string;
}

export interface LocalizedInfraFactContent {
  label: string;
  note: string;
}

/* ========================================================================= */
/* 1. HISTORICAL TIMELINE MILESTONES (8 Milestones)                           */
/* ========================================================================= */

export const LOCALIZED_MILESTONES: Record<string, Record<LanguageCode, LocalizedMilestoneContent>> = {
  '2003': {
    en: {
      title: 'Incorporation & Reorganization of Power Sector',
      category: 'Incorporation',
      description:
        'Incorporated on 15 September 2003 under the Companies Act 1956 pursuant to the restructuring of the erstwhile Gujarat Electricity Board (GEB) into distinct generation, transmission, and distribution entities.',
      verifiedSource: 'Certificate of Incorporation & Commencement of Business (GUVNL & UGVCL Official Records)'
    },
    gu: {
      title: 'કંપની સ્થાપના અને વીજ ક્ષેત્રનું પુનર્ગઠન',
      category: 'સંસ્થા સ્થાપના',
      description:
        'ભૂતપૂર્વ ગુજરાત વીજળી બોર્ડ (GEB) ના વીજ ઉત્પાદન, પ્રસારણ અને વિતરણ ક્ષેત્રોમાં ત્રિ-સ્તરીય પુનર્ગઠન અંતર્ગત ૧૫ સપ્ટેમ્બર ૨૦૦૩ ના રોજ કંપની ધારા ૧૯૫૬ હેઠળ UGVCL ની સ્થાપના કરવામાં આવી.',
      verifiedSource: 'સંસ્થા નોંધણી પ્રમાણપત્ર અને વ્યવસાય શરૂઆત (GUVNL અને UGVCL સત્તાવાર દસ્તાવેજો)'
    },
    hi: {
      title: 'कंपनी निगमन एवं विद्युत क्षेत्र का पुनर्गठन',
      category: 'संस्थापना',
      description:
        'पूर्ववर्ती गुजरात विद्युत बोर्ड (GEB) के उत्पादन, पारेषण और वितरण कंपनियों में पुनर्गठन के तहत १५ सितंबर २००३ को कंपनी अधिनियम १९५६ के अंतर्गत UGVCL की स्थापना हुई।',
      verifiedSource: 'निगमन प्रमाणपत्र एवं व्यावसायिक संचालन अनुमति (GUVNL और UGVCL आधिकारिक रिकॉर्ड)'
    },
    mr: {
      title: 'कंपनी स्थापना आणि वीज क्षेत्राची पुनर्रचना',
      category: 'संस्थापना',
      description:
        'तत्कालीन गुजरात वीज मंडळाच्या (GEB) निर्मिती, पारेषण आणि वितरण कंपन्यांमधील पुनर्रचनेनुसार १५ सप्टेंबर २००३ रोजी कंपनी कायदा १९५६ अंतर्गत UGVCL ची स्थापना झाली.',
      verifiedSource: 'कंपनी नोंदणी प्रमाणपत्र आणि व्यवसाय प्रारंभ (GUVNL आणि UGVCL अधिकृत अभिलेख)'
    }
  },
  '2005': {
    en: {
      title: 'Commencement of Full Commercial Operations',
      category: 'Incorporation',
      description:
        'Formally became fully operational on 1 April 2005 as an autonomous power distribution utility serving Northern Gujarat under Gujarat Urja Vikas Nigam Limited (GUVNL).',
      verifiedSource: 'Government of Gujarat Notification & GEB Transfer Scheme 2005'
    },
    gu: {
      title: 'સંપૂર્ણ વ્યાવસાયિક કામગીરીનો પ્રારંભ',
      category: 'સંસ્થા સ્થાપના',
      description:
        'ગુજરાત ઉર્જા વિકાસ નિગમ લિમિટેડ (GUVNL) હેઠળ ઉત્તર ગુજરાત ક્ષેત્રને વીજ પૂરવઠો આપતી એક સ્વાયત્ત વીજ વિતરણ કંપની તરીકે ૧ એપ્રિલ ૨૦૦૫ થી વિધિવત કાર્યરત બની.',
      verifiedSource: 'ગુજરાત સરકારનું જાહેરનામું અને GEB ટ્રાન્સફર સ્કીમ ૨૦૦૫'
    },
    hi: {
      title: 'पूर्ण व्यावसायिक संचालन का शुभारंभ',
      category: 'संस्थापना',
      description:
        'गुजरात ऊर्जा विकास निगम लिमिटेड (GUVNL) के तहत उत्तर गुजरात क्षेत्र की सेवा हेतु १ अप्रैल २००५ से स्वायत्त विद्युत वितरण कंपनी के रूप में विधिवत परिचालन शुरू हुआ।',
      verifiedSource: 'गुजरात सरकार अधिसूचना एवं GEB अंतरण योजना २००५'
    },
    mr: {
      title: 'पूर्ण व्यावसायिक कामकाजाचा प्रारंभ',
      category: 'संस्थापना',
      description:
        'गुजरात ऊर्जा विकास निगम लिमिटेड (GUVNL) अंतर्गत उत्तर गुजरात भागाला वीजपुरवठा करणारी स्वायत्त वीज वितरण संस्था म्हणून १ एप्रिल २००५ रोजी पूर्णपणे कार्यान्वित झाली.',
      verifiedSource: 'गुजरात शासन अधिसूचना आणि GEB हस्तांतरण योजना २००५'
    }
  },
  '2006': {
    en: {
      title: 'Jyotigram Yojana Village Electrification',
      category: 'Electrification',
      description:
        'Pioneered feeder segregation across North Gujarat to provide 24-hour uninterrupted 3-phase domestic electricity to all revenue villages and hamlets, while maintaining scheduled power to agricultural tubewells.',
      verifiedSource: 'Gujarat Energy Department & Planning Commission Evaluation of Jyotigram Yojana'
    },
    gu: {
      title: 'જ્યોતિગ્રામ યોજના ગ્રામીણ વીજળીકરણ સીમાચિહ્ન',
      category: 'વીજળીકરણ',
      description:
        'ઉત્તર ગુજરાતના તમામ મહેસૂલી ગામો અને પરા વિસ્તારોમાં ૨૪ કલાક અવિરત ૩-ફેઝ ઘરેલું વીજળી આપવા અને ખેતીવાડી વીજળીનું સમયબદ્ધ નિયમન કરવા ફીડર વિભાજન પદ્ધતિનો સફળ પ્રારંભ કર્યો.',
      verifiedSource: 'ગુજરાત ઊર્જા વિભાગ અને આયોજન પંચ જ્યોતિગ્રામ યોજના મૂલ્યાંકન અહેવાલ'
    },
    hi: {
      title: 'ज्योतिग्राम योजना ग्रामीण विद्युतीकरण मील का पत्थर',
      category: 'विद्युतीकरण',
      description:
        'उत्तर गुजरात के सभी राजस्व गांवों और बस्तियों में २४ घंटे निर्बाध ३-फेज घरेलू बिजली उपलब्ध कराने और कृषि ट्यूबवेलों को समयबद्ध आपूर्ति देने हेतु फीडर पृथक्करण की ऐतिहासिक शुरुआत की।',
      verifiedSource: 'गुजरात ऊर्जा विभाग एवं योजना आयोग ज्योतिग्राम योजना मूल्यांकन रिपोर्ट'
    },
    mr: {
      title: 'ज्योतिग्राम योजना ग्रामीण विद्युतीकरण टप्पा',
      category: 'विद्युतीकरण',
      description:
        'उत्तर गुजरातमधील सर्व महसूल गावे आणि वाड्या-वस्त्यांमध्ये २४ तास अखंड ३-फेज घरगुती वीज आणि शेतीपंपांना वेळापत्रकानुसार वीजपुरवठा करण्यासाठी फीडर विभाजनाची यशस्वी अंमलबजावणी केली.',
      verifiedSource: 'गुजरात ऊर्जा विभाग आणि नियोजन आयोग ज्योतिग्राम योजना मूल्यांकन अहवाल'
    }
  },
  '2012': {
    en: {
      title: 'Commissioning of Charanka Solar Park Feeders',
      category: 'Solar & Clean Energy',
      description:
        'Integrated transmission and feeder evacuation for the landmark Charanka Solar Park in Patan district (within UGVCL service territory), enabling large-scale solar power injection into the Gujarat grid.',
      verifiedSource: 'Gujarat Power Corporation Limited (GPCL) & GERC Tariff Orders'
    },
    gu: {
      title: 'ચારણકા સોલાર પાર્ક ફીડર ગ્રીડ સંકલન',
      category: 'સૌર અને સ્વચ્છ ઊર્જા',
      description:
        'પાટણ જિલ્લા સ્થિત ઐતિહાસિક ચારણકા સોલાર પાર્ક (UGVCL કાર્યક્ષેત્ર) માંથી ઉત્પાદિત વિશાળ સૌર ઊર્જાને ગુજરાત પાવર ગ્રીડમાં સુરક્ષિત રીતે સંકલિત કરવા ટ્રાન્સમિશન અને ફીડર વ્યવસ્થા સ્થાપી.',
      verifiedSource: 'ગુજરાત પાવર કોર્પોરેશન લિમિટેડ (GPCL) અને GERC ટેરિફ આદેશો'
    },
    hi: {
      title: 'चारणका सोलर पार्क फीडर ग्रिड एकीकरण',
      category: 'सौर एवं स्वच्छ ऊर्जा',
      description:
        'पाटन जिले में स्थित ऐतिहासिक चारणका सोलर पार्क (UGVCL अधिकार क्षेत्र) से उत्पादित वृहद सौर ऊर्जा को गुजरात ग्रिड में निकासी और समावेशन हेतु पारेषण व फीडर नेटवर्क चालू किया।',
      verifiedSource: 'गुजरात पावर कॉर्पोरेशन लिमिटेड (GPCL) एवं GERC टैरिफ आदेश'
    },
    mr: {
      title: 'चारणका सोलर पार्क फीडर ग्रिड एकत्रीकरण',
      category: 'सौर आणि स्वच्छ ऊर्जा',
      description:
        'पाटण जिल्ह्यातील ऐतिहासिक चारणका सोलर पार्क (UGVCL कार्यक्षेत्र) मधील सौर ऊर्जेची गुजरात ग्रिडमध्ये सुरक्षित जोडणी करण्यासाठी पारेषण व फीडर यंत्रणा यशस्वीरीत्या कार्यान्वित केली.',
      verifiedSource: 'गुजरात पॉवर कॉर्पोरेशन लिमिटेड (GPCL) आणि GERC दर आदेश'
    }
  },
  '2018': {
    en: {
      title: 'Suryashakti Kisan Yojana (SKY) Solar Feeders',
      category: 'Solar & Clean Energy',
      description:
        'Rollout of solarized agricultural feeders enabling farmers to generate solar electricity for irrigation and inject surplus units back into the UGVCL grid for guaranteed remunerative tariffs.',
      verifiedSource: 'Government of Gujarat Energy & Petrochemicals Department Resolution'
    },
    gu: {
      title: 'સૂર્યશક્તિ કિસાન યોજના (SKY) સોલાર ફીડર્સ',
      category: 'સૌર અને સ્વચ્છ ઊર્જા',
      description:
        'ખેડૂતો સિંચાઈ માટે પોતાની સૌર ઊર્જા ઉત્પન્ન કરી શકે અને વધારાની વીજળી ગ્રીડમાં આપીને નિશ્ચિત વળતર ટેરિફ મેળવી શકે તે માટે સોલારાઈઝ્ડ કૃષિ ફીડર્સનું વિતરણ શરૂ કર્યું.',
      verifiedSource: 'ગુજરાત સરકાર ઊર્જા અને પેટ્રોકેમિકલ્સ વિભાગ ઠરાવ'
    },
    hi: {
      title: 'सूर्यशक्ति किसान योजना (SKY) सोलर फीडर पहल',
      category: 'सौर एवं स्वच्छ ऊर्जा',
      description:
        'किसानों को सिंचाई हेतु सौर ऊर्जा उत्पादन करने और अधिशेष बिजली UGVCL ग्रिड को बेचकर गारंटीकृत लाभकारी आय अर्जित करने के लिए सौरीकृत कृषि फीडर योजना शुरू की गई।',
      verifiedSource: 'गुजरात सरकार ऊर्जा एवं पेट्रोकेमिकल्स विभाग संकल्प'
    },
    mr: {
      title: 'सूर्यशक्ती किसान योजना (SKY) सोलर फीडर उपक्रम',
      category: 'सौर आणि स्वच्छ ऊर्जा',
      description:
        'शेतकऱ्यांना सिंचनासाठी सौरऊर्जा तयार करण्यास आणि अतिरिक्त वीज UGVCL ग्रिडला देऊन हमीभाव मोबदला मिळवून देण्यास सक्षम करणाऱ्या सौर कृषी फीडर्सची सुरुवात केली.',
      verifiedSource: 'गुजरात शासन ऊर्जा व पेट्रोकेमिकल्स विभाग ठराव'
    }
  },
  '2020': {
    en: {
      title: 'Kisan Suryodaya Yojana (KSY) Daytime Agricultural Power',
      category: 'Electrification',
      description:
        'Shifted agricultural irrigation power supply to daytime hours (5:00 AM to 9:00 PM), protecting farmers from nocturnal field hazards, wildlife encounters, and ensuring safer cultivation.',
      verifiedSource: 'Ministry of Power & Government of Gujarat KSY Implementation Report'
    },
    gu: {
      title: 'કિસાન સૂર્યોદય યોજના (KSY) દિવસ દરમિયાન કૃષિ વીજળી',
      category: 'વીજળીકરણ',
      description:
        'ખેડૂતોને રાત્રિના સમયે ખેતરમાં જવાની મુશ્કેલીઓ અને વન્યજીવોના જોખમથી મુક્ત કરવા માટે ખેતીવાડી સિંચાઈ વીજ પૂરવઠો દિવસના કલાકોમાં (સવારે ૫:૦૦ થી રાત્રે ૯:૦૦) ઉપલબ્ધ કરાવ્યો.',
      verifiedSource: 'ઊર્જા મંત્રાલય અને ગુજરાત સરકાર KSY અમલીકરણ અહેવાલ'
    },
    hi: {
      title: 'किसान सूर्योदय योजना (KSY) दिनकालीन कृषि विद्युत',
      category: 'विद्युतीकरण',
      description:
        'किसानों को रात्रि में खेत के खतरों और जंगली जानवरों के भय से बचाने हेतु कृषि सिंचाई बिजली आपूर्ति को दिन के समय (सुबह ५:०० से रात ९:००) में परिवर्तित किया गया।',
      verifiedSource: 'विद्युत मंत्रालय एवं गुजरात सरकार KSY कार्यान्वयन रिपोर्ट'
    },
    mr: {
      title: 'किसान सूर्योदय योजना (KSY) दिवसा शेती वीजपुरवठा',
      category: 'विद्युतीकरण',
      description:
        'शेतकऱ्यांना रात्री शेतात होणाऱ्या धोक्यांपासून आणि वन्यजीवांपासून संरक्षण देण्यासाठी शेतीपंपांचा वीजपुरवठा दिवसा (सकाळी ५:०० ते रात्री ९:००) सुरू करण्यात आला.',
      verifiedSource: 'ऊर्जा मंत्रालय आणि गुजरात शासन KSY अंमलबजावणी अहवाल'
    }
  },
  '2024': {
    en: {
      title: 'GUVNL Ashta Vajra Unified Brand Architecture',
      category: 'Infrastructure',
      description:
        'Unveiled the unified "Ashta Vajra" institutional identity designed by National Institute of Design (NID) Ahmedabad, symbolizing continuous energy and collective operational strength.',
      verifiedSource: 'GUVNL Corporate Announcement July 2024 (NID Ahmedabad Design Review)'
    },
    gu: {
      title: 'GUVNL અષ્ટ વજ્ર એકીકૃત બ્રાન્ડ આર્કિટેક્ચર',
      category: 'ઇન્ફ્રાસ્ટ્રક્ચર',
      description:
        'નેશનલ ઇન્સ્ટિટ્યૂટ ઑફ ડિઝાઇન (NID) અમદાવાદ દ્વારા નિર્મિત એકીકૃત "અષ્ટ વજ્ર" સંસ્થાકીય ઓળખનું અનાવરણ કર્યું, જે અવિરત ઊર્જા અને સામૂહિક પરિચાલન શક્તિનું પ્રતીક છે.',
      verifiedSource: 'GUVNL સત્તાવાર જાહેરાત જુલાઈ ૨૦૨૪ (NID અમદાવાદ ડિઝાઇન રિવ્યૂ)'
    },
    hi: {
      title: 'GUVNL अष्ट वज्र एकीकृत ब्रांड संरचना',
      category: 'बुनियादी ढांचा',
      description:
        'राष्ट्रीय डिज़ाइन संस्थान (NID) अहमदाबाद द्वारा परिकल्पित एकीकृत "अष्ट वज्र" संस्थागत पहचान का अनावरण, जो निरंतर ऊर्जा और सामूहिक परिचालन शक्ति का प्रतीक है।',
      verifiedSource: 'GUVNL कॉर्पोरेट घोषणा जुलाई २०२४ (NID अहमदाबाद डिज़ाइन समीक्षा)'
    },
    mr: {
      title: 'GUVNL अष्ट वज्र एकात्मिक ब्रँड संरचना',
      category: 'पायाभूत सुविधा',
      description:
        'राष्ट्रीय डिझाइन संस्था (NID) अहमदाबाद यांनी तयार केलेल्या "अष्ट वज्र" एकात्मिक संस्थात्मक ओळखीचे अनावरण, जे अखंड ऊर्जा आणि सामूहिक कार्यक्षमतेचे प्रतीक आहे.',
      verifiedSource: 'GUVNL अधिकृत घोषणा जुलै २०२४ (NID अहमदाबाद डिझाइन पुनरावलोकन)'
    }
  },
  '2026': {
    en: {
      title: 'National Grade A+ in 14th Integrated Discom Rating',
      category: 'National Recognition',
      description:
        'Recognized by the Ministry of Power, Government of India and Power Finance Corporation (PFC) with the premier Grade A+ rating, ranking among the top state-owned distribution companies nationwide.',
      verifiedSource: '14th Annual Integrated Rating & Ranking of Power Utilities (Ministry of Power / PFC, Jan 2026)'
    },
    gu: {
      title: '૧૪મી સંકલિત ડિસ્કોમ રેટિંગમાં રાષ્ટ્રીય ગ્રેડ A+ સન્માન',
      category: 'રાષ્ટ્રીય સન્માન',
      description:
        'ભારત સરકારના ઊર્જા મંત્રાલય અને પાવર ફાઇનાન્સ કોર્પોરેશન (PFC) દ્વારા શ્રેષ્ઠ પરિચાલન માટે પ્રતિષ્ઠિત ગ્રેડ A+ રેટિંગ પ્રાપ્ત કર્યું, જે દેશની અગ્રણી સરકારી વીજ વિતરણ કંપનીઓમાં સ્થાન મેળવે છે.',
      verifiedSource: '૧૪મી વાર્ષિક સંકલિત રેટિંગ અને રેન્કિંગ (ઊર્જા મંત્રાલય / PFC, જાન્યુઆરી ૨૦૨૬)'
    },
    hi: {
      title: '१४वीं एकीकृत डिस्कॉम रेटिंग में राष्ट्रीय ग्रेड A+ सम्मान',
      category: 'राष्ट्रीय मान्यता',
      description:
        'विद्युत मंत्रालय, भारत सरकार और पावर फाइनेंस कॉर्पोरेशन (PFC) द्वारा उत्कृष्ट परिचालन हेतु प्रतिष्ठित ग्रेड A+ रेटिंग से सम्मानित, देश की शीर्ष सरकारी वितरण कंपनियों में शुमार।',
      verifiedSource: 'विद्युत उपयोगिताओं की १४वीं वार्षिक एकीकृत रेटिंग व रैंकिंग (ऊर्जा मंत्रालय / PFC, जन २०२६)'
    },
    mr: {
      title: '१४व्या एकात्मिक डिस्कॉम रेटिंगमध्ये राष्ट्रीय ग्रेड A+ सन्मान',
      category: 'राष्ट्रीय सन्मान',
      description:
        'ऊर्जा मंत्रालय, भारत सरकार आणि पॉवर फायनान्स कॉर्पोरेशन (PFC) द्वारे उत्कृष्ट कामगिरीसाठी प्रतिष्ठित ग्रेड A+ रेटिंग प्राप्त, देशातील अग्रगण्य शासकीय वीज वितरण कंपन्यांमध्ये स्थान.',
      verifiedSource: 'वीज कंपन्यांचे १४वे वार्षिक एकात्मिक रेटिंग व क्रमवारी (ऊर्जा मंत्रालय / PFC, जाने २०२६)'
    }
  }
};

/* ========================================================================= */
/* 2. NATIONAL RATINGS & ACHIEVEMENTS (4 Awards)                             */
/* ========================================================================= */

export const LOCALIZED_AWARDS: Record<string, Record<LanguageCode, LocalizedAwardContent>> = {
  'award-14th-rating': {
    en: {
      title: '14th Integrated Rating of Power Distribution Utilities',
      gradeOrRank: 'Grade A+ (Best Performing State Discom)',
      significance:
        'Achieved the top national tier across operational turnaround, billing and collection efficiency, AT&C loss management, and financial solvency.',
      officialReport: '14th Annual Integrated Rating & Ranking of Power Utilities (FY 2024-25)',
      awardingBody: 'Ministry of Power, Government of India & Power Finance Corporation (PFC)'
    },
    gu: {
      title: 'વીજ વિતરણ કંપનીઓનું ૧૪મું સંકલિત રેટિંગ',
      gradeOrRank: 'ગ્રેડ A+ (શ્રેષ્ઠ પ્રદર્શન કરતી રાજ્ય ડિસ્કોમ)',
      significance:
        'પરિચાલન સુધારણા, બિલિંગ અને વસૂલાત ક્ષમતા, AT&C નુકસાન નિયંત્રણ અને નાણાકીય સ્થિરતામાં દેશના સર્વોચ્ચ સ્તરે સ્થાન પ્રાપ્ત કર્યું.',
      officialReport: '૧૪મો વાર્ષિક સંકલિત રેટિંગ અને રેન્કિંગ અહેવાલ (FY ૨૦૨૪-૨૫)',
      awardingBody: 'ઊર્જા મંત્રાલય, ભારત સરકાર અને પાવર ફાઇનાન્સ કોર્પોરેશન (PFC)'
    },
    hi: {
      title: 'विद्युत वितरण उपयोगिताओं की १४वीं एकीकृत रेटिंग',
      gradeOrRank: 'ग्रेड A+ (सर्वश्रेष्ठ प्रदर्शनकारी राज्य डिस्कॉम)',
      significance:
        'परिचालन सुधार, बिलिंग एवं संग्रह दक्षता, AT&C हानि नियंत्रण और वित्तीय सुदृढ़ता में राष्ट्रीय स्तर पर शीर्ष स्थान हासिल किया।',
      officialReport: '१४वीं वार्षिक एकीकृत रेटिंग एवं रैंकिंग रिपोर्ट (FY २०२४-२५)',
      awardingBody: 'विद्युत मंत्रालय, भारत सरकार एवं पावर फाइनेंस कॉर्पोरेशन (PFC)'
    },
    mr: {
      title: 'वीज वितरण कंपन्यांचे १४वे एकात्मिक रेटिंग',
      gradeOrRank: 'ग्रेड A+ (सर्वोत्कृष्ट कामगिरी करणारी राज्य डिस्कॉम)',
      significance:
        'कार्यक्षम परिचालन, बिलिंग व वसुली कार्यक्षमता, AT&C नुकसान नियंत्रण आणि आर्थिक स्थैर्य या निकषांवर राष्ट्रीय पातळीवर सर्वोच्च स्थान मिळवले.',
      officialReport: '१४वा वार्षिक एकात्मिक रेटिंग व क्रमवारी अहवाल (FY २०२४-૨५)',
      awardingBody: 'ऊर्जा मंत्रालय, भारत सरकार आणि पॉवर फायनान्स कॉर्पोरेशन (PFC)'
    }
  },
  'award-12th-rating': {
    en: {
      title: '12th Edition Integrated Rating of Discoms',
      gradeOrRank: 'Rank 5 Nationwide (Grade A+)',
      significance:
        'Ranked 5th among all 55+ Indian distribution utilities in financial prudence, network reliability, and customer service delivery.',
      officialReport: '12th Edition of Integrated Rating of Discoms (PIB Release March 2024)',
      awardingBody: 'Power Finance Corporation (PFC) & REC Limited'
    },
    gu: {
      title: 'ડિસ્કોમ્સનું ૧૨મું સંકલિત રેટિંગ સંસ્કરણ',
      gradeOrRank: 'સમગ્ર દેશમાં ૫મો ક્રમ (ગ્રેડ A+)',
      significance:
        'નાણાકીય શિસ્ત, નેટવર્ક વિશ્વસનીયતા અને શ્રેષ્ઠ ગ્રાહક સેવા ક્ષેત્રે દેશની તમામ ૫૫+ વીજ વિતરણ કંપનીઓમાં ૫મો ક્રમ પ્રાપ્ત કર્યો.',
      officialReport: 'ડિસ્કોમ્સના સંકલિત રેટિંગની ૧૨મી આવૃત્તિ (PIB વિજ્ઞપ્તિ માર્ચ ૨૦૨૪)',
      awardingBody: 'પાવર ફાઇનાન્સ કોર્પોરેશન (PFC) અને REC લિમિટેડ'
    },
    hi: {
      title: 'डिस्कॉम का १२वां एकीकृत रेटिंग संस्करण',
      gradeOrRank: 'देशभर में ५वीं रैंक (ग्रेड A+)',
      significance:
        'वित्तीय विवेक, ग्रिड विश्वसनीयता और उपभोक्ता सेवा वितरण में देश की सभी ५५+ वितरण कंपनियों में ५वां स्थान अर्जित किया।',
      officialReport: 'डिस्कॉम की एकीकृत रेटिंग का १२वां संस्करण (PIB प्रेस विज्ञप्ति मार्च २०२४)',
      awardingBody: 'पावर फाइनेंस कॉर्पोरेशन (PFC) एवं आरईसी लिमिटेड'
    },
    mr: {
      title: 'डिस्कॉमचे १२वे एकात्मिक रेटिंग संस्करण',
      gradeOrRank: 'देशभरात ५वा क्रमांक (ग्रेड A+)',
      significance:
        'आर्थिक शिस्त, नेटवर्क विश्वासार्हता आणि ग्राहक सेवा वितरणात देशातील सर्व ५५+ वितरण कंपन्यांमध्ये ५वा क्रमांक पटकावला.',
      officialReport: 'डिस्कॉम एकात्मिक रेटिंगची १२वी आवृत्ती (PIB प्रसिद्धी मार्च २०२४)',
      awardingBody: 'पॉवर फायनान्स कॉर्पोरेशन (PFC) आणि आरईसी लिमिटेड'
    }
  },
  'award-11th-rating': {
    en: {
      title: '11th Annual Integrated Rating & Ranking',
      gradeOrRank: 'Grade A+ (Rank 2 in Gujarat)',
      significance:
        'Consistent top-quartile performance for continuous 24x7 village power and agriculture feeder separation.',
      officialReport: '11th Annual Integrated Rating & Ranking of Power Utilities (April 2023)',
      awardingBody: 'Ministry of Power, Government of India'
    },
    gu: {
      title: '૧૧મો વાર્ષિક સંકલિત રેટિંગ અને રેન્કિંગ',
      gradeOrRank: 'ગ્રેડ A+ (ગુજરાતમાં બીજો ક્રમ)',
      significance:
        'ગામડાંઓમાં ૨૪x૭ અવિરત વીજળી અને કૃષિ ફીડર વિભાજનમાં સતત અગ્રણી ક્વાર્ટોઇલ પ્રદર્શનની રાષ્ટ્રીય પ્રશંસા.',
      officialReport: '૧૧મો વાર્ષિક સંકલિત રેટિંગ અને રેન્કિંગ અહેવાલ (એપ્રિલ ૨૦૨૩)',
      awardingBody: 'ઊર્જા મંત્રાલય, ભારત સરકાર'
    },
    hi: {
      title: '११वीं वार्षिक एकीकृत रेटिंग एवं रैंकिंग',
      gradeOrRank: 'ग्रेड A+ (गुजरात में दूसरा स्थान)',
      significance:
        'गांवों में निरंतर २४x७ बिजली आपूर्ति और कृषि फीडर पृथक्करण में लगातार शीर्ष प्रदर्शन के लिए सराहना।',
      officialReport: 'विद्युत उपयोगिताओं की ११वीं वार्षिक एकीकृत रेटिंग (अप्रैल २०२३)',
      awardingBody: 'विद्युत मंत्रालय, भारत सरकार'
    },
    mr: {
      title: '११वे वार्षिक एकात्मिक रेटिंग व क्रमवारी',
      gradeOrRank: 'ग्रेड A+ (गुजरातमध्ये २रा क्रमांक)',
      significance:
        'गावांमध्ये २४x७ अखंड वीजपुरवठा आणि कृषी फीडर विभाजनात सातत्यपूर्ण अव्वल कामगिरीची नोंद.',
      officialReport: 'वीज कंपन्यांचे ११वे वार्षिक एकात्मिक रेटिंग (एप्रिल २०२३)',
      awardingBody: 'ऊर्जा मंत्रालय, भारत सरकार'
    }
  },
  'award-jyotigram': {
    en: {
      title: 'Jyotigram Yojana Rural Electrification Benchmark',
      gradeOrRank: 'National Best Practice Model',
      significance:
        'Recognized as an international case study in power distribution reform that achieved 100% village 3-phase domestic electrification without subsidy insolvency.',
      officialReport: 'Planning Commission Evaluation Report on Feeder Segregation in Gujarat',
      awardingBody: 'International Council on Clean Transportation & Planning Commission of India'
    },
    gu: {
      title: 'જ્યોતિગ્રામ યોજના ગ્રામીણ વીજળીકરણ માપદંડ',
      gradeOrRank: 'રાષ્ટ્રીય શ્રેષ્ઠ મોડલ',
      significance:
        'સબસિડી નાદારી વિના ૧૦૦% ગામડાંઓમાં ૩-ફેઝ ઘરેલું વીજળીકરણ સિદ્ધ કરનાર આંતરરાષ્ટ્રીય કેસ સ્ટડી તરીકે સ્વીકૃતિ.',
      officialReport: 'ગુજરાતમાં ફીડર વિભાજન અંગે આયોજન પંચનો મૂલ્યાંકન અહેવાલ',
      awardingBody: 'આંતરરાષ્ટ્રીય સ્વચ્છ પરિવહન પરિષદ અને ભારતીય આયોજન પંચ'
    },
    hi: {
      title: 'ज्योतिग्राम योजना ग्रामीण विद्युतीकरण मानक',
      gradeOrRank: 'राष्ट्रीय सर्वोत्तम अभ्यास मॉडल',
      significance:
        'सब्सिडी दिवालियापन के बिना १००% ग्रामीण घरों में ३-फेज विद्युतीकरण करने वाले अंतरराष्ट्रीय केस स्टडी के रूप में मान्यता।',
      officialReport: 'गुजरात में फीडर पृथक्करण पर योजना आयोग की मूल्यांकन रिपोर्ट',
      awardingBody: 'अंतरराष्ट्रीय स्वच्छ परिवहन परिषद एवं भारत का योजना आयोग'
    },
    mr: {
      title: 'ज्योतिग्राम योजना ग्रामीण विद्युतीकरण मानदंड',
      gradeOrRank: 'राष्ट्रीय सर्वोत्तम कार्यपद्धती मॉडेल',
      significance:
        'कोणत्याही आर्थिक दिवाळखोरीशिवाय १००% गावांमध्ये ३-फेज घरगुती विद्युतीकरण साध्य करणारा आंतरराष्ट्रीय केस स्टडी म्हणून गौरव.',
      officialReport: 'गुजरातमधील फीडर विभाजनावर नियोजन आयोगाचा मूल्यमापन अहवाल',
      awardingBody: 'आंतरराष्ट्रीय स्वच्छ वाहतूक परिषद आणि भारताचा नियोजन आयोग'
    }
  }
};

/* ========================================================================= */
/* 3. NEWS, CIRCULARS & NOTICES (4 Notices)                                  */
/* ========================================================================= */

export const LOCALIZED_NOTICES: Record<string, Record<LanguageCode, LocalizedNoticeContent>> = {
  'notif-04': {
    en: {
      title: 'Planned Preventive Feeder Maintenance: 66kV Visnagar Road Substation',
      summary:
        'Scheduled maintenance on 11kV Dairy Road and Radhanpur Road feeders between 08:00 AM and 01:00 PM on 18-Oct-2026 for insulator replacement and tree clearance.',
      category: 'Maintenance',
      circle: 'Mehsana City Division',
      officialRef: 'Executive Engineer Maintenance Order'
    },
    gu: {
      title: 'આયોજિત નિવારક ફીડર જાળવણી: ૬૬ કેવી વિસનગર રોડ સબ-સ્ટેશન',
      summary:
        'ઇન્સ્યુલેટર બદલવા અને વૃક્ષોની ડાળીઓ હટાવવા માટે ૧૮-ઓક્ટો-૨૦૨૬ ના રોજ સવારે ૦૮:૦૦ થી બપોરે ૦૧:૦૦ વાગ્યા દરમિયાન ૧૧ કેવી ડેરી રોડ અને રાધનપુર રોડ ફીડર પર આયોજિત જાળવણી હાથ ધરાશે.',
      category: 'આયોજિત જાળવણી',
      circle: 'મહેસાણા શહેર વિભાગ',
      officialRef: 'કાર્યપાલક ઈજનેર જાળવણી આદેશ'
    },
    hi: {
      title: 'नियोजित निवारक फीडर रखरखाव: ६६ केवी विसनगर रोड सबस्टेशन',
      summary:
        'इंसुलेटर बदलने एवं पेड़ों की छंटाई कार्य हेतु १८-अक्टूबर-२०२६ को प्रातः ०८:०० से दोपहर ०१:०० बजे तक ११ केवी डेयरी रोड व राधनपुर रोड फीडरों पर निर्धारित रखरखाव किया जाएगा।',
      category: 'नियोजित रखरखाव',
      circle: 'मेहसाणा शहर संभाग',
      officialRef: 'कार्यपालक अभियंता रखरखाव आदेश'
    },
    mr: {
      title: 'नियोजित प्रतिबंधात्मक फीडर देखभाल: ६६ केव्ही विसनगर रोड सबस्टेशन',
      summary:
        'इन्सुलेटर बदलणे आणि झाडांच्या फांद्या छाटण्याच्या कामासाठी १८-ऑक्टोबर-२०२६ रोजी सकाळी ०८:०० ते दुपारी ०१:०० दरम्यान ११ केव्ही डेअरी रोड आणि राधनपूर रोड फीडर्सवर नियोजित देखभाल केली जाईल.',
      category: 'नियोजित देखभाल',
      circle: 'मेहसाणा शहर विभाग',
      officialRef: 'कार्यकारी अभियंता देखभाल आदेश'
    }
  },
  'notif-01': {
    en: {
      title: 'Kisan Suryodaya Yojana (KSY) Revised Daytime Feeder Roster for Rabi Season',
      summary:
        'Notification of scheduled daytime 8-hour 3-phase agricultural power supply across Mehsana, Patan, and Banaskantha circles effective from 20-Oct-2026. Farmers are advised to inspect motor starters.',
      category: 'Consumer Advisory',
      circle: 'All 6 Circles',
      officialRef: 'UGVCL Operations Desk Notification #441'
    },
    gu: {
      title: 'કિસાન સૂર્યોદય યોજના (KSY) રવિ સિઝન માટે સુધારેલું દિવસનું કૃષિ ફીડર રોસ્ટર',
      summary:
        '૨૦-ઓક્ટો-૨૦૨૬ થી મહેસાણા, પાટણ અને બનાસકાંઠા સર્કલમાં દિવસ દરમિયાન ૮ કલાક ૩-ફેઝ કૃષિ વીજ પુરવઠો આપવા અંગેની અધિસૂચના. ખેડૂત મિત્રોને મોટર સ્ટાર્ટર્સની ચકાસણી કરવા અનુરોધ છે.',
      category: 'ગ્રાહક માર્ગદર્શિકા',
      circle: 'તમામ ૬ સર્કલ્સ',
      officialRef: 'UGVCL પરિચાલન ડેસ્ક અધિસૂચના ક્રમાંક ૪૪૧'
    },
    hi: {
      title: 'किसान सूर्योदय योजना (KSY) रबी मौसम हेतु संशोधित दिनकालीन फीडर रोस्टर',
      summary:
        '२०-अक्टूबर-२०२६ से मेहसाणा, पाटन एवं बनासकांठा सर्कलों में दिन के समय ८ घंटे ३-फेज कृषि बिजली आपूर्ति की अधिसूचना। किसानों को मोटर स्टार्टर की जांच करने की सलाह दी जाती है।',
      category: 'उपभोक्ता परामर्श',
      circle: 'सभी ६ सर्कल',
      officialRef: 'UGVCL परिचालन डेस्क अधिसूचना क्रमांक ४४१'
    },
    mr: {
      title: 'किसान सूर्योदय योजना (KSY) रब्बी हंगामासाठी सुधारित दिवसाचे फीडर वेळापत्रक',
      summary:
        '२०-ऑक्टोबर-२०२६ पासून मेहसाणा, पाटण आणि बनासकांठा मंडळात दिवसा ८ तास ३-फेज शेती वीजपुरवठा देण्याबाबत अधिसूचना. शेतकऱ्यांनी मोटर स्टार्टर्स तपासून घेण्याचे आवाहन.',
      category: 'ग्राहक सल्लागार',
      circle: 'सर्व ६ मंडळे',
      officialRef: 'UGVCL परिचालन कक्ष अधिसूचना क्र. ४४१'
    }
  },
  'notif-02': {
    en: {
      title: 'Surya Gujarat Rooftop Solar Net-Metering Subsidy Phase-IV Application Guidelines',
      summary:
        'Guidelines for residential consumers seeking grid-connected rooftop solar systems from 1kW to 10kW with bi-directional smart meter installation within 15 working days.',
      category: 'Policy & Tariff',
      circle: 'Consumer Services Division',
      officialRef: 'GUVNL Surya Gujarat Circular 2026/089'
    },
    gu: {
      title: 'સૂર્ય ગુજરાત રૂફટોપ સોલાર નેટ-મીટરિંગ સબસિડી તબક્કો-૪ અરજી માર્ગદર્શિકા',
      summary:
        '૧૫ કામકાજી દિવસોમાં બાય-ડાયરેક્શનલ સ્માર્ટ મીટર સાથે ૧kW થી ૧૦kW સુધીના ગ્રીડ-કનેક્ટેડ રહેણાંક રૂફટોપ સોલાર સિસ્ટમ સ્થાપવા ઇચ્છતા ગ્રાહકો માટે સત્તાવાર માર્ગદર્શિકા.',
      category: 'નીતિ અને ટેરિફ',
      circle: 'ગ્રાહક સેવા વિભાગ',
      officialRef: 'GUVNL સૂર્ય ગુજરાત પરિપત્ર ૨૦૨૬/૦૮૯'
    },
    hi: {
      title: 'सूर्य गुजरात रूफटॉप सोलर नेट-मीटरिंग सब्सिडी चरण-IV आवेदन दिशा-निर्देश',
      summary:
        '१५ कार्यदिवसों के भीतर बाई-डायरेक्शनल स्मार्ट मीटर संस्थापन सहित १kW से १०kW तक ग्रिड-कनेक्टेड आवासीय रूफटॉप सोलर हेतु उपभोक्ताओं के लिए दिशा-निर्देश।',
      category: 'नीति एवं टैरिफ',
      circle: 'उपभोक्ता सेवा संभाग',
      officialRef: 'GUVNL सूर्य गुजरात परिपत्र २०२६/०८९'
    },
    mr: {
      title: 'सूर्य गुजरात रूफटॉप सोलर नेट-मीटरिंग अनुदान टप्पा-४ अर्ज मार्गदर्शक तत्त्वे',
      summary:
        '१५ कामकाजाच्या दिवसांत बाय-डायरेक्शनल स्मार्ट मीटरसह १kW ते १०kW क्षमतेच्या ग्रिड-कनेक्टेड निवासी रूफटॉप सोलरसाठी ग्राहकांसाठी अधिकृत मार्गदर्शक सूचना.',
      category: 'धोरण आणि दरपत्रक',
      circle: 'ग्राहक सेवा विभाग',
      officialRef: 'GUVNL सूर्य गुजरात परिपत्रक २०२६/०८૯'
    }
  },
  'notif-03': {
    en: {
      title: 'Tender for Supply and Erection of 11kV Covered Conductors in Forest Fringe Areas',
      summary:
        'National competitive bidding under Revamped Distribution Sector Scheme (RDSS) for conversion of overhead bare conductors to Medium Voltage Covered Conductors (MVCC) in Sabarkantha and Aravalli.',
      category: 'Tender & Procurement',
      circle: 'Procurement Wing, Mehsana',
      officialRef: 'E-Tender Portal Ref #T-114/2026'
    },
    gu: {
      title: 'વન સીમા વિસ્તારોમાં ૧૧ કેવી કવર્ડ કંડક્ટર સ્થાપન અને પુરવઠા માટેનું ટેન્ડર',
      summary:
        'સાબરકાંઠા અને અરવલ્લીમાં ઓવરહેડ ખુલ્લા વાયરોને મધ્યમ વોલ્ટેજ કવર્ડ કંડક્ટર (MVCC) માં રૂપાંતરિત કરવા રીવેમ્પ્ડ ડિસ્ટ્રિબ્યુશન સેક્ટર સ્કીમ (RDSS) અંતર્ગત રાષ્ટ્રીય સ્પર્ધાત્મક બિડિંગ.',
      category: 'ટેન્ડર અને ખરીદી',
      circle: 'ખરીદી વિભાગ, મહેસાણા',
      officialRef: 'ઈ-ટેન્ડર પોર્ટલ સંદર્ભ #T-114/2026'
    },
    hi: {
      title: 'वन सीमावर्ती क्षेत्रों में ११ केवी कवर्ड कंडक्टर स्थापना एवं आपूर्ति हेतु निविदा',
      summary:
        'साबरकांठा एवं अरवल्ली में ओवरहेड नंगे कंडक्टरों को मीडियम वोल्टेज कवर्ड कंडक्टर (MVCC) में बदलने हेतु आरडीएसएस (RDSS) योजना अंतर्गत राष्ट्रीय प्रतिस्पर्धी बोली।',
      category: 'निविदा एवं खरीद',
      circle: 'खरीद शाखा, मेहसाणा',
      officialRef: 'ई-टेंडर पोर्टल संदर्भ #T-114/2026'
    },
    mr: {
      title: 'वन सीमा भागात ११ केव्ही कव्हर्ड कंडक्टर पुरवठा व उभारणीसाठी निविदा',
      summary:
        'साबरकांठा आणि अरवलीमध्ये उघड्या तारांना मध्यम व्होल्टेज कव्हर्ड कंडक्टर (MVCC) मध्ये रूपांतरित करण्यासाठी आरडीएसएस (RDSS) योजनेअंतर्गत राष्ट्रीय स्पर्धात्मक बोली.',
      category: 'निविदा आणि खरेदी',
      circle: 'खरेदी शाखा, मेहसाणा',
      officialRef: 'ई-टेंडर पोर्टल संदर्भ #T-114/2026'
    }
  }
};

/* ========================================================================= */
/* 4. MEDIA GALLERY & PHOTO ASSETS (7 Photos)                                */
/* ========================================================================= */

export const LOCALIZED_PHOTOS: Record<string, Record<LanguageCode, LocalizedPhotoContent>> = {
  'photo-area-map': {
    en: {
      title: 'Official Jurisdiction Area Map of UGVCL',
      caption:
        'Official geographic distribution jurisdiction map of Uttar Gujarat Vij Company Limited delineating the 6 North Gujarat administrative districts: Mehsana, Gandhinagar, Sabarkantha, Banaskantha, Patan, and Aravalli.',
      category: 'Official Jurisdiction',
      subject: 'UGVCL Geographical Service Territory & District Borders',
      location: 'North Gujarat Region (Mehsana, Gandhinagar, Sabarkantha, Banaskantha, Patan, Aravalli)',
      statusNotes: 'Verified official territory chart of UGVCL distribution operations.'
    },
    gu: {
      title: 'UGVCL સત્તાવાર ભૌગોલિક અધિકારક્ષેત્ર નકશો',
      caption:
        'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડનો સત્તાવાર વિતરણ વિસ્તાર નકશો, જેમાં ઉત્તર ગુજરાતના ૬ વહીવટી જિલ્લાઓ દર્શાવેલ છે: મહેસાણા, ગાંધીનગર, સાબરકાંઠા, બનાસકાંઠા, પાટણ અને અરવલ્લી.',
      category: 'અધિકારક્ષેત્ર',
      subject: 'UGVCL ભૌગોલિક સેવા વિસ્તાર અને જિલ્લા સીમાઓ',
      location: 'ઉત્તર ગુજરાત પ્રદેશ (મહેસાણા, ગાંધીનગર, સાબરકાંઠા, બનાસકાંઠા, પાટણ, અરવલ્લી)',
      statusNotes: 'UGVCL વિતરણ કામગીરીનો ચકાસાયેલ સત્તાવાર વિસ્તાર નકશો.'
    },
    hi: {
      title: 'UGVCL आधिकारिक भौगोलिक क्षेत्राधिकार मानचित्र',
      caption:
        'उत्तर गुजरात वीज कंपनी लिमिटेड का आधिकारिक वितरण क्षेत्र मानचित्र, जिसमें उत्तर गुजरात के ६ प्रशासनिक जिले प्रदर्शित हैं: मेहसाणा, गांधीनगर, साबरकांठा, बनासकांठा, पाटन एवं अरवल्ली।',
      category: 'आधिकारिक क्षेत्राधिकार',
      subject: 'UGVCL भौगोलिक सेवा क्षेत्र एवं जिला सीमाएं',
      location: 'उत्तर गुजरात क्षेत्र (मेहसाणा, गांधीनगर, साबरकांठा, बनासकांठा, पाटन, अरवल्ली)',
      statusNotes: 'UGVCL वितरण संचालन का सत्यापित आधिकारिक क्षेत्र चार्ट।'
    },
    mr: {
      title: 'UGVCL अधिकृत भौगोलिक कार्यक्षेत्र नकाशा',
      caption:
        'उत्तर गुजरात वीज कंपनी लिमिटेडचा अधिकृत वितरण क्षेत्र नकाशा, ज्यामध्ये उत्तर गुजरातमधील ६ प्रशासकीय जिल्हे दर्शवले आहेत: मेहसाणा, गांधीनगर, साबरकांठा, बनासकांठा, पाटण आणि अरवली.',
      category: 'अधिकृत कार्यक्षेत्र',
      subject: 'UGVCL भौगोलिक सेवा क्षेत्र आणि जिल्हा सीमा',
      location: 'उत्तर गुजरात प्रदेश (मेहसाणा, गांधीनगर, साबरकांठा, बनासकांठा, पाटण, अरवली)',
      statusNotes: 'UGVCL वितरण कामकाजाचा पडताळलेला अधिकृत नकाशा.'
    }
  },
  'photo-charanka-solar': {
    en: {
      title: 'Charanka Solar Park, Patan (UGVCL Service Area)',
      caption:
        'The landmark Gujarat Solar Park-1 at Charanka in Patan district, situated within UGVCL jurisdiction, generating green energy evacuated into the Gujarat state transmission and distribution grid.',
      category: 'Solar & Green Energy',
      subject: 'Grid-Connected Solar Power Plant in North Gujarat',
      location: 'Charanka, Santalpur Taluka, Patan District, Gujarat (UGVCL Jurisdiction)',
      statusNotes: 'Verified authentic infrastructure within UGVCL territorial jurisdiction supplying GUVNL/UGVCL.'
    },
    gu: {
      title: 'ચારણકા સોલાર પાર્ક, પાટણ (UGVCL સેવા વિસ્તાર)',
      caption:
        'પાટણ જિલ્લાના ચારણકા ખાતે આવેલ સીમાચિહ્નરૂપ ગુજરાત સોલાર પાર્ક-૧, જે UGVCL અધિકારક્ષેત્રમાં સ્થિત છે અને રાજ્યના વીજ ગ્રીડમાં હરિત ઊર્જા પહોંચાડે છે.',
      category: 'સૌર અને હરિત ઊર્જા',
      subject: 'ઉત્તર ગુજરાતમાં ગ્રીડ-કનેક્ટેડ સોલાર પાવર પ્લાન્ટ',
      location: 'ચારણકા, સાંતલપુર તાલુકો, પાટણ જિલ્લો, ગુજરાત (UGVCL અધિકારક્ષેત્ર)',
      statusNotes: 'UGVCL ભૌગોલિક કાર્યક્ષેત્રમાં આવેલ પ્રમાણિત અધિકૃત સંરચના.'
    },
    hi: {
      title: 'चारणका सोलर पार्क, पाटन (UGVCL सेवा क्षेत्र)',
      caption:
        'पाटन जिले के चारणका में स्थित ऐतिहासिक गुजरात सोलर पार्क-१, जो UGVCL अधिकार क्षेत्र में स्थापित है और राज्य ग्रिड में हरित ऊर्जा प्रवाहित करता है।',
      category: 'सौर एवं हरित ऊर्जा',
      subject: 'उत्तर गुजरात में ग्रिड-संबद्ध सौर ऊर्जा संयंत्र',
      location: 'चारणका, सांतलपुर तालुका, पाटन जिला, गुजरात (UGVCL अधिकार क्षेत्र)',
      statusNotes: 'UGVCL क्षेत्रीय अधिकार क्षेत्र के अंतर्गत सत्यापित बुनियादी ढांचा।'
    },
    mr: {
      title: 'चारणका सोलर पार्क, पाटण (UGVCL सेवा क्षेत्र)',
      caption:
        'पाटण जिल्ह्यातील चारणका येथील ऐतिहासिक गुजरात सोलर पार्क-१, जे UGVCL कार्यक्षेत्रात असून राज्य ग्रिडमध्ये हरित ऊर्जा पुरवते.',
      category: 'सौर आणि हरित ऊर्जा',
      subject: 'उत्तर गुजरातमधील ग्रिड-संलग्न सौर ऊर्जा प्रकल्प',
      location: 'चारणका, सांतलपूर तालुका, पाटण जिल्हा, गुजरात (UGVCL कार्यक्षेत्र)',
      statusNotes: 'UGVCL कार्यक्षेत्रातील पडताळणी केलेली अधिकृत पायाभूत सुविधा.'
    }
  },
  'photo-substation-switchyard': {
    en: {
      title: '33kV / 11kV Distribution Substation Switchyard',
      caption:
        'Primary distribution substation switchyard featuring 33kV/11kV power transformers, outdoor vacuum circuit breakers (VCBs), busbars, and outgoing 11kV feeder bays.',
      category: 'Substations',
      subject: '33kV/11kV Primary Step-Down Distribution Substation in India',
      location: 'Standard Indian Distribution Substation Infrastructure (CC0 Dedicated)',
      statusNotes: 'Representative authentic Indian distribution substation switchyard of the exact electrical topology deployed across UGVCL circles.'
    },
    gu: {
      title: '૩૩ કેવી / ૧૧ કેવી વિતરણ સબ-સ્ટેશન સ્વિચયાર્ડ',
      caption:
        '૩૩ કેવી/૧૧ કેવી પાવર ટ્રાન્સફોર્મર્સ, આઉટડોર વેક્યૂમ સર્કિટ બ્રેકર્સ (VCBs), બસબાર અને આઉટગોઇંગ ૧૧ કેવી ફીડર બે ધરાવતું પ્રાથમિક વીજ વિતરણ સબ-સ્ટેશન સ્વિચયાર્ડ.',
      category: 'સબ-સ્ટેશનો',
      subject: '૩૩ કેવી/૧૧ કેવી પ્રાથમિક સ્ટેપ-ડાઉન વિતરણ સબ-સ્ટેશન',
      location: 'ભારતીય સ્ટાન્ડર્ડ વિતરણ સબ-સ્ટેશન ઇન્ફ્રાસ્ટ્રક્ચર',
      statusNotes: 'UGVCL સર્કલ્સમાં સ્થાપિત ચોક્કસ વિદ્યુત ટોપોલોજીનું પ્રતિનિધિ સ્વિચયાર્ડ.'
    },
    hi: {
      title: '३३ केवी / ११ केवी वितरण सबस्टेशन स्विचयार्ड',
      caption:
        '३३ केवी/११ केवी पावर ट्रांसफॉर्मर, आउटडोर वैक्यूम सर्किट ब्रेकर (VCBs), बसबार और ११ केवी आउटगोइंग फीडर बे से सुसज्जित प्राथमिक वितरण सबस्टेशन।',
      category: 'सबस्टेशन',
      subject: '३३ केवी/११ केवी प्राथमिक स्टेप-डाउन वितरण सबस्टेशन',
      location: 'भारतीय मानक विद्युत वितरण सबस्टेशन अवसंरचना',
      statusNotes: 'UGVCL सर्कलों में स्थापित विद्युत संरचना का प्रामाणिक प्रतिनिधि स्विचयार्ड।'
    },
    mr: {
      title: '३३ केव्ही / ११ केव्ही वितरण सबस्टेशन स्विचयार्ड',
      caption:
        '३३ केव्ही/११ केव्ही पॉवर ट्रान्सफॉर्मर्स, आउटडोअर व्हॅक्यूम सर्किट ब्रेकर्स (VCBs), बसबार आणि ११ केव्ही आउटगोइंग फीडर बे असलेले प्राथमिक वितरण सबस्टेशन स्विचयार्ड.',
      category: 'सबस्टेशन',
      subject: '३३ केव्ही/११ केव्ही प्राथमिक स्टेप-डाऊन वितरण सबस्टेशन',
      location: 'भारतीय मानक वीज वितरण सबस्टेशन रचना',
      statusNotes: 'UGVCL मंडळांमध्ये वापरल्या जाणाऱ्या विद्युत रचनेचे प्रातिनिधिक स्विचयार्ड.'
    }
  },
  'photo-distribution-transformer': {
    en: {
      title: '11kV / 440V Rural Distribution Transformer Pole (DTC)',
      caption:
        'Pole-mounted 11kV to 415V/230V 3-phase distribution transformer assembly with drop-out fuses (DO fuses), lightning arresters, and low-tension distribution lines characteristic of rural Jyotigram and agriculture networks.',
      category: 'Distribution Assets',
      subject: '11kV/440V 3-Phase Pole Mounted Distribution Transformer in India',
      location: 'Indian Power Distribution Network (Standard BIS Specification)',
      statusNotes: 'Authentic photograph of standardized Indian 11kV/440V pole distribution transformer.'
    },
    gu: {
      title: '૧૧ કેવી / ૪૪૦V ગ્રામીણ વિતરણ ટ્રાન્સફોર્મર પોલ (DTC)',
      caption:
        'જ્યોતિગ્રામ અને કૃષિ નેટવર્કની વિશેષતા ધરાવતો ૧૧ કેવી થી ૪૧૫V/૨૩૦V ૩-ફેઝ પોલ-માઉન્ટેડ ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર, ડ્રોપ-આઉટ ફ્યુઝ અને લાઈટનિંગ અરેસ્ટર.',
      category: 'વિતરણ નેટવર્ક',
      subject: 'ભારતીય ૧૧ કેવી/૪૪૦V ૩-ફેઝ પોલ માઉન્ટેડ વિતરણ ટ્રાન્સફોર્મર',
      location: 'ભારતીય વીજ વિતરણ નેટવર્ક (BIS સ્પેસિફિકેશન)',
      statusNotes: 'પ્રમાણિત ભારતીય ૧૧ કેવી/૪૪૦V પોલ વિતરણ ટ્રાન્સફોર્મરની અધિકૃત તસવીર.'
    },
    hi: {
      title: '११ केवी / ४४०V ग्रामीण वितरण ट्रांसफॉर्मर पोल (DTC)',
      caption:
        'ज्योतिग्राम और कृषि ग्रिड की पहचान वाला ११ केवी से ४१५V/२३०V ३-फेज पोल-माउंटेड ट्रांसफॉर्मर, ड्रॉप-आउट फ्यूज, तड़ित चालक और निम्न-तनाव वितरण लाइनें।',
      category: 'वितरण नेटवर्क',
      subject: '११ केवी/४४०V ३-फेज पोल-माउंटेड वितरण ट्रांसफॉर्मर',
      location: 'भारतीय विद्युत वितरण नेटवर्क (मानक BIS विनिर्देश)',
      statusNotes: 'मानकीकृत भारतीय ११ केवी/४४०V पोल ट्रांसफॉर्मर की प्रामाणिक तस्वीर।'
    },
    mr: {
      title: '११ केव्ही / ४४०V ग्रामीण वितरण ट्रान्सफॉर्मर पोल (DTC)',
      caption:
        'ज्योतिग्राम आणि शेती ग्रिडचे वैशिष्ट्य असलेला ११ केव्ही ते ४१५V/२३०V ३-फेज पोल-माऊंटेड वितरण ट्रान्सफॉर्मर, ड्रॉप-आऊट फ्युजेस आणि वीज प्रतिबंधक यंत्रणा.',
      category: 'वितरण नेटवर्क',
      subject: '११ केव्ही/४४०V ३-फेज पोल माऊंटेड वितरण ट्रान्सफॉर्मर',
      location: 'भारतीय वीज वितरण नेटवर्क (मानक BIS तपशील)',
      statusNotes: 'प्रमाणित भारतीय ११ केव्ही/४४०V पोल वितरण ट्रान्सफॉर्मरचे छायाचित्र.'
    }
  },
  'photo-stepup-substation': {
    en: {
      title: 'High-Voltage Grid Substation & Transmission Interconnect',
      caption:
        'High-voltage grid step-up and transmission interconnect facility supplying bulk electrical energy from generating stations into the sub-transmission distribution network.',
      category: 'Substations',
      subject: 'Government of India Grid Substation Facility',
      location: 'Ministry of Information & Broadcasting Photo Division Archive',
      statusNotes: 'Archival government photograph of high-voltage transmission substation.'
    },
    gu: {
      title: 'હાઈ-વોલ્ટેજ ગ્રીડ સબ-સ્ટેશન અને ટ્રાન્સમિશન ઇન્ટરકનેક્ટ',
      caption:
        'વીજ ઉત્પાદન મથકોમાંથી બલ્ક વિદ્યુત ઊર્જાને સબ-ટ્રાન્સમિશન વિતરણ નેટવર્કમાં પહોંચાડતી હાઇ-વોલ્ટેજ ગ્રીડ સ્ટેપ-અપ અને ટ્રાન્સમિશન ઇન્ટરકનેક્ટ સુવિધા.',
      category: 'સબ-સ્ટેશનો',
      subject: 'ભારત સરકાર ગ્રીડ સબ-સ્ટેશન સુવિધા',
      location: 'માહિતી અને પ્રસારણ મંત્રાલય ફોટો ડિવિઝન આર્કાઇવ',
      statusNotes: 'હાઇ-વોલ્ટેજ ટ્રાન્સમિશન સબ-સ્ટેશનનું આર્કાઇવલ સરકારી દસ્તાવેજ.'
    },
    hi: {
      title: 'उच्च-वोल्टेज ग्रिड सबस्टेशन एवं पारेषण इंटरकनेक्ट',
      caption:
        'उत्पादन स्टेशनों से उप-पारेषण वितरण नेटवर्क में थोक विद्युत ऊर्जा आपूर्ति करने वाली उच्च-वोल्टेज ग्रिड स्टेप-अप एवं पारेषण सुविधा।',
      category: 'सबस्टेशन',
      subject: 'भारत सरकार ग्रिड सबस्टेशन सुविधा',
      location: 'सूचना एवं प्रसारण मंत्रालय फोटो प्रभाग अभिलेखागार',
      statusNotes: 'उच्च वोल्टेज पारेषण सबस्टेशन का आधिकारिक सरकारी अभिलेख।'
    },
    mr: {
      title: 'उच्च-दाब ग्रिड सबस्टेशन आणि पारेषण इंटरकनेक्ट',
      caption:
        'निर्मिती केंद्रांमधून उप-पारेषण वितरण जाळ्यात मोठ्या प्रमाणावर वीजपुरवठा करणारी उच्च-दाब ग्रिड स्टेप-अप आणि पारेषण इंटरकनेक्ट सुविधा.',
      category: 'सबस्टेशन',
      subject: 'भारत सरकार ग्रिड सबस्टेशन सुविधा',
      location: 'माहिती आणि प्रसारण मंत्रालय फोटो विभाग अभिलेखागार',
      statusNotes: 'उच्च-दाब पारेषण सबस्टेशनचे अधिकृत शासकीय छायाचित्र.'
    }
  },
  'photo-transmission-pylon': {
    en: {
      title: 'High-Voltage Transmission Pylon at Sunset',
      caption:
        'High-voltage overhead transmission lines traversing rural corridors to deliver bulk power to sub-divisional distribution networks.',
      category: 'Distribution Assets',
      subject: 'High-Voltage Overhead Power Transmission Pylon',
      location: 'Overhead Electric Grid Corridor',
      statusNotes: 'Authentic licensed transmission pylon visual.'
    },
    gu: {
      title: 'સંધ્યાકાળે હાઈ-વોલ્ટેજ ટ્રાન્સમિશન પાયલોન ટાવર',
      caption:
        'સબ-ડિવિઝનલ વિતરણ નેટવર્ક સુધી વીજળી પહોંચાડવા માટે ગ્રામીણ ક્ષેત્રોમાંથી પસાર થતી હાઇ-વોલ્ટેજ ઓવરહેડ પાવર ટ્રાન્સમિશન લાઇન.',
      category: 'વિતરણ નેટવર્ક',
      subject: 'હાઇ-વોલ્ટેજ ઓવરહેડ પાવર ટ્રાન્સમિશન પાયલોન',
      location: 'ઓવરહેડ ઇલેક્ટ્રિક ગ્રીડ કોરિડોર',
      statusNotes: 'લાઇસન્સ પ્રાપ્ત અધિકૃત ટ્રાન્સમિશન પાયલોન દ્રશ્ય.'
    },
    hi: {
      title: 'सूर्यास्त के समय उच्च-वोल्टेज पारेषण पालोन टावर',
      caption:
        'उप-विभागीय वितरण नेटवर्क तक भारी विद्युत पहुंचाने के लिए ग्रामीण गलियारों से गुजरने वाली उच्च-वोल्टेज ओवरहेड पारेषण लाइनें।',
      category: 'वितरण नेटवर्क',
      subject: 'उच्च-वोल्टेज ओवरहेड विद्युत पारेषण पालोन',
      location: 'ओवरहेड विद्युत ग्रिड गलियारा',
      statusNotes: 'लाइसेंस प्राप्त प्रामाणिक पारेषण टावर दृश्य।'
    },
    mr: {
      title: 'सूर्यास्ताच्या वेळी उच्च-दाब पारेषण टॉवर',
      caption:
        'उप-विभागीय वितरण जाळ्यापर्यंत वीज पोहोचवण्यासाठी ग्रामीण भागातून जाणाऱ्या उच्च-दाब ओव्हरहेड पारेषण वाहिन्या.',
      category: 'वितरण नेटवर्क',
      subject: 'उच्च-दाब ओव्हरहेड विद्युत पारेषण टॉवर',
      location: 'ओव्हरहेड इलेक्ट्रिक ग्रिड कॉरिडॉर',
      statusNotes: 'परवानाधारक अधिकृत पारेषण टॉवर दृश्य.'
    }
  },
  'photo-corporate-office-mehsana': {
    en: {
      title: 'UGVCL Corporate Headquarters (Visnagar Road, Mehsana)',
      caption:
        'The administrative headquarters of Uttar Gujarat Vij Company Limited located on Visnagar Road, Mehsana - 384001, housing the Managing Director’s Secretariat, Chief Engineer offices, and Central Monitoring Cell.',
      category: 'Corporate Headquarters',
      subject: 'UGVCL Registered Corporate Office Building & Central Operations Center',
      location: 'Visnagar Road, Mehsana, Gujarat - 384001 (GPS: 23°35\'45"N 72°23\'24"E)',
      statusNotes: 'Asset Notice: Official press-release facade photograph pending public domain clearance; verified corporate address and GPS coordinates documented in accordance with asset transparency rules.'
    },
    gu: {
      title: 'UGVCL મુખ્ય કોર્પોરેટ વડું મથક (વિસનગર રોડ, મહેસાણા)',
      caption:
        'વિસનગર રોડ, મહેસાણા - ૩૮૪૦૦૧ ખાતે આવેલું ઉત્તર ગુજરાત વીજ કંપની લિમિટેડનું વહીવટી વડું મથક, જેમાં મેનેજિંગ ડિરેક્ટર સચિવાલય, ચીફ એન્જિનિયર કચેરીઓ અને સેન્ટ્રલ મોનિટરિંગ સેલ કાર્યરત છે.',
      category: 'મુખ્ય વહીવટી મથક',
      subject: 'UGVCL નોંધાયેલ મુખ્ય કચેરી ભવન અને કેન્દ્રીય પરિચાલન કેન્દ્ર',
      location: 'વિસનગર રોડ, મહેસાણા, ગુજરાત - ૩૮૪૦૦૧ (GPS: 23°35\'45"N 72°23\'24"E)',
      statusNotes: 'સંપત્તિ સૂચના: સત્તાવાર સરનામું અને જીપીએસ કોઓર્ડિનેટ્સ પારદર્શિતા નિયમો હેઠળ પ્રમાણિત છે.'
    },
    hi: {
      title: 'UGVCL कॉर्पोरेट मुख्यालय (विसनगर रोड, मेहसाणा)',
      caption:
        'विसनगर रोड, मेहसाणा - ३८४००१ स्थित उत्तर गुजरात वीज कंपनी लिमिटेड का प्रशासनिक मुख्यालय, जिसमें प्रबंध निदेशक सचिवालय, मुख्य अभियंता कार्यालय एवं केंद्रीय निगरानी प्रकोष्ठ स्थित हैं।',
      category: 'कॉर्पोरेट मुख्यालय',
      subject: 'UGVCL पंजीकृत कॉर्पोरेट कार्यालय भवन एवं केंद्रीय परिचालन केंद्र',
      location: 'विसनगर रोड, मेहसाणा, गुजरात - ३८४००१ (GPS: 23°35\'45"N 72°23\'24"E)',
      statusNotes: 'परिसंपत्ति सूचना: आधिकारिक पता और जीपीएस निर्देशांक पारदर्शिता नियमों के अनुरूप प्रलेखित हैं।'
    },
    mr: {
      title: 'UGVCL कॉर्पोरेट मुख्यालय (विसनगर रोड, मेहसाणा)',
      caption:
        'विसनगर रोड, मेहसाणा - ३८४००१ येथे असलेले उत्तर गुजरात वीज कंपनी लिमिटेडचे प्रशासकीय मुख्यालय, ज्यामध्ये व्यवस्थापकीय संचालक सचिवालय, मुख्य अभियंता कार्यालये आणि मध्यवर्ती नियंत्रण कक्ष आहेत.',
      category: 'कॉर्पोरेट मुख्यालय',
      subject: 'UGVCL नोंदणीकृत कॉर्पोरेट कार्यालय इमारत आणि मध्यवर्ती नियंत्रण केंद्र',
      location: 'विसनगर रोड, मेहसाणा, गुजरात - ३८४००१ (GPS: 23°35\'45"N 72°23\'24"E)',
      statusNotes: 'मालमत्ता नोंद: अधिकृत पत्ता आणि जीपीएस समन्वय पारदर्शकता नियमांनुसार प्रमाणित आहेत.'
    }
  }
};

/* ========================================================================= */
/* 5. INFRASTRUCTURE FACTS (6 Facts)                                         */
/* ========================================================================= */

export const LOCALIZED_INFRA_FACTS: Record<string, Record<LanguageCode, LocalizedInfraFactContent>> = {
  'Annual Energy Distributed': {
    en: {
      label: 'Annual Energy Distributed',
      note: 'Million Units per annum across North Gujarat'
    },
    gu: {
      label: 'વાર્ષિક વિતરિત વીજ ઊર્જા',
      note: 'સમગ્ર ઉત્તર ગુજરાતમાં વાર્ષિક મિલિયન યુનિટ્સ (MU)'
    },
    hi: {
      label: 'वार्षिक वितरित विद्युत ऊर्जा',
      note: 'उत्तर गुजरात में प्रति वर्ष मिलियन यूनिट्स (MU)'
    },
    mr: {
      label: 'वार्षिक वितरित वीज ऊर्जा',
      note: 'उत्तर गुजरातमधील दरवर्षीचे दशलक्ष युनिट्स (MU)'
    }
  },
  'Transmission Substation Feeds': {
    en: {
      label: 'Transmission Substation Feeds',
      note: '66kV/11kV GETCO-UGVCL Interconnects'
    },
    gu: {
      label: 'ટ્રાન્સમિશન સબ-સ્ટેશન ફીડ્સ',
      note: '૬૬ કેવી/૧૧ કેવી GETCO-UGVCL ઇન્ટરકનેક્ટ્સ'
    },
    hi: {
      label: 'पारेषण सबस्टेशन फीड्स',
      note: '६६ केवी/१૧ केवी GETCO-UGVCL इंटरकनेक्ट्स'
    },
    mr: {
      label: 'पारेषण सबस्टेशन फीड्स',
      note: '६६ केव्ही/११ केव्ही GETCO-UGVCL इंटरकनेक्ट्स'
    }
  },
  'Distribution Transformer Assets': {
    en: {
      label: 'Distribution Transformer Assets',
      note: '3-phase and single-phase transformers'
    },
    gu: {
      label: 'વિતરણ ટ્રાન્સફોર્મર સંપત્તિ',
      note: '૩-ફેઝ અને સિંગલ-ફેઝ ટ્રાન્સફોર્મર્સ'
    },
    hi: {
      label: 'वितरण ट्रांसफॉर्मर परिसंपत्तियां',
      note: '३-फेज एवं सिंगल-फेज ट्रांसफॉर्मर'
    },
    mr: {
      label: 'वितरण ट्रान्सफॉर्मर मालमत्ता',
      note: '३-फेज आणि सिंगल-फेज ट्रान्सफॉर्मर्स'
    }
  },
  '11kV High-Tension Lines': {
    en: {
      label: '11kV High-Tension Lines',
      note: 'Dedicated Jyotigram & Agriculture feeders'
    },
    gu: {
      label: '૧૧ કેવી હાઈ-ટેન્શન લાઈનો',
      note: 'સમર્પિત જ્યોતિગ્રામ અને કૃષિ ફીડર્સ'
    },
    hi: {
      label: '११ केवी हाई-टेंशन लाइनें',
      note: 'समर्पित ज्योतिग्राम एवं कृषि फीडर'
    },
    mr: {
      label: '११ केव्ही हाय-टेन्शन वाहिन्या',
      note: 'समर्पित ज्योतिग्राम आणि कृषी फीडर्स'
    }
  },
  'Low-Tension Distribution Grid': {
    en: {
      label: 'Low-Tension Distribution Grid',
      note: 'Last-mile 415V/230V consumer lines'
    },
    gu: {
      label: 'લો-ટેન્શન વિતરણ ગ્રીડ',
      note: 'અંતિમ છેડાની ૪૧૫V/૨૩૦V ગ્રાહક લાઈનો'
    },
    hi: {
      label: 'लो-टेंशन वितरण ग्रिड',
      note: 'अंतिम छोर की ४१५V/२३०V उपभोक्ता लाइनें'
    },
    mr: {
      label: 'लो-टेन्शन वितरण ग्रिड',
      note: 'शेवटच्या टोकापर्यंत ४१५V/२३०V ग्राहक वाहिन्या'
    }
  },
  'Sub-Divisional Operations Centers': {
    en: {
      label: 'Sub-Divisional Operations Centers',
      note: 'Decentralized local field offices'
    },
    gu: {
      label: 'સબ-ડિવિઝનલ સંચાલન કેન્દ્રો',
      note: 'વિકેન્દ્રિત સ્થાનિક ક્ષેત્રીય કચેરીઓ'
    },
    hi: {
      label: 'उप-संभागीय संचालन केंद्र',
      note: 'विकेंद्रीकृत स्थानीय क्षेत्रीय कार्यालय'
    },
    mr: {
      label: 'उप-विभागीय परिचालन केंद्रे',
      note: 'विकेंद्रित स्थानिक क्षेत्रीय कार्यालये'
    }
  }
};

/* ========================================================================= */
/* 6. MODAL & NOTICE ACTIONS LOCALIZATION HELPER                             */
/* ========================================================================= */

export const LOCALIZED_NOTICE_UI = {
  viewOriginalOrder: {
    en: 'View Original Order (English)',
    gu: 'મૂળ સત્તાવાર આદેશ જુઓ (અંગ્રેજી)',
    hi: 'मूल आधिकारिक आदेश देखें (अंग्रेजी)',
    mr: 'मूळ अधिकृत आदेश पहा (इंग्रजी)'
  },
  viewLocalizedOrder: {
    en: 'View Translated Order',
    gu: 'અનુવાદિત આદેશ જુઓ',
    hi: 'अनुवादित आदेश देखें',
    mr: 'भाषांतरित आदेश पहा'
  },
  originalBadge: {
    en: 'Original Official Text (English)',
    gu: 'મૂળ સત્તાવાર લખાણ (અંગ્રેજી)',
    hi: 'मूल आधिकारिक पाठ (अंग्रेजी)',
    mr: 'मूळ अधिकृत मजकूर (इंग्रजी)'
  },
  translatedBadge: {
    en: 'Verified Localized View',
    gu: 'પ્રમાણિત સ્થાનિક આવૃત્તિ',
    hi: 'सत्यापित स्थानीयकृत दृश्य',
    mr: 'पडताळणी केलेली स्थानिक आवृत्ती'
  }
};

/* ========================================================================= */
/* RESOLUTION FUNCTIONS (Pure, Safe, Fallback-Guaranteed)                     */
/* ========================================================================= */

/**
 * Returns localized presentation fields for a milestone.
 * Preserves canonical English if language is 'en' or translation is missing.
 */
export function getLocalizedMilestone(
  milestone: UgvclMilestone,
  language: LanguageCode
): LocalizedMilestoneContent & { verifiedSource: string } {
  const match = LOCALIZED_MILESTONES[milestone.year]?.[language];
  if (!match) {
    return {
      title: milestone.title,
      category: milestone.category,
      description: milestone.description,
      verifiedSource: milestone.verifiedSource
    };
  }
  return {
    title: match.title || milestone.title,
    category: match.category || milestone.category,
    description: match.description || milestone.description,
    verifiedSource: match.verifiedSource || milestone.verifiedSource
  };
}

/**
 * Returns localized presentation fields for an award/rating.
 */
export function getLocalizedAward(
  award: UgvclAward,
  language: LanguageCode
): LocalizedAwardContent & { officialReport: string; awardingBody: string } {
  const match = LOCALIZED_AWARDS[award.id]?.[language];
  if (!match) {
    return {
      title: award.title,
      gradeOrRank: award.gradeOrRank,
      significance: award.significance,
      officialReport: award.officialReport,
      awardingBody: award.awardingBody
    };
  }
  return {
    title: match.title || award.title,
    gradeOrRank: match.gradeOrRank || award.gradeOrRank,
    significance: match.significance || award.significance,
    officialReport: match.officialReport || award.officialReport,
    awardingBody: match.awardingBody || award.awardingBody
  };
}

/**
 * Returns localized presentation fields for a notice/circular.
 */
export function getLocalizedNotice(
  notice: UgvclNotice,
  language: LanguageCode
): LocalizedNoticeContent {
  const match = LOCALIZED_NOTICES[notice.id]?.[language];
  if (!match) {
    return {
      title: notice.title,
      summary: notice.summary,
      category: notice.category,
      circle: notice.circle,
      officialRef: notice.officialRef
    };
  }
  return {
    title: match.title || notice.title,
    summary: match.summary || notice.summary,
    category: match.category || notice.category,
    circle: match.circle || notice.circle,
    officialRef: match.officialRef || notice.officialRef
  };
}

/**
 * Returns localized presentation fields for a photo asset.
 */
export function getLocalizedPhoto(
  photo: UgvclPhotoAsset,
  language: LanguageCode
): LocalizedPhotoContent {
  const match = LOCALIZED_PHOTOS[photo.id]?.[language];
  if (!match) {
    return {
      title: photo.title,
      caption: photo.caption,
      category: photo.category,
      subject: photo.subject,
      location: photo.location,
      statusNotes: photo.statusNotes
    };
  }
  return {
    title: match.title || photo.title,
    caption: match.caption || photo.caption,
    category: match.category || photo.category,
    subject: match.subject || photo.subject,
    location: match.location || photo.location,
    statusNotes: match.statusNotes || photo.statusNotes
  };
}

/**
 * Returns localized presentation fields for an infrastructure fact.
 */
export function getLocalizedInfraFact(
  fact: { label: string; value: string; note: string },
  language: LanguageCode
): LocalizedInfraFactContent {
  const match = LOCALIZED_INFRA_FACTS[fact.label]?.[language];
  if (!match) {
    return {
      label: fact.label,
      note: fact.note
    };
  }
  return {
    label: match.label || fact.label,
    note: match.note || fact.note
  };
}
