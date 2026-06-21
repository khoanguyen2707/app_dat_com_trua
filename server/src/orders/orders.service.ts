import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CUTOFF_LABEL, computeLockedDays, DAY_KEYS, DAY_LABEL } from '@/common/week-lock';
import { SetPaidDto, UpsertOrderDto } from './dto/order.dto';

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
          throw new ForbiddenException(
            `${DAY_LABEL[key]} đã chốt (quá hạn ${CUTOFF_LABEL} hoặc đã qua) — chỉ admin sửa được.`,
          );
        }
      }
    }

    return this.prisma.order.upsert({
      where: { weekId_userId: { weekId: dto.weekId, userId } },
      update: days,
      create: { weekId: dto.weekId, userId, ...days },
    });
  }

  async setPaid(dto: SetPaidDto) {
    return this.prisma.order.upsert({
      where: { weekId_userId: { weekId: dto.weekId, userId: dto.userId } },
      update: { paid: dto.paid },
      create: { weekId: dto.weekId, userId: dto.userId, paid: dto.paid },
    });
  }
}
