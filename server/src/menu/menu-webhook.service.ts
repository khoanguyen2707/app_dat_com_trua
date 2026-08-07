import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CUTOFF_LABEL, DAY_LABEL, type DayKey } from '@/common/week-lock';

/** Một món trong thực đơn được công bố. */
export type AnnouncedDish = { id: string; name: string; price: number; emoji: string | null };

/** Dữ liệu nghiệp vụ để công bố thực đơn 1 ngày (menu.service dựng, service này gửi đi). */
export type MenuAnnouncement = {
  weekId: string;
  day: DayKey;
  date: string | null; // "YYYY-MM-DD" theo lịch tuần (null nếu tuần chưa có startDate)
  unitPrice: number;
  mains: AnnouncedDish[];
  drinks: AnnouncedDish[];
  createdCount: number;
  hiddenCount: number;
};

/** Kết quả bắn webhook — luôn trả về, KHÔNG ném lỗi (đăng thực đơn vẫn phải thành công). */
export type WebhookResult = {
  status: 'sent' | 'skipped' | 'failed';
  httpStatus?: number;
  error?: string;
};

const TIMEOUT_MS = 10_000;

const money = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/** "YYYY-MM-DD" -> "dd/MM" (nhãn ngắn cho tin nhắn Teams). */
const shortDate = (iso: string | null) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '');

/**
 * Bắn 1 HTTP POST sang Power Automate mỗi khi admin áp dụng thực đơn 1 ngày.
 *
 * Thiết kế: app tự dựng sẵn `text` + `html` nên flow bên Power Automate chỉ cần
 * Parse JSON rồi Post message — không phải nối chuỗi trong expression.
 *
 * Cấu hình (env):
 *   MENU_WEBHOOK_URL    URL "When an HTTP request is received" của flow. Trống = tắt (skipped).
 *   MENU_WEBHOOK_TOKEN  Bí mật gửi kèm header `x-menu-token` để flow tự chặn request lạ.
 *   APP_URL             Link app chèn vào tin nhắn (để mọi người bấm vào đặt).
 */
@Injectable()
export class MenuWebhookService {
  private readonly logger = new Logger(MenuWebhookService.name);

  constructor(private readonly config: ConfigService) {}

  /** Có cấu hình URL hay chưa (chưa có = bỏ qua, không coi là lỗi). */
  get enabled(): boolean {
    return !!this.config.get<string>('MENU_WEBHOOK_URL')?.trim();
  }

  /** Tin nhắn thuần chữ (fallback / log / kênh không nhận HTML). */
  private buildText(a: MenuAnnouncement, appUrl: string): string {
    const line = (d: AnnouncedDish) => `• ${d.emoji ? d.emoji + ' ' : ''}${d.name}`;
    const parts = [`🍚 THỰC ĐƠN ${DAY_LABEL[a.day].toUpperCase()}${a.date ? ` (${shortDate(a.date)})` : ''}`];
    if (a.mains.length) parts.push(`🍱 Món ăn (${money(a.unitPrice)}/suất):\n${a.mains.map(line).join('\n')}`);
    if (a.drinks.length) {
      parts.push(`🥤 Đồ uống:\n${a.drinks.map((d) => `${line(d)} — ${money(d.price)}`).join('\n')}`);
    }
    parts.push(`⏰ Chốt đơn ${CUTOFF_LABEL} — đặt tại ${appUrl}`);
    return parts.join('\n\n');
  }

  /** Tin nhắn HTML cho Teams ("Post message in a chat or channel" nhận HTML). */
  private buildHtml(a: MenuAnnouncement, appUrl: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const list = (dishes: AnnouncedDish[], withPrice: boolean) =>
      dishes
        .map((d) => `• ${d.emoji ? esc(d.emoji) + ' ' : ''}${esc(d.name)}${withPrice ? ` — ${money(d.price)}` : ''}`)
        .join('<br>');

    const blocks = [`<p><b>🍚 Thực đơn ${esc(DAY_LABEL[a.day])}${a.date ? ` (${shortDate(a.date)})` : ''}</b></p>`];
    if (a.mains.length) {
      blocks.push(`<p><b>🍱 Món ăn</b> — ${money(a.unitPrice)}/suất<br>${list(a.mains, false)}</p>`);
    }
    if (a.drinks.length) blocks.push(`<p><b>🥤 Đồ uống</b><br>${list(a.drinks, true)}</p>`);
    blocks.push(`<p>⏰ Chốt đơn <b>${CUTOFF_LABEL}</b> — 👉 <a href="${esc(appUrl)}">Đặt cơm ngay</a></p>`);
    return blocks.join('');
  }

  /** Body JSON gửi sang Power Automate (khớp schema trong docs/POWER-AUTOMATE.md). */
  buildPayload(a: MenuAnnouncement) {
    const appUrl = this.config.get<string>('APP_URL')?.trim() || '';
    return {
      event: 'menu.applied' as const,
      weekId: a.weekId,
      day: a.day,
      dayLabel: DAY_LABEL[a.day],
      date: a.date,
      cutoff: CUTOFF_LABEL,
      appUrl,
      unitPrice: a.unitPrice,
      counts: {
        total: a.mains.length + a.drinks.length,
        mains: a.mains.length,
        drinks: a.drinks.length,
        created: a.createdCount,
        hidden: a.hiddenCount,
      },
      mains: a.mains,
      drinks: a.drinks,
      text: this.buildText(a, appUrl),
      html: this.buildHtml(a, appUrl),
    };
  }

  /**
   * POST payload sang flow. Nuốt mọi lỗi (mạng/timeout/4xx/5xx) và trả về trạng thái
   * để FE hiển thị — thực đơn đã ghi DB rồi, webhook hỏng không được làm hỏng thao tác.
   */
  async send(a: MenuAnnouncement): Promise<WebhookResult> {
    const url = this.config.get<string>('MENU_WEBHOOK_URL')?.trim();
    if (!url) return { status: 'skipped' };

    const token = this.config.get<string>('MENU_WEBHOOK_TOKEN')?.trim();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { 'x-menu-token': token } : {}),
        },
        body: JSON.stringify(this.buildPayload(a)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = (await res.text().catch(() => '')).slice(0, 200);
        this.logger.warn(`Webhook thực đơn lỗi ${res.status}: ${body}`);
        return { status: 'failed', httpStatus: res.status, error: `HTTP ${res.status}` };
      }
      return { status: 'sent', httpStatus: res.status };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Webhook thực đơn không gửi được: ${error}`);
      return { status: 'failed', error };
    }
  }
}
