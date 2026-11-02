"""Central Redis-backed + bounded in-process fallback rate limiter (Item #21).

When `settings.redis_url` is configured (e.g. `redis://redis:6379/0` in Docker Compose),
rate limits are enforced centrally across all worker processes via atomic Redis `INCR` + `TTL`.
When `redis_url` is unset or unreachable in local SQLite dev/tests, falls back cleanly to
the bounded thread-safe in-memory window without failing open.
"""
import math
import time
from threading import Lock
from fastapi import HTTPException, Request
from .config import settings


class LoginLimiter:
    def __init__(
        self,
        attempts: int,
        window: int,
        max_clients: int = 10000,
        clock=time.monotonic,
        redis_url: str = "",
        namespace: str = "vidyutflow:rl:auth",
    ):
        self.attempts = attempts
        self.window = window
        self.max_clients = max_clients
        self.clock = clock
        self.redis_url = redis_url
        self.namespace = namespace
        self._redis = None
        self._buckets: dict[str, tuple[float, int]] = {}
        self._lock = Lock()

    def _get_redis(self):
        url = self.redis_url or settings.redis_url
        if not url:
            return None
        if self._redis is None:
            try:
                import redis
                self._redis = redis.Redis.from_url(url, socket_connect_timeout=0.5, socket_timeout=0.5)
            except Exception:
                return None
        return self._redis

    def _check_redis(self, client: str) -> tuple[bool, float] | None:
        r = self._get_redis()
        if r is None:
            return None
        key = f"{self.namespace}:{client}"
        try:
            pipe = r.pipeline()
            pipe.incr(key, 1)
            pipe.ttl(key)
            count, ttl = pipe.execute()
            if int(count) == 1 or int(ttl) < 0:
                r.expire(key, int(self.window))
                ttl = self.window
            if int(count) > self.attempts:
                return False, max(1.0, float(ttl))
            return True, 0.0
        except Exception:
            return None

    def check(self, client: str):
        redis_res = self._check_redis(client)
        if redis_res is not None:
            allowed, retry_s = redis_res
            if allowed:
                return
            raise HTTPException(
                429,
                "Too many authentication attempts. Try again later.",
                headers={"Retry-After": str(max(1, math.ceil(retry_s)))},
            )

        with self._lock:
            now = self.clock()
            self._buckets = {k: v for k, v in self._buckets.items() if v[0] > now}
            expires, count = self._buckets.get(client, (now + self.window, 0))
            if client not in self._buckets and len(self._buckets) >= self.max_clients:
                retry = min(v[0] for v in self._buckets.values()) - now
            elif count >= self.attempts:
                retry = expires - now
            else:
                self._buckets[client] = (expires, count + 1)
                return
        raise HTTPException(
            429,
            "Too many login attempts. Try again later.",
            headers={"Retry-After": str(max(1, math.ceil(retry)))},
        )


login_limiter = LoginLimiter(settings.login_max_attempts, settings.login_window_seconds)


def enforce_login_limit(request: Request):
    # Never parse user-supplied X-Forwarded-For here. Trust configuration belongs to deployment.
    login_limiter.check(request.client.host if request.client else "unknown")
