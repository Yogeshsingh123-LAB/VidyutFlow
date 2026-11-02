from concurrent.futures import ThreadPoolExecutor
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app import login_limit
from app.config import Settings, settings
from app.db import SessionLocal
from app.models import User
from app.security import hash_password, verify_password


def test_login_throttle_retry_expiry_and_spoofed_headers(monkeypatch):
    now = [100.0]
    limiter = login_limit.LoginLimiter(2, 60, clock=lambda: now[0])
    monkeypatch.setattr(login_limit, 'login_limiter', limiter)
    with TestClient(app) as c:
        for username in ('unknown-a@example.com', 'unknown-b@example.com'):
            assert c.post('/auth/login', data={'username': username, 'password': 'wrong'}).status_code == 401
        valid = {'username': 'consumer@vidyut.local', 'password': 'Consumer@123'}
        blocked = c.post('/auth/login', data=valid, headers={'X-Forwarded-For': '198.51.100.4'})
        assert blocked.status_code == 429 and blocked.headers['Retry-After'] == '60'
        assert 'access_token' not in blocked.json()
        now[0] += 60
        assert c.post('/auth/login', data=valid).status_code == 200
        assert c.post('/auth/login', data=valid).status_code == 200
        assert c.post('/auth/login', data=valid).status_code == 429
        assert c.get('/health').status_code == 200


def test_limiter_concurrency_client_isolation_and_capacity():
    now = [0.0]
    limiter = login_limit.LoginLimiter(3, 60, max_clients=2, clock=lambda: now[0])
    def attempt(_):
        try:
            limiter.check('a')
            return True
        except HTTPException as e:
            assert e.status_code == 429
            return False
    with ThreadPoolExecutor(max_workers=8) as pool:
        assert sum(pool.map(attempt, range(20))) == 3
    limiter.check('b')
    with pytest.raises(HTTPException):
        limiter.check('c')
    assert len(limiter._buckets) == 2
    now[0] = 60
    limiter.check('c')
    assert len(limiter._buckets) == 1


def test_public_registration_cannot_grant_staff_privileges():
    with TestClient(app) as c:
        email = f'security-{uuid.uuid4().hex}@example.com'
        for role in ('admin', 'officer', 'engineer', 'unknown'):
            response = c.post('/auth/register', json={
                'email': email, 'name': 'Security Test', 'password': 'TestPass123!', 'role': role})
            assert response.status_code == 403
        with SessionLocal() as db:
            assert db.query(User).filter(User.email == email).first() is None
        response = c.post('/auth/register', json={
            'email': email, 'name': 'Security Test', 'password': 'TestPass123!'})
        assert response.status_code == 201 and response.json()['role'] == 'consumer'
        credentials = {'username': email, 'password': 'TestPass123!'}
        result = c.post('/auth/login', data=credentials)
        assert result.status_code == 200
        token = result.json()['access_token']
        with SessionLocal() as db:
            db.query(User).filter(User.email == email).one().is_active = False
            db.commit()
        denied = c.post('/auth/login', data=credentials)
        assert denied.status_code == 401 and denied.json()['detail'] == 'Invalid email or password'
        assert c.get('/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_passwords_over_bcrypt_byte_limit_are_rejected():
    password = 'é' * 36
    hashed = hash_password(password)
    assert verify_password(password, hashed)
    assert not verify_password(password + 'é', hashed)
    with pytest.raises(ValueError, match='72 bytes'):
        hash_password(password + 'é')
    with TestClient(app) as c:
        response = c.post('/auth/register', json={
            'email': f'long-password-{uuid.uuid4().hex}@example.com',
            'name': 'Long Password Test',
            'password': 'a' * 73,
        })
        assert response.status_code == 422


def test_production_requires_non_placeholder_secret_and_skips_demo_seeding(monkeypatch):
    with pytest.raises(ValueError, match='Production requires a SECRET_KEY'):
        Settings(app_env='production')
    with pytest.raises(ValueError, match='Production requires a SECRET_KEY'):
        Settings(app_env='production', secret_key='replace-with-a-random-secret-at-least-32-characters')

    secure_settings = Settings(app_env='production', secret_key='x' * 48)
    assert secure_settings.app_env == 'production'

    from app import main
    monkeypatch.setattr(settings, 'app_env', 'production')
    monkeypatch.setattr(main, 'SessionLocal', lambda: pytest.fail('production must not seed demo data'))
    main.seed()
    main.seed_requests()


def test_production_refuses_database_with_seeded_demo_users(monkeypatch):
    from app import main

    class Query:
        def filter(self, _condition):
            return self

        def first(self):
            return object()

    class Database:
        def query(self, _model):
            return Query()

        def close(self):
            pass

    monkeypatch.setattr(main, 'SessionLocal', Database)
    with pytest.raises(RuntimeError, match='contains seeded demo accounts'):
        main.reject_seeded_demo_accounts()
