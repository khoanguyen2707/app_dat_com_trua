import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { DayKey } from '@/common/week-lock';
import { guessEmoji, matchKey, parseMenuText, type CatalogDish } from './menu-parse';
import { ApplyDayMenuDto } from './dto/menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy danh mục hiện có ở dạng CatalogDish (cho parser). */
  private async catalog(): Promise<CatalogDish[]> {
    const dishes = await this.prisma.dish.findMany({ select: { id: true, name: true, category: true, price: true } });
    return dishes.map((d) => ({ id: d.id, name: d.name, category: d.category, price: d.price }));
  }

  /** Phân tích text -> diff (xem trước). Không ghi gì. */
  async parse(text: string) {
    return parseMenuText(text, await this.catalog());
  }

  /**
   * Áp dụng thực đơn 1 ngày: tạo món mới (khử trùng theo tên), rồi đặt
   * week.dayMenu[day] = tập dishId bán hôm nay. Trả lại diff để FE cập nhật.
   */
  async applyDay(dto: ApplyDayMenuDto) {
    const week = dto.weekId
      ? await this.prisma.week.findUnique({ where: { id: dto.weekId } })
      : await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) {
      throw new NotFoundException(dto.weekId ? 'Không tìm thấy tuần' : 'Chưa có tuần nào đang mở');
    }

    // Khử trùng món mới theo khoá khớp so với danh mục hiện có (tránh tạo trùng khi bấm 2 lần).
    const existingByKey = new Map((await this.catalog()).map((d) => [matchKey(d.name), d.id]));
    const createdIds: string[] = [];
    for (const item of dto.create) {
      const name = item.name.trim();
      if (!name) continue;
      const key = matchKey(name);
      const dup = existingByKey.get(key);
      if (dup) {
        createdIds.push(dup); // đã có (vừa tạo ở vòng trước / admin thêm tay) -> dùng lại
        continue;
      }
      const price = item.category === 'MAIN' ? item.price || week.unitPrice : (item.price ?? 0);
      const dish = await this.prisma.dish.create({
        data: { name, category: item.category, price, emoji: guessEmoji(name, item.category) },
      });
      existingByKey.set(key, dish.id);
      createdIds.push(dish.id);
    }

    const availableIds = [...new Set([...dto.dishIds, ...createdIds])];
    if (availableIds.length === 0) {
      throw new BadRequestException('Thực đơn hôm nay trống');
    }

    const dayMenu = (week.dayMenu as Record<string, string[]> | null) ?? {};
    dayMenu[dto.day] = availableIds;
    await this.prisma.week.update({ where: { id: week.id }, data: { dayMenu } });

    return { weekId: week.id, day: dto.day, availableIds, createdCount: createdIds.length, dayMenu };
  }

  /** Gỡ thực đơn 1 ngày (xoá giới hạn -> ngày đó hiện full catalog lại). */
  async clearDay(day: DayKey, weekId?: string) {
    const week = weekId
      ? await this.prisma.week.findUnique({ where: { id: weekId } })
      : await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) {
      throw new NotFoundException('Không tìm thấy tuần');
    }
    const dayMenu = (week.dayMenu as Record<string, string[]> | null) ?? {};
    delete dayMenu[day];
    await this.prisma.week.update({ where: { id: week.id }, data: { dayMenu } });
    return { weekId: week.id, day, dayMenu };
  }
}
