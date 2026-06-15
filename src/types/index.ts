export type GuestGroup = 'groom' | 'bride' | 'colleague' | 'friend' | 'relative' | 'other';
export type GuestStatus = 'inviting' | 'confirmed' | 'pending' | 'absent';
export type GuestTag = 'elderly' | 'child' | 'disabled' | 'vip' | 'pregnant';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  group: GuestGroup;
  status: GuestStatus;
  headcount: number;
  dietary: string;
  specialNeeds: string;
  seatPreference: string;
  conflictIds: string[];
  withIds: string[];
  familyIds: string[];
  tags: GuestTag[];
  tableId: string | null;
}

export interface Table {
  id: string;
  tableNo: number;
  name: string;
  capacity: number;
}

export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  owner: string;
  notes: string;
}

export type SupplierCategory = 'photo' | 'makeup' | 'mc' | 'hotel' | 'flower' | 'dress' | 'other';

export interface Supplier {
  id: string;
  category: SupplierCategory;
  name: string;
  contact: string;
  phone: string;
  notes: string;
}

export type TodoStage = 'before' | 'during' | 'after';
export type TodoPriority = 'high' | 'medium' | 'low';

export interface Todo {
  id: string;
  title: string;
  stage: TodoStage;
  priority: TodoPriority;
  done: boolean;
  dueDate: string;
}

export type ItemCategory = 'jewelry' | 'clothing' | 'document' | 'decoration' | 'gift' | 'other';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  packed: boolean;
  quantity: number;
  notes: string;
}

export type GiftMethod = 'cash' | 'transfer' | 'gift';

export interface Gift {
  id: string;
  guestName: string;
  amount: number;
  method: GiftMethod;
  notes: string;
  date: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
}

export type BudgetType = 'expense' | 'income';

export interface BudgetItem {
  id: string;
  categoryId: string;
  title: string;
  type: BudgetType;
  amount: number;
  date: string;
  notes: string;
}

export const GUEST_GROUP_LABELS: Record<GuestGroup, string> = {
  groom: '男方亲友',
  bride: '女方亲友',
  colleague: '同事',
  friend: '朋友',
  relative: '亲戚',
  other: '其他',
};

export const GUEST_STATUS_LABELS: Record<GuestStatus, string> = {
  inviting: '邀请中',
  confirmed: '已确认',
  pending: '待定',
  absent: '无法出席',
};

export const GUEST_TAG_LABELS: Record<GuestTag, string> = {
  elderly: '老人',
  child: '小孩',
  disabled: '行动不便',
  vip: 'VIP',
  pregnant: '孕妇',
};

export const GUEST_TAG_COLORS: Record<GuestTag, string> = {
  elderly: 'bg-champagne-100 text-champagne-400 border-champagne-200',
  child: 'bg-rose-50 text-rose-500 border-rose-200',
  disabled: 'bg-purple-50 text-purple-600 border-purple-100',
  vip: 'bg-gradient-to-r from-champagne-100 to-champagne-200 text-champagne-400 border-champagne-300',
  pregnant: 'bg-mint-100 text-mint-400 border-mint-200',
};

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  photo: '摄影摄像',
  makeup: '化妆造型',
  mc: '司仪主持',
  hotel: '酒店场地',
  flower: '花艺布置',
  dress: '婚纱礼服',
  other: '其他',
};

export const TODO_STAGE_LABELS: Record<TodoStage, string> = {
  before: '婚前准备',
  during: '婚礼当天',
  after: '婚后收尾',
};

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  jewelry: '首饰贵重',
  clothing: '服装配件',
  document: '证件合同',
  decoration: '装饰用品',
  gift: '礼品伴手',
  other: '其他杂物',
};

export const GIFT_METHOD_LABELS: Record<GiftMethod, string> = {
  cash: '现金',
  transfer: '转账',
  gift: '实物',
};
