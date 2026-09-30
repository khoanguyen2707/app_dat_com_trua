import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Bike, Wallet, UtensilsCrossed } from 'lucide-react';
import { api } from '@/services/api';
import type { MyStats } from '@/types';
import { vnd } from '@/lib/format';
import { Card, CardBody, CardHeader, EmptyState, Spinner } from '@/components/ui';
import { BarList } from '@/features/stats/charts/BarList';

/** 12 tháng gần nhất, mới nhất trước — đủ để nhìn lại, không cần bộ chọn lịch. */
function recentMonths(count = 12): { value: string; label: string }[] {
  const now = new Date(Date.now() + 7 * 3600_000);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return { value: `${d.getUTCFullYear()}-${mm}`, label: `Tháng ${d.getUTCMonth() + 1}/${d.getUTCFullYear()}` };
  });
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-ui border border-line bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
        {icon}
        {label}
      </div>
      <div className="tnum mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-4">{hint}</div>}
    </div>
  );
}

/**
 * Thống kê của chính thành viên.
 *
 * Bản thống kê sẵn có nhìn từ phía admin (cả nhóm ăn bao nhiêu). Người dùng thường chỉ
 * muốn biết bốn con số của riêng mình: tháng này ăn mấy suất, hết bao nhiêu, còn nợ
 * không, và đã đi lấy cơm mấy lần.
 */
export function MyStatsPanel() {
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0].value);
  const [data, setData] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .myStats(month)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [month]);

  return (
    <Card>
      <CardHeader
        title="Thống kê của tôi"
        action={
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 rounded-ui border border-line bg-surface px-2 text-[13px] outline-none focus:border-brand"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        }
      />
      <CardBody>
        {loading ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : !data ? (
          <EmptyState icon={<CalendarCheck />}>Chưa có dữ liệu cho tháng này.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Stat
                icon={<UtensilsCrossed className="size-3.5" />}
                label="Số suất"
                value={String(data.servings)}
                hint={data.menuDays ? `trên ${data.menuDays} ngày có cơm` : undefined}
              />
              <Stat
                icon={<Wallet className="size-3.5" />}
                label="Tổng tiền"
                value={vnd(data.total)}
                hint={data.drinksTotal > 0 ? `gồm ${vnd(data.drinksTotal)} đồ uống` : undefined}
              />
              <Stat
                icon={<CalendarCheck className="size-3.5" />}
                label="Tỉ lệ đi ăn"
                value={`${Math.round(data.attendanceRate * 100)}%`}
                hint={data.menuDays ? `${data.servings}/${data.menuDays} ngày` : 'chưa có ngày nào có cơm'}
              />
              <Stat
                icon={<Bike className="size-3.5" />}
                label="Lượt đi lấy cơm"
                value={String(data.pickups)}
              />
            </div>

            {/* Công nợ là con số của MỌI tuần chưa xác nhận, không riêng tháng đang xem —
                nói rõ để không ai tưởng mình nợ ít hơn thực tế khi xem tháng cũ. */}
            <div
              className={
                data.outstanding > 0
                  ? 'mt-3 rounded-ui border border-warn-line bg-warn-soft px-3 py-2 text-[13px] text-warn'
                  : 'mt-3 rounded-ui border border-ok-line bg-ok-soft px-3 py-2 text-[13px] text-ok'
              }
            >
              {data.outstanding > 0 ? (
                <>
                  Bạn còn nợ tổng cộng <b className="tnum">{vnd(data.outstanding)}</b> — gồm mọi tuần chưa được xác
                  nhận, kể cả tuần đang chạy, không riêng tháng đang xem.
                </>
              ) : (
                <>Bạn không còn nợ khoản nào. 🎉</>
              )}
            </div>

            {data.topDishes.length > 0 && (
              <>
                <div className="mt-5 mb-2 text-[13px] font-semibold text-ink-2">Món tôi ăn nhiều nhất</div>
                <BarList
                  data={data.topDishes.map((d) => ({
                    key: d.dishId,
                    label: `${d.emoji ?? ''} ${d.name}`.trim(),
                    value: d.count,
                  }))}
                />
              </>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
