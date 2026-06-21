import type { PaymentStatus } from '@/types';
import { t } from '@/constants/strings';
import { cls } from '@/lib/format';

const STYLE: Record<PaymentStatus, string> = { UNPAID: 'unpaid', PENDING: 'pending', PAID: 'paid' };
const ICON: Record<PaymentStatus, string> = { UNPAID: '•', PENDING: '⏳', PAID: '✅' };

/** Chip trạng thái công nợ — dùng chung ở danh sách & modal thanh toán. */
export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  return (
    <span className={cls('pst', STYLE[status])}>
      {ICON[status]} {t.payment.status[status]}
    </span>
  );
}
