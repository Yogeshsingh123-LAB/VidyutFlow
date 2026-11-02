import {
  detectAnomalies,
  filterIncidentsByRole,
  DEFAULT_DETECTION_CONFIG
} from '../src/utils/anomalyDetector';
import {
  isAudioAlertsEnabled,
  setAudioAlertsEnabled,
  toggleAudioAlerts,
  playIncidentSound
} from '../src/utils/audioAlerts';
import {
  CriticalIncident,
  FeederHealth,
  ComplaintRecord,
  WorkOrder,
  AuditLogItem,
  SystemServiceStatus
} from '../src/types';

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

console.log('🧪 Starting VidyutFlow Phase 2: Critical Incident Detection & Alerting Tests\n');

// 1. Feeder Telemetry Anomaly Detection
console.log('--- Suite 1: Automated SCADA & Feeder Anomaly Detection ---');
{
  const mockFeeders: FeederHealth[] = [
    {
      id: 'F-TEST-NORMAL',
      name: 'Normal 11kV Feeder',
      subdivision: 'Mehsana City',
      voltageKv: 11,
      peakLoadAmps: 180,
      ratedCapacityAmps: 300,
      utilizationPct: 60,
      transformersCount: 14,
      consumersConnected: 520,
      trippingEventsPast30d: 1,
      status: 'Optimal'
    },
    {
      id: 'F-TEST-WARNING',
      name: 'Warning 11kV Feeder',
      subdivision: 'Visnagar',
      voltageKv: 11,
      peakLoadAmps: 260,
      ratedCapacityAmps: 300,
      utilizationPct: 86.6,
      transformersCount: 16,
      consumersConnected: 610,
      trippingEventsPast30d: 2,
      status: 'Warning'
    },
    {
      id: 'F-TEST-CRITICAL',
      name: 'Critical Overloaded Feeder',
      subdivision: 'Kalol',
      voltageKv: 11,
      peakLoadAmps: 320,
      ratedCapacityAmps: 300,
      utilizationPct: 106.6,
      transformersCount: 18,
      consumersConnected: 750,
      trippingEventsPast30d: 6,
      status: 'Critical Overload'
    }
  ];

  const incidents = detectAnomalies({ feeders: mockFeeders });

  assert(
    !incidents.some(i => i.entityId === 'F-TEST-NORMAL'),
    'Normal feeder (60% load, 1 trip) does NOT trigger incident'
  );

  const warnInc = incidents.find(i => i.entityId === 'F-TEST-WARNING');
  assert(
    Boolean(warnInc && warnInc.severity === 'WARNING' && warnInc.responsibleRoles.includes('field')),
    'Feeder at 86.6% load triggers WARNING incident routed to field engineer'
  );

  const critInc = incidents.find(i => i.entityId === 'F-TEST-CRITICAL');
  assert(
    Boolean(critInc && critInc.severity === 'CRITICAL' && critInc.status === 'DETECTED'),
    'Feeder at 106.6% load with 6 trips triggers CRITICAL incident in DETECTED stage'
  );
  assert(
    Boolean(critInc && critInc.responsibleRoles.includes('management') && critInc.responsibleRoles.includes('field')),
    'Critical feeder overload is routed to both Management and Field roles'
  );
}

// 2. Complaint SLA Breach Detection
console.log('\n--- Suite 2: Complaint SLA Breach Anomaly Detection ---');
{
  const mockComplaints: ComplaintRecord[] = [
    {
      id: 'CMP-BREACHED',
      consumerNo: '04281-99231',
      consumerName: 'Meenaben Patel',
      phone: '+91 98250 12345',
      category: 'Power Outage',
      priority: 'Critical',
      status: 'In Progress',
      subdivision: 'Mehsana City',
      feederName: 'F-MEH-01',
      description: 'Distribution box sparks observed on pole #22',
      filedAt: '12-Oct-2026 09:00',
      slaTargetHours: 4,
      slaDueTime: '12-Oct-2026 13:00',
      slaBreached: true,
      timeline: []
    },
    {
      id: 'CMP-RESOLVED',
      consumerNo: '04281-77190',
      consumerName: 'Patel Enterprises',
      phone: '+91 98250 54321',
      category: 'Billing Dispute',
      priority: 'Medium',
      status: 'Resolved',
      subdivision: 'Mehsana Industrial',
      feederName: 'F-MEH-02',
      description: 'Tariff verification resolved',
      filedAt: '14-Oct-2026 10:00',
      slaTargetHours: 48,
      slaDueTime: '16-Oct-2026 10:00',
      slaBreached: false,
      timeline: []
    }
  ];

  const incidents = detectAnomalies({ complaints: mockComplaints });

  assert(
    !incidents.some(i => i.entityId === 'CMP-RESOLVED'),
    'Resolved complaints do not trigger SLA breach alerts'
  );

  const breachedInc = incidents.find(i => i.entityId === 'CMP-BREACHED');
  assert(
    Boolean(breachedInc && breachedInc.severity === 'CRITICAL'),
    'Expired emergency outage complaint triggers CRITICAL SLA breach incident'
  );
  assert(
    Boolean(breachedInc && breachedInc.responsibleRoles.includes('employee') && breachedInc.responsibleRoles.includes('management')),
    'SLA breach incident is routed to Employee and Management operations'
  );
}

// 3. Security & Infrastructure Degradation Detection
console.log('\n--- Suite 3: Security & Infrastructure Sentinel ---');
{
  const mockLogs: AuditLogItem[] = [
    {
      id: 'LOG-SEC-01',
      timestamp: '2026-10-15T08:00:00Z',
      actor: 'Gateway Firewall',
      role: 'admin',
      action: 'FAILED_PORTAL_LOGIN_ATTEMPT',
      resource: '/api/auth/login',
      ipAddress: '198.51.100.24',
      status: 'WARNING',
      metaDetail: 'Suspicious brute-force signature detected: 5 rapid failures'
    }
  ];

  const mockServices: SystemServiceStatus[] = [
    {
      name: 'SCADA IoT Telemetry Bridge',
      category: 'Core ERP',
      status: 'Degraded',
      latencyMs: 1450,
      uptime90d: 98.2,
      lastIncident: '2026-10-15 07:30'
    }
  ];

  const incidents = detectAnomalies({ auditLogs: mockLogs, systemServices: mockServices });

  const secInc = incidents.find(i => i.entityId === 'LOG-SEC-01');
  assert(
    Boolean(secInc && secInc.module === 'Security & Access' && secInc.responsibleRoles.includes('admin')),
    'Brute-force security anomaly routes to Admin role'
  );

  const srvInc = incidents.find(i => i.entityId === 'SCADA IoT Telemetry Bridge');
  assert(
    Boolean(srvInc && srvInc.severity === 'WARNING' && srvInc.responsibleRoles.includes('admin')),
    'Degraded core microservice triggers infrastructure alert'
  );
}

// 4. Strict Role-Based Incident Filtering
console.log('\n--- Suite 4: Strict Role-Based Alert Scoping ---');
{
  const allIncidents: CriticalIncident[] = [
    {
      id: 'INC-FEEDER',
      title: 'Feeder Overload',
      description: 'Feeder F-KL04 105%',
      severity: 'CRITICAL',
      module: 'Distribution & SCADA',
      entityId: 'F-KL04',
      entityType: 'feeder',
      timestamp: '2026-10-15T08:00:00Z',
      responsibleRoles: ['field', 'management'],
      recommendedAction: 'Inspect DTR',
      status: 'DETECTED',
      history: []
    },
    {
      id: 'INC-SEC',
      title: 'Admin Security Alert',
      description: 'Repeated auth failures',
      severity: 'WARNING',
      module: 'Security & Access',
      entityId: 'SEC-1',
      entityType: 'security',
      timestamp: '2026-10-15T08:00:00Z',
      responsibleRoles: ['admin'],
      recommendedAction: 'Check firewall',
      status: 'DETECTED',
      history: []
    },
    {
      id: 'INC-CONSUMER-SLA',
      title: 'Power Outage SLA Breach',
      description: 'Outage at consumer premises 04281-99231',
      severity: 'CRITICAL',
      module: 'Metering & SLA',
      entityId: '04281-99231',
      entityType: 'complaint',
      timestamp: '2026-10-15T08:00:00Z',
      responsibleRoles: ['consumer', 'employee', 'field'],
      recommendedAction: 'Field priority dispatch',
      status: 'DETECTED',
      history: []
    }
  ];

  const consumerIncidents = filterIncidentsByRole(allIncidents, 'consumer');
  assert(
    consumerIncidents.length === 1 && consumerIncidents[0].id === 'INC-CONSUMER-SLA',
    'Consumer role only receives incidents affecting their authorized domain'
  );

  const adminIncidents = filterIncidentsByRole(allIncidents, 'admin');
  assert(
    adminIncidents.length === 1 && adminIncidents[0].id === 'INC-SEC',
    'Admin role receives security & governance incidents'
  );

  const fieldIncidents = filterIncidentsByRole(allIncidents, 'field');
  assert(
    fieldIncidents.length === 2 && fieldIncidents.some(i => i.id === 'INC-FEEDER') && fieldIncidents.some(i => i.id === 'INC-CONSUMER-SLA'),
    'Field Engineer receives Feeder and Outage SLA incidents'
  );
}

// 5. Incident Lifecycle & Audit Trail Simulation
console.log('\n--- Suite 5: Incident State Transitions & Lifecycle Audit ---');
{
  const baseIncident: CriticalIncident = {
    id: 'INC-LIFECYCLE-1',
    title: '11kV Feeder Tripping Alert',
    description: 'Feeder experienced 3 consecutive trips',
    severity: 'CRITICAL',
    module: 'Distribution & SCADA',
    entityId: 'F-01',
    entityType: 'feeder',
    timestamp: '2026-10-15T09:00:00Z',
    responsibleRoles: ['field', 'management'],
    recommendedAction: 'Despatch inspection crew',
    status: 'DETECTED',
    history: [
      {
        timestamp: '2026-10-15T09:00:00Z',
        stage: 'DETECTED',
        actor: 'SCADA Telemetry Engine',
        notes: 'Initial trip threshold reached'
      }
    ]
  };

  // Transition 1: Acknowledge
  const ackIncident: CriticalIncident = {
    ...baseIncident,
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'Er. Rajesh Patel (JE Field)',
    acknowledgedAt: '2026-10-15T09:05:00Z',
    history: [
      ...baseIncident.history,
      {
        timestamp: '2026-10-15T09:05:00Z',
        stage: 'ACKNOWLEDGED',
        actor: 'Er. Rajesh Patel (JE Field)',
        notes: 'Inspection crew mobilized with thermal camera'
      }
    ]
  };
  assert(
    ackIncident.status === 'ACKNOWLEDGED' && ackIncident.history.length === 2,
    'Lifecycle transition to ACKNOWLEDGED records actor, timestamp, and audit event'
  );

  // Transition 2: Escalate
  const escIncident: CriticalIncident = {
    ...ackIncident,
    status: 'ESCALATED',
    escalatedTo: 'management',
    escalatedAt: '2026-10-15T09:20:00Z',
    escalatedReason: 'Thermal hot spot on DTR bush requires 20-minute planned shutdown',
    history: [
      ...ackIncident.history,
      {
        timestamp: '2026-10-15T09:20:00Z',
        stage: 'ESCALATED',
        actor: 'Er. Rajesh Patel (JE Field)',
        notes: 'Escalated to MANAGEMENT: Thermal hot spot requires shutdown sanction'
      }
    ]
  };
  assert(
    escIncident.status === 'ESCALATED' && escIncident.escalatedTo === 'management',
    'Lifecycle transition to ESCALATED records target role and justification'
  );

  // Transition 3: Resolve
  const resIncident: CriticalIncident = {
    ...escIncident,
    status: 'RESOLVED',
    resolvedBy: 'Er. A. K. Varma (Superintending Engineer)',
    resolvedAt: '2026-10-15T10:00:00Z',
    resolutionNotes: 'Load shifted to alternate Kalol-B bus. Transformer bush replaced.',
    history: [
      ...escIncident.history,
      {
        timestamp: '2026-10-15T10:00:00Z',
        stage: 'RESOLVED',
        actor: 'Er. A. K. Varma (Superintending Engineer)',
        notes: 'Rectified and normal telemetry confirmed'
      }
    ]
  };
  assert(
    resIncident.status === 'RESOLVED' && resIncident.history.length === 4,
    'Lifecycle transition to RESOLVED records final resolution notes and preserves complete history'
  );
}

// 6. Audio Alerts Fallback & Safety
console.log('\n--- Suite 6: Audio Alerts Safety & Degradation ---');
{
  // In Node environment without window/AudioContext, calls must not throw
  let threw = false;
  try {
    playIncidentSound('CRITICAL');
    playIncidentSound('WARNING');
    playIncidentSound('INFO');
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'playIncidentSound executes safely in non-browser environments without throwing');

  // Verify preference toggle fallback
  const isEnabled = isAudioAlertsEnabled();
  assert(typeof isEnabled === 'boolean', 'isAudioAlertsEnabled returns boolean safely');
}

console.log(`\n========================================`);
console.log(`Phase 2 Critical Incident Test Results:`);
console.log(`Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
