import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dbStorage } from '../lib/dbStorage';
import { TripMode, Passenger, Hotel } from '../types/trip';

interface TripState {
  mode: TripMode | null;
  source: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  
  passengers: Passenger[];
  selectedTransports: { passengerId: string; transportOptionId: string; cost: number; transport?: any }[];
  selectedHotel: Hotel | null;
  attemptId: string | null;

  // Actions
  setTripDetails: (details: Partial<Pick<TripState, 'mode' | 'source' | 'destination' | 'startDate' | 'endDate' | 'selectedTransports' | 'selectedHotel'>>) => void;
  
  addPassenger: (passenger: Passenger) => void;
  removePassenger: (id: string) => void;
  updatePassenger: (id: string, updates: Partial<Passenger>) => void;
  duplicatePassenger: (id: string, newId: string) => void;
  selectTransport: (passengerId: string, option: any) => void;
  deselectTransport: (passengerId: string) => void;
  setHotel: (hotel: Hotel | null) => void;
  loadSnapshot: (snapshot: any, destination: string) => void;
  logTripAttempt: (stepReached: string) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      mode: null,
      source: '',
      destination: '',
      startDate: null,
      endDate: null,
      
      passengers: [],
      selectedTransports: [],
      selectedHotel: null,
      attemptId: null,

      setTripDetails: (details) => set((state) => {
        // Destination/source changes invalidate everything; callers handle the full
        // cache/queue reset, this store only needs to drop stale selections here.
        const destinationChanged =
          (!!details.source && details.source !== state.source) ||
          (!!details.destination && details.destination !== state.destination);

        // Date-only changes only affect transport — hotels aren't date-bound here.
        const datesChanged =
          (!!details.startDate && details.startDate !== state.startDate) ||
          (!!details.endDate && details.endDate !== state.endDate);

        const newState = { ...state, ...details };

        if (destinationChanged) {
          if (details.selectedTransports === undefined) newState.selectedTransports = [];
          if (details.selectedHotel === undefined) newState.selectedHotel = null;
        } else if (datesChanged) {
          if (details.selectedTransports === undefined) newState.selectedTransports = [];
        }

        return newState;
      }),

      addPassenger: (passenger) => set((state) => ({
        passengers: [...state.passengers, passenger]
      })),

      removePassenger: (id) => set((state) => ({
        passengers: state.passengers.filter(p => p.id !== id),
        selectedTransports: state.selectedTransports.filter(t => t.passengerId !== id)
      })),

      updatePassenger: (id, updates) => set((state) => ({
        passengers: state.passengers.map(p => (p.id === id ? { ...p, ...updates } : p))
      })),

      duplicatePassenger: (id, newId) => set((state) => {
        const existing = state.passengers.find(p => p.id === id);
        if (!existing) return state;
        
        const clone: Passenger = { 
          ...existing, 
          id: newId, 
          name: `${existing.name} (Copy)` 
        };
        return { passengers: [...state.passengers, clone] };
      }),

      selectTransport: (passengerId, option) => set((state) => {
        const newSelection = {
          passengerId,
          transportOptionId: option.id,
          cost: option.price,
          transport: option
        };
        return {
          selectedTransports: [
            ...state.selectedTransports.filter(t => t.passengerId !== passengerId),
            newSelection
          ]
        };
      }),

      deselectTransport: (passengerId) => set((state) => ({
        selectedTransports: state.selectedTransports.filter(t => t.passengerId !== passengerId)
      })),

      setHotel: (hotel) => set({ selectedHotel: hotel }),

      loadSnapshot: (snapshot, destination) => set({
        ...snapshot,
        destination
      }),

      logTripAttempt: async (stepReached: string) => {
        const state = get();
        try {
          const res = await fetch('/api/trip-attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attemptId: state.attemptId,
              destination: state.destination,
              stepReached
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.attemptId && data.attemptId !== state.attemptId) {
              set({ attemptId: data.attemptId });
            }
          }
        } catch (e) {
          console.error('Failed to log trip attempt', e);
        }
      },

      reset: () => set({
        mode: null,
        source: '',
        destination: '',
        startDate: null,
        endDate: null,
        passengers: [],
        selectedTransports: [],
        selectedHotel: null,
        attemptId: null
      })
    }),
    {
      name: 'trip-store', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => dbStorage),
    }
  )
);
