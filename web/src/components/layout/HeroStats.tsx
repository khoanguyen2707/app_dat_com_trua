import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import type { Grid } from '@/types';

/**
 * Dải chỉ số của tuần đang mở.
 *
 * Tổng tiền là con số người ta thực sự tìm, nên nó được cỡ chữ lớn hẳn; ba chỉ
 * số còn lại đứng nhỏ bên cạnh. Bản trước cho cả bốn cùng một cỡ nên không chỉ
 * số nào nổi lên.
 */
export function HeroStats({ grid }: { grid: Grid }) {
  const { totals } = grid;
  const eating = grid.members.filter((m) => m.servings > 0).length;

  return (
    <section className="mb-4 flex flex-wrap items-end gap-x-10 gap-y-4 rounded-ui-lg border border-line bg-surface px-5 py-4 shadow-card">
      <div>
        <div className="text-[13px] text-ink-3">{t.dashboard.statTotalMoney}</div>
        <div className="tnum text-[32px] font-semibold leading-none tracking-tight text-brand">
          {vnd(totals.totalMoney)}
        </div>
        {totals.totalDrinks ? (
          <div className="mt-1 text-[12px] text-ink-3">{t.payment.includesDrinks(vnd(totals.totalDrinks))}</div>
        ) : null}
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <Stat label={t.dashboard.statTotalServings} value={totals.totalServings} />
        <Stat label={t.dashboard.statEating} value={eating} />
        <Stat label={t.dashboard.statUnitPrice} value={vnd(grid.week.unitPrice)} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="tnum text-lg font-semibold leading-tight">{value}</dd>
    </div>
  );
}
