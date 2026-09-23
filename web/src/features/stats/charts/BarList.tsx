import { cn } from '@/lib/cn';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Dòng của chính người đang đăng nhập — tô nền nhẹ để tự tìm thấy mình. */
  me?: boolean;
}

/**
 * Xếp hạng theo độ lớn với nhãn dài: thanh ngang, dài nhất lên đầu.
 *
 * Giá trị nằm ngay đầu thanh nên người đọc không phải rê chuột mới biết số —
 * chú giải kiểu tooltip chỉ được bổ sung, không được là đường duy nhất.
 */
export function BarList({ data }: { data: BarRow[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-1.5">
      {data.map((d) => (
        <div key={d.key} className={cn('flex items-center gap-3 rounded-ui px-1.5 py-0.5', d.me && 'bg-brand-soft')}>
          <span className="w-24 shrink-0 truncate text-[13px] text-ink-2">{d.label}</span>
          <span className="h-4 min-w-0 flex-1">
            {/* đầu dữ liệu bo 4px, chân vuông tại gốc — cùng quy cách với cột dọc */}
            <span
              className="block h-full rounded-r-[4px] bg-brand transition-[width] duration-500"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
            />
          </span>
          <span className="tnum w-6 shrink-0 text-right text-[13px] font-medium">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
