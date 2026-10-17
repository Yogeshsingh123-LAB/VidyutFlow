#!/usr/bin/env python3
"""Scripted real-Chromium acceptance checks, NOT human-manual testing.
Requires: pip install playwright && python -m playwright install --with-deps chromium.
Run against a disposable, synthetic demo stack. Leaves two labelled test requests.
"""
import argparse
import json
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_compose import request, check


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:5173')
    args = parser.parse_args()
    url = args.url.rstrip('/')
    api = url + '/api'
    evidence = Path(__file__).resolve().parents[1] / 'docs' / 'verification'
    evidence.mkdir(exist_ok=True)
    code, auth = request(api, '/auth/login', 'POST', {
        'username': 'consumer@vidyut.local', 'password': 'Consumer@123'}, form=True)
    check(code == 200, 'Consumer API fixture login')
    consumer = auth['access_token']
    cases = {}
    for kind in ('Conflict', 'Normal'):
        name = f'Browser {kind} SYNTHETIC {uuid.uuid4().hex[:6]}'
        code, body = request(api, '/requests', 'POST', {
            'applicant_name': name, 'phone': '9876543210', 'address': 'Synthetic test address',
            'zone': 'North', 'document_name': 'synthetic.pdf'}, consumer)
        check(code == 201 and body['status'] == 'ASSIGNED', kind + ' fixture created')
        cases[kind] = (name, body['id'])
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox'])
        contexts = []
        def login(role):
            ctx = browser.new_context(viewport={'width': 1440, 'height': 1000})
            contexts.append(ctx)
            # Skip decorative intro only; login and role navigation use actual controls.
            ctx.add_init_script("sessionStorage.setItem('vidyutos_intro_seen','1')")
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(url)
            page.get_by_placeholder('Email', exact=True).fill(role + '@vidyut.local')
            page.get_by_placeholder('Password', exact=True).fill(role.title() + '@123')
            page.get_by_role('button', name='Enter platform').click()
            page.get_by_role('button', name='Start working').click()
            expect(page.get_by_title('Logout', exact=True)).to_be_visible()
            return ctx, page
        engineer_ctx, engineer = login('engineer')
        _, officer = login('officer')
        engineer.get_by_role('button', name='Work Orders', exact=True).click()
        name, rid = cases['Conflict']
        card = engineer.locator('section').filter(has=engineer.get_by_text(name, exact=True))
        expect(card).to_be_visible()
        card.get_by_placeholder('Meter serial').fill('BROWSER-STALE-METER')
        engineer_ctx.set_offline(True)  # Actual browser network offline, not app simulation toggle.
        expect(card.get_by_role('button', name='Save inspection offline')).to_be_visible()
        card.get_by_role('button', name='Save inspection offline').click()
        engineer.wait_for_function("JSON.parse(localStorage.getItem('vidyutos_offline_queue')||'[]').length===1")
        queued = engineer.evaluate("JSON.parse(localStorage.getItem('vidyutos_offline_queue'))")
        check(queued[0]['request_id'] == rid, 'Offline browser saved intended UUID/request')
        engineer.screenshot(path=str(evidence / 'browser-offline-queued.png'), full_page=True)
        officer.get_by_role('button', name='Approval Center', exact=True).click()
        row = officer.locator('div.flex.flex-wrap.items-center').filter(has=officer.get_by_text(name + ' · 1 kW', exact=True))
        # Target the row containing its applicant and Reject button, not the entire panel.
        with officer.expect_response(lambda r: r.url.endswith('/status') and r.request.method == 'PATCH') as changed:
            row.get_by_role('button', name='Reject', exact=True).click()
        check(changed.value.status == 200, 'Officer rejects in a separate browser session')
        _, before = request(api, '/requests/' + rid, token=consumer)
        with engineer.expect_response(lambda r: '/requests/field-sync' in r.url) as response:
            engineer_ctx.set_offline(False)
        check(response.value.status == 409, 'Reconnect auto-sync returns 409')
        expect(engineer.get_by_text('Sync conflict:', exact=False)).to_be_visible()
        check(engineer.evaluate("JSON.parse(localStorage.getItem('vidyutos_offline_queue'))") == queued,
              'Conflict retains original queue entry and UUID')
        engineer.get_by_role('button', name='Offline Queue', exact=False).click()
        engineer.screenshot(path=str(evidence / 'browser-conflict-retained.png'), full_page=True)
        with engineer.expect_response(lambda r: '/requests/field-sync' in r.url) as retry:
            engineer.get_by_role('button', name='Sync now', exact=True).click()
        check(retry.value.status == 409, 'Explicit retry still rejects stale terminal update')
        _, after = request(api, '/requests/' + rid, token=consumer)
        check(before == after and after['status'] == 'REJECTED', 'Rejected record unchanged after both attempts')
        # The existing queue UI already has an explicit local discard control.
        engineer.get_by_role('button', name='Discard', exact=True).click()
        engineer.wait_for_function("JSON.parse(localStorage.getItem('vidyutos_offline_queue')||'[]').length===0")
        check(True, 'Explicit local discard resolves blocked queue; server record unaffected')
        engineer.get_by_role('button', name='Work Orders', exact=True).click()
        name, normal_id = cases['Normal']
        card = engineer.locator('section').filter(has=engineer.get_by_text(name, exact=True))
        card.get_by_placeholder('Meter serial').fill('BROWSER-GOOD-METER')
        engineer_ctx.set_offline(True)
        card.get_by_role('button', name='Save inspection offline').click()
        engineer.wait_for_function("JSON.parse(localStorage.getItem('vidyutos_offline_queue')||'[]').length===1")
        normal_payload = engineer.evaluate("JSON.parse(localStorage.getItem('vidyutos_offline_queue'))[0]")
        with engineer.expect_response(lambda r: '/requests/field-sync' in r.url) as synced:
            engineer_ctx.set_offline(False)
        check(synced.value.status == 200 and synced.value.json()['synced'], 'Normal offline work syncs after reconnect')
        engineer.wait_for_function("JSON.parse(localStorage.getItem('vidyutos_offline_queue')||'[]').length===0")
        token = engineer.evaluate("localStorage.getItem('vidyutos_token')")
        code, duplicate = request(api, '/requests/field-sync', 'POST', normal_payload, token)
        check(code == 200 and duplicate.get('duplicate'), 'Already-completed UUID retry is idempotent')
        engineer.get_by_role('button', name='Completed Jobs', exact=True).click()
        expect(engineer.get_by_text(name + ' · meter BROWSER-GOOD-METER', exact=False)).to_be_visible()
        engineer.screenshot(path=str(evidence / 'browser-completed.png'), full_page=True)
        _, completed = request(api, '/requests/' + normal_id, token=consumer)
        check(completed['status'] == 'COMPLETED' and completed['meter_serial'] == 'BROWSER-GOOD-METER',
              'Consumer API sees correct completed meter')
        check(not errors, 'No uncaught browser JavaScript exceptions')
        summary = {'test_type': 'scripted Chromium browser acceptance; not human-manual',
                   'browser_version': browser.version, 'cases': cases, 'result': 'PASS',
                   'network_offline': 'Playwright browser context set_offline',
                   'page_errors': errors}
        (evidence / 'browser-results.json').write_text(json.dumps(summary, indent=2) + '\n')
        for ctx in contexts:
            ctx.close()
        browser.close()
    print('BROWSER CONFLICT AND NORMAL SYNC CHECKS PASSED')


if __name__ == '__main__':
    main()
