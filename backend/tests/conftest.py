import os
import sys
os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest


@pytest.fixture(autouse=True)
def isolated_login_throttle(monkeypatch):
    # A fresh limiter per test: test order must not consume another test's budget.
    from app import login_limit
    monkeypatch.setattr(login_limit, "login_limiter", login_limit.LoginLimiter(20, 60))
