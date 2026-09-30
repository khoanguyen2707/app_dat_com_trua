import { describe, expect, it } from 'vitest';
import { buildOrderText, formatVnDate, tallyLines, type OrderTextInput } from './order-text';

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
        { name: 'Nước đậu', qty: 1 },
        { name: 'Cà phê', qty: 2 },
        { name: 'Nước đậu', qty: 3 },
      ]),
    ).toEqual([
      { name: 'Nước đậu', qty: 4 },
      { name: 'Cà phê', qty: 2 },
    ]);
  });

  it('cùng số lượng thì xếp theo tên', () => {
    expect(
      tallyLines([
        { name: 'Cà phê sữa', qty: 2 },
        { name: 'Bạc sỉu', qty: 2 },
      ]).map((l) => l.name),
    ).toEqual(['Bạc sỉu', 'Cà phê sữa']);
  });
});

describe('buildOrderText', () => {
  const input: OrderTextInput = {
    date: '2026-09-30',
    boxes: [
      { dishes: ['Cơm sườn'], note: 'ít cơm, không hành' },
      { dishes: ['Cơm gà chiên mắm', 'Trứng chiên'], note: '' },
      { dishes: ['Cơm thập cẩm'], note: '' },
    ],
    drinks: [{ name: 'Nước đậu', qty: 2 }],
  };

  it('tổng số hộp = số người ăn, xuất hiện ở cả đầu và cuối', () => {
    const text = buildOrderText(input);
    expect(text).toContain('Tổng: 3 hộp');
    expect(text).toContain('Tổng cộng 3 hộp cơm + 2 nước.');
  });

  it('liệt kê theo hộp, không gom theo món', () => {
    const text = buildOrderText(input);
    expect(text).toContain('TỪNG HỘP');
    expect(text).not.toContain('MÓN CHÍNH');
    expect(text).toContain('1. Cơm sườn');
  });

  it('KHÔNG lộ tên người đặt cho quán', () => {
    const text = buildOrderText(input);
    for (const name of ['Chương', 'Khoa', 'Nghĩa']) expect(text).not.toContain(name);
  });

  it('một người nhiều món thì các món nối bằng + trong CÙNG một hộp', () => {
    expect(buildOrderText(input)).toContain('Cơm gà chiên mắm + Trứng chiên');
  });

  it('người mix 2 món vẫn chỉ tính 1 hộp', () => {
    const text = buildOrderText(input);
    expect(text).toContain('Tổng: 3 hộp');
    expect(text).not.toContain('Tổng: 4 hộp');
  });

  it('ghi chú đi kèm ngay hộp của người đó', () => {
    expect(buildOrderText(input)).toContain('Cơm sườn  — ít cơm, không hành');
  });

  it('đăng ký ăn nhưng chưa chọn món vẫn là một hộp, có ghi rõ', () => {
    const text = buildOrderText({
      date: '2026-09-30',
      boxes: [{ dishes: [], note: '' }],
      drinks: [],
    });
    expect(text).toContain('(chưa chọn món)');
    expect(text).toContain('Tổng: 1 hộp');
  });

  it('không có đồ uống thì không nhắc nước ở dòng tổng', () => {
    const text = buildOrderText({ ...input, drinks: [] });
    expect(text.trim().endsWith('Tổng cộng 3 hộp cơm.')).toBe(true);
    expect(text).not.toContain('ĐỒ UỐNG');
  });

  it('chưa ai đặt thì nói thẳng, không in bảng rỗng', () => {
    const text = buildOrderText({ date: '2026-09-30', boxes: [], drinks: [] });
    expect(text).toContain('Hôm nay chưa có ai đặt.');
    expect(text).not.toContain('TỪNG HỘP');
  });

  it('chỉ có người gọi nước, không ai ăn cơm → vẫn in đồ uống', () => {
    const text = buildOrderText({
      date: '2026-09-30',
      boxes: [],
      drinks: [{ name: 'Cà phê đen', qty: 1 }],
    });
    expect(text).toContain('ĐỒ UỐNG');
    expect(text).toContain('Tổng cộng 0 hộp cơm + 1 nước.');
  });
});
