#!/usr/bin/env python3
"""Run after `docker compose up --build -d`. Synthetic demo only; leaves a test request."""
import argparse
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def request(base, path, method='GET', payload=None, token=None, form=False):
    headers = {}
    data = None
    if payload is not None:
        data = (urllib.parse.urlencode(payload) if form else json.dumps(payload)).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, json.load(exc)


def check(condition, message):
    if not condition:
        raise RuntimeError(message)
    print('PASS:', message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5173/api',
                        help='Frontend proxy URL, not a production deployment')
    args = parser.parse_args()
    base = args.base_url.rstrip('/')
    # Ensure this is a Compose run, not accidental verification of a SQLite dev API.
    subprocess.run(['docker', 'compose', 'config', '--quiet'], cwd=ROOT, check=True)
    subprocess.run(['docker', 'compose', 'ps'], cwd=ROOT, check=True)
    code, health = request(base, '/health')
    check(code == 200 and health.get('status') == 'ok', 'Frontend /api proxy reaches backend')
    tokens = {}
    for role in ('consumer', 'officer', 'engineer', 'admin'):
        code, body = request(base, '/auth/login', 'POST', {
            'username': role + '@vidyut.local', 'password': role.title() + '@123'}, form=True)
        check(code == 200 and body.get('role') == role, role + ' login')
        tokens[role] = body['access_token']
    code, status = request(base, '/system/status', token=tokens['admin'])
    check(code == 200 and status['database']['ok'] and status['database']['dialect'] == 'postgresql',
          'Backend uses healthy PostgreSQL (not SQLite fallback)')
    code, body = request(base, '/requests', 'POST', {
        'applicant_name': 'Compose Verification (SYNTHETIC)', 'phone': '9876543210',
        'address': 'Synthetic Mehsana test address', 'zone': 'North',
        'description': 'new electricity connection for home', 'document_name': 'synthetic-id.pdf',
        'requested_load_kw': 3}, tokens['consumer'])
    check(code == 201 and body.get('status') == 'ASSIGNED', 'Synthetic request routed and assigned')
    rid = body['id']
    code, _ = request(base, '/requests/' + rid + '/status', 'PATCH',
                      {'status': 'APPROVED'}, tokens['engineer'])
    check(code == 403, 'Engineer approval bypass blocked')
    payload = {'client_uuid': str(uuid.uuid4()), 'request_id': rid,
               'task_status': 'COMPLETED', 'meter_serial': 'SYNTHETIC-COMPOSE-METER'}
    code, first = request(base, '/requests/field-sync', 'POST', payload, tokens['engineer'])
    check(code == 200 and first.get('synced') is True, 'Field submission syncs')
    code, second = request(base, '/requests/field-sync', 'POST', payload, tokens['engineer'])
    check(code == 200 and second.get('duplicate') is True and
          first['field_update_id'] == second['field_update_id'], 'Retry deduplicates to same field update')
    code, result = request(base, '/requests/' + rid, token=tokens['consumer'])
    check(code == 200 and result.get('status') == 'COMPLETED' and
          result.get('meter_serial') == payload['meter_serial'], 'Consumer sees completed result')
    code, _ = request(base, '/auth/users', token=tokens['consumer'])
    check(code == 403, 'Consumer cannot access admin directory')
    print('COMPOSE SMOKE PASSED. Synthetic request ID:', rid)
    print('Not a browser offline/PWA test, load test, or production security certification.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError, urllib.error.URLError,
            KeyError, ValueError) as exc:
        print('VERIFICATION FAILED:', exc, file=sys.stderr)
        sys.exit(1)
