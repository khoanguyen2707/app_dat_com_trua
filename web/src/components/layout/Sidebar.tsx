import { KeyRound, LogOut, Settings, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { tabsFor, type TabKey } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { Avatar, Pill } from '@/components/ui';
import { VersionTag } from './VersionTag';

/**
 * Điều hướng chính ở desktop (cột trái cố định). Dưới lg nó được TabBar +
 * TopBar thay thế, nên component này chỉ render trong nhánh desktop.
 */
export function Sidebar({
  active,
  onChange,
  badges,
  onChangePassword,
  onOpenSettings,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  badges?: Partial<Record<TabKey, number>>;
  onChangePassword: () => void;
  onOpenSettings: () => void;
}) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-sidebar flex-col border-r border-line bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid size-8 place-items-center rounded-ui bg-brand text-white">
          <UtensilsCrossed className="size-4" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">{t.app.name}</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        {tabsFor(isAdmin).map((tab) => {
          const Icon = tab.icon;
          const n = badges?.[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              aria-current={active === tab.key ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-ui px-3 py-2.5 text-sm font-medium transition-colors',
                active === tab.key ? 'bg-brand-tint text-brand' : 'text-ink-2 hover:bg-subtle',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {tab.label}
              {n > 0 && (
                <span className="tnum ml-auto rounded-full bg-brand px-1.5 py-px text-[11px] font-semibold text-white">
                  {n > 9 ? '9+' : n}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line p-3">
        <div className="mb-2 flex items-center gap-2.5">
          <Avatar name={user?.fullName || '?'} color={user?.color} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{user?.fullName}</div>
            <Pill kind={isAdmin ? 'admin' : 'user'}>{isAdmin ? t.role.admin : t.role.member}</Pill>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <SideAction icon={<KeyRound className="size-4" />} label={t.topbar.changePassword} onClick={onChangePassword} />
          {isAdmin && <SideAction icon={<Settings className="size-4" />} label={t.topbar.settings} onClick={onOpenSettings} />}
          <SideAction icon={<LogOut className="size-4" />} label={t.topbar.logout} onClick={logout} />
        </div>
        <VersionTag className="mt-2 px-2.5" />
      </div>
    </aside>
  );
}

function SideAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-ui px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
    >
      {icon}
      {label}
    </button>
  );
}
