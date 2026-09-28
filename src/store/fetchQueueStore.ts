import { create } from 'zustand';

export type FetchTaskType = 'transport' | 'places' | 'food' | 'hotels';

export interface FetchTask {
  id: string; // Unique ID, e.g., "transport-pax1-flight"
  category: FetchTaskType; // e.g. "transport"
  subType?: string; // e.g., "flight", "train", "cab"
  paxId?: string; // For transport
  priority: number; // Lower number = higher priority. 0 = User clicked (Live Fetch). 1-10 = Background (Check Only).
  isLive: boolean; // If true, make the actual API call. If false, pass check_only=true
  status: 'idle' | 'loading' | 'completed' | 'error' | 'cache_miss';
  data?: any; // The fetched data
}

// fetching queue state

interface FetchQueueState {
  tasks: FetchTask[];
  isProcessing: boolean;
  
  // Actions
  enqueueTask: (task: Omit<FetchTask, 'status'>) => void;
  bumpPriority: (id: string) => void;
  clearTasksByCategory: (category: FetchTaskType) => void;
  updateTaskStatus: (id: string, status: FetchTask['status'], data?: any) => void;
  setProcessing: (status: boolean) => void;
  getNextTask: () => FetchTask | undefined;
  
  // Bulk initializer for background checking
  initBackgroundChecks: (trip: any) => void;
  clearQueue: ()  => void;
}

export const useFetchQueue = create<FetchQueueState>((set, get) => ({
  tasks: [],
  isProcessing: false,
  
  enqueueTask: (task) => set((state) => {
    // If task already exists, don't duplicate, unless we are bumping it to live
    const existingIndex = state.tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      const existing = state.tasks[existingIndex];
      // Only update if it's changing from check_only to live
      if (task.isLive && !existing.isLive) {
        const newTasks = [...state.tasks];
        newTasks[existingIndex] = { ...existing, isLive: true, priority: 0, status: 'idle' };
        return { tasks: newTasks.sort((a, b) => a.priority - b.priority) };
      }
      return state;
    }
    
    const newTasks = [...state.tasks, { ...task, status: 'idle' as const }];
    return { tasks: newTasks.sort((a, b) => a.priority - b.priority) };
  }),
  
  // used to maximize the priority of some element (execute this first, then others..)
  bumpPriority: (id) => set((state) => {
    const newTasks = state.tasks.map(t => {
      // Unconditionally set to 'idle' so BackgroundFetcher aborts any running checkOnly task
      if (t.id === id) return { ...t, priority: 0, isLive: true, status: 'idle' as const };
      return t;
    }).sort((a, b) => a.priority - b.priority);
    return { tasks: newTasks };
  }),
  
  updateTaskStatus: (id, status, data) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, status, data: data !== undefined ? data : t.data } : t)
  })),
  
  setProcessing: (isProcessing) => set({ isProcessing }),
  
  getNextTask: () => {
    const { tasks } = get();
    // Return the first idle task
    return tasks.find(t => t.status === 'idle');
  },
  
  initBackgroundChecks: (trip) => {
    // Disabled aggressive background pre-fetching.
    // We now enforce strict lazy loading: API calls are only made when a user explicitly clicks a tab or accordion.
  },
  
  clearTasksByCategory: (category) => set((state) => ({
    tasks: state.tasks.filter(t => t.category !== category)
  })),

  clearQueue: () => set({ tasks: [] })
}));
