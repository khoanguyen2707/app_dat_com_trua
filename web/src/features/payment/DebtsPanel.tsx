import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { api } from '@/services/api';
import type { Debtor, DebtWeek, Grid } from '@/types';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { hhmm, vnd, weekShort } from '@/lib/format';
import { Button, Card, CardBody, CardHeader, Spinner, toast } from '@/components/ui';
import { PaymentStatusChip } from './PaymentStatusChip';

/**
 * Admin: công nợ mọi tuần, gộp theo người. Link "Kiểm tra thanh toán" trong tin nhắc nợ
 * (#pay-pending) mở thẳng vào đây với bộ lọc chờ xác nhận.
 */
export function DebtsPanel({
  grid,
  pendingOnly: initialPendingOnly,
  reloadGrid,
}: {
  grid: Grid;
  pendingOnly?: boolean;
  reloadGrid: () => Promise<void>;
}) {
  const [debtors, setDebtors] = useState<Debtor[] | null>(null);
  const [pendingOnly, setPendingOnly] = useState(!!initialPendingOnly);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setDebtors(await api.debts());
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, grid]);

  useEffect(() => {
    if (initialPendingOnly) {
      setPendingOnly(true);
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialPendingOnly]);

  const confirm = async (d: Debtor, weeks: DebtWeek[], key: string) => {
    setBusy(key);
    try {
      await api.setPaymentStatusBulk(
        d.userId,
        weeks.map((w) => w.weekId),
        'PAID',
      );
      toast(t.payment.confirmedAllToast(weeks.length), '✅');
      await Promise.all([load(), reloadGrid()]);
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusy(null);
    }
  };

  const shown = (debtors ?? [])
    .map((d) => ({
      ...d,
      weeks: pendingOnly ? d.weeks.filter((w) => w.status === 'PENDING') : d.weeks,
    }))
    .filter((d) => d.weeks.length > 0);
  const pendingCount = (debtors ?? []).reduce((a, d) => a + d.weeks.filter((w) => w.status === 'PENDING').length, 0);

  return (
    <div ref={ref} className="mt-4 scroll-mt-[4.5rem]">
      <Card>
        <CardHeader title={t.payment.debtsTitle} />
        <div className="flex gap-1 border-b border-line px-4 py-2">
          {[
            { v: false, label: t.payment.filterDue },
            { v: true, label: `${t.payment.filterPending} ${pendingCount}` },
          ].map((f) => (
            <button
              key={String(f.v)}
              onClick={() => setPendingOnly(f.v)}
              className={cn(
                'rounded-ui px-2.5 py-1 text-[13px] font-medium transition-colors',
                pendingOnly === f.v ? 'bg-subtle text-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[12px] text-ink-4">{t.payment.debtsHint}</span>
        </div>
        <CardBody flush>
          {!debtors ? (
            <Spinner />
          ) : shown.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-ink-3">
              {pendingOnly ? t.payment.filterEmpty : t.payment.debtsEmpty}
            </div>
          ) : (
            <div className="divide-y divide-line">
              {shown.map((d) => (
                <div key={d.userId} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 truncate text-sm font-semibold">{d.fullName}</div>
                    <div className="tnum text-sm font-semibold text-brand">
                      {vnd(d.weeks.reduce((a, w) => a + w.total, 0))}
                    </div>
                    {d.weeks.length > 1 && (
                      <Button
                        tiny
                        variant="success"
                        loading={busy === d.userId}
                        onClick={() => confirm(d, d.weeks, d.userId)}
                      >
                        <CheckCheck className="size-3.5" />
                        {t.payment.confirmAll}
                      </Button>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {d.weeks.map((w) => (
                      <div key={w.weekId} className="flex items-center gap-2 text-[13px]">
                        <span className="min-w-0 flex-1 truncate text-ink-3">
                          {weekShort(w.weekLabel)} · {t.payment.servings(w.servings)}
                          {w.reportedAt && ` · ${t.payment.reportedAt(hhmm(w.reportedAt))}`}
                        </span>
                        {w.status === 'PENDING' && <PaymentStatusChip status={w.status} />}
                        <span className="tnum w-20 text-right">{vnd(w.total)}</span>
                        <Button
                          tiny
                          variant={w.status === 'PENDING' ? 'success' : 'default'}
                          loading={busy === `${d.userId}|${w.weekId}`}
                          onClick={() => confirm(d, [w], `${d.userId}|${w.weekId}`)}
                        >
                          <Check className="size-3.5" />
                          {t.payment.confirmShort}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
