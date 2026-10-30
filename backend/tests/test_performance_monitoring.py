"""Tests for Performance Caching, Composite DB Indexes & Latency Monitoring (Item #20)."""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.perf import bump_all_caches
from test_flow import login


def test_composite_db_indexes_and_admin_only_performance_endpoint():
    with TestClient(app) as c:
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")
        engineer = login(c, "engineer@vidyut.local", "Engineer@123")
        officer = login(c, "officer@vidyut.local", "Officer@123")
        admin = login(c, "admin@vidyut.local", "Admin@123")

        for forbidden in (consumer, engineer, officer):
            assert c.get("/system/performance", headers=forbidden).status_code == 403

        perf = c.get("/system/performance", headers=admin)
        assert perf.status_code == 200
        body = perf.json()
        assert body["is_synthetic_or_local"] is True
        assert "ugvcl production benchmark" in body["disclosure"].lower()
        assert body["indexes"]["expected"] == 7
        assert body["indexes"]["present"] == 7
        assert all(item["present"] is True for item in body["indexes"]["items"])


def test_epoch_invalidated_kpi_and_template_caching_zero_stale_reads():
    with TestClient(app) as c:
        north_officer = login(c, "officer@vidyut.local", "Officer@123")
        south_officer = login(c, "officer@example.com", "Officer@123")
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")

        bump_all_caches()
        r1 = c.get("/requests/kpis/summary", headers=north_officer)
        assert r1.status_code == 200
        assert r1.headers.get("X-KPI-Cache") == "MISS"
        base_total = r1.json()["total_requests"]

        r2 = c.get("/requests/kpis/summary", headers=north_officer)
        assert r2.status_code == 200
        assert r2.headers.get("X-KPI-Cache") == "HIT"
        assert r2.json()["total_requests"] == base_total

        # South officer has a distinct cache scope key (MISS, South-only counts)
        rs = c.get("/requests/kpis/summary", headers=south_officer)
        assert rs.headers.get("X-KPI-Cache") == "MISS"
        assert set(rs.json()["by_zone"].keys()).issubset({"South"})

        # Creating a new North request immediately invalidates epoch -> zero stale reads
        created = c.post(
            "/requests",
            headers=consumer,
            json={
                "applicant_name": "Cache Invalidation Check",
                "phone": "9876543210",
                "address": "Mehsana North",
                "zone": "North",
                "request_type": "new_connection",
                "requested_load_kw": 3.0,
                "document_name": "id.pdf",
            },
        )
        assert created.status_code == 201

        r3 = c.get("/requests/kpis/summary", headers=north_officer)
        assert r3.headers.get("X-KPI-Cache") == "MISS"
        assert r3.json()["total_requests"] == base_total + 1

        # Workflow templates cache HIT/MISS check
        t1 = c.get("/workflows/templates", headers=consumer)
        assert t1.headers.get("X-Workflow-Cache") == "MISS"
        t2 = c.get("/workflows/templates", headers=consumer)
        assert t2.headers.get("X-Workflow-Cache") == "HIT"


def test_response_time_header_and_rolling_latency_percentiles():
    with TestClient(app) as c:
        admin = login(c, "admin@vidyut.local", "Admin@123")
        for _ in range(5):
            resp = c.get("/health")
            assert resp.status_code == 200
            assert float(resp.headers["X-Response-Time-Ms"]) >= 0.0

        perf = c.get("/system/performance", headers=admin).json()
        lat = perf["latency"]
        assert lat["sample_count"] >= 5
        assert lat["p95_ms"] >= lat["p50_ms"] >= 0.0
        assert len(lat["per_route"]) >= 1
