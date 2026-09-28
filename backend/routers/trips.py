from fastapi import APIRouter, Depends, HTTPException, Request

from backend.auth import get_current_user
from backend.db import get_pool
from backend.ids import new_id

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _row_to_trip(row) -> dict:
    return dict(row)


@router.post("")
async def create_trip(req: Request, user=Depends(get_current_user)):
    body = await req.json()
    destination = body.get("destination")
    snapshot = body.get("snapshot")
    if not destination or not snapshot:
        raise HTTPException(status_code=400, detail="Missing destination or snapshot")

    pool = await get_pool()
    trip_id = new_id()
    await pool.execute(
        'INSERT INTO "TripHistory" (id, "userId", destination, snapshot, "createdAt") VALUES ($1, $2, $3, $4, now())',
        trip_id,
        user["id"],
        destination,
        snapshot,
    )
    row = await pool.fetchrow('SELECT * FROM "TripHistory" WHERE id = $1', trip_id)
    return {"trip": _row_to_trip(row)}


@router.get("")
async def list_trips(user=Depends(get_current_user)):
    pool = await get_pool()
    rows = await pool.fetch(
        'SELECT * FROM "TripHistory" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
        user["id"],
    )
    return {"trips": [_row_to_trip(r) for r in rows]}


@router.delete("")
async def delete_trip(id: str, user=Depends(get_current_user)):
    pool = await get_pool()
    trip = await pool.fetchrow('SELECT * FROM "TripHistory" WHERE id = $1', id)
    if not trip or trip["userId"] != user["id"]:
        raise HTTPException(status_code=404, detail="Trip not found or unauthorized")

    await pool.execute('DELETE FROM "TripHistory" WHERE id = $1', id)
    return {"success": True}


@router.get("/{trip_id}")
async def get_trip(trip_id: str):
    # Deliberately unauthenticated — matches the original Next.js route,
    # which allows public read-by-id for share links.
    pool = await get_pool()
    row = await pool.fetchrow('SELECT * FROM "TripHistory" WHERE id = $1', trip_id)
    if not row:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"trip": _row_to_trip(row)}
