import fs from 'node:fs';
import path from 'node:path';
import { translations } from '../src/i18n/translations';
import { LanguageCode } from '../src/i18n/types';
import {
  ADMIN_UI_TRANSLATIONS,
  getAdminUiDictionary,
  localizeSystemService,
  localizeAdminUserRole,
  localizeAdminUserStatus,
  localizeAdminSubdivision,
  localizeRbacModuleName,
  localizeRbacToggleAria,
  localizeAuditStatusFilter,
  localizeAuditLogEntry
} from '../src/i18n/adminContentTranslations';
import {
  localizeEmployeeDesignation,
  localizeAIRecommendation,
  localizeApprovalPermissionReason,
  localizeToastMessage
} from '../src/i18n/employeeContentTranslations';
import {
  localizeConsumerNotification,
  localizeNotificationTimestamp
} from '../src/i18n/consumerContentTranslations';
import {
  SYSTEM_SERVICES,
  AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  ROLE_PROFILES,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  FEEDER_METRICS
} from '../src/data/mockData';
import { detectAnomalies } from '../src/utils/anomalyDetector';
import { generateGroundedRecommendations } from '../src/utils/aiRecommendationEngine';
import { AuditLogItem } from '../src/types';

const LANGUAGES: LanguageCode[] = ['en', 'gu', 'hi', 'mr'];
const NON_EN: LanguageCode[] = ['gu', 'hi', 'mr'];

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('=== VIDYUTFLOW ADMIN PORTAL COMPLETE 4-LANGUAGE LOCALIZATION VERIFICATION ===\n');

// 1. Dictionary Key Parity & Non-Empty Checks
const enKeys = Object.keys(ADMIN_UI_TRANSLATIONS.en).sort();
assert(enKeys.length >= 80, `AdminUiDictionary has ${enKeys.length} keys (expected >= 80)`);

for (const lang of LANGUAGES) {
  const dict = getAdminUiDictionary(lang);
  const langKeys = Object.keys(dict).sort();
  assert(
    JSON.stringify(langKeys) === JSON.stringify(enKeys),
    `ADMIN_UI_TRANSLATIONS.${lang} has 100% key parity with en (${langKeys.length} keys)`
  );
  assert(
    translations[lang].admin === ADMIN_UI_TRANSLATIONS[lang],
    `translations.${lang}.admin is wired to ADMIN_UI_TRANSLATIONS.${lang}`
  );

  for (const key of enKeys) {
    const val = (dict as unknown as Record<string, string>)[key];
    assert(
      typeof val === 'string' && val.trim().length > 0,
      `ADMIN_UI_TRANSLATIONS.${lang}.${key} is non-empty string`
    );
  }
}

// Verify non-English UI strings are translated (except technical values like '2,480 req/min')
const TECHNICAL_IDENTICAL_KEYS = new Set(['kpiGatewayValue', 'colOriginIp', 'colTimestamp', 'colProposalId']);
for (const key of enKeys) {
  if (TECHNICAL_IDENTICAL_KEYS.has(key)) continue;
  const enVal = (ADMIN_UI_TRANSLATIONS.en as unknown as Record<string, string>)[key];
  for (const lang of NON_EN) {
    const locVal = (ADMIN_UI_TRANSLATIONS[lang] as unknown as Record<string, string>)[key];
    assert(
      locVal !== enVal,
      `ADMIN_UI_TRANSLATIONS.${lang}.${key} is localized ("${locVal}" !== "${enVal}")`
    );
  }
}

// 2. Sidebar Navigation Labels for Admin Portal
const ADMIN_SIDEBAR_KEYS = [
  'navSystemOverview',
  'navUsersRoles',
  'navAccessMatrix',
  'navAuditTrail',
  'navApiIntegrations',
  'navInfraDb',
  'navSystemSettings'
] as const;

for (const key of ADMIN_SIDEBAR_KEYS) {
  const enVal = translations.en.erp[key];
  assert(Boolean(enVal), `en.erp.${key} exists`);
  for (const lang of NON_EN) {
    const locVal = translations[lang].erp[key];
    assert(
      Boolean(locVal) && locVal !== enVal,
      `${lang}.erp.${key} is localized ("${locVal}")`
    );
  }
}

// 3. Admin Active User Designation Localization
const adminProfile = ROLE_PROFILES.admin;
assert(Boolean(adminProfile), 'Admin role profile exists');
const adminDesig = 'System Administrator — IT & Cyber Resilience';
for (const lang of NON_EN) {
  const locDesig = localizeEmployeeDesignation(adminDesig, lang);
  assert(
    locDesig !== adminDesig,
    `Admin designation "${adminDesig}" localized in ${lang} -> "${locDesig}"`
  );
}

// 4. View 1: SYSTEM_SERVICES Localization
assert(SYSTEM_SERVICES.length === 6, 'SYSTEM_SERVICES has 6 microservices');
for (const svc of SYSTEM_SERVICES) {
  const enSvc = localizeSystemService(svc, 'en');
  assert(enSvc.name === svc.name, `en service name preserved: ${svc.name}`);
  assert(enSvc.category === svc.category, `en service category preserved: ${svc.category}`);
  assert(enSvc.lastIncident === svc.lastIncident, `en service lastIncident preserved: ${svc.lastIncident}`);
  assert(enSvc.statusBadge === svc.status, `en service statusBadge preserved: ${svc.status}`);

  for (const lang of NON_EN) {
    const locSvc = localizeSystemService(svc, lang);
    assert(locSvc.name !== svc.name, `Service name "${svc.name}" localized in ${lang} -> "${locSvc.name}"`);
    assert(locSvc.category !== svc.category, `Service category "${svc.category}" localized in ${lang} -> "${locSvc.category}"`);
    assert(locSvc.lastIncident !== svc.lastIncident, `Service lastIncident "${svc.lastIncident}" localized in ${lang} -> "${locSvc.lastIncident}"`);
    assert(locSvc.statusBadge !== svc.status, `Service status "${svc.status}" localized in ${lang} -> "${locSvc.statusBadge}"`);
  }
}

// 5. View 2: Enterprise User Management Localization
const ADMIN_USERS = [
  { id: 'USR-101', name: 'Rajesh V. Trivedi', email: 'rajesh.trivedi@ugvcl.gov.in', role: 'Office Employee ERP', subdivision: 'Gandhinagar Sub-Div 2', status: 'Active', lastLogin: '15-Oct 06:12' },
  { id: 'USR-102', name: 'Vikramaditya Solanki', email: 'vikram.solanki@ugvcl.gov.in', role: 'Field Engineer', subdivision: 'Mehsana Rural Feeder Wing', status: 'Active', lastLogin: '15-Oct 05:45' },
  { id: 'USR-103', name: 'Dr. Harita Joshi', email: 'harita.joshi@ugvcl.gov.in', role: 'Management', subdivision: 'UGVCL Corporate Mehsana', status: 'Active', lastLogin: '14-Oct 19:20' },
  { id: 'USR-104', name: 'K. V. Sharma', email: 'kv.sharma@ugvcl.gov.in', role: 'System Administrator', subdivision: 'State Data Center / IT Cell', status: 'Active', lastLogin: '15-Oct 06:01' },
  { id: 'USR-105', name: 'Ramesh Barot', email: 'ramesh.barot@ugvcl.gov.in', role: 'Office Employee ERP', subdivision: 'Mehsana Industrial GIDC', status: 'Active', lastLogin: '14-Oct 17:30' },
  { id: 'USR-106', name: 'Dinesh Vaghela', email: 'dinesh.vaghela@ugvcl.gov.in', role: 'Field Engineer', subdivision: 'Gandhinagar Sub-Div 2', status: 'Locked', lastLogin: '11-Oct 09:15' }
] as const;

for (const u of ADMIN_USERS) {
  assert(localizeAdminUserRole(u.role, 'en') === u.role, `en user role preserved: ${u.role}`);
  assert(localizeAdminSubdivision(u.subdivision, 'en') === u.subdivision, `en user subdivision preserved: ${u.subdivision}`);
  assert(localizeAdminUserStatus(u.status, 'en') === u.status, `en user status preserved: ${u.status}`);
  assert(localizeNotificationTimestamp(u.lastLogin, 'en') === u.lastLogin, `en user lastLogin preserved: ${u.lastLogin}`);

  for (const lang of NON_EN) {
    const locRole = localizeAdminUserRole(u.role, lang);
    const locSubdiv = localizeAdminSubdivision(u.subdivision, lang);
    const locStatus = localizeAdminUserStatus(u.status, lang);
    const locLogin = localizeNotificationTimestamp(u.lastLogin, lang);
    assert(locRole !== u.role, `User role "${u.role}" localized in ${lang} -> "${locRole}"`);
    assert(locSubdiv !== u.subdivision, `User subdivision "${u.subdivision}" localized in ${lang} -> "${locSubdiv}"`);
    assert(locStatus !== u.status, `User status "${u.status}" localized in ${lang} -> "${locStatus}"`);
    assert(locLogin !== u.lastLogin, `User lastLogin "${u.lastLogin}" localized in ${lang} -> "${locLogin}"`);
  }
}

// 6. View 3: RBAC Matrix Modules & Aria Labels
const RBAC_MODULES = [
  'New Connection Sanction Approval',
  'Field Feasibility & Meter Audit Submission',
  'Electricity Bill Adjustment & Tariff Modification',
  'Grievance Redressal Dispatch & Closure',
  'Citizen Bill Payment & Self Service Portal',
  'SCADA Feeder Telemetry & AT&C Loss Dashboard',
  'RBAC Security Matrix & System Audit Logs'
];
const RBAC_ROLES = ['consumer', 'employee', 'field', 'management', 'admin'] as const;

for (const mod of RBAC_MODULES) {
  assert(localizeRbacModuleName(mod, 'en') === mod, `en RBAC module preserved: ${mod}`);
  for (const lang of NON_EN) {
    const locMod = localizeRbacModuleName(mod, lang);
    assert(locMod !== mod, `RBAC module "${mod}" localized in ${lang} -> "${locMod}"`);
    for (const role of RBAC_ROLES) {
      const aria = localizeRbacToggleAria(mod, role, lang);
      assert(
        aria !== localizeRbacToggleAria(mod, role, 'en') && aria.includes(locMod),
        `RBAC toggle aria-label localized for ${mod} (${role}) in ${lang} -> "${aria}"`
      );
    }
  }
}

// 7. View 4 Section A: AI Recommendations & Security Governance Queue
const detectedIncidents = detectAnomalies({
  feeders: FEEDER_METRICS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  auditLogs: AUDIT_LOGS
});

const initialRecs = generateGroundedRecommendations({
  applications: INITIAL_APPLICATIONS,
  complaints: INITIAL_COMPLAINTS,
  workOrders: INITIAL_WORK_ORDERS,
  incidents: detectedIncidents,
  auditLogs: AUDIT_LOGS
});

const secRec = initialRecs.find(r => r.id === 'REC-SEC-AUTH-01')!;
assert(Boolean(secRec), 'Security recommendation REC-SEC-AUTH-01 exists in initial recommendations');

for (const rec of initialRecs) {
  const enRec = localizeAIRecommendation(rec, 'en');
  assert(enRec.title === rec.title, `en recommendation title preserved: ${rec.id}`);
  assert(enRec.affectedRecordLabel === rec.affectedRecord.label, `en affectedRecordLabel preserved: ${rec.id}`);

  for (const lang of NON_EN) {
    const locRec = localizeAIRecommendation(rec, lang);
    assert(locRec.title !== rec.title, `Recommendation ${rec.id} title localized in ${lang} -> "${locRec.title}"`);
    assert(locRec.description !== rec.description, `Recommendation ${rec.id} description localized in ${lang}`);
    assert(locRec.reasoningSummary !== rec.reasoningSummary, `Recommendation ${rec.id} reasoning localized in ${lang}`);
    assert(locRec.riskLevelLabel !== rec.riskLevel, `Recommendation ${rec.id} riskLevel localized in ${lang} -> "${locRec.riskLevelLabel}"`);
    assert(locRec.statusLabel !== rec.status, `Recommendation ${rec.id} status localized in ${lang} -> "${locRec.statusLabel}"`);
    if (rec.id === 'REC-SEC-AUTH-01') {
      assert(
        locRec.affectedRecordLabel !== rec.affectedRecord.label &&
          locRec.affectedRecordLabel.includes('192.168.10.45'),
        `Security recommendation affectedRecordLabel localized while preserving IP in ${lang} -> "${locRec.affectedRecordLabel}"`
      );
      assert(
        locRec.previousValueLabel !== 'Active' && locRec.proposedValueLabel !== 'Revoked',
        `Security recommendation state transition Active -> Revoked localized in ${lang}: ${locRec.previousValueLabel} -> ${locRec.proposedValueLabel}`
      );
    }
  }
}

// Verify Admin approval restriction message
const adminRestrictMsg =
  'Security credential and active session revocation requires System Administration & Security Governance authority (Admin role).';
for (const lang of NON_EN) {
  const locReason = localizeApprovalPermissionReason(adminRestrictMsg, lang);
  assert(
    locReason !== adminRestrictMsg,
    `Admin security approval restriction reason localized in ${lang} -> "${locReason}"`
  );
}

// 8. View 4 Section B: System Audit Stream & Dynamic Audit Events
const STATUS_FILTERS = ['ALL', 'SUCCESS', 'WARNING', 'FAILED'] as const;
for (const st of STATUS_FILTERS) {
  assert(localizeAuditStatusFilter(st, 'en') === st, `en audit status filter preserved: ${st}`);
  for (const lang of NON_EN) {
    const locSt = localizeAuditStatusFilter(st, lang);
    assert(locSt !== st, `Audit status filter "${st}" localized in ${lang} -> "${locSt}"`);
  }
}

for (const log of AUDIT_LOGS) {
  const enLog = localizeAuditLogEntry(log, 'en');
  assert(enLog.timestamp === log.timestamp, `en audit timestamp preserved: ${log.timestamp}`);
  assert(enLog.role === log.role, `en audit role preserved: ${log.role}`);
  assert(enLog.actionLabel === log.action, `en audit action preserved: ${log.action}`);
  assert(enLog.resource === log.resource, `en audit resource preserved: ${log.resource}`);

  for (const lang of NON_EN) {
    const locLog = localizeAuditLogEntry(log, lang);
    assert(locLog.timestamp !== log.timestamp, `Audit timestamp "${log.timestamp}" localized in ${lang} -> "${locLog.timestamp}"`);
    assert(locLog.role !== log.role, `Audit role "${log.role}" localized in ${lang} -> "${locLog.role}"`);
    assert(locLog.actionLabel !== log.action, `Audit action "${log.action}" localized in ${lang} -> "${locLog.actionLabel}"`);
    assert(locLog.statusBadge !== enLog.statusBadge, `Audit statusBadge localized in ${lang} -> "${locLog.statusBadge}"`);
    if (log.resource === 'Consumer Auth Gateway') {
      assert(locLog.resource !== log.resource, `Audit resource "${log.resource}" localized in ${lang} -> "${locLog.resource}"`);
    } else {
      assert(locLog.resource === log.resource, `Canonical ID resource "${log.resource}" preserved in ${lang}`);
    }
  }
}

// Test dynamic audit actions across all portals
const DYNAMIC_AUDIT_SAMPLES: AuditLogItem[] = [
  { id: 'AUD-9950', timestamp: '15-Oct 06:30', actor: 'K. V. Sharma', role: 'IT & Cyber Resilience', action: 'AI_ACTION_APPROVED_AND_EXECUTED', resource: 'REC-SEC-AUTH-01', ipAddress: '127.0.0.1', status: 'SUCCESS', metaDetail: 'Approved by Admin' },
  { id: 'AUD-9951', timestamp: '15-Oct 06:31', actor: 'K. V. Sharma', role: 'IT & Cyber Resilience', action: 'SECURITY_REVOKE_SESSION', resource: 'AUD-9904', ipAddress: '127.0.0.1', status: 'WARNING', metaDetail: 'Session revoked' },
  { id: 'AUD-9952', timestamp: '15-Oct 06:32', actor: 'Rajesh V. Trivedi', role: 'Sub-Division Officer', action: 'DEMO_ACCOUNT_SWITCHED', resource: 'Workspace:admin', ipAddress: '127.0.0.1', status: 'SUCCESS', metaDetail: 'Switched to admin' },
  { id: 'AUD-9953', timestamp: '15-Oct 06:33', actor: 'Vikramaditya Solanki', role: 'Field Operations JE', action: 'EMERGENCY_SAFETY_OVERRIDE_BROADCAST', resource: 'INC-2026-0092', ipAddress: '127.0.0.1', status: 'WARNING', metaDetail: 'Emergency override' }
];

for (const sample of DYNAMIC_AUDIT_SAMPLES) {
  for (const lang of NON_EN) {
    const locSample = localizeAuditLogEntry(sample, lang);
    assert(
      locSample.actionLabel !== sample.action,
      `Dynamic audit action "${sample.action}" localized in ${lang} -> "${locSample.actionLabel}"`
    );
    assert(
      locSample.role !== sample.role,
      `Dynamic audit role "${sample.role}" localized in ${lang} -> "${locSample.role}"`
    );
    if (sample.resource.startsWith('Workspace:')) {
      assert(
        locSample.resource !== sample.resource,
        `Dynamic workspace resource "${sample.resource}" localized in ${lang} -> "${locSample.resource}"`
      );
    }
  }
}

// 9. Admin Portal Toasts & Notifications
const ADMIN_TOAST_SAMPLES = [
  'Simulated zero-downtime certificate renewal',
  'New enterprise user onboarding dialog (Demo)',
  'User USR-106 access state toggled (Demo)',
  'Permission matrix updated in volatile session',
  'Simulated database snapshot triggered (PostgreSQL Cluster)',
  'Simulated snapshot completed: 184.6 GB archived to GSDC cold storage',
  'Settings saved to volatile session (Demo)',
  'Action REC-SEC-AUTH-01 approved & executed successfully!',
  'Recommendation REC-SEC-AUTH-01 rejected by operator. Action cancelled.'
];

for (const msg of ADMIN_TOAST_SAMPLES) {
  assert(localizeToastMessage(msg, 'en') === msg, `en toast preserved: ${msg}`);
  for (const lang of NON_EN) {
    const locMsg = localizeToastMessage(msg, lang);
    assert(locMsg !== msg, `Admin toast "${msg}" localized in ${lang} -> "${locMsg}"`);
  }
}

const adminNotif = INITIAL_NOTIFICATIONS.find(n => n.id === 'NOTIF-05')!;
assert(Boolean(adminNotif), 'Admin notification NOTIF-05 exists');
for (const lang of NON_EN) {
  const locNotif = localizeConsumerNotification(adminNotif, lang);
  assert(locNotif.title !== adminNotif.title, `NOTIF-05 title localized in ${lang} -> "${locNotif.title}"`);
  assert(locNotif.message !== adminNotif.message, `NOTIF-05 message localized in ${lang} -> "${locNotif.message}"`);
}

// 10. Source Code Integrity Verification for AdminPortal.tsx
const adminPortalPath = path.resolve(process.cwd(), 'src/components/admin/AdminPortal.tsx');
const adminPortalSource = fs.readFileSync(adminPortalPath, 'utf8');

assert(
  adminPortalSource.includes('/assets/ugvcl-logo.png'),
  'AdminPortal.tsx preserves official UGVCL logo path (/assets/ugvcl-logo.png)'
);
assert(
  adminPortalSource.includes('useLanguage') && adminPortalSource.includes('getAdminUiDictionary'),
  'AdminPortal.tsx uses useLanguage and getAdminUiDictionary'
);
assert(
  !adminPortalSource.includes('>IT Infrastructure &amp; Cyber Resilience Console<') &&
    !adminPortalSource.includes('>Enterprise User Management<') &&
    !adminPortalSource.includes('>Role-Based Access Control (RBAC) Matrix<') &&
    !adminPortalSource.includes('>PostgreSQL Enterprise Cluster Backup<'),
  'AdminPortal.tsx has zero hardcoded English section headings in JSX'
);

console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
