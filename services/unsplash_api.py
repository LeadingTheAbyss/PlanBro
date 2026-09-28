import os
import httpx
import asyncio
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Allow max 2 simultaneous requests
UNSPLASH_SEMAPHORE = None

def _get_unsplash_key() -> Optional[str]:
    key = os.getenv("UNSPLASH_API_KEY")
    if not key or "your_" in key:
        return None
    return key

async def fetch_unsplash_image(query: str) -> Optional[str]:
    api_key = _get_unsplash_key()
    if not api_key:
        print("[Unsplash] No API key found. Fallback to Wikimedia.")
        return None

    # Simplify query: Remove the last word if it's likely a city to increase hits
    parts = query.split()
    search_q = " ".join(parts[:-1]) if len(parts) > 1 else query
    
    async def _search(q_str):
        try:
            url = "https://api.unsplash.com/search/photos"
            params = {
                "client_id": api_key,
                "query": q_str,
                "orientation": "landscape",
                "per_page": 3
            }
            
            global UNSPLASH_SEMAPHORE
            if UNSPLASH_SEMAPHORE is None:
                UNSPLASH_SEMAPHORE = asyncio.Semaphore(2)
            async with UNSPLASH_SEMAPHORE:
                async with httpx.AsyncClient() as client:
                    res = await client.get(url, params=params, timeout=5.0)
                    # If rate limit exceeded (403/429), just return None
                    if res.status_code in [403, 429]:
                        print(f"[Unsplash] Rate limit hit.")
                        return None
                    res.raise_for_status()
                    data = res.json()
                
            results = data.get("results", [])
            if results:
                # Get regular size (1080w)
                return results[0].get("urls", {}).get("regular")
                
            return None
        except Exception as e:
            print(f"[Unsplash] Search failed for '{q_str}': {e}")
            return None

    # Try full query first
    url = await _search(query)
    if url:
        return url
        
    # Fallback to simplified query
    url = await _search(search_q)
    return url
