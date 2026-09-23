import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { StatCard } from '@/components/ui';
import type { Grid } from '@/types';

/**
 * Thanh KPI của tuần đang mở — một dải mảnh thay cho 4 thẻ lớn trước đây,
 * để chừa chiều cao cho bảng tuần bên dưới.
 */
export function HeroStats({ grid }: { grid: Grid }) {
  const { totals } = grid;
  const eating = grid.members.filter((m) => m.servings > 0).length;

  return (
    <section className="mb-4 grid grid-cols-2 divide-line rounded-ui-lg border border-line bg-surface sm:grid-cols-4 sm:divide-x">
      <StatCard label={t.dashboard.statUnitPrice} value={vnd(grid.week.unitPrice)} />
      <StatCard label={t.dashboard.statTotalServings} value={totals.totalServings} />
      <StatCard
        label={t.dashboard.statTotalMoney}
        value={vnd(totals.totalMoney)}
        brand
        sub={totals.totalDrinks ? t.payment.includesDrinks(vnd(totals.totalDrinks)) : undefined}
      />
      <StatCard label={t.dashboard.statEating} value={eating} />
    </section>
  );
}
