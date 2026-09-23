import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { t } from '@/constants/strings';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
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
    <div className="relative" ref={ref}>
      <IconButton title={t.notif.label} onClick={() => (open ? close() : setOpen(true))}>
        <Bell className="size-4" />
      </IconButton>
      {feed.unread > 0 && (
        <span className="tnum pointer-events-none absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
          {feed.unread > 9 ? '9+' : feed.unread}
        </span>
      )}

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-ui-md border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-3 py-2 text-[13px] font-semibold">{t.notif.label}</div>
          {feed.items.length === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] text-ink-3">{t.notif.empty}</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {feed.items.map((n) => (
                <div
                  key={n.id}
                  className={cn('border-b border-line px-3 py-2.5 last:border-0', !n.read && 'bg-brand-soft')}
                >
                  <div className="text-[13px] font-medium">{n.title}</div>
                  <div className="mt-0.5 text-[13px] text-ink-2">{n.body}</div>
                  <div className="mt-1 text-[11px] text-ink-4">{timeAgo(n.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
