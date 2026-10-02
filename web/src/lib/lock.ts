import { t } from '@/constants/strings';
import type { DayKey, Grid, LockReason } from '@/types';

/**
 * Trạng thái khoá của cột HÔM NAY, kèm câu nói đúng lý do.
 *
 * Gom vào một chỗ vì hai màn (thẻ đơn của tôi, panel thực đơn hôm nay) phải nói
 * giống nhau — trước đây cả hai tự ghép câu quanh giờ chốt nên sửa một chỗ là lệch.
 *
 * `lockReasons` có thể thiếu nếu BE cũ hơn FE, khi đó lùi về `lockedDays`.
 */
export function todayLockLabel(grid: Grid, day: DayKey | null): { locked: boolean; label: string } {
  if (!day) return { locked: true, label: t.me.closedToday };

  const reason: LockReason | null | undefined = grid.lockReasons?.[day];
  const locked = reason !== undefined ? !!reason : !!grid.lockedDays?.[day];
  if (!locked) return { locked: false, label: t.me.openNow };

  if (reason === 'sent') return { locked: true, label: t.me.closedSent };
  if (reason === 'deadline' && grid.shopDeadline) {
    return { locked: true, label: t.me.closedDeadline(grid.shopDeadline.label) };
  }
  return { locked: true, label: t.me.closedToday };
}
