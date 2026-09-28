import re
import unicodedata

from backend.db import get_pool

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name or "")
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = _NON_ALNUM.sub("_", ascii_only).strip("_")[:20]
    return slug or "traveler"


async def generate_unique_username(name: str) -> str:
    base = _slugify(name)
    candidate = base
    suffix = 1
    pool = await get_pool()
    while await pool.fetchval('SELECT id FROM "User" WHERE username = $1', candidate):
        suffix += 1
        candidate = f"{base}{suffix}"[:20]
    return candidate
