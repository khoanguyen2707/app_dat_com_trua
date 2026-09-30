/**
 * Món "luôn có" (Dish.pinned) — admin đánh dấu một lần, món đó xuất hiện trong thực đơn
 * MỌI ngày mà admin đã đăng.
 *
 * Cố ý KHÔNG mở ngày chưa đăng thực đơn: cổng "chờ admin đăng thực đơn rồi mới đặt được"
 * vẫn phải do admin quyết. Vì vậy mọi nơi gọi hàm này chỉ gọi khi ngày đó đã có menu.
 */

/**
 * Gộp món pinned vào tập món của một ngày.
 * Giữ nguyên thứ tự món admin đăng, món pinned chưa có thì nối vào cuối; không trùng lặp.
 */
export function mergePinned(dayIds: readonly string[], pinnedIds: readonly string[]): string[] {
  const seen = new Set(dayIds);
  return [...dayIds, ...pinnedIds.filter((id) => !seen.has(id))];
}

/**
 * Gộp món pinned vào toàn bộ dayMenu của một tuần.
 * Ngày CHƯA đăng thực đơn (không có khoá, hoặc mảng rỗng) được giữ nguyên trạng thái rỗng.
 */
export function mergePinnedIntoDayMenu(
  dayMenu: Record<string, string[]> | null | undefined,
  pinnedIds: readonly string[],
): Record<string, string[]> {
  const menu = dayMenu ?? {};
  const out: Record<string, string[]> = {};
  for (const [day, ids] of Object.entries(menu)) {
    out[day] = ids && ids.length ? mergePinned(ids, pinnedIds) : ids;
  }
  return out;
}
