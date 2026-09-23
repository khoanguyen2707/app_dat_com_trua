import { useState } from 'react';
import { CalendarPlus, Eye, History, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import type { Dish, PaymentConfig, Week } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Button, Card, CardBody, CardHeader, confirmDialog, EmptyState, IconButton, toast } from '@/components/ui';
import { CreateWeekModal } from './CreateWeekModal';
import { HistoryWeekModal } from './HistoryWeekModal';

export function HistoryPanel({
  weeks,
  dishes,
  isAdmin,
  meId,
  payment,
  reload,
}: {
  weeks: Week[];
  dishes: Dish[];
  isAdmin: boolean;
  meId: string;
  payment: PaymentConfig | null;
  reload: () => Promise<void>;
}) {
  const create = useDisclosure();
  const [viewing, setViewing] = useState<Week | null>(null);

  const del = async (w: Week) => {
    const ok = await confirmDialog({
      title: t.history.confirmDeleteTitle,
      message: t.history.confirmDelete(w.label),
      confirmLabel: t.actions.delete,
      danger: true,
    });
    if (!ok) return;
    await api.deleteWeek(w.id);
    await reload();
    toast(t.history.deleted, '🗑️');
  };

  return (
    <Card>
      <CardHeader
        title={t.history.title}
        action={
          isAdmin && (
            <Button tiny variant="primary" onClick={create.onOpen}>
              <CalendarPlus className="size-3.5" />
              {t.history.newBtn}
            </Button>
          )
        }
      />
      <CardBody flush>
        {weeks.length === 0 ? (
          <EmptyState icon={<History />}>{t.history.empty}</EmptyState>
        ) : (
          <div className="divide-y divide-line">
            {weeks.map((w) => (
              <div key={w.id} className="group/week flex items-center gap-3 px-4 py-2.5 hover:bg-subtle/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <b className="truncate text-sm font-medium">{w.label}</b>
                    {w.isActive && (
                      <span className="shrink-0 rounded-full border border-ok-line bg-ok-soft px-2 py-px text-[11px] font-medium text-ok">
                        {t.history.active}
                      </span>
                    )}
                  </div>
                  <div className="tnum mt-0.5 text-[12px] text-ink-4">
                    {t.history.meta(w.servings ?? 0, vnd(w.total ?? 0), w.memberCount ?? 0, vnd(w.unitPrice))}
                  </div>
                </div>
                <Button tiny onClick={() => setViewing(w)}>
                  <Eye className="size-3.5" />
                  {t.history.viewBtn}
                </Button>
                {isAdmin && (
                  <IconButton
                    className="opacity-0 transition-opacity hover:text-danger group-hover/week:opacity-100 focus:opacity-100"
                    title={t.actions.delete}
                    onClick={() => del(w)}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
      {isAdmin && (
        <div className="border-t border-line px-4 py-2.5 text-[13px] text-ink-3">{t.history.hint}</div>
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
      {viewing && (
        <HistoryWeekModal
          week={viewing}
          dishes={dishes}
          meId={meId}
          isAdmin={isAdmin}
          payment={payment}
          onClose={() => setViewing(null)}
        />
      )}
    </Card>
  );
}
