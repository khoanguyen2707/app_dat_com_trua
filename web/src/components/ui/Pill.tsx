import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Nhãn trạng thái nhỏ (admin / user) */
export function Pill({ kind, icon, children }: { kind: 'admin' | 'user'; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        kind === 'admin'
          ? 'border-ok-line bg-ok-soft text-ok'
          : 'border-info-line bg-info-soft text-info',
      )}
    >
      {icon} {children}
    </span>
  );
}
