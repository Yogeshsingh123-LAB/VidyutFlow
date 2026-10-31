# VidyutFlow — one-command build/run/test (no hardcoded local paths; run from repo root)
.DEFAULT_GOAL := help
.PHONY: help setup train backend frontend dev test test-frontend coverage dr-proof build up down clean demo-reset

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  make %-12s %s\n", $$1, $$2}'

setup: ## Install backend + frontend dependencies
	cd backend && pip install -r requirements.txt -r requirements-dev.txt
	cd frontend && npm install

train: ## Train all 5 sklearn models + evaluate 54-item GERC/CGRF real-domain benchmark
	cd backend && python scripts/train_models.py && python scripts/evaluate_realworld_benchmark.py

coverage: ## Verify 100% (55/55) OpenAPI HTTP operation coverage across pytest
	cd backend && python scripts/audit_api_coverage.py

dr-proof: ## Run cold-start Primary Kill -> Hot-Standby DR failover proof (0 data loss)
	cd backend && python scripts/cold_start_dr_proof.py

backend: ## Run API locally (SQLite fallback) on :8000
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

frontend: ## Run web app locally on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test: ## Backend test suite (end-to-end flow, RBAC, offline de-dup, ML)
	cd backend && python -m pytest -q

test-frontend: ## Frontend test suite (auth, session, AI resilience, data integrity)
	cd frontend && npm test

build: ## Production frontend build
	cd frontend && npm run build

up: ## Full stack with PostgreSQL via Docker Compose
	docker compose up --build

down: ## Stop Docker Compose stack
	docker compose down

demo-reset: ## Remove local SQLite demo databases (re-seeded on next start)
	./scripts/demo_reset.sh

clean: demo-reset ## Remove demo DBs and build artefacts
	rm -rf frontend/dist backend/.pytest_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
