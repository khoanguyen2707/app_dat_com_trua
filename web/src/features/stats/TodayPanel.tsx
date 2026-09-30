import { useCallback, useEffect, useState } from 'react';
import { Bike, ClipboardCopy, CupSoda, Send, StickyNote, CheckCircle2, CircleDashed } from 'lucide-react';
import { api } from '@/services/api';
import type { TodayBoard } from '@/types';
import { vnd } from '@/lib/format';
import { Button, Card, CardBody, CardHeader, EmptyState, Spinner, toast } from '@/components/ui';

/** Danh sách "món — số phần", thanh nền tỉ lệ để nhìn phát biết món nào nhiều. */
function Lines({ rows }: { rows: { dishId: string; name: string; emoji: string | null; qty: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.qty));
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.dishId} className="relative flex items-center gap-2 overflow-hidden rounded-ui px-2 py-1.5">
          <span
            className="absolute inset-y-0 left-0 bg-brand-soft"
            style={{ width: `${(r.qty / max) * 100}%` }}
            aria-hidden
          />
          <span className="relative text-[13px]">{r.emoji}</span>
          <span className="relative min-w-0 flex-1 truncate text-[13px]">{r.name}</span>
          <span className="tnum relative text-[13px] font-semibold">{r.qty}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Một màn cho admin buổi sáng: bao nhiêu hộp, món nào mấy phần, ai dặn gì, đã gửi quán
 * chưa, ai đi lấy — và nút copy đơn để dán thẳng vào chat với quán.
 *
 * Tự làm mới mỗi phút vì đây là màn hình người ta để mở trong lúc chờ mọi người đặt.
 */
export function TodayPanel({ reloadGrid }: { reloadGrid: () => Promise<void> }) {
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      setBoard(await api.todayBoard(silent));
    } catch {
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const copy = async () => {
    if (!board) return;
    try {
      await navigator.clipboard.writeText(board.orderText);
      toast(`Đã copy đơn ${board.servings} hộp — dán cho quán là xong.`, '📋');
    } catch {
      toast('Trình duyệt chặn copy. Bạn bôi đen phần text bên dưới rồi copy tay nhé.', '⚠️');
    }
  };

  const markSent = async () => {
    setBusy(true);
    try {
      await api.markDispatchSent();
      await Promise.all([load(true), reloadGrid()]);
      toast('Đã ghi nhận gửi quán.', '✅');
    } catch (e: any) {
      toast(e?.message || 'Không ghi được.', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody>
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!board) {
    return (
      <Card>
        <CardHeader title="Hôm nay" />
        <CardBody>
          <EmptyState icon={<CircleDashed />}>Chưa có tuần nào đang mở.</EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Hôm nay"
        action={
          /* Nút Copy nằm ngay trên khối "Đơn gửi quán" ở dưới, cạnh thứ nó copy —
             ở đây chỉ giữ hành động chốt của cả màn. */
          !board.dispatch.sent &&
          board.servings > 0 && (
            <Button tiny variant="primary" onClick={markSent} loading={busy} className="whitespace-nowrap">
              <Send className="size-3.5" />
              Đã gửi quán
            </Button>
          )
        }
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <div className="rounded-ui border border-brand-line bg-brand-soft p-3">
            <div className="text-[12px] text-brand">Tổng số hộp</div>
            <div className="tnum mt-1 text-2xl font-semibold text-brand">{board.servings}</div>
          </div>
          <div className="rounded-ui border border-line bg-surface p-3">
            <div className="text-[12px] text-ink-3">Tiền cơm</div>
            <div className="tnum mt-1 text-xl font-semibold">{vnd(board.totalMoney)}</div>
          </div>
          <div className="rounded-ui border border-line bg-surface p-3">
            <div className="text-[12px] text-ink-3">Gửi quán</div>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium">
              {board.dispatch.sent ? (
                <>
                  <CheckCircle2 className="size-4 text-ok" />
                  <span className="truncate">{board.dispatch.sentBy ? `${board.dispatch.sentBy}` : 'Đã gửi'}</span>
                </>
              ) : (
                <>
                  <CircleDashed className="size-4 text-warn" />
                  Chưa gửi
                </>
              )}
            </div>
          </div>
          <div className="rounded-ui border border-line bg-surface p-3">
            <div className="text-[12px] text-ink-3">Người đi lấy</div>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium">
              <Bike className="size-4 text-ink-4" />
              <span className="truncate">{board.pickup?.fullName ?? 'Chưa chốt'}</span>
            </div>
          </div>
        </div>

        {board.servings > 0 && (
          <div
            className={
              board.dispatch.sent
                ? 'mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-ui bg-ok-soft px-3 py-2 text-[13px] text-ok'
                : 'mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-ui bg-warn-soft px-3 py-2 text-[13px] text-warn'
            }
          >
            {board.dispatch.sent ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
            <span className="font-medium">
              {board.dispatch.sent ? 'Đơn đã gửi cho quán' : 'Chưa gửi cho quán'}
            </span>
            <span className="text-ink-3">
              Quán ngừng nhận lúc {board.shopDeadline}
              {!board.dispatch.sent && board.minutesLeft > 0 ? ` — còn ${board.minutesLeft} phút` : ''}
            </span>
          </div>
        )}

        {!board.menuPosted && (
          <div className="mt-3 rounded-ui border border-warn-line bg-warn-soft px-3 py-2 text-[13px] text-warn">
            Hôm nay chưa đăng thực đơn — chưa ai đặt được. Vào tab Thực đơn để đăng.
          </div>
        )}

        {board.servings === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<CircleDashed />}>Chưa có ai đặt cơm hôm nay.</EmptyState>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* min-w-0: không có nó, <pre> đơn gửi quán (dòng dài, whitespace-pre) nong
                cột ra rộng hơn card và Card overflow-hidden cắt mất phần bên phải —
                mất luôn cột số phần của danh sách món. */}
            <div className="min-w-0">
              {/* Tổng hợp theo món chỉ để admin ước lượng; đơn gửi quán bên phải mới là
                  bản liệt kê theo từng hộp. */}
              <div className="mb-2 text-[13px] font-semibold text-ink-2">Tổng hợp món</div>
              <Lines rows={board.mains} />
              {board.drinks.length > 0 && (
                <>
                  <div className="mt-4 mb-2 text-[13px] font-semibold text-ink-2">Đồ uống</div>
                  <Lines rows={board.drinks} />
                </>
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-2">Đơn gửi quán</span>
                <Button tiny onClick={copy} className="whitespace-nowrap">
                  <ClipboardCopy className="size-3.5" />
                  Copy
                </Button>
              </div>
              {/* Hiện luôn text đã định dạng: copy hỏng (trình duyệt chặn clipboard,
                  hoặc trang chưa https) thì vẫn bôi đen chép tay được. */}
              <pre className="max-h-80 overflow-auto whitespace-pre rounded-ui border border-line bg-subtle p-3 font-mono text-[12px] leading-relaxed">
                {board.orderText}
              </pre>
              {board.notes.length > 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-3">
                  <StickyNote className="mt-0.5 size-3.5 shrink-0" />
                  {board.notes.length} người có ghi chú riêng — đã nằm trong đơn ở trên.
                </div>
              )}
            </div>
          </div>
        )}

        {board.people.length > 0 && (
          <details className="mt-4 rounded-ui border border-line">
            <summary className="cursor-pointer select-none px-3 py-2 text-[13px] font-medium">
              Ai ăn gì ({board.people.length} người)
            </summary>
            <div className="border-t border-line">
              {board.people.map((p) => (
                <div
                  key={p.userId}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line px-3 py-2 text-[13px] last:border-0"
                >
                  <span className="font-medium">{p.fullName}</span>
                  <span className="min-w-0 flex-1 text-ink-2">
                    {p.dishes.length ? p.dishes.join(', ') : p.eat ? 'chưa chọn món' : ''}
                  </span>
                  {p.drinks.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-drink">
                      <CupSoda className="size-3.5" />
                      {p.drinks.join(', ')}
                    </span>
                  )}
                  {p.note && (
                    <span className="w-full text-[12px] text-ink-3">
                      <StickyNote className="mr-1 inline size-3" />
                      {p.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </CardBody>
    </Card>
  );
}
