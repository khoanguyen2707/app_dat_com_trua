import type { ButtonHTMLAttributes } from 'react';
import { cls } from '@/lib/format';

type Variant = 'default' | 'primary' | 'success' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tiny?: boolean;
  block?: boolean;
}

export function Button({ variant = 'default', tiny, block, className, ...rest }: ButtonProps) {
  return (
    <button
      className={cls('btn', variant !== 'default' && variant, tiny && 'tiny', block && 'block', className)}
      {...rest}
    />
  );
}
