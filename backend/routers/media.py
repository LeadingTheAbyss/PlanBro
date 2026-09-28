import re
from datetime import datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response, StreamingResponse

from backend.auth import get_optional_user
from backend.config import get_settings
from backend.db import get_pool
from backend.ids import new_id
from backend import redis_client

router = APIRouter(tags=["media"])

TRANSPARENT_GIF = bytes.fromhex(
    "47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b"
)

AVATAR_FALLBACK_URLS = [
    "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Person%20walking/3D/person_walking_3d.png",
    "https://em-content.zobj.net/source/apple/391/person-walking_1f6b6.png",
    "https://emojigraph.org/media/apple/person-walking_1f6b6.png",
]


@router.get("/api/avatar")
async def get_avatar():
    for url in AVATAR_FALLBACK_URLS:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return Response(
                        content=res.content,
                        media_type="image/png",
                        headers={"Cache-Control": "public, max-age=31536000, immutable"},
                    )
        except Exception:
            continue

    return Response(
        content=TRANSPARENT_GIF,
        media_type="image/gif",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/api/image")
async def get_image(name: str, maxWidth: str = "800", request: Request = None):
    settings = get_settings()
    if not settings.google_places_key:
        return Response(content=b"API key not configured", status_code=500)

    google_url = (
        f"https://places.googleapis.com/v1/{name}/media"
        f"?key={settings.google_places_key}&maxWidthPx={maxWidth}&skipHttpRedirect=false"
    )
    referer = request.headers.get("referer", "http://localhost:3000/") if request else "http://localhost:3000/"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(google_url, headers={"Referer": referer})
            if res.status_code != 200:
                return Response(content=res.content, status_code=res.status_code)
            return Response(
                content=res.content,
                media_type=res.headers.get("content-type", "image/jpeg"),
                headers={"Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable"},
            )
    except Exception:
        return Response(content=b"Internal server error", status_code=500)


# Allowlist for /api/proxy-image — the original Next.js route proxied ANY
# caller-supplied URL (open proxy / SSRF risk). Restricted here to the image
# hosts this app actually needs: Google Places/Maps media, Wikipedia/Commons,
# the R2 bucket, and the hotel/travel sites referenced in the original code's
# own User-Agent comment (Booking.com, Expedia).
PROXY_IMAGE_ALLOWED_SUFFIXES = (
    "googleapis.com",
    "googleusercontent.com",
    "gstatic.com",
    "wikipedia.org",
    "wikimedia.org",
    "unsplash.com",
    "booking.com",
    "bstatic.com",
    "expedia.com",
    "olamaps.io",
)


def _is_allowed_proxy_host(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    if not host:
        return False
    settings = get_settings()
    if settings.r2_public_url:
        r2_host = (urlparse(settings.r2_public_url).hostname or "").lower()
        if r2_host and (host == r2_host or host.endswith(f".{r2_host}")):
            return True
    return any(host == s or host.endswith(f".{s}") for s in PROXY_IMAGE_ALLOWED_SUFFIXES)


@router.get("/api/proxy-image")
async def proxy_image(url: str):
    if not _is_allowed_proxy_host(url):
        raise HTTPException(status_code=403, detail="This image host is not allowed")

    try:
        client = httpx.AsyncClient(timeout=15.0)
        req = client.build_request(
            "GET",
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
        )
        upstream = await client.send(req, stream=True)
        if upstream.status_code != 200:
            await upstream.aclose()
            await client.aclose()
            raise HTTPException(status_code=upstream.status_code, detail="Failed to fetch image")

        async def _stream():
            try:
                async for chunk in upstream.aiter_bytes():
                    yield chunk
            finally:
                await upstream.aclose()
                await client.aclose()

        return StreamingResponse(
            _stream(),
            media_type=upstream.headers.get("content-type", "image/jpeg"),
            headers={
                "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


TAJ_MAHAL_FALLBACK = "https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_in_March_2004.jpg?width=1200"
CHICKEN_TIKKA_FALLBACK = "https://commons.wikimedia.org/wiki/Special:FilePath/Chicken_tikka_masala.jpg?width=1200"
WIKI_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


@router.get("/api/theme-wiki-image")
async def theme_wiki_image(q: str, fallback: str = "place"):
    fallback_url = CHICKEN_TIKKA_FALLBACK if fallback == "food" else TAJ_MAHAL_FALLBACK
    target_img_url = fallback_url

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            url = (
                "https://en.wikipedia.org/w/api.php?action=query&generator=search"
                f"&gsrsearch={q}&gsrlimit=5&prop=pageimages&pithumbsize=1200&format=json"
            )
            res = await client.get(url, headers={"User-Agent": WIKI_UA})
            data = res.json()

            pages = (data.get("query") or {}).get("pages")
            if pages:
                page_list = sorted(pages.values(), key=lambda p: p.get("index", 99))
                for page in page_list:
                    thumb = (page.get("thumbnail") or {}).get("source")
                    if thumb:
                        target_img_url = thumb
                        break

            img_res = await client.get(target_img_url, headers={"User-Agent": WIKI_UA})
            if img_res.status_code != 200:
                raise Exception("image fetch failed")
            return Response(
                content=img_res.content,
                media_type=img_res.headers.get("content-type", "image/jpeg"),
                headers={"Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400"},
            )
    except Exception:
        return RedirectResponse(fallback_url)


# --- destination-photo ---

BAD_FILENAME_FRAGMENTS = [
    "_map", "map.", "_flag", "_logo", "_icon", "_seal", "_emblem",
    "coat_of_arms", "locator", ".svg", ".png",
    "relief", "topograph", "terrain", "topo_", "_topo",
    "physical_map", "satellite", "elevation", "bathymetry",
    "district_map", "location_map", "administrative",
    "_plan", "schematic", "orthophoto",
]

SANITIZE_WORDS_RE = re.compile(
    r"\b(vacation|holiday|trip|tour|gateway|getaway|retreat|escape|experience|destination)\b",
    re.IGNORECASE,
)

DESTINATION_PHOTO_FALLBACK = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80"


def _sanitize_name(raw: str) -> str:
    return re.sub(r"\s+", " ", SANITIZE_WORDS_RE.sub("", raw)).strip()


@router.get("/api/destination-photo")
async def destination_photo(
    name: str,
    type: str = "city",
    width: str = "1920",
    redirect: str = "false",
    brewplans_session: str | None = Cookie(default=None),
):
    is_redirect = redirect == "true"
    clean_name = _sanitize_name(name)
    cache_key = f"google_img_v2_{type}_{clean_name.lower()}_w{width}"

    cached_url = await redis_client.get_str(cache_key)

    user = None
    today_string = ""
    if not cached_url:
        user = await get_optional_user(brewplans_session)
        if user:
            settings = get_settings()
            now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
            today_string = f"{now_ist.year}-{now_ist.month:02d}-{now_ist.day:02d}"

            pool = await get_pool()
            daily_stat = await pool.fetchrow(
                'SELECT * FROM "DailyUserStat" WHERE "userId" = $1 AND date = $2',
                user["id"],
                today_string,
            )
            is_admin = settings.is_admin_email(user["email"])
            if not is_admin and daily_stat and (daily_stat["apiCallsImages"] or 0) >= 5000:
                return RedirectResponse(DESTINATION_PHOTO_FALLBACK)

    best_url = cached_url

    if not best_url:
        settings = get_settings()
        if settings.google_places_key:
            suffix_map = {
                "food": "dish food India",
                "hotel": "hotel resort India",
                "place": "landmark tourist India",
            }
            query_suffix = suffix_map.get(type, "city landmark India")

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    google_res = await client.post(
                        "https://places.googleapis.com/v1/places:searchText",
                        headers={
                            "Content-Type": "application/json",
                            "X-Goog-Api-Key": settings.google_places_key,
                            "X-Goog-FieldMask": "places.photos",
                        },
                        json={"textQuery": f"{clean_name} {query_suffix}", "languageCode": "en"},
                    )
                    if google_res.status_code == 200:
                        data = google_res.json()
                        photos = (data.get("places") or [{}])[0].get("photos", [])
                        best_photo = photos[0] if photos else None
                        for photo in photos:
                            w, h = photo.get("widthPx"), photo.get("heightPx")
                            if w and h and w >= 1920 and w > h:
                                best_photo = photo
                                break

                        if best_photo and best_photo.get("name"):
                            media_url = (
                                f"https://places.googleapis.com/v1/{best_photo['name']}/media"
                                f"?key={settings.google_places_key}&maxWidthPx={width}&skipHttpRedirect=true"
                            )
                            media_res = await client.get(media_url)
                            if media_res.status_code == 200:
                                photo_uri = media_res.json().get("photoUri")
                                if photo_uri:
                                    best_url = photo_uri
            except Exception:
                pass

        if not best_url:
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    wiki_res = await client.get(
                        "https://en.wikipedia.org/w/api.php"
                        f"?action=query&titles={clean_name}&prop=pageimages&format=json&pithumbsize={width}"
                    )
                    if wiki_res.status_code == 200:
                        wiki_data = wiki_res.json()
                        pages = (wiki_data.get("query") or {}).get("pages")
                        if pages:
                            page_id = next(iter(pages))
                            if page_id != "-1":
                                thumb = (pages[page_id].get("thumbnail") or {}).get("source")
                                if thumb:
                                    best_url = thumb
            except Exception:
                pass

        if best_url:
            await redis_client.set_str(cache_key, best_url, ttl_seconds=2592000)

            if user and today_string:
                pool = await get_pool()
                async with pool.acquire() as conn:
                    async with conn.transaction():
                        await conn.execute(
                            """
                            INSERT INTO "DailyUserStat" (id, "userId", date, "apiCalls", "apiCallsImages", "updatedAt")
                            VALUES ($1, $2, $3, 1, 1, now())
                            ON CONFLICT ("userId", date) DO UPDATE
                            SET "apiCalls" = "DailyUserStat"."apiCalls" + 1,
                                "apiCallsImages" = "DailyUserStat"."apiCallsImages" + 1,
                                "updatedAt" = now()
                            """,
                            new_id(),
                            user["id"],
                            today_string,
                        )
                        await conn.execute(
                            'UPDATE "User" SET "apiCalls" = "apiCalls" + 1, "lastApiCallDate" = now() WHERE id = $1',
                            user["id"],
                        )

    if not best_url:
        if is_redirect:
            return RedirectResponse(DESTINATION_PHOTO_FALLBACK, status_code=302, headers={"Cache-Control": "public, max-age=86400"})
        return {"url": None}

    if is_redirect:
        return RedirectResponse(best_url, status_code=301, headers={"Cache-Control": "public, max-age=864000, immutable"})

    return JSONResponse(
        content={"url": best_url},
        headers={"Cache-Control": "public, max-age=86400, s-maxage=86400"},
    )
