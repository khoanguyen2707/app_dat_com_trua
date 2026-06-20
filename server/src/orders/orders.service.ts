import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
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

  async upsert(userId: string, dto: UpsertOrderDto) {
    const week = await this.prisma.week.findUnique({ where: { id: dto.weekId } });
    if (!week) {
      throw new NotFoundException('Không tìm thấy tuần');
    }
    const days = this.days(dto);
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
