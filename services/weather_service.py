import requests
from datetime import datetime
from models.enums import Weather

def get_weather(city: str, date: datetime) -> Weather:
    print(f"\n[API Call] Fetching live weather forecast for {city} from Open-Meteo...")
    
    try:
        # Step 1: Geocode city name to latitude and longitude
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&format=json"
        geo_response = requests.get(geo_url, timeout=5)
        geo_data = geo_response.json()
        
        if "results" not in geo_data:
            print(f"[Fallback] Could not find coordinates for {city}, defaulting to SUNNY.")
            return Weather.SUNNY
            
        lat = geo_data["results"][0]["latitude"]
        lon = geo_data["results"][0]["longitude"]
        
        # Step 2: Fetch current weather code based on coordinates
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=weather_code"
        weather_response = requests.get(weather_url, timeout=5)
        weather_data = weather_response.json()
        
        # WMO Weather interpretation codes
        code = weather_data.get("current", {}).get("weather_code", 0)
        
        if code in [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]:
            return Weather.RAINY
        elif code in [71, 73, 75, 77, 85, 86]:
            return Weather.SNOW
        elif code in [1, 2, 3, 45, 48]:
            return Weather.CLOUDY
        else:
            return Weather.SUNNY
            
    except Exception as e:
        print(f"[Fallback] Network issue reaching Weather API ({e}). Defaulting to SUNNY.")
        return Weather.SUNNY
