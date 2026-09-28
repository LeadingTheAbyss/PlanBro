import requests
import json
import re
import os
from dotenv import load_dotenv

def build_prompt(passengers: list, total_budget: int, days: int, preference: str, group_size: int = 1, constraints: str = "") -> str:
    cities = [p.get("city", "Unknown") for p in passengers if p.get("city")]
    city_str = ", ".join(cities) if cities else "various locations"
    num_pax = group_size if group_size > 0 else (len(cities) if cities else 1)
    
    per_person = total_budget // num_pax if num_pax > 0 else total_budget

    # Build a concrete guidance note per preference type so the model doesn't hallucinate
    # NOTE: cities within each list are in NO particular order — ranking must be based on budget fit and traveler context
    import random
    preference_lower = preference.lower()

    # Each entry: (keyword, city_list, exclusions)
    # exclusions = cities to explicitly avoid for this context
    guidance_rules = [
        ("non veg", ["Hyderabad (dum biryani)", "Kolkata (kosha mangsho, hilsa fish)", "Amritsar (tandoori chicken, fish)", "Goa (seafood)", "Chettinad (spicy non-veg curries)", "Mumbai (street non-veg)", "Old Delhi (kebabs)", "Lucknow (galouti kebab, shami kebab)"], []),
        ("veg",     ["Indore (poha, jalebi, pure veg street food)", "Ahmedabad (Gujarati thali, dhokla)", "Varanasi (kachori, lassi)", "Jaipur (dal baati churma)", "Mathura (pedas, sattvic food)", "Pushkar (pure veg city)", "Mysore (Udupi cuisine)", "Tirupati (prasadam, South Indian veg)", "Vrindavan (sattvic veg)"], ["Lucknow", "Hyderabad", "Kolkata", "Amritsar", "Goa", "Chettinad"]),
        ("food",    ["Hyderabad (biryani, Irani chai)", "Old Delhi (parathas, chaat)", "Amritsar (kulcha, tandoori)", "Kolkata (mishti doi, kathi rolls)", "Indore (poha, jalebi, street food)", "Mumbai (vada pav, street food)", "Chennai (dosas, filter coffee)", "Lucknow (Awadhi cuisine)", "Mysore", "Pune"], []),
        ("culinary",["Hyderabad (biryani, Irani chai)", "Old Delhi (parathas, chaat)", "Amritsar (kulcha, tandoori)", "Kolkata (mishti doi, kathi rolls)", "Indore (poha, jalebi, street food)", "Mumbai (vada pav, street food)", "Chennai (dosas, filter coffee)", "Lucknow (Awadhi cuisine)", "Mysore", "Pune"], []),
        ("mountains",["Ladakh", "Spiti Valley", "Manali", "Kasol", "Darjeeling", "Gangtok", "Shimla", "Mussoorie", "Almora", "Auli", "Dalhousie", "Nainital", "Ooty", "Kodaikanal", "Munnar"], []),
        ("beaches", ["Andaman Islands", "Gokarna", "Goa", "Varkala", "Pondicherry", "Lakshadweep", "Kovalam", "Vizag", "Puri", "Diu", "Tarkarli"], []),
        ("heritage",["Hampi", "Varanasi", "Agra", "Jaisalmer", "Mahabalipuram", "Jodhpur", "Khajuraho", "Udaipur", "Jaipur", "Fatehpur Sikri", "Mysore"], []),
        ("wildlife",["Kaziranga", "Bandhavgarh", "Jim Corbett", "Sundarbans", "Ranthambore", "Kanha", "Gir Forest", "Nagarhole", "Mudumalai"], []),
        ("spiritual",["Bodh Gaya", "Varanasi", "Shirdi", "Rishikesh", "Tirupati", "Haridwar", "Puri", "Amritsar", "Vrindavan", "Madurai"], []),
        ("adventure",["Spiti", "Bir Billing", "Rishikesh", "Ladakh", "Manali", "Chopta", "Coorg", "Wayanad"], []),
        ("romantic", ["Coorg", "Andaman", "Udaipur", "Munnar", "Pondicherry", "Ooty", "Goa", "Mussoorie", "Shimla"], []),
        ("nightlife",["Bengaluru", "Mumbai", "Goa", "Pune", "Delhi", "Hyderabad"], []),
    ]

    # Collect ALL matching contexts (not just first) so "food and veg" gets both hints
    matched_cities = []
    all_exclusions = []
    for keyword, city_list, exclusions in guidance_rules:
        # Use word boundaries so 'veg' doesn't match 'las vegas'
        if re.search(rf'\b{re.escape(keyword)}\b', preference_lower):
            shuffled = city_list[:]
            random.shuffle(shuffled)
            matched_cities.extend(shuffled)
            all_exclusions.extend(exclusions)

    guidance = ""
    if matched_cities:
        # Deduplicate while preserving order
        seen = set()
        unique_cities = [c for c in matched_cities if not (c in seen or seen.add(c))]
        guidance = f"\nCONTEXT — relevant cities (in NO particular order, rank by budget & traveler home city): {', '.join(unique_cities)}"
    if all_exclusions:
        unique_excl = list(dict.fromkeys(all_exclusions))
        guidance += f"\nDO NOT recommend these cities as they do NOT match the preference: {', '.join(unique_excl)}\n"

    return f"""
A group of {num_pax} travelers want to take a trip.
- Their home cities are: {city_str}
- Total budget for the entire group: ₹{total_budget}
- Budget per person: ₹{per_person}
- Duration: {days} days (excluding travel days)
- Their travel preference / vibe: "{preference}"
{guidance}
Recommend EXACTLY 10 destinations in India that best match the preference "{preference}".

{f"- HARD USER CONSTRAINTS: '{constraints}'\\n  You MUST respect these constraints. Destinations that violate these constraints are STRICTLY FORBIDDEN." if constraints else ""}
ALL recommended destinations MUST align with this preference. You MUST return exactly 10 destinations. If there are not enough strong matches, broaden your criteria slightly to provide exactly 10 solid recommendations.

Respond ONLY with a JSON object containing a "destinations" array, where each item matches this EXACT structure:
{{
  "destinations": [
    {{
      "id": "slug_name",
      "name": "Destination Name",
      "state": "State Name",
      "category": "food|mountains|beaches|heritage|desert|wildlife|spiritual|hills|adventure|romantic|nightlife|any",
      "tags": ["Tag1", "Tag2", "Tag3"],
      "why": "A 1-2 sentence personal explanation of why this place matches their preference, referencing their home city and budget.",
      "budgetEstimate": 0,
      "perPersonEstimate": 0,
      "matchScore": 92,
      "isPrimaryMatch": true
    }}
  ]
}}

Rules:
- STRICT GEOGRAPHY RULE: EVERY destination MUST be located within the country of India. DO NOT recommend foreign countries like Bhutan, Nepal, Sri Lanka, Maldives, or Dubai under any circumstances.
- name MUST be the actual city or place name ONLY (e.g. "Indore", "Goa", "Shimla"). DO NOT add descriptors.
- budgetEstimate MUST be the ACTUAL, realistic cost in INR for a standard mid-range trip for ALL {num_pax} people for {days} days (transport from {city_str}, stay, food). Provide a REAL number.
- CRITICAL RULE: The ₹{total_budget} is a MAXIMUM limit, NOT a target. Do NOT artificially inflate the cost! A cheap destination must still show a cheap budget (e.g., 15000) even if their limit is 100000.
- budgetEstimate MUST NOT exceed ₹{total_budget}.
- perPersonEstimate MUST equal (budgetEstimate / {num_pax}).
- matchScore MUST be an integer between 70 and 98 based on how well the destination matches. Do not include weak matches.
- The "why" explanation MUST be confident. Explain exactly why it fits the vibe.
- isPrimaryMatch must be true for all returned destinations.
- Return EXACTLY 10 UNIQUE and DISTINCT destinations. Do not repeat cities. No more, no less. Even if you have to stretch the definition of the preference, you MUST return 10 distinct, unique destinations.
- DO NOT use any emojis.
"""

CURRENT_GROQ_KEY_INDEX = 1

def call_ollama(prompt: str) -> str:
    global CURRENT_GROQ_KEY_INDEX
    system_prompt = "You are an expert Indian travel planner. Respond ONLY with valid JSON."
    
    # Re-read .env on every call so key changes are picked up without restarting the server
    load_dotenv(override=True)
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "max_tokens": 4000,
        "response_format": {"type": "json_object"}
    }
    
    keys_tried = 0
    while keys_tried < 9:
        groq_api_key = os.getenv(f"GROQ_API_KEY_{CURRENT_GROQ_KEY_INDEX}")
        
        if not groq_api_key or groq_api_key == "your_groq_api_key_here":
            print(f"[Groq] Key GROQ_API_KEY_{CURRENT_GROQ_KEY_INDEX} missing, skipping...")
            CURRENT_GROQ_KEY_INDEX = (CURRENT_GROQ_KEY_INDEX % 9) + 1
            keys_tried += 1
            continue
            
        print(f"[Groq] Using key index {CURRENT_GROQ_KEY_INDEX}: {groq_api_key[:8]}...")
        
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            res = requests.post(url, headers=headers, json=payload, timeout=60)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.HTTPError as http_err:
            if http_err.response.status_code == 429:
                print(f"[Groq] ⚠️ Key {CURRENT_GROQ_KEY_INDEX} rate-limited (429). Switching to next key...")
                CURRENT_GROQ_KEY_INDEX = (CURRENT_GROQ_KEY_INDEX % 9) + 1
                keys_tried += 1
                continue
            else:
                print(f"[Error] Groq API call failed: {http_err}")
                return f"EXCEPTION: {str(http_err)}"
        except Exception as e:
            print(f"[Error] Groq API call failed: {e}")
            return f"EXCEPTION: {str(e)}"
            
    return '{"error": "All Groq API Keys are missing or exhausted (429) for the day."}'


def parse_response(raw: str) -> list:
    if not raw:
        return []
    
    # Attempt 1: Direct parsing
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and "destinations" in data:
            return data["destinations"]
        elif isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
        
    # Attempt 2: Extract JSON object using regex
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            if isinstance(data, dict) and "destinations" in data:
                return data["destinations"]
    except json.JSONDecodeError:
        pass
        
    print("[Error] Failed to parse Ollama response as JSON array")
    print(raw.encode('ascii', 'replace').decode('ascii'))
    return []

def recommend(passengers: list, total_budget: int, days: int, preference: str, group_size: int = 0, constraints: str = "") -> list:
    # Resolve num_pax: use explicit group_size if provided, else fall back to city count
    cities = [p for p in passengers if p.get("city")]
    num_pax = group_size if group_size > 0 else (len(cities) if cities else 1)

    prompt = build_prompt(passengers, total_budget, days, preference, num_pax, constraints)
    raw_response = call_ollama(prompt)
    destinations = parse_response(raw_response)
    
    # Fallback if Ollama fails or returns invalid response
    if not destinations or not isinstance(destinations, list):
        error_details = raw_response[:300] if raw_response else "Empty response"
        return [
            {
                "id": "fallback_error",
                "name": "Service Unavailable",
                "state": "N/A",
                "category": preference,
                "tags": ["Error"],
                "why": f"Ollama failed. Details: {error_details}",
                "budgetEstimate": 0,
                "perPersonEstimate": 0,
                "matchScore": 0,
                "isPrimaryMatch": False
            }
        ]
        
    # --- Deduplicate by city name (the LLM sometimes repeats cities) ---
    seen_names = set()
    unique_destinations = []
    for dest in destinations:
        if not isinstance(dest, dict):
            continue
        name_key = dest.get("name", "").strip().lower()
        if name_key and name_key not in seen_names:
            seen_names.add(name_key)
            unique_destinations.append(dest)
            
    destinations = unique_destinations
    
    if not destinations:
        return [
            {
                "id": "fallback_error",
                "name": "Service Unavailable",
                "state": "N/A",
                "category": preference,
                "tags": ["Error"],
                "why": "Ollama failed to generate valid destinations. Please try again.",
                "budgetEstimate": 0,
                "perPersonEstimate": 0,
                "matchScore": 0,
                "isPrimaryMatch": False
            }
        ]

    # --- Realistic budget calculation ---
    # We now trust the LLM's estimate since we use a high-quality model,
    # but we still apply sanity checks and clamp to the user's max budget.
    COST_PER_PERSON_PER_DAY = {
        "mountains": 2500, "hills": 2500, "beaches": 3000,
        "heritage": 2000, "spiritual": 1800, "wildlife": 3500,
        "desert": 2800, "adventure": 3200, "food": 2200, "any": 2500,
    }
    TRANSPORT_COST_PER_PERSON = 2000

    for dest in destinations:
        if not isinstance(dest, dict):
            continue
        try:
            llm_estimate = int(dest.get("budgetEstimate", 0))
            
            category = str(dest.get("category", "any")).lower()
            daily_rate = COST_PER_PERSON_PER_DAY.get(category, 2500)
            fallback_total = (daily_rate * days + TRANSPORT_COST_PER_PERSON) * num_pax
            
            # Use LLM's estimate if it's > 0, otherwise fallback to the hardcoded baseline
            base_estimate = llm_estimate if llm_estimate > 0 else fallback_total
            
            # Clamp to the user's budget ceiling so we never exceed it
            budget_estimate = min(base_estimate, total_budget)
            dest["budgetEstimate"] = budget_estimate
            dest["perPersonEstimate"] = budget_estimate // num_pax
        except Exception as e:
            print(f"[Warn] Budget calc failed for {dest.get('name')}: {e}")

    return destinations

