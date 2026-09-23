import { describe, expect, it } from 'vitest';
import { CUTOFF_MINUTES, SHOP_DEADLINE_MINUTES } from './week-lock';
import { dispatchLevel, LEVEL_ORDER, minutesLeftForShop, pickAssignee } from './dispatch-window';

/** Một thời điểm giờ VN, quy về UTC (VN = UTC+7). */
const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 8, 23, h - 7, m));
};

const base = { sent: false, hasOrders: true, alreadySent: 'idle' as const };

describe('mốc thời gian', () => {
  it('chốt đặt cơm sớm hơn giờ quán ngừng nhận', () => {
    // Nếu hai mốc bằng nhau thì không còn khoảng nào để gửi đơn — cả cơ chế nhắc vô nghĩa.
    expect(CUTOFF_MINUTES).toBeLessThan(SHOP_DEADLINE_MINUTES);
  });
});

describe('dispatchLevel', () => {
  it('im trước giờ chốt vì danh sách chưa chốt xong', () => {
    expect(dispatchLevel({ ...base, now: at('10:14') })).toBe('idle');
  });

  it('nhắc lần đầu ngay khi tới giờ chốt', () => {
    expect(dispatchLevel({ ...base, now: at('10:15') })).toBe('first');
  });

  it('chưa ai gửi thì nhắc lần hai ở một phần ba quãng còn lại', () => {
    expect(dispatchLevel({ ...base, now: at('10:20'), alreadySent: 'first' })).toBe('second');
  });

  it('leo thang ở hai phần ba quãng còn lại', () => {
    expect(dispatchLevel({ ...base, now: at('10:25'), alreadySent: 'second' })).toBe('escalate');
  });

  it('im sau khi quán đã ngừng nhận — nhắc lúc đó chỉ gây hoảng chứ không cứu được bữa trưa', () => {
    expect(dispatchLevel({ ...base, now: at('10:31'), alreadySent: 'second' })).toBe('idle');
  });

  it('im khi đơn đã được gửi cho quán', () => {
    expect(dispatchLevel({ ...base, now: at('10:25'), sent: true })).toBe('idle');
  });

  it('im hẳn vào ngày không ai đặt cơm', () => {
    expect(dispatchLevel({ ...base, now: at('10:25'), hasOrders: false })).toBe('idle');
  });

  it('không nhắc lại mức đã nhắc rồi — flow gọi 5 phút một lần, không được spam', () => {
    expect(dispatchLevel({ ...base, now: at('10:16'), alreadySent: 'first' })).toBe('idle');
  });

  it('nhảy thẳng tới mức đúng khi flow lỡ nhịp, không nhắc bù các mức đã qua', () => {
    expect(dispatchLevel({ ...base, now: at('10:26'), alreadySent: 'idle' })).toBe('escalate');
  });
});

describe('minutesLeftForShop', () => {
  it('đếm số phút còn lại trước khi quán ngừng nhận', () => {
    expect(minutesLeftForShop(at('10:20'))).toBe(10);
  });

  it('không trả số âm khi đã quá giờ', () => {
    expect(minutesLeftForShop(at('10:45'))).toBe(0);
  });
});

describe('LEVEL_ORDER', () => {
  it('xếp theo mức độ gấp tăng dần để so sánh được', () => {
    expect(LEVEL_ORDER.idle).toBeLessThan(LEVEL_ORDER.first);
    expect(LEVEL_ORDER.first).toBeLessThan(LEVEL_ORDER.second);
    expect(LEVEL_ORDER.second).toBeLessThan(LEVEL_ORDER.escalate);
  });
});

describe('pickAssignee', () => {
  const pickup = { name: 'Nhân', email: 'nhan@x.vn', role: 'pickup' as const };
  const admin = { name: 'Khoa', email: 'khoa@x.vn', role: 'admin' as const };

  it('người đi lấy cơm hôm nay chịu trách nhiệm ở hai mức đầu', () => {
    expect(pickAssignee([pickup, admin], 'first')).toEqual(pickup);
    expect(pickAssignee([pickup, admin], 'second')).toEqual(pickup);
  });

  it('leo thang thì chuyển sang admin — người trực rõ ràng đang không xử lý', () => {
    expect(pickAssignee([pickup, admin], 'escalate')).toEqual(admin);
  });

  it('chưa bốc được người trực thì admin gánh ngay từ đầu', () => {
    expect(pickAssignee([admin], 'first')).toEqual(admin);
  });

  it('không có ai để nhắc thì trả null chứ không đoán bừa', () => {
    expect(pickAssignee([], 'first')).toBeNull();
  });

  it('leo thang mà chỉ có người trực, không có admin, thì vẫn là người trực', () => {
    expect(pickAssignee([pickup], 'escalate')).toEqual(pickup);
  });
});
