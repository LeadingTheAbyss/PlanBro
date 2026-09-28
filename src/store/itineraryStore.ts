import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dbStorage } from '../lib/dbStorage';
import { Place, ItineraryDay } from '../types/trip';
import { useTripStore } from './tripStore';

interface ItineraryState {
  days: ItineraryDay[];
  selectedPlaces: Place[]; // Global bag of places selected
  isOptimizing: boolean;

  // Actions
  initializeDays: (numberOfDays: number, startDate: string) => void;
  
  addPlaceToBag: (place: Place) => void;
  removePlaceFromBag: (placeId: string) => void;

  assignPlaceToDay: (placeId: string, dayNumber: number) => void;
  removePlaceFromDay: (placeId: string, dayNumber: number) => void;
  movePlaceBetweenDays: (placeId: string, fromDay: number, toDay: number, newIndex?: number) => void;
  
  recalcDay: (dayNumber: number) => void;
  updateDayExacts: (dayNumber: number, exactTravelMins: number, exactDistanceKm: number, exactCommuteCost: number) => void;
  autoSchedule: () => void;
  batchAssign: (placeIds: string[], hotelCoords?: [number, number]) => Promise<void>;
  loadSnapshot: (snapshot: any) => void;
  reset: () => void;
}

export const useItineraryStore = create<ItineraryState>()(
  persist(
    (set, get) => ({
  days: [],
  selectedPlaces: [],
  isOptimizing: false,

  initializeDays: (numberOfDays, startDate) => {
    const newDays: ItineraryDay[] = Array.from({ length: numberOfDays }).map((_, i) => {
      // Very basic date parsing increment (for mock setup)
      const baseDate = new Date(startDate);
      baseDate.setDate(baseDate.getDate() + i);
      
      return {
        dayNumber: i + 1,
        date: baseDate.toISOString().split('T')[0],
        placeIds: [],
        totalTimeHours: 0,
        totalCost: 0,
        warnings: []
      };
    });
    set({ days: newDays });
  },

  addPlaceToBag: (place) => set((state) => {
    if (state.selectedPlaces.some(p => p.id === place.id)) return state;
    return { selectedPlaces: [...state.selectedPlaces, place] };
  }),

  removePlaceFromBag: (placeId) => set((state) => {
    // Also remove it from any day it was assigned to
    const newDays = state.days.map(d => ({
      ...d,
      placeIds: d.placeIds.filter(id => id !== placeId)
    }));

    return {
      selectedPlaces: state.selectedPlaces.filter(p => p.id !== placeId),
      days: newDays
    };
  }),

  assignPlaceToDay: (placeId, dayNumber) => set((state) => {
    const newDays = state.days.map(day => {
      if (day.dayNumber === dayNumber) {
        if (!day.placeIds.includes(placeId)) {
          return { ...day, placeIds: [...day.placeIds, placeId] };
        }
      }
      return day;
    });
    return { days: newDays };
  }),

  removePlaceFromDay: (placeId, dayNumber) => set((state) => {
    const newDays = state.days.map(day => {
      if (day.dayNumber === dayNumber) {
        return { ...day, placeIds: day.placeIds.filter(id => id !== placeId) };
      }
      return day;
    });
    return { days: newDays };
  }),

  movePlaceBetweenDays: (placeId, fromDay, toDay, newIndex) => set((state) => {
    let newDays = [...state.days];
    
    // Remove from old day
    newDays = newDays.map(day => {
      if (day.dayNumber === fromDay) {
        return { ...day, placeIds: day.placeIds.filter(id => id !== placeId) };
      }
      return day;
    });

    // Add to new day
    newDays = newDays.map(day => {
      if (day.dayNumber === toDay) {
        let ids = [...day.placeIds];
        // Ensure no duplicates by removing the placeId if it somehow already exists
        ids = ids.filter(id => id !== placeId);
        
        if (newIndex !== undefined) {
          // Adjust newIndex if necessary, but typically standard array splice works
          ids.splice(newIndex, 0, placeId);
        } else {
          ids.push(placeId);
        }
        return { ...day, placeIds: ids };
      }
      return day;
    });

    return { days: newDays };
  }),

  recalcDay: (dayNumber) => set((state) => {
    const day = state.days.find(d => d.dayNumber === dayNumber);
    if (!day) return state;

    // Grab actual place data from the selectedPlaces bag
    const placesInDay = day.placeIds.map(id => state.selectedPlaces.find(p => p.id === id)).filter(Boolean) as Place[];

    let totalTime = 0;
    let totalCost = 0;
    
    placesInDay.forEach(p => {
      totalTime += ((p.visitDurationHours || 1) + (p.travelTimeHours || 0));
      totalCost += p.entryFee || 0;
    });

    const warnings: string[] = [];
    if (totalTime > 8) warnings.push('This day is getting too packed (>8 hours)');

    const newDays = state.days.map(d => 
      d.dayNumber === dayNumber ? { ...d, totalTimeHours: totalTime, totalCost, warnings } : d
    );

    return { days: newDays };
  }),

  updateDayExacts: (dayNumber, exactTravelMins, exactDistanceKm, exactCommuteCost) => set((state) => {
    const newDays = state.days.map(d => 
      d.dayNumber === dayNumber 
        ? { ...d, exactTravelMins, exactDistanceKm, exactCommuteCost } 
        : d
    );
    return { days: newDays };
  }),

  autoSchedule: () => set((state) => {
    const newDays = JSON.parse(JSON.stringify(state.days)) as ItineraryDay[];
    const assignedPlaceIds = new Set(newDays.flatMap(d => d.placeIds));
    const unassignedPlaces = state.selectedPlaces.filter(p => !assignedPlaceIds.has(p.id));

    if (unassignedPlaces.length === 0) return state;

    let currentDayIndex = 0;

    for (const place of unassignedPlaces) {
      let placed = false;
      const placeTime = (place.visitDurationHours || 1) + (place.travelTimeHours || 0);
      
      for (let i = currentDayIndex; i < newDays.length; i++) {
        const day = newDays[i];
        if (day.totalTimeHours + placeTime <= 8) {
          day.placeIds.push(place.id);
          day.totalTimeHours += placeTime;
          day.totalCost += place.entryFee;
          placed = true;
          currentDayIndex = i;
          break;
        }
      }

      if (!placed && newDays.length > 0) {
        const dayToFill = newDays[currentDayIndex] || newDays[newDays.length - 1];
        dayToFill.placeIds.push(place.id);
        dayToFill.totalTimeHours += placeTime;
        dayToFill.totalCost += place.entryFee;
        if (dayToFill.totalTimeHours > 8) {
          dayToFill.warnings = ['This day is getting too packed (>8 hours)'];
        }
      }
    }

    return { days: newDays };
  }),

  batchAssign: async (placeIds, hotelCoords) => {
    set({ isOptimizing: true });
    
    try {
      const state = get();
      const placesToAssign = state.selectedPlaces.filter(p => placeIds.includes(p.id));
      if (placesToAssign.length === 0) return;
      
      const tripPassengers = useTripStore.getState().passengers;
      const payload = {
        places: placesToAssign,
        days_count: state.days.length,
        hotel_coords: hotelCoords || null,
        passengers: tripPassengers.map(p => ({ id: p.id, age: p.age, gender: p.gender })),
      };

      const res = await fetch('/api/optimize_itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        const assignments = data.assignments || {};
        
        // Apply assignments
        set((currentState) => {
          const newDays = JSON.parse(JSON.stringify(currentState.days)) as ItineraryDay[];
          
          for (const [placeId, dayNumber] of Object.entries(assignments)) {
            const day = newDays.find(d => d.dayNumber === Number(dayNumber));
            if (day && !day.placeIds.includes(placeId)) {
              day.placeIds.push(placeId);
            }
          }
          return { days: newDays };
        });
        
        // Recalc all days
        get().days.forEach(d => get().recalcDay(d.dayNumber));
      }
    } catch (e) {
      console.error("OR-Tools routing failed:", e);
    } finally {
      set({ isOptimizing: false });
    }
  },

  loadSnapshot: (snapshot) => set({
    days: snapshot.itinerary || [],
    selectedPlaces: snapshot.selectedPlaces || []
  }),

  reset: () => set({
    days: [],
    selectedPlaces: []
  })
  }),
  {
    name: 'itinerary-store', // name of the item in the storage (must be unique)
    storage: createJSONStorage(() => dbStorage),
  }
));
