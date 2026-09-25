import { DAY_KEYS, type DayKey } from './week-lock';

export type DebtStatus = 'UNPAID' | 'PENDING';

/** Một đơn (1 user × 1 tuần) chưa được admin xác nhận, đã gom đủ dữ liệu để tính tiền. */
export interface DebtOrderInput {
  weekId: string;
  weekLabel: string;
  /** Mốc sắp xếp tuần: startDate nếu có, không thì createdAt. */
  weekSort: Date;
  /** Thứ 2 của tuần (00:00 UTC, lịch VN); null với tuần cũ chưa có startDate. */
  weekStart?: Date | null;
  unitPrice: number;
  userId: string;
  fullName: string;
  /** Email Microsoft 365 để @mention trong Teams (teamsEmail, không có thì email đăng nhập). */
  email?: string | null;
  days: Record<DayKey, boolean>;
  drinks: { name: string; qty: number; price: number }[];
  status: DebtStatus;
  reportedAt: Date | null;
}

export interface DebtWeek {
  weekId: string;
  weekLabel: string;
  weekStart: Date | null;
  unitPrice: number;
  days: Record<DayKey, boolean>;
  servings: number;
  foodTotal: number;
  drinks: { name: string; qty: number; price: number }[];
  drinksTotal: number;
  total: number;
  status: DebtStatus;
  reportedAt: Date | null;
}

export interface Debtor {
  userId: string;
  fullName: string;
  email?: string | null;
  weeks: DebtWeek[];
  total: number;
  /** Phần đã báo chuyển khoản, đang chờ admin xác nhận. */
  pendingTotal: number;
}

/** Tiền 1 tuần của 1 người: số suất × đơn giá + đồ uống. */
export function toDebtWeek(o: DebtOrderInput): DebtWeek {
  const servings = DAY_KEYS.reduce((a, d) => a + (o.days[d] ? 1 : 0), 0);
  const foodTotal = servings * o.unitPrice;
  const drinksTotal = o.drinks.reduce((a, d) => a + d.qty * d.price, 0);
  return {
    weekId: o.weekId,
    weekLabel: o.weekLabel,
    weekStart: o.weekStart ?? null,
    unitPrice: o.unitPrice,
    days: o.days,
    servings,
    foodTotal,
    drinks: o.drinks,
    drinksTotal,
    total: foodTotal + drinksTotal,
    status: o.status,
    reportedAt: o.reportedAt,
  };
}

/**
 * Gom các đơn chưa xác nhận thành danh sách người nợ.
 * Bỏ tuần 0đ; tuần xếp cũ → mới; người xếp theo tổng nợ giảm dần.
 */
export function groupDebts(orders: DebtOrderInput[]): Debtor[] {
  const sorted = [...orders].sort((a, b) => a.weekSort.getTime() - b.weekSort.getTime());
  const byUser = new Map<string, Debtor>();
  for (const o of sorted) {
    const week = toDebtWeek(o);
    if (week.total <= 0) continue;
    let d = byUser.get(o.userId);
    if (!d) {
      d = { userId: o.userId, fullName: o.fullName, email: o.email ?? null, weeks: [], total: 0, pendingTotal: 0 };
      byUser.set(o.userId, d);
    }
    d.weeks.push(week);
    d.total += week.total;
    if (week.status === 'PENDING') d.pendingTotal += week.total;
  }
  return [...byUser.values()].sort((a, b) => b.total - a.total || a.fullName.localeCompare(b.fullName));
}

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const shortLabel = (label: string) => label.replace(/\/\d{4}/g, '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Một người cần @mention: flow thay `key` trong html bằng token @mention của Teams. */
export interface DebtMention {
  key: string;
  name: string;
  email: string;
  role: 'debtor' | 'admin';
}

export interface DebtReport {
  hasDebt: boolean;
  debtorCount: number;
  pendingCount: number;
  grandTotal: number;
  payUrl: string;
  confirmUrl: string;
  text: string;
  /** Tên người nợ / admin đã thay bằng placeholder `@@Mn@@` — flow thay bằng token @mention. */
  html: string;
  /** Cùng nội dung nhưng tên để nguyên, dùng khi flow không tag được. */
  htmlPlain: string;
  mentions: DebtMention[];
  debtors: Debtor[];
}

/** Dựng báo cáo nhắc nợ cho Power Automate đăng lên Teams. */
export function buildDebtReport(
  debtors: Debtor[],
  appUrl: string,
  admins: { name: string; email: string | null }[] = [],
): DebtReport {
  const base = appUrl.replace(/\/+$/, '');
  const payUrl = base ? `${base}/#pay` : '';
  const confirmUrl = base ? `${base}/#pay-pending` : '';
  const grandTotal = debtors.reduce((a, d) => a + d.total, 0);
  const pendingCount = debtors.reduce((a, d) => a + d.weeks.filter((w) => w.status === 'PENDING').length, 0);

  const weekText = (w: DebtWeek) =>
    `${shortLabel(w.weekLabel)}: ${vnd(w.total)}${w.status === 'PENDING' ? ' (đã báo CK, chờ xác nhận)' : ''}`;

  const head = debtors.length
    ? `💰 Nhắc công nợ cơm trưa — ${debtors.length} người còn ${vnd(grandTotal)}`
    : '🎉 Không còn ai nợ tiền cơm. Cảm ơn mọi người!';
  const textLines = debtors.map((d) => `- ${d.fullName}: ${vnd(d.total)} — ${d.weeks.map(weekText).join('; ')}`);
  const textFoot: string[] = [];
  if (debtors.length && payUrl) textFoot.push(`👉 Thanh toán ngay: ${payUrl}`);
  if (pendingCount && confirmUrl) textFoot.push(`🔎 Admin kiểm tra ${pendingCount} khoản chờ xác nhận: ${confirmUrl}`);

  const mentions: DebtMention[] = [];
  /** Tên đã escape, hoặc placeholder nếu người đó có email để tag. */
  const tag = (name: string, email: string | null | undefined, role: DebtMention['role']) => {
    if (!email) return esc(name);
    const key = `@@M${mentions.length}@@`;
    mentions.push({ key, name, email, role });
    return key;
  };

  const buildHtml = (withTags: boolean) => {
    const who = (name: string, email: string | null | undefined, role: DebtMention['role']) =>
      withTags ? tag(name, email, role) : esc(name);
    const rows = debtors
      .map(
        (d) =>
          `<li><b>${who(d.fullName, d.email, 'debtor')}</b>: <b>${vnd(d.total)}</b><ul>${d.weeks
            .map((w) => `<li>${esc(weekText(w))}</li>`)
            .join('')}</ul></li>`,
      )
      .join('');
    const foot: string[] = [];
    if (debtors.length && payUrl) foot.push(`👉 <a href="${esc(payUrl)}">Thanh toán ngay</a>`);
    if (debtors.length && admins.length) {
      const names = admins.map((a) => who(a.name, a.email, 'admin')).join(', ');
      foot.push(
        pendingCount && confirmUrl
          ? `🔎 ${names}: <a href="${esc(confirmUrl)}">kiểm tra ${pendingCount} khoản chờ xác nhận</a>`
          : `cc ${names}`,
      );
    } else if (pendingCount && confirmUrl) {
      foot.push(`🔎 <a href="${esc(confirmUrl)}">Admin kiểm tra ${pendingCount} khoản chờ xác nhận</a>`);
    }
    return [`<p><b>${esc(head)}</b></p>`, rows ? `<ul>${rows}</ul>` : '', ...foot.map((l) => `<p>${l}</p>`)].join('');
  };

  const htmlPlain = buildHtml(false);
  const html = buildHtml(true);

  return {
    hasDebt: debtors.length > 0,
    debtorCount: debtors.length,
    pendingCount,
    grandTotal,
    payUrl,
    confirmUrl,
    text: [head, ...textLines, ...textFoot].join('\n'),
    html,
    htmlPlain,
    mentions,
    debtors,
  };
}
