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

/** Giờ:phút theo local (vd "9:05") từ ISO. */
export const hhmm = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Thời gian tương đối tiếng Việt: "vừa xong" / "5 phút trước" / "2 giờ trước" / "3 ngày trước". */
export const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};
