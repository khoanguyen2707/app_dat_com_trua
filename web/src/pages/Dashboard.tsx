import { useEffect, useState } from 'react';
import { CalendarX2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDisclosure } from '@/hooks/useDisclosure';
import type { TabKey } from '@/constants/config';
import { t } from '@/constants/strings';
import { Card, EmptyState, Spinner } from '@/components/ui';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { TabBar } from '@/components/layout/TabBar';
import { HeroStats } from '@/components/layout/HeroStats';
import { GridPanel } from '@/features/grid/GridPanel';
import { TodayOrders } from '@/features/grid/TodayOrders';
import { MenuPanel } from '@/features/menu/MenuPanel';
import { PaymentPanel } from '@/features/payment/PaymentPanel';
import { DebtsPanel } from '@/features/payment/DebtsPanel';
import { OverviewPanel } from '@/features/stats/OverviewPanel';
import { MyOrderPanel } from '@/features/me/MyOrderPanel';
import { MyPaymentPanel } from '@/features/me/MyPaymentPanel';
import { MyHistoryPanel } from '@/features/me/MyHistoryPanel';
import { SettingsModal } from '@/features/settings/SettingsModal';
import { ChangePasswordModal } from '@/features/settings/ChangePasswordModal';

/**
 * Deep-link từ tin nhắc nợ trên Teams: #pay → tab Thanh toán, #pay-pending → thêm lọc
 * "chờ xác nhận" (admin). Đọc xong thì xoá hash để F5 không kéo về lại.
 */
function readHashLink(): { tab: TabKey; pendingOnly: boolean } | null {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h !== 'pay' && h !== 'pay-pending') return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return { tab: 'pay', pendingOnly: h === 'pay-pending' };
}

export function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [link] = useState(readHashLink);
  const [tab, setTab] = useState<TabKey>(link?.tab ?? (isAdmin ? 'grid' : 'order'));
  const [pendingOnly, setPendingOnly] = useState(!!link?.pendingOnly);

  // Bấm link lần nữa khi app đang mở (cùng tab trình duyệt)
  useEffect(() => {
    const onHash = () => {
      const l = readHashLink();
      if (!l) return;
      setTab(l.tab);
      setPendingOnly(l.pendingOnly);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const { grid, dishes, payment, weeks, loading, mutateGrid, reloadGrid, reloadDishes, reloadPayment, reloadWeeks } =
    useDashboardData();
  const settings = useDisclosure();
  const password = useDisclosure();

  // admin: số người đang chờ xác nhận thanh toán → badge ở tab Thanh toán
  const pendingCount = isAdmin && grid ? grid.members.filter((m) => m.paymentStatus === 'PENDING').length : 0;

  return (
    <div className="min-h-dvh bg-bg lg:pl-sidebar">
      <Sidebar
        active={tab}
        onChange={setTab}
        badges={pendingCount ? { pay: pendingCount } : undefined}
        onChangePassword={password.onOpen}
        onOpenSettings={settings.onOpen}
      />

      <div className="flex min-h-dvh flex-col">
        <TopBar weekLabel={grid?.week.label} onChangePassword={password.onOpen} onOpenSettings={settings.onOpen} />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4">
          {loading ? (
            <Spinner />
          ) : !grid ? (
            <Card>
              <EmptyState icon={<CalendarX2 />}>
                {t.dashboard.noWeekTitle}
                {isAdmin ? t.dashboard.noWeekAdmin : t.dashboard.noWeekMember}
              </EmptyState>
            </Card>
          ) : isAdmin ? (
            <>
              <HeroStats grid={grid} />

              {tab === 'grid' && <TodayOrders grid={grid} dishes={dishes} />}
              {tab === 'grid' && (
                <GridPanel
                  grid={grid}
                  dishes={dishes}
                  isAdmin
                  meId={user!.id}
                  reload={reloadGrid}
                  onMutate={mutateGrid}
                />
              )}
              {tab === 'menu' && (
                <MenuPanel dishes={dishes} isAdmin reload={reloadDishes} grid={grid} reloadGrid={reloadGrid} />
              )}
              {tab === 'pay' && payment && (
                <PaymentPanel
                  grid={grid}
                  payment={payment}
                  isAdmin
                  meId={user!.id}
                  reloadGrid={reloadGrid}
                  reloadPayment={reloadPayment}
                />
              )}
              {tab === 'pay' && <DebtsPanel grid={grid} pendingOnly={pendingOnly} reloadGrid={reloadGrid} />}
              {tab === 'overview' && (
                <OverviewPanel
                  grid={grid}
                  weeks={weeks}
                  dishes={dishes}
                  meId={user!.id}
                  payment={payment}
                  reload={async () => {
                    await Promise.all([reloadWeeks(), reloadGrid()]);
                  }}
                />
              )}
            </>
          ) : (
            /* Thành viên: chỉ suất cơm của chính mình, không có bảng tuần lẫn thống kê. */
            <>
              {tab === 'order' && <MyOrderPanel grid={grid} dishes={dishes} meId={user!.id} reload={reloadGrid} />}
              {tab === 'pay' && payment && (
                <MyPaymentPanel grid={grid} payment={payment} meId={user!.id} reload={reloadGrid} />
              )}
              {tab === 'hist' && (
                <MyHistoryPanel
                  weeks={weeks}
                  dishes={dishes}
                  meId={user!.id}
                  payment={payment}
                  reload={async () => {
                    await Promise.all([reloadWeeks(), reloadGrid()]);
                  }}
                />
              )}
            </>
          )}
        </main>

        <TabBar active={tab} onChange={setTab} badges={pendingCount ? { pay: pendingCount } : undefined} />
      </div>

      {settings.open && grid && (
        <SettingsModal
          week={grid.week}
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
