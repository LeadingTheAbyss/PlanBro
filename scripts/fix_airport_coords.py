import os
import sys
import json
import time
import requests

# Add parent dir to path so we can import from services
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.dgca_pdf_parser import CITY_TO_IATA

# Hardcoded fallbacks provided by user
MANUAL_COORDS = {
  "KQH": {"name": "Ajmer (Kishangarh)", "lat": 26.6022, "lon": 74.8142, "city": "Ajmer"},
  "COK": {"name": "Alappuzha (Kochi)", "lat": 10.1518, "lon": 76.3930, "city": "Alappuzha"},
  "RDP": {"name": "Asansol (Durgapur)", "lat": 23.6186, "lon": 87.2403, "city": "Asansol"},
  "DED": {"name": "Auli (Dehradun)", "lat": 30.1897, "lon": 78.1800, "city": "Auli"},
  "JLR": {"name": "Bandhavgarh (Jabalpur)", "lat": 23.1780, "lon": 80.0520, "city": "Bandhavgarh"},
  "GAY": {"name": "Bodh Gaya", "lat": 24.7444, "lon": 84.9416, "city": "Bodh Gaya"},
  "CCU": {"name": "Calcutta (Kolkata)", "lat": 22.6520, "lon": 88.4467, "city": "Calcutta"},
  "SHL": {"name": "Cherrapunji (Shillong)", "lat": 25.7039, "lon": 91.8978, "city": "Cherrapunji"},
  "PNY": {"name": "Chidambaram (Pondicherry)", "lat": 11.9686, "lon": 79.8146, "city": "Chidambaram"},
  "MYQ": {"name": "Coorg (Mysore)", "lat": 12.2319, "lon": 76.6508, "city": "Coorg"},
  "PGH": {"name": "Corbett (Pantnagar)", "lat": 29.0322, "lon": 79.4739, "city": "Corbett"},
  "IXP": {"name": "Dalhousie (Pathankot)", "lat": 32.2333, "lon": 75.6333, "city": "Dalhousie"},
  "DHM": {"name": "Dharamshala (Kangra)", "lat": 32.1651, "lon": 76.2625, "city": "Dharamshala"},
  "LKO": {"name": "Dudhwa (Lucknow)", "lat": 26.7606, "lon": 80.8893, "city": "Dudhwa"},
  "JGA": {"name": "Dwarka (Jamnagar)", "lat": 22.4656, "lon": 70.0125, "city": "Dwarka"},
  "PYG": {"name": "Gangtok (Pakyong)", "lat": 27.2289, "lon": 88.5864, "city": "Gangtok"},
  "HYD": {"name": "Golconda (Hyderabad)", "lat": 17.2403, "lon": 78.4294, "city": "Golconda"},
  "GBI": {"name": "Gulbarga (Kalaburagi)", "lat": 17.3197, "lon": 76.9242, "city": "Gulbarga"},
  "SXR": {"name": "Gulmarg (Srinagar)", "lat": 33.9786, "lon": 74.7744, "city": "Gulmarg"},
  "VDY": {"name": "Hampi (Vidyanagar)", "lat": 15.1633, "lon": 76.6375, "city": "Hampi"},
  "IXZ": {"name": "Havelock (Port Blair)", "lat": 11.6411, "lon": 92.7300, "city": "Havelock"},
  "AIP": {"name": "Jalandhar (Adampur)", "lat": 31.4339, "lon": 75.7600, "city": "Jalandhar"},
  "RAJ": {"name": "Junagadh (Rajkot)", "lat": 22.3092, "lon": 70.7794, "city": "Junagadh"},
  "RJA": {"name": "Kakinada (Rajahmundry)", "lat": 17.1106, "lon": 81.8172, "city": "Kakinada"},
  "TRV": {"name": "Kanyakumari (Trivandrum)", "lat": 8.4821, "lon": 76.9200, "city": "Kanyakumari"},
  "KUU": {"name": "Kasol (Kullu)", "lat": 31.8763, "lon": 77.1541, "city": "Kasol"},
  "PNQ": {"name": "Khandala (Pune)", "lat": 18.5822, "lon": 73.9197, "city": "Khandala"},
  "IXM": {"name": "Kodaikanal (Madurai)", "lat": 9.8345, "lon": 78.0934, "city": "Kodaikanal"},
  "IXE": {"name": "Malpe (Mangaluru)", "lat": 12.9613, "lon": 74.8901, "city": "Malpe"},
  "UDR": {"name": "Mount Abu (Udaipur)", "lat": 24.6178, "lon": 73.8961, "city": "Mount Abu"},
  "TEZ": {"name": "Tawang (Tezpur)", "lat": 26.6322, "lon": 92.7850, "city": "Tawang"}
}

def main():
    coords_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "airport_coords.json")
    
    # Load existing coords
    existing_coords = {}
    if os.path.exists(coords_path):
        with open(coords_path, "r") as f:
            try:
                existing_coords = json.load(f)
            except Exception:
                pass

    print(f"Loaded {len(existing_coords)} existing airports.")
    
    # Merge manual fallbacks
    for iata, data in MANUAL_COORDS.items():
        if iata not in existing_coords:
            existing_coords[iata] = {"lat": data["lat"], "lon": data["lon"], "city": data["city"]}
            print(f"Added manual fallback for {iata}")

    # Check for remaining missing
    unique_iatas = set(CITY_TO_IATA.values())
    missing_iatas = []
    
    # Build IATA -> City name mapping for the missing ones
    iata_to_city = {}
    for c, i in CITY_TO_IATA.items():
        iata_to_city[i] = c.title()
        
    for iata in unique_iatas:
        if iata not in existing_coords:
            missing_iatas.append(iata)

    if missing_iatas:
        print(f"\\nThere are still {len(missing_iatas)} missing airports! Fetching from Nominatim with alternative queries...")
        headers = {"User-Agent": "Tripeasy-AirportCoordsFixer/1.0"}
        
        for iata in missing_iatas:
            city = iata_to_city.get(iata, "")
            # Try a broader search just by city name and 'airport'
            query = f"{city} India"
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(query)}&format=json&limit=1"
            try:
                res = requests.get(url, headers=headers, timeout=8).json()
                if res:
                    existing_coords[iata] = {"lat": float(res[0]["lat"]), "lon": float(res[0]["lon"]), "city": city}
                    print(f"  [OK] {iata} ({city}): {existing_coords[iata]['lat']:.4f}, {existing_coords[iata]['lon']:.4f}")
                else:
                    print(f"  [MISS] {iata} ({city}): no result even with fallback query")
            except Exception as e:
                print(f"  [ERR] {iata} ({city}): {e}")
            time.sleep(1.2)
    else:
        print("\\nAll IATA codes are accounted for!")

    # Save
    with open(coords_path, "w") as f:
        json.dump(existing_coords, f, indent=2)
    print(f"Saved {len(existing_coords)} airports to {coords_path}")

if __name__ == "__main__":
    main()
