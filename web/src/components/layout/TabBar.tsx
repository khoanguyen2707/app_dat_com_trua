import { TABS, type TabKey } from '@/constants/config';
import { cls } from '@/lib/format';

export function TabBar({
  active,
  onChange,
  badges,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  /** Số nhỏ nổi trên icon tab (vd số người chờ xác nhận ở tab Thanh toán). */
  badges?: Partial<Record<TabKey, number>>;
}) {
  return (
    <div className="tabs-bar">
      <div className="tabs">
        {TABS.map((tab) => {
          const n = badges?.[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              className={cls('tab', active === tab.key && 'active')}
              onClick={() => onChange(tab.key)}
            >
              <span className="ti">
                {tab.icon}
                {n > 0 && <span className="tab-badge">{n > 9 ? '9+' : n}</span>}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
