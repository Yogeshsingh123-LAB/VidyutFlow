# UGVCL Office Directory CSV Import & Sync Guide

## 1. Overview

VidyutFlow provides a safe, idempotent CSV/Excel import workflow to ingest new or reorganized Circles, Divisions, Subdivisions, and Sections. The importer operates with transactional safety, duplicate code rejection, missing parent validation, and dry-run preview verification.

---

## 2. CSV File Format & Columns

Imports must use standard comma-separated UTF-8 formatting.

### Required Header Specification:
```csv
office_type,code,name,parent_code,phone,email,taluka,pin_code
```

### Column Definitions:
| Column | Required | Allowed Values / Format | Description |
|---|---|---|---|
| `office_type` | **Yes** | `circle`, `division`, `subdivision`, `section` | Administrative tier of the office |
| `code` | **Yes** | Alphanumeric (e.g. `DIV-KDI-03`, `SUB-DIV-KDI-03-CITY`) | Unique official office code. Rejects duplicates |
| `name` | **Yes** | String (e.g. `Kadi Division`) | Official name of the office |
| `parent_code` | **Yes** | Existing parent code (e.g. `CIR-MSH` for division) | Must reference a verified parent office. Rejects orphans |
| `phone` | No | STD Phone format (e.g. `02764-242120`) | Official telephone number |
| `email` | No | Email format (e.g. `de_kadi@ugvcl.com`) | Official UGVCL correspondence email |
| `taluka` | No | Taluka name (e.g. `Kadi`) | Primary taluka jurisdiction |
| `pin_code` | No | 6-digit postal code (e.g. `382715`) | Postal PIN code |

---

## 3. Sample CSV Content

```csv
office_type,code,name,parent_code,phone,email,taluka,pin_code
division,DIV-KDI-03,Kadi Division,CIR-MSH,02764-242120,div-kdi-03@ugvcl.com,Kadi,382715
subdivision,SUB-DIV-KDI-03-CITY,Kadi City Sub-Division,DIV-KDI-03,02764-242120,sub-kdi-city@ugvcl.com,Kadi,382715
subdivision,SUB-DIV-KDI-03-RUR,Kadi Rural Sub-Division,DIV-KDI-03,02764-242120,sub-kdi-rur@ugvcl.com,Kadi,382715
section,SEC-SUB-DIV-KDI-03-CITY-01,Kadi Town O&M Section,SUB-DIV-KDI-03-CITY,02764-242120,sec-kdi-town@ugvcl.com,Kadi,382715
```

---

## 4. Two-Phase Safe Import Protocol

To protect production database integrity, the importer enforces a **Two-Phase Commit Preview**:

### Phase 1: Dry-Run Preview (`dry_run: true`)
- Simulates the entire import batch in memory.
- Checks for duplicate office codes (`HTTP 409` equivalents).
- Checks for non-existent parent office codes (`HTTP 422` equivalents).
- Reports:
  - `total_rows`: Count of parsed rows.
  - `valid_rows`: Rows ready for insertion.
  - `errors_count`: Number of rejected rows with exact row numbers and error reasons.
  - `imported`: Exactly `0` (database unchanged).

### Phase 2: Transactional Execution (`dry_run: false`)
- Only executed after administrator confirms preview.
- Inserts valid records within a single database transaction.
- Logs an audit event (`DIRECTORY_CSV_IMPORTED`) in `audit_logs`.
- If an unhandled database exception occurs, the transaction rolls back cleanly.

---

## 5. API Execution Examples

### Dry-Run Request:
```bash
curl -X POST http://127.0.0.1:3000/api/directory/import-csv \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": true,
    "rows": [
      {
        "office_type": "division",
        "code": "DIV-TEST-01",
        "name": "Test Division",
        "parent_code": "CIR-MSH",
        "phone": "02762-229988"
      }
    ]
  }'
```

### Dry-Run Response:
```json
{
  "dry_run": true,
  "total_rows": 1,
  "valid_rows": 1,
  "errors_count": 0,
  "errors": [],
  "imported": 0
}
```

### Administrator UI:
In the VidyutFlow Admin Portal, navigate to **UGVCL Directory** (`/admin/directory`) and click **Import CSV**. Paste CSV text or upload a `.csv` file to inspect the preview table before clicking **Commit Import**.

