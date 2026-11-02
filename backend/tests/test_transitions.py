import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.models import ConnectionRequest, FieldUpdate, AuditLog
from app.transitions import apply_transition, validate_transition, TRANSITIONS
from test_flow import login


def create(c, consumer):
    r = c.post('/requests', headers=consumer, json={
        'applicant_name': 'Lifecycle (SYNTHETIC)', 'phone': '9876543210',
        'address': 'Synthetic address', 'document_name': 'synthetic.pdf', 'zone': 'North'})
    assert r.status_code == 201
    return r.json()['id']


def counts(rid):
    with SessionLocal() as db:
        return (db.query(FieldUpdate).filter_by(request_id=rid).count(),
                db.query(AuditLog).filter_by(entity_id=rid).count())


@pytest.mark.parametrize('terminal', ['COMPLETED', 'REJECTED'])
def test_terminal_requests_reject_fresh_writes_without_side_effects(terminal):
    with TestClient(app) as c:
        consumer = login(c, 'consumer@vidyut.local', 'Consumer@123')
        engineer = login(c, 'engineer@vidyut.local', 'Engineer@123')
        officer = login(c, 'officer@vidyut.local', 'Officer@123')
        admin = login(c, 'admin@vidyut.local', 'Admin@123')
        rid = create(c, consumer)
        payload = {'request_id': rid, 'client_uuid': str(uuid.uuid4()),
                   'task_status': 'COMPLETED', 'meter_serial': 'ORIGINAL'}
        if terminal == 'COMPLETED':
            original = c.post('/requests/field-sync', headers=engineer, json=payload)
            assert original.status_code == 200
        else:
            assert c.patch(f'/requests/{rid}/status', headers=officer,
                           json={'status': 'REJECTED', 'notes': 'Officer decision'}).status_code == 200
        before = c.get(f'/requests/{rid}', headers=consumer).json()
        baseline = counts(rid)
        for actor in (officer, admin):
            for status in ('ASSIGNED', 'APPROVED', 'COMPLETED', 'REJECTED'):
                r = c.patch(f'/requests/{rid}/status', headers=actor,
                            json={'status': status, 'notes': 'Overwrite attempt'})
                assert r.status_code == 409
        for status in ('COMPLETED', 'BLOCKED', 'FIELD_VERIFIED'):
            stale = {**payload, 'client_uuid': str(uuid.uuid4()), 'task_status': status,
                     'meter_serial': 'OVERWRITE'}
            assert c.post('/requests/field-sync', headers=engineer, json=stale).status_code == 409
        assert c.get(f'/requests/{rid}', headers=consumer).json() == before
        assert counts(rid) == baseline
        if terminal == 'COMPLETED':
            # First-write-wins acknowledgment remains valid after terminal completion.
            retry = c.post('/requests/field-sync', headers=engineer,
                           json={**payload, 'meter_serial': 'IGNORED'})
            assert retry.status_code == 200 and retry.json()['duplicate'] is True
            assert retry.json()['field_update_id'] == original.json()['field_update_id']
            assert counts(rid) == baseline
            assert c.get(f'/requests/{rid}', headers=consumer).json()['meter_serial'] == 'ORIGINAL'


def test_blocked_resume_and_illegal_regression():
    with TestClient(app) as c:
        consumer = login(c, 'consumer@vidyut.local', 'Consumer@123')
        engineer = login(c, 'engineer@vidyut.local', 'Engineer@123')
        officer = login(c, 'officer@vidyut.local', 'Officer@123')
        rid = create(c, consumer)
        def sync(status):
            return c.post('/requests/field-sync', headers=engineer, json={
                'request_id': rid, 'client_uuid': str(uuid.uuid4()), 'task_status': status})
        assert sync('BLOCKED').status_code == 200
        assert c.patch(f'/requests/{rid}/status', headers=engineer,
                       json={'status': 'IN_PROGRESS'}).status_code == 200
        assert sync('FIELD_VERIFIED').status_code == 200
        assert c.patch(f'/requests/{rid}/status', headers=engineer,
                       json={'status': 'IN_PROGRESS'}).status_code == 409
        assert c.patch(f'/requests/{rid}/status', headers=officer,
                       json={'status': 'APPROVED'}).status_code == 200
        assert sync('COMPLETED').status_code == 200


def test_stale_snapshot_cannot_overwrite_later_commit():
    with TestClient(app) as c:
        consumer = login(c, 'consumer@vidyut.local', 'Consumer@123')
        rid = create(c, consumer)
        with SessionLocal() as db:
            stale = db.get(ConnectionRequest, rid)
            db.expunge(stale)
        with SessionLocal() as db:
            fresh = db.get(ConnectionRequest, rid)
            apply_transition(db, fresh, 'REJECTED', validation_notes='Final decision')
            db.commit()
        with SessionLocal() as db:
            with pytest.raises(HTTPException) as exc:
                apply_transition(db, stale, 'COMPLETED', meter_serial='STALE')
            assert exc.value.status_code == 409
        result = c.get(f'/requests/{rid}', headers=consumer).json()
        assert result['status'] == 'REJECTED' and result['meter_serial'] == ''


def test_transition_policy_matrix():
    # Covers every state pair, including unknown states and terminal self-updates.
    for source in list(TRANSITIONS) + ['UNKNOWN']:
        for target in list(TRANSITIONS) + ['UNKNOWN']:
            allowed = source in TRANSITIONS and source not in ('COMPLETED', 'REJECTED') and (
                target == source or target in TRANSITIONS[source])
            if allowed:
                validate_transition(source, target)
            else:
                with pytest.raises(HTTPException) as exc:
                    validate_transition(source, target)
                assert exc.value.status_code == 409
