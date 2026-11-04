#!/usr/bin/env python3
"""Concurrent local load & cache verification harness (Item #20).

Drives a concurrent multi-worker HTTP read workload against a running VidyutFlow API,
verifying X-Response-Time-Ms headers, X-KPI-Cache / X-Workflow-Cache hits, and
reporting rolling latency percentiles.

HONESTY NOTICE: Results reflect ONLY the local machine/sandbox and synthetic demo data.
Never quote local milliseconds as a UGVCL production benchmark.
"""
import argparse
import concurrent.futures
import json
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BANNER = "== LOCAL CONCURRENT LOAD & CACHE VERIFICATION (synthetic demo DB — NOT a UGVCL benchmark) =="


def call(base: str, path: str, token: str | None = None, data: dict | None = None, method: str = "GET"):
    req = urllib.request.Request(base + path, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, body, timeout=15) as resp:
            raw = resp.read()
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return time.perf_counter() - t0, resp.status, headers, raw
    except urllib.error.HTTPError as e:
        raw = e.read()
        headers = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
        return time.perf_counter() - t0, e.code, headers, raw


def pct(values: list[float], p: float) -> float:
    if not values:
        return float("nan")
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round(p / 100.0 * (len(ordered) - 1))))
    return ordered[idx]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--n", type=int, default=200)
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--user", default="employee@vidyutflow.demo")
    ap.add_argument("--password", default="Demo@12345")
    args = ap.parse_args()

    print(BANNER)
    print(f"target={args.base} total_requests={args.n} concurrency={args.concurrency}")

    t_login, status, _, raw = call(
        args.base,
        "/auth/login",
        data={"username": args.user, "password": args.password},
        method="POST",
    )
    if status != 200:
        print(f"login failed ({status}); is the API running with demo seed?", file=sys.stderr)
        sys.exit(1)
    token = json.loads(raw)["access_token"]
    print(f"auth_warmup: {t_login * 1000:.1f} ms (excluded from workload percentiles)")

    routes = ["/requests", "/requests/kpis/summary", "/workflows/templates", "/notifications"]
    schedule = [routes[i % len(routes)] for i in range(args.n)]

    latencies: list[float] = []
    errors = 0
    kpi_cache_hits = 0
    wf_cache_hits = 0
    per_path: dict[str, list[float]] = {}

    t_wall0 = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        futs = [pool.submit(call, args.base, path, token) for path in schedule]
        for path, fut in zip(schedule, futs):
            dt, code, hdrs, _ = fut.result()
            per_path.setdefault(path, []).append(dt)
            if code < 400:
                latencies.append(dt)
                if hdrs.get("x-kpi-cache") == "HIT":
                    kpi_cache_hits += 1
                if hdrs.get("x-workflow-cache") == "HIT":
                    wf_cache_hits += 1
            else:
                errors += 1
    wall_s = max(1e-6, time.perf_counter() - t_wall0)

    print(f"completed={len(latencies)} errors={errors} throughput={len(latencies)/wall_s:.1f} req/s")
    print(f"cache_hits: kpi_summary={kpi_cache_hits} workflow_templates={wf_cache_hits}")
    print(
        f"client_observed p50={pct(latencies, 50)*1000:.1f} ms  "
        f"p95={pct(latencies, 95)*1000:.1f} ms  "
        f"p99={pct(latencies, 99)*1000:.1f} ms  "
        f"mean={statistics.mean(latencies)*1000 if latencies else 0:.1f} ms"
    )
    for path, dts in sorted(per_path.items()):
        print(f"  {path:<28} n={len(dts):<4} p50={pct(dts, 50)*1000:.1f} ms p95={pct(dts, 95)*1000:.1f} ms")
    print("Disclosure: local loopback synthetic check only — never present as a UGVCL production benchmark.")


if __name__ == "__main__":
    main()
