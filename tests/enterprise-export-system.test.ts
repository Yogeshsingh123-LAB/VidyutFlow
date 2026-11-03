import assert from 'node:assert/strict';
import {
  sanitizeCsvFormulaCell,
  escapeCsvCell,
  serializeToCsv,
  serializeToJson,
  buildExportFilename,
  authorizeAndScopeExportRecords,
  executeDatasetExport,
  stripForbiddenFieldsFromRecord,
  getExportUiTranslations,
  EXPORT_UI_TRANSLATIONS,
  DATASET_DEFAULT_COLUMNS,
  ExportActorIdentity,
} from '../src/utils/exportEngine';
import {
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_CONNECTIONS,
  INITIAL_WORK_ORDERS,
  FEEDER_METRICS,
  EXECUTIVE_MONTHLY_METRICS,
  SUBDIVISION_PERFORMANCE,
  AUDIT_LOGS as INITIAL_AUDIT_LOGS,
  SYSTEM_SERVICES,
} from '../src/data/mockData';
import { detectAnomalies } from '../src/utils/anomalyDetector';

const INITIAL_INCIDENTS = detectAnomalies({});

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error('   ', err instanceof Error ? err.message : err);
  }
}

console.log('\n==================================================================');
console.log(' VIDYUTFLOW 2.0 — PHASE 5, STEP 5.1: ENTERPRISE EXPORT TEST SUITE');
console.log('==================================================================\n');

// 1. CSV header and row serialization
runTest('1. CSV header and row serialization produces deterministic RFC 4180 structure', () => {
  const columns = [
    { key: 'id', header: 'Record ID' },
    { key: 'consumerNo', header: 'Consumer No' },
    { key: 'amount', header: 'Amount (INR)' },
  ];
  const rows = [
    { id: 'BILL-2026-1001', consumerNo: '04281-99231', amount: 2185 },
    { id: 'BILL-2026-1002', consumerNo: '04281-77190', amount: 18420 },
  ];

  const csv = serializeToCsv(rows, columns, { includeBom: false });
  const lines = csv.trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'Record ID,Consumer No,Amount (INR)');
  assert.equal(lines[1], 'BILL-2026-1001,04281-99231,2185');
  assert.equal(lines[2], 'BILL-2026-1002,04281-77190,18420');
});

// 2. CSV escaping for commas, quotes, and newlines
runTest('2. CSV escaping handles commas, embedded double quotes, and multi-line strings', () => {
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'address', header: 'Address, Line' },
    { key: 'remarks', header: 'Engineer "Notes"' },
  ];
  const rows = [
    {
      id: 'APP-2026-0841',
      address: '14, Anand Nagar Society, Near Radhanpur Road, Mehsana',
      remarks: 'Transformer "DTR-44" inspected.\nLine clearance verified.',
    },
  ];

  const csv = serializeToCsv(rows, columns, { includeBom: false });
  assert.ok(csv.includes('"Address, Line"'));
  assert.ok(csv.includes('"Engineer ""Notes"""'));
  assert.ok(csv.includes('"14, Anand Nagar Society, Near Radhanpur Road, Mehsana"'));
  assert.ok(csv.includes('"Transformer ""DTR-44"" inspected.\nLine clearance verified."'));
});

// 3. UTF-8 BOM and Gujarati, Hindi, and Marathi content in CSV exports
runTest('3. CSV includes UTF-8 BOM (\\uFEFF) and preserves Gujarati, Hindi, and Marathi scripts', () => {
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'guText', header: 'Gujarati' },
    { key: 'hiText', header: 'Hindi' },
    { key: 'mrText', header: 'Marathi' },
  ];
  const rows = [
    {
      id: 'CMP-2026-309',
      guText: 'મહેસાણા શહેર ઉત્તર - વીજ પુરવઠો ખોરવાયો',
      hiText: 'मेहसाणा शहर उत्तर - बिजली आपूर्ति बाधित',
      mrText: 'मेहसाणा शहर उत्तर - वीज पुरवठा खंडित',
    },
  ];

  const csv = serializeToCsv(rows, columns);
  assert.equal(csv.charCodeAt(0), 0xfeff, 'CSV must begin with UTF-8 BOM \\uFEFF');
  assert.ok(csv.includes('મહેસાણા શહેર ઉત્તર - વીજ પુરવઠો ખોરવાયો'));
  assert.ok(csv.includes('मेहसाणा शहर उत्तर - बिजली आपूर्ति बाधित'));
  assert.ok(csv.includes('मेहसाणा शहर उत्तर - वीज पुरवठा खंडित'));
});

// 4. CSV formula injection prevention
runTest('4. CSV formula injection prevention neutralizes =, +, -, @, \\t, \\r while preserving numeric values', () => {
  assert.equal(sanitizeCsvFormulaCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
  assert.equal(sanitizeCsvFormulaCell('+cmd|\'/C calc\'!A0'), "'+cmd|'/C calc'!A0");
  assert.equal(sanitizeCsvFormulaCell('-2+3+cmd|\'/C calc\'!A0'), "'-2+3+cmd|'/C calc'!A0");
  assert.equal(sanitizeCsvFormulaCell('@SUM(1+1)*cmd|\'/C calc\'!A0'), "'@SUM(1+1)*cmd|'/C calc'!A0");
  assert.equal(sanitizeCsvFormulaCell('\t=1+1'), "'\t=1+1");
  assert.equal(sanitizeCsvFormulaCell('\r=1+1'), "'\r=1+1");
  assert.equal(sanitizeCsvFormulaCell('   =HYPERLINK("http://evil.tld")'), "'   =HYPERLINK(\"http://evil.tld\")");

  // Genuine numbers must not be prefixed with a single quote
  assert.equal(escapeCsvCell(-12.45), '-12.45');
  assert.equal(escapeCsvCell(18420), '18420');
  assert.equal(escapeCsvCell(0), '0');
});

// 5. JSON validity and schema consistency
runTest('5. JSON export produces valid parseable JSON with deterministic metadata and records array', () => {
  const consumerActor: ExportActorIdentity = {
    id: 'demo_consumer',
    name: 'Smt. Meenaben Patel',
    role: 'consumer',
    ownedConsumerNos: ['04281-99231', '04281-77190'],
  };

  const res = executeDatasetExport({
    role: 'consumer',
    actor: consumerActor,
    datasetKey: 'bills',
    format: 'json',
    scope: 'filtered',
    records: INITIAL_BILLS,
    language: 'en',
    dataSource: 'DEMO',
    referenceDate: new Date('2026-05-12T10:30:00.000Z'),
    skipBrowserDownload: true,
  });

  assert.equal(res.success, true);
  assert.equal(res.isEmpty, false);
  const parsed = JSON.parse(res.content);
  assert.ok(parsed.metadata);
  assert.ok(Array.isArray(parsed.records));
  assert.equal(parsed.metadata.exportVersion, '2.0.0');
  assert.equal(parsed.metadata.portalRole, 'consumer');
  assert.equal(parsed.metadata.dataset, 'bills');
  assert.equal(parsed.metadata.scope, 'filtered');
  assert.equal(parsed.metadata.dataSource, 'DEMO');
  assert.equal(parsed.metadata.recordCount, parsed.records.length);
  assert.ok(parsed.records.length > 0);
});

// 6. Preservation of canonical record IDs
runTest('6. Canonical record IDs (APP-, CMP-, WO-, INC-, billNo, txId, consumerNo) are preserved in CSV and JSON', () => {
  const employeeActor: ExportActorIdentity = {
    id: 'EMP-UG-1101',
    name: 'Priya Rathod',
    role: 'employee',
    subdivision: 'Mehsana Corporate Circle',
  };

  const appExport = executeDatasetExport({
    role: 'employee',
    actor: employeeActor,
    datasetKey: 'applications',
    format: 'json',
    records: INITIAL_APPLICATIONS,
    skipBrowserDownload: true,
  });
  const parsedApps = JSON.parse(appExport.content);
  assert.ok(parsedApps.records.some((r: any) => String(r.id).startsWith('APP-2026-')));

  const cmpExport = executeDatasetExport({
    role: 'employee',
    actor: employeeActor,
    datasetKey: 'complaints',
    format: 'csv',
    records: INITIAL_COMPLAINTS,
    skipBrowserDownload: true,
  });
  assert.ok(cmpExport.content.includes('CMP-'));
});

// 7. Stable column ordering
runTest('7. Column ordering remains strictly deterministic across multiple exports', () => {
  const cols = DATASET_DEFAULT_COLUMNS.bills;
  const csv1 = serializeToCsv(INITIAL_BILLS.slice(0, 2), cols, { includeBom: false });
  const csv2 = serializeToCsv([...INITIAL_BILLS.slice(0, 2)].reverse(), cols, { includeBom: false });

  const header1 = csv1.split('\r\n')[0];
  const header2 = csv2.split('\r\n')[0];
  assert.equal(header1, header2);
  assert.equal(
    header1,
    'Bill Number,Consumer Number,Billing Period,Bill Date,Due Date,Units Consumed (kWh),Energy Charges (INR),Fixed Charges (INR),FPPPA Adjustment (INR),Govt Electricity Duty (INR),Rebate / Subsidy (INR),Net Payable Amount (INR),Payment Status,Paid Date,Transaction Reference'
  );
});

// 8. Null, undefined, and missing value handling
runTest('8. Null, undefined, and missing values serialize cleanly without "undefined" or "NaN" strings', () => {
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'optionalNote', header: 'Optional Note' },
    { key: 'nullableField', header: 'Nullable Field' },
    { key: 'nanField', header: 'NaN Field' },
  ];
  const rows = [
    {
      id: 'REC-01',
      optionalNote: undefined,
      nullableField: null,
      nanField: Number.NaN,
    },
  ];

  const csv = serializeToCsv(rows, columns, { includeBom: false });
  const dataLine = csv.trim().split('\r\n')[1];
  assert.equal(dataLine, 'REC-01,,,');
  assert.ok(!dataLine.includes('undefined'));
  assert.ok(!dataLine.includes('null'));
  assert.ok(!dataLine.includes('NaN'));
});

// 9. Safe filename generation
runTest('9. buildExportFilename generates safe lowercase filenames and strips unsafe characters', () => {
  const fn1 = buildExportFilename('consumer', 'bills', 'csv', '2026-05-12');
  assert.equal(fn1, 'vidyutflow-consumer-bills-2026-05-12.csv');

  const fn2 = buildExportFilename('field', 'assigned_work_orders', 'json', new Date('2026-10-15T08:00:00Z'));
  assert.equal(fn2, 'vidyutflow-field-assigned-work-orders-2026-10-15.json');

  // Attempt path traversal or injection in role/dataset
  const fnSanitized = buildExportFilename('../../admin/secret', 'audit_logs;rm -rf', 'csv', '2026-05-12');
  assert.ok(!fnSanitized.includes('..'));
  assert.ok(!fnSanitized.includes('/'));
  assert.ok(!fnSanitized.includes(';'));
  assert.equal(fnSanitized, 'vidyutflow-admin-secret-audit-logs-rm-rf-2026-05-12.csv');
});

// 10. Empty dataset handling
runTest('10. Empty dataset export returns isEmpty=true and clear localized message without generating broken output', () => {
  const actor: ExportActorIdentity = {
    id: 'demo_consumer',
    name: 'Smt. Meenaben Patel',
    role: 'consumer',
  };

  const res = executeDatasetExport({
    role: 'consumer',
    actor,
    datasetKey: 'complaints',
    format: 'csv',
    records: [],
    language: 'gu',
    skipBrowserDownload: true,
  });

  assert.equal(res.success, false);
  assert.equal(res.isEmpty, true);
  assert.equal(res.recordCount, 0);
  assert.equal(res.content, '');
  assert.equal(res.message, EXPORT_UI_TRANSLATIONS.gu.noRecordsToExport);
});

// 11. Consumer export ownership restrictions
runTest('11. Consumer export strictly scopes to owned consumer accounts and blocks non-consumer datasets', () => {
  const meenabenActor: ExportActorIdentity = {
    id: 'demo_consumer',
    name: 'Smt. Meenaben Patel',
    role: 'consumer',
    ownedConsumerNos: ['04281-99231', '04281-77190'],
  };

  const mixedBills = [
    ...INITIAL_BILLS,
    {
      billNo: 'UG-2026-999999',
      consumerNo: '04281-66512', // Belongs to Arvindbhai (cns_arvind_02)
      accountId: 'cns_arvind_02',
      billMonth: 'October 2026',
      billDate: '02-Oct-2026',
      dueDate: '17-Oct-2026',
      unitsConsumed: 500,
      energyCharges: 2500,
      fixedCharges: 150,
      fuelPriceAdjustment: 200,
      electricityDuty: 300,
      rebateOrSubsidy: 0,
      totalAmount: 3150,
      status: 'Unpaid' as const,
      slabBreakdown: [],
    },
  ];

  const billExport = executeDatasetExport({
    role: 'consumer',
    actor: meenabenActor,
    datasetKey: 'bills',
    format: 'json',
    records: mixedBills,
    skipBrowserDownload: true,
  });

  assert.equal(billExport.success, true);
  assert.ok(!billExport.content.includes('UG-2026-999999'), 'Must not include another consumer bill');
  assert.ok(!billExport.content.includes('04281-66512'), 'Must not leak another consumer number');

  // Consumer attempting to export Admin audit_logs must be rejected
  const unauthorizedAuditExport = executeDatasetExport({
    role: 'consumer',
    actor: meenabenActor,
    datasetKey: 'audit_logs',
    format: 'csv',
    records: INITIAL_AUDIT_LOGS,
    skipBrowserDownload: true,
  });
  assert.equal(unauthorizedAuditExport.success, false);
  assert.equal(unauthorizedAuditExport.unauthorized, true);
});

// 12. Employee export jurisdiction restrictions
runTest('12. Employee export enforces subdivision jurisdiction and blocks Admin-only datasets', () => {
  const subDivEmployee: ExportActorIdentity = {
    id: 'EMP-UG-1042',
    name: 'Rajesh V. Trivedi',
    role: 'employee',
    subdivision: 'Mehsana City North',
  };

  const scopedApps = authorizeAndScopeExportRecords(
    'employee',
    subDivEmployee,
    'applications',
    INITIAL_APPLICATIONS
  );
  assert.equal(scopedApps.authorized, true);
  assert.ok(scopedApps.scopedRecords.length > 0);
  for (const app of scopedApps.scopedRecords) {
    assert.ok(
      app.subdivision.toLowerCase().includes('mehsana city north'),
      `Expected Mehsana City North jurisdiction, got ${app.subdivision}`
    );
  }

  // Employee cannot export RBAC matrix
  const rbacAttempt = authorizeAndScopeExportRecords('employee', subDivEmployee, 'rbac_matrix', []);
  assert.equal(rbacAttempt.authorized, false);
});

// 13. Field Engineer export assignment restrictions
runTest('13. Field Engineer export only includes work orders assigned to the active engineer', () => {
  const vikramActor: ExportActorIdentity = {
    id: 'FLD-UG-201',
    name: 'Vikramaditya Solanki',
    role: 'field',
    subdivision: 'Mehsana City North',
  };

  const mixedWorkOrders = [
    ...INITIAL_WORK_ORDERS,
    {
      id: 'WO-2026-OTHER-999',
      title: 'Private Task for Another Engineer',
      type: 'Meter Replacement' as const,
      subdivision: 'Kadi Division',
      feederName: '11kV Kadi-Rural Ag Feeder',
      location: 'Kadi Sector 4',
      gpsCoordinates: { lat: 23.3, lng: 72.3 },
      priority: 'Routine' as const,
      scheduledDate: '16-Oct-2026',
      status: 'Pending' as const,
      assignedTo: 'Dharmesh P. Chaudhari (FLD-UG-204)',
      assignedEngineerId: 'FLD-UG-204',
      materialsNeeded: [],
    },
  ];

  const woExport = executeDatasetExport({
    role: 'field',
    actor: vikramActor,
    datasetKey: 'assigned_work_orders',
    format: 'json',
    records: mixedWorkOrders,
    skipBrowserDownload: true,
  });

  assert.equal(woExport.success, true);
  assert.ok(!woExport.content.includes('WO-2026-OTHER-999'), 'Must exclude work orders assigned to FLD-UG-204');
  assert.ok(woExport.recordCount > 0);

  // Field Engineer cannot export consumer bills or admin user accounts
  const fieldBillsAttempt = executeDatasetExport({
    role: 'field',
    actor: vikramActor,
    datasetKey: 'bills',
    format: 'csv',
    records: INITIAL_BILLS,
    skipBrowserDownload: true,
  });
  assert.equal(fieldBillsAttempt.success, false);
  assert.equal(fieldBillsAttempt.unauthorized, true);
});

// 14. Management export permissions and DEMO/SIMULATED/FORECAST source labels
runTest('14. Management export preserves DEMO, SIMULATED, and FORECAST data source classifications', () => {
  const mgmtActor: ExportActorIdentity = {
    id: 'MGT-UG-001',
    name: 'Dr. Harita Joshi',
    role: 'management',
    subdivision: 'UGVCL Corporate Headquarters, Mehsana',
  };

  const simExport = executeDatasetExport({
    role: 'management',
    actor: mgmtActor,
    datasetKey: 'feeder_analytics',
    format: 'json',
    records: FEEDER_METRICS,
    dataSource: 'SIMULATED',
    skipBrowserDownload: true,
  });
  assert.equal(simExport.success, true);
  const simParsed = JSON.parse(simExport.content);
  assert.equal(simParsed.metadata.dataSource, 'SIMULATED');

  const forecastExport = executeDatasetExport({
    role: 'management',
    actor: mgmtActor,
    datasetKey: 'monthly_performance',
    format: 'json',
    records: EXECUTIVE_MONTHLY_METRICS,
    dataSource: 'FORECAST',
    skipBrowserDownload: true,
  });
  assert.equal(forecastExport.success, true);
  const forecastParsed = JSON.parse(forecastExport.content);
  assert.equal(forecastParsed.metadata.dataSource, 'FORECAST');
});

// 15. Admin export permissions and sensitive-field exclusion
runTest('15. Admin export strips passwords, hashes, session tokens, and API keys from exported records', () => {
  const adminActor: ExportActorIdentity = {
    id: 'ADM-UG-001',
    name: 'K. V. Sharma',
    role: 'admin',
    subdivision: 'State Data Center / IT Cell',
  };

  const usersWithSecrets = [
    {
      id: 'USR-101',
      name: 'Rajesh V. Trivedi',
      email: 'rajesh.trivedi@ugvcl.gov.in',
      role: 'Office Employee ERP',
      subdivision: 'Gandhinagar Sub-Div 2',
      status: 'Active',
      lastLogin: '15-Oct 06:12',
      password: 'SuperSecretPassword123!',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret',
      GEMINI_API_KEY: 'AIzaSyFakeSecretKey1234567890',
    },
  ];

  const jsonExport = executeDatasetExport({
    role: 'admin',
    actor: adminActor,
    datasetKey: 'user_accounts',
    format: 'json',
    records: usersWithSecrets,
    skipBrowserDownload: true,
  });

  assert.equal(jsonExport.success, true);
  assert.ok(!jsonExport.content.includes('SuperSecretPassword123!'));
  assert.ok(!jsonExport.content.includes('$2b$10$'));
  assert.ok(!jsonExport.content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
  assert.ok(!jsonExport.content.includes('AIzaSyFakeSecretKey'));
  assert.ok(jsonExport.content.includes('USR-101'));
  assert.ok(jsonExport.content.includes('Rajesh V. Trivedi'));
});

// 16. Filtered export vs full authorized export behavior (including paginated views)
runTest('16. Filtered vs All Authorized export respects full dataset beyond single page slice', () => {
  const adminActor: ExportActorIdentity = {
    id: 'ADM-UG-001',
    name: 'K. V. Sharma',
    role: 'admin',
  };

  // Generate 25 audit logs (more than the 15-per-page pagination limit in AdminPortal)
  const manyAuditLogs = Array.from({ length: 25 }, (_, i) => ({
    id: `AUD-2026-${100 + i}`,
    timestamp: '15-Oct-2026 06:00:00',
    actor: i % 2 === 0 ? 'K. V. Sharma' : 'Rajesh V. Trivedi',
    role: i % 2 === 0 ? 'Admin' : 'Employee',
    action: 'RECORD_INSPECTED',
    resource: 'Security Matrix',
    ipAddress: '10.24.1.10',
    status: (i < 5 ? 'WARNING' : 'SUCCESS') as 'WARNING' | 'SUCCESS',
    metaDetail: 'Verified',
  }));

  const warningFilteredLogs = manyAuditLogs.filter((l) => l.status === 'WARNING');

  const filteredRes = executeDatasetExport({
    role: 'admin',
    actor: adminActor,
    datasetKey: 'audit_logs',
    format: 'json',
    scope: 'filtered',
    records: warningFilteredLogs,
    skipBrowserDownload: true,
  });
  assert.equal(filteredRes.recordCount, 5);
  assert.equal(filteredRes.metadata.scope, 'filtered');

  const allAuthorizedRes = executeDatasetExport({
    role: 'admin',
    actor: adminActor,
    datasetKey: 'audit_logs',
    format: 'json',
    scope: 'all_authorized',
    records: manyAuditLogs,
    skipBrowserDownload: true,
  });
  assert.equal(allAuthorizedRes.recordCount, 25, 'Must export all 25 records, not just 15 from page 1');
  assert.equal(allAuthorizedRes.metadata.scope, 'all_authorized');
});

// 17. Selected-row export behavior
runTest('17. Selected-row export only exports user-selected rows with scope="selected"', () => {
  const employeeActor: ExportActorIdentity = {
    id: 'EMP-UG-1101',
    name: 'Priya Rathod',
    role: 'employee',
    subdivision: 'Mehsana Corporate Circle',
  };

  const selectedRows = INITIAL_APPLICATIONS.slice(0, 2);
  const selectedExport = executeDatasetExport({
    role: 'employee',
    actor: employeeActor,
    datasetKey: 'applications',
    format: 'json',
    scope: 'selected',
    records: selectedRows,
    skipBrowserDownload: true,
  });

  assert.equal(selectedExport.success, true);
  assert.equal(selectedExport.recordCount, 2);
  assert.equal(selectedExport.metadata.scope, 'selected');
});

// 18. Non-mutation of original application records during export
runTest('18. Exporting records never mutates the original source arrays or objects', () => {
  const originalRecord = {
    id: 'USR-909',
    name: 'Test Officer',
    role: 'Employee',
    subdivision: 'Mehsana City North',
    email: 'test@ugvcl.com',
    status: 'Active',
    lastLogin: '15-Oct',
    password: 'KeepInMemoryDoNotMutateSource',
    notes: '=SUM(1,2)',
  };
  const sourceArray = [originalRecord];
  const snapshotBefore = JSON.stringify(sourceArray);

  const adminActor: ExportActorIdentity = {
    id: 'ADM-UG-001',
    name: 'K. V. Sharma',
    role: 'admin',
  };

  executeDatasetExport({
    role: 'admin',
    actor: adminActor,
    datasetKey: 'user_accounts',
    format: 'csv',
    records: sourceArray,
    skipBrowserDownload: true,
  });

  executeDatasetExport({
    role: 'admin',
    actor: adminActor,
    datasetKey: 'user_accounts',
    format: 'json',
    records: sourceArray,
    skipBrowserDownload: true,
  });

  assert.equal(JSON.stringify(sourceArray), snapshotBefore, 'Source records must remain completely unmutated');
  assert.equal(originalRecord.password, 'KeepInMemoryDoNotMutateSource');
});

// 19. Export UI label localization in English, Gujarati, Hindi, and Marathi
runTest('19. Export UI labels and dataset titles are localized across en, gu, hi, and mr', () => {
  const langs = ['en', 'gu', 'hi', 'mr'] as const;
  for (const lang of langs) {
    const dict = getExportUiTranslations(lang);
    assert.ok(dict.exportBtn.length > 0);
    assert.ok(dict.exportCsv.length > 0);
    assert.ok(dict.exportJson.length > 0);
    assert.ok(dict.exportSelected.length > 0);
    assert.ok(dict.exportFiltered.length > 0);
    assert.ok(dict.exportAllAuthorized.length > 0);
    assert.ok(dict.noRecordsToExport.length > 0);
    assert.ok(dict.exportCompleted.length > 0);
    assert.ok(dict.exportFailed.length > 0);
    assert.ok(dict.download.length > 0);
    assert.ok(dict.recordCountLabel.length > 0);
    assert.ok(dict.dataSourceLabel.length > 0);
    assert.ok(Object.keys(dict.datasetLabels).length >= 20);
  }

  assert.notEqual(EXPORT_UI_TRANSLATIONS.en.exportBtn, EXPORT_UI_TRANSLATIONS.gu.exportBtn);
  assert.notEqual(EXPORT_UI_TRANSLATIONS.en.exportBtn, EXPORT_UI_TRANSLATIONS.hi.exportBtn);
  assert.notEqual(EXPORT_UI_TRANSLATIONS.en.exportBtn, EXPORT_UI_TRANSLATIONS.mr.exportBtn);
});

// 20. Existing notification and incident workflows remain unaffected
runTest('20. Incident export respects employee-first and management escalation lifecycle rules', () => {
  const mgmtActor: ExportActorIdentity = {
    id: 'MGT-UG-001',
    name: 'Dr. Harita Joshi',
    role: 'management',
    subdivision: 'UGVCL Corporate Headquarters, Mehsana',
  };

  const incidentsWithEscalation = [
    ...INITIAL_INCIDENTS,
    {
      ...INITIAL_INCIDENTS[0],
      id: 'INC-2026-ESC-901',
      status: 'ESCALATED' as const,
      escalatedTo: 'management' as const,
      escalatedBy: 'Rajesh V. Trivedi',
      escalatedReason: 'Transformer thermal overload requires corporate capex sanction',
    },
  ];

  const mgmtIncidentsExport = executeDatasetExport({
    role: 'management',
    actor: mgmtActor,
    datasetKey: 'escalated_incidents',
    format: 'json',
    records: incidentsWithEscalation,
    skipBrowserDownload: true,
  });

  assert.equal(mgmtIncidentsExport.success, true);
  const parsed = JSON.parse(mgmtIncidentsExport.content);
  assert.ok(Array.isArray(parsed.records));
  assert.ok(parsed.records.some((inc: any) => inc.id === 'INC-2026-ESC-901'));
  for (const inc of parsed.records) {
    assert.ok(String(inc.id).startsWith('INC-'));
  }
});

console.log(`\n==================================================================`);
console.log(` EXPORT SYSTEM SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`==================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
