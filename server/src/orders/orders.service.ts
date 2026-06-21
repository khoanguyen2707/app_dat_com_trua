import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CUTOFF_LABEL, computeLockedDays, DAY_KEYS, DAY_LABEL, type DayKey } from '@/common/week-lock';
import { SetDayDetailDto, SetPaidDto, UpsertOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async setPaid(dto: SetPaidDto) {
    return this.prisma.order.upsert({
      where: { weekId_userId: { weekId: dto.weekId, userId: dto.userId } },
      update: { paid: dto.paid },
      create: { weekId: dto.weekId, userId: dto.userId, paid: dto.paid },
    });
  }
}
