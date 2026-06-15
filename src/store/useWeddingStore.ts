import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Guest, Table, ScheduleItem, Supplier, Todo, Item, Gift,
  BudgetCategory, BudgetItem, SeatingPlan
} from '@/types';
import { generateId } from '@/utils/id';
import {
  seedGuests, seedTables, seedSchedule, seedSuppliers, seedTodos,
  seedItems, seedGifts, seedBudgetCategories, seedBudgetItems
} from '@/data/seed';

type RelationField = 'familyIds' | 'withIds' | 'conflictIds';

const RELATION_FIELDS: RelationField[] = ['familyIds', 'withIds', 'conflictIds'];

const getOppositeRelationField = (field: RelationField): RelationField => field;

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
  seatingPlans: SeatingPlan[];
  activePlanId: string | null;

  addGuest: (g: Omit<Guest, 'id'>) => void;
  addGuestWithRelations: (g: Omit<Guest, 'id'>) => void;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  updateGuestWithRelations: (id: string, patch: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string | null) => void;
  syncGuestRelations: (id: string, oldData: Partial<Guest>, newData: Partial<Guest>) => void;
  clearGuestRelationsFor: (targetId: string) => void;

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

  saveSeatingPlan: (name: string, description?: string) => void;
  loadSeatingPlan: (planId: string) => void;
  updateSeatingPlan: (planId: string, patch: Partial<Omit<SeatingPlan, 'id' | 'createdAt'>>) => void;
  deleteSeatingPlan: (planId: string) => void;
  setFinalSeatingPlan: (planId: string) => void;
  unsetFinalSeatingPlan: () => void;

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
      seatingPlans: [],
      activePlanId: null,

      addGuest: (g) => set((s) => ({ guests: [...s.guests, { ...g, id: generateId() }] })),

      addGuestWithRelations: (g) => {
        const newId = generateId();
        const newGuest = { ...g, id: newId };
        set((s) => {
          const updatedGuests = [...s.guests, newGuest];
          const relationUpdates: Record<string, Partial<Guest>> = {};
          RELATION_FIELDS.forEach(field => {
            (newGuest[field] || []).forEach(targetId => {
              if (!relationUpdates[targetId]) relationUpdates[targetId] = {};
              const oppositeField = getOppositeRelationField(field);
              const current = (updatedGuests.find(x => x.id === targetId)?.[oppositeField] || []) as string[];
              if (!current.includes(newId)) {
                relationUpdates[targetId][oppositeField] = [...current, newId];
              }
            });
          });
          return {
            guests: updatedGuests.map(g => relationUpdates[g.id] ? { ...g, ...relationUpdates[g.id] } : g)
          };
        });
      },

      updateGuest: (id, patch) => set((s) => ({
        guests: s.guests.map((g) => g.id === id ? { ...g, ...patch } : g)
      })),

      updateGuestWithRelations: (id, patch) => {
        const oldGuest = get().guests.find(g => g.id === id);
        if (!oldGuest) return;
        set((s) => {
          const updatedGuests = s.guests.map(g => g.id === id ? { ...g, ...patch } : g);
          const updatedThis = updatedGuests.find(g => g.id === id)!;
          const relationUpdates: Record<string, Partial<Guest>> = {};

          RELATION_FIELDS.forEach(field => {
            const oldIds = (oldGuest[field] || []) as string[];
            const newIds = (updatedThis[field] || []) as string[];

            const added = newIds.filter(x => !oldIds.includes(x));
            const removed = oldIds.filter(x => !newIds.includes(x));

            added.forEach(targetId => {
              if (!relationUpdates[targetId]) relationUpdates[targetId] = {};
              const oppositeField = getOppositeRelationField(field);
              const currentTarget = updatedGuests.find(x => x.id === targetId);
              if (!currentTarget) return;
              const currentIds = (currentTarget[oppositeField] || []) as string[];
              if (!currentIds.includes(id)) {
                relationUpdates[targetId][oppositeField] = [...currentIds, id];
              }
            });

            removed.forEach(targetId => {
              if (!relationUpdates[targetId]) relationUpdates[targetId] = {};
              const oppositeField = getOppositeRelationField(field);
              const currentTarget = updatedGuests.find(x => x.id === targetId);
              if (!currentTarget) return;
              const currentIds = (currentTarget[oppositeField] || []) as string[];
              if (currentIds.includes(id)) {
                relationUpdates[targetId][oppositeField] = currentIds.filter(x => x !== id);
              }
            });
          });

          RELATION_FIELDS.forEach(field => {
            const oldIds = (oldGuest[field] || []) as string[];
            const newIds = (updatedThis[field] || []) as string[];
            oldIds.forEach(targetId => {
              const hasOtherField = RELATION_FIELDS.some(f => f !== field && (updatedThis[f] || []).includes(targetId));
              if (!newIds.includes(targetId) && !hasOtherField) {
                if (!relationUpdates[targetId]) relationUpdates[targetId] = {};
              }
            });
          });

          return {
            guests: updatedGuests.map(g => relationUpdates[g.id] ? { ...g, ...relationUpdates[g.id] } : g)
          };
        });
      },

      deleteGuest: (id) => set((s) => ({
        guests: s.guests
          .filter((g) => g.id !== id)
          .map(g => ({
            ...g,
            conflictIds: (g.conflictIds || []).filter(x => x !== id),
            withIds: (g.withIds || []).filter(x => x !== id),
            familyIds: (g.familyIds || []).filter(x => x !== id),
          }))
      })),

      assignGuestToTable: (guestId, tableId) => set((s) => ({
        guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId } : g)
      })),

      syncGuestRelations: (id, oldData, newData) => {
        const state = get();
        const currentGuest = state.guests.find(g => g.id === id);
        if (!currentGuest) return;

        const relationUpdates: Record<string, Partial<Guest>> = {};
        const mergedOld = { ...currentGuest, ...oldData };
        const mergedNew = { ...currentGuest, ...newData };

        RELATION_FIELDS.forEach(field => {
          const oldIds = (mergedOld[field] || []) as string[];
          const newIds = (mergedNew[field] || []) as string[];

          const added = newIds.filter(x => !oldIds.includes(x));
          const removed = oldIds.filter(x => !newIds.includes(x));

          added.forEach(targetId => {
            if (!relationUpdates[targetId]) relationUpdates[targetId] = {};
            const oppositeField = getOppositeRelationField(field);
            const target = state.guests.find(x => x.id === targetId);
            if (!target) return;
            const current = (target[oppositeField] || []) as string[];
            if (!current.includes(id)) {
              relationUpdates[targetId][oppositeField] = [...current, id];
            }
          });

          removed.forEach(targetId => {
            if (!relationUpdates[targetId]) relationUpdates[targetId] = {};
            const oppositeField = getOppositeRelationField(field);
            const target = state.guests.find(x => x.id === targetId);
            if (!target) return;
            const current = (target[oppositeField] || []) as string[];
            if (current.includes(id)) {
              relationUpdates[targetId][oppositeField] = current.filter(x => x !== id);
            }
          });
        });

        set((s) => ({
          guests: s.guests.map(g => relationUpdates[g.id] ? { ...g, ...relationUpdates[g.id] } : g)
        }));
      },

      clearGuestRelationsFor: (targetId) => set((s) => ({
        guests: s.guests.map(g => ({
          ...g,
          conflictIds: (g.conflictIds || []).filter(x => x !== targetId),
          withIds: (g.withIds || []).filter(x => x !== targetId),
          familyIds: (g.familyIds || []).filter(x => x !== targetId),
        }))
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

      saveSeatingPlan: (name, description = '') => set((s) => {
        const assignments: Record<string, string> = {};
        s.guests.forEach(g => { if (g.tableId) assignments[g.id] = g.tableId; });
        const now = Date.now();
        const newPlan: SeatingPlan = {
          id: generateId(),
          name,
          description,
          isFinal: false,
          assignments,
          createdAt: now,
          updatedAt: now,
        };
        return { seatingPlans: [...s.seatingPlans, newPlan], activePlanId: newPlan.id };
      }),

      loadSeatingPlan: (planId) => set((s) => {
        const plan = s.seatingPlans.find(p => p.id === planId);
        if (!plan) return {};
        return {
          guests: s.guests.map(g => ({ ...g, tableId: plan.assignments[g.id] || null })),
          activePlanId: planId,
        };
      }),

      updateSeatingPlan: (planId, patch) => set((s) => ({
        seatingPlans: s.seatingPlans.map(p =>
          p.id === planId ? { ...p, ...patch, updatedAt: Date.now() } : p
        )
      })),

      deleteSeatingPlan: (planId) => set((s) => ({
        seatingPlans: s.seatingPlans.filter(p => p.id !== planId),
        activePlanId: s.activePlanId === planId ? null : s.activePlanId,
      })),

      setFinalSeatingPlan: (planId) => set((s) => ({
        seatingPlans: s.seatingPlans.map(p => ({ ...p, isFinal: p.id === planId })),
      })),

      unsetFinalSeatingPlan: () => set((s) => ({
        seatingPlans: s.seatingPlans.map(p => ({ ...p, isFinal: false })),
      })),

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
          seatingPlans: state.seatingPlans,
          activePlanId: state.activePlanId,
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
        seatingPlans: [],
        activePlanId: null,
      }),
    }),
    {
      name: 'wedding-manager-store',
    }
  )
);
