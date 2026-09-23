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
      <div className="flex flex-col items-center">
        <img src={vietqr(payment, amount, info)} alt="QR" className="w-60 max-w-full rounded-ui-md border border-line" />
        <div className="mt-3 text-[13px] text-ink-3">{t.payment.amountToTransfer}</div>
        <div className="tnum text-2xl font-semibold tracking-tight text-brand">{vnd(amount)}</div>
      </div>

      <div className="mx-auto mt-3 w-full max-w-xs text-[13px]">
        <div className="flex justify-between py-0.5 text-ink-3">
          <span>{t.payment.breakdownRice(member.servings)}</span>
          <span className="tnum">{vnd(foodTotal)}</span>
        </div>
        {drinksTotal > 0 && (
          <div className="flex justify-between py-0.5 text-ink-3">
            <span>{t.payment.breakdownDrink}</span>
            <span className="tnum">{vnd(drinksTotal)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-line pt-1.5 font-semibold">
          <span>{t.payment.breakdownTotal}</span>
          <span className="tnum text-brand">{vnd(amount)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-ui-md border border-line bg-subtle px-3 py-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-ink-4">{t.payment.transferNote}</div>
        <div className="font-medium">{info}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <PaymentStatusChip status={status} />
        {status === 'PENDING' && member.reportedAt && (
          <span className="text-[13px] text-ink-3">{t.payment.reportedAt(hhmm(member.reportedAt))}</span>
        )}
        {status === 'PAID' && member.paidAt && (
          <span className="text-[13px] text-ink-3">{t.payment.paidAt(hhmm(member.paidAt))}</span>
        )}
      </div>

      {isAdmin ? (
        <div className="mt-4 flex justify-end gap-2">
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
          <div className="mt-4 rounded-ui border border-ok-line bg-ok-soft px-3 py-2.5 text-center text-[13px] font-medium text-ok">
            {t.payment.paidDone}
          </div>
        ) : status === 'PENDING' ? (
          <div className="mt-4 flex items-center gap-2">
            <span className="flex-1 rounded-ui border border-warn-line bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
              {t.payment.reportWaiting}
            </span>
            <Button loading={busy} onClick={() => report(false)}>
              {t.payment.reportCancel}
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Button variant="primary" loading={busy} onClick={() => report(true)}>
              {t.payment.reportBtn}
            </Button>
          </div>
        )
      ) : null}
    </Modal>
  );
}
