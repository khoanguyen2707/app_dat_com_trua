import { BarChart3, CalendarDays, CreditCard, History, ListOrdered, UtensilsCrossed } from 'lucide-react';
import type { DayKey } from '@/types';
import { t } from './strings';

/** Khoá lưu token trong localStorage */
export const STORAGE = {
  access: 'ct_access',
  refresh: 'ct_refresh',
} as const;

/** Tiền tố đường dẫn API */
export const API_PREFIX = '/api/v1';

/** Giá trị mặc định dùng chung */
export const DEFAULT_UNIT_PRICE = 25000;
export const DEFAULT_DISH_PRICE = 25000;
export const DEFAULT_AVATAR_COLOR = '#0a84ff';
export const MIN_PASSWORD_LENGTH = 6;

/** Các ngày trong tuần (khoá + nhãn ngắn + tên đầy đủ) */
export const DAYS: { key: DayKey; label: string; full: string }[] = [
  { key: 'mon', label: 'T2', full: 'Thứ 2' },
  { key: 'tue', label: 'T3', full: 'Thứ 3' },
  { key: 'wed', label: 'T4', full: 'Thứ 4' },
  { key: 'thu', label: 'T5', full: 'Thứ 5' },
  { key: 'fri', label: 'T6', full: 'Thứ 6' },
  { key: 'sat', label: 'T7', full: 'Thứ 7' },
  { key: 'sun', label: 'CN', full: 'Chủ nhật' },
];

/** Bảng màu avatar thành viên (khớp PALETTE lúc seed ở server) */
export const MEMBER_COLORS = [
  '#ff6b35', '#0a84ff', '#22c55e', '#7c5cff', '#ff9f0a',
  '#ff3b30', '#06b6d4', '#ec4899', '#8b5cf6', '#16181d',
];

/** Bộ biểu tượng món ăn cho phép chọn */
export const DISH_EMOJIS = ['🍗', '🍖', '🥩', '🐟', '🥗', '🍛', '🍜', '🍲', '🥘', '🍱', '🍳', '🦐', '🍚', '🥬', '🌶️', '☕', '🥛', '🧋'];

/** Danh sách ngân hàng hỗ trợ VietQR (tên + mã BIN) */
export const BANKS: { name: string; bin: string }[] = [
  { name: 'TPBank', bin: '970423' }, { name: 'Vietcombank', bin: '970436' }, { name: 'Techcombank', bin: '970407' },
  { name: 'BIDV', bin: '970418' }, { name: 'VietinBank', bin: '970415' }, { name: 'MBBank', bin: '970422' },
  { name: 'ACB', bin: '970416' }, { name: 'VPBank', bin: '970432' }, { name: 'Agribank', bin: '970405' },
  { name: 'Sacombank', bin: '970403' }, { name: 'VIB', bin: '970441' }, { name: 'HDBank', bin: '970437' },
  { name: 'OCB', bin: '970448' }, { name: 'MSB', bin: '970426' }, { name: 'SHB', bin: '970443' },
  { name: 'Cake', bin: '546034' }, { name: 'Timo', bin: '963388' },
];

/**
 * Điều hướng chính (sidebar ở desktop, tab bar ở mobile).
 *
 * Hai vai trò nhìn hai app khác nhau: admin vận hành cả nhóm, còn thành viên chỉ
 * lo suất cơm của chính mình nên không có bảng tuần lẫn thống kê.
 */
export const ADMIN_TABS = [
  { key: 'grid', icon: CalendarDays, label: t.tabs.grid },
  { key: 'menu', icon: ListOrdered, label: t.tabs.menu },
  { key: 'pay', icon: CreditCard, label: t.tabs.pay },
  // Thống kê và lịch sử tuần trả lời cùng một câu hỏi và mỗi cái quá ít nội dung
  // để đứng riêng, nên gộp thành một trang tổng kết.
  { key: 'overview', icon: BarChart3, label: t.tabs.overview },
] as const;

export const USER_TABS = [
  { key: 'order', icon: UtensilsCrossed, label: t.tabs.order },
  { key: 'pay', icon: CreditCard, label: t.tabs.pay },
  { key: 'hist', icon: History, label: t.tabs.hist },
  { key: 'menu', icon: ListOrdered, label: t.tabs.menu },
] as const;

export type TabKey = (typeof ADMIN_TABS)[number]['key'] | (typeof USER_TABS)[number]['key'];
export type TabItem = { key: TabKey; icon: typeof CalendarDays; label: string };

export const tabsFor = (isAdmin: boolean): readonly TabItem[] => (isAdmin ? ADMIN_TABS : USER_TABS);
