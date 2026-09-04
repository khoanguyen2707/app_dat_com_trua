import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { type DayKey, elapsedDayKeys, vnDateStr, vnTodayKey } from '@/common/week-lock';

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

/** Số liệu xoay tua của một người (mọi con số đều tính từ trước tới nay). */
export type PickupStat = {
  userId: string;
  orderCount: number; // tổng số NGÀY đã đặt cơm (chỉ tính ngày đã diễn ra)
  pickupCount: number; // tổng số lượt đã đi lấy cơm
  lastPickup: string; // 'YYYY-MM-DD' lượt gần nhất, '' = chưa đi lần nào
  rate: number; // tỷ lệ đi lấy đã làm mượt — càng THẤP càng được ưu tiên
};

const PICK_SELECT = { id: true, fullName: true, email: true, teamsEmail: true } as const;

/**
 * Trọng số "prior" khi làm mượt tỷ lệ (Laplace smoothing).
 *
 * Coi như mỗi người đã có sẵn PRIOR_ORDERS lượt đặt ẢO với tỷ lệ đúng bằng tỷ lệ trung bình
 * của nhóm. Mục đích: người mới (mới đặt 1-2 lần) KHÔNG bị đẩy lên đầu chỉ vì pickupCount = 0
 * — 0/1 là bằng chứng quá yếu để kết luận họ "đang đi ít hơn phần của mình".
 *
 * Càng lớn thì người mới càng lâu mới tới lượt. 5 ≈ "cần khoảng 1 tuần đặt cơm mới tính đủ".
 */
export const PRIOR_ORDERS = 5;

/** Ngưỡng coi 2 tỷ lệ số thực là BẰNG NHAU (để tiêu chí phụ còn cơ hội được xét). */
const RATE_EPS = 1e-9;

/** Tỷ lệ trung bình của cả nhóm = tổng lượt đi / tổng lượt đặt. Nhóm chưa ai đi → 0. */
export function groupMeanRate(rows: { pickupCount: number; orderCount: number }[]): number {
  let pickups = 0;
  let orders = 0;
  for (const r of rows) {
    pickups += r.pickupCount;
    orders += r.orderCount;
  }
  return orders > 0 ? pickups / orders : 0;
}

/**
 * Tỷ lệ đi lấy cơm đã làm mượt: (đã đi + prior × trung bình nhóm) / (đã đặt + prior).
 *
 * Người đặt nhiều mà đi ít → tỷ lệ thấp → tới lượt trước.
 * Người đặt ít → mẫu số nhỏ, prior kéo tỷ lệ về sát trung bình nhóm → không bị bốc dồn.
 */
export function smoothedRate(pickupCount: number, orderCount: number, mean: number): number {
  return (pickupCount + PRIOR_ORDERS * mean) / (orderCount + PRIOR_ORDERS);
}

/**
 * So sánh 2 ứng viên. Trả về < 0 nếu `a` được ưu tiên hơn.
 *   1) tỷ lệ đi lấy thấp nhất →
 *   2) lâu chưa đi nhất ('' = chưa đi lần nào, đứng đầu) →
 *   3) ngẫu nhiên.
 */
export function compareCandidates(
  a: { rate: number; lastPickup: string; tie: number },
  b: { rate: number; lastPickup: string; tie: number },
): number {
  const byRate = a.rate - b.rate;
  if (Math.abs(byRate) > RATE_EPS) return byRate;
  const byLast = a.lastPickup.localeCompare(b.lastPickup);
  if (byLast !== 0) return byLast;
  return a.tie - b.tie;
}

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

  /**
   * Gom số liệu xoay tua cho một nhóm user: đã đặt bao nhiêu ngày, đã đi bao nhiêu lượt,
   * lần đi gần nhất, và tỷ lệ đã làm mượt.
   *
   * `orderCount` chỉ đếm những ngày ĐÃ DIỄN RA (xem `elapsedDayKeys`) nên ngày tương lai
   * do admin tick trước không làm phồng mẫu số.
   */
  private async collectStats(userIds: string[], now: Date): Promise<Map<string, PickupStat>> {
    if (!userIds.length) return new Map();

    const [orders, history] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: true,
          sun: true,
          week: { select: { startDate: true } },
        },
      }),
      this.prisma.pickupAssignment.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, date: true },
      }),
    ]);

    const orderCount = new Map<string, number>();
    for (const o of orders) {
      let n = 0;
      for (const key of elapsedDayKeys(o.week.startDate, now)) {
        if (o[key]) n++;
      }
      if (n) orderCount.set(o.userId, (orderCount.get(o.userId) ?? 0) + n);
    }

    const pickupCount = new Map<string, number>();
    const lastPickup = new Map<string, string>();
    for (const h of history) {
      pickupCount.set(h.userId, (pickupCount.get(h.userId) ?? 0) + 1);
      if (h.date > (lastPickup.get(h.userId) ?? '')) lastPickup.set(h.userId, h.date);
    }

    // Trung bình nhóm tính trên đúng nhóm đang xét, rồi mới làm mượt từng người theo nó.
    const base = userIds.map((id) => ({
      userId: id,
      orderCount: orderCount.get(id) ?? 0,
      pickupCount: pickupCount.get(id) ?? 0,
      lastPickup: lastPickup.get(id) ?? '',
    }));
    const mean = groupMeanRate(base);

    return new Map(base.map((b) => [b.userId, { ...b, rate: smoothedRate(b.pickupCount, b.orderCount, mean) }]));
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
   * Bốc người đi lấy cơm HÔM NAY theo TỶ LỆ đi lấy trên số lần đặt cơm.
   *
   * Ứng viên = người đang `active` VÀ **có đặt cơm hôm nay** (tick cột thứ tương ứng
   * trong tuần đang mở) VÀ không bật `pickupOptOut`. Ai không đặt thì không bao giờ lọt vào.
   *
   * Ưu tiên chọn:
   *   1) tỷ lệ `đã đi / đã đặt` THẤP NHẤT (đã làm mượt bằng prior — xem `smoothedRate`) →
   *   2) lâu rồi chưa đi nhất (chưa đi lần nào = ưu tiên cao nhất) →
   *   3) ngẫu nhiên.
   *
   * => Người đặt cơm nhiều gánh nhiều lượt hơn người thỉnh thoảng mới đặt, thay vì cào bằng
   *    theo tổng số lượt. Người mới không bị bốc dồn nhiều ngày liên tiếp vì prior kéo tỷ lệ
   *    của họ về sát trung bình nhóm cho tới khi có đủ dữ liệu.
   *
   * Idempotent theo ngày: `PickupAssignment.date` là @unique nên gọi lại trong ngày
   * (kể cả 2 lần gần như đồng thời) đều trả về đúng người đã chốt.
   */
  async draw(): Promise<PickupResult> {
    // Một mốc thời gian duy nhất cho cả lượt bốc: tránh lệch ngày nếu chạy đúng lúc giao ngày.
    const now = new Date();
    const date = vnDateStr(now);

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
    const dayFilter: Partial<Record<DayKey, boolean>> = { [vnTodayKey(now)]: true };
    const orders = await this.prisma.order.findMany({
      where: { weekId: week.id, user: { active: true, pickupOptOut: false }, ...dayFilter },
      include: { user: { select: PICK_SELECT } },
    });
    const candidates = orders.map((o) => o.user);
    if (!candidates.length) return { date, picked: false, reason: 'Hôm nay không có ai đặt cơm' };

    // Số liệu của RIÊNG nhóm ứng viên hôm nay (trung bình nhóm cũng tính trên nhóm này).
    const stats = await this.collectStats(
      candidates.map((c) => c.id),
      now,
    );

    const chosen = candidates
      .map((c) => {
        const s = stats.get(c.id);
        return {
          c,
          rate: s?.rate ?? 0,
          lastPickup: s?.lastPickup ?? '',
          tie: Math.random(),
        };
      })
      .sort(compareCandidates)[0].c;

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

  /**
   * Bảng xếp hạng xoay tua của toàn bộ thành viên đang active (admin đối soát công bằng).
   * Sắp theo tỷ lệ tăng dần = thứ tự sẽ được ưu tiên khi cùng đặt cơm một ngày.
   */
  async stats() {
    const users = await this.prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true, email: true, pickupOptOut: true },
      orderBy: { fullName: 'asc' },
    });
    const stats = await this.collectStats(
      users.map((u) => u.id),
      new Date(),
    );

    return users
      .map((u) => {
        const s = stats.get(u.id);
        return {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          pickupOptOut: u.pickupOptOut,
          orderCount: s?.orderCount ?? 0,
          pickupCount: s?.pickupCount ?? 0,
          lastPickup: s?.lastPickup || null,
          // Tỷ lệ thô để người đọc dễ đối chiếu; `rate` là con số thuật toán thực sự dùng.
          rawRate: s && s.orderCount > 0 ? s.pickupCount / s.orderCount : null,
          rate: s?.rate ?? 0,
        };
      })
      .sort((a, b) => a.rate - b.rate);
  }
}
