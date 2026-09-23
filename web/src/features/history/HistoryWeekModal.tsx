import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Dish, Grid, GridMember, PaymentConfig, Week } from '@/types';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { Avatar, Modal, Spinner } from '@/components/ui';
import { GridPanel } from '@/features/grid/GridPanel';
import { MemberPayModal } from '@/features/payment/MemberPayModal';
import { PaymentStatusChip } from '@/features/payment/PaymentStatusChip';

/** Xem chi tiết 1 tuần trong Lịch sử — bảng cơm chỉ xem; phần thanh toán vẫn cho phép trả/đối soát. */
export function HistoryWeekModal({
  week,
  dishes,
  meId,
  isAdmin,
  payment,
  onClose,
}: {
  week: Week;
  dishes: Dish[];
  meId: string;
  isAdmin: boolean;
  payment: PaymentConfig | null;
  onClose: () => void;
}) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [picked, setPicked] = useState<GridMember | null>(null);

  useEffect(() => {
    let alive = true;
    api.weekGrid(week.id).then((g) => alive && setGrid(g));
    return () => {
      alive = false;
    };
  }, [week.id]);

  const reload = async () => setGrid(await api.weekGrid(week.id));

  const foodTotal = grid?.totals.totalFood ?? 0;
  const drinksTotal = grid?.totals.totalDrinks ?? 0;
  const eating = grid?.members.filter((m) => m.total > 0) ?? [];

  return (
    <Modal open wide title={week.label} onClose={onClose}>
      {!grid ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-ui border border-brand-line bg-brand-soft px-3 py-2 text-[13px] text-brand">
            <Lock className="size-3.5 shrink-0" />
            {t.history.viewOnlyNote}
          </div>
          <div className="mb-3.5 flex flex-wrap gap-x-4 gap-y-1.5 rounded-ui-md border border-line bg-subtle px-3 py-2 text-[13px] text-ink-3">
            <span>
              <b>{grid.totals.totalServings}</b> {t.grid.colServings.toLowerCase()}
            </span>
            <span>
              {t.payment.breakdownRice(grid.totals.totalServings)}: <b>{vnd(foodTotal)}</b>
            </span>
            {drinksTotal > 0 && (
              <span>
                {t.payment.breakdownDrink}: <b>{vnd(drinksTotal)}</b>
              </span>
            )}
            <span className="[&_b]:text-brand">
              {t.payment.breakdownTotal}: <b>{vnd(grid.totals.totalMoney)}</b>
            </span>
          </div>
          <GridPanel grid={grid} dishes={dishes} isAdmin={false} meId={meId} reload={async () => {}} readOnly />

          {payment && eating.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 text-sm font-semibold">{t.payment.title}</div>
              <div className="mb-2.5 text-[13px] text-ink-3">
                {t.payment.memberHintLead}
                <b>{t.payment.memberHintBold}</b>
                {t.payment.memberHintTail}
              </div>
              <div className="divide-y divide-line rounded-ui-md border border-line">
                {eating.map((m) => (
                  <div
                    key={m.userId}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-subtle/60"
                    onClick={() => setPicked(m)}
                  >
                    <Avatar name={m.fullName} color={m.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn('truncate text-sm', m.paymentStatus === 'PAID' && 'text-ink-3')}
                      >
                        {m.fullName}
                      </div>
                      <div className="tnum text-[12px] text-ink-4">
                        {t.payment.servingsAmount(m.servings, vnd(m.total))}
                        {(m.drinksTotal ?? 0) > 0 && ' · 🥤'}
                      </div>
                    </div>
                    <PaymentStatusChip status={m.paymentStatus} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {picked && payment && (
        <MemberPayModal
          member={picked}
          unitPrice={week.unitPrice}
          weekId={week.id}
          weekLabel={week.label}
          meId={meId}
          payment={payment}
          isAdmin={isAdmin}
          onClose={() => setPicked(null)}
          onPaid={async () => {
            setPicked(null);
            await reload();
          }}
        />
      )}
    </Modal>
  );
}
