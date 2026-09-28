from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException

from backend.auth import get_current_user, get_optional_user
from backend.config import get_settings
from backend.db import get_pool
from backend.ids import new_id

IST = ZoneInfo("Asia/Kolkata")

# category -> (User counter column, DailyUserStat counter column, per-day cap or None)
# Mirrors the per-route caps hardcoded across the Next.js proxy routes.
CATEGORIES = {
    "places": ("apiCallsPlaces", "apiCallsPlaces", 20),
    "food": ("apiCallsPlaces", None, None),  # food shares the places counter; no dedicated column exists
    "hotels": ("apiCallsHotels", None, None),
    "trains": ("apiCallsTrains", "apiCallsTrains", 10),
    "buses": ("apiCallsBusses", "apiCallsBuses", 5),
    "autocomplete": (None, "apiCallsAutocomplete", 200),
    "recommendations": ("apiCallsRecommendations", "apiCallsRecommendations", 50),
    "eta": (None, "apiCallsETA", 250),
    "reviews": (None, "apiCallsReviews", 250),
    "images": (None, "apiCallsImages", 5000),
}


def _today_ist_string() -> str:
    now_ist = datetime.now(IST)
    return f"{now_ist.year}-{now_ist.month:02d}-{now_ist.day:02d}"


def _is_new_day(last_call_date: datetime) -> bool:
    now = datetime.now(timezone.utc)
    if last_call_date.tzinfo is None:
        last_call_date = last_call_date.replace(tzinfo=timezone.utc)
    return (now.year, now.month, now.day) != (last_call_date.year, last_call_date.month, last_call_date.day)


def check_and_increment_quota(category: str):
    """FastAPI dependency factory. Consolidates the ~9x-duplicated
    'reset if new day -> check caps -> increment' block from the Next.js
    proxy routes into one place. Raises 429 if over the daily cap
    (global 150/day, plus a per-category sub-cap where one exists)."""
    user_column, daily_column, daily_cap = CATEGORIES[category]

    async def _dep(user=Depends(get_current_user)):
        settings = get_settings()
        pool = await get_pool()
        is_admin = settings.is_admin_email(user["email"])
        today_str = _today_ist_string()

        current_calls = user["apiCalls"]
        if _is_new_day(user["lastApiCallDate"]):
            current_calls = 0

        daily_stat = await pool.fetchrow(
            'SELECT * FROM "DailyUserStat" WHERE "userId" = $1 AND date = $2',
            user["id"],
            today_str,
        )

        if not is_admin:
            if current_calls >= settings.daily_api_quota:
                raise HTTPException(
                    status_code=429,
                    detail="You have reached API Calls limit, higher API limits will be available for PlanBro Pro users from next week onwards.",
                )
            if daily_column and daily_cap is not None:
                current_category_calls = (daily_stat[daily_column] if daily_stat else 0) or 0
                if current_category_calls >= daily_cap:
                    raise HTTPException(
                        status_code=429,
                        detail=f"Daily limit reached for {category}. Pro upgrade available soon.",
                    )

        async with pool.acquire() as conn:
            async with conn.transaction():
                user_col_sql = f', "{user_column}" = "{user_column}" + 1' if user_column else ""
                await conn.execute(
                    f'UPDATE "User" SET "apiCalls" = $1, "lastApiCallDate" = now(){user_col_sql} WHERE id = $2',
                    current_calls + 1,
                    user["id"],
                )

                daily_col_sql = f', "{daily_column}" = "DailyUserStat"."{daily_column}" + 1' if daily_column else ""
                daily_col_insert = f', "{daily_column}"' if daily_column else ""
                daily_col_value = ", 1" if daily_column else ""
                await conn.execute(
                    f"""
                    INSERT INTO "DailyUserStat" (id, "userId", date, "apiCalls"{daily_col_insert}, "updatedAt")
                    VALUES ($1, $2, $3, 1{daily_col_value}, now())
                    ON CONFLICT ("userId", date) DO UPDATE
                    SET "apiCalls" = "DailyUserStat"."apiCalls" + 1{daily_col_sql}, "updatedAt" = now()
                    """,
                    new_id(),
                    user["id"],
                    today_str,
                )

        return user

    return _dep


async def check_and_increment_transport_quota(mode: str = "all", user=Depends(get_current_user)):
    """Like check_and_increment_quota, but for /api/transport specifically —
    which columns get incremented (and checked) depends on the requested
    `mode` (flight/train/bus/all), unlike every other quota-gated route which
    always touches one fixed category. FastAPI resolves `mode` from the
    request's own query params here, so this reads the same `mode` the route
    handler receives — no factory/closure needed."""
    settings = get_settings()
    pool = await get_pool()
    is_admin = settings.is_admin_email(user["email"])
    today_str = _today_ist_string()

    current_calls = user["apiCalls"]
    if _is_new_day(user["lastApiCallDate"]):
        current_calls = 0

    daily_stat = await pool.fetchrow(
        'SELECT * FROM "DailyUserStat" WHERE "userId" = $1 AND date = $2',
        user["id"],
        today_str,
    )

    want_flight = mode in ("flight", "all")
    want_train = mode in ("train", "all")
    want_bus = mode in ("bus", "all")

    if not is_admin:
        if current_calls >= settings.daily_api_quota:
            raise HTTPException(
                status_code=429,
                detail="You have reached API Calls limit, higher API limits will be available for PlanBro Pro users from next week onwards.",
            )
        if want_train and (daily_stat["apiCallsTrains"] if daily_stat else 0) >= 10:
            raise HTTPException(status_code=429, detail="Daily limit reached for Trains. Pro upgrade available soon.")
        if want_bus and (daily_stat["apiCallsBuses"] if daily_stat else 0) >= 5:
            raise HTTPException(status_code=429, detail="Daily limit reached for Buses. Pro upgrade available soon.")

    async with pool.acquire() as conn:
        async with conn.transaction():
            set_parts = []
            if want_flight:
                set_parts.append('"apiCallsFlights" = "apiCallsFlights" + 1')
            if want_train:
                set_parts.append('"apiCallsTrains" = "apiCallsTrains" + 1')
            if want_bus:
                set_parts.append('"apiCallsBusses" = "apiCallsBusses" + 1')
            extra_sql = ("," + ", ".join(set_parts)) if set_parts else ""
            await conn.execute(
                f'UPDATE "User" SET "apiCalls" = $1, "lastApiCallDate" = now(){extra_sql} WHERE id = $2',
                current_calls + 1,
                user["id"],
            )

            daily_set_parts = []
            if want_train:
                daily_set_parts.append('"apiCallsTrains" = "DailyUserStat"."apiCallsTrains" + 1')
            if want_bus:
                daily_set_parts.append('"apiCallsBuses" = "DailyUserStat"."apiCallsBuses" + 1')
            daily_extra_sql = ("," + ", ".join(daily_set_parts)) if daily_set_parts else ""

            await conn.execute(
                f"""
                INSERT INTO "DailyUserStat" (id, "userId", date, "apiCalls", "apiCallsTrains", "apiCallsBuses", "updatedAt")
                VALUES ($1, $2, $3, 1, $4, $5, now())
                ON CONFLICT ("userId", date) DO UPDATE
                SET "apiCalls" = "DailyUserStat"."apiCalls" + 1{daily_extra_sql}, "updatedAt" = now()
                """,
                new_id(),
                user["id"],
                today_str,
                1 if want_train else 0,
                1 if want_bus else 0,
            )

    return user


async def check_recommendations_quota(user=Depends(get_optional_user)):
    """Auth is optional here, matching the original /api/recommendations
    route exactly: logged-out callers skip rate-limiting entirely and still
    get served (a pre-existing free-tier gap, preserved intentionally rather
    than closed during this port). Logged-in callers are capped at 50/day."""
    if not user:
        return None

    settings = get_settings()
    pool = await get_pool()
    is_admin = settings.is_admin_email(user["email"])
    today_str = _today_ist_string()

    daily_stat = await pool.fetchrow(
        'SELECT * FROM "DailyUserStat" WHERE "userId" = $1 AND date = $2',
        user["id"],
        today_str,
    )

    if daily_stat and (daily_stat["apiCallsRecommendations"] or 0) >= 50 and not is_admin:
        raise HTTPException(
            status_code=429,
            detail="You have reached the limit for Recommend a Trip feature today, higher limits will be available for Pro users soon.",
        )

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                'UPDATE "User" SET "apiCalls" = "apiCalls" + 1, "apiCallsRecommendations" = "apiCallsRecommendations" + 1, "lastApiCallDate" = now() WHERE id = $1',
                user["id"],
            )
            await conn.execute(
                """
                INSERT INTO "DailyUserStat" (id, "userId", date, "apiCalls", "apiCallsRecommendations", "updatedAt")
                VALUES ($1, $2, $3, 1, 1, now())
                ON CONFLICT ("userId", date) DO UPDATE
                SET "apiCalls" = "DailyUserStat"."apiCalls" + 1,
                    "apiCallsRecommendations" = "DailyUserStat"."apiCallsRecommendations" + 1,
                    "updatedAt" = now()
                """,
                new_id(),
                user["id"],
                today_str,
            )

    return user
