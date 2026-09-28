import os
import json
import math
import httpx
import urllib.parse
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import random
import heapq
from models.entities import TransportOption
from models.enums import TransportType
from services.dgca_pdf_parser import CITY_TO_IATA
from services.db import get_db_connection
import uuid

IATA_TO_CITY = {v: k.title() for k, v in CITY_TO_IATA.items()}

# Priority mapping: destinations that should always route through a well-connected hub.
major_airports = {
    # Himachal Pradesh / North India mountains
    "manali":       {"iata": "IXC", "city": "Chandigarh"},
    "kullu":        {"iata": "IXC", "city": "Chandigarh"},
    "shimla":       {"iata": "IXC", "city": "Chandigarh"},
    "kasauli":      {"iata": "IXC", "city": "Chandigarh"},
    "dharamshala":  {"iata": "ATQ", "city": "Amritsar"},
    "mcleod ganj":  {"iata": "ATQ", "city": "Amritsar"},
    # Northeast / Sikkim
    "gangtok":      {"iata": "IXB", "city": "Bagdogra"},
    "darjeeling":   {"iata": "IXB", "city": "Bagdogra"},
    "sikkim":       {"iata": "IXB", "city": "Bagdogra"},
    # South India hills
    "munnar":       {"iata": "COK", "city": "Kochi"},
    "ooty":         {"iata": "CJB", "city": "Coimbatore"},
    "kodaikanal":   {"iata": "IXM", "city": "Madurai"},
    "coorg":        {"iata": "IXE", "city": "Mangalore"},
    "wayanad":      {"iata": "COK", "city": "Kochi"},
    # Uttarakhand
    "rishikesh":    {"iata": "DED", "city": "Dehradun"},
    "mussoorie":    {"iata": "DED", "city": "Dehradun"},
    "auli":         {"iata": "DED", "city": "Dehradun"},
    "valley of flowers": {"iata": "DED", "city": "Dehradun"},
    "leh":          {"iata": "IXC", "city": "Chandigarh"},
    "ladakh":       {"iata": "IXC", "city": "Chandigarh"},
}

_AIRPORT_COORDS_CACHE = None

def _get_all_airport_coords() -> Dict[str, Any]:
    global _AIRPORT_COORDS_CACHE
    if _AIRPORT_COORDS_CACHE is not None:
        return _AIRPORT_COORDS_CACHE
    coords_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "airport_coords.json")
    try:
        with open(coords_path, "r") as f:
            _AIRPORT_COORDS_CACHE = json.load(f)
    except Exception as e:
        print(f"[Warning] Could not load airport_coords.json: {e}")
        _AIRPORT_COORDS_CACHE = {}
    return _AIRPORT_COORDS_CACHE

def _parse_days_of_operation(days_str: str) -> List[int]:
    """Parses a days of operation string into a list of Python weekday integers (0 = Mon, 6 = Sun)."""
    days = []
    days_str = str(days_str).strip()
    if not days_str or days_str.lower() in ['nan', 'none']:
        return [0, 1, 2, 3, 4, 5, 6]
    
    for i in range(1, 8):
        if str(i) in days_str:
            days.append(i - 1)
    return days if days else [0, 1, 2, 3, 4, 5, 6]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance in km between two lat/lon coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


from services.osrm_cab_api import get_coordinates


def _get_nearest_airports(lat: float, lon: float, limit: int = 3) -> List[Dict[str, Any]]:
    """Find the nearest IATA airports to the given coordinates using airport_coords.json."""
    airport_coords = _get_all_airport_coords()
    if not airport_coords:
        return []

    airports = []
    for iata, info in airport_coords.items():
        dist = _haversine(lat, lon, info["lat"], info["lon"])
        airports.append({
            "iata": iata,
            "city": info.get("city", iata),
            "lat": info["lat"],
            "lon": info["lon"],
            "distance_km": dist,
        })
    airports.sort(key=lambda x: x["distance_km"])
    return airports[:limit]


async def _fetch_flights_for_iata(origin_iata: str, dest_iata: str, date: str, check_only: bool, disable_fallback: bool = False) -> List[TransportOption]:
    """Core flight fetcher: NeonDB DGCA first, then FlightAPI fallback. Returns a list (may be empty)."""
    options = []
    try:
        base_date = datetime.strptime(date, "%Y-%m-%d")
        target_weekday = base_date.weekday()
    except ValueError:
        base_date = datetime.now()
        target_weekday = base_date.weekday()

    try:
        target_day_str = str(target_weekday + 1)
        conn = await get_db_connection()
        rows = await conn.fetch(
            'SELECT flight_no, origin, dest, airline, freq, dep_time, arr_time FROM "Flight" WHERE origin = $1 AND dest = $2 AND freq LIKE \'%\' || $3 || \'%\'',
            origin_iata.upper(), dest_iata.upper(), target_day_str
        )
        cached_flights = [
            {"flight_no": r['flight_no'], "origin": r['origin'], "dest": r['dest'],
             "airline": r['airline'], "freq": r['freq'], "dep_time": r['dep_time'], "arr_time": r['arr_time']}
            for r in rows
        ]
        await conn.close()
    except Exception as e:
        print(f"[DB Error] Failed to fetch flights from NeonDB: {e}")
        cached_flights = []

    for idx, flight in enumerate(cached_flights):
        if flight["origin"].upper() == origin_iata.upper() and flight["dest"].upper() == dest_iata.upper():
            days_of_op = _parse_days_of_operation(flight["freq"])
            if target_weekday not in days_of_op:
                continue
            dep_time_raw = flight["dep_time"]
            arr_time_raw = flight["arr_time"]
            try:
                if len(dep_time_raw) >= 4 and ':' not in dep_time_raw:
                    dep_time_raw = f"{dep_time_raw[:2]}:{dep_time_raw[2:4]}"
                elif len(dep_time_raw) > 5:
                    dep_time_raw = dep_time_raw[:5]
                if len(arr_time_raw) >= 4 and ':' not in arr_time_raw:
                    arr_time_raw = f"{arr_time_raw[:2]}:{arr_time_raw[2:4]}"
                elif len(arr_time_raw) > 5:
                    arr_time_raw = arr_time_raw[:5]
                dep_dt = datetime.strptime(f"{date} {dep_time_raw}", "%Y-%m-%d %H:%M")
                arr_dt = datetime.strptime(f"{date} {arr_time_raw}", "%Y-%m-%d %H:%M")
                if arr_dt < dep_dt:
                    arr_dt += timedelta(days=1)
                duration_hours = (arr_dt - dep_dt).total_seconds() / 3600.0
            except Exception as e:
                print(f"[DGCA Error] Time parsing failed for {flight['flight_no']}: {e}")
                continue
            price = 3000 + (duration_hours * 1500)
            options.append(TransportOption(
                id=f"dgca_fl_{idx}",
                type=TransportType.FLIGHT,
                departure=dep_dt,
                arrival=arr_dt,
                duration_hours=duration_hours,
                price=float(round(price, -2)),
                safety_score=9,
                comfort_score=8,
                provider=f"{flight['airline']} {flight['flight_no']} ({origin_iata} -> {dest_iata}) *"
            ))

    return options

async def _find_time_expanded_routes(sa_candidates: List[Dict], sb_candidates: List[Dict], date: str) -> List[Tuple[TransportOption, Optional[Dict], Optional[Dict]]]:
    sa_iatas = [c["iata"] for c in sa_candidates]
    sb_iatas = [c["iata"] for c in sb_candidates]
    
    sa_map = {c["iata"]: c for c in sa_candidates}
    sb_map = {c["iata"]: c for c in sb_candidates}
    
    try:
        base_date = datetime.strptime(date, "%Y-%m-%d")
        target_weekday = base_date.weekday()
    except ValueError:
        base_date = datetime.now()
        target_weekday = base_date.weekday()
        
    target_day_str = str(target_weekday + 1)

    try:
        conn = await get_db_connection()
        # Depth 1: Direct Flights
        direct_rows = await conn.fetch('''
            SELECT flight_no, origin, dest, airline, dep_time, arr_time 
            FROM "Flight" 
            WHERE origin = ANY($1::text[]) 
              AND dest = ANY($2::text[])
              AND freq LIKE '%' || $3 || '%'
        ''', sa_iatas, sb_iatas, target_day_str)
        
        # Depth 2: 1-Stop Flights. Leg1 must run on the search date (filtered here);
        # leg2 is intentionally NOT filtered by the same weekday — its own days of
        # operation are resolved per-candidate in Python below, since a real hub
        # connection can depart the day (or two) after leg1 lands (e.g. leg1 runs
        # Tue/Thu/Sat, leg2 runs Mon/Wed/Fri/Sun — no shared weekday, but a valid
        # overnight connection still exists).
        one_stop_rows = await conn.fetch('''
            SELECT
                f1.flight_no AS leg1_flight, f1.origin AS leg1_origin, f1.dest AS hub, f1.dep_time AS leg1_dep, f1.arr_time AS leg1_arr, f1.airline AS leg1_airline,
                f2.flight_no AS leg2_flight, f2.dest AS leg2_dest, f2.dep_time AS leg2_dep, f2.arr_time AS leg2_arr, f2.airline AS leg2_airline, f2.freq AS leg2_freq
            FROM "Flight" f1
            INNER JOIN "Flight" f2 ON f1.dest = f2.origin
            WHERE f1.origin = ANY($1::text[])
              AND f2.dest = ANY($2::text[])
              AND f1.freq LIKE '%' || $3 || '%'
        ''', sa_iatas, sb_iatas, target_day_str)
        await conn.close()
    except Exception as e:
        print(f"[DB Error] Failed to fetch time-expanded flights via SQL JOIN: {e}")
        return []

    def get_drive_time(distance_km: float) -> float:
        return distance_km / 40.0
        
    def parse_time(time_raw: str, travel_date: str) -> datetime:
        if len(time_raw) >= 4 and ':' not in time_raw:
            time_raw = f"{time_raw[:2]}:{time_raw[2:4]}"
        elif len(time_raw) > 5:
            time_raw = time_raw[:5]
        return datetime.strptime(f"{travel_date} {time_raw}", "%Y-%m-%d %H:%M")

    all_raw_options = []

    # Process Direct Flights
    for r in direct_rows:
        try:
            dep_dt = parse_time(r["dep_time"], date)
            arr_dt = parse_time(r["arr_time"], date)
            if arr_dt < dep_dt:
                arr_dt += timedelta(days=1)
            duration_hours = (arr_dt - dep_dt).total_seconds() / 3600.0
            price = 3000 + (duration_hours * 1500)
            
            sa_cand = sa_map[r["origin"]]
            sb_cand = sb_map[r["dest"]]

            drive_a = get_drive_time(sa_cand["distance_km"])
            drive_b = get_drive_time(sb_cand["distance_km"])
            total_duration = drive_a + duration_hours + drive_b

            opt = TransportOption(
                id=f"direct_{r['flight_no']}",
                type=TransportType.FLIGHT,
                departure=dep_dt,
                arrival=arr_dt,
                duration_hours=round(duration_hours, 1),
                price=round(price, 2),
                safety_score=9,
                comfort_score=8,
                provider=f"{r['airline']} {r['flight_no']} | {sa_cand['city'].title()} ({r['origin']}) → {sb_cand['city'].title()} ({r['dest']}) *"
            )
            all_raw_options.append((opt, sa_cand if not sa_cand.get("is_direct") else None, sb_cand if not sb_cand.get("is_direct") else None, total_duration, False))
        except Exception:
            continue

    # Process 1-Stop Flights.
    # Layover tiers: a "convenient" same/next-day connection (30 min - 8h) is
    # preferred, but a longer/overnight one (up to MAX_LAYOVER_HOURS) is still a
    # real, bookable itinerary — so we keep it as a lower-priority fallback tier
    # instead of discarding it outright. That fallback is what actually kicks in
    # when a route's only hub connection has non-overlapping weekly schedules
    # (e.g. leg1 runs Tue/Thu/Sat, leg2 runs Mon/Wed/Fri/Sun).
    MIN_CONNECTION_MINUTES = 30
    CONVENIENT_LAYOVER_MAX_HOURS = 8.0
    MAX_LAYOVER_HOURS = 36.0
    MAX_LAYOVER_SEARCH_DAYS = 7  # weekly schedules repeat within 7 days

    for r in one_stop_rows:
        try:
            l1_dep = parse_time(r["leg1_dep"], date)
            l1_arr = parse_time(r["leg1_arr"], date)
            if l1_arr < l1_dep:
                l1_arr += timedelta(days=1)

            leg2_days = _parse_days_of_operation(r["leg2_freq"])

            # Find the earliest day on/after leg1's arrival on which leg2 actually
            # operates, with at least a minimum connection buffer. Leg2's days of
            # operation are independent of leg1's — this is what lets a real
            # overnight/next-day hub connection surface instead of being silently
            # dropped by a same-weekday-only match.
            l2_dep = None
            for day_offset in range(0, MAX_LAYOVER_SEARCH_DAYS + 1):
                candidate_date = l1_arr.date() + timedelta(days=day_offset)
                if candidate_date.weekday() not in leg2_days:
                    continue
                candidate_dep = parse_time(r["leg2_dep"], candidate_date.strftime("%Y-%m-%d"))
                if candidate_dep >= l1_arr + timedelta(minutes=MIN_CONNECTION_MINUTES):
                    l2_dep = candidate_dep
                    break
            if l2_dep is None:
                continue

            l2_arr = parse_time(r["leg2_arr"], l2_dep.strftime("%Y-%m-%d"))
            if l2_arr <= l2_dep:
                l2_arr += timedelta(days=1)

            layover_hours = (l2_dep - l1_arr).total_seconds() / 3600.0
            if layover_hours > MAX_LAYOVER_HOURS:
                continue
            is_overnight_layover = layover_hours > CONVENIENT_LAYOVER_MAX_HOURS

            l1_dur = (l1_arr - l1_dep).total_seconds() / 3600.0
            l2_dur = (l2_arr - l2_dep).total_seconds() / 3600.0

            l1_price = 3000 + (l1_dur * 1500)
            l2_price = 3000 + (l2_dur * 1500)
            total_price = l1_price + l2_price

            sa_cand = sa_map[r["leg1_origin"]]
            sb_cand = sb_map[r["leg2_dest"]]

            drive_a = get_drive_time(sa_cand["distance_km"])
            drive_b = get_drive_time(sb_cand["distance_km"])

            total_flight_time = l1_dur + layover_hours + l2_dur
            total_duration = drive_a + total_flight_time + drive_b

            hub = r["hub"]
            hub_city = IATA_TO_CITY.get(hub, hub)
            layover_note = f" (Overnight layover in {hub_city}, ~{round(layover_hours)}h)" if is_overnight_layover else ""
            provider_str = f"{r['leg1_airline']} {r['leg1_flight']} & {r['leg2_airline']} {r['leg2_flight']} | {sa_cand['city'].title()} ({r['leg1_origin']}) → {hub_city} ({hub}) → {sb_cand['city'].title()} ({r['leg2_dest']}){layover_note} *"

            opt = TransportOption(
                id=f"hub_{r['leg1_flight']}_{r['leg2_flight']}_{l2_dep.strftime('%Y%m%d')}",
                type=TransportType.FLIGHT,
                departure=l1_dep,
                arrival=l2_arr,
                duration_hours=round(total_flight_time, 1),
                price=round(total_price, 2),
                safety_score=8,
                comfort_score=7 if not is_overnight_layover else 5,
                provider=provider_str
            )
            all_raw_options.append((opt, sa_cand if not sa_cand.get("is_direct") else None, sb_cand if not sb_cand.get("is_direct") else None, total_duration, is_overnight_layover))
        except Exception:
            continue

    # Convenient options (direct + short-layover hub connections) always rank
    # ahead of overnight-layover ones, but overnight options are still included
    # rather than dropped — this is the fallback tier that actually shows up
    # when a route has few or no convenient options.
    all_raw_options.sort(key=lambda x: (x[4], x[3]))

    # Ensure uniqueness based on provider + departure
    seen = set()
    unique_options = []
    for o in all_raw_options:
        key = (o[0].provider, o[0].departure)
        if key not in seen:
            seen.add(key)
            unique_options.append((o[0], o[1], o[2]))

    return unique_options[:10]

async def search_live_flights(origin_city: str, dest_city: str, date: str, check_only: bool = False) -> Optional[List[TransportOption]]:
    try:
        return await _search_live_flights_impl(origin_city, dest_city, date, check_only)
    except Exception as e:
        import traceback
        with open("api_debug.txt", "w") as f:
            f.write(traceback.format_exc())
        raise e

async def _search_live_flights_impl(origin_city: str, dest_city: str, date: str, check_only: bool = False) -> Optional[List[TransportOption]]:
    """
    Main entry point. Accepts city names (not IATA codes).
    Resolves IATA codes from CITY_TO_IATA. If a city has no direct airport,
    finds the nearest airport and creates a Flight + Cab combo route.
    """
    from services.osrm_cab_api import calculate_cab_fare, get_coordinates
    import asyncio
    
    print(f"\n[DB Fetch] Searching database for flights: {origin_city} -> {dest_city} on {date}...")

    clean_origin = origin_city.upper().strip()
    clean_dest_lower = dest_city.lower().strip()
    clean_dest = dest_city.upper().strip()

    origin_iata_direct = CITY_TO_IATA.get(clean_origin)
    dest_iata_direct = CITY_TO_IATA.get(clean_dest)

    async def resolve_candidates(city: str, iata_direct: Optional[str]) -> List[Dict[str, Any]]:
        if iata_direct:
            ac = _get_all_airport_coords().get(iata_direct, {})
            return [{
                "iata": iata_direct,
                "city": city,
                "lat": ac.get("lat", 0.0),
                "lon": ac.get("lon", 0.0),
                "distance_km": 0.0,
                "is_direct": True
            }]
        coords = await get_coordinates(city)
        if coords:
            return _get_nearest_airports(coords["lat"], coords["lng"], limit=3)
        return []

    # Resolve both sides concurrently — when neither has a direct airport
    # mapping, this halves the geocoding latency instead of doing it serially.
    origin_candidates, dest_candidates = await asyncio.gather(
        resolve_candidates(origin_city, origin_iata_direct),
        resolve_candidates(dest_city, dest_iata_direct)
    )

    if not origin_candidates or not dest_candidates:
        print(f"[Warning] Could not resolve airports for '{origin_city}' or '{dest_city}'. No flights available.")
        return [] if not check_only else None

    all_raw_options = await _find_time_expanded_routes(origin_candidates, dest_candidates, date)
    
    # (External API Fallback removed as per user request)

    if check_only and not all_raw_options:
        return None

    # --- Post-process: bolt on cab leg for combo routes ---
    combo_options = []
    
    # We will cache the cab fares to avoid re-calling OSRM for the same city->airport pairs multiple times
    cab_fare_cache = {} # (from_lat, from_lon, to_lat, to_lon) -> fare_data

    # Only geocode the origin/destination city center if some option actually
    # needs a cab leg (i.e. resolved to a nearby, non-direct airport) — for the
    # common case of a direct-airport-to-direct-airport route, neither coord is
    # ever used below, so skip these calls entirely instead of geocoding for nothing.
    needs_dest_coords = any(nearest_dest for _, _, nearest_dest in all_raw_options)
    needs_origin_coords = any(nearest_origin for _, nearest_origin, _ in all_raw_options)

    dest_city_coords = None
    origin_city_coords = None
    if needs_dest_coords and needs_origin_coords:
        dest_city_coords, origin_city_coords = await asyncio.gather(
            get_coordinates(dest_city), get_coordinates(origin_city)
        )
    elif needs_dest_coords:
        dest_city_coords = await get_coordinates(dest_city)
    elif needs_origin_coords:
        origin_city_coords = await get_coordinates(origin_city)

    # Pre-calculate required cab routes to fetch concurrently
    cab_requests = set()
    for opt, nearest_origin, nearest_dest in all_raw_options:
        if nearest_dest and dest_city_coords:
            cab_requests.add((nearest_dest["lat"], nearest_dest["lon"], dest_city_coords["lat"], dest_city_coords["lng"]))
        if nearest_origin and origin_city_coords:
            cab_requests.add((origin_city_coords["lat"], origin_city_coords["lng"], nearest_origin["lat"], nearest_origin["lon"]))
            
    # Fetch cab fares concurrently
    if cab_requests:
        async def fetch_fare(req_key):
            res = await calculate_cab_fare(*req_key)
            return req_key, res
            
        tasks = [fetch_fare(req) for req in cab_requests]
        results = await asyncio.gather(*tasks)
        for req_key, res in results:
            cab_fare_cache[req_key] = res

    for opt, nearest_origin, nearest_dest in all_raw_options:
        try:
            cab_duration_hours = 0.0
            cab_price = 0.0
            cab_label = ""
            
            if nearest_dest and dest_city_coords:
                key = (nearest_dest["lat"], nearest_dest["lon"], dest_city_coords["lat"], dest_city_coords["lng"])
                fare = cab_fare_cache.get(key, {})
                
                if fare.get("status") == "success":
                    cab_duration_hours = fare["duration_hours"]
                    cab_price = fare["fares"]["sedan"]
                    cab_label = f"Cab to {dest_city.title()}"

            if nearest_origin and origin_city_coords:
                key = (origin_city_coords["lat"], origin_city_coords["lng"], nearest_origin["lat"], nearest_origin["lon"])
                fare = cab_fare_cache.get(key, {})
                
                if fare.get("status") == "success":
                    cab_duration_hours += fare["duration_hours"]
                    cab_price += fare["fares"]["sedan"]
                    if cab_label:
                        cab_label = f"Cab to {nearest_origin['city']} Airport + {cab_label}"
                    else:
                        cab_label = f"Cab to {nearest_origin['city']} Airport"

            if cab_price > 0:
                new_arrival = opt.arrival + timedelta(hours=cab_duration_hours)
                new_duration = opt.duration_hours + cab_duration_hours
                new_price = opt.price + cab_price
                
                # Format: Airline 123 | Origin (ORG) -> Dest (DST) *
                provider_parts = [p for p in opt.provider.split(" *") if p]
                base_str = provider_parts[0].strip()
                
                if " | " in base_str:
                    airline_part, route_part = base_str.split(" | ", 1)
                    if nearest_dest:
                        route_part += f" to {nearest_dest['city'].title()}"
                    new_provider = f"{airline_part} | {route_part} | + {cab_label} *"
                else:
                    flight_leg = base_str
                    if nearest_dest:
                        flight_leg += f" to {nearest_dest['city'].title()}"
                    new_provider = f"{flight_leg} | + {cab_label} *"

                combo_options.append(TransportOption(
                    id=f"fl_combo_{opt.id}",
                    type=TransportType.FLIGHT,
                    departure=opt.departure,
                    arrival=new_arrival,
                    duration_hours=new_duration,
                    price=round(new_price, 2),
                    price_breakdown={"Flight": round(opt.price, 2), "Cab": round(cab_price, 2)},
                    time_breakdown={"Flight": f"{int(opt.duration_hours)}h {int((opt.duration_hours % 1) * 60)}m", "Cab": f"{int(cab_duration_hours)}h {int((cab_duration_hours % 1) * 60)}m"},
                    safety_score=opt.safety_score,
                    comfort_score=opt.comfort_score,
                    provider=new_provider,
                ))
            else:
                combo_options.append(opt)
        except Exception as e:
            print(f"[Combo Error] Could not process cab leg for flight {opt.id}: {e}")
            combo_options.append(opt)

    return sorted(combo_options, key=lambda x: x.price)
