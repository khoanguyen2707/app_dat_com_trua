import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CUTOFF_LABEL, DAY_LABEL, SHOP_DEADLINE_LABEL, vnDateStr, vnTodayKey, type DayKey } from '@/common/week-lock';
import {
  dispatchLevel,
  LEVEL_ORDER,
  minutesLeftForShop,
  pickAssignee,
  type DispatchLevel,
} from '@/common/dispatch-window';

/** Một người cần được @mention trong tin nhắn Teams. */
export type Mention = { name: string; email: string | null; role: 'pickup' | 'admin' };

export type DispatchStatus = {
  date: string;
  /** Mức cần nhắc NGAY BÂY GIỜ; 'idle' = flow không phải làm gì. */
  level: DispatchLevel;
  sent: boolean;
  sentAt: string | null;
  sentBy: string | null;
  servings: number;
  cutoff: string;
  shopDeadline: string;
  minutesLeft: number;
  /** Đúng một người chịu trách nhiệm lúc này — flow nhắn riêng cho người này. */
  assignee: Mention | null;
  mentions: Mention[];
  text: string;
  html: string;
};

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/**
 * Nhắc gửi đơn cơm cho quán, và theo dõi đơn đã gửi hay chưa.
 *
 * Việc gửi Zalo vẫn do người làm — Zalo không có API đăng vào nhóm chat, nên thứ
 * tự động hoá được là *nhắc* và *phát hiện chưa ai làm*, chứ không phải cú gửi.
 *
 * Kích hoạt từ Power Automate gọi vào đây theo lịch, giống `POST /pickup/today`:
 * cron trong server không đáng tin vì instance Render free ngủ.
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Đọc trạng thái mà KHÔNG ghi lại mức nhắc (để xem, không kích hoạt). */
  peek() {
    return this.build(false);
  }

  /**
   * Flow gọi mỗi vài phút. Trả mức cần nhắc rồi ghi nhận luôn, nên cùng một mức
   * không bị nhắc hai lần dù flow gọi bao nhiêu lượt.
   */
  poll() {
    return this.build(true);
  }

  /** Đánh dấu đã gửi đơn cho quán. */
  async markSent(userId: string | null) {
    const date = vnDateStr();
    const row = await this.prisma.dailyDispatch.upsert({
      where: { date },
      update: { sentAt: new Date(), sentById: userId },
      create: { date, sentAt: new Date(), sentById: userId, reminded: 'idle' },
      include: { sentBy: { select: { fullName: true } } },
    });
    return { date, sentAt: row.sentAt, sentBy: row.sentBy?.fullName ?? null };
  }

  /** Bỏ đánh dấu (bấm nhầm). */
  async clearSent() {
    const date = vnDateStr();
    await this.prisma.dailyDispatch.upsert({
      where: { date },
      update: { sentAt: null, sentById: null },
      create: { date, reminded: 'idle' },
    });
    return { date, sentAt: null, sentBy: null };
  }

  /** Tìm người theo email Teams — để nút bấm từ Teams ghi đúng ai đã gửi. */
  async findByTeamsEmail(email?: string) {
    if (!email?.trim()) return null;
    const needle = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { teamsEmail: { equals: needle, mode: 'insensitive' } },
          { email: { equals: needle, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private async build(record: boolean): Promise<DispatchStatus> {
    const now = new Date();
    const date = vnDateStr(now);
    const day = vnTodayKey(now);

    const row = await this.prisma.dailyDispatch.findUnique({
      where: { date },
      include: { sentBy: { select: { fullName: true } } },
    });
    const sent = !!row?.sentAt;
    const alreadySent = (row?.reminded ?? 'idle') as DispatchLevel;

    const orders = await this.todayOrders(day);
    const level = dispatchLevel({ now, sent, hasOrders: orders.length > 0, alreadySent });

    if (record && level !== 'idle' && LEVEL_ORDER[level] > LEVEL_ORDER[alreadySent]) {
      await this.prisma.dailyDispatch.upsert({
        where: { date },
        update: { reminded: level },
        create: { date, reminded: level },
      });
    }

    const mentions = await this.mentions(date);
    const minutesLeft = minutesLeftForShop(now);

    return {
      date,
      level,
      sent,
      sentAt: row?.sentAt?.toISOString() ?? null,
      sentBy: row?.sentBy?.fullName ?? null,
      servings: orders.filter((o) => o.eat).length,
      cutoff: CUTOFF_LABEL,
      shopDeadline: SHOP_DEADLINE_LABEL,
      minutesLeft,
      assignee: pickAssignee(mentions, level),
      mentions,
      text: this.buildText(day, orders, level, minutesLeft),
      html: this.buildHtml(day, orders, level, minutesLeft),
    };
  }

  /** Đơn của hôm nay: mỗi người ăn gì, uống gì, dặn gì. */
  private async todayOrders(day: DayKey) {
    const week = await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) return [];

    const orders: any[] = await this.prisma.order.findMany({
      where: { weekId: week.id },
      include: { user: { select: { fullName: true } } },
    });
    const items = await this.prisma.orderItem.findMany({
      where: { weekId: week.id, day },
      include: { dish: true },
    });

    return orders
      .map((o) => {
        const mine = items.filter((i) => i.userId === o.userId);
        const notes = (o.notes as Record<string, string> | null) ?? {};
        return {
          name: o.user.fullName as string,
          eat: !!o[day],
          food: mine.filter((i) => i.dish.category !== 'DRINK').map((i) => i.dish.name),
          drinks: mine.filter((i) => i.dish.category === 'DRINK').map((i) => `${i.dish.name} x${i.qty}`),
          note: notes[day] ?? '',
        };
      })
      .filter((o) => o.eat || o.drinks.length > 0);
  }

  /**
   * Ai cần bị tag: người đi lấy cơm hôm nay VÀ tất cả admin.
   *
   * Tag cả hai là có chủ đích — một người nghỉ thì người kia vẫn thấy, đúng tình
   * huống đã làm cả nhóm mất bữa trưa.
   */
  private async mentions(date: string): Promise<Mention[]> {
    const out: Mention[] = [];

    const pickup = await this.prisma.pickupAssignment.findUnique({
      where: { date },
      include: { user: { select: { fullName: true, teamsEmail: true, email: true } } },
    });
    if (pickup) {
      out.push({
        name: pickup.user.fullName,
        email: pickup.user.teamsEmail || pickup.user.email,
        role: 'pickup',
      });
    }

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { id: true, fullName: true, teamsEmail: true, email: true },
    });
    for (const a of admins) {
      out.push({ name: a.fullName, email: a.teamsEmail || a.email, role: 'admin' });
    }
    return out;
  }

  private heading(level: DispatchLevel, minutesLeft: number) {
    if (level === 'escalate') return `🚨 CHƯA AI GỬI ĐƠN CHO QUÁN — còn ${minutesLeft} phút`;
    if (level === 'second') return `⏰ Nhắc lại: đơn cơm trưa chưa được gửi — còn ${minutesLeft} phút`;
    return '🍚 Đơn cơm trưa hôm nay — gửi cho quán giúp nhé';
  }

  private buildText(
    day: DayKey,
    orders: { name: string; eat: boolean; food: string[]; drinks: string[]; note: string }[],
    level: DispatchLevel,
    minutesLeft: number,
  ) {
    const appUrl = this.config.get<string>('APP_URL')?.trim() || '';
    const lines = orders.map((o) => {
      const parts: string[] = [];
      if (o.eat) parts.push(o.food.length ? o.food.join(', ') : 'Cơm');
      if (o.drinks.length) parts.push(o.drinks.join(', '));
      if (o.note) parts.push(`(${o.note})`);
      return `- ${o.name}: ${parts.join(' + ')}`;
    });
    const head = `${this.heading(level, minutesLeft)}\n${DAY_LABEL[day]} · ${orders.filter((o) => o.eat).length} suất`;
    const foot = `Quán ngừng nhận lúc ${SHOP_DEADLINE_LABEL}.${appUrl ? ` Xem đơn: ${appUrl}` : ''}`;
    return [head, ...lines, foot].join('\n');
  }

  private buildHtml(
    day: DayKey,
    orders: { name: string; eat: boolean; food: string[]; drinks: string[]; note: string }[],
    level: DispatchLevel,
    minutesLeft: number,
  ) {
    const appUrl = this.config.get<string>('APP_URL')?.trim() || '';
    const rows = orders
      .map((o) => {
        const parts: string[] = [];
        if (o.eat) parts.push(esc(o.food.length ? o.food.join(', ') : 'Cơm'));
        if (o.drinks.length) parts.push(esc(o.drinks.join(', ')));
        const note = o.note ? ` <i>(${esc(o.note)})</i>` : '';
        return `<li><b>${esc(o.name)}</b>: ${parts.join(' + ')}${note}</li>`;
      })
      .join('');
    return [
      `<p><b>${esc(this.heading(level, minutesLeft))}</b></p>`,
      `<p>${DAY_LABEL[day]} · ${orders.filter((o) => o.eat).length} suất</p>`,
      `<ul>${rows}</ul>`,
      `<p>Quán ngừng nhận lúc <b>${SHOP_DEADLINE_LABEL}</b>.${appUrl ? ` 👉 <a href="${esc(appUrl)}">Xem đơn</a>` : ''}</p>`,
    ].join('');
  }

  /** Dùng cho endpoint admin xem nhanh trạng thái hôm nay. */
  async requireWeek() {
    const week = await this.prisma.week.findFirst({ where: { isActive: true } });
    if (!week) throw new NotFoundException('Chưa có tuần nào đang mở');
    return week;
  }
}
