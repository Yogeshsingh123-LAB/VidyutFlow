from concurrent.futures import ThreadPoolExecutor
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app import login_limit
from app.db import SessionLocal
from app.models import User


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
