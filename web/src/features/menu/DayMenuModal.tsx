import { useState } from 'react';
import { api } from '@/services/api';
import type { DayKey, DishCategory, Grid, MenuDiff } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { Button, Field, Modal, toast } from '@/components/ui';

/** Ngày hôm nay (mon..sun) để mặc định chọn. */
const todayKey = (): DayKey => (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as DayKey[])[new Date().getDay()];

/**
 * Quyết định cho một món mới.
 *
 * `undecided` chỉ dành cho món **nghi trùng** với món đã có. Trước đây mọi món mới
 * đều mặc định tick tạo, nên gõ sai một ký tự là danh mục có thêm một món rác nằm
 * lại vĩnh viễn. Giờ chỗ mập mờ bắt buộc admin chọn, và không áp dụng được cho tới
 * khi chọn xong.
 */
type Decision = 'undecided' | 'create' | 'reuse' | 'skip';
type CreateState = { decision: Decision; category: DishCategory; price: number };
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
  const [notify, setNotify] = useState(true);

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
            {
              // nghi trùng -> chưa quyết; món mới rõ ràng -> tạo luôn như cũ
              decision: i.maybeSameAs ? ('undecided' as Decision) : ('create' as Decision),
              category: i.category,
              price: i.price > 0 ? i.price : i.category === 'MAIN' ? grid.week.unitPrice : 0,
            },
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

  const createCount = diff ? diff.create.filter((i) => createState[i.key]?.decision === 'create').length : 0;
  /** Món nghi trùng mà admin chọn "dùng món có sẵn" → bán món cũ, không tạo thêm. */
  const reuseIds = diff
    ? diff.create
        .filter((i) => createState[i.key]?.decision === 'reuse' && i.maybeSameAs)
        .map((i) => i.maybeSameAs!.id)
    : [];
  const undecided = diff ? diff.create.filter((i) => createState[i.key]?.decision === 'undecided').length : 0;
  const sellCount = diff
    ? createCount + reuseIds.length + diff.matched.filter((i) => matched[i.dishId as string]).length
    : 0;

  const apply = async () => {
    if (!diff) return;
    const create = diff.create
      .filter((i) => createState[i.key]?.decision === 'create')
      .map((i) => ({ name: i.name, category: createState[i.key].category, price: createState[i.key].price || undefined }));
    // gộp món bán hôm nay: món cũ đã khớp + món cũ được chọn thay cho bản nghi trùng
    const dishIds = [
      ...diff.matched.filter((i) => matched[i.dishId as string]).map((i) => i.dishId as string),
      ...reuseIds,
    ];
    if (create.length + dishIds.length === 0) return toast(t.menu.post.nothing, '🍽️');
    setApplying(true);
    try {
      const res = await api.applyDayMenu({ weekId: grid.week.id, day, create, dishIds, notify });
      toast(t.menu.post.applied(res.availableIds.length), '📋');
      // Bước cuối: webhook Power Automate. Lỗi webhook không chặn việc đăng — chỉ báo cho admin biết.
      if (res.webhook.status === 'sent') toast(t.menu.post.notifySent, '📣');
      else if (res.webhook.status === 'failed') toast(t.menu.post.notifyFailed(res.webhook.error ?? ''), '⚠️');
      await onApplied();
      onClose();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
      setApplying(false);
    }
  };

  return (
    <Modal open wide title={t.menu.post.title} onClose={onClose}>
      <p className="mt-0 text-[13px] text-ink-3">{t.menu.post.intro}</p>

      <Field label={t.menu.post.dayLabel}>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.key}
              className={cn(
                'flex min-w-14 flex-col items-center rounded-ui border px-2.5 py-1.5 transition-colors',
                day === d.key ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:border-line-strong',
              )}
              onClick={() => setDay(d.key)}
            >
              <b className="text-[13px]">{d.label}</b>
              {grid.dates?.[d.key] && <span className="text-[11px] text-ink-4">{grid.dates[d.key]}</span>}
            </button>
          ))}
        </div>
      </Field>

      {!diff ? (
        <>
          <Field label={t.menu.post.textLabel}>
            <textarea
              className="min-h-40 resize-y py-2 font-mono text-[13px] leading-relaxed"
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.menu.post.placeholder}
            />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={onClose}>{t.actions.cancel}</Button>
            <Button variant="primary" onClick={analyze} loading={parsing}>
              {t.menu.post.analyzeBtn}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-ui border border-line bg-subtle px-3 py-2 text-[13px]">
            {t.menu.post.summary(createCount, sellCount, diff.hidden.length)}
          </div>
          {undecided > 0 && (
            <div className="mt-2 rounded-ui border border-warn-line bg-warn-soft px-3 py-2 text-[13px] text-warn">
              {t.menu.post.undecided(undecided)}
            </div>
          )}

          {diff.create.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[13px] font-semibold">{t.menu.post.groupCreate(diff.create.length)}</div>
              <div className="mb-2 text-[12px] text-ink-3">{t.menu.post.groupCreateHint}</div>
              {diff.create.map((i) => {
                const s = createState[i.key];
                if (!s) return null;
                return (
                  <div
                    key={i.key}
                    className={cn(
                      'mb-1.5 flex flex-wrap items-center gap-2 rounded-ui border px-2.5 py-2',
                      s.decision === 'undecided'
                        ? 'border-warn-line bg-warn-soft'
                        : s.decision === 'create'
                          ? 'border-line'
                          : 'border-line opacity-60',
                    )}
                  >
                    <div className="flex min-w-40 flex-1 flex-col">
                      <b className="text-[13px]">{i.name}</b>
                      {i.maybeSameAs && (
                        <span className="text-[12px] text-warn">
                          {t.menu.post.nearWarn(i.maybeSameAs.name, Math.round(i.maybeSameAs.score * 100))}
                        </span>
                      )}
                    </div>

                    {/* Nghi trùng: bắt chọn rõ ràng. Không có mặc định nào an toàn ở đây —
                        tạo bừa thì danh mục rác, gộp bừa thì hôm nay ăn nhầm món. */}
                    {i.maybeSameAs ? (
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        <Button
                          tiny
                          variant={s.decision === 'reuse' ? 'primary' : 'default'}
                          onClick={() => patchCreate(i.key, { decision: 'reuse' })}
                        >
                          {t.menu.post.useExisting(i.maybeSameAs.name)}
                        </Button>
                        <Button
                          tiny
                          variant={s.decision === 'create' ? 'primary' : 'default'}
                          onClick={() => patchCreate(i.key, { decision: 'create' })}
                        >
                          {t.menu.post.createAnyway}
                        </Button>
                        <Button
                          tiny
                          variant={s.decision === 'skip' ? 'primary' : 'default'}
                          onClick={() => patchCreate(i.key, { decision: 'skip' })}
                        >
                          {t.menu.post.skipItem}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        tiny
                        variant={s.decision === 'create' ? 'primary' : 'default'}
                        onClick={() => patchCreate(i.key, { decision: s.decision === 'create' ? 'skip' : 'create' })}
                      >
                        {s.decision === 'create' ? t.menu.post.willCreate : t.menu.post.skipItem}
                      </Button>
                    )}

                    {s.decision === 'create' && (
                      <>
                        <div className="flex shrink-0 gap-0.5 rounded-ui border border-line bg-subtle p-0.5">
                          {(['MAIN', 'DRINK'] as const).map((c) => (
                            <button
                              key={c}
                              className={cn(
                                'rounded-[4px] px-2 py-1 text-[12px] font-medium transition-colors',
                                s.category === c ? 'bg-surface text-ink' : 'text-ink-3',
                              )}
                              onClick={() => patchCreate(i.key, { category: c })}
                            >
                              {c === 'MAIN' ? t.menu.post.catMain : t.menu.post.catDrink}
                            </button>
                          ))}
                        </div>
                        <input
                          className="tnum h-8 w-24 shrink-0 rounded-ui border border-line px-2 text-[13px] outline-none focus:border-brand"
                          type="number"
                          min={0}
                          step={1000}
                          value={s.price}
                          onChange={(e) => patchCreate(i.key, { price: Number(e.target.value) })}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {diff.matched.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[13px] font-semibold">{t.menu.post.groupMatched(diff.matched.length)}</div>
              <div className="flex flex-wrap gap-1.5">
                {diff.matched.map((i) => {
                  const id = i.dishId as string;
                  return (
                    <button
                      key={id}
                      className={cn(
                        'rounded-ui border px-2 py-1 text-[13px] transition-colors',
                        matched[id] ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-3',
                      )}
                      onClick={() => setMatched((m) => ({ ...m, [id]: !m[id] }))}
                    >
                      {catIcon(i.category)} {i.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {diff.hidden.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[13px] font-semibold">{t.menu.post.groupHidden(diff.hidden.length)}</div>
              <div className="mb-2 text-[12px] text-ink-3">{t.menu.post.groupHiddenHint}</div>
              <div className="flex flex-wrap gap-1.5">
                {diff.hidden.map((d) => (
                  <span key={d.id} className="rounded-ui border border-line bg-subtle px-2 py-1 text-[13px] text-ink-4 line-through">
                    {catIcon(d.category)} {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-ui border border-line px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            <span className="flex flex-col">
              <b className="text-[13px] font-medium">{t.menu.post.notifyLabel}</b>
              <span className="text-[12px] text-ink-3">{t.menu.post.notifyHint}</span>
            </span>
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setDiff(null)}>{t.menu.post.editText}</Button>
            <Button variant="primary" onClick={apply} loading={applying} disabled={undecided > 0}>
              {t.menu.post.applyBtn}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
