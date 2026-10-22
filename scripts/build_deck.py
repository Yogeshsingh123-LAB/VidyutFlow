#!/usr/bin/env python3
"""Build the PS000125 defence deck (WORK_PLAN 3.1) from docs/DECK_OUTLINE.md.

Output: docs/deck/VidyutFlow_PS000125.pptx (regenerate after outline edits).
Usage: python3 scripts/build_deck.py
"""
import os

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

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


def add_title(slide, text, size=30):
    box = slide.shapes.add_textbox(Inches(0.6), Inches(0.35), Inches(12.1), Inches(1.0))
    tf = box.text_frame
    tf.text = text
    p = tf.paragraphs[0]
    p.font.size = Pt(size)
    p.font.bold = True
    p.font.color.rgb = FG


def add_body(slide, lines, top=1.5, size=16):
    box = slide.shapes.add_textbox(Inches(0.6), Inches(top), Inches(12.1), Inches(5.4))
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

    # 1 Title
    s = prs.slides.add_slide(blank); style_slide(s)
    add_body(s, [
        ("VidyutFlow", FG, True, 0),
        ("Cloud-to-Edge Orchestration for Power Utilities", ACCENT, True, 0),
        ("“Enter Once, Use Everywhere”", FG, False, 0),
        ("", FG, False, 0),
        ("PS000125 · Future-Ready, Secure and Intelligent IT Infrastructure &", MUTED, False, 0),
        ("User-Friendly ERP/Portal Ecosystem · Uttar Gujarat Vij Company Ltd (UGVCL)", MUTED, False, 0),
        ("Seva First Innovation Challenge · Team: Yogesh (Lead) · Utsav · Aakash · Sandip · Arnav", MUTED, False, 0),
    ], top=1.8, size=24)
    notes(s, "30-second opener: one flow that removes re-entry, manual routing and blind SLA firefighting — with honest AI that assists, never decides.")

    # 2 Problem
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "The problem — PS000125 pain points")
    add_body(s, [
        ("Same applicant details re-typed across ERP, portals and field systems", FG, True, 0),
        ("Requests moved manually between desks — routing takes hours (planning assumption), files stall", FG, False, 0),
        ("Field work stops without network; naive re-sync creates duplicates", FG, False, 0),
        ("SLA breaches discovered after the deadline; consumers visit offices for status", FG, False, 0),
        ("", FG, False, 0),
        ("PS points addressed head-on: 1, 2, 3, 4, 5, 8, 9, 11 (full map: REQUIREMENT_MAPPING.md)", MUTED, False, 0),
    ], size=18)
    notes(s, "Name PS points verbally. The 4-8h routing figure is a design-document planning assumption — label it if asked.")

    # 3 One flow
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "VidyutFlow — one click-and-get-work-done flow")
    add_body(s, [
        ("SUBMIT → VALIDATE → CLASSIFY (ML) → SLA-RISK (ML) → ROUTE & ASSIGN → FIELD (offline) → DECIDE", ACCENT, True, 0),
        ("", FG, False, 0),
        ("Consumer submits once — the SAME record feeds officer queue, engineer task, admin KPIs", FG, False, 0),
        ("Rule validation + ML triage run automatically; SLA clock starts at submit", FG, False, 0),
        ("Field engineer works offline; sync is idempotent (each UUID accepted once)", FG, False, 0),
        ("The officer approves/rejects — every action is audit-logged", FG, True, 0),
    ], size=17)
    notes(s, "Emphasise: ML triages and explains; the officer decides. Core invariant.")

    # 4 Architecture
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Architecture — built (color) vs roadmap (grey)")
    img = os.path.join(ASSETS, "architecture.png")
    if os.path.exists(img):
        s.shapes.add_picture(img, Inches(1.2), Inches(1.35), width=Inches(10.9))
    notes(s, "Point at the grey dashed box FIRST: everything grey is honestly roadmap. API contracts stay stable while engines change.")

    # 5 Workflow demo
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Workflow demo — the real backend, not mockups")
    add_body(s, [
        ("1 · Consumer wizard submit → live API returns ML category/severity + SLA risk in the toast", FG, False, 0),
        ("2 · Officer Live Request Queue — real rows, auto-refresh 45s, SLA-risk reasons visible", FG, False, 0),
        ("3 · Management/Admin Live Workflow KPIs + SLA-Risk Watchlist (model output)", FG, False, 0),
        ("4 · Server-side alert centre: notifications on submit / status change / field sync", FG, False, 0),
        ("", FG, False, 0),
        ("Screenshots pack: Utsav (before video shoot) · live demo path: docs/DEMO_SCRIPT.md", MUTED, False, 0),
    ], size=17)
    notes(s, "Say: 'this is the live API — one credential set covers portal and API'. Screenshot placeholders to be filled by Utsav.")

    # 6 Offline
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Offline sync & de-duplication — plus backup/restore")
    add_body(s, [
        ("Field PWA queues inspections with UUIDv4 keys while offline (airplane mode)", FG, False, 0),
        ("Sync is JWT-authenticated; the server accepts each UUID exactly once", FG, False, 0),
        ("Sync twice → duplicate:true, no second row (proven by regression test + demo)", FG, False, 0),
        ("", FG, False, 0),
        ("Backup → checksum verify → tamper-reject → wipe → restore → live-serve drill: PASS", ACCENT, True, 0),
        ("Evidence: docs/verification/r4-backup-restore.txt", MUTED, False, 0),
    ], size=17)
    notes(s, "Live the demo step: airplane-mode → queue → sync → sync again. Then mention the restore drill as the data-permanence story.")

    # 7 AI honest
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "AI — honest by design")
    add_body(s, [
        ("Two small scikit-learn models: category/severity classifier + SLA-breach risk with REASONS", FG, False, 0),
        ("TF-IDF policy assistant over 3 policy extracts — answers cite sources", FG, False, 0),
        ("SLA-Risk Watchlist puts model output + reasons where officers act", FG, False, 0),
        ("", FG, False, 0),
        ("SYNTHETIC training data · triage probabilities, not verdicts · officer decides, always", AMBER, True, 0),
        ("30-second honesty script: docs/ML_REPORT.md", MUTED, False, 0),
    ], size=17)
    notes(s, "Say the honesty script VERBATIM from ML_REPORT.md. Safety guardrail escalates unknown danger phrasing conservatively.")

    # 8 Security
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Security — and practical accessibility")
    add_body(s, [
        ("JWT + RBAC + assignment/zone scoping (fail-closed) · bcrypt (72-byte safe) · CORS allowlist", FG, False, 0),
        ("Tamper-evident audit log: sha256 hash chain + admin verify endpoint", FG, False, 0),
        ("Login throttle (20/min/IP) · security headers · production guards reject dev secrets & demo data", FG, False, 0),
        ("One credential set for portal + API; browser state grants nothing", FG, False, 0),
        ("", FG, False, 0),
        ("Known prototype gaps and their one-line defences: SECURITY.md", MUTED, False, 0),
    ], size=16)
    notes(s, "If challenged on localStorage JWT: 'documented prototype trade-off; production moves to HttpOnly cookies — listed in SECURITY.md'.")

    # 9 Results
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Results — on SYNTHETIC data (labelled)")
    img1 = os.path.join(ASSETS, "ml_confusion_matrices.png")
    img2 = os.path.join(ASSETS, "ml_risk_distribution.png")
    if os.path.exists(img1):
        s.shapes.add_picture(img1, Inches(0.5), Inches(1.4), width=Inches(6.2))
    if os.path.exists(img2):
        s.shapes.add_picture(img2, Inches(6.9), Inches(1.4), width=Inches(6.2))
    add_body(s, [
        ("Category 0.733 vs 0.185 baseline · Severity 0.846 vs 0.328 · SLA 0.794 vs 0.625 (n=195/195/160)", FG, True, 0),
        ("Latency measured LOCAL, SYNTHETIC: p50 3.1 ms · p95 4.5 ms · 100 reads · 0 errors — not a UGVCL figure", AMBER, False, 0),
    ], top=5.6, size=13)
    notes(s, "Never say 'accuracy is X for UGVCL'. Reproduce: make train (byte-identical metrics.json).")

    # 10 Requirements map
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Requirement → solution map (PS000125)")
    add_body(s, [
        ("12 problem points: 7 fully built · 4 lite/partial · 1 proposal-only (hardware)", ACCENT, True, 0),
        ("14 expected outcomes: 12 met · 1 measured-claim kept as target (productivity) · 1 hardware/DR as proposal", ACCENT, True, 0),
        ("", FG, False, 0),
        ("Every row has named evidence in REQUIREMENT_MAPPING.md (built / lite / roadmap)", FG, False, 0),
        ("We never claim a roadmap item as built — that rule is written into the repo", FG, False, 0),
    ], size=17)
    notes(s, "This slide pre-empts 'did you cover our PS?'. Pull up REQUIREMENT_MAPPING.md if asked for any row.")

    # 11 Roadmap
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Roadmap & scale-up (contracts stay stable)")
    add_body(s, [
        ("1. Legacy ERP adapters (billing/HR/SCADA wrappers) — first item", FG, False, 0),
        ("2. Kafka / Temporal orchestration · WebSockets · GraphQL + GIS", FG, False, 0),
        ("3. Flutter/Couchbase edge client · on-device inference", FG, False, 0),
        ("4. Fine-tuned LLM in VPC · Zero Trust · multi-AZ DR · Vault · WAF · SSO", FG, False, 0),
        ("5. Hardware modernisation tiers — costed proposal (INFRASTRUCTURE_ROADMAP.md)", FG, False, 0),
        ("", FG, False, 0),
        ("The frozen API contract (20 ops) lets engines change without touching the workflow", MUTED, False, 0),
    ], size=16)
    notes(s, "Answer to outcome 8/10 lives here: hardware and DR are a proposal, the software runs on Compose today.")

    # 12 Team & next
    s = prs.slides.add_slide(blank); style_slide(s)
    add_title(s, "Team & next steps")
    add_body(s, [
        ("R1 Backend & Workflow — Yogesh (Lead) · R2 Frontend & PWA — Utsav", FG, False, 0),
        ("R3 ML & AI — Aakash · R4 DevOps/Security/QA — Sandip · R5 Docs & Demo — Arnav", FG, False, 0),
        ("", FG, False, 0),
        ("Pilot plan: governed UGVCL data → retrain → re-baseline → before/after timing study", ACCENT, True, 0),
        ("That study is how outcome 13 (productivity) becomes a measured number", FG, False, 0),
        ("", FG, False, 0),
        ("Ask: approval for a scoped pilot on one subdivision's new-connection flow", FG, True, 0),
    ], size=17)
    notes(s, "Close on the measurement plan, not on claims. Q&A sheet: docs/DEFENCE_QA.md — every member has a copy.")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    build()
