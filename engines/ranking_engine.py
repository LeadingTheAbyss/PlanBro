import math
from typing import List, Optional
from datetime import datetime, timedelta
from models.entities import Passenger, TransportOption, Place, Hotel
from models.enums import TransportType, Weather, CrowdLevel
from models.state import TripState

from engines.safety_engine import calculate_safety_score
from services.live_hotels_api import search_live_hotels
from services.live_flights_api import search_live_flights
from services.live_trains_api import search_live_trains
from services.osrm_cab_api import search_live_cabs

async def rank_transport(source: str, dest: str, date: datetime, passengers: List[Passenger], mode: str = "all", check_only: bool = False) -> Optional[List[TransportOption]]:
    import asyncio
    from services.live_bus_api import search_live_buses

    async def empty_result():
        return [] if not check_only else None

    t_flight = search_live_flights(source, dest, date.strftime("%Y-%m-%d"), check_only=check_only) if mode in ["all", "flight"] else empty_result()
    t_train = search_live_trains(source, dest, date.strftime("%Y-%m-%d"), check_only=check_only) if mode in ["all", "train"] else empty_result()
    # Cabs are local math, they never check_only the DB because they are instantaneous and free. So they always return results.
    t_cab = search_live_cabs(source, dest, date.strftime("%Y-%m-%d")) if mode in ["all", "cab"] else empty_result()
    t_bus = search_live_buses(source, dest, date.strftime("%Y-%m-%d"), check_only=check_only) if mode in ["all", "bus"] else empty_result()

    raw_results = await asyncio.gather(t_flight, t_train, t_cab, t_bus, return_exceptions=True)
    results = []
    for i, r in enumerate(raw_results):
        if isinstance(r, Exception):
            print(f"[Transport] Engine failure for mode {i}: {r}")
            # Ensure check_only mode returns None so frontend continues polling, but if not check_only return empty list
            results.append([] if not check_only else None)
        else:
            results.append(r)
    
    if check_only:
        # If we are checking all modes and ANY of the needed ones missed the cache (returned None), we return None.
        # Wait, the user clicks individual modes now (`mode="cab"`, `mode="flight"`). 
        # So we just return the result for that specific mode!
        # Actually, in check_only mode, if the mode they requested returns None, we return None.
        valid_results = [r for r in results if r is not None]
        if not valid_results and mode != "all":
            # If the mode they requested was cache missed, return None. 
            # Note: Cabs will always return a list, never None.
            return None
            
        transports = []
        for r in valid_results:
            transports.extend(r)
        
        # If mode="all" and we missed cache for flight/train/bus, should we return None?
        # Let's just return what we have in cache if any, or None if completely empty. 
        # Actually, we don't fetch mode="all" from frontend anymore, we fetch them individually!
        if mode == "all" and None in [results[0], results[1], results[3]]: # flight, train, bus
             return None
             
        if not transports and mode != "cab":
            return None
    else:
        live_flights, live_trains, live_cabs, live_buses = results
        transports = (live_flights or []) + (live_trains or []) + (live_cabs or []) + (live_buses or [])
    
    def transport_score(t: TransportOption):
        score = 0
        has_elderly = any(p.age > 60 for p in passengers)
        if has_elderly and t.type == TransportType.BUS:
            score -= 20 # Heavily penalize buses for elderly
        score += (20 - t.duration_hours) * 2
        score += (10000 - t.price) / 1000
        score += t.safety_score * 2
        return score
        
    transports.sort(key=transport_score, reverse=True)
    return transports

from services.google_places_api import search_google_places

# Google's text search matches on relevance, not strict category, so a business
# named e.g. "Visit Ladakh Tour Agency" matches "tourist attractions in Ladakh" on
# keywords alone. These primaryType values are businesses/services, not places a
# traveler can actually visit, so we drop them before they ever reach the frontend.
_NON_ATTRACTION_TYPES = {
    "tour_agency",
    "travel_agency",
    "corporate_office",
    "real_estate_agency",
    "insurance_agency",
    "lawyer",
    "accounting",
    "moving_company",
    "storage",
}

async def rank_places(city: str, weather: Weather, check_only: bool = False) -> Optional[List[Place]]:
    query = f"Top tourist attractions in {city}"
    # Fetch exactly 30 places
    raw_places = await search_google_places(query, max_results=30, check_only=check_only)

    if raw_places is None:
        return None # Cache miss

    if raw_places:
        raw_places = [p for p in raw_places if p.get("primaryType") not in _NON_ATTRACTION_TYPES]

    places = []
    if raw_places:
        print(f"[Debug] First raw place: {raw_places[0]}")
    for i, p in enumerate(raw_places):
        location = p.get("location", {})
        lat = location.get("latitude", 0.0)
        lng = location.get("longitude", 0.0)
        
        place_id = p.get("id", f"p{i}_{city}")
        photo_name = None
        photos = p.get("photos", [])
        if photos:
            photo_name = photos[0].get("name") or None
            
        places.append(
            Place(
                id=place_id,
                photo_name=photo_name,
                name=p.get("displayName", {}).get("text", "Unknown Place"),
                category=(p.get("primaryType") or "tourist_attraction").replace("_", " ").title(),
                coordinates=(lat, lng),
                entry_fee=0 if p.get("primaryType") in ["park", "city_hall", "church", "hindu_temple", "mosque", "place_of_worship"] else ((((sum(ord(c) for c in place_id) * 17) % 150) // 30) * 30 + 30),
                visit_duration_hours=2,
                safe_hours=(6, 20),
                crowd_estimate=CrowdLevel.HIGH if p.get("userRatingCount", 0) > 5000 else CrowdLevel.MEDIUM,
                family_friendly=True,
                safety_score_base=9,
                weather_sensitive=False,
                bad_weather_types=[],
                rating=p.get("rating"),
                user_rating_count=p.get("userRatingCount")
            )
        )
    return places

async def rank_food(city: str, weather: Weather, check_only: bool = False) -> Optional[List[Place]]:
    query = f"Best popular restaurants in {city}"
    # Fetch exactly 15 restaurants
    raw_places = await search_google_places(query, max_results=15, check_only=check_only)
    
    if raw_places is None:
        return None

    PRICE_LEVEL_MAP = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 200,
        "PRICE_LEVEL_MODERATE": 600,
        "PRICE_LEVEL_EXPENSIVE": 1200,
        "PRICE_LEVEL_VERY_EXPENSIVE": 2500,
    }

    places = []
    for i, p in enumerate(raw_places):
        location = p.get("location", {})
        lat = location.get("latitude", 0.0)
        lng = location.get("longitude", 0.0)
        
        place_id = p.get("id", f"f{i}_{city}")
        photo_name = None
        photos = p.get("photos", [])
        if photos:
            photo_name = photos[0].get("name") or None
            
        price_level = p.get("priceLevel", "")
        estimated_cost = PRICE_LEVEL_MAP.get(price_level, 400) # 400 fallback
            
        places.append(
            Place(
                id=place_id,
                photo_name=photo_name,
                name=p.get("displayName", {}).get("text", "Unknown Restaurant"),
                category=(p.get("primaryType") or "restaurant").replace("_", " ").title(),
                coordinates=(lat, lng),
                entry_fee=estimated_cost,
                visit_duration_hours=1.5,
                safe_hours=(8, 23),
                crowd_estimate=CrowdLevel.MEDIUM,
                family_friendly=True,
                safety_score_base=10,
                weather_sensitive=False,
                bad_weather_types=[],
                rating=p.get("rating"),
                user_rating_count=p.get("userRatingCount")
            )
        )
    return places

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def rank_hotels(city: str, trip: TripState, check_only: bool = False) -> Optional[List[Hotel]]:
    # Use real live hotels api
    check_in = trip.start_date.strftime("%Y-%m-%d") if trip and trip.start_date else None
    check_out = trip.end_date.strftime("%Y-%m-%d") if trip and trip.end_date else None
    
    hotels = await search_live_hotels(city, check_in_date=check_in, check_out_date=check_out, check_only=check_only)
    
    if hotels and trip and trip.itinerary:
        places = []
        for daily_plan in trip.itinerary:
            if daily_plan.places:
                places.extend(daily_plan.places)
                
        if places:
            avg_lat = sum(p.coordinates[0] for p in places) / len(places)
            avg_lon = sum(p.coordinates[1] for p in places) / len(places)
            hotels.sort(key=lambda h: haversine(h.coordinates[0], h.coordinates[1], avg_lat, avg_lon))
            
    return hotels
