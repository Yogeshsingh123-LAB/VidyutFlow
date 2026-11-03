# UGVCL Office Directory Data Sources & Provenance

## 1. Regulatory Context & Provenance Policy

Under Section 4(1)(b) of the Right to Information Act, 2005 and GERC Multi-Year Tariff (MYT) filing guidelines, public power distribution licensees are required to publish proactive organizational disclosures, office hierarchies, contact directories, and territorial jurisdictions.

In VidyutFlow, every organizational record (Circle, Division, Subdivision, Section, Substation) maintains explicit provenance tracking via the `office_data_sources` table and runtime audit metadata.

### Strict Data Integrity Guarantees
- **No Inventions**: Staff designations, phone numbers, taluka jurisdictions, and office codes must trace to official documents or regulatory submissions.
- **Discrepancy Flagging**: If a district portal lists an office phone number that diverges from the UGVCL corporate directory, the record is flagged as `DISCREPANCY_FLAGGED` for administrative resolution. The system **never silently guesses** or averages coordinates.
- **Verification Timestamps**: All active baseline records record `import_date` and `verified_date` (ISO-8601).

---

## 2. Primary Official Data Sources

| # | Document Title / Source | Issuing Body | Publication Date | URL / Citation | Role in Baseline |
|---|-------------------------|--------------|------------------|----------------|------------------|
| 1 | **UGVCL Section 4(1)(b) Proactive RTI Disclosure** | UGVCL Corporate Office | 2025-05-01 | `https://www.ugvcl.com/rti/proactive_disclosure_2025.pdf` | Authoritative office counts: 22 Divisions, 148 Regular + 3 REC Subdivisions |
| 2 | **UGVCL Office Directory & Helpline Roster** | UGVCL IT Cell | 2025-10-15 | `https://www.ugvcl.com/consumer/officedirectory.php` | Circle & Division office addresses, STD codes, and official emails |
| 3 | **GERC Multi-Year Tariff Order (Case No. 2284/2024)** | Gujarat Electricity Regulatory Commission | 2024-03-30 | `https://gerc.gujarat.gov.in/tariff-orders/ugvcl-order-2024.pdf` | Consumer counts, agricultural feeder counts, and REC scheme categorizations |
| 4 | **PFC 12th & 13th Annual Integrated Rating of Power Distribution Utilities** | Ministry of Power / PFC | 2024-12-10 | `https://pfcindia.com/rating/discom-ugvcl-a-plus.pdf` | Operational footprint, AT&C loss boundary verification |
| 5 | **Gujarat Government Revenue & Taluka Gazette** | Revenue Dept., GoG | 2023-08-15 | `https://revenue.gujarat.gov.in/talukas` | Official taluka and district boundaries matching O&M division polygons |
| 6 | **GETCO 66kV Substation Sub-Transmission Map** | Gujarat Energy Transmission Corp. | 2025-01-20 | `https://getcogujarat.com/transmission-network-map` | Verification of 66/11 kV receiving substations feeding UGVCL 11kV busbars |

---

## 3. Provenance Schema & Fields

Every imported office entity is linked to provenance tracking:

```sql
CREATE TABLE office_data_sources (
    id VARCHAR(36) PRIMARY KEY,
    office_type VARCHAR(50) NOT NULL, -- utility | circle | division | subdivision | section | substation
    office_id VARCHAR(64) NOT NULL,
    source_title VARCHAR(255) NOT NULL,
    source_url VARCHAR(500),
    source_type VARCHAR(100) NOT NULL, -- RTI Disclosure | GERC Tariff Order | District Gazette | Field Audit
    publication_date VARCHAR(20),
    verified_date VARCHAR(20) NOT NULL,
    verification_status VARCHAR(50) DEFAULT 'VERIFIED', -- VERIFIED | DISCREPANCY_FLAGGED | PENDING_AUDIT
    discrepancy_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Discrepancy Resolution Protocol

1. **Detection**:
   - The CSV import engine or scheduled scraper identifies a mismatched contact number, changed taluka jurisdiction, or split subdivision.
2. **Flagging**:
   - The record status becomes `DISCREPANCY_FLAGGED`.
   - Both the prior known value and new proposed value are archived in `discrepancy_details`.
3. **Admin Review**:
   - In the VidyutFlow Admin Portal (`/admin/directory`), discrepancies surface on the audit card.
   - An administrator with role `admin` can accept the updated value, retain the certified baseline, or schedule an on-site field verification visit.

