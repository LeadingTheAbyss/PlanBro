import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LineItem {
  id: string;
  description: string;
  amount: number;
  assignedTo: string[]; // passenger IDs
}

export interface Expense {
  id: string;
  title: string;
  category: 'Hotel' | 'Food' | 'Transport' | 'Activity' | 'Other';
  totalAmount: number;
  paidBy: string | string[]; // passenger ID or array of passenger IDs
  date: string;
  receiptImageUrl?: string;
  lineItems: LineItem[];
}

export interface Settlement {
  from: string; // passenger ID (debtor)
  to: string; // passenger ID (creditor)
  amount: number;
}

interface LedgerState {
  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  markAsPaid: (from: string, to: string, amount: number) => void;
  calculateSettlements: (passengerIds: string[]) => Settlement[];
  reset: () => void;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      expenses: [],
      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      deleteExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
      updateExpense: (id, updates) => set((state) => ({
        expenses: state.expenses.map((e) => e.id === id ? { ...e, ...updates } : e)
      })),
      markAsPaid: (from, to, amount) => set((state) => {
        // We record manual payments as a special "payment" expense to offset the balance
        const paymentExpense: Expense = {
          id: `payment_${Date.now()}`,
          title: 'Settlement Payment',
          category: 'Other',
          totalAmount: amount,
          paidBy: [from],
          date: new Date().toISOString(),
          lineItems: [
            {
              id: `item_${Date.now()}`,
              description: 'Payment',
              amount: amount,
              assignedTo: [to] // The person receiving the money "consumed" this value
            }
          ]
        };
        return { expenses: [...state.expenses, paymentExpense] };
      }),
      calculateSettlements: (passengerIds) => {
        const { expenses } = get();
        
        // 1. Calculate net balances
        // netBalance > 0 means they are owed money (Creditor)
        // netBalance < 0 means they owe money (Debtor)
        const balances: Record<string, number> = {};
        passengerIds.forEach(id => balances[id] = 0);
        
        expenses.forEach(exp => {
          // People who paid get positive balance
          const payers = Array.isArray(exp.paidBy) ? exp.paidBy : [exp.paidBy];
          if (payers.length > 0) {
            const payerShare = exp.totalAmount / payers.length;
            payers.forEach(payerId => {
              if (balances[payerId] !== undefined) {
                balances[payerId] += payerShare;
              } else {
                balances[payerId] = payerShare;
              }
            });
          }
          
          // People who consumed get negative balance
          exp.lineItems.forEach(item => {
            const splitCount = item.assignedTo.length;
            if (splitCount === 0) return;
            const splitAmount = item.amount / splitCount;
            item.assignedTo.forEach(consumerId => {
              if (balances[consumerId] !== undefined) {
                balances[consumerId] -= splitAmount;
              } else {
                balances[consumerId] = -splitAmount;
              }
            });
          });
        });
        
        // 2. Separate into Creditors and Debtors
        const creditors = Object.entries(balances)
          .filter(([_, amount]) => amount > 0.01)
          .map(([id, amount]) => ({ id, amount }))
          .sort((a, b) => b.amount - a.amount);
          
        const debtors = Object.entries(balances)
          .filter(([_, amount]) => amount < -0.01)
          .map(([id, amount]) => ({ id, amount: Math.abs(amount) }))
          .sort((a, b) => b.amount - a.amount);
          
        const settlements: Settlement[] = [];
        
        // 3. Greedy Settlement Algorithm
        let i = 0; // debtors index
        let j = 0; // creditors index
        
        while (i < debtors.length && j < creditors.length) {
          const debtor = debtors[i];
          const creditor = creditors[j];
          
          const settledAmount = Math.min(debtor.amount, creditor.amount);
          
          if (settledAmount > 0.01) {
            settlements.push({
              from: debtor.id,
              to: creditor.id,
              amount: settledAmount
            });
          }
          
          debtor.amount -= settledAmount;
          creditor.amount -= settledAmount;
          
          if (debtor.amount < 0.01) i++;
          if (creditor.amount < 0.01) j++;
        }
        
        return settlements;
      },
      reset: () => set({ expenses: [] })
    }),
    {
      name: 'ghumi-ledger-storage',
    }
  )
);
