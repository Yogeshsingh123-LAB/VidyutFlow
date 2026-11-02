# Phase 10 Integration Guide: Smart Outage Map & Live Utility Operations Timeline

## 1. Architectural Overview

Phase 10 adds two synchronized, role-aware operational visibility modules across all five VidyutFlow portals (`Consumer`, `Employee`, `Field Engineer`, `Management`, and `Admin`) without duplicating or mutating VidyutFlow's canonical incident, complaint, work-order, notification, or offline-queue stores:

1. **Module 1 — Smart Outage Map (`SmartOutageMapPanel.tsx`):**
   - Built with `leaflet` (`1.9.x`, BSD-2-Clause) lazy-loaded behind `LazyOutageMapSection.tsx` so the initial portal entry bundle (`dist/assets/index-*.js`) stays at ~`225 kB` (`< 390 kB` budget).
   - Validates all coordinates (`isValidGeoPoint`) and GeoJSON service-area rings (`validateGeoJsonPolygon`) prior to rendering.
   - Groups nearby outages deterministically at zoomed-out levels (`clusterOutageMarkers`) and expands individual markers with **non-color-only glyphs** (`▲` Critical, `◆` High, `●` Confirmed, `?` Unverified, `✓` Resolved).
   - Automatically detects offline browsers or external tile load errors (`tileerror`) and switches to an **Interactive Schematic Coordinate Grid Fallback** alongside an **Accessible Incident List Table** (`accessible-outage-list-view`).
2. **Module 2 — Live Utility Operations Timeline (`OperationsTimelinePanel.tsx`):**
   - Renders real chronological lifecycle events (`COMPLAINT_SUBMITTED` through `INCIDENT_CLOSED`) with deterministic stage-rank tie-breaking (`reconcileAndOrderTimelineEvents`), `correlationId` deduplication, and distinct `Occurred` (`occurredAt`) vs. `Synced` (`receivedAt`) timestamps for offline field updates.
   - Bidirectionally synchronized with the map: selecting a map pin focuses the timeline on that outage, and clicking any timeline event selects and pans to the corresponding map pin.
   - Displays honest transport badges (`DEMO Reactive Mode`, `Backend Live Connected`, `Reconnecting…`, `Offline Mode`) — never faking live SCADA telemetry.

---

## 2. Portal Entry Points & Role Matrix

In every portal's desktop `Sidebar` and mobile `MobileNav` strip, select:
- **Consumer Portal:** `Area Outage Status` (`activeTab === 'outage-map'`) — public-safe coarse area locations, confirmed vs. unverified badges, credible/provisional ETR labels, zero residential GPS/phones/internal notes, and deep-link to the consumer's own linked complaint drawer.
- **Employee Portal:** `Outage Map & Timeline` (`activeTab === 'outage-map'`) — full subdivision-scoped operational map including newly detected **Employee-first** critical incidents, severity/team filters, and one-click deep-link into the canonical `IncidentActionModal`.
- **Field Engineer Portal:** `Outage Map & Timeline` (`activeTab === 'outage-map'`) — strictly scoped to assigned outages/work orders (plus confirmed immediate life-safety hazards), integrated with `offlineFieldSync.ts` queue events.
- **Management Portal:** `Outage Map & Timeline` (`activeTab === 'outage-map'`) — aggregate restoration KPI strip (`Active`, `Confirmed`, `Escalated`, `Resolved`) plus escalated critical outage dossiers only.
- **Admin Portal:** `Outage Map & Timeline` (`activeTab === 'outage-map'`) — cross-subdivision operational visibility and transport supervision with citizen personal phone/address PII omitted from map views.

---

## 3. End-to-End Verification Walkthrough (Scenarios 1 – 6)

1. **Scenario 1 — Consumer Outage Report to Public Safe View:** Sign in as Consumer -> submit a `Power Outage` complaint or open `Area Outage Status` -> observe unverified/confirmed area status at the coarse subdivision centroid with consumer privacy notice and zero leaked residential GPS, phone numbers, or internal notes.
2. **Scenario 2 — Employee-First Critical Incident Gating:** Sign in as Employee -> trigger or inspect an unassigned `CRITICAL` incident -> verify it appears on Employee's Outage Map & Timeline, while signing in as Field Engineer or Management confirms it remains hidden until assigned or escalated.
3. **Scenario 3 — Escalation to Management:** As Employee, escalate a critical incident to Management -> switch to Management `Outage Map & Timeline` -> verify `Escalated to Management` count increments and the outage marker + escalation timeline event become visible.
4. **Scenario 4 — Offline Field Engineer Update & Idempotent Sync:** Toggle offline mode in Field Portal -> enqueue a field work-order completion -> open `Outage Map & Timeline` to see `Offline Mode` badge and local queued event -> reconnect/sync -> verify `OFFLINE_UPDATE_SYNCHRONIZED` retains both `Occurred` and `Synced` timestamps with zero duplicate entries.
5. **Scenario 5 — Restoration Confirmation & Closure:** Complete/resolve an incident -> verify status transitions to `Resolved / Closed` (`✓`), active-only filter excludes it cleanly while `Resolved / Closed` scope retains full audit history.
6. **Scenario 6 — Map Tile Failure / Offline Schematic Fallback:** Click `Test Tile-Outage Fallback` (or go offline) -> verify external tile canvas cleanly switches to the interactive SVG schematic grid + accessible incident list without crashing or hiding timeline details.

---

## 4. Map Provider Licensing, Attribution & Privacy Notes

- **Library:** `leaflet@^1.9.4` (BSD-2-Clause open-source license; zero proprietary API keys required).
- **Tile Attribution:** Displays `Map data © OpenStreetMap contributors · Simulated utility overlay` in the map footer in accordance with OpenStreetMap tile attribution requirements.
- **Zero External PII Leakage:** Tile requests use only static slippy-map `{z}/{x}/{y}` coordinates (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). No session cookies, JWTs, consumer numbers, names, or query parameters are ever transmitted to external tile hosts. For high-traffic production deployments, UGVCL should point the tile URL to a self-hosted vector/raster tile proxy inside the utility DMZ.

---

## 5. Honest Limitations & Explicit Out-of-Scope Boundaries

- **Simulated DEMO Geometry:** All feeder polygons (`SIMULATED_FEEDER_POLYGONS`) and subdivision centroids (`SUBDIVISION_DEMO_CENTROIDS`) are synthetic illustrative North Gujarat coordinates marked `isSimulated: true`. They do **not** represent official UGVCL GIS feeder routing or live SCADA telemetry.
- **No Guessed Consumer Counts:** Outage cards never fabricate affected household counts from arbitrary map radii.
- **Out-of-Scope Preserved:** Phase 10 does not alter billing, receipts, QR/barcode generation, PDF exports, Phase 9 analytics, OCR meter reading, or automated feeder switching hardware controls.
