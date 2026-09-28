import datetime

def log_cache_event(service: str, event_type: str, layer: str, key: str, msg: str = ""):
    """
    Appends a cache hit/miss to cache_stats.log
    Example: [GooglePlaces] [HIT] [Redis] hotels_mumbai...
    """
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] [{service}] [{event_type}] [{layer}] {key} {msg}\n"
    try:
        with open("cache_stats.log", "a", encoding="utf-8") as f:
            f.write(log_line)
        print(log_line.strip())
    except Exception:
        pass
