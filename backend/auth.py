from datetime import datetime

from fastapi import Cookie, Depends, HTTPException

from backend.config import get_settings
from backend.db import get_pool

# Bare "id, email, ..." — safe to SELECT directly from "User" (aliased as u where joined).
USER_COLUMNS = (
    'id, email, name, picture, username, "passwordHash", "authProvider", '
    '"apiCalls", "apiCallsFlights", "apiCallsTrains", "apiCallsBusses", '
    '"apiCallsHotels", "apiCallsPlaces", "apiCallsRecommendations", '
    '"lastApiCallDate", "createdAt", "updatedAt"'
)

# Same columns, qualified with the "u" alias — for queries that JOIN Session (aliased "s") + User (aliased "u"),
# where a bare "id" would be ambiguous between the two tables.
USER_COLUMNS_QUALIFIED = (
    'u.id, u.email, u.name, u.picture, u.username, u."passwordHash", u."authProvider", '
    'u."apiCalls", u."apiCallsFlights", u."apiCallsTrains", u."apiCallsBusses", '
    'u."apiCallsHotels", u."apiCallsPlaces", u."apiCallsRecommendations", '
    'u."lastApiCallDate", u."createdAt", u."updatedAt"'
)


async def get_session_user(token: str | None):
    """Looks up the Session row + owning User for a session token.
    Returns None if the token is missing, unknown, or expired."""
    if not token:
        return None
    pool = await get_pool()
    row = await pool.fetchrow(
        f"""
        SELECT s.id AS session_id, s."expiresAt" AS session_expires_at,
               {USER_COLUMNS_QUALIFIED}
        FROM "Session" s
        JOIN "User" u ON u.id = s."userId"
        WHERE s.token = $1
        """,
        token,
    )
    if not row:
        return None
    # All timestamp columns are `timestamp without time zone` (Prisma stores UTC
    # implicitly) — compare against naive UTC "now", not an aware datetime.
    if row["session_expires_at"] < datetime.utcnow():
        return None
    return row


async def get_current_user(
    brewplans_session: str | None = Cookie(default=None),
):
    """FastAPI dependency: resolves the logged-in user from the session cookie.
    Raises 401 if missing/expired — the single replacement for the inline
    cookie -> Session -> expiry-check block duplicated across ~15 Next.js routes."""
    user = await get_session_user(brewplans_session)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


async def get_optional_user(
    brewplans_session: str | None = Cookie(default=None),
):
    """Same lookup as get_current_user but returns None instead of raising —
    for routes where auth is used only for rate/quota accounting, not gating."""
    return await get_session_user(brewplans_session)


async def require_admin(user=Depends(get_current_user)):
    """FastAPI dependency: get_current_user + admin-allowlist check. 403 if not admin."""
    settings = get_settings()
    if not settings.is_admin_email(user["email"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
