/**
 * Kế hoạch gộp món trùng — thuần, test được; service chạy kế hoạch trong 1 transaction.
 *
 * Gộp chứ không xoá: OrderItem.dish là onDelete Cascade, xoá thẳng món trùng sẽ xoá
 * luôn suất người ta đã đặt (mất lịch sử lẫn tiền). Ở đây mọi suất của món bị gộp
 * được chuyển sang món giữ lại; cùng người + cùng ngày đã có món giữ lại thì cộng số lượng.
 */

export interface MergeOrderItem {
  id: string;
  weekId: string;
  userId: string;
  day: string;
  dishId: string;
  qty: number;
}

export interface MergePlan {
  /** Chuyển dishId của các dòng này sang keepId. */
  repoint: string[];
  /** Cộng thêm qty vào dòng đã có món giữ lại. */
  addQty: { id: string; qty: number }[];
  /** Xoá (đã cộng dồn vào dòng khác). */
  remove: string[];
  /** Tuần có thực đơn thay đổi → dayMenu mới. */
  dayMenus: { weekId: string; dayMenu: Record<string, string[]> }[];
}

const slot = (i: MergeOrderItem) => `${i.weekId}|${i.userId}|${i.day}`;

export function planMerge(
  items: MergeOrderItem[],
  weeks: { id: string; dayMenu: Record<string, string[]> | null }[],
  keepId: string,
  mergeIds: string[],
): MergePlan {
  const merging = new Set(mergeIds);
  const plan: MergePlan = { repoint: [], addQty: [], remove: [], dayMenus: [] };

  // dòng món giữ lại theo (tuần, người, ngày) — dòng bị chuyển sang cũng thành "đã có"
  const keepBySlot = new Map<string, { id: string; extra: number }>();
  for (const it of items) {
    if (it.dishId === keepId) keepBySlot.set(slot(it), { id: it.id, extra: 0 });
  }
  for (const it of items) {
    if (!merging.has(it.dishId)) continue;
    const hit = keepBySlot.get(slot(it));
    if (hit) {
      hit.extra += it.qty;
      plan.remove.push(it.id);
    } else {
      plan.repoint.push(it.id);
      keepBySlot.set(slot(it), { id: it.id, extra: 0 });
    }
  }
  for (const { id, extra } of keepBySlot.values()) {
    if (extra > 0) plan.addQty.push({ id, qty: extra });
  }

  for (const w of weeks) {
    const menu = w.dayMenu ?? {};
    let changed = false;
    const next: Record<string, string[]> = {};
    for (const [day, ids] of Object.entries(menu)) {
      if (!ids.some((id) => merging.has(id))) {
        next[day] = ids;
        continue;
      }
      changed = true;
      next[day] = [...new Set(ids.map((id) => (merging.has(id) ? keepId : id)))];
    }
    if (changed) plan.dayMenus.push({ weekId: w.id, dayMenu: next });
  }
  return plan;
}
