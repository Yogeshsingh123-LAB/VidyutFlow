import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Building2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Zap,
  ShieldCheck,
  FileCheck,
  HelpCircle,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { NewConnectionApplication } from '../../types';
import { Language } from '../../i18n/types';
import {
  localizeApplicationStatus,
  localizeTariffCategory,
  localizeSubdivision,
  localizePhase,
  localizeConsumerAddress,
  localizeDocumentName,
  localizeApplicationNote,
} from '../../i18n/consumerContentTranslations';
import { localizeAssignedActorName } from '../../i18n/employeeContentTranslations';
import { localizeServiceRequestTypeBadge } from '../../utils/consumerServicePrefill';

export interface ApplicationInspectFileWorkspaceProps {
  application: NewConnectionApplication;
  language: Language;
  isConsumerView?: boolean;
  canMutateLifecycle?: boolean;
  onUpdateStatus?: (status: string, note?: string) => void;
  onRequestClarification?: (note: string) => void;
  onOpenWorkOrder?: (workOrderId: string) => void;
  onClose?: () => void;
}

interface WorkflowStageMetadata {
  step: number;
  name: string;
  role: string;
  slaDays: number;
  descriptionEn: string;
  descriptionGu: string;
  descriptionHi: string;
  descriptionMr: string;
  checklistEn: string[];
  checklistGu: string[];
  checklistHi: string[];
  checklistMr: string[];
}

const WORKFLOW_STAGES: WorkflowStageMetadata[] = [
  {
    step: 1,
    name: 'Submitted',
    role: 'Citizen Portal / Self-Service',
    slaDays: 1,
    descriptionEn: 'Application dossier submitted digitally with mandatory applicant KYC and premises ownership documents.',
    descriptionGu: 'અરજદારના ફરજિયાત કેવાયસી અને મિલકત માલિકીના દસ્તાવેજો સાથે પોર્ટલ પર અરજી સફળતાપૂર્વક સબમિટ થઈ.',
    descriptionHi: 'आवेदक के अनिवार्य केवाईसी और परिसर स्वामित्व दस्तावेजों के साथ पोर्टल पर डिजिटल आवेदन प्रस्तुत किया गया।',
    descriptionMr: 'अर्जदाराची अनिवार्य केवायसी आणि जागा मालकी कागदपत्रांसह पोर्टलवर डिजिटल अर्ज यशस्वीरित्या सादर केला.',
    checklistEn: [
      'Digital application reference generated',
      'Proof of identity (Aadhaar/PAN) attached',
      'Premises ownership proof / Tax receipt linked',
    ],
    checklistGu: [
      'ડિજિટલ અરજી સંદર્ભ જનરેટ થયો',
      'ઓળખનો પુરાવો (આધાર/પાન) અપલોડ થયો',
      'મિલકત માલિકી પુરાવો / વેરા પાવતી લિંક થઈ',
    ],
    checklistHi: [
      'डिजिटल आवेदन संदर्भ उत्पन्न हुआ',
      'पहचान प्रमाण (आधार/पैन) संलग्न',
      'परिसर स्वामित्व प्रमाण / कर रसीद लिंक',
    ],
    checklistMr: [
      'डिजिटल अर्ज संदर्भ तयार झाला',
      'ओळख पुरावा (आधार/पॅन) जोडला',
      'जागा मालकी पुरावा / कर पावती लिंक केली',
    ],
  },
  {
    step: 2,
    name: 'Document Verification',
    role: 'Sub-Divisional Scrutiny Clerk / Dy. Ex. Eng.',
    slaDays: 2,
    descriptionEn: 'Sub-division office scrutinizes applicant documents, property titles, wiring test certificate, and statutory compliance.',
    descriptionGu: 'સબ-ડિવિઝન કચેરી દ્વારા અરજદારના દસ્તાવેજો, મિલકત ટાઇટલ, વાયરિંગ ટેસ્ટ પ્રમાણપત્ર અને કાયદાકીય પાલનની તપાસ.',
    descriptionHi: 'उप-प्रभाग कार्यालय द्वारा आवेदक के दस्तावेजों, संपत्ति स्वामित्व, वायरिंग टेस्ट प्रमाण पत्र एवं वैधानिक अनुपालन की जांच।',
    descriptionMr: 'सब-डिव्हिजन कार्यालयाकडून अर्जदाराची कागदपत्रे, मालमत्ता शीर्षक, वायरिंग चाचणी प्रमाणपत्र आणि वैधानिक पूर्ततेची छाननी.',
    checklistEn: [
      'KYC identity verification against government database',
      'Premises municipal clearance & occupancy validity',
      'Contractor Form-A wiring test report assessment',
    ],
    checklistGu: [
      'સરકારી ડેટાબેઝ સાથે કેવાયસી ઓળખ ચકાસણી',
      'પરિસરમાં મ્યુનિસિપલ એનઓસી અને કબજાની માન્યતા',
      'કોન્ટ્રાક્ટર ફોર્મ-A વાયરિંગ ટેસ્ટ રિપોર્ટ મૂલ્યાંકન',
    ],
    checklistHi: [
      'सरकारी डेटाबेस से केवाईसी पहचान का सत्यापन',
      'परिसर की नगरपालिका एनओसी और स्वामित्व वैधता',
      'ठेकेदार फॉर्म-A वायरिंग टेस्ट रिपोर्ट का मूल्यांकन',
    ],
    checklistMr: [
      'सरकारी डेटाबेससह केवायसी पडताळणी',
      'परिसराची महानगरपालिका परवानगी आणि ताबा वैधता',
      'कंत्राटदार फॉर्म-A वायरिंग चाचणी अहवाल मूल्यांकन',
    ],
  },
  {
    step: 3,
    name: 'Site Inspection',
    role: 'Junior Engineer (Field Assessment)',
    slaDays: 3,
    descriptionEn: 'Field engineer conducts physical site inspection to verify service drop clearance, transformer capacity, and metering feasibility.',
    descriptionGu: 'ફિલ્ડ એન્જિનિયર સ્થળ પર રૂબરૂ મુલાકાત લઈ સર્વિસ લાઈન, ટ્રાન્સફોર્મર લોડ ક્ષમતા અને મીટર સ્થાપનની શક્યતા ચકાસે છે.',
    descriptionHi: 'फील्ड इंजीनियर स्थल पर जाकर सर्विस लाइन, ट्रांसफार्मर लोड क्षमता और मीटर स्थापना की तकनीकी व्यवहार्यता की जांच करते हैं।',
    descriptionMr: 'फील्ड अभियंता प्रत्यक्ष जागेवर जाऊन सर्व्हिस लाइन, ट्रान्सफॉर्मर क्षमता आणि मीटरिंग व्यवहार्यतेची तपासणी करतात.',
    checklistEn: [
      'Physical inspection of service mains point',
      'Feeder line distance & voltage regulation check',
      'Transformer headroom and pole tapping clearance',
    ],
    checklistGu: [
      'સર્વિસ મેઇન્સ પોઈન્ટનું સ્થળ પર ભૌતિક નિરીક્ષણ',
      'ફીડર લાઇન અંતર અને વોલ્ટેજ ડ્રોપ ચકાસણી',
      'ટ્રાન્સફોર્મર ક્ષમતા અને પોલ ટેપિંગ મંજૂરી',
    ],
    checklistHi: [
      'सर्विस मेन्स पॉइंट का प्रत्यक्ष स्थल निरीक्षण',
      'फीडर लाइन दूरी और वोल्टेज विनियमन जांच',
      'ट्रांसफार्मर क्षमता और पोल टैपिंग क्लीयरेंस',
    ],
    checklistMr: [
      'सर्व्हिस मेन्स पॉईंटची प्रत्यक्ष स्थळ पाहणी',
      'फीडर लाईन अंतर आणि व्होल्टेज नियमन तपासणी',
      'ट्रान्सफॉर्मर क्षमता आणि पोल टॅपिंग परवानगी',
    ],
  },
  {
    step: 4,
    name: 'Sanction Approval',
    role: 'Assistant Engineer / Executive Engineer',
    slaDays: 2,
    descriptionEn: 'Executive sanction approved, technical feasibility endorsed, and demand note generated for fee settlement.',
    descriptionGu: 'કાર્યકારી મંજૂરી આખરી થઈ, ટેકનિકલ વ્યવહાર્યતા મંજૂર કરાઈ અને ડિમાન્ડ નોટ જનરેટ થઈ.',
    descriptionHi: 'कार्यकारी स्वीकृति अनुमोदित, तकनीकी व्यवहार्यता स्वीकृत एवं शुल्क भुगतान हेतु डिमांड नोट जारी किया गया।',
    descriptionMr: 'कार्यकारी मंजुरी मंजूर, तांत्रिक व्यवहार्यता मंजूर आणि शुल्क भरण्यासाठी डिमांड नोट जारी केली.',
    checklistEn: [
      'Technical feasibility clearance certificate issued',
      'Formal sanction letter signed by Assistant Engineer',
      'Demand notice / fee payment verified',
    ],
    checklistGu: [
      'ટેકનિકલ વ્યવહાર્યતા પ્રમાણપત્ર ઇશ્યૂ થયું',
      'મદદનીશ ઇજનેર દ્વારા મંજૂરી પત્ર પર સહી થઈ',
      'ડિમાન્ડ નોટિસ / ફી ચુકવણીની ચકાસણી થઈ',
    ],
    checklistHi: [
      'तकनीकी व्यवहार्यता क्लीयरेंस प्रमाणपत्र जारी',
      'सहायक अभियंता द्वारा औपचारिक स्वीकृति पत्र हस्ताक्षरित',
      'डिमांड नोटिस / शुल्क भुगतान सत्यापित',
    ],
    checklistMr: [
      'तांत्रिक व्यवहार्यता प्रमाणपत्र जारी केले',
      'सहायक अभियंत्यांद्वारे औपचारिक मंजुरी पत्र स्वाक्षरी',
      'डिमांड नोटीस / शुल्क भरणा तपासला',
    ],
  },
  {
    step: 5,
    name: 'Meter Installed',
    role: 'Field Metering Squad & Technician',
    slaDays: 2,
    descriptionEn: 'Smart electricity meter installed, terminal blocks secured, optical seals locked, and power service energized.',
    descriptionGu: 'સ્માર્ટ મીટર ફીટ થયું, ટર્મિનલ બ્લોક સુરક્ષિત કરાયા, ઓપ્ટિકલ સીલ લગાવાયા અને વીજ પુરવઠો ચાલુ થયો.',
    descriptionHi: 'स्मार्ट बिजली मीटर स्थापित, टर्मिनल ब्लॉक सुरक्षित, ऑप्टिकल सील लॉक और विद्युत आपूर्ति ऊर्जान्वित।',
    descriptionMr: 'स्मार्ट वीज मीटर बसवले, टर्मिनल ब्लॉक सुरक्षित केले, ऑप्टिकल सील लावले आणि वीज पुरवठा सुरू केला.',
    checklistEn: [
      'Smart meter serial mapped to consumer billing account',
      'Optical holographic meter seal applied & logged',
      'Live voltage & zero-reading baseline verified',
    ],
    checklistGu: [
      'ગ્રાહક બિલિંગ ખાતા સાથે સ્માર્ટ મીટર સિરિયલ લિંક થઈ',
      'ઓપ્ટિકલ હોલોગ્રાફિક મીટર સીલ લગાવી નોંધણી થઈ',
      'લાઈવ વોલ્ટેજ અને ઝીરો-રીડિંગ બેઝલાઇન ચકાસાઈ',
    ],
    checklistHi: [
      'उपभोक्ता बिलिंग खाते से स्मार्ट मीटर सीरियल मैप किया गया',
      'ऑप्टिकल होलोग्राफिक मीटर सील लगाई और दर्ज की गई',
      'लाइव वोल्टेज और शून्य-रीडिंग बेसलाइन सत्यापित',
    ],
    checklistMr: [
      'ग्राहक बिलिंग खात्याशी स्मार्ट मीटर सिरियल जोडली',
      'ऑप्टिकल होलोग्राफिक मीटर सील लावून नोंदवली',
      'थेट व्होल्टेज आणि शून्य-रीडिंग पडताळणी पूर्ण',
    ],
  },
];

export const ApplicationInspectFileWorkspace: React.FC<ApplicationInspectFileWorkspaceProps> = ({
  application,
  language,
  isConsumerView = true,
  canMutateLifecycle = false,
  onUpdateStatus,
  onRequestClarification,
  onOpenWorkOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'documents' | 'timeline' | 'remarks'>('progress');
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(
    Math.max(0, Math.min(4, (application.workflowStep || 1) - 1))
  );
  const [newStaffNote, setNewStaffNote] = useState('');

  const reqBadge = localizeServiceRequestTypeBadge(application, language);
  const currentStep = application.workflowStep || 1;
  const isRejected = application.status === 'Rejected';
  const progressPct = isRejected ? 100 : Math.min(100, Math.max(20, (currentStep / 5) * 100));

  // 4-Language Labels
  const tabLabels = {
    progress: language === 'gu' ? 'પ્રગતિ અને સ્થિતિ' : language === 'hi' ? 'प्रगति और स्थिति' : language === 'mr' ? 'प्रगती आणि स्थिती' : 'Progress & Status',
    documents: language === 'gu' ? 'દસ્તાવેજો' : language === 'hi' ? 'दस्तावेज़' : language === 'mr' ? 'कागदपत्रे' : 'Documents',
    timeline: language === 'gu' ? 'પ્રવૃત્તિ સમયરેખા' : language === 'hi' ? 'गतिविधि समयरेखा' : language === 'mr' ? 'कृती टाइमलाइन' : 'Activity Timeline',
    remarks: language === 'gu' ? 'નોંધ અને આગળના પગલાં' : language === 'hi' ? 'टिप्पणी और अगले कदम' : language === 'mr' ? 'शेरा आणि पुढील पायऱ्या' : 'Remarks & Next Steps',
  };

  const getStageDescription = (stage: WorkflowStageMetadata) => {
    switch (language) {
      case 'gu': return stage.descriptionGu;
      case 'hi': return stage.descriptionHi;
      case 'mr': return stage.descriptionMr;
      default: return stage.descriptionEn;
    }
  };

  const getStageChecklist = (stage: WorkflowStageMetadata) => {
    switch (language) {
      case 'gu': return stage.checklistGu;
      case 'hi': return stage.checklistHi;
      case 'mr': return stage.checklistMr;
      default: return stage.checklistEn;
    }
  };

  // Documents list
  const submittedDocs = Array.isArray(application.documentsSubmitted) && application.documentsSubmitted.length > 0
    ? application.documentsSubmitted
    : [
        'Premises Ownership Deed / Property Tax Receipt',
        'Aadhaar Card (Applicant Identity Verification)',
        'Electrical Contractor Test Report (Form A)',
        'Self-Declaration & NOC'
      ];

  const selectedStage = WORKFLOW_STAGES[selectedStageIndex] || WORKFLOW_STAGES[0];

  return (
    <div
      data-testid="application-inspect-file-workspace"
      data-application-id={application.id}
      className="space-y-5 text-xs text-slate-800 dark:text-slate-200"
    >
      {/* 1. APPLICATION OVERVIEW HERO CARD */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-extrabold text-blue-200 tracking-wider">
                {application.id}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${reqBadge.badgeClasses} bg-white/10 text-white border-white/20`}>
                {reqBadge.label}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                UGVCL North Subdivision
              </span>
            </div>
            <h3 className="text-base font-bold text-white leading-snug">
              {application.applicantName}
            </h3>
            <p className="text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap">
              <span>{localizeTariffCategory(application.category, language)}</span>
              <span>•</span>
              <span className="font-mono font-semibold">{application.requestedLoadKw} kW ({localizePhase(application.phase, language)})</span>
              <span>•</span>
              <span className="font-mono text-amber-300 font-bold">₹{application.estimatedSanctionCost.toLocaleString()} Est. Sanction</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0 bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {language === 'gu' ? 'વર્તમાન સ્થિતિ' : language === 'hi' ? 'वर्तमान स्थिति' : language === 'mr' ? 'सध्याची स्थिती' : 'Current Status'}
            </span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-md border ${
                isRejected
                  ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                  : currentStep === 5
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                  : 'bg-blue-500/20 text-blue-200 border-blue-400/40'
              }`}
            >
              {isRejected
                ? (language === 'gu' ? 'અરજી અસ્વીકૃત' : language === 'hi' ? 'आवेदन अस्वीकृत' : language === 'mr' ? 'अर्ज नाकारला' : 'Application Rejected')
                : `${language === 'gu' ? 'તબક્કો' : language === 'hi' ? 'चरण' : language === 'mr' ? 'टप्पा' : 'Step'} ${currentStep}/5: ${localizeApplicationStatus(application.status, language)}`}
            </span>
            <span className="text-[10px] text-slate-300 font-mono mt-0.5">
              Target SLA: <strong>{application.targetCompletionDate}</strong>
            </span>
          </div>
        </div>

        {/* Premise & Contact Mini Bar */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{localizeConsumerAddress(application.address, language)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-mono">{application.phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Applied: <strong className="font-mono text-white">{application.appliedDate}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. 5-STAGE INTERACTIVE WORKFLOW PROGRESS TRACKER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {language === 'gu' ? '5-તબક્કાનું ઇન્ટરેક્ટિવ વર્કફ્લો ટ્રેકર' : language === 'hi' ? '5-चरणीय इंटरएक्टिव कार्यप्रवाह ट्रैकर' : language === 'mr' ? '5-टप्प्यांचा परस्परसंवादी कार्यप्रवाह ट्रॅकर' : '5-Stage Interactive Workflow Tracker'}
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 font-mono">
            {progressPct}% {language === 'gu' ? 'પૂર્ણ' : language === 'hi' ? 'पूर्ण' : language === 'mr' ? 'पूर्ण' : 'Completed'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isRejected ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* 5 Stages Clickable Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const isCompleted = !isRejected && stage.step < currentStep;
            const isCurrent = !isRejected && stage.step === currentStep;
            const isStageSelected = selectedStageIndex === idx;

            return (
              <button
                key={stage.step}
                type="button"
                onClick={() => setSelectedStageIndex(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isStageSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                    : isCurrent
                    ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20'
                    : isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isCompleted ? '✓' : stage.step}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isCompleted
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60'
                        : isCurrent
                        ? 'text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-950/60'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted
                      ? (language === 'gu' ? 'પૂર્ણ' : language === 'hi' ? 'पूर्ण' : language === 'mr' ? 'पूर्ण' : 'Done')
                      : isCurrent
                      ? (language === 'gu' ? 'પ્રગતિમાં' : language === 'hi' ? 'सक्रिय' : language === 'mr' ? 'सुरू' : 'Active')
                      : (language === 'gu' ? 'બાકી' : language === 'hi' ? 'आगामी' : language === 'mr' ? 'पुढील' : 'Next')}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[11px] block leading-tight text-slate-900 dark:text-white">
                    {localizeApplicationStatus(stage.name, language)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {stage.slaDays} {language === 'gu' ? 'દિવસ' : language === 'hi' ? 'दिन' : language === 'mr' ? 'दिवस' : 'days SLA'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Explainer Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {language === 'gu' ? 'તબક્કો' : language === 'hi' ? 'चरण' : language === 'mr' ? 'टप्पा' : 'Stage'} {selectedStage.step}: {localizeApplicationStatus(selectedStage.name, language)}
              </span>
            </span>
            <span className="text-[11px] text-slate-500">
              <strong>{language === 'gu' ? 'જવાબદાર ભૂમિકા:' : language === 'hi' ? 'उत्तरदायी भूमिका:' : language === 'mr' ? 'जबाबदार पद:' : 'Responsible Role:'}</strong> {selectedStage.role}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            {getStageDescription(selectedStage)}
          </p>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              {language === 'gu' ? 'આ તબક્કાની ચકાસણી યાદી (Checklist):' : language === 'hi' ? 'इस चरण की सत्यापन चेकलिस्ट:' : language === 'mr' ? 'या टप्प्याची पडताळणी चेकलिस्ट:' : 'Stage Verification Checklist:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
              {getStageChecklist(selectedStage).map((chk, i) => (
                <div key={i} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{chk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. FOUR ORGANIZED TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
        {(['progress', 'documents', 'timeline', 'remarks'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2.5 font-bold text-xs border-b-2 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'progress' && <Layers className="w-3.5 h-3.5" />}
            {tab === 'documents' && <FileCheck className="w-3.5 h-3.5" />}
            {tab === 'timeline' && <Clock className="w-3.5 h-3.5" />}
            {tab === 'remarks' && <HelpCircle className="w-3.5 h-3.5" />}
            <span>{tabLabels[tab]}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: PROGRESS & STATUS */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          {/* Clarification Alert */}
          {application.clarificationRequested && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{language === 'gu' ? 'સ્પષ્ટીકરણ જરૂરી છે' : language === 'hi' ? 'स्पष्टीकरण आवश्यक' : language === 'mr' ? 'स्पष्टीकरण आवश्यक' : 'Clarification Required by Utility Desk'}</span>
              </div>
              <p className="leading-relaxed">
                {application.clarificationNote || 'Please upload a clearer copy of premises ownership deed or latest municipal tax receipt.'}
              </p>
            </div>
          )}

          {/* Rejection Notice */}
          {isRejected && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 space-y-1.5">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{language === 'gu' ? 'અરજી નામંજૂર થઈ છે' : language === 'hi' ? 'आवेदन अस्वीकृत किया गया' : language === 'mr' ? 'अर्ज नाकारण्यात आला' : 'Application Rejection Notice'}</span>
              </div>
              <p className="leading-relaxed">
                {application.notesHistory[application.notesHistory.length - 1]?.note || 'Application rejected due to non-clearance of premises or site feasibility constraint.'}
              </p>
            </div>
          )}

          {/* Technical Specs & Subdivision Jurisdiction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                {language === 'gu' ? 'તકનીકી સ્પષ્ટીકરણો' : language === 'hi' ? 'तकनीकी विनिर्देश' : language === 'mr' ? 'तांत्रिक वैशिष्ट्ये' : 'Technical Specifications'}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{language === 'gu' ? 'ટેરિફ શ્રેણી:' : language === 'hi' ? 'टैरिफ श्रेणी:' : language === 'mr' ? 'टॅरिफ श्रेणी:' : 'Tariff Category:'}</span>
                  <span className="font-semibold">{localizeTariffCategory(application.category, language)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{language === 'gu' ? 'માંગેલ લોડ:' : language === 'hi' ? 'अनुरोधित लोड:' : language === 'mr' ? 'मागणी केलेला लोड:' : 'Requested Sanction Load:'}</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{application.requestedLoadKw} kW</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{language === 'gu' ? 'સપ્લાય ફેઝ / વોલ્ટેજ:' : language === 'hi' ? 'सप्लाई फेज / वोल्टेज:' : language === 'mr' ? 'सप्लाय फेज / व्होल्टेज:' : 'Supply Phase / Voltage:'}</span>
                  <span className="font-semibold">{localizePhase(application.phase, language)} (230V / 415V)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'gu' ? 'અંદાજિત મંજૂરી ફી:' : language === 'hi' ? 'अनुमानित स्वीकृति शुल्क:' : language === 'mr' ? 'अंदाजित मंजुरी शुल्क:' : 'Estimated Sanction Fee:'}</span>
                  <span className="font-mono font-extrabold text-blue-700 dark:text-blue-400">₹{application.estimatedSanctionCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                {language === 'gu' ? 'કચેરી અને અધિકારક્ષેત્ર' : language === 'hi' ? 'कार्यालय और अधिकार क्षेत्र' : language === 'mr' ? 'कार्यालय आणि कार्यक्षेत्र' : 'Jurisdiction & Office Desk'}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{language === 'gu' ? 'સબ-ડિવિઝન કચેરી:' : language === 'hi' ? 'सब-डिवीजन कार्यालय:' : language === 'mr' ? 'सब-डिव्हिजन कार्यालय:' : 'Sub-Division Office:'}</span>
                  <span className="font-semibold">{localizeSubdivision(application.subdivision, language)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{language === 'gu' ? 'વર્તુળ / કંપની:' : language === 'hi' ? 'सर्कल / कंपनी:' : language === 'mr' ? 'सर्कल / कंपनी:' : 'Circle / Company:'}</span>
                  <span className="font-semibold">Mehsana Circle · UGVCL</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{language === 'gu' ? 'સર્વિસ ફીડર:' : language === 'hi' ? 'सर्विस फीडर:' : language === 'mr' ? 'सर्व्हिस फीडर:' : 'Service Feeder:'}</span>
                  <span className="font-mono">Panchot 11kV Feeder</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{language === 'gu' ? 'લક્ષ્યાંક SLA તારીખ:' : language === 'hi' ? 'लक्षित SLA तिथि:' : language === 'mr' ? 'लक्षित SLA तारीख:' : 'SLA Resolution Target:'}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{application.targetCompletionDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {language === 'gu' ? 'સબમિટ કરેલ દસ્તાવેજોની ચકાસણી' : language === 'hi' ? 'प्रस्तुत दस्तावेजों का सत्यापन' : language === 'mr' ? 'सादर केलेल्या कागदपत्रांची पडताळणी' : 'Registered Application Dossier'}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              {submittedDocs.length} {language === 'gu' ? 'દસ્તાવેજો' : language === 'hi' ? 'दस्तावेज़' : language === 'mr' ? 'कागदपत्रे' : 'Files'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {submittedDocs.map((docName: string, idx: number) => {
              const isVerified = currentStep >= 2 && !application.clarificationRequested && !isRejected;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                          {localizeDocumentName(docName, language)}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          PDF • {language === 'gu' ? 'અપલોડ તારીખ:' : language === 'hi' ? 'अपलोड तिथि:' : language === 'mr' ? 'अपलोड तारीख:' : 'Uploaded on'} {application.appliedDate}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                        isVerified
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'gu' ? 'ચકાસાયેલ' : language === 'hi' ? 'सत्यापित' : language === 'mr' ? 'पडताळलेले' : 'Verified'}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{language === 'gu' ? 'તપાસણી હેઠળ' : language === 'hi' ? 'जांच जारी' : language === 'mr' ? 'छाननी सुरू' : 'Pending Verification'}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
                    {isVerified
                      ? (language === 'gu' ? 'UGVCL સબ-ડિવિઝનલ કચેરી દ્વારા ડિજિટલ ચકાસણી કરી માન્ય રાખવામાં આવેલ છે.' : language === 'hi' ? 'UGVCL सब-डिवीजनल जांच डेस्क द्वारा डिजिटल रूप से सत्यापित और स्वीकृत।' : language === 'mr' ? 'UGVCL सब-डिव्हिजन छाननी कक्षाद्वारे डिजिटलरीत्या तपासले आणि स्वीकारले.' : 'Digitally scrutinized and accepted by the UGVCL Sub-Divisional Scrutiny Desk.')
                      : (language === 'gu' ? 'સબ-ડિવિઝનલ ક્લાર્ક દ્વારા સમીક્ષા હેઠળ. સ્થળ મુલાકાત વખતે મૂળ દસ્તાવેજ ચકાસાશે.' : language === 'hi' ? 'सब-डिवीजनल क्लर्क द्वारा समीक्षाधीन। स्थल निरीक्षण के दौरान मूल प्रति की जांच की जाएगी।' : language === 'mr' ? 'सब-डिव्हिजन लिपिकाकडून छाननी सुरू. स्थळ भेटीदरम्यान मूळ प्रती तपासल्या जाऊ शकतात.' : 'Under review by Sub-Divisional Clerk. Physical originals may be inspected during site visit.')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITY TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            {language === 'gu' ? 'ઓડિટ સમયરેખા અને નોંધો' : language === 'hi' ? 'ऑडिट टाइमलाइन और टिप्पणियां' : language === 'mr' ? 'ऑडिट टाइमलाइन आणि नोंदी' : 'Official Audit Trail & Milestones'}
          </span>
          <div className="space-y-2.5">
            {application.notesHistory.map((nh: { author: string; note: string; timestamp: string }, i: number) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isConsumerView
                        ? nh.author.toLowerCase().includes('citizen') || nh.author.toLowerCase().includes('consumer')
                          ? (language === 'gu' ? 'અરજદાર (સ્વ-સેવા પોર્ટલ)' : language === 'hi' ? 'आवेदक (स्व-सेवा पोर्टल)' : language === 'mr' ? 'अर्जदार (स्व-सेवा पोर्टल)' : 'Applicant (Self-Service Portal)')
                          : (language === 'gu' ? 'UGVCL સબ-ડિવિઝનલ કચેરી' : language === 'hi' ? 'UGVCL सब-डिवीजनल कार्यालय' : language === 'mr' ? 'UGVCL सब-डिव्हिजन कार्यालय' : 'UGVCL Sub-Divisional Office')
                        : localizeAssignedActorName(nh.author, language)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      Log #{i + 1}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{nh.timestamp}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  {localizeApplicationNote(nh.note, language)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: REMARKS & NEXT STEPS */}
      {activeTab === 'remarks' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {language === 'gu' ? 'અરજદાર માટે આગામી પગલાંની માર્ગદર્શિકા' : language === 'hi' ? 'आवेदक के लिए अगले कदमों की गाइड' : language === 'mr' ? 'अर्जदारासाठी पुढील पायऱ्यांची मार्गदर्शक तत्त्वे' : 'Actionable Next Steps for Citizen'}
            </span>
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>{language === 'gu' ? 'સ્થાપન પરિસર સુલભ રાખો:' : language === 'hi' ? 'स्थापना परिसर सुगम रखें:' : language === 'mr' ? 'स्थापना परिसर उपलब्ध ठेवा:' : 'Keep Installation Premises Accessible:'}</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'gu' ? 'જુનિયર એન્જિનિયર સ્થળ તપાસ માટે આવે ત્યારે મુખ્ય મીટર પ્રવેશદ્વાર અને સર્વિસ પોઈન્ટ ખુલ્લો રાખો.' : language === 'hi' ? 'जब जूनियर इंजीनियर स्थल निरीक्षण के लिए आएं तो मुख्य मीटर प्रवेश द्वार और सर्विस प्वाइंट सुगम रखें।' : language === 'mr' ? 'कनिष्ठ अभियंता स्थळ पाहणीसाठी येतील तेव्हा मुख्य मीटर प्रवेशद्वार आणि सर्व्हिस पॉईंट उघडा ठेवा.' : 'Ensure the main meter entrance and service drop point are accessible when the Junior Engineer visits for site inspection.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>{language === 'gu' ? 'મૂળ દસ્તાવેજ ચકાસણી:' : language === 'hi' ? 'मूल दस्तावेज़ सत्यापन:' : language === 'mr' ? 'मूळ कागदपत्र पडताळणी:' : 'Original Document Verification:'}</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'gu' ? 'તપાસ અધિકારી દ્વારા ભૌતિક ચકાસણી માટે તમારી મૂળ પ્રોપર્ટી ટેક્સ પાવતી અને આધાર કાર્ડ તૈયાર રાખો.' : language === 'hi' ? 'निरीक्षण अधिकारी द्वारा भौतिक सत्यापन के लिए अपनी मूल संपत्ति कर रसीद और आधार कार्ड तैयार रखें।' : language === 'mr' ? 'तपासणी अधिकाऱ्यांकडून प्रत्यक्ष पडताळणीसाठी तुमची मूळ मालमत्ता कर पावती आणि आधार कार्ड तयार ठेवा.' : 'Keep your original property tax receipt and Aadhaar card handy for physical verification by the inspecting officer.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>{language === 'gu' ? 'SMS / WhatsApp સૂચનાઓ:' : language === 'hi' ? 'SMS / WhatsApp सूचनाएं:' : language === 'mr' ? 'SMS / WhatsApp सूचना:' : 'SMS / WhatsApp Notifications:'}</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'gu' ? 'સ્માર્ટ મીટર સ્થાપન માટે ફિલ્ડ ટેકનિશિયન આવે તે પહેલાં તમને ઓટોમેટેડ SMS મળશે.' : language === 'hi' ? 'स्मार्ट मीटर ऊर्जान्वयन के लिए फील्ड तकनीशियन के आने से पहले आपको स्वचालित SMS प्राप्त होगा।' : language === 'mr' ? 'स्मार्ट मीटर बसवण्यासाठी फील्ड तंत्रज्ञ येण्यापूर्वी तुम्हाला स्वयंचलित SMS सूचना मिळतील.' : 'You will receive automated SMS notifications before the field technician arrives for smart meter energization.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subdivisional Helpdesk Contact */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2 text-xs">
            <span className="font-bold text-blue-950 dark:text-blue-200 block text-xs">
              {language === 'gu' ? 'સબ-ડિવિઝનલ કચેરી સહાયક ડેસ્ક' : language === 'hi' ? 'सब-डिवीजनल कार्यालय सहायता डेस्क' : language === 'mr' ? 'सब-डिव्हिजन कार्यालय मदत कक्ष' : 'Sub-Divisional Office Helpdesk Support'}
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              {language === 'gu' ? 'તકનીકી ચકાસણી અથવા ફી ચુકવણી અંગે કોઈપણ સ્પષ્ટતા માટે મહેસાણા સિટી નોર્થ સબ-ડિવિઝનનો સંપર્ક કરો:' : language === 'hi' ? 'तकनीकी व्यवहार्यता या शुल्क भुगतान संबंधी किसी भी स्पष्टीकरण के लिए मेहसाणा सिटी नॉर्थ सब-डिवीजन से संपर्क करें:' : language === 'mr' ? 'तांत्रिक व्यवहार्यता किंवा शुल्क भरण्याबाबत कोणत्याही स्पष्टीकरणासाठी मेहसाणा सिटी नॉर्थ सब-डिव्हिजनशी संपर्क साधा:' : 'For any clarification regarding technical feasibility or fee payment, contact Mehsana City North Sub-Division:'}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <span>Helpline: <strong>02762-252134</strong></span>
              <span>•</span>
              <span>Toll Free: <strong>19122</strong></span>
              <span>•</span>
              <span>Email: <strong>north.mehsana@ugvcl.com</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* 4. AUTHORIZED STAFF LIFECYCLE CONTROLS (ONLY FOR AUTHORIZED UTILITY ROLES) */}
      {canMutateLifecycle && onUpdateStatus && (
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Utility Officer Control Bar (Staff Only)</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              Restricted Access
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUpdateStatus('Document Verification', 'Scrutiny passed by subdivision.')}
              className="px-2.5 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Approve Docs (Step 2)
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus('Site Inspection', 'Assigned site visit to JE field.')}
              className="px-2.5 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Dispatch Site Visit (Step 3)
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus('Sanction Approval', 'Technical feasibility cleared. Ready for payment.')}
              className="px-2.5 py-1.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Sanction File (Step 4)
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus('Meter Installed', 'Smart meter energized.')}
              className="px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              Energize Meter (Step 5)
            </button>
            {onRequestClarification && (
              <button
                type="button"
                onClick={() => onRequestClarification(newStaffNote || 'Please upload updated property deed copy.')}
                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Request Clarification
              </button>
            )}
            <button
              type="button"
              onClick={() => onUpdateStatus('Rejected', 'Site feasibility rejected by subdivision.')}
              className="px-2.5 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              Reject File
            </button>
          </div>
        </div>
      )}

      {/* READ-ONLY CONSUMER FOOTER DISCLAIMER */}
      {isConsumerView && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {language === 'gu'
                ? 'UGVCL નાગરિક સ્વ-સેવા પોર્ટલ · પ્રમાણિત લાઈવ રીડ-ઓન્લી ટ્રેકિંગ'
                : language === 'hi'
                ? 'UGVCL नागरिक स्व-सेवा पोर्टल · सत्यापित लाइव रीड-ओनली ट्रैकिंग'
                : language === 'mr'
                ? 'UGVCL नागरिक स्व-सेवा पोर्टल · सत्यापित थेट रीड-ओन्ली ट्रॅकिंग'
                : 'UGVCL Citizen Self-Service Portal · Verified Live Read-Only Tracking'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            SECURE-TRACK-HASH
          </span>
        </div>
      )}
    </div>
  );
};
