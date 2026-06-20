import type { DayKey, PaymentConfig } from './types';

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'T2' },
  { key: 'tue', label: 'T3' },
  { key: 'wed', label: 'T4' },
  { key: 'thu', label: 'T5' },
  { key: 'fri', label: 'T6' },
  { key: 'sat', label: 'T7' },
  { key: 'sun', label: 'CN' },
];

export const vnd = (n: number) => Math.round(n || 0).toLocaleString('vi-VN') + ' đ';

export const initials = (name: string) => {
  const p = String(name || '?').trim().split(/\s+/);
  return (p[p.length - 1][0] || '?').toUpperCase();
};

export const cls = (...xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join(' ');

/** Sinh URL ảnh VietQR (img.vietqr.io) — có thể kèm số tiền + nội dung CK */
export function vietqr(p: PaymentConfig, amount?: number, info?: string) {
  let u = `https://img.vietqr.io/image/${p.bankBin}-${p.accountNumber}-compact2.png?accountName=${encodeURIComponent(
    p.accountHolder,
  )}`;
  if (amount) u += `&amount=${Math.round(amount)}`;
  if (info) u += `&addInfo=${encodeURIComponent(info)}`;
  return u;
}

export const BANKS: { name: string; bin: string }[] = [
  { name: 'TPBank', bin: '970423' }, { name: 'Vietcombank', bin: '970436' }, { name: 'Techcombank', bin: '970407' },
  { name: 'BIDV', bin: '970418' }, { name: 'VietinBank', bin: '970415' }, { name: 'MBBank', bin: '970422' },
  { name: 'ACB', bin: '970416' }, { name: 'VPBank', bin: '970432' }, { name: 'Agribank', bin: '970405' },
  { name: 'Sacombank', bin: '970403' }, { name: 'VIB', bin: '970441' }, { name: 'HDBank', bin: '970437' },
  { name: 'OCB', bin: '970448' }, { name: 'MSB', bin: '970426' }, { name: 'SHB', bin: '970443' },
  { name: 'Cake', bin: '546034' }, { name: 'Timo', bin: '963388' },
];
