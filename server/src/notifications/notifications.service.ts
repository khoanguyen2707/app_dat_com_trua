import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@/common/enums/role.enum';

type NewNotification = { type: string; title: string; body: string; weekId?: string | null };

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Thông báo của tôi (mới nhất) + số chưa đọc. */
  async listMine(userId: string) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items, unread: items.filter((n) => !n.read).length };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { ok: true };
  }

  /** Tạo cùng 1 thông báo cho nhiều người nhận. */
  async createFor(userIds: string[], data: NewNotification) {
    const ids = [...new Set(userIds)];
    if (!ids.length) return;
    await this.prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        weekId: data.weekId ?? null,
        type: data.type,
        title: data.title,
        body: data.body,
      })),
    });
  }

  /** Id tất cả admin đang hoạt động (để báo khi user gửi yêu cầu xác nhận). */
  async adminIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, active: true },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }
}
