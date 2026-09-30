import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { CUTOFF_LABEL, computeLockedDays, DAY_KEYS, DAY_LABEL, type DayKey } from '@/common/week-lock';
import { DebtsService } from '@/debts/debts.service';
import { debtLockMessage } from '@/common/debt-gate';
import { mergePinned } from '@/menu/pinned';
import {
  ReportPaymentBulkDto,
  ReportPaymentDto,
  SetDayDetailDto,
  SetPaymentStatusBulkDto,
  SetPaymentStatusDto,
  UpsertOrderDto,
} from './dto/order.dto';

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly debts: DebtsService,
  ) {}

  /** Id các món "luôn có" — cộng vào thực đơn mọi ngày admin đã đăng. */
  private async pinnedIds(): Promise<string[]> {
    const rows = await this.prisma.dish.findMany({ where: { pinned: true }, select: { id: true } });
    return rows.map((d) => d.id);
  }

  private async assertNotDebtLocked(userId: string): Promise<void> {
    const gate = await this.debts.gate(userId);
    if (gate.locked) {
      throw new ForbiddenException(debtLockMessage(gate));
    }
  }

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

  private noMenuError(day: DayKey): ForbiddenException {
    return new ForbiddenException(`${DAY_LABEL[day]} chưa có thực đơn — chờ admin đăng thực đơn rồi mới đặt được.`);
  }

  /**
   * Danh sách dishId đặt được trong ngày `day`; null = admin chưa đăng thực đơn.
   *
   * Món pinned được cộng thêm vào ngày ĐÃ đăng, nhưng cố ý không biến ngày chưa đăng
   * thành ngày mở — cổng "chờ admin đăng thực đơn" vẫn thuộc về admin.
   */
  private postedMenu(week: { dayMenu: unknown }, day: DayKey, pinnedIds: readonly string[] = []): Set<string> | null {
    const ids = ((week.dayMenu as Record<string, string[]> | null) ?? {})[day];
    return ids && ids.length ? new Set(mergePinned(ids, pinnedIds)) : null;
  }

  /**
   * @param enforceLock true khi user tự sửa (chặn ngày đã khoá / chưa có thực đơn). Admin sửa hộ thì false.
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
      const pinned = await this.pinnedIds();
      // Chỉ kiểm tra nợ khi user BẬT THÊM ngày. Bỏ tick luôn được phép, nếu không
      // người đang bị khoá sẽ kẹt với đơn đã đặt trước đó.
      let addingDay = false;
      for (const key of DAY_KEYS) {
        const prev = current ? !!current[key] : false;
        if (locked[key] && days[key] !== prev) {
          throw this.lockError(key);
        }
        // Bật thêm ngày chưa có thực đơn thì chặn; tắt đi thì luôn cho.
        if (days[key] && !prev) {
          addingDay = true;
          if (!this.postedMenu(week, key, pinned)) {
            throw this.noMenuError(key);
          }
        }
      }
      if (addingDay) {
        await this.assertNotDebtLocked(userId);
      }
    }

    return this.prisma.order.upsert({
      where: { weekId_userId: { weekId: dto.weekId, userId } },
      update: days,
      create: { weekId: dto.weekId, userId, ...days },
    });
  }

  /**
   * Đơn của ngày này có phình ra so với những gì đang lưu không?
   * Phình = bật ăn khi trước đó chưa ăn, hoặc thêm đồ uống / tăng số lượng đồ uống.
   */
  private async isGrowingOrder(
    weekId: string,
    userId: string,
    day: DayKey,
    eat: boolean,
    drinks: { dishId: string; qty: number }[],
  ): Promise<boolean> {
    const current: any = await this.prisma.order.findUnique({
      where: { weekId_userId: { weekId, userId } },
      select: { [day]: true },
    });
    if (eat && !current?.[day]) return true;

    const existing = await this.prisma.orderItem.findMany({
      where: { weekId, userId, day, dish: { category: 'DRINK' } },
      select: { dishId: true, qty: true },
    });
    const before = new Map(existing.map((it) => [it.dishId, it.qty]));
    return drinks.some((d) => d.qty > (before.get(d.dishId) ?? 0));
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

    // Khử trùng dishId: cùng một món chọn hai lần vẫn chỉ là một phần trong hộp, để lọt
    // thì đơn gửi quán và thống kê đều đếm dư.
    const food = dto.eat ? [...new Set(dto.food ?? [])] : []; // không ăn cơm thì bỏ luôn món
    const drinks = (dto.drinks ?? []).filter((d) => d.qty > 0);

    // User chỉ đặt được khi admin đã đăng thực đơn ngày đó, và chỉ món trong thực đơn.
    // Huỷ (không ăn, không uống) thì luôn cho để không kẹt đơn cũ.
    if (enforceLock && (dto.eat || drinks.length)) {
      const menu = this.postedMenu(week, day, await this.pinnedIds());
      if (!menu) {
        throw this.noMenuError(day);
      }
      if ([...food, ...drinks.map((d) => d.dishId)].some((id) => !menu.has(id))) {
        throw new BadRequestException('Có món không nằm trong thực đơn hôm nay');
      }
      // Nợ vượt ngưỡng: chặn khi đơn PHÌNH RA so với hiện tại (bật ăn, hoặc thêm/tăng
      // đồ uống). Giảm hoặc giữ nguyên thì cho qua để user còn huỷ được.
      if (await this.isGrowingOrder(dto.weekId, userId, day, dto.eat, drinks)) {
        await this.assertNotDebtLocked(userId);
      }
    }

    // Chặn dishId rác / không tồn tại (tránh lỗi khoá ngoại)
    const dishIds = [...new Set([...food, ...drinks.map((d) => d.dishId)])];
    if (dishIds.length) {
      const count = await this.prisma.dish.count({ where: { id: { in: dishIds } } });
      if (count !== dishIds.length) {
        throw new BadRequestException('Có món không tồn tại');
      }
    }

    // Ghi chú nằm trong một cột JSON theo ngày. Phải đọc trước rồi ghi đè đúng khoá
    // của ngày này — ghi thẳng cả object sẽ xoá mất ghi chú của các ngày khác.
    const current: any = await this.prisma.order.findUnique({
      where: { weekId_userId: { weekId: dto.weekId, userId } },
      select: { notes: true },
    });
    const notes = { ...((current?.notes as Record<string, string>) ?? {}) };
    if (dto.note === undefined) {
      // không gửi note -> giữ nguyên ghi chú cũ của ngày đó
    } else if (dto.note.trim()) {
      notes[day] = dto.note.trim();
    } else {
      delete notes[day];
    }

    await this.prisma.$transaction([
      this.prisma.order.upsert({
        where: { weekId_userId: { weekId: dto.weekId, userId } },
        update: { [day]: dto.eat, notes },
        create: { weekId: dto.weekId, userId, [day]: dto.eat, notes },
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

  /**
   * Sau khi admin xác nhận PAID: nếu người đó vừa tụt xuống dưới ngưỡng thì báo mở khoá.
   * Chỉ gửi khi TRƯỚC đó đang bị khoá, để không spam người chưa bao giờ bị chặn.
   */
  private async notifyUnlockIfFreed(userId: string, wasLocked: boolean): Promise<void> {
    if (!wasLocked) return;
    if ((await this.debts.gate(userId)).locked) return;
    await this.notifications.createFor([userId], {
      type: 'DEBT_UNLOCKED',
      title: '🔓 Đã mở lại đặt cơm',
      body: 'Công nợ của bạn đã về dưới ngưỡng. Bạn có thể đặt cơm lại bình thường.',
    });
  }

  /** Admin đặt trạng thái thanh toán → đồng bộ paid + báo cho user. */
  async setPaymentStatus(dto: SetPaymentStatusDto) {
    const { label } = await this.orderInfo(dto.weekId, dto.userId);
    const paid = dto.status === 'PAID';
    const wasLocked = paid && (await this.debts.gate(dto.userId)).locked;
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
      await this.notifyUnlockIfFreed(dto.userId, wasLocked);
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

  /**
   * User báo (hoặc huỷ báo) đã chuyển khoản gộp nhiều tuần → PENDING/UNPAID.
   * Chỉ gửi admin 1 thông báo cho cả lần chuyển. Tuần đã PAID hoặc 0đ thì bỏ qua.
   */
  async reportPayments(userId: string, dto: ReportPaymentBulkDto) {
    const weekIds = [...new Set(dto.weekIds)];
    const infos = await Promise.all(weekIds.map((weekId) => this.orderInfo(weekId, userId)));
    const targets = infos.filter((i) => i.order.paymentStatus !== 'PAID' && (!dto.report || i.total > 0));
    if (!targets.length) {
      throw new BadRequestException('Không có khoản nào cần thanh toán.');
    }

    await this.prisma.order.updateMany({
      where: { userId, weekId: { in: targets.map((i) => i.order.weekId) }, paymentStatus: { not: 'PAID' } },
      data: dto.report
        ? { paymentStatus: 'PENDING', reportedAt: new Date() }
        : { paymentStatus: 'UNPAID', reportedAt: null },
    });

    if (dto.report) {
      const total = targets.reduce((a, i) => a + i.total, 0);
      await this.notifications.createFor(await this.notifications.adminIds(), {
        type: 'PAYMENT_PENDING',
        title: '💸 Yêu cầu xác nhận thanh toán',
        body: `${targets[0].fullName} báo đã chuyển ${vnd(total)} — ${targets.length} tuần: ${targets
          .map((i) => i.label)
          .join(', ')}`.slice(0, 255),
        weekId: targets.length === 1 ? targets[0].order.weekId : undefined,
      });
    }
    return { ok: true, count: targets.length };
  }

  /** Admin xác nhận / trả lại nhiều tuần của 1 thành viên một lần → 1 thông báo cho user. */
  async setPaymentStatusBulk(dto: SetPaymentStatusBulkDto) {
    const weekIds = [...new Set(dto.weekIds)];
    const infos = await Promise.all(weekIds.map((weekId) => this.orderInfo(weekId, dto.userId)));
    const paid = dto.status === 'PAID';
    const wasLocked = paid && (await this.debts.gate(dto.userId)).locked;
    await this.prisma.order.updateMany({
      where: { userId: dto.userId, weekId: { in: weekIds } },
      data: {
        paymentStatus: dto.status,
        paid,
        paidAt: paid ? new Date() : null,
        ...(dto.status === 'UNPAID' ? { reportedAt: null } : {}),
      },
    });

    const labels = infos.map((i) => i.label).join(', ');
    if (dto.status === 'PAID') {
      await this.notifications.createFor([dto.userId], {
        type: 'PAYMENT_CONFIRMED',
        title: '✅ Đã xác nhận thanh toán',
        body: `Admin đã xác nhận bạn thanh toán ${infos.length} tuần: ${labels}. Cảm ơn!`.slice(0, 255),
        weekId: infos.length === 1 ? weekIds[0] : undefined,
      });
      await this.notifyUnlockIfFreed(dto.userId, wasLocked);
    } else if (dto.status === 'UNPAID') {
      await this.notifications.createFor([dto.userId], {
        type: 'PAYMENT_REJECTED',
        title: '↩️ Chưa nhận được tiền',
        body: `Admin chưa nhận được khoản ${labels}, vui lòng kiểm tra lại.`.slice(0, 255),
        weekId: infos.length === 1 ? weekIds[0] : undefined,
      });
    }
    return { ok: true, count: infos.length };
  }
}
