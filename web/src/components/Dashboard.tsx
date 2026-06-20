import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Dish, Grid as GridT, PaymentConfig, Week } from '../types';
import { initials, vnd } from '../util';
import { Spinner, toast } from '../ui';
import { GridPanel } from './Grid';
import { MenuPanel } from './Menu';
import { PaymentPanel } from './Payment';
import { StatsPanel } from './Stats';
import { HistoryPanel } from './History';
import { SettingsModal, ChangePasswordModal } from './Settings';

type Tab = 'grid' | 'menu' | 'pay' | 'stats' | 'hist';
const TABS: { key: Tab; ic: string; label: string }[] = [
  { key: 'grid', ic: '🗓️', label: 'Bảng tuần' },
  { key: 'menu', ic: '📋', label: 'Thực đơn' },
  { key: 'pay', ic: '💳', label: 'Thanh toán' },
  { key: 'stats', ic: '📊', label: 'Thống kê' },
  { key: 'hist', ic: '🕐', label: 'Lịch sử' },
];

export function Dashboard() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState<Tab>('grid');
  const [grid, setGrid] = useState<GridT | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  const reloadGrid = useCallback(async () => {
    try {
      setGrid(await api.activeGrid());
    } catch {
      setGrid(null);
    }
  }, []);
  const reloadDishes = useCallback(async () => setDishes(await api.dishes()), []);
  const reloadPayment = useCallback(async () => setPayment(await api.payment()), []);
  const reloadWeeks = useCallback(async () => setWeeks(await api.weeks()), []);

  useEffect(() => {
    Promise.all([reloadGrid(), reloadDishes(), reloadPayment(), reloadWeeks()]).finally(() => setLoading(false));
  }, [reloadGrid, reloadDishes, reloadPayment, reloadWeeks]);

  const totals = grid?.totals;
  const eating = grid?.members.filter((m) => m.servings > 0).length ?? 0;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-in">
          <div className="logo">
            <div className="ic">🍱</div>
            <div>
              <h1>Đặt Cơm Trưa</h1>
              <div className="sub">{grid?.week.label ?? 'Đang tải…'}</div>
            </div>
          </div>
          <div className="spacer" />
          <span className={`pill ${isAdmin ? 'admin' : 'user'}`}>{isAdmin ? '🔓 Admin' : '👤 Thành viên'}</span>
          <span
            className="avatar"
            title={user?.fullName}
            style={{ width: 36, height: 36, fontSize: 14, background: user?.color || '#0a84ff' }}
          >
            {initials(user?.fullName || '?')}
          </span>
          <button className="btn-ico" title="Đổi mật khẩu" onClick={() => setPwdOpen(true)}>
            🔑
          </button>
          {isAdmin && (
            <button className="btn-ico" title="Cài đặt" onClick={() => setSettingsOpen(true)}>
              ⚙️
            </button>
          )}
          <button className="btn-ico" title="Đăng xuất" onClick={logout}>
            🚪
          </button>
        </div>
      </div>

      <div className="wrap">
        {loading ? (
          <Spinner />
        ) : !grid ? (
          <div className="card">
            <div className="empty">
              <div className="e">🗓️</div>
              Chưa có tuần nào đang mở.
              {isAdmin ? ' Vào tab Lịch sử để tạo tuần mới.' : ' Nhờ admin tạo tuần mới nhé.'}
            </div>
          </div>
        ) : (
          <>
            <section className="hero">
              <div className="weekchip">
                📅 Tuần: <b>{grid.week.label}</b>
              </div>
              <div className="hero-grid">
                <div className="stat">
                  <div className="lbl">🍚 Đơn giá / suất</div>
                  <div className="val">{vnd(grid.week.unitPrice)}</div>
                </div>
                <div className="stat">
                  <div className="lbl">🧮 Tổng số suất</div>
                  <div className="val">{totals?.totalServings ?? 0}</div>
                </div>
                <div className="stat">
                  <div className="lbl">💰 Tổng tiền</div>
                  <div className="val brand">{vnd(totals?.totalMoney ?? 0)}</div>
                </div>
                <div className="stat">
                  <div className="lbl">👥 Đang ăn</div>
                  <div className="val">{eating}</div>
                </div>
              </div>
            </section>

            {tab === 'grid' && <GridPanel grid={grid} isAdmin={isAdmin} meId={user!.id} reload={reloadGrid} />}
            {tab === 'menu' && <MenuPanel dishes={dishes} isAdmin={isAdmin} reload={reloadDishes} />}
            {tab === 'pay' && payment && (
              <PaymentPanel grid={grid} payment={payment} isAdmin={isAdmin} reloadGrid={reloadGrid} reloadPayment={reloadPayment} />
            )}
            {tab === 'stats' && <StatsPanel grid={grid} weeks={weeks} />}
            {tab === 'hist' && (
              <HistoryPanel weeks={weeks} isAdmin={isAdmin} reload={async () => {
                await Promise.all([reloadWeeks(), reloadGrid()]);
              }} />
            )}
          </>
        )}
      </div>

      <div className="tabs-bar">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <span className="ti">{t.ic}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {settingsOpen && grid && (
        <SettingsModal
          week={grid.week}
          payment={payment}
          onClose={() => setSettingsOpen(false)}
          onSaved={async () => {
            await Promise.all([reloadGrid(), reloadPayment(), reloadWeeks()]);
          }}
        />
      )}
      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  );
}
