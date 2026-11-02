import { Language } from './types';

export interface ManagementUiDictionary {
  // Top Header & Cockpit Header
  cockpitTitle: string;
  corporateOfficeBadge: string;
  officerPrefix: string;
  optQ2: string;
  optYtd: string;
  exportReportBtn: string;
  flashReportToast: string;

  // Cross-Portal ERP Workflow Operations Pulse
  telemetryTitle: string;
  canonicalStateSyncActive: string;
  kpiPendingAppsTitle: string;
  kpiPendingAppsSub: string;
  kpiActiveGrievancesTitle: string;
  kpiActiveGrievancesSub: string;
  kpiDispatchedFieldOrdersTitle: string;
  kpiDispatchedFieldOrdersSub: string;
  kpiCriticalHazardsTitle: string;
  kpiCriticalHazardsSub: string;

  // Executive Escalation Inbox
  escalationInboxTitle: string;
  escalatedAwaitingSuffix: string;
  emergencySafetyOverrideBadge: string;
  feederLabel: string;
  subdivisionLabel: string;
  escalatedByPrefix: string;
  justificationPrefix: string;
  reviewEscalationBtn: string;
  fallbackGridLine: string;
  fallbackDivisionOffice: string;

  // High-Risk Commercial/Industrial Applications
  highRiskSanctionsTitle: string;
  awaitingConcurrenceSuffix: string;
  verifiedViaWoPrefix: string;
  reviewFieldDossierBtn: string;
  grantExecutiveSanctionBtn: string;
  sanctionGrantedToast: string;
  sanctionAuditRemark: string;
  addressLabel: string;
  subdivisionShortLabel: string;

  // Executive KPI Bento (Dashboard)
  kpiAtcLossTitle: string;
  kpiAtcLossTarget: string;
  kpiBillingEffTitle: string;
  kpiBillingEffSub: string;
  kpiCollectionEffTitle: string;
  kpiCollectionEffVal: string;
  kpiCollectionEffSub: string;
  kpiReliabilityTitle: string;
  kpiReliabilityUptime: string;
  kpiReliabilitySub: string;
  yoyReductionSuffix: string;
  trendUpSuffix: string;

  // Charts in Dashboard
  chartAtcCurveTitle: string;
  chartAtcCurveSubtitle: string;
  chartAtcLegend: string;
  chartEnergyVsRevTitle: string;
  chartEnergyVsRevSubtitle: string;
  chartLegendBilledMus: string;
  chartLegendRevenueCr: string;

  // Feeder Bottlenecks Radar
  feederRadarTitle: string;
  feederRadarSubtitle: string;
  capacityUtilizationLabel: string;
  colPeakLoad: string;
  colTransformers: string;
  colConsumers: string;
  feederStatusCritical: string;
  feederStatusWarning: string;
  feederStatusOptimal: string;
  unitDts: string;

  // AI Executive Insights
  aiRadarBannerTitle: string;
  aiRadarBannerSubtitle: string;
  alert1Badge: string;
  alert1Title: string;
  alert1Desc: string;
  askCopilotBtn: string;
  alert2Badge: string;
  alert2Title: string;
  alert2Desc: string;
  dispatchAuditBtn: string;
  dispatchVigilanceToast: string;
  alert3Badge: string;
  alert3Title: string;
  alert3Desc: string;
  alert3Policy: string;

  // Executive AI Action Concurrence Queue
  aiQueueTitle: string;
  aiQueueSubtitle: string;
  pendingConcurrenceBadge: string;
  colProposalId: string;
  colActionTarget: string;
  colStateTransition: string;
  colRiskLevel: string;
  colStatusAudit: string;
  colExecutiveAction: string;
  reviewAndSanctionBtn: string;
  viewAuditRecordBtn: string;
  reviewedByPrefix: string;

  // Division SLA Redressal Matrix
  slaMatrixTitle: string;
  slaMatrixSubtitle: string;
  colSubdivisionName: string;
  colTotalComplaints: string;
  colResolutionRate: string;
  colAverageTat: string;
  colAtcLossPct: string;
  colGercCompliance: string;
  badgeCompliant: string;
  hoursSuffix: string;

  // Executive Export & Statutory Reporting Center
  exportCenterTitle: string;
  exportCenterSubtitle: string;
  clientSideDemoBadge: string;
  pkg1Category: string;
  pkg1Format: string;
  pkg1Title: string;
  pkg1Desc: string;
  pkg1Btn: string;
  pkg1Toast: string;
  pkg2Category: string;
  pkg2Format: string;
  pkg2Title: string;
  pkg2Desc: string;
  pkg2Btn: string;
  pkg2Toast: string;
  pkg3Category: string;
  pkg3Format: string;
  pkg3Title: string;
  pkg3Desc: string;
  pkg3Btn: string;
  pkg3Toast: string;

  // Monthly Executive Performance Ledger Preview Table
  previewLedgerTitle: string;
  previewLedgerSubtitle: string;
  colBillingMonth: string;
  colEnergyBilled: string;
  colRevenueCollected: string;
  colAtcLoss: string;
  unitMu: string;

  // Digital Twin SCADA Simulator
  twinTitle: string;
  twinSubtitle: string;
  btnResetGrid: string;
  btnResetGridTitle: string;
  scenarioNormalTab: string;
  scenarioPeakTab: string;
  scenarioOverloadTab: string;
  scenarioOutageTab: string;
  scenarioSolarTab: string;
  scenarioMaintenanceTab: string;
  scenarioPrefix: string;
  automatedResponseLabel: string;
  topologySubtitle: string;
  getcoGridLabel: string;
  substationBoxLabel: string;
  substationBusbarLabel: string;
  diagnosticTelemetryTitle: string;
  diagnosticTelemetrySubtitle: string;
  rtuSyncBadge: string;
  paramGridFrequency: string;
  paramIegcBand: string;
  paramSystemLoad: string;
  paramMaxPeak: string;
  paramPhaseVoltage: string;
  paramStandardVoltage: string;
  paramTransformerTemp: string;
  paramTripThreshold: string;
  nodeInspectionTitle: string;
  nodeOperatingVoltage: string;
  nodeCurrentCapacity: string;
  nodeProtectionRelay: string;
  nodeDefaultSelectPrompt: string;
  scadaProtocolNote: string;
  nodeClickHint: string;
  legendActiveFeeder: string;
  legendDistributedSolar: string;
  legendTrippedIsolated: string;
  solarMicroGenBadge: string;
  solarSurplusExport: string;
  solarMiddayFeed: string;

  // AI Energy Demand & Load Forecasting Engine
  forecastEngineTitle: string;
  forecastEngineSubtitle: string;
  btnResetBaseline: string;
  labelAmbientTemp: string;
  tempMildMonsoon: string;
  tempNormal: string;
  tempHeatwave: string;
  labelAnnualLoadTrend: string;
  growthShutdown: string;
  growthStandard: string;
  growthFestive: string;
  labelDuckCurve: string;
  descDuckCurve: string;
  kpiPredictedPeakDemand: string;
  peakAtHourPrefix: string;
  peakVarianceDesc: string;
  kpiEstimatedEnergyReq: string;
  descDayAheadSchedule: string;
  kpiDayAheadBudget: string;
  descBaseTariff: string;
  dispatcherRecHeading: string;
  recHeatwave: string;
  recSolarInjection: string;
  recDemandNormal: string;
  chartForecastCurveTitle: string;
  chartConfidenceSubtitle: string;
  legendHistoricalActual: string;
  legendForecastLoad: string;
  footerModelType: string;
  footerDeterministic: string;
}

export const MANAGEMENT_UI_TRANSLATIONS: Record<Language, ManagementUiDictionary> = {
  en: {
    cockpitTitle: 'Executive Intelligence Cockpit',
    corporateOfficeBadge: 'Corporate Office Mehsana',
    officerPrefix: 'UGVCL Corporate · Officer:',
    optQ2: 'Q2 FY2026 (Jul - Sep)',
    optYtd: 'FY2026 Year-to-Date',
    exportReportBtn: 'Export Report',
    flashReportToast: 'Generated Executive Flash Report (PDF)',

    telemetryTitle: 'Cross-Portal ERP Workflow Telemetry & Operational Health',
    canonicalStateSyncActive: 'Canonical State Sync: Active',
    kpiPendingAppsTitle: 'Pending Applications',
    kpiPendingAppsSub: 'Consumer → Employee Sync',
    kpiActiveGrievancesTitle: 'Active Grievances',
    kpiActiveGrievancesSub: 'Auto SLA Escrow Active',
    kpiDispatchedFieldOrdersTitle: 'Dispatched Field WOs',
    kpiDispatchedFieldOrdersSub: 'Lineman Sync Verified',
    kpiCriticalHazardsTitle: 'Critical Grid Hazards',
    kpiCriticalHazardsSub: 'Phase 2 Audio Alert Linked',

    escalationInboxTitle: 'Executive Critical Incident Escalation Inbox',
    escalatedAwaitingSuffix: 'Escalated Incident(s) Awaiting Concurrence',
    emergencySafetyOverrideBadge: 'Emergency Safety Override',
    feederLabel: 'Feeder:',
    subdivisionLabel: 'Subdivision:',
    escalatedByPrefix: 'Escalated by:',
    justificationPrefix: 'Justification:',
    reviewEscalationBtn: 'Review Escalation',
    fallbackGridLine: 'Grid Line',
    fallbackDivisionOffice: 'Division Office',

    highRiskSanctionsTitle: 'High-Risk Commercial/Industrial Applications Requiring Executive Authorization',
    awaitingConcurrenceSuffix: 'Awaiting Concurrence',
    verifiedViaWoPrefix: 'Verified via WO:',
    reviewFieldDossierBtn: 'Review Field Dossier',
    grantExecutiveSanctionBtn: 'Grant Executive Sanction',
    sanctionGrantedToast: 'Executive Sanction Concurrence granted for {id}! New connection activated.',
    sanctionAuditRemark: 'Executive sanction concurrence granted by Management Office.',
    addressLabel: 'Address:',
    subdivisionShortLabel: 'Sub-division:',

    kpiAtcLossTitle: 'AT&C Loss Rate',
    kpiAtcLossTarget: 'Target: 11.8% (Mehsana Circle leading at 11.8%)',
    kpiBillingEffTitle: 'Billing Efficiency',
    kpiBillingEffSub: '161.9 MUs billed of 182.7 MUs input',
    kpiCollectionEffTitle: 'Collection Efficiency',
    kpiCollectionEffVal: '₹79.6 Cr collected',
    kpiCollectionEffSub: 'Digital payments: 71.2% via Bharat BillPay',
    kpiReliabilityTitle: 'System Reliability (SAIDI)',
    kpiReliabilityUptime: '99.96% Uptime',
    kpiReliabilitySub: 'SAIFI: 0.24 interruptions/consumer/mo',
    yoyReductionSuffix: '-1.4% YoY',
    trendUpSuffix: '+0.9%',

    chartAtcCurveTitle: 'AT&C Loss Reduction Curve (%)',
    chartAtcCurveSubtitle: 'Aggregated Technical & Commercial Losses (FY2026 Monthly Trend)',
    chartAtcLegend: 'AT&C Loss %',
    chartEnergyVsRevTitle: 'Energy Billed vs Revenue Collections',
    chartEnergyVsRevSubtitle: 'Billed Mega-Units (MUs) vs Net Inflow (₹ Crores)',
    chartLegendBilledMus: 'Billed MUs',
    chartLegendRevenueCr: 'Revenue (₹ Cr)',

    feederRadarTitle: '11kV Distribution Feeder Overload & Bottleneck Radar',
    feederRadarSubtitle: 'SCADA telemetry monitoring peak amps against rated conductor capacity',
    capacityUtilizationLabel: 'Capacity Utilization',
    colPeakLoad: 'Peak Load',
    colTransformers: 'Transformers',
    colConsumers: 'Consumers',
    feederStatusCritical: 'Critical Overload',
    feederStatusWarning: 'Warning',
    feederStatusOptimal: 'Optimal',
    unitDts: 'DTs',

    aiRadarBannerTitle: 'VidyutOne Smart Utility Insights & Anomaly Radar',
    aiRadarBannerSubtitle: 'Machine-learning algorithms scan smart meter interval data, transformer heatmaps, and billing variance to predict infrastructure stress before customer outages occur.',
    alert1Badge: 'Transformer Thermal Overload Alert',
    alert1Title: 'DT-KADI-19 at 108% Headroom',
    alert1Desc: 'Agricultural pump synchronization causes 40°C temperature rise between 14:00 - 18:00. Risk of winding insulation breakdown in 14 days without phase balancing.',
    askCopilotBtn: 'Ask Vidyut Mitra AI Co-Pilot',
    alert2Badge: 'Commercial Revenue Leak Detection',
    alert2Title: 'GIDC Phase II Consumption Anomaly',
    alert2Desc: 'Smart meter clustering detected 3 units with uncharacteristic power factor dip (0.72) indicating potential meter bypass or heavy reactive load non-compliance.',
    dispatchAuditBtn: 'Dispatch Vigilance Audit →',
    dispatchVigilanceToast: 'Dispatched Vigilance Squad inspection notice (Demo)',
    alert3Badge: 'Solar Rooftop Net-Metering Forecast',
    alert3Title: '+4.2 MW Solar Addition by Nov 2026',
    alert3Desc: 'Rapid adoption in Mehsana residential sector will offset midday peak grid load by 12.8%, lowering day-ahead spot market purchase costs.',
    alert3Policy: 'Policy Incentive: ₹2.25/kWh feed-in tariff',

    aiQueueTitle: 'Executive AI Action Concurrence Queue (High-Risk Sanctions & Grid Escalations)',
    aiQueueSubtitle: 'Actions proposed by Vidyut-AI requiring Management authority (≥10 kW commercial/industrial load sanctions & emergency dispatches).',
    pendingConcurrenceBadge: 'Pending Executive Concurrence',
    colProposalId: 'Proposal ID',
    colActionTarget: 'Action & Target Entity',
    colStateTransition: 'State Transition',
    colRiskLevel: 'Risk Level',
    colStatusAudit: 'Status & Audit',
    colExecutiveAction: 'Executive Action',
    reviewAndSanctionBtn: 'Review & Sanction',
    viewAuditRecordBtn: 'View Audit Record',
    reviewedByPrefix: 'by',

    slaMatrixTitle: 'Division SLA Redressal Matrix',
    slaMatrixSubtitle: 'Regulatory compliance against Gujarat Electricity Regulatory Commission (GERC) standards',
    colSubdivisionName: 'Sub-Division Name',
    colTotalComplaints: 'Total Complaints',
    colResolutionRate: 'Resolution Rate (%)',
    colAverageTat: 'Average TAT (Hours)',
    colAtcLossPct: 'AT&C Loss %',
    colGercCompliance: 'GERC Compliance',
    badgeCompliant: 'Compliant',
    hoursSuffix: 'h',

    exportCenterTitle: 'Executive Export & Statutory Reporting Center',
    exportCenterSubtitle: 'Consolidated AT&C loss statements, revenue reconciliation, and GERC regulatory filings',
    clientSideDemoBadge: 'Client-Side Demo Exports',
    pkg1Category: 'Financial & Energy Audit',
    pkg1Format: 'CSV / PDF',
    pkg1Title: 'Monthly Energy Input, Billing & AT&C Loss Statement',
    pkg1Desc: '6-month trajectory ({from} – {to}) covering MU input, billing efficiency, and revenue realization.',
    pkg1Btn: 'Export Monthly Statement (Demo)',
    pkg1Toast: 'Prepared Monthly AT&C Loss & Revenue Statement ({period}) for download (Demo)',
    pkg2Category: 'Regulatory Compliance',
    pkg2Format: 'GERC Standard',
    pkg2Title: 'Sub-Division SLA & Grievance Redressal Dossier',
    pkg2Desc: 'Covers {count} operational subdivisions with complaint resolution rates, average TAT hours, and compliance flags.',
    pkg2Btn: 'Export SLA Compliance Matrix (Demo)',
    pkg2Toast: 'Prepared Sub-Division GERC SLA Compliance Dossier (Demo)',
    pkg3Category: 'Grid Infrastructure',
    pkg3Format: 'SCADA Summary',
    pkg3Title: '11kV Feeder Peak Load & Transformer Utilization Report',
    pkg3Desc: 'Snapshot of {count} monitored feeders including {highCount} high-load/overload corridors and connected consumer counts.',
    pkg3Btn: 'Export Feeder Load Audit (Demo)',
    pkg3Toast: 'Prepared 11kV Feeder Load & Bottleneck Audit Report (Demo)',

    previewLedgerTitle: 'Monthly Executive Performance Ledger (Preview)',
    previewLedgerSubtitle: 'Source dataset for executive board packs and quarterly discom filings',
    colBillingMonth: 'Billing Month',
    colEnergyBilled: 'Energy Billed (MU)',
    colRevenueCollected: 'Revenue Collected (₹ Cr)',
    colAtcLoss: 'AT&C Loss %',
    unitMu: 'MU',

    twinTitle: 'UGVCL Smart Grid Digital Twin & SCADA Simulator',
    twinSubtitle: 'Interactive 66kV/11kV/415V distribution network. Select operational scenarios to evaluate real-time grid behavior, voltage stability, and automated protection protocols.',
    btnResetGrid: 'Reset Grid',
    btnResetGridTitle: 'Reset to normal baseline operation',
    scenarioNormalTab: '1. Normal Balance',
    scenarioPeakTab: '2. Peak Surge',
    scenarioOverloadTab: '3. Transformer Overload',
    scenarioOutageTab: '4. Feeder Trip Outage',
    scenarioSolarTab: '5. Solar Reverse Flow',
    scenarioMaintenanceTab: '6. Maintenance PTW',
    scenarioPrefix: 'Scenario:',
    automatedResponseLabel: 'Automated Response',
    topologySubtitle: 'Live Single-Line Electrical Topology (Click equipment to inspect)',
    getcoGridLabel: '66kV Grid (GETCO)',
    substationBoxLabel: 'Mehsana North SS',
    substationBusbarLabel: '11kV Substation Busbar (248A)',
    diagnosticTelemetryTitle: 'SCADA Diagnostic Telemetry',
    diagnosticTelemetrySubtitle: 'Real-time simulated telemetry feeds',
    rtuSyncBadge: 'RTU-14 Sync',
    paramGridFrequency: 'Grid Frequency',
    paramIegcBand: 'IEGC Band: 49.90 - 50.05',
    paramSystemLoad: 'System Load',
    paramMaxPeak: 'Max Peak: 72.0 MW',
    paramPhaseVoltage: 'Phase Voltage (LT)',
    paramStandardVoltage: 'Standard: 230V ± 6%',
    paramTransformerTemp: 'Transformer Temp',
    paramTripThreshold: 'Trip Threshold: 95°C',
    nodeInspectionTitle: 'Equipment Inspection',
    nodeOperatingVoltage: 'Operating Voltage:',
    nodeCurrentCapacity: 'Current / Capacity:',
    nodeProtectionRelay: 'Protection Relay:',
    nodeDefaultSelectPrompt: 'Select any substation transformer, 11kV feeder branch, or distribution node in the diagram to inspect relay protections, rated conductor amperages, and real-time load headroom.',
    scadaProtocolNote: 'IEC 61850 substation automation standard & DNP3 telemetry simulation.',
    nodeClickHint: 'Click any substation, feeder, or transformer node for technical diagnostic inspection',
    legendActiveFeeder: '11kV Active Feeder',
    legendDistributedSolar: 'Distributed Solar',
    legendTrippedIsolated: 'Tripped / Isolated',
    solarMicroGenBadge: 'Solar Micro-Gen (150kWp)',
    solarSurplusExport: 'Surplus Export: +180A',
    solarMiddayFeed: 'Midday Feed: 65A',

    forecastEngineTitle: 'AI Energy Demand & Load Forecasting Engine',
    forecastEngineSubtitle: 'Machine-learning load projection for Day-Ahead Power Scheduling (DAPS). Adjust ambient meteorological conditions and industrial load growth to view real-time grid curve recalculation.',
    btnResetBaseline: 'Reset Baseline',
    labelAmbientTemp: 'Ambient Temperature',
    tempMildMonsoon: '24°C (Mild Monsoon)',
    tempNormal: '36°C (Normal)',
    tempHeatwave: '45°C (Heatwave)',
    labelAnnualLoadTrend: 'Annual Load Trend Factor',
    growthShutdown: '-10% (Industrial Shutdown)',
    growthStandard: '+6% (Standard)',
    growthFestive: '+25% (Peak Festive)',
    labelDuckCurve: 'Rooftop Solar Offset (Duck Curve)',
    descDuckCurve: 'Simulates 7.4 MW midday solar shaving',
    kpiPredictedPeakDemand: 'Predicted 24h Peak Demand',
    peakAtHourPrefix: 'at',
    peakVarianceDesc: 'Baseline was 68.2 MW (+{val} MW variance)',
    kpiEstimatedEnergyReq: 'Estimated Energy Requirement',
    descDayAheadSchedule: 'Day-Ahead Procurement Schedule',
    kpiDayAheadBudget: 'Day-Ahead Power Purchase Budget',
    descBaseTariff: 'Calculated at ₹5.42/kWh base tariff',
    dispatcherRecHeading: 'Dispatcher Recommendation',
    recHeatwave: 'Severe heatwave alert. Pre-book 15 MW day-ahead reserve from Sardar Sarovar hydro peaking station for 20:00 - 23:00 window.',
    recSolarInjection: 'Midday solar injection shaves 7.4 MW off substation peak. Ramp thermal units down by 11% between 11:00 - 15:00 to avoid curtailment.',
    recDemandNormal: 'Demand profile normal. Contracted GUVNL base thermal PPA satisfies 94% of scheduled draw without spot market exposure.',
    chartForecastCurveTitle: 'Next 24-Hour Load Curve: Historical Actual vs AI Forecast',
    chartConfidenceSubtitle: 'Shaded envelope displays 95% statistical confidence interval (±4.5%)',
    legendHistoricalActual: 'Historical Actual',
    legendForecastLoad: 'AI Forecast (MW)',
    footerModelType: 'Gradient Boosted Regression Tree (GBRT) + Temperature Decomposition',
    footerDeterministic: 'Deterministic simulation for operational evaluation'
  },
  gu: {
    cockpitTitle: 'કાર્યપાલક ઇન્ટેલિજન્સ કોકપિટ',
    corporateOfficeBadge: 'કોર્પોરેટ કચેરી મહેસાણા',
    officerPrefix: 'UGVCL કોર્પોરેટ · અધિકારી:',
    optQ2: 'Q2 નાણાકીય વર્ષ ૨૦૨૬ (જુલાઈ - સપ્ટેમ્બર)',
    optYtd: 'નાણાકીય વર્ષ ૨૦૨૬ વાર્ષિક આજ સુધી',
    exportReportBtn: 'અહેવાલ નિકાસ કરો',
    flashReportToast: 'કાર્યપાલક ફ્લેશ અહેવાલ તૈયાર કરાયો (PDF)',

    telemetryTitle: 'ક્રોસ-પોર્ટલ ERP વર્કફ્લો ટેલિમેટ્રી અને ઓપરેશનલ સ્થિતિ',
    canonicalStateSyncActive: 'મુખ્ય સ્થિતિ સિંક: સક્રિય',
    kpiPendingAppsTitle: 'બાકી રહેલી અરજીઓ',
    kpiPendingAppsSub: 'ગ્રાહક → કર્મચારી સિંક',
    kpiActiveGrievancesTitle: 'સક્રિય ફરિયાદો',
    kpiActiveGrievancesSub: 'સ્વચાલિત SLA એસ્ક્રો સક્રિય',
    kpiDispatchedFieldOrdersTitle: 'રવાના કરેલા ફિલ્ડ વર્ક ઓર્ડર',
    kpiDispatchedFieldOrdersSub: 'લાઇનમેન સિંક ચકાસાયેલ',
    kpiCriticalHazardsTitle: 'ગંભીર ગ્રીડ જોખમો',
    kpiCriticalHazardsSub: 'તબક્કો ૨ ઑડિઓ ચેતવણી સંલગ્ન',

    escalationInboxTitle: 'કાર્યપાલક ગંભીર ઘટના એસ્કેલેશન ઇનબૉક્સ',
    escalatedAwaitingSuffix: 'સંમતિની રાહ જોતી એસ્કેલેટ કરેલી ઘટના(ઓ)',
    emergencySafetyOverrideBadge: 'કટોકટી સલામતી ઓવરરાઇડ',
    feederLabel: 'ફીડર:',
    subdivisionLabel: 'પેટા-વિભાગ:',
    escalatedByPrefix: 'એસ્કેલેટ કરનાર:',
    justificationPrefix: 'વાજબીપણું:',
    reviewEscalationBtn: 'એસ્કેલેશન સમીક્ષા કરો',
    fallbackGridLine: 'ગ્રીડ લાઇન',
    fallbackDivisionOffice: 'વિભાગીય કચેરી',

    highRiskSanctionsTitle: 'કાર્યપાલક અધિકૃતતા જરૂરી હોય તેવી ઉચ્ચ જોખમી વ્યાપારી/ઔદ્યોગિક અરજીઓ',
    awaitingConcurrenceSuffix: 'સંમતિની રાહમાં',
    verifiedViaWoPrefix: 'વર્ક ઓર્ડર દ્વારા ચકાસાયેલ:',
    reviewFieldDossierBtn: 'ફિલ્ડ ડોઝિયરની સમીક્ષા કરો',
    grantExecutiveSanctionBtn: 'કાર્યપાલક મંજૂરી આપો',
    sanctionGrantedToast: '{id} માટે કાર્યપાલક મંજૂરી સંમતિ અપાઈ! નવું જોડાણ સક્રિય થયું.',
    sanctionAuditRemark: 'મેનેજમેન્ટ કચેરી દ્વારા કાર્યપાલક મંજૂરી સંમતિ આપવામાં આવી.',
    addressLabel: 'સરનામું:',
    subdivisionShortLabel: 'પેટા-વિભાગ:',

    kpiAtcLossTitle: 'AT&C ખોટ દર',
    kpiAtcLossTarget: 'લક્ષ્ય: ૧૧.૮% (મહેસાણા સર્કલ ૧૧.૮% સાથે મોખરે)',
    kpiBillingEffTitle: 'બિલિંગ કાર્યક્ષમતા',
    kpiBillingEffSub: '૧૮૨.૭ MUs ઇનપુટમાંથી ૧૬૧.૯ MUs બિલ થયા',
    kpiCollectionEffTitle: 'વસૂલાત કાર્યક્ષમતા',
    kpiCollectionEffVal: '₹૭૯.૬ કરોડ એકત્રિત',
    kpiCollectionEffSub: 'ડિજિટલ ચુકવણી: ભારત બિલપે દ્વારા ૭૧.૨%',
    kpiReliabilityTitle: 'સિસ્ટમ વિશ્વસનીયતા (SAIDI)',
    kpiReliabilityUptime: '૯૯.૯૬% અપટાઇમ',
    kpiReliabilitySub: 'SAIFI: ૦.૨૪ વિક્ષેપો/ગ્રાહક/મહિનો',
    yoyReductionSuffix: '-૧.૪% વાર્ષિક ઘટાડો',
    trendUpSuffix: '+૦.૯%',

    chartAtcCurveTitle: 'AT&C ખોટ ઘટાડા વળાંક (%)',
    chartAtcCurveSubtitle: 'એકંદર તકનીકી અને વાણિજ્યિક નુકસાન (નાણાકીય વર્ષ ૨૦૨૬ માસિક વલણ)',
    chartAtcLegend: 'AT&C ખોટ %',
    chartEnergyVsRevTitle: 'બિલ થયેલ ઊર્જા વિરુદ્ધ મહેસૂલ વસૂલાત',
    chartEnergyVsRevSubtitle: 'બિલ થયેલ મેગા-યુનિટ્સ (MUs) વિરુદ્ધ ચોખ્ખી આવક (₹ કરોડ)',
    chartLegendBilledMus: 'બિલ થયેલ MUs',
    chartLegendRevenueCr: 'મહેસૂલ (₹ કરોડ)',

    feederRadarTitle: '૧૧kV વિતરણ ફીડર ઓવરલોડ અને બોટલનેક રડાર',
    feederRadarSubtitle: 'કંડક્ટર ક્ષમતા સામે પીક એમ્પીયરનું SCADA ટેલિમેટ્રી મોનિટરિંગ',
    capacityUtilizationLabel: 'ક્ષમતા ઉપયોગિતા',
    colPeakLoad: 'પીક લોડ',
    colTransformers: 'ટ્રાન્સફોર્મર',
    colConsumers: 'ગ્રાહકો',
    feederStatusCritical: 'ગંભીર ઓવરલોડ',
    feederStatusWarning: 'ચેતવણી',
    feederStatusOptimal: 'શ્રેષ્ઠ',
    unitDts: 'DTs',

    aiRadarBannerTitle: 'VidyutOne સ્માર્ટ યુટિલિટી ઇનસાઇટ્સ અને એનોમલી રડાર',
    aiRadarBannerSubtitle: 'ગ્રાહક આઉટેજ થાય તે પહેલાં માળખાગત દબાણની આગાહી કરવા માટે મશીન લર્નિંગ સ્માર્ટ મીટર ડેટા અને ટ્રાન્સફોર્મર હીટમેપ્સ સ્કેન કરે છે.',
    alert1Badge: 'ટ્રાન્સફોર્મર થર્મલ ઓવરલોડ ચેતવણી',
    alert1Title: 'DT-KADI-19 ૧૦૮% ક્ષમતા પર',
    alert1Desc: 'કૃષિ પંપો એકસાથે ચાલુ થવાથી ૧૪:૦૦ થી ૧૮:૦૦ વચ્ચે ૪૦°C તાપમાન વધે છે. ફેઝ બેલેન્સિંગ વિના ૧૪ દિવસમાં વાઇન્ડિંગ બળી જવાનું જોખમ.',
    askCopilotBtn: 'વિદ્યુત મિત્ર AI સહાયકને પૂછો',
    alert2Badge: 'વાણિજ્યિક મહેસૂલ લિકેજ તપાસ',
    alert2Title: 'GIDC ફેઝ ૨ વપરાશ વિસંગતતા',
    alert2Desc: 'સ્માર્ટ મીટર ક્લસ્ટરિંગમાં ૩ એકમોમાં પાવર ફેક્ટર ૦.૭૨ સુધી ઘટેલું જોવા મળ્યું, જે મીટર બાયપાસ અથવા પ્રતિક્રિયાશીલ લોડ તરફ નિર્દેશ કરે છે.',
    dispatchAuditBtn: 'વિજિલન્સ ઑડિટ રવાના કરો →',
    dispatchVigilanceToast: 'વિજિલન્સ સ્ક્વોડ નિરીક્ષણ સૂચના રવાના કરી (ડેમો)',
    alert3Badge: 'સોલાર રૂફટોપ નેટ-મીટરિંગ આગાહી',
    alert3Title: 'નવેમ્બર ૨૦૨૬ સુધી +૪.૨ MW સોલાર ઉમેરો',
    alert3Desc: 'મહેસાણા રહેણાંક વિસ્તારમાં ઝડપી સ્વીકૃતિથી બપોરનો પીક લોડ ૧૨.૮% ઘટશે, જેનાથી સ્પોટ માર્કેટ ખરીદી ખર્ચ ઘટશે.',
    alert3Policy: 'નીતિ પ્રોત્સાહન: ₹૨.૨૫/kWh ફીડ-ઇન ટેરિફ',

    aiQueueTitle: 'કાર્યપાલક AI કાર્યવાહી સંમતિ કતાર (ઉચ્ચ જોખમી મંજૂરીઓ અને ગ્રીડ એસ્કેલેશન)',
    aiQueueSubtitle: 'મેનેજમેન્ટ સત્તા જરૂરી હોય તેવી વિદ્યુત-AI ની દરખાસ્તો (≥૧૦ kW વ્યાપારી/ઔદ્યોગિક લોડ અને કટોકટી રવાનગી).',
    pendingConcurrenceBadge: 'કાર્યપાલક સંમતિ બાકી',
    colProposalId: 'દરખાસ્ત આઈડી',
    colActionTarget: 'કાર્યવાહી અને લક્ષ્ય એકમ',
    colStateTransition: 'સ્થિતિ પરિવર્તન',
    colRiskLevel: 'જોખમ સ્તર',
    colStatusAudit: 'સ્થિતિ અને ઑડિટ',
    colExecutiveAction: 'કાર્યપાલક કાર્યવાહી',
    reviewAndSanctionBtn: 'સમીક્ષા અને મંજૂરી',
    viewAuditRecordBtn: 'ઑડિટ રેકોર્ડ જુઓ',
    reviewedByPrefix: 'દ્વારા',

    slaMatrixTitle: 'વિભાગીય SLA નિવારણ મેટ્રિક્સ',
    slaMatrixSubtitle: 'ગુજરાત વીજ નિયમન આયોગ (GERC) ધોરણોનું નિયમનકારી પાલન',
    colSubdivisionName: 'પેટા-વિભાગનું નામ',
    colTotalComplaints: 'કુલ ફરિયાદો',
    colResolutionRate: 'નિવારણ દર (%)',
    colAverageTat: 'સરેરાશ TAT (કલાક)',
    colAtcLossPct: 'AT&C ખોટ %',
    colGercCompliance: 'GERC પાલન',
    badgeCompliant: 'સુસંગત (Compliant)',
    hoursSuffix: 'કલાક',

    exportCenterTitle: 'કાર્યપાલક નિકાસ અને વૈધાનિક અહેવાલ કેન્દ્ર',
    exportCenterSubtitle: 'સંકલિત AT&C ખોટ નિવેદનો, મહેસૂલ મેળવણી અને GERC નિયમનકારી ફાઇલિંગ્સ',
    clientSideDemoBadge: 'ક્લાયન્ટ-સાઇડ ડેમો નિકાસ',
    pkg1Category: 'નાણાકીય અને ઊર્જા ઑડિટ',
    pkg1Format: 'CSV / PDF',
    pkg1Title: 'માસિક ઊર્જા ઇનપુટ, બિલિંગ અને AT&C ખોટ નિવેદન',
    pkg1Desc: '૬ મહિનાનો ટ્રેજેક્ટરી ({from} – {to}) જેમાં MU ઇનપુટ, બિલિંગ કાર્યક્ષમતા અને મહેસૂલ આવરી લેવાયેલ છે.',
    pkg1Btn: 'માસિક નિવેદન નિકાસ કરો (ડેમો)',
    pkg1Toast: 'ડાઉનલોડ માટે માસિક AT&C ખોટ અને મહેસૂલ નિવેદન ({period}) તૈયાર કર્યું (ડેમો)',
    pkg2Category: 'નિયમનકારી પાલન',
    pkg2Format: 'GERC ધોરણ',
    pkg2Title: 'પેટા-વિભાગ SLA અને ફરિયાદ નિવારણ ડોઝિયર',
    pkg2Desc: '{count} કાર્યરત પેટા-વિભાગોને ફરિયાદ નિવારણ દર, સરેરાશ TAT કલાકો અને પાલન ફ્લેગ્સ સાથે આવરી લે છે.',
    pkg2Btn: 'SLA પાલન મેટ્રિક્સ નિકાસ કરો (ડેમો)',
    pkg2Toast: 'પેટા-વિભાગ GERC SLA પાલન ડોઝિયર તૈયાર કર્યું (ડેમો)',
    pkg3Category: 'ગ્રીડ ઇન્ફ્રાસ્ટ્રક્ચર',
    pkg3Format: 'SCADA સારાંશ',
    pkg3Title: '૧૧kV ફીડર પીક લોડ અને ટ્રાન્સફોર્મર ઉપયોગિતા અહેવાલ',
    pkg3Desc: '{count} મોનિટર કરેલા ફીડર્સનો સ્નેપશોટ જેમાં {highCount} હાઇ-લોડ કોરિડોર અને ગ્રાહક સંખ્યા સામેલ છે.',
    pkg3Btn: 'ફીડર લોડ ઑડિટ નિકાસ કરો (ડેમો)',
    pkg3Toast: '૧૧kV ફીડર લોડ અને બોટલનેક ઑડિટ અહેવાલ તૈયાર કર્યો (ડેમો)',

    previewLedgerTitle: 'માસિક કાર્યપાલક કામગીરી ખાતાવહી (પૂર્વાવલોકન)',
    previewLedgerSubtitle: 'બોર્ડ બેઠકો અને ત્રિમાસિક ડિસ્કોમ ફાઇલિંગ્સ માટેનો મુખ્ય ડેટાસેટ',
    colBillingMonth: 'બિલિંગ મહિનો',
    colEnergyBilled: 'બિલ થયેલ ઊર્જા (MU)',
    colRevenueCollected: 'એકત્રિત મહેસૂલ (₹ કરોડ)',
    colAtcLoss: 'AT&C ખોટ %',
    unitMu: 'MU',

    twinTitle: 'UGVCL સ્માર્ટ ગ્રીડ ડિજિટલ ટ્વિન અને SCADA સિમ્યુલેટર',
    twinSubtitle: 'ઇન્ટરેક્ટિવ ૬૬kV/૧૧kV/૪૧૫V વિતરણ નેટવર્ક. વાસ્તવિક ગ્રીડ વર્તણૂક, વોલ્ટેજ સ્થિરતા અને સ્વચાલિત સુરક્ષા પ્રોટોકોલનું મૂલ્યાંકન કરવા ઓપરેશનલ દૃશ્યો પસંદ કરો.',
    btnResetGrid: 'ગ્રીડ રીસેટ કરો',
    btnResetGridTitle: 'સામાન્ય આધારરેખા કામગીરી પર રીસેટ કરો',
    scenarioNormalTab: '૧. સામાન્ય સંતુલન',
    scenarioPeakTab: '૨. પીક વધારો',
    scenarioOverloadTab: '૩. ટ્રાન્સફોર્મર ઓવરલોડ',
    scenarioOutageTab: '૪. ફીડર ટ્રીપ આઉટેજ',
    scenarioSolarTab: '૫. સોલાર રિવર્સ ફ્લો',
    scenarioMaintenanceTab: '૬. જાળવણી PTW',
    scenarioPrefix: 'દૃશ્ય:',
    automatedResponseLabel: 'સ્વચાલિત પ્રતિસાદ',
    topologySubtitle: 'લાઇવ સિંગલ-લાઇન ઇલેક્ટ્રિકલ ટોપોલોજી (તપાસવા માટે સાધન પર ક્લિક કરો)',
    getcoGridLabel: '૬૬kV ગ્રીડ (GETCO)',
    substationBoxLabel: 'મહેસાણા ઉત્તર સબસ્ટેશન',
    substationBusbarLabel: '૧૧kV સબસ્ટેશન બસબાર (૨૪૮A)',
    diagnosticTelemetryTitle: 'SCADA નિદાન ટેલિમેટ્રી',
    diagnosticTelemetrySubtitle: 'રીઅલ-ટાઇમ સિમ્યુલેટેડ ટેલિમેટ્રી ફીડ્સ',
    rtuSyncBadge: 'RTU-14 સિંક',
    paramGridFrequency: 'ગ્રીડ ફ્રીક્વન્સી',
    paramIegcBand: 'IEGC બેન્ડ: ૪૯.૯૦ - ૫૦.૦૫',
    paramSystemLoad: 'સિસ્ટમ લોડ',
    paramMaxPeak: 'મહત્તમ પીક: ૭૨.૦ MW',
    paramPhaseVoltage: 'ફેઝ વોલ્ટેજ (LT)',
    paramStandardVoltage: 'પ્રમાણભૂત: ૨૩૦V ± ૬%',
    paramTransformerTemp: 'ટ્રાન્સફોર્મર તાપમાન',
    paramTripThreshold: 'ટ્રીપ મર્યાદા: ૯૫°C',
    nodeInspectionTitle: 'સાધન નિરીક્ષણ',
    nodeOperatingVoltage: 'ઓપરેટિંગ વોલ્ટેજ:',
    nodeCurrentCapacity: 'વર્તમાન / ક્ષમતા:',
    nodeProtectionRelay: 'પ્રોટેક્શન રિલે:',
    nodeDefaultSelectPrompt: 'રિલે પ્રોટેક્શન, રેટ કરેલ એમ્પીયર અને રીઅલ-ટાઇમ લોડ ક્ષમતા તપાસવા માટે ડાયાગ્રામમાં કોઈપણ સબસ્ટેશન, ફીડર અથવા ડીટી નોડ પસંદ કરો.',
    scadaProtocolNote: 'IEC 61850 સબસ્ટેશન ઓટોમેશન સ્ટાન્ડર્ડ અને DNP3 ટેલિમેટ્રી સિમ્યુલેશન.',
    nodeClickHint: 'તકનીકી નિદાન નિરીક્ષણ માટે કોઈપણ સબસ્ટેશન, ફીડર અથવા ટ્રાન્સફોર્મર પર ક્લિક કરો',
    legendActiveFeeder: '૧૧kV સક્રિય ફીડર',
    legendDistributedSolar: 'વિકેન્દ્રિત સૌર ઊર્જા',
    legendTrippedIsolated: 'ટ્રિપ થયેલ / અલગ કરેલ',
    solarMicroGenBadge: 'સોલાર માઇક્રો-જનરેશન (૧૫૦kWp)',
    solarSurplusExport: 'વધારાની નિકાસ: +૧૮૦A',
    solarMiddayFeed: 'મધ્યાહ્ન ફીડ: ૬૫A',

    forecastEngineTitle: 'AI ઊર્જા માંગ અને લોડ અનુમાન એન્જિન',
    forecastEngineSubtitle: 'ડે-અહેડ પાવર શેડ્યુલિંગ (DAPS) માટે મશીન લર્નિંગ લોડ પ્રોજેક્શન. રીઅલ-ટાઇમ ગ્રીડ વળાંકની પુનઃગણતરી જોવા માટે વાતાવરણ અને ઔદ્યોગિક લોડ વૃદ્ધિ સંતુલિત કરો.',
    btnResetBaseline: 'બેઝલાઇન રીસેટ કરો',
    labelAmbientTemp: 'વાતાવરણ તાપમાન',
    tempMildMonsoon: '૨૪°C (હળવો ચોમાસો)',
    tempNormal: '૩૬°C (સામાન્ય)',
    tempHeatwave: '૪૫°C (હીટવેવ)',
    labelAnnualLoadTrend: 'વાર્ષિક લોડ વલણ પરિબળ',
    growthShutdown: '-૧૦% (ઔદ્યોગિક બંધ)',
    growthStandard: '+૬% (પ્રમાણભૂત)',
    growthFestive: '+૨૫% (તહેવાર પીક)',
    labelDuckCurve: 'રૂફટોપ સોલાર ઓફસેટ (ડક કર્વ)',
    descDuckCurve: 'બપોરના સમયે ૭.૪ MW સોલાર શેવિંગનું અનુકરણ કરે છે',
    kpiPredictedPeakDemand: 'અનુમાનિત ૨૪ કલાક પીક માંગ',
    peakAtHourPrefix: 'સમયે',
    peakVarianceDesc: 'આધારરેખા ૬૮.૨ MW હતી (+{val} MW તફાવત)',
    kpiEstimatedEnergyReq: 'અંદાજિત ઊર્જા જરૂરિયાત',
    descDayAheadSchedule: 'ડે-અહેડ પ્રાપ્તિ શેડ્યૂલ',
    kpiDayAheadBudget: 'ડે-અહેડ વીજ ખરીદી બજેટ',
    descBaseTariff: '₹૫.૪૨/kWh મૂળ ટેરિફ પર ગણતરી કરેલ',
    dispatcherRecHeading: 'ડિસ્પેચર ભલામણ',
    recHeatwave: 'તીવ્ર હીટવેવ ચેતવણી. ૨૦:૦૦ - ૨૩:૦૦ માટે સરદાર સરોવર હાઇડ્રો પીકિંગ સ્ટેશન પરથી ૧૫ MW ડે-અહેડ અનામત અગાઉથી બુક કરો.',
    recSolarInjection: 'બપોરનું સોલાર ઇન્જેક્શન સબસ્ટેશન પીકમાંથી ૭.૪ MW ઘટાડે છે. કરટેલમેન્ટ ટાળવા ૧૧:૦૦ - ૧૫:૦૦ વચ્ચે થર્મલ એકમોને ૧૧% ધીમા કરો.',
    recDemandNormal: 'માંગ પ્રોફાઇલ સામાન્ય છે. કરારબદ્ધ GUVNL થર્મલ PPA સ્પોટ માર્કેટ વિના ૯૪% શેડ્યૂલ સંતોષે છે.',
    chartForecastCurveTitle: 'આગામી ૨૪ કલાક લોડ કર્વ: ઐતિહાસિક વાસ્તવિક વિરુદ્ધ AI આગાહી',
    chartConfidenceSubtitle: 'શેડેડ એન્વેલપ ૯૫% આંકડાકીય વિશ્વસનીયતા અંતરાલ દર્શાવે છે (±૪.૫%)',
    legendHistoricalActual: 'ઐતિહાસિક વાસ્તવિક',
    legendForecastLoad: 'AI આગાહી (MW)',
    footerModelType: 'ગ્રેડિયન્ટ બૂસ્ટેડ રિગ્રેશન ટ્રી (GBRT) + તાપમાન વિઘટન',
    footerDeterministic: 'ઓપરેશનલ મૂલ્યાંકન માટે નિર્ધારિત સિમ્યુલેશન'
  },
  hi: {
    cockpitTitle: 'कार्यकारी इंटेलिजेंस कॉकपिट',
    corporateOfficeBadge: 'कॉर्पोरेट कार्यालय मेहसाणा',
    officerPrefix: 'UGVCL कॉर्पोरेट · अधिकारी:',
    optQ2: 'Q2 वित्त वर्ष 2026 (जुलाई - सितंबर)',
    optYtd: 'वित्त वर्ष 2026 आज तक (YTD)',
    exportReportBtn: 'रिपोर्ट निर्यात करें',
    flashReportToast: 'कार्यकारी त्वरित रिपोर्ट तैयार की गई (PDF)',

    telemetryTitle: 'क्रॉस-पोर्टल ERP वर्कफ़्लो टेलीमेट्री एवं परिचालन स्वास्थ्य',
    canonicalStateSyncActive: 'मुख्य स्थिति सिंक: सक्रिय',
    kpiPendingAppsTitle: 'लंबित आवेदन',
    kpiPendingAppsSub: 'उपभोक्ता → कर्मचारी सिंक',
    kpiActiveGrievancesTitle: 'सक्रिय शिकायतें',
    kpiActiveGrievancesSub: 'स्वचालित SLA एस्क्रो सक्रिय',
    kpiDispatchedFieldOrdersTitle: 'प्रेषित फील्ड कार्य आदेश',
    kpiDispatchedFieldOrdersSub: 'लाइनमैन सिंक सत्यापित',
    kpiCriticalHazardsTitle: 'गंभीर ग्रिड खतरे',
    kpiCriticalHazardsSub: 'चरण 2 ऑडियो चेतावनी लिंक',

    escalationInboxTitle: 'कार्यकारी गंभीर घटना एस्केलेशन इनबॉक्स',
    escalatedAwaitingSuffix: 'सहमति की प्रतीक्षा कर रही अग्रेषित घटना(एं)',
    emergencySafetyOverrideBadge: 'आपातकालीन सुरक्षा ओवरराइड',
    feederLabel: 'फीडर:',
    subdivisionLabel: 'उप-संभाग:',
    escalatedByPrefix: 'अग्रेषित करने वाले:',
    justificationPrefix: 'औचित्य:',
    reviewEscalationBtn: 'एस्केलेशन समीक्षा करें',
    fallbackGridLine: 'ग्रिड लाइन',
    fallbackDivisionOffice: 'संभागीय कार्यालय',

    highRiskSanctionsTitle: 'कार्यकारी प्राधिकरण आवश्यक उच्च-जोखिम वाणिज्यिक/औद्योगिक आवेदन',
    awaitingConcurrenceSuffix: 'सहमति प्रतीक्षारत',
    verifiedViaWoPrefix: 'कार्य आदेश द्वारा सत्यापित:',
    reviewFieldDossierBtn: 'फील्ड डोजियर समीक्षा करें',
    grantExecutiveSanctionBtn: 'कार्यकारी मंजूरी प्रदान करें',
    sanctionGrantedToast: '{id} के लिए कार्यकारी मंजूरी प्रदान की गई! नया कनेक्शन सक्रिय।',
    sanctionAuditRemark: 'प्रबंधन कार्यालय द्वारा कार्यकारी मंजूरी सहमति दी गई।',
    addressLabel: 'पता:',
    subdivisionShortLabel: 'उप-संभाग:',

    kpiAtcLossTitle: 'AT&C हानि दर',
    kpiAtcLossTarget: 'लक्ष्य: 11.8% (मेहसाणा सर्कल 11.8% के साथ अग्रणी)',
    kpiBillingEffTitle: 'बिलिंग दक्षता',
    kpiBillingEffSub: '182.7 MUs इनपुट में से 161.9 MUs बिल किए गए',
    kpiCollectionEffTitle: 'वसूली दक्षता',
    kpiCollectionEffVal: '₹79.6 करोड़ एकत्रित',
    kpiCollectionEffSub: 'डिजिटल भुगतान: भारत बिलपे द्वारा 71.2%',
    kpiReliabilityTitle: 'सिस्टम विश्वसनीयता (SAIDI)',
    kpiReliabilityUptime: '99.96% अपटाइम',
    kpiReliabilitySub: 'SAIFI: 0.24 व्यवधान/उपभोक्ता/माह',
    yoyReductionSuffix: '-1.4% वार्षिक कमी',
    trendUpSuffix: '+0.9%',

    chartAtcCurveTitle: 'AT&C हानि कमी वक्र (%)',
    chartAtcCurveSubtitle: 'समग्र तकनीकी एवं वाणिज्यिक नुकसान (वित्त वर्ष 2026 मासिक रुझान)',
    chartAtcLegend: 'AT&C हानि %',
    chartEnergyVsRevTitle: 'बिल की गई ऊर्जा बनाम राजस्व संग्रह',
    chartEnergyVsRevSubtitle: 'बिल किए गए मेगा-यूनिट (MUs) बनाम शुद्ध राजस्व (₹ करोड़)',
    chartLegendBilledMus: 'बिल किए गए MUs',
    chartLegendRevenueCr: 'राजस्व (₹ करोड़)',

    feederRadarTitle: '11kV वितरण फीडर ओवरलोड एवं बॉटलनेक रडार',
    feederRadarSubtitle: 'कंडक्टर क्षमता के विरुद्ध पीक एम्पीयर की SCADA टेलीमेट्री निगरानी',
    capacityUtilizationLabel: 'क्षमता उपयोगिता',
    colPeakLoad: 'पीक लोड',
    colTransformers: 'ट्रांसफॉर्मर',
    colConsumers: 'उपभोक्ता',
    feederStatusCritical: 'गंभीर ओवरलोड',
    feederStatusWarning: 'चेतावनी',
    feederStatusOptimal: 'सर्वोत्तम',
    unitDts: 'DTs',

    aiRadarBannerTitle: 'VidyutOne स्मार्ट यूटिलिटी इनसाइट्स एवं विसंगति रडार',
    aiRadarBannerSubtitle: 'मशीन लर्निंग स्मार्ट मीटर डेटा और ट्रांसफॉर्मर हीटमैप स्कैन करके उपभोक्ता व्यवधान से पहले बुनियादी ढांचे के तनाव का पूर्वानुमान लगाती है।',
    alert1Badge: 'ट्रांसफॉर्मर थर्मल ओवरलोड चेतावनी',
    alert1Title: 'DT-KADI-19 108% क्षमता पर',
    alert1Desc: 'कृषि पंपों के एक साथ चलने से 14:00 - 18:00 के बीच 40°C तापमान बढ़ता है। फेज संतुलन के बिना 14 दिनों में वाइंडिंग इंसुलेशन विफलता का जोखिम।',
    askCopilotBtn: 'विद्युत मित्र AI सह-पायलट से पूछें',
    alert2Badge: 'वाणिज्यिक राजस्व रिसाव जांच',
    alert2Title: 'GIDC चरण II उपभोग विसंगति',
    alert2Desc: 'स्मार्ट मीटर क्लस्टरिंग में 3 इकाइयों में पावर फैक्टर 0.72 तक कम पाया गया, जो मीटर बाईपास या भारी रिएक्टिव लोड का संकेत है।',
    dispatchAuditBtn: 'विजिलेंस ऑडिट भेजें →',
    dispatchVigilanceToast: 'विजिलेंस दल निरीक्षण नोटिस भेजा गया (डेमो)',
    alert3Badge: 'सोलर रूफटॉप नेट-मीटरिंग पूर्वानुमान',
    alert3Title: 'नवंबर 2026 तक +4.2 MW सौर ऊर्जा विस्तार',
    alert3Desc: 'मेहसाणा आवासीय क्षेत्र में तेजी से अपनाने से दोपहर का पीक लोड 12.8% घटेगा, जिससे स्पॉट मार्केट बिजली खरीद लागत में कमी आएगी।',
    alert3Policy: 'नीतिगत प्रोत्साहन: ₹2.25/kWh फीड-इन टैरिफ',

    aiQueueTitle: 'कार्यकारी AI कार्रवाई सहमति कतार (उच्च-जोखिम मंजूरी एवं ग्रिड एस्केलेशन)',
    aiQueueSubtitle: 'प्रबंधन प्राधिकार चाहने वाले विद्युत-AI प्रस्तावित कदम (≥10 kW वाणिज्यिक/औद्योगिक भार एवं आपातकालीन प्रेषण)।',
    pendingConcurrenceBadge: 'कार्यकारी सहमति प्रतीक्षारत',
    colProposalId: 'प्रस्ताव आईडी',
    colActionTarget: 'कार्रवाई एवं लक्षित इकाई',
    colStateTransition: 'स्थिति संक्रमण',
    colRiskLevel: 'जोखिम स्तर',
    colStatusAudit: 'स्थिति एवं ऑडिट',
    colExecutiveAction: 'कार्यकारी कार्रवाई',
    reviewAndSanctionBtn: 'समीक्षा एवं मंजूरी',
    viewAuditRecordBtn: 'ऑडिट रिकॉर्ड देखें',
    reviewedByPrefix: 'द्वारा',

    slaMatrixTitle: 'संभागीय SLA निवारण मैट्रिक्स',
    slaMatrixSubtitle: 'गुजरात विद्युत नियामक आयोग (GERC) मानकों का विनियामक अनुपालन',
    colSubdivisionName: 'उप-संभाग का नाम',
    colTotalComplaints: 'कुल शिकायतें',
    colResolutionRate: 'निवारण दर (%)',
    colAverageTat: 'औसत TAT (घंटे)',
    colAtcLossPct: 'AT&C हानि %',
    colGercCompliance: 'GERC अनुपालन',
    badgeCompliant: 'अनुपालन संपन्न (Compliant)',
    hoursSuffix: 'घंटे',

    exportCenterTitle: 'कार्यकारी निर्यात एवं वैधानिक रिपोर्टिंग केंद्र',
    exportCenterSubtitle: 'समेकित AT&C हानि विवरण, राजस्व समाधान एवं GERC विनियामक फाइलिंग',
    clientSideDemoBadge: 'क्लाइंट-साइड डेमो निर्यात',
    pkg1Category: 'वित्तीय एवं ऊर्जा ऑडिट',
    pkg1Format: 'CSV / PDF',
    pkg1Title: 'मासिक ऊर्जा इनपुट, बिलिंग एवं AT&C हानि विवरण',
    pkg1Desc: '6 महीने का प्रक्षेपवक्र ({from} – {to}) जिसमें MU इनपुट, बिलिंग दक्षता और राजस्व वसूली शामिल है।',
    pkg1Btn: 'मासिक विवरण निर्यात करें (डेमो)',
    pkg1Toast: 'डाउनलोड के लिए मासिक AT&C हानि एवं राजस्व विवरण ({period}) तैयार किया गया (डेमो)',
    pkg2Category: 'विनियामक अनुपालन',
    pkg2Format: 'GERC मानक',
    pkg2Title: 'उप-संभाग SLA एवं शिकायत निवारण डोजियर',
    pkg2Desc: '{count} परिचालन उप-संभागों को शिकायत निवारण दर, औसत TAT घंटे और अनुपालन फ्लैग के साथ शामिल करता है।',
    pkg2Btn: 'SLA अनुपालन मैट्रिक्स निर्यात करें (डेमो)',
    pkg2Toast: 'उप-संभाग GERC SLA अनुपालन डोजियर तैयार किया गया (डेमो)',
    pkg3Category: 'ग्रिड अवसंरचना',
    pkg3Format: 'SCADA सारांश',
    pkg3Title: '11kV फीडर पीक लोड एवं ट्रांसफॉर्मर उपयोगिता रिपोर्ट',
    pkg3Desc: '{count} निगरानी वाले फीडरों का स्नैपशॉट जिसमें {highCount} उच्च-लोड कॉरिडोर और जुड़े उपभोक्ता शामिल हैं।',
    pkg3Btn: 'फीडर लोड ऑडिट निर्यात करें (डेमो)',
    pkg3Toast: '11kV फीडर लोड एवं अड़चन ऑडिट रिपोर्ट तैयार की गई (डेमो)',

    previewLedgerTitle: 'मासिक कार्यकारी प्रदर्शन खाता (पूर्वावलोकन)',
    previewLedgerSubtitle: 'बोर्ड बैठकों और त्रैमासिक डिस्कॉम फाइलिंग के लिए स्रोत डेटासेट',
    colBillingMonth: 'बिलिंग माह',
    colEnergyBilled: 'बिल की गई ऊर्जा (MU)',
    colRevenueCollected: 'एकत्रित राजस्व (₹ करोड़)',
    colAtcLoss: 'AT&C हानि %',
    unitMu: 'MU',

    twinTitle: 'UGVCL स्मार्ट ग्रिड डिजिटल ट्विन एवं SCADA सिम्युलेटर',
    twinSubtitle: 'इंटरएक्टिव 66kV/11kV/415V वितरण नेटवर्क। वास्तविक समय ग्रिड व्यवहार, वोल्टेज स्थिरता और स्वचालित सुरक्षा प्रोटोकॉल का मूल्यांकन करने के लिए परिचालन परिदृश्य चुनें।',
    btnResetGrid: 'ग्रिड रीसेट करें',
    btnResetGridTitle: 'सामान्य आधारभूत संचालन पर रीसेट करें',
    scenarioNormalTab: '1. सामान्य संतुलन',
    scenarioPeakTab: '2. पीक उछाल',
    scenarioOverloadTab: '3. ट्रांसफॉर्मर ओवरलोड',
    scenarioOutageTab: '4. फीडर ट्रिप व्यवधान',
    scenarioSolarTab: '5. सोलर रिवर्स प्रवाह',
    scenarioMaintenanceTab: '6. अनुरक्षण PTW',
    scenarioPrefix: 'परिदृश्य:',
    automatedResponseLabel: 'स्वचालित प्रतिक्रिया',
    topologySubtitle: 'लाइव सिंगल-लाइन इलेक्ट्रिकल टोपोलॉजी (निरीक्षण के लिए उपकरण पर क्लिक करें)',
    getcoGridLabel: '66kV ग्रिड (GETCO)',
    substationBoxLabel: 'मेहसाणा उत्तर सबस्टेशन',
    substationBusbarLabel: '11kV सबस्टेशन बसबार (248A)',
    diagnosticTelemetryTitle: 'SCADA नैदानिक टेलीमेट्री',
    diagnosticTelemetrySubtitle: 'रीयल-टाइम सिम्युलेटेड टेलीमेट्री फीड',
    rtuSyncBadge: 'RTU-14 सिंक',
    paramGridFrequency: 'ग्रिड फ्रीक्वेंसी',
    paramIegcBand: 'IEGC बैंड: 49.90 - 50.05',
    paramSystemLoad: 'सिस्टम लोड',
    paramMaxPeak: 'अधिकतम पीक: 72.0 MW',
    paramPhaseVoltage: 'फेज वोल्टेज (LT)',
    paramStandardVoltage: 'मानक: 230V ± 6%',
    paramTransformerTemp: 'ट्रांसफॉर्मर तापमान',
    paramTripThreshold: 'ट्रिप सीमा: 95°C',
    nodeInspectionTitle: 'उपकरण निरीक्षण',
    nodeOperatingVoltage: 'ऑपरेटिंग वोल्टेज:',
    nodeCurrentCapacity: 'वर्तमान / क्षमता:',
    nodeProtectionRelay: 'सुरक्षा रिले:',
    nodeDefaultSelectPrompt: 'रिले सुरक्षा, रेटेड कंडक्टर एम्पीयर और रीयल-टाइम लोड हेडरूम का निरीक्षण करने के लिए आरेख में किसी भी सबस्टेशन, फीडर या डीटी नोड का चयन करें।',
    scadaProtocolNote: 'IEC 61850 सबस्टेशन स्वचालन मानक एवं DNP3 टेलीमेट्री सिमुलेशन।',
    nodeClickHint: 'तकनीकी नैदानिक निरीक्षण के लिए किसी भी सबस्टेशन, फीडर या ट्रांसफॉर्मर पर क्लिक करें',
    legendActiveFeeder: '11kV सक्रिय फीडर',
    legendDistributedSolar: 'वितरित सौर ऊर्जा',
    legendTrippedIsolated: 'ट्रिप्ड / पृथक',
    solarMicroGenBadge: 'सोलर माइक्रो-जनरेशन (150kWp)',
    solarSurplusExport: 'अधिशेष निर्यात: +180A',
    solarMiddayFeed: 'मध्याह्न फीड: 65A',

    forecastEngineTitle: 'AI ऊर्जा मांग एवं लोड पूर्वानुमान इंजन',
    forecastEngineSubtitle: 'डे-अहेड पावर शेड्यूलिंग (DAPS) के लिए मशीन लर्निंग लोड प्रक्षेपण। रीयल-टाइम ग्रिड वक्र की पुनर्गणना देखने के लिए मौसम और औद्योगिक लोड वृद्धि को समायोजित करें।',
    btnResetBaseline: 'बेसलाइन रीसेट करें',
    labelAmbientTemp: 'परिवेश तापमान',
    tempMildMonsoon: '24°C (हल्का मानसून)',
    tempNormal: '36°C (सामान्य)',
    tempHeatwave: '45°C (हीटवेव)',
    labelAnnualLoadTrend: 'वार्षिक लोड रुझान कारक',
    growthShutdown: '-10% (औद्योगिक बंद)',
    growthStandard: '+6% (मानक)',
    growthFestive: '+25% (त्योहार पीक)',
    labelDuckCurve: 'रूफटॉप सोलर ऑफसेट (डक कर्व)',
    descDuckCurve: 'दोपहर में 7.4 MW सोलर शेविंग का अनुकरण करता है',
    kpiPredictedPeakDemand: 'पूर्वानुमानित 24 घंटे पीक मांग',
    peakAtHourPrefix: 'समय',
    peakVarianceDesc: 'आधारभूत 68.2 MW था (+{val} MW अंतर)',
    kpiEstimatedEnergyReq: 'अनुमानित ऊर्जा आवश्यकता',
    descDayAheadSchedule: 'डे-अहेड खरीद अनुसूची',
    kpiDayAheadBudget: 'डे-अहेड बिजली खरीद बजट',
    descBaseTariff: '₹5.42/kWh आधार टैरिफ पर गणना की गई',
    dispatcherRecHeading: 'डिस्पैचर अनुशंसा',
    recHeatwave: 'गंभीर हीटवेव चेतावनी। 20:00 - 23:00 खिड़की के लिए सरदार सरोवर हाइड्रो पीकिंग स्टेशन से 15 MW डे-अहेड रिजर्व पहले से बुक करें।',
    recSolarInjection: 'दोपहर का सोलर इंजेक्शन सबस्टेशन पीक से 7.4 MW घटाता है। कटौती से बचने के लिए 11:00 - 15:00 के बीच थर्मल इकाइयों को 11% धीमा करें।',
    recDemandNormal: 'मांग प्रोफ़ाइल सामान्य है। अनुबंधित GUVNL बेस थर्मल PPA बिना स्पॉट मार्केट के 94% निर्धारित मांग को पूरा करता है।',
    chartForecastCurveTitle: 'अगले 24 घंटे का लोड वक्र: ऐतिहासिक वास्तविक बनाम AI पूर्वानुमान',
    chartConfidenceSubtitle: 'छायांकित क्षेत्र 95% सांख्यिकीय विश्वास अंतराल प्रदर्शित करता है (±4.5%)',
    legendHistoricalActual: 'ऐतिहासिक वास्तविक',
    legendForecastLoad: 'AI पूर्वानुमान (MW)',
    footerModelType: 'ग्रेडिएंट बूस्टेड रिग्रेशन ट्री (GBRT) + तापमान अपघटन',
    footerDeterministic: 'परिचालन मूल्यांकन के लिए नियतात्मक सिमुलेशन'
  },
  mr: {
    cockpitTitle: 'कार्यकारी इंटेलिजन्स कॉकपिट',
    corporateOfficeBadge: 'कॉर्पोरेट कार्यालय मेहसाणा',
    officerPrefix: 'UGVCL कॉर्पोरेट · अधिकारी:',
    optQ2: 'Q2 आर्थिक वर्ष २०२६ (जुलै - सप्टेंबर)',
    optYtd: 'आर्थिक वर्ष २०२६ आजपर्यंत (YTD)',
    exportReportBtn: 'अहवाल निर्यात करा',
    flashReportToast: 'कार्यकारी त्वरित अहवाल तयार केला (PDF)',

    telemetryTitle: 'क्रॉस-पोर्टल ERP वर्कफ्लो टेलिमेट्री आणि ऑपरेशन्स आरोग्य',
    canonicalStateSyncActive: 'मुख्य स्थिती सिंक: सक्रिय',
    kpiPendingAppsTitle: 'प्रलंबित अर्ज',
    kpiPendingAppsSub: 'ग्राहक → कर्मचारी सिंक',
    kpiActiveGrievancesTitle: 'सक्रिय तक्रारी',
    kpiActiveGrievancesSub: 'स्वयंचलित SLA एस्क्रो सक्रिय',
    kpiDispatchedFieldOrdersTitle: 'पाठवलेले फील्ड वर्क ऑर्डर्स',
    kpiDispatchedFieldOrdersSub: 'लाइनमन सिंक सत्यापित',
    kpiCriticalHazardsTitle: 'गंभीर ग्रिड धोके',
    kpiCriticalHazardsSub: 'फेज २ ऑडिओ इशारा संलग्न',

    escalationInboxTitle: 'कार्यकारी गंभीर घटना एस्केलेशन इनबॉक्स',
    escalatedAwaitingSuffix: 'मंजुरीची वाट पाहणारी अग्रेषित घटना(घटना)',
    emergencySafetyOverrideBadge: 'तातडीचा सुरक्षा ओव्हरराइड',
    feederLabel: 'फीडर:',
    subdivisionLabel: 'उप-विभाग:',
    escalatedByPrefix: 'अग्रेषित करणारे:',
    justificationPrefix: 'औचित्य:',
    reviewEscalationBtn: 'एस्केलेशन पुनरावलोकन करा',
    fallbackGridLine: 'ग्रिड लाइन',
    fallbackDivisionOffice: 'विभागीय कार्यालय',

    highRiskSanctionsTitle: 'कार्यकारी मंजुरी आवश्यक असणारे उच्च-जोखीम व्यावसायिक/औद्योगिक अर्ज',
    awaitingConcurrenceSuffix: 'मंजुरीची प्रतीक्षा',
    verifiedViaWoPrefix: 'वर्क ऑर्डरद्वारे तपासले:',
    reviewFieldDossierBtn: 'फील्ड डॉझियर पुनरावलोकन करा',
    grantExecutiveSanctionBtn: 'कार्यकारी मंजुरी द्या',
    sanctionGrantedToast: '{id} साठी कार्यकारी मंजुरी देण्यात आली! नवीन जोडणी सक्रिय झाली.',
    sanctionAuditRemark: 'व्यवस्थापन कार्यालयाद्वारे कार्यकारी मंजुरी संमती देण्यात आली.',
    addressLabel: 'पत्ता:',
    subdivisionShortLabel: 'उप-विभाग:',

    kpiAtcLossTitle: 'AT&C तोटा दर',
    kpiAtcLossTarget: 'लक्ष्य: ११.८% (मेहसाणा सर्कल ११.८% सह आघाडीवर)',
    kpiBillingEffTitle: 'बिलिंग कार्यक्षमता',
    kpiBillingEffSub: '१८२.७ MUs इनपुट पैकी १६१.९ MUs बिल केले',
    kpiCollectionEffTitle: 'वसुली कार्यक्षमता',
    kpiCollectionEffVal: '₹७९.६ कोटी संकलित',
    kpiCollectionEffSub: 'डिजिटल देयके: भारत बिलपे द्वारे ७१.२%',
    kpiReliabilityTitle: 'सिस्टम विश्वसनीयता (SAIDI)',
    kpiReliabilityUptime: '९९.९६% अपटाइम',
    kpiReliabilitySub: 'SAIFI: ०.२४ व्यत्यय/ग्राहक/महिना',
    yoyReductionSuffix: '-१.४% वार्षिक घट',
    trendUpSuffix: '+०.९%',

    chartAtcCurveTitle: 'AT&C तोटा घट वक्र (%)',
    chartAtcCurveSubtitle: 'एकत्रित तांत्रिक आणि व्यावसायिक नुकसान (आर्थिक वर्ष २०२६ मासिक कल)',
    chartAtcLegend: 'AT&C तोटा %',
    chartEnergyVsRevTitle: 'बिल केलेली ऊर्जा वि विरुद्ध महसूल संकलन',
    chartEnergyVsRevSubtitle: 'बिल केलेले मेगा-युनिट्स (MUs) वि विरुद्ध निव्वळ महसूल (₹ कोटी)',
    chartLegendBilledMus: 'बिल केलेले MUs',
    chartLegendRevenueCr: 'महसूल (₹ कोटी)',

    feederRadarTitle: '११kV वितरण फीडर ओव्हरलोड आणि बॉटलनेक रडार',
    feederRadarSubtitle: 'कंडक्टर क्षमतेविरुद्ध पीक अँपिअरचे SCADA टेलिमेट्री निरीक्षण',
    capacityUtilizationLabel: 'क्षमता वापर',
    colPeakLoad: 'पीक लोड',
    colTransformers: 'ट्रान्सफॉर्मर्स',
    colConsumers: 'ग्राहक',
    feederStatusCritical: 'गंभीर ओव्हरलोड',
    feederStatusWarning: 'धोका इशारा',
    feederStatusOptimal: 'उत्तम',
    unitDts: 'DTs',

    aiRadarBannerTitle: 'VidyutOne स्मार्ट युटिलिटी इनसाइट्स आणि विसंगती रडार',
    aiRadarBannerSubtitle: 'ग्राहक वीज खंडित होण्यापूर्वी इन्फ्रास्ट्रक्चरवरील ताणाचा अंदाज घेण्यासाठी मशीन लर्निंग अल्गोरिदम स्मार्ट मीटर डेटा आणि ट्रान्सफॉर्मर हीटमॅप्स तपासतात.',
    alert1Badge: 'ट्रान्सफॉर्मर थर्मल ओव्हरलोड इशारा',
    alert1Title: 'DT-KADI-19 १०८% क्षमतेवर',
    alert1Desc: 'कृषी पंप एकाच वेळी सुरू झाल्याने १४:०० - १८:०० दरम्यान ४०°C तापमान वाढते. फेज बॅलन्सिंगशिवाय १४ दिवसांत वाइंडिंग निकामी होण्याचा धोका.',
    askCopilotBtn: 'विद्युत मित्र AI सह-पायलटला विचारा',
    alert2Badge: 'व्यावसायिक महसूल गळती शोध',
    alert2Title: 'GIDC फेज २ वापर विसंगती',
    alert2Desc: 'स्मार्ट मीटर क्लस्टरिंगमध्ये ३ युनिट्समध्ये पॉवर फॅक्टर ०.७२ पर्यंत घसरल्याचे आढळले, जे मीटर बायपास किंवा अनधिकृत लोड दर्शवते.',
    dispatchAuditBtn: 'दक्षता पथक ऑडिट पाठवा →',
    dispatchVigilanceToast: 'दक्षता पथक तपासणी नोटीस पाठवली (डेमो)',
    alert3Badge: 'सोलर रूफटॉप नेट-मीटरिंग अंदाज',
    alert3Title: 'नोव्हेंबर २०२६ पर्यंत +४.२ MW सौर ऊर्जा वाढ',
    alert3Desc: 'मेहसाणा निवासी भागात जलद अवलंबामुळे दुपारचा पीक लोड १२.८% कमी होईल, ज्यामुळे स्पॉट मार्केट वीज खरेदी खर्च कमी होईल.',
    alert3Policy: 'धोरण प्रोत्साहन: ₹२.२५/kWh फीड-इन टॅरिफ',

    aiQueueTitle: 'कार्यकारी AI कृती मंजुरी रांग (उच्च-जोखीम मंजुरी आणि ग्रिड एस्केलेशन)',
    aiQueueSubtitle: 'व्यवस्थापन अधिकार आवश्यक असणाऱ्या विद्युत-AI च्या कृती (≥१० kW व्यावसायिक/औद्योगिक भार मंजुरी आणि आपत्कालीन प्रेषण).',
    pendingConcurrenceBadge: 'कार्यकारी मंजुरी प्रलंबित',
    colProposalId: 'प्रस्ताव आयडी',
    colActionTarget: 'कृती आणि लक्ष्य युनिट',
    colStateTransition: 'स्थिती संक्रमण',
    colRiskLevel: 'जोखीम पातळी',
    colStatusAudit: 'स्थिती आणि ऑडिट',
    colExecutiveAction: 'कार्यकारी कृती',
    reviewAndSanctionBtn: 'पुनरावलोकन आणि मंजुरी',
    viewAuditRecordBtn: 'ऑडिट रेकॉर्ड पहा',
    reviewedByPrefix: 'द्वारे',

    slaMatrixTitle: 'विभागीय SLA निवारण मॅट्रिक्स',
    slaMatrixSubtitle: 'गुजरात वीज नियामक आयोग (GERC) मानकांचे नियामक अनुपालन',
    colSubdivisionName: 'उप-विभागाचे नाव',
    colTotalComplaints: 'एकूण तक्रारी',
    colResolutionRate: 'निवारण दर (%)',
    colAverageTat: 'सरासरी TAT (तास)',
    colAtcLossPct: 'AT&C तोटा %',
    colGercCompliance: 'GERC अनुपालन',
    badgeCompliant: 'अनुपालन पूर्ण (Compliant)',
    hoursSuffix: 'तास',

    exportCenterTitle: 'कार्यकारी निर्यात आणि वैधानिक अहवाल केंद्र',
    exportCenterSubtitle: 'एकत्रित AT&C तोटा विवरण, महसूल ताळमेळ आणि GERC नियामक फायलिंग्ज',
    clientSideDemoBadge: 'क्लायंट-साइड डेमो निर्यात',
    pkg1Category: 'वित्तीय आणि ऊर्जा ऑडिट',
    pkg1Format: 'CSV / PDF',
    pkg1Title: 'मासिक ऊर्जा इनपुट, बिलिंग आणि AT&C तोटा विवरण',
    pkg1Desc: '६ महिन्यांचे प्रक्षेपवक्र ({from} – {to}) ज्यामध्ये MU इनपुट, बिलिंग कार्यक्षमता आणि महसूल समाविष्ट आहे.',
    pkg1Btn: 'मासिक विवरण निर्यात करा (डेमो)',
    pkg1Toast: 'डाउनलोडसाठी मासिक AT&C तोटा आणि महसूल विवरण ({period}) तयार केले (डेमो)',
    pkg2Category: 'नियामक अनुपालन',
    pkg2Format: 'GERC मानक',
    pkg2Title: 'उप-विभाग SLA आणि तक्रार निवारण डॉझियर',
    pkg2Desc: '{count} कार्यरत उप-विभागांना तक्रार निवारण दर, सरासरी TAT तास आणि अनुपालन चिन्हांसह समाविष्ट करते.',
    pkg2Btn: 'SLA अनुपालन मॅट्रिक्स निर्यात करा (डेमो)',
    pkg2Toast: 'उप-विभाग GERC SLA अनुपालन डॉझियर तयार केले (डेमो)',
    pkg3Category: 'ग्रिड इन्फ्रास्ट्रक्चर',
    pkg3Format: 'SCADA सारांश',
    pkg3Title: '११kV फीडर पीक लोड आणि ट्रान्सफॉर्मर वापर अहवाल',
    pkg3Desc: '{count} निरीक्षण केलेल्या फीडर्सचा स्नॅपशॉट ज्यामध्ये {highCount} उच्च-भार कॉरिडॉर आणि जोडलेले ग्राहक समाविष्ट आहेत.',
    pkg3Btn: 'फीडर लोड ऑडिट निर्यात करा (डेमो)',
    pkg3Toast: '११kV फीडर लोड आणि बॉटलनेक ऑडिट अहवाल तयार केला (डेमो)',

    previewLedgerTitle: 'मासिक कार्यकारी कामगिरी खातेवही (पूर्वावलोकन)',
    previewLedgerSubtitle: 'बोर्ड बैठका आणि त्रैमासिक डिस्कॉम फायलिंगसाठी स्रोत डेटासेट',
    colBillingMonth: 'बिलिंग महिना',
    colEnergyBilled: 'बिल केलेली ऊर्जा (MU)',
    colRevenueCollected: 'संकलित महसूल (₹ कोटी)',
    colAtcLoss: 'AT&C तोटा %',
    unitMu: 'MU',

    twinTitle: 'UGVCL स्मार्ट ग्रिड डिजिटल ट्विन आणि SCADA सिम्युलेटर',
    twinSubtitle: 'परस्परसंवादी ६६kV/११kV/४१५V वितरण नेटवर्क. वास्तविक ग्रिड वर्तन, व्होल्टेज स्थिरता आणि स्वयंचलित सुरक्षा प्रोटोकॉलचे मूल्यांकन करण्यासाठी ऑपरेशन्स परिस्थिती निवडा.',
    btnResetGrid: 'ग्रिड रीसेट करा',
    btnResetGridTitle: 'सामान्य मूळ स्थितीवर रीसेट करा',
    scenarioNormalTab: '१. सामान्य संतुलन',
    scenarioPeakTab: '२. पीक वाढ',
    scenarioOverloadTab: '३. ट्रान्सफॉर्मर ओव्हरलोड',
    scenarioOutageTab: '४. फीडर ट्रिप खंडित',
    scenarioSolarTab: '५. सोलर रिव्हर्स प्रवाह',
    scenarioMaintenanceTab: '६. देखभाल PTW',
    scenarioPrefix: 'परिस्थिती:',
    automatedResponseLabel: 'स्वयंचलित प्रतिसाद',
    topologySubtitle: 'थेट सिंगल-लाइन इलेक्ट्रिकल टोपोलॉजी (तपासणीसाठी उपकरणावर क्लिक करा)',
    getcoGridLabel: '६६kV ग्रिड (GETCO)',
    substationBoxLabel: 'मेहसाणा उत्तर सबस्टेशन',
    substationBusbarLabel: '११kV सबस्टेशन बसबार (२४८A)',
    diagnosticTelemetryTitle: 'SCADA निदान टेलिमेट्री',
    diagnosticTelemetrySubtitle: 'रिअल-टाइम सिम्युलेटेड टेलिमेट्री फीड्स',
    rtuSyncBadge: 'RTU-14 सिंक',
    paramGridFrequency: 'ग्रिड फ्रिक्वेन्सी',
    paramIegcBand: 'IEGC बँड: ४९.९० - ५०.०५',
    paramSystemLoad: 'सिस्टम लोड',
    paramMaxPeak: 'कमाल पीक: ७२.० MW',
    paramPhaseVoltage: 'फेज व्होल्टेज (LT)',
    paramStandardVoltage: 'मानक: २३०V ± ६%',
    paramTransformerTemp: 'ट्रान्सफॉर्मर तापमान',
    paramTripThreshold: 'ट्रिप मर्यादा: ९५°C',
    nodeInspectionTitle: 'उपकरण तपासणी',
    nodeOperatingVoltage: 'ऑपरेटिंग व्होल्टेज:',
    nodeCurrentCapacity: 'विद्युत प्रवाह / क्षमता:',
    nodeProtectionRelay: 'प्रोटेक्शन रिले:',
    nodeDefaultSelectPrompt: 'रिले संरक्षण, रेट केलेले कंडक्टर अँपिअर आणि रिअल-टाइम लोड क्षमता तपासण्यासाठी आकृतीमधील कोणत्याही सबस्टेशन, फीडर किंवा डीटी नोडवर क्लिक करा.',
    scadaProtocolNote: 'IEC 61850 सबस्टेशन ऑटोमेशन मानक आणि DNP3 टेलिमेट्री सिम्युलेशन.',
    nodeClickHint: 'तांत्रिक निदान तपासणीसाठी कोणत्याही सबस्टेशन, फीडर किंवा ट्रान्सफॉर्मरवर क्लिक करा',
    legendActiveFeeder: '१૧kV सक्रिय फीडर',
    legendDistributedSolar: 'वितरित सौर ऊर्जा',
    legendTrippedIsolated: 'ट्रिप झालेले / वेगळे केलेले',
    solarMicroGenBadge: 'सोलर मायक्रो-जनरेशन (१५०kWp)',
    solarSurplusExport: 'अतिरिक्त निर्यात: +१८०A',
    solarMiddayFeed: 'दुपारचे फीड: ६५A',

    forecastEngineTitle: 'AI ऊर्जा मागणी आणि लोड अंदाज इंजिन',
    forecastEngineSubtitle: 'डे-अहेड पॉवर शेड्यूलिंग (DAPS) साठी मशीन लर्निंग लोड प्रोजेक्शन. रिअल-टाइम ग्रिड वक्र पुनर्गणना पाहण्यासाठी हवामान आणि औद्योगिक लोड वाढ समायोजित करा.',
    btnResetBaseline: 'बेसलाइन रीसेट करा',
    labelAmbientTemp: 'परिसर तापमान',
    tempMildMonsoon: '२४°C (सौम्य मान्सून)',
    tempNormal: '३६°C (सामान्य)',
    tempHeatwave: '४५°C (उष्णतेची लाट)',
    labelAnnualLoadTrend: 'वार्षिक लोड कल घटक',
    growthShutdown: '-१०% (औद्योगिक बंद)',
    growthStandard: '+६% (मानक)',
    growthFestive: '+२५% (सण पीक)',
    labelDuckCurve: 'रूफटॉप सोलर ऑफसेट (डक कर्व)',
    descDuckCurve: 'दुपारी ७.४ MW सौर ऊर्जा बचतीचे अनुकरण करते',
    kpiPredictedPeakDemand: 'अंदाजित २४ तास पीक मागणी',
    peakAtHourPrefix: 'वेळी',
    peakVarianceDesc: 'मूळ प्रमाण ६८.२ MW होते (+{val} MW फरक)',
    kpiEstimatedEnergyReq: 'अंदाजित ऊर्जा आवश्यकता',
    descDayAheadSchedule: 'डे-अहेड खरेदी वेळापत्रक',
    kpiDayAheadBudget: 'डे-अहेड वीज खरेदी बजेट',
    descBaseTariff: '₹५.४२/kWh मूळ दरावर मोजलेले',
    dispatcherRecHeading: 'डिस्पॅचर शिफारस',
    recHeatwave: 'तीव्र उष्णतेची लाट इशारा. २०:०० - २३:०० वेळेसाठी सरदार सरोवर हायड्रो पीकिंग स्टेशनवरून १५ MW डे-अहेड राखीव आधीच बुक करा.',
    recSolarInjection: 'दुपारचे सौर ऊर्जा इंजेक्शन सबस्टेशन पीकमधून ७.४ MW कमी करते. कपात टाळण्यासाठी ११:०० - १५:०० दरम्यान थर्मल युनिट्स ११% कमी करा.',
    recDemandNormal: 'मागणी प्रोफाइल सामान्य आहे. करारातील GUVNL बेस थर्मल PPA स्पॉट मार्केटशिवाय ९४% नियोजित पुरवठा पूर्ण करतो.',
    chartForecastCurveTitle: 'पुढील २४ तास लोड वक्र: ऐतिहासिक प्रत्यक्ष वि AI अंदाज',
    chartConfidenceSubtitle: 'छायांकित क्षेत्र ९५% सांख्यिकीय विश्वासार्हता अंतराल दर्शवते (±४.५%)',
    legendHistoricalActual: 'ऐतिहासिक प्रत्यक्ष',
    legendForecastLoad: 'AI अंदाज (MW)',
    footerModelType: 'ग्रॅडिएंट बूस्टेड रिग्रेशन ट्री (GBRT) + तापमान विघटन',
    footerDeterministic: 'ऑपरेशन्स मूल्यांकनासाठी निश्चित सिम्युलेशन'
  }
};

export const getManagementUiDictionary = (lang: Language): ManagementUiDictionary => {
  return MANAGEMENT_UI_TRANSLATIONS[lang] || MANAGEMENT_UI_TRANSLATIONS.en;
};

/* ========================================================================= */
/* DYNAMIC PRESENTATION FORMATTERS & LOCALIZERS FOR MANAGEMENT PORTAL        */
/* ========================================================================= */

export function localizeBillingMonth(month: string, lang: Language): string {
  if (lang === 'en' || !month) return month;
  const match = month.match(/^([A-Za-z]{3})\s*(\d{2,4})?$/);
  if (!match) return month;
  const [, m, y] = match;
  const monthMap: Record<string, Record<Language, string>> = {
    Jan: { en: 'Jan', gu: 'જાન્યુ', hi: 'जनवरी', mr: 'जानेवारी' },
    Feb: { en: 'Feb', gu: 'ફેબ્રુ', hi: 'फरवरी', mr: 'फेब्रुवारी' },
    Mar: { en: 'Mar', gu: 'માર્ચ', hi: 'मार्च', mr: 'मार्च' },
    Apr: { en: 'Apr', gu: 'એપ્રિલ', hi: 'अप्रैल', mr: 'एप्रिल' },
    May: { en: 'May', gu: 'મે', hi: 'मई', mr: 'मे' },
    Jun: { en: 'Jun', gu: 'જૂન', hi: 'जून', mr: 'जून' },
    Jul: { en: 'Jul', gu: 'જુલાઈ', hi: 'जुलाई', mr: 'जुलै' },
    Aug: { en: 'Aug', gu: 'ઓગસ્ટ', hi: 'अगस्त', mr: 'ऑगस्ट' },
    Sep: { en: 'Sep', gu: 'સપ્ટે', hi: 'सितंबर', mr: 'सप्टेंबर' },
    Oct: { en: 'Oct', gu: 'ઓક્ટો', hi: 'अक्टूबर', mr: 'ऑक्टोबर' },
    Nov: { en: 'Nov', gu: 'નવે', hi: 'नवंबर', mr: 'नोव्हेंबर' },
    Dec: { en: 'Dec', gu: 'ડિસે', hi: 'दिसंबर', mr: 'डिसेंबर' }
  };
  const locM = monthMap[m]?.[lang] || m;
  return y ? `${locM} ${y}` : locM;
}

export function localizeFeederStatus(status: string, lang: Language): string {
  if (lang === 'en' || !status) return status;
  const normalized = status.toUpperCase().replace(/[\s_]+/g, '');
  if (normalized === 'CRITICALOVERLOAD') {
    return lang === 'gu' ? 'ગંભીર ઓવરલોડ' : lang === 'hi' ? 'गंभीर ओवरलोड' : 'गंभीर ओव्हरलोड';
  }
  if (normalized === 'WARNING' || normalized === 'HEAVYLOAD') {
    return lang === 'gu' ? 'ચેતવણી' : lang === 'hi' ? 'चेतावनी' : 'धोका इशारा';
  }
  if (normalized === 'OPTIMAL') {
    return lang === 'gu' ? 'શ્રેષ્ઠ' : lang === 'hi' ? 'सर्वोत्तम' : 'उत्तम';
  }
  return status;
}

export function localizeAiProposalRisk(risk: string, lang: Language): string {
  if (lang === 'en' || !risk) return risk;
  const map: Record<string, Record<Language, string>> = {
    CRITICAL: { en: 'CRITICAL', gu: 'ગંભીર (CRITICAL)', hi: 'गंभीर (CRITICAL)', mr: 'अति-गंभीर (CRITICAL)' },
    HIGH: { en: 'HIGH', gu: 'ઉચ્ચ (HIGH)', hi: 'उच्च (HIGH)', mr: 'उच्च (HIGH)' },
    MEDIUM: { en: 'MEDIUM', gu: 'મધ્યમ (MEDIUM)', hi: 'मध्यम (MEDIUM)', mr: 'मध्यम (MEDIUM)' },
    LOW: { en: 'LOW', gu: 'ઓછું (LOW)', hi: 'निम्न (LOW)', mr: 'कमी (LOW)' }
  };
  return map[risk.toUpperCase()]?.[lang] || risk;
}

export function localizeAiProposalStatus(status: string, lang: Language): string {
  if (lang === 'en' || !status) return status;
  const map: Record<string, Record<Language, string>> = {
    PENDING_APPROVAL: { en: 'PENDING_APPROVAL', gu: 'મંજૂરી બાકી', hi: 'स्वीकृति प्रतीक्षारत', mr: 'मंजुरी प्रलंबित' },
    EXECUTED: { en: 'EXECUTED', gu: 'અમલમાં મુકાયેલ', hi: 'निष्पादित', mr: 'अमलात आणले' },
    REJECTED: { en: 'REJECTED', gu: 'અસ્વીકૃત', hi: 'अस्वीकृत', mr: 'नाकारले' }
  };
  return map[status]?.[lang] || status;
}

export function localizeAiProposalTitle(title: string, lang: Language): string {
  if (lang === 'en' || !title) return title;
  const map: Record<string, Record<Language, string>> = {
    'Grant 25 kW Commercial Sanction for Mehsana Milk Union (APP-2026-0844)': {
      en: 'Grant 25 kW Commercial Sanction for Mehsana Milk Union (APP-2026-0844)',
      gu: 'મહેસાણા મિલ્ક યુનિયન (APP-2026-0844) માટે ૨૫ kW વાણિજ્યિક મંજૂરી આપો',
      hi: 'मेहसाणा मिल्क यूनियन (APP-2026-0844) हेतु 25 kW वाणिज्यिक स्वीकृति प्रदान करें',
      mr: 'मेहसाणा मिल्क युनियन (APP-2026-0844) साठी २५ kW व्यावसायिक मंजुरी द्या'
    },
    'Emergency 11kV Feeder Reconfiguration for Feeder FDR-MEH-11KV-02': {
      en: 'Emergency 11kV Feeder Reconfiguration for Feeder FDR-MEH-11KV-02',
      gu: 'ફીડર FDR-MEH-11KV-02 માટે કટોકટી ૧૧kV ફીડર પુનઃરૂપરેખાંકન',
      hi: 'फीडर FDR-MEH-11KV-02 हेतु आपातकालीन 11kV फीडर पुनर्संरचना',
      mr: 'फीडर FDR-MEH-11KV-02 साठी तातडीचे ११kV फीडर पुनर्रचना'
    },
    'Approve ₹48,500 Security Deposit Refund for Acct #2019-8812': {
      en: 'Approve ₹48,500 Security Deposit Refund for Acct #2019-8812',
      gu: 'ખાતા #2019-8812 માટે ₹૪૮,૫૦૦ સુરક્ષા ડિપોઝિટ રિફંડ મંજૂર કરો',
      hi: 'खाता #2019-8812 हेतु ₹48,500 सुरक्षा जमा वापसी स्वीकृत करें',
      mr: 'खाते #2019-8812 साठी ₹४८,५०० सुरक्षा ठेव परतावा मंजूर करा'
    }
  };
  return map[title]?.[lang] || title;
}

export function localizeAiReasoning(reasoning: string, lang: Language): string {
  if (lang === 'en' || !reasoning) return reasoning;
  const map: Record<string, Record<Language, string>> = {
    'Field inspection by JE Solanki confirmed adequate transformer headroom (500 kVA transformer at 62% load). No grid constraint.': {
      en: 'Field inspection by JE Solanki confirmed adequate transformer headroom (500 kVA transformer at 62% load). No grid constraint.',
      gu: 'JE સોલંકી દ્વારા ફિલ્ડ નિરીક્ષણમાં પર્યાપ્ત ટ્રાન્સફોર્મર હેડરૂમની પુષ્ટિ થઈ (૫૦૦ kVA ટ્રાન્સફોર્મર ૬૨% લોડ પર). કોઈ ગ્રીડ અવરોધ નથી.',
      hi: 'JE सोलंकी द्वारा फील्ड निरीक्षण में पर्याप्त ट्रांसफॉर्मर हेडरूम की पुष्टि (500 kVA ट्रांसफॉर्मर 62% लोड पर)। कोई ग्रिड बाधा नहीं।',
      mr: 'JE सोळंकी यांच्या फील्ड तपासणीत पुरेशा ट्रान्सफॉर्मर क्षमतेची पुष्टी (५०० kVA ट्रान्सफॉर्मर ६२% लोडवर). कोणतीही ग्रिड मर्यादा नाही.'
    },
    'SCADA indicates 108% load on primary circuit. Shifting load to Kadi rural line prevents thermal trip.': {
      en: 'SCADA indicates 108% load on primary circuit. Shifting load to Kadi rural line prevents thermal trip.',
      gu: 'SCADA પ્રાથમિક સર્કિટ પર ૧૦૮% લોડ દર્શાવે છે. કડી ગ્રામીણ લાઇન પર લોડ શિફ્ટ કરવાથી થર્મલ ટ્રીપ અટકે છે.',
      hi: 'SCADA प्राथमिक सर्किट पर 108% लोड दर्शाता है। कडी ग्रामीण लाइन पर लोड स्थानांतरित करने से थर्मल ट्रिप रुकती है।',
      mr: 'SCADA प्राथमिक सर्किटवर १०८% लोड दर्शवतो. कडी ग्रामीण लाईनवर लोड वळवल्याने थर्मल ट्रिप टळते.'
    },
    'Final bill settled, meter disconnected and returned to store on 12/04/2026. Audit verified zero pending arrears.': {
      en: 'Final bill settled, meter disconnected and returned to store on 12/04/2026. Audit verified zero pending arrears.',
      gu: 'અંતિમ બિલ ચૂકવાઈ ગયું, મીટર ડિસ્કનેક્ટ કરીને ૧૨/૦૪/૨૦૨૬ ના રોજ જમા કરાયું. ઑડિટે શૂન્ય બાકી લેણાં ચકાસ્યા.',
      hi: 'अंतिम बिल चुकता, मीटर डिस्कनेक्ट कर 12/04/2026 को स्टोर में जमा। ऑडिट ने शून्य बकाया सत्यापित किया।',
      mr: 'अंतिम बिल भरले, मीटर डिस्कनेक्ट करून १२/०४/२०२६ रोजी स्टोअरमध्ये जमा. ऑडिटने शून्य थकबाकी सत्यापित केली.'
    }
  };
  return map[reasoning]?.[lang] || reasoning;
}

export interface LocalizedScenarioText {
  title: string;
  badge: string;
  description: string;
  recommendation: string;
}

export function localizeDigitalTwinScenario(scenarioKey: string, lang: Language): LocalizedScenarioText {
  const data: Record<string, Record<Language, LocalizedScenarioText>> = {
    normal: {
      en: {
        title: 'Normal Grid Balance (Standard Supply)',
        badge: 'Balanced · 50.02 Hz',
        description: 'All three 11kV primary feeders operating within 68% rated capacity. System voltages steady at 230V / 415V with power factor 0.96.',
        recommendation: 'All automated reclosers armed. Optimal distribution state with zero active feeder alarms.'
      },
      gu: {
        title: 'સામાન્ય ગ્રીડ સંતુલન (પ્રમાણભૂત પુરવઠો)',
        badge: 'સંતુલિત · ૫૦.૦૨ Hz',
        description: 'તમામ ત્રણ ૧૧kV પ્રાથમિક ફીડર ૬૮% રેટ કરેલ ક્ષમતામાં કાર્યરત છે. પાવર ફેક્ટર ૦.૯૬ સાથે સિસ્ટમ વોલ્ટેજ ૨૩૦V / ૪૧૫V પર સ્થિર છે.',
        recommendation: 'તમામ સ્વચાલિત રીક્લોઝર સક્રિય. શૂન્ય સક્રિય ફીડર એલાર્મ સાથે શ્રેષ્ઠ વિતરણ સ્થિતિ.'
      },
      hi: {
        title: 'सामान्य ग्रिड संतुलन (मानक आपूर्ति)',
        badge: 'संतुलित · 50.02 Hz',
        description: 'तीनों 11kV प्राथमिक फीडर 68% रेटेड क्षमता के भीतर काम कर रहे हैं। पावर फैक्टर 0.96 के साथ सिस्टम वोल्टेज 230V / 415V पर स्थिर।',
        recommendation: 'सभी स्वचालित रीक्लोजर सक्रिय। शून्य सक्रिय फीडर अलार्म के साथ सर्वोत्तम वितरण स्थिति।'
      },
      mr: {
        title: 'सामान्य ग्रिड संतुलन (मानक पुरवठा)',
        badge: 'संतुलित · ५०.०२ Hz',
        description: 'सर्व तीन ११kV प्राथमिक फीडर ६८% रेटेड क्षमतेत कार्यरत आहेत. पॉवर फॅक्टर ०.९६ सह सिस्टम व्होल्टेज २३०V / ४१५V वर स्थिर.',
        recommendation: 'सर्व स्वयंचलित रीक्लोजर्स सज्ज. शून्य सक्रिय अलार्मसह सर्वोत्तम वितरण स्थिती.'
      }
    },
    peak: {
      en: {
        title: 'Evening Peak Demand Surge (19:00 - 22:00)',
        badge: 'High Load · 49.88 Hz',
        description: 'Residential cooling and domestic lighting surge increases aggregate Mehsana load by 38%. Feeder-1 utilization hits 94%.',
        recommendation: 'Engaged capacitor bank stage 2. Load dispatch center monitoring reserve margin.'
      },
      gu: {
        title: 'સાંજનો પીક માંગ વધારો (૧૯:૦૦ - ૨૨:૦૦)',
        badge: 'ઉચ્ચ લોડ · ૪૯.૮૮ Hz',
        description: 'રહેણાંક કૂલિંગ અને ઘરેલુ લાઇટિંગથી મહેસાણાનો કુલ લોડ ૩૮% વધ્યો છે. ફીડર-૧ નો વપરાશ ૯૪% પર પહોંચ્યો છે.',
        recommendation: 'કેપેસિટર બેંક સ્ટેજ ૨ સક્રિય કરી. લોડ ડિસ્પેચ સેન્ટર રિઝર્વ માર્જિનનું નિરીક્ષણ કરી રહ્યું છે.'
      },
      hi: {
        title: 'शाम की पीक मांग में उछाल (19:00 - 22:00)',
        badge: 'उच्च लोड · 49.88 Hz',
        description: 'आवासीय कूलिंग और घरेलू लाइटिंग से मेहसाणा का कुल लोड 38% बढ़ा। फीडर-1 उपयोग 94% पर पहुंचा।',
        recommendation: 'कैपेसिटर बैंक स्टेज 2 सक्रिय। लोड डिस्पैच सेंटर रिजर्व मार्जिन की निगरानी कर रहा है।'
      },
      mr: {
        title: 'संध्याकाळचा पीक मागणी वाढ (१९:०० - २२:००)',
        badge: 'उच्च भार · ४९.८८ Hz',
        description: 'निवासी कुलिंग आणि घरगुती लाइटिंगमुळे मेहसाणाचा एकूण लोड ३८% वाढला. फीडर-१ वापर ९४% वर पोहोचला.',
        recommendation: 'कॅपॅसिटर बँक स्टेज २ कार्यान्वित. लोड डिस्पॅच केंद्र राखीव मार्जिनचे निरीक्षण करत आहे.'
      }
    },
    overload: {
      en: {
        title: 'Distribution Transformer Thermal Overload (DTR-08)',
        badge: 'Thermal Alarm · 88°C',
        description: 'DTR-08 (Agricultural Tubewell Cluster) exceeded rated 100kVA capacity due to synchronized motor start. Winding temp at 88°C.',
        recommendation: 'Automatic SCADA alert dispatched to Lineman Vikramaditya Solanki. Auto-staggering agricultural pump feeders.'
      },
      gu: {
        title: 'ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર થર્મલ ઓવરલોડ (DTR-08)',
        badge: 'થર્મલ એલાર્મ · ૮૮°C',
        description: 'કૃષિ ટ્યુબવેલ મોટર એકસાથે ચાલુ થવાથી DTR-08 રેટ કરેલ ૧૦૦kVA ક્ષમતા ઓળંગી ગયું. વાઇન્ડિંગ તાપમાન ૮૮°C પર.',
        recommendation: 'લાઇનમેન વિક્રમાદિત્ય સોલંકીને સ્વચાલિત SCADA ચેતવણી મોકલી. કૃષિ પંપ ફીડર્સનું ઓટો-સ્ટેગરિંગ શરૂ.'
      },
      hi: {
        title: 'वितरण ट्रांसफॉर्मर थर्मल ओवरलोड (DTR-08)',
        badge: 'थर्मल अलार्म · 88°C',
        description: 'कृषि ट्यूबवेल मोटर एक साथ शुरू होने से DTR-08 ने 100kVA रेटेड क्षमता पार कर ली। वाइंडिंग तापमान 88°C पर।',
        recommendation: 'लाइनमैन विक्रमादित्य सोलंकी को स्वचालित SCADA अलर्ट भेजा गया। कृषि पंप फीडर का ऑटो-स्टैगरिंग शुरू।'
      },
      mr: {
        title: 'वितरण ट्रान्सफॉर्मर थर्मल ओव्हरलोड (DTR-08)',
        badge: 'थर्मल अलार्म · ८८°C',
        description: 'कृषी पंप मोटर एकाच वेळी सुरू झाल्याने DTR-08 ने १००kVA रेटेड क्षमता ओलांडली. वाइंडिंग तापमान ८८°C वर.',
        recommendation: 'लाइनमन विक्रमादित्य सोळंकी यांना स्वयंचलित SCADA इशारा पाठवला. कृषी पंप फीडर्सचे ऑटो-स्टॅगरिंग सुरू.'
      }
    },
    outage: {
      en: {
        title: '11kV Feeder Tripped / Tree Branch Fault',
        badge: 'VCB Tripped · Auto-Isolated',
        description: 'Vacuum Circuit Breaker VCB-03 tripped on overcurrent at 11kV Visnagar Road Feeder due to conductor short. 1,420 consumers affected.',
        recommendation: 'Automated Ring Main Unit (RMU) isolated faulted section DP-14. Re-routing un-faulted segments via Radhanpur Tie-Switch.'
      },
      gu: {
        title: '૧૧kV ફીડર ટ્રીપ / વૃક્ષની ડાળી પડવાની ખામી',
        badge: 'VCB ટ્રીપ · સ્વચાલિત અલગ',
        description: 'કંડક્ટર શોર્ટ થવાને કારણે ૧૧kV વિસનગર રોડ ફીડર પર વેક્યૂમ સર્કિટ બ્રેકર VCB-03 ટ્રીપ થયું. ૧,૪૨૦ ગ્રાહકો પ્રભાવિત.',
        recommendation: 'ઓટોમેટેડ રિંગ મેઇન યુનિટે ફોલ્ટ સેક્શન DP-14 અલગ કર્યું. રાધનપુર ટાઈ-સ્વિચ દ્વારા બિન-ખામીયુક્ત સેગમેન્ટ્સ રી-રૂટ કર્યા.'
      },
      hi: {
        title: '11kV फीडर ट्रिप / पेड़ की शाखा गिरने से खराबी',
        badge: 'VCB ट्रिप · ऑटो-आइसोलेटेड',
        description: 'कंडक्टर शॉर्ट के कारण 11kV विसनगर रोड फीडर पर वैक्यूम सर्किट ब्रेकर VCB-03 ट्रिप हुआ। 1,420 उपभोक्ता प्रभावित।',
        recommendation: 'स्वचालित रिंग मेन यूनिट ने फॉल्ट सेक्शन DP-14 अलग किया। राधनपुर टाई-स्विच द्वारा बिजली पुनः मार्गित।'
      },
      mr: {
        title: '११kV फीडर ट्रिप / झाडाची फांदी पडल्याने बिघाड',
        badge: 'VCB ट्रिप · स्वयंचलित अलग',
        description: 'कंडक्टर शॉर्टमुळे ११kV विसनगर रोड फीडरवरील व्हॅक्यूम सर्किट ब्रेकर VCB-03 ट्रिप झाले. १,४२० ग्राहक बाधित.',
        recommendation: 'स्वयंचलित रिंग मेन युनिटने बिघाड असलेला DP-14 वेगळा केला. राधनपूर टाय-स्वीचद्वारे पुरवठा सुरळीत केला.'
      }
    },
    solar: {
      en: {
        title: 'Distributed Rooftop Solar Reverse-Feed Surge',
        badge: 'Midday Solar · Reverse Flow',
        description: 'Midday clear sky at 13:00 generates 4.8 MW surplus solar feed-in from residential & agricultural grid-tied inverters. Local voltage spikes.',
        recommendation: 'Substation On-Load Tap Changer (OLTC) stepped down 1 tap (-1.25%) to maintain 230V statutory boundary.'
      },
      gu: {
        title: 'વિતરિત રૂફટોપ સોલાર રિવર્સ-ફીડ વધારો',
        badge: 'બપોરનો સોલાર · રિવર્સ પ્રવાહ',
        description: 'બપોરે ૧૩:૦૦ વાગ્યે ચોખ્ખા આકાશથી રહેણાંક અને કૃષિ ઇન્વર્ટરથી ૪.૮ MW વધારાની સોલાર ઊર્જા ઉત્પન્ન થઈ. સ્થાનિક વોલ્ટેજ વધ્યો.',
        recommendation: '૨૩૦V ની વૈધાનિક મર્યાદા જાળવવા સબસ્ટેશન ઓન-લોડ ટેપ ચેન્જર (OLTC) ૧ ટેપ (-૧.૨૫%) ઘટાડ્યું.'
      },
      hi: {
        title: 'वितरित रूफटॉप सोलर रिवर्स-फीड उछाल',
        badge: 'दोपहर सौर · उल्टा प्रवाह',
        description: 'दोपहर 13:00 बजे स्वच्छ धूप से आवासीय और कृषि इनवर्टर से 4.8 MW अतिरिक्त सौर ऊर्जा ग्रिड में आई। स्थानीय वोल्टेज बढ़ा।',
        recommendation: '230V की वैधानिक सीमा बनाए रखने हेतु सबस्टेशन ऑन-लोड टैप चेंजर (OLTC) 1 टैप (-1.25%) घटाया गया।'
      },
      mr: {
        title: 'रूफटॉप सोलर रिव्हर्स-फीड वाढ',
        badge: 'दुपारचे सौर · उलट प्रवाह',
        description: 'दुपारी १३:०० वाजता निवासी आणि कृषी इन्व्हर्टरमधून ४.८ MW अतिरिक्त सौर ऊर्जा ग्रिडमध्ये आली. स्थानिक व्होल्टेज वाढला.',
        recommendation: '२३०V वैधानिक मर्यादा राखण्यासाठी सबस्टेशन ऑन-लोड टॅप चेंजर (OLTC) १ टॅप (-१.२५%) कमी केला.'
      }
    },
    maintenance: {
      en: {
        title: 'Permit-to-Work (PTW) Scheduled Maintenance',
        badge: 'Safe Isolation · Earthing Closed',
        description: 'Planned feeder reconductoring and DT bushing replacement on Feeder-2. Lineman team active with certified earth grounding.',
        recommendation: 'Permit-to-Work PTW-8819 logged in ERP. Consumer outage notifications broadcasted via SMS simulation.'
      },
      gu: {
        title: 'પરમિટ-ટુ-વર્ક (PTW) નિર્ધારિત જાળવણી',
        badge: 'સુરક્ષિત આઇસોલેશન · અર્થિંગ બંધ',
        description: 'ફીડર-૨ પર કંડક્ટર બદલવા અને DT બુશિંગ બદલવાની આયોજિત કામગીરી. પ્રમાણિત ગ્રાઉન્ડિંગ સાથે લાઇનમેન ટીમ સક્રિય.',
        recommendation: 'પરમિટ-ટુ-વર્ક PTW-8819 ERP માં નોંધાયેલ. ગ્રાહક વીજ કાપ સૂચના SMS સિમ્યુલેશન દ્વારા પ્રસારિત.'
      },
      hi: {
        title: 'परमिट-टू-वर्क (PTW) निर्धारित रखरखाव',
        badge: 'सुरक्षित अलगाव · अर्थिंग बंद',
        description: 'फीडर-2 पर नियोजित कंडक्टर बदलने एवं DT बुशिंग नवीनीकरण। प्रमाणित अर्थ ग्राउंडिंग के साथ लाइनमैन दल सक्रिय।',
        recommendation: 'परमिट-टू-वर्क PTW-8819 ERP में दर्ज। उपभोक्ता बिजली कटौती सूचना SMS सिमुलेशन द्वारा प्रसारित।'
      },
      mr: {
        title: 'परमिट-टू-वर्क (PTW) नियोजित देखभाल',
        badge: 'सुरक्षित अलगता · अर्थिंग बंद',
        description: 'फीडर-२ वर कंडक्टर बदलणे आणि DT बुशिंग बदलण्याचे काम. प्रमाणित अर्थ ग्राउंडिंगसह लाइनमन पथक सक्रिय.',
        recommendation: 'परमिट-टू-वर्क PTW-8819 ERP मध्ये नोंदवले. ग्राहक वीज खंडित सूचना SMS सिम्युलेशनद्वारे प्रसारित.'
      }
    }
  };
  return data[scenarioKey]?.[lang] || data.normal.en;
}

export interface LocalizedNodeInspection {
  name: string;
  voltage: string;
  protectionRelay: string;
  notes: string;
}

export function localizeEquipmentCatalogNode(
  nodeKey: string,
  rawVoltage: string,
  lang: Language
): LocalizedNodeInspection {
  const catalog: Record<string, Record<Language, LocalizedNodeInspection>> = {
    substation: {
      en: {
        name: 'Mehsana City North 66/11kV Substation',
        voltage: rawVoltage,
        protectionRelay: 'Differential 87T & Overcurrent 50/51 Numerical Relay',
        notes: 'Dual 15 MVA Power Transformers stepping down GETCO 66kV transmission grid.'
      },
      gu: {
        name: 'મહેસાણા સિટી ઉત્તર ૬૬/૧૧kV સબસ્ટેશન',
        voltage: rawVoltage,
        protectionRelay: 'ડિફરન્શિયલ 87T અને ઓવરકરન્ટ 50/51 ન્યુમેરિકલ રિલે',
        notes: 'GETCO ૬૬kV ટ્રાન્સમિશન ગ્રીડમાંથી સ્ટેપ-ડાઉન કરતા બેવડા ૧૫ MVA પાવર ટ્રાન્સફોર્મર.'
      },
      hi: {
        name: 'मेहसाणा सिटी उत्तर 66/11kV सबस्टेशन',
        voltage: rawVoltage,
        protectionRelay: 'डिफरेंशियल 87T एवं ओवरकरंट 50/51 न्यूमेरिकल रिले',
        notes: 'GETCO 66kV ट्रांसमिशन ग्रिड से स्टेप-डाउन करने वाले दोहरे 15 MVA पावर ट्रांसफॉर्मर।'
      },
      mr: {
        name: 'मेहसाणा सिटी उत्तर ६६/११kV सबस्टेशन',
        voltage: rawVoltage,
        protectionRelay: 'डिफरेंशियल 87T आणि ओव्हरकरंट 50/51 न्यूमेरिकल रिले',
        notes: 'GETCO ६६kV ट्रान्समिशन ग्रिडमधून स्टेप-डाउन करणारे दुहेरी १५ MVA पॉवर ट्रान्सफॉर्मर्स.'
      }
    },
    feeder1: {
      en: {
        name: '11kV Visnagar Road Feeder',
        voltage: rawVoltage,
        protectionRelay: 'ABB REF615 Feeder Protection & Automation Unit',
        notes: 'Supplies 1,420 consumers across residential societies and commercial markets.'
      },
      gu: {
        name: '૧૧kV વિસનગર રોડ ફીડર',
        voltage: rawVoltage,
        protectionRelay: 'ABB REF615 ફીડર પ્રોટેક્શન અને ઓટોમેશન યુનિટ',
        notes: 'રહેણાંક સોસાયટીઓ અને વાણિજ્યિક બજારોમાં ૧,૪૨૦ ગ્રાહકોને વીજ પુરવઠો પૂરો પાડે છે.'
      },
      hi: {
        name: '11kV विसनगर रोड फीडर',
        voltage: rawVoltage,
        protectionRelay: 'ABB REF615 फीडर सुरक्षा एवं स्वचालन इकाई',
        notes: 'आवासीय सोसायटियों एवं वाणिज्यिक बाजारों में 1,420 उपभोक्ताओं को आपूर्ति करता है।'
      },
      mr: {
        name: '११kV विसनगर रोड फीडर',
        voltage: rawVoltage,
        protectionRelay: 'ABB REF615 फीडर संरक्षण आणि ऑटोमेशन युनिट',
        notes: 'निवासी सोसायट्या आणि व्यावसायिक बाजारपेठांमधील १,४२० ग्राहकांना वीज पुरवठा करतो.'
      }
    },
    feeder2: {
      en: {
        name: '11kV GIDC Industrial Express Feeder',
        voltage: rawVoltage,
        protectionRelay: 'Schneider Micom P122 Numerical Relay',
        notes: 'Dedicated 3-phase feeder serving MSME fabrication and plastic manufacturing units.'
      },
      gu: {
        name: '૧૧kV GIDC ઔદ્યોગિક એક્સપ્રેસ ફીડર',
        voltage: rawVoltage,
        protectionRelay: 'શ્નાઇડર માઇકોમ P122 ન્યુમેરિકલ રિલે',
        notes: 'MSME ફેબ્રિકેશન અને પ્લાસ્ટિક ઉત્પાદન એકમોને સેવા આપતો સમર્પિત ૩-ફેઝ ફીડર.'
      },
      hi: {
        name: '11kV GIDC औद्योगिक एक्सप्रेस फीडर',
        voltage: rawVoltage,
        protectionRelay: 'श्नाइडर माइकोम P122 न्यूमेरिकल रिले',
        notes: 'MSME फैब्रिकेशन एवं प्लास्टिक निर्माण इकाइयों को आपूर्ति करने वाला समर्पित 3-फेज फीडर।'
      },
      mr: {
        name: '११kV GIDC औद्योगिक एक्सप्रेस फीडर',
        voltage: rawVoltage,
        protectionRelay: 'श्नाइडर मायकॉम P122 न्यूमेरिकल रिले',
        notes: 'MSME फॅब्रिकेशन आणि प्लास्टिक उत्पादन युनिट्सना सेवा देणारा समर्पित ३-फेज फीडर.'
      }
    },
    dtr08: {
      en: {
        name: '100kVA Distribution Transformer (Agri Cluster)',
        voltage: rawVoltage,
        protectionRelay: 'Horn Gap (HG) Fuse 15A & Thermal Sensor Link',
        notes: 'Powers 18 agricultural irrigation tubewells. High reactive load during synchronized pump duty.'
      },
      gu: {
        name: '૧૦૦kVA ડિસ્ટ્રિબ્યુશન ટ્રાન્સફોર્મર (કૃષિ ક્લસ્ટર)',
        voltage: rawVoltage,
        protectionRelay: 'હોર્ન ગેપ (HG) ફ્યુઝ ૧૫A અને થર્મલ સેન્સર લિંક',
        notes: '૧૮ કૃષિ સિંચાઈ ટ્યુબવેલને પાવર આપે છે. પંપ શરૂ થવાના સમયે ઉચ્ચ પ્રતિક્રિયાશીલ લોડ.'
      },
      hi: {
        name: '100kVA वितरण ट्रांसफॉर्मर (कृषि क्लस्टर)',
        voltage: rawVoltage,
        protectionRelay: 'हॉर्न गैप (HG) फ्यूज 15A एवं थर्मल सेंसर लिंक',
        notes: '18 कृषि सिंचाई ट्यूबवेल को बिजली देता है। पंप चलने के दौरान उच्च रिएक्टिव लोड।'
      },
      mr: {
        name: '१००kVA वितरण ट्रान्सफॉर्मर (कृषी क्लस्टर)',
        voltage: rawVoltage,
        protectionRelay: 'हॉर्न गॅप (HG) फ्युज १५A आणि थर्मल सेन्सर लिंक',
        notes: '१८ कृषी सिंचन कूपनलिकांना वीज पुरवतो. पंप सुरू असताना उच्च रिअॅक्टिव्ह लोड.'
      }
    },
    solarUnit: {
      en: {
        name: '150kWp Rooftop Solar Micro-Generator',
        voltage: rawVoltage,
        protectionRelay: 'Anti-Islanding Protection (IEEE 1547 compliant)',
        notes: 'Surplus power fed back into UGVCL grid under Gujarat Net-Metering Policy.'
      },
      gu: {
        name: '૧૫૦kWp રૂફટોપ સોલાર માઇક્રો-જનરેટર',
        voltage: rawVoltage,
        protectionRelay: 'એન્ટી-આઇલેન્ડિંગ પ્રોટેક્શન (IEEE 1547 સુસંગત)',
        notes: 'ગુજરાત નેટ-મીટરિંગ નીતિ હેઠળ વધારાની વીજળી UGVCL ગ્રીડમાં પાછી આપવામાં આવે છે.'
      },
      hi: {
        name: '150kWp रूफटॉप सोलर माइक्रो-जनरेटर',
        voltage: rawVoltage,
        protectionRelay: 'एंटी-आइलैंडिंग सुरक्षा (IEEE 1547 अनुपालक)',
        notes: 'गुजरात नेट-मीटरिंग नीति के तहत अधिशेष बिजली UGVCL ग्रिड में वापस भेजी जाती है।'
      },
      mr: {
        name: '१५०kWp रूफटॉप सोलर मायक्रो-जनरेटर',
        voltage: rawVoltage,
        protectionRelay: 'अँटी-आयलंडिंग संरक्षण (IEEE 1547 सुसंगत)',
        notes: 'गुजरात नेट-मीटरिंग धोरणाअंतर्गत अतिरिक्त वीज UGVCL ग्रिडमध्ये परत दिली जाते.'
      }
    }
  };
  return catalog[nodeKey]?.[lang] || catalog.substation.en;
}

