import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Grid, Week } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui';

export function StatsPanel({ grid, weeks }: { grid: Grid; weeks: Week[] }) {
  // Hoãn một nhịp rồi mới đặt chiều dài thật của cột → các thanh chạy từ 0 lên.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(timer);
  }, []);

  const memberStats = grid.members
    .map((m) => ({ name: m.fullName, s: m.servings }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const maxMember = Math.max(1, ...memberStats.map((x) => x.s));
  const maxDay = Math.max(1, ...DAYS.map((d) => grid.totals.perDay[d.key]));
  const trend = [...weeks].reverse().map((w) => ({ label: w.label.split(' ')[0], s: w.servings ?? 0 }));
  const maxTrend = Math.max(1, ...trend.map((x) => x.s));

  /**
   * Biểu đồ cột dọc dùng chung cho "theo ngày" và "xu hướng tuần".
   * Thân cột định vị tuyệt đối trong một ô `flex-1`: chiều cao theo % chỉ ăn khi
   * cha có chiều cao xác định, mà ô flex-1 trong khung `h-40` thì có.
   */
  const columns = (data: { label: string; s: number }[], max: number, tone: string) => (
    <div className="flex h-40 gap-2">
      {data.map((x, i) => (
        // max-w: một tuần duy nhất thì cột không phình ra hết thẻ
        <div key={i} className="flex min-w-0 max-w-20 flex-1 flex-col gap-1">
          <span className="tnum text-center text-[12px] font-medium text-ink-2">{x.s}</span>
          <div className="relative flex-1">
            <div
              className={`absolute inset-x-0 bottom-0 rounded-t-[3px] transition-[height] duration-500 ${tone}`}
              style={{ height: mounted ? `${Math.max((x.s / max) * 100, x.s > 0 ? 3 : 0)}%` : 0 }}
            />
          </div>
          <span className="truncate text-center text-[11px] text-ink-4">{x.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card className="xl:row-span-2">
        <CardHeader title={t.stats.byMember} />
        <CardBody>
          {memberStats.length === 0 ? (
            <EmptyState icon={<BarChart3 />}>{t.stats.noData}</EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {memberStats.map((x) => (
                <div className="flex items-center gap-3" key={x.name}>
                  <span className="w-28 shrink-0 truncate text-[13px] text-ink-2">{x.name}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-ui bg-subtle">
                    <div
                      className="h-full rounded-ui bg-brand transition-[width] duration-500"
                      style={{ width: mounted ? `${(x.s / maxMember) * 100}%` : 0 }}
                    />
                  </div>
                  <span className="tnum w-6 shrink-0 text-right text-[13px] font-medium">{x.s}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t.stats.byDay} />
        <CardBody>
          {columns(
            DAYS.map((d) => ({ label: d.label, s: grid.totals.perDay[d.key] })),
            maxDay,
            'bg-brand/75',
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t.stats.trend} />
        <CardBody>{columns(trend, maxTrend, 'bg-brand/45')}</CardBody>
      </Card>
    </div>
  );
}
