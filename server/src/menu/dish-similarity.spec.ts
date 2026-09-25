import { describe, expect, it } from 'vitest';
import { clusters, nearest, pairKey } from './dish-similarity';
import { matchKey } from './menu-parse';

const d = (id: string, name: string, category = 'MAIN') => ({ id, name, key: matchKey(name), category });

describe('nearest', () => {
  const pool = [d('1', 'Sườn ram mặn'), d('2', 'Sườn ram mặm'), d('3', 'Sườn rim mặn'), d('4', 'Trà đá', 'DRINK')];

  it('trả tối đa `limit` món cùng loại, điểm giảm dần', () => {
    const res = nearest(matchKey('Suon ram man'), 'MAIN', pool, 2);
    expect(res).toHaveLength(2);
    expect(res[0].score).toBeGreaterThanOrEqual(res[1].score);
    expect(res.every((r) => r.category === 'MAIN')).toBe(true);
  });

  it('khác loại thì không gợi ý', () => {
    expect(nearest(matchKey('Tra da'), 'MAIN', pool)).toEqual([]);
  });
});

describe('clusters', () => {
  it('gom chuỗi món gần giống thành một cụm', () => {
    const items = [
      d('a', 'Canh chua cá lóc'),
      d('b', 'Canh chua ca loc'),
      d('c', 'Canh chưa cá lóc'),
      d('x', 'Tôm rim'),
    ];
    const res = clusters(items);
    expect(res).toHaveLength(1);
    expect(res[0].map((i) => i.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('không gộp món khác loại hay khác hẳn nhau (Mực rim ≠ Tôm rim)', () => {
    expect(clusters([d('a', 'Mực rim'), d('b', 'Tôm rim')])).toEqual([]);
    expect(clusters([d('a', 'Cà phê', 'DRINK'), d('b', 'Cà phê')])).toEqual([]);
  });

  it('bỏ qua cặp admin đã xác nhận khác nhau', () => {
    const items = [d('a', 'Sườn ram mặn'), d('b', 'Sườn ram mặm')];
    expect(clusters(items)).toHaveLength(1);
    expect(clusters(items, new Set([pairKey('b', 'a')]))).toEqual([]);
  });
});
