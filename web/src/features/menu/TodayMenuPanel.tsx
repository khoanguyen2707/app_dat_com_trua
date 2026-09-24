import { useMemo, useState } from 'react';
import { Clock, CupSoda, Info, Lock, UtensilsCrossed } from 'lucide-react';
import type { DayKey, Dish, Grid } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { vnd } from '@/lib/format';
import { groupByEmoji } from '@/lib/dishGroup';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui';
import { DayDetailSheet } from '@/features/grid/DayDetailSheet';

/** Tên nhóm đạm cho từng biểu tượng — bảng thực đơn ở quán gọi tên chứ không để trống. */
const GROUP_NAME: Record<string, string> = {
  '🐟': 'Món cá',
  '🦐': 'Hải sản',
  '🍗': 'Món gà',
  '🥩': 'Thịt heo, bò',
  '🍖': 'Sườn, giò',
  '🍳': 'Trứng',
  '🥬': 'Rau, củ',
  '🍲': 'Món khác',
  '🍱': 'Cơm phần',
  '🍛': 'Cơm phần',
};

/**
 * Thực đơn thành viên nhìn thấy: những món quán bán HÔM NAY, lấy từ `dayMenu`
 * admin đã đăng cho ngày đó.
 *
 * Chạm vào món là mở thẳng phiếu đặt hôm nay với món đó chọn sẵn — trước đây phải
 * đọc ở đây rồi sang tab khác tìm lại đúng món ấy.
 *
 * Món ăn không hiện giá: một suất là một giá bất kể chọn bao nhiêu món, in giá lên
 * từng món chỉ khiến người ta tưởng chọn hai món là trả gấp đôi. Đồ uống thì ngược
 * lại — tính tiền riêng từng ly nên phải thấy giá.
 */
export function TodayMenuPanel({
  grid,
  dishes,
  meId,
  reload,
}: {
  grid: Grid;
  dishes: Dish[];
  meId: string;
  reload: () => Promise<void>;
}) {
  const [ordering, setOrdering] = useState<string | null>(null);

  const today = grid.todayKey ?? null;
  const dayInfo = DAYS.find((d) => d.key === today);
  const date = today ? grid.dates?.[today] : null;
  const locked = today ? !!grid.lockedDays?.[today] : true;
  const me = grid.members.find((m) => m.userId === meId);
  const canOrder = !!today && !locked && !!me && !!grid.week.dayMenu?.[today]?.length;

  /** dayMenu của hôm nay; null = admin chưa đăng -> chưa cho đặt, chỉ báo chờ. */
  const posted = useMemo(() => {
    const ids = today ? grid.week.dayMenu?.[today] : null;
    return ids && ids.length ? new Set(ids) : null;
  }, [grid.week.dayMenu, today]);

  const shown = useMemo(() => (posted ? dishes.filter((d) => posted.has(d.id)) : []), [dishes, posted]);
  const mains = useMemo(() => shown.filter((d) => d.category !== 'DRINK'), [shown]);
  const drinks = useMemo(() => shown.filter((d) => d.category === 'DRINK'), [shown]);
  const groups = useMemo(() => groupByEmoji(mains), [mains]);

  return (
    <>
      <Card>
        <CardHeader
          title={t.menu.todayTitle}
          action={
            <div className="flex items-center gap-2 text-[13px]">
              {dayInfo && (
                <span className="text-ink-3">
                  {dayInfo.full}
                  {date ? `, ${date}` : ''}
                </span>
              )}
              {today && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium',
                    locked ? 'bg-subtle text-ink-3' : 'bg-brand-soft text-brand',
                  )}
                >
                  {locked ? <Lock className="size-3" /> : <Clock className="size-3" />}
                  {grid.cutoff &&
                    (locked ? t.me.closedToday(grid.cutoff.label) : t.me.openUntil(grid.cutoff.label))}
                </span>
              )}
            </div>
          }
        />

        {!posted && (
          <div className="flex items-start gap-2 border-b border-line bg-warn-soft px-5 py-2.5 text-[13px] text-warn">
            <Info className="mt-0.5 size-4 shrink-0" />
            {t.menu.notPostedYet}
          </div>
        )}

        <CardBody flush>
          {!posted ? (
            <EmptyState icon={<Clock />}>{t.menu.waitingMenu}</EmptyState>
          ) : shown.length === 0 ? (
            <EmptyState icon={<UtensilsCrossed />}>{t.menu.empty}</EmptyState>
          ) : (
            <>
              {mains.length > 0 && (
                <section className="px-5 pt-4">
                  <p className="mb-4 text-[13px] text-ink-3">
                    {t.menu.onePriceNote(vnd(grid.week.unitPrice))}
                    {canOrder && <span className="text-brand"> · {t.menu.tapToOrder}</span>}
                  </p>

                  {groups.map((g) => (
                    <section key={g.emoji} className="mb-5 last:mb-4">
                      <h3 className="mb-2 flex items-center gap-2 border-b border-line pb-1.5">
                        <span className="text-xl leading-none">{g.emoji}</span>
                        <span className="text-sm font-semibold">{GROUP_NAME[g.emoji] ?? t.menu.groupOther}</span>
                        <span className="tnum ml-auto text-[12px] text-ink-4">
                          {t.menu.sectionCount(g.dishes.length)}
                        </span>
                      </h3>

                      <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                        {g.dishes.map((d) => (
                          <li key={d.id}>
                            <button
                              type="button"
                              disabled={!canOrder}
                              onClick={() => setOrdering(d.id)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-ui-md px-2 py-2 text-left transition-colors',
                                canOrder ? 'hover:bg-brand-soft' : 'cursor-default',
                              )}
                            >
                              <span className="text-2xl leading-none">{d.emoji || '🍽️'}</span>
                              <span className="min-w-0">
                                <span className="block truncate text-[15px] font-medium">{d.name}</span>
                                {d.description && (
                                  <span className="block truncate text-[12px] text-ink-3">{d.description}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </section>
              )}

              {drinks.length > 0 && (
                <section className="border-t border-line px-5 py-4">
                  <h3 className="mb-2 flex items-center gap-2 border-b border-line pb-1.5">
                    <CupSoda className="size-5 text-drink" />
                    <span className="text-sm font-semibold">{t.menu.drinkSection}</span>
                    <span className="ml-auto text-[12px] text-ink-4">{t.menu.drinkPriceNote}</span>
                  </h3>

                  <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                    {drinks.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          disabled={!canOrder}
                          onClick={() => setOrdering(d.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-ui-md px-2 py-2 text-left transition-colors',
                            canOrder ? 'hover:bg-drink-soft' : 'cursor-default',
                          )}
                        >
                          <span className="text-2xl leading-none">{d.emoji || '🥤'}</span>
                          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{d.name}</span>
                          <span className="tnum shrink-0 text-[13px] font-medium text-drink">{vnd(d.price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {ordering && me && today && (
        <DayDetailSheet
          /* key theo món: đổi món phải dựng lại phiếu, vì state chọn sẵn nằm ở
             initializer của useState và sẽ không chạy lại nếu chỉ đổi prop. */
          key={ordering}
          grid={grid}
          member={me}
          day={today as DayKey}
          dishes={dishes}
          isAdmin={false}
          meId={meId}
          locked={locked}
          preselect={ordering}
          onClose={() => setOrdering(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
