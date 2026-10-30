from typing import Literal
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "VidyutFlow"
    app_env: Literal["development", "production"] = "development"
    secret_key: str = "dev-only-change-me-in-production-please-32-chars"
    algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24
    # SQLite fallback makes the demo run anywhere; Docker Compose sets PostgreSQL.
    database_url: str = "sqlite:///./vidyutflow.db"
    redis_url: str = ""
    # Comma-separated browser origins allowed to call the API (never "*" with credentials in production)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    login_max_attempts: int = Field(default=20, ge=1, le=1000)
    login_window_seconds: int = Field(default=60, ge=1, le=3600)
    # Demonstration review threshold only; not an official UGVCL limit.
    demo_load_review_threshold_kw: float = Field(default=100.0, gt=0, allow_inf_nan=False)
    # Maximum uploaded supporting document size in bytes (default 5 MiB).
    max_upload_bytes: int = Field(default=5 * 1024 * 1024, gt=0, le=50 * 1024 * 1024)
    # Operational alert engine thresholds (Item #17 — simulated SMS/email + in-app + audit log).
    alert_sla_risk_threshold: float = Field(default=0.70, ge=0.0, le=1.0, allow_inf_nan=False)
    alert_unassigned_hours: float = Field(default=4.0, ge=0.0, le=720.0, allow_inf_nan=False)
    alert_zone_failure_threshold: int = Field(default=2, ge=1, le=100)
    # Performance caching & rolling latency telemetry (Item #20).
    kpi_cache_ttl_seconds: float = Field(default=15.0, ge=0.0, le=300.0, allow_inf_nan=False)
    latency_window_size: int = Field(default=1000, ge=50, le=10000)
    model_dir: str = "app/ml/models"

    class Config:
        env_file = ".env"
        # The root .env (and Compose) also carries frontend-only keys (SESSION_SECRET,
        # APP_URL, VITE_PROXY_TARGET). Backend settings must tolerate their presence.
        extra = "ignore"

    @model_validator(mode="after")
    def validate_production_secret(self):
        secret = self.secret_key.casefold()
        if self.app_env == "production" and (
            len(self.secret_key) < 32
            or secret.startswith(("dev-only", "change-me", "replace-with", "your-"))
        ):
            raise ValueError(
                "Production requires a SECRET_KEY of at least 32 characters "
                "that is not a development placeholder"
            )
        return self

settings = Settings()
