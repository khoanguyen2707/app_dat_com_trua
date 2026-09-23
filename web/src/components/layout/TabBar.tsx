import { TABS, type TabKey } from '@/constants/config';
import { cn } from '@/lib/cn';

/** Điều hướng ở mobile/tablet (<lg). Desktop dùng Sidebar thay cho thanh này. */
export function TabBar({
  active,
  onChange,
  badges,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  /** Số nhỏ nổi trên icon tab (vd số người chờ xác nhận ở tab Thanh toán). */
  badges?: Partial<Record<TabKey, number>>;
}) {
  return (
    <div className="sticky bottom-0 z-30 mt-auto border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg gap-1 px-2 py-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const n = badges?.[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 rounded-ui py-1.5 text-[11px] font-medium transition-colors',
                active === tab.key ? 'text-brand' : 'text-ink-4',
              )}
              onClick={() => onChange(tab.key)}
              aria-current={active === tab.key ? 'page' : undefined}
            >
              <span className="relative">
                <Icon className="size-[18px]" />
                {n > 0 && (
                  <span className="tnum absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                    {n > 9 ? '9+' : n}
                  </span>
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
