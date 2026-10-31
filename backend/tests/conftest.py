import os
from pathlib import Path
import sys
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"


def _remove_stale_test_sqlite_files() -> None:
    """Ensure every pytest invocation starts from a clean SQLite database."""
    for base in {Path.cwd(), BACKEND_DIR}:
        for name in (
            "test_vidyutflow.db",
            "test_vidyutflow.db-wal",
            "test_vidyutflow.db-shm",
            "test_vidyutflow.db-journal",
        ):
            target = base / name
            if target.exists():
                try:
                    target.unlink()
                except OSError:
                    pass


# Clean before any test module imports `app.main` / `app.db` at collection time.
_remove_stale_test_sqlite_files()


def pytest_sessionstart(session):
    _remove_stale_test_sqlite_files()


def pytest_sessionfinish(session, exitstatus):
    try:
        from app.db import engine

        engine.dispose()
    except Exception:
        pass
    _remove_stale_test_sqlite_files()


@pytest.fixture(scope="session", autouse=True)
def isolated_session_upload_vault(tmp_path_factory):
    """Route default encrypted vault writes during pytest to a clean temp dir."""
    from app.config import settings

    orig = settings.upload_vault_dir
    settings.upload_vault_dir = str(tmp_path_factory.mktemp("uploads_encrypted"))
    try:
        yield
    finally:
        settings.upload_vault_dir = orig


@pytest.fixture(autouse=True)
def isolated_login_throttle(monkeypatch):
    # A fresh limiter per test: test order must not consume another test's budget.
    from app import login_limit

    monkeypatch.setattr(login_limit, "login_limiter", login_limit.LoginLimiter(20, 60))
