from pathlib import Path
from typing import Literal
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_MODEL_DIR = str(Path(__file__).resolve().parent / "ml" / "models")

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "VidyutFlow"
    app_env: Literal["development", "production"] = "development"
    secret_key: str = "dev-only-change-me-in-production-please-32-chars"
    algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    jwt_issuer: str = "vidyutflow-api"
    jwt_audience: str = "vidyutflow-client"
    # SQLite fallback makes the demo run anywhere; Docker Compose sets PostgreSQL.
    database_url: str = "sqlite:///./vidyutflow.db"
    redis_url: str = ""
    # Comma-separated browser origins allowed to call the API (never "*" with credentials in production)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    login_max_attempts: int = Field(default=20, ge=1, le=1000)
    login_window_seconds: int = Field(default=60, ge=1, le=3600)
    login_account_max_attempts: int = Field(default=5, ge=1, le=100)
    login_account_lockout_seconds: int = Field(default=300, ge=1, le=3600)
    # Demonstration review threshold only; not an official UGVCL limit.
    demo_load_review_threshold_kw: float = Field(default=100.0, gt=0, allow_inf_nan=False)
    # Maximum uploaded supporting document size in bytes (default 5 MiB).
    max_upload_bytes: int = Field(default=5 * 1024 * 1024, gt=0, le=50 * 1024 * 1024)
    # Maximum JSON request body size in bytes (default 2 MiB for DoS protection).
    max_json_body_bytes: int = Field(default=2 * 1024 * 1024, gt=0, le=50 * 1024 * 1024)
    # Default directory where encrypted KYC / supporting documents (VFENC1 AES-256-GCM) are persisted.
    upload_vault_dir: str = "uploads_encrypted"
    # Shared storage provider for multi-instance deployment (local, s3, minio)
    storage_provider: Literal["local", "s3", "minio"] = "local"
    s3_endpoint_url: str = ""
    s3_bucket_name: str = "vidyutflow-documents"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "us-east-1"
    # Operational alert engine thresholds (Item #17 — simulated SMS/email + in-app + audit log).
    alert_sla_risk_threshold: float = Field(default=0.70, ge=0.0, le=1.0, allow_inf_nan=False)
    alert_unassigned_hours: float = Field(default=4.0, ge=0.0, le=720.0, allow_inf_nan=False)
    alert_zone_failure_threshold: int = Field(default=2, ge=1, le=100)
    # Performance caching & rolling latency telemetry (Item #20).
    kpi_cache_ttl_seconds: float = Field(default=15.0, ge=0.0, le=300.0, allow_inf_nan=False)
    latency_window_size: int = Field(default=1000, ge=50, le=10000)
    model_dir: str = _DEFAULT_MODEL_DIR
    # Phase 12 Telemetry Ingestion Secret (Step 4)
    telemetry_ingest_secret: str = "vidyutflow-dev-telemetry-ingest-secret-2026"
    # Phase 12 Background Scheduler (disabled by default in test/dev)
    enable_transformer_scheduler: bool = False
    # Phase 12 Risk Prediction Mode ("ml_advisory" vs "rules_baseline")
    transformer_risk_mode: str = "ml_advisory"

    @model_validator(mode="after")
    def validate_production_secret(self):
        secret = self.secret_key.casefold()
        if self.app_env == "production":
            if (
                len(self.secret_key) < 32
                or secret.startswith(("dev-only", "change-me", "replace-with", "your-"))
            ):
                raise ValueError(
                    "Production requires a SECRET_KEY of at least 32 characters "
                    "that is not a development placeholder"
                )
            if "*" in [o.strip() for o in self.cors_origins.split(",")]:
                raise ValueError(
                    "Production CORS origins must not contain wildcard '*' when allow_credentials=True"
                )
        return self

settings = Settings()
