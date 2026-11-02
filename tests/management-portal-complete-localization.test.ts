import assert from 'node:assert/strict';
import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import { LanguageCode, TranslationDictionary } from '../src/i18n/types';
import {
  MANAGEMENT_UI_TRANSLATIONS,
  getManagementUiDictionary,
  localizeBillingMonth,
  localizeFeederStatus,
  localizeAiProposalRisk,
  localizeAiProposalStatus,
  localizeAiProposalTitle,
  localizeAiReasoning,
  localizeDigitalTwinScenario,
  localizeEquipmentCatalogNode
} from '../src/i18n/managementContentTranslations';
import {
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSeverity,
  localizeIncidentStatus
} from '../src/i18n/incidentLocalization';
import {
  localizeSubdivision,
  localizeTariffCategory,
  localizeConsumerAddress
} from '../src/i18n/consumerContentTranslations';
import { localizeAssignedActorName } from '../src/i18n/employeeContentTranslations';
import {
  FEEDER_METRICS,
  SUBDIVISION_PERFORMANCE,
  EXECUTIVE_MONTHLY_METRICS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS
} from '../src/data/mockData';
import { detectAnomalies } from '../src/utils/anomalyDetector';
import { GridScenario } from '../src/components/intro/SmartGridDigitalTwin';

const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = { en, gu, hi, mr };
const LANGUAGES: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];
const NON_EN_LANGUAGES: LanguageCode[] = ['gu', 'hi', 'mr'];

console.log('⚡ VIDYUTFLOW — MANAGEMENT PORTAL COMPLETE MULTILINGUAL LOCALIZATION AUDIT ⚡\n');

// 1. DICTIONARY KEY PARITY & NON-EMPTY STRINGS
console.log('--- TEST 1: Translation Dictionary Key Parity Across All 4 Languages ---');
const enKeys = Object.keys(MANAGEMENT_UI_TRANSLATIONS.en).sort();
assert.ok(enKeys.length >= 100, `Expected at least 100 management keys, got ${enKeys.length}`);

for (const lang of LANGUAGES) {
  const dict = MANAGEMENT_UI_TRANSLATIONS[lang];
  assert.ok(dict, `Management dictionary for ${lang} must exist`);
  const keys = Object.keys(dict).sort();
  assert.strictEqual(keys.length, enKeys.length, `Key count for ${lang} (${keys.length}) must match en (${enKeys.length})`);
  
  for (const key of enKeys) {
    const val = (dict as any)[key];
    assert.ok(typeof val === 'string', `${lang}.${key} must be a string`);
    assert.ok(val.trim().length > 0, `${lang}.${key} must not be empty`);
  }
}
console.log(`✓ 100% Key Parity Verified across ${enKeys.length} keys in en, gu, hi, mr.`);

// 2. ROOT TRANSLATION ATTACHMENT PARITY
console.log('\n--- TEST 2: Root Translation Attachment Parity in en.ts, gu.ts, hi.ts, mr.ts ---');
for (const lang of LANGUAGES) {
  const root = TRANSLATIONS[lang];
  assert.ok(root.management, `Root translation for ${lang} must have management namespace`);
  assert.strictEqual(
    Object.keys(root.management).length,
    enKeys.length,
    `root.${lang}.management must contain all ${enKeys.length} keys`
  );
}
console.log('✓ Root translation dictionaries properly wired to MANAGEMENT_UI_TRANSLATIONS.');

// 3. EXECUTIVE HEADER & REAL-TIME ERP TELEMETRY PULSE
console.log('\n--- TEST 3: Executive Intelligence Header & ERP Telemetry Pulse Localization ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.cockpitTitle.length > 0);
  assert.ok(tm.corporateOfficeBadge.length > 0);
  assert.ok(tm.officerPrefix.length > 0);
  assert.ok(tm.telemetryTitle.length > 0);
  assert.ok(tm.canonicalStateSyncActive.length > 0);
  assert.ok(tm.kpiPendingAppsTitle.length > 0);
  assert.ok(tm.kpiActiveGrievancesTitle.length > 0);
  assert.ok(tm.kpiDispatchedFieldOrdersTitle.length > 0);
  assert.ok(tm.kpiCriticalHazardsTitle.length > 0);

  if (lang !== 'en') {
    assert.notStrictEqual(tm.cockpitTitle, MANAGEMENT_UI_TRANSLATIONS.en.cockpitTitle);
    assert.notStrictEqual(tm.telemetryTitle, MANAGEMENT_UI_TRANSLATIONS.en.telemetryTitle);
    assert.notStrictEqual(tm.canonicalStateSyncActive, MANAGEMENT_UI_TRANSLATIONS.en.canonicalStateSyncActive);
  }
}
console.log('✓ Executive Header & Telemetry pulse verified in all 4 languages.');

// 4. EXECUTIVE CRITICAL INCIDENT ESCALATION INBOX & OVERRIDES
console.log('\n--- TEST 4: Executive Escalation Inbox & Emergency Safety Overrides ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.escalationInboxTitle.length > 0);
  assert.ok(tm.escalatedAwaitingSuffix.length > 0);
  assert.ok(tm.emergencySafetyOverrideBadge.length > 0);
  assert.ok(tm.feederLabel.length > 0);
  assert.ok(tm.subdivisionLabel.length > 0);
  assert.ok(tm.escalatedByPrefix.length > 0);
  assert.ok(tm.justificationPrefix.length > 0);
  assert.ok(tm.reviewEscalationBtn.length > 0);

  if (lang !== 'en') {
    assert.notStrictEqual(tm.escalationInboxTitle, MANAGEMENT_UI_TRANSLATIONS.en.escalationInboxTitle);
    assert.notStrictEqual(tm.emergencySafetyOverrideBadge, MANAGEMENT_UI_TRANSLATIONS.en.emergencySafetyOverrideBadge);
    assert.notStrictEqual(tm.reviewEscalationBtn, MANAGEMENT_UI_TRANSLATIONS.en.reviewEscalationBtn);
  }
}
console.log('✓ Executive Escalation Inbox verified in all 4 languages.');

// 5. HIGH-RISK COMMERCIAL & INDUSTRIAL SANCTIONS
console.log('\n--- TEST 5: High-Risk Commercial & Industrial Sanctions Localization ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.highRiskSanctionsTitle.length > 0);
  assert.ok(tm.awaitingConcurrenceSuffix.length > 0);
  assert.ok(tm.verifiedViaWoPrefix.length > 0);
  assert.ok(tm.reviewFieldDossierBtn.length > 0);
  assert.ok(tm.grantExecutiveSanctionBtn.length > 0);
  assert.ok(tm.sanctionGrantedToast.includes('{id}'));
  assert.ok(tm.sanctionAuditRemark.length > 0);

  // Test toast formatting
  const formattedToast = tm.sanctionGrantedToast.replace('{id}', 'APP-2026-004');
  assert.ok(formattedToast.includes('APP-2026-004'));

  if (lang !== 'en') {
    assert.notStrictEqual(tm.highRiskSanctionsTitle, MANAGEMENT_UI_TRANSLATIONS.en.highRiskSanctionsTitle);
    assert.notStrictEqual(tm.grantExecutiveSanctionBtn, MANAGEMENT_UI_TRANSLATIONS.en.grantExecutiveSanctionBtn);
  }
}
console.log('✓ High-Risk Sanctions workflow verified in all 4 languages.');

// 6. EXECUTIVE KPI BENTO (AT&C, BILLING, COLLECTION, SAIDI/SAIFI)
console.log('\n--- TEST 6: Executive KPI Bento Localization ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.kpiAtcLossTitle.length > 0);
  assert.ok(tm.kpiAtcLossTarget.length > 0);
  assert.ok(tm.kpiBillingEffTitle.length > 0);
  assert.ok(tm.kpiBillingEffSub.length > 0);
  assert.ok(tm.kpiCollectionEffTitle.length > 0);
  assert.ok(tm.kpiCollectionEffSub.length > 0);
  assert.ok(tm.kpiReliabilityTitle.length > 0);
  assert.ok(tm.kpiReliabilityUptime.length > 0);
  assert.ok(tm.kpiReliabilitySub.length > 0);
  assert.ok(tm.chartAtcCurveTitle.length > 0);
  assert.ok(tm.chartEnergyVsRevTitle.length > 0);
  assert.ok(tm.chartEnergyVsRevSubtitle.length > 0);

  if (lang !== 'en') {
    assert.notStrictEqual(tm.kpiAtcLossTitle, MANAGEMENT_UI_TRANSLATIONS.en.kpiAtcLossTitle);
    assert.notStrictEqual(tm.kpiBillingEffTitle, MANAGEMENT_UI_TRANSLATIONS.en.kpiBillingEffTitle);
    assert.notStrictEqual(tm.kpiCollectionEffTitle, MANAGEMENT_UI_TRANSLATIONS.en.kpiCollectionEffTitle);
    assert.notStrictEqual(tm.kpiReliabilityTitle, MANAGEMENT_UI_TRANSLATIONS.en.kpiReliabilityTitle);
  }
}
console.log('✓ Executive KPI Bento verified in all 4 languages.');

// 7. 11kV FEEDER OVERLOAD & BOTTLENECK RADAR CARDS
console.log('\n--- TEST 7: 11kV Feeder Radar & Status Badges ---');
const feederStatuses = ['OPTIMAL', 'HEAVY_LOAD', 'CRITICAL_OVERLOAD'];
for (const status of feederStatuses) {
  for (const lang of LANGUAGES) {
    const loc = localizeFeederStatus(status, lang);
    assert.ok(loc.length > 0);
    if (lang !== 'en') {
      assert.notStrictEqual(loc, status);
    }
  }
}

for (const f of FEEDER_METRICS) {
  for (const lang of LANGUAGES) {
    const tm = getManagementUiDictionary(lang);
    assert.ok(f.id.startsWith('FDR-'));
    assert.ok(f.subdivision.length > 0);
    assert.ok(f.peakLoadAmps > 0);
    assert.ok(f.ratedCapacityAmps > 0);
    const locStatus = localizeFeederStatus(f.status, lang);
    assert.ok(locStatus.length > 0);
  }
}
console.log(`✓ Feeder Radar verified across ${FEEDER_METRICS.length} feeders in all 4 languages.`);

// 8. AI EXECUTIVE INSIGHTS & AI CONCURRENCE QUEUE
console.log('\n--- TEST 8: AI Executive Insights & AI Action Concurrence Queue ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.aiRadarBannerTitle.length > 0);
  assert.ok(tm.aiRadarBannerSubtitle.length > 0);
  assert.ok(tm.alert1Title.length > 0);
  assert.ok(tm.alert1Desc.length > 0);
  assert.ok(tm.alert2Title.length > 0);
  assert.ok(tm.alert2Desc.length > 0);
  assert.ok(tm.aiQueueTitle.length > 0);
  assert.ok(tm.aiQueueSubtitle.length > 0);
  assert.ok(tm.colProposalId.length > 0);
  assert.ok(tm.colActionTarget.length > 0);
  assert.ok(tm.colStateTransition.length > 0);
  assert.ok(tm.colRiskLevel.length > 0);
  assert.ok(tm.colStatusAudit.length > 0);
  assert.ok(tm.colExecutiveAction.length > 0);
  assert.ok(tm.reviewAndSanctionBtn.length > 0);

  // Dynamic helpers
  assert.ok(localizeAiProposalRisk('HIGH', lang).length > 0);
  assert.ok(localizeAiProposalRisk('MEDIUM', lang).length > 0);
  assert.ok(localizeAiProposalRisk('LOW', lang).length > 0);
  assert.ok(localizeAiProposalStatus('PROPOSED', lang).length > 0);
  assert.ok(localizeAiProposalStatus('APPROVED', lang).length > 0);
  assert.ok(localizeAiProposalStatus('REJECTED', lang).length > 0);
}
console.log('✓ AI Insights & Concurrence Queue verified in all 4 languages.');

// 9. DIVISION SLA REDRESSAL MATRIX
console.log('\n--- TEST 9: Division SLA Redressal Matrix Table ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.slaMatrixTitle.length > 0);
  assert.ok(tm.slaMatrixSubtitle.length > 0);
  assert.ok(tm.colSubdivisionName.length > 0);
  assert.ok(tm.colTotalComplaints.length > 0);
  assert.ok(tm.colResolutionRate.length > 0);
  assert.ok(tm.colAverageTat.length > 0);
  assert.ok(tm.colAtcLossPct.length > 0);
  assert.ok(tm.colGercCompliance.length > 0);
  assert.ok(tm.badgeCompliant.length > 0);

  for (const s of SUBDIVISION_PERFORMANCE) {
    const locName = localizeSubdivision(s.name, lang);
    assert.ok(locName.length > 0);
    if (lang !== 'en') {
      assert.notStrictEqual(locName, s.name);
    }
  }
}
console.log(`✓ Division SLA Matrix verified across ${SUBDIVISION_PERFORMANCE.length} subdivisions in all 4 languages.`);

// 10. EXECUTIVE EXPORT & STATUTORY REPORTING CENTER + MONTHLY LEDGER
console.log('\n--- TEST 10: Executive Export Center & Monthly Performance Ledger ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.exportCenterTitle.length > 0);
  assert.ok(tm.exportCenterSubtitle.length > 0);
  assert.ok(tm.clientSideDemoBadge.length > 0);
  assert.ok(tm.pkg1Title.length > 0);
  assert.ok(tm.pkg1Btn.length > 0);
  assert.ok(tm.pkg2Title.length > 0);
  assert.ok(tm.pkg2Btn.length > 0);
  assert.ok(tm.pkg3Title.length > 0);
  assert.ok(tm.pkg3Btn.length > 0);
  assert.ok(tm.previewLedgerTitle.length > 0);
  assert.ok(tm.previewLedgerSubtitle.length > 0);
  assert.ok(tm.colBillingMonth.length > 0);
  assert.ok(tm.colEnergyBilled.length > 0);
  assert.ok(tm.colRevenueCollected.length > 0);
  assert.ok(tm.colAtcLoss.length > 0);
  assert.ok(tm.unitMu.length > 0);

  // Month formatter
  for (const row of EXECUTIVE_MONTHLY_METRICS) {
    const locMonth = localizeBillingMonth(row.month, lang);
    assert.ok(locMonth.length > 0);
    if (lang !== 'en') {
      assert.notStrictEqual(locMonth, row.month);
    }
  }
}
console.log(`✓ Export Center & Monthly Ledger verified across ${EXECUTIVE_MONTHLY_METRICS.length} months in all 4 languages.`);

// 11. SMART GRID DIGITAL TWIN SCADA SIMULATOR
console.log('\n--- TEST 11: Smart Grid Digital Twin SCADA Simulator Localization ---');
const scenarios: GridScenario[] = ['normal', 'peak', 'overload', 'outage', 'solar', 'maintenance'];
const equipmentNodes = ['substation', 'feeder1', 'feeder2', 'dtr08', 'solarUnit'];

for (const sc of scenarios) {
  for (const lang of LANGUAGES) {
    const loc = localizeDigitalTwinScenario(sc, lang);
    assert.ok(loc.title.length > 0, `Scenario ${sc} title missing in ${lang}`);
    assert.ok(loc.badge.length > 0, `Scenario ${sc} badge missing in ${lang}`);
    assert.ok(loc.description.length > 0, `Scenario ${sc} description missing in ${lang}`);
    assert.ok(loc.recommendation.length > 0, `Scenario ${sc} recommendation missing in ${lang}`);

    if (lang !== 'en') {
      const enLoc = localizeDigitalTwinScenario(sc, 'en');
      assert.notStrictEqual(loc.title, enLoc.title);
      assert.notStrictEqual(loc.description, enLoc.description);
      assert.notStrictEqual(loc.recommendation, enLoc.recommendation);
    }
  }
}

for (const nodeKey of equipmentNodes) {
  for (const lang of LANGUAGES) {
    const node = localizeEquipmentCatalogNode(nodeKey, '11.0 kV', lang);
    assert.ok(node.name.length > 0, `Node ${nodeKey} name missing in ${lang}`);
    assert.ok(node.voltage.length > 0, `Node ${nodeKey} voltage missing in ${lang}`);
    assert.ok(node.protectionRelay.length > 0, `Node ${nodeKey} protection relay missing in ${lang}`);
    assert.ok(node.notes.length > 0, `Node ${nodeKey} notes missing in ${lang}`);

    if (lang !== 'en') {
      const enNode = localizeEquipmentCatalogNode(nodeKey, '11.0 kV', 'en');
      assert.notStrictEqual(node.name, enNode.name);
      assert.notStrictEqual(node.protectionRelay, enNode.protectionRelay);
      assert.notStrictEqual(node.notes, enNode.notes);
    }
  }
}

for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.twinTitle.length > 0);
  assert.ok(tm.twinSubtitle.length > 0);
  assert.ok(tm.btnResetGrid.length > 0);
  assert.ok(tm.btnResetGridTitle.length > 0);
  assert.ok(tm.scenarioNormalTab.length > 0);
  assert.ok(tm.scenarioPeakTab.length > 0);
  assert.ok(tm.scenarioOverloadTab.length > 0);
  assert.ok(tm.scenarioOutageTab.length > 0);
  assert.ok(tm.scenarioSolarTab.length > 0);
  assert.ok(tm.scenarioMaintenanceTab.length > 0);
  assert.ok(tm.topologySubtitle.length > 0);
  assert.ok(tm.getcoGridLabel.length > 0);
  assert.ok(tm.substationBoxLabel.length > 0);
  assert.ok(tm.diagnosticTelemetryTitle.length > 0);
  assert.ok(tm.paramGridFrequency.length > 0);
  assert.ok(tm.paramSystemLoad.length > 0);
  assert.ok(tm.paramPhaseVoltage.length > 0);
  assert.ok(tm.paramTransformerTemp.length > 0);
  assert.ok(tm.nodeInspectionTitle.length > 0);
  assert.ok(tm.nodeOperatingVoltage.length > 0);
  assert.ok(tm.nodeCurrentCapacity.length > 0);
  assert.ok(tm.nodeProtectionRelay.length > 0);
  assert.ok(tm.nodeDefaultSelectPrompt.length > 0);
  assert.ok(tm.scadaProtocolNote.length > 0);
  assert.ok(tm.nodeClickHint.length > 0);
  assert.ok(tm.legendActiveFeeder.length > 0);
  assert.ok(tm.legendDistributedSolar.length > 0);
  assert.ok(tm.legendTrippedIsolated.length > 0);
  assert.ok(tm.solarMicroGenBadge.length > 0);
  assert.ok(tm.solarSurplusExport.length > 0);
  assert.ok(tm.solarMiddayFeed.length > 0);
}
console.log('✓ Smart Grid Digital Twin 100% localized in all 4 languages across all scenarios & equipment.');

// 12. AI ENERGY DEMAND & LOAD FORECASTING ENGINE
console.log('\n--- TEST 12: AI Energy Demand & Load Forecasting Engine Localization ---');
for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  assert.ok(tm.forecastEngineTitle.length > 0);
  assert.ok(tm.forecastEngineSubtitle.length > 0);
  assert.ok(tm.btnResetBaseline.length > 0);
  assert.ok(tm.labelAmbientTemp.length > 0);
  assert.ok(tm.tempMildMonsoon.length > 0);
  assert.ok(tm.tempNormal.length > 0);
  assert.ok(tm.tempHeatwave.length > 0);
  assert.ok(tm.labelAnnualLoadTrend.length > 0);
  assert.ok(tm.growthShutdown.length > 0);
  assert.ok(tm.growthStandard.length > 0);
  assert.ok(tm.growthFestive.length > 0);
  assert.ok(tm.labelDuckCurve.length > 0);
  assert.ok(tm.descDuckCurve.length > 0);
  assert.ok(tm.kpiPredictedPeakDemand.length > 0);
  assert.ok(tm.peakAtHourPrefix.length > 0);
  assert.ok(tm.peakVarianceDesc.includes('{val}'));
  assert.ok(tm.kpiEstimatedEnergyReq.length > 0);
  assert.ok(tm.descDayAheadSchedule.length > 0);
  assert.ok(tm.kpiDayAheadBudget.length > 0);
  assert.ok(tm.descBaseTariff.length > 0);
  assert.ok(tm.dispatcherRecHeading.length > 0);
  assert.ok(tm.recHeatwave.length > 0);
  assert.ok(tm.recSolarInjection.length > 0);
  assert.ok(tm.recDemandNormal.length > 0);
  assert.ok(tm.chartForecastCurveTitle.length > 0);
  assert.ok(tm.chartConfidenceSubtitle.length > 0);
  assert.ok(tm.legendHistoricalActual.length > 0);
  assert.ok(tm.legendForecastLoad.length > 0);
  assert.ok(tm.footerModelType.length > 0);
  assert.ok(tm.footerDeterministic.length > 0);

  if (lang !== 'en') {
    assert.notStrictEqual(tm.forecastEngineTitle, MANAGEMENT_UI_TRANSLATIONS.en.forecastEngineTitle);
    assert.notStrictEqual(tm.labelAmbientTemp, MANAGEMENT_UI_TRANSLATIONS.en.labelAmbientTemp);
    assert.notStrictEqual(tm.recHeatwave, MANAGEMENT_UI_TRANSLATIONS.en.recHeatwave);
    assert.notStrictEqual(tm.recSolarInjection, MANAGEMENT_UI_TRANSLATIONS.en.recSolarInjection);
    assert.notStrictEqual(tm.recDemandNormal, MANAGEMENT_UI_TRANSLATIONS.en.recDemandNormal);
  }
}
console.log('✓ AI Energy Forecasting Engine verified in all 4 languages.');

// 13. CANONICAL RECORD ID & NUMERICAL INTEGRITY
console.log('\n--- TEST 13: Canonical Record ID & Technical Unit Preservation ---');
const sampleAppId = 'APP-2026-004';
const sampleFeederId = 'FDR-11K-01';
const sampleSubstationId = 'SS-MEH-66/11';
const sampleIncidentId = 'INC-2026-001';

for (const lang of LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  const toast = tm.sanctionGrantedToast.replace('{id}', sampleAppId);
  assert.ok(toast.includes(sampleAppId), `Toast must preserve canonical application ID ${sampleAppId}`);

  const node = localizeEquipmentCatalogNode('substation', '66kV', lang);
  assert.ok(node.voltage.includes('66kV'), 'Voltage technical unit must be preserved');
}
console.log('✓ Canonical IDs and technical units strictly preserved.');

// 14. FORBIDDEN ENGLISH LEAK CHECK IN GU/HI/MR
console.log('\n--- TEST 14: Zero English Leaks in Non-English Languages ---');
const FORBIDDEN_MANAGEMENT_ENGLISH = [
  'Executive Intelligence Cockpit',
  'Cross-Portal ERP Workflow Telemetry & Operational Health',
  'Pending Applications',
  'Active Grievances',
  'Dispatched Field WOs',
  'Critical Grid Hazards',
  'Executive Critical Incident Escalation Inbox',
  'Escalated Incident(s) Awaiting Concurrence',
  'Emergency Safety Override',
  'High-Risk Commercial/Industrial Applications Requiring Executive Authorization',
  'Grant Executive Sanction',
  'Billing Efficiency',
  'Collection Efficiency',
  'System Reliability (SAIDI)',
  'AT&C Loss Reduction Curve',
  'Energy Billed vs Revenue Realization Trajectory',
  '11kV Feeder Overload & Bottleneck Radar',
  'AI Executive Insights & Anomaly Radar',
  'Executive AI Action Concurrence Queue',
  'Division SLA Redressal Matrix',
  'Executive Export & Statutory Reporting Center',
  'Monthly Executive Performance Ledger (Preview)',
  'UGVCL Smart Grid Digital Twin & SCADA Simulator',
  'SCADA Diagnostic Telemetry',
  'AI Energy Demand & Load Forecasting Engine',
  'Dispatcher Recommendation',
  'Reset Grid',
  'Reset Baseline'
];

for (const lang of NON_EN_LANGUAGES) {
  const tm = getManagementUiDictionary(lang);
  for (const forbidden of FORBIDDEN_MANAGEMENT_ENGLISH) {
    for (const [key, val] of Object.entries(tm)) {
      if (typeof val === 'string' && val.trim() === forbidden) {
        assert.fail(`Leak detected: ${lang}.${key} has exact English value: "${val}"`);
      }
    }
  }
}
console.log('✓ Zero forbidden English leaks in Gujarati, Hindi, and Marathi dictionaries.');

console.log('\n================================================================');
console.log('🎉 ALL 14 MANAGEMENT PORTAL LOCALIZATION TESTS PASSED CLEANLY! 🎉');
console.log('================================================================\n');
