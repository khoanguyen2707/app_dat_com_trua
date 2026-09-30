import { describe, expect, it } from 'vitest';
import { buildOrderText, formatVnDate, tallyLines } from './order-text';

describe('formatVnDate', () => {
  it('đổi sang thứ + ngày tiếng Việt', () => {
    expect(formatVnDate('2026-09-30')).toBe('Thứ Tư 30/09/2026');
  });

  it('chuỗi lạ thì trả nguyên, không ném lỗi', () => {
    expect(formatVnDate('hôm nay')).toBe('hôm nay');
  });
});

describe('tallyLines', () => {
  it('gộp cùng tên và xếp nhiều → ít', () => {
    expect(
      tallyLines([
        { name: 'Cơm gà', qty: 1 },
        { name: 'Cơm cá', qty: 2 },
        { name: 'Cơm gà', qty: 3 },
      ]),
    ).toEqual([
      { name: 'Cơm gà', qty: 4 },
      { name: 'Cơm cá', qty: 2 },
    ]);
  });

  it('cùng số lượng thì xếp theo tên', () => {
    expect(
      tallyLines([
        { name: 'Cơm sườn', qty: 2 },
        { name: 'Cơm cá', qty: 2 },
      ]).map((l) => l.name),
    ).toEqual(['Cơm cá', 'Cơm sườn']);
  });
});

describe('buildOrderText', () => {
  const input = {
    date: '2026-09-30',
    boxes: 14,
    mains: [
      { name: 'Cơm thập cẩm', qty: 6 },
      { name: 'Cơm gà chiên mắm', qty: 4 },
      { name: 'Cơm sườn', qty: 3 },
      { name: 'Cơm thập cẩm (không cá)', qty: 1 },
    ],
    drinks: [{ name: 'Nước đậu', qty: 2 }],
    notes: [{ fullName: 'Chương', dishes: ['Cơm sườn'], note: 'ít cơm, không hành' }],
  };

  it('tổng số hộp xuất hiện ở cả đầu và cuối', () => {
    const text = buildOrderText(input);
    expect(text).toContain('Tổng: 14 hộp');
    expect(text).toContain('Tổng cộng 14 hộp cơm + 2 nước.');
  });

  it('không tính đồ uống vào số hộp', () => {
    expect(buildOrderText(input)).not.toContain('Tổng: 16 hộp');
  });

  it('số hộp lấy từ số NGƯỜI ăn, không phải tổng số phần món', () => {
    // 6 người ăn nhưng gọi 8 phần: hai người mix hai món trong cùng một hộp.
    const text = buildOrderText({
      date: '2026-09-30',
      boxes: 6,
      mains: [
        { name: 'Cơm cá', qty: 5 },
        { name: 'Cơm gà', qty: 3 },
      ],
      drinks: [],
      notes: [],
    });
    expect(text).toContain('Tổng: 6 hộp');
    expect(text).toContain('cộng 8 phần cho 6 hộp');
    expect(text).toContain('Tổng cộng 6 hộp cơm.');
  });

  it('số phần bằng số hộp thì không thêm dòng giải thích', () => {
    const text = buildOrderText({
      date: '2026-09-30',
      boxes: 3,
      mains: [{ name: 'Cơm cá', qty: 3 }],
      drinks: [],
      notes: [],
    });
    expect(text).not.toContain('phần cho');
  });

  it('cột số canh thẳng hàng theo số dài nhất', () => {
    const text = buildOrderText({
      ...input,
      mains: [
        { name: 'A', qty: 10 },
        { name: 'B', qty: 2 },
      ],
    });
    expect(text).toContain('  10 × A');
    expect(text).toContain('   2 × B');
  });

  it('có ghi chú riêng thì nêu cả tên lẫn món', () => {
    expect(buildOrderText(input)).toContain('• Chương (Cơm sườn): ít cơm, không hành');
  });

  it('không có đồ uống thì không nhắc nước ở dòng tổng', () => {
    const text = buildOrderText({ ...input, drinks: [] });
    expect(text.trim().endsWith('Tổng cộng 14 hộp cơm.')).toBe(true);
  });

  it('chưa ai đặt thì nói thẳng, không in bảng rỗng', () => {
    const text = buildOrderText({ date: '2026-09-30', boxes: 0, mains: [], drinks: [], notes: [] });
    expect(text).toContain('Hôm nay chưa có ai đặt.');
    expect(text).not.toContain('MÓN CHÍNH');
  });
});
