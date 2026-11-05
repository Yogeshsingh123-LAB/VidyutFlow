"""In-memory event bus and SSE formatter for Phase 12 real-time transformer telemetry and alerts."""
import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any

logger = logging.getLogger("transformer_event_bus")


def now_utc():
    return datetime.now(timezone.utc)


def format_sse(
    event: str | None = None,
    data: Any = None,
    event_id: str | None = None,
    comment: str | None = None,
) -> str:
    """Format fields into a standard Server-Sent Events (SSE) text frame."""
    lines: list[str] = []
    if comment:
        lines.append(f": {comment}")
    if event_id:
        lines.append(f"id: {event_id}")
    if event:
        lines.append(f"event: {event}")
    if data is not None:
        payload = json.dumps(data) if not isinstance(data, str) else data
        for part in payload.splitlines():
            lines.append(f"data: {part}")
        if not payload:
            lines.append("data: ")
    return "\n".join(lines) + "\n\n"


class TransformerEventBus:
    """Thread-safe and async-safe pub/sub event bus for transformer telemetry & alerts."""

    def __init__(self, history_limit: int = 50) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()
        self._history: list[dict[str, Any]] = []
        self._history_limit = history_limit

    async def subscribe(self, maxsize: int = 500) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
        async with self._lock:
            self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        async with self._lock:
            self._subscribers.discard(q)

    def _record_history(self, event_dict: dict[str, Any]) -> None:
        self._history.append(event_dict)
        if len(self._history) > self._history_limit:
            self._history.pop(0)

    def get_recent(
        self,
        zone: str | None = None,
        transformer_id: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Retrieve recent events matching zone and transformer filters."""
        matched: list[dict[str, Any]] = []
        for ev in reversed(self._history):
            if zone:
                ev_zone = ev.get("zone")
                if ev_zone and ev_zone.strip().lower() != zone.strip().lower():
                    continue
            if transformer_id:
                data = ev.get("data") or {}
                ev_tr_id = data.get("transformer_id")
                ev_code = data.get("utility_asset_code")
                if ev_tr_id != transformer_id and ev_code != transformer_id:
                    continue
            matched.append(ev)
            if len(matched) >= limit:
                break
        return list(reversed(matched))

    def publish_sync(self, event_type: str, payload: dict[str, Any], zone: str | None = None) -> None:
        """Publish event from synchronous route handlers, background tasks, or worker threads."""
        event_dict = {
            "event": event_type,
            "data": payload,
            "zone": zone,
            "timestamp": now_utc().isoformat(),
        }
        self._record_history(event_dict)
        for q in list(self._subscribers):
            try:
                q.put_nowait(event_dict)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    q.put_nowait(event_dict)
                except asyncio.QueueFull:
                    pass
            except Exception as e:
                logger.debug("Failed to deliver event to subscriber: %s", e)

    async def publish(self, event_type: str, payload: dict[str, Any], zone: str | None = None) -> None:
        """Publish event from asynchronous coroutines."""
        event_dict = {
            "event": event_type,
            "data": payload,
            "zone": zone,
            "timestamp": now_utc().isoformat(),
        }
        self._record_history(event_dict)
        async with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                q.put_nowait(event_dict)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    q.put_nowait(event_dict)
                except asyncio.QueueFull:
                    pass
            except Exception as e:
                logger.debug("Failed to deliver event to subscriber: %s", e)


transformer_event_bus = TransformerEventBus()

