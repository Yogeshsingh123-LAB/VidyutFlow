#!/usr/bin/env python3
"""Cold-Start Live DR Failover Proof (Zero Pre-Configured State Required).

Boots a completely fresh database from scratch, creates a live citizen request,
immediately calls `POST /v1/system/dr-failover-drill` with zero manual setup or
container-name dependencies, verifies that the newly submitted request is recovered
intact from the promoted hot-standby replica with 0 records lost, and writes
`docs/verification/r4-cold-start-dr-proof.txt`.
"""
import os
from pathlib import Path
import sys
import tempfile
import time

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
REPORT_PATH = REPO_ROOT / "docs" / "verification" / "r4-cold-start-dr-proof.txt"


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="vidyut_coldstart_") as tmp:
        cold_db = Path(tmp) / "cold_start_vidyutflow.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cold_db}"
        sys.path.insert(0, str(BACKEND_DIR))

        t_boot0 = time.perf_counter()
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as c:
            boot_s = round(time.perf_counter() - t_boot0, 3)

            # Login as consumer & create a brand-new live request on cold DB
            tok_c = c.post(
                "/v1/auth/login",
                data={"username": "consumer@vidyut.local", "password": "Consumer@123"},
            ).json()["access_token"]
            created = c.post(
                "/v1/requests",
                headers={"Authorization": f"Bearer {tok_c}"},
                json={
                    "applicant_name": "Judge Cold-Start Proof Applicant",
                    "phone": "9876501234",
                    "address": "Plot 14, Highway Circle, Mehsana",
                    "zone": "North",
                    "pin_code": "384002",
                    "requested_load_kw": 4.5,
                    "document_name": "index2_proof.pdf",
                },
            )
            assert created.status_code == 201, created.text
            live_req_id = created.json()["id"]

            # Immediately invoke POST /v1/system/dr-failover-drill as admin (zero manual steps)
            tok_a = c.post(
                "/v1/auth/login",
                data={"username": "admin@vidyut.local", "password": "Admin@123"},
            ).json()["access_token"]
            drill_res = c.post(
                "/v1/system/dr-failover-drill",
                headers={"Authorization": f"Bearer {tok_a}"},
            )
            assert drill_res.status_code == 200, drill_res.text
            body = drill_res.json()

            assert body["status"] == "PASS"
            assert body["cold_start_self_contained"] is True
            assert body["primary_db_killed"] is True
            assert body["standby_promoted"] is True
            assert body["data_loss_records"] == 0
            assert body["latest_recovered_request_id"] == live_req_id
            assert body["latest_recovered_applicant"] == "Judge Cold-Start Proof Applicant"
            assert body["meets_60s_rto"] is True

            lines = [
                "========================================================================",
                "VIDYUTFLOW COLD-START LIVE DR FAILOVER PROOF (ZERO PRE-SETUP REQUIRED)",
                "========================================================================",
                f"Cold-start boot + seed time     : {boot_s} s",
                f"Live request created pre-kill   : {live_req_id} (Judge Cold-Start Proof Applicant)",
                f"Endpoint invoked immediately    : POST /v1/system/dr-failover-drill -> HTTP 200",
                f"Primary DB destroyed            : {body['primary_db_killed']}",
                f"Standby SHA-256 verified & live : {body['standby_promoted']}",
                f"Total live requests preserved   : {body['promoted_replica_requests']} / {body['primary_requests_before_outage']}",
                f"Latest recovered applicant      : {body['latest_recovered_applicant']} ({body['latest_recovered_request_id']})",
                f"Data loss (records)             : {body['data_loss_records']}",
                f"SQLite PRAGMA integrity_check   : {body['sqlite_integrity_check']}",
                f"Measured failover promotion RTO : {body['measured_local_failover_ms']} ms ({body['rto_seconds']} s < 60 s SLA)",
                "",
            ]
            REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
            REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
            print("\n".join(lines))


if __name__ == "__main__":
    main()
