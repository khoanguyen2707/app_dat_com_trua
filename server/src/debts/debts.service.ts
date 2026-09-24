import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { DAY_KEYS, type DayKey } from '@/common/week-lock';
import { buildDebtReport, groupDebts, type DebtOrderInput, type DebtStatus } from '@/common/debt';

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Mọi đơn chưa được xác nhận (UNPAID/PENDING) trên tất cả các tuần, kèm đồ uống. */
  private async loadOrders(userId?: string): Promise<DebtOrderInput[]> {
    const orders: any[] = await this.prisma.order.findMany({
      where: { paymentStatus: { in: ['UNPAID', 'PENDING'] }, ...(userId ? { userId } : {}) },
      include: {
        week: { select: { label: true, unitPrice: true, startDate: true, createdAt: true } },
        user: { select: { fullName: true, teamsEmail: true, email: true } },
      },
    });
    if (!orders.length) return [];

    const items = await this.prisma.orderItem.findMany({
      where: {
        weekId: { in: [...new Set(orders.map((o) => o.weekId))] },
        ...(userId ? { userId } : { userId: { in: [...new Set(orders.map((o) => o.userId))] } }),
        dish: { category: 'DRINK' },
      },
      include: { dish: { select: { name: true, price: true } } },
    });
    const drinksByOrder = new Map<string, { name: string; qty: number; price: number }[]>();
    for (const it of items) {
      const key = `${it.weekId}|${it.userId}`;
      const list = drinksByOrder.get(key) ?? [];
      const same = list.find((d) => d.name === it.dish.name && d.price === it.dish.price);
      if (same) same.qty += it.qty;
      else list.push({ name: it.dish.name, qty: it.qty, price: it.dish.price });
      drinksByOrder.set(key, list);
    }

    return orders.map((o) => ({
      weekId: o.weekId,
      weekLabel: o.week.label,
      weekSort: o.week.startDate ?? o.week.createdAt,
      unitPrice: o.week.unitPrice,
      userId: o.userId,
      fullName: o.user.fullName,
      email: o.user.teamsEmail || o.user.email || null,
      days: Object.fromEntries(DAY_KEYS.map((d) => [d, !!o[d]])) as Record<DayKey, boolean>,
      drinks: drinksByOrder.get(`${o.weekId}|${o.userId}`) ?? [],
      status: o.paymentStatus as DebtStatus,
      reportedAt: o.reportedAt,
    }));
  }

  /** Admin: tất cả người còn nợ. */
  async all() {
    return groupDebts(await this.loadOrders());
  }

  /** User: các tuần mình còn nợ (rỗng = không nợ). */
  async mine(userId: string) {
    const [me] = groupDebts(await this.loadOrders(userId));
    return me ?? { userId, fullName: '', weeks: [], total: 0, pendingTotal: 0 };
  }

  /** Báo cáo nhắc nợ cho Power Automate (thứ 2 9h, thứ 6 15h). */
  async report() {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { fullName: true, teamsEmail: true, email: true },
      orderBy: { createdAt: 'asc' },
    });
    return buildDebtReport(
      await this.all(),
      this.config.get<string>('APP_URL')?.trim() || '',
      admins.map((a) => ({ name: a.fullName, email: a.teamsEmail || a.email || null })),
    );
  }
}
