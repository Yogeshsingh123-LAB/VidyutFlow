import {
  UserRole,
  ElectricityBill,
  PaymentTransaction,
  NewConnectionApplication,
  ComplaintRecord,
  ElectricityConnection,
  WorkOrder,
  CriticalIncident,
  FeederHealth,
  AuditLogItem,
  SystemServiceStatus,
  AIActionRecommendation,
} from '../types';
import { Language } from '../i18n/types';
import { redactSensitiveData } from './securityHardening';
import { filterIncidentsForSession } from './anomalyDetector';
import { resolveCanonicalFieldEngineerIdentity } from './fieldNotificationEngine';

export type ExportFormat = 'csv' | 'json';
export type ExportScope = 'filtered' | 'selected' | 'all_authorized';
export type ExportDataSourceClassification = 'DEMO' | 'LIVE' | 'SIMULATED' | 'FORECAST';

export function normalizeExportDataSource(raw?: string): ExportDataSourceClassification {
  if (!raw) return 'DEMO';
  const upper = raw.toUpperCase();
  if (upper.includes('FORECAST')) return 'FORECAST';
  if (upper.includes('SIMULATED')) return 'SIMULATED';
  if (upper.includes('LIVE')) return 'LIVE';
  return 'DEMO';
}

export type ExportDatasetKey =
  // Consumer & shared operational datasets
  | 'bills'
  | 'payments'
  | 'applications'
  | 'complaints'
  | 'connections'
  // Employee datasets
  | 'work_orders'
  | 'incidents'
  | 'consumers'
  | 'revenue_report'
  // Field Engineer datasets
  | 'assigned_work_orders'
  | 'site_inspections'
  | 'completed_jobs'
  | 'feeder_patrol'
  // Management datasets
  | 'executive_kpis'
  | 'monthly_performance'
  | 'escalated_incidents'
  | 'feeder_analytics'
  | 'subdivision_sla'
  | 'ai_governance'
  // Admin datasets
  | 'user_accounts'
  | 'rbac_matrix'
  | 'audit_logs'
  | 'system_services'
  | 'governance_approvals';

export interface ExportColumnDefinition<T = Record<string, unknown>> {
  key: string;
  header: string;
  extractor?: (row: T) => unknown;
}

export interface ExportActorIdentity {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  subdivision?: string;
  consumerNo?: string;
  ownedConsumerNos?: string[];
  assignedFeederIds?: string[];
}

export interface ExportMetadataEnvelope {
  application: string;
  exportVersion: string;
  generatedAt: string;
  portalRole: UserRole;
  exportedBy: {
    id: string;
    name: string;
    subdivision: string;
  };
  dataset: ExportDatasetKey;
  datasetLabel: string;
  scope: ExportScope;
  recordCount: number;
  dataSource: ExportDataSourceClassification;
  language: Language;
}

export interface ExportJsonPayload<T = Record<string, unknown>> {
  metadata: ExportMetadataEnvelope;
  records: T[];
}

export interface ExecuteDatasetExportOptions<T = Record<string, unknown>> {
  role: UserRole;
  actor: ExportActorIdentity;
  datasetKey: ExportDatasetKey;
  format: ExportFormat;
  scope?: ExportScope;
  records: readonly T[];
  language?: Language;
  dataSource?: ExportDataSourceClassification;
  customColumns?: ExportColumnDefinition<T>[];
  referenceDate?: Date | string;
  includeBom?: boolean;
  skipBrowserDownload?: boolean;
}

export interface ExecuteDatasetExportResult<T = Record<string, unknown>> {
  success: boolean;
  isEmpty: boolean;
  unauthorized?: boolean;
  format: ExportFormat;
  scope: ExportScope;
  datasetKey: ExportDatasetKey;
  filename: string;
  mimeType: string;
  recordCount: number;
  dataSource: ExportDataSourceClassification;
  content: string;
  metadata: ExportMetadataEnvelope;
  sanitizedRecords: T[];
  message: string;
}

export interface ExportUiTranslationSet {
  exportBtn: string;
  exportCsv: string;
  exportJson: string;
  exportSelected: string;
  exportFiltered: string;
  exportAllAuthorized: string;
  noRecordsToExport: string;
  exportCompleted: string;
  exportFailed: string;
  unauthorizedExport: string;
  download: string;
  recordCountLabel: string;
  dataSourceLabel: string;
  scopeLabel: string;
  formatLabel: string;
  datasetLabels: Record<ExportDatasetKey, string>;
}

export const EXPORT_UI_TRANSLATIONS: Record<Language, ExportUiTranslationSet> = {
  en: {
    exportBtn: 'Export',
    exportCsv: 'Export CSV',
    exportJson: 'Export JSON',
    exportSelected: 'Export selected',
    exportFiltered: 'Export filtered',
    exportAllAuthorized: 'Export all authorized',
    noRecordsToExport: 'No records to export',
    exportCompleted: 'Export completed',
    exportFailed: 'Export failed',
    unauthorizedExport: 'Export not permitted for current role',
    download: 'Download',
    recordCountLabel: 'Records',
    dataSourceLabel: 'Source',
    scopeLabel: 'Export Scope',
    formatLabel: 'File Format',
    datasetLabels: {
      bills: 'Electricity Bills & Tariff Ledger',
      payments: 'Payment Transactions History',
      applications: 'New Connection & Solar Applications',
      complaints: 'Consumer Complaints & SLA Ledger',
      connections: 'Service Connections Directory',
      work_orders: 'Field Work Orders Queue',
      incidents: 'Operational & Critical Incidents',
      consumers: 'Subdivision Consumer Master Ledger',
      revenue_report: 'Subdivision Revenue & Collection Summary',
      assigned_work_orders: 'Assigned Field Work Orders',
      site_inspections: 'Site Feasibility & Inspection Findings',
      completed_jobs: 'Completed Field Jobs & Resolution Log',
      feeder_patrol: '11kV Feeder Patrol & Telemetry Status',
      executive_kpis: 'Executive Utility KPIs Summary',
      monthly_performance: 'Monthly Revenue, Demand & AT&C Loss Metrics',
      escalated_incidents: 'Escalated & Emergency Grid Incidents',
      feeder_analytics: 'Feeder Health, Outage & Loss Analytics',
      subdivision_sla: 'Subdivision SLA Compliance Scorecard',
      ai_governance: 'AI Action Recommendations & Governance Queue',
      user_accounts: 'Enterprise User Accounts & Role Directory',
      rbac_matrix: 'Role-Based Access Control (RBAC) Matrix',
      audit_logs: 'Immutable Security & Operational Audit Logs',
      system_services: 'Core Microservices & Integration Health',
      governance_approvals: 'Admin Governance & High-Impact Approvals',
    },
  },
  gu: {
    exportBtn: 'નિકાસ કરો',
    exportCsv: 'CSV નિકાસ કરો',
    exportJson: 'JSON નિકાસ કરો',
    exportSelected: 'પસંદ કરેલ નિકાસ કરો',
    exportFiltered: 'ફિલ્ટર કરેલ નિકાસ કરો',
    exportAllAuthorized: 'તમામ અધિકૃત રેકોર્ડ નિકાસ કરો',
    noRecordsToExport: 'નિકાસ કરવા માટે કોઈ રેકોર્ડ નથી',
    exportCompleted: 'નિકાસ સફળતાપૂર્વક પૂર્ણ થઈ',
    exportFailed: 'નિકાસ નિષ્ફળ ગઈ',
    unauthorizedExport: 'વર્તમાન ભૂમિકા માટે નિકાસની પરવાનગી નથી',
    download: 'ડાઉનલોડ કરો',
    recordCountLabel: 'રેકોર્ડ્સ',
    dataSourceLabel: 'સ્ત્રોત',
    scopeLabel: 'નિકાસનો વ્યાપ',
    formatLabel: 'ફાઇલ ફોર્મેટ',
    datasetLabels: {
      bills: 'વીજળી બિલ અને ટેરિફ લેજર',
      payments: 'ચુકવણી વ્યવહાર ઇતિહાસ',
      applications: 'નવા જોડાણ અને સોલાર અરજીઓ',
      complaints: 'ગ્રાહક ફરિયાદો અને SLA લેજર',
      connections: 'વીજ જોડાણ ડિરેક્ટરી',
      work_orders: 'ફિલ્ડ વર્ક ઓર્ડર કતાર',
      incidents: 'ઓપરેશનલ અને ગંભીર ઘટનાઓ',
      consumers: 'સબડિવિઝન ગ્રાહક માસ્ટર લેજર',
      revenue_report: 'સબડિવિઝન આવક અને વસૂલાત અહેવાલ',
      assigned_work_orders: 'સોંપાયેલ ફિલ્ડ વર્ક ઓર્ડર',
      site_inspections: 'સાઇટ ફિઝિબિલિટી અને નિરીક્ષણ તારણો',
      completed_jobs: 'પૂર્ણ થયેલ ફિલ્ડ કાર્ય અને નિવારણ લોગ',
      feeder_patrol: '11kV ફીડર પેટ્રોલ અને ટેલિમેટ્રી સ્થિતિ',
      executive_kpis: 'એક્ઝિક્યુટિવ યુટિલિટી KPI સારાંશ',
      monthly_performance: 'માસિક આવક, માંગ અને AT&C લોસ મેટ્રિક્સ',
      escalated_incidents: 'એસ્કેલેટેડ અને કટોકટી ગ્રિડ ઘટનાઓ',
      feeder_analytics: 'ફીડર હેલ્થ, આઉટેજ અને લોસ એનાલિટિક્સ',
      subdivision_sla: 'સબડિવિઝન SLA પાલન સ્કોરકાર્ડ',
      ai_governance: 'AI ભલામણો અને ગવર્નન્સ કતાર',
      user_accounts: 'એન્ટરપ્રાઇઝ વપરાશકર્તા ખાતા અને ભૂમિકા ડિરેક્ટરી',
      rbac_matrix: 'રોલ-બેઝ્ડ એક્સેસ કંટ્રોલ (RBAC) મેટ્રિક્સ',
      audit_logs: 'સુરક્ષા અને ઓપરેશનલ ઓડિટ લોગ્સ',
      system_services: 'કોર માઇક્રોસર્વિસિસ અને ઇન્ટિગ્રેશન સ્થિતિ',
      governance_approvals: 'એડમિન ગવર્નન્સ અને મંજૂરીઓ',
    },
  },
  hi: {
    exportBtn: 'निर्यात करें',
    exportCsv: 'CSV निर्यात करें',
    exportJson: 'JSON निर्यात करें',
    exportSelected: 'चयनित निर्यात करें',
    exportFiltered: 'फ़िल्टर किए गए निर्यात करें',
    exportAllAuthorized: 'सभी अधिकृत रिकॉर्ड निर्यात करें',
    noRecordsToExport: 'निर्यात करने के लिए कोई रिकॉर्ड नहीं है',
    exportCompleted: 'निर्यात सफलतापूर्वक पूर्ण हुआ',
    exportFailed: 'निर्यात विफल रहा',
    unauthorizedExport: 'वर्तमान भूमिका के लिए निर्यात की अनुमति नहीं है',
    download: 'डाउनलोड करें',
    recordCountLabel: 'रिकॉर्ड',
    dataSourceLabel: 'स्रोत',
    scopeLabel: 'निर्यात दायरा',
    formatLabel: 'फ़ाइल प्रारूप',
    datasetLabels: {
      bills: 'बिजली बिल और टैरिफ लेजर',
      payments: 'भुगतान लेनदेन इतिहास',
      applications: 'नए कनेक्शन और सोलर आवेदन',
      complaints: 'उपभोक्ता शिकायतें और SLA लेजर',
      connections: 'विद्युत कनेक्शन निर्देशिका',
      work_orders: 'फील्ड वर्क ऑर्डर कतार',
      incidents: 'परिचालन और गंभीर घटनाएं',
      consumers: 'सबडिवीजन उपभोक्ता मास्टर लेजर',
      revenue_report: 'सबडिवीजन राजस्व और वसूली सारांश',
      assigned_work_orders: 'सौंपे गए फील्ड वर्क ऑर्डर',
      site_inspections: 'साइट व्यवहार्यता और निरीक्षण निष्कर्ष',
      completed_jobs: 'पूर्ण किए गए फील्ड कार्य और समाधान लॉग',
      feeder_patrol: '11kV फीडर पेट्रोल और टेलीमेट्री स्थिति',
      executive_kpis: 'एग्जीक्यूटिव यूटिलिटी KPI सारांश',
      monthly_performance: 'मासिक राजस्व, मांग और AT&C हानि मेट्रिक्स',
      escalated_incidents: 'एस्केलेटेड और आपातकालीन ग्रिड घटनाएं',
      feeder_analytics: 'फीडर स्वास्थ्य, आउटेज और हानि एनालिटिक्स',
      subdivision_sla: 'सबडिवीजन SLA अनुपालन स्कोरकार्ड',
      ai_governance: 'AI कार्य अनुशंसाएं और गवर्नेंस कतार',
      user_accounts: 'एंटरप्राइज उपयोगकर्ता खाते और भूमिका निर्देशिका',
      rbac_matrix: 'रोल-बेस्ड एक्सेस कंट्रोल (RBAC) मैट्रिक्स',
      audit_logs: 'सुरक्षा और परिचालन ऑडिट लॉग',
      system_services: 'कोर माइक्रोसर्विसेज और एकीकरण स्वास्थ्य',
      governance_approvals: 'एडमिन गवर्नेंस और उच्च-प्रभाव स्वीकृतियां',
    },
  },
  mr: {
    exportBtn: 'निर्यात करा',
    exportCsv: 'CSV निर्यात करा',
    exportJson: 'JSON निर्यात करा',
    exportSelected: 'निवडलेले निर्यात करा',
    exportFiltered: 'फिल्टर केलेले निर्यात करा',
    exportAllAuthorized: 'सर्व अधिकृत रेकॉर्ड निर्यात करा',
    noRecordsToExport: 'निर्यात करण्यासाठी कोणतेही रेकॉर्ड नाहीत',
    exportCompleted: 'निर्यात यशस्वीरित्या पूर्ण झाली',
    exportFailed: 'निर्यात अयशस्वी झाली',
    unauthorizedExport: 'सध्याच्या भूमिकेसाठी निर्यातीची परवानगी नाही',
    download: 'डाउनलोड करा',
    recordCountLabel: 'रेकॉर्ड्स',
    dataSourceLabel: 'स्रोत',
    scopeLabel: 'निर्यात व्याप्ती',
    formatLabel: 'फाईल फॉरमॅट',
    datasetLabels: {
      bills: 'वीज बिल आणि टॅरिफ लेजर',
      payments: 'पेमेंट व्यवहार इतिहास',
      applications: 'नवीन जोडणी आणि सोलर अर्ज',
      complaints: 'ग्राहक तक्रारी आणि SLA लेजर',
      connections: 'वीज जोडणी निर्देशिका',
      work_orders: 'फील्ड वर्क ऑर्डर रांग',
      incidents: 'ऑपरेशनल आणि गंभीर घटना',
      consumers: 'सबडिव्हिजन ग्राहक मास्टर लेजर',
      revenue_report: 'सबडिव्हिजन महसूल आणि वसुली सारांश',
      assigned_work_orders: 'नेमून दिलेले फील्ड वर्क ऑर्डर',
      site_inspections: 'साईट फिजिबिलिटी आणि तपासणी निष्कर्ष',
      completed_jobs: 'पूर्ण झालेली फील्ड कामे आणि निवारण लॉग',
      feeder_patrol: '11kV फीडर पेट्रोल आणि टेलीमेट्री स्थिती',
      executive_kpis: 'एक्झिक्युटिव्ह युटिलिटी KPI सारांश',
      monthly_performance: 'मासिक महसूल, मागणी आणि AT&C लॉस मेट्रिक्स',
      escalated_incidents: 'एस्केलेटेड आणि आपत्कालीन ग्रिड घटना',
      feeder_analytics: 'फीडर आरोग्य, आउटेज आणि लॉस अॅनालिटिक्स',
      subdivision_sla: 'सबडिव्हिजन SLA अनुपालन स्कोअरकार्ड',
      ai_governance: 'AI कृती शिफारसी आणि गव्हर्नन्स रांग',
      user_accounts: 'एंटरप्राइझ वापरकर्ता खाती आणि भूमिका निर्देशिका',
      rbac_matrix: 'रोल-बेस्ड अॅक्सेस कंट्रोल (RBAC) मॅट्रिक्स',
      audit_logs: 'सुरक्षा आणि ऑपरेशनल ऑडिट लॉग्स',
      system_services: 'कोर मायक्रोसर्व्हिसेस आणि इंटिग्रेशन आरोग्य',
      governance_approvals: 'अॅडमिन गव्हर्नन्स आणि उच्च-प्रभाव मंजुरी',
    },
  },
};

export function getExportUiTranslations(language: Language = 'en'): ExportUiTranslationSet {
  return EXPORT_UI_TRANSLATIONS[language] || EXPORT_UI_TRANSLATIONS.en;
}

/**
 * Role-to-dataset authorization matrix.
 * Strictly governs which datasets each portal role may export.
 */
export const ROLE_ALLOWED_DATASETS: Record<UserRole, readonly ExportDatasetKey[]> = {
  consumer: ['bills', 'payments', 'applications', 'complaints', 'connections'],
  employee: [
    'applications',
    'complaints',
    'work_orders',
    'incidents',
    'consumers',
    'revenue_report',
    'bills',
    'payments',
  ],
  field: ['assigned_work_orders', 'site_inspections', 'completed_jobs', 'feeder_patrol'],
  management: [
    'executive_kpis',
    'monthly_performance',
    'escalated_incidents',
    'feeder_analytics',
    'subdivision_sla',
    'ai_governance',
    'revenue_report',
  ],
  admin: [
    'user_accounts',
    'rbac_matrix',
    'audit_logs',
    'system_services',
    'governance_approvals',
    'incidents',
  ],
};

/**
 * Forbidden keys that must NEVER be included in any CSV or JSON export.
 */
const FORBIDDEN_EXPORT_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'sessiontoken',
  'session_token',
  'signedtoken',
  'signed_token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'apikey',
  'api_key',
  'gemini_api_key',
  'session_secret',
  'secret',
  'privatekey',
  'private_key',
  'authorization',
  'cookie',
  'internal_secret',
  '__proto__',
  'constructor',
]);

export function isDatasetAllowedForRole(role: UserRole, datasetKey: ExportDatasetKey): boolean {
  const allowed = ROLE_ALLOWED_DATASETS[role];
  return Array.isArray(allowed) && allowed.includes(datasetKey);
}

/**
 * Checks if an Employee is authorized for a given record's subdivision.
 * Mirrors AppContext subdivision jurisdiction rules.
 */
export function isEmployeeAuthorizedForExportSubdivision(
  employeeSubdivision: string | undefined,
  recordSubdivision: string | undefined
): boolean {
  if (!recordSubdivision || !employeeSubdivision) return true;
  const empNorm = employeeSubdivision.toLowerCase();
  const recNorm = recordSubdivision.toLowerCase();
  if (empNorm.includes('all') || empNorm.includes('circle') || empNorm.includes('division')) {
    return true;
  }
  const empBase = empNorm.split('(')[0].replace('sub-division', '').replace('subdivision', '').trim();
  const recBase = recNorm.split('(')[0].replace('sub-division', '').replace('subdivision', '').trim();
  if (!empBase || !recBase) return true;
  return recNorm.includes(empBase) || empNorm.includes(recBase);
}

/**
 * Checks if a WorkOrder or Inspection record belongs to the active Field Engineer.
 */
export function isWorkOrderAssignedToFieldEngineer(
  workOrder: Record<string, unknown>,
  actor: ExportActorIdentity
): boolean {
  const canonicalEngineer = resolveCanonicalFieldEngineerIdentity(
    actor.id || actor.name
  );

  const actorIdNorm = (actor.id || '').trim().toLowerCase();
  const canonicalIdNorm = (canonicalEngineer.id || '').trim().toLowerCase();
  const actorNameNorm = (actor.name || '').trim().toLowerCase();
  const canonicalNameNorm = (canonicalEngineer.name || '').trim().toLowerCase();

  const assignedEngineerId = String(workOrder.assignedEngineerId || '').trim().toLowerCase();
  const assignedTo = String(workOrder.assignedTo || '').trim().toLowerCase();
  const inspectionReport = workOrder.inspectionReport as Record<string, unknown> | undefined;
  const completedBy = String(inspectionReport?.completedBy || '').trim().toLowerCase();

  if (
    assignedEngineerId &&
    (assignedEngineerId === actorIdNorm || assignedEngineerId === canonicalIdNorm)
  ) {
    return true;
  }
  if (assignedTo && (assignedTo === actorIdNorm || assignedTo === canonicalIdNorm)) {
    return true;
  }

  const cleanActorName = actorNameNorm.split('(')[0].trim();
  const cleanCanonicalName = canonicalNameNorm.split('(')[0].trim();
  if (
    assignedTo &&
    ((cleanActorName && assignedTo.includes(cleanActorName)) ||
      (cleanCanonicalName && assignedTo.includes(cleanCanonicalName)))
  ) {
    return true;
  }

  if (
    completedBy &&
    (completedBy === actorIdNorm ||
      completedBy === canonicalIdNorm ||
      (cleanActorName && completedBy.includes(cleanActorName)) ||
      (cleanCanonicalName && completedBy.includes(cleanCanonicalName)))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a Consumer record belongs to the active Consumer account.
 */
export function isRecordOwnedByConsumer(
  record: Record<string, unknown>,
  actor: ExportActorIdentity
): boolean {
  const actorId = (actor.id || '').trim();
  const actorEmail = (actor.email || '').trim().toLowerCase();
  const ownedConsumerNos = new Set<string>(
    [actor.consumerNo, ...(actor.ownedConsumerNos || [])]
      .filter((v): v is string => Boolean(v && v.trim()))
      .map((v) => v.trim())
  );

  // Default canonical fallback for demo_consumer & cns_arvind_02
  if (actorId === 'demo_consumer' && ownedConsumerNos.size === 0) {
    ownedConsumerNos.add('04281-99231');
    ownedConsumerNos.add('04281-77190');
    ownedConsumerNos.add('UGV-2026-884120');
    ownedConsumerNos.add('UGV-2026-884125');
  } else if (actorId === 'cns_arvind_02' && ownedConsumerNos.size === 0) {
    ownedConsumerNos.add('04281-66512');
    ownedConsumerNos.add('UGV-2026-771004');
  }

  const recordAccountId = typeof record.accountId === 'string' ? record.accountId.trim() : '';
  const recordConsumerNo =
    typeof record.consumerNo === 'string'
      ? record.consumerNo.trim()
      : typeof record.linkedConsumerNo === 'string'
      ? record.linkedConsumerNo.trim()
      : '';
  const recordEmail =
    typeof record.email === 'string'
      ? record.email.trim().toLowerCase()
      : typeof record.accountEmail === 'string'
      ? record.accountEmail.trim().toLowerCase()
      : '';

  if (recordAccountId && actorId && recordAccountId === actorId) {
    return true;
  }
  if (recordConsumerNo && ownedConsumerNos.has(recordConsumerNo)) {
    return true;
  }
  if (!recordAccountId && !recordConsumerNo && recordEmail && actorEmail && recordEmail === actorEmail) {
    return true;
  }
  return false;
}

/**
 * Deeply clones and strips any sensitive/forbidden properties from an object before export.
 * Never mutates the original record.
 */
export function stripForbiddenFieldsFromRecord<T>(record: T): T {
  if (record === null || record === undefined || typeof record !== 'object') {
    if (typeof record === 'string') {
      return redactSensitiveData(record) as unknown as T;
    }
    return record;
  }

  if (Array.isArray(record)) {
    return record.map((item) => stripForbiddenFieldsFromRecord(item)) as unknown as T;
  }

  const source = record as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const key of Object.keys(source)) {
    const normalizedKey = key.trim().toLowerCase();
    if (FORBIDDEN_EXPORT_KEYS.has(normalizedKey)) {
      continue;
    }
    if (
      normalizedKey.includes('password') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('sessiontoken') ||
      normalizedKey.includes('signedtoken') ||
      normalizedKey.includes('apikey')
    ) {
      continue;
    }

    const val = source[key];
    if (typeof val === 'string') {
      cleaned[key] = redactSensitiveData(val);
    } else if (val !== null && typeof val === 'object') {
      cleaned[key] = stripForbiddenFieldsFromRecord(val);
    } else {
      cleaned[key] = val;
    }
  }

  return cleaned as T;
}

/**
 * Enforces role, ownership, assignment, and subdivision jurisdiction boundaries on a list of records.
 * Returns a new array of cloned, sanitized records without mutating the source array.
 */
export function authorizeAndScopeExportRecords<T = Record<string, unknown>>(
  role: UserRole,
  actor: ExportActorIdentity,
  datasetKey: ExportDatasetKey,
  records: readonly T[]
): { authorized: boolean; scopedRecords: T[] } {
  if (!isDatasetAllowedForRole(role, datasetKey)) {
    return { authorized: false, scopedRecords: [] };
  }

  if (!Array.isArray(records) || records.length === 0) {
    return { authorized: true, scopedRecords: [] };
  }

  let filtered: T[] = [...records];

  if (role === 'consumer') {
    filtered = filtered.filter((row) =>
      isRecordOwnedByConsumer(row as unknown as Record<string, unknown>, actor)
    );
  } else if (role === 'employee') {
    if (datasetKey === 'incidents') {
      filtered = filterIncidentsForSession(
        filtered as unknown as CriticalIncident[],
        'employee',
        {
          id: actor.id,
          name: actor.name,
          role: 'employee',
          subdivision: actor.subdivision,
        }
      ) as unknown as T[];
    } else if (
      datasetKey === 'applications' ||
      datasetKey === 'complaints' ||
      datasetKey === 'work_orders' ||
      datasetKey === 'consumers' ||
      datasetKey === 'connections'
    ) {
      filtered = filtered.filter((row) => {
        const rec = row as unknown as Record<string, unknown>;
        const recSubdivision =
          typeof rec.subdivision === 'string' ? rec.subdivision : undefined;
        return isEmployeeAuthorizedForExportSubdivision(actor.subdivision, recSubdivision);
      });
    }
  } else if (role === 'field') {
    if (
      datasetKey === 'assigned_work_orders' ||
      datasetKey === 'site_inspections' ||
      datasetKey === 'completed_jobs'
    ) {
      filtered = filtered.filter((row) =>
        isWorkOrderAssignedToFieldEngineer(row as unknown as Record<string, unknown>, actor)
      );
    } else if (datasetKey === 'feeder_patrol') {
      const assignedFeeders = actor.assignedFeederIds || [];
      if (assignedFeeders.length > 0) {
        filtered = filtered.filter((row) => {
          const rec = row as unknown as Record<string, unknown>;
          const feederId =
            typeof rec.id === 'string'
              ? rec.id
              : typeof rec.feederId === 'string'
              ? rec.feederId
              : '';
          return !feederId || assignedFeeders.includes(feederId);
        });
      }
    }
  } else if (role === 'management') {
    if (datasetKey === 'escalated_incidents') {
      filtered = filterIncidentsForSession(
        filtered as unknown as CriticalIncident[],
        'management',
        {
          id: actor.id,
          name: actor.name,
          role: 'management',
          subdivision: actor.subdivision,
        }
      ) as unknown as T[];
    }
  }

  const sanitized = filtered.map((item) => stripForbiddenFieldsFromRecord(item));
  return { authorized: true, scopedRecords: sanitized };
}

/**
 * Neutralizes spreadsheet formula injection in string values.
 * If a string starts with `=`, `+`, `-`, `@`, `\t`, or `\r` (either directly or after leading whitespace),
 * prefixes it with a single quote `'` so Excel / LibreOffice / Google Sheets treat it as literal text.
 * Genuine numeric values passed as `number` are not altered.
 */
export function sanitizeCsvFormulaCell(value: string): string {
  if (!value) return '';
  const firstChar = value.charAt(0);
  const trimmedFirstChar = value.trimStart().charAt(0);
  const dangerousStarts = ['=', '+', '-', '@', '\t', '\r'];

  if (
    dangerousStarts.includes(firstChar) ||
    (trimmedFirstChar && dangerousStarts.includes(trimmedFirstChar))
  ) {
    return `'${value}`;
  }
  return value;
}

/**
 * Formats and escapes a single value according to RFC 4180 + formula injection prevention.
 */
export function escapeCsvCell(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? String(rawValue) : '';
  }

  if (typeof rawValue === 'boolean') {
    return rawValue ? 'true' : 'false';
  }

  let stringValue: string;
  if (Array.isArray(rawValue)) {
    stringValue = rawValue
      .map((item) =>
        item !== null && typeof item === 'object' ? JSON.stringify(item) : String(item ?? '')
      )
      .join('; ');
  } else if (typeof rawValue === 'object') {
    stringValue = JSON.stringify(stripForbiddenFieldsFromRecord(rawValue));
  } else {
    stringValue = String(rawValue);
  }

  const redacted = redactSensitiveData(stringValue);
  const safeFormula = sanitizeCsvFormulaCell(redacted);

  const needsQuoting =
    safeFormula.includes(',') ||
    safeFormula.includes('"') ||
    safeFormula.includes('\n') ||
    safeFormula.includes('\r') ||
    safeFormula.startsWith(' ') ||
    safeFormula.endsWith(' ');

  if (needsQuoting) {
    const escapedQuotes = safeFormula.replace(/"/g, '""');
    return `"${escapedQuotes}"`;
  }

  return safeFormula;
}

/**
 * Default stable, allowlisted column definitions per dataset key.
 * Aligns with canonical interfaces in `src/types/index.ts` and `src/data/mockData.ts`.
 */
export const DATASET_DEFAULT_COLUMNS: Record<ExportDatasetKey, ExportColumnDefinition<any>[]> = {
  bills: [
    { key: 'billNo', header: 'Bill Number' },
    { key: 'consumerNo', header: 'Consumer Number' },
    { key: 'billMonth', header: 'Billing Period', extractor: (r: any) => r.billMonth ?? r.billingMonth ?? '' },
    { key: 'billDate', header: 'Bill Date', extractor: (r: any) => r.billDate ?? r.issueDate ?? '' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'unitsConsumed', header: 'Units Consumed (kWh)' },
    { key: 'energyCharges', header: 'Energy Charges (INR)', extractor: (r: any) => r.energyCharges ?? r.energyCharge ?? 0 },
    { key: 'fixedCharges', header: 'Fixed Charges (INR)', extractor: (r: any) => r.fixedCharges ?? r.fixedCharge ?? 0 },
    { key: 'fuelPriceAdjustment', header: 'FPPPA Adjustment (INR)', extractor: (r: any) => r.fuelPriceAdjustment ?? r.fuelSurcharge ?? 0 },
    { key: 'electricityDuty', header: 'Govt Electricity Duty (INR)', extractor: (r: any) => r.electricityDuty ?? r.govtDuty ?? 0 },
    { key: 'rebateOrSubsidy', header: 'Rebate / Subsidy (INR)', extractor: (r: any) => r.rebateOrSubsidy ?? 0 },
    { key: 'totalAmount', header: 'Net Payable Amount (INR)', extractor: (r: any) => r.totalAmount ?? r.netAmount ?? 0 },
    { key: 'status', header: 'Payment Status' },
    { key: 'paidDate', header: 'Paid Date', extractor: (r: any) => r.paidDate ?? '' },
    { key: 'transactionRef', header: 'Transaction Reference', extractor: (r: any) => r.transactionRef ?? '' },
  ],
  payments: [
    { key: 'txId', header: 'Transaction Reference ID' },
    { key: 'billNo', header: 'Bill Number' },
    { key: 'consumerNo', header: 'Consumer Number' },
    { key: 'amount', header: 'Amount Paid (INR)' },
    { key: 'date', header: 'Transaction Timestamp' },
    { key: 'paymentMethod', header: 'Payment Channel', extractor: (r: any) => r.paymentMethod ?? r.mode ?? '' },
    { key: 'bankReference', header: 'Bank Reference', extractor: (r: any) => r.bankReference ?? '' },
    { key: 'status', header: 'Settlement Status' },
  ],
  applications: [
    { key: 'id', header: 'Application ID' },
    { key: 'applicantName', header: 'Applicant Name' },
    { key: 'linkedConsumerNo', header: 'Linked Consumer No', extractor: (r: any) => r.linkedConsumerNo ?? r.consumerNo ?? '' },
    { key: 'category', header: 'Connection Category' },
    { key: 'requestedLoadKw', header: 'Requested Load (kW)', extractor: (r: any) => r.requestedLoadKw ?? r.loadKw ?? 0 },
    { key: 'phase', header: 'Supply Phase' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'address', header: 'Premises Address' },
    { key: 'appliedDate', header: 'Submitted Date', extractor: (r: any) => r.appliedDate ?? r.submittedDate ?? '' },
    { key: 'targetCompletionDate', header: 'Target Completion Date', extractor: (r: any) => r.targetCompletionDate ?? '' },
    { key: 'estimatedSanctionCost', header: 'Estimated Sanction Cost (INR)', extractor: (r: any) => r.estimatedSanctionCost ?? r.estimatedCharge ?? 0 },
    { key: 'status', header: 'Workflow Status' },
    { key: 'assignedOfficer', header: 'Assigned Officer', extractor: (r: any) => r.assignedOfficer ?? '' },
    { key: 'assignedWorkOrderId', header: 'Linked Work Order ID', extractor: (r: any) => r.assignedWorkOrderId ?? '' },
  ],
  complaints: [
    { key: 'id', header: 'Complaint ID' },
    { key: 'consumerNo', header: 'Consumer Number' },
    { key: 'consumerName', header: 'Consumer Name' },
    { key: 'category', header: 'Fault Category' },
    { key: 'priority', header: 'Priority Level' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'feederName', header: 'Feeder Name', extractor: (r: any) => r.feederName ?? '' },
    { key: 'status', header: 'Resolution Status' },
    { key: 'filedAt', header: 'Logged Timestamp', extractor: (r: any) => r.filedAt ?? r.createdAt ?? '' },
    { key: 'slaTargetHours', header: 'SLA Target (Hours)', extractor: (r: any) => r.slaTargetHours ?? '' },
    { key: 'slaDueTime', header: 'SLA Due Time', extractor: (r: any) => r.slaDueTime ?? '' },
    { key: 'assignedTechnician', header: 'Assigned Crew / Engineer', extractor: (r: any) => r.assignedTechnician ?? r.assignedTo ?? '' },
    { key: 'assignedWorkOrderId', header: 'Linked Work Order ID', extractor: (r: any) => r.assignedWorkOrderId ?? '' },
    { key: 'description', header: 'Complaint Description' },
    { key: 'resolutionRemarks', header: 'Resolution Remarks', extractor: (r: any) => r.resolutionRemarks ?? r.resolutionNotes ?? '' },
  ],
  connections: [
    { key: 'consumerNo', header: 'Consumer Number' },
    { key: 'connectionId', header: 'Connection ID', extractor: (r: any) => r.connectionId ?? r.id ?? '' },
    { key: 'consumerName', header: 'Consumer Name' },
    { key: 'tariffCategory', header: 'Tariff Category', extractor: (r: any) => r.tariffCategory ?? r.category ?? '' },
    { key: 'sanctionedLoadKw', header: 'Sanctioned Load (kW)' },
    { key: 'phase', header: 'Supply Phase' },
    { key: 'meterNo', header: 'Smart Meter Serial No' },
    { key: 'feederName', header: 'Connected Feeder', extractor: (r: any) => r.feederName ?? r.feederId ?? '' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'status', header: 'Connection Status' },
    { key: 'lastReadingDate', header: 'Last Reading Date' },
    { key: 'currentReadingKwh', header: 'Current Reading (kWh)', extractor: (r: any) => r.currentReadingKwh ?? r.lastUnits ?? 0 },
  ],
  consumers: [
    { key: 'consumerNo', header: 'Consumer Number' },
    { key: 'connectionId', header: 'Connection ID', extractor: (r: any) => r.connectionId ?? r.id ?? '' },
    { key: 'consumerName', header: 'Consumer Name' },
    { key: 'tariffCategory', header: 'Tariff Category', extractor: (r: any) => r.tariffCategory ?? r.category ?? '' },
    { key: 'sanctionedLoadKw', header: 'Sanctioned Load (kW)' },
    { key: 'phase', header: 'Supply Phase' },
    { key: 'meterNo', header: 'Meter Number' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'feederName', header: 'Connected Feeder', extractor: (r: any) => r.feederName ?? r.feederId ?? '' },
    { key: 'status', header: 'Account Status' },
    { key: 'currentReadingKwh', header: 'Current Reading (kWh)', extractor: (r: any) => r.currentReadingKwh ?? r.lastUnits ?? 0 },
  ],
  work_orders: [
    { key: 'id', header: 'Work Order ID' },
    { key: 'type', header: 'Work Order Type' },
    { key: 'referenceId', header: 'Linked Reference ID', extractor: (r: any) => r.complaintId ?? r.applicationId ?? r.referenceId ?? '' },
    { key: 'title', header: 'Task Summary' },
    { key: 'priority', header: 'Priority' },
    { key: 'status', header: 'Execution Status' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'feederName', header: 'Feeder Name', extractor: (r: any) => r.feederName ?? '' },
    { key: 'location', header: 'Site Location' },
    { key: 'assignedTo', header: 'Assigned Engineer' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
  ],
  assigned_work_orders: [
    { key: 'id', header: 'Work Order ID' },
    { key: 'type', header: 'Work Order Type' },
    { key: 'referenceId', header: 'Linked Reference ID', extractor: (r: any) => r.complaintId ?? r.applicationId ?? r.referenceId ?? '' },
    { key: 'title', header: 'Work Order Title' },
    { key: 'priority', header: 'Priority' },
    { key: 'status', header: 'Current Status' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'feederName', header: 'Feeder Name', extractor: (r: any) => r.feederName ?? '' },
    { key: 'location', header: 'Site Address / Coordinates' },
    { key: 'assignedTo', header: 'Assigned Engineer' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
  ],
  site_inspections: [
    { key: 'id', header: 'Work Order ID' },
    { key: 'referenceId', header: 'Reference Application / Ticket ID', extractor: (r: any) => r.applicationId ?? r.complaintId ?? r.referenceId ?? '' },
    { key: 'type', header: 'Inspection Type' },
    { key: 'location', header: 'Site Location' },
    { key: 'status', header: 'Work Order Status' },
    {
      key: 'meterSerialScanned',
      header: 'Scanned Meter Serial',
      extractor: (row: any) => row.inspectionReport?.meterSerialScanned ?? row.inspectionReport?.meterSerialAssigned ?? '',
    },
    {
      key: 'readingKwh',
      header: 'Meter Reading (kWh)',
      extractor: (row: any) => row.inspectionReport?.readingKwh ?? '',
    },
    {
      key: 'sealIntact',
      header: 'Seal Intact',
      extractor: (row: any) =>
        row.inspectionReport?.sealIntact !== undefined ? String(row.inspectionReport.sealIntact) : '',
    },
    {
      key: 'terminalCondition',
      header: 'Terminal Condition',
      extractor: (row: any) => row.inspectionReport?.terminalCondition ?? '',
    },
    {
      key: 'tamperDetected',
      header: 'Tamper Detected',
      extractor: (row: any) =>
        row.inspectionReport?.tamperDetected !== undefined ? String(row.inspectionReport.tamperDetected) : '',
    },
    {
      key: 'testedPhaseVoltage',
      header: 'Tested Phase Voltage (R/Y/B)',
      extractor: (row: any) => {
        const v = row.inspectionReport?.testedPhaseVoltage;
        return v ? `R:${v.r}V Y:${v.y}V B:${v.b}V` : row.inspectionReport?.voltageLevel ?? '';
      },
    },
    { key: 'assignedTo', header: 'Inspected By' },
    {
      key: 'technicianRemarks',
      header: 'Technical Findings & Remarks',
      extractor: (row: any) => row.inspectionReport?.technicianRemarks ?? row.inspectionReport?.engineerRemarks ?? '',
    },
  ],
  completed_jobs: [
    { key: 'id', header: 'Work Order ID' },
    { key: 'type', header: 'Job Type' },
    { key: 'referenceId', header: 'Reference ID', extractor: (r: any) => r.complaintId ?? r.applicationId ?? r.referenceId ?? '' },
    { key: 'title', header: 'Job Title' },
    { key: 'subdivision', header: 'Subdivision' },
    { key: 'feederName', header: 'Feeder Name', extractor: (r: any) => r.feederName ?? '' },
    { key: 'location', header: 'Location' },
    { key: 'status', header: 'Status' },
    { key: 'assignedTo', header: 'Completed By Engineer' },
    { key: 'scheduledDate', header: 'Completion / Scheduled Date' },
    {
      key: 'meterSerialScanned',
      header: 'Meter Serial Scanned',
      extractor: (row: any) => row.inspectionReport?.meterSerialScanned ?? '',
    },
    {
      key: 'technicianRemarks',
      header: 'Resolution Summary',
      extractor: (row: any) => row.inspectionReport?.technicianRemarks ?? row.inspectionReport?.engineerRemarks ?? '',
    },
  ],
  feeder_patrol: [
    { key: 'id', header: 'Feeder ID', extractor: (r: any) => r.id ?? r.feederId ?? '' },
    { key: 'name', header: 'Feeder Name', extractor: (r: any) => r.name ?? r.feederName ?? '' },
    { key: 'subdivision', header: 'Subdivision', extractor: (r: any) => r.subdivision ?? r.substation ?? '' },
    { key: 'voltageKv', header: 'Voltage Level (kV)' },
    { key: 'peakLoadAmps', header: 'Peak Load (Amps)', extractor: (r: any) => r.peakLoadAmps ?? '' },
    { key: 'ratedCapacityAmps', header: 'Rated Capacity (Amps)', extractor: (r: any) => r.ratedCapacityAmps ?? '' },
    { key: 'utilizationPct', header: 'Utilization (%)', extractor: (r: any) => r.utilizationPct ?? r.loadPercent ?? '' },
    { key: 'status', header: 'Operational Status' },
    { key: 'transformersCount', header: 'Distribution Transformers', extractor: (r: any) => r.transformersCount ?? '' },
    { key: 'consumersConnected', header: 'Connected Consumers', extractor: (r: any) => r.consumersConnected ?? r.activeConsumers ?? '' },
    { key: 'trippingEventsPast30d', header: 'Tripping Events (30d)', extractor: (r: any) => r.trippingEventsPast30d ?? '' },
  ],
  incidents: [
    { key: 'id', header: 'Incident ID' },
    { key: 'title', header: 'Incident Title' },
    { key: 'module', header: 'Incident Module', extractor: (r: any) => r.module ?? r.category ?? '' },
    { key: 'severity', header: 'Severity Level' },
    { key: 'status', header: 'Lifecycle Status' },
    { key: 'subdivision', header: 'Subdivision', extractor: (r: any) => r.subdivision ?? '' },
    { key: 'entityId', header: 'Affected Entity ID', extractor: (r: any) => r.entityId ?? r.feederId ?? '' },
    { key: 'entityType', header: 'Entity Type', extractor: (r: any) => r.entityType ?? '' },
    { key: 'timestamp', header: 'Detected Timestamp', extractor: (r: any) => r.timestamp ?? r.detectedAt ?? '' },
    { key: 'assignmentStatus', header: 'Assignment Status', extractor: (r: any) => r.assignmentStatus ?? '' },
    { key: 'assignedEngineerName', header: 'Assigned Field Engineer', extractor: (r: any) => r.assignedEngineerName ?? '' },
    { key: 'escalatedTo', header: 'Escalated To', extractor: (r: any) => r.escalatedTo ?? '' },
    { key: 'approvalStatus', header: 'Approval Status', extractor: (r: any) => r.approvalStatus ?? '' },
    { key: 'resolutionNotes', header: 'Resolution Summary', extractor: (r: any) => r.resolutionNotes ?? r.resolutionReport ?? '' },
  ],
  escalated_incidents: [
    { key: 'id', header: 'Incident ID' },
    { key: 'title', header: 'Incident Title' },
    { key: 'module', header: 'Module', extractor: (r: any) => r.module ?? r.category ?? '' },
    { key: 'severity', header: 'Severity' },
    { key: 'status', header: 'Lifecycle Status' },
    { key: 'subdivision', header: 'Subdivision', extractor: (r: any) => r.subdivision ?? '' },
    { key: 'entityId', header: 'Affected Asset ID', extractor: (r: any) => r.entityId ?? r.feederId ?? '' },
    { key: 'timestamp', header: 'Detected Timestamp', extractor: (r: any) => r.timestamp ?? r.detectedAt ?? '' },
    { key: 'escalatedBy', header: 'Escalated By', extractor: (r: any) => r.escalatedBy ?? '' },
    { key: 'escalatedTo', header: 'Escalation Target', extractor: (r: any) => r.escalatedTo ?? '' },
    { key: 'escalatedReason', header: 'Escalation Reason', extractor: (r: any) => r.escalatedReason ?? '' },
    { key: 'assignedEngineerName', header: 'Field Lead', extractor: (r: any) => r.assignedEngineerName ?? '' },
    { key: 'approvalStatus', header: 'Executive Approval Status', extractor: (r: any) => r.approvalStatus ?? '' },
  ],
  revenue_report: [
    { key: 'month', header: 'Billing Month' },
    { key: 'billedMUs', header: 'Energy Billed (MU)', extractor: (r: any) => r.billedMUs ?? '' },
    { key: 'collectedCr', header: 'Revenue Collected (INR Cr)', extractor: (r: any) => r.collectedCr ?? r.revenueCr ?? '' },
    { key: 'atcLossPct', header: 'AT&C Loss (%)', extractor: (r: any) => r.atcLossPct ?? r.atcLoss ?? '' },
  ],
  executive_kpis: [
    { key: 'metricId', header: 'KPI Identifier' },
    { key: 'label', header: 'Metric Name' },
    { key: 'value', header: 'Current Value' },
    { key: 'unit', header: 'Unit' },
    { key: 'target', header: 'Benchmark Target' },
    { key: 'trend', header: 'Period Trend' },
    { key: 'valueType', header: 'Derivation Type' },
    { key: 'dataSource', header: 'Data Source Classification' },
  ],
  monthly_performance: [
    { key: 'month', header: 'Month' },
    { key: 'billedMUs', header: 'Energy Billed (MU)', extractor: (r: any) => r.billedMUs ?? '' },
    { key: 'collectedCr', header: 'Revenue Collected (INR Cr)', extractor: (r: any) => r.collectedCr ?? r.revenueCr ?? '' },
    { key: 'atcLossPct', header: 'AT&C Loss (%)', extractor: (r: any) => r.atcLossPct ?? r.atcLoss ?? '' },
  ],
  feeder_analytics: [
    { key: 'id', header: 'Feeder ID', extractor: (r: any) => r.id ?? r.feederId ?? '' },
    { key: 'name', header: 'Feeder Name', extractor: (r: any) => r.name ?? r.feederName ?? '' },
    { key: 'subdivision', header: 'Subdivision', extractor: (r: any) => r.subdivision ?? r.substation ?? '' },
    { key: 'voltageKv', header: 'Voltage (kV)' },
    { key: 'peakLoadAmps', header: 'Peak Load (Amps)' },
    { key: 'ratedCapacityAmps', header: 'Rated Capacity (Amps)' },
    { key: 'utilizationPct', header: 'Peak Loading (%)', extractor: (r: any) => r.utilizationPct ?? r.loadPercent ?? '' },
    { key: 'status', header: 'Health Status' },
    { key: 'transformersCount', header: 'Transformers Count' },
    { key: 'consumersConnected', header: 'Active Consumers', extractor: (r: any) => r.consumersConnected ?? r.activeConsumers ?? '' },
    { key: 'trippingEventsPast30d', header: 'Tripping Events (30d)' },
  ],
  subdivision_sla: [
    { key: 'name', header: 'Subdivision Name', extractor: (r: any) => r.name ?? r.subdivision ?? '' },
    { key: 'complaints', header: 'Total Complaints', extractor: (r: any) => r.complaints ?? '' },
    { key: 'resolvedPct', header: 'Resolution SLA Rate (%)', extractor: (r: any) => r.resolvedPct ?? r.complaintsSla ?? '' },
    { key: 'avgTatHours', header: 'Average TAT (Hours)', extractor: (r: any) => r.avgTatHours ?? '' },
    { key: 'atcLossPct', header: 'AT&C Loss (%)', extractor: (r: any) => r.atcLossPct ?? '' },
  ],
  ai_governance: [
    { key: 'id', header: 'Recommendation ID' },
    { key: 'agentPersonaName', header: 'AI Agent Persona', extractor: (r: any) => r.agentPersonaName ?? '' },
    { key: 'proposedAction', header: 'Action Category', extractor: (r: any) => r.proposedAction ?? r.category ?? '' },
    { key: 'title', header: 'Recommendation Title' },
    { key: 'affectedEntityId', header: 'Affected Record ID', extractor: (r: any) => r.affectedRecord?.id ?? '' },
    { key: 'previousValue', header: 'Previous State', extractor: (r: any) => r.previousValue ?? '' },
    { key: 'proposedValue', header: 'Proposed State', extractor: (r: any) => r.proposedValue ?? '' },
    { key: 'riskLevel', header: 'Risk Level' },
    { key: 'requiredApprovingRole', header: 'Required Approving Role' },
    { key: 'status', header: 'Governance Status' },
    { key: 'reviewedBy', header: 'Reviewed By', extractor: (r: any) => r.reviewedBy ?? '' },
    { key: 'createdAt', header: 'Created Timestamp', extractor: (r: any) => r.createdAt ?? r.timestamp ?? '' },
  ],
  user_accounts: [
    { key: 'id', header: 'User Account ID' },
    { key: 'name', header: 'Full Name' },
    { key: 'role', header: 'Assigned Role' },
    { key: 'subdivision', header: 'Department / Subdivision', extractor: (r: any) => r.subdivision ?? r.dept ?? '' },
    { key: 'email', header: 'Official Email' },
    { key: 'status', header: 'Account Status' },
    { key: 'lastLogin', header: 'Last Active Session' },
  ],
  rbac_matrix: [
    { key: 'module', header: 'ERP Module / Capability' },
    { key: 'consumer', header: 'Consumer Role Allowed' },
    { key: 'employee', header: 'Employee Role Allowed' },
    { key: 'field', header: 'Field Engineer Role Allowed' },
    { key: 'management', header: 'Management Role Allowed' },
    { key: 'admin', header: 'Admin Role Allowed' },
  ],
  audit_logs: [
    { key: 'id', header: 'Audit Log ID' },
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'actor', header: 'Actor Identity' },
    { key: 'role', header: 'Actor Role' },
    { key: 'action', header: 'Executed Action' },
    { key: 'resource', header: 'Target Resource / Module', extractor: (r: any) => r.resource ?? r.module ?? '' },
    { key: 'ipAddress', header: 'Origin IP' },
    { key: 'status', header: 'Security Status', extractor: (r: any) => r.status ?? r.severity ?? '' },
    { key: 'metaDetail', header: 'Audit Metadata', extractor: (r: any) => r.metaDetail ?? '' },
  ],
  system_services: [
    { key: 'name', header: 'Microservice Name', extractor: (r: any) => r.name ?? r.serviceName ?? '' },
    { key: 'category', header: 'Service Category', extractor: (r: any) => r.category ?? '' },
    { key: 'status', header: 'Operational Status' },
    { key: 'latencyMs', header: 'Latency (ms)' },
    { key: 'uptime90d', header: '90-Day Uptime (%)', extractor: (r: any) => r.uptime90d ?? r.uptimePercent ?? '' },
    { key: 'lastIncident', header: 'Last Incident Note', extractor: (r: any) => r.lastIncident ?? '' },
  ],
  governance_approvals: [
    { key: 'id', header: 'Recommendation ID' },
    { key: 'proposedAction', header: 'Proposed Action', extractor: (r: any) => r.proposedAction ?? r.category ?? '' },
    { key: 'title', header: 'Action Title' },
    { key: 'affectedEntityId', header: 'Affected Record ID', extractor: (r: any) => r.affectedRecord?.id ?? '' },
    { key: 'requiredApprovingRole', header: 'Required Approving Role' },
    { key: 'riskLevel', header: 'Risk Level' },
    { key: 'status', header: 'Approval Status' },
    { key: 'reviewedBy', header: 'Reviewed By', extractor: (r: any) => r.reviewedBy ?? '' },
    { key: 'createdAt', header: 'Created Timestamp', extractor: (r: any) => r.createdAt ?? '' },
  ],
};

/**
 * Serializes an array of records into an RFC 4180 compliant CSV string with UTF-8 BOM
 * and spreadsheet formula injection protection.
 */
export function serializeToCsv<T = Record<string, unknown>>(
  records: readonly T[],
  columns: readonly ExportColumnDefinition<T>[],
  options: { includeBom?: boolean } = {}
): string {
  const includeBom = options.includeBom !== false;
  const bomPrefix = includeBom ? '\uFEFF' : '';

  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(',');
  if (!Array.isArray(records) || records.length === 0) {
    return `${bomPrefix}${headerRow}\r\n`;
  }

  const dataRows = records.map((row) => {
    const cleanRow = stripForbiddenFieldsFromRecord(row) as Record<string, unknown>;
    return columns
      .map((col) => {
        const rawVal = col.extractor
          ? col.extractor(cleanRow as unknown as T)
          : cleanRow[col.key];
        return escapeCsvCell(rawVal);
      })
      .join(',');
  });

  return `${bomPrefix}${[headerRow, ...dataRows].join('\r\n')}\r\n`;
}

/**
 * Projects a record to a deterministic, allowlisted JSON record structure while preserving canonical IDs.
 */
export function projectRecordForJson<T = Record<string, unknown>>(
  record: T,
  columns: readonly ExportColumnDefinition<T>[]
): Record<string, unknown> {
  const cleanRow = stripForbiddenFieldsFromRecord(record) as Record<string, unknown>;
  const projected: Record<string, unknown> = {};

  if (cleanRow.id !== undefined) {
    projected.id = cleanRow.id;
  }

  for (const col of columns) {
    const val = col.extractor
      ? col.extractor(cleanRow as unknown as T)
      : cleanRow[col.key];
    projected[col.key] = val === undefined ? null : val;
  }

  return projected;
}

/**
 * Serializes records and metadata into a deterministic, 2-space indented JSON string.
 */
export function serializeToJson<T = Record<string, unknown>>(
  records: readonly T[],
  columns: readonly ExportColumnDefinition<T>[],
  metadata: ExportMetadataEnvelope
): string {
  const projectedRecords = records.map((row) => projectRecordForJson(row, columns));
  const payload: ExportJsonPayload<Record<string, unknown>> = {
    metadata: {
      ...metadata,
      recordCount: projectedRecords.length,
    },
    records: projectedRecords,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Builds a safe, deterministic filename:
 * `vidyutflow-{role}-{dataset}-{YYYY-MM-DD}.{csv|json}`
 * Never includes personal consumer names or unsafe filesystem characters.
 */
export function buildExportFilename(
  role: UserRole | string,
  datasetKey: ExportDatasetKey | string,
  format: ExportFormat,
  referenceDate?: Date | string
): string {
  const safeRole =
    String(role || 'portal')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'portal';

  const safeDataset =
    String(datasetKey || 'records')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'records';

  let datePart = '2026-05-12';
  if (referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())) {
    datePart = referenceDate.toISOString().slice(0, 10);
  } else if (typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(referenceDate)) {
    datePart = referenceDate.slice(0, 10);
  } else {
    const now = new Date();
    if (!Number.isNaN(now.getTime())) {
      datePart = now.toISOString().slice(0, 10);
    }
  }

  const safeExt = format === 'json' ? 'json' : 'csv';
  return `vidyutflow-${safeRole}-${safeDataset}-${datePart}.${safeExt}`;
}

/**
 * Triggers a standard browser file download using a temporary Blob URL and cleans up afterward.
 */
export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType: string
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Blob === 'undefined') {
    return false;
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 250);
    return true;
  } catch {
    return false;
  }
}

/**
 * High-level, role-aware dataset export pipeline.
 */
export function executeDatasetExport<T = Record<string, unknown>>(
  options: ExecuteDatasetExportOptions<T>
): ExecuteDatasetExportResult<T> {
  const {
    role,
    actor,
    datasetKey,
    format,
    scope = 'filtered',
    records,
    language = 'en',
    dataSource = 'DEMO',
    customColumns,
    referenceDate,
    includeBom = true,
    skipBrowserDownload = false,
  } = options;

  const t = getExportUiTranslations(language);
  const filename = buildExportFilename(role, datasetKey, format, referenceDate);
  const mimeType =
    format === 'json'
      ? 'application/json;charset=utf-8'
      : 'text/csv;charset=utf-8';

  const generatedAt =
    referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
      ? referenceDate.toISOString()
      : new Date().toISOString();

  const { authorized, scopedRecords } = authorizeAndScopeExportRecords(
    role,
    actor,
    datasetKey,
    records
  );

  const baseMetadata: ExportMetadataEnvelope = {
    application: 'VidyutFlow 2.0 — UGVCL Intelligent Utility ERP',
    exportVersion: '2.0.0',
    generatedAt,
    portalRole: role,
    exportedBy: {
      id: actor.id || `${role}_user`,
      name: redactSensitiveData(actor.name || role),
      subdivision: actor.subdivision || 'UGVCL Headquarter / Circle',
    },
    dataset: datasetKey,
    datasetLabel: t.datasetLabels[datasetKey] || datasetKey,
    scope,
    recordCount: scopedRecords.length,
    dataSource,
    language,
  };

  if (!authorized) {
    return {
      success: false,
      isEmpty: true,
      unauthorized: true,
      format,
      scope,
      datasetKey,
      filename,
      mimeType,
      recordCount: 0,
      dataSource,
      content: '',
      metadata: baseMetadata,
      sanitizedRecords: [],
      message: t.unauthorizedExport,
    };
  }

  if (scopedRecords.length === 0) {
    return {
      success: false,
      isEmpty: true,
      format,
      scope,
      datasetKey,
      filename,
      mimeType,
      recordCount: 0,
      dataSource,
      content: '',
      metadata: baseMetadata,
      sanitizedRecords: [],
      message: t.noRecordsToExport,
    };
  }

  const columns: ExportColumnDefinition<T>[] =
    customColumns && customColumns.length > 0
      ? customColumns
      : (DATASET_DEFAULT_COLUMNS[datasetKey] as ExportColumnDefinition<T>[]) || [];

  const content =
    format === 'json'
      ? serializeToJson(scopedRecords, columns, baseMetadata)
      : serializeToCsv(scopedRecords, columns, { includeBom });

  if (!skipBrowserDownload) {
    triggerBrowserDownload(content, filename, mimeType);
  }

  return {
    success: true,
    isEmpty: false,
    format,
    scope,
    datasetKey,
    filename,
    mimeType,
    recordCount: scopedRecords.length,
    dataSource,
    content,
    metadata: baseMetadata,
    sanitizedRecords: scopedRecords,
    message: `${t.exportCompleted} (${scopedRecords.length} ${t.recordCountLabel})`,
  };
}
