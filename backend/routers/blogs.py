from fastapi import APIRouter, HTTPException, Request

from backend.db import get_pool
from backend.ids import new_id

router = APIRouter(prefix="/api/blogs", tags=["blogs"])

ARTICLE_COLUMNS = [
    "slug", "title", "excerpt", "category", "city",
    "categoryIcon", "categoryBadgeBg", "categoryBadgeText", "readingTime",
    "author", "collaborators",
    "date", "imageUrl", "featured", "featuredOrder",
    "likes", "views", "commentsCount", "controversialScore", "timesPlanned",
    "budget", "bestSeason", "accommodation", "transportMode",
    "itineraryStops", "content", "mediaType", "videoUrl",
    "comments",
]


def _create_values(data: dict, featured_order: int) -> dict:
    return {
        "slug": data.get("slug"),
        "title": data.get("title"),
        "excerpt": data.get("excerpt"),
        "category": data.get("category"),
        "city": data.get("city"),
        "categoryIcon": data.get("categoryIcon") or "🌍",
        "categoryBadgeBg": data.get("categoryBadgeBg") or "bg-gray-100",
        "categoryBadgeText": data.get("categoryBadgeText") or "text-gray-800",
        "readingTime": data.get("readingTime"),
        "author": data.get("author"),
        "collaborators": data.get("collaborators"),
        "date": data.get("date"),
        "imageUrl": data.get("imageUrl"),
        "featured": data.get("featured") or False,
        "featuredOrder": featured_order,
        "likes": data.get("likes") or 0,
        "views": data.get("views") or 0,
        "commentsCount": data.get("commentsCount") or 0,
        "controversialScore": data.get("controversialScore") or 0,
        "timesPlanned": data.get("timesPlanned") or 0,
        "budget": data.get("budget"),
        "bestSeason": data.get("bestSeason"),
        "accommodation": data.get("accommodation"),
        "transportMode": data.get("transportMode"),
        "itineraryStops": data.get("itineraryStops"),
        "content": data.get("content"),
        "mediaType": data.get("mediaType"),
        "videoUrl": data.get("videoUrl"),
        "comments": data.get("comments"),
    }


def _update_values(data: dict, featured_order: int) -> dict:
    # Mirrors buildArticleUpdateData: unlike create, missing keys pass through
    # as None/undefined rather than falling back to a default — matches
    # Prisma's update() semantics where the caller is expected to send full data.
    values = _create_values(data, featured_order)
    # Fields that in the Next.js update path use the raw value (no `|| default`)
    for key in ("categoryIcon", "categoryBadgeBg", "categoryBadgeText", "featured",
                "likes", "views", "commentsCount", "controversialScore", "timesPlanned"):
        if key in data:
            values[key] = data[key]
    return values


@router.get("")
async def list_blogs():
    pool = await get_pool()
    rows = await pool.fetch('SELECT * FROM "Article" ORDER BY "createdAt" DESC')
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_blog(req: Request):
    data = await req.json()
    final_order = int(data.get("featuredOrder") or 0)

    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            if final_order > 0:
                max_order = await conn.fetchval(
                    'SELECT MAX("featuredOrder") FROM "Article" WHERE "featuredOrder" > 0'
                ) or 0
                if final_order > max_order + 1:
                    final_order = max_order + 1

                await conn.execute(
                    'UPDATE "Article" SET "featuredOrder" = "featuredOrder" + 1 WHERE "featuredOrder" >= $1',
                    final_order,
                )

            values = _create_values(data, final_order)
            article_id = new_id()
            columns = ["id"] + list(values.keys())
            placeholders = ", ".join(f"${i + 1}" for i in range(len(columns)))
            col_list = ", ".join(f'"{c}"' for c in columns)
            row = await conn.fetchrow(
                f'INSERT INTO "Article" ({col_list}, "createdAt", "updatedAt") VALUES ({placeholders}, now(), now()) RETURNING *',
                article_id,
                *values.values(),
            )
    return dict(row)


@router.get("/{blog_id}")
async def get_blog(blog_id: str):
    pool = await get_pool()
    row = await pool.fetchrow('SELECT * FROM "Article" WHERE id = $1', blog_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(row)


@router.put("/{blog_id}")
async def update_blog(blog_id: str, req: Request):
    data = await req.json()

    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            existing = await conn.fetchrow('SELECT * FROM "Article" WHERE id = $1', blog_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Not found")

            old_order = existing["featuredOrder"] or 0
            new_order = int(data["featuredOrder"]) if data.get("featuredOrder") is not None else old_order

            if new_order != old_order:
                if new_order > 0:
                    max_order = await conn.fetchval(
                        'SELECT MAX("featuredOrder") FROM "Article" WHERE "featuredOrder" > 0'
                    ) or 0
                    if new_order > max_order + 1:
                        new_order = max_order + 1

                    if old_order > 0:
                        if old_order < new_order:
                            await conn.execute(
                                'UPDATE "Article" SET "featuredOrder" = "featuredOrder" - 1 WHERE "featuredOrder" > $1 AND "featuredOrder" <= $2',
                                old_order,
                                new_order,
                            )
                        else:
                            await conn.execute(
                                'UPDATE "Article" SET "featuredOrder" = "featuredOrder" + 1 WHERE "featuredOrder" >= $1 AND "featuredOrder" < $2',
                                new_order,
                                old_order,
                            )
                    else:
                        await conn.execute(
                            'UPDATE "Article" SET "featuredOrder" = "featuredOrder" + 1 WHERE "featuredOrder" >= $1',
                            new_order,
                        )
                elif old_order > 0:
                    await conn.execute(
                        'UPDATE "Article" SET "featuredOrder" = "featuredOrder" - 1 WHERE "featuredOrder" > $1',
                        old_order,
                    )

            values = _update_values(data, new_order)
            set_clause = ", ".join(f'"{k}" = ${i + 2}' for i, k in enumerate(values.keys()))
            row = await conn.fetchrow(
                f'UPDATE "Article" SET {set_clause}, "updatedAt" = now() WHERE id = $1 RETURNING *',
                blog_id,
                *values.values(),
            )
    return dict(row)


@router.delete("/{blog_id}")
async def delete_blog(blog_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            existing = await conn.fetchrow('SELECT * FROM "Article" WHERE id = $1', blog_id)
            if existing and (existing["featuredOrder"] or 0) > 0:
                await conn.execute(
                    'UPDATE "Article" SET "featuredOrder" = "featuredOrder" - 1 WHERE "featuredOrder" > $1',
                    existing["featuredOrder"],
                )
            await conn.execute('DELETE FROM "Article" WHERE id = $1', blog_id)
    return {"success": True}


@router.post("/{blog_id}/metrics")
async def update_blog_metrics(blog_id: str, req: Request):
    body = await req.json()
    action = body.get("action")

    if action == "view":
        set_clause = '"views" = "views" + 1'
    elif action == "like":
        set_clause = '"likes" = "likes" + 1'
    elif action == "unlike":
        set_clause = '"likes" = "likes" - 1'
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    pool = await get_pool()
    row = await pool.fetchrow(
        f'UPDATE "Article" SET {set_clause}, "updatedAt" = now() WHERE id = $1 RETURNING *',
        blog_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return dict(row)
