import { describe, expect, it } from 'vitest';
import { debtLockMessage, evaluateGate, outstandingBeforeCurrentWeek } from './debt-gate';
import type { DebtWeek } from './debt';

// Thứ 4 01/10/2026, 03:00 UTC = 10:00 giờ VN. Tuần hiện tại bắt đầu Thứ 2 29/09/2026.
const NOW = new Date('2026-09-30T03:00:00Z');
const week = (startIso: string | null, total: number): DebtWeek =>
  ({ weekStart: startIso ? new Date(startIso) : null, total }) as DebtWeek;

describe('outstandingBeforeCurrentWeek', () => {
  it('bỏ tuần đang chạy, cộng các tuần trước', () => {
    const debtor = { weeks: [week('2026-09-28T00:00:00Z', 125_000), week('2026-09-21T00:00:00Z', 150_000)] };
    expect(outstandingBeforeCurrentWeek(debtor, NOW)).toBe(150_000);
  });

  it('tuần cũ không có mốc ngày vẫn tính là nợ', () => {
    expect(outstandingBeforeCurrentWeek({ weeks: [week(null, 75_000)] }, NOW)).toBe(75_000);
  });

  it('không nợ gì → 0', () => {
    expect(outstandingBeforeCurrentWeek(null, NOW)).toBe(0);
    expect(outstandingBeforeCurrentWeek({ weeks: [] }, NOW)).toBe(0);
  });
});

describe('evaluateGate', () => {
  it('vượt ngưỡng thì khoá', () => {
    expect(evaluateGate(250_000, 200_000).locked).toBe(true);
  });

  it('đúng bằng ngưỡng thì KHÔNG khoá', () => {
    expect(evaluateGate(200_000, 200_000).locked).toBe(false);
  });

  it('ngưỡng 0 = tắt rule, nợ bao nhiêu cũng không khoá', () => {
    const gate = evaluateGate(9_000_000, 0);
    expect(gate.locked).toBe(false);
    expect(gate.debtLimit).toBe(0);
  });

  it('ngưỡng âm coi như tắt', () => {
    expect(evaluateGate(500_000, -1)).toEqual({ outstanding: 500_000, debtLimit: 0, locked: false });
  });
});

describe('debtLockMessage', () => {
  it('nêu cả số nợ lẫn ngưỡng', () => {
    const msg = debtLockMessage(evaluateGate(340_000, 200_000));
    expect(msg).toContain('340.000đ');
    expect(msg).toContain('200.000đ');
  });
});
