import { Lock } from 'lucide-react';
import type { MyDebts } from '@/types';
import { vnd } from '@/lib/format';
import { Button } from '@/components/ui';

/**
 * Cảnh báo khoá đặt cơm vì nợ vượt ngưỡng.
 *
 * Chỉ hiện đúng khi server đã chốt là `locked` — không tự suy ra ở client, để banner
 * không bao giờ nói khác điều backend thực sự cho phép.
 */
export function DebtLockBanner({ debts, onPay }: { debts: MyDebts | null; onPay?: () => void }) {
  if (!debts?.locked) return null;
  return (
    <div className="flex flex-col gap-3 rounded-ui border border-danger-line bg-danger-soft p-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <div>
          <div className="font-semibold">Đặt cơm đang bị khoá</div>
          {/* Nói rõ "quá hạn" và "chưa tính tuần này": màn Thống kê hiện TỔNG nợ (có cả
              tuần đang chạy) nên hai con số lệch nhau, không giải thích thì trông như lỗi. */}
          <div className="text-[13px]">
            Nợ quá hạn của bạn là <b className="tnum">{vnd(debts.outstanding)}</b>, vượt ngưỡng{' '}
            <b className="tnum">{vnd(debts.debtLimit)}</b> (chưa tính tuần đang chạy). Thanh toán và chờ admin xác
            nhận để đặt lại. Trong lúc đó bạn vẫn huỷ được các suất đã đặt.
          </div>
        </div>
      </div>
      {onPay && (
        <Button variant="primary" tiny onClick={onPay} className="shrink-0">
          Thanh toán ngay
        </Button>
      )}
    </div>
  );
}
