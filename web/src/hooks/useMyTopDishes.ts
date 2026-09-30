import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { MyTopDish } from '@/types';

/**
 * Món tôi hay đặt (90 ngày gần nhất), dùng để xếp lại picker.
 *
 * Cache ở cấp module vì phiếu đặt món mở/đóng liên tục và dữ liệu này gần như không
 * đổi trong một phiên — gọi lại mỗi lần mở phiếu là lãng phí trên API free hay ngủ.
 * Đặt xong thì `invalidateMyTopDishes()` để lần mở sau lấy số mới.
 */
let cache: Promise<MyTopDish[]> | null = null;

export function invalidateMyTopDishes() {
  cache = null;
}

export function useMyTopDishes(): Map<string, number> {
  const [top, setTop] = useState<MyTopDish[]>([]);

  useEffect(() => {
    let alive = true;
    cache ??= api.myTopDishes().catch(() => [] as MyTopDish[]);
    void cache.then((rows) => {
      if (alive) setTop(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  return new Map(top.map((t) => [t.dishId, t.count]));
}
