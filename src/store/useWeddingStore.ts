import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Guest, Table, ScheduleItem, Supplier, Todo, Item, Gift,
  BudgetCategory, BudgetItem, SeatingPlan, PlanTimelineEntry,
  SeatingCheckItem,
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
  assignGuestToTable: (guestId: string, tableId: string | null, reason?: string) => void;
  syncGuestRelations: (id: string, oldData: Partial<Guest>, newData: Partial<Guest>) => void;
  clearGuestRelationsFor: (targetId: string) => void;
  updateConflictReason: (sourceId: string, targetId: string, reason: string) => void;

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
  updateSeatingPlan: (planId: string, patch: Partial<Omit<SeatingPlan, 'id' | 'createdAt' | 'timeline'>>) => void;
  deleteSeatingPlan: (planId: string) => void;
  setFinalSeatingPlan: (planId: string) => void;
  unsetFinalSeatingPlan: () => void;
  lockSeatingPlan: (planId: string) => void;
  unlockSeatingPlan: (planId: string) => void;
  addPlanTimelineEntry: (planId: string, entry: Omit<PlanTimelineEntry, 'id' | 'timestamp'>) => void;

  getSeatingCheck: () => SeatingCheckItem[];

  exportData: () => string;
  importData: (json: string) => void;
  resetAll: () => void;
}

function getFamilyGroups(guests: Guest[]): string[][] {
  const visited = new Set<string>();
  const groups: string[][] = [];
  for (const g of guests) {
    if (visited.has(g.id) || g.status === 'absent') continue;
    const group: string[] = [];
    const stack = [g.id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      group.push(id);
      const guest = guests.find(x => x.id === id);
      if (guest?.familyIds) {
        guest.familyIds.forEach(fid => {
          const fg = guests.find(x => x.id === fid);
          if (fg && fg.status !== 'absent' && !visited.has(fid)) {
            stack.push(fid);
          }
        });
      }
    }
    if (group.length > 0) groups.push(group);
  }
  return groups;
}

export const useWeddingStore = create<WeddingState>()(
  persist(
    (set, get) => ({
      guests: seedGuests.map(g => ({ ...g, conflictReasons: g.conflictReasons || {} })),
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

      addGuest: (g) => set((s) => ({ guests: [...s.guests, { ...g, id: generateId(), conflictReasons: g.conflictReasons || {} }] })),

      addGuestWithRelations: (g) => {
        const newId = generateId();
        const newGuest = { ...g, id: newId, conflictReasons: g.conflictReasons || {} };
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
              if (field === 'conflictIds') {
                const target = updatedGuests.find(x => x.id === targetId);
                const existingReasons = target?.conflictReasons || {};
                const reason = newGuest.conflictReasons?.[targetId] || '';
                relationUpdates[targetId].conflictReasons = {
                  ...existingReasons,
                  [newId]: reason,
                };
              }
            });
          });
          return {
            guests: updatedGuests.map(g => relationUpdates[g.id] ? {
              ...g,
              ...relationUpdates[g.id],
              conflictReasons: { ...(g.conflictReasons || {}), ...(relationUpdates[g.id]?.conflictReasons || {}) },
            } : g)
          };
        });
      },

      updateGuest: (id, patch) => set((s) => ({
        guests: s.guests.map((g) => g.id === id ? { ...g, ...patch, conflictReasons: patch.conflictReasons ? { ...(g.conflictReasons || {}), ...patch.conflictReasons } : g.conflictReasons || {} } : g)
      })),

      updateGuestWithRelations: (id, patch) => {
        const oldGuest = get().guests.find(g => g.id === id);
        if (!oldGuest) return;
        set((s) => {
          const mergedPatch = {
            ...patch,
            conflictReasons: patch.conflictReasons ? { ...(oldGuest.conflictReasons || {}), ...patch.conflictReasons } : oldGuest.conflictReasons || {},
          };
          const updatedGuests = s.guests.map(g => g.id === id ? { ...g, ...mergedPatch } : g);
          const updatedThis = updatedGuests.find(g => g.id === id)!;
          const relationUpdates: Record<string, Partial<Guest>> = {};
          const reasonUpdates: Record<string, Record<string, string>> = {};

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
              if (field === 'conflictIds') {
                const reason = updatedThis.conflictReasons?.[targetId] || '';
                if (!reasonUpdates[targetId]) reasonUpdates[targetId] = {};
                reasonUpdates[targetId][id] = reason;
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
              if (field === 'conflictIds') {
                if (!reasonUpdates[targetId]) reasonUpdates[targetId] = {};
                reasonUpdates[targetId][id] = '';
              }
            });
          });

          if (mergedPatch.conflictReasons) {
            Object.entries(mergedPatch.conflictReasons).forEach(([targetId, reason]) => {
              const oldReason = oldGuest.conflictReasons?.[targetId] || '';
              if (reason !== oldReason && updatedThis.conflictIds?.includes(targetId)) {
                if (!reasonUpdates[targetId]) reasonUpdates[targetId] = {};
                reasonUpdates[targetId][id] = reason;
              }
            });
          }

          return {
            guests: updatedGuests.map(g => {
              const baseUpdates = relationUpdates[g.id] || {};
              const newReasons = reasonUpdates[g.id] || {};
              const hasUpdates = Object.keys(baseUpdates).length > 0 || Object.keys(newReasons).length > 0;
              if (!hasUpdates) return g;

              const mergedReasons = { ...(g.conflictReasons || {}) };
              Object.entries(newReasons).forEach(([sid, reason]) => {
                if (reason === '') {
                  delete mergedReasons[sid];
                } else {
                  mergedReasons[sid] = reason;
                }
              });

              return {
                ...g,
                ...baseUpdates,
                conflictReasons: mergedReasons,
              };
            })
          };
        });
      },

      deleteGuest: (id) => set((s) => ({
        guests: s.guests
          .filter((g) => g.id !== id)
          .map(g => {
            const reasons = { ...(g.conflictReasons || {}) };
            delete reasons[id];
            return {
              ...g,
              conflictIds: (g.conflictIds || []).filter(x => x !== id),
              withIds: (g.withIds || []).filter(x => x !== id),
              familyIds: (g.familyIds || []).filter(x => x !== id),
              conflictReasons: reasons,
            };
          })
      })),

      assignGuestToTable: (guestId, tableId, reason) => set((s) => {
        const guest = s.guests.find(g => g.id === guestId);
        const oldTableId = guest?.tableId || null;
        const state = get();

        if (state.activePlanId) {
          const plan = state.seatingPlans.find(p => p.id === state.activePlanId);
          if (plan && plan.isLocked) {
            alert('当前方案已锁定，无法修改座位安排');
            return {};
          }
        }

        if (state.activePlanId && oldTableId !== tableId) {
          const guestName = guest?.name || '某宾客';
          let desc = '';
          if (oldTableId && tableId) {
            const oldT = state.tables.find(t => t.id === oldTableId);
            const newT = state.tables.find(t => t.id === tableId);
            desc = `${guestName} 从 ${oldT?.tableNo || '?'}号桌 换到 ${newT?.tableNo || '?'}号桌${reason ? `：${reason}` : ''}`;
          } else if (!oldTableId && tableId) {
            const newT = state.tables.find(t => t.id === tableId);
            desc = `${guestName} 安排到 ${newT?.tableNo || '?'}号桌${reason ? `：${reason}` : ''}`;
          } else if (oldTableId && !tableId) {
            const oldT = state.tables.find(t => t.id === oldTableId);
            desc = `${guestName} 从 ${oldT?.tableNo || '?'}号桌 移除${reason ? `：${reason}` : ''}`;
          }

          if (desc) {
            setTimeout(() => {
              const st = get();
              const idx = st.seatingPlans.findIndex(p => p.id === st.activePlanId);
              if (idx >= 0) {
                const newEntry: PlanTimelineEntry = {
                  id: generateId(),
                  timestamp: Date.now(),
                  action: 'seat_change',
                  description: desc,
                  guestId,
                  fromTableId: oldTableId,
                  toTableId: tableId,
                };
                set((st2) => ({
                  seatingPlans: st2.seatingPlans.map((p, i) => i === idx ? {
                    ...p,
                    timeline: [...(p.timeline || []), newEntry],
                    updatedAt: Date.now(),
                  } : p),
                }));
              }
            }, 0);
          }
        }

        return {
          guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId } : g)
        };
      }),

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
        guests: s.guests.map(g => {
          const reasons = { ...(g.conflictReasons || {}) };
          delete reasons[targetId];
          return {
            ...g,
            conflictIds: (g.conflictIds || []).filter(x => x !== targetId),
            withIds: (g.withIds || []).filter(x => x !== targetId),
            familyIds: (g.familyIds || []).filter(x => x !== targetId),
            conflictReasons: reasons,
          };
        })
      })),

      updateConflictReason: (sourceId, targetId, reason) => {
        set((s) => ({
          guests: s.guests.map(g => {
            if (g.id === sourceId) {
              const reasons = { ...(g.conflictReasons || {}) };
              if (reason) reasons[targetId] = reason;
              else delete reasons[targetId];
              return { ...g, conflictReasons: reasons };
            }
            if (g.id === targetId) {
              const reasons = { ...(g.conflictReasons || {}) };
              if (reason) reasons[sourceId] = reason;
              else delete reasons[sourceId];
              return { ...g, conflictReasons: reasons };
            }
            return g;
          })
        }));
      },

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
          isLocked: false,
          assignments,
          timeline: [{
            id: generateId(),
            timestamp: now,
            action: 'create',
            description: `创建方案「${name}」`,
          }],
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
        seatingPlans: s.seatingPlans.map(p => p.id === planId ? {
          ...p,
          isFinal: true,
          timeline: [...(p.timeline || []), {
            id: generateId(),
            timestamp: Date.now(),
            action: 'mark_final',
            description: `标记「${p.name}」为最终版`,
          }],
          updatedAt: Date.now(),
        } : { ...p, isFinal: false }),
      })),

      unsetFinalSeatingPlan: () => set((s) => ({
        seatingPlans: s.seatingPlans.map(p => p.isFinal ? {
          ...p,
          isFinal: false,
          timeline: [...(p.timeline || []), {
            id: generateId(),
            timestamp: Date.now(),
            action: 'unmark_final',
            description: `取消「${p.name}」的最终版标记`,
          }],
          updatedAt: Date.now(),
        } : p),
      })),

      lockSeatingPlan: (planId) => set((s) => ({
        seatingPlans: s.seatingPlans.map(p => p.id === planId ? {
          ...p,
          isLocked: true,
          timeline: [...(p.timeline || []), {
            id: generateId(),
            timestamp: Date.now(),
            action: 'lock',
            description: `锁定「${p.name}」，防止误修改`,
          }],
          updatedAt: Date.now(),
        } : p),
      })),

      unlockSeatingPlan: (planId) => set((s) => ({
        seatingPlans: s.seatingPlans.map(p => p.id === planId ? {
          ...p,
          isLocked: false,
          timeline: [...(p.timeline || []), {
            id: generateId(),
            timestamp: Date.now(),
            action: 'unlock',
            description: `解锁「${p.name}」，允许修改`,
          }],
          updatedAt: Date.now(),
        } : p),
      })),

      addPlanTimelineEntry: (planId, entry) => set((s) => ({
        seatingPlans: s.seatingPlans.map(p => p.id === planId ? {
          ...p,
          timeline: [...(p.timeline || []), {
            ...entry,
            id: generateId(),
            timestamp: Date.now(),
          }],
          updatedAt: Date.now(),
        } : p),
      })),

      getSeatingCheck: () => {
        const state = get();
        const guests = state.guests;
        const checkItems: SeatingCheckItem[] = [];
        const activeGuests = guests.filter(g => g.status !== 'absent');

        const familyGroups = getFamilyGroups(activeGuests);
        familyGroups.forEach(group => {
          if (group.length < 2) return;
          const tableMap: Record<string, string[]> = {};
          group.forEach(gid => {
            const g = guests.find(x => x.id === gid);
            if (!g) return;
            const tid = g.tableId || '__unassigned__';
            if (!tableMap[tid]) tableMap[tid] = [];
            tableMap[tid].push(gid);
          });
          const usedTables = Object.keys(tableMap);
          if (usedTables.length > 1 || usedTables.includes('__unassigned__')) {
            const names = group.map(gid => guests.find(g => g.id === gid)?.name).filter(Boolean).join('、');
            checkItems.push({
              type: 'family_split',
              guestIds: group,
              tableIds: usedTables.filter(t => t !== '__unassigned__'),
              message: `家属群体「${names}」被拆分到了不同桌位或部分未安排`,
            });
          }
        });

        activeGuests.forEach(g => {
          (g.withIds || []).forEach(wid => {
            const wg = guests.find(x => x.id === wid);
            if (!wg || wg.status === 'absent') return;
            if (g.id >= wid) return;
            if (g.tableId !== wg.tableId) {
              checkItems.push({
                type: 'with_split',
                guestIds: [g.id, wid],
                tableIds: [g.tableId, wg.tableId].filter(Boolean) as string[],
                message: `${g.name} 和 ${wg.name} 希望同桌但被分开了`,
              });
            }
          });
        });

        activeGuests.forEach(g => {
          if (!g.tableId) {
            checkItems.push({
              type: 'no_seat',
              guestIds: [g.id],
              tableIds: [],
              message: `${g.name} 还未安排座位`,
            });
          }
        });

        const tableGuestMap: Record<string, Guest[]> = {};
        activeGuests.forEach(g => {
          if (!g.tableId) return;
          if (!tableGuestMap[g.tableId]) tableGuestMap[g.tableId] = [];
          tableGuestMap[g.tableId].push(g);
        });

        Object.entries(tableGuestMap).forEach(([tid, tableGuests]) => {
          for (let i = 0; i < tableGuests.length; i++) {
            for (let j = i + 1; j < tableGuests.length; j++) {
              const a = tableGuests[i], b = tableGuests[j];
              if ((a.conflictIds || []).includes(b.id) || (b.conflictIds || []).includes(a.id)) {
                const reason = a.conflictReasons?.[b.id] || b.conflictReasons?.[a.id] || '';
                checkItems.push({
                  type: 'conflict',
                  guestIds: [a.id, b.id],
                  tableIds: [tid],
                  message: `${a.name} 和 ${b.name} 存在冲突关系却被安排在同一桌${reason ? `（${reason}）` : ''}`,
                });
              }
            }
          }
        });

        return checkItems;
      },

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
          const normalizedGuests = (data.guests || []).map((g: any) => ({
            ...g,
            conflictReasons: g.conflictReasons || {},
          }));
          const normalizedPlans = (data.seatingPlans || []).map((p: any) => ({
            ...p,
            isLocked: p.isLocked || false,
            timeline: p.timeline || [],
          }));
          set({
            ...data,
            guests: normalizedGuests,
            seatingPlans: normalizedPlans,
          });
        } catch (e) {
          console.error('导入数据失败', e);
        }
      },

      resetAll: () => set({
        guests: seedGuests.map(g => ({ ...g, conflictReasons: g.conflictReasons || {} })),
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
