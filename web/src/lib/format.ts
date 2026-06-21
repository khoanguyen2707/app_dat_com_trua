/** Định dạng số tiền VND: 25000 -> "25.000 đ" */
export const vnd = (n: number) => Math.round(n || 0).toLocaleString('vi-VN') + ' đ';

/** Lấy chữ cái đầu của tên (chữ cuối cùng) để hiển thị avatar */
export const initials = (name: string) => {
  const p = String(name || '?').trim().split(/\s+/);
  return (p[p.length - 1][0] || '?').toUpperCase();
};

/** Ghép class có điều kiện: cls('a', cond && 'b') -> "a b" */
export const cls = (...xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join(' ');

/** Bỏ dấu tiếng Việt (cho nội dung chuyển khoản — ngân hàng dễ đọc) */
export const noAccent = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

/** Rút gọn nhãn tuần (bỏ năm): "22/6/2026 - 27/6/2026" -> "22/6 - 27/6" */
export const weekShort = (label: string) => (label || '').replace(/\/\d{4}/g, '');
