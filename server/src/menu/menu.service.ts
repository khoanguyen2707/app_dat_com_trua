import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CUTOFF_LABEL, computeTodayKey, DAY_KEYS, type DayKey } from '@/common/week-lock';
import { guessEmoji, matchKey, parseMenuText, type CatalogDish } from './menu-parse';
import { MenuWebhookService, type AnnouncedDish } from './menu-webhook.service';
import { ApplyDayMenuDto } from './dto/menu.dto';
import { mergePinned } from './pinned';
import { NotificationsService } from '@/notifications/notifications.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày dương lịch "YYYY-MM-DD" của cột `day` trong tuần bắt đầu từ `startDate`. */
function dateOfDay(startDate: Date | null | undefined, day: DayKey): string | null {
  if (!startDate) return null;
  const s = new Date(startDate);
  const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) + DAY_KEYS.indexOf(day) * DAY_MS);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: MenuWebhookService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Báo cả nhóm khi thực đơn của HÔM NAY vừa được đăng.
   *
   * Chỉ báo cho đúng hôm nay: user chỉ đặt được cho hôm nay, báo thực đơn ngày khác
   * chỉ gây nhiễu. Thông báo hỏng không được làm hỏng việc đăng thực đơn đã xong.
   */
  private async announceToMembers(week: { startDate: Date | null }, day: DayKey, ids: string[]): Promise<void> {
    if (computeTodayKey(week.startDate) !== day) return;
    const rows = await this.prisma.dish.findMany({
      where: { id: { in: ids }, category: 'MAIN' },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const names = rows
      .slice(0, 3)
      .map((d) => d.name)
      .join(', ');
    const more = rows.length > 3 ? `… và ${rows.length - 3} món nữa` : '';
    const users = await this.prisma.user.findMany({ where: { active: true }, select: { id: true } });
    await this.notifications
      .createFor(
        users.map((u) => u.id),
        {
          type: 'MENU_POSTED',
          title: '📋 Thực đơn hôm nay đã có',
          body: `${rows.length} món: ${names}${more}. Đặt cơm trước ${CUTOFF_LABEL} nhé!`.slice(0, 255),
          url: '#order',
          tag: `menu-${day}`,
        },
      )
      .catch(() => undefined);
  }

  /** Id các món "luôn có" — cộng vào thực đơn mọi ngày admin đã đăng. */
  private async pinnedIds(): Promise<string[]> {
    const rows = await this.prisma.dish.findMany({ where: { pinned: true }, select: { id: true } });
    return rows.map((d) => d.id);
  }

  /** Lấy danh mục hiện có ở dạng CatalogDish (cho parser). */
  private async catalog(): Promise<CatalogDish[]> {
    const dishes = await this.prisma.dish.findMany({ select: { id: true, name: true, category: true, price: true } });
    return dishes.map((d) => ({ id: d.id, name: d.name, category: d.category, price: d.price }));
  }

  /** Tuần chỉ định, hoặc tuần đang mở khi bỏ trống. */
  private async findWeek(weekId?: string) {
    const week = weekId
      ? await this.prisma.week.findUnique({ where: { id: weekId } })
      : await this.prisma.week.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!week) {
      throw new NotFoundException(weekId ? 'Không tìm thấy tuần' : 'Chưa có tuần nào đang mở');
    }
    return week;
  }

  /** Phân tích text -> diff (xem trước). Không ghi gì. */
  async parse(text: string) {
    return parseMenuText(text, await this.catalog());
  }

  /**
   * Áp dụng thực đơn 1 ngày: tạo món mới (khử trùng theo tên), rồi đặt
   * week.dayMenu[day] = tập dishId bán hôm nay. Trả lại diff để FE cập nhật.
   *
   * Bước cuối: bắn 1 HTTP POST sang Power Automate để đăng thực đơn lên Teams
   * (bỏ qua khi `notify: false` hoặc chưa cấu hình MENU_WEBHOOK_URL). Webhook hỏng
   * KHÔNG làm hỏng việc đăng thực đơn — chỉ trả trạng thái về cho FE.
   */
  async applyDay(dto: ApplyDayMenuDto) {
    const week = await this.findWeek(dto.weekId);

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

    // dayMenu lưu ĐÚNG lựa chọn của admin; món pinned chỉ gộp vào lúc đọc để admin
    // gỡ ghim là món biến khỏi mọi ngày mà không phải sửa lại từng tuần.
    const effectiveIds = mergePinned(availableIds, await this.pinnedIds());

    const webhook =
      dto.notify === false
        ? ({ status: 'skipped' } as const)
        : await this.webhook.send({
            weekId: week.id,
            day: dto.day,
            date: dateOfDay(week.startDate, dto.day),
            unitPrice: week.unitPrice,
            ...(await this.announcedDishes(effectiveIds)),
            createdCount: createdIds.length,
            hiddenCount: Math.max(0, (await this.prisma.dish.count()) - effectiveIds.length),
          });

    await this.announceToMembers(week, dto.day, effectiveIds);

    return {
      weekId: week.id,
      day: dto.day,
      availableIds: effectiveIds,
      createdCount: createdIds.length,
      dayMenu,
      webhook,
    };
  }

  /** Món bán hôm nay, tách ăn/uống và giữ đúng thứ tự tên (để tin nhắn dễ đọc). */
  private async announcedDishes(ids: string[]): Promise<{ mains: AnnouncedDish[]; drinks: AnnouncedDish[] }> {
    const rows = await this.prisma.dish.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true, emoji: true, category: true },
      orderBy: { name: 'asc' },
    });
    const pick = (category: 'MAIN' | 'DRINK'): AnnouncedDish[] =>
      rows.filter((d) => d.category === category).map(({ id, name, price, emoji }) => ({ id, name, price, emoji }));
    return { mains: pick('MAIN'), drinks: pick('DRINK') };
  }

  /**
   * Dựng lại thông báo của 1 ngày ĐÃ đăng: `send=false` chỉ trả payload (để dán vào
   * "Use sample payload to generate schema" bên Power Automate), `send=true` bắn lại thật.
   */
  async announce(day: DayKey, weekId: string | undefined, send: boolean) {
    const week = await this.findWeek(weekId);
    const posted = ((week.dayMenu as Record<string, string[]> | null) ?? {})[day] ?? [];
    if (posted.length === 0) {
      throw new BadRequestException(`Ngày ${day} chưa đăng thực đơn`);
    }
    const ids = mergePinned(posted, await this.pinnedIds());
    const announcement = {
      weekId: week.id,
      day,
      date: dateOfDay(week.startDate, day),
      unitPrice: week.unitPrice,
      ...(await this.announcedDishes(ids)),
      createdCount: 0,
      hiddenCount: Math.max(0, (await this.prisma.dish.count()) - ids.length),
    };
    const payload = this.webhook.buildPayload(announcement);
    return send ? { payload, webhook: await this.webhook.send(announcement) } : { payload };
  }

  /** Gỡ thực đơn 1 ngày (xoá giới hạn -> ngày đó hiện full catalog lại). */
  async clearDay(day: DayKey, weekId?: string) {
    const week = await this.findWeek(weekId);
    const dayMenu = (week.dayMenu as Record<string, string[]> | null) ?? {};
    delete dayMenu[day];
    await this.prisma.week.update({ where: { id: week.id }, data: { dayMenu } });
    return { weekId: week.id, day, dayMenu };
  }
}
