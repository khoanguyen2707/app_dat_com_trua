import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface Column {
  key: string;
  label: string;
  value: number;
  /** Nhãn phụ dưới trục, vd "Hôm nay" — đánh dấu bằng chữ chứ không đổi màu cột. */
  tag?: string;
}

/**
 * So sánh độ lớn giữa các hạng mục có thứ tự (T2→CN).
 *
 * Mọi cột cùng một màu: tô đậm-nhạt theo giá trị là mã hoá lặp — chiều cao cột
 * đã nói điều đó rồi, và nó đốt mất kênh màu vốn để dành cho việc khác.
 *
 * Cột và nhãn nằm ở hai hàng riêng để đường gốc chạy liền một mạch qua cả biểu
 * đồ, thay vì đứt thành từng đoạn dưới mỗi cột.
 */
export function ColumnChart({ data, unit }: { data: Column[]; unit: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const hoverIndex = data.findIndex((d) => d.key === hover);
  const hovered = hoverIndex === -1 ? undefined : data[hoverIndex];

  return (
    <div className="relative">
      <div className="flex h-40 items-stretch gap-2">
        {data.map((d) => {
          const on = hover === d.key;
          return (
            <button
              key={d.key}
              type="button"
              className="flex min-w-0 flex-1 flex-col gap-1.5"
              onPointerEnter={() => setHover(d.key)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(d.key)}
              onBlur={() => setHover(null)}
            >
              <span className="tnum text-center text-[12px] font-medium text-ink-2">{d.value}</span>
              <span className="relative flex-1">
                {/* đầu dữ liệu bo 4px, chân vuông tại đường gốc; bề dày tối đa 24px */}
                <span
                  className={cn(
                    'absolute inset-x-0 bottom-0 mx-auto max-w-6 rounded-t-[4px] bg-brand transition-[height,opacity] duration-500',
                    on ? 'opacity-100' : 'opacity-85',
                  )}
                  style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-px bg-line" aria-hidden="true" />

      <div className="mt-1.5 flex gap-2">
        {data.map((d) => (
          <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center">
            <span className={cn('truncate text-[11px]', hover === d.key ? 'text-ink' : 'text-ink-3')}>{d.label}</span>
            <span className="h-4 truncate text-[10px] font-medium text-brand">{d.tag ?? ''}</span>
          </div>
        ))}
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-ui border border-line bg-surface px-2.5 py-1.5 shadow-pop"
          /* neo ngay trên cột đang rê thay vì nằm góc, để không che số của cột khác */
          style={{ left: `${((hoverIndex + 0.5) / data.length) * 100}%` }}
        >
          <div className="tnum text-sm font-semibold">
            {hovered.value} {unit}
          </div>
          <div className="text-[12px] text-ink-3">{hovered.label}</div>
        </div>
      )}
    </div>
  );
}
