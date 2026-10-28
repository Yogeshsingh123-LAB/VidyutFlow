import assert from 'node:assert/strict';
import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import { LanguageCode, TranslationDictionary } from '../src/i18n/types';
import {
  FIELD_UI_TRANSLATIONS,
  localizeFeederName,
  localizeFeederStatus,
  localizeTerminalCondition,
  localizeSealStatus,
  localizeFieldTechnicianRemarks,
} from '../src/i18n/fieldContentTranslations';
import {
  localizeEmployeeDesignation,
  localizeFieldEngineerStatus,
  localizePriorityLevel,
  localizeWorkOrderType,
  localizeWorkOrderStatus,
  localizeWorkOrderTitle,
  localizeWorkOrderScheduledDate,
  localizeWorkOrderMaterial,
  localizeAssignedActorName,
  localizeIncidentAccessDenialReason,
  localizeToastMessage,
} from '../src/i18n/employeeContentTranslations';
import {
  localizeSubdivision,
  localizeConsumerAddress,
  localizeApplicationStatus,
  localizeApplicationNote,
  localizeComplaintCategory,
  localizeComplaintStatus,
  localizeComplaintDescription,
  localizeConsumerTimelineStage,
  localizeConsumerTimelineRemark,
  localizeConsumerNotification,
  localizeNotificationDateGroupHeader,
  localizeNotificationStatusBadge,
} from '../src/i18n/consumerContentTranslations';
import {
  localizeIncident,
  localizeIncidentTitle,
  localizeIncidentDescription,
  localizeIncidentSopAction,
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentAuditStage,
  localizeIncidentApprovalDecision,
  localizeEmergencyClassification,
  localizeAuditTrailNote,
  localizeIncidentNotification,
} from '../src/i18n/incidentLocalization';
import {
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_FIELD_ENGINEERS,
  INITIAL_NOTIFICATIONS,
  FEEDER_METRICS,
} from '../src/data/mockData';
import { detectAnomalies, authorizeIncidentModalAccess } from '../src/utils/anomalyDetector';
import { CriticalIncident, AppNotification } from '../src/types';

const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = { en, gu, hi, mr };
const LANGUAGES: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];
const NON_EN_LANGUAGES: LanguageCode[] = ['gu', 'hi', 'mr'];

// Explicit English leak phrases that MUST NEVER appear in gu/hi/mr Field Engineer Portal outputs
const FORBIDDEN_FIELD_ENGLISH_PHRASES = [
  'Field Operations Console & Inspection App',
  'Report Feeder / DTR Hazard',
  'Simulated Offline',
  'Online (4G AMR)',
  'OFFLINE FIELD BUFFER ACTIVE',
  'Local Queue Ready',
  'UI Simulation Only',
  'Report Field Feeder / DTR Hazard',
  'Target Feeder Corridor',
  'Detected Hazard Type',
  'Transformer Overheating / Thermal Runaway',
  '11kV Feeder Overload / Conductor Sagging',
  'Feeder Tripping / Conductor Break Outage',
  'Field Observations & Safety Hazard Remarks',
  'Transmit Critical Alert',
  'Assigned Work Orders Today',
  'Emergency Fault Callouts',
  'Completed Inspections',
  'Synchronized with Sub-division',
  'Assigned Field Incidents & Priority Callouts',
  'Targeted Dispatch',
  'Review Assignment',
  'Inspect Feeder Telemetry',
  "Today's Field Itinerary & Tasks",
  'View All Work Orders',
  'Perform Inspection',
  'Assigned Work Orders',
  'Enter Inspection Findings',
  'Inspection Findings Recorded',
  'Field Site Inspection & Feasibility Report',
  'Scanned Meter Serial / Barcode',
  'Verified Meter Reading (kWh)',
  'Holographic Optical Seal Status',
  'Seal Intact & Verified',
  'Seal Broken / Suspicious',
  'Terminal Block Condition',
  'Normal Condition',
  'Burnt / Flashover Marks',
  'Loose Neutral Connection',
  'Tested Phase Voltages (Volts AC)',
  'Site Photo Evidence (Mobile Camera Preview)',
  'Geotag Timestamp Verified',
  'Technician Observations & Rectification Remarks',
  'Sign & Transmit Inspection Report',
  'Simulated Offline Queue Status',
  'Simulate Sync Now',
  'Synced to Server',
  'Pending Background Push',
  '11kV Feeder Patrol & Line Corridor Surveillance',
  'Monitored 11kV Feeders',
  'Feeders Requiring Attention',
  'Open Field Work Orders',
  'Conductor Load Utilization',
  'No open fault callouts on this feeder',
  'Log Patrol Check',
  'Completed Jobs & Inspection History',
  'Recorded Site Inspection Report',
  'No Completed Work Orders Yet',
  'Field Dispatch Controls for',
  'Step 1: Assignment Acceptance',
  'Accept Assignment & Mobilize',
  'Decline Assignment',
  'Mandatory Reason for Declining',
  'Confirm Decline (Alert Employee)',
  'Step 2: On-Site Inspection & Findings',
  'Start On-Site Physical Inspection',
  'Record Technical Findings & Measured Readings',
  'Transmit Findings to Operations Desk',
  'Request Additional Crew or Heavy Equipment',
  'Request Specialized Assistance',
  'Submit Final Resolution Report & Clear Fault',
  'This incident is already marked RESOLVED',
];

function checkForbiddenEnglishPhrases(text: string, lang: LanguageCode, context: string) {
  if (lang === 'en') return;
  for (const phrase of FORBIDDEN_FIELD_ENGLISH_PHRASES) {
    if (phrase.length >= 6 && text.toLowerCase().includes(phrase.toLowerCase())) {
      assert.fail(`[${lang}] Forbidden English phrase "${phrase}" leaked in ${context}: "${text}"`);
    }
  }
}

console.log('=== VIDYUTFLOW COMPLETE FIELD ENGINEER PORTAL 4-LANGUAGE LOCALIZATION VERIFICATION ===\n');

// ---------------------------------------------------------------------------
// TEST 1: Dictionary Completeness & Key Parity Across en, gu, hi, mr
// ---------------------------------------------------------------------------
console.log('1. Verifying Field Engineer UI dictionary key parity and non-empty translations (en, gu, hi, mr)...');
const enFieldKeys = Object.keys(FIELD_UI_TRANSLATIONS.en) as Array<keyof typeof FIELD_UI_TRANSLATIONS.en>;
assert.ok(enFieldKeys.length >= 150, `Expected at least 150 Field UI keys, found ${enFieldKeys.length}`);

for (const lang of LANGUAGES) {
  const dict = TRANSLATIONS[lang].field;
  assert.ok(dict, `Missing field dictionary for language: ${lang}`);
  for (const key of enFieldKeys) {
    const val = dict[key];
    assert.ok(typeof val === 'string' && val.trim().length > 0, `[${lang}] Missing or empty field key: ${String(key)}`);
    if (lang !== 'en') {
      // Allow pure technical units or punctuation-only suffixes like 'DTs' and ').'
      if (key !== 'unitDts' && key !== 'fallbackWorkOrderCompletedSuffix') {
        assert.notEqual(
          val,
          FIELD_UI_TRANSLATIONS.en[key],
          `[${lang}] Field key "${String(key)}" is identical to English: "${val}"`
        );
      }
      checkForbiddenEnglishPhrases(val, lang, `t.field.${String(key)}`);
    }
  }
}
console.log(`   ✓ All ${enFieldKeys.length} Field Engineer UI dictionary keys verified across en, gu, hi, mr.`);

// ---------------------------------------------------------------------------
// TEST 2: Navigation & Header Chrome (6 Field Engineer Tabs + Top Status Bar + Offline Banners)
// ---------------------------------------------------------------------------
console.log('2. Verifying Field Engineer Navigation Tabs, Top Status Bar & Offline Banners in 4 languages...');
const fieldNavKeys: Array<keyof TranslationDictionary['erp']> = [
  'navFieldConsole',
  'navWorkOrders',
  'navSiteFeasibility',
  'navFeederPatrol',
  'navOfflineQueue',
  'navCompletedJobs',
];

for (const lang of LANGUAGES) {
  const t = TRANSLATIONS[lang];
  const tf = t.field;
  for (const navKey of fieldNavKeys) {
    const label = t.erp[navKey];
    assert.ok(label && label.trim().length > 0, `[${lang}] Missing erp.${String(navKey)}`);
    if (lang !== 'en') {
      assert.notEqual(label, en.erp[navKey], `[${lang}] erp.${String(navKey)} not translated`);
    }
  }

  // Verify Field Engineer profile designation & subdivision localization
  for (const fe of INITIAL_FIELD_ENGINEERS) {
    const desig = localizeEmployeeDesignation(fe.designation, lang);
    const subdiv = localizeSubdivision(fe.subdivision, lang);
    const status = localizeFieldEngineerStatus(fe.status, lang);
    assert.ok(desig.length > 0 && subdiv.length > 0 && status.length > 0);
    if (lang !== 'en') {
      assert.notEqual(desig, fe.designation, `[${lang}] Designation "${fe.designation}" not translated`);
      assert.notEqual(subdiv, fe.subdivision, `[${lang}] Subdivision "${fe.subdivision}" not translated`);
      assert.notEqual(status, fe.status, `[${lang}] Field status "${fe.status}" not translated`);
    }
  }

  // Offline banners & status bar
  const statusBarSnapshot = [
    tf.consoleTitle,
    tf.roleBadgeField,
    tf.subtitleOpsPrefix,
    tf.btnReportHazard,
    tf.btnSimulatedOffline,
    tf.btnOnlineAmr,
    tf.offlineBufferActivePrefix,
    tf.offlineBufferActiveDesc,
    tf.badgeLocalQueueReady,
    tf.offlineSimNoticePrefix,
    tf.offlineSimNoticeDesc,
  ].join(' | ');
  checkForbiddenEnglishPhrases(statusBarSnapshot, lang, 'TopStatusBarAndOfflineBanners');
}
console.log('   ✓ All 6 Field Engineer tabs, profile metadata, and offline banners verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 3: Tab 1 (My Field Tasks / Dashboard) & Assigned Incidents Callouts
// ---------------------------------------------------------------------------
console.log('3. Verifying Tab 1 (My Field Tasks / Dashboard), KPI Cards, Assigned Incidents, and Itinerary...');
const baseAnomalies = detectAnomalies({
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  auditLogs: [],
  bills: [],
  consumerOwnedNumbers: new Set(),
});
const sampleAssignedIncident: CriticalIncident = {
  ...baseAnomalies[0],
  id: 'INC-9901',
  status: 'ASSIGNED',
  assignedToUserId: 'FLD-UG-201',
  assignedEngineerName: 'Vikramakor Thakor',
  assignedBy: 'Rajendra Patel (SDO)',
  assignedAt: '2026-04-02 10:15',
  assignmentStatus: 'ASSIGNED',
  assignmentNotes: 'Assigned to Vikramakor Thakor (FLD-UG-201) by Rajendra Patel (SDO).',
};

for (const lang of LANGUAGES) {
  const tf = TRANSLATIONS[lang].field;
  const locInc = localizeIncident(sampleAssignedIncident, lang);
  const locSubdiv = localizeSubdivision(sampleAssignedIncident.subdivision, lang);
  const locNotes = localizeAuditTrailNote(sampleAssignedIncident.assignmentNotes!, lang);

  assert.equal(locInc.id, 'INC-9901', 'Canonical incident ID must remain preserved');
  if (lang !== 'en') {
    assert.notEqual(locInc.title, sampleAssignedIncident.title, `[${lang}] Incident title not localized`);
    assert.notEqual(locInc.description, sampleAssignedIncident.description, `[${lang}] Incident description not localized`);
    assert.notEqual(locInc.recommendedAction, sampleAssignedIncident.recommendedAction, `[${lang}] Incident SOP not localized`);
    assert.notEqual(locSubdiv, sampleAssignedIncident.subdivision, `[${lang}] Incident subdivision not localized`);
    assert.notEqual(locNotes, sampleAssignedIncident.assignmentNotes, `[${lang}] Assignment notes not localized`);
  }

  for (const wo of INITIAL_WORK_ORDERS) {
    const title = localizeWorkOrderTitle(wo.title, lang);
    const type = localizeWorkOrderType(wo.type, lang);
    const status = localizeWorkOrderStatus(wo.status, lang);
    const prio = localizePriorityLevel(wo.priority, lang);
    const loc = localizeConsumerAddress(wo.location, lang);
    const feeder = localizeFeederName(wo.feederName || '', lang);
    const sched = localizeWorkOrderScheduledDate(wo.scheduledDate, lang);

    const woRef = wo.complaintId || wo.applicationId;
    if (woRef && wo.title.includes(woRef)) {
      assert.ok(title.includes(woRef), `[${lang}] Work order title must preserve relatedRef ${woRef}: "${title}"`);
    }
    if (lang !== 'en') {
      assert.notEqual(title, wo.title, `[${lang}] WorkOrder title "${wo.title}" not localized`);
      assert.notEqual(type, wo.type, `[${lang}] WorkOrder type "${wo.type}" not localized`);
      assert.notEqual(status, wo.status, `[${lang}] WorkOrder status "${wo.status}" not localized`);
      assert.notEqual(prio, wo.priority, `[${lang}] WorkOrder priority "${wo.priority}" not localized`);
      assert.notEqual(loc, wo.location, `[${lang}] WorkOrder location "${wo.location}" not localized`);
      if (wo.feederName) {
        assert.notEqual(feeder, wo.feederName, `[${lang}] WorkOrder feederName "${wo.feederName}" not localized`);
      }
      assert.notEqual(sched, wo.scheduledDate, `[${lang}] WorkOrder scheduledDate "${wo.scheduledDate}" not localized`);
    }
  }

  const tab1Snapshot = [
    tf.kpiAssignedWorkOrders,
    tf.kpiAssignedWorkOrdersSub,
    tf.kpiEmergencyCallouts,
    tf.kpiEmergencyActiveSuffix,
    tf.kpiEmergencySub,
    tf.kpiCompletedInspections,
    tf.kpiCompletedInspectionsSub,
    tf.sectionAssignedIncidents,
    tf.badgeTargetedDispatch,
    tf.btnReviewAssignment,
    tf.btnAcknowledge,
    tf.btnInspectFeederTelemetry,
    tf.sectionTodaysItinerary,
    tf.btnViewAllWorkOrders,
    tf.btnDetails,
    tf.btnPerformInspection,
  ].join(' | ');
  checkForbiddenEnglishPhrases(tab1Snapshot, lang, 'Tab1Dashboard');
  assert.ok(tab1Snapshot.includes('WO-4403'), `[${lang}] Canonical ID WO-4403 must be preserved in KPI subtext`);
}
console.log('   ✓ Tab 1 (My Field Tasks / Dashboard) verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 4: Tab 2 (Work Orders) & Tab 6 (Completed Jobs / Inspection History)
// ---------------------------------------------------------------------------
console.log('4. Verifying Tab 2 (Work Orders) & Tab 6 (Completed Jobs) including Inspection Findings cards...');
const completedWo = INITIAL_WORK_ORDERS.find(w => w.id === 'WO-4398')!;
assert.ok(completedWo && completedWo.inspectionReport, 'Expected WO-4398 with inspectionReport');

for (const lang of LANGUAGES) {
  const tf = TRANSLATIONS[lang].field;
  const sealLoc = localizeSealStatus(completedWo.inspectionReport!.sealIntact, lang);
  const termLoc = localizeTerminalCondition(completedWo.inspectionReport!.terminalCondition, lang);
  const remLoc = localizeFieldTechnicianRemarks(completedWo.inspectionReport!.technicianRemarks, lang);
  const actorLoc = localizeAssignedActorName(completedWo.assignedTo, lang);

  if (lang !== 'en') {
    assert.notEqual(sealLoc, 'Seal Intact', `[${lang}] Seal status not localized`);
    assert.notEqual(termLoc, completedWo.inspectionReport!.terminalCondition, `[${lang}] Terminal condition not localized`);
    assert.notEqual(remLoc, completedWo.inspectionReport!.technicianRemarks, `[${lang}] Technician remarks not localized`);
    assert.notEqual(actorLoc, completedWo.assignedTo, `[${lang}] Assigned engineer role suffix not localized`);
  }

  // Canonical serials & readings preserved
  assert.equal(completedWo.inspectionReport!.meterSerialScanned, 'GEN-SM-2026-9921');
  assert.equal(completedWo.inspectionReport!.readingKwh, 0);
  assert.deepEqual(completedWo.inspectionReport!.testedPhaseVoltage, { r: 234, y: 232, b: 236 });
  assert.ok(remLoc.includes('UGVCL-882191'), `[${lang}] Seal serial UGVCL-882191 must remain intact in remarks`);

  const tab2And6Snapshot = [
    tf.headingAssignedWorkOrders,
    tf.subtitleAssignedWorkOrders,
    tf.btnEnterInspectionFindings,
    tf.badgeCompleted,
    tf.labelInspectionFindingsRecorded,
    tf.headingCompletedJobs,
    tf.subtitleCompletedJobs,
    tf.badgeCompletedJobsCountSuffix,
    tf.btnAllWorkOrders,
    tf.btnViewCaseFile,
    tf.labelRecordedInspectionReport,
    tf.labelScannedMeterSerialShort,
    tf.labelVerifiedReadingShort,
    tf.labelSealAndTerminal,
    tf.labelPhaseVoltagesShort,
    tf.emptyCompletedJobsTitle,
    tf.emptyCompletedJobsDesc,
    sealLoc,
    termLoc,
    remLoc,
  ].join(' | ');
  checkForbiddenEnglishPhrases(tab2And6Snapshot, lang, 'Tab2WorkOrdersAndTab6CompletedJobs');
}
console.log('   ✓ Tab 2 (Work Orders) & Tab 6 (Completed Jobs) verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 5: Tab 3 (Site Inspection Form) & Default Remarks Language Synchronization
// ---------------------------------------------------------------------------
console.log('5. Verifying Tab 3 (Site Inspection Form) controls, options, and default remarks in 4 languages...');
for (const lang of LANGUAGES) {
  const tf = TRANSLATIONS[lang].field;
  const tab3Snapshot = [
    tf.headingSiteInspectionReport,
    tf.labelTaskPrefix,
    tf.defaultInspectionTaskFallback,
    tf.labelScannedMeterSerial,
    tf.labelVerifiedMeterReading,
    tf.labelOpticalSealStatus,
    tf.optionSealIntactVerified,
    tf.optionSealBrokenSuspicious,
    tf.labelTerminalBlockCondition,
    tf.optionTerminalNormal,
    tf.optionTerminalBurnt,
    tf.optionTerminalLooseNeutral,
    tf.labelTestedPhaseVoltages,
    tf.labelRPhase,
    tf.labelYPhase,
    tf.labelBPhase,
    tf.labelSitePhotoEvidence,
    tf.labelGpsGeotag,
    tf.badgeGeotagVerified,
    tf.labelTechnicianObservations,
    tf.defaultTechnicianRemarks,
    tf.btnSignTransmitReport,
  ].join(' | ');
  checkForbiddenEnglishPhrases(tab3Snapshot, lang, 'Tab3SiteInspectionForm');
  assert.ok(tf.defaultInspectionTaskFallback.includes('WO-4401') && tf.defaultInspectionTaskFallback.includes('CMP-8821'));
  assert.ok(tf.defaultTechnicianRemarks.includes('DP-14'));
}
console.log('   ✓ Tab 3 (Site Inspection Form) verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 6: Tab 4 (Offline Queue) & Tab 5 (Feeder Patrol)
// ---------------------------------------------------------------------------
console.log('6. Verifying Tab 4 (Offline Queue) & Tab 5 (11kV Feeder Patrol) in 4 languages...');
for (const lang of LANGUAGES) {
  const tf = TRANSLATIONS[lang].field;
  for (const fm of FEEDER_METRICS) {
    const fName = localizeFeederName(fm.name, lang);
    const fSub = localizeSubdivision(fm.subdivision, lang);
    const fStat = localizeFeederStatus(fm.status, lang);
    assert.ok(fName.includes('11kV'), `[${lang}] Feeder name must preserve 11kV rating: "${fName}"`);
    if (lang !== 'en') {
      assert.notEqual(fName, fm.name, `[${lang}] Feeder name "${fm.name}" not localized`);
      assert.notEqual(fSub, fm.subdivision, `[${lang}] Feeder subdivision "${fm.subdivision}" not localized`);
      assert.notEqual(fStat, fm.status, `[${lang}] Feeder status "${fm.status}" not localized`);
    }
  }

  const tab4And5Snapshot = [
    tf.headingOfflineQueue,
    tf.subtitleOfflineQueue,
    tf.btnSimulateSyncNow,
    tf.offlineItem1Title,
    tf.offlineItem1Desc,
    tf.badgeSyncedToServer,
    tf.offlineItem2Title,
    tf.offlineItem2Desc,
    tf.badgePendingBackgroundPush,
    tf.headingFeederPatrol,
    tf.subtitleFeederPatrol,
    tf.btnViewAssignedWorkOrdersArrow,
    tf.summaryMonitoredFeeders,
    tf.summaryMonitoredFeedersSub,
    tf.summaryFeedersAttention,
    tf.summaryFeedersAttentionSub,
    tf.summaryOpenFieldWorkOrders,
    tf.summaryOpenFieldWorkOrdersSub,
    tf.labelConductorLoadUtilization,
    tf.labelPeakLoad,
    tf.labelTransformers,
    tf.labelConsumers,
    tf.labelLinkedWorkOrder,
    tf.noOpenFaultCalloutsOnFeeder,
    tf.btnInspectFeederPrefix,
    tf.btnLogPatrolCheck,
    tf.emptyFeederRecordsTitle,
    tf.emptyFeederRecordsDesc,
  ].join(' | ');
  checkForbiddenEnglishPhrases(tab4And5Snapshot, lang, 'Tab4OfflineAndTab5FeederPatrol');
  assert.ok(tf.offlineItem1Title.includes('WO-4398'));
  assert.ok(tf.offlineItem1Desc.includes('#UGVCL-882191'));
  assert.ok(tf.offlineItem2Title.includes('WO-4401'));
  assert.ok(tf.offlineItem2Desc.includes('232V'));
}
console.log('   ✓ Tab 4 (Offline Queue) & Tab 5 (11kV Feeder Patrol) verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 7: Emergency Hazard Reporting Modal & Live Emergency Incident Creation
// ---------------------------------------------------------------------------
console.log('7. Verifying Emergency Hazard Reporting Modal & Live Emergency Incident localization...');
for (const lang of LANGUAGES) {
  const tf = TRANSLATIONS[lang].field;
  const modalSnapshot = [
    tf.hazardModalTitle,
    tf.hazardModalSubtitle,
    tf.labelTargetFeederCorridor,
    tf.labelDetectedHazardType,
    tf.optionHazardTransformerOverheating,
    tf.optionHazardFeederOverload,
    tf.optionHazardCriticalOutage,
    tf.labelHazardObservations,
    tf.defaultHazardRemarks,
    tf.btnCancel,
    tf.btnTransmitCriticalAlert,
  ].join(' | ');
  checkForbiddenEnglishPhrases(modalSnapshot, lang, 'EmergencyHazardModal');

  // Verify live emergency incident created by reportFeederFault localizes properly
  const emergencyTitle = 'EMERGENCY LIFE HAZARD: Transformer Overheating on 11kV Visnagar Road Feeder';
  const emergencyNotifTitle = 'EMERGENCY LIFE HAZARD: 11kV Visnagar Road Feeder — Transformer Overheating';
  const emergencyDesc = `${FIELD_UI_TRANSLATIONS.en.defaultHazardRemarks} Reported on site by Vikramakor Thakor (FDR-11-MSN-01, Mehsana City North).`;
  const emergencySop =
    'URGENT: Isolate feeder immediately, secure public safety perimeter, and dispatch emergency line crew.';
  const emergencyAuditNote = `[EMERGENCY OVERRIDE BROADCAST] ${FIELD_UI_TRANSLATIONS.en.defaultHazardRemarks}`;

  const locTitle = localizeIncidentTitle(emergencyTitle, lang);
  const locNotifTitle = localizeIncidentTitle(emergencyNotifTitle, lang);
  const locDesc = localizeIncidentDescription(emergencyDesc, lang);
  const locSop = localizeIncidentSopAction(emergencySop, lang);
  const locAudit = localizeAuditTrailNote(emergencyAuditNote, lang);
  const locClass = localizeEmergencyClassification('LIVE_WIRE_PUBLIC_HAZARD', lang);

  if (lang !== 'en') {
    assert.notEqual(locTitle, emergencyTitle, `[${lang}] Emergency incident title not localized`);
    assert.notEqual(locNotifTitle, emergencyNotifTitle, `[${lang}] Emergency notification title not localized`);
    assert.notEqual(locDesc, emergencyDesc, `[${lang}] Emergency incident description not localized`);
    assert.notEqual(locSop, emergencySop, `[${lang}] Emergency incident SOP not localized`);
    assert.notEqual(locAudit, emergencyAuditNote, `[${lang}] Emergency audit note not localized`);
    assert.notEqual(locClass, 'LIVE_WIRE_PUBLIC_HAZARD', `[${lang}] Emergency classification not localized`);
  }
}
console.log('   ✓ Emergency Hazard Reporting Modal & Live Emergency Incident localization verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 8: IncidentActionModal (Field Engineer Action Desk, Overview, Audit History & Access Guard)
// ---------------------------------------------------------------------------
console.log('8. Verifying IncidentActionModal Field Engineer Action Desk across all workflow states in 4 languages...');
// Verify RBAC access check remains intact for assigned vs unassigned field engineer
const assignedAccess = authorizeIncidentModalAccess(sampleAssignedIncident, 'field', {
  id: 'FLD-UG-201',
  name: 'Vikramakor Thakor',
  role: 'field',
  subdivision: 'Mehsana City-I',
});
assert.equal(assignedAccess.isAuthorized, true, 'Assigned Field Engineer FLD-UG-201 must have access to INC-9901');
const unassignedAccess = authorizeIncidentModalAccess(sampleAssignedIncident, 'field', {
  id: 'FLD-UG-202',
  name: 'Dinesh Vaghela',
  role: 'field',
  subdivision: 'Mehsana Rural',
});
assert.equal(unassignedAccess.isAuthorized, false, 'Unassigned Field Engineer FLD-UG-202 must be denied access to INC-9901');

for (const lang of LANGUAGES) {
  const tf = TRANSLATIONS[lang].field;
  const denialReasonLoc = localizeIncidentAccessDenialReason(unassignedAccess.denialReason || '', lang);
  if (lang !== 'en') {
    assert.notEqual(denialReasonLoc, unassignedAccess.denialReason, `[${lang}] Access denial reason not localized`);
  }

  const fieldActionDeskSnapshot = [
    tf.modalFieldDispatchControlsPrefix,
    tf.modalFieldDispatchControlsDesc,
    tf.modalStep1Acceptance,
    tf.modalBtnAcceptMobilize,
    tf.modalBtnDeclineAssignment,
    tf.modalLabelDeclineReason,
    tf.modalPlaceholderDeclineReason,
    tf.modalBtnConfirmDecline,
    tf.modalStep2InspectionFindings,
    tf.modalBtnStartOnSiteInspection,
    tf.modalInspectionCommencedPrefix,
    tf.modalLabelRecordTechnicalFindings,
    tf.modalPlaceholderTechnicalFindings,
    tf.modalBtnTransmitFindings,
    tf.modalLabelRequestAdditionalCrew,
    tf.modalPlaceholderAssistanceNote,
    tf.modalBtnRequestSpecializedAssistance,
    tf.modalHeadingSubmitFinalResolution,
    tf.modalDescSubmitFinalResolution,
    tf.modalPlaceholderResolutionSummary,
    tf.modalBtnSubmitResolutionClearFault,
    tf.modalIncidentAlreadyResolvedTitle,
    tf.modalIncidentAlreadyResolvedDesc,
  ].join(' | ');
  checkForbiddenEnglishPhrases(fieldActionDeskSnapshot, lang, 'IncidentActionModalFieldActionDesk');

  // Verify audit trail notes generated during Field Engineer lifecycle
  const lifecycleAuditNotes = [
    'Assigned to Vikramakor Thakor (FLD-UG-201) by Rajendra Patel (SDO).',
    'Assignment acknowledged by Field Engineer Vikramakor Thakor. Mobilizing to site.',
    'Field Engineer Vikramakor Thakor (FLD-UG-201) accepted assignment and mobilized to site.',
    'Field Engineer Vikramakor Thakor (FLD-UG-201) declined assignment on 02 Apr 2026, 10:25 AM: "Currently isolated on 33kV substation feeder fault."',
    'Physical inspection and telemetry tests started on site.',
    'Technical findings recorded: Measured 88C at transformer top oil.',
    'Assistance requested: Need crane squad for tree trimming.',
    'Resolution Report: Replaced oxidized lug and verified IR > 50 Mega-ohms.',
  ];

  for (const note of lifecycleAuditNotes) {
    const locNote = localizeAuditTrailNote(note, lang);
    if (lang !== 'en') {
      assert.notEqual(locNote, note, `[${lang}] Lifecycle audit note not localized: "${note}"`);
    }
  }
}
console.log('   ✓ IncidentActionModal Field Engineer Action Desk & lifecycle audit notes verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 9: CaseDetailDrawer (Work Order, Source Complaint, Source Application)
// ---------------------------------------------------------------------------
console.log('9. Verifying CaseDetailDrawer for Work Orders, Complaints, and Applications in 4 languages...');
const sampleWo = INITIAL_WORK_ORDERS[0]; // WO-4401
const sampleCmp = INITIAL_COMPLAINTS.find(c => c.id === 'CMP-8821')!;
const sampleApp = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0842')!;

for (const lang of LANGUAGES) {
  for (const mat of sampleWo.materialsNeeded || []) {
    const locMat = localizeWorkOrderMaterial(mat, lang);
    if (lang !== 'en') {
      assert.notEqual(locMat, mat, `[${lang}] WorkOrder material "${mat}" not localized`);
    }
  }

  const cmpCat = localizeComplaintCategory(sampleCmp.category, lang);
  const cmpStat = localizeComplaintStatus(sampleCmp.status, lang);
  const cmpDesc = localizeComplaintDescription(sampleCmp.id, sampleCmp.description, lang);
  if (lang !== 'en') {
    assert.notEqual(cmpCat, sampleCmp.category, `[${lang}] Complaint category not localized`);
    assert.notEqual(cmpStat, sampleCmp.status, `[${lang}] Complaint status not localized`);
    assert.notEqual(cmpDesc, sampleCmp.description, `[${lang}] Complaint description not localized`);
  }

  const appStat = localizeApplicationStatus(sampleApp.status, lang);
  for (const nh of sampleApp.notesHistory || []) {
    const appNote = localizeApplicationNote(nh.note, lang);
    if (lang !== 'en') {
      assert.notEqual(appNote, nh.note, `[${lang}] Application note "${nh.note}" not localized`);
    }
  }
  if (lang !== 'en') {
    assert.notEqual(appStat, sampleApp.status, `[${lang}] Application status not localized`);
  }

  for (const tEvent of sampleCmp.timeline || []) {
    const stg = localizeConsumerTimelineStage(tEvent.stage, lang);
    const rem = localizeConsumerTimelineRemark(tEvent.remark || '', lang);
    if (lang !== 'en') {
      assert.notEqual(stg, tEvent.stage, `[${lang}] Timeline stage "${tEvent.stage}" not localized`);
      if (tEvent.remark) {
        assert.notEqual(rem, tEvent.remark, `[${lang}] Timeline remark "${tEvent.remark}" not localized`);
      }
    }
  }
}
console.log('   ✓ CaseDetailDrawer content verified across en, gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 10: NotificationDrawer & Field Engineer Runtime Toasts in 4 Languages
// ---------------------------------------------------------------------------
console.log('10. Verifying Field Engineer NotificationDrawer items, Date Groups, and Runtime Toasts in 4 languages...');
const fieldNotifications: AppNotification[] = [
  ...INITIAL_NOTIFICATIONS.filter(n => n.targetRole === 'field'),
  {
    id: 'N-FIELD-WO-CLOSED',
    title: 'Work Order Closed: WO-4401',
    message:
      'Field crew resolved complaint #CMP-8821 (Mehsana City North). Remarks: Replaced oxidized incoming phase lug on Pole DP-14; tested 234V/232V/235V steady.',
    time: 'Just now',
    createdAt: new Date().toISOString(),
    type: 'info',
    category: 'Outage',
    targetRole: 'employee',
    read: false,
    relatedEntityType: 'workorder',
    relatedEntityId: 'WO-4401',
  },
  {
    id: 'N-FIELD-APP-INSP',
    title: 'Field Inspection Completed: APP-2026-0842',
    message:
      'Inspection completed for Meenaben Rameshbhai Patel (4 kW Residential (RGPU), Mehsana City North). Ready for final sanction release.',
    time: 'Just now',
    createdAt: new Date().toISOString(),
    type: 'success',
    category: 'Inspection',
    targetRole: 'employee',
    read: false,
    relatedEntityType: 'application',
    relatedEntityId: 'APP-2026-0842',
  },
  {
    id: 'N-FIELD-HAZARD',
    title: 'EMERGENCY LIFE HAZARD: 11kV Visnagar Road Feeder — Transformer Overheating',
    message:
      'Field Engineer Vikramakor Thakor reported confirmed safety hazard (LIVE_WIRE_PUBLIC_HAZARD): Detected high thermal signature (>85°C) and oil weepage at 100kVA distribution transformer.',
    time: 'Just now',
    createdAt: new Date().toISOString(),
    type: 'alert',
    category: 'Outage',
    targetRole: 'field',
    read: false,
    relatedEntityType: 'incident',
    relatedEntityId: 'INC-9988',
    incidentId: 'INC-9988',
  },
];

const fieldToastMessages = [
  'Inspection report submitted for WO-4401 — Status updated to Completed',
  'Work Order WO-4401 updated to "In Progress"',
  'Emergency Hazard reported for FDR-01 — Critical incident broadcasted',
  'EMERGENCY SAFETY OVERRIDE broadcasted for FDR-01!',
  'Feeder hazard reported on FDR-01. Routed to Employee Incident Control Desk.',
  'Assignment accepted for INC-9901. Status: IN_PROGRESS',
  'Assignment Declined: INC-9901 returned to Employee queue for reassignment.',
  'On-site inspection started for INC-9901. Status: IN_PROGRESS',
  'Technical findings filed for INC-9901. Status: IN_PROGRESS',
  'Assistance request transmitted for INC-9901.',
  'Resolution report filed for INC-9901. Status: RESOLVED',
  'Simulated Offline Mode enabled — inspections will queue locally',
  'Simulated Online Mode restored — local queue synchronized',
  'Simulated flush: All 2 queued inspections transmitted',
  'Focused 11kV Feeder Patrol on 11kV GIDC-2 Dedicated Feeder',
  'Logged routine corridor patrol check for FDR-01 (11kV Visnagar Road Feeder)',
];

for (const lang of LANGUAGES) {
  for (const notif of fieldNotifications) {
    const locNotif =
      notif.relatedEntityType === 'incident' || notif.incidentId
        ? localizeIncidentNotification(notif, lang)
        : localizeConsumerNotification(notif, lang);
    if (lang !== 'en') {
      assert.notEqual(locNotif.title, notif.title, `[${lang}] Notification title "${notif.title}" not localized`);
      assert.notEqual(locNotif.message, notif.message, `[${lang}] Notification message "${notif.message}" not localized`);
    }
  }

  for (const [bucket, date] of [
    ['TODAY', '15 Oct 2026'],
    ['YESTERDAY', '14 Oct 2026'],
  ]) {
    const locHeader = localizeNotificationDateGroupHeader(bucket, date, lang);
    if (lang !== 'en') {
      assert.notEqual(locHeader, `${bucket} — ${date}`, `[${lang}] Date group header not localized`);
    }
  }

  for (const badge of ['Outage', 'Inspection Started', 'Findings Submitted', 'Assistance Requested', 'Resolution Report Submitted']) {
    const locBadge = localizeNotificationStatusBadge(badge, lang);
    if (lang !== 'en') {
      assert.notEqual(locBadge, badge, `[${lang}] Notification status badge "${badge}" not localized`);
    }
  }

  for (const toastMsg of fieldToastMessages) {
    const locToast = localizeToastMessage(toastMsg, lang);
    if (lang !== 'en') {
      assert.notEqual(locToast, toastMsg, `[${lang}] Toast message "${toastMsg}" not localized`);
    }
  }
}
console.log('   ✓ Field Engineer NotificationDrawer items, date groups, and runtime toasts verified across en, gu, hi, mr.');

console.log('\n=== ALL 10 FIELD ENGINEER PORTAL 4-LANGUAGE LOCALIZATION TESTS PASSED (ZERO MISSING STRINGS) ===');
