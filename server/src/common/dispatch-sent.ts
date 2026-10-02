import { vnDateStr } from './week-lock';

/** Chỉ cần đọc được DailyDispatch — nhận PrismaService thật hoặc một stub khi test. */
type DispatchReader = {
  dailyDispatch: { findUnique(args: { where: { date: string } }): Promise<{ sentAt: Date | null } | null> };
};

/**
 * Đơn cơm của HÔM NAY (lịch VN) đã được gửi cho quán chưa.
 *
 * Tách ra khỏi DispatchService để orders/weeks khỏi phải import cả module dispatch
 * chỉ vì một câu query — và để "đã gửi" chỉ có đúng một định nghĩa.
 *
 * Đọc live mỗi lần hỏi: admin bỏ đánh dấu (bấm nhầm) là ngày đó mở lại ngay.
 */
export async function isTodayDispatchSent(prisma: DispatchReader, now: Date = new Date()): Promise<boolean> {
  const row = await prisma.dailyDispatch.findUnique({ where: { date: vnDateStr(now) } });
  return !!row?.sentAt;
}
