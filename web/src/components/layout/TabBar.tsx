import { TABS, type TabKey } from '@/constants/config';
import { cls } from '@/lib/format';

export function TabBar({ active, onChange }: { active: TabKey; onChange: (key: TabKey) => void }) {
  return (
    <div className="tabs-bar">
      <div className="tabs">
        {TABS.map((tab) => (
          <button key={tab.key} className={cls('tab', active === tab.key && 'active')} onClick={() => onChange(tab.key)}>
            <span className="ti">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
