import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Dish, Grid, GridMember, PaymentConfig, Week } from '@/types';
import { t } from '@/constants/strings';
import { cls, vnd } from '@/lib/format';
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
          <div className="hint lock">{t.history.viewOnlyNote}</div>
          <div className="hist-totals">
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
            <span className="tot">
              {t.payment.breakdownTotal}: <b>{vnd(grid.totals.totalMoney)}</b>
            </span>
          </div>
          <GridPanel grid={grid} dishes={dishes} isAdmin={false} meId={meId} reload={async () => {}} readOnly />

          {payment && eating.length > 0 && (
            <div className="hist-pay">
              <div className="hist-pay-h">💳 {t.payment.title}</div>
              <div className="hint" style={{ marginBottom: 10 }}>
                {t.payment.memberHintLead}
                <b>{t.payment.memberHintBold}</b>
                {t.payment.memberHintTail}
              </div>
              <div className="member-pay">
                {eating.map((m) => (
                  <div
                    key={m.userId}
                    className={cls('mp', m.paymentStatus === 'PAID' && 'paid')}
                    onClick={() => setPicked(m)}
                  >
                    <Avatar name={m.fullName} color={m.color} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">{m.fullName}</div>
                      <div className="am">
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
