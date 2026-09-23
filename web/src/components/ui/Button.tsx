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
  default: 'bg-surface text-ink-2 border-line hover:border-line-strong hover:text-ink',
  primary: 'bg-brand text-white border-transparent shadow-card hover:bg-brand-hover',
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
        'transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        tiny ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
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
