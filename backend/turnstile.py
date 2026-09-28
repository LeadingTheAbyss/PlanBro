import httpx

from backend.config import get_settings

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile_token(token: str | None, ip: str | None = None) -> bool:
    if not token:
        return False

    settings = get_settings()
    if not settings.turnstile_secret_key:
        return False

    data = {"secret": settings.turnstile_secret_key, "response": token}
    if ip:
        data["remoteip"] = ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(VERIFY_URL, data=data)
            body = res.json()
            return body.get("success") is True
    except Exception:
        return False
