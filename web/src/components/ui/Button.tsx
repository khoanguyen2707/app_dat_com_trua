import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'primary' | 'success' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tiny?: boolean;
  block?: boolean;
  /** Hiện spinner nhỏ trong nút + tự disable khi đang gọi API. */
  loading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  default: 'bg-surface text-ink border-line hover:bg-subtle',
  primary: 'bg-brand text-white border-transparent hover:bg-brand-hover',
  success: 'bg-ok text-white border-transparent hover:brightness-110',
  danger: 'bg-danger-soft text-danger border-danger-line hover:bg-danger hover:text-white',
  ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-subtle',
};

export function Button({
  variant = 'default',
  tiny,
  block,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-ui border font-medium',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        tiny ? 'h-7 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        block && 'w-full',
        VARIANTS[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
