# UGVCL Organizational Directory Structure

## 1. Executive Summary & Jurisdiction

**Uttar Gujarat Vij Company Limited (UGVCL)** is an unbundled electricity distribution utility wholly owned by the Government of Gujarat (GUVNL subsidiary). It is responsible for distribution and retail power supply across the northern region of Gujarat.

- **Corporate Headquarters**: Visnagar Road, Mehsana – 384001, Gujarat, India.
- **Geographic Coverage**: Mehsana, Gandhinagar, Sabarkantha, Aravalli, Banaskantha, Patan, and Ahmedabad (Rural) districts.
- **Reference Disclosure**: 1 May 2025 UGVCL RTI Proactive Disclosure (Section 4(1)(b)).
- **Organizational Baseline**: 4 Circles, 22 Operation & Maintenance Divisions, 151 Subdivisions (148 regular + 3 REC rural electrification subdivisions), 312+ Section Offices, and 280+ Substations (66/11 kV).

---

## 2. Seven-Tier Utility Hierarchy

VidyutFlow implements the official GUVNL/UGVCL administrative hierarchy without flattening or skipping levels:

```
UGVCL Corporate / Head Office (Mehsana)
  └── Circle Office (Superintending Engineer)
       └── Division Office (Executive Engineer)
            └── Sub-Division Office (Deputy Engineer)
                 └── Section Office (Junior Engineer / Section Officer)
                      └── Service Area (Feeder Distribution Zone)
                           ├── Village / Town (Panchayat / Municipal Ward)
                           └── Substation / DTC (66/11 kV & 11/0.433 kV)
```

---

## 3. Four Circles & 22 Division Breakdown

### A. Mehsana Circle (`CIR-MSH`)
- **Headquarters**: Visnagar Road, Mehsana – 384001
- **Contact**: `02762-222080` | `se_mehsana@ugvcl.com`
- **Districts Covered**: Mehsana, Patan (South)
- **Superintending Engineer**: Office of SE, Mehsana O&M Circle
- **6 Associated Divisions**:
  1. **Mehsana Division** (`DIV-MSH-01`): Talukas: Mehsana | Phone: `02762-222085`
  2. **Visnagar Division** (`DIV-VIS-02`): Talukas: Visnagar, Vadnagar | Phone: `02765-220140`
  3. **Kadi Division** (`DIV-KDI-03`): Talukas: Kadi | Phone: `02764-242120`
  4. **Unjha Division** (`DIV-UNJ-04`): Talukas: Unjha | Phone: `02767-254210`
  5. **Vijapur Division** (`DIV-VIJ-05`): Talukas: Vijapur | Phone: `02763-270310`
  6. **Patan Division** (`DIV-PAT-06`): Talukas: Patan, Chanasma, Sidhpur | Phone: `02766-220450`

---

### B. Sabarmati Circle (`CIR-SAB`)
- **Headquarters**: Near Sabarmati Railway Crossing, Sabarmati, Ahmedabad – 380005
- **Contact**: `079-27500214` | `se_sabarmati@ugvcl.com`
- **Districts Covered**: Gandhinagar, Ahmedabad (Rural)
- **Superintending Engineer**: Office of SE, Sabarmati Circle
- **5 Associated Divisions**:
  1. **Gandhinagar Division** (`DIV-GNR-01`): Talukas: Gandhinagar | Phone: `079-23222140`
  2. **Kalol Division** (`DIV-KAL-02`): Talukas: Kalol | Phone: `02764-223450`
  3. **Chandkheda Division** (`DIV-CHK-03`): Talukas: Chandkheda, Motera, Zundal | Phone: `079-27500981`
  4. **Dehgam Division** (`DIV-DEH-04`): Talukas: Dehgam | Phone: `02716-232110`
  5. **Mansa Division** (`DIV-MAN-05`): Talukas: Mansa | Phone: `02763-272240`

---

### C. Himatnagar Circle (`CIR-HMT`)
- **Headquarters**: Motipura / Hajipura, Himatnagar – 383001
- **Contact**: `02772-241530` | `se_himatnagar@ugvcl.com`
- **Districts Covered**: Sabarkantha, Aravalli
- **Superintending Engineer**: Office of SE, Himatnagar O&M Circle
- **5 Associated Divisions**:
  1. **Himatnagar Division** (`DIV-HMT-01`): Talukas: Himatnagar, Prantij | Phone: `02772-241535`
  2. **Idar Division** (`DIV-IDR-02`): Talukas: Idar, Vadali | Phone: `02778-250120`
  3. **Modasa Division** (`DIV-MOD-03`): Talukas: Modasa, Malpur, Dhansura | Phone: `02774-242210`
  4. **Talod Division** (`DIV-TLD-04`): Talukas: Talod, Bayad | Phone: `02770-220310`
  5. **Khedbrahma Division** (`DIV-KHB-05`): Talukas: Khedbrahma, Poshina, Vijaynagar | Phone: `02775-220440`

---

### D. Palanpur Circle (`CIR-PLN`)
- **Headquarters**: Highway Char Rasta, Palanpur, Dist. Banaskantha – 385001
- **Contact**: `02742-255451` | `se_palanpur@ugvcl.com`
- **Districts Covered**: Banaskantha, Patan (North / Radhanpur)
- **Superintending Engineer**: Office of SE, Palanpur Circle
- **6 Associated Divisions**:
  1. **Palanpur-1 Division** (`DIV-PLN-01`): Talukas: Palanpur (City) | Phone: `02742-255457`
  2. **Palanpur-2 Division** (`DIV-PLN-02`): Talukas: Palanpur (Rural), Danta, Amirgadh | Phone: `02742-250388`
  3. **Deesa Division** (`DIV-DSA-01`): Talukas: Deesa | Phone: `02744-220516`
  4. **Tharad Division** (`DIV-TRD-01`): Talukas: Tharad, Vav, Suigam | Phone: `02747-222120`
  5. **Dhanera Division** (`DIV-DHN-01`): Talukas: Dhanera, Dantiwada | Phone: `02748-222310`
  6. **Radhanpur Division** (`DIV-RDH-01`): Talukas: Radhanpur, Santalpur, Sami | Phone: `02746-277140`

---

## 4. Subdivisions & REC Breakdown

As disclosed on 1 May 2025, UGVCL operates:
- **148 Regular Subdivisions**: Serving municipal, urban, industrial GIDC corridors, and general agricultural areas.
- **3 REC Subdivisions (Rural Electrification Corporation Schemes)**: Specifically dedicated to intensive agrarian pump sets, deep borewells, and Jyotigram Yojana (JGY) rural feeder lines.

Each Subdivision is headed by a **Deputy Engineer (DE)** with administrative jurisdiction over 2 to 4 Section Offices.

---

## 5. Section Offices, Substations, and Service Areas

### Section Office (Junior Engineer / Section Officer)
The operational workhorse of UGVCL. Handles:
- LT line maintenance, fuse call centers, transformer replacements.
- First-tier grievance registration and field inspection dispatch.
- Consumer connection sanction surveys.

### Substations
- **Transmission/Distribution Interface**: 66/11 kV receiving substations fed from GETCO grid stations.
- **Feeder Outgoings**: Dedicated Jyotigram (24x7 residential rural), Agriculture (8-hour scheduled 3-phase), and Industrial (continuous) feeders.

### Consumer Service Area Binding
Every consumer service connection number in UGVCL encodes or binds to a feeder / subdivision prefix (e.g. `04281` for Kadi Rural). VidyutFlow maps consumers strictly via validated prefix arrays. When an unknown connection number is queried, the system responds with `requires_verification: true` and never guesses the office.

