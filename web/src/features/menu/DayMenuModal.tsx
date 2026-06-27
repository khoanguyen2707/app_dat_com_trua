import { useState } from 'react';
import { api } from '@/services/api';
import type { DayKey, DishCategory, Grid, MenuDiff } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cls } from '@/lib/format';
import { Button, Field, Modal, toast } from '@/components/ui';

/** Ngày hôm nay (mon..sun) để mặc định chọn. */
const todayKey = (): DayKey => (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[])[new Date().getDay()];

type CreateState = { checked: boolean; category: DishCategory; price: number };
const catIcon = (c: DishCategory) => (c === 'DRINK' ? '🥤' : '🍚');

/**
 * Admin dán "thực đơn hôm nay" → phân tích (tất định) → xem trước diff
 * (tạo mới / đã có / ẩn) → áp dụng cho 1 ngày. Món không có hôm nay bị ẩn khỏi picker.
 */
export function DayMenuModal({ grid, onClose, onApplied }: { grid: Grid; onClose: () => void; onApplied: () => Promise<void> }) {
  const [day, setDay] = useState<DayKey>(todayKey());
  const [text, setText] = useState('');
  const [diff, setDiff] = useState<MenuDiff | null>(null);
  const [createState, setCreateState] = useState<Record<string, CreateState>>({});
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);

  const patchCreate = (key: string, patch: Partial<CreateState>) =>
    setCreateState((m) => ({ ...m, [key]: { ...m[key], ...patch } }));

  const analyze = async () => {
    if (!text.trim()) return toast(t.menu.post.emptyText, '✏️');
    setParsing(true);
    try {
      const d = await api.parseMenu(text);
      setDiff(d);
      setCreateState(
        Object.fromEntries(
          d.create.map((i) => [
            i.key,
            { checked: true, category: i.category, price: i.price > 0 ? i.price : i.category === 'MAIN' ? grid.week.unitPrice : 0 },
          ]),
        ),
      );
      setMatched(Object.fromEntries(d.matched.map((i) => [i.dishId as string, true])));
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setParsing(false);
    }
  };

  const createCount = diff ? diff.create.filter((i) => createState[i.key]?.checked).length : 0;
  const sellCount = diff ? createCount + diff.matched.filter((i) => matched[i.dishId as string]).length : 0;

  const apply = async () => {
    if (!diff) return;
    const create = diff.create
      .filter((i) => createState[i.key]?.checked)
      .map((i) => ({ name: i.name, category: createState[i.key].category, price: createState[i.key].price || undefined }));
    const dishIds = diff.matched.filter((i) => matched[i.dishId as string]).map((i) => i.dishId as string);
    if (create.length + dishIds.length === 0) return toast(t.menu.post.nothing, '🍽️');
    setApplying(true);
    try {
      const res = await api.applyDayMenu({ weekId: grid.week.id, day, create, dishIds });
      toast(t.menu.post.applied(res.availableIds.length), '📋');
      await onApplied();
      onClose();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
      setApplying(false);
    }
  };

  return (
    <Modal open wide title={t.menu.post.title} onClose={onClose}>
      <p className="muted small" style={{ marginTop: 0 }}>{t.menu.post.intro}</p>

      <Field label={t.menu.post.dayLabel}>
        <div className="dm-days">
          {DAYS.map((d) => (
            <button key={d.key} className={cls('dm-day', day === d.key && 'on')} onClick={() => setDay(d.key)}>
              <b>{d.label}</b>
              {grid.dates?.[d.key] && <span className="dm-day-date">{grid.dates[d.key]}</span>}
            </button>
          ))}
        </div>
      </Field>

      {!diff ? (
        <>
          <Field label={t.menu.post.textLabel}>
            <textarea
              className="dm-text"
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.menu.post.placeholder}
            />
          </Field>
          <div className="modal-actions">
            <Button onClick={onClose}>{t.actions.cancel}</Button>
            <Button variant="primary" onClick={analyze} loading={parsing}>
              {t.menu.post.analyzeBtn}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="dm-summary">{t.menu.post.summary(createCount, sellCount, diff.hidden.length)}</div>

          {diff.create.length > 0 && (
            <div className="dm-group">
              <div className="dm-group-h">{t.menu.post.groupCreate(diff.create.length)}</div>
              <div className="dm-group-hint">{t.menu.post.groupCreateHint}</div>
              {diff.create.map((i) => {
                const s = createState[i.key];
                if (!s) return null;
                return (
                  <div key={i.key} className={cls('dm-item', !s.checked && 'off')}>
                    <input
                      type="checkbox"
                      className="dm-cb"
                      checked={s.checked}
                      onChange={(e) => patchCreate(i.key, { checked: e.target.checked })}
                    />
                    <div className="dm-item-main">
                      <b>{i.name}</b>
                      {i.maybeSameAs && (
                        <span className="dm-near">
                          {t.menu.post.nearWarn(i.maybeSameAs.name, Math.round(i.maybeSameAs.score * 100))}
                        </span>
                      )}
                    </div>
                    <div className="dm-seg">
                      <button className={cls(s.category === 'MAIN' && 'on')} onClick={() => patchCreate(i.key, { category: 'MAIN' })}>
                        {t.menu.post.catMain}
                      </button>
                      <button className={cls(s.category === 'DRINK' && 'on')} onClick={() => patchCreate(i.key, { category: 'DRINK' })}>
                        {t.menu.post.catDrink}
                      </button>
                    </div>
                    <input
                      className="dm-price"
                      type="number"
                      min={0}
                      step={1000}
                      value={s.price}
                      onChange={(e) => patchCreate(i.key, { price: Number(e.target.value) })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {diff.matched.length > 0 && (
            <div className="dm-group">
              <div className="dm-group-h">{t.menu.post.groupMatched(diff.matched.length)}</div>
              <div className="dm-chips">
                {diff.matched.map((i) => {
                  const id = i.dishId as string;
                  return (
                    <button key={id} className={cls('dm-chip', matched[id] && 'on')} onClick={() => setMatched((m) => ({ ...m, [id]: !m[id] }))}>
                      {catIcon(i.category)} {i.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {diff.hidden.length > 0 && (
            <div className="dm-group">
              <div className="dm-group-h">{t.menu.post.groupHidden(diff.hidden.length)}</div>
              <div className="dm-group-hint">{t.menu.post.groupHiddenHint}</div>
              <div className="dm-chips">
                {diff.hidden.map((d) => (
                  <span key={d.id} className="dm-chip mute">
                    {catIcon(d.category)} {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <Button onClick={() => setDiff(null)}>{t.menu.post.editText}</Button>
            <Button variant="primary" onClick={apply} loading={applying}>
              {t.menu.post.applyBtn}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
