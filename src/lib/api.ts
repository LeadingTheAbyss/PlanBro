const BASE_URL = '/api';

const apiCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const api = {
  clearCache: () => apiCache.clear(),
  getCityFromPincode: async (pincode: string) => {
    try {
      const res = await fetch(`${BASE_URL}/pincode/${pincode}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("Failed to fetch city from pincode:", e);
      return null;
    }
  },

  getRecommendations: async (preferences: any) => {
    try {
      const res = await fetch(`${BASE_URL}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      return [];
    }
  },

  getTransportOptions: async (source: string, destination: string, mode?: string, checkOnly?: boolean, signal?: AbortSignal) => {
    try {
      const modeParam = mode ? `&mode=${encodeURIComponent(mode)}` : '';
      const checkParam = checkOnly ? `&check_only=true` : '';
      const url = `${BASE_URL}/transport?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}${modeParam}${checkParam}`;
      
      const cached = apiCache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
      
      const res = await fetch(url, { signal });
      if (!res.ok) return { options: [], cross_routes: [] };
      const data = await res.json();
      if (data && data.options && data.options.length > 0) apiCache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Failed to fetch transport options:", e);
      return [];
    }
  },

  getPlaces: async (destination: string, budget?: number, startDate?: string, endDate?: string, checkOnly?: boolean, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ destination });
      if (budget) params.append('budget', String(budget));
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (checkOnly) params.append('check_only', 'true');
      const url = `${BASE_URL}/places?${params.toString()}`;
      
      const cached = apiCache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
      
      const res = await fetch(url, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.length > 0) apiCache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Failed to fetch places:", e);
      return [];
    }
  },

  getFood: async (destination: string, budget?: number, startDate?: string, endDate?: string, checkOnly?: boolean, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ destination });
      if (budget) params.append('budget', String(budget));
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (checkOnly) params.append('check_only', 'true');
      const res = await fetch(`${BASE_URL}/food?${params.toString()}`, { signal });
      if (!res.ok) {
        if (res.status === 429) alert('Rate limit exceeded for Food API.');
        else if (res.status === 401) alert('You must be logged in.');
        return [];
      }
      return await res.json();
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Failed to fetch food:", e);
      return [];
    }
  },

  getHotels: async (destination: string, places: Array<{lat: number, lon: number}> = [], budget?: number, startDate?: string, endDate?: string, checkOnly?: boolean, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ destination });
      if (places.length > 0) {
        const coordsStr = places.map(p => `${p.lat},${p.lon}`).join('|');
        params.append('place_coords', coordsStr);
      }
      if (budget) params.append('budget', String(budget));
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (checkOnly) params.append('check_only', 'true');
      const url = `${BASE_URL}/hotels?${params.toString()}`;
      
      const cached = apiCache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
      
      const res = await fetch(url, { signal });
      if (!res.ok) return { hotels: [], recommendation: null };
      const data = await res.json();
      if (data && data.hotels && data.hotels.length > 0) apiCache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Failed to fetch hotels:", e);
      return { hotels: [], recommendation: null };
    }
  },
  
  searchCity: async (q: string) => {
    try {
      const url = `${BASE_URL}/search-city?q=${encodeURIComponent(q)}`;
      const cached = apiCache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;

      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.length > 0) apiCache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (e) {
      console.error("Failed to search city:", e);
      return [];
    }
  },

  buildAiItinerary: async (places: any[], numDays: number) => {
    try {
      const res = await fetch(`${BASE_URL}/itinerary/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places, num_days: numDays }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error("Failed to build AI itinerary:", e);
      return null;
    }
  }
};
