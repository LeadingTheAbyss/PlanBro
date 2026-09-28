import math
from typing import List
from models.entities import Place
from models.state import TripState, DailyPlan

def distance(c1, c2):
    return math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2) * 111

def generate_itinerary(trip: TripState, places: List[Place]) -> List[DailyPlan]:
    itinerary = []
    unassigned = places.copy()
    
    for day in range(1, trip.days + 1):
        plan = DailyPlan(day_number=day, places=[])
        current_loc = None
        
        while unassigned and (plan.total_active_time + plan.total_travel_time) < 8.0:
            if current_loc is None:
                nxt = unassigned.pop(0)
                travel_time = 0.5
            else:
                unassigned.sort(key=lambda p: distance(current_loc, p.coordinates))
                nxt = unassigned[0]
                travel_time = distance(current_loc, nxt.coordinates) / 30.0
                
            if plan.total_active_time + plan.total_travel_time + travel_time + nxt.visit_duration_hours > 8.0:
                break
                
            plan.places.append(nxt)
            plan.total_travel_time += travel_time
            plan.total_active_time += nxt.visit_duration_hours
            current_loc = nxt.coordinates
            
        itinerary.append(plan)
        
    trip.itinerary = itinerary
    return itinerary

def move_place(trip: TripState, place_id: str, from_day: int, to_day: int):
    place = None
    for p in trip.itinerary[from_day-1].places:
        if p.id == place_id:
            place = p
            break
            
    if place:
        trip.itinerary[from_day-1].places.remove(place)
        trip.itinerary[to_day-1].places.append(place)
        
        trip.itinerary[from_day-1].total_active_time -= place.visit_duration_hours
        trip.itinerary[to_day-1].total_active_time += place.visit_duration_hours
        print(f"🔄 Drag & Drop Event: Moved '{place.name}' to Day {to_day}")
