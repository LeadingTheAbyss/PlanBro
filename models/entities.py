from pydantic import BaseModel
from typing import List, Optional, Tuple
from datetime import datetime
from models.enums import TransportType, CrowdLevel, Weather

class Passenger(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    pincode: str
    city: Optional[str] = None
    transport_pref: Optional[TransportType] = None
    mobility_constraints: bool = False

class Place(BaseModel):
    id: str  # Google Place ID (ChIJ...)
    photo_name: Optional[str] = None  # Google photo reference (places/.../photos/...)
    name: str
    category: str
    coordinates: Tuple[float, float]
    entry_fee: float
    visit_duration_hours: float
    safe_hours: Tuple[int, int]
    crowd_estimate: CrowdLevel
    family_friendly: bool
    safety_score_base: int
    weather_sensitive: bool
    bad_weather_types: List[Weather] = []
    rating: Optional[float] = None
    user_rating_count: Optional[int] = None

class Hotel(BaseModel):
    id: str  # Google Place ID (ChIJ...)
    photo_name: Optional[str] = None  # Google photo reference (places/.../photos/...)
    name: str
    address: Optional[str] = None  # Google formattedAddress
    coordinates: Tuple[float, float]
    price_per_night: float
    comfort_score: int
    safety_score: int
    rating: float

class TransportOption(BaseModel):
    id: str
    type: TransportType
    departure: datetime
    arrival: datetime
    duration_hours: float
    price: float
    safety_score: int
    comfort_score: int
    provider: Optional[str] = None
    price_breakdown: Optional[dict] = None
    time_breakdown: Optional[dict] = None
