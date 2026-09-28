import asyncio
import os
import math
import uuid
import random
import asyncpg
from dotenv import load_dotenv

load_dotenv()

TIER_1_CITIES = [
    {"name": "Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946},
    {"name": "Lucknow", "lat": 26.8467, "lon": 80.9462},
    {"name": "Chandigarh", "lat": 30.7333, "lon": 76.7794}
]

TIER_2_CITIES = [
    {"name": "Patiala", "lat": 30.3398, "lon": 76.3869},
    {"name": "Agra", "lat": 27.1767, "lon": 78.0081},
    {"name": "Varanasi", "lat": 25.3176, "lon": 82.9739}
]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if "channel_binding=require" in db_url:
        db_url = db_url.replace("&channel_binding=require", "").replace("?channel_binding=require", "")
        
    conn = await asyncpg.connect(db_url, timeout=10.0)
    print("Connected to DB.")
    
    # 1. Ensure Stops Exist
    all_cities = TIER_1_CITIES + TIER_2_CITIES
    for city in all_cities:
        stop_id = f"BUS-{city['name'].upper()}"
        await conn.execute('''
            INSERT INTO "TransitStop" (stop_id, stop_name, lat, lon, transport_type)
            VALUES ($1, $2, $3, $4, 'BUS')
            ON CONFLICT (stop_id) DO NOTHING
        ''', stop_id, city['name'], city['lat'], city['lon'])
    
    # 2. Synthesize Routes
    # We will generate routes between all cities
    for i, c1 in enumerate(all_cities):
        for j, c2 in enumerate(all_cities):
            if i == j: continue
            
            dist = haversine(c1['lat'], c1['lon'], c2['lat'], c2['lon'])
            if dist > 1500: continue # Bus too long
            
            duration_hrs = dist / 60.0
            
            # Create a Route
            route_id = f"ROUTE-{c1['name'].upper()}-{c2['name'].upper()}"
            await conn.execute('''
                INSERT INTO "TransitRoute" (route_id, short_name, long_name)
                VALUES ($1, $2, $3)
                ON CONFLICT (route_id) DO NOTHING
            ''', route_id, "Synthesized Bus", f"{c1['name']} to {c2['name']}")
            
            # Create a Calendar (Daily)
            service_id = f"SVC-DAILY-{route_id}"
            await conn.execute('''
                INSERT INTO "TransitCalendar" (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
                VALUES ($1, true, true, true, true, true, true, true)
                ON CONFLICT (service_id) DO NOTHING
            ''', service_id)
            
            # Create a Trip (Late evening departure)
            trip_id = f"TRIP-{route_id}-01"
            await conn.execute('''
                INSERT INTO "TransitTrip" (trip_id, route_id, service_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (trip_id) DO NOTHING
            ''', trip_id, route_id, service_id)
            
            # Stop Times
            # Departure at 21:00
            dep_hour = 21
            arr_hour = (dep_hour + duration_hrs)
            day_offset = int(arr_hour // 24)
            arr_h = int(arr_hour % 24)
            arr_m = int((arr_hour % 1) * 60)
            
            # Origin Stop
            await conn.execute('''
                INSERT INTO "TransitStopTime" (trip_id, stop_id, arrival_time, departure_time, stop_sequence, day_offset)
                VALUES ($1, $2, $3, $4, 1, 0)
                ON CONFLICT (trip_id, stop_sequence) DO NOTHING
            ''', trip_id, f"BUS-{c1['name'].upper()}", "21:00", "21:00")
            
            # Dest Stop
            await conn.execute('''
                INSERT INTO "TransitStopTime" (trip_id, stop_id, arrival_time, departure_time, stop_sequence, day_offset)
                VALUES ($1, $2, $3, $4, 2, $5)
                ON CONFLICT (trip_id, stop_sequence) DO NOTHING
            ''', trip_id, f"BUS-{c2['name'].upper()}", f"{arr_h:02d}:{arr_m:02d}", f"{arr_h:02d}:{arr_m:02d}", day_offset)

    await conn.close()
    print("Successfully synthesized bus routes in GTFS tables.")

if __name__ == "__main__":
    asyncio.run(main())
