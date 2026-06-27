import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDisclosure } from '@/hooks/useDisclosure';
import type { TabKey } from '@/constants/config';
import { t } from '@/constants/strings';
import { Card, EmptyState, Spinner } from '@/components/ui';
import { TopBar } from '@/components/layout/TopBar';
import { TabBar } from '@/components/layout/TabBar';
import { HeroStats } from '@/components/layout/HeroStats';
import { GridPanel } from '@/features/grid/GridPanel';
import { MenuPanel } from '@/features/menu/MenuPanel';
import { PaymentPanel } from '@/features/payment/PaymentPanel';
import { StatsPanel } from '@/features/stats/StatsPanel';
import { HistoryPanel } from '@/features/history/HistoryPanel';
import { SettingsModal } from '@/features/settings/SettingsModal';
import { ChangePasswordModal } from '@/features/settings/ChangePasswordModal';

export function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<TabKey>('grid');
  const { grid, dishes, payment, weeks, loading, mutateGrid, reloadGrid, reloadDishes, reloadPayment, reloadWeeks } =
    useDashboardData();
  const settings = useDisclosure();
  const password = useDisclosure();

  // admin: số người đang chờ xác nhận thanh toán → badge ở tab Thanh toán
  const pendingCount = isAdmin && grid ? grid.members.filter((m) => m.paymentStatus === 'PENDING').length : 0;

  return (
    <div className="app-shell">
      <TopBar weekLabel={grid?.week.label} onChangePassword={password.onOpen} onOpenSettings={settings.onOpen} />

      <div className="wrap">
        {loading ? (
          <Spinner />
        ) : !grid ? (
          <Card>
            <EmptyState icon="🗓️">
              {t.dashboard.noWeekTitle}
              {isAdmin ? t.dashboard.noWeekAdmin : t.dashboard.noWeekMember}
            </EmptyState>
          </Card>
        ) : (
          <>
            <HeroStats grid={grid} />

            {tab === 'grid' && (
              <GridPanel
                grid={grid}
                dishes={dishes}
                isAdmin={isAdmin}
                meId={user!.id}
                reload={reloadGrid}
                onMutate={mutateGrid}
              />
            )}
            {tab === 'menu' && (
              <MenuPanel dishes={dishes} isAdmin={isAdmin} reload={reloadDishes} grid={grid} reloadGrid={reloadGrid} />
            )}
            {tab === 'pay' && payment && (
              <PaymentPanel
                grid={grid}
                payment={payment}
                isAdmin={isAdmin}
                meId={user!.id}
                reloadGrid={reloadGrid}
                reloadPayment={reloadPayment}
              />
            )}
            {tab === 'stats' && <StatsPanel grid={grid} weeks={weeks} />}
            {tab === 'hist' && (
              <HistoryPanel
                weeks={weeks}
                dishes={dishes}
                isAdmin={isAdmin}
                meId={user!.id}
                reload={async () => {
                  await Promise.all([reloadWeeks(), reloadGrid()]);
                }}
              />
            )}
          </>
        )}
      </div>

      <TabBar active={tab} onChange={setTab} badges={pendingCount ? { pay: pendingCount } : undefined} />

      {settings.open && grid && (
        <SettingsModal
          week={grid.week}
          payment={payment}
          onClose={settings.onClose}
          onSaved={async () => {
            await Promise.all([reloadGrid(), reloadPayment(), reloadWeeks()]);
          }}
        />
      )}
      {password.open && <ChangePasswordModal onClose={password.onClose} />}
    </div>
  );
}
