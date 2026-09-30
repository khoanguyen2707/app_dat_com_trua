import type { DayKey, Grid } from '@/types';

/**
 * Thực đơn user thực sự đặt được trong một ngày.
 *
 * Server trả hai bản: `week.dayMenu` là lựa chọn thô của admin (màn đăng thực đơn ghi
 * đè lên nó), còn `effectiveDayMenu` đã cộng thêm các món ghim 📌. Mọi chỗ HIỂN THỊ cho
 * người đặt phải dùng hàm này; chỉ màn đăng thực đơn của admin mới đọc `week.dayMenu`.
 */
export function menuOfDay(grid: Grid, day: DayKey | null | undefined): string[] {
  if (!day) return [];
  return grid.effectiveDayMenu?.[day] ?? grid.week.dayMenu?.[day] ?? [];
}

/** Admin đã đăng thực đơn cho ngày này chưa. */
export function hasMenu(grid: Grid, day: DayKey | null | undefined): boolean {
  return menuOfDay(grid, day).length > 0;
}
