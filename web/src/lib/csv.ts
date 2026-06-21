import type { Grid } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';

/** Xuất bảng đăng ký tuần ra file CSV (mở được bằng Excel, có BOM UTF-8) */
export function exportGridCSV(grid: Grid) {
  const { week, members, totals } = grid;
  const head = [t.grid.csv.no, t.grid.csv.name, ...DAYS.map((d) => d.label), t.grid.colServings, t.grid.colMoney];
  const rows: (string | number)[][] = members.map((m, i) => [
    i + 1,
    m.fullName,
    ...DAYS.map((d) => (m.days[d.key] ? 'x' : '')),
    m.servings,
    m.servings * week.unitPrice,
  ]);
  rows.push(['', t.grid.csv.total, ...DAYS.map((d) => totals.perDay[d.key]), totals.totalServings, totals.totalMoney]);

  const csv = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `com-trua_${week.label.replace(/[^\d]/g, '-')}.csv`;
  a.click();
}
