import asyncio
from fastapi import FastAPI, Request, Query, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

import sys
import traceback

try:
    from models.entities import Passenger
    from models.state import TripState
    from models.enums import Weather
    from services.geo_service import geo_lookup
    from engines.ranking_engine import rank_transport, rank_places, rank_hotels
    from services.cache_logger import log_cache_event
    from services.routing_engine import optimize_itinerary
except Exception as e:
    print("CRITICAL IMPORT ERROR DURING STARTUP:", flush=True)
    traceback.print_exc()
    sys.exit(1)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers migrated from the Next.js API layer (src/app/api/**) — see backend/routers/.
from backend.routers import auth as auth_router
from backend.routers import trips as trips_router
from backend.routers import passengers as passengers_router
from backend.routers import feedback as feedback_router
from backend.routers import trip_attempt as trip_attempt_router
from backend.routers import state as state_router
from backend.routers import blogs as blogs_router
from backend.routers import media as media_router
from backend.routers import upload as upload_router
from backend.routers import local_cities as local_cities_router
from backend.routers import admin as admin_router
from backend.routers import ola_places as ola_places_router
from backend.quota import check_and_increment_quota, check_and_increment_transport_quota, check_recommendations_quota

app.include_router(auth_router.router)
app.include_router(trips_router.router)
app.include_router(passengers_router.router)
app.include_router(feedback_router.router)
app.include_router(trip_attempt_router.router)
app.include_router(state_router.router)
app.include_router(blogs_router.router)
app.include_router(media_router.router)
app.include_router(upload_router.router)
app.include_router(local_cities_router.router)
app.include_router(admin_router.router)
app.include_router(ola_places_router.router)

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    import datetime
    tb = traceback.format_exc()
    print(f"[UNHANDLED ERROR] {exc}\n{tb}", flush=True)
    try:
        with open("server_500_errors.txt", "a") as f:
            f.write(f"\n--- [500 ERROR at {datetime.datetime.now().isoformat()}] ---\n")
            f.write(f"URL: {request.url}\n")
            f.write(f"Exception: {exc}\n")
            f.write(f"Traceback:\n{tb}\n")
    except Exception as file_ex:
        print(f"[Logging Error] Could not write to server_500_errors.txt: {file_ex}", flush=True)
        
    return JSONResponse(status_code=500, content={"error": str(exc), "traceback": tb})

# Collaboration Websocket Manager

class ConnectionManager:
    def __init__(self):
        # Maps room_id -> dict of websocket to user info
        self.active_connections: dict[str, dict[WebSocket, dict]] = {}
        self.room_states: dict[str, dict] = {} # Store the latest state for each room
        self.drag_locks: dict[str, dict[str, str]] = {} # room_id -> {placeId: userId of first dragger}
        self.MAX_COLLABORATORS = 15

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
            
        if len(self.active_connections[room_id]) >= self.MAX_COLLABORATORS:
            await websocket.send_json({"type": "ERROR", "message": "Room is full (max 15)"})
            await websocket.close()
            return False
            
        self.active_connections[room_id][websocket] = {"id": str(id(websocket)), "name": "Guest", "picture": None}
        return True

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                del self.active_connections[room_id][websocket]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

        # Release any drag locks held by this connection so other users aren't stuck
        user_id = str(id(websocket))
        locks = self.drag_locks.get(room_id)
        if locks:
            for place_id in [pid for pid, uid in locks.items() if uid == user_id]:
                del locks[place_id]

    async def broadcast(self, room_id: str, message: dict, sender: WebSocket = None):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id].keys():
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except:
                        pass
                        
    def get_room_users(self, room_id: str):
        return list(self.active_connections.get(room_id, {}).values())

manager = ConnectionManager()

@app.websocket("/api/ws/plan/{plan_id}")
async def websocket_endpoint(websocket: WebSocket, plan_id: str):
    success = await manager.connect(plan_id, websocket)
    if not success:
        return
        
    try:
        users = manager.get_room_users(plan_id)
        await manager.broadcast(plan_id, {"type": "PRESENCE", "users": users}, sender=websocket)
        await websocket.send_json({"type": "PRESENCE", "users": users})
        
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "JOIN":
                user_info = data.get("user", {})
                user_info["id"] = str(id(websocket))
                manager.active_connections[plan_id][websocket].update(user_info)
                users = manager.get_room_users(plan_id)
                await manager.broadcast(plan_id, {"type": "PRESENCE", "users": users})
                await websocket.send_json({"type": "PRESENCE", "users": users})
                
                # Send the latest known state to the newly joined user
                if plan_id in manager.room_states:
                    await websocket.send_json({"type": "SYNC_STATE", "state": manager.room_states[plan_id]})
                    
            elif data.get("type") in ["SYNC_STATE", "DRAG_START", "DRAG_END"]:
                msg_type = data.get("type")
                user_id = str(id(websocket))

                if msg_type == "SYNC_STATE":
                    manager.room_states[plan_id] = data.get("state")

                elif msg_type == "DRAG_START":
                    place_id = data.get("placeId")
                    locks = manager.drag_locks.setdefault(plan_id, {})
                    existing_owner = locks.get(place_id)
                    if existing_owner and existing_owner != user_id:
                        # Someone else started dragging this place first; reject this attempt
                        await websocket.send_json({"type": "DRAG_REJECTED", "placeId": place_id})
                        continue
                    locks[place_id] = user_id
                    data["userId"] = user_id

                elif msg_type == "DRAG_END":
                    place_id = data.get("placeId")
                    locks = manager.drag_locks.get(plan_id, {})
                    # Only the lock holder can release it
                    if locks.get(place_id) == user_id:
                        del locks[place_id]
                    data["userId"] = user_id

                await manager.broadcast(plan_id, data, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(plan_id, websocket)
        users = manager.get_room_users(plan_id)
        if users:
            await manager.broadcast(plan_id, {"type": "PRESENCE", "users": users})


@app.post("/api/optimize_itinerary")
async def api_optimize_itinerary(req: Request):
    payload = await req.json()
    places = payload.get("places", [])
    days_count = payload.get("days_count", 1)
    hotel_coords = payload.get("hotel_coords")
    passengers = payload.get("passengers", [])
    arrival_offset_mins = payload.get("arrival_offset_mins", 0)

    import traceback
    try:
        return await optimize_itinerary(
            places, days_count, hotel_coords,
            passengers=passengers,
            arrival_offset_mins=arrival_offset_mins
        )
    except Exception as e:
        with open("debug_opt_error.txt", "w") as f:
            f.write(traceback.format_exc())
        raise e


from pydantic import BaseModel

class Coord(BaseModel):
    lat: float
    lng: float

class MatrixRequest(BaseModel):
    origins: list[Coord]
    destinations: list[Coord]

@app.post("/api/route-matrix")
async def get_route_matrix(req: MatrixRequest, user=Depends(check_and_increment_quota("eta"))):
    import os, httpx, hashlib
    api_key = os.getenv("NEXT_PUBLIC_GOOGLE_PLACES_KEY")
    if not api_key:
        return {"error": "No API key configured"}
        
    origin_str = "|".join([f"{c.lat},{c.lng}" for c in req.origins])
    dest_str = "|".join([f"{c.lat},{c.lng}" for c in req.destinations])
    
    # Generate Cache Key
    cache_key_raw = f"matrix_{origin_str}_{dest_str}"
    cache_key = "matrix_" + hashlib.md5(cache_key_raw.encode()).hexdigest()
    
    # 1. Check DB Cache
    try:
        from services.google_places_api import _db_get, _db_set
        cached = await _db_get(cache_key)
        if cached and len(cached) > 0:
            log_cache_event("RouteMatrix", "HIT", "NeonDB", cache_key)
            print("[RouteMatrix] Cache HIT")
            return cached[0]
    except Exception as e:
        print(f"[RouteMatrix] Cache read error: {e}")
    
    log_cache_event("RouteMatrix", "MISS", "NeonDB", cache_key)
    print("[RouteMatrix] Cache MISS - Fetching from Google Maps")
    url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin_str}&destinations={dest_str}&departure_time=now&traffic_model=best_guess&key={api_key}"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=10.0)
            res.raise_for_status()
            data = res.json()
            
            # Save to Cache
            try:
                await _db_set(cache_key, [data])
            except Exception as e:
                print(f"[RouteMatrix] Cache write error: {e}")
                
            return data
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/transport")
async def get_transport(source: str, destination: str, mode: str = "all", check_only: bool = Query(False), user=Depends(check_and_increment_transport_quota)):
    # Dummy passenger to satisfy backend requirements
    p1 = Passenger(id="1", name="Dummy", age=25, gender="M", pincode="110001", city=source)
    date = datetime.now() + timedelta(days=10)
    
    options = await rank_transport(source, destination, date, [p1], mode=mode, check_only=check_only)
    if options is None:
        return {"status": "cache_miss"}
        
    has_trains = False
    result = []
    for i, o in enumerate(options):
        rec_score = 100 - (i * 5)
        if rec_score < 50: rec_score = 50
        
        t_type = o.type.value.lower()
        if t_type == "train":
            has_trains = True
            
        result.append({
            "id": o.id,
            "type": t_type,
            "source": source,
            "destination": destination,
            "departure": o.departure.isoformat(),
            "arrival": o.arrival.isoformat(),
            "duration": f"{int(o.duration_hours)}h {int((o.duration_hours % 1) * 60)}m",
            "price": o.price,
            "safetyScore": o.safety_score,
            "recommendationScore": rec_score,
            "provider": getattr(o, "provider", "Unknown"),
            "price_breakdown": getattr(o, "price_breakdown", None)
        })
        
    cross_routes_data = []
    if (mode == "all" or mode == "cross") and not check_only:
        from services.cross_routing_engine import hydrate_cross_route
        cross_res_list = await hydrate_cross_route(source, destination, date, passengers=1)
        
        for cross_res in cross_res_list:
            if cross_res and cross_res.get("status") == "success":
                path_str = " → ".join(cross_res["offline_estimation"]["nodes"])
                dur = cross_res.get("offline_estimation", {}).get("total_estimated_hours", 10)
                price = cross_res.get("total_price", 0)
                
                # Format legs for frontend
                formatted_legs = []
                for leg in cross_res.get("live_legs", []):
                    opt = leg["live_option"]
                    formatted_legs.append({
                        "source": leg["source"],
                        "destination": leg["destination"],
                        "mode": leg["mode"],
                        "provider": getattr(opt, "provider", "Unknown"),
                        "departure": opt.departure.isoformat(),
                        "arrival": opt.arrival.isoformat(),
                        "duration": f"{int(opt.duration_hours)}h {int((opt.duration_hours % 1) * 60)}m",
                        "price": opt.price
                    })
                
                cross_routes_data.append({
                    "id": f"cross-{source}-{destination}-{cross_res_list.index(cross_res)}",
                    "type": "cross",
                    "source": source,
                    "destination": destination,
                    "departure": date.isoformat(),
                    "arrival": (date + timedelta(hours=dur)).isoformat(),
                    "duration": f"{int(dur)}h {int((dur % 1) * 60)}m",
                    "price": price,
                    "safetyScore": 85,
                    "recommendationScore": 95,
                    "provider": f"Connecting Route: {path_str}",
                    "path_str": path_str,
                    "legs": formatted_legs
                })
            
    return {
        "options": result,
        "cross_routes": cross_routes_data
    }

from services.live_trains_api import get_train_route, get_live_train_status, get_station_board

@app.get("/api/trains/{train_number}/route")
async def api_get_train_route(train_number: str):
    return await get_train_route(train_number)

@app.get("/api/trains/{train_number}/live")
async def api_get_live_train_status(train_number: str, date: str):
    return await get_live_train_status(train_number, date)

@app.get("/api/stations/{station_code}/board")
async def api_get_station_board(station_code: str):
    return await get_station_board(station_code)

@app.get("/api/cross_transport")
async def get_cross_transport(source: str, destination: str):
    """
    Finds multi-modal indirect routes (e.g. Train -> Flight) when no direct routes exist.
    """
    from services.cross_routing_engine import hydrate_cross_route
    date = datetime.now() + timedelta(days=10)
    
    result = await hydrate_cross_route(source, destination, date, passengers=1)
    
    if not result:
        return {"status": "error", "message": "No valid cross-routes found."}
        
    return result

@app.get("/api/places")
async def get_places(destination: str, check_only: bool = Query(False), user=Depends(check_and_increment_quota("places"))):
    places = await rank_places(destination, Weather.SUNNY, check_only=check_only)
    if places is None:
        return {"status": "cache_miss"}
    
    result = []
    from services.google_places_api import get_google_photo_url, fetch_google_place_details_photo, fetch_wikipedia_image, fetch_foursquare_image

    PLACEHOLDER = "/placeholder-place.svg"

    async def _resolve_photo(p):
        if getattr(p, "photo_name", None):
            google_img = get_google_photo_url(p.photo_name)
            if google_img:
                return google_img
        return PLACEHOLDER

    try:
        raw_urls = await asyncio.gather(*[_resolve_photo(p) for p in places], return_exceptions=True)
        photo_urls = [r if not isinstance(r, Exception) else PLACEHOLDER for r in raw_urls]
    except Exception as e:
        print(f"[PlacePhoto] resolution failed: {type(e).__name__}: {e}")
        photo_urls = [PLACEHOLDER] * len(places)

    for i, p in enumerate(places):
        result.append({
            "id": p.id,
            "name": p.name,
            "category": p.category.title() if isinstance(p.category, str) else str(p.category),
            "visitDurationHours": p.visit_duration_hours,
            "entryFee": p.entry_fee,
            "safetyScore": p.safety_score_base,
            "crowdScore": p.crowd_estimate.value,
            "recommendationScore": 90 - i,
            "imageUrl": photo_urls[i],
            "lat": p.coordinates[0],
            "lng": p.coordinates[1],
            "rating": p.rating,
            "reviewsCount": p.user_rating_count
        })
    return result

from engines.ranking_engine import rank_food

@app.get("/api/food")
async def get_food(destination: str, check_only: bool = Query(False), user=Depends(check_and_increment_quota("food"))):
    places = await rank_food(destination, Weather.SUNNY, check_only=check_only)
    if places is None:
        return {"status": "cache_miss"}
    
    result = []
    from services.google_places_api import get_google_photo_url, fetch_google_place_details_photo, fetch_wikipedia_image, fetch_foursquare_image

    PLACEHOLDER = "/placeholder-place.svg"

    async def _resolve_photo(p):
        if getattr(p, "photo_name", None):
            google_img = get_google_photo_url(p.photo_name)
            if google_img:
                return google_img
        return PLACEHOLDER

    try:
        raw_urls = await asyncio.gather(*[_resolve_photo(p) for p in places], return_exceptions=True)
        photo_urls = [r if not isinstance(r, Exception) else PLACEHOLDER for r in raw_urls]
    except Exception as e:
        print(f"[FoodPhoto] resolution failed: {type(e).__name__}: {e}")
        photo_urls = [PLACEHOLDER] * len(places)

    for i, p in enumerate(places):
        result.append({
            "id": p.id,
            "name": p.name,
            "category": p.category.title() if isinstance(p.category, str) else str(p.category),
            "visitDurationHours": p.visit_duration_hours,
            "entryFee": p.entry_fee,
            "safetyScore": p.safety_score_base,
            "crowdScore": p.crowd_estimate.value,
            "recommendationScore": 90 - i,
            "imageUrl": photo_urls[i],
            "lat": p.coordinates[0],
            "lng": p.coordinates[1],
            "rating": p.rating,
            "reviewsCount": p.user_rating_count
        })
    return result

from services.google_places_api import fetch_google_place_reviews

@app.get("/api/places/reviews")
async def get_place_reviews(location_id: str, user=Depends(check_and_increment_quota("reviews"))):
    return await fetch_google_place_reviews(location_id)


@app.get("/api/hotels")
async def get_hotels(destination: str, check_only: bool = Query(False), user=Depends(check_and_increment_quota("hotels"))):
    trip = TripState(
        trip_id="T1", mode="direct", passengers=[],
        source_city="Delhi", destination_city=destination,
        start_date=datetime.now(), end_date=datetime.now() + timedelta(days=3),
        total_budget=50000
    )
    hotels = await rank_hotels(destination, trip, check_only=check_only)
    if hotels is None:
        return {"status": "cache_miss"}
    
    result = []
    from services.google_places_api import get_google_photo_url, fetch_google_place_details_photo, fetch_wikipedia_image, fetch_foursquare_image

    # Placeholder served from public/ — no external request
    PLACEHOLDER = "/placeholder-place.svg"

    async def _resolve_photo(h):
        if getattr(h, "photo_name", None):
            if h.photo_name.startswith("http"):
                return h.photo_name
            google_img = get_google_photo_url(h.photo_name)
            if google_img:
                return google_img

        from services.google_places_api import search_google_places
        if check_only:
            return PLACEHOLDER
            
        places_res = await search_google_places(f"{h.name} {destination}", max_results=1)
        if places_res:
            photos = places_res[0].get("photos", [])
            if photos:
                p_name = photos[0].get("name")
                if p_name:
                    google_img = get_google_photo_url(p_name)
                    if google_img:
                        return google_img
        
        return PLACEHOLDER

    try:
        raw_urls = await asyncio.gather(*[_resolve_photo(h) for h in hotels], return_exceptions=True)
        photo_urls = [r if not isinstance(r, Exception) else PLACEHOLDER for r in raw_urls]
    except Exception as e:
        print(f"[HotelPhoto] resolution failed: {type(e).__name__}: {e}")
        photo_urls = [PLACEHOLDER] * len(hotels)

    for i, h in enumerate(hotels):
        maps_url = (
            f"https://www.google.com/maps/search/?api=1"
            f"&query={h.coordinates[0]},{h.coordinates[1]}"
            f"&query_place_id={h.id}"
        )
        result.append({
            "id": h.id,
            "name": h.name,
            "address": getattr(h, "address", None),
            "coordinates": h.coordinates,
            "pricePerNight": h.price_per_night,
            "distanceToCluster": 2.5,
            "safetyScore": h.safety_score,
            "comfortScore": h.comfort_score,
            "recommendationScore": 90 - i,
            "rating": h.rating,
            "imageUrl": photo_urls[i],
            "mapsUrl": maps_url,
            "lat": h.coordinates[0],
            "lng": h.coordinates[1]
        })
    return result

from engines.ollama_engine import recommend as get_ai_recommendations

@app.post("/api/recommendations")
async def get_recommendations(preferences: dict, user=Depends(check_recommendations_quota)):
    passengers = preferences.get("passengers", [])
    total_budget = preferences.get("total_budget", 50000)
    days = preferences.get("days", 3)
    preference = preferences.get("preference", "any")
    group_size = preferences.get("group_size", len(passengers) or 1)
    constraints = preferences.get("constraints", "")
    
    return await asyncio.to_thread(get_ai_recommendations, passengers, total_budget, days, preference, group_size, constraints)


import requests
import unicodedata
from typing import List, Dict, Any

def _remove_diacritics(text: str) -> str:
    if not text:
        return text
    return ''.join(c for c in unicodedata.normalize('NFD', str(text)) if unicodedata.category(c) != 'Mn')

import httpx
_shared_async_client = httpx.AsyncClient(timeout=3.0)
async def _fetch_photon_cities(q: str) -> List[Dict[str, Any]]:
    if not q or len(q) < 1:
        return []

    q_lower = q.lower().strip()
    region_aliases = {
        "ladakh": "Leh",
        "goa": "Panjim",
        "sikkim": "Gangtok",
        "kashmir": "Srinagar",
        "andaman": "Port Blair",
        "nicobar": "Port Blair",
        "lakshadweep": "Kavaratti"
    }
    
    # If it's a known alias or starts with one, we could replace it, but direct match is safest
    if q_lower in region_aliases:
        q = region_aliases[q_lower]

    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": q,
        "count": 15,
        "language": "en",
        "format": "json"
    }
    
    try:
        response = await _shared_async_client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        results = []
        features = data.get("results") or []
        
        # Sort features by population descending to ensure major cities appear first
        features.sort(key=lambda x: x.get("population") or 0, reverse=True)
        
        for feature in features:
            if feature.get("country") != "India":
                continue
                
            # Looser population check: only filter if population is known and very small.
            # Many legitimate cities might not have a population field in Open-Meteo.
            pop = feature.get("population")
            if pop is not None and pop < 10000:
                continue
                
            city_name = _remove_diacritics(feature.get("name", ""))
            state_name = _remove_diacritics(feature.get("admin1", ""))
            
            if not city_name:
                continue
                
            display = f"{city_name}"
            if state_name:
                display += f", {state_name}"
                
            results.append({
                "name": city_name,
                "display": display,
                "state": state_name,
                "lat": feature.get("latitude"),
                "lng": feature.get("longitude"),
                "osrm_coords": f"{feature.get('longitude')},{feature.get('latitude')}"
            })
            
        # Deduplicate by display name while preserving order
        seen = set()
        deduped = []
        for r in results:
            if r["display"] not in seen:
                seen.add(r["display"])
                deduped.append(r)
                
        return deduped
    except Exception as e:
        print(f"[Warning] Failed to fetch open-meteo cities: {e}")
        return []

async def _fetch_ola_cities_autocomplete(q: str) -> List[Dict[str, Any]]:
    if not q or len(q) < 1:
        return []
    
    import os
    import urllib.parse
    api_key = os.environ.get("OLA_MAPS_API_KEY", "")
    if not api_key:
        return await _fetch_photon_cities(q)
    
    url = f"https://api.olamaps.io/places/v1/autocomplete?input={urllib.parse.quote(q)}&api_key={api_key}"
    
    try:
        # Reduced timeout to 1.5s to prevent long hangs if Ola API is slow
        response = await _shared_async_client.get(url, timeout=1.5)
        response.raise_for_status()
        data = response.json()
        
        results = []
        predictions = data.get('predictions', [])
        
        seen = set()
        for p in predictions:
            if not isinstance(p, dict):
                continue
                
            sf = p.get('structured_formatting', {})
            name = sf.get('main_text') or p.get('description', '').split(',')[0]
            
            desc_parts = p.get('description', '').split(',')
            state = desc_parts[1].strip() if len(desc_parts) > 1 else ""
            
            display = p.get('description', name)
            
            geom = p.get('geometry', {}).get('location', {})
            lat = geom.get('lat')
            lng = geom.get('lng')
            
            if not lat or not lng:
                continue
                
            types = p.get('types', [])
            layer = p.get('layer', [])
            
            # Filter out non-cities like airports, points of interest, etc.
            exclude_layers = {'venue', 'address', 'street', 'stop', 'poi', 'transport', 'airport', 'building', 'company'}
            if set(types).intersection(exclude_layers) or set(layer).intersection(exclude_layers):
                continue
                
            # Basic deduplication
            if display not in seen:
                seen.add(display)
                results.append({
                    "name": name,
                    "display": display,
                    "state": state,
                    "lat": float(lat),
                    "lng": float(lng),
                    "osrm_coords": f"{lng},{lat}"
                })
                
        return results
    except Exception as e:
        print(f"[Warning] Failed to fetch ola cities: {e}")
        return []

@app.get("/api/pincode/{pincode}")
async def api_pincode_lookup(pincode: str):
    # This endpoint was previously missing entirely — the Next.js proxy route
    # (src/app/api/pincode/[pincode]/route.ts) called it and always got a
    # connection/404 error. Added here as part of the FastAPI migration.
    return await asyncio.to_thread(geo_lookup, pincode)

@app.get("/api/search-city")
async def search_city(q: str = "", user=Depends(check_and_increment_quota("autocomplete"))):
    if not q:
        return []
    
    import asyncio
    # Run both Ola and Open-Meteo concurrently. We prefer Ola, but if it takes too long or fails, we have Open-Meteo ready immediately.
    ola_task = asyncio.create_task(_fetch_ola_cities_autocomplete(q))
    photon_task = asyncio.create_task(_fetch_photon_cities(q))
    
    ola_cities, photon_cities = await asyncio.gather(ola_task, photon_task, return_exceptions=True)
    
    if isinstance(ola_cities, list) and ola_cities:
        return ola_cities
        
    if isinstance(photon_cities, list) and photon_cities:
        return photon_cities
        
    return []

@app.get("/api/test-redbus")
async def test_redbus(q: str = Query(...)):
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://www.redbus.in/mobapi/v2/locations/search?query={q}",
                headers={"User-Agent": "Mozilla/5.0"}
            )
            return {"status": res.status_code, "data": res.text[:500]}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/overpass-search")
@app.get("/api/ola-search")
async def ola_search(q: str = Query(...), city: str = Query(...)):
    import requests
    def _fetch():
        import uuid
        import os
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        api_key = os.environ.get("OLA_MAPS_API_KEY", "")
        
        import math
        location_param = ""
        city_lat = None
        city_lon = None
        try:
            # Synchronously fetch city coordinates from Open-Meteo
            city_query = city.split(',')[0].strip().lower()
            aliases = {"ladakh": "Leh", "goa": "Panjim", "sikkim": "Gangtok", "kashmir": "Srinagar", "andaman": "Port Blair", "nicobar": "Port Blair", "lakshadweep": "Kavaratti"}
            city_query = aliases.get(city_query, city_query)
            
            p_url = f"https://geocoding-api.open-meteo.com/v1/search?name={requests.utils.quote(city_query)}&count=1&language=en&format=json"
            p_res = _shared_session.get(p_url, timeout=3)
            if p_res.status_code == 200:
                p_data = p_res.json()
                features = p_data.get("results")
                if features:
                    city_lat = float(features[0].get("latitude"))
                    city_lon = float(features[0].get("longitude"))
                    location_param = f"&location={city_lat},{city_lon}&strictbounds=true"
        except Exception as e:
            print("Error fetching city coords synchronously:", e)
            
        url = f"https://api.olamaps.io/places/v1/autocomplete?input={requests.utils.quote(q)}{location_param}&api_key={api_key}"
        headers = {'X-Request-Id': str(uuid.uuid4())}
        
        try:
            response = _shared_session.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                raise Exception(f"Ola API returned HTTP {response.status_code}: {response.text}")
            data = response.json()
        except Exception as e:
            print("Ola Maps Request Error:", e)
            raise e
            
        predictions = data.get('predictions', [])
        if not predictions:
            # Maybe it's a direct array or different format?
            if isinstance(data, list):
                predictions = data
            elif 'error_message' in data and data['error_message']:
                raise Exception(f"Ola API Error: {data['error_message']}")
            elif 'message' in data:
                raise Exception(f"Ola API Error: {data['message']}")
            else:
                # If we get here and it's empty, we just return empty list
                pass
                
        places = []
        for p in predictions:
            if not isinstance(p, dict):
                continue
                
            name = p.get('structured_formatting', {}).get('main_text') or p.get('description', 'Unknown')
            
            # Position safely
            geom = p.get('geometry') or {}
            loc = geom.get('location') or {}
            lat = loc.get('lat')
            lng = loc.get('lng')
            
            # Fallback if ola maps returns different format
            if not lat:
                loc_fb = p.get('location') or {}
                lat = loc_fb.get('lat')
                lng = loc_fb.get('lng')
                
            if not lat or not lng:
                # If autocomplete does not return geometry, we skip it for now.
                # The user would need Place Details API to get coordinates, 
                # but since we found geometry in tests, we assume it's usually there.
                continue
                
            lat_float = float(lat)
            lng_float = float(lng)
            
            # Filter by distance if city coordinates are available (max 100km radius)
            if city_lat is not None and city_lon is not None:
                R = 6371.0 # Radius of earth in km
                dlat = math.radians(lat_float - city_lat)
                dlng = math.radians(lng_float - city_lon)
                a = math.sin(dlat / 2)**2 + math.cos(math.radians(city_lat)) * math.cos(math.radians(lat_float)) * math.sin(dlng / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                distance = R * c
                if distance > 100:
                    continue
            else:
                main_city = city.split(',')[0].strip().lower()
                desc_lower = p.get('description', '').lower()
                if main_city not in desc_lower and main_city not in name.lower():
                    continue
                    
            types = p.get('types', [])
            category = "OTHER"
            
            # Very basic category mapping based on string
            desc_lower = p.get('description', '').lower()
            if any(t in types for t in ['restaurant', 'cafe', 'food']):
                category = "FOOD"
            elif 'cinema' in desc_lower or 'mall' in desc_lower:
                category = "INDOOR_ENT"
            elif any(t in types for t in ['park', 'stadium']):
                category = "ACTIVE"
            elif any(t in types for t in ['point_of_interest', 'establishment']):
                category = "CULTURAL"
                
            places.append({
                "id": p.get('place_id', str(lat)),
                "name": name,
                "category": category,
                "lat": float(lat),
                "lng": float(lng)
            })
        return places
    try:
        return await asyncio.to_thread(_fetch)
    except Exception as e:
        import traceback
        return [{"id": "error", "name": f"Error: {str(e)} - {traceback.format_exc()}", "category": "OTHER", "lat": 0, "lng": 0}]

