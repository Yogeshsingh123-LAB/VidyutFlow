import json
from pathlib import Path
from app.main import app


def test_openapi_matches_reviewed_snapshot():
    snapshot = Path(__file__).resolve().parents[2] / 'docs' / 'api' / 'openapi.json'
    assert app.openapi() == json.loads(snapshot.read_text()), (
        'API schema changed: review docs/API_CONTRACT.md and regenerate the snapshot deliberately.'
    )
    schema = app.openapi()
    assert len(schema['paths']) == 39
    assert sum(len(methods) for methods in schema['paths'].values()) == 44
