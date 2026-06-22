import type { Dish, DayKey, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';

/**
 * Xuất bảng đăng ký tuần ra CSV (mở bằng Excel, BOM UTF-8).
 * Mỗi ô ngày ghi đủ thông tin: món cơm đã chọn + đồ uống (kèm số lượng), thay cho dấu "x".
 */
export function exportGridCSV(grid: Grid, dishes: Dish[]) {
  const { week, members, totals } = grid;
  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  /** Nội dung 1 ô: dòng 1 = món cơm (hoặc "Cơm"), dòng 2 = đồ uống. */
  const cellOf = (m: GridMember, key: DayKey): string => {
    const it = m.items?.[key];
    const food = (it?.food ?? []).map((id) => dishMap.get(id)?.name).filter(Boolean) as string[];
    const drinks = (it?.drinks ?? []).map((d) => `${dishMap.get(d.dishId)?.name ?? '?'} x${d.qty}`);
    const parts: string[] = [];
    if (m.days[key]) parts.push(food.length ? food.join(', ') : 'Cơm');
    if (drinks.length) parts.push('Nước: ' + drinks.join(', '));
    return parts.join('\n');
  };

  const head = [t.grid.csv.no, t.grid.csv.name, ...DAYS.map((d) => d.label), t.grid.colServings, t.grid.colMoney];
  const rows: (string | number)[][] = members.map((m, i) => [
    i + 1,
    m.fullName,
    ...DAYS.map((d) => cellOf(m, d.key)),
    m.servings,
    m.total, // gồm cả tiền nước
  ]);
  rows.push(['', t.grid.csv.total, ...DAYS.map((d) => totals.perDay[d.key]), totals.totalServings, totals.totalMoney]);

  // Bọc mỗi ô trong "" và escape " thành "" (ô có thể xuống dòng -> Excel hiển thị nhiều dòng).
  const csv = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `com-trua_${week.label.replace(/[^\d]/g, '-')}.csv`;
  a.click();
}
