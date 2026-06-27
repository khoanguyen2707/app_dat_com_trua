import { useState } from 'react';
import { api } from '@/services/api';
import type { Dish, Grid } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Button, Card, CardBody, CardHeader, EmptyState, IconButton, toast } from '@/components/ui';
import { DishModal } from './DishModal';
import { DayMenuModal } from './DayMenuModal';

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
  const create = useDisclosure();
  const postMenu = useDisclosure();
  const modalOpen = create.open || editing !== null;

  const closeModal = () => {
    create.onClose();
    setEditing(null);
  };

  const remove = async (d: Dish) => {
    if (!confirm(t.menu.confirmDelete(d.name))) return;
    await api.deleteDish(d.id);
    await reload();
    toast(t.menu.deleted, '🗑️');
  };

  const mains = dishes.filter((d) => d.category !== 'DRINK');
  const drinks = dishes.filter((d) => d.category === 'DRINK');

  const section = (title: string, list: Dish[]) =>
    list.length > 0 && (
      <div className="menu-sec">
        <div className="menu-sec-h">
          {title} <span className="muted small">· {t.menu.sectionCount(list.length)}</span>
        </div>
        <div className="menu-grid">
          {list.map((d) => (
            <div className="mdish" key={d.id}>
              <span className="mdish-emoji">{d.emoji || '🍽️'}</span>
              <span className="mdish-info">
                <b>{d.name}</b>
                <span className="mdish-price">{vnd(d.price)}</span>
              </span>
              {isAdmin && (
                <span className="mdish-act">
                  <IconButton title={t.actions.edit} onClick={() => setEditing(d)}>
                    ✏️
                  </IconButton>
                  <IconButton title={t.actions.delete} onClick={() => remove(d)}>
                    🗑️
                  </IconButton>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <Card>
      <CardHeader
        icon="📋"
        title={t.menu.title}
        action={
          isAdmin && (
            <span className="row" style={{ gap: 6 }}>
              <Button tiny variant="primary" onClick={postMenu.onOpen}>
                {t.menu.post.btn}
              </Button>
              <Button tiny onClick={create.onOpen}>
                {t.menu.addBtn}
              </Button>
            </span>
          )
        }
      />
      <CardBody>
        {dishes.length === 0 ? (
          <EmptyState icon={t.menu.emptyIcon}>
            {t.menu.empty}
            {isAdmin && t.menu.emptyHintAdmin}
          </EmptyState>
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
    </Card>
  );
}
