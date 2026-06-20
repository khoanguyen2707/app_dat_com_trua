import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateWeekDto, UpdateWeekDto } from './dto/week.dto';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAYS)[number];

@Injectable()
export class WeeksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const weeks = await this.prisma.week.findMany({ orderBy: { createdAt: 'desc' } });
    const result: any[] = [];
    for (const w of weeks) {
      const orders: any[] = await this.prisma.order.findMany({ where: { weekId: w.id } });
      let servings = 0;
      let memberCount = 0;
      for (const o of orders) {
        const s = DAYS.reduce((a, d) => a + (o[d] ? 1 : 0), 0);
        servings += s;
        if (s > 0) memberCount += 1;
      }
      result.push({ ...w, servings, total: servings * w.unitPrice, memberCount });
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

    const members = users.map((u) => {
      const o = byUser.get(u.id);
      const days = Object.fromEntries(DAYS.map((d) => [d, o ? !!o[d] : false])) as Record<DayKey, boolean>;
      const servings = DAYS.reduce((a, d) => a + (days[d] ? 1 : 0), 0);
      return {
        userId: u.id,
        fullName: u.fullName,
        color: u.color,
        role: u.role,
        days,
        servings,
        total: servings * week.unitPrice,
        paid: o ? o.paid : false,
      };
    });

    const perDay = Object.fromEntries(
      DAYS.map((d) => [d, members.reduce((a, m) => a + (m.days[d] ? 1 : 0), 0)]),
    ) as Record<DayKey, number>;
    const totalServings = members.reduce((a, m) => a + m.servings, 0);

    return {
      week,
      members,
      totals: { perDay, totalServings, totalMoney: totalServings * week.unitPrice },
    };
  }

  async create(dto: CreateWeekDto) {
    if (dto.isActive) {
      await this.prisma.week.updateMany({ data: { isActive: false }, where: { isActive: true } });
    }
    return this.prisma.week.create({
      data: { label: dto.label, unitPrice: dto.unitPrice ?? 25000, isActive: dto.isActive ?? false },
    });
  }

  async update(id: string, dto: UpdateWeekDto) {
    await this.ensure(id);
    if (dto.isActive) {
      await this.prisma.week.updateMany({ data: { isActive: false }, where: { isActive: true, NOT: { id } } });
    }
    return this.prisma.week.update({ where: { id }, data: dto });
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
