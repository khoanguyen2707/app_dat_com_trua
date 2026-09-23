import { describe, expect, it } from 'vitest';
import { matchKey, parseMenuText, type CatalogDish } from './menu-parse';

const dish = (name: string, category: 'MAIN' | 'DRINK' = 'MAIN', price = 0): CatalogDish => ({
  id: 'id-' + name,
  name,
  category,
  price,
});

const catalog: CatalogDish[] = [
  dish('Cá lóc kho'),
  dish('Gà kho sả'),
  dish('Tôm rim'),
  dish('Thịt kho trứng cút'),
  dish('Cà phê đen', 'DRINK', 10000),
];

const parse = (text: string) => parseMenuText(text, catalog);

describe('matchKey', () => {
  it('bỏ dấu và khoảng trắng nên viết hoa hay thiếu dấu vẫn là một món', () => {
    expect(matchKey('Cà phê đen')).toBe(matchKey('ca phe den'));
    expect(matchKey('CÁ LÓC KHO')).toBe(matchKey('Cá lóc kho'));
  });

  it('gộp từ lặp liền nhau — admin dán lỗi thành "kho kho" vẫn là món cũ', () => {
    expect(matchKey('Cá lóc kho kho')).toBe(matchKey('Cá lóc kho'));
    expect(matchKey('Thịt thịt kho trứng cút')).toBe(matchKey('Thịt kho trứng cút'));
  });

  it('chỉ gộp từ lặp LIỀN nhau, không đụng tới từ lặp cách quãng', () => {
    // "kho" xuất hiện hai lần nhưng không liền nhau -> giữ nguyên, đây là tên thật
    expect(matchKey('Kho quẹt kho')).not.toBe(matchKey('Kho quẹt'));
  });
});

describe('parseMenuText — món đã có', () => {
  it('khớp đúng món cũ khi gõ thiếu dấu', () => {
    const d = parse('ca loc kho');
    expect(d.create).toHaveLength(0);
    expect(d.matched[0]?.dishId).toBe('id-Cá lóc kho');
  });

  it('lặp từ không còn đẻ ra món mới', () => {
    const d = parse('Cá lóc kho kho');
    expect(d.create).toHaveLength(0);
    expect(d.matched[0]?.dishId).toBe('id-Cá lóc kho');
  });
});

describe('parseMenuText — nghi trùng', () => {
  it('gõ sai một ký tự thì báo ngờ ngợ chứ không im lặng tạo mới', () => {
    const d = parse('Thịt kho trứng cúc');
    expect(d.create).toHaveLength(1);
    expect(d.create[0].maybeSameAs?.name).toBe('Thịt kho trứng cút');
  });

  it('hai món thật sự khác nhau chỉ lệch một chữ vẫn phải được hỏi, không tự gộp', () => {
    // "Cá kho sả" vs "Gà kho sả" chỉ khác một ký tự — tự động gộp là dọn nhầm món ăn
    const d = parse('Cá kho sả');
    expect(d.create).toHaveLength(1);
    expect(d.create[0].maybeSameAs?.name).toBe('Gà kho sả');
  });

  it('món khác hẳn thì không gắn cờ ngờ ngợ', () => {
    const d = parse('Mực rim');
    expect(d.create).toHaveLength(1);
    expect(d.create[0].maybeSameAs).toBeUndefined();
  });

  it('món mới hoàn toàn thì tạo thẳng, không phải hỏi gì', () => {
    const d = parse('Bò lúc lắc');
    expect(d.create).toHaveLength(1);
    expect(d.create[0].maybeSameAs).toBeUndefined();
  });
});

describe('parseMenuText — khử trùng lặp trong chính text dán vào', () => {
  it('cùng một món viết hai kiểu trong một lần dán chỉ tính một lần', () => {
    const d = parse('Cá lóc kho\nca loc kho\nCá lóc kho kho');
    expect(d.items).toHaveLength(1);
  });
});
