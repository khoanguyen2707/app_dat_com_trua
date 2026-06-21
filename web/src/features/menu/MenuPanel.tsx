import { useState } from 'react';
import { api } from '@/services/api';
import type { Dish } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Button, Card, CardBody, CardHeader, EmptyState, toast } from '@/components/ui';
import { DishModal } from './DishModal';

export function MenuPanel({ dishes, isAdmin, reload }: { dishes: Dish[]; isAdmin: boolean; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Dish | null>(null);
  const create = useDisclosure();
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

  return (
    <Card>
      <CardHeader
        icon="📋"
        title={t.menu.title}
        action={
          isAdmin && (
            <Button tiny variant="primary" onClick={create.onOpen}>
              {t.menu.addBtn}
            </Button>
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
          <div className="dishes">
            {dishes.map((d) => (
              <div className="dish-card" key={d.id}>
                <div className="dish-emoji">{d.emoji || '🍽️'}</div>
                <h3>{d.name}</h3>
                <div className="desc">{d.description}</div>
                <div className="price">{vnd(d.price)}</div>
                {isAdmin && (
                  <div className="dish-actions">
                    <Button tiny onClick={() => setEditing(d)}>
                      {t.actions.edit}
                    </Button>
                    <Button tiny variant="danger" onClick={() => remove(d)}>
                      🗑️
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
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
    </Card>
  );
}
