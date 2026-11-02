import type { LanguageCode } from './types';
import type {
  EstimateConfidence,
  OperationsTimelineEvent,
  OutageLifecycleStatus,
  OutageSeverity,
  TimelineEventType,
  TransportConnectionState,
} from '../outageMap/types';

export interface OutageMapLocaleStrings {
  moduleHeading: string;
  moduleSubtitle: string;
  consumerModuleHeading: string;
  consumerModuleSubtitle: string;
  demoDisclosureBanner: string;
  consumerPrivacyNotice: string;
  osmAttributionNote: string;
  tileFallbackBannerTitle: string;
  tileFallbackBannerBody: string;
  btnSimulateTileFailure: string;
  btnRestoreTileMap: string;
  btnFitVisible: string;
  btnResetView: string;
  tabMapView: string;
  tabListView: string;
  tabTimelineView: string;
  searchPlaceholder: string;
  filterStatusLabel: string;
  filterSeverityLabel: string;
  filterSubdivisionLabel: string;
  filterFeederLabel: string;
  filterTeamLabel: string;
  filterScopeLabel: string;
  filterAll: string;
  scopeActiveOnly: string;
  scopeResolvedOnly: string;
  scopeAllIncidents: string;
  emptyOutagesTitle: string;
  emptyOutagesSubtitle: string;
  emptyTimelineTitle: string;
  loadingOutages: string;
  errorLoadingOutages: string;
  offlineBannerText: string;
  confirmedOutageBadge: string;
  unverifiedReportBadge: string;
  simulatedAreaBadge: string;
  approximatePointBadge: string;
  detailHeading: string;
  labelReference: string;
  labelArea: string;
  labelFeeder: string;
  labelStatus: string;
  labelSeverity: string;
  labelReportedAt: string;
  labelUpdatedAt: string;
  labelEtr: string;
  etrConfirmedBadge: string;
  etrProvisionalBadge: string;
  etrUnavailable: string;
  labelAssignedTeam: string;
  labelSource: string;
  labelFreshness: string;
  btnOpenIncidentRecord: string;
  btnOpenOwnComplaint: string;
  btnClearTimelineFocus: string;
  timelineHeading: string;
  timelineSubheading: string;
  timelineFocusedPrefix: string;
  timelineOccurredPrefix: string;
  timelineSyncedPrefix: string;
  clusterMarkerAriaPrefix: string;
  mgmtSummaryHeading: string;
  mgmtActiveCount: string;
  mgmtResolvedCount: string;
  mgmtEscalatedCount: string;
  mgmtConfirmedCount: string;
  transportStates: Record<TransportConnectionState, string>;
  statuses: Record<OutageLifecycleStatus, string>;
  severities: Record<OutageSeverity, string>;
}

export const OUTAGE_MAP_TRANSLATIONS: Record<LanguageCode, OutageMapLocaleStrings> = {
  en: {
    moduleHeading: 'Smart Outage Map & Live Utility Operations Timeline',
    moduleSubtitle:
      'Role-scoped outage visualization, simulated feeder geometry, and chronological restoration timeline.',
    consumerModuleHeading: 'Service Area Outage Status & Restoration Progress',
    consumerModuleSubtitle:
      'Public-safe outage updates for your linked service area and your reported outage complaints.',
    demoDisclosureBanner:
      'DEMO Simulation Disclosure: Locations, service-area polygons, and events shown here are derived from simulated DEMO records — not live UGVCL SCADA or GIS feeds.',
    consumerPrivacyNotice:
      'Privacy Safeguard: Exact residential coordinates, consumer contact details, and internal staff notes are never displayed on public outage views.',
    osmAttributionNote: 'Map data © OpenStreetMap contributors · Simulated utility overlay',
    tileFallbackBannerTitle: 'Map Tile Service Unavailable — Schematic Fallback Active',
    tileFallbackBannerBody:
      'External map tiles could not be loaded. Interactive schematic grid, accessible incident list, and operations timeline remain fully operational.',
    btnSimulateTileFailure: 'Test Tile-Outage Fallback',
    btnRestoreTileMap: 'Restore Map Tiles',
    btnFitVisible: 'Fit Visible Outages',
    btnResetView: 'Reset View',
    tabMapView: 'Interactive Map',
    tabListView: 'Accessible Incident List',
    tabTimelineView: 'Operations Timeline',
    searchPlaceholder: 'Search outage ID, feeder, subdivision, or area…',
    filterStatusLabel: 'Outage Status',
    filterSeverityLabel: 'Severity',
    filterSubdivisionLabel: 'Subdivision',
    filterFeederLabel: 'Feeder',
    filterTeamLabel: 'Assigned Team',
    filterScopeLabel: 'Incident Scope',
    filterAll: 'All',
    scopeActiveOnly: 'Active Outages',
    scopeResolvedOnly: 'Resolved / Closed',
    scopeAllIncidents: 'All Incidents',
    emptyOutagesTitle: 'No matching outages in your authorized view',
    emptyOutagesSubtitle:
      'Adjust filters above or clear search criteria to inspect other authorized service records.',
    emptyTimelineTitle: 'No authorized timeline events match the current selection.',
    loadingOutages: 'Loading authorized outage map & timeline…',
    errorLoadingOutages: 'Unable to load outage records. Incident list fallback remains available.',
    offlineBannerText:
      'Browser offline mode active — displaying cached local outage state; queued field updates preserve offline occurrence time.',
    confirmedOutageBadge: 'Confirmed Outage',
    unverifiedReportBadge: 'Unverified Report (Under Review)',
    simulatedAreaBadge: 'Simulated Feeder Polygon (DEMO)',
    approximatePointBadge: 'Approximate DEMO Area Point',
    detailHeading: 'Selected Outage Details',
    labelReference: 'Reference ID',
    labelArea: 'Affected Service Area',
    labelFeeder: 'Feeder / Subdivision',
    labelStatus: 'Lifecycle Status',
    labelSeverity: 'Operational Severity',
    labelReportedAt: 'First Reported',
    labelUpdatedAt: 'Last Updated',
    labelEtr: 'Estimated Restoration (ETR)',
    etrConfirmedBadge: 'Confirmed Estimate',
    etrProvisionalBadge: 'Provisional Estimate',
    etrUnavailable: 'Awaiting field verification — no credible estimate yet',
    labelAssignedTeam: 'Assigned Engineer / Team',
    labelSource: 'Data Source',
    labelFreshness: 'Freshness',
    btnOpenIncidentRecord: 'Open Canonical Incident Dossier',
    btnOpenOwnComplaint: 'View My Linked Complaint',
    btnClearTimelineFocus: 'Show All Authorized Events',
    timelineHeading: 'Live Utility Operations Timeline',
    timelineSubheading: 'Deterministic chronological log derived from real DEMO/authorized events.',
    timelineFocusedPrefix: 'Focused on outage:',
    timelineOccurredPrefix: 'Occurred:',
    timelineSyncedPrefix: 'Synced:',
    clusterMarkerAriaPrefix: 'Outage cluster with',
    mgmtSummaryHeading: 'Authorized Restoration & Outage Summary',
    mgmtActiveCount: 'Active Outages',
    mgmtResolvedCount: 'Resolved / Closed',
    mgmtEscalatedCount: 'Escalated to Management',
    mgmtConfirmedCount: 'Confirmed Outages',
    transportStates: {
      DEMO_SIMULATED: 'DEMO Reactive Mode (Local State · Simulated)',
      LIVE_CONNECTED: 'Backend Live Connected',
      RECONNECTING: 'Reconnecting to Backend Stream…',
      OFFLINE: 'Offline Mode (Local Queue Active)',
    },
    statuses: {
      REPORTED: 'Reported',
      UNDER_EMPLOYEE_REVIEW: 'Under Employee Review',
      CONFIRMED_OUTAGE: 'Confirmed Outage',
      ASSIGNED: 'Assigned to Field',
      ENGINEER_EN_ROUTE: 'Engineer En Route',
      WORK_IN_PROGRESS: 'Work in Progress',
      RESTORATION_REPORTED: 'Restoration Reported',
      RESOLVED_CLOSED: 'Resolved / Closed',
      CANCELLED_FALSE_ALARM: 'Cancelled / False Alarm',
    },
    severities: {
      CRITICAL: 'Critical Severity',
      HIGH: 'High Severity',
      MEDIUM: 'Medium Severity',
      LOW: 'Low Severity',
    },
  },
  gu: {
    moduleHeading: 'સ્માર્ટ આઉટેજ મેપ અને લાઇવ યુટિલિટી ઓપરેશન્સ ટાઇમલાઇન',
    moduleSubtitle:
      'ભૂમિકા-આધારિત વીજ વિક્ષેપ નકશો, સિમ્યુલેટેડ ફીડર વિસ્તાર અને કાળક્રમિક પુનઃસ્થાપન ટાઇમલાઇન.',
    consumerModuleHeading: 'સેવા વિસ્તાર વીજ પુરવઠા સ્થિતિ અને પુનઃસ્થાપન પ્રગતિ',
    consumerModuleSubtitle:
      'તમારા જોડાયેલ સેવા વિસ્તાર અને નોંધાયેલ ફરિયાદો માટે જાહેર-સુરક્ષિત અપડેટ્સ.',
    demoDisclosureBanner:
      'DEMO સ્પષ્ટતા: અહીં દર્શાવેલ સ્થળો, સેવા વિસ્તાર પોલિગોન અને ઘટનાઓ સિમ્યુલેટેડ DEMO રેકોર્ડ્સ છે — લાઇવ UGVCL SCADA કે GIS ફીડ નથી.',
    consumerPrivacyNotice:
      'ગોપનીયતા સુરક્ષા: ગ્રાહકના ચોક્કસ રહેણાંક કોઓર્ડિનેટ્સ, ફોન નંબર કે આંતરિક સ્ટાફ નોંધ જાહેર નકશા પર ક્યારેય બતાવવામાં આવતી નથી.',
    osmAttributionNote: 'નકશા ડેટા © OpenStreetMap contributors · સિમ્યુલેટેડ DEMO ઓવરલે',
    tileFallbackBannerTitle: 'મેપ ટાઇલ સેવા અનુપલબ્ધ — સ્કીમેટિક ફોલબેક સક્રિય',
    tileFallbackBannerBody:
      'બાહ્ય નકશા ટાઇલ્સ લોડ થઈ શકી નથી. સ્કીમેટિક ગ્રિડ, ઘટના યાદી અને ઓપરેશન્સ ટાઇમલાઇન સંપૂર્ણપણે કાર્યરત છે.',
    btnSimulateTileFailure: 'ટાઇલ-ફોલબેક ચકાસો',
    btnRestoreTileMap: 'મેપ ટાઇલ્સ પુનઃસ્થાપિત કરો',
    btnFitVisible: 'દૃશ્યમાન આઉટેજ ફિટ કરો',
    btnResetView: 'દૃશ્ય રીસેટ કરો',
    tabMapView: 'ઇન્ટરેક્ટિવ નકશો',
    tabListView: 'સુલભ ઘટના યાદી',
    tabTimelineView: 'ઓપરેશન્સ ટાઇમલાઇન',
    searchPlaceholder: 'આઉટેજ ID, ફીડર, સબડિવિઝન કે વિસ્તાર શોધો…',
    filterStatusLabel: 'આઉટેજ સ્થિતિ',
    filterSeverityLabel: 'ગંભીરતા',
    filterSubdivisionLabel: 'સબડિવિઝન',
    filterFeederLabel: 'ફીડર',
    filterTeamLabel: 'સોંપાયેલ ટીમ',
    filterScopeLabel: 'ઘટના વ્યાપ',
    filterAll: 'બધા',
    scopeActiveOnly: 'સક્રિય આઉટેજ',
    scopeResolvedOnly: 'ઉકેલાયેલ / બંધ',
    scopeAllIncidents: 'તમામ ઘટનાઓ',
    emptyOutagesTitle: 'તમારા અધિકૃત દૃશ્યમાં કોઈ આઉટેજ મળ્યો નથી',
    emptyOutagesSubtitle: 'અન્ય અધિકૃત રેકોર્ડ્સ જોવા માટે ફિલ્ટર બદલો અથવા શોધ સાફ કરો.',
    emptyTimelineTitle: 'હાલની પસંદગી માટે કોઈ અધિકૃત ટાઇમલાઇન ઇવેન્ટ નથી.',
    loadingOutages: 'અધિકૃત આઉટેજ નકશો અને ટાઇમલાઇન લોડ થઈ રહ્યું છે…',
    errorLoadingOutages: 'આઉટેજ રેકોર્ડ લોડ કરવામાં અસમર્થ. ઘટના યાદી ઉપલબ્ધ છે.',
    offlineBannerText:
      'બ્રાઉઝર ઓફલાઇન મોડ સક્રિય — સ્થાનિક DEMO સ્થિતિ દર્શાવેલ છે; ઓફલાઇન ફીલ્ડ અપડેટ્સ મૂળ સમય જાળવી રાખે છે.',
    confirmedOutageBadge: 'પુષ્ટિ થયેલ આઉટેજ',
    unverifiedReportBadge: 'અપુષ્ટ અહેવાલ (ચકાસણી હેઠળ)',
    simulatedAreaBadge: 'સિમ્યુલેટેડ ફીડર વિસ્તાર (DEMO)',
    approximatePointBadge: 'અંદાજિત DEMO વિસ્તાર બિંદુ',
    detailHeading: 'પસંદ કરેલ આઉટેજ વિગતો',
    labelReference: 'સંદર્ભ ID',
    labelArea: 'અસરગ્રસ્ત સેવા વિસ્તાર',
    labelFeeder: 'ફીડર / સબડિવિઝન',
    labelStatus: 'સ્થિતિ',
    labelSeverity: 'ગંભીરતા',
    labelReportedAt: 'પ્રથમ નોંધ સમય',
    labelUpdatedAt: 'છેલ્લો સુધારો',
    labelEtr: 'અંદાજિત પુનઃસ્થાપન સમય (ETR)',
    etrConfirmedBadge: 'પુષ્ટિ થયેલ અંદાજ',
    etrProvisionalBadge: 'કામચલાઉ અંદાજ',
    etrUnavailable: 'ફીલ્ડ ચકાસણી બાકી — હજુ વિશ્વસનીય અંદાજ ઉપલબ્ધ નથી',
    labelAssignedTeam: 'સોંપાયેલ એન્જિનિયર / ટીમ',
    labelSource: 'ડેટા સ્ત્રોત',
    labelFreshness: 'તાજગી',
    btnOpenIncidentRecord: 'મૂળ ઘટના રેકોર્ડ ખોલો',
    btnOpenOwnComplaint: 'મારી જોડાયેલ ફરિયાદ જુઓ',
    btnClearTimelineFocus: 'તમામ અધિકૃત ઇવેન્ટ્સ બતાવો',
    timelineHeading: 'લાઇવ યુટિલિટી ઓપરેશન્સ ટાઇમલાઇન',
    timelineSubheading: 'વાસ્તવિક DEMO અને અધિકૃત કાર્યવાહીઓનો કાળક્રમિક લોગ.',
    timelineFocusedPrefix: 'પસંદિત આઉટેજ:',
    timelineOccurredPrefix: 'ઘટના સમય:',
    timelineSyncedPrefix: 'સિંક સમય:',
    clusterMarkerAriaPrefix: 'આઉટેજ જૂથ:',
    mgmtSummaryHeading: 'અધિકૃત પુનઃસ્થાપન અને આઉટેજ સારાંશ',
    mgmtActiveCount: 'સક્રિય આઉટેજ',
    mgmtResolvedCount: 'ઉકેલાયેલ / બંધ',
    mgmtEscalatedCount: 'મેનેજમેન્ટને એસ્કેલેટ થયેલ',
    mgmtConfirmedCount: 'પુષ્ટિ થયેલ આઉટેજ',
    transportStates: {
      DEMO_SIMULATED: 'DEMO રિએક્ટિવ મોડ (સ્થાનિક સિમ્યુલેટેડ)',
      LIVE_CONNECTED: 'બેકએન્ડ લાઇવ જોડાયેલ',
      RECONNECTING: 'બેકએન્ડ સાથે પુનઃજોડાણ…',
      OFFLINE: 'ઓફલાઇન મોડ (સ્થાનિક કતાર સક્રિય)',
    },
    statuses: {
      REPORTED: 'નોંધાયેલ',
      UNDER_EMPLOYEE_REVIEW: 'કર્મચારી સમીક્ષા હેઠળ',
      CONFIRMED_OUTAGE: 'પુષ્ટિ થયેલ આઉટેજ',
      ASSIGNED: 'ફીલ્ડને સોંપાયેલ',
      ENGINEER_EN_ROUTE: 'એન્જિનિયર રવાના',
      WORK_IN_PROGRESS: 'સમારકામ ચાલુ',
      RESTORATION_REPORTED: 'પુનઃસ્થાપન નોંધાયેલ',
      RESOLVED_CLOSED: 'ઉકેલાયેલ / બંધ',
      CANCELLED_FALSE_ALARM: 'રદ / ખોટી સૂચના',
    },
    severities: {
      CRITICAL: 'અતિ ગંભીર (Critical)',
      HIGH: 'ઉચ્ચ ગંભીરતા (High)',
      MEDIUM: 'મધ્યમ ગંભીરતા (Medium)',
      LOW: 'સામાન્ય ગંભીરતા (Low)',
    },
  },
  hi: {
    moduleHeading: 'स्मार्ट आउटेज मैप एवं लाइव यूटिलिटी ऑपरेशंस टाइमलाइन',
    moduleSubtitle:
      'भूमिका-आधारित विद्युत बाधित मानचित्र, सिम्युलेटेड फ़ीडर क्षेत्र और कालानुक्रमिक बहाली टाइमलाइन।',
    consumerModuleHeading: 'सेवा क्षेत्र विद्युत आपूर्ति स्थिति व बहाली प्रगति',
    consumerModuleSubtitle:
      'आपके संबद्ध सेवा क्षेत्र और दर्ज शिकायतों के लिए सार्वजनिक-सुरक्षित आउटेज अपडेट।',
    demoDisclosureBanner:
      'DEMO स्पष्टीकरण: यहाँ दिखाए गए स्थान, फ़ीडर पॉलीगॉन और घटनाएँ सिम्युलेटेड DEMO रिकॉर्ड हैं — लाइव UGVCL SCADA या GIS फ़ीड नहीं।',
    consumerPrivacyNotice:
      'गोपनीयता सुरक्षा: सटीक आवासीय निर्देशांक, उपभोक्ता फ़ोन नंबर या आंतरिक स्टाफ़ टिप्पणियाँ सार्वजनिक मानचित्र पर कभी नहीं दिखाई जातीं।',
    osmAttributionNote: 'मानचित्र डेटा © OpenStreetMap contributors · सिम्युलेटेड DEMO ओवरले',
    tileFallbackBannerTitle: 'मैप टाइल सेवा अनुपलब्ध — स्कीमैटिक फ़ॉलबैक सक्रिय',
    tileFallbackBannerBody:
      'बाहरी मानचित्र टाइल लोड नहीं हो सकीं। स्कीमैटिक ग्रिड, सुलभ घटना सूची और ऑपरेशंस टाइमलाइन पूरी तरह सक्रिय हैं।',
    btnSimulateTileFailure: 'टाइल-फ़ॉलबैक जाँचें',
    btnRestoreTileMap: 'मैप टाइल बहाल करें',
    btnFitVisible: 'दृश्य आउटेज फ़िट करें',
    btnResetView: 'दृश्य रीसेट करें',
    tabMapView: 'इंटरैक्टिव मानचित्र',
    tabListView: 'सुलभ घटना सूची',
    tabTimelineView: 'ऑपरेशंस टाइमलाइन',
    searchPlaceholder: 'आउटेज ID, फ़ीडर, सबडिवीज़न या क्षेत्र खोजें…',
    filterStatusLabel: 'आउटेज स्थिति',
    filterSeverityLabel: 'गंभीरता',
    filterSubdivisionLabel: 'सबडिवीज़न',
    filterFeederLabel: 'फ़ीडर',
    filterTeamLabel: 'नियुक्त टीम',
    filterScopeLabel: 'घटना दायरा',
    filterAll: 'सभी',
    scopeActiveOnly: 'सक्रिय आउटेज',
    scopeResolvedOnly: 'हल / बंद',
    scopeAllIncidents: 'सभी घटनाएँ',
    emptyOutagesTitle: 'आपके अधिकृत दृश्य में कोई आउटेज नहीं मिला',
    emptyOutagesSubtitle: 'अन्य अधिकृत रिकॉर्ड देखने के लिए फ़िल्टर बदलें या खोज साफ़ करें।',
    emptyTimelineTitle: 'वर्तमान चयन के लिए कोई अधिकृत टाइमलाइन इवेंट नहीं है।',
    loadingOutages: 'अधिकृत आउटेज मानचित्र और टाइमलाइन लोड हो रहा है…',
    errorLoadingOutages: 'आउटेज रिकॉर्ड लोड करने में असमर्थ। घटना सूची उपलब्ध है।',
    offlineBannerText:
      'ब्राउज़र ऑफ़लाइन मोड सक्रिय — स्थानीय DEMO स्थिति प्रदर्शित; ऑफ़लाइन फ़ील्ड अपडेट मूल समय सुरक्षित रखते हैं।',
    confirmedOutageBadge: 'पुष्ट आउटेज',
    unverifiedReportBadge: 'अपुष्ट रिपोर्ट (समीक्षाधीन)',
    simulatedAreaBadge: 'सिम्युलेटेड फ़ीडर पॉलीगॉन (DEMO)',
    approximatePointBadge: 'अनुमानित DEMO क्षेत्र बिंदु',
    detailHeading: 'चयनित आउटेज विवरण',
    labelReference: 'संदर्भ ID',
    labelArea: 'प्रभावित सेवा क्षेत्र',
    labelFeeder: 'फ़ीडर / सबडिवीज़न',
    labelStatus: 'जीवनचक्र स्थिति',
    labelSeverity: 'परिचालन गंभीरता',
    labelReportedAt: 'प्रथम सूचना समय',
    labelUpdatedAt: 'अंतिम अद्यतन',
    labelEtr: 'अनुमानित बहाली समय (ETR)',
    etrConfirmedBadge: 'पुष्ट अनुमान',
    etrProvisionalBadge: 'अनंतिम अनुमान',
    etrUnavailable: 'फ़ील्ड सत्यापन लंबित — अभी विश्वसनीय अनुमान उपलब्ध नहीं',
    labelAssignedTeam: 'नियुक्त इंजीनियर / टीम',
    labelSource: 'डेटा स्रोत',
    labelFreshness: 'नवीनता',
    btnOpenIncidentRecord: 'मूल घटना रिकॉर्ड खोलें',
    btnOpenOwnComplaint: 'मेरी संबद्ध शिकायत देखें',
    btnClearTimelineFocus: 'सभी अधिकृत इवेंट दिखाएँ',
    timelineHeading: 'लाइव यूटिलिटी ऑपरेशंस टाइमलाइन',
    timelineSubheading: 'वास्तविक DEMO व अधिकृत कार्रवाइयों का कालानुक्रमिक लॉग।',
    timelineFocusedPrefix: 'चयनित आउटेज:',
    timelineOccurredPrefix: 'घटना समय:',
    timelineSyncedPrefix: 'सिंक समय:',
    clusterMarkerAriaPrefix: 'आउटेज समूह:',
    mgmtSummaryHeading: 'अधिकृत बहाली एवं आउटेज सारांश',
    mgmtActiveCount: 'सक्रिय आउटेज',
    mgmtResolvedCount: 'हल / बंद',
    mgmtEscalatedCount: 'प्रबंधन को एस्केलेटेड',
    mgmtConfirmedCount: 'पुष्ट आउटेज',
    transportStates: {
      DEMO_SIMULATED: 'DEMO रिएक्टिव मोड (स्थानीय सिम्युलेटेड)',
      LIVE_CONNECTED: 'बैकएंड लाइव संबद्ध',
      RECONNECTING: 'बैकएंड से पुनः संयोजन…',
      OFFLINE: 'ऑफ़लाइन मोड (स्थानीय कतार सक्रिय)',
    },
    statuses: {
      REPORTED: 'सूचित',
      UNDER_EMPLOYEE_REVIEW: 'कर्मचारी समीक्षाधीन',
      CONFIRMED_OUTAGE: 'पुष्ट आउटेज',
      ASSIGNED: 'फ़ील्ड को नियुक्त',
      ENGINEER_EN_ROUTE: 'इंजीनियर मार्ग में',
      WORK_IN_PROGRESS: 'मरम्मत कार्य प्रगति पर',
      RESTORATION_REPORTED: 'बहाली सूचित',
      RESOLVED_CLOSED: 'हल / बंद',
      CANCELLED_FALSE_ALARM: 'रद्द / गलत सूचना',
    },
    severities: {
      CRITICAL: 'अति गंभीर (Critical)',
      HIGH: 'उच्च गंभीरता (High)',
      MEDIUM: 'मध्यम गंभीरता (Medium)',
      LOW: 'कम गंभीरता (Low)',
    },
  },
  mr: {
    moduleHeading: 'स्मार्ट आउटेज मॅप आणि लाइव्ह युटिलिटी ऑपरेशन्स टाइमलाइन',
    moduleSubtitle:
      'भूमिका-आधारित वीज खंडित नकाशा, सिम्युलेटेड फीडर क्षेत्र आणि कालानुक्रमिक पूर्ववत टाइमलाइन.',
    consumerModuleHeading: 'सेवा क्षेत्र वीज पुरवठा स्थिती व पूर्ववत प्रगती',
    consumerModuleSubtitle:
      'तुमच्या जोडलेल्या सेवा क्षेत्रासाठी आणि नोंदवलेल्या तक्रारींसाठी सार्वजनिक-सुरक्षित अपडेट्स.',
    demoDisclosureBanner:
      'DEMO स्पष्टीकरण: येथे दर्शवलेली ठिकाणे, फीडर पॉलीगॉन आणि घटना सिम्युलेटेड DEMO रेकॉर्ड्स आहेत — लाइव्ह UGVCL SCADA किंवा GIS फीड नाही.',
    consumerPrivacyNotice:
      'गोपनीयता सुरक्षा: अचूक निवासी निर्देशांक, ग्राहक फोन नंबर किंवा अंतर्गत स्टाफ नोंदी सार्वजनिक नकाशावर कधीही दाखवल्या जात नाहीत.',
    osmAttributionNote: 'नकाशा डेटा © OpenStreetMap contributors · सिम्युलेटेड DEMO ओव्हरले',
    tileFallbackBannerTitle: 'मॅप टाइल सेवा अनुपलब्ध — स्कीमॅटिक फॉलबॅक सक्रिय',
    tileFallbackBannerBody:
      'बाह्य नकाशा टाइल्स लोड होऊ शकल्या नाहीत. स्कीमॅटिक ग्रिड, सुलभ घटना यादी आणि ऑपरेशन्स टाइमलाइन पूर्णपणे कार्यरत आहेत.',
    btnSimulateTileFailure: 'टाइल-फॉलबॅक तपासा',
    btnRestoreTileMap: 'मॅप टाइल्स पूर्ववत करा',
    btnFitVisible: 'दृश्य आउटेज फिट करा',
    btnResetView: 'दृश्य रीसेट करा',
    tabMapView: 'इंटरअॅक्टिव्ह नकाशा',
    tabListView: 'सुलभ घटना यादी',
    tabTimelineView: 'ऑपरेशन्स टाइमलाइन',
    searchPlaceholder: 'आउटेज ID, फीडर, सबडिव्हिजन किंवा परिसर शोधा…',
    filterStatusLabel: 'आउटेज स्थिती',
    filterSeverityLabel: 'तीव्रता',
    filterSubdivisionLabel: 'सबडिव्हिजन',
    filterFeederLabel: 'फीडर',
    filterTeamLabel: 'नेमलेली टीम',
    filterScopeLabel: 'घटना व्याप्ती',
    filterAll: 'सर्व',
    scopeActiveOnly: 'सक्रिय आउटेज',
    scopeResolvedOnly: 'निराकरण / बंद',
    scopeAllIncidents: 'सर्व घटना',
    emptyOutagesTitle: 'तुमच्या अधिकृत दृश्यात कोणतेही आउटेज आढळले नाही',
    emptyOutagesSubtitle: 'इतर अधिकृत रेकॉर्ड पाहण्यासाठी फिल्टर बदला किंवा शोध साफ करा.',
    emptyTimelineTitle: 'सध्याच्या निवडीसाठी कोणताही अधिकृत टाइमलाइन इव्हेंट नाही.',
    loadingOutages: 'अधिकृत आउटेज नकाशा आणि टाइमलाइन लोડ होत आहे…',
    errorLoadingOutages: 'आउटेज रेकॉर्ड लोड करण्यात असमर्थ. घटना यादी उपलब्ध आहे.',
    offlineBannerText:
      'ब्राउझर ऑफलाइन मोड सक्रिय — स्थानिक DEMO स्थिती दर्शवली आहे; ऑफलाइन फील्ड अपडेट्स मूळ वेळ जपून ठेवतात.',
    confirmedOutageBadge: 'पुष्टी झालेले आउटेज',
    unverifiedReportBadge: 'अपुष्ट अहवाल (तपासणीखाली)',
    simulatedAreaBadge: 'सिम्युलेटेड फीडर पॉलीगॉन (DEMO)',
    approximatePointBadge: 'अंदाजे DEMO परिसर बिंदू',
    detailHeading: 'निवडलेल्या आउटेजचा तपशील',
    labelReference: 'संदर्भ ID',
    labelArea: 'प्रभावित सेवा परिसर',
    labelFeeder: 'फीडर / सबडिव्हिजन',
    labelStatus: 'स्थिती',
    labelSeverity: 'परिचालन तीव्रता',
    labelReportedAt: 'प्रथम नोंद वेळ',
    labelUpdatedAt: 'शेवटची सुधारणा',
    labelEtr: 'अंदाजित पूर्ववत वेळ (ETR)',
    etrConfirmedBadge: 'पुष्टी झालेला अंदाज',
    etrProvisionalBadge: 'तात्पुरता अंदाज',
    etrUnavailable: 'फील्ड तपासणी प्रलंबित — अद्याप विश्वसनीय अंदाज उपलब्ध नाही',
    labelAssignedTeam: 'नेमलेले अभियंता / टीम',
    labelSource: 'डेटा स्रोत',
    labelFreshness: 'ताजेपणा',
    btnOpenIncidentRecord: 'मूळ घटना रेकॉर्ड उघडा',
    btnOpenOwnComplaint: 'माझी जोडलेली तक्रार पहा',
    btnClearTimelineFocus: 'सर्व अधिकृत इव्हेंट्स दाखवा',
    timelineHeading: 'लाइव्ह युटिलिटी ऑपरेशन्स टाइमलाइन',
    timelineSubheading: 'प्रत्यक्ष DEMO व अधिकृत कार्यवाहीचा कालानुक्रमिक लॉग.',
    timelineFocusedPrefix: 'निवडलेले आउटेज:',
    timelineOccurredPrefix: 'घटना वेळ:',
    timelineSyncedPrefix: 'सिंक वेळ:',
    clusterMarkerAriaPrefix: 'आउटेज समूह:',
    mgmtSummaryHeading: 'अधिकृत पूर्ववत आणि आउटेज सारांश',
    mgmtActiveCount: 'सक्रिय आउटेज',
    mgmtResolvedCount: 'निराकरण / बंद',
    mgmtEscalatedCount: 'व्यवस्थापनाकडे वर्ग',
    mgmtConfirmedCount: 'पुष्टी झालेले आउटेज',
    transportStates: {
      DEMO_SIMULATED: 'DEMO रिअॅक्टिव्ह मोड (स्थानिक सिम्युलेटेड)',
      LIVE_CONNECTED: 'बॅकएंड लाइव्ह जोडलेले',
      RECONNECTING: 'बॅकएंडशी पुन्हा जोडणी…',
      OFFLINE: 'ऑफलाइन मोड (स्थानिक रांग सक्रिय)',
    },
    statuses: {
      REPORTED: 'नोंदवलेले',
      UNDER_EMPLOYEE_REVIEW: 'कर्मचारी तपासणीखाली',
      CONFIRMED_OUTAGE: 'पुष्टी झालेले आउटेज',
      ASSIGNED: 'फील्डला नेमलेले',
      ENGINEER_EN_ROUTE: 'अभियंता मार्गस्थ',
      WORK_IN_PROGRESS: 'दुरुस्ती सुरू',
      RESTORATION_REPORTED: 'पूर्ववत नोंदवलेले',
      RESOLVED_CLOSED: 'निराकरण / बंद',
      CANCELLED_FALSE_ALARM: 'रद्द / चुकीची सूचना',
    },
    severities: {
      CRITICAL: 'अति गंभीर (Critical)',
      HIGH: 'उच्च तीव्रता (High)',
      MEDIUM: 'मध्यम तीव्रता (Medium)',
      LOW: 'कमी तीव्रता (Low)',
    },
  },
};

const EVENT_TEMPLATES: Record<LanguageCode, Record<TimelineEventType, string>> = {
  en: {
    COMPLAINT_SUBMITTED: 'Outage complaint {ref} registered for {area}',
    INCIDENT_CREATED: 'Operational incident {ref} opened in {area}',
    INCIDENT_CLASSIFIED: 'Employee reviewed and classified {ref} under {area}',
    OUTAGE_CONFIRMED: 'Service outage confirmed on {area}',
    EMPLOYEE_ASSIGNMENT: 'Assigned {ref} to field team ({team})',
    EMPLOYEE_ESCALATION: 'Escalated {ref} to executive management review',
    ENGINEER_ACCEPTED_ASSIGNMENT: 'Field engineer accepted assignment for {ref}',
    ENGINEER_EN_ROUTE: 'Field team dispatched and en route to {area}',
    REPAIR_STARTED: 'On-site inspection and repair work started for {ref}',
    ENGINEER_UPDATE_RECEIVED: 'Field progress update recorded for {ref}',
    OFFLINE_UPDATE_SYNCHRONIZED: 'Offline field update for {ref} synchronized once (deduplicated)',
    RESTORATION_REPORTED: 'Field team reported supply restoration for {ref}',
    RESTORATION_CONFIRMED: 'Supply restoration verified by office control for {ref}',
    INCIDENT_CLOSED: 'Outage {ref} resolved and closed',
    INCIDENT_REOPENED: 'Outage {ref} reopened for follow-up verification',
  },
  gu: {
    COMPLAINT_SUBMITTED: '{area} માટે વીજ વિક્ષેપ ફરિયાદ {ref} નોંધાઈ',
    INCIDENT_CREATED: '{area} માં ઓપરેશનલ ઘટના {ref} શરૂ થઈ',
    INCIDENT_CLASSIFIED: 'કર્મચારી દ્વારા {area} હેઠળ {ref} નું વર્ગીકરણ કરાયું',
    OUTAGE_CONFIRMED: '{area} પર વીજ વિક્ષેપની પુષ્ટિ થઈ',
    EMPLOYEE_ASSIGNMENT: '{ref} ફીલ્ડ ટીમ ({team}) ને સોંપવામાં આવ્યું',
    EMPLOYEE_ESCALATION: '{ref} મેનેજમેન્ટ સમીક્ષા માટે એસ્કેલેટ કરાયું',
    ENGINEER_ACCEPTED_ASSIGNMENT: 'ફીલ્ડ એન્જિનિયરે {ref} ની કામગીરી સ્વીકારી',
    ENGINEER_EN_ROUTE: 'ફીલ્ડ ટીમ {area} તરફ રવાના થઈ',
    REPAIR_STARTED: '{ref} માટે સ્થળ તપાસ અને સમારકામ શરૂ થયું',
    ENGINEER_UPDATE_RECEIVED: '{ref} માટે ફીલ્ડ પ્રગતિ અપડેટ નોંધાયું',
    OFFLINE_UPDATE_SYNCHRONIZED: '{ref} નું ઓફલાઇન ફીલ્ડ અપડેટ એકવાર સિંક થયું (ડુપ્લિકેટ-મુક્ત)',
    RESTORATION_REPORTED: 'ફીલ્ડ ટીમે {ref} માટે પુરવઠો પૂર્વવત થયાનો અહેવાલ આપ્યો',
    RESTORATION_CONFIRMED: 'કચેરી નિયંત્રણ દ્વારા {ref} પુનઃસ્થાપનની પુષ્ટિ થઈ',
    INCIDENT_CLOSED: 'આઉટેજ {ref} ઉકેલાયું અને બંધ કરાયું',
    INCIDENT_REOPENED: 'આઉટેજ {ref} ફરી ચકાસણી માટે ખોલવામાં આવ્યું',
  },
  hi: {
    COMPLAINT_SUBMITTED: '{area} के लिए विद्युत बाधित शिकायत {ref} दर्ज की गई',
    INCIDENT_CREATED: '{area} में परिचालन घटना {ref} बनाई गई',
    INCIDENT_CLASSIFIED: 'कर्मचारी द्वारा {area} के अंतर्गत {ref} वर्गीकृत किया गया',
    OUTAGE_CONFIRMED: '{area} में विद्युत आउटेज की पुष्टि हुई',
    EMPLOYEE_ASSIGNMENT: '{ref} को फ़ील्ड टीम ({team}) को सौंपा गया',
    EMPLOYEE_ESCALATION: '{ref} को प्रबंधन समीक्षा हेतु एस्केलेट किया गया',
    ENGINEER_ACCEPTED_ASSIGNMENT: 'फ़ील्ड इंजीनियर ने {ref} का कार्यभार स्वीकार किया',
    ENGINEER_EN_ROUTE: 'फ़ील्ड टीम {area} के लिए मार्ग में रवाना',
    REPAIR_STARTED: '{ref} हेतु स्थल निरीक्षण व मरम्मत कार्य प्रारंभ',
    ENGINEER_UPDATE_RECEIVED: '{ref} के लिए फ़ील्ड प्रगति अद्यतन दर्ज',
    OFFLINE_UPDATE_SYNCHRONIZED: '{ref} का ऑफ़लाइन फ़ील्ड अपडेट एक बार सिंक हुआ (डुप्लिकेट-मुक्त)',
    RESTORATION_REPORTED: 'फ़ील्ड टीम ने {ref} हेतु आपूर्ति बहाली सूचित की',
    RESTORATION_CONFIRMED: 'कार्यालय नियंत्रण द्वारा {ref} की आपूर्ति बहाली सत्यापित',
    INCIDENT_CLOSED: 'आउटेज {ref} हल होकर बंद किया गया',
    INCIDENT_REOPENED: 'आउटेज {ref} अनुवर्ती जाँच हेतु पुनः खोला गया',
  },
  mr: {
    COMPLAINT_SUBMITTED: '{area} साठी वीज खंडित तक्रार {ref} नोंदवली गेली',
    INCIDENT_CREATED: '{area} मध्ये परिचालन घटना {ref} तयार झाली',
    INCIDENT_CLASSIFIED: 'कर्मचाऱ्याने {area} अंतर्गत {ref} वर्गीकृत केले',
    OUTAGE_CONFIRMED: '{area} मधील वीज खंडित स्थितीची पुष्टी झाली',
    EMPLOYEE_ASSIGNMENT: '{ref} फील्ड टीम ({team}) कडे सोपवण्यात आले',
    EMPLOYEE_ESCALATION: '{ref} व्यवस्थापन पुनरावलोकनासाठी वर्ग केले',
    ENGINEER_ACCEPTED_ASSIGNMENT: 'फील्ड अभियंत्याने {ref} ची जबाबदारी स्वीकारली',
    ENGINEER_EN_ROUTE: 'फील्ड टीम {area} कडे मार्गस्थ झाली',
    REPAIR_STARTED: '{ref} साठी प्रत्यक्ष तपासणी व दुरुस्ती सुरू',
    ENGINEER_UPDATE_RECEIVED: '{ref} साठी फील्ड प्रगती नोंद प्राप्त',
    OFFLINE_UPDATE_SYNCHRONIZED: '{ref} चे ऑफलाइन फील्ड अपडेट एकदा सिंक झाले (डुप्लिकेट-मुक्त)',
    RESTORATION_REPORTED: 'फील्ड टीमने {ref} साठी पुरवठा पूर्ववत झाल्याचे कळवले',
    RESTORATION_CONFIRMED: 'कार्यालय नियंत्रणाद्वारे {ref} पुरवठा पूर्ववत झाल्याची पुष्टी',
    INCIDENT_CLOSED: 'आउटेज {ref} निराकरण करून बंद केले',
    INCIDENT_REOPENED: 'आउटेज {ref} पुढील तपासणीसाठी पुन्हा उघडले',
  },
};

export function formatTimelineEventDescription(
  event: Pick<OperationsTimelineEvent, 'descriptionKey' | 'descriptionParams' | 'incidentId'>,
  lang: LanguageCode,
): string {
  const dict = EVENT_TEMPLATES[lang] || EVENT_TEMPLATES.en;
  const tpl = dict[event.descriptionKey] || EVENT_TEMPLATES.en[event.descriptionKey];
  const params = event.descriptionParams || {};
  return tpl
    .replace('{ref}', params.ref || event.incidentId)
    .replace('{area}', params.area || 'UGVCL Service Area')
    .replace('{team}', params.team || 'Field Squad');
}

export function formatConfidenceLabel(
  confidence: EstimateConfidence | undefined,
  lang: LanguageCode,
): string {
  const t = OUTAGE_MAP_TRANSLATIONS[lang] || OUTAGE_MAP_TRANSLATIONS.en;
  if (confidence === 'confirmed') return t.etrConfirmedBadge;
  if (confidence === 'provisional') return t.etrProvisionalBadge;
  return t.etrUnavailable;
}
