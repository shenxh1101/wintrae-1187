import { useMemo, useState } from 'react';
import {
  CalendarClock, Plus, Edit3, Trash2, MapPin, User, StickyNote,
  Phone, CheckSquare, Clock, AlertCircle, Camera, Sparkles, Mic,
  Hotel, Flower2, Shirt, MoreHorizontal, Check, X,
} from 'lucide-react';
import { useWeddingStore } from '@/store/useWeddingStore';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import type { ScheduleItem, Supplier, SupplierCategory, Todo, TodoPriority, TodoStage } from '@/types';
import { SUPPLIER_CATEGORY_LABELS, TODO_PRIORITY_LABELS, TODO_STAGE_LABELS } from '@/types';
import { formatDateShort } from '@/utils/format';

const supplierIconMap: Record<SupplierCategory, any> = {
  photo: Camera, makeup: Sparkles, mc: Mic, hotel: Hotel,
  flower: Flower2, dress: Shirt, other: MoreHorizontal,
};

const priorityColorMap: Record<TodoPriority, string> = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-champagne-100 text-champagne-400 border-champagne-200',
  low: 'bg-mint-100 text-mint-400 border-mint-200',
};

const stageTabColor: Record<TodoStage, { active: string; normal: string }> = {
  before: { active: 'from-rose-300 to-rose-400 text-white', normal: 'bg-white text-ink-600 hover:bg-rose-50' },
  during: { active: 'from-champagne-300 to-champagne-400 text-white', normal: 'bg-white text-ink-600 hover:bg-champagne-50' },
  after: { active: 'from-mint-300 to-mint-400 text-white', normal: 'bg-white text-ink-600 hover:bg-mint-50' },
};

export default function Schedule() {
  const {
    schedule, suppliers, todos,
    addSchedule, updateSchedule, deleteSchedule,
    addSupplier, updateSupplier, deleteSupplier,
    addTodo, updateTodo, deleteTodo, toggleTodo,
  } = useWeddingStore();

  const [scheduleModal, setScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Omit<ScheduleItem, 'id'>>({
    date: '', time: '09:00', title: '', location: '', owner: '', notes: '',
  });

  const [supplierModal, setSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<Omit<Supplier, 'id'>>({
    category: 'photo', name: '', contact: '', phone: '', notes: '',
  });

  const [todoModal, setTodoModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [todoForm, setTodoForm] = useState<Omit<Todo, 'id'>>({
    title: '', stage: 'before', priority: 'medium', done: false, dueDate: '',
  });

  const [todoStage, setTodoStage] = useState<TodoStage>('before');

  const todoStats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter(t => t.done).length;
    const highUndone = todos.filter(t => !t.done && t.priority === 'high').length;
    return { total, done, pending: total - done, highUndone };
  }, [todos]);

  const sortedSchedule = useMemo(() => {
    return [...schedule].sort((a, b) => {
      const ad = (a.date || '') + a.time;
      const bd = (b.date || '') + b.time;
      return ad.localeCompare(bd);
    });
  }, [schedule]);

  const filteredTodos = useMemo(() => {
    return todos.filter(t => t.stage === todoStage).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const order: TodoPriority[] = ['high', 'medium', 'low'];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    });
  }, [todos, todoStage]);

  const handleOpenSchedule = (s?: ScheduleItem) => {
    if (s) {
      setEditingSchedule(s);
      setScheduleForm({ date: s.date, time: s.time, title: s.title, location: s.location, owner: s.owner, notes: s.notes });
    } else {
      setEditingSchedule(null);
      setScheduleForm({ date: '', time: '09:00', title: '', location: '', owner: '', notes: '' });
    }
    setScheduleModal(true);
  };
  const handleSubmitSchedule = () => {
    if (!scheduleForm.title.trim()) return alert('请填写流程标题');
    if (editingSchedule) updateSchedule(editingSchedule.id, scheduleForm);
    else addSchedule(scheduleForm);
    setScheduleModal(false);
  };

  const handleOpenSupplier = (s?: Supplier) => {
    if (s) {
      setEditingSupplier(s);
      setSupplierForm({ category: s.category, name: s.name, contact: s.contact, phone: s.phone, notes: s.notes });
    } else {
      setEditingSupplier(null);
      setSupplierForm({ category: 'photo', name: '', contact: '', phone: '', notes: '' });
    }
    setSupplierModal(true);
  };
  const handleSubmitSupplier = () => {
    if (!supplierForm.name.trim()) return alert('请填写供应商名称');
    if (editingSupplier) updateSupplier(editingSupplier.id, supplierForm);
    else addSupplier(supplierForm);
    setSupplierModal(false);
  };

  const handleOpenTodo = (t?: Todo) => {
    if (t) {
      setEditingTodo(t);
      setTodoForm({ title: t.title, stage: t.stage, priority: t.priority, done: t.done, dueDate: t.dueDate });
    } else {
      setEditingTodo(null);
      setTodoForm({ title: '', stage: todoStage, priority: 'medium', done: false, dueDate: '' });
    }
    setTodoModal(true);
  };
  const handleSubmitTodo = () => {
    if (!todoForm.title.trim()) return alert('请填写待办内容');
    if (editingTodo) updateTodo(editingTodo.id, todoForm);
    else addTodo(todoForm);
    setTodoModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">流程单 & 待办</h1>
          <p className="text-sm text-ink-500">管理婚礼流程时间轴、供应商联系人和全阶段待办事项</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="流程节点" value={schedule.length} icon={CalendarClock} color="rose" suffix="项" />
        <StatCard label="供应商" value={suppliers.length} icon={Phone} color="champagne" suffix="家" />
        <StatCard label="待办已完成" value={todoStats.done} icon={Check} color="mint" suffix="项" />
        <StatCard label="高优待办" value={todoStats.highUndone} icon={AlertCircle} color="ink" suffix="项" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 card card-inner">
          <div className="flex items-center justify-between mb-5">
            <h3 className="section-title mb-0 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-rose-400" />婚礼流程时间轴
            </h3>
            <button onClick={() => handleOpenSchedule()} className="btn-primary !py-1.5 !px-3 no-print">
              <Plus className="w-3.5 h-3.5" />添加节点
            </button>
          </div>
          {sortedSchedule.length === 0 ? (
            <EmptyState title="暂无流程节点" />
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-200 via-champagne-200 to-mint-200" />
              <div className="space-y-5">
                {sortedSchedule.map((s, idx) => (
                  <div key={s.id} className="relative animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="absolute -left-[22px] top-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-rose-300 to-champagne-300 border-4 border-white shadow-soft flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div className="card !rounded-xl border !shadow-none !hover:shadow-none !hover:translate-y-0 !bg-gradient-to-br !from-rose-50/50 !to-champagne-50/50">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-300 to-champagne-300 text-white text-xs font-semibold shadow-soft">
                                <Clock className="w-3 h-3" />{s.time}
                              </span>
                              {s.date && <span className="text-xs text-ink-500">{formatDateShort(s.date)}</span>}
                            </div>
                            <h4 className="font-serif text-lg font-semibold text-ink-900 mt-1.5">{s.title}</h4>
                          </div>
                          <div className="flex gap-0.5 no-print shrink-0">
                            <button onClick={() => handleOpenSchedule(s)} className="btn-ghost !p-1.5"><Edit3 className="w-3.5 h-3.5 text-ink-500" /></button>
                            <button onClick={() => confirm(`删除流程「${s.title}」?`) && deleteSchedule(s.id)} className="btn-ghost !p-1.5"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-ink-600 mt-2">
                          {s.location && <div className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 text-rose-400 shrink-0" /><span>{s.location}</span></div>}
                          {s.owner && <div className="flex items-start gap-1.5"><User className="w-3.5 h-3.5 mt-0.5 text-champagne-400 shrink-0" /><span>负责人：{s.owner}</span></div>}
                          {s.notes && <div className="flex items-start gap-1.5"><StickyNote className="w-3.5 h-3.5 mt-0.5 text-mint-400 shrink-0" /><span>{s.notes}</span></div>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card card-inner">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0 flex items-center gap-2">
                <Phone className="w-5 h-5 text-champagne-400" />供应商联系人
              </h3>
              <button onClick={() => handleOpenSupplier()} className="btn-secondary !py-1.5 !px-3 no-print">
                <Plus className="w-3.5 h-3.5" />添加
              </button>
            </div>
            {suppliers.length === 0 ? (
              <EmptyState title="暂无供应商" />
            ) : (
              <div className="space-y-3">
                {suppliers.map(s => {
                  const Icon = supplierIconMap[s.category];
                  return (
                    <div key={s.id} className="group p-3 rounded-xl bg-gradient-to-br from-champagne-50 to-white border border-champagne-100">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-champagne-100 text-champagne-400 shrink-0">
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-semibold text-ink-900 text-sm">{s.name}</h5>
                                <span className="badge bg-champagne-100 text-champagne-400 text-[10px]">{SUPPLIER_CATEGORY_LABELS[s.category]}</span>
                              </div>
                              {s.contact && <p className="text-xs text-ink-600 mt-0.5">{s.contact}</p>}
                              {s.phone && <p className="text-xs text-rose-500 font-medium mt-0.5">☎ {s.phone}</p>}
                              {s.notes && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{s.notes}</p>}
                            </div>
                            <div className="flex flex-col gap-0.5 no-print shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenSupplier(s)} className="btn-ghost !p-1"><Edit3 className="w-3 h-3 text-ink-500" /></button>
                              <button onClick={() => confirm(`删除供应商「${s.name}」?`) && deleteSupplier(s.id)} className="btn-ghost !p-1"><Trash2 className="w-3 h-3 text-red-400" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card card-inner">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-mint-400" />待办事项
              </h3>
              <button onClick={() => handleOpenTodo()} className="btn-outline !py-1.5 !px-3 no-print">
                <Plus className="w-3.5 h-3.5" />添加
              </button>
            </div>
            <div className="flex gap-1.5 mb-4 no-print">
              {(['before', 'during', 'after'] as TodoStage[]).map(stage => {
                const count = todos.filter(t => t.stage === stage).length;
                const active = todoStage === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => setTodoStage(stage)}
                    className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      active
                        ? `bg-gradient-to-r ${stageTabColor[stage].active} shadow-soft border-transparent`
                        : stageTabColor[stage].normal + ' border-sand-200'
                    }`}
                  >
                    {TODO_STAGE_LABELS[stage]}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
            {filteredTodos.length === 0 ? (
              <EmptyState title={`暂无${TODO_STAGE_LABELS[todoStage]}事项`} />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {filteredTodos.map(t => (
                  <div key={t.id} className={`group flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                    t.done ? 'bg-sand-50 border-sand-100' : 'bg-white border-sand-200 hover:shadow-soft'
                  }`}>
                    <button
                      onClick={() => toggleTodo(t.id)}
                      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all no-print ${
                        t.done
                          ? 'bg-mint-300 border-mint-300 text-white'
                          : 'border-sand-300 hover:border-rose-300'
                      }`}
                    >
                      {t.done && <Check className="w-3 h-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.done ? 'line-through text-ink-500' : 'text-ink-800'}`}>{t.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className={`chip border ${priorityColorMap[t.priority]} !py-0`}>
                          {TODO_PRIORITY_LABELS[t.priority]}
                        </span>
                        {t.dueDate && <span className="text-[11px] text-ink-500">📅 {formatDateShort(t.dueDate)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 no-print shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenTodo(t)} className="btn-ghost !p-1"><Edit3 className="w-3 h-3 text-ink-500" /></button>
                      <button onClick={() => confirm(`删除待办「${t.title}」?`) && deleteTodo(t.id)} className="btn-ghost !p-1"><X className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title={editingSchedule ? '编辑流程' : '添加流程节点'} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">日期（可选）</label>
            <input type="date" className="input" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} />
          </div>
          <div>
            <label className="label">时间 *</label>
            <input type="time" className="input" value={scheduleForm.time} onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="label">流程标题 *</label>
            <input className="input" value={scheduleForm.title} onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="如：新郎出发接亲" />
          </div>
          <div>
            <label className="label">地点</label>
            <input className="input" value={scheduleForm.location} onChange={e => setScheduleForm({ ...scheduleForm, location: e.target.value })} placeholder="如：酒店宴会厅" />
          </div>
          <div>
            <label className="label">负责人</label>
            <input className="input" value={scheduleForm.owner} onChange={e => setScheduleForm({ ...scheduleForm, owner: e.target.value })} placeholder="如：司仪、伴娘..." />
          </div>
          <div className="col-span-2">
            <label className="label">备注说明</label>
            <textarea className="textarea" value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setScheduleModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitSchedule} className="btn-primary">{editingSchedule ? '保存' : '添加'}</button>
        </div>
      </Modal>

      <Modal open={supplierModal} onClose={() => setSupplierModal(false)} title={editingSupplier ? '编辑供应商' : '添加供应商'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">类别</label>
            <select className="select" value={supplierForm.category} onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value as SupplierCategory })}>
              {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">商家名称 *</label>
            <input className="input" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">对接人</label>
              <input className="input" value={supplierForm.contact} onChange={e => setSupplierForm({ ...supplierForm, contact: e.target.value })} />
            </div>
            <div>
              <label className="label">联系电话</label>
              <input className="input" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">服务说明 / 备注</label>
            <textarea className="textarea" value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setSupplierModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitSupplier} className="btn-primary">{editingSupplier ? '保存' : '添加'}</button>
        </div>
      </Modal>

      <Modal open={todoModal} onClose={() => setTodoModal(false)} title={editingTodo ? '编辑待办' : '添加待办'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">事项内容 *</label>
            <input className="input" value={todoForm.title} onChange={e => setTodoForm({ ...todoForm, title: e.target.value })} placeholder="如：发送纸质请柬" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">阶段</label>
              <select className="select" value={todoForm.stage} onChange={e => setTodoForm({ ...todoForm, stage: e.target.value as TodoStage })}>
                {Object.entries(TODO_STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">优先级</label>
              <select className="select" value={todoForm.priority} onChange={e => setTodoForm({ ...todoForm, priority: e.target.value as TodoPriority })}>
                {Object.entries(TODO_PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">截止日期（可选）</label>
            <input type="date" className="input" value={todoForm.dueDate} onChange={e => setTodoForm({ ...todoForm, dueDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setTodoModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitTodo} className="btn-primary">{editingTodo ? '保存' : '添加'}</button>
        </div>
      </Modal>
    </div>
  );
}
