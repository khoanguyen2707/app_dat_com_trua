/**
 * Dựng text đơn cơm để dán thẳng cho quán (Zalo/Teams).
 *
 * Hàm thuần, không chạm DB: định dạng là thứ sẽ phải chỉnh nhiều lần theo ý quán, nên
 * phải sửa và kiểm thử được mà không cần dựng cả app.
 *
 * Liệt kê theo HỘP của từng người, không gom theo món: một người chọn nhiều món thì cả
 * mấy món đó nằm chung MỘT hộp, gom theo món sẽ mất thông tin món nào đi với món nào và
 * tổng số phần lại nhiều hơn số hộp.
 *
 * Các hộp in ra theo thứ tự A-Z của tên món để quán dò theo mắt cho nhanh — vẫn là
 * từng hộp riêng, không gộp số lượng, chỉ đổi vị trí rồi đánh số lại từ 1.
 *
 * Canh cột bằng khoảng trắng chứ không dùng bảng markdown — Zalo không render bảng, còn
 * khoảng trắng thì chỗ nào cũng hiện đúng.
 */

export interface OrderLine {
  name: string;
  qty: number;
}

/**
 * Một hộp cơm = một người ăn.
 *
 * Cố ý KHÔNG mang tên người: quán chỉ cần biết mỗi hộp gồm món gì và dặn gì. Việc hộp
 * nào của ai là chuyện chia cơm nội bộ, nằm ở danh sách "Ai ăn gì" trên màn hình.
 */
export interface OrderBox {
  /** Các món trong hộp này. Rỗng = có đăng ký ăn nhưng chưa chọn món. */
  dishes: string[];
  /** Dặn riêng cho hộp này, vd "ít cơm, không hành". */
  note: string;
}

export interface OrderTextInput {
  /** Ngày dương lịch theo lịch VN, "YYYY-MM-DD". */
  date: string;
  boxes: OrderBox[];
  drinks: OrderLine[];
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

/** Nhãn món của một hộp, cũng là thứ quán đọc và là khoá sắp xếp. */
function boxLabel(box: OrderBox): string {
  // Nhiều món trong một hộp nối bằng " + " để thấy rõ chúng đi CÙNG nhau,
  // khác hẳn dấu phẩy giữa hai hộp khác nhau.
  return box.dishes.length ? box.dishes.join(' + ') : '(chưa chọn món)';
}

/**
 * Xếp các hộp theo tên món A-Z (so sánh theo tiếng Việt nên Cá < Cơm < Mực < Sườn < Tôm).
 * Hộp chưa chọn món dồn xuống cuối: quán không cần dò chúng, còn mình thì cần thấy ngay.
 */
export function sortBoxesByDish(boxes: OrderBox[]): OrderBox[] {
  return [...boxes].sort((a, b) => {
    const pending = Number(!a.dishes.length) - Number(!b.dishes.length);
    if (pending) return pending;
    return boxLabel(a).localeCompare(boxLabel(b), 'vi');
  });
}

export function buildOrderText(input: OrderTextInput): string {
  const boxes = sortBoxesByDish(input.boxes);
  const drinks = tallyLines(input.drinks);
  const cups = total(drinks);
  const head = `🍱 ĐƠN CƠM TRƯA — ${formatVnDate(input.date)}`;

  if (!boxes.length && !cups) {
    return `${head}\nHôm nay chưa có ai đặt.`;
  }

  const out: string[] = [head, `Tổng: ${boxes.length} hộp`, ''];

  if (boxes.length) {
    // Số thứ tự canh phải để quán đếm hộp bằng mắt không sót.
    const numWidth = String(boxes.length).length;
    out.push(
      'TỪNG HỘP',
      ...boxes.map((b, i) => {
        const no = String(i + 1).padStart(numWidth);
        const note = b.note ? `  — ${b.note}` : '';
        return `  ${no}. ${boxLabel(b)}${note}`;
      }),
      '',
    );
  }

  if (drinks.length) {
    const width = Math.max(...drinks.map((d) => String(d.qty).length));
    out.push('ĐỒ UỐNG', ...drinks.map((d) => `  ${String(d.qty).padStart(width)} × ${d.name}`), '');
  }

  // Nhắc lại tổng ở cuối: quán đọc vội dễ sót con số ở đầu.
  out.push(`Tổng cộng ${boxes.length} hộp cơm${cups ? ` + ${cups} nước` : ''}.`);
  return out.join('\n');
}
