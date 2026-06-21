import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { NotificationFeed } from '@/types';

const POLL_MS = 20000;

/** Poll thông báo của tôi (+ refetch khi focus lại tab). */
export function useNotifications(enabled: boolean) {
  const [feed, setFeed] = useState<NotificationFeed>({ items: [], unread: 0 });

  const refresh = useCallback(async () => {
    try {
      setFeed(await api.notifications());
    } catch {
      /* im lặng — sẽ thử lại ở lần poll sau */
    }
  }, []);

  const markRead = useCallback(async () => {
    setFeed((f) => (f.unread === 0 ? f : { ...f, unread: 0, items: f.items.map((n) => ({ ...n, read: true })) }));
    try {
      await api.markNotificationsRead();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, refresh]);

  return { feed, refresh, markRead };
}
