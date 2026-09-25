import { useEffect, useState } from 'react';
import { CopyCheck } from 'lucide-react';
import { api } from '@/services/api';
import type { DishDuplicateGroup } from '@/types';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { Button, confirmDialog, EmptyState, Modal, Spinner, toast } from '@/components/ui';

/** Lựa chọn của admin cho 1 cụm: món giữ lại + tên (sửa chính tả được). */
type Choice = { keepId: string; name: string };

/**
 * Dọn món trùng trong danh mục: mỗi cụm món gần giống nhau → chọn tên đúng rồi Gộp
 * (suất đã đặt + thực đơn chuyển sang món giữ lại), hoặc xác nhận là các món khác nhau.
 */
export function DuplicatesModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => Promise<void> }) {
  const [groups, setGroups] = useState<DishDuplicateGroup[] | null>(null);
  const [choice, setChoice] = useState<Record<number, Choice>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    try {
      const g = await api.dishDuplicates();
      setGroups(g);
      // món được đặt nhiều nhất (server đã xếp đầu) là ứng viên giữ lại mặc định
      setChoice(Object.fromEntries(g.map((x, i) => [i, { keepId: x.dishes[0].id, name: x.dishes[0].name }])));
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
      setGroups([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const merge = async (gi: number) => {
    const g = groups![gi];
    const c = choice[gi];
    const others = g.dishes.filter((d) => d.id !== c.keepId);
    const ok = await confirmDialog({
      title: t.menu.dedupe.confirmTitle,
      message: t.menu.dedupe.confirmBody(
        others.map((d) => `"${d.name}"`).join(', '),
        c.name.trim() || g.dishes.find((d) => d.id === c.keepId)!.name,
        others.reduce((a, d) => a + d.orderCount, 0),
      ),
      confirmLabel: t.menu.dedupe.mergeBtn(others.length),
      danger: true,
    });
    if (!ok) return;
    setBusy(gi);
    try {
      const res = await api.mergeDishes(
        c.keepId,
        others.map((d) => d.id),
        c.name.trim() || undefined,
      );
      toast(t.menu.dedupe.merged(res.merged, res.movedItems), '🧹');
      await Promise.all([load(), onChanged()]);
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(null);
    }
  };

  const distinct = async (gi: number) => {
    setBusy(gi);
    try {
      await api.markDishesDistinct(groups![gi].dishes.map((d) => d.id));
      toast(t.menu.dedupe.markedDistinct, '✅');
      await load();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open wide title={t.menu.dedupe.title} onClose={onClose}>
      <p className="mt-0 text-[13px] text-ink-3">{t.menu.dedupe.intro}</p>

      {!groups ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <EmptyState icon={<CopyCheck />}>{t.menu.dedupe.empty}</EmptyState>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((g, gi) => {
            const c = choice[gi];
            if (!c) return null;
            return (
              <div key={g.dishes.map((d) => d.id).join('|')} className="rounded-ui border border-warn-line px-3 py-2.5">
                <div className="space-y-1">
                  {g.dishes.map((d) => (
                    <label
                      key={d.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-ui px-2 py-1.5 text-[13px]',
                        c.keepId === d.id ? 'bg-brand-soft/60' : 'hover:bg-subtle',
                      )}
                    >
                      <input
                        type="radio"
                        className="size-4 accent-[var(--color-brand)]"
                        checked={c.keepId === d.id}
                        onChange={() => setChoice((m) => ({ ...m, [gi]: { keepId: d.id, name: d.name } }))}
                      />
                      <span className="text-base">{d.emoji}</span>
                      <span className={cn('flex-1', c.keepId === d.id ? 'font-semibold' : 'text-ink-2')}>{d.name}</span>
                      <span className="tnum text-[12px] text-ink-4">{t.menu.dedupe.orders(d.orderCount)}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="flex min-w-48 flex-1 items-center gap-2 text-[12px] text-ink-3">
                    {t.menu.dedupe.renameLabel}
                    <input
                      className="h-8 flex-1 rounded-ui border border-line px-2 text-[13px] text-ink outline-none focus:border-brand"
                      value={c.name}
                      maxLength={150}
                      onChange={(e) => setChoice((m) => ({ ...m, [gi]: { ...c, name: e.target.value } }))}
                    />
                  </label>
                  <Button tiny variant="primary" loading={busy === gi} onClick={() => merge(gi)}>
                    {t.menu.dedupe.mergeBtn(g.dishes.length - 1)}
                  </Button>
                  <Button tiny disabled={busy === gi} onClick={() => distinct(gi)}>
                    {t.menu.dedupe.distinctBtn}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
