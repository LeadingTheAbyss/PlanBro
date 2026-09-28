import { TransportOption, Place, Hotel } from '@/types/trip';
import { useAuthStore } from '@/store/authStore';

export const api = {
  getTransportOptions: async (source: string, destination: string, mode: string = "all", checkOnly: boolean = false): Promise<TransportOption[] | { status: string }> => {
    try {
      const response = await fetch(`/api/transport?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&mode=${mode}&check_only=${checkOnly}`);
      if (!response.ok) {
        if (response.status === 429) {
          alert('You have reached API Calls limit, higher API limits will be available for PlanBro Pro users from next week onwards.');
        } else if (response.status === 401) {
          alert('You must be logged in to search for transport.');
        }
        throw new Error('Network response was not ok');
      }
      
      // Sync the updated API calls in the auth store
      useAuthStore.getState().fetchUser();
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching transport options:', error);
      return { error: 'Failed to fetch transport options' } as any;
    }
  },

  getPlaces: async (destination: string, checkOnly: boolean = false): Promise<Place[] | { status: string }> => {
    try {
      const response = await fetch(`/api/places?destination=${encodeURIComponent(destination)}&check_only=${checkOnly}`);
      if (!response.ok) {
        if (response.status === 429) alert('You have reached API Calls limit, higher API limits will be available for PlanBro Pro users from next week onwards.');
        else if (response.status === 401) alert('You must be logged in.');
        throw new Error('Network response was not ok');
      }
      useAuthStore.getState().fetchUser();
      return await response.json();
    } catch (error) {
      console.error('Error fetching places:', error);
      return { error: 'Failed to fetch places' } as any;
    }
  },

  getFood: async (destination: string, checkOnly: boolean = false): Promise<Place[] | { status: string }> => {
    try {
      const response = await fetch(`/api/food?destination=${encodeURIComponent(destination)}&check_only=${checkOnly}`);
      if (!response.ok) {
        if (response.status === 429) alert('You have reached API Calls limit, higher API limits will be available for PlanBro Pro users from next week onwards.');
        else if (response.status === 401) alert('You must be logged in.');
        throw new Error('Network response was not ok');
      }
      useAuthStore.getState().fetchUser();
      return await response.json();
    } catch (error) {
      console.error('Error fetching food:', error);
      return { error: 'Failed to fetch food' } as any;
    }
  },

  getHotels: async (destination: string, clusterCoordinates?: any, checkOnly: boolean = false): Promise<Hotel[] | { status: string }> => {
    try {
      const response = await fetch(`/api/hotels?destination=${encodeURIComponent(destination)}&check_only=${checkOnly}`);
      if (!response.ok) {
        if (response.status === 429) alert('You have reached API Calls limit, higher API limits will be available for PlanBro Pro users from next week onwards.');
        else if (response.status === 401) alert('You must be logged in.');
        throw new Error('Network response was not ok');
      }
      useAuthStore.getState().fetchUser();
      return await response.json();
    } catch (error) {
      console.error('Error fetching hotels:', error);
      return { error: 'Failed to fetch hotels' } as any;
    }
  },

  getCityFromPincode: async (pincode: string): Promise<{ city: string; state: string } | null> => {
    try {
      const response = await fetch(`/api/pincode/${pincode}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error fetching city from pincode:', error);
      return { city: 'Unknown', state: 'Unknown' };
    }
  },

  getRecommendations: async (preferences: any): Promise<any[]> => {
    const response = await fetch(`/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Network response was not ok');
    }
    return await response.json();
  },

  searchCity: async (query: string): Promise<{ name: string; state: string; formatted_name: string; osrm_coords: string }[]> => {
    if (!query || query.length < 1) return [];
    try {
      const response = await fetch(`/api/search-city?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error searching city:', error);
      return [];
    }
  },

  olaSearch: async (query: string, city: string): Promise<Place[]> => {
    if (!query || !city) return [];
    try {
      const response = await fetch(`/api/ola-search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error Ola search:', error);
      return [];
    }
  }
};
