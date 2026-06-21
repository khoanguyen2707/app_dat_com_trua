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
