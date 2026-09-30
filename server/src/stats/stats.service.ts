import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  computeTodayKey,
  CUTOFF_LABEL,
  DAY_KEYS,
  SHOP_DEADLINE_LABEL,
  vnDateStr,
  vnTodayKey,
  type DayKey,
} from '@/common/week-lock';
import { minutesLeftForShop } from '@/common/dispatch-window';
import { mergePinned } from '@/menu/pinned';
import { buildOrderText, type OrderNote } from '@/common/order-text';

const DAY_MS = 86_400_000;

/** "YYYY-MM" hợp lệ → [đầu tháng, đầu tháng sau) theo lịch VN, quy về UTC. */
function monthRange(month: string): { from: Date; to: Date; label: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  const now = new Date(Date.now() + 7 * 3600_000);
  const year = m ? Number(m[1]) : now.getUTCFullYear();
  const mon = m ? Number(m[2]) - 1 : now.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, mon, 1)),
    to: new Date(Date.UTC(year, mon + 1, 1)),
    label: `${String(mon + 1).padStart(2, '0')}/${year}`,
  };
}

/** Ngày dương lịch của cột `day` trong tuần bắt đầu từ `startDate`. */
function dateOfDay(startDate: Date | null, day: DayKey): Date | null {
  if (!startDate) return null;
  const s = new Date(startDate);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) + DAY_KEYS.indexOf(day) * DAY_MS);
}

/** Date → "YYYY-MM-DD" (PickupAssignment.date lưu dạng chuỗi nên so sánh theo chuỗi). */
function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  private async pinnedIds(): Promise<string[]> {
    const rows = await this.prisma.dish.findMany({ where: { pinned: true }, select: { id: true } });
    return rows.map((d) => d.id);
  }

  /**
   * Món tôi hay đặt trong 90 ngày gần nhất — dùng để xếp lại picker.
   *
   * Cố ý giới hạn cửa sổ thời gian: khẩu vị đổi theo mùa và theo quán, gom cả đời thì
   * món của nửa năm trước vẫn đè lên món đang thực sự hay ăn.
   */
  async myTopDishes(userId: string, days = 90) {
    const since = new Date(Date.now() - days * DAY_MS);
    const rows = await this.prisma.orderItem.groupBy({
      by: ['dishId'],
      where: { userId, createdAt: { gte: since } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 20,
    });
    return rows.map((r) => ({ dishId: r.dishId, count: r._sum.qty ?? 0 }));
  }

  /**
   * Thống kê của chính tôi trong một tháng.
   *
   * Suất và tiền tính lại từ Order/OrderItem theo đúng công thức của app (số suất × đơn
   * giá tuần + đồ uống) chứ không đọc một cột tổng — không có cột nào như vậy, và việc
   * gán ngày dương lịch cho từng cột của tuần chỉ chỗ này làm.
   */
  async myMonth(userId: string, month: string) {
    const { from, to, label } = monthRange(month);

    const weeks = await this.prisma.week.findMany({
      select: { id: true, startDate: true, unitPrice: true, dayMenu: true },
    });
    const orders: any[] = await this.prisma.order.findMany({ where: { userId } });
    const ordersByWeek = new Map<string, any>(orders.map((o) => [o.weekId, o]));
    const items = await this.prisma.orderItem.findMany({
      where: { userId },
      include: { dish: { select: { name: true, emoji: true, category: true, price: true } } },
    });

    const now = new Date();
    const inMonth = (d: Date | null) => !!d && d >= from && d < to;

    let servings = 0;
    let foodTotal = 0;
    // Mẫu số của tỉ lệ đi ăn: chỉ đếm ngày ĐÃ diễn ra mà nhóm có cơm — ngày quán nghỉ
    // hay ngày tương lai mà tính vào thì tỉ lệ của ai cũng thấp một cách vô nghĩa.
    let menuDays = 0;

    for (const w of weeks) {
      const order = ordersByWeek.get(w.id);
      const menu = (w.dayMenu as Record<string, string[]> | null) ?? {};
      for (const day of DAY_KEYS) {
        const date = dateOfDay(w.startDate, day);
        if (!inMonth(date) || (date as Date) > now) continue;
        const ate = !!order?.[day];
        // Ngày tính vào mẫu số = ngày nhóm CÓ cơm. Có thực đơn đã đăng là một dấu hiệu,
        // nhưng ngày chính mình đã ăn thì hiển nhiên cũng có cơm — đơn cũ và đơn admin
        // đặt hộ tồn tại ở những ngày chưa từng đăng thực đơn, bỏ qua thì tử số vượt
        // mẫu số và tỉ lệ ra trên 100%.
        if ((menu[day] ?? []).length || ate) menuDays++;
        if (ate) {
          servings++;
          foodTotal += w.unitPrice;
        }
      }
    }

    const weekById = new Map(weeks.map((w) => [w.id, w]));
    let drinksTotal = 0;
    const dishCount = new Map<string, { dishId: string; name: string; emoji: string | null; count: number }>();
    for (const it of items) {
      const w = weekById.get(it.weekId);
      if (!w) continue;
      if (!inMonth(dateOfDay(w.startDate, it.day as DayKey))) continue;
      if (it.dish.category === 'DRINK') {
        drinksTotal += it.qty * it.dish.price;
      }
      const cur = dishCount.get(it.dishId) ?? {
        dishId: it.dishId,
        name: it.dish.name,
        emoji: it.dish.emoji,
        count: 0,
      };
      cur.count += it.qty;
      dishCount.set(it.dishId, cur);
    }

    const pickups = await this.prisma.pickupAssignment.count({
      where: { userId, date: { gte: dayStr(from), lt: dayStr(to) } },
    });

    // Còn nợ là con số của MỌI tuần chưa xác nhận, không giới hạn trong tháng đang xem —
    // người dùng hỏi "tôi còn nợ bao nhiêu", không phải "nợ phát sinh trong tháng 9".
    const unpaid: any[] = await this.prisma.order.findMany({
      where: { userId, paymentStatus: { in: ['UNPAID', 'PENDING'] } },
      include: { week: { select: { unitPrice: true } } },
    });
    const unpaidWeekIds = unpaid.map((o) => o.weekId);
    const unpaidDrinks = unpaidWeekIds.length
      ? await this.prisma.orderItem.findMany({
          where: { userId, weekId: { in: unpaidWeekIds }, dish: { category: 'DRINK' } },
          include: { dish: { select: { price: true } } },
        })
      : [];
    const outstanding =
      unpaid.reduce((a, o) => a + DAY_KEYS.reduce((n, d) => n + (o[d] ? 1 : 0), 0) * o.week.unitPrice, 0) +
      unpaidDrinks.reduce((a, it) => a + it.qty * it.dish.price, 0);

    return {
      month: label,
      servings,
      foodTotal,
      drinksTotal,
      total: foodTotal + drinksTotal,
      menuDays,
      attendanceRate: menuDays ? servings / menuDays : 0,
      pickups,
      outstanding,
      topDishes: [...dishCount.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    };
  }

  /**
   * Một màn "hôm nay" cho admin: bao nhiêu suất, món nào mấy phần, ghi chú riêng, đã
   * gửi quán chưa, ai đi lấy — kèm sẵn text dán cho quán.
   */
  async today() {
    const week = await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) {
      throw new NotFoundException('Chưa có tuần nào đang mở');
    }

    const date = vnDateStr();
    const todayKey = computeTodayKey(week.startDate) ?? vnTodayKey();

    const posted = ((week.dayMenu as Record<string, string[]> | null) ?? {})[todayKey] ?? [];
    const menuIds = posted.length ? mergePinned(posted, await this.pinnedIds()) : [];

    const orders: any[] = await this.prisma.order.findMany({
      where: { weekId: week.id },
      include: { user: { select: { id: true, fullName: true } } },
    });
    const items = await this.prisma.orderItem.findMany({
      where: { weekId: week.id, day: todayKey },
      include: {
        dish: { select: { name: true, emoji: true, category: true } },
        user: { select: { id: true, fullName: true } },
      },
    });

    const eating = orders.filter((o) => !!o[todayKey]);
    const mains = new Map<string, { dishId: string; name: string; emoji: string | null; qty: number }>();
    const drinks = new Map<string, { dishId: string; name: string; emoji: string | null; qty: number }>();
    const dishesByUser = new Map<string, string[]>();

    for (const it of items) {
      const bucket = it.dish.category === 'DRINK' ? drinks : mains;
      const cur = bucket.get(it.dishId) ?? { dishId: it.dishId, name: it.dish.name, emoji: it.dish.emoji, qty: 0 };
      cur.qty += it.qty;
      bucket.set(it.dishId, cur);
      if (it.dish.category !== 'DRINK') {
        // Set: cùng món ghi hai lần thì ghi chú hiện "A, A" trông như lỗi.
        dishesByUser.set(it.userId, [...new Set([...(dishesByUser.get(it.userId) ?? []), it.dish.name])]);
      }
    }

    const drinksByUser = new Map<string, string[]>();
    for (const it of items) {
      if (it.dish.category !== 'DRINK') continue;
      drinksByUser.set(it.userId, [...(drinksByUser.get(it.userId) ?? []), `${it.dish.name} ×${it.qty}`]);
    }

    const notes: OrderNote[] = eating
      .map((o) => ({
        fullName: o.user.fullName as string,
        dishes: dishesByUser.get(o.userId as string) ?? [],
        note: (((o.notes as Record<string, string> | null) ?? {})[todayKey] ?? '').trim(),
      }))
      .filter((n) => !!n.note);

    const [dispatch, pickup] = await Promise.all([
      this.prisma.dailyDispatch.findUnique({ where: { date }, include: { sentBy: { select: { fullName: true } } } }),
      this.prisma.pickupAssignment.findUnique({ where: { date }, include: { user: { select: { fullName: true } } } }),
    ]);

    const byQty = <T extends { qty: number; name: string }>(a: T, b: T) =>
      b.qty - a.qty || a.name.localeCompare(b.name, 'vi');
    const mainList = [...mains.values()].sort(byQty);
    const drinkList = [...drinks.values()].sort(byQty);

    return {
      date,
      dayKey: todayKey,
      weekId: week.id,
      unitPrice: week.unitPrice,
      menuPosted: menuIds.length > 0,
      menuCount: menuIds.length,
      /** Số hộp cơm = số NGƯỜI ăn. Một người mix nhiều món vẫn một hộp. */
      servings: eating.length,
      totalMoney: eating.length * week.unitPrice,
      mains: mainList,
      drinks: drinkList,
      notes,
      dispatch: {
        sent: !!dispatch?.sentAt,
        sentAt: dispatch?.sentAt ?? null,
        sentBy: dispatch?.sentBy?.fullName ?? null,
      },
      pickup: pickup ? { userId: pickup.userId, fullName: pickup.user.fullName } : null,
      cutoff: CUTOFF_LABEL,
      shopDeadline: SHOP_DEADLINE_LABEL,
      minutesLeft: minutesLeftForShop(),
      /** Ai ăn gì — gồm cả người chỉ gọi nước, để người đi mua không sót. */
      people: [
        ...eating.map((o) => ({
          userId: o.userId as string,
          fullName: o.user.fullName as string,
          eat: true,
          dishes: dishesByUser.get(o.userId as string) ?? [],
          drinks: drinksByUser.get(o.userId as string) ?? [],
          note: (((o.notes as Record<string, string> | null) ?? {})[todayKey] ?? '').trim(),
        })),
        ...orders
          .filter((o) => !o[todayKey] && (drinksByUser.get(o.userId as string) ?? []).length > 0)
          .map((o) => ({
            userId: o.userId as string,
            fullName: o.user.fullName as string,
            eat: false,
            dishes: [],
            drinks: drinksByUser.get(o.userId as string) ?? [],
            note: '',
          })),
      ],
      orderText: buildOrderText({
        date,
        boxes: eating.length,
        mains: mainList.map((m) => ({ name: m.name, qty: m.qty })),
        drinks: drinkList.map((d) => ({ name: d.name, qty: d.qty })),
        notes,
      }),
    };
  }
}
