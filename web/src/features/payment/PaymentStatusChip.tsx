import { Check, Clock, Circle } from 'lucide-react';
import type { PaymentStatus } from '@/types';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';

const STYLE: Record<PaymentStatus, string> = {
  UNPAID: 'border-line bg-subtle text-ink-3',
  PENDING: 'border-warn-line bg-warn-soft text-warn',
  PAID: 'border-ok-line bg-ok-soft text-ok',
};
const ICON: Record<PaymentStatus, typeof Check> = { UNPAID: Circle, PENDING: Clock, PAID: Check };

/** Chip trạng thái công nợ — dùng chung ở danh sách & modal thanh toán. */
export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  const Icon = ICON[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        STYLE[status],
      )}
    >
      <Icon className="size-3" />
      {t.payment.status[status]}
    </span>
  );
}
