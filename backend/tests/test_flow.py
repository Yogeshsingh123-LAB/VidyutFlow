import os, sys, uuid
os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutos.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
from app.main import app

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
        assert m["category_classifier"]["accuracy"] > m["category_classifier"]["majority_baseline"]
        assert m["sla_breach_predictor"]["accuracy"] > m["sla_breach_predictor"]["majority_baseline"]


def test_admin_directory_and_system_status():
    with TestClient(app) as c:
        admin = login(c, "admin@vidyut.local", "Admin@123"); consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        users = c.get("/auth/users", headers=admin); assert users.status_code == 200
        assert users.json() and "hashed_password" not in str(users.json()) and all("email" in x for x in users.json())
        assert c.get("/auth/users", headers=consumer).status_code == 403
        s = c.get("/system/status", headers=admin); assert s.status_code == 200, s.text
        body = s.json(); assert body["database"]["ok"] and body["counts"]["users"] >= 6 and len(body["services"]) == 6
        assert c.get("/system/status", headers=consumer).status_code == 403
