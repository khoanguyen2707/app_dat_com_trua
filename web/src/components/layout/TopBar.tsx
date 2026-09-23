import { KeyRound, LogOut, Settings, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/constants/strings';
import { Avatar, IconButton } from '@/components/ui';
import { NotificationBell } from './NotificationBell';

/**
 * Thanh trên cùng — mảnh, chỉ giữ ngữ cảnh tuần + chuông.
 * Dưới lg nó gánh thêm logo và các hành động tài khoản vốn nằm ở Sidebar.
 */
export function TopBar({
  weekLabel,
  onChangePassword,
  onOpenSettings,
}: {
  weekLabel?: string;
  onChangePassword: () => void;
  onOpenSettings: () => void;
}) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <span className="grid size-8 place-items-center rounded-ui bg-brand text-white lg:hidden">
          <UtensilsCrossed className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">{weekLabel ?? t.app.loading}</div>
          <div className="text-[11px] text-ink-4 lg:hidden">{t.app.name}</div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <span className="lg:hidden">
            <IconButton title={t.topbar.changePassword} onClick={onChangePassword}>
              <KeyRound className="size-4" />
            </IconButton>
          </span>
          {isAdmin && (
            <span className="lg:hidden">
              <IconButton title={t.topbar.settings} onClick={onOpenSettings}>
                <Settings className="size-4" />
              </IconButton>
            </span>
          )}
          <span className="lg:hidden">
            <IconButton title={t.topbar.logout} onClick={logout}>
              <LogOut className="size-4" />
            </IconButton>
          </span>
          <span className="ml-1 lg:hidden">
            <Avatar name={user?.fullName || '?'} color={user?.color} size={28} />
          </span>
        </div>
      </div>
    </header>
  );
}
