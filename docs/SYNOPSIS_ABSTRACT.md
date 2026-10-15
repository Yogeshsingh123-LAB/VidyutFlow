# Synopsis abstract (draft for portal — PS000125 verified against the official text, 15 Oct 2026)
**Problem ID:** PS000125 · **Industry:** Uttar Gujarat Vij Company Limited (UGVCL)
**Title:** Future-Ready, Secure and Intelligent IT Infrastructure & User-Friendly ERP/Portal Ecosystem for Automated and Hassle-Free Power Utility Services
**Resource person:** hmtcotech2@ugvcl.com · Official text: [PS000125_OFFICIAL.md](PS000125_OFFICIAL.md) · Mapping: [REQUIREMENT_MAPPING.md](REQUIREMENT_MAPPING.md)

**Problem.** UGVCL work is split across disconnected ERP/portal/field systems: repetitive data entry (point 1), limited integration (2), multiple interfaces/logins (3), manual routine work (4), connectivity delays (5), ageing infrastructure (6), security-vs-access balance (7), no intelligent alerts/tracking (8), unreliable offline sync (9), weak backup/DR (10), fragmented information for management and field users (11), and the need to stay AI/API/analytics-ready (12).

**Architecture (VidyutOS Lite — built).** A cloud-to-edge orchestration platform for utility services: one end-to-end new-connection flow. React/PWA front end (consumer, officer, engineer, admin) → FastAPI + PostgreSQL control plane (validate → auto-route by zone → assign → SLA tracking → audit log) → two small scikit-learn AI policies inside the same service (complaint/fault classification; SLA-breach risk with reasons) → TF-IDF RAG assistant over policy documents + live data queries → offline field (edge) client that queues work and syncs securely with UUID de-duplication. JWT+RBAC, bcrypt, CORS allowlist, Docker Compose, backup script. Hardware/DR scale-up is proposed in tiers, not claimed as built.

**Users served in the demo.** Primary: subdivision officers, field engineers, IT/admin and management (Fleet Management Console). Secondary: consumers/applicants. Contractors/agencies and government stakeholders are roadmap (scoped logins), stated as such.

**Impact (targets, not measured UGVCL results).** "Enter Once, Use Everywhere" with a click-and-get-work-done flow: no manual re-entry in the demo path, SLA risk visible before breach, zero duplicate field records on re-sync, and consumer-visible status at every step. All ML results are on **synthetic data**, reported vs a majority baseline on a held-out test set.

**Roadmap (not built).** Legacy ERP adapters, Kafka/Temporal, GraphQL/GIS/WebSockets, Flutter/Couchbase, fine-tuned LLM in VPC, Zero Trust/multi-AZ DR, real SCADA telemetry, contractor/govt access, hardware modernisation tiers.
