import { describe, expect, it } from 'vitest';
import { computeDayLocks, computeTodayKey, currentWeekStart, nextWeekLabel, weekRollover } from './week-lock';

/** 00:00 UTC của một ngày dương lịch — cùng dạng với cột startDate trong DB. */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Một thời điểm giờ VN, quy về UTC (VN = UTC+7). */
const vn = (iso: string, hhmm = '09:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + (h - 7) * 3600_000 + m * 60_000);
};

describe('currentWeekStart', () => {
  it('trả về chính ngày đó khi hôm nay là thứ 2', () => {
    expect(currentWeekStart(vn('2026-09-21'))).toEqual(day('2026-09-21'));
  });

  it('lùi về thứ 2 của tuần khi hôm nay là giữa tuần', () => {
    expect(currentWeekStart(vn('2026-09-23'))).toEqual(day('2026-09-21'));
  });

  it('chủ nhật vẫn thuộc tuần bắt đầu từ thứ 2 trước đó, không phải ngày mai', () => {
    expect(currentWeekStart(vn('2026-09-27'))).toEqual(day('2026-09-21'));
  });

  it('tính theo lịch VN: 23:30 giờ VN chủ nhật vẫn là tuần cũ dù UTC đã sang thứ 2', () => {
    expect(currentWeekStart(vn('2026-09-27', '23:30'))).toEqual(day('2026-09-21'));
  });
});

describe('weekRollover', () => {
  it('không làm gì khi tuần hiện hành chưa có startDate', () => {
    expect(weekRollover(null, vn('2026-09-23'))).toBeNull();
  });

  it('không làm gì khi hôm nay vẫn trong tuần đang mở', () => {
    expect(weekRollover(day('2026-09-21'), vn('2026-09-23'))).toBeNull();
  });

  it('không làm gì vào chủ nhật cuối tuần đang mở', () => {
    expect(weekRollover(day('2026-09-21'), vn('2026-09-27', '23:59'))).toBeNull();
  });

  it('sang thứ 2 kế tiếp thì trả về mốc tuần mới', () => {
    expect(weekRollover(day('2026-09-21'), vn('2026-09-28', '00:05'))).toEqual(day('2026-09-28'));
  });

  it('nghỉ nhiều tuần thì nhảy thẳng tới tuần hiện tại, không sinh tuần ở giữa', () => {
    expect(weekRollover(day('2026-09-07'), vn('2026-09-23'))).toEqual(day('2026-09-21'));
  });

  it('không lùi về quá khứ khi tuần đang mở nằm ở tương lai', () => {
    expect(weekRollover(day('2026-10-05'), vn('2026-09-23'))).toBeNull();
  });
});

describe('nextWeekLabel', () => {
  it('đặt nhãn theo thứ 2 đến chủ nhật của tuần đó', () => {
    expect(nextWeekLabel(day('2026-09-21'))).toBe('21/9/2026 - 27/9/2026');
  });

  it('chạy đúng khi tuần vắt qua hai tháng', () => {
    expect(nextWeekLabel(day('2026-09-28'))).toBe('28/9/2026 - 4/10/2026');
  });
});

describe('computeTodayKey', () => {
  it('chỉ vào đúng cột của hôm nay trong tuần đang mở', () => {
    expect(computeTodayKey(day('2026-09-21'), vn('2026-09-23'))).toBe('wed');
  });

  it('trả null khi hôm nay nằm ngoài tuần đang xem', () => {
    expect(computeTodayKey(day('2026-06-15'), vn('2026-09-23'))).toBeNull();
  });
});

describe('computeDayLocks', () => {
  // Tuần 21/9/2026 (thứ 2) — "hôm nay" trong các ca dưới là thứ 4 23/9.
  const week = day('2026-09-21');

  it('không khoá ngày nào khi tuần chưa có startDate', () => {
    const locks = computeDayLocks(null, vn('2026-09-23', '14:00'), true);
    expect(Object.values(locks).every((r) => r === null)).toBe(true);
  });

  it('mở cột hôm nay khi chưa gửi quán và chưa tới giờ quán đóng', () => {
    expect(computeDayLocks(week, vn('2026-09-23', '10:29'), false).wed).toBeNull();
  });

  it('vẫn mở sau giờ chốt cũ 10:15 — mốc đó không còn khoá nữa', () => {
    expect(computeDayLocks(week, vn('2026-09-23', '10:20'), false).wed).toBeNull();
  });

  it('khoá ngay khi admin đã gửi đơn cho quán, dù còn sớm', () => {
    expect(computeDayLocks(week, vn('2026-09-23', '08:00'), true).wed).toBe('sent');
  });

  it('khoá theo lưới an toàn khi quá giờ quán đóng mà chưa ai bấm đã gửi', () => {
    expect(computeDayLocks(week, vn('2026-09-23', '10:30'), false).wed).toBe('deadline');
  });

  it('mở lại khi admin bỏ đánh dấu, miễn là chưa tới giờ quán đóng', () => {
    expect(computeDayLocks(week, vn('2026-09-23', '10:00'), false).wed).toBeNull();
  });

  it('ngày đã qua và ngày tương lai luôn khoá, kèm lý do riêng', () => {
    const locks = computeDayLocks(week, vn('2026-09-23', '09:00'), false);
    expect(locks.tue).toBe('past');
    expect(locks.thu).toBe('future');
  });

  it('đã gửi đơn hôm nay không khoá lây sang cột cùng thứ của tuần khác', () => {
    // Xem lại tuần 14/9: cột thứ 4 là 16/9 — đã qua, nên là 'past' chứ không phải 'sent'.
    expect(computeDayLocks(day('2026-09-14'), vn('2026-09-23', '09:00'), true).wed).toBe('past');
  });
});
