/**
 * Ai cần được nhắc "sắp tới giờ chốt đặt cơm".
 *
 * Tách khỏi service để quyết định ai-bị-nhắc kiểm thử được mà không cần DB: đây là
 * chỗ dễ sai nhất (nhắc nhầm người đã đặt, hoặc nhắc khi chưa có thực đơn thì người
 * ta mở app ra chẳng đặt được gì).
 */
import { CUTOFF_MINUTES, type DayKey } from '@/common/week-lock';

export interface ReminderCandidate {
  userId: string;
  /** Đã tick ăn ngày hôm nay chưa. */
  ordered: boolean;
}

export type SkipReason = 'no-week' | 'no-menu' | 'past-cutoff' | 'already-sent' | 'nobody';

export interface ReminderPlan {
  /** Rỗng = không gửi cho ai. */
  userIds: string[];
  skipped: SkipReason | null;
}

export interface ReminderInput {
  /** Cột nào của tuần là hôm nay; null = hôm nay không nằm trong tuần đang mở. */
  todayKey: DayKey | null;
  /** Số món admin đã đăng cho hôm nay (đã gộp món ghim). 0 = chưa đăng. */
  menuCount: number;
  /** Phút trong ngày theo giờ VN tại thời điểm gọi. */
  nowMinutes: number;
  /** Hôm nay đã bắn nhắc rồi chưa. */
  alreadySent: boolean;
  candidates: ReminderCandidate[];
}

/**
 * Quá giờ chốt thì thôi — nhắc lúc đó chỉ làm người ta mở app ra rồi bị chặn.
 * Chưa có thực đơn cũng thôi, vì có mở app cũng chưa đặt được.
 */
export function planCutoffReminder(input: ReminderInput): ReminderPlan {
  if (!input.todayKey) return { userIds: [], skipped: 'no-week' };
  if (input.menuCount <= 0) return { userIds: [], skipped: 'no-menu' };
  if (input.nowMinutes >= CUTOFF_MINUTES) return { userIds: [], skipped: 'past-cutoff' };
  if (input.alreadySent) return { userIds: [], skipped: 'already-sent' };

  const userIds = input.candidates.filter((c) => !c.ordered).map((c) => c.userId);
  return userIds.length ? { userIds, skipped: null } : { userIds: [], skipped: 'nobody' };
}

/** Số phút còn lại tới giờ chốt, không âm. */
export function minutesLeft(nowMinutes: number): number {
  return Math.max(0, CUTOFF_MINUTES - nowMinutes);
}
