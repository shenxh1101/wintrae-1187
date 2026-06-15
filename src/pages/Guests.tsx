import { useMemo, useState } from 'react';
import {
  Users, UserPlus, UserCheck, Clock, UserX, Search,
  Edit3, Trash2, ChevronDown, ChevronUp, Filter, AlertOctagon,
} from 'lucide-react';
import { useWeddingStore } from '@/store/useWeddingStore';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import type { Guest, GuestGroup, GuestStatus } from '@/types';
import { GUEST_GROUP_LABELS, GUEST_STATUS_LABELS } from '@/types';
import { downloadCSV } from '@/utils/export';

const emptyGuest: Omit<Guest, 'id'> = {
  name: '', phone: '', group: 'friend', status: 'inviting',
  headcount: 1, dietary: '', specialNeeds: '', seatPreference: '',
  conflictIds: [], tableId: null,
};

const statusColorMap: Record<GuestStatus, string> = {
  inviting: 'bg-champagne-100 text-champagne-400 border-champagne-200',
  confirmed: 'bg-mint-100 text-mint-400 border-mint-200',
  pending: 'bg-rose-50 text-rose-500 border-rose-200',
  absent: 'bg-sand-100 text-ink-500 border-sand-200',
};

const groupColorMap: Record<GuestGroup, string> = {
  groom: 'bg-blue-50 text-blue-600 border-blue-100',
  bride: 'bg-rose-50 text-rose-500 border-rose-100',
  colleague: 'bg-purple-50 text-purple-600 border-purple-100',
  friend: 'bg-mint-100 text-mint-400 border-mint-200',
  relative: 'bg-champagne-100 text-champagne-400 border-champagne-200',
  other: 'bg-sand-100 text-ink-600 border-sand-200',
};

export default function Guests() {
  const {
    guests, tables, addGuest, updateGuest, deleteGuest,
  } = useWeddingStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState<Omit<Guest, 'id'>>(emptyGuest);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<GuestGroup | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<GuestStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = guests.reduce((sum, g) => sum + (g.status === 'absent' ? 0 : g.headcount || 1), 0);
    const confirmed = guests.filter(g => g.status === 'confirmed').reduce((s, g) => s + (g.headcount || 1), 0);
    const pending = guests.filter(g => g.status === 'pending' || g.status === 'inviting').reduce((s, g) => s + (g.headcount || 1), 0);
    const absent = guests.filter(g => g.status === 'absent').length;
    return { total, confirmed, pending, absent, tableCount: tables.length };
  }, [guests, tables]);

  const filtered = useMemo(() => {
    return guests.filter(g => {
      if (filterGroup !== 'all' && g.group !== filterGroup) return false;
      if (filterStatus !== 'all' && g.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return g.name.toLowerCase().includes(s) || g.phone.includes(s) || g.dietary.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => {
      const order: GuestGroup[] = ['groom', 'bride', 'relative', 'colleague', 'friend', 'other'];
      return order.indexOf(a.group) - order.indexOf(b.group);
    });
  }, [guests, filterGroup, filterStatus, search]);

  const handleOpen = (g?: Guest) => {
    if (g) {
      setEditing(g);
      setForm({
        name: g.name, phone: g.phone, group: g.group, status: g.status,
        headcount: g.headcount, dietary: g.dietary, specialNeeds: g.specialNeeds,
        seatPreference: g.seatPreference, conflictIds: g.conflictIds, tableId: g.tableId,
      });
    } else {
      setEditing(null);
      setForm(emptyGuest);
    }
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return alert('请填写姓名');
    if (editing) {
      updateGuest(editing.id, form);
    } else {
      addGuest(form);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定删除宾客"${name}"吗？`)) deleteGuest(id);
  };

  const handleExportCSV = () => {
    const header = ['姓名', '电话', '分组', '状态', '人数', '忌口', '特殊需求', '坐席偏好'];
    const rows = guests.map(g => [
      g.name, g.phone, GUEST_GROUP_LABELS[g.group], GUEST_STATUS_LABELS[g.status],
      g.headcount, g.dietary, g.specialNeeds, g.seatPreference,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCSV('宾客清单.csv', csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">宾客清单</h1>
          <p className="text-sm text-ink-500">共 {guests.length} 位宾客记录，按分组与状态管理</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={handleExportCSV} className="btn-outline">
            <Filter className="w-4 h-4" />导出CSV
          </button>
          <button onClick={() => handleOpen()} className="btn-primary">
            <UserPlus className="w-4 h-4" />添加宾客
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="预计总人数" value={stats.total} icon={Users} color="rose" suffix="人" />
        <StatCard label="已确认出席" value={stats.confirmed} icon={UserCheck} color="mint" suffix="人" />
        <StatCard label="待回复" value={stats.pending} icon={Clock} color="champagne" suffix="人" />
        <StatCard label="无法出席" value={stats.absent} icon={UserX} color="ink" suffix="位" />
      </div>

      <div className="card card-inner no-print">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              className="input pl-10"
              placeholder="搜索姓名、电话、忌口..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select lg:w-40"
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value as GuestGroup | 'all')}
          >
            <option value="all">全部分组</option>
            {Object.entries(GUEST_GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="select lg:w-36"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as GuestStatus | 'all')}
          >
            <option value="all">全部状态</option>
            {Object.entries(GUEST_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState description="没有匹配的宾客，试试调整筛选条件或添加新宾客" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(g => {
            const isExpanded = expandedId === g.id;
            const assignedTable = tables.find(t => t.id === g.tableId);
            const hasConflicts = g.conflictIds?.length > 0;
            return (
              <div key={g.id} className="card card-inner animate-slide-up" style={{ animationDelay: '20ms' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h4 className="font-serif text-lg font-semibold text-ink-900 truncate">{g.name}</h4>
                      <span className={`chip border ${groupColorMap[g.group]}`}>{GUEST_GROUP_LABELS[g.group]}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`chip border ${statusColorMap[g.status]}`}>{GUEST_STATUS_LABELS[g.status]}</span>
                      <span className="text-xs text-ink-500">
                        {(g.headcount || 1)} 人{g.phone && ` · ${g.phone}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 no-print">
                    <button onClick={() => handleOpen(g)} className="btn-ghost !p-1.5" title="编辑">
                      <Edit3 className="w-4 h-4 text-ink-500" />
                    </button>
                    <button onClick={() => handleDelete(g.id, g.name)} className="btn-ghost !p-1.5" title="删除">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {(g.dietary || g.specialNeeds || g.seatPreference || assignedTable) && (
                  <div className={`mt-3 pt-3 border-t border-rose-50 text-sm space-y-1.5 overflow-hidden transition-all ${isExpanded ? 'max-h-96' : 'max-h-16'}`}>
                    {assignedTable && (
                      <div className="text-ink-700">
                        <span className="text-ink-500">桌位：</span>
                        {assignedTable.tableNo}号桌 · {assignedTable.name}
                      </div>
                    )}
                    {g.dietary && (
                      <div className="text-ink-700">
                        <span className="text-ink-500">忌口：</span>
                        <span className="text-rose-500">{g.dietary}</span>
                      </div>
                    )}
                    {g.specialNeeds && (
                      <div className="text-ink-700">
                        <span className="text-ink-500">特殊需求：</span>{g.specialNeeds}
                      </div>
                    )}
                    {g.seatPreference && (
                      <div className="text-ink-700">
                        <span className="text-ink-500">坐席偏好：</span>{g.seatPreference}
                      </div>
                    )}
                    {hasConflicts && (
                      <div className="flex items-center gap-1 text-red-500">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>与{g.conflictIds.length}人存在同桌冲突</span>
                      </div>
                    )}
                  </div>
                )}

                {(g.dietary || g.specialNeeds || g.seatPreference || assignedTable) && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : g.id)}
                    className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs text-ink-500 hover:text-rose-500 transition-colors no-print"
                  >
                    {isExpanded ? <>收起<ChevronUp className="w-3.5 h-3.5" /></> : <>查看详情<ChevronDown className="w-3.5 h-3.5" /></>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `编辑宾客：${editing.name}` : '添加新宾客'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">姓名 *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="宾客姓名" />
          </div>
          <div>
            <label className="label">联系电话</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="手机号码" />
          </div>
          <div>
            <label className="label">分组归属</label>
            <select className="select" value={form.group} onChange={e => setForm({ ...form, group: e.target.value as GuestGroup })}>
              {Object.entries(GUEST_GROUP_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">出席状态</label>
            <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as GuestStatus })}>
              {Object.entries(GUEST_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">出席人数（含本人）</label>
            <input type="number" min="0" className="input" value={form.headcount} onChange={e => setForm({ ...form, headcount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">饮食忌口</label>
            <input className="input" value={form.dietary} onChange={e => setForm({ ...form, dietary: e.target.value })} placeholder="如：素食、海鲜过敏..." />
          </div>
          <div>
            <label className="label">坐席偏好</label>
            <input className="input" value={form.seatPreference} onChange={e => setForm({ ...form, seatPreference: e.target.value })} placeholder="如：靠近主桌" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">特殊需求 / 备注</label>
            <textarea className="textarea" value={form.specialNeeds} onChange={e => setForm({ ...form, specialNeeds: e.target.value })} placeholder="如：需要轮椅通道、带小孩需儿童椅等" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setModalOpen(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmit} className="btn-primary">{editing ? '保存修改' : '添加宾客'}</button>
        </div>
      </Modal>
    </div>
  );
}
