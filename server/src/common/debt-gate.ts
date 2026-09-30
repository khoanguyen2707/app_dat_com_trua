/**
 * Khoá đặt cơm khi nợ vượt ngưỡng.
 *
 * Nợ tính trên các tuần chưa được admin xác nhận PAID (UNPAID + PENDING), BỎ tuần đang
 * chạy — tuần hiện tại chưa tới hạn trả, tính vào sẽ khoá oan người ăn đều.
 *
 * Cố ý KHÔNG coi PENDING là đã trả: nếu chỉ bấm "đã chuyển khoản" là mở khoá thì ai cũng
 * bấm để đặt tiếp mà không chuyển tiền thật. Khoá chỉ mở khi admin xác nhận PAID.
 */
import type { Debtor } from './debt';
import { currentWeekStart } from './week-lock';

export interface DebtGate {
  /** Số tiền còn nợ đã bỏ tuần hiện tại. */
  outstanding: number;
  /** Ngưỡng đang áp dụng; 0 = tắt rule. */
  debtLimit: number;
  /** true = không được bật thêm ngày ăn / thêm món. */
  locked: boolean;
}

/** Nợ của một người, không tính tuần đang chạy. */
export function outstandingBeforeCurrentWeek(debtor: Pick<Debtor, 'weeks'> | null, now: Date = new Date()): number {
  if (!debtor) return 0;
  const start = currentWeekStart(now).getTime();
  return debtor.weeks.filter((w) => !w.weekStart || w.weekStart.getTime() < start).reduce((a, w) => a + w.total, 0);
}

/** Vượt NGƯỠNG mới khoá — đúng bằng ngưỡng thì vẫn cho đặt. */
export function evaluateGate(outstanding: number, debtLimit: number): DebtGate {
  const limit = debtLimit > 0 ? debtLimit : 0;
  return { outstanding, debtLimit: limit, locked: limit > 0 && outstanding > limit };
}

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

export function debtLockMessage(gate: DebtGate): string {
  return (
    `Bạn đang nợ ${vnd(gate.outstanding)}, vượt ngưỡng ${vnd(gate.debtLimit)} — ` +
    'thanh toán và chờ admin xác nhận để mở lại đặt cơm.'
  );
}
