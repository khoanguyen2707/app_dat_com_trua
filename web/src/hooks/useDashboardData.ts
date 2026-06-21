import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Dish, Grid, PaymentConfig, Week } from '@/types';

/**
 * Tập trung toàn bộ dữ liệu của màn hình chính (grid, thực đơn, thanh toán, tuần)
 * cùng các hàm reload tương ứng — giúp state được quản lý ở một chỗ duy nhất.
 */
export function useDashboardData() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadGrid = useCallback(async () => {
    try {
      setGrid(await api.activeGrid());
    } catch {
      setGrid(null);
    }
  }, []);
  const reloadDishes = useCallback(async () => setDishes(await api.dishes()), []);
  const reloadPayment = useCallback(async () => setPayment(await api.payment()), []);
  const reloadWeeks = useCallback(async () => setWeeks(await api.weeks()), []);

  const reloadAll = useCallback(
    () => Promise.all([reloadGrid(), reloadDishes(), reloadPayment(), reloadWeeks()]),
    [reloadGrid, reloadDishes, reloadPayment, reloadWeeks],
  );

  useEffect(() => {
    reloadAll().finally(() => setLoading(false));
  }, [reloadAll]);

  return {
    grid,
    dishes,
    payment,
    weeks,
    loading,
    /** Ghi đè grid ở local ngay lập tức (cho optimistic update, không gọi mạng). */
    mutateGrid: setGrid,
    reloadGrid,
    reloadDishes,
    reloadPayment,
    reloadWeeks,
    reloadAll,
  };
}
