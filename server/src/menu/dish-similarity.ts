/**
 * Độ giống tên món + gom cụm món nghi trùng — thuần, test được.
 *
 * Dùng chung cho: phân tích thực đơn dán vào (menu-parse) và công cụ dọn trùng danh mục.
 * So trên khoá khớp (matchKey: bỏ dấu, bỏ khoảng trắng) nên chỉ bắt lỗi gõ/chính tả,
 * không bắt nghĩa. Chỉ món CÙNG loại (ăn / uống) mới có thể trùng nhau.
 */

export const NEAR_THRESHOLD = 0.82; // >= ngưỡng này coi là "ngờ ngợ có thể trùng"

/** Khoảng cách Levenshtein. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/** Độ giống 0..1 trên hai khoá khớp. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export interface SimilarItem {
  id: string;
  key: string; // matchKey của tên
  category: string;
}

/** Khoá cặp không thứ tự, dùng cho danh sách "đã xác nhận khác nhau". */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Tối đa `limit` món trong `pool` gần giống `key` (cùng loại), điểm giảm dần. */
export function nearest<T extends SimilarItem>(
  key: string,
  category: string,
  pool: T[],
  limit = 3,
): (T & { score: number })[] {
  return pool
    .filter((p) => p.category === category && p.key !== key)
    .map((p) => ({ ...p, score: similarity(key, p.key) }))
    .filter((p) => p.score >= NEAR_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Gom cụm món nghi trùng (union-find trên các cặp đủ giống, cùng loại).
 * Cặp nằm trong `distinct` (admin đã xác nhận khác nhau) không được nối.
 * Chỉ trả cụm từ 2 món trở lên; thứ tự món giữ theo `items`.
 */
export function clusters<T extends SimilarItem>(items: T[], distinct: Set<string> = new Set()): T[][] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.category !== b.category) continue;
      if (distinct.has(pairKey(a.id, b.id))) continue;
      if (a.key === b.key || similarity(a.key, b.key) >= NEAR_THRESHOLD) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, T[]>();
  items.forEach((it, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), it]);
  });
  return [...groups.values()].filter((g) => g.length > 1);
}
