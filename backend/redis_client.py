import json
from typing import Any

import httpx

from backend.config import get_settings

_client = httpx.AsyncClient(timeout=3.0)


async def _pipeline(commands: list[list[Any]]) -> list[Any]:
    settings = get_settings()
    if not settings.upstash_redis_url or not settings.upstash_redis_token:
        raise RuntimeError("Upstash Redis is not configured")
    res = await _client.post(
        f"{settings.upstash_redis_url}/pipeline",
        headers={"Authorization": f"Bearer {settings.upstash_redis_token}"},
        json=commands,
    )
    res.raise_for_status()
    return [r.get("result") for r in res.json()]


async def incr(key: str) -> int:
    (result,) = await _pipeline([["INCR", key]])
    return int(result)


async def expire(key: str, seconds: int) -> None:
    await _pipeline([["EXPIRE", key, seconds]])


async def check_rate_limit(key: str, limit: int, window_seconds: int) -> dict:
    """Mirrors src/lib/rateLimit.ts checkRateLimit — fails open on Redis errors."""
    rate_key = f"ratelimit:{key}"
    try:
        current = await incr(rate_key)
        if current == 1:
            await expire(rate_key, window_seconds)
        return {
            "success": current <= limit,
            "current": current,
            "limit": limit,
            "remaining": max(0, limit - current),
        }
    except Exception:
        return {"success": True, "current": 0, "limit": limit, "remaining": limit}


async def get_json(key: str) -> Any | None:
    try:
        (result,) = await _pipeline([["GET", key]])
        if result is None:
            return None
        return json.loads(result)
    except Exception:
        return None


async def set_json(key: str, value: Any, ttl_seconds: int | None = None) -> None:
    try:
        payload = json.dumps(value)
        if ttl_seconds:
            await _pipeline([["SET", key, payload, "EX", ttl_seconds]])
        else:
            await _pipeline([["SET", key, payload]])
    except Exception:
        pass


async def delete(key: str) -> None:
    try:
        await _pipeline([["DEL", key]])
    except Exception:
        pass


async def get_str(key: str) -> str | None:
    try:
        (result,) = await _pipeline([["GET", key]])
        return result
    except Exception:
        return None


async def set_str(key: str, value: str, ttl_seconds: int | None = None) -> None:
    try:
        if ttl_seconds:
            await _pipeline([["SET", key, value, "EX", ttl_seconds]])
        else:
            await _pipeline([["SET", key, value]])
    except Exception:
        pass
