import { api } from '@/services/api';
import type { GridMember, PaymentConfig } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { vietqr } from '@/lib/vietqr';
import { Button, Modal, toast } from '@/components/ui';

export function MemberPayModal({
  member,
  unitPrice,
  weekId,
  payment,
  isAdmin,
  onClose,
  onPaid,
}: {
  member: GridMember;
  unitPrice: number;
  weekId: string;
  payment: PaymentConfig;
  isAdmin: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const foodTotal = member.foodTotal ?? member.servings * unitPrice;
  const drinksTotal = member.drinksTotal ?? 0;
  const amount = member.total ?? foodTotal + drinksTotal;
  const info = t.payment.qrInfoMember(member.fullName);

  const togglePaid = async () => {
    await api.setPaid(weekId, member.userId, !member.paid);
    toast(member.paid ? t.payment.unmarked : t.payment.marked, member.paid ? '↩️' : '✅');
    onPaid();
  };

  return (
    <Modal open title={t.payment.modalTitle(member.fullName)} onClose={onClose}>
      <div className="center">
        <img
          src={vietqr(payment, amount, info)}
          alt="QR"
          style={{ width: 240, maxWidth: '100%', borderRadius: 16, boxShadow: 'var(--shadow)' }}
        />
        <div className="small muted" style={{ marginTop: 10 }}>
          {t.payment.amountToTransfer}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand)' }}>{vnd(amount)}</div>
        <div className="pay-breakdown">
          <div>
            <span>{t.payment.breakdownRice(member.servings)}</span>
            <span>{vnd(foodTotal)}</span>
          </div>
          {drinksTotal > 0 && (
            <div>
              <span>{t.payment.breakdownDrink}</span>
              <span>{vnd(drinksTotal)}</span>
            </div>
          )}
          <div className="sum">
            <span>{t.payment.breakdownTotal}</span>
            <span>{vnd(amount)}</span>
          </div>
        </div>
        <div className="acct-row" style={{ marginTop: 16, textAlign: 'left' }}>
          <div>
            <div className="k">{t.payment.transferNote}</div>
            <div className="v" style={{ fontSize: 14 }}>
              {info}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="modal-actions">
            <Button variant={member.paid ? 'default' : 'success'} onClick={togglePaid}>
              {member.paid ? t.payment.unmark : t.payment.markPaid}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
