import type { Guest, Table } from '@/types';

export interface SeatingResult {
  assignments: Record<string, string>;
  warnings: string[];
}

export function autoAssignTables(
  guests: Guest[],
  tables: Table[],
  options: { clearExisting?: boolean } = {}
): SeatingResult {
  const warnings: string[] = [];
  const assignments: Record<string, string> = {};
  const clearExisting = options.clearExisting ?? false;

  const activeGuests = guests.filter(g => g.status !== 'absent');
  const availableTables = [...tables].sort((a, b) => a.tableNo - b.tableNo);

  if (availableTables.length === 0) {
    return { assignments: {}, warnings: ['还没有桌位，无法进行智能排桌'] };
  }

  const tableLoad: Record<string, number> = {};
  availableTables.forEach(t => { tableLoad[t.id] = 0; });

  if (!clearExisting) {
    activeGuests.forEach(g => {
      if (g.tableId && tableLoad[g.tableId] !== undefined) {
        tableLoad[g.tableId] += g.headcount || 1;
        assignments[g.id] = g.tableId;
      }
    });
  }

  const getRelatedIds = (guest: Guest): Set<string> => {
    const related = new Set<string>();
    guest.familyIds?.forEach(id => related.add(id));
    guest.withIds?.forEach(id => related.add(id));
    return related;
  };

  const hasConflictAtTable = (guest: Guest, tableId: string): boolean => {
    const tableGuests = Object.entries(assignments)
      .filter(([, tid]) => tid === tableId)
      .map(([gid]) => guests.find(g => g.id === gid))
      .filter(Boolean) as Guest[];
    return tableGuests.some(tg =>
      guest.conflictIds?.includes(tg.id) || tg.conflictIds?.includes(guest.id)
    );
  };

  const allRelatedScheduled = (guest: Guest): boolean => {
    const related = getRelatedIds(guest);
    for (const rid of related) {
      if (!assignments[rid]) return false;
    }
    return true;
  };

  const sorted = [...activeGuests].sort((a, b) => {
    const aRel = getRelatedIds(a).size;
    const bRel = getRelatedIds(b).size;
    if (bRel !== aRel) return bRel - aRel;
    if ((b.headcount || 1) !== (a.headcount || 1)) return (b.headcount || 1) - (a.headcount || 1);
    const groupOrder: any = { groom: 0, bride: 1, relative: 2, colleague: 3, friend: 4, other: 5 };
    return groupOrder[a.group] - groupOrder[b.group];
  });

  const findBestTable = (guest: Guest, preferredTableId?: string): string | null => {
    if (preferredTableId) {
      const load = tableLoad[preferredTableId];
      const table = tables.find(t => t.id === preferredTableId);
      if (table && load + (guest.headcount || 1) <= table.capacity && !hasConflictAtTable(guest, preferredTableId)) {
        return preferredTableId;
      }
    }

    let best: { id: string; score: number } | null = null;
    for (const table of availableTables) {
      const load = tableLoad[table.id];
      if (load + (guest.headcount || 1) > table.capacity) continue;
      if (hasConflictAtTable(guest, table.id)) continue;

      let score = 0;
      const tableGuests = Object.entries(assignments)
        .filter(([, tid]) => tid === table.id)
        .map(([gid]) => guests.find(g => g.id === gid))
        .filter(Boolean) as Guest[];

      const relatedCount = tableGuests.filter(tg =>
        getRelatedIds(guest).has(tg.id)
      ).length;
      score += relatedCount * 100;

      const sameGroup = tableGuests.filter(tg => tg.group === guest.group).length;
      score += sameGroup * 10;

      const remainRatio = 1 - (load / table.capacity);
      score += remainRatio * 2;

      if (!best || score > best.score) {
        best = { id: table.id, score };
      }
    }
    return best?.id || null;
  };

  const pendingGroup: string[] = [];

  for (const guest of sorted) {
    if (assignments[guest.id]) continue;

    const related = getRelatedIds(guest);
    if (related.size > 0 && !allRelatedScheduled(guest)) {
      let preferredTable: string | null = null;
      for (const rid of related) {
        if (assignments[rid]) { preferredTable = assignments[rid]; break; }
      }
      if (preferredTable) {
        const table = tables.find(t => t.id === preferredTable);
        if (table && !hasConflictAtTable(guest, preferredTable)) {
          const totalHeadcount = [...related, guest.id].reduce((s, gid) => {
            const rg = guests.find(g => g.id === gid);
            return s + (rg?.headcount || 1);
          }, 0);
          if (tableLoad[preferredTable] + totalHeadcount - (tableLoad[preferredTable] > 0 ? 0 : 0) <= table.capacity) {
            assignments[guest.id] = preferredTable;
            tableLoad[preferredTable] += guest.headcount || 1;
            continue;
          }
        }
      }
      if (!pendingGroup.includes(guest.id)) pendingGroup.push(guest.id);
      continue;
    }

    const tableId = findBestTable(guest);
    if (tableId) {
      assignments[guest.id] = tableId;
      tableLoad[tableId] += guest.headcount || 1;

      for (const rid of related) {
        if (assignments[rid] || activeGuests.find(g => g.id === rid)?.status === 'absent') continue;
        const rg = guests.find(g => g.id === rid);
        if (!rg) continue;
        const rt = findBestTable(rg, tableId);
        if (rt) {
          assignments[rid] = rt;
          tableLoad[rt] += rg.headcount || 1;
        } else {
          warnings.push(`⚠️ ${rg.name} 无法和 ${guest.name} 安排到同一桌（桌位不足或存在冲突）`);
        }
      }
    } else {
      warnings.push(`❌ ${guest.name}（${guest.headcount || 1}人）暂无可用桌位，所有桌位已满或存在冲突`);
    }
  }

  for (const gid of pendingGroup) {
    if (assignments[gid]) continue;
    const guest = guests.find(g => g.id === gid);
    if (!guest) continue;
    const tableId = findBestTable(guest);
    if (tableId) {
      assignments[gid] = tableId;
      tableLoad[tableId] += guest.headcount || 1;
    } else {
      warnings.push(`❌ ${guest.name}（${guest.headcount || 1}人）暂无可用桌位`);
    }
  }

  return { assignments, warnings };
}
