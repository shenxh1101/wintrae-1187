import { useMemo, useState } from 'react';
import {
  Calculator, Plus, Edit3, Trash2, PiggyBank, TrendingDown, TrendingUp, Wallet,
  Filter, PieChart, AlertCircle,
} from 'lucide-react';
import { useWeddingStore } from '@/store/useWeddingStore';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import type { BudgetCategory, BudgetItem, BudgetType } from '@/types';
import { formatCurrencyPlain, formatDateShort } from '@/utils/format';
import { downloadCSV } from '@/utils/export';

const palette = [
  '#F8B4B4', '#D4AF37', '#A8D8B9', '#F28C8C', '#7EC49A',
  '#EBDEB4', '#E86565', '#B8941F', '#C4E7D1', '#FAD5D5',
];

export default function Budget() {
  const {
    budgetCategories, budgetItems,
    addBudgetCategory, updateBudgetCategory, deleteBudgetCategory,
    addBudgetItem, updateBudgetItem, deleteBudgetItem,
  } = useWeddingStore();

  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [catForm, setCatForm] = useState<Omit<BudgetCategory, 'id'>>({ name: '', allocated: 0 });

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [itemForm, setItemForm] = useState<Omit<BudgetItem, 'id'>>({
    categoryId: budgetCategories[0]?.id || '', title: '', type: 'expense', amount: 0, date: '', notes: '',
  });

  const [filterType, setFilterType] = useState<BudgetType | 'all'>('all');
  const [filterCat, setFilterCat] = useState<string>('all');

  const stats = useMemo(() => {
    const totalBudget = budgetCategories.reduce((s, c) => s + c.allocated, 0);
    const expenses = budgetItems.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
    const income = budgetItems.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
    const remaining = totalBudget - expenses + income;
    const progress = totalBudget === 0 ? 0 : Math.min(100, Math.round((expenses / totalBudget) * 100));
    const overBudget = expenses > totalBudget;
    return { totalBudget, expenses, income, remaining, progress, overBudget };
  }, [budgetCategories, budgetItems]);

  const catStats = useMemo(() => {
    return budgetCategories.map((cat, idx) => {
      const spent = budgetItems.filter(i => i.categoryId === cat.id && i.type === 'expense').reduce((s, i) => s + i.amount, 0);
      const over = spent > cat.allocated;
      const progress = cat.allocated === 0 ? 0 : Math.min(100, Math.round((spent / cat.allocated) * 100));
      return {
        ...cat,
        spent,
        remaining: cat.allocated - spent,
        progress,
        over,
        color: palette[idx % palette.length],
      };
    });
  }, [budgetCategories, budgetItems]);

  const filteredItems = useMemo(() => {
    return [...budgetItems].sort((a, b) => {
      const ad = a.date || '9999-99-99';
      const bd = b.date || '9999-99-99';
      return bd.localeCompare(ad);
    }).filter(i => {
      if (filterType !== 'all' && i.type !== filterType) return false;
      if (filterCat !== 'all' && i.categoryId !== filterCat) return false;
      return true;
    });
  }, [budgetItems, filterType, filterCat]);

  const donutSegments = useMemo(() => {
    if (stats.expenses === 0) return [];
    let offset = 0;
    return catStats.filter(c => c.spent > 0).map(c => {
      const pct = (c.spent / stats.expenses) * 100;
      const seg = { ...c, percent: pct, offset };
      offset += pct;
      return seg;
    });
  }, [catStats, stats.expenses]);

  const handleOpenCat = (c?: BudgetCategory) => {
    if (c) { setEditingCat(c); setCatForm({ name: c.name, allocated: c.allocated }); }
    else { setEditingCat(null); setCatForm({ name: '', allocated: 0 }); }
    setCatModal(true);
  };
  const handleSubmitCat = () => {
    if (!catForm.name.trim()) return alert('请填写分类名称');
    if (editingCat) updateBudgetCategory(editingCat.id, catForm);
    else addBudgetCategory(catForm);
    setCatModal(false);
  };

  const handleOpenItem = (i?: BudgetItem) => {
    if (i) {
      setEditingItem(i);
      setItemForm({ categoryId: i.categoryId, title: i.title, type: i.type, amount: i.amount, date: i.date, notes: i.notes });
    } else {
      setEditingItem(null);
      setItemForm({ categoryId: budgetCategories[0]?.id || '', title: '', type: 'expense', amount: 0, date: '', notes: '' });
    }
    setItemModal(true);
  };
  const handleSubmitItem = () => {
    if (!itemForm.title.trim()) return alert('请填写项目名称');
    if (itemForm.amount <= 0) return alert('请填写大于0的金额');
    if (editingItem) updateBudgetItem(editingItem.id, itemForm);
    else addBudgetItem(itemForm);
    setItemModal(false);
  };

  const handleExportBudget = () => {
    const header = ['日期', '项目', '分类', '类型', '金额(元)', '备注'];
    const catMap = Object.fromEntries(budgetCategories.map(c => [c.id, c.name]));
    const rows = filteredItems.map(i => [
      i.date, i.title, catMap[i.categoryId] || '未分类',
      i.type === 'expense' ? '支出' : '收入', i.amount, i.notes,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCSV('预算明细.csv', csv);
  };

  const RADIUS = 70;
  const STROKE = 28;
  const circumference = 2 * Math.PI * RADIUS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">预算管理</h1>
          <p className="text-sm text-ink-500">分项目设定预算、记录收支，实时掌握花费情况</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={handleExportBudget} className="btn-outline">
            <Filter className="w-4 h-4" />导出明细
          </button>
          <button onClick={() => handleOpenItem()} className="btn-primary">
            <Plus className="w-4 h-4" />记一笔
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="总预算" value={stats.totalBudget} icon={PiggyBank} color="rose" suffix="元" />
        <StatCard label="已支出" value={stats.expenses} icon={TrendingDown} color="champagne" suffix="元" />
        <StatCard label="收入项" value={stats.income} icon={TrendingUp} color="mint" suffix="元" />
        <StatCard
          label={stats.overBudget ? '超支金额' : '剩余可用'}
          value={Math.abs(stats.remaining)}
          icon={Wallet}
          color={stats.overBudget ? 'rose' : 'ink'}
          suffix="元"
        />
      </div>

      <div className="card card-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="section-title mb-0 flex items-center gap-2">
                {stats.overBudget ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <PieChart className="w-5 h-5 text-rose-400" />
                )}
                总体预算进度
              </h3>
              {stats.overBudget && <span className="badge bg-red-50 text-red-600 border border-red-100">已超支！</span>}
            </div>
            <p className="text-xs text-ink-500 mt-1">
              已使用 <span className="font-semibold text-rose-500">{stats.progress}%</span> 的预算
            </p>
          </div>
          <button onClick={() => handleOpenCat()} className="btn-secondary !py-1.5 !px-3 no-print shrink-0">
            <Plus className="w-3.5 h-3.5" />管理分类
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          <div className="md:col-span-2 flex justify-center">
            <div className="relative">
              <svg width="220" height="220" viewBox="0 0 200 200" className="-rotate-90">
                <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#F3F0EA" strokeWidth={STROKE} />
                {stats.expenses > 0 && (
                  <circle
                    cx="100" cy="100" r={RADIUS} fill="none"
                    stroke={stats.overBudget ? '#E86565' : '#F8B4B4'}
                    strokeWidth={STROKE}
                    strokeDasharray={`${circumference * (stats.progress / 100)} ${circumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                )}
                {donutSegments.length > 1 && donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="100" cy="100" r={RADIUS - STROKE - 6}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={12}
                    strokeDasharray={`${2 * Math.PI * (RADIUS - STROKE - 6) * (seg.percent / 100)} ${2 * Math.PI * (RADIUS - STROKE - 6)}`}
                    strokeDashoffset={`${-2 * Math.PI * (RADIUS - STROKE - 6) * (seg.offset / 100)}`}
                    strokeLinecap="butt"
                    className="transition-all duration-700"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-ink-500">已支出</span>
                <span className="font-serif text-2xl font-bold text-ink-900">¥{formatCurrencyPlain(stats.expenses)}</span>
                <span className="text-[11px] text-ink-500 mt-0.5">/ ¥{formatCurrencyPlain(stats.totalBudget)}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-1">
            {budgetCategories.length === 0 ? (
              <EmptyState title="暂无预算分类" description="点击「管理分类」添加预算分类和金额" />
            ) : catStats.map((c, idx) => (
              <div key={c.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c.color }} />
                    <span className="font-medium text-sm text-ink-800 truncate">{c.name}</span>
                    {c.over && <span className="text-[10px] text-red-500 font-semibold">超支</span>}
                  </div>
                  <span className="text-xs text-ink-600 shrink-0 ml-2">
                    ¥{formatCurrencyPlain(c.spent)} / ¥{formatCurrencyPlain(c.allocated)}
                  </span>
                  <div className="flex gap-0.5 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                    <button onClick={() => handleOpenCat(c)} className="btn-ghost !p-1"><Edit3 className="w-3 h-3 text-ink-500" /></button>
                    <button
                      onClick={() => confirm(`删除分类「${c.name}」？`) && deleteBudgetCategory(c.id)}
                      className="btn-ghost !p-1"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${c.over ? 'bg-gradient-to-r from-red-400 to-red-500' : ''}`}
                    style={{
                      width: `${c.progress}%`,
                      background: c.over ? undefined : c.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 no-print">
          <h3 className="section-title mb-0 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-champagne-400" />收支明细
          </h3>
          <div className="flex gap-2 flex-wrap">
            <select
              className="select !py-1.5 text-xs !w-28"
              value={filterType}
              onChange={e => setFilterType(e.target.value as BudgetType | 'all')}
            >
              <option value="all">全部类型</option>
              <option value="expense">仅支出</option>
              <option value="income">仅收入</option>
            </select>
            <select
              className="select !py-1.5 text-xs !w-36"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="all">全部分类</option>
              {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState title="暂无收支记录" description="点击「记一笔」按钮开始记录预算明细" />
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-sand-200">
                  <th className="px-2 sm:px-3 py-2.5 font-medium">日期</th>
                  <th className="px-2 sm:px-3 py-2.5 font-medium">项目</th>
                  <th className="px-2 sm:px-3 py-2.5 font-medium hidden md:table-cell">分类</th>
                  <th className="px-2 sm:px-3 py-2.5 font-medium hidden sm:table-cell">类型</th>
                  <th className="px-2 sm:px-3 py-2.5 font-medium text-right">金额</th>
                  <th className="px-2 sm:px-3 py-2.5 font-medium hidden lg:table-cell">备注</th>
                  <th className="px-2 sm:px-3 py-2.5 font-medium no-print w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filteredItems.map(item => {
                  const cat = budgetCategories.find(c => c.id === item.categoryId);
                  return (
                    <tr key={item.id} className="group hover:bg-rose-50/40 transition-colors">
                      <td className="px-2 sm:px-3 py-3 text-ink-600 whitespace-nowrap">
                        {item.date ? formatDateShort(item.date) : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="px-2 sm:px-3 py-3 font-medium text-ink-800">{item.title}</td>
                      <td className="px-2 sm:px-3 py-3 text-ink-600 hidden md:table-cell">
                        <span className="badge bg-sand-100 text-ink-600">{cat?.name || '未分类'}</span>
                      </td>
                      <td className="px-2 sm:px-3 py-3 hidden sm:table-cell">
                        {item.type === 'expense' ? (
                          <span className="badge bg-champagne-50 text-champagne-400 border border-champagne-100">支出</span>
                        ) : (
                          <span className="badge bg-mint-50 text-mint-400 border border-mint-100">收入</span>
                        )}
                      </td>
                      <td className={`px-2 sm:px-3 py-3 text-right font-semibold whitespace-nowrap ${
                        item.type === 'expense' ? 'text-champagne-400' : 'text-mint-400'
                      }`}>
                        {item.type === 'expense' ? '-' : '+'}¥{formatCurrencyPlain(item.amount)}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-ink-500 hidden lg:table-cell max-w-[200px] truncate">
                        {item.notes || '—'}
                      </td>
                      <td className="px-2 sm:px-3 py-3 no-print">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenItem(item)} className="btn-ghost !p-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-ink-500" />
                          </button>
                          <button
                            onClick={() => confirm(`删除「${item.title}」记录？`) && deleteBudgetItem(item.id)}
                            className="btn-ghost !p-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? '编辑预算分类' : '添加预算分类'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">分类名称 *</label>
            <input className="input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="如：酒店餐饮、摄影摄像..." />
          </div>
          <div>
            <label className="label">预算金额（元）*</label>
            <input type="number" min="0" className="input" value={catForm.allocated} onChange={e => setCatForm({ ...catForm, allocated: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setCatModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitCat} className="btn-primary">{editingCat ? '保存' : '添加'}</button>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingItem ? '编辑收支' : '记录一笔'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">类型</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, type: 'expense' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    itemForm.type === 'expense'
                      ? 'bg-champagne-100 text-champagne-400 border-champagne-200'
                      : 'bg-white text-ink-500 border-sand-200 hover:bg-sand-50'
                  }`}
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, type: 'income' })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    itemForm.type === 'income'
                      ? 'bg-mint-100 text-mint-400 border-mint-200'
                      : 'bg-white text-ink-500 border-sand-200 hover:bg-sand-50'
                  }`}
                >
                  收入
                </button>
              </div>
            </div>
            <div>
              <label className="label">所属分类</label>
              <select className="select h-full" value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}>
                <option value="">未分类</option>
                {budgetCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">项目名称 *</label>
              <input className="input" value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })} placeholder="如：酒店定金" />
            </div>
            <div>
              <label className="label">金额（元）*</label>
              <input type="number" min="0" className="input" value={itemForm.amount} onChange={e => setItemForm({ ...itemForm, amount: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">发生日期</label>
            <input type="date" className="input" value={itemForm.date} onChange={e => setItemForm({ ...itemForm, date: e.target.value })} />
          </div>
          <div>
            <label className="label">备注</label>
            <textarea className="textarea" value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setItemModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitItem} className="btn-primary">{editingItem ? '保存' : '记录'}</button>
        </div>
      </Modal>
    </div>
  );
}
