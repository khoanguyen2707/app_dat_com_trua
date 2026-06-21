import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cls } from '@/lib/format';

type Variant = 'default' | 'primary' | 'success' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tiny?: boolean;
  block?: boolean;
  /** Hiện spinner nhỏ trong nút + tự disable khi đang gọi API. */
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'default', tiny, block, loading, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cls('btn', variant !== 'default' && variant, tiny && 'tiny', block && 'block', loading && 'is-loading', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="btn-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
