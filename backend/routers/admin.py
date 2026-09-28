import json
import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.auth import require_admin
from backend.config import get_settings
from backend.db import get_pool

router = APIRouter(prefix="/api/admin", tags=["admin"])

IST = ZoneInfo("Asia/Kolkata")


def _ist_date_string(dt: datetime) -> str:
    ist = dt.astimezone(IST) if dt.tzinfo else dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(IST)
    return f"{ist.year}-{ist.month:02d}-{ist.day:02d}"


def _role_where(role: str, admin_emails: list[str]) -> tuple[str, list]:
    """Returns (sql WHERE fragment referencing alias `u` via $1, role_param) for
    the role filter. $1 is always a text[] and always referenced, so every
    query built from this can bind the same single param regardless of role —
    avoids "wrong number of arguments" errors from conditionally-unused params."""
    if role == "ADMIN":
        return ("u.email = ANY($1::text[])", admin_emails)
    if role == "USER":
        return ("NOT (u.email = ANY($1::text[])) AND u.\"authProvider\" != 'quick'", admin_emails)
    if role == "GUEST":
        return ("u.\"authProvider\" = 'quick' AND cardinality($1::text[]) >= 0", admin_emails)
    return ("cardinality($1::text[]) >= 0", admin_emails)


@router.get("/stats")
async def get_admin_stats(role: str = Query("ALL"), admin=Depends(require_admin)):
    settings = get_settings()
    admin_emails = settings.admin_emails
    pool = await get_pool()

    where_sql, role_param = _role_where(role, admin_emails)

    total_users = await pool.fetchval(f'SELECT COUNT(*) FROM "User" u WHERE {where_sql}', role_param)

    agg = await pool.fetchrow(
        f"""
        SELECT
            COALESCE(SUM("apiCalls"), 0) AS "apiCalls",
            COALESCE(SUM("apiCallsFlights"), 0) AS "apiCallsFlights",
            COALESCE(SUM("apiCallsTrains"), 0) AS "apiCallsTrains",
            COALESCE(SUM("apiCallsBusses"), 0) AS "apiCallsBusses",
            COALESCE(SUM("apiCallsHotels"), 0) AS "apiCallsHotels",
            COALESCE(SUM("apiCallsPlaces"), 0) AS "apiCallsPlaces",
            COALESCE(SUM("apiCallsRecommendations"), 0) AS "apiCallsRecommendations"
        FROM "User" u WHERE {where_sql}
        """,
        role_param,
    )

    category_hits_sum = (
        agg["apiCallsFlights"] + agg["apiCallsTrains"] + agg["apiCallsBusses"]
        + agg["apiCallsHotels"] + agg["apiCallsPlaces"] + agg["apiCallsRecommendations"]
    )
    total_api_calls_all_time = max(agg["apiCalls"], category_hits_sum)

    now = datetime.utcnow()
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = _ist_date_string(now)
    yesterday_str = _ist_date_string(now - timedelta(days=1))

    daily_rows = await pool.fetch(
        f"""
        SELECT d.date, SUM(d."apiCalls") AS total
        FROM "DailyUserStat" d
        JOIN "User" u ON u.id = d."userId"
        WHERE d.date = ANY($2) AND {where_sql.replace('$1', '$1')}
        GROUP BY d.date
        """,
        role_param,
        [today_str, yesterday_str],
    )
    daily_by_date = {r["date"]: r["total"] for r in daily_rows}
    total_api_calls_today = daily_by_date.get(today_str, 0)
    api_calls_yesterday = daily_by_date.get(yesterday_str, 0)

    active_users_today = await pool.fetchval(
        f"""
        SELECT COUNT(*) FROM "DailyUserStat" d
        JOIN "User" u ON u.id = d."userId"
        WHERE d.date = $2 AND {where_sql}
        """,
        role_param,
        today_str,
    )

    new_signups_today = await pool.fetchval(
        f'SELECT COUNT(*) FROM "User" u WHERE u."createdAt" >= $2 AND {where_sql}',
        role_param,
        start_of_today,
    )

    # Time-bucketed trip stats — computed with conditional SUMs instead of an
    # in-memory forEach loop (the original Next.js route pulled every
    # TripHistory row into memory to bucket it; this does the same bucketing
    # server-side in one query).
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)
    one_day_ago = now - timedelta(days=1)

    trip_rows = await pool.fetch(
        f"""
        SELECT
            (t.snapshot->>'type' = 'quick-trip') AS "isQuickTrip",
            t."createdAt" >= $2 AS "inMonth",
            t."createdAt" >= $3 AS "inWeek",
            t."createdAt" >= $4 AS "inDay"
        FROM "TripHistory" t
        JOIN "User" u ON u.id = t."userId"
        WHERE {where_sql}
        """,
        role_param,
        thirty_days_ago,
        seven_days_ago,
        one_day_ago,
    )

    detailed_stats = {
        "ALL": {"tripsPlanned": 0, "quickTripsPlanned": 0, "recommendationsUsed": 0},
        "MONTHLY": {"tripsPlanned": 0, "quickTripsPlanned": 0, "recommendationsUsed": 0},
        "WEEKLY": {"tripsPlanned": 0, "quickTripsPlanned": 0, "recommendationsUsed": 0},
        "DAILY": {"tripsPlanned": 0, "quickTripsPlanned": 0, "recommendationsUsed": 0},
    }
    for row in trip_rows:
        key = "quickTripsPlanned" if row["isQuickTrip"] else "tripsPlanned"
        detailed_stats["ALL"][key] += 1
        if row["inMonth"]:
            detailed_stats["MONTHLY"][key] += 1
        if row["inWeek"]:
            detailed_stats["WEEKLY"][key] += 1
        if row["inDay"]:
            detailed_stats["DAILY"][key] += 1

    detailed_stats["ALL"]["recommendationsUsed"] = agg["apiCallsRecommendations"]

    daily_rec_rows = await pool.fetch(
        f"""
        SELECT d.date, SUM(d."apiCallsRecommendations") AS total
        FROM "DailyUserStat" d
        JOIN "User" u ON u.id = d."userId"
        WHERE {where_sql} AND d."apiCallsRecommendations" > 0
        GROUP BY d.date
        """,
        role_param,
    )
    for row in daily_rec_rows:
        try:
            stat_date = datetime.strptime(row["date"], "%Y-%m-%d")
        except ValueError:
            continue
        total = row["total"] or 0
        if stat_date >= thirty_days_ago:
            detailed_stats["MONTHLY"]["recommendationsUsed"] += total
        if stat_date >= seven_days_ago:
            detailed_stats["WEEKLY"]["recommendationsUsed"] += total
        if stat_date >= one_day_ago:
            detailed_stats["DAILY"]["recommendationsUsed"] += total

    trips_planned_today = detailed_stats["DAILY"]["tripsPlanned"] + detailed_stats["DAILY"]["quickTripsPlanned"]
    total_trips_lifetime = detailed_stats["ALL"]["tripsPlanned"] + detailed_stats["ALL"]["quickTripsPlanned"]

    api_breakdown = {
        "Flights": agg["apiCallsFlights"],
        "Trains": agg["apiCallsTrains"],
        "Buses": agg["apiCallsBusses"],
        "Hotels": agg["apiCallsHotels"],
        "Places": agg["apiCallsPlaces"],
        "Recommendations": agg["apiCallsRecommendations"],
    }
    cost_estimate_today = f"{(api_breakdown['Places'] or 0) * 0.032:.2f}"

    cache_hit_rate = "68%"
    error_rate = "0.4%"
    errors = []
    try:
        error_logs = await pool.fetch(
            'SELECT * FROM "TelemetryLog" WHERE status = $1 ORDER BY "createdAt" DESC LIMIT 5',
            "ERROR",
        )
        errors = [dict(r) for r in error_logs]
        hits = await pool.fetchval('SELECT COUNT(*) FROM "TelemetryLog" WHERE status = $1', "CACHE_HIT")
        total = await pool.fetchval('SELECT COUNT(*) FROM "TelemetryLog"')
        if total:
            cache_hit_rate = f"{(hits / total) * 100:.1f}%"
    except Exception:
        pass

    user_rows = await pool.fetch(
        f"""
        SELECT
            u.id, u.name, u.email, u.picture, u."authProvider",
            u."apiCalls", u."apiCallsFlights", u."apiCallsTrains", u."apiCallsBusses",
            u."apiCallsHotels", u."apiCallsPlaces", u."apiCallsRecommendations",
            u."lastApiCallDate", u."createdAt",
            COUNT(t.id) AS "tripCount",
            COALESCE(SUM(CASE WHEN t.snapshot->>'type' = 'quick-trip' THEN 1 ELSE 0 END), 0) AS "quickTripsPlanned",
            COALESCE(SUM(CASE WHEN t.snapshot->>'type' != 'quick-trip' OR t.snapshot->>'type' IS NULL THEN 1 ELSE 0 END), 0) AS "tripsPlanned"
        FROM "User" u
        LEFT JOIN "TripHistory" t ON t."userId" = u.id
        WHERE {where_sql}
        GROUP BY u.id
        ORDER BY u."createdAt" DESC
        """,
        role_param,
    )
    transformed_users = [
        {k: v for k, v in dict(r).items() if k != "tripCount"} for r in user_rows
    ]

    funnel_rows = await pool.fetch(
        f"""
        SELECT ta."stepReached", COUNT(*) AS cnt
        FROM "TripAttempt" ta
        LEFT JOIN "User" u ON u.id = ta."userId"
        WHERE {where_sql}
        GROUP BY ta."stepReached"
        """,
        role_param,
    )
    funnel_by_step = {r["stepReached"]: r["cnt"] for r in funnel_rows}
    funnel_stats = {
        "STARTED": funnel_by_step.get("STARTED", 0),
        "DATES_SET": funnel_by_step.get("DATES_SET", 0),
        "FINALIZED": funnel_by_step.get("FINALIZED", 0),
    }

    retention_rows = await pool.fetch(
        f'SELECT "createdAt", "lastApiCallDate" FROM "User" u WHERE {where_sql}',
        role_param,
    )
    d1_total = d1_retained = d7_total = d7_retained = d30_total = d30_retained = 0
    for row in retention_rows:
        days_since_creation = (now - row["createdAt"]).total_seconds() / 86400
        days_retained = (row["lastApiCallDate"] - row["createdAt"]).total_seconds() / 86400
        if days_since_creation >= 1:
            d1_total += 1
            if days_retained >= 1:
                d1_retained += 1
        if days_since_creation >= 7:
            d7_total += 1
            if days_retained >= 7:
                d7_retained += 1
        if days_since_creation >= 30:
            d30_total += 1
            if days_retained >= 30:
                d30_retained += 1

    retention_stats = {
        "D1": (d1_retained / d1_total * 100) if d1_total else 0,
        "D7": (d7_retained / d7_total * 100) if d7_total else 0,
        "D30": (d30_retained / d30_total * 100) if d30_total else 0,
    }

    total_blogs = await pool.fetchval('SELECT COUNT(*) FROM "Article"')
    blog_agg = await pool.fetchrow('SELECT COALESCE(SUM(likes),0) AS likes, COALESCE(SUM(views),0) AS views FROM "Article"')

    return {
        "stats": {
            "totalBlogs": total_blogs,
            "totalLikes": blog_agg["likes"],
            "totalViews": blog_agg["views"],
            "totalUsers": total_users,
            "activeUsersToday": active_users_today,
            "newSignupsToday": new_signups_today,
            "tripsPlannedToday": trips_planned_today,
            "totalTripsLifetime": total_trips_lifetime,
            "totalApiCallsAllTime": total_api_calls_all_time,
            "totalApiCallsToday": total_api_calls_today,
            "apiCallsYesterday": api_calls_yesterday,
            "apiBreakdown": api_breakdown,
            "costEstimateToday": cost_estimate_today,
            "cacheHitRate": cache_hit_rate,
            "errorRate": error_rate,
            "errors": errors,
            "funnelStats": funnel_stats,
            "retentionStats": retention_stats,
            "detailedStats": detailed_stats,
        },
        "users": transformed_users,
    }


@router.get("/user/{user_id}/stats")
async def get_admin_user_stats(user_id: str, admin=Depends(require_admin)):
    pool = await get_pool()
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    date_string = thirty_days_ago.strftime("%Y-%m-%d")

    rows = await pool.fetch(
        'SELECT * FROM "DailyUserStat" WHERE "userId" = $1 AND date >= $2 ORDER BY date ASC',
        user_id,
        date_string,
    )
    return {"stats": [dict(r) for r in rows]}


SMART_FILL_PROMPT_TEMPLATE = """Analyze the following travel blog details and generate a smart-fill response.
Categorize the trip into exactly one option from the budget, season, stay, transit, and category lists based on the vibe and details.
Also identify the primary Indian City or State for the destination.
Finally, generate an array of itinerary stops based on the content. CRITICAL: ONLY generate stops for places explicitly mentioned or strongly implied by the content. Do NOT hallucinate extra days. A short blog should typically have 1 to 3 stops. (each with day (number, MUST be sequential starting from 1), title (string), location (string), description (string), lat (number), lng (number)).

Return ONLY a valid JSON object with the keys "budget", "season", "stay", "transit", "city", "category", and "stops". Do not include any markdown, code blocks, or explanations.

Lists:
budget: ["All", "Budget Explorer (< ₹8,000)", "Comfort Holiday (₹8k - ₹25k)", "Boutique & Heritage (₹25k+)"]
season: ["All", "Monsoon Greenery", "Winter Sunshine", "Summer Mountain Escape"]
stay: ["All", "Homestays & Eco-Cottages", "Heritage Havellis & Palaces", "Backpacker Hostels & Camps"]
transit: ["All", "Scenic Indian Railways", "Self-Drive Roadtrip", "Regional Flight & Cabs"]
category: ["Beaches & Shacks", "Himalayas & Hills", "Street Food & Chai", "Backpacking India", "Transit & Trains", "Budget Homestays", "Hidden Gems", "Romantic Retreats", "Family Safaris", "Monsoon Packing"]

Blog Title: {title}
City: {city}
Category: {category}
Content Snippet: {content}"""


@router.post("/smart-fill")
async def smart_fill(req: Request, admin=Depends(require_admin)):
    # Gated behind admin auth during the port — the original Next.js route
    # had no auth check despite calling a paid LLM API.
    body = await req.json()
    title = body.get("title", "")
    city = body.get("city", "")
    category = body.get("category", "")
    content = body.get("content", "")

    settings = get_settings()
    if not settings.groq_api_keys:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is missing from your .env file. Please add it to use Smart Fill.")

    api_key = random.choice(settings.groq_api_keys)
    prompt = SMART_FILL_PROMPT_TEMPLATE.format(title=title, city=city, category=category, content=content[:15000])

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "openai/gpt-oss-120b",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                },
            )
            if res.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Groq API Error: {res.text}")

            data = res.json()
            result_text = data["choices"][0]["message"]["content"]
            result = json.loads(result_text)
            return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to smart fill")
