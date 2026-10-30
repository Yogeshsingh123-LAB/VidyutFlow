"""Demo load review rules apply equally to JSON and multipart submissions."""
import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.main import app


@pytest.mark.parametrize('with_document', [False, True])
@pytest.mark.parametrize('load,needs_correction', [
    (0, True), (-1, True), (2.5, False), (100, False), (100.01, True), (1e12, True),
])
def test_load_review_policy(monkeypatch, with_document, load, needs_correction):
    monkeypatch.setattr(settings, 'demo_load_review_threshold_kw', 100.0)
    with TestClient(app) as client:
        login = client.post('/auth/login', data={'username': 'consumer@vidyut.local', 'password': 'Consumer@123'})
        assert login.status_code == 200
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}
        fields = {'applicant_name': 'Load Test', 'phone': '9876543210', 'address': 'Mehsana',
                  'zone': 'North', 'request_type': 'new_connection', 'requested_load_kw': str(load)}
        if with_document:
            response = client.post('/requests/with-document', headers=headers, data=fields,
                                   files={'document': ('id.pdf', b'test', 'application/pdf')})
        else:
            response = client.post('/requests', headers=headers, json={**fields, 'document_name': 'id.pdf'})
        assert response.status_code == 201, response.text
        result = response.json()
        if needs_correction:
            assert result['status'] == 'NEEDS_CORRECTION'
            if load > 100:
                assert 'demo' in result['validation_notes'].lower()
                assert 'review' in result['validation_notes'].lower()
                issue = next(x for x in result['validation_issues'] if x['code'] == 'DEMO_LOAD_REVIEW')
                assert issue['threshold_kw'] == 100
                assert any('capped' in reason.lower() for reason in result['sla_risk_reasons'])
        else:
            assert result['status'] in ('ROUTED', 'ASSIGNED')


@pytest.mark.parametrize('with_document', [False, True])
@pytest.mark.parametrize('load', ['nan', 'inf', '-inf'])
def test_nonfinite_load_is_rejected(with_document, load):
    with TestClient(app) as client:
        login = client.post('/auth/login', data={'username': 'consumer@vidyut.local', 'password': 'Consumer@123'})
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}
        fields = {'applicant_name': 'Load Test', 'phone': '9876543210', 'address': 'Mehsana',
                  'zone': 'North', 'requested_load_kw': load, 'document_name': 'id.pdf'}
        if with_document:
            fields.pop('document_name')
            response = client.post('/requests/with-document', headers=headers, data=fields,
                                   files={'document': ('id.pdf', b'test', 'application/pdf')})
        else:
            response = client.post('/requests', headers=headers, json=fields)
        assert response.status_code == 422, response.text


def test_demo_policy_endpoint_reflects_configuration(monkeypatch):
    monkeypatch.setattr(settings, 'demo_load_review_threshold_kw', 42.5)
    with TestClient(app) as client:
        response = client.get('/system/demo-load-policy')
        assert response.status_code == 200
        assert response.json() == {'review_threshold_kw': 42.5, 'is_demo': True}


def test_review_threshold_is_configurable(monkeypatch):
    monkeypatch.setattr(settings, 'demo_load_review_threshold_kw', 5.0)
    with TestClient(app) as client:
        login = client.post('/auth/login', data={'username': 'consumer@vidyut.local', 'password': 'Consumer@123'})
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}
        response = client.post('/requests', headers=headers, json={
            'applicant_name': 'Load Test', 'phone': '9876543210', 'address': 'Mehsana',
            'zone': 'North', 'requested_load_kw': 6, 'document_name': 'id.pdf'})
        assert response.status_code == 201
        assert response.json()['status'] == 'NEEDS_CORRECTION'
        assert any(x['code'] == 'DEMO_LOAD_REVIEW' and x['threshold_kw'] == 5 for x in response.json()['validation_issues'])
