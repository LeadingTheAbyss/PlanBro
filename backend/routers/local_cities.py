import os
import re

from fastapi import APIRouter

router = APIRouter(prefix="/api/local-cities", tags=["local-cities"])

_cached_cities: list[dict] | None = None

_COORD_RE = re.compile(r"^[0-9.\-]+,[0-9.\-]+$")


def _parse_cities() -> list[dict]:
    file_path = os.path.join(os.getcwd(), "all_cities.txt")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = [l.strip() for l in content.split("\n") if l.strip()]

    cities: list[dict] = []
    current_city: dict | None = None

    for line in lines:
        if line.startswith("📍"):
            raw = line.replace("📍", "").strip()
            name = ""
            state = ""

            parts = [p.strip() for p in re.split(r"[:,]", raw)]
            first_part = parts[0]

            if " in " in first_part:
                split_in = first_part.split(" in ")
                name = split_in[0].strip()
                state = split_in[1].strip()
                if state.lower() == "india":
                    state = ""
            else:
                name = first_part

            if not state and "," in raw:
                comma_parts = [p.strip() for p in raw.split(",")]
                if len(comma_parts) >= 3 and comma_parts[-1].lower() == "india":
                    state = comma_parts[-2]
                elif len(comma_parts) >= 2:
                    state = comma_parts[1]

            if state.lower() == "india":
                state = ""
            if len(state) > 25:
                state = ""

            current_city = {
                "name": name,
                "state": state,
                "display": f"{name} ({state})" if state else name,
            }
        elif current_city and _COORD_RE.match(line):
            lat_str, lng_str = line.split(",")
            current_city["lat"] = float(lat_str)
            current_city["lng"] = float(lng_str)
            current_city["osrm_coords"] = f"{lng_str},{lat_str}"

            existing_index = next(
                (i for i, c in enumerate(cities) if c["name"].lower() == current_city["name"].lower()),
                None,
            )
            if existing_index is not None:
                if not cities[existing_index]["state"] and current_city["state"]:
                    cities[existing_index] = current_city
            else:
                cities.append(current_city)
            current_city = None

    cities.sort(key=lambda c: c["name"].lower())
    return cities


@router.get("")
async def get_local_cities():
    global _cached_cities
    if _cached_cities is not None:
        return _cached_cities

    try:
        _cached_cities = _parse_cities()
        return _cached_cities
    except Exception:
        return []
