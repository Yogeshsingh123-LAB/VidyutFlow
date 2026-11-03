import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildConsumerServicePrefillState,
  evaluateLoadChangeRequest,
  extractStreetAddressAndPincode,
  formatSubmissionAddress,
  getServiceRequestUiStrings,
  localizeServiceRequestTypeBadge,
  mergePrefillPreservingUserEdits,
  resolveAuthorizedConsumerConnection,
  resolvePurposeForTariffCategory,
  validateServiceRequestSubmission,
  ConsumerServicePrefillState
} from '../src/utils/consumerServicePrefill';
import {
  INITIAL_APPLICATIONS,
  INITIAL_BILLS,
  INITIAL_COMPLAINTS,
  INITIAL_CONNECTIONS,
  INITIAL_WORK_ORDERS
} from '../src/data/mockData';
import {
  localizeApplicationNote,
  localizeDocumentName
} from '../src/i18n/consumerContentTranslations';
import { ensureSiteInspectionWorkOrderForApplication } from '../src/services/erpAdapter';
import { evaluateApplicationSla } from '../src/utils/slaEngine';
import { ElectricityConnection, NewConnectionApplication } from '../src/types';

console.log('Running Phase 3 Step 3: Smart Consumer Service Request Prefill Tests...');

const demoConsumerSessionUser = {
  id: 'demo_consumer',
  name: 'Smt. Meenaben Patel',
  email: 'consumer@vidyutflow.demo',
  mobileNumber: '+91 98250 14820'
};

const demoConsumerConnections = INITIAL_CONNECTIONS.filter(
  c => c.accountId === 'demo_consumer'
);

// 1. Test Solar Net-Metering request intent and accurate prefill from selectedConnection
{
  const primaryConn = demoConsumerConnections.find(c => c.consumerNo === '04281-99231');
  assert.ok(primaryConn, 'Primary demo consumer connection 04281-99231 must exist');

  const solarPrefill = buildConsumerServicePrefillState({
    requestType: 'SOLAR_NET_METERING',
    connections: demoConsumerConnections,
    selectedConnectionNo: '04281-99231',
    sessionUser: demoConsumerSessionUser,
    isDefaultDemoConsumer: true
  });

  assert.equal(solarPrefill.serviceRequestType, 'SOLAR_NET_METERING');
  assert.equal(solarPrefill.solarInterest, true, 'Solar Net-Metering must pre-enable solarInterest');
  assert.equal(solarPrefill.linkedConsumerNo, '04281-99231');
  assert.equal(solarPrefill.linkedMeterNo, 'MTR-2024-884102');
  assert.equal(solarPrefill.applicantName, 'Smt. Meenaben Patel');
  assert.equal(solarPrefill.applicantPhone, '+91 98250 14820');
  assert.equal(solarPrefill.applicantEmail, 'consumer@vidyutflow.demo');
  assert.equal(solarPrefill.subdivision, 'Mehsana City North');
  assert.equal(
    solarPrefill.address,
    '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana'
  );
  assert.equal(solarPrefill.pincode, '384002');
  assert.equal(solarPrefill.category, 'Residential (RGPU)');
  assert.equal(solarPrefill.loadKw, 5);
  assert.equal(solarPrefill.currentSanctionedLoadKw, 5);
  assert.equal(solarPrefill.phase, '1-Phase');
  assert.equal(solarPrefill.purpose, 'Domestic / Residential Lighting & Power');
  assert.equal(solarPrefill.prefilledFromConnection, true);
  assert.ok(
    solarPrefill.uploadedDocs.includes(
      'Solar PV Net-Metering Feasibility & Grid Connectivity Form (PDF, 640 KB)'
    ),
    'Solar prefill must attach Solar PV Net-Metering Feasibility document'
  );

  const solarValidation = validateServiceRequestSubmission(solarPrefill, 'en');
  assert.equal(solarValidation.valid, true, 'Valid Solar Net-Metering prefill should pass validation');
  console.log('✓ 1. Solar Net-Metering request intent and prefill verified');
}

// 2. Test Load Extension / Reduction request intent, prefill, and no-assumption validation
{
  const loadPrefill = buildConsumerServicePrefillState({
    requestType: 'LOAD_CHANGE',
    connections: demoConsumerConnections,
    selectedConnectionNo: '04281-99231',
    sessionUser: demoConsumerSessionUser,
    isDefaultDemoConsumer: true
  });

  assert.equal(loadPrefill.serviceRequestType, 'LOAD_CHANGE');
  assert.equal(loadPrefill.solarInterest, false, 'Load Change must not enable solarInterest by default');
  assert.equal(loadPrefill.linkedConsumerNo, '04281-99231');
  assert.equal(loadPrefill.currentSanctionedLoadKw, 5);
  assert.equal(
    loadPrefill.loadKw,
    5,
    'Load Change must initialize loadKw to currentSanctionedLoadKw without assuming increase or decrease'
  );
  assert.equal(loadPrefill.loadChangeConfirmed, false);

  // Initial state has unchanged load (5 kW === 5 kW) -> must NOT be valid for submission
  const initialEval = evaluateLoadChangeRequest(
    loadPrefill.currentSanctionedLoadKw,
    loadPrefill.loadKw
  );
  assert.equal(initialEval.direction, 'UNCHANGED');
  assert.equal(initialEval.deltaKw, 0);
  assert.equal(initialEval.isValidChange, false);

  const unchangedValidation = validateServiceRequestSubmission(loadPrefill, 'en');
  assert.equal(unchangedValidation.valid, false);
  assert.equal(unchangedValidation.errorCode, 'LOAD_CHANGE_UNCHANGED');

  // Consumer selects Load Extension (5 kW -> 8 kW) but has not confirmed checkbox yet
  const unconfirmedExtension: ConsumerServicePrefillState = {
    ...loadPrefill,
    loadKw: 8,
    phase: '3-Phase',
    loadChangeConfirmed: false
  };
  const extEval = evaluateLoadChangeRequest(
    unconfirmedExtension.currentSanctionedLoadKw,
    unconfirmedExtension.loadKw
  );
  assert.equal(extEval.direction, 'EXTENSION');
  assert.equal(extEval.deltaKw, 3);
  assert.equal(extEval.isValidChange, true);

  const unconfirmedValidation = validateServiceRequestSubmission(unconfirmedExtension, 'en');
  assert.equal(unconfirmedValidation.valid, false);
  assert.equal(unconfirmedValidation.errorCode, 'LOAD_CHANGE_CONFIRMATION_REQUIRED');

  // Consumer confirms Load Extension (5 kW -> 8 kW)
  const confirmedExtension: ConsumerServicePrefillState = {
    ...unconfirmedExtension,
    loadChangeConfirmed: true
  };
  const confirmedExtValidation = validateServiceRequestSubmission(confirmedExtension, 'en');
  assert.equal(confirmedExtValidation.valid, true);

  // Consumer selects Load Reduction (5 kW -> 3 kW) and confirms
  const confirmedReduction: ConsumerServicePrefillState = {
    ...loadPrefill,
    loadKw: 3,
    phase: '1-Phase',
    loadChangeConfirmed: true
  };
  const redEval = evaluateLoadChangeRequest(
    confirmedReduction.currentSanctionedLoadKw,
    confirmedReduction.loadKw
  );
  assert.equal(redEval.direction, 'REDUCTION');
  assert.equal(redEval.deltaKw, -2);
  assert.equal(redEval.isValidChange, true);
  assert.equal(validateServiceRequestSubmission(confirmedReduction, 'en').valid, true);
  console.log('✓ 2. Load Extension / Reduction intent, prefill, and confirmation rules verified');
}

// 3. Test multiple connection selection (04281-99231 vs 04281-77190)
{
  const commercialSolarPrefill = buildConsumerServicePrefillState({
    requestType: 'SOLAR_NET_METERING',
    connections: demoConsumerConnections,
    selectedConnectionNo: '04281-77190',
    sessionUser: demoConsumerSessionUser,
    isDefaultDemoConsumer: true
  });

  assert.equal(commercialSolarPrefill.linkedConsumerNo, '04281-77190');
  assert.equal(commercialSolarPrefill.linkedMeterNo, 'MTR-2023-339811');
  assert.equal(commercialSolarPrefill.applicantName, 'Patel Engineering & Solar Fabrication');
  assert.equal(commercialSolarPrefill.subdivision, 'Mehsana Industrial GIDC');
  assert.equal(
    commercialSolarPrefill.address,
    'Plot 48/B, GIDC Phase II, Dediyasan, Mehsana'
  );
  assert.equal(commercialSolarPrefill.pincode, '384002');
  assert.equal(commercialSolarPrefill.category, 'Commercial (NRGP)');
  assert.equal(commercialSolarPrefill.purpose, 'Commercial Shop / Office / Retail');
  assert.equal(commercialSolarPrefill.loadKw, 18);
  assert.equal(commercialSolarPrefill.currentSanctionedLoadKw, 18);
  assert.equal(commercialSolarPrefill.phase, '3-Phase');
  assert.equal(commercialSolarPrefill.solarInterest, true);

  const commercialLoadPrefill = buildConsumerServicePrefillState({
    requestType: 'LOAD_CHANGE',
    connections: demoConsumerConnections,
    selectedConnectionNo: '04281-77190',
    sessionUser: demoConsumerSessionUser,
    isDefaultDemoConsumer: true
  });
  assert.equal(commercialLoadPrefill.linkedConsumerNo, '04281-77190');
  assert.equal(commercialLoadPrefill.currentSanctionedLoadKw, 18);
  assert.equal(commercialLoadPrefill.loadKw, 18);
  console.log('✓ 3. Multiple connection selection (Residential vs Commercial) verified');
}

// 4. Test missing or incomplete connection data handling without fabricating values
{
  // Unlinked consumer with zero connections
  const unlinkedSolarPrefill = buildConsumerServicePrefillState({
    requestType: 'SOLAR_NET_METERING',
    connections: [],
    selectedConnectionNo: '',
    sessionUser: {
      id: 'usr_new_citizen',
      name: 'Rameshbhai Desai',
      email: 'ramesh@example.com',
      mobileNumber: '+91 98980 11223'
    },
    isDefaultDemoConsumer: false
  });

  assert.equal(unlinkedSolarPrefill.serviceRequestType, 'SOLAR_NET_METERING');
  assert.equal(unlinkedSolarPrefill.solarInterest, true);
  assert.equal(unlinkedSolarPrefill.linkedConsumerNo, '');
  assert.equal(unlinkedSolarPrefill.linkedMeterNo, '');
  assert.equal(unlinkedSolarPrefill.applicantName, 'Rameshbhai Desai');
  assert.equal(unlinkedSolarPrefill.applicantPhone, '+91 98980 11223');
  assert.equal(unlinkedSolarPrefill.applicantEmail, 'ramesh@example.com');
  assert.equal(unlinkedSolarPrefill.address, '', 'Must not fabricate street address when connection is missing');
  assert.equal(unlinkedSolarPrefill.pincode, '', 'Must not fabricate pincode when connection is missing');
  assert.equal(unlinkedSolarPrefill.currentSanctionedLoadKw, null);
  assert.equal(unlinkedSolarPrefill.prefilledFromConnection, false);

  // Partial connection without pincode in address
  const partialConnection: ElectricityConnection = {
    consumerNo: '04281-55555',
    connectionId: 'UG-VIS-AGR-5555',
    consumerName: 'Rameshbhai Desai',
    address: 'Near Bus Stand, Unjha',
    subdivision: 'Visnagar Division',
    tariffCategory: 'Agricultural (AG)',
    sanctionedLoadKw: 10,
    phase: '3-Phase',
    meterNo: 'MTR-2025-555555',
    status: 'Active',
    feederName: '11kV Rural Feeder',
    connectedDate: '10-Jan-2024',
    lastReadingDate: '01-Oct-2026',
    currentReadingKwh: 1200,
    previousReadingKwh: 1000,
    averageMonthlyKwh: 200,
    securityDeposit: 5000,
    accountId: 'usr_new_citizen',
    accountEmail: 'ramesh@example.com'
  };

  const partialPrefill = buildConsumerServicePrefillState({
    requestType: 'SOLAR_NET_METERING',
    connections: [partialConnection],
    selectedConnectionNo: '04281-55555',
    sessionUser: {
      id: 'usr_new_citizen',
      name: 'Rameshbhai Desai',
      email: 'ramesh@example.com'
    },
    isDefaultDemoConsumer: false
  });

  assert.equal(partialPrefill.address, 'Near Bus Stand, Unjha');
  assert.equal(partialPrefill.pincode, '', 'Must not invent pincode when address has no 6-digit pin');
  assert.equal(partialPrefill.category, 'Agricultural (AG)');
  assert.equal(partialPrefill.purpose, 'Agricultural Borewell & Farmhouse');
  console.log('✓ 4. Missing or incomplete connection data handling verified');
}

// 5. Test prevention of cross-consumer data leakage
{
  const otherConsumerConnection: ElectricityConnection = {
    consumerNo: '04281-88412',
    connectionId: 'UG-KAL-IND-8841',
    consumerName: 'Shri Harshadbhai Chaudhary',
    meterNo: 'MTR-2024-112233',
    sanctionedLoadKw: 45,
    phase: '3-Phase',
    tariffCategory: 'Industrial (LTMD)',
    address: 'Plot 12, Kalol Industrial Estate - 382721',
    subdivision: 'Kalol Sub-Division',
    feederName: '11kV Kalol GIDC Feeder',
    status: 'Active',
    connectedDate: '01-Mar-2021',
    lastReadingDate: '01-Oct-2026',
    currentReadingKwh: 89000,
    previousReadingKwh: 84000,
    averageMonthlyKwh: 5000,
    securityDeposit: 55000,
    accountId: 'other_consumer_99',
    accountEmail: 'harshad@example.com'
  };

  // Attempt to resolve 04281-88412 against demo_consumer's session when mixed connections are passed
  const mixedConnections = [...demoConsumerConnections, otherConsumerConnection];
  const resolved = resolveAuthorizedConsumerConnection(
    mixedConnections,
    '04281-88412',
    demoConsumerSessionUser
  );
  assert.notEqual(
    resolved?.consumerNo,
    '04281-88412',
    'Must never leak connection 04281-88412 belonging to another consumer'
  );
  assert.equal(
    resolved?.consumerNo,
    '04281-99231',
    'Must fall back to consumer owned connection and never return another consumer connection'
  );

  // If only another consumer's connection is present, must return null
  const resolvedNone = resolveAuthorizedConsumerConnection(
    [otherConsumerConnection],
    '04281-88412',
    demoConsumerSessionUser
  );
  assert.equal(resolvedNone, null, 'Must return null when no connections belong to the active consumer');
  console.log('✓ 5. Prevention of cross-consumer data leakage verified');
}

// 6. Test preservation of user-edited fields when switching connections
{
  const initialSolar = buildConsumerServicePrefillState({
    requestType: 'SOLAR_NET_METERING',
    connections: demoConsumerConnections,
    selectedConnectionNo: '04281-99231',
    sessionUser: demoConsumerSessionUser,
    isDefaultDemoConsumer: true
  });

  // User edits phone and loadKw manually
  const userModifiedState: ConsumerServicePrefillState = {
    ...initialSolar,
    applicantPhone: '+91 99999 00000',
    loadKw: 12
  };
  const editedSet = new Set<keyof ConsumerServicePrefillState>(['applicantPhone', 'loadKw']);

  // User switches active connection to 04281-77190
  const nextConnectionPrefill = buildConsumerServicePrefillState({
    requestType: 'SOLAR_NET_METERING',
    connections: demoConsumerConnections,
    selectedConnectionNo: '04281-77190',
    sessionUser: demoConsumerSessionUser,
    isDefaultDemoConsumer: true
  });

  const merged = mergePrefillPreservingUserEdits(
    userModifiedState,
    nextConnectionPrefill,
    editedSet
  );

  assert.equal(merged.linkedConsumerNo, '04281-77190', 'Target connection must update');
  assert.equal(merged.subdivision, 'Mehsana Industrial GIDC', 'Unedited subdivision must update to new connection');
  assert.equal(merged.category, 'Commercial (NRGP)', 'Unedited category must update to new connection');
  assert.equal(merged.applicantPhone, '+91 99999 00000', 'User-edited phone must be preserved');
  assert.equal(merged.loadKw, 12, 'User-edited loadKw must be preserved');
  console.log('✓ 6. Preservation of user-edited fields verified');
}

// 7. Test correct service-type formatting, address formatting, and tariff-purpose mapping
{
  const parsed = extractStreetAddressAndPincode(
    '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana - 384002'
  );
  assert.equal(parsed.streetAddress, '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana');
  assert.equal(parsed.pincode, '384002');

  const formatted = formatSubmissionAddress(parsed.streetAddress, parsed.pincode);
  assert.equal(formatted, '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana, Pin - 384002');

  // Should not duplicate pincode if already present
  const formattedNoDup = formatSubmissionAddress(
    '14, Anand Nagar Society, Mehsana - 384002',
    '384002'
  );
  assert.equal(formattedNoDup, '14, Anand Nagar Society, Mehsana - 384002');

  assert.equal(
    resolvePurposeForTariffCategory('Residential (RGPU)'),
    'Domestic / Residential Lighting & Power'
  );
  assert.equal(
    resolvePurposeForTariffCategory('Commercial (NRGP)'),
    'Commercial Shop / Office / Retail'
  );
  assert.equal(
    resolvePurposeForTariffCategory('Industrial (LTMD)'),
    'Small Scale Workshop / MSME Unit'
  );
  assert.equal(
    resolvePurposeForTariffCategory('Agricultural (AG)'),
    'Agricultural Borewell & Farmhouse'
  );
  console.log('✓ 7. Service-type submission formatting and tariff-purpose mapping verified');
}

// 8. Test no duplicate work orders when advancing Solar / Load Change applications to Site Inspection
{
  const solarApp: NewConnectionApplication = {
    id: 'APP-2026-0910',
    applicantName: 'Smt. Meenaben Patel',
    phone: '+91 98250 14820',
    email: 'consumer@vidyutflow.demo',
    address: '14, Anand Nagar Society, Near Radhanpur Cross Road, Mehsana, Pin - 384002',
    subdivision: 'Mehsana City North',
    category: 'Residential (RGPU)',
    requestedLoadKw: 5,
    phase: '1-Phase',
    premisesType: 'Owned',
    status: 'Site Inspection',
    workflowStep: 3,
    appliedDate: '20-Oct-2026',
    targetCompletionDate: '27-Oct-2026',
    estimatedSanctionCost: 11850,
    documentsSubmitted: [
      'Aadhaar Card (PDF, 420 KB)',
      'Solar PV Net-Metering Feasibility & Grid Connectivity Form (PDF, 640 KB)'
    ],
    notesHistory: [
      {
        timestamp: '20-Oct-2026 10:00 AM',
        author: 'Citizen Web Portal',
        note: 'Solar Net-Metering (Surya Gujarat) request submitted online for Consumer #04281-99231 (5 kW).'
      }
    ],
    accountId: 'demo_consumer',
    assignedOfficer: 'Rajesh V. Trivedi (AE)',
    serviceRequestType: 'SOLAR_NET_METERING',
    linkedConsumerNo: '04281-99231',
    linkedMeterNo: 'MTR-2024-884102',
    solarInterest: true
  };

  // First transition to Site Inspection creates 1 work order
  const firstPlan = ensureSiteInspectionWorkOrderForApplication({
    app: solarApp,
    workOrders: INITIAL_WORK_ORDERS,
    actorLabel: 'Employee Portal (AE)'
  });
  assert.equal(firstPlan.created, true);
  assert.equal(firstPlan.workOrder.applicationId, 'APP-2026-0910');
  assert.equal(firstPlan.assignedWorkOrderId, firstPlan.workOrder.id);

  // Second transition / repeated call must reuse the existing work order and NOT create a duplicate
  const updatedApp: NewConnectionApplication = {
    ...solarApp,
    assignedWorkOrderId: firstPlan.assignedWorkOrderId
  };
  const secondPlan = ensureSiteInspectionWorkOrderForApplication({
    app: updatedApp,
    workOrders: firstPlan.updatedWorkOrders,
    actorLabel: 'Employee Portal (AE)'
  });
  assert.equal(secondPlan.created, false, 'Must not create duplicate work order');
  assert.equal(secondPlan.workOrder.id, firstPlan.workOrder.id);
  assert.equal(secondPlan.updatedWorkOrders.length, firstPlan.updatedWorkOrders.length);
  console.log('✓ 8. No duplicate work orders for Solar / Load Change applications verified');
}

// 9. Test four-language support (en, gu, hi, mr) for badges, UI strings, documents, and notes
{
  const languages = ['en', 'gu', 'hi', 'mr'] as const;

  for (const lang of languages) {
    const ui = getServiceRequestUiStrings(lang);
    assert.ok(ui.modeNewConnection.length > 0);
    assert.ok(ui.modeSolarNetMetering.length > 0);
    assert.ok(ui.modeLoadChange.length > 0);
    assert.ok(ui.loadChangeConfirmCheckboxLabel.length > 0);
    assert.ok(ui.validationLoadUnchangedPattern.length > 0);
    assert.ok(ui.validationLoadConfirmationRequired.length > 0);

    const solarBadge = localizeServiceRequestTypeBadge(
      {
        serviceRequestType: 'SOLAR_NET_METERING',
        solarInterest: true,
        requestedLoadKw: 5
      },
      lang
    );
    assert.ok(solarBadge.label.length > 0);

    const loadExtBadge = localizeServiceRequestTypeBadge(
      {
        serviceRequestType: 'LOAD_CHANGE',
        loadChangeDirection: 'EXTENSION',
        currentSanctionedLoadKw: 5,
        requestedLoadKw: 8
      },
      lang
    );
    assert.ok(loadExtBadge.label.includes('5 kW → 8 kW'));

    const loadRedBadge = localizeServiceRequestTypeBadge(
      {
        serviceRequestType: 'LOAD_CHANGE',
        loadChangeDirection: 'REDUCTION',
        currentSanctionedLoadKw: 18,
        requestedLoadKw: 12
      },
      lang
    );
    assert.ok(loadRedBadge.label.includes('18 kW → 12 kW'));

    const localizedSolarDoc = localizeDocumentName(
      'Solar PV Net-Metering Feasibility & Grid Connectivity Form (PDF, 640 KB)',
      lang
    );
    assert.ok(localizedSolarDoc.length > 0);

    const localizedBillDoc = localizeDocumentName(
      'Latest Electricity Bill Receipt (PDF, 310 KB)',
      lang
    );
    assert.ok(localizedBillDoc.length > 0);

    const localizedSolarNote = localizeApplicationNote(
      'Solar Net-Metering (Surya Gujarat) request submitted online for Consumer #04281-99231 (5 kW).',
      lang
    );
    assert.ok(localizedSolarNote.includes('04281-99231'));

    const localizedLoadNote = localizeApplicationNote(
      'Load Extension request submitted online for Consumer #04281-99231 (5 kW → 8 kW).',
      lang
    );
    assert.ok(localizedLoadNote.includes('04281-99231'));
    assert.ok(localizedLoadNote.includes('5 kW → 8 kW'));
  }
  console.log('✓ 9. Four-language support (en, gu, hi, mr) verified');
}

// 10. Test existing DEMO data integrity and SLA compatibility
{
  assert.ok(INITIAL_CONNECTIONS.length >= 2, 'Canonical DEMO connections preserved');
  assert.ok(INITIAL_APPLICATIONS.length >= 4, 'Canonical DEMO applications preserved');
  assert.ok(INITIAL_COMPLAINTS.length >= 4, 'Canonical DEMO complaints preserved');
  assert.ok(INITIAL_WORK_ORDERS.length >= 3, 'Canonical DEMO work orders preserved');
  assert.ok(INITIAL_BILLS.length >= 3, 'Canonical DEMO bills preserved');

  // Verify dynamic SLA engine works seamlessly on prefilled Solar/Load applications
  const loadChangeApp: NewConnectionApplication = {
    ...INITIAL_APPLICATIONS[0],
    id: 'APP-2026-0911',
    status: 'Submitted',
    workflowStep: 1,
    appliedDate: '20-Oct-2026',
    targetCompletionDate: '27-Oct-2026',
    serviceRequestType: 'LOAD_CHANGE',
    linkedConsumerNo: '04281-99231',
    currentSanctionedLoadKw: 5,
    requestedLoadKw: 8,
    loadChangeDirection: 'EXTENSION',
    loadChangeConfirmed: true
  };
  const sla = evaluateApplicationSla(loadChangeApp, new Date('2026-10-21T10:00:00Z'));
  assert.equal(sla.state, 'ON_TRACK');
  console.log('✓ 10. Existing DEMO data integrity and SLA compatibility verified');
}

// 11. Verify ConsumerPortal.tsx preserves all canonical form values and wires smart prefill
{
  const portalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
    'utf8'
  );
  assert.ok(portalSource.includes("initializeServiceRequestWizard('SOLAR_NET_METERING'"));
  assert.ok(portalSource.includes("initializeServiceRequestWizard('LOAD_CHANGE'"));
  assert.ok(portalSource.includes('value="Residential (RGPU)"'));
  assert.ok(portalSource.includes('value="Commercial (NRGP)"'));
  assert.ok(portalSource.includes('value="Industrial (LTMD)"'));
  assert.ok(portalSource.includes('value="Agricultural (AG)"'));
  assert.ok(portalSource.includes("setPhase('1-Phase')"));
  assert.ok(portalSource.includes("setPhase('3-Phase')"));
  console.log('✓ 11. ConsumerPortal.tsx smart prefill wiring and canonical form values verified');
}

console.log('All Phase 3 Step 3 Smart Consumer Service Request Prefill tests passed!');
