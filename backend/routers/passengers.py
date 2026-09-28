from fastapi import APIRouter, Depends, HTTPException, Request

from backend.auth import get_current_user
from backend.db import get_pool
from backend.ids import new_id

router = APIRouter(prefix="/api/passengers", tags=["passengers"])

# Note: the original Next.js route trusted an unauthenticated `x-user-id`
# header. That's been replaced with cookie-based get_current_user — the
# frontend still sends the header on some calls, but it's now ignored
# server-side rather than trusted.


@router.get("")
async def list_passengers(user=Depends(get_current_user)):
    pool = await get_pool()
    rows = await pool.fetch(
        'SELECT * FROM "SavedPassenger" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
        user["id"],
    )
    return {"passengers": [dict(r) for r in rows]}


@router.post("")
async def upsert_passenger(req: Request, user=Depends(get_current_user)):
    body = await req.json()
    name = body.get("name")
    age = body.get("age")
    gender = body.get("gender")
    city = body.get("city")

    if not name or not age or not gender:
        raise HTTPException(status_code=400, detail="Missing required fields")

    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO "SavedPassenger" (id, "userId", name, age, gender, city, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, now())
        ON CONFLICT ("userId", name) DO UPDATE
        SET age = $4, gender = $5, city = $6
        RETURNING *
        """,
        new_id(),
        user["id"],
        name,
        age,
        gender,
        city,
    )
    return {"passenger": dict(row)}
