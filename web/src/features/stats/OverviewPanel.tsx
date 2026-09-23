import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Dish, Grid, PaymentConfig, Week } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui';
import { HistoryPanel } from '@/features/history/HistoryPanel';
import { BarList } from './charts/BarList';
import { ColumnChart } from './charts/ColumnChart';
import { TrendChart } from './charts/TrendChart';

/**
 * Trang tổng kết của admin: gộp thống kê và lịch sử tuần vào một chỗ.
 *
 * Tách hai tab thì mỗi tab quá ít nội dung, mà chúng lại đọc cùng một câu hỏi —
 * nhóm đang ăn nhiều hay ít, tuần nào, ai. Xu hướng đứng trên vì nó trả lời câu
 * đó trước; hai biểu đồ chi tiết đứng dưới; danh sách tuần khép lại.
 */
export function OverviewPanel({
  grid,
  weeks,
  dishes,
  meId,
  payment,
  reload,
}: {
  grid: Grid;
  weeks: Week[];
  dishes: Dish[];
  meId: string;
  payment: PaymentConfig | null;
  reload: () => Promise<void>;
}) {
  /** `weeks` xếp mới nhất trước; biểu đồ thời gian phải đi từ cũ sang mới. */
  const trend = useMemo(
    () => [...weeks].reverse().map((w) => ({ label: w.label.split(' ')[0], value: w.servings ?? 0 })),
    [weeks],
  );

  const byMember = useMemo(
    () =>
      grid.members
        .filter((m) => m.servings > 0)
        .sort((a, b) => b.servings - a.servings)
        .map((m) => ({ key: m.userId, label: m.fullName, value: m.servings, me: m.userId === meId })),
    [grid.members, meId],
  );

  const byDay = useMemo(
    () =>
      DAYS.map((d) => ({
        key: d.key,
        label: d.label,
        value: grid.totals.perDay[d.key],
        tag: d.key === grid.todayKey ? t.grid.todayTag : undefined,
      })),
    [grid.totals.perDay, grid.todayKey],
  );

  return (
    <>
      <Card>
        <CardHeader
          title={t.stats.trend}
          action={<span className="text-[13px] text-ink-3">{t.stats.trendSub}</span>}
        />
        <CardBody>
          {trend.length < 2 ? (
            /* Một mốc thì không có xu hướng để vẽ — nói thẳng thay vì vẽ một cột lẻ. */
            <div className="py-6 text-center text-[13px] text-ink-3">{t.stats.trendNotEnough}</div>
          ) : (
            <TrendChart data={trend} unit={t.stats.unitServing} />
          )}
        </CardBody>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={t.stats.byDay} />
          <CardBody>
            <ColumnChart data={byDay} unit={t.stats.unitServing} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={t.stats.byMember}
            action={<span className="text-[13px] text-ink-3">{t.stats.byMemberSub(byMember.length)}</span>}
          />
          <CardBody>
            {byMember.length === 0 ? (
              <EmptyState icon={<BarChart3 />}>{t.stats.noData}</EmptyState>
            ) : (
              <BarList data={byMember} />
            )}
          </CardBody>
        </Card>
      </div>

      <HistoryPanel weeks={weeks} dishes={dishes} isAdmin meId={meId} payment={payment} reload={reload} />
    </>
  );
}
