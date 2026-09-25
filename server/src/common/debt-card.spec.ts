import { describe, expect, it } from 'vitest';
import { groupDebts, type DebtOrderInput } from './debt';
import { buildDebtCard, dropFreshWeek, isOverdue, toTeamsId } from './debt-card';

const domains = { internal: 'wecare-i.com', guest: 'wecarei.onmicrosoft.com' };
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Giờ VN → UTC. */
const vnAt = (iso: string, h: number) => new Date(day(iso).getTime() + (h - 7) * 3600_000);
const noDays = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };

const order = (p: Partial<DebtOrderInput> & { userId: string; weekStart: Date }): DebtOrderInput => ({
  weekId: p.weekStart.toISOString().slice(0, 10),
  weekLabel: `${p.weekStart.getUTCDate()}/${p.weekStart.getUTCMonth() + 1}/2026 - x`,
  weekSort: p.weekStart,
  unitPrice: 25000,
  fullName: p.userId,
  days: { ...noDays, mon: true },
  drinks: [],
  status: 'UNPAID',
  reportedAt: null,
  ...p,
});

describe('toTeamsId', () => {
  it('guest Gmail → UPN guest', () => {
    expect(toTeamsId('an.b@gmail.com', domains)).toBe('an.b_gmail.com#EXT#@wecarei.onmicrosoft.com');
  });
  it('email nội bộ, UPN guest và Object ID giữ nguyên', () => {
    expect(toTeamsId('Diem@Wecare-i.com', domains)).toBe('Diem@Wecare-i.com');
    expect(toTeamsId('x_gmail.com#EXT#@wecarei.onmicrosoft.com', domains)).toContain('#EXT#');
    expect(toTeamsId('fb39547e-020b-45e1-843f-969ac04126e9', domains)).toBe('fb39547e-020b-45e1-843f-969ac04126e9');
  });
});

describe('dropFreshWeek', () => {
  const debtors = groupDebts([
    order({ userId: 'an', weekStart: day('2026-09-21') }),
    order({ userId: 'an', weekStart: day('2026-09-28') }),
    order({ userId: 'binh', weekStart: day('2026-09-28') }),
  ]);

  it('thứ 2 bỏ tuần vừa bắt đầu, người chỉ nợ tuần đó biến mất', () => {
    const res = dropFreshWeek(debtors, vnAt('2026-09-28', 9));
    expect(res.map((d) => d.userId)).toEqual(['an']);
    expect(res[0].weeks).toHaveLength(1);
    expect(res[0].total).toBe(25000);
  });

  it('thứ 6 giữ nguyên', () => {
    expect(dropFreshWeek(debtors, vnAt('2026-10-02', 15))).toHaveLength(2);
  });
});

describe('isOverdue', () => {
  const now = vnAt('2026-09-25', 15); // tuần hiện tại bắt đầu 21/9
  const week = (iso: string) => groupDebts([order({ userId: 'a', weekStart: day(iso) })])[0].weeks[0];
  it('tuần trước chưa quá hạn, tuần trước nữa thì quá hạn', () => {
    expect(isOverdue(week('2026-09-14'), now)).toBe(false);
    expect(isOverdue(week('2026-09-07'), now)).toBe(true);
  });
});

describe('buildDebtCard', () => {
  const now = vnAt('2026-09-25', 15);
  const debtors = groupDebts([
    order({ userId: 'an', fullName: 'An', email: 'an@gmail.com', weekStart: day('2026-09-07') }),
    order({ userId: 'binh', fullName: 'Bình', weekStart: day('2026-09-21'), status: 'PENDING' }),
  ]);
  const card = buildDebtCard(debtors, {
    payUrl: 'https://x.app/#pay',
    confirmUrl: 'https://x.app/#pay-pending',
    admins: [{ name: 'Admin', email: 'boss@wecare-i.com' }],
    domains,
    now,
  });
  const json = JSON.stringify(card);

  it('khai báo @mention cho người có email, người không email để tên thường', () => {
    expect(card.msteams.entities).toEqual([
      {
        type: 'mention',
        text: '<at>An</at>',
        mentioned: { id: 'an_gmail.com#EXT#@wecarei.onmicrosoft.com', name: 'An' },
      },
      { type: 'mention', text: '<at>Admin</at>', mentioned: { id: 'boss@wecare-i.com', name: 'Admin' } },
    ]);
    expect(json).toContain('<at>An</at>');
    expect(json).not.toContain('<at>Bình</at>');
  });

  it('đánh dấu quá hạn, có mục chờ xác nhận và hai nút', () => {
    expect(json).toContain('⚠ Quá hạn');
    expect(json).toContain('chờ admin xác nhận');
    expect(card.actions).toEqual([
      expect.objectContaining({ type: 'Action.OpenUrl', url: 'https://x.app/#pay' }),
      expect.objectContaining({ type: 'Action.OpenUrl', url: 'https://x.app/#pay-pending' }),
    ]);
  });

  it('không có khoản chờ thì không có nút admin', () => {
    const c = buildDebtCard(groupDebts([order({ userId: 'a', weekStart: day('2026-09-21') })]), {
      payUrl: 'p',
      confirmUrl: 'c',
      admins: [],
      domains,
      now,
    });
    expect(c.actions).toHaveLength(1);
  });

  it('mọi ColumnSet đều có columns là mảng các Column chứa items là mảng', () => {
    const walk = (n: any): void => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!n || typeof n !== 'object') return;
      if (n.type === 'ColumnSet') {
        for (const col of n.columns) {
          expect(col.type).toBe('Column');
          expect(Array.isArray(col.items)).toBe(true);
        }
      }
      Object.values(n).forEach(walk);
    };
    walk(card.body);
  });
});
