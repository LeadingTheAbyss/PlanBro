// Shared travel cost utilities used by both VisualJourneyMap and QuickTrip

export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface CommutePricing {
  type: 'scooty/bike' | 'cab' | 'car' | 'walk';
  service: string;
  cost: number;
}

export function calculateCost(distanceKm: number, timeMins: number, paxCount: number, mode: string = 'cab'): CommutePricing {
  if (mode === 'walk') {
    return { type: 'walk', service: 'Walking', cost: 0 };
  }
  if (mode === 'personal_bike') {
    return { type: 'scooty/bike', service: 'Bike / Scooty', cost: 0 };
  }
  if (mode === 'personal_car') {
    return { type: 'car', service: 'Personal Car', cost: 0 };
  }

  // default 'cab' logic
  if (paxCount === 1 && distanceKm < 5) {
    let distanceCost = 0;
    if (distanceKm > 2) distanceCost = (distanceKm - 2) * 15;
    const totalFare = 35 + distanceCost + (timeMins * 0.22);
    return { type: 'scooty/bike', service: 'Rapido Bike', cost: Math.round(totalFare) };
  } else if (paxCount <= 4) {
    let distanceCost = distanceKm <= 20 ? distanceKm * 7 : (20 * 7) + ((distanceKm - 20) * 14);
    const totalFare = 40 + distanceCost + (timeMins * 1.50);
    return { type: 'cab', service: 'Uber Go', cost: Math.round(totalFare) };
  } else if (paxCount <= 6) {
    const distanceCost = distanceKm * 12;
    const totalFare = 60 + distanceCost + (timeMins * 2.50);
    return { type: 'cab', service: 'Uber XL (SUV)', cost: Math.round(totalFare) };
  } else {
    const cabsNeeded = Math.ceil(paxCount / 4);
    const distanceCost = distanceKm <= 20 ? distanceKm * 7 : (20 * 7) + ((distanceKm - 20) * 14);
    const costPerCab = 40 + distanceCost + (timeMins * 1.50);
    return { type: 'cab', service: `${cabsNeeded}x Uber Go`, cost: Math.round(costPerCab * cabsNeeded) };
  }
}

// ------------------------------------------------------------------------
// Advanced Urban Travel Time Estimator for Indian Cities
// ------------------------------------------------------------------------

export enum TransportModeEnum {
    WALK = 'WALK',
    BIKE = 'BIKE',
    CAR = 'CAR'
}

export interface TravelEstimate {
    distanceStraightLineKm: number;
    distanceRoadKm: number;
    averageSpeedKmph: number;
    travelTimeMinutes: number;
}

const CIRCUITY_BASE = 1.35;
const CIRCUITY_PENALTY = 1.15;
const CIRCUITY_DECAY = 1.555;

const WALK_SPEED_KMPH = 4.5;
const WALK_OVERHEAD_MINS = 0.0;

const BIKE_MIN_SPEED = 15.0;
const BIKE_MAX_SPEED = 35.0;
const BIKE_GAMMA = 0.25;
const BIKE_OVERHEAD_MINS = 1.5;

const CAR_MIN_SPEED = 10.0;
const CAR_MAX_SPEED = 48.0;
const CAR_GAMMA = 0.15;
const CAR_OVERHEAD_MINS = 4.0;

function calculateCircuityFactor(distanceEuclideanKm: number): number {
    if (distanceEuclideanKm === 0) return 1.0;
    return CIRCUITY_BASE + (CIRCUITY_PENALTY / (1 + CIRCUITY_DECAY * distanceEuclideanKm));
}

function calculateDynamicSpeed(
    distanceRoadKm: number, 
    minSpeed: number, 
    maxSpeed: number, 
    gamma: number
): number {
    return minSpeed + (maxSpeed - minSpeed) * (1 - Math.exp(-gamma * distanceRoadKm));
}

export function estimateTravelTime(
    distanceEuclideanKm: number, 
    mode: TransportModeEnum
): TravelEstimate {
    if (distanceEuclideanKm < 0.02) {
        return {
            distanceStraightLineKm: distanceEuclideanKm,
            distanceRoadKm: distanceEuclideanKm,
            averageSpeedKmph: WALK_SPEED_KMPH,
            travelTimeMinutes: 1
        };
    }

    const circuityFactor = calculateCircuityFactor(distanceEuclideanKm);
    const distanceRoadKm = distanceEuclideanKm * circuityFactor;

    let averageSpeedKmph = 0;
    let overheadMins = 0;

    switch (mode) {
        case TransportModeEnum.WALK:
            averageSpeedKmph = WALK_SPEED_KMPH;
            overheadMins = WALK_OVERHEAD_MINS;
            break;
        case TransportModeEnum.BIKE:
            averageSpeedKmph = calculateDynamicSpeed(distanceRoadKm, BIKE_MIN_SPEED, BIKE_MAX_SPEED, BIKE_GAMMA);
            overheadMins = BIKE_OVERHEAD_MINS;
            break;
        case TransportModeEnum.CAR:
            averageSpeedKmph = calculateDynamicSpeed(distanceRoadKm, CAR_MIN_SPEED, CAR_MAX_SPEED, CAR_GAMMA);
            overheadMins = CAR_OVERHEAD_MINS;
            break;
    }

    const timeInMotionHours = distanceRoadKm / averageSpeedKmph;
    const timeInMotionMinutes = timeInMotionHours * 60;
    let totalTravelTimeMinutes = timeInMotionMinutes + overheadMins;

    const MINIMUM_TIME_MAP: Record<TransportModeEnum, number> = {
        [TransportModeEnum.WALK]: 1,
        [TransportModeEnum.BIKE]: 3,
        [TransportModeEnum.CAR]: 5
    };
    
    totalTravelTimeMinutes = Math.max(totalTravelTimeMinutes, MINIMUM_TIME_MAP[mode]);

    return {
        distanceStraightLineKm: Number(distanceEuclideanKm.toFixed(3)),
        distanceRoadKm: Number(distanceRoadKm.toFixed(3)),
        averageSpeedKmph: Number(averageSpeedKmph.toFixed(2)),
        travelTimeMinutes: Math.ceil(totalTravelTimeMinutes)
    };
}
