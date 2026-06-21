import type { ReactNode } from 'react';
import { cls } from '@/lib/format';

/** Thẻ chỉ số ở khu hero (nhãn + giá trị) */
export function StatCard({ label, value, brand }: { label: ReactNode; value: ReactNode; brand?: boolean }) {
  return (
    <div className="stat">
      <div className="lbl">{label}</div>
      <div className={cls('val', brand && 'brand')}>{value}</div>
    </div>
  );
}
