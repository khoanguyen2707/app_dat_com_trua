import type { ReactNode } from 'react';
import { cls } from '@/lib/format';

/** Thẻ chỉ số ở khu hero (nhãn + giá trị + dòng phụ tuỳ chọn) */
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
    <div className="stat">
      <div className="lbl">{label}</div>
      <div className={cls('val', brand && 'brand')}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
