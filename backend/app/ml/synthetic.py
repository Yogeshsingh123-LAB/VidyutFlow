"""Synthetic data generators. SYNTHETIC ONLY — never present as UGVCL real data."""
import random

CATEGORIES = {
 "NEW_CONNECTION": ["need new electricity connection for my home", "applying for a new connection for shop",
   "new meter connection required for new house", "want domestic connection load 3 kw"],
 "OUTAGE": ["no power since morning in our street", "power cut for 6 hours no electricity",
   "supply failed transformer sparking and outage", "frequent power cuts every night"],
 "BILLING": ["electricity bill is too high this month", "wrong bill amount charged extra",
   "bill not generated for two months", "payment paid but bill shows pending"],
 "METER_FAULT": ["meter is burnt and not working", "meter reading is stuck display blank",
   "meter running very fast faulty meter", "meter damaged need replacement"],
 "SAFETY": ["live wire hanging near house danger", "electric pole leaning sparks from wire",
   "short circuit fire risk in meter box", "exposed cable on road safety hazard"],
 "OTHER": ["change name on my account", "shift meter to another wall",
   "update mobile number in records", "general enquiry about tariff"],
}
SEVERITY_HINTS = {
 "SAFETY": "CRITICAL", "OUTAGE": "HIGH", "METER_FAULT": "MEDIUM",
 "BILLING": "LOW", "NEW_CONNECTION": "MEDIUM", "OTHER": "LOW",
}
SEV_WORDS = {"CRITICAL": ["fire", "sparking", "danger", "live wire"], "HIGH": ["since morning", "6 hours", "many houses"],
             "MEDIUM": ["need", "required", "damaged"], "LOW": ["enquiry", "update", "question"]}

def make_classifier_rows(n_per_class=120, seed=42):
    rng = random.Random(seed); rows = []
    fillers = ["please help", "urgent", "at my address", "kindly resolve", "from yesterday", ""]
    for cat, templates in CATEGORIES.items():
        for _ in range(n_per_class):
            text = rng.choice(templates)
            if rng.random() < .5: text += " " + rng.choice(fillers)
            sev = SEVERITY_HINTS[cat]
            # inject severity signal words sometimes
            if rng.random() < .4: text += " " + rng.choice(SEV_WORDS.get(sev, [""]))
            rows.append({"text": text.strip(), "category": cat, "severity": sev})
    rng.shuffle(rows); return rows

def make_sla_rows(n=800, seed=42):
    """Label is a noisy rule over workload/completeness — deliberately learnable, synthetic."""
    rng = random.Random(seed); rows = []
    for _ in range(n):
        load_kw = round(rng.choice([1,2,3,5,7,10,15,25]), 1)
        category = rng.choice(list(CATEGORIES)); severity = SEVERITY_HINTS[category]
        docs = rng.random() > .25; zone_load = rng.randint(0, 30)  # pending requests in zone
        weekend = rng.random() < .28
        score = (0.04*zone_load + (0.9 if not docs else 0) + (0.5 if load_kw >= 10 else 0)
                 + (0.6 if severity in ("HIGH","CRITICAL") else 0) + (0.4 if weekend else 0) + rng.gauss(0,.5))
        rows.append({"requested_load_kw": load_kw, "category": category, "severity": severity,
                     "documents_complete": int(docs), "zone_pending": zone_load,
                     "is_weekend_submission": int(weekend), "breach": int(score > 1.6)})
    return rows

SLA_FEATURES = ["requested_load_kw", "documents_complete", "zone_pending", "is_weekend_submission"]
