import {
  ConsumerServiceRequestType,
  ElectricityConnection,
  LoadChangeDirection,
  NewConnectionApplication,
  TariffCategory
} from '../types';
import { LanguageCode } from '../i18n/types';
import {
  normalizeCanonicalSubdivision,
  normalizeCanonicalTariffCategory
} from '../i18n/consumerContentTranslations';

export interface SessionConsumerIdentity {
  id?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
}

export interface ConsumerServicePrefillState {
  serviceRequestType: ConsumerServiceRequestType;
  linkedConsumerNo: string;
  linkedMeterNo: string;
  currentSanctionedLoadKw: number | null;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  subdivision: string;
  address: string;
  pincode: string;
  premisesType: 'Owned' | 'Rented' | 'Government Leased';
  category: TariffCategory;
  loadKw: number;
  phase: '1-Phase' | '3-Phase';
  purpose: string;
  solarInterest: boolean;
  loadChangeConfirmed: boolean;
  uploadedDocs: string[];
  prefilledFromConnection: boolean;
}

export interface LoadChangeEvaluation {
  currentLoadKw: number | null;
  requestedLoadKw: number;
  direction: LoadChangeDirection;
  deltaKw: number;
  recommendedPhase: '1-Phase' | '3-Phase';
  isValidChange: boolean;
}

export interface ServiceRequestValidationResult {
  valid: boolean;
  errorCode?:
    | 'MANDATORY_FIELDS_MISSING'
    | 'CONNECTION_REQUIRED_FOR_LOAD_CHANGE'
    | 'LOAD_CHANGE_UNCHANGED'
    | 'LOAD_CHANGE_CONFIRMATION_REQUIRED'
    | 'INVALID_LOAD_VALUE';
  errorMessage: string;
}

export const DEFAULT_NEW_CONNECTION_DOCS = [
  'Aadhaar Card (PDF, 420 KB)',
  'Registered Ownership Deed / Index-II (PDF, 1.2 MB)',
  'Government Licensed Electrical Contractor Test Certificate (PDF, 850 KB)'
];

export const DEFAULT_SOLAR_NET_METERING_DOCS = [
  'Aadhaar Card (PDF, 420 KB)',
  'Registered Ownership Deed / Index-II (PDF, 1.2 MB)',
  'Solar PV Net-Metering Feasibility & Grid Connectivity Form (PDF, 640 KB)'
];

export const DEFAULT_LOAD_CHANGE_DOCS = [
  'Aadhaar Card (PDF, 420 KB)',
  'Latest Electricity Bill Receipt (PDF, 310 KB)',
  'Government Licensed Electrical Contractor Test Certificate (PDF, 850 KB)'
];

/**
 * Maps a canonical TariffCategory to its corresponding standard supply purpose option.
 */
export function resolvePurposeForTariffCategory(category?: TariffCategory | string): string {
  const canonical = normalizeCanonicalTariffCategory(category || 'Residential (RGPU)');
  switch (canonical) {
    case 'Commercial (NRGP)':
      return 'Commercial Shop / Office / Retail';
    case 'Industrial (LTMD)':
      return 'Small Scale Workshop / MSME Unit';
    case 'Agricultural (AG)':
      return 'Agricultural Borewell & Farmhouse';
    case 'Residential (RGPU)':
    default:
      return 'Domestic / Residential Lighting & Power';
  }
}

/**
 * Extracts street address and 6-digit Indian PIN code from a raw address string
 * without inventing missing values.
 */
export function extractStreetAddressAndPincode(rawAddress?: string | null): {
  streetAddress: string;
  pincode: string;
} {
  if (!rawAddress || typeof rawAddress !== 'string') {
    return { streetAddress: '', pincode: '' };
  }
  const trimmed = rawAddress.trim();
  if (!trimmed) {
    return { streetAddress: '', pincode: '' };
  }

  // Match trailing or embedded "- 384002" or "Pin - 384002" or 6-digit postal code
  const pinMatch = trimmed.match(/(?:,?\s*(?:Pin\s*[-:]?\s*|[-–]\s*))?(\b[1-9]\d{5}\b)\s*$/i);
  if (pinMatch && pinMatch[1]) {
    const pincode = pinMatch[1];
    const streetAddress = trimmed
      .slice(0, pinMatch.index)
      .replace(/[,.\s-]+$/, '')
      .trim();
    return {
      streetAddress: streetAddress || trimmed,
      pincode
    };
  }

  return {
    streetAddress: trimmed,
    pincode: ''
  };
}

/**
 * Formats the final submission address string cleanly without duplicating PIN codes
 * or appending empty PIN placeholders.
 */
export function formatSubmissionAddress(address: string, pincode?: string): string {
  const cleanAddress = (address || '').trim();
  const cleanPin = (pincode || '').trim();
  if (!cleanAddress) return '';
  if (!cleanPin) return cleanAddress;
  if (cleanAddress.includes(cleanPin)) {
    return cleanAddress;
  }
  return `${cleanAddress}, Pin - ${cleanPin}`;
}

/**
 * Strictly filters and resolves an authorized connection belonging to the current consumer.
 * Prevents cross-consumer data leakage even if an unowned connection object or number is passed.
 */
export function resolveAuthorizedConsumerConnection(
  connections: ElectricityConnection[] | null | undefined,
  selectedConnectionNo?: string | null,
  sessionUser?: SessionConsumerIdentity | null
): ElectricityConnection | null {
  if (!Array.isArray(connections) || connections.length === 0) {
    return null;
  }

  const userId = sessionUser?.id?.trim();
  const userEmail = sessionUser?.email?.trim().toLowerCase();

  const authorizedConnections = connections.filter(conn => {
    if (!conn || !conn.consumerNo) return false;

    // If connection specifies an accountId and session has a specific authenticated userId, enforce match
    if (conn.accountId && userId && userId !== 'anonymous') {
      if (conn.accountId !== userId) {
        return false;
      }
    }

    // If connection specifies accountEmail and no accountId matched, verify email match when session email is present
    if (
      conn.accountEmail &&
      userEmail &&
      (!conn.accountId || !userId || userId === 'anonymous')
    ) {
      if (conn.accountEmail.toLowerCase() !== userEmail) {
        return false;
      }
    }

    return true;
  });

  if (authorizedConnections.length === 0) {
    return null;
  }

  if (selectedConnectionNo) {
    const exactMatch = authorizedConnections.find(
      c => c.consumerNo === selectedConnectionNo
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  return authorizedConnections[0];
}

/**
 * Evaluates a Load Extension / Reduction request against the connection's current sanctioned load.
 * Does not assume increase or decrease automatically.
 */
export function evaluateLoadChangeRequest(
  currentSanctionedLoadKw: number | null | undefined,
  requestedLoadKw: number
): LoadChangeEvaluation {
  const safeRequested =
    typeof requestedLoadKw === 'number' && Number.isFinite(requestedLoadKw) && requestedLoadKw > 0
      ? Number(requestedLoadKw.toFixed(2))
      : 0;
  const recommendedPhase: '1-Phase' | '3-Phase' =
    safeRequested <= 5 ? '1-Phase' : '3-Phase';

  if (
    typeof currentSanctionedLoadKw !== 'number' ||
    !Number.isFinite(currentSanctionedLoadKw) ||
    currentSanctionedLoadKw <= 0
  ) {
    return {
      currentLoadKw: null,
      requestedLoadKw: safeRequested,
      direction: 'UNCHANGED',
      deltaKw: 0,
      recommendedPhase,
      isValidChange: false
    };
  }

  const currentLoad = Number(currentSanctionedLoadKw.toFixed(2));
  const deltaKw = Number((safeRequested - currentLoad).toFixed(2));

  if (Math.abs(deltaKw) < 0.01 || safeRequested <= 0) {
    return {
      currentLoadKw: currentLoad,
      requestedLoadKw: safeRequested,
      direction: 'UNCHANGED',
      deltaKw: 0,
      recommendedPhase,
      isValidChange: false
    };
  }

  return {
    currentLoadKw: currentLoad,
    requestedLoadKw: safeRequested,
    direction: deltaKw > 0 ? 'EXTENSION' : 'REDUCTION',
    deltaKw,
    recommendedPhase,
    isValidChange: true
  };
}

/**
 * Builds the prefilled wizard state for a consumer service request:
 * - 'SOLAR_NET_METERING': Sets solarInterest=true, prefills from selected authorized connection without inventing missing fields.
 * - 'LOAD_CHANGE': Prefills selected connection & currentSanctionedLoadKw, initializes loadKw to currentSanctionedLoadKw (requiring explicit consumer change & confirmation).
 * - 'NEW_CONNECTION': Standard new connection initialization.
 */
export function buildConsumerServicePrefillState(params: {
  requestType: ConsumerServiceRequestType;
  connections?: ElectricityConnection[] | null;
  selectedConnectionNo?: string | null;
  sessionUser?: SessionConsumerIdentity | null;
  isDefaultDemoConsumer?: boolean;
}): ConsumerServicePrefillState {
  const {
    requestType,
    connections,
    selectedConnectionNo,
    sessionUser,
    isDefaultDemoConsumer = false
  } = params;

  const authorizedConnection = resolveAuthorizedConsumerConnection(
    connections,
    selectedConnectionNo,
    sessionUser
  );

  const sessionName = (sessionUser?.name || '').trim();
  const sessionPhone = (sessionUser?.mobileNumber || '').trim();
  const sessionEmail = (sessionUser?.email || '').trim();

  if ((requestType === 'SOLAR_NET_METERING' || requestType === 'LOAD_CHANGE') && authorizedConnection) {
    const { streetAddress, pincode } = extractStreetAddressAndPincode(
      authorizedConnection.address
    );
    const hasValidLoad =
      typeof authorizedConnection.sanctionedLoadKw === 'number' &&
      Number.isFinite(authorizedConnection.sanctionedLoadKw) &&
      authorizedConnection.sanctionedLoadKw > 0;
    const connLoadKw = hasValidLoad ? authorizedConnection.sanctionedLoadKw : 5;
    const connCategory = (
      authorizedConnection.tariffCategory
        ? normalizeCanonicalTariffCategory(authorizedConnection.tariffCategory)
        : 'Residential (RGPU)'
    ) as TariffCategory;
    const connPhase: '1-Phase' | '3-Phase' =
      authorizedConnection.phase === '1-Phase' || authorizedConnection.phase === '3-Phase'
        ? authorizedConnection.phase
        : connLoadKw <= 5
        ? '1-Phase'
        : '3-Phase';
    const connSubdivision = authorizedConnection.subdivision
      ? normalizeCanonicalSubdivision(authorizedConnection.subdivision)
      : 'Mehsana City North';

    return {
      serviceRequestType: requestType,
      linkedConsumerNo: authorizedConnection.consumerNo || '',
      linkedMeterNo: authorizedConnection.meterNo || '',
      currentSanctionedLoadKw: hasValidLoad ? authorizedConnection.sanctionedLoadKw : null,
      applicantName: (authorizedConnection.consumerName || sessionName || '').trim(),
      applicantPhone: sessionPhone || (isDefaultDemoConsumer ? '+91 98250 14820' : ''),
      applicantEmail: (sessionEmail || authorizedConnection.accountEmail || '').trim(),
      subdivision: connSubdivision,
      address: streetAddress,
      pincode,
      premisesType: 'Owned',
      category: connCategory,
      loadKw: connLoadKw,
      phase: connPhase,
      purpose: resolvePurposeForTariffCategory(connCategory),
      solarInterest: requestType === 'SOLAR_NET_METERING',
      loadChangeConfirmed: false,
      uploadedDocs:
        requestType === 'SOLAR_NET_METERING'
          ? [...DEFAULT_SOLAR_NET_METERING_DOCS]
          : [...DEFAULT_LOAD_CHANGE_DOCS],
      prefilledFromConnection: true
    };
  }

  // Fallback when no authorized connection is linked (or when opening standard NEW_CONNECTION)
  const fallbackAddress =
    requestType === 'NEW_CONNECTION' && isDefaultDemoConsumer
      ? '14, Anand Nagar Society, Visnagar Road, Mehsana'
      : '';
  const fallbackPincode =
    requestType === 'NEW_CONNECTION' && isDefaultDemoConsumer ? '384002' : '';
  const defaultLoadKw = 6;

  return {
    serviceRequestType: requestType,
    linkedConsumerNo: '',
    linkedMeterNo: '',
    currentSanctionedLoadKw: null,
    applicantName: sessionName || (isDefaultDemoConsumer ? 'Smt. Meenaben Patel' : ''),
    applicantPhone: sessionPhone || (isDefaultDemoConsumer ? '+91 98250 14820' : ''),
    applicantEmail: sessionEmail || (isDefaultDemoConsumer ? 'consumer@vidyutflow.demo' : ''),
    subdivision: authorizedConnection?.subdivision
      ? normalizeCanonicalSubdivision(authorizedConnection.subdivision)
      : 'Mehsana City North',
    address: fallbackAddress,
    pincode: fallbackPincode,
    premisesType: 'Owned',
    category: 'Residential (RGPU)',
    loadKw: defaultLoadKw,
    phase: '3-Phase',
    purpose: 'Domestic / Residential Lighting & Power',
    solarInterest: requestType === 'SOLAR_NET_METERING',
    loadChangeConfirmed: false,
    uploadedDocs:
      requestType === 'SOLAR_NET_METERING'
        ? [...DEFAULT_SOLAR_NET_METERING_DOCS]
        : requestType === 'LOAD_CHANGE'
        ? [...DEFAULT_LOAD_CHANGE_DOCS]
        : [...DEFAULT_NEW_CONNECTION_DOCS],
    prefilledFromConnection: false
  };
}

/**
 * Merges a fresh connection prefill state with existing wizard state while preserving
 * any fields that the consumer has explicitly edited during the current wizard session.
 */
export function mergePrefillPreservingUserEdits(
  currentState: ConsumerServicePrefillState,
  newPrefill: ConsumerServicePrefillState,
  userEditedFields: ReadonlySet<keyof ConsumerServicePrefillState>
): ConsumerServicePrefillState {
  const merged: ConsumerServicePrefillState = {
    ...newPrefill
  };

  const editableKeys: (keyof ConsumerServicePrefillState)[] = [
    'applicantName',
    'applicantPhone',
    'applicantEmail',
    'subdivision',
    'address',
    'pincode',
    'premisesType',
    'category',
    'loadKw',
    'phase',
    'purpose',
    'solarInterest'
  ];

  for (const key of editableKeys) {
    if (userEditedFields.has(key)) {
      (merged as unknown as Record<string, unknown>)[key] = currentState[key];
    }
  }

  // Always ensure SOLAR_NET_METERING keeps solarInterest true unless explicitly unchecked
  if (
    newPrefill.serviceRequestType === 'SOLAR_NET_METERING' &&
    !userEditedFields.has('solarInterest')
  ) {
    merged.solarInterest = true;
  }

  return merged;
}

/**
 * Validates a consumer service request before submission.
 * Ensures Load Change requests cannot be submitted without an active connection,
 * an explicit load difference (Extension or Reduction), and explicit consumer confirmation.
 */
export function validateServiceRequestSubmission(
  state: Pick<
    ConsumerServicePrefillState,
    | 'serviceRequestType'
    | 'linkedConsumerNo'
    | 'currentSanctionedLoadKw'
    | 'applicantName'
    | 'applicantPhone'
    | 'address'
    | 'loadKw'
    | 'loadChangeConfirmed'
  >,
  lang: LanguageCode = 'en'
): ServiceRequestValidationResult {
  const strings = getServiceRequestUiStrings(lang);

  if (
    !state.applicantName?.trim() ||
    !state.applicantPhone?.trim() ||
    !state.address?.trim()
  ) {
    return {
      valid: false,
      errorCode: 'MANDATORY_FIELDS_MISSING',
      errorMessage: strings.validationMandatoryFields
    };
  }

  if (
    typeof state.loadKw !== 'number' ||
    !Number.isFinite(state.loadKw) ||
    state.loadKw <= 0
  ) {
    return {
      valid: false,
      errorCode: 'INVALID_LOAD_VALUE',
      errorMessage: strings.validationInvalidLoad
    };
  }

  if (state.serviceRequestType === 'LOAD_CHANGE') {
    if (
      !state.linkedConsumerNo?.trim() ||
      state.currentSanctionedLoadKw === null ||
      state.currentSanctionedLoadKw === undefined
    ) {
      return {
        valid: false,
        errorCode: 'CONNECTION_REQUIRED_FOR_LOAD_CHANGE',
        errorMessage: strings.validationConnectionRequiredForLoadChange
      };
    }

    const evaluation = evaluateLoadChangeRequest(
      state.currentSanctionedLoadKw,
      state.loadKw
    );
    if (!evaluation.isValidChange || evaluation.direction === 'UNCHANGED') {
      return {
        valid: false,
        errorCode: 'LOAD_CHANGE_UNCHANGED',
        errorMessage: strings.validationLoadUnchangedPattern.replace(
          '{currentLoad}',
          String(state.currentSanctionedLoadKw)
        )
      };
    }

    if (!state.loadChangeConfirmed) {
      return {
        valid: false,
        errorCode: 'LOAD_CHANGE_CONFIRMATION_REQUIRED',
        errorMessage: strings.validationLoadConfirmationRequired
      };
    }
  }

  return {
    valid: true,
    errorMessage: ''
  };
}

/**
 * Returns a localized badge label and style for an application's service request type
 * across English, Gujarati, Hindi, and Marathi.
 */
export function localizeServiceRequestTypeBadge(
  app: Pick<
    NewConnectionApplication,
    | 'serviceRequestType'
    | 'solarInterest'
    | 'loadChangeDirection'
    | 'currentSanctionedLoadKw'
    | 'requestedLoadKw'
    | 'linkedConsumerNo'
  >,
  lang: LanguageCode = 'en'
): {
  requestType: ConsumerServiceRequestType;
  label: string;
  badgeClasses: string;
} {
  const effectiveType: ConsumerServiceRequestType =
    app.serviceRequestType ||
    (app.solarInterest ? 'SOLAR_NET_METERING' : 'NEW_CONNECTION');

  if (effectiveType === 'SOLAR_NET_METERING') {
    return {
      requestType: 'SOLAR_NET_METERING',
      label: {
        en: 'Solar Net-Metering (Surya Gujarat)',
        gu: 'સોલાર નેટ-મીટરિંગ (સૂર્ય ગુજરાત)',
        hi: 'सोलर नेट-मीटरिंग (सूर्य गुजरात)',
        mr: 'सोलर नेट-मीटरिंग (सूर्य गुजरात)'
      }[lang],
      badgeClasses:
        'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
    };
  }

  if (effectiveType === 'LOAD_CHANGE') {
    const currentKw = app.currentSanctionedLoadKw;
    const reqKw = app.requestedLoadKw;
    const isReduction =
      app.loadChangeDirection === 'REDUCTION' ||
      (typeof currentKw === 'number' && reqKw < currentKw);
    const loadRangeSuffix =
      typeof currentKw === 'number' ? ` (${currentKw} kW → ${reqKw} kW)` : ` (${reqKw} kW)`;

    if (isReduction) {
      return {
        requestType: 'LOAD_CHANGE',
        label:
          {
            en: 'Load Reduction',
            gu: 'લોડ ઘટાડો',
            hi: 'लोड कमी',
            mr: 'लोड कपात'
          }[lang] + loadRangeSuffix,
        badgeClasses:
          'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
      };
    }

    return {
      requestType: 'LOAD_CHANGE',
      label:
        {
          en: 'Load Extension',
          gu: 'લોડ વધારો',
          hi: 'लोड विस्तार',
          mr: 'लोड वाढ'
        }[lang] + loadRangeSuffix,
      badgeClasses:
        'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
    };
  }

  return {
    requestType: 'NEW_CONNECTION',
    label: {
      en: 'New LT Connection',
      gu: 'નવું LT વીજ જોડાણ',
      hi: 'नया LT विद्युत कनेक्शन',
      mr: 'नवीन LT वीज जोडणी'
    }[lang],
    badgeClasses:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
  };
}

export interface ServiceRequestUiStrings {
  requestModeLabel: string;
  modeNewConnection: string;
  modeSolarNetMetering: string;
  modeLoadChange: string;
  solarWizardTitle: string;
  solarWizardSub: string;
  loadChangeWizardTitle: string;
  loadChangeWizardSub: string;
  prefilledFromConnectionBannerTitle: string;
  prefilledFromConnectionBannerDescPattern: string;
  noLinkedConnectionWarningTitle: string;
  noLinkedConnectionSolarDesc: string;
  noLinkedConnectionLoadChangeDesc: string;
  selectConnectionForRequestLabel: string;
  currentSanctionedLoadLabel: string;
  requestedNewLoadLabel: string;
  loadDeltaLabel: string;
  directionExtensionBadge: string;
  directionReductionBadge: string;
  directionUnchangedBadge: string;
  loadChangeInstructionNote: string;
  loadChangeConfirmCheckboxLabel: string;
  submitSolarRequestBtn: string;
  submitLoadChangeRequestBtn: string;
  solarPrefillReadyToastPattern: string;
  loadChangePrefillReadyToastPattern: string;
  validationMandatoryFields: string;
  validationInvalidLoad: string;
  validationConnectionRequiredForLoadChange: string;
  validationLoadUnchangedPattern: string;
  validationLoadConfirmationRequired: string;
  linkedConnectionRefLabel: string;
  serviceRequestTypeLabel: string;
}

export const SERVICE_REQUEST_UI_STRINGS: Record<LanguageCode, ServiceRequestUiStrings> = {
  en: {
    requestModeLabel: 'Service Request Type',
    modeNewConnection: 'New Electricity Connection',
    modeSolarNetMetering: 'Solar Net-Metering (Surya Gujarat)',
    modeLoadChange: 'Load Extension / Reduction',
    solarWizardTitle: 'Apply for Rooftop Solar Net-Metering (Surya Gujarat)',
    solarWizardSub:
      'Bi-directional smart meter sanction and grid connectivity workflow prefilled from your selected connection.',
    loadChangeWizardTitle: 'Request Sanctioned Load Extension / Reduction',
    loadChangeWizardSub:
      'Modify existing contracted load (kW) and phase allocation for your registered electricity connection.',
    prefilledFromConnectionBannerTitle: 'Prefilled from Active Electricity Connection',
    prefilledFromConnectionBannerDescPattern:
      'Details reused from connection #{consumerNo} ({consumerName} · {currentLoad} kW · {subdivision}). You may review and edit fields below.',
    noLinkedConnectionWarningTitle: 'No Linked Electricity Connection Found',
    noLinkedConnectionSolarDesc:
      'You can enter details manually for a new solar-ready installation, or link an existing consumer number first.',
    noLinkedConnectionLoadChangeDesc:
      'Load Extension / Reduction requires an existing linked electricity connection. Please link your consumer number first.',
    selectConnectionForRequestLabel: 'Target Connection for Request:',
    currentSanctionedLoadLabel: 'Current Sanctioned Load',
    requestedNewLoadLabel: 'Requested New Sanctioned Load',
    loadDeltaLabel: 'Net Load Modification',
    directionExtensionBadge: 'Load Extension (Increase)',
    directionReductionBadge: 'Load Reduction (Decrease)',
    directionUnchangedBadge: 'No Change Selected — Choose New Load',
    loadChangeInstructionNote:
      'Select a new load (kW) above or below your current sanctioned load. Do not leave requested load equal to current load.',
    loadChangeConfirmCheckboxLabel:
      'I confirm the requested sanctioned load modification and applicable security deposit / phase revision for this connection.',
    submitSolarRequestBtn: 'Submit Solar Net-Metering Application',
    submitLoadChangeRequestBtn: 'Submit Load Modification Request',
    solarPrefillReadyToastPattern:
      'Solar Net-Metering form prefilled from connection #{consumerNo}.',
    loadChangePrefillReadyToastPattern:
      'Load Extension / Reduction form initialized for connection #{consumerNo} (Current load: {currentLoad} kW).',
    validationMandatoryFields:
      'Please fill all mandatory applicant identity and premises address fields.',
    validationInvalidLoad: 'Please specify a valid requested load in kW.',
    validationConnectionRequiredForLoadChange:
      'Load Extension / Reduction requires an active linked electricity connection.',
    validationLoadUnchangedPattern:
      'Requested load is identical to your current sanctioned load ({currentLoad} kW). Please select a higher or lower load.',
    validationLoadConfirmationRequired:
      'Please check the confirmation box to verify your requested sanctioned load change.',
    linkedConnectionRefLabel: 'Linked Connection No.',
    serviceRequestTypeLabel: 'Request Type'
  },
  gu: {
    requestModeLabel: 'સેવા વિનંતીનો પ્રકાર',
    modeNewConnection: 'નવું વીજ જોડાણ',
    modeSolarNetMetering: 'સોલાર નેટ-મીટરિંગ (સૂર્ય ગુજરાત)',
    modeLoadChange: 'લોડ વધારો / ઘટાડો',
    solarWizardTitle: 'રૂફટોપ સોલાર નેટ-મીટરિંગ (સૂર્ય ગુજરાત) માટે અરજી',
    solarWizardSub:
      'તમારા પસંદ કરેલા વીજ જોડાણની વિગતોના આધારે દ્વિ-દિશાત્મક સ્માર્ટ મીટર અને ગ્રિડ જોડાણ પ્રક્રિયા.',
    loadChangeWizardTitle: 'મંજૂર વીજ ભાર (Load) વધારો / ઘટાડો વિનંતી',
    loadChangeWizardSub:
      'તમારા નોંધાયેલા વીજ જોડાણ માટે હાલના મંજૂર લોડ (kW) અને ફેઝ ફાળવણીમાં ફેરફાર કરો.',
    prefilledFromConnectionBannerTitle: 'સક્રિય વીજ જોડાણમાંથી વિગતો આપમેળે ભરવામાં આવી છે',
    prefilledFromConnectionBannerDescPattern:
      'જોડાણ #{consumerNo} ({consumerName} · {currentLoad} kW · {subdivision}) માંથી વિગતો લેવામાં આવી છે. તમે નીચેની વિગતો ચકાસી અને સુધારી શકો છો.',
    noLinkedConnectionWarningTitle: 'કોઈ લિંક કરેલ વીજ જોડાણ મળ્યું નથી',
    noLinkedConnectionSolarDesc:
      'તમે નવા સોલાર જોડાણ માટે વિગતો જાતે ભરી શકો છો અથવા પહેલા તમારો હયાત ગ્રાહક નંબર લિંક કરી શકો છો.',
    noLinkedConnectionLoadChangeDesc:
      'લોડ વધારો / ઘટાડો કરવા માટે હયાત લિંક કરેલ વીજ જોડાણ જરૂરી છે. કૃપા કરીને પહેલા તમારો ગ્રાહક નંબર લિંક કરો.',
    selectConnectionForRequestLabel: 'વિનંતી માટે લક્ષ્ય વીજ જોડાણ:',
    currentSanctionedLoadLabel: 'હાલનો મંજૂર લોડ (Current Load)',
    requestedNewLoadLabel: 'માંગેલ નવો લોડ (Requested New Load)',
    loadDeltaLabel: 'ચોખ્ખો લોડ ફેરફાર',
    directionExtensionBadge: 'લોડ વધારો (Load Extension)',
    directionReductionBadge: 'લોડ ઘટાડો (Load Reduction)',
    directionUnchangedBadge: 'કોઈ ફેરફાર પસંદ નથી — નવો લોડ પસંદ કરો',
    loadChangeInstructionNote:
      'તમારા હાલના મંજૂર લોડ કરતાં વધુ અથવા ઓછો નવો લોડ (kW) પસંદ કરો. માંગેલ લોડ હાલના લોડ જેટલો ન રાખો.',
    loadChangeConfirmCheckboxLabel:
      'હું આ વીજ જોડાણ માટે માંગેલ મંજૂર લોડ ફેરફાર અને લાગુ પડતી સિક્યોરિટી ડિપોઝિટ / ફેઝ સુધારાની પુષ્ટિ કરું છું.',
    submitSolarRequestBtn: 'સોલાર નેટ-મીટરિંગ અરજી સબમિટ કરો',
    submitLoadChangeRequestBtn: 'લોડ ફેરફાર વિનંતી સબમિટ કરો',
    solarPrefillReadyToastPattern:
      'જોડાણ #{consumerNo} માંથી સોલાર નેટ-મીટરિંગ ફોર્મની વિગતો ભરવામાં આવી.',
    loadChangePrefillReadyToastPattern:
      'જોડાણ #{consumerNo} માટે લોડ વધારો/ઘટાડો ફોર્મ તૈયાર (હાલનો લોડ: {currentLoad} kW).',
    validationMandatoryFields:
      'કૃપા કરીને અરજદારની ઓળખ અને સરનામાની તમામ ફરજિયાત વિગતો ભરો.',
    validationInvalidLoad: 'કૃપા કરીને kW માં માન્ય વીજ લોડ દાખલ કરો.',
    validationConnectionRequiredForLoadChange:
      'લોડ વધારો / ઘટાડો કરવા માટે સક્રિય લિંક કરેલ વીજ જોડાણ અનિવાર્ય છે.',
    validationLoadUnchangedPattern:
      'માંગેલ લોડ તમારા હાલના મંજૂર લોડ ({currentLoad} kW) જેટલો જ છે. કૃપા કરીને વધુ અથવા ઓછો લોડ પસંદ કરો.',
    validationLoadConfirmationRequired:
      'તમારા માંગેલ મંજૂર લોડ ફેરફારની પુષ્ટિ કરવા માટે કૃપા કરીને ચેકબોક્સ પસંદ કરો.',
    linkedConnectionRefLabel: 'લિંક કરેલ ગ્રાહક નં.',
    serviceRequestTypeLabel: 'વિનંતી પ્રકાર'
  },
  hi: {
    requestModeLabel: 'सेवा अनुरोध प्रकार',
    modeNewConnection: 'नया विद्युत कनेक्शन',
    modeSolarNetMetering: 'सोलर नेट-मीटरिंग (सूर्य गुजरात)',
    modeLoadChange: 'लोड विस्तार / कमी (Load Change)',
    solarWizardTitle: 'रूफटॉप सोलर नेट-मीटरिंग (सूर्य गुजरात) हेतु आवेदन',
    solarWizardSub:
      'आपके चयनित विद्युत कनेक्शन के विवरण से पूर्व-भरा द्वि-दिशात्मक स्मार्ट मीटर और ग्रिड संयोजन कार्यप्रवाह।',
    loadChangeWizardTitle: 'स्वीकृत विद्युत भार (Load) विस्तार / कमी अनुरोध',
    loadChangeWizardSub:
      'अपने पंजीकृत विद्युत कनेक्शन के लिए वर्तमान स्वीकृत भार (kW) और फेज़ आवंटन में संशोधन करें।',
    prefilledFromConnectionBannerTitle: 'सक्रिय विद्युत कनेक्शन से विवरण स्वतः भरा गया',
    prefilledFromConnectionBannerDescPattern:
      'कनेक्शन #{consumerNo} ({consumerName} · {currentLoad} kW · {subdivision}) से विवरण लिया गया है। आप नीचे दिए गए विवरण की समीक्षा और संपादन कर सकते हैं।',
    noLinkedConnectionWarningTitle: 'कोई लिंक किया गया विद्युत कनेक्शन नहीं मिला',
    noLinkedConnectionSolarDesc:
      'आप नए सोलर-रेडी इंस्टॉलेशन के लिए विवरण मैन्युअल रूप से दर्ज कर सकते हैं, या पहले अपना मौजूदा उपभोक्ता नंबर लिंक कर सकते हैं।',
    noLinkedConnectionLoadChangeDesc:
      'लोड विस्तार / कमी के लिए मौजूदा लिंक किया गया विद्युत कनेक्शन आवश्यक है। कृपया पहले अपना उपभोक्ता नंबर लिंक करें।',
    selectConnectionForRequestLabel: 'अनुरोध के लिए लक्षित कनेक्शन:',
    currentSanctionedLoadLabel: 'वर्तमान स्वीकृत भार (Current Load)',
    requestedNewLoadLabel: 'अनुरोधित नया भार (Requested New Load)',
    loadDeltaLabel: 'शुद्ध भार परिवर्तन',
    directionExtensionBadge: 'लोड विस्तार (Load Extension)',
    directionReductionBadge: 'लोड कमी (Load Reduction)',
    directionUnchangedBadge: 'कोई परिवर्तन नहीं — नया भार चुनें',
    loadChangeInstructionNote:
      'अपने वर्तमान स्वीकृत भार से अधिक या कम नया भार (kW) चुनें। अनुरोधित भार को वर्तमान भार के बराबर न छोड़ें।',
    loadChangeConfirmCheckboxLabel:
      'मैं इस कनेक्शन के लिए अनुरोधित स्वीकृत भार संशोधन और लागू सुरक्षा जमा / फेज़ परिवर्तन की पुष्टि करता/करती हूँ।',
    submitSolarRequestBtn: 'सोलर नेट-मीटरिंग आवेदन सबमिट करें',
    submitLoadChangeRequestBtn: 'लोड संशोधन अनुरोध सबमिट करें',
    solarPrefillReadyToastPattern:
      'कनेक्शन #{consumerNo} से सोलर नेट-मीटरिंग फॉर्म पूर्व-भरा गया।',
    loadChangePrefillReadyToastPattern:
      'कनेक्शन #{consumerNo} के लिए लोड विस्तार/कमी फॉर्म तैयार (वर्तमान भार: {currentLoad} kW)।',
    validationMandatoryFields:
      'कृपया आवेदक पहचान और परिसर पते के सभी अनिवार्य फ़ील्ड भरें।',
    validationInvalidLoad: 'कृपया kW में मान्य अनुरोधित भार निर्दिष्ट करें।',
    validationConnectionRequiredForLoadChange:
      'लोड विस्तार / कमी के लिए सक्रिय लिंक किया गया विद्युत कनेक्शन आवश्यक है।',
    validationLoadUnchangedPattern:
      'अनुरोधित भार आपके वर्तमान स्वीकृत भार ({currentLoad} kW) के समान है। कृपया अधिक या कम भार चुनें।',
    validationLoadConfirmationRequired:
      'कृपया अपने अनुरोधित स्वीकृत भार परिवर्तन की पुष्टि करने के लिए चेकबॉक्स चुनें।',
    linkedConnectionRefLabel: 'लिंक उपभोक्ता क्र.',
    serviceRequestTypeLabel: 'अनुरोध प्रकार'
  },
  mr: {
    requestModeLabel: 'सेवा विनंतीचा प्रकार',
    modeNewConnection: 'नवीन वीज जोडणी',
    modeSolarNetMetering: 'सोलर नेट-मीटरिंग (सूर्य गुजरात)',
    modeLoadChange: 'लोड वाढ / कपात (Load Change)',
    solarWizardTitle: 'रूफटॉप सोलर नेट-मीटरिंग (सूर्य गुजरात) साठी अर्ज',
    solarWizardSub:
      'तुमच्या निवडलेल्या वीज जोडणीच्या तपशीलावरून पूर्व-भरलेली द्वि-दिशात्मक स्मार्ट मीटर आणि ग्रिड जोडणी प्रक्रिया.',
    loadChangeWizardTitle: 'मंजूर वीज भार (Load) वाढ / कपात विनंती',
    loadChangeWizardSub:
      'तुमच्या नोंदणीकृत वीज जोडणीसाठी सध्याचा मंजूर भार (kW) आणि फेज वाटप सुधारित करा.',
    prefilledFromConnectionBannerTitle: 'सक्रिय वीज जोडणीमधून तपशील आपोआप भरला आहे',
    prefilledFromConnectionBannerDescPattern:
      'जोडणी #{consumerNo} ({consumerName} · {currentLoad} kW · {subdivision}) मधून तपशील घेतला आहे. तुम्ही खालील माहिती तपासून संपादित करू शकता.',
    noLinkedConnectionWarningTitle: 'कोणतीही लिंक केलेली वीज जोडणी आढळली नाही',
    noLinkedConnectionSolarDesc:
      'तुम्ही नवीन सोलर जोडणीसाठी तपशील स्वतः भरू शकता किंवा प्रथम तुमचा विद्यमान ग्राहक क्रमांक लिंक करू शकता.',
    noLinkedConnectionLoadChangeDesc:
      'लोड वाढ / कपात करण्यासाठी विद्यमान लिंक केलेली वीज जोडणी आवश्यक आहे. कृपया प्रथम तुमचा ग्राहक क्रमांक लिंक करा.',
    selectConnectionForRequestLabel: 'विनंतीसाठी लक्षित वीज जोडणी:',
    currentSanctionedLoadLabel: 'सध्याचा मंजूर भार (Current Load)',
    requestedNewLoadLabel: 'मागितलेला नवीन भार (Requested New Load)',
    loadDeltaLabel: 'निव्वळ भार बदल',
    directionExtensionBadge: 'लोड वाढ (Load Extension)',
    directionReductionBadge: 'लोड कपात (Load Reduction)',
    directionUnchangedBadge: 'कोणताही बदल निवडलेला नाही — नवीन भार निवडा',
    loadChangeInstructionNote:
      'तुमच्या सध्याच्या मंजूर भारापेक्षा जास्त किंवा कमी नवीन भार (kW) निवडा. मागितलेला भार सध्याच्या भाराइतकाच ठेवू नका.',
    loadChangeConfirmCheckboxLabel:
      'मी या वीज जोडणीसाठी मागितलेल्या मंजूर भार बदलाची आणि लागू सुरक्षा ठेव / फेज सुधारणेची पुष्टी करतो/करते.',
    submitSolarRequestBtn: 'सोलर नेट-मीटरिंग अर्ज सादर करा',
    submitLoadChangeRequestBtn: 'लोड बदल विनंती सादर करा',
    solarPrefillReadyToastPattern:
      'जोडणी #{consumerNo} मधून सोलर नेट-मीटरिंग फॉर्म पूर्व-भरला गेला.',
    loadChangePrefillReadyToastPattern:
      'जोडणी #{consumerNo} साठी लोड वाढ/कपात फॉर्म तयार (सध्याचा भार: {currentLoad} kW).',
    validationMandatoryFields:
      'कृपया अर्जदाराची ओळख आणि पत्त्याचे सर्व अनिवार्य रकाने भरा.',
    validationInvalidLoad: 'कृपया kW मध्ये वैध मागणी केलेला भार नमूद करा.',
    validationConnectionRequiredForLoadChange:
      'लोड वाढ / कपात करण्यासाठी सक्रिय लिंक केलेली वीज जोडणी आवश्यक आहे.',
    validationLoadUnchangedPattern:
      'मागितलेला भार तुमच्या सध्याच्या मंजूर भाराइतकाच ({currentLoad} kW) आहे. कृपया जास्त किंवा कमी भार निवडा.',
    validationLoadConfirmationRequired:
      'तुमच्या मागितलेल्या मंजूर भार बदलाची पुष्टी करण्यासाठी कृपया चेकबॉक्स निवडा.',
    linkedConnectionRefLabel: 'लिंक ग्राहक क्र.',
    serviceRequestTypeLabel: 'विनंती प्रकार'
  }
};

export function getServiceRequestUiStrings(
  lang: LanguageCode = 'en'
): ServiceRequestUiStrings {
  return SERVICE_REQUEST_UI_STRINGS[lang] || SERVICE_REQUEST_UI_STRINGS.en;
}
