import { useCallback, useEffect, useState } from 'react';
import { Copy, Wallet } from 'lucide-react';
import { api } from '@/services/api';
import type { Debtor, DebtWeek, Grid, PaymentConfig } from '@/types';
import { t } from '@/constants/strings';
import { DAYS } from '@/constants/config';
import { cn } from '@/lib/cn';
import { noAccent, vnd, weekShort } from '@/lib/format';
import { bulkTransferInfo, vietqr } from '@/lib/vietqr';
import { Button, Card, CardBody, CardHeader, EmptyState, Spinner, toast } from '@/components/ui';
import { PaymentStatusChip } from '@/features/payment/PaymentStatusChip';

/** 'all' = trả gộp mọi tuần chưa báo; còn lại là weekId của 1 tuần. */
type Pick = 'all' | string;

/**
 * Thanh toán của riêng một thành viên: mọi tuần còn nợ (chưa được admin xác nhận),
 * chi tiết từng tuần, QR trả từng tuần hoặc trả tất cả một lần.
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
  const [debt, setDebt] = useState<Debtor | null>(null);
  const [pick, setPick] = useState<Pick>('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDebt(await api.myDebts());
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    }
  }, []);

  // grid đổi (đặt thêm suất, admin xác nhận…) thì tải lại công nợ
  useEffect(() => {
    load();
  }, [load, grid, meId]);

  if (!debt) return <Spinner />;

  if (debt.weeks.length === 0) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader title={t.me.payTitle} />
        <CardBody>
          <EmptyState icon={<Wallet />}>{t.me.payNothing}</EmptyState>
        </CardBody>
      </Card>
    );
  }

  const unpaid = debt.weeks.filter((w) => w.status === 'UNPAID');
  const selected: DebtWeek[] = pick === 'all' ? unpaid : debt.weeks.filter((w) => w.weekId === pick);
  const amount = selected.reduce((a, w) => a + w.total, 0);
  const name = noAccent(debt.fullName);
  const info =
    selected.length === 1
      ? t.payment.qrInfoMember(name, weekShort(selected[0].weekLabel))
      : bulkTransferInfo(
          name,
          selected.map((w) => weekShort(w.weekLabel)),
        );
  const allPending = selected.length > 0 && selected.every((w) => w.status === 'PENDING');

  const report = async (r: boolean) => {
    setBusy(true);
    try {
      await api.reportMyPayments(
        selected.map((w) => w.weekId),
        r,
      );
      toast(r ? t.payment.reportedToast : t.payment.reportCancelledToast, r ? '📤' : '↩️');
      if (r) setPick('all');
      await Promise.all([load(), reload()]);
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

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ==== Danh sách tuần còn nợ ==== */}
      <Card>
        <CardHeader
          title={t.me.payTitle}
          action={
            <span className="tnum text-[13px] text-ink-3">
              {t.me.debtTotal}: <b className="text-brand">{vnd(debt.total)}</b>
            </span>
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2 text-[13px] text-ink-3">
          <span>
            {t.me.debtWeeks(debt.weeks.length)}
            {debt.pendingTotal > 0 && ` · ${t.me.pendingAmount(vnd(debt.pendingTotal))}`}
          </span>
          {unpaid.length > 1 && (
            <Button tiny variant={pick === 'all' ? 'primary' : 'default'} onClick={() => setPick('all')}>
              {t.me.payAll}
            </Button>
          )}
        </div>
        <CardBody flush>
          <div className="divide-y divide-line">
            {debt.weeks.map((w) => (
              <button
                key={w.weekId}
                onClick={() => setPick(w.weekId)}
                className={cn(
                  'block w-full px-4 py-3 text-left hover:bg-subtle/60',
                  pick === w.weekId && 'bg-brand-soft/40',
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">{w.weekLabel}</div>
                  <PaymentStatusChip status={w.status} />
                  <div className="tnum w-24 text-right text-sm font-semibold">{vnd(w.total)}</div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {DAYS.filter((d) => w.days[d.key]).map((d) => (
                    <span key={d.key} className="rounded-ui border border-line px-1.5 text-[11px] text-ink-3">
                      {d.label}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-[12px] text-ink-4">
                  {t.payment.breakdownRice(w.servings)} {vnd(w.foodTotal)}
                  {w.drinksTotal > 0 &&
                    ` · ${w.drinks.map((d) => t.payment.drinkDetail(d.name, d.qty)).join(', ')} ${vnd(w.drinksTotal)}`}
                </div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ==== QR cho lựa chọn hiện tại ==== */}
      <Card className="lg:sticky lg:top-[4.5rem]">
        <CardHeader
          title={
            pick === 'all' ? t.me.payingAll(selected.length) : t.me.payingWeek(weekShort(selected[0]?.weekLabel ?? ''))
          }
        />
        <CardBody>
          {selected.length === 0 ? (
            <div className="rounded-ui border border-warn-line bg-warn-soft px-3 py-2.5 text-center text-[13px] font-medium text-warn">
              {t.payment.reportWaiting}
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="text-[13px] text-ink-3">{t.me.payAmount}</div>
                <div className="tnum text-[32px] font-semibold leading-tight tracking-tight text-brand">
                  {vnd(amount)}
                </div>
              </div>

              {!allPending && (
                <div className="mt-4 flex flex-col items-center">
                  <img
                    src={vietqr(payment, amount, info)}
                    alt="QR"
                    className="w-56 max-w-full rounded-ui-md border border-line"
                  />
                  <div className="mt-3 text-center">
                    <div className="font-semibold">{payment.accountHolder}</div>
                    <div className="text-[13px] text-ink-3">{payment.bankName}</div>
                  </div>
                </div>
              )}

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
                {allPending ? (
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
                    {selected.length > 1 ? t.me.reportAllBtn : t.payment.reportBtn}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
