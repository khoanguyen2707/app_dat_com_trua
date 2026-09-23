import { useMemo, useState } from 'react';
import { Check, Copy, Undo2 } from 'lucide-react';
import { api } from '@/services/api';
import type { Grid, GridMember, PaymentConfig, PaymentStatus } from '@/types';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { vnd } from '@/lib/format';
import { vietqr } from '@/lib/vietqr';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Avatar, Button, Card, CardBody, CardHeader, toast } from '@/components/ui';
import { MemberPayModal } from './MemberPayModal';
import { PaymentEditModal } from './PaymentEditModal';
import { PaymentStatusChip } from './PaymentStatusChip';

type Filter = 'all' | 'due' | 'pending';

export function PaymentPanel({
  grid,
  payment,
  isAdmin,
  meId,
  reloadGrid,
  reloadPayment,
}: {
  grid: Grid;
  payment: PaymentConfig;
  isAdmin: boolean;
  meId: string;
  reloadGrid: () => Promise<void>;
  reloadPayment: () => Promise<void>;
}) {
  const [picked, setPicked] = useState<GridMember | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  /** userId đang gọi API xác nhận/hoàn tác → chỉ khoá hàng đó, không khoá cả bảng. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const edit = useDisclosure();

  const eating = useMemo(() => grid.members.filter((m) => m.total > 0), [grid.members]);
  const counts = useMemo(
    () => ({
      all: eating.length,
      due: eating.filter((m) => m.paymentStatus !== 'PAID').length,
      pending: eating.filter((m) => m.paymentStatus === 'PENDING').length,
    }),
    [eating],
  );
  const shown = eating.filter((m) =>
    filter === 'due' ? m.paymentStatus !== 'PAID' : filter === 'pending' ? m.paymentStatus === 'PENDING' : true,
  );
  const outstanding = eating.filter((m) => m.paymentStatus !== 'PAID').reduce((a, m) => a + m.total, 0);

  const copy = () => {
    navigator.clipboard?.writeText(payment.accountNumber);
    toast(t.payment.copied, '📋');
  };

  /** Admin đổi trạng thái ngay trên hàng — không phải mở phiếu của từng người. */
  const setStatus = async (m: GridMember, s: PaymentStatus) => {
    setBusyId(m.userId);
    try {
      await api.setPaymentStatus(grid.week.id, m.userId, s);
      toast(s === 'PAID' ? t.payment.confirmedToast : t.payment.rejectedToast, s === 'PAID' ? '✅' : '↩️');
      await reloadGrid();
    } catch (e: any) {
      toast(e.message || t.errors.short, '⚠️');
    } finally {
      setBusyId(null);
    }
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t.payment.filterAll },
    { key: 'due', label: t.payment.filterDue },
    { key: 'pending', label: t.payment.filterPending },
  ];

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ==== Cột trái: QR + thông tin tài khoản, dính khi cuộn ==== */}
        <Card className="lg:sticky lg:top-[4.5rem]">
          <CardHeader
            title={t.payment.title}
            action={
              isAdmin && (
                <Button tiny onClick={edit.onOpen}>
                  {t.actions.edit}
                </Button>
              )
            }
          />
          <CardBody>
            <div className="flex flex-col items-center">
              <img
                src={vietqr(payment, undefined, t.payment.qrInfoWeek(grid.week.label))}
                alt="QR"
                className="w-56 max-w-full rounded-ui-md border border-line"
              />
              <div className="mt-3 text-center">
                <div className="font-semibold">{payment.accountHolder}</div>
                <div className="text-[13px] text-ink-3">{payment.bankName}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 rounded-ui-md border border-line bg-subtle px-3 py-2">
              <div className="min-w-0">
                <div className="text-[12px] text-ink-3">
                  {t.payment.accountNumber}
                </div>
                <div className="tnum truncate font-semibold">{payment.accountNumber}</div>
              </div>
              <Button tiny onClick={copy}>
                <Copy className="size-3.5" />
                {t.actions.copy}
              </Button>
            </div>

            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              {t.payment.memberHintLead}
              <b className="font-medium text-ink-2">{t.payment.memberHintBold}</b>
              {t.payment.memberHintTail}
            </p>
          </CardBody>
        </Card>

        {/* ==== Cột phải: công nợ từng người ==== */}
        <Card>
          <CardHeader
            title={t.payment.membersTitle}
            action={
              outstanding > 0 && (
                <span className="tnum text-[13px] text-ink-3">
                  {t.payment.outstanding}: <b className="text-brand">{vnd(outstanding)}</b>
                </span>
              )
            }
          />
          <div className="flex gap-1 border-b border-line px-4 py-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-ui px-2.5 py-1 text-[13px] font-medium transition-colors',
                  filter === f.key ? 'bg-subtle text-ink' : 'text-ink-3 hover:text-ink',
                )}
              >
                {f.label}
                <span className="tnum ml-1 text-ink-4">{counts[f.key]}</span>
              </button>
            ))}
          </div>

          <CardBody flush>
            {shown.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-ink-3">
                {eating.length === 0 ? t.payment.noEaters : t.payment.filterEmpty}
              </div>
            ) : (
              <div className="divide-y divide-line">
                {shown.map((m) => (
                  <div
                    key={m.userId}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 hover:bg-subtle/60',
                      m.userId === meId && 'bg-brand-soft/40',
                    )}
                  >
                    <Avatar name={m.fullName} color={m.color} size={30} />
                    <button className="min-w-0 flex-1 text-left" onClick={() => setPicked(m)}>
                      <div className={cn('truncate text-sm', m.paymentStatus === 'PAID' && 'text-ink-3')}>
                        {m.fullName}
                      </div>
                      <div className="text-[12px] text-ink-4">
                        {t.payment.servingsAmount(m.servings, vnd(m.total))}
                      </div>
                    </button>
                    <PaymentStatusChip status={m.paymentStatus} />
                    {isAdmin && (
                      <div className="flex w-32 justify-end">
                        {m.paymentStatus !== 'PAID' ? (
                          <Button
                            tiny
                            variant="success"
                            loading={busyId === m.userId}
                            onClick={() => setStatus(m, 'PAID')}
                          >
                            <Check className="size-3.5" />
                            {t.payment.confirmShort}
                          </Button>
                        ) : (
                          <Button tiny loading={busyId === m.userId} onClick={() => setStatus(m, 'UNPAID')}>
                            <Undo2 className="size-3.5" />
                            {t.payment.undoShort}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {picked && (
        <MemberPayModal
          member={picked}
          unitPrice={grid.week.unitPrice}
          weekId={grid.week.id}
          weekLabel={grid.week.label}
          meId={meId}
          payment={payment}
          isAdmin={isAdmin}
          onClose={() => setPicked(null)}
          onPaid={async () => {
            setPicked(null);
            await reloadGrid();
          }}
        />
      )}
      {edit.open && (
        <PaymentEditModal
          payment={payment}
          onClose={edit.onClose}
          onSaved={async () => {
            edit.onClose();
            await reloadPayment();
          }}
        />
      )}
    </>
  );
}
