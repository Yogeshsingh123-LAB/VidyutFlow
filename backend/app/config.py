from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    app_name: str = "VidyutOS Lite"
    secret_key: str = "dev-only-change-me-in-production-please-32-chars"
    algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24
    # SQLite fallback makes the demo run anywhere; Docker Compose sets PostgreSQL.
    database_url: str = "sqlite:///./vidyutos.db"
    redis_url: str = ""
    # Comma-separated browser origins allowed to call the API (never "*" with credentials in production)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    login_max_attempts: int = Field(default=20, ge=1, le=1000)
    login_window_seconds: int = Field(default=60, ge=1, le=3600)
    model_dir: str = "app/ml/models"

    class Config:
        env_file = ".env"

settings = Settings()
