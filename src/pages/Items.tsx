import { useMemo, useState } from 'react';
import {
  PackageCheck, Plus, Edit3, Trash2, Gift as GiftIcon, Wallet,
  Check, ChevronDown, ChevronUp, Gem, Shirt, FileText, PartyPopper, Sparkles, Banknote,
} from 'lucide-react';
import { useWeddingStore } from '@/store/useWeddingStore';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import type { Item, ItemCategory, Gift, GiftMethod } from '@/types';
import { ITEM_CATEGORY_LABELS, GIFT_METHOD_LABELS } from '@/types';
import { formatCurrencyPlain } from '@/utils/format';
import { downloadCSV } from '@/utils/export';

const itemIconMap: Record<ItemCategory, any> = {
  jewelry: Gem, clothing: Shirt, document: FileText,
  decoration: PartyPopper, gift: Sparkles, other: PackageCheck,
};

const itemCatColor: Record<ItemCategory, string> = {
  jewelry: 'from-rose-100 to-champagne-100 border-champagne-200 text-champagne-400',
  clothing: 'from-rose-50 to-rose-100 border-rose-200 text-rose-500',
  document: 'from-sand-50 to-sand-100 border-sand-200 text-ink-600',
  decoration: 'from-mint-50 to-mint-100 border-mint-200 text-mint-400',
  gift: 'from-champagne-50 to-champagne-100 border-champagne-200 text-champagne-400',
  other: 'from-sand-50 to-white border-sand-200 text-ink-600',
};

const methodColor: Record<GiftMethod, string> = {
  cash: 'bg-champagne-100 text-champagne-400 border-champagne-200',
  transfer: 'bg-mint-100 text-mint-400 border-mint-200',
  gift: 'bg-rose-50 text-rose-500 border-rose-100',
};

export default function Items() {
  const {
    items, gifts,
    addItem, updateItem, deleteItem, toggleItemPacked,
    addGift, updateGift, deleteGift,
  } = useWeddingStore();

  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState<Omit<Item, 'id'>>({
    name: '', category: 'clothing', packed: false, quantity: 1, notes: '',
  });

  const [giftModal, setGiftModal] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [giftForm, setGiftForm] = useState<Omit<Gift, 'id'>>({
    guestName: '', amount: 0, method: 'cash', notes: '', date: '',
  });

  const [expandedCat, setExpandedCat] = useState<ItemCategory | 'all'>('all');

  const itemStats = useMemo(() => {
    const total = items.length;
    const packed = items.filter(i => i.packed).length;
    const qtyTotal = items.reduce((s, i) => s + (i.quantity || 1), 0);
    const qtyPacked = items.filter(i => i.packed).reduce((s, i) => s + (i.quantity || 1), 0);
    const progress = total === 0 ? 0 : Math.round((packed / total) * 100);
    return { total, packed, remaining: total - packed, qtyTotal, qtyPacked, progress };
  }, [items]);

  const giftStats = useMemo(() => {
    const total = gifts.reduce((s, g) => s + g.amount, 0);
    const cash = gifts.filter(g => g.method === 'cash').reduce((s, g) => s + g.amount, 0);
    const transfer = gifts.filter(g => g.method === 'transfer').reduce((s, g) => s + g.amount, 0);
    return { total, count: gifts.length, cash, transfer };
  }, [gifts]);

  const itemsByCategory = useMemo(() => {
    const map: Record<ItemCategory, Item[]> = {
      jewelry: [], clothing: [], document: [], decoration: [], gift: [], other: [],
    };
    items.forEach(i => { map[i.category].push(i); });
    return map;
  }, [items]);

  const handleOpenItem = (i?: Item) => {
    if (i) {
      setEditingItem(i);
      setItemForm({ name: i.name, category: i.category, packed: i.packed, quantity: i.quantity, notes: i.notes });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', category: 'clothing', packed: false, quantity: 1, notes: '' });
    }
    setItemModal(true);
  };
  const handleSubmitItem = () => {
    if (!itemForm.name.trim()) return alert('请填写物品名称');
    if (editingItem) updateItem(editingItem.id, itemForm);
    else addItem(itemForm);
    setItemModal(false);
  };

  const handleOpenGift = (g?: Gift) => {
    if (g) {
      setEditingGift(g);
      setGiftForm({ guestName: g.guestName, amount: g.amount, method: g.method, notes: g.notes, date: g.date });
    } else {
      setEditingGift(null);
      setGiftForm({ guestName: '', amount: 0, method: 'cash', notes: '', date: '' });
    }
    setGiftModal(true);
  };
  const handleSubmitGift = () => {
    if (!giftForm.guestName.trim()) return alert('请填写宾客姓名');
    if (editingGift) updateGift(editingGift.id, giftForm);
    else addGift(giftForm);
    setGiftModal(false);
  };

  const handleExportGifts = () => {
    const header = ['宾客', '金额(元)', '到账方式', '日期', '备注'];
    const rows = gifts.map(g => [g.guestName, g.amount, GIFT_METHOD_LABELS[g.method], g.date, g.notes]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCSV('礼金登记表.csv', csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">物品清单 & 礼金登记</h1>
          <p className="text-sm text-ink-500">分类管理婚礼物品并勾选打包状态，详细登记宾客礼金</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="礼金总额" value={giftStats.total} icon={Wallet} color="rose" suffix="元" />
        <StatCard label="礼金笔数" value={giftStats.count} icon={GiftIcon} color="champagne" suffix="笔" />
        <StatCard label="物品总数" value={itemStats.qtyTotal} icon={PackageCheck} color="mint" suffix="件" />
        <StatCard label="已打包" value={itemStats.qtyPacked} icon={Check} color="ink" suffix="件" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-4">
          <div className="card card-inner">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="section-title mb-1 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-rose-400" />物品打包清单
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-[200px] h-2.5 bg-sand-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-mint-300 to-mint-400 transition-all duration-700"
                      style={{ width: `${itemStats.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-mint-400 shrink-0">{itemStats.progress}%</span>
                </div>
              </div>
              <button onClick={() => handleOpenItem()} className="btn-primary !py-1.5 !px-3 no-print shrink-0">
                <Plus className="w-3.5 h-3.5" />添加物品
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState title="暂无物品" description="点击「添加物品」按钮开始录入" />
          ) : (
            <div className="space-y-3">
              {(Object.keys(itemsByCategory) as ItemCategory[]).map(cat => {
                const catItems = itemsByCategory[cat];
                if (catItems.length === 0) return null;
                const Icon = itemIconMap[cat];
                const total = catItems.length;
                const packed = catItems.filter(i => i.packed).length;
                const progress = total === 0 ? 0 : Math.round((packed / total) * 100);
                const expanded = expandedCat === 'all' || expandedCat === cat;
                return (
                  <div key={cat} className="card !overflow-hidden animate-slide-up">
                    <button
                      onClick={() => setExpandedCat(expanded ? (expandedCat === 'all' ? cat : 'all') : cat)}
                      className={`w-full flex items-center gap-3 p-4 bg-gradient-to-r ${itemCatColor[cat]} transition-all no-print`}
                    >
                      <div className="p-2 rounded-lg bg-white/70 shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-serif font-semibold">{ITEM_CATEGORY_LABELS[cat]}</h4>
                          <span className="badge bg-white/80 text-ink-600 text-[10px]">{packed}/{total}</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                          <div className="h-full bg-current transition-all duration-500 opacity-80" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      {expanded ? <ChevronUp className="w-4.5 h-4.5 shrink-0" /> : <ChevronDown className="w-4.5 h-4.5 shrink-0" />}
                    </button>
                    {expanded && (
                      <div className="divide-y divide-sand-100">
                        {catItems.map(item => (
                          <div key={item.id} className="group flex items-start gap-3 p-3.5 hover:bg-rose-50/40 transition-colors">
                            <button
                              onClick={() => toggleItemPacked(item.id)}
                              className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all no-print ${
                                item.packed
                                  ? 'bg-mint-300 border-mint-300 text-white'
                                  : 'border-sand-300 hover:border-rose-300'
                              }`}
                            >
                              {item.packed && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-medium text-sm ${item.packed ? 'line-through text-ink-500' : 'text-ink-800'}`}>{item.name}</p>
                                {(item.quantity || 1) > 1 && <span className="badge bg-sand-100 text-ink-600 text-[10px]">×{item.quantity}</span>}
                              </div>
                              {item.notes && <p className="text-xs text-ink-500 mt-0.5">{item.notes}</p>}
                            </div>
                            <div className="flex gap-0.5 no-print shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenItem(item)} className="btn-ghost !p-1.5"><Edit3 className="w-3.5 h-3.5 text-ink-500" /></button>
                              <button onClick={() => confirm(`删除物品「${item.name}」?`) && deleteItem(item.id)} className="btn-ghost !p-1.5"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-champagne-400" />礼金登记
            </h3>
            <div className="flex gap-1.5 no-print">
              <button onClick={handleExportGifts} className="btn-outline !py-1 !px-2 !text-xs">导出</button>
              <button onClick={() => handleOpenGift()} className="btn-secondary !py-1 !px-2 !text-xs">
                <Plus className="w-3 h-3" />添加
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-champagne-100 to-champagne-50 border border-champagne-200">
              <p className="text-[11px] text-champagne-400 mb-0.5">现金</p>
              <p className="font-serif font-bold text-ink-900">¥{formatCurrencyPlain(giftStats.cash)}</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-mint-100 to-mint-50 border border-mint-200">
              <p className="text-[11px] text-mint-400 mb-0.5">转账</p>
              <p className="font-serif font-bold text-ink-900">¥{formatCurrencyPlain(giftStats.transfer)}</p>
            </div>
          </div>

          {gifts.length === 0 ? (
            <EmptyState title="暂无礼金记录" />
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto scrollbar-thin pr-1">
              {[...gifts].sort((a, b) => b.amount - a.amount).map(g => (
                <div key={g.id} className="group p-3 rounded-xl bg-white border border-sand-200 hover:shadow-soft transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-semibold text-ink-900 text-sm">{g.guestName}</h5>
                        <span className={`chip border text-[10px] ${methodColor[g.method]}`}>{GIFT_METHOD_LABELS[g.method]}</span>
                      </div>
                      {g.date && <p className="text-[11px] text-ink-500 mt-0.5">{g.date}</p>}
                      {g.notes && <p className="text-xs text-ink-500 mt-1">{g.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-serif font-bold text-lg text-champagne-400">¥{formatCurrencyPlain(g.amount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-0.5 mt-1 no-print opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenGift(g)} className="btn-ghost !p-1"><Edit3 className="w-3 h-3 text-ink-500" /></button>
                    <button onClick={() => confirm(`删除「${g.guestName}」的礼金记录?`) && deleteGift(g.id)} className="btn-ghost !p-1"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingItem ? '编辑物品' : '添加物品'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">物品名称 *</label>
            <input className="input" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="如：结婚对戒" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">分类</label>
              <select className="select" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value as ItemCategory })}>
                {Object.entries(ITEM_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">数量</label>
              <input type="number" min="1" className="input" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">备注</label>
            <textarea className="textarea" value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setItemModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitItem} className="btn-primary">{editingItem ? '保存' : '添加'}</button>
        </div>
      </Modal>

      <Modal open={giftModal} onClose={() => setGiftModal(false)} title={editingGift ? '编辑礼金' : '登记礼金'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">宾客姓名 *</label>
              <input className="input" value={giftForm.guestName} onChange={e => setGiftForm({ ...giftForm, guestName: e.target.value })} />
            </div>
            <div>
              <label className="label">金额（元）*</label>
              <input type="number" min="0" className="input" value={giftForm.amount} onChange={e => setGiftForm({ ...giftForm, amount: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">到账方式</label>
              <select className="select" value={giftForm.method} onChange={e => setGiftForm({ ...giftForm, method: e.target.value as GiftMethod })}>
                {Object.entries(GIFT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">日期</label>
              <input type="date" className="input" value={giftForm.date} onChange={e => setGiftForm({ ...giftForm, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">备注</label>
            <textarea className="textarea" value={giftForm.notes} onChange={e => setGiftForm({ ...giftForm, notes: e.target.value })} placeholder="如：关系、回礼说明等" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2 no-print">
          <button onClick={() => setGiftModal(false)} className="btn-outline">取消</button>
          <button onClick={handleSubmitGift} className="btn-primary">{editingGift ? '保存' : '登记'}</button>
        </div>
      </Modal>
    </div>
  );
}
