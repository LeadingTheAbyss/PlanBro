"""
Run this once to create the PlaceCache table in the PostgreSQL database.
Usage: py services/create_place_cache_table.py
"""
import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv()

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS "PlaceCache" (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "cacheKey"  TEXT UNIQUE NOT NULL,
    data        JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "PlaceCache_cacheKey_idx" ON "PlaceCache"("cacheKey");
"""

async def main():
    db_url = os.environ.get("DATABASE_URL", "")
    if "channel_binding=require" in db_url:
        db_url = db_url.replace("&channel_binding=require", "").replace("?channel_binding=require", "")

    conn = await asyncpg.connect(db_url)
    try:
        await conn.execute(CREATE_SQL)
        print("PlaceCache table created (or already exists).")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
