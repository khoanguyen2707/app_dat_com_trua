import { useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { DayKey, Dish, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { Check, Lock, Minus, Plus } from 'lucide-react';

/** Khớp với MaxLength của DTO phía server. */
const NOTE_MAX = 200;
import { cn } from '@/lib/cn';
import { vnd } from '@/lib/format';
import { groupByEmoji } from '@/lib/dishGroup';
import { Avatar, Button, IconButton, toast } from '@/components/ui';
import { DetailShell } from './DetailShell';

export function DayDetailSheet({
  grid,
  member,
  day,
  dishes,
  isAdmin,
  meId,
  locked,
  anchor = null,
  onClose,
  onSaved,
}: {
  grid: Grid;
  member: GridMember;
  day: DayKey;
  dishes: Dish[];
  isAdmin: boolean;
  meId: string;
  locked: boolean;
  /** Ô đã bấm trong bảng tuần (desktop) → mở popover neo vào ô thay vì hộp thoại. */
  anchor?: DOMRect | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editable = isAdmin || (member.userId === meId && !locked);
  const dayInfo = DAYS.find((d) => d.key === day);
  const date = grid.dates?.[day];

  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const priceOf = (id: string) => dishMap.get(id)?.price ?? 0;

  const current = member.items?.[day];
  const [eat, setEat] = useState(member.days[day]);
  const [food, setFood] = useState<string[]>(current?.food ?? []);
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries((current?.drinks ?? []).map((d) => [d.dishId, d.qty])),
  );
  const [note, setNote] = useState(member.notes?.[day] ?? '');
  const [saving, setSaving] = useState(false);

  // Lọc theo thực đơn ngày: ngày nào admin đã đăng menu thì chỉ hiện món đó
  // (vẫn giữ món đang được chọn để user còn thấy & bỏ ra được).
  const allowedSet = useMemo(() => {
    const list = grid.week.dayMenu?.[day];
    return list && list.length ? new Set(list) : null; // null = không giới hạn
  }, [grid.week.dayMenu, day]);
  const mains = useMemo(
    () => dishes.filter((d) => d.category === 'MAIN' && (!allowedSet || allowedSet.has(d.id) || food.includes(d.id))),
    [dishes, allowedSet, food],
  );
  const drinks = useMemo(
    () => dishes.filter((d) => d.category === 'DRINK' && (!allowedSet || allowedSet.has(d.id) || (qty[d.id] ?? 0) > 0)),
    [dishes, allowedSet, qty],
  );

  const chosenDrinks = Object.entries(qty).filter(([, n]) => n > 0);
  /** Quy tắc: đặt cơm thì bắt buộc chọn ít nhất 1 món → chặn Lưu nếu thiếu. */
  const needFood = eat && food.length === 0;

  const toggleFood = (id: string) => {
    if (!editable || !eat) return;
    setFood((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };
  const bump = (id: string, delta: number) =>
    setQty((q) => {
      const next = Math.max(0, (q[id] ?? 0) + delta);
      const copy = { ...q };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const riceCost = eat ? grid.week.unitPrice : 0;
  const drinksCost = chosenDrinks.reduce((a, [id, n]) => a + priceOf(id) * n, 0);

  const save = async () => {
    if (needFood) return;
    setSaving(true);
    try {
      const detail = {
        eat,
        food: eat ? food : [],
        drinks: chosenDrinks.map(([dishId, n]) => ({ dishId, qty: n })),
        note: note.trim(),
      };
      if (member.userId === meId) await api.setMyDay(grid.week.id, day, detail);
      else await api.setUserDay(member.userId, grid.week.id, day, detail);
      await onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message || t.errors.save, '⚠️');
      setSaving(false);
    }
  };

  return (
    <DetailShell
      anchor={anchor}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Avatar name={member.fullName} color={member.color} size={26} />
          {member.fullName}
        </span>
      }
    >
      <div className="text-[13px] text-ink-3">
        <b className="text-ink">{dayInfo?.full}</b>
        {date && <span> • {date}</span>}
      </div>

      {!editable && (
        <div className="mt-3 flex items-center gap-2 rounded-ui border border-brand-line bg-brand-soft px-3 py-2 text-[13px] text-brand">
          <Lock className="size-3.5 shrink-0" />
          {t.grid.detail.lockedView}
        </div>
      )}

      {/* Ăn cơm */}
      <button
        className={cn(
          'mt-3 flex w-full items-center gap-3 rounded-ui-md border px-3 py-2.5 text-left transition-colors',
          eat ? 'border-brand bg-brand-soft' : 'border-line bg-surface',
          editable ? 'hover:border-line-strong' : 'cursor-default',
        )}
        onClick={() => editable && setEat((v) => !v)}
      >
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded border',
            eat ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface',
          )}
        >
          {eat && <Check className="size-3.5" />}
        </span>
        <span className="flex flex-col">
          <b className="text-sm">{t.grid.detail.eat}</b>
          <span className="text-[12px] text-ink-3">{t.grid.detail.eatPrice(vnd(grid.week.unitPrice))}</span>
        </span>
      </button>

      {editable && allowedSet && <div className="mt-2 text-[12px] text-ink-4">{t.grid.detail.todayMenuOnly}</div>}

      {/* Món ăn */}
      <div className="mt-4 mb-1.5 text-[13px] font-semibold text-ink-2">
        {t.grid.detail.foodSection}
      </div>
      {!editable ? (
        food.length ? (
          <div className="flex flex-wrap gap-1.5">
            {food.map((id) => (
              <span
                key={id}
                className="rounded-ui border border-brand-line bg-brand-soft px-2 py-1 text-[13px] text-brand"
              >
                {dishMap.get(id)?.emoji} {dishMap.get(id)?.name ?? id}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-ink-3">{t.grid.detail.noFood}</div>
        )
      ) : eat ? (
        <>
          {needFood && (
            <div className="mb-2 rounded-ui border border-warn-line bg-warn-soft px-3 py-2 text-[13px] text-warn">
              {t.grid.detail.needFood}
            </div>
          )}
          {groupByEmoji(mains).map((g) => (
            <div className="mb-2 flex items-start gap-2" key={g.emoji}>
              <span className="grid size-7 shrink-0 place-items-center rounded-ui border border-line bg-subtle">
                {g.emoji}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {g.dishes.map((d) => (
                  <button
                    key={d.id}
                    className={cn(
                      'rounded-ui border px-2 py-1 text-[13px] transition-colors',
                      food.includes(d.id)
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-line bg-surface hover:border-line-strong',
                    )}
                    onClick={() => toggleFood(d.id)}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="text-[13px] text-ink-3">{t.grid.detail.foodEnableHint}</div>
      )}

      {/* Đồ uống */}
      <div className="mt-4 mb-1.5 text-[13px] font-semibold text-ink-2">
        {t.grid.detail.drinkSection}
      </div>
      {!editable ? (
        chosenDrinks.length ? (
          <div className="flex flex-col gap-1.5">
            {chosenDrinks.map(([id, n]) => (
              <div key={id} className="flex items-center gap-2 rounded-ui border border-drink-line bg-drink-soft px-2.5 py-1.5">
                <span>{dishMap.get(id)?.emoji}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-[13px]">{dishMap.get(id)?.name ?? id}</b>
                  <span className="tnum text-[12px] text-ink-3">{vnd(priceOf(id))}</span>
                </span>
                <span className="tnum text-[13px] font-medium">×{n}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-ink-3">{t.grid.detail.noDrink}</div>
        )
      ) : (
        <div className="flex flex-col gap-1.5">
          {drinks.map((d) => {
            const n = qty[d.id] ?? 0;
            return (
              <div
                key={d.id}
                className={cn(
                  'flex items-center gap-2 rounded-ui border px-2.5 py-1.5',
                  n > 0 ? 'border-drink-line bg-drink-soft' : 'border-line bg-surface',
                )}
              >
                <span>{d.emoji}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-[13px]">{d.name}</b>
                  <span className="tnum text-[12px] text-ink-3">{vnd(d.price)}</span>
                </span>
                <div className="flex items-center gap-1">
                  <IconButton className="size-7" disabled={n === 0} onClick={() => bump(d.id, -1)} aria-label="−">
                    <Minus className="size-3.5" />
                  </IconButton>
                  <span className="tnum w-5 text-center text-[13px] font-medium">{n}</span>
                  <IconButton className="size-7" onClick={() => bump(d.id, 1)} aria-label="+">
                    <Plus className="size-3.5" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ghi chú cho người đi mua */}
      <div className="mt-4 mb-1.5 text-[13px] font-semibold text-ink-2">{t.grid.detail.noteSection}</div>
      {editable ? (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX}
            rows={2}
            placeholder={t.grid.detail.notePlaceholder}
            className="w-full resize-y rounded-ui border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <div className="mt-1 flex items-center justify-between text-[12px] text-ink-4">
            <span>{t.grid.detail.noteHint}</span>
            <span className="tnum">
              {note.length}/{NOTE_MAX}
            </span>
          </div>
        </>
      ) : note ? (
        <div className="rounded-ui border border-line bg-subtle px-3 py-2 text-[13px]">{note}</div>
      ) : (
        <div className="text-[13px] text-ink-3">{t.grid.detail.noteEmpty}</div>
      )}

      {/* Tổng minh bạch */}
      <div className="mt-4 rounded-ui-md border border-line bg-subtle px-3 py-2 text-[13px]">
        <div className="flex justify-between py-0.5">
          <span className="text-ink-3">{t.grid.detail.riceLabel}</span>
          <span className="tnum">{vnd(riceCost)}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-ink-3">{t.grid.detail.drinkLabel}</span>
          <span className="tnum">{vnd(drinksCost)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-line pt-1.5 font-semibold">
          <span>{t.grid.detail.totalLabel}</span>
          <span className="tnum text-brand">{vnd(riceCost + drinksCost)}</span>
        </div>
      </div>

      {editable && (
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={needFood}>
            {t.actions.save}
          </Button>
        </div>
      )}
    </DetailShell>
  );
}
