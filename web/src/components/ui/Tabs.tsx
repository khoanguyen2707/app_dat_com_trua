import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TabItem<K extends string> = { key: K; label: ReactNode };

/** Segmented control dùng cho tab trong modal / khu nội dung. */
export function Tabs<K extends string>({
  items,
  active,
  onChange,
  inModal = false,
}: {
  items: readonly TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Nằm trong header dính của Modal → bỏ margin dọc mặc định. */
  inModal?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex w-full gap-0.5 rounded-ui-md border border-line bg-subtle p-0.5',
        inModal ? 'mt-3' : 'my-4',
      )}
      role="tablist"
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={active === it.key}
          className={cn(
            'flex-1 rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors',
            active === it.key ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink',
          )}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
