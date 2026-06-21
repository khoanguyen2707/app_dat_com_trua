import { useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { DayKey, Dish, Grid, GridMember } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cls, vnd } from '@/lib/format';
import { Avatar, Button, Modal, toast } from '@/components/ui';

export function DayDetailSheet({
  grid,
  member,
  day,
  dishes,
  isAdmin,
  meId,
  locked,
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
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const editable = isAdmin || (member.userId === meId && !locked);
  const dayInfo = DAYS.find((d) => d.key === day);
  const date = grid.dates?.[day];

  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const mains = useMemo(() => dishes.filter((d) => d.category === 'MAIN'), [dishes]);
  const drinks = useMemo(() => dishes.filter((d) => d.category === 'DRINK'), [dishes]);
  const priceOf = (id: string) => dishMap.get(id)?.price ?? 0;

  const current = member.items?.[day];
  const [eat, setEat] = useState(member.days[day]);
  const [food, setFood] = useState<string[]>(current?.food ?? []);
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries((current?.drinks ?? []).map((d) => [d.dishId, d.qty])),
  );
  const [saving, setSaving] = useState(false);

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
    <Modal
      open
      onClose={onClose}
      title={
        <span className="row" style={{ gap: 9 }}>
          <Avatar name={member.fullName} color={member.color} size={28} />
          {member.fullName}
        </span>
      }
    >
      <div className="dd-day">
        <b>{dayInfo?.full}</b>
        {date && <span className="muted"> • {date}</span>}
      </div>

      {!editable && <div className="hint lock" style={{ marginTop: 12 }}>{t.grid.detail.lockedView}</div>}

      {/* Ăn cơm */}
      <button className={cls('dd-eat', eat && 'on', !editable && 'ro')} onClick={() => editable && setEat((v) => !v)}>
        <span className="dd-eat-tick">{eat ? '✓' : ''}</span>
        <span className="dd-eat-lbl">
          <b>{t.grid.detail.eat}</b>
          <span className="small muted">{t.grid.detail.eatPrice(vnd(grid.week.unitPrice))}</span>
        </span>
      </button>

      {/* Món ăn */}
      <div className="dd-sec">{t.grid.detail.foodSection}</div>
      {!editable ? (
        food.length ? (
          <div className="dd-chips">
            {food.map((id) => (
              <span key={id} className="dd-chip on ro">
                {dishMap.get(id)?.emoji} {dishMap.get(id)?.name ?? id}
              </span>
            ))}
          </div>
        ) : (
          <div className="small muted">{t.grid.detail.noFood}</div>
        )
      ) : eat ? (
        <>
          {needFood && <div className="dd-foodwarn">{t.grid.detail.needFood}</div>}
          <div className="dd-chips">
            {mains.map((d) => (
              <button
                key={d.id}
                className={cls('dd-chip', food.includes(d.id) && 'on')}
                onClick={() => toggleFood(d.id)}
              >
                <span>{d.emoji}</span> {d.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="small muted">{t.grid.detail.foodEnableHint}</div>
      )}

      {/* Đồ uống */}
      <div className="dd-sec">{t.grid.detail.drinkSection}</div>
      {!editable ? (
        chosenDrinks.length ? (
          <div className="dd-drinks">
            {chosenDrinks.map(([id, n]) => (
              <div key={id} className="dd-drink on">
                <span className="dd-drink-ic">{dishMap.get(id)?.emoji}</span>
                <span className="dd-drink-nm">
                  <b>{dishMap.get(id)?.name ?? id}</b>
                  <span className="small muted">{vnd(priceOf(id))}</span>
                </span>
                <span className="dd-step-n">×{n}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="small muted">{t.grid.detail.noDrink}</div>
        )
      ) : (
        <div className="dd-drinks">
          {drinks.map((d) => {
            const n = qty[d.id] ?? 0;
            return (
              <div key={d.id} className={cls('dd-drink', n > 0 && 'on')}>
                <span className="dd-drink-ic">{d.emoji}</span>
                <span className="dd-drink-nm">
                  <b>{d.name}</b>
                  <span className="small muted">{vnd(d.price)}</span>
                </span>
                <div className="dd-step">
                  <button disabled={n === 0} onClick={() => bump(d.id, -1)}>
                    −
                  </button>
                  <span className="dd-step-n">{n}</span>
                  <button onClick={() => bump(d.id, 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tổng minh bạch */}
      <div className="dd-total">
        <div className="dd-total-row">
          <span>{t.grid.detail.riceLabel}</span>
          <span>{vnd(riceCost)}</span>
        </div>
        <div className="dd-total-row">
          <span>{t.grid.detail.drinkLabel}</span>
          <span>{vnd(drinksCost)}</span>
        </div>
        <div className="dd-total-row sum">
          <span>{t.grid.detail.totalLabel}</span>
          <span>{vnd(riceCost + drinksCost)}</span>
        </div>
      </div>

      {editable && (
        <div className="modal-actions">
          <Button onClick={onClose}>{t.actions.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={saving || needFood}>
            {saving ? t.actions.saving : t.actions.save}
          </Button>
        </div>
      )}
    </Modal>
  );
}
