import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Guest, Table, ScheduleItem, Supplier, Todo, Item, Gift,
  BudgetCategory, BudgetItem
} from '@/types';
import { generateId } from '@/utils/id';
import {
  seedGuests, seedTables, seedSchedule, seedSuppliers, seedTodos,
  seedItems, seedGifts, seedBudgetCategories, seedBudgetItems
} from '@/data/seed';

interface WeddingState {
  guests: Guest[];
  tables: Table[];
  schedule: ScheduleItem[];
  suppliers: Supplier[];
  todos: Todo[];
  items: Item[];
  gifts: Gift[];
  budgetCategories: BudgetCategory[];
  budgetItems: BudgetItem[];

  addGuest: (g: Omit<Guest, 'id'>) => void;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | null) => void;

  addTable: (t: Omit<Table, 'id'>) => void;
  updateTable: (id: string, patch: Partial<Table>) => void;
  deleteTable: (id: string) => void;

  addSchedule: (s: Omit<ScheduleItem, 'id'>) => void;
  updateSchedule: (id: string, patch: Partial<ScheduleItem>) => void;
  deleteSchedule: (id: string) => void;

  addSupplier: (s: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addTodo: (t: Omit<Todo, 'id'>) => void;
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;

  addItem: (i: Omit<Item, 'id'>) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  toggleItemPacked: (id: string) => void;

  addGift: (g: Omit<Gift, 'id'>) => void;
  updateGift: (id: string, patch: Partial<Gift>) => void;
  deleteGift: (id: string) => void;

  addBudgetCategory: (c: Omit<BudgetCategory, 'id'>) => void;
  updateBudgetCategory: (id: string, patch: Partial<BudgetCategory>) => void;
  deleteBudgetCategory: (id: string) => void;
  addBudgetItem: (i: Omit<BudgetItem, 'id'>) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  deleteBudgetItem: (id: string) => void;

  exportData: () => string;
  importData: (json: string) => void;
  resetAll: () => void;
}

export const useWeddingStore = create<WeddingState>()(
  persist(
    (set, get) => ({
      guests: seedGuests,
      tables: seedTables,
      schedule: seedSchedule,
      suppliers: seedSuppliers,
      todos: seedTodos,
      items: seedItems,
      gifts: seedGifts,
      budgetCategories: seedBudgetCategories,
      budgetItems: seedBudgetItems,

      addGuest: (g) => set((s) => ({ guests: [...s.guests, { ...g, id: generateId() }] })),
      updateGuest: (id, patch) => set((s) => ({
        guests: s.guests.map((g) => g.id === id ? { ...g, ...patch } : g)
      })),
      deleteGuest: (id) => set((s) => ({ guests: s.guests.filter((g) => g.id !== id) })),
      assignGuestToTable: (guestId, tableId) => set((s) => ({
        guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId } : g)
      })),

      addTable: (t) => set((s) => ({ tables: [...s.tables, { ...t, id: generateId() }] })),
      updateTable: (id, patch) => set((s) => ({
        tables: s.tables.map((t) => t.id === id ? { ...t, ...patch } : t)
      })),
      deleteTable: (id) => set((s) => ({
        tables: s.tables.filter((t) => t.id !== id),
        guests: s.guests.map((g) => g.tableId === id ? { ...g, tableId: null } : g),
      })),

      addSchedule: (item) => set((s) => ({ schedule: [...s.schedule, { ...item, id: generateId() }] })),
      updateSchedule: (id, patch) => set((s) => ({
        schedule: s.schedule.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteSchedule: (id) => set((s) => ({ schedule: s.schedule.filter((it) => it.id !== id) })),

      addSupplier: (sup) => set((s) => ({ suppliers: [...s.suppliers, { ...sup, id: generateId() }] })),
      updateSupplier: (id, patch) => set((s) => ({
        suppliers: s.suppliers.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((it) => it.id !== id) })),

      addTodo: (t) => set((s) => ({ todos: [...s.todos, { ...t, id: generateId() }] })),
      updateTodo: (id, patch) => set((s) => ({
        todos: s.todos.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteTodo: (id) => set((s) => ({ todos: s.todos.filter((it) => it.id !== id) })),
      toggleTodo: (id) => set((s) => ({
        todos: s.todos.map((it) => it.id === id ? { ...it, done: !it.done } : it)
      })),

      addItem: (i) => set((s) => ({ items: [...s.items, { ...i, id: generateId() }] })),
      updateItem: (id, patch) => set((s) => ({
        items: s.items.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
      toggleItemPacked: (id) => set((s) => ({
        items: s.items.map((it) => it.id === id ? { ...it, packed: !it.packed } : it)
      })),

      addGift: (g) => set((s) => ({ gifts: [...s.gifts, { ...g, id: generateId() }] })),
      updateGift: (id, patch) => set((s) => ({
        gifts: s.gifts.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteGift: (id) => set((s) => ({ gifts: s.gifts.filter((it) => it.id !== id) })),

      addBudgetCategory: (c) => set((s) => ({ budgetCategories: [...s.budgetCategories, { ...c, id: generateId() }] })),
      updateBudgetCategory: (id, patch) => set((s) => ({
        budgetCategories: s.budgetCategories.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteBudgetCategory: (id) => set((s) => ({
        budgetCategories: s.budgetCategories.filter((it) => it.id !== id),
      })),
      addBudgetItem: (i) => set((s) => ({ budgetItems: [...s.budgetItems, { ...i, id: generateId() }] })),
      updateBudgetItem: (id, patch) => set((s) => ({
        budgetItems: s.budgetItems.map((it) => it.id === id ? { ...it, ...patch } : it)
      })),
      deleteBudgetItem: (id) => set((s) => ({ budgetItems: s.budgetItems.filter((it) => it.id !== id) })),

      exportData: () => {
        const state = get();
        return JSON.stringify({
          guests: state.guests,
          tables: state.tables,
          schedule: state.schedule,
          suppliers: state.suppliers,
          todos: state.todos,
          items: state.items,
          gifts: state.gifts,
          budgetCategories: state.budgetCategories,
          budgetItems: state.budgetItems,
        }, null, 2);
      },
      importData: (json: string) => {
        try {
          const data = JSON.parse(json);
          set(data);
        } catch (e) {
          console.error('导入数据失败', e);
        }
      },
      resetAll: () => set({
        guests: seedGuests,
        tables: seedTables,
        schedule: seedSchedule,
        suppliers: seedSuppliers,
        todos: seedTodos,
        items: seedItems,
        gifts: seedGifts,
        budgetCategories: seedBudgetCategories,
        budgetItems: seedBudgetItems,
      }),
    }),
    {
      name: 'wedding-manager-store',
    }
  )
);
