import { api } from '@/services/api';
import type { Week } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Button, Card, CardBody, CardHeader, EmptyState, IconButton, toast } from '@/components/ui';
import { CreateWeekModal } from './CreateWeekModal';

export function HistoryPanel({
  weeks,
  isAdmin,
  reload,
}: {
  weeks: Week[];
  isAdmin: boolean;
  reload: () => Promise<void>;
}) {
  const create = useDisclosure();

  const del = async (w: Week) => {
    if (!confirm(t.history.confirmDelete(w.label))) return;
    await api.deleteWeek(w.id);
    await reload();
    toast(t.history.deleted, '🗑️');
  };

  return (
    <Card>
      <CardHeader
        icon="🕐"
        title={t.history.title}
        action={
          isAdmin && (
            <Button tiny variant="success" onClick={create.onOpen}>
              {t.history.newBtn}
            </Button>
          )
        }
      />
      <CardBody flush>
        {weeks.length === 0 ? (
          <EmptyState icon="🕐">{t.history.empty}</EmptyState>
        ) : (
          weeks.map((w) => (
            <div className="hist-item" key={w.id}>
              <div className="ic">📅</div>
              <div className="info">
                <b>{w.label}</b> {w.isActive && <span className="badge-active">{t.history.active}</span>}
                <div className="meta">
                  {t.history.meta(w.servings ?? 0, vnd(w.total ?? 0), w.memberCount ?? 0, vnd(w.unitPrice))}
                </div>
              </div>
              {isAdmin && (
                <IconButton title={t.actions.delete} onClick={() => del(w)}>
                  🗑️
                </IconButton>
              )}
            </div>
          ))
        )}
      </CardBody>
      {isAdmin && (
        <div className="hint" style={{ margin: 16 }}>
          {t.history.hint}
        </div>
      )}

      {create.open && (
        <CreateWeekModal
          onClose={create.onClose}
          onSaved={async () => {
            create.onClose();
            await reload();
          }}
        />
      )}
    </Card>
  );
}
