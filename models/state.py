from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models.entities import Passenger, Place, Hotel

class DailyPlan(BaseModel):
    day_number: int
    places: List[Place]
    total_travel_time: float = 0.0
    total_active_time: float = 0.0
    hotel: Optional[Hotel] = None

class TripState(BaseModel):
    trip_id: str
    mode: str
    passengers: List[Passenger]
    source_city: str
    destination_city: Optional[str] = None
    start_date: datetime
    end_date: datetime
    total_budget: float
    transport_spend: float = 0.0
    hotel_spend: float = 0.0
    activity_spend: float = 0.0
    itinerary: List[DailyPlan] = []

    @property
    def remaining_budget(self) -> float:
        return self.total_budget - (self.transport_spend + self.hotel_spend + self.activity_spend)

    @property
    def days(self) -> int:
        return max(1, (self.end_date - self.start_date).days)
