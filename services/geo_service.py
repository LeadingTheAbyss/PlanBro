import requests

def geo_lookup(pincode: str) -> dict:
    if not pincode or len(pincode) != 6:
        return {"city": "Invalid", "state": "Unknown"}

    # --- 0-Latency Prefix Matcher ---
    # The first 3 digits of an Indian Pincode precisely identify the "Sorting District".
    # We can provide 0ms latency for the vast majority of user queries by matching prefixes.
    prefix = pincode[:3]
    prefix_map = {
        "110": {"city": "Delhi", "state": "Delhi"},
        "400": {"city": "Mumbai", "state": "Maharashtra"},
        "411": {"city": "Pune", "state": "Maharashtra"},
        "412": {"city": "Pune", "state": "Maharashtra"},
        "226": {"city": "Lucknow", "state": "Uttar Pradesh"},
        "500": {"city": "Hyderabad", "state": "Telangana"},
        "600": {"city": "Chennai", "state": "Tamil Nadu"},
        "560": {"city": "Bengaluru", "state": "Karnataka"},
        "700": {"city": "Kolkata", "state": "West Bengal"},
        "380": {"city": "Ahmedabad", "state": "Gujarat"},
        "302": {"city": "Jaipur", "state": "Rajasthan"},
        "395": {"city": "Surat", "state": "Gujarat"},
        "201": {"city": "Noida", "state": "Uttar Pradesh"},
        "122": {"city": "Gurugram", "state": "Haryana"},
        "403": {"city": "Goa", "state": "Goa"}
    }
    
    if prefix in prefix_map:
        return prefix_map[prefix]

    # --- Fallback to Network API for rarer rural/tier-3 pincodes ---
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(f"https://api.postalpincode.in/pincode/{pincode}", headers=headers, timeout=5.0)
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0 and data[0].get("Status") == "Success":
            post_offices = data[0].get("PostOffice", [])
            if post_offices:
                po = post_offices[0]
                city = po.get("District") or po.get("Block") or "Unknown"
                state = po.get("State") or "Unknown"
                return {"city": city, "state": state}
                
    except Exception as e:
        print(f"[Error] Postal API Fallback Failed: {e}")
        
    return {"city": "Not Found", "state": "Unknown"}
