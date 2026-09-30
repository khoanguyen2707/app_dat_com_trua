import { describe, expect, it } from 'vitest';
import { minutesLeft, planCutoffReminder, type ReminderInput } from './cutoff-reminder';

const base: ReminderInput = {
  todayKey: 'wed',
  menuCount: 5,
  nowMinutes: 9 * 60 + 45, // 09:45
  alreadySent: false,
  candidates: [
    { userId: 'a', ordered: false },
    { userId: 'b', ordered: true },
    { userId: 'c', ordered: false },
  ],
};

describe('planCutoffReminder', () => {
  it('chỉ nhắc người chưa đặt', () => {
    expect(planCutoffReminder(base)).toEqual({ userIds: ['a', 'c'], skipped: null });
  });

  it('hôm nay không thuộc tuần đang mở → không gửi', () => {
    expect(planCutoffReminder({ ...base, todayKey: null }).skipped).toBe('no-week');
  });

  it('chưa đăng thực đơn → không gửi (mở app cũng chưa đặt được)', () => {
    expect(planCutoffReminder({ ...base, menuCount: 0 }).skipped).toBe('no-menu');
  });

  it('đã quá giờ chốt → không gửi', () => {
    expect(planCutoffReminder({ ...base, nowMinutes: 10 * 60 + 16 }).skipped).toBe('past-cutoff');
  });

  it('đúng giờ chốt cũng coi là quá', () => {
    expect(planCutoffReminder({ ...base, nowMinutes: 10 * 60 + 15 }).skipped).toBe('past-cutoff');
  });

  it('gọi lại trong ngày → không bắn trùng', () => {
    expect(planCutoffReminder({ ...base, alreadySent: true }).skipped).toBe('already-sent');
  });

  it('mọi người đã đặt hết → không gửi', () => {
    const candidates = base.candidates.map((c) => ({ ...c, ordered: true }));
    expect(planCutoffReminder({ ...base, candidates })).toEqual({ userIds: [], skipped: 'nobody' });
  });
});

describe('minutesLeft', () => {
  it('09:45 còn 30 phút', () => {
    expect(minutesLeft(9 * 60 + 45)).toBe(30);
  });

  it('quá giờ chốt thì về 0, không âm', () => {
    expect(minutesLeft(11 * 60)).toBe(0);
  });
});
