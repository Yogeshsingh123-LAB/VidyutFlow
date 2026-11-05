"""Telemetry Simulator for Phase 12 Distribution Transformers (DTR).

Generates physically grounded electrical and thermal telemetry for instrumented
transformers (LOAD_KVA, OIL_TEMP, WINDING_TEMP, CURRENT R/Y/B, and VOLTAGE)
and delivers payloads via the HTTP ingestion API (with X-Telemetry-Ingest-Key)
or direct database transactions.
"""
import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import random
import sys
import types
import uuid

# Minimal shims if running in environment without optional runtime dependencies
if "pydantic_settings" not in sys.modules:
    try:
        import pydantic_settings
    except ImportError:
        import pydantic

        ps_mod = types.ModuleType("pydantic_settings")

        class BaseSettings(pydantic.BaseModel):
            def __init__(self, **values):
                super().__init__(**values)

        def SettingsConfigDict(**kwargs):
            return kwargs

        ps_mod.BaseSettings = BaseSettings
        ps_mod.SettingsConfigDict = SettingsConfigDict
        sys.modules["pydantic_settings"] = ps_mod

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.db import SessionLocal
from app import models


def now_utc():
    return datetime.now(timezone.utc)


def generate_transformer_telemetry_batch(
    db,
    transformer_asset_codes: list[str] | None = None,
    inject_anomaly: bool = False,
    timestamp: datetime | None = None,
) -> list[dict]:
    """Generate physically plausible telemetry readings for instrumented transformers."""
    ts = timestamp or now_utc()
    readings = []

    q = db.query(models.TransformerAsset)
    if transformer_asset_codes:
        q = q.filter(models.TransformerAsset.utility_asset_code.in_(transformer_asset_codes))
    transformers = q.all()

    for tr in transformers:
        sensors = db.query(models.TransformerSensor).filter(
            models.TransformerSensor.transformer_id == tr.id,
            models.TransformerSensor.active == True,
        ).all()

        rated = tr.rated_kva or 315.0
        # Diurnal load curve: base 60% + hour-of-day fluctuation
        hour_rad = 2.0 * math.pi * (ts.hour / 24.0)
        diurnal_factor = 0.65 + 0.15 * math.sin(hour_rad - 2.0) + random.uniform(-0.03, 0.03)

        if inject_anomaly:
            # Inject severe overload condition
            load_kva = round(rated * 1.15, 2)
            oil_temp = round(88.5 + random.uniform(0.5, 4.0), 2)
            winding_temp = round(102.0 + random.uniform(1.0, 5.0), 2)
            voltage = round(388.0 + random.uniform(-4.0, 4.0), 1)
        else:
            load_kva = round(rated * max(0.2, min(0.95, diurnal_factor)), 2)
            # Oil temp follows load: 45 - 68 deg C
            oil_temp = round(45.0 + (load_kva / rated) * 22.0 + random.uniform(-1.0, 1.0), 2)
            # Winding temp: 10 - 15 deg C higher than top oil
            winding_temp = round(oil_temp + 12.0 + random.uniform(-1.5, 2.0), 2)
            voltage = round(415.0 + random.uniform(-5.0, 5.0), 1)

        # Approximate line currents from 3-phase kVA: I = kVA * 1000 / (sqrt(3) * V)
        v_line = max(380.0, voltage)
        avg_current = (load_kva * 1000.0) / (math.sqrt(3) * v_line)
        i_r = round(avg_current * (1.0 + random.uniform(-0.02, 0.03)), 1)
        i_y = round(avg_current * (1.0 + random.uniform(-0.03, 0.02)), 1)
        i_b = round(avg_current * (1.0 + random.uniform(-0.02, 0.02)), 1)

        for s in sensors:
            val = 0.0
            unit = s.unit
            if s.sensor_type == "LOAD_KVA":
                val = load_kva
            elif s.sensor_type == "OIL_TEMP":
                val = oil_temp
            elif s.sensor_type == "WINDING_TEMP":
                val = winding_temp
            elif s.sensor_type == "VOLTAGE":
                val = voltage
            elif s.sensor_type == "CURRENT":
                if s.channel_phase == "R":
                    val = i_r
                elif s.channel_phase == "Y":
                    val = i_y
                elif s.channel_phase == "B":
                    val = i_b
                else:
                    val = round(avg_current, 1)

            readings.append({
                "transformer_id": tr.id,
                "sensor_id": s.id,
                "measured_at": ts.isoformat(),
                "value": val,
                "unit": unit,
                "quality": "QUESTIONABLE" if (inject_anomaly and s.sensor_type in ("OIL_TEMP", "WINDING_TEMP")) else "GOOD",
                "source": "SIMULATED_DEMO",
                "ingestion_id": str(uuid.uuid4()),
                "raw_payload_ref": f"sim://batch/{tr.utility_asset_code}/{ts.strftime('%Y%m%d%H%M%S')}",
            })

    return readings


def simulate_direct_db(batches: int = 1, inject_anomaly: bool = False) -> dict:
    """Simulate and commit telemetry readings directly to the database."""
    db = SessionLocal()
    total_ingested = 0
    try:
        for _ in range(batches):
            readings = generate_transformer_telemetry_batch(db, inject_anomaly=inject_anomaly)
            now = now_utc()
            for r in readings:
                rec = models.TelemetryReading(
                    transformer_id=r["transformer_id"],
                    sensor_id=r["sensor_id"],
                    measured_at=datetime.fromisoformat(r["measured_at"]),
                    received_at=now,
                    value=r["value"],
                    unit=r["unit"],
                    quality=r["quality"],
                    source=r["source"],
                    ingestion_id=r["ingestion_id"],
                    raw_payload_ref=r["raw_payload_ref"],
                )
                db.add(rec)
                s = db.query(models.TransformerSensor).filter_by(id=r["sensor_id"]).first()
                if s:
                    s.last_seen_at = now
                    s.quality_state = r["quality"]
                total_ingested += 1
            db.commit()
        return {"status": "success", "batches": batches, "readings_ingested": total_ingested}
    finally:
        db.close()


def simulate_http(
    endpoint: str,
    key: str,
    batches: int = 1,
    inject_anomaly: bool = False,
) -> dict:
    """Send simulated telemetry payloads to the HTTP Ingestion API."""
    import urllib.request
    import urllib.error

    db = SessionLocal()
    try:
        readings = generate_transformer_telemetry_batch(db, inject_anomaly=inject_anomaly)
    finally:
        db.close()

    payload = json.dumps({"readings": readings}).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Telemetry-Ingest-Key": key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"status": "ok", "http_status": resp.status, "response": data}
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8")
        return {"status": "error", "http_status": exc.code, "error": err_body}


def main():
    parser = argparse.ArgumentParser(description="Simulate Phase 12 DTR telemetry readings")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8000/transformers/telemetry")
    parser.add_argument("--key", default=settings.telemetry_ingest_secret)
    parser.add_argument("--batches", type=int, default=1)
    parser.add_argument("--direct-db", action="store_true", help="Write directly to DB instead of HTTP")
    parser.add_argument("--inject-anomaly", action="store_true", help="Inject overload and high temperature")

    args = parser.parse_args()

    if args.direct_db:
        res = simulate_direct_db(batches=args.batches, inject_anomaly=args.inject_anomaly)
        print(f"[Direct DB] {res['readings_ingested']} telemetry readings committed across {args.batches} batch(es).")
    else:
        print(f"[HTTP] Sending telemetry batch to {args.endpoint}...")
        res = simulate_http(args.endpoint, args.key, batches=args.batches, inject_anomaly=args.inject_anomaly)
        print(f"[HTTP Result] {res}")


if __name__ == "__main__":
    main()

