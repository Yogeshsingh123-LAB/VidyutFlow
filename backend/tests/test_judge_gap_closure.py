"""Regression suite verifying closure of Judge Assessment gaps:
1. Upgraded ML credibility (category >= 0.85, CRITICAL recall 100%, SLA breach recall >= 0.85)
2. New trained scikit-learn predictive models: Billing Anomaly Detector & 24h Feeder Load Forecaster
3. Assistant zone-ranked breach query ("Which zone has highest breach risk and why?")
4. Simulated SAP S/4HANA IS-U OData v4 ServiceOrder bidirectional gateway
5. Encrypted upload vault (AES-256-GCM) + Admin SIEM CEF/JSON security event stream
6. Automated Primary -> Hot-Standby DR Failover Drill (0 records lost)
"""
import io
import os
import sys
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.uploads import decrypt_upload_at_rest
from scripts.dr_failover_drill import run_failover_drill
from test_flow import login


def test_ml_recall_and_predictive_decision_support_endpoints():
    with TestClient(app) as c:
        officer = login(c, "officer@vidyut.local", "Officer@123")
        consumer = login(c, "consumer@vidyut.local", "Consumer@123")

        m = c.get("/v1/assistant/ml-metrics", headers=officer).json()
        assert m["category_classifier"]["accuracy"] >= 0.85
        assert m["sla_breach_predictor"]["breach_recall"] >= 0.85
        assert m["billing_anomaly_detector"]["anomaly_recall"] >= 0.90
        assert m["feeder_load_forecaster"]["r2_score"] >= 0.95

        # Normal bill check
        ok_bill = c.post(
            "/v1/assistant/billing-anomaly",
            headers=consumer,
            json={
                "consumer_no": "04281-99231",
                "units_kwh": 220,
                "historical_avg_kwh": 210,
                "sanctioned_load_kw": 3.0,
            },
        )
        assert ok_bill.status_code == 200
        assert ok_bill.json()["is_anomaly"] is False

        # Spiked + slab-discrepant bill check
        bad_bill = c.post(
            "/v1/assistant/billing-anomaly",
            headers=officer,
            json={
                "consumer_no": "04281-99231",
                "units_kwh": 940,
                "historical_avg_kwh": 210,
                "sanctioned_load_kw": 3.0,
                "billed_energy_inr": 6900.0,
            },
        )
        assert bad_bill.status_code == 200
        body = bad_bill.json()
        assert body["is_anomaly"] is True
        assert body["severity"] == "HIGH"
        assert len(body["reasons"]) >= 2

        # 24-hour Transformer / Feeder kVA Load Forecast (RBAC gated to staff)
        assert c.get("/v1/assistant/load-forecast", headers=consumer).status_code == 403
        lf = c.get("/v1/assistant/load-forecast?zone=North&ambient_temp_c=41", headers=officer)
        assert lf.status_code == 200
        lf_json = lf.json()
        assert lf_json["zone"] == "North"
        assert len(lf_json["hourly_profile"]) == 24
        assert lf_json["peak_kva"] > 0

        # Judge Demo Query: "Which zone has highest breach risk and why?"
        ans = c.post(
            "/v1/assistant/chat",
            headers=officer,
            json={"question": "Which zone has highest breach risk and why?"},
        )
        assert ans.status_code == 200
        ans_body = ans.json()
        assert "zone currently has the highest SLA-breach risk" in ans_body["answer"]
        assert len(ans_body["data"]) >= 1
        assert "top_reasons" in ans_body["data"][0]


def test_sap_odata_gateway_siem_export_encrypted_vault_and_dr_failover():
    with tempfile.TemporaryDirectory() as vault_dir:
        os.environ["UPLOAD_VAULT_DIR"] = vault_dir
        try:
            with TestClient(app) as c:
                consumer = login(c, "consumer@vidyut.local", "Consumer@123")
                officer = login(c, "officer@vidyut.local", "Officer@123")
                admin = login(c, "admin@vidyut.local", "Admin@123")

                # Upload KYC document and verify AES-256-GCM encrypted file at rest (zero plaintext)
                secret_doc = b"CONFIDENTIAL_GUJARAT_AADHAAR_KYC_RECORD_998877"
                up = c.post(
                    "/v1/requests/with-document",
                    headers=consumer,
                    data={
                        "applicant_name": "Encrypted Vault Citizen",
                        "phone": "9898123456",
                        "address": "Plot 9, Sector 11, Gandhinagar",
                        "zone": "North",
                        "pin_code": "384001",
                        "requested_load_kw": "4.0",
                    },
                    files={"document": ("kyc_proof.pdf", io.BytesIO(secret_doc), "application/pdf")},
                )
                assert up.status_code == 201, up.text
                req_id = up.json()["id"]

                enc_files = [f for f in os.listdir(vault_dir) if f.endswith(".enc")]
                assert len(enc_files) == 1
                enc_bytes = open(os.path.join(vault_dir, enc_files[0]), "rb").read()
                assert enc_bytes.startswith(b"VFENC1")
                assert b"CONFIDENTIAL_GUJARAT" not in enc_bytes
                from app.config import settings
                key_mat = settings.secret_key if len(settings.secret_key) >= 16 else (settings.secret_key * 4)[:32]
                recovered = decrypt_upload_at_rest(enc_bytes, key_mat, aad=b"kyc_proof.pdf")
                assert recovered == secret_doc

                # Simulated SAP S/4HANA IS-U OData v4 Gateway
                meta = c.get("/v1/erp/sap-odata/metadata", headers=officer)
                assert meta.status_code == 200
                assert meta.json()["@odata.version"] == "4.0"
                assert meta.json()["is_simulated"] is True

                orders = c.get("/v1/erp/sap-odata/ServiceOrders", headers=officer)
                assert orders.status_code == 200
                assert any(o["EXTERNAL_REQ_ID"] == req_id for o in orders.json()["value"])

                ack = c.post(
                    "/v1/erp/sap-odata/ServiceOrders/inbound-ack",
                    headers=officer,
                    json={
                        "request_id": req_id,
                        "sap_order_no": "400998877665",
                        "equipment_meter_no": "SAP-MTR-8821",
                    },
                )
                assert ack.status_code == 200
                assert ack.json()["acknowledged"] is True
                assert ack.json()["sap_order_no"] == "400998877665"

                # Admin SIEM CEF & JSON Security Telemetry Export
                assert c.get("/v1/system/siem-events", headers=officer).status_code == 403
                siem_json = c.get("/v1/system/siem-events?format=json", headers=admin)
                assert siem_json.status_code == 200
                assert siem_json.json()["audit_chain_integrity"]["valid"] is True
                assert siem_json.json()["count"] >= 1

                siem_cef = c.get("/v1/system/siem-events?format=cef", headers=admin)
                assert siem_cef.status_code == 200
                assert "CEF:0|UGVCL|VidyutFlow|1.0|" in siem_cef.text
        finally:
            os.environ.pop("UPLOAD_VAULT_DIR", None)

    # Automated Primary -> Standby DR Failover Drill
    drill = run_failover_drill()
    assert drill["status"] == "PASS"
    assert drill["data_loss_records"] == 0
    assert drill["sqlite_integrity_check"] == "ok"
