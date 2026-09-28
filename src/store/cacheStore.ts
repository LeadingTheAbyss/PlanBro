import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CacheState {
  cache: Record<string, any>;
  setCache: (key: string, data: any) => void;
  getCache: (key: string) => any;
  clearCache: () => void;
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      setCache: (key, data) => set((state) => ({ cache: { ...state.cache, [key]: data } })),
      getCache: (key) => get().cache[key],
      clearCache: () => set({ cache: {} }),
    }),
    {
      name: 'trip-api-cache',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
