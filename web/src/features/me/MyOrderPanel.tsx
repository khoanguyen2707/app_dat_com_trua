import { useMemo, useState } from 'react';
import { Clock, CupSoda, Lock, Pencil, Plus, StickyNote } from 'lucide-react';
import type { DayKey, Dish, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { vnd } from '@/lib/format';
import { Button, Card, CardBody, CardHeader, EmptyState } from '@/components/ui';
import { DayDetailSheet } from '@/features/grid/DayDetailSheet';

/**
 * Màn đặt cơm của một thành viên.
 *
 * Luật nghiệp vụ là chỉ đặt được cho HÔM NAY và trước giờ chốt, nên hôm nay là
 * nhân vật chính: một thẻ lớn đặt/sửa ngay tại chỗ. Sáu ngày còn lại chỉ để xem
 * lại mình đã ăn gì — thành viên không cần bảng 13 dòng của cả nhóm.
 */
export function MyOrderPanel({
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
  const [editing, setEditing] = useState<DayKey | null>(null);
  const me = grid.members.find((m) => m.userId === meId);
  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const locked = grid.lockedDays ?? ({} as Record<DayKey, boolean>);
  const dates = grid.dates ?? ({} as Record<DayKey, string | null>);
  const today = grid.todayKey ?? null;

  if (!me) return null;

  /** Tên món + số đồ uống của một ngày, để hiện gọn trên thẻ. */
  const summary = (key: DayKey) => {
    const it = me.items?.[key];
    const food = (it?.food ?? []).map((id) => dishMap.get(id)).filter(Boolean);
    const drinks = (it?.drinks ?? []).reduce((a, d) => a + d.qty, 0);
    return { food, drinks };
  };

  const dayCost = (key: DayKey) => {
    const it = me.items?.[key];
    const drinks = (it?.drinks ?? []).reduce((a, d) => {
      const dish = dishMap.get(d.dishId);
      return a + (dish?.category === 'DRINK' ? dish.price * d.qty : 0);
    }, 0);
    return (me.days[key] ? grid.week.unitPrice : 0) + drinks;
  };

  /**
   * Ô trống mang ba nghĩa khác nhau, không thể dùng chung một chữ:
   * ngày đã qua mà bỏ trống là "Không đặt", hôm nay còn hạn là "Chưa đặt",
   * còn ngày mai trở đi thì đơn giản là chưa tới lượt — luật chỉ cho đặt
   * trong ngày nên không ai "không đặt" một ngày chưa đến.
   */
  const todayIndex = today ? DAYS.findIndex((d) => d.key === today) : -1;
  const emptyLabel = (key: DayKey) => {
    const i = DAYS.findIndex((d) => d.key === key);
    if (todayIndex === -1) return t.me.dayEmptyPast;
    if (i > todayIndex) return t.me.dayFuture;
    if (i === todayIndex) return t.me.dayEmptyToday;
    return t.me.dayEmptyPast;
  };

  const restOfWeek = DAYS.filter((d) => d.key !== today);

  return (
    <>
      {today ? (
        <TodayCard
          me={me}
          day={today}
          date={dates[today] ?? ''}
          locked={!!locked[today]}
          cutoff={grid.cutoff?.label}
          cost={dayCost(today)}
          summary={summary(today)}
          note={me.notes?.[today]}
          onEdit={() => setEditing(today)}
        />
      ) : (
        <Card>
          <CardHeader title={t.me.orderTitle} />
          <CardBody>
            <EmptyState icon={<Clock />}>{t.me.notInWeek}</EmptyState>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title={t.me.restOfWeek}
          action={
            <span className="text-[13px] text-ink-3">
              {t.me.weekTotal}: <b className="tnum text-brand">{vnd(me.total)}</b>
            </span>
          }
        />
        <CardBody flush>
          <div className="divide-y divide-line">
            {restOfWeek.map((d) => {
              const { food, drinks } = summary(d.key);
              const note = me.notes?.[d.key];
              const has = me.days[d.key] || drinks > 0;
              return (
                <button
                  key={d.key}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-subtle disabled:hover:bg-transparent"
                  onClick={() => setEditing(d.key)}
                  disabled={!has}
                >
                  <div className="w-24 shrink-0">
                    <div className="text-[13px] font-medium">{d.full}</div>
                    <div className="text-[12px] text-ink-4">{dates[d.key]}</div>
                  </div>
                  <div className="min-w-0 flex-1 text-[13px]">
                    {has ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {food.map((dish) => (
                          <span key={dish!.id} className="rounded-ui bg-brand-soft px-2 py-0.5 text-brand">
                            {dish!.emoji} {dish!.name}
                          </span>
                        ))}
                        {drinks > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-ui bg-drink-soft px-2 py-0.5 text-drink">
                            <CupSoda className="size-3.5" />
                            {t.me.drinkCount(drinks)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-4">{emptyLabel(d.key)}</span>
                    )}
                    {note && (
                      <div className="mt-1 flex items-start gap-1.5 text-[12px] text-ink-3">
                        <StickyNote className="mt-0.5 size-3.5 shrink-0" />
                        {note}
                      </div>
                    )}
                  </div>
                  <div className="tnum shrink-0 text-right text-[13px] font-medium">
                    {has ? vnd(dayCost(d.key)) : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {editing && (
        <DayDetailSheet
          grid={grid}
          member={me}
          day={editing}
          dishes={dishes}
          isAdmin={false}
          meId={meId}
          locked={!!locked[editing]}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}

/** Thẻ hôm nay — nơi duy nhất thành viên thực sự thao tác. */
function TodayCard({
  me,
  day,
  date,
  locked,
  cutoff,
  cost,
  summary,
  note,
  onEdit,
}: {
  me: GridMember;
  day: DayKey;
  date: string;
  locked: boolean;
  cutoff?: string;
  cost: number;
  summary: { food: (Dish | undefined)[]; drinks: number };
  note?: string;
  onEdit: () => void;
}) {
  const dayInfo = DAYS.find((d) => d.key === day);
  const ordered = me.days[day] || summary.drinks > 0;

  return (
    <section
      className={cn(
        'mb-4 rounded-ui-lg border bg-surface p-5 shadow-card',
        locked ? 'border-line' : 'border-brand-line',
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t.me.todayHeading(dayInfo?.full ?? '', date)}</h2>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium',
            locked ? 'bg-subtle text-ink-3' : 'bg-brand-soft text-brand',
          )}
        >
          {locked ? <Lock className="size-3" /> : <Clock className="size-3" />}
          {cutoff && (locked ? t.me.closedToday(cutoff) : t.me.openUntil(cutoff))}
        </span>
      </div>

      <div className="mt-4">
        {ordered ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {summary.food.map((dish) => (
              <span key={dish!.id} className="rounded-ui border border-brand-line bg-brand-soft px-2.5 py-1 text-brand">
                {dish!.emoji} {dish!.name}
              </span>
            ))}
            {summary.drinks > 0 && (
              <span className="inline-flex items-center gap-1 rounded-ui border border-drink-line bg-drink-soft px-2.5 py-1 text-drink">
                <CupSoda className="size-4" />
                {t.me.drinkCount(summary.drinks)}
              </span>
            )}
            <span className="tnum ml-auto text-lg font-semibold">{vnd(cost)}</span>
          </div>
        ) : (
          <p className="text-[13px] text-ink-3">{t.me.orderedNothing}</p>
        )}
        {note && (
          <div className="mt-2.5 flex items-start gap-2 rounded-ui border border-line bg-subtle px-3 py-2 text-[13px]">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-ink-4" />
            {note}
          </div>
        )}
      </div>

      <div className="mt-4">
        <Button variant={ordered || locked ? 'default' : 'primary'} onClick={onEdit}>
          {locked ? (
            t.me.viewCta
          ) : ordered ? (
            <>
              <Pencil className="size-4" />
              {t.me.editCta}
            </>
          ) : (
            <>
              <Plus className="size-4" />
              {t.me.orderCta}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
