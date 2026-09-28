from fastapi import APIRouter, Depends, HTTPException, Request

from backend.auth import require_admin
from backend.db import get_pool
from backend.ids import new_id
from backend.redis_client import check_rate_limit

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def _client_ip(req: Request) -> str:
    return req.headers.get("x-forwarded-for") or req.headers.get("x-real-ip") or "127.0.0.1"


@router.post("")
async def submit_feedback(req: Request):
    ip = _client_ip(req)
    rate_limit = await check_rate_limit(f"feedback:{ip}", 3, 3600)
    if not rate_limit["success"]:
        raise HTTPException(status_code=429, detail="Too many feedback requests. Please try again later.")

    body = await req.json()
    content = body.get("content")
    feedback_type = body.get("type") or "GENERAL"
    user_id = body.get("userId")

    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO "Feedback" (id, "userId", type, content, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, now(), now())
        RETURNING *
        """,
        new_id(),
        user_id,
        feedback_type,
        content,
    )
    return {"success": True, "feedback": dict(row)}


@router.get("")
async def list_feedback(admin=Depends(require_admin)):
    # Gated behind admin auth during the port — the original Next.js route
    # had no auth check at all (returned all feedback + reporter email to anyone).
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT f.*, u.name AS "userName", u.email AS "userEmail"
        FROM "Feedback" f
        LEFT JOIN "User" u ON u.id = f."userId"
        ORDER BY f."createdAt" DESC
        """
    )
    feedbacks = []
    for r in rows:
        d = dict(r)
        user_name = d.pop("userName", None)
        user_email = d.pop("userEmail", None)
        if d.get("userId"):
            d["user"] = {"name": user_name, "email": user_email}
        feedbacks.append(d)
    return {"success": True, "feedbacks": feedbacks}


@router.patch("")
async def update_feedback(req: Request, admin=Depends(require_admin)):
    body = await req.json()
    feedback_id = body.get("id")
    status = body.get("status")
    if not feedback_id or not status:
        raise HTTPException(status_code=400, detail="ID and status are required")

    pool = await get_pool()
    row = await pool.fetchrow(
        'UPDATE "Feedback" SET status = $1, "updatedAt" = now() WHERE id = $2 RETURNING *',
        status,
        feedback_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True, "feedback": dict(row)}


@router.delete("")
async def delete_feedback(id: str, admin=Depends(require_admin)):
    pool = await get_pool()
    row = await pool.fetchrow('DELETE FROM "Feedback" WHERE id = $1 RETURNING *', id)
    if not row:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True, "feedback": dict(row)}
