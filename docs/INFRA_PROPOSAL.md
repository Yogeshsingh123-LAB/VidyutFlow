# Infrastructure Modernisation — Proposal (Not Delivered)

> **Nothing in this document is built, provisioned, or tested. It is a design proposal accompanying a software prototype.**

---

## Proposed (design only)

To address the physical, network, edge, and high-availability expectations referenced in `PS000125` (*"Future-Ready, Secure and Intelligent IT Infrastructure"*), the accompanying architecture documents ([`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md), [`docs/INFRASTRUCTURE_BOM_SOURCES.md`](INFRASTRUCTURE_BOM_SOURCES.md), and [`docs/INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md)) propose — **on paper only** — a 3-tier UGVCL deployment blueprint:

1. **Substation Edge & Field Mobility Layer (Proposed, Not Built):**
   - `500×` DIN-rail industrial `Raspberry Pi 4` (`BRD-RPi4`) + `Quectel EC200U-CN` Dual-SIM 4G LTE concentrators + RS-485 DLMS/COSEM isolation bridges (`₹8,000/unit = ₹40.00 Lakh` indicative BOM) for 66/11kV substations.
   - Ruggedized IP65 Android handhelds with MDM device-certificate enrollment for field engineers.
2. **Subdivision / Circle WAN & Zero-Trust Network Layer (Proposed, Not Built):**
   - Primary BSNL / GFGNL BharatNet MPLS L3VPN links paired with `Fortinet FortiGate 60F` SD-WAN appliances for dual-ISP / LTE failover.
   - 4-VLAN network segmentation (`VLAN 10` Citizen DMZ/WAF, `VLAN 20` App/Gateway, `VLAN 30` DB & Vault, `VLAN 40` Substation OT/Edge) with mutual TLS (`mTLS`).
3. **Core Compute, Storage, HSM & Geo-Redundant DR Layer (Proposed, Not Built):**
   - `Dell EMC PowerEdge R650xs` 1U rack nodes (or MeitY-empaneled cloud equivalents) running active-standby `PostgreSQL 16` streaming replication (`Patroni` + `PgBouncer`), `Redis 7` clusters, NVMe RAID-10 storage, and FIPS 140-3 HSM key wrapping.
   - Cross-circle / cross-region warm standby targeting `15-minute RPO` and `<60-minute RTO` across three indicative budget tiers (`₹14.80 Lakh` 1-Subdivision Pilot · `₹1.18 Crore` 1-Circle HA · `₹7.45 Crore` Full UGVCL DISCOM).

---

## Delivered by VidyutFlow prototype

**Nothing in the physical, edge, WAN/SD-WAN, VLAN, HSM, or multi-node HA list above is delivered by this repository.**

Specifically, what exists in the repository today is strictly local software configuration and single-host scripts:

- **Container configuration (`docker-compose.yml`):** Local single-host service definitions for FastAPI (`backend`), Node/Vite (`frontend`), `postgres:16-alpine`, and `redis:7-alpine` — configured for developer/demo startup, not load-tested or deployed on multi-node cluster hardware.
- **Local SQLite backup & restore scripts (`backend/scripts/`):** `backup.sh`, `offsite_replicate.sh` (copies `.sqlite3` snapshot between two local directories with a SHA-256 manifest), `restore_drill.sh` (verifies 1-byte tamper rejection), and `cold_start_dr_proof.py` / `POST /v1/system/dr-failover-drill` (wipes and restores a local SQLite file on the same machine).
- **Zero provisioned infrastructure:** Zero Raspberry Pi edge units, zero RS-485/DLMS meter polling code, zero SD-WAN/MPLS routers, zero firewall/VLAN rules, zero Kubernetes manifests or Terraform modules, zero HSM integration, and zero geo-redundant PostgreSQL failover.
