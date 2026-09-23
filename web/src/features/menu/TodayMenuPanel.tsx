import { useMemo } from 'react';
import { CupSoda, Info, UtensilsCrossed } from 'lucide-react';
import type { Dish, Grid } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui';

/**
 * Thực đơn thành viên nhìn thấy: những món quán bán HÔM NAY, lấy từ `dayMenu`
 * admin đã đăng cho ngày đó.
 *
 * Món ăn không hiện giá: một suất là một giá bất kể chọn bao nhiêu món, in giá
 * lên từng món chỉ khiến người ta tưởng chọn hai món là trả gấp đôi. Đồ uống
 * thì ngược lại — tính tiền riêng từng ly nên phải thấy giá.
 */
export function TodayMenuPanel({ grid, dishes }: { grid: Grid; dishes: Dish[] }) {
  const today = grid.todayKey ?? null;
  const dayInfo = DAYS.find((d) => d.key === today);
  const date = today ? grid.dates?.[today] : null;

  /** dayMenu của hôm nay; null = admin chưa đăng, khi đó hiện cả danh mục. */
  const posted = useMemo(() => {
    const ids = today ? grid.week.dayMenu?.[today] : null;
    return ids && ids.length ? new Set(ids) : null;
  }, [grid.week.dayMenu, today]);

  const shown = posted ? dishes.filter((d) => posted.has(d.id)) : dishes;
  const mains = shown.filter((d) => d.category !== 'DRINK');
  const drinks = shown.filter((d) => d.category === 'DRINK');

  return (
    <Card>
      <CardHeader
        title={posted ? t.menu.todayTitle : t.menu.catalogTitle}
        action={
          dayInfo && (
            <span className="text-[13px] text-ink-3">
              {dayInfo.full}
              {date ? `, ${date}` : ''}
            </span>
          )
        }
      />

      {!posted && (
        <div className="flex items-start gap-2 border-b border-line bg-warn-soft px-5 py-2.5 text-[13px] text-warn">
          <Info className="mt-0.5 size-4 shrink-0" />
          {t.menu.notPostedYet}
        </div>
      )}

      <CardBody>
        {shown.length === 0 ? (
          <EmptyState icon={<UtensilsCrossed />}>{t.menu.empty}</EmptyState>
        ) : (
          <>
            {mains.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold">{t.menu.foodSection}</h3>
                  <span className="text-[13px] text-ink-3">{t.menu.onePriceNote(vnd(grid.week.unitPrice))}</span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {mains.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-3 rounded-ui-md border border-line bg-surface px-3 py-2.5 transition-colors hover:border-brand-line hover:bg-brand-soft"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-ui bg-subtle text-xl">
                        {d.emoji || '🍽️'}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{d.name}</span>
                        {d.description && (
                          <span className="block truncate text-[12px] text-ink-3">{d.description}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {drinks.length > 0 && (
              <section className="mt-6">
                <div className="mb-3 flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold">{t.menu.drinkSection}</h3>
                  <span className="text-[13px] text-ink-3">{t.menu.drinkPriceNote}</span>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {drinks.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-3 rounded-ui-md border border-line bg-surface px-3 py-2.5 transition-colors hover:border-drink-line hover:bg-drink-soft"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-ui bg-subtle text-xl">
                        {d.emoji || <CupSoda className="size-5 text-drink" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.name}</span>
                      </span>
                      <span className="tnum shrink-0 text-[13px] font-medium text-drink">{vnd(d.price)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
