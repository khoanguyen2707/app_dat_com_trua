import type { ButtonHTMLAttributes } from 'react';
import { cls } from '@/lib/format';

/** Nút biểu tượng vuông (.btn-ico) — dùng cho các hành động nhỏ trên topbar, list… */
export function IconButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cls('btn-ico', className)} {...rest} />;
}
