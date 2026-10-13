import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cache dữ liệu theo key ở cấp module, sống qua việc đổi tab.
 *
 * Mỗi tab trong app là một panel riêng; đổi tab là unmount, state local mất sạch, vào
 * lại phải tải từ đầu kèm spinner dù dữ liệu vừa xem xong vẫn còn đúng. Hook này giữ
 * bản vừa tải ở ngoài React: vào lại tab là hiện ngay bản cũ (không spinner), rồi âm
 * thầm tải lại ở nền để số liệu kịp mới.
 *
 * Cache ở cấp module nên cũng mất khi F5 — đúng ý: không ai muốn mở app ra thấy số liệu
 * của hôm qua. Mở rộng từ cách `useMyTopDishes` đã làm, chỉ là gom lại để dùng chung.
 *
 * `fetcher` nhận cờ `silent` để lần tải nền không kích hoạt toast "Đang xử lý…".
 */

/** Dữ liệu đã tải, theo key. Có key = đã từng tải xong ít nhất một lần. */
const cache = new Map<string, unknown>();
/** Request đang bay, theo key — hai panel cùng key thì dùng chung một chuyến. */
const inflight = new Map<string, Promise<unknown>>();

/** Bỏ cache một key (hoặc theo tiền tố, vd 'weekGrid:') để lần đọc sau tải lại thật. */
export function invalidateCached(prefix: string) {
  for (const key of [...cache.keys()]) if (key === prefix || key.startsWith(prefix)) cache.delete(key);
}

function fetchShared<T>(key: string, fetcher: (silent: boolean) => Promise<T>, silent: boolean): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = fetcher(silent)
    .then((v) => {
      cache.set(key, v);
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Bản đã cache, đọc đồng bộ — cho chỗ cần nhiều key một lúc (vd grid của N tuần). */
export function peekCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

/** Lấy qua cache: có sẵn thì trả ngay, chưa có thì tải (gộp request nếu cùng key). */
export function getCached<T>(key: string, fetcher: (silent: boolean) => Promise<T>, silent = true): Promise<T> {
  const hit = cache.get(key) as T | undefined;
  return hit !== undefined ? Promise.resolve(hit) : fetchShared(key, fetcher, silent);
}

export interface Cached<T> {
  /** null = chưa có gì để hiện (lần đầu, hoặc lần đầu lỗi). */
  data: T | null;
  /** Chỉ true khi KHÔNG có bản cũ nào để hiện — tải lại ở nền không bật cờ này. */
  loading: boolean;
  /** Tải lại: mặc định im lặng; `refresh(false)` khi người dùng tự bấm. */
  refresh: (silent?: boolean) => Promise<void>;
  /** Ghi đè dữ liệu ở local (cập nhật optimistic), đồng thời cập nhật cache. */
  mutate: (v: T) => void;
}

export function useCached<T>(
  key: string,
  fetcher: (silent: boolean) => Promise<T>,
  opts: { onError?: (e: unknown) => void } = {},
): Cached<T> {
  const [data, setData] = useState<T | null>(() => (cache.get(key) as T | undefined) ?? null);
  const [loading, setLoading] = useState(!cache.has(key));

  // Giữ trong ref: cả hai thường là closure mới mỗi lần render, không thể làm dependency.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onErrorRef = useRef(opts.onError);
  onErrorRef.current = opts.onError;

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (silent = true) => {
      try {
        const v = await fetchShared(key, fetcherRef.current, silent);
        if (alive.current) setData(v);
      } catch (e) {
        onErrorRef.current?.(e);
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [key],
  );

  useEffect(() => {
    const hit = cache.has(key);
    // Đổi key (vd chọn tháng khác) mà chưa có cache thì phải quay lại trạng thái chờ.
    setData((cache.get(key) as T | undefined) ?? null);
    setLoading(!hit);
    // Có bản cũ → tải nền im lặng; chưa có gì → tải "thật", có thanh tiến trình.
    void refresh(hit);
  }, [key, refresh]);

  const mutate = useCallback(
    (v: T) => {
      cache.set(key, v);
      setData(v);
    },
    [key],
  );

  return { data, loading, refresh, mutate };
}
