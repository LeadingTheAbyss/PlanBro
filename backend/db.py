import json

import asyncpg

from backend.config import get_settings

_pool: asyncpg.Pool | None = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    # Prisma's Json fields are Postgres jsonb/json columns. asyncpg treats
    # those as opaque text by default — register a codec so Python dicts/lists
    # pass straight through as query params and come back decoded, matching
    # how Prisma Client transparently (de)serializes JSON fields.
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )
    await conn.set_type_codec(
        "json",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )


def _clean_url(url: str) -> str:
    # Same fixup as services/db.py — some hosted Postgres URLs include a param
    # asyncpg doesn't understand.
    if "channel_binding=require" in url:
        url = url.replace("&channel_binding=require", "")
        url = url.replace("?channel_binding=require", "")
    return url


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not set in environment")
        _pool = await asyncpg.create_pool(
            _clean_url(settings.database_url),
            min_size=1,
            max_size=10,
            command_timeout=30.0,
            init=_init_connection,
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
