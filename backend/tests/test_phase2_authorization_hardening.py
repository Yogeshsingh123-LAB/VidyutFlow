import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import User, ConnectionRequest, SavedPremise
from app.security import hash_password, create_token
from app.notify import notify


def _auth_headers(user_id: str, role: str) -> dict[str, str]:
    token = create_token(user_id=user_id, role=role, token_type="access")
    return {"Authorization": f"Bearer {token}"}


def _create_user(db, role: str, zone: str = "North", name: str = "Test User") -> tuple[str, str, dict[str, str]]:
    uid = str(uuid.uuid4())
    user = User(
        id=uid,
        email=f"auth-{role}-{uid[:8]}@example.com",
        name=name,
        role=role,
        zone=zone,
        hashed_password=hash_password("Password123!"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    headers = _auth_headers(uid, role)
    return uid, role, headers


def _create_request(db, consumer_id: str, zone: str = "North", assigned_engineer_id: str = None) -> str:
    rid = str(uuid.uuid4())
    req = ConnectionRequest(
        id=rid,
        consumer_id=consumer_id,
        applicant_name=f"Applicant {consumer_id[:8]}",
        phone="9876543210",
        address=f"123 Test Street, {zone}",
        zone=zone,
        status="ASSIGNED",
        request_type="new_connection",
        assigned_engineer_id=assigned_engineer_id,
        requested_load_kw=5.0,
    )
    db.add(req)
    db.commit()
    return rid


def test_horizontal_consumer_isolation_bola():
    """Verify BOLA/IDOR protection: Consumer A cannot view or access Consumer B's requests."""
    with TestClient(app) as c:
        with SessionLocal() as db:
            c_a_id, _, headers_a = _create_user(db, role="consumer", name="Consumer Alpha")
            c_b_id, _, headers_b = _create_user(db, role="consumer", name="Consumer Beta")
            req_a_id = _create_request(db, consumer_id=c_a_id)
            req_b_id = _create_request(db, consumer_id=c_b_id)

        # Consumer A can access own request
        res_a_own = c.get(f"/requests/{req_a_id}", headers=headers_a)
        assert res_a_own.status_code == 200
        assert res_a_own.json()["id"] == req_a_id

        # Consumer B attempts BOLA on Consumer A's request -> 403 Forbidden
        res_b_tamper = c.get(f"/requests/{req_a_id}", headers=headers_b)
        assert res_b_tamper.status_code == 403
        assert "access scope" in res_b_tamper.json()["detail"].lower() or "not your request" in res_b_tamper.json()["detail"].lower()

        # Consumer B's list view must strictly contain only Consumer B's requests
        res_b_list = c.get("/requests", headers=headers_b)
        assert res_b_list.status_code == 200
        returned_ids = {r["id"] for r in res_b_list.json()}
        assert req_b_id in returned_ids
        assert req_a_id not in returned_ids


def test_horizontal_consumer_premise_idor_protection():
    """Verify IDOR prevention: Consumer B cannot delete Consumer A's saved premise."""
    with TestClient(app) as c:
        with SessionLocal() as db:
            c_a_id, _, headers_a = _create_user(db, role="consumer", name="Premise Owner")
            c_b_id, _, headers_b = _create_user(db, role="consumer", name="Premise Attacker")

            premise_a = SavedPremise(
                id=str(uuid.uuid4()),
                user_id=c_a_id,
                label="Home",
                applicant_name="Premise Owner",
                phone="9876543210",
                address="Plot 42, North Zone",
                zone="North",
            )
            db.add(premise_a)
            db.commit()
            premise_a_id = premise_a.id

        # Attacker attempts to delete victim's premise by ID -> 404 (ID existence concealed)
        del_attempt = c.delete(f"/auth/premises/{premise_a_id}", headers=headers_b)
        assert del_attempt.status_code == 404

        # Verify premise still exists for owner
        with SessionLocal() as db:
            assert db.get(SavedPremise, premise_a_id) is not None

        # Owner can delete own premise
        del_own = c.delete(f"/auth/premises/{premise_a_id}", headers=headers_a)
        assert del_own.status_code == 200
        assert del_own.json()["deleted"] is True


def test_vertical_privilege_escalation_blocked_for_consumers():
    """Verify RBAC boundary: Consumers are strictly denied from performing staff/admin operations."""
    with TestClient(app) as c:
        with SessionLocal() as db:
            c_id, _, headers = _create_user(db, role="consumer")
            req_id = _create_request(db, consumer_id=c_id)

        # 1. Consumer cannot update status
        res_status = c.patch(f"/requests/{req_id}/status", headers=headers, json={"status": "APPROVED"})
        assert res_status.status_code == 403

        # 2. Consumer cannot submit field sync
        res_sync = c.post("/requests/field-sync", headers=headers, json={
            "client_uuid": str(uuid.uuid4()),
            "request_id": req_id,
            "task_status": "COMPLETED",
        })
        assert res_sync.status_code == 403

        # 3. Consumer cannot access audit logs
        assert c.get("/requests/audit/logs", headers=headers).status_code == 403

        # 4. Consumer cannot verify audit chain
        assert c.get("/requests/audit/verify", headers=headers).status_code == 403

        # 5. Consumer cannot create or view staff members
        assert c.get("/staff/members", headers=headers).status_code == 403
        assert c.post("/staff/members", headers=headers, json={
            "email": "hacked@example.com", "name": "Fake", "role": "admin", "password": "Pass12345Password",
        }).status_code == 403

        # 6. Consumer cannot create subdivision zones
        assert c.post("/staff/zones", headers=headers, json={
            "code": "FakeZone", "display_name": "Fake Subdivision",
        }).status_code == 403

        # 7. Consumer cannot create or edit workflow templates
        assert c.post("/workflows/templates", headers=headers, json={
            "template_code": "hack_flow", "name": "Exploit Flow",
        }).status_code == 403

        # 8. Consumer cannot view system telemetry or trigger administrative drills
        assert c.get("/system/status", headers=headers).status_code == 403
        assert c.get("/system/performance", headers=headers).status_code == 403
        assert c.get("/system/siem-events", headers=headers).status_code == 403
        assert c.post("/system/dr-failover-drill", headers=headers).status_code == 403

        # 9. Consumer cannot access ERP sync logs or trigger outbound ERP synchronization
        assert c.get("/erp/logs", headers=headers).status_code == 403
        assert c.post(f"/erp/sync/{req_id}", headers=headers).status_code == 403


def test_cross_zone_officer_isolation_bola():
    """Verify multi-tenant zone isolation: North officer cannot access or modify South requests."""
    with TestClient(app) as c:
        with SessionLocal() as db:
            consumer_id, _, _ = _create_user(db, role="consumer")
            _, _, h_north = _create_user(db, role="officer", zone="North", name="Officer North")
            _, _, h_south = _create_user(db, role="officer", zone="South", name="Officer South")
            req_north_id = _create_request(db, consumer_id=consumer_id, zone="North")
            req_south_id = _create_request(db, consumer_id=consumer_id, zone="South")

        # North officer accesses North request -> 200 OK
        assert c.get(f"/requests/{req_north_id}", headers=h_north).status_code == 200

        # North officer probes South request -> 403 Forbidden (BOLA blocked)
        probe_south = c.get(f"/requests/{req_south_id}", headers=h_north)
        assert probe_south.status_code == 403
        assert "access scope" in probe_south.json()["detail"].lower()

        # North officer lists requests -> only sees North requests
        list_north = c.get("/requests", headers=h_north).json()
        ids = {r["id"] for r in list_north}
        assert req_north_id in ids
        assert req_south_id not in ids

        # North officer attempts status update on South request -> 403 Forbidden
        tamper_status = c.patch(f"/requests/{req_south_id}/status", headers=h_north, json={"status": "APPROVED"})
        assert tamper_status.status_code == 403

        # North officer attempts ERP sync on South request -> 403 Forbidden
        tamper_erp = c.post(f"/erp/sync/{req_south_id}", headers=h_north)
        assert tamper_erp.status_code == 403


def test_engineer_assignment_level_bola():
    """Verify engineer assignment-level authorization: Engineer A cannot access/sync Engineer B's task."""
    with TestClient(app) as c:
        with SessionLocal() as db:
            consumer_id, _, _ = _create_user(db, role="consumer")
            eng_a_id, _, h_a = _create_user(db, role="engineer", zone="North", name="Engineer A")
            eng_b_id, _, h_b = _create_user(db, role="engineer", zone="North", name="Engineer B")
            req_a_id = _create_request(db, consumer_id=consumer_id, zone="North", assigned_engineer_id=eng_a_id)
            req_b_id = _create_request(db, consumer_id=consumer_id, zone="North", assigned_engineer_id=eng_b_id)

        # Engineer A can read assigned task
        assert c.get(f"/requests/{req_a_id}", headers=h_a).status_code == 200

        # Engineer A attempts to read Engineer B's task -> 403 Forbidden
        probe = c.get(f"/requests/{req_b_id}", headers=h_a)
        assert probe.status_code == 403

        # Engineer A attempts field sync on Engineer B's task -> 403 Forbidden
        sync_tamper = c.post("/requests/field-sync", headers=h_a, json={
            "client_uuid": str(uuid.uuid4()),
            "request_id": req_b_id,
            "task_status": "FIELD_VERIFIED",
        })
        assert sync_tamper.status_code == 403
        assert "another engineer" in sync_tamper.json()["detail"].lower() or "access scope" in sync_tamper.json()["detail"].lower()

        # Engineer cannot approve or reject requests (only officers make sanction decisions)
        eng_approve = c.patch(f"/requests/{req_a_id}/status", headers=h_a, json={"status": "APPROVED"})
        assert eng_approve.status_code == 403
        assert "field-work statuses" in eng_approve.json()["detail"].lower()

        eng_reject = c.patch(f"/requests/{req_a_id}/status", headers=h_a, json={"status": "REJECTED"})
        assert eng_reject.status_code == 403


def test_notification_tenant_isolation():
    """Verify alert centre tenant boundary: User A cannot read or mark User B's notifications."""
    with TestClient(app) as c:
        with SessionLocal() as db:
            u_a_id, _, h_a = _create_user(db, role="consumer", name="Notification Owner")
            u_b_id, _, h_b = _create_user(db, role="consumer", name="Notification Snooper")
            notify(db, u_a_id, "Private Alert", "Confidential sanction note", "info")
            db.commit()

        # User A has 1 notification
        res_a = c.get("/notifications", headers=h_a).json()
        assert res_a["unread"] >= 1
        assert any(item["title"] == "Private Alert" for item in res_a["items"])

        # User B sees 0 notifications (tenant isolation)
        res_b = c.get("/notifications", headers=h_b).json()
        assert not any(item["title"] == "Private Alert" for item in res_b["items"])

        # User B calling read-all does not mark User A's notification as read
        c.post("/notifications/read-all", headers=h_b)

        # User A's notification remains unread
        res_a_after = c.get("/notifications", headers=h_a).json()
        assert res_a_after["unread"] >= 1
