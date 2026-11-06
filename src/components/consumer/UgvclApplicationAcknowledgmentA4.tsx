import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  MapPin,
  Phone,
  Mail,
  Zap,
} from 'lucide-react';
import {
  GeneratedOfficialDocument,
  getDocumentUiTranslations,
} from '../../utils/documentEngine';
import {
  UGVCL_LOGO_ASSET_PATH,
  UGVCL_COMPANY_NAME_EN,
  UGVCL_COMPANY_NAME_GU,
  UGVCL_CORPORATE_IDENTITY,
} from '../common/UgvclBrandIdentity';
import { Language } from '../../i18n/types';

interface UgvclApplicationAcknowledgmentA4Props {
  document: GeneratedOfficialDocument;
  language: Language;
}

const ACK_A4_LABELS: Record<
  Language,
  {
    officialReceiptTag: string;
    undertakingBanner: string;
    subdivisionPrefix: string;
    applicationDetailsHeading: string;
    applicationNoLabel: string;
    filingDateLabel: string;
    serviceRequestTypeLabel: string;
    targetSlaDateLabel: string;
    currentStageLabel: string;
    applicantJurisdictionHeading: string;
    applicantNameLabel: string;
    existingConsumerNoLabel: string;
    requestedServiceSpecsHeading: string;
    gercScheduleBadge: string;
    tariffCategoryLabel: string;
    requestedLoadLabel: string;
    supplyPhaseLabel: string;
    estimatedSanctionFeeLabel: string;
    documentsScheduleFallback: string;
    docsRegisteredSuffix: string;
    colDocDesc: string;
    colVerStatus: string;
    colSubMode: string;
    docFooterFallback: string;
    directivesHeading: string;
    directivePremisesTitle: string;
    directivePremisesBody: string;
    directiveOriginalsTitle: string;
    directiveOriginalsBody: string;
    directiveSlaTitle: string;
    directiveSlaBody: string;
    corporateFooterTitle: string;
    computerGeneratedNote: string;
    timestampPrefix: string;
  }
> = {
  en: {
    officialReceiptTag: 'Official Submission Receipt',
    undertakingBanner: 'Government of Gujarat Undertaking · Consumer Services Desk',
    subdivisionPrefix: 'Sub-Division',
    applicationDetailsHeading: 'Application Details',
    applicationNoLabel: 'Application No:',
    filingDateLabel: 'Filing Date:',
    serviceRequestTypeLabel: 'Service Request Type:',
    targetSlaDateLabel: 'Target SLA Date:',
    currentStageLabel: 'Current Stage:',
    applicantJurisdictionHeading: 'Applicant & Jurisdiction',
    applicantNameLabel: 'Applicant Name:',
    existingConsumerNoLabel: 'Existing Consumer No:',
    requestedServiceSpecsHeading: 'Requested Service & Technical Specifications',
    gercScheduleBadge: 'GERC Approved Tariff Schedule',
    tariffCategoryLabel: 'Tariff Category',
    requestedLoadLabel: 'Requested Load',
    supplyPhaseLabel: 'Supply Phase / Voltage',
    estimatedSanctionFeeLabel: 'Estimated Sanction Fee',
    documentsScheduleFallback: 'Schedule of Submitted Documents & Verification Status',
    docsRegisteredSuffix: 'Documents Registered',
    colDocDesc: 'Document Description',
    colVerStatus: 'Verification Status',
    colSubMode: 'Submission Mode',
    docFooterFallback: 'Physical verification of original documents will be conducted during the Junior Engineer site inspection.',
    directivesHeading: 'Official Directives for Applicant:',
    directivePremisesTitle: 'Premises Accessibility:',
    directivePremisesBody: 'Please ensure the installation premises are unlocked and accessible for technical site feasibility assessment by the Junior Engineer.',
    directiveOriginalsTitle: 'Original Verification:',
    directiveOriginalsBody: 'Original copies of property ownership documents, Aadhaar card, and wiring contractor completion certificate must be shown during site inspection.',
    directiveSlaTitle: 'SLA Standards of Performance:',
    directiveSlaBody: 'As per GERC guidelines, technical feasibility will be resolved within the prescribed timeline. Advance SMS notifications will be dispatched prior to the field engineer visit.',
    corporateFooterTitle: 'Uttar Gujarat Vij Company Limited · Corporate Utility ERP VidyutFlow 2.0',
    computerGeneratedNote: 'This is a computer-generated official utility acknowledgment. Requires no physical signature.',
    timestampPrefix: 'TIMESTAMP:',
  },
  gu: {
    officialReceiptTag: 'સત્તાવાર અરજી સ્વીકૃતિ રસીદ',
    undertakingBanner: 'ગુજરાત સરકારનું સાહસ · ગ્રાહક સેવા ડેસ્ક',
    subdivisionPrefix: 'સબ-ડિવિઝન',
    applicationDetailsHeading: 'અરજીની વિગતો',
    applicationNoLabel: 'અરજી નંબર:',
    filingDateLabel: 'નોંધણી તારીખ:',
    serviceRequestTypeLabel: 'સેવા વિનંતીનો પ્રકાર:',
    targetSlaDateLabel: 'લક્ષિત SLA તારીખ:',
    currentStageLabel: 'વર્તમાન તબક્કો:',
    applicantJurisdictionHeading: 'અરજદાર અને અધિકારક્ષેત્ર',
    applicantNameLabel: 'અરજદારનું નામ:',
    existingConsumerNoLabel: 'હાલનો ગ્રાહક નંબર:',
    requestedServiceSpecsHeading: 'માંગેલ સેવા અને તકનીકી વિગતો',
    gercScheduleBadge: 'GERC માન્ય ટેરિફ શેડ્યૂલ',
    tariffCategoryLabel: 'ટેરિફ શ્રેણી',
    requestedLoadLabel: 'માંગેલ લોડ',
    supplyPhaseLabel: 'સપ્લાય ફેઝ / વોલ્ટેજ',
    estimatedSanctionFeeLabel: 'અંદાજિત મંજૂરી ફી',
    documentsScheduleFallback: 'સબમિટ કરેલ દસ્તાવેજો અને ચકાસણી સ્થિતિ',
    docsRegisteredSuffix: 'નોંધાયેલા દસ્તાવેજો',
    colDocDesc: 'દસ્તાવેજ વિગત',
    colVerStatus: 'ચકાસણી સ્થિતિ',
    colSubMode: 'સબમિશન મોડ',
    docFooterFallback: 'જુનિયર એન્જિનિયરના સ્થળ નિરીક્ષણ દરમિયાન મૂળ દસ્તાવેજોની ભૌતિક ચકાસણી કરવામાં આવશે.',
    directivesHeading: 'અરજદાર માટે સત્તાવાર સૂચનાઓ:',
    directivePremisesTitle: 'સ્થળની સુલભતા:',
    directivePremisesBody: 'કૃપા કરીને જુનિયર એન્જિનિયર દ્વારા ટેકનિકલ સ્થળ તપાસ માટે પરિસર ખુલ્લું અને સુલભ રાખો.',
    directiveOriginalsTitle: 'મૂળ દસ્તાવેજ ચકાસણી:',
    directiveOriginalsBody: 'સ્થળ નિરીક્ષણ દરમિયાન મિલકત માલિકીના દસ્તાવેજો, આધાર કાર્ડ અને વાયરિંગ ટેસ્ટ પ્રમાણપત્રની મૂળ નકલો બતાવવાની રહેશે.',
    directiveSlaTitle: 'SLA કામગીરીના ધોરણો:',
    directiveSlaBody: 'GERC માર્ગદર્શિકા મુજબ નિર્ધારિત સમયમર્યાદામાં ટેકનિકલ તપાસ પૂર્ણ કરવામાં આવશે. ફિલ્ડ એન્જિનિયરની મુલાકાત પહેલાં SMS જાણ કરવામાં આવશે.',
    corporateFooterTitle: 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ · કોર્પોરેટ યુટિલિટી ERP વિદ્યુતફ્લો 2.0',
    computerGeneratedNote: 'આ કમ્પ્યુટર જનરેટેડ સત્તાવાર સ્વીકૃતિ પત્ર છે. ભૌતિક સહીની જરૂર નથી.',
    timestampPrefix: 'સમય:',
  },
  hi: {
    officialReceiptTag: 'आधिकारिक आवेदन पावती रसीद',
    undertakingBanner: 'गुजरात सरकार का उपक्रम · उपभोक्ता सेवा डेस्क',
    subdivisionPrefix: 'सब-डिवीजन',
    applicationDetailsHeading: 'आवेदन विवरण',
    applicationNoLabel: 'आवेदन संख्या:',
    filingDateLabel: 'आवेदन तिथि:',
    serviceRequestTypeLabel: 'सेवा अनुरोध प्रकार:',
    targetSlaDateLabel: 'लक्षित SLA तिथि:',
    currentStageLabel: 'वर्तमान चरण:',
    applicantJurisdictionHeading: 'आवेदक एवं अधिकार क्षेत्र',
    applicantNameLabel: 'आवेदक का नाम:',
    existingConsumerNoLabel: 'मौजूदा उपभोक्ता क्र.:',
    requestedServiceSpecsHeading: 'अनुरोधित सेवा एवं तकनीकी विनिर्देश',
    gercScheduleBadge: 'GERC अनुमोदित टैरिफ अनुसूची',
    tariffCategoryLabel: 'टैरिफ श्रेणी',
    requestedLoadLabel: 'अनुरोधित लोड',
    supplyPhaseLabel: 'सप्लाई फेज / वोल्टेज',
    estimatedSanctionFeeLabel: 'अनुमानित स्वीकृति शुल्क',
    documentsScheduleFallback: 'प्रस्तुत दस्तावेज़ और सत्यापन स्थिति',
    docsRegisteredSuffix: 'पंजीकृत दस्तावेज़',
    colDocDesc: 'दस्तावेज़ विवरण',
    colVerStatus: 'सत्यापन स्थिति',
    colSubMode: 'माध्यम',
    docFooterFallback: 'जूनियर इंजीनियर द्वारा स्थल निरीक्षण के दौरान मूल दस्तावेजों का भौतिक सत्यापन किया जाएगा।',
    directivesHeading: 'आवेदक के लिए आधिकारिक निर्देश:',
    directivePremisesTitle: 'परिसर की सुगम्यता:',
    directivePremisesBody: 'कृपया जूनियर इंजीनियर द्वारा तकनीकी स्थल व्यवहार्यता जांच के लिए परिसर खुला और सुगम रखें।',
    directiveOriginalsTitle: 'मूल दस्तावेज़ सत्यापन:',
    directiveOriginalsBody: 'स्थल निरीक्षण के समय संपत्ति स्वामित्व दस्तावेज़, आधार कार्ड और वायरिंग ठेकेदार प्रमाणपत्र की मूल प्रतियां दिखाना अनिवार्य है।',
    directiveSlaTitle: 'SLA प्रदर्शन मानक:',
    directiveSlaBody: 'GERC दिशानिर्देशों के अनुसार निर्धारित समय-सीमा में तकनीकी जांच पूरी की जाएगी। फील्ड इंजीनियर के आगमन से पूर्व SMS भेजा जाएगा।',
    corporateFooterTitle: 'उत्तर गुजरात वीज कंपनी लिमिटेड · कॉर्पोरेट यूटिलिटी ERP विद्युतफ्लो 2.0',
    computerGeneratedNote: 'यह कंप्यूटर जनित आधिकारिक यूटिलिटी पावती है। भौतिक हस्ताक्षर की आवश्यकता नहीं है।',
    timestampPrefix: 'समय:',
  },
  mr: {
    officialReceiptTag: 'अधिकृत अर्ज सादरीकरण पावती',
    undertakingBanner: 'गुजरात सरकारचा उपक्रम · ग्राहक सेवा कक्ष',
    subdivisionPrefix: 'सब-डिव्हिजन',
    applicationDetailsHeading: 'अर्जाचा तपशील',
    applicationNoLabel: 'अर्ज क्र.:',
    filingDateLabel: 'नोंदणी तारीख:',
    serviceRequestTypeLabel: 'सेवा विनंती प्रकार:',
    targetSlaDateLabel: 'लक्षित SLA तारीख:',
    currentStageLabel: 'सध्याचा टप्पा:',
    applicantJurisdictionHeading: 'अर्जदार आणि कार्यक्षेत्र',
    applicantNameLabel: 'अर्जदाराचे नाव:',
    existingConsumerNoLabel: 'सध्याचा ग्राहक क्र.:',
    requestedServiceSpecsHeading: 'मागणी केलेली सेवा आणि तांत्रिक तपशील',
    gercScheduleBadge: 'GERC मंजूर टॅरिफ वेळापत्रक',
    tariffCategoryLabel: 'टॅरिफ श्रेणी',
    requestedLoadLabel: 'मागणी केलेला लोड',
    supplyPhaseLabel: 'सप्लाय फेज / व्होल्टेज',
    estimatedSanctionFeeLabel: 'अंदाजित मंजुरी शुल्क',
    documentsScheduleFallback: 'सादर केलेली कागदपत्रे आणि पडताळणी स्थिती',
    docsRegisteredSuffix: 'नोंदणीकृत कागदपत्रे',
    colDocDesc: 'कागदपत्र तपशील',
    colVerStatus: 'पडताळणी स्थिती',
    colSubMode: 'माध्यम',
    docFooterFallback: 'कनिष्ठ अभियंत्यांच्या स्थळ पाहणीदरम्यान मूळ कागदपत्रांची प्रत्यक्ष पडताळणी केली जाईल.',
    directivesHeading: 'अर्जदारासाठी अधिकृत सूचना:',
    directivePremisesTitle: 'परिसर उपलब्धता:',
    directivePremisesBody: 'कनिष्ठ अभियंत्यांद्वारे तांत्रिक स्थळ पाहणीसाठी कृपया परिसर उघडा आणि उपलब्ध ठेवावा.',
    directiveOriginalsTitle: 'मूळ कागदपत्र पडताळणी:',
    directiveOriginalsBody: 'स्थळ पाहणीदरम्यान मालमत्ता मालकी कागदपत्रे, आधार कार्ड आणि वायरिंग कंत्राटदार प्रमाणपत्राच्या मूळ प्रती दाखवणे आवश्यक आहे.',
    directiveSlaTitle: 'SLA कार्यक्षमता मानके:',
    directiveSlaBody: 'GERC मार्गदर्शक तत्त्वांनुसार विहित मुदतीत तांत्रिक व्यवहार्यता पूर्ण केली जाईल. फील्ड अभियंत्याच्या भेटीपूर्वी आगाऊ SMS पाठवला जाईल.',
    corporateFooterTitle: 'उत्तर गुजरात वीज कंपनी लिमिटेड · कॉर्पोरेट युटिलिटी ERP विद्युतफ्लो 2.0',
    computerGeneratedNote: 'ही संगणक-निर्मित अधिकृत युटिलिटी पोचपावती आहे. प्रत्यक्ष स्वाक्षरीची आवश्यकता नाही.',
    timestampPrefix: 'वेळ:',
  },
};

export const UgvclApplicationAcknowledgmentA4: React.FC<UgvclApplicationAcknowledgmentA4Props> = ({
  document,
  language,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const ui = getDocumentUiTranslations(language);
  const l = ACK_A4_LABELS[language] || ACK_A4_LABELS.en;

  // Extract primary fields from document sections
  const primarySection = document.sections.find(s => s.id === 'primary-identifiers');
  const applicantSection = document.sections.find(s => s.id === 'applicant-premises');
  const techSection = document.sections.find(s => s.id === 'technical-specs');
  const docsTable = document.tables?.find(t => t.id === 'submitted-documents');

  const getFieldValue = (section: typeof primarySection, key: string, fallback: string = '—') => {
    const f = section?.fields.find(field => field.key === key);
    return f ? f.value : fallback;
  };

  const appId = document.referenceId || getFieldValue(primarySection, 'applicationId');
  const requestType = getFieldValue(primarySection, 'requestType', 'New Electricity Service Connection');
  const submittedOn = getFieldValue(primarySection, 'submittedOn', document.recordedTimestamp);
  const currentStatus = getFieldValue(primarySection, 'currentStatus', document.statusLabel);

  const applicantName = getFieldValue(applicantSection, 'applicantName');
  const subdivision = getFieldValue(applicantSection, 'subdivision');
  const linkedConsumerNo = getFieldValue(applicantSection, 'linkedConsumerNo', '');
  const address = getFieldValue(applicantSection, 'address');
  const phone = getFieldValue(applicantSection, 'phone', '—');
  const email = getFieldValue(applicantSection, 'email', '—');

  const tariffCategory = getFieldValue(techSection, 'tariffCategory');
  const requestedLoad = getFieldValue(techSection, 'requestedLoad');
  const supplyPhase = getFieldValue(techSection, 'supplyPhase');
  const estimatedCost = getFieldValue(techSection, 'estimatedSanctionCost', '₹0');
  const targetDate = getFieldValue(techSection, 'targetCompletionDate', '—');

  const localizedGujaratiSlogan = 'સમર્થ વીજ, સલામત ગુજરાત';

  const tonePillClasses: Record<GeneratedOfficialDocument['statusTone'], string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300 print:bg-emerald-50 print:text-emerald-900',
    blue: 'bg-blue-50 text-blue-800 border-blue-300 print:bg-blue-50 print:text-blue-900',
    amber: 'bg-amber-50 text-amber-800 border-amber-300 print:bg-amber-50 print:text-amber-900',
    rose: 'bg-rose-50 text-rose-800 border-rose-300 print:bg-rose-50 print:text-rose-900',
    slate: 'bg-slate-100 text-slate-800 border-slate-300 print:bg-slate-100 print:text-slate-900',
  };

  return (
    <div
      data-testid="ugvcl-application-acknowledgment-a4"
      className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm print:p-0 print:border-0 print:shadow-none print:max-w-none text-xs leading-relaxed space-y-4"
      style={{ fontFamily: document.fontFamilyCss }}
    >
      {/* 1. OFFICIAL UGVCL LETTERHEAD */}
      <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-white border border-slate-300 p-1 flex items-center justify-center shrink-0 shadow-2xs">
            {!logoFailed ? (
              <img
                src={UGVCL_LOGO_ASSET_PATH || '/assets/ugvcl-logo.png'}
                alt="UGVCL Official Logo"
                className="w-full h-full object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Building2 className="w-7 h-7 text-blue-700" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-mono">
                UGVCL / GUVNL
              </span>
              <span className="text-[10px] text-slate-600 font-medium">
                CIN: {UGVCL_CORPORATE_IDENTITY.cin}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight leading-snug">
              {UGVCL_COMPANY_NAME_EN}
            </h1>
            <h2 className="text-xs font-bold text-slate-700 leading-snug">
              {UGVCL_COMPANY_NAME_GU} · <span className="text-amber-700 font-semibold italic">{localizedGujaratiSlogan}</span>
            </h2>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {UGVCL_CORPORATE_IDENTITY.registeredOffice} · {l.subdivisionPrefix}: {subdivision}
            </p>
          </div>
        </div>

        <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
          <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-500">
            {l.officialReceiptTag}
          </span>
          <span className="font-mono font-bold text-sm text-blue-950 block">
            {appId}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            {submittedOn}
          </span>
        </div>
      </div>

      {/* 2. DOCUMENT TITLE BAND */}
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs print:bg-slate-900 print:text-white">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
            {l.undertakingBanner}
          </span>
          <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
            {document.title}
          </h2>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-md border ${tonePillClasses[document.statusTone]}`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* 3. VISIBLE DEMO / SIMULATION DISCLAIMER */}
      <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-[11px] leading-snug print:bg-amber-50 print:border-amber-300 print:text-slate-900">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold uppercase tracking-wider block">
            {ui.demoDataNotice} ({document.dataSource})
          </span>
          <p>{document.demoDisclosureBanner}</p>
        </div>
      </div>

      {/* 4. APPLICATION REFERENCE & APPLICANT JURISDICTION GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Box A: Application Reference */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 print:bg-white print:border-slate-300 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{l.applicationDetailsHeading}</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Ref: {appId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px]">{l.applicationNoLabel}</span>
              <span className="font-mono font-bold text-slate-900">{appId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{l.filingDateLabel}</span>
              <span className="font-mono text-slate-800">{submittedOn}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block text-[10px]">{l.serviceRequestTypeLabel}</span>
              <span className="font-semibold text-slate-900">{requestType}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{l.targetSlaDateLabel}</span>
              <span className="font-mono font-bold text-blue-700">{targetDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">{l.currentStageLabel}</span>
              <span className="font-semibold text-slate-900">{currentStatus}</span>
            </div>
          </div>
        </div>

        {/* Box B: Applicant & Jurisdiction */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 print:bg-white print:border-slate-300 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{l.applicantJurisdictionHeading}</span>
            </span>
            <span className="text-[10px] text-slate-500">{subdivision}</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px]">{l.applicantNameLabel}</span>
              <span className="font-bold text-slate-950">{applicantName}</span>
            </div>
            {linkedConsumerNo && (
              <div>
                <span className="text-slate-500 block text-[10px]">{l.existingConsumerNoLabel}</span>
                <span className="font-mono font-bold text-blue-700">{linkedConsumerNo}</span>
              </div>
            )}
            <div className="flex items-start gap-1 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-snug">{address}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[10px]">
              <div className="flex items-center gap-1 text-slate-600">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="font-mono">{phone}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 truncate">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. REQUESTED SERVICE & TECHNICAL SPECIFICATIONS */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>{l.requestedServiceSpecsHeading}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{l.gercScheduleBadge}</span>
        </div>
        <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] bg-white">
          <div>
            <span className="text-slate-500 block text-[10px]">{l.tariffCategoryLabel}</span>
            <span className="font-bold text-slate-900">{tariffCategory}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">{l.requestedLoadLabel}</span>
            <span className="font-mono font-bold text-slate-900">{requestedLoad}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">{l.supplyPhaseLabel}</span>
            <span className="font-semibold text-slate-800">{supplyPhase}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">{l.estimatedSanctionFeeLabel}</span>
            <span className="font-mono font-extrabold text-blue-700">{estimatedCost}</span>
          </div>
        </div>
      </div>

      {/* 6. SUBMITTED DOCUMENTS SCHEDULE (SUBMITTED VS VERIFIED DISTINGUISHED) */}
      <div className="rounded-lg border border-slate-200 overflow-hidden break-inside-avoid">
        <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{docsTable?.title || l.documentsScheduleFallback}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {docsTable?.rows.length || 0} {l.docsRegisteredSuffix}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                <th className="py-2 px-3 text-center w-10">#</th>
                <th className="py-2 px-3">{l.colDocDesc}</th>
                <th className="py-2 px-3 text-center">{l.colVerStatus}</th>
                <th className="py-2 px-3">{l.colSubMode}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docsTable?.rows.map((r, i) => {
                const isVerified = String(r.status).toLowerCase().includes('verified');
                return (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-center font-mono text-slate-500 text-[11px]">{r.srNo || i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.docName}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {isVerified ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-medium text-[11px]">{r.submissionMode}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-600 leading-relaxed">
          {docsTable?.footerNote || l.docFooterFallback}
        </div>
      </div>

      {/* 7. IMPORTANT CONSUMER NOTICE & UNDERTAKING */}
      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 text-[11px] leading-relaxed space-y-1.5 break-inside-avoid">
        <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
          {l.directivesHeading}
        </span>
        <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
          <li>
            <strong>{l.directivePremisesTitle}</strong> {l.directivePremisesBody}
          </li>
          <li>
            <strong>{l.directiveOriginalsTitle}</strong> {l.directiveOriginalsBody}
          </li>
          <li>
            <strong>{l.directiveSlaTitle}</strong> {l.directiveSlaBody}
          </li>
        </ul>
      </div>

      {/* 8. FORMAL FOOTER & DIGITAL SYSTEM STAMP */}
      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-slate-600 break-inside-avoid">
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800">
            {l.corporateFooterTitle}
          </p>
          <p className="text-slate-500">
            {l.computerGeneratedNote}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 font-mono sm:text-right">
          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-bold">
            {l.timestampPrefix} {document.generatedAtDisplay}
          </span>
          <span className="px-2 py-1 rounded bg-blue-50 text-blue-900 border border-blue-200 font-bold">
            UGVCL-SYS-ACK
          </span>
        </div>
      </div>
    </div>
  );
};
