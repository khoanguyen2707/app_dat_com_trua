/**
 * Logic khoá tick theo ngày/giờ (giờ Việt Nam, UTC+7).
 *
 * Luật:
 *  - Ngày đã qua (so với hôm nay): khoá — chỉ admin sửa được.
 *  - Hôm nay: khoá nếu đã quá GIỜ CHỐT (10:21 sáng giờ VN).
 *  - Ngày tương lai: mở.
 *  - Tuần chưa có startDate: không khoá ngày nào (trả về toàn false).
 *
 * startDate được lưu là 00:00 UTC của ngày Thứ 2 (theo lịch VN), nên mọi so sánh
 * đều quy về "số ngày canon" = Date.UTC(năm, tháng, ngày) để tránh lệch múi giờ.
 */
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** Nhãn ngày tiếng Việt (cho thông báo lỗi) */
export const DAY_LABEL: Record<DayKey, string> = {
  mon: 'Thứ 2',
  tue: 'Thứ 3',
  wed: 'Thứ 4',
  thu: 'Thứ 5',
  fri: 'Thứ 6',
  sat: 'Thứ 7',
  sun: 'Chủ nhật',
};

const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
export const CUTOFF_MINUTES = 10 * 60 + 21; // 10:21 giờ VN
export const CUTOFF_LABEL = '10:21';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Date có các trường UTC = giờ VN tại thời điểm `now`. */
function vnShift(now: Date): Date {
  return new Date(now.getTime() + VN_OFFSET_MS);
}

/** Số ngày canon (00:00 UTC) ứng với ngày VN của một Date. */
function vnDayNumber(d: Date): number {
  const v = vnShift(d);
  return Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
}

/** Số ngày canon của startDate (đã lưu ở 00:00 UTC). */
function startDayNumber(startDate: Date): number {
  const s = new Date(startDate);
  return Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
}

/** Các ngày bị khoá đối với user thường tại thời điểm hiện tại. */
export function computeLockedDays(startDate: Date | null | undefined, now: Date = new Date()): Record<DayKey, boolean> {
  const locked = Object.fromEntries(DAY_KEYS.map((d) => [d, false])) as Record<DayKey, boolean>;
  if (!startDate) return locked;

  const start = startDayNumber(startDate);
  const today = vnDayNumber(now);
  const v = vnShift(now);
  const nowMinutes = v.getUTCHours() * 60 + v.getUTCMinutes();

  DAY_KEYS.forEach((key, i) => {
    const dayNum = start + i * DAY_MS;
    if (dayNum < today)
      locked[key] = true; // đã qua
    else if (dayNum === today) locked[key] = nowMinutes >= CUTOFF_MINUTES; // hôm nay, quá giờ chốt
    // tương lai: mở
  });
  return locked;
}

/** Nhãn ngày dương lịch "d/M" cho từng cột (để FE hiển thị). */
export function computeDayDates(startDate: Date | null | undefined): Record<DayKey, string | null> {
  const out = Object.fromEntries(DAY_KEYS.map((d) => [d, null])) as Record<DayKey, string | null>;
  if (!startDate) return out;
  const start = startDayNumber(startDate);
  DAY_KEYS.forEach((key, i) => {
    const d = new Date(start + i * DAY_MS);
    out[key] = `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  });
  return out;
}
