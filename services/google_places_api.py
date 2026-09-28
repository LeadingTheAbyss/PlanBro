"""
Google Places API (New) service.

Data flow for every query:
  Redis (fast cache)
    ↓ miss
  PostgreSQL (persistent cache via PlaceCache table)
    ↓ miss
  Google Places API
    ↓
  Save to PostgreSQL
    ↓
  Save to Redis
    ↓
  Return

Never calls Google if the data is in Redis or the DB.
Never uses third-party image sources (Wikipedia, Openverse, etc.).
"""

import os
import httpx
import json
import asyncio
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PLACES_API_KEY = os.getenv("NEXT_PUBLIC_GOOGLE_PLACES_KEY")

# ── Cache version ──────────────────────────────────────────────────────────────
# Bump this when the schema of cached data changes to invalidate all old caches.
CACHE_VERSION = "v13"

# TTL constants
REDIS_TTL_SECONDS = 60 * 60 * 24 * 30   # 30 days
DB_TTL_DAYS = 30

# Semaphore: max concurrent Google Place Details requests
_DETAILS_SEMAPHORE = None

# ── Redis helpers (imported from image_service to reuse existing abstraction) ──

from services.image_service import _cache_get, _cache_set
from services.cache_logger import log_cache_event


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _ensure_table():
    """Create PlaceCache table if it doesn't exist (idempotent)."""
    try:
        from services.db import get_db_connection
        conn = await get_db_connection()
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS "PlaceCache" (
                    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    "cacheKey"  TEXT UNIQUE NOT NULL,
                    data        JSONB NOT NULL,
                    "expiresAt" TIMESTAMPTZ NOT NULL,
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
        finally:
            await conn.close()
    except Exception as e:
        print(f"[PlaceDB] ensure_table failed (non-fatal): {e}")

_table_ensured = False

async def _db_get(cache_key: str) -> Optional[List[Dict[str, Any]]]:
    """Read from PostgreSQL PlaceCache. Returns None on miss or error."""
    global _table_ensured
    try:
        from services.db import get_db_connection
        if not _table_ensured:
            await _ensure_table()
            _table_ensured = True

        conn = await get_db_connection()
        try:
            row = await conn.fetchrow(
                """SELECT data, "expiresAt" FROM "PlaceCache" WHERE "cacheKey" = $1""",
                cache_key
            )
            if row:
                expires_at = row["expiresAt"]
                # Ensure timezone-aware comparison
                now = datetime.now(timezone.utc)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > now:
                    data = row["data"]
                    # asyncpg returns Json columns as strings or dicts depending on version
                    if isinstance(data, str):
                        return json.loads(data)
                    return list(data) if not isinstance(data, list) else data
                else:
                    # Expired — delete stale row
                    await conn.execute(
                        """DELETE FROM "PlaceCache" WHERE "cacheKey" = $1""",
                        cache_key
                    )
        finally:
            await conn.close()
    except Exception as e:
        print(f"[PlaceDB] get failed (non-fatal): {e}")
    return None


async def _db_set(cache_key: str, data: List[Dict[str, Any]]):
    """Write to PostgreSQL PlaceCache (upsert). Non-fatal on error."""
    global _table_ensured
    import uuid
    try:
        from services.db import get_db_connection
        if not _table_ensured:
            await _ensure_table()
            _table_ensured = True

        expires_at = datetime.utcnow() + timedelta(days=DB_TTL_DAYS)
        conn = await get_db_connection()
        try:
            db_id = uuid.uuid4().hex
            await conn.execute(
                """
                INSERT INTO "PlaceCache" (id, "cacheKey", data, "expiresAt", "updatedAt")
                VALUES ($1, $2, $3::jsonb, $4, NOW())
                ON CONFLICT ("cacheKey") DO UPDATE
                    SET data = EXCLUDED.data,
                        "expiresAt" = EXCLUDED."expiresAt",
                        "updatedAt" = NOW()
                """,
                db_id,
                cache_key,
                json.dumps(data),
                expires_at,
            )
        finally:
            await conn.close()
    except Exception as e:
        print(f"[PlaceDB] set failed (non-fatal): {e}")


# ── Core search function ───────────────────────────────────────────────────────

def _make_cache_key(query: str, max_results: int) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]", "_", query.lower()).strip("_")
    return f"places_{CACHE_VERSION}_{slug}_{max_results}"


def _rank(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank by a Bayesian-weighted score:
      score = rating * min(userRatingCount, 2000)

    This prevents a 5.0-star place with 12 reviews from outranking
    a 4.8-star place with 25,000 reviews.
    """
    def score(p: Dict[str, Any]) -> float:
        rating = p.get("rating") or 0.0
        count = p.get("userRatingCount") or 0
        return rating * min(count, 2000)

    return sorted(results, key=score, reverse=True)


# Semaphore to prevent DB/Redis connection exhaustion from bursting
_SEARCH_SEMAPHORE = None

async def search_google_places(query: str, max_results: int = 30, check_only: bool = False) -> Optional[List[Dict[str, Any]]]:
    global _SEARCH_SEMAPHORE
    if _SEARCH_SEMAPHORE is None:
        _SEARCH_SEMAPHORE = asyncio.Semaphore(3)
    async with _SEARCH_SEMAPHORE:
        return await _search_google_places_impl(query, max_results, check_only)

async def _search_google_places_impl(query: str, max_results: int = 30, check_only: bool = False) -> Optional[List[Dict[str, Any]]]:
    """
    Return up to `max_results` places for `query`.

    Data flow: Redis → DB → Google → DB → Redis → return.
    """
    with open("debug_err.txt", "a", encoding="utf-8") as f:
        f.write(f"[GooglePlaces] Entered search_google_places for query={query!r} key={PLACES_API_KEY[:8] if PLACES_API_KEY else 'NONE'}...\n")

    if not PLACES_API_KEY:
        print("[GooglePlaces] API key missing.")
        return []

    cache_key = _make_cache_key(query, max_results)

    # ── 1. Redis ──────────────────────────────────────────────────────────────
    try:
        raw = await _cache_get(cache_key)
        hit_str = f"HIT (len={len(raw)})" if raw else "MISS"
        log_cache_event("GooglePlaces", hit_str.split()[0], "Redis", cache_key, hit_str)
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            f.write(f"[GooglePlaces] Redis lookup for {cache_key}: {hit_str}\n")
        if raw:
            data = json.loads(raw)
            pass
            return data
    except Exception as e:
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            f.write(f"[GooglePlaces] Redis check exception: {e}\n")
        print(f"[GooglePlaces] Redis get error: {e}")

    # ── 2. DB ─────────────────────────────────────────────────────────────────
    try:
        db_data = await _db_get(cache_key)
        hit_str = "HIT" if db_data is not None else "MISS"
        log_cache_event("GooglePlaces", hit_str, "NeonDB", cache_key)
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            f.write(f"[GooglePlaces] DB lookup for {cache_key}: {hit_str}\n")
        if db_data is not None:
            pass
            # Warm Redis so next request skips DB
            try:
                await _cache_set(cache_key, json.dumps(db_data), REDIS_TTL_SECONDS)
            except Exception:
                pass
            return db_data
    except Exception as e:
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            f.write(f"[GooglePlaces] DB check exception: {e}\n")

    if check_only:
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            f.write(f"[GooglePlaces] check_only=True, aborting API call for {query!r}\n")
        return None

    # ── 3. Google Places API ──────────────────────────────────────────────────
    with open("debug_err.txt", "a", encoding="utf-8") as f:
        f.write(f"[GooglePlaces] Calling Google API for {query!r}...\n")
    pass

    url = "https://places.googleapis.com/v1/places:searchText"
    field_mask = "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.location,places.primaryType,places.priceLevel"
    headers = {
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": field_mask,
        "Content-Type": "application/json",
        "Referer": "http://localhost:3000/"
    }

    raw_results: List[Dict[str, Any]] = []
    pages_needed = (max_results + 19) // 20  # API max 20 per page
    page_token = ""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for _ in range(pages_needed):
                payload: Dict[str, Any] = {
                    "textQuery": query,
                    "languageCode": "en",
                    "pageSize": 20,
                }
                if page_token:
                    payload["pageToken"] = page_token

                resp = await client.post(url, headers=headers, json=payload)

                with open("debug_err.txt", "a", encoding="utf-8") as f:
                    f.write(f"[GooglePlaces] query={query} status={resp.status_code}\n")
                    if resp.status_code != 200:
                        f.write(f"[GooglePlaces] Error body={resp.text}\n")

                if resp.status_code == 429:
                    pass
                    break
                if resp.status_code != 200:
                    print(f"[GooglePlaces] Error {resp.status_code}: {resp.text[:300]}")
                    break

                body = resp.json()
                batch = body.get("places", [])
                raw_results.extend(batch)

                if len(raw_results) >= max_results:
                    break

                page_token = body.get("nextPageToken", "")
                if not page_token:
                    break

    except Exception as e:
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            import traceback
            f.write(f"[GooglePlaces] Network error: {e}\n{traceback.format_exc()}\n")
        print(f"[GooglePlaces] Network error: {e}")

    if not raw_results:
        with open("debug_err.txt", "a", encoding="utf-8") as f:
            f.write(f"[GooglePlaces] No raw results for query={query}\n")
        return []

    # ── 4. Rank ───────────────────────────────────────────────────────────────
    ranked = _rank(raw_results)[:max_results]

    # ── 5. Save to DB ─────────────────────────────────────────────────────────
    await _db_set(cache_key, ranked)

    # ── 6. Save to Redis ──────────────────────────────────────────────────────
    try:
        await _cache_set(cache_key, json.dumps(ranked), REDIS_TTL_SECONDS)
    except Exception as e:
        print(f"[GooglePlaces] Redis set error: {e}")

    return ranked


# ── Photo helpers ──────────────────────────────────────────────────────────────

def get_google_photo_url(photo_name: str, max_width: int = 800) -> Optional[str]:
    """
    Build the local proxy URL for a Google Places photo.
    photo_name looks like: places/PLACE_ID/photos/PHOTO_REFERENCE
    """
    if not photo_name:
        return None
    
    # We now proxy the image through the Next.js backend to leverage Global Edge CDN caching.
    # This ensures $0 cost on repeat visits for the same image and hides the API key.
    return f"/api/image?name={photo_name}&maxWidth={max_width}"

async def fetch_wikipedia_image(query: str) -> Optional[str]:
    """Fallback to Wikipedia for images if Google fails due to quotas."""
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "prop": "pageimages",
        "format": "json",
        "piprop": "original",
        "generator": "search",
        "gsrsearch": query,
        "gsrlimit": 1
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                pages = resp.json().get("query", {}).get("pages", {})
                for page_data in pages.values():
                    if "original" in page_data:
                        return page_data["original"]["source"]
    except Exception as e:
        pass
    return None

async def fetch_foursquare_image(name: str, lat: float, lng: float) -> Optional[str]:
    """Fallback to Foursquare Places API for images if Google fails."""
    cache_key = f"fsq_photo_{name}_{lat}_{lng}".replace(" ", "_").lower()
    
    # Check cache first
    cached_url = await _cache_get(cache_key)
    if cached_url:
        if cached_url == "NOT_FOUND":
            return None
        return cached_url

    foursquare_key = os.getenv("FOURSQUARE_API_KEY")
    if not foursquare_key:
        return None

    url = "https://api.foursquare.com/v3/places/search"
    headers = {
        "Accept": "application/json",
        "Authorization": foursquare_key
    }
    params = {
        "query": name,
        "ll": f"{lat},{lng}",
        "limit": 1,
        "fields": "photos",
        "sort": "RELEVANCE"
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    photos = results[0].get("photos", [])
                    if photos:
                        prefix = photos[0].get("prefix")
                        suffix = photos[0].get("suffix")
                        if prefix and suffix:
                            img_url = f"{prefix}original{suffix}"
                            await _cache_set(cache_key, img_url)
                            return img_url
                            
    except Exception as e:
        print(f"[Foursquare] Error fetching image for {name}: {e}")
        
    await _cache_set(cache_key, "NOT_FOUND", ttl_seconds=86400)
    return None

async def fetch_google_place_reviews(place_id: str) -> List[dict]:
    """Fetch reviews for a place using Google Places API."""
    if not PLACES_API_KEY or not place_id:
        return []

    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "reviews",
        "Referer": "http://localhost:3000/"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            
            if resp.status_code != 200:
                print(f"[GoogleReviews] Error {resp.status_code} for {place_id}: {resp.text[:200]}")
                return []
                
            data = resp.json()
            raw_reviews = data.get("reviews", [])
            
            formatted_reviews = []
            for i, rev in enumerate(raw_reviews):
                author_attr = rev.get("authorAttribution", {})
                text_obj = rev.get("text", {})
                
                formatted_reviews.append({
                    "id": rev.get("name", f"rev_{i}"),
                    "author": author_attr.get("displayName", "Anonymous"),
                    "rating": float(rev.get("rating", 5.0)),
                    "text": text_obj.get("text", ""),
                    "title": "", # Google doesn't have titles for reviews
                    "date": rev.get("relativePublishTimeDescription", "")
                })
                
            return formatted_reviews
    except Exception as e:
        print(f"[GoogleReviews] Exception fetching reviews for {place_id}: {e}")
        return []


async def fetch_google_place_details_photo(place_id: str) -> Optional[str]:
    """
    Fetch Place Details (photos field only) when searchText returned no photo.

    Only called when photo_name is absent in the searchText result —
    avoids N+1 patterns for places that already have a photo_name.

    Cache key uses CACHE_VERSION so stale "NONE" entries are invalidated
    when the version is bumped.
    """
    if not PLACES_API_KEY or not place_id:
        return None

    cache_key = f"photo_details_{CACHE_VERSION}_{place_id}"

    # ── Redis ─────────────────────────────────────────────────────────────────
    try:
        cached = await _cache_get(cache_key)
        if cached is not None:
            return cached if cached != "NONE" else None
    except Exception:
        pass

    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "photos",
        "Referer": "http://localhost:3000/"
    }

    for attempt in range(3):
        try:
            global _DETAILS_SEMAPHORE
            if _DETAILS_SEMAPHORE is None:
                _DETAILS_SEMAPHORE = asyncio.Semaphore(2)
            async with _DETAILS_SEMAPHORE:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url, headers=headers)

            if resp.status_code == 429:
                print(f"[PlaceDetails] 429 rate limit for {place_id} (attempt {attempt+1})")
                await asyncio.sleep(1.0 * (attempt + 1))
                continue

            if resp.status_code == 200:
                photos = resp.json().get("photos", [])
                if photos:
                    photo_name = photos[0].get("name")
                    if photo_name:
                        photo_url = get_google_photo_url(photo_name)
                        # Cache for 30 days
                        try:
                            await _cache_set(cache_key, photo_url, REDIS_TTL_SECONDS)
                        except Exception:
                            pass
                        return photo_url

                # Google has no photo for this place — cache as NONE for 24h only
                # (not 30 days, so we retry sooner if Google adds a photo)
                try:
                    await _cache_set(cache_key, "NONE", 86400)
                except Exception:
                    pass
                return None
            else:
                print(f"[PlaceDetails] HTTP {resp.status_code} for {place_id}: {resp.text[:200]}")
                break

        except Exception as e:
            print(f"[PlaceDetails] Error for {place_id}: {type(e).__name__}: {e}")
            await asyncio.sleep(1.0)

    return None
