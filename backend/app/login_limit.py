"""Bounded, process-local login throttle. Shared gateway enforcement is production work."""
import math
import time
from threading import Lock
from fastapi import HTTPException, Request
from .config import settings


class LoginLimiter:
    def __init__(self, attempts, window, max_clients=10000, clock=time.monotonic):
        self.attempts = attempts
        self.window = window
        self.max_clients = max_clients
        self.clock = clock
        self._buckets = {}
        self._lock = Lock()

    def check(self, client):
        with self._lock:
            now = self.clock()
            # Expiry cleanup bounds memory, including for clients that never return.
            self._buckets = {k: v for k, v in self._buckets.items() if v[0] > now}
            expires, count = self._buckets.get(client, (now + self.window, 0))
            if client not in self._buckets and len(self._buckets) >= self.max_clients:
                retry = min(v[0] for v in self._buckets.values()) - now
            elif count >= self.attempts:
                retry = expires - now
            else:
                self._buckets[client] = (expires, count + 1)
                return
        raise HTTPException(429, "Too many login attempts. Try again later.",
                            headers={"Retry-After": str(max(1, math.ceil(retry)))})


login_limiter = LoginLimiter(settings.login_max_attempts, settings.login_window_seconds)


def enforce_login_limit(request: Request):
    # Never parse user-supplied X-Forwarded-For here. Trust configuration belongs to deployment.
    login_limiter.check(request.client.host if request.client else "unknown")
