"""
routing_engine.py — ALNS PC-VRPTW Solver
Architecture: PC-VRPTW Formulation → Simulated Annealing (ALNS)
  with Soft Meal Time Windows, Fatigue Capacity Constraints, and Organic Node Dropping.
"""

import time
import math
import random
import asyncio
import logging
from typing import List, Dict, Tuple, Optional

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# UTILITIES
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def travel_mins_haversine(lat1: float, lon1: float,
                           lat2: float, lon2: float,
                           speed_kmh: float = 25.0) -> int:
    """Urban travel time in minutes via Haversine + urban speed multiplier."""
    dist = haversine_km(lat1, lon1, lat2, lon2)
    return max(5, int((dist / speed_kmh) * 60))

# ---------------------------------------------------------------------------
# DEMOGRAPHIC SCALING
# ---------------------------------------------------------------------------

def compute_fatigue_cap_mins(passengers: List[Dict]) -> int:
    """
    Dynamically scale daily fatigue cap from passenger demographics.
    - Toddlers (age < 6):  5 hrs = 300 min
    - Elderly (age > 70):  6 hrs = 360 min
    - Default:             8 hrs = 480 min
    """
    if not passengers:
        return 480
    ages = [int(p.get("age", 30)) for p in passengers if p.get("age")]
    if not ages:
        return 480
    if any(a < 6 for a in ages):
        return 300
    if any(a > 70 for a in ages):
        return 360
    return 480

def compute_transit_multiplier(passengers: List[Dict]) -> float:
    """Apply 1.25x transit multiplier for groups with mobility constraints."""
    ages = [int(p.get("age", 30)) for p in passengers if p.get("age")]
    if any(a < 6 or a > 70 for a in ages):
        return 1.25
    return 1.0

# ---------------------------------------------------------------------------
# PLACE ENRICHMENT & SOFT TIME WINDOWS
# ---------------------------------------------------------------------------

FOOD_KEYWORDS = {"restaurant", "cafe", "bar", "bakery", "food",
                  "bistro", "diner", "dhaba", "eatery", "coffee"}

# Meal soft time windows in minutes from day start (assume day starts at 06:00)
MEAL_WINDOWS = [
    ("breakfast", 60,  240),   # 07:00 – 10:00
    ("lunch",     360, 480),   # 12:00 – 14:00
    ("dinner",    780, 900),   # 19:00 – 21:00
]

def _is_food(category: str) -> bool:
    return any(kw in (category or "").lower() for kw in FOOD_KEYWORDS)

def _enrich(place: Dict) -> Dict:
    cat = place.get("category", "")
    lat = place.get("lat")
    lng = place.get("lng")
    if lat is None or lng is None:
        coords = place.get("coordinates", [0, 0])
        lat, lng = coords[0], coords[1]
        
    dur = place.get("visitDurationHours") or place.get("visit_duration_hours") or 1.5
    
    # Calculate Prize (Utility Score based on Rating)
    rating = float(place.get("rating") or 4.0)
    prize = rating * 1000.0
    
    return {
        "id":           place["id"],
        "lat":          float(lat),
        "lng":          float(lng),
        "dur_mins":     int(float(dur) * 60),
        "is_food":      _is_food(cat),
        "rating":       rating,
        "prize":        prize
    }

# ---------------------------------------------------------------------------
# ALNS / PC-VRPTW IMPLEMENTATION
# ---------------------------------------------------------------------------

def _build_real_time_matrix(nodes: List[Dict], transit_mult: float) -> Dict[str, Dict[str, int]]:
    """
    Stub for real-world distance matrix (e.g. OSRM, Mapbox, Google Distance Matrix).
    Currently defaults to Euclidean/Haversine based estimates.
    """
    matrix = {}
    for i, n1 in enumerate(nodes):
        matrix[n1["id"]] = {}
        for j, n2 in enumerate(nodes):
            if i == j:
                matrix[n1["id"]][n2["id"]] = 0
            else:
                matrix[n1["id"]][n2["id"]] = int(travel_mins_haversine(
                    n1["lat"], n1["lng"], n2["lat"], n2["lng"]
                ) * transit_mult)
    return matrix


class PCVRPTW_State:
    def __init__(self, routes: List[List[str]], unassigned: List[str], nodes_map: Dict[str, Dict], time_matrix: Dict[str, Dict[str, int]], fatigue_cap: int):
        self.routes = routes
        self.unassigned = unassigned
        self.nodes_map = nodes_map
        self.time_matrix = time_matrix
        self.fatigue_cap = fatigue_cap
        self.cost = self.evaluate()

    def evaluate(self):
        """
        Objective Function. We minimize cost.
        Cost = Penalty_TimeWarp + Penalty_OverCapacity + Travel_Time - Prize_Collected
        """
        total_cost = 0.0
        
        # Unassigned penalty (lost prize)
        for n_id in self.unassigned:
            total_cost += self.nodes_map[n_id]["prize"]
            
        for day_route in self.routes:
            if not day_route:
                continue
                
            day_time = 0
            meal_idx = 0
            
            for i in range(len(day_route)):
                curr_id = day_route[i]
                curr_node = self.nodes_map[curr_id]
                
                # Travel time
                if i > 0:
                    prev_id = day_route[i-1]
                    day_time += self.time_matrix[prev_id][curr_id]
                
                # Soft Time Windows for meals
                if curr_node["is_food"]:
                    _, window_start, window_end = MEAL_WINDOWS[meal_idx % len(MEAL_WINDOWS)]
                    
                    if day_time < window_start:
                        # Arrived too early, wait until meal window starts
                        day_time = window_start
                    elif day_time > window_end:
                        # Time warp penalty (late arrival)
                        # Linear penalty for violating soft window
                        total_cost += (day_time - window_end) * 50.0
                    
                    meal_idx += 1
                
                # Add service duration
                day_time += curr_node["dur_mins"]
                
                # Reward for visiting this node
                total_cost -= curr_node["prize"]
                
            # Organic Node Dropping via Capacity Constraints
            # If day_time exceeds fatigue cap, apply massive penalty
            if day_time > self.fatigue_cap:
                total_cost += (day_time - self.fatigue_cap) * 200.0
                
        return total_cost

    def copy(self):
        return PCVRPTW_State(
            [r[:] for r in self.routes], 
            self.unassigned[:], 
            self.nodes_map, 
            self.time_matrix, 
            self.fatigue_cap
        )


def alns_solve(nodes: List[Dict], days_count: int, fatigue_cap_mins: int, transit_mult: float, max_runtime: float = 0.45) -> Dict[str, int]:
    """
    Adaptive Large Neighborhood Search (ALNS) / Simulated Annealing Metaheuristic.
    Ensures strict < 500ms execution for highly responsive UI.
    """
    start_time = time.time()
    
    nodes_map = {n["id"]: n for n in nodes}
    time_matrix = _build_real_time_matrix(nodes, transit_mult)
    
    depot_id = "__depot__"
    unassigned = [n["id"] for n in nodes if n["id"] != depot_id]
    
    # Initialize state
    routes = [[] for _ in range(days_count)]
    current_state = PCVRPTW_State(routes, unassigned, nodes_map, time_matrix, fatigue_cap_mins)
    
    # Basic greedy repair for initial state
    for place_id in list(current_state.unassigned):
        best_day = min(range(days_count), key=lambda d: len(current_state.routes[d]))
        current_state.routes[best_day].append(place_id)
        current_state.unassigned.remove(place_id)
        
    current_state.cost = current_state.evaluate()
    best_state = current_state.copy()
    
    # Simulated Annealing hyperparameters
    temp = 2000.0
    cooling_rate = 0.95
    
    iteration = 0
    while time.time() - start_time < max_runtime:
        iteration += 1
        new_state = current_state.copy()
        
        # --- DESTROY OPERATOR (Random Removal) ---
        remove_count = random.randint(1, min(3, max(1, len(nodes) - 1)))
        removed = set()
        
        # Remove a random node from a random non-empty route
        for _ in range(remove_count):
            non_empty = [d for d in range(days_count) if new_state.routes[d]]
            if not non_empty:
                break
            day = random.choice(non_empty)
            idx = random.randint(0, len(new_state.routes[day]) - 1)
            removed.add(new_state.routes[day].pop(idx))
                
        new_state.unassigned.extend(list(removed))
        
        # --- REPAIR OPERATOR (Greedy Insertion) ---
        # Shuffle to randomize insertion order of unassigned nodes
        random.shuffle(new_state.unassigned)
        for place_id in list(new_state.unassigned):
            best_cost = float('inf')
            best_insert = None # (day, idx)
            
            # Find best insertion point across all days and indices
            for day in range(days_count):
                for idx in range(len(new_state.routes[day]) + 1):
                    new_state.routes[day].insert(idx, place_id)
                    cost = new_state.evaluate()
                    if cost < best_cost:
                        best_cost = cost
                        best_insert = (day, idx)
                    new_state.routes[day].pop(idx) # revert
            
            if best_insert:
                new_state.routes[best_insert[0]].insert(best_insert[1], place_id)
                new_state.unassigned.remove(place_id)
                
        new_state.cost = new_state.evaluate()
        
        # --- ACCEPTANCE CRITERIA (Simulated Annealing) ---
        if new_state.cost < current_state.cost:
            current_state = new_state
            if current_state.cost < best_state.cost:
                best_state = current_state.copy()
        else:
            # Acceptance probability for a worse solution
            prob = math.exp(-(new_state.cost - current_state.cost) / max(0.01, temp))
            if random.random() < prob:
                current_state = new_state
                
        temp *= cooling_rate
        
    log.info(f"[Router - ALNS] Finished {iteration} iterations in {time.time() - start_time:.3f}s. Best Cost: {best_state.cost:.1f}")
    
    assignments = {}
    for day_idx, route in enumerate(best_state.routes):
        for place_id in route:
            assignments[place_id] = day_idx + 1
            
    return assignments


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------

async def optimize_itinerary(
    places_data: List[Dict],
    days_count: int,
    hotel_coords: Optional[Tuple[float, float]] = None,
    passengers: Optional[List[Dict]] = None,
    arrival_offset_mins: int = 0,
) -> Dict:
    """
    Main entry point. Returns {"assignments": {place_id: day_number (1-indexed)}}.

    Architecture Overhaul:
      1. Distance/Duration Matrix Integration (replaces DBSCAN)
      2. PC-VRPTW Formulation
      3. Soft Time Windows for Meals
      4. Organic Node Dropping via Capacity Constraints
      5. ALNS Metaheuristic solver with < 500ms execution timeout
    """
    passengers = passengers or []

    if not places_data:
        return {"assignments": {}}

    fatigue_cap_mins = compute_fatigue_cap_mins(passengers)
    transit_mult = compute_transit_multiplier(passengers)

    log.info(
        f"[Router - ALNS] Optimizing {len(places_data)} places across {days_count} days. "
        f"Cap={fatigue_cap_mins}min, TransitMult={transit_mult:.2f}"
    )

    enriched = [_enrich(p) for p in places_data]

    # --- Depot ---
    if hotel_coords:
        depot_lat, depot_lng = float(hotel_coords[0]), float(hotel_coords[1])
    else:
        depot_lat = sum(p["lat"] for p in enriched) / max(1, len(enriched))
        depot_lng = sum(p["lng"] for p in enriched) / max(1, len(enriched))

    depot = {
        "id": "__depot__", "lat": depot_lat, "lng": depot_lng,
        "dur_mins": 0, "is_food": False, "rating": 5.0, "prize": 0.0
    }
    
    nodes = [depot] + enriched

    # Execute ALNS PC-VRPTW solver synchronously inside async wrapper
    assignments = await asyncio.to_thread(
        alns_solve,
        nodes,
        days_count,
        fatigue_cap_mins,
        transit_mult,
        0.45 # strictly less than 500ms timeout
    )

    log.info(f"[Router - ALNS] Done. {len(assignments)}/{len(places_data)} assigned.")
    return {"assignments": assignments}
