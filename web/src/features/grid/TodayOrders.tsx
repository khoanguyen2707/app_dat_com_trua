import { useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, Copy, CupSoda, StickyNote } from 'lucide-react';
import type { DayKey, Dish, Grid } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { Button, Card, CardBody, CardHeader, toast } from '@/components/ui';

/**
 * Tóm tắt đơn của HÔM NAY cho người đi mua: ai ăn gì, ai dặn gì, tổng bao nhiêu
 * suất — đọc một lượt là gọi được quán, không phải dò ngang bảng tuần.
 *
 * Mặc định gập lại vì bảng tuần mới là nội dung chính của trang.
 */
export function TodayOrders({ grid, dishes }: { grid: Grid; dishes: Dish[] }) {
  const [open, setOpen] = useState(false);
  const today = grid.todayKey ?? null;
  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const rows = useMemo(() => {
    if (!today) return [];
    return grid.members
      .filter((m) => m.days[today] || (m.items?.[today]?.drinks.length ?? 0) > 0)
      .map((m) => {
        const it = m.items?.[today as DayKey];
        return {
          userId: m.userId,
          name: m.fullName,
          eat: m.days[today],
          food: (it?.food ?? []).map((id) => dishMap.get(id)?.name).filter(Boolean) as string[],
          drinks: (it?.drinks ?? []).map((d) => `${dishMap.get(d.dishId)?.name ?? '?'} ×${d.qty}`),
          note: m.notes?.[today],
        };
      });
  }, [grid.members, today, dishMap]);

  if (!today) return null;

  const dayInfo = DAYS.find((d) => d.key === today);
  const servings = rows.filter((r) => r.eat).length;

  /** Chép thành text phẳng để dán thẳng vào Zalo/Teams khi gọi quán. */
  const copyList = () => {
    const lines = rows.map((r) => {
      const parts = [r.eat ? (r.food.length ? r.food.join(', ') : 'Cơm') : ''].filter(Boolean);
      if (r.drinks.length) parts.push(r.drinks.join(', '));
      if (r.note) parts.push(`(${r.note})`);
      return `- ${r.name}: ${parts.join(' + ')}`;
    });
    const header = `${dayInfo?.full}${grid.dates?.[today] ? ` ${grid.dates[today]}` : ''} — ${t.grid.today.servings(servings)}`;
    navigator.clipboard?.writeText([header, ...lines].join('\n'));
    toast(t.grid.today.copied, '📋');
  };

  return (
    <Card>
      <CardHeader
        icon={<ClipboardList />}
        title={t.grid.today.title}
        action={
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-ink-3">{t.grid.today.servings(servings)}</span>
            {rows.length > 0 && (
              <Button tiny onClick={copyList}>
                <Copy className="size-3.5" />
                {t.actions.copy}
              </Button>
            )}
            <Button tiny variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
            </Button>
          </div>
        }
      />
      {open && (
        <CardBody flush>
          {rows.length === 0 ? (
            <div className="px-5 py-6 text-center text-[13px] text-ink-3">{t.grid.today.empty}</div>
          ) : (
            <div className="divide-y divide-line">
              {rows.map((r) => (
                <div key={r.userId} className="flex items-start gap-3 px-5 py-2.5 text-[13px]">
                  <span className="w-24 shrink-0 font-medium">{r.name}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {r.eat &&
                        (r.food.length ? (
                          r.food.map((n) => (
                            <span key={n} className="rounded-ui bg-brand-soft px-2 py-0.5 text-brand">
                              {n}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-ui bg-brand-soft px-2 py-0.5 text-brand">{t.grid.today.plainRice}</span>
                        ))}
                      {r.drinks.map((n) => (
                        <span key={n} className="inline-flex items-center gap-1 rounded-ui bg-drink-soft px-2 py-0.5 text-drink">
                          <CupSoda className="size-3.5" />
                          {n}
                        </span>
                      ))}
                    </span>
                    {r.note && (
                      <span className="mt-1 flex items-start gap-1.5 text-[12px] text-ink-2">
                        <StickyNote className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                        {r.note}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
