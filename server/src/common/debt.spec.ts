import { describe, expect, it } from 'vitest';
import { buildDebtReport, groupDebts, type DebtOrderInput } from './debt';

const noDays = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };

const order = (p: Partial<DebtOrderInput> & { userId: string; weekId: string }): DebtOrderInput => ({
  weekLabel: `${p.weekId}/2026`,
  weekSort: new Date('2026-09-01'),
  unitPrice: 25000,
  fullName: p.userId,
  days: { ...noDays, mon: true },
  drinks: [],
  status: 'UNPAID',
  reportedAt: null,
  ...p,
});

describe('groupDebts', () => {
  it('gom nhiều tuần của cùng người, tuần cũ trước', () => {
    const res = groupDebts([
      order({ userId: 'an', weekId: '22/9', weekSort: new Date('2026-09-22') }),
      order({ userId: 'an', weekId: '15/9', weekSort: new Date('2026-09-15') }),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].weeks.map((w) => w.weekId)).toEqual(['15/9', '22/9']);
    expect(res[0].total).toBe(50000);
  });

  it('cộng đồ uống và bỏ tuần 0đ', () => {
    const res = groupDebts([
      order({ userId: 'an', weekId: 'a', drinks: [{ name: 'Trà', qty: 2, price: 10000 }] }),
      order({ userId: 'binh', weekId: 'a', days: noDays }),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].weeks[0]).toMatchObject({ foodTotal: 25000, drinksTotal: 20000, total: 45000 });
  });

  it('tách tiền chờ xác nhận và xếp người nợ nhiều lên đầu', () => {
    const res = groupDebts([
      order({ userId: 'an', weekId: 'a' }),
      order({ userId: 'binh', weekId: 'a', status: 'PENDING' }),
      order({ userId: 'binh', weekId: 'b' }),
    ]);
    expect(res.map((d) => d.userId)).toEqual(['binh', 'an']);
    expect(res[0].pendingTotal).toBe(25000);
  });
});

describe('buildDebtReport', () => {
  it('có link thanh toán và link xác nhận khi có khoản chờ', () => {
    const r = buildDebtReport(groupDebts([order({ userId: 'an', weekId: 'a', status: 'PENDING' })]), 'https://x.app/');
    expect(r.payUrl).toBe('https://x.app/#pay');
    expect(r.confirmUrl).toBe('https://x.app/#pay-pending');
    expect(r.pendingCount).toBe(1);
    expect(r.text).toContain('https://x.app/#pay-pending');
    expect(r.html).toContain('chờ xác nhận');
  });

  it('không ai nợ thì hasDebt=false và không chèn link', () => {
    const r = buildDebtReport([], 'https://x.app');
    expect(r.hasDebt).toBe(false);
    expect(r.text).not.toContain('#pay');
  });

  it('thay tên người có email bằng placeholder để flow @mention, admin cũng được tag', () => {
    const r = buildDebtReport(
      groupDebts([
        order({ userId: 'an', fullName: 'An', email: 'an@x.com', weekId: 'a' }),
        order({ userId: 'binh', fullName: 'Bình', weekId: 'a' }),
      ]),
      'https://x.app',
      [{ name: 'Admin', email: 'admin@x.com' }],
    );
    expect(r.mentions).toEqual([
      { key: '@@M0@@', name: 'An', email: 'an@x.com', role: 'debtor' },
      { key: '@@M1@@', name: 'Admin', email: 'admin@x.com', role: 'admin' },
    ]);
    expect(r.html).toContain('<b>@@M0@@</b>');
    expect(r.html).toContain('<b>Bình</b>');
    expect(r.html).toContain('cc @@M1@@');
    expect(r.htmlPlain).toContain('<b>An</b>');
    expect(r.htmlPlain).not.toContain('@@M');
  });

  it('escape tên trong html', () => {
    const r = buildDebtReport(groupDebts([order({ userId: 'u', fullName: '<b>x', weekId: 'a' })]), '');
    expect(r.html).toContain('&lt;b&gt;x');
  });
});
