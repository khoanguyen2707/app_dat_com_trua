import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Nút biểu tượng vuông — hành động nhỏ trên topbar, hàng danh sách… */
export function IconButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-grid size-8 place-items-center rounded-ui border border-transparent text-ink-3',
        'transition-colors hover:border-line hover:bg-subtle hover:text-ink',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  );
}
