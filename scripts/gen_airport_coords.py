"""
One-time script to generate data/airport_coords.json.
Maps each unique IATA code from CITY_TO_IATA to its lat/lon via Nominatim.
Run once: py scripts/gen_airport_coords.py
"""
import time
import json
import requests
import sys
import os

# Add parent dir to path so we can import from services
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dgca_pdf_parser import CITY_TO_IATA

# Build a reverse map: IATA -> city name (for readable geocoding query)
IATA_TO_CITY = {}
for city, iata in CITY_TO_IATA.items():
    if iata not in IATA_TO_CITY:
        IATA_TO_CITY[iata] = city.title()

headers = {"User-Agent": "Tripeasy-AirportCoords/1.0"}
out = {}

print(f"Geocoding {len(IATA_TO_CITY)} airports...")
for iata, city in IATA_TO_CITY.items():
    query = f"{city} airport India"
    url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=1"
    try:
        res = requests.get(url, headers=headers, timeout=8).json()
        if res:
            out[iata] = {"lat": float(res[0]["lat"]), "lon": float(res[0]["lon"]), "city": city}
            print(f"  [OK] {iata} ({city}): {out[iata]['lat']:.4f}, {out[iata]['lon']:.4f}")
        else:
            print(f"  [MISS] {iata} ({city}): no result")
    except Exception as e:
        print(f"  [ERR] {iata} ({city}): {e}")
    time.sleep(1.1)  # Respect Nominatim rate limit (1 req/sec)

out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "airport_coords.json")
with open(out_path, "w") as f:
    json.dump(out, f, indent=2)

print(f"\nDone! Wrote {len(out)} airports to {out_path}")
