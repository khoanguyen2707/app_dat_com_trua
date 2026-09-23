/**
 * Logic khoá tick theo ngày/giờ (giờ Việt Nam, UTC+7).
 *
 * Luật (user thường — admin luôn sửa được mọi ngày):
 *  - Ngày đã qua (so với hôm nay): khoá.
 *  - Hôm nay: khoá nếu đã quá GIỜ CHỐT (10:21 sáng giờ VN).
 *  - Ngày tương lai: khoá — KHÔNG cho đặt cơm/nước trước.
 *  => User chỉ đặt được cho HÔM NAY, trước giờ chốt.
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
  const nowMinutes = vnMinutes(now);

  DAY_KEYS.forEach((key, i) => {
    const dayNum = start + i * DAY_MS;
    if (dayNum < today)
      locked[key] = true; // đã qua
    else if (dayNum === today)
      locked[key] = nowMinutes >= CUTOFF_MINUTES; // hôm nay: quá giờ chốt thì khoá
    else locked[key] = true; // tương lai: không cho đặt trước
  });
  return locked;
}

/** Số phút đã trôi qua kể từ 00:00 theo giờ VN (để so với CUTOFF_MINUTES). */
export function vnMinutes(now: Date = new Date()): number {
  const v = vnShift(now);
  return v.getUTCHours() * 60 + v.getUTCMinutes();
}

/** Ngày theo lịch VN dạng "YYYY-MM-DD" (mốc để chốt đúng 1 lượt lấy cơm mỗi ngày). */
export function vnDateStr(now: Date = new Date()): string {
  const v = vnShift(now);
  const m = String(v.getUTCMonth() + 1).padStart(2, '0');
  const d = String(v.getUTCDate()).padStart(2, '0');
  return `${v.getUTCFullYear()}-${m}-${d}`;
}

/** DayKey ('mon'..'sun') ứng với HÔM NAY theo lịch VN. */
export function vnTodayKey(now: Date = new Date()): DayKey {
  const dow = vnShift(now).getUTCDay(); // 0=CN, 1=T2, ... 6=T7
  return dow === 0 ? 'sun' : DAY_KEYS[dow - 1];
}

/**
 * Các cột ngày của một tuần đã THỰC SỰ DIỄN RA tính tới hôm nay (gồm hôm nay), theo lịch VN.
 *
 * Dùng để đếm "số lần đã đặt cơm" (mẫu số của tỷ lệ đi lấy cơm): chỉ tính ngày đã tới,
 * không tính ngày tương lai — admin có thể tick trước cho user (enforceLock = false),
 * nếu đếm cả ngày tương lai thì mẫu số phồng lên và tỷ lệ bị hạ oan.
 *
 * startDate = null (tuần không khoá): không xác định được mốc ngày → coi như cả 7 ngày hợp lệ.
 */
export function elapsedDayKeys(startDate: Date | null | undefined, now: Date = new Date()): DayKey[] {
  if (!startDate) return [...DAY_KEYS];
  const start = startDayNumber(startDate);
  const today = vnDayNumber(now);
  return DAY_KEYS.filter((_, i) => start + i * DAY_MS <= today);
}

/**
 * Cột nào của tuần này là HÔM NAY (lịch VN), null nếu hôm nay nằm ngoài tuần.
 *
 * Khác `vnTodayKey`: hàm kia chỉ trả thứ trong tuần, nên khi xem lại một tuần cũ
 * nó vẫn chỉ vào một cột — sai. Ở đây so đúng ngày dương lịch với startDate.
 */
export function computeTodayKey(startDate: Date | null | undefined, now: Date = new Date()): DayKey | null {
  if (!startDate) return null;
  const start = startDayNumber(startDate);
  const today = vnDayNumber(now);
  const i = Math.round((today - start) / DAY_MS);
  return i >= 0 && i < DAY_KEYS.length ? DAY_KEYS[i] : null;
}

/**
 * Thứ 2 (00:00 UTC) của tuần chứa `now`, tính theo lịch VN.
 *
 * Trả về cùng dạng với cột `startDate` trong DB: mốc 00:00 UTC của một ngày
 * dương lịch, không phải một thời điểm thực.
 */
export function currentWeekStart(now: Date = new Date()): Date {
  const v = vnShift(now);
  const dow = v.getUTCDay(); // 0=CN, 1=T2, ... 6=T7
  const backToMonday = dow === 0 ? 6 : dow - 1;
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()) - backToMonday * DAY_MS);
}

/**
 * Tuần hiện hành đã hết hạn chưa — nếu rồi thì trả mốc thứ 2 của tuần PHẢI mở.
 *
 * Trả null khi không cần làm gì: tuần chưa có startDate (không khoá theo ngày),
 * hôm nay vẫn nằm trong tuần đó, hoặc tuần đang mở nằm ở tương lai (admin mở sẵn
 * tuần sau — không được kéo ngược về hiện tại).
 *
 * Nghỉ nhiều tuần thì nhảy thẳng tới tuần hiện tại: đây là lý do hàm trả về mốc
 * tuần này chứ không phải "startDate + 7 ngày".
 */
export function weekRollover(activeStart: Date | null | undefined, now: Date = new Date()): Date | null {
  if (!activeStart) return null;
  const current = currentWeekStart(now);
  return startDayNumber(activeStart) < current.getTime() ? current : null;
}

/** Nhãn tuần "d/M/yyyy - d/M/yyyy" từ thứ 2 tới chủ nhật. */
export function nextWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart.getTime() + 6 * DAY_MS);
  const fmt = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
  return `${fmt(weekStart)} - ${fmt(end)}`;
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
