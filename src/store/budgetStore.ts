import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dbStorage } from '../lib/dbStorage';
import { BudgetState } from '../types/budget';

interface BudgetStoreState extends BudgetState {
  // Actions adde
  setTotalBudget: (amount: number) => void;
  setExpense: (category: 'transport' | 'places' | 'hotel' | 'commute' | 'food', amount: number) => void;
  addExpense: (category: 'transport' | 'places' | 'hotel' | 'commute' | 'food', amount: number) => void;
  refundExpense: (category: 'transport' | 'places' | 'hotel' | 'commute' | 'food', amount: number) => void;
  recalcBudget: () => void;
  loadSnapshot: (snapshot: any) => void;
  reset: () => void;
}

export const useBudgetStore = create<BudgetStoreState>()(
  persist(
    (set, get) => ({
  totalBudget: 0,
  spentTransport: 0,
  spentPlaces: 0,
  spentHotels: 0,
  spentCommute: 0,
  spentFood: 0,
  remaining: 0,
  projectedTotal: 0,

  setTotalBudget: (amount) => set((state) => {
    const totalSpent = (state.spentTransport || 0) + (state.spentPlaces || 0) + (state.spentHotels || 0) + (state.spentCommute || 0) + (state.spentFood || 0);
    const remaining = amount - totalSpent;
    return { totalBudget: amount, projectedTotal: totalSpent, remaining };
  }),

  addExpense: (category, amount) => set((state) => {
    let key: keyof BudgetState;
    if (category === 'transport') key = 'spentTransport';
    else if (category === 'places') key = 'spentPlaces';
    else if (category === 'hotel') key = 'spentHotels';
    else if (category === 'food') key = 'spentFood';
    else key = 'spentCommute';

    const newSpent = ((state[key] as number) || 0) + amount;
    const newState = { ...state, [key]: newSpent };
    
    const totalSpent = (newState.spentTransport || 0) + (newState.spentPlaces || 0) + (newState.spentHotels || 0) + (newState.spentCommute || 0) + (newState.spentFood || 0);
    const remaining = (newState.totalBudget || 0) - totalSpent;

    return { ...newState, projectedTotal: totalSpent, remaining };
  }),

  setExpense: (category, amount) => set((state) => {
    let key: keyof BudgetState;
    if (category === 'transport') key = 'spentTransport';
    else if (category === 'places') key = 'spentPlaces';
    else if (category === 'hotel') key = 'spentHotels';
    else if (category === 'food') key = 'spentFood';
    else key = 'spentCommute';

    if (state[key] === amount) return state; // Prevent infinite loops

    const newState = { ...state, [key]: amount };
    
    const totalSpent = (newState.spentTransport || 0) + (newState.spentPlaces || 0) + (newState.spentHotels || 0) + (newState.spentCommute || 0) + (newState.spentFood || 0);
    const remaining = (newState.totalBudget || 0) - totalSpent;

    return { ...newState, projectedTotal: totalSpent, remaining };
  }),

  refundExpense: (category, amount) => set((state) => {
    let key: keyof BudgetState;
    if (category === 'transport') key = 'spentTransport';
    else if (category === 'places') key = 'spentPlaces';
    else if (category === 'hotel') key = 'spentHotels';
    else if (category === 'food') key = 'spentFood';
    else key = 'spentCommute';

    const newSpent = Math.max(0, ((state[key] as number) || 0) - amount);
    const newState = { ...state, [key]: newSpent };
    
    const totalSpent = (newState.spentTransport || 0) + (newState.spentPlaces || 0) + (newState.spentHotels || 0) + (newState.spentCommute || 0) + (newState.spentFood || 0);
    const remaining = (newState.totalBudget || 0) - totalSpent;

    return { ...newState, projectedTotal: totalSpent, remaining };
  }),

  recalcBudget: () => set((state) => {
    const totalSpent = (state.spentTransport || 0) + (state.spentPlaces || 0) + (state.spentHotels || 0) + (state.spentCommute || 0) + (state.spentFood || 0);
    const remaining = (state.totalBudget || 0) - totalSpent;

    return {
      projectedTotal: totalSpent,
      remaining
    };
  }),

  loadSnapshot: (snapshot) => set({
    totalBudget: snapshot.budget?.total || 0,
    remaining: snapshot.budget?.remaining || 0,
    projectedTotal: snapshot.budget?.spent || 0,
    spentTransport: 0,
    spentPlaces: 0,
    spentHotels: 0,
    spentCommute: 0,
    spentFood: 0,
  }),

  reset: () => set({
    totalBudget: 0,
    spentTransport: 0,
    spentPlaces: 0,
    spentHotels: 0,
    spentCommute: 0,
    spentFood: 0,
    remaining: 0,
    projectedTotal: 0
  })
  }),
  {
    name: 'budget-store', // name of the item in the storage (must be unique)
    storage: createJSONStorage(() => dbStorage),
  }
));
