import httpx
import math
import asyncio
from typing import Dict, Any, List
from datetime import datetime, timedelta
from models.entities import TransportOption
from models.enums import TransportType

import urllib.parse

_GEOCODE_CACHE: Dict[str, Dict[str, float]] = {}
_GEOCODE_LOCK = None

async def get_coordinates(city_name: str) -> Dict[str, float]:
    global _GEOCODE_LOCK
    if _GEOCODE_LOCK is None:
        _GEOCODE_LOCK = asyncio.Lock()
    """Dynamically fetch coordinates using Open-Meteo API with in-memory caching."""
    cache_key = city_name.lower().strip()
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    async with _GEOCODE_LOCK:
        # Check again in case another task fetched it while we were waiting
        if cache_key in _GEOCODE_CACHE:
            return _GEOCODE_CACHE[cache_key]
            
        url = "https://geocoding-api.open-meteo.com/v1/search"
        params = {"name": city_name, "count": 1, "language": "en", "format": "json"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=3.0)
                response.raise_for_status()
                data = response.json()
                results = data.get("results")
                if results and len(results) > 0:
                    coords = {"lat": float(results[0]["latitude"]), "lng": float(results[0]["longitude"])}
                    _GEOCODE_CACHE[cache_key] = coords
                    return coords
        except Exception as e:
            print(f"[Warning] Failed to geocode {city_name} via open-meteo: {e}")
            
    return {}

async def calculate_cab_fare(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float
) -> Dict[str, Any]:
    """
    Calculates exact driving distance using OSRM and applies 2026 Indian Cab Math.
    """
    # OSRM expects coordinates in "longitude,latitude" order
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=false"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=4.0)
            response.raise_for_status()
            data = response.json()

            if "routes" not in data or not data["routes"]:
                return {"status": "error", "message": "No route found."}

            route = data["routes"][0]
            distance_meters = route.get("distance")
            raw_duration = route.get("duration")
            
            if distance_meters is None or raw_duration is None:
                return {"status": "error", "message": "Distance or duration missing in response."}
                
            # OSRM calculates time at free-flow speeds. 
            # Implement dynamic time-of-day traffic multipliers for realistic Indian traffic
            from datetime import datetime, timezone, timedelta
            
            ist = timezone(timedelta(hours=5, minutes=30))
            current_time = datetime.now(ist).time()
            hour = current_time.hour
            
            # Base multiplier for typical city driving vs highway empty roads
            traffic_multiplier = 1.2 
            
            if 8 <= hour < 11:
                traffic_multiplier = 2.0  # Morning Peak (Office commute)
            elif 17 <= hour < 21:
                traffic_multiplier = 2.4  # Evening Peak (Heavy traffic)
            elif 11 <= hour < 17:
                traffic_multiplier = 1.5  # Mid-day moderate traffic
            elif 21 <= hour < 23:
                traffic_multiplier = 1.3  # Late evening tapering
            else:
                traffic_multiplier = 1.0  # Night / Early Morning free flow
                
            duration_seconds = raw_duration * traffic_multiplier
                
            distance_km = round(distance_meters / 1000.0, 2)
            duration_hours = round(duration_seconds / 3600.0, 1)

            # --- 2026 Advanced Cab Pricing Math ---
            
            # 1. Minimum billable distance per day (Standard India Policy)
            min_billable_km = 250.0
            billable_distance = max(distance_km, min_billable_km)
            
            # 2. Base Rates (2026)
            rates = {
                "hatchback": 12.0,
                "sedan": 15.0,
                "suv": 22.0
            }
            
            # 3. Driver Allowance (₹400 per day)
            # Assuming 1 calendar day if < 12 hrs, otherwise 2 days for extreme distances
            days = 2 if duration_hours > 12 else 1
            total_driver_allowance = 400.0 * days
            
            # 4. Estimated Tolls (₹2.5 per actual km)
            tolls = distance_km * 2.5
            
            # 5. GST (5% on Base + Driver Allowance)
            gst_rate = 0.05
            
            fares = {}
            for vehicle, rate in rates.items():
                base_charge = billable_distance * rate
                subtotal = base_charge + total_driver_allowance
                gst = subtotal * gst_rate
                total_fare = subtotal + gst + tolls
                fares[vehicle] = round(total_fare, 2)

            return {
                "status": "success",
                "distance_km": distance_km,
                "duration_hours": duration_hours,
                "fares": fares
            }

    except Exception as e:
        return {"status": "error", "message": str(e)}

async def search_live_cabs(source_city: str, dest_city: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live cabs (via OSRM + Nominatim): {source_city} -> {dest_city} on {date}...")
    
    source_coords, dest_coords = await asyncio.gather(
        get_coordinates(source_city),
        get_coordinates(dest_city)
    )
    
    if not source_coords or not dest_coords:
        print(f"[Warning] Could not resolve coordinates for {source_city} or {dest_city}. Using fallback math.")
        fare_data = {"status": "error", "message": "Geocoding failed"}
    else:
        fare_data = await calculate_cab_fare(
            source_coords["lat"], source_coords["lng"],
            dest_coords["lat"], dest_coords["lng"]
        )
    
    if fare_data["status"] == "error":
        print(f"[Warning] OSRM/Geocode failed: {fare_data.get('message')}. Using fallback 2026 Cab Math.")
        # Fallback math (assume 350km, 7 hours)
        distance_km = 350.0
        duration_hours = 7.0
        rates = {"hatchback": 12.0, "sedan": 15.0, "suv": 22.0}
        fares = {}
        for vehicle, rate in rates.items():
            base = distance_km * rate
            driver = 400.0 * 1
            gst = (base + driver) * 0.05
            tolls = distance_km * 2.5
            fares[vehicle] = round(base + driver + gst + tolls, 2)
        
        fare_data = {
            "status": "success",
            "distance_km": distance_km,
            "duration_hours": duration_hours,
            "fares": fares
        }
        
    duration_hours = fare_data["duration_hours"]
    
    try:
        base_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        base_date = datetime.now()
        
    dep_time = base_date.replace(hour=8, minute=0) # Assume 8 AM departure
    arr_time = dep_time + timedelta(hours=duration_hours)
    
    fares = fare_data["fares"]
    
    options = [
        TransportOption(
            id=f"cab_hatchback_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fares["hatchback"],
            safety_score=6,
            comfort_score=5,
            provider="Hatchback (Mini)"
        ),
        TransportOption(
            id=f"cab_sedan_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fares["sedan"],
            safety_score=7,
            comfort_score=7,
            provider="Sedan (Dzire/Etios)"
        ),
        TransportOption(
            id=f"cab_suv_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fares["suv"],
            safety_score=8,
            comfort_score=9,
            provider="SUV (Innova/Ertiga)"
        )
    ]
    return options
