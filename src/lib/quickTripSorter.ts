// Smart activity ordering for Quick Trip
// Decides the best order to do a list of ad-hoc stops in a single day.

export type StopCategory = 'ACTIVE' | 'FOOD' | 'INDOOR_ENT' | 'CULTURAL' | 'SHOPPING' | 'OTHER';

export interface QuickStop {
  id: string;
  name: string;
  category: StopCategory;
  lat?: number;
  lng?: number;
  durationMins: number;
  /** For cinema/events: user picks a slot. Overrides smart ordering for this stop. */
  timeslot?: 'morning' | 'afternoon' | 'evening';
  placeData?: any;
}

/**
 * Each category has a preferred time window (hour in 24h).
 * Lower = earlier in the day.
 */
const CATEGORY_PREFERENCE: Record<StopCategory, number> = {
  ACTIVE:      8,   // Sports / outdoor — morning when energy is high
  CULTURAL:    9,   // Temples, monuments — cooler morning
  FOOD:        12,  // Lunch/dinner windows; will be re-adjusted based on neighbours
  INDOOR_ENT:  14,  // Cinema, bowling, museums — afternoon
  SHOPPING:    16,  // Markets, malls — afternoon/evening
  OTHER:       11,  // Default mid-morning
};

const TIMESLOT_HOUR: Record<string, number> = {
  morning:   9,
  afternoon: 14,
  evening:   19,
};

/**
 * Detect category from a raw place category string (from Google Places / our backend).
 */
export function detectCategory(rawCategory: string): StopCategory {
  const c = rawCategory.toLowerCase();
  if (/sport|gym|football|cricket|badminton|pool|bowling|fitness|yoga|park|ground/.test(c)) return 'ACTIVE';
  if (/restaurant|food|cafe|dhaba|biryani|bar|pub|bakery|dessert|sweet|snack|pizza|burger|tea|chai/.test(c)) return 'FOOD';
  if (/cinema|movie|theatre|pvr|inox|imax|multiplex|escape room|laser/.test(c)) return 'INDOOR_ENT';
  if (/temple|church|mosque|monument|museum|fort|palace|heritage|gallery|culture|historical/.test(c)) return 'CULTURAL';
  if (/mall|market|shop|store|bazaar|emporium/.test(c)) return 'SHOPPING';
  return 'OTHER';
}

import { getDistanceInKm } from './travelCost';

export function smartSortStops(stops: QuickStop[], startLat?: number, startLng?: number): QuickStop[] {
  if (stops.length <= 1) return stops;

  // Separate fixed (timeslot) vs. flexible
  const fixed = stops
    .filter(s => s.timeslot)
    .sort((a, b) => TIMESLOT_HOUR[a.timeslot!] - TIMESLOT_HOUR[b.timeslot!]);

  const flexible = stops.filter(s => !s.timeslot);

  // We want to minimize travel time (nearest neighbor), but we also have category preferences.
  // Let's do a greedy approach: from current location, pick the "best" next stop.
  // Best = lowest score. Score = distance (km) + time penalty.
  // Time penalty = (IdealHour - CurrentHour)^2. We estimate CurrentHour by adding ~2 hours per stop.

  const result: QuickStop[] = [];
  let currentLat = startLat;
  let currentLng = startLng;
  let currentHour = 9; // assume start at 9 AM
  
  const remainingFlexible = [...flexible];
  let fixedIdx = 0;

  // How many total stops we have to place
  const totalStops = stops.length;

  for (let step = 0; step < totalStops; step++) {
    // Should we place a fixed stop now?
    if (fixedIdx < fixed.length) {
      const nextFixed = fixed[fixedIdx];
      // If the fixed stop's timeslot is due, or if we have no flexible stops left
      if (remainingFlexible.length === 0 || TIMESLOT_HOUR[nextFixed.timeslot!] <= currentHour + 1) {
        result.push(nextFixed);
        currentLat = nextFixed.lat;
        currentLng = nextFixed.lng;
        currentHour += (nextFixed.durationMins / 60) + 0.5; // +30 mins travel
        fixedIdx++;
        continue;
      }
    }

    // Otherwise, pick the best flexible stop
    if (remainingFlexible.length > 0) {
      if (!currentLat || !currentLng) {
        // If no start location, just pick the one with earliest category preference
        remainingFlexible.sort((a, b) => CATEGORY_PREFERENCE[a.category] - CATEGORY_PREFERENCE[b.category]);
        const next = remainingFlexible.shift()!;
        result.push(next);
        currentLat = next.lat;
        currentLng = next.lng;
        currentHour += (next.durationMins / 60) + 0.5;
        continue;
      }

      // Nearest neighbor with category penalty
      let bestIdx = 0;
      let minScore = Infinity;

      for (let i = 0; i < remainingFlexible.length; i++) {
        const candidate = remainingFlexible[i];
        let distance = 0;
        if (candidate.lat && candidate.lng) {
           distance = getDistanceInKm(currentLat, currentLng, candidate.lat, candidate.lng);
        }
        
        // Category penalty: if we visit a dinner place at 10 AM, penalty is high.
        // We give distance more weight (e.g. 5km = 5 points).
        // 1 hour difference = 2 points.
        const idealHour = CATEGORY_PREFERENCE[candidate.category];
        const hourDiff = Math.abs(idealHour - currentHour);
        const penalty = hourDiff * 2;
        
        const score = distance + penalty;

        if (score < minScore) {
          minScore = score;
          bestIdx = i;
        }
      }

      const next = remainingFlexible.splice(bestIdx, 1)[0];
      result.push(next);
      currentLat = next.lat;
      currentLng = next.lng;
      currentHour += (next.durationMins / 60) + 0.5;
    }
  }

  return result;
}

export function comfortSortStops(stops: QuickStop[], startLat?: number, startLng?: number): QuickStop[] {
  if (stops.length <= 1) return stops;

  const fixed = stops
    .filter(s => s.timeslot)
    .sort((a, b) => TIMESLOT_HOUR[a.timeslot!] - TIMESLOT_HOUR[b.timeslot!]);

  const flexible = stops.filter(s => !s.timeslot);
  const result: QuickStop[] = [];
  let currentLat = startLat;
  let currentLng = startLng;
  let currentHour = 9; 
  
  const remainingFlexible = [...flexible];
  let fixedIdx = 0;
  const totalStops = stops.length;
  
  // High energy categories that cause fatigue
  const highEnergy = new Set(['ACTIVE', 'SHOPPING']);
  let lastWasHighEnergy = false;

  for (let step = 0; step < totalStops; step++) {
    if (fixedIdx < fixed.length) {
      const nextFixed = fixed[fixedIdx];
      if (remainingFlexible.length === 0 || TIMESLOT_HOUR[nextFixed.timeslot!] <= currentHour + 1) {
        result.push(nextFixed);
        currentLat = nextFixed.lat;
        currentLng = nextFixed.lng;
        currentHour += (nextFixed.durationMins / 60) + 0.5;
        lastWasHighEnergy = highEnergy.has(nextFixed.category);
        fixedIdx++;
        continue;
      }
    }

    if (remainingFlexible.length > 0) {
      if (!currentLat || !currentLng) {
        remainingFlexible.sort((a, b) => CATEGORY_PREFERENCE[a.category] - CATEGORY_PREFERENCE[b.category]);
        const next = remainingFlexible.shift()!;
        result.push(next);
        currentLat = next.lat;
        currentLng = next.lng;
        currentHour += (next.durationMins / 60) + 0.5;
        lastWasHighEnergy = highEnergy.has(next.category);
        continue;
      }

      let bestIdx = 0;
      let minScore = Infinity;

      for (let i = 0; i < remainingFlexible.length; i++) {
        const candidate = remainingFlexible[i];
        let distance = 0;
        if (candidate.lat && candidate.lng) {
           distance = getDistanceInKm(currentLat, currentLng, candidate.lat, candidate.lng);
        }
        
        const idealHour = CATEGORY_PREFERENCE[candidate.category];
        const hourDiff = Math.abs(idealHour - currentHour);
        const penalty = hourDiff * 2;
        
        // Comfort penalty: strongly penalize back-to-back high energy activities
        const isHighEnergy = highEnergy.has(candidate.category);
        const comfortPenalty = (lastWasHighEnergy && isHighEnergy) ? 15 : 0;
        
        const score = distance + penalty + comfortPenalty;

        if (score < minScore) {
          minScore = score;
          bestIdx = i;
        }
      }

      const next = remainingFlexible.splice(bestIdx, 1)[0];
      result.push(next);
      currentLat = next.lat;
      currentLng = next.lng;
      currentHour += (next.durationMins / 60) + 0.5;
      lastWasHighEnergy = highEnergy.has(next.category);
    }
  }

  return result;
}

/**
 * Given the sorted stops and a start time (default 9:00 AM),
 * compute each stop's arrival time and departure time.
 */
export function buildTimeline(
  stops: QuickStop[],
  travelMinsPerLeg: number[],
  startHour = 9
): Array<{ stop: QuickStop; arrivalTime: string; departureTime: string }> {
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const base = new Date();
  base.setHours(startHour, 0, 0, 0);
  let cursor = new Date(base);

  return stops.map((stop, i) => {
    // Add travel from previous stop
    if (i > 0) {
      const travelMins = travelMinsPerLeg[i - 1] || 10;
      cursor = new Date(cursor.getTime() + travelMins * 60000);
    }

    const arrival = new Date(cursor);
    cursor = new Date(cursor.getTime() + stop.durationMins * 60000);
    const departure = new Date(cursor);

    return {
      stop,
      arrivalTime: formatTime(arrival),
      departureTime: formatTime(departure),
    };
  });
}
