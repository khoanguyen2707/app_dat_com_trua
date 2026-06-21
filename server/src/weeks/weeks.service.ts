import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateWeekDto, UpdateWeekDto } from './dto/week.dto';
import {
  CUTOFF_LABEL,
  CUTOFF_MINUTES,
  computeDayDates,
  computeLockedDays,
  DAY_KEYS,
  type DayKey,
} from '@/common/week-lock';

const DAYS = DAY_KEYS;

/** Món/đồ uống 1 người chọn cho 1 ngày (food = danh sách dishId, drinks = dishId + số lượng). */
type DayItems = { food: string[]; drinks: { dishId: string; qty: number }[] };
const emptyDayItems = (): Record<DayKey, DayItems> => {
  const out = {} as Record<DayKey, DayItems>;
  for (const d of DAYS) {
    out[d] = { food: [], drinks: [] };
  }
  return out;
};

@Injectable()
export class WeeksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tổng tiền đồ uống của 1 danh sách OrderItem (đã include dish). */
  private drinksTotal(items: { qty: number; dish: { category: string; price: number } }[]): number {
    return items.reduce((a, it) => a + (it.dish.category === 'DRINK' ? it.qty * it.dish.price : 0), 0);
  }

  async findAll() {
    const weeks = await this.prisma.week.findMany({ orderBy: { createdAt: 'desc' } });
    const result: any[] = [];
    for (const w of weeks) {
      const orders: any[] = await this.prisma.order.findMany({ where: { weekId: w.id } });
      const items = await this.prisma.orderItem.findMany({ where: { weekId: w.id }, include: { dish: true } });
      let servings = 0;
      let memberCount = 0;
      for (const o of orders) {
        const s = DAYS.reduce((a, d) => a + (o[d] ? 1 : 0), 0);
        servings += s;
        if (s > 0) memberCount += 1;
      }
      const foodTotal = servings * w.unitPrice;
      const drinksTotal = this.drinksTotal(items);
      result.push({ ...w, servings, foodTotal, drinksTotal, total: foodTotal + drinksTotal, memberCount });
    }
    return result;
  }

  async getActive() {
    const week = await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) {
      throw new NotFoundException('Chưa có tuần nào đang mở');
    }
    return this.getGrid(week.id);
  }

  async getGrid(weekId: string) {
    const week = await this.prisma.week.findUnique({ where: { id: weekId } });
    if (!week) {
      throw new NotFoundException('Không tìm thấy tuần');
    }
    const users = await this.prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, color: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    const orders: any[] = await this.prisma.order.findMany({ where: { weekId } });
    const byUser = new Map<string, any>(orders.map((o: any) => [o.userId, o] as [string, any]));

    const items = await this.prisma.orderItem.findMany({ where: { weekId }, include: { dish: true } });
    const itemsByUser = new Map<string, Record<DayKey, DayItems>>();
    const drinksByUser = new Map<string, number>();
    for (const it of items) {
      const day = it.day as DayKey;
      if (!DAYS.includes(day)) continue;
      let byDay = itemsByUser.get(it.userId);
      if (!byDay) {
        byDay = emptyDayItems();
        itemsByUser.set(it.userId, byDay);
      }
      if (it.dish.category === 'DRINK') {
        byDay[day].drinks.push({ dishId: it.dishId, qty: it.qty });
        drinksByUser.set(it.userId, (drinksByUser.get(it.userId) ?? 0) + it.qty * it.dish.price);
      } else {
        byDay[day].food.push(it.dishId);
      }
    }

    const members = users.map((u) => {
      const o = byUser.get(u.id);
      const days = Object.fromEntries(DAYS.map((d) => [d, o ? !!o[d] : false])) as Record<DayKey, boolean>;
      const servings = DAYS.reduce((a, d) => a + (days[d] ? 1 : 0), 0);
      const foodTotal = servings * week.unitPrice;
      const drinksTotal = drinksByUser.get(u.id) ?? 0;
      return {
        userId: u.id,
        fullName: u.fullName,
        color: u.color,
        role: u.role,
        days,
        items: itemsByUser.get(u.id) ?? emptyDayItems(),
        servings,
        foodTotal,
        drinksTotal,
        total: foodTotal + drinksTotal,
        paid: o ? o.paid : false,
      };
    });

    const perDay = Object.fromEntries(
      DAYS.map((d) => [d, members.reduce((a, m) => a + (m.days[d] ? 1 : 0), 0)]),
    ) as Record<DayKey, number>;
    const totalServings = members.reduce((a, m) => a + m.servings, 0);
    const totalFood = totalServings * week.unitPrice;
    const totalDrinks = members.reduce((a, m) => a + m.drinksTotal, 0);

    return {
      week,
      members,
      totals: { perDay, totalServings, totalFood, totalDrinks, totalMoney: totalFood + totalDrinks },
      lockedDays: computeLockedDays(week.startDate),
      dates: computeDayDates(week.startDate),
      cutoff: { minutes: CUTOFF_MINUTES, label: CUTOFF_LABEL },
    };
  }

  /** "2026-06-15" -> 00:00 UTC của ngày đó (mốc lịch VN, tránh lệch múi giờ). */
  private parseStartDate(value?: string | null): Date | null {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!m) return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  async create(dto: CreateWeekDto) {
    if (dto.isActive) {
      await this.prisma.week.updateMany({ data: { isActive: false }, where: { isActive: true } });
    }
    return this.prisma.week.create({
      data: {
        label: dto.label,
        startDate: this.parseStartDate(dto.startDate),
        unitPrice: dto.unitPrice ?? 25000,
        isActive: dto.isActive ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateWeekDto) {
    await this.ensure(id);
    if (dto.isActive) {
      await this.prisma.week.updateMany({ data: { isActive: false }, where: { isActive: true, NOT: { id } } });
    }
    const { startDate, ...rest } = dto;
    return this.prisma.week.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: this.parseStartDate(startDate) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.week.delete({ where: { id } });
    return { message: 'Đã xoá tuần' };
  }

  private async ensure(id: string) {
    const w = await this.prisma.week.findUnique({ where: { id } });
    if (!w) {
      throw new NotFoundException('Không tìm thấy tuần');
    }
  }
}
