import type { PaymentConfig } from '@/types';

/** Sinh URL ảnh VietQR (img.vietqr.io) — có thể kèm số tiền + nội dung CK */
export function vietqr(p: PaymentConfig, amount?: number, info?: string) {
  let u = `https://img.vietqr.io/image/${p.bankBin}-${p.accountNumber}-compact2.png?accountName=${encodeURIComponent(
    p.accountHolder,
  )}`;
  if (amount) u += `&amount=${Math.round(amount)}`;
  if (info) u += `&addInfo=${encodeURIComponent(info)}`;
  return u;
}

/** Giới hạn độ dài nội dung CK an toàn cho đa số ngân hàng. */
const MAX_INFO = 50;

/**
 * Nội dung CK khi trả gộp nhiều tuần: "Ten - 15/6,22/6". Dài quá thì rút
 * thành "Ten - 3 tuan 15/6-29/6". `weeks` là nhãn tuần ngắn, xếp cũ → mới.
 */
export function bulkTransferInfo(name: string, weeks: string[]) {
  const starts = weeks.map((w) => w.split(' - ')[0].trim());
  const full = `${name} - ${starts.join(',')}`;
  if (full.length <= MAX_INFO) return full;
  return `${name} - ${weeks.length} tuan ${starts[0]}-${starts[starts.length - 1]}`.slice(0, MAX_INFO);
}
