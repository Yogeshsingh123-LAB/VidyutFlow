"""Export current API schema without starting the app or seeding a database."""
import json
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend))
from app.main import app

path = backend.parent / 'docs' / 'api' / 'openapi.json'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + '\n')
print(f'Wrote {path}')
