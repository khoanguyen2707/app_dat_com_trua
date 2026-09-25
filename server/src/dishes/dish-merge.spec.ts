import { describe, expect, it } from 'vitest';
import { planMerge, type MergeOrderItem } from './dish-merge';

const row = (id: string, dishId: string, qty = 1, userId = 'u1', day = 'mon'): MergeOrderItem => ({
  id,
  weekId: 'w1',
  userId,
  day,
  dishId,
  qty,
});

describe('planMerge', () => {
  it('chuyển suất của món trùng sang món giữ lại', () => {
    const plan = planMerge([row('a', 'dup')], [], 'keep', ['dup']);
    expect(plan).toMatchObject({ repoint: ['a'], addQty: [], remove: [] });
  });

  it('cùng người cùng ngày đã có món giữ lại thì cộng số lượng, xoá dòng trùng', () => {
    const plan = planMerge([row('k', 'keep', 1), row('d', 'dup', 2)], [], 'keep', ['dup']);
    expect(plan.repoint).toEqual([]);
    expect(plan.remove).toEqual(['d']);
    expect(plan.addQty).toEqual([{ id: 'k', qty: 2 }]);
  });

  it('hai món trùng cùng ô: một dòng chuyển, dòng kia cộng vào nó', () => {
    const plan = planMerge([row('d1', 'dup1'), row('d2', 'dup2', 3)], [], 'keep', ['dup1', 'dup2']);
    expect(plan.repoint).toEqual(['d1']);
    expect(plan.remove).toEqual(['d2']);
    expect(plan.addQty).toEqual([{ id: 'd1', qty: 3 }]);
  });

  it('không đụng người/ngày khác và món khác', () => {
    const plan = planMerge([row('k', 'keep', 1, 'u1'), row('d', 'dup', 1, 'u2'), row('o', 'other')], [], 'keep', [
      'dup',
    ]);
    expect(plan).toMatchObject({ repoint: ['d'], remove: [], addQty: [] });
  });

  it('thay món trùng trong thực đơn các tuần, khử lặp, bỏ qua tuần không liên quan', () => {
    const plan = planMerge(
      [],
      [
        { id: 'w1', dayMenu: { mon: ['keep', 'dup', 'x'], tue: ['dup'], wed: ['x'] } },
        { id: 'w2', dayMenu: { mon: ['x'] } },
        { id: 'w3', dayMenu: null },
      ],
      'keep',
      ['dup'],
    );
    expect(plan.dayMenus).toEqual([{ weekId: 'w1', dayMenu: { mon: ['keep', 'x'], tue: ['keep'], wed: ['x'] } }]);
  });
});
