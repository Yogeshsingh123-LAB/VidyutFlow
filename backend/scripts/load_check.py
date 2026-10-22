#!/usr/bin/env python3
"""R4 load check — a small, honest, LOCAL measurement of API responsiveness.

Feeds one authenticated caller a mixed read workload (default 100 requests) against a
running VidyutFlow API and prints latency percentiles. Results are LOCAL and SYNTHETIC
(demo database, single process, loopback) — they are NOT UGVCL production benchmarks.

Usage:
    python scripts/load_check.py [--base http://127.0.0.1:8000] [--n 100]
                                 [--user officer@vidyutflow.demo --password Demo@12345]
"""
import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BANNER = "== LOCAL, SYNTHETIC load check — single caller, loopback, demo DB. Not a UGVCL benchmark. =="


def call(base, path, token=None, data=None, method="GET"):
    req = urllib.request.Request(base + path, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, body, timeout=10) as resp:
            resp.read()
            return time.perf_counter() - t0, resp.status
    except urllib.error.HTTPError as e:
        e.read()
        return time.perf_counter() - t0, e.code


def pct(values, p):
    if not values:
        return float("nan")
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round(p / 100 * (len(ordered) - 1))))
    return ordered[idx]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--user", default="employee@vidyutflow.demo")
    ap.add_argument("--password", default="Demo@12345")
    args = ap.parse_args()

    print(BANNER)
    print(f"target={args.base} requests={args.n}")

    t, status = call(args.base, "/auth/login", data={"username": args.user, "password": args.password},
                     method="POST")
    if status != 200:
        print(f"login failed ({status}); is the API running with demo seed?", file=sys.stderr)
        sys.exit(1)
    print(f"login: {t*1000:.1f} ms (excluded from percentiles)")

    # Re-login via JSON-free token fetch: /auth/login returns JSON; redo to capture token
    req = urllib.request.Request(args.base + "/auth/login", method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, urllib.parse.urlencode(
            {"username": args.user, "password": args.password}).encode(), timeout=10) as resp:
        token = json.loads(resp.read())["access_token"]

    mix = [("/requests", 0.5), ("/requests/kpis/summary", 0.3), ("/notifications", 0.2)]
    latencies, errors, per_path = [], 0, {}
    for i in range(args.n):
        path = mix[min(len(mix) - 1, int(i / args.n * len(mix)))][0]
        dt, status = call(args.base, path, token=token)
        per_path.setdefault(path, []).append(dt)
        if status < 400:
            latencies.append(dt)
        else:
            errors += 1

    print(f"completed={len(latencies)} errors={errors}")
    print(f"overall p50={pct(latencies,50)*1000:.1f} ms  p95={pct(latencies,95)*1000:.1f} ms  "
          f"p99={pct(latencies,99)*1000:.1f} ms  max={max(latencies, default=0)*1000:.1f} ms  "
          f"mean={statistics.mean(latencies)*1000 if latencies else 0:.1f} ms")
    for path, dts in per_path.items():
        print(f"  {path:<28} n={len(dts):<4} p50={pct(dts,50)*1000:.1f} ms p95={pct(dts,95)*1000:.1f} ms")
    print("Quote as: 'measured locally on synthetic demo data (p95 above)' — never as a UGVCL figure.")


if __name__ == "__main__":
    main()
