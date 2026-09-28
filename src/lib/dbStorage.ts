import { StateStorage } from 'zustand/middleware';

const saveTimeouts: Record<string, NodeJS.Timeout> = {};

export const dbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const planId = new URLSearchParams(window.location.search).get('planId');
      const storeName = planId ? `shared-${planId}:${name}` : name;
      const res = await fetch(`/api/state?name=${storeName}`);
      if (res.ok) {
        const data = await res.json();
        return data.value;
      }
      return null;
    } catch (error) {
      console.error(`Error loading state for ${name} from DB:`, error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    // Clear existing timeout for this specific store
    if (saveTimeouts[name]) {
      clearTimeout(saveTimeouts[name]);
    }

    // Debounce the save by 1 second to prevent spamming the database
    saveTimeouts[name] = setTimeout(async () => {
      try {
        const planId = new URLSearchParams(window.location.search).get('planId');
        const storeName = planId ? `shared-${planId}:${name}` : name;
        await fetch(`/api/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: storeName, value }),
        });
      } catch (error) {
        console.error(`Error saving state for ${name} to DB:`, error);
      }
    }, 1000);
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    if (saveTimeouts[name]) {
      clearTimeout(saveTimeouts[name]);
    }
    
    try {
      const planId = new URLSearchParams(window.location.search).get('planId');
      const storeName = planId ? `shared-${planId}:${name}` : name;
      await fetch(`/api/state?name=${storeName}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Error deleting state for ${name} from DB:`, error);
    }
  },
};
