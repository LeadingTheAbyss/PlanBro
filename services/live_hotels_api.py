import os
import httpx
from typing import List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import Hotel
from services.db import get_db_connection
import uuid
import json
from services.image_service import _cache_get, _cache_set
from services.cache_logger import log_cache_event

load_dotenv()

# API Key Rotation State
_serpapi_usage_count = 0
_current_serpapi_index = 0

def get_serpapi_key() -> str:
    global _serpapi_usage_count, _current_serpapi_index
    
    keys = [
        "SERPAPI_HOTELS_KEY", "SERPAPI_HOTELS_KEY2", "SERPAPI_HOTELS_KEY3",
        "SERPAPI_HOTELS_KEY4", "SERPAPI_HOTELS_KEY5", "SERPAPI_HOTELS_KEY6"
    ]
    
    available_keys = [os.getenv(k) for k in keys if os.getenv(k)]
    if not available_keys:
        raise ValueError("\n[ERROR] MISSING API KEY: Please put your SERPAPI_HOTELS_KEY in the .env file!")
        
    # Rotate key after 50 calls
    if _serpapi_usage_count >= 50:
        _serpapi_usage_count = 0
        _current_serpapi_index = (_current_serpapi_index + 1) % len(available_keys)
        
    if _current_serpapi_index >= len(available_keys):
        _current_serpapi_index = 0
        
    _serpapi_usage_count += 1
    return available_keys[_current_serpapi_index]

async def search_live_hotels(city: str, check_in_date: str = None, check_out_date: str = None, check_only: bool = False) -> Optional[List[Hotel]]:
    print(f"\n[API Call] Fetching live hotels (via SerpApi) for: {city}...")
    
    try:
        api_key = get_serpapi_key()
        
        # Default dates if none provided (e.g. tomorrow to day after)
        if not check_in_date:
            check_in_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        if not check_out_date:
            check_out_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
            
        cache_key = f"hotels_{city.upper()}_{check_in_date}_{check_out_date}"
        
        # --- Check Redis Cache ---
        try:
            cached_str = await _cache_get(cache_key)
            if cached_str:
                log_cache_event("LiveHotels", "HIT", "Redis", cache_key)
                cached_data = json.loads(cached_str)
                return [Hotel(**h) for h in cached_data]
        except Exception as e:
            print(f"[Warning] Redis cache check failed: {e}")
            
        # --- Check DB Cache ---
        try:
            conn = await get_db_connection()
            rows = await conn.fetch('SELECT hotel_id, name, price, rating, lat, lon, image_url FROM "Hotel" WHERE city = $1 AND check_in_date = $2 AND check_out_date = $3', city.upper(), check_in_date, check_out_date)
            await conn.close()
            
            if rows:
                log_cache_event("LiveHotels", "HIT", "NeonDB", cache_key)
                hotels = []
                for r in rows:
                    comfort = min(10, int(r['rating'] * 2))
                    safety = min(10, int(r['rating'] * 2) + 1)
                    hotels.append(Hotel(
                        id=r['hotel_id'],
                        name=r['name'],
                        photo_name=r['image_url'],
                        coordinates=(r['lat'], r['lon']),
                        price_per_night=r['price'],
                        comfort_score=comfort,
                        safety_score=safety,
                        rating=r['rating']
                    ))
                sorted_cache = sorted(hotels, key=lambda x: x.price_per_night)
                
                # Save to Redis for next time
                try:
                    await _cache_set(cache_key, json.dumps([h.model_dump() for h in sorted_cache]), ttl_seconds=86400)
                except:
                    pass
                    
                return sorted_cache
        except Exception as e:
            print(f"[Warning] Hotel DB cache check failed: {e}")
        # --- End DB Cache Check ---
        
        if check_only:
            print(f"[HotelCache] check_only=True, cache miss for {city}, returning None")
            return None

        params = {
            "engine": "google_hotels",
            "q": city,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "currency": "INR",
            "hl": "en",
            "gl": "in",
            "api_key": api_key
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get("https://serpapi.com/search", params=params, timeout=15.0)
            response.raise_for_status()
            
            data = response.json()
            
        properties = data.get("properties", [])
        
        hotels = []
        for item in properties[:10]: # Take top 10 hotels
            name = item.get("name", "Unknown Hotel")
            
            # Safely extract price
            rate_info = item.get("rate_per_night", {})
            try:
                price_str = rate_info.get("lowest", "2500").replace("₹", "").replace(",", "").strip()
                price = float(price_str)
            except Exception:
                price = 2500.0
                
            # Safely extract rating
            rating = float(item.get("overall_rating", 4.0))
            
            # Safely extract coordinates
            gps = item.get("gps_coordinates", {})
            lat = gps.get("latitude", 0.0)
            lon = gps.get("longitude", 0.0)
            
            # Safely extract image
            images = item.get("images", [])
            photo_url = images[0].get("original_image") if images else None
            
            # Generate realistic pseudo-scores
            comfort = min(10, int(rating * 2))
            safety = min(10, int(rating * 2) + 1)
            
            # Fallback to Google Places for missing images
            if not photo_url:
                try:
                    from services.google_places_api import search_google_places
                    # Await the google places search to fetch photos
                    places_res = await search_google_places(f"{name} {city}", max_results=1)
                    if places_res and places_res[0].get("photos"):
                        photo_url = places_res[0]["photos"][0].get("name")
                except Exception as e:
                    print(f"[Warning] Failed to fetch fallback hotel image for {name}: {e}")
            
            hotels.append(Hotel(
                id=item.get("property_token", name),
                name=name,
                photo_name=photo_url,
                coordinates=(lat, lon),
                price_per_night=price,
                comfort_score=comfort,
                safety_score=safety,
                rating=round(rating, 1)
            ))
            
        sorted_hotels = sorted(hotels, key=lambda x: x.price_per_night)
        
        # --- Save to DB Cache ---
        if sorted_hotels:
            try:
                conn = await get_db_connection()
                for h in sorted_hotels:
                    db_id = uuid.uuid4().hex
                    await conn.execute('''
                        INSERT INTO "Hotel" (id, hotel_id, city, check_in_date, check_out_date, name, price, rating, lat, lon, image_url)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (hotel_id, city, check_in_date, check_out_date) DO UPDATE SET image_url = EXCLUDED.image_url
                    ''', db_id, h.id, city.upper(), check_in_date, check_out_date, h.name, h.price_per_night, h.rating, h.coordinates[0], h.coordinates[1], h.photo_name)
                await conn.close()
                
                # Save to Redis
                try:
                    await _cache_set(cache_key, json.dumps([h.model_dump() for h in sorted_hotels]), ttl_seconds=86400)
                except Exception as e:
                    print(f"[Warning] Failed to cache hotels to Redis: {e}")
                    
            except Exception as e:
                print(f"[Warning] Failed to cache hotels to DB: {e}")
                
        return sorted_hotels
        
    except Exception as e:
        log_cache_event("LiveHotels", "MISS", "Both", cache_key, f"Error fetching via SerpApi: {e}")
        print(f"Error fetching live hotels via SerpApi: {e}")
        return []
