"""Synthetic data generators. SYNTHETIC ONLY — never present as UGVCL real data."""
import math
import random

CATEGORIES = {
    "NEW_CONNECTION": [
        "need new electricity connection for my home",
        "applying for a new connection for shop",
        "new meter connection required for new house",
        "want domestic connection load 3 kw",
        "requesting new residential single phase power supply connection",
        "apply for commercial three phase electricity service connection",
        "new agricultural borewell power connection sanction needed",
        "need temporary power supply for plot construction work",
        "separate sub connection requested for first floor tenant unit",
    ],
    "OUTAGE": [
        "no power since morning in our street",
        "power cut for 6 hours no electricity",
        "supply failed transformer sparking and outage",
        "frequent power cuts every night",
        "complete blackout in society feeder tripped no electricity supply",
        "phase failure no power supply in entire lane since afternoon",
        "11kv feeder outage electricity off across village",
        "dim voltage and single phasing issue in colony since evening",
        "underground feeder fault left shops without supply",
    ],
    "BILLING": [
        "electricity bill is too high this month",
        "wrong bill amount charged extra",
        "bill not generated for two months",
        "payment paid but bill shows pending",
        "abnormal spike in monthly electricity invoice tariff calculation error",
        "duplicate billing arrears shown after online upi bill payment",
        "incorrect slab energy charges billed on domestic electricity bill",
        "rooftop solar export units not credited in monthly statement",
        "security deposit interest not adjusted in annual statement",
    ],
    "METER_FAULT": [
        "meter is burnt and not working",
        "meter reading is stuck display blank",
        "meter running very fast faulty meter",
        "meter damaged need replacement",
        "digital smart meter lcd screen dead not recording units",
        "defective meter jumping readings rapidly needs testing and replacement",
        "meter terminal charred and seal broken meter replacement needed",
        "optical port communication failed during monthly reading visit",
        "pulse led blinking continuously even with main switch turned off",
    ],
    "SAFETY": [
        "live wire hanging near house danger",
        "electric pole leaning sparks from wire",
        "short circuit fire risk in meter box",
        "exposed cable on road safety hazard",
        "broken overhead conductor fallen on street danger of electrocution",
        "heavy sparking and smoke from distribution transformer safety emergency",
        "tilted electric pole with low hanging live line danger to public",
        "earthing leakage giving mild shock on wet compound wall",
        "tree branches touching overhead conductor creating flashover",
    ],
    "OTHER": [
        "change name on my account",
        "shift meter to another wall",
        "update mobile number in records",
        "general enquiry about tariff",
        "transfer ownership name on electricity connection after property sale",
        "request to relocate service cable and meter box within compound",
        "update registered email and contact phone in consumer profile",
        "request duplicate NOC certificate for bank housing loan",
        "closure and permanent disconnection request for vacated shop",
    ],
}

SEVERITY_HINTS = {
    "SAFETY": "CRITICAL",
    "OUTAGE": "HIGH",
    "METER_FAULT": "MEDIUM",
    "BILLING": "LOW",
    "NEW_CONNECTION": "MEDIUM",
    "OTHER": "LOW",
}

SEV_WORDS = {
    "CRITICAL": ["fire", "sparking", "danger", "live wire", "shock hazard", "emergency"],
    "HIGH": ["since morning", "6 hours", "many houses", "entire lane", "blackout"],
    "MEDIUM": ["need", "required", "damaged", "application", "replacement"],
    "LOW": ["enquiry", "update", "question", "invoice", "profile"],
}


def make_classifier_rows(n_per_class=160, seed=42):
    rng = random.Random(seed)
    rows = []
    fillers = ["please help", "urgent", "at my address", "kindly resolve", "from yesterday", ""]
    for cat, templates in CATEGORIES.items():
        for i in range(n_per_class):
            template_index = i % len(templates)
            text = templates[template_index]
            if rng.random() < 0.5:
                text += " " + rng.choice(fillers)
            sev = SEVERITY_HINTS[cat]
            if rng.random() < 0.45:
                text += " " + rng.choice(SEV_WORDS.get(sev, [""]))
            rows.append(
                {
                    "text": text.strip(),
                    "category": cat,
                    "severity": sev,
                    "template_group": f"{cat}:{template_index}",
                }
            )
    rng.shuffle(rows)
    return rows


def make_sla_rows(n=1000, seed=42):
    """Label is a noisy rule over workload/completeness — deliberately learnable, synthetic."""
    rng = random.Random(seed)
    rows = []
    for _ in range(n):
        load_kw = round(rng.choice([1, 2, 3, 5, 7, 10, 15, 25]), 1)
        category = rng.choice(list(CATEGORIES))
        severity = SEVERITY_HINTS[category]
        docs = rng.random() > 0.25
        zone_load = rng.randint(0, 30)
        weekend = rng.random() < 0.28
        score = (
            0.045 * zone_load
            + (0.95 if not docs else 0)
            + (0.55 if load_kw >= 10 else 0)
            + (0.65 if severity in ("HIGH", "CRITICAL") else 0)
            + (0.40 if weekend else 0)
            + rng.gauss(0, 0.38)
        )
        rows.append(
            {
                "requested_load_kw": load_kw,
                "category": category,
                "severity": severity,
                "documents_complete": int(docs),
                "zone_pending": zone_load,
                "is_weekend_submission": int(weekend),
                "breach": int(score > 1.55),
            }
        )
    return rows


SLA_FEATURES = ["requested_load_kw", "documents_complete", "zone_pending", "is_weekend_submission"]


def compute_rgpu_slab_inr(units_kwh: float) -> float:
    """Illustrative UGVCL domestic RGPU tiered energy charge helper (synthetic check)."""
    u = max(0.0, float(units_kwh))
    total = 0.0
    tiers = [(50.0, 3.05), (50.0, 3.50), (150.0, 4.15), (float("inf"), 5.20)]
    rem = u
    for width, rate in tiers:
        if rem <= 0:
            break
        take = min(rem, width)
        total += take * rate
        rem -= take
    return round(total, 2)


BILLING_ANOMALY_FEATURES = [
    "consumption_ratio",
    "kwh_per_kw",
    "slab_discrepancy_pct",
    "zero_read_flag",
]


def make_billing_anomaly_rows(n=900, seed=42):
    """Synthetic billing records (normal consumption vs spikes, stuck meters & slab mismatches)."""
    rng = random.Random(seed)
    rows = []
    for i in range(n):
        sanctioned_kw = rng.choice([2.0, 3.0, 5.0, 7.5, 10.0, 15.0])
        hist_avg = round(sanctioned_kw * rng.uniform(55.0, 95.0), 1)
        is_anom = i % 6 == 0  # ~16.7% synthetic anomalies for held-out evaluation
        if not is_anom:
            units = max(12.0, round(hist_avg * rng.uniform(0.75, 1.32), 1))
            expected_inr = compute_rgpu_slab_inr(units)
            billed_inr = round(expected_inr * rng.uniform(0.98, 1.02), 2)
        else:
            kind = i % 3
            if kind == 0:
                # Consumption spike / meter jump
                units = round(hist_avg * rng.uniform(2.6, 4.5), 1)
                expected_inr = compute_rgpu_slab_inr(units)
                billed_inr = expected_inr
            elif kind == 1:
                # Stuck / bypassed zero-reading meter despite active load
                units = round(rng.uniform(0.0, 2.0), 1)
                expected_inr = compute_rgpu_slab_inr(units)
                billed_inr = expected_inr
            else:
                # Invoice-to-slab tariff calculation mismatch
                units = round(hist_avg * rng.uniform(0.9, 1.2), 1)
                expected_inr = compute_rgpu_slab_inr(units)
                billed_inr = round(expected_inr * rng.uniform(1.38, 1.85), 2)

        ratio = round(units / max(hist_avg, 1.0), 4)
        kwh_per_kw = round(units / max(sanctioned_kw, 0.5), 4)
        slab_disc_pct = round(abs(billed_inr - expected_inr) / max(expected_inr, 25.0), 4)
        zero_flag = int(units <= 3.0 and hist_avg >= 60.0)
        rows.append(
            {
                "units_kwh": units,
                "historical_avg_kwh": hist_avg,
                "sanctioned_load_kw": sanctioned_kw,
                "billed_energy_inr": billed_inr,
                "expected_slab_inr": expected_inr,
                "consumption_ratio": ratio,
                "kwh_per_kw": kwh_per_kw,
                "slab_discrepancy_pct": slab_disc_pct,
                "zero_read_flag": zero_flag,
                "is_anomaly": int(is_anom),
            }
        )
    rng.shuffle(rows)
    return rows


LOAD_FORECAST_FEATURES = [
    "hour",
    "sin_hour",
    "cos_hour",
    "ambient_temp_c",
    "zone_idx",
    "rated_kva",
    "pending_load_kw",
]


def make_load_forecast_rows(n=1200, seed=42):
    """Synthetic hourly 11kV feeder / DTR transformer kVA load dataset across 5 UGVCL zones."""
    rng = random.Random(seed)
    rows = []
    zone_factors = [1.05, 0.96, 0.92, 0.88, 1.10]  # North, South, East, West, Central
    for _ in range(n):
        hour = rng.randint(0, 23)
        temp_c = round(rng.uniform(24.0, 44.0), 1)
        zone_idx = rng.randint(0, 4)
        rated_kva = rng.choice([100.0, 200.0, 315.0, 500.0])
        pending_kw = round(rng.uniform(0.0, 85.0), 1)

        # Dual-peak utility load profile (morning agricultural/industrial + evening domestic cooling)
        morning_peak = 0.22 * math.exp(-((hour - 10.0) ** 2) / 8.0)
        evening_peak = 0.34 * math.exp(-((hour - 20.0) ** 2) / 7.5)
        temp_boost = max(0.0, (temp_c - 30.0) * 0.014)
        utilization = (
            0.40 + morning_peak + evening_peak + temp_boost
        ) * zone_factors[zone_idx] + (pending_kw / max(rated_kva, 100.0)) * 0.18
        kva = round(
            max(15.0, rated_kva * utilization + rng.gauss(0.0, rated_kva * 0.025)),
            2,
        )
        rows.append(
            {
                "hour": hour,
                "sin_hour": round(math.sin(2 * math.pi * hour / 24.0), 5),
                "cos_hour": round(math.cos(2 * math.pi * hour / 24.0), 5),
                "ambient_temp_c": temp_c,
                "zone_idx": zone_idx,
                "rated_kva": rated_kva,
                "pending_load_kw": pending_kw,
                "load_kva": kva,
            }
        )
    return rows
