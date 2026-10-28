import assert from 'node:assert/strict';
import { en } from '../src/i18n/translations/en';
import { gu } from '../src/i18n/translations/gu';
import { hi } from '../src/i18n/translations/hi';
import { mr } from '../src/i18n/translations/mr';
import { LanguageCode, TranslationDictionary } from '../src/i18n/types';
import {
  EMPLOYEE_UI_TRANSLATIONS,
  localizeEmployeeDesignation,
  localizeFieldEngineerStatus,
  localizePriorityLevel,
  localizeSlaDuration,
  localizeApplicationStatusMeta,
  localizeWorkOrderType,
  localizeWorkOrderStatus,
  localizeWorkOrderTitle,
  localizeWorkOrderScheduledDate,
  localizeWorkOrderMaterial,
  localizeAssignedActorName,
  localizeAIRecommendation,
  localizeApprovalPermissionReason,
  localizeIncidentAccessDenialReason,
  localizeToastMessage,
} from '../src/i18n/employeeContentTranslations';
import {
  localizeSubdivision,
  localizeTariffCategory,
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
  localizeIncidentSeverity,
  localizeIncidentStatus,
  localizeIncidentAuditStage,
  localizeAuditTrailNote,
  localizeIncidentNotification,
} from '../src/i18n/incidentLocalization';
import {
  INITIAL_APPLICATIONS,
  INITIAL_CONNECTIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS,
  INITIAL_NOTIFICATIONS,
  AUDIT_LOGS,
  FEEDER_METRICS,
} from '../src/data/mockData';
import {
  generateGroundedRecommendations,
  validateApprovalPermission,
} from '../src/utils/aiRecommendationEngine';
import { detectAnomalies } from '../src/utils/anomalyDetector';
import { getApplicationStatusDisplayMeta } from '../src/services/erpAdapter';

const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = { en, gu, hi, mr };
const LANGUAGES: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];
const NON_EN_LANGUAGES: LanguageCode[] = ['gu', 'hi', 'mr'];

// Explicit English leak phrases that MUST NEVER appear in gu/hi/mr Employee Portal outputs
const FORBIDDEN_EMPLOYEE_ENGLISH_PHRASES = [
  'Sub-Divisional Operations & Sanction Desk',
  'Pending Document Scrutiny',
  'Field Feasibility Underway',
  'Sanction Approvals',
  'Active Grievances',
  'Sub-Divisional TAT (Resolution Hours)',
  'UGVCL Smart Suggestions',
  'New Connection Applications Queue',
  'Consumer Records & Energy Ledger',
  'Sub-Divisional Grievance Redressal Matrix',
  'Approval Center — Human-in-the-Loop AI Governance',
  'Inter-Department Requisitions',
  'Line Squad Mobilization',
  'Subdivision Revenue & Collection Reconciliation',
  'Target Operational Channel',
  'Management Portal (Executive)',
  'Field Engineer (Substation JE)',
  'Operations Desk (Division)',
  'System Admin & Cybersecurity',
  'Confirm Field Assignment',
  'Confirm Escalation',
  'Confirm Resolution',
  'State Transition Preview',
  'Approve & Execute',
  'Reject Proposal',
  'Demo Simulation',
  'Dismiss',
];

function checkForbiddenEnglishPhrases(text: string, lang: LanguageCode, context: string) {
  if (lang === 'en') return;
  for (const phrase of FORBIDDEN_EMPLOYEE_ENGLISH_PHRASES) {
    if (phrase.length >= 6 && text.toLowerCase().includes(phrase.toLowerCase())) {
      assert.fail(`[${lang}] Forbidden English phrase "${phrase}" leaked in ${context}: "${text}"`);
    }
  }
}

console.log('=== VIDYUTFLOW COMPLETE EMPLOYEE PORTAL 4-LANGUAGE LOCALIZATION VERIFICATION ===\n');

// ---------------------------------------------------------------------------
// TEST 1: Dictionary Completeness & Key Parity Across en, gu, hi, mr
// ---------------------------------------------------------------------------
console.log('1. Verifying Employee UI dictionary key parity and non-empty translations (en, gu, hi, mr)...');
const enEmployeeKeys = Object.keys(EMPLOYEE_UI_TRANSLATIONS.en) as Array<keyof typeof EMPLOYEE_UI_TRANSLATIONS.en>;
assert.ok(enEmployeeKeys.length >= 180, `Expected at least 180 Employee UI keys, found ${enEmployeeKeys.length}`);

for (const lang of LANGUAGES) {
  const dict = TRANSLATIONS[lang].employee;
  assert.ok(dict, `Missing employee dictionary for language: ${lang}`);
  const langKeys = Object.keys(dict);
  assert.deepEqual(
    langKeys.sort(),
    [...enEmployeeKeys].sort(),
    `Key parity mismatch in employee dictionary for language: ${lang}`
  );

  for (const key of enEmployeeKeys) {
    const val = dict[key];
    assert.equal(typeof val, 'string', `[${lang}] Key "${String(key)}" is not a string`);
    // Allow intentionally empty prefix/suffix keys where grammar puts the phrase in the companion prefix/suffix
    const isOptionalAffix = key.endsWith('Prefix') || key.endsWith('Suffix');
    if (!isOptionalAffix) {
      assert.ok(val.trim().length > 0, `[${lang}] Key "${String(key)}" is empty`);
    }

    if (lang !== 'en' && !isOptionalAffix) {
      const enVal = EMPLOYEE_UI_TRANSLATIONS.en[key];
      const isPureCodeOrSymbol = /^[A-Z0-9-\s/:.•%()₹#]+$/.test(enVal) || enVal === '161.9 MU';
      if (!isPureCodeOrSymbol) {
        assert.notEqual(
          val,
          enVal,
          `[${lang}] Employee UI key "${String(key)}" fell back to identical English value: "${enVal}"`
        );
      }
      checkForbiddenEnglishPhrases(val, lang, `employee.${String(key)}`);
    }
  }
}
console.log(`   ✓ Verified ${enEmployeeKeys.length} Employee Portal UI keys across all 4 languages with 0 missing/untranslated keys.`);

// ---------------------------------------------------------------------------
// TEST 2: Shared Navigation, Header, Role Badge & Designations for Employee
// ---------------------------------------------------------------------------
console.log('2. Verifying Employee navigation items, role badges, and designations...');
const employeeNavKeys = [
  'navErpOverview',
  'navIncidentControlDesk',
  'navApplicationQueue',
  'navConsumerLedger',
  'navComplaintQueue',
  'navApprovalCenter',
  'navDeptCoordination',
  'navRevenueReports',
] as const;

for (const lang of NON_EN_LANGUAGES) {
  const t = TRANSLATIONS[lang];
  for (const navKey of employeeNavKeys) {
    const label = t.erp[navKey];
    assert.ok(label && label.trim().length > 0, `[${lang}] Missing erp nav key: ${navKey}`);
    assert.notEqual(label, TRANSLATIONS.en.erp[navKey], `[${lang}] Nav key "${navKey}" not localized: "${label}"`);
  }
  assert.notEqual(t.erp.roleEmployee, TRANSLATIONS.en.erp.roleEmployee, `[${lang}] erp.roleEmployee not localized`);
  assert.notEqual(t.erp.badgeEmployee, TRANSLATIONS.en.erp.badgeEmployee, `[${lang}] erp.badgeEmployee not localized`);

  for (const emp of INITIAL_EMPLOYEES) {
    const locDesig = localizeEmployeeDesignation(emp.designation, lang);
    assert.notEqual(locDesig, emp.designation, `[${lang}] Employee designation "${emp.designation}" not localized`);
  }
}
console.log('   ✓ Verified all 8 Employee sidebar/mobile nav items, role badges, and employee designations across gu, hi, mr.');

// ---------------------------------------------------------------------------
// TEST 3: All INITIAL_APPLICATIONS, Notes, Statuses & Status Meta Localizers
// ---------------------------------------------------------------------------
console.log('3. Verifying Employee Application Queue & CaseDetailDrawer application records across all 4 languages...');
const sampleApplicationNotes = [
  ...INITIAL_APPLICATIONS.flatMap(a => (a.notesHistory || []).map(nh => nh.note)),
  'Advanced to Document Verification by Rajesh V. Trivedi',
  'Dispatched field site inspection WO-2026-309 to Vikramaditya Solanki',
  'Sanction approved via Quick Suggestion',
  'Clarifications requested from applicant: Please upload clear 7/12 extract',
  'Application archived from active queue by Rajesh V. Trivedi (EMP-UG-1042) — Completed',
  'Application restored to active queue by Rajesh V. Trivedi (EMP-UG-1042)',
];

for (const lang of NON_EN_LANGUAGES) {
  for (const app of INITIAL_APPLICATIONS) {
    const statusLoc = localizeApplicationStatus(app.status, lang);
    assert.notEqual(statusLoc, app.status, `[${lang}] Application status "${app.status}" not localized`);

    const catLoc = localizeTariffCategory(app.category, lang);
    assert.notEqual(catLoc, app.category, `[${lang}] Category "${app.category}" not localized`);

    const subdivLoc = localizeSubdivision(app.subdivision, lang);
    assert.notEqual(subdivLoc, app.subdivision, `[${lang}] Subdivision "${app.subdivision}" not localized`);

    const rawMeta = getApplicationStatusDisplayMeta(app);
    const locMeta = localizeApplicationStatusMeta(rawMeta, lang);
    assert.notEqual(locMeta.shortLabel, rawMeta.shortLabel, `[${lang}] App status shortLabel not localized: "${rawMeta.shortLabel}"`);
    assert.notEqual(locMeta.reviewStateLabel, rawMeta.reviewStateLabel, `[${lang}] App status reviewStateLabel not localized: "${rawMeta.reviewStateLabel}"`);
    assert.notEqual(locMeta.stageSummaryLabel, rawMeta.stageSummaryLabel, `[${lang}] App status stageSummaryLabel not localized: "${rawMeta.stageSummaryLabel}"`);
  }

  for (const note of sampleApplicationNotes) {
    const locNote = localizeApplicationNote(note, lang);
    assert.notEqual(locNote, note, `[${lang}] Application note not localized: "${note}"`);
    checkForbiddenEnglishPhrases(locNote, lang, `Application note "${note}"`);
  }
}
console.log(`   ✓ Verified all ${INITIAL_APPLICATIONS.length} applications, statuses, categories, subdivisions, notes, and lifecycle badges.`);

// ---------------------------------------------------------------------------
// TEST 4: All INITIAL_CONNECTIONS (Consumer Master) Localizers
// ---------------------------------------------------------------------------
console.log('4. Verifying Employee Consumer Master records across all 4 languages...');
for (const lang of NON_EN_LANGUAGES) {
  for (const conn of INITIAL_CONNECTIONS) {
    const catLoc = localizeTariffCategory(conn.tariffCategory, lang);
    assert.notEqual(catLoc, conn.tariffCategory, `[${lang}] Connection tariffCategory "${conn.tariffCategory}" not localized`);
    const subdivLoc = localizeSubdivision(conn.subdivision, lang);
    assert.notEqual(subdivLoc, conn.subdivision, `[${lang}] Connection subdivision "${conn.subdivision}" not localized`);
  }
}
console.log(`   ✓ Verified all ${INITIAL_CONNECTIONS.length} Consumer Master records across gu, hi, mr.`);

// ---------------------------------------------------------------------------
// TEST 5: All INITIAL_COMPLAINTS, Timeline Stages, Remarks, SLA & Priority
// ---------------------------------------------------------------------------
console.log('5. Verifying Employee Consumer Complaints, SLA durations, priorities & timeline remarks...');
const runtimeComplaintRemarks = [
  'Updated status to In Progress via ERP Operations Console.',
  'Updated status to Resolved via ERP Operations Console.',
  'Dispatched field engineer Vikramaditya Solanki (Work Order #WO-2026-310).',
];

for (const lang of NON_EN_LANGUAGES) {
  for (const cmp of INITIAL_COMPLAINTS) {
    const catLoc = localizeComplaintCategory(cmp.category, lang);
    assert.notEqual(catLoc, cmp.category, `[${lang}] Complaint category "${cmp.category}" not localized`);

    const statusLoc = localizeComplaintStatus(cmp.status, lang);
    assert.notEqual(statusLoc, cmp.status, `[${lang}] Complaint status "${cmp.status}" not localized`);

    const descLoc = localizeComplaintDescription(cmp.id, cmp.description, lang);
    assert.notEqual(descLoc, cmp.description, `[${lang}] Complaint description not localized: "${cmp.description}"`);

    const prioLoc = localizePriorityLevel(cmp.priority, lang);
    assert.notEqual(prioLoc, cmp.priority, `[${lang}] Priority "${cmp.priority}" not localized`);

    const slaLoc = localizeSlaDuration(cmp.slaTargetHours, lang);
    assert.ok(slaLoc.includes(String(cmp.slaTargetHours)), `[${lang}] SLA duration lost numeric hours: "${slaLoc}"`);
    assert.notEqual(slaLoc, `${cmp.slaTargetHours}h`, `[${lang}] SLA duration "${cmp.slaTargetHours}h" not localized`);

    for (const item of cmp.timeline || []) {
      const stageLoc = localizeConsumerTimelineStage(item.stage, lang);
      assert.notEqual(stageLoc, item.stage, `[${lang}] Complaint timeline stage "${item.stage}" not localized`);
      const remarkLoc = localizeConsumerTimelineRemark(item.remark, lang);
      assert.notEqual(remarkLoc, item.remark, `[${lang}] Complaint timeline remark "${item.remark}" not localized`);
      const actorLoc = localizeAssignedActorName(item.actor, lang);
      assert.ok(actorLoc.length > 0);
    }
  }

  for (const remark of runtimeComplaintRemarks) {
    const locRemark = localizeConsumerTimelineRemark(remark, lang);
    assert.notEqual(locRemark, remark, `[${lang}] Runtime complaint remark not localized: "${remark}"`);
  }
}
console.log(`   ✓ Verified all ${INITIAL_COMPLAINTS.length} complaints, descriptions, priorities, SLA durations, and timeline remarks.`);

// ---------------------------------------------------------------------------
// TEST 6: Governance & Human-in-the-Loop Approvals + AI Recommendations
// ---------------------------------------------------------------------------
console.log('6. Verifying Employee Governance & Human-in-the-Loop Approvals and HumanApprovalModal...');
const generatedIncidents = detectAnomalies({
  feeders: FEEDER_METRICS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  auditLogs: AUDIT_LOGS,
});
const allRecommendations = generateGroundedRecommendations({
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  incidents: generatedIncidents,
  auditLogs: AUDIT_LOGS,
});
assert.ok(allRecommendations.length > 0, 'Expected generated AI recommendations');

for (const lang of NON_EN_LANGUAGES) {
  for (const rec of allRecommendations) {
    const locRec = localizeAIRecommendation(rec, lang);
    assert.notEqual(locRec.title, rec.title, `[${lang}] AI Recommendation title not localized: "${rec.title}"`);
    assert.notEqual(locRec.description, rec.description, `[${lang}] AI Recommendation description not localized: "${rec.description}"`);
    assert.notEqual(locRec.reasoningSummary, rec.reasoningSummary, `[${lang}] AI Recommendation reasoningSummary not localized: "${rec.reasoningSummary}"`);
    assert.notEqual(locRec.riskLevelLabel, rec.riskLevel, `[${lang}] AI Recommendation riskLevelLabel not localized: "${rec.riskLevel}"`);
    assert.notEqual(locRec.statusLabel, rec.status.replace('_', ' '), `[${lang}] AI Recommendation statusLabel not localized: "${rec.status}"`);
    checkForbiddenEnglishPhrases(locRec.title, lang, `AI Recommendation title (${rec.id})`);
    checkForbiddenEnglishPhrases(locRec.description, lang, `AI Recommendation description (${rec.id})`);

    // Verify permission denial localization when employee views a management/admin-only recommendation
    const perm = validateApprovalPermission(rec, 'employee');
    if (!perm.allowed && perm.reason) {
      const locReason = localizeApprovalPermissionReason(perm.reason, lang);
      assert.notEqual(locReason, perm.reason, `[${lang}] Permission denial reason not localized: "${perm.reason}"`);
    }
  }
}
console.log(`   ✓ Verified all ${allRecommendations.length} AI Governance recommendations and HumanApprovalModal strings across gu, hi, mr.`);

// ---------------------------------------------------------------------------
// TEST 7: Field Operations & Work Order Coordination + Field Engineers
// ---------------------------------------------------------------------------
console.log('7. Verifying Field Operations, Work Orders, Materials, Dates & Field Engineer statuses...');
for (const lang of NON_EN_LANGUAGES) {
  for (const wo of INITIAL_WORK_ORDERS) {
    const locTitle = localizeWorkOrderTitle(wo.title, lang);
    assert.notEqual(locTitle, wo.title, `[${lang}] Work Order title not localized: "${wo.title}"`);

    const locType = localizeWorkOrderType(wo.type, lang);
    assert.notEqual(locType, wo.type, `[${lang}] Work Order type not localized: "${wo.type}"`);

    const locStatus = localizeWorkOrderStatus(wo.status, lang);
    assert.notEqual(locStatus, wo.status, `[${lang}] Work Order status not localized: "${wo.status}"`);

    const locDate = localizeWorkOrderScheduledDate(wo.scheduledDate, lang);
    assert.notEqual(locDate, wo.scheduledDate, `[${lang}] Work Order scheduledDate not localized: "${wo.scheduledDate}"`);

    for (const mat of wo.materialsNeeded || []) {
      const locMat = localizeWorkOrderMaterial(mat, lang);
      assert.notEqual(locMat, mat, `[${lang}] Work Order material not localized: "${mat}"`);
    }
  }

  for (const fe of INITIAL_FIELD_ENGINEERS) {
    const locStatus = localizeFieldEngineerStatus(fe.status, lang);
    assert.notEqual(locStatus, fe.status, `[${lang}] Field engineer status "${fe.status}" not localized`);
    const locSubdiv = localizeSubdivision(fe.subdivision, lang);
    assert.notEqual(locSubdiv, fe.subdivision, `[${lang}] Field engineer subdivision "${fe.subdivision}" not localized`);
    const locDesig = localizeEmployeeDesignation(fe.designation, lang);
    assert.notEqual(locDesig, fe.designation, `[${lang}] Field engineer designation "${fe.designation}" not localized`);
  }
}
console.log(`   ✓ Verified all ${INITIAL_WORK_ORDERS.length} Work Orders and ${INITIAL_FIELD_ENGINEERS.length} Field Engineer records across gu, hi, mr.`);

// ---------------------------------------------------------------------------
// TEST 8: Incident Control Desk, Dossier, Modals & Access Denial Messages
// ---------------------------------------------------------------------------
console.log('8. Verifying Employee Incident Control Desk, Dossier, Audit Trail & Modals...');
const sampleIncidentDenials = [
  'Consumer accounts do not have access to internal operational incident dossiers.',
  'Access Restricted: Incident INC-2026-0849 is not yet assigned to a Field Engineer. Ordinary operational incidents must first be triaged and assigned by the Employee Control Desk.',
  'Access Restricted: Incident INC-2026-0849 is assigned to Vikramaditya Solanki (FLD-UG-201). Only the designated Field Engineer may access this operational dossier.',
  'Jurisdiction Restricted: Incident INC-2026-0849 belongs to Mehsana City North, outside your authorized subdivision (Gandhinagar Sub-Division 2).',
];

for (const lang of NON_EN_LANGUAGES) {
  for (const inc of generatedIncidents) {
    const locInc = localizeIncident(inc, lang);
    assert.equal(locInc.id, inc.id, 'Incident ID must be preserved');
    assert.equal(locInc.entityId, inc.entityId, 'Entity ID must be preserved');
    assert.notEqual(locInc.title, inc.title, `[${lang}] Incident title not localized: "${inc.title}"`);
    assert.notEqual(locInc.description, inc.description, `[${lang}] Incident description not localized`);
    assert.notEqual(locInc.recommendedAction, inc.recommendedAction, `[${lang}] Incident SOP not localized`);
    assert.notEqual(locInc.severityLabel, inc.severity, `[${lang}] Incident severity not localized`);
    assert.notEqual(locInc.statusLabel, inc.status, `[${lang}] Incident status not localized`);
    checkForbiddenEnglishPhrases(locInc.title, lang, `Incident ${inc.id} title`);
    checkForbiddenEnglishPhrases(locInc.description, lang, `Incident ${inc.id} description`);
    checkForbiddenEnglishPhrases(locInc.recommendedAction, lang, `Incident ${inc.id} SOP`);

    for (const h of inc.history) {
      const stageLoc = localizeIncidentAuditStage(h.stage, lang);
      const noteLoc = localizeAuditTrailNote(h.notes, lang);
      assert.notEqual(stageLoc, h.stage, `[${lang}] Incident audit stage not localized: "${h.stage}"`);
      assert.notEqual(noteLoc, h.notes, `[${lang}] Incident audit note not localized: "${h.notes}"`);
      checkForbiddenEnglishPhrases(stageLoc, lang, `Incident ${inc.id} audit stage`);
      checkForbiddenEnglishPhrases(noteLoc, lang, `Incident ${inc.id} audit note`);
    }
  }

  for (const denial of sampleIncidentDenials) {
    const locDenial = localizeIncidentAccessDenialReason(denial, lang);
    assert.notEqual(locDenial, denial, `[${lang}] Incident access denial reason not localized: "${denial}"`);
  }
}
console.log(`   ✓ Verified all ${generatedIncidents.length} Incidents, audit trails, and modal security messages across gu, hi, mr.`);

// ---------------------------------------------------------------------------
// TEST 9: Employee Notifications (Application, Complaint, Work Order, Incident)
// ---------------------------------------------------------------------------
console.log('9. Verifying Employee Notification Drawer items, date groups, and toast messages...');
const sampleEmployeeNotifications = INITIAL_NOTIFICATIONS.filter(n => n.targetRole === 'employee');

const sampleToastMessages = [
  'Refreshed real-time ERP event stream',
  'Exported revenue statement as CSV (Demo)',
  'Application APP-2026-0844 Approved & Energized!',
  'Application APP-2026-0842 Rejected: Incomplete documents',
  'Application APP-2026-0841 advanced to "Document Verification"',
  'Clarification requested for APP-2026-0841. Consumer notified.',
  'Application APP-2026-0845 archived from active queue. Audit trail & consumer record preserved.',
  'Application APP-2026-0845 restored to active queue.',
  'Complaint CMP-8821 marked as "Resolved"',
  'Complaint CMP-8821 dispatched to Vikramaditya Solanki (Work Order: WO-2026-310)',
  'Work Order WO-2026-301 updated to "Completed"',
  'Added case note to #APP-2026-0841',
  'All visible notifications marked as read.',
];

for (const lang of NON_EN_LANGUAGES) {
  for (const notif of sampleEmployeeNotifications) {
    const locNotif = notif.incidentId
      ? localizeIncidentNotification(notif, lang)
      : localizeConsumerNotification(notif, lang);

    assert.notEqual(locNotif.title, notif.title, `[${lang}] Notification title not localized: "${notif.title}"`);
    assert.notEqual(locNotif.message, notif.message, `[${lang}] Notification message not localized: "${notif.message}"`);
    if (notif.relatedEntityId) {
      assert.ok(
        locNotif.title.includes(notif.relatedEntityId) || locNotif.message.includes(notif.relatedEntityId),
        `[${lang}] Notification lost canonical entity ID ${notif.relatedEntityId}`
      );
    }
  }

  for (const [bucket, calDate] of [
    ['TODAY', '15/10/2026'],
    ['YESTERDAY', '14/10/2026'],
    ['DATE', '12/10/2026'],
  ] as const) {
    const enHeader = localizeNotificationDateGroupHeader(bucket, calDate, 'en');
    const locHeader = localizeNotificationDateGroupHeader(bucket, calDate, lang);
    assert.notEqual(locHeader, enHeader, `[${lang}] Date group header "${enHeader}" not localized`);
  }

  for (const status of ['New Submission', 'Awaiting Approval', 'Approved', 'Resolution Report Submitted']) {
    const locBadge = localizeNotificationStatusBadge(status, lang);
    assert.notEqual(locBadge, status, `[${lang}] Notification status badge "${status}" not localized`);
  }

  for (const toastMsg of sampleToastMessages) {
    const locToast = localizeToastMessage(toastMsg, lang);
    assert.notEqual(locToast, toastMsg, `[${lang}] Toast message not localized: "${toastMsg}"`);
  }
}
console.log('   ✓ Verified all Employee notifications, date group headers, status badges, and runtime toast messages.');

// ---------------------------------------------------------------------------
// TEST 10: Canonical English Mode Preservation Check
// ---------------------------------------------------------------------------
console.log('10. Verifying English (en) mode preserves exact canonical wording...');
assert.equal(TRANSLATIONS.en.employee.topBarTitle, 'Sub-Divisional Operations & Sanction Desk');
assert.equal(TRANSLATIONS.en.employee.appQueueTitle, 'New Connection Applications Queue');
assert.equal(TRANSLATIONS.en.employee.consumerLedgerTitle, 'Consumer Records & Energy Ledger');
assert.equal(TRANSLATIONS.en.employee.complaintMatrixTitle, 'Sub-Divisional Grievance Management Matrix');
assert.equal(TRANSLATIONS.en.employee.approvalCenterTitle, 'Approval Center — Human-in-the-Loop AI Governance');
assert.equal(TRANSLATIONS.en.employee.revenueReportTitle, 'Sub-Division Revenue & Collection Reconciliation');
for (const toastMsg of sampleToastMessages) {
  assert.equal(localizeToastMessage(toastMsg, 'en'), toastMsg);
}
console.log('   ✓ Verified English mode preserves original canonical wording.');

console.log('\n=== ALL 10 EMPLOYEE PORTAL 4-LANGUAGE LOCALIZATION TEST SUITES PASSED ===');
