/**
 * VidyutFlow 2.0 — Phase 10 Verification Suite:
 * Smart Outage Map & Live Utility Operations Timeline
 *
 * Covers all 18 mandatory automated test areas (Section M.1 – M.18) and
 * end-to-end operational lifecycle scenarios (Scenarios 1 – 6).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FEEDER_METRICS,
  INITIAL_COMPLAINTS,
  INITIAL_CONNECTIONS,
  INITIAL_WORK_ORDERS,
  UGVCL_LOGO_PATH,
} from '../src/data/mockData';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../src/i18n/types';
import { translations } from '../src/i18n/translations';
import {
  OUTAGE_MAP_TRANSLATIONS,
  formatConfidenceLabel,
  formatTimelineEventDescription,
} from '../src/i18n/outageMapTranslations';
import {
  SIMULATED_FEEDER_POLYGONS,
  clusterOutageMarkers,
  computeBoundsForOutages,
  isValidGeoPoint,
  normalizeGeoPoint,
  sanitizeMapText,
  validateGeoJsonPolygon,
} from '../src/outageMap/geoValidation';
import {
  BackendOutageMapAdapter,
  DemoOutageMapAdapter,
  acceptNewerOutageRecord,
  applyOutageFilters,
  buildAuthorizedOutageRecords,
  buildAuthorizedTimelineEvents,
  computeManagementOutageSummary,
  reconcileAndOrderTimelineEvents,
  type CanonicalOutageDatasetSnapshot,
} from '../src/outageMap/permissionsAndAdapter';
import type { OperationsTimelineEvent, OutageMapRecord } from '../src/outageMap/types';
import type { CriticalIncident } from '../src/types';
import { detectAnomalies, isConfirmedEmergencyHazard } from '../src/utils/anomalyDetector';
import type { OfflineFieldQueueItem } from '../src/utils/offlineFieldSync';

const readSrc = (relPath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8').replace(/\r\n/g, '\n');

let passed = 0;
async function runSection(title: string, fn: () => void | Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${title}`);
}

console.log('======================================================================');
console.log('  VidyutFlow Phase 10: Smart Outage Map & Operations Timeline Suite');
console.log('======================================================================\n');

async function main() {
  // Capture baseline snapshots to prove zero mutation of canonical DEMO data (M.14)
  const baselineComplaintsJson = JSON.stringify(INITIAL_COMPLAINTS);
  const baselineWorkOrdersJson = JSON.stringify(INITIAL_WORK_ORDERS);
  const baselineFeedersJson = JSON.stringify(FEEDER_METRICS);
  const baselineConnectionsJson = JSON.stringify(INITIAL_CONNECTIONS);
  const baselineLogo = UGVCL_LOGO_PATH;

  const baseIncidents = detectAnomalies({
    complaints: INITIAL_COMPLAINTS,
    workOrders: INITIAL_WORK_ORDERS,
    feeders: FEEDER_METRICS,
  });

  // -------------------------------------------------------------------------
  // M.1: Coordinate Validation
  // -------------------------------------------------------------------------
  await runSection('M.1 Coordinate validation accepts valid WGS-84 points and rejects NaN, out-of-range, and (0,0)', () => {
    assert.equal(isValidGeoPoint({ latitude: 23.6028, longitude: 72.3984 }), true);
    assert.equal(isValidGeoPoint({ latitude: -90, longitude: 180 }), true);
    assert.equal(isValidGeoPoint({ latitude: Number.NaN, longitude: 72.39 }), false);
    assert.equal(isValidGeoPoint({ latitude: 23.6, longitude: Number.POSITIVE_INFINITY }), false);
    assert.equal(isValidGeoPoint({ latitude: 91, longitude: 72.39 }), false);
    assert.equal(isValidGeoPoint({ latitude: 23.6, longitude: -181 }), false);
    assert.equal(isValidGeoPoint({ latitude: 0, longitude: 0 }), false);
    assert.equal(isValidGeoPoint(null), false);
    assert.equal(normalizeGeoPoint(23.60281234, 72.39849876)?.latitude, 23.602812);
    assert.equal(normalizeGeoPoint(999, 72.3), undefined);
  });

  // -------------------------------------------------------------------------
  // M.2: GeoJSON Validation
  // -------------------------------------------------------------------------
  await runSection('M.2 GeoJSON polygon validation accepts closed WGS-84 rings and rejects malformed geometries', () => {
    for (const [feederName, poly] of Object.entries(SIMULATED_FEEDER_POLYGONS)) {
      assert.equal(poly.isSimulated, true, `${feederName} polygon must be marked isSimulated: true`);
      const validated = validateGeoJsonPolygon(poly.geometry);
      assert.ok(validated, `${feederName} polygon must pass GeoJSON validation`);
    }

    // Reject unclosed polygon ring
    assert.equal(
      validateGeoJsonPolygon({
        type: 'Polygon',
        coordinates: [
          [
            [72.3, 23.5],
            [72.4, 23.5],
            [72.4, 23.6],
            [72.3, 23.6],
          ],
        ],
      }),
      null,
    );

    // Reject < 4 points
    assert.equal(
      validateGeoJsonPolygon({
        type: 'Polygon',
        coordinates: [
          [
            [72.3, 23.5],
            [72.4, 23.5],
            [72.3, 23.5],
          ],
        ],
      }),
      null,
    );

    // Reject out-of-range lat/lng
    assert.equal(
      validateGeoJsonPolygon({
        type: 'Polygon',
        coordinates: [
          [
            [272.3, 23.5],
            [72.4, 23.5],
            [72.4, 23.6],
            [272.3, 23.5],
          ],
        ],
      }),
      null,
    );

    assert.equal(validateGeoJsonPolygon({ type: 'Point', coordinates: [72.3, 23.5] }), null);
  });

  // -------------------------------------------------------------------------
  // M.3: Role-Based Outage Visibility Across All 5 Roles
  // -------------------------------------------------------------------------
  await runSection('M.3 Role-based outage visibility scopes records strictly for consumer, employee, field, management, and admin', () => {
    const consumerConn = INITIAL_CONNECTIONS.filter((c) => c.consumerNo === '04281-99231');
    const consumerCmps = INITIAL_COMPLAINTS.filter((c) => c.consumerNo === '04281-99231');

    const consumerRecords = buildAuthorizedOutageRecords({
      role: 'consumer',
      actor: { id: 'USR-CON-01', name: 'Rameshbhai Patel' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
      userConnections: consumerConn,
      userComplaints: consumerCmps,
    });
    assert.ok(consumerRecords.length >= 1, 'Consumer sees linked area outages / own outage complaint');
    assert.ok(
      consumerRecords.every(
        (r) => r.isConsumerOwnReport || r.subdivisionId === 'Mehsana City North',
      ),
      'Consumer does not see unverified complaints from unrelated subdivisions',
    );

    const employeeRecords = buildAuthorizedOutageRecords({
      role: 'employee',
      actor: { id: 'EMP-101', name: 'Snehaben Desai', subdivision: 'All' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
    });
    assert.ok(employeeRecords.length >= 3, 'Employee sees operational incidents & complaints');

    const fieldUnmatchedRecords = buildAuthorizedOutageRecords({
      role: 'field',
      actor: { id: 'FE-999', name: 'Unassigned Junior Tech', subdivision: 'Patan Urban Zone' },
      incidents: baseIncidents.filter((i) => !isConfirmedEmergencyHazard(i)),
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
    });
    assert.equal(
      fieldUnmatchedRecords.length,
      0,
      'Field engineer with zero assigned work orders or incidents sees 0 non-emergency outages',
    );

    const adminRecords = buildAuthorizedOutageRecords({
      role: 'admin',
      actor: { id: 'ADM-01', name: 'Vikramsinhjadeja' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
    });
    assert.ok(adminRecords.length >= employeeRecords.length, 'Admin has full operational map visibility');
  });

  // -------------------------------------------------------------------------
  // M.4: Consumer Privacy Protection
  // -------------------------------------------------------------------------
  await runSection('M.4 Consumer privacy protection strips exact GPS, residential addresses, phones, engineer IDs, and internal notes', () => {
    const consumerRecords = buildAuthorizedOutageRecords({
      role: 'consumer',
      actor: { id: 'USR-CON-01', name: 'Rameshbhai Patel' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
      userConnections: INITIAL_CONNECTIONS.slice(0, 1),
      userComplaints: INITIAL_COMPLAINTS.slice(0, 1),
    });

    for (const rec of consumerRecords) {
      assert.equal(rec.location, undefined, 'Exact operational GPS location must be undefined for consumer');
      assert.ok(rec.publicLocation, 'Coarse publicLocation area centroid is provided');
      assert.equal(rec.assignedTeam, undefined, 'Assigned team/engineer must be hidden from consumer');
      assert.equal(rec.assignedEngineerId, undefined, 'Engineer ID must be hidden from consumer');
      assert.equal(rec.severity, undefined, 'Internal severity classification hidden from consumer');
      assert.equal(rec.internalTitle, undefined, 'Internal incident title hidden from consumer');

      const serialized = JSON.stringify(rec);
      assert.equal(serialized.includes('98250'), false, 'Consumer phone number never leaked');
      assert.equal(serialized.includes('Rameshbhai'), false, 'Consumer personal name never leaked');
    }

    const consumerEvents = buildAuthorizedTimelineEvents(
      {
        role: 'consumer',
        incidents: baseIncidents,
        complaints: INITIAL_COMPLAINTS,
        workOrders: INITIAL_WORK_ORDERS,
        userConnections: INITIAL_CONNECTIONS.slice(0, 1),
        userComplaints: INITIAL_COMPLAINTS.slice(0, 1),
      },
      consumerRecords,
    );
    for (const ev of consumerEvents) {
      assert.equal(ev.note, undefined, 'Internal remarks/notes stripped from consumer timeline');
      assert.equal(ev.actorDisplayName, 'UGVCL Service Desk', 'Private staff actor names redacted');
    }
  });

  // -------------------------------------------------------------------------
  // M.5 & Scenarios 2–3: Employee-First Critical Incident Rule + Assignment + Escalation
  // -------------------------------------------------------------------------
  await runSection('M.5 Employee-first critical incident gating hides unassigned/un-escalated critical incidents from Field & Management until routed', () => {
    const freshCritical: CriticalIncident = {
      id: 'INC-P10-CRIT-01',
      title: '11kV Transformer Oil Temperature Critical — Visnagar Feeder',
      description: 'Substation telemetry threshold exceeded in DEMO simulation.',
      severity: 'CRITICAL',
      status: 'DETECTED',
      module: 'Distribution & SCADA',
      entityId: 'FDR-11-MSN-01',
      entityType: 'feeder',
      subdivision: 'Mehsana City North',
      timestamp: '2026-11-02T08:00:00Z',
      responsibleRoles: ['employee'],
      recommendedAction: 'Review feeder load and dispatch field patrol.',
      history: [
        {
          id: 'ev-p10-1',
          stage: 'DETECTED',
          eventType: 'DETECTED',
          timestamp: '2026-11-02T08:00:00Z',
          actor: 'Anomaly Engine (DEMO)',
          actorRole: 'employee',
          notes: 'Initial detection routed to employee desk.',
        },
      ],
    };

    // 1. Newly detected critical incident: visible to Employee, HIDDEN from Field & Management
    const empInitial = buildAuthorizedOutageRecords({
      role: 'employee',
      actor: { id: 'EMP-01', name: 'Snehaben Desai', subdivision: 'Mehsana City North' },
      incidents: [freshCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });
    const fieldInitial = buildAuthorizedOutageRecords({
      role: 'field',
      actor: { id: 'FE-101', name: 'Kiranbhai Parmar', subdivision: 'Mehsana City North' },
      incidents: [freshCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });
    const mgmtInitial = buildAuthorizedOutageRecords({
      role: 'management',
      actor: { id: 'MGR-01', name: 'Rajendrasinh Gohil', subdivision: 'All' },
      incidents: [freshCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });

    assert.equal(empInitial.length, 1, 'Employee receives newly created critical incident immediately');
    assert.equal(fieldInitial.length, 0, 'Field engineer MUST NOT see unassigned critical incident');
    assert.equal(mgmtInitial.length, 0, 'Management MUST NOT see un-escalated critical incident dossier');

    // 2. Employee assigns to Field Engineer Kiranbhai Parmar -> Field sees it, Management still does not
    const assignedCritical: CriticalIncident = {
      ...freshCritical,
      status: 'ASSIGNED',
      assignmentStatus: 'ASSIGNED',
      assignedToUserId: 'FE-101',
      assignedEngineerName: 'Kiranbhai Parmar',
      history: [
        ...freshCritical.history,
        {
          id: 'ev-p10-2',
          stage: 'ASSIGNED',
          eventType: 'ASSIGNED',
          timestamp: '2026-11-02T08:05:00Z',
          actor: 'Snehaben Desai',
          actorRole: 'employee',
          newEngineerName: 'Kiranbhai Parmar',
        },
      ],
    };

    const fieldAfterAssign = buildAuthorizedOutageRecords({
      role: 'field',
      actor: { id: 'FE-101', name: 'Kiranbhai Parmar', subdivision: 'Mehsana City North' },
      incidents: [assignedCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });
    const otherFieldAfterAssign = buildAuthorizedOutageRecords({
      role: 'field',
      actor: { id: 'FE-202', name: 'Maheshbhai Solanki', subdivision: 'Mehsana City North' },
      incidents: [assignedCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });
    const mgmtAfterAssign = buildAuthorizedOutageRecords({
      role: 'management',
      actor: { id: 'MGR-01', name: 'Rajendrasinh Gohil', subdivision: 'All' },
      incidents: [assignedCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });

    assert.equal(fieldAfterAssign.length, 1, 'Assigned field engineer now sees the outage on map');
    assert.equal(fieldAfterAssign[0].status, 'ASSIGNED');
    assert.equal(otherFieldAfterAssign.length, 0, 'Unassigned field engineer still cannot see it');
    assert.equal(mgmtAfterAssign.length, 0, 'Management still does not see un-escalated dossier');

    // 3. Employee escalates to Management -> Management now sees escalated critical outage + summary
    const escalatedCritical: CriticalIncident = {
      ...assignedCritical,
      status: 'ESCALATED',
      escalatedTo: 'management',
      history: [
        ...assignedCritical.history,
        {
          id: 'ev-p10-3',
          stage: 'ESCALATED',
          eventType: 'ESCALATED',
          timestamp: '2026-11-02T08:12:00Z',
          actor: 'Snehaben Desai',
          actorRole: 'employee',
          notes: 'Escalated for inter-feeder load transfer approval.',
        },
      ],
    };

    const mgmtAfterEscalation = buildAuthorizedOutageRecords({
      role: 'management',
      actor: { id: 'MGR-01', name: 'Rajendrasinh Gohil', subdivision: 'All' },
      incidents: [escalatedCritical],
      complaints: [],
      workOrders: [],
      feeders: FEEDER_METRICS,
    });
    assert.equal(mgmtAfterEscalation.length, 1, 'Management sees critical outage after employee escalation');

    const summary = computeManagementOutageSummary({
      role: 'management',
      actor: { id: 'MGR-01', name: 'Rajendrasinh Gohil' },
      incidents: [escalatedCritical],
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
    });
    assert.ok(summary && summary.escalatedCount >= 1, 'Management summary tracks escalated count');
  });

  // -------------------------------------------------------------------------
  // M.6: Map Marker Filtering, Clustering & Non-Destructive Search
  // -------------------------------------------------------------------------
  await runSection('M.6 Map marker filtering, search, and zoom clustering operate accurately without mutating source records', () => {
    const adminRecords = buildAuthorizedOutageRecords({
      role: 'admin',
      actor: { id: 'ADM-01', name: 'Admin' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
    });
    const snapshotBefore = JSON.stringify(adminRecords);

    const activeOnly = applyOutageFilters(adminRecords, { scopeMode: 'ACTIVE_ONLY' });
    const resolvedOnly = applyOutageFilters(adminRecords, { scopeMode: 'RESOLVED_ONLY' });
    assert.equal(
      activeOnly.length + resolvedOnly.length,
      adminRecords.length,
      'Active + Resolved partitions equal total records',
    );

    const bySearch = applyOutageFilters(adminRecords, { searchQuery: 'Kadi' });
    assert.ok(bySearch.length >= 1 && bySearch.every((r) => JSON.stringify(r).includes('Kadi')));

    const bySeverity = applyOutageFilters(adminRecords, { severity: 'CRITICAL' });
    assert.ok(bySeverity.every((r) => r.severity === 'CRITICAL'));

    // Verify clustering groups nearby markers at low zoom and expands at high zoom
    const lowZoomClusters = clusterOutageMarkers(adminRecords, 8);
    const highZoomClusters = clusterOutageMarkers(adminRecords, 14);
    assert.ok(lowZoomClusters.length <= highZoomClusters.length);
    assert.ok(computeBoundsForOutages(adminRecords) !== null);

    // Non-destructive proof
    assert.equal(JSON.stringify(adminRecords), snapshotBefore, 'Filtering never mutates source records');
  });

  // -------------------------------------------------------------------------
  // M.7: Timeline Chronological & Deterministic Secondary Ordering
  // -------------------------------------------------------------------------
  await runSection('M.7 Timeline events sort chronologically with deterministic stage-rank tie-breaking on identical timestamps', () => {
    const unordered: OperationsTimelineEvent[] = [
      {
        id: 'ev-assign',
        incidentId: 'INC-1',
        outageId: 'OUT-1',
        type: 'EMPLOYEE_ASSIGNMENT',
        occurredAt: '2026-11-02T09:00:00Z',
        actorDisplayName: 'Employee',
        visibility: 'employee',
        sourceSystem: 'DEMO_LOCAL_STATE',
        correlationId: 'corr-assign',
        descriptionKey: 'EMPLOYEE_ASSIGNMENT',
      },
      {
        id: 'ev-created',
        incidentId: 'INC-1',
        outageId: 'OUT-1',
        type: 'INCIDENT_CREATED',
        occurredAt: '2026-11-02T09:00:00Z',
        actorDisplayName: 'System',
        visibility: 'employee',
        sourceSystem: 'DEMO_LOCAL_STATE',
        correlationId: 'corr-created',
        descriptionKey: 'INCIDENT_CREATED',
      },
      {
        id: 'ev-complaint',
        incidentId: 'INC-1',
        outageId: 'OUT-1',
        type: 'COMPLAINT_SUBMITTED',
        occurredAt: '2026-11-02T08:55:00Z',
        actorDisplayName: 'Consumer',
        visibility: 'public',
        sourceSystem: 'DEMO_LOCAL_STATE',
        correlationId: 'corr-complaint',
        descriptionKey: 'COMPLAINT_SUBMITTED',
      },
      {
        id: 'ev-classified',
        incidentId: 'INC-1',
        outageId: 'OUT-1',
        type: 'INCIDENT_CLASSIFIED',
        occurredAt: '2026-11-02T09:00:00Z',
        actorDisplayName: 'Employee',
        visibility: 'employee',
        sourceSystem: 'DEMO_LOCAL_STATE',
        correlationId: 'corr-classified',
        descriptionKey: 'INCIDENT_CLASSIFIED',
      },
    ];

    const ordered = reconcileAndOrderTimelineEvents(unordered);
    assert.deepEqual(
      ordered.map((e) => e.type),
      [
        'COMPLAINT_SUBMITTED',
        'INCIDENT_CREATED',
        'INCIDENT_CLASSIFIED',
        'EMPLOYEE_ASSIGNMENT',
      ],
    );
  });

  // -------------------------------------------------------------------------
  // M.8: Timeline Event Deduplication (Idempotency)
  // -------------------------------------------------------------------------
  await runSection('M.8 Repeated event deliveries with identical correlationId deduplicate cleanly without duplicate entries', () => {
    const baseEvent: OperationsTimelineEvent = {
      id: 'ev-dup-1',
      incidentId: 'INC-99',
      outageId: 'OUT-99',
      type: 'REPAIR_STARTED',
      occurredAt: '2026-11-02T10:15:00Z',
      actorDisplayName: 'Kiranbhai Parmar',
      visibility: 'field',
      sourceSystem: 'DEMO_LOCAL_STATE',
      correlationId: 'uuid-idempotent-7788',
      descriptionKey: 'REPAIR_STARTED',
      versionSeq: 1,
    };

    const reconciled = reconcileAndOrderTimelineEvents([
      baseEvent,
      { ...baseEvent },
      { ...baseEvent, id: 'ev-dup-retry' },
    ]);
    assert.equal(reconciled.length, 1, 'Duplicate correlationId must collapse to a single event');
  });

  // -------------------------------------------------------------------------
  // M.9 & Scenario 4: Offline Field Update Retains occurredAt vs receivedAt
  // -------------------------------------------------------------------------
  await runSection('M.9 Offline field synchronization preserves original offline occurredAt separately from receivedAt without duplicates', () => {
    const offlineItemPending: OfflineFieldQueueItem = {
      client_uuid: 'offline-uuid-4401-a',
      target_kind: 'demo_workorder',
      request_id: 'WO-4401',
      title: 'Transformer jumper repair',
      task_status: 'COMPLETED',
      notes: 'Replaced damaged jumper on R-phase while offline.',
      meter_serial: 'UGV-MTR-4401',
      created_offline_at: '2026-11-02T07:30:00Z',
      actor_email: 'field@ugvcl.demo',
      sync_state: 'PENDING',
      attempts: 0,
    };

    const offlineItemSynced: OfflineFieldQueueItem = {
      ...offlineItemPending,
      sync_state: 'SYNCED',
      attempts: 1,
      last_attempt_at: '2026-11-02T08:45:00Z',
      synced_at: '2026-11-02T08:45:00Z',
    };

    const snap: CanonicalOutageDatasetSnapshot = {
      role: 'admin',
      actor: { id: 'ADM-01', name: 'Admin' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
      offlineQueue: [offlineItemPending, offlineItemSynced], // Simulate replay of same UUID
    };

    const visible = buildAuthorizedOutageRecords(snap);
    const events = buildAuthorizedTimelineEvents(snap, visible);
    const offlineEvents = events.filter((e) => e.correlationId === 'offline-uuid-4401-a');

    assert.equal(offlineEvents.length, 1, 'Offline item synced later appears once (idempotent)');
    assert.equal(offlineEvents[0].occurredAt, '2026-11-02T07:30:00Z', 'Retains offline occurrence timestamp');
    assert.equal(offlineEvents[0].receivedAt, '2026-11-02T08:45:00Z', 'Preserves later sync timestamp');
    assert.equal(offlineEvents[0].type, 'OFFLINE_UPDATE_SYNCHRONIZED');
  });

  // -------------------------------------------------------------------------
  // M.10: Out-of-Order / Stale Event Rejection
  // -------------------------------------------------------------------------
  await runSection('M.10 Stale lower-version outage and timeline updates never overwrite newer state', () => {
    const newerRecord: OutageMapRecord = {
      id: 'OUT-TEST-1',
      incidentId: 'INC-TEST-1',
      affectedAreaLabel: 'Mehsana City North',
      publicTitle: 'Confirmed Area Outage',
      status: 'WORK_IN_PROGRESS',
      isConfirmedOutage: true,
      reportedAt: '2026-11-02T08:00:00Z',
      updatedAt: '2026-11-02T09:30:00Z',
      source: 'demo',
      sourceLabel: 'DEMO',
      freshnessLabel: 'Live',
      isSimulated: true,
      versionSeq: 4,
    };

    const staleIncoming: OutageMapRecord = {
      ...newerRecord,
      status: 'REPORTED',
      updatedAt: '2026-11-02T08:01:00Z',
      versionSeq: 2,
    };

    const resolved = acceptNewerOutageRecord(newerRecord, staleIncoming);
    assert.equal(resolved.status, 'WORK_IN_PROGRESS', 'Newer status preserved against stale v2 payload');
    assert.equal(resolved.versionSeq, 4);
  });

  // -------------------------------------------------------------------------
  // M.11: Bidirectional Map <-> Timeline Selection Synchronization
  // -------------------------------------------------------------------------
  await runSection('M.11 Map-timeline synchronization focuses events for selected outage and highlights outage from timeline click', async () => {
    const adapter = new DemoOutageMapAdapter(() => ({
      role: 'employee',
      actor: { id: 'EMP-01', name: 'Snehaben Desai', subdivision: 'All' },
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
      feeders: FEEDER_METRICS,
    }));

    const visible = await adapter.listVisibleOutages();
    assert.ok(visible.length > 0);
    const target = visible[0];

    const focusedEvents = await adapter.listVisibleEvents(target.id);
    assert.ok(
      focusedEvents.every((ev) => ev.outageId === target.id),
      'Selecting an outage on map filters timeline strictly to that outage',
    );

    const workspaceSrc = readSrc('src/components/outageMap/SmartOutageMapWorkspace.tsx');
    assert.ok(
      workspaceSrc.includes('setFocusedTimelineOutageId(outageId)') &&
        workspaceSrc.includes('onSelectOutageFromEvent={handleSelectFromTimeline}'),
      'Workspace wires bidirectional map <-> timeline selection handlers',
    );
  });

  // -------------------------------------------------------------------------
  // M.12 & Scenario 6: Empty, Loading, and Map-Tile Failure Fallback States
  // -------------------------------------------------------------------------
  await runSection('M.12 Empty, loading, and tile-failure schematic fallback states degrade gracefully with zero PII in tile URLs', () => {
    const mapPanelSrc = readSrc('src/components/outageMap/SmartOutageMapPanel.tsx');
    const workspaceSrc = readSrc('src/components/outageMap/SmartOutageMapWorkspace.tsx');

    assert.ok(
      mapPanelSrc.includes('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      'Uses static OpenStreetMap tile URL template with zero session tokens or consumer PII',
    );
    assert.ok(
      mapPanelSrc.includes("tileLayer.on('tileerror'") &&
        mapPanelSrc.includes('data-testid="schematic-map-fallback"') &&
        mapPanelSrc.includes('data-testid="map-tile-fallback-banner"'),
      'Implements automatic tileerror detection and interactive schematic map fallback',
    );
    assert.ok(
      workspaceSrc.includes('data-testid="outage-empty-state"') &&
        workspaceSrc.includes('data-testid="accessible-outage-list-view"'),
      'Implements empty state and accessible incident list fallback',
    );
  });

  // -------------------------------------------------------------------------
  // M.13: Multilingual Rendering Across en, gu, hi, mr
  // -------------------------------------------------------------------------
  await runSection('M.13 Complete 4-language parity (en, gu, hi, mr) for map statuses, severities, timeline events, and nav labels', () => {
    const enKeys = Object.keys(OUTAGE_MAP_TRANSLATIONS.en).sort();
    const nonEnLangs: LanguageCode[] = ['gu', 'hi', 'mr'];

    for (const lang of SUPPORTED_LANGUAGES.map((l) => l.code)) {
      const dict = OUTAGE_MAP_TRANSLATIONS[lang];
      assert.deepEqual(Object.keys(dict).sort(), enKeys, `Key parity in ${lang}`);
      assert.ok(translations[lang].erp.navOutageMap.length > 0);
      assert.ok(translations[lang].erp.navConsumerOutageStatus.length > 0);
      assert.ok(formatConfidenceLabel('confirmed', lang).length > 0);
      assert.ok(formatConfidenceLabel('provisional', lang).length > 0);
    }

    for (const lang of nonEnLangs) {
      assert.notEqual(
        OUTAGE_MAP_TRANSLATIONS[lang].moduleHeading,
        OUTAGE_MAP_TRANSLATIONS.en.moduleHeading,
        `${lang} moduleHeading uses native script`,
      );
      const renderedDesc = formatTimelineEventDescription(
        {
          incidentId: 'INC-CMP-8819',
          descriptionKey: 'OUTAGE_CONFIRMED',
          descriptionParams: { ref: 'INC-CMP-8819', area: 'Gandhinagar Sub-Division 2' },
        },
        lang,
      );
      assert.notEqual(
        renderedDesc,
        formatTimelineEventDescription(
          {
            incidentId: 'INC-CMP-8819',
            descriptionKey: 'OUTAGE_CONFIRMED',
            descriptionParams: { ref: 'INC-CMP-8819', area: 'Gandhinagar Sub-Division 2' },
          },
          'en',
        ),
        `${lang} timeline event description localized`,
      );
    }
  });

  // -------------------------------------------------------------------------
  // M.14: Canonical DEMO Data & UGVCL Branding Preservation
  // -------------------------------------------------------------------------
  await runSection('M.14 Canonical DEMO datasets and official UGVCL logo path remain 100% unmodified', () => {
    assert.equal(JSON.stringify(INITIAL_COMPLAINTS), baselineComplaintsJson);
    assert.equal(JSON.stringify(INITIAL_WORK_ORDERS), baselineWorkOrdersJson);
    assert.equal(JSON.stringify(FEEDER_METRICS), baselineFeedersJson);
    assert.equal(JSON.stringify(INITIAL_CONNECTIONS), baselineConnectionsJson);
    assert.equal(UGVCL_LOGO_PATH, baselineLogo);
  });

  // -------------------------------------------------------------------------
  // M.15: Reactive Subscription Cleanup (No Listener Leaks)
  // -------------------------------------------------------------------------
  await runSection('M.15 DemoOutageMapAdapter and BackendOutageMapAdapter clean up subscriptions deterministically on unmount', () => {
    const demoAdapter = new DemoOutageMapAdapter(() => ({
      role: 'employee',
      incidents: baseIncidents,
      complaints: INITIAL_COMPLAINTS,
      workOrders: INITIAL_WORK_ORDERS,
    }));

    assert.equal(demoAdapter.subscriberCount, 0);
    let receivedCount = 0;
    const unsub1 = demoAdapter.subscribeToChanges(() => {
      receivedCount += 1;
    });
    const unsub2 = demoAdapter.subscribeToChanges(() => {
      receivedCount += 1;
    });
    assert.equal(demoAdapter.subscriberCount, 2);

    demoAdapter.notifyChange({ reason: 'STATE_UPDATED', timestamp: '2026-11-02T10:00:00Z' });
    assert.equal(receivedCount, 2);

    unsub1();
    assert.equal(demoAdapter.subscriberCount, 1);
    unsub2();
    assert.equal(demoAdapter.subscriberCount, 0);

    demoAdapter.notifyChange({ reason: 'STATE_UPDATED', timestamp: '2026-11-02T10:01:00Z' });
    assert.equal(receivedCount, 2, 'Zero callbacks invoked after unsubscribe()');

    const backendAdapter = new BackendOutageMapAdapter('/api/v1/outages');
    const unsubBackend = backendAdapter.subscribeToChanges(() => {});
    assert.equal(backendAdapter.subscriberCount, 1);
    unsubBackend();
    assert.equal(backendAdapter.subscriberCount, 0);
  });

  // -------------------------------------------------------------------------
  // M.16: Accessibility Basics (Non-Color-Only Glyphs, ARIA, Keyboard List View)
  // -------------------------------------------------------------------------
  await runSection('M.16 Accessibility semantics include non-color-only glyphs, ARIA tablist/pressed states, and list alternative', () => {
    const mapPanelSrc = readSrc('src/components/outageMap/SmartOutageMapPanel.tsx');
    const timelineSrc = readSrc('src/components/outageMap/OperationsTimelinePanel.tsx');
    const workspaceSrc = readSrc('src/components/outageMap/SmartOutageMapWorkspace.tsx');

    for (const glyph of ['▲', '◆', '●', '?', '✓']) {
      assert.ok(mapPanelSrc.includes(glyph), `Non-color-only marker glyph ${glyph} present`);
    }
    assert.ok(mapPanelSrc.includes('aria-pressed={isSelected}'));
    assert.ok(timelineSrc.includes('aria-pressed={isHighlighted}'));
    assert.ok(workspaceSrc.includes('role="tablist"') && workspaceSrc.includes('role="tab"'));
    assert.ok(workspaceSrc.includes('<table') && workspaceSrc.includes('scope="col"'));
  });

  // -------------------------------------------------------------------------
  // M.17: XSS / Malformed Text Sanitization Safety
  // -------------------------------------------------------------------------
  await runSection('M.17 XSS payloads and HTML tags in titles, area labels, and remarks are stripped safely', () => {
    const payload = `<script>alert("xss")</script><img src=x onerror="steal()"/>Mehsana\u0000 Feeder`;
    const cleaned = sanitizeMapText(payload);
    assert.equal(cleaned.includes('<script'), false);
    assert.equal(cleaned.includes('<img'), false);
    assert.equal(cleaned.includes('\u0000'), false);
    assert.equal(cleaned, 'alert("xss")Mehsana Feeder');
  });

  // -------------------------------------------------------------------------
  // M.18: Production Build Safety & Lazy Portal Code-Splitting
  // -------------------------------------------------------------------------
  await runSection('M.18 Production build emits lazy SmartOutageMapWorkspace chunk across all 5 portals while keeping index bundle < 390 kB', () => {
    for (const portalRel of [
      'src/components/consumer/ConsumerPortal.tsx',
      'src/components/employee/EmployeePortal.tsx',
      'src/components/field/FieldPortal.tsx',
      'src/components/management/ManagementPortal.tsx',
      'src/components/admin/AdminPortal.tsx',
    ]) {
      const src = readSrc(portalRel);
      assert.ok(
        src.includes("activeTab === 'outage-map'") && src.includes('<LazyOutageMapSection />'),
        `${portalRel} mounts lazy Phase 10 outage map section`,
      );
    }

    const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir);
      const lazyChunk = files.find(
        (f) => f.startsWith('SmartOutageMapWorkspace-') && f.endsWith('.js'),
      );
      assert.ok(lazyChunk, 'SmartOutageMapWorkspace lazy JS chunk exists in dist/assets');

      const indexChunk = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
      assert.ok(indexChunk, 'Main index JS chunk exists in dist/assets');
      const indexBytes = fs.statSync(path.join(distAssetsDir, indexChunk)).size;
      assert.ok(
        indexBytes < 390 * 1024,
        `Main index chunk (${(indexBytes / 1024).toFixed(2)} kB) stays below 390 kB budget`,
      );
    }
  });

  console.log(`\n======================================================================`);
  console.log(`  ALL ${passed}/18 PHASE 10 AUTOMATED TEST SECTIONS PASSED!`);
  console.log(`======================================================================`);
}

main().catch((err) => {
  console.error('Phase 10 test suite failed:', err);
  process.exit(1);
});
