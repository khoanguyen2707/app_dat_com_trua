import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { t } from '@/constants/strings';
import { cls, timeAgo } from '@/lib/format';
import { IconButton } from '@/components/ui';

/** Chuông thông báo ở header (cho cả admin & user) — poll + dropdown. */
export function NotificationBell() {
  const { feed, markRead } = useNotifications(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    void markRead(); // đóng = coi như đã đọc
  }, [markRead]);

  // đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  return (
    <div className="notif-bell" ref={ref}>
      <IconButton title={t.notif.title} onClick={() => (open ? close() : setOpen(true))}>
        🔔
      </IconButton>
      {feed.unread > 0 && <span className="notif-dot">{feed.unread > 9 ? '9+' : feed.unread}</span>}

      {open && (
        <div className="notif-panel">
          <div className="notif-h">{t.notif.title}</div>
          {feed.items.length === 0 ? (
            <div className="notif-empty">{t.notif.empty}</div>
          ) : (
            <div className="notif-list">
              {feed.items.map((n) => (
                <div key={n.id} className={cls('notif-item', !n.read && 'unread')}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-body">{n.body}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
