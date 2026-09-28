import uuid


def new_id() -> str:
    """Generates a new primary-key string. Prisma used cuid() app-side (no DB
    default), so newly-inserted rows from Python just need a unique string —
    format compatibility with existing cuids isn't required, only uniqueness."""
    return uuid.uuid4().hex
