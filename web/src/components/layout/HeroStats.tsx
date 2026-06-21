import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { StatCard } from '@/components/ui';
import type { Grid } from '@/types';

export function HeroStats({ grid }: { grid: Grid }) {
  const { totals } = grid;
  const eating = grid.members.filter((m) => m.servings > 0).length;

  return (
    <section className="hero">
      <div className="weekchip">
        📅 {t.dashboard.weekChip} <b>{grid.week.label}</b>
      </div>
      <div className="hero-grid">
        <StatCard label={t.dashboard.statUnitPrice} value={vnd(grid.week.unitPrice)} />
        <StatCard label={t.dashboard.statTotalServings} value={totals.totalServings} />
        <StatCard label={t.dashboard.statTotalMoney} value={vnd(totals.totalMoney)} brand />
        <StatCard label={t.dashboard.statEating} value={eating} />
      </div>
    </section>
  );
}
