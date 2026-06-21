import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Dish, Grid, Week } from '@/types';
import { t } from '@/constants/strings';
import { vnd } from '@/lib/format';
import { Modal, Spinner } from '@/components/ui';
import { GridPanel } from '@/features/grid/GridPanel';

/** Xem chi tiết 1 tuần trong Lịch sử — chỉ xem, không sửa. */
export function HistoryWeekModal({
  week,
  dishes,
  meId,
  onClose,
}: {
  week: Week;
  dishes: Dish[];
  meId: string;
  onClose: () => void;
}) {
  const [grid, setGrid] = useState<Grid | null>(null);

  useEffect(() => {
    let alive = true;
    api.weekGrid(week.id).then((g) => alive && setGrid(g));
    return () => {
      alive = false;
    };
  }, [week.id]);

  const foodTotal = grid?.totals.totalFood ?? 0;
  const drinksTotal = grid?.totals.totalDrinks ?? 0;

  return (
    <Modal open wide title={week.label} onClose={onClose}>
      {!grid ? (
        <Spinner />
      ) : (
        <>
          <div className="hint lock">{t.history.viewOnlyNote}</div>
          <div className="hist-totals">
            <span>
              <b>{grid.totals.totalServings}</b> {t.grid.colServings.toLowerCase()}
            </span>
            <span>
              {t.payment.breakdownRice(grid.totals.totalServings)}: <b>{vnd(foodTotal)}</b>
            </span>
            {drinksTotal > 0 && (
              <span>
                {t.payment.breakdownDrink}: <b>{vnd(drinksTotal)}</b>
              </span>
            )}
            <span className="tot">
              {t.payment.breakdownTotal}: <b>{vnd(grid.totals.totalMoney)}</b>
            </span>
          </div>
          <GridPanel grid={grid} dishes={dishes} isAdmin={false} meId={meId} reload={async () => {}} readOnly />
        </>
      )}
    </Modal>
  );
}
