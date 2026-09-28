"""
Redis cache helpers.

This is the sole caching utility for the backend.
All Google Places data flows through _cache_get / _cache_set.

No third-party image sources (Wikipedia, Openverse, Flickr, Pexels, etc.)
are used anywhere. Google Places API is the only image source.
"""

import os
import httpx
import asyncio
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

_shared_redis_client: Optional[httpx.AsyncClient] = None

def _get_redis_client() -> httpx.AsyncClient:
    global _shared_redis_client
    if _shared_redis_client is None or _shared_redis_client.is_closed:
        _shared_redis_client = httpx.AsyncClient(timeout=5.0)
    return _shared_redis_client


async def _cache_get(key: str, prefix: str = "imgcache") -> Optional[str]:
    """Return the cached string value for `key`, or None on miss/error."""
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return None
    try:
        headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        client = _get_redis_client()
        res = await client.get(
            f"{UPSTASH_URL}/get/{prefix}:{key}", headers=headers
        )
        if res.status_code == 200:
            return res.json().get("result")
    except Exception as e:
        print(f"[Cache] get error: {e}")
    return None


async def _cache_set(key: str, value: str, ttl_seconds: int = 86400, prefix: str = "imgcache") -> None:
    """Store `value` under `key` with a TTL. Non-fatal on error."""
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return
    try:
        headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        client = _get_redis_client()
        await client.post(
            f"{UPSTASH_URL}/pipeline",
            headers=headers,
            json=[["SET", f"{prefix}:{key}", value, "EX", ttl_seconds]],
        )
    except Exception as e:
        print(f"[Cache] set error: {e}")
