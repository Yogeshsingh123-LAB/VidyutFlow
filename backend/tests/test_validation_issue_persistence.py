"""Submission validation snapshots survive later reads and policy changes."""
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text

from app.config import settings
from app.main import app, migrate_validation_issues


def token(client, email, password):
    result = client.post('/auth/login', data={'username': email, 'password': password})
    assert result.status_code == 200
    return {'Authorization': 'Bearer ' + result.json()['access_token']}


def test_validation_snapshot_survives_policy_and_status_changes(monkeypatch):
    monkeypatch.setattr(settings, 'demo_load_review_threshold_kw', 100.0)
    with TestClient(app) as c:
        consumer = token(c, 'consumer@vidyut.local', 'Consumer@123')
        officer = token(c, 'officer@vidyut.local', 'Officer@123')
        body = {'applicant_name': 'Snapshot Test', 'phone': 'abcdefghij', 'address': 'Mehsana',
                'zone': 'North', 'requested_load_kw': 120, 'document_name': 'id.pdf'}
        created = c.post('/requests', headers=consumer, json=body)
        assert created.status_code == 201
        request = created.json()
        initial = request['validation_issues']
        assert {x['code'] for x in initial} == {'PHONE_INVALID', 'DEMO_LOAD_REVIEW'}
        assert next(x for x in initial if x['code'] == 'DEMO_LOAD_REVIEW')['threshold_kw'] == 100
        monkeypatch.setattr(settings, 'demo_load_review_threshold_kw', 200.0)
        detail = c.get('/requests/' + request['id'], headers=consumer)
        assert detail.status_code == 200
        assert detail.json()['validation_issues'] == initial
        own = c.get('/requests', headers=consumer).json()
        assert next(row for row in own if row['id'] == request['id'])['validation_issues'] == initial
        # Current notes can change, but must not be confused with submission-time reasons.
        updated = c.patch('/requests/' + request['id'] + '/status', headers=officer,
                          json={'status': 'REJECTED', 'notes': 'Reviewed by officer'})
        assert updated.status_code == 200, updated.text
        assert updated.json()['validation_notes'] == 'Reviewed by officer'
        assert updated.json()['validation_issues'] == initial


def test_migration_preserves_old_rows_and_is_idempotent(tmp_path):
    engine = create_engine('sqlite:///' + str(tmp_path / 'legacy.db'))
    with engine.begin() as conn:
        conn.execute(text('CREATE TABLE connection_requests (id VARCHAR PRIMARY KEY, validation_notes TEXT)'))
        conn.execute(text("INSERT INTO connection_requests (id, validation_notes) VALUES ('old', 'Existing note')"))
    migrate_validation_issues(engine)
    migrate_validation_issues(engine)
    assert 'validation_issues_json' in {column['name'] for column in inspect(engine).get_columns('connection_requests')}
    with engine.connect() as conn:
        row = conn.execute(text('SELECT validation_notes, validation_issues_json FROM connection_requests WHERE id = :id'), {'id': 'old'}).one()
    assert row[0] == 'Existing note'
    assert row[1] is None  # Unknown legacy issues must not be reconstructed from today's policy.
    engine.dispose()


def test_snapshot_respects_request_ownership():
    import uuid
    with TestClient(app) as c:
        consumer = token(c, 'consumer@vidyut.local', 'Consumer@123')
        created = c.post('/requests', headers=consumer, json={
            'applicant_name': 'Private', 'phone': 'not a phone', 'address': 'Mehsana',
            'zone': 'North', 'requested_load_kw': 2, 'document_name': 'id.pdf'})
        assert created.status_code == 201
        request_id = created.json()['id']
        email = f"other-{uuid.uuid4().hex}@example.com"
        assert c.post('/auth/register', json={'email': email, 'name': 'Other', 'password': 'TestPass@123'}).status_code == 201
        other = token(c, email, 'TestPass@123')
        assert c.get('/requests/' + request_id, headers=other).status_code == 403
        assert all(row['id'] != request_id for row in c.get('/requests', headers=other).json())
