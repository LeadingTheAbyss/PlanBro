export type TripMode = 'recommend' | 'direct';

export type Trip = {
  id: string;
  mode: TripMode;
  source: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
};

export type Passenger = {
  id: string;
  tripId: string;
  name: string;
  age: number;
  gender?: 'male' | 'female' | 'other';
  pincode: string;
  city: string;
  transportPreference: 'flight' | 'train' | 'bus' | 'cab' | 'any';
  remember?: boolean;
};

export type TransportOption = {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'car' | 'cab';
  source: string;
  destination: string;
  price: number;
  duration: string;
  departure: string;
  arrival: string;
  comfortScore: number;
  safetyScore: number;
  recommendationScore: number;
  priceBreakdown?: Record<string, number>;
};

export type PlaceCategory = 'historical' | 'nature' | 'adventure' | 'religious' | 'food' | 'shopping' | 'nightlife' | 'museum' | 'beach' | 'mountain' | 'wildlife';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  entryFee: number;
  visitDurationHours: number;
  travelTimeHours: number; // Avg commute
  rating: number;
  reviewsCount?: number;
  safetyScore: number;
  weatherScore: number;
  crowdScore: number;
  recommendationScore: number;
  imageUrl?: string;
  lat?: number;
  lng?: number;
};

export type Hotel = {
  id: string;
  name: string;
  coordinates: [number, number];
  pricePerNight: number;
  distanceToCluster: number;
  safetyScore: number;
  comfortScore: number;
  recommendationScore: number;
  rating: number;
  imageUrl?: string;
  lat?: number;
  lng?: number;
};

export type ItineraryDay = {
  dayNumber: number;
  date: string;
  placeIds: string[];
  totalTimeHours: number;
  totalCost: number;
  exactTravelMins?: number;
  exactDistanceKm?: number;
  exactCommuteCost?: number;
  warnings: string[];
};
