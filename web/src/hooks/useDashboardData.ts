import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { api } from '@/services/api';
import type { Dish, Grid, PaymentConfig, Week } from '@/types';

/** Chu kỳ làm mới nền khi tab đang mở — đủ để thấy thực đơn admin vừa đăng. */
const POLL_MS = 60_000;
/** Quay lại tab trong khoảng này thì không cần tải lại. */
const FOCUS_MIN_GAP_MS = 10_000;

/** Chỉ đổi state khi dữ liệu thật sự khác, tránh render lại cả màn hình mỗi lần poll. */
function same<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Tập trung toàn bộ dữ liệu của màn hình chính (grid, thực đơn, thanh toán, tuần)
 * cùng các hàm reload tương ứng — giúp state được quản lý ở một chỗ duy nhất.
 *
 * Để màn hình mượt và ổn định:
 * - Lần đầu chỉ chờ grid + món (đủ để đặt cơm); thanh toán, lịch sử tuần tải sau.
 * - Lỗi mạng giữ nguyên dữ liệu đang có; chỉ 404 (không có tuần mở) mới xoá grid.
 * - Response về muộn không đè lên dữ liệu mới hơn (hoặc bản optimistic).
 * - Tự làm mới im lặng khi quay lại tab và định kỳ khi tab đang hiện.
 */
export function useDashboardData() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  /** Số thứ tự lần ghi grid gần nhất; response mang số cũ hơn thì bỏ. */
  const gridSeq = useRef(0);
  const gridInflight = useRef(0);
  const lastSync = useRef(0);

  const loadGrid = useCallback(async (silent: boolean) => {
    const seq = ++gridSeq.current;
    gridInflight.current++;
    try {
      const next = await api.activeGrid(silent);
      if (seq === gridSeq.current) setGrid((prev) => (prev && same(prev, next) ? prev : next));
    } catch (e: any) {
      if (seq === gridSeq.current && e?.status === 404) setGrid(null);
    } finally {
      gridInflight.current--;
      lastSync.current = Date.now();
    }
  }, []);

  const reloadGrid = useCallback(() => loadGrid(false), [loadGrid]);
  const reloadDishes = useCallback(async () => {
    const next = await api.dishes();
    setDishes((prev) => (same(prev, next) ? prev : next));
  }, []);
  const reloadPayment = useCallback(async () => setPayment(await api.payment()), []);
  const reloadWeeks = useCallback(async () => setWeeks(await api.weeks()), []);

  /** Ghi đè grid ở local (optimistic) — đồng thời vô hiệu các response grid đang bay. */
  const mutateGrid = useCallback((v: SetStateAction<Grid | null>) => {
    gridSeq.current++;
    setGrid(v);
  }, []);

  const reloadAll = useCallback(
    () => Promise.allSettled([reloadGrid(), reloadDishes(), reloadPayment(), reloadWeeks()]),
    [reloadGrid, reloadDishes, reloadPayment, reloadWeeks],
  );

  useEffect(() => {
    // Màn chính hiện ngay khi có grid + món; hai cái còn lại không chặn.
    Promise.allSettled([reloadGrid(), reloadDishes()]).finally(() => setLoading(false));
    reloadPayment().catch(() => {});
    reloadWeeks().catch(() => {});
  }, [reloadGrid, reloadDishes, reloadPayment, reloadWeeks]);

  useEffect(() => {
    /** Làm mới nền: không thanh tiến trình, bỏ qua nếu đang có request grid khác. */
    const refresh = () => {
      if (document.visibilityState !== 'visible' || gridInflight.current > 0) return;
      loadGrid(true);
      reloadDishes().catch(() => {});
    };
    const onFocus = () => {
      if (Date.now() - lastSync.current > FOCUS_MIN_GAP_MS) refresh();
    };
    const timer = window.setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadGrid, reloadDishes]);

  return {
    grid,
    dishes,
    payment,
    weeks,
    loading,
    /** Ghi đè grid ở local ngay lập tức (cho optimistic update, không gọi mạng). */
    mutateGrid,
    reloadGrid,
    reloadDishes,
    reloadPayment,
    reloadWeeks,
    reloadAll,
  };
}
