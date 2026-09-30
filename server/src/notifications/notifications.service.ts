import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@/common/enums/role.enum';
import { PushService } from '@/push/push.service';

type NewNotification = {
  type: string;
  title: string;
  body: string;
  weekId?: string | null;
  /** Bấm vào thông báo đẩy thì mở đâu, vd '#pay'. Bỏ trống = mở trang chủ app. */
  url?: string;
  /** Thông báo cùng tag thay thế nhau trên máy thay vì xếp chồng. */
  tag?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

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

  /**
   * Tạo cùng 1 thông báo cho nhiều người nhận, rồi đẩy luôn ra thông báo hệ điều hành.
   *
   * Push nối ở đây chứ không ở từng nơi gọi: mọi thông báo in-app sẵn có tự thành push
   * mà không phải sửa rải rác, và không có đường nào quên đẩy. Push hỏng không được
   * phép làm hỏng nghiệp vụ đã ghi xong — PushService đã nuốt lỗi, bọc thêm cho chắc.
   */
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
    await this.push
      .sendTo(ids, { title: data.title, body: data.body, url: data.url, tag: data.tag })
      .catch(() => undefined);
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
