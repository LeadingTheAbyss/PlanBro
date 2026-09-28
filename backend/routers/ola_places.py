import httpx
from fastapi import APIRouter, HTTPException, Query

from backend.config import get_settings
from backend.db import get_pool
from backend.ids import new_id
from backend import redis_client

router = APIRouter(prefix="/api/ola", tags=["ola"])


@router.get("/autocomplete")
async def ola_autocomplete(input: str = Query(...), city: str | None = None):
    if not input or len(input) < 3:
        raise HTTPException(status_code=400, detail="Missing or too short input parameter")

    cache_key = f"autocomplete:{input.lower()}{':' + city.lower() if city else ''}"
    cached = await redis_client.get_json(cache_key)
    if cached:
        return cached

    pool = await get_pool()
    if city:
        db_matches = await pool.fetch(
            'SELECT * FROM "Landmark" WHERE name ILIKE $1 AND city ILIKE $2 ORDER BY "createdAt" DESC LIMIT 5',
            f"%{input}%",
            city,
        )
    else:
        db_matches = await pool.fetch(
            'SELECT * FROM "Landmark" WHERE name ILIKE $1 ORDER BY "createdAt" DESC LIMIT 5',
            f"%{input}%",
        )

    if db_matches:
        predictions = [
            {
                "description": m["name"],
                "place_id": m["id"],
                "geometry": {"location": {"lat": m["lat"], "lng": m["lng"]}},
                "structured_formatting": {"main_text": m["name"], "secondary_text": "Saved Landmark"},
            }
            for m in db_matches
        ]
        response_data = {"predictions": predictions}
        await redis_client.set_json(cache_key, response_data, ttl_seconds=3600)
        return response_data

    settings = get_settings()
    if not settings.ola_maps_api_key:
        raise HTTPException(status_code=500, detail="Missing OLA_MAPS_API_KEY")

    search_query = f"{input}, {city}" if city else input
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                "https://api.olamaps.io/places/v1/autocomplete",
                params={"input": search_query, "api_key": settings.ola_maps_api_key},
            )
            data = res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    predictions = data.get("predictions")
    if city and predictions:
        data["predictions"] = [p for p in predictions if city.lower() in p.get("description", "").lower()]
    if data.get("predictions") and len(data["predictions"]) > 5:
        data["predictions"] = data["predictions"][:5]

    await redis_client.set_json(cache_key, data, ttl_seconds=604800)
    return data


@router.get("/geocode")
async def ola_geocode(address: str | None = None, place_id: str | None = Query(None, alias="place_id")):
    if not address and not place_id:
        raise HTTPException(status_code=400, detail="Missing address or place_id parameter")

    cache_key = f"details:{place_id}" if place_id else f"geocode:{(address or '').lower()}"
    cached = await redis_client.get_json(cache_key)
    if cached:
        return cached

    settings = get_settings()
    if not settings.ola_maps_api_key:
        raise HTTPException(status_code=500, detail="Missing OLA_MAPS_API_KEY")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if place_id:
                res = await client.get(
                    "https://api.olamaps.io/places/v1/details",
                    params={"place_id": place_id, "api_key": settings.ola_maps_api_key},
                )
            else:
                res = await client.get(
                    "https://api.olamaps.io/places/v1/geocode",
                    params={"address": address, "api_key": settings.ola_maps_api_key},
                )
            data = res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    await redis_client.set_json(cache_key, data, ttl_seconds=604800)

    loc = None
    name_to_save = address or "Unknown Place"
    result = data.get("result")
    if result and result.get("geometry"):
        loc = result["geometry"]["location"]
        if result.get("name"):
            name_to_save = result["name"]
    elif data.get("geocodingResults"):
        loc = data["geocodingResults"][0]["geometry"]["location"]

    if loc:
        try:
            pool = await get_pool()
            await pool.execute(
                'INSERT INTO "Landmark" (id, name, lat, lng, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())',
                new_id(),
                name_to_save,
                loc["lat"],
                loc["lng"],
            )
        except Exception:
            pass

    return data
