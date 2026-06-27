import type { Dish } from '@/types';

/** Thứ tự ưu tiên hiển thị các nhóm theo biểu tượng; emoji lạ xếp cuối. */
const EMOJI_ORDER = ['🐟', '🦐', '🍗', '🥩', '🍖', '🍳', '🥬', '🥗', '🍛', '🍜', '🍲', '🥘', '🍱', '🍚', '🌶️', '☕', '🥛', '🧋'];

export interface DishGroup {
  emoji: string;
  dishes: Dish[];
}

/**
 * Gom danh sách món theo emoji (🐟 🍗 🥩…), giữ thứ tự ưu tiên ở trên;
 * trong mỗi nhóm giữ nguyên thứ tự đầu vào. Món không có emoji → '🍽️'.
 */
export function groupByEmoji(dishes: Dish[]): DishGroup[] {
  const map = new Map<string, Dish[]>();
  for (const d of dishes) {
    const e = d.emoji || '🍽️';
    const list = map.get(e);
    if (list) list.push(d);
    else map.set(e, [d]);
  }
  const rank = (e: string) => {
    const i = EMOJI_ORDER.indexOf(e);
    return i === -1 ? EMOJI_ORDER.length : i;
  };
  return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([emoji, ds]) => ({ emoji, dishes: ds }));
}
