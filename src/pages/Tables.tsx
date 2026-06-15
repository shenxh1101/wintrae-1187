import { useMemo, useState } from 'react';
import {
  LayoutGrid, Plus, Edit3, Trash2, AlertTriangle, Users, Search, X, GripVertical,
  Sparkles, Crown, Baby, Accessibility, Flower2, Heart, UsersRound, AlertOctagon,
} from 'lucide-react';
import { useWeddingStore } from '@/store/useWeddingStore';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import type { Guest, Table, GuestGroup, GuestStatus, GuestTag } from '@/types';
import {
  GUEST_GROUP_LABELS, GUEST_STATUS_LABELS, GUEST_TAG_LABELS, GUEST_TAG_COLORS,
} from '@/types';
import { autoAssignTables } from '@/utils/seating';

const TagIconMap: Record<GuestTag, any> = {
  elderly: Crown,
  child: Baby,
  disabled: Accessibility,
  vip: Flower2,
  pregnant: Heart,
};

export default function Tables() {
  const {
    guests, tables, addTable, updateTable, deleteTable, assignGuestToTable,
  } = useWeddingStore();

  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState({ tableNo: tables.length + 1, name: '', capacity: 10 });
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<GuestGroup | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<GuestStatus | 'all'>('confirmed');
  const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [autoWarnings, setAutoWarnings] = useState<string[]>([]);
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);

  const stats = useMemo(() => {
    const totalSeats = tables.reduce((s, t) => s + t.capacity, 0);
    const assigned = guests.filter(g => g.tableId && g.status !== 'absent').reduce((s, g) => s + (g.headcount || 1), 0);
    const unassignedConfirmed = guests.filter(g => !g.tableId && g.status === 'confirmed').length;
    const withConflicts = guests.filter(g => (g.conflictIds?.length || 0) > 0).length;
    return {
      tableCount: tables.length,
      totalSeats,
      assigned,
      unassignedConfirmed,
      remaining: totalSeats - assigned,
      withConflicts,
    };
  }, [guests, tables]);

  const guestNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    guests.forEach(g => { map[g.id] = g.name; });
    return map;
  }, [guests]);

  const guestsByTable = useMemo(() => {
    const map: Record<string, Guest[]> = {};
    tables.forEach(t => { map[t.id] = []; });
    guests.forEach(g => {
      if (g.tableId && map[g.tableId]) map[g.tableId].push(g);
    });
    return map;
  }, [guests, tables]);

  const unassignedGuests = useMemo(() => {
    return guests.filter(g => {
      if (g.tableId) return false;
      if (filterStatus !== 'all' && g.status !== filterStatus) return false;
      if (filterGroup !== 'all' && g.group !== filterGroup) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          g.name.toLowerCase().includes(s) ||
          (g.tags || []).some(t => GUEST_TAG_LABELS[t].includes(s)) ||
          g.dietary.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [guests, filterStatus, filterGroup, search]);

  const hasTableConflict = (tableId: string, guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest?.conflictIds?.length) return false;
    const tableGuests = guestsByTable[tableId] || [];
    return tableGuests.some(g => guest.conflictIds.includes(g.id));
  };

  const getTableConflictPairs = (tableGuests: Guest[]): Array<[Guest, Guest]> => {
    const pairs: Array<[Guest, Guest]> = [];
    for (let i = 0; i < tableGuests.length; i++) {
      for (let j = i + 1; j < tableGuests.length; j++) {
        const a = tableGuests[i], b = tableGuests[j];
        if ((a.conflictIds || []).includes(b.id) || (b.conflictIds || []).includes(a.id)) {
          pairs.push([a, b]);
        }
      }
    }
    return pairs;
  };

  const getTableFamilyPairs = (tableGuests: Guest[]): Array<[Guest, Guest]> => {
    const pairs: Array<[Guest, Guest]> = [];
    for (let i = 0; i < tableGuests.length; i++) {
      for (let j = i + 1; j < tableGuests.length; j++) {
        const a = tableGuests[i], b = tableGuests[j];
        if ((a.familyIds || []).includes(b.id) || (b.familyIds || []).includes(a.id)) {
          pairs.push([a, b]);
        }
      }
    }
    return pairs;
  };

  const handleOpenTable = (t?: Table) => {
    if (t) {
      setEditingTable(t);
      setTableForm({ tableNo: t.tableNo, name: t.name, capacity: t.capacity });
    } else {
      setEditingTable(null);
      const nextNo = tables.length > 0 ? Math.max(...tables.map(x => x.tableNo)) + 1 : 1;
      setTableForm({ tableNo: nextNo, name: '', capacity: 10 });
    }
    setTableModalOpen(true);
  };

  const handleSubmitTable = () => {
    if (tableForm.tableNo <= 0) return alert('桌号必须大于0');
    if (editingTable) {
      updateTable(editingTable.id, tableForm);
    } else {
      addTable(tableForm);
    }
    setTableModalOpen(false);
  };

  const handleDeleteTable = (t: Table) => {
    if (!confirm(`确定删除"${t.tableNo}号桌 ${t.name}"吗？该桌宾客将变为未分配状态。`)) return;
    deleteTable(t.id);
  };

  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    setDraggingGuestId(guestId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', guestId);
  };

  const handleDropToTable = (e: React.DragEvent, tableId: string) => {
    e.preventDefault();
    setDragOverTableId(null);
    const guestId = draggingGuestId || e.dataTransfer.getData('text/plain');
    if (!guestId) return;
    const guest = guests.find(g => g.id === guestId);
    if (guest && hasTableConflict(tableId, guestId)) {
      if (!confirm(`${guest.name} 与该桌现有宾客存在冲突关系，确定要安排同桌吗？`)) {
        setDraggingGuestId(null);
        return;
      }
    }
    assignGuestToTable(guestId, tableId);
    setDraggingGuestId(null);
  };

  const handleDropToUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const guestId = draggingGuestId || e.dataTransfer.getData('text/plain');
    if (!guestId) return;
    assignGuestToTable(guestId, null);
    setDraggingGuestId(null);
  };

  const handleAutoAssign = (clearExisting: boolean) => {
    if (tables.length === 0) {
      alert('请先添加桌位');
      return;
    }
    if (clearExisting && !confirm('确定清空现有编排并重新智能排桌吗？')) return;
    const result = autoAssignTables(guests, tables, { clearExisting });
    Object.entries(result.assignments).forEach(([guestId, tableId]) => {
      assignGuestToTable(guestId, tableId);
    });
    setAutoWarnings(result.warnings);
    if (result.warnings.length > 0) {
      setWarningsModalOpen(true);
    } else {
      alert('🎉 智能排桌完成，全部宾客已安排妥当！');
    }
  };

  const renderGuestMini = (g: Guest, tableGuests?: Guest[]) => {
    const conflictInTable = tableGuests ? g.conflictIds?.some(cid => tableGuests.some(x => x.id === cid)) : false;
    const hasFamilyInTable = tableGuests ? g.familyIds?.some(fid => tableGuests.some(x => x.id === fid)) : false;
    const hasWithInTable = tableGuests ? g.withIds?.some(wid => tableGuests.some(x => x.id === wid)) : false;

    return (
      <div
        key={g.id}
        draggable
        onDragStart={e => handleDragStart(e, g.id)}
        onDragEnd={() => setDraggingGuestId(null)}
        className={`group flex items-start gap-2 p-2.5 rounded-xl border cursor-grab active:cursor-grabbing text-sm transition-all ${
          conflictInTable
            ? 'bg-red-50 border-red-200 text-red-700 conflict-pulse'
            : hasFamilyInTable
            ? 'bg-rose-50 border-rose-200'
            : hasWithInTable
            ? 'bg-champagne-50 border-champagne-200'
            : 'bg-sand-50 border-sand-100 hover:bg-sand-100'
        } ${draggingGuestId === g.id ? 'dragging' : ''}`}
      >
        <GripVertical className="w-4 h-4 text-ink-300 shrink-0 mt-0.5 no-print" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-ink-800">{g.name}</span>
            <span className="text-xs text-ink-500">{g.headcount || 1}人</span>
            {(g.tags || []).map(tag => {
              const Icon = TagIconMap[tag];
              return (
                <span
                  key={tag}
                  className={`chip !py-0 !px-1.5 !text-[10px] border ${GUEST_TAG_COLORS[tag]}`}
                  title={GUEST_TAG_LABELS[tag]}
                >
                  <Icon className="w-3 h-3" />
                  {GUEST_TAG_LABELS[tag]}
                </span>
              );
            })}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {g.dietary && (
              <span className="text-[11px] text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5">
                ⚠️ {g.dietary}
              </span>
            )}
            {hasFamilyInTable && tableGuests && (
              <span className="text-[11px] text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                <UsersRound className="w-3 h-3" />
                家属同桌
              </span>
            )}
            {hasWithInTable && !hasFamilyInTable && tableGuests && (
              <span className="text-[11px] text-champagne-400 bg-champagne-50 border border-champagne-100 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                <Heart className="w-3 h-3" />
                优先同桌
              </span>
            )}
            {conflictInTable && tableGuests && (
              <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 flex items-center gap-0.5 font-medium">
                <AlertOctagon className="w-3 h-3" />
                冲突
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => assignGuestToTable(g.id, null)}
          className="hidden group-hover:inline-flex btn-ghost !p-1 no-print shrink-0"
          title="移出此桌"
        >
          <X className="w-3.5 h-3.5 text-ink-500" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">桌位编排</h1>
          <p className="text-sm text-ink-500">
            将宾客从左侧拖拽到对应桌位 · 共 {stats.withConflicts} 位宾客标记了冲突关系
          </p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button
            onClick={() => handleAutoAssign(false)}
            className="btn-outline flex items-center gap-1.5"
            title="保留已有安排，仅排未分配宾客"
          >
            <Sparkles className="w-4 h-4 text-champagne-400" />
            智能补排
          </button>
          <button
            onClick={() => handleAutoAssign(true)}
            className="btn-primary flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            一键初排
          </button>
          <button onClick={() => handleOpenTable()} className="btn-outline">
            <Plus className="w-4 h-4" />添加桌位
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="桌位总数" value={stats.tableCount} icon={LayoutGrid} color="rose" suffix="桌" />
        <StatCard label="总座位数" value={stats.totalSeats} icon={Users} color="champagne" suffix="座" />
        <StatCard label="已安排人数" value={stats.assigned} icon={Users} color="mint" suffix="人" />
        <StatCard label="剩余空位" value={Math.max(0, stats.remaining)} icon={Users} color="ink" suffix="座" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 card card-inner">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">待分配宾客</h3>
            <span className="badge bg-rose-50 text-rose-500 border border-rose-100">{unassignedGuests.length} 位</span>
          </div>
          <div className="mb-3 space-y-2 no-print">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
              <input className="input pl-9" placeholder="搜索姓名、标签、忌口..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select className="select flex-1 text-xs" value={filterGroup} onChange={e => setFilterGroup(e.target.value as GuestGroup | 'all')}>
                <option value="all">全部分组</option>
                {Object.entries(GUEST_GROUP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select className="select flex-1 text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value as GuestStatus | 'all')}>
                <option value="confirmed">仅已确认</option>
                <option value="all">全部状态</option>
                <option value="pending">待定</option>
                <option value="inviting">邀请中</option>
              </select>
            </div>
          </div>
          <div
            onDragOver={e => { e.preventDefault(); }}
            onDrop={handleDropToUnassigned}
            className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1"
          >
            {unassignedGuests.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-500">
                全部宾客已分配完毕 🎉
              </div>
            ) : (
              unassignedGuests.map(g => {
                const hasConflict = (g.conflictIds?.length || 0) > 0;
                const hasFamily = (g.familyIds?.length || 0) > 0;
                const hasWith = (g.withIds?.length || 0) > 0;
                return (
                  <div
                    key={g.id}
                    draggable
                    onDragStart={e => handleDragStart(e, g.id)}
                    onDragEnd={() => setDraggingGuestId(null)}
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:bg-rose-50 ${
                      hasConflict ? 'bg-red-50/60 border-red-200' : 'bg-rose-50/60 border-rose-100'
                    } ${draggingGuestId === g.id ? 'dragging' : ''}`}
                  >
                    <GripVertical className={`w-4 h-4 shrink-0 mt-0.5 no-print ${hasConflict ? 'text-red-300' : 'text-rose-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-ink-800 text-sm">{g.name}</span>
                        <span className="text-xs text-ink-500">{g.headcount || 1}人</span>
                        {(g.tags || []).map(tag => {
                          const Icon = TagIconMap[tag];
                          return (
                            <span
                              key={tag}
                              className={`chip !py-0 !px-1.5 !text-[10px] border ${GUEST_TAG_COLORS[tag]}`}
                              title={GUEST_TAG_LABELS[tag]}
                            >
                              <Icon className="w-3 h-3" />
                              {GUEST_TAG_LABELS[tag]}
                            </span>
                          );
                        })}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {g.dietary && (
                          <span className="text-[11px] text-rose-500 bg-white/70 border border-rose-100 rounded px-1.5 py-0.5">
                            ⚠️ {g.dietary}
                          </span>
                        )}
                        {hasFamily && (
                          <span className="text-[11px] text-rose-500 bg-rose-100/70 border border-rose-200 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                            <UsersRound className="w-3 h-3" />
                            家属: {(g.familyIds || []).map(id => guestNameMap[id]).filter(Boolean).join('、')}
                          </span>
                        )}
                        {hasWith && (
                          <span className="text-[11px] text-champagne-400 bg-champagne-100/70 border border-champagne-200 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                            <Heart className="w-3 h-3" />
                            优先: {(g.withIds || []).map(id => guestNameMap[id]).filter(Boolean).join('、')}
                          </span>
                        )}
                        {hasConflict && (
                          <span className="text-[11px] text-red-600 bg-red-100/70 border border-red-200 rounded px-1.5 py-0.5 flex items-center gap-0.5 font-medium">
                            <AlertOctagon className="w-3 h-3" />
                            冲突: {(g.conflictIds || []).map(id => guestNameMap[id]).filter(Boolean).join('、')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {tables.length === 0 ? (
            <EmptyState title="还没有桌位" description="点击「添加桌位」或「一键初排」开始编排桌次" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {tables.map(t => {
                const tableGuests = guestsByTable[t.id] || [];
                const headcount = tableGuests.reduce((s, g) => s + (g.headcount || 1), 0);
                const isFull = headcount >= t.capacity;
                const overflow = Math.max(0, headcount - t.capacity);
                const conflictPairs = getTableConflictPairs(tableGuests);
                const hasConflict = conflictPairs.length > 0;
                const familyPairs = getTableFamilyPairs(tableGuests);
                const hasFamily = familyPairs.length > 0;
                const hasDietary = tableGuests.some(g => g.dietary);
                const hasTags = tableGuests.some(g => (g.tags || []).length > 0);
                const isOver = dragOverTableId === t.id;
                const dropConflict = draggingGuestId && hasTableConflict(t.id, draggingGuestId);

                return (
                  <div
                    key={t.id}
                    onDragOver={e => { e.preventDefault(); setDragOverTableId(t.id); }}
                    onDragLeave={() => setDragOverTableId(prev => prev === t.id ? null : prev)}
                    onDrop={e => handleDropToTable(e, t.id)}
                    className={`card card-inner transition-all ${
                      isOver
                        ? dropConflict
                          ? 'drag-over border-red-400 ring-2 ring-red-200'
                          : 'drag-over'
                        : ''
                    } ${hasConflict ? 'conflict-pulse border-red-300' : ''}`}
                  >
                    <div className="relative mb-4">
                      <div
                        className={`w-32 h-32 mx-auto rounded-full flex flex-col items-center justify-center border-4 ${
                          isFull
                            ? 'border-mint-300 bg-gradient-to-br from-mint-100 to-mint-50'
                            : overflow > 0
                            ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100'
                            : 'border-rose-200 bg-gradient-to-br from-rose-50 to-champagne-50'
                        } shadow-inner`}
                      >
                        <div className="font-serif text-2xl font-bold text-ink-900">{t.tableNo}</div>
                        <div className="text-xs text-ink-600 font-medium">号桌</div>
                        <div className={`text-xs mt-0.5 ${overflow > 0 ? 'text-red-500 font-semibold' : 'text-ink-500'}`}>
                          {headcount}/{t.capacity}人
                          {overflow > 0 && ` (超${overflow})`}
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
                        {hasConflict && (
                          <div className="flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-lg shadow">
                            <AlertTriangle className="w-3 h-3" />冲突
                          </div>
                        )}
                        <div className="flex gap-1">
                          {hasFamily && (
                            <div className="flex items-center gap-0.5 bg-rose-100 text-rose-500 text-[10px] px-1.5 py-0.5 rounded border border-rose-200">
                              <UsersRound className="w-3 h-3" />家属
                            </div>
                          )}
                          {hasTags && (
                            <div className="flex items-center gap-0.5 bg-champagne-100 text-champagne-400 text-[10px] px-1.5 py-0.5 rounded border border-champagne-200">
                              <Crown className="w-3 h-3" />特殊
                            </div>
                          )}
                          {hasDietary && (
                            <div className="flex items-center gap-0.5 bg-rose-50 text-rose-500 text-[10px] px-1.5 py-0.5 rounded border border-rose-200">
                              ⚠️忌口
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-0 left-0 flex gap-0.5 no-print">
                        <button onClick={() => handleOpenTable(t)} className="btn-ghost !p-1.5 !bg-white/80" title="编辑桌位">
                          <Edit3 className="w-3.5 h-3.5 text-ink-500" />
                        </button>
                        <button onClick={() => handleDeleteTable(t)} className="btn-ghost !p-1.5 !bg-white/80" title="删除桌位">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <div className="text-center mb-3">
                      <h4 className="font-serif font-semibold text-ink-800">{t.name || `桌次${t.tableNo}`}</h4>
                      {hasConflict && (
                        <div className="mt-1 text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                          {conflictPairs.map(([a, b], i) => (
                            <span key={i}>
                              ⚠️ {a.name} ↔ {b.name} 存在冲突
                              {i < conflictPairs.length - 1 && '；'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                      {tableGuests.length === 0 ? (
                        <div className="text-center text-sm text-ink-500 py-6 border-2 border-dashed border-rose-100 rounded-xl">
                          拖拽宾客到此桌
                        </div>
                      ) : (
                        tableGuests.map(g => renderGuestMini(g, tableGuests))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        title={editingTable ? `编辑桌位` : `添加桌位`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">桌号</label>
            <input type="number" min="1" className="input" value={tableForm.tableNo} onChange={e => setTableForm({ ...tableForm, tableNo: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">桌名 / 桌次说明</label>
            <input className="input" value={tableForm.name} onChange={e => setTableForm({ ...tableForm, name: e.target.value })} placeholder="如：主桌、男方亲戚..." />
          </div>
          <div>
            <label className="label">容纳人数</label>
            <input type="number" min="1" className="input" value={tableForm.capacity} onChange={e => setTableForm({ ...tableForm, capacity: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setTableModalOpen(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitTable} className="btn-primary">{editingTable ? '保存' : '添加桌位'}</button>
        </div>
      </Modal>

      <Modal
        open={warningsModalOpen}
        onClose={() => setWarningsModalOpen(false)}
        title="智能排桌提示"
        size="md"
      >
        <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
          {autoWarnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
                w.startsWith('❌')
                  ? 'bg-red-50 border-red-100 text-red-700'
                  : 'bg-champagne-50 border-champagne-100 text-champagne-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w.replace(/^[❌⚠️]\s*/, '')}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end no-print">
          <button onClick={() => setWarningsModalOpen(false)} className="btn-primary">知道了</button>
        </div>
      </Modal>
    </div>
  );
}
