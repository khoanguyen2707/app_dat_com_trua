import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { clusters, pairKey } from '@/menu/dish-similarity';
import { matchKey } from '@/menu/menu-parse';
import { planMerge } from './dish-merge';
import { CreateDishDto, MarkDistinctDto, MergeDishesDto, UpdateDishDto } from './dto/dish.dto';

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.dish.findMany({ orderBy: { createdAt: 'asc' } });
  }

  create(dto: CreateDishDto) {
    return this.prisma.dish.create({ data: dto });
  }

  async update(id: string, dto: UpdateDishDto) {
    await this.ensure(id);
    return this.prisma.dish.update({ where: { id }, data: dto });
  }

  /**
   * Xoá món. Món đã có người đặt thì CHẶN: OrderItem là onDelete Cascade nên xoá thẳng
   * sẽ mất luôn suất đã đặt (lịch sử + tiền) — phải dùng Gộp. Món chưa ai đặt thì xoá
   * và gỡ khỏi thực đơn các tuần.
   */
  async remove(id: string) {
    await this.ensure(id);
    const used = await this.prisma.orderItem.count({ where: { dishId: id } });
    if (used > 0) {
      throw new ConflictException(
        `Món đã có ${used} lượt đặt — dùng "Kiểm tra trùng" để gộp vào món đúng thay vì xoá.`,
      );
    }
    const weeks = await this.prisma.week.findMany({ select: { id: true, dayMenu: true } });
    const touched = weeks.flatMap((w) => {
      const menu = (w.dayMenu as Record<string, string[]> | null) ?? {};
      if (!Object.values(menu).some((ids) => ids.includes(id))) return [];
      const dayMenu = Object.fromEntries(Object.entries(menu).map(([d, ids]) => [d, ids.filter((x) => x !== id)]));
      return [this.prisma.week.update({ where: { id: w.id }, data: { dayMenu } })];
    });
    await this.prisma.$transaction([...touched, this.prisma.dish.delete({ where: { id } })]);
    return { message: 'Đã xoá món' };
  }

  /** Cụm món nghi trùng trong danh mục (cùng loại, tên gần giống), kèm số lượt đặt. */
  async duplicates() {
    const [dishes, pairs, usage] = await Promise.all([
      this.prisma.dish.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.dishDistinctPair.findMany(),
      this.prisma.orderItem.groupBy({ by: ['dishId'], _sum: { qty: true }, _max: { createdAt: true } }),
    ]);
    const distinct = new Set(pairs.map((p) => pairKey(p.aId, p.bId)));
    const use = new Map(usage.map((u) => [u.dishId, u]));
    return clusters(
      dishes.map((d) => ({ ...d, key: matchKey(d.name) })),
      distinct,
    ).map((group) => ({
      category: group[0].category,
      dishes: group
        .map(({ key: _key, ...d }) => ({
          ...d,
          orderCount: use.get(d.id)?._sum.qty ?? 0,
          lastOrderedAt: use.get(d.id)?._max.createdAt ?? null,
        }))
        .sort((a, b) => b.orderCount - a.orderCount),
    }));
  }

  /** Gộp các món trùng vào 1 món giữ lại — chuyển suất đặt + thực đơn, rồi xoá tên trùng. */
  async merge(dto: MergeDishesDto) {
    const mergeIds = [...new Set(dto.mergeIds)].filter((id) => id !== dto.keepId);
    if (!mergeIds.length) throw new BadRequestException('Chọn ít nhất một món để gộp');
    const dishes = await this.prisma.dish.findMany({ where: { id: { in: [dto.keepId, ...mergeIds] } } });
    const keep = dishes.find((d) => d.id === dto.keepId);
    if (!keep || dishes.length !== mergeIds.length + 1) throw new NotFoundException('Không tìm thấy món');
    if (dishes.some((d) => d.category !== keep.category)) {
      throw new BadRequestException('Chỉ gộp được món cùng loại (ăn với ăn, uống với uống)');
    }

    return this.prisma.$transaction(async (tx) => {
      const [items, weeks] = await Promise.all([
        tx.orderItem.findMany({ where: { dishId: { in: [dto.keepId, ...mergeIds] } } }),
        tx.week.findMany({ select: { id: true, dayMenu: true } }),
      ]);
      const plan = planMerge(items, weeks as any, dto.keepId, mergeIds);
      if (plan.repoint.length) {
        await tx.orderItem.updateMany({ where: { id: { in: plan.repoint } }, data: { dishId: dto.keepId } });
      }
      for (const a of plan.addQty) {
        await tx.orderItem.update({ where: { id: a.id }, data: { qty: { increment: a.qty } } });
      }
      if (plan.remove.length) await tx.orderItem.deleteMany({ where: { id: { in: plan.remove } } });
      for (const w of plan.dayMenus) await tx.week.update({ where: { id: w.weekId }, data: { dayMenu: w.dayMenu } });
      const name = dto.name?.trim();
      if (name && name !== keep.name) await tx.dish.update({ where: { id: dto.keepId }, data: { name } });
      await tx.dish.deleteMany({ where: { id: { in: mergeIds } } });
      return {
        keepId: dto.keepId,
        merged: mergeIds.length,
        movedItems: plan.repoint.length + plan.remove.length,
        weeksTouched: plan.dayMenus.length,
      };
    });
  }

  /** Admin xác nhận các món này KHÁC nhau → lưu mọi cặp để không báo trùng lại. */
  async markDistinct(dto: MarkDistinctDto) {
    const ids = [...new Set(dto.ids)].sort();
    const data: { aId: string; bId: string }[] = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) data.push({ aId: ids[i], bId: ids[j] });
    await this.prisma.dishDistinctPair.createMany({ data, skipDuplicates: true });
    return { ok: true, pairs: data.length };
  }

  private async ensure(id: string) {
    const d = await this.prisma.dish.findUnique({ where: { id } });
    if (!d) {
      throw new NotFoundException('Không tìm thấy món');
    }
  }
}
