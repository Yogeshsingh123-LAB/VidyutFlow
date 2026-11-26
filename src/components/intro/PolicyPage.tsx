import React from 'react';
import { ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageCode } from '../../i18n/types';

export type PolicyPageKind = 'privacy' | 'terms';

interface PolicyPageProps {
  kind: PolicyPageKind;
  onSwitchKind: (kind: PolicyPageKind) => void;
}

const POLICY_COPY: Record<
  LanguageCode,
  {
    privacyTitle: string;
    termsTitle: string;
    subtitle: string;
    privacySections: { heading: string; body: string }[];
    termsSections: { heading: string; body: string }[];
    officialPortalPrefix: string;
  }
> = {
  en: {
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms & Conditions',
    subtitle: 'Uttar Gujarat Vij Company Limited (UGVCL) — Official Digital Portal Policy',
    privacySections: [
      {
        heading: '1. Information Collected',
        body: 'Uttar Gujarat Vij Company Limited (UGVCL) collects only the information necessary to provide regulated electricity distribution services, including your full name, registered mobile number, email address, service premise address, electricity consumer number, meter readings, and statutory KYC/property documents submitted for new connections or service modifications.',
      },
      {
        heading: '2. Purpose & Use of Data',
        body: 'Collected information is used strictly for processing new electricity connection applications, issuing bi-monthly electricity bills, reconciling UPI/online payments, resolving outage or billing complaints, and fulfilling statutory reporting obligations under Gujarat Electricity Regulatory Commission (GERC) guidelines. UGVCL does not sell or rent consumer personal information to third parties.',
      },
      {
        heading: '3. Data Security & Session Cookies',
        body: 'All uploaded identity and property documents are stored in encrypted form, and portal authentication uses secure HttpOnly session cookies solely to maintain your authenticated session and protect against unauthorized access.',
      },
      {
        heading: '4. Privacy Contact',
        body: 'For questions or corrections regarding your consumer profile data, please contact UGVCL Customer Care at ccc@ugvcl.com or corporate@ugvcl.com, or write to UGVCL Corporate Office, Visnagar Road, Mehsana – 384001.',
      },
    ],
    termsSections: [
      {
        heading: '1. Acceptance & Regulatory Framework',
        body: 'By accessing or using the UGVCL digital consumer portal, you agree to comply with these Terms & Conditions as well as the Electricity Act, 2003 and applicable Gujarat Electricity Regulatory Commission (GERC) Electricity Supply Code and Related Matters Regulations.',
      },
      {
        heading: '2. Consumer Responsibilities',
        body: 'Applicants and consumers must provide accurate identity, contact, premises, and sanctioned load details when applying for a new connection, submitting self-meter readings, or linking an existing consumer number. Any false declaration or unauthorized tampering with metering equipment is subject to action under applicable electricity laws.',
      },
      {
        heading: '3. Billing, UPI QR & Delayed Payment Surcharge',
        body: 'Electricity bills are generated in accordance with approved GERC tariff schedules. Payments made via UPI QR, net banking, or cards are reconciled against your consumer account and official receipts are issued upon settlement. Bills paid after the due date attract Delayed Payment Surcharge (DPS) as per prevailing tariff rules.',
      },
      {
        heading: '4. Governing Law & Official Portal',
        body: 'All disputes arising out of portal usage or electricity supply services are governed by the laws of India and subject to the jurisdiction of competent courts in Mehsana, Gujarat.',
      },
    ],
    officialPortalPrefix: 'Official circulars and regulatory notices are published on',
  },
  gu: {
    privacyTitle: 'ગોપનીયતા નીતિ',
    termsTitle: 'નિયમો અને શરતો',
    subtitle: 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ (UGVCL) — સત્તાવાર ડિજિટલ પોર્ટલ નીતિ',
    privacySections: [
      {
        heading: '૧. એકત્રિત કરવામાં આવતી માહિતી',
        body: 'UGVCL માત્ર નિયંત્રિત વીજ વિતરણ સેવાઓ પૂરી પાડવા માટે જરૂરી માહિતી એકત્રિત કરે છે, જેમાં તમારું પૂરું નામ, નોંધાયેલ મોબાઇલ નંબર, ઇમેઇલ સરનામું, વીજ જોડાણનું સરનામું, ગ્રાહક નંબર, મીટર રીડિંગ અને નવા જોડાણ માટે સબમિટ કરેલા KYC/મિલકત દસ્તાવેજોનો સમાવેશ થાય છે.',
      },
      {
        heading: '૨. ડેટાનો હેતુ અને ઉપયોગ',
        body: 'એકત્રિત માહિતીનો ઉપયોગ માત્ર નવા વીજ જોડાણની અરજીઓ, દ્વિ-માસિક વીજ બિલ, UPI/ઓનલાઇન ચુકવણી, વીજ પુરવઠાની ફરિયાદોના નિવારણ અને GERC માર્ગદર્શિકા મુજબની વૈધાનિક કાર્યવાહી માટે થાય છે. UGVCL ગ્રાહકની વ્યક્તિગત માહિતી તૃતીય પક્ષને વેચતું નથી.',
      },
      {
        heading: '૩. ડેટા સુરક્ષા અને સેશન કૂકીઝ',
        body: 'બધા અપલોડ કરેલા ઓળખ અને મિલકત દસ્તાવેજો એન્ક્રિપ્ટેડ સ્વરૂપમાં સંગ્રહિત થાય છે અને પોર્ટલ સુરક્ષા માટે માત્ર સુરક્ષિત HttpOnly સેશન કૂકીઝનો ઉપયોગ થાય છે.',
      },
      {
        heading: '૪. ગોપનીયતા સંપર્ક',
        body: 'તમારી પ્રોફાઇલ માહિતી અંગેના પ્રશ્નો અથવા સુધારા માટે ccc@ugvcl.com અથવા corporate@ugvcl.com પર સંપર્ક કરો, અથવા UGVCL કોર્પોરેટ ઓફિસ, વિસનગર રોડ, મહેસાણા – 384001 પર પત્રવ્યવહાર કરો.',
      },
    ],
    termsSections: [
      {
        heading: '૧. સ્વીકૃતિ અને નિયમનકારી માળખું',
        body: 'UGVCL ડિજિટલ પોર્ટલનો ઉપયોગ કરીને, તમે આ નિયમો અને શરતો તેમજ વીજળી અધિનિયમ, 2003 અને GERC વીજ પુરવઠા સંહિતાના નિયમોનું પાલન કરવા સંમત થાઓ છો.',
      },
      {
        heading: '૨. ગ્રાહકની જવાબદારીઓ',
        body: 'અરજદારો અને ગ્રાહકોએ નવા જોડાણ, મીટર રીડિંગ અથવા ગ્રાહક નંબર લિંક કરતી વખતે સાચી ઓળખ, સંપર્ક અને મંજૂર લોડની વિગતો આપવી ફરજિયાત છે. મીટર સાથે છેડછાડ કાયદેસરની કાર્યવાહીને પાત્ર છે.',
      },
      {
        heading: '૩. બિલિંગ, UPI QR અને વિલંબિત ચુકવણી સરચાર્જ',
        body: 'વીજ બિલ GERC ટેરિફ મુજબ તૈયાર કરવામાં આવે છે. નિયત તારીખ પછી ભરેલા બિલ પર પ્રવર્તમાન નિયમો મુજબ વિલંબિત ચુકવણી સરચાર્જ (DPS) લાગુ પડે છે.',
      },
      {
        heading: '૪. લાગુ પડતો કાયદો અને સત્તાવાર પોર્ટલ',
        body: 'પોર્ટલના ઉપયોગ અથવા વીજ સેવાઓ સંબંધિત તમામ વિવાદો ભારતના કાયદાઓને આધીન રહેશે અને મહેસાણા, ગુજરાતની સક્ષમ અદાલતોના અધિકારક્ષેત્ર હેઠળ રહેશે.',
      },
    ],
    officialPortalPrefix: 'સત્તાવાર પરિપત્રો અને સૂચનાઓ અહીં પ્રકાશિત થાય છે:',
  },
  hi: {
    privacyTitle: 'गोपनीयता नीति',
    termsTitle: 'नियम एवं शर्तें',
    subtitle: 'उत्तर गुजरात विज कंपनी लिमिटेड (UGVCL) — आधिकारिक डिजिटल पोर्टल नीति',
    privacySections: [
      {
        heading: '1. एकत्रित की जाने वाली जानकारी',
        body: 'UGVCL केवल विनियमित बिजली वितरण सेवाएँ प्रदान करने के लिए आवश्यक जानकारी एकत्र करता है, जिसमें आपका पूरा नाम, पंजीकृत मोबाइल नंबर, ईमेल पता, परिसर का पता, उपभोक्ता संख्या, मीटर रीडिंग और नए कनेक्शन के लिए जमा KYC/संपत्ति दस्तावेज़ शामिल हैं।',
      },
      {
        heading: '2. डेटा का उद्देश्य एवं उपयोग',
        body: 'एकत्रित जानकारी का उपयोग केवल नए बिजली कनेक्शन आवेदन, द्वि-मासिक बिजली बिल, UPI/ऑनलाइन भुगतान, शिकायत निवारण और GERC दिशानिर्देशों के तहत वैधानिक रिपोर्टिंग के लिए किया जाता है। UGVCL व्यक्तिगत डेटा किसी तीसरे पक्ष को नहीं बेचता है।',
      },
      {
        heading: '3. डेटा सुरक्षा और सेशन कुकीज़',
        body: 'सभी अपलोड किए गए दस्तावेज़ एन्क्रिप्टेड रूप में संग्रहीत किए जाते हैं, और अनधिकृत पहुँच से सुरक्षा के लिए केवल सुरक्षित HttpOnly सेशन कुकीज़ का उपयोग किया जाता है।',
      },
      {
        heading: '4. गोपनीयता संपर्क',
        body: 'अपने प्रोफ़ाइल डेटा से संबंधित प्रश्नों या सुधारों के लिए ccc@ugvcl.com या corporate@ugvcl.com पर संपर्क करें, अथवा UGVCL कॉर्पोरेट कार्यालय, विसनगर रोड, मेहसाणा – 384001 पर लिखें।',
      },
    ],
    termsSections: [
      {
        heading: '1. स्वीकृति एवं नियामक ढाँचा',
        body: 'UGVCL डिजिटल उपभोक्ता पोर्टल का उपयोग करके, आप इन नियमों एवं शर्तों तथा विद्युत अधिनियम, 2003 और लागू GERC विद्युत आपूर्ति संहिता विनियमों का पालन करने के लिए सहमत होते हैं।',
      },
      {
        heading: '2. उपभोक्ता की जिम्मेदारियाँ',
        body: 'आवेदकों और उपभोक्ताओं को नया कनेक्शन लेते समय, स्वयं मीटर रीडिंग जमा करते समय या उपभोक्ता संख्या जोड़ते समय सटीक पहचान, संपर्क और स्वीकृत लोड विवरण प्रदान करना होगा।',
      },
      {
        heading: '3. बिलिंग, UPI QR और विलंबित भुगतान अधिभार',
        body: 'बिजली बिल अनुमोदित GERC टैरिफ अनुसूची के अनुसार बनाए जाते हैं। देय तिथि के बाद भुगतान किए गए बिलों पर प्रचलित नियमों के अनुसार विलंबित भुगतान अधिभार (DPS) लागू होता है।',
      },
      {
        heading: '4. शासी कानून और आधिकारिक पोर्टल',
        body: 'पोर्टल उपयोग या बिजली आपूर्ति सेवाओं से उत्पन्न सभी विवाद भारत के कानूनों द्वारा शासित होंगे और मेहसाणा, गुजरात के सक्षम न्यायालयों के अधिकार क्षेत्र में होंगे।',
      },
    ],
    officialPortalPrefix: 'आधिकारिक परिपत्र और नियामक सूचनाएँ यहाँ प्रकाशित होती हैं:',
  },
  mr: {
    privacyTitle: 'गोपनीयता धोरण',
    termsTitle: 'अटी व शर्ती',
    subtitle: 'उत्तर गुजरात वीज कंपनी लिमिटेड (UGVCL) — अधिकृत डिजिटल पोर्टल धोरण',
    privacySections: [
      {
        heading: '१. संकलित केलेली माहिती',
        body: 'UGVCL केवळ नियंत्रित वीज वितरण सेवा देण्यासाठी आवश्यक असलेली माहिती संकलित करते, ज्यामध्ये तुमचे पूर्ण नाव, नोंदणीकृत मोबाईल नंबर, ईमेल पत्ता, वीज जोडणीचा पत्ता, ग्राहक क्रमांक, मीटर रीडिंग आणि नवीन जोडणीसाठी सादर केलेली KYC/मालमत्ता कागदपत्रे यांचा समावेश होतो.',
      },
      {
        heading: '२. डेटाचा उद्देश आणि वापर',
        body: 'संकलित माहितीचा वापर केवळ नवीन वीज जोडणी अर्ज, द्वि-मासिक वीज बिले, UPI/ऑनलाइन पेमेंट, तक्रार निवारण आणि GERC मार्गदर्शक तत्त्वांनुसार वैधानिक अहवालासाठी केला जातो. UGVCL वैयक्तिक माहिती तृतीय पक्षाला विकत नाही.',
      },
      {
        heading: '३. डेटा सुरक्षा आणि सेशन कुकीज',
        body: 'अपलोड केलेली सर्व कागदपत्रे एन्क्रिप्टेड स्वरूपात जतन केली जातात आणि पोर्टल सुरक्षेसाठी केवळ सुरक्षित HttpOnly सेशन कुकीज वापरल्या जातात.',
      },
      {
        heading: '४. गोपनीयता संपर्क',
        body: 'तुमच्या प्रोफाइल डेटाबाबत प्रश्न किंवा दुरुस्तीसाठी ccc@ugvcl.com किंवा corporate@ugvcl.com वर संपर्क साधा, किंवा UGVCL कॉर्पोरेट कार्यालय, विसनगर रोड, मेहसाणा – 384001 येथे पत्रव्यवहार करा.',
      },
    ],
    termsSections: [
      {
        heading: '१. स्वीकृती आणि नियामक चौकट',
        body: 'UGVCL डिजिटल पोर्टलचा वापर करून, तुम्ही या अटी व शर्ती तसेच विद्युत कायदा, 2003 आणि लागू GERC वीज पुरवठा संहिता नियमांचे पालन करण्यास सहमती देता.',
      },
      {
        heading: '२. ग्राहकाची जबाबदारी',
        body: 'नवीन जोडणीसाठी अर्ज करताना, मीटर रीडिंग सादर करताना किंवा ग्राहक क्रमांक लिंक करताना अर्जदारांनी अचूक ओळख, संपर्क आणि मंजूर लोड तपशील देणे आवश्यक आहे.',
      },
      {
        heading: '३. बिलिंग, UPI QR आणि विलंब शुल्क',
        body: 'वीज बिले मंजूर GERC दरपत्रकानुसार तयार केली जातात. देय तारखेनंतर भरलेल्या बिलांवर प्रचलित नियमांनुसार विलंब शुल्क (DPS) लागू होते.',
      },
      {
        heading: '४. लागू कायदा आणि अधिकृत पोर्टल',
        body: 'पोर्टल वापर किंवा वीज पुरवठा सेवांशी संबंधित सर्व विवाद भारताच्या कायद्यांनुसार आणि मेहसाणा, गुजरात येथील सक्षम न्यायालयांच्या कार्यकक्षेत राहतील.',
      },
    ],
    officialPortalPrefix: 'अधिकृत परिपत्रके आणि नियामक सूचना येथे प्रसिद्ध केल्या जातात:',
  },
};

export const PolicyPage: React.FC<PolicyPageProps> = ({ kind, onSwitchKind }) => {
  const { language } = useLanguage();
  const copy = POLICY_COPY[language] || POLICY_COPY.en;
  const sections = kind === 'privacy' ? copy.privacySections : copy.termsSections;

  return (
    <main className="flex-1 bg-[#F4F7FB]">
      {/* Header Banner */}
      <section className="w-full bg-[#EAF2FB] border-b border-slate-200/80">
        <div className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2540]">
                {kind === 'privacy' ? copy.privacyTitle : copy.termsTitle}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-700">
                {copy.subtitle}
              </p>
              <div className="w-10 h-0.5 bg-[#FF6B00] mt-3" />
            </div>

            <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onSwitchKind('privacy')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  kind === 'privacy' ? 'bg-[#0A1C3E] text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{copy.privacyTitle}</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchKind('terms')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  kind === 'terms' ? 'bg-[#0A1C3E] text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{copy.termsTitle}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed">
          {sections.map((sec, idx) => (
            <div key={sec.heading} className="space-y-2">
              <h2 className="text-base font-bold text-[#0A2540]">{sec.heading}</h2>
              <p>
                {sec.body}
                {kind === 'terms' && idx === sections.length - 1 && (
                  <>
                    {' '}
                    {copy.officialPortalPrefix}{' '}
                    <a
                      href="https://www.ugvcl.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                    >
                      <span>www.ugvcl.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};
