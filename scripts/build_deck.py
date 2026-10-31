#!/usr/bin/env python3
"""Build the PS000125 defence deck from docs/DECK_OUTLINE.md.

Output: docs/deck/VidyutFlow_PS000125.pptx (regenerate after outline/metric edits).
Usage: python3 scripts/build_deck.py
"""
import os

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "docs", "assets")
OUT = os.path.join(ROOT, "docs", "deck", "VidyutFlow_PS000125.pptx")

BG = RGBColor(0x0B, 0x12, 0x20)
FG = RGBColor(0xE2, 0xE8, 0xF0)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
ACCENT = RGBColor(0x34, 0xD3, 0x99)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)


def style_slide(slide):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = BG


def add_title(slide, text, size=29):
    box = slide.shapes.add_textbox(Inches(0.6), Inches(0.35), Inches(12.1), Inches(1.0))
    tf = box.text_frame
    tf.text = text
    p = tf.paragraphs[0]
    p.font.size = Pt(size)
    p.font.bold = True
    p.font.color.rgb = FG


def add_body(slide, lines, top=1.45, size=16):
    box = slide.shapes.add_textbox(Inches(0.6), Inches(top), Inches(12.1), Inches(5.5))
    tf = box.text_frame
    tf.word_wrap = True
    for i, (line, color, bold, indent) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.size = Pt(size if indent == 0 else size - 2)
        p.font.bold = bold
        p.font.color.rgb = color
        p.level = indent
        p.space_after = Pt(6)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    # 1 Title & Vision
    s = prs.slides.add_slide(blank); style_slide(s)
    add_body(s, [
        ("VidyutFlow", FG, True, 0),
        ("Cloud-to-Edge Orchestration, Predictive AI & ERP Gateway for Power Utilities", ACCENT, True, 0),
        ("“Enter Once, Propagate Everywhere”", FG, False, 0),
        ("", FG, False, 0),
        ("PS000125 · Future-Ready, Secure and Intelligent IT Infrastructure &", MUTED, False, 0),
        ("User-Friendly ERP/Portal Ecosystem · Uttar Gujarat Vij Company Ltd (UGVCL)", MUTED, False, 0),
        ("Seva First Innovation Challenge · Team: Yogesh (Lead) · Utsav · Aakash · Sandip · Arnav", MUTED, False, 0),
    ], top=1.7, size=23)
    notes(s, "30-second opener: non-invasive orchestration across citizen portal, field PWA, and simulated ERP adapters — AI advises, officers decide.")

    # 2 The UGVCL Silo Problem
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "The problem — PS000125 operational silos")
    add_body(s, [
        ("Disconnected Citizen Portal ↔ SAP Finance/IS-U ↔ e-Urja Billing ↔ 1912 Grievance CRM", FG, True, 0),
        ("Applicant details re-keyed across desks; manual routing stalls files", FG, False, 0),
        ("Rural North Gujarat 2G/4G dead-zones halt field inspections; naive retries duplicate records", FG, False, 0),
        ("Reactive SLA breach discovery & legacy infrastructure / DR / security gaps", FG, False, 0),
        ("", FG, False, 0),
        ("Full 12-point problem & 14-outcome coverage matrix: docs/REQUIREMENT_MAPPING.md", MUTED, False, 0),
    ], size=17)
    notes(s, "Emphasize that PS000125 covers BOTH software orchestration AND IT infrastructure/DR/security.")

    # 3 Non-Invasive ERP Gateway (Simulated / OData v4-Compatible)
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Non-invasive ERP gateway (OData v4-compatible, simulated)")
    add_body(s, [
        ("NEVER rips or replaces existing DISCOM core systems (replaces_existing_erp = False)", ACCENT, True, 0),
        ("", FG, False, 0),
        ("12 citizen fields entered once → 0 staff re-typed fields across workflow & gateway", FG, False, 0),
        ("Simulated OData v4-compatible SAP S/4HANA IS-U adapter (/v1/erp/sap-odata/*)", FG, False, 0),
        ("3-system fan-out (/v1/erp/gateway/propagate/{id}) → simulated SAP + e-Urja CIS + 1912 CRM", FG, False, 0),
        ("Master-data drift detection & 1-click reconciliation (/v1/erp/reconcile)", FG, True, 0),
    ], size=16)
    notes(s, "Always state clearly in viva: the ERP gateway is OData v4-compatible and runs against a deterministic simulated in-repo target today — ready for UGVCL sandbox credentials, never claimed as live-integrated.")

    # 4 Cloud-to-Edge IT Infrastructure
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Cloud-to-edge IT infrastructure & costed BOM")
    img = os.path.join(ASSETS, "architecture.png")
    if os.path.exists(img):
        s.shapes.add_picture(img, Inches(1.2), Inches(1.3), width=Inches(9.6))
    add_body(s, [
        ("Substation Edge: 500× RPi4 + Quectel EC200U-CN Dual-SIM 4G (₹8,000 × 500 = ₹40L) · MPLS + FortiGate 60F SD-WAN · Tiers: ₹14.80L / ₹1.18Cr / ₹7.45Cr", ACCENT, True, 0),
    ], top=6.35, size=13)
    notes(s, "Vendor SKUs and datasheets documented in docs/INFRASTRUCTURE_BOM_SOURCES.md (Element14, Evelta, Dell R650xs, FortiGate 60F).")

    # 5 Live Multi-Portal & Offline Sync Demo
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Multi-portal workflow & idempotent offline field sync")
    add_body(s, [
        ("5 RBAC portals (Consumer, Field Engineer, Sub-Divisional Officer, Management, IT Admin)", FG, False, 0),
        ("4 languages (English, Gujarati, Hindi, Marathi) + 7 configurable utility workflows", FG, False, 0),
        ("Field PWA queues inspections offline in IndexedDB with UUIDv4 client_uuid keys", FG, False, 0),
        ("Replay-safe sync (/v1/requests/field-sync): duplicate replay returns duplicate:true, 0 extra rows", ACCENT, True, 0),
        ("Server-side SLA alert engine (/v1/notifications/evaluate-alerts) + 1-click triage", FG, False, 0),
    ], size=16)
    notes(s, "Demo airplane mode -> queue field inspection -> reconnect -> sync twice -> prove idempotency.")

    # 6 Live Cold-Start <60s DR Failover Proof
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Cold-start <60s primary → hot-standby DR failover")
    add_body(s, [
        ("Live API (POST /v1/system/dr-failover-drill) & cold-start script (cold_start_dr_proof.py)", FG, True, 0),
        ("", FG, False, 0),
        ("1 · Boot fresh DB & submit live citizen request (zero manual container pre-setup)", FG, False, 0),
        ("2 · Replicate SHA-256 checksummed snapshot to isolated hot-standby vault", FG, False, 0),
        ("3 · Destroy primary DB → verify SHA-256 → promote standby → PRAGMA integrity_check = ok", FG, False, 0),
        ("Measured local SQLite RTO: ~3.5 ms (< 60s target) · 0 records lost", ACCENT, True, 0),
    ], size=16)
    notes(s, "Evidence in docs/verification/r4-cold-start-dr-proof.txt and r4-dr-failover-drill.txt.")

    # 7 5-Model Predictive AI Suite
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "5-model predictive AI suite — advisory by design")
    add_body(s, [
        ("1 · Category Classifier (TF-IDF + LogReg): 0.8824 unseen-template synthetic · 0.9074 (49/54) team-authored OOD sanity check", FG, False, 0),
        ("2 · Severity + Deterministic Safety Guardrail: 0.8750 balanced · 100% CRITICAL safety recall", FG, False, 0),
        ("3 · Cost-Sensitive SLA Breach Predictor (RandomForest, thr=0.38): 0.8913 breach recall (0.8350 acc)", FG, False, 0),
        ("4 · Billing Anomaly Detector (IsolationForest + GERC RGPU slab verifier): 0.9511 acc / 1.00 recall", FG, False, 0),
        ("5 · 24h Feeder/DTR Load Forecaster (GradientBoostingRegressor): R² = 0.9790 (MAE 8.89 kVA)", FG, False, 0),
        ("SYNTHETIC training data · models advise, human officers approve (models_can_approve_or_reject = False)", AMBER, True, 0),
    ], size=15)
    notes(s, "Be explicit: 0.8824 is held-out synthetic templates; 0.9074 (49/54) is our team-authored zero-overlap OOD sanity-check set grounded in public GERC/CGRF terminology, not independent utility data.")

    # 8 Hybrid AI Governance
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Hybrid AI — local TF-IDF RAG + optional Gemini")
    add_body(s, [
        ("Zero external LLM dependency for core triage, SLA risk, billing anomaly, or policy Q&A", ACCENT, True, 0),
        ("Backend /v1/assistant/chat: 100% local TF-IDF retrieval over policy docs + live zone-breach SQL", FG, False, 0),
        ("Portal /api/ai-chat: optional server-side Gemini (3,500 ms bound) → deterministic Grounded Engine fallback", FG, False, 0),
        ("Live AI Governance telemetry (/v1/assistant/ai-governance): drift, OOD load caps (>100 kW), human sign-off count", FG, False, 0),
    ], size=16)
    notes(s, "Works 100% air-gapped without GEMINI_API_KEY.")

    # 9 Defense-in-Depth Cybersecurity
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Defense-in-depth cybersecurity & encrypted KYC vault")
    add_body(s, [
        ("Zero localStorage tokens: HttpOnly; SameSite=Strict session cookie + verified in-memory bridge", FG, False, 0),
        ("Strict upload verification: %PDF-, PNG, JPEG & UTF-8 .txt magic-byte checks (blocks disguised EXEs)", ACCENT, True, 0),
        ("Always-on VFENC1 HKDF-SHA256 + AES-256-GCM vault encryption (uploads_encrypted/) + field cipher", FG, False, 0),
        ("Fork-proof SHA-256 hash-chained AuditLog (AuditChainHead) + ArcSight/Wazuh CEF:0 SIEM export", FG, False, 0),
        ("CSP, HSTS, X-Frame-Options: DENY, 100% parameterized ORM queries & 4-VLAN Zero-Trust design", FG, False, 0),
    ], size=15)
    notes(s, "Live verification endpoint: GET /v1/system/security-posture and tests/test_document_upload_validation.py.")

    # 10 Results (Synthetic & Team-Authored OOD — Labelled)
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "ML evaluation charts — SYNTHETIC data (labelled)")
    img1 = os.path.join(ASSETS, "ml_confusion_matrices.png")
    img2 = os.path.join(ASSETS, "ml_risk_distribution.png")
    if os.path.exists(img1):
        s.shapes.add_picture(img1, Inches(0.5), Inches(1.35), width=Inches(6.2))
    if os.path.exists(img2):
        s.shapes.add_picture(img2, Inches(6.9), Inches(1.35), width=Inches(6.2))
    add_body(s, [
        ("Unseen-template synthetic: Category 0.8824 (vs 0.1667) · Severity 0.8750 · SLA 0.8350 acc / 0.8913 recall", FG, True, 0),
        ("Team-authored 54-item OOD sanity check (0 synthetic overlap): 0.9074 acc (49/54) · 100% CRITICAL recall", AMBER, False, 0),
    ], top=5.65, size=13)
    notes(s, "Reproduce anytime via `make train`. Rolling runtime p50/p95/p99 latency is exposed live on GET /v1/system/performance.")

    # 11 QA Coverage & Phased UGVCL Rollout
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "100% API test coverage & phased UGVCL rollout")
    add_body(s, [
        ("124 backend pytest tests · 55 / 55 (100%) OpenAPI HTTP operations tested · 38 frontend test suites", ACCENT, True, 0),
        ("", FG, False, 0),
        ("Phase 1 — 1 Subdivision Pilot (₹14.80 Lakh): UGVCL sandbox OData credentials + governed historical ML retrain", FG, False, 0),
        ("Phase 2 — 1 Circle HA Deployment (₹1.18 Crore): PostgreSQL 16 streaming HA + 60 substation edge gateways", FG, False, 0),
        ("Phase 3 — Full DISCOM Scale-Out (₹7.45 Crore): 4 Circles, 500× RPi4 4G edge nodes, active-passive DC/DR", FG, False, 0),
    ], size=15)
    notes(s, "CI template at docs/ci.yml mirrors `make coverage`, `make train`, `make dr-proof`, and `make build`.")

    # 12 Team & Ownership
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Team ownership & pilot ask")
    add_body(s, [
        ("R1 Backend, Workflow & ERP Gateway — Yogesh (Lead) · R2 Multilingual Portals & Offline PWA — Utsav", FG, False, 0),
        ("R3 5-Model ML Suite & Policy RAG — Aakash · R4 Security, AES-256 Vault & DR — Sandip · R5 Infra BOM & QA — Arnav", FG, False, 0),
        ("", FG, False, 0),
        ("Pilot ask: 1 UGVCL subdivision sandbox + anonymized historical tickets to re-baseline productivity & SLA lift", ACCENT, True, 0),
        ("Full defence Q&A & module walkthroughs: docs/DEFENCE_QA.md & docs/TEAM_COMMIT_AND_VIVA_PLAN.md", MUTED, False, 0),
    ], size=16)
    notes(s, "Close on disciplined measurement and zero-disruption pilot deployment.")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    build()
