"""Comprehensive integration & persistence test suite for Phase 11A (Authoritative Persistent Meter Reading & Bill Anomaly System)."""
import json
import uuid
import pytest
from starlette.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.models import (
    MeterConfigurationModel,
    MeterConfigurationVersionModel,
    MeterPrivatePhotoRecord,
    MeterReadingSubmissionRecord,
    MeterEventRecord,
    MeterOcrExtractionRecord,
    MeterAmbiguousDigitRecord,
    MeterReadingReviewHistoryRecord,
    MeterAnomalyCaseRecord,
    MeterAnomalyStatusHistoryRecord,
    ConsumerBillingReviewRecord,
    ConsumerBillingReviewHistoryRecord,
    MeterThresholdPolicyVersionRecord,
    FinancialAdjustmentProposalRecord,
    FinancialAdjustmentHistoryRecord,
    MeterNotificationDedupRecord,
    ActorIdempotencyRecord,
    ElectricityBill,
)
from app.uploads import get_storage_provider


VALID_PNG_DATA_URL = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def _login(c: TestClient, email: str, pw: str, role: str) -> dict:
    res = c.post(
        "/auth/login",
        data={"username": email, "password": pw, "role": role},
    )
    if res.status_code != 200:
        res = c.post(
            "/auth/login",
            json={"email": email, "password": pw, "role": role},
        )
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_phase11a_persistent_seed_and_encrypted_photo_vault():
    """Verify seeded Phase 11 records persist in SQLAlchemy and photos are encrypted at rest."""
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        consumer_headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")
        officer_headers = _login(c, "employee@vidyutflow.demo", "Demo@12345", "officer")

        # 1. Verify SQLAlchemy persistent models are populated in DB
        with SessionLocal() as db:
            assert db.query(MeterConfigurationModel).count() >= 4
            assert db.query(MeterConfigurationVersionModel).count() >= 4
            assert db.query(MeterReadingSubmissionRecord).count() >= 5
            assert db.query(MeterAnomalyCaseRecord).count() >= 1
            assert db.query(MeterThresholdPolicyVersionRecord).count() >= 1

        # 2. Upload private photo via /v1/meter-readings/photos and verify AES-256-GCM encryption at rest
        photo_uuid = f"p11a-photo-{uuid.uuid4().hex[:8]}"
        res_upload = c.post(
            "/v1/meter-readings/photos",
            json={
                "consumerNo": "26401-88921",
                "meterNo": "UGVCL-SM-992104",
                "photoDataUrl": VALID_PNG_DATA_URL,
                "clientUuid": photo_uuid,
            },
            headers=consumer_headers,
        )
        assert res_upload.status_code == 201, res_upload.text
        photo_meta = res_upload.json()["photo"]
        photo_id = photo_meta["photoId"]
        assert photo_id.startswith("MPH-")
        assert photo_meta["encryptionMode"] == "AES-256-GCM"

        # Inspect raw storage object to verify ciphertext does not contain plaintext PNG bytes
        with SessionLocal() as db:
            photo_row = db.query(MeterPrivatePhotoRecord).filter_by(photo_id=photo_id).first()
            assert photo_row is not None
            raw_stored_bytes = get_storage_provider().get_bytes(photo_row.storage_key)
            assert raw_stored_bytes.startswith(b"VFENC1")
            assert b"PNG" not in raw_stored_bytes

        # 3. Idempotent retry with identical actor + payload returns 201 with same photoId
        res_retry = c.post(
            "/v1/meter-readings/photos",
            json={
                "consumerNo": "26401-88921",
                "meterNo": "UGVCL-SM-992104",
                "photoDataUrl": VALID_PNG_DATA_URL,
                "clientUuid": photo_uuid,
            },
            headers=consumer_headers,
        )
        assert res_retry.status_code == 201
        assert res_retry.json()["photo"]["photoId"] == photo_id

        # 4. Reusing same clientUuid with a different actor returns 409 IDEMPOTENCY_CONFLICT
        res_conflict = c.post(
            "/v1/meter-readings/photos",
            json={
                "consumerNo": "26401-88921",
                "meterNo": "UGVCL-SM-992104",
                "photoDataUrl": VALID_PNG_DATA_URL,
                "clientUuid": photo_uuid,
            },
            headers=officer_headers,
        )
        assert res_conflict.status_code == 409
        assert res_conflict.json()["code"] == "IDEMPOTENCY_CONFLICT"


def test_phase11a_reading_submission_ocr_idempotency_and_bola():
    """Verify persistent reading submission, OCR + ambiguous digits, idempotency conflict (409), and BOLA checks."""
    with TestClient(app) as c:
        consumer_headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")
        officer_headers = _login(c, "employee@vidyutflow.demo", "Demo@12345", "officer")
        field_headers = _login(c, "field@vidyutflow.demo", "Demo@12345", "field_engineer")
        mgmt_headers = _login(c, "management@vidyutflow.demo", "Demo@12345", "management")

        client_uuid = f"p11a-sub-{uuid.uuid4().hex[:8]}"
        payload = {
            "consumerNo": "26401-88921",
            "meterNo": "UGVCL-SM-992104",
            "displayedReading": "015345",
            "readingKwh": 15345,
            "readingAt": "2026-04-15T10:30:00.000Z",
            "source": "CONSUMER_PHOTO",
            "clientUuid": client_uuid,
            "multiplier": 1,
            "decimalPlaces": 0,
            "photoDataUrl": VALID_PNG_DATA_URL,
            "ocr": {
                "meterId": "UGVCL-SM-992104",
                "rawText": "MTR 015B45 KWH",
                "candidateReading": "015345",
                "normalizedReading": 15345,
                "confidence": 68.5,
                "requiresReview": True,
                "engineVersion": "local-tesseract-1.0",
                "extractedAt": "2026-04-15T10:29:55.000Z",
                "ambiguousDigits": [
                    {
                        "position": 3,
                        "rawChar": "B",
                        "resolvedDigit": "8",
                        "alternatives": ["8", "3"],
                        "reason": "'B' commonly misread for '8'",
                    }
                ],
            },
        }

        res = c.post("/v1/meter-readings", json=payload, headers=consumer_headers)
        assert res.status_code == 201, res.text
        reading = res.json()["reading"]
        reading_id = reading["id"]
        assert reading["readingKwh"] == 15345
        assert reading["photoId"].startswith("MPH-")
        assert reading["ocr"]["requiresReview"] is True
        assert len(reading["ocr"]["ambiguousDigits"]) == 1

        # Verify OCR, AmbiguousDigits, and ActorIdempotencyRecord persisted in DB
        with SessionLocal() as db:
            ocr_row = db.query(MeterOcrExtractionRecord).filter_by(reading_id=reading_id).first()
            assert ocr_row is not None
            assert ocr_row.confidence == 68.5
            amb_rows = db.query(MeterAmbiguousDigitRecord).filter_by(reading_id=reading_id).all()
            assert len(amb_rows) == 1
            assert amb_rows[0].raw_char == "B"
            idem_row = db.query(ActorIdempotencyRecord).filter_by(client_uuid=client_uuid).first()
            assert idem_row is not None

        # Identical retry returns 201 with identical reading ID
        res_same = c.post("/v1/meter-readings", json=payload, headers=consumer_headers)
        assert res_same.status_code == 201
        assert res_same.json()["reading"]["id"] == reading_id

        # Reusing clientUuid with modified readingKwh returns 409 IDEMPOTENCY_CONFLICT
        modified_payload = dict(payload, displayedReading="015399", readingKwh=15399)
        res_diff_payload = c.post("/v1/meter-readings", json=modified_payload, headers=consumer_headers)
        assert res_diff_payload.status_code == 409
        assert res_diff_payload.json()["code"] == "IDEMPOTENCY_CONFLICT"

        # Reusing clientUuid by a different actor returns 409 IDEMPOTENCY_CONFLICT
        res_diff_actor = c.post("/v1/meter-readings", json=payload, headers=officer_headers)
        assert res_diff_actor.status_code == 409
        assert res_diff_actor.json()["code"] == "IDEMPOTENCY_CONFLICT"

        # Authorized photo retrieval works for owning consumer and officer
        res_photo_owner = c.get(f"/v1/meter-readings/{reading_id}/photo", headers=consumer_headers)
        assert res_photo_owner.status_code == 200
        assert res_photo_owner.json()["photo"] == VALID_PNG_DATA_URL

        res_photo_officer = c.get(f"/v1/meter-readings/{reading_id}/photo", headers=officer_headers)
        assert res_photo_officer.status_code == 200
        assert res_photo_officer.json()["photo"] == VALID_PNG_DATA_URL

        # BOLA & role enforcement: Management is blocked from individual readings and photos
        res_mgmt_readings = c.get("/v1/meter-readings", headers=mgmt_headers)
        assert res_mgmt_readings.status_code == 403
        res_mgmt_photo = c.get(f"/v1/meter-readings/{reading_id}/photo", headers=mgmt_headers)
        assert res_mgmt_photo.status_code == 403

        # Field engineer cannot submit or fetch photo for unassigned connection 26408-55103
        res_field_unassigned = c.post(
            "/v1/meter-readings",
            json={
                "consumerNo": "26408-55103",
                "meterNo": "UGVCL-AG-441209",
                "displayedReading": "089500",
                "readingKwh": 89500,
                "readingAt": "2026-04-15T11:00:00.000Z",
                "source": "FIELD_OFFLINE_SYNC",
                "clientUuid": f"fld-unassigned-{uuid.uuid4().hex[:8]}",
                "multiplier": 1,
            },
            headers=field_headers,
        )
        assert res_field_unassigned.status_code == 403
        assert res_field_unassigned.json()["code"] == "METER_ASSIGNMENT_REQUIRED"


def test_phase11a_append_only_reviews_adjustments_and_phase9_bill_immutability():
    """Verify billing reviews, anomaly transitions, financial adjustments, and Phase 9 bill immutability."""
    with TestClient(app) as c:
        consumer_headers = _login(c, "consumer@vidyutflow.demo", "Demo@12345", "consumer")
        officer_headers = _login(c, "employee@vidyutflow.demo", "Demo@12345", "officer")
        admin_headers = _login(c, "admin@vidyutflow.demo", "Demo@12345", "admin")
        mgmt_headers = _login(c, "management@vidyutflow.demo", "Demo@12345", "management")

        # 1. Validate bill using authoritative Phase 9 engine via /v1/meter-readings/validate-bill
        res_val = c.get(
            "/v1/meter-readings/validate-bill?billNo=BILL-UG-2026-10-8821",
            headers=consumer_headers,
        )
        assert res_val.status_code == 200, res_val.text
        validation = res_val.json()["validation"]
        assert validation["billNo"] == "BILL-UG-2026-10-8821"
        assert len(validation["comparison"]) >= 5

        # Snapshot canonical ElectricityBill before any review or adjustment
        with SessionLocal() as db:
            orig_bill = db.query(ElectricityBill).filter_by(bill_no="BILL-UG-2026-09-8821").first()
            orig_snapshot = (orig_bill.total_amount, orig_bill.units_consumed, orig_bill.energy_charges)

        # 2. Consumer submits a billing review request on BILL-UG-2026-09-8821
        cbr_uuid = f"p11a-cbr-{uuid.uuid4().hex[:8]}"
        res_cbr = c.post(
            "/v1/meter-readings/billing-reviews",
            json={
                "billNo": "BILL-UG-2026-09-8821",
                "category": "CONSUMPTION_DISPUTE",
                "description": "Requesting slab and meter check for September cycle.",
                "clientUuid": cbr_uuid,
            },
            headers=consumer_headers,
        )
        assert res_cbr.status_code == 201, res_cbr.text
        review = res_cbr.json()["review"]
        review_id = review["id"]
        assert review["status"] == "PENDING_REVIEW"

        # 3. Officer transitions billing review to UNDER_INVESTIGATION with confidential staff note
        res_trans = c.patch(
            f"/v1/meter-readings/billing-reviews/{review_id}/transition",
            json={
                "nextStatus": "UNDER_INVESTIGATION",
                "staffNote": "INTERNAL_AUDIT_NOTE: Checking 11kV feeder logs.",
                "publicNote": "Your billing review is under technical verification.",
            },
            headers=officer_headers,
        )
        assert res_trans.status_code == 200
        assert "INTERNAL_AUDIT_NOTE" in json.dumps(res_trans.json()["review"])

        # Consumer view of the billing review must strip internalStaffNotes
        res_cns_view = c.get(
            f"/v1/meter-readings/billing-reviews/{review_id}",
            headers=consumer_headers,
        )
        assert res_cns_view.status_code == 200
        assert "INTERNAL_AUDIT_NOTE" not in json.dumps(res_cns_view.json()["review"])
        assert "internalStaffNotes" not in res_cns_view.json()["review"]

        # 4. Officer proposes append-only financial adjustment; Admin approves it
        res_adj = c.post(
            "/v1/meter-readings/adjustments",
            json={
                "billNo": "BILL-UG-2026-09-8821",
                "reviewRequestId": review_id,
                "adjustmentType": "SLAB_CORRECTION",
                "revisedUnits": 360,
                "reason": "Verified meter reading correction for September cycle.",
            },
            headers=officer_headers,
        )
        assert res_adj.status_code == 201, res_adj.text
        adj = res_adj.json()["adjustment"]
        adj_id = adj["id"]
        assert adj["status"] == "PENDING_APPROVAL"
        assert adj["ledgerApplicationStatus"] == "NOT_APPLIED"

        # Admin approves adjustment -> ledgerApplicationStatus becomes READY_FOR_NEXT_CYCLE
        res_adj_approve = c.patch(
            f"/v1/meter-readings/adjustments/{adj_id}/review",
            json={"action": "APPROVE", "note": "Approved for next billing cycle credit."},
            headers=admin_headers,
        )
        assert res_adj_approve.status_code == 200
        approved_adj = res_adj_approve.json()["adjustment"]
        assert approved_adj["status"] == "APPROVED"
        assert approved_adj["ledgerApplicationStatus"] == "READY_FOR_NEXT_CYCLE"
        assert len(approved_adj["history"]) >= 2

        # Separation of duties: Admin cannot self-approve their own proposed adjustment
        res_admin_prop = c.post(
            "/v1/meter-readings/adjustments",
            json={
                "billNo": "BILL-UG-2026-09-8821",
                "adjustmentType": "CREDIT_CONCESSION",
                "proposedAdjustmentAmount": 75.0,
                "reason": "Admin proposal to test separation of duties.",
            },
            headers=admin_headers,
        )
        assert res_admin_prop.status_code == 201
        admin_adj_id = res_admin_prop.json()["adjustment"]["id"]
        res_self_approve = c.patch(
            f"/v1/meter-readings/adjustments/{admin_adj_id}/review",
            json={"action": "APPROVE", "note": "Attempting self approval"},
            headers=admin_headers,
        )
        assert res_self_approve.status_code == 403
        assert res_self_approve.json()["code"] == "SEPARATION_OF_DUTIES_VIOLATION"

        # 5. Verify canonical ElectricityBill remained 100% untouched
        with SessionLocal() as db:
            after_bill = db.query(ElectricityBill).filter_by(bill_no="BILL-UG-2026-09-8821").first()
            assert (after_bill.total_amount, after_bill.units_consumed, after_bill.energy_charges) == orig_snapshot

        # 6. Management metrics endpoint returns aggregate-only data with zero PII
        res_metrics = c.get("/v1/meter-readings/metrics", headers=mgmt_headers)
        assert res_metrics.status_code == 200
        metrics_raw = json.dumps(res_metrics.json())
        assert "26401-88921" not in metrics_raw
        assert "UGVCL-SM-992104" not in metrics_raw
        assert "Aarav Patel" not in metrics_raw
