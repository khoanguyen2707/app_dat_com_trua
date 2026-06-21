import { useState } from 'react';
import { api } from '@/services/api';
import type { GridMember, PaymentConfig, PaymentStatus } from '@/types';
import { t } from '@/constants/strings';
import { hhmm, noAccent, vnd, weekShort } from '@/lib/format';
import { vietqr } from '@/lib/vietqr';
import { Button, Modal, toast } from '@/components/ui';
import { PaymentStatusChip } from './PaymentStatusChip';

export function MemberPayModal({
  member,
  unitPrice,
  weekId,
  weekLabel,
  meId,
  payment,
  isAdmin,
  onClose,
  onPaid,
}: {
  member: GridMember;
  unitPrice: number;
  weekId: string;
  weekLabel: string;
  meId: string;
  payment: PaymentConfig;
  isAdmin: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const foodTotal = member.foodTotal ?? member.servings * unitPrice;
  const drinksTotal = member.drinksTotal ?? 0;
  const amount = member.total ?? foodTotal + drinksTotal;
  const status = member.paymentStatus;
  const isMine = member.userId === meId;
  // Nội dung CK: tên người chuyển (không dấu) + tuần (bỏ năm), vd "Chuong - 22/6 - 27/6"
  const info = t.payment.qrInfoMember(noAccent(member.fullName), weekShort(weekLabel));

  const [busy, setBusy] = useState(false);

  const report = async (r: boolean) => {
    setBusy(true);
    try {
      await api.reportMyPayment(weekId, r);
      toast(r ? t.payment.reportedToast : t.payment.reportCancelledToast, r ? '📤' : '↩️');
      onPaid();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
      setBusy(false);
    }
  };
  const setStatus = async (s: PaymentStatus) => {
    setBusy(true);
    try {
      await api.setPaymentStatus(weekId, member.userId, s);
      toast(s === 'PAID' ? t.payment.confirmedToast : t.payment.rejectedToast, s === 'PAID' ? '✅' : '↩️');
      onPaid();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
      setBusy(false);
    }
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
        <div className="pay-status-row">
          <PaymentStatusChip status={status} />
          {status === 'PENDING' && member.reportedAt && (
            <span className="small muted">{t.payment.reportedAt(hhmm(member.reportedAt))}</span>
          )}
          {status === 'PAID' && member.paidAt && (
            <span className="small muted">{t.payment.paidAt(hhmm(member.paidAt))}</span>
          )}
        </div>

        {isAdmin ? (
          <div className="modal-actions">
            {status !== 'PAID' && (
              <Button variant="success" loading={busy} onClick={() => setStatus('PAID')}>
                {t.payment.confirmBtn}
              </Button>
            )}
            {status !== 'UNPAID' && (
              <Button loading={busy} onClick={() => setStatus('UNPAID')}>
                {t.payment.rejectBtn}
              </Button>
            )}
          </div>
        ) : isMine ? (
          status === 'PAID' ? (
            <div className="pay-note done">{t.payment.paidDone}</div>
          ) : status === 'PENDING' ? (
            <div className="modal-actions">
              <span className="pay-note wait">{t.payment.reportWaiting}</span>
              <Button loading={busy} onClick={() => report(false)}>
                {t.payment.reportCancel}
              </Button>
            </div>
          ) : (
            <div className="modal-actions">
              <Button variant="primary" loading={busy} onClick={() => report(true)}>
                {t.payment.reportBtn}
              </Button>
            </div>
          )
        ) : null}
      </div>
    </Modal>
  );
}
