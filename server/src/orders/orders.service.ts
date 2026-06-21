import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { CUTOFF_LABEL, computeLockedDays, DAY_KEYS, DAY_LABEL, type DayKey } from '@/common/week-lock';
import { ReportPaymentDto, SetDayDetailDto, SetPaymentStatusDto, UpsertOrderDto } from './dto/order.dto';

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private days(dto: UpsertOrderDto) {
    return {
      mon: !!dto.mon,
      tue: !!dto.tue,
      wed: !!dto.wed,
      thu: !!dto.thu,
      fri: !!dto.fri,
      sat: !!dto.sat,
      sun: !!dto.sun,
    };
  }

  private lockError(day: DayKey): ForbiddenException {
    return new ForbiddenException(
      `${DAY_LABEL[day]} đã chốt (quá hạn ${CUTOFF_LABEL} hoặc đã qua) — chỉ admin sửa được.`,
    );
  }

  /**
   * @param enforceLock true khi user tự sửa (chặn ngày đã khoá). Admin sửa hộ thì false.
   */
  async upsert(userId: string, dto: UpsertOrderDto, enforceLock = false) {
    const week = await this.prisma.week.findUnique({ where: { id: dto.weekId } });
    if (!week) {
      throw new NotFoundException('Không tìm thấy tuần');
    }
    const days = this.days(dto);

    if (enforceLock) {
      const locked = computeLockedDays(week.startDate);
      const current: any = await this.prisma.order.findUnique({
        where: { weekId_userId: { weekId: dto.weekId, userId } },
      });
      for (const key of DAY_KEYS) {
        const prev = current ? !!current[key] : false;
        if (locked[key] && days[key] !== prev) {
          throw this.lockError(key);
        }
      }
    }

    return this.prisma.order.upsert({
      where: { weekId_userId: { weekId: dto.weekId, userId } },
      update: days,
      create: { weekId: dto.weekId, userId, ...days },
    });
  }

  /**
   * Đặt chi tiết 1 ngày: bật/tắt ăn cơm + thay toàn bộ món & đồ uống của ngày đó.
   * @param enforceLock true khi user tự sửa (chặn ngày đã khoá). Admin sửa hộ thì false.
   */
  async setDayDetail(userId: string, dto: SetDayDetailDto, enforceLock = false) {
    const week = await this.prisma.week.findUnique({ where: { id: dto.weekId } });
    if (!week) {
      throw new NotFoundException('Không tìm thấy tuần');
    }
    const day = dto.day;
    if (enforceLock && computeLockedDays(week.startDate)[day]) {
      throw this.lockError(day);
    }

    const food = dto.eat ? (dto.food ?? []) : []; // không ăn cơm thì bỏ luôn món
    const drinks = (dto.drinks ?? []).filter((d) => d.qty > 0);

    // Chặn dishId rác / không tồn tại (tránh lỗi khoá ngoại)
    const dishIds = [...new Set([...food, ...drinks.map((d) => d.dishId)])];
    if (dishIds.length) {
      const count = await this.prisma.dish.count({ where: { id: { in: dishIds } } });
      if (count !== dishIds.length) {
        throw new BadRequestException('Có món không tồn tại');
      }
    }

    await this.prisma.$transaction([
      this.prisma.order.upsert({
        where: { weekId_userId: { weekId: dto.weekId, userId } },
        update: { [day]: dto.eat },
        create: { weekId: dto.weekId, userId, [day]: dto.eat },
      }),
      this.prisma.orderItem.deleteMany({ where: { weekId: dto.weekId, userId, day } }),
      this.prisma.orderItem.createMany({
        data: [
          ...food.map((dishId) => ({ weekId: dto.weekId, userId, day, dishId, qty: 1 })),
          ...drinks.map((d) => ({ weekId: dto.weekId, userId, day, dishId: d.dishId, qty: d.qty })),
        ],
      }),
    ]);

    return { ok: true };
  }

  /** Lấy đơn + tổng tiền + nhãn tuần + tên (cho thông báo). */
  private async orderInfo(weekId: string, userId: string) {
    const order: any = await this.prisma.order.findUnique({
      where: { weekId_userId: { weekId, userId } },
      include: { week: { select: { label: true, unitPrice: true } }, user: { select: { fullName: true } } },
    });
    if (!order) {
      throw new NotFoundException('Chưa có đăng ký cho tuần này');
    }
    const servings = DAY_KEYS.reduce((a, d) => a + (order[d] ? 1 : 0), 0);
    const items = await this.prisma.orderItem.findMany({ where: { weekId, userId }, include: { dish: true } });
    const drinksTotal = items.reduce((a, it) => a + (it.dish.category === 'DRINK' ? it.qty * it.dish.price : 0), 0);
    const total = servings * order.week.unitPrice + drinksTotal;
    return { order, total, label: order.week.label as string, fullName: order.user.fullName as string };
  }

  /** User báo (hoặc huỷ báo) đã chuyển khoản → PENDING/UNPAID + báo admin. */
  async reportPayment(userId: string, dto: ReportPaymentDto) {
    const { order, total, label, fullName } = await this.orderInfo(dto.weekId, userId);
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Khoản này đã được xác nhận thanh toán.');
    }

    if (dto.report) {
      if (total <= 0) {
        throw new BadRequestException('Chưa có khoản cần thanh toán.');
      }
      await this.prisma.order.update({
        where: { weekId_userId: { weekId: dto.weekId, userId } },
        data: { paymentStatus: 'PENDING', reportedAt: new Date() },
      });
      await this.notifications.createFor(await this.notifications.adminIds(), {
        type: 'PAYMENT_PENDING',
        title: '💸 Yêu cầu xác nhận thanh toán',
        body: `${fullName} báo đã chuyển ${vnd(total)} — tuần ${label}.`,
        weekId: dto.weekId,
      });
    } else {
      await this.prisma.order.update({
        where: { weekId_userId: { weekId: dto.weekId, userId } },
        data: { paymentStatus: 'UNPAID', reportedAt: null },
      });
    }
    return { ok: true };
  }

  /** Admin đặt trạng thái thanh toán → đồng bộ paid + báo cho user. */
  async setPaymentStatus(dto: SetPaymentStatusDto) {
    const { label } = await this.orderInfo(dto.weekId, dto.userId);
    const paid = dto.status === 'PAID';
    await this.prisma.order.update({
      where: { weekId_userId: { weekId: dto.weekId, userId: dto.userId } },
      data: {
        paymentStatus: dto.status,
        paid,
        paidAt: paid ? new Date() : null,
        ...(dto.status === 'UNPAID' ? { reportedAt: null } : {}),
      },
    });

    if (dto.status === 'PAID') {
      await this.notifications.createFor([dto.userId], {
        type: 'PAYMENT_CONFIRMED',
        title: '✅ Đã xác nhận thanh toán',
        body: `Admin đã xác nhận bạn thanh toán tuần ${label}. Cảm ơn!`,
        weekId: dto.weekId,
      });
    } else if (dto.status === 'UNPAID') {
      await this.notifications.createFor([dto.userId], {
        type: 'PAYMENT_REJECTED',
        title: '↩️ Chưa nhận được tiền',
        body: `Admin chưa nhận được khoản tuần ${label}, vui lòng kiểm tra lại.`,
        weekId: dto.weekId,
      });
    }
    return { ok: true };
  }
}
