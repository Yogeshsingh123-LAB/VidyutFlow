import os, sys, uuid
os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutos.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
from app.main import app
from app.ml.predict import classify_text

def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw}); assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

def test_end_to_end_and_dedup():
    with TestClient(app) as c:
        assert c.get("/health").json()["status"] == "ok"
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        # 1 consumer submits
        r = c.post("/requests", headers=consumer, json={"applicant_name":"Test User","phone":"9876543210",
            "address":"Mehsana Gujarat","zone":"North","request_type":"new_connection",
            "description":"need new electricity connection for my home","requested_load_kw":3,"document_name":"id_proof.pdf","tariff_category":"Commercial (NRGP)","phase":"3-Phase","premises_type":"Rented"})
        assert r.status_code == 201, r.text; req = r.json()
        assert req["status"] in ("ASSIGNED","ROUTED") and req["category"] and req["sla_due_at"]
        assert req["tariff_category"] == "Commercial (NRGP)" and req["phase"] == "3-Phase"
        k = c.get("/requests/kpis/summary", headers=officer).json()
        assert "by_zone" in k and "by_category" in k and set(k["risk_buckets"]) == {"low_<0.4","watch_0.4-0.7","high_>=0.7"}
        # 2 officer sees it + assistant SLA query works
        assert any(x["id"]==req["id"] for x in c.get("/requests", headers=officer).json())
        a = c.post("/assistant/chat", headers=officer, json={"question":"Which requests are likely to breach SLA?"})
        assert a.status_code == 200
        p = c.post("/assistant/chat", headers=officer, json={"question":"What is the procedure for a new connection?"})
        assert "new" in p.json()["answer"].lower()
        # 3-4 engineer offline sync, sent TWICE -> no duplicate
        south = login(c, "engineer@example.com", "Engineer@123")
        other = {"client_uuid": str(uuid.uuid4()), "request_id": req["id"], "task_status":"COMPLETED", "notes":"not mine"}
        assert c.post("/requests/field-sync", headers=south, json=other).status_code == 403  # assignment-level authorisation
        payload = {"client_uuid": str(uuid.uuid4()), "request_id": req["id"], "task_status":"COMPLETED",
                   "notes":"Meter installed","meter_serial":"MTR-TEST-1","created_offline_at":"2026-10-15T10:00:00Z"}
        s1 = c.post("/requests/field-sync", headers=engineer, json=payload); assert s1.json()["synced"] is True
        s2 = c.post("/requests/field-sync", headers=engineer, json=payload); assert s2.json()["duplicate"] is True
        # 5 consumer sees status
        mine = c.get("/requests", headers=consumer).json()
        done = [x for x in mine if x["id"]==req["id"]][0]
        assert done["status"] == "COMPLETED" and done["meter_serial"] == "MTR-TEST-1"  # connection shows installed meter
        # RBAC: consumer cannot sync field work
        assert c.post("/requests/field-sync", headers=consumer, json=payload).status_code == 403

def test_classifier_and_metrics():
    with TestClient(app) as c:
        h = login(c, "officer@vidyut.local", "Officer@123")
        m = c.get("/assistant/ml-metrics", headers=h).json()
        assert "SYNTHETIC" in m["data_notice"]
        assert "held-out source templates" in m["evaluation"]["classifier_split"]
        for name in ("category_classifier", "severity_classifier", "sla_breach_predictor"):
            model = m[name]
            assert 0 <= model["balanced_accuracy"] <= 1
            assert len(model["confusion_matrix"]) == len(model["labels"])
            assert all(len(row) == len(model["labels"]) for row in model["confusion_matrix"])
        assert m["category_classifier"]["accuracy"] > m["category_classifier"]["majority_baseline"]
        assert all(0 <= m["sla_breach_predictor"][metric] <= 1
                   for metric in ("breach_precision", "breach_recall", "breach_f1"))


def test_known_electrical_hazards_are_escalated():
    assert classify_text("exposed cable on road safety hazard") == ("SAFETY", "CRITICAL")
    assert classify_text("live wire hanging near house") == ("SAFETY", "CRITICAL")


def test_field_sync_cannot_decide_approvals():
    """Core Invariant 6: field sync reports field outcomes only. APPROVED/REJECTED are officer
    decisions via PATCH /status — an engineer must not reach them (or garbage states) via sync."""
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        r = c.post("/requests", headers=consumer, json={"applicant_name":"Invariant User","phone":"9876543210",
            "address":"Mehsana Gujarat","zone":"North","request_type":"new_connection",
            "description":"need new electricity connection for my home","requested_load_kw":3,"document_name":"id_proof.pdf"})
        assert r.status_code == 201, r.text; rid = r.json()["id"]; before = r.json()["status"]
        for bad in ("APPROVED", "REJECTED", "GARBAGE_STATUS"):
            s = c.post("/requests/field-sync", headers=engineer, json={"client_uuid": str(uuid.uuid4()),
                "request_id": rid, "task_status": bad, "notes": "bypass attempt"})
            assert s.status_code == 400, (bad, s.text)
            assert c.get(f"/requests/{rid}", headers=consumer).json()["status"] == before  # unchanged
        ok = c.post("/requests/field-sync", headers=engineer, json={"client_uuid": str(uuid.uuid4()),
            "request_id": rid, "task_status": "COMPLETED", "notes": "Meter installed", "meter_serial": "MTR-INV-1"})
        assert ok.status_code == 200 and ok.json()["synced"] is True
        assert c.get(f"/requests/{rid}", headers=consumer).json()["status"] == "COMPLETED"


def test_admin_directory_and_system_status():
    with TestClient(app) as c:
        admin = login(c, "admin@vidyut.local", "Admin@123"); consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        users = c.get("/auth/users", headers=admin); assert users.status_code == 200
        assert users.json() and "hashed_password" not in str(users.json()) and all("email" in x for x in users.json())
        assert c.get("/auth/users", headers=consumer).status_code == 403
        s = c.get("/system/status", headers=admin); assert s.status_code == 200, s.text
        body = s.json(); assert body["database"]["ok"] and body["counts"]["users"] >= 6 and len(body["services"]) == 6
        assert c.get("/system/status", headers=consumer).status_code == 403


def test_engineer_permissions_across_request_endpoints():
    """Detail, PATCH and sync all require assignment; decisions remain officer-owned."""
    from app.db import SessionLocal
    from app.models import ConnectionRequest
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        other = login(c, "engineer@example.com", "Engineer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        response = c.post("/requests", headers=consumer, json={
            "applicant_name": "Permission Test", "phone": "9876543210",
            "address": "Mehsana Gujarat", "zone": "North", "document_name": "id.pdf",
            "description": "new electricity connection for home"})
        assert response.status_code == 201
        rid = response.json()["id"]
        url = f"/requests/{rid}"
        before = response.json()["status"]
        assert c.get(url, headers=engineer).status_code == 200
        assert c.get(url, headers=other).status_code == 403
        assert c.patch(url + "/status", headers=other, json={"status": "COMPLETED"}).status_code == 403
        for status in ("APPROVED", "REJECTED", "NEEDS_CORRECTION", "ASSIGNED"):
            assert c.patch(url + "/status", headers=engineer, json={"status": status}).status_code == 403
            assert c.get(url, headers=consumer).json()["status"] == before
        for status in ("IN_PROGRESS", "FIELD_VERIFIED"):
            assert c.patch(url + "/status", headers=engineer, json={"status": status}).status_code == 200
        assert c.patch(url + "/status", headers=officer, json={"status": "APPROVED"}).status_code == 200
        payload = {"client_uuid": str(uuid.uuid4()), "request_id": rid, "task_status": "COMPLETED"}
        assert c.post("/requests/field-sync", headers=engineer, json=payload).json()["synced"]
        # Knowing an existing UUID must not bypass assignment or disclose its record ID.
        assert c.post("/requests/field-sync", headers=other, json=payload).status_code == 403
        assert c.post("/requests/field-sync", headers=officer, json=payload).status_code == 409
        assert c.post("/requests/field-sync", headers=engineer, json=payload).json()["duplicate"]
        with SessionLocal() as db:
            row = db.get(ConnectionRequest, rid)
            row.assigned_engineer_id = ""
            db.commit()
        assert c.get(url, headers=engineer).status_code == 403
        assert c.patch(url + "/status", headers=engineer, json={"status": "COMPLETED"}).status_code == 403
        payload["client_uuid"] = str(uuid.uuid4())
        assert c.post("/requests/field-sync", headers=engineer, json=payload).status_code == 403
        assert c.get(url, headers=consumer).json()["status"] == "COMPLETED"


def test_officer_zone_scope_and_assistant_visibility():
    from app.db import SessionLocal
    from app.models import ConnectionRequest, User
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        north = login(c, "officer@vidyut.local", "Officer@123")
        south = login(c, "officer@example.com", "Officer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        ids = {}
        for zone in ("North", "South", "Unstaffed"):
            r = c.post('/requests', headers=consumer, json={
                'applicant_name': 'Scope ' + zone, 'phone': '9876543210',
                'address': 'Synthetic test address', 'zone': zone, 'document_name': 'id.pdf'})
            assert r.status_code == 201
            ids[zone] = r.json()['id']
            if zone == 'Unstaffed':
                assert r.json()['assigned_officer_id'] == ''
                assert r.json()['assigned_engineer_id'] == ''
                assert r.json()['status'] == 'ROUTED'
        with SessionLocal() as db:
            for rid in ids.values():
                db.get(ConnectionRequest, rid).sla_breach_risk = .99
            db.commit()
        for headers, zone, other_zone in ((north, 'North', 'South'), (south, 'South', 'North')):
            rows = c.get('/requests', headers=headers).json()
            assert rows and all(r['zone'] == zone for r in rows)
            assert c.get(f"/requests/{ids[zone]}", headers=headers).status_code == 200
            url = f"/requests/{ids[other_zone]}"
            previous = c.get(url, headers=admin).json()["status"]
            assert c.get(url, headers=headers).status_code == 403
            assert c.patch(url + '/status', headers=headers, json={'status': 'APPROVED'}).status_code == 403
            assert c.post('/requests/field-sync', headers=headers, json={
                'client_uuid': str(uuid.uuid4()), 'request_id': ids[other_zone],
                'task_status': 'COMPLETED'}).status_code == 403
            assert c.get(url, headers=admin).json()['status'] == previous
            assert c.patch(f"/requests/{ids[zone]}/status", headers=headers,
                           json={'status': 'APPROVED'}).status_code == 200
            k = c.get('/requests/kpis/summary', headers=headers).json()
            assert k['total_requests'] == len(rows) and set(k['by_zone']) == {zone}
            logs = c.get('/requests/audit/logs', headers=headers).json()
            assert logs and all(x['entity_id'] in {r['id'] for r in rows} for x in logs)
            risk = c.post('/assistant/chat', headers=headers, json={'question': 'SLA breach risk'}).json()
            assert risk['data'] and all(r['zone'] == zone for r in risk['data'])
            counts = c.post('/assistant/chat', headers=headers, json={'question': 'how many requests'}).json()
            assert f"of {len(rows)} total requests" in counts['answer']
        # The same policy also closes assistant leakage for consumers and engineers.
        for headers in (consumer, engineer, admin):
            visible = c.get('/requests', headers=headers).json()
            risk = c.post('/assistant/chat', headers=headers, json={'question': 'SLA breach risk'}).json()
            assert all(r['id'] in {v['id'] for v in visible} for r in risk['data'])
        assert set(ids.values()) <= {r['id'] for r in c.get('/requests', headers=admin).json()}
        # A missing officer zone must fail closed, not grant global access.
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == 'officer@example.com').one()
            original = user.zone
            user.zone = ''
            db.commit()
        try:
            assert c.get('/requests', headers=south).json() == []
            assert c.get('/requests/audit/logs', headers=south).json() == []
            assert c.get(f"/requests/{ids['South']}", headers=south).status_code == 403
        finally:
            with SessionLocal() as db:
                db.query(User).filter(User.email == 'officer@example.com').one().zone = original
                db.commit()


def test_freeze_review_role_boundaries_and_pending_semantics():
    with TestClient(app) as c:
        headers = {role: login(c, role + '@vidyut.local', role.title() + '@123')
                   for role in ('consumer', 'engineer', 'officer', 'admin')}
        payload = {'applicant_name': 'Contract Test', 'phone': '9876543210',
                   'address': 'Synthetic Mehsana address', 'document_name': 'synthetic.pdf'}
        for role in ('consumer', 'engineer', 'officer'):
            assert c.get('/system/status', headers=headers[role]).status_code == 403
        assert c.get('/system/status', headers=headers['admin']).status_code == 200
        for role in ('engineer', 'officer', 'admin'):
            before = c.get('/requests', headers=headers['admin']).json()
            assert c.post('/requests', headers=headers[role], json=payload).status_code == 403
            assert c.post('/requests/with-document', headers=headers[role], data={
                'applicant_name': 'Forbidden', 'phone': '9876543210', 'address': 'Test'
            }).status_code == 403
            assert len(c.get('/requests', headers=headers['admin']).json()) == len(before)
        r = c.post('/requests/with-document', headers=headers['consumer'], data={
            'applicant_name': 'Multipart consumer', 'phone': '9876543210', 'address': 'Test'
        }, files={'document': ('synthetic.txt', b'synthetic content', 'text/plain')})
        assert r.status_code == 201
        r = c.post('/requests', headers=headers['consumer'], json=payload)
        assert r.status_code == 201
        rid = r.json()['id']
        before = c.get('/requests/kpis/summary', headers=headers['consumer']).json()
        assert c.patch(f'/requests/{rid}/status', headers=headers['officer'],
                       json={'status': 'REJECTED'}).status_code == 200
        after = c.get('/requests/kpis/summary', headers=headers['consumer']).json()
        assert after['pending'] == before['pending'] - 1
        assert after['total_requests'] == before['total_requests']
        assert after['completed'] == before['completed']
        for role, auth in headers.items():
            rows = c.get('/requests', headers=auth).json()
            expected = sum(r['status'] not in ('COMPLETED', 'REJECTED') for r in rows)
            assert c.get('/requests/kpis/summary', headers=auth).json()['pending'] == expected
            answer = c.post('/assistant/chat', headers=auth, json={'question': 'how many pending'}).json()
            assert f'There are {expected} pending' in answer['answer']
