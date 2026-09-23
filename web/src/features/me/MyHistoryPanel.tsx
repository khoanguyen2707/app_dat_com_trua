import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, History, Wallet } from 'lucide-react';
import { api } from '@/services/api';
import type { DayKey, Dish, Grid, GridMember, PaymentConfig, Week } from '@/types';
import { DAYS } from '@/constants/config';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { vnd } from '@/lib/format';
import { Button, Card, CardBody, CardHeader, EmptyState, Spinner } from '@/components/ui';
import { MemberPayModal } from '@/features/payment/MemberPayModal';
import { PaymentStatusChip } from '@/features/payment/PaymentStatusChip';

/** Bao nhiêu tuần nạp một lượt — đủ cho vài tháng mà không bắn hàng chục request. */
const PAGE = 12;

/**
 * Lịch sử của riêng một thành viên.
 *
 * `GET /weeks` chỉ trả tổng kết cả nhóm, không có số liệu từng người, nên phải lấy
 * grid của từng tuần rồi lọc ra dòng của mình. Vì thế nạp theo trang: 12 tuần gần
 * nhất trước, cũ hơn thì bấm xem thêm.
 */
export function MyHistoryPanel({
  weeks,
  dishes,
  meId,
  payment,
  reload,
}: {
  weeks: Week[];
  dishes: Dish[];
  meId: string;
  payment: PaymentConfig | null;
  reload: () => Promise<void>;
}) {
  const [grids, setGrids] = useState<Record<string, Grid>>({});
  /* Tuần cũ còn nợ vẫn phải trả được — nếu không, món nợ quá hạn thành ngõ cụt. */
  const [paying, setPaying] = useState<{ week: Week; me: GridMember } | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const dishMap = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);
  const visible = useMemo(() => weeks.slice(0, shown), [weeks, shown]);

  const load = useCallback(async (list: Week[]) => {
    setLoading(true);
    const loaded = await Promise.all(
      list.map(async (w) => {
        try {
          return [w.id, await api.weekGrid(w.id)] as const;
        } catch {
          return null; // một tuần lỗi không được làm hỏng cả trang
        }
      }),
    );
    setGrids((prev) => ({ ...prev, ...Object.fromEntries(loaded.filter(Boolean) as [string, Grid][]) }));
    setLoading(false);
  }, []);

  useEffect(() => {
    const missing = visible.filter((w) => !grids[w.id]);
    if (missing.length) void load(missing);
    else setLoading(false);
  }, [visible, grids, load]);

  if (weeks.length === 0) {
    return (
      <Card>
        <CardHeader title={t.me.histTitle} />
        <CardBody>
          <EmptyState icon={<History />}>{t.me.histEmpty}</EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={t.me.histTitle} />
      <CardBody flush>
        <div className="divide-y divide-line">
          {visible.map((w) => {
            const grid = grids[w.id];
            const me = grid?.members.find((m) => m.userId === meId);
            const open = openId === w.id;
            const hasOrders = !!me && me.servings > 0;

            return (
              <div key={w.id} className={cn(open && 'bg-subtle/50')}>
                <button
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-subtle disabled:hover:bg-transparent"
                  onClick={() => setOpenId(open ? null : w.id)}
                  disabled={!hasOrders}
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{w.label}</div>
                    <div className="text-[12px] text-ink-4">
                      {!grid ? t.me.histLoading : hasOrders ? t.me.histServings(me!.servings) : t.me.histNone}
                    </div>
                  </div>
                  {me && me.total > 0 && (
                    <>
                      <div className="tnum shrink-0 text-right text-sm font-medium">{vnd(me.total)}</div>
                      <div className="flex w-32 justify-end">
                        <PaymentStatusChip status={me.paymentStatus} />
                      </div>
                    </>
                  )}
                  {me && me.total > 0 && me.paymentStatus !== 'PAID' && payment && (
                    <Button
                      tiny
                      variant={me.paymentStatus === 'PENDING' ? 'default' : 'primary'}
                      onClick={(e) => {
                        e.stopPropagation(); // đừng bung/gập hàng khi bấm nút trả tiền
                        setPaying({ week: w, me });
                      }}
                    >
                      <Wallet className="size-3.5" />
                      {t.me.histPay}
                    </Button>
                  )}
                  {hasOrders && (
                    <ChevronDown
                      className={cn('size-4 shrink-0 text-ink-4 transition-transform', open && 'rotate-180')}
                    />
                  )}
                </button>

                {open && me && grid && (
                  <div className="border-t border-line px-5 py-3">
                    <div className="divide-y divide-line">
                      {DAYS.filter((d) => me.days[d.key] || (me.items?.[d.key]?.drinks.length ?? 0) > 0).map((d) => {
                        const it = me.items?.[d.key as DayKey];
                        const food = (it?.food ?? []).map((id) => dishMap.get(id)).filter(Boolean);
                        const drinks = (it?.drinks ?? []).reduce((a, x) => a + x.qty, 0);
                        return (
                          <div key={d.key} className="flex items-baseline gap-3 py-1.5 text-[13px]">
                            <span className="w-20 shrink-0 text-ink-3">{d.full}</span>
                            <span className="flex flex-1 flex-wrap gap-1.5">
                              {food.map((dish) => (
                                <span key={dish!.id}>
                                  {dish!.emoji} {dish!.name}
                                </span>
                              ))}
                              {drinks > 0 && <span className="text-drink">{t.me.drinkCount(drinks)}</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && <Spinner />}

        {shown < weeks.length && (
          <div className="flex justify-center border-t border-line p-3">
            <Button onClick={() => setShown((n) => n + PAGE)}>{t.me.histMore}</Button>
          </div>
        )}
      </CardBody>

      {paying && payment && (
        <MemberPayModal
          member={paying.me}
          unitPrice={paying.week.unitPrice}
          weekId={paying.week.id}
          weekLabel={paying.week.label}
          meId={meId}
          payment={payment}
          isAdmin={false}
          onClose={() => setPaying(null)}
          onPaid={async () => {
            setPaying(null);
            setGrids({}); // buộc nạp lại để trạng thái trên hàng đổi theo
            await reload();
          }}
        />
      )}
    </Card>
  );
}
