import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { useMeasure } from '@/hooks/useMeasure';

export interface TrendPoint {
  label: string;
  value: number;
}

const H = 220;
const PAD = { top: 26, right: 24, bottom: 30, left: 40 };

/** Làm tròn trần lên số đẹp để trục y có mốc dễ đọc. */
function niceMax(v: number) {
  if (v <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(v))) / 2;
  return Math.ceil(v / step) * step;
}

/**
 * Xu hướng theo thời gian: một chuỗi, đường 2px + vùng tô nhạt.
 *
 * Dữ liệu theo thời gian vẽ bằng đường chứ không phải cột — cột cắt rời từng mốc
 * và làm mất chính thứ người ta cần thấy: nó đang lên hay xuống. Một chuỗi thì
 * không cần chú giải, tiêu đề đã nói đang vẽ cái gì.
 *
 * Vẽ theo bề rộng đo được (không co giãn viewBox) để chiều cao luôn cố định và
 * nét vẽ giữ đúng 2px trên mọi cỡ màn hình.
 */
export function TrendChart({ data, unit }: { data: TrendPoint[]; unit: string }) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const { ref, width } = useMeasure<HTMLDivElement>();

  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const last = data.length - 1;
  const x = (i: number) => PAD.left + (last === 0 ? innerW / 2 : (i / last) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  const area = `${line} L ${x(last)} ${PAD.top + innerH} L ${x(0)} ${PAD.top + innerH} Z`;
  const ticks = [0, max / 2, max];

  /** Mốc gần con trỏ nhất — người đọc nhắm vào một tuần, không nhắm vào đường 2px. */
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - box.left - PAD.left) / innerW;
    setHover(Math.max(0, Math.min(last, Math.round(ratio * last))));
  };

  return (
    <div className="relative" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          className="block"
          role="img"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH} />
          </clipPath>

          {/* lưới: nét liền mảnh, lùi hẳn về sau */}
          {ticks.map((tv) => (
            <g key={tv}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tv)} y2={y(tv)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tv) + 4} textAnchor="end" className="fill-ink-4 text-[11px]">
                {tv}
              </text>
            </g>
          ))}

          <g clipPath={`url(#${clipId})`}>
            <path d={area} fill="var(--color-brand)" fillOpacity={0.1} />
            <path
              d={line}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--color-line-strong)"
              strokeWidth={1}
            />
          )}

          {/* điểm cuối: vòng viền màu nền để không lẫn vào đường */}
          <circle
            cx={x(last)}
            cy={y(data[last].value)}
            r={5}
            fill="var(--color-brand)"
            stroke="var(--color-surface)"
            strokeWidth={2}
          />
          {hover !== null && hover !== last && (
            <circle
              cx={x(hover)}
              cy={y(data[hover].value)}
              r={4.5}
              fill="var(--color-brand)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          )}

          {/* nhãn trực tiếp chỉ ở điểm cuối — dán số lên mọi điểm thì không ai đọc */}
          <text x={x(last)} y={y(data[last].value) - 12} textAnchor="end" className="fill-ink text-[12px] font-semibold">
            {data[last].value}
          </text>

          {data.map((d, i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
              className={cn('text-[11px]', hover === i ? 'fill-ink' : 'fill-ink-4')}
            >
              {d.label}
            </text>
          ))}
        </svg>
      )}

      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-ui border border-line bg-surface px-2.5 py-1.5 shadow-pop"
          style={{ left: x(hover), top: 0 }}
        >
          <div className="tnum text-sm font-semibold">
            {data[hover].value} {unit}
          </div>
          <div className="text-[12px] text-ink-3">{data[hover].label}</div>
        </div>
      )}
    </div>
  );
}
