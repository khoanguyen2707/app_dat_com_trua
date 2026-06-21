import { useAuth } from '@/context/AuthContext';
import { t } from '@/constants/strings';
import { Avatar, IconButton, Pill } from '@/components/ui';

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
    <div className="topbar">
      <div className="topbar-in">
        <div className="logo">
          <div className="ic">🍱</div>
          <div>
            <h1>{t.app.name}</h1>
            <div className="sub">{weekLabel ?? t.app.loading}</div>
          </div>
        </div>
        <div className="spacer" />
        <Pill kind={isAdmin ? 'admin' : 'user'} icon={isAdmin ? t.role.adminIcon : t.role.memberIcon}>
          <span className="pill-txt">{isAdmin ? t.role.admin : t.role.member}</span>
        </Pill>
        <Avatar name={user?.fullName || '?'} color={user?.color} />
        <IconButton title={t.topbar.changePassword} onClick={onChangePassword}>
          🔑
        </IconButton>
        {isAdmin && (
          <IconButton title={t.topbar.settings} onClick={onOpenSettings}>
            ⚙️
          </IconButton>
        )}
        <IconButton title={t.topbar.logout} onClick={logout}>
          🚪
        </IconButton>
      </div>
    </div>
  );
}
