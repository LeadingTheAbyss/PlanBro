# Fixes Log

Running log of fixes and cleanups made to this codebase on request.

---

## 2026-09-28

### 1. Removed dead `/api/dev/download-schedules` endpoint

**File:** [api.py](api.py)

Unauthenticated dev helper that downloaded DataMeet's `schedules.json` to a hardcoded local path.

- Confirmed unused — live train data comes from RailRadar via `services/live_trains_api.py`.
- Also dropped the now-unused `urllib.request` import.

### 2. Added drag-lock conflict resolution for collaborative itinerary editing

**Files:** [api.py](api.py), [src/app/plan/itinerary/page.tsx](src/app/plan/itinerary/page.tsx), [src/components/itinerary/SortablePlaceCard.tsx](src/components/itinerary/SortablePlaceCard.tsx)

Previously `DRAG_START`/`DRAG_END` were purely cosmetic broadcasts with no real locking, so simultaneous drags on the same card would race and whoever's `SYNC_STATE` landed last silently won.

**2.1. Server-side lock**
- Tracks `drag_locks: {room_id: {placeId: userId}}`.
- First `DRAG_START` for a place wins the lock.
- Later `DRAG_START`s for the same place from other users are rejected (`DRAG_REJECTED`) instead of broadcast.
- Lock is released on `DRAG_END` or disconnect.

**2.2. Client-side enforcement**
- Disables `useSortable` (`lockedByOther`) for any card another user has locked, so it can't even be picked up.
- Client-side guard in `handleDragStart` plus a `DRAG_REJECTED` handler as a race-condition safety net.

### 3. Removed unused/insecure debug endpoints

**File:** [api.py](api.py)

Removed: `/api/debug-db-cache`, `/api/debug-key`, `/api/debug-email`, `/api/clear-cache`, `/api/debug-places`, `/api/test-import`.

- None were referenced anywhere in `src/` or `next.config.ts`.
- **Notable risk:** `/api/clear-cache` was an **unauthenticated GET** that could `FLUSHDB` Redis and `TRUNCATE` the `PlaceCache`/`Hotel` Postgres tables — a live destructive-action risk with no auth guard.
- `/api/route-matrix` was confirmed in active use (called from `VisualJourneyMap.tsx`, proxied in `next.config.ts`) and left untouched.

### 4. Removed dead hardcoded `TripState` stub from `/api/places` and `/api/food`

**Files:** [api.py](api.py), [engines/ranking_engine.py](engines/ranking_engine.py)

Both endpoints built a fake `TripState` (`trip_id="T1"`, `source_city="Delhi"`, empty passengers, fixed 3-day window, flat ₹50,000 budget) on every call, regardless of the actual user's trip.

- Confirmed `rank_places`/`rank_food` never referenced the `trip` argument internally — it was dead weight passed through only to satisfy the function signature.
- Removed the `trip: TripState` parameter from both `rank_places` and `rank_food` in `engines/ranking_engine.py`.
- Removed the fabricated `TripState` construction from both `/api/places` and `/api/food` in `api.py`.
- `rank_hotels` still takes `trip: TripState` and was left untouched (out of scope, not confirmed unused).
