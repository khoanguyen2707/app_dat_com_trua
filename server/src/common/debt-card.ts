import type { Debtor, DebtWeek } from './debt';
import { currentWeekStart } from './week-lock';

const DAY_MS = 86_400_000;
const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';
/** "21/9 - 26/9/2026" → "21/9" (ngày bắt đầu tuần, đủ để nhận ra tuần). */
const weekStartLabel = (label: string) =>
  label
    .split(' - ')[0]
    .replace(/\/\d{4}$/, '')
    .trim();

/** Giờ VN dạng Date "giả UTC" để lấy thứ / ngày / tháng. */
const vn = (d: Date) => new Date(d.getTime() + 7 * 3600_000);

export interface TeamsDomains {
  /** Tên miền nội bộ, dùng thẳng làm UPN (vd wecare-i.com). */
  internal: string;
  /** Tên miền tenant cho guest: ten_gmail.com#EXT#@<guest> (vd wecarei.onmicrosoft.com). */
  guest: string;
}

/**
 * Email trong app → id Teams dùng để @mention.
 * Object ID, UPN guest (#EXT#) và email nội bộ giữ nguyên; email ngoài (guest Gmail…)
 * đổi sang UPN guest của tenant.
 */
export function toTeamsId(email: string, domains: TeamsDomains): string {
  const e = email.trim();
  if (!e.includes('@') || e.includes('#EXT#')) return e;
  if (e.toLowerCase().endsWith('@' + domains.internal.toLowerCase())) return e;
  return `${e.replace('@', '_')}#EXT#@${domains.guest}`;
}

/**
 * Thứ 2: tuần vừa bắt đầu hôm nay mới có một bữa, nhắc thì chỉ gây phiền → bỏ ra.
 * Các ngày khác giữ nguyên.
 */
export function dropFreshWeek(debtors: Debtor[], now: Date = new Date()): Debtor[] {
  if (vn(now).getUTCDay() !== 1) return debtors;
  const start = currentWeekStart(now).getTime();
  return debtors
    .map((d) => {
      const weeks = d.weeks.filter((w) => !w.weekStart || w.weekStart.getTime() < start);
      const total = weeks.reduce((a, w) => a + w.total, 0);
      const pendingTotal = weeks.filter((w) => w.status === 'PENDING').reduce((a, w) => a + w.total, 0);
      return { ...d, weeks, total, pendingTotal };
    })
    .filter((d) => d.weeks.length > 0);
}

/** Quá hạn = tuần bắt đầu trước tuần trước (đã kết thúc hơn một tuần mà chưa trả). */
export function isOverdue(w: DebtWeek, now: Date = new Date()): boolean {
  if (!w.weekStart) return true; // tuần cũ không có mốc ngày → chắc chắn đã lâu
  return w.weekStart.getTime() < currentWeekStart(now).getTime() - 7 * DAY_MS;
}

type Mentioned = { name: string; email: string | null };

/**
 * Adaptive Card nhắc công nợ cho Teams ("Post card in a chat or channel").
 * @mention khai báo sẵn trong msteams.entities → flow chỉ việc đăng, không phải lặp lấy token.
 */
export function buildDebtCard(
  debtors: Debtor[],
  opts: { payUrl: string; confirmUrl: string; admins: Mentioned[]; domains: TeamsDomains; now?: Date },
) {
  const now = opts.now ?? new Date();
  const entities: { type: 'mention'; text: string; mentioned: { id: string; name: string } }[] = [];
  const usedText = new Map<string, string>(); // text <at> → id, tránh trùng tên khác người

  /** Chuỗi hiển thị cho 1 người: <at>Tên</at> nếu tag được, không thì tên thường. */
  const who = (p: Mentioned) => {
    if (!p.email) return p.name;
    const id = toTeamsId(p.email, opts.domains);
    let text = `<at>${p.name}</at>`;
    for (let i = 2; usedText.has(text) && usedText.get(text) !== id; i++) text = `<at>${p.name} (${i})</at>`;
    if (!usedText.has(text)) {
      usedText.set(text, id);
      entities.push({ type: 'mention', text, mentioned: { id, name: p.name } });
    }
    return text;
  };

  const grandTotal = debtors.reduce((a, d) => a + d.total, 0);
  const pending = debtors.flatMap((d) => d.weeks.filter((w) => w.status === 'PENDING').map((w) => ({ d, w })));
  const pendingTotal = pending.reduce((a, p) => a + p.w.total, 0);
  const today = vn(now);
  const dateLabel = `${WEEKDAY[today.getUTCDay()]} · ${today.getUTCDate()}/${today.getUTCMonth() + 1}`;

  const cell = (text: string, extra: Record<string, unknown> = {}) => ({
    type: 'TextBlock',
    text,
    wrap: true,
    ...extra,
  });
  const row = (cols: [unknown[], string | number][], extra: Record<string, unknown> = {}) => ({
    type: 'ColumnSet',
    spacing: 'Small',
    ...extra,
    columns: cols.map(([items, width]) => ({ type: 'Column', width, verticalContentAlignment: 'Center', items })),
  });

  const debtorRows = debtors.map((d, i) => {
    const overdue = d.weeks.some((w) => w.status === 'UNPAID' && isOverdue(w, now));
    const weeks = d.weeks.map((w) => weekStartLabel(w.weekLabel) + (w.status === 'PENDING' ? ' ⏳' : '')).join(', ');
    return row(
      [
        [cell(who({ name: d.fullName, email: d.email ?? null }))],
        [
          cell(weeks, { isSubtle: true, size: 'Small' }),
          ...(overdue
            ? [cell('⚠ Quá hạn', { color: 'Attention', size: 'Small', weight: 'Bolder', spacing: 'None' })]
            : []),
        ],
        [
          cell(vnd(d.total), {
            weight: 'Bolder',
            horizontalAlignment: 'Right',
            color: overdue ? 'Attention' : 'Default',
          }),
        ],
      ].map((items, c) => [items, c === 0 ? 5 : c === 1 ? 4 : 3] as [unknown[], number]),
      i === 0 ? {} : { separator: true },
    );
  });

  const header = row(
    [
      [cell('Người nợ', { weight: 'Bolder', size: 'Small', isSubtle: true })],
      [cell('Tuần', { weight: 'Bolder', size: 'Small', isSubtle: true })],
      [cell('Số tiền', { weight: 'Bolder', size: 'Small', isSubtle: true, horizontalAlignment: 'Right' })],
    ].map((items, c) => [items, c === 0 ? 5 : c === 1 ? 4 : 3] as [unknown[], number]),
  );

  const body: unknown[] = [
    {
      type: 'Container',
      style: 'emphasis',
      bleed: true,
      items: [
        row(
          [
            [cell('💰 CÔNG NỢ CƠM TRƯA', { weight: 'Bolder', size: 'Medium' })],
            [cell(dateLabel, { isSubtle: true, horizontalAlignment: 'Right' })],
          ].map((items, c) => [items, c === 0 ? 'stretch' : 'auto'] as [unknown[], string]),
        ),
        row(
          [
            [
              cell('Tổng còn nợ', { isSubtle: true, size: 'Small' }),
              cell(vnd(grandTotal), { size: 'ExtraLarge', weight: 'Bolder', color: 'Accent', spacing: 'None' }),
            ],
            [
              cell(`${debtors.length} người`, { horizontalAlignment: 'Right', weight: 'Bolder' }),
              cell(`${pending.length} khoản chờ xác nhận`, {
                horizontalAlignment: 'Right',
                isSubtle: true,
                size: 'Small',
                spacing: 'None',
              }),
            ],
          ].map((items, c) => [items, c === 0 ? 'stretch' : 'auto'] as [unknown[], string]),
        ),
      ],
    },
    { ...header, spacing: 'Medium' },
    ...debtorRows,
  ];

  if (pending.length) {
    body.push({
      type: 'Container',
      style: 'warning',
      spacing: 'Medium',
      items: [
        cell(`⏳ Đã báo chuyển khoản, chờ admin xác nhận · ${vnd(pendingTotal)}`, { weight: 'Bolder', size: 'Small' }),
        ...pending.map((p) =>
          cell(
            `${who({ name: p.d.fullName, email: p.d.email ?? null })} — ${weekStartLabel(p.w.weekLabel)} · ${vnd(p.w.total)}`,
            {
              size: 'Small',
              spacing: 'None',
            },
          ),
        ),
      ],
    });
  }

  body.push(
    cell('Vui lòng thanh toán trước cuối tuần. Mở app để quét VietQR — trả từng tuần hoặc tất cả một lần.', {
      isSubtle: true,
      size: 'Small',
      spacing: 'Medium',
    }),
  );
  if (opts.admins.length) {
    body.push(cell(`cc ${opts.admins.map(who).join(', ')}`, { size: 'Small', spacing: 'Small' }));
  }

  const actions: unknown[] = [];
  if (opts.payUrl)
    actions.push({ type: 'Action.OpenUrl', title: '💳 Thanh toán ngay', url: opts.payUrl, style: 'positive' });
  if (pending.length && opts.confirmUrl) {
    actions.push({ type: 'Action.OpenUrl', title: `🔎 Admin xác nhận (${pending.length})`, url: opts.confirmUrl });
  }

  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body,
    actions,
    msteams: { width: 'Full', entities },
  };
}
