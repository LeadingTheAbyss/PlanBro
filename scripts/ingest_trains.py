import asyncio
import os
import httpx
import json
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def fetch_json(url):
    print(f"Downloading {url}...")
    async with httpx.AsyncClient() as client:
        res = await client.get(url, timeout=30.0)
        res.raise_for_status()
        return res.json()

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if "channel_binding=require" in db_url:
        db_url = db_url.replace("&channel_binding=require", "").replace("?channel_binding=require", "")
        
    conn = await asyncpg.connect(db_url, timeout=10.0)
    print("Connected to DB.")
    
    # 1. Fetch DataMeet JSONs
    base_url = "https://raw.githubusercontent.com/datameet/railways/master"
    try:
        stations_data = await fetch_json(f"{base_url}/stations.json")
        trains_data = await fetch_json(f"{base_url}/trains.json")
        schedules_data = await fetch_json(f"{base_url}/schedules.json")
    except Exception as e:
        print(f"Failed to fetch datameet jsons: {e}")
        return

    # 2. Ingest Stations (TransitStop)
    print("Ingesting stations...")
    for feature in stations_data.get("features", []):
        props = feature.get("properties", {})
        code = props.get("code")
        name = props.get("name", "")
        geom = feature.get("geometry") or {}
        coords = geom.get("coordinates", [0, 0])
        if not code: continue
        
        await conn.execute('''
            INSERT INTO "TransitStop" (stop_id, stop_name, lat, lon, transport_type)
            VALUES ($1, $2, $3, $4, 'TRAIN')
            ON CONFLICT (stop_id) DO NOTHING
        ''', code, name, coords[1], coords[0])
        
    # 3. Ingest Routes & Calendars & Trips
    print("Ingesting routes and schedules...")
    # Mocking calendar (Daily) for simplicity, though real GTFS uses RailRadar CSV
    cal_id = "SVC-TRAIN-DAILY"
    await conn.execute('''
        INSERT INTO "TransitCalendar" (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
        VALUES ($1, true, true, true, true, true, true, true)
        ON CONFLICT (service_id) DO NOTHING
    ''', cal_id)
    
    # trains.json
    for feature in trains_data.get("features", []):
        props = feature.get("properties", {})
        t_num = props.get("number")
        t_name = props.get("name")
        if not t_num: continue
        
        route_id = f"ROUTE-{t_num}"
        await conn.execute('''
            INSERT INTO "TransitRoute" (route_id, short_name, long_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (route_id) DO NOTHING
        ''', route_id, str(t_num), str(t_name))
        
        trip_id = f"TRIP-{t_num}"
        await conn.execute('''
            INSERT INTO "TransitTrip" (trip_id, route_id, service_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (trip_id) DO NOTHING
        ''', trip_id, route_id, cal_id)
        
    # schedules.json (stop times)
    print("Ingesting stop times (this may take a moment)...")
    for row in schedules_data:
        t_num = row.get("train_number")
        s_code = row.get("station_code")
        seq = int(row.get("seq", 1))
        arr = row.get("arrival")
        dep = row.get("departure")
        day = int(row.get("day", 1)) - 1  # 1-indexed to 0-indexed day_offset
        
        if not t_num or not s_code or arr == "None" or dep == "None": continue
        
        # GTFS >24h normalization
        arr_hr, arr_min = map(int, arr.split(':')[:2])
        if arr_hr >= 24:
            arr_hr -= 24
            day += 1
            arr = f"{arr_hr:02d}:{arr_min:02d}"
            
        dep_hr, dep_min = map(int, dep.split(':')[:2])
        if dep_hr >= 24:
            dep_hr -= 24
            dep = f"{dep_hr:02d}:{dep_min:02d}"
            
        try:
            await conn.execute('''
                INSERT INTO "TransitStopTime" (trip_id, stop_id, arrival_time, departure_time, stop_sequence, day_offset)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (trip_id, stop_sequence) DO NOTHING
            ''', f"TRIP-{t_num}", s_code, arr[:5], dep[:5], seq, day)
        except asyncpg.exceptions.ForeignKeyViolationError:
            # Station might be missing from stations.json, skip
            pass
            
    await conn.close()
    print("Train ETL complete!")

if __name__ == "__main__":
    asyncio.run(main())
