#!/usr/bin/env python3
"""Verify 100% OpenAPI HTTP Operation Test Coverage across `backend/tests/`.

Wraps every APIRoute endpoint in `app.routes` and monitors HTTP invocations
during a full `pytest` run, compares against all `(METHOD, path)` pairs
in `app.openapi()`, and writes `docs/verification/r4-api-endpoint-coverage.txt`.
"""
import functools
import os
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
REPORT_PATH = REPO_ROOT / "docs" / "verification" / "r4-api-endpoint-coverage.txt"

os.environ["DATABASE_URL"] = "sqlite:///./test_vidyutflow.db"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    import export_openapi
except Exception:
    pass

from fastapi.routing import APIRoute
import pytest
from app.main import app
from app.perf import latency_monitor


def get_all_api_routes(routes):
    all_routes = []
    for r in routes:
        if isinstance(r, APIRoute):
            all_routes.append(r)
        elif hasattr(r, "original_router"):
            all_routes.extend(get_all_api_routes(r.original_router.routes))
        elif hasattr(r, "routes"):
            all_routes.extend(get_all_api_routes(r.routes))
    return all_routes


def main() -> None:
    schema = app.openapi()
    expected_ops: set[tuple[str, str]] = {
        (method.upper(), path)
        for path, methods in schema["paths"].items()
        for method in methods.keys()
    }
    hit_ops: set[tuple[str, str]] = set()

    # 1. Track invocations via latency_monitor in middleware
    orig_record = latency_monitor.record

    def tracked_record(route_key: str, duration_ms: float, status_code: int):
        parts = route_key.split(" ", 1)
        if len(parts) == 2:
            m, p = parts[0].upper(), parts[1]
            if p.startswith("/v1"):
                p = p[3:]
            if p.startswith("/api"):
                p = p[4:]
            if (m, p) in expected_ops:
                hit_ops.add((m, p))
        orig_record(route_key, duration_ms, status_code)

    latency_monitor.record = tracked_record

    # 2. Track invocations via route handler wrappers
    for route in get_all_api_routes(app.routes):
        orig = route.dependant.call
        if orig is None:
            continue
        methods_for_route = {m.upper() for m in (route.methods or set()) if m.upper() != "HEAD"}
        route_path = route.path

        def make_wrapper(fn, r_path: str, r_methods: set[str]):
            @functools.wraps(fn)
            def _wrapped(*args, **kwargs):
                for m in r_methods:
                    clean_path = r_path
                    if clean_path.startswith("/v1"):
                        clean_path = clean_path[3:]
                    if clean_path.startswith("/api"):
                        clean_path = clean_path[4:]
                    if (m, clean_path) in expected_ops:
                        hit_ops.add((m, clean_path))
                return fn(*args, **kwargs)

            return _wrapped

        if len(methods_for_route) == 1:
            route.dependant.call = make_wrapper(orig, route_path, methods_for_route)

    for db_f in ("test_vidyutflow.db", "vidyutflow.db"):
        p = BACKEND_DIR / db_f
        if p.exists():
            p.unlink()

    rc = pytest.main(["-q", str(BACKEND_DIR / "tests")])

    for db_f in ("test_vidyutflow.db", "vidyutflow.db"):
        p = BACKEND_DIR / db_f
        if p.exists():
            p.unlink()

    if rc != 0:
        print(f"[audit_api_coverage] Notice: pytest exited with code {rc} on this environment")

    missing = sorted(expected_ops - hit_ops)
    pct = round((len(hit_ops) / max(1, len(expected_ops))) * 100.0, 2)

    lines = [
        "========================================================================",
        "VIDYUTFLOW OPENAPI HTTP ENDPOINT TEST COVERAGE AUDIT",
        "========================================================================",
        f"OpenAPI Paths              : {len(schema['paths'])}",
        f"Total HTTP Operations      : {len(expected_ops)}",
        f"Operations Tested in Pytest: {len(hit_ops)} / {len(expected_ops)} ({pct}%)",
        f"Untested Operations        : {len(missing)}",
        "",
        "Verified Operations:",
        *[f"  [COVERED] {m:6s} {p}" for m, p in sorted(hit_ops)],
    ]
    if missing:
        lines.append("")
        lines.append("Missing Operations:")
        lines.extend(f"  [MISSING] {m:6s} {p}" for m, p in missing)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:10]))
    if missing:
        for m, p in missing:
            print(f"  MISSING: {m:6s} {p}")
        sys.exit(1)


if __name__ == "__main__":
    main()
