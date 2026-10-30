"""Phone validation must be consistent for JSON and document submissions."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


def consumer_headers(client):
    response = client.post('/auth/login', data={
        'username': 'consumer@vidyut.local', 'password': 'Consumer@123',
    })
    assert response.status_code == 200, response.text
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


@pytest.mark.parametrize('phone,valid', [
    ('9876543210', True),
    (' 9876543210 ', True),
    ('abcdefghij', False),
    ('987654321', False),
    ('98765432101', False),
    ('98765-4321', False),
    ('１２３４５６７８９０', False),
])
@pytest.mark.parametrize('with_document', [False, True])
def test_phone_validation_on_both_submission_paths(phone, valid, with_document):
    with TestClient(app) as client:
        headers = consumer_headers(client)
        fields = {
            'applicant_name': 'Phone Test', 'phone': phone,
            'address': 'Mehsana Gujarat', 'zone': 'North',
            'request_type': 'new_connection', 'requested_load_kw': '3',
        }
        if with_document:
            response = client.post('/requests/with-document', headers=headers, data=fields,
                                   files={'document': ('id.pdf', b'test', 'application/pdf')})
        else:
            response = client.post('/requests', headers=headers,
                                   json={**fields, 'document_name': 'id.pdf'})
        assert response.status_code == 201, response.text
        result = response.json()
        if valid:
            assert result['status'] in ('ROUTED', 'ASSIGNED')
        else:
            assert result['status'] == 'NEEDS_CORRECTION'
            assert '10-digit phone' in result['validation_notes']
