import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  ROLE_PROFILES,
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  FEEDER_METRICS,
  SYSTEM_SERVICES,
  AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  CONSUMPTION_HISTORY,
  EXECUTIVE_MONTHLY_METRICS,
  SUBDIVISION_PERFORMANCE,
  INITIAL_CONSUMERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS
} from '../src/data/mockData';
import { DEFAULT_DEMO_ACCOUNTS, AUTH_DISCLAIMERS } from '../src/data/demoAuthData';
import { UserRole } from '../src/types';

// ============================================================================
// Helper Utilities for Canonical Serialization & Assertions
// ============================================================================

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    '{' +
    keys
      .map(k => JSON.stringify(k) + ':' + canonicalStringify((obj as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  );
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function warn(message: string) {
  console.warn(`  ⚠️  [WARNING] ${message}`);
}

function info(message: string) {
  console.info(`  ℹ️  [INFO] ${message}`);
}

let passedCount = 0;
let totalTests = 0;

function runTest(testName: string, testFn: () => void) {
  totalTests++;
  console.log(`\n[Test ${totalTests}] ${testName}`);
  try {
    testFn();
    passedCount++;
    console.log(`  ✨ PASSED: ${testName}`);
  } catch (err) {
    console.error(`\n💥 SUITE FAILED AT: ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('======================================================================');
console.log('  VidyutFlow Automated Demo Data Preservation & Integrity Test Suite');
console.log('  (Step 3.1: Dynamic Data-Quality & Anomaly Regression Engine)');
console.log('======================================================================');

// Load Committed Baseline Snapshot Fixture
const fixturePath = fileURLToPath(new URL('./fixtures/demo-data-baseline.json', import.meta.url));
if (!fs.existsSync(fixturePath)) {
  console.error(`Critical fixture missing: ${fixturePath}`);
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

const CURRENT_DATASETS: Record<string, unknown> = {
  DEFAULT_DEMO_ACCOUNTS,
  ROLE_PROFILES,
  INITIAL_CONNECTIONS,
  INITIAL_BILLS,
  INITIAL_PAYMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_COMPLAINTS,
  INITIAL_WORK_ORDERS,
  FEEDER_METRICS,
  SYSTEM_SERVICES,
  AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  CONSUMPTION_HISTORY,
  EXECUTIVE_MONTHLY_METRICS,
  SUBDIVISION_PERFORMANCE,
  INITIAL_CONSUMERS,
  INITIAL_EMPLOYEES,
  INITIAL_FIELD_ENGINEERS
};

// Known Documented Baseline Anomaly Registry
// (Used to distinguish expected historical/prototype nuances from new regression defects)
const KNOWN_BASELINE_ANOMALIES = {
  historicalPayments: new Map<string, { billNo: string; consumerNo: string; amount: number }>([
    [
      'TXN-DEB-1192837462',
      {
        billNo: 'BILL-UG-2026-08-77190',
        consumerNo: '04281-77190',
        amount: 15210
      }
    ]
  ]),
  tariffSubventions: new Map<string, { slabSum: number; energyCharges: number; diff: number }>([
    ['BILL-UG-2026-10-8821', { slabSum: 1522.0, energyCharges: 1420.0, diff: 102.0 }],
    ['BILL-UG-2026-09-8821', { slabSum: 1782.0, energyCharges: 1680.0, diff: 102.0 }],
    ['BILL-UG-2026-08-8821', { slabSum: 1704.0, energyCharges: 1605.0, diff: 99.0 }]
  ]),
  infrastructureWorkOrdersWithoutConsumer: new Set(['WO-4403']),
  districtCitizenComplaints: new Set(['CMP-8819', 'CMP-8815'])
};

// ============================================================================
// SUITE 1: CANONICAL BASELINE SNAPSHOT & FINGERPRINT PRESERVATION
// ============================================================================

runTest('1.1: Verify baseline metadata and dataset completeness', () => {
  assert(baseline.version === '1.0.0', 'Baseline schema version is 1.0.0');
  assert(typeof baseline.fingerprints === 'object', 'Baseline fingerprints dictionary exists');
  assert(typeof baseline.recordCounts === 'object', 'Baseline recordCounts dictionary exists');

  const expectedDatasetNames = Object.keys(CURRENT_DATASETS);
  assert(expectedDatasetNames.length === 18, 'All 18 required static datasets are tracked');

  for (const name of expectedDatasetNames) {
    assert(name in baseline.fingerprints, `Baseline tracks SHA-256 fingerprint for ${name}`);
    assert(name in baseline.recordCounts, `Baseline tracks record count for ${name}`);
    assert(name in baseline.datasets, `Baseline contains canonical snapshot of ${name}`);
  }
});

runTest('1.2: Deterministic SHA-256 fingerprint verification (Detect unauthorized mutations)', () => {
  for (const [name, currentData] of Object.entries(CURRENT_DATASETS)) {
    const canonicalCurrent = canonicalStringify(currentData);
    const currentHash = sha256(canonicalCurrent);
    const expectedHash = baseline.fingerprints[name];

    assert(
      currentHash === expectedHash,
      `Fingerprint match for ${name} (${currentHash.slice(0, 12)}... === ${expectedHash?.slice(0, 12)}...)`
    );
  }
});

runTest('1.3: Deep canonical serialization equivalence against committed baseline snapshot', () => {
  for (const [name, currentData] of Object.entries(CURRENT_DATASETS)) {
    const canonicalCurrent = canonicalStringify(currentData);
    const canonicalBaseline = canonicalStringify(baseline.datasets[name]);

    assert(
      canonicalCurrent === canonicalBaseline,
      `Canonical deep equality guaranteed for dataset: ${name}`
    );
  }
});

runTest('1.4: Immutable record count validation across all collections (including 5 SUBDIVISION_PERFORMANCE)', () => {
  for (const [name, currentData] of Object.entries(CURRENT_DATASETS)) {
    const currentCount = Array.isArray(currentData)
      ? currentData.length
      : Object.keys(currentData as object).length;
    const baselineCount = baseline.recordCounts[name];

    assert(
      currentCount === baselineCount,
      `Record count preserved for ${name}: exactly ${currentCount} records (Baseline: ${baselineCount})`
    );
  }

  // Explicit confirmation for SUBDIVISION_PERFORMANCE
  assert(
    SUBDIVISION_PERFORMANCE.length === 5,
    `SUBDIVISION_PERFORMANCE contains exactly 5 records (Mehsana City North, Mehsana Industrial GIDC, Gandhinagar Sub-Div 2, Kadi Rural, Patan Industrial)`
  );
});

// ============================================================================
// SUITE 2: IDENTIFIER INTEGRITY & UNIQUENESS CHECKS
// ============================================================================

runTest('2.1: Electricity connections primary key integrity', () => {
  const consumerNos = new Set<string>();
  const connectionIds = new Set<string>();
  const meterNos = new Set<string>();

  for (const conn of INITIAL_CONNECTIONS) {
    assert(Boolean(conn.consumerNo && conn.consumerNo.trim().length > 0), `Connection consumerNo is non-empty: ${conn.consumerNo}`);
    assert(!consumerNos.has(conn.consumerNo), `No duplicate consumerNo: ${conn.consumerNo}`);
    consumerNos.add(conn.consumerNo);

    assert(Boolean(conn.connectionId && conn.connectionId.trim().length > 0), `Connection connectionId is non-empty: ${conn.connectionId}`);
    assert(!connectionIds.has(conn.connectionId), `No duplicate connectionId: ${conn.connectionId}`);
    connectionIds.add(conn.connectionId);

    assert(Boolean(conn.meterNo && conn.meterNo.trim().length > 0), `Connection meterNo is non-empty: ${conn.meterNo}`);
    assert(!meterNos.has(conn.meterNo), `No duplicate meterNo: ${conn.meterNo}`);
    meterNos.add(conn.meterNo);
  }
});

runTest('2.2: Electricity bills primary key integrity', () => {
  const billNos = new Set<string>();
  for (const bill of INITIAL_BILLS) {
    assert(Boolean(bill.billNo && bill.billNo.trim().length > 0), `Bill billNo is valid: ${bill.billNo}`);
    assert(!billNos.has(bill.billNo), `No duplicate billNo: ${bill.billNo}`);
    billNos.add(bill.billNo);
  }
});

runTest('2.3: Payment transactions primary key integrity', () => {
  const txIds = new Set<string>();
  const bankRefs = new Set<string>();
  for (const p of INITIAL_PAYMENTS) {
    assert(Boolean(p.txId && p.txId.trim().length > 0), `Payment txId is valid: ${p.txId}`);
    assert(!txIds.has(p.txId), `No duplicate txId: ${p.txId}`);
    txIds.add(p.txId);

    assert(Boolean(p.bankReference && p.bankReference.trim().length > 0), `Bank reference valid: ${p.bankReference}`);
    assert(!bankRefs.has(p.bankReference), `No duplicate bank reference: ${p.bankReference}`);
    bankRefs.add(p.bankReference);
  }
});

runTest('2.4: Applications, complaints, and work orders primary key integrity', () => {
  const appIds = new Set<string>();
  for (const app of INITIAL_APPLICATIONS) {
    assert(Boolean(app.id && app.id.startsWith('APP-')), `Application ID valid format: ${app.id}`);
    assert(!appIds.has(app.id), `No duplicate application ID: ${app.id}`);
    appIds.add(app.id);
  }

  const complaintIds = new Set<string>();
  for (const cmp of INITIAL_COMPLAINTS) {
    assert(Boolean(cmp.id && cmp.id.startsWith('CMP-')), `Complaint ID valid format: ${cmp.id}`);
    assert(!complaintIds.has(cmp.id), `No duplicate complaint ID: ${cmp.id}`);
    complaintIds.add(cmp.id);
  }

  const workOrderIds = new Set<string>();
  for (const wo of INITIAL_WORK_ORDERS) {
    assert(Boolean(wo.id && wo.id.startsWith('WO-')), `Work order ID valid format: ${wo.id}`);
    assert(!workOrderIds.has(wo.id), `No duplicate work order ID: ${wo.id}`);
    workOrderIds.add(wo.id);
  }
});

runTest('2.5: Infrastructure (feeders, services, audit logs, notifications, staff) ID integrity', () => {
  const feederIds = new Set<string>();
  for (const f of FEEDER_METRICS) {
    assert(!feederIds.has(f.id), `No duplicate feeder ID: ${f.id}`);
    feederIds.add(f.id);
  }

  const serviceNames = new Set<string>();
  for (const s of SYSTEM_SERVICES) {
    assert(!serviceNames.has(s.name), `No duplicate service name: ${s.name}`);
    serviceNames.add(s.name);
  }

  const logIds = new Set<string>();
  for (const l of AUDIT_LOGS) {
    assert(!logIds.has(l.id), `No duplicate audit log ID: ${l.id}`);
    logIds.add(l.id);
  }

  const notifIds = new Set<string>();
  for (const n of INITIAL_NOTIFICATIONS) {
    assert(!notifIds.has(n.id), `No duplicate notification ID: ${n.id}`);
    notifIds.add(n.id);
  }

  const consumerIds = new Set<string>();
  for (const c of INITIAL_CONSUMERS) {
    assert(!consumerIds.has(c.consumerNo), `No duplicate consumer record: ${c.consumerNo}`);
    consumerIds.add(c.consumerNo);
  }

  const empIds = new Set<string>();
  for (const e of INITIAL_EMPLOYEES) {
    assert(!empIds.has(e.id), `No duplicate employee ID: ${e.id}`);
    empIds.add(e.id);
  }

  const fldIds = new Set<string>();
  for (const fe of INITIAL_FIELD_ENGINEERS) {
    assert(!fldIds.has(fe.id), `No duplicate field engineer ID: ${fe.id}`);
    fldIds.add(fe.id);
  }
});

// ============================================================================
// SUITE 3: DYNAMIC BILLING ARITHMETIC & SLAB DISCREPANCY CHECKER (TASK 4)
// ============================================================================

runTest('3.1: Dynamic inspection of ALL electricity bills (Slab sum vs energyCharges, Units, Rates, and Bill Total)', () => {
  assert(INITIAL_BILLS.length > 0, 'INITIAL_BILLS collection is not empty');

  let discrepanciesCount = 0;

  for (const bill of INITIAL_BILLS) {
    console.log(`\n    --- Inspecting Bill: ${bill.billNo} (${bill.billMonth}, Consumer: ${bill.consumerNo}) ---`);

    // 1. Verify bill line item arithmetic
    const lineItemTotal =
      bill.energyCharges +
      bill.fixedCharges +
      bill.fuelPriceAdjustment +
      bill.electricityDuty -
      bill.rebateOrSubsidy;

    assert(
      lineItemTotal === bill.totalAmount,
      `Bill ${bill.billNo} line item total: ₹${bill.energyCharges} + ₹${bill.fixedCharges} + ₹${bill.fuelPriceAdjustment} + ₹${bill.electricityDuty} - ₹${bill.rebateOrSubsidy} === ₹${bill.totalAmount}`
    );

    // 2. Inspect slab breakdown units and individual multiplication
    assert(Array.isArray(bill.slabBreakdown) && bill.slabBreakdown.length > 0, `Bill ${bill.billNo} has non-empty slab breakdown`);

    let slabUnitsSum = 0;
    let slabAmountSum = 0;

    for (const slab of bill.slabBreakdown) {
      assert(slab.units > 0, `Slab "${slab.slab}" units are positive (${slab.units}) in ${bill.billNo}`);
      assert(slab.rate > 0, `Slab "${slab.slab}" rate is positive (₹${slab.rate}) in ${bill.billNo}`);

      const expectedSlabAmount = Number((slab.units * slab.rate).toFixed(2));
      // Sensible monetary rounding tolerance: <= 1.0 rupee for truncation/rounding of paise
      assert(
        Math.abs(slab.amount - expectedSlabAmount) <= 1.0,
        `Slab amount ₹${slab.amount} matches units (${slab.units}) * rate (₹${slab.rate}) = ₹${expectedSlabAmount} (within tolerance) in ${bill.billNo}`
      );

      slabUnitsSum += slab.units;
      slabAmountSum += slab.amount;
    }

    slabAmountSum = Number(slabAmountSum.toFixed(2));

    // 3. Verify slab units sum equals unitsConsumed
    assert(
      slabUnitsSum === bill.unitsConsumed,
      `Sum of slab units (${slabUnitsSum}) equals bill unitsConsumed (${bill.unitsConsumed}) in ${bill.billNo}`
    );

    // 4. Compare sum of slab amounts with stored energyCharges
    const energyDiff = Number((slabAmountSum - bill.energyCharges).toFixed(2));

    if (energyDiff !== 0) {
      discrepanciesCount++;
      const sign = energyDiff > 0 ? '+' : '';
      warn(
        `Discrepancy in ${bill.billNo} (${bill.billMonth}): Slab amounts sum to ₹${slabAmountSum}, but stored energyCharges is ₹${bill.energyCharges} (Calculated Difference: ${sign}₹${energyDiff})`
      );

      // Regression check: verify whether this discrepancy is a known documented baseline anomaly
      const knownAnomaly = KNOWN_BASELINE_ANOMALIES.tariffSubventions.get(bill.billNo);
      assert(
        knownAnomaly !== undefined,
        `Discrepancy in ${bill.billNo} must be a documented baseline anomaly (Found diff: ₹${energyDiff})`
      );
      assert(
        knownAnomaly!.diff === energyDiff,
        `Discrepancy amount for ${bill.billNo} matches documented baseline diff of ₹${knownAnomaly!.diff}`
      );
    } else {
      assert(
        slabAmountSum === bill.energyCharges,
        `Slab amounts sum (₹${slabAmountSum}) exactly equals stored energyCharges (₹${bill.energyCharges}) in ${bill.billNo}`
      );
    }
  }

  assert(
    discrepanciesCount === KNOWN_BASELINE_ANOMALIES.tariffSubventions.size,
    `Dynamically detected exactly ${discrepanciesCount} documented bill slab discrepancies across all ${INITIAL_BILLS.length} bills`
  );
});

// ============================================================================
// SUITE 4: DYNAMIC PAYMENT INTEGRITY & MISSING BILL CHECKER (TASK 5)
// ============================================================================

runTest('4.1: Dynamic inspection of ALL payment transactions (Referenced bill existence & historical exceptions)', () => {
  const allKnownBills = new Map(INITIAL_BILLS.map(b => [b.billNo, b]));
  const connectionConsumerNos = new Set(INITIAL_CONNECTIONS.map(c => c.consumerNo));

  assert(INITIAL_PAYMENTS.length > 0, 'INITIAL_PAYMENTS collection is not empty');

  let missingBillsCount = 0;

  for (const payment of INITIAL_PAYMENTS) {
    console.log(`\n    --- Inspecting Payment: ${payment.txId} (Bill: ${payment.billNo}, Amount: ₹${payment.amount}) ---`);

    // Verify payment points to valid consumer connection
    assert(
      connectionConsumerNos.has(payment.consumerNo),
      `Payment ${payment.txId} references valid demo connection consumerNo: ${payment.consumerNo}`
    );

    const linkedBill = allKnownBills.get(payment.billNo);

    if (linkedBill) {
      assert(
        linkedBill.consumerNo === payment.consumerNo,
        `Payment ${payment.txId} consumer (${payment.consumerNo}) matches linked bill ${payment.billNo}`
      );
      assert(
        linkedBill.totalAmount === payment.amount,
        `Payment ${payment.txId} amount (₹${payment.amount}) matches bill totalAmount (₹${linkedBill.totalAmount})`
      );
      assert(
        linkedBill.status === 'Paid',
        `Linked bill ${linkedBill.billNo} status is 'Paid'`
      );
    } else {
      // Bill is absent from active INITIAL_BILLS window
      missingBillsCount++;
      warn(
        `Payment ${payment.txId} references bill "${payment.billNo}" which is ABSENT from active INITIAL_BILLS (Consumer: ${payment.consumerNo}, Amount: ₹${payment.amount})`
      );

      // Regression check: verify whether this missing bill is the documented historical payment exception
      const knownHistorical = KNOWN_BASELINE_ANOMALIES.historicalPayments.get(payment.txId);
      assert(
        knownHistorical !== undefined,
        `Unlinked payment ${payment.txId} must be a documented baseline historical payment`
      );
      assert(
        knownHistorical!.billNo === payment.billNo,
        `Unlinked payment billNo matches documented exception ${knownHistorical!.billNo}`
      );
      assert(
        knownHistorical!.consumerNo === payment.consumerNo,
        `Unlinked payment consumerNo matches documented exception ${knownHistorical!.consumerNo}`
      );
      assert(
        knownHistorical!.amount === payment.amount,
        `Unlinked payment amount matches documented exception ₹${knownHistorical!.amount}`
      );
    }
  }

  assert(
    missingBillsCount === KNOWN_BASELINE_ANOMALIES.historicalPayments.size,
    `Dynamically detected exactly ${missingBillsCount} documented historical payment without active bill in INITIAL_BILLS`
  );
});

// ============================================================================
// SUITE 5: DYNAMIC ROLE PROFILE & STAFF IDENTITY COMPARATOR (TASK 6)
// ============================================================================

runTest('5.1: Dynamic comparison of ALL five roles (DEFAULT_DEMO_ACCOUNTS vs ROLE_PROFILES)', () => {
  const allRoles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

  let matchedRolesCount = 0;
  let divergentRolesCount = 0;

  for (const role of allRoles) {
    const demoAccount = DEFAULT_DEMO_ACCOUNTS[role];
    const roleProfile = ROLE_PROFILES[role];

    assert(Boolean(demoAccount), `Demo account defined for role: ${role}`);
    assert(Boolean(roleProfile), `Role profile defined for role: ${role}`);

    const demoName = demoAccount.name;
    const personaName = roleProfile.personaName;

    if (demoName === personaName) {
      matchedRolesCount++;
      info(`Role "${role}": Demo login account name matches organizational persona: "${demoName}"`);
      assert(demoAccount.role === role, `Role identifier matches: ${role}`);
    } else {
      divergentRolesCount++;
      info(
        `Role "${role}": Dual-layer identity architectural finding — Demo login account "${demoName}" (${demoAccount.email}, ${demoAccount.designation}) differs from organizational ERP persona "${personaName}" (${roleProfile.personaDesignation})`
      );
      // Verify that this divergent ERP persona exists in the operational staff records
      if (role === 'employee') {
        const emp = INITIAL_EMPLOYEES.find(e => e.name === personaName);
        assert(Boolean(emp), `Organizational employee persona "${personaName}" exists in INITIAL_EMPLOYEES (ID: ${emp?.id})`);
      } else if (role === 'field') {
        const fld = INITIAL_FIELD_ENGINEERS.find(f => f.name === personaName);
        assert(Boolean(fld), `Organizational field engineer persona "${personaName}" exists in INITIAL_FIELD_ENGINEERS (ID: ${fld?.id})`);
      }
    }
  }

  assert(matchedRolesCount === 1, 'Exactly 1 role (consumer) shares identical demo account and profile persona');
  assert(divergentRolesCount === 4, 'Exactly 4 internal utility roles represent dual-layer prototype login accounts vs operational ERP personas');
});

runTest('5.2: Verification of all 5 demo account credentials and statutory disclaimers', () => {
  const allRoles: UserRole[] = ['consumer', 'employee', 'field', 'management', 'admin'];

  for (const role of allRoles) {
    const acc = DEFAULT_DEMO_ACCOUNTS[role];
    assert(acc.password === 'Demo@12345', `Demo password preserved for ${role}: Demo@12345`);
    assert(acc.email.endsWith('@vidyutflow.demo'), `Demo email ends with @vidyutflow.demo: ${acc.email}`);
    assert(acc.isPreconfigured === true, `isPreconfigured flag set on ${role}`);
  }

  assert(Boolean(AUTH_DISCLAIMERS.prototypeNotice), 'Prototype disclaimer present');
  assert(Boolean(AUTH_DISCLAIMERS.storageDisclaimer), 'Storage disclaimer present');
  assert(Boolean(AUTH_DISCLAIMERS.signupNotice), 'Signup notice present');
});

// ============================================================================
// SUITE 6: DYNAMIC WORK ORDERS & DISTRICT COMPLAINTS CHECKER (TASK 8)
// ============================================================================

runTest('6.1: Dynamic inspection of ALL work orders (Proper handling of grid infrastructure vs consumer orders)', () => {
  assert(INITIAL_WORK_ORDERS.length > 0, 'INITIAL_WORK_ORDERS collection is not empty');

  let consumerOrdersCount = 0;
  let infrastructureOrdersCount = 0;

  for (const wo of INITIAL_WORK_ORDERS) {
    assert(Boolean(wo.id && wo.id.startsWith('WO-')), `Valid work order ID: ${wo.id}`);
    assert(Boolean(wo.title), `Work order ${wo.id} has title: ${wo.title}`);
    assert(Boolean(wo.feederName), `Work order ${wo.id} has feederName: ${wo.feederName}`);
    assert(Boolean(wo.assignedTo), `Work order ${wo.id} is assigned to: ${wo.assignedTo}`);

    if (wo.consumerNo !== undefined) {
      consumerOrdersCount++;
      assert(
        typeof wo.consumerNo === 'string' && wo.consumerNo.length > 0,
        `Work order ${wo.id} consumerNo is valid: ${wo.consumerNo}`
      );
      assert(
        Boolean(wo.consumerName),
        `Work order ${wo.id} has consumerName: ${wo.consumerName}`
      );
    } else {
      infrastructureOrdersCount++;
      info(
        `Work order ${wo.id} ("${wo.title}"): Grid asset work order without single-consumer binding (Asset: ${wo.location}, Feeder: ${wo.feederName})`
      );
      assert(
        KNOWN_BASELINE_ANOMALIES.infrastructureWorkOrdersWithoutConsumer.has(wo.id),
        `Infrastructure order without consumer must be documented baseline anomaly: ${wo.id}`
      );
    }
  }

  assert(consumerOrdersCount === 3, 'Exactly 3 work orders are consumer-bound');
  assert(infrastructureOrdersCount === 1, 'Exactly 1 work order is a grid transformer infrastructure maintenance order');
});

runTest('6.2: Dynamic inspection of ALL complaints (Proper handling of district citizens vs demo consumer)', () => {
  assert(INITIAL_COMPLAINTS.length > 0, 'INITIAL_COMPLAINTS collection is not empty');

  const demoConsumerNos = new Set(INITIAL_CONNECTIONS.map(c => c.consumerNo));
  let demoComplaintsCount = 0;
  let districtComplaintsCount = 0;

  for (const complaint of INITIAL_COMPLAINTS) {
    assert(Boolean(complaint.id && complaint.id.startsWith('CMP-')), `Valid complaint ID: ${complaint.id}`);
    assert(Boolean(complaint.consumerNo), `Complaint ${complaint.id} has consumerNo: ${complaint.consumerNo}`);
    assert(Boolean(complaint.consumerName), `Complaint ${complaint.id} has consumerName: ${complaint.consumerName}`);
    assert(Boolean(complaint.feederName), `Complaint ${complaint.id} has feederName: ${complaint.feederName}`);
    assert(complaint.slaTargetHours > 0, `Complaint ${complaint.id} has SLA target: ${complaint.slaTargetHours}h`);

    if (demoConsumerNos.has(complaint.consumerNo)) {
      demoComplaintsCount++;
      assert(
        complaint.consumerNo === '04281-99231' || complaint.consumerNo === '04281-77190',
        `Demo complaint ${complaint.id} belongs to demo consumer connection (${complaint.consumerNo})`
      );
    } else {
      districtComplaintsCount++;
      info(
        `Complaint ${complaint.id}: District citizen grievance from "${complaint.consumerName}" (${complaint.consumerNo}) on ${complaint.feederName} for sub-divisional ERP triage`
      );
      assert(
        KNOWN_BASELINE_ANOMALIES.districtCitizenComplaints.has(complaint.id),
        `District citizen complaint must be documented baseline anomaly: ${complaint.id}`
      );
    }
  }

  assert(demoComplaintsCount === 2, 'Exactly 2 complaints attached to seeded demo consumer connections');
  assert(districtComplaintsCount === 2, 'Exactly 2 complaints attached to external district citizens');
});

// ============================================================================
// SUITE 7: APPLICATIONS & CONSUMER OWNERSHIP CROSS-REFERENCES
// ============================================================================

runTest('7.1: Applications and work-order cross-referencing', () => {
  const wo4402 = INITIAL_WORK_ORDERS.find(w => w.id === 'WO-4402');
  assert(Boolean(wo4402), 'Work order WO-4402 exists');
  assert(wo4402!.title.includes('APP-2026-0842'), 'WO-4402 title references APP-2026-0842');

  const app842 = INITIAL_APPLICATIONS.find(a => a.id === 'APP-2026-0842');
  assert(Boolean(app842), 'Application APP-2026-0842 exists');
  assert(app842!.applicantName === 'Smt. Meenaben Patel', 'APP-2026-0842 applicant is Smt. Meenaben Patel');
  assert(app842!.assignedOfficer === 'Rajesh V. Trivedi (AE Ops)', 'Assigned officer matches AE Ops persona');
  assert(app842!.assignedEngineer === 'Vikramaditya Solanki (JE Field)', 'Assigned engineer matches JE Field persona');
  assert(wo4402!.assignedTo === 'Vikramaditya Solanki (JE Field)', 'WO-4402 assigned to same field engineer');
});

runTest('7.2: Consumer account multi-connection ownership mapping', () => {
  const meenabenConns = INITIAL_CONNECTIONS.filter(c => c.accountEmail === 'consumer@vidyutflow.demo');
  assert(meenabenConns.length === 2, 'Demo consumer owns exactly 2 connections');
  for (const c of meenabenConns) {
    assert(c.accountId === 'demo_consumer', `Connection ${c.consumerNo} mapped to accountId demo_consumer`);
  }
});

// ============================================================================
// SUITE SUMMARY & METRICS
// ============================================================================

console.log('\n======================================================================');
console.log(`  ALL ${passedCount} DEMO DATA INTEGRITY & REGRESSION TESTS PASSED!`);
console.log('  - All 18 Static Datasets Preserved (Cryptographic SHA-256 Verified)');
console.log('  - 5/5 SUBDIVISION_PERFORMANCE Records Verified');
console.log('  - All Bills Dynamically Scanned for Arithmetic & Tariff Subventions');
console.log('  - All Payments Dynamically Scanned for Bill References');
console.log('  - All Roles Dynamically Compared for Account vs Persona Divergence');
console.log('  - Infrastructure Orders & District Citizen Tickets Accurately Triaged');
console.log('  - Regression Gate: Zero Unexplained Inconsistencies Detected');
console.log('======================================================================\n');
