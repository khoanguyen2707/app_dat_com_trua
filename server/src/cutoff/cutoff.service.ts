import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { computeTodayKey, vnDateStr, vnMinutes, CUTOFF_LABEL } from '@/common/week-lock';
import { mergePinned } from '@/menu/pinned';
import { NotificationsService } from '@/notifications/notifications.service';
import { minutesLeft, planCutoffReminder } from './cutoff-reminder';

@Injectable()
export class CutoffService {
  private readonly logger = new Logger(CutoffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Nhắc những người chưa đặt cơm, trước giờ chốt. Power Automate gọi vào (~09:45 T2–T6).
   *
   * Idempotent trong ngày: ghi CutoffReminder theo ngày VN, gọi lại lần hai trong cùng
   * ngày trả `skipped: 'already-sent'` chứ không bắn thêm.
   */
  async remind(now: Date = new Date()) {
    const week = await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) return { notified: 0, skipped: 'no-week' as const };

    const todayKey = computeTodayKey(week.startDate, now);
    const date = vnDateStr(now);

    const posted = todayKey ? (((week.dayMenu as Record<string, string[]> | null) ?? {})[todayKey] ?? []) : [];
    const pinned = posted.length
      ? (await this.prisma.dish.findMany({ where: { pinned: true }, select: { id: true } })).map((d) => d.id)
      : [];
    const menuCount = posted.length ? mergePinned(posted, pinned).length : 0;

    const users = await this.prisma.user.findMany({ where: { active: true }, select: { id: true } });
    const orders: any[] = await this.prisma.order.findMany({ where: { weekId: week.id } });
    const orderedIds = new Set(todayKey ? orders.filter((o) => !!o[todayKey]).map((o) => o.userId as string) : []);

    const plan = planCutoffReminder({
      todayKey,
      menuCount,
      nowMinutes: vnMinutes(now),
      alreadySent: !!(await this.prisma.cutoffReminder.findUnique({ where: { date } })),
      candidates: users.map((u) => ({ userId: u.id, ordered: orderedIds.has(u.id) })),
    });

    if (!plan.userIds.length) {
      return { notified: 0, skipped: plan.skipped };
    }

    const left = minutesLeft(vnMinutes(now));
    const body = `Còn ${left} phút (chốt ${CUTOFF_LABEL}) — hôm nay có ${menuCount} món. Bạn chưa đặt cơm.`;

    // Ghi mốc TRƯỚC khi gửi: flow gọi lại vì timeout thì thà bỏ sót một lần nhắc còn
    // hơn bắn trùng cho cả nhóm.
    await this.prisma.cutoffReminder.create({ data: { date, notified: plan.userIds.length } });

    // createFor ghi chuông in-app rồi tự đẩy push — một đường duy nhất, không bắn đôi.
    await this.notifications.createFor(plan.userIds, {
      type: 'CUTOFF_REMINDER',
      title: '⏰ Sắp tới giờ chốt cơm',
      body,
      weekId: week.id,
      url: '#order',
      tag: `cutoff-${date}`,
    });
    this.logger.log(`Nhắc chốt ${date}: nhắc ${plan.userIds.length} người.`);
    return { notified: plan.userIds.length, skipped: null };
  }
}
