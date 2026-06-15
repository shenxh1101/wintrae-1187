import type { Guest, Table } from '@/types';

export interface UnmetNeed {
  type: 'family_split' | 'with_split' | 'no_seat' | 'conflict_override';
  guestIds: string[];
  message: string;
}

export interface SeatingResult {
  assignments: Record<string, string>;
  warnings: string[];
  unmetNeeds: UnmetNeed[];
  summary: {
    totalAssigned: number;
    totalUnassigned: number;
    familiesKeptTogether: number;
    familiesSplit: number;
    withKeptTogether: number;
    withSplit: number;
    conflictsAvoided: number;
  };
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

function getGroupHeadcount(group: string[], guests: Guest[]): number {
  return group.reduce((sum, id) => {
    const g = guests.find(x => x.id === id);
    return sum + (g?.headcount || 1);
  }, 0);
}

export function autoAssignTables(
  guests: Guest[],
  tables: Table[],
  options: { clearExisting?: boolean } = {}
): SeatingResult {
  const warnings: string[] = [];
  const unmetNeeds: UnmetNeed[] = [];
  const assignments: Record<string, string> = {};
  const clearExisting = options.clearExisting ?? false;

  const activeGuests = guests.filter(g => g.status !== 'absent');
  const availableTables = [...tables].sort((a, b) => a.tableNo - b.tableNo);

  const stats = {
    totalAssigned: 0,
    totalUnassigned: 0,
    familiesKeptTogether: 0,
    familiesSplit: 0,
    withKeptTogether: 0,
    withSplit: 0,
    conflictsAvoided: 0,
  };

  if (availableTables.length === 0) {
    warnings.push('还没有桌位，无法进行智能排桌');
    return { assignments, warnings, unmetNeeds, summary: stats };
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

  const getFamilyIds = (guest: Guest): Set<string> => {
    return new Set(guest.familyIds || []);
  };

  const getWithIds = (guest: Guest): Set<string> => {
    return new Set(guest.withIds || []);
  };

  const getAllRelatedIds = (guest: Guest): Set<string> => {
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

  const findBestTableForGroup = (
    group: string[],
    guests: Guest[],
    preferredTableId?: string
  ): string | null => {
    const groupHeadcount = getGroupHeadcount(group, guests);

    if (preferredTableId) {
      const load = tableLoad[preferredTableId];
      const table = tables.find(t => t.id === preferredTableId);
      if (table && load + groupHeadcount <= table.capacity) {
        const hasConflict = group.some(gid => {
          const g = guests.find(x => x.id === gid);
          return g && hasConflictAtTable(g, preferredTableId);
        });
        if (!hasConflict) return preferredTableId;
      }
    }

    let best: { id: string; score: number } | null = null;
    for (const table of availableTables) {
      const load = tableLoad[table.id];
      if (load + groupHeadcount > table.capacity) continue;

      const hasConflict = group.some(gid => {
        const g = guests.find(x => x.id === gid);
        return g && hasConflictAtTable(g, table.id);
      });
      if (hasConflict) {
        stats.conflictsAvoided++;
        continue;
      }

      let score = 0;
      const tableGuests = Object.entries(assignments)
        .filter(([, tid]) => tid === table.id)
        .map(([gid]) => guests.find(g => g.id === gid))
        .filter(Boolean) as Guest[];

      const groupFirstGuest = guests.find(g => g.id === group[0]);
      if (groupFirstGuest) {
        const relatedCount = tableGuests.filter(tg =>
          getAllRelatedIds(groupFirstGuest).has(tg.id)
        ).length;
        score += relatedCount * 100;

        const sameGroup = tableGuests.filter(tg => tg.group === groupFirstGuest.group).length;
        score += sameGroup * 10;
      }

      const remainRatio = 1 - (load / table.capacity);
      score += remainRatio * 2;

      if (!best || score > best.score) {
        best = { id: table.id, score };
      }
    }
    return best?.id || null;
  };

  const findBestTableForGuest = (
    guest: Guest,
    preferredTableId?: string
  ): string | null => {
    const headcount = guest.headcount || 1;

    if (preferredTableId) {
      const load = tableLoad[preferredTableId];
      const table = tables.find(t => t.id === preferredTableId);
      if (table && load + headcount <= table.capacity && !hasConflictAtTable(guest, preferredTableId)) {
        return preferredTableId;
      }
    }

    let best: { id: string; score: number } | null = null;
    for (const table of availableTables) {
      const load = tableLoad[table.id];
      if (load + headcount > table.capacity) continue;
      if (hasConflictAtTable(guest, table.id)) {
        stats.conflictsAvoided++;
        continue;
      }

      let score = 0;
      const tableGuests = Object.entries(assignments)
        .filter(([, tid]) => tid === table.id)
        .map(([gid]) => guests.find(g => g.id === gid))
        .filter(Boolean) as Guest[];

      const relatedCount = tableGuests.filter(tg =>
        getAllRelatedIds(guest).has(tg.id)
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

  const assignGroupToTable = (group: string[], tableId: string) => {
    group.forEach(gid => {
      const g = guests.find(x => x.id === gid);
      if (!g) return;
      assignments[gid] = tableId;
      tableLoad[tableId] += g.headcount || 1;
    });
  };

  const familyGroups = getFamilyGroups(activeGuests);
  const unprocessedSingles: string[] = [];

  familyGroups.sort((a, b) => getGroupHeadcount(b, guests) - getGroupHeadcount(a, guests));

  const familySplitGroups: string[][] = [];

  for (const group of familyGroups) {
    if (group.length === 1) {
      if (!assignments[group[0]]) {
        unprocessedSingles.push(group[0]);
      }
      continue;
    }

    const alreadyAssigned = group.filter(gid => assignments[gid]);
    let preferredTable: string | null = null;
    if (alreadyAssigned.length > 0) {
      preferredTable = assignments[alreadyAssigned[0]];
    }

    const groupHeadcount = getGroupHeadcount(group, guests);
    let tableId = findBestTableForGroup(group, guests, preferredTable || undefined);

    if (tableId) {
      assignGroupToTable(group.filter(gid => !assignments[gid]), tableId);
      stats.familiesKeptTogether++;
    } else {
      familySplitGroups.push(group);
      const groupNames = group.map(gid => guests.find(g => g.id === gid)?.name).filter(Boolean).join('、');
      warnings.push(`⚠️ 家属群体「${groupNames}」（${groupHeadcount}人）无法安排到同一桌，将尝试拆分`);
      unmetNeeds.push({
        type: 'family_split',
        guestIds: group,
        message: `家属群体「${groupNames}」无法安排到同一桌，需人工调整`,
      });

      group.forEach(gid => {
        if (!assignments[gid]) {
          const g = guests.find(x => x.id === gid);
          if (g) {
            const individualTable = findBestTableForGuest(g, preferredTable || undefined);
            if (individualTable) {
              assignments[gid] = individualTable;
              tableLoad[individualTable] += g.headcount || 1;
            } else {
              unprocessedSingles.push(gid);
            }
          }
        }
      });
    }
  }

  const remainingSingles = unprocessedSingles.filter(gid => !assignments[gid]);

  const sortedSingles = [...remainingSingles]
    .map(id => guests.find(g => g.id === id)!)
    .filter(Boolean)
    .sort((a, b) => {
      const aRel = getAllRelatedIds(a).size;
      const bRel = getAllRelatedIds(b).size;
      if (bRel !== aRel) return bRel - aRel;
      if ((b.headcount || 1) !== (a.headcount || 1)) return (b.headcount || 1) - (a.headcount || 1);
      const groupOrder: any = { groom: 0, bride: 1, relative: 2, colleague: 3, friend: 4, other: 5 };
      return groupOrder[a.group] - groupOrder[b.group];
    });

  const withSplitPairs: Array<[string, string]> = [];

  for (const guest of sortedSingles) {
    if (assignments[guest.id]) continue;

    let preferredTable: string | null = null;
    const familyIds = getFamilyIds(guest);
    for (const fid of familyIds) {
      if (assignments[fid]) { preferredTable = assignments[fid]; break; }
    }
    if (!preferredTable) {
      const withIds = getWithIds(guest);
      for (const wid of withIds) {
        if (assignments[wid]) { preferredTable = assignments[wid]; break; }
      }
    }

    const tableId = findBestTableForGuest(guest, preferredTable || undefined);
    if (tableId) {
      assignments[guest.id] = tableId;
      tableLoad[tableId] += guest.headcount || 1;

      const withIds = getWithIds(guest);
      for (const wid of withIds) {
        if (assignments[wid] || activeGuests.find(g => g.id === wid)?.status === 'absent') continue;
        const wg = guests.find(g => g.id === wid);
        if (!wg) continue;
        const wt = findBestTableForGuest(wg, tableId);
        if (wt) {
          assignments[wid] = wt;
          tableLoad[wt] += wg.headcount || 1;
          stats.withKeptTogether++;
        } else {
          withSplitPairs.push([guest.id, wid]);
          const wgName = wg.name;
          warnings.push(`⚠️ ${wgName} 无法和 ${guest.name} 安排到同一桌（桌位不足或存在冲突）`);
          unmetNeeds.push({
            type: 'with_split',
            guestIds: [guest.id, wid],
            message: `${wgName} 无法和 ${guest.name} 安排到同一桌，需人工调整`,
          });
          stats.withSplit++;
        }
      }
    } else {
      stats.totalUnassigned++;
      warnings.push(`❌ ${guest.name}（${guest.headcount || 1}人）暂无可用桌位，所有桌位已满或存在冲突`);
      unmetNeeds.push({
        type: 'no_seat',
        guestIds: [guest.id],
        message: `${guest.name}（${guest.headcount || 1}人）暂无可用桌位`,
      });
    }
  }

  stats.totalAssigned = Object.keys(assignments).length;
  stats.familiesSplit = familySplitGroups.length;
  stats.totalUnassigned = activeGuests.length - stats.totalAssigned;

  return {
    assignments,
    warnings,
    unmetNeeds,
    summary: stats,
  };
}
