from typing import List
from models.entities import Place, Passenger

def calculate_safety_score(place: Place, passengers: List[Passenger], planned_hour: int) -> int:
    score = place.safety_score_base
    
    has_elderly = any(p.age > 60 for p in passengers)
    has_females = any(p.gender == "F" for p in passengers)
    
    if has_elderly and not place.family_friendly:
        score -= 3
    if has_females and (planned_hour < place.safe_hours[0] or planned_hour > place.safe_hours[1]):
        score -= 4 # High penalty for unsafe hours
        
    return max(0, score)
