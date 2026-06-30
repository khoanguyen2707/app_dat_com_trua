import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { type DayKey, vnDateStr, vnTodayKey } from '@/common/week-lock';

/** Thông tin người được chọn (đủ để Power Automate @mention trong Teams). */
type PickedUser = { id: string; fullName: string; email: string; teamsEmail: string | null };

export type PickupResult =
  | {
      date: string;
      picked: true;
      alreadyAssigned: boolean; // true = lượt đã được chốt trước đó trong ngày (không bốc lại)
      userId: string;
      fullName: string;
      email: string;
      teamsEmail: string | null;
      mentionEmail: string; // email để @mention trong Teams (ưu tiên teamsEmail, fallback email app)
    }
  | { date: string; picked: false; reason: string };

const PICK_SELECT = { id: true, fullName: true, email: true, teamsEmail: true } as const;

@Injectable()
export class PickupService {
  constructor(private readonly prisma: PrismaService) {}

  private format(user: PickedUser, date: string, alreadyAssigned: boolean): PickupResult {
    return {
      date,
      picked: true,
      alreadyAssigned,
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      teamsEmail: user.teamsEmail,
      mentionEmail: user.teamsEmail ?? user.email,
    };
  }

  /** Lượt đã chốt hôm nay (CHỈ đọc, không bốc mới) — để xem trước / kiểm tra. */
  async today(): Promise<PickupResult> {
    const date = vnDateStr();
    const existing = await this.prisma.pickupAssignment.findUnique({
      where: { date },
      include: { user: { select: PICK_SELECT } },
    });
    return existing
      ? this.format(existing.user, date, true)
      : { date, picked: false, reason: 'Hôm nay chưa chốt người đi lấy cơm' };
  }

  /**
   * Bốc người đi lấy cơm HÔM NAY theo luật xoay tua công bằng.
   *
   * Ứng viên = người đang `active` VÀ **có đặt cơm hôm nay** (tick cột thứ tương ứng
   * trong tuần đang mở). Ai không đặt thì không bao giờ lọt vào danh sách bốc.
   *
   * Ưu tiên chọn:
   *   1) ít lượt đi lấy nhất từ trước tới nay →
   *   2) lâu rồi chưa đi nhất (chưa đi lần nào = ưu tiên cao nhất) →
   *   3) ngẫu nhiên.
   * => Không lặp lại một người khi người khác cùng nhóm chưa "đuổi kịp" số lượt.
   *
   * Idempotent theo ngày: `PickupAssignment.date` là @unique nên gọi lại trong ngày
   * (kể cả 2 lần gần như đồng thời) đều trả về đúng người đã chốt.
   */
  async draw(): Promise<PickupResult> {
    const date = vnDateStr();

    const existing = await this.prisma.pickupAssignment.findUnique({
      where: { date },
      include: { user: { select: PICK_SELECT } },
    });
    if (existing) return this.format(existing.user, date, true);

    const week = await this.prisma.week.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!week) return { date, picked: false, reason: 'Chưa có tuần nào đang mở' };

    // Lọc thẳng trong DB: chỉ người CÓ đặt cơm hôm nay + đang active + KHÔNG opt-out.
    const dayFilter: Partial<Record<DayKey, boolean>> = { [vnTodayKey()]: true };
    const orders = await this.prisma.order.findMany({
      where: { weekId: week.id, user: { active: true, pickupOptOut: false }, ...dayFilter },
      include: { user: { select: PICK_SELECT } },
    });
    const candidates = orders.map((o) => o.user);
    if (!candidates.length) return { date, picked: false, reason: 'Hôm nay không có ai đặt cơm' };

    // Lịch sử lượt của RIÊNG nhóm ứng viên: đếm số lần + ngày gần nhất.
    const ids = candidates.map((c) => c.id);
    const history = await this.prisma.pickupAssignment.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, date: true },
    });
    const count = new Map<string, number>();
    const last = new Map<string, string>();
    for (const h of history) {
      count.set(h.userId, (count.get(h.userId) ?? 0) + 1);
      if (h.date > (last.get(h.userId) ?? '')) last.set(h.userId, h.date);
    }

    // Xếp hạng: ít lượt nhất → lâu chưa đi nhất ('' = chưa đi, đứng đầu) → ngẫu nhiên.
    const chosen = candidates
      .map((c) => ({ c, n: count.get(c.id) ?? 0, last: last.get(c.id) ?? '', r: Math.random() }))
      .sort((a, b) => a.n - b.n || a.last.localeCompare(b.last) || a.r - b.r)[0].c;

    // Ghi lượt. @unique(date) chống double-call: nếu vừa bị chốt song song thì đọc lại.
    try {
      await this.prisma.pickupAssignment.create({ data: { date, userId: chosen.id, weekId: week.id } });
    } catch {
      const again = await this.prisma.pickupAssignment.findUnique({
        where: { date },
        include: { user: { select: PICK_SELECT } },
      });
      if (again) return this.format(again.user, date, true);
      throw new Error('Không ghi được lượt lấy cơm');
    }
    return this.format(chosen, date, false);
  }

  /** Lịch sử lượt gần đây (admin xem để kiểm chứng sự công bằng). */
  async history(limit = 30) {
    const rows = await this.prisma.pickupAssignment.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true } } },
    });
    return rows.map((r) => ({ date: r.date, fullName: r.user.fullName, createdAt: r.createdAt }));
  }
}
