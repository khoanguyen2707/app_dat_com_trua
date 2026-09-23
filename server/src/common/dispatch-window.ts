import { CUTOFF_MINUTES, SHOP_DEADLINE_MINUTES, vnMinutes } from './week-lock';

/**
 * Mức nhắc gửi đơn cho quán.
 *
 * `idle` = không làm gì. Ba mức còn lại tăng dần độ gấp, mỗi mức chỉ nhắc MỘT lần.
 */
export type DispatchLevel = 'idle' | 'first' | 'second' | 'escalate';

/** Thứ tự gấp dần, để so sánh "đã nhắc tới mức nào rồi". */
export const LEVEL_ORDER: Record<DispatchLevel, number> = {
  idle: 0,
  first: 1,
  second: 2,
  escalate: 3,
};

/**
 * Nên nhắc mức nào tại thời điểm `now`.
 *
 * Các mốc chia đều trong khoảng từ giờ chốt đặt cơm tới giờ quán ngừng nhận, nên
 * cửa sổ hẹp thì tự co lại chứ không cắm cứng giờ. Ngoài khoảng đó thì im: trước
 * giờ chốt danh sách chưa xong, còn sau khi quán đóng thì nhắc cũng không cứu
 * được bữa trưa.
 *
 * Hàm thuần, không đụng database — phần khó sai nhất được tách ra để test được.
 */
export function dispatchLevel({
  now,
  sent,
  hasOrders,
  alreadySent,
}: {
  now: Date;
  /** Đơn đã gửi cho quán chưa. */
  sent: boolean;
  /** Hôm nay có ai đặt cơm không. */
  hasOrders: boolean;
  /** Mức đã nhắc cao nhất trong ngày. */
  alreadySent: DispatchLevel;
}): DispatchLevel {
  if (!hasOrders || sent) return 'idle';

  const mins = vnMinutes(now);
  if (mins < CUTOFF_MINUTES || mins >= SHOP_DEADLINE_MINUTES) return 'idle';

  const window = SHOP_DEADLINE_MINUTES - CUTOFF_MINUTES;
  const passed = mins - CUTOFF_MINUTES;
  const due: DispatchLevel = passed >= (window * 2) / 3 ? 'escalate' : passed >= window / 3 ? 'second' : 'first';

  // Flow gọi nhiều lần trong cùng một mức -> chỉ mức nào chưa nhắc mới được đi tiếp.
  // Lỡ nhịp thì nhảy thẳng tới mức đúng lúc này, không nhắc bù các mức đã qua.
  return LEVEL_ORDER[due] > LEVEL_ORDER[alreadySent] ? due : 'idle';
}

/** Còn bao nhiêu phút nữa quán ngừng nhận đơn (0 nếu đã quá giờ). */
export function minutesLeftForShop(now: Date = new Date()): number {
  return Math.max(0, SHOP_DEADLINE_MINUTES - vnMinutes(now));
}
