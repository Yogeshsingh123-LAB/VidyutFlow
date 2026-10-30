# Costed 3-Tier Infrastructure & Modernisation Proposal — PS000125 (Points 6 & 8)

> **Scope & Honesty Disclosure:** PS000125 Outcome 8 calls for modernised PCs, servers, storage, backup, and scalable hybrid/cloud infrastructure. Physical hardware procurement cannot be "built" inside a software repository; instead, this document provides an actionable **Small / Medium / Large costed deployment architecture** sized for UGVCL's IT cell (`hmtcotech2@ugvcl.com`).
>
> All INR (`₹`) figures below are **indicative FY 2026–27 budgetary planning estimates** benchmarked against Government e-Marketplace (GeM) enterprise hardware listings and MeitY-empanelled / Gujarat State Data Centre (GSDC) cloud tariffs (excluding 18% GST and civil electrical works). Exact quantities must be reconciled against UGVCL's existing asset register prior to tender.

---

## Summary Comparison Across Tiers

| Dimension | Tier 0 — Prototype (In Repo Today) | Tier 1 — Small (Single Subdivision Pilot) | Tier 2 — Medium (1 Circle / 12–15 Subdivisions) | Tier 3 — Large (Full UGVCL — 4 Circles, 100+ Subdivisions) |
| :--- | :--- | :--- | :--- | :--- |
| **Target Users** | Demo / Evaluation (all 5 roles) | ~20–25 staff + ~35,000 consumers | ~200–250 staff + ~5 lakh consumers | ~1,500+ staff + 38+ lakh consumers |
| **Hosting Topology** | Single VM / Docker Compose (`make up`) | 1 On-Prem / GSDC VM + Offsite Object Backup | HA 2-Node App Cluster + Managed PG Primary/Replica | Multi-AZ Sovereign Cloud + On-Prem Edge DMZ Gateway |
| **RPO / RTO Target** | Nightly dump (`backup.sh`) | **RPO ≤ 6 h · RTO ≤ 4 h** | **RPO ≤ 1 h · RTO ≤ 2 h** | **RPO ≤ 15 min · RTO ≤ 30 min** |
| **Indicative CAPEX** | **₹0** (runs on existing laptop/VM) | **₹14.80 Lakh** | **₹1.18 Crore** | **₹7.45 Crore** |
| **Indicative Annual OPEX** | **₹0** | **₹3.60 Lakh / yr** | **₹28.50 Lakh / yr** | **₹1.86 Crore / yr** |
| **3-Year Indicative TCO** | **₹0** | **₹25.60 Lakh** | **₹2.035 Crore** | **₹13.03 Crore** |

---

## Tier 0 — Today in Repository (Zero-Cost Functional Baseline)

- **Stack:** Containerised `PostgreSQL 16` + `FastAPI v1` + `React 19 PWA` via `docker-compose.yml`.
- **Storage & Backup:** Checksummed `pg_dump` / SQLite backup & tamper-verified restore drill (`backend/scripts/backup.sh`, `restore.sh`, `restore_drill.sh`).
- **Offline Capability:** Browser Service Worker (`/sw.js`) + IndexedDB UUID queue (`offlineFieldSync.ts`) works on existing Android phones without Play Store MDM.

---

## Tier 1 — Small: Single Subdivision Pilot (1 Subdivision · ~25 Staff)

Designed for a 3-to-6-month live pilot in one UGVCL subdivision (e.g., Mehsana City North) to measure baseline-vs-pilot turnaround times and train staff before circle rollout.

| Component | Specification | Qty | Unit Rate (₹) | Total (₹) | Type |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **Subdivision App/DB Server** | 1U Rack / Tower Server: 8-Core Xeon/EPYC, 32 GB ECC RAM, 2×1.92 TB Enterprise NVMe (RAID-1), Dual PSU | 1 | 2,60,000 | 2,60,000 | CAPEX |
| **Modern Office Desktops** | Business PC (Core i5 / Ryzen 5, 16 GB DDR5, 512 GB NVMe SSD, 21.5" IPS Monitor, 650 VA Line-Interactive UPS) | 10 | 58,000 | 5,80,000 | CAPEX |
| **High-Speed Document Scanners** | Duplex ADF Scanner (40 ppm) for legacy paper deed / KYC digitisation at consumer desk | 2 | 35,000 | 70,000 | CAPEX |
| **Field Engineer Mobile Kits** | Ruggedised IP65 Android 14 Tablet/Handset (8 GB RAM, 128 GB, Dual-SIM 5G/4G, L1+L5 GPS, 7000 mAh) | 8 | 32,500 | 2,60,000 | CAPEX |
| **Network, Firewall & Power** | Next-Gen UTM Firewall/VPN Appliance + Dual-ISP 4G/Broadband Auto-Failover Router + 3 kVA Online UPS (1 hr backup) | 1 lot | 3,10,000 | 3,10,000 | CAPEX |
| **Tier 1 Subtotal CAPEX** | | | | **₹14,80,000** | **₹14.80 L** |
| **Offsite Encrypted Backup & Cloud Relay** | MeitY-empanelled Object Storage (2 TB immutable S3 lock) + SMS/Email DLT Gateway + TLS Certificates | Annual | — | 1,40,000 | OPEX/yr |
| **Connectivity & AMC** | Dual broadband + 8× M2M Field Data SIMs + Hardware/OS Annual Maintenance (AMC) | Annual | — | 2,20,000 | OPEX/yr |
| **Tier 1 Annual OPEX** | | | | **₹3,60,000 / yr** | **₹3.60 L/yr** |

---

## Tier 2 — Medium: Circle-Wide Deployment (12–15 Subdivisions · ~220 Staff)

Consolidates compute into Circle HQ / GSDC private cloud with High Availability (HA), eliminating single-server failure points while refreshing slow office PCs and field devices across all subdivisions in one circle (e.g., Mehsana Circle).

| Component | Specification | Qty | Unit Rate (₹) | Total (₹) | Type |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **HA Compute & DB Nodes (On-Prem / GSDC Colocation)** | 2× App/Worker Nodes (16C / 64 GB RAM) + 2× DB Nodes (PostgreSQL 16 Primary + Streaming Sync Standby, 4×3.84 TB NVMe RAID-10) | 4 nodes | 4,75,000 | 19,00,000 | CAPEX |
| **NAS Backup Appliance** | 40 TB Usable RAID-6 Snapshot Vault at Circle HQ (local fast restore) | 1 | 5,50,000 | 5,50,000 | CAPEX |
| **Subdivision Office Workstations** | Modernised Office PCs (16 GB RAM, 512 GB NVMe, Monitor + UPS) across 12–15 subdivisions | 110 | 56,000 | 61,60,000 | CAPEX |
| **Subdivision Scanners & Label Printers** | 15× ADF Scanners + 15× QR/Meter Seal Thermal Printers | 15 sets | 46,000 | 6,90,000 | CAPEX |
| **Field Engineer Rugged Devices** | Ruggedised IP65 Android 5G/4G Devices + MDM enrolment | 80 | 31,250 | 25,00,000 | CAPEX |
| **Tier 2 Subtotal CAPEX** | | | | **₹1,18,00,000** | **₹1.18 Cr** |
| **Cloud DR, Object Storage & WAF** | Secondary-zone encrypted PostgreSQL WAL archive + 20 TB S3 document/photo storage + Managed WAF/DDoS + SMS/SMTP Gateway | Annual | — | 12,50,000 | OPEX/yr |
| **SD-WAN / MPLS + Field SIMs + Support** | Subdivision VPN links, 80× Field SIMs, Prometheus/Grafana monitoring & 8×5 L2 infra support | Annual | — | 16,00,000 | OPEX/yr |
| **Tier 2 Annual OPEX** | | | | **₹28,50,000 / yr** | **₹28.50 L/yr** |

---

## Tier 3 — Large: Full UGVCL Enterprise & Multi-AZ DR (4 Circles · 100+ Subdivisions · 1,500+ Staff)

Full production architecture across Sabarmati, Mehsana, Palanpur, and Himmatnagar circles with active-active application clusters, cross-region Disaster Recovery, SAP IS-U / SCADA DMZ integration, and sovereign Private-VPC AI inference.

| Component | Specification | Qty | Unit Rate (₹) | Total (₹) | Type |
| :--- | :--- | ---: | ---: | ---: | :--- |
| **Enterprise Core & ERP/SCADA DMZ Appliances** | Redundant SAN/HCI Cluster + Hardware Security Modules (HSM) + Dual HA Firewalls at Corporate HQ / GSDC for SAP IS-U & SCADA isolation | 1 core lot | — | 1,15,00,000 | CAPEX |
| **Private-VPC AI Inference Node** | Dual-GPU Server (2× L40S / A100-class 48 GB) inside UGVCL/GSDC VPC for air-gapped Gujarati/Hindi policy LLM & OCR | 1 | 28,00,000 | 28,00,000 | CAPEX |
| **Phased Subdivision Workstation Refresh** | 750× Enterprise Desktops (16 GB RAM, 512 GB NVMe, UPS) + 100× Subdivision Scanner/Printer Kits | 750 + 100 | — | 4,42,00,000 | CAPEX |
| **Enterprise Field Fleet Devices** | 550× Ruggedised IP67 5G/GPS Field Devices with hardware keystore & MDM | 550 | 29,090 | 1,60,00,000 | CAPEX |
| **Tier 3 Subtotal CAPEX** | | | | **₹7,45,00,000** | **₹7.45 Cr** |
| **Multi-AZ Sovereign Cloud + Cross-Region DR** | Kubernetes worker pool, Multi-AZ PostgreSQL + Read Replicas, Redis Sentinel, Kafka/Temporal cluster, 150 TB S3 Vault, Secondary-Region Hot Standby (`RPO ≤ 15 min`, `RTO ≤ 30 min`) | Annual | — | 98,00,000 | OPEX/yr |
| **SOC/SIEM, Penetration Testing, Telecom & 24×7 NOC** | CERT-In empanelled bi-annual VAPT, central SIEM log retention (180 days), DLT SMS/WhatsApp/Email gateway, 550× Field SIMs, 24×7 L2/L3 Managed Ops | Annual | — | 88,00,000 | OPEX/yr |
| **Tier 3 Annual OPEX** | | | | **₹1,86,00,000 / yr** | **₹1.86 Cr/yr** |

---

## Phased Procurement & Governance Recommendations

1. **Start with Tier 1 (₹14.80 L CAPEX) in 1 Subdivision for 90 Days:** Validate field sync over rural 2G/4G pockets, measure real officer turnaround reduction (see [WORKLOAD_MEASUREMENT.md](WORKLOAD_MEASUREMENT.md)), and confirm SAP IS-U RFC/webhook field mappings with UGVCL IT before committing Circle/DISCOM CAPEX.
2. **Reuse Existing Hardware First:** Because VidyutFlow is a lightweight browser PWA (code-split bundles, zero desktop client install), any existing UGVCL PC with ≥8 GB RAM + SSD and modern Chrome/Edge can be retained without replacement, directly reducing Tier 2/3 endpoint CAPEX.
3. **Zero Vendor Lock-In:** Every tier runs on open standards (`PostgreSQL`, `FastAPI / OpenAPI 3.1`, `React PWA`, `S3-compatible object storage`, `OIDC`), allowing hosting on GSDC Gandhinagar, NIC MeghRaj, or MeitY-empanelled Indian cloud regions interchangeably.
