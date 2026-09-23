import { useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { DayDetail, DayItems, DayKey, Dish, DrinkItem, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { CupSoda, Download, Lock, Utensils, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { vnd } from '@/lib/format';
import { exportGridCSV } from '@/lib/csv';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Avatar, Button, Card, CardBody, CardHeader, toast } from '@/components/ui';
import { DayDetailSheet } from './DayDetailSheet';
import { GridGuide } from './GridGuide';

/** Tính lại servings + tiền cho TOÀN grid theo đúng công thức backend → cho phép cập nhật lạc quan mà không cần tải lại. */
function recomputeGrid(grid: Grid, dishMap: Map<string, Dish>): Grid {
  const unitPrice = grid.week.unitPrice;
  const drinkCost = (drinks: DrinkItem[]) =>
    drinks.reduce((a, d) => {
      const dish = dishMap.get(d.dishId);
      return a + (dish?.category === 'DRINK' ? dish.price * d.qty : 0);
    }, 0);
  const members = grid.members.map((m) => {
    const servings = DAYS.reduce((a, d) => a + (m.days[d.key] ? 1 : 0), 0);
    const foodTotal = servings * unitPrice;
    const drinksTotal = DAYS.reduce((a, d) => a + drinkCost(m.items?.[d.key]?.drinks ?? []), 0);
    return { ...m, servings, foodTotal, drinksTotal, total: foodTotal + drinksTotal };
  });
  const perDay = Object.fromEntries(
    DAYS.map((d) => [d.key, members.reduce((a, m) => a + (m.days[d.key] ? 1 : 0), 0)]),
  ) as Record<DayKey, number>;
  const totalServings = members.reduce((a, m) => a + m.servings, 0);
  const totalFood = totalServings * unitPrice;
  const totalDrinks = members.reduce((a, m) => a + (m.drinksTotal ?? 0), 0);
  return {
    ...grid,
    members,
    totals: { ...grid.totals, perDay, totalServings, totalFood, totalDrinks, totalMoney: totalFood + totalDrinks },
  };
}

/** Áp 1 thay đổi ngày (eat/food/drinks) của 1 thành viên rồi tính lại tổng → grid mới (optimistic). */
function applyDayLocal(
  grid: Grid,
  dishMap: Map<string, Dish>,
  userId: string,
  key: DayKey,
  detail: DayDetail,
): Grid {
  const members = grid.members.map((m) =>
    m.userId !== userId
      ? m
      : {
          ...m,
          days: { ...m.days, [key]: detail.eat },
          items: {
            ...(m.items ?? ({} as Record<DayKey, DayItems>)),
            [key]: { food: detail.food, drinks: detail.drinks },
          },
        },
  );
  return recomputeGrid({ ...grid, members }, dishMap);
}

export function GridPanel({
  grid,
  dishes,
  isAdmin,
  meId,
  reload,
  readOnly = false,
  onMutate,
}: {
  grid: Grid;
  dishes: Dish[];
  isAdmin: boolean;
  meId: string;
  reload: () => Promise<void>;
  /** Lịch sử: chỉ xem, mọi thao tác sửa bị khoá. */
  readOnly?: boolean;
  /** Cập nhật lạc quan grid ở state cha (đổi ô tức thì, không chờ tải lại). */
  onMutate?: (next: Grid) => void;
}) {
  const { week, members, totals } = grid;
  const locked = grid.lockedDays ?? ({} as Record<DayKey, boolean>);
  const dates = grid.dates ?? ({} as Record<DayKey, string | null>);
  const isMobile = useIsMobile();
  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const [saving, setSaving] = useState(false);
  const [day, setDay] = useState<DayKey>(() => DAYS.find((d) => !locked[d.key])?.key ?? 'mon');
  const [picked, setPicked] = useState<{ m: GridMember; day: DayKey } | null>(null);

  /** Có được sửa ô (member, ngày): tự mình/admin VÀ (admin hoặc ngày chưa khoá). */
  const canEditDay = (m: GridMember, key: DayKey) =>
    !readOnly && (isAdmin || m.userId === meId) && (isAdmin || !locked[key]);

  /**
   * Nút × / nút tick — "dọn một lớp", tôn trọng quy tắc nước độc lập:
   * - Ô có cơm  → bỏ cơm + món, GIỮ nước (còn nước → thành ô chỉ-nước 🥤).
   * - Ô chỉ nước → bỏ nước → ô về trống.
   * Đặt/sửa chi tiết (đặt cơm phải chọn món) luôn qua phiếu.
   */
  const clearCell = async (m: GridMember, key: DayKey) => {
    if (!canEditDay(m, key)) return;
    const cur = m.items?.[key];
    const detail: DayDetail = m.days[key]
      ? { eat: false, food: [], drinks: cur?.drinks ?? [] } // bỏ cơm, giữ nước
      : { eat: false, food: [], drinks: [] }; // chỉ nước → bỏ nước
    onMutate?.(applyDayLocal(grid, dishMap, m.userId, key, detail)); // optimistic: ô đổi tức thì
    setSaving(true);
    try {
      if (m.userId === meId) await api.setMyDay(week.id, key, detail);
      else await api.setUserDay(m.userId, week.id, key, detail);
      if (!onMutate) await reload(); // không có optimistic (vd lịch sử) → giữ hành vi cũ
    } catch (e: any) {
      toast(e.message || t.errors.save, '⚠️');
      await reload(); // lỗi → đồng bộ lại từ server (gỡ optimistic)
    } finally {
      setSaving(false);
    }
  };

  /** Tap ô → mở phiếu chi tiết (đặt cơm + chọn món / thêm nước). Bỏ cơm nhanh bằng nút × trên ô. */
  const onCell = (m: GridMember, key: DayKey) => {
    if (!readOnly || m.days[key] || m.items?.[key]) setPicked({ m, day: key });
  };

  const lockMine = (m: GridMember, key: DayKey) => !isAdmin && m.userId === meId && locked[key];
  const hasDrink = (m: GridMember, key: DayKey) => (m.items?.[key]?.drinks.length ?? 0) > 0;
  /** Ô có "thứ gì đó" để dọn (cơm hoặc nước) → hiện nút × / cho phép tick dọn nhanh. */
  const hasAny = (m: GridMember, key: DayKey) => m.days[key] || hasDrink(m, key);

  /** Dấu trong ô: cơm · chỉ nước · khoá (ô trống của mình) · trống. */
  const cellMark = (m: GridMember, key: DayKey) => {
    if (m.days[key]) return <Utensils className="size-4" />;
    if (hasDrink(m, key)) return <CupSoda className="size-4" />;
    if (lockMine(m, key)) return <Lock className="size-3 text-ink-4" />;
    return null;
  };
  const cellClass = (m: GridMember, key: DayKey) => {
    const com = m.days[key];
    const drinkOnly = !com && hasDrink(m, key);
    const interactive = canEditDay(m, key) || (!readOnly && (com || m.items?.[key]));
    return cn(
      'group/cell relative mx-auto grid h-8 w-11 place-items-center rounded-ui border transition-colors',
      com
        ? 'border-brand-line bg-brand-soft text-brand'
        : drinkOnly
          ? 'border-info-line bg-info-soft text-info'
          : 'border-line bg-surface',
      interactive ? 'cursor-pointer hover:border-line-strong hover:bg-subtle' : 'cursor-default',
      com && interactive && 'hover:bg-brand-soft',
    );
  };

  /** Tóm tắt món/nước của 1 ngày (cho mobile row): "🐟 🍳  ·  🥤×2" */
  const summary = (m: GridMember, key: DayKey) => {
    const it = m.items?.[key];
    if (!it) return '';
    const foodEmojis = it.food.map((id) => dishMap.get(id)?.emoji).filter(Boolean).join(' ');
    const drinkN = it.drinks.reduce((a, d) => a + d.qty, 0);
    return [foodEmojis, drinkN > 0 ? `🥤×${drinkN}` : ''].filter(Boolean).join('  ·  ');
  };

  return (
    <Card>
      <CardHeader
        title={t.grid.title}
        action={
          !readOnly && (
            <GridGuide
              items={[
                t.grid.guide.order(vnd(week.unitPrice)),
                t.grid.guide.detail(isMobile ? t.grid.guide.whereMobile : t.grid.guide.whereDesktop),
                ...(grid.cutoff ? [t.grid.guide.today(grid.cutoff.label)] : []),
                t.grid.guide.cancel,
                t.grid.guide.colors,
                isAdmin ? t.grid.guide.admin : t.grid.guide.member,
              ]}
            />
          )
        }
      />

      {isMobile ? (
        /* ===== MOBILE: chọn ngày → danh sách thành viên ===== */
        <CardBody>
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-2">
            {DAYS.map((d) => (
              <button
                key={d.key}
                className={cn(
                  'flex min-w-14 flex-1 flex-col items-center gap-0.5 rounded-ui border px-2 py-1.5 transition-colors',
                  day === d.key ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-2',
                )}
                onClick={() => setDay(d.key)}
              >
                <span className="text-[13px] font-medium">{d.label}</span>
                {dates[d.key] && <span className="text-[11px] text-ink-4">{dates[d.key]}</span>}
                {locked[d.key] && <Lock className="size-3 text-ink-4" />}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <b className="text-sm">
              {DAYS.find((d) => d.key === day)?.full}
              {dates[day] ? ` • ${dates[day]}` : ''}
            </b>
            <span className="text-[13px] text-ink-3">{t.grid.eatingDay(totals.perDay[day])}</span>
          </div>

          <div className="mt-2 divide-y divide-line rounded-ui-md border border-line">
            {members.map((m) => {
              const on = m.days[day];
              const sub = summary(m, day);
              return (
                <div
                  key={m.userId}
                  className={cn('flex items-center gap-2.5 px-3 py-2', m.userId === meId && 'bg-brand-soft/40')}
                >
                  <Avatar name={m.fullName} color={m.color} size={32} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setPicked({ m, day })}>
                    <span className="block truncate text-sm font-medium">{m.fullName}</span>
                    {sub && <span className="block truncate text-[12px] text-ink-3">{sub}</span>}
                  </button>
                  <button
                    className={cn(
                      'relative grid size-9 shrink-0 place-items-center rounded-ui border transition-colors',
                      on
                        ? 'border-brand-line bg-brand-soft text-brand'
                        : hasDrink(m, day)
                          ? 'border-info-line bg-info-soft text-info'
                          : 'border-line bg-surface',
                      !canEditDay(m, day) && 'opacity-60',
                    )}
                    onClick={() =>
                      canEditDay(m, day) && hasAny(m, day) ? clearCell(m, day) : setPicked({ m, day })
                    }
                  >
                    {cellMark(m, day)}
                    {on && hasDrink(m, day) && <CupSoda className="absolute -bottom-0.5 -left-0.5 size-3 text-info" />}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="text-ink-3">{saving ? t.actions.saving : t.grid.autoSave}</span>
            <b>{t.grid.dayTotal(totals.perDay[day])}</b>
          </div>
        </CardBody>
      ) : (
        /* ===== DESKTOP: bảng đầy đủ ===== */
        <CardBody flush>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left text-[12px] font-medium uppercase tracking-wide text-ink-4">
                    {t.grid.colMember}
                  </th>
                  {DAYS.map((d) => (
                    <th key={d.key} className="px-1 py-2 text-center font-medium">
                      <div className={cn('text-[13px]', locked[d.key] ? 'text-ink-4' : 'text-ink')}>{d.label}</div>
                      <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-ink-4">
                        {dates[d.key]}
                        {locked[d.key] && <Lock className="size-3" />}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right text-[12px] font-medium uppercase tracking-wide text-ink-4">
                    {t.grid.colServings}
                  </th>
                  <th className="px-4 py-2.5 text-right text-[12px] font-medium uppercase tracking-wide text-ink-4">
                    {t.grid.colMoney}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.userId}
                    className={cn('border-b border-line last:border-0 hover:bg-subtle/60', m.userId === meId && 'bg-brand-soft/40')}
                  >
                    <td className={cn('sticky left-0 z-10 px-4 py-1.5', m.userId === meId ? 'bg-brand-soft/40' : 'bg-surface')}>
                      <div className="flex items-center gap-2">
                        <Avatar name={m.fullName} color={m.color} size={26} />
                        <span className={cn('whitespace-nowrap', m.userId === meId && 'font-medium')}>{m.fullName}</span>
                      </div>
                    </td>
                    {DAYS.map((d) => (
                      <td key={d.key} className="px-1 py-1.5">
                        <div className={cellClass(m, d.key)} onClick={() => onCell(m, d.key)}>
                          {cellMark(m, d.key)}
                          {m.days[d.key] && hasDrink(m, d.key) && (
                            <CupSoda className="absolute -bottom-0.5 -left-0.5 size-3 text-info" />
                          )}
                          {hasAny(m, d.key) && canEditDay(m, d.key) && (
                            <button
                              className="absolute -right-1.5 -top-1.5 hidden size-4 place-items-center rounded-full border border-line bg-surface text-ink-3 hover:border-danger-line hover:text-danger group-hover/cell:grid"
                              title={m.days[d.key] ? t.grid.clearRice : t.grid.clearDrink}
                              onClick={(e) => {
                                e.stopPropagation();
                                clearCell(m, d.key);
                              }}
                            >
                              <X className="size-2.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="tnum px-3 py-1.5 text-right text-ink-2">{m.servings}</td>
                    <td className="tnum px-4 py-1.5 text-right font-medium">{vnd(m.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong bg-subtle font-semibold">
                  <td className="sticky left-0 z-10 bg-subtle px-4 py-2.5 text-[12px] uppercase tracking-wide text-ink-3">
                    {t.grid.totalRow}
                  </td>
                  {DAYS.map((d) => (
                    <td key={d.key} className="tnum px-1 py-2.5 text-center">
                      {totals.perDay[d.key]}
                    </td>
                  ))}
                  <td className="tnum px-3 py-2.5 text-right">{totals.totalServings}</td>
                  <td className="tnum px-4 py-2.5 text-right text-brand">{vnd(totals.totalMoney)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      )}

      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <span className="text-[13px] text-ink-3">{saving ? t.actions.saving : t.grid.autoSave}</span>
        <Button
          tiny
          onClick={() => {
            exportGridCSV(grid, dishes);
            toast(t.grid.exported, '📊');
          }}
        >
          <Download className="size-3.5" />
          {t.grid.exportBtn}
        </Button>
      </div>

      {picked && (
        <DayDetailSheet
          grid={grid}
          member={picked.m}
          day={picked.day}
          dishes={dishes}
          isAdmin={isAdmin && !readOnly}
          meId={meId}
          locked={readOnly || !!locked[picked.day]}
          onClose={() => setPicked(null)}
          onSaved={reload}
        />
      )}
    </Card>
  );
}
