/**
 * Dựng text đơn cơm để dán thẳng cho quán (Zalo/Teams).
 *
 * Hàm thuần, không chạm DB: định dạng là thứ sẽ phải chỉnh nhiều lần theo ý quán, nên
 * phải sửa và kiểm thử được mà không cần dựng cả app.
 *
 * Canh cột bằng khoảng trắng chứ không dùng bảng markdown — Zalo không render bảng,
 * còn khoảng trắng thì chỗ nào cũng hiện đúng.
 */

export interface OrderLine {
  name: string;
  qty: number;
}

export interface OrderNote {
  fullName: string;
  /** Món người đó đặt trong ngày, để quán biết ghi chú gắn vào hộp nào. */
  dishes: string[];
  note: string;
}

export interface OrderTextInput {
  /** Ngày dương lịch theo lịch VN, "YYYY-MM-DD". */
  date: string;
  /**
   * Số HỘP cơm cần nấu = số người ăn.
   *
   * Phải truyền vào, không được suy từ tổng các dòng món: một người mix nhiều món vẫn
   * chỉ một hộp, nên cộng số phần món lại sẽ ra nhiều hơn số hộp và quán nấu dư.
   */
  boxes: number;
  mains: OrderLine[];
  drinks: OrderLine[];
  notes: OrderNote[];
}

const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** "2026-09-30" → "Thứ Tư 30/09/2026". Parse bằng tay để không dính múi giờ máy chủ. */
export function formatVnDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  const weekday = WEEKDAY[new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay()];
  return `${weekday} ${d}/${mo}/${y}`;
}

const total = (lines: OrderLine[]) => lines.reduce((a, l) => a + l.qty, 0);

/** Gộp các dòng cùng tên và xếp nhiều → ít, cùng số lượng thì theo tên. */
export function tallyLines(lines: OrderLine[]): OrderLine[] {
  const byName = new Map<string, number>();
  for (const l of lines) {
    if (!l.name) continue;
    byName.set(l.name, (byName.get(l.name) ?? 0) + l.qty);
  }
  return [...byName]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'vi'));
}

export function buildOrderText(input: OrderTextInput): string {
  const mains = tallyLines(input.mains);
  const drinks = tallyLines(input.drinks);
  const boxes = input.boxes;
  const portions = total(mains);
  const cups = total(drinks);

  if (!boxes && !cups) {
    return `🍱 ĐƠN CƠM TRƯA — ${formatVnDate(input.date)}\nHôm nay chưa có ai đặt.`;
  }

  // Bề rộng cột số lấy theo số lớn nhất để dấu × thẳng hàng.
  const width = Math.max(...[...mains, ...drinks].map((l) => String(l.qty).length), 1);
  const item = (l: OrderLine) => `  ${String(l.qty).padStart(width)} × ${l.name}`;

  const out: string[] = [`🍱 ĐƠN CƠM TRƯA — ${formatVnDate(input.date)}`, `Tổng: ${boxes} hộp`, ''];

  if (mains.length) {
    out.push('MÓN CHÍNH', ...mains.map(item));
    // Cộng các dòng món ra nhiều hơn số hộp nghĩa là có người gọi nhiều món trong cùng
    // một hộp. Phải nói thẳng, nếu không quán cộng nhẩm rồi nấu dư.
    if (portions > boxes) {
      out.push(`  (cộng ${portions} phần cho ${boxes} hộp — có hộp gồm nhiều món)`);
    }
    out.push('');
  }
  if (input.notes.length) {
    const nameWidth = Math.max(...input.notes.map((n) => n.fullName.length));
    out.push(
      'GHI CHÚ RIÊNG',
      ...input.notes.map((n) => {
        const dishes = n.dishes.length ? ` (${n.dishes.join(', ')})` : '';
        return `  • ${n.fullName.padEnd(nameWidth)}${dishes}: ${n.note}`;
      }),
      '',
    );
  }
  if (drinks.length) {
    out.push('ĐỒ UỐNG', ...drinks.map(item), '');
  }

  // Nhắc lại tổng ở cuối: quán đọc vội dễ sót con số ở đầu.
  out.push(`Tổng cộng ${boxes} hộp cơm${cups ? ` + ${cups} nước` : ''}.`);
  return out.join('\n');
}
