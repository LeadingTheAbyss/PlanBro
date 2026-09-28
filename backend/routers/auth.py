import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import bcrypt
from fastapi import APIRouter, Cookie, HTTPException, Request, Response

from backend.auth import USER_COLUMNS, get_session_user
from backend.config import get_settings
from backend.db import get_pool
from backend.ids import new_id
from backend.turnstile import verify_turnstile_token
from backend.username import generate_unique_username
from backend.redis_client import check_rate_limit

router = APIRouter(prefix="/api/auth", tags=["auth"])

IST = ZoneInfo("Asia/Kolkata")
SESSION_TTL = timedelta(days=30)


def _today_ist_string() -> str:
    now_ist = datetime.now(IST)
    return f"{now_ist.year}-{now_ist.month:02d}-{now_ist.day:02d}"


def _client_ip(req: Request) -> str:
    return req.headers.get("x-forwarded-for") or req.headers.get("x-real-ip") or "127.0.0.1"


def _set_session_cookie(response: Response, token: str, expires_at: datetime) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
        expires=expires_at,
    )


async def _create_session(user_id: str) -> tuple[str, datetime]:
    token = str(uuid.uuid4())
    # Naive UTC — the DB column is `timestamp without time zone` (Prisma stores UTC implicitly).
    expires_at = datetime.utcnow() + SESSION_TTL
    pool = await get_pool()
    await pool.execute(
        'INSERT INTO "Session" (id, "userId", token, "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, now())',
        new_id(),
        user_id,
        token,
        expires_at,
    )
    return token, expires_at


async def _track_daily_login(user_id: str) -> None:
    # Best-effort — must not break login if it fails, matching the Next.js try/catch.
    try:
        pool = await get_pool()
        today_str = _today_ist_string()
        await pool.execute(
            """
            INSERT INTO "DailyUserStat" (id, "userId", date, "loginCount", "apiCalls", "updatedAt")
            VALUES ($1, $2, $3, 1, 0, now())
            ON CONFLICT ("userId", date) DO UPDATE
            SET "loginCount" = "DailyUserStat"."loginCount" + 1, "updatedAt" = now()
            """,
            new_id(),
            user_id,
            today_str,
        )
    except Exception:
        pass


def _row_to_user_dict(row) -> dict:
    # get_session_user() rows carry session_id/session_expires_at from the JOIN —
    # those aren't User fields and must never leak into an API response.
    # passwordHash is also stripped here (the old Next.js routes serialized the
    # raw Prisma user object including the bcrypt hash — fixed during this port).
    d = dict(row)
    d.pop("session_id", None)
    d.pop("session_expires_at", None)
    d.pop("passwordHash", None)
    return d


@router.post("")
async def google_login(req: Request, response: Response):
    body = await req.json()
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="No token provided")

    settings = get_settings()
    try:
        payload = await _verify_google_token(token, settings.google_client_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    name = payload.get("name") or "User"
    picture = payload.get("picture")

    pool = await get_pool()
    user_row = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE email = $1', email)

    if not user_row:
        username = await generate_unique_username(name)
        user_id = new_id()
        await pool.execute(
            """
            INSERT INTO "User" (id, email, name, picture, username, "authProvider", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, 'google', now(), now())
            """,
            user_id,
            email,
            name,
            picture,
            username,
        )
        user_row = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE id = $1', user_id)
    else:
        updates = {}
        if picture and user_row["picture"] != picture:
            updates["picture"] = picture
        if not user_row["username"]:
            updates["username"] = await generate_unique_username(user_row["name"] or name)
        if updates:
            set_clause = ", ".join(f'"{k}" = ${i + 2}' for i, k in enumerate(updates))
            await pool.execute(
                f'UPDATE "User" SET {set_clause}, "updatedAt" = now() WHERE email = $1',
                email,
                *updates.values(),
            )
            user_row = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE email = $1', email)

    session_token, expires_at = await _create_session(user_row["id"])
    await _track_daily_login(user_row["id"])

    _set_session_cookie(response, session_token, expires_at)
    return {"user": _row_to_user_dict(user_row)}


async def _verify_google_token(token: str, client_id: str) -> dict:
    """Verifies a Google ID token's signature/audience/issuer against Google's
    JWKS — replaces the old unverified manual base64 JWT decode."""
    import asyncio
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    def _verify():
        request = google_requests.Request()
        return google_id_token.verify_oauth2_token(token, request, client_id)

    return await asyncio.to_thread(_verify)


@router.post("/logout")
async def logout(response: Response, brewplans_session: str | None = Cookie(default=None)):
    settings = get_settings()
    if brewplans_session:
        pool = await get_pool()
        await pool.execute('DELETE FROM "Session" WHERE token = $1', brewplans_session)
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"success": True}


@router.get("/me")
async def get_me(brewplans_session: str | None = Cookie(default=None)):
    user_row = await get_session_user(brewplans_session)
    if not user_row:
        return Response(
            content='{"user": null}',
            status_code=401,
            media_type="application/json",
        )

    pool = await get_pool()
    settings = get_settings()

    if not user_row["username"]:
        username = await generate_unique_username(user_row["name"])
        await pool.execute('UPDATE "User" SET username = $1, "updatedAt" = now() WHERE id = $2', username, user_row["id"])
        user_row = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE id = $1', user_row["id"])

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    trip_rows = await pool.fetch(
        'SELECT snapshot FROM "TripHistory" WHERE "userId" = $1 AND "createdAt" >= $2',
        user_row["id"],
        today_start,
    )

    plan_trips_today = 0
    quick_trips_today = 0
    for row in trip_rows:
        import json

        snap = row["snapshot"]
        if isinstance(snap, str):
            try:
                snap = json.loads(snap)
            except Exception:
                snap = None
        if isinstance(snap, dict) and snap.get("type") == "quick-trip":
            quick_trips_today += 1
        else:
            plan_trips_today += 1

    user_dict = _row_to_user_dict(user_row)
    user_dict["isAdmin"] = settings.is_admin_email(user_row["email"])
    user_dict["tripsToday"] = plan_trips_today
    user_dict["quickTripsToday"] = quick_trips_today
    return {"user": user_dict}


@router.put("/me")
async def update_me(req: Request, brewplans_session: str | None = Cookie(default=None)):
    user_row = await get_session_user(brewplans_session)
    if not user_row:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await req.json()
    updates = {}
    if body.get("name"):
        updates["name"] = body["name"]
    if "picture" in body:
        updates["picture"] = body["picture"]

    pool = await get_pool()
    if updates:
        set_clause = ", ".join(f'"{k}" = ${i + 2}' for i, k in enumerate(updates))
        await pool.execute(
            f'UPDATE "User" SET {set_clause}, "updatedAt" = now() WHERE id = $1',
            user_row["id"],
            *updates.values(),
        )
    updated = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE id = $1', user_row["id"])
    return {"user": _row_to_user_dict(updated)}


@router.post("/quick-login")
async def quick_login(req: Request, response: Response):
    ip = _client_ip(req)

    rate_limit = await check_rate_limit(f"quick-login:{ip}", 3, 900)
    if not rate_limit["success"]:
        raise HTTPException(status_code=429, detail="Too many login attempts from this network. Please try again later.")

    body = await req.json()
    username = body.get("username")
    password = body.get("password")
    turnstile_token = body.get("turnstileToken")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    normalized_username = username.strip().lower()

    user_rate_limit = await check_rate_limit(f"quick-login-user:{normalized_username}", 3, 900)
    if not user_rate_limit["success"]:
        raise HTTPException(status_code=429, detail="Too many login attempts for this account. Please try again later.")

    if not await verify_turnstile_token(turnstile_token, ip):
        raise HTTPException(status_code=400, detail="Human verification failed. Please try again.")

    pool = await get_pool()
    user_row = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE username = $1', normalized_username)
    if not user_row or not user_row["passwordHash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not bcrypt.checkpw(password.encode(), user_row["passwordHash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    session_token, expires_at = await _create_session(user_row["id"])
    await _track_daily_login(user_row["id"])

    _set_session_cookie(response, session_token, expires_at)
    return {"user": _row_to_user_dict(user_row)}


@router.post("/quick-signup")
async def quick_signup(req: Request, response: Response):
    import re

    ip = _client_ip(req)

    rate_limit = await check_rate_limit(f"quick-signup:{ip}", 3, 3600)
    if not rate_limit["success"]:
        raise HTTPException(status_code=429, detail="Too many accounts created from this network. Please try again later.")

    body = await req.json()
    username = body.get("username")
    password = body.get("password")
    turnstile_token = body.get("turnstileToken")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Please choose a username and password.")

    normalized_username = str(username).strip().lower()
    if not re.match(r"^[a-z0-9_-]{3,20}$", normalized_username):
        raise HTTPException(status_code=400, detail="Username must be 3-20 characters — letters, numbers, hyphens, or underscores only.")
    if len(str(password)) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if not await verify_turnstile_token(turnstile_token, ip):
        raise HTTPException(status_code=400, detail="Human verification failed. Please try again.")

    pool = await get_pool()
    existing = await pool.fetchval('SELECT id FROM "User" WHERE username = $1', normalized_username)
    if existing:
        raise HTTPException(status_code=409, detail="That username is already taken. Please choose another.")

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()

    user_id = new_id()
    try:
        await pool.execute(
            """
            INSERT INTO "User" (id, email, name, username, "passwordHash", "authProvider", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, 'quick', now(), now())
            """,
            user_id,
            f"{normalized_username}@quick.brewplans.local",
            normalized_username,
            normalized_username,
            password_hash,
        )
    except Exception as e:
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(status_code=409, detail="That username is already taken. Please choose another.")
        raise

    user_row = await pool.fetchrow(f'SELECT {USER_COLUMNS} FROM "User" WHERE id = $1', user_id)

    session_token, expires_at = await _create_session(user_id)
    await _track_daily_login(user_id)

    _set_session_cookie(response, session_token, expires_at)
    return {"user": _row_to_user_dict(user_row)}
