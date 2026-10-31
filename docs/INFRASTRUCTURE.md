# IT Infrastructure, Edge Hardware, Network & DR Reference Architecture (`PS000125`)

> **Addresses Official `PS000125` Mandate:** *"Future-Ready, Secure and Intelligent IT Infrastructure & User-Friendly ERP/Portal Ecosystem"* for **Uttar Gujarat Vij Company Limited (UGVCL)** across Corporate HQ (Mehsana), 4 Circle Offices (`Mehsana`, `Sabarkantha/Himatnagar`, `Palanpur`, `Visnagar`), 27 Divisions, 100+ Subdivisions, and rural 66/11kV substations.
>
> For itemized 3-tier CAPEX/OPEX costing (`₹14.80 Lakh` Subdivision Pilot · `₹1.18 Crore` Circle HA · `₹7.45 Crore` Full DISCOM), see [`docs/INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md).

---

## 1. End-to-End Reference Topology (Edge → Regional Hub → MeitY Cloud + Hot-Standby DR)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: FIELD & SUBSTATION EDGE (Rural North Gujarat Dead-Zone Resilient)              │
│  • Substation Edge Concentrator (×500 units): Industrial Raspberry Pi 4 / CM4 (8 GB RAM,│
│    64 GB industrial eMMC) + Quectel EC200U-CN Dual-SIM 4G LTE Cat-4 Modem + RS-485      │
│    DLMS/Modbus bridge (~₹8,000/unit = ₹40.00 Lakh) — local store-and-forward buffer     │
│  • Field Lineman / Junior Engineer Handhelds: Rugged IP65 Android 14 + Dual-SIM 4G VoLTE│
│    running VidyutFlow Offline IndexedDB Queue (idempotent `client_uuid` sync)           │
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │ Primary: BSNL / GFGNL MPLS L3VPN (Subdivisions)
                                           │ Backup : SD-WAN Dual-Carrier 4G/5G + WireGuard IPsec
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: REGIONAL CIRCLE AGGREGATION HUBS (Mehsana · Himatnagar · Palanpur · Visnagar)  │
│  • Dual Fortinet / Sophos SD-WAN Next-Gen Firewalls (Active-Passive HA, <2s switchover) │
│  • Local Subdivision Read-Cache & Print/CSC Kiosk Gateway (survives WAN fiber cuts)     │
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │ Dual 1 Gbps MPLS / TLS 1.3 mTLS Backhaul
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: PRIMARY MEITY-EMPANELED CLOUD / GSDC GANDHINAGAR (Active-Active 3-Tier)        │
│  • [VLAN 10 — Citizen DMZ] WAF + DDoS Shield + NGINX TLS 1.3 Load Balancer              │
│  • [VLAN 20 — App & ERP Gateway Tier] Auto-Scaled FastAPI + Node Workers (HPA 3→16 pods)│
│    + Non-Invasive API Gateway Fan-Out -> SAP S/4HANA FI-CA/IS-U · e-Urja CIS · 1912 CRM │
│  • [VLAN 30 — Private Data & Vault Tier] PostgreSQL 16 Primary + Synchronous Replica    │
│    (NVMe RAID-10), PgBouncer, Redis Cluster, AES-256-GCM KYC Vault & WORM Audit Store   │
│  • [VLAN 40 — Security & SOC Tier] Wazuh/ArcSight SIEM ingesting `/v1/system/siem-events`│
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │ Asynchronous WAL Streaming + Checksummed Snapshots
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: SECONDARY DISASTER RECOVERY SITE (Isolated Geographic Zone — Hot Standby)      │
│  • Hot-Standby PostgreSQL 16 Replica + Replicated S3 Object Vault (`offsite_replicate`) │
│  • Production SLA: RPO ≤ 15 minutes · RTO ≤ 60 minutes                                  │
│  • Live Repo Failover Drill (`POST /v1/system/dr-failover-drill`): 0 loss, <1s promotion│
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Specific Hardware, Modem, Server & Storage Bill of Specifications

| Infrastructure Layer | Hardware / Component Specification | Unit Sizing & Redundancy | Role in UGVCL Operations |
| :--- | :--- | :--- | :--- |
| **Substation / Feeder Edge Concentrator** | **Raspberry Pi 4B / CM4 Industrial (8 GB LPDDR4, 64 GB eMMC, DIN-rail metal enclosure, UPS hat)** + **Quectel EC200U-CN Dual-SIM 4G LTE Cat-4 Modem** + **Isolated RS-485 / Optical DLMS port** | **500 units × ~₹8,000 = ₹40.00 Lakh** across 66/11kV substations & rural subdivisions | Buffers DTR kVA telemetry, feeder outage pings, and local field-engineer sync packets when rural cellular backhaul drops; forwards via MQTT/HTTPS over WireGuard on reconnect. |
| **Field Engineer Edge Device** | **IP65 Rugged Android 14 Handheld** (Octa-core, 6 GB RAM, 128 GB, 6000 mAh hot-swap battery, Dual-SIM 4G/5G, L1/L5 GPS, 13 MP camera) | 1 per Subdivision Field JE / Line Inspector | Runs `FieldPortal` PWA with Service Worker + IndexedDB offline queue (`offlineQueue.ts`) and `client_uuid` deduplication (`POST /v1/requests/field-sync`). |
| **Subdivision & Substation WAN** | **Managed SD-WAN CPE Router** with Primary **BSNL/GFGNL MPLS** (`50–100 Mbps`) + Secondary **Dual-Operator 4G/5G LTE Modem** (Jio + Airtel/BSNL SIM diversity) | Active-Active SLA path selection (`<2s` failover on packet loss `>3%`) | Eliminates single-ISP downtime during monsoon line faults when outage/hazard ticket volume spikes. |
| **Application & API Gateway Compute** | **2× (Circle) to 6× (DISCOM) 1U Rack / Cloud Nodes**: 16 vCPU (AMD EPYC / Xeon Silver), 64 GB DDR5 ECC RAM, Dual 10 GbE NIC | Kubernetes / Docker Swarm HPA (`min=3`, `max=16` replicas; scale out at `65%` CPU or `p95 > 250 ms`) | Serves 5 portals, 5 `scikit-learn` inference pipelines, and non-invasive ERP API Gateway fan-out without blocking citizen traffic. |
| **Primary Transactional Storage** | **Dedicated DB Pair**: 32 vCPU, 128 GB ECC RAM, **2× 3.84 TB Enterprise NVMe SSD in RAID-10 (`>150,000 IOPS`)** running PostgreSQL 16 + PgBouncer | Primary + Synchronous Local Hot Standby (`Patroni` / `repmgr`) | Stores canonical `ConnectionRequest`, `ErpSyncLog`, and serialized `AuditChainHead` hash-chained ledger with zero single-disk SPOF. |
| **Encrypted KYC Vault & Backup Storage** | **MeitY-Empaneled Object Storage / Ceph Cluster** (`20 TB` usable, erasure-coded) + **Immutable WORM bucket lock** | SHA-256 verified via `offsite_replicate.sh` (`BACKUP_RETENTION_COUNT=14` daily + 12 monthly) | Stores `VFENC1` AES-256-GCM encrypted citizen KYC documents (`uploads.py`) and tamper-proof DR snapshots. |

---

## 3. Scalability & Load Engineering

1. **Stateless Horizontal App Scaling**: FastAPI workers hold zero sticky session state (`HttpOnly` signed tokens + DB/Redis state); `uvicorn --workers N` scales linearly behind NGINX/ALB.
2. **Database Read/Write Separation & Indexing**: Composite indexes on `(zone, status, created_at)`, `(assigned_engineer_id, status)`, and `AuditLog(chain_seq)` verified live via `GET /v1/system/performance`, paired with epoch-invalidated `kpi_cache` so dashboard polling never hammers transactional tables.
3. **Offline Edge Absorption**: During cyclone/monsoon surges, rural field updates buffer locally in IndexedDB / Raspberry Pi edge queues and drain idempotently via `client_uuid` without lost inspections or duplicate meter postings.

---

## 4. Disaster Recovery (RPO / RTO) & Live Failover Demonstration

| Metric | Subdivision Pilot | Circle / DISCOM Production | Live Repo Demonstration (`dr_failover_drill.py` & `POST /v1/system/dr-failover-drill`) |
| :--- | :--- | :--- | :--- |
| **RPO (Data Loss Bound)** | `≤ 60 min` (hourly vault cron) | **`≤ 15 min`** (continuous WAL streaming) | **`0 records lost`** (verified post-promotion row & audit count match) |
| **RTO (Recovery Time)** | `≤ 120 min` | **`≤ 60 min`** (automated Patroni failover) | **`< 1 second` (`< 60s` live demo SLA)** |
| **Integrity Proof** | `.sha256` sidecar check | Block + WAL CRC + SHA-256 | `sha256sum -c` + `PRAGMA integrity_check = ok` + 1-byte tamper rejection (`restore_drill.sh`) |
