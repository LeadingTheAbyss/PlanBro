from datetime import datetime

from fastapi import APIRouter, Cookie, HTTPException, Request

from backend import redis_client
from backend.db import get_pool
from backend.ids import new_id

router = APIRouter(prefix="/api/state", tags=["state"])

# AppState.stateJson is a plain Postgres `text` column holding an
# already-JSON.stringify'd string from Zustand's persist middleware — it is
# NOT a jsonb column, so this stores/returns raw strings, never decoding.


async def _get_user_id(brewplans_session: str | None) -> str | None:
    if not brewplans_session:
        return None
    try:
        cache_key = f"session:{brewplans_session}"
        cached_user_id = await redis_client.get_str(cache_key)
        if cached_user_id:
            return cached_user_id

        pool = await get_pool()
        session = await pool.fetchrow(
            'SELECT "userId", "expiresAt" FROM "Session" WHERE token = $1',
            brewplans_session,
        )
        if not session:
            return None
        if session["expiresAt"] < datetime.utcnow():
            return None

        await redis_client.set_str(cache_key, session["userId"], ttl_seconds=3600)
        return session["userId"]
    except Exception:
        return None


def _scoped_name(name: str, user_id: str) -> str:
    return name if name.startswith("shared-") else f"{user_id}:{name}"


@router.get("")
async def get_state(name: str, brewplans_session: str | None = Cookie(default=None)):
    user_id = await _get_user_id(brewplans_session)
    if not user_id:
        return {"value": None}

    scoped_name = _scoped_name(name, user_id)
    cache_key = f"appState:{scoped_name}"

    cached = await redis_client.get_str(cache_key)
    if cached is not None:
        return {"value": cached}

    pool = await get_pool()
    row = await pool.fetchrow('SELECT * FROM "AppState" WHERE "storeName" = $1', scoped_name)
    if not row:
        return {"value": None}

    await redis_client.set_str(cache_key, row["stateJson"], ttl_seconds=600)
    return {"value": row["stateJson"]}


@router.post("")
async def save_state(req: Request, brewplans_session: str | None = Cookie(default=None)):
    body = await req.json()
    name = body.get("name")
    value = body.get("value")
    if not name or value is None:
        raise HTTPException(status_code=400, detail="Store name and value are required")

    user_id = await _get_user_id(brewplans_session)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    scoped_name = _scoped_name(name, user_id)
    cache_key = f"appState:{scoped_name}"

    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO "AppState" (id, "storeName", "stateJson", "updatedAt")
        VALUES ($1, $2, $3, now())
        ON CONFLICT ("storeName") DO UPDATE SET "stateJson" = $3, "updatedAt" = now()
        RETURNING id
        """,
        new_id(),
        scoped_name,
        value,
    )
    await redis_client.delete(cache_key)

    return {"success": True, "id": row["id"]}


@router.delete("")
async def delete_state(name: str, brewplans_session: str | None = Cookie(default=None)):
    user_id = await _get_user_id(brewplans_session)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    scoped_name = _scoped_name(name, user_id)
    cache_key = f"appState:{scoped_name}"

    pool = await get_pool()
    await pool.execute('DELETE FROM "AppState" WHERE "storeName" = $1', scoped_name)
    await redis_client.delete(cache_key)

    return {"success": True}
