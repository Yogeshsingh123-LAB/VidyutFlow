import fs from 'fs';
import path from 'path';
import {
  ANALYTICS_TRANSPARENCY_TRANSLATIONS,
  getAnalyticsTransparencyDictionary,
  resolveAnalyticsDataSourceClassification,
  resolveAnalyticsTimestampLabel,
  resolveForecastUncertaintyDisclosure,
  getMetricValueNatureLabel,
  getAnomalyClassificationLabel
} from '../src/utils/analyticsTransparency';
import {
  MANAGEMENT_UI_TRANSLATIONS,
  getManagementUiDictionary,
  localizeDigitalTwinScenario,
  localizeEquipmentCatalogNode
} from '../src/i18n/managementContentTranslations';
import {
  EXECUTIVE_MONTHLY_METRICS,
  FEEDER_METRICS,
  SUBDIVISION_PERFORMANCE,
  CONSUMPTION_HISTORY
} from '../src/data/mockData';
import { Language } from '../src/i18n/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

console.log(
  '🧪 Starting VidyutFlow Phase 4 Step 4.4: Digital Twin, Forecasting Transparency & Analytics Labeling Verification\n'
);

// ============================================================================
// 1 & 2. DIGITAL TWIN SIMULATION CLASSIFICATION & NON-LIVE SCADA GUARANTEE
// ============================================================================
console.log('--- 1 & 2. Digital Twin Simulation Classification & Non-Live Guarantee ---');
{
  const dtDemo = resolveAnalyticsDataSourceClassification({
    dataMode: 'DEMO',
    backendStatusState: 'DEMO_ACTIVE',
    isSimulatedView: true,
    language: 'en'
  });
  assert(
    dtDemo.code === 'SIMULATED_TELEMETRY' &&
      dtDemo.badgeLabel === 'SIMULATED TELEMETRY' &&
      dtDemo.isSimulated === true &&
      dtDemo.isTrulyLive === false,
    'Digital Twin in DEMO mode displays SIMULATED TELEMETRY and is never marked as live'
  );

  const dtWhenBackendLive = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'LIVE_CONNECTED',
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isSimulatedView: true,
    language: 'en'
  });
  assert(
    dtWhenBackendLive.code === 'SIMULATED_TELEMETRY' &&
      dtWhenBackendLive.isTrulyLive === false &&
      dtWhenBackendLive.isSimulated === true,
    'Digital Twin synthetic telemetry is still classified as SIMULATED TELEMETRY even if backend is connected'
  );

  const dtFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/intro/SmartGridDigitalTwin.tsx'),
    'utf-8'
  );
  assert(
    dtFile.includes('data-testid="digital-twin-source-badge"') &&
      dtFile.includes('data-testid="digital-twin-disclosure"') &&
      dtFile.includes('at.digitalTwinDisclosure') &&
      dtFile.includes('at.simulatedVsRatedLabel'),
    'SmartGridDigitalTwin component renders section-level simulation badge, disclosure banner, and Simulated vs Rated Capacity labels'
  );
}

// ============================================================================
// 3, 4 & 5. FORECAST CLASSIFICATION, UNITS, HORIZON & HISTORICAL VS PROJECTED
// ============================================================================
console.log('\n--- 3, 4 & 5. Forecast Classification, Units, Horizon & Historical vs Projected ---');
{
  const forecastBaseline = resolveAnalyticsDataSourceClassification({
    dataMode: 'DEMO',
    backendStatusState: 'DEMO_ACTIVE',
    isForecastView: true,
    hasInteractiveSimulationModification: false,
    language: 'en'
  });
  assert(
    forecastBaseline.code === 'DEMO_FORECAST' &&
      forecastBaseline.badgeLabel === 'DEMO DATA · FORECAST' &&
      forecastBaseline.isForecast === true &&
      forecastBaseline.isDemo === true &&
      forecastBaseline.isTrulyLive === false,
    'Baseline forecast in DEMO mode displays composite badge DEMO DATA · FORECAST'
  );

  const forecastInteractive = resolveAnalyticsDataSourceClassification({
    dataMode: 'DEMO',
    isForecastView: true,
    hasInteractiveSimulationModification: true,
    language: 'en'
  });
  assert(
    forecastInteractive.code === 'SIMULATED_FORECAST' &&
      forecastInteractive.badgeLabel === 'SIMULATED · FORECAST' &&
      forecastInteractive.isSimulated === true &&
      forecastInteractive.isForecast === true,
    'Interactive parameter-modified forecast displays SIMULATED · FORECAST'
  );

  const forecastLive = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'LIVE_CONNECTED',
    isBrowserOffline: false,
    isOfflineSimulated: false,
    isForecastView: true,
    hasInteractiveSimulationModification: false,
    language: 'en'
  });
  assert(
    forecastLive.code === 'LIVE_FORECAST' &&
      forecastLive.badgeLabel === 'LIVE DATA · FORECAST' &&
      forecastLive.isTrulyLive === true &&
      forecastLive.isForecast === true,
    'Verified live forecast displays LIVE DATA · FORECAST'
  );

  const enDict = getAnalyticsTransparencyDictionary('en');
  assert(
    enDict.forecastHorizon24h.includes('Next 24 Hours') &&
      enDict.forecastHorizon24h.includes('00:00–23:00'),
    'Forecast horizon explicitly states Next 24 Hours (Hourly, 00:00–23:00 IST)'
  );

  const forecastFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/intro/AIEnergyForecasting.tsx'),
    'utf-8'
  );
  assert(
    forecastFile.includes('MW') &&
      forecastFile.includes('MUs') &&
      forecastFile.includes('Cr') &&
      forecastFile.includes('at.predicted') &&
      forecastFile.includes('at.estimated') &&
      forecastFile.includes('at.calculated') &&
      forecastFile.includes('at.historicalData'),
    'AIEnergyForecasting displays explicit units (MW, MUs, ₹ Cr) and distinguishes Historical Data, Predicted, Estimated, and Calculated values'
  );

  const consumerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/consumer/ConsumerPortal.tsx'),
    'utf-8'
  );
  assert(
    consumerFile.includes('data-testid="consumer-analytics-source-badge"') &&
      consumerFile.includes('at.consumerConsumptionDisclosure') &&
      enDict.consumerConsumptionDisclosure.includes('May–Sep 2026') &&
      enDict.consumerConsumptionDisclosure.includes('Oct 2026 (Est)'),
    'Consumer consumption chart explicitly distinguishes historical billed months (May–Sep 2026) from provisional estimate (Oct 2026 Est)'
  );
}

// ============================================================================
// 6 & 7. TIMESTAMP & FRESHNESS ACCURACY (NO FAKE "UPDATED JUST NOW")
// ============================================================================
console.log('\n--- 6 & 7. Timestamp & Freshness Accuracy ---');
{
  const validMeasured = resolveAnalyticsTimestampLabel({
    timestamp: '01-Oct-2026',
    type: 'measured',
    language: 'en'
  });
  assert(
    validMeasured.hasValidTimestamp === true &&
      validMeasured.formattedText === 'Last measured: 01-Oct-2026',
    'Valid measured timestamp formats accurately as "Last measured: 01-Oct-2026"'
  );

  const validSimulated = resolveAnalyticsTimestampLabel({
    timestamp: '14:20:00 IST (OVERLOAD)',
    type: 'simulated',
    language: 'en'
  });
  assert(
    validSimulated.hasValidTimestamp === true &&
      validSimulated.formattedText === 'Last simulated: 14:20:00 IST (OVERLOAD)',
    'Valid simulated timestamp formats accurately with "Last simulated:" prefix'
  );

  const missingTsNull = resolveAnalyticsTimestampLabel({
    timestamp: null,
    type: 'measured',
    language: 'en'
  });
  const missingTsEmpty = resolveAnalyticsTimestampLabel({
    timestamp: '   ',
    type: 'forecast_generated',
    language: 'en'
  });
  assert(
    missingTsNull.hasValidTimestamp === false &&
      missingTsNull.formattedText === 'Last updated: Not available' &&
      missingTsEmpty.hasValidTimestamp === false &&
      missingTsEmpty.formattedText === 'Last updated: Not available' &&
      !missingTsNull.formattedText.toLowerCase().includes('just now'),
    'Missing timestamps return honest fallback "Last updated: Not available" and never fabricate "Updated just now" or wall-clock time'
  );
}

// ============================================================================
// 8, 9 & 10. CONFIDENCE INTERVAL, UNCERTAINTY & QUALITATIVE RISK RULES
// ============================================================================
console.log('\n--- 8, 9 & 10. Confidence Interval, Uncertainty & Qualitative Risk Rules ---');
{
  const validatedInterval = resolveForecastUncertaintyDisclosure({
    hasValidatedStatisticalInterval: true,
    validatedLowerBound: 64.5,
    validatedUpperBound: 71.2,
    unit: 'MW',
    language: 'en'
  });
  assert(
    validatedInterval.hasValidatedConfidence === true &&
      validatedInterval.disclosureText.includes('64.5 MW – 71.2 MW'),
    'Real validated numerical interval is displayed when mathematically present'
  );

  const unvalidatedWithSensitivityBand = resolveForecastUncertaintyDisclosure({
    hasValidatedStatisticalInterval: false,
    hasDeterministicSensitivityBand: true,
    qualitativeRiskLevel: 'CRITICAL',
    language: 'en'
  });
  assert(
    unvalidatedWithSensitivityBand.hasValidatedConfidence === false &&
      unvalidatedWithSensitivityBand.badgeText === 'Confidence Unavailable' &&
      unvalidatedWithSensitivityBand.disclosureText.includes(
        'Forecast estimate — validated uncertainty range unavailable'
      ) &&
      !unvalidatedWithSensitivityBand.disclosureText.includes('95%') &&
      !unvalidatedWithSensitivityBand.disclosureText.includes('98%'),
    'Unvalidated forecast never fabricates 95%/98% confidence and explicitly discloses "Forecast estimate — validated uncertainty range unavailable"'
  );

  assert(
    unvalidatedWithSensitivityBand.qualitativeRiskLabel === 'Qualitative Risk Level: CRITICAL',
    'Qualitative risk indicators are explicitly labeled as "Qualitative Risk Level", not statistical confidence'
  );

  // Verify that no language in MANAGEMENT_UI_TRANSLATIONS still claims "95% statistical confidence"
  const langs: Language[] = ['en', 'gu', 'hi', 'mr'];
  for (const lang of langs) {
    const subtitle = MANAGEMENT_UI_TRANSLATIONS[lang].chartConfidenceSubtitle;
    assert(
      !subtitle.includes('95%') &&
        !subtitle.includes('૯૫%') &&
        !subtitle.includes('९५%'),
      `MANAGEMENT_UI_TRANSLATIONS[${lang}].chartConfidenceSubtitle does not contain fabricated 95% statistical confidence claims`
    );
  }
}

// ============================================================================
// 11. ANOMALY, RISK & PREDICTIVE INDICATOR CLASSIFICATION
// ============================================================================
console.log('\n--- 11. Anomaly, Risk & Predictive Indicator Classification ---');
{
  const detected = getAnomalyClassificationLabel('detected_anomaly', 'en');
  const simulated = getAnomalyClassificationLabel('simulated_anomaly', 'en');
  const forecastRisk = getAnomalyClassificationLabel('forecast_risk', 'en');
  const confirmed = getAnomalyClassificationLabel('confirmed_incident', 'en');

  assert(
    detected.label === 'Detected Anomaly' &&
      simulated.label === 'Simulated Anomaly' &&
      forecastRisk.label === 'Forecast Risk' &&
      confirmed.label === 'Confirmed Incident',
    'Anomaly classification helper distinctly labels Detected Anomaly, Simulated Anomaly, Forecast Risk, and Confirmed Incident'
  );
}

// ============================================================================
// 12. STRICT "LIVE" CLASSIFICATION GUARD (NEVER LIVE MERELY BECAUSE ONLINE)
// ============================================================================
console.log('\n--- 12. Strict LIVE Classification Guard ---');
{
  const onlineInDemo = resolveAnalyticsDataSourceClassification({
    dataMode: 'DEMO',
    backendStatusState: 'DEMO_ACTIVE',
    isBrowserOffline: false,
    isOfflineSimulated: false
  });
  const onlineButSyncing = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'SYNCING',
    isBrowserOffline: false,
    isOfflineSimulated: false
  });
  const onlineButUnavailable = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'LIVE_UNAVAILABLE',
    isBrowserOffline: false,
    isOfflineSimulated: false
  });
  const liveModeButBrowserOffline = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'LIVE_CONNECTED',
    isBrowserOffline: true,
    isOfflineSimulated: false
  });
  const liveModeButOfflineSimulated = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'LIVE_CONNECTED',
    isBrowserOffline: false,
    isOfflineSimulated: true
  });
  const trulyLive = resolveAnalyticsDataSourceClassification({
    dataMode: 'LIVE',
    backendStatusState: 'LIVE_CONNECTED',
    isBrowserOffline: false,
    isOfflineSimulated: false
  });

  assert(
    !onlineInDemo.isTrulyLive &&
      onlineInDemo.code === 'DEMO_DATA' &&
      !onlineButSyncing.isTrulyLive &&
      !onlineButUnavailable.isTrulyLive &&
      !liveModeButBrowserOffline.isTrulyLive &&
      !liveModeButOfflineSimulated.isTrulyLive &&
      trulyLive.isTrulyLive &&
      trulyLive.code === 'LIVE_DATA',
    'LIVE DATA is returned ONLY when dataMode is LIVE, backendStatus is LIVE_CONNECTED, and client is neither offline nor simulated'
  );
}

// ============================================================================
// 13, 14, 15 & 16. MULTILINGUAL SUPPORT (EN / GU / HI / MR)
// ============================================================================
console.log('\n--- 13, 14, 15 & 16. Multilingual Support (EN, GU, HI, MR) ---');
{
  const languages: Language[] = ['en', 'gu', 'hi', 'mr'];
  const requiredKeys: (keyof typeof ANALYTICS_TRANSPARENCY_TRANSLATIONS.en)[] = [
    'liveData',
    'demoData',
    'simulated',
    'simulatedTelemetry',
    'forecast',
    'demoDataForecast',
    'simulatedForecast',
    'liveDataForecast',
    'measured',
    'calculated',
    'estimated',
    'predicted',
    'simulatedValue',
    'historicalData',
    'projectedData',
    'ratedCapacity',
    'dataSourceLabel',
    'lastUpdatedLabel',
    'lastUpdatedNotAvailable',
    'forecastHorizonLabel',
    'confidenceUnavailableLabel',
    'uncertaintyUnavailableNotice',
    'digitalTwinDisclosure',
    'detectedAnomalyBadge',
    'simulatedAnomalyBadge',
    'forecastRiskBadge',
    'confirmedIncidentBadge'
  ];

  for (const lang of languages) {
    const dict = getAnalyticsTransparencyDictionary(lang);
    const allPresent = requiredKeys.every(
      k => typeof dict[k] === 'string' && dict[k].trim().length > 0
    );
    const tsMissing = resolveAnalyticsTimestampLabel({ timestamp: null, language: lang });
    const unc = resolveForecastUncertaintyDisclosure({
      hasValidatedStatisticalInterval: false,
      language: lang
    });
    const naturePred = getMetricValueNatureLabel('predicted', lang);

    assert(
      allPresent &&
        tsMissing.formattedText === dict.lastUpdatedNotAvailable &&
        unc.badgeText === dict.confidenceUnavailableLabel &&
        naturePred === dict.predicted,
      `All analytics, Digital Twin, and forecast transparency labels render in ${lang.toUpperCase()} without missing keys`
    );
  }
}

// ============================================================================
// 17. PRESERVATION OF EXISTING DEMO DATA, DIGITAL TWIN & FORECAST VALUES
// ============================================================================
console.log('\n--- 17. Preservation of Existing DEMO Data, Digital Twin & Forecast Values ---');
{
  assert(
    EXECUTIVE_MONTHLY_METRICS.length === 6 &&
      EXECUTIVE_MONTHLY_METRICS[0].month === 'Apr' &&
      EXECUTIVE_MONTHLY_METRICS[5].month === 'Sep' &&
      EXECUTIVE_MONTHLY_METRICS[5].atcLossPct === 12.4,
    'EXECUTIVE_MONTHLY_METRICS dataset (6 months Apr–Sep, Sep AT&C Loss 12.4%) remains intact'
  );

  assert(
    FEEDER_METRICS.length === 4 &&
      FEEDER_METRICS[0].id === 'FDR-11-MSN-01' &&
      FEEDER_METRICS[0].peakLoadAmps === 184 &&
      FEEDER_METRICS[0].ratedCapacityAmps === 200 &&
      FEEDER_METRICS[2].id === 'FDR-11-KADI-04' &&
      FEEDER_METRICS[2].utilizationPct === 108.2,
    'FEEDER_METRICS dataset (4 feeders, capacities and peak loads) remains intact'
  );

  assert(
    SUBDIVISION_PERFORMANCE.length === 5 &&
      CONSUMPTION_HISTORY.length === 6 &&
      CONSUMPTION_HISTORY[5].month === 'Oct 2026 (Est)' &&
      CONSUMPTION_HISTORY[5].units === 340,
    'SUBDIVISION_PERFORMANCE and CONSUMPTION_HISTORY (including Oct 2026 Est = 340 kWh) remain intact'
  );

  const normalScenario = localizeDigitalTwinScenario('normal', 'en');
  const nodeSubstation = localizeEquipmentCatalogNode('substation', '66kV / 11kV', 'en');
  assert(
    normalScenario.title.includes('Normal') &&
      nodeSubstation.name.includes('Mehsana City North 66/11kV Substation'),
    'Digital Twin scenarios and equipment catalog nodes remain intact'
  );
}

console.log(`\n============================================================`);
console.log(`Phase 4 Step 4.4 Verification Summary: ${passed} passed, ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) {
  process.exit(1);
}
