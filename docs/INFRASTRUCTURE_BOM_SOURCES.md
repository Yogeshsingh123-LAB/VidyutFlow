# Infrastructure Bill of Materials (BOM) — Vendor SKUs, Datasheets & Pricing Sources (`PS000125`)

> **Purpose:** Substantiates every cost figure in [`docs/INFRASTRUCTURE.md`](INFRASTRUCTURE.md) and [`docs/INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md) (`₹8,000/unit × 500 = ₹40.00 Lakh` substation edge concentrators; `₹14.80 Lakh` Tier-1 Subdivision Pilot; `₹1.18 Crore` Tier-2 Circle HA; `₹7.45 Crore` Tier-3 Full UGVCL DISCOM) with **verifiable Indian distributor SKUs, manufacturer datasheets, and public INR catalog prices**.

---

## 1. Substation / Rural Feeder Edge Concentrator (`~₹8,000/unit` Institutional Bulk · `× 500 = ₹40.00 Lakh`)

| Sub-Component | Model / Distributor SKU | Public Single-Unit Catalog Price (INR) | 500-Unit Institutional / GeM Estimate | Verified Public Source / Datasheet |
| :--- | :--- | :---: | :---: | :--- |
| **Single-Board Compute** | **Raspberry Pi 4 Model B** (`2GB` `BRD-RPi4-2GB` for telemetry gateway; `8GB` `RPI4-MODBP-8GB` for heavy circle concentrators) | `₹7,150` (`2GB`) · `₹9,990` (`4GB`) · `₹15,373` (`8GB` Element14) | **`₹5,600`** (`2GB` bulk) | CrazyPi India (`BRD-RPi4`): https://www.crazypi.com/raspberry-pi4-with-8gb-ram<br>Element14 India (`3369503` / `RPI4-MODBP-8GB`): https://in.element14.com/raspberry-pi/rpi4-modbp-8gb/raspberry-pi-4-model-b-cortex/dp/3369503 |
| **Dual-SIM 4G LTE Cat-1/Cat-4 Modem** | **Quectel EC200U-CN** 4G LTE QuecOpen M2M Module (`027-EC200UCNAA-N05-SGNSA`) + Dual-SIM carrier & SMA antenna (or `7Semi EC200U` USB/UART dongle) | `₹980` ex-GST (`₹1,156.40` inc-GST) module · `₹1,895` ex-GST complete dongle | **`₹1,250`** (module + carrier + LTE antenna) | Evelta Mumbai (`027-EC200UCNAA-N05-SGNSA`): https://evelta.com/ec200u-series-quecopen-module/<br>Quectel India catalog: https://evelta.com/quectel/ |
| **RS-485 DLMS Isolator, Industrial microSD/eMMC & DIN-Rail Enclosure** | Isolated MAX485 / ADM2483 RS-485 transceiver + 32/64 GB industrial A2 card + IP54 DIN-rail ABS/metal housing + 24V→5V 3A buck UPS | `₹1,450` retail | **`₹1,150`** | Standard industrial panel BOM |
| **Total Substation Edge Node** | **Complete Store-and-Forward Feeder Concentrator** | `~₹9,580–₹10,495` single-unit retail | **`₹8,000 / unit`** (`× 500 = ₹40.00 Lakh`) | Deployed across 66/11kV substations & rural North Gujarat subdivisions |

---

## 2. Enterprise Rack Compute, SD-WAN Firewalls & Field Handhelds

| Layer | Reference Enterprise Hardware | Key Datasheet Specifications | Budgeted Unit Basis (GeM / Rate-Contract) | Official Datasheet / Public Reference |
| :--- | :--- | :--- | :---: | :--- |
| **Application & DB Rack Server (1U)** | **Dell EMC PowerEdge R650xs** (or HPE ProLiant DL360 Gen10+/Gen11 equivalent) | Dual 3rd-Gen Intel Xeon Scalable (up to 32 cores/socket), 16× DDR4 ECC RDIMM slots (128 GB configured), PCIe Gen4 NVMe RAID-10, dual 1400W Platinum hot-swap PSU, iDRAC9 Enterprise | `₹4.20–₹5.80 Lakh / node` (depending on NVMe capacity) | Dell PowerEdge R650xs Spec Sheet: https://i.dell.com/sites/csdocuments/Product_Docs/en/poweredge-r650xs-spec-sheet.pdf |
| **Subdivision / Circle Secure SD-WAN Appliance** | **Fortinet FortiGate 60F / 61F Secure SD-WAN** | `9 Mpps` throughput, `6.5 Gbps` IPsec VPN, `200` site-to-site tunnels, dual-WAN SLA path failover (`BSNL/GFGNL MPLS` + `4G/5G LTE`), fanless `18.5W` | `₹55,000–₹78,000 / appliance` (incl. 1-yr UTM bundle) | FortiGate 60F Datasheet: https://www.danresa.com.br/fortinet/pdfs/Fortigate/FortiGate-60F/FortiGate-60F.pdf |
| **Field Engineer Rugged Handheld** | **IP65 Rugged Android 14 Handheld** (6 GB RAM, 128 GB storage, Dual-SIM 4G VoLTE, L1/L5 GPS, 6000 mAh battery) | Runs `FieldPortal` Service Worker + IndexedDB offline queue (`client_uuid` idempotent sync) | `₹18,500–₹24,000 / unit` | GeM ruggedized handheld terminal category |
| **Cloud / GSDC Equivalence** | **MeitY-Empaneled Cloud (GSDC Gandhinagar / AWS Mumbai `ap-south-1`)** | Multi-AZ PostgreSQL 16 (`db.r6g.xlarge`), S3 Object Lock WORM KYC vault, ALB + WAF | Tiered OPEX in [`INFRASTRUCTURE_ROADMAP.md`](INFRASTRUCTURE_ROADMAP.md) | MeitY Cloud / AWS `ap-south-1` public rate card |

---

## 3. Roll-Up Reconciliation Against 3-Tier Proposal (`docs/INFRASTRUCTURE_ROADMAP.md`)

1. **Tier 1 — Single Subdivision Pilot (`₹14.80 Lakh` CAPEX)**:
   - 2× Entry Rack / Cloud Compute Nodes + PostgreSQL HA (`₹6.40L`) + 2× FortiGate 60F SD-WAN (`₹1.30L`) + 15× Substation RPi4+EC200U Edge Nodes (`₹1.20L`) + 15× Rugged Field Handhelds (`₹3.15L`) + UPS/Cabling/Commissioning (`₹2.75L`) = **`₹14.80 Lakh`**.
2. **Tier 2 — Regional Circle HA (`₹1.18 Crore` CAPEX, ~25 Subdivisions)**:
   - 4× Dell PowerEdge R650xs Compute/DB HA Cluster + NVMe SAN (`₹26.0L`) + 28× FortiGate SD-WAN (`₹18.2L`) + 125× Substation Edge Concentrators (`₹10.0L`) + 160× Rugged Handhelds (`₹33.6L`) + Ceph/S3 Encrypted Vault, MPLS CPE & Deployment (`₹30.2L`) = **`₹1.18 Crore`**.
3. **Tier 3 — Full UGVCL DISCOM (`₹7.45 Crore` CAPEX, 4 Circles / 100+ Subdivisions + Secondary DR Site)**:
   - Primary + Hot-Standby DR PowerEdge R650xs Clusters (`₹1.65Cr`) + 500× Substation RPi4+EC200U Edge Concentrators (`₹40.0L`) + 110× Subdivision/Circle SD-WAN Appliances (`₹71.5L`) + 1,200× Rugged Field Handhelds (`₹2.40Cr`) + WORM Storage, GUVNL SOC/SIEM Link, MPLS Integration & Rollout (`₹2.285Cr`) = **`₹7.45 Crore`**.
