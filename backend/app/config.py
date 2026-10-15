from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "VidyutOS Lite"
    secret_key: str = "dev-only-change-me-in-production-please-32-chars"
    algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24
    # SQLite fallback makes the demo run anywhere; Docker Compose sets PostgreSQL.
    database_url: str = "sqlite:///./vidyutos.db"
    redis_url: str = ""
    model_dir: str = "app/ml/models"

    class Config:
        env_file = ".env"

settings = Settings()
