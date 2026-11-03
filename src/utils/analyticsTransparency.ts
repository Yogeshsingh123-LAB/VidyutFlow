import { Language } from '../i18n/types';
import { OperatingDataMode } from '../services/erpApiContracts';

export type BackendSyncStateCode = 'DEMO_ACTIVE' | 'LIVE_CONNECTED' | 'LIVE_UNAVAILABLE' | 'SYNCING';

export type AnalyticsDataSourceBadgeCode =
  | 'LIVE_DATA'
  | 'DEMO_DATA'
  | 'SIMULATED_TELEMETRY'
  | 'FORECAST'
  | 'DEMO_FORECAST'
  | 'SIMULATED_FORECAST'
  | 'LIVE_FORECAST';

export type MetricValueNature =
  | 'measured'
  | 'calculated'
  | 'estimated'
  | 'predicted'
  | 'simulated'
  | 'historical'
  | 'projected'
  | 'rated_capacity';

export type TimestampFreshnessType =
  | 'measured'
  | 'simulated'
  | 'calculated'
  | 'forecast_generated'
  | 'synchronized'
  | 'dataset_period';

export type AnomalyClassificationType =
  | 'detected_anomaly'
  | 'simulated_anomaly'
  | 'forecast_risk'
  | 'confirmed_incident';

export interface AnalyticsTransparencyDictionary {
  // Core Data Source Badges
  liveData: string;
  demoData: string;
  simulated: string;
  simulatedTelemetry: string;
  forecast: string;
  demoDataForecast: string;
  simulatedForecast: string;
  liveDataForecast: string;

  // Value Natures
  measured: string;
  calculated: string;
  estimated: string;
  predicted: string;
  simulatedValue: string;
  historicalData: string;
  projectedData: string;
  ratedCapacity: string;

  // Metadata Labels
  dataSourceLabel: string;
  valueTypeLabel: string;
  lastUpdatedLabel: string;
  lastMeasuredLabel: string;
  lastSimulatedLabel: string;
  lastCalculatedLabel: string;
  forecastGeneratedLabel: string;
  lastSynchronizedLabel: string;
  datasetPeriodLabel: string;
  notAvailable: string;
  lastUpdatedNotAvailable: string;

  // Forecast & Uncertainty Labels
  forecastHorizonLabel: string;
  predictionIntervalLabel: string;
  confidenceUnavailableLabel: string;
  uncertaintyUnavailableNotice: string;
  sensitivityEnvelopeNotice: string;
  modelMethodLabel: string;
  assumptionsLimitationsLabel: string;
  qualitativeRiskScoreLabel: string;
  qualitativeRiskDisclaimer: string;

  // Digital Twin Disclosures
  digitalTwinDisclosure: string;
  digitalTwinScenarioModeLabel: string;
  digitalTwinInteractiveNote: string;
  simulatedVsRatedLabel: string;

  // Anomaly & Risk Classifications
  detectedAnomalyBadge: string;
  simulatedAnomalyBadge: string;
  forecastRiskBadge: string;
  confirmedIncidentBadge: string;
  triggerConditionLabel: string;
  affectedAssetLabel: string;
  recommendedReviewActionLabel: string;
  readOnlyAdvisoryNote: string;

  // Specific Portal & Chart Transparency Texts
  mgmtErpPulseDemoNote: string;
  mgmtErpPulseLiveNote: string;
  mgmtKpiDatasetNote: string;
  mgmtChartAtcHorizon: string;
  mgmtChartRevenueHorizon: string;
  mgmtFeederRadarDisclosure: string;
  mgmtAiRadarDisclosure: string;

  forecastHorizon24h: string;
  forecastMethodSummary: string;
  forecastAssumptionsSummary: string;
  forecastBaselineTimestamp: string;

  consumerFeederTelemetryNote: string;
  consumerConsumptionDisclosure: string;
  consumerHistoricalMonthsLegend: string;
  consumerEstimatedMonthLegend: string;

  employeeTatChartDisclosure: string;
  fieldFeederPatrolDisclosure: string;
}

export const ANALYTICS_TRANSPARENCY_TRANSLATIONS: Record<Language, AnalyticsTransparencyDictionary> = {
  en: {
    liveData: 'LIVE DATA',
    demoData: 'DEMO DATA',
    simulated: 'SIMULATED',
    simulatedTelemetry: 'SIMULATED TELEMETRY',
    forecast: 'FORECAST',
    demoDataForecast: 'DEMO DATA · FORECAST',
    simulatedForecast: 'SIMULATED · FORECAST',
    liveDataForecast: 'LIVE DATA · FORECAST',

    measured: 'Measured',
    calculated: 'Calculated',
    estimated: 'Estimated',
    predicted: 'Predicted',
    simulatedValue: 'Simulated',
    historicalData: 'Historical Data',
    projectedData: 'Projected Data',
    ratedCapacity: 'Rated Capacity',

    dataSourceLabel: 'Data Source',
    valueTypeLabel: 'Value Classification',
    lastUpdatedLabel: 'Last Updated',
    lastMeasuredLabel: 'Last measured',
    lastSimulatedLabel: 'Last simulated',
    lastCalculatedLabel: 'Last calculated',
    forecastGeneratedLabel: 'Forecast generated',
    lastSynchronizedLabel: 'Last synchronized',
    datasetPeriodLabel: 'Dataset period',
    notAvailable: 'Not available',
    lastUpdatedNotAvailable: 'Last updated: Not available',

    forecastHorizonLabel: 'Forecast Horizon',
    predictionIntervalLabel: 'Sensitivity Band',
    confidenceUnavailableLabel: 'Confidence Unavailable',
    uncertaintyUnavailableNotice: 'Forecast estimate — validated uncertainty range unavailable',
    sensitivityEnvelopeNotice:
      'Shaded band shows a deterministic ±4.5% scenario sensitivity envelope. Forecast estimate — validated uncertainty range unavailable.',
    modelMethodLabel: 'Calculation Method',
    assumptionsLimitationsLabel: 'Assumptions & Limitations',
    qualitativeRiskScoreLabel: 'Qualitative Risk Level',
    qualitativeRiskDisclaimer: 'Rule-based operational risk classification (not statistical probability).',

    digitalTwinDisclosure:
      'Simulated Digital Twin — demonstration telemetry, not live grid measurements.',
    digitalTwinScenarioModeLabel: 'Active Simulation Mode',
    digitalTwinInteractiveNote:
      'Interactive scenario parameters modify simulated busbar, feeder and DTR telemetry locally for engineering evaluation.',
    simulatedVsRatedLabel: 'Simulated Load vs Rated Capacity',

    detectedAnomalyBadge: 'Detected Anomaly',
    simulatedAnomalyBadge: 'Simulated Anomaly',
    forecastRiskBadge: 'Forecast Risk',
    confirmedIncidentBadge: 'Confirmed Incident',
    triggerConditionLabel: 'Trigger Condition',
    affectedAssetLabel: 'Affected Asset / Feeder',
    recommendedReviewActionLabel: 'Recommended Review Action',
    readOnlyAdvisoryNote: 'Advisory analytics insight — does not automatically trigger grid switching.',

    mgmtErpPulseDemoNote: 'Demonstration ERP state stored in browser workspace (not live SCADA/MDMS telemetry).',
    mgmtErpPulseLiveNote: 'Synchronized with verified backend operational repository.',
    mgmtKpiDatasetNote: 'Calculated from FY 2026 UGVCL demonstration billing & reliability ledger (May–Oct 2026).',
    mgmtChartAtcHorizon: '6-Month Historical Trajectory (May 2026 – Oct 2026) · Unit: % Loss',
    mgmtChartRevenueHorizon: '6-Month Historical Trajectory (May 2026 – Oct 2026) · Units: MUs & ₹ Cr',
    mgmtFeederRadarDisclosure:
      'Feeder peak load vs rated conductor capacity (Amps / MW) from UGVCL Mehsana Circle demonstration dataset.',
    mgmtAiRadarDisclosure:
      'Heuristic & model-derived advisory alerts on demonstration smart-meter and DTR thermal records.',

    forecastHorizon24h: 'Next 24 Hours (Hourly, 00:00–23:00 IST)',
    forecastMethodSummary:
      'Deterministic hourly load curve scaled by ambient temperature (°C), annual load trend (%), and midday rooftop solar offset (MW).',
    forecastAssumptionsSummary:
      'Assumes ₹5.42/kWh base tariff and 7.4 MW peak solar shaving (11:00–15:00). Demonstration simulation model.',
    forecastBaselineTimestamp: 'Baseline Reference: Oct 2026 DAPS Schedule',

    consumerFeederTelemetryNote:
      'Simulated 11kV feeder reference telemetry for demonstration — not live smart-meter voltage polling.',
    consumerConsumptionDisclosure:
      'May–Sep 2026 values reflect billed historical readings (kWh); Oct 2026 (Est) is a provisional pro-rata consumption estimate.',
    consumerHistoricalMonthsLegend: 'Historical Billed (kWh)',
    consumerEstimatedMonthLegend: 'Provisional Estimate (Oct 2026 Est)',

    employeeTatChartDisclosure:
      'Calculated subdivision turnaround time (Hours) vs GERC 24h SLA benchmark from demonstration records.',
    fieldFeederPatrolDisclosure:
      'Reference 11kV feeder peak load and conductor utilization from demonstration patrol baseline.'
  },
  gu: {
    liveData: 'લાઇવ ડેટા (LIVE)',
    demoData: 'ડેમો ડેટા (DEMO)',
    simulated: 'સિમ્યુલેટેડ (SIMULATED)',
    simulatedTelemetry: 'સિમ્યુલેટેડ ટેલિમેટ્રી',
    forecast: 'પૂર્વાનુમાન (FORECAST)',
    demoDataForecast: 'ડેમો ડેટા · પૂર્વાનુમાન',
    simulatedForecast: 'સિમ્યુલેટેડ · પૂર્વાનુમાન',
    liveDataForecast: 'લાઇવ ડેટા · પૂર્વાનુમાન',

    measured: 'માપેલ (Measured)',
    calculated: 'ગણતરી કરેલ (Calculated)',
    estimated: 'અંદાજિત (Estimated)',
    predicted: 'પૂર્વાનુમાનિત (Predicted)',
    simulatedValue: 'સિમ્યુલેટેડ (Simulated)',
    historicalData: 'ઐતિહાસિક ડેટા',
    projectedData: 'પ્રોજેક્ટેડ ડેટા',
    ratedCapacity: 'રેટેડ ક્ષમતા',

    dataSourceLabel: 'ડેટા સ્ત્રોત',
    valueTypeLabel: 'મૂલ્ય વર્ગીકરણ',
    lastUpdatedLabel: 'છેલ્લે અપડેટ',
    lastMeasuredLabel: 'છેલ્લું માપન',
    lastSimulatedLabel: 'છેલ્લું સિમ્યુલેશન',
    lastCalculatedLabel: 'છેલ્લી ગણતરી',
    forecastGeneratedLabel: 'પૂર્વાનુમાન જનરેટ સમય',
    lastSynchronizedLabel: 'છેલ્લું સિંક્રોનાઇઝેશન',
    datasetPeriodLabel: 'ડેટાસેટ સમયગાળો',
    notAvailable: 'ઉપલબ્ધ નથી',
    lastUpdatedNotAvailable: 'છેલ્લે અપડેટ: ઉપલબ્ધ નથી',

    forecastHorizonLabel: 'પૂર્વાનુમાન ક્ષિતિજ (Horizon)',
    predictionIntervalLabel: 'સંવેદનશીલતા બેન્ડ',
    confidenceUnavailableLabel: 'વિશ્વાસ અંતરાલ અનુપલબ્ધ',
    uncertaintyUnavailableNotice: 'પૂર્વાનુમાન અંદાજ — પ્રમાણિત અનિશ્ચિતતા શ્રેણી ઉપલબ્ધ નથી',
    sensitivityEnvelopeNotice:
      'છાયાંકિત પટ્ટો ±4.5% સિમ્યુલેશન સંવેદનશીલતા દર્શાવે છે. પૂર્વાનુમાન અંદાજ — પ્રમાણિત અનિશ્ચિતતા શ્રેણી ઉપલબ્ધ નથી.',
    modelMethodLabel: 'ગણતરી પદ્ધતિ',
    assumptionsLimitationsLabel: 'ધારણાઓ અને મર્યાદાઓ',
    qualitativeRiskScoreLabel: 'ગુણાત્મક જોખમ સ્તર',
    qualitativeRiskDisclaimer: 'નિયમ-આધારિત ઓપરેશનલ જોખમ વર્ગીકરણ (આંકડાકીય સંભાવના નથી).',

    digitalTwinDisclosure:
      'સિમ્યુલેટેડ ડિજિટલ ટ્વિન — નિદર્શન ટેલિમેટ્રી, લાઇવ ગ્રિડ માપન નથી.',
    digitalTwinScenarioModeLabel: 'સક્રિય સિમ્યુલેશન મોડ',
    digitalTwinInteractiveNote:
      'ઇન્ટરેક્ટિવ પરિદ્રશ્ય નિયંત્રણો એન્જિનિયરિંગ મૂલ્યાંકન માટે બસબાર, ફીડર અને DTR મૂલ્યોનું સ્થાનિક સિમ્યુલેશન કરે છે.',
    simulatedVsRatedLabel: 'સિમ્યુલેટેડ લોડ વિ. રેટેડ ક્ષમતા',

    detectedAnomalyBadge: 'શોધાયેલ વિસંગતતા',
    simulatedAnomalyBadge: 'સિમ્યુલેટેડ વિસંગતતા',
    forecastRiskBadge: 'પૂર્વાનુમાન જોખમ',
    confirmedIncidentBadge: 'પુષ્ટિ થયેલ ઘટના',
    triggerConditionLabel: 'ટ્રિગર સ્થિતિ',
    affectedAssetLabel: 'અસરગ્રસ્ત એકમ / ફીડર',
    recommendedReviewActionLabel: 'ભલામણ કરેલ સમીક્ષા પગલું',
    readOnlyAdvisoryNote: 'સલાહકારી એનાલિટિક્સ સૂચન — આપમેળે ગ્રિડ સ્વિચિંગ કરતું નથી.',

    mgmtErpPulseDemoNote: 'બ્રાઉઝર વર્કસ્પેસમાં સંગ્રહિત ડેમો ERP સ્થિતિ (લાઇવ SCADA ટેલિમેટ્રી નથી).',
    mgmtErpPulseLiveNote: 'પ્રમાણિત બેકએન્ડ ઓપરેશનલ રિપોઝિટરી સાથે સિંક્રોનાઇઝ્ડ.',
    mgmtKpiDatasetNote: 'નાણાકીય વર્ષ ૨૦૨૬ UGVCL ડેમો બિલિંગ અને વિશ્વસનીયતા લેજર (મે–ઓક્ટો ૨૦૨૬) પરથી ગણતરી કરેલ.',
    mgmtChartAtcHorizon: '૬-મહિનાનો ઐતિહાસિક ટ્રેન્ડ (મે ૨૦૨૬ – ઓક્ટો ૨૦૨૬) · એકમ: % નુકસાન',
    mgmtChartRevenueHorizon: '૬-મહિનાનો ઐતિહાસિક ટ્રેન્ડ (મે ૨૦૨૬ – ઓક્ટો ૨૦૨૬) · એકમ: MUs અને ₹ કરોડ',
    mgmtFeederRadarDisclosure:
      'UGVCL મહેસાણા સર્કલ ડેમો ડેટાસેટ પરથી ફીડર પીક લોડ વિ. રેટેડ કંડક્ટર ક્ષમતા (Amps / MW).',
    mgmtAiRadarDisclosure:
      'ડેમો સ્માર્ટ-મીટર અને DTR થર્મલ રેકોર્ડ્સ પર આધારિત પૂર્વાનુમાન અને વિસંગતતા ચેતવણીઓ.',

    forecastHorizon24h: 'આગામી ૨૪ કલાક (કલાકદીઠ, 00:00–23:00 IST)',
    forecastMethodSummary:
      'તાપમાન (°C), વાર્ષિક લોડ વૃદ્ધિ (%) અને બપોરના રૂફટોપ સોલર ઓફસેટ (MW) દ્વારા ગુણાંકિત કલાકદીઠ લોડ વક્ર.',
    forecastAssumptionsSummary:
      '₹5.42/kWh બેઝ ટેરિફ અને 7.4 MW સોલર શેવિંગ (11:00–15:00) ધારે છે. નિદર્શન સિમ્યુલેશન મોડેલ.',
    forecastBaselineTimestamp: 'બેઝલાઇન સંદર્ભ: ઓક્ટો ૨૦૨૬ DAPS શેડ્યૂલ',

    consumerFeederTelemetryNote:
      'નિદર્શન માટે સિમ્યુલેટેડ 11kV ફીડર સંદર્ભ ટેલિમેટ્રી — લાઇવ સ્માર્ટ-મીટર વોલ્ટેજ માપન નથી.',
    consumerConsumptionDisclosure:
      'મે–સપ્ટે ૨૦૨૬ ના મૂલ્યો બિલ થયેલ ઐતિહાસિક રીડિંગ્સ (kWh) છે; ઓક્ટો ૨૦૨૬ (Est) એ કામચલાઉ અંદાજિત વપરાશ છે.',
    consumerHistoricalMonthsLegend: 'ઐતિહાસિક બિલ વપરાશ (kWh)',
    consumerEstimatedMonthLegend: 'કામચલાઉ અંદાજ (Oct 2026 Est)',

    employeeTatChartDisclosure:
      'ડેમો રેકોર્ડ્સ પરથી ગણતરી કરેલ પેટા-વિભાગ TAT (કલાક) વિ. GERC 24h SLA બેન્ચમાર્ક.',
    fieldFeederPatrolDisclosure:
      'ડેમો પેટ્રોલ બેઝલાઇન પરથી સંદર્ભ 11kV ફીડર પીક લોડ અને કંડક્ટર ઉપયોગિતા.'
  },
  hi: {
    liveData: 'लाइव डेटा (LIVE)',
    demoData: 'डेमो डेटा (DEMO)',
    simulated: 'सिम्युलेटेड (SIMULATED)',
    simulatedTelemetry: 'सिम्युलेटेड टेलीमेट्री',
    forecast: 'पूर्वानुमान (FORECAST)',
    demoDataForecast: 'डेमो डेटा · पूर्वानुमान',
    simulatedForecast: 'सिम्युलेटेड · पूर्वानुमान',
    liveDataForecast: 'लाइव डेटा · पूर्वानुमान',

    measured: 'मापा गया (Measured)',
    calculated: 'गणना किया गया (Calculated)',
    estimated: 'अनुमानित (Estimated)',
    predicted: 'पूर्वानुमानित (Predicted)',
    simulatedValue: 'सिम्युलेटेड (Simulated)',
    historicalData: 'ऐतिहासिक डेटा',
    projectedData: 'प्रक्षेपित डेटा',
    ratedCapacity: 'रेटेड क्षमता',

    dataSourceLabel: 'डेटा स्रोत',
    valueTypeLabel: 'मान वर्गीकरण',
    lastUpdatedLabel: 'अंतिम अपडेट',
    lastMeasuredLabel: 'अंतिम मापन',
    lastSimulatedLabel: 'अंतिम सिमुलेशन',
    lastCalculatedLabel: 'अंतिम गणना',
    forecastGeneratedLabel: 'पूर्वानुमान जनित समय',
    lastSynchronizedLabel: 'अंतिम सिंक्रनाइज़ेशन',
    datasetPeriodLabel: 'डेटासेट अवधि',
    notAvailable: 'उपलब्ध नहीं',
    lastUpdatedNotAvailable: 'अंतिम अपडेट: उपलब्ध नहीं',

    forecastHorizonLabel: 'पूर्वानुमान क्षितिज (Horizon)',
    predictionIntervalLabel: 'संवेदनशीलता बैंड',
    confidenceUnavailableLabel: 'विश्वास अंतराल अनुपलब्ध',
    uncertaintyUnavailableNotice: 'पूर्वानुमान अनुमान — सत्यापित अनिश्चितता सीमा उपलब्ध नहीं है',
    sensitivityEnvelopeNotice:
      'छायांकित बैंड ±4.5% नियतात्मक परिदृश्य संवेदनशीलता दर्शाता है। पूर्वानुमान अनुमान — सत्यापित अनिश्चितता सीमा उपलब्ध नहीं है।',
    modelMethodLabel: 'गणना पद्धति',
    assumptionsLimitationsLabel: 'मान्यताएं एवं सीमाएं',
    qualitativeRiskScoreLabel: 'गुणात्मक जोखिम स्तर',
    qualitativeRiskDisclaimer: 'नियम-आधारित परिचालन जोखिम वर्गीकरण (सांख्यिकीय संभावना नहीं)।',

    digitalTwinDisclosure:
      'सिम्युलेटेड डिजिटल ट्विन — प्रदर्शन टेलीमेट्री, लाइव ग्रिड मापन नहीं।',
    digitalTwinScenarioModeLabel: 'सक्रिय सिमुलेशन मोड',
    digitalTwinInteractiveNote:
      'इंटरएक्टिव परिदृश्य नियंत्रण इंजीनियरिंग मूल्यांकन के लिए बसबार, फीडर और DTR टेलीमेट्री का स्थानीय अनुकरण करते हैं।',
    simulatedVsRatedLabel: 'सिम्युलेटेड लोड बनाम रेटेड क्षमता',

    detectedAnomalyBadge: 'पहचानी गई विसंगति',
    simulatedAnomalyBadge: 'सिम्युलेटेड विसंगति',
    forecastRiskBadge: 'पूर्वानुमान जोखिम',
    confirmedIncidentBadge: 'पुष्ट घटना',
    triggerConditionLabel: 'ट्रिगर स्थिति',
    affectedAssetLabel: 'प्रभावित उपकरण / फीडर',
    recommendedReviewActionLabel: 'अनुशंसित समीक्षा कार्रवाई',
    readOnlyAdvisoryNote: 'सलाहकार एनालिटिक्स अंतर्दृष्टि — स्वचालित ग्रिड स्विचिंग ट्रिगर नहीं करता है।',

    mgmtErpPulseDemoNote: 'ब्राउज़र कार्यक्षेत्र में संग्रहीत डेमो ERP स्थिति (लाइव SCADA टेलीमेट्री नहीं)।',
    mgmtErpPulseLiveNote: 'सत्यापित बैकएंड परिचालन रिपॉजिटरी के साथ सिंक्रनाइज़।',
    mgmtKpiDatasetNote: 'वित्त वर्ष 2026 UGVCL डेमो बिलिंग और विश्वसनीयता लेजर (मई–अक्टूबर 2026) से गणना की गई।',
    mgmtChartAtcHorizon: '6-माह ऐतिहासिक रुझान (मई 2026 – अक्टूबर 2026) · इकाई: % हानि',
    mgmtChartRevenueHorizon: '6-माह ऐतिहासिक रुझान (मई 2026 – अक्टूबर 2026) · इकाइयां: MUs एवं ₹ करोड़',
    mgmtFeederRadarDisclosure:
      'UGVCL मेहसाणा सर्कल डेमो डेटासेट से फीडर पीक लोड बनाम रेटेड कंडक्टर क्षमता (Amps / MW)।',
    mgmtAiRadarDisclosure:
      'डेमो स्मार्ट-मीटर और DTR थर्मल रिकॉर्ड पर आधारित नियम एवं मॉडल सलाहकार चेतावनियां।',

    forecastHorizon24h: 'अगले 24 घंटे (प्रति घंटा, 00:00–23:00 IST)',
    forecastMethodSummary:
      'परिवेश तापमान (°C), वार्षिक लोड रुझान (%) और दोपहर के रूफटॉप सोलर ऑफसेट (MW) द्वारा समायोजित नियतात्मक लोड वक्र।',
    forecastAssumptionsSummary:
      '₹5.42/kWh आधार टैरिफ और 7.4 MW पीक सोलर शेविंग (11:00–15:00) मानता है। प्रदर्शन सिमुलेशन मॉडल।',
    forecastBaselineTimestamp: 'आधारभूत संदर्भ: अक्टूबर 2026 DAPS अनुसूची',

    consumerFeederTelemetryNote:
      'प्रदर्शन के लिए सिम्युलेटेड 11kV फीडर संदर्भ टेलीमेट्री — लाइव स्मार्ट-मीटर वोल्टेज मापन नहीं।',
    consumerConsumptionDisclosure:
      'मई–सितंबर 2026 के मान बिल किए गए ऐतिहासिक रीडिंग (kWh) हैं; अक्टूबर 2026 (Est) एक अनंतिम अनुमानित उपभोग है।',
    consumerHistoricalMonthsLegend: 'ऐतिहासिक बिल उपभोग (kWh)',
    consumerEstimatedMonthLegend: 'अनंतिम अनुमान (Oct 2026 Est)',

    employeeTatChartDisclosure:
      'डेमो रिकॉर्ड से गणना किया गया उप-संभाग TAT (घंटे) बनाम GERC 24h SLA मानक।',
    fieldFeederPatrolDisclosure:
      'डेमो पेट्रोल बेसलाइन से संदर्भ 11kV फीडर पीक लोड और कंडक्टर उपयोगिता।'
  },
  mr: {
    liveData: 'लाइव्ह डेटा (LIVE)',
    demoData: 'डेमो डेटा (DEMO)',
    simulated: 'सिम्युलेटेड (SIMULATED)',
    simulatedTelemetry: 'सिम्युलेटेड टेलिमेट्री',
    forecast: 'अंदाज (FORECAST)',
    demoDataForecast: 'डेमो डेटा · अंदाज',
    simulatedForecast: 'सिम्युलेटेड · अंदाज',
    liveDataForecast: 'लाइव्ह डेटा · अंदाज',

    measured: 'मोजलेले (Measured)',
    calculated: 'गणना केलेले (Calculated)',
    estimated: 'अंदाजित (Estimated)',
    predicted: 'भाकीत केलेले (Predicted)',
    simulatedValue: 'सिम्युलेटेड (Simulated)',
    historicalData: 'ऐतिहासिक डेटा',
    projectedData: 'प्रक्षेपित डेटा',
    ratedCapacity: 'रेटेड क्षमता',

    dataSourceLabel: 'डेटा स्रोत',
    valueTypeLabel: 'मूल्य वर्गीकरण',
    lastUpdatedLabel: 'शेवटचे अपडेट',
    lastMeasuredLabel: 'शेवटचे मोजमाप',
    lastSimulatedLabel: 'शेवटचे सिम्युलेशन',
    lastCalculatedLabel: 'शेवटची गणना',
    forecastGeneratedLabel: 'अंदाज निर्मिती वेळ',
    lastSynchronizedLabel: 'शेवटचे सिंक्रोनाइझेशन',
    datasetPeriodLabel: 'डेटासेट कालावधी',
    notAvailable: 'उपलब्ध नाही',
    lastUpdatedNotAvailable: 'शेवटचे अपडेट: उपलब्ध नाही',

    forecastHorizonLabel: 'अंदाज क्षितिज (Horizon)',
    predictionIntervalLabel: 'संवेदनशीलता पट्टा',
    confidenceUnavailableLabel: 'विश्वासार्हता श्रेणी अनुपलब्ध',
    uncertaintyUnavailableNotice: 'अंदाजित मूल्य — प्रमाणित अनिश्चितता श्रेणी उपलब्ध नाही',
    sensitivityEnvelopeNotice:
      'छायांकित पट्टा ±4.5% निश्चित सिम्युलेशन संवेदनशीलता दर्शवतो. अंदाजित मूल्य — प्रमाणित अनिश्चितता श्रेणी उपलब्ध नाही.',
    modelMethodLabel: 'गणना पद्धती',
    assumptionsLimitationsLabel: 'गृहीतके आणि मर्यादा',
    qualitativeRiskScoreLabel: 'गुणात्मक जोखीम पातळी',
    qualitativeRiskDisclaimer: 'नियम-आधारित ऑपरेशनल जोखीम वर्गीकरण (सांख्यिकीय संभाव्यता नाही).',

    digitalTwinDisclosure:
      'सिम्युलेटेड डिजिटल ट्विन — प्रात्यक्षिक टेलिमेट्री, लाइव्ह ग्रिड मोजमाप नाही.',
    digitalTwinScenarioModeLabel: 'सक्रिय सिम्युलेशन मोड',
    digitalTwinInteractiveNote:
      'इंटरअॅक्टिव्ह परिस्थिती नियंत्रणे अभियांत्रिकी मूल्यांकनासाठी बसबार, फीडर आणि DTR टेलिमेट्रीचे स्थानिक सिम्युलेशन करतात.',
    simulatedVsRatedLabel: 'सिम्युलेटेड लोड वि. रेटेड क्षमता',

    detectedAnomalyBadge: 'आढळलेली विसंगती',
    simulatedAnomalyBadge: 'सिम्युलेटेड विसंगती',
    forecastRiskBadge: 'अंदाजित जोखीम',
    confirmedIncidentBadge: 'पुष्टी झालेली घटना',
    triggerConditionLabel: 'ट्रिगर स्थिती',
    affectedAssetLabel: 'प्रभावित उपकरण / फीडर',
    recommendedReviewActionLabel: 'शिफारस केलेली पुनरावलोकन कृती',
    readOnlyAdvisoryNote: 'सल्लागार अॅनालिटिक्स माहिती — आपोआप ग्रिड स्विचिंग करत नाही.',

    mgmtErpPulseDemoNote: 'ब्राउझर वर्कस्पेसमध्ये साठवलेली डेमो ERP स्थिती (लाइव्ह SCADA टेलिमेट्री नाही).',
    mgmtErpPulseLiveNote: 'सत्यापित बॅकएंड ऑपरेशनल रिपॉझिटरीशी सिंक्रोनाइझ केलेले.',
    mgmtKpiDatasetNote: 'आर्थिक वर्ष २०२६ UGVCL डेमो बिलिंग आणि विश्वसनीयता लेजर (मे–ऑक्टो २०२६) मधून गणना केलेले.',
    mgmtChartAtcHorizon: '६-महिन्यांचा ऐतिहासिक कल (मे २०२६ – ऑक्टो २०२६) · एकक: % तोटा',
    mgmtChartRevenueHorizon: '६-महिन्यांचा ऐतिहासिक कल (मे २०२६ – ऑक्टो २०२६) · एकके: MUs आणि ₹ कोटी',
    mgmtFeederRadarDisclosure:
      'UGVCL मेहसाणा सर्कल डेमो डेटासेटमधून फीडर पीक लोड वि. रेटेड कंडक्टर क्षमता (Amps / MW).',
    mgmtAiRadarDisclosure:
      'डेमो स्मार्ट-मीटर आणि DTR थर्मल रेकॉर्डवर आधारित नियम व मॉडेल सल्लागार इशारे.',

    forecastHorizon24h: 'पुढील २४ तास (तासनिहाय, 00:00–23:00 IST)',
    forecastMethodSummary:
      'परिसर तापमान (°C), वार्षिक लोड वाढ (%) आणि दुपारच्या रूफटॉप सोलर ऑफसेट (MW) द्वारे समायोजित तासनिहाय लोड वक्र.',
    forecastAssumptionsSummary:
      '₹5.42/kWh मूळ दर आणि 7.4 MW पीक सोलर शेव्हिंग (11:00–15:00) गृहीत धरते. प्रात्यक्षिक सिम्युलेशन मॉडेल.',
    forecastBaselineTimestamp: 'बेसलाइन संदर्भ: ऑक्टोबर २०२६ DAPS वेळापत्रक',

    consumerFeederTelemetryNote:
      'प्रात्यक्षिकासाठी सिम्युलेटेड 11kV फीडर संदर्भ टेलिमेट्री — लाइव्ह स्मार्ट-मीटर व्होल्टेज मोजमाप नाही.',
    consumerConsumptionDisclosure:
      'मे–सप्टें २०२६ ची मूल्ये बिल केलेली ऐतिहासिक रीडिंग्ज (kWh) आहेत; ऑक्टो २०२६ (Est) हा तात्पुरता अंदाजित वापर आहे.',
    consumerHistoricalMonthsLegend: 'ऐतिहासिक बिल वापर (kWh)',
    consumerEstimatedMonthLegend: 'तात्पुरता अंदाज (Oct 2026 Est)',

    employeeTatChartDisclosure:
      'डेमो रेकॉर्डमधून गणना केलेला उप-विभाग TAT (तास) वि. GERC 24h SLA मानक.',
    fieldFeederPatrolDisclosure:
      'डेमो पेट्रोल बेसलाइनमधून संदर्भ 11kV फीडर पीक लोड आणि कंडक्टर वापर.'
  }
};

export function getAnalyticsTransparencyDictionary(lang: Language): AnalyticsTransparencyDictionary {
  return ANALYTICS_TRANSPARENCY_TRANSLATIONS[lang] || ANALYTICS_TRANSPARENCY_TRANSLATIONS.en;
}

export interface DataSourceClassificationInput {
  dataMode?: OperatingDataMode;
  backendStatusState?: BackendSyncStateCode;
  isBrowserOffline?: boolean;
  isOfflineSimulated?: boolean;
  isSimulatedView?: boolean;
  isForecastView?: boolean;
  hasInteractiveSimulationModification?: boolean;
  language?: Language;
}

export interface DataSourceClassificationResult {
  code: AnalyticsDataSourceBadgeCode;
  isTrulyLive: boolean;
  isSimulated: boolean;
  isForecast: boolean;
  isDemo: boolean;
  badgeLabel: string;
  badgeTone: 'emerald' | 'indigo' | 'amber' | 'violet' | 'slate';
}

/**
 * Classifies an analytics, Digital Twin, or forecasting view into an honest,
 * unambiguous data source badge (`LIVE DATA`, `DEMO DATA`, `SIMULATED TELEMETRY`,
 * `DEMO DATA · FORECAST`, `SIMULATED · FORECAST`, `LIVE DATA · FORECAST`).
 *
 * CRITICAL RULE: Never returns `LIVE` merely because `navigator.onLine` is true.
 * Returns `LIVE` only when `dataMode === 'LIVE'` AND `backendStatusState === 'LIVE_CONNECTED'`
 * AND the browser/portal is not offline or running a synthetic simulation.
 */
export function resolveAnalyticsDataSourceClassification(
  input: DataSourceClassificationInput
): DataSourceClassificationResult {
  const lang = input.language || 'en';
  const dict = getAnalyticsTransparencyDictionary(lang);

  const isTrulyLive =
    input.dataMode === 'LIVE' &&
    input.backendStatusState === 'LIVE_CONNECTED' &&
    !input.isBrowserOffline &&
    !input.isOfflineSimulated &&
    !input.isSimulatedView &&
    !input.hasInteractiveSimulationModification;

  if (input.isSimulatedView) {
    if (input.isForecastView) {
      return {
        code: 'SIMULATED_FORECAST',
        isTrulyLive: false,
        isSimulated: true,
        isForecast: true,
        isDemo: !isTrulyLive,
        badgeLabel: dict.simulatedForecast,
        badgeTone: 'violet'
      };
    }
    return {
      code: 'SIMULATED_TELEMETRY',
      isTrulyLive: false,
      isSimulated: true,
      isForecast: false,
      isDemo: !isTrulyLive,
      badgeLabel: dict.simulatedTelemetry,
      badgeTone: 'amber'
    };
  }

  if (input.isForecastView) {
    if (input.hasInteractiveSimulationModification) {
      return {
        code: 'SIMULATED_FORECAST',
        isTrulyLive: false,
        isSimulated: true,
        isForecast: true,
        isDemo: !isTrulyLive,
        badgeLabel: dict.simulatedForecast,
        badgeTone: 'violet'
      };
    }
    if (isTrulyLive) {
      return {
        code: 'LIVE_FORECAST',
        isTrulyLive: true,
        isSimulated: false,
        isForecast: true,
        isDemo: false,
        badgeLabel: dict.liveDataForecast,
        badgeTone: 'emerald'
      };
    }
    return {
      code: 'DEMO_FORECAST',
      isTrulyLive: false,
      isSimulated: false,
      isForecast: true,
      isDemo: true,
      badgeLabel: dict.demoDataForecast,
      badgeTone: 'indigo'
    };
  }

  if (isTrulyLive) {
    return {
      code: 'LIVE_DATA',
      isTrulyLive: true,
      isSimulated: false,
      isForecast: false,
      isDemo: false,
      badgeLabel: dict.liveData,
      badgeTone: 'emerald'
    };
  }

  return {
    code: 'DEMO_DATA',
    isTrulyLive: false,
    isSimulated: false,
    isForecast: false,
    isDemo: true,
    badgeLabel: dict.demoData,
    badgeTone: 'slate'
  };
}

/**
 * Formats an honest timestamp or dataset freshness label.
 * Never fabricates "Updated just now" or substitutes `new Date()` when a real timestamp is absent.
 */
export function resolveAnalyticsTimestampLabel(params: {
  timestamp?: string | null;
  type?: TimestampFreshnessType;
  language?: Language;
}): {
  hasValidTimestamp: boolean;
  prefixLabel: string;
  valueLabel: string;
  formattedText: string;
} {
  const lang = params.language || 'en';
  const dict = getAnalyticsTransparencyDictionary(lang);
  const raw = typeof params.timestamp === 'string' ? params.timestamp.trim() : '';

  const prefixMap: Record<TimestampFreshnessType, string> = {
    measured: dict.lastMeasuredLabel,
    simulated: dict.lastSimulatedLabel,
    calculated: dict.lastCalculatedLabel,
    forecast_generated: dict.forecastGeneratedLabel,
    synchronized: dict.lastSynchronizedLabel,
    dataset_period: dict.datasetPeriodLabel
  };

  const prefixLabel = params.type ? prefixMap[params.type] : dict.lastUpdatedLabel;

  if (!raw) {
    return {
      hasValidTimestamp: false,
      prefixLabel: dict.lastUpdatedLabel,
      valueLabel: dict.notAvailable,
      formattedText: dict.lastUpdatedNotAvailable
    };
  }

  return {
    hasValidTimestamp: true,
    prefixLabel,
    valueLabel: raw,
    formattedText: `${prefixLabel}: ${raw}`
  };
}

/**
 * Resolves honest forecast uncertainty & confidence interval disclosures.
 * Never fabricates "95% statistical confidence" or "98% accuracy" when a real validated interval does not exist.
 */
export function resolveForecastUncertaintyDisclosure(params: {
  hasValidatedStatisticalInterval: boolean;
  validatedLowerBound?: number;
  validatedUpperBound?: number;
  unit?: string;
  hasDeterministicSensitivityBand?: boolean;
  qualitativeRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  language?: Language;
}): {
  hasValidatedConfidence: boolean;
  badgeText: string;
  disclosureText: string;
  qualitativeRiskLabel?: string;
} {
  const lang = params.language || 'en';
  const dict = getAnalyticsTransparencyDictionary(lang);

  const qualitativeRiskLabel = params.qualitativeRiskLevel
    ? `${dict.qualitativeRiskScoreLabel}: ${params.qualitativeRiskLevel}`
    : undefined;

  if (
    params.hasValidatedStatisticalInterval &&
    typeof params.validatedLowerBound === 'number' &&
    typeof params.validatedUpperBound === 'number'
  ) {
    const unitSuffix = params.unit ? ` ${params.unit}` : '';
    const rangeStr = `${params.validatedLowerBound}${unitSuffix} – ${params.validatedUpperBound}${unitSuffix}`;
    return {
      hasValidatedConfidence: true,
      badgeText: `${dict.predictionIntervalLabel}: ${rangeStr}`,
      disclosureText: `${dict.predictionIntervalLabel}: ${rangeStr}`,
      qualitativeRiskLabel
    };
  }

  if (params.hasDeterministicSensitivityBand) {
    return {
      hasValidatedConfidence: false,
      badgeText: dict.confidenceUnavailableLabel,
      disclosureText: dict.sensitivityEnvelopeNotice,
      qualitativeRiskLabel
    };
  }

  return {
    hasValidatedConfidence: false,
    badgeText: dict.confidenceUnavailableLabel,
    disclosureText: dict.uncertaintyUnavailableNotice,
    qualitativeRiskLabel
  };
}

/**
 * Resolves localized value classification label (`Measured`, `Calculated`, `Estimated`, `Predicted`, `Simulated`, etc.).
 */
export function getMetricValueNatureLabel(nature: MetricValueNature, language: Language = 'en'): string {
  const dict = getAnalyticsTransparencyDictionary(language);
  switch (nature) {
    case 'measured':
      return dict.measured;
    case 'calculated':
      return dict.calculated;
    case 'estimated':
      return dict.estimated;
    case 'predicted':
      return dict.predicted;
    case 'simulated':
      return dict.simulatedValue;
    case 'historical':
      return dict.historicalData;
    case 'projected':
      return dict.projectedData;
    case 'rated_capacity':
      return dict.ratedCapacity;
  }
}

/**
 * Resolves localized anomaly / predictive risk classification badge label.
 */
export function getAnomalyClassificationLabel(
  classification: AnomalyClassificationType,
  language: Language = 'en'
): {
  label: string;
  tone: 'amber' | 'rose' | 'indigo' | 'red';
} {
  const dict = getAnalyticsTransparencyDictionary(language);
  switch (classification) {
    case 'detected_anomaly':
      return { label: dict.detectedAnomalyBadge, tone: 'amber' };
    case 'simulated_anomaly':
      return { label: dict.simulatedAnomalyBadge, tone: 'indigo' };
    case 'forecast_risk':
      return { label: dict.forecastRiskBadge, tone: 'rose' };
    case 'confirmed_incident':
      return { label: dict.confirmedIncidentBadge, tone: 'red' };
  }
}
