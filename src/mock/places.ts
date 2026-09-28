import { Place } from '../types/trip';

export const mockPlaces: Place[] = [
  {
    id: 'p_1',
    name: 'Amber Fort',
    category: 'historical',
    entryFee: 100,
    visitDurationHours: 3,
    travelTimeHours: 0.5,
    rating: 4.7,
    safetyScore: 9,
    weatherScore: 7,
    crowdScore: 5,
    recommendationScore: 95
  },
  {
    id: 'p_2',
    name: 'Solang Valley',
    category: 'nature',
    entryFee: 1500, // Includes activities
    visitDurationHours: 5,
    travelTimeHours: 1,
    rating: 4.9,
    safetyScore: 8,
    weatherScore: 5, // Highly weather dependent
    crowdScore: 6,
    recommendationScore: 90
  },
  {
    id: 'p_3',
    name: 'Local Market',
    category: 'shopping',
    entryFee: 0,
    visitDurationHours: 2,
    travelTimeHours: 0.2,
    rating: 4.5,
    safetyScore: 7,
    weatherScore: 8,
    crowdScore: 9, // Crowded
    recommendationScore: 80
  },
  {
    id: 'p_4',
    name: 'Jal Mahal',
    category: 'historical',
    entryFee: 50,
    visitDurationHours: 1,
    travelTimeHours: 0.5,
    rating: 4.6,
    safetyScore: 9,
    weatherScore: 8,
    crowdScore: 6,
    recommendationScore: 85
  }
];
