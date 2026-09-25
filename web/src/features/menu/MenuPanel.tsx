import { useMemo, useState } from 'react';
import { CopyCheck, Pencil, Plus, Search, Send, Trash2, UtensilsCrossed } from 'lucide-react';
import { api } from '@/services/api';
import type { Dish, Grid } from '@/types';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { noAccent, vnd } from '@/lib/format';
import { groupByEmoji } from '@/lib/dishGroup';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Button, Card, CardBody, CardHeader, confirmDialog, EmptyState, IconButton, toast } from '@/components/ui';
import { DishModal } from './DishModal';
import { DayMenuModal } from './DayMenuModal';
import { DuplicatesModal } from './DuplicatesModal';

export function MenuPanel({
  dishes,
  isAdmin,
  reload,
  grid,
  reloadGrid,
}: {
  dishes: Dish[];
  isAdmin: boolean;
  reload: () => Promise<void>;
  grid: Grid;
  reloadGrid: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Dish | null>(null);
  const [q, setQ] = useState('');
  const create = useDisclosure();
  const postMenu = useDisclosure();
  const dedupe = useDisclosure();
  const modalOpen = create.open || editing !== null;

  const closeModal = () => {
    create.onClose();
    setEditing(null);
  };

  const remove = async (d: Dish) => {
    const ok = await confirmDialog({
      title: t.menu.confirmDeleteTitle,
      message: t.menu.confirmDelete(d.name),
      confirmLabel: t.actions.delete,
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteDish(d.id);
      await reload();
      toast(t.menu.deleted, '🗑️');
    } catch (e: any) {
      // Món đã có người đặt: server chặn xoá (mất đơn) → hướng admin sang Gộp.
      toast(e.message || t.errors.short, '⚠️');
    }
  };

  /** Lọc theo tên, bỏ dấu cả hai vế để gõ "com ga" vẫn ra "Cơm gà". */
  const matched = useMemo(() => {
    const needle = noAccent(q).trim().toLowerCase();
    if (!needle) return dishes;
    return dishes.filter((d) => noAccent(d.name).toLowerCase().includes(needle));
  }, [dishes, q]);

  const mains = matched.filter((d) => d.category !== 'DRINK');
  const drinks = matched.filter((d) => d.category === 'DRINK');

  const section = (title: string, list: Dish[]) =>
    list.length > 0 && (
      <section className="border-b border-line last:border-0">
        <h3 className="flex items-baseline gap-2 bg-subtle px-5 py-2 text-[13px] font-semibold text-ink-2">
          {title}
          <span className="tnum font-normal text-ink-4">{t.menu.sectionCount(list.length)}</span>
          <span className="font-normal text-ink-4">
            {title === t.menu.foodSection ? t.menu.onePriceNote(vnd(grid.week.unitPrice)) : t.menu.drinkPriceNote}
          </span>
        </h3>
        {groupByEmoji(list).map((g) => (
          <div key={g.emoji} className="flex items-start gap-3 border-b border-line px-4 py-2.5 last:border-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-ui border border-line bg-subtle text-base">
              {g.emoji}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-x-1.5 gap-y-1">
              {g.dishes.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    'group/dish flex items-center gap-2 rounded-ui border border-line bg-surface py-1 pl-2.5',
                    isAdmin ? 'pr-1' : 'pr-2.5',
                  )}
                >
                  <span className="text-[13px]">{d.name}</span>
                  {/* Món ăn ăn theo suất nên giá không nói lên điều gì; chỉ đồ uống mới tính riêng. */}
                  {d.category === 'DRINK' && (
                    <span className="tnum text-[13px] font-medium text-drink">{vnd(d.price)}</span>
                  )}
                  {isAdmin && (
                    <span className="flex gap-0.5 opacity-0 transition-opacity group-hover/dish:opacity-100 focus-within:opacity-100">
                      <IconButton className="size-6" title={t.actions.edit} onClick={() => setEditing(d)}>
                        <Pencil className="size-3.5" />
                      </IconButton>
                      <IconButton
                        className="size-6 hover:text-danger"
                        title={t.actions.delete}
                        onClick={() => remove(d)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    );

  return (
    <Card>
      <CardHeader
        title={t.menu.title}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-4" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.menu.searchPlaceholder}
                className="h-7 w-44 rounded-ui border border-line bg-surface pl-7 pr-2 text-[13px] outline-none focus:border-brand"
              />
            </div>
            {isAdmin && (
              <>
                <Button tiny variant="primary" onClick={postMenu.onOpen}>
                  <Send className="size-3.5" />
                  {t.menu.post.btn}
                </Button>
                <Button tiny onClick={dedupe.onOpen}>
                  <CopyCheck className="size-3.5" />
                  {t.menu.dedupe.openBtn}
                </Button>
                <Button tiny onClick={create.onOpen}>
                  <Plus className="size-3.5" />
                  {t.menu.addBtn}
                </Button>
              </>
            )}
          </div>
        }
      />
      <CardBody flush>
        {dishes.length === 0 ? (
          <EmptyState icon={<UtensilsCrossed />}>
            {t.menu.empty}
            {isAdmin && t.menu.emptyHintAdmin}
          </EmptyState>
        ) : matched.length === 0 ? (
          <EmptyState icon={<Search />}>{t.menu.searchEmpty(q)}</EmptyState>
        ) : (
          <>
            {section(t.menu.foodSection, mains)}
            {section(t.menu.drinkSection, drinks)}
          </>
        )}
      </CardBody>

      {modalOpen && (
        <DishModal
          dish={editing}
          onClose={closeModal}
          onSaved={async () => {
            closeModal();
            await reload();
          }}
        />
      )}

      {postMenu.open && (
        <DayMenuModal
          grid={grid}
          onClose={postMenu.onClose}
          onApplied={async () => {
            await Promise.all([reload(), reloadGrid()]);
          }}
        />
      )}
      {dedupe.open && (
        <DuplicatesModal
          onClose={dedupe.onClose}
          onChanged={async () => {
            await Promise.all([reload(), reloadGrid()]);
          }}
        />
      )}
    </Card>
  );
}
