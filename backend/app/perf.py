"""Performance primitives (Item #20):
1. Thread-safe epoch-invalidated TTL response cache (zero stale reads after writes).
2. Rolling HTTP latency ring-buffer monitor (p50/p95/p99 + per-route stats).
3. Database index inspection helper for live telemetry verification.
"""
import copy
import statistics
import threading
import time
from collections import deque
from typing import Any, Callable
from sqlalchemy import inspect as sa_inspect, text
from .config import settings

PERFORMANCE_DISCLOSURE = (
    "Live in-process telemetry from the running instance (loopback/sandbox or Compose). "
    "Never present local/synthetic latency figures as UGVCL production benchmarks."
)

EXPECTED_PERFORMANCE_INDEXES = [
    ("users", "ix_users_role_zone_active", ["role", "zone", "is_active"]),
    ("connection_requests", "ix_requests_zone_status_created", ["zone", "status", "created_at"]),
    ("connection_requests", "ix_requests_assigned_engineer_status", ["assigned_engineer_id", "status"]),
    ("connection_requests", "ix_requests_consumer_created", ["consumer_id", "created_at"]),
    ("connection_requests", "ix_requests_sla_risk", ["sla_breach_risk"]),
    ("audit_logs", "ix_audit_entity_created", ["entity", "entity_id", "created_at"]),
    ("notifications", "ix_notifications_user_read_created", ["user_id", "read", "created_at"]),
]


class EpochTtlCache:
    """In-memory TTL cache invalidated atomically on any state-mutating write."""

    def __init__(self, name: str):
        self.name = name
        self._lock = threading.Lock()
        self._epoch = 1
        self._store: dict[tuple[Any, ...], tuple[float, Any]] = {}
        self._hits = 0
        self._misses = 0
        self._invalidations = 0

    def get_or_compute(
        self,
        scope_key: tuple[Any, ...],
        ttl_seconds: float,
        compute_fn: Callable[[], Any],
    ) -> tuple[Any, bool]:
        if ttl_seconds <= 0:
            with self._lock:
                self._misses += 1
            return compute_fn(), False

        now = time.monotonic()
        with self._lock:
            epoch = self._epoch
            full_key = (epoch, *scope_key)
            cached = self._store.get(full_key)
            if cached is not None and cached[0] > now:
                self._hits += 1
                return copy.deepcopy(cached[1]), True

        value = compute_fn()
        with self._lock:
            self._misses += 1
            if self._epoch == epoch:
                self._store[(epoch, *scope_key)] = (time.monotonic() + ttl_seconds, copy.deepcopy(value))
        return value, False

    def bump_epoch(self) -> None:
        with self._lock:
            self._epoch += 1
            self._store.clear()
            self._invalidations += 1

    def stats(self) -> dict[str, Any]:
        with self._lock:
            total = self._hits + self._misses
            return {
                "name": self.name,
                "epoch": self._epoch,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_pct": round((self._hits / total) * 100.0, 1) if total else 0.0,
                "invalidations": self._invalidations,
                "entries": len(self._store),
            }


def _percentile(values: list[float], pct_val: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, round((pct_val / 100.0) * (len(ordered) - 1))))
    return round(ordered[idx], 2)


class LatencyMonitor:
    """Thread-safe rolling ring buffer of HTTP request durations in milliseconds."""

    def __init__(self, maxlen: int = 1000):
        self._lock = threading.Lock()
        self._samples: deque[tuple[str, float, int]] = deque(maxlen=maxlen)

    def record(self, route_key: str, duration_ms: float, status_code: int) -> None:
        with self._lock:
            if self._samples.maxlen != settings.latency_window_size:
                self._samples = deque(self._samples, maxlen=settings.latency_window_size)
            self._samples.append((route_key, max(0.0, duration_ms), int(status_code)))

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            items = list(self._samples)
        durations = [d for _, d, _ in items]
        errors = sum(1 for _, _, st in items if st >= 500)
        by_route: dict[str, list[float]] = {}
        for rk, d, _ in items:
            by_route.setdefault(rk, []).append(d)

        per_route = [
            {
                "route": rk,
                "count": len(vals),
                "p50_ms": _percentile(vals, 50),
                "p95_ms": _percentile(vals, 95),
                "mean_ms": round(statistics.mean(vals), 2),
            }
            for rk, vals in sorted(by_route.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:12]
        ]
        return {
            "window_capacity": settings.latency_window_size,
            "sample_count": len(durations),
            "server_error_count": errors,
            "p50_ms": _percentile(durations, 50),
            "p95_ms": _percentile(durations, 95),
            "p99_ms": _percentile(durations, 99),
            "mean_ms": round(statistics.mean(durations), 2) if durations else 0.0,
            "max_ms": round(max(durations), 2) if durations else 0.0,
            "per_route": per_route,
        }


kpi_cache = EpochTtlCache("kpi_summary")
workflow_template_cache = EpochTtlCache("workflow_templates")
latency_monitor = LatencyMonitor(maxlen=settings.latency_window_size)


def bump_all_caches() -> None:
    kpi_cache.bump_epoch()
    workflow_template_cache.bump_epoch()


def ensure_performance_indexes(db_engine) -> None:
    """Create composite performance indexes idempotently on existing SQLite/PostgreSQL tables."""
    if db_engine.dialect.name not in ("sqlite", "postgresql"):
        return
    inspector = sa_inspect(db_engine)
    tables = set(inspector.get_table_names())
    with db_engine.begin() as conn:
        for table_name, index_name, columns in EXPECTED_PERFORMANCE_INDEXES:
            if table_name in tables:
                col_sql = ", ".join(columns)
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({col_sql})"))


def inspect_performance_indexes(db_engine) -> list[dict[str, Any]]:
    inspector = sa_inspect(db_engine)
    tables = set(inspector.get_table_names())
    existing_by_table: dict[str, set[str]] = {}
    for tbl in {t for t, _, _ in EXPECTED_PERFORMANCE_INDEXES}:
        if tbl in tables:
            existing_by_table[tbl] = {idx["name"] for idx in inspector.get_indexes(tbl) if idx.get("name")}
        else:
            existing_by_table[tbl] = set()
    return [
        {
            "table": tbl,
            "index": idx_name,
            "columns": cols,
            "present": idx_name in existing_by_table.get(tbl, set()),
        }
        for tbl, idx_name, cols in EXPECTED_PERFORMANCE_INDEXES
    ]


def build_performance_report(db_engine) -> dict[str, Any]:
    indexes = inspect_performance_indexes(db_engine)
    return {
        "is_synthetic_or_local": True,
        "disclosure": PERFORMANCE_DISCLOSURE,
        "latency": latency_monitor.snapshot(),
        "caches": {
            "ttl_seconds": settings.kpi_cache_ttl_seconds,
            "kpi_summary": kpi_cache.stats(),
            "workflow_templates": workflow_template_cache.stats(),
        },
        "indexes": {
            "expected": len(indexes),
            "present": sum(1 for x in indexes if x["present"]),
            "items": indexes,
        },
    }
