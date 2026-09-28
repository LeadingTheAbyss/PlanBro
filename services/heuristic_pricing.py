import math
from datetime import datetime

def calculate_heuristic_bus_fare(distance_km: float, bus_type: str, date_str: str, time_str: str) -> float:
    """
    Calculates dynamic bus pricing based on heuristics rather than live APIs.
    Based on distance, class, day of week, time of day, and seasonality.
    """
    # 1. Base Fare based on distance and class
    bus_type = bus_type.lower()
    if "sleeper" in bus_type and "ac" in bus_type:
        rate_per_km = 3.0  # ₹2.5 - ₹3.5
    elif "ac" in bus_type or "volvo" in bus_type or "scania" in bus_type:
        rate_per_km = 2.0  # ₹1.8 - ₹2.2
    else:
        rate_per_km = 1.35 # ₹1.2 - ₹1.5
        
    base_fare = max(100.0, distance_km * rate_per_km)
    
    # 2. Multipliers
    multiplier = 1.0
    
    # Parse date/time
    try:
        dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        except ValueError:
            dt = datetime.now() # Fallback
            
    # Day of Week Multiplier (Friday=4, Sunday=6)
    if dt.weekday() in [4, 6]:
        # Peak weekend departure
        multiplier *= 1.35
    elif dt.weekday() == 5:
        # Saturday is slightly elevated
        multiplier *= 1.15
        
    # Time of Day Multiplier
    hour = dt.hour
    if 20 <= hour <= 23:
        # Prime overnight
        multiplier *= 1.15
    elif 8 <= hour <= 17:
        # Daytime discount for long distance
        if distance_km > 400:
            multiplier *= 0.85
            
    # Seasonality (Hardcoded Diwali/Holi approximations for 2026)
    month = dt.month
    day = dt.day
    # Example: Diwali ~Nov 2026, Holi ~March 2026
    if (month == 11 and 5 <= day <= 15) or (month == 3 and 1 <= day <= 10):
        multiplier *= 1.50
        
    final_fare = base_fare * multiplier
    
    # Round to nearest 50
    return round(final_fare / 50.0) * 50.0
