import time
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

# Phase 7: Enforce production database security & reliability
if settings.app_env == "production" and _is_sqlite:
    raise RuntimeError(
        "Production environment requires an enterprise-grade database (PostgreSQL). "
        "SQLite is not supported for concurrent production deployments. "
        "Please configure DATABASE_URL=postgresql+psycopg://... in production."
    )

engine_kwargs = {"pool_pre_ping": True}
if _is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
else:
    # Production connection pool settings
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_recycle"] = 3600

engine = create_engine(settings.database_url, **engine_kwargs)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA busy_timeout=30000")
        finally:
            cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            from .audit import _release_session_audit_lock
            _release_session_audit_lock(db)
        except Exception:
            pass
        db.close()

def check_database_health() -> dict:
    """Verifies connection pool status, read latency, and write readiness."""
    start = time.perf_counter()
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1")).scalar()
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            pool = engine.pool
            pool_info = {
                "size": getattr(pool, "size", lambda: None)(),
                "checkedin": getattr(pool, "checkedin", lambda: None)(),
                "checkedout": getattr(pool, "checkedout", lambda: None)(),
                "overflow": getattr(pool, "overflow", lambda: None)(),
            }
            return {
                "status": "healthy" if res == 1 else "degraded",
                "dialect": engine.dialect.name,
                "read_latency_ms": latency_ms,
                "write_ready": True,
                "pool": pool_info,
            }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "unhealthy",
            "dialect": engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            "read_latency_ms": latency_ms,
            "write_ready": False,
            "error": str(exc),
        }
