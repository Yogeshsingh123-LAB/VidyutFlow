# VidyutFlow 2.0 — Data Migration Map

**Date:** 05 November 2026  
**Reference Commit:** `77d2572230f0bc7685518673e40554de441f75e6`  
**Branch:** `backend-integration/phase9-step4d`  
**Audience:** Backend Integration Engineer & Database Administrator

---

## 1. Migration Overview & Strategy

This document maps all browser-local mock datasets, client-side seed fixtures (`src/data/mockData.ts`, `src/data/demoAuthData.ts`, `src/data/ugvclTariffSchedule.ts`), and Express server stores (`src/server/dataStore.ts`) to authoritative PostgreSQL / SQLite relational models in `backend/app/models.py`.

### Migration Invariants:
1. **DEMO Fixture Preservation**: Initial seed collections in `src/data/mockData.ts` and `src/data/demoAuthData.ts` must never be deleted or modified in-place; LIVE backend seeding must read from them idempotently.
2. **Stable Identifiers**: Primary identifiers (e.g. consumer numbers `04281-99231`, application IDs `APP-2026-0812`, transaction IDs `TXN-UPI-9921448102`, bill IDs `BILL-UG-2026-10-8821`) must be retained without truncation or re-hashing.
3. **Idempotent Upsert**: All database seeding scripts must execute using `ON CONFLICT (id) DO NOTHING` (PostgreSQL) or existing existence checks to prevent duplicate key violations across multiple server restarts.

---

## 2. Dataset Entity Mapping Matrix

| Frontend Fixture / Store | Target Database Table | Primary Key / Natural Key | Foreign Keys & Relationships | Migration Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `DEFAULT_DEMO_ACCOUNTS`<br>(`src/data/demoAuthData.ts`) | `users` | `id` (VARCHAR) / `email` | `subdivision_id` -> `subdivision_offices.id` | Upsert with Bcrypt-hashed default passwords (`rounds=12`). |
| `ROLE_PROFILES`<br>(`src/data/mockData.ts`) | `users` / `user_contacts` | `user_id` / `email` | `user_id` -> `users.id` | Extract contact details into `user_contacts`. |
| `INITIAL_CONNECTIONS`<br>(`src/data/mockData.ts`) | `consumer_connection_links` & `saved_premises` | `consumer_no` (`04281-99231`) | `user_id` -> `users.id` | Populate official UGVCL connection registry and saved premises. |
| `INITIAL_APPLICATIONS`<br>(`src/data/mockData.ts`) | `connection_requests` | `id` (`APP-2026-0812`) | `consumer_id` -> `users.id`<br>`assigned_engineer_id` -> `users.id`<br>`assigned_officer_id` -> `users.id` | Insert full application lifecycle with workflow status, load kW, and documents. |
| `INITIAL_COMPLAINTS`<br>(`src/data/mockData.ts`) | `connection_requests` (type=`complaint`) | `id` (`CMP-2026-0419`) | `consumer_id` -> `users.id` | Map complaint categories, urgency, and assigned engineer. |
| `INITIAL_WORK_ORDERS`<br>(`src/data/mockData.ts`) | `field_updates` & `work_order_evidence` | `id` (`WO-2026-1102`) | `request_id` -> `connection_requests.id`<br>`engineer_id` -> `users.id` | Store task status, notes, meter serial, and GPS coordinates. |
| `INITIAL_BILLS`<br>(`src/data/mockData.ts`) | `bills` / `connection_requests` (financial) | `id` (`BILL-UG-2026-10-8821`) | `consumer_no` -> `consumer_connection_links.consumer_no` | Store monthly/bi-monthly billing period, readings, slabs, fixed charges, duty, FPPPA, and DPS. |
| `INITIAL_PAYMENTS`<br>(`src/data/mockData.ts`) | `payments` | `id` (`TXN-UPI-9921448102`) | `bill_id` -> `bills.id`<br>`consumer_no` -> `consumer_connection_links.consumer_no` | Financial settlement audit trail (amount, method, timestamp, receipt number). |
| `AUDIT_LOGS`<br>(`src/data/mockData.ts`) | `audit_logs` | `id` (VARCHAR) | `actor_id` -> `users.id` | Ingest historical audit rows with empty hash for legacy migration, then seal chain tip. |
| `INITIAL_NOTIFICATIONS`<br>(`src/data/mockData.ts`) | `notifications` | `id` (VARCHAR) | `user_id` -> `users.id`<br>`request_id` -> `connection_requests.id` | Ingest alert and notification rows with `read` state. |
| `UGVCL Directory`<br>(`src/server/dataStore.ts`) | `circle_offices`, `division_offices`, `subdivision_offices`, `section_offices` | `id` (VARCHAR) | Hierarchical office tree | Full hierarchical seeding of Gujarat Mehsana / Sabarmati UGVCL offices. |

---

## 3. Attribute-by-Attribute Field Mappings

### 3.1 Consumer Accounts & Contacts
```
Frontend DEFAULT_DEMO_ACCOUNTS[0] (consumer@vidyutflow.demo):
  email             -> users.email ("consumer@vidyutflow.demo")
  name              -> users.name ("Smt. Meenaben Patel")
  role              -> users.role ("consumer")
  zone              -> users.zone ("North")
  password          -> users.hashed_password (bcrypt(Demo@12345))
  mobileNumber      -> user_contacts.mobile_number ("+91 98250 14820")
  mobileVerified    -> user_contacts.mobile_verified (TRUE)
  isPrimary         -> consumer_connection_links.is_primary (TRUE)
```

### 3.2 Service Connection Links
```
Frontend INITIAL_CONNECTIONS[0] (04281-99231):
  consumerNo        -> consumer_connection_links.consumer_no ("04281-99231")
  discom            -> consumer_connection_links.discom ("UGVCL")
  connectionType    -> consumer_connection_links.connection_type ("Residential (RGPU)")
  sanctionedLoadKw  -> consumer_connection_links.sanctioned_load_kw (6.0)
  officialAddress   -> consumer_connection_links.official_address ("14, Anand Nagar Society...")
  subdivision       -> consumer_connection_links.subdivision ("Mehsana City North")
  status            -> consumer_connection_links.status ("ACTIVE")
  meterNumber       -> consumer_connection_links.meter_number ("MTR-UG-88214")
```

### 3.3 Bi-Monthly Bills & Delinquency (Phase 9 Step 1 & Step 4)
```
Frontend INITIAL_BILLS (BILL-UG-2026-10-8821):
  id                -> bills.id ("BILL-UG-2026-10-8821")
  consumerNo        -> bills.consumer_no ("04281-99231")
  billingCycleType  -> bills.cycle_type ("BI_MONTHLY")
  periodStartIso    -> bills.period_start ("2026-08-01T00:00:00Z")
  periodEndIso      -> bills.period_end ("2026-09-30T23:59:59Z")
  billDateIso       -> bills.bill_date ("2026-10-01T10:00:00Z")
  dueDateIso        -> bills.due_date ("2026-10-22T23:59:59Z")
  previousReadingKwh-> bills.previous_reading_kwh (14050.0)
  currentReadingKwh -> bills.current_reading_kwh (14460.0)
  unitsConsumedKwh  -> bills.units_consumed_kwh (410.0)
  energyChargesInr  -> bills.energy_charges_inr (1767.50)
  fixedChargesInr   -> bills.fixed_charges_inr (150.00)
  fpppaChargesInr   -> bills.fpppa_charges_inr (168.10)
  electricityDutyInr-> bills.electricity_duty_inr (99.40)
  totalAmountInr    -> bills.total_amount_inr (2185.00)
  status            -> bills.status ("OVERDUE" or "PAID")
  dpsAccruedInr     -> bills.dps_accrued_inr (calculated real-time via Step 4A formula)
```

---

## 4. Migration Execution & Integrity Verification

1. **Schema Pre-check**: Run `alembic upgrade head` to establish all authoritative tables and constraints.
2. **Seed Execution**: Run `python backend/scripts/seed_canonical_fixtures.py` to ingest standard demo fixtures idempotently.
3. **Chain Sealing**: Initialize `audit_chain_heads` with sequence 1 and generate SHA-256 genesis tip.
4. **Data Verification**: Execute `npm run test:integrity` and `npm run test:backend` to confirm zero data drift and full schema compatibility.

