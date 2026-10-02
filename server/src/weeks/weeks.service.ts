import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateWeekDto, UpdateWeekDto } from './dto/week.dto';
import {
  CUTOFF_LABEL,
  CUTOFF_MINUTES,
  computeDayDates,
  computeDayLocks,
  computeLockedDays,
  computeTodayKey,
  DAY_KEYS,
  nextWeekLabel,
  SHOP_DEADLINE_LABEL,
  SHOP_DEADLINE_MINUTES,
  weekRollover,
  type DayKey,
} from '@/common/week-lock';
import { mergePinnedIntoDayMenu } from '@/menu/pinned';
import { isTodayDispatchSent } from '@/common/dispatch-sent';

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
    const rolled = await this.rolloverIfStale(week.startDate);
    return this.getGrid(rolled?.id ?? week.id);
  }

  /**
   * Sang tuần thì tự mở tuần mới, ngay lúc có người mở app.
   *
   * Kiểm tra lúc đọc chứ không dùng cron: instance Render free ngủ qua cuối tuần
   * nên cron không chạy đúng lúc, còn đường này thì luôn kích hoạt vào lần đầu
   * có người vào app trong tuần mới.
   *
   * Trả về tuần vừa tạo, hoặc null khi chưa tới lúc phải tạo.
   */
  private async rolloverIfStale(activeStart: Date | null) {
    const weekStart = weekRollover(activeStart);
    if (!weekStart) return null;

    return this.prisma.$transaction(async (tx) => {
      // Hai người cùng mở app một lúc -> cả hai cùng thấy tuần cũ. Query lại trong
      // transaction để người tới sau dùng tuần người trước vừa tạo, không tạo trùng.
      const existing = await tx.week.findFirst({ where: { startDate: weekStart } });
      if (existing) {
        if (!existing.isActive) {
          await tx.week.updateMany({ data: { isActive: false }, where: { isActive: true } });
          await tx.week.update({ where: { id: existing.id }, data: { isActive: true } });
        }
        return existing;
      }

      const previous = await tx.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
      await tx.week.updateMany({ data: { isActive: false }, where: { isActive: true } });
      return tx.week.create({
        data: {
          label: nextWeekLabel(weekStart),
          startDate: weekStart,
          unitPrice: previous?.unitPrice ?? 25000,
          isActive: true,
        },
      });
    });
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
        /** Ghi chú đặt cơm theo ngày, vd { wed: 'ít cơm' }. Ngày không ghi thì không có khoá. */
        notes: (o?.notes as Record<string, string> | null) ?? {},
        servings,
        foodTotal,
        drinksTotal,
        total: foodTotal + drinksTotal,
        paid: o ? o.paid : false,
        paymentStatus: o ? o.paymentStatus : 'UNPAID',
        reportedAt: o ? o.reportedAt : null,
        paidAt: o ? o.paidAt : null,
      };
    });

    const perDay = Object.fromEntries(
      DAYS.map((d) => [d, members.reduce((a, m) => a + (m.days[d] ? 1 : 0), 0)]),
    ) as Record<DayKey, number>;
    const totalServings = members.reduce((a, m) => a + m.servings, 0);
    const totalFood = totalServings * week.unitPrice;
    const totalDrinks = members.reduce((a, m) => a + m.drinksTotal, 0);

    // `week.dayMenu` giữ NGUYÊN lựa chọn của admin (màn đăng thực đơn ghi đè lên nó).
    // `effectiveDayMenu` là thứ user thấy trong picker: đã cộng thêm món ghim. Tách đôi để
    // admin lưu thực đơn không vô tình ghi cứng món ghim vào tuần.
    const pinnedDishes = await this.prisma.dish.findMany({ where: { pinned: true }, select: { id: true } });
    const now = new Date();
    const dispatchSent = await isTodayDispatchSent(this.prisma, now);
    const effectiveDayMenu = mergePinnedIntoDayMenu(
      week.dayMenu as Record<string, string[]> | null,
      pinnedDishes.map((d) => d.id),
    );

    return {
      week,
      effectiveDayMenu,
      members,
      totals: { perDay, totalServings, totalFood, totalDrinks, totalMoney: totalFood + totalDrinks },
      lockedDays: computeLockedDays(week.startDate, now, dispatchSent),
      // Kèm lý do để FE nói đúng chuyện ("đã gửi quán" vs "đã qua"), `lockedDays`
      // giữ lại cho các client chưa đọc field này.
      lockReasons: computeDayLocks(week.startDate, now, dispatchSent),
      dispatchSent,
      todayKey: computeTodayKey(week.startDate, now),
      dates: computeDayDates(week.startDate),
      cutoff: { minutes: CUTOFF_MINUTES, label: CUTOFF_LABEL },
      // Mốc quán ngừng nhận đơn — lưới an toàn khi hôm đó không ai bấm "đã gửi".
      shopDeadline: { minutes: SHOP_DEADLINE_MINUTES, label: SHOP_DEADLINE_LABEL },
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
