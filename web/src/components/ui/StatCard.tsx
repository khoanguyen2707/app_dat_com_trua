import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Một ô chỉ số trong thanh KPI (nhãn nhỏ phía trên, giá trị bên dưới). */
export function StatCard({
  label,
  value,
  brand,
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  brand?: boolean;
  sub?: ReactNode;
}) {
  return (
    <div className="px-4 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-4">{label}</div>
      <div className={cn('tnum mt-0.5 text-xl font-semibold tracking-tight', brand && 'text-brand')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}
