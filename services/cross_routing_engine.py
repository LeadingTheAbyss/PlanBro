import os
import json
import math
import asyncio
import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
from models.entities import TransportOption
from models.enums import TransportType
from services.db import get_db_connection
from services.image_service import _cache_get, _cache_set

try:
    import networkx as nx
except ImportError:
    nx = None
    logging.warning("NetworkX not installed. Cross-routing engine will not function.")

log = logging.getLogger(__name__)

TRANSFER_PENALTY_HOURS = 2.5
MAX_HOPS = 3
MAX_DETOUR_MULTIPLIER = 1.6

PATH_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30   # 30 days
GEOCODE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90  # 90 days
CACHE_PREFIX = "crossroute"

_graph = None
_city_nodes = {}
_graph_version = "0"

def load_graph():
    global _graph, _city_nodes, _graph_version
    if _graph is not None:
        return

    if not nx:
        return

    _graph = nx.MultiDiGraph()
    graph_file = os.path.join("data", "india_transport_graph.json")

    if not os.path.exists(graph_file):
        log.warning(f"[CrossRouter] Graph file not found: {graph_file}")
        return

    _graph_version = str(int(os.path.getmtime(graph_file)))
    with open(graph_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for node in data.get("nodes", []):
        node_id = node["id"].lower()
        _city_nodes[node_id] = node
        # Add aliases
        for alias in node.get("alias", []):
            _city_nodes[alias.lower()] = node
            
        _graph.add_node(node["id"], **node)
        
    for edge in data.get("edges", []):
        u = edge["from"]
        v = edge["to"]
        mode = edge["mode"]
        duration = edge["avg_duration_hours"]
        if _graph.has_node(u) and _graph.has_node(v):
            _graph.add_edge(u, v, key=mode, mode=mode, duration=duration)
            # Graph is bi-directional usually
            _graph.add_edge(v, u, key=mode, mode=mode, duration=duration)

def get_canonical_city(city_name: str) -> Optional[str]:
    load_graph()
    clean = city_name.split(",")[0].strip().lower()
    node = _city_nodes.get(clean)
    if node:
        return node["id"]
    
    # Try finding exact matches in aliases just in case
    for k, v in _city_nodes.items():
        if clean in k:
            return v["id"]
    return None

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

async def _geocode_city_async(city: str) -> Optional[Tuple[float, float]]:
    import httpx
    url = f"https://nominatim.openstreetmap.org/search"
    params = {"q": f"{city}, India", "format": "json", "limit": 1}
    headers = {"User-Agent": "GhumiGhumi/1.0 (test@example.com)"}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        log.warning(f"Geocoding failed for {city}: {e}")
    return None

async def _geocode_city_cached(city: str) -> Optional[Tuple[float, float]]:
    """Geocode a city not in the static graph, caching the result so repeat
    queries for the same unlisted city skip the Nominatim round-trip."""
    cache_key = f"geo:{city.strip().lower()}"
    cached = await _cache_get(cache_key, prefix=CACHE_PREFIX)
    if cached:
        try:
            lat_str, lon_str = cached.split(",")
            return float(lat_str), float(lon_str)
        except ValueError:
            pass

    coords = await _geocode_city_async(city)
    if coords:
        await _cache_set(cache_key, f"{coords[0]},{coords[1]}", GEOCODE_CACHE_TTL_SECONDS, prefix=CACHE_PREFIX)
    return coords

async def get_k_shortest_logical_paths(origin: str, dest: str, k: int = 5) -> List[Dict]:
    """Cached wrapper: identical (origin, dest, k) queries reuse the previously
    computed path set instead of re-running graph search every request."""
    load_graph()
    if not nx or not _graph:
        return []

    cache_key = f"path:{origin.strip().lower()}:{dest.strip().lower()}:{k}:{_graph_version}"
    cached = await _cache_get(cache_key, prefix=CACHE_PREFIX)
    if cached is not None:
        try:
            return json.loads(cached)
        except (json.JSONDecodeError, TypeError):
            pass

    result = await _compute_k_shortest_logical_paths(origin, dest, k)
    if result:
        await _cache_set(cache_key, json.dumps(result), PATH_CACHE_TTL_SECONDS, prefix=CACHE_PREFIX)
    return result

async def _compute_k_shortest_logical_paths(origin: str, dest: str, k: int = 5) -> List[Dict]:
    orig_canonical = get_canonical_city(origin)
    dest_canonical = get_canonical_city(dest)
    
    added_nodes = []
    added_edges = []
    
    async def inject_virtual_node(city_name: str) -> str:
        coords = await _geocode_city_cached(city_name)
        if not coords:
            return None
        lat, lon = coords
        v_id = f"__v_{city_name.lower().replace(' ', '_')}__"
        _graph.add_node(v_id, id=city_name, lat=lat, lon=lon, has_airport=False, state="Unknown", alias=[])
        added_nodes.append(v_id)
        
        distances = []
        for n, data in _graph.nodes(data=True):
            if n != v_id and "lat" in data and "lon" in data:
                dist = haversine_km(lat, lon, data["lat"], data["lon"])
                distances.append((dist, n))
                
        distances.sort()
        for dist, hub_id in distances[:3]:
            dur = dist / 50.0
            _graph.add_edge(v_id, hub_id, key="cab", mode="cab", duration=dur)
            _graph.add_edge(hub_id, v_id, key="cab", mode="cab", duration=dur)
            added_edges.append((v_id, hub_id))
            added_edges.append((hub_id, v_id))
            
        return v_id
        
    if not orig_canonical:
        orig_canonical = await inject_virtual_node(origin)
    if not dest_canonical:
        dest_canonical = await inject_virtual_node(dest)
        
    try:
        if not orig_canonical or not dest_canonical or orig_canonical == dest_canonical:
            return []
            
        orig_node = _graph.nodes[orig_canonical]
        dest_node = _graph.nodes[dest_canonical]
        
        direct_dist = haversine_km(orig_node["lat"], orig_node["lon"], dest_node["lat"], dest_node["lon"])
        
        try:
            paths = list(nx.all_simple_paths(_graph, orig_canonical, dest_canonical, cutoff=MAX_HOPS+1))
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []
            
        valid_paths = []
        
        for path in paths:
            total_dist = 0.0
            for i in range(len(path) - 1):
                n1 = _graph.nodes[path[i]]
                n2 = _graph.nodes[path[i+1]]
                total_dist += haversine_km(n1["lat"], n1["lon"], n2["lat"], n2["lon"])
                
            if total_dist > direct_dist * MAX_DETOUR_MULTIPLIER:
                continue
                
            legs = []
            total_estimated_hours = 0.0
            
            for i in range(len(path) - 1):
                u = path[i]
                v = path[i+1]
                edges = _graph[u][v]
                
                best_mode = "train"
                best_dur = 999.0
                
                for key, data in edges.items():
                    if data.get("duration", 999) < best_dur:
                        best_dur = data.get("duration", 999)
                        best_mode = data.get("mode", "train")
                        
                legs.append({
                    "source": _graph.nodes[u]["id"],
                    "destination": _graph.nodes[v]["id"],
                    "mode": best_mode,
                    "estimated_duration": best_dur
                })
                total_estimated_hours += best_dur
                
            total_estimated_hours += (len(path) - 2) * TRANSFER_PENALTY_HOURS
            
            valid_paths.append({
                "nodes": [_graph.nodes[x]["id"] for x in path],
                "legs": legs,
                "total_estimated_hours": total_estimated_hours
            })
            
        valid_paths.sort(key=lambda x: x["total_estimated_hours"])
        return valid_paths[:k]
    finally:
        for u, v in added_edges:
            if _graph.has_edge(u, v):
                _graph.remove_edge(u, v)
        for n in added_nodes:
            if _graph.has_node(n):
                _graph.remove_node(n)

async def _fetch_live_leg(leg: Dict, date: datetime, passengers: int) -> Optional[Dict]:
    from services.live_flights_api import search_live_flights
    from services.live_trains_api import search_live_trains, get_station_code
    
    source = leg["source"]
    dest = leg["destination"]
    mode = leg["mode"]
    date_str = date.strftime("%Y-%m-%d")
    
    try:
        results = None
        
        # 1. DB Cache Check for Trains
        if mode == "train":
            s_code = await get_station_code(source)
            d_code = await get_station_code(dest)
            if s_code and d_code:
                try:
                    conn = await get_db_connection()
                    rows = await conn.fetch('SELECT train_num, train_name, dep_time, arr_time, duration_hours, price FROM "Train" WHERE origin = $1 AND dest = $2 AND date = $3', s_code, d_code, date_str)
                    await conn.close()
                    if rows:
                        results = []
                        for idx, r in enumerate(rows):
                            results.append(TransportOption(
                                id=f"tr_{r['train_num']}_{idx}_cached",
                                type=TransportType.TRAIN,
                                departure=datetime.fromisoformat(r['dep_time']),
                                arrival=datetime.fromisoformat(r['arr_time']),
                                duration_hours=float(r['duration_hours']),
                                price=float(r['price']),
                                safety_score=8,
                                comfort_score=7,
                                provider=r['train_name']
                            ))
                except Exception as e:
                    log.warning(f"Cache check failed: {e}")
                    
        # 2. Static DGCA Data for Flights
        # We do NOT want to hit live flight API for cross-routes to save quota.
        if mode == "flight":
            # DGCA data should be in memory
            from services.dgca_pdf_parser import load_cached_flights
            flights_df = load_cached_flights()
            if flights_df is not None:
                # Need IATA codes
                load_graph()
                s_iata = _city_nodes.get(source.lower(), {}).get("alias", [source])[0] if _city_nodes.get(source.lower()) else source
                d_iata = _city_nodes.get(dest.lower(), {}).get("alias", [dest])[0] if _city_nodes.get(dest.lower()) else dest
                
                # Try finding in dataframe
                matches = flights_df[(flights_df["origin"] == s_iata) & (flights_df["dest"] == d_iata)]
                if not matches.empty:
                    # Filter by day of week
                    weekday = date.weekday()
                    def _parse_days(ds):
                        return [int(x)-1 for x in str(ds) if x.isdigit()]
                    
                    valid = []
                    for _, row in matches.iterrows():
                        if weekday in _parse_days(row.get("freq", "1234567")):
                            valid.append(row)
                            
                    if valid:
                        results = []
                        for idx, v in enumerate(valid[:3]):
                            dep_time_raw = str(v['dep_time'])
                            arr_time_raw = str(v['arr_time'])
                            
                            try:
                                if len(dep_time_raw) >= 4 and ':' not in dep_time_raw:
                                    dep_time_raw = f"{dep_time_raw[:2]}:{dep_time_raw[2:4]}"
                                elif len(dep_time_raw) > 5:
                                    dep_time_raw = dep_time_raw[:5]
                                    
                                if len(arr_time_raw) >= 4 and ':' not in arr_time_raw:
                                    arr_time_raw = f"{arr_time_raw[:2]}:{arr_time_raw[2:4]}"
                                elif len(arr_time_raw) > 5:
                                    arr_time_raw = arr_time_raw[:5]
                                    
                                dep_dt = datetime.strptime(f"{date_str} {dep_time_raw}", "%Y-%m-%d %H:%M")
                                arr_dt = datetime.strptime(f"{date_str} {arr_time_raw}", "%Y-%m-%d %H:%M")
                                if arr_dt < dep_dt:
                                    arr_dt += timedelta(days=1)
                                dur = (arr_dt - dep_dt).total_seconds() / 3600.0
                            except Exception as e:
                                log.warning(f"Failed parsing flight time {v['flight_no']}: {e}")
                                continue
                            
                            results.append(TransportOption(
                                id=f"fl_dgca_{idx}",
                                type=TransportType.FLIGHT,
                                departure=dep_dt,
                                arrival=arr_dt,
                                duration_hours=dur,
                                price=3000 + (dur * 1500),
                                safety_score=9,
                                comfort_score=8,
                                provider=f"{v['airline']} {v['flight_no']}"
                            ))

        # 3. Live API Check for Trains (Quota spent)
        if not results and mode == "train":
            results = await search_live_trains(source, dest, date_str, check_only=False)
            # Remove any mock results returned from live API
            if results:
                results = [r for r in results if "mock" not in r.id.lower()]
            
        # 4. Estimated Fallback (No live API data)
        if not results:
            log.info(f"[CrossRouter] No live data for {source}->{dest} ({mode}). Generating estimated fallback.")
            dur = leg.get("estimated_duration", 5.0)
            dep_dt = date.replace(hour=10, minute=0)
            arr_dt = dep_dt + timedelta(hours=dur)
            provider_str = f"Estimated {mode.title()} (Select to verify)"
            price = 600 if mode == "train" else 4000
            
            results = [TransportOption(
                id=f"est_{source}_{dest}",
                type=TransportType.TRAIN if mode == "train" else TransportType.FLIGHT,
                departure=dep_dt,
                arrival=arr_dt,
                duration_hours=dur,
                price=price,
                safety_score=7,
                comfort_score=7,
                provider=provider_str
            )]
            
        if results:
            return {
                "source": source,
                "destination": dest,
                "mode": mode,
                "live_option": results[0] 
            }
            
        return None
        
    except Exception as e:
        log.error(f"[CrossRouter] Leg resolution failed for {source}->{dest} ({mode}): {e}")
        return None

async def hydrate_cross_route(origin: str, dest: str, date: datetime, passengers: int = 1) -> List[Dict]:
    candidate_paths = await get_k_shortest_logical_paths(origin, dest, k=3)
    
    if not candidate_paths:
        log.warning(f"[CrossRouter] No offline paths found for {origin} -> {dest}")
        return []
        
    fully_hydrated = []
    
    for path in candidate_paths:
        log.info(f"[CrossRouter] Hydrating candidate path: {' -> '.join(path['nodes'])}")
        
        tasks = [_fetch_live_leg(leg, date, passengers) for leg in path["legs"]]
        live_legs = await asyncio.gather(*tasks)
        
        if any(leg is None for leg in live_legs):
            log.info(f"[CrossRouter] Path failed hydration (missing leg).")
            continue 
            
        fully_hydrated.append({
            "offline_estimation": path,
            "live_legs": live_legs,
            "total_price": sum(l["live_option"].price for l in live_legs),
            "status": "success"
        })
        
    # Return ALL successful paths instead of just the first one
    return fully_hydrated
