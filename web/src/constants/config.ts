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

/** Các tab điều hướng dưới cùng */
export const TABS = [
  { key: 'grid', icon: '🗓️', label: t.tabs.grid },
  { key: 'menu', icon: '📋', label: t.tabs.menu },
  { key: 'pay', icon: '💳', label: t.tabs.pay },
  { key: 'stats', icon: '📊', label: t.tabs.stats },
  { key: 'hist', icon: '🕐', label: t.tabs.hist },
] as const;

export type TabKey = (typeof TABS)[number]['key'];
