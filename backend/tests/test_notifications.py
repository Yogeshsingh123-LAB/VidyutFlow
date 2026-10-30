"""Alert-centre tests: workflow-generated rows, ownership enforcement, read state."""
import os, sys
os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from fastapi.testclient import TestClient
from app.main import app


def login(c, email, pw):
    r = c.post("/auth/login", data={"username": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _submit(c, headers, name="Notify Test User"):
    r = c.post("/requests", headers=headers, json={
        "applicant_name": name, "phone": "9876543210", "address": "Mehsana, Gujarat",
        "zone": "North", "request_type": "new_connection",
        "description": "need new electricity connection for my home",
        "requested_load_kw": 3, "document_name": "id_proof.pdf"})
    assert r.status_code == 201, r.text
    return r.json()


def test_submit_creates_notifications_for_parties():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        req = _submit(c, consumer)
        for headers in (consumer, officer, engineer):
            inbox = c.get("/notifications", headers=headers).json()
            assert inbox["unread"] >= 1
            assert all(n["title"] for n in inbox["items"])
        cinbox = c.get("/notifications", headers=consumer).json()
        assert any(n["request_id"] == req["id"] and "submitted" in n["title"].lower()
                   for n in cinbox["items"])


def test_notification_ownership_and_read_state():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")
        _submit(c, consumer)
        inbox = c.get("/notifications", headers=consumer).json()
        mine = inbox["items"][0]
        # admin (support view) sees all rows
        assert len(c.get("/notifications", headers=admin).json()["items"]) >= len(inbox["items"])
        # mark own read works
        r = c.post(f"/notifications/{mine['id']}/read", headers=consumer)
        assert r.status_code == 200 and r.json()["read"] is True
        # mark-all-read clears the rest
        assert c.post("/notifications/read-all", headers=consumer).json()["marked_read"] >= 0
        assert c.get("/notifications", headers=consumer).json()["unread"] == 0
        # unauthenticated access is rejected
        assert c.get("/notifications").status_code in (401, 403)


def test_notification_cross_user_is_rejected():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        _submit(c, consumer)
        mine = c.get("/notifications", headers=consumer).json()["items"][0]
        admin = login(c, "admin@vidyut.local", "Admin@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        # admin may read-mark anyone's row (support); officer cannot touch a consumer's row
        assert c.post(f"/notifications/{mine['id']}/read", headers=admin).status_code == 200
        c.post("/notifications/read-all", headers=consumer)  # reset noise
        _submit(c, consumer, name="Second Applicant")
        mine2 = c.get("/notifications", headers=consumer).json()["items"][0]
        assert c.post(f"/notifications/{mine2['id']}/read", headers=officer).status_code == 403
