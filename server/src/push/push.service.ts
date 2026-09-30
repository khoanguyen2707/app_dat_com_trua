import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscribeDto } from './dto/push.dto';

/** Nội dung service worker nhận được và dựng thành thông báo hệ điều hành. */
export interface PushPayload {
  title: string;
  body: string;
  /** Mở gì khi bấm vào thông báo, vd "#pay". Để trống = mở trang chủ app. */
  url?: string;
  /**
   * Thông báo cùng `tag` sẽ thay thế nhau trên máy thay vì xếp chồng —
   * dùng cho nhắc theo ngày để không đọng 5 cái giống nhau.
   */
  tag?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  /** Chưa cấu hình VAPID thì module tự tắt: app vẫn chạy, chỉ không có push. */
  private readonly enabled: boolean;
  readonly publicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.publicKey = config.get<string>('VAPID_PUBLIC_KEY')?.trim() ?? '';
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY')?.trim() ?? '';
    const subject = config.get<string>('VAPID_SUBJECT')?.trim() || 'mailto:admin@comtrua.vn';
    this.enabled = !!(this.publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(subject, this.publicKey, privateKey);
    } else {
      this.logger.warn('Chưa có VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY — thông báo đẩy đang tắt.');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    if (!this.enabled) {
      throw new BadRequestException('Máy chủ chưa bật thông báo đẩy.');
    }
    const { p256dh, auth } = dto.keys ?? {};
    if (!p256dh || !auth) {
      throw new BadRequestException('Thiếu khoá đăng ký thông báo.');
    }
    // Cùng một endpoint có thể đổi chủ (máy dùng chung, đăng nhập tài khoản khác)
    // nên upsert theo endpoint và ghi đè userId, không tạo bản ghi thứ hai.
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: { userId, p256dh, auth, userAgent: dto.userAgent?.slice(0, 255), lastSeenAt: new Date() },
      create: { userId, endpoint: dto.endpoint, p256dh, auth, userAgent: dto.userAgent?.slice(0, 255) },
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  /** Thiết bị của tôi đang bật thông báo (để màn Cài đặt hiện đúng trạng thái). */
  async mine(userId: string) {
    const rows = await this.prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true, lastSeenAt: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    return { enabled: this.enabled, devices: rows.length, items: rows };
  }

  /**
   * Gửi thông báo cho nhiều người, mỗi người có thể nhiều thiết bị.
   *
   * KHÔNG bao giờ ném lỗi ra ngoài: push chỉ là lớp bổ sung cho chuông in-app, một
   * push hỏng không được phép làm hỏng việc đặt cơm hay xác nhận thanh toán đã xong.
   * Endpoint trả 404/410 là subscription đã chết (gỡ app, xoá dữ liệu trình duyệt)
   * nên xoá luôn, tránh gửi lại mãi.
   */
  async sendTo(userIds: string[], payload: PushPayload): Promise<{ sent: number; removed: number }> {
    const ids = [...new Set(userIds)];
    if (!this.enabled || !ids.length) return { sent: 0, removed: 0 };

    const subs = await this.prisma.pushSubscription.findMany({ where: { userId: { in: ids } } });
    if (!subs.length) return { sent: 0, removed: 0 };

    const body = JSON.stringify(payload);
    const dead: string[] = [];
    let sent = 0;

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
          sent++;
        } catch (e: any) {
          const status = e?.statusCode;
          if (status === 404 || status === 410) dead.push(s.endpoint);
          else this.logger.warn(`Gửi push lỗi (${status ?? '?'}): ${e?.message ?? e}`);
        }
      }),
    );

    if (dead.length) {
      await this.prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
    }
    return { sent, removed: dead.length };
  }
}
