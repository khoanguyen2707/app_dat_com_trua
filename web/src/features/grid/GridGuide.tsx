import { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { t } from '@/constants/strings';

/**
 * Hướng dẫn nghiệp vụ của bảng tuần. Trước đây là khối 6 gạch đầu dòng luôn
 * hiện, chiếm mất phần trên màn hình; giờ thu vào nút "?" mở popover.
 */
export function GridGuide({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-ui px-2 py-1 text-[13px] text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
      >
        <HelpCircle className="size-4" />
        {t.grid.guide.title}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-[22rem] rounded-ui-md border border-line bg-surface p-3 shadow-lg">
          <ul className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-4" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
