"""Seed script for Phase 12 demo transformers and sensor instruments.

Seeds 3 DEMO- transformers across North, South, and Central zones, along with
their respective sensor instruments (LOAD_KVA, OIL_TEMP, WINDING_TEMP,
CURRENT R/Y/B, and VOLTAGE) for telemetry simulation and predictive maintenance.
"""
import os
import sys
import types
from datetime import date, datetime, timezone
from pathlib import Path

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

from app.db import SessionLocal
from app import models

DEMO_TRANSFORMERS = [
    {
        "utility_asset_code": "DEMO-TR-NORTH-01",
        "feeder_id": "FEEDER-11KV-NORTH-01",
        "substation_id": "SUB-66KV-MEHSANA-01",
        "zone": "North",
        "rated_kva": 315.0,
        "phases": 3,
        "voltage_class": "11kV/415V",
        "commissioning_date": date(2021, 3, 15),
        "manufacturer": "Voltamp Transformers Ltd",
        "serial_number": "VT-2021-N315-001",
        "latitude": 23.5880,
        "longitude": 72.3693,
        "coordinate_source": "FIELD_GPS",
        "status": "IN_SERVICE",
    },
    {
        "utility_asset_code": "DEMO-TR-SOUTH-01",
        "feeder_id": "FEEDER-11KV-SOUTH-01",
        "substation_id": "SUB-66KV-PALANPUR-01",
        "zone": "South",
        "rated_kva": 315.0,
        "phases": 3,
        "voltage_class": "11kV/415V",
        "commissioning_date": date(2020, 8, 20),
        "manufacturer": "ABB India Ltd",
        "serial_number": "ABB-2020-S315-042",
        "latitude": 24.1724,
        "longitude": 72.4346,
        "coordinate_source": "FIELD_GPS",
        "status": "IN_SERVICE",
    },
    {
        "utility_asset_code": "DEMO-TR-CENTRAL-01",
        "feeder_id": "FEEDER-11KV-CENTRAL-01",
        "substation_id": "SUB-66KV-GANDHINAGAR-01",
        "zone": "Central",
        "rated_kva": 500.0,
        "phases": 3,
        "voltage_class": "11kV/415V",
        "commissioning_date": date(2019, 11, 10),
        "manufacturer": "Schneider Electric India",
        "serial_number": "SE-2019-C500-108",
        "latitude": 23.2156,
        "longitude": 72.6369,
        "coordinate_source": "SURVEY",
        "status": "IN_SERVICE",
    },
]

SENSOR_SPECS = [
    ("LOAD_KVA", "kVA", "3P", "IOT", "GOOD"),
    ("OIL_TEMP", "degC", "TOP", "IOT", "GOOD"),
    ("WINDING_TEMP", "degC", "HOT", "IOT", "GOOD"),
    ("CURRENT", "A", "R", "AMI", "GOOD"),
    ("CURRENT", "A", "Y", "AMI", "GOOD"),
    ("CURRENT", "A", "B", "AMI", "GOOD"),
    ("VOLTAGE", "V", "RY", "AMI", "GOOD"),
]


def seed_demo_transformers(db) -> dict:
    now_utc = datetime.now(timezone.utc)
    seeded_tr = 0
    seeded_sensors = 0

    for tr_data in DEMO_TRANSFORMERS:
        tr = db.query(models.TransformerAsset).filter(
            models.TransformerAsset.utility_asset_code == tr_data["utility_asset_code"]
        ).first()

        if not tr:
            tr = models.TransformerAsset(
                utility_asset_code=tr_data["utility_asset_code"],
                feeder_id=tr_data["feeder_id"],
                substation_id=tr_data["substation_id"],
                zone=tr_data["zone"],
                rated_kva=tr_data["rated_kva"],
                phases=tr_data["phases"],
                voltage_class=tr_data["voltage_class"],
                commissioning_date=tr_data["commissioning_date"],
                manufacturer=tr_data["manufacturer"],
                serial_number=tr_data["serial_number"],
                latitude=tr_data["latitude"],
                longitude=tr_data["longitude"],
                coordinate_source=tr_data["coordinate_source"],
                coordinate_verified_at=now_utc,
                status=tr_data["status"],
                metadata_version=1,
            )
            db.add(tr)
            db.flush()
            seeded_tr += 1

        for s_type, s_unit, s_phase, s_source, s_quality in SENSOR_SPECS:
            existing_s = db.query(models.TransformerSensor).filter(
                models.TransformerSensor.transformer_id == tr.id,
                models.TransformerSensor.sensor_type == s_type,
                models.TransformerSensor.channel_phase == s_phase,
            ).first()

            if not existing_s:
                s = models.TransformerSensor(
                    transformer_id=tr.id,
                    sensor_type=s_type,
                    unit=s_unit,
                    channel_phase=s_phase,
                    calibration_at=now_utc,
                    last_seen_at=now_utc,
                    source_system=s_source,
                    quality_state=s_quality,
                    active=True,
                )
                db.add(s)
                seeded_sensors += 1

    db.commit()
    return {"transformers_seeded": seeded_tr, "sensors_seeded": seeded_sensors}


def main():
    db = SessionLocal()
    try:
        res = seed_demo_transformers(db)
        print(f"Seed complete: {res['transformers_seeded']} transformers, {res['sensors_seeded']} sensors added.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
