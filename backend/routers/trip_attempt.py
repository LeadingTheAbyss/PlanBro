from fastapi import APIRouter, HTTPException, Request

from backend.db import get_pool
from backend.ids import new_id

router = APIRouter(prefix="/api/trip-attempt", tags=["trip-attempt"])


@router.post("")
async def log_trip_attempt(req: Request):
    body = await req.json()
    user_id = body.get("userId")
    destination = body.get("destination")
    step_reached = body.get("stepReached")
    time_to_complete = body.get("timeToComplete")
    attempt_id = body.get("attemptId")

    pool = await get_pool()

    if step_reached == "STARTED":
        new_attempt_id = new_id()
        await pool.execute(
            """
            INSERT INTO "TripAttempt" (id, "userId", destination, "stepReached", abandoned, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, true, now(), now())
            """,
            new_attempt_id,
            user_id,
            destination,
            step_reached,
        )
        return {"success": True, "attemptId": new_attempt_id}

    if attempt_id:
        abandoned = step_reached != "FINALIZED"
        row = await pool.fetchrow(
            """
            UPDATE "TripAttempt"
            SET "stepReached" = $1,
                destination = COALESCE($2, destination),
                abandoned = $3,
                "timeToComplete" = COALESCE($4, "timeToComplete"),
                "updatedAt" = now()
            WHERE id = $5
            RETURNING id
            """,
            step_reached,
            destination,
            abandoned,
            time_to_complete,
            attempt_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Attempt not found")
        return {"success": True, "attemptId": row["id"]}

    raise HTTPException(status_code=400, detail="Invalid payload")
