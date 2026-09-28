import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.environ.get("DATABASE_URL")
    if "channel_binding=require" in db_url:
        db_url = db_url.replace("&channel_binding=require", "").replace("?channel_binding=require", "")
        
    conn = await asyncpg.connect(db_url, timeout=10.0)
    print("Connected to DB.")
    
    # Fetch flat flights
    flights = await conn.fetch('SELECT * FROM "Flight"')
    if not flights:
        print("No flights in flat table to migrate.")
        await conn.close()
        return
        
    print(f"Migrating {len(flights)} flights to GTFS tables...")
    
    for f in flights:
        # Create Airports (Stops)
        await conn.execute('''
            INSERT INTO "TransitStop" (stop_id, stop_name, lat, lon, transport_type)
            VALUES ($1, $2, 0, 0, 'FLIGHT')
            ON CONFLICT (stop_id) DO NOTHING
        ''', f['origin'], f['origin'])
        
        await conn.execute('''
            INSERT INTO "TransitStop" (stop_id, stop_name, lat, lon, transport_type)
            VALUES ($1, $2, 0, 0, 'FLIGHT')
            ON CONFLICT (stop_id) DO NOTHING
        ''', f['dest'], f['dest'])
        
        # Route
        route_id = f"FLIGHT-{f['flight_no']}"
        await conn.execute('''
            INSERT INTO "TransitRoute" (route_id, short_name, long_name, agency_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (route_id) DO NOTHING
        ''', route_id, f['flight_no'], f"{f['origin']} to {f['dest']}", f['airline'])
        
        # Calendar based on freq string "1234567"
        freq = f['freq'] or ""
        cal_id = f"SVC-{route_id}"
        await conn.execute('''
            INSERT INTO "TransitCalendar" (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (service_id) DO NOTHING
        ''', cal_id, '1' in freq, '2' in freq, '3' in freq, '4' in freq, '5' in freq, '6' in freq, '7' in freq)
        
        # Trip
        # Flights can have multiple departures per day under same number? Usually unique time.
        trip_id = f"TRIP-{f['flight_no']}-{f['dep_time'].replace(':','')}"
        await conn.execute('''
            INSERT INTO "TransitTrip" (trip_id, route_id, service_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (trip_id) DO NOTHING
        ''', trip_id, route_id, cal_id)
        
        # Stop Times
        arr_hr, arr_min = map(int, f['arr_time'].split(':'))
        dep_hr, dep_min = map(int, f['dep_time'].split(':'))
        
        # Handle simple overnight flights
        day_offset = 1 if arr_hr < dep_hr else 0
        
        await conn.execute('''
            INSERT INTO "TransitStopTime" (trip_id, stop_id, arrival_time, departure_time, stop_sequence, day_offset)
            VALUES ($1, $2, $3, $4, 1, 0)
            ON CONFLICT (trip_id, stop_sequence) DO NOTHING
        ''', trip_id, f['origin'], f['dep_time'], f['dep_time'])
        
        await conn.execute('''
            INSERT INTO "TransitStopTime" (trip_id, stop_id, arrival_time, departure_time, stop_sequence, day_offset)
            VALUES ($1, $2, $3, $4, 2, $5)
            ON CONFLICT (trip_id, stop_sequence) DO NOTHING
        ''', trip_id, f['dest'], f['arr_time'], f['arr_time'], day_offset)

    await conn.close()
    print("Flight ETL complete!")

if __name__ == "__main__":
    asyncio.run(main())
