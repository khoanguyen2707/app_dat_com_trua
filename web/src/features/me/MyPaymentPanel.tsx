import { useState } from 'react';
import { Copy, Wallet } from 'lucide-react';
import { api } from '@/services/api';
import type { Grid, PaymentConfig } from '@/types';
import { t } from '@/constants/strings';
import { hhmm, noAccent, vnd, weekShort } from '@/lib/format';
import { vietqr } from '@/lib/vietqr';
import { Button, Card, CardBody, CardHeader, EmptyState, toast } from '@/components/ui';
import { PaymentStatusChip } from '@/features/payment/PaymentStatusChip';

/**
 * Thanh toán của riêng một thành viên: mình nợ bao nhiêu, QR đã điền sẵn số tiền,
 * và nút báo đã chuyển khoản. Không thấy công nợ của ai khác.
 */
export function MyPaymentPanel({
  grid,
  payment,
  meId,
  reload,
}: {
  grid: Grid;
  payment: PaymentConfig;
  meId: string;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const me = grid.members.find((m) => m.userId === meId);
  if (!me) return null;

  const foodTotal = me.foodTotal ?? me.servings * grid.week.unitPrice;
  const drinksTotal = me.drinksTotal ?? 0;
  const amount = me.total;
  const info = t.payment.qrInfoMember(noAccent(me.fullName), weekShort(grid.week.label));

  const report = async (r: boolean) => {
    setBusy(true);
    try {
      await api.reportMyPayment(grid.week.id, r);
      toast(r ? t.payment.reportedToast : t.payment.reportCancelledToast, r ? '📤' : '↩️');
      await reload();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(payment.accountNumber);
    toast(t.payment.copied, '📋');
  };

  if (amount === 0) {
    return (
      <Card>
        <CardHeader title={t.me.payTitle} />
        <CardBody>
          <EmptyState icon={<Wallet />}>{t.me.payNothing}</EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader title={t.me.payTitle} action={<PaymentStatusChip status={me.paymentStatus} />} />
      <CardBody>
        <div className="text-center">
          <div className="text-[13px] text-ink-3">{t.me.payAmount}</div>
          <div className="tnum text-[32px] font-semibold leading-tight tracking-tight text-brand">{vnd(amount)}</div>
        </div>

        <div className="mx-auto mt-3 max-w-xs text-[13px]">
          <div className="flex justify-between py-0.5 text-ink-3">
            <span>{t.payment.breakdownRice(me.servings)}</span>
            <span className="tnum">{vnd(foodTotal)}</span>
          </div>
          {drinksTotal > 0 && (
            <div className="flex justify-between py-0.5 text-ink-3">
              <span>{t.payment.breakdownDrink}</span>
              <span className="tnum">{vnd(drinksTotal)}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center">
          <img src={vietqr(payment, amount, info)} alt="QR" className="w-56 max-w-full rounded-ui-md border border-line" />
          <div className="mt-3 text-center">
            <div className="font-semibold">{payment.accountHolder}</div>
            <div className="text-[13px] text-ink-3">{payment.bankName}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-ui-md border border-line bg-subtle px-3 py-2">
          <div className="min-w-0">
            <div className="text-[12px] text-ink-3">{t.payment.accountNumber}</div>
            <div className="tnum truncate font-semibold">{payment.accountNumber}</div>
          </div>
          <Button tiny onClick={copy}>
            <Copy className="size-3.5" />
            {t.actions.copy}
          </Button>
        </div>

        <div className="mt-3 rounded-ui-md border border-line bg-subtle px-3 py-2">
          <div className="text-[12px] text-ink-3">{t.payment.transferNote}</div>
          <div className="font-medium">{info}</div>
        </div>

        <div className="mt-5">
          {me.paymentStatus === 'PAID' ? (
            <div className="rounded-ui border border-ok-line bg-ok-soft px-3 py-2.5 text-center text-[13px] font-medium text-ok">
              {t.payment.paidDone}
              {me.paidAt && ` · ${t.payment.paidAt(hhmm(me.paidAt))}`}
            </div>
          ) : me.paymentStatus === 'PENDING' ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-ui border border-warn-line bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
                {t.payment.reportWaiting}
              </span>
              <Button loading={busy} onClick={() => report(false)}>
                {t.payment.reportCancel}
              </Button>
            </div>
          ) : (
            <Button variant="primary" block loading={busy} onClick={() => report(true)}>
              {t.payment.reportBtn}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
