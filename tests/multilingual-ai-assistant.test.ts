/**
 * tests/multilingual-ai-assistant.test.ts
 *
 * VIDYUTFLOW 2.0 — PHASE 4, STEP 4.1 TEST SUITE
 * Comprehensive verification of Multilingual AI Assistant across:
 * - English (en), Gujarati (gu), Hindi (hi), Marathi (mr)
 * - All 5 user roles: Consumer, Employee, Field, Management, Admin
 * - UI dictionaries, localized personas, suggested prompts, tool chips
 * - Grounded billing accuracy, GERC regulations, discrepancy reporting
 * - Action link navigation boundaries & zero RBAC leakage
 */

import {
  ASSISTANT_UI_TRANSLATIONS,
  LOCALIZED_PERSONAS,
  LOCALIZED_SUGGESTED_PROMPTS,
  LOCALIZED_TOOL_CHIP_NAMES,
  formatLocalizedToolChip,
  getAssistantTranslation
} from '../src/i18n/assistantContentTranslations';
import {
  generateUtilityGroundedResponse,
  UtilityEngineContext
} from '../src/utils/utilityAiEngine';
import { UserRole } from '../src/types';
import { Language } from '../src/i18n/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

const demoConsumerContext: UtilityEngineContext = {
  userName: 'Smt. Meenaben Patel',
  consumerNo: '04281-99231',
  category: 'RGP (Residential)',
  contractedLoadKw: 3,
  tariffCategory: 'RGP',
  totalOutstandingAmount: 2185,
  connections: [
    {
      consumerNo: '04281-99231',
      category: 'RGP (Residential)',
      address: 'Plot 42, Sector 8, Gandhinagar',
      loadKw: 3,
      meterNo: 'MTR-GN-40291',
      status: 'ACTIVE'
    }
  ],
  bills: [
    {
      id: 'BILL-UG-2026-10-8821',
      consumerNo: '04281-99231',
      billMonth: 'September 2026',
      totalAmount: 2185,
      energyCharges: 1420,
      fixedCharges: 120,
      fpppaCharges: 410,
      electricityDuty: 235,
      dueDate: '2026-10-15',
      status: 'PENDING'
    }
  ],
  payments: [
    {
      id: 'RCP-2026-08-1192',
      amount: 1940,
      paymentDate: '2026-08-14',
      status: 'PAID'
    }
  ],
  complaints: [
    {
      id: 'CMP-2026-09-0042',
      consumerNo: '04281-99231',
      category: 'Voltage Fluctuation',
      status: 'IN_PROGRESS',
      description: 'Frequent voltage drop during evening peak hours (7 PM - 10 PM)'
    }
  ],
  applications: [
    {
      id: 'APP-2026-07-0012',
      category: 'Rooftop Solar 5kW',
      status: 'SITE_INSPECTION',
      loadKw: 5
    }
  ],
  incidents: []
};

const zeroConnectionContext: UtilityEngineContext = {
  userName: 'Shri Vikram Desai',
  connections: [],
  bills: [],
  payments: [],
  complaints: [],
  applications: [],
  incidents: []
};

async function runMultilingualAiSuite() {
  console.log('================================================================');
  console.log('VIDYUTFLOW 2.0 — PHASE 4, STEP 4.1: MULTILINGUAL AI ASSISTANT SUITE');
  console.log('================================================================\n');

  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  const roles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

  // -------------------------------------------------------------------------
  // 1. UI Dictionary Completeness & Key Parity
  // -------------------------------------------------------------------------
  console.log('--- 1. UI Dictionary Completeness & Key Parity ---');

  const enKeys = Object.keys(ASSISTANT_UI_TRANSLATIONS.en).sort();
  assert(enKeys.length >= 35, `English assistant dictionary has ${enKeys.length} UI keys (expected >= 35)`);

  for (const lang of languages) {
    const langDict = ASSISTANT_UI_TRANSLATIONS[lang];
    assert(Boolean(langDict), `Dictionary defined for language: "${lang}"`);

    const missingKeys = enKeys.filter(k => !(k in langDict) || typeof (langDict as any)[k] !== 'string');
    assert(
      missingKeys.length === 0,
      `Language "${lang}" has 100% dictionary key parity with English (${missingKeys.length} missing)`
    );

    // Verify non-empty strings
    const emptyKeys = enKeys.filter(k => (langDict as any)[k]?.trim().length === 0);
    assert(emptyKeys.length === 0, `Language "${lang}" contains no empty dictionary values`);
  }

  // -------------------------------------------------------------------------
  // 2. Localized Personas & Welcome Messages
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Localized Personas & Welcome Messages ---');

  for (const lang of languages) {
    for (const role of roles) {
      const persona = LOCALIZED_PERSONAS[lang][role];
      assert(
        Boolean(persona && persona.name && persona.title && persona.badge),
        `Persona defined for [${lang}][${role}]: "${persona?.name}" (${persona?.badge})`
      );

      const welcome = persona.welcomeMessage('Meenaben');
      assert(
        welcome.includes('Meenaben') && welcome.length > 30,
        `Welcome message for [${lang}][${role}] is personalized with user name`
      );
    }
  }

  // Verify Gujarati and Hindi/Marathi persona names
  assert(LOCALIZED_PERSONAS.gu.consumer.name === 'વિદ્યુત મિત્ર', 'Gujarati consumer persona name is "વિદ્યુત મિત્ર"');
  assert(LOCALIZED_PERSONAS.hi.consumer.name === 'विद्युत मित्र', 'Hindi consumer persona name is "विद्युत मित्र"');
  assert(LOCALIZED_PERSONAS.mr.consumer.name === 'विद्युत मित्र', 'Marathi consumer persona name is "विद्युत मित्र"');

  // -------------------------------------------------------------------------
  // 3. Localized Suggested Prompts & Tool Chips
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Localized Suggested Prompts & Tool Chips ---');

  for (const lang of languages) {
    for (const role of roles) {
      const prompts = LOCALIZED_SUGGESTED_PROMPTS[lang][role];
      assert(
        Array.isArray(prompts) && prompts.length >= 3,
        `Suggested prompts for [${lang}][${role}] contains ${prompts.length} questions (expected >= 3)`
      );
    }
  }

  const sampleTools = ['get_consumer_bills', 'calculate_tariff_slab', 'check_power_outages', 'submit_meter_reading'];
  for (const tool of sampleTools) {
    for (const lang of languages) {
      const label = formatLocalizedToolChip(tool, lang);
      assert(
        Boolean(label && label.trim().length > 0 && !label.includes('_')),
        `Tool chip "${tool}" formatted for [${lang}]: "${label}"`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Gujarati Utility Engine Grounding & Discrepancy Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Gujarati Utility Grounded Responses (વિદ્યુત મિત્ર) ---');

  const guGreeting = generateUtilityGroundedResponse('નમસ્તે', 'consumer', { ...demoConsumerContext, language: 'gu' });
  assert(
    guGreeting.includes('વિદ્યુત મિત્ર') && guGreeting.includes('Smt. Meenaben Patel') && guGreeting.includes('04281-99231'),
    'Gujarati greeting returns personalized Vidyut Mitra response with consumer and account summary'
  );

  const guBill = generateUtilityGroundedResponse('મારું સપ્ટેમ્બર 2026 નું વીજ બિલ સમજાવો', 'consumer', {
    ...demoConsumerContext,
    language: 'gu'
  });
  assert(
    guBill.includes('₹2,185.00') && guBill.includes('BILL-UG-2026-10-8821'),
    'Gujarati bill inquiry quotes exact stored bill amount ₹2,185.00 and bill ID'
  );
  assert(
    guBill.includes('₹1,522.00') && guBill.includes('₹1,420.00'),
    'Gujarati bill inquiry dynamically computes slab sum ₹1,522.00 vs stored ₹1,420.00'
  );
  assert(
    guBill.includes('₹102.00') && guBill.includes('વિસંગતતા') && guBill.includes('ડેમો'),
    'Gujarati bill inquiry explicitly reports ₹102.00 difference as demo data discrepancy (વિસંગતતા)'
  );

  const guSolar = generateUtilityGroundedResponse('સૂર્ય ગુજરાત સોલાર નેટ-મીટરિંગના નિયમો', 'consumer', {
    ...demoConsumerContext,
    language: 'gu'
  });
  assert(
    guSolar.includes('સૂર્ય ગુજરાત') && guSolar.includes('GERC'),
    'Gujarati solar query cites Surya Gujarat guidelines and GERC regulations'
  );

  const guComplaint = generateUtilityGroundedResponse('વોલ્ટેજ સમસ્યાની ફરિયાદ કેવી રીતે કરવી?', 'consumer', {
    ...demoConsumerContext,
    language: 'gu'
  });
  assert(
    guComplaint.includes('ફરિયાદ') && guComplaint.includes('19122'),
    'Gujarati complaint query provides helpline 19122 and portal steps'
  );

  // -------------------------------------------------------------------------
  // 5. Hindi Utility Engine Grounding & Discrepancy Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Hindi Utility Grounded Responses (विद्युत मित्र) ---');

  const hiGreeting = generateUtilityGroundedResponse('नमस्ते', 'consumer', { ...demoConsumerContext, language: 'hi' });
  assert(
    hiGreeting.includes('विद्युत मित्र') && hiGreeting.includes('Smt. Meenaben Patel'),
    'Hindi greeting returns personalized Vidyut Mitra response'
  );

  const hiBill = generateUtilityGroundedResponse('मेरा सितंबर 2026 का बिजली बिल कितना है?', 'consumer', {
    ...demoConsumerContext,
    language: 'hi'
  });
  assert(
    hiBill.includes('₹2,185.00') && hiBill.includes('₹1,522.00') && hiBill.includes('₹1,420.00'),
    'Hindi bill inquiry quotes exact amounts ₹2,185.00 stored and ₹1,522.00 calculated slab sum'
  );
  assert(
    hiBill.includes('₹102.00') && hiBill.includes('डेमो') && hiBill.includes('अंतर'),
    'Hindi bill inquiry explicitly highlights ₹102.00 demo data discrepancy (अंतर)'
  );

  const hiSolar = generateUtilityGroundedResponse('रूफटॉप सोलर नेट मीटरिंग की क्या शर्तें हैं?', 'consumer', {
    ...demoConsumerContext,
    language: 'hi'
  });
  assert(
    hiSolar.includes('सूर्य गुजरात') && hiSolar.includes('नेट-मीटरिंग'),
    'Hindi solar query explains Surya Gujarat rooftop net-metering'
  );

  // -------------------------------------------------------------------------
  // 6. Marathi Utility Engine Grounding & Discrepancy Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Marathi Utility Grounded Responses (विद्युत मित्र) ---');

  const mrGreeting = generateUtilityGroundedResponse('नमस्कार', 'consumer', { ...demoConsumerContext, language: 'mr' });
  assert(
    mrGreeting.includes('विद्युत मित्र') && mrGreeting.includes('Smt. Meenaben Patel'),
    'Marathi greeting returns personalized Vidyut Mitra response'
  );

  const mrBill = generateUtilityGroundedResponse('माझे सप्टेंबर 2026 चे वीज बिल सांगा', 'consumer', {
    ...demoConsumerContext,
    language: 'mr'
  });
  assert(
    mrBill.includes('₹2,185.00') && mrBill.includes('₹1,522.00') && mrBill.includes('₹1,420.00'),
    'Marathi bill inquiry quotes exact amounts ₹2,185.00 stored and ₹1,522.00 calculated slab sum'
  );
  assert(
    mrBill.includes('₹102.00') && mrBill.includes('तफावत') && mrBill.includes('डेमो'),
    'Marathi bill inquiry explicitly highlights ₹102.00 demo data discrepancy (तफावत)'
  );

  // -------------------------------------------------------------------------
  // 7. Role-Grounded Responses & Navigation Links Across All 5 Roles
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Staff Portals & Role Boundaries Across Languages ---');

  const roleTestQueries: Record<UserRole, { en: string; gu: string; hi: string; mr: string }> = {
    consumer: {
      en: 'What is my electricity bill?',
      gu: 'મારું વીજ બિલ કેટલું છે?',
      hi: 'मेरा बिजली बिल कितना है?',
      mr: 'माझे वीज बिल किती आहे?'
    },
    employee: {
      en: 'How do I process pending applications and site inspections?',
      gu: 'બાકી અરજીઓ અને સાઇટ ઇન્સ્પેક્શનની પ્રક્રિયા કેવી રીતે કરવી?',
      hi: 'लंबित आवेदनों और साइट निरीक्षण को कैसे प्रोसेस करें?',
      mr: 'प्रलंबित अर्ज आणि साइट तपासणी कशी पूर्ण करावी?'
    },
    field: {
      en: 'What are the safety norms for 11kV feeder maintenance?',
      gu: '11kV ફીડર મેન્ટેનન્સ માટે સુરક્ષા નિયમો શું છે?',
      hi: '11kV फीडर मेंटेनेंस के लिए सुरक्षा नियम क्या हैं?',
      mr: '11kV फीडर देखभालीसाठी सुरक्षा नियम कोणते आहेत?'
    },
    management: {
      en: 'What are the current AT&C losses and substation peak loads?',
      gu: 'હાલના AT&C નુકસાન અને સબસ્ટેશન પીક લોડ શું છે?',
      hi: 'वर्तमान AT&C नुकसान और सबस्टेशन पीक लोड क्या हैं?',
      mr: 'सध्याचे AT&C नुकसान आणि सबस्टेशन पीक लोड किती आहेत?'
    },
    admin: {
      en: 'How do I audit role-based access and system telemetry logs?',
      gu: 'રોલ-બેઝ્ડ એક્સેસ અને સિસ્ટમ ટેલિમેટ્રી લૉગ્સનું ઓડિટ કેવી રીતે કરવું?',
      hi: 'रोल-बेस्ड एक्सेस और सिस्टम टेलीमेट्री लॉग का ऑडिट कैसे करें?',
      mr: 'भूमिका-आधारित प्रवेश आणि सिस्टम टेलीमेट्री लॉगचे ऑडिट कसे करावे?'
    }
  };

  const allowedTabsByRole: Record<UserRole, string[]> = {
    consumer: ['dashboard', 'bills', 'connections', 'new-connection', 'complaints', 'applications', 'solar', 'requests', 'payments', 'notifications', 'profile'],
    employee: ['dashboard', 'applications', 'consumers', 'complaints', 'approvals', 'coordination', 'outages', 'reports'],
    field: ['dashboard', 'workorders', 'inspections', 'maintenance', 'offline', 'history'],
    management: ['dashboard', 'analytics', 'feeders', 'sla', 'ai-insights', 'reports'],
    admin: ['overview', 'users', 'access', 'infra', 'integrations', 'audit', 'settings']
  };

  for (const role of roles) {
    for (const lang of languages) {
      const q = roleTestQueries[role][lang];
      const reply = generateUtilityGroundedResponse(q, role, { language: lang });

      assert(
        reply.length > 50,
        `Role "${role}" in [${lang}] generated substantial grounded response (${reply.length} chars)`
      );

      // Check that any markdown action links generated in reply belong to this role's allowed tabs
      const actionMatches = [...reply.matchAll(/\[([^\]]+)\]\(action:([a-zA-Z0-9_-]+)\)/g)];
      let invalidTabFound = false;
      for (const m of actionMatches) {
        const tab = m[2];
        if (!allowedTabsByRole[role].includes(tab)) {
          invalidTabFound = true;
          console.error(`Invalid tab "${tab}" for role "${role}" in [${lang}] reply!`);
        }
      }
      assert(!invalidTabFound, `Role "${role}" in [${lang}] emits only permitted navigation actions`);
    }
  }

  // -------------------------------------------------------------------------
  // 8. Zero-Connection Privacy & RBAC Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Zero-Connection Privacy & RBAC Isolation ---');

  for (const lang of languages) {
    const zeroReply = generateUtilityGroundedResponse('મારું બિલ', 'consumer', { ...zeroConnectionContext, language: lang });
    assert(
      !zeroReply.includes('04281-99231') && !zeroReply.includes('Meenaben'),
      `Zero-connection consumer in [${lang}] receives no demo account leakage`
    );
  }

  // -------------------------------------------------------------------------
  // 9. Safe Fallback for Unsupported Language / Missing Keys
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Safe Fallback for Unsupported Language & Translation Helper ---');

  const fallbackHelper = getAssistantTranslation('es' as any);
  assert(
    fallbackHelper.assistantHeaderTitle === ASSISTANT_UI_TRANSLATIONS.en.assistantHeaderTitle,
    'getAssistantTranslation falls back safely to English for unsupported language code'
  );

  const fallbackResponse = generateUtilityGroundedResponse('Hello', 'consumer', undefined, 'de' as any);
  assert(
    fallbackResponse.includes('Vidyut Mitra') && fallbackResponse.includes('UGVCL'),
    'generateUtilityGroundedResponse falls back safely to English for unknown language'
  );

  console.log('\n================================================================');
  console.log(`MULTILINGUAL AI ASSISTANT SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultilingualAiSuite().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
